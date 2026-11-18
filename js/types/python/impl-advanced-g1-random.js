/* 高度モード B7 G1：random モジュールの意味論実装。
 * CPython の再現性を本質とし、Mersenne Twister（MT19937）＋init_by_array
 * シーディング＋genrand_res53 を忠実に再現する。一次情報は CPython 3.12.3
 * 実走と Lib/random.py のアルゴリズム、公式ドキュメント 3.15。
 * seed の文字列（version 2）は SHA-512 経由（int.from_bytes(bytes+digest)）。
 * SHA-512 の定数は素数の平方根／立方根の小数部から BigInt で導出し、
 * 既知のダイジェストで検証済み（テスト参照）。bytes 値はエンジンが
 * 未確定値として渡すため、bytes シードと randbytes は未検証に倒す。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, NOT_HANDLED } from './stdlib-registry.js';
import { floatHash, fracToFloat, isFrac } from './impl-advanced-g1.js';

const { NUM, BOOL, NONE, LIST, TUPLE, UNK } = PyAPI;
const F = (v) => NUM(v, true);
const I = (v) => NUM(v, false);
const BIGDESC = 'とても大きな整数・この説明では正確に計算しません';
const U32 = 4294967296;
const u32 = (x) => ((x % U32) + U32) % U32;

/* ================= MT19937 ================= */
const MT_N = 624, MT_M = 397, MATRIX_A = 0x9908b0df, UPPER = 0x80000000, LOWER = 0x7fffffff;
export function createMtState() {
  return { mt: new Array(MT_N).fill(0), idx: MT_N, gaussNext: null, known: false };
}
function initGenrand(st, s) {
  st.mt[0] = u32(s);
  for (let i = 1; i < MT_N; i++) {
    const prev = st.mt[i - 1];
    st.mt[i] = (Math.imul(1812433253, prev ^ (prev >>> 30)) + i) >>> 0;
  }
  st.idx = MT_N;
}
function initByArray(st, key) {
  initGenrand(st, 19650218);
  let i = 1, j = 0;
  let k = Math.max(MT_N, key.length);
  for (; k > 0; k--) {
    const prev = st.mt[i - 1];
    st.mt[i] = ((st.mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1664525)) + key[j] + j) >>> 0;
    i++; j++;
    if (i >= MT_N) { st.mt[0] = st.mt[MT_N - 1]; i = 1; }
    if (j >= key.length) j = 0;
  }
  for (k = MT_N - 1; k > 0; k--) {
    const prev = st.mt[i - 1];
    st.mt[i] = ((st.mt[i] ^ Math.imul(prev ^ (prev >>> 30), 1566083941)) - i) >>> 0;
    i++;
    if (i >= MT_N) { st.mt[0] = st.mt[MT_N - 1]; i = 1; }
  }
  st.mt[0] = 0x80000000;
  st.idx = MT_N;
  st.known = true;
}
function genInt32(st) {
  if (st.idx >= MT_N) {
    const mt = st.mt;
    for (let kk = 0; kk < MT_N - MT_M; kk++) {
      const y = (mt[kk] & UPPER) | (mt[kk + 1] & LOWER);
      mt[kk] = mt[kk + MT_M] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0);
    }
    for (let kk = MT_N - MT_M; kk < MT_N - 1; kk++) {
      const y = (mt[kk] & UPPER) | (mt[kk + 1] & LOWER);
      mt[kk] = mt[kk + (MT_M - MT_N)] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0);
    }
    const y = (mt[MT_N - 1] & UPPER) | (mt[0] & LOWER);
    mt[MT_N - 1] = mt[MT_M - 1] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0);
    st.idx = 0;
  }
  let y = st.mt[st.idx++];
  y ^= y >>> 11;
  y ^= (y << 7) & 0x9d2c5680;
  y ^= (y << 15) & 0xefc60000;
  y ^= y >>> 18;
  return y >>> 0;
}
export function mtRandom(st) {
  const a = genInt32(st) >>> 5;
  const b = genInt32(st) >>> 6;
  return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
}
export function getrandbitsBig(st, k) { // k >= 0、BigInt を返す
  if (k === 0) return 0n;
  if (k <= 32) return BigInt(genInt32(st) >>> (32 - k));
  const words = Math.ceil(k / 32);
  let r = 0n;
  for (let i = 0; i < words; i++) {
    let w = genInt32(st);
    if (i === words - 1 && k % 32 !== 0) w >>>= (32 - (k % 32));
    r |= BigInt(w) << BigInt(32 * i);
  }
  return r;
}
export function randbelowBig(st, n) { // n: BigInt > 0
  const k = n.toString(2).length;
  let r = getrandbitsBig(st, k);
  while (r >= n) r = getrandbitsBig(st, k);
  return r;
}

