/* 高度モード B7 G7（書式・データ系）共通基盤。
*
* （報告書 b7-g7-report.md にも記載）
* engine.js の値モデルには bytes 型が存在しない。
* - bytes リテラル b"..." は eval で常に UNK('バイト列（bytes）') になる
* （engine.js の case 'byteslit'）。
* - 組み込み bytes()/bytearray() は「未対応」で停止し、str.encode() も
* 「未対応」で停止する。dictKeyId のコメントに「bytes 相当」とあるが
* 実装された値タグは無い。
* したがって「利用者コードが書いた bytes リテラルを引数に取る関数」は、
* 引数が UNK として届く範囲では結果を確定できない（→ 該当箇所は
* ctx.unk を返す正直な停止にし、項目裁定は各モジュールの報告書どおり）。
* 一方、G7 の関数が「生成する」バイト列については、下記の内部
* ネイティブ値（限定名 'g7.bytes'、typeName 'bytes'）で正確に表す。
* repr は CPython の bytes 表記（b'...'）に一致させ、連結・等価・
* ハッシュ・len・添字・反復も CPython の bytes 意味論どおりに実装する
* ため、生成→消費の連鎖（例：base64.b64decode(str) の結果を
* hashlib に渡す）は実値で検証できる。 */
import { PyAPI} from './engine.js';
import { registerStdlibClass} from './stdlib-registry.js';

export const { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, RANGE, ITER, UNK} = PyAPI;
export const F = (v) => NUM(v, true);
export const I = (v) => NUM(v, false);
export const BYTES_Q = 'g7.bytes';

export function bytesRepr(arr) {
const hasSingle = arr.includes(0x27), hasDouble = arr.includes(0x22);
const q = hasSingle &&!hasDouble? '"': "'";
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
for (let i = 0; i < n; i++) if (a[i]!== b[i]) return a[i] < b[i]? -1: 1;
return a.length === b.length? 0: (a.length < b.length? -1: 1);
}

