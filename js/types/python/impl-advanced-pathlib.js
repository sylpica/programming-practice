/* 高度モード B7 G13：pathlib（76件）＋ pathlib.types（5件）。
 *
 * 一次情報：CPython 3.14 の Lib/pathlib/__init__.py（3.15 ドキュメントの
 * 変更点を含む）と CPython 3.12.3 実走（PurePath 系は 3.12 でも大半が
 * 同一。3.14 で変わった stem/suffix の端ケース・full_match・relative_to の
 * 余分な引数削除は 3.14 ソース側を正とした）。
 * PurePath 系は純粋な文字列処理として完全実装する。Path 系は生成と
 * PurePath 由来の操作・as_uri・from_uri（純粋な変換）までを実装し、
 * ファイルシステム操作は未対応とする。
 * 値の表現：{flavour, drv, root, tail, str, raw}。str は CPython の
 * __str__（_format_parsed_parts の結果、空なら '.'）と一致させる。 */
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import {
  BOOL, NONE, LIST, TUPLE, UNK, I, isNum, isBool, isNone, isUnk,
  noKw, globTranslate, globRegexToJS, unsupportedFn, unsupportedCtor,
} from './impl-advanced-g13-common.js';
import { pyRepr } from './impl-advanced-g13-common.js';

const QP = 'pathlib.PurePath', QPP = 'pathlib.PurePosixPath', QPW = 'pathlib.PureWindowsPath';
const QC = 'pathlib.Path', QCP = 'pathlib.PosixPath', QCW = 'pathlib.WindowsPath';
const QPAR = 'pathlib._PathParents';
const PATH_QS = [QP, QPP, QPW, QC, QCP, QCW];
const isPathQ = (q) => PATH_QS.includes(q);
const sepOf = (flavour) => (flavour === 'posix' ? '/' : '\\');

/* ---------- splitroot / join（posixpath・ntpath の移植） ---------- */
function posixSplitroot(p) {
  if (p[0] !== '/') return ['', '', p];
  if (p[1] !== '/' || p[2] === '/') return ['', '/', p.slice(1)];
  return ['', '//', p.slice(2)];
}
function ntSplitroot(p) {
  const sep = '\\';
  const normp = p.split('/').join('\\');
  if (normp[0] === sep) {
    if (normp[1] === sep) {
      const start = normp.slice(0, 8).toUpperCase() === '\\\\?\\UNC\\' ? 8 : 2;
      const index = normp.indexOf(sep, start);
      if (index === -1) return [p, '', ''];
      const index2 = normp.indexOf(sep, index + 1);
      if (index2 === -1) return [p, '', ''];
      return [p.slice(0, index2), p.slice(index2, index2 + 1), p.slice(index2 + 1)];
    }
    return ['', p.slice(0, 1), p.slice(1)];
  }
  if (normp[1] === ':') {
    if (normp[2] === sep) return [p.slice(0, 2), p.slice(2, 3), p.slice(3)];
    return [p.slice(0, 2), '', p.slice(2)];
  }
  return ['', '', p];
}
function splitroot(flavour, p) { return flavour === 'posix' ? posixSplitroot(p) : ntSplitroot(p); }
function splitdrive(flavour, p) {
  const [d, r, t] = splitroot(flavour, p);
  return [d, r + t];
}
function parsePath(flavour, path) {
  if (!path) return { drv: '', root: '', tail: [] };
  const sep = sepOf(flavour);
  if (flavour === 'windows') path = path.split('/').join('\\');
  const [drv, root, rel] = splitroot(flavour, path);
  let rt = root;
  if (!rt && drv.startsWith(sep) && !drv.endsWith(sep)) {
    const drvParts = drv.split(sep);
    if (drvParts.length === 4 && !'?.'.includes(drvParts[2])) rt = sep;
    else if (drvParts.length === 6) rt = sep;
  }
  return { drv, root: rt, tail: rel.split(sep).filter((x) => x && x !== '.') };
}
function formatParts(flavour, drv, root, tail) {
  const sep = sepOf(flavour);
  if (drv || root) return drv + root + tail.join(sep);
  if (tail.length && splitdrive(flavour, tail[0])[0]) return ['.', ...tail].join(sep);
  return tail.join(sep);
}
function posixJoin(paths) {
  let path = paths[0];
  for (const b of paths.slice(1)) {
    if (b.startsWith('/')) path = b;
    else if (!path || path.endsWith('/')) path += b;
    else path += '/' + b;
  }
  return path;
}
function ntJoin(paths) {
  let [resultDrive, resultRoot, resultPath] = ntSplitroot(paths[0]);
  for (const p of paths.slice(1)) {
    const [pDrive, pRoot, pPath] = ntSplitroot(p);
    if (pRoot) {
      if (pDrive || !resultDrive) resultDrive = pDrive;
      resultRoot = pRoot; resultPath = pPath; continue;
    }
    if (pDrive && pDrive !== resultDrive) {
      if (pDrive.toLowerCase() !== resultDrive.toLowerCase()) {
        resultDrive = pDrive; resultRoot = pRoot; resultPath = pPath; continue;
      }
      resultDrive = pDrive;
    }
    if (resultPath && !'\\/'.includes(resultPath[resultPath.length - 1])) resultPath += '\\';
    resultPath += pPath;
  }
  if (resultPath && !resultRoot && resultDrive && !':\\/'.includes(resultDrive[resultDrive.length - 1])) {
    return resultDrive + '\\' + resultPath;
  }
  return resultDrive + resultRoot + resultPath;
}
function joinRaw(flavour, paths) { return flavour === 'posix' ? posixJoin(paths) : ntJoin(paths); }

