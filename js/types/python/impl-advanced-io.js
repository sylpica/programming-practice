/* 高度モード B7 G11：io モジュール（76件）。
 * 一次情報：公式ドキュメント 3.15（library/io）と CPython 3.12.3 実走。
 *
 * 裁定の要点：
 * - StringIO は文字列（str）だけを扱うため、改行変換規則を含め実値で
 *   実装できる（supported）。BytesIO は bytes を扱うため未検証
 *   （エンジンに bytes 値が無い。長さすら確定しない）。
 * - IOBase／RawIOBase／BufferedIOBase／TextIOBase は単体生成が可能で、
 *   素のインスタンスの既定挙動（UnsupportedOperation の送出先まで含む）
 *   が CPython 実走で確定するため、その範囲を実装する（supported）。
 * - 実ファイル系（open／open_code／FileIO）は未対応。
 * - BufferedReader 等のラッパと TextIOWrapper は bytes ストリーム前提で
 *   未検証。Reader／Writer は 3.14 で追加された typing プロトコルで未検証。
 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { NUM, BOOL, NONE, LIST, UNK, I, noKwargs, arity, unsupportedFn, unverifiedFn, unsupportedClass, unverifiedClass, excDef } from './impl-advanced-g11-common.js';

const UO = 'io.UnsupportedOperation';
const CLOSED_DOT = 'I/O operation on closed file.'; // _io の IOBase 系（ピリオドあり）
const CLOSED_PLAIN = 'I/O operation on closed file'; // _io.StringIO 系（ピリオドなし）

function uo(ctx, op) { ctx.err(UO, op, ''); }
function nie(ctx) { ctx.err('NotImplementedError', '', ''); }

/* ---- IOBase 系の共通既定挙動（CPython 3.12.3 の素のインスタンスで実測） ---- */
function baseMethods(flavor, typeName) {
  const readlineImpl = (ctx, self, args, kwargs) => {
    if (flavor === 'iobase') ctx.err('AttributeError', "'" + typeName + "' object has no attribute 'read'", '');
    if (flavor === 'raw') nie(ctx);
    if (flavor === 'buffered') uo(ctx, 'read');
    uo(ctx, 'readline'); // text
    return NONE;
  };
  const writeImpl = (ctx, self) => {
    if (flavor === 'iobase') ctx.err('AttributeError', "'" + typeName + "' object has no attribute 'write'", '');
    if (flavor === 'raw') nie(ctx);
    uo(ctx, 'write');
    return NONE;
  };
  const methods = {
    close: (ctx, self) => { self.data.closed = true; return NONE; },
    flush: (ctx, self) => { if (self.data.closed) ctx.err('ValueError', CLOSED_DOT, ''); return NONE; },
    fileno: (ctx) => uo(ctx, 'fileno'),
    isatty: (ctx, self) => { if (self.data.closed) ctx.err('ValueError', CLOSED_DOT, ''); return BOOL(false); },
    readable: () => BOOL(false),
    writable: () => BOOL(false),
    seekable: () => BOOL(false),
    seek: (ctx) => uo(ctx, 'seek'),
    tell: (ctx) => uo(ctx, 'seek'),
    truncate: (ctx) => uo(ctx, 'truncate'),
    readline: readlineImpl,
    readlines: (ctx, self, args, kwargs) => {
      let hint = -1;
      if (args.length >= 1) { const h = ctx.int(args[0]); if (h !== null) hint = h; }
      const out = [];
      let total = 0;
      for (;;) {
        const line = readlineImpl(ctx, self, [], {});
        if (typeof line === 'string' && line === '') break;
        if (typeof line !== 'string') break;
        out.push(line); total += Array.from(line).length;
        if (hint > 0 && total > hint) break;
      }
      return LIST(out);
    },
    writelines: (ctx, self, args, kwargs) => {
      arity(ctx, args, 1, 1, typeName + '.writelines()');
      if (self.data.closed) ctx.err('ValueError', CLOSED_DOT, '');
      const items = ctx.iterable(args[0]);
      if (items === null) { if (ctx.isUnk(args[0])) return ctx.unk('writelines の結果'); ctx.err('TypeError', 'writelines() には並びを渡してください', ''); }
      for (const it of items) writeImpl(ctx, self, [it], {});
      return NONE;
    },
  };
  return { methods, writeImpl, readlineImpl };
}
const baseAttrs = { closed: (ctx, self) => BOOL(!!self.data.closed) };

