/* 高度A7班（Python 標準ライブラリ）監査・是正の回帰テスト。
 *
 * 是正1（根本原因）: analyzeCode が import を追跡せず、モジュール関数
 * の解決が「短い名前が有効カタログ全体で一意」な場合に限られていた。
 * 標準ライブラリ 10,572 件を合成すると短名が衝突し、math.gcd のような
 * 通常のモジュール関数まで scan／トレースのどちらからも到達不能だった
 * （是正前の機械照合: scan 自己到達 870/5,664 件）。import の別名表に
 * 基づく完全名解決を検証する。誤リンク防止（曖昧な短名は解決しない、
 * 別モジュールの同名項目へ付けない）も同時に固定する。
 *
 * 是正2（例文データ）: モジュールを使うのに import が無い例文 377 件
 * （実行すると NameError になり、正直な停止にもならない）へ import 行
 * を補った。代表項目で例文の到達性を固定する。
 *
 * 是正3（email.policy）: 既定値の誤り（compat32 の mangle_from_、
 * strict の raise_on_defect、HTTP の max_line_length）と、クラス経由の
 * 属性読みが未実装だった点を CPython 3.12.3 実走値で是正した。
 * 是正4（http.cookiejar）: CookiePolicy の attrs に生値を置いたため
 * 属性読みでシミュレーション全体が落ちていた。Def から除去し、
 * DefaultCookiePolicy のインスタンス属性として実装し直した。
 * 是正5（bytes 相互運用）: B7 の G7／G13 がエンジン形 bytes
 * （{__bytes}）を受け付けず、b64encode(b'hello') が自己矛盾した
 * TypeError になっていた。bytesArr が両形を受理するよう是正した。
 * 是正6（math 整数関数）: isqrt 等が安全範囲超の整数（UNK）に虚偽の
 * TypeError を出していた。UNK を正直に伝播させる。
 * 是正7（codecs）: モジュールレベルの codecs.encode/decode は裸の値を
 * 返す（tuple は CodecInfo メソッドだけ）。CPython 実走で是正した。
 * 是正8（types 単例クラス）: types.NoneType 等が type() の型値と別物で
 * isinstance が False になっていた。builtinTypes／typevalAlias で同一化。
 * 是正9（クラス __name__）: 標準ライブラリクラスの __name__ 等が
 * AttributeError になっていた。限定名から合成して返す。
 * 是正10（基底クラス）: 標準ライブラリクラスを基底にする継承は
 * 「型だけを書いてください」という虚偽の理由でなく、未対応と名指し
 * で止める。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { loadAdvanced } from "../js/core/advanced-loader.js";
import { mergeCatalog } from "../js/core/catalog.js";
import "../js/types/python/advanced-engine.js";

const py = getDefinition("python");
const adv = await loadAdvanced(py);
const merged = mergeCatalog(
  { reference: py.reference, templates: py.templates, glossary: py.glossary },
  adv,
);
py.__catalogReference = merged.reference;

const scanHas = (code, name) => py.scan(code).includes(name);
const traceRefs = async (code) => {
  const r = await py.simulate(code, structuredClone(py.model.defaults));
  const refs = new Set();
  for (const p of r.paths || [])
    for (const t of p.trace || []) for (const x of t.refs || []) refs.add(x);
  return refs;
};

test("A7到達性: import したモジュールの関数は完全名で解決される", () => {
  assert.ok(scanHas("import math\nprint(math.gcd(12, 18))", "math.gcd"));
  assert.ok(scanHas("import math\nprint(math.factorial(5))", "math.factorial"));
  assert.ok(scanHas("import json\nprint(json.dumps({'a': 1}))", "json.dumps"));
  assert.ok(scanHas("import re\nprint(re.findall(r'\\d+', 'a1'))", "re.findall"));
});

test("A7到達性: モジュール定数（属性参照）も完全名で解決される", () => {
  assert.ok(scanHas("import math\nprint(math.pi)", "math.pi"));
  assert.ok(scanHas("import string\nprint(string.ascii_lowercase)", "string.ascii_lowercase"));
});

test("A7到達性: from import の名前・クラスが完全名で解決される", () => {
  assert.ok(scanHas("from math import gcd\nprint(gcd(12, 18))", "math.gcd"));
  const code = "from collections import Counter\nc = Counter('abbc')\nprint(c.most_common(2))";
  assert.ok(scanHas(code, "collections.Counter"));
  assert.ok(scanHas(code, "collections.Counter.most_common"));
});

test("A7到達性: モジュール別名（import X as Y）が実パスで解決される", () => {
  assert.ok(scanHas("import math as m\nprint(m.sqrt(81))", "math.sqrt"));
  assert.ok(scanHas("import os.path as p\nprint(p.join('a', 'b'))", "os.path.join"));
});

test("A7到達性: 多段チェーンとサブモジュールが解決される", () => {
  assert.ok(scanHas("import os\nprint(os.path.join('a', 'b'))", "os.path.join"));
  assert.ok(
    scanHas("from collections.abc import Mapping\nprint(isinstance({}, Mapping))", "collections.abc.Mapping"),
  );
});

test("A7到達性: from X import * は候補が一意な場合だけ解決される", () => {
  assert.ok(scanHas("from math import *\nprint(gcd(12, 18))", "math.gcd"));
});

test("A7誤リンク防止: import の無い曖昧な短名は解決されない", () => {
  const got = py.scan("print(sqrt(16))");
  assert.ok(!got.includes("math.sqrt"), "math.sqrt へ誤リンクしない");
  assert.ok(!got.includes("cmath.sqrt"), "cmath.sqrt へ誤リンクしない");
});

test("A7誤リンク防止: import したモジュールの同名項目だけが付く", () => {
  const got = py.scan("import math\nprint(math.sqrt(81))");
  assert.ok(got.includes("math.sqrt"));
  assert.ok(!got.includes("cmath.sqrt"));
});

test("A7到達性: トレース（実行経路の参照）にも完全名が現れる", async () => {
  assert.ok((await traceRefs("import math\nprint(math.gcd(12, 18))")).has("math.gcd"));
  assert.ok((await traceRefs("from math import gcd\nprint(gcd(12, 18))")).has("math.gcd"));
  assert.ok((await traceRefs("import math\nprint(math.pi)")).has("math.pi"));
  const refs = await traceRefs(
    "from collections import Counter\nc = Counter('abbc')\nprint(c.most_common(2))",
  );
  assert.ok(refs.has("collections.Counter.most_common"));
});

test("A7例文是正: import を補った代表例文が自項目へ到達する", () => {
  for (const name of ["json.dumps", "csv.QUOTE_ALL", "binascii.crc32", "codecs.BOM", "hashlib.sha256"]) {
    const it = merged.reference.find((r) => r.name === name);
    assert.ok(it, name + " がカタログにある");
    assert.ok(
      typeof it.example === "string" && it.example.includes("import "),
      name + " の例文に import がある",
    );
    assert.ok(scanHas(it.example, name), name + " の例文が自項目へ到達する");
  }
});

test("A7全数ゲート: 標準ライブラリ全項目が正規形（import＋完全名参照）で到達可能", () => {
  const stdlib = merged.reference.filter(
    (r) => typeof r.source === "string" && r.source.includes("docs.python.org") && r.name.includes("."),
  );
  assert.ok(stdlib.length > 9000, "分母が想定規模ある: " + stdlib.length);
  const ng = [];
  for (const it of stdlib) {
    const root = it.name.split(".")[0];
    if (!scanHas("import " + root + "\nprint(" + it.name + ")", it.name)) ng.push(it.name);
  }
  assert.deepEqual(ng, [], "正規形で到達できない項目: " + ng.slice(0, 10).join(", "));
});

/* ---------- 是正3〜10 の意味論回帰 ---------- */
const simOut = async (code) => {
  const r = await py.simulate(code, structuredClone(py.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
  return { out: (r.paths[0]?.outputs || []).map((o) => o.text).join("\n"), errs };
};
const expectOut = async (code, expected) => {
  const { out, errs } = await simOut(code);
  assert.deepEqual(errs, [], code + " でエラー: " + errs.join(", "));
  assert.equal(out, expected, code);
};
const expectErr = async (code, pattern) => {
  const { errs } = await simOut(code);
  assert.match(errs.join(" | "), pattern, code);
};

test("A7是正3: email.policy の既定値とクラス属性が CPython と一致する", async () => {
  await expectOut(
    "import email.policy\nprint(email.policy.compat32.mangle_from_, email.policy.strict.raise_on_defect)",
    "True True",
  );
  await expectOut(
    "import email.policy\nprint(email.policy.HTTP.max_line_length, repr(email.policy.HTTP.linesep))",
    "None '\\r\\n'",
  );
  await expectOut(
    "import email.policy\np = email.policy.EmailPolicy()\nprint(p.max_line_length, p.utf8, p.refold_source)",
    "78 False long",
  );
  await expectErr("import email.policy\nprint(email.policy.compat32.utf8)", /AttributeError/);
});

test("A7是正4: CookiePolicy の属性読みで落ちず、DefaultCookiePolicy の属性が正しい", async () => {
  await expectErr("import http.cookiejar\nprint(http.cookiejar.CookiePolicy().netscape)", /AttributeError/);
  await expectOut(
    "import http.cookiejar\nd = http.cookiejar.DefaultCookiePolicy()\nprint(d.netscape, d.rfc2965, d.hide_cookie2)",
    "True False False",
  );
  await expectOut(
    "import http.cookiejar\nd = http.cookiejar.DefaultCookiePolicy(netscape=False)\nprint(d.netscape)",
    "False",
  );
});

test("A7是正5: エンジン形 bytes が G7／G13 の関数で使える", async () => {
  await expectOut("import base64\nprint(base64.b64encode(b'hello'))", "b'aGVsbG8='");
  await expectOut("import binascii\nprint(binascii.crc32(b'hello'), binascii.hexlify(b'\\xde\\xad'))", "907060870 b'dead'");
  await expectOut(
    "import hashlib\nprint(hashlib.sha256(b'abc').hexdigest())",
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  await expectOut("import ipaddress\nprint(ipaddress.ip_address(b'\\xc0\\xa8\\x00\\x01'))", "192.168.0.1");
  await expectOut("import secrets\nprint(secrets.compare_digest(b'ab', b'ab'))", "True");
  await expectOut(
    "import uuid\nprint(uuid.UUID(bytes=b'\\x00' * 15 + b'\\x01').int)",
    "1",
  );
});

test("A7是正6: math 整数関数は巨大整数を虚偽エラーでなく未確定として返す", async () => {
  const { out, errs } = await simOut("import math\nprint(math.isqrt(10**20))");
  assert.deepEqual(errs, [], "虚偽の TypeError を出さない: " + errs.join(", "));
  assert.match(out, /実行時に決まる/, "UNK として正直に示す");
  await expectErr("import math\nprint(math.isqrt(-1))", /ValueError/);
});

test("A7是正7: codecs.encode/decode は裸の値を返し、CodecInfo は tuple を返す", async () => {
  await expectOut("import codecs\nprint(codecs.encode('hello', 'rot_13'))", "uryyb");
  await expectOut("import codecs\nprint(codecs.decode(b'hello', 'utf-8'))", "hello");
  await expectOut("import codecs\nprint(codecs.lookup('utf-8').encode('hello'))", "(b'hello', 5)");
});

test("A7是正8: types の単例クラスが type() の型値と同一に扱われる", async () => {
  await expectOut("import types\nprint(type(None) is types.NoneType)", "True");
  await expectOut("import types\nprint(isinstance(None, types.NoneType))", "True");
  await expectOut("import types\nprint(type(None) == types.NoneType)", "True");
  await expectOut("import types\nprint(types.EllipsisType(), types.NotImplementedType())", "Ellipsis NotImplemented");
  await expectOut("import types\nprint(isinstance(..., types.EllipsisType))", "True");
});

test("A7是正9: 標準ライブラリクラスの __name__/__module__ が読める", async () => {
  await expectOut("import decimal\nprint(decimal.Decimal.__name__, decimal.Decimal.__module__)", "Decimal decimal");
  await expectOut("import calendar\nprint(type(calendar.MONDAY).__name__)", "Day");
  await expectOut("import codecs\nprint(type(codecs.BOM_UTF8).__name__)", "bytes");
});

test("A7是正10: 標準ライブラリクラスを基底にする継承は未対応と名指しで止まる", async () => {
  await expectErr("import enum\nclass C(enum.Enum):\n    A = 1", /未対応：標準ライブラリのクラス「enum\.Enum」/);
});
