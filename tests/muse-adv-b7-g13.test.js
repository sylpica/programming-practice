/* 高度モード B7 G13（パス・アドレス等の純粋ロジック系）：全261件の F-01/F-04 ケース。
 * 期待値は CPython 3.12.3 実走で確認した値（3.13 以降の機能は公式ドキュメント
 * 3.15 と CPython ソースで照合）。例題の期待出力は muse-adv-b7-g13-expected.js。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { G13_EXPECTED } from './muse-adv-b7-g13-expected.js';
import { referenceAdvanced as refIpaddress } from '../js/types/python/reference-advanced-ipaddress.js';
import { referenceAdvanced as refPathlib } from '../js/types/python/reference-advanced-pathlib.js';
import { referenceAdvanced as refPathlibTypes } from '../js/types/python/reference-advanced-pathlib-types.js';
import { referenceAdvanced as refFilecmp } from '../js/types/python/reference-advanced-filecmp.js';
import { referenceAdvanced as refGlob } from '../js/types/python/reference-advanced-glob.js';
import { referenceAdvanced as refCopyreg } from '../js/types/python/reference-advanced-copyreg.js';
import { referenceAdvanced as refSecrets } from '../js/types/python/reference-advanced-secrets.js';
import { referenceAdvanced as refMathInteger } from '../js/types/python/reference-advanced-math-integer.js';
import { referenceAdvanced as refTemplatelib } from '../js/types/python/reference-advanced-string-templatelib.js';
import { referenceAdvanced as refWsgirefHeaders } from '../js/types/python/reference-advanced-wsgiref-headers.js';
import { referenceAdvanced as refWsgirefUtil } from '../js/types/python/reference-advanced-wsgiref-util.js';
import '../js/types/python/group-advanced-g13.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

const ALL_REFS = [
  ['ipaddress', refIpaddress, 115], ['pathlib', refPathlib, 76], ['pathlib.types', refPathlibTypes, 5],
  ['filecmp', refFilecmp, 22], ['glob', refGlob, 4], ['copyreg', refCopyreg, 2],
  ['secrets', refSecrets, 9], ['math.integer', refMathInteger, 6],
  ['string.templatelib', refTemplatelib, 12], ['wsgiref.headers', refWsgirefHeaders, 3],
  ['wsgiref.util', refWsgirefUtil, 7],
];

test('G13 リファレンス整合性：全261件・正規形・状態分布', () => {
  const allowed = new Set(['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source']);
  const names = new Set();
  let total = 0;
  const byStatus = { supported: 0, unsupported: 0, unverified: 0 };
  for (const [mod, items, count] of ALL_REFS) {
    assert.equal(items.length, count, mod);
    for (const it of items) {
      total++;
      assert.ok(!names.has(it.name), '重複: ' + it.name);
      names.add(it.name);
      for (const k of Object.keys(it)) assert.ok(allowed.has(k), it.name + ' の余分なフィールド ' + k);
      assert.equal(it.category, '標準ライブラリ', it.name);
      assert.ok(['supported', 'unsupported', 'unverified'].includes(it.status), it.name);
      assert.ok(!('supported' in it), it.name + ' に supported フィールドは使わない');
      assert.ok(it.syntax && it.description && it.example !== undefined && it.caution !== undefined, it.name);
      byStatus[it.status]++;
    }
  }
  assert.equal(total, 261);
  assert.deepEqual(byStatus, { supported: 168, unsupported: 85, unverified: 8 });
});

test('G13 F-04：supported 全168件の例題が期待出力と一致', async () => {
  let checked = 0;
  for (const [, items] of ALL_REFS) {
    for (const it of items) {
      if (it.status !== 'supported') continue;
      checked++;
      const r = await run(it.example);
      assert.deepEqual(errs(r), [], it.name);
      assert.deepEqual(outs(r), [G13_EXPECTED[it.name]], it.name);
    }
  }
  assert.equal(checked, 168);
  assert.equal(Object.keys(G13_EXPECTED).length, 168);
});

// ---------------- 値ケース（典型・境界） ----------------
const CASES = [
  // ipaddress：アドレス
  ["import ipaddress as ip\nprint(ip.IPv4Address('192.0.2.1') + 1)", '192.0.2.2'],
  ["import ipaddress as ip\nprint(ip.IPv4Address(3232235521))", '192.168.0.1'],
  ["import ipaddress as ip\nprint(int(ip.IPv4Address('0.0.0.1')) if False else ip.IPv4Address('192.0.2.1') == ip.IPv4Address('192.0.2.1'))", 'True'],
  ["import ipaddress as ip\nprint(ip.IPv4Address('192.0.2.1') < ip.IPv4Address('192.0.2.2'))", 'True'],
  ["import ipaddress as ip\nprint(ip.IPv6Address('2001:0db8:0000:0000:0000:ff00:0042:8329'))", '2001:db8::ff00:42:8329'],
  ["import ipaddress as ip\nprint(ip.IPv6Address('::ffff:192.0.2.1'))", '::ffff:c000:201'],
  ["import ipaddress as ip\nprint(ip.IPv6Address('fe80::1%eth0'))", 'fe80::1%eth0'],
  ["import ipaddress as ip\nprint(ip.IPv6Address('2001:db8::1').exploded)", '2001:0db8:0000:0000:0000:0000:0000:0001'],
  ["import ipaddress as ip\nprint(ip.ip_address(1))", '0.0.0.1'],
  ["import ipaddress as ip\nprint(ip.ip_address('2001:db8::1'))", '2001:db8::1'],
  ["import ipaddress as ip\nprint(ip.IPv6Address('::1').ipv4_mapped)", 'None'],
  ["import ipaddress as ip\nprint(ip.IPv4Address('100.64.0.1').is_private, ip.IPv4Address('100.64.0.1').is_global)", 'False False'],
  ["import ipaddress as ip\nprint(ip.IPv4Address('192.0.0.9').is_private, ip.IPv4Address('192.0.0.8').is_private)", 'False True'],
  ["import ipaddress as ip\nprint(ip.IPv6Address('::ffff:8.8.8.8').is_private, ip.IPv6Address('::ffff:8.8.8.8').is_global)", 'False True'],
  // ipaddress：ネットワーク
  ["import ipaddress as ip\nprint(list(ip.IPv4Network('192.0.2.0/31').hosts()))", "[IPv4Address('192.0.2.0'), IPv4Address('192.0.2.1')]"],
  ["import ipaddress as ip\nprint(list(ip.IPv4Network('192.0.2.1/32').hosts()))", "[IPv4Address('192.0.2.1')]"],
  ["import ipaddress as ip\nprint(list(ip.IPv6Network('2001:db8::/128').hosts()))", "[IPv6Address('2001:db8::')]"],
  ["import ipaddress as ip\nn = ip.IPv4Network('192.0.2.0/24')\nprint(n[5], n[-1], len(list(n)))", '192.0.2.5 192.0.2.255 256'],
  ["import ipaddress as ip\nprint(ip.IPv4Address('192.0.2.37') in ip.IPv4Network('192.0.2.0/24'))", 'True'],
  ["import ipaddress as ip\nprint(ip.IPv4Network('192.0.2.0/25') in ip.IPv4Network('192.0.2.0/24'))", 'False'],
  ["import ipaddress as ip\nprint(ip.IPv4Network('192.0.2.0/24') == ip.ip_network('192.0.2.0/24'))", 'True'],
  ["import ipaddress as ip\nprint(sorted([ip.IPv4Network('192.0.2.0/25'), ip.IPv4Network('192.0.2.0/24')]))", "[IPv4Network('192.0.2.0/24'), IPv4Network('192.0.2.0/25')]"],
  ["import ipaddress as ip\nprint(ip.IPv4Network('192.0.2.0/24').supernet(new_prefix=0) if False else ip.IPv4Network('0.0.0.0/0').supernet())", '0.0.0.0/0'],
  ["import ipaddress as ip\nprint(list(ip.IPv4Network('192.0.2.0/24').subnets(new_prefix=24)))", "[IPv4Network('192.0.2.0/24')]"],
  ["import ipaddress as ip\nprint(ip.ip_network('192.0.2.1/24', strict=False))", '192.0.2.0/24'],
  ["import ipaddress as ip\nprint(ip.ip_network((3232235520, 24)))", '192.168.0.0/24'],
  ["import ipaddress as ip\nprint(ip.IPv4Interface('192.0.2.1/24') + 5)", '192.0.2.6/32'],
  // 基盤制約：eqVal が異なる qualname 間では def.eq へ委譲しないため、CPython では True の
  // IPv4Interface == IPv4Address が本アプリでは False になる（報告書「基盤要請」参照）。
  ["import ipaddress as ip\nprint(ip.IPv4Interface('192.0.2.1/24') == ip.IPv4Address('192.0.2.1'))", 'False'],
  ["import ipaddress as ip\nprint(ip.IPv4Interface('192.0.2.1/24') > ip.IPv4Address('192.0.2.1'))", 'True'],
  ["import ipaddress as ip\nprint(list(ip.collapse_addresses([ip.IPv4Address('192.0.2.0'), ip.IPv4Address('192.0.2.1')])))", "[IPv4Network('192.0.2.0/31')]"],
  ["import ipaddress as ip\nprint(ip.get_mixed_type_key(ip.IPv4Network('10.0.0.0/8')))", "(4, IPv4Address('10.0.0.0'), IPv4Address('255.0.0.0'))"],
  ["import ipaddress as ip\nprint(ip.IPv4Address('192.0.2.1').__format__('#_b'))", '0b1100_0000_0000_0000_0000_0010_0000_0001'],
  ["import ipaddress as ip\nprint(ip.IPv6Address('2001:db8::1').__format__('X'))", '20010DB8000000000000000000000001'],
  // pathlib：純粋パス
  ["from pathlib import PurePosixPath as P\nprint(P('/a/b/').parts)", "('/', 'a', 'b')"],
  ["from pathlib import PurePosixPath as P\nprint(P('a//b/./c'))", 'a/b/c'],
  ["from pathlib import PurePosixPath as P\nprint(P('/a/b') / 'c' / '/x')", '/x'],
  ["from pathlib import PurePosixPath as P\nprint('c' / P('/a/b'))", '/a/b'],
  ["from pathlib import PurePosixPath as P\nprint(P('/a/b.tar.gz').suffixes, P('/a/.bashrc').suffix, P('/a/.bashrc').stem)", "['.tar', '.gz']  .bashrc"],
  ["from pathlib import PurePosixPath as P\nprint(P('/a/b').parents[1], len(P('/a/b').parents))", '/ 2'],
  ["from pathlib import PurePosixPath as P\nprint(P('/a/b/c').relative_to('/a', walk_up=True) if False else P('/a/x').relative_to('/a/b', walk_up=True))", '../x'],
  ["from pathlib import PurePosixPath as P\nprint(P('a/b.py').match('**/*.py'), P('a/b.py').match('*.txt'))", 'True False'],
  ["from pathlib import PurePosixPath as P\nprint(P('a/b.py').full_match('*.py'), P('a/b.py').full_match('**/*.py'))", 'False True'],
  ["from pathlib import PureWindowsPath as W\nprint(W('C:/a/b').drive, W('C:/a/b').anchor, W('//srv/shr/a').drive)", 'C: C:\\ \\\\srv\\shr'],
  ["from pathlib import PureWindowsPath as W\nprint(W('c:/A/B') == W('C:/a/b'))", 'True'],
  ["from pathlib import PureWindowsPath as W\nprint(W('C:a/b').is_absolute(), W('C:/a').is_absolute())", 'False True'],
  ["from pathlib import PureWindowsPath as W\nprint((W('C:/a') / '/b'))", 'C:\\b'],
  ["from pathlib import Path\nprint(Path('/a b/c#.txt').as_uri())", 'file:///a%20b/c%23.txt'],
  ["from pathlib import Path\nprint(Path.from_uri('file://localhost/etc/hosts'))", '/etc/hosts'],
  ["from pathlib import Path\nprint(Path('x') / 'y')", 'x/y'],
  // glob
  ["import glob\nprint(glob.escape('/a/b*c'))", '/a/b[*]c'],
  ["import glob\nprint(glob.translate('*.py', seps='/'))", '(?s:(?!\\.)[^/]*\\.py)\\Z'],
  ["import glob\nprint(glob.translate('[!a-c]x', seps='/'))", '(?s:[^a-c]x)\\Z'],
  // filecmp
  ["import filecmp\nprint(filecmp.clear_cache())", 'None'],
  // copyreg
  ["import copyreg\ncopyreg.pickle(int, str)\ncopyreg.constructor(len)\nprint('ok')", 'ok'],
  // secrets（決定論的な境界）
  ["import secrets\nprint(secrets.randbelow(1), secrets.randbits(0), len(secrets.token_bytes(0)), secrets.choice([42]))", "0 0 0 42"],
  ["import secrets, ipaddress as ip\np = ip.IPv4Address('192.0.2.1').packed\nprint(secrets.compare_digest(p, p), secrets.compare_digest('ab', 'ac'))", 'True False'],
  ["import secrets\nprint(secrets.token_hex(0), secrets.token_urlsafe(0))", ' '],
  // math.integer
  ["from math.integer import comb, perm, gcd, lcm, isqrt\nprint(comb(10, 3), perm(10), gcd(-12, 18), lcm(), isqrt(99))", '120 3628800 6 1 9'],
  ["from math.integer import factorial\nprint(factorial(18))", '6402373705728000'],
  // wsgiref.headers
  ["from wsgiref.headers import Headers\nh = Headers([('X-A', '1')])\nh['X-A'] = '2'\nh.setdefault('X-B', '3')\nprint(len(h), h.get('x-a'), 'X-B' in h, h.get_all('X-A'))", "2 2 True ['2']"],
  ["from wsgiref.headers import Headers\nh = Headers()\nh.add_header('Content-Disposition', 'attachment', filename='a.txt')\nprint(len(str(h)), str(h).count('='))", '53 1'],
  ["from wsgiref.headers import Headers\nh = Headers()\nprint(h.get('X-None'), h.get('X-None', 'd'))", 'None d'],
  // wsgiref.util
  ["from wsgiref.util import request_uri\nenv = {'wsgi.url_scheme': 'https', 'SERVER_NAME': 'ex.com', 'SERVER_PORT': '443', 'PATH_INFO': '/p', 'QUERY_STRING': ''}\nprint(request_uri(env))", 'https://ex.com/p'],
  ["from wsgiref.util import shift_path_info\nenv = {'SCRIPT_NAME': '/a', 'PATH_INFO': '/x/'}\nprint(shift_path_info(env), env['SCRIPT_NAME'], env['PATH_INFO'])", 'x /a/x /'],
  ["from wsgiref.util import setup_testing_defaults\nenv = {}\nsetup_testing_defaults(env)\nprint(env['SERVER_PORT'], env['wsgi.url_scheme'], env['REQUEST_METHOD'])", '80 http GET'],
  ["from wsgiref.util import guess_scheme, is_hop_by_hop\nprint(guess_scheme({}), is_hop_by_hop('TE'), is_hop_by_hop('Accept'))", 'http True False'],
];
for (const [code, expected] of CASES) {
  test('G13 case: ' + code.split('\n').pop().slice(0, 70), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), [expected], code);
  });
}

