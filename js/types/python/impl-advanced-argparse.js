/* 高度モード B7 G12：argparse（32件）。
 * 裁定：
 * - parse_args は sys.argv を使わず、与えられた引数リストで検証する。
 *   引数省略（args=None）は CPython では sys.argv[1:] を読むが、エンジンに
 *   argv は無いため、未検証として注記し空リストとして扱う（報告書明記）。
 * - 解析失敗は CPython では usage を stderr に出し SystemExit(2) で終了する。
 *   エンジンでは SystemExit 例外として送出し、例外メッセージに
 *   「<prog>: error: <詳細>」と終了コード 2 を含める形に裁定する。
 * - FileType は実ファイルを開くため未対応（生成時点で名指し停止）。
 * - Namespace の動的属性は基盤に動的属性フックが無いため、dest が判明した
 *   時点で Namespace クラス定義の attrs へ登録する方式で実現する
 *   （基盤要請としても報告書に挙げる）。
 * 一次情報：公式ドキュメント 3.15 library/argparse、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, STDLIB_CLASSES } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE } = PyAPI;
const SUPPRESS = '==SUPPRESS==';

function ensureNsAttr(dest) {
  const def = STDLIB_CLASSES.get('argparse.Namespace');
  if (def && def.attrs && !(dest in def.attrs)) {
    def.attrs[dest] = (ctx, self) => (dest in self.data.values ? self.data.values[dest] : NONE);
  }
}
function makeNamespace(ctx, values) {
  for (const k of Object.keys(values)) ensureNsAttr(k);
  return ctx.native('argparse.Namespace', { values: { ...values } });
}
const NamespaceDef = {
  typeName: 'Namespace',
  construct(ctx, args, kwargs) {
    const values = {};
    for (const k of Object.keys(kwargs || {})) values[k] = kwargs[k];
    return makeNamespace(ctx, values);
  },
  attrs: {},
  eq(ctx, self, other) {
    if (!other || other.__native !== 'argparse.Namespace') return false;
    const a = self.data.values, b = other.data.values;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) { if (!(k in b)) return false; const e = ctx.eq(a[k], b[k]); if (e !== true && !(e && e.v === true)) return false; }
    return true;
  },
  hash: () => null,
  repr(ctx, self) {
    const parts = Object.keys(self.data.values).map((k) => k + '=' + ctx.repr(self.data.values[k]));
    return 'Namespace(' + parts.join(', ') + ')';
  },
};

function defaultFor(action) {
  if (action.defaultVal !== undefined) return action.defaultVal;
  switch (action.action) {
    case 'store_true': return BOOL(false);
    case 'store_false': return BOOL(true);
    case 'count': return NONE;
    case 'append': case 'append_const': return NONE;
    case 'help': case 'version': return SUPPRESS;
    default: return NONE;
  }
}
function usageOf(data) {
  const parts = ['usage:', data.prog];
  for (const a of data.actions) {
    if (a.kind !== 'optional') continue;
    if (a.action === 'help') { parts.push('[-h]'); continue; }
    const name = a.optionStrings[0];
    const takes = !['store_true', 'store_false', 'store_const', 'append_const', 'count', 'help', 'version', 'BooleanOptionalAction'].includes(a.action) && a.action !== 'boolean_optional';
    let s = name;
    if (takes) s += ' ' + (a.metavar || a.dest.toUpperCase());
    if (!a.required) s = '[' + s + ']';
    parts.push(s);
  }
  for (const a of data.actions) {
    if (a.kind !== 'positional') continue;
    if (a.isSubparsers) { parts.push('{' + Object.keys(data.subcommands).join(',') + '} ...'); continue; }
    const mv = a.metavar || a.dest;
    if (a.nargs === '?') parts.push('[' + mv + ']');
    else if (a.nargs === '*') parts.push('[' + mv + ' ...]');
    else if (a.nargs === '+') parts.push(mv + ' [' + mv + ' ...]');
    else parts.push(mv);
  }
  return parts.join(' ') + '\n';
}
function fail(ctx, data, msg) {
  ctx.diag(usageOf(data).trim());
  ctx.err('SystemExit', data.prog + ': error: ' + msg + ' (exit code 2)', '');
}
function convertValue(ctx, data, action, raw) {
  let v = raw;
  if (action.typeVal !== undefined && action.typeVal !== null && !ctx.isNone(action.typeVal)) {
    try { v = ctx.call(action.typeVal, [raw]); }
    catch (e) {
      // 型変換の例外は ArgumentTypeError 相当として解析エラーにする
      fail(ctx, data, 'argument ' + displayName(action) + ': invalid ' + typeDisplay(ctx, action.typeVal) + " value: '" + raw + "'");
    }
    if (ctx.isUnk && ctx.isUnk(v)) fail(ctx, data, 'argument ' + displayName(action) + ': invalid value: ' + "'" + raw + "'");
  }
  if (action.choices) {
    const items = ctx.iterable(action.choices) || [];
    const ok = items.some((c) => { const e = ctx.eq(v, c); return e === true || (e && e.v === true); });
    if (!ok) fail(ctx, data, 'argument ' + displayName(action) + ': invalid choice: ' + ctx.repr(v) + ' (choose from ' + items.map((c) => ctx.repr(c)).join(', ') + ')');
  }
  return v;
}
function typeDisplay(ctx, t) {
  if (t && t.__builtin) return t.__builtin;
  if (t && t.__ncls) return t.__ncls.split('.').pop();
  if (t && t.__type) return t.__type;
  return ctx.typeName(t);
}
function displayName(action) {
  return action.kind === 'optional' ? action.optionStrings.join('/') : action.dest;
}
function applyAction(ctx, data, ns, action, values) {
  const dest = action.dest;
  switch (action.action) {
    case 'store': ns[dest] = values[0]; break;
    case 'store_const': ns[dest] = action.constVal !== undefined ? action.constVal : NONE; break;
    case 'store_true': ns[dest] = BOOL(true); break;
    case 'store_false': ns[dest] = BOOL(false); break;
    case 'boolean_optional': ns[dest] = values.__boolVal; break;
    case 'append': {
      const cur = ns[dest];
      const arr = (cur === undefined || ctx.isNone(cur)) ? [] : (ctx.listOf(cur) ? [...ctx.listOf(cur)] : [cur]);
      arr.push(values[0]); ns[dest] = LIST(arr); break;
    }
    case 'append_const': {
      const cur = ns[dest];
      const arr = (cur === undefined || ctx.isNone(cur)) ? [] : (ctx.listOf(cur) ? [...ctx.listOf(cur)] : [cur]);
      arr.push(action.constVal !== undefined ? action.constVal : NONE); ns[dest] = LIST(arr); break;
    }
    case 'count': {
      const cur = ns[dest];
      const n = (cur === undefined || ctx.isNone(cur)) ? 0 : (ctx.num(cur) ?? 0);
      ns[dest] = NUM(n + 1, false); break;
    }
    case 'help':
      ctx.diag(helpText(data));
      ctx.err('SystemExit', '0', '');
      break;
    case 'version':
      ctx.diag(action.versionStr || '');
      ctx.err('SystemExit', '0', '');
      break;
    default: ns[dest] = values[0]; break;
  }
}
function helpText(data) {
  const lines = [usageOf(data).trimEnd()];
  if (data.description) lines.push('', data.description);
  const pos = data.actions.filter((a) => a.kind === 'positional' && !a.isSubparsers);
  if (pos.length) { lines.push('', 'positional arguments:'); for (const a of pos) lines.push('  ' + (a.metavar || a.dest) + (a.help ? '  ' + a.help : '')); }
  const opt = data.actions.filter((a) => a.kind === 'optional');
  if (opt.length) { lines.push('', 'options:'); for (const a of opt) lines.push('  ' + a.optionStrings.join(', ') + (a.help ? '  ' + a.help : '')); }
  return lines.join('\n');
}

function parseWith(ctx, data, argv, knownOnly) {
  const ns = {};
  // defaults
  for (const a of data.actions) {
    if (a.isSubparsers) { if (a.dest && a.dest !== SUPPRESS) ns[a.dest] = NONE; continue; }
    const d = defaultFor(a);
    if (d !== SUPPRESS && a.dest) ns[a.dest] = d;
  }
  for (const k of Object.keys(data.defaults)) ns[k] = data.defaults[k];
  const seen = new Set(); const seenMutex = new Map();
  const positionalTokens = []; const extras = [];
  let i = 0; let onlyPos = false; let subHandled = false;
  const findOptional = (tok) => {
    if (tok.startsWith('--')) {
      const eq = tok.indexOf('='); const name = eq >= 0 ? tok.slice(0, eq) : tok;
      let exact = data.actions.filter((a) => a.kind === 'optional' && a.optionStrings.includes(name));
      if (exact.length) return { action: exact[0], inline: eq >= 0 ? tok.slice(eq + 1) : undefined };
      const cand = data.actions.filter((a) => a.kind === 'optional' && a.optionStrings.some((s) => s.startsWith(name) && s.startsWith('--')));
      if (cand.length === 1) return { action: cand[0], inline: eq >= 0 ? tok.slice(eq + 1) : undefined };
      if (cand.length > 1) fail(ctx, data, 'ambiguous option: ' + tok + ' could match ' + cand.map((c) => c.optionStrings.find((s) => s.startsWith(name))).join(', '));
      return null;
    }
    if (tok.startsWith('-') && tok.length >= 2) {
      const name = tok.slice(0, 2);
      const a = data.actions.find((x) => x.kind === 'optional' && x.optionStrings.includes(name));
      if (a) return { action: a, rest: tok.slice(2) };
    }
    return null;
  };
  const noteSeen = (action) => {
    if (action.mutexGroup !== undefined) {
      if (seenMutex.has(action.mutexGroup) && seenMutex.get(action.mutexGroup) !== action) {
        fail(ctx, data, 'argument ' + displayName(action) + ': not allowed with argument ' + displayName(seenMutex.get(action.mutexGroup)));
      }
      seenMutex.set(action.mutexGroup, action);
    }
    seen.add(action);
  };
  const consumeValues = (action, firstInline) => {
    const vals = [];
    if (firstInline !== undefined && firstInline !== '') vals.push(firstInline);
    const nargs = action.nargs;
    const need = nargs === undefined || nargs === null ? 1 : nargs;
    if (need === 0 || action.action === 'store_true' || action.action === 'store_false' || action.action === 'store_const' || action.action === 'append_const' || action.action === 'count' || action.action === 'help' || action.action === 'version') return vals;
    if (nargs === '?' ) {
      if (vals.length) return vals;
      if (i + 1 < argv.length && !looksLikeOption(argv[i + 1])) { vals.push(argv[i + 1]); i++; }
      else { const c = action.constVal !== undefined ? action.constVal : NONE; return [c, '__rawConst']; }
      return vals;
    }
    if (nargs === '*' || nargs === '+') {
      while (i + 1 < argv.length && !looksLikeOption(argv[i + 1])) { vals.push(argv[i + 1]); i++; }
      if (nargs === '+' && !vals.length) fail(ctx, data, 'argument ' + displayName(action) + ': expected at least one argument');
      return vals;
    }
    const n = typeof need === 'number' ? need : 1;
    while (vals.length < n) {
      if (i + 1 >= argv.length) fail(ctx, data, 'argument ' + displayName(action) + ': expected ' + (n === 1 ? 'one argument' : n + ' arguments'));
      vals.push(argv[i + 1]); i++;
    }
    return vals;
  };
  function looksLikeOption(tok) {
    if (tok === '--') return true;
    if (!tok.startsWith('-') || tok === '-') return false;
    if (/^-\d/.test(tok) && !data.actions.some((a) => a.kind === 'optional')) return false;
    return true;
  }
  for (; i < argv.length; i++) {
    const tok = argv[i];
    if (!onlyPos && tok === '--') { onlyPos = true; continue; }
    if (!onlyPos && tok.startsWith('-') && tok !== '-' && !/^-\d+(\.\d+)?$/.test(tok)) {
      // サブコマンド位置に来た非オプションは positional 扱い
      const found = findOptional(tok);
      if (found) {
        const action = found.action; noteSeen(action);
        if (action.action === 'boolean_optional') {
          const isNo = action.optionStrings.includes(tok.split('=')[0]) && tok.startsWith('--no-');
          // --no-xxx は false、それ以外は true
          const vals = []; vals.__boolVal = BOOL(!tok.startsWith('--no-'));
          applyAction(ctx, data, ns, { ...action, action: 'boolean_optional' }, vals);
          continue;
        }
        const firstInline = found.inline !== undefined ? found.inline : (found.rest !== undefined && found.rest !== '' ? found.rest : undefined);
        const takesNone = ['store_true', 'store_false', 'store_const', 'append_const', 'count', 'help', 'version'].includes(action.action);
        if (takesNone) {
          if (found.rest) {
            // 短いオプションの束ね（例 -abc）：rest を次のトークンとして再処理する
            applyAction(ctx, data, ns, action, []);
            argv.splice(i + 1, 0, '-' + found.rest);
            continue;
          }
          applyAction(ctx, data, ns, action, []);
          continue;
        }
        const rawVals = consumeValues(action, firstInline);
        if (rawVals[1] === '__rawConst') { ns[action.dest] = rawVals[0]; continue; }
        if (action.nargs === '*' || action.nargs === '+') ns[action.dest] = LIST(rawVals.map((r) => convertValue(ctx, data, action, r)));
        else if (typeof action.nargs === 'number' && action.nargs !== 1) ns[action.dest] = LIST(rawVals.map((r) => convertValue(ctx, data, action, r)));
        else applyAction(ctx, data, ns, action, rawVals.map((r) => convertValue(ctx, data, action, r)));
        continue;
      }
      if (knownOnly) { extras.push(tok); continue; }
      fail(ctx, data, 'unrecognized arguments: ' + tok);
    }
    // positional / subcommand
    const subAction = data.actions.find((a) => a.isSubparsers);
    if (subAction && !subHandled && Object.keys(data.subcommands).includes(tok)) {
      subHandled = true;
      if (subAction.dest && subAction.dest !== SUPPRESS) ns[subAction.dest] = tok;
      const subData = data.subcommands[tok];
      const restArgv = argv.slice(i + 1);
      const [subNs, subExtras] = parseWith(ctx, subData, restArgv, knownOnly);
      for (const k of Object.keys(subNs)) ns[k] = subNs[k];
      extras.push(...subExtras);
      break;
    }
    positionalTokens.push(tok);
  }
  // positionals の割り当て
  const posActions = data.actions.filter((a) => a.kind === 'positional' && !a.isSubparsers);
  let p = 0;
  for (let idx = 0; idx < posActions.length; idx++) {
    const a = posActions[idx];
    const remaining = positionalTokens.length - p;
    const isLast = idx === posActions.length - 1;
    if (a.nargs === '*') { const take = isLast ? remaining : 0; const vals = positionalTokens.slice(p, p + take); p += take; ns[a.dest] = LIST(vals.map((r) => convertValue(ctx, data, a, r))); seen.add(a); continue; }
    if (a.nargs === '+') {
      const take = isLast ? remaining : 1;
      if (take < 1) fail(ctx, data, 'the following arguments are required: ' + a.dest);
      const vals = positionalTokens.slice(p, p + take); p += take; ns[a.dest] = LIST(vals.map((r) => convertValue(ctx, data, a, r))); seen.add(a); continue;
    }
    if (a.nargs === '?') {
      if (remaining > 0) { ns[a.dest] = convertValue(ctx, data, a, positionalTokens[p]); p++; }
      seen.add(a); continue;
    }
    const n = typeof a.nargs === 'number' ? a.nargs : 1;
    if (remaining < n) {
      // 位置引数は nargs が ?/* でない限り必須（kwargs の required ではない）
      if (a.nargs === undefined || typeof a.nargs === 'number') fail(ctx, data, 'the following arguments are required: ' + a.dest);
      continue;
    }
    if (n === 1) ns[a.dest] = convertValue(ctx, data, a, positionalTokens[p]);
    else ns[a.dest] = LIST(positionalTokens.slice(p, p + n).map((r) => convertValue(ctx, data, a, r)));
    p += n; seen.add(a);
  }
  if (p < positionalTokens.length) {
    const extra = positionalTokens.slice(p);
    if (knownOnly) extras.push(...extra);
    else fail(ctx, data, 'unrecognized arguments: ' + extra.join(' '));
  }
  // required チェック
  for (const a of data.actions) {
    if (a.kind === 'optional' && a.required && !seen.has(a)) fail(ctx, data, 'the following arguments are required: ' + displayName(a));
  }
  for (const g of data.mutexGroups) {
    if (g.required && ![...seen].some((a) => a.mutexGroup === g.id)) fail(ctx, data, 'one of the arguments ' + g.actions.map(displayName).join(' ') + ' is required');
  }
  return [ns, extras];
}

function makeAction(ctx, parserData, names, kwargs, groupId) {
  const optionStrings = names.filter((n) => n.startsWith('-'));
  const isPositional = optionStrings.length === 0;
  let dest = kwargs.dest !== undefined ? ctx.str(kwargs.dest) : null;
  if (!dest) {
    if (isPositional) dest = names[0];
    else {
      const long = optionStrings.find((s) => s.startsWith('--'));
      dest = (long ? long.slice(2) : optionStrings[0].slice(1)).replace(/-/g, '_');
    }
  }
  let actionName = kwargs.action !== undefined ? ctx.str(kwargs.action) : 'store';
  if (!actionName && kwargs.action && kwargs.action.__ncls) actionName = kwargs.action.__ncls.split('.').pop();
  if (!actionName) actionName = 'store';
  const a = {
    kind: isPositional ? 'positional' : 'optional',
    optionStrings, dest,
    action: actionName === 'BooleanOptionalAction' ? 'boolean_optional' : actionName,
    nargs: kwargs.nargs !== undefined ? (ctx.isNum(kwargs.nargs) ? ctx.int(kwargs.nargs) : ctx.str(kwargs.nargs)) : undefined,
    constVal: kwargs.const, defaultVal: kwargs.default,
    typeVal: kwargs.type, choices: kwargs.choices,
    required: kwargs.required !== undefined ? ctx.truthy(kwargs.required) === true : false,
    help: kwargs.help !== undefined ? ctx.str(kwargs.help) : undefined,
    metavar: kwargs.metavar !== undefined ? ctx.str(kwargs.metavar) : undefined,
    versionStr: kwargs.version !== undefined ? ctx.str(kwargs.version) : undefined,
    mutexGroup: groupId,
  };
  if (a.action === 'boolean_optional') {
    // --foo / --no-foo の両形を登録する
    const expanded = [];
    for (const s of [...optionStrings]) { expanded.push(s); if (s.startsWith('--')) expanded.push('--no-' + s.slice(2)); }
    a.optionStrings = expanded;
  }
  parserData.actions.push(a);
  ensureNsAttr(dest);
  return ctx.native('argparse.Action', { actionData: a });
}
const ActionDef = {
  typeName: 'Action',
  construct(ctx, args, kwargs) {
    const a = {
      kind: args.length && typeof args[0] === 'string' && args[0].startsWith('-') ? 'optional' : 'positional',
      optionStrings: (kwargs.option_strings && ctx.listOf(kwargs.option_strings) ? ctx.listOf(kwargs.option_strings) : (args[0] ? [args[0]] : [])),
      dest: kwargs.dest ? ctx.str(kwargs.dest) : 'dest',
      action: 'store', nargs: undefined, constVal: kwargs.const, defaultVal: kwargs.default, typeVal: kwargs.type, choices: kwargs.choices,
      required: false, help: kwargs.help ? ctx.str(kwargs.help) : undefined, metavar: undefined,
    };
    return ctx.native('argparse.Action', { actionData: a });
  },
  attrs: {
    dest: (ctx, self) => self.data.actionData.dest,
    option_strings: (ctx, self) => LIST(self.data.actionData.optionStrings || []),
    nargs: (ctx, self) => self.data.actionData.nargs === undefined ? NONE : (typeof self.data.actionData.nargs === 'number' ? NUM(self.data.actionData.nargs, false) : self.data.actionData.nargs),
    default: (ctx, self) => self.data.actionData.defaultVal !== undefined ? self.data.actionData.defaultVal : NONE,
    const: (ctx, self) => self.data.actionData.constVal !== undefined ? self.data.actionData.constVal : NONE,
    type: (ctx, self) => self.data.actionData.typeVal !== undefined ? self.data.actionData.typeVal : NONE,
    choices: (ctx, self) => self.data.actionData.choices !== undefined ? self.data.actionData.choices : NONE,
    required: (ctx, self) => BOOL(!!self.data.actionData.required),
    help: (ctx, self) => self.data.actionData.help !== undefined ? self.data.actionData.help : NONE,
    metavar: (ctx, self) => self.data.actionData.metavar !== undefined ? self.data.actionData.metavar : NONE,
    container: (ctx, self) => NONE,
  },
  methods: {
    format_usage(ctx, self) { return (self.data.actionData.optionStrings || []).join('/'); },
  },
  call(ctx, self, args) {
    // Action.__call__：parser, namespace, values, option_string を受け取る低水準 API。
    // エンジンでは namespace が native Namespace の場合のみ書き込む
    const nsVal = args[1]; const values = args[2];
    if (nsVal && nsVal.__native === 'argparse.Namespace') {
      const a = self.data.actionData;
      const vals = ctx.listOf(values) || [values];
      const tmp = {}; applyAction(ctx, { prog: 'prog', actions: [], subcommands: {}, defaults: {}, mutexGroups: [] }, tmp, a, vals);
      for (const k of Object.keys(tmp)) { nsVal.data.values[k] = tmp[k]; ensureNsAttr(k); }
    }
    return NONE;
  },
};
function groupNative(ctx, qual, parserData, groupId) {
  return ctx.native(qual, { parserData, groupId });
}
const ArgumentGroupDef = {
  typeName: '_ArgumentGroup',
  methods: {
    add_argument(ctx, self, args, kwargs) {
      const names = args.map((a) => ctx.str(a)).filter((x) => x !== null);
      return makeAction(ctx, self.data.parserData, names, kwargs, self.data.groupId);
    },
    add_mutually_exclusive_group(ctx, self, args, kwargs) {
      return makeMutex(ctx, self.data.parserData, kwargs);
    },
  },
};
function makeMutex(ctx, parserData, kwargs) {
  const id = parserData.mutexGroups.length;
  const g = { id, required: kwargs.required !== undefined ? ctx.truthy(kwargs.required) === true : false, actions: [] };
  parserData.mutexGroups.push(g);
  const nat = ctx.native('argparse._MutuallyExclusiveGroup', { parserData, groupId: id });
  g.nativeRef = nat;
  return nat;
}
const MutexDef = {
  typeName: '_MutuallyExclusiveGroup',
  methods: {
    add_argument(ctx, self, args, kwargs) {
      const names = args.map((a) => ctx.str(a)).filter((x) => x !== null);
      const before = self.data.parserData.actions.length;
      const r = makeAction(ctx, self.data.parserData, names, kwargs, self.data.groupId);
      const g = self.data.parserData.mutexGroups[self.data.groupId];
      if (g) g.actions.push(self.data.parserData.actions[before]);
      return r;
    },
  },
};
const SubParsersDef = {
  typeName: '_SubParsersAction',
  methods: {
    add_parser(ctx, self, args, kwargs) {
      const name = ctx.str(args[0]);
      const subData = newParserData(kwargs.prog !== undefined ? ctx.str(kwargs.prog) : name);
      if (kwargs.help !== undefined) subData.description = ctx.str(kwargs.help);
      self.data.parserData.subcommands[name] = subData;
      addHelpAction(subData);
      return ctx.native('argparse.ArgumentParser', { parserData: subData });
    },
  },
  attrs: { choices: (ctx, self) => NONE },
};
function newParserData(prog) {
  return { prog: prog || 'prog', actions: [], subcommands: {}, defaults: {}, mutexGroups: [], description: undefined };
}
function addHelpAction(data) {
  data.actions.push({ kind: 'optional', optionStrings: ['-h', '--help'], dest: SUPPRESS, action: 'help', nargs: 0, required: false });
}
const ParserDef = {
  typeName: 'ArgumentParser',
  construct(ctx, args, kwargs) {
    const prog = kwargs.prog !== undefined ? ctx.str(kwargs.prog) : (args.length && typeof args[0] === 'string' ? args[0] : undefined);
    const data = newParserData(prog || 'prog');
    if (kwargs.description !== undefined) data.description = ctx.str(kwargs.description);
    const addHelp = kwargs.add_help !== undefined ? ctx.truthy(kwargs.add_help) : true;
    if (addHelp !== false) addHelpAction(data);
    return ctx.native('argparse.ArgumentParser', { parserData: data });
  },
  methods: {
    add_argument(ctx, self, args, kwargs) {
      const names = args.map((a) => ctx.str(a)).filter((x) => x !== null);
      if (!names.length) ctx.err('TypeError', 'add_argument() に名前がありません', '');
      return makeAction(ctx, self.data.parserData, names, kwargs, undefined);
    },
    add_argument_group(ctx, self, args, kwargs) { return groupNative(ctx, 'argparse._ArgumentGroup', self.data.parserData, undefined); },
    add_mutually_exclusive_group(ctx, self, args, kwargs) { return makeMutex(ctx, self.data.parserData, kwargs); },
    add_subparsers(ctx, self, args, kwargs) {
      const data = self.data.parserData;
      const dest = kwargs.dest !== undefined ? ctx.str(kwargs.dest) : SUPPRESS;
      data.actions.push({ kind: 'positional', isSubparsers: true, dest, action: 'parsers', required: kwargs.required !== undefined ? ctx.truthy(kwargs.required) === true : false });
      return ctx.native('argparse._SubParsersAction', { parserData: data });
    },
    parse_args(ctx, self, args, kwargs) {
      let argv = [];
      if (args.length && !ctx.isNone(args[0])) {
        const items = ctx.iterable(args[0]);
        if (items === null) ctx.err('TypeError', 'parse_args(): 引数は文字列の並びでなければなりません', '');
        argv = items.map((x) => { if (typeof x !== 'string') ctx.err('TypeError', 'parse_args(): 要素は文字列でなければなりません', ''); return x; });
      } else if (kwargs.args !== undefined && !ctx.isNone(kwargs.args)) {
        argv = (ctx.iterable(kwargs.args) || []).map((x) => String(x));
      } else {
        ctx.diag('parse_args(args=None) は CPython では sys.argv[1:] を読みますが、エンジンには argv が無いため空の引数列として扱います（未検証の裁定）');
      }
      const [ns] = parseWith(ctx, self.data.parserData, argv, false);
      // namespace 引数への書き込み
      if (args.length > 1 && args[1] && args[1].__native === 'argparse.Namespace') {
        for (const k of Object.keys(ns)) { args[1].data.values[k] = ns[k]; ensureNsAttr(k); }
        return args[1];
      }
      return makeNamespace(ctx, ns);
    },
    parse_known_args(ctx, self, args, kwargs) {
      let argv = [];
      if (args.length && !ctx.isNone(args[0])) argv = (ctx.iterable(args[0]) || []).map((x) => String(x));
      const [ns, extras] = parseWith(ctx, self.data.parserData, argv, true);
      return TUPLE([makeNamespace(ctx, ns), LIST(extras)]);
    },
    parse_intermixed_args(ctx, self, args, kwargs) { ctx.diag('parse_intermixed_args は意味論を確定できていないため未検証です'); return ctx.unk('parse_intermixed_args の結果'); },
    parse_known_intermixed_args(ctx, self, args, kwargs) { ctx.diag('parse_known_intermixed_args は意味論を確定できていないため未検証です'); return ctx.unk('parse_known_intermixed_args の結果'); },
    format_usage(ctx, self) { return usageOf(self.data.parserData); },
    format_help(ctx, self) { return helpText(self.data.parserData) + '\n'; },
    print_usage(ctx, self) { ctx.diag(usageOf(self.data.parserData).trim()); return NONE; },
    print_help(ctx, self) { ctx.diag(helpText(self.data.parserData)); return NONE; },
    error(ctx, self, args) { fail(ctx, self.data.parserData, args.length ? ctx.str(args[0]) || '' : ''); return NONE; },
    exit(ctx, self, args) {
      const status = args.length ? (ctx.num(args[0]) ?? 0) : 0;
      ctx.err('SystemExit', String(status), '');
      return NONE;
    },
    get_default(ctx, self, args) {
      const dest = ctx.str(args[0]);
      const a = self.data.parserData.actions.find((x) => x.dest === dest);
      if (a) { const d = defaultFor(a); return d === SUPPRESS ? NONE : d; }
      if (dest in self.data.parserData.defaults) return self.data.parserData.defaults[dest];
      return NONE;
    },
    set_defaults(ctx, self, args, kwargs) { for (const k of Object.keys(kwargs || {})) self.data.parserData.defaults[k] = kwargs[k]; return NONE; },
    convert_arg_line_to_args(ctx, self, args) { return LIST([args.length ? ctx.str(args[0]) : '']); },
    register(ctx, self, args) { ctx.diag('register はカスタム action/type の登録で、エンジンでは未検証です'); return NONE; },
  },
  attrs: { prog: (ctx, self) => self.data.parserData.prog, description: (ctx, self) => self.data.parserData.description || NONE },
};
function formatterDef(name) {
  return { typeName: name, construct(ctx, args) { return ctx.native('argparse.' + name, {}); } };
}
registerStdlibModule('argparse', {
  constants: { SUPPRESS, PARSER: 'A...', REMAINDER: '...' },
  classes: {
    ArgumentParser: ParserDef, Namespace: NamespaceDef, Action: ActionDef,
    ArgumentError: { typeName: 'ArgumentError', exc: 'argparse.ArgumentError', excParents: ['Exception'] },
    ArgumentTypeError: { typeName: 'ArgumentTypeError', exc: 'argparse.ArgumentTypeError', excParents: ['Exception'] },
    BooleanOptionalAction: { typeName: 'BooleanOptionalAction', parents: ['argparse.Action'] },
    FileType: {
      typeName: 'FileType',
      construct(ctx) { ctx.err('未対応', 'argparse.FileType は実ファイルを開くため本アプリの高度モードでは未対応です', ''); return NONE; },
    },
    ArgumentDefaultsHelpFormatter: formatterDef('ArgumentDefaultsHelpFormatter'),
    MetavarTypeHelpFormatter: formatterDef('MetavarTypeHelpFormatter'),
    RawDescriptionHelpFormatter: formatterDef('RawDescriptionHelpFormatter'),
    RawTextHelpFormatter: formatterDef('RawTextHelpFormatter'),
    _ArgumentGroup: ArgumentGroupDef, _MutuallyExclusiveGroup: MutexDef, _SubParsersAction: SubParsersDef,
  },
});
