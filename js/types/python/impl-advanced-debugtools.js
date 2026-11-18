/* 高度モード B7 G12：bdb／pdb／profile／pstats／tracemalloc／timeit／trace
 * ／importlib 一族。
 * 裁定の要点：
 * - 実行トレース・プロファイル・メモリ計測はエンジンの実行モデルと結び
 *   つかないため、原則 unsupported（理由を具体的に caution へ）。
 *   ただし bdb.Breakpoint のデータ管理、pstats.SortKey の値、
 *   tracemalloc のデータクラス（Frame/Traceback/Trace/Statistic/Filter）の
 *   「値としての形」、importlib.util の純粋なパス文字列関数
 *   （cache_from_source/source_from_cache/resolve_name）、
 *   importlib.machinery.ModuleSpec のデータ形、importlib.import_module の
 *   レジストリ済みモジュールへの接続は実装する。
 * - importlib のローダ／ファインダ ABC は参照＋形のみで未検証。
 * - 例外は対応付けする（bdb.BdbQuit、importlib.metadata の
 *   PackageNotFoundError 等）。
 * 一次情報：公式ドキュメント 3.15、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, STDLIB_MODULES } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT } = PyAPI;

function unsupportedFn(mod, name, reason) {
  return (ctx) => ctx.err('未対応', mod + '.' + name + ' は' + reason + 'のため本アプリの高度モードでは未対応です', '');
}
function unverifiedFn(mod, name, reason) {
  return (ctx) => { ctx.diag(mod + '.' + name + ' は' + reason + 'のため意味論を確定できません（未検証）'); return ctx.unk(mod + '.' + name + ' の結果'); };
}
function unsupportedClass(mod, name, reason) {
  return { typeName: name, construct(ctx) { ctx.err('未対応', mod + '.' + name + ' は' + reason + 'のため本アプリの高度モードでは未対応です', ''); return NONE; } };
}

/* ================= bdb ================= */
const bpState = { list: [], byNumber: [] };
let bpNextNumber = 1;
const BreakpointDef = {
  typeName: 'Breakpoint',
  construct(ctx, args, kwargs) {
    // Breakpoint(file, line, temporary=False, cond=None, funcname=None)
    const data = {
      file: args[0], line: ctx.int(args[1]) ?? 0, temporary: args.length > 2 ? ctx.truthy(args[2]) === true : false,
      cond: args.length > 3 ? args[3] : NONE, funcname: args.length > 4 ? args[4] : NONE,
      enabled: true, ignore: 0, hits: 0, number: bpNextNumber++,
    };
    const nat = ctx.native('bdb.Breakpoint', data);
    bpState.list.push(nat); bpState.byNumber.push(nat);
    return nat;
  },
  methods: {
    enable(ctx, self) { self.data.enabled = true; return NONE; },
    disable(ctx, self) { self.data.enabled = false; return NONE; },
    deleteMe(ctx, self) {
      bpState.list = bpState.list.filter((b) => b !== self);
      const idx = bpState.byNumber.indexOf(self); if (idx >= 0) bpState.byNumber[idx] = null;
      return NONE;
    },
    bpprint(ctx, self, args) { ctx.diag(BreakpointDef.repr(ctx, self)); return NONE; },
    bpformat(ctx, self) {
      // CPython: "%d   breakpoint   %s %s   at %s:%d"（keep/del、yes/no）
      return self.data.number + '   breakpoint   ' + (self.data.temporary ? 'del ' : 'keep') + ' ' + (self.data.enabled ? 'yes' : 'no') + '   at ' + ctx.strOf(self.data.file) + ':' + self.data.line;
    },
  },
  attrs: {
    file: (ctx, self) => self.data.file, line: (ctx, self) => NUM(self.data.line, false),
    funcname: (ctx, self) => self.data.funcname, temporary: (ctx, self) => BOOL(self.data.temporary),
    cond: (ctx, self) => self.data.cond, enabled: (ctx, self) => BOOL(self.data.enabled),
    ignore: (ctx, self) => NUM(self.data.ignore, false), hits: (ctx, self) => NUM(self.data.hits, false),
    number: (ctx, self) => NUM(self.data.number, false),
  },
  classAttrs: {
    bplist: (ctx) => { const d = DICT(); return d; },
    bpbynumber: (ctx) => LIST(bpState.byNumber.filter(Boolean)),
  },
  repr(ctx, self) { return BreakpointDef.methods.bpformat(ctx, self); },
};
function findBps(file, line) { return bpState.list.filter((b) => b.data.file === file && (line === undefined || b.data.line === line)); }
const BdbDef = {
  typeName: 'Bdb',
  construct(ctx) { return ctx.native('bdb.Bdb', {}); },
  methods: {
    set_break(ctx, self, args) {
      // set_break(filename, lineno, temporary=False, cond=None, funcname=None)
      const nat = BreakpointDef.construct(ctx, args, {});
      return NONE;
    },
    clear_break(ctx, self, args) {
      const bps = findBps(args[0], ctx.int(args[1]));
      if (!bps.length) return 'There is no breakpoint at ' + ctx.strOf(args[0]) + ':' + (ctx.int(args[1]) ?? 0);
      for (const b of bps) BreakpointDef.methods.deleteMe(ctx, b);
      return NONE;
    },
    clear_all_file_breaks(ctx, self, args) {
      for (const b of findBps(args[0])) BreakpointDef.methods.deleteMe(ctx, b);
      return NONE;
    },
    clear_all_breaks(ctx, self) { for (const b of [...bpState.list]) BreakpointDef.methods.deleteMe(ctx, b); return NONE; },
    clear_bpbynumber(ctx, self, args) {
      const n = ctx.strOf(args[0]);
      const idx = bpState.byNumber.findIndex((b) => b && String(b.data.number) === n);
      if (idx < 0) ctx.err('ValueError', 'Breakpoint number ' + n + ' out of range', '');
      BreakpointDef.methods.deleteMe(ctx, bpState.byNumber[idx]);
      return NONE;
    },
    get_break(ctx, self, args) { return BOOL(findBps(args[0], ctx.int(args[1])).length > 0); },
    get_breaks(ctx, self, args) { return LIST(findBps(args[0])); },
    get_file_breaks(ctx, self, args) { return LIST(findBps(args[0]).map((b) => NUM(b.data.line, false))); },
    get_all_breaks(ctx, self) { return LIST(bpState.list); },
    get_bpbynumber(ctx, self, args) {
      const n = ctx.strOf(args[0]);
      const b = bpState.byNumber.find((x) => x && String(x.data.number) === n);
      if (!b) ctx.err('ValueError', 'Breakpoint number ' + n + ' out of range', '');
      return b;
    },
    canonic(ctx, self, args) { return args[0]; },
    reset(ctx, self) { return NONE; },
    run: unverifiedFn('bdb.Bdb', 'run', 'コード実行のトレース'),
    runctx: unverifiedFn('bdb.Bdb', 'runctx', 'コード実行のトレース'),
    runeval: unverifiedFn('bdb.Bdb', 'runeval', 'コード実行のトレース'),
    runcall: unverifiedFn('bdb.Bdb', 'runcall', 'コード実行のトレース'),
    set_trace: unsupportedFn('bdb.Bdb', 'set_trace', '実行中フレームへの割り込み'),
    set_step: unsupportedFn('bdb.Bdb', 'set_step', '実行トレース'),
    set_next: unsupportedFn('bdb.Bdb', 'set_next', '実行トレース'),
    set_return: unsupportedFn('bdb.Bdb', 'set_return', '実行トレース'),
    set_continue: unsupportedFn('bdb.Bdb', 'set_continue', '実行トレース'),
    set_until: unsupportedFn('bdb.Bdb', 'set_until', '実行トレース'),
    set_quit: unsupportedFn('bdb.Bdb', 'set_quit', '実行トレース'),
    trace_dispatch: unverifiedFn('bdb.Bdb', 'trace_dispatch', 'フレームイベントのディスパッチ'),
    dispatch_call: unverifiedFn('bdb.Bdb', 'dispatch_call', 'フレームイベント'),
    dispatch_line: unverifiedFn('bdb.Bdb', 'dispatch_line', 'フレームイベント'),
    dispatch_return: unverifiedFn('bdb.Bdb', 'dispatch_return', 'フレームイベント'),
    dispatch_exception: unverifiedFn('bdb.Bdb', 'dispatch_exception', 'フレームイベント'),
    user_call: unverifiedFn('bdb.Bdb', 'user_call', 'デバッガフック'),
    user_line: unverifiedFn('bdb.Bdb', 'user_line', 'デバッガフック'),
    user_return: unverifiedFn('bdb.Bdb', 'user_return', 'デバッガフック'),
    user_exception: unverifiedFn('bdb.Bdb', 'user_exception', 'デバッガフック'),
    stop_here: unverifiedFn('bdb.Bdb', 'stop_here', 'フレーム判定'),
    break_here: unverifiedFn('bdb.Bdb', 'break_here', 'フレーム判定'),
    break_anywhere: unverifiedFn('bdb.Bdb', 'break_anywhere', 'フレーム判定'),
    do_clear: unverifiedFn('bdb.Bdb', 'do_clear', '対話コマンド'),
    format_stack_entry: unverifiedFn('bdb.Bdb', 'format_stack_entry', 'フレーム情報'),
    get_stack: unverifiedFn('bdb.Bdb', 'get_stack', 'フレーム情報'),
    is_skipped_module: unverifiedFn('bdb.Bdb', 'is_skipped_module', 'モジュール内省'),
    start_trace: unsupportedFn('bdb.Bdb', 'start_trace', '実行トレース'),
    stop_trace: unsupportedFn('bdb.Bdb', 'stop_trace', '実行トレース'),
    disable_current_event: unverifiedFn('bdb.Bdb', 'disable_current_event', 'フレームイベント'),
    restart_events: unverifiedFn('bdb.Bdb', 'restart_events', 'フレームイベント'),
  },
};
registerStdlibModule('bdb', {
  functions: {
    set_trace: unsupportedFn('bdb', 'set_trace', '実行中フレームへの割り込み'),
    checkfuncname: unverifiedFn('bdb', 'checkfuncname', 'フレーム内省'),
    effective: unverifiedFn('bdb', 'effective', 'フレーム内省'),
  },
  classes: {
    Bdb: BdbDef, Breakpoint: BreakpointDef,
    BdbQuit: { typeName: 'BdbQuit', exc: 'bdb.BdbQuit', excParents: ['Exception'] },
  },
});

