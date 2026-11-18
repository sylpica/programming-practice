/* 高度モード B7 G9（sys・環境データ系）：F-01 ケース（典型・境界・異常）と
 * リファレンス形状・F-04（supported 例題の機械照合）の検証。
 * 期待値は CPython 3.12.3 実走で確認した値。ただし sys.getrecursionlimit は
 * エンジン自身の事実（呼び出し深さ上限 40）であり CPython の 1000 ではない。
 * 環境依存値は実値化されていないこと（未確定値として返ること）も検証する。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { referenceAdvanced as ref_sys } from '../js/types/python/reference-advanced-sys.js';
import '../js/types/python/impl-advanced-sys.js';
import { referenceAdvanced as ref_errno } from '../js/types/python/reference-advanced-errno.js';
import '../js/types/python/impl-advanced-errno.js';
import { referenceAdvanced as ref_stat } from '../js/types/python/reference-advanced-stat.js';
import '../js/types/python/impl-advanced-stat.js';
import { referenceAdvanced as ref_locale } from '../js/types/python/reference-advanced-locale.js';
import '../js/types/python/impl-advanced-locale.js';
import { referenceAdvanced as ref_platform } from '../js/types/python/reference-advanced-platform.js';
import '../js/types/python/impl-advanced-platform.js';
import { referenceAdvanced as ref_sysconfig } from '../js/types/python/reference-advanced-sysconfig.js';
import '../js/types/python/impl-advanced-sysconfig.js';
import { referenceAdvanced as ref_site } from '../js/types/python/reference-advanced-site.js';
import '../js/types/python/impl-advanced-site.js';
import { referenceAdvanced as ref_gc } from '../js/types/python/reference-advanced-gc.js';
import '../js/types/python/impl-advanced-gc.js';
import { referenceAdvanced as ref_faulthandler } from '../js/types/python/reference-advanced-faulthandler.js';
import '../js/types/python/impl-advanced-faulthandler.js';
import { referenceAdvanced as ref_warnings } from '../js/types/python/reference-advanced-warnings.js';
import '../js/types/python/impl-advanced-warnings.js';

const ALL_REFS = [ref_sys, ref_errno, ref_stat, ref_locale, ref_platform, ref_sysconfig, ref_site, ref_gc, ref_faulthandler, ref_warnings];
const MODS = ["sys", "errno", "stat", "locale", "platform", "sysconfig", "site", "gc", "faulthandler", "warnings"];
const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

test('B7 G9: リファレンス全621件の形状・状態・一意性（契約第4章）', () => {
  const all = ALL_REFS.flat();
  assert.equal(all.length, 621);
  const names = new Set(all.map((i) => i.name));
  assert.equal(names.size, 621);
  const allowed = new Set(['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source']);
  const counts = { supported: 0, unsupported: 0, unverified: 0 };
  for (const item of all) {
    for (const k of Object.keys(item)) assert.ok(allowed.has(k), item.name + ' の余分なフィールド ' + k);
    assert.ok(['supported', 'unsupported', 'unverified'].includes(item.status), item.name);
    counts[item.status]++;
    assert.ok(item.description.length > 0 && item.syntax.length > 0 && item.example.length > 0, item.name);
    assert.ok(item.source.startsWith('https://docs.python.org/ja/3.15/library/'), item.name);
    if (item.status === 'unsupported') assert.ok(item.caution.includes('未対応です'), item.name);
    if (item.status === 'unverified') assert.ok(item.caution.includes('未検証'), item.name);
  }
  assert.deepEqual(counts, { supported: 64, unsupported: 67, unverified: 490 });
});

test('B7 G9: モジュール別件数', () => {
  const expected = { sys: 178, errno: 156, stat: 103, locale: 85, platform: 26, sysconfig: 15, site: 15, gc: 25, faulthandler: 9, warnings: 9 };
  MODS.forEach((m, i) => assert.equal(ALL_REFS[i].length, expected[m], m));
});

const SUPPORTED_EXAMPLES = {
 "stat.ST_ATIME": [
  "import stat\nprint(stat.ST_ATIME)",
  "7"
 ],
 "stat.ST_CTIME": [
  "import stat\nprint(stat.ST_CTIME)",
  "9"
 ],
 "stat.ST_DEV": [
  "import stat\nprint(stat.ST_DEV)",
  "2"
 ],
 "stat.ST_GID": [
  "import stat\nprint(stat.ST_GID)",
  "5"
 ],
 "stat.ST_INO": [
  "import stat\nprint(stat.ST_INO)",
  "1"
 ],
 "stat.ST_MODE": [
  "import stat\nprint(stat.ST_MODE)",
  "0"
 ],
 "stat.ST_MTIME": [
  "import stat\nprint(stat.ST_MTIME)",
  "8"
 ],
 "stat.ST_NLINK": [
  "import stat\nprint(stat.ST_NLINK)",
  "3"
 ],
 "stat.ST_SIZE": [
  "import stat\nprint(stat.ST_SIZE)",
  "6"
 ],
 "stat.ST_UID": [
  "import stat\nprint(stat.ST_UID)",
  "4"
 ],
 "stat.S_ENFMT": [
  "import stat\nprint(stat.S_ENFMT)",
  "1024"
 ],
 "stat.S_IEXEC": [
  "import stat\nprint(stat.S_IEXEC)",
  "64"
 ],
 "stat.S_IFBLK": [
  "import stat\nprint(stat.S_IFBLK)",
  "24576"
 ],
 "stat.S_IFCHR": [
  "import stat\nprint(stat.S_IFCHR)",
  "8192"
 ],
 "stat.S_IFDIR": [
  "import stat\nprint(stat.S_IFDIR)",
  "16384"
 ],
 "stat.S_IFIFO": [
  "import stat\nprint(stat.S_IFIFO)",
  "4096"
 ],
 "stat.S_IFLNK": [
  "import stat\nprint(stat.S_IFLNK)",
  "40960"
 ],
 "stat.S_IFREG": [
  "import stat\nprint(stat.S_IFREG)",
  "32768"
 ],
 "stat.S_IFSOCK": [
  "import stat\nprint(stat.S_IFSOCK)",
  "49152"
 ],
 "stat.S_IREAD": [
  "import stat\nprint(stat.S_IREAD)",
  "256"
 ],
 "stat.S_IRGRP": [
  "import stat\nprint(stat.S_IRGRP)",
  "32"
 ],
 "stat.S_IROTH": [
  "import stat\nprint(stat.S_IROTH)",
  "4"
 ],
 "stat.S_IRUSR": [
  "import stat\nprint(stat.S_IRUSR)",
  "256"
 ],
 "stat.S_IRWXG": [
  "import stat\nprint(stat.S_IRWXG)",
  "56"
 ],
 "stat.S_IRWXO": [
  "import stat\nprint(stat.S_IRWXO)",
  "7"
 ],
 "stat.S_IRWXU": [
  "import stat\nprint(stat.S_IRWXU)",
  "448"
 ],
 "stat.S_ISGID": [
  "import stat\nprint(stat.S_ISGID)",
  "1024"
 ],
 "stat.S_ISUID": [
  "import stat\nprint(stat.S_ISUID)",
  "2048"
 ],
 "stat.S_ISVTX": [
  "import stat\nprint(stat.S_ISVTX)",
  "512"
 ],
 "stat.S_IWGRP": [
  "import stat\nprint(stat.S_IWGRP)",
  "16"
 ],
 "stat.S_IWOTH": [
  "import stat\nprint(stat.S_IWOTH)",
  "2"
 ],
 "stat.S_IWRITE": [
  "import stat\nprint(stat.S_IWRITE)",
  "128"
 ],
 "stat.S_IWUSR": [
  "import stat\nprint(stat.S_IWUSR)",
  "128"
 ],
 "stat.S_IXGRP": [
  "import stat\nprint(stat.S_IXGRP)",
  "8"
 ],
 "stat.S_IXOTH": [
  "import stat\nprint(stat.S_IXOTH)",
  "1"
 ],
 "stat.S_IXUSR": [
  "import stat\nprint(stat.S_IXUSR)",
  "64"
 ],
 "stat.S_IFMT": [
  "import stat\nprint(stat.S_IFMT(33188))",
  "32768"
 ],
 "stat.S_IMODE": [
  "import stat\nprint(stat.S_IMODE(33188))",
  "420"
 ],
 "stat.S_ISDIR": [
  "import stat\nprint(stat.S_ISDIR(16877))",
  "True"
 ],
 "stat.S_ISREG": [
  "import stat\nprint(stat.S_ISREG(33188))",
  "True"
 ],
 "stat.S_ISLNK": [
  "import stat\nprint(stat.S_ISLNK(41471))",
  "True"
 ],
 "stat.S_ISCHR": [
  "import stat\nprint(stat.S_ISCHR(8685))",
  "True"
 ],
 "stat.S_ISBLK": [
  "import stat\nprint(stat.S_ISBLK(25069))",
  "True"
 ],
 "stat.S_ISFIFO": [
  "import stat\nprint(stat.S_ISFIFO(4589))",
  "True"
 ],
 "stat.S_ISSOCK": [
  "import stat\nprint(stat.S_ISSOCK(49663))",
  "True"
 ],
 "stat.filemode": [
  "import stat\nprint(stat.filemode(33188))",
  "-rw-r--r--"
 ],
 "sys.float_info": [
  "import sys\nprint(sys.float_info)",
  "sys.float_info(max=1.7976931348623157e+308, max_exp=1024, max_10_exp=308, min=2.2250738585072014e-308, min_exp=-1021, min_10_exp=-307, dig=15, mant_dig=53, epsilon=2.220446049250313e-16, radix=2, rounds=1)"
 ],
 "sys.float_info.max": [
  "import sys\nprint(sys.float_info.max)",
  "1.7976931348623157e+308"
 ],
 "sys.float_info.max_exp": [
  "import sys\nprint(sys.float_info.max_exp)",
  "1024"
 ],
 "sys.float_info.max_10_exp": [
  "import sys\nprint(sys.float_info.max_10_exp)",
  "308"
 ],
 "sys.float_info.min": [
  "import sys\nprint(sys.float_info.min)",
  "2.2250738585072014e-308"
 ],
 "sys.float_info.min_exp": [
  "import sys\nprint(sys.float_info.min_exp)",
  "-1021"
 ],
 "sys.float_info.min_10_exp": [
  "import sys\nprint(sys.float_info.min_10_exp)",
  "-307"
 ],
 "sys.float_info.dig": [
  "import sys\nprint(sys.float_info.dig)",
  "15"
 ],
 "sys.float_info.mant_dig": [
  "import sys\nprint(sys.float_info.mant_dig)",
  "53"
 ],
 "sys.float_info.epsilon": [
  "import sys\nprint(sys.float_info.epsilon)",
  "2.220446049250313e-16"
 ],
 "sys.float_info.radix": [
  "import sys\nprint(sys.float_info.radix)",
  "2"
 ],
 "sys.float_info.rounds": [
  "import sys\nprint(sys.float_info.rounds)",
  "1"
 ],
 "sys.maxunicode": [
  "import sys\nprint(sys.maxunicode)",
  "1114111"
 ],
 "sys.getrecursionlimit": [
  "import sys\nprint(sys.getrecursionlimit())",
  "40"
 ],
 "sys.exit": [
  "import sys\ntry:\n    sys.exit(3)\nexcept SystemExit:\n    print('exit')",
  "exit"
 ],
 "locale.Error": [
  "from locale import Error\ntry:\n    raise Error('x')\nexcept Exception:\n    print('caught')",
  "caught"
 ],
 "sysconfig.get_path_names": [
  "import sysconfig\nprint(sysconfig.get_path_names())",
  "('stdlib', 'platstdlib', 'purelib', 'platlib', 'include', 'scripts', 'data')"
 ],
 "warnings.formatwarning": [
  "import warnings\nprint(warnings.formatwarning('msg', UserWarning, 'f.py', 3) == 'f.py:3: UserWarning: msg\\n')",
  "True"
 ]
};
test('B7 G9: supported 64件の例題が期待出力と一致（F-04）', async () => {
  const supportedNames = ALL_REFS.flat().filter((i) => i.status === 'supported').map((i) => i.name);
  assert.equal(supportedNames.length, 64);
  for (const name of supportedNames) {
    const entry = SUPPORTED_EXAMPLES[name];
    assert.ok(entry, name + ' の期待値表がない');
    const [code, expected] = entry;
    const item = ALL_REFS.flat().find((i) => i.name === name);
    assert.equal(item.example, code, name + ' の example が期待値表と一致すること');
    const r = await run(code);
    assert.deepEqual(errs(r), [], name);
    assert.deepEqual(outs(r), [expected], name);
  }
});

const CASES = [
  // stat: ビット演算と filemode（CPython 3.12.3 実走値。引数は 8 進モードと同値の 10 進表記）
  ['import stat\nprint(stat.filemode(16877))', 'drwxr-xr-x'],
  ['import stat\nprint(stat.filemode(41471))', 'lrwxrwxrwx'],
  ['import stat\nprint(stat.filemode(0))', '?---------'],
  ['import stat\nprint(stat.filemode(511))', '?rwxrwxrwx'],
  ['import stat\nprint(stat.filemode(35309))', '-rwsr-xr-x'],
  ['import stat\nprint(stat.filemode(34285))', '-rwxr-sr-x'],
  ['import stat\nprint(stat.filemode(33773))', '-rwxr-xr-t'],
  ['import stat\nprint(stat.S_IMODE(35309))', '2541'],
  ['import stat\nprint(stat.S_ISREG(16877))', 'False'],
  ['import stat\nprint(stat.S_ISSOCK(49663))', 'True'],
  ['import stat\nprint(stat.S_ISFIFO(4589))', 'True'],
  ['import stat\nprint(stat.S_IRWXU + stat.S_IRWXG + stat.S_IRWXO)', '511'],
  // sys.float_info の構造（長さ・添字・反復・等価）
  ['import sys\nprint(len(sys.float_info))', '11'],
  ['import sys\nprint(sys.float_info[1])', '1024'],
  ['import sys\nprint(sys.float_info[-1])', '1'],
  ['import sys\nprint([x for x in sys.float_info][6])', '15'],
  ['import sys\nprint(sys.float_info == sys.float_info)', 'True'],
  ['import sys\nprint(sys.float_info.mant_dig)', '53'],
  // sys の実値化した項目
  ['import sys\nprint(sys.maxunicode)', '1114111'],
  ['from sys import float_info, maxunicode\nprint(float_info.dig + maxunicode)', '1114126'],
  // warnings.formatwarning（line あり・Warning インスタンス風メッセージ）
  ["import warnings\nprint(warnings.formatwarning('m', UserWarning, 'f.py', 1, 'x=1') == 'f.py:1: UserWarning: m\\n  x=1\\n')", 'True'],
  ["import warnings\nprint(warnings.formatwarning('m', DeprecationWarning, 'a.py', 9) == 'a.py:9: DeprecationWarning: m\\n')", 'True'],
  // locale.Error の対応付け（親クラスでも捕捉できる）
  ["from locale import Error\ntry:\n    raise Error('bad')\nexcept Error as e:\n    print('own', e)", 'own bad'],
  // sys.exit は SystemExit として捕捉でき、引数が str になる
  ["import sys\ntry:\n    sys.exit('bye')\nexcept SystemExit as e:\n    print('code', e)", 'code bye'],
];
for (const [code, expected] of CASES) {
  test('B7 G9 case: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), []);
    assert.deepEqual(outs(r), [expected]);
  });
}

const ERROR_CASES = [
  ['import stat\nprint(stat.S_IFMT(33188.0))', /TypeError/],
  ['import stat\nprint(stat.filemode("x"))', /TypeError/],
  ['import stat\nprint(stat.S_ISDIR())', /TypeError/],
  ['import sys\nsys.exit(3)', /SystemExit：3/],
  ['import gc\ngc.collect()', /未対応/],
  ['import gc\ngc.enable()', /未対応/],
  ['import faulthandler\nfaulthandler.enable()', /未対応/],
  ['import faulthandler\nprint(faulthandler.is_enabled())', /未対応/],
  ['import sys\nprint(sys.getsizeof([]))', /未対応/],
  ['import sys\nsys.settrace(None)', /未対応/],
  ['import site\nsite.addsitedir("x")', /未対応/],
  ['import sysconfig\nsysconfig.parse_config_h(None)', /未対応/],
  ['import warnings\nwarnings.catch_warnings()', /未対応/],
];
for (const [code, pattern] of ERROR_CASES) {
  test('B7 G9 error: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.ok(errs(r).length > 0, '正直に停止すること');
    assert.match(errs(r)[0], pattern);
  });
}

const UNK_CASES = [
  // 環境依存値は実値化されず「実行時に決まる値」として返る（捏造しないことの検証）
  'import sys\nprint(sys.argv)',
  'import sys\nprint(sys.version)',
  'import sys\nprint(sys.maxsize)',
  'import sys\nprint(sys.platform)',
  'import errno\nprint(errno.EPERM)',
  'import errno\nprint(errno.errorcode)',
  'import stat\nprint(stat.FILE_ATTRIBUTE_ARCHIVE)',
  'import locale\nprint(locale.LC_ALL)',
  'import gc\nprint(gc.get_count())',
  'import platform\nprint(platform.system())',
  'import sysconfig\nprint(sysconfig.get_platform())',
  'import site\nprint(site.USER_SITE)',
];
for (const code of UNK_CASES) {
  test('B7 G9 unverified-is-unknown: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), []);
    assert.equal(outs(r).length, 1);
    assert.ok(outs(r)[0].startsWith('実行時に決まる'), outs(r)[0]);
  });
}

test('B7 G9: 未登録名は AttributeError で名指し停止（実在しない名前を黙って通さない）', async () => {
  const r = await run('import stat\nprint(stat.NOSUCHNAME)');
  assert.match(errs(r)[0], /AttributeError/);
  const r2 = await run('from errno import NOSUCHNAME\nprint(1)');
  assert.match(errs(r2)[0], /ImportError/);
});

test('B7 G9: warnings.warn は未検証として注記され、後続は続く', async () => {
  const r = await run("import warnings\nwarnings.warn('x')\nprint('done')");
  assert.deepEqual(errs(r), []);
  assert.deepEqual(outs(r), ['done']);
});
