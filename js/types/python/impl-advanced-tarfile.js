/* 高度モード B7 G11：tarfile モジュール（84件）。
 * 一次情報：公式ドキュメント 3.15（library/tarfile）、CPython 3.12.3 実走、
 * および CPython 3.12.3 の tarfile.py ソース（抽出フィルタの実装）。
 *
 * 裁定の要点：
 * - TarInfo はメタデータクラスとして実値実装（属性・is*()・replace()）。
 *   ただし type 属性は bytes 値のため未検証（内部では文字で保持し
 *   is*() の判定に使う）。tobuf／frombuf は bytes が絡み未検証。
 * - 抽出フィルタ（data_filter／tar_filter／fully_trusted_filter）は
 *   TarInfo と宛先パスの純粋関数として、CPython ソースどおりに実装。
 *   パス解決は POSIX の字句的な realpath としてモデル化する
 *   （実ファイルシステムのシンボリックリンク解決は再現しない）。
 * - 型定数（REGTYPE 等）は bytes 値のため未検証、形式定数は整数で対応。
 * - TarFile 本体と open／is_tarfile は実ファイル前提で未対応。
 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { NUM, BOOL, NONE, DICT, UNK, I, arity, unsupportedFn, unsupportedClass, excDef, bytesUnk } from './impl-advanced-g11-common.js';

/* ---- POSIX 字句パス処理（os.path の posix 版のモデル） ---- */
function normpath(p) {
  const abs = p.startsWith('/');
  const out = [];
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop();
      else if (!abs) out.push('..');
    } else out.push(part);
  }
  const joined = out.join('/');
  if (abs) return '/' + joined;
  return joined === '' ? '.' : joined;
}
function joinPath(...ps) {
  let out = '';
  for (const p of ps) {
    if (p.startsWith('/')) out = p;
    else out = out === '' || out.endsWith('/') ? out + p : out + '/' + p;
  }
  return out;
}
function realpathLex(p) { return normpath(p.startsWith('/') ? p : '/' + p); }
function commonpathLex(a, b) {
  const pa = a.split('/').filter((x) => x !== '');
  const pb = b.split('/').filter((x) => x !== '');
  const common = [];
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    if (pa[i] !== pb[i]) break;
    common.push(pa[i]);
  }
  return '/' + common.join('/');
}
function dirnameLex(p) {
  const i = p.lastIndexOf('/');
  if (i < 0) return '';
  if (i === 0) return '/';
  return p.slice(0, i);
}