function ioBaseClass(typeName, flavor, extraMethods, extraAttrs, parents) {
  const { methods } = baseMethods(flavor, typeName);
  return {
    typeName,
    construct: (ctx, args, kwargs) => {
      arity(ctx, args, 0, 0, typeName + '()');
      noKwargs(ctx, kwargs, typeName + '()');
      return { __native: null, data: { closed: false } }; // プレースホルダ（下で包む）
    },
    methods: { ...methods, ...(extraMethods || {}) },
    attrs: { ...baseAttrs, ...(extraAttrs || {}) },
    parents: parents || [],
  };
}

/* construct が作る値の限定名は登録名と一致させる必要があるため、
 * クラスごとに construct を束縛し直す。 */
function bindConstruct(qualname, def) {
  const inner = def.construct;
  def.construct = (ctx, args, kwargs) => {
    const v = inner(ctx, args, kwargs);
    if (v && v.__native === null) { v.__native = qualname; v.mod = 'io'; }
    return v;
  };
  return def;
}

const IOBaseDef = bindConstruct('io.IOBase', ioBaseClass('IOBase', 'iobase'));
const RawIOBaseDef = bindConstruct('io.RawIOBase', ioBaseClass('RawIOBase', 'raw', {
  read: (ctx) => nie(ctx),
  readall: (ctx) => nie(ctx),
  readinto: (ctx) => nie(ctx),
  write: (ctx) => nie(ctx),
}, null, ['io.IOBase']));
const BufferedIOBaseDef = bindConstruct('io.BufferedIOBase', ioBaseClass('BufferedIOBase', 'buffered', {
  read: (ctx) => uo(ctx, 'read'),
  read1: (ctx) => uo(ctx, 'read1'),
  readinto: (ctx) => uo(ctx, 'read'),
  readinto1: (ctx) => uo(ctx, 'read1'),
  write: (ctx) => uo(ctx, 'write'),
  detach: (ctx) => uo(ctx, 'detach'),
}, null, ['io.IOBase']));
const TextIOBaseDef = bindConstruct('io.TextIOBase', ioBaseClass('TextIOBase', 'text', {
  read: (ctx) => uo(ctx, 'read'),
  write: (ctx) => uo(ctx, 'write'),
  detach: (ctx) => uo(ctx, 'detach'),
}, {
  encoding: () => NONE,
  errors: () => NONE,
  newlines: () => NONE,
}, ['io.IOBase']));

