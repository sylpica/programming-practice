import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

// R22 リファレンス完全性修正（ImageJ 担当分）の検証。
// 第1層41件＋第2層 Dialog.* 18件＝59件が項目として存在し、supported で、
// 使用例がエンジンでエラーなく実行でき、コード内での使用が項目に解決されること。
const d = getDefinition('imagej');
const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const errors = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const byName = new Map(d.reference.map((r) => [r.name, r]));

const LAYER1 = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'lastIndexOf', 'trim', 'toLowerCase', 'toUpperCase', 'charCodeAt', 'fromCharCode', 'toString',
  'getBoundingRect',
  'Math.abs', 'Math.sqrt', 'Math.exp', 'Math.log', 'Math.log10', 'Math.floor',
  'Math.sin', 'Math.cos', 'Math.tan', 'Math.asin', 'Math.acos', 'Math.atan',
  'Math.sinh', 'Math.cosh', 'Math.tanh', 'Math.pow', 'Math.atan2', 'Math.sqr', 'Math.round',
  'String.trim', 'String.join', 'String.pad',
  'contains', 'charAt', 'matches',
  'PI', 'File.separator',
];
const LAYER2_DIALOG = [
  'Dialog.addCheckbox', 'Dialog.addCheckboxGroup', 'Dialog.addDirectory', 'Dialog.addFile',
  'Dialog.addHelp', 'Dialog.addImage', 'Dialog.addImageChoice', 'Dialog.addMessage',
  'Dialog.addRadioButtonGroup', 'Dialog.addSlider', 'Dialog.addToSameRow',
  'Dialog.createNonBlocking', 'Dialog.getCheckbox', 'Dialog.getImageChoice',
  'Dialog.getLocation', 'Dialog.getRadioButton', 'Dialog.setInsets', 'Dialog.setLocation',
];
const ADDED = [...LAYER1, ...LAYER2_DIALOG];
// s.メソッド形式の3件は scan の正規表現ではレシーバ付きで捕捉されるため、
// アプリ本体（js/app.js）の resolveReferenceName と同じ接尾辞解決で検証する。
const METHODS = ['contains', 'charAt', 'matches'];
const CALL_FORM = ADDED.filter((n) => !METHODS.includes(n) && n !== 'PI' && n !== 'File.separator');

function resolveReferenceName(name, referenceNames) {
  if (referenceNames.indexOf(name) >= 0) return name;
  const parts = name.split('.');
  for (let i = 1; i < parts.length; i++) {
    const candidate = parts.slice(i).join('.');
    if (referenceNames.indexOf(candidate) >= 0) return candidate;
  }
  return null;
}

test('ref-imagej: 追加59件がすべて存在し supported で出典を持つ', () => {
  assert.equal(ADDED.length, 59);
  assert.equal(new Set(ADDED).size, 59);
  for (const name of ADDED) {
    const r = byName.get(name);
    assert.ok(r, `項目がありません: ${name}`);
    assert.equal(r.supported, true, `supported でありません: ${name}`);
    assert.ok(r.source && r.source.includes('imagej.net'), `出典がありません: ${name}`);
    assert.ok(r.description && r.returns && r.example, `必須フィールド不足: ${name}`);
  }
  assert.equal(d.reference.length, 200);
});

for (const name of ADDED) test(`ref-imagej runnable example: ${name}`, async () => {
  const r = await run(byName.get(name).example);
  assert.deepEqual(errors(r), [], `${name}: ${JSON.stringify(r)}`);
  assert.ok(r.paths.length, `${name}: パスがありません`);
});

for (const name of CALL_FORM) test(`ref-imagej scan resolves: ${name}`, () => {
  const found = d.scan(byName.get(name).example);
  assert.ok(found.includes(name), `${name} が scan で解決されません: ${JSON.stringify(found)}`);
});

for (const name of METHODS) test(`ref-imagej method resolves: ${name}`, () => {
  const names = d.reference.map((r) => r.name);
  // レシーバ付きの使用形（s.メソッド）が接尾辞解決で項目に届くこと
  assert.equal(resolveReferenceName('s.' + name, names), name);
  // 文字列リテラルをレシーバにした使用形は scan でも項目名として捕捉されること
  const literal = { contains: 'print("sample".contains("a"));', charAt: 'print("sample".charAt(0));', matches: 'print("abc".matches("a.*"));' }[name];
  assert.ok(d.scan(literal).includes(name), `${name} がリテラル形式の scan で解決されません`);
});

test('ref-imagej constants resolve by name: PI / File.separator', async () => {
  const names = d.reference.map((r) => r.name);
  assert.equal(resolveReferenceName('PI', names), 'PI');
  assert.equal(resolveReferenceName('File.separator', names), 'File.separator');
  const r = await run('print(PI);\nprint(File.separator);');
  assert.deepEqual(errors(r), []);
});

test('ref-imagej Dialog 項目は汎用モデルの正直な注意書きを持つ', () => {
  for (const name of LAYER2_DIALOG) {
    assert.match(byName.get(name).caution, /汎用モデルで受理され、値は実行時に決まる/, name);
  }
});

test('ref-imagej SIM_EXTRA のみの6件は項目化しない（非漏れ裁定）', () => {
  for (const name of ['getMetadata', 'setMetadata', 'isKeyDown', 'screenWidth', 'screenHeight', 'getBoolean']) {
    assert.ok(!byName.has(name), `${name} は項目化しない裁定です`);
  }
});