/* ---- TarInfo ---- */
const TYPE_CHECKS = {
  isreg: (t) => t === '0' || t === '\x00',
  isfile: (t) => t === '0' || t === '\x00',
  isdir: (t) => t === '5',
  issym: (t) => t === '2',
  islnk: (t) => t === '1',
  ischr: (t) => t === '3',
  isblk: (t) => t === '4',
  isfifo: (t) => t === '6',
  isdev: (t) => t === '3' || t === '4' || t === '6',
};
function tarInfoData(name) {
  return {
    name, mode: I(0o644), uid: I(0), gid: I(0), size: I(0), mtime: I(0),
    chksum: I(0), typeChar: '0', linkname: '', uname: '', gname: '',
    devmajor: I(0), devminor: I(0), offset: I(0), offset_data: I(0),
    pax: DICT(), sparse: NONE,
  };
}
function copyTarInfo(ctx, self, overrides, deep) {
  const d = self.data;
  const nd = { ...d, pax: deep ? (() => { const nd2 = DICT(); for (const [k, e] of d.pax.__dict) nd2.__dict.set(k, e); return nd2; })() : d.pax };
  Object.assign(nd, overrides || {});
  return ctx.native('tarfile.TarInfo', nd);
}
const REPLACE_KEYS = ['name', 'mtime', 'mode', 'linkname', 'uid', 'gid', 'uname', 'gname', 'deep'];
const TarInfoDef = {
  typeName: 'TarInfo',
  construct: (ctx, args, kwargs) => {
    if (args.length > 1) ctx.err('TypeError', 'TarInfo() の引数が多すぎます', '');
    let name = '';
    if (args.length === 1) {
      if (typeof args[0] === 'string') name = args[0];
      else if (ctx.isUnk(args[0])) return ctx.unk('TarInfo（未検証）');
      else ctx.err('TypeError', 'TarInfo() の名前には文字列を使ってください', '');
    }
    if (kwargs && 'name' in kwargs) {
      if (typeof kwargs.name === 'string') name = kwargs.name;
      else ctx.err('TypeError', 'TarInfo() の名前には文字列を使ってください', '');
    }
    return ctx.native('tarfile.TarInfo', tarInfoData(name));
  },
  methods: {
    isreg: (ctx, self) => BOOL(TYPE_CHECKS.isreg(self.data.typeChar)),
    isfile: (ctx, self) => BOOL(TYPE_CHECKS.isfile(self.data.typeChar)),
    isdir: (ctx, self) => BOOL(TYPE_CHECKS.isdir(self.data.typeChar)),
    issym: (ctx, self) => BOOL(TYPE_CHECKS.issym(self.data.typeChar)),
    islnk: (ctx, self) => BOOL(TYPE_CHECKS.islnk(self.data.typeChar)),
    ischr: (ctx, self) => BOOL(TYPE_CHECKS.ischr(self.data.typeChar)),
    isblk: (ctx, self) => BOOL(TYPE_CHECKS.isblk(self.data.typeChar)),
    isfifo: (ctx, self) => BOOL(TYPE_CHECKS.isfifo(self.data.typeChar)),
    isdev: (ctx, self) => BOOL(TYPE_CHECKS.isdev(self.data.typeChar)),
    replace: (ctx, self, args, kwargs) => {
      if (args.length) ctx.err('TypeError', 'TarInfo.replace() はキーワード引数だけで呼び出してください', '');
      const kw = kwargs || {};
      for (const k of Object.keys(kw)) {
        if (!REPLACE_KEYS.includes(k)) ctx.err('TypeError', "TarInfo.replace() got an unexpected keyword argument '" + k + "'", '');
      }
      const ov = {};
      if ('name' in kw) { if (typeof kw.name !== 'string') ctx.err('TypeError', 'replace() の name には文字列を使ってください', ''); ov.name = kw.name; }
      if ('mtime' in kw) ov.mtime = kw.mtime;
      if ('mode' in kw) ov.mode = kw.mode;
      if ('linkname' in kw) { if (typeof kw.linkname !== 'string') ctx.err('TypeError', 'replace() の linkname には文字列を使ってください', ''); ov.linkname = kw.linkname; }
      if ('uid' in kw) ov.uid = kw.uid;
      if ('gid' in kw) ov.gid = kw.gid;
      if ('uname' in kw) ov.uname = kw.uname;
      if ('gname' in kw) ov.gname = kw.gname;
      const deep = 'deep' in kw ? ctx.truthy(kw.deep) !== false : true;
      return copyTarInfo(ctx, self, ov, deep);
    },
    tobuf: (ctx, self) => {
      ctx.diag('未検証：tarfile.TarInfo.tobuf() の戻り値は bytes で、エンジンに bytes の値表現が無いため、この説明では値を確定できません');
      return ctx.unk('tar ヘッダ（bytes）');
    },
    frombuf: (ctx, self, args, kwargs) => TarInfoDef.classMethods.frombuf(ctx, args, kwargs),
    fromtarfile: (ctx) => ctx.err('未対応', 'tarfile.TarInfo.fromtarfile() は TarFile オブジェクトを必要とするため、本アプリの高度モードでは未対応です', ''),
  },
  classMethods: {
    frombuf: (ctx) => {
      ctx.diag('未検証：tarfile.TarInfo.frombuf() は bytes のヘッダを入力とし、エンジンに bytes の値表現が無いため、この説明では値を確定できません');
      return ctx.unk('TarInfo（未検証）');
    },
    fromtarfile: (ctx) => ctx.err('未対応', 'tarfile.TarInfo.fromtarfile() は TarFile オブジェクトを必要とするため、本アプリの高度モードでは未対応です', ''),
  },
  attrs: {
    name: (ctx, self) => self.data.name,
    mode: (ctx, self) => self.data.mode,
    uid: (ctx, self) => self.data.uid,
    gid: (ctx, self) => self.data.gid,
    size: (ctx, self) => self.data.size,
    mtime: (ctx, self) => self.data.mtime,
    chksum: (ctx, self) => self.data.chksum,
    type: (ctx, self) => bytesUnk(),
    linkname: (ctx, self) => self.data.linkname,
    uname: (ctx, self) => self.data.uname,
    gname: (ctx, self) => self.data.gname,
    devmajor: (ctx, self) => self.data.devmajor,
    devminor: (ctx, self) => self.data.devminor,
    offset: (ctx, self) => self.data.offset,
    offset_data: (ctx, self) => self.data.offset_data,
    pax_headers: (ctx, self) => self.data.pax,
    sparse: (ctx, self) => self.data.sparse,
  },
};

