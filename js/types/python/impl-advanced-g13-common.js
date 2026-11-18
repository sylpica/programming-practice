/* 高度モード B7 G13（パス・アドレス等の純粋ロジック系）共通基盤。
 *
 * G13 が「生成する」バイト列は内部ネイティブ値（限定名 'g13.bytes'、
 * typeName 'bytes'）で表す。repr は CPython の bytes 表記に一致させ、
 * 等価・ハッシュ・len・添字・反復も備えるため、packed → コンストラクタ
 * のような生成→消費の連鎖を実値で検証できる。
 * 【A7 是正】当初の前提「engine.js の値モデルには bytes 型が存在しない」
 * は統合ビルドでは誤り（B6 が {__bytes} 形の bytes を実装済みで、bytes
 * リテラルは実値として届く）。bytesArr はエンジン形も受け付けるよう
 * 是正した。bytes 値型の完全な共通化自体は引き続き基盤への要請。 */
import { PyAPI } from './engine.js';
import { registerStdlibClass, nativeClassDef } from './stdlib-registry.js';

export const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, RANGE, ITER, UNK } = PyAPI;
export const { isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, isFunc, dictGet, dictSet } = PyAPI;
export const F = (v) => NUM(v, true);
export const I = (v) => NUM(v, false);
export const SAFE = (n) => Number.isSafeInteger(n);
export const BIGDESC = 'とても大きな整数・この説明では正確に計算しません';

/* ---------- bytes 内部値 ---------- */
export const BYTES_Q = 'g13.bytes';
export function bytesRepr(arr) {
  const hasSingle = arr.includes(0x27), hasDouble = arr.includes(0x22);
  const q = hasSingle && !hasDouble ? '"' : "'";
  let out = 'b' + q;
  for (const b of arr) {
    if (b === 0x5c) out += '\\\\';
    else if (b === q.charCodeAt(0)) out += '\\' + q;
    else if (b === 0x09) out += '\\t';
    else if (b === 0x0a) out += '\\n';
    else if (b === 0x0d) out += '\\r';
    else if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
    else out += '\\x' + b.toString(16).padStart(2, '0');
  }
  return out + q;
}
function bytesCmp(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length === b.length ? 0 : (a.length < b.length ? -1 : 1);
}
registerStdlibClass(BYTES_Q, {
  typeName: 'bytes',
  repr: (ctx, self) => bytesRepr(self.data.arr),
  str: (ctx, self) => bytesRepr(self.data.arr),
  len: (ctx, self) => self.data.arr.length,
  iter: (ctx, self) => self.data.arr.map((b) => I(b)),
  eq: (ctx, self, other) => { const oa = bytesArr(other); return oa !== null ? bytesCmp(self.data.arr, oa) === 0 : false; },
  hash: (ctx, self) => 'b:' + self.data.arr.map((b) => b.toString(16).padStart(2, '0')).join(''),
  getitem: (ctx, self, key) => {
    const a = self.data.arr;
    if (key && typeof key === 'object' && key.__slice) {
      const iv = (b) => (b === null || b === undefined || isNone(b)) ? null : ctx.int(b);
      const step = iv(key.step) === null ? 1 : iv(key.step);
      if (step === 0) { ctx.err('ValueError', 'slice step cannot be zero', ''); return UNK(''); }
      const len = a.length;
      const adj = (v, def, lowB, highB) => { if (v === null) return def; if (v < 0) { v += len; if (v < lowB) v = lowB; } else if (v > highB) v = highB; return v; };
      const start = step > 0 ? adj(iv(key.lo), 0, 0, len) : adj(iv(key.lo), len - 1, -1, len - 1);
      const stop = step > 0 ? adj(iv(key.hi), len, 0, len) : adj(iv(key.hi), -1, -1, len - 1);
      const out = [];
      if (step > 0) for (let k = start; k < stop; k += step) out.push(a[k]); else for (let k = start; k > stop; k += step) out.push(a[k]);
      return makeBytesVal(out);
    }
    const n = ctx.int(key);
    if (n === null) { ctx.err('TypeError', 'byte indices must be integers', ''); return UNK(''); }
    let idx = n; if (idx < 0) idx += a.length;
    if (idx < 0 || idx >= a.length) { ctx.err('IndexError', 'index out of range', ''); return UNK(''); }
    return I(a[idx]);
  },
  binop: (ctx, self, op, other, reflected) => {
    const a = self.data.arr;
    const oa = bytesArr(other);
    if (op === '+' && oa !== null) {
      return reflected ? makeBytesVal([...oa, ...a]) : makeBytesVal([...a, ...oa]);
    }
    if (op === '*' || op === '*=') {
      const n = ctx.int(other);
      if (n !== null && !reflected || (n !== null && reflected)) {
        const src = a; const out = [];
        for (let k = 0; k < n; k++) out.push(...src);
        return makeBytesVal(out);
      }
      return ctx.NOT_HANDLED;
    }
    return ctx.NOT_HANDLED;
  },
  compare: (ctx, self, op, other) => {
    const oa = bytesArr(other);
    if (oa === null) return null;
    const c = bytesCmp(self.data.arr, oa);
    return op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
  },
});
export function makeBytesVal(arr) { return { __native: BYTES_Q, mod: 'g13', data: { arr: Array.from(arr) } }; }
export function isBytesVal(v) { return !!v && v.__native === BYTES_Q; }
// 高度A7班是正: 本共通基盤の冒頭コメント「エンジンに bytes 型は無い」は
// 統合ビルドでは誤り（B6 が {__bytes} 形の bytes を実装済み）。G7 と
// 同じく、エンジン形の bytes／bytearray も入力として受け付ける。
export function bytesArr(v) {
  if (isBytesVal(v)) return v.data.arr;
  if (v && typeof v === 'object' && Array.isArray(v.__bytes)) return [...v.__bytes];
  if (v && typeof v === 'object' && Array.isArray(v.__bytearray)) return [...v.__bytearray];
  return null;
}