/* ================= SHA-512（定数は素数の根から導出） ================= */
function firstPrimes(count) {
  const primes = [];
  for (let cand = 2; primes.length < count; cand++) {
    let ok = true;
    for (const p of primes) { if (p * p > cand) break; if (cand % p === 0) { ok = false; break; } }
    if (ok) primes.push(cand);
  }
  return primes;
}
function bigIsqrt(n) {
  if (n <= 0n) return 0n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2) + 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) break; x = y; }
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}
function bigIcbrt(n) {
  if (n <= 0n) return 0n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 3) + 1);
  for (;;) {
    const y = (2n * x + n / (x * x)) / 3n;
    if (y >= x) break;
    x = y;
  }
  while (x * x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}
const MASK64 = (1n << 64n) - 1n;
const SHA512_H0 = [], SHA512_K = [];
{
  const primes = firstPrimes(80);
  for (let i = 0; i < 8; i++) SHA512_H0.push(bigIsqrt(BigInt(primes[i]) << 128n) & MASK64);
  for (let i = 0; i < 80; i++) SHA512_K.push(bigIcbrt(BigInt(primes[i]) << 192n) & MASK64);
}
const rotr64 = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & MASK64;
export function sha512(bytes) {
  const H = SHA512_H0.slice();
  const bitLen = BigInt(bytes.length) * 8n;
  const withPad = [];
  for (const b of bytes) withPad.push(b);
  withPad.push(0x80);
  while (withPad.length % 128 !== 112) withPad.push(0);
  for (let i = 15; i >= 0; i--) withPad.push(Number((bitLen >> BigInt(i * 8)) & 0xffn));
  const W = new Array(80);
  for (let block = 0; block < withPad.length; block += 128) {
    for (let t = 0; t < 16; t++) {
      let w = 0n;
      for (let j = 0; j < 8; j++) w = (w << 8n) | BigInt(withPad[block + t * 8 + j]);
      W[t] = w;
    }
    for (let t = 16; t < 80; t++) {
      const s0 = rotr64(W[t - 15], 1) ^ rotr64(W[t - 15], 8) ^ (W[t - 15] >> 7n);
      const s1 = rotr64(W[t - 2], 19) ^ rotr64(W[t - 2], 61) ^ (W[t - 2] >> 6n);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) & MASK64;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 80; t++) {
      const S1 = rotr64(e, 14) ^ rotr64(e, 18) ^ rotr64(e, 41);
      const ch = (e & f) ^ ((~e & MASK64) & g);
      const t1 = (h + S1 + ch + SHA512_K[t] + W[t]) & MASK64;
      const S0 = rotr64(a, 28) ^ rotr64(a, 34) ^ rotr64(a, 39);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) & MASK64;
      h = g; g = f; f = e; e = (d + t1) & MASK64;
      d = c; c = b; b = a; a = (t1 + t2) & MASK64;
    }
    H[0] = (H[0] + a) & MASK64; H[1] = (H[1] + b) & MASK64; H[2] = (H[2] + c) & MASK64; H[3] = (H[3] + d) & MASK64;
    H[4] = (H[4] + e) & MASK64; H[5] = (H[5] + f) & MASK64; H[6] = (H[6] + g) & MASK64; H[7] = (H[7] + h) & MASK64;
  }
  const out = [];
  for (const word of H) for (let i = 7; i >= 0; i--) out.push(Number((word >> BigInt(i * 8)) & 0xffn));
  return out;
}

/* ================= シーディング ================= */
function seedFromBigInt(st, value) { // value: BigInt（符号は絶対値化）
  let v = value < 0n ? -value : value;
  const key = [];
  if (v === 0n) key.push(0);
  while (v > 0n) { key.push(Number(v & 0xffffffffn)); v >>= 32n; }
  initByArray(st, key);
  st.gaussNext = null;
}
const SEED_TYPE_ERR = 'The only supported seed types are: None,\nint, float, str, bytes, and bytearray.';
export function seedStateFromValue(ctx, st, a, version) {
  st.gaussNext = null;
  if (a === undefined || (a && ctx.isNone(a))) { st.known = false; return true; }
  if (ctx.isUnk(a)) { st.known = false; ctx.diag('シード値が確定しない（bytes 等）ため、乱数列は確定しません'); return true; }
  if (ctx.isBool(a) || (ctx.isNum(a) && !a.f)) {
    if (!Number.isSafeInteger(ctx.num(a))) { st.known = false; ctx.diag('大きすぎるシードは確定しません'); return true; }
    seedFromBigInt(st, BigInt(ctx.num(a)));
    return true;
  }
  if (ctx.isNum(a) && a.f) {
    const h = floatHash(a.v); // CPython は hash(float) の値を int シードとして使う（seedFromBigInt が絶対値化）
    seedFromBigInt(st, h);
    return true;
  }
  if (typeof a === 'string') {
    if (version === 1) {
      let x = 0n;
      if (a.length) x = BigInt(a.charCodeAt(0)) << 7n;
      const MASK = (1n << 64n) - 1n;
      for (let i = 0; i < a.length; i++) x = ((1000003n * x) ^ BigInt(a.charCodeAt(i))) & MASK;
      x ^= BigInt(a.length);
      seedFromBigInt(st, x);
      return true;
    }
    if (version === 2) {
      const bytes = Array.from(new TextEncoder().encode(a));
      const digest = sha512(bytes);
      const all = bytes.concat(digest);
      let v = 0n;
      for (const b of all) v = (v << 8n) | BigInt(b);
      seedFromBigInt(st, v);
      return true;
    }
    st.known = false;
    ctx.diag('version が 1／2 以外の文字列シードは再現できないため、乱数列は確定しません');
    return true;
  }
  if (isFrac(a)) ctx.err('TypeError', SEED_TYPE_ERR, '');
  ctx.err('TypeError', SEED_TYPE_ERR, '');
  return false;
}

