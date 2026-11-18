// FIX-IJ-A（高度A3班・ImageJ純粋関数）: Array.findMaxima / Array.findMinima /
// Array.fourier の格上げ実装に対する回帰テスト。
// 一次情報（lane-a3-t1 監査の fetch.sh 台帳で sha256 一致を確認して取得）:
//   - ij/plugin/filter/MaximumFinder.java（a13a6a1e…）findMaxima / findMinima
//   - ij/util/Tools.java（6e410b6c…）rank
//   - ij/process/FHT.java（1aadbb22…）fourier1D / dfht3
//   - ij/macro/Functions.java（b8e62f4f…）findArrayMaxima / fourierArray の入口仕様
// 検証方法:
//   - findMaxima / findMinima: MaximumFinder.java の制御フローを手で追跡して
//     導いた境界ケースの期待値で固定する（監査報告書 §4.6 の期待値例を含む）。
//   - fourier: (1) 手計算で導ける厳密ケース（定数・デルタ・窓つき定数）、
//     (2) テスト内の独立実装（float64 の素朴な DFT。result[k]=√2・|F[k]| の
//     恒等式を使用）との突き合わせ、(3) float32 と float64 で結果が分かれる
//     入力での手計算期待値（float32 再現の判別ケース）の3角度で固定する。
import test from 'node:test';
import assert from 'node:assert/strict';
import { definition } from '../js/types/imagej/index.js';
import { applyAdvancedEngine } from '../js/types/imagej/advanced-engine.js';

applyAdvancedEngine(definition);

const d = definition;
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const first = async (code, model) => {
  const r = await run(code, model);
  assert.equal(r.error, undefined, code + ' -> ' + (r.error && r.error.message));
  assert.equal(r.paths.length, 1, code);
  const p = r.paths[0];
  assert.equal(p.error, undefined, code + ' -> ' + (p.error && p.error.message));
  return p;
};
const outputs = (p) => p.outputs.map((o) => o.text);
const errors = (r) => {
  const list = [];
  if (r.error) list.push(r.error.message);
  for (const p of r.paths || []) if (p.error) list.push(p.error.message);
  return list;
};
/* 配列を返すマクロを実行し、String.join した1行を得る */
const joined = async (code) => {
  const p = await first(code);
  return outputs(p)[0];
};

/* ---------- Array.findMaxima（MaximumFinder.findMaxima の移植） ---------- */

test('findMaxima: 監査報告書の期待値例 {0,5,0,3,0}, tolerance 0, edgeMode 既定 → {1,3}', async () => {
  assert.equal(await joined('a = newArray(0, 5, 0, 3, 0); m = Array.findMaxima(a, 0); print(String.join(m));'), '1, 3');
  // edgeMode を明示した 0 でも同じ（既定が 0 であることの確認。Functions.java）
  assert.equal(await joined('a = newArray(0, 5, 0, 3, 0); m = Array.findMaxima(a, 0, 0); print(String.join(m));'), '1, 3');
});

test('findMaxima: edgeMode 1 は端のピークを除き、0 は含める', async () => {
  assert.equal(await joined('a = newArray(5, 0, 3); m = Array.findMaxima(a, 0, 0); print(String.join(m));'), '0, 2');
  assert.equal(await joined('a = newArray(5, 0, 3); m = Array.findMaxima(a, 0, 1); print(m.length);'), '0');
});

test('findMaxima: edgeMode 2 は循環（3倍連結の中央部分のみ採用）', async () => {
  assert.equal(await joined('a = newArray(5, 0, 3); m = Array.findMaxima(a, 0, 2); print(String.join(m));'), '0');
  assert.equal(await joined('a = newArray(3, 0, 5); m = Array.findMaxima(a, 0, 2); print(String.join(m));'), '2');
});