/* ---------- 引数検査ヘルパ ---------- */
export function noKw(ctx, kwargs, fname) {
  const ks = Object.keys(kwargs || {});
  if (ks.length) ctx.err('TypeError', fname + "() got an unexpected keyword argument '" + ks[0] + "'", '');
}
export function onlyKw(ctx, kwargs, allowed, fname) {
  for (const k of Object.keys(kwargs || {})) if (!allowed.includes(k)) ctx.err('TypeError', fname + "() got an unexpected keyword argument '" + k + "'", '');
}
export function arity(ctx, args, min, max, fname) {
  if (args.length < min || args.length > max) ctx.err('TypeError', fname + '() takes ' + (min === max ? min : min + ' to ' + max) + ' positional arguments but ' + args.length + ' were given', '');
}
/* 文字列引数。UNK は null を返す（呼び出し側で未確定に倒す）。 */
export function strArg(ctx, v, fname) {
  if (typeof v === 'string') return v;
  if (isUnk(v)) return null;
  ctx.err('TypeError', fname + ' must be str, not ' + ctx.typeName(v), '');
  return null;
}
/* __index__ 規則の整数引数（Number）。UNK は null。float は TypeError。 */
export function intArg(ctx, v, fname) {
  if (isUnk(v)) return null;
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v) && !v.f) return v.v;
  ctx.err('TypeError', "'" + ctx.typeName(v) + "' object cannot be interpreted as an integer", '');
  return null;
}
/* BigInt 版（アドレス計算用）。UNK は null。 */
export function bigIntArg(ctx, v) {
  if (isUnk(v)) return null;
  if (isBool(v)) return v.v ? 1n : 0n;
  if (isNum(v) && !v.f && SAFE(v.v)) return BigInt(v.v);
  return undefined; // 整数でない／安全範囲外
}
export function numToEngine(big) {
  return SAFE(Number(big)) && BigInt(Number(big)) === big ? I(Number(big)) : null;
}
export function unsupportedFn(what, reason) {
  return (ctx) => { ctx.err('未対応', what + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(what); };
}
export function unsupportedCtor(what, reason) {
  return (ctx) => { ctx.err('未対応', what + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(what); };
}
export function isCallableVal(v) {
  if (!v || typeof v !== 'object') return false;
  if (isFunc(v) || v.__builtin || v.__method || v.__bound || v.__class || v.__ncls || v.__type) return true;
  if (v.__native) { const d = nativeClassDef(v.__native); return !!(d && d.call); }
  return false;
}
/* ジェネレータ系の戻り値：有限列を ITER 値で返す。上限超過は未確定に倒す。 */
export const ITER_CAP = 100000;
export function genIter(ctx, values, kind) {
  if (values.length > ITER_CAP) {
    ctx.diag('要素数が上限（' + ITER_CAP + '件）を超えるため、この説明では結果を確定しません');
    return ctx.unk('要素数が上限を超えるイテレータ');
  }
  return ITER(values, kind || 'generator');
}
export function makeDict(entries) {
  const d = DICT();
  for (const [k, v] of entries) dictSet(d, k, v);
  return d;
}

/* ---------- fnmatch._translate / glob.translate の移植（CPython 3.13） ----------
 * 一次情報：CPython 3.13 の Lib/fnmatch.py の _translate と Lib/glob.py の
 * translate。pathlib の match／full_match も同じ変換を使う（3.13+ の
 * _StringGlobber が glob.translate を呼ぶ）。生成される正規表現文字列は
 * CPython と一致させる（glob.translate の戻り値そのものが観測可能なため）。 */
const RE_ESCAPE_SPECIALS = new Set(Array.from('()[]{}?*+-|^$\\.&~# \t\n\r\v\f'));
export function pyReEscape(c) {
  return RE_ESCAPE_SPECIALS.has(c) ? '\\' + c : c;
}
/* fnmatch._translate(pat, STAR, QUESTION_MARK) の移植。戻り値は文字列と
 * STAR マーカーの配列（glob.translate はこの配列をそのまま連結する）。 */
export function fnmatchTranslatePart(pat, STAR, QUESTION_MARK) {
  const res = [];
  let i = 0; const n = pat.length;
  while (i < n) {
    const c = pat[i]; i += 1;
    if (c === '*') {
      if (!res.length || res[res.length - 1] !== STAR) res.push(STAR);
    } else if (c === '?') {
      res.push(QUESTION_MARK);
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
            i = k + 1;
            k = k + 3;
          }
          const chunk = pat.slice(i, j);
          if (chunk) chunks.push(chunk);
          else chunks[chunks.length - 1] += '-';
          for (let m = chunks.length - 1; m > 0; m--) {
            if (chunks[m - 1][chunks[m - 1].length - 1] > chunks[m][0]) {
              chunks[m - 1] = chunks[m - 1].slice(0, -1) + chunks[m].slice(1);
              chunks.splice(m, 1);
            }
          }
          stuff = chunks.map((s) => s.replace(/\\/g, '\\\\').replace(/-/g, '\\-')).join('-');
        }
        stuff = stuff.replace(/[&~|]/g, (ch) => '\\' + ch);
        i = j + 1;
        if (!stuff) res.push('(?!)'); // 空のパターン：決してマッチしない
        else if (stuff === '!') res.push('.');
        else {
          if (stuff[0] === '!') stuff = '^' + stuff.slice(1);
          else if (stuff[0] === '^' || stuff[0] === '[') stuff = '\\' + stuff;
          res.push('[' + stuff + ']');
        }
      }
    } else {
      res.push(pyReEscape(c));
    }
  }
  return res;
}
/* glob.translate の移植（CPython 3.13 Lib/glob.py）。seps は区切り文字の
 * 列（文字列）。既定は POSIX の '/'。 */