/* ---- StringIO（str のみで完結するため実値実装） ---- */
const cpLen = (s) => Array.from(s).length;
const cpSlice = (s, a, b) => Array.from(s).slice(a, b).join('');
function translateRead(s, nl) {
  if (nl === null) return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (nl === '\r') return s.replace(/\n/g, '\r');
  if (nl === '\r\n') return s.replace(/\n/g, '\r\n');
  return s; // '' と '\n' は変換なし
}
function translateWrite(s, nl) {
  // newline=None の書き込み変換は os.linesep 依存。モデル化する実行環境
  // （POSIX）では '\n' のため変換なしとして扱う（報告書に明記）。
  if (nl === '\r') return s.replace(/\n/g, '\r');
  if (nl === '\r\n') return s.replace(/\n/g, '\r\n');
  return s;
}
function lineEndAt(text, pos, nl) {
  // pos 以降で最初の行末の [開始, 終端) を返す。無ければ null。
  const a = Array.from(text);
  if (nl === '' ) {
    for (let i = pos; i < a.length; i++) {
      if (a[i] === '\r') return [i, (a[i + 1] === '\n') ? i + 2 : i + 1];
      if (a[i] === '\n') return [i, i + 1];
    }
    return null;
  }
  const sep = (nl === null || nl === '\n') ? '\n' : nl;
  const sa = Array.from(sep);
  for (let i = pos; i + sa.length <= a.length; i++) {
    let ok = true;
    for (let j = 0; j < sa.length; j++) if (a[i + j] !== sa[j]) { ok = false; break; }
    if (ok) return [i, i + sa.length];
  }
  return null;
}
function sioCheck(ctx, self) { if (self.data.closed) ctx.err('ValueError', CLOSED_PLAIN, ''); }
function sioReadline(ctx, self, size) {
  sioCheck(ctx, self);
  const d = self.data;
  const total = cpLen(d.text);
  if (d.pos >= total) return '';
  const le = lineEndAt(d.text, d.pos, d.newline);
  let end = le ? le[1] : total;
  if (size !== null && size >= 0) end = Math.min(end, d.pos + size);
  const out = cpSlice(d.text, d.pos, end);
  d.pos = end;
  return out;
}
const StringIODef = {
  typeName: 'StringIO',
  parents: ['io.TextIOBase', 'io.IOBase'],
  construct: (ctx, args, kwargs) => {
    if (args.length > 2) ctx.err('TypeError', 'StringIO() の引数が多すぎます', '');
    let initial = '';
    let newline = '\n';
    let hasNl = false;
    if (args.length >= 1) {
      if (ctx.isNone(args[0])) initial = '';
      else if (typeof args[0] === 'string') initial = args[0];
      else if (ctx.isUnk(args[0])) return ctx.unk('StringIO（未検証）');
      else ctx.err('TypeError', 'initial_value must be str or None, not ' + ctx.typeName(args[0]), '');
    }
    if (args.length >= 2) { newline = args[1]; hasNl = true; }
    if (kwargs && 'initial_value' in kwargs) {
      const v = kwargs.initial_value;
      if (ctx.isNone(v)) initial = ''; else if (typeof v === 'string') initial = v;
      else ctx.err('TypeError', 'initial_value must be str or None, not ' + ctx.typeName(v), '');
    }
    if (kwargs && 'newline' in kwargs) { newline = kwargs.newline; hasNl = true; }
    let nl;
    if (ctx.isNone(newline)) nl = null;
    else if (typeof newline === 'string') nl = newline;
    else if (ctx.isUnk(newline)) return ctx.unk('StringIO（未検証）');
    else ctx.err('TypeError', 'newline must be str or None, not ' + ctx.typeName(newline), '');
    if (!(nl === null || nl === '' || nl === '\n' || nl === '\r' || nl === '\r\n')) {
      ctx.err('ValueError', 'illegal newline value: ' + ctx.repr(newline), '');
    }
    return ctx.native('io.StringIO', { text: translateRead(initial, nl), pos: 0, closed: false, newline: nl });
  },
  methods: {
    getvalue: (ctx, self) => { sioCheck(ctx, self); return self.data.text; },
    read: (ctx, self, args, kwargs) => {
      sioCheck(ctx, self);
      let size = -1;
      if (args.length >= 1 && !ctx.isNone(args[0])) {
        const n = ctx.int(args[0]);
        if (n === null) { if (ctx.isUnk(args[0])) return ctx.unk('読み取り結果'); ctx.err('TypeError', 'argument should be integer or None, not \'' + ctx.typeName(args[0]) + '\'', ''); }
        size = n;
      }
      const d = self.data;
      const total = cpLen(d.text);
      const end = size < 0 ? total : Math.min(total, d.pos + size);
      const out = cpSlice(d.text, d.pos, end);
      d.pos = end;
      return out;
    },
    readline: (ctx, self, args, kwargs) => {
      let size = -1;
      if (args.length >= 1 && !ctx.isNone(args[0])) {
        const n = ctx.int(args[0]);
        if (n === null) { if (ctx.isUnk(args[0])) return ctx.unk('読み取り結果'); ctx.err('TypeError', 'argument should be integer or None, not \'' + ctx.typeName(args[0]) + '\'', ''); }
        size = n;
      }
      return sioReadline(ctx, self, size < 0 ? null : size);
    },
    readlines: (ctx, self, args, kwargs) => {
      sioCheck(ctx, self);
      let hint = -1;
      if (args.length >= 1 && !ctx.isNone(args[0])) { const h = ctx.int(args[0]); if (h !== null) hint = h; }
      const out = [];
      let total = 0;
      for (;;) {
        const line = sioReadline(ctx, self, null);
        if (line === '') break;
        out.push(line); total += cpLen(line);
        if (hint > 0 && total > hint) break;
      }
      return LIST(out);
    },
    write: (ctx, self, args, kwargs) => {
      sioCheck(ctx, self);
      arity(ctx, args, 1, 1, 'StringIO.write()');
      const s = args[0];
      if (typeof s !== 'string') {
        if (ctx.isUnk(s)) return ctx.unk('書き込み文字数');
        ctx.err('TypeError', "string argument expected, got '" + ctx.typeName(s) + "'", '');
      }
      const d = self.data;
      const w = translateWrite(s, d.newline);
      const wlen = cpLen(w);
      let text = d.text;
      const total = cpLen(text);
      if (d.pos > total) text = text + '\x00'.repeat(d.pos - total);
      const before = cpSlice(text, 0, d.pos);
      const after = cpSlice(text, d.pos + wlen);
      d.text = before + w + after;
      const ret = cpLen(s); // CPython は変換前の文字数を返す（実走で確認）
      d.pos += wlen;
      return I(ret);
    },
    writelines: (ctx, self, args, kwargs) => {
      sioCheck(ctx, self);
      arity(ctx, args, 1, 1, 'StringIO.writelines()');
      const items = ctx.iterable(args[0]);
      if (items === null) { if (ctx.isUnk(args[0])) return ctx.unk('writelines の結果'); ctx.err('TypeError', 'writelines() には並びを渡してください', ''); }
      for (const it of items) StringIODef.methods.write(ctx, self, [it], {});
      return NONE;
    },
    seek: (ctx, self, args, kwargs) => {
      sioCheck(ctx, self);
      if (args.length < 1 || args.length > 2) ctx.err('TypeError', 'seek() の引数の数が合いません', '');
      const off = ctx.int(args[0]);
      if (off === null) { if (ctx.isUnk(args[0])) return ctx.unk('位置'); ctx.err('TypeError', "'" + ctx.typeName(args[0]) + "' object cannot be interpreted as an integer", ''); }
      let whence = 0;
      if (args.length >= 2) { const w = ctx.int(args[1]); if (w === null) ctx.err('TypeError', 'an integer is required', ''); whence = w; }
      if (kwargs && 'whence' in kwargs) { const w = ctx.int(kwargs.whence); if (w !== null) whence = w; }
      if (whence !== 0 && whence !== 1 && whence !== 2) ctx.err('ValueError', 'invalid whence (' + whence + ', should be 0, 1 or 2)', '');
      const d = self.data;
      if (whence === 0) {
        if (off < 0) ctx.err('ValueError', 'Negative seek position ' + off, '');
        d.pos = off;
      } else {
        if (off !== 0) ctx.err('OSError', "Can't do nonzero cur-relative seeks", '');
        if (whence === 2) d.pos = cpLen(d.text);
      }
      return I(d.pos);
    },
    tell: (ctx, self) => { sioCheck(ctx, self); return I(self.data.pos); },
    truncate: (ctx, self, args, kwargs) => {
      sioCheck(ctx, self);
      let size = self.data.pos;
      if (args.length >= 1 && !ctx.isNone(args[0])) {
        const n = ctx.int(args[0]);
        if (n === null) { if (ctx.isUnk(args[0])) return ctx.unk('サイズ'); ctx.err('TypeError', 'argument should be integer or None, not \'' + ctx.typeName(args[0]) + '\'', ''); }
        size = n;
      }
      if (size < 0) ctx.err('ValueError', 'Negative size value ' + size, '');
      const d = self.data;
      const total = cpLen(d.text);
      // 現在の長さより大きい size では内容は変わらない（CPython 実走：
      // getvalue は元の文字列のまま。戻り値だけが size になる）。
      if (size < total) d.text = cpSlice(d.text, 0, size);
      return I(size);
    },
    flush: (ctx, self) => { sioCheck(ctx, self); return NONE; },
    close: (ctx, self) => { self.data.closed = true; return NONE; },
    readable: (ctx, self) => { sioCheck(ctx, self); return BOOL(true); },
    writable: (ctx, self) => { sioCheck(ctx, self); return BOOL(true); },
    seekable: (ctx, self) => { sioCheck(ctx, self); return BOOL(true); },
    isatty: (ctx, self) => { if (self.data.closed) ctx.err('ValueError', CLOSED_DOT, ''); return BOOL(false); },
    fileno: (ctx) => uo(ctx, 'fileno'),
    detach: (ctx) => uo(ctx, 'detach'),
  },
  attrs: { closed: (ctx, self) => BOOL(!!self.data.closed) },
  iter: (ctx, self) => {
    sioCheck(ctx, self);
    const out = [];
    for (;;) { const line = sioReadline(ctx, self, null); if (line === '') break; out.push(line); }
    return out;
  },
  repr: (ctx, self) => '<_io.StringIO object at 0x...>',
};
// StringIO の repr はアドレスを含むため CPython と一致させられない。
// 捏造を避け、repr は定義しない（エンジンの汎用表示に委ねる）。
delete StringIODef.repr;

