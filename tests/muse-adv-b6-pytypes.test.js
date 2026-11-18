import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { pyTypeItems as typeItems } from "./helpers-b6.mjs";

// 高度モード ブロックB6・Python班2（組み込み型とメソッド・値モデル）のテスト。
// 期待値はローカル CPython 3.12.3 の実走で裏付けた（frozendict／bytearray.take_bytes／
// bytearray.resize／memoryview.count・index／float.from_number／complex.from_number は
// 3.12 に無い 3.14〜3.15 の項目のため、docs.python.org/3 と PEP 814 を正本とした）。
// F-01 の4点（典型・境界・異常・組み合わせ）を各領域に入れている。

const py = getDefinition("python");
const run = async (code) =>
  py.simulate(code, structuredClone(py.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const HOST_LEAK =
  /Maximum call stack|Cannot read properties|is not a function|undefined is not/;
const out1 = async (code) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], code);
  assert.equal(r.paths.length, 1, code);
  return outputs(r)[0];
};
const errKind = async (code, kind) => {
  const r = await run(code);
  const es = errors(r);
  assert.ok(es.length > 0, "must stop: " + code);
  assert.match(es[0].message, new RegExp("^" + kind + "："), es[0].message);
  assert.doesNotMatch(es[0].message, HOST_LEAK);
  return es[0].message;
};

/* ---------- bytes の値モデル ---------- */

test("bytes literal and constructors produce concrete values", async () => {
  assert.deepEqual(await out1("print(b'Hi')"), ["b'Hi'"]);
  assert.deepEqual(await out1("print(bytes([72, 105]))"), ["b'Hi'"]);
  assert.deepEqual(await out1("print(bytes('ab', 'utf-8'))"), ["b'ab'"]);
  assert.deepEqual(await out1("print(bytes(3))"), ["b'\\x00\\x00\\x00'"]);
  assert.deepEqual(await out1("print(bytes())"), ["b''"]);
  assert.deepEqual(await out1("print(b'\\xff\\x00')"), ["b'\\xff\\x00'"]);
  // 境界：空・繰り返し・連結
  assert.deepEqual(await out1("print(b'ab' * 2, 2 * b'ab', b'a' + b'b')"), ["b'abab' b'abab' b'ab'"]);
  assert.deepEqual(await out1("print(b'ab' * 0, b'ab' * -1)"), ["b'' b''"]);
});

test("bytes len/index/slice/iteration/in/equality go through engine paths", async () => {
  assert.deepEqual(await out1("print(len(b'ab'), b'ab'[0], b'ab'[-1])"), ["2 97 98"]);
  assert.deepEqual(await out1("print(b'abc'[1:], b'abc'[::-1])"), ["b'bc' b'cba'"]);
  assert.deepEqual(await out1("print(list(b'ab'), sum(b'\\x01\\x02'))"), ["[97, 98] 3"]);
  assert.deepEqual(await out1("print(65 in b'ABC', b'BC' in b'ABCD', 200 in b'ABC')"), ["True True False"]);
  assert.deepEqual(await out1("print(b'ab' == bytearray(b'ab'), b'ab' < b'ac')"), ["True True"]);
  assert.deepEqual(await out1("print(sorted(b'cba'))"), ["[97, 98, 99]"]);
  await errKind("print(b'ab'[5])", "IndexError");
});

test("bytes constructor errors", async () => {
  await errKind("print(bytes('ab'))", "TypeError"); // エンコーディングなしの文字列
  await errKind("print(bytes([256]))", "ValueError");
  await errKind("print(bytes([-1]))", "ValueError");
  await errKind("print(bytes(-1))", "ValueError");
  await errKind("b = b'ab'\nb[0] = 65", "TypeError"); // 不変
});

/* ---------- bytearray ---------- */

test("bytearray is mutable via item assignment and methods", async () => {
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nba[0] = 65\nprint(ba)"), ["bytearray(b'Ab')"]);
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nba.append(99)\nba.extend(b'd')\nprint(ba)"), ["bytearray(b'abcd')"]);
  assert.deepEqual(await out1("ba = bytearray(b'abc')\nprint(ba.pop(), ba)"), ["99 bytearray(b'ab')"]);
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nba += b'cd'\nprint(ba)"), ["bytearray(b'abcd')"]);
  await errKind("ba = bytearray(b'ab')\nba[0] = 256", "ValueError");
  await errKind("print({bytearray(b'a'): 1})", "TypeError"); // ハッシュ不可
});

