/* 高度モード B7 G12：logging（103件）＋ logging.handlers（68件）＋
 * logging.config（4件）。
 * 裁定：
 * - Logger/Formatter/LogRecord/Handler/Filter/LoggerAdapter の中核は実装。
 * - StreamHandler の emit 先はエンジンの出力チャネルが無いため、整形済み
 *   レコードをシミュレーションの注記（diag）として表示し、同時に
 *   ハンドラ内部の保持リストにも残す（print 出力とは別。報告書明記）。
 * - FileHandler と logging.handlers のファイル／ネットワーク系ハンドラは
 *   ファイル・ソケット前提のため未対応（生成時点で名指し停止）。
 *   MemoryHandler と QueueHandler はメモリ内で完結するため実装する。
 * - 時刻は LogRecord.created を 0.0 で初期化する決定的な値とし、実時刻は
 *   扱わない（asctime の絶対値は環境依存のため検証対象にしない）。
 * 一次情報：公式ドキュメント 3.15 library/logging、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE, DICT } = PyAPI;

export const LEVELS = { CRITICAL: 50, FATAL: 50, ERROR: 40, WARNING: 30, WARN: 30, INFO: 20, DEBUG: 10, NOTSET: 0 };
const levelNames = new Map([[50, 'CRITICAL'], [40, 'ERROR'], [30, 'WARNING'], [20, 'INFO'], [10, 'DEBUG'], [0, 'NOTSET']]);
let globalDisable = 0;
const loggerRegistry = new Map();
let logRecordFactory = null;
let loggerClassRef = null;

function levelOf(ctx, v) {
  if (ctx.isNum(v) || ctx.isBool(v)) return ctx.num(v) ?? 0;
  if (typeof v === 'string') { const n = LEVELS[v.toUpperCase()]; if (n !== undefined) return n; ctx.err('ValueError', "Unknown level: '" + v + "'", ''); }
  ctx.err('TypeError', 'レベルは int または文字列でなければなりません', '');
  return 0;
}
export function getLevelNameImpl(ctx, v) {
  if (typeof v === 'string') {
    // CPython: getLevelName('INFO') -> 20
    const up = v.toUpperCase();
    if (LEVELS[up] !== undefined) return NUM(LEVELS[up], false);
    for (const [num, name] of levelNames) if (name === v) return NUM(num, false);
    return 'Level ' + v;
  }
  const n = ctx.num(v);
  if (n === null) ctx.err('TypeError', 'getLevelName(): 引数は int または文字列でなければなりません', '');
  return levelNames.get(n) || ('Level ' + n);
}
function formatMsg(ctx, msgVal, argsVal) {
  let msg = typeof msgVal === 'string' ? msgVal : ctx.strOf(msgVal);
  if (argsVal === undefined || argsVal === null || ctx.isNone(argsVal)) return msg;
  const args = ctx.listOf(argsVal);
  if (args !== null) {
    if (!args.length) return msg;
    let idx = 0;
    return msg.replace(/%[#0\- +]*\d*(?:\.\d+)?[diouxXeEfFgGcrsa%]/g, (m) => {
      if (m === '%%') return '%';
      if (idx >= args.length) return m;
      const v = args[idx++];
      const conv = m[m.length - 1];
      if (conv === 'd' || conv === 'i' || conv === 'u') { const n = ctx.num(v); return n === null ? ctx.strOf(v) : String(Math.trunc(n)); }
      if (conv === 'f' || conv === 'F') { const n = ctx.num(v); const prec = /\.(\d+)/.exec(m); return n === null ? ctx.strOf(v) : n.toFixed(prec ? Number(prec[1]) : 6); }
      if (conv === 'e' || conv === 'E') { const n = ctx.num(v); return n === null ? ctx.strOf(v) : (conv === 'e' ? n.toExponential(6) : n.toExponential(6).toUpperCase()); }
      if (conv === 'g' || conv === 'G') { const n = ctx.num(v); return n === null ? ctx.strOf(v) : String(n); }
      if (conv === 'r' || conv === 'a') return ctx.repr(v);
      return ctx.strOf(v);
    });
  }
  if (ctx.isDict(argsVal)) {
    return msg.replace(/%\(([^)]+)\)[#0\- +]*\d*(?:\.\d+)?[diouxXeEfFgGcrsa]/g, (m, key) => {
      const v = PyAPI.dictGet(argsVal, key);
      return v === undefined ? m : ctx.strOf(v);
    });
  }
  // 単一引数
  return msg.replace(/%[#0\- +]*\d*(?:\.\d+)?[diouxXeEfFgGcrsa%]/, (m) => (m === '%%' ? '%' : ctx.strOf(argsVal)));
}
function makeRecordData(ctx, name, level, pathname, lineno, msg, args, excInfo, func) {
  return {
    name, levelno: level, levelname: levelNames.get(level) || ('Level ' + level),
    pathname: pathname || '', lineno: lineno || 0, msg, args: args || NONE,
    exc_info: excInfo || NONE, funcName: func || '', created: 0, msecs: 0, relativeCreated: 0,
    threadName: 'MainThread', processName: 'MainProcess', taskName: NONE,
  };
}
function recordNative(ctx, data) { return ctx.native('logging.LogRecord', { rec: data }); }
const LogRecordDef = {
  typeName: 'LogRecord',
  construct(ctx, args, kwargs) {
    const name = args[0]; const level = ctx.num(args[1]) ?? 0;
    const data = makeRecordData(ctx, name, level, args[2], ctx.int(args[3]) ?? 0, args[4], args[5], args[6], args.length > 7 ? args[7] : '');
    return recordNative(ctx, data);
  },
  methods: {
    getMessage(ctx, self) { return formatMsg(ctx, self.data.rec.msg, self.data.rec.args); },
  },
  attrs: {
    name: (ctx, self) => self.data.rec.name, levelno: (ctx, self) => NUM(self.data.rec.levelno, false),
    levelname: (ctx, self) => self.data.rec.levelname, pathname: (ctx, self) => self.data.rec.pathname,
    lineno: (ctx, self) => NUM(self.data.rec.lineno, false), msg: (ctx, self) => self.data.rec.msg,
    args: (ctx, self) => self.data.rec.args, exc_info: (ctx, self) => self.data.rec.exc_info,
    funcName: (ctx, self) => self.data.rec.funcName, created: (ctx, self) => NUM(self.data.rec.created, true),
    msecs: (ctx, self) => NUM(self.data.rec.msecs, true), relativeCreated: (ctx, self) => NUM(self.data.rec.relativeCreated, true),
    threadName: (ctx, self) => self.data.rec.threadName, processName: (ctx, self) => self.data.rec.processName,
    filename: (ctx, self) => { const p = self.data.rec.pathname; return p.split('/').pop(); },
    module: (ctx, self) => { const p = self.data.rec.pathname.split('/').pop() || ''; return p.replace(/\.[^.]*$/, ''); },
    message: (ctx, self) => formatMsg(ctx, self.data.rec.msg, self.data.rec.args),
    asctime: (ctx, self) => NONE,
  },
};
function formatTimeImpl(ctx, rec, datefmt) {
  // created=0 を UTC として整形する決定的実装（CPython はローカル時刻を使うため絶対値は環境依存）
  const d = new Date(rec.created * 1000);
  const p2 = (n) => String(n).padStart(2, '0');
  if (datefmt) {
    return datefmt.replace('%Y', String(d.getUTCFullYear())).replace('%m', p2(d.getUTCMonth() + 1)).replace('%d', p2(d.getUTCDate()))
      .replace('%H', p2(d.getUTCHours())).replace('%M', p2(d.getUTCMinutes())).replace('%S', p2(d.getUTCSeconds()));
  }
  return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()) + ',' + String(Math.floor(rec.msecs)).padStart(3, '0');
}
const FormatterDef = {
  typeName: 'Formatter',
  construct(ctx, args, kwargs) {
    const fmt = kwargs.fmt !== undefined ? ctx.str(kwargs.fmt) : (args.length && !ctx.isNone(args[0]) ? ctx.str(args[0]) : '%(message)s');
    const datefmt = kwargs.datefmt !== undefined ? ctx.str(kwargs.datefmt) : (args.length > 1 && !ctx.isNone(args[1]) ? ctx.str(args[1]) : null);
    const style = kwargs.style !== undefined ? ctx.str(kwargs.style) : (args.length > 2 ? ctx.str(args[2]) : '%');
    const defaults = kwargs.defaults !== undefined ? kwargs.defaults : null;
    return ctx.native('logging.Formatter', { fmt: fmt ?? '%(message)s', datefmt, style: style || '%', defaults });
  },
  methods: {
    format(ctx, self, args) {
      const recVal = args[0];
      const rec = recVal && recVal.data && recVal.data.rec ? recVal.data.rec : makeRecordData(ctx, '', 0, '', 0, '', NONE, NONE, '');
      const fields = {
        name: rec.name, levelname: rec.levelname, levelno: String(rec.levelno), message: formatMsg(ctx, rec.msg, rec.args),
        pathname: rec.pathname, filename: rec.pathname.split('/').pop(), module: (rec.pathname.split('/').pop() || '').replace(/\.[^.]*$/, ''),
        funcName: rec.funcName, lineno: String(rec.lineno), asctime: formatTimeImpl(ctx, rec, self.data.datefmt),
        created: String(rec.created), msecs: String(rec.msecs), relativeCreated: String(rec.relativeCreated),
        threadName: rec.threadName, processName: rec.processName, msg: typeof rec.msg === 'string' ? rec.msg : ctx.strOf(rec.msg),
      };
      if (self.data.defaults && ctx.isDict(self.data.defaults)) {
        for (const [k, v] of self.data.defaults.__dict) fields[typeof k === 'string' ? k : ctx.strOf(k)] = ctx.strOf(v);
      }
      const style = self.data.style;
      if (style === '{') {
        return self.data.fmt.replace(/\{(\w+)(?::([^}]*))?\}/g, (m, key) => (key in fields ? fields[key] : m));
      }
      if (style === '$') {
        return self.data.fmt.replace(/\$\{?(\w+)\}?/g, (m, key) => (key in fields ? fields[key] : m));
      }
      return self.data.fmt.replace(/%\((\w+)\)([#0\- +]*\d*(?:\.\d+)?[a-zA-Z%])/g, (m, key, spec) => {
        if (!(key in fields)) return m;
        let v = fields[key];
        const conv = spec[spec.length - 1];
        if (conv === 'd') v = String(Math.trunc(Number(v) || 0));
        const width = /(\d+)/.exec(spec);
        if (width && spec.includes('-')) v = v.padEnd(Number(width[1]));
        else if (width) v = v.padStart(Number(width[1]));
        return v;
      });
    },
    formatTime(ctx, self, args, kwargs) {
      const recVal = args[0]; const rec = recVal && recVal.data ? recVal.data.rec : { created: 0, msecs: 0 };
      const df = args.length > 1 && !ctx.isNone(args[1]) ? ctx.str(args[1]) : self.data.datefmt;
      return formatTimeImpl(ctx, rec, df);
    },
    formatException(ctx, self, args) {
      const ei = args[0];
      if (!ei || ctx.isNone(ei)) return '';
      const parts = ctx.listOf(ei);
      if (parts && parts.length >= 2) return ctx.typeName(parts[0]) + ': ' + ctx.strOf(parts[1]);
      return ctx.strOf(ei);
    },
    formatStack(ctx, self, args) { return args.length ? ctx.strOf(args[0]) : ''; },
    usesTime(ctx, self) { return BOOL(self.data.fmt.includes('%(asctime)')); },
  },
  attrs: {
    default_time_format: (ctx, self) => '%Y-%m-%d %H:%M:%S',
    default_msec_format: (ctx, self) => '%s,%03d',
  },
};
const FilterDef = {
  typeName: 'Filter',
  construct(ctx, args) {
    const name = args.length && typeof args[0] === 'string' ? args[0] : '';
    const fn = args.length && (ctx.isFunc(args[0]) || (args[0] && args[0].__native)) ? args[0] : null;
    return ctx.native('logging.Filter', { filterName: name, filterFn: fn });
  },
  methods: {
    filter(ctx, self, args) {
      const rec = args[0] && args[0].data ? args[0].data.rec : null;
      if (self.data.filterFn) { const r = ctx.call(self.data.filterFn, [args[0]]); return BOOL(ctx.truthy(r) === true); }
      if (!rec) return BOOL(true);
      const n = self.data.filterName;
      if (!n) return BOOL(true);
      return BOOL(rec.name === n || rec.name.startsWith(n + '.'));
    },
  },
  attrs: { name: (ctx, self) => self.data.filterName },
};
function handlerPasses(ctx, hData, recVal) {
  const rec = recVal.data.rec;
  if (rec.levelno < hData.level) return false;
  for (const f of hData.filters) {
    let ok;
    if (f && f.__native === 'logging.Filter') ok = FilterDef.methods.filter(ctx, f, [recVal]);
    else { const r = ctx.call(f, [recVal]); ok = ctx.truthy(r) === true ? BOOL(true) : BOOL(false); }
    if (!(ok === true || (ok && ok.v === true))) return false;
  }
  return true;
}
function handlerFormat(ctx, hData, recVal) {
  if (hData.formatter && hData.formatter.__native === 'logging.Formatter') return FormatterDef.methods.format(ctx, hData.formatter, [recVal]);
  return formatMsg(ctx, recVal.data.rec.msg, recVal.data.rec.args);
}
const HandlerDef = {
  typeName: 'Handler',
  construct(ctx, args) {
    return ctx.native('logging.Handler', { level: args.length ? levelOf(ctx, args[0]) : 0, formatter: null, filters: [], name: null, collected: [] });
  },
  methods: {
    setLevel(ctx, self, args) { self.data.level = levelOf(ctx, args[0]); return NONE; },
    get_name(ctx, self) { return self.data.name || NONE; },
    set_name(ctx, self, args) { self.data.name = ctx.str(args[0]); return NONE; },
    setFormatter(ctx, self, args) { self.data.formatter = args[0]; return NONE; },
    addFilter(ctx, self, args) { self.data.filters.push(args[0]); return NONE; },
    removeFilter(ctx, self, args) { self.data.filters = self.data.filters.filter((f) => f !== args[0]); return NONE; },
    filter(ctx, self, args) { return BOOL(handlerPasses(ctx, { ...self.data, level: 0 }, args[0])); },
    format(ctx, self, args) { return handlerFormat(ctx, self.data, args[0]); },
    emit(ctx, self, args) { ctx.err('NotImplementedError', '', ''); return NONE; },
    handle(ctx, self, args) {
      const rv = handlerPasses(ctx, self.data, args[0]);
      if (rv) { const d = nativeClassDefSafe(self); if (d && d.methods && d.methods.emit && self.__native !== 'logging.Handler') d.methods.emit(ctx, self, args); else if (self.__native === 'logging.Handler') ctx.err('NotImplementedError', '', ''); }
      return BOOL(rv);
    },
    flush(ctx, self) { return NONE; },
    close(ctx, self) { return NONE; },
    handleError(ctx, self, args) { return NONE; },
    acquire(ctx, self) { return NONE; },
    release(ctx, self) { return NONE; },
    createLock(ctx, self) { return NONE; },
  },
  attrs: {
    level: (ctx, self) => NUM(self.data.level, false),
    name: (ctx, self) => self.data.name || NONE,
    formatter: (ctx, self) => self.data.formatter || NONE,
  },
};
function nativeClassDefSafe(self) {
  // STDLIB_CLASSES 経由で自クラスの定義を引く（emit の多態用）
  try { return self && self.__native ? (HandlerDef && self.__native === 'logging.StreamHandler' ? StreamHandlerDef : self.__native === 'logging.NullHandler' ? NullHandlerDef : self.__native === 'logging.handlers.MemoryHandler' ? MemoryHandlerDef : null) : null; }
  catch { return null; }
}
const StreamHandlerDef = {
  typeName: 'StreamHandler',
  parents: ['logging.Handler'],
  construct(ctx, args) {
    return ctx.native('logging.StreamHandler', { level: 0, formatter: null, filters: [], name: null, collected: [], stream: args.length ? args[0] : null, terminator: '\n' });
  },
  methods: {
    ...HandlerDef.methods,
    emit(ctx, self, args) {
      const text = handlerFormat(ctx, self.data, args[0]);
      self.data.collected.push(text);
      ctx.diag(text);
      return NONE;
    },
    flush(ctx, self) { return NONE; },
    setStream(ctx, self, args) { const old = self.data.stream; self.data.stream = args[0]; return old || NONE; },
  },
  attrs: {
    ...HandlerDef.attrs,
    terminator: (ctx, self) => self.data.terminator,
    stream: (ctx, self) => self.data.stream || NONE,
  },
};
const NullHandlerDef = {
  typeName: 'NullHandler', parents: ['logging.Handler'],
  construct(ctx) { return ctx.native('logging.NullHandler', { level: 0, formatter: null, filters: [], name: null, collected: [] }); },
  methods: { ...HandlerDef.methods, emit(ctx, self) { return NONE; }, handle(ctx, self, args) { return BOOL(true); }, createLock(ctx, self) { return NONE; } },
  attrs: { ...HandlerDef.attrs },
};
const BufferingFormatterDef = {
  typeName: 'BufferingFormatter',
  construct(ctx, args) {
    return ctx.native('logging.BufferingFormatter', { linefmt: args.length ? args[0] : null, records: [] });
  },
  methods: {
    formatHeader(ctx, self) { return ''; },
    formatFooter(ctx, self) { return ''; },
    format(ctx, self, args) {
      self.data.records.push(args[0]);
      if (self.data.linefmt) return FormatterDef.methods.format(ctx, self.data.linefmt, args);
      return '';
    },
    flush(ctx, self) {
      const out = self.data.records.map((r) => formatMsg(ctx, r.data.rec.msg, r.data.rec.args)).join('\n');
      self.data.records = [];
      return out;
    },
  },
};
function effectiveLevel(data) {
  let d = data;
  while (d) { if (d.level !== 0) return d.level; d = d.parentData; }
  return 0;
}
function callHandlers(ctx, loggerData, recVal) {
  let found = 0; let d = loggerData;
  while (d) {
    for (const h of d.handlers) {
      found++;
      if (recVal.data.rec.levelno >= (h.data.level || 0)) {
        const def = nativeClassDefSafe(h);
        if (handlerPasses(ctx, h.data, recVal)) {
          if (def && def.methods.emit) def.methods.emit(ctx, h, [recVal]);
          else if (h.__native === 'logging.Handler') ctx.err('NotImplementedError', '', '');
          else ctx.diag(handlerFormat(ctx, h.data, recVal));
        }
      }
    }
    if (!d.propagate) break;
    d = d.parentData;
  }
  if (found === 0 && recVal.data.rec.levelno >= LEVELS.WARNING) {
    ctx.diag(formatMsg(ctx, recVal.data.rec.msg, recVal.data.rec.args));
  }
}
function doLog(ctx, loggerData, level, msg, argsTuple, kwargs) {
  if (loggerData.disabled) return NONE;
  if (globalDisable >= level) return NONE;
  if (level < effectiveLevel(loggerData)) return NONE;
  const recData = makeRecordData(ctx, loggerData.name, level, '', 0, msg, argsTuple && argsTuple.length ? TUPLE(argsTuple) : NONE, kwargs && kwargs.exc_info, '');
  const recVal = recordNative(ctx, recData);
  callHandlers(ctx, loggerData, recVal);
  return NONE;
}
function loggerNative(ctx, name) {
  if (loggerRegistry.has(name)) return loggerRegistry.get(name);
  let parentData = null;
  if (name !== 'root' && name !== '') {
    const idx = name.lastIndexOf('.');
    const parentName = idx >= 0 ? name.slice(0, idx) : 'root';
    parentData = loggerNative(ctx, parentName).data.loggerData;
  }
  const data = {
    loggerData: null, name: name === '' ? 'root' : name, level: 0, handlers: [], filters: [], propagate: true, disabled: false, parentData,
  };
  data.loggerData = data;
  const nat = ctx.native('logging.Logger', data);
  data.selfRef = nat;
  loggerRegistry.set(name, nat);
  return nat;
}
const LoggerDef = {
  typeName: 'Logger',
  construct(ctx, args, kwargs) {
    const name = args.length ? ctx.str(args[0]) : 'root';
    const nat = loggerNative(ctx, name || 'root');
    if (args.length > 1) nat.data.level = levelOf(ctx, args[1]);
    return nat;
  },
  methods: {
    setLevel(ctx, self, args) { self.data.level = levelOf(ctx, args[0]); return NONE; },
    getEffectiveLevel(ctx, self) { return NUM(effectiveLevel(self.data), false); },
    isEnabledFor(ctx, self, args) { const lv = levelOf(ctx, args[0]); return BOOL(!self.data.disabled && globalDisable < lv && lv >= effectiveLevel(self.data)); },
    addHandler(ctx, self, args) { if (!self.data.handlers.includes(args[0])) self.data.handlers.push(args[0]); return NONE; },
    removeHandler(ctx, self, args) { self.data.handlers = self.data.handlers.filter((h) => h !== args[0]); return NONE; },
    addFilter(ctx, self, args) { self.data.filters.push(args[0]); return NONE; },
    removeFilter(ctx, self, args) { self.data.filters = self.data.filters.filter((f) => f !== args[0]); return NONE; },
    filter(ctx, self, args) {
      for (const f of self.data.filters) {
        let ok;
        if (f && f.__native === 'logging.Filter') ok = FilterDef.methods.filter(ctx, f, args);
        else { const r = ctx.call(f, args); ok = ctx.truthy(r) === true ? BOOL(true) : BOOL(false); }
        if (!(ok === true || (ok && ok.v === true))) return BOOL(false);
      }
      return BOOL(true);
    },
    getChild(ctx, self, args) {
      const suffix = ctx.str(args[0]);
      const newName = self.data.name === 'root' ? suffix : self.data.name + '.' + suffix;
      return loggerNative(ctx, newName);
    },
    getChildren(ctx, self) { return ctx.V.SET([]); },
    hasHandlers(ctx, self) {
      let d = self.data;
      while (d) { if (d.handlers.length) return BOOL(true); if (!d.propagate) break; d = d.parentData; }
      return BOOL(false);
    },
    makeRecord(ctx, self, args, kwargs) {
      const data = makeRecordData(ctx, ctx.str(args[0]), levelOf(ctx, args[1]), args[2], ctx.int(args[3]) ?? 0, args[4], args[5], args[6], args.length > 7 ? ctx.str(args[7]) : '');
      return recordNative(ctx, data);
    },
    handle(ctx, self, args) {
      const recVal = args[0];
      if (self.data.disabled) return NONE;
      if (LoggerDef.methods.filter(ctx, self, args) && (LoggerDef.methods.filter(ctx, self, args).v === true)) callHandlers(ctx, self.data, recVal);
      return NONE;
    },
    log(ctx, self, args) { return doLog(ctx, self.data, levelOf(ctx, args[0]), args[1], args.slice(2), {}); },
    debug(ctx, self, args) { return doLog(ctx, self.data, 10, args[0], args.slice(1), {}); },
    info(ctx, self, args) { return doLog(ctx, self.data, 20, args[0], args.slice(1), {}); },
    warning(ctx, self, args) { return doLog(ctx, self.data, 30, args[0], args.slice(1), {}); },
    warn(ctx, self, args) { return doLog(ctx, self.data, 30, args[0], args.slice(1), {}); },
    error(ctx, self, args) { return doLog(ctx, self.data, 40, args[0], args.slice(1), {}); },
    critical(ctx, self, args) { return doLog(ctx, self.data, 50, args[0], args.slice(1), {}); },
    fatal(ctx, self, args) { return doLog(ctx, self.data, 50, args[0], args.slice(1), {}); },
    exception(ctx, self, args) { return doLog(ctx, self.data, 40, args[0], args.slice(1), {}); },
    findCaller(ctx, self, args) { ctx.diag('findCaller はスタックフレーム検査のためエンジンでは確定できません（未検証）'); return TUPLE(['(unknown file)', NUM(0, false), '(unknown function)', NONE]); },
  },
  attrs: {
    name: (ctx, self) => self.data.name, level: (ctx, self) => NUM(self.data.level, false),
    parent: (ctx, self) => self.data.parentData ? self.data.parentData.selfRef : NONE,
    propagate: (ctx, self) => BOOL(self.data.propagate), disabled: (ctx, self) => BOOL(self.data.disabled),
    handlers: (ctx, self) => LIST(self.data.handlers),
    manager: (ctx, self) => NONE,
  },
};
const AdapterDef = {
  typeName: 'LoggerAdapter',
  construct(ctx, args) {
    return ctx.native('logging.LoggerAdapter', { logger: args[0], extra: args.length > 1 ? args[1] : DICT() });
  },
  methods: {
    process(ctx, self, args) {
      const kwargs = args.length > 1 ? args[1] : DICT();
      // extra を kwargs['extra'] に設定した形を返す（簡略：kwargs はそのまま、extra は保持）
      return TUPLE([args[0], kwargs]);
    },
    _log(ctx, self, args) {
      const loggerData = self.data.logger.data;
      return doLog(ctx, loggerData, levelOf(ctx, args[0]), args[1], args.slice(2), {});
    },
    log(ctx, self, args) { return AdapterDef.methods._log(ctx, self, args); },
    debug(ctx, self, args) { return doLog(ctx, self.data.logger.data, 10, args[0], args.slice(1), {}); },
    info(ctx, self, args) { return doLog(ctx, self.data.logger.data, 20, args[0], args.slice(1), {}); },
    warning(ctx, self, args) { return doLog(ctx, self.data.logger.data, 30, args[0], args.slice(1), {}); },
    error(ctx, self, args) { return doLog(ctx, self.data.logger.data, 40, args[0], args.slice(1), {}); },
    critical(ctx, self, args) { return doLog(ctx, self.data.logger.data, 50, args[0], args.slice(1), {}); },
    exception(ctx, self, args) { return doLog(ctx, self.data.logger.data, 40, args[0], args.slice(1), {}); },
    isEnabledFor(ctx, self, args) { return LoggerDef.methods.isEnabledFor(ctx, self.data.logger, args); },
    getEffectiveLevel(ctx, self) { return LoggerDef.methods.getEffectiveLevel(ctx, self.data.logger); },
    setLevel(ctx, self, args) { return LoggerDef.methods.setLevel(ctx, self.data.logger, args); },
    hasHandlers(ctx, self) { return LoggerDef.methods.hasHandlers(ctx, self.data.logger); },
  },
  attrs: {
    logger: (ctx, self) => self.data.logger, extra: (ctx, self) => self.data.extra,
    manager: (ctx, self) => NONE, name: (ctx, self) => self.data.logger.data.name,
  },
};
function rootLogger(ctx) { return loggerNative(ctx, 'root'); }
function moduleLog(level) {
  return (ctx, args) => doLog(ctx, rootLogger(ctx).data, level, args[0], args.slice(1), {});
}
const MemoryHandlerDef = {
  typeName: 'MemoryHandler', parents: ['logging.Handler'],
  construct(ctx, args, kwargs) {
    const capacity = args.length ? ctx.int(args[0]) ?? 0 : 0;
    return ctx.native('logging.handlers.MemoryHandler', { level: 0, formatter: null, filters: [], name: null, collected: [], capacity, flushLevel: args.length > 1 ? levelOf(ctx, args[1]) : 40, target: args.length > 2 ? args[2] : null, buffer: [] });
  },
  methods: {
    ...HandlerDef.methods,
    emit(ctx, self, args) { self.data.buffer.push(args[0]); if (MemoryHandlerDef.methods.shouldFlush(ctx, self, args).v) MemoryHandlerDef.methods.flush(ctx, self); return NONE; },
    shouldFlush(ctx, self, args) { const rec = args[0].data.rec; return BOOL(self.data.buffer.length >= self.data.capacity || rec.levelno >= self.data.flushLevel); },
    flush(ctx, self) {
      if (self.data.target) { for (const r of self.data.buffer) { const def = nativeClassDefSafe(self.data.target); if (def && def.methods.emit) def.methods.emit(ctx, self.data.target, [r]); else ctx.diag(handlerFormat(ctx, self.data.target.data || { level: 0, formatter: null, filters: [] }, r)); } }
      self.data.buffer = [];
      return NONE;
    },
    setTarget(ctx, self, args) { self.data.target = args[0]; return NONE; },
    close(ctx, self) { MemoryHandlerDef.methods.flush(ctx, self); return NONE; },
  },
  attrs: { ...HandlerDef.attrs, buffer: (ctx, self) => LIST(self.data.buffer), capacity: (ctx, self) => NUM(self.data.capacity, false), target: (ctx, self) => self.data.target || NONE },
};
const QueueHandlerDef = {
  typeName: 'QueueHandler', parents: ['logging.Handler'],
  construct(ctx, args) {
    return ctx.native('logging.handlers.QueueHandler', { level: 0, formatter: null, filters: [], name: null, collected: [], queue: args[0], respectHandlerLevel: false });
  },
  methods: {
    ...HandlerDef.methods,
    prepare(ctx, self, args) {
      // CPython は msg を整形済みにし args を空にする
      const rec = args[0]; const copy = { ...rec.data.rec, msg: formatMsg(ctx, rec.data.rec.msg, rec.data.rec.args), args: NONE };
      return recordNative(ctx, copy);
    },
    enqueue(ctx, self, args) {
      const q = self.data.queue;
      if (q && q.__native && q.data && Array.isArray(q.data.items)) { q.data.items.push(args[0]); if (typeof q.data.unfinished === 'number') q.data.unfinished++; return NONE; }
      ctx.diag('QueueHandler.enqueue: 対象キューがエンジンの queue 実装ではないため未検証です');
      return ctx.unk('enqueue の結果');
    },
    emit(ctx, self, args) { const prepared = QueueHandlerDef.methods.prepare(ctx, self, args); return QueueHandlerDef.methods.enqueue(ctx, self, [prepared]); },
  },
  attrs: { ...HandlerDef.attrs, queue: (ctx, self) => self.data.queue },
};
function unsupportedHandler(name, reason) {
  return { typeName: name, construct(ctx) { ctx.err('未対応', 'logging.handlers.' + name + ' は' + reason + 'のため本アプリの高度モードでは未対応です', ''); return NONE; } };
}
registerStdlibModule('logging', {
  constants: {
    CRITICAL: NUM(50, false), FATAL: NUM(50, false), ERROR: NUM(40, false), WARNING: NUM(30, false), WARN: NUM(30, false),
    INFO: NUM(20, false), DEBUG: NUM(10, false), NOTSET: NUM(0, false), raiseExceptions: BOOL(true),
    lastResort: { __native: 'logging.StreamHandler', mod: 'logging', data: { level: 30, formatter: null, filters: [], name: null, collected: [], stream: null, terminator: '\n' } },
  },
  functions: {
    getLogger(ctx, args) { return args.length && !ctx.isNone(args[0]) ? loggerNative(ctx, ctx.str(args[0])) : rootLogger(ctx); },
    getLevelName(ctx, args) { return getLevelNameImpl(ctx, args[0]); },
    addLevelName(ctx, args) { const lv = levelOf(ctx, args[0]); levelNames.set(lv, ctx.str(args[1])); LEVELS[ctx.str(args[1])] = lv; return NONE; },
    getLevelNamesMapping(ctx) { const d = DICT(); for (const [name, num] of [['CRITICAL', 50], ['FATAL', 50], ['ERROR', 40], ['WARN', 30], ['WARNING', 30], ['INFO', 20], ['DEBUG', 10], ['NOTSET', 0]]) PyAPI.dictSet(d, name, NUM(num, false)); return d; },
    basicConfig(ctx, args, kwargs) {
      const root = rootLogger(ctx);
      if (kwargs.level !== undefined) root.data.level = levelOf(ctx, kwargs.level);
      if (kwargs.format !== undefined || kwargs.datefmt !== undefined) {
        const fmt = ctx.native('logging.Formatter', { fmt: kwargs.format !== undefined ? ctx.str(kwargs.format) : '%(levelname)s:%(name)s:%(message)s', datefmt: kwargs.datefmt !== undefined ? ctx.str(kwargs.datefmt) : null, style: '%', defaults: null });
        const h = ctx.native('logging.StreamHandler', { level: 0, formatter: fmt, filters: [], name: null, collected: [], stream: null, terminator: '\n' });
        if (!root.data.handlers.length) root.data.handlers.push(h);
      } else if (!root.data.handlers.length && kwargs.level !== undefined) {
        root.data.handlers.push(ctx.native('logging.StreamHandler', { level: 0, formatter: null, filters: [], name: null, collected: [], stream: null, terminator: '\n' }));
      }
      if (root.data.level === 0 && kwargs.level === undefined) root.data.level = 30;
      return NONE;
    },
    debug: moduleLog(10), info: moduleLog(20), warning: moduleLog(30), warn: moduleLog(30), error: moduleLog(40), critical: moduleLog(50), fatal: moduleLog(50),
    exception(ctx, args) { return doLog(ctx, rootLogger(ctx).data, 40, args[0], args.slice(1), {}); },
    log(ctx, args) { return doLog(ctx, rootLogger(ctx).data, levelOf(ctx, args[0]), args[1], args.slice(2), {}); },
    disable(ctx, args) { globalDisable = args.length ? levelOf(ctx, args[0]) : 0; return NONE; },
    shutdown(ctx) { return NONE; },
    makeLogRecord(ctx, args) {
      const d = args[0]; const data = makeRecordData(ctx, 'root', 0, '', 0, '', NONE, NONE, '');
      if (ctx.isDict(d)) {
        for (const key of ['name', 'levelno', 'levelname', 'pathname', 'lineno', 'msg', 'funcName']) {
          const v = PyAPI.dictGet(d, key); if (v !== undefined) data[key === 'levelno' ? 'levelno' : key] = key === 'levelno' || key === 'lineno' ? (ctx.num(v) ?? 0) : v;
        }
        const lv = PyAPI.dictGet(d, 'levelno'); if (lv !== undefined) data.levelno = ctx.num(lv) ?? 0;
        const ln = PyAPI.dictGet(d, 'lineno'); if (ln !== undefined) data.lineno = ctx.num(ln) ?? 0;
      }
      return recordNative(ctx, data);
    },
    getLogRecordFactory(ctx) { return logRecordFactory || ctx.ncls('logging.LogRecord'); },
    setLogRecordFactory(ctx, args) { const old = logRecordFactory || ctx.ncls('logging.LogRecord'); logRecordFactory = args[0]; return old; },
    getLoggerClass(ctx) { return loggerClassRef || ctx.ncls('logging.Logger'); },
    setLoggerClass(ctx, args) { loggerClassRef = args[0]; return NONE; },
    captureWarnings(ctx, args) { ctx.diag('captureWarnings は warnings モジュールとの連携のためエンジンでは未検証です'); return NONE; },
    getHandlerByName(ctx, args) { return NONE; },
    getHandlerNames(ctx) { return ctx.V.SET([]); },
  },
  classes: {
    Logger: LoggerDef, LoggerAdapter: AdapterDef, LogRecord: LogRecordDef, Formatter: FormatterDef,
    BufferingFormatter: BufferingFormatterDef, Filter: FilterDef, Handler: HandlerDef,
    StreamHandler: StreamHandlerDef, NullHandler: NullHandlerDef,
    FileHandler: { typeName: 'FileHandler', construct(ctx) { ctx.err('未対応', 'logging.FileHandler は実ファイルへの出力のため本アプリの高度モードでは未対応です', ''); return NONE; } },
  },
});
registerStdlibModule('logging.handlers', {
  classes: {
    MemoryHandler: MemoryHandlerDef, QueueHandler: QueueHandlerDef,
    QueueListener: { typeName: 'QueueListener', construct(ctx) { ctx.err('未対応', 'logging.handlers.QueueListener はリスナースレッド前提のため本アプリの高度モードでは未対応です', ''); return NONE; } },
    RotatingFileHandler: unsupportedHandler('RotatingFileHandler', 'ファイルローテーション前提'),
    TimedRotatingFileHandler: unsupportedHandler('TimedRotatingFileHandler', 'ファイルローテーション前提'),
    WatchedFileHandler: unsupportedHandler('WatchedFileHandler', 'ファイル監視前提'),
    BaseRotatingHandler: unsupportedHandler('BaseRotatingHandler', 'ファイルローテーション前提'),
    SocketHandler: unsupportedHandler('SocketHandler', 'ソケット通信前提'),
    DatagramHandler: unsupportedHandler('DatagramHandler', 'ソケット通信前提'),
    SysLogHandler: unsupportedHandler('SysLogHandler', 'syslog ソケット前提'),
    NTEventLogHandler: unsupportedHandler('NTEventLogHandler', 'Windows イベントログ前提'),
    SMTPHandler: unsupportedHandler('SMTPHandler', 'メール送信前提'),
    HTTPHandler: unsupportedHandler('HTTPHandler', 'HTTP 通信前提'),
    BufferingHandler: {
      typeName: 'BufferingHandler', parents: ['logging.Handler'],
      construct(ctx, args) { return ctx.native('logging.handlers.BufferingHandler', { level: 0, formatter: null, filters: [], name: null, collected: [], capacity: ctx.int(args[0]) ?? 0, buffer: [] }); },
      methods: {
        ...HandlerDef.methods,
        emit(ctx, self, args) { self.data.buffer.push(args[0]); return NONE; },
        shouldFlush(ctx, self, args) { return BOOL(self.data.buffer.length >= self.data.capacity); },
        flush(ctx, self) { self.data.buffer = []; return NONE; },
      },
      attrs: { ...HandlerDef.attrs, buffer: (ctx, self) => LIST(self.data.buffer), capacity: (ctx, self) => NUM(self.data.capacity, false) },
    },
  },
});
registerStdlibModule('logging.config', {
  functions: {
    dictConfig(ctx) { ctx.err('未対応', 'logging.config.dictConfig はロギング体系全体の再構成を行うため本アプリの高度モードでは未対応です', ''); return NONE; },
    fileConfig(ctx) { ctx.err('未対応', 'logging.config.fileConfig は設定ファイル読み込み前提のため本アプリの高度モードでは未対応です', ''); return NONE; },
    listen(ctx) { ctx.err('未対応', 'logging.config.listen はソケット待受前提のため本アプリの高度モードでは未対応です', ''); return NONE; },
    stopListening(ctx) { return NONE; },
  },
});
