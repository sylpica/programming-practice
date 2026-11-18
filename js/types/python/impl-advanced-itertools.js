/* 高度モード B7 G5：itertools 全21件の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/itertools）と CPython 3.12.3 実走
 * （batched の strict は 3.13 追加のためドキュメントに基づく）。
 *
 * イテレータ表現の設計判断（報告書にも記載）：
 * - 有限イテレータは engine の ITER 値（配列バッファ＋pos の単一パス消費）で
 *   実体化する。list ではなく ITER で返すため、len() が効かない・再反復で
 *   続きから読む・next() で進む等の観測可能な型の性質は CPython と一致する。
 *   代償として「供給元の消費タイミング」が構築時に前倒しになる（CPython は
 *   遅延）。値そのものと、消費し切った後の供給元の最終位置は一致する。
 *   供給元はカーソル経由で必要分だけ消費するため、islice／takewhile の
 *   消費量は CPython と一致し、無限の供給元からも有限件だけ取り出せる。
 * - 無限イテレータ（count／cycle／repeat 無制限）は ITER に pull を接続した
 *   遅延表現にする。pull が枯渇を返す必要がない（無限）ため、engine 内部の
 *   EXH シンボルに触れずに実装できる。生産が 10,000 件を超えたら failed を
 *   立てて未確定に倒し、list(count()) のような全量展開が無限ループに
 *   ならないようにする（CPython では終わらない処理であり、説明エンジン
 *   としては正直な停止を取る）。
 * - 実体化の上限は 100,000 件（engine の MAX_RANGE と同値）。超過は未確定。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import {
  NUM, BOOL, NONE, TUPLE, ITER, UNK, isNum, isBool, isNone, isUnk,
  CAP, makeCursor, collectAll, requireCursor, notIterableErr, indexInt, isIterV,
} from './impl-advanced-g5-common.js';

const PULL_CAP = 10000;

function noKwargs(ctx, kwargs, fname, style) {
  const ks = Object.keys(kwargs || {});
  if (!ks.length) return;
  if (style === 'invalid') ctx.err('TypeError', "'" + ks[0] + "' is an invalid keyword argument for " + fname + '()', '');
  else if (style === 'unexpected') ctx.err('TypeError', fname + "() got an unexpected keyword argument '" + ks[0] + "'", '');
  else if (style === 'tee') ctx.err('TypeError', 'itertools.' + fname + '() takes no keyword arguments', '');
  else ctx.err('TypeError', fname + '() takes no keyword arguments', '');
}
function indexArg(ctx, v, makeMsg) {
  // __index__ 規則。float 等は CPython の文面が関数ごとに違うため makeMsg で受ける
  if (isUnk(v)) return null;
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v) && !v.f) return v.v;
  ctx.err('TypeError', makeMsg(v), '');
  return null;
}
function truthyOrNull(ctx, v) {
  const t = ctx.truthy(v);
  return t;
}
function drainOrUnk(ctx, cur, what) {
  const r = collectAll(cur);
  if (r.unk || r.overflow) return null;
  return r.items;
}
function infiniteIter(ctx, kind, produce) {
  const it = ITER([], kind);
  let produced = 0;
  it.pull = () => {
    if (produced >= PULL_CAP) {
      it.failed = true;
      it.exhausted = true;
      return ctx.unk('無限イテレータの展開上限を超えました');
    }
    produced++;
    return produce();
  };
  return it;
}

const FUNCTIONS = {
  accumulate(ctx, args, kwargs) {
    kwargs = kwargs || {};
    for (const k of Object.keys(kwargs)) {
      if (k !== 'func' && k !== 'initial') ctx.err('TypeError', "'" + k + "' is an invalid keyword argument for accumulate()", '');
    }
    if (args.length === 0) ctx.err('TypeError', "accumulate() missing required argument 'iterable' (pos 1)", '');
    if (args.length > 2) ctx.err('TypeError', 'accumulate() takes at most 2 positional arguments (' + args.length + ' given)', '');
    const func = args.length === 2 ? args[1] : ('func' in kwargs ? kwargs.func : NONE);
    const hasInitial = 'initial' in kwargs;
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('accumulate の結果');
    const items = drainOrUnk(ctx, cur, 'accumulate');
    if (items === null) return ctx.unk('accumulate の結果（供給元が確定しません）');
    const out = [];
    let total;
    if (hasInitial) { total = kwargs.initial; out.push(total); }
    for (const x of items) {
      if (total === undefined) { total = x; out.push(total); continue; }
      total = isNone(func) ? ctx.binop('+', total, x) : ctx.call(func, [total, x]);
      if (isUnk(total)) return ctx.unk('accumulate の結果');
      out.push(total);
    }
    return ITER(out, 'accumulate');
  },

  batched(ctx, args, kwargs) {
    kwargs = kwargs || {};
    for (const k of Object.keys(kwargs)) {
      if (k !== 'strict') ctx.err('TypeError', "batched() got an unexpected keyword argument '" + k + "'", '');
    }
    if (args.length === 0) ctx.err('TypeError', "batched() missing required argument 'iterable' (pos 1)", '');
    if (args.length === 1) ctx.err('TypeError', "batched() missing required argument 'n' (pos 2)", '');
    if (args.length > 2) ctx.err('TypeError', 'batched() takes at most 2 arguments (' + args.length + ' given)', '');
    const n = indexArg(ctx, args[1], (v) => "'" + ctx.typeName(v) + "' object cannot be interpreted as an integer");
    if (n === null) return ctx.unk('batched の結果');
    if (n < 1) ctx.err('ValueError', 'n must be at least one', '');
    const strict = 'strict' in kwargs ? truthyOrNull(ctx, kwargs.strict) : false;
    if (strict === null) return ctx.unk('batched の結果');
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('batched の結果');
    const items = drainOrUnk(ctx, cur, 'batched');
    if (items === null) return ctx.unk('batched の結果（供給元が確定しません）');
    const out = [];
    for (let i = 0; i < items.length; i += n) {
      const chunk = items.slice(i, i + n);
      if (strict && chunk.length < n) ctx.err('ValueError', 'batched(): incomplete batch', '');
      out.push(TUPLE(chunk));
    }
    return ITER(out, 'batched');
  },

  combinations(ctx, args, kwargs) {
    return combinationsImpl(ctx, args, kwargs, false);
  },
  combinations_with_replacement(ctx, args, kwargs) {
    return combinationsImpl(ctx, args, kwargs, true);
  },

  compress(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'compress');
    if (args.length === 0) ctx.err('TypeError', "compress() missing required argument 'data' (pos 1)", '');
    if (args.length === 1) ctx.err('TypeError', "compress() missing required argument 'selectors' (pos 2)", '');
    if (args.length > 2) ctx.err('TypeError', 'compress() takes at most 2 arguments (' + args.length + ' given)', '');
    const dcur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!dcur) return ctx.unk('compress の結果');
    const scur = requireCursor(ctx, args[1], () => notIterableErr(ctx, args[1]));
    if (!scur) return ctx.unk('compress の結果');
    const out = [];
    for (;;) {
      const d = dcur.next();
      if (d.done) break;
      if (d.unk) return ctx.unk('compress の結果');
      const s = scur.next();
      if (s.done) break;
      if (s.unk) return ctx.unk('compress の結果');
      const t = truthyOrNull(ctx, s.value);
      if (t === null) return ctx.unk('compress の結果');
      if (t) out.push(d.value);
      if (out.length > CAP) return ctx.unk('compress の結果（大きすぎます）');
    }
    return ITER(out, 'compress');
  },

  count(ctx, args, kwargs) {
    kwargs = kwargs || {};
    for (const k of Object.keys(kwargs)) {
      if (k !== 'start' && k !== 'step') ctx.err('TypeError', "count() got an unexpected keyword argument '" + k + "'", '');
    }
    if (args.length > 2) ctx.err('TypeError', 'count() takes at most 2 arguments (' + args.length + ' given)', '');
    let start = args.length >= 1 ? args[0] : ('start' in kwargs ? kwargs.start : NUM(0, false));
    let step = args.length >= 2 ? args[1] : ('step' in kwargs ? kwargs.step : NUM(1, false));
    if (args.length >= 1 && 'start' in kwargs) ctx.err('TypeError', "count() got multiple values for argument 'start'", '');
    if (args.length >= 2 && 'step' in kwargs) ctx.err('TypeError', "count() got multiple values for argument 'step'", '');
    const norm = (v) => {
      if (isUnk(v)) return null;
      if (isBool(v)) return NUM(v.v ? 1 : 0, false);
      if (isNum(v)) return v;
      ctx.err('TypeError', 'a number is required', '');
      return null;
    };
    start = norm(start);
    step = norm(step);
    if (start === null || step === null) return ctx.unk('count の結果');
    let cur = start;
    return infiniteIter(ctx, 'count', () => {
      const r = cur;
      cur = ctx.binop('+', cur, step);
      return r;
    });
  },

  cycle(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'cycle');
    if (args.length !== 1) ctx.err('TypeError', 'cycle expected 1 argument, got ' + args.length, '');
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('cycle の結果');
    const items = drainOrUnk(ctx, cur, 'cycle');
    if (items === null) return ctx.unk('cycle の結果（供給元が確定しません）');
    if (!items.length) return ITER([], 'cycle');
    let i = 0;
    return infiniteIter(ctx, 'cycle', () => items[i++ % items.length]);
  },

  dropwhile(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'dropwhile');
    if (args.length !== 2) ctx.err('TypeError', 'dropwhile expected 2 arguments, got ' + args.length, '');
    const cur = requireCursor(ctx, args[1], () => notIterableErr(ctx, args[1]));
    if (!cur) return ctx.unk('dropwhile の結果');
    const out = [];
    let dropping = true;
    for (;;) {
      const r = cur.next();
      if (r.done) break;
      if (r.unk) return ctx.unk('dropwhile の結果');
      if (dropping) {
        const t = truthyOrNull(ctx, ctx.call(args[0], [r.value]));
        if (t === null) return ctx.unk('dropwhile の結果');
        if (t) continue;
        dropping = false;
      }
      out.push(r.value);
      if (out.length > CAP) return ctx.unk('dropwhile の結果（大きすぎます）');
    }
    return ITER(out, 'dropwhile');
  },

  filterfalse(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'filterfalse');
    if (args.length !== 2) ctx.err('TypeError', 'filterfalse expected 2 arguments, got ' + args.length, '');
    const cur = requireCursor(ctx, args[1], () => notIterableErr(ctx, args[1]));
    if (!cur) return ctx.unk('filterfalse の結果');
    const items = drainOrUnk(ctx, cur, 'filterfalse');
    if (items === null) return ctx.unk('filterfalse の結果（供給元が確定しません）');
    const out = [];
    const pred = args[0];
    for (const x of items) {
      const r = isNone(pred) ? x : ctx.call(pred, [x]);
      const t = truthyOrNull(ctx, r);
      if (t === null) return ctx.unk('filterfalse の結果');
      if (!t) out.push(x);
    }
    return ITER(out, 'filterfalse');
  },

  groupby(ctx, args, kwargs) {
    kwargs = kwargs || {};
    for (const k of Object.keys(kwargs)) {
      if (k !== 'key') ctx.err('TypeError', "'" + k + "' is an invalid keyword argument for groupby()", '');
    }
    if (args.length === 0) ctx.err('TypeError', "groupby() missing required argument 'iterable' (pos 1)", '');
    if (args.length > 2) ctx.err('TypeError', 'groupby() takes at most 2 positional arguments (' + args.length + ' given)', '');
    const keyFn = args.length === 2 ? args[1] : ('key' in kwargs ? kwargs.key : NONE);
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('groupby の結果');
    const items = drainOrUnk(ctx, cur, 'groupby');
    if (items === null) return ctx.unk('groupby の結果（供給元が確定しません）');
    const out = [];
    let have = false;
    let curKey = null;
    let group = [];
    for (const x of items) {
      const k = isNone(keyFn) ? x : ctx.call(keyFn, [x]);
      if (isUnk(k)) return ctx.unk('groupby の結果');
      if (!have) { have = true; curKey = k; group = [x]; continue; }
      const e = ctx.eq(k, curKey);
      if (e === null) return ctx.unk('groupby の結果');
      if (e) group.push(x);
      else { out.push(TUPLE([curKey, ITER(group, '_grouper')])); curKey = k; group = [x]; }
    }
    if (have) out.push(TUPLE([curKey, ITER(group, '_grouper')]));
    return ITER(out, 'groupby');
  },

  islice(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'islice');
    if (args.length < 2) ctx.err('TypeError', 'islice expected at least 2 arguments, got ' + args.length, '');
    if (args.length > 4) ctx.err('TypeError', 'islice expected at most 4 arguments, got ' + args.length, '');
    let start = 0;
    let stop = null;
    let step = 1;
    const idxVal = (v, which) => {
      if (isNone(v)) return null;
      if (isUnk(v)) return 'unknown';
      if (isBool(v)) return v.v ? 1 : 0;
      if (isNum(v) && !v.f) return v.v;
      if (which === 'stop') ctx.err('ValueError', 'Stop argument for islice() must be None or an integer: 0 <= x <= sys.maxsize.', '');
      if (which === 'step') ctx.err('ValueError', 'Step for islice() must be a positive integer or None.', '');
      ctx.err('ValueError', 'Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.', '');
      return null;
    };
    const parts = args.slice(1);
    if (parts.length === 1) {
      const s = idxVal(parts[0], 'stop');
      if (s === 'unknown') return ctx.unk('islice の結果');
      stop = s;
    } else {
      const a = idxVal(parts[0], 'start');
      if (a === 'unknown') return ctx.unk('islice の結果');
      start = a === null ? 0 : a;
      const s = idxVal(parts[1], 'stop');
      if (s === 'unknown') return ctx.unk('islice の結果');
      stop = s;
      if (parts.length === 3) {
        const st = idxVal(parts[2], 'step');
        if (st === 'unknown') return ctx.unk('islice の結果');
        step = st === null ? 1 : st;
      }
    }
    if (start < 0) ctx.err('ValueError', 'Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.', '');
    if (stop !== null && stop < 0) ctx.err('ValueError', 'Stop argument for islice() must be None or an integer: 0 <= x <= sys.maxsize.', '');
    if (step < 1) ctx.err('ValueError', 'Step for islice() must be a positive integer or None.', '');
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('islice の結果');
    const out = [];
    let idx = 0;
    while (stop === null || idx < stop) {
      const r = cur.next();
      if (r.done) break;
      if (r.unk) return ctx.unk('islice の結果');
      if (idx >= start && (idx - start) % step === 0) out.push(r.value);
      idx++;
      if (out.length > CAP) return ctx.unk('islice の結果（大きすぎます）');
    }
    return ITER(out, 'islice');
  },

  pairwise(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'pairwise');
    if (args.length !== 1) ctx.err('TypeError', 'pairwise expected 1 argument, got ' + args.length, '');
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('pairwise の結果');
    const items = drainOrUnk(ctx, cur, 'pairwise');
    if (items === null) return ctx.unk('pairwise の結果（供給元が確定しません）');
    const out = [];
    for (let i = 0; i + 1 < items.length; i++) out.push(TUPLE([items[i], items[i + 1]]));
    return ITER(out, 'pairwise');
  },

  permutations(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'permutations');
    if (args.length === 0) ctx.err('TypeError', "permutations() missing required argument 'iterable' (pos 1)", '');
    if (args.length > 2) ctx.err('TypeError', 'permutations() takes at most 2 arguments (' + args.length + ' given)', '');
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('permutations の結果');
    const pool = drainOrUnk(ctx, cur, 'permutations');
    if (pool === null) return ctx.unk('permutations の結果（供給元が確定しません）');
    let r = pool.length;
    if (args.length === 2 && !isNone(args[1])) {
      const rv = indexInt(ctx, args[1]);
      if (rv === null) return ctx.unk('permutations の結果');
      r = rv;
    }
    if (r < 0) ctx.err('ValueError', 'r must be non-negative', '');
    if (r > pool.length) return ITER([], 'permutations');
    // 件数上限（階乗級に増えるため BigInt で数える）
    let total = 1n;
    for (let i = 0; i < r; i++) total *= BigInt(pool.length - i);
    if (total > BigInt(CAP)) { ctx.diag('permutations の組み合わせが多すぎるため、この説明では展開しません'); return ctx.unk('permutations の結果（組み合わせが多すぎます）'); }
    const out = [];
    const n = pool.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    const cycles = Array.from({ length: r }, (_, i) => n - i);
    out.push(TUPLE(indices.slice(0, r).map((i) => pool[i])));
    for (;;) {
      let i;
      let done = true;
      for (i = r - 1; i >= 0; i--) {
        cycles[i] -= 1;
        if (cycles[i] === 0) {
          indices.push(indices.splice(i, 1)[0]);
          cycles[i] = n - i;
        } else {
          const j = cycles[i];
          const tmp = indices[i];
          indices[i] = indices[n - j];
          indices[n - j] = tmp;
          out.push(TUPLE(indices.slice(0, r).map((x) => pool[x])));
          done = false;
          break;
        }
      }
      if (done) break;
    }
    return ITER(out, 'permutations');
  },

  product(ctx, args, kwargs) {
    kwargs = kwargs || {};
    for (const k of Object.keys(kwargs)) {
      if (k !== 'repeat') ctx.err('TypeError', "'" + k + "' is an invalid keyword argument for product()", '');
    }
    let repeat = 1;
    if ('repeat' in kwargs) {
      const rv = indexInt(ctx, kwargs.repeat);
      if (rv === null) return ctx.unk('product の結果');
      repeat = rv;
    }
    if (repeat < 0) repeat = 0;
    const pools = [];
    for (const a of args) {
      const cur = requireCursor(ctx, a, () => notIterableErr(ctx, a));
      if (!cur) return ctx.unk('product の結果');
      const items = drainOrUnk(ctx, cur, 'product');
      if (items === null) return ctx.unk('product の結果（供給元が確定しません）');
      pools.push(items);
    }
    const allPools = [];
    for (let i = 0; i < repeat; i++) for (const p of pools) allPools.push(p);
    let total = 1n;
    for (const p of allPools) total *= BigInt(p.length);
    if (total > BigInt(CAP)) { ctx.diag('product の組み合わせが多すぎるため、この説明では展開しません'); return ctx.unk('product の結果（組み合わせが多すぎます）'); }
    let result = [[]];
    for (const pool of allPools) {
      const next = [];
      for (const prefix of result) for (const x of pool) next.push([...prefix, x]);
      result = next;
    }
    return ITER(result.map((items) => TUPLE(items)), 'product');
  },

  repeat(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'repeat');
    if (args.length === 0) ctx.err('TypeError', "repeat() missing required argument 'object' (pos 1)", '');
    if (args.length > 2) ctx.err('TypeError', 'repeat() takes at most 2 arguments (' + args.length + ' given)', '');
    const obj = args[0];
    if (args.length === 1) {
      return infiniteIter(ctx, 'repeat', () => obj);
    }
    const times = indexInt(ctx, args[1]);
    if (times === null) return ctx.unk('repeat の結果');
    if (times <= 0) return ITER([], 'repeat');
    if (times > CAP) { ctx.diag('repeat の回数が多すぎるため、この説明では展開しません'); return ctx.unk('repeat の結果（回数が多すぎます）'); }
    return ITER(new Array(times).fill(obj), 'repeat');
  },

  starmap(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'starmap');
    if (args.length !== 2) ctx.err('TypeError', 'starmap expected 2 arguments, got ' + args.length, '');
    const cur = requireCursor(ctx, args[1], () => notIterableErr(ctx, args[1]));
    if (!cur) return ctx.unk('starmap の結果');
    const out = [];
    for (;;) {
      const r = cur.next();
      if (r.done) break;
      if (r.unk) return ctx.unk('starmap の結果');
      const sub = requireCursor(ctx, r.value, () => notIterableErr(ctx, r.value));
      if (!sub) return ctx.unk('starmap の結果');
      const subItems = drainOrUnk(ctx, sub, 'starmap');
      if (subItems === null) return ctx.unk('starmap の結果');
      const res = ctx.call(args[0], subItems);
      if (isUnk(res)) return ctx.unk('starmap の結果');
      out.push(res);
      if (out.length > CAP) return ctx.unk('starmap の結果（大きすぎます）');
    }
    return ITER(out, 'starmap');
  },

  takewhile(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'takewhile');
    if (args.length !== 2) ctx.err('TypeError', 'takewhile expected 2 arguments, got ' + args.length, '');
    const cur = requireCursor(ctx, args[1], () => notIterableErr(ctx, args[1]));
    if (!cur) return ctx.unk('takewhile の結果');
    const out = [];
    for (;;) {
      const r = cur.next();
      if (r.done) break;
      if (r.unk) return ctx.unk('takewhile の結果');
      const t = truthyOrNull(ctx, ctx.call(args[0], [r.value]));
      if (t === null) return ctx.unk('takewhile の結果');
      if (!t) break;
      out.push(r.value);
      if (out.length > CAP) return ctx.unk('takewhile の結果（大きすぎます）');
    }
    return ITER(out, 'takewhile');
  },

  tee(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'tee', 'tee');
    if (args.length === 0) ctx.err('TypeError', 'tee expected at least 1 argument, got 0', '');
    if (args.length > 2) ctx.err('TypeError', 'tee expected at most 2 arguments, got ' + args.length, '');
    let n = 2;
    if (args.length === 2) {
      const nv = indexInt(ctx, args[1]);
      if (nv === null) return ctx.unk('tee の結果');
      n = nv;
    }
    if (n < 0) ctx.err('ValueError', 'n must be >= 0', '');
    const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
    if (!cur) return ctx.unk('tee の結果');
    const items = drainOrUnk(ctx, cur, 'tee');
    if (items === null) return ctx.unk('tee の結果（供給元が確定しません）');
    const out = [];
    for (let i = 0; i < n; i++) out.push(ITER(items, '_tee'));
    return TUPLE(out);
  },

  zip_longest(ctx, args, kwargs) {
    kwargs = kwargs || {};
    for (const k of Object.keys(kwargs)) {
      if (k !== 'fillvalue') ctx.err('TypeError', "zip_longest() got an unexpected keyword argument '" + k + "'", '');
    }
    const fill = 'fillvalue' in kwargs ? kwargs.fillvalue : NONE;
    const curs = [];
    for (const a of args) {
      const cur = requireCursor(ctx, a, () => notIterableErr(ctx, a));
      if (!cur) return ctx.unk('zip_longest の結果');
      curs.push(cur);
    }
    const out = [];
    const doneFlags = curs.map(() => false);
    for (;;) {
      if (doneFlags.every(Boolean)) break;
      const row = [];
      let anyAlive = false;
      for (let i = 0; i < curs.length; i++) {
        if (doneFlags[i]) { row.push(fill); continue; }
        const r = curs[i].next();
        if (r.unk) return ctx.unk('zip_longest の結果');
        if (r.done) { doneFlags[i] = true; row.push(fill); }
        else { anyAlive = true; row.push(r.value); }
      }
      if (!anyAlive && doneFlags.every(Boolean)) break;
      out.push(TUPLE(row));
      if (out.length > CAP) return ctx.unk('zip_longest の結果（大きすぎます）');
    }
    return ITER(out, 'zip_longest');
  },
};

function combinationsImpl(ctx, args, kwargs, withReplacement) {
  const fname = withReplacement ? 'combinations_with_replacement' : 'combinations';
  noKwargs(ctx, kwargs, fname);
  if (args.length === 0) ctx.err('TypeError', fname + "() missing required argument 'iterable' (pos 1)", '');
  if (args.length === 1) ctx.err('TypeError', fname + "() missing required argument 'r' (pos 2)", '');
  if (args.length > 2) ctx.err('TypeError', fname + '() takes at most 2 arguments (' + args.length + ' given)', '');
  const cur = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
  if (!cur) return ctx.unk(fname + ' の結果');
  const pool = drainOrUnk(ctx, cur, fname);
  if (pool === null) return ctx.unk(fname + ' の結果（供給元が確定しません）');
  const r = indexInt(ctx, args[1]);
  if (r === null) return ctx.unk(fname + ' の結果');
  if (r < 0) ctx.err('ValueError', 'r must be non-negative', '');
  const n = pool.length;
  if (!withReplacement && r > n) return ITER([], fname);
  // 件数上限
  let total = 1n;
  if (withReplacement) {
    // C(n+r-1, r)
    const nn = BigInt(n + r - 1);
    const kk = BigInt(Math.min(r, n - 1 < 0 ? 0 : n - 1));
    if (n === 0 && r > 0) total = 0n;
    else { total = 1n; for (let i = 0n; i < kk; i++) total = (total * (nn - i)) / (i + 1n); }
  } else {
    const kk = BigInt(Math.min(r, n - r));
    total = 1n;
    for (let i = 0n; i < kk; i++) total = (total * (BigInt(n) - i)) / (i + 1n);
  }
  if (total > BigInt(CAP)) { ctx.diag(fname + ' の組み合わせが多すぎるため、この説明では展開しません'); return ctx.unk(fname + ' の結果（組み合わせが多すぎます）'); }
  const out = [];
  if (r === 0) { out.push(TUPLE([])); return ITER(out, fname); }
  if (n === 0) return ITER([], fname);
  if (withReplacement) {
    const idx = new Array(r).fill(0);
    for (;;) {
      out.push(TUPLE(idx.map((i) => pool[i])));
      let i = r - 1;
      while (i >= 0 && idx[i] === n - 1) i--;
      if (i < 0) break;
      const v = idx[i] + 1;
      for (let j = i; j < r; j++) idx[j] = v;
    }
  } else {
    const idx = Array.from({ length: r }, (_, i) => i);
    for (;;) {
      out.push(TUPLE(idx.map((i) => pool[i])));
      let i = r - 1;
      while (i >= 0 && idx[i] === n - r + i) i--;
      if (i < 0) break;
      idx[i]++;
      for (let j = i + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
    }
  }
  return ITER(out, fname);
}

/* chain は CPython ではクラスであり、from_iterable クラスメソッドを持つため、
 * 関数ではなくクラスとして登録する（生成＝連結イテレータの構築）。 */
