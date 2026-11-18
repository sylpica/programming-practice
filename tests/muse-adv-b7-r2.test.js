/* 高度モード B7 追補 R2（G7/G3 例外属性・csv 是正）の検証テスト。
 * 対象: (1) csv.reader の反復（next/iter/for/list の消費位置共有）と
 * line_num（初期値0・逐次更新）、(2) codecs.codecs.* 2件の unverified 化、
 * (3) gettext の unverified caution 是正、(4) re.PatternError の属性
 * （msg/pattern/pos/lineno/colno）、(5) json.JSONDecodeError の属性
 * （msg/doc/pos/lineno/colno）。
 * 期待値はすべて CPython 3.12.3 実走で照合した値。
 * 実行: node --test tests/muse-adv-b7-r2.test.js */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import '../js/types/python/advanced-engine.js';
import { referenceAdvanced as refCsv } from '../js/types/python/reference-advanced-csv.js';
import { referenceAdvanced as refCodecs } from '../js/types/python/reference-advanced-codecs.js';
import { referenceAdvanced as refGettext } from '../js/types/python/reference-advanced-gettext.js';
import { referenceAdvanced as refJson } from '../js/types/python/reference-advanced-json.js';
import { referenceAdvanced as refRe } from '../js/types/python/reference-advanced-re.js';

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

/* ---------- (1) csv.reader の反復と line_num ---------- */
test('R2 csv: next() と line_num の逐次更新（初期値0）', async () => {
  await expectOut(
    "import csv\nr = csv.reader(['a,b', 'c,d'])\nprint(r.line_num)\nprint(next(r))\nprint(r.line_num)\nprint(next(r))\nprint(r.line_num)",
    ['0', "['a', 'b']", '1', "['c', 'd']", '2']);
  await expectOut(
    "import csv\nr = csv.reader(['a,b', 'c,d'])\nprint(next(r, 'end'))\nprint(next(r, 'end'))\nprint(next(r, 'end'))\nprint(r.line_num)",
    ["['a', 'b']", "['c', 'd']", 'end', '2']);
  await expectOut(
    "import csv\nr = csv.reader(['a,b', 'c,d'])\ntry:\n    next(r)\n    next(r)\n    next(r)\nexcept StopIteration:\n    print('stop')",
    'stop');
  await expectErr("import csv\nr = csv.reader(['a'])\nnext(r)\nnext(r)", /StopIteration/);
});

test('R2 csv: next/for/list が消費位置を共有する', async () => {
  await expectOut(
    "import csv\nr = csv.reader(['a', 'b', 'c'])\nprint(next(r))\nfor row in r:\n    print(row)\nprint(r.line_num)",
    ["['a']", "['b']", "['c']", '3']);
  await expectOut(
    "import csv\nr = csv.reader(['a', 'b', 'c'])\nprint(next(r))\nprint(list(r))\nprint(list(r))\nprint(r.line_num)",
    ["['a']", "[['b'], ['c']]", '[]', '3']);
  await expectOut(
    "import csv\nr = csv.reader(['a', 'b'])\nfor row in r:\n    print(row)\n    break\nprint(r.line_num)\nprint(next(r))",
    ["['a']", '1', "['b']"]);
  await expectOut(
    "import csv\nr = csv.reader(['a,b'])\nprint(iter(r) is r)\nprint(r.__next__())\nprint(r.line_num)\nprint(r.dialect.delimiter)",
    ['True', "['a', 'b']", '1', ',']);
});

test('R2 csv: line_num は継続行と空行を数える', async () => {
  // 引用フィールド内の改行は継続行として line_num に数える（CPython 実走）。
  await expectOut(
    "import csv\nr = csv.reader(['\"x', 'y\",2', 'z,3'])\nprint(r.line_num)\nprint(next(r))\nprint(r.line_num)\nprint(next(r))\nprint(r.line_num)",
    ['0', "['x\\ny', '2']", '2', "['z', '3']", '3']);
  await expectOut(
    "import csv\nr = csv.reader(['a', '', 'b'])\nprint(next(r), r.line_num)\nprint(next(r), r.line_num)\nprint(next(r), r.line_num)",
    ["['a'] 1", '[] 2', "['b'] 3"]);
  await expectOut("import csv\nr = csv.reader([])\nprint(r.line_num, list(r))", '0 []');
  // 従来の一括読み取りも不変。
  await expectOut("import csv\nprint(list(csv.reader(['a,b', '\"x,y\",2'])))", "[['a', 'b'], ['x,y', '2']]");
  await expectOut("import csv\nprint(list(csv.DictReader(['a,b', '1,2'])))", "[{'a': '1', 'b': '2'}]");
});

