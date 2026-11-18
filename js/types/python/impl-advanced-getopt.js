/* 高度モード B7 G12：getopt（全4件）。
 * 一次情報：公式ドキュメント 3.15 library/getopt と CPython 3.12.3 実走。
 * 純粋な文字列解析として完全実装する。GetoptError は例外対応付け
 * （msg／opt 属性は例外値の属性としてではなく、生成後の data に保持するが、
 * エンジンには動的属性フックが無いため属性読みは基盤要請に挙げる。
 * str(例外) は msg と一致させる）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { LIST, TUPLE } = PyAPI;

function strList(ctx, v, fname) {
  const items = ctx.iterable(v);
  if (items === null) ctx.err('TypeError', fname + '(): 引数は文字列の並びでなければなりません', '');
  return items.map((x) => {
    if (typeof x !== 'string') ctx.err('TypeError', fname + '(): 要素は文字列でなければなりません', '');
    return x;
  });
}
function parseOpts(ctx, args, shortopts, longopts, gnu) {
  const argv = strList(ctx, args[0], 'getopt');
  let shorts = '';
  if (args.length >= 2) { if (typeof args[1] !== 'string') ctx.err('TypeError', 'getopt(): shortopts は文字列でなければなりません', ''); shorts = args[1]; }
  let longs = [];
  if (args.length >= 3) longs = strList(ctx, args[2], 'getopt');
  // 先頭の '+' / '-' と ':' の扱い（POSIXLY_CORRECT 相当の '+' は順序固定）
  let orderRequire = false;
  if (shorts.startsWith('+')) { orderRequire = true; shorts = shorts.slice(1); }
  else if (shorts.startsWith('-')) shorts = shorts.slice(1);
  const shortMap = {}; // letter -> hasArg
  for (let i = 0; i < shorts.length; i++) {
    if (shorts[i] === ':') continue;
    shortMap[shorts[i]] = shorts[i + 1] === ':';
  }
  const fail = (msg, opt) => {
    const e = new Error(msg); e.__getopt = { msg, opt }; throw e;
  };
  const opts = []; const rest = [];
  let i = 0; let onlyRest = false;
  const pushLong = (name, val, orig) => {
    // 一意接頭辞の解決
    let matched = longs.filter((l) => (l.endsWith('=') ? l.slice(0, -1) : l) === name);
    if (!matched.length) {
      const cand = longs.filter((l) => (l.endsWith('=') ? l.slice(0, -1) : l).startsWith(name));
      if (cand.length > 1) fail('option --' + name + ' not a unique prefix', name);
      matched = cand;
    }
    if (!matched.length) fail('option --' + name + ' not recognized', name);
    const spec = matched[0]; const hasArg = spec.endsWith('=');
    const lname = hasArg ? spec.slice(0, -1) : spec;
    if (hasArg) {
      if (val === null) {
        if (i + 1 < argv.length) { val = argv[i + 1]; i++; }
        else fail('option --' + lname + ' requires argument', lname);
      }
      opts.push(['--' + lname, val]);
    } else {
      if (val !== null) fail('option --' + lname + ' must not have an argument', lname);
      opts.push(['--' + lname, '']);
    }
  };
  for (; i < argv.length; i++) {
    const a = argv[i];
    if (onlyRest) { rest.push(a); continue; }
    if (a === '--') { onlyRest = true; continue; }
    if (a.startsWith('--')) {
      const body = a.slice(2); const eq = body.indexOf('=');
      if (eq >= 0) pushLong(body.slice(0, eq), body.slice(eq + 1), a);
      else pushLong(body, null, a);
      continue;
    }
    if (a.length > 1 && a[0] === '-' && a !== '-') {
      let j = 1;
      while (j < a.length) {
        const ch = a[j];
        if (!(ch in shortMap)) fail('option -' + ch + ' not recognized', ch);
        if (shortMap[ch]) {
          let val;
          if (j + 1 < a.length) { val = a.slice(j + 1); j = a.length; }
          else if (i + 1 < argv.length) { val = argv[i + 1]; i++; j = a.length; }
          else fail('option -' + ch + ' requires argument', ch);
          opts.push(['-' + ch, val]);
        } else { opts.push(['-' + ch, '']); j++; }
      }
      continue;
    }
    rest.push(a);
    if (!gnu || orderRequire) {
      // 通常 getopt（非 GNU）は最初の引数で停止。gnu でも '+' 始まりは停止
      for (i = i + 1; i < argv.length; i++) rest.push(argv[i]);
      break;
    }
  }
  return TUPLE([LIST(opts.map(([k, v]) => TUPLE([k, v]))), LIST(rest)]);
}
function wrap(fn, gnu, fname) {
  return (ctx, args, kwargs) => {
    if (Object.keys(kwargs || {}).length) ctx.err('TypeError', fname + '() はキーワード引数を取りません', '');
    if (args.length < 1 || args.length > 3) ctx.err('TypeError', fname + '() の引数の数が合いません', '');
    try { return parseOpts(ctx, args, null, null, gnu); }
    catch (e) {
      if (e && e.__getopt) ctx.err('getopt.GetoptError', e.__getopt.msg, '');
      throw e;
    }
  };
}
registerStdlibModule('getopt', {
  functions: {
    getopt: wrap(null, false, 'getopt.getopt'),
    gnu_getopt: wrap(null, true, 'getopt.gnu_getopt'),
  },
  classes: {
    GetoptError: { typeName: 'GetoptError', exc: 'getopt.GetoptError', excParents: ['Exception'] },
    error: { typeName: 'error', exc: 'getopt.GetoptError', excParents: ['Exception'] },
  },
});