/* ---------- データ構築 ---------- */
function dataFromRaw(flavour, raw) {
  const { drv, root, tail } = parsePath(flavour, raw);
  return { flavour, drv, root, tail, str: formatParts(flavour, drv, root, tail) || '.', raw };
}
function dataFromParts(flavour, drv, root, tail) {
  const s = formatParts(flavour, drv, root, tail);
  return { flavour, drv, root, tail: [...tail], str: s || '.', raw: s };
}
function convertArgs(ctx, flavour, args) {
  const raws = [];
  for (const arg of args) {
    if (isUnk(arg)) return null;
    if (arg && arg.__native && isPathQ(arg.__native)) {
      raws.push(arg.data.flavour !== flavour ? asPosixOf(arg.data) : arg.data.raw);
    } else if (typeof arg === 'string') raws.push(arg);
    else ctx.err('TypeError', "argument should be a str or an os.PathLike object where __fspath__ returns a str, not '" + ctx.typeName(arg) + "'", '');
  }
  return raws;
}
function buildData(ctx, flavour, args) {
  const raws = convertArgs(ctx, flavour, args);
  if (raws === null) return null;
  return dataFromRaw(flavour, raws.length ? joinRaw(flavour, raws) : '');
}
function asPosixOf(d) { return d.str.split(sepOf(d.flavour)).join('/'); }
function normcaseOf(d) { return d.flavour === 'posix' ? d.str : d.str.toLowerCase(); }
function eqData(a, b) { return a.flavour === b.flavour && normcaseOf(a) === normcaseOf(b); }
function partsOf(d) { return (d.drv || d.root) ? [d.drv + d.root, ...d.tail] : [...d.tail]; }
function nameOf(d) { return d.tail.length ? d.tail[d.tail.length - 1] : ''; }
function parentsData(d) {
  const out = [];
  for (let i = 0; i < d.tail.length; i++) out.push(dataFromParts(d.flavour, d.drv, d.root, d.tail.slice(0, d.tail.length - 1 - i)));
  return out;
}
function stemOf(name) {
  const i = name.lastIndexOf('.');
  if (i !== -1) {
    const s = name.slice(0, i);
    if (s.replace(/^\.+/, '')) return s;
  }
  return name;
}
function suffixOf(name) {
  const n = name.replace(/^\.+/, '');
  const i = n.lastIndexOf('.');
  return i !== -1 ? n.slice(i) : '';
}
function suffixesOf(name) {
  return name.replace(/^\.+/, '').split('.').slice(1).map((e) => '.' + e);
}
/* URI 用のパーセント符号化（urllib.parse.quote、UTF-8） */
function quoteUri(s, safe) {
  const keep = new Set(Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~" + (safe || '')));
  let out = '';
  for (const b of new TextEncoder().encode(s)) {
    const ch = String.fromCharCode(b);
    out += keep.has(ch) ? ch : '%' + b.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}
function unquoteUri(s) {
  const bytes = [];
  const enc = new TextEncoder();
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '%' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) { bytes.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
    else for (const b of enc.encode(s[i])) bytes.push(b);
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

/* ---------- _PathParents ---------- */
function sliceIndices(len, key, ctx) {
  const iv = (v, def) => (v === null || v === undefined || isNone(v)) ? def : ctx.int(v);
  const stepRaw = iv(key.step, 1);
  if (stepRaw === null) ctx.err('TypeError', 'slice indices must be integers or None or have an __index__ method', '');
  if (stepRaw === 0) ctx.err('ValueError', 'slice step cannot be zero', '');
  const step = stepRaw;
  const adj = (v, low, high) => { if (v < 0) { v += len; if (v < low) v = low; } else if (v > high) v = high; return v; };
  let start, stop;
  if (step > 0) {
    start = key.lo === null || isNone(key.lo) ? 0 : adj(iv(key.lo, 0), 0, len);
    stop = key.hi === null || isNone(key.hi) ? len : adj(iv(key.hi, 0), 0, len);
  } else {
    start = key.lo === null || isNone(key.lo) ? len - 1 : adj(iv(key.lo, 0), -1, len - 1);
    stop = key.hi === null || isNone(key.hi) ? -1 : adj(iv(key.hi, 0), -1, len - 1);
  }
  const out = [];
  if (step > 0) for (let i = start; i < stop; i += step) out.push(i);
  else for (let i = start; i > stop; i += step) out.push(i);
  return out;
}
registerStdlibClass(QPAR, {
  typeName: '_PathParents',
  repr: (ctx, self) => '<' + self.data.clsName + '.parents>',
  str: (ctx, self) => '<' + self.data.clsName + '.parents>',
  len: (ctx, self) => self.data.tail.length,
  iter: (ctx, self) => parentsData(self.data).map((pd) => ctx.native(self.data.clsQ, pd)),
  getitem: (ctx, self, key) => {
    const d = self.data, len = d.tail.length;
    if (key && typeof key === 'object' && key.__slice) {
      return TUPLE(sliceIndices(len, key, ctx).map((i) => ctx.native(d.clsQ, parentsData(d)[i])));
    }
    const n = ctx.int(key);
    if (n === null) ctx.err('TypeError', 'list indices must be integers or slices, not ' + ctx.typeName(key), '');
    if (n >= len || n < -len) ctx.err('IndexError', String(n), '');
    const idx = n < 0 ? n + len : n;
    return ctx.native(d.clsQ, parentsData(d)[idx]);
  },
});

/* ---------- PurePath 系クラス定義 ---------- */
function pureAttrs(flavour) {
  return {
    drive: (ctx, self) => self.data.drv,
    root: (ctx, self) => self.data.root,
    anchor: (ctx, self) => self.data.drv + self.data.root,
    parts: (ctx, self) => TUPLE(partsOf(self.data)),
    parent: (ctx, self) => {
      const d = self.data;
      if (!d.tail.length) return self;
      return ctx.native(self.__native, dataFromParts(d.flavour, d.drv, d.root, d.tail.slice(0, -1)));
    },
    parents: (ctx, self) => ctx.native(QPAR, { ...self.data, clsQ: self.__native, clsName: ctx.typeName(self) }),
    name: (ctx, self) => nameOf(self.data),
    stem: (ctx, self) => stemOf(nameOf(self.data)),
    suffix: (ctx, self) => suffixOf(nameOf(self.data)),
    suffixes: (ctx, self) => LIST(suffixesOf(nameOf(self.data))),
  };
}
function convertOther(ctx, self, other) {
  // relative_to 等の相手：PurePath ならそのまま、それ以外は自クラスで構築
  if (other && other.__native && isPathQ(other.__native)) return other;
  if (isUnk(other)) return null;
  const d = buildData(ctx, self.data.flavour, [other]);
  return d === null ? null : ctx.native(self.__native, d);
}
function pureMethods(flavour, clsQ) {
  const rebuild = (ctx, self, d) => ctx.native(clsQ === 'self' ? self.__native : clsQ, d);
  return {
    as_posix: (ctx, self, args, kwargs) => { noKw(ctx, kwargs, 'as_posix'); return asPosixOf(self.data); },
    joinpath: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'joinpath');
      const d = buildData(ctx, flavour, [self, ...args]);
      return d === null ? UNK('joinpath') : ctx.native(self.__native, d);
    },
    with_segments: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'with_segments');
      const d = buildData(ctx, flavour, args);
      return d === null ? UNK('with_segments') : ctx.native(self.__native, d);
    },
    with_name: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'with_name');
      if (args.length !== 1) ctx.err('TypeError', 'with_name() takes exactly one argument (' + args.length + ' given)', '');
      const name = args[0];
      if (isUnk(name)) return UNK('with_name');
      const sep = sepOf(flavour), altsep = flavour === 'windows' ? '/' : null;
      if (typeof name !== 'string') {
        if (!ctx.truthy(name)) ctx.err('ValueError', 'Invalid name ' + ctx.repr(name), '');
        ctx.err('TypeError', "argument of type '" + ctx.typeName(name) + "' is not iterable", '');
      }
      if (!name || name.includes(sep) || (altsep && name.includes(altsep)) || name === '.') ctx.err('ValueError', 'Invalid name ' + pyRepr(name), '');
      const d = self.data;
      if (!d.tail.length) ctx.err('ValueError', ctx.repr(self) + ' has an empty name', '');
      const tail = [...d.tail]; tail[tail.length - 1] = name;
      return ctx.native(self.__native, dataFromParts(d.flavour, d.drv, d.root, tail));
    },
    with_stem: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'with_stem');
      if (args.length !== 1) ctx.err('TypeError', 'with_stem() takes exactly one argument (' + args.length + ' given)', '');
      const stem = args[0];
      if (isUnk(stem)) return UNK('with_stem');
      const suffix = suffixOf(nameOf(self.data));
      if (!suffix) return pureMethods(flavour, clsQ).with_name(ctx, self, [stem], {});
      if (typeof stem === 'string' && !stem) ctx.err('ValueError', ctx.repr(self) + ' has a non-empty suffix', '');
      if (typeof stem !== 'string') ctx.err('TypeError', 'can only concatenate str (not "' + ctx.typeName(stem) + '") to str', '');
      return pureMethods(flavour, clsQ).with_name(ctx, self, [stem + suffix], {});
    },
    with_suffix: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'with_suffix');
      if (args.length !== 1) ctx.err('TypeError', 'with_suffix() takes exactly one argument (' + args.length + ' given)', '');
      const suffix = args[0];
      if (isUnk(suffix)) return UNK('with_suffix');
      const stem = stemOf(nameOf(self.data));
      if (!stem) ctx.err('ValueError', ctx.repr(self) + ' has an empty name', '');
      if (typeof suffix !== 'string') ctx.err('TypeError', 'can only concatenate str (not "' + ctx.typeName(suffix) + '") to str', '');
      if (suffix && !suffix.startsWith('.')) ctx.err('ValueError', 'Invalid suffix ' + pyRepr(suffix), '');
      return pureMethods(flavour, clsQ).with_name(ctx, self, [stem + suffix], {});
    },
    relative_to: (ctx, self, args, kwargs) => {
      if (args.length !== 1) ctx.err('TypeError', 'relative_to() takes exactly one argument (' + args.length + ' given)', '');
      let walkUp = false;
      for (const k of Object.keys(kwargs || {})) {
        if (k !== 'walk_up') ctx.err('TypeError', "relative_to() got an unexpected keyword argument '" + k + "'", '');
        walkUp = ctx.truthy(kwargs[k]);
      }
      const other = convertOther(ctx, self, args[0]);
      if (other === null) return UNK('relative_to');
      const sd = self.data, od = other.data;
      const chain = [od, ...parentsData(od)];
      const selfParents = parentsData(sd);
      let found = null, step = 0;
      for (let i = 0; i < chain.length; i++) {
        const p = chain[i];
        if (eqData(p, sd) || selfParents.some((sp) => eqData(sp, p))) { found = p; step = i; break; }
        if (!walkUp) ctx.err('ValueError', pyRepr(sd.str) + ' is not in the subpath of ' + pyRepr(od.str), '');
        if (nameOf(p) === '..') ctx.err('ValueError', "'..' segment in " + pyRepr(od.str) + ' cannot be walked', '');
      }
      if (!found) ctx.err('ValueError', pyRepr(sd.str) + ' and ' + pyRepr(od.str) + ' have different anchors', '');
      const parts = [...Array(step).fill('..'), ...sd.tail.slice(found.tail.length)];
      return ctx.native(self.__native, dataFromParts(sd.flavour, '', '', parts));
    },
    is_relative_to: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'is_relative_to');
      if (args.length !== 1) ctx.err('TypeError', 'is_relative_to() takes exactly one argument (' + args.length + ' given)', '');
      const other = convertOther(ctx, self, args[0]);
      if (other === null) return UNK('is_relative_to');
      const sd = self.data;
      return BOOL(eqData(other.data, sd) || parentsData(sd).some((sp) => eqData(sp, other.data)));
    },
    is_absolute: (ctx, self, args, kwargs) => { noKw(ctx, kwargs, 'is_absolute'); return BOOL(self.data.root !== ''); },
    match: (ctx, self, args, kwargs) => {
      if (args.length !== 1) ctx.err('TypeError', 'match() takes exactly one argument (' + args.length + ' given)', '');
      let caseSensitive = null;
      for (const k of Object.keys(kwargs || {})) {
        if (k !== 'case_sensitive') ctx.err('TypeError', "match() got an unexpected keyword argument '" + k + "'", '');
        caseSensitive = kwargs[k];
      }
      const pattern = convertOther(ctx, self, args[0]);
      if (pattern === null) return UNK('match');
      const cs = caseSensitive === null || caseSensitive === undefined || isNone(caseSensitive) ? flavour === 'posix' : ctx.truthy(caseSensitive);
      const pathParts = partsOf(self.data).reverse();
      const patternParts = partsOf(pattern.data).reverse();
      if (!patternParts.length) ctx.err('ValueError', 'empty pattern', '');
      if (pathParts.length < patternParts.length) return BOOL(false);
      if (pathParts.length > patternParts.length && (pattern.data.drv || pattern.data.root)) return BOOL(false);
      const sep = sepOf(flavour);
      for (let i = 0; i < patternParts.length; i++) {
        const re = globRegexToJS(globTranslate(patternParts[i], false, true, sep), cs);
        if (!re.test(pathParts[i])) return BOOL(false);
      }
      return BOOL(true);
    },
    full_match: (ctx, self, args, kwargs) => {
      if (args.length !== 1) ctx.err('TypeError', 'full_match() takes exactly one argument (' + args.length + ' given)', '');
      let caseSensitive = null;
      for (const k of Object.keys(kwargs || {})) {
        if (k !== 'case_sensitive') ctx.err('TypeError', "full_match() got an unexpected keyword argument '" + k + "'", '');
        caseSensitive = kwargs[k];
      }
      const pattern = convertOther(ctx, self, args[0]);
      if (pattern === null) return UNK('full_match');
      const cs = caseSensitive === null || caseSensitive === undefined || isNone(caseSensitive) ? flavour === 'posix' : ctx.truthy(caseSensitive);
      const pathStr = partsOf(self.data).length ? self.data.str : '';
      const patternStr = partsOf(pattern.data).length ? pattern.data.str : '';
      const re = globRegexToJS(globTranslate(patternStr, true, true, sepOf(flavour)), cs);
      return BOOL(re.test(pathStr));
    },
    as_uri: (ctx, self, args, kwargs) => {
      noKw(ctx, kwargs, 'as_uri');
      const d = self.data;
      if (d.root === '') ctx.err('ValueError', "relative path can't be expressed as a file URI", '');
      let prefix, path;
      if (d.drv.length === 2 && d.drv[1] === ':') { prefix = 'file:///' + d.drv; path = asPosixOf(d).slice(2); }
      else if (d.drv) { prefix = 'file:'; path = asPosixOf(d); }
      else { prefix = 'file://'; path = d.str; }
      return prefix + quoteUri(path, '/');
    },
  };
}
function makePureDef(flavour, clsName, selfQ, parents) {
  return {
    typeName: clsName,
    parents,
    construct(ctx, args, kwargs) {
      if (kwargs && Object.keys(kwargs).length) ctx.err('TypeError', clsName + ".__init__() got an unexpected keyword argument '" + Object.keys(kwargs)[0] + "'", '');
      const d = buildData(ctx, flavour, args);
      if (d === null) return UNK(clsName);
      return ctx.native(selfQ, d);
    },
    attrs: pureAttrs(flavour),
    classAttrs: {
      parser: (ctx) => {
        const u = ctx.unk('モジュール「' + (flavour === 'posix' ? 'posixpath' : 'ntpath') + '」');
        u.mod = flavour === 'posix' ? 'posixpath' : 'ntpath';
        return u;
      },
    },
    methods: pureMethods(flavour, selfQ),
    repr: (ctx, self) => clsName + '(' + pyRepr(asPosixOf(self.data)) + ')',
    str: (ctx, self) => self.data.str,
    eq: (ctx, self, other) => {
      if (!other || !other.__native || !isPathQ(other.__native)) return false;
      return eqData(self.data, other.data);
    },
    hash: (ctx, self) => 'path:' + self.data.flavour + ':' + normcaseOf(self.data),
    compare: (ctx, self, op, other) => {
      if (!other || !other.__native || !isPathQ(other.__native)) return null;
      if (other.data.flavour !== flavour) return null;
      const a = normcaseOf(self.data).split(sepOf(flavour));
      const b = normcaseOf(other.data).split(sepOf(flavour));
      let c = 0;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] === undefined) { c = -1; break; }
        if (b[i] === undefined) { c = 1; break; }
        if (a[i] !== b[i]) { c = a[i] < b[i] ? -1 : 1; break; }
      }
      return op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
    },
    binop: (ctx, self, op, other, reflected) => {
      if (op !== '/') return ctx.NOT_HANDLED;
      const d = buildData(ctx, flavour, reflected ? [other, self] : [self, other]);
      if (d === null) return UNK('/');
      return ctx.native(self.__native, d);
    },
  };
}