/* ================= pdb ================= */
registerStdlibModule('pdb', {
  functions: {
    set_trace: unsupportedFn('pdb', 'set_trace', '対話デバッガの起動'),
    post_mortem: unsupportedFn('pdb', 'post_mortem', 'トレースバック検査'),
    pm: unsupportedFn('pdb', 'pm', 'トレースバック検査'),
    run: unsupportedFn('pdb', 'run', '対話デバッガでの実行'),
    runeval: unsupportedFn('pdb', 'runeval', '対話デバッガでの実行'),
    runcall: unsupportedFn('pdb', 'runcall', '対話デバッガでの実行'),
    set_trace_async: unsupportedFn('pdb', 'set_trace_async', '対話デバッガの起動'),
    get_default_backend: (ctx) => 'pdb',
    set_default_backend: unverifiedFn('pdb', 'set_default_backend', 'デバッガバックエンド切替'),
  },
  classes: { Pdb: unsupportedClass('pdb', 'Pdb', '対話デバッガ') },
});

/* ================= profile / pstats ================= */
registerStdlibModule('profile', {
  functions: {
    run: unsupportedFn('profile', 'run', 'プロファイラでの実行計測'),
    runctx: unsupportedFn('profile', 'runctx', 'プロファイラでの実行計測'),
  },
  classes: { Profile: unsupportedClass('profile', 'Profile', 'プロファイラでの実行計測') },
});
const SortKeyDef = {
  typeName: 'SortKey',
  construct(ctx, args) { return ctx.native('pstats.SortKey', { value: args.length ? ctx.str(args[0]) : '' }); },
  attrs: { value: (ctx, self) => self.data.value, name: (ctx, self) => (self.data.value || '').toUpperCase() },
  classAttrs: {
    CALLS: (ctx) => ctx.native('pstats.SortKey', { value: 'calls' }),
    CUMULATIVE: (ctx) => ctx.native('pstats.SortKey', { value: 'cumulative' }),
    FILENAME: (ctx) => ctx.native('pstats.SortKey', { value: 'filename' }),
    LINE: (ctx) => ctx.native('pstats.SortKey', { value: 'line' }),
    NAME: (ctx) => ctx.native('pstats.SortKey', { value: 'name' }),
    NFL: (ctx) => ctx.native('pstats.SortKey', { value: 'nfl' }),
    PCALLS: (ctx) => ctx.native('pstats.SortKey', { value: 'pcalls' }),
    STDNAME: (ctx) => ctx.native('pstats.SortKey', { value: 'stdname' }),
    TIME: (ctx) => ctx.native('pstats.SortKey', { value: 'time' }),
  },
  eq(ctx, self, other) { return !!(other && other.__native === 'pstats.SortKey' && other.data.value === self.data.value); },
  hash(ctx, self) { return 'sortkey:' + self.data.value; },
  repr(ctx, self) { return '<SortKey.' + (self.data.value || '').toUpperCase() + ': ' + "'" + self.data.value + "'>"; },
};
registerStdlibModule('pstats', {
  classes: {
    SortKey: SortKeyDef,
    Stats: {
      typeName: 'Stats',
      construct(ctx, args) {
        if (args.length && typeof args[0] === 'string') ctx.err('未対応', 'pstats.Stats のファイルからの読み込みはファイル前提のため本アプリの高度モードでは未対応です', '');
        ctx.diag('pstats.Stats はプロファイル結果データが無いため未検証です');
        return ctx.native('pstats.Stats', { stats: {} });
      },
      methods: {
        sort_stats: unverifiedFn('pstats.Stats', 'sort_stats', '統計データ不在'),
        print_stats: unverifiedFn('pstats.Stats', 'print_stats', '統計データ不在'),
        print_callers: unverifiedFn('pstats.Stats', 'print_callers', '統計データ不在'),
        print_callees: unverifiedFn('pstats.Stats', 'print_callees', '統計データ不在'),
        add: unverifiedFn('pstats.Stats', 'add', '統計データ不在'),
        dump_stats: unsupportedFn('pstats.Stats', 'dump_stats', 'ファイル出力前提'),
        strip_dirs(ctx, self) { return self; },
        reverse_order(ctx, self) { return self; },
        get_stats_profile: unverifiedFn('pstats.Stats', 'get_stats_profile', '統計データ不在'),
      },
    },
  },
});

