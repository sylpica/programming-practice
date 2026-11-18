/* 高度モード B7 G10（email・XML・Webテキスト系）の F-01 ケース。
 * 期待値は CPython 3.12.3 実走で確認した値（報告書参照）。
 * 自群の impl-advanced-*.js だけを import する（他群へ依存しない）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pyDir = path.join(here, '../js/types/python');
for (const f of fs.readdirSync(pyDir).sort()) {
  if (f.startsWith('impl-advanced-') && f !== 'impl-advanced-math.js') await import('../js/types/python/' + f);
}
// 統合ツリーでは全群のリファレンスが同居するため、自群（email/xml/http/urllib/
// mimetypes/netrc）のファイルだけを数える（統合時の是正。件数検証の対象は自群分）。
const G10_REF = /^(email|xml|http|urllib|mimetypes|netrc)([-.])/;
const REF_FILES = fs.readdirSync(pyDir).filter((f) => f.startsWith('reference-advanced-') && G10_REF.test(f.slice('reference-advanced-'.length))).sort();
const refs = [];
for (const f of REF_FILES) { const m = await import('../js/types/python/' + f); refs.push(...(m.referenceAdvanced || [])); }

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

const CASES = [
  // urllib.parse
  ['import urllib.parse\nr = urllib.parse.urlparse("https://user:pass@example.com:8080/path?q=1#frag")\nprint(r.scheme)\nprint(r.netloc)\nprint(r[2])\nprint(r.geturl())', ['https', 'user:pass@example.com:8080', '/path', 'https://user:pass@example.com:8080/path?q=1#frag']],
  ['import urllib.parse\nprint(urllib.parse.urlsplit("http://a/b?c#d"))', ["SplitResult(scheme='http', netloc='a', path='/b', query='c', fragment='d')"]],
  ['import urllib.parse\nprint(urllib.parse.urlunparse(("http", "a", "/b", "", "c", "d")))\nprint(urllib.parse.urlunsplit(("http", "a", "/b", "c", "d")))', ['http://a/b?c#d', 'http://a/b?c#d']],
  ['import urllib.parse\nprint(urllib.parse.urljoin("http://a/b/c/d;p?q", "g"))\nprint(urllib.parse.urljoin("http://a/b/c/d;p?q", "../g"))\nprint(urllib.parse.urljoin("http://a/b/c/d;p?q", "/g"))\nprint(urllib.parse.urljoin("http://a/b/c/d;p?q", "?y"))\nprint(urllib.parse.urljoin("http://a/b/c/d;p?q", "#s"))\nprint(urllib.parse.urljoin("http://a/b/c", "g"))\nprint(urllib.parse.urljoin("http://a/b/c/d;p?q", "//x/y"))', ['http://a/b/c/g', 'http://a/b/g', 'http://a/g', 'http://a/b/c/d;p?y', 'http://a/b/c/d;p?q#s', 'http://a/b/g', 'http://x/y']],
  ['import urllib.parse\nprint(urllib.parse.quote("a b/あ"))\nprint(urllib.parse.quote("a/b", safe=""))\nprint(urllib.parse.quote_plus("a b&c"))\nprint(urllib.parse.unquote("a%20b%2Fc"))\nprint(urllib.parse.unquote_plus("a+b%21"))', ['a%20b/%E3%81%82', 'a%2Fb', 'a+b%26c', 'a b/c', 'a b!']],
  ['import urllib.parse\nprint(urllib.parse.parse_qs("a=1&a=2&b=", keep_blank_values=True))\nprint(urllib.parse.parse_qsl("a=1&b=2"))\nprint(urllib.parse.urlencode({"q": "a b", "n": 2}))\nprint(urllib.parse.urldefrag("http://a/b#x"))\nprint(urllib.parse.unwrap("<URL:http://x>"))', ["{'a': ['1', '2'], 'b': ['']}", "[('a', '1'), ('b', '2')]", 'q=a+b&n=2', "DefragResult(url='http://a/b', fragment='x')", 'http://x']],
  // http.cookies
  ['import http.cookies\nc = http.cookies.SimpleCookie("chips=ahoy; vienna=finger")\nprint(c["chips"].value)\nprint(c["vienna"].value)', ['ahoy', 'finger']],
  ['import http.cookies\nm = http.cookies.Morsel()\nm.set("k", "val", "val")\nm["path"] = "/"\nprint(m.OutputString())\nprint(m.output())\nprint(m["path"])', ['k=val; Path=/', 'Set-Cookie: k=val; Path=/', '/']],
  ['import http.cookies\nc = http.cookies.SimpleCookie()\nc.load(\'a="x y"; b=2\')\nprint(c["a"].value)\nprint(c["b"].value)', ['x y', '2']],
  // http.cookiejar
  ['from http.cookiejar import Cookie, CookieJar\nck = Cookie(0, "n", "v", None, False, "example.com", True, False, "/", True, False, None, False, None, None, {})\nprint(ck)\nprint(ck.domain)\nprint(ck.is_expired(9999999999))\njar = CookieJar()\njar.set_cookie(ck)\nprint(len(jar))', ['<Cookie n=v for example.com/>', 'example.com', 'False', '1']],
  ['from http.cookiejar import DefaultCookiePolicy\np = DefaultCookiePolicy()\nprint(p.is_blocked("example.com"))\np.set_blocked_domains(["example.com"])\nprint(p.is_blocked("example.com"))\nprint(p.blocked_domains())', ['False', 'True', "('example.com',)"]],
  // email.utils
  ['import email.utils\nprint(email.utils.parseaddr("Bob <bob@example.com>"))\nprint(email.utils.formataddr(("Bob", "bob@example.com")))\nprint(email.utils.formataddr(("", "a@x")))', ["('Bob', 'bob@example.com')", 'Bob <bob@example.com>', 'a@x']],
  ['import email.utils\nprint(email.utils.parsedate("Sun, 06 Nov 1994 08:49:37 GMT"))\nprint(email.utils.parsedate_tz("Sun, 06 Nov 1994 08:49:37 +0900"))\nprint(email.utils.mktime_tz((1994, 11, 6, 8, 49, 37, 0, 1, -1, 0)))\nprint(email.utils.formatdate(0, usegmt=True))', ['(1994, 11, 6, 8, 49, 37, 0, 1, -1)', '(1994, 11, 6, 8, 49, 37, 0, 1, -1, 32400)', '784111777', 'Thu, 01 Jan 1970 00:00:00 GMT']],
  ['import email.utils\nprint(email.utils.getaddresses(["a@x, Bob <b@y>"]))\nprint(email.utils.quote("a b"))\nprint(email.utils.unquote(\'"a b"\'))', ["[('', 'a@x'), ('Bob', 'b@y')]", '"a b"', 'a b']],
  // email.message / parser
  ['from email.message import EmailMessage\nmsg = EmailMessage()\nmsg["Subject"] = "Hi"\nmsg.set_content("hello")\nprint(msg["Subject"])\nprint(msg.get_content_type())\nprint(repr(msg.get_content()))', ['Hi', 'text/plain', "'hello\\n'"]],
  ['from email.message import Message\nm = Message()\nm["X-A"] = "1"\nm["X-A"] = "2"\nprint(m.get_all("X-A"))\nprint(len(m))\nprint(m["Missing"])', ["['1', '2']", '2', 'None']],
  ['from email.parser import Parser\np = Parser().parsestr("Subject: Hi\\nFrom: a@x\\n\\nbody text\\n")\nprint(p["Subject"])\nprint(repr(p.get_payload()))', ['Hi', "'body text\\n'"]],
  ['import email\nprint(email.message_from_string("A: 1\\n\\nx")["A"])', ['1']],
  ['from email.message import Message\nimport email.encoders\nm = Message()\nm.set_payload("hello")\nemail.encoders.encode_base64(m)\nprint(m["Content-Transfer-Encoding"])\nprint(repr(m.get_payload()))', ['base64', "'aGVsbG8=\\n'"]],
  ['from email.message import Message\nm = Message()\nm.set_charset("utf-8")\nprint(m.get_charset())\nm.set_type("text/html")\nprint(m.get_content_type())\nprint(m.get_param("charset"))', ['utf-8', 'text/html', 'utf-8']],
  // email.policy / header / headerregistry
  ['from email.policy import default, EmailPolicy\nprint(default.cte_type)\nprint(EmailPolicy().max_line_length)\nprint(default.clone().utf8)', ['8bit', '78', 'False']],
  ['from email.header import Header\nh = Header("hello")\nh.append("world")\nprint(str(h))\nprint(h == Header("hello world"))', ['hello world', 'True']],
  ['from email.headerregistry import Address\na = Address(display_name="Bob", username="bob", domain="example.com")\nprint(a)\nprint(a.addr_spec)', ['Bob <bob@example.com>', 'bob@example.com']],
  ['from email.errors import MessageParseError, MessageError\ntry:\n    raise MessageParseError("bad")\nexcept MessageError:\n    print("caught")', ['caught']],
  // mimetypes
  ['import mimetypes\nprint(mimetypes.guess_type("x.html"))\nprint(mimetypes.guess_type("x.tar.gz"))\nprint(mimetypes.guess_type("x.unknownext"))\nprint(mimetypes.guess_extension("text/html"))\nprint(mimetypes.guess_extension("application/json"))', ["('text/html', None)", "('application/x-tar', 'gzip')", '(None, None)', '.html', '.json']],
  // robotparser
  ['import urllib.robotparser\nr = urllib.robotparser.RobotFileParser()\nr.parse(["User-agent: *", "Disallow: /private/", "Allow: /private/public", "Crawl-delay: 5", "Sitemap: http://x/sitemap.xml"])\nprint(r.can_fetch("*", "http://x/private/a"))\nprint(r.can_fetch("*", "http://x/private/public/a"))\nprint(r.can_fetch("*", "http://x/other"))\nprint(r.crawl_delay("*"))\nprint(r.site_maps())', ['False', 'True', 'True', '5', "['http://x/sitemap.xml']"]],
  // xml.etree
  ['from xml.etree import ElementTree as ET\nroot = ET.fromstring(\'<root a="1"><child>hi</child><child>yo</child><sub><child>deep</child></sub></root>\')\nprint(root.tag)\nprint(root.get("a"))\nprint([e.text for e in root.findall("child")])\nprint([e.text for e in root.findall(".//child")])\nprint(ET.tostring(root, encoding="unicode"))', ['root', '1', "['hi', 'yo']", "['hi', 'yo', 'deep']", '<root a="1"><child>hi</child><child>yo</child><sub><child>deep</child></sub></root>']],
  ['from xml.etree import ElementTree as ET\nroot = ET.fromstring(\'<root><c id="1">a</c><c id="2">b</c></root>\')\nprint(root.find("c[@id=\'2\']").text)\nprint(root.find("c[2]").text)', ['b', 'b']],
  ['from xml.etree import ElementTree as ET\ne = ET.Element("a", {"b": "1"})\nET.SubElement(e, "c")\nprint(ET.tostring(e, encoding="unicode"))\nprint(len(e))\nprint(e[0].tag)', ['<a b="1"><c /></a>', '1', 'c']],
  ['from xml.etree import ElementTree as ET\nprint(ET.tostring(ET.Comment("hi"), encoding="unicode"))\nprint(ET.iselement(ET.Element("a")))', ['<!--hi-->', 'True']],
  // minidom / saxutils / sax
  ['from xml.dom import minidom\nd = minidom.parseString("<root a=\'1\'><c>hi</c></root>")\nprint(d.documentElement.tagName)\nprint(d.documentElement.getAttribute("a"))\nprint(d.toxml())', ['root', '1', '<?xml version="1.0" ?><root a="1"><c>hi</c></root>']],
  ['from xml.sax import saxutils as su\nprint(su.escape("<a>&"))\nprint(su.quoteattr(\'say "hi"\'))\nprint(su.unescape("&lt;a&gt;"))', ['&lt;a&gt;&amp;', "'say \"hi\"'", '<a>']],
  ['import xml.dom\nprint(xml.dom.XML_NAMESPACE)\nprint(xml.dom.Node.ELEMENT_NODE)\nprint(xml.dom.INDEX_SIZE_ERR)', ['http://www.w3.org/XML/1998/namespace', '1', '1']],
  ['from xml.parsers.expat import errors as ee\nprint(ee.XML_ERROR_SYNTAX)\nprint(ee.messages[7])\nprint(ee.codes["syntax error"])', ['syntax error', 'mismatched tag', '2']],
  ['from xml.sax.xmlreader import AttributesImpl, InputSource\nai = AttributesImpl({"a": "1"})\nprint(ai.getLength())\nprint(ai.getValue("a"))\nsrc = InputSource("http://x")\nsrc.setEncoding("utf-8")\nprint(src.getSystemId())\nprint(src.getEncoding())', ['1', '1', 'http://x', 'utf-8']],
  ['from xml.sax.handler import ContentHandler\nch = ContentHandler()\nprint(ch.startDocument())\nprint(ch.characters("x"))', ['None', 'None']],
  ['from xml.sax import SAXParseException, SAXException\ntry:\n    raise SAXParseException("bad")\nexcept SAXException:\n    print("caught")', ['caught']],
  // mime
  ['from email.mime.text import MIMEText\nm = MIMEText("hello")\nprint(m.get_content_type())\nprint(m.get_payload())', ['text/plain', 'hello']],
];
for (const [code, expected] of CASES) {
  test('G10: ' + code.split('\n')[0] + ' :: ' + (code.split('\n')[1] || '').slice(0, 40), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
  });
}

const ERROR_CASES = [
  ['from xml.etree import ElementTree as ET\nET.fromstring("<a><b></a>")', /ParseError/],
  ['from email.policy import Policy\nPolicy()', /TypeError/],
  ['import http.cookies\nm = http.cookies.Morsel()\nm["unknownkey"] = "x"', /CookieError/],
  ['import urllib.parse\nurllib.parse.urlparse(123)', /TypeError/],
];
for (const [code, pattern] of ERROR_CASES) {
  test('G10 error: ' + code.split('\n')[0], async () => {
    const r = await run(code);
    assert.ok(errs(r).length > 0, 'エラーで停止すること');
    assert.match(errs(r)[0], pattern);
  });
}

test('G10: リファレンス全952件の形状・status・一意性', () => {
  assert.equal(refs.length, 952, 'backlog 全件を収載すること');
  const names = new Set(refs.map((i) => i.name));
  assert.equal(names.size, 952);
  const allowed = new Set(['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source']);
  for (const item of refs) {
    assert.ok(['supported', 'unsupported', 'unverified'].includes(item.status), item.name);
    for (const k of Object.keys(item)) assert.ok(allowed.has(k), item.name + ' の余分なフィールド ' + k);
    for (const k of ['name', 'category', 'syntax', 'description', 'example', 'caution']) assert.equal(typeof item[k], 'string', item.name + '.' + k);
    if (item.status === 'unsupported') assert.ok(item.caution.includes('未対応'), item.name);
    if (item.status === 'unverified') assert.ok(item.caution.includes('未検証'), item.name);
  }
  const by = {};
  for (const i of refs) by[i.status] = (by[i.status] || 0) + 1;
  assert.deepEqual(by, { supported: 526, unsupported: 24, unverified: 402 });
});

test('G10: 未検証・未対応項目は import しても黙って成功値を返さない（代表）', async () => {
  const r = await run('import email.generator\nprint(email.generator.Generator)');
  assert.ok(errs(r).length > 0);
});
