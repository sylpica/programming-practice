// FIX-IJ-B: 簡易モード無傷の回帰テスト。
// このファイルは applyAdvancedEngine を呼ばない（プロセスが分かれるため、
// 高度有効化済みの lane-a3-ijb.test.js とは干渉しない）。
// 期待値は修正前の原ツリー（lane-a3-exec）で実測した基礎挙動そのもの:
// REF 拡張（REF_FNS への高度名の追加と readRef）は高度有効時にだけ効き、
// 簡易モードでは従来どおり未対応停止／未初期化変数エラーになること。
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

const d = getDefinition('imagej');
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const errText = (p) => ((p.error && p.error.message) || '') + '\n' + p.trace.map((t) => t.text).join('\n');

test('IJB-simple: toScaled は簡易モードでは従来どおり未対応で止まる', async () => {
  const r = await run('x = 10; toScaled(x); print(x);');
  assert.ok(errText(r.paths[0]).includes('未対応：toScaled'), errText(r.paths[0]));
});
test('IJB-simple: Roi.getFloatBounds は REF 拡張が効かず未初期化変数エラーになる', async () => {
  const r = await run('makeRectangle(3, 4, 10, 20); Roi.getFloatBounds(x, y, w, h); print(x);');
  assert.ok(errText(r.paths[0]).includes('変数 x は、まだ値が代入されていません'), errText(r.paths[0]));
});
test('IJB-simple: Plot.getLimits は REF 拡張が効かず未初期化変数エラーになる', async () => {
  const r = await run('Plot.getLimits(a, b, c, dd);');
  assert.ok(errText(r.paths[0]).includes('変数 a は、まだ値が代入されていません'), errText(r.paths[0]));
});
test('IJB-simple: 基礎 REF 関数 Roi.getBounds の簡易モード挙動も不変（未対応）', async () => {
  const r = await run('makeRectangle(3, 4, 10, 20); Roi.getBounds(x, y, w, h); print(x);');
  assert.ok(errText(r.paths[0]).includes('未対応：Roi.getBounds'), errText(r.paths[0]));
});
