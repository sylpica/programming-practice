/* 高度モード B7 G4：graphlib モジュール（8件）。
 * TopologicalSorter の状態機械（add/prepare/get_ready/done/is_active/static_order）を
 * CPython どおりに再現する。ノードの同一性はエンジンの辞書キー意味論に合わせ、
 * 内部的には等価スキャンで管理する。CycleError は ValueError の子として登録する。 */
import { registerStdlibModule, registerStdlibException } from './stdlib-registry.js';
import { BOOL, NONE, LIST, ITER, TUPLE, isNone, arity } from './impl-advanced-g4-common.js';

registerStdlibException('graphlib.CycleError', ['ValueError']);

function nodeIndex(ctx, nodes, node) {
  for (let i = 0; i < nodes.length; i++) if (ctx.eq(nodes[i], node) === true) return i;
  return -1;
}

const TopologicalSorterDef = {
  typeName: 'TopologicalSorter',
  construct: (ctx, args) => {
    arity(ctx, args, 0, 1, 'TopologicalSorter');
    const self = { __native: 'graphlib.TopologicalSorter', mod: 'graphlib',
      data: { nodes: [], graph: [], prepared: false, readyOut: new Set(), doneSet: new Set(), active: false } };
    if (args.length === 1 && !isNone(args[0])) {
      const pairs = (function () {
        const v = args[0];
        if (v && v.__dict instanceof Map) return [...v.__dict.values()].map((e) => [e.k, e.v]);
        return null;
      })();
      if (!pairs) ctx.err('TypeError', 'TopologicalSorter() の引数にはグラフの辞書を使ってください', '');
      for (const [node, preds] of pairs) tsAdd(ctx, self, [node, ...ctx.iterable(preds) || []]);
    }
    return self;
  },
  methods: {
    add: (ctx, self, args) => { tsAdd(ctx, self, args); return NONE; },
    prepare: (ctx, self) => {
      const d = self.data;
      if (d.prepared) ctx.err('ValueError', 'cannot prepare() more than once', '');
      d.prepared = true;
      /* 循環検出：未処理の依存を持つノードから DFS */
      const state = new Map();
      const hasCycleFrom = (i, path) => {
        state.set(i, 1); path.push(i);
        for (const p of d.graph[i].preds) {
          if (state.get(p) === 1) return path.slice(path.indexOf(p));
          if (!state.get(p)) { const r = hasCycleFrom(p, path); if (r) return r; }
        }
        path.pop(); state.set(i, 2);
        return null;
      };
      for (let i = 0; i < d.nodes.length; i++) {
        if (!state.get(i)) {
          const cycIdx = hasCycleFrom(i, []);
          if (cycIdx) {
            ctx.err('graphlib.CycleError', 'nodes are in a cycle', '');
          }
        }
      }
      d.active = d.nodes.length > 0;
      return NONE;
    },
    get_ready: (ctx, self) => {
      const d = self.data;
      if (!d.prepared) ctx.err('ValueError', 'prepare() must be called first', '');
      const out = [];
      for (let i = 0; i < d.nodes.length; i++) {
        if (d.doneSet.has(i) || d.readyOut.has(i)) continue;
        const deps = d.graph[i].preds;
        if (deps.every((p) => d.doneSet.has(p))) { d.readyOut.add(i); out.push(d.nodes[i]); }
      }
      return TUPLE(out);
    },
    done: (ctx, self, args) => {
      const d = self.data;
      if (!d.prepared) ctx.err('ValueError', 'prepare() must be called first', '');
      for (const node of args) {
        const i = nodeIndex(ctx, d.nodes, node);
        if (i < 0) ctx.err('ValueError', "node '" + ctx.strOf(node) + "' was not added using add()", '');
        if (!d.readyOut.has(i) || d.doneSet.has(i)) ctx.err('ValueError', "node '" + ctx.strOf(node) + "' was not passed out (still not ready)", '');
        d.doneSet.add(i);
      }
      if (d.doneSet.size >= d.nodes.length) d.active = false;
      return NONE;
    },
    is_active: (ctx, self) => {
      const d = self.data;
      if (!d.prepared) ctx.err('ValueError', 'prepare() must be called first', '');
      return BOOL(d.active && d.doneSet.size < d.nodes.length);
    },
    static_order: (ctx, self) => {
      const d = self.data;
      /* 複製した状態で prepare→get_ready→done を回す */
      const sim = { __native: 'graphlib.TopologicalSorter', mod: 'graphlib',
        data: { nodes: d.nodes, graph: d.graph, prepared: false, readyOut: new Set(), doneSet: new Set(), active: false } };
      const methods = TopologicalSorterDef.methods;
      methods.prepare(ctx, sim, []);
      const out = [];
      for (;;) {
        const ready = methods.get_ready(ctx, sim, []);
        if (!ready.__tuple.length) break;
        out.push(...ready.__tuple);
        methods.done(ctx, sim, ready.__tuple.slice());
      }
      return ITER(out, 'generator');
    },
  },
  truthy: () => true,
};
function tsAdd(ctx, self, args) {
  const d = self.data;
  if (d.prepared) ctx.err('ValueError', 'cannot add() after prepare()', '');
  if (!args.length) ctx.err('TypeError', 'add() はノードを1つ以上渡してください', '');
  const node = args[0];
  let ni = nodeIndex(ctx, d.nodes, node);
  if (ni < 0) { ni = d.nodes.length; d.nodes.push(node); d.graph.push({ preds: [], succs: [] }); }
  for (let q = 1; q < args.length; q++) {
    const pred = args[q];
    let pi = nodeIndex(ctx, d.nodes, pred);
    if (pi < 0) { pi = d.nodes.length; d.nodes.push(pred); d.graph.push({ preds: [], succs: [] }); }
    if (!d.graph[ni].preds.includes(pi)) d.graph[ni].preds.push(pi);
    if (!d.graph[pi].succs.includes(ni)) d.graph[pi].succs.push(ni);
  }
}

registerStdlibModule('graphlib', {
  classes: {
    CycleError: { typeName: 'CycleError', exc: 'graphlib.CycleError', excParents: ['ValueError'] },
    TopologicalSorter: TopologicalSorterDef,
  },
});