test("bytearray resize and take_bytes (3.14/3.15, docs-based)", async () => {
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nba.resize(4)\nprint(ba)"), ["bytearray(b'ab\\x00\\x00')"]);
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nba.resize(1)\nprint(ba)"), ["bytearray(b'a')"]);
  assert.deepEqual(await out1("ba = bytearray(b'abcd')\nprint(ba.take_bytes(2), ba)"), ["b'ab' bytearray(b'cd')"]);
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nprint(ba.take_bytes(), ba)"), ["b'ab' bytearray(b'')"]);
  await errKind("ba = bytearray(b'ab')\nba.resize(-1)", "ValueError");
});

/* ---------- bytes/bytearray methods ---------- */

test("bytes methods: search family", async () => {
  assert.deepEqual(await out1("print(b'hello'.find(b'l'), b'hello'.rfind(b'l'), b'hello'.count(b'l'))"), ["2 3 2"]);
  assert.deepEqual(await out1("print(b'hello'.find(108), b'hello'.count(108))"), ["2 2"]);
  assert.deepEqual(await out1("print(b'hello'.find(b'z'))"), ["-1"]);
  assert.deepEqual(await out1("print(b'abc'.startswith((b'x', b'ab')), b'abc'.endswith(b'bc'))"), ["True True"]);
  await errKind("print(b'hello'.index(b'z'))", "ValueError");
  await errKind("print(b'hello'.rindex(b'z'))", "ValueError");
});

test("bytes methods: split/join/replace/partition/strip family", async () => {
  assert.deepEqual(await out1("print(b'a,b,c'.split(b','), b'a b'.split())"), ["[b'a', b'b', b'c'] [b'a', b'b']"]);
  assert.deepEqual(await out1("print(b'a,b,c'.rsplit(b',', 1))"), ["[b'a,b', b'c']"]);
  assert.deepEqual(await out1("print(b'-'.join([b'a', b'b']))"), ["b'a-b'"]);
  assert.deepEqual(await out1("print(b'aab'.replace(b'a', b'x', 1), b'a-b'.partition(b'-'), b'a-b-c'.rpartition(b'-'))"), ["b'xab' (b'a', b'-', b'b') (b'a-b', b'-', b'c')"]);
  assert.deepEqual(await out1("print(b'  ab '.strip(), b'xxabxx'.strip(b'x'))"), ["b'ab' b'ab'"]);
  assert.deepEqual(await out1("print(b'hello'.removeprefix(b'he'), b'hello'.removesuffix(b'lo'))"), ["b'llo' b'hel'"]);
  assert.deepEqual(await out1("print(b'a\\nb'.splitlines(), b'ab'.center(6, b'*'), b'-42'.zfill(5))"), ["[b'a', b'b'] b'**ab**' b'-0042'"]);
});

test("bytes methods: case/classify family", async () => {
  assert.deepEqual(await out1("print(b'AbC'.lower(), b'AbC'.upper(), b'AbC'.swapcase(), b'aBC'.capitalize())"), ["b'abc' b'ABC' b'aBc' b'Abc'"]);
  assert.deepEqual(await out1("print(b'hello world'.title(), b'Hello World'.istitle())"), ["b'Hello World' True"]);
  assert.deepEqual(await out1("print(b'Ab1'.isalnum(), b'42'.isdigit(), b'ab'.isascii(), b'\\xff'.isascii())"), ["True True True False"]);
  assert.deepEqual(await out1("print(b''.isdigit(), b''.isascii(), b' \\t'.isspace())"), ["False True True"]);
  assert.deepEqual(await out1("print(b'a\\tb'.expandtabs(4))"), ["b'a   b'"]);
});

test("bytes hex/fromhex/maketrans/translate", async () => {
  assert.deepEqual(await out1("print(b'\\x01\\xab'.hex(), b'\\x01\\x02\\x03\\x04\\x05'.hex(':', 2))"), ["01ab 01:0203:0405"]);
  assert.deepEqual(await out1("print(bytes.fromhex('61 62'), bytearray.fromhex('ff'))"), ["b'ab' bytearray(b'\\xff')"]);
  assert.deepEqual(await out1("print(b'ab'.translate(bytes.maketrans(b'a', b'A')))"), ["b'Ab'"]);
  assert.deepEqual(await out1("print(b'ab'.translate(None, b'b'))"), ["b'a'"]);
  await errKind("print(bytes.fromhex('6'))", "ValueError");
  await errKind("print(bytes.fromhex('zz'))", "ValueError");
});

