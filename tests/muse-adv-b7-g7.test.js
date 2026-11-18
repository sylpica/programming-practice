/* 高度モード B7 G7（書式・データ系）の検証テスト。
* 期待値はすべて CPython 3.12.3 実走または公式ドキュメント 3.15／仕様の
* テストベクタから取った（F-04 照合はこのケース表で実施する）。
* 実行: node --test tests/muse-adv-b7-g7.test.js */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { REF_G7 } from '../js/types/python/group-advanced-g7.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

async function expectOut(code, expected) {
  const r = await run(code);
  assert.deepEqual(errs(r), [], code + ' でエラー: ' + errs(r).join(', '));
  assert.deepEqual(outs(r), Array.isArray(expected) ? expected : [expected], code);
}
async function expectErr(code, pattern) {
  const r = await run(code);
  const es = errs(r).join(' | ');
  assert.match(es, pattern, code + ' のエラーが想定と違う: ' + es);
}

/* ---------- リファレンス正規形とインベントリ整合（F-04 の前提） ---------- */
test('REF_G7 は406件・正規形・名前一意', async () => {
  assert.equal(REF_G7.length, 406);
  const names = new Set();
  for (const it of REF_G7) {
    assert.equal(typeof it.name, 'string');
    assert.ok(!names.has(it.name), '重複: ' + it.name);
    names.add(it.name);
    for (const k of ['category', 'syntax', 'description', 'example', 'caution', 'status']) {
      assert.ok(k in it, it.name + ' に ' + k + ' が無い');
    }
    assert.ok(['supported', 'unsupported', 'unverified'].includes(it.status), it.name);
    assert.ok(!('supported' in it), it.name + ' に supported 真偽値を併記しない');
    assert.ok(!('expected' in it), it.name + ' に expected を入れない');
  }
  const byStatus = { supported: 0, unsupported: 0, unverified: 0 };
  for (const it of REF_G7) byStatus[it.status]++;
  // B7 R2: codecs.codecs.* 2件 supported→unverified、json.JSONDecodeError 属性5件 unverified→supported。
  assert.deepEqual(byStatus, { supported: 333, unsupported: 20, unverified: 53 });
});

/* ---------- bytes 基盤 ---------- */
test('bytes: 生成→消費の連鎖と repr', async () => {
  await expectOut("import base64\nprint(base64.b64encode('hello'))", "b'aGVsbG8='");
  await expectOut("import base64\nb = base64.b64decode('aGVsbG8=')\nprint(len(b), b[0], b[1:3])", "5 104 b'el'");
  await expectOut("import base64, hashlib\nprint(hashlib.md5(base64.b64decode('aGVsbG8=')).hexdigest())", '5d41402abc4b2a76b9719d911017c592');
});

/* ---------- json ---------- */
test('json: dumps/loads の基本と整形', async () => {
  await expectOut("import json\nprint(json.dumps({'b': 1, 'a': [1, 2]}, sort_keys=True))", '{"a": [1, 2], "b": 1}');
  await expectOut("import json\nprint(json.dumps({'x': 'あ'}, ensure_ascii=False))", '{"x": "あ"}');
  await expectOut("import json\nprint(json.dumps([1, 2], indent=2))", ['[', '  1,', '  2', ']']);
  await expectOut("import json\nprint(json.loads('{\"a\": [1, 2.5, null, true]}'))", "{'a': [1, 2.5, None, True]}");
  await expectOut("import json\nprint(json.loads('{\"a\": 1, \"a\": 2}'))", "{'a': 2}");
  await expectOut("import json\nprint(json.dumps({1: 'x', None: 'w'}))", '{"1": "x", "null": "w"}');
  await expectOut("import json\nprint(json.dumps([float('nan'), float('inf')]))", '[NaN, Infinity]');
  await expectOut("import json\ndef ten(s):\n    return int(s) * 10\nprint(json.loads('[1, 2]', parse_int=ten))", '[10, 20]');
});
test('json: エラー文面とクラス', async () => {
  await expectErr("import json\njson.loads('{')", /JSONDecodeError：Expecting property name enclosed in double quotes: line 1 column 2 \(char 1\)/);
  await expectErr("import json\njson.loads('[1] x')", /JSONDecodeError：Extra data: line 1 column 5 \(char 4\)/);
  await expectErr("import json\njson.loads('{\"a\":01}')", /JSONDecodeError：Expecting ',' delimiter: line 1 column 7 \(char 6\)/);
  await expectOut("import json\nprint(json.JSONEncoder(ensure_ascii=False).encode({'x': 'あ'}))", '{"x": "あ"}');
  await expectOut("import json\nprint(json.JSONDecoder().raw_decode('[1] x', 0))", "([1], 3)");
  await expectErr("import json\njson.dump({}, None)", /未対応/);
});