test('R2 csv: line_num リファレンス項目の是正', () => {
  const it = refCsv.find((x) => x.name === 'csv.csvreader.line_num');
  assert.equal(it.status, 'supported');
  assert.equal(it.caution, '');
  assert.match(it.description, /初期値は 0/);
  const nx = refCsv.find((x) => x.name === 'csv.csvreader.__next__');
  assert.equal(nx.status, 'supported');
});

/* ---------- (2) codecs.codecs.* の status 是正 ---------- */
test('R2 codecs: codecs.codecs.* 2件は unverified で理由を明記', () => {
  for (const name of ['codecs.codecs.escape_decode', 'codecs.codecs.escape_encode']) {
    const it = refCodecs.find((x) => x.name === name);
    assert.ok(it, name + ' が無い');
    assert.equal(it.status, 'unverified', name);
    assert.match(it.caution, /実在しない/, name);
    assert.match(it.caution, /未検証/, name);
    assert.match(it.caution, /codecs\.escape_(decode|encode) は実装済み/, name);
  }
});

test('R2 codecs: 実在名 codecs.escape_decode/escape_encode は動作する', async () => {
  await expectOut(
    "import codecs, binascii\nprint(codecs.escape_decode(binascii.unhexlify('615c6e62')))",
    "(b'a\\nb', 4)");
  await expectOut(
    "import codecs, binascii\nprint(codecs.escape_encode(binascii.unhexlify('610a62')))",
    "(b'a\\\\nb', 3)");
});

/* ---------- (3) gettext の caution 是正 ---------- */
test('R2 gettext: unverified 全件の caution に「未検証」を含む', () => {
  const unv = refGettext.filter((x) => x.status === 'unverified');
  assert.ok(unv.length > 0);
  for (const it of unv) assert.match(it.caution, /未検証/, it.name + ' の caution に未検証が無い');
  const tr = refGettext.find((x) => x.name === 'gettext.translation');
  assert.equal(tr.status, 'unverified');
  assert.match(tr.caution, /未検証/);
});

/* ---------- (4) re.PatternError の属性 ---------- */
const RE_CASES = [
  // [pattern, msg, pos, lineno, colno]（CPython 3.12.3 実走）
  ['(', 'missing ), unterminated subpattern', 0, 1, 1],
  ['a**', 'multiple repeat', 2, 1, 3],
  ['[a-', 'unterminated character set', 0, 1, 1],
  ['a{2,1}', 'min repeat greater than max repeat', 2, 1, 3],
  ['\\q', 'bad escape \\q', 0, 1, 1],
  ['*a', 'nothing to repeat', 0, 1, 1],
  ['a\\', 'bad escape (end of pattern)', 1, 1, 2],
  ['(?P<x>a)(?P<x>b)', "redefinition of group name 'x' as group 2; was group 1", 12, 1, 13],
];
test('R2 re: PatternError の属性が CPython どおり読める', async () => {
  for (const [pat, msg, pos, lineno, colno] of RE_CASES) {
    const code = 'import re\ntry:\n    re.compile(' + JSON.stringify(pat) + ')\nexcept re.error as e:\n'
      + "    print(e.msg + '|' + e.pattern + '|' + str(e.pos) + '|' + str(e.lineno) + '|' + str(e.colno))\n"
      + '    print(str(e))';
    await expectOut(code, [
      msg + '|' + pat + '|' + pos + '|' + lineno + '|' + colno,
      msg + ' at position ' + pos,
    ]);
  }
  // ValueError 経由の捕捉でも属性が読める。
  await expectOut(
    "import re\ntry:\n    re.compile('(')\nexcept ValueError as e:\n    print(e.msg, e.pos)",
    'missing ), unterminated subpattern 0');
  // 非 BMP 文字でも pos はコードポイント単位で CPython と一致する。
  await expectOut(
    "import re\ntry:\n    re.compile('\\U0001F600**')\nexcept re.error as e:\n    print(e.msg, e.pos, e.lineno, e.colno)",
    'multiple repeat 2 1 3');
  // 置換テンプレートの PatternError は pattern がテンプレート文字列になる。
  await expectOut(
    "import re\ntry:\n    re.sub('a', '\\\\q', 'a')\nexcept re.error as e:\n    print(e.msg + '|' + e.pattern + '|' + str(e.pos))",
    'bad escape \\q|\\q|0');
  await expectOut(
    "import re\ntry:\n    re.sub('a', '\\\\g', 'a')\nexcept re.error as e:\n    print(e.msg + '|' + e.pattern + '|' + str(e.pos))",
    'missing <|\\g|2');
  await expectOut(
    "import re\ntry:\n    re.sub('a', '\\\\g<abc', 'a')\nexcept re.error as e:\n    print(e.msg + '|' + e.pattern + '|' + str(e.pos))",
    'missing >, unterminated name|\\g<abc|3');
});