test('findMaxima: 平坦部は中央位置を (int) 切捨て', async () => {
  // {0,5,5,0}: 平坦部 1..2 の中央 1.5 → 1
  assert.equal(await joined('a = newArray(0, 5, 5, 0); m = Array.findMaxima(a, 0); print(String.join(m));'), '1');
  // {0,5,5,5,0}: 平坦部 1..3 の中央 2 → 2
  assert.equal(await joined('a = newArray(0, 5, 5, 5, 0); m = Array.findMaxima(a, 0); print(String.join(m));'), '2');
  // 全要素が等しい場合は端込みモードでのみ中央の1点（INCLUDE_EDGE の最終規則）
  assert.equal(await joined('a = newArray(2, 2, 2); m = Array.findMaxima(a, 0, 0); print(String.join(m));'), '1');
  assert.equal(await joined('a = newArray(2, 2, 2); m = Array.findMaxima(a, 0, 1); print(m.length);'), '0');
});

test('findMaxima: 同振幅のピークは後の位置が先（Tools.rank 昇順の反転）', async () => {
  assert.equal(await joined('a = newArray(0, 3, 0, 3, 0); m = Array.findMaxima(a, 0); print(String.join(m));'), '3, 1');
});

test('findMaxima: tolerance による分離と負値の 0 への丸め', async () => {
  // 谷の深さ（5 と 3）が tolerance 10 未満なので両方とも落ちる
  assert.equal(await joined('a = newArray(0, 5, 0, 3, 0); m = Array.findMaxima(a, 10); print(m.length);'), '0');
  // tolerance 4 では振幅 5 のピークだけが残る（3 は谷から 4 以上立ち上がらない）
  assert.equal(await joined('a = newArray(0, 5, 0, 3, 0); m = Array.findMaxima(a, 4); print(String.join(m));'), '1');
  // tolerance < 0 は 0 に丸める（MaximumFinder 本体）
  assert.equal(await joined('a = newArray(0, 5, 0, 3, 0); m = Array.findMaxima(a, -1); print(String.join(m));'), '1, 3');
});

test('findMaxima: NaN はスキップし、全 NaN は空', async () => {
  assert.equal(await joined('a = newArray(sqrt(-1), sqrt(-1), sqrt(-1)); m = Array.findMaxima(a, 0); print(m.length);'), '0');
  // 最初の非 NaN が末尾要素だと走査対象が残らず空（do-while の実挙動）
  assert.equal(await joined('a = newArray(sqrt(-1), 5); m = Array.findMaxima(a, 0); print(m.length);'), '0');
  // 途中の NaN は比較が全て偽になり、ピーク 5 だけが記録される
  assert.equal(await joined('a = newArray(0, 5, sqrt(-1), 3, 0); m = Array.findMaxima(a, 0); print(String.join(m));'), '1');
});

test('findMaxima: 空配列と要素数 1 は空（len < 2 の早期 return）', async () => {
  assert.equal(await joined('a = newArray(0); m = Array.findMaxima(a, 0); print(m.length);'), '0');
  assert.equal(await joined('a = Array.deleteIndex(newArray(7, 8), 1); m = Array.findMaxima(a, 0); print(m.length);'), '0');
});

test('findMaxima: reference の使用例が実際に動作する', async () => {
  // 例文そのまま: p = Array.findMaxima(vals, 10);
  // tolerance 10 では {0,5,0,3,0} のピークは両方とも分離条件を満たさず空になる
  const p = await first('vals = newArray(0, 5, 0, 3, 0); p = Array.findMaxima(vals, 10); print(p.length);');
  assert.deepEqual(outputs(p), ['0']);
});

/* ---------- Array.findMinima（符号反転して findMaxima へ委譲） ---------- */

test('findMinima: 谷位置を深さ降順に返す', async () => {
  assert.equal(await joined('a = newArray(0, -5, 0, -3, 0); m = Array.findMinima(a, 0); print(String.join(m));'), '1, 3');
  assert.equal(await joined('a = newArray(5, 0, 3); m = Array.findMinima(a, 0); print(String.join(m));'), '1');
});