/* ---------- csv ---------- */
test('csv: reader/writer と引用規則', async () => {
  await expectOut("import csv\nprint(list(csv.reader(['a,b', '\"x,y\",2'])))", "[['a', 'b'], ['x,y', '2']]");
  await expectOut("import csv\nout = []\nw = csv.writer(out)\nw.writerow(['a', 'b,c', None])\nprint(out)", "['a,\"b,c\",\\r\\n']");
  await expectOut("import csv\nprint(list(csv.reader(['1,,2'], quoting=csv.QUOTE_NONNUMERIC)))", "[[1.0, '', 2.0]]");
  await expectOut("import csv\nprint(list(csv.DictReader(['a,b', '1,2'])))", "[{'a': '1', 'b': '2'}]");
  await expectOut("from csv import DictWriter\nout = []\nw = DictWriter(out, fieldnames=['a'])\nw.writeheader()\nw.writerow({'a': 1})\nprint(out)", "['a\\r\\n', '1\\r\\n']");
  await expectOut("import csv\nprint(csv.field_size_limit(), csv.list_dialects())", "131072 ['excel', 'excel-tab', 'unix']");
  await expectOut("import csv\ncsv.register_dialect('semi', delimiter=';')\nprint(list(csv.reader(['a;b'], dialect='semi')))", "[['a', 'b']]");
  await expectErr("import csv\ncsv.get_dialect('nope')", /Error/);
});

/* ---------- configparser ---------- */
test('configparser: 読み取り・補間・型変換', async () => {
  await expectOut("import configparser\ncp = configparser.ConfigParser()\ncp.read_string('[s]\\na = 1\\nb = %(a)sx')\nprint(cp.get('s', 'b'), cp.getint('s', 'a'))", '1x 1');
  await expectOut("import configparser\ncp = configparser.ConfigParser()\ncp.read_string('[DEFAULT]\\nd = 9\\n[s]\\na = 1')\nprint(cp.options('s'), cp.defaults())", "['d', 'a'] {'d': '9'}");
  await expectOut("import configparser\ncp = configparser.ConfigParser()\ncp.read_string('[s]\\nb = yes')\nprint(cp.getboolean('s', 'b'))", 'True');
  await expectOut("import configparser\ncp = configparser.RawConfigParser()\ncp.read_string('[s]\\na = 100%')\nprint(cp.get('s', 'a'))", '100%');
  await expectErr("import configparser\nconfigparser.ConfigParser().read_string('a = 1')", /MissingSectionHeaderError/);
  await expectErr("import configparser\nconfigparser.ConfigParser().read_string('[s]\\na = 1\\na = 2')", /DuplicateOptionError/);
  await expectErr("import configparser\ncp = configparser.ConfigParser()\ncp.add_section('s')\ncp.get('s', 'x')", /NoOptionError/);
});

/* ---------- base64 / binascii / quopri ---------- */
test('base64/binascii: テストベクタ', async () => {
  await expectOut("import base64\nprint(base64.b32encode('foo'), base64.b32hexencode('foo'))", "b'MZXW6===' b'CPNMU==='");
  await expectOut("import base64\nprint(base64.b85decode(base64.b85encode('hello')), base64.a85decode(base64.a85encode('hello')))", "b'hello' b'hello'");
  await expectOut("import base64\nprint(base64.z85decode('HelloWorld'))", "b'\\x86O\\xd2o\\xb5Y\\xf7['");
  await expectOut("import base64\nprint(base64.urlsafe_b64encode('hello?'))", "b'aGVsbG8_'");
  await expectOut("import binascii, codecs\nd = codecs.encode('hello', 'utf-8')\nprint(binascii.crc32(d), binascii.crc_hqx(d, 0), binascii.crc_hqx(d, 65535))", '907060870 50018 53870');
  await expectOut("import binascii, codecs\nprint(binascii.hexlify(codecs.encode('foo', 'utf-8'), ':'), binascii.unhexlify('666f6f'))", "b'66:6f:6f' b'foo'");
  await expectOut("import binascii, codecs\nprint(binascii.b2a_base64(codecs.encode('hello', 'utf-8')))", "b'aGVsbG8=\\n'");
  await expectErr("import binascii\nbinascii.a2b_hex('zz')", /Error/);
  await expectOut("import quopri\nprint(quopri.encodestring('a b'), quopri.decodestring('a=20b'))", "b'a b' b'a b'");
});

