/* 高度モード B7 G8：tabnanny モジュール（全5件）。
 * 一次情報：公式ドキュメント 3.15（library/tabnanny）と CPython 本体
 * Lib/tabnanny.py（Whitespace／_process_tokens を忠実に移植し、
 * ローカル 3.12.3 の実走と照合）。
 * 方針：process_tokens はトークン列に対する純粋な解析として再現
 * できる。check はファイル前提のため未対応。NannyNag は例外として
 * 対応付ける（送出時は msg のみが例外文字列になり、lineno／line は
 * 例外値に保持できない＝既知の差異として報告書に記載）。 */
import { PyAPI } from './engine.js';
import { I, BOOL, NONE, unsupportedFn } from './impl-advanced-g8-common.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { TOKEN_VALUES } from './impl-advanced-token.js';

/* Whitespace（Lib/tabnanny.py の移植） */
function makeWhitespace(raw) {
  const count = [];
  let b = 0, n = 0, nt = 0;
  for (const ch of raw) {
    if (ch === ' ') { n++; b++; }
    else if (ch === '\t') {
      n++; nt++;
      while (count.length <= b) count.push(0);
      count[b]++;
      b = 0;
    } else break;
  }
  return { raw, n, nt, count, trailing: b, isSimple: count.length <= 1 };
}
function wsLongestRun(ws) { return Math.max(ws.count.length - 1, ws.trailing); }
function wsIndentLevel(ws, tabsize) {
  let il = 0;
  for (let i = tabsize; i < ws.count.length; i++) il += Math.floor(i / tabsize) * ws.count[i];
  return ws.trailing + tabsize * (il + ws.nt);
}
function wsEqual(a, b) {
  return a.trailing === b.trailing && a.count.length === b.count.length && a.count.every((v, i) => v === b.count[i]);
}
function wsNotEqualWitness(a, b) {
  const n = Math.max(wsLongestRun(a), wsLongestRun(b)) + 1;
  const out = [];
  for (let ts = 1; ts <= n; ts++) {
    if (wsIndentLevel(a, ts) !== wsIndentLevel(b, ts)) out.push([ts, wsIndentLevel(a, ts), wsIndentLevel(b, ts)]);
  }
  return out;
}
function wsLess(a, b) {
  if (a.n >= b.n) return false;
  if (a.isSimple && b.isSimple) return a.nt <= b.nt;
  const n = Math.max(wsLongestRun(a), wsLongestRun(b)) + 1;
  for (let ts = 2; ts <= n; ts++) if (wsIndentLevel(a, ts) >= wsIndentLevel(b, ts)) return false;
  return true;
}
function wsNotLessWitness(a, b) {
  const n = Math.max(wsLongestRun(a), wsLongestRun(b)) + 1;
  const out = [];
  for (let ts = 1; ts <= n; ts++) {
    if (wsIndentLevel(a, ts) >= wsIndentLevel(b, ts)) out.push([ts, wsIndentLevel(a, ts), wsIndentLevel(b, ts)]);
  }
  return out;
}
function formatWitnesses(w) {
  const prefix = 'at tab size' + (w.length > 1 ? 's' : '');
  return prefix + ' ' + w.map((t) => String(t[0])).join(', ');
}

function processTokensImpl(ctx, args, kwargs) {
  const iterable = ctx.iterable(args[0]);
  if (iterable === null) ctx.err('TypeError', 'process_tokens() には反復可能オブジェクトを使ってください', '');
  const T = TOKEN_VALUES;
  const indents = [makeWhitespace('')];
  let checkEqual = false;
  for (const item of iterable) {
    let type, tokenStr, start, line;
    if (item && item.__native === 'tokenize.TokenInfo') {
      type = ctx.int(item.data.type); tokenStr = String(item.data.string); start = item.data.start; line = String(item.data.line);
    } else {
      const parts = ctx.iterable(item);
      if (!parts || parts.length < 5) ctx.err('TypeError', 'process_tokens() の要素は5要素タプルです', '');
      type = ctx.int(parts[0]); tokenStr = String(parts[1]); start = parts[2]; line = String(parts[4]);
    }
    const startRow = (() => { const p = ctx.iterable(start); return p ? ctx.int(p[0]) : 0; })();
    if (type === T.NEWLINE) {
      checkEqual = true;
    } else if (type === T.INDENT) {
      checkEqual = false;
      const thisguy = makeWhitespace(tokenStr);
      const top = indents[indents.length - 1];
      if (!wsLess(top, thisguy)) {
        const msg = 'indent not greater e.g. ' + formatWitnesses(wsNotLessWitness(top, thisguy));
        ctx.err('tabnanny.NannyNag', msg, '');
      }
      indents.push(thisguy);
    } else if (type === T.DEDENT) {
      checkEqual = true;
      indents.pop();
    } else if (checkEqual && type !== T.COMMENT && type !== T.NL) {
      checkEqual = false;
      const thisguy = makeWhitespace(line);
      const top = indents[indents.length - 1];
      if (!wsEqual(top, thisguy)) {
        const msg = 'indent not equal e.g. ' + formatWitnesses(wsNotEqualWitness(top, thisguy));
        ctx.err('tabnanny.NannyNag', msg, '');
      }
    }
  }
  return NONE;
}

registerStdlibModule('tabnanny', {
  data: {
    /* CPython の tabnanny では int のカウンタ（既定 0） */
    verbose: I(0),
    filename_only: I(0),
  },
  functions: {
    process_tokens: processTokensImpl,
    check: unsupportedFn('tabnanny.check', 'ファイル／ディレクトリの読み取りが前提で、エンジンでは再現できない'),
  },
  classes: {
    NannyNag: { exc: 'tabnanny.NannyNag', excParents: ['Exception'] },
  },
});