/* ---------- encode/decode ---------- */

test("encode/decode with utf-8/ascii/latin-1 and error modes", async () => {
  assert.deepEqual(await out1("print('é'.encode('utf-8'), b'\\xc3\\xa9'.decode('utf-8'))"), ["b'\\xc3\\xa9' é"]);
  assert.deepEqual(await out1("print(b'\\xff'.decode('latin-1'), 'ÿ'.encode('latin-1'))"), ["ÿ b'\\xff'"]);
  assert.deepEqual(await out1("print(b'\\xff'.decode('utf-8', 'replace'))"), ["�"]);
  assert.deepEqual(await out1("print(b'a\\xffb'.decode('utf-8', 'ignore'))"), ["ab"]);
  assert.deepEqual(await out1("print('é'.encode('ascii', 'replace'), 'é'.encode('ascii', 'ignore'))"), ["b'?' b''"]);
  await errKind("print(b'\\xff'.decode())", "UnicodeDecodeError");
  await errKind("print('é'.encode('ascii'))", "UnicodeEncodeError");
  await errKind("print('ab'.encode('utf-16'))", "未対応");
  await errKind("print('ab'.encode('no-such-enc'))", "LookupError");
});

/* ---------- str 追加メソッド ---------- */

test("str casefold uses the CPython difference table", async () => {
  assert.deepEqual(await out1("print('Straße'.casefold(), 'ß'.casefold(), 'ﬀ'.casefold(), 'ﬁ'.casefold())"), ["strasse ss ff fi"]);
  assert.deepEqual(await out1("print('İ'.casefold(), 'ΣΣ'.casefold(), 'ǅ'.casefold() if False else 'ok')"), ["i̇ σσ ok"]);
  assert.deepEqual(await out1("print('ﬀ'.upper())"), ["FF"]); // 既存 upper との不整合がないこと
});

test("str padding/partition/prefix/splitlines/swapcase/translate", async () => {
  assert.deepEqual(await out1("print('ab'.center(6, '*'), 'ab'.ljust(5, '.'), 'ab'.rjust(5, '.'))"), ["**ab** ab... ...ab"]);
  assert.deepEqual(await out1("print('-42'.zfill(5), '42'.zfill(5))"), ["-0042 00042"]);
  assert.deepEqual(await out1("print('a-b-c'.partition('-'), 'a-b-c'.rpartition('-'), 'x'.partition('-'))"), ["('a', '-', 'b-c') ('a-b', '-', 'c') ('x', '', '')"]);
  assert.deepEqual(await out1("print('test.py'.removeprefix('test'), 'test.py'.removesuffix('.py'))"), [".py test"]);
  assert.deepEqual(await out1("print('a\\nb\\r\\nc'.splitlines(), 'a\\nb\\n'.splitlines(True))"), ["['a', 'b', 'c'] ['a\\n', 'b\\n']"]);
  assert.deepEqual(await out1("print('AbC'.swapcase(), 'a\\tb'.expandtabs(4))"), ["aBc a   b"]);
  assert.deepEqual(await out1("print('abc'.translate(str.maketrans('a', 'A', 'c')))"), ["Ab"]);
  assert.deepEqual(await out1("print('abc'.translate({97: 'X', 98: None}))"), ["Xc"]);
  await errKind("print('a'.partition(''))", "ValueError");
});

test("str istitle/isprintable", async () => {
  assert.deepEqual(await out1("print('Hello World'.istitle(), 'Hello world'.istitle(), '123'.istitle())"), ["True False False"]);
  assert.deepEqual(await out1("print('a b'.isprintable(), 'a\\tb'.isprintable(), ''.isprintable())"), ["True False True"]);
});