/* ================= 値の変換ヘルパ ================= */
function numArg(ctx, v, fname) {
  if (ctx.isNum(v)) return v.v;
  if (ctx.isBool(v)) return v.v ? 1 : 0;
  if (isFrac(v)) return fracToFloat(v.data.n, v.data.d);
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', "'" + ctx.typeName(v) + "' object cannot be interpreted as a number", '');
  return null;
}
function indexArg(ctx, v, fname) {
  // __index__ 規則：int／bool のみ（float・Fraction は TypeError）
  if (ctx.isBool(v)) return BigInt(v.v ? 1 : 0);
  if (ctx.isNum(v) && !v.f && Number.isSafeInteger(v.v)) return BigInt(v.v);
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', "'" + ctx.typeName(v) + "' object cannot be interpreted as an integer", '');
  return null;
}
function seqOf(ctx, v) {
  const items = ctx.iterable(v);
  return items;
}
function ensureKnown(ctx, st) {
  if (!st.known) { ctx.diag('シードが与えられていない（OS／時刻で初期化される）ため、乱数値は確定しません'); return false; }
  return true;
}

/* ================= Random 本体（状態 st に対する操作） ================= */
function makeOps(ctx, st) {
  const rnd = () => mtRandom(st);
  const ops = {
    random: () => F(rnd()),
    getrandbits: (kBig) => {
      const k = Number(kBig);
      const r = getrandbitsBig(st, k);
      return r <= 9007199254740991n ? I(Number(r)) : UNK(BIGDESC);
    },
    randbelow: (nBig) => randbelowBig(st, nBig),
    gauss: (mu, sigma) => {
      let z = st.gaussNext;
      st.gaussNext = null;
      if (z === null) {
        const x2pi = rnd() * (2 * Math.PI);
        const g2rad = Math.sqrt(-2.0 * Math.log(1.0 - rnd()));
        z = Math.cos(x2pi) * g2rad;
        st.gaussNext = Math.sin(x2pi) * g2rad;
      }
      return mu + z * sigma;
    },
    normalvariate: (mu, sigma) => {
      const MAGIC = 4 * Math.exp(-0.5) / Math.sqrt(2.0);
      for (;;) {
        const u1 = rnd();
        const u2 = 1.0 - rnd();
        const z = MAGIC * (u1 - 0.5) / u2;
        const zz = z * z / 4.0;
        if (zz <= -Math.log(u2)) return mu + z * sigma;
      }
    },
  };
  return ops;
}

/* Random インスタンス／モジュール共通のメソッド実装群。
 * self が null の場合はモジュールレベルの共有インスタンスを使う。 */
const globalState = createMtState();
export function globalRandomState() { return globalState; }
export function gaussFromState(ctx, st, mu, sigma) {
  if (!st.known) return null;
  return makeOps(ctx, st).gauss(mu, sigma);
}

function stateOf(ctx, self) {
  if (self && self.__native === 'random.Random') return self.data.st;
  return globalState;
}
function drawRandom(ctx, self) {
  const st = stateOf(ctx, self);
  if (!ensureKnown(ctx, st)) return ctx.unk('乱数（シード未指定）');
  return F(mtRandom(st));
}