test('findMinima: 平坦部・循環も findMaxima の経路どおり', async () => {
  assert.equal(await joined('a = newArray(0, -5, -5, 0); m = Array.findMinima(a, 0); print(String.join(m));'), '1');
  assert.equal(await joined('a = newArray(-5, 0, -3); m = Array.findMinima(a, 0, 2); print(String.join(m));'), '0');
});

test('findMinima: reference の使用例が実際に動作する', async () => {
  const p = await first('vals = newArray(0, -5, 0, -3, 0); p = Array.findMinima(vals, 10); print(p.length);');
  assert.deepEqual(outputs(p), ['0']);
});

/* ---------- Array.fourier（FHT.fourier1D の移植、float32 再現） ---------- */

test('fourier: 定数配列は result[0] = 平均×√2、他は 0', async () => {
  assert.equal(await joined('a = newArray(1, 1, 1, 1); f = Array.fourier(a); print(String.join(f));'), '1.4142, 0');
});

test('fourier: デルタ配列は全周波数とも等しい振幅', async () => {
  // 正規化で {0.25,0,0,0} になり、H[k] は全て 0.25、result = 0.25×√2
  assert.equal(await joined('a = newArray(1, 0, 0, 0); f = Array.fourier(a); print(String.join(f));'), '0.3536, 0.3536');
});

test('fourier: 空配列は [0]（size は最小の 2、結果長 1）', async () => {
  assert.equal(await joined('a = newArray(0); f = Array.fourier(a); print(String.join(f));'), '0');
});

test('fourier: 2の冪でない長さはゼロ埋めする（n=5 → 結果長 4）', async () => {
  const p = await first('a = newArray(1, 1, 1, 1, 1); f = Array.fourier(a); print(f.length + "/" + String.join(f));');
  assert.deepEqual(outputs(p), ['4/1.4142, 0.6828, 0.2828, 0.1172']);
});

test('fourier: 窓関数の適用と窓和による正規化（手計算ケース）', async () => {
  // Hann・定数 {1,1,1,1}: 窓和 4 で正規化され result[0]=√2、result[1]=√2×|F[1]|=0.7071
  assert.equal(await joined('a = newArray(1, 1, 1, 1); f = Array.fourier(a, "Hann"); print(String.join(f));'), '1.4142, 0.7071');
  // "Hanning" も hann 前方一致で受理される（Functions.java のコメントどおり）
  assert.equal(await joined('a = newArray(1, 1, 1, 1); f = Array.fourier(a, "Hanning"); print(String.join(f));'), '1.4142, 0.7071');
  // 窓なし（"none" 指定・大文字でも可）: {1,2,3,4} の result[1] はちょうど 1
  assert.equal(await joined('a = newArray(1, 2, 3, 4); f = Array.fourier(a, "NONE"); print(String.join(f));'), '3.5355, 1');
  assert.equal(await joined('a = newArray(1, 2, 3, 4); f = Array.fourier(a, "Hamming"); print(String.join(f));'), '3.5355, 1.6601');
  assert.equal(await joined('a = newArray(1, 2, 3, 4); f = Array.fourier(a, "flat-top"); print(String.join(f));'), '3.5355, 3.0759');
});