test("str.format and format_map", async () => {
  assert.deepEqual(await out1("print('{} + {} = {}'.format(2, 3, 5))"), ["2 + 3 = 5"]);
  assert.deepEqual(await out1("print('{1} {0}'.format('a', 'b'), '{x}'.format(x=9))"), ["b a 9"]);
  assert.deepEqual(await out1("print('{:>6}|{:.2f}|{:+d}'.format('ab', 1.5, 3))"), ["    ab|1.50|+3"]);
  assert.deepEqual(await out1("print('{!r}'.format('a'), '{{x}}'.format())"), ["'a' {x}"]);
  assert.deepEqual(await out1("print('{0[1]}'.format([10, 20]), '{0.real}'.format(1 + 2j))"), ["20 1.0"]);
  assert.deepEqual(await out1("print('{x} 円'.format_map({'x': 120}))"), ["120 円"]);
  await errKind("print('{}'.format())", "IndexError");
  await errKind("print('{0} {}'.format('a'))", "ValueError");
  await errKind("print('{y}'.format_map({'x': 1}))", "KeyError");
});

test("str.maketrans forms", async () => {
  assert.deepEqual(await out1("print(str.maketrans('a', 'b', 'c'))"), ["{97: 'b', 99: None}"]);
  assert.deepEqual(await out1("print(str.maketrans({'a': 'XY'}))"), ["{97: 'XY'}"]);
  await errKind("print(str.maketrans('ab', 'c'))", "ValueError");
});

/* ---------- 数値型の追加 ---------- */

test("int methods", async () => {
  assert.deepEqual(await out1("print((37).bit_length(), (0).bit_length(), (-5).bit_count(), (13).bit_count())"), ["6 0 2 3"]);
  assert.deepEqual(await out1("print((258).to_bytes(2, 'big'), (255).to_bytes(2, 'little'))"), ["b'\\x01\\x02' b'\\xff\\x00'"]);
  assert.deepEqual(await out1("print((-5).to_bytes(2, 'big', signed=True), int.from_bytes(b'\\xff', 'big', signed=True))"), ["b'\\xff\\xfb' -1"]);
  assert.deepEqual(await out1("print(int.from_bytes(bytearray(b'\\x01\\x00'), 'little'))"), ["1"]);
  assert.deepEqual(await out1("print((7).as_integer_ratio(), (7).is_integer(), (True).bit_count())"), ["(7, 1) True 1"]);
  await errKind("print((256).to_bytes(1, 'big'))", "OverflowError");
  await errKind("print((-1).to_bytes(2, 'big'))", "OverflowError");
});

test("float methods", async () => {
  assert.deepEqual(await out1("print((1.5).hex(), (0.0).hex(), (-2.5).hex())"), ["0x1.8000000000000p+0 0x0.0p+0 -0x1.4000000000000p+1"]);
  assert.deepEqual(await out1("print(float.fromhex('0x1.8p+0'), float.fromhex('0x1.8'), float.fromhex('1.5'))"), ["1.5 1.5 1.5"]);
  assert.deepEqual(await out1("print((0.5).as_integer_ratio(), (-0.25).as_integer_ratio(), (1.5).as_integer_ratio())"), ["(1, 2) (-1, 4) (3, 2)"]);
  // (0.1) の正確な比は CPython では (3602879701896397, 36028797018963968) だが、
  // 分母 2^55 はエンジン全体の「安全な整数」範囲を超えるため BIG 規約に従う（分子は正確）
  assert.deepEqual(await out1("print((0.1).as_integer_ratio())"), ["(3602879701896397, 実行時に決まる：とても大きな整数・この説明では正確に計算しません)"]);
  assert.deepEqual(await out1("print((2.0).is_integer(), (2.5).is_integer(), float.from_number(3))"), ["True False 3.0"]);
  await errKind("print(float.fromhex('xyz'))", "ValueError");
});

test("int/float attribute items resolve via numeric attribute path", async () => {
  assert.deepEqual(await out1("print((5).numerator, (5).denominator, (5).real, (5).imag)"), ["5 1 5 0"]);
  assert.deepEqual(await out1("print((5.5).real, (5.5).imag)"), ["5.5 0.0"]);
  await errKind("print((5.5).numerator)", "AttributeError"); // float には存在しない（項目も作らない）
});

/* ---------- complex ---------- */

