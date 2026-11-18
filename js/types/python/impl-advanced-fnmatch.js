/* 高度モード B7 G3：fnmatch モジュール（全5件）の意味論実装。
 * 一次情報：Python 公式ドキュメント 3.15（library/fnmatch）と CPython 3.12.3
 * 実走。translate は CPython 3.12 の fnmatch.translate を忠実に移植した。
 * fnmatch の normcase は POSIX では恒等（本実装の前提プラットフォーム）。
 * filterfalse は Python 3.14 で追加された関数（ドキュメントで裏付け）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';

const { BOOL, LIST } = PyAPI;

function arity(ctx, args, min, max, fname) {
  if (args.length < min || args.length > max) ctx.err('TypeError', 'fnmatch.' + fname + '() の引数の数が合いません（' + args.length + '個渡されました）', 'リファレンスで使い方を確認してください');
}
function noKwargs(ctx, kwargs, fname) {
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', 'fnmatch.' + fname + '() にキーワード引数「' + ks[0] + '」はありません', '');
}
function strArg(ctx, v, fname) {
  if (ctx.isUnk(v)) return null;
  const s = ctx.str(v);
  if (s === null) ctx.err('TypeError', 'fnmatch.' + fname + '() の引数には文字列を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  return s;
}
function pyEscape(c) {
  // CPython の re.escape（3.7以降）：特殊文字だけをエスケープする
  if ('()[]{}?*+-|^$\\.&~# \t\n\r\v\f'.includes(c)) return '\\' + c;
  return c;
}

/* CPython 3.12 fnmatch.translate の移植。STAR は内部マーカー。 */
const STAR = { __star: true };
export function fnmatchTranslate(pat) {
  const res = [];
  let i = 0; const n = pat.length;
  while (i < n) {
    const c = pat[i]; i += 1;
    if (c === '*') {
      if (!res.length || res[res.length - 1] !== STAR) res.push(STAR);
    } else if (c === '?') {
      res.push('.');
    } else if (c === '[') {
      let j = i;
      if (j < n && pat[j] === '!') j += 1;
      if (j < n && pat[j] === ']') j += 1;
      while (j < n && pat[j] !== ']') j += 1;
      if (j >= n) {
        res.push('\\[');
      } else {
        let stuff = pat.slice(i, j);
        if (!stuff.includes('-')) {
          stuff = stuff.replace(/\\/g, '\\\\');
        } else {
          const chunks = [];
          let k = pat[i] === '!' ? i + 2 : i + 1;
          for (;;) {
            k = pat.indexOf('-', k);
            if (k < 0 || k >= j) break;
            chunks.push(pat.slice(i, k));
            i = k + 1; k = k + 3;
          }
          const chunk = pat.slice(i, j);
          if (chunk) chunks.push(chunk);
          else chunks[chunks.length - 1] += '-';
          for (let k2 = chunks.length - 1; k2 > 0; k2--) {
            if (chunks[k2 - 1][chunks[k2 - 1].length - 1] > chunks[k2][0]) {
              chunks[k2 - 1] = chunks[k2 - 1].slice(0, -1) + chunks[k2].slice(1);
              chunks.splice(k2, 1);
            }
          }
          stuff = chunks.map((s) => s.replace(/\\/g, '\\\\').replace(/-/g, '\\-')).join('-');
        }
        stuff = stuff.replace(/([&~|])/g, '\\$1');
        i = j + 1;
        if (!stuff) res.push('(?!)');
        else if (stuff === '!') res.push('.');
        else {
          if (stuff[0] === '!') stuff = '^' + stuff.slice(1);
          else if (stuff[0] === '^' || stuff[0] === '[') stuff = '\\' + stuff;
          res.push('[' + stuff + ']');
        }
      }
    } else {
      res.push(pyEscape(c));
    }
  }
  // STAR の処理
  const inp = res; const out = [];
  let i2 = 0; const n2 = inp.length;
  while (i2 < n2 && inp[i2] !== STAR) { out.push(inp[i2]); i2 += 1; }
  while (i2 < n2) {
    i2 += 1; // STAR を消費
    if (i2 === n2) { out.push('.*'); break; }
    const fixed = [];
    while (i2 < n2 && inp[i2] !== STAR) { fixed.push(inp[i2]); i2 += 1; }
    const fx = fixed.join('');
    if (i2 === n2) { out.push('.*'); out.push(fx); }
    else out.push('(?>.*?' + fx + ')');
  }
  return '(?s:' + out.join('') + ')\\Z';
}

