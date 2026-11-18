/* 高度モード B7 G11：zipfile モジュール（64件）。
 * 一次情報：公式ドキュメント 3.15（library/zipfile）と CPython 3.12.3 実走。
 *
 * 裁定の要点：
 * - ZipInfo はメタデータクラスとして実値実装（属性・is_dir()・repr）。
 *   comment／extra は bytes 値のため未検証、create_system は
 *   プラットフォーム依存（Windows 0／Unix 3）のため未検証、
 *   CRC／header_offset はアーカイブ読み取り時に設定される属性で
 *   版により生成直後の有無が確定しないため未検証（本実装では
 *   3.12 実走どおり属性を持たない）。
 * - ZipFile／PyZipFile／Path と is_zipfile はアーカイブ実体・実ファイル
 *   前提で未対応。圧縮方式定数と例外は対応。
 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { BOOL, NONE, TUPLE, I, unsupportedFn, unsupportedClass, excDef, bytesUnk } from './impl-advanced-g11-common.js';

const COMPRESSOR_NAMES = { 8: 'deflate', 12: 'bzip2', 14: 'lzma', 93: 'zstd' };
function filemodeStr(mode) {
  const typeChars = { 0o100000: '-', 0o040000: 'd', 0o120000: 'l', 0o010000: 'p', 0o140000: 's', 0o020000: 'c', 0o060000: 'b' };
  let out = typeChars[mode & 0o170000] || '?';
  const bits = [[0o400, 'r'], [0o200, 'w'], [0o100, 'x'], [0o040, 'r'], [0o020, 'w'], [0o010, 'x'], [0o004, 'r'], [0o002, 'w'], [0o001, 'x']];
  const chars = bits.map(([b, c]) => (mode & b) ? c : '-');
  if (mode & 0o4000) chars[2] = chars[2] === 'x' ? 's' : 'S';
  if (mode & 0o2000) chars[5] = chars[5] === 'x' ? 's' : 'S';
  if (mode & 0o1000) chars[8] = chars[8] === 'x' ? 't' : 'T';
  return out + chars.join('');
}
const ZipInfoDef = {
  typeName: 'ZipInfo',
  construct: (ctx, args, kwargs) => {
    if (args.length > 2) ctx.err('TypeError', 'ZipInfo() の引数が多すぎます', '');
    let filename = 'NoName';
    let dateTime = null;
    if (args.length >= 1) {
      if (typeof args[0] === 'string') filename = args[0];
      else if (ctx.isUnk(args[0])) return ctx.unk('ZipInfo（未検証）');
      else ctx.err('TypeError', 'ZipInfo() のファイル名には文字列を使ってください', '');
    }
    if (args.length >= 2) dateTime = args[1];
    if (kwargs && 'filename' in kwargs) {
      if (typeof kwargs.filename === 'string') filename = kwargs.filename;
      else ctx.err('TypeError', 'ZipInfo() のファイル名には文字列を使ってください', '');
    }
    if (kwargs && 'date_time' in kwargs) dateTime = kwargs.date_time;
    let dtVals;
    if (dateTime === null || dateTime === undefined) {
      dtVals = [1980, 1, 1, 0, 0, 0].map((n) => I(n));
    } else {
      const items = ctx.iterable(dateTime);
      if (items === null) { if (ctx.isUnk(dateTime)) return ctx.unk('ZipInfo（未検証）'); ctx.err('TypeError', 'date_time には6要素のタプルを使ってください', ''); }
      if (!items.length) ctx.err('IndexError', 'tuple index out of range', '');
      const y = ctx.int(items[0]);
      if (y === null) ctx.err('TypeError', 'date_time の要素には整数を使ってください', '');
      if (y < 1980) ctx.err('ValueError', 'ZIP does not support timestamps before 1980', '');
      dtVals = items.map((v) => { const n = ctx.int(v); return n === null ? v : I(n); });
    }
    return ctx.native('zipfile.ZipInfo', {
      filename, date_time: TUPLE(dtVals), compress_type: 0,
      compress_size: I(0), file_size: I(0), external_attr: I(0), internal_attr: I(0),
      create_version: I(20), extract_version: I(20), reserved: I(0), volume: I(0), flag_bits: I(0),
    });
  },
  methods: {
    is_dir: (ctx, self) => BOOL(self.data.filename.endsWith('/')),
    _for_archive: (ctx, self) => {
      ctx.diag('未検証：zipfile.ZipInfo._for_archive() は対象アーカイブ（ZipFile）の設定に依存するため、この説明では値を確定できません');
      return ctx.unk('ZipInfo（未検証）');
    },
    from_file: (ctx) => ctx.err('未対応', 'zipfile.ZipInfo.from_file() は実ファイルの情報を必要とするため、本アプリの高度モードでは未対応です', ''),
  },
  classMethods: {
    from_file: (ctx) => ctx.err('未対応', 'zipfile.ZipInfo.from_file() は実ファイルの情報を必要とするため、本アプリの高度モードでは未対応です', ''),
  },
  attrs: {
    filename: (ctx, self) => self.data.filename,
    date_time: (ctx, self) => self.data.date_time,
    compress_type: (ctx, self) => I(self.data.compress_type),
    compress_size: (ctx, self) => self.data.compress_size,
    file_size: (ctx, self) => self.data.file_size,
    external_attr: (ctx, self) => self.data.external_attr,
    internal_attr: (ctx, self) => self.data.internal_attr,
    create_version: (ctx, self) => self.data.create_version,
    extract_version: (ctx, self) => self.data.extract_version,
    reserved: (ctx, self) => self.data.reserved,
    volume: (ctx, self) => self.data.volume,
    flag_bits: (ctx, self) => self.data.flag_bits,
    comment: (ctx, self) => bytesUnk(),
    extra: (ctx, self) => bytesUnk(),
    create_system: (ctx) => ctx.unk('作成システム（プラットフォーム依存）'),
  },
  repr: (ctx, self) => {
    const d = self.data;
    const fs = ctx.num(d.file_size) || 0;
    const cs = ctx.num(d.compress_size) || 0;
    const ea = ctx.num(d.external_attr) || 0;
    const isdir = d.filename.endsWith('/');
    let out = '<ZipInfo filename=' + ctx.repr(d.filename);
    if (d.compress_type !== 0) out += ' compress_type=' + (COMPRESSOR_NAMES[d.compress_type] || String(d.compress_type));
    const hi = ea >> 16, lo = ea & 0xffff;
    if (hi) out += ' filemode=' + ctx.repr(filemodeStr(hi));
    if (lo) out += ' external_attr=0x' + lo.toString(16);
    if (!isdir || fs) out += ' file_size=' + fs;
    if ((!isdir || cs) && (d.compress_type !== 0 || fs !== cs)) out += ' compress_size=' + cs;
    return out + '>';
  },
};

registerStdlibModule('zipfile', {
  data: {
    ZIP_STORED: I(0), ZIP_DEFLATED: I(8), ZIP_BZIP2: I(12), ZIP_LZMA: I(14), ZIP_ZSTANDARD: I(93),
  },
  functions: {
    is_zipfile: unsupportedFn('zipfile.is_zipfile()', 'ファイルの内容検査が必要で、エンジンに実ファイルシステムが無い'),
  },
  classes: {
    ZipInfo: ZipInfoDef,
    ZipFile: unsupportedClass('ZipFile', 'zipfile.ZipFile', 'アーカイブ実体（ファイルまたはファイル風オブジェクト）を必要とし、エンジンに実ファイルシステムが無い'),
    PyZipFile: unsupportedClass('PyZipFile', 'zipfile.PyZipFile', 'アーカイブ実体と Python ソースファイルを必要とし、エンジンに実ファイルシステムが無い'),
    Path: unsupportedClass('Path', 'zipfile.Path', 'ルートとなるアーカイブ実体を必要とし、エンジンに実ファイルシステムが無い'),
    BadZipFile: excDef('BadZipFile', 'zipfile.BadZipFile', ['Exception']),
    BadZipfile: excDef('BadZipfile', 'zipfile.BadZipFile', ['Exception']),
    LargeZipFile: excDef('LargeZipFile', 'zipfile.LargeZipFile', ['Exception']),
  },
});
