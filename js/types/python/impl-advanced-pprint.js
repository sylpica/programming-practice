/* 高度モード B7 G4：pprint モジュール（12件）。
 * PrettyPrinter の整形アルゴリズム（幅折り返し・compact・深さ制限・辞書キー
 * ソート（混合型は repr 順へフォールバック）・長い文字列の暗黙連結）を
 * CPython の _pprint_* 系の規則で再現する。
 * pprint()/pp()/PrettyPrinter.pprint はエンジンの ctx に出力 API がないため未検証
 * （整形結果は破棄され、理由を診断表示する）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { BOOL, NONE, TUPLE, isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, arity, noKwargs, dictPairs, cmp3 } from './impl-advanced-g4-common.js';
import { pairsOfValue } from './impl-advanced-collections.js';

function newState(ctx, kwargs) {
  const st = { indent: 1, width: 80, depth: null, compact: false, sortDicts: true, underscore: false };
  const kw = kwargs || {};
  return st;
}
function makePrinter(ctx, args, kwargs) {
  const st = newState(ctx);
  const pos = ['indent', 'width', 'depth', 'stream'];
  args.forEach((v, i) => {
    if (pos[i] === 'indent') { const n = ctx.int(v); if (n !== null && n !== undefined) st.indent = Math.trunc(n); }
    if (pos[i] === 'width') { const n = ctx.int(v); if (n !== null && n !== undefined) st.width = Math.trunc(n); }
    if (pos[i] === 'depth') st.depth = isNone(v) ? null : (ctx.int(v) ?? null);
  });
  const kw = kwargs || {};
  if ('indent' in kw) { const n = ctx.int(kw.indent); if (n !== null && n !== undefined) st.indent = Math.trunc(n); }
  if ('width' in kw) { const n = ctx.int(kw.width); if (n !== null && n !== undefined) st.width = Math.trunc(n); }
  if ('depth' in kw) st.depth = isNone(kw.depth) ? null : (ctx.int(kw.depth) ?? null);
  if ('compact' in kw) st.compact = ctx.truthy(kw.compact) === true;
  if ('sort_dicts' in kw) st.sortDicts = ctx.truthy(kw.sort_dicts) === true;
  if ('underscore_numbers' in kw) st.underscore = ctx.truthy(kw.underscore_numbers) === true;
  return st;
}

function numStr(ctx, v, st) {
  let s = ctx.repr(v);
  if (st.underscore && isNum(v) && !v.f && /^-?\d{4,}$/.test(s)) {
    const neg = s.startsWith('-');
    const digits = neg ? s.slice(1) : s;
    s = (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
  }
  return s;
}
function isContainer(v) {
  return isList(v) || isTuple(v) || isDict(v) || isSet(v) || !!pairsOfValue(v) ||
    (v && v.__native && ['collections.deque', 'array.array'].includes(v.__native));
}
function isRecursiveCheck(ctx, v, seen) {
  if (!isContainer(v)) return false;
  if (seen.has(v)) return true;
  seen.add(v);
  const children = containerChildren(v);
  for (const c of children) if (isRecursiveCheck(ctx, c, seen)) return true;
  seen.delete(v);
  return false;
}
function containerChildren(v) {
  if (isList(v)) return v.__list;
  if (isTuple(v)) return v.__tuple;
  if (isSet(v)) return v.__set;
  if (isDict(v)) { const out = []; for (const e of v.__dict.values()) { out.push(e.k, e.v); } return out; }
  const pairs = pairsOfValue(v);
  if (pairs) { const out = []; for (const [k, val] of pairs) { out.push(k, val); } return out; }
  if (v && v.__native === 'collections.deque') return v.data.items;
  if (v && v.__native === 'array.array') return v.data.items;
  return [];
}

/* 1行表現（幅無制限の素の repr 相当。ただし数値のアンダースコア等は適用） */
function flat(ctx, st, v, level, seen) {
  return formatValue(ctx, st, v, 0, level, seen, true).text;
}

/* CPython の pprint._safe_key の移植：まず直接比較を試し、TypeError（エンジン
 * では未確定値）なら型名の文字列で比べる。同型同士で比較不能な場合の id 順は
 * 再現しない。 */