/* ================= tracemalloc ================= */
const TmFrameDef = {
  typeName: 'Frame',
  construct(ctx, args) { return ctx.native('tracemalloc.Frame', { filename: args[0], lineno: ctx.int(args[1]) ?? 0 }); },
  attrs: { filename: (ctx, self) => self.data.filename, lineno: (ctx, self) => NUM(self.data.lineno, false) },
  repr(ctx, self) { return 'Frame(filename=' + ctx.repr(self.data.filename) + ', lineno=' + self.data.lineno + ')'; },
  eq(ctx, self, other) { return !!(other && other.__native === 'tracemalloc.Frame' && other.data.filename === self.data.filename && other.data.lineno === self.data.lineno); },
  hash(ctx, self) { return 'frame:' + self.data.filename + ':' + self.data.lineno; },
};
const TmTracebackDef = {
  typeName: 'Traceback',
  construct(ctx, args) {
    const frames = args.length ? (ctx.listOf(args[0]) || []) : [];
    return ctx.native('tracemalloc.Traceback', { frames, total_nframe: args.length > 1 ? ctx.int(args[1]) : null });
  },
  attrs: {
    total_nframe: (ctx, self) => NUM(self.data.total_nframe !== null && self.data.total_nframe !== undefined ? self.data.total_nframe : self.data.frames.length, false),
  },
  methods: {
    format(ctx, self, args, kwargs) {
      const limit = kwargs.limit !== undefined ? ctx.int(kwargs.limit) : null;
      let frames = self.data.frames;
      if (limit !== null && limit >= 0) frames = frames.slice(-limit);
      return LIST(frames.map((f) => '  File "' + (f.data ? f.data.filename : ctx.strOf(f)) + '", line ' + (f.data ? f.data.lineno : 0)));
    },
  },
  iter(ctx, self) { return self.data.frames; },
  len(ctx, self) { return self.data.frames.length; },
  repr(ctx, self) { return 'Traceback(' + self.data.frames.map((f) => ctx.repr(f)).join(', ') + ')'; },
};
const TmTraceDef = {
  typeName: 'Trace',
  construct(ctx, args) { return ctx.native('tracemalloc.Trace', { domain: ctx.int(args[0]) ?? 0, size: ctx.int(args[1]) ?? 0, traceback: args[2] }); },
  attrs: { domain: (ctx, self) => NUM(self.data.domain, false), size: (ctx, self) => NUM(self.data.size, false), traceback: (ctx, self) => self.data.traceback },
};
function statDef(qual, extra) {
  return {
    typeName: qual.split('.').pop(),
    construct(ctx, args) { return ctx.native(qual, { size: ctx.int(args[0]) ?? 0, count: ctx.int(args[2] !== undefined ? args[2] : args[1]) ?? 0, traceback: args[args.length - 1], ...(extra ? extra(args) : {}) }); },
    attrs: {
      size: (ctx, self) => NUM(self.data.size, false), count: (ctx, self) => NUM(self.data.count, false), traceback: (ctx, self) => self.data.traceback,
      ...(extra && extra.attrs ? extra.attrs : {}),
    },
  };
}
const TmStatisticDef = statDef('tracemalloc.Statistic');
const TmStatisticDiffDef = statDef('tracemalloc.StatisticDiff', (args) => ({ size_diff: 0, count_diff: 0 }));
TmStatisticDiffDef.attrs.size_diff = (ctx, self) => NUM(self.data.size_diff || 0, false);
TmStatisticDiffDef.attrs.count_diff = (ctx, self) => NUM(self.data.count_diff || 0, false);
const TmFilterDef = {
  typeName: 'Filter',
  construct(ctx, args, kwargs) {
    return ctx.native('tracemalloc.Filter', {
      inclusive: args.length ? ctx.truthy(args[0]) === true : true,
      filename_pattern: args.length > 1 ? args[1] : '',
      lineno: args.length > 2 && !ctx.isNone(args[2]) ? ctx.int(args[2]) : null,
      all_frames: kwargs.all_frames !== undefined ? ctx.truthy(kwargs.all_frames) === true : false,
      domain: kwargs.domain !== undefined && !ctx.isNone(kwargs.domain) ? ctx.int(kwargs.domain) : null,
    });
  },
  attrs: {
    inclusive: (ctx, self) => BOOL(self.data.inclusive), filename_pattern: (ctx, self) => self.data.filename_pattern,
    lineno: (ctx, self) => self.data.lineno === null ? NONE : NUM(self.data.lineno, false),
    all_frames: (ctx, self) => BOOL(self.data.all_frames), domain: (ctx, self) => self.data.domain === null ? NONE : NUM(self.data.domain, false),
  },
};
const TmDomainFilterDef = {
  typeName: 'DomainFilter',
  construct(ctx, args) { return ctx.native('tracemalloc.DomainFilter', { inclusive: ctx.truthy(args[0]) === true, domain: ctx.int(args[1]) ?? 0 }); },
  attrs: { inclusive: (ctx, self) => BOOL(self.data.inclusive), domain: (ctx, self) => NUM(self.data.domain, false) },
};
registerStdlibModule('tracemalloc', {
  functions: {
    start: unsupportedFn('tracemalloc', 'start', 'メモリ割り当ての追跡'),
    stop: unsupportedFn('tracemalloc', 'stop', 'メモリ割り当ての追跡'),
    is_tracing: unsupportedFn('tracemalloc', 'is_tracing', 'メモリ割り当ての追跡状態'),
    take_snapshot: unsupportedFn('tracemalloc', 'take_snapshot', 'メモリ割り当ての追跡'),
    get_traced_memory: unsupportedFn('tracemalloc', 'get_traced_memory', 'メモリ割り当ての追跡'),
    get_tracemalloc_memory: unsupportedFn('tracemalloc', 'get_tracemalloc_memory', 'メモリ割り当ての追跡'),
    get_object_traceback: unsupportedFn('tracemalloc', 'get_object_traceback', 'メモリ割り当ての追跡'),
    clear_traces: unsupportedFn('tracemalloc', 'clear_traces', 'メモリ割り当ての追跡'),
    reset_peak: unsupportedFn('tracemalloc', 'reset_peak', 'メモリ割り当ての追跡'),
    get_traceback_limit: unsupportedFn('tracemalloc', 'get_traceback_limit', 'メモリ割り当ての追跡状態'),
  },
  classes: {
    Frame: TmFrameDef, Traceback: TmTracebackDef, Trace: TmTraceDef,
    Statistic: TmStatisticDef, StatisticDiff: TmStatisticDiffDef,
    Filter: TmFilterDef, DomainFilter: TmDomainFilterDef,
    Snapshot: {
      typeName: 'Snapshot',
      construct(ctx, args) { return ctx.native('tracemalloc.Snapshot', { traces: args[0], traceback_limit: args.length > 1 ? ctx.int(args[1]) ?? 1 : 1 }); },
      attrs: { traces: (ctx, self) => self.data.traces, traceback_limit: (ctx, self) => NUM(self.data.traceback_limit, false) },
      methods: {
        statistics(ctx, self, args) {
          // traces（Trace の並び）をキー種別で集計する決定的な部分のみ実装
          const traces = ctx.listOf(self.data.traces) || [];
          let size = 0; for (const t of traces) size += (t.data ? t.data.size : 0);
          const stat = ctx.native('tracemalloc.Statistic', { size, count: traces.length, traceback: traces.length ? traces[0].data.traceback : NONE });
          return LIST([stat]);
        },
        filter_traces(ctx, self, args) { ctx.diag('Snapshot.filter_traces は未検証です'); return ctx.unk('filter_traces の結果'); },
        compare_to: unverifiedFn('tracemalloc.Snapshot', 'compare_to', 'スナップショット比較'),
        dump: unsupportedFn('tracemalloc.Snapshot', 'dump', 'ファイル出力前提'),
        load: unsupportedFn('tracemalloc.Snapshot', 'load', 'ファイル入力前提'),
      },
      classMethods: { load: unsupportedFn('tracemalloc.Snapshot', 'load', 'ファイル入力前提') },
    },
  },
});

