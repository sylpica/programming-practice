/* 高度モード B7 G13：math.integer（6件）。
 * 3.15 で追加されたサブモジュール（公式ドキュメント
 * https://docs.python.org/ja/3.15/library/math.integer.html で実在と
 * 意味を確認）。6関数は math モジュールの同名関数と定義が同一であり、
 * math パイロットで CPython 3.12.3 実走照合済みの意味論をそのまま使う。
 * ローカル 3.12 にはモジュール自体が無いため、モジュールとしての実走
 * 照合はできない（報告書に明記）。大きな結果は math パイロットと同じく
 * 未確定に倒す。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  UNK, I, isNum, isBool, isUnk, noKw, arity, intArg, SAFE, BIGDESC,
} from './impl-advanced-g13-common.js';

function bigReturn(r) {
  return SAFE(Number(r)) && BigInt(Number(r)) === r ? I(Number(r)) : UNK(BIGDESC);
}
function factorialFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'factorial'); arity(ctx, args, 1, 1, 'factorial');
  const n = intArg(ctx, args[0], 'factorial');
  if (n === null) return UNK('factorial');
  if (n < 0) ctx.err('ValueError', 'factorial() not defined for negative values', '');
  let r = 1n;
  for (let k = 2n; k <= BigInt(n); k++) r *= k;
  return bigReturn(r);
}
function gcdFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'gcd');
  let g = 0n;
  for (const a of args) {
    const v = intArg(ctx, a, 'gcd');
    if (v === null) return UNK('gcd');
    let x = BigInt(Math.abs(v)), y = g;
    while (y !== 0n) { const t = x % y; x = y; y = t; }
    g = x;
  }
  return SAFE(Number(g)) ? I(Number(g)) : UNK(BIGDESC);
}
function lcmFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'lcm');
  let l = 1n;
  for (const a of args) {
    const v = intArg(ctx, a, 'lcm');
    if (v === null) return UNK('lcm');
    const x = BigInt(Math.abs(v));
    if (x === 0n || l === 0n) { l = 0n; continue; }
    let p = l, q = x;
    while (q !== 0n) { const t = p % q; p = q; q = t; }
    l = (l / p) * x;
  }
  return bigReturn(l);
}
function combFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'comb'); arity(ctx, args, 2, 2, 'comb');
  const n = intArg(ctx, args[0], 'comb'), k = intArg(ctx, args[1], 'comb');
  if (n === null || k === null) return UNK('comb');
  if (n < 0 || k < 0) ctx.err('ValueError', 'comb() not defined for negative values', '');
  if (k > n) return I(0);
  const kk = Math.min(k, n - k);
  let r = 1n;
  for (let i = 0; i < kk; i++) r = (r * BigInt(n - i)) / BigInt(i + 1);
  return bigReturn(r);
}
function permFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'perm'); arity(ctx, args, 1, 2, 'perm');
  const n = intArg(ctx, args[0], 'perm');
  const k = args.length === 2 ? intArg(ctx, args[1], 'perm') : n;
  if (n === null || k === null) return UNK('perm');
  if (n < 0 || k < 0) ctx.err('ValueError', 'perm() not defined for negative values', '');
  if (k > n) return I(0);
  let r = 1n;
  for (let i = 0; i < k; i++) r *= BigInt(n - i);
  return bigReturn(r);
}
function isqrtFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'isqrt'); arity(ctx, args, 1, 1, 'isqrt');
  const n = intArg(ctx, args[0], 'isqrt');
  if (n === null) return UNK('isqrt');
  if (n < 0) ctx.err('ValueError', 'isqrt() argument must be nonnegative', '');
  const N = BigInt(n);
  let r = BigInt(Math.floor(Math.sqrt(n)));
  while ((r + 1n) * (r + 1n) <= N) r += 1n;
  while (r * r > N) r -= 1n;
  return I(Number(r));
}

registerStdlibModule('math.integer', {
  functions: {
    comb: combFn,
    factorial: factorialFn,
    gcd: gcdFn,
    isqrt: isqrtFn,
    lcm: lcmFn,
    perm: permFn,
  },
});