test('R2 re: PatternError 属性のリファレンス項目は supported', () => {
  for (const name of ['re.PatternError.msg', 're.PatternError.pattern', 're.PatternError.pos', 're.PatternError.lineno', 're.PatternError.colno']) {
    const it = refRe.find((x) => x.name === name);
    assert.equal(it.status, 'supported', name);
    assert.equal(it.caution, '', name);
  }
});

/* ---------- (5) json.JSONDecodeError の属性 ---------- */
const JSON_CASES = [
  // [doc, msg, pos, lineno, colno]（CPython 3.12.3 実走）
  ['{bad', 'Expecting property name enclosed in double quotes', 1, 1, 2],
  ['[1,]', 'Expecting value', 3, 1, 4],
  ['', 'Expecting value', 0, 1, 1],
  ['tru', 'Expecting value', 0, 1, 1],
  ['{', 'Expecting property name enclosed in double quotes', 1, 1, 2],
  ['[1] x', 'Extra data', 4, 1, 5],
  ['{"a":01}', "Expecting ',' delimiter", 6, 1, 7],
  ['{\n "a": bad}', 'Expecting value', 8, 2, 7],
  ['"abc', 'Unterminated string starting at', 0, 1, 1],
  ['[1, 2', "Expecting ',' delimiter", 5, 1, 6],
  ['{"a": }', 'Expecting value', 6, 1, 7],
  ['{"a":1,}', 'Expecting property name enclosed in double quotes', 7, 1, 8],
  ['"a\\q"', 'Invalid \\escape', 2, 1, 3],
  ['"a\\u12"', 'Invalid \\uXXXX escape', 3, 1, 4],
  ['"\\u12"', 'Invalid \\uXXXX escape', 2, 1, 3],
];
test('R2 json: JSONDecodeError の属性が CPython どおり読める', async () => {
  for (const [doc, msg, pos, lineno, colno] of JSON_CASES) {
    const code = 'import json\ntry:\n    json.loads(' + JSON.stringify(doc) + ')\nexcept json.JSONDecodeError as e:\n'
      + "    print(e.msg + '|' + str(e.pos) + '|' + str(e.lineno) + '|' + str(e.colno))\n"
      + '    print(e.doc == ' + JSON.stringify(doc) + ')\n'
      + '    print(str(e))';
    await expectOut(code, [
      msg + '|' + pos + '|' + lineno + '|' + colno,
      'True',
      msg + ': line ' + lineno + ' column ' + colno + ' (char ' + pos + ')',
    ]);
  }
  // 非 BMP 文字でも pos はコードポイント単位で CPython と一致する。
  await expectOut(
    "import json\ntry:\n    json.loads('[\"\\U0001F600\",]')\nexcept json.JSONDecodeError as e:\n    print(e.msg, e.pos, e.lineno, e.colno)",
    'Expecting value 5 1 6');
  // JSONDecoder.decode 経由でも属性が付く。
  await expectOut(
    "import json\ntry:\n    json.JSONDecoder().decode('[1,]')\nexcept json.JSONDecodeError as e:\n    print(e.msg, e.pos, e.lineno, e.colno)",
    'Expecting value 3 1 4');
  // ValueError 経由の捕捉でも属性が読める（JSONDecodeError は ValueError のサブクラス）。
  await expectOut(
    "import json\ntry:\n    json.loads('tru')\nexcept ValueError as e:\n    print(e.msg, e.doc, e.pos)",
    'Expecting value tru 0');
});

test('R2 json: JSONDecodeError 属性のリファレンス項目は supported', () => {
  for (const name of ['json.JSONDecodeError.msg', 'json.JSONDecodeError.doc', 'json.JSONDecodeError.pos', 'json.JSONDecodeError.lineno', 'json.JSONDecodeError.colno']) {
    const it = refJson.find((x) => x.name === name);
    assert.equal(it.status, 'supported', name);
    assert.equal(it.caution, '', name);
  }
  const parent = refJson.find((x) => x.name === 'json.JSONDecodeError');
  assert.equal(parent.status, 'supported');
  assert.match(parent.caution, /属性を持つ/);
});
