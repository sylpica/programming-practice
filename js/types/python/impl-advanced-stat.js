/* 高度モード B7 G9：stat モジュール。POSIX で定まるビット定数と ST_* インデックスを
 * 束ね値とし、S_IFMT／S_IMODE／S_IS*／filemode をビット演算で忠実に実装する。
 * Windows／BSD／Linux 拡張の定数値はプラットフォーム固有のため実値化しない。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, UNK } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);
function unsupportedFn(fname, reason) { return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname); }; }
function unverifiedFn(fname, reason) { return (ctx) => { ctx.diag(fname + '：' + reason + 'のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）'); }; }

function modeArg(ctx, v, fname) {
  if (ctx.isUnk(v)) { ctx.diag(fname + '：引数が未確定値のため結果を確定しません'); return null; }
  if (ctx.isNum(v) && v.f) { ctx.err('TypeError', fname + '() argument must be an integer, not float', ''); return null; }
  const n = ctx.int(v);
  if (n === null) { ctx.err('TypeError', fname + '() argument must be an integer, not ' + ctx.typeName(v), ''); return null; }
  return n;
}
function modeFn(fname, fn) {
  return (ctx, args, kwargs) => {
    if (Object.keys(kwargs || {}).length) ctx.err('TypeError', fname + '() takes no keyword arguments', '');
    if (args.length !== 1) ctx.err('TypeError', fname + '() takes exactly 1 argument', '');
    const m = modeArg(ctx, args[0], fname);
    if (m === null) return ctx.unk(fname + ' の結果');
    return fn(m);
  };
}
const S_IFMT_VAL = (m) => m & 0o170000;
function isType(v) { return modeFn('stat.S_IS*', (m) => BOOL(S_IFMT_VAL(m) === v)); }
function filemodeStr(m) {
  const types = [[0o140000, 's'], [0o120000, 'l'], [0o100000, '-'], [0o060000, 'b'], [0o040000, 'd'], [0o020000, 'c'], [0o010000, 'p']];
  let head = '?';
  for (const [v, c] of types) if (S_IFMT_VAL(m) === v) { head = c; break; }
  const bits = [0o400, 0o200, 0o100, 0o040, 0o020, 0o010, 0o004, 0o002, 0o001];
  const chars = bits.map((b, i) => (m & b) ? 'rwx'[i % 3] : '-');
  if (m & 0o4000) chars[2] = chars[2] === 'x' ? 's' : 'S';
  if (m & 0o2000) chars[5] = chars[5] === 'x' ? 's' : 'S';
  if (m & 0o1000) chars[8] = chars[8] === 'x' ? 't' : 'T';
  return head + chars.join('');
}
registerStdlibModule('stat', {
  constants: {
    S_IRUSR: I(256),
    S_IWUSR: I(128),
    S_IXUSR: I(64),
    S_IRWXU: I(448),
    S_IRGRP: I(32),
    S_IWGRP: I(16),
    S_IXGRP: I(8),
    S_IRWXG: I(56),
    S_IROTH: I(4),
    S_IWOTH: I(2),
    S_IXOTH: I(1),
    S_IRWXO: I(7),
    S_ISUID: I(2048),
    S_ISGID: I(1024),
    S_ISVTX: I(512),
    S_IREAD: I(256),
    S_IWRITE: I(128),
    S_IEXEC: I(64),
    S_ENFMT: I(1024),
    S_IFBLK: I(24576),
    S_IFCHR: I(8192),
    S_IFDIR: I(16384),
    S_IFIFO: I(4096),
    S_IFLNK: I(40960),
    S_IFREG: I(32768),
    S_IFSOCK: I(49152),
    ST_MODE: I(0),
    ST_INO: I(1),
    ST_DEV: I(2),
    ST_NLINK: I(3),
    ST_UID: I(4),
    ST_GID: I(5),
    ST_SIZE: I(6),
    ST_ATIME: I(7),
    ST_MTIME: I(8),
    ST_CTIME: I(9),
  },
  data: {
    "FILE_ATTRIBUTE_ARCHIVE": UNK('stat.FILE_ATTRIBUTE_ARCHIVE の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_COMPRESSED": UNK('stat.FILE_ATTRIBUTE_COMPRESSED の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_DEVICE": UNK('stat.FILE_ATTRIBUTE_DEVICE の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_DIRECTORY": UNK('stat.FILE_ATTRIBUTE_DIRECTORY の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_ENCRYPTED": UNK('stat.FILE_ATTRIBUTE_ENCRYPTED の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_HIDDEN": UNK('stat.FILE_ATTRIBUTE_HIDDEN の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_INTEGRITY_STREAM": UNK('stat.FILE_ATTRIBUTE_INTEGRITY_STREAM の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_NORMAL": UNK('stat.FILE_ATTRIBUTE_NORMAL の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_NOT_CONTENT_INDEXED": UNK('stat.FILE_ATTRIBUTE_NOT_CONTENT_INDEXED の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_NO_SCRUB_DATA": UNK('stat.FILE_ATTRIBUTE_NO_SCRUB_DATA の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_OFFLINE": UNK('stat.FILE_ATTRIBUTE_OFFLINE の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_READONLY": UNK('stat.FILE_ATTRIBUTE_READONLY の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_REPARSE_POINT": UNK('stat.FILE_ATTRIBUTE_REPARSE_POINT の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_SPARSE_FILE": UNK('stat.FILE_ATTRIBUTE_SPARSE_FILE の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_SYSTEM": UNK('stat.FILE_ATTRIBUTE_SYSTEM の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_TEMPORARY": UNK('stat.FILE_ATTRIBUTE_TEMPORARY の値（特定 OS 固有のため未検証）'),
    "FILE_ATTRIBUTE_VIRTUAL": UNK('stat.FILE_ATTRIBUTE_VIRTUAL の値（特定 OS 固有のため未検証）'),
    "IO_REPARSE_TAG_APPEXECLINK": UNK('stat.IO_REPARSE_TAG_APPEXECLINK の値（特定 OS 固有のため未検証）'),
    "IO_REPARSE_TAG_MOUNT_POINT": UNK('stat.IO_REPARSE_TAG_MOUNT_POINT の値（特定 OS 固有のため未検証）'),
    "IO_REPARSE_TAG_SYMLINK": UNK('stat.IO_REPARSE_TAG_SYMLINK の値（特定 OS 固有のため未検証）'),
    "SF_APPEND": UNK('stat.SF_APPEND の値（特定 OS 固有のため未検証）'),
    "SF_ARCHIVED": UNK('stat.SF_ARCHIVED の値（特定 OS 固有のため未検証）'),
    "SF_DATALESS": UNK('stat.SF_DATALESS の値（特定 OS 固有のため未検証）'),
    "SF_FIRMLINK": UNK('stat.SF_FIRMLINK の値（特定 OS 固有のため未検証）'),
    "SF_IMMUTABLE": UNK('stat.SF_IMMUTABLE の値（特定 OS 固有のため未検証）'),
    "SF_NOUNLINK": UNK('stat.SF_NOUNLINK の値（特定 OS 固有のため未検証）'),
    "SF_RESTRICTED": UNK('stat.SF_RESTRICTED の値（特定 OS 固有のため未検証）'),
    "SF_SETTABLE": UNK('stat.SF_SETTABLE の値（特定 OS 固有のため未検証）'),
    "SF_SNAPSHOT": UNK('stat.SF_SNAPSHOT の値（特定 OS 固有のため未検証）'),
    "SF_SUPPORTED": UNK('stat.SF_SUPPORTED の値（特定 OS 固有のため未検証）'),
    "SF_SYNTHETIC": UNK('stat.SF_SYNTHETIC の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_APPEND": UNK('stat.STATX_ATTR_APPEND の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_AUTOMOUNT": UNK('stat.STATX_ATTR_AUTOMOUNT の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_COMPRESSED": UNK('stat.STATX_ATTR_COMPRESSED の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_DAX": UNK('stat.STATX_ATTR_DAX の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_ENCRYPTED": UNK('stat.STATX_ATTR_ENCRYPTED の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_IMMUTABLE": UNK('stat.STATX_ATTR_IMMUTABLE の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_MOUNT_ROOT": UNK('stat.STATX_ATTR_MOUNT_ROOT の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_NODUMP": UNK('stat.STATX_ATTR_NODUMP の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_VERITY": UNK('stat.STATX_ATTR_VERITY の値（特定 OS 固有のため未検証）'),
    "STATX_ATTR_WRITE_ATOMIC": UNK('stat.STATX_ATTR_WRITE_ATOMIC の値（特定 OS 固有のため未検証）'),
    "S_IFDOOR": UNK('stat.S_IFDOOR の値（特定 OS 固有のため未検証）'),
    "S_IFPORT": UNK('stat.S_IFPORT の値（特定 OS 固有のため未検証）'),
    "S_IFWHT": UNK('stat.S_IFWHT の値（特定 OS 固有のため未検証）'),
    "UF_APPEND": UNK('stat.UF_APPEND の値（特定 OS 固有のため未検証）'),
    "UF_COMPRESSED": UNK('stat.UF_COMPRESSED の値（特定 OS 固有のため未検証）'),
    "UF_DATAVAULT": UNK('stat.UF_DATAVAULT の値（特定 OS 固有のため未検証）'),
    "UF_HIDDEN": UNK('stat.UF_HIDDEN の値（特定 OS 固有のため未検証）'),
    "UF_IMMUTABLE": UNK('stat.UF_IMMUTABLE の値（特定 OS 固有のため未検証）'),
    "UF_NODUMP": UNK('stat.UF_NODUMP の値（特定 OS 固有のため未検証）'),
    "UF_NOUNLINK": UNK('stat.UF_NOUNLINK の値（特定 OS 固有のため未検証）'),
    "UF_OPAQUE": UNK('stat.UF_OPAQUE の値（特定 OS 固有のため未検証）'),
    "UF_SETTABLE": UNK('stat.UF_SETTABLE の値（特定 OS 固有のため未検証）'),
    "UF_TRACKED": UNK('stat.UF_TRACKED の値（特定 OS 固有のため未検証）'),
  },
  functions: {
    S_IFMT: modeFn('stat.S_IFMT', (m) => I(S_IFMT_VAL(m))),
    S_IMODE: modeFn('stat.S_IMODE', (m) => I(m & 0o7777)),
    S_ISDIR: isType(0o040000),
    S_ISREG: isType(0o100000),
    S_ISLNK: isType(0o120000),
    S_ISCHR: isType(0o020000),
    S_ISBLK: isType(0o060000),
    S_ISFIFO: isType(0o010000),
    S_ISSOCK: isType(0o140000),
    filemode: modeFn('stat.filemode', (m) => filemodeStr(m)),
    S_ISDOOR: unverifiedFn('stat.S_ISDOOR', 'ドア型はプラットフォーム固有（Solaris 等）で、判定値を確定できない'),
    S_ISPORT: unverifiedFn('stat.S_ISPORT', 'ポート型はプラットフォーム固有で、判定値を確定できない'),
    S_ISWHT: unverifiedFn('stat.S_ISWHT', 'ホワイトアウト型はプラットフォーム固有（BSD 等）で、判定値を確定できない'),
  },
});