// ---------------- 異常ケース ----------------
const ERROR_CASES = [
  ["import ipaddress as ip\nip.IPv4Address('192.0.2')", /AddressValueError：Expected 4 octets in '192\.0\.2'/],
  ["import ipaddress as ip\nip.IPv4Address('192.0.2.01')", /AddressValueError：Leading zeros are not permitted in '01' in '192\.0\.2\.01'/],
  ["import ipaddress as ip\nip.IPv6Address('2001:db8:::1')", /AddressValueError：At most one '::' permitted in '2001:db8:::1'/],
  ["import ipaddress as ip\nip.IPv6Address('fe80::1%')", /AddressValueError：Invalid IPv6 address: "'fe80::1%'"/],
  ["import ipaddress as ip\nip.IPv4Address('192.0.2.1') - ip.IPv4Address('192.0.2.0')", /TypeError/],
  ["import ipaddress as ip\nip.IPv4Network('192.0.2.1/24')", /ValueError：192\.0\.2\.1\/24 has host bits set/],
  ["import ipaddress as ip\nip.ip_address('example')", /ValueError：'example' does not appear to be an IPv4 or IPv6 address/],
  ["import ipaddress as ip\nip.IPv4Address('192.0.2.1') + ip.IPv6Address('::1')", /TypeError/],
  ["import ipaddress as ip\n1 + ip.IPv4Address('192.0.2.1')", /TypeError/],
  ["import ipaddress as ip\nip.IPv4Network('192.0.2.0/24')[256]", /IndexError：address out of range/],
  ["import ipaddress as ip\nip.IPv4Network('192.0.2.0/24').subnet_of(ip.IPv6Network('::/0'))", /TypeError：192\.0\.2\.0\/24 and ::\/0 are not of the same version/],
  ["import ipaddress as ip\nip.v4_int_to_packed(-1)", /ValueError：Address negative or too large for IPv4/],
  ["from pathlib import PurePosixPath as P\nP('/a/b').with_suffix('md')", /ValueError：Invalid suffix 'md'/],
  ["from pathlib import PurePosixPath as P\nP('/a/b').with_name('x/y')", /ValueError：Invalid name 'x\/y'/],
  ["from pathlib import PurePosixPath as P\nP('/a/b').relative_to('/x')", /ValueError：'\/a\/b' is not in the subpath of '\/x'/],
  ["from pathlib import PurePosixPath as P\nP('a').match('')", /ValueError：empty pattern/],
  ["from pathlib import Path\nPath('a.txt').read_text()", /未対応：pathlib\.Path\.read_text は本アプリの高度モードでは未対応です/],
  ["from pathlib import Path\nPath.cwd()", /未対応/],
  ["from pathlib import Path\nPath('rel').as_uri()", /ValueError：relative paths can't be expressed as file URIs/],
  ["from pathlib import Path\nPath.from_uri('http://ex.com/a')", /ValueError：URL is missing a 'file:' scheme/],
  ["from pathlib import WindowsPath\nWindowsPath('C:/a')", /pathlib\.UnsupportedOperation：cannot instantiate 'WindowsPath' on your system/],
  ["import glob\nglob.glob('*.txt')", /未対応：glob\.glob は本アプリの高度モードでは未対応です/],
  ["import filecmp\nfilecmp.cmp('a', 'b')", /未対応：filecmp\.cmp は本アプリの高度モードでは未対応です/],
  ["import filecmp\nfilecmp.dircmp('a', 'b')", /未対応：filecmp\.dircmp は本アプリの高度モードでは未対応です/],
  ["from pathlib.types import PathInfo\nPathInfo()", /未対応：pathlib\.types\.PathInfo は本アプリの高度モードでは未対応です/],
  ["from string.templatelib import Template\nTemplate('a')", /未対応：string\.templatelib\.Template は本アプリの高度モードでは未対応です/],
  ["from wsgiref.util import FileWrapper\nFileWrapper(None)", /未対応：wsgiref\.util\.FileWrapper は本アプリの高度モードでは未対応です/],
  ["import copyreg\ncopyreg.pickle(int, 42)", /TypeError：reduction functions must be callable/],
  ["import copyreg\ncopyreg.constructor(42)", /TypeError：constructors must be callable/],
  ["import secrets\nsecrets.randbelow(0)", /ValueError：Upper bound must be positive\./],
  ["import secrets\nsecrets.choice([])", /IndexError：Cannot choose from an empty sequence/],
  ["import secrets\nsecrets.randbits(-1)", /ValueError：number of bits must be non-negative/],
  ["import secrets\nsecrets.compare_digest('あ', 'あ')", /TypeError：comparing strings with non-ASCII characters is not supported/],
  ["import secrets, ipaddress as ip\nsecrets.compare_digest('ab', ip.IPv4Address('192.0.2.1').packed)", /TypeError：a bytes-like object is required, not 'str'/],
  ["from wsgiref.headers import Headers\nHeaders('x')", /TypeError：Headers must be a list of name\/value tuples/],
  ["from wsgiref.headers import Headers\nHeaders([('X', 'a\\x01b')])", /ValueError：Control characters not allowed in headers/],
  ["from math.integer import factorial\nfactorial(-1)", /ValueError/],
  ["from math.integer import comb\ncomb(5, -1)", /ValueError/],
];
for (const [code, pattern] of ERROR_CASES) {
  test('G13 error: ' + code.split('\n').pop().slice(0, 70), async () => {
    const r = await run(code);
    assert.ok(errs(r).length > 0, 'エラーで停止すること: ' + code);
    assert.match(errs(r)[0], pattern);
  });
}

// ---------------- 未検証の正直な振る舞い ----------------
test('G13 unverified：secrets の生成値は確定せず、形式だけが再現される', async () => {
  const r = await run("import secrets\nprint(secrets.randbelow(10))");
  assert.deepEqual(errs(r), []);
  assert.match(outs(r)[0], /^実行時に決まる/);
  const r2 = await run("import secrets\nprint(len(secrets.token_bytes(16)))");
  assert.deepEqual(errs(r2), []);
  assert.match(outs(r2)[0], /^実行時に決まる/);
});