/* ---- 抽出フィルタ（CPython 3.12 tarfile.py の _get_filtered_attrs を移植） ---- */
function filteredAttrs(ctx, member, destPath, forData) {
  const d = member.data;
  const newAttrs = {};
  const origName = d.name;
  const dest = realpathLex(destPath);
  let name = origName;
  if (name.startsWith('/')) { name = name.replace(/^\/+/, ''); newAttrs.name = name; }
  let target = realpathLex(joinPath(dest, name));
  if (commonpathLex(target, dest) !== dest) {
    ctx.err('tarfile.OutsideDestinationError', ctx.repr(origName) + ' would be extracted to ' + ctx.repr(target) + ', which is outside the destination', '');
  }
  const modeNum = ctx.num(d.mode);
  if (modeNum !== null) {
    let mode = modeNum & 0o755;
    if (forData) {
      const tc = d.typeChar;
      if (TYPE_CHECKS.isreg(tc) || TYPE_CHECKS.islnk(tc)) {
        if (!(mode & 0o100)) mode &= ~0o111;
        mode |= 0o600;
      } else if (TYPE_CHECKS.isdir(tc) || TYPE_CHECKS.issym(tc)) {
        mode = null;
      } else {
        ctx.err('tarfile.SpecialFileError', ctx.repr(origName) + ' is a special file', '');
      }
    }
    if (mode !== modeNum) newAttrs.mode = mode === null ? NONE : I(mode);
  }
  if (forData) {
    if (!ctx.isNone(d.uid)) newAttrs.uid = NONE;
    if (!ctx.isNone(d.gid)) newAttrs.gid = NONE;
    if (!ctx.isNone(d.uname)) newAttrs.uname = NONE;
    if (!ctx.isNone(d.gname)) newAttrs.gname = NONE;
    const tc = d.typeChar;
    if (TYPE_CHECKS.islnk(tc) || TYPE_CHECKS.issym(tc)) {
      const linkname = d.linkname;
      if (linkname.startsWith('/')) {
        ctx.err('tarfile.AbsoluteLinkError', ctx.repr(origName) + ' is a link to an absolute path', '');
      }
      if (target === dest) {
        ctx.err('tarfile.OutsideDestinationError', ctx.repr(origName) + ' would be extracted to ' + ctx.repr(target) + ', which is outside the destination', '');
      }
      const normalized = normpath(linkname);
      if (normalized !== linkname) newAttrs.linkname = normalized;
      let linkTarget;
      if (TYPE_CHECKS.issym(tc)) {
        const linkDir = dirnameLex(name.replace(/\/+$/, ''));
        linkTarget = joinPath(dest, linkDir, normalized);
      } else {
        linkTarget = joinPath(dest, normalized);
      }
      linkTarget = realpathLex(linkTarget);
      if (commonpathLex(linkTarget, dest) !== dest) {
        ctx.err('tarfile.LinkOutsideDestinationError', ctx.repr(origName) + ' would link to ' + ctx.repr(linkTarget) + ', which is outside the destination', '');
      }
    }
  }
  return newAttrs;
}
function makeFilter(forData, label) {
  return (ctx, args, kwargs) => {
    arity(ctx, args, 2, 2, label + '()');
    const member = args[0];
    const dest = args[1];
    if (ctx.isUnk(member) || ctx.isUnk(dest)) return ctx.unk(label + ' の結果');
    if (!member || member.__native !== 'tarfile.TarInfo') {
      ctx.err('AttributeError', "'" + ctx.typeName(member) + "' object has no attribute 'name'", '');
    }
    if (typeof dest !== 'string') ctx.err('TypeError', label + '() の宛先には文字列（パス）を使ってください', '');
    if (forData === null) return member; // fully_trusted_filter
    const newAttrs = filteredAttrs(ctx, member, dest, forData);
    if (!Object.keys(newAttrs).length) return member;
    return copyTarInfo(ctx, member, newAttrs, false);
  };
}