/* ---------- Path（具象） ---------- */
const FS_REASON = 'ファイルシステムへのアクセスが必要なため';
const FS_METHODS = ['chmod', 'copy', 'copy_into', 'exists', 'glob', 'group', 'hardlink_to', 'is_block_device',
  'is_char_device', 'is_dir', 'is_fifo', 'is_file', 'is_junction', 'is_mount', 'is_socket', 'is_symlink',
  'iterdir', 'lchmod', 'lstat', 'mkdir', 'move', 'move_into', 'open', 'owner', 'read_bytes', 'read_text',
  'readlink', 'rename', 'replace', 'resolve', 'rglob', 'rmdir', 'samefile', 'stat', 'symlink_to', 'touch',
  'unlink', 'walk', 'write_bytes', 'write_text'];
function makeConcreteDef(clsName, selfQ, parents) {
  const base = makePureDef('posix', clsName, selfQ, parents);
  const methods = { ...base.methods };
  for (const m of FS_METHODS) methods[m] = unsupportedFn('pathlib.Path.' + m, FS_REASON);
  methods.absolute = unsupportedFn('pathlib.Path.absolute', '現在の作業ディレクトリに依存するため');
  methods.expanduser = unsupportedFn('pathlib.Path.expanduser', 'ホームディレクトリ（環境）に依存するため');
  methods.as_uri = (ctx, self, args, kwargs) => {
    noKw(ctx, kwargs, 'as_uri');
    const d = self.data;
    if (d.root === '') ctx.err('ValueError', "relative paths can't be expressed as file URIs", '');
    const [drive, root, tail] = posixSplitroot(d.str);
    const r = root ? '//' + root : root;
    return 'file:' + quoteUri(drive, '/:') + r + quoteUri(tail, '/');
  };
  const classMethods = {
    cwd: unsupportedFn('pathlib.Path.cwd', '現在の作業ディレクトリに依存するため'),
    home: unsupportedFn('pathlib.Path.home', 'ホームディレクトリ（環境）に依存するため'),
    from_uri: (ctx, args, kwargs) => {
      noKw(ctx, kwargs, 'from_uri');
      if (args.length !== 1) ctx.err('TypeError', 'from_uri() takes exactly one argument (' + args.length + ' given)', '');
      const uri = args[0];
      if (isUnk(uri)) return UNK('from_uri');
      if (typeof uri !== 'string') ctx.err('TypeError', 'from_uri() argument must be str, not ' + ctx.typeName(uri), '');
      const m = /^([A-Za-z][A-Za-z0-9+.-]*):([\s\S]*)$/.exec(uri);
      const scheme = m ? m[1].toLowerCase() : '';
      if (scheme !== 'file') ctx.err('ValueError', "URL is missing a 'file:' scheme", '');
      let rest = m[2].split('#')[0].split('?')[0];
      let authority = '';
      if (rest.startsWith('//')) {
        const idx = rest.indexOf('/', 2);
        if (idx === -1) { authority = rest.slice(2); rest = ''; }
        else { authority = rest.slice(2, idx); rest = rest.slice(idx); }
      }
      if (authority !== '' && authority !== 'localhost') ctx.err('ValueError', 'file:// scheme is supported only on localhost', '');
      const p = unquoteUri(rest);
      const d = dataFromRaw('posix', p);
      if (d.root === '') ctx.err('ValueError', 'URI is not absolute: ' + pyRepr(uri), '');
      return ctx.native(selfQ, d);
    },
  };
  return {
    ...base,
    methods,
    classMethods,
    attrs: {
      ...base.attrs,
      info: (ctx) => { ctx.err('未対応', 'pathlib.Path.info は本アプリの高度モードでは未対応です（' + FS_REASON + '）', ''); return UNK('PathInfo'); },
    },
  };
}
const windowsPathDef = {
  typeName: 'WindowsPath',
  parents: [QC, QPW],
  construct(ctx) {
    ctx.err('pathlib.UnsupportedOperation', "cannot instantiate 'WindowsPath' on your system", '');
    return UNK('WindowsPath');
  },
};