test('fourier: 不正な窓文字列はエラーで止まる', async () => {
  const r = await run('a = newArray(1, 2); f = Array.fourier(a, "bogus"); print("after");');
  assert.ok(errors(r).some((m) => /Array\.fourier/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!(r.paths?.[0]?.outputs || []).some((o) => o.text === 'after'));
});

/* 独立実装（float64 の素朴な DFT）による期待値。
   FHT の恒等式 H[k]^2 + H[N-k]^2 = 2|F[k]|^2 から result[k] = √2・|F[k]|。 */
function expectedFourier(data, window) {
  const n = data.length;
  let size = 2;
  while (size < n) size *= 2;
  const y = new Array(size).fill(0);
  let sum = 0;
  if (window !== 'none') {
    for (let x = 0; x < n; x++) {
      const z = ((x + 0.5) * 2 * Math.PI) / n;
      let w;
      if (window === 'hamming') w = 0.54 - 0.46 * Math.cos(z);
      else if (window === 'hann') w = 1.0 - Math.cos(z);
      else w = 1.0 - 1.90796 * Math.cos(z) + 1.07349 * Math.cos(2 * z) - 0.18199 * Math.cos(3 * z);
      y[x] = data[x] * w;
      sum += w;
    }
  } else {
    for (let x = 0; x < n; x++) y[x] = data[x];
    sum = n;
  }
  for (let x = 0; x < n; x++) y[x] *= 1.0 / sum;
  const out = [];
  for (let k = 0; k < size / 2; k++) {
    let re = 0;
    let im = 0;
    for (let x = 0; x < size; x++) {
      const t = (-2 * Math.PI * k * x) / size;
      re += y[x] * Math.cos(t);
      im += y[x] * Math.sin(t);
    }
    out.push(Math.SQRT2 * Math.hypot(re, im));
  }
  return out;
}

/* エンジンの結果を d2s(..., 9) で高精度に取り出して数値配列にする */
const engineFourier = async (data, window) => {
  const win = window ? ', "' + window + '"' : '';
  const code =
    'a = newArray(' + data.join(', ') + '); f = Array.fourier(a' + win + ');' +
    ' s = ""; for (i = 0; i < f.length; i++) s = s + d2s(f[i], 9) + ","; print(s);';
  const text = await joined(code);
  return text.split(',').filter((t) => t.length > 0).map(Number);
};

test('fourier: 独立実装（素朴な DFT, float64）と突き合わせる', async () => {
  const cases = [
    { data: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5], window: null, name: 'none' },
    { data: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5], window: 'Hann', name: 'hann' },
    { data: [1, 2, 3, 4], window: 'Hamming', name: 'hamming' },
    { data: [1, 2, 3, 4], window: 'flat-top', name: 'flattop' },
    { data: [2, -1, 0.5, 3, -4, 1.5], window: 'Hann', name: 'hann' },
    { data: [5, 0], window: null, name: 'none' }, /* n=2 → size 2 → 結果長 1 */
  ];
  for (const c of cases) {
    const got = await engineFourier(c.data, c.window);
    const exp = expectedFourier(c.data, c.name);
    assert.equal(got.length, exp.length, c.name + ' length');
    for (let k = 0; k < exp.length; k++) {
      const tol = Math.max(1e-4, Math.abs(exp[k]) * 2e-5);
      assert.ok(Math.abs(got[k] - exp[k]) <= tol, c.name + ' k=' + k + ': got ' + got[k] + ', expected ' + exp[k]);
    }
  }
});

test('fourier: float32 再現の判別ケース（float64 経路と結果が分かれる入力）', async () => {
  // 入力 16777217 は float32 では 16777216 に丸まる。手計算:
  //   float32 経路: 正規化後 2097152、H[k] は全て 2097152、
  //     result = (float)√(2097152^2 + 2097152^2) = 2965820.75
  //   float64 経路: result = √2 × 2097152.125 = 2965820.9775…（0.22 以上ずれる）
  const p = await first('a = newArray(16777217, 0, 0, 0, 0, 0, 0, 0); f = Array.fourier(a); print(d2s(f[0], 9));');
  assert.deepEqual(outputs(p), ['2965820.750000000']);
});

test('fourier: reference の使用例が実際に動作する', async () => {
  // 例文そのまま: f = Array.fourier(vals, "Hann");（n=4 → size 4 → 結果長 2）
  const p = await first('vals = newArray(1, 2, 3, 4); f = Array.fourier(vals, "Hann"); print(f.length);');
  assert.deepEqual(outputs(p), ['2']);
});