/* ================= timeit ================= */
const TimerDef = {
  typeName: 'Timer',
  construct(ctx, args, kwargs) {
    return ctx.native('timeit.Timer', { stmt: args.length ? args[0] : 'pass', setup: args.length > 1 ? args[1] : 'pass' });
  },
  methods: {
    timeit: unverifiedFn('timeit.Timer', 'timeit', '計測値が環境依存'),
    repeat: unverifiedFn('timeit.Timer', 'repeat', '計測値が環境依存'),
    autorange: unverifiedFn('timeit.Timer', 'autorange', '計測値が環境依存'),
    print_exc: unverifiedFn('timeit.Timer', 'print_exc', '例外の整形表示'),
  },
};
registerStdlibModule('timeit', {
  functions: {
    timeit: unverifiedFn('timeit', 'timeit', '計測値が環境依存'),
    repeat: unverifiedFn('timeit', 'repeat', '計測値が環境依存'),
    default_timer: unverifiedFn('timeit', 'default_timer', '時刻源が環境依存'),
  },
  classes: { Timer: TimerDef },
});

/* ================= trace ================= */
registerStdlibModule('trace', {
  functions: {},
  classes: {
    Trace: unsupportedClass('trace', 'Trace', '実行トレース'),
    CoverageResults: unsupportedClass('trace', 'CoverageResults', 'カバレッジ結果の集計・出力'),
  },
});