registerStdlibModule('tarfile', {
  data: {
    GNU_FORMAT: I(1), USTAR_FORMAT: I(0), PAX_FORMAT: I(2), DEFAULT_FORMAT: I(2),
    ENCODING: UNK('ファイルシステムエンコーディング'),
    REGTYPE: bytesUnk(), AREGTYPE: bytesUnk(), LNKTYPE: bytesUnk(), SYMTYPE: bytesUnk(),
    CHRTYPE: bytesUnk(), BLKTYPE: bytesUnk(), DIRTYPE: bytesUnk(), FIFOTYPE: bytesUnk(),
    CONTTYPE: bytesUnk(), GNUTYPE_LONGNAME: bytesUnk(), GNUTYPE_LONGLINK: bytesUnk(),
    GNUTYPE_SPARSE: bytesUnk(),
  },
  functions: {
    data_filter: makeFilter(true, 'tarfile.data_filter'),
    tar_filter: makeFilter(false, 'tarfile.tar_filter'),
    fully_trusted_filter: makeFilter(null, 'tarfile.fully_trusted_filter'),
    open: unsupportedFn('tarfile.open()', '実ファイルのアーカイブを対象とし、エンジンに実ファイルシステムが無い'),
    is_tarfile: unsupportedFn('tarfile.is_tarfile()', 'ファイルの内容検査が必要で、エンジンに実ファイルシステムが無い'),
  },
  classes: {
    TarInfo: TarInfoDef,
    TarFile: unsupportedClass('TarFile', 'tarfile.TarFile', '実ファイルのアーカイブを対象とし、エンジンに実ファイルシステムが無い'),
    TarError: excDef('TarError', 'tarfile.TarError', ['Exception']),
    ReadError: excDef('ReadError', 'tarfile.ReadError', ['tarfile.TarError']),
    CompressionError: excDef('CompressionError', 'tarfile.CompressionError', ['tarfile.TarError']),
    StreamError: excDef('StreamError', 'tarfile.StreamError', ['tarfile.TarError']),
    ExtractError: excDef('ExtractError', 'tarfile.ExtractError', ['tarfile.TarError']),
    HeaderError: excDef('HeaderError', 'tarfile.HeaderError', ['tarfile.TarError']),
    FilterError: excDef('FilterError', 'tarfile.FilterError', ['tarfile.TarError']),
    AbsolutePathError: excDef('AbsolutePathError', 'tarfile.AbsolutePathError', ['tarfile.FilterError']),
    AbsoluteLinkError: excDef('AbsoluteLinkError', 'tarfile.AbsoluteLinkError', ['tarfile.FilterError']),
    LinkOutsideDestinationError: excDef('LinkOutsideDestinationError', 'tarfile.LinkOutsideDestinationError', ['tarfile.FilterError']),
    OutsideDestinationError: excDef('OutsideDestinationError', 'tarfile.OutsideDestinationError', ['tarfile.FilterError']),
    SpecialFileError: excDef('SpecialFileError', 'tarfile.SpecialFileError', ['tarfile.FilterError']),
    LinkFallbackError: excDef('LinkFallbackError', 'tarfile.LinkFallbackError', ['tarfile.FilterError']),
  },
});
export { TarInfoDef };