test("complex value model: constructor, literals, arithmetic, repr", async () => {
  assert.deepEqual(await out1("print(complex(1, 2), complex('1+2j'), complex('2j'), complex())"), ["(1+2j) (1+2j) 2j 0j"]);
  assert.deepEqual(await out1("print(1 + 2j, (1 + 2j) * (3 + 4j), (1 + 1j) / 2, (2 + 3j) ** 2)"), ["(1+2j) (-5+10j) (0.5+0.5j) (-5+12j)"]);
  assert.deepEqual(await out1("print(2j, -2j, complex(0, -2), 1.5 + 0j)"), ["2j (-0-2j) -2j (1.5+0j)"]);
  assert.deepEqual(await out1("print((3 + 4j).real, (3 + 4j).imag, (3 + 4j).conjugate())"), ["3.0 4.0 (3-4j)"]);
  assert.deepEqual(await out1("print(1 + 2j == complex(1, 2), 1 + 2j == 1, {1 + 2j: 'c'}[1 + 2j])"), ["True False c"]);
  assert.deepEqual(await out1("print(complex.from_number(2), str(1 + 2j), type(1 + 2j))"), ["(2+0j) (1+2j) <class 'complex'>"]);
  await errKind("print(1 + 2j < 3)", "TypeError");
  await errKind("print(complex('abc'))", "ValueError");
  await errKind("print((1 + 2j) / 0)", "ZeroDivisionError");
});

test("format of complex values", async () => {
  assert.deepEqual(await out1("print(format(1 + 2j, ''), format(1.5 + 2.5j, '.2f'))"), ["(1+2j) 1.50+2.50j"]);
  assert.deepEqual(await out1("print('{:>10}'.format(1 + 2j))"), ["    (1+2j)"]);
});

/* ---------- コレクション系の追加 ---------- */

test("set isdisjoint/issubset/issuperset accept any iterable", async () => {
  assert.deepEqual(await out1("print({1, 2}.isdisjoint({3}), {1, 2}.isdisjoint([2]))"), ["True False"]);
  assert.deepEqual(await out1("print({1, 2}.issubset([1, 2, 3]), {1, 2, 3}.issuperset('12' if False else [1, 2]))"), ["True True"]);
});

test("frozenset value model and methods", async () => {
  assert.deepEqual(await out1("print(frozenset([1, 2, 2]), frozenset())"), ["frozenset({1, 2}) frozenset()"]);
  assert.deepEqual(await out1("print(frozenset([1, 2]).union([3]), frozenset([1, 2, 3]).intersection([2, 3]))"), ["frozenset({1, 2, 3}) frozenset({2, 3})"]);
  assert.deepEqual(await out1("print(frozenset([1, 2]).difference([2]), frozenset([1, 2]).symmetric_difference([2, 3]), frozenset([1]).copy())"), ["frozenset({1}) frozenset({1, 3}) frozenset({1})"]);
  assert.deepEqual(await out1("print(frozenset([1, 2]).issubset([1, 2, 3]), frozenset([1, 2]).isdisjoint({9}))"), ["True True"]);
  assert.deepEqual(await out1("print({frozenset([1]): 'x'}[frozenset([1])], len(frozenset('ab')))"), ["x 2"]);
  assert.deepEqual(await out1("print(frozenset([1]) | {2}, {1} | frozenset([2]))"), ["frozenset({1, 2}) {1, 2}"]);
  await errKind("fs = frozenset([1])\nfs.add(2)", "AttributeError");
  await errKind("fs = frozenset([1])\nfs.clear()", "AttributeError");
});

test("dict.fromkeys and frozendict", async () => {
  assert.deepEqual(await out1("print(dict.fromkeys(['a', 'b'], 0), dict.fromkeys('ab'))"), ["{'a': 0, 'b': 0} {'a': None, 'b': None}"]);
  assert.deepEqual(await out1("fd = frozendict({'a': 1})\nprint(fd['a'], fd.get('b', 9), len(fd), list(fd))"), ["1 9 1 ['a']"]);
  assert.deepEqual(await out1("print(frozendict.fromkeys(['x'], 5), frozendict(a=1))"), ["frozendict({'x': 5}) frozendict({'a': 1})"]);
  assert.deepEqual(await out1("print(frozendict({'a': 1}) == {'a': 1}, dict(frozendict({'a': 1})))"), ["True {'a': 1}"]);
  assert.deepEqual(await out1("print(frozendict({'a': 1}) | {'b': 2})"), ["frozendict({'a': 1, 'b': 2})"]);
  await errKind("fd = frozendict({'a': 1})\nfd['b'] = 2", "TypeError");
  await errKind("fd = frozendict({'a': 1})\nfd.update({'b': 2})", "AttributeError");
  await errKind("fd = frozendict({'a': 1})\nprint(fd['zz'])", "KeyError");
});

