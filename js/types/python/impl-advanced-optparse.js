/* 高度モード B7 G12：optparse（41件）。
 * OptionParser の解析を再現範囲で実装する：Option の型
 * （string/int/long/float/complex/choice）、action 群
 * （store/store_const/store_true/store_false/append/count/help/version/
 * callback）、短いオプションの束ね、長いオプションの接頭辞一致、
 * interspersed args の切替、Values（dest が判明した時点で attrs 登録する
 * Namespace と同じ方式）。エラーは CPython では stderr＋SystemExit(2)
 * だが、argparse と同じ裁定で SystemExit 例外として送出する。
 * 一次情報：公式ドキュメント 3.15 library/optparse、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, STDLIB_CLASSES } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE } = PyAPI;

function ensureValuesAttr(dest) {
  const def = STDLIB_CLASSES.get('optparse.Values');
  if (def && def.attrs && !(dest in def.attrs)) def.attrs[dest] = (ctx, self) => (dest in self.data.values ? self.data.values[dest] : NONE);
}
function makeValues(ctx, values) {
  for (const k of Object.keys(values)) ensureValuesAttr(k);
  return ctx.native('optparse.Values', { values: { ...values } });
}
const ValuesDef = {
  typeName: 'Values',
  construct(ctx, args, kwargs) {
    const values = {};
    if (args.length && ctx.isDict(args[0])) { /* dict からの生成は未対応として空にする */ }
    for (const k of Object.keys(kwargs || {})) values[k] = kwargs[k];
    return makeValues(ctx, values);
  },
  attrs: {},
  methods: {
    read_module(ctx, self) { return NONE; },
    ensure_value(ctx, self, args) {
      const dest = ctx.str(args[0]);
      if (!(dest in self.data.values) || ctx.isNone(self.data.values[dest])) { self.data.values[dest] = args[1]; ensureValuesAttr(dest); }
      return self.data.values[dest];
    },
  },
  repr(ctx, self) {
    const parts = Object.keys(self.data.values).map((k) => "'" + k + "': " + ctx.repr(self.data.values[k]));
    return '{' + parts.join(', ') + '}';
  },
};
const STORE_ACTIONS = ['store', 'store_const', 'store_true', 'store_false', 'append', 'append_const', 'count', 'help', 'version', 'callback'];
function convertOpt(ctx, data, opt, raw) {
  const t = opt.type || 'string';
  if (t === 'string') return raw;
  if (t === 'int' || t === 'long') {
    const n = Number(raw);
    if (!Number.isInteger(n) || String(raw).trim() === '' || !/^[+-]?\d+$/.test(String(raw).trim())) failOpt(ctx, data, 'option ' + optDisplay(opt) + ': invalid integer value: ' + "'" + raw + "'");
    return NUM(n, false);
  }
  if (t === 'float') { const n = Number(raw); if (Number.isNaN(n)) failOpt(ctx, data, 'option ' + optDisplay(opt) + ': invalid floating-point value: ' + "'" + raw + "'"); return NUM(n, true); }
  if (t === 'choice') {
    const items = ctx.listOf(opt.choices) || [];
    if (!items.includes(raw)) failOpt(ctx, data, 'option ' + optDisplay(opt) + ': invalid choice: ' + "'" + raw + "' (choose from " + items.map((c) => "'" + c + "'").join(', ') + ')');
    return raw;
  }
  return raw; // complex 等は文字列のまま（未検証寄り。報告書明記）
}
function optDisplay(o) { return o.optionStrings[0] || o.dest; }
function failOpt(ctx, data, msg) {
  ctx.diag((data.usage || 'Usage: prog [options]'));
  ctx.err('SystemExit', (data.prog || 'prog') + ': error: ' + msg + ' (exit code 2)', '');
}
function makeOption(ctx, args, kwargs) {
  const optionStrings = args.map((a) => ctx.str(a)).filter((x) => x);
  let dest = kwargs.dest !== undefined ? ctx.str(kwargs.dest) : null;
  if (!dest) {
    const long = optionStrings.find((s) => s.startsWith('--'));
    dest = (long ? long.slice(2) : optionStrings[0].slice(1)).replace(/-/g, '_');
  }
  const o = {
    optionStrings, dest,
    action: kwargs.action !== undefined ? ctx.str(kwargs.action) : 'store',
    nargs: kwargs.nargs !== undefined ? ctx.int(kwargs.nargs) : 1,
    constVal: kwargs.const, defaultVal: kwargs.default,
    type: kwargs.type !== undefined ? ctx.str(kwargs.type) : undefined,
    choices: kwargs.choices, help: kwargs.help !== undefined ? ctx.str(kwargs.help) : undefined,
    metavar: kwargs.metavar !== undefined ? ctx.str(kwargs.metavar) : undefined,
    callback: kwargs.callback, callbackArgs: kwargs.callback_args, callbackKwargs: kwargs.callback_kwargs,
  };
  if (o.action === 'store_true' || o.action === 'store_false' || o.action === 'help' || o.action === 'version') o.type = undefined;
  else if (!o.type && o.action !== 'store_const' && o.action !== 'append_const' && o.action !== 'count' && o.action !== 'callback') o.type = 'string';
  ensureValuesAttr(dest);
  return o;
}
const OptionDef = {
  typeName: 'Option',
  construct(ctx, args, kwargs) {
    const o = makeOption(ctx, args, kwargs);
    return ctx.native('optparse.Option', { opt: o });
  },
  attrs: {
    action: (ctx, self) => self.data.opt.action,
    dest: (ctx, self) => self.data.opt.dest,
    const: (ctx, self) => self.data.opt.constVal !== undefined ? self.data.opt.constVal : NONE,
    default: (ctx, self) => self.data.opt.defaultVal !== undefined ? self.data.opt.defaultVal : NONE,
    type: (ctx, self) => self.data.opt.type || NONE,
    choices: (ctx, self) => self.data.opt.choices || NONE,
    help: (ctx, self) => self.data.opt.help || NONE,
    metavar: (ctx, self) => self.data.opt.metavar || NONE,
    nargs: (ctx, self) => NUM(self.data.opt.nargs || 1, false),
    callback: (ctx, self) => self.data.opt.callback || NONE,
    callback_args: (ctx, self) => self.data.opt.callbackArgs || NONE,
    callback_kwargs: (ctx, self) => self.data.opt.callbackKwargs || NONE,
  },
  classAttrs: {
    ACTIONS: LIST(STORE_ACTIONS),
    STORE_ACTIONS: LIST(['store', 'store_const', 'store_true', 'store_false', 'append', 'append_const', 'count']),
    TYPED_ACTIONS: LIST(['store', 'append', 'callback']),
    ALWAYS_TYPED_ACTIONS: LIST(['store', 'append']),
    TYPES: LIST(['string', 'int', 'long', 'float', 'complex', 'choice']),
    TYPE_CHECKER: (ctx) => NONE,
  },
};
function defaultOf(o) {
  if (o.defaultVal !== undefined) return o.defaultVal;
  if (o.action === 'store_true') return BOOL(false);
  if (o.action === 'store_false') return BOOL(true);
  if (o.action === 'count') return NONE;
  return NONE;
}
function applyOpt(ctx, data, values, o, rawVals) {
  switch (o.action) {
    case 'store': values[o.dest] = o.nargs > 1 ? TUPLE(rawVals.map((r) => convertOpt(ctx, data, o, r))) : convertOpt(ctx, data, o, rawVals[0]); break;
    case 'store_const': values[o.dest] = o.constVal !== undefined ? o.constVal : NONE; break;
    case 'store_true': values[o.dest] = BOOL(true); break;
    case 'store_false': values[o.dest] = BOOL(false); break;
    case 'append': {
      const cur = values[o.dest]; const arr = (cur === undefined || ctx.isNone(cur)) ? [] : (ctx.listOf(cur) ? [...ctx.listOf(cur)] : [cur]);
      arr.push(convertOpt(ctx, data, o, rawVals[0])); values[o.dest] = LIST(arr); break;
    }
    case 'append_const': {
      const cur = values[o.dest]; const arr = (cur === undefined || ctx.isNone(cur)) ? [] : (ctx.listOf(cur) ? [...ctx.listOf(cur)] : [cur]);
      arr.push(o.constVal !== undefined ? o.constVal : NONE); values[o.dest] = LIST(arr); break;
    }
    case 'count': { const cur = values[o.dest]; values[o.dest] = NUM(((cur === undefined || ctx.isNone(cur)) ? 0 : (ctx.num(cur) ?? 0)) + 1, false); break; }
    case 'help': ctx.diag(data.usage || 'Usage: prog [options]'); ctx.err('SystemExit', '0', ''); break;
    case 'version': ctx.diag(data.version || ''); ctx.err('SystemExit', '0', ''); break;
    case 'callback': {
      if (o.callback) {
        const cbArgs = o.callbackArgs && ctx.listOf(o.callbackArgs) ? ctx.listOf(o.callbackArgs) : [];
        try { ctx.call(o.callback, [ctx.ncls('optparse.Option'), rawVals[0] || '', makeValues(ctx, values), ctx.native('optparse.OptionParser', { parserData: data }), ...cbArgs]); }
        catch (e) { /* コールバックの詳細な引数形式は CPython と異なる場合がある */ throw e; }
      }
      break;
    }
    default: values[o.dest] = rawVals[0]; break;
  }
}
function parseOptArgs(ctx, data, argv) {
  const values = {};
  for (const o of data.options) { const d = defaultOf(o); if (o.dest) values[o.dest] = d; }
  for (const k of Object.keys(data.defaults)) values[k] = data.defaults[k];
  const rest = [];
  let i = 0; let onlyRest = false;
  for (; i < argv.length; i++) {
    const tok = argv[i];
    if (onlyRest) { rest.push(tok); continue; }
    if (tok === '--') { onlyRest = true; continue; }
    if (tok.startsWith('--')) {
      const eq = tok.indexOf('='); const name = eq >= 0 ? tok.slice(0, eq) : tok;
      let o = data.options.find((x) => x.optionStrings.includes(name));
      if (!o) {
        const cand = data.options.filter((x) => x.optionStrings.some((s) => s.startsWith(name)));
        if (cand.length === 1) o = cand[0];
        else if (cand.length > 1) { const e = new Error('ambiguous'); ctx.err('optparse.AmbiguousOptionError', 'ambiguous option: ' + name + ' (' + cand.map((c) => c.optionStrings.find((s) => s.startsWith(name))).join(', ') + '?)', ''); }
        else ctx.err('optparse.BadOptionError', name, '');
      }
      const takes = !['store_true', 'store_false', 'store_const', 'append_const', 'count', 'help', 'version'].includes(o.action);
      const rawVals = [];
      if (takes) {
        if (eq >= 0) rawVals.push(tok.slice(eq + 1));
        else {
          const need = o.action === 'callback' && o.nargs === 0 ? 0 : (o.nargs || 1);
          for (let k = 0; k < need; k++) { if (i + 1 >= argv.length) failOpt(ctx, data, o.optionStrings[0] + ' option requires ' + need + ' argument(s)'); rawVals.push(argv[i + 1]); i++; }
        }
      } else if (eq >= 0) failOpt(ctx, data, o.optionStrings[0] + ' option does not take a value');
      applyOpt(ctx, data, values, o, rawVals);
      continue;
    }
    if (tok.startsWith('-') && tok.length > 1 && tok !== '-') {
      let j = 1;
      while (j < tok.length) {
        const name = '-' + tok[j];
        const o = data.options.find((x) => x.optionStrings.includes(name));
        if (!o) ctx.err('optparse.BadOptionError', name, '');
        const takes = !['store_true', 'store_false', 'store_const', 'append_const', 'count', 'help', 'version'].includes(o.action);
        if (takes) {
          const rawVals = [];
          if (j + 1 < tok.length) { rawVals.push(tok.slice(j + 1)); j = tok.length; }
          else { if (i + 1 >= argv.length) failOpt(ctx, data, name + ' option requires an argument'); rawVals.push(argv[i + 1]); i++; j = tok.length; }
          // nargs>1 の残りは次トークンから（簡略）
          applyOpt(ctx, data, values, o, rawVals);
        } else { applyOpt(ctx, data, values, o, []); j++; }
      }
      continue;
    }
    rest.push(tok);
    if (!data.interspersed) { for (i = i + 1; i < argv.length; i++) rest.push(argv[i]); break; }
  }
  return [values, rest];
}
function newParserData(kwargs) {
  return {
    prog: 'prog', usage: undefined, version: undefined, options: [], defaults: {}, interspersed: true, groups: [],
  };
}
function addStandardOptions(ctx, data, kwargs) {
  if (!kwargs || kwargs.add_help_option === undefined || ctx.truthy(kwargs.add_help_option) !== false) {
    data.options.push({ optionStrings: ['-h', '--help'], dest: 'help', action: 'help', nargs: 0 });
  }
  if (kwargs && kwargs.version !== undefined) {
    data.version = ctx.str(kwargs.version);
    data.options.push({ optionStrings: ['--version'], dest: 'version', action: 'version', nargs: 0 });
  }
  if (kwargs && kwargs.usage !== undefined) data.usage = ctx.str(kwargs.usage);
  if (kwargs && kwargs.prog !== undefined) data.prog = ctx.str(kwargs.prog);
}
const ParserDef = {
  typeName: 'OptionParser',
  construct(ctx, args, kwargs) {
    const data = newParserData(kwargs);
    addStandardOptions(ctx, data, kwargs);
    return ctx.native('optparse.OptionParser', { parserData: data });
  },
  methods: {
    add_option(ctx, self, args, kwargs) {
      // Option インスタンスを直接渡す形も受ける
      if (args.length && args[0] && args[0].__native === 'optparse.Option') { self.data.parserData.options.push(args[0].data.opt); return args[0]; }
      const o = makeOption(ctx, args, kwargs);
      self.data.parserData.options.push(o);
      return ctx.native('optparse.Option', { opt: o });
    },
    parse_args(ctx, self, args, kwargs) {
      let argv = [];
      if (args.length && !ctx.isNone(args[0])) argv = (ctx.iterable(args[0]) || []).map((x) => String(x));
      else ctx.diag('parse_args(args=None) は sys.argv を読むため、エンジンでは空の引数列として扱います');
      let valuesObj = null;
      if (args.length > 1 && args[1] && args[1].__native === 'optparse.Values') valuesObj = args[1];
      const [values, rest] = parseOptArgs(ctx, self.data.parserData, argv);
      if (valuesObj) { for (const k of Object.keys(values)) { valuesObj.data.values[k] = values[k]; ensureValuesAttr(k); } return TUPLE([valuesObj, LIST(rest)]); }
      return TUPLE([makeValues(ctx, values), LIST(rest)]);
    },
    get_usage(ctx, self) { return self.data.parserData.usage || 'Usage: ' + self.data.parserData.prog + ' [options]'; },
    get_version(ctx, self) { return self.data.parserData.version || self.data.parserData.prog + ' 0'; },
    print_usage(ctx, self) { ctx.diag(this.get_usage ? '' : ''); ctx.diag(self.data.parserData.usage || 'Usage: ' + self.data.parserData.prog + ' [options]'); return NONE; },
    print_version(ctx, self) { ctx.diag(self.data.parserData.version || ''); return NONE; },
    set_usage(ctx, self, args) { self.data.parserData.usage = ctx.str(args[0]); return NONE; },
    set_defaults(ctx, self, args, kwargs) { for (const k of Object.keys(kwargs || {})) self.data.parserData.defaults[k] = kwargs[k]; if (args.length >= 2) self.data.parserData.defaults[ctx.str(args[0])] = args[1]; return NONE; },
    get_option(ctx, self, args) {
      const o = self.data.parserData.options.find((x) => x.optionStrings.includes(ctx.str(args[0])));
      return o ? ctx.native('optparse.Option', { opt: o }) : NONE;
    },
    has_option(ctx, self, args) { return BOOL(self.data.parserData.options.some((x) => x.optionStrings.includes(ctx.str(args[0])))); },
    remove_option(ctx, self, args) {
      const name = ctx.str(args[0]);
      self.data.parserData.options = self.data.parserData.options.filter((x) => !x.optionStrings.includes(name));
      return NONE;
    },
    get_option_group(ctx, self, args) { return NONE; },
    disable_interspersed_args(ctx, self) { self.data.parserData.interspersed = false; return NONE; },
    enable_interspersed_args(ctx, self) { self.data.parserData.interspersed = true; return NONE; },
    add_option_group(ctx, self, args, kwargs) { return ctx.native('optparse.OptionGroup', { parserData: self.data.parserData }); },
  },
  attrs: { prog: (ctx, self) => self.data.parserData.prog },
};
const GroupDef = {
  typeName: 'OptionGroup',
  construct(ctx, args) { return ctx.native('optparse.OptionGroup', { parserData: null }); },
  methods: {
    add_option(ctx, self, args, kwargs) {
      if (!self.data.parserData) ctx.err('TypeError', 'OptionGroup が OptionParser に関連付けられていません', '');
      const o = makeOption(ctx, args, kwargs);
      self.data.parserData.options.push(o);
      return ctx.native('optparse.Option', { opt: o });
    },
  },
};
registerStdlibModule('optparse', {
  classes: {
    OptionParser: ParserDef, Option: OptionDef, OptionGroup: GroupDef, Values: ValuesDef,
    OptionError: { typeName: 'OptionError', exc: 'optparse.OptionError', excParents: ['Exception'] },
    BadOptionError: { typeName: 'BadOptionError', exc: 'optparse.BadOptionError', excParents: ['optparse.OptionError'] },
    AmbiguousOptionError: { typeName: 'AmbiguousOptionError', exc: 'optparse.AmbiguousOptionError', excParents: ['optparse.BadOptionError'] },
    OptionValueError: { typeName: 'OptionValueError', exc: 'optparse.OptionValueError', excParents: ['optparse.OptionError'] },
    OptionConflictError: { typeName: 'OptionConflictError', exc: 'optparse.OptionConflictError', excParents: ['optparse.OptionError'] },
  },
});