registerStdlibModule('pathlib', {
  classes: {
    PurePath: makePureDef('posix', 'PurePath', QPP, []),
    PurePosixPath: makePureDef('posix', 'PurePosixPath', QPP, [QP]),
    PureWindowsPath: makePureDef('windows', 'PureWindowsPath', QPW, [QP]),
    Path: makeConcreteDef('Path', QCP, [QP]),
    PosixPath: makeConcreteDef('PosixPath', QCP, [QC, QPP]),
    WindowsPath: windowsPathDef,
    UnsupportedOperation: { typeName: 'UnsupportedOperation', exc: 'pathlib.UnsupportedOperation', excParents: ['NotImplementedError'] },
  },
});

/* ---------- pathlib.types ---------- */
const TYPES_FS = 'ファイルシステムへの問い合わせが必要なため';
registerStdlibModule('pathlib.types', {
  classes: {
    PathInfo: {
      typeName: 'PathInfo',
      construct: unsupportedCtor('pathlib.types.PathInfo', TYPES_FS),
      methods: {
        exists: unsupportedFn('pathlib.types.PathInfo.exists', TYPES_FS),
        is_dir: unsupportedFn('pathlib.types.PathInfo.is_dir', TYPES_FS),
        is_file: unsupportedFn('pathlib.types.PathInfo.is_file', TYPES_FS),
        is_symlink: unsupportedFn('pathlib.types.PathInfo.is_symlink', TYPES_FS),
      },
    },
  },
});