registerStdlibClass(BYTES_Q, {
typeName: 'bytes',
repr: (ctx, self) => bytesRepr(self.data.arr),
str: (ctx, self) => bytesRepr(self.data.arr),
len: (ctx, self) => self.data.arr.length,
iter: (ctx, self) => self.data.arr.map((b) => I(b)),
eq: (ctx, self, other) => { const oa = bytesArr(other); return oa !== null? bytesCmp(self.data.arr, oa) === 0: false; },
hash: (ctx, self) => 'b:' + self.data.arr.map((b) => b.toString(16).padStart(2, '0')).join(''),
contains: (ctx, self, item) => {
const subArr = bytesArr(item);
if (subArr !== null) {
const sub = subArr, a = self.data.arr;
outer: for (let i = 0; i + sub.length <= a.length; i++) { for (let j = 0; j < sub.length; j++) if (a[i + j]!== sub[j]) continue outer; return true;}
return sub.length === 0? true: false;
}
const n = ctx.num(item);
if (n === null) { ctx.err('TypeError', "'in <string>' requires string as left operand, not " + ctx.typeName(item), ''); return false;}
return self.data.arr.includes(n);
},
getitem: (ctx, self, key) => {
const a = self.data.arr;
if (key && typeof key === 'object' && key.__slice) {
const iv = (b) => (b === null || b === undefined || ctx.isNone(b)) ? null : ctx.int(b);
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
if (n === null) { ctx.err('TypeError', 'byte indices must be integers', ''); return UNK('');}
let idx = n; if (idx < 0) idx += a.length;
if (idx < 0 || idx >= a.length) { ctx.err('IndexError', 'index out of range', ''); return UNK('');}
return I(a[idx]);
},
binop: (ctx, self, op, other, reflected) => {
const a = self.data.arr;
const oa = bytesArr(other);
if (op === '+' &&!reflected && oa !== null) return makeBytesVal([...a,...oa]);
if (op === '+' && reflected && oa !== null) return makeBytesVal([...oa,...a]);
if (op === '*' || op === '*=') {
const o = reflected? self: other, s = reflected? other: self;
const n = ctx.int(o);
const sa = bytesArr(s);
if (n!== null && sa !== null) { const src = sa; const out = []; for (let k = 0; k < n; k++) out.push(...src); return makeBytesVal(out);}
return ctx.NOT_HANDLED;
}
return ctx.NOT_HANDLED;
},
compare: (ctx, self, op, other) => {
const oa = bytesArr(other);
if (oa === null) return null;
const c = bytesCmp(self.data.arr, oa);
return op === '<'? c < 0: op === '<='? c <= 0: op === '>'? c > 0: c >= 0;
},
methods: {
hex: (ctx, self, args, kwargs) => {
let sep = null, per = 1;
if (args.length >= 1) { sep = args[0];}
if (args.length >= 2) { per = ctx.int(args[1]); if (per === null) ctx.err('TypeError', 'bytes_per_sep must be an integer', '');}
let hex = self.data.arr.map((b) => b.toString(16).padStart(2, '0')).join('');
if (sep!== null && sep!== undefined) {
const s = typeof sep === 'string'? sep: (sep && sep.__native === BYTES_Q && sep.data.arr.length === 1? String.fromCharCode(sep.data.arr[0]): null);
if (s === null || [...s].length!== 1) ctx.err('TypeError', 'sep must be length 1', '');
if (per!== 0) {
const pairs = []; for (let i = 0; i < hex.length; i += 2) pairs.push(hex.slice(i, i + 2));
const groups = [];
if (per > 0) { let cur = []; for (let i = pairs.length - 1; i >= 0; i--) { cur.unshift(pairs[i]); if (cur.length === per) { groups.unshift(cur.join('')); cur = [];}} if (cur.length) groups.unshift(cur.join(''));}
else { let cur = []; for (let i = 0; i < pairs.length; i++) { cur.push(pairs[i]); if (cur.length === -per) { groups.push(cur.join('')); cur = [];}} if (cur.length) groups.push(cur.join(''));}
hex = groups.join(s);
}
}
return hex;
},
decode: (ctx, self, args, kwargs) => {
const enc = args.length >= 1 && typeof args[0] === 'string'? args[0]: (kwargs.encoding || 'utf-8');
const errors = args.length >= 2 && typeof args[1] === 'string'? args[1]: (kwargs.errors || 'strict');
const r = decodeBytesToStr(self.data.arr, String(enc).toLowerCase().replace(/_/g, '-'), errors);
if (r === null) { ctx.diag('bytes.decode: このエンコーディング／エラー処理の組み合わせは未検証のため、結果を確定しません'); return ctx.unk('デコード結果');}
if (r.err) ctx.err(r.err[0], r.err[1], '');
return r.str;
},
},
});

export function makeBytesVal(arr) { return { __native: BYTES_Q, mod: 'g7', data: { arr: Array.from(arr)}};}
export function isBytesVal(v) { return!!v && v.__native === BYTES_Q;}
// 高度A7班是正: エンジン本体の bytes／bytearray（{__bytes}／{__bytearray}）
// も受け付ける。従来は G7 独自形だけを認識せず、b'hello' のような
// 正規のリテラルを渡すと「bytes-like object, not bytes」という
// 自己矛盾した TypeError で対応項目が停止していた（base64／binascii／
// hashlib 等）。エンジン形は不変が前提のため複製して返す。
export function bytesArr(v) {
if (isBytesVal(v)) return v.data.arr;
if (v && typeof v === 'object' && Array.isArray(v.__bytes)) return [...v.__bytes];
if (v && typeof v === 'object' && Array.isArray(v.__bytearray)) return [...v.__bytearray];
return null;
}

/* ---- 文字コードの素朴な変換（codecs 実装と共有） ---- */
const _enc = new TextEncoder();
export function strToUtf8(s) { return Array.from(_enc.encode(s));}
export function utf8DecodeStrict(arr) {
try { return new TextDecoder('utf-8', { fatal: true}).decode(new Uint8Array(arr));}
catch { return null;}
}
export function decodeBytesToStr(arr, enc, errors) {
// 戻り値: {str} | {err:[kind,msg]} | null（未検証の組み合わせ）
const norm = enc.replace(/-/g, '_');
if (norm === 'utf_8' || norm === 'utf8' || norm === 'u8') {
if (errors === 'strict') { const s = utf8DecodeStrict(arr); return s === null? { err: ['UnicodeDecodeError', "'utf-8' codec can't decode byte in position 0: invalid start byte"]}: { str: s};}
if (errors === 'ignore' || errors === 'replace') { return { str: new TextDecoder('utf-8').decode(new Uint8Array(arr))};}
return null;
}
if (norm === 'ascii' || norm === 'us_ascii') {
let out = '';
for (let i = 0; i < arr.length; i++) {
const b = arr[i];
if (b < 0x80) out += String.fromCharCode(b);
else if (errors === 'strict') return { err: ['UnicodeDecodeError', "'ascii' codec can't decode byte 0x" + b.toString(16) + ' in position ' + i + ': ordinal not in range(128)']};
else if (errors === 'ignore') continue;
else if (errors === 'replace') out += '�';
else return null;
}
return { str: out};
}
if (norm === 'latin_1' || norm === 'iso8859_1' || norm === 'iso8859' || norm === 'l1') {
return { str: arr.map((b) => String.fromCharCode(b)).join('')};
}
if (norm === 'utf_16' || norm === 'utf_32') return null; // codecs 側で BOM 込み処理する
return null;
}
export function encodeStrToBytes(s, enc, errors) {
const norm = enc.replace(/-/g, '_');
if (norm === 'utf_8' || norm === 'utf8' || norm === 'u8') return { arr: strToUtf8(s)};
if (norm === 'ascii' || norm === 'us_ascii') {
const out = [];
for (const ch of s) {
const cp = ch.codePointAt(0);
if (cp < 0x80) out.push(cp);
else if (errors === 'strict') return { err: ['UnicodeEncodeError', "'ascii' codec can't encode character '\\u" + cp.toString(16).padStart(4, '0') + "' in position 0: ordinal not in range(128)"]};
else if (errors === 'ignore') continue;
else if (errors === 'replace') out.push(0x3f);
else if (errors === 'backslashreplace') { const esc = cp <= 0xff? '\\x' + cp.toString(16).padStart(2, '0'): cp <= 0xffff? '\\u' + cp.toString(16).padStart(4, '0'): '\\U' + cp.toString(16).padStart(8, '0'); for (const c of esc) out.push(c.charCodeAt(0));}
else if (errors === 'xmlcharrefreplace') { const esc = '&#' + cp + ';'; for (const c of esc) out.push(c.charCodeAt(0));}
else return null;
}
return { arr: out};
}
if (norm === 'latin_1' || norm === 'iso8859_1' || norm === 'iso8859' || norm === 'l1') {
const out = [];
for (const ch of s) {
const cp = ch.codePointAt(0);
if (cp <= 0xff) out.push(cp);
else if (errors === 'strict') return { err: ['UnicodeEncodeError', "'latin-1' codec can't encode character '\\u" + cp.toString(16).padStart(4, '0') + "' in position 0: ordinal not in range(256)"]};
else if (errors === 'ignore') continue;
else if (errors === 'replace') out.push(0x3f);
else return null;
}
return { arr: out};
}
return null;
}

/* ---- 共通の引数検査ヘルパ ---- */
export function noKw(ctx, kwargs, fname) {
const ks = Object.keys(kwargs || {});
if (ks.length) ctx.err('TypeError', fname + "() got an unexpected keyword argument '" + ks[0] + "'", '');
}
export function onlyKw(ctx, kwargs, allowed, fname) {
for (const k of Object.keys(kwargs || {})) if (!allowed.includes(k)) ctx.err('TypeError', fname + "() got an unexpected keyword argument '" + k + "'", '');
}
export function arity(ctx, args, min, max, fname) {
if (args.length < min || args.length > max) ctx.err('TypeError', fname + '() takes ' + (min === max? min: min + ' to ' + max) + ' positional arguments but ' + args.length + ' were given', '');
}
export function unkArg(ctx, v) { return ctx.isUnk(v);}
export function unkRet(ctx, what) { ctx.diag(what + '：入力が bytes リテラル等の未確定値のため、この説明では結果を確定しません（未検証）'); return ctx.unk(what);}
export function unsupportedFn(fname, reason) {
return (ctx) => { ctx.err('未対応', fname + ' は本アプリの高度モードでは未対応です（' + reason + '）', ''); return UNK(fname);};
}
export function unverifiedFn(fname, reason) {
return (ctx) => { ctx.diag(fname + '：' + reason + ' のため未検証です。結果を確定しません'); return ctx.unk(fname + ' の結果（未検証）');};
}
export function strArg(ctx, v, fname, what) {
if (typeof v === 'string') return v;
if (ctx.isUnk(v)) return null;
ctx.err('TypeError', fname + '() argument ' + (what || '') + ' must be str, not ' + ctx.typeName(v), '');
return null;
}
export function numArgE(ctx, v, fname) {
const n = ctx.num(v);
if (n === null) { if (ctx.isUnk(v)) return null; ctx.err('TypeError', fname + '() argument must be a number, not ' + ctx.typeName(v), '');}
return n;
}
export function intArgE(ctx, v, fname) {
if (ctx.isBool(v)) return v.v? 1: 0;
if (ctx.isNum(v) &&!v.f) return v.v;
if (ctx.isUnk(v)) return null;
ctx.err('TypeError', fname + '() argument must be an integer, not ' + ctx.typeName(v), '');
return null;
}
export function floatReprOf(ctx, x) { return ctx.repr(NUM(x, true));}
export function makeDictFrom(entries) {
const d = DICT();
for (const [k, v] of entries) PyAPI.dictSet(d, k, v);
return d;
}
export function dictFromMap(m) { return m;}
export function pyDictGet(ctx, d, key) { return PyAPI.dictGet(d, key);}
export function boolKw(kwargs, name, def) {
if (!(name in (kwargs || {}))) return def;
const v = kwargs[name];
return!!v && v!== NONE &&!(v && v.__bool === true && v.v === false) &&!(typeof v === 'object' && v && v.__num === true && v.v === 0) && v!== '';
}
export function kwVal(kwargs, name, def) { return (kwargs && name in kwargs)? kwargs[name]: def;}
/* キーワード真偽の安全な取得。ctx.truthy(undefined) は true を返すため、
* 欠落時は必ず存在チェックしてから判定する（kwVal の戻り値を直接 truthy に渡さない）。 */
export function kwBool(ctx, kwargs, name, positional, def = false) {
  let v;
  if (kwargs && name in kwargs) v = kwargs[name];
  else if (positional !== undefined) v = positional;
  else return def;
  if (v === undefined || v === null) return def;
  const t = ctx.truthy(v);
  return t === null ? def : !!t;
}