registerStdlibModule('io', {
  data: { DEFAULT_BUFFER_SIZE: I(8192) },
  functions: {
    open: unsupportedFn('io.open()', '実ファイルを開く操作であり、エンジンに実ファイルシステムが無い'),
    open_code: unsupportedFn('io.open_code()', '実ファイルを開く操作であり、エンジンに実ファイルシステムが無い'),
    text_encoding: (ctx, args, kwargs) => {
      const enc = args.length >= 1 ? args[0] : (kwargs && 'encoding' in kwargs ? kwargs.encoding : NONE);
      if (typeof enc === 'string') return enc;
      if (ctx.isUnk(enc)) return ctx.unk('エンコーディング名');
      ctx.diag('未検証：io.text_encoding() の既定値はロケールと UTF-8 モードに依存するため、この説明では値を確定できません');
      return ctx.unk('エンコーディング名（未検証）');
    },
  },
  classes: {
    IOBase: IOBaseDef,
    RawIOBase: RawIOBaseDef,
    BufferedIOBase: BufferedIOBaseDef,
    TextIOBase: TextIOBaseDef,
    StringIO: StringIODef,
    BytesIO: unverifiedClass('BytesIO', 'io.BytesIO', 'bytes を値として保持するが、エンジンに bytes の値表現が無い'),
    BufferedReader: unverifiedClass('BufferedReader', 'io.BufferedReader', 'bytes ストリームのバッファリングであり、エンジンに bytes の値表現が無い'),
    BufferedWriter: unverifiedClass('BufferedWriter', 'io.BufferedWriter', 'bytes ストリームのバッファリングであり、エンジンに bytes の値表現が無い'),
    BufferedRandom: unverifiedClass('BufferedRandom', 'io.BufferedRandom', 'bytes ストリームのバッファリングであり、エンジンに bytes の値表現が無い'),
    BufferedRWPair: unverifiedClass('BufferedRWPair', 'io.BufferedRWPair', 'bytes ストリームのペアのバッファリングであり、エンジンに bytes の値表現が無い'),
    TextIOWrapper: unverifiedClass('TextIOWrapper', 'io.TextIOWrapper', '背後のバイナリストリームとエンコーディング処理に依存し、エンジンに bytes の値表現が無い'),
    FileIO: unsupportedClass('FileIO', 'io.FileIO', '実ファイルを対象とし、エンジンに実ファイルシステムが無い'),
    IncrementalNewlineDecoder: unverifiedClass('IncrementalNewlineDecoder', 'io.IncrementalNewlineDecoder', 'bytes のデコード過程に依存し、エンジンに bytes の値表現が無い'),
    Reader: unverifiedClass('Reader', 'io.Reader', '3.14 で追加された typing プロトコルであり、ローカルの CPython 3.12 では実走照合できない'),
    Writer: unverifiedClass('Writer', 'io.Writer', '3.14 で追加された typing プロトコルであり、ローカルの CPython 3.12 では実走照合できない'),
    BlockingIOError: excDef('BlockingIOError', 'BlockingIOError', []),
    UnsupportedOperation: excDef('UnsupportedOperation', 'io.UnsupportedOperation', ['OSError', 'ValueError']),
  },
});