/* ---------- codecs ---------- */
test('codecs: 主要コーデックと lookup', async () => {
  // A7 是正: モジュールレベルの codecs.encode/decode は裸の値を返す
  // （CPython 3.12.3 実走＋docstring。tuple は CodecInfo メソッドだけ）。
  await expectOut("import codecs\nprint(codecs.encode('あ', 'utf-8'))", "b'\\xe3\\x81\\x82'");
  await expectOut("import codecs\nprint(codecs.decode(codecs.encode('あ', 'utf-8'), 'utf-8'))", 'あ');
  await expectOut("import codecs\nprint(codecs.lookup('LATIN1').name, codecs.lookup('utf_8_sig').name, codecs.lookup('sjis').name)", 'iso8859-1 utf-8-sig shift_jis');
  await expectOut("import codecs\nprint(codecs.encode('bücher', 'punycode'), codecs.encode('hello', 'rot_13'))", "b'bcher-kva' uryyb");
  await expectOut("import codecs\nprint(codecs.encode('€', 'cp1252'))", "b'\\x80'");
  await expectOut("import codecs\nprint(codecs.charmap_build('ab'))", '{97: 0, 98: 1}');
  await expectOut("import codecs\nprint(codecs.BOM_UTF8, codecs.BOM_UTF32_LE)", "b'\\xef\\xbb\\xbf' b'\\xff\\xfe\\x00\\x00'");
  await expectOut("import codecs\nd = codecs.getincrementaldecoder('utf-8')()\nb = codecs.encode('あ', 'utf-8')\nprint(repr(d.decode(b[:2])), repr(d.decode(b[2:], True)))", "'' 'あ'");
  await expectErr("import codecs\ncodecs.lookup('no-such-codec')", /LookupError/);
  await expectErr("import codecs\ncodecs.encode('x', 'ascii') if False else codecs.decode('abc', 'utf-8')", /TypeError/);
});

/* ---------- struct ---------- */
test('struct: pack/unpack/アライメント', async () => {
  await expectOut("import struct\nprint(struct.calcsize('@bh'), struct.calcsize('<lh'), struct.calcsize('>h'))", '4 6 2');
  await expectOut("import struct\nprint(struct.unpack('>h', struct.pack('>h', 258)))", '(258,)');
  await expectOut("import struct\nprint(list(struct.iter_unpack('>h', struct.pack('>hh', 1, 2))))", '[(1,), (2,)]');
  await expectOut("import struct\ns = struct.Struct('>h')\nprint(s.format, s.size, s.unpack_from(struct.pack('>hh', 1, 2), 2))", '>h 2 (2,)');
  await expectOut("import struct\nprint(struct.pack('<e', 1.5))", "b'\\x00>'");
  await expectErr("import struct\nstruct.pack('>b', 1000)", /error/);
});