const RandomMethods = {
  seed: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    const a = args.length >= 1 ? args[0] : kwargs && 'a' in kwargs ? kwargs.a : undefined;
    let version = 2;
    const vv = args.length >= 2 ? args[1] : kwargs && 'version' in kwargs ? kwargs.version : undefined;
    if (vv !== undefined) { const n = ctx.num(vv); if (n !== null) version = n; }
    seedStateFromValue(ctx, st, a, version);
    return NONE;
  },
  random: (ctx, self) => drawRandom(ctx, self),
  getrandbits: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const k = indexArg(ctx, args[0], 'getrandbits');
    if (k === null) return ctx.unk('乱数ビット');
    if (k < 0n) ctx.err('ValueError', 'number of bits must be non-negative', '');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数ビット（シード未指定）');
    if (k > 100000n) { ctx.diag('ビット数が大きすぎるため確定しません'); return ctx.unk('乱数ビット'); }
    const r = getrandbitsBig(st, Number(k));
    return r <= 9007199254740991n ? I(Number(r)) : UNK(BIGDESC);
  },
  getstate: (ctx, self) => {
    const st = stateOf(ctx, self);
    if (!st.known) { ctx.diag('シード未指定の内部状態は確定しません'); return ctx.unk('乱数生成器の内部状態'); }
    const ints = st.mt.map((w) => I(w));
    ints.push(I(st.idx));
    return TUPLE([I(3), TUPLE(ints), st.gaussNext === null ? NONE : F(st.gaussNext)]);
  },
  setstate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const s = args[0];
    const parts = ctx.listOf(s);
    if (!parts || parts.length !== 3) ctx.err('TypeError', 'state は getstate() が返した3要素のタプルで指定してください', '');
    const ver = ctx.num(parts[0]);
    if (ver !== 3 && ver !== 2) ctx.err('ValueError', 'state with version ' + ctx.repr(parts[0]) + ' passed to Random.setstate() of version 3', '');
    const inner = ctx.listOf(parts[1]);
    if (!inner || inner.length !== 625) ctx.err('TypeError', 'state の内部状態が不正です', '');
    const words = [];
    for (let i = 0; i < 624; i++) {
      const w = ctx.num(inner[i]);
      if (w === null) ctx.err('TypeError', 'state の内部状態が不正です', '');
      words.push(u32(w));
    }
    const idx = ctx.num(inner[624]);
    if (idx === null) ctx.err('TypeError', 'state の内部状態が不正です', '');
    st.mt = words;
    st.idx = Math.trunc(idx);
    st.gaussNext = parts[2] && ctx.isNone(parts[2]) ? null : ctx.num(parts[2]);
    st.known = true;
    return NONE;
  },
  randbytes: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const n = indexArg(ctx, args[0], 'randbytes');
    if (n === null) return ctx.unk('バイト列');
    if (n < 0n) ctx.err('ValueError', 'n must be non-negative', '');
    if (st.known && n <= 100000n) getrandbitsBig(st, Number(n) * 8); // 状態だけ進める
    ctx.diag('bytes 値は本エンジンで表現できないため、randbytes の結果は未検証です');
    return ctx.unk('バイト列（bytes・未検証）');
  },
  randrange: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    let start = args.length >= 1 ? args[0] : kwargs && 'start' in kwargs ? kwargs.start : undefined;
    let stop = args.length >= 2 ? args[1] : kwargs && 'stop' in kwargs ? kwargs.stop : undefined;
    let step = args.length >= 3 ? args[2] : kwargs && 'step' in kwargs ? kwargs.step : undefined;
    if (start === undefined) ctx.err('TypeError', 'randrange() は最低1つの引数が必要です', '');
    const istart = indexArg(ctx, start, 'randrange');
    if (istart === null) return ctx.unk('乱数（整数）');
    if (stop === undefined || (stop && ctx.isNone(stop))) {
      if (step !== undefined) ctx.err('TypeError', 'Missing a non-None stop argument', '');
      if (!ensureKnown(ctx, st)) return ctx.unk('乱数（整数）');
      if (istart > 0n) return intResult(randbelowBig(st, istart));
      ctx.err('ValueError', 'empty range for randrange()', '');
    }
    const istop = indexArg(ctx, stop, 'randrange');
    if (istop === null) return ctx.unk('乱数（整数）');
    const istep = step === undefined ? 1n : indexArg(ctx, step, 'randrange');
    if (istep === null) return ctx.unk('乱数（整数）');
    const width = istop - istart;
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（整数）');
    if (istep === 1n) {
      if (width > 0n) return intResult(istart + randbelowBig(st, width));
      ctx.err('ValueError', 'empty range in randrange(' + istart.toString() + ', ' + istop.toString() + ')', '');
    }
    if (istep === 0n) ctx.err('ValueError', 'zero step for randrange()', '');
    let n;
    if (istep > 0n) n = (width + istep - 1n) / istep;
    else n = (width + istep + 1n) / istep;
    if (n <= 0n) ctx.err('ValueError', 'empty range in randrange(' + istart.toString() + ', ' + istop.toString() + ', ' + istep.toString() + ')', '');
    return intResult(istart + istep * randbelowBig(st, n));
  },
  randint: (ctx, self, args, kwargs) => {
    const a = args.length >= 1 ? args[0] : kwargs && 'a' in kwargs ? kwargs.a : undefined;
    const b = args.length >= 2 ? args[1] : kwargs && 'b' in kwargs ? kwargs.b : undefined;
    const ia = indexArg(ctx, a, 'randint');
    const ib = indexArg(ctx, b, 'randint');
    if (ia === null || ib === null) return ctx.unk('乱数（整数）');
    // randrange(a, b+1) として処理
    return RandomMethods.randrange(ctx, self, [a, b === undefined ? b : (ctx.isBool(b) || (ctx.isNum(b) && !b.f) ? I(ctx.num(b) + 1) : b)], {});
  },
  choice: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const items = seqOf(ctx, args[0]);
    if (items === null) {
      if (args[0] && (ctx.isDict(args[0]) || ctx.isSet(args[0]))) ctx.err('TypeError', 'Population must be a sequence', '');
      return ctx.unk('選ばれた要素');
    }
    if (items.length === 0) ctx.err('IndexError', 'Cannot choose from an empty sequence', '');
    if (!ensureKnown(ctx, st)) return ctx.unk('選ばれた要素');
    const j = randbelowBig(st, BigInt(items.length));
    return items[Number(j)];
  },
  choices: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    const pop = seqOf(ctx, args[0]);
    if (pop === null) return ctx.unk('選ばれた要素のリスト');
    const weights = args.length >= 2 ? args[1] : kwargs && 'weights' in kwargs ? kwargs.weights : undefined;
    let cum = kwargs && 'cum_weights' in kwargs ? kwargs.cum_weights : undefined;
    const kV = kwargs && 'k' in kwargs ? kwargs.k : I(1);
    const kR = indexArg(ctx, kV, 'choices');
    if (kR === null) return ctx.unk('選ばれた要素のリスト');
    const k = Number(kR);
    const n = pop.length;
    if (!ensureKnown(ctx, st)) return ctx.unk('選ばれた要素のリスト');
    if (cum !== undefined && !(cum && ctx.isNone(cum))) {
      if (weights !== undefined && !(weights && ctx.isNone(weights))) ctx.err('TypeError', 'Cannot specify both weights and cumulative weights', '');
      cum = seqOf(ctx, cum);
      if (cum === null) return ctx.unk('選ばれた要素のリスト');
    } else if (weights !== undefined && !(weights && ctx.isNone(weights))) {
      const ws = seqOf(ctx, weights);
      if (ws === null) return ctx.unk('選ばれた要素のリスト');
      cum = [];
      let acc = null;
      for (const w of ws) {
        const wf = numArg(ctx, w, 'choices');
        if (wf === null) return ctx.unk('選ばれた要素のリスト');
        acc = acc === null ? wf : acc + wf;
        cum.push(F(acc));
      }
    } else {
      cum = null;
    }
    if (n === 0 && k > 0) ctx.err('IndexError', 'list index out of range', '');
    if (cum === null) {
      const out = [];
      for (let i = 0; i < k; i++) out.push(pop[Math.floor(mtRandom(st) * n)]);
      return LIST(out);
    }
    if (cum.length !== n) ctx.err('ValueError', 'The number of weights does not match the population', '');
    const total = numArg(ctx, cum[cum.length - 1], 'choices');
    if (total === null) return ctx.unk('選ばれた要素のリスト');
    if (total <= 0.0) ctx.err('ValueError', 'Total of weights must be greater than zero', '');
    if (!Number.isFinite(total)) ctx.err('ValueError', 'Total of weights must be finite', '');
    const cumF = cum.map((c) => numArg(ctx, c, 'choices'));
    const out = [];
    for (let i = 0; i < k; i++) {
      const x = mtRandom(st) * total;
      // bisect_right(cumF, x, 0, n-1)
      let lo = 0, hi = n - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (x < cumF[mid]) hi = mid; else lo = mid + 1; }
      out.push(pop[lo]);
    }
    return LIST(out);
  },
  shuffle: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const target = args[0];
    const arr = ctx.listOf(target);
    if (arr === null || !ctx.isList(target)) {
      if (ctx.isTuple(target)) ctx.err('TypeError', "'tuple' object does not support item assignment", '');
      if (typeof target === 'string') ctx.err('TypeError', "'str' object does not support item assignment", '');
      ctx.err('TypeError', 'shuffle() の引数はリストで指定してください', '');
    }
    if (!ensureKnown(ctx, st)) { ctx.diag('シャッフル結果は確定しません'); return NONE; }
    for (let i = arr.length - 1; i >= 1; i--) {
      const j = Number(randbelowBig(st, BigInt(i + 1)));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return NONE;
  },
  sample: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    const popV = args[0];
    if (ctx.isSet(popV) || ctx.isDict(popV)) ctx.err('TypeError', 'Population must be a sequence.  For dicts or sets, use sorted(d).', '');
    const pop = seqOf(ctx, popV);
    if (pop === null) return ctx.unk('標本のリスト');
    const kV = args.length >= 2 ? args[1] : kwargs && 'k' in kwargs ? kwargs.k : undefined;
    const kR = kV === undefined ? null : indexArg(ctx, kV, 'sample');
    if (kR === null) return ctx.unk('標本のリスト');
    const k = Number(kR);
    const counts = kwargs && 'counts' in kwargs ? kwargs.counts : undefined;
    if (!ensureKnown(ctx, st)) return ctx.unk('標本のリスト');
    if (counts !== undefined && !(counts && ctx.isNone(counts))) {
      const cs = seqOf(ctx, counts);
      if (cs === null) return ctx.unk('標本のリスト');
      if (cs.length !== pop.length) ctx.err('ValueError', 'The number of counts does not match the population', '');
      const cumC = [];
      let acc = 0n;
      for ( const c of cs) {
        if (!ctx.isBool(c) && !(ctx.isNum(c) && !c.f)) {
          if (ctx.isUnk(c)) return ctx.unk('標本のリスト');
          ctx.err('TypeError', 'Counts must be integers', '');
        }
        const ci = indexArg(ctx, c, 'sample');
        if (ci === null) return ctx.unk('標本のリスト');
        acc += ci;
        cumC.push(acc);
      }
      const total = acc;
      if (total <= 0n) ctx.err('ValueError', 'Total of counts must be greater than zero', '');
      const totalN = Number(total);
      const sel = sampleIndices(ctx, st, totalN, k);
      if (sel === null) return ctx.unk('標本のリスト');
      const cumNums = cumC.slice(0, -1).map(Number);
      return LIST(sel.map((s) => {
        let lo = 0, hi = cumNums.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (s < cumNums[mid]) hi = mid; else lo = mid + 1; }
        return pop[lo];
      }));
    }
    const sel = sampleIndices(ctx, st, pop.length, k);
    if (sel === null) return ctx.unk('標本のリスト');
    return LIST(sel.map((j) => pop[j]));
  },
  uniform: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const a = numArg(ctx, args[0], 'uniform'), b = numArg(ctx, args[1], 'uniform');
    if (a === null || b === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    return F(a + (b - a) * mtRandom(st));
  },
  triangular: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    let low = args.length >= 1 ? numArg(ctx, args[0], 'triangular') : 0.0;
    let high = args.length >= 2 ? numArg(ctx, args[1], 'triangular') : 1.0;
    let mode = args.length >= 3 ? args[2] : kwargs && 'mode' in kwargs ? kwargs.mode : undefined;
    if (low === null || high === null) return ctx.unk('乱数（実数）');
    let modeF = null;
    if (mode !== undefined && !(mode && ctx.isNone(mode))) { modeF = numArg(ctx, mode, 'triangular'); if (modeF === null) return ctx.unk('乱数（実数）'); }
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    let u = mtRandom(st);
    let c;
    if (high === low) return F(low);
    c = modeF === null ? 0.5 : (modeF - low) / (high - low);
    if (u > c) { u = 1.0 - u; c = 1.0 - c; const t = low; low = high; high = t; }
    return F(low + (high - low) * Math.sqrt(u * c));
  },
  gauss: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    const mu = (args.length >= 1 ? numArg(ctx, args[0], 'gauss') : kwargs && 'mu' in kwargs ? numArg(ctx, kwargs.mu, 'gauss') : 0.0);
    const sigma = (args.length >= 2 ? numArg(ctx, args[1], 'gauss') : kwargs && 'sigma' in kwargs ? numArg(ctx, kwargs.sigma, 'gauss') : 1.0);
    if (mu === null || sigma === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    return F(makeOps(ctx, st).gauss(mu, sigma));
  },
  normalvariate: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    const mu = (args.length >= 1 ? numArg(ctx, args[0], 'normalvariate') : kwargs && 'mu' in kwargs ? numArg(ctx, kwargs.mu, 'normalvariate') : 0.0);
    const sigma = (args.length >= 2 ? numArg(ctx, args[1], 'normalvariate') : kwargs && 'sigma' in kwargs ? numArg(ctx, kwargs.sigma, 'normalvariate') : 1.0);
    if (mu === null || sigma === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    return F(makeOps(ctx, st).normalvariate(mu, sigma));
  },
  lognormvariate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const mu = numArg(ctx, args[0], 'lognormvariate'), sigma = numArg(ctx, args[1], 'lognormvariate');
    if (mu === null || sigma === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    return F(Math.exp(makeOps(ctx, st).normalvariate(mu, sigma)));
  },
  expovariate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const lambd = args.length >= 1 ? numArg(ctx, args[0], 'expovariate') : 1.0;
    if (lambd === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    const r = -Math.log(1.0 - mtRandom(st)) / lambd;
    if (!Number.isFinite(r) && lambd === 0) ctx.err('ZeroDivisionError', 'float division by zero', '');
    return F(r);
  },
  vonmisesvariate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const mu = numArg(ctx, args[0], 'vonmisesvariate'), kappa = numArg(ctx, args[1], 'vonmisesvariate');
    if (mu === null || kappa === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    const TWOPI = 2 * Math.PI;
    if (kappa <= 1e-6) return F(TWOPI * mtRandom(st));
    const s = 0.5 / kappa;
    const r = s + Math.sqrt(1.0 + s * s);
    let z, d, u2;
    for (;;) {
      const u1 = mtRandom(st);
      z = Math.cos(Math.PI * u1);
      d = z / (r + z);
      u2 = mtRandom(st);
      if (u2 < 1.0 - d * d || u2 <= (1.0 - d) * Math.exp(d)) break;
    }
    const q = 1.0 / r;
    const f = (q + z) / (1.0 + q * z);
    const u3 = mtRandom(st);
    const theta = u3 > 0.5 ? (mu + Math.acos(f)) % TWOPI : (mu - Math.acos(f)) % TWOPI;
    return F(theta < 0 ? theta + TWOPI : theta);
  },
  gammavariate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const alpha = numArg(ctx, args[0], 'gammavariate'), beta = numArg(ctx, args[1], 'gammavariate');
    if (alpha === null || beta === null) return ctx.unk('乱数（実数）');
    if (alpha <= 0.0 || beta <= 0.0) ctx.err('ValueError', 'gammavariate: alpha and beta must be > 0.0', '');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    return F(gammaVariate(ctx, st, alpha, beta));
  },
  betavariate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const alpha = numArg(ctx, args[0], 'betavariate'), beta = numArg(ctx, args[1], 'betavariate');
    if (alpha === null || beta === null) return ctx.unk('乱数（実数）');
    if (alpha <= 0.0 || beta <= 0.0) ctx.err('ValueError', 'gammavariate: alpha and beta must be > 0.0', '');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    const y = gammaVariate(ctx, st, alpha, 1.0);
    if (y) return F(y / (y + gammaVariate(ctx, st, beta, 1.0)));
    return F(0.0);
  },
  paretovariate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const alpha = numArg(ctx, args[0], 'paretovariate');
    if (alpha === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    const u = 1.0 - mtRandom(st);
    return F(Math.pow(u, -1.0 / alpha));
  },
  weibullvariate: (ctx, self, args) => {
    const st = stateOf(ctx, self);
    const alpha = numArg(ctx, args[0], 'weibullvariate'), beta = numArg(ctx, args[1], 'weibullvariate');
    if (alpha === null || beta === null) return ctx.unk('乱数（実数）');
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（実数）');
    const u = 1.0 - mtRandom(st);
    return F(alpha * Math.pow(-Math.log(u), 1.0 / beta));
  },
  binomialvariate: (ctx, self, args, kwargs) => {
    const st = stateOf(ctx, self);
    const nV = args.length >= 1 ? args[0] : kwargs && 'n' in kwargs ? kwargs.n : I(1);
    const pV = args.length >= 2 ? args[1] : kwargs && 'p' in kwargs ? kwargs.p : F(0.5);
    const n = numArg(ctx, nV, 'binomialvariate');
    const p = numArg(ctx, pV, 'binomialvariate');
    if (n === null || p === null) return ctx.unk('乱数（整数）');
    if (n < 0) ctx.err('ValueError', 'n must be non-negative', '');
    if (p <= 0.0 || p >= 1.0) {
      if (p === 0.0) return I(0);
      if (p === 1.0) return I(Math.trunc(n));
      ctx.err('ValueError', 'p must be in the range 0.0 <= p <= 1.0', '');
    }
    if (!ensureKnown(ctx, st)) return ctx.unk('乱数（整数）');
    return I(binomialVariate(ctx, st, n, p));
  },
};
function intResult(big) {
  return big <= 9007199254740991n && big >= -9007199254740991n ? I(Number(big)) : UNK(BIGDESC);
}
function sampleIndices(ctx, st, n, k) {
  if (!(0 <= k && k <= n)) ctx.err('ValueError', 'Sample larger than population or is negative', '');
  let setsize = 21;
  if (k > 5) setsize += Math.pow(4, Math.ceil(Math.log(k * 3) / Math.log(4)));
  const result = new Array(k);
  if (n <= setsize) {
    const pool = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < k; i++) {
      const j = Number(randbelowBig(st, BigInt(n - i)));
      result[i] = pool[j];
      pool[j] = pool[n - i - 1];
    }
  } else {
    const selected = new Set();
    for (let i = 0; i < k; i++) {
      let j = Number(randbelowBig(st, BigInt(n)));
      while (selected.has(j)) j = Number(randbelowBig(st, BigInt(n)));
      selected.add(j);
      result[i] = j;
    }
  }
  return result;
}
function gammaVariate(ctx, st, alpha, beta) {
  const rnd = () => mtRandom(st);
  if (alpha > 1.0) {
    const ainv = Math.sqrt(2.0 * alpha - 1.0);
    const bbb = alpha - Math.log(4.0);
    const ccc = alpha + ainv;
    for (;;) {
      const u1 = rnd();
      if (!(1e-7 < u1 && u1 < 0.9999999)) continue;
      const u2 = 1.0 - rnd();
      const v = Math.log(u1 / (1.0 - u1)) / ainv;
      const x = alpha * Math.exp(v);
      const z = u1 * u1 * u2;
      const r = bbb + ccc * v - x;
      if (r + (1.0 + Math.log(4.5)) - 4.5 * z >= 0.0 || r >= Math.log(z)) return x * beta;
    }
  } else if (alpha === 1.0) {
    return -Math.log(1.0 - rnd()) * beta;
  }
  for (;;) {
    const u = rnd();
    const b = (Math.E + alpha) / Math.E;
    const p = b * u;
    let x;
    if (p <= 1.0) x = Math.pow(p, 1.0 / alpha);
    else x = -Math.log((b - p) / alpha);
    const u1 = rnd();
    if (p > 1.0) { if (u1 <= Math.pow(x, alpha - 1.0)) return x * beta; }
    else if (u1 <= Math.exp(-x)) return x * beta;
  }
}
/* Lanczos（g=7）による lgamma（binomialvariate の BTRS 用） */
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgammaJs(x) {
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.abs(Math.sin(Math.PI * x))) - lgammaJs(1 - x);
  const xm = x - 1;
  let a = LANCZOS[0];
  const t = xm + 7.5;
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (xm + i);
  return 0.5 * Math.log(2 * Math.PI) + (xm + 0.5) * Math.log(t) - t + Math.log(a);
}
function binomialVariate(ctx, st, n, p) {
  const rnd = () => mtRandom(st);
  if (n === 1) return rnd() < p ? 1 : 0;
  if (p > 0.5) return Math.trunc(n) - binomialVariate(ctx, st, n, 1.0 - p);
  if (n * p < 10.0) {
    let x = 0, y = 0;
    const c = Math.log2(1.0 - p);
    if (!c) return x;
    for (;;) {
      y += Math.floor(Math.log2(rnd()) / c) + 1;
      if (y > n) return x;
      x += 1;
    }
  }
  // BTRS（Hörmann の変換棄却法）
  const spq = Math.sqrt(n * p * (1.0 - p));
  const b = 1.15 + 2.53 * spq;
  const a = -0.0873 + 0.0248 * b + 0.01 * p;
  const c = n * p + 0.5;
  const vr = 0.92 - 4.2 / b;
  let setup = false, alpha = 0, lpq = 0, m = 0, h = 0;
  for (;;) {
    let u = rnd();
    u -= 0.5;
    const us = 0.5 - Math.abs(u);
    const k = Math.floor((2.0 * a / us + b) * u + c);
    if (k < 0 || k > n) continue;
    const v0 = rnd();
    if (us >= 0.07 && v0 <= vr) return k;
    let v = v0;
    if (!setup) {
      alpha = (2.83 + 5.1 / b) * spq;
      lpq = Math.log(p / (1.0 - p));
      m = Math.floor((n + 1) * p);
      h = lgammaJs(m + 1) + lgammaJs(n - m + 1);
      setup = true;
    }
    v *= alpha / (a / (us * us) + b);
    if (Math.log(v) <= h - lgammaJs(k + 1) - lgammaJs(n - k + 1) + (k - m) * lpq) return k;
  }
}