test("range attributes and slice value model", async () => {
  assert.deepEqual(await out1("r = range(1, 9, 2)\nprint(r.start, r.stop, r.step)"), ["1 9 2"]);
  assert.deepEqual(await out1("s = slice(1, 10, 2)\nprint(s.start, s.stop, s.step, s.indices(20))"), ["1 10 2 (1, 10, 2)"]);
  assert.deepEqual(await out1("print(slice(3).start, slice(3).stop, slice(None, 3).indices(10))"), ["None 3 (0, 3, 1)"]);
  assert.deepEqual(await out1("xs = [0, 1, 2, 3, 4, 5]\ns = slice(1, 4)\nprint(xs[s], 'abcd'[s])"), ["[1, 2, 3] bcd"]);
  assert.deepEqual(await out1("print(b'abcdef'[slice(1, 3)], slice(1, 2) == slice(1, 2))"), ["b'bc' True"]);
  await errKind("print(slice(1, 2, 0).indices(5))", "ValueError");
});

/* ---------- memoryview ---------- */

test("memoryview value model, attributes and methods", async () => {
  assert.deepEqual(await out1("mv = memoryview(b'ab')\nprint(mv[0], mv.tolist(), mv.tobytes(), mv.hex())"), ["97 [97, 98] b'ab' 6162"]);
  assert.deepEqual(await out1("mv = memoryview(b'abc')\nprint(mv.readonly, mv.nbytes, mv.format, mv.itemsize, mv.ndim)"), ["True 3 B 1 1"]);
  assert.deepEqual(await out1("mv = memoryview(b'abc')\nprint(mv.shape, mv.strides, mv.suboffsets, mv.obj)"), ["(3,) (1,) () b'abc'"]);
  assert.deepEqual(await out1("mv = memoryview(b'abc')\nprint(mv.c_contiguous, mv.f_contiguous, mv.contiguous, len(mv), list(mv))"), ["True True True 3 [97, 98, 99]"]);
  // B6監査D8是正：memoryview.count/index は要素意味論（docs 3.14／gh-125420）。バイト列引数は要素一致にならず count は 0
  assert.deepEqual(await out1("print(memoryview(b'hello').count(b'l'), memoryview(b'hello').index(101))"), ["0 1"]);
  assert.deepEqual(await out1("print(memoryview(b'ab') == b'ab', memoryview(b'ab')[1:].tolist())"), ["True [98]"]);
});

test("memoryview shares storage with bytearray; readonly and release rules", async () => {
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nmv = memoryview(ba)\nmv[0] = 65\nprint(ba)"), ["bytearray(b'Ab')"]);
  assert.deepEqual(await out1("ba = bytearray(b'ab')\nmv = memoryview(ba)\nba[1] = 66\nprint(mv.tolist())"), ["[97, 66]"]);
  assert.deepEqual(await out1("print(memoryview(bytearray(b'a')).toreadonly().readonly)"), ["True"]);
  await errKind("mv = memoryview(b'ab')\nmv[0] = 65", "TypeError");
  await errKind("mv = memoryview(b'ab')\nmv.release()\nprint(mv[0])", "ValueError");
  await errKind("mv = memoryview(b'ab')\nmv.release()\nprint(mv.tolist())", "ValueError");
  await errKind("print(memoryview(b'ab').cast('h'))", "未対応");
  assert.deepEqual(await out1("print(memoryview(b'ab').cast('B').tolist())"), ["[97, 98]"]);
  await errKind("print(memoryview(123))", "TypeError");
});

/* ---------- リファレンス項目の実走検証（F-01/F-04） ---------- */

test("all ref-types-advanced examples run and match expected", async () => {
  assert.ok(typeItems.length >= 170, "items: " + typeItems.length);
  for (const it of typeItems) {
    assert.equal(it.status, "supported", it.id);
    const r = await run(it.example);
    assert.deepEqual(errors(r), [], it.id + ": " + JSON.stringify(errors(r)));
    assert.equal(r.paths.length, 1, it.id);
    const got = outputs(r)[0].join("\n");
    assert.equal(got, it.expected, it.id);
  }
});

test("str.format advanced item overwrites the base id", () => {
  const f = typeItems.find((x) => x.id === "str.format");
  assert.ok(f);
  assert.equal(f.status, "supported");
});