/* ================= importlib ================= */
registerStdlibModule('importlib', {
  functions: {
    import_module(ctx, args, kwargs) {
      const name = ctx.str(args[0]);
      if (name && STDLIB_MODULES.has(name)) {
        const sv = ctx.unk('モジュール「' + name + '」の内容'); sv.mod = name; return sv;
      }
      ctx.diag('importlib.import_module: エンジンの stdlib レジストリに無いモジュール「' + name + '」は動的に読み込めません（未検証）');
      return ctx.unk('モジュール「' + name + '」の内容');
    },
    invalidate_caches(ctx) { return NONE; },
    reload: unverifiedFn('importlib', 'reload', 'モジュールの再読み込み'),
    __import__: unverifiedFn('importlib', '__import__', 'インポート機構そのもの'),
  },
});
function abcClass(name, methods) {
  const m = {};
  for (const mm of methods || []) m[mm] = unverifiedFn('importlib.abc.' + name, mm, 'ローダ／ファインダの抽象基底クラス');
  return { typeName: name, methods: m };
}
registerStdlibModule('importlib.abc', {
  classes: {
    Loader: abcClass('Loader', ['create_module', 'exec_module']),
    InspectLoader: abcClass('InspectLoader', ['get_source', 'get_code', 'exec_module', 'is_package', 'source_to_code']),
    ExecutionLoader: abcClass('ExecutionLoader', ['get_filename']),
    FileLoader: abcClass('FileLoader', ['get_data', 'get_filename']),
    ResourceLoader: abcClass('ResourceLoader', ['get_data']),
    SourceLoader: abcClass('SourceLoader', ['get_source', 'get_code', 'exec_module', 'is_package', 'path_mtime', 'path_stats', 'set_data']),
    MetaPathFinder: abcClass('MetaPathFinder', ['find_spec', 'invalidate_caches', 'discover']),
    PathEntryFinder: abcClass('PathEntryFinder', ['find_spec', 'invalidate_caches', 'discover']),
  },
});
const ModuleSpecDef = {
  typeName: 'ModuleSpec',
  construct(ctx, args, kwargs) {
    const name = args[0]; const loader = args.length > 1 ? args[1] : NONE;
    const origin = kwargs.origin !== undefined ? kwargs.origin : NONE;
    const isPackage = kwargs.is_package !== undefined ? ctx.truthy(kwargs.is_package) === true : null;
    const parent = typeof name === 'string' && name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : '';
    return ctx.native('importlib.machinery.ModuleSpec', {
      name, loader, origin, loader_state: kwargs.loader_state !== undefined ? kwargs.loader_state : NONE,
      isPackage, parent, submodule_search_locations: isPackage ? LIST([]) : NONE,
      cached: NONE, has_location: !(origin === NONE || (typeof origin === 'string' && origin === '')),
    });
  },
  attrs: {
    name: (ctx, self) => self.data.name, loader: (ctx, self) => self.data.loader, origin: (ctx, self) => self.data.origin,
    loader_state: (ctx, self) => self.data.loader_state, parent: (ctx, self) => self.data.parent,
    submodule_search_locations: (ctx, self) => self.data.submodule_search_locations,
    cached: (ctx, self) => self.data.cached, has_location: (ctx, self) => BOOL(self.data.has_location),
  },
  repr(ctx, self) { return 'ModuleSpec(name=' + ctx.repr(self.data.name) + ', loader=' + ctx.repr(self.data.loader) + ', origin=' + ctx.repr(self.data.origin) + ')'; },
};
registerStdlibModule('importlib.machinery', {
  constants: {
    SOURCE_SUFFIXES: LIST(['.py']),
    DEBUG_BYTECODE_SUFFIXES: LIST(['.pyc']),
    OPTIMIZED_BYTECODE_SUFFIXES: LIST(['.pyc']),
    BYTECODE_SUFFIXES: LIST(['.pyc']),
    EXTENSION_SUFFIXES: LIST(['.cpython-312-x86_64-linux-gnu.so', '.abi3.so', '.so']),
  },
  functions: { all_suffixes(ctx) { return LIST(['.py', '.pyc', '.cpython-312-x86_64-linux-gnu.so', '.abi3.so', '.so']); } },
  classes: {
    ModuleSpec: ModuleSpecDef,
    BuiltinImporter: abcClass('BuiltinImporter', []), FrozenImporter: abcClass('FrozenImporter', []),
    PathFinder: abcClass('PathFinder', ['find_spec', 'invalidate_caches']),
    FileFinder: abcClass('FileFinder', ['find_spec', 'invalidate_caches']),
    ExtensionFileLoader: abcClass('ExtensionFileLoader', ['create_module', 'exec_module', 'get_code', 'get_filename', 'get_source', 'is_package']),
    SourceFileLoader: abcClass('SourceFileLoader', ['is_package', 'path_stats', 'set_data']),
    SourcelessFileLoader: abcClass('SourcelessFileLoader', ['get_code', 'get_source', 'is_package']),
    AppleFrameworkLoader: abcClass('AppleFrameworkLoader', []),
    WindowsRegistryFinder: abcClass('WindowsRegistryFinder', []),
    NamespaceLoader: abcClass('NamespaceLoader', []),
    NamespacePath: { typeName: 'NamespacePath' },
  },
});
registerStdlibModule('importlib.metadata', {
  functions: {
    version: unverifiedFn('importlib.metadata', 'version', 'インストール済みパッケージ情報が環境依存'),
    metadata: unverifiedFn('importlib.metadata', 'metadata', 'パッケージ情報が環境依存'),
    distribution: unverifiedFn('importlib.metadata', 'distribution', 'パッケージ情報が環境依存'),
    distributions: unverifiedFn('importlib.metadata', 'distributions', 'パッケージ情報が環境依存'),
    entry_points: unverifiedFn('importlib.metadata', 'entry_points', 'パッケージ情報が環境依存'),
    files: unverifiedFn('importlib.metadata', 'files', 'パッケージ情報が環境依存'),
    requires: unverifiedFn('importlib.metadata', 'requires', 'パッケージ情報が環境依存'),
    packages_distributions: unverifiedFn('importlib.metadata', 'packages_distributions', 'パッケージ情報が環境依存'),
  },
  classes: {
    Distribution: abcClass('Distribution', []), DistributionFinder: abcClass('DistributionFinder', []),
    EntryPoint: { typeName: 'EntryPoint' }, EntryPoints: { typeName: 'EntryPoints' },
    PackagePath: { typeName: 'PackagePath' }, SimplePath: { typeName: 'SimplePath' },
    PackageMetadata: { typeName: 'PackageMetadata' },
    PackageNotFoundError: { typeName: 'PackageNotFoundError', exc: 'importlib.metadata.PackageNotFoundError', excParents: ['ModuleNotFoundError', 'ImportError'] },
    MetadataNotFound: { typeName: 'MetadataNotFound', exc: 'importlib.metadata.MetadataNotFound', excParents: ['importlib.metadata.PackageNotFoundError'] },
  },
});
registerStdlibModule('importlib.resources', {
  functions: {
    files: unsupportedFn('importlib.resources', 'files', 'パッケージリソースがファイル前提'),
    as_file: unsupportedFn('importlib.resources', 'as_file', 'ファイル前提'),
    contents: unsupportedFn('importlib.resources', 'contents', 'ファイル前提'),
    is_resource: unsupportedFn('importlib.resources', 'is_resource', 'ファイル前提'),
    open_binary: unsupportedFn('importlib.resources', 'open_binary', 'ファイル前提'),
    open_text: unsupportedFn('importlib.resources', 'open_text', 'ファイル前提'),
    path: unsupportedFn('importlib.resources', 'path', 'ファイル前提'),
    read_binary: unsupportedFn('importlib.resources', 'read_binary', 'ファイル前提'),
    read_text: unsupportedFn('importlib.resources', 'read_text', 'ファイル前提'),
  },
  classes: { Anchor: { typeName: 'Anchor' } },
});
registerStdlibModule('importlib.resources.abc', {
  classes: {
    ResourceReader: abcClass('ResourceReader', ['open_resource', 'resource_path', 'is_resource', 'contents']),
    Traversable: abcClass('Traversable', ['is_dir', 'is_file', 'iterdir', 'joinpath', 'open', 'read_bytes', 'read_text', '__truediv__']),
    TraversableResources: abcClass('TraversableResources', ['files']),
  },
});
function cacheFromSource(ctx, path) {
  // CPython 3.12 の規則（__pycache__ + cache_tag 'cpython-312'）
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  const stem = dot >= 0 ? base.slice(0, dot) : base;
  return dir + '__pycache__/' + stem + '.cpython-312.pyc';
}
registerStdlibModule('importlib.util', {
  functions: {
    cache_from_source(ctx, args, kwargs) {
      const path = ctx.str(args[0]);
      if (kwargs.optimization !== undefined && !ctx.isNone(kwargs.optimization) && ctx.str(kwargs.optimization)) {
        const opt = ctx.str(kwargs.optimization);
        const base = cacheFromSource(ctx, path);
        return base.replace('.cpython-312.pyc', '.cpython-312.opt-' + opt + '.pyc');
      }
      return cacheFromSource(ctx, path);
    },
    source_from_cache(ctx, args) {
      const path = ctx.str(args[0]);
      const m = /^(.*)__pycache__\/([^/]+)\.cpython-\d+(?:\.opt-\d+)?\.pyc$/.exec(path);
      if (!m) ctx.err('ValueError', path + ' is not a cache path', '');
      return m[1] + m[2] + '.py';
    },
    resolve_name(ctx, args) {
      const name = ctx.str(args[0]); const pkg = args.length > 1 ? ctx.str(args[1]) : null;
      if (!name.startsWith('.')) return name;
      if (!pkg) ctx.err('ImportError', 'attempted relative import with no known parent package', '');
      let level = 0; while (name[level] === '.') level++;
      const bits = pkg.split('.');
      if (bits.length < level) ctx.err('ImportError', 'attempted relative import beyond top-level package', '');
      const base = bits.slice(0, bits.length - level + 1).join('.');
      const rest = name.slice(level);
      return rest ? base + '.' + rest : base;
    },
    find_spec: unverifiedFn('importlib.util', 'find_spec', 'インポート機構の探索'),
    module_from_spec: unverifiedFn('importlib.util', 'module_from_spec', 'インポート機構'),
    spec_from_loader: unverifiedFn('importlib.util', 'spec_from_loader', 'インポート機構'),
    spec_from_file_location: unverifiedFn('importlib.util', 'spec_from_file_location', 'ファイル前提'),
    decode_source: unverifiedFn('importlib.util', 'decode_source', 'バイト列のデコード'),
    source_hash: unverifiedFn('importlib.util', 'source_hash', 'バイト列のハッシュ'),
    _incompatible_extension_module_restrictions: unverifiedFn('importlib.util', '_incompatible_extension_module_restrictions', '拡張モジュール検査'),
  },
  classes: { LazyLoader: abcClass('LazyLoader', ['factory']) },
});
