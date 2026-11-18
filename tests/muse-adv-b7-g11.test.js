/* 高度モード B7 G11（アーカイブ・圧縮・永続化系）の検証。
 * 一次情報：公式ドキュメント 3.15 と CPython 3.12.3 実走（/usr/bin/python3）。
 * supported の example は全件、期待出力表と一致すること（F-04）。
 * 期待出力は CPython 3.12.3 でも同じ例題を実行して相互検証済み
 * （版差が既知の pickle.DEFAULT_PROTOCOL=5、wave.WAVE_FORMAT_IEEE_FLOAT、
 * compression.zstd の2件はドキュメント 3.15 を正とする）。 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/impl-advanced-zipfile.js';
import '../js/types/python/impl-advanced-tarfile.js';
import '../js/types/python/impl-advanced-zlib.js';
import '../js/types/python/impl-advanced-bz2.js';
import '../js/types/python/impl-advanced-lzma.js';
import '../js/types/python/impl-advanced-gzip.js';
import '../js/types/python/impl-advanced-wave.js';
import '../js/types/python/impl-advanced-marshal.js';
import '../js/types/python/impl-advanced-pickle.js';
import '../js/types/python/impl-advanced-io.js';
import '../js/types/python/impl-advanced-compression.zstd.js';
import '../js/types/python/impl-advanced-zipimport.js';
import '../js/types/python/impl-advanced-pkgutil.js';
import { referenceAdvanced as refZipfile } from '../js/types/python/reference-advanced-zipfile.js';
import { referenceAdvanced as refTarfile } from '../js/types/python/reference-advanced-tarfile.js';
import { referenceAdvanced as refZlib } from '../js/types/python/reference-advanced-zlib.js';
import { referenceAdvanced as refBz2 } from '../js/types/python/reference-advanced-bz2.js';
import { referenceAdvanced as refLzma } from '../js/types/python/reference-advanced-lzma.js';
import { referenceAdvanced as refGzip } from '../js/types/python/reference-advanced-gzip.js';
import { referenceAdvanced as refWave } from '../js/types/python/reference-advanced-wave.js';
import { referenceAdvanced as refMarshal } from '../js/types/python/reference-advanced-marshal.js';
import { referenceAdvanced as refPickle } from '../js/types/python/reference-advanced-pickle.js';
import { referenceAdvanced as refIo } from '../js/types/python/reference-advanced-io.js';
import { referenceAdvanced as refZstd } from '../js/types/python/reference-advanced-compression.zstd.js';
import { referenceAdvanced as refZipimport } from '../js/types/python/reference-advanced-zipimport.js';
import { referenceAdvanced as refPkgutil } from '../js/types/python/reference-advanced-pkgutil.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
const diags = (r) => (r.paths[0]?.trace || []).map((s) => s.text);

const MODULES = {
  zipfile: refZipfile, tarfile: refTarfile, zlib: refZlib, bz2: refBz2, lzma: refLzma,
  gzip: refGzip, wave: refWave, marshal: refMarshal, pickle: refPickle, io: refIo,
  'compression.zstd': refZstd, zipimport: refZipimport, pkgutil: refPkgutil,
};
const COUNTS = { zipfile: 64, tarfile: 84, zlib: 41, bz2: 21, lzma: 40, gzip: 9, wave: 39, marshal: 5, pickle: 23, io: 76, 'compression.zstd': 68, zipimport: 13, pkgutil: 8 };
const TALLY = { supported: 168, unsupported: 157, unverified: 166 };

test('G11: 全13モジュール491件が正規形で収載されている', () => {
  let total = 0;
  const tally = { supported: 0, unsupported: 0, unverified: 0 };
  for (const [mod, items] of Object.entries(MODULES)) {
    assert.equal(items.length, COUNTS[mod], mod + ' の件数');
    const names = new Set(items.map((i) => i.name));
    assert.equal(names.size, items.length, mod + ' の name 一意性');
    for (const it of items) {
      total++;
      tally[it.status]++;
      for (const k of ['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'source']) assert.ok(k in it, mod + ' ' + it.name + ' に ' + k);
      assert.ok(Object.keys(it).every((k) => ['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source'].includes(k)), it.name + ' の追加フィールド');
      assert.equal(it.category, '標準ライブラリ', it.name);
      assert.ok(it.source.startsWith('https://docs.python.org/ja/3.15/library/'), it.name + ' の source');
      if (it.status === 'unsupported') assert.ok(it.caution.startsWith('本アプリの高度モードでは未対応です'), it.name + ' の未対応 caution');
      if (it.status === 'unverified') assert.ok(it.caution.includes('未検証'), it.name + ' の未検証 caution');
    }
  }
  assert.equal(total, 491);
  assert.deepEqual(tally, TALLY);
});

const EXPECTED = {
 "zipfile.BadZipFile": "caught",
 "zipfile.BadZipfile": "caught",
 "zipfile.LargeZipFile": "caught",
 "zipfile.ZIP_BZIP2": "12",
 "zipfile.ZIP_DEFLATED": "8",
 "zipfile.ZIP_LZMA": "14",
 "zipfile.ZIP_STORED": "0",
 "zipfile.ZIP_ZSTANDARD": "93",
 "zipfile.ZipInfo": "a/b.txt",
 "zipfile.ZipInfo.compress_size": "0",
 "zipfile.ZipInfo.compress_type": "0",
 "zipfile.ZipInfo.create_version": "20",
 "zipfile.ZipInfo.date_time": "(2024, 1, 2, 3, 4, 5)",
 "zipfile.ZipInfo.external_attr": "0",
 "zipfile.ZipInfo.extract_version": "20",
 "zipfile.ZipInfo.file_size": "0",
 "zipfile.ZipInfo.filename": "a/b.txt",
 "zipfile.ZipInfo.flag_bits": "0",
 "zipfile.ZipInfo.internal_attr": "0",
 "zipfile.ZipInfo.is_dir": "True",
 "zipfile.ZipInfo.reserved": "0",
 "zipfile.ZipInfo.volume": "0",
 "tarfile.AbsoluteLinkError": "caught",
 "tarfile.AbsolutePathError": "caught",
 "tarfile.CompressionError": "caught",
 "tarfile.DEFAULT_FORMAT": "2",
 "tarfile.ExtractError": "caught",
 "tarfile.FilterError": "caught",
 "tarfile.GNU_FORMAT": "1",
 "tarfile.HeaderError": "caught",
 "tarfile.LinkFallbackError": "caught",
 "tarfile.LinkOutsideDestinationError": "caught",
 "tarfile.OutsideDestinationError": "caught",
 "tarfile.PAX_FORMAT": "2",
 "tarfile.ReadError": "caught",
 "tarfile.SpecialFileError": "caught",
 "tarfile.StreamError": "caught",
 "tarfile.TarError": "caught",
 "tarfile.TarInfo": "a/b.txt",
 "tarfile.TarInfo.chksum": "0",
 "tarfile.TarInfo.devmajor": "0",
 "tarfile.TarInfo.devminor": "0",
 "tarfile.TarInfo.gid": "0",
 "tarfile.TarInfo.gname": "",
 "tarfile.TarInfo.isblk": "False",
 "tarfile.TarInfo.ischr": "False",
 "tarfile.TarInfo.isdev": "False",
 "tarfile.TarInfo.isdir": "False",
 "tarfile.TarInfo.isfifo": "False",
 "tarfile.TarInfo.isfile": "True",
 "tarfile.TarInfo.islnk": "False",
 "tarfile.TarInfo.isreg": "True",
 "tarfile.TarInfo.issym": "False",
 "tarfile.TarInfo.linkname": "",
 "tarfile.TarInfo.mode": "420",
 "tarfile.TarInfo.mtime": "0",
 "tarfile.TarInfo.name": "a/b.txt",
 "tarfile.TarInfo.offset": "0",
 "tarfile.TarInfo.offset_data": "0",
 "tarfile.TarInfo.pax_headers": "{}",
 "tarfile.TarInfo.replace": "x.txt",
 "tarfile.TarInfo.size": "0",
 "tarfile.TarInfo.sparse": "None",
 "tarfile.TarInfo.uid": "0",
 "tarfile.TarInfo.uname": "",
 "tarfile.USTAR_FORMAT": "0",
 "tarfile.data_filter": "etc/passwd",
 "tarfile.fully_trusted_filter": "/etc/passwd",
 "tarfile.tar_filter": "etc/passwd",
 "zlib.DEFLATED": "8",
 "zlib.DEF_BUF_SIZE": "16384",
 "zlib.DEF_MEM_LEVEL": "8",
 "zlib.MAX_WBITS": "15",
 "zlib.Z_BEST_COMPRESSION": "9",
 "zlib.Z_BEST_SPEED": "1",
 "zlib.Z_BLOCK": "5",
 "zlib.Z_DEFAULT_COMPRESSION": "-1",
 "zlib.Z_DEFAULT_STRATEGY": "0",
 "zlib.Z_FILTERED": "1",
 "zlib.Z_FINISH": "4",
 "zlib.Z_FIXED": "4",
 "zlib.Z_FULL_FLUSH": "3",
 "zlib.Z_HUFFMAN_ONLY": "2",
 "zlib.Z_NO_COMPRESSION": "0",
 "zlib.Z_NO_FLUSH": "0",
 "zlib.Z_PARTIAL_FLUSH": "1",
 "zlib.Z_RLE": "3",
 "zlib.Z_SYNC_FLUSH": "2",
 "zlib.Z_TREES": "6",
 "zlib.error": "caught",
 "lzma.CHECK_CRC32": "1",
 "lzma.CHECK_CRC64": "4",
 "lzma.CHECK_ID_MAX": "15",
 "lzma.CHECK_NONE": "0",
 "lzma.CHECK_SHA256": "10",
 "lzma.CHECK_UNKNOWN": "16",
 "lzma.FILTER_DELTA": "3",
 "lzma.FILTER_LZMA2": "33",
 "lzma.FORMAT_ALONE": "2",
 "lzma.FORMAT_AUTO": "0",
 "lzma.FORMAT_RAW": "3",
 "lzma.FORMAT_XZ": "1",
 "lzma.LZMAError": "caught",
 "lzma.MF_BT2": "18",
 "lzma.MF_BT3": "19",
 "lzma.MF_BT4": "20",
 "lzma.MF_HC3": "3",
 "lzma.MF_HC4": "4",
 "lzma.MODE_FAST": "1",
 "lzma.MODE_NORMAL": "2",
 "lzma.PRESET_DEFAULT": "6",
 "lzma.PRESET_EXTREME": "2147483648",
 "gzip.BadGzipFile": "caught",
 "wave.Error": "caught",
 "wave.WAVE_FORMAT_EXTENSIBLE": "65534",
 "wave.WAVE_FORMAT_IEEE_FLOAT": "3",
 "wave.WAVE_FORMAT_PCM": "1",
 "marshal.version": "4",
 "pickle.DEFAULT_PROTOCOL": "5",
 "pickle.HIGHEST_PROTOCOL": "5",
 "pickle.PickleError": "caught",
 "pickle.PicklingError": "caught",
 "pickle.UnpicklingError": "caught",
 "io.BlockingIOError": "caught",
 "io.BufferedIOBase": "False",
 "io.BufferedIOBase.detach": "unsupported",
 "io.BufferedIOBase.raw": "attr-error",
 "io.BufferedIOBase.read": "unsupported",
 "io.BufferedIOBase.read1": "unsupported",
 "io.BufferedIOBase.readinto": "unsupported",
 "io.BufferedIOBase.readinto1": "unsupported",
 "io.BufferedIOBase.write": "unsupported",
 "io.DEFAULT_BUFFER_SIZE": "8192",
 "io.IOBase": "False",
 "io.IOBase.close": "True",
 "io.IOBase.closed": "False",
 "io.IOBase.fileno": "unsupported",
 "io.IOBase.flush": "ok",
 "io.IOBase.isatty": "False",
 "io.IOBase.readable": "False",
 "io.IOBase.readline": "attr-error",
 "io.IOBase.readlines": "attr-error",
 "io.IOBase.seek": "unsupported",
 "io.IOBase.seekable": "False",
 "io.IOBase.tell": "unsupported",
 "io.IOBase.truncate": "unsupported",
 "io.IOBase.writable": "False",
 "io.IOBase.writelines": "ok",
 "io.RawIOBase": "False",
 "io.RawIOBase.read": "not-implemented",
 "io.RawIOBase.readall": "not-implemented",
 "io.RawIOBase.readinto": "not-implemented",
 "io.RawIOBase.write": "not-implemented",
 "io.StringIO": "ab",
 "io.StringIO.getvalue": "xy",
 "io.TextIOBase": "None",
 "io.TextIOBase.buffer": "attr-error",
 "io.TextIOBase.detach": "unsupported",
 "io.TextIOBase.encoding": "None",
 "io.TextIOBase.errors": "None",
 "io.TextIOBase.newlines": "None",
 "io.TextIOBase.read": "unsupported",
 "io.TextIOBase.readline": "unsupported",
 "io.TextIOBase.seek": "unsupported",
 "io.TextIOBase.tell": "unsupported",
 "io.TextIOBase.write": "unsupported",
 "io.UnsupportedOperation": "caught",
 "compression.zstd.COMPRESSION_LEVEL_DEFAULT": "3",
 "compression.zstd.ZstdError": "caught",
 "zipimport.ZipImportError": "caught"
};

test('G11 F-04: supported の example が全件、期待出力と一致する', async () => {
  for (const items of Object.values(MODULES)) {
    for (const it of items) {
      if (it.status !== 'supported') continue;
      const r = await run(it.example);
      assert.deepEqual(errs(r), [], it.name + ' の example でエラー');
      assert.equal(outs(r).join('\n'), EXPECTED[it.name], it.name + ' の example 出力');
    }
  }
});

test('G11: 例外の親子捕捉（階層の対応付け）', async () => {
  const cases = [
    ['from tarfile import ReadError\nimport tarfile\ntry:\n    raise ReadError("x")\nexcept tarfile.TarError:\n    print("parent")', 'parent'],
    ['from tarfile import AbsolutePathError, TarInfo\ntry:\n    raise AbsolutePathError(TarInfo("n"))\nexcept Exception:\n    print("exc")', 'exc'],
    ['from io import UnsupportedOperation\ntry:\n    raise UnsupportedOperation("x")\nexcept ValueError:\n    print("value")', 'value'],
    ['from io import UnsupportedOperation\ntry:\n    raise UnsupportedOperation("x")\nexcept OSError:\n    print("os")', 'os'],
    ['from gzip import BadGzipFile\ntry:\n    raise BadGzipFile("x")\nexcept OSError:\n    print("os")', 'os'],
    ['from zipimport import ZipImportError\ntry:\n    raise ZipImportError("x")\nexcept ImportError:\n    print("imp")', 'imp'],
    ['from pickle import UnpicklingError\ntry:\n    raise UnpicklingError("x")\nexcept Exception:\n    print("exc")', 'exc'],
    ['from io import BlockingIOError\ntry:\n    raise BlockingIOError("x")\nexcept OSError:\n    print("os")', 'os'],
  ];
  // tarfile の FilterError 系は引数に TarInfo を取る形があるため、親捕捉は Exception で確認する項目を含む
  for (const [code, want] of cases) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), [want], code);
  }
});

test('G11: StringIO の改行変換・シーク・truncate・閉鎖後（CPython 3.12.3 実測と一致）', async () => {
  const cases = [
    ['from io import StringIO\ns = StringIO("a\\r\\nb\\rc", newline=None)\nprint(repr(s.read()))', "'a\\nb\\nc'"],
    ['from io import StringIO\ns = StringIO(newline="\\r")\ns.write("a\\nb")\nprint(repr(s.getvalue()))', "'a\\rb'"],
    ['from io import StringIO\ns = StringIO("ab")\ns.seek(5)\ns.write("c")\nprint(repr(s.getvalue()))', "'ab\\x00\\x00\\x00c'"],
    ['from io import StringIO\ns = StringIO("abc")\nprint(s.truncate(10))', '10'],
    ['from io import StringIO\ns = StringIO("abc")\ns.truncate(10)\nprint(repr(s.getvalue()))', "'abc'"],
    ['from io import StringIO\ntry:\n    StringIO("ab").seek(1, 1)\nexcept OSError as e:\n    print(e)', "Can't do nonzero cur-relative seeks"],
    ['from io import StringIO\ns = StringIO("ab")\ns.close()\ntry:\n    s.getvalue()\nexcept ValueError as e:\n    print(str(e))', 'I/O operation on closed file'],
    ['from io import StringIO\ns = StringIO("ab\\ncd")\nprint(repr(s.readline()))', "'ab\\n'"],
    ['from io import StringIO\ns = StringIO()\nprint(s.write("xy"))', '2'],
  ];
  for (const [code, want] of cases) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), [want], code);
  }
});

test('G11: IOBase 群の閉鎖後の振る舞い（CPython 3.12.3 実測と一致）', async () => {
  const cases = [
    ['from io import IOBase\nf = IOBase()\nf.close()\ntry:\n    f.flush()\nexcept ValueError as e:\n    print(str(e))', 'I/O operation on closed file.'],
    ['from io import IOBase\nf = IOBase()\nf.close()\nprint(f.readable())', 'False'],
    ['from io import IOBase\nf = IOBase()\ntry:\n    f.writelines(["x"])\nexcept AttributeError:\n    print("attr")', 'attr'],
    ['from io import IOBase\nf = IOBase()\nf.close()\nf.close()\nprint(f.closed)', 'True'],
  ];
  for (const [code, want] of cases) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), [want], code);
  }
});

test('G11: TarInfo.replace のキー検証と抽出フィルタ（CPython ソース・実測と一致）', async () => {
  const cases = [
    ['from tarfile import TarInfo\nt = TarInfo("a.txt")\ntry:\n    t.replace(size=3)\nexcept TypeError:\n    print("type")', 'type'],
    ['import tarfile\nt = tarfile.TarInfo("a.sh")\nt2 = t.replace(mode=0o777)\nprint(tarfile.data_filter(t2, "/d").mode)', '493'],
    ['import tarfile\nt = tarfile.TarInfo("a.txt")\nprint(tarfile.data_filter(t, "/d").mode)', '420'],
    ['import tarfile\nt = tarfile.TarInfo("a.txt")\nprint(tarfile.data_filter(t, "/d").uid)', 'None'],
    ['import tarfile\nt = tarfile.TarInfo("../evil")\ntry:\n    tarfile.data_filter(t, "/dest")\nexcept tarfile.OutsideDestinationError:\n    print("outside")', 'outside'],
    // fully_trusted は同一オブジェクトを返す（変更なし）。エンジンは native 同士の is 比較を
    // 確定できないため、絶対パスがそのまま保持されることで「無変更」を確認する
    ['import tarfile\nt = tarfile.TarInfo("/etc/passwd")\nout = tarfile.fully_trusted_filter(t, "/d")\nprint(out.name)', '/etc/passwd'],
  ];
  for (const [code, want] of cases) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), [want], code);
  }
});

test('G11: ZipInfo の日付検証と repr（CPython 3.12.3 実測と一致）', async () => {
  const cases = [
    ['from zipfile import ZipInfo\nprint(ZipInfo("a.txt"))', "<ZipInfo filename='a.txt' file_size=0>"],
    ['from zipfile import ZipInfo\ntry:\n    ZipInfo("a.txt", (1979, 1, 1, 0, 0, 0))\nexcept ValueError:\n    print("value")', 'value'],
    ['from zipfile import ZipInfo\nz = ZipInfo("a.txt", (2108, 1, 1, 0, 0, 0))\nprint(z.date_time)', '(2108, 1, 1, 0, 0, 0)'],
    ['from zipfile import ZipInfo\nprint(ZipInfo("a.txt").is_dir())', 'False'],
  ];
  for (const [code, want] of cases) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), [want], code);
  }
});

test('G11: 未対応は「未対応」エラーで正直に止まる', async () => {
  const cases = [
    'import zipfile\nz = zipfile.ZipFile("a.zip")',
    'import tarfile\nt = tarfile.open("a.tar")',
    'import io\nf = io.open("a.txt")',
    'import zipfile\nprint(zipfile.is_zipfile("a.zip"))',
    'import gzip\ng = gzip.GzipFile("a.gz", "wb")',
    'import wave\nw = wave.open("a.wav")',
    'import pkgutil\nprint(pkgutil.get_importer("/x"))',
  ];
  for (const code of cases) {
    const r = await run(code);
    assert.ok(errs(r).some((m) => m.startsWith('未対応：')), code + ' → ' + JSON.stringify(errs(r)));
  }
});

test('G11: 未検証は diag＋UNK で正直に止まる（捏造しない）', async () => {
  const cases = [
    'import zlib\nprint(zlib.crc32(b"abc"))',
    'import zlib\nprint(zlib.ZLIB_VERSION)',
    'import lzma\nprint(lzma.FILTER_LZMA1)',
    'import tarfile\nprint(tarfile.REGTYPE)',
    'import io\nprint(io.BytesIO(b"abc"))',
    'import marshal\nprint(marshal.dumps([1, 2]))',
    'import pickle\nprint(pickle.dumps([1, 2]))',
  ];
  for (const code of cases) {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.ok(outs(r).join('').includes('実行時に決まる'), code + ' → ' + JSON.stringify(outs(r)));
    assert.ok(diags(r).some((m) => m.includes('未検証')), code + ' の diag');
  }
});

test('G11: zlib の bytes-like でない入力は CPython どおり TypeError', async () => {
  const r = await run('import zlib\nprint(zlib.crc32("abc"))');
  assert.ok(errs(r).some((m) => m.startsWith('TypeError：a bytes-like object is required')), JSON.stringify(errs(r)));
  const r2 = await run('import zlib\nprint(zlib.adler32([97, 98]))');
  assert.ok(errs(r2).some((m) => m.startsWith('TypeError：a bytes-like object is required')), JSON.stringify(errs(r2)));
});

test('G11: io.text_encoding は文字列引数をそのまま返し、None は未検証に倒す', async () => {
  const r = await run('import io\nprint(io.text_encoding("utf-8"))');
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['utf-8']);
  const r2 = await run('import io\nprint(io.text_encoding(None))');
  assert.deepEqual(errs(r2), []);
  assert.ok(outs(r2).join('').includes('実行時に決まる'));
});