function compilePat(pat) {
  // translate の出力（Python re 構文）を JS RegExp へ。原子グループ (?>...)
  // は、マッチ成否だけを見る用途では非原子の最小量指定子と等価（固定片は
  // 固定長マッチのみで構成され、後続は .* 経由で任意位置へ到達できるため）。
  let body = fnmatchTranslate(pat);
  body = body.slice(4, -3); // '(?s:' と ')\Z' を外す
  body = body.replace(/\(\?>/g, '(?:');
  // Python の文字クラスでは '[' の直後の ']' はリテラル。JS ではエスケープが要る
  body = body.replace(/\[(\^)?\]/g, (mm, g1) => '[' + (g1 || '') + '\\]');
  return new RegExp('^(?:' + body + ')$', 's');
}
function matchPat(pat, name) {
  return compilePat(pat).test(name);
}

const FUNCTIONS = {
  translate: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'translate'); arity(ctx, args, 1, 1, 'translate');
    const pat = strArg(ctx, args[0], 'translate');
    if (pat === null) return ctx.unk('パターンが実行時に決まる値');
    return fnmatchTranslate(pat);
  },
  fnmatchcase: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'fnmatchcase'); arity(ctx, args, 2, 2, 'fnmatchcase');
    const name = strArg(ctx, args[0], 'fnmatchcase'); const pat = strArg(ctx, args[1], 'fnmatchcase');
    if (name === null || pat === null) return ctx.unk('名前かパターンが実行時に決まる値');
    return BOOL(matchPat(pat, name));
  },
  fnmatch: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'fnmatch'); arity(ctx, args, 2, 2, 'fnmatch');
    const name = strArg(ctx, args[0], 'fnmatch'); const pat = strArg(ctx, args[1], 'fnmatch');
    if (name === null || pat === null) return ctx.unk('名前かパターンが実行時に決まる値');
    // POSIX の normcase は恒等変換
    return BOOL(matchPat(pat, name));
  },
  filter: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'filter'); arity(ctx, args, 2, 2, 'filter');
    const items = ctx.iterable(args[0]);
    if (items === null) ctx.err('TypeError', 'fnmatch.filter() の第1引数にはリストなどの「並び」を使ってください', '');
    const pat = strArg(ctx, args[1], 'filter');
    if (pat === null) return ctx.unk('パターンが実行時に決まる値');
    const re = compilePat(pat);
    const out = [];
    for (const it of items) {
      const s = ctx.str(it);
      if (s === null) { if (ctx.isUnk(it)) return ctx.unk('要素が実行時に決まる値'); ctx.err('TypeError', 'fnmatch.filter() の要素には文字列を使ってください', ''); }
      if (re.test(s)) out.push(it);
    }
    return LIST(out);
  },
  filterfalse: (ctx, args, kwargs) => {
    noKwargs(ctx, kwargs, 'filterfalse'); arity(ctx, args, 2, 2, 'filterfalse');
    const items = ctx.iterable(args[0]);
    if (items === null) ctx.err('TypeError', 'fnmatch.filterfalse() の第1引数にはリストなどの「並び」を使ってください', '');
    const pat = strArg(ctx, args[1], 'filterfalse');
    if (pat === null) return ctx.unk('パターンが実行時に決まる値');
    const re = compilePat(pat);
    const out = [];
    for (const it of items) {
      const s = ctx.str(it);
      if (s === null) { if (ctx.isUnk(it)) return ctx.unk('要素が実行時に決まる値'); ctx.err('TypeError', 'fnmatch.filterfalse() の要素には文字列を使ってください', ''); }
      if (!re.test(s)) out.push(it);
    }
    return LIST(out);
  },
};

registerStdlibModule('fnmatch', { functions: FUNCTIONS });