const CHAIN_DEF = {
  typeName: 'chain',
  construct(ctx, args, kwargs) {
    noKwargs(ctx, kwargs, 'chain');
    const out = [];
    for (const a of args) {
      const cur = requireCursor(ctx, a, () => notIterableErr(ctx, a));
      if (!cur) return ctx.unk('chain の結果');
      const items = drainOrUnk(ctx, cur, 'chain');
      if (items === null) return ctx.unk('chain の結果（供給元が確定しません）');
      for (const x of items) out.push(x);
      if (out.length > CAP) return ctx.unk('chain の結果（大きすぎます）');
    }
    return ITER(out, 'chain');
  },
  classMethods: {
    from_iterable(ctx, args, kwargs) {
      noKwargs(ctx, kwargs, 'chain.from_iterable');
      if (args.length !== 1) ctx.err('TypeError', 'chain.from_iterable() takes exactly one argument (' + args.length + ' given)', '');
      const outer = requireCursor(ctx, args[0], () => notIterableErr(ctx, args[0]));
      if (!outer) return ctx.unk('chain の結果');
      const out = [];
      for (;;) {
        const r = outer.next();
        if (r.done) break;
        if (r.unk) return ctx.unk('chain の結果');
        const inner = requireCursor(ctx, r.value, () => notIterableErr(ctx, r.value));
        if (!inner) return ctx.unk('chain の結果');
        const items = drainOrUnk(ctx, inner, 'chain');
        if (items === null) return ctx.unk('chain の結果（供給元が確定しません）');
        for (const x of items) out.push(x);
        if (out.length > CAP) return ctx.unk('chain の結果（大きすぎます）');
      }
      return ITER(out, 'chain');
    },
  },
};

registerStdlibModule('itertools', {
  functions: FUNCTIONS,
  classes: { chain: CHAIN_DEF },
});