/* ---------- hashlib / hmac ---------- */
test('hashlib: テストベクタ照合', async () => {
  await expectOut("import codecs, hashlib\nprint(hashlib.md5(codecs.encode('abc', 'utf-8')).hexdigest())", '900150983cd24fb0d6963f7d28e17f72');
  await expectOut("import codecs, hashlib\nprint(hashlib.sha256(codecs.encode('abc', 'utf-8')).hexdigest())", 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await expectOut("import codecs, hashlib\nprint(hashlib.sha3_256(codecs.encode('abc', 'utf-8')).hexdigest())", '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532');
  await expectOut("import codecs, hashlib\nprint(hashlib.shake_128(codecs.encode('abc', 'utf-8')).hexdigest(16))", '5881092dd818bf5cf8a3ddb793fbcba7');
  await expectOut("import codecs, hashlib\nprint(hashlib.blake2s(codecs.encode('abc', 'utf-8'), digest_size=16).hexdigest())", 'aa4938119b1dc7b87cbad0ffd200d0ae');
  await expectOut("import codecs, hashlib\nh = hashlib.sha256()\nh.update(codecs.encode('a', 'utf-8'))\nh.update(codecs.encode('bc', 'utf-8'))\nprint(h.hexdigest(), h.name, h.digest_size, h.block_size)", 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad sha256 32 64');
  await expectOut("import hashlib\nprint(len(hashlib.algorithms_guaranteed), len(hashlib.algorithms_available))", '14 19');
  await expectOut("import codecs, hashlib\nprint(hashlib.pbkdf2_hmac('sha256', codecs.encode('password', 'utf-8'), codecs.encode('salt', 'utf-8'), 100000).hex())", '0394a2ede332c9a13eb82e9b24631604c31df978b4e2f0fbd2c549944f9d79a5');
  await expectOut("import codecs, hashlib\nprint(hashlib.scrypt(codecs.encode('', 'utf-8'), salt=codecs.encode('', 'utf-8'), n=16, r=1, p=1, dklen=64).hex())", '77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906');
  await expectErr("import hashlib\nhashlib.new('no-such-algo')", /ValueError/);
});
test('hmac: RFC 4231 テストケース1', async () => {
  await expectOut("import binascii, codecs, hmac\nkey = binascii.unhexlify('0b' * 20)\nprint(hmac.new(key, codecs.encode('Hi There', 'utf-8'), 'sha256').hexdigest())", 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
  await expectOut("import hmac\nprint(hmac.compare_digest('abc', 'abc'), hmac.compare_digest('abc', 'abd'))", 'True False');
});

/* ---------- uuid ---------- */
test('uuid: 決定論的生成と属性', async () => {
  await expectOut("import uuid\nprint(uuid.uuid3(uuid.NAMESPACE_DNS, 'python.org'))", '6fa459ea-ee8a-3ca4-894e-db77e160355e');
  await expectOut("import uuid\nprint(uuid.uuid5(uuid.NAMESPACE_DNS, 'python.org'))", '886313e1-3b8a-5372-9b90-0c9aee199e5d');
  await expectOut("import uuid\nprint(uuid.uuid8(0x12345678, 0x9abcdef0, 0x11223344))", '00001234-5678-8ef0-8000-000011223344');
  await expectOut("import uuid\nu = uuid.UUID('886313e1-3b8a-5372-9b90-0c9aee199e5d')\nprint(u.version, u.variant, u.fields)", "5 specified in RFC 4122 (2288194529, 15242, 21362, 155, 144, 13859559153245)");
  await expectOut("import uuid\nprint(uuid.NIL, uuid.MAX)", '00000000-0000-0000-0000-000000000000 ffffffff-ffff-ffff-ffff-ffffffffffff');
  await expectOut("import uuid\nprint(uuid.uuid4().version, uuid.uuid7().version)", '4 7');
  await expectErr("import uuid\nuuid.getnode()", /未対応/);
});

/* ---------- colorsys ---------- */
test('colorsys: CPython 実走値との照合', async () => {
  await expectOut("import colorsys\nprint(colorsys.rgb_to_hsv(0.2, 0.4, 0.6))", '(0.5833333333333334, 0.6666666666666666, 0.6)');
  await expectOut("import colorsys\nprint(colorsys.rgb_to_hls(0.2, 0.4, 0.6))", '(0.5833333333333334, 0.4, 0.49999999999999994)');
  await expectOut("import colorsys\nprint(colorsys.rgb_to_yiq(0.2, 0.4, 0.6))", '(0.362, -0.18413999999999997, 0.019820000000000004)');
  await expectOut("import colorsys\nprint(colorsys.hsv_to_rgb(0.1, 0.5, 0.7))", '(0.7, 0.5599999999999999, 0.35)');
  await expectOut("import colorsys\nprint(colorsys.hls_to_rgb(0.1, 0.5, 0.7))", '(0.85, 0.57, 0.15000000000000002)');
  await expectOut("import colorsys\nprint(colorsys.yiq_to_rgb(0.3, 0.1, -0.05))", '(0.36351039260969975, 0.30430578932947117, 0.10369515011547342)');
});

/* ---------- html / html.entities / html.parser ---------- */
test('html: escape/unescape と実体表', async () => {
  await expectOut("import html\nprint(html.escape('<a b=\"c\">&\\''))", '&lt;a b=&quot;c&quot;&gt;&amp;&#x27;');
  await expectOut("import html\nprint(html.unescape('&Aacute; &Aacute &amp &amp; &#65; &#x41; &#0; &#128; &#xD800; &notanentity; &frac12; &acE;'))", 'Á Á & & A A � € � ¬anentity; ½ ∾̳');
  await expectOut("import html.entities\nprint(len(html.entities.html5), html.entities.name2codepoint['amp'], html.entities.entitydefs['amp'])", '2231 38 &');
  await expectOut("from html.parser import HTMLParser\np = HTMLParser()\np.feed('<html>\\n<body>hi')\nprint(p.getpos(), p.get_starttag_text())", "(2, 8) <body>");
  await expectOut("from html.parser import HTMLParser\np = HTMLParser()\np.feed('<p class=\"a>b\">x</p>')\np.close()\nprint(p.getpos())", '(1, 20)');
});

/* ---------- tomllib ---------- */
test('tomllib: 解析とエラー', async () => {
  await expectOut("import tomllib\nprint(tomllib.loads('a = 1\\nb = \"x\"\\n[t]\\nc = [1, 2.5, true]\\nd = {e = 1979}'))", "{'a': 1, 'b': 'x', 't': {'c': [1, 2.5, True], 'd': {'e': 1979}}}");
  await expectOut("import tomllib\nprint(tomllib.loads('[[p]]\\nx = 1\\n[[p]]\\nx = 2'))", "{'p': [{'x': 1}, {'x': 2}]}");
  await expectOut("import tomllib\nprint(tomllib.loads('a = 0xdead_beef\\nb = 1_000\\nc = 3.14e2'))", "{'a': 3735928559, 'b': 1000, 'c': 314.0}");
  await expectErr("import tomllib\ntomllib.loads('a = ')", /TOMLDecodeError：Invalid value \(at end of document\)/);
  await expectErr("import tomllib\ntomllib.loads('a = 01')", /TOMLDecodeError：Expected newline or end of document after a statement \(at line 1, column 6\)/);
  await expectErr("import tomllib\ntomllib.loads('a = 1\\na = 2')", /TOMLDecodeError：Cannot overwrite a value/);
});

/* ---------- plistlib ---------- */
test('plistlib: XML 往復と列挙値', async () => {
  await expectOut("import plistlib\nprint(plistlib.loads(plistlib.dumps({'a': 1, 'b': [True, 'x', 2.5]})))", "{'a': 1, 'b': [True, 'x', 2.5]}");
  await expectOut("import plistlib\nprint(plistlib.UID(5), plistlib.FMT_XML == 1, plistlib.FMT_BINARY == 2)", 'UID(5) False False');
  await expectErr("import plistlib\nplistlib.dumps({'u': plistlib.UID(3)})", /TypeError：unsupported type/);
  await expectErr("import plistlib\nplistlib.dumps({}, fmt=1)", /ValueError：Unsupported format/);
});

/* ---------- keyword / gettext ---------- */
test('keyword/gettext', async () => {
  await expectOut("import keyword\nprint(len(keyword.kwlist), keyword.softkwlist, keyword.iskeyword('if'), keyword.issoftkeyword('match'))", "35 ['_', 'case', 'match', 'type'] True True");
  await expectOut("import gettext\nt = gettext.NullTranslations()\nprint(t.gettext('hi'), t.ngettext('one', 'many', 1), t.ngettext('one', 'many', 3), t.info(), t.charset())", 'hi one many {} None');
  await expectOut("import gettext\nprint(gettext.textdomain(), gettext.textdomain('app'), gettext.bindtextdomain('app', '/tmp/loc'))", 'messages app /tmp/loc');
  await expectOut("import gettext\nprint(gettext.translation('app', fallback=True).gettext('hello'))", 'hello');
});