/* ================= クラス登録 ================= */
function wrapMethods(map) {
  const out = {};
  for (const [name, fn] of Object.entries(map)) out[name] = (ctx, self, args, kwargs) => fn(ctx, self, args || [], kwargs || {});
  return out;
}
const RandomDef = {
  typeName: 'Random',
  construct: (ctx, args, kwargs) => {
    const st = createMtState();
    const seedV = args.length >= 1 ? args[0] : kwargs && 'seed' in kwargs ? kwargs.seed : undefined;
    if (seedV !== undefined) seedStateFromValue(ctx, st, seedV, 2);
    return ctx.native('random.Random', { st });
  },
  methods: wrapMethods(RandomMethods),
  repr: () => '<random.Random object>',
};
const SystemRandomDef = {
  typeName: 'SystemRandom',
  parents: ['random.Random'],
  construct: (ctx) => ctx.native('random.SystemRandom', {}),
  methods: {
    seed: () => NONE,
    random: (ctx) => { ctx.diag('SystemRandom は OS の乱数源を使うため値は確定しません'); return ctx.unk('乱数（OS 由来）'); },
    getrandbits: (ctx, self, args) => {
      const k = indexArg(ctx, args[0], 'getrandbits');
      if (k !== null && k < 0n) ctx.err('ValueError', 'number of bits must be non-negative', '');
      ctx.diag('SystemRandom は OS の乱数源を使うため値は確定しません');
      return ctx.unk('乱数ビット（OS 由来）');
    },
    randbytes: (ctx) => { ctx.diag('SystemRandom は OS の乱数源を使うため値は確定しません'); return ctx.unk('バイト列（OS 由来）'); },
    getstate: (ctx) => ctx.err('NotImplementedError', 'System entropy source does not have state.', ''),
    setstate: (ctx) => ctx.err('NotImplementedError', 'System entropy source does not have state.', ''),
  },
  repr: () => '<random.SystemRandom object>',
};
/* モジュールレベル関数は共有インスタンスへの委譲 */
const moduleFunctions = {};
for (const [name, fn] of Object.entries(RandomMethods)) {
  moduleFunctions[name] = (ctx, args, kwargs) => fn(ctx, null, args || [], kwargs || {});
}
registerStdlibModule('random', {
  functions: moduleFunctions,
  classes: { Random: RandomDef, SystemRandom: SystemRandomDef },
});
export { NOT_HANDLED };