export function globTranslate(pat, recursive, includeHidden, seps) {
  if (!seps) seps = '/';
  const sepList = Array.from(seps);
  const escapedSeps = sepList.map(pyReEscape).join('');
  const anySep = sepList.length > 1 ? '[' + escapedSeps + ']' : escapedSeps;
  const notSep = '[^' + escapedSeps + ']';
  let oneLastSegment, oneSegment, anySegments, anyLastSegments;
  if (includeHidden) {
    oneLastSegment = notSep + '+';
    oneSegment = oneLastSegment + anySep;
    anySegments = '(?:.+' + anySep + ')?';
    anyLastSegments = '.*';
  } else {
    oneLastSegment = '[^' + escapedSeps + '.]' + notSep + '*';
    oneSegment = oneLastSegment + anySep;
    anySegments = '(?:' + oneSegment + ')*';
    anyLastSegments = anySegments + '(?:' + oneLastSegment + ')?';
  }
  const results = [];
  const splitRe = new RegExp('[' + escapedSeps + ']');
  const parts = pat.split(splitRe);
  const lastPartIdx = parts.length - 1;
  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    if (part === '*') {
      results.push(idx < lastPartIdx ? oneSegment : oneLastSegment);
    } else if (recursive && part === '**') {
      if (idx < lastPartIdx) {
        if (parts[idx + 1] !== '**') results.push(anySegments);
      } else {
        results.push(anyLastSegments);
      }
    } else {
      if (part) {
        if (!includeHidden && (part[0] === '*' || part[0] === '?')) results.push('(?!\\.)');
        results.push(...fnmatchTranslatePart(part, notSep + '*', notSep));
      }
      if (idx < lastPartIdx) results.push(anySep);
    }
  }
  return '(?s:' + results.join('') + ')\\Z';
}
/* glob.translate の正規表現文字列を JS RegExp（全体一致）へ変換する。
 * Python の (?s:...) と \Z を、JS の s フラグと ^...$ に置き換える。 */
export function globRegexToJS(translated, caseSensitive) {
  let body = translated;
  if (body.startsWith('(?s:') && body.endsWith(')\\Z')) body = body.slice(4, -3);
  return new RegExp('^(?:' + body + ')$', caseSensitive ? 's' : 'si');
}

/* Python の repr（文字列）— エラーメッセージと repr 表示用 */
export function pyRepr(s) {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = q;
  for (const ch of s) {
    if (ch === q) out += '\\' + q;
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else {
      const code = ch.codePointAt(0);
      if (code < 0x20 || code === 0x7f) out += '\\x' + code.toString(16).padStart(2, '0');
      else out += ch;
    }
  }
  return out + q;
}