function pyTypeName(ctx, v) {
  if (v && v.__native) return ctx.typeName(v);
  if (v && v.__ncls) return ctx.typeName(v);
  return ctx.typeName(v);
}
function sortPairs(ctx, st, pairs) {
  if (!st.sortDicts) return pairs.slice();
  const arr = pairs.slice();
  arr.sort((a, b) => {
    let c = null;
    try { c = cmp3(ctx, a[0], b[0]); } catch (e) { c = null; }
    if (c !== null && c !== undefined) return c;
    const ta = "<class '" + pyTypeName(ctx, a[0]) + "'>";
    const tb = "<class '" + pyTypeName(ctx, b[0]) + "'>";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
  return arr;
}
function sortSetItems(ctx, st, items) {
  const arr = items.slice();
  try {
    arr.sort((a, b) => {
      const c = cmp3(ctx, a, b);
      if (c === null) throw new Error('fallback');
      return c;
    });
  } catch (e) {
    arr.sort((a, b) => { const ra = ctx.repr(a), rb = ctx.repr(b); return ra < rb ? -1 : ra > rb ? 1 : 0; });
  }
  return arr;
}

/* コア整形。indentNow = 現在行の開始列。返り値 {text, readable, recursive} */
function formatValue(ctx, st, v, indentNow, level, seen, flatMode) {
  if (isUnk(v)) return { text: '...', readable: false, recursive: false };
  if (typeof v === 'string') return { text: stringFlat(ctx, st, v, indentNow), readable: true, recursive: false };
  if (isNum(v)) return { text: numStr(ctx, v, st), readable: true, recursive: false };
  if (isBool(v) || isNone(v)) return { text: ctx.repr(v), readable: true, recursive: false };
  if (!isContainer(v)) return { text: ctx.repr(v), readable: true, recursive: false };
  if (seen.has(v)) {
    const kind = isList(v) ? 'list' : isDict(v) || pairsOfValue(v) ? 'dict' : isTuple(v) ? 'tuple' : 'set';
    return { text: '<Recursion on ' + kind + '>', readable: false, recursive: true };
  }
  if (st.depth !== null && level > st.depth) {
    const t = isList(v) ? '[...]' : isTuple(v) ? '(...)' : '{...}';
    return { text: t, readable: false, recursive: false };
  }
  seen.add(v);
  try {
    return formatContainer(ctx, st, v, indentNow, level, seen, flatMode);
  } finally {
    seen.delete(v);
  }
}
function stringFlat(ctx, st, v, indentNow) {
  const r = ctx.repr(v);
  if (indentNow + r.length <= st.width) return r;
  /* 長い文字列は暗黙連結で分割する（CPython の _pprint_str の近似） */
  const avail = Math.max(10, st.width - indentNow - 2);
  const chunks = [];
  let rest = v;
  while (rest.length) {
    const take = Array.from(rest).slice(0, avail).join('');
    chunks.push(take);
    rest = Array.from(rest).slice(avail).join('');
  }
  if (chunks.length <= 1) return r;
  const pad = ' '.repeat(indentNow);
  return '(' + chunks.map((c) => ctx.repr(c)).join('\n' + pad) + ')';
}
function formatContainer(ctx, st, v, indentNow, level, seen, flatMode) {
  /* 表記情報の決定 */
  let open, close, items, kind;
  if (isList(v)) { open = '['; close = ']'; items = v.__list.map((x) => ({ s: null, v: x })); kind = 'list'; }
  else if (isTuple(v)) { open = '('; close = ')'; items = v.__tuple.map((x) => ({ s: null, v: x })); kind = 'tuple'; }
  else if (isSet(v)) { open = '{'; close = '}'; items = sortSetItems(ctx, st, v.__set).map((x) => ({ s: null, v: x })); kind = 'set'; }
  else if (v && v.__native === 'collections.deque') { open = 'deque(['; close = '])'; items = v.data.items.map((x) => ({ s: null, v: x })); kind = 'deque'; }
  else if (v && v.__native === 'array.array') { open = "array('" + v.data.typecode + "', ["; close = '])'; items = v.data.items.map((x) => ({ s: null, v: x })); kind = 'array'; }
  else {
    /* 辞書系：Counter は出現回数順、それ以外はソート規則 */
    const rawPairs = pairsOfValue(v);
    let pairs = rawPairs;
    if (v && v.__native === 'collections.Counter') {
      pairs = rawPairs.slice().sort((a, b) => {
        const av = isNum(a[1]) ? a[1].v : 0, bv = isNum(b[1]) ? b[1].v : 0;
        return bv - av;
      });
      open = 'Counter({'; close = '})'; kind = 'counter';
    } else if (v && v.__native === 'collections.OrderedDict') { open = 'OrderedDict({'; close = '})'; kind = 'odict'; pairs = rawPairs; }
    else { open = '{'; close = '}'; kind = 'dict'; pairs = sortPairs(ctx, st, rawPairs); }
    items = pairs.map(([k, val]) => ({ k, v: val }));
  }
  const itemIndent = indentNow + open.length;
  const parts = items.map((it) => {
    if (it.k !== undefined) {
      const ks = flat(ctx, st, it.k, level + 1, new Set(seen));
      const vs = formatValue(ctx, st, it.v, itemIndent + ks.length + 2, level + 1, seen, flatMode);
      return { text: ks + ': ' + vs.text, readable: vs.readable, recursive: vs.recursive, v: it.v };
    }
    const r = formatValue(ctx, st, it.v, itemIndent, level + 1, seen, flatMode);
    return { text: r.text, readable: r.readable, recursive: r.recursive, v: it.v };
  });
  let readable = parts.every((p) => p.readable);
  const recursive = parts.some((p) => p.recursive);
  const oneLine = open + parts.map((p) => p.text).join(', ') + (kind === 'tuple' && parts.length === 1 ? ',' : '') + close;
  if (!items.length) {
    const emptyText = { list: '[]', tuple: '()', set: 'set()', dict: '{}', counter: 'Counter()', odict: 'OrderedDict()', deque: 'deque([])', array: "array('" + v.data.typecode + "', [])" }[kind];
    return { text: emptyText, readable: true, recursive: false };
  }
  if (flatMode || indentNow + oneLine.length <= st.width) return { text: oneLine, readable, recursive };
  /* 折り返し */
  const pad = ' '.repeat(itemIndent);
  if (st.compact && kind !== 'dict' && kind !== 'counter' && kind !== 'odict') {
    /* 1行に収まる要素を詰める */
    const lines = [];
    let cur = open;
    let curLen = indentNow + open.length;
    parts.forEach((p, i) => {
      const piece = p.text + (i < parts.length - 1 ? ', ' : '');
      if (i > 0 && curLen + piece.length > st.width) { lines.push(cur); cur = pad + piece; curLen = itemIndent + piece.length; }
      else { cur += (i > 0 && lines.length === 0 && cur === open ? '' : '') + piece; curLen += piece.length; }
    });
    lines.push(cur);
    return { text: lines.join('\n') + close, readable, recursive };
  }
  /* CPython のレイアウト：最初の要素は開き括弧の直後、以降は itemIndent で
   * 揃えて改行し、閉じ括弧は最後の要素の直後に付ける */
  let text = open + parts[0].text;
  for (let i = 1; i < parts.length; i++) text += ',\n' + pad + parts[i].text;
  text += close;
  return { text, readable, recursive };
}

function pformatCore(ctx, st, v) {
  return formatValue(ctx, st, v, 0, 1, new Set(), false);
}

const PrettyPrinterDef = {
  typeName: 'PrettyPrinter',
  construct: (ctx, args, kwargs) => {
    const st = makePrinter(ctx, args, kwargs || {});
    return ctx.native('pprint.PrettyPrinter', { st });
  },
  methods: {
    pformat: (ctx, self, args) => { arity(ctx, args, 1, 1, 'pformat'); return pformatCore(ctx, self.data.st, args[0]).text; },
    pprint: (ctx, self, args) => {
      arity(ctx, args, 1, 1, 'pprint');
      pformatCore(ctx, self.data.st, args[0]);
      ctx.diag('pprint の出力先（標準出力）へ書き出す仕組みがこのエンジンの ctx にないため、表示は再現できません');
      return ctx.unk('PrettyPrinter.pprint() の結果');
    },
    format: (ctx, self, args) => {
      arity(ctx, args, 4, 4, 'format');
      const [object, , maxlevels, level] = args;
      const ml = ctx.int(maxlevels) ?? 0;
      const lv = ctx.int(level) ?? 0;
      const st = Object.assign({}, self.data.st);
      /* maxlevels=0 は無制限。深さは (maxlevels - level) 段まで */
      st.depth = ml > 0 ? ml - lv : null;
      const recursive = isRecursiveCheck(ctx, object, new Set());
      const r = formatValue(ctx, st, object, 0, 1, new Set(), false);
      return TUPLE([r.text, BOOL(recursive ? false : r.readable), BOOL(recursive)]);
    },
    isreadable: (ctx, self, args) => { arity(ctx, args, 1, 1, 'isreadable'); return BOOL(!isRecursiveCheck(ctx, args[0], new Set())); },
    isrecursive: (ctx, self, args) => { arity(ctx, args, 1, 1, 'isrecursive'); return BOOL(isRecursiveCheck(ctx, args[0], new Set())); },
  },
  truthy: () => true,
};

registerStdlibModule('pprint', {
  functions: {
    pformat: (ctx, args, kwargs) => {
      arity(ctx, args, 1, 1, 'pformat');
      const st = makePrinter(ctx, [], kwargs || {});
      return pformatCore(ctx, st, args[0]).text;
    },
    pprint: (ctx, args, kwargs) => {
      arity(ctx, args, 1, 1, 'pprint');
      const st = makePrinter(ctx, [], kwargs || {});
      pformatCore(ctx, st, args[0]);
      ctx.diag('pprint() の出力先（標準出力）へ書き出す仕組みがこのエンジンの ctx にないため、表示は再現できません');
      return ctx.unk('pprint() の結果');
    },
    pp: (ctx, args, kwargs) => {
      arity(ctx, args, 1, 1, 'pp');
      const st = makePrinter(ctx, [], kwargs || {});
      st.sortDicts = false;
      pformatCore(ctx, st, args[0]);
      ctx.diag('pp() の出力先（標準出力）へ書き出す仕組みがこのエンジンの ctx にないため、表示は再現できません');
      return ctx.unk('pp() の結果');
    },
    isreadable: (ctx, args) => { arity(ctx, args, 1, 1, 'isreadable'); return BOOL(!isRecursiveCheck(ctx, args[0], new Set())); },
    isrecursive: (ctx, args) => { arity(ctx, args, 1, 1, 'isrecursive'); return BOOL(isRecursiveCheck(ctx, args[0], new Set())); },
    saferepr: (ctx, args) => { arity(ctx, args, 1, 1, 'saferepr'); return ctx.repr(args[0]); },
  },
  classes: { PrettyPrinter: PrettyPrinterDef },
});
