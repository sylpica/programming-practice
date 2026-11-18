import { unknownLabel } from '../../core/presentation.js';
import{refineCondition}from'../../core/conditions.js';
/* 高度モード B7（Python 標準ライブラリ差分）のレジストリ。登録が無い
 * （簡易モード）場合は、以下すべてのフックが素通りし従来挙動と同一になる。 */
import { STDLIB_MODULES, STDLIB_CLASSES, NOT_HANDLED as STDLIB_NOT_HANDLED, makeNative, makeNativeClass, nativeClassDef, isStdlibModule, stdlibExceptionAncestors, getClassAttrOverride, setClassAttrOverride, deleteClassAttrOverride, getModuleAttrOverride, setModuleAttrOverride, deleteModuleAttrOverride } from './stdlib-registry.js';
/* sim.js — Python コード説明エンジン（実行シミュレーション）
   コードを実行せず、字句解析→構文解析→部分評価で「何が起きるか」を日本語で説明する。
   決定的な値はエンジン自身が計算した実値のみ。input()・random・ファイル内容など
   実物依存の値は「実行時に決まる値」として伝播させ、数値を捏造しない。
   対応外の構文は診断として正直に示し、説明を捏造しない。
   ブラウザ（window.PySim）と Node（module.exports）の両方で動く。 */
'use strict';

/* ============ 値モデル ============ */
let unknownSerial=0;const UNK = (desc) => ({ __unk: true, identity:'py-'+(++unknownSerial),desc: desc || '実行時に決まる値' });
const isUnk = (v) => !!v && typeof v === 'object' && v.__unk === true;
// 数値は {__num:true, v:Number, f:boolean(floatか)} で表す（int/float の区別を保つ）
const NUM = (v, f) => ({ __num: true, v, f: !!f });
const isNum = (v) => !!v && typeof v === 'object' && v.__num === true;
const BOOL = (b) => ({ __bool: true, v: !!b });
const isBool = (v) => !!v && typeof v === 'object' && v.__bool === true;
const NONE = { __none: true };
const EXC = (kind, text, argRepr, attrs) => ({ __exc: true, kind, text, argRepr: argRepr || '', ...(attrs ? { excAttrs: attrs } : {}) }); // except ... as e で束縛する例外値（str(e) が分かるときだけ作る）。attrs は B7 の例外属性（msg/doc/pos 等）の保持用
const isNone = (v) => v === NONE;
// リスト {__list:[...]} / タプル {__tuple:[...]} / 辞書 {__dict:Map} / 集合 {__set:[...]}
const LIST = (a) => ({ __list: a || [] });
const isList = (v) => !!v && typeof v === 'object' && Array.isArray(v.__list);
const TUPLE = (a) => ({ __tuple: a || [] });
const isTuple = (v) => !!v && typeof v === 'object' && Array.isArray(v.__tuple);
const DICT = (m) => ({ __dict: m || new Map() });
const isDict = (v) => !!v && typeof v === 'object' && v.__dict instanceof Map;
const SET = (a) => ({ __set: a || [] });
const isSet = (v) => !!v && typeof v === 'object' && Array.isArray(v.__set);
const FUNC = (def, env) => ({ __func: true, def, env });
const isFunc = (v) => !!v && typeof v === 'object' && v.__func === true;
const BUILTIN = (name) => ({ __builtin: name });
const RANGE = (a) => ({ __range: a }); // a = [数値...]（遅延せず実配列で持つ。上限あり）
const TYPEVAL = (name) => ({ __type: name }); // type() の結果

/* ===== B6-Py2（高度・組み込み型）：bytes／bytearray／complex／frozenset／frozendict／slice／memoryview の値モデル =====
   既存のマーカー規約（__num／__set／__dict／__range 等）に倣う。
   bytes     : {__bytes:[0-255,...]}（不変。配列は作った側だけが持ち、共有しない）
   bytearray : {__bytearray:[0-255,...]}（可変。配列そのものを共有し、添字代入・memoryview と連動する）
   complex   : {__complex:{re:Number, im:Number}}
   frozenset : {__set:[...], __frozenSet:true}（set と同じ表現＋凍結フラグ）
   frozendict: {__dict:Map, __frozendict:true}（dict と同じ読み取り経路＋凍結フラグ）
   slice     : {__slice:{start,stop,step}}（各要素はエンジン値か NONE）
   memoryview: {__memview:{buf:{data:[...]}, off, len, readonly, released, obj}}
               buf.data は bytearray の内部配列と共有しうる（書き込みが相互に見える） */
const BYTESV = (a) => ({ __bytes: a || [] });
const isBytes = (v) => !!v && typeof v === 'object' && Array.isArray(v.__bytes);
const BYTEARRAY = (a) => ({ __bytearray: a || [] });
const isBytearray = (v) => !!v && typeof v === 'object' && Array.isArray(v.__bytearray);
const isBytesLike = (v) => isBytes(v) || isBytearray(v);
const bytesOf = (v) => isBytes(v) ? v.__bytes : v.__bytearray;
const CXV = (re, im) => ({ __complex: { re, im } });
const isComplex = (v) => !!v && typeof v === 'object' && !!v.__complex;
const isFrozenSet = (v) => isSet(v) && v.__frozenSet === true;
const FROZENSET = (a) => ({ __set: a || [], __frozenSet: true });
const isFrozenDict = (v) => isDict(v) && v.__frozendict === true;
const FROZENDICT = (m) => { const d = DICT(m); d.__frozendict = true; return d; };
const SLICEV = (start, stop, step) => ({ __slice: { start, stop, step } });
const isSlice = (v) => !!v && typeof v === 'object' && !!v.__slice;
const MEMVIEW = (mv) => ({ __memview: mv });
const isMemview = (v) => !!v && typeof v === 'object' && !!v.__memview;
const mvBytes = (v) => v.__memview.buf.data.slice(v.__memview.off, v.__memview.off + v.__memview.len);
// 数値（int／float／bool）か複素数を、複素数の部品 {re, im} にする。対象外は null
const cxParts = (v) => { if (isComplex(v)) return v.__complex; if (isNum(v)) return { re: v.v, im: 0 }; if (isBool(v)) return { re: v.v ? 1 : 0, im: 0 }; return null; };
// CPython の bytes repr：印刷可能 ASCII はそのまま、それ以外は \xhh。引用符は ' が無ければ '、' があり " が無ければ "
function bytesRepr(a) {
  const hasSq = a.includes(0x27), hasDq = a.includes(0x22);
  const q = hasSq && !hasDq ? '"' : "'";
  let out = 'b' + q;
  for (const b of a) {
    if (b === 0x5c) out += '\\\\';
    else if (b === q.charCodeAt(0)) out += '\\' + q;
    else if (b === 0x0a) out += '\\n';
    else if (b === 0x0d) out += '\\r';
    else if (b === 0x09) out += '\\t';
    else if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
    else out += '\\x' + b.toString(16).padStart(2, '0');
  }
  return out + q;
}
// CPython の複素数 repr の部品（float repr から末尾の .0 を落とす。inf／nan はそのまま）
function cxPart(x) { const s = pyFloatRepr(x); return s.endsWith('.0') ? s.slice(0, -2) : s; }
function cxRepr(v) {
  const { re, im } = v.__complex;
  const imS = (Number.isNaN(im) ? 'nan' : cxPart(im)) + 'j';
  if (re === 0 && !Object.is(re, -0)) return imS;
  const sign = (im < 0 || Object.is(im, -0) || Number.isNaN(im)) ? '' : '+';
  return '(' + cxPart(re) + sign + imS + ')';
}
// str.casefold の差分表：CPython 3.12.3（Unicode 15.0.0）の unicodedata で全コードポイントを走査し、
// casefold が lower と異なる文字だけを収めたもの（生成手順は報告書に記載）。
// JS の String.prototype.toLowerCase は CPython の lower と全コードポイントで一致することを実測済みのため、
// casefold(ch) = 本表[ch] ?? ch.toLowerCase() で CPython の casefold を再現する。
const CASEFOLD_DIFF = {'\u00b5':'\u03bc','\u00df':'ss','\u0149':'\u02bcn','\u017f':'s','\u01f0':'j\u030c','\u0345':'\u03b9','\u0390':'\u03b9\u0308\u0301','\u03b0':'\u03c5\u0308\u0301','\u03c2':'\u03c3','\u03d0':'\u03b2','\u03d1':'\u03b8','\u03d5':'\u03c6','\u03d6':'\u03c0','\u03f0':'\u03ba','\u03f1':'\u03c1','\u03f5':'\u03b5','\u0587':'\u0565\u0582','\u13a0':'\u13a0','\u13a1':'\u13a1','\u13a2':'\u13a2','\u13a3':'\u13a3','\u13a4':'\u13a4','\u13a5':'\u13a5','\u13a6':'\u13a6','\u13a7':'\u13a7','\u13a8':'\u13a8','\u13a9':'\u13a9','\u13aa':'\u13aa','\u13ab':'\u13ab','\u13ac':'\u13ac','\u13ad':'\u13ad','\u13ae':'\u13ae','\u13af':'\u13af','\u13b0':'\u13b0','\u13b1':'\u13b1','\u13b2':'\u13b2','\u13b3':'\u13b3','\u13b4':'\u13b4','\u13b5':'\u13b5','\u13b6':'\u13b6','\u13b7':'\u13b7','\u13b8':'\u13b8','\u13b9':'\u13b9','\u13ba':'\u13ba','\u13bb':'\u13bb','\u13bc':'\u13bc','\u13bd':'\u13bd','\u13be':'\u13be','\u13bf':'\u13bf','\u13c0':'\u13c0','\u13c1':'\u13c1','\u13c2':'\u13c2','\u13c3':'\u13c3','\u13c4':'\u13c4','\u13c5':'\u13c5','\u13c6':'\u13c6','\u13c7':'\u13c7','\u13c8':'\u13c8','\u13c9':'\u13c9','\u13ca':'\u13ca','\u13cb':'\u13cb','\u13cc':'\u13cc','\u13cd':'\u13cd','\u13ce':'\u13ce','\u13cf':'\u13cf','\u13d0':'\u13d0','\u13d1':'\u13d1','\u13d2':'\u13d2','\u13d3':'\u13d3','\u13d4':'\u13d4','\u13d5':'\u13d5','\u13d6':'\u13d6','\u13d7':'\u13d7','\u13d8':'\u13d8','\u13d9':'\u13d9','\u13da':'\u13da','\u13db':'\u13db','\u13dc':'\u13dc','\u13dd':'\u13dd','\u13de':'\u13de','\u13df':'\u13df','\u13e0':'\u13e0','\u13e1':'\u13e1','\u13e2':'\u13e2','\u13e3':'\u13e3','\u13e4':'\u13e4','\u13e5':'\u13e5','\u13e6':'\u13e6','\u13e7':'\u13e7','\u13e8':'\u13e8','\u13e9':'\u13e9','\u13ea':'\u13ea','\u13eb':'\u13eb','\u13ec':'\u13ec','\u13ed':'\u13ed','\u13ee':'\u13ee','\u13ef':'\u13ef','\u13f0':'\u13f0','\u13f1':'\u13f1','\u13f2':'\u13f2','\u13f3':'\u13f3','\u13f4':'\u13f4','\u13f5':'\u13f5','\u13f8':'\u13f0','\u13f9':'\u13f1','\u13fa':'\u13f2','\u13fb':'\u13f3','\u13fc':'\u13f4','\u13fd':'\u13f5','\u1c80':'\u0432','\u1c81':'\u0434','\u1c82':'\u043e','\u1c83':'\u0441','\u1c84':'\u0442','\u1c85':'\u0442','\u1c86':'\u044a','\u1c87':'\u0463','\u1c88':'\ua64b','\u1e96':'h\u0331','\u1e97':'t\u0308','\u1e98':'w\u030a','\u1e99':'y\u030a','\u1e9a':'a\u02be','\u1e9b':'\u1e61','\u1e9e':'ss','\u1f50':'\u03c5\u0313','\u1f52':'\u03c5\u0313\u0300','\u1f54':'\u03c5\u0313\u0301','\u1f56':'\u03c5\u0313\u0342','\u1f80':'\u1f00\u03b9','\u1f81':'\u1f01\u03b9','\u1f82':'\u1f02\u03b9','\u1f83':'\u1f03\u03b9','\u1f84':'\u1f04\u03b9','\u1f85':'\u1f05\u03b9','\u1f86':'\u1f06\u03b9','\u1f87':'\u1f07\u03b9','\u1f88':'\u1f00\u03b9','\u1f89':'\u1f01\u03b9','\u1f8a':'\u1f02\u03b9','\u1f8b':'\u1f03\u03b9','\u1f8c':'\u1f04\u03b9','\u1f8d':'\u1f05\u03b9','\u1f8e':'\u1f06\u03b9','\u1f8f':'\u1f07\u03b9','\u1f90':'\u1f20\u03b9','\u1f91':'\u1f21\u03b9','\u1f92':'\u1f22\u03b9','\u1f93':'\u1f23\u03b9','\u1f94':'\u1f24\u03b9','\u1f95':'\u1f25\u03b9','\u1f96':'\u1f26\u03b9','\u1f97':'\u1f27\u03b9','\u1f98':'\u1f20\u03b9','\u1f99':'\u1f21\u03b9','\u1f9a':'\u1f22\u03b9','\u1f9b':'\u1f23\u03b9','\u1f9c':'\u1f24\u03b9','\u1f9d':'\u1f25\u03b9','\u1f9e':'\u1f26\u03b9','\u1f9f':'\u1f27\u03b9','\u1fa0':'\u1f60\u03b9','\u1fa1':'\u1f61\u03b9','\u1fa2':'\u1f62\u03b9','\u1fa3':'\u1f63\u03b9','\u1fa4':'\u1f64\u03b9','\u1fa5':'\u1f65\u03b9','\u1fa6':'\u1f66\u03b9','\u1fa7':'\u1f67\u03b9','\u1fa8':'\u1f60\u03b9','\u1fa9':'\u1f61\u03b9','\u1faa':'\u1f62\u03b9','\u1fab':'\u1f63\u03b9','\u1fac':'\u1f64\u03b9','\u1fad':'\u1f65\u03b9','\u1fae':'\u1f66\u03b9','\u1faf':'\u1f67\u03b9','\u1fb2':'\u1f70\u03b9','\u1fb3':'\u03b1\u03b9','\u1fb4':'\u03ac\u03b9','\u1fb6':'\u03b1\u0342','\u1fb7':'\u03b1\u0342\u03b9','\u1fbc':'\u03b1\u03b9','\u1fbe':'\u03b9','\u1fc2':'\u1f74\u03b9','\u1fc3':'\u03b7\u03b9','\u1fc4':'\u03ae\u03b9','\u1fc6':'\u03b7\u0342','\u1fc7':'\u03b7\u0342\u03b9','\u1fcc':'\u03b7\u03b9','\u1fd2':'\u03b9\u0308\u0300','\u1fd3':'\u03b9\u0308\u0301','\u1fd6':'\u03b9\u0342','\u1fd7':'\u03b9\u0308\u0342','\u1fe2':'\u03c5\u0308\u0300','\u1fe3':'\u03c5\u0308\u0301','\u1fe4':'\u03c1\u0313','\u1fe6':'\u03c5\u0342','\u1fe7':'\u03c5\u0308\u0342','\u1ff2':'\u1f7c\u03b9','\u1ff3':'\u03c9\u03b9','\u1ff4':'\u03ce\u03b9','\u1ff6':'\u03c9\u0342','\u1ff7':'\u03c9\u0342\u03b9','\u1ffc':'\u03c9\u03b9','\uab70':'\u13a0','\uab71':'\u13a1','\uab72':'\u13a2','\uab73':'\u13a3','\uab74':'\u13a4','\uab75':'\u13a5','\uab76':'\u13a6','\uab77':'\u13a7','\uab78':'\u13a8','\uab79':'\u13a9','\uab7a':'\u13aa','\uab7b':'\u13ab','\uab7c':'\u13ac','\uab7d':'\u13ad','\uab7e':'\u13ae','\uab7f':'\u13af','\uab80':'\u13b0','\uab81':'\u13b1','\uab82':'\u13b2','\uab83':'\u13b3','\uab84':'\u13b4','\uab85':'\u13b5','\uab86':'\u13b6','\uab87':'\u13b7','\uab88':'\u13b8','\uab89':'\u13b9','\uab8a':'\u13ba','\uab8b':'\u13bb','\uab8c':'\u13bc','\uab8d':'\u13bd','\uab8e':'\u13be','\uab8f':'\u13bf','\uab90':'\u13c0','\uab91':'\u13c1','\uab92':'\u13c2','\uab93':'\u13c3','\uab94':'\u13c4','\uab95':'\u13c5','\uab96':'\u13c6','\uab97':'\u13c7','\uab98':'\u13c8','\uab99':'\u13c9','\uab9a':'\u13ca','\uab9b':'\u13cb','\uab9c':'\u13cc','\uab9d':'\u13cd','\uab9e':'\u13ce','\uab9f':'\u13cf','\uaba0':'\u13d0','\uaba1':'\u13d1','\uaba2':'\u13d2','\uaba3':'\u13d3','\uaba4':'\u13d4','\uaba5':'\u13d5','\uaba6':'\u13d6','\uaba7':'\u13d7','\uaba8':'\u13d8','\uaba9':'\u13d9','\uabaa':'\u13da','\uabab':'\u13db','\uabac':'\u13dc','\uabad':'\u13dd','\uabae':'\u13de','\uabaf':'\u13df','\uabb0':'\u13e0','\uabb1':'\u13e1','\uabb2':'\u13e2','\uabb3':'\u13e3','\uabb4':'\u13e4','\uabb5':'\u13e5','\uabb6':'\u13e6','\uabb7':'\u13e7','\uabb8':'\u13e8','\uabb9':'\u13e9','\uabba':'\u13ea','\uabbb':'\u13eb','\uabbc':'\u13ec','\uabbd':'\u13ed','\uabbe':'\u13ee','\uabbf':'\u13ef','\ufb00':'ff','\ufb01':'fi','\ufb02':'fl','\ufb03':'ffi','\ufb04':'ffl','\ufb05':'st','\ufb06':'st','\ufb13':'\u0574\u0576','\ufb14':'\u0574\u0565','\ufb15':'\u0574\u056b','\ufb16':'\u057e\u0576','\ufb17':'\u0574\u056d'};
function pyCasefold(s) { let out = ''; for (const ch of s) out += Object.hasOwn(CASEFOLD_DIFF, ch) ? CASEFOLD_DIFF[ch] : ch.toLowerCase(); return out; }
// zip / enumerate / map / filter / reversed の結果（一度読み切ると空になる。表示はアドレスを含むため不明扱い）
const ITER = (a, kind) => ({ __iter: a, kind, used: false, pos: 0 });
const EXH = Symbol('exhausted'); // zip/map の歩調消費で「取り尽くした」を表す目印
const isIter = (v) => !!v && typeof v === 'object' && Array.isArray(v.__iter);
const VIEW = (d, which) => ({ __view: d, which });
const isView = (v) => !!v && typeof v === 'object' && v.__view !== undefined;
function viewItems(v) { const out = []; for (const e of v.__view.__dict.values()) out.push(v.which === 'keys' ? e.k : v.which === 'values' ? e.v : TUPLE([e.k, e.v])); return out; }
// 関数内で代入される名前の「代入前」の状態（読むと UnboundLocalError）
const UNBOUND = { __unbound: true };
const SAFE = (n) => Number.isSafeInteger(n);
const TYPE_BUILTINS = ['int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set', 'range', 'type', 'object', 'frozenset', 'bytes', 'bytearray', 'complex', 'slice', 'memoryview', 'frozendict'];
// 型ごとの属性名（CPython 3.12 の dir() から。存在しない名前は AttributeError）
const TYPE_ATTRS = {
  str: 'capitalize casefold center count encode endswith expandtabs find format format_map index isalnum isalpha isascii isdecimal isdigit isidentifier islower isnumeric isprintable isspace istitle isupper join ljust lower lstrip maketrans partition removeprefix removesuffix replace rfind rindex rjust rpartition rsplit rstrip split splitlines startswith strip swapcase title translate upper zfill',
  list: 'append clear copy count extend index insert pop remove reverse sort',
  dict: 'clear copy fromkeys get items keys pop popitem setdefault update values',
  tuple: 'count index',
  set: 'add clear copy difference difference_update discard intersection intersection_update isdisjoint issubset issuperset pop remove symmetric_difference symmetric_difference_update union update',
  int: 'as_integer_ratio bit_count bit_length conjugate denominator from_bytes imag is_integer numerator real to_bytes',
  float: 'as_integer_ratio conjugate fromhex hex imag is_integer real',
  bool: 'as_integer_ratio bit_count bit_length conjugate denominator from_bytes imag is_integer numerator real to_bytes',
  NoneType: ''
};
for (const k of Object.keys(TYPE_ATTRS)) TYPE_ATTRS[k] = new Set(TYPE_ATTRS[k].split(' ').filter(Boolean));
TYPE_ATTRS.bytes = new Set('capitalize center count decode endswith expandtabs find fromhex hex index isalnum isalpha isascii isdigit islower isspace istitle isupper join ljust lower lstrip maketrans partition removeprefix removesuffix replace rfind rindex rjust rpartition rsplit rstrip split splitlines startswith strip swapcase title translate upper zfill'.split(' '));
TYPE_ATTRS.bytearray = new Set('append capitalize center clear copy count decode endswith expandtabs extend find fromhex hex index insert isalnum isalpha isascii isdigit islower isspace istitle isupper join ljust lower lstrip maketrans partition pop removeprefix remove removesuffix replace resize reverse rfind rindex rjust rpartition rsplit rstrip split splitlines startswith strip swapcase take_bytes title translate upper zfill'.split(' '));
TYPE_ATTRS.frozenset = new Set('copy difference intersection isdisjoint issubset issuperset symmetric_difference union'.split(' '));
TYPE_ATTRS.complex = new Set('conjugate from_number imag real'.split(' '));
TYPE_ATTRS.slice = new Set('indices start step stop'.split(' '));
TYPE_ATTRS.memoryview = new Set('c_contiguous cast contiguous count f_contiguous format hex index itemsize nbytes ndim obj readonly release shape strides suboffsets tobytes tolist toreadonly'.split(' '));
TYPE_ATTRS.frozendict = new Set('copy fromkeys get items keys values'.split(' '));
const MATH_CONST = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI, inf: Infinity, nan: NaN };
// math モジュールの公開関数名（CPython 3.12 の math モジュール）。
// from-import／import * で取り込んだ関数は、属性形（math.sqrt 等）と
// 同じ経路（callMethod の math 専用処理 → mathCall）へ束縛する。
// mathCall が確定計算するのは sqrt／fabs／floor／ceil（log 系は定義域
// エラーの判定のみ）で、それ以外は属性形と同じく未確定値になる。
const MATH_FUNCS = 'acos acosh asin asinh atan atan2 atanh cbrt ceil comb copysign cos cosh degrees dist erf erfc exp exp2 expm1 fabs factorial floor fmod frexp fsum gamma gcd hypot isclose isfinite isinf isnan isqrt lcm ldexp lgamma log log10 log1p log2 modf nextafter perm pow prod radians remainder sin sinh sqrt sumprod tan tanh trunc ulp'.split(' ');
// 例外クラスの親子関係（R25-N1 で全名収載に是正）。
// 一次情報：docs.python.org 3.12「Built-in Exceptions」の例外階層（Exception hierarchy）
// の全名と、実 CPython 3.12.3 の各クラスの __mro__（全69名を機械照合済み）。
// 階層図の67名に、OSError の別名（同一クラス）である IOError／EnvironmentError を
// 加えた69名を収載する。ExceptionGroup だけは BaseExceptionGroup と Exception の
// 両方を親に持つ（多重継承）ため、親を配列で表す。
// isinstance の例外照合にも使う（RA-16 の開示とは別に、照合自体は階層どおりに行う）。
const EXC_PARENTS = {
  BaseException: null,
  BaseExceptionGroup: 'BaseException',
  GeneratorExit: 'BaseException',
  KeyboardInterrupt: 'BaseException',
  SystemExit: 'BaseException',
  Exception: 'BaseException',
  ArithmeticError: 'Exception',
  FloatingPointError: 'ArithmeticError',
  OverflowError: 'ArithmeticError',
  ZeroDivisionError: 'ArithmeticError',
  AssertionError: 'Exception',
  AttributeError: 'Exception',
  BufferError: 'Exception',
  EOFError: 'Exception',
  ExceptionGroup: ['BaseExceptionGroup', 'Exception'],
  ImportError: 'Exception',
  ModuleNotFoundError: 'ImportError',
  ImportCycleError: 'ImportError', // B6（Python班1）：docs.python.org/3（3.15）exceptions.html の階層記載で追加
  PythonFinalizationError: 'RuntimeError', // B6（Python班1）：同上（RuntimeError のサブクラス）
  LookupError: 'Exception',
  IndexError: 'LookupError',
  KeyError: 'LookupError',
  MemoryError: 'Exception',
  NameError: 'Exception',
  UnboundLocalError: 'NameError',
  OSError: 'Exception',
  BlockingIOError: 'OSError',
  ChildProcessError: 'OSError',
  ConnectionError: 'OSError',
  BrokenPipeError: 'ConnectionError',
  ConnectionAbortedError: 'ConnectionError',
  ConnectionRefusedError: 'ConnectionError',
  ConnectionResetError: 'ConnectionError',
  FileExistsError: 'OSError',
  FileNotFoundError: 'OSError',
  InterruptedError: 'OSError',
  IsADirectoryError: 'OSError',
  NotADirectoryError: 'OSError',
  PermissionError: 'OSError',
  ProcessLookupError: 'OSError',
  TimeoutError: 'OSError',
  ReferenceError: 'Exception',
  RuntimeError: 'Exception',
  NotImplementedError: 'RuntimeError',
  RecursionError: 'RuntimeError',
  StopAsyncIteration: 'Exception',
  StopIteration: 'Exception',
  SyntaxError: 'Exception',
  IndentationError: 'SyntaxError',
  TabError: 'IndentationError',
  SystemError: 'Exception',
  TypeError: 'Exception',
  ValueError: 'Exception',
  UnicodeError: 'ValueError',
  UnicodeDecodeError: 'UnicodeError',
  UnicodeEncodeError: 'UnicodeError',
  UnicodeTranslateError: 'UnicodeError',
  Warning: 'Exception',
  BytesWarning: 'Warning',
  DeprecationWarning: 'Warning',
  EncodingWarning: 'Warning',
  FutureWarning: 'Warning',
  ImportWarning: 'Warning',
  PendingDeprecationWarning: 'Warning',
  ResourceWarning: 'Warning',
  RuntimeWarning: 'Warning',
  SyntaxWarning: 'Warning',
  UnicodeWarning: 'Warning',
  UserWarning: 'Warning',
  IOError: 'OSError',
  EnvironmentError: 'OSError',
};
const EXC_NAMES = new Set(Object.keys(EXC_PARENTS));
// IOError／EnvironmentError は OSError と同一クラス（別名）。照合では同一視する。
const EXC_ALIAS = { IOError: 'OSError', EnvironmentError: 'OSError' };
const excCanon = (name) => EXC_ALIAS[name] || name;
// R24-N7／R25-N1：except の照合は例外階層どおりに行う。発生した例外 kind が、
// ハンドラに書かれたクラス自身かその子孫（親を辿って一致）なら捕捉する。
// BaseException 直下の KeyboardInterrupt／SystemExit／GeneratorExit は Exception の
// 子孫ではないため、except Exception では捕捉されない（docs.python.org の例外階層）。
// ExceptionGroup の多重継承と別名の同一視にも対応するため、親はグラフとして辿る。
function excMatches(kind, handlerType) {
  const target = excCanon(handlerType);
  const seen = new Set();
  const stack = [kind];
  while (stack.length) {
    const k = stack.pop();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (excCanon(k) === target) return true;
    const p = EXC_PARENTS[k];
    if (Array.isArray(p)) stack.push(...p);
    else if (p) stack.push(p);
  }
  return false;
}
// 型そのものを表す値か（int | str のような合併型や isinstance の第2引数の判定に使う）
const isClassValue = (v) => !!v && typeof v === 'object' && (!!v.__union || !!v.__type || !!v.__class || !!v.__ncls || (!!v.__builtin && (TYPE_BUILTINS.includes(v.__builtin) || EXC_NAMES.has(v.__builtin))));
const BIG = () => ({ __unk: true, desc: 'とても大きな整数・この説明では正確に計算しません' });
const ELLIPSIS = { __ellipsis: true };
const isEllipsis = (v) => v === ELLIPSIS;
// R27-N20：組み込み定数 NotImplemented の値（シングルトン）。Ellipsis と
// 同じく組み込み名前空間に常駐する定数で、型名は NotImplementedType。
const NOTIMPLEMENTED = { __notimplemented: true };
const isNotImplemented = (v) => v === NOTIMPLEMENTED;
// R27-N20：組み込み定数3名（docs.python.org 3.12「組み込み定数」）。
// Ellipsis／NotImplemented はシングルトンの値、__debug__ は通常実行では
// True（-O 最適化時のみ False。この説明は通常実行をモデル化するため
// 常に True）。いずれも従来は名前空間に無く、虚偽の NameError になっていた。
// ユーザーが代入した場合は通常の変数が優先される（Ellipsis／
// NotImplemented への代入は実 CPython でも合法。__debug__ への代入は
// checkTarget で SyntaxError として別途名指す）。
const BUILTIN_CONSTANTS = { Ellipsis: ELLIPSIS, NotImplemented: NOTIMPLEMENTED, __debug__: BOOL(true) };
// 束縛メソッド参照（xs.append を変数に入れた形）。呼ぶと本物のメソッドとして動く
const METHODREF = (obj, name) => ({ __method: true, obj, name });
const isMethodRef = (v) => !!v && typeof v === 'object' && v.__method === true;
// B6-Py3（特殊メソッド・クラス機構班）：classmethod／staticmethod／property／
// super の値表現。クラス本体に置かれ、属性アクセス時に束縛・発火する。
const CMVAL = (fn) => ({ __cm: true, fn }); // classmethod ラッパ
const SMVAL = (fn) => ({ __sm: true, fn }); // staticmethod ラッパ
const isCM = (v) => !!v && typeof v === 'object' && v.__cm === true;
const isSM = (v) => !!v && typeof v === 'object' && v.__sm === true;
const PROPVAL = (fget, fset, fdel) => ({ __prop: true, fget: fget || null, fset: fset || null, fdel: fdel || null });
const isProp = (v) => !!v && typeof v === 'object' && v.__prop === true;
const SUPERVAL = (cls, obj) => ({ __super: true, cls, obj }); // obj: インスタンス／クラス／null（未束縛）
const isSuper = (v) => !!v && typeof v === 'object' && v.__super === true;
// property.getter／setter／deleter の束縛ラッパ（呼ぶと新しい property を返す）
const PROPMOD = (prop, kind) => ({ __propmod: true, prop, kind });
// type.mro の束縛ラッパ（呼ぶと MRO のリストを返す）
const MROFN = (cls) => ({ __mrofn: true, cls });
// object.__new__ 相当（super().__new__(cls) 用：新しいインスタンスを作る）
const OBJNEW = (cls) => ({ __objnew: true, cls });
// B6-Py3：object.__getattribute__／object.__setattr__ の組み込み相当マーカー
const OBJGA = { __objga: true };
const OBJSA = { __objsa: true };
// 追跡できない書き換えを受けた値は、その場で「不明」に変える（別名からも不明に見える）
function poison(v, desc) {
  if (!v || typeof v !== 'object' || isUnk(v) || isFunc(v)) return;
  for (const k of Object.keys(v)) delete v[k];
  v.__unk = true; v.desc = desc || '中身が実行時に決まる値';
}
const isMutableVal = (v) => isList(v) || isDict(v) || isSet(v) || isTuple(v) || (v && (!!v.__range || !!v.__instance)) || isIter(v);

/* ネイティブ値（標準ライブラリのクラスインスタンス）の repr／str／eq 等を
 * 静的に解決するための最小 ctx。エンジン内部の表示系からのみ使う。
 * 本格的な ctx（エラー送出・コールバック呼び出し付き）は Interp 側で作る。 */
function nativeStaticCtx() {
  return {
    V: { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, RANGE, ITER, UNK },
    isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, isFunc,
    isNative: (v) => !!v && !!v.__native,
    isNativeClass: (v) => !!v && !!v.__ncls,
    num: (v) => isNum(v) ? v.v : isBool(v) ? (v.v ? 1 : 0) : null,
    str: (v) => typeof v === 'string' ? v : null,
    listOf: (v) => isList(v) ? v.__list : isTuple(v) ? v.__tuple : (v && v.__range) ? v.__range : null,
    repr: (v) => reprVal(v), strOf: (v) => strVal(v), typeName: (v) => typeName(v),
    truthy: (v) => truthy(v),
    eq: (a, b) => eqVal(a, b),
    err: (kind, msg) => { throw new Error(kind + ': ' + msg); },
    diag: () => {}, step: () => {},
    unk: (desc) => UNK(desc),
    call: () => UNK(),
    iterable: () => null,
    binop: () => UNK(),
    compare: () => UNK(),
    native: (q, data) => makeNative(q, data),
    ncls: (q) => makeNativeClass(q),
    NOT_HANDLED: STDLIB_NOT_HANDLED,
  };
}

function typeName(v) {
  if (isUnk(v)) return '不明';
  if (isNum(v)) return v.f ? 'float' : 'int';
  if (isBool(v)) return 'bool';
  if (isNone(v)) return 'NoneType';
  if (typeof v === 'string') return 'str';
  if (isList(v)) return 'list';
  if (isTuple(v)) return 'tuple';
  if (isBytes(v)) return 'bytes';
  if (isBytearray(v)) return 'bytearray';
  if (isComplex(v)) return 'complex';
  if (isFrozenDict(v)) return 'frozendict';
  if (isDict(v)) return 'dict';
  if (isSet(v)) return v.__frozenSet ? 'frozenset' : 'set';
  if (isSlice(v)) return 'slice';
  if (isMemview(v)) return 'memoryview';
  if (v && v.__union) return 'types.UnionType';
  if (v && v.__builtin) return TYPE_BUILTINS.includes(v.__builtin) ? 'type' : 'builtin_function_or_method';
  if (isFunc(v)) return 'function';
  if (v && v.__range) return 'range';
  if (v && v.__type) return 'type';
  if (isIter(v)) return v.kind;
  if (isView(v)) return 'dict_' + v.which;
  if (isMethodRef(v)) return 'builtin_function_or_method';
  if (isEllipsis(v)) return 'ellipsis';
  if (isNotImplemented(v)) return 'NotImplementedType';
  if (isCM(v)) return 'classmethod';
  if (isSM(v)) return 'staticmethod';
  if (isProp(v)) return 'property';
  if (isSuper(v)) return 'super';
  if (v && v.__class) return 'type';
  if (v && v.__instance) return v.cls.cname;
  if (v && v.__native) { const d = nativeClassDef(v.__native); return d && d.typeName ? d.typeName : v.__native.split('.').pop(); }
  if (v && v.__ncls) return 'type';
  if (v && v.__exc) return v.kind;
  return '不明';
}
function truthy(v) {
  if (isUnk(v)) return null; // 判定できない
  if (isBool(v)) return v.v;
  if (isNone(v)) return false;
  if (isNum(v)) return v.v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (isList(v)) return v.__list.length > 0;
  if (isTuple(v)) return v.__tuple.length > 0;
  if (isDict(v)) return v.__dict.size > 0;
  if (isSet(v)) return v.__set.length > 0;
  // R28-N16：__len__ を持つ残りの型も長さで判定する（docs.python.org 3.12
  // 「真値判定」：長さ0は偽）。range は要素数の配列で保持し、辞書ビューは
  // 元の辞書の要素数に追随する（ビューはライブ）。従来はこの2型が型表から
  // 漏れて末尾の return true に落ち、空でも常に True になっていた。
  // イテレータ（__iter 系）は __len__ を持たないため従来どおり常に True。
  if (v && v.__range) return v.__range.length > 0;
  if (isView(v)) return v.__view.__dict.size > 0;
  if (v && v.__native) { const d = nativeClassDef(v.__native); if (d && d.truthy) { const t = d.truthy(nativeStaticCtx(), v); if (t !== null && t !== undefined) return t; } }
  if (isBytesLike(v)) return bytesOf(v).length > 0;
  if (isComplex(v)) return v.__complex.re !== 0 || v.__complex.im !== 0;
  if (isMemview(v)) return v.__memview.len > 0;
  return true;
}
function pyFloatRepr(x) {
  if (Number.isNaN(x)) return 'nan';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  const neg = x < 0; const e1 = Math.abs(x).toExponential(); // 最短で往復できる桁（JS と Python は同じ桁を選ぶ）
  const [mant, expS] = e1.split('e'); const exp = parseInt(expS, 10); const digits = mant.replace('.', '');
  let out;
  if (exp >= -4 && exp < 16) {
    if (exp >= 0) { const ip = digits.slice(0, exp + 1).padEnd(exp + 1, '0'); const fp = digits.slice(exp + 1); out = ip + '.' + (fp || '0'); }
    else out = '0.' + '0'.repeat(-exp - 1) + digits;
  } else out = digits[0] + (digits.length > 1 ? '.' + digits.slice(1) : '') + 'e' + (exp < 0 ? '-' : '+') + String(Math.abs(exp)).padStart(2, '0');
  return (neg ? '-' : '') + out;
}
function fmtNum(n) {
  if (!isNum(n)) return String(n);
  if (!n.f) return String(Math.trunc(n.v));
  return pyFloatRepr(n.v);
}
// double の正確な10進展開：{digits, scale}（値 = digits × 10^scale、digits は末尾ゼロを除いた整数文字列）
function exactDecimal(ax) {
  if (ax === 0) return { digits: '0', scale: 0 };
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, ax);
  const bits = buf.getBigUint64(0);
  const expBits = Number((bits >> 52n) & 0x7ffn);
  let mant = bits & ((1n << 52n) - 1n);
  let e2;
  if (expBits === 0) e2 = -1074; else { mant |= (1n << 52n); e2 = expBits - 1075; }
  let digits, scale;
  if (e2 >= 0) { digits = (mant << BigInt(e2)).toString(); scale = 0; }
  else { digits = (mant * (5n ** BigInt(-e2))).toString(); scale = e2; }
  while (digits.length > 1 && digits.endsWith('0')) { digits = digits.slice(0, -1); scale++; }
  return { digits, scale };
}
function incDigits(s) { const a = s.split(''); let i = a.length - 1; while (i >= 0 && a[i] === '9') { a[i] = '0'; i--; } if (i < 0) return '1' + a.join(''); a[i] = String(Number(a[i]) + 1); return a.join(''); }
// 桁文字列 head と捨てる部分 rest から、偶数丸めで切り上げるか決める
function roundUpHalfEven(head, rest) {
  if (!rest) return false;
  if (rest[0] > '5') return true;
  if (rest[0] < '5') return false;
  if (/[1-9]/.test(rest.slice(1))) return true;
  return (head.charCodeAt(head.length - 1) - 48) % 2 === 1;
}
// |x| の正確な10進値を、10^(-p) の位（p は負）へ「偶数丸め」した結果の
// 桁文字列（符号なし・末尾の 0 は位取り分を含む）を返す。round の負の ndigits 用。
function decRoundPlace(ax, p) {
  const { digits, scale } = exactDecimal(ax);
  const total = digits.length + scale + p; // round(|x| × 10^p) の桁数（捨てる位置）
  let kept;
  if (total >= digits.length) kept = digits + '0'.repeat(total - digits.length);
  else if (total <= 0) kept = total === 0 && roundUpHalfEven('0', digits) ? '1' : '0';
  else { const head = digits.slice(0, total); kept = roundUpHalfEven(head, digits.slice(total)) ? incDigits(head) : head; }
  return kept === '0' ? '0' : kept + '0'.repeat(-p);
}
// x の正確な10進値を、小数 p 桁に「偶数丸め」する（Python の round / 書式 f と同じ規則）。文字列を返す
function decFixed(x, p) {
  const neg = x < 0 || Object.is(x, -0); const ax = Math.abs(x);
  if (!Number.isFinite(ax)) return String(x);
  const { digits, scale } = exactDecimal(ax);
  const total = digits.length + scale + p; // round(|x| × 10^p) の桁数（捨てる位置）
  let kept;
  if (total >= digits.length) kept = digits + '0'.repeat(total - digits.length);
  else if (total <= 0) kept = total === 0 && roundUpHalfEven('0', digits) ? '1' : '0';
  else { const head = digits.slice(0, total); kept = roundUpHalfEven(head, digits.slice(total)) ? incDigits(head) : head; }
  let body;
  if (p === 0) body = kept;
  else { const s = kept.padStart(p + 1, '0'); body = s.slice(0, s.length - p) + '.' + s.slice(s.length - p); }
  const sign = neg && (/[1-9]/.test(body) || ax > 0 || Object.is(x, -0)) ? '-' : '';
  return sign + body;
}
/* ============ int()/float() の文字列解釈（CPython の規則） ============ */
// Unicode の10進数字（Nd）を ASCII に直す。各ブロックの「0」のコードポイント表を使う
const ND_ZEROS = [0x30, 0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10];
function normDigits(s) {
  if (!/[^\x00-\x7F]/.test(s)) return s;
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 128) { out += ch; continue; }
    let rep = null;
    for (const z of ND_ZEROS) { const d = cp - z; if (d >= 0 && d <= 9) { rep = String(d); break; } }
    out += rep === null ? ch : rep;
  }
  return out;
}
// アンダースコアは「数字どうしの間」だけ（int では基数接頭辞の直後の1個も可）。CPython の規則
function usOkInt(body, afterPrefix) {
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '_') continue;
    const prevOk = (i > 0 && /[0-9A-Za-z]/.test(body[i - 1])) || (afterPrefix && i === 0);
    const nextOk = i + 1 < body.length && /[0-9A-Za-z]/.test(body[i + 1]);
    if (!prevOk || !nextOk) return false;
  }
  return true;
}
function usOkFloat(t) {
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== '_') continue;
    if (!/[0-9]/.test(t[i - 1] || '') || !/[0-9]/.test(t[i + 1] || '')) return false;
  }
  return true;
}
// 文字列→整数（CPython 規則）。{n} か {big:true}（安全な範囲外）か {err:true}（ValueError）を返す
function pyIntFromStr(v, baseArg) {
  let t = normDigits(v.trim());
  let neg = false;
  if (/^[+-]/.test(t)) { neg = t[0] === '-'; t = t.slice(1); }
  let base = baseArg, pre = false;
  const pm = /^0([xXoObB])/.exec(t);
  if (pm) { const pb = { x: 16, o: 8, b: 2 }[pm[1].toLowerCase()]; if (base === 0 || base === pb) { base = pb; t = t.slice(2); pre = true; } }
  if (base === 0) base = 10;
  if (!t || !usOkInt(t, pre)) return { err: true };
  const body = t.replace(/_/g, '');
  if (!body) return { err: true };
  if (baseArg === 0 && !pre && body.length > 1 && body[0] === '0') return { err: true }; // int("010", 0) は ValueError
  if (base === 10 && body.length > 4300) return { err: true }; // CPython の桁数制限
  if (body.length > 6000) return { big: true };
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  let n = 0n; const B = BigInt(base);
  for (const ch of body) { const d = digits.indexOf(ch.toLowerCase()); if (d < 0 || d >= base) return { err: true }; n = n * B + BigInt(d); }
  if (neg) n = -n;
  if (n <= 9007199254740991n && n >= -9007199254740991n) return { n: Number(n) };
  return { big: true };
}
// pow(base, exp, mod) の BigInt 実装（負の指数はモジュラ逆数、結果の符号は mod に従う）
function modInvBig(a, m) { // m は正。gcd が 1 でなければ null
  let r0 = ((a % m) + m) % m, r1 = m, s0 = 1n, s1 = 0n;
  while (r1 !== 0n) { const q = r0 / r1; const r2 = r0 - q * r1; r0 = r1; r1 = r2; const s2 = s0 - q * s1; s0 = s1; s1 = s2; }
  if (r0 !== 1n) return null;
  return ((s0 % m) + m) % m;
}
function modPowBig(b, e, m) { // m != 0。{v:BigInt} か {err:'inv'}（逆数が無い）
  const negMod = m < 0n; const am = negMod ? -m : m;
  let base = ((b % am) + am) % am;
  let exp = e;
  if (exp < 0n) { const inv = modInvBig(base, am); if (inv === null) return { err: 'inv' }; base = inv; exp = -exp; }
  let r = am === 1n ? 0n : 1n;
  let bb = base, ee = exp;
  while (ee > 0n) { if (ee & 1n) r = (r * bb) % am; bb = (bb * bb) % am; ee >>= 1n; }
  if (negMod && r !== 0n) r -= am;
  return { v: r };
}
// 指数表記（書式 e）用：|x| を有効桁 p+1 桁に偶数丸めした {body, exp}
function decExp(x, p) {
  const ax = Math.abs(x);
  if (ax === 0) return { body: '0' + (p ? '.' + '0'.repeat(p) : ''), exp: 0 };
  const { digits, scale } = exactDecimal(ax);
  let exp = digits.length - 1 + scale;
  const need = p + 1;
  let kept;
  if (digits.length <= need) kept = digits.padEnd(need, '0');
  else { const head = digits.slice(0, need); kept = roundUpHalfEven(head, digits.slice(need)) ? incDigits(head) : head; if (kept.length > need) { kept = kept.slice(0, need); exp++; } }
  return { body: kept[0] + (p ? '.' + kept.slice(1) : ''), exp };
}
function reprVal(v, depth) {
  depth = depth || 0;
  if (isUnk(v)) return unknownLabel({kind:'unknown', source:v.desc});
  if (isNum(v)) return fmtNum(v);
  if (isBool(v)) return v.v ? 'True' : 'False';
  if (isNone(v)) return 'None';
  if (v && v.__native) { const d = nativeClassDef(v.__native); if (d && d.repr) return d.repr(nativeStaticCtx(), v); return '（' + typeName(v) + ' オブジェクト）'; }
  if (v && v.__ncls) return "<class '" + v.__ncls + "'>";
  if (typeof v === 'string') return pyStrRepr(v);
  if (depth > 3) return '…';
  if (isList(v)) return '[' + v.__list.map(x => reprVal(x, depth + 1)).join(', ') + ']';
  if (isTuple(v)) return v.__tuple.length === 1 ? '(' + reprVal(v.__tuple[0], depth + 1) + ',)' : '(' + v.__tuple.map(x => reprVal(x, depth + 1)).join(', ') + ')';
  if (isDict(v)) { const ps = []; for (const e of v.__dict.values()) ps.push(reprVal(e.k, depth + 1) + ': ' + reprVal(e.v, depth + 1)); return isFrozenDict(v) ? 'frozendict({' + ps.join(', ') + '})' : '{' + ps.join(', ') + '}'; }
  if (isSet(v)) { if (isFrozenSet(v)) { if (!v.__set.length) return 'frozenset()'; const ordF = setOrder(v); const innerF = (ordF || v.__set).map(x => reprVal(x, depth + 1)).join(', '); return 'frozenset({' + innerF + '})'; } if (!v.__set.length) return 'set()'; const ord = setOrder(v); if (ord) return '{' + ord.map(x => reprVal(x, depth + 1)).join(', ') + '}'; const inner = v.__set.map(x => reprVal(x, depth + 1)).join(', '); return /[（）]/.test(inner) ? '（集合・表示の並び順は実行時に決まります）' : '（集合 {' + inner + '}・表示の並び順は実行時に決まります）'; }
  if (isBytes(v)) return bytesRepr(v.__bytes);
  if (isBytearray(v)) return 'bytearray(' + bytesRepr(v.__bytearray) + ')';
  if (isComplex(v)) return cxRepr(v);
  if (isFrozenSet(v)) { if (!v.__set.length) return 'frozenset()'; const ord2 = setOrder(v); const inner2 = (ord2 || v.__set).map(x => reprVal(x, depth + 1)).join(', '); return 'frozenset({' + inner2 + '})'; }
  if (isFrozenDict(v)) { const ps2 = []; for (const e of v.__dict.values()) ps2.push(reprVal(e.k, depth + 1) + ': ' + reprVal(e.v, depth + 1)); return 'frozendict({' + ps2.join(', ') + '})'; }
  if (isSlice(v)) return 'slice(' + reprVal(v.__slice.start) + ', ' + reprVal(v.__slice.stop) + ', ' + reprVal(v.__slice.step) + ')';
  if (isMemview(v)) return '（memoryview オブジェクト）';
  if (v && v.__union) return v.__union.map(x => (x && (x.__type || x.__builtin)) || (x && x.__class ? x.cname : 'type')).join(' | ');
  if (v && v.__type) return "<class '" + v.__type + "'>";
  if (v && v.__class) return "<class '" + v.cname + "'>";
  if (v && v.__sentinel) return v.srepr; // B6（Python班1）：sentinel 値の repr は生成時に決めた表示（既定は名前）
  if (v && v.__instance) return '（モデルの ' + v.cls.cname + ' インスタンス）';
  if (v && v.__exc) return v.kind + '(' + v.argRepr + ')';
  if (isEllipsis(v)) return 'Ellipsis';
  if (isNotImplemented(v)) return 'NotImplemented';
  if (isMethodRef(v)) return '（組み込みメソッド ' + v.name + '）';
  if (isCM(v)) return '（classmethod オブジェクト）';
  if (isSM(v)) return '（staticmethod オブジェクト）';
  if (isProp(v)) return '（property オブジェクト）';
  if (isSuper(v)) return '（super オブジェクト）';
  if (isFunc(v)) return '関数 ' + v.def.name;
  if (v && v.__builtin) return '組み込み関数 ' + v.__builtin;
  if (v && v.__range) { const r = v.rng || [0, v.__range.length, 1]; return 'range(' + r[0] + ', ' + r[1] + (r[2] !== 1 ? ', ' + r[2] : '') + ')'; }
  if (isIter(v)) return '（' + v.kind + ' オブジェクト）';
  if (isView(v)) return 'dict_' + v.which + '(' + reprVal(LIST(viewItems(v)), depth) + ')';
  return '（実行時に決まる値）'; // 表示できない内部の値は出さない
}
// 集合の表示順を CPython と同じに決められるときだけ、その順を返す（それ以外は null）。
// 0 以上の小さな整数だけで、すべてハッシュ表の大きさ未満なら、CPython の表は昇順に並ぶ。
// 文字列などはハッシュがプロセスごとに変わるため、順序は決められない。
function setOrder(v) {
  const a = v.__set; if (a.length < 2) return a.slice();
  const nums = a.map(x => isBool(x) ? (x.v ? 1 : 0) : (isNum(x) && Number.isInteger(x.v) && x.v >= 0 ? x.v : -1));
  if (nums.some(x => x < 0)) return null;
  let size = 8, fill = 0;
  for (let used = 1; used <= a.length; used++) { fill = used; if (fill * 5 >= (size - 1) * 3) { const minused = used > 50000 ? used * 2 : used * 4; size = 8; while (size <= minused) size *= 2; } }
  if (nums.some(x => x >= size)) return null;
  return a.map((x, i) => [nums[i], x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
}
// Python の str の repr（' を含み " を含まなければ " で囲む。制御文字はエスケープ）
function isPyWs(ch) { return /^[\s\x1c-\x1f\x85]$/.test(ch) && ch !== '\ufeff'; }
// CPython の str.isdigit は Unicode の Digit プロパティ（Numeric_Type=Digit または Decimal）で決まる。
// Nd 以外の Digit 文字の範囲は実 CPython 3.12 で全コードポイントを走査して得たもの（PY-02）。
// 分数文字（½・¼ 等）は Numeric_Type=Numeric のみで Digit ではないため isdigit では False になる。
const PY_DIGIT_EXTRA = [[0xB2, 0xB3], [0xB9, 0xB9], [0x1369, 0x1371], [0x19DA, 0x19DA], [0x2070, 0x2070], [0x2074, 0x2079], [0x2080, 0x2089], [0x2460, 0x2468], [0x2474, 0x247C], [0x2488, 0x2490], [0x24EA, 0x24EA], [0x24F5, 0x24FD], [0x24FF, 0x24FF], [0x2776, 0x277E], [0x2780, 0x2788], [0x278A, 0x2792], [0x10A40, 0x10A43], [0x10E60, 0x10E68], [0x11052, 0x1105A], [0x1F100, 0x1F10A]];
function isPyDigit(ch) { if (/^\p{Nd}$/u.test(ch)) return true; const cp = ch.codePointAt(0); return PY_DIGIT_EXTRA.some(([a, b]) => cp >= a && cp <= b); }
// 漢数字は Unicode の数値プロパティ（\p{N}）に含まれないが、CPython の isnumeric では True になる
// （実 CPython 3.12 で1文字ずつ照合した常用の漢数字。リファレンスの「漢数字なども True」とも整合させる）。
const PY_NUMERIC_EXTRA = new Set(Array.from('一二三四五六七八九十百千万億兆〇零壱弐参肆伍陸漆捌玖拾佰仟萬廿卅卌'));
function isPyNumeric(ch) { return /^\p{N}$/u.test(ch) || PY_NUMERIC_EXTRA.has(ch); }
// str.split / rsplit（sep=None は空白区切り。maxsplit は -1 で無制限）
// タイトルケースが通常の大文字変換と異なる文字（合字と ǅ 系）。title()/capitalize() の先頭文字に使う
const TITLECASE = { 'ﬀ': 'Ff', 'ﬁ': 'Fi', 'ﬂ': 'Fl', 'ﬃ': 'Ffi', 'ﬄ': 'Ffl', 'ﬅ': 'St', 'ﬆ': 'St', 'ǆ': 'ǅ', 'ǉ': 'ǈ', 'ǌ': 'ǋ', 'ǳ': 'ǲ', 'ǆ́': 'ǅ́' };
function pyTitlecase(ch) { return TITLECASE[ch] || ch.toUpperCase(); }
// CPython の str.title()：大文字小文字のある文字が「単語の先頭」でタイトルケース、それ以外で小文字になる（アポストロフィも単語の区切り）
function pyTitle(s) {
  const CASED = /[\p{Ll}\p{Lu}\p{Lt}]/u;
  let out = '', prevCased = false;
  for (const ch of s) { if (CASED.test(ch)) { out += prevCased ? ch.toLowerCase() : pyTitlecase(ch); prevCased = true; } else { out += ch; prevCased = false; } }
  return out;
}
function pySplit(s, sep, max, fromRight) {
  if (sep === null) {
    const a = Array.from(s); const out = [];
    if (!fromRight) {
      let i = 0; const n = a.length;
      while (true) { while (i < n && isPyWs(a[i])) i++; if (i >= n) break; if (max >= 0 && out.length === max) { out.push(a.slice(i).join('')); break; } let j = i; while (j < n && !isPyWs(a[j])) j++; out.push(a.slice(i, j).join('')); i = j; }
      return out;
    }
    let j = a.length;
    while (true) { while (j > 0 && isPyWs(a[j - 1])) j--; if (j <= 0) break; if (max >= 0 && out.length === max) { out.unshift(a.slice(0, j).join('')); break; } let i = j; while (i > 0 && !isPyWs(a[i - 1])) i--; out.unshift(a.slice(i, j).join('')); j = i; }
    return out;
  }
  const parts = s.split(sep);
  if (max < 0 || parts.length <= max + 1) return parts;
  if (!fromRight) return parts.slice(0, max).concat([parts.slice(max).join(sep)]);
  return [parts.slice(0, parts.length - max).join(sep)].concat(parts.slice(parts.length - max));
}
const NONPRINT_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}\p{Zs}]$/u;
function pyStrRepr(v) {
  const q = v.includes("'") && !v.includes('"') ? '"' : "'";
  let out = '';
  for (const ch of v) {
    const c = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === q) out += '\\' + q;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (c !== 0x20 && NONPRINT_RE.test(ch)) { // CPython が「表示できない文字」としてエスケープする範囲
      if (c <= 0xff) out += '\\x' + c.toString(16).padStart(2, '0');
      else if (c <= 0xffff) out += '\\u' + c.toString(16).padStart(4, '0');
      else out += '\\U' + c.toString(16).padStart(8, '0');
    }
    else out += ch;
  }
  return q + out + q;
}
// print / str() 用の完全な表示（入れ子の深さで省略しない。循環参照は CPython と同じく [...] 等で示す）
function reprFull(v, seen) {
  seen = seen || new Set();
  if (isFrozenSet(v) || isFrozenDict(v)) return reprVal(v);
  if (isUnk(v)) return unknownLabel({kind:'unknown', source:v.desc});
  if (isNum(v)) return fmtNum(v);
  if (isBool(v)) return v.v ? 'True' : 'False';
  if (isNone(v)) return 'None';
  if (typeof v === 'string') return pyStrRepr(v);
  if (isEllipsis(v)) return 'Ellipsis';
  if (isList(v) || isTuple(v) || isDict(v) || isSet(v)) {
    if (seen.has(v)) return isList(v) ? '[...]' : isTuple(v) ? '(...)' : '{...}';
    seen.add(v);
    let out;
    if (isList(v)) out = '[' + v.__list.map(x => reprFull(x, seen)).join(', ') + ']';
    else if (isTuple(v)) out = v.__tuple.length === 1 ? '(' + reprFull(v.__tuple[0], seen) + ',)' : '(' + v.__tuple.map(x => reprFull(x, seen)).join(', ') + ')';
    else if (isDict(v)) { const ps = []; for (const e of v.__dict.values()) ps.push(reprFull(e.k, seen) + ': ' + reprFull(e.v, seen)); out = '{' + ps.join(', ') + '}'; }
    else if (!v.__set.length) out = 'set()';
    else { const ord = setOrder(v); const inner = (ord || v.__set).map(x => reprFull(x, seen)).join(', '); out = ord ? '{' + inner + '}' : (/[（）]/.test(inner) ? '（集合・表示の並び順は実行時に決まります）' : '（集合 {' + inner + '}・表示の並び順は実行時に決まります）'); }
    seen.delete(v);
    return out;
  }
  if (isBytes(v) || isBytearray(v) || isComplex(v) || isFrozenSet(v) || isFrozenDict(v) || isSlice(v) || isMemview(v)) return reprVal(v);
  return reprVal(v);
}
// B6-Py3：ascii()／f文字列の !a 用に、非 ASCII 文字をエスケープする
function asciiEsc(s) { let out = ''; for (const ch of s) { const cp = ch.codePointAt(0); if (cp < 128) out += ch; else if (cp <= 0xff) out += '\\x' + cp.toString(16).padStart(2, '0'); else if (cp <= 0xffff) out += '\\u' + cp.toString(16).padStart(4, '0'); else out += '\\U' + cp.toString(16).padStart(8, '0'); } return out; }
function strVal(v) { // print / str() 用：文字列はそのまま、それ以外は repr とほぼ同じ
  if (typeof v === 'string') return v;
  if (isUnk(v)) return unknownLabel({kind:'unknown', source:v.desc});
  if (v && v.__exc) return v.text; // 例外の str() はメッセージそのもの
  if (v && v.__native) { const d = nativeClassDef(v.__native); if (d) { if (d.str) return d.str(nativeStaticCtx(), v); if (d.repr) return d.repr(nativeStaticCtx(), v); } }
  if (v && v.__ncls) return "<class '" + v.__ncls + "'>";
  return reprFull(v);
}
function eqVal(a, b) {
  if (isUnk(a) || isUnk(b)) return null;
  if (a === b) return true; // 同じオブジェクト同士は等しい（NaN が自分自身と等しくなるのもこのため）
  if ((a && a.__exc) || (b && b.__exc)) return false; // 例外の等しさは同一オブジェクトのときだけ（上で処理済み）
  // R27-N19 兄弟表面：組み込み関数は名前が同じなら同一のオブジェクト
  // （len == len は True で、集合では重複しない）。束縛メソッドは対象と
  // 名前が同じなら等しい（xs.append == xs.append）。dictKeyId の ID 規則と
  // 一致させる（等しい値同士は必ず同じキー ID になる）。
  if (a && b && a.__builtin && b.__builtin) return a.__builtin === b.__builtin;
  if (a && b && a.__ncls && b.__ncls) return a.__ncls === b.__ncls;
  if ((a && a.__ncls) || (b && b.__ncls)) {
    // 高度A7班是正：typevalAlias を宣言した標準ライブラリクラス
    // （types.NoneType／EllipsisType／NotImplementedType）は、エンジンの
    // 型値（type() の結果）と同一のクラスなので、型名で等価を判定する。
    const da = a && a.__ncls ? nativeClassDef(a.__ncls) : null;
    const db = b && b.__ncls ? nativeClassDef(b.__ncls) : null;
    if (da && da.typevalAlias && b && b.__type) return da.typevalAlias === b.__type;
    if (db && db.typevalAlias && a && a.__type) return db.typevalAlias === a.__type;
    return false;
  }
  if ((a && a.__native) || (b && b.__native)) {
    // B7 統合時の基盤修正 F-N：限定名が異なるネイティブ同士でも、まず左の
    // eq、次に右の eq（反射）を試す（IPv4Interface == IPv4Address のように
    // CPython で関連クラス間の等価が定義される場合があるため）。
    if (a && a.__native && b && b.__native && a.__native !== b.__native) {
      const da = nativeClassDef(a.__native);
      if (da && da.eq) { const r = da.eq(nativeStaticCtx(), a, b); if (r !== null && r !== undefined) return r; }
      const db = nativeClassDef(b.__native);
      if (db && db.eq) { const r = db.eq(nativeStaticCtx(), b, a); if (r !== null && r !== undefined) return r; }
      return false;
    }
    const nv = a && a.__native ? a : b, ov = a && a.__native ? b : a;
    const d = nativeClassDef(nv.__native);
    if (d && d.eq) { const r = d.eq(nativeStaticCtx(), nv, ov); if (r !== null && r !== undefined) return r; }
    return false;
  }
  if (a && b && a.__method && b.__method) return a.name === b.name && (a.obj === b.obj || eqVal(a.obj, b.obj) === true);
  if (a && b && a.__bound && b.__bound) return a.fn === b.fn && a.instance === b.instance;
  if (isNum(a) && isNum(b)) return a.v === b.v;
  if (a && b && a.__range && b.__range) {
    const ra = a.rng, rb = b.rng;
    if (ra && rb) return ra[0] === rb[0] && ra[1] === rb[1] && ra[2] === rb[2];
    return a.__range.length === b.__range.length && a.__range.every((x, i) => eqVal(x, b.__range[i]) === true);
  }
  if (isBytesLike(a) && isBytesLike(b)) { const x = bytesOf(a), y = bytesOf(b); return x.length === y.length && x.every((v2, i) => v2 === y[i]); }
  if (isComplex(a) || isComplex(b)) { const pa = cxParts(a), pb = cxParts(b); if (!pa || !pb) return false; return pa.re === pb.re && pa.im === pb.im; }
  if (isSlice(a) && isSlice(b)) { const f = (x, y) => (isNone(x) && isNone(y)) || eqVal(x, y) === true; return f(a.__slice.start, b.__slice.start) && f(a.__slice.stop, b.__slice.stop) && f(a.__slice.step, b.__slice.step); }
  if (isMemview(a) || isMemview(b)) { const ba = isMemview(a) ? mvBytes(a) : isBytesLike(a) ? bytesOf(a) : null; const bb = isMemview(b) ? mvBytes(b) : isBytesLike(b) ? bytesOf(b) : null; if (ba === null || bb === null) return false; return ba.length === bb.length && ba.every((v2, i) => v2 === bb[i]); }
  if (isBool(a) && isBool(b)) return a.v === b.v;
  if (isBool(a) && isNum(b)) return (a.v ? 1 : 0) === b.v;
  if (isNum(a) && isBool(b)) return a.v === (b.v ? 1 : 0);
  if (isNone(a) || isNone(b)) return a === b;
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if (isList(a) && isList(b)) return a.__list.length === b.__list.length && a.__list.every((x, i) => eqVal(x, b.__list[i]) === true);
  if (isTuple(a) && isTuple(b)) return a.__tuple.length === b.__tuple.length && a.__tuple.every((x, i) => eqVal(x, b.__tuple[i]) === true);
  if (isDict(a) && isDict(b)) {
    if (a.__dict.size !== b.__dict.size) return false;
    for (const e of a.__dict.values()) { const bv = dictGet(b, e.k); if (bv === undefined) return false; const r = eqVal(e.v, bv); if (r !== true) return r; }
    return true;
  }
  if (isSet(a) && isSet(b)) return a.__set.length === b.__set.length && a.__set.every(x => b.__set.some(y => eqVal(x, y) === true));
  const tn = (x) => x && x.__type ? x.__type : x && x.__builtin && ['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set'].includes(x.__builtin) ? x.__builtin : null;
  if (tn(a) && tn(b)) return tn(a) === tn(b);
  return a === b;
}
// R27-N19：同一性（id）でハッシュされる値のための安定した ID 発番。
// 関数・クラス・インスタンス・イテレータ・例外値など、CPython では
// オブジェクトの同一性でハッシュされる値は、同じオブジェクトへの再評価で
// 同じ ID が返らなければならない（辞書の読み戻し・in 判定のため）。
let keySerial = 0;
const keyIds = new WeakMap();
function identityKeyId(v) {
  let id = keyIds.get(v);
  if (id === undefined) { id = ++keySerial; keyIds.set(v, id); }
  return 'i:' + id;
}
// R27-N19：ハッシュ可能性を実 CPython 3.12 の規則に是正する。
// 従来は数値・真偽・文字列・None・タプルしか ID を返さず、実 CPython では
// ハッシュ可能な関数・型・インスタンス・range・Ellipsis 等まで一律に
// 「ハッシュできない」と虚偽停止していた。実 CPython で機械突合した規則：
//   値でハッシュ：数値・真偽・文字列・None・bytes 相当・frozenset 相当と、
//     それらだけを含むタプル。range は列の値で、合併型（int | str 等）は
//     構成型の集合で、type() の結果と組み込み関数・例外クラスは名前で、
//     束縛メソッドは対象と名前で、それぞれ等しさ（eqVal）と一致させる。
//   同一性でハッシュ：ユーザー関数・ユーザー定義クラスとそのインスタンス・
//     イテレータ・例外の値・束縛済みメソッド。Ellipsis／NotImplemented は
//     シングルトンなので固定 ID。
//   ハッシュ不可（null のまま）：リスト・辞書・集合・それらを含むタプル・
//     dict のビュー（dict_keys 等。実 CPython でも unhashable）。
function dictKeyId(v) {
  if (isNum(v)) return 'n:' + (v.v === 0 ? 0 : v.v);
  if (isBool(v)) return 'n:' + (v.v ? 1 : 0);
  if (typeof v === 'string') return 's:' + v;
  if (isNone(v)) return 'z:';
  if (isEllipsis(v)) return 'e:';
  if (isNotImplemented(v)) return 'ni:';
  if (isBytes(v)) return 'by:' + v.__bytes.join(',');
  if (isComplex(v)) { const re = v.__complex.re === 0 ? 0 : v.__complex.re, im = v.__complex.im === 0 ? 0 : v.__complex.im; if (im === 0) return 'n:' + re; return 'cx:' + re + ',' + im; } // B6監査D4/D5：虚部0の複素数は実数と同じキーID（CPython の数値キー統一）
  if (isFrozenSet(v)) { const ids = v.__set.map(dictKeyId); if (ids.some(x => x === null)) return null; return 'fs:' + ids.sort().join('|'); }
  if (isFrozenDict(v)) { const ids = []; for (const e of v.__dict.values()) { const ki = dictKeyId(e.k), vi = dictKeyId(e.v); if (ki === null || vi === null) return null; ids.push(ki + '=' + vi); } return 'fd:' + ids.sort().join('|'); }
  if (isTuple(v)) { const ids = v.__tuple.map(dictKeyId); if (ids.some(x => x === null)) return null; return 't:' + ids.map(s => s.length + ':' + s).join(','); }
  if (v && v.__range) { const ids = v.__range.map(dictKeyId); if (ids.some(x => x === null)) return null; return 'r:' + ids.map(s => s.length + ':' + s).join(','); }
  if (v && v.__type) return 'ty:' + v.__type;
  // 型・例外クラスの組み込み名は type() の結果（TYPEVAL）と同一のクラス
  // そのものなので、ID 空間を 'ty:' に揃える（{int: 1}[type(1)] が引ける）。
  if (v && v.__builtin) return (TYPE_BUILTINS.includes(v.__builtin) || EXC_NAMES.has(v.__builtin)) ? 'ty:' + v.__builtin : 'bf:' + v.__builtin;
  if (v && v.__union) {
    const names = v.__union.map(x => (x && x.__type) || (x && x.__builtin) || (x && x.__class ? x.cname : null));
    if (names.some(x => x === null)) return null;
    return 'u:' + names.sort().join('|');
  }
  if (isMethodRef(v)) {
    const o = v.obj;
    const oid = typeof o === 'string' ? 's:' + o : isNum(o) ? 'n:' + o.v : isBool(o) ? 'n:' + (o.v ? 1 : 0) : (o && typeof o === 'object') ? identityKeyId(o) : null;
    return oid === null ? null : 'm:' + oid + ':' + v.name;
  }
  if (v && v.__bound) return 'b:' + identityKeyId(v.instance) + ':' + identityKeyId(v.fn);
  if (v && v.__ncls) return 'ty:' + v.__ncls;
  if (v && v.__native) { const d = nativeClassDef(v.__native); if (d && d.hash) { const h = d.hash(nativeStaticCtx(), v); return h === null || h === undefined ? null : 'nv:' + v.__native + ':' + h; } return identityKeyId(v); }
  // B6-Py3：__hash__ = None のクラスと、__eq__ を定義して __hash__ を
  // 定義していないクラスのインスタンスは CPython では unhashable
  // （キーにできない）。それ以外は同一性で引く（__hash__ の戻り値
  // そのものや __eq__ によるキーの一致までは再現しない）。
  if (v && v.__instance) {
    const hh = classLookup(v.cls, '__hash__');
    if (hh === NONE) return null;
    if (hh === undefined && classLookup(v.cls, '__eq__') !== undefined) return null;
    return identityKeyId(v);
  }
  if (isFunc(v) || (v && v.__class) || isIter(v) || (v && v.__exc)) return identityKeyId(v);
  return null; // ハッシュ化できない
}
function dictGet(d, k) { const id = dictKeyId(k); if (id === null) return undefined; return d.__dict.get(id)?.v; }
function dictSet(d, k, v) { const id = dictKeyId(k); if (id === null) return false; const cur = d.__dict.get(id); d.__dict.set(id, { k: cur ? cur.k : k, v }); return true; }

/* ============ 字句解析：論理行への分割 ============ */
class SimDiag extends Error { constructor(line, kind, msg, fix) { super(msg); this.line = line; this.kind = kind; this.fix = fix || ''; } }

// ソースを論理行 [{line, indent, text}] に分ける。括弧内の改行は1行に結合する。
function splitLines(src) {
  const diags = [];
  const rawLines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let depth = 0; const stack = [];
  let buf = null; // {line, indent, parts:[]}
  let carry = null; // 前の行から続く三連引用符
  let carryStr = null; // 行継続（\）で次の行へ続く通常の文字列の引用符
  let pendingGlue = null; // 行継続（\）のとき、次の部品を空白なしでつなぐ
  for (let li = 0; li < rawLines.length; li++) {
    const raw = rawLines[li];
    const startedInTriple = carry !== null;
    const startedInStr = carryStr !== null;
    let i = 0, inStr = carryStr, esc = false, commentAt = -1, triple = carry;
    let inF = false, fExpr = 0, inInner = null; // f文字列の式 {…} の中では引用符を再利用できる（PEP 701）。式内の括弧・文字列を正しく数えるための状態
    for (; i < raw.length; i++) {
      const c = raw[i];
      if (esc) { esc = false; continue; }
      if (triple) { if (raw.substr(i, 3) === triple) { i += 2; triple = null; } continue; }
      if (inInner) { if (c === '\\') esc = true; else if (c === inInner) inInner = null; continue; }
      if (fExpr > 0) { // f文字列の式の中：通常のコードとして走査する
        if (c === '"' || c === "'") { inInner = c; continue; }
        // # はコメントにしない：書式指定の # フラグ（f"{255:#x}"）をコメントと誤認しないため
        if (c === '(' || c === '[') { depth++; stack.push({ c, line: li + 1 }); continue; }
        if (c === '{') { depth++; stack.push({ c, line: li + 1 }); fExpr++; continue; }
        if (c === ')' || c === ']') { depth--; if (depth < 0) { diags.push({ line: li + 1, level: 'error', kind: 'SyntaxError', msg: '閉じ括弧「' + c + '」に対応する開き括弧がありません', fix: '括弧の対応を確認してください' }); depth = 0; } else stack.pop(); continue; }
        if (c === '}') { depth--; if (depth < 0) { depth = 0; } else stack.pop(); fExpr--; continue; }
        continue;
      }
      if (inStr && inF) { // f文字列の本文：{ で式に入る。}} はリテラル
        if (c === '\\') { esc = true; continue; }
        if (c === inStr) { inStr = null; inF = false; continue; }
        if (c === '{') { if (raw[i + 1] === '{') { i++; continue; } depth++; stack.push({ c, line: li + 1 }); fExpr = 1; continue; }
        if (c === '}' && raw[i + 1] === '}') { i++; continue; }
        continue;
      }
      if (inStr) { if (c === '\\') esc = true; else if (c === inStr) inStr = null; continue; }
      if (c === '"' || c === "'") {
        if (raw.substr(i, 3) === c + c + c) { triple = c + c + c; i += 2; continue; }
        inStr = c;
        const mPre = /([fFrRbBuU]{1,2})$/.exec(raw.slice(0, i));
        inF = !!(mPre && /[fF]/.test(mPre[1]) && !/[\p{L}\p{Nd}_]/u.test(raw[i - mPre[1].length - 1] || ''));
        continue;
      }
      if (c === '#') { commentAt = i; break; }
      if (c === '(' || c === '[' || c === '{') { depth++; stack.push({ c, line: li + 1 }); }
      if (c === ')' || c === ']' || c === '}') {
        depth--;
        if (depth < 0) { diags.push({ line: li + 1, level: 'error', kind: 'SyntaxError', msg: '閉じ括弧「' + c + '」に対応する開き括弧がありません', fix: '括弧の対応を確認してください' }); depth = 0; }
        else stack.pop();
      }
    }
    // 行末の単独バックスラッシュ（コメント外・奇数個）は行継続
    let contLine = false;
    if (!triple && commentAt < 0) {
      const t = raw.replace(/\s+$/, '');
      let bs = 0; for (let k = t.length - 1; k >= 0 && t[k] === '\\'; k--) bs++;
      contLine = bs % 2 === 1;
    }
    if (inStr && !contLine) { diags.push({ line: li + 1, level: 'error', kind: 'SyntaxError', msg: '文字列が閉じられていません（引用符 ' + inStr + ' が不足）', fix: '行末に ' + inStr + ' を足してください' }); carryStr = null; continue; }
    carryStr = contLine && inStr ? inStr : null;
    carry = triple;
    let code = commentAt >= 0 ? raw.slice(0, commentAt) : raw;
    if (contLine) code = code.replace(/\s+$/, '').slice(0, -1);
    if (!buf) {
      let ind = 0, j = 0;
      while (j < code.length && (code[j] === ' ' || code[j] === '\t')) { ind += code[j] === '\t' ? 4 : 1; j++; }
      buf = { line: li + 1, indent: ind, indentStr: code.slice(0, j), parts: [] };
    }
    let piece = startedInTriple || startedInStr ? code : code.replace(/^\s+/, '');
    if (!triple && !inStr) piece = piece.replace(/\s+$/, '');
    const part = { s: piece, nl: startedInTriple };
    if (pendingGlue !== null) { part.glue = pendingGlue; pendingGlue = null; }
    buf.parts.push(part);
    if (contLine) pendingGlue = '';
    if (depth <= 0 && !triple && !contLine) {
      const text = joinParts(buf.parts);
      if (text.trim()) out.push({ line: buf.line, indent: buf.indent, indentStr: buf.indentStr, text });
      buf = null; depth = 0;
    }
  }
  if (carry && buf) diags.push({ line: buf.line, level: 'error', kind: 'SyntaxError', msg: '三連引用符の文字列が閉じられていません', fix: '""" または \'\'\' で閉じてください' });
  else if (buf && joinParts(buf.parts).trim()) out.push({ line: buf.line, indent: buf.indent, indentStr: buf.indentStr, text: joinParts(buf.parts) });
  if (stack.length) { const b = stack[stack.length - 1]; diags.push({ line: b.line, level: 'error', kind: 'SyntaxError', msg: '括弧「' + b.c + '」が閉じられていません', fix: '対応する閉じ括弧を足してください' }); }
  return { lines: out, diags };
}

function joinParts(parts) { return parts.map((p, k) => k === 0 ? p.s : (p.glue !== undefined ? p.glue : (p.nl ? '\n' : ' ')) + p.s).join(''); }
// Python の文字列エスケープを解釈する。\N{...}（文字名引き）は解釈できず null を返す
function decodePyStr(raw, lineNo) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') { out += c; continue; }
    const e = raw[i + 1];
    if (e === undefined) { out += '\\'; break; }
    i++;
    if (e === 'n') out += '\n';
    else if (e === 't') out += '\t';
    else if (e === 'r') out += '\r';
    else if (e === 'b') out += '\b';
    else if (e === 'f') out += '\f';
    else if (e === 'v') out += '\v';
    else if (e === 'a') out += '\x07';
    else if (e === '\\') out += '\\';
    else if (e === "'") out += "'";
    else if (e === '"') out += '"';
    else if (e === '\n') { /* 行継続：何も残さない */ }
    else if (e === 'x') { const h = raw.substr(i + 1, 2); if (!/^[0-9a-fA-F]{2}$/.test(h)) throw new SimDiag(lineNo, 'SyntaxError', '\\x のあとには16進数2桁が必要です', '例：\\x41 は「A」です'); out += String.fromCodePoint(parseInt(h, 16)); i += 2; }
    else if (e === 'u') { const h = raw.substr(i + 1, 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) throw new SimDiag(lineNo, 'SyntaxError', '\\u のあとには16進数4桁が必要です', ''); out += String.fromCodePoint(parseInt(h, 16)); i += 4; }
    else if (e === 'U') { const h = raw.substr(i + 1, 8); if (!/^[0-9a-fA-F]{8}$/.test(h)) throw new SimDiag(lineNo, 'SyntaxError', '\\U のあとには16進数8桁が必要です', ''); const cp = parseInt(h, 16); if (cp > 0x10FFFF) throw new SimDiag(lineNo, 'SyntaxError', '\\U の値が大きすぎます', ''); out += String.fromCodePoint(cp); i += 8; }
    else if (e === 'N') { if (raw[i + 1] === '{') return null; out += '\\N'; }
    else if (e >= '0' && e <= '7') { let oct = e, k = 0; while (k < 2 && raw[i + 1] >= '0' && raw[i + 1] <= '7') { oct += raw[i + 1]; i++; k++; } out += String.fromCodePoint(parseInt(oct, 8)); }
    else out += '\\' + e; // 解釈できないエスケープは CPython と同じくバックスラッシュごと残す
  }
  return out;
}
/* 行内トークナイザ：1論理行の text をトークン列にする */
function lexText(text, lineNo) {
  const toks = [];
  let i = 0;
  const isDigit = (c) => c >= '0' && c <= '9';
  // 数値リテラルの数字並び（digitpart）：数字の間にだけ単一の _ を許す（PEP 515／CPython の文法どおり）。
  // 先頭・末尾・連続・小数点や指数記号に接する _ は不正で、呼び出し側が SyntaxError にする。
  const scanDigitpart = (pos, digitOk) => {
    if (pos >= text.length || !digitOk(text[pos])) return -1;
    let p = pos + 1;
    while (p < text.length) {
      if (digitOk(text[p])) { p++; continue; }
      if (text[p] === '_' && p + 1 < text.length && digitOk(text[p + 1])) { p += 2; continue; }
      break;
    }
    return p;
  };
  const isNameS = (c) => /^[\p{L}\p{Nl}_]$/u.test(c);
  const isNameC = (c) => /^[\p{L}\p{Mn}\p{Mc}\p{Nd}\p{Pc}\p{Nl}\u200c\u200d]$/u.test(c);
  while (i < text.length) {
    const c = text[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    // 文字列（接頭辞つき：f / r / b / u の組み合わせに対応）
    let prefix = '';
    { const m = /^[fFrRbBuU]{1,2}(?=["'])/.exec(text.slice(i, i + 3)); if (m) prefix = m[0].toLowerCase(); }
    if (c === '"' || c === "'" || prefix) {
      const isRaw = prefix.includes('r'), isF = prefix.includes('f'), isB = prefix.includes('b');
      if (isB && isF) throw new SimDiag(lineNo, 'SyntaxError', 'b と f の接頭辞は組み合わせられません', '');
      const start = i + prefix.length;
      const q = text[start];
      let raw = '', closed = false;
      if (text.substr(start, 3) === q + q + q) { // 三連引用符
        const close = text.indexOf(q + q + q, start + 3);
        if (close < 0) throw new SimDiag(lineNo, 'SyntaxError', '三連引用符の文字列が閉じられていません', '""" または \'\'\' で閉じてください');
        raw = text.slice(start + 3, close);
        closed = true;
        i = close + 3;
      } else if (isF) {
        // f文字列（Python 3.12 / PEP 701）：式 {…} の中では同じ引用符を再利用できるため、
        // 式ブレースの深さを追い、式の中の引用符は文字列の終わりとみなさない
        let j = start + 1, depth = 0;
        while (j < text.length) {
          const ch = text[j];
          if (depth === 0) {
            if (ch === '\\' && !isRaw && j + 1 < text.length) { raw += ch + text[j + 1]; j += 2; continue; }
            if (ch === '{') { if (text[j + 1] === '{') { raw += '{{'; j += 2; continue; } depth = 1; raw += ch; j++; continue; }
            if (ch === '}') { if (text[j + 1] === '}') { raw += '}}'; j += 2; continue; } raw += ch; j++; continue; }
            if (ch === q) { closed = true; break; }
            raw += ch; j++; continue;
          }
          if (ch === '"' || ch === "'") { const q2 = ch; raw += ch; j++; while (j < text.length && text[j] !== q2) { if (text[j] === '\\' && j + 1 < text.length) { raw += text[j] + text[j + 1]; j += 2; } else { raw += text[j]; j++; } } if (j < text.length) { raw += text[j]; j++; } continue; }
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          raw += ch; j++;
        }
        if (!closed) throw new SimDiag(lineNo, 'SyntaxError', '文字列が閉じられていません', '引用符 ' + q + ' を足してください');
        i = j + 1;
      } else {
        let j = start + 1;
        while (j < text.length) {
          if (text[j] === '\\' && j + 1 < text.length) { raw += text[j] + text[j + 1]; j += 2; continue; }
          if (text[j] === q) { closed = true; break; }
          raw += text[j]; j++;
        }
        if (!closed) throw new SimDiag(lineNo, 'SyntaxError', '文字列が閉じられていません', '引用符 ' + q + ' を足してください');
        i = j + 1;
      }
      if (isB) {
        // B6-Py2：bytes リテラルの中身をバイト列として確定させる（従来は中身を捨てて不明値にしていた）。
        // 生文字列でなければ str と同じエスケープ解釈をし、各文字のコードポイントをバイト値とする。
        let barr;
        if (isRaw) barr = Array.from(raw).map(ch => ch.codePointAt(0));
        else { const dec = decodePyStr(raw, lineNo); if (dec === null) throw new SimDiag(lineNo, 'SyntaxError', 'bytes リテラルでは \\N{...} は使えません', ''); barr = Array.from(dec).map(ch => ch.codePointAt(0)); }
        if (barr.some(x => x > 0xff)) throw new SimDiag(lineNo, 'SyntaxError', 'bytes リテラルには ASCII 文字だけが書けます（それ以外は \\x などのエスケープで書いてください）', '');
        toks.push({ t: 'BYTES', v: barr, line: lineNo }); continue;
      }
      if (!isRaw) {
        const dec = decodePyStr(raw, lineNo);
        if (dec === null) { toks.push({ t: 'STR', v: '', f: isF, unkstr: true, line: lineNo }); continue; }
        raw = dec;
      }
      toks.push({ t: 'STR', v: raw, f: isF, line: lineNo });
      continue;
    }
    if (c === '0' && /[xXoObB]/.test(text[i + 1] || '')) {
      // 基数リテラル：接頭辞の直後の _ は1つだけ、数字の間は単一の _ のみ可。基数に合わない数字や文字が続けば SyntaxError
      // （従来は 0b102 を 2、0o18 を 1 のように、読める所までで黙って切り捨てていた。R23-N9）
      const kindCh = text[i + 1].toLowerCase();
      const base = { x: 16, o: 8, b: 2 }[kindCh];
      const digitOk = kindCh === 'x' ? (ch) => /[0-9a-fA-F]/.test(ch) : kindCh === 'o' ? (ch) => ch >= '0' && ch <= '7' : (ch) => ch === '0' || ch === '1';
      let j = i + 2;
      if (text[j] === '_') j++;
      const end = scanDigitpart(j, digitOk);
      if (end < 0) throw new SimDiag(lineNo, 'SyntaxError', '数値の書き方が正しくありません', '');
      j = end;
      if (j < text.length && (isDigit(text[j]) || text[j] === '_' || isNameS(String.fromCodePoint(text.codePointAt(j))))) throw new SimDiag(lineNo, 'SyntaxError', '数値の書き方が正しくありません', '');
      const v = parseInt(text.slice(i + 2, j).replace(/_/g, ''), base);
      toks.push({ t: 'NUM', v, f: false, line: lineNo }); i = j; continue;
    }
    if (isDigit(c) || (c === '.' && isDigit(text[i + 1] || ''))) {
      // 10進リテラル：整数部・小数部・指数部はそれぞれ digitpart として読み、不正な _ や数字のない指数部は SyntaxError
      // （従来は 1e を 1.0、1__0 を 10 のように黙って受理し、逆に正しい 1e1_0 や 1.5_0 を壊していた。R23-N9）
      let j = i, isF = false, intPartEnd = i;
      if (c === '.') { isF = true; j = scanDigitpart(i + 1, isDigit); }
      else {
        j = scanDigitpart(i, isDigit); intPartEnd = j;
        if (text[j] === '.') { isF = true; j++; const fe = scanDigitpart(j, isDigit); if (fe > 0) j = fe; }
      }
      if (text[j] === 'e' || text[j] === 'E') {
        let k = j + 1; if (text[k] === '+' || text[k] === '-') k++;
        const ee = scanDigitpart(k, isDigit);
        if (ee < 0) throw new SimDiag(lineNo, 'SyntaxError', '数値の書き方が正しくありません（指数部 e のあとには数字が必要です）', '');
        isF = true; j = ee;
      }
      let cx = false;
      if (text[j] === 'j' || text[j] === 'J') { cx = true; j++; }
      if (j < text.length && (text[j] === '_' || isNameS(String.fromCodePoint(text.codePointAt(j))))) throw new SimDiag(lineNo, 'SyntaxError', '数値の書き方が正しくありません', '');
      const raw = text.slice(i, cx ? j - 1 : j).replace(/_/g, '');
      // RG-11（Python 分）：先行ゼロのある10進整数リテラルは CPython では SyntaxError（0 だけが並ぶ場合と小数・指数・複素数は対象外）
      if (!isF && !cx) { const stripped = text.slice(i, intPartEnd).replace(/_/g, ''); if (stripped.length > 1 && stripped[0] === '0' && /[1-9]/.test(stripped)) throw new SimDiag(lineNo, 'SyntaxError', '先行ゼロのある整数リテラル「' + text.slice(i, j) + '」は Python では使えません（leading zeros in decimal integer literals are not permitted）', '8進数として書くなら 0o' + stripped.slice(1) + ' のように 0o を付けてください'); }
      toks.push({ t: 'NUM', v: parseFloat(raw), f: isF || cx, cx, line: lineNo });
      i = j; continue;
    }
    { const ch0 = String.fromCodePoint(text.codePointAt(i));
      if (isNameS(ch0)) {
        let j = i, name = '';
        while (j < text.length) { const ch = String.fromCodePoint(text.codePointAt(j)); if (!isNameC(ch)) break; name += ch; j += ch.length; }
        toks.push({ t: 'NAME', v: name, line: lineNo });
        i = j; continue;
      } }
    if (text.substr(i, 3) === '...') { toks.push({ t: 'ELLIPSIS', line: lineNo }); i += 3; continue; }
    const three = text.substr(i, 3), two = text.substr(i, 2);
    if (three === '**=' || three === '//=' || three === '<<=' || three === '>>=') { toks.push({ t: 'OP', v: three, line: lineNo }); i += 3; continue; }
    if (['==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '**', '//', '->', ':=', '<<', '>>', '|=', '&=', '^=', '@='].includes(two)) { toks.push({ t: 'OP', v: two, line: lineNo }); i += 2; continue; }
    if ('+-*/%()[]{},:.;=<>@&|^~'.includes(c)) { toks.push({ t: 'OP', v: c, line: lineNo }); i++; continue; }
    throw new SimDiag(lineNo, 'SyntaxError', '解釈できない文字「' + c + '」があります', '半角の記号で書かれているか確認してください');
  }
  toks.push({ t: 'END', line: lineNo });
  return toks;
}

/* ============ 構文解析 ============ */
class TC { // トークンカーソル
  constructor(toks) { this.toks = toks; this.i = 0; }
  peek(k) { return this.toks[Math.min(this.i + (k || 0), this.toks.length - 1)]; }
  next() { return this.toks[this.i++]; }
  atEnd() { return this.peek().t === 'END'; }
  isOp(v) { const t = this.peek(); return t.t === 'OP' && t.v === v; }
  isName(v) { const t = this.peek(); return t.t === 'NAME' && t.v === v; }
  eatOp(v) { if (this.isOp(v)) { this.i++; return true; } return false; }
  expectOp(v, line) { if (!this.eatOp(v)) throw new SimDiag(line, 'SyntaxError', '「' + v + '」が来るはずの場所に別のものがあります', '記号の書き方を確認してください'); }
}

const KEYWORDS = ['if', 'elif', 'else', 'for', 'while', 'def', 'return', 'break', 'continue', 'pass', 'import', 'from', 'as', 'and', 'or', 'not', 'in', 'is', 'class', 'try', 'except', 'finally', 'with', 'lambda', 'global', 'nonlocal', 'raise', 'yield', 'assert', 'del', 'async', 'await', 'True', 'False', 'None'];

function parseProgram(lines) {
  const r = parseBlock(lines, 0, -1);
  return r.stmts;
}
function parseBlock(lines, start, parentIndent) {
  const stmts = [];
  let i = start;
  let myIndent = null;
  let blockHasTab = false, blockHasSpace = false; // RG-36：同一ブロック内のタブ・空白混在（実 Python は TabError／IndentationError）
  while (i < lines.length) {
    const L = lines[i];
    if (L.indent <= parentIndent) break;
    if (myIndent === null) myIndent = L.indent;
    if (L.indent < myIndent) break;
    if (L.indent > myIndent) throw new SimDiag(L.line, 'IndentationError', 'インデントが想定より深くなっています', '行頭の空白の数を、周りの行と揃えてください');
    { const istr = L.indentStr || '';
      const hasT = istr.includes('\t'), hasS = istr.includes(' ');
      if (hasT && hasS) throw new SimDiag(L.line, 'IndentationError', 'インデントにタブと空白が混ざっています（実 Python では TabError になります）', 'インデントはタブだけか空白だけかに揃えてください');
      if ((hasT && blockHasSpace) || (hasS && blockHasTab)) throw new SimDiag(L.line, 'IndentationError', '同じブロックのインデントにタブと空白が混ざっています（実 Python では TabError になります）', 'インデントはタブだけか空白だけかに揃えてください');
      blockHasTab = blockHasTab || hasT; blockHasSpace = blockHasSpace || hasS; }
    const s = parseStatement(lines, i, myIndent);
    stmts.push(...s.stmts);
    i = s.next;
  }
  return { stmts, next: i };
}
// 複合文の本体：次行ブロック or 同一行の「: 文」
function parseSuite(lines, i, headerIndent, tc, lineNo) {
  if (tc && !tc.atEnd()) { // 同一行スイート
    const body = parseSimpleStmts(tc, lineNo);
    return { body, next: i + 1 };
  }
  if (i + 1 >= lines.length || lines[i + 1].indent <= headerIndent)
    throw new SimDiag(i + 1 < lines.length ? lines[i + 1].line : lineNo, 'IndentationError', '「:」のあとに、インデントした文が必要です', '次の行を空白4つで字下げしてください');
  const r = parseBlock(lines, i + 1, headerIndent);
  return { body: r.stmts, next: r.next };
}
function parseStatement(lines, i, indent) {
  const L = lines[i];
  const toks = lexText(L.text, L.line);
  const tc = new TC(toks);
  const t0 = tc.peek();
  if (t0.t === 'NAME') {
    if (t0.v === 'def') return parseDef(lines, i, indent, tc);
    if (t0.v === 'if') return parseIf(lines, i, indent, tc);
    if (t0.v === 'for') return parseFor(lines, i, indent, tc);
    if (t0.v === 'while') return parseWhile(lines, i, indent, tc);
    const skipped = (what, nx) => { const r = namesInLines(lines, i, nx); return { stmts: [{ k: 'unsupported', what, line: L.line, names: r.names, roots: r.roots, prints: r.prints, returns: r.returns }], next: nx }; };
    if (t0.v === 'class') return parseClass(lines, i, indent, tc);
    if (t0.v === 'try') return parseTry(lines, i, indent, tc);
    if (t0.v === 'async') return skipped('非同期（async）', skipBlock(lines, i, indent));
    if (t0.v === 'with') return parseWith(lines, i, indent, tc);
    if (t0.v === 'match' && /^match\s+.+:\s*$/.test(L.text)) return skipped('match 文', skipBlock(lines, i, indent));
    if (t0.v === 'import' || t0.v === 'from') return { stmts: [{ k: 'import', text: L.text, line: L.line }], next: i + 1 };
    if (t0.v === 'elif' || t0.v === 'else') throw new SimDiag(L.line, 'SyntaxError', '「' + t0.v + '」に対応する if がありません', 'if と同じ深さのインデントで書いてください');
  }
  if (t0.t === 'OP' && t0.v === '@') { tc.next(); return { stmts: [{ k: 'decorator', expr: parseExpr(tc, L.line), line: L.line }], next: i + 1 }; }
  const ss = parseSimpleStmts(tc, L.line);
  return { stmts: ss, next: i + 1 };
}
// import 文で使えるようになる名前（as の別名・複数指定に対応）
function importNames(text) {
  const t = text.trim(); let m;
  if ((m = /^from\s+\S+\s+import\s+\(?(.+?)\)?\s*$/.exec(t))) return m[1].split(',').map(x => x.trim().split(/\s+as\s+/).pop().trim()).filter(x => /^\w+$/.test(x));
  if ((m = /^import\s+(.+)$/.exec(t))) return m[1].split(',').map(x => { const p = x.trim().split(/\s+as\s+/); return p.length > 1 ? p[1].trim() : p[0].trim().split('.')[0]; }).filter(x => /^\w+$/.test(x));
  return [];
}
function namesInLines(lines, from, to) {
  const names = new Set(); const roots = new Set(); let prints = false, returns = false;
  const IDENT = '[\\p{L}\\p{Nl}_][\\p{L}\\p{Mn}\\p{Mc}\\p{Nd}\\p{Pc}\\p{Nl}]*';
  for (let k = from; k < to; k++) {
    const t = lines[k].text;
    if (/\bprint\s*\(/.test(t)) prints = true;
    let m;
    if ((m = /^(?:async\s+)?(?:class|def)\s+(\w+)/.exec(t))) names.add(m[1]);
    if (/^return\b/.test(t)) returns = true;
    if ((m = /^for\s+([\w\s,*()]+?)\s+in\b/.exec(t))) m[1].split(/[\s,()*]+/).filter(Boolean).forEach(n => names.add(n));
    if ((m = /\bas\s+(\w+)\s*:?\s*$/.exec(t))) names.add(m[1]);
    if (/^(?:import|from)\s/.test(t)) importNames(t).forEach(n => names.add(n));
    if ((m = /^([\w\s,*()]+?)\s*(?::[^=]+)?(?:[+\-*/%]|\/\/|\*\*)?=(?!=)/.exec(t))) m[1].split(/[\s,()*]+/).filter(n => /^[A-Za-z_]\w*$/.test(n)).forEach(n => names.add(n));
    // Unicode の変数名への代入と、添字代入・変更系メソッドの受け手（根）も拾う
    const nameRe = new RegExp('(' + IDENT + ')\\s*(?::[^=]+)?(?:[+\\-*/%]|//|\\*\\*)?=(?!=)', 'gu');
    let nm; while ((nm = nameRe.exec(t))) names.add(nm[1]);
    const rootRe = new RegExp('^(' + IDENT + ')\\s*(?:\\[|\\.(?:append|extend|insert|pop|remove|sort|reverse|clear|update|add|discard|setdefault|popitem)\\s*\\()', 'u');
    if ((m = rootRe.exec(t))) roots.add(m[1]);
  }
  return { names: [...names], roots: [...roots], prints, returns };
}
function skipBlock(lines, i, indent) {
  let j = i + 1;
  while (j < lines.length && lines[j].indent > indent) j++;
  return j;
}
function parseDef(lines, i, indent, tc) {
  const L = lines[i];
  tc.next(); // def
  const nameTok = tc.next();
  if (nameTok.t !== 'NAME') throw new SimDiag(L.line, 'SyntaxError', '関数名が必要です', 'def のあとに名前を書いてください（例：def greet():）');
  tc.expectOp('(', L.line);
  const params = [];
  let seenStar = false;
  while (!tc.isOp(')')) {
    if (tc.isOp('/')) { tc.next(); if (!tc.eatOp(',')) break; continue; } // 位置専用の区切り
    let star = 0;
    if (tc.isOp('**')) { tc.next(); star = 2; seenStar = true; }
    else if (tc.isOp('*')) {
      tc.next(); star = 1; seenStar = true;
      if (tc.isOp(')') || tc.isOp(',')) { params.push({ name: null, bare: true }); if (!tc.eatOp(',')) break; continue; }
    }
    const p = tc.next();
    if (p.t !== 'NAME') throw new SimDiag(L.line, 'SyntaxError', '引数の名前が必要です', '');
    let ann = null;
    if (tc.isOp(':')) { tc.next(); ann = parseExpr(tc, L.line); } // 引数の型注釈（__annotations__ 用に保持）
    let def = null;
    if (tc.eatOp('=')) def = parseExpr(tc, L.line);
    params.push({ name: p.v, def, star, kwOnly: seenStar && star === 0, ann });
    if (!tc.eatOp(',')) break;
  }
  tc.expectOp(')', L.line);
  let retAnn = null;
  if (tc.isOp('->')) { tc.next(); retAnn = parseExpr(tc, L.line); } // 戻り値の型注釈（保持）
  tc.expectOp(':', L.line);
  const s = parseSuite(lines, i, indent, tc, L.line);
  return { stmts: [{ k: 'def', name: nameTok.v, params, body: s.body, line: L.line, retAnn }], next: s.next };
}
function parseTry(lines, i, indent, tc) {
  const L = lines[i];
  tc.next(); // try
  tc.expectOp(':', L.line);
  const s = parseSuite(lines, i, indent, tc, L.line);
  let cur = s.next;
  const handlers = [];
  let elseBody = null, finallyBody = null;
  while (cur < lines.length && lines[cur].indent === indent) {
    const tcx = new TC(lexText(lines[cur].text, lines[cur].line));
    if (tcx.isName('except')) {
      tcx.next();
      let types = null, asName = null, expr = null;
      if (!tcx.isOp(':')) {
        // バッチ4 Python追随：ハンドラ名の検証（未定義名→NameError／非例外→TypeError）と
        // 変数経由ハンドラの解決のため、ハンドラ式を式 AST として保持する。
        // except* は従来どおり except と同じ照合で扱う（グループの分割捕捉は未対応）。
        if (tcx.isOp('*')) tcx.next();
        expr = parseExpr(tcx, lines[cur].line);
        if (tcx.isOp(',')) { // カッコなしタプル形 except A, B:
          const items = [{ e: expr }];
          while (tcx.eatOp(',')) {
            if (tcx.isOp(':') || tcx.isName('as')) break;
            items.push({ e: parseExpr(tcx, lines[cur].line) });
          }
          if (items.length > 1) expr = { k: 'tuple', items, line: lines[cur].line };
        }
        // types は名前だけの形のとき従来どおり名前一覧、それ以外は空（照合は expr で行う）
        const flat = [];
        const collect = (n) => { if (n.k === 'name') flat.push(n.name); else if (n.k === 'tuple') { for (const it of n.items) collect(it.e); } else flat.push(null); };
        collect(expr);
        types = flat.every(x => x !== null) ? flat : [];
        if (tcx.isName('as')) { tcx.next(); const an = tcx.next(); if (an.t === 'NAME') asName = an.v; }
      }
      tcx.expectOp(':', lines[cur].line);
      const sh = parseSuite(lines, cur, indent, tcx, lines[cur].line);
      handlers.push({ types, asName, expr, body: sh.body, line: lines[cur].line });
      cur = sh.next; continue;
    }
    if (tcx.isName('else')) { tcx.next(); tcx.expectOp(':', lines[cur].line); const sh = parseSuite(lines, cur, indent, tcx, lines[cur].line); elseBody = sh.body; cur = sh.next; continue; }
    if (tcx.isName('finally')) { tcx.next(); tcx.expectOp(':', lines[cur].line); const sh = parseSuite(lines, cur, indent, tcx, lines[cur].line); finallyBody = sh.body; cur = sh.next; continue; }
    break;
  }
  if (!handlers.length && !finallyBody) throw new SimDiag(L.line, 'SyntaxError', 'try には except か finally が必要です', 'except: か finally: を続けて書いてください');
  return { stmts: [{ k: 'try', body: s.body, handlers, elseBody, finallyBody, line: L.line }], next: cur };
}
function parseWith(lines, i, indent, tc) {
  const L = lines[i];
  tc.next(); // with
  const items = [];
  while (true) {
    const e = parseExpr(tc, L.line);
    let asName = null;
    if (tc.isName('as')) { tc.next(); const an = tc.next(); if (an.t === 'NAME') asName = an.v; }
    items.push({ e, asName });
    if (!tc.eatOp(',')) break;
  }
  tc.expectOp(':', L.line);
  const s = parseSuite(lines, i, indent, tc, L.line);
  return { stmts: [{ k: 'with', items, body: s.body, line: L.line }], next: s.next };
}
function parseClass(lines, i, indent, tc) {
  const L = lines[i];
  tc.next(); // class
  const nameTok = tc.next();
  if (nameTok.t !== 'NAME') throw new SimDiag(L.line, 'SyntaxError', 'クラス名が必要です', 'class のあとに名前を書いてください');
  // B6-Py3：継承（基底クラスの並び）に対応する。キーワード引数
  // （metaclass= 等）はメタクラス機構がないため従来どおり未対応で止める。
  const bases = [];
  if (tc.eatOp('(')) {
    if (!tc.eatOp(')')) {
      while (true) {
        const kwTok = tc.peek(), afterKw = tc.peek(1);
        if (kwTok.t === 'NAME' && afterKw.t === 'OP' && afterKw.v === '=')
          throw new SimDiag(L.line, '未対応', 'メタクラス等のキーワード引数は未対応です', '基底クラスだけを書いてください');
        bases.push(parseExpr(tc, L.line));
        if (tc.eatOp(',')) { if (tc.eatOp(')')) break; continue; }
        tc.expectOp(')', L.line);
        break;
      }
    }
  }
  tc.expectOp(':', L.line);
  const s = parseSuite(lines, i, indent, tc, L.line);
  return { stmts: [{ k: 'class', name: nameTok.v, bases, body: s.body, line: L.line }], next: s.next };
}
function parseIf(lines, i, indent, tc) {
  const L = lines[i];
  const arms = [];
  let cur = i, curTc = tc, kw = 'if';
  let elseBody = null;
  while (true) {
    curTc.next(); // if / elif
    const cond = parseExpr(curTc, lines[cur].line);
    curTc.expectOp(':', lines[cur].line);
    const s = parseSuite(lines, cur, indent, curTc, lines[cur].line);
    arms.push({ cond, body: s.body, line: lines[cur].line, kw });
    cur = s.next;
    if (cur < lines.length && lines[cur].indent === indent) {
      const t2 = lexText(lines[cur].text, lines[cur].line);
      const tc2 = new TC(t2);
      if (tc2.isName('elif')) { curTc = tc2; kw = 'elif'; continue; }
      if (tc2.isName('else')) {
        tc2.next(); tc2.expectOp(':', lines[cur].line);
        const s2 = parseSuite(lines, cur, indent, tc2, lines[cur].line);
        elseBody = s2.body; cur = s2.next;
      }
    }
    break;
  }
  return { stmts: [{ k: 'if', arms, elseBody, line: L.line }], next: cur };
}
function parseFor(lines, i, indent, tc) {
  const L = lines[i];
  tc.next(); // for
  const target = parseTarget(tc, L.line);
  checkTarget(target, L.line, false);
  if (!tc.isName('in')) throw new SimDiag(L.line, 'SyntaxError', 'for のあとには「in」が必要です', '例：for x in [1, 2, 3]:');
  tc.next();
  const iter = parseExpr(tc, L.line);
  tc.expectOp(':', L.line);
  const s = parseSuite(lines, i, indent, tc, L.line);
  const el = parseLoopElse(lines, s.next, indent);
  return { stmts: [{ k: 'for', target, iter, body: s.body, elseBody: el.body, line: L.line }], next: el.next };
}
function parseWhile(lines, i, indent, tc) {
  const L = lines[i];
  tc.next(); // while
  const cond = parseExpr(tc, L.line);
  tc.expectOp(':', L.line);
  const s = parseSuite(lines, i, indent, tc, L.line);
  const el = parseLoopElse(lines, s.next, indent);
  return { stmts: [{ k: 'while', cond, body: s.body, elseBody: el.body, line: L.line }], next: el.next };
}
function parseLoopElse(lines, at, indent) {
  if (at < lines.length && lines[at].indent === indent) {
    const tc2 = new TC(lexText(lines[at].text, lines[at].line));
    if (tc2.isName('else')) { tc2.next(); tc2.expectOp(':', lines[at].line); const s2 = parseSuite(lines, at, indent, tc2, lines[at].line); return { body: s2.body, next: s2.next }; }
  }
  return { body: null, next: at };
}
function parseTargetItem(tc, line) {
  if (tc.isOp('*')) { tc.next(); return { k: 'starred', t: parsePostfix(tc, line, true), line }; }
  return parsePostfix(tc, line, true);
}
function parseTarget(tc, line) {
  // 代入・for のターゲット：名前 / タプル / 添字 / 星付き
  const first = parseTargetItem(tc, line);
  if (tc.isOp(',') || first.k === 'starred') {
    const items = [first];
    while (tc.eatOp(',')) { if (tc.isOp(':') || tc.isName('in') || tc.isOp('=') || tc.atEnd()) break; items.push(parseTargetItem(tc, line)); }
    return { k: 'ttuple', items, line };
  }
  return first;
}
// 代入・削除のターゲットとして書ける形かを構文段階で確かめる（R23-N11）。
// CPython ではリテラル等への代入はコンパイル時に SyntaxError になり、右辺は評価されない。
// 従来は検証が無く、1 = x のような行で右辺の未定義名への NameError という虚偽の帰属が出ていた。
function checkTarget(t, line, del) {
  if (!t) return;
  switch (t.k) {
    // R27-N20 兄弟表面：__debug__ は実 CPython では代入・削除・for の
    // ターゲットのいずれでも SyntaxError（cannot assign/delete __debug__）。
    case 'name':
      if (t.name === '__debug__') throw new SimDiag(line, 'SyntaxError', (del ? '「__debug__」は削除（del）できません（cannot delete __debug__）' : '「__debug__」には代入できません（cannot assign to __debug__）'), '__debug__ は Python が決める組み込み定数です');
      return;
    case 'sub': case 'slice': case 'attr': return;
    case 'ttuple': for (const it of t.items) checkTarget(it, line, del); return;
    case 'tuple': case 'list': for (const it of t.items) checkTarget(it.e, line, del); return;
    case 'starred': checkTarget(t.t, line, del); return;
    case 'star': checkTarget(t.e, line, del); return;
    case 'num': case 'str': case 'bool': case 'none': case 'ellipsis': case 'byteslit': case 'cxlit': case 'fstr':
      throw new SimDiag(line, 'SyntaxError', (del ? 'リテラルは削除（del）できません（cannot delete literal）' : 'リテラルには代入できません（cannot assign to literal）'), (del ? '削除' : '代入') + 'の対象は変数名・添字・属性などにしてください');
    case 'call':
      throw new SimDiag(line, 'SyntaxError', (del ? '関数呼び出しの結果は削除（del）できません（cannot delete function call）' : '関数呼び出しの結果には代入できません（cannot assign to function call）'), '');
    default:
      throw new SimDiag(line, 'SyntaxError', 'この形には' + (del ? '削除（del）' : '代入') + 'できません', (del ? '削除' : '代入') + 'の対象は名前・添字・属性・並び（タプル）の形にしてください');
  }
}
function parseSimpleStmts(tc, line) {
  const out = [];
  // CPython の文法では「;」は文と文の区切りで、文の無い所（行頭・「;」の直後・ブロック先頭）に置けない。
  // 末尾の「;」1つだけは許される（x = 1; は正しい）。従来は全位置の空文を黙って読み飛ばしていた（R23-N10）。
  let needStmt = true;
  while (!tc.atEnd()) {
    if (tc.isOp(';')) {
      if (needStmt) throw new SimDiag(line, 'SyntaxError', '「;」の前には文が必要です（空の文は書けません）', '「;」は文と文の区切り、または行末に1つだけ置けます');
      tc.next(); needStmt = true; continue;
    }
    out.push(parseSimple(tc, line));
    needStmt = false;
    if (!tc.atEnd() && !tc.isOp(';')) throw new SimDiag(line, 'SyntaxError', '文の終わり方が正しくありません', '1行に複数の文を書くときは「;」で区切ってください');
  }
  return out;
}
function parseSimple(tc, line) {
  const t = tc.peek();
  if (t.t === 'NAME') {
    if (t.v === 'return') { tc.next(); const e = tc.atEnd() || tc.isOp(';') ? null : parseExprList(tc, line); return { k: 'return', expr: e, line }; }
    if (t.v === 'break') { tc.next(); return { k: 'break', line }; }
    if (t.v === 'continue') { tc.next(); return { k: 'continue', line }; }
    if (t.v === 'pass') { tc.next(); return { k: 'pass', line }; }
    if (t.v === 'global' || t.v === 'nonlocal') { tc.next(); const names = []; while (!tc.atEnd() && !tc.isOp(';')) { const n = tc.next(); if (n.t === 'NAME') names.push(n.v); } return { k: 'global', kind: t.v, names, line }; }
    if (t.v === 'raise') { tc.next(); let e = null; if (!tc.atEnd() && !tc.isOp(';')) e = parseExpr(tc, line); while (!tc.atEnd() && !tc.isOp(';')) tc.next(); return { k: 'raise', e, line }; }
    if (t.v === 'del') { tc.next(); const targets = []; do { const tg = parsePostfix(tc, line); checkTarget(tg, line, true); targets.push(tg); } while (tc.eatOp(',')); return { k: 'del', targets, line }; }
    if (t.v === 'import' || t.v === 'from') { const parts = []; while (!tc.atEnd() && !tc.isOp(';')) { const x = tc.next(); parts.push(x.v); } return { k: 'import', text: parts.join(' ').replace(/ \. /g, '.').replace(/ ,/g, ','), line }; }
    if (t.v === 'assert') { tc.next(); const e = parseExpr(tc, line); const msg = tc.eatOp(',') ? parseExpr(tc, line) : null; return { k: 'assert', e, msg, line }; }
  }
  // 代入か式か：ターゲットを試しに読んで = が来るか見る
  const save = tc.i;
  // R22-N19：「:」や代入演算子まで読めた時点で代入文は確定する。その後の
  // 右辺の SyntaxError を式文としての読み直しで化けさせず、そのまま伝える。
  let committed = false;
  try {
    let tgt = parseTarget(tc, line);
    // 型注釈つき代入 x: int = 5。注釈式は __annotations__ 用に保持する
    // （B6-Py3）。値がなければ注釈だけの文
    let annExpr = null;
    if (tgt.k === 'name' && tc.isOp(':')) { tc.next(); committed = true; annExpr = parseExpr(tc, line); if (!tc.isOp('=') && !tc.isOp('+=') && !tc.isOp('-=') && !tc.isOp('*=') && !tc.isOp('/=') && !tc.isOp('//=') && !tc.isOp('%=') && !tc.isOp('**=') && !tc.isOp('|=') && !tc.isOp('&=') && !tc.isOp('^=') && !tc.isOp('<<=') && !tc.isOp('>>=') && !tc.isOp('@=')) return { k: 'annassign', target: tgt, ann: annExpr, line }; }
    if (tc.isOp('=') || tc.isOp('+=') || tc.isOp('-=') || tc.isOp('*=') || tc.isOp('/=') || tc.isOp('//=') || tc.isOp('%=') || tc.isOp('**=') || tc.isOp('|=') || tc.isOp('&=') || tc.isOp('^=') || tc.isOp('<<=') || tc.isOp('>>=') || tc.isOp('@=')) {
      committed = true;
      const op = tc.next().v;
      if (op === '=') {
        // 連鎖代入 a = b = 5：次のターゲットがさらに = を伴う間、ターゲットとして集める
        const targets = [tgt];
        while (true) {
          const sv = tc.i;
          try {
            const t2 = parseTarget(tc, line);
            if (tc.isOp('=')) { tc.next(); targets.push(t2); continue; }
          } catch (e) { if (e instanceof RangeError) throw e; /* ターゲットではない */ }
          tc.i = sv;
          break;
        }
        for (const t of targets) checkTarget(t, line, false);
        const rhs = parseExprList(tc, line);
        if (targets.length === 1) return { k: 'assign', target: tgt, expr: rhs, ann: annExpr, line };
        return { k: 'assignmulti', targets, expr: rhs, line };
      }
      checkTarget(tgt, line, false);
      const rhs = parseExprList(tc, line);
      return { k: 'aug', target: tgt, op: op.slice(0, -1), expr: rhs, line };
    }
  } catch (e) { if (e instanceof RangeError) throw e; if (committed && e instanceof SimDiag) throw e; /* 式として読み直す（深さ超過は解析の失敗ではないので飲み込まない：RG-56） */ }
  tc.i = save;
  const e = parseExpr(tc, line);
  return { k: 'expr', expr: e, line };
}
function parseExprList(tc, line) {
  // 代入・return の右辺はタプル表示であり、各要素の先頭の「*」は正当（R22-N19）。
  tc.starHead = true;
  const first = parseExpr(tc, line);
  if (tc.isOp(',')) {
    const items = [first];
    while (tc.eatOp(',')) { if (tc.atEnd() || tc.isOp(';')) break; tc.starHead = true; items.push(parseExpr(tc, line)); }
    return { k: 'tuple', items: items.map(x => ({ e: x })), line };
  }
  return first;
}

/* 式パーサ（優先順位の低い順） */
function parseExpr(tc, line) { return parseIfExp(tc, line); }
function parseIfExp(tc, line) {
  if (tc.peek().t === 'NAME' && tc.peek(1).t === 'OP' && tc.peek(1).v === ':=') { // ワルラス演算子（名前 := 式）
    const name = tc.next().v; tc.next();
    const e = parseExpr(tc, line);
    return { k: 'walrus', name, e, line };
  }
  const then = parseOr(tc, line);
  if (tc.isName('if')) {
    tc.next();
    const cond = parseOr(tc, line);
    if (!tc.isName('else')) throw new SimDiag(line, 'SyntaxError', '条件式（三項演算子）には else が必要です', '「値1 if 条件 else 値2」の形で書いてください');
    tc.next();
    const els = parseExpr(tc, line);
    return { k: 'ifexp', cond, then, els, line };
  }
  return then;
}
// RG-56（バッチ13回帰修正）：式の入れ子の深さの明示上限。
// 従来、深さの上限は再帰下降パーサの JS スタック溢れ（RangeError）を
// simulatePython が「入れ子が深すぎ」へ変換することだけに依存していた。
// しかしスタック溢れが起きる深さは V8 の最適化状態で変わる：R7-151 で
// 新設した analyzeCode（index.js）が scan／callsByLine 経由で1回の
// simulate あたりの parseProgram 実行回数を増やした（RG-56 到達時点で
// 従来139回→219回）ためパーサが最適化され、フレームが小さくなって
// 820重括弧でも溢れなくなり、内包表記の反復対象式が無エラーで完走した
// （最適化がさらに進むと素の代入形も同様にすり抜けることを対照実験で
// 確認済み）。そこで、式の再帰が必ず通る parseOr で深さを数え、上限を
// 超えたら RangeError 経路と同一の診断（対応外／入れ子が深すぎ）を
// 決定的に出す。内包表記の反復対象式と条件は parseGens が parseExpr
// ではなく parseOr を直接呼ぶため、parseExpr 側で数えると対象から
// 漏れる。parseOr で数えれば、括弧・呼び出し・リスト／辞書表示・
// 内包表記（反復対象・条件・要素）の全ての式位置が同じ検査を通る。
const MAX_EXPR_DEPTH = 100;
function parseOr(tc, line) {
  tc.exprDepth = (tc.exprDepth || 0) + 1;
  if (tc.exprDepth > MAX_EXPR_DEPTH) {
    tc.exprDepth--;
    throw new SimDiag(line, '対応外', 'コードの入れ子が深すぎて、この説明では読み取れませんでした', '');
  }
  try {
    let l = parseAnd(tc, line);
    while (tc.isName('or')) { tc.next(); l = { k: 'boolop', op: 'or', items: [l, parseAnd(tc, line)], line }; }
    return l;
  } finally {
    tc.exprDepth--;
  }
}
function parseAnd(tc, line) {
  let l = parseNot(tc, line);
  while (tc.isName('and')) { tc.next(); l = { k: 'boolop', op: 'and', items: [l, parseNot(tc, line)], line }; }
  return l;
}
function parseNot(tc, line) {
  if (tc.isName('not')) { tc.next(); return { k: 'un', op: 'not', e: parseNot(tc, line), line }; }
  return parseCmp(tc, line);
}
function parseCmp(tc, line) {
  const first = parseBitOr(tc, line);
  const pairs = [];
  while (true) {
    let op = null;
    const t = tc.peek();
    if (t.t === 'OP' && ['==', '!=', '<', '<=', '>', '>='].includes(t.v)) { op = t.v; tc.next(); }
    else if (tc.isName('in')) { op = 'in'; tc.next(); }
    else if (tc.isName('is')) { tc.next(); op = tc.isName('not') ? (tc.next(), 'is not') : 'is'; }
    else if (tc.isName('not') && tc.peek(1).t === 'NAME' && tc.peek(1).v === 'in') { op = 'not in'; tc.next(); tc.next(); }
    if (!op) break;
    pairs.push({ op, e: parseBitOr(tc, line) });
  }
  return pairs.length ? { k: 'cmp', first, pairs, line } : first;
}
function parseBitOr(tc, line) {
  let l = parseBitXor(tc, line);
  while (tc.isOp('|')) { tc.next(); l = { k: 'bin', op: '|', l, r: parseBitXor(tc, line), line }; }
  return l;
}
function parseBitXor(tc, line) {
  let l = parseBitAnd(tc, line);
  while (tc.isOp('^')) { tc.next(); l = { k: 'bin', op: '^', l, r: parseBitAnd(tc, line), line }; }
  return l;
}
function parseBitAnd(tc, line) {
  let l = parseShift(tc, line);
  while (tc.isOp('&')) { tc.next(); l = { k: 'bin', op: '&', l, r: parseShift(tc, line), line }; }
  return l;
}
function parseShift(tc, line) {
  let l = parseArith(tc, line);
  while (tc.isOp('<<') || tc.isOp('>>')) { const op = tc.next().v; l = { k: 'bin', op, l, r: parseArith(tc, line), line }; }
  return l;
}
function parseArith(tc, line) {
  let l = parseTerm(tc, line);
  while (tc.isOp('+') || tc.isOp('-')) { const op = tc.next().v; l = { k: 'bin', op, l, r: parseTerm(tc, line), line }; }
  return l;
}
function parseTerm(tc, line) {
  let l = parseUnary(tc, line);
  while (tc.isOp('*') || tc.isOp('/') || tc.isOp('//') || tc.isOp('%') || tc.isOp('@')) { const op = tc.next().v; l = { k: 'bin', op, l, r: parseUnary(tc, line), line }; }
  return l;
}
function parseUnary(tc, line) {
  // R22-N19：単項位置の「*」は、表示（タプル・集合・代入右辺の並び）の先頭
  // でのみ正当（呼び出し・リスト内は各パーサが先に処理する）。二項演算子の
  // 後など、それ以外の位置で「*」を無言で読み飛ばすと誤値が捏造されるため、
  // CPython と同じく SyntaxError で停止する。許可位置では tc.starHead を立てる。
  const starHead = tc.starHead; tc.starHead = false;
  if (tc.isOp('-') || tc.isOp('+') || tc.isOp('~')) { const op = tc.next().v; return { k: 'un', op, e: parseUnary(tc, line), line }; }
  if (tc.isOp('*') && !starHead) throw new SimDiag(line, 'SyntaxError', '「*」はここでは使えません（式の途中では展開できません）', '「*」による展開（アンパック）は、呼び出しの引数やリスト・タプルなどの並びの中でのみ使えます');
  return parsePower(tc, line);
}
function parsePower(tc, line) {
  const base = parsePostfix(tc, line);
  if (tc.isOp('**')) { tc.next(); return { k: 'bin', op: '**', l: base, r: parseUnary(tc, line), line }; }
  return base;
}
function parsePostfix(tc, line) { return parsePostfix2(tc, line, false); }
function parsePostfix2(tc, line, forTarget) {
  let e = parseAtom(tc, line);
  while (true) {
    if (tc.isOp('(')) {
      tc.next();
      const args = [], kwargs = {};
      let star = null;
      while (!tc.isOp(')')) {
        if (tc.isOp('**')) { tc.next(); args.push({ dstar: true, e: parseExpr(tc, line) }); }
        else if (tc.isOp('*')) { tc.next(); star = parseExpr(tc, line); args.push({ star: true, e: star }); }
        else if (tc.peek().t === 'NAME' && tc.peek(1).t === 'OP' && tc.peek(1).v === '=') { const kn = tc.next().v; tc.next(); kwargs[kn] = parseExpr(tc, line); }
        else { const e0 = parseExpr(tc, line); if (tc.isName('for')) { const gens = parseGens(tc, line); args.push({ e: { k: 'listcomp', gen: true, elt: e0, gens, line } }); } else args.push({ e: e0 }); }
        if (!tc.eatOp(',')) break;
      }
      tc.expectOp(')', line);
      e = { k: 'call', fn: e, args, kwargs, line };
    } else if (tc.isOp('[')) {
      tc.next();
      let lo = null, hi = null, step = null, isSlice = false, idx = null;
      if (!tc.isOp(':') && !tc.isOp(']')) { idx = parseExpr(tc, line); if (tc.isOp(',')) { const items = [{ e: idx }]; while (tc.eatOp(',')) { if (tc.isOp(']')) break; items.push({ e: parseExpr(tc, line) }); } idx = { k: 'tuple', items, line }; } }
      if (tc.isOp(':')) {
        isSlice = true; lo = idx; idx = null; tc.next();
        if (!tc.isOp(':') && !tc.isOp(']')) hi = parseExpr(tc, line);
        if (tc.isOp(':')) { tc.next(); if (!tc.isOp(']')) step = parseExpr(tc, line); }
      }
      tc.expectOp(']', line);
      if (!isSlice && idx === null) throw new SimDiag(line, 'SyntaxError', '[ ] の中に番号やキーがありません', '');
      e = isSlice ? { k: 'slice', obj: e, lo, hi, step, line } : { k: 'sub', obj: e, idx, line };
    } else if (tc.isOp('.')) {
      tc.next();
      const at = tc.next();
      if (at.t !== 'NAME') throw new SimDiag(line, 'SyntaxError', '「.」のあとには名前（メソッド名など）が必要です', '');
      e = { k: 'attr', obj: e, name: at.v, line };
    } else break;
  }
  return e;
}
function parseAtom(tc, line) {
  const t = tc.next();
  if (t.t === 'NUM') { if (t.cx) return { k: 'cxlit', v: t.v, line }; return { k: 'num', v: t.v, f: t.f, line }; }
  if (t.t === 'ELLIPSIS') return { k: 'ellipsis', line };
  if (t.t === 'BYTES') return { k: 'byteslit', v: t.v || [], line };
  if (t.t === 'STR') {
    if (t.unkstr) return { k: 'unkexpr', what: '\\N{...}（文字の名前で書くエスケープ）を含む文字列', line };
    // 連続文字列リテラルの連結
    let v = t.v, f = t.f;
    while (tc.peek().t === 'STR') { const n = tc.next(); v += n.v; f = f || n.f; }
    if (f) return parseFStr(v, line);
    return { k: 'str', v, line };
  }
  if (t.t === 'NAME') {
    if (t.v === 'True') return { k: 'bool', v: true, line };
    if (t.v === 'False') return { k: 'bool', v: false, line };
    if (t.v === 'None') return { k: 'none', line };
    if (t.v === 'yield' || t.v === 'await') {
      let what = t.v;
      if (t.v === 'yield' && tc.isName('from')) { tc.next(); what = 'yield from'; }
      const nt = tc.peek();
      if (nt.t !== 'END' && !(nt.t === 'OP' && [')', ']', '}', ',', ';', ':'].includes(nt.v))) parseExpr(tc, line);
      return { k: 'unkexpr', what, line };
    }
    if (t.v === 'lambda') { // 引数リストを読み飛ばす
      while (!tc.isOp(':') && !tc.atEnd()) tc.next();
      if (tc.isOp(':')) { tc.next(); parseExpr(tc, line); }
      return { k: 'lambda', line };
    }
    if (KEYWORDS.includes(t.v)) throw new SimDiag(line, 'SyntaxError', 'キーワード「' + t.v + '」はここでは使えません', '変数名や値の書き方を確認してください');
    return { k: 'name', name: t.v, line };
  }
  if (t.t === 'OP' && t.v === '(') {
    if (tc.isOp(')')) { tc.next(); return { k: 'tuple', items: [], line }; }
    tc.starHead = true; // タプル表示の要素先頭の「*」は正当（R22-N19）
    const first = parseExpr(tc, line);
    if (tc.isName('for')) { const gens = parseGens(tc, line); tc.expectOp(')', line); return { k: 'listcomp', gen: true, elt: first, gens, line }; }
    if (tc.isOp(',')) {
      const items = [{ e: first }];
      while (tc.eatOp(',')) { if (tc.isOp(')')) break; tc.starHead = true; items.push({ e: parseExpr(tc, line) }); }
      tc.expectOp(')', line);
      return { k: 'tuple', items, line };
    }
    tc.expectOp(')', line);
    return first;
  }
  if (t.t === 'OP' && t.v === '[') {
    if (tc.isOp(']')) { tc.next(); return { k: 'list', items: [], line }; }
    const items = [];
    const first = parseCompItem(tc, line);
    if (first.comp) { tc.expectOp(']', line); return first.comp; }
    items.push(first);
    while (tc.eatOp(',')) { if (tc.isOp(']')) break; items.push(parseCompItem(tc, line)); }
    tc.expectOp(']', line);
    return { k: 'list', items, line };
  }
  if (t.t === 'OP' && t.v === '{') {
    if (tc.isOp('}')) { tc.next(); return { k: 'dict', pairs: [], line }; }
    if (tc.isOp('**')) {
      const pairs = [];
      do { if (tc.isOp('}')) break; if (tc.isOp('**')) { tc.next(); pairs.push({ dstar: parseOr(tc, line) }); } else { const kk = parseExpr(tc, line); tc.expectOp(':', line); pairs.push({ k: kk, v: parseExpr(tc, line) }); } } while (tc.eatOp(','));
      tc.expectOp('}', line);
      return { k: 'dict', pairs, line };
    }
    tc.starHead = true; // 集合表示の要素先頭の「*」は正当（R22-N19）
    const firstK = parseExpr(tc, line);
    if (tc.isOp(':')) {
      tc.next();
      const firstV = parseExpr(tc, line);
      if (tc.isName('for')) { const gens = parseGens(tc, line); tc.expectOp('}', line); return { k: 'dictcomp', keyE: firstK, valE: firstV, gens, line }; }
      const pairs = [{ k: firstK, v: firstV }];
      while (tc.eatOp(',')) { if (tc.isOp('}')) break; if (tc.isOp('**')) { tc.next(); pairs.push({ dstar: parseOr(tc, line) }); continue; } const kk = parseExpr(tc, line); tc.expectOp(':', line); pairs.push({ k: kk, v: parseExpr(tc, line) }); }
      tc.expectOp('}', line);
      return { k: 'dict', pairs, line };
    }
    if (tc.isName('for')) { const gens = parseGens(tc, line); tc.expectOp('}', line); return { k: 'setcomp', elt: firstK, gens, line }; }
    const items = [{ e: firstK }];
    while (tc.eatOp(',')) { if (tc.isOp('}')) break; tc.starHead = true; items.push({ e: parseExpr(tc, line) }); }
    tc.expectOp('}', line);
    return { k: 'set', items, line };
  }
  if (t.t === 'OP' && t.v === '*') { const e = parseExpr(tc, line); return { k: 'star', e, line }; }
  // R31-N8：終端トークンの内部名（END）を学習者向け文言に出さない。
  // 式が途中で終わっている場合は ImageJ の前例（「文末」）に揃える。
  throw new SimDiag(line, 'SyntaxError', '式の読み取りに失敗しました（「' + (t.t === 'END' ? '文末' : (t.v !== undefined ? t.v : t.t)) + '」のあたり）', '括弧や演算子の書き方を確認してください');
}
function parseCompItem(tc, line) {
  if (tc.isOp('*')) { tc.next(); return { star: true, e: parseExpr(tc, line) }; }
  const e = parseExpr(tc, line);
  if (tc.isName('for')) { const gens = parseGens(tc, line); return { comp: { k: 'listcomp', elt: e, gens, line } }; }
  return { e };
}
function parseGens(tc, line) {
  const gens = [];
  while (tc.isName('for')) {
    tc.next();
    const target = parseTarget(tc, line);
    checkTarget(target, line, false);
    if (!tc.isName('in')) throw new SimDiag(line, 'SyntaxError', '内包表記には in が必要です', '');
    tc.next();
    const iter = parseOr(tc, line);
    const conds = [];
    while (tc.isName('if')) { tc.next(); conds.push(parseOr(tc, line)); }
    gens.push({ target, iter, conds });
  }
  return gens;
}
function parseFStr(raw, line) {
  // f文字列：{式} と {式:書式} を分解する。{{ }} はリテラル。
  const parts = [];
  let cur = '', i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '{' && raw[i + 1] === '{') { cur += '{'; i += 2; continue; }
    if (c === '}' && raw[i + 1] === '}') { cur += '}'; i += 2; continue; }
    if (c === '{') {
      let depth = 1, j = i + 1, inner = '';
      while (j < raw.length && depth > 0) {
        const cj = raw[j];
        if (cj === '"' || cj === "'") { inner += cj; j++; while (j < raw.length && raw[j] !== cj) { if (raw[j] === '\\' && j + 1 < raw.length) { inner += raw[j] + raw[j + 1]; j += 2; } else { inner += raw[j]; j++; } } if (j < raw.length) { inner += raw[j]; j++; } continue; }
        if (cj === '{') depth++; else if (cj === '}') { depth--; if (!depth) break; }
        inner += cj; j++;
      }
      if (depth > 0) throw new SimDiag(line, 'SyntaxError', 'f文字列の { が閉じられていません', '対応する } を足してください');
      if (cur) { parts.push({ s: cur }); cur = ''; }
      let exprText = inner, fmt = null, conv = null, doc = null;
      const colonAt = findFmtColon(inner);
      if (colonAt >= 0) { exprText = inner.slice(0, colonAt); fmt = inner.slice(colonAt + 1); }
      const cm = /!([rsa])\s*$/.exec(exprText);
      if (cm) { conv = cm[1]; exprText = exprText.slice(0, cm.index); }
      if (/=\s*$/.test(exprText) && !/[=!<>]=\s*$/.test(exprText)) { doc = exprText; exprText = exprText.replace(/=\s*$/, ''); }
      const sub = new TC(lexText(exprText.trim(), line));
      const e = parseExpr(sub, line);
      parts.push({ e, fmt, conv, doc });
      i = j + 1; continue;
    }
    cur += c; i++;
  }
  if (cur) parts.push({ s: cur });
  return { k: 'fstr', parts, line };
}
function findFmtColon(s) {
  // スライス・辞書リテラル・ラムダを含まない単純な式では、トップレベルの : を書式区切りとみなす
  let depth = 0, inStr = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") inStr = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ':' && depth === 0) return i;
  }
  return -1;
}

/* ============ 解釈（部分評価） ============ */
const MAX_STEPS = 400;
const MAX_ITERS = 10000;   // while 1つあたりの繰り返し上限（超えたら説明を打ち切る）
const MAX_RANGE = 100000;  // range を展開する上限（超えたら不明値）
const MAX_WORK = 300000;   // 全体の繰り返しの上限（超えたら説明を打ち切る）
const MAX_CALL_DEPTH = 40;

class Env {
  constructor(parent) { this.vars = new Map(); this.parent = parent || null; this.decl = null; }
  get(name) {
    if (this.decl && this.decl.has(name)) return this.decl.get(name).get(name);
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    return undefined;
  }
  set(name, v) { if (this.decl && this.decl.has(name)) { this.decl.get(name).set(name, v); return; } this.vars.set(name, v); if (this.track) this.track.map.set(name, this.track.line); }
  del(name) { if (this.decl && this.decl.has(name)) return this.decl.get(name).del(name); const had = this.vars.has(name) && this.vars.get(name) !== UNBOUND; if (had) { this.vars.delete(name); if (this.track) this.track.map.delete(name); } return had; }
  hasOwn(name) { return this.vars.has(name); }
}
class Flow extends Error { constructor(kind, value) { super(kind); this.kind = kind; this.value = value; } }
// try の except で捕まえられる診断か（エンジン内部の都合で出す診断と、文法エラーは捕まえられない）
// R25-N1：ただし raise 文で明示的に発生させた例外（raised フラグ付き）は、
// SyntaxError／IndentationError であっても実 CPython どおり except で捕捉できる。
// 解析時に発生する構文・インデントの診断は従来どおり捕捉対象外（実 CPython でも
// 構文エラーはコンパイル時に発生し、try では捕捉できない）。
const NONCATCH_KINDS = new Set(['対応外', '説明の上限', '無限ループの疑い', 'SyntaxError', 'IndentationError']);
function isCatchableDiag(e) { return e instanceof SimDiag && (e.raised === true || !NONCATCH_KINDS.has(e.kind)); }

function exprSrc(n) {
  if (!n) return '';
  switch (n.k) {
    case 'num': return fmtNum(NUM(n.v, n.f));
    case 'str': return "'" + n.v + "'";
    case 'bool': return n.v ? 'True' : 'False';
    case 'none': return 'None';
    case 'name': return n.name;
    case 'fstr': return 'f"…"';
    case 'list': return '[' + n.items.map(x => exprSrc(x.e)).join(', ') + ']';
    case 'tuple': return '(' + n.items.map(x => exprSrc(x.e)).join(', ') + ')';
    case 'dict': return '{' + n.pairs.map(p => p.dstar ? '**' + exprSrc(p.dstar) : exprSrc(p.k) + ': ' + exprSrc(p.v)).join(', ') + '}';
    case 'set': return '{' + n.items.map(x => exprSrc(x.e)).join(', ') + '}';
    case 'bin': return exprSrc(n.l) + ' ' + n.op + ' ' + exprSrc(n.r);
    case 'boolop': return n.items.map(exprSrc).join(' ' + n.op + ' ');
    case 'un': return n.op === 'not' ? 'not ' + exprSrc(n.e) : n.op + exprSrc(n.e);
    case 'cmp': return exprSrc(n.first) + n.pairs.map(p => ' ' + p.op + ' ' + exprSrc(p.e)).join('');
    case 'call': return exprSrc(n.fn) + '(…)';
    case 'attr': return exprSrc(n.obj) + '.' + n.name;
    case 'sub': return exprSrc(n.obj) + '[' + exprSrc(n.idx) + ']';
    case 'slice': return exprSrc(n.obj) + '[' + (n.lo ? exprSrc(n.lo) : '') + ':' + (n.hi ? exprSrc(n.hi) : '') + ']';
    case 'ifexp': return exprSrc(n.then) + ' if ' + exprSrc(n.cond) + ' else ' + exprSrc(n.els);
    case 'listcomp': return n.gen ? '(… for … in …)' : '[… for … in …]';
    default: return '…';
  }
}
// パスの見出し用に、条件式のソースを短く切り詰める（対応付けは構造情報のまま。表示だけの加工）
function shortSrcOf(node) { const s = exprSrc(node); return s.length > 26 ? s.slice(0, 26) + '…' : s; }

function walkNodes(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) walkNodes(x, fn); return; }
  fn(node);
  if (node.k === 'def') { for (const p of node.params || []) if (p.def) walkNodes(p.def, fn); return; } // 入れ子の関数の中身は別のスコープ
  for (const key of Object.keys(node)) { if (key === 'line') continue; const v = node[key]; if (v && typeof v === 'object') walkNodes(v, fn); }
}
function addTargetNames(t, set) {
  if (!t) return;
  if (t.k === 'name') set.add(t.name);
  else if (t.k === 'ttuple') t.items.forEach(x => addTargetNames(x, set));
  else if (t.k === 'tuple') t.items.forEach(x => addTargetNames(x.e, set));
  else if (t.k === 'starred') addTargetNames(t.t, set);
}
function assignedNames(stmts) {
  const set = new Set();
  walkNodes(stmts, n => {
    if (n.k === 'assign' || n.k === 'aug') addTargetNames(n.target, set);
    else if (n.k === 'assignmulti') n.targets.forEach(t => addTargetNames(t, set));
    else if (n.k === 'for') addTargetNames(n.target, set);
    else if (n.k === 'def') set.add(n.name);
    else if (n.k === 'class') set.add(n.name);
    else if (n.k === 'annassign') addTargetNames(n.target, set);
    else if (n.k === 'walrus') set.add(n.name);
    else if (n.k === 'with') n.items.forEach(it => { if (it.asName) set.add(it.asName); });
    else if (n.k === 'del') n.targets.forEach(t => addTargetNames(t, set));
    else if (n.k === 'unsupported' && n.names) n.names.forEach(x => set.add(x));
    else if (n.k === 'import') importNames(n.text || '').forEach(x => set.add(x));
  });
  return set;
}
const MUTATING_METHODS = new Set(['append', 'extend', 'insert', 'pop', 'remove', 'sort', 'reverse', 'clear', 'update', 'add', 'discard', 'setdefault', 'popitem', 'intersection_update', 'difference_update', 'symmetric_difference_update']);
function rootNameOf(node) { let n = node; while (n && (n.k === 'sub' || n.k === 'attr' || n.k === 'slice')) n = n.obj; return n && n.k === 'name' ? n.name : null; }
// ブロックの中で添字代入・変更系メソッドで「中身が書き換わるかもしれない」名前の根を集める
function mutatedRoots(stmts) {
  const roots = new Set();
  walkNodes(stmts, n => {
    if (n.k === 'assign' || n.k === 'aug') { const r = rootNameOf(n.target); if (r && n.target.k !== 'name') roots.add(r); }
    else if (n.k === 'assignmulti') n.targets.forEach(t => { const r = rootNameOf(t); if (r && t.k !== 'name') roots.add(r); });
    else if (n.k === 'del') n.targets.forEach(t => { const r = rootNameOf(t); if (r && t.k !== 'name') roots.add(r); });
    else if (n.k === 'call' && n.fn && n.fn.k === 'attr' && MUTATING_METHODS.has(n.fn.name)) { const r = rootNameOf(n.fn.obj); if (r) roots.add(r); }
  });
  return roots;
}
function declaredNames(stmts) { const set = new Set(); walkNodes(stmts, n => { if (n.k === 'global') n.names.forEach(x => set.add(x)); }); return set; }
function hasNode(stmts, pred) { let f = false; walkNodes(stmts, n => { if (!f && pred(n)) f = true; }); return f; }
const isPrintCall = (n) => n.k === 'call' && n.fn && n.fn.k === 'name' && n.fn.name === 'print';
class Interp {
  constructor(pathCtx) {
    this.diags = []; this.steps = []; this.output = [];
    this.globals = new Env(null);
    this.globals.track = { map: new Map(), line: 0 }; // グローバル変数の最終代入行（「最終状態」から該当行へ跳ぶため）
    this.outSegs = []; // 出力を行単位で対応付けるためのセグメント列 {text, line}
    this.iters = 0; this.depth = 0; this.quiet = 0; this.work = 0;
    this.stopped = false; this.outText = ''; this.pendingDec = []; this.truncated = false;
    // 分岐パスの列挙モード（simulatePythonPaths から渡される）。null のときは従来どおり単一の説明。
    // { decisions: Map(key→bool), log: [], counts: Map, bids: Map(node→id), capped: bool }
    this.pathCtx = pathCtx || null;
    // この実行で実際に評価された呼び出し（出現順・重複なし）。サイドパネルの「使う関数」は静的抽出ではなくこちらから取る
    this.dynCalls = []; this.dynCallSet = new Set();
    for(const [name,v] of Object.entries(pathCtx?.initial||{}))this.globals.set(name,fromModel(v));
  }
  noteCall(name, kind) { const key = kind + ':' + name; if (this.dynCallSet.has(key)) return; this.dynCallSet.add(key); this.dynCalls.push({ name, kind }); }
  // 分岐ノードの安定ID（AST の事前走査で付けた番号）。無い場合は -1（列挙対象にできないので従来の保留扱いに倒す）
  bidOf(node) { if (!this.pathCtx || !this.pathCtx.bids) return -1; const b = this.pathCtx.bids.get(node); return b === undefined ? -1 : b; }
  // 実行時に決まる分岐点での「このパスでの進み方」を決める。列挙側から指定があればそれに従い、
  // 無ければ既定値を取る。選択は log に記録され、列挙側が1つずつ反転させて別のパスを作る。
  // 同じ分岐点が cap 回を超えて現れたら、それ以降は選択点として数えず既定で進む（列挙の打ち切りとして記録）。
  branchChoice(baseKey, meta, defVal) {
    const ctx = this.pathCtx;
    const occ = (ctx.counts.get(baseKey) || 0) + 1;
    ctx.counts.set(baseKey, occ);
    const dv = (typeof defVal === 'function') ? !!defVal(occ) : !!defVal;
    const key = baseKey + '#' + occ;
    if (occ > (meta.cap || 12)) {
      // 上限を超えた分岐は選択点として数えない（既定で進む）。ただし記録には残し、打ち切りを正直に示す
      ctx.capped = true;
      ctx.log.push({ key, line: meta.line || 0, kind: meta.kind, taken: dv, text: (dv ? meta.textT : meta.textF), capped: true });
      return dv;
    }
    const taken = ctx.decisions.has(key) ? !!ctx.decisions.get(key) : dv;
    ctx.log.push({ key, line: meta.line || 0, kind: meta.kind, taken, text: taken ? meta.textT : meta.textF });
    if(meta.value){let domains=refineCondition(symbolic(meta.value),taken,ctx.domains||[{}],()=>this.tick());if(!domains.length){ctx.infeasible=true;throw new Flow('infeasible');}ctx.domains=domains;}
    if((meta.kind==='while'||meta.kind==='for')&&occ>=3&&taken){ctx.capped=true;this.truncated=true;this.step(meta.line,'2回より多く続く可能性があります。後続状態は未確定です');throw new Flow('budget');}
    return taken;
  }
  // パス列挙モードで、繰り返しの対象が実行時に決まる for を進める。
  // 「入らない（対象が空）」か「入る（要素は実行時に決まる値として、本体を1回分だけ代表して実行）」のどちらかを仮定する。
  execForcedFor(s,env,ctx){const bid=this.bidOf(s);let broke=false,count=0;for(;;){let taken=this.branchChoice('for:'+bid,{line:s.line,kind:'for',textT:'次の要素がある',textF:'ここで終了する'},occ=>occ<=1);if(!taken)break;this.step(s.line,'実行時の対象による繰り返し '+(++count)+'回目');this.assignTo(s.target,UNK('実行時の繰り返し要素'),env,s.line,false);try{this.execBlock(s.body,env,{...ctx,inLoop:true});}catch(e){if(e instanceof Flow&&e.kind==='break'){broke=true;break;}if(!(e instanceof Flow&&e.kind==='continue'))throw e;}}if(!broke&&s.elseBody)this.execBlock(s.elseBody,env,ctx);}
  // RG-65（R18-N7）：回数が静的に確定しているが大きすぎて展開できない for。
  // 対象が未知の場合の代表パス（0回／途中で終了）は到達不可能なので作らない。
  // 実物の先頭要素で代表回数だけ実行し、残りは打ち切りとして正直に告知する。
  execKnownCountFor(s, env, ctx, known) {
    const total = known.count;
    this.step(s.line, '「' + exprSrc(s.iter) + '」は ' + total + ' 回繰り返すことが決まっていますが、回数が多いため、はじめの数回だけを示します');
    let broke = false, n = 0;
    while (n < 2) {
      this.assignTo(s.target, NUM(known.start + n * known.step, false), env, s.line, false);
      this.step(s.line, '繰り返し ' + (n + 1) + '回目');
      n++;
      try { this.execBlock(s.body, env, { ...ctx, inLoop: true }); }
      catch (e) {
        if (e instanceof Flow && e.kind === 'break') { this.step(s.line, 'break で繰り返しを抜けます'); broke = true; break; }
        if (!(e instanceof Flow && e.kind === 'continue')) throw e;
      }
    }
    if (broke) return;
    // まだ回数が残っていることが静的に分かっているので、打ち切りとして告知する
    this.truncated = true;
    if (this.pathCtx) this.pathCtx.capped = true;
    this.step(s.line, '全 ' + total + ' 回のうち、ここでは ' + n + ' 回分だけを示しました。後続状態は未確定です');
    throw new Flow('budget');
  }

  diag(line, level, kind, msg, fix) {
    if (level === 'note' && kind === '対応外') throw new SimDiag(line, '未対応', msg, fix);
    this.diags.push({ line, level, kind, msg, fix: fix || '' });
  }
  step(line, text) {
    if (this.quiet > 0) return;
    if (this.steps.length >= MAX_STEPS) {
      if (!this.stepsCapped) { this.steps.push({ line, text: '（手順が多いため、以降の繰り返し部分は省略します）', depth: this.depth }); this.stepsCapped = true; }
      return;
    }
    this.steps.push({ line, text, depth: this.depth });
  }
  err(line, kind, msg, fix, excStr, excRepr, excAttrs) { const d = new SimDiag(line, kind, msg, fix); if (excStr !== undefined) { d.excStr = excStr; d.excRepr = excRepr || ''; } if (excAttrs !== undefined) d.excAttrs = excAttrs; throw d; }
  emitRaw(text, line) { this.outSegs.push({ text, line: line || 0 }); this.outText += text; }
  emitLine(text, line) { if (this.outText && !this.outText.endsWith('\n')) this.emitRaw('\n', 0); this.emitRaw(text + '\n', line || 0); }
  tick() { if (++this.work > MAX_WORK) throw new Flow('budget'); }
  // 実行されたか分からない部分: 中で代入される名前は「実行時に決まる値」にし、print があればその旨の出力行を出す
  unknownBlock(blocks, env, why, line) {
    const names = new Set(); const roots = new Set(); let prints = false;
    for (const b of blocks) { if (!b) continue; assignedNames(b).forEach(n => names.add(n)); mutatedRoots(b).forEach(n => roots.add(n)); if (hasNode(b, isPrintCall)) prints = true; }
    for (const n of names) env.set(n, UNK(why));
    for (const n of roots) { if (names.has(n)) continue; const cur = env.get(n); if (isMutableVal(cur)) poison(cur, why + 'で書き換えられたかもしれない値'); }
    if (prints) this.emitLine('（' + why + 'によって決まる出力）', line || 0);
  }
  // 実行されたか分からない部分の中に return がある場合、関数はそこで戻るかもしれない
  maybeReturnUnknown(blocks, ctx) {
    if (ctx && ctx.inFunc && hasNode(blocks, x => x.k === 'return')) throw new Flow('return', UNK('実行時に決まる戻り値'));
  }

  run(stmts) {
    try { this.execBlock(stmts, this.globals, {}); }
    catch (e) {
      if (e instanceof RangeError) { // 深い入れ子・巨大な式でも例外を外へ漏らさない（正直に打ち切る）
        this.truncated = true;
        this.diag(0, 'note', '説明の上限', 'コードの入れ子や計算が大きすぎて、この説明では最後まで追いきれませんでした。以降の出力と最終状態は実行して確認してください', '');
        this.emitLine('（大きすぎるため、ここから先の出力は省略します）');
      }
      else if (e instanceof SimDiag) {
        this.diag(e.line, 'error', e.kind, e.message, e.fix);
        // R30-P-N1（バッチ9 N3）：エンジンが発生させた RecursionError が
        // 捕捉されずにトップレベルへ届いた場合は、他の上限（繰返し予算）と
        // 同形式にする：truncated を立て、「説明の上限」診断（normalize で
        // limit 種別トレースになる）を残し、後続出力を省略として示す。
        // ユーザーが raise した RecursionError（depthLimit フラグなし）は
        // 通常のエラーとして扱い、打ち切りにはしない。
        if (e.depthLimit) {
          this.truncated = true;
          this.diag(0, 'note', '説明の上限', '関数の呼び出しの深さの上限（' + MAX_CALL_DEPTH + '）に達したため、ここで説明を打ち切りました。以降の出力と最終状態は実行して確認してください', '');
          this.emitLine('（呼び出しが深くなりすぎたため、ここから先の出力は省略します）');
        }
      }
      else if (e instanceof Flow && e.kind === 'budget') {
        this.truncated = true;
        this.diag(0, 'note', '説明の上限', '繰り返しが多いため、ここで説明を打ち切りました。以降の出力と最終状態は実行して確認してください', '');
        this.emitLine('（繰り返しが多いため、ここから先の出力は省略します）');
      }
      else if (e instanceof Flow) { /* トップレベルの return 等は文法側で扱う */ }
      else if(e?.category){this.diag(e.line||1,'error',e.category,e.message,'');}else throw e;
    }
    const vars = [];
    for (const [name, v] of this.globals.vars) {
      if (v === UNBOUND) continue;
      const vline = this.globals.track.map.get(name) || 0; // 最後に代入された行（「最終状態」から該当行へ跳ぶため）
      if (this.truncated) vars.push({ name, value: '（途中で打ち切ったため不明）', type: '不明', line: vline });
      else if (isFunc(v)) vars.push({ name, value: '関数 ' + name + '（定義）', type: 'function', line: vline });
      else { const s = reprFull(v); vars.push({ name, value: s.length > 20000 ? s.slice(0, 20000) + '…' : s, type: typeName(v), line: vline }); }
    }
    // 出力セグメントを表示行へ組み立て、各行に対応するコード行（print 等の文の行）を並行に持つ
    const outArr = [], outLineMap = [];
    let curOut = '', curOutLine = 0;
    for (const seg of this.outSegs) {
      const parts = seg.text.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) { if (!curOutLine) curOutLine = seg.line; outArr.push(curOut); outLineMap.push(curOutLine); curOut = ''; curOutLine = 0; }
        if (parts[i]) { if (!curOutLine) curOutLine = seg.line; curOut += parts[i]; }
      }
    }
    if (curOut !== '') { outArr.push(curOut); outLineMap.push(curOutLine); }
    this.output = outArr; this.outputLines = outLineMap;
    return { diags: this.diags, steps: this.steps, output: this.output, outputLines: this.outputLines, vars, dynCalls: this.dynCalls, truncated: this.truncated, captures:Object.fromEntries((this.pathCtx?.capture||[]).map(k=>[k,toModel(this.globals.get(k))])) };
  }
  execBlock(stmts, env, ctx) { for (const s of stmts) this.execStmt(s, env, ctx); }

  // 文の実行中は「いま実行している文の行」を記録し、グローバル変数への代入行の追跡に使う（入れ子は保存・復帰）
  execStmt(s, env, ctx) {
    const tr = this.globals.track; const prev = tr.line;
    if (s && s.line) tr.line = s.line;
    try { this.execStmtBody(s, env, ctx); } finally { tr.line = prev; }
  }

  execStmtBody(s, env, ctx) {
    switch (s.k) {
      case 'pass': return;
      case 'unsupported':
        this.err(s.line,'未対応','この構文は説明に対応していません：'+s.what);
        this.diag(s.line, 'note', '対応外', '「' + s.what + '」はこの説明では解釈できません。その部分の値は「実行時に決まる値」として扱います', '実際の動きは実行して確認してください');
        for (const n of s.names || []) env.set(n, UNK('「' + s.what.replace(/（(.*?)）/g, ' $1') + '」で決まる値'));
        for (const n of s.roots || []) { const cur = env.get(n); if (isMutableVal(cur)) poison(cur, '「' + s.what.replace(/（(.*?)）/g, ' $1') + '」の中で書き換えられたかもしれない値'); }
        if (s.prints) this.emitLine('（「' + s.what.replace(/（(.*?)）/g, ' $1') + '」の中の出力は実行時に決まります）', s.line);
        this.pendingDec = [];
        if (s.returns && ctx.inFunc) { this.step(s.line, 'この部分の中で return する可能性があるため、関数の戻り値は実行時に決まります'); throw new Flow('return', UNK('実行時に決まる戻り値')); }
        return;
      case 'try': {
        let pending = null, simErr = null;
        try { this.execBlock(s.body, env, ctx); }
        catch (e) { if (isCatchableDiag(e)) simErr = e; else pending = e; }
        if (simErr) {
          // バッチ4 Python追随：ハンドラは書かれた順に1つずつ評価・検証・照合する。
          // 先行ハンドラが一致すれば後続は評価されない（実 CPython の評価タイミング）。
          // ハンドラ式自体の誤り（未定義名→NameError／非例外→TypeError）は、元の例外に
          // 代わって伝播する（finally は従来どおり実行され、外側の try で捕捉できる）。
          let h = null, handlerErr = null;
          for (const hh of s.handlers) {
            if (hh.types === null && !hh.expr) { h = hh; break; } // 裸 except は常に一致する
            if (!hh.expr) { if ((hh.types || []).some(t => excMatches(simErr.kind, t))) { h = hh; break; } continue; }
            const res = this.resolveExceptHandler(hh, env, simErr.kind);
            if (res.err) { handlerErr = res.err; break; }
            if (res.match) { h = hh; break; }
          }
          if (handlerErr) pending = handlerErr;
          else if (!h) pending = simErr;
          else {
            this.step(s.line, 'エラー（' + simErr.kind + '）が起きたので、except の中身を実行します');
            if (h.asName) env.set(h.asName, simErr.excStr != null ? EXC(simErr.kind, simErr.excStr, simErr.excRepr, simErr.excAttrs) : UNK('発生したエラー（' + simErr.kind + '）'));
            try { this.execBlock(h.body, env, ctx); } catch (e2) { pending = e2; }
            if (h.asName) env.del(h.asName);
          }
        } else if (!pending && s.elseBody) {
          try { this.execBlock(s.elseBody, env, ctx); } catch (e2) { pending = e2; }
        }
        if (s.finallyBody) {
          try { this.execBlock(s.finallyBody, env, ctx); } catch (e3) { pending = e3; }
        }
        if (pending) throw pending;
        return;
      }
      case 'with': {
        // B6-Py3：ユーザー定義クラスのインスタンスは __enter__／__exit__
        // を実際に発火する（as には __enter__ の戻り値を束縛し、本体で
        // 例外が起きたら __exit__ に例外情報を渡して、真を返せば抑制する）。
        // それ以外の値（open() の戻り等）は従来どおりの扱いを保つ。
        let genCtx = false;
        const entered = [];
        let enterErr = null;
        try {
          for (const it of s.items) {
            const v = this.eval(it.e, env);
            if (v && v.__instance) {
              if (this.specialLookup(v, '__enter__') === undefined) this.err(s.line, 'AttributeError', typeName(v) + ' には __enter__ がありません（with には __enter__ と __exit__ を持つコンテキストマネージャが必要です）', '');
              const ev2 = this.callSpecial(v, '__enter__', s.line, env);
              if (it.asName) env.set(it.asName, ev2);
              entered.push(v);
              continue;
            }
            if (isIter(v) || (isUnk(v) && v.desc !== 'ファイルの内容')) genCtx = true; // open() の戻り（ファイルの内容）だけは出入りで出力を伴わない既知の形として除外する
            if (it.asName) env.set(it.asName, UNK('with で開いた値'));
          }
        } catch (e) { enterErr = e; }
        if (enterErr) { this.runExits(entered, enterErr, s.line); return; } // __exit__ が抑制しなければ runExits が再送出する。抑制されたら本体は実行しない
        if (genCtx) { // @contextmanager のジェネレータ等：出入りのタイミングで出る出力・副作用は再現できないため、正直にプレースホルダで示す
          this.diag(s.line, 'note', '対応外', 'この with の出入りで行われる処理（出入りの出力や後片付け）はこの説明では再現しません。出入りの出力は「実行時に決まる値」として示します', '');
          this.emitRaw('（with に入るときの出力は実行時に決まります）\n', s.line);
          let bodyErr = null;
          try { this.execBlock(s.body, env, ctx); } catch (e) { bodyErr = e; }
          this.emitRaw('（with を出るときの出力は実行時に決まります）\n', s.line);
          if (entered.length) this.runExits(entered, bodyErr, s.line);
          if (bodyErr) throw bodyErr;
          return;
        }
        let bodyErr = null;
        try { this.execBlock(s.body, env, ctx); } catch (e) { bodyErr = e; }
        if (entered.length) this.runExits(entered, bodyErr, s.line);
        else if (bodyErr) throw bodyErr;
        return;
      }
      case 'class': {
        // B6-Py3：基底クラスを評価し、type() 3引数形と同じ形のクラス値
        // （bases／baseTypeNames）を作る。MRO が一貫しない場合は実
        // CPython と同じくクラス定義の時点で TypeError にする。
        // クラス作成フック（__init_subclass__／__set_name__ 等）は裁定
        // どおり発火しない。
        const bases = []; const baseTypeNames = [];
        for (const be of (s.bases || [])) {
          const b = this.eval(be, env);
          if (isUnk(b)) this.err(s.line, '未対応', '基底クラスの値が実行時に決まるため、継承関係を確定できません', '基底には定義済みのクラスを書いてください');
          if (b && b.__class) { bases.push(b); continue; }
          if (b && b.__type) { baseTypeNames.push(b.__type); continue; }
          if (b && b.__builtin && (TYPE_BUILTINS.includes(b.__builtin) || EXC_NAMES.has(b.__builtin))) { baseTypeNames.push(b.__builtin); continue; }
          // A6監査PYF-04：__mro_entries__ を定義したインスタンスが基底に
          // 来た場合は、未対応の object.__mro_entries__ を名指しする
          if (b && b.__instance && this.specialLookup(b, '__mro_entries__') !== undefined)
            this.err(s.line, '未対応', 'object.__mro_entries__（基底クラスの差し替え）はこの説明では対応していません', '');
          // 高度A7班是正：標準ライブラリのクラスは「型」であるため、従来の
          // 「型だけを書いてください」は虚偽の理由だった。未対応である旨を
          // 名指しで正直に止める（例：class C(enum.Enum)）。
          if (b && b.__ncls) this.err(s.line, '未対応', '標準ライブラリのクラス「' + b.__ncls + '」を基底にする継承はこの説明では対応していません', '組み込み型や自分で定義したクラスを基底にしてください');
          this.err(s.line, 'TypeError', '基底クラスには型だけを書いてください（bases must be types）', '');
        }
        const dupKeys = new Set();
        for (const b of [...bases.map((c) => 'c' + _mroId(c)), ...baseTypeNames.map((n) => 't' + n)])
          if (dupKeys.has(b)) this.err(s.line, 'TypeError', '基底クラスが重複しています（duplicate base class）', '');
          else dupKeys.add(b);
        const classEnv = new Env(env);
        try { this.execBlock(s.body, classEnv, { ...ctx, inFunc: false, inLoop: false }); } catch (e) { if (!(e instanceof Flow)) throw e; }
        for (const value of classEnv.vars.values()) if (isFunc(value)) value.env = env;
        const cls = { __class: true, cname: s.name, cenv: classEnv, bases, baseTypeNames };
        // クラス本体の型注釈（x: int / x: int = 5）を __annotations__ 用に集める
        const annDict = DICT();
        let hasAnn = false;
        for (const st of (s.body || [])) {
          const annNode = st && st.k === 'annassign' ? st.ann : st && st.k === 'assign' && st.target && st.target.k === 'name' ? st.ann : null;
          const annName = st && (st.k === 'annassign' || st.k === 'assign') && st.target && st.target.k === 'name' ? st.target.name : null;
          if (annNode && annName) {
            const av = this.eval(annNode, classEnv);
            const tv = (av && av.__builtin && ['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set'].includes(av.__builtin)) ? TYPEVAL(av.__builtin) : av;
            dictSet(annDict, annName, tv); hasAnn = true;
          }
        }
        if (hasAnn) cls.annDict = annDict;
        if (_linearize(cls, new Set()) === null)
          this.err(s.line, 'TypeError', 'クラス「' + s.name + '」の継承順序（MRO）を一貫して決められません（Cannot create a consistent method resolution order）', '基底クラスの並び順を見直してください');
        // B6監査D11：クラス作成フック（__init_subclass__／__set_name__）は
        // 発火しない（未対応）。関係する定義がある場合は黙って成功せず止める。
        for (const b of bases) if (classLookup(b, '__init_subclass__') !== undefined) this.err(s.line, '未対応', 'object.__init_subclass__（クラス作成フック）はこの説明では対応していません', '');
        for (const value of classEnv.vars.values()) if (value && value.__instance && this.specialLookup(value, '__set_name__') !== undefined) this.err(s.line, '未対応', 'object.__set_name__（クラス作成フック）はこの説明では対応していません', '');
        let clsVal = cls;
        const decs = this.pendingDec; this.pendingDec = [];
        for (let k = decs.length - 1; k >= 0; k--) {
          const dv = this.eval(decs[k].expr, env);
          clsVal = this.callFn(dv, [clsVal], env, decs[k].line);
          this.step(decs[k].line, 'デコレータ「' + exprSrc(decs[k].expr) + '」をクラス「' + s.name + '」に適用します');
        }
        env.set(s.name, clsVal);
        this.step(s.line, 'クラス「' + s.name + '」を定義します（中身の代入はクラスの属性になります）');
        return;
      }
      case 'annassign': return; // 型注釈だけの文：名前は作られない（関数内では代入前の名前として扱う）
      case 'decorator':
        this.pendingDec.push(s);
        return;
      case 'global': {
        for (const n of s.names) {
          if (env === this.globals) continue;
          if (s.kind === 'global') { if (!env.decl) env.decl = new Map(); env.decl.set(n, this.globals); continue; }
          let e = env.parent; while (e && e !== this.globals && !e.vars.has(n)) e = e.parent;
          if (!e || e === this.globals) this.err(s.line, 'SyntaxError', 'nonlocal の「' + n + '」に対応する外側の関数の変数がありません', '');
          if (!env.decl) env.decl = new Map(); env.decl.set(n, e);
        }
        this.step(s.line, (s.kind === 'global' ? 'グローバル' : '外側の関数') + 'の変数「' + s.names.join('、') + '」を、この関数の中から書き換えられるようにします');
        return;
      }
      case 'del': {
        for (const t of s.targets) {
          if (t.k === 'name') { if (!env.del(t.name)) this.err(s.line, 'NameError', '変数「' + t.name + '」はありません', ''); this.step(s.line, '変数「' + t.name + '」を消します'); continue; }
          if (t.k === 'sub') {
            const obj = this.eval(t.obj, env), idx = this.eval(t.idx, env);
            if (isUnk(idx)) { if (isMutableVal(obj)) poison(obj, '消されたかもしれない値'); continue; }
            if (isUnk(obj)) continue;
            if (isList(obj)) { this.subGet(obj, idx, s.line); let i = Math.trunc(idx.v); if (i < 0) i += obj.__list.length; obj.__list.splice(i, 1); this.step(s.line, 'リストの [' + reprVal(idx) + '] を消します → ' + reprVal(obj)); continue; }
            if (isDict(obj)) { this.subGet(obj, idx, s.line); obj.__dict.delete(dictKeyId(idx)); this.step(s.line, '辞書のキー ' + reprVal(idx) + ' を消します'); continue; }
            if (obj && obj.__native) { const d = nativeClassDef(obj.__native); const ctx = this.stdlibCtx(env, s.line); if (d && d.delitem) { d.delitem(ctx, obj, idx); this.step(s.line, typeName(obj) + ' の要素 ' + reprVal(idx) + ' を消します'); continue; } this.err(s.line, 'TypeError', typeName(obj) + ' の要素は del で消せません', ''); }
            // B6-Py3：__delitem__ を発火する
            if (obj && obj.__instance && this.specialLookup(obj, '__delitem__') !== undefined) { this.callSpecialArgs(obj, '__delitem__', [idx], s.line, env); this.step(s.line, '「' + exprSrc(t.obj) + '」の要素を __delitem__ で消します'); continue; }
            this.err(s.line, 'TypeError', typeName(obj) + ' の要素は del で消せません', '');
          }
          if (t.k === 'slice') {
            const obj = this.eval(t.obj, env);
            const lo = t.lo ? this.eval(t.lo, env) : null, hi = t.hi ? this.eval(t.hi, env) : null, st = t.step ? this.eval(t.step, env) : null;
            if (isUnk(obj)) continue;
            if (!isList(obj)) this.err(s.line, 'TypeError', typeName(obj) + ' の要素は del で消せません', '');
            const ix = this.sliceIdx(obj.__list.length, lo, hi, st, s.line);
            if (ix === null) { this.markUnknownList(obj, t.obj, env, s.line); continue; }
            const kill = new Set(ix.idx); const keep = obj.__list.filter((_, k) => !kill.has(k)); obj.__list.length = 0; obj.__list.push(...keep);
            this.step(s.line, '「' + exprSrc(t.obj) + '」の一部（スライス）を消します → ' + reprVal(obj));
            continue;
          }
          // B6-Py3：属性の del は __delattr__／deleter／__delete__ を発火する。
          // B7：ネイティブ値・ネイティブクラス・モジュール属性の del もここで扱う（統合第2弾で合成）。
          if (t.k === 'attr') {
            const obj = this.eval(t.obj, env);
            if (obj && obj.__native) { const d = nativeClassDef(obj.__native); const ctx = this.stdlibCtx(env, s.line); if (d && d.delattr) { d.delattr(ctx, obj, t.name); continue; } if (obj.__attrsBag && obj.__attrsBag.has(t.name)) { obj.__attrsBag.delete(t.name); continue; } this.err(s.line, 'AttributeError', typeName(obj) + ' オブジェクトには属性「' + t.name + '」がありません', ''); }
            if (obj && obj.__ncls) { deleteClassAttrOverride(obj.__ncls, t.name); continue; }
            if (obj && obj.mod && isStdlibModule(obj.mod)) { deleteModuleAttrOverride(obj.mod, t.name); continue; }
            if (obj && obj.__instance) { this.delAttrInstance(obj, t.name, s.line, env); this.step(s.line, '属性「' + t.name + '」を消します'); continue; }
            if (obj && obj.__class) { if (obj.cenv.vars.has(t.name)) { obj.cenv.vars.delete(t.name); this.step(s.line, 'クラス属性「' + t.name + '」を消します'); continue; } this.err(s.line, 'AttributeError', '属性がありません：' + t.name, ''); }
          }
          this.diag(s.line, 'note', '対応外', 'この形の del はこの説明では解釈できません', '');
          if (t.k === 'attr') { const base = t.obj; if (base && base.k === 'name') env.set(base.name, UNK('del の結果')); }
        }
        return;
      }
      case 'assert': {
        const t = this.truthyOf(this.eval(s.e, env), s.line, env);
        if (t === null) { this.step(s.line, 'assert の条件は実行時に決まります'); return; }
        if (!t) { const mv = s.msg ? this.eval(s.msg, env) : null; const known = mv !== null && !isUnk(mv); this.err(s.line, 'AssertionError', known ? strVal(mv) : 'assert の条件が不成立（False）でした', '', known ? strVal(mv) : undefined, known ? reprVal(mv) : undefined); }
        this.step(s.line, 'assert の条件を確かめます（成立（True）なので続けます）');
        return;
      }
      case 'raise': {
        if (!s.e) { this.diag(s.line, 'note', '対応外', '引数のない raise はこの説明では解釈できません', ''); return; }
        // R25-N1：raise する名前・値を検証する（docs.python.org「Built-in Exceptions」／
        // 実 CPython 3.12 の規則）。実在の組み込み例外だけを受理し、未定義名は NameError、
        // 例外クラスを継承しないクラス・値は TypeError で名指し停止する。
        // ユーザー定義クラスは継承（class X(Exception): の形）がこのエンジンでは未対応
        // （parseClass が「継承・メタクラスは未対応」で停止する）のため、例外を継承した
        // ユーザー定義例外は作れず、通常クラスの raise は TypeError が実 CPython と一致する。
        const throwExc = (kind, msg, excStr, excRepr, excAttrs) => {
          const d = new SimDiag(s.line, kind, msg, '');
          if (excStr !== undefined) { d.excStr = excStr; d.excRepr = excRepr || ''; }
          if (excAttrs !== undefined) d.excAttrs = excAttrs;
          d.raised = true; // raise 文で明示的に発生させた例外は SyntaxError 等でも except で捕捉できる
          throw d;
        };
        const notException = (what) => this.err(s.line, 'TypeError', 'raise できるのは例外クラス（BaseException を継承したクラス）かそのインスタンスだけです（' + what + 'は例外ではありません）', 'raise には例外クラスの名前か、そのインスタンスを使ってください');
        let headName = null, isCall = false;
        if (s.e.k === 'call' && s.e.fn.k === 'name') { headName = s.e.fn.name; isCall = true; }
        else if (s.e.k === 'name') headName = s.e.name;
        // B7 統合時の基盤修正 F-B：モジュール属性形の raise
        // （raise locale.Error("x")／raise locale.Error）を解釈する。
        // 属性式を評価し、例外値なら送出、例外クラス（ncls）なら生成して送出する。
        if (headName === null && STDLIB_MODULES.size && (s.e.k === 'attr' || (s.e.k === 'call' && s.e.fn.k === 'attr'))) {
          const v = this.eval(s.e, env);
          if (v && v.__exc) throwExc(v.kind, v.text || v.kind + ' を発生させました', v.text, v.argRepr || '', v.excAttrs);
          if (v && v.__ncls) { const nd = nativeClassDef(v.__ncls); if (nd && nd.exc) throwExc(nd.exc, nd.exc + ' を発生させました', '', ''); }
          if (isUnk(v)) { this.diag(s.line, 'note', '対応外', 'この形の raise はこの説明では解釈できません', ''); return; }
          notException('属性の値（' + typeName(v) + '）');
        }
        if (headName === null && STDLIB_MODULES.size && s.e.k === 'call') {
          // 呼び出し結果の例外値を raise する形（raise mod.make_error() 等）
          const v = this.eval(s.e, env);
          if (v && v.__exc) throwExc(v.kind, v.text || v.kind + ' を発生させました', v.text, v.argRepr || '', v.excAttrs);
          if (isUnk(v)) { this.diag(s.line, 'note', '対応外', 'この形の raise はこの説明では解釈できません', ''); return; }
          notException('呼び出しの戻り値（' + typeName(v) + '）');
        }
        if (headName === null) {
          // リテラル等の確定値は例外ではない（実 CPython では TypeError）
          if (['num', 'str', 'bool', 'none', 'ellipsis', 'list', 'tuple', 'dict', 'set'].includes(s.e.k)) notException('値 ' + exprSrc(s.e));
          this.diag(s.line, 'note', '対応外', 'この形の raise はこの説明では解釈できません', ''); return;
        }
        const bound = env.get(headName);
        if (bound === UNBOUND) this.err(s.line, 'UnboundLocalError', '関数の中で代入している変数「' + headName + '」を、代入する前に使っています（関数の中で代入した名前は、その関数のローカル変数になります）', '外側の変数を使いたいなら global ' + headName + ' と宣言するか、引数として渡してください');
        if (bound && bound.__class) notException('クラス「' + headName + '」');
        if (!isCall && bound && bound.__exc) throwExc(bound.kind, bound.text || bound.kind + ' を発生させました', bound.text, bound.argRepr || '', bound.excAttrs);
        let effName = headName;
        if (bound && bound.__builtin) {
          if (EXC_NAMES.has(bound.__builtin)) effName = bound.__builtin; // x = ValueError のような別名経由
          else notException('「' + headName + '」');
        } else if (bound !== undefined) {
          // 変数に束縛された確定値・関数の raise。値が未確定なら断定できないため従来どおり対応外に倒す
          if (isUnk(bound)) { this.diag(s.line, 'note', '対応外', 'この形の raise はこの説明では解釈できません', ''); return; }
          if (!isCall && bound && bound.__ncls) { const nd = nativeClassDef(bound.__ncls); if (nd && nd.exc) throwExc(nd.exc, nd.exc + ' を発生させました', '', ''); }
          if (!isCall) notException('「' + headName + '」の値（' + typeName(bound) + '）');
          const v = this.eval(s.e, env); // 呼び出し不可なら TypeError で停止する
          if (v && v.__exc) throwExc(v.kind, v.text || v.kind + ' を発生させました', v.text, v.argRepr || '', v.excAttrs);
          if (isUnk(v)) { this.diag(s.line, 'note', '対応外', 'この形の raise はこの説明では解釈できません', ''); return; }
          notException('「' + headName + '」の戻り値（' + typeName(v) + '）');
        }
        if (!EXC_NAMES.has(effName)) {
          if (PY_BUILTINS.has(effName) || BUILTIN_NAMES.includes(effName)) notException('「' + effName + '」');
          this.err(s.line, 'NameError', '変数「' + headName + '」はまだ作られていません（値が入っていません）', 'raise できるのは実在の例外クラスだけです。名前の綴り（大文字・小文字）が合っているか確認してください');
        }
        const kind = effName;
        let msg = '', excStr, excRepr;
        if (isCall) {
          const vals = s.e.args.map(a => this.eval(a.e, env));
          // R26-N5：KeyError の __str__ は、引数が1つのときその引数の repr を返す
          // （docs.python.org「Built-in Exceptions」KeyError の項／実 CPython 3.12.3 実測）。
          // それ以外の例外の str は従来どおり引数の文字列化（str）と一致する。
          // 未捕捉時の表示行（msg）も同じ excStr を使うため、全表面が揃う。
          if (vals.length === 1 && !isUnk(vals[0])) { excRepr = reprVal(vals[0]); excStr = kind === 'KeyError' ? excRepr : strVal(vals[0]); msg = excStr; }
          else if (vals.length === 0) { excStr = ''; excRepr = ''; }
          else if (vals.length > 1 && vals.every(v => !isUnk(v))) { excStr = reprVal(TUPLE(vals)); excRepr = vals.map(v => reprVal(v)).join(', '); } // str はタプル表記、repr は引数を並べた形
          else if (vals.length) msg = '（実行時に決まる値）';
        } else { excStr = ''; excRepr = ''; }
        throwExc(kind, msg || kind + ' を発生させました', excStr, excRepr);
      }
      case 'import': {
        const t = (s.text || '').trim();
        // 高度モード B7：stdlib レジストリに登録のあるモジュールは汎用経路で
        // 取り込む。登録が無い（簡易モード）場合は従来どおり math のみ扱う。
        if (STDLIB_MODULES.size && this.tryStdlibImport(t, env, s.line)) return;
        const plainM = /^import\s+math(?:\s+as\s+(\w+))?\s*$/.exec(t);
        const fromM = /^from\s+math\s+import\s+\(?(.+?)\)?\s*$/.exec(t);
        if (!plainM && !fromM)
          this.err(s.line, '未対応', 'このモジュールの読み込みは未対応です。後続の結果は生成しません', '');
        // R25-N13：説明文面は実際の束縛挙動に合わせる。math の定数・関数は
        // 「実行時に決まる値」ではなく、属性形と同じ決定的な扱いを受ける
        // （確定計算できるのは sqrt／fabs／floor／ceil と定数で、それ以外は
        // 属性形と同じく未確定値になる。mathCall／リファレンスの math 項目と一致）。
        if (plainM) {
          const alias = plainM[1] || 'math';
          this.diag(s.line, 'note', 'import', 'math モジュールを読み込み、名前「' + alias + '」で使えるようにします。' + alias + '.sqrt のようにモジュールの定数・関数を使うと、決定的に計算できるもの（sqrt／fabs／floor／ceil と定数 pi／e／tau／inf／nan）はその値で計算し、それ以外は未確定値として扱います', '');
          const u = UNK('モジュール「math」の内容'); u.mod = 'math'; env.set(alias, u);
          return;
        }
        // R24-N23：from-import でも属性形と同じ確定計算が効くよう、
        // 定数は実値、関数は math モジュールへの束縛メソッド参照として
        // 取り込む。import * は黙って何もしないのではなく、
        // モジュールの公開名（定数と関数）を全て取り込む。
        // R25-N23：取り込む名前の実在を検証する。math に無い名前は
        // 実 CPython と同じく ImportError で名指し停止する（従来は検証がなく、
        // 実在しない名前まで束縛メソッド参照として捏造していた）。
        const mathMod = UNK('モジュール「math」の内容'); mathMod.mod = 'math';
        const parts = fromM[1].split(',').map(x => x.trim()).filter(x => x);
        const isStar = parts.some(p => p.split(/\s+as\s+/)[0].trim() === '*');
        if (isStar) {
          this.diag(s.line, 'note', 'import', 'math モジュールの公開名（定数と関数）を全て取り込み、それぞれの名前で使えるようにします。定数は実値になり、関数は math の属性形と同じく、決定的に計算できるものはその値で計算します', '');
        } else {
          const desc = parts.map(p => { const q = p.split(/\s+as\s+/).map(x => x.trim()); return q.length > 1 ? q[0] + '（名前「' + q[1] + '」として）' : q[0]; }).join('、');
          this.diag(s.line, 'note', 'import', 'math モジュールから ' + desc + 'を取り込み、束縛します。定数は実値になり、関数は math の属性形と同じく、決定的に計算できるものはその値で計算します', '');
        }
        for (const part of parts) {
          const p = part.split(/\s+as\s+/); const orig = p[0].trim();
          if (orig === '*') { for (const c of Object.keys(MATH_CONST)) env.set(c, NUM(MATH_CONST[c], true)); for (const f of MATH_FUNCS) env.set(f, METHODREF(mathMod, f)); continue; }
          if (!orig) continue;
          if (!(orig in MATH_CONST) && !MATH_FUNCS.includes(orig))
            this.err(s.line, 'ImportError', 'math モジュールから「' + orig + '」は import できません（math にその名前はありません）', 'import する名前の綴りを確認してください（実在する名前だけが取り込めます）');
          if (orig in MATH_CONST) env.set((p[1] || p[0]).trim(), NUM(MATH_CONST[orig], true));
          else env.set((p[1] || p[0]).trim(), METHODREF(mathMod, orig));
        }
        return;
      }
      case 'expr': {
        const v = this.eval(s.expr, env);
        if (s.expr.k === 'call' && s.expr.fn.k === 'attr') this.methodStepNote(s.expr, v);
        return;
      }
      case 'assign': {
        const start = this.steps.length;
        const v = this.eval(s.expr, env);
        this.assignTo(s.target, v, env, s.line, true);
        const notes = this.steps.slice(start);
        if (notes.length > 1 && notes.every(n => n.line === s.line && n.depth === notes[0].depth))
          this.steps.splice(start, notes.length, {...notes[0], text: notes.map(n => n.text).join('。')});
        return;
      }
      case 'assignmulti': {
        const v = this.eval(s.expr, env);
        for (const t of s.targets) this.assignTo(t, v, env, s.line, true);
        return;
      }
      case 'aug': {
        const t = s.target;
        if (t.k === 'sub') { // 添字は1回だけ評価する（CPython と同じ。x[idx()] += 1 で idx() は1回だけ呼ばれる）
          const obj = this.eval(t.obj, env);
          const idx = this.eval(t.idx, env);
          if (isUnk(obj) || isUnk(idx)) { const rn = rootNameOf(t); if (rn) { const curR = env.get(rn); if (isMutableVal(curR)) poison(curR, '書き換えられたかもしれない値'); } return; }
          const curS = this.subGet(obj, idx, s.line);
          const rhsS = this.eval(s.expr, env);
          const nvS = this.binOpInPlace(s.op, curS, rhsS, s.line);
          if (nvS !== INPLACE_DONE) this.subSet(obj, idx, nvS, s.line);
          this.step(s.line, '「' + exprSrc(t.obj) + '」の [' + reprVal(idx) + '] を ' + s.op + '= で書き換えます → ' + reprVal(obj));
          return;
        }
        const cur = this.readTarget(t, env, s.line);
        const rhs = this.eval(s.expr, env);
        const nv = this.binOpInPlace(s.op, cur, rhs, s.line);
        if (nv === INPLACE_DONE) { if (t.k === 'name') this.step(s.line, '「' + t.name + '」の中身を直接書き換えます → ' + reprVal(cur)); }
        else this.assignTo(t, nv, env, s.line, true);
        return;
      }
      case 'if': {
        let forcedFalse = false;
        for (const arm of s.arms) {
          const c = this.eval(arm.cond, env);
          const t = this.truthyOf(c, arm.line || s.line, env);
          if (t === null) {
            const bid = this.bidOf(s);
            if (!this.pathCtx || bid < 0) {
              this.step(s.line, '条件「' + exprSrc(arm.cond) + '」は実行時に決まる値を含むため、どちらに進むかは実行してみないと分かりません（この説明では分岐の中身は省略し、中で代入される変数は「実行時に決まる値」とします）');
              const from = s.arms.indexOf(arm);
              this.unknownBlock([...s.arms.slice(from).map(a => a.body), s.elseBody], env, '実行時の条件', s.line);
              this.maybeReturnUnknown([...s.arms.slice(from).map(a => a.body), s.elseBody], ctx);
              return;
            }
            // パス列挙モード：このパスでは真／偽のどちらだったかを仮定して進む（値は捏造せず、条件の成否だけを分岐として数える）
            const ai = s.arms.indexOf(arm);
            const taken = this.branchChoice('if:' + bid + ':' + ai, { value:c, line: arm.line || s.line, kind: 'if', textT: '条件「' + shortSrcOf(arm.cond) + '」が成立', textF: '条件「' + shortSrcOf(arm.cond) + '」が不成立' }, true);
            if (taken) {
              this.step(arm.line, '条件「' + exprSrc(arm.cond) + '」は実行時に決まる値を含むため断定はできませんが、このパスでは「条件が成立した」として中身を実行します');
              this.execBlock(arm.body, env, ctx);
              return;
            }
            forcedFalse = true;
            this.step(arm.line, '条件「' + exprSrc(arm.cond) + '」は実行時に決まる値を含むため断定はできませんが、このパスでは「条件が成立しなかった」として、この中身は飛ばします');
            continue;
          }
          this.step(arm.line, '条件「' + exprSrc(arm.cond) + '」は ' + (t ? '成立（True）' : '不成立（False）') + (t ? ' なので、この中身を実行します' : ' なので、この中身は飛ばします'));
          if (t) { this.execBlock(arm.body, env, ctx); return; }
        }
        if (s.elseBody) { this.step(s.line, forcedFalse ? 'このパスでは、どの条件にも当てはまらなかったとして、else の中身を実行します' : 'どの条件にも当てはまらないため、else の中身を実行します'); this.execBlock(s.elseBody, env, ctx); }
        return;
      }
      case 'for': {
        const it = this.eval(s.iter, env);
        if (isIter(it)) {
          const failUnknownI = () => { if (this.pathCtx && this.bidOf(s) >= 0) { this.execForcedFor(s, env, ctx); return true; } this.step(s.line, '繰り返しの対象が実行時に決まるため、回数は分かりません（中で代入される変数は「実行時に決まる値」とします）'); this.unknownBlock([[{ k: 'for', target: s.target, body: [] }], s.body, s.elseBody], env, '実行時の繰り返し', s.line); this.maybeReturnUnknown([s.body], ctx); return true; };
          if (it.lazy) this.materialize(it);
          if (!it.pull && this.iterFailed(it)) { failUnknownI(); return; }
          const totalKnown = !it.pull;
          const total = totalKnown ? it.__iter.length - (it.pos || 0) : 0;
          // 遅延イテレータは1件ずつ取り出して繰り返す（break で残りが残り、
          // 供給元の副作用も回ごとに起きる。実 CPython の for と同じ）。
          let pending = this.iterPull(it);
          if (this.iterFailed(it)) { failUnknownI(); return; }
          if (totalKnown) this.step(s.line, '「' + exprSrc(s.iter) + '」から1つずつ「' + targetName(s.target) + '」に取り出して、' + total + '回繰り返します');
          else this.step(s.line, '「' + exprSrc(s.iter) + '」から1つずつ「' + targetName(s.target) + '」に取り出して繰り返します');
          let brokeI = false, idxI = 0;
          while (pending !== EXH) {
            this.tick();
            const item = pending;
            const showI = idxI === 0;
            if (!showI) this.quiet++;
            if (idxI === 0) this.step(s.line, '― 1回目 ―');
            this.assignTo(s.target, item, env, s.line, false);
            try { this.execBlock(s.body, env, { ...ctx, inLoop: true }); }
            catch (e) {
              if (e instanceof Flow && e.kind === 'break') { this.step(s.line, 'break で繰り返しを抜けます'); brokeI = true; if (!showI) this.quiet--; break; }
              if (e instanceof Flow && e.kind === 'continue') { if (!showI) this.quiet--; idxI++; pending = this.iterPull(it); if (this.iterFailed(it)) { failUnknownI(); return; } continue; }
              if (!showI) this.quiet--;
              throw e;
            }
            if (!showI) this.quiet--;
            idxI++;
            pending = this.iterPull(it);
            if (this.iterFailed(it)) { failUnknownI(); return; }
          }
          if (!brokeI && idxI > 2) this.step(s.line, '（2回目以降の手順は省略しました。変数の最終状態は下の「最終状態」に出ます）');
          if (!brokeI && s.elseBody) { this.step(s.line, 'break せずに繰り返しが終わったので、else の中身を実行します'); this.execBlock(s.elseBody, env, ctx); }
          return;
        }
        const seq = this.iterable(it, s.line);
        if (seq === null) { if (it && it.__knownRange) { this.execKnownCountFor(s, env, ctx, it.__knownRange); return; } if (this.pathCtx && this.bidOf(s) >= 0) { this.execForcedFor(s, env, ctx); return; } this.step(s.line, '繰り返しの対象が実行時に決まるため、回数は分かりません（中で代入される変数は「実行時に決まる値」とします）'); this.unknownBlock([[{ k: 'for', target: s.target, body: [] }], s.body, s.elseBody], env, '実行時の繰り返し', s.line); this.maybeReturnUnknown([s.body], ctx); return; }
        this.step(s.line, '「' + exprSrc(s.iter) + '」の要素を1つずつ「' + targetName(s.target) + '」に入れて、' + seq.length + '回繰り返します');
        let broke = false;
        const live = isList(it) ? it.__list : null;
        const watched = isDict(it) ? it : isView(it) ? it.__view : null, watchedSet = isSet(it) ? it : null;
        const size0 = watched ? watched.__dict.size : watchedSet ? watchedSet.__set.length : 0;
        const checkSize = () => { if (watched && watched.__dict.size !== size0) this.err(s.line, 'RuntimeError', '繰り返しの途中で辞書の大きさ（要素数）が変わりました（dictionary changed size during iteration）', '繰り返す前に list(辞書) でキーの一覧を作り、それを使って繰り返してください'); if (watchedSet && watchedSet.__set.length !== size0) this.err(s.line, 'RuntimeError', '繰り返しの途中で集合の大きさが変わりました（Set changed size during iteration）', '繰り返す前に list(集合) で一覧を作ってください'); };
        for (let idx = 0; idx < (live ? live.length : seq.length); idx++) {
          if (live) seq[idx] = live[idx];
          this.tick();
          const showSteps = idx === 0 || idx === (live ? live.length : seq.length) - 1;
          if (!showSteps) this.quiet++;
          if (idx === 0) this.step(s.line, '― 1回目 ―');
          if (idx === seq.length - 1 && seq.length > 1) this.step(s.line, '― 最後の回（' + seq.length + '回目）―');
          this.assignTo(s.target, seq[idx], env, s.line, false);
          try { this.execBlock(s.body, env, { ...ctx, inLoop: true }); }
          catch (e) {
            if (e instanceof Flow && e.kind === 'break') { this.step(s.line, 'break で繰り返しを抜けます'); broke = true; if (!showSteps) this.quiet--; break; }
            if (e instanceof Flow && e.kind === 'continue') { if (!showSteps) this.quiet--; checkSize(); continue; }
            if (!showSteps) this.quiet--;
            throw e;
          }
          if (!showSteps) this.quiet--;
          checkSize();
        }
        const total = live ? live.length : seq.length;
        if (!broke && total > 2) this.step(s.line, '（' + (total === 3 ? '2回目' : '2回目から ' + (total - 1) + ' 回目まで') + 'の手順は省略しました。変数の最終状態は下の「最終状態」に出ます）');
        if (!broke && s.elseBody) { this.step(s.line, 'break せずに繰り返しが終わったので、else の中身を実行します'); this.execBlock(s.elseBody, env, ctx); }
        return;
      }
      case 'while': {
        let count = 0, prevSnap = null, broke = false, stallCount = 0;
        const watchSet = new Set(); walkNodes(s.cond, n => { if (n.k === 'name') watchSet.add(n.name); });
        assignedNames([s.body]).forEach(n => watchSet.add(n));
        mutatedRoots([s.body]).forEach(n => watchSet.add(n));
        const watchList = [...watchSet];
        const canStall = !hasNode(s.cond, n => n.k === 'call' || n.k === 'attr') && !hasNode(s.body, n => n.k === 'break' || n.k === 'return' || n.k === 'raise');
        while (true) {
          const c = this.eval(s.cond, env);
          const t = this.truthyOf(c, s.line, env);
          let assumed = false;
          if (t === null) {
            const bid = this.bidOf(s);
            if (!this.pathCtx || bid < 0) {
              this.step(s.line, 'while の条件「' + exprSrc(s.cond) + '」は実行時に決まる値を含むため、繰り返しの回数は分かりません（中で代入される変数は「実行時に決まる値」とします）');
              this.unknownBlock([s.body, s.elseBody], env, '実行時の繰り返し', s.line);
              this.maybeReturnUnknown([s.body], ctx);
              return;
            }
            // パス列挙モード：このパスでは条件が本当／うそのどちらだったかを仮定して進む
            const taken = this.branchChoice('while:' + bid, { value:c, line: s.line, kind: 'while', cap: 6, textT: 'while の条件「' + shortSrcOf(s.cond) + '」が成立（繰り返す）', textF: 'while の条件「' + shortSrcOf(s.cond) + '」が不成立（終わる）' }, (occ) => occ <= 1);
            if (!taken) {
              this.step(s.line, 'while の条件「' + exprSrc(s.cond) + '」は実行時に決まります。このパスでは「条件が成立しなくなった」として、繰り返しを終わります' + (count > 0 ? '（合計 ' + count + ' 回繰り返しました）' : '（1回も繰り返しません）'));
              break;
            }
            this.step(s.line, 'while の条件「' + exprSrc(s.cond) + '」は実行時に決まります。このパスでは「条件が成立した」として繰り返します');
            prevSnap = null; stallCount = 0; // 仮定で回した回は、停滞（無限ループの疑い）の判定に数えない
            assumed = true;
          }
          if (!t && !assumed) { if (count > 0) this.step(s.line, '条件「' + exprSrc(s.cond) + '」が不成立（False）になったので、繰り返しを終わります（合計 ' + count + ' 回）'); break; }
          if (canStall) {
            // 監視対象の値が5回続けてまったく変わらないときだけ「無限ループの疑い」とする（1回だけ変わらない正しいループは多い）
            const snap = watchList.map(n => { const v = env.get(n); return v === undefined ? '∅' : reprVal(v); }).join('\u0001');
            if (prevSnap !== null && snap === prevSnap) { if (++stallCount >= 5) this.err(s.line, '無限ループの疑い', 'while の条件「' + exprSrc(s.cond) + '」に関わる値が繰り返しの中で変わらないため、条件がずっと成立（True）のままで終わりません', 'ループの中で条件に関わる変数を変えているか、break があるか確認してください'); }
            else stallCount = 0;
            prevSnap = snap;
          }
          if (count >= MAX_ITERS) throw new Flow('budget');
          this.tick();
          count++;
          const showSteps = count <= 1;
          if (!showSteps) this.quiet++;
          if (count === 1 && !assumed) this.step(s.line, '条件「' + exprSrc(s.cond) + '」が成立（True）の間、繰り返します');
          try { this.execBlock(s.body, env, { ...ctx, inLoop: true }); }
          catch (e) {
            if (e instanceof Flow && e.kind === 'break') { this.step(s.line, 'break で繰り返しを抜けます'); if (!showSteps) this.quiet--; broke = true; break; }
            if (e instanceof Flow && e.kind === 'continue') { if (!showSteps) this.quiet--; continue; }
            if (!showSteps) this.quiet--;
            throw e;
          }
          if (!showSteps) this.quiet--;
        }
        if (!broke && s.elseBody) { this.step(s.line, 'break せずに繰り返しが終わったので、else の中身を実行します'); this.execBlock(s.elseBody, env, ctx); }
        return;
      }
      case 'def': {
        let fn = FUNC(s, env === this.globals ? this.globals : env);
        // デフォルト引数は定義のときに1回だけ作られる（変更可能な値は呼び出し間で共有される）
        fn.defaults = {};
        for (const p of s.params) if (p.def) fn.defaults[p.name] = this.eval(p.def, env);
        this.step(s.line, '関数「' + s.name + '」を定義します（この時点では中身は実行しません。呼び出されたときに動きます）');
        const decs = this.pendingDec; this.pendingDec = [];
        for (let k = decs.length - 1; k >= 0; k--) {
          const dv = this.eval(decs[k].expr, env);
          fn = this.callFn(dv, [fn], env, decs[k].line);
          this.step(decs[k].line, 'デコレータ「' + exprSrc(decs[k].expr) + '」を関数「' + s.name + '」に適用します');
        }
        env.set(s.name, fn);
        return;
      }
      case 'return': {
        if (!ctx.inFunc) this.err(s.line, 'SyntaxError', 'return は関数の外では使えません', 'return は def の中でのみ書いてください');
        const v = s.expr ? this.eval(s.expr, env) : NONE;
        this.step(s.line, '呼び出し元へ ' + reprVal(v) + ' を返して、関数を終わります');
        throw new Flow('return', v);
      }
      case 'break': if (!ctx.inLoop) this.err(s.line, 'SyntaxError', 'break は繰り返しの外では使えません', 'break は for / while の中で書いてください'); throw new Flow('break');
      case 'continue': if (!ctx.inLoop) this.err(s.line, 'SyntaxError', 'continue は繰り返しの外では使えません', 'continue は for / while の中で書いてください'); throw new Flow('continue');
    }
  }
  methodStepNote() { /* メソッドの副作用は eval 側で手順に記録する */ }

  readTarget(t, env, line) {
    if (t.k === 'name') {
      const v = env.get(t.name);
      if (v === UNBOUND) this.err(line, 'UnboundLocalError', '関数の中で代入している変数「' + t.name + '」を、代入する前に使っています（関数の中で代入した名前は、その関数のローカル変数になります）', '外側の変数を書き換えたいなら global ' + t.name + ' と宣言するか、引数と戻り値で受け渡してください');
      if (v === undefined && Object.hasOwn(BUILTIN_CONSTANTS, t.name)) return BUILTIN_CONSTANTS[t.name];
      if (v === undefined) this.err(line, 'NameError', '変数「' + t.name + '」はまだ作られていません（値が入っていません）', '使う前に「' + t.name + ' = 値」のように代入してください。綴りの違いにも注意してください');
      return v;
    }
    if (t.k === 'sub') {
      const obj = this.eval(t.obj, env);
      const idx = this.eval(t.idx, env);
      return this.subGet(obj, idx, line);
    }
    if (t.k === 'attr') return this.eval({ k: 'attr', obj: t.obj, name: t.name, line }, env); // クラス属性などの読み取り（複合代入の現在値）
    this.err(line, '対応外', 'この形の読み取りは解釈できません', '');
  }
  assignTo(t, v, env, line, record) {
    if (t.k === 'name') {
      let before = env.get(t.name); if (before === UNBOUND) before = undefined;
      env.set(t.name, v);
      if (record) {
        if (before === undefined) this.step(line, '「' + t.name + '」に ' + reprVal(v) + ' を代入します');
        else if (reprVal(before) !== reprVal(v)) this.step(line, '「' + t.name + '」を ' + reprVal(before) + ' から ' + reprVal(v) + ' に変えます');
        else this.step(line, '「' + t.name + '」に ' + reprVal(v) + ' を代入します（値は変わりません）');
      }
      return;
    }
    if (t.k === 'ttuple') {
      const items = isList(v) ? v.__list : isTuple(v) ? v.__tuple : (!isUnk(v) ? this.iterable(v, line, true) : null);
      if (items === null) {
        if (isUnk(v)) { for (const it of t.items) this.assignTo(it, UNK(), env, line, record); return; }
        this.err(line, 'TypeError', '値を分けて代入できません（' + typeName(v) + ' はバラバラにできません）', '右側はリストやタプルのように、要素を分けられる値にしてください');
      }
      const si = t.items.findIndex(x => x.k === 'starred');
      if (si >= 0) {
        const after = t.items.length - si - 1;
        if (items.length < t.items.length - 1) this.err(line, 'ValueError', '分ける値が足りません（少なくとも ' + (t.items.length - 1) + ' 個必要ですが ' + items.length + ' 個です）', '');
        t.items.forEach((it, i2) => {
          if (i2 < si) this.assignTo(it, items[i2], env, line, record);
          else if (i2 === si) this.assignTo(it.t, LIST(items.slice(si, items.length - after)), env, line, record);
          else this.assignTo(it, items[items.length - (t.items.length - i2)], env, line, record);
        });
        return;
      }
      if (items.length !== t.items.length) this.err(line, 'ValueError', '分ける数と代入先の数が合いません（値 ' + items.length + ' 個 → 代入先 ' + t.items.length + ' 個）', '左側の変数の数と、右側の要素の数を揃えてください');
      t.items.forEach((it, i2) => this.assignTo(it, items[i2], env, line, record));
      return;
    }
    if (t.k === 'sub') {
      const obj = this.eval(t.obj, env);
      const idx = this.eval(t.idx, env);
      if (isUnk(obj) || isUnk(idx)) { // 場所が決まらない書き換えは、根のオブジェクト全体を「不明」にする（古い値を確定値として残さない）
        const rn = rootNameOf(t);
        if (rn) { const cur = env.get(rn); if (isMutableVal(cur)) poison(cur, '書き換えられたかもしれない値'); }
        if (!isUnk(obj) && isMutableVal(obj)) poison(obj, '書き換えられたかもしれない値');
        return;
      }
      this.subSet(obj, idx, v, line);
      if (record) this.step(line, '「' + exprSrc(t.obj) + '」の [' + reprVal(idx) + '] を ' + reprVal(v) + ' にします');
      return;
    }
    if (t.k === 'tuple') { // (a, b) = ... の丸括弧つき分割代入
      this.assignTo({ k: 'ttuple', items: t.items.map(x => x.e), line }, v, env, line, record);
      return;
    }
    if (t.k === 'slice') {
      const obj = this.eval(t.obj, env);
      const lo = t.lo ? this.eval(t.lo, env) : null, hi = t.hi ? this.eval(t.hi, env) : null, st = t.step ? this.eval(t.step, env) : null;
      if (typeof obj === 'string') this.err(line, 'TypeError', '文字列は中身を書き換えられません（文字列は変更できない決まりです）', '新しい文字列を作って代入し直してください');
      if (isTuple(obj)) this.err(line, 'TypeError', 'タプルは中身を書き換えられません', '変えたいときはリストを使ってください');
      if (isUnk(obj)) return;
      if (isBytearray(obj)) { this.subSet(obj, SLICEV(lo === null ? NONE : lo, hi === null ? NONE : hi, st === null ? NONE : st), v, line); if (record) this.step(line, '「' + exprSrc(t.obj) + '」の一部（スライス）を置き換えます → ' + reprVal(obj)); return; } // B6監査D13
      if (!isList(obj)) this.err(line, 'TypeError', typeName(obj) + ' にはスライスで代入できません', '');
      const ix = this.sliceIdx(obj.__list.length, lo, hi, st, line);
      const seq = this.iterable(v, line, true);
      if (ix === null || seq === null) { if (seq === null && !isUnk(v) && !isSet(v)) this.err(line, 'TypeError', 'スライスへの代入には、リストなどの並びを渡してください', ''); this.markUnknownList(obj, t.obj, env, line); return; }
      if (ix.step === 1) { const nl = obj.__list.slice(0, ix.a); for (const x of seq) nl.push(x); for (let k = Math.max(ix.a, ix.b); k < obj.__list.length; k++) nl.push(obj.__list[k]); obj.__list.length = 0; for (const x of nl) obj.__list.push(x); } // スプレッド展開は巨大な並びで RangeError になるため手作業で組み直す（同じ配列を保ち別名にも反映）
      else { if (seq.length !== ix.idx.length) this.err(line, 'ValueError', '間隔つきスライスへの代入では、要素の数を揃えてください（' + seq.length + ' 個を ' + ix.idx.length + ' 個の場所に入れようとしています）', ''); ix.idx.forEach((k, q) => { obj.__list[k] = seq[q]; }); }
      if (record) this.step(line, '「' + exprSrc(t.obj) + '」の一部（スライス）を置き換えます → ' + reprVal(obj));
      return;
    }
    if (t.k === 'attr') {
      const obj = this.eval(t.obj, env);
      // B7 統合時の基盤修正 F-D：ネイティブ値・ネイティブクラス・モジュールへの
      // 属性代入。定義側に setattr があれば委譲し、無ければ保存先へ保持する
      // （インスタンスは属性バッグ、クラス／モジュールはレジストリの上書き表）。
      if (obj && obj.__native) {
        const def = nativeClassDef(obj.__native);
        const ctx = this.stdlibCtx(env, line);
        if (def && def.setattr) { def.setattr(ctx, obj, t.name, v); }
        else { if (!obj.__attrsBag) obj.__attrsBag = new Map(); obj.__attrsBag.set(t.name, v); }
        if (record) this.step(line, typeName(obj) + ' の属性「' + t.name + '」を ' + reprVal(v) + ' にします');
        return;
      }
      if (obj && obj.__ncls) { setClassAttrOverride(obj.__ncls, t.name, v); if (record) this.step(line, 'クラス「' + obj.__ncls + '」の属性「' + t.name + '」を ' + reprVal(v) + ' にします'); return; }
      if (obj && obj.mod && isStdlibModule(obj.mod)) { setModuleAttrOverride(obj.mod, t.name, v); if (record) this.step(line, 'モジュール「' + obj.mod + '」の属性「' + t.name + '」を ' + reprVal(v) + ' にします'); return; }
      // B6-Py3：__setattr__／property の setter／__set__ を発火する
      if (obj && obj.__instance) { this.setAttrInstance(obj, t.name, v, line, env); if (record) this.step(line, 'モデルインスタンスの属性「' + t.name + '」を ' + reprVal(v) + ' にします'); return; }
      if (obj && obj.__class) { obj.cenv.vars.set(t.name, v); if (record) this.step(line, 'クラス「' + obj.cname + '」の属性「' + t.name + '」を ' + reprVal(v) + ' にします'); return; } // クラス属性は読み取りと同じ保存先へ書く（古い値を確定値として残さない）
      if (isUnk(obj)) return; // インスタンス等、対象が不明な値への代入は値も不明のままにする
      this.diag(line, 'note', '対応外', '属性（.名前）への代入はこの説明では解釈できません', '');
      return;
    }
    this.diag(line, 'note', '対応外', 'この形の代入はこの説明では解釈できません', '');
  }
  iterable(v, line, silent) {
    if (isUnk(v)) return null;
    if (v && v.__native) { const d = nativeClassDef(v.__native); if (d && d.iter) { const r = d.iter(this.stdlibCtx(null, line), v); if (r !== null && r !== undefined) return r; } }
    if (isIter(v)) { const r = this.iterDrain(v); if (this.iterFailed(v)) return null; return r; }
    if (isView(v)) return viewItems(v);
    if (isList(v)) return v.__list.slice();
    if (isTuple(v)) return v.__tuple.slice();
    if (typeof v === 'string') return Array.from(v);
    if (isBytesLike(v)) return bytesOf(v).map(x => NUM(x, false));
    if (isMemview(v)) { if (v.__memview.released) return null; return mvBytes(v).map(x => NUM(x, false)); }
    if (isDict(v)) { const ks = []; for (const e of v.__dict.values()) ks.push(e.k); return ks; }
    if (isSet(v)) { const ord = setOrder(v); if (ord) return ord; if (this.orderFree) return v.__set.slice(); return null; } // 並び順が実行時に決まる集合は、順序に関係しない使い方でだけ展開する
    if (v && v.__range) return v.__range.slice();
    // B6-Py3：__iter__ の戻り値を実体化する。__iter__ が無い場合は
    // __getitem__ の整数添字プロトコル（IndexError で終了）で走査する。
    // __iter__ が自分自身を返すイテレータ（__next__ 駆動）は実体化できない
    // ため未確定（null）にする。
    if (v && v.__instance) {
      if (this.specialLookup(v, '__iter__') !== undefined) {
        const it = this.callSpecial(v, '__iter__', line, null);
        if (it === undefined || isUnk(it) || it === v) return null;
        return this.iterable(it, line, true);
      }
      if (this.specialLookup(v, '__getitem__') !== undefined) {
        const out = [];
        for (let i = 0; i < 10000; i++) {
          let item;
          try { item = this.callSpecialArgs(v, '__getitem__', [NUM(i, false)], line, null); }
          catch (e) { if (e instanceof SimDiag && e.kind === 'IndexError') break; throw e; }
          if (item === undefined || isUnk(item)) return null;
          out.push(item);
        }
        return out;
      }
      if (!silent) this.err(line, 'TypeError', typeName(v) + ' は繰り返し（for）に使えません（__iter__ も __getitem__ も定義されていません）', 'for にはリスト・文字列・range() などの「並び」を指定してください');
      return null;
    }
    if (!silent) this.err(line, 'TypeError', typeName(v) + ' は繰り返し（for）に使えません', 'for にはリスト・文字列・range() などの「並び」を指定してください');
    return null;
  }
  // iterable() の null は「値が未確定」「集合の並び順が未確定」「イテレータの展開失敗」
  // 「確定した非イテラブル」を区別しない。順序が結果に影響しない用途（orderFreeOk）では集合も展開し、
  // 確定した非イテラブルは CPython どおり TypeError で止める（PY-01／PY-03／PY-04 の根本原因への対処）。
  // 未確定として扱うべき場合は null を返し、呼び出し側が従来どおり不明化・毒化する。
  iterableChecked(v, line, orderFreeOk) {
    if (isUnk(v)) return null;
    let seq;
    if (orderFreeOk) { const prev = this.orderFree; this.orderFree = true; seq = this.iterable(v, line, true); this.orderFree = prev; }
    else seq = this.iterable(v, line, true);
    if (seq !== null) return seq;
    if (isIter(v)) return null; // 展開に失敗したイテレータは未確定
    if (isSet(v)) return null; // 並び順が決まらない集合（orderFreeOk のときは上で展開済み）
    if (isList(v) || isTuple(v) || typeof v === 'string' || isDict(v) || isView(v) || (v && v.__range) || isBytesLike(v) || isMemview(v)) return null; // 展開できるはずの形（防御的に未確定）
    // B6-Py3：__iter__／__getitem__ を持つインスタンスは実体化の失敗を未確定として扱い、
    // どちらも持たないインスタンスは確定した非イテラブルとして TypeError にする
    if (v && v.__instance) {
      if (this.specialLookup(v, '__iter__') !== undefined || this.specialLookup(v, '__getitem__') !== undefined) return null;
      this.err(line, 'TypeError', typeName(v) + ' は繰り返しに使えません（イテラブルではありません）', '');
    }
    this.err(line, 'TypeError', typeName(v) + ' は繰り返しに使えません（イテラブルではありません）', '');
  }
  // R22-N19：「*」の展開先が、確定した非イテラブル（数値・真偽値・None・
  // 関数など）のときは CPython と同じく TypeError で正直に停止する。
  // 値が不明な場合は従来どおり「実行時に決まる値」として扱う。
  checkUnpackable(v, line) {
    if (!v || typeof v !== 'object' || isUnk(v)) return;
    if (isNum(v) || isBool(v) || isNone(v) || isEllipsis(v) || isFunc(v) || isMethodRef(v) || !!v.__builtin || !!v.__type || !!v.__class)
      this.err(line, 'TypeError', '「*」で展開できるのはリスト・タプル・文字列・辞書などの並びだけです（' + typeName(v) + ' は展開できません）', '「*」のあとには並びを書いてください');
  }
  unpackSeq(v, line) {
    this.checkUnpackable(v, line);
    return this.iterable(v, line, true);
  }
}
function targetName(t) {
  if (t.k === 'name') return t.name;
  if (t.k === 'ttuple') return t.items.map(targetName).join(', ');
  return '要素';
}

/* ============ 式の評価 ============ */
const PY_BUILTINS = new Set('abs all any aiter anext ascii bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval exec filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr sentinel slice sorted staticmethod str sum super tuple type vars zip __import__ Exception BaseException ValueError TypeError KeyError IndexError ZeroDivisionError NameError AttributeError RuntimeError StopIteration AssertionError ImportError ModuleNotFoundError ImportCycleError OSError FileNotFoundError NotImplementedError ArithmeticError LookupError OverflowError RecursionError PythonFinalizationError UnicodeError EOFError KeyboardInterrupt SystemExit BaseExceptionGroup ExceptionGroup BlockingIOError BrokenPipeError BufferError BytesWarning ChildProcessError ConnectionAbortedError ConnectionError ConnectionRefusedError ConnectionResetError DeprecationWarning EncodingWarning EnvironmentError FileExistsError FloatingPointError FutureWarning GeneratorExit IOError ImportWarning IndentationError InterruptedError IsADirectoryError MemoryError NotADirectoryError PendingDeprecationWarning PermissionError ProcessLookupError ReferenceError ResourceWarning RuntimeWarning StopAsyncIteration SyntaxError SyntaxWarning SystemError TabError TimeoutError UnboundLocalError UnicodeDecodeError UnicodeEncodeError UnicodeTranslateError UnicodeWarning UserWarning Warning frozendict'.split(' '));
const BUILTIN_NAMES = ['print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'tuple', 'dict', 'set', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'reversed', 'enumerate', 'zip', 'type', 'input', 'isinstance', 'ord', 'chr', 'divmod', 'pow', 'any', 'all', 'open'];
BUILTIN_NAMES.push('repr', 'map', 'filter', 'hex', 'bin', 'oct', 'format', 'next', 'iter');
const ARITY = { repr: [1, 1], map: [2, 99], filter: [2, 2], hex: [1, 1], bin: [1, 1], oct: [1, 1], format: [1, 2], print: [0, 99], len: [1, 1], range: [1, 3], str: [0, 1], int: [0, 2], float: [0, 1], bool: [0, 1], next: [1, 2], iter: [1, 1], list: [0, 1], tuple: [0, 1], set: [0, 1], dict: [0, 1], sum: [1, 2], min: [0, 99], max: [0, 99], abs: [1, 1], round: [1, 2], sorted: [1, 1], reversed: [1, 1], enumerate: [1, 2], zip: [0, 99], type: [1, 3], input: [0, 1], isinstance: [2, 2], ord: [1, 1], chr: [1, 1], divmod: [2, 2], pow: [2, 3], any: [1, 1], all: [1, 1], open: [1, 3], ascii: [1, 1], callable: [1, 1], delattr: [2, 2], dir: [0, 1], getattr: [2, 3], globals: [0, 0], hasattr: [2, 2], hash: [1, 1], id: [1, 1], issubclass: [2, 2], locals: [0, 0], setattr: [3, 3], vars: [0, 1], object: [0, 0], sentinel: [1, 2], aiter: [1, 1], anext: [1, 2], breakpoint: [0, 99], compile: [3, 7], eval: [1, 3], exec: [1, 3], help: [0, 1], __import__: [1, 5], bytes: [0, 3], bytearray: [0, 3], complex: [0, 2], frozenset: [0, 1], slice: [1, 3], memoryview: [1, 1], frozendict: [0, 1] };

// バッチ4 Python追随＋バッチ5是正（R26-N3／N4）：except ハンドラ式の評価・検証
// （実 CPython 3.12.3 の規則を実走で確認）。
// ハンドラ式は、例外が伝播してきたときに限り、書かれた順に評価される（try 本体で
// 例外が起きなければ評価されない）。評価は「式全体の評価 → 評価結果が例外クラスか
// その平坦なタプルかの検証 → 発生した例外との階層照合」の順で、タプル形では全要素を
// 評価・検証してから照合する（先頭要素が一致しても、後ろに未定義名があれば NameError、
// 非例外があれば TypeError になる）。未定義名は NameError、関数内の代入前参照は
// UnboundLocalError、例外クラスでない確定値は TypeError。値が実行時に決まる要素は
// 判定できないため一致しないものとして扱い、断定できる誤りだけを名指しする。
// R26-N3：照合は式の形ではなく評価結果の値で行う。変数に束縛されたタプル値、
// 呼出結果（クラス／タプル／非例外のいずれも）、添字・属性・条件式の結果も、
// リテラル形と同じく値として検証・照合する。
// R26-N4：except のタプルは平坦でなければならない。要素の値がタプルであること
// 自体が TypeError（リテラルの入れ子・変数経由・呼出結果経由を問わない）。
// isinstance 側の入れ子タプルは実物どおり合法であり、そちらは変更しない。
// 評価順序（実 CPython 実測）：タプルリテラルの要素は左から評価し、要素の評価が
// 例外を起こしたら残りの要素は評価せずその例外が伝播する。検証（TypeError）は
// 全要素の評価が終わってから行うため、評価エラーが検証エラーに優先する
// （(5, 未定義名) でも NameError）。呼出形の引数も呼び出し前に評価される
// （except ValueError(未定義名): は NameError）。
// 戻り値：{ match: boolean } | { err: SimDiag }
/* ============ 高度モード B7：標準ライブラリ差分のディスパッチ ============
 * 以下はすべて stdlib レジストリへの登録がある場合にだけ動く追加経路。
 * 登録が無い（簡易モード）場合は既存経路に一切影響しない。 */

// モジュールのメンバー（定数・データ・関数・クラス・サブモジュール）を引く。
// 見つからなければ undefined を返す。
function stdlibModuleMember(mod, name, modVal) {
  const ov = getModuleAttrOverride(mod, name);
  if (ov !== undefined) return ov;
  const def = STDLIB_MODULES.get(mod);
  if (def) {
    if (def.constants && name in def.constants) return def.constants[name];
    if (def.data && name in def.data) return def.data[name];
    if (def.functions && name in def.functions) return METHODREF(modVal, name);
    if (def.classes && name in def.classes) return makeNativeClass(mod + '.' + name);
  }
  if (isStdlibModule(mod + '.' + name)) { const sv = UNK('モジュール「' + mod + '.' + name + '」の内容'); sv.mod = mod + '.' + name; return sv; }
  return undefined;
}

// 標準ライブラリ実装関数へ渡す実行コンテキスト。
Interp.prototype.stdlibCtx = function (env, line) {
  const self = this;
  const e = env || this.globals;
  return {
    V: { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, RANGE, ITER, UNK },
    isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, isFunc,
    isNative: (v) => !!v && !!v.__native,
    isNativeClass: (v) => !!v && !!v.__ncls,
    num: (v) => isNum(v) ? v.v : isBool(v) ? (v.v ? 1 : 0) : null,
    int: (v) => { const n = isNum(v) ? v.v : isBool(v) ? (v.v ? 1 : 0) : null; return n === null ? null : Math.trunc(n); },
    str: (v) => typeof v === 'string' ? v : null,
    listOf: (v) => isList(v) ? v.__list : isTuple(v) ? v.__tuple : (v && v.__range) ? v.__range : null,
    repr: (v) => reprVal(v), strOf: (v) => strVal(v), typeName: (v) => typeName(v),
    truthy: (v) => v === undefined ? null : self.truthyOf(v, line, e),
    eq: (a, b) => eqVal(a, b),
    err: (kind, msg, fix) => self.err(line, kind, msg, fix || '', msg, pyStrRepr(msg)),
    errAttrs: (kind, msg, attrs, fix) => self.err(line, kind, msg, fix || '', msg, pyStrRepr(msg), attrs),
    emit: (text) => self.emitRaw(String(text), line),
    callKw: (fn, args, kwargs) => {
      const kw = kwargs || {};
      if (fn && fn.__builtin) return self.callBuiltin(fn.__builtin, args || [], kw, e, line, null);
      if (fn && fn.__method) return self.callMethod(fn.obj, fn.name, args || [], kw, e, line);
      if (fn && fn.__class) return self.instantiate(fn, args || [], kw, e, line);
      if (fn && fn.__ncls) return self.stdlibConstruct(fn, args || [], kw, e, line);
      if (fn && fn.__native) { const d = nativeClassDef(fn.__native); if (d && d.call) return d.call(self.stdlibCtx(e, line), fn, args || [], kw); self.err(line, 'TypeError', typeName(fn) + ' は呼び出し（ ）ができません', ''); }
      if (isFunc(fn)) return self.callUserFunc(fn, args || [], kw, e, line);
      return self.callFn(fn, args || [], e, line);
    },
    diag: (text) => self.diag(line, 'note', 'note', text, ''),
    step: (text) => self.step(line, text),
    unk: (desc) => UNK(desc),
    call: (fn, args) => self.callFn(fn, args || [], e, line),
    iterable: (v) => self.iterable(v, line, true),
    binop: (op, a, b) => self.binOp(op, a, b, line),
    compare: (op, a, b) => self.compare(op, a, b, line),
    native: (q, data) => makeNative(q, data),
    ncls: (q) => makeNativeClass(q),
    NOT_HANDLED: STDLIB_NOT_HANDLED,
  };
};

// import 文の汎用経路。対象が登録済みモジュールでなければ false を返し、
// 呼び出し側は従来経路（math のみ・それ以外は未対応）へ進む。
Interp.prototype.tryStdlibImport = function (t, env, line) {
  let m = /^import\s+(.+)$/.exec(t);
  if (m) {
    const parsed = m[1].split(',').map(x => x.trim()).filter(Boolean).map(p => { const q = p.split(/\s+as\s+/); return { mod: q[0].trim(), alias: (q[1] || '').trim() }; });
    if (!parsed.length || !parsed.every(p => /^[\w.]+$/.test(p.mod) && isStdlibModule(p.mod))) return false;
    for (const p of parsed) {
      const top = p.mod.split('.')[0];
      // B7 統合時の基盤修正 F-A：別名つきの dotted import（import a.b.c as x）は
      // CPython どおり a.b.c モジュール自体を別名に束縛する（.mod は完全名）。
      // 別名なしの場合は最上位モジュールを束縛し、属性経由でサブモジュールへ
      // 辿る（stdlibModuleMember がサブモジュールを解決する）。
      const bindName = p.alias || top;
      const mv = UNK('モジュール「' + (p.alias ? p.mod : top) + '」の内容'); mv.mod = p.alias ? p.mod : top;
      env.set(bindName, mv);
      this.diag(line, 'note', 'import', p.mod + ' モジュールを読み込み、名前「' + bindName + '」で使えるようにします。高度モードで実装済みの項目はその意味論で計算し、未対応・未検証の項目は正直に停止します', '');
    }
    return true;
  }
  m = /^from\s+([\w.]+)\s+import\s+\(?(.+?)\)?\s*$/.exec(t);
  if (m) {
    const mod = m[1];
    if (!isStdlibModule(mod)) return false;
    const def = STDLIB_MODULES.get(mod);
    const modVal = UNK('モジュール「' + mod + '」の内容'); modVal.mod = mod;
    const parts = m[2].split(',').map(x => x.trim()).filter(Boolean);
    const bindOne = (orig, alias) => {
      const v = stdlibModuleMember(mod, orig, modVal);
      if (v === undefined) this.err(line, 'ImportError', mod + ' モジュールから「' + orig + '」は import できません（' + mod + ' にその名前はありません）', 'import する名前の綴りを確認してください（実在する名前だけが取り込めます）');
      env.set(alias, v);
    };
    if (parts.some(p => p.split(/\s+as\s+/)[0].trim() === '*')) {
      const names = def ? [...Object.keys(def.constants || {}), ...Object.keys(def.data || {}), ...Object.keys(def.functions || {}), ...Object.keys(def.classes || {})].filter(n => !n.startsWith('_')) : [];
      for (const n of [...new Set(names)]) bindOne(n, n);
      this.diag(line, 'note', 'import', mod + ' モジュールの公開名を全て取り込み、それぞれの名前で使えるようにします', '');
    } else {
      for (const part of parts) { const p = part.split(/\s+as\s+/); const orig = p[0].trim(); if (!orig) continue; bindOne(orig, (p[1] || p[0]).trim()); }
      this.diag(line, 'note', 'import', mod + ' モジュールから指定された名前を取り込み、束縛します。高度モードで実装済みの項目はその意味論で計算します', '');
    }
    return true;
  }
  return false;
};

Interp.prototype.stdlibModuleAttr = function (modVal, name, line) {
  const v = stdlibModuleMember(modVal.mod, name, modVal);
  if (v !== undefined) return v;
  this.err(line, 'AttributeError', 'モジュール「' + modVal.mod + '」には属性「' + name + '」はありません', '綴りを確認するか、リファレンスで使える名前を確認してください');
  return UNK();
};

Interp.prototype.stdlibKwargs = function (kwargs, env) {
  // 冪等：AST ノード（k プロパティを持ち、エンジン値のタグを持たないもの）だけを
  // 評価し、評価済みのエンジン値はそのまま通す。stdlibModuleCall が評価済み
  // kwargs を stdlibConstruct へ渡しても二重評価にならないための措置
  // （B7 統合時の基盤修正 F-C）。
  const kw = {};
  for (const k of Object.keys(kwargs || {})) {
    const v = kwargs[k];
    if (v && typeof v === 'object' && v.k === '__val') { kw[k] = v.v; continue; }
    if (v && typeof v === 'object' && typeof v.k === 'string' && !Object.keys(v).some(x => x.startsWith('__'))) { kw[k] = this.eval(v, env); continue; }
    kw[k] = v;
  }
  return kw;
};

Interp.prototype.stdlibModuleCall = function (mod, name, args, kwargs, env, line) {
  kwargs = this.stdlibKwargs(kwargs, env);
  const def = STDLIB_MODULES.get(mod);
  if (def && def.functions && name in def.functions) return def.functions[name](this.stdlibCtx(env, line), args, kwargs || {});
  if (def && def.classes && name in def.classes) return this.stdlibConstruct(makeNativeClass(mod + '.' + name), args, kwargs, env, line);
  if (def && ((def.constants && name in def.constants) || (def.data && name in def.data))) this.err(line, 'TypeError', 'モジュール「' + mod + '」の「' + name + '」は値（定数）なので呼び出せません', '');
  if (isStdlibModule(mod + '.' + name)) this.err(line, 'TypeError', 'モジュール「' + mod + '.' + name + '」は呼び出せません', '');
  this.err(line, 'AttributeError', 'モジュール「' + mod + '」には属性「' + name + '」はありません', '綴りを確認するか、リファレンスで使える名前を確認してください');
  return UNK();
};

Interp.prototype.stdlibNativeAttr = function (obj, name, env, line) {
  const def = nativeClassDef(obj.__native);
  if (!def) return UNK('属性「' + name + '」の値');
  const ctx = this.stdlibCtx(env, line);
  // 高度A7班是正: attrs の値が getter 関数でない（生値が置かれた）場合は
  // 値そのものとして返す。以前は関数として呼んで TypeError になり、
  // シミュレーション全体が落ちた（http.cookiejar.CookiePolicy の例）。
  if (def.attrs && name in def.attrs) return typeof def.attrs[name] === 'function' ? def.attrs[name](ctx, obj) : def.attrs[name];
  // B7 統合時の基盤修正 F-D：実行時に代入されたインスタンス属性（属性バッグ）。
  // CPython の属性解決に倣い、通常メソッドより先に見る。
  if (obj.__attrsBag && obj.__attrsBag.has(name)) return obj.__attrsBag.get(name);
  if (def.methods && name in def.methods) return METHODREF(obj, name);
  // F-J：インスタンス経由でもクラスメソッド・クラス属性へ到達できる。
  if (def.classMethods && name in def.classMethods) return METHODREF(obj, name);
  if (def.classAttrs && name in def.classAttrs) { const cv = def.classAttrs[name]; return typeof cv === 'function' ? cv(ctx) : cv; }
  // F-E：動的属性のフォールバック（mock の子モック自動生成等）。
  if (def.attrFallback) { const r = def.attrFallback(ctx, obj, name); if (r !== undefined) return r; }
  this.err(line, 'AttributeError', typeName(obj) + ' オブジェクトには属性「' + name + '」がありません', '綴りを確認するか、リファレンスで使える名前を確認してください');
  return UNK();
};

Interp.prototype.stdlibClassAttr = function (clsVal, name, env, line) {
  const ov = getClassAttrOverride(clsVal.__ncls, name);
  if (ov !== undefined) return ov;
  const def = nativeClassDef(clsVal.__ncls);
  if (!def) return UNK('属性「' + name + '」の値');
  const ctx = this.stdlibCtx(env, line);
  if (def.classAttrs && name in def.classAttrs) { const cv = def.classAttrs[name]; return typeof cv === 'function' ? cv(ctx) : cv; }
  // 高度A7班是正：__name__／__qualname__／__module__ は CPython では全ての
  // クラスで読める基本属性。登録 def に無くても限定名から合成して返す
  // （従来は AttributeError になり、type(x).__name__ が標準ライブラリの
  // クラスで常に失敗していた）。
  if (name === '__name__' || name === '__qualname__') return clsVal.__ncls.split('.').pop();
  if (name === '__module__') { const i = clsVal.__ncls.lastIndexOf('.'); return i > 0 ? clsVal.__ncls.slice(0, i) : 'builtins'; }
  if (def.classMethods && name in def.classMethods) return METHODREF(clsVal, name);
  if (def.methods && name in def.methods) return METHODREF(clsVal, name);
  this.err(line, 'AttributeError', 'クラス「' + (def.typeName || clsVal.__ncls) + '」には属性「' + name + '」がありません', '綴りを確認するか、リファレンスで使える名前を確認してください');
  return UNK();
};

Interp.prototype.stdlibNativeCall = function (obj, name, args, kwargs, env, line) {
  kwargs = this.stdlibKwargs(kwargs, env);
  const def = nativeClassDef(obj.__native);
  if (def && def.methods && name in def.methods) { this.noteCall(obj.__native + '.' + name, 'method'); return def.methods[name](this.stdlibCtx(env, line), obj, args, kwargs || {}); }
  if (def && def.attrs && name in def.attrs) { const av = typeof def.attrs[name] === 'function' ? def.attrs[name](this.stdlibCtx(env, line), obj) : def.attrs[name]; return this.callFn(av, args, env, line); }
  this.err(line, 'AttributeError', typeName(obj) + ' オブジェクトには属性「' + name + '」がありません', '綴りを確認するか、リファレンスで使える名前を確認してください');
  return UNK();
};

Interp.prototype.stdlibClassCall = function (clsVal, name, args, kwargs, env, line) {
  kwargs = this.stdlibKwargs(kwargs, env);
  const def = nativeClassDef(clsVal.__ncls);
  if (def && def.classMethods && name in def.classMethods) { this.noteCall(clsVal.__ncls + '.' + name, 'method'); return def.classMethods[name](this.stdlibCtx(env, line), args, kwargs || {}); }
  this.err(line, 'AttributeError', 'クラス「' + (def && def.typeName ? def.typeName : clsVal.__ncls) + '」には属性「' + name + '」がありません', '綴りを確認するか、リファレンスで使える名前を確認してください');
  return UNK();
};

Interp.prototype.stdlibConstruct = function (clsVal, args, kwargs, env, line) {
  kwargs = this.stdlibKwargs(kwargs, env);
  const def = nativeClassDef(clsVal.__ncls);
  if (!def) { this.diag(line, 'note', '対応外', 'クラス「' + clsVal.__ncls + '」の生成はこの説明では解釈できません', ''); return UNK(); }
  this.noteCall(clsVal.__ncls, 'func');
  if (def.exc) {
    let text = '', argRepr = '';
    if (args.length === 1 && !isUnk(args[0])) { text = strVal(args[0]); argRepr = reprVal(args[0]); }
    else if (args.length > 1 && args.every(a => !isUnk(a))) { text = strVal(TUPLE(args)); argRepr = args.map(a => reprVal(a)).join(', '); }
    return EXC(def.exc, text, argRepr);
  }
  if (def.construct) return def.construct(this.stdlibCtx(env, line), args, kwargs || {});
  this.diag(line, 'note', '対応外', 'クラス「' + clsVal.__ncls + '」の生成はこの説明では解釈できません', '');
  return UNK();
};

Interp.prototype.stdlibBinOp = function (op, l, r, line) {
  const ctx = this.stdlibCtx(null, line);
  if (l && l.__native) { const d = nativeClassDef(l.__native); if (d && d.binop) { const res = d.binop(ctx, l, op, r, false); if (res !== STDLIB_NOT_HANDLED) return res; } }
  if (r && r.__native) { const d = nativeClassDef(r.__native); if (d && d.binop) { const res = d.binop(ctx, r, op, l, true); if (res !== STDLIB_NOT_HANDLED) return res; } }
  return STDLIB_NOT_HANDLED;
};

Interp.prototype.stdlibCompare = function (op, l, r, line) {
  const ctx = this.stdlibCtx(null, line);
  if (op === 'in' || op === 'not in') {
    if (r && r.__native) { const d = nativeClassDef(r.__native); if (d && d.contains) { const res = d.contains(ctx, r, l); if (res !== null && res !== undefined) return BOOL(op === 'in' ? res : !res); return UNK(); } }
    return STDLIB_NOT_HANDLED;
  }
  if (op === '==' || op === '!=') return STDLIB_NOT_HANDLED; // 等しさは eqVal が担う
  const flip = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' }[op];
  if (!flip) return STDLIB_NOT_HANDLED;
  if (l && l.__native) { const d = nativeClassDef(l.__native); if (d && d.compare) { const res = d.compare(ctx, l, op, r); if (res !== null && res !== undefined) return BOOL(res); } }
  if (r && r.__native) { const d = nativeClassDef(r.__native); if (d && d.compare) { const res = d.compare(ctx, r, flip, l); if (res !== null && res !== undefined) return BOOL(res); } }
  return STDLIB_NOT_HANDLED;
};

// 送出された例外種別 raised が、ハンドラ種別 handler にマッチするか。
// 標準ライブラリ例外の祖先（STDLIB_EXCEPTIONS）と組み込み階層の両方を見る。
Interp.prototype.stdlibExcMatches = function (raised, handler) {
  if (raised === handler) return true;
  const anc = stdlibExceptionAncestors(raised);
  if (anc.has(handler)) return true;
  for (const a of anc) if (EXC_NAMES.has(a) && excMatches(a, handler)) return true;
  if (EXC_NAMES.has(raised) && excMatches(raised, handler)) return true;
  return false;
};

Interp.prototype.resolveExceptHandler = function (hh, env, kind) {
  const line = hh.line;
  const typeErr = (what) => new SimDiag(line, 'TypeError', 'except で捕捉できるのは例外クラス（BaseException を継承したクラス）かそのタプルだけです（' + what + 'は例外クラスではありません）', 'except には例外クラスの名前か、例外クラスを要素とするタプルを書いてください');
  const srcDesc = (n) => n.k === 'name' ? '「' + n.name + '」' : '「' + exprSrc(n) + '」';
  let firstTypeErr = null, matched = false;
  const noteBad = (what) => { if (!firstTypeErr) firstTypeErr = typeErr(what); };
  // 1つの確定値を検証する。desc は文言用の発生源表示（「E」／「E」の値（tuple）の要素 等）。
  // タプル値は呼び出し側で扱うため、ここには来ない。
  const applySingle = (v, desc) => {
    if (isUnk(v)) { if (v.mod) noteBad('モジュール「' + v.mod + '」'); return; } // モジュールは確定して例外クラスではない。それ以外の未確定値は判定できない
    if (v && v.__handlerInstance) { noteBad(desc + 'の値（クラスのインスタンス）'); return; }
    if (v && v.__builtin) {
      if (EXC_NAMES.has(v.__builtin)) { if (excMatches(kind, v.__builtin) || this.stdlibExcMatches(kind, v.__builtin)) matched = true; }
      else noteBad('「' + v.__builtin + '」');
      return;
    }
    if (v && v.__ncls) {
      const nd = nativeClassDef(v.__ncls);
      if (nd && nd.exc) { if (this.stdlibExcMatches(kind, nd.exc)) matched = true; }
      else noteBad(desc + 'の値（クラス「' + v.__ncls + '」）');
      return;
    }
    // 例外クラスそのものではない確定値（通常クラス・type() の結果・例外のインスタンス・数値・関数など）
    noteBad(desc + 'の値（' + (v && v.__exc ? v.kind + ' のインスタンス' : typeName(v)) + '）');
  };
  // タプル値の要素を検証する（要素がタプルなら入れ子として TypeError。R26-N4）
  const applyTupleElems = (tupleVal, containerDesc) => {
    for (const elV of tupleVal.__tuple) {
      if (isTuple(elV)) { noteBad(containerDesc + 'の要素（tuple）'); continue; }
      applySingle(elV, containerDesc + 'の要素');
    }
  };
  // ハンドラ式（要素式）を評価する。呼出形は「呼び先の評価 → 引数の評価 → 呼び出し」の
  // 順を1回だけ実行する。例外クラス・型・通常クラスへの呼び出しはインスタンスを
  // 作るため、実体化せず目印を返す（コンストラクタ自体の未対応診断に化かさない）。
  const evalHandlerExpr = (node) => {
    if (node.k !== 'call') return this.eval(node, env);
    if (node.fn) { if (node.fn.k === 'name') this.noteCall(node.fn.name, 'func'); else if (node.fn.k === 'attr') this.noteCall(node.fn.name, 'method'); }
    if (node.args.some(a => a.dstar)) return this.eval(node, env); // ** 展開形は通常の呼び出し評価に委ねる
    const fnV = this.eval(node.fn, env);
    const args = this.evalArgs(node, env);
    if (args === null) return UNK('呼び出しの結果'); // * 展開の対象が実行時に決まる場合は判定できない
    const classLike = !!fnV && (!!fnV.__class || !!fnV.__type || !!fnV.__union || !!fnV.__ncls || (!!fnV.__builtin && (EXC_NAMES.has(fnV.__builtin) || TYPE_BUILTINS.includes(fnV.__builtin))));
    if (classLike) {
      for (const k of Object.keys(node.kwargs || {})) this.eval(node.kwargs[k], env); // キーワード引数も呼び出し前に評価される
      return { __handlerInstance: true };
    }
    if (isUnk(fnV)) return UNK('呼び出しの結果');
    if (fnV && fnV.__builtin) return this.callBuiltin(fnV.__builtin, args, node.kwargs, env, line, node);
    if (isFunc(fnV)) return this.callUserFunc(fnV, args, node.kwargs, env, line);
    if (fnV && fnV.__bound) return this.callUserFunc(fnV.fn, [fnV.instance, ...args], node.kwargs, env, line);
    if (fnV && fnV.__method) return this.callMethod(fnV.obj, fnV.name, args, node.kwargs, env, line);
    // 呼び出しできない確定値への呼び出しは、評価そのものが TypeError（実 CPython と同じ）
    this.err(line, 'TypeError', typeName(fnV) + ' は呼び出し（ ）ができません', '関数名のあとに ( ) を付けて呼び出します。変数と関数を取り違えていないか確認してください');
    return UNK();
  };
  const evalOrErr = (node) => {
    try { return { v: evalHandlerExpr(node) }; }
    catch (e) { if (e instanceof SimDiag && isCatchableDiag(e)) return { err: e }; throw e; }
  };
  if (hh.expr.k === 'tuple') {
    // リテラルタプル形（括弧なしの except A, B: も同じ AST）：要素を左から評価する
    for (const it of hh.expr.items) {
      const el = it.e;
      if (el.k === 'star') { // * 展開要素：展開された各値が要素になる
        let sv;
        try { sv = this.eval(el.e, env); } catch (e) { if (e instanceof SimDiag && isCatchableDiag(e)) return { err: e }; throw e; }
        if (isUnk(sv)) continue;
        let seq;
        try { seq = this.iterable(sv, line, true); } catch (e) { if (e instanceof SimDiag && isCatchableDiag(e)) return { err: e }; throw e; }
        if (seq === null) continue;
        for (const x of seq) { if (isTuple(x)) noteBad('「' + exprSrc(el) + '」の要素（tuple）'); else applySingle(x, '「' + exprSrc(el) + '」の要素'); }
        continue;
      }
      const r = evalOrErr(el);
      if (r.err) return { err: r.err }; // 要素の評価エラーは即座に伝播し、残りの要素は評価しない（実 CPython のタプル構築と同じ）
      if (isTuple(r.v)) { noteBad(srcDesc(el) + 'の値（tuple）'); continue; } // 要素の値がタプル＝入れ子（R26-N4）
      applySingle(r.v, srcDesc(el));
    }
  } else {
    const r = evalOrErr(hh.expr);
    if (r.err) return { err: r.err };
    if (isTuple(r.v)) applyTupleElems(r.v, srcDesc(hh.expr) + 'の値（tuple）');
    else applySingle(r.v, srcDesc(hh.expr));
  }
  if (firstTypeErr) return { err: firstTypeErr };
  return { match: matched };
};

Interp.prototype.eval = function (n, env) {
  if (!n) return UNK();
  switch (n.k) {
    case 'num': return !n.f && !SAFE(n.v) ? BIG() : NUM(n.v, n.f);
    case 'str': return n.v;
    case 'bool': return BOOL(n.v);
    case 'none': return NONE;
    case 'ellipsis': return ELLIPSIS;
    case 'byteslit': return BYTESV((n.v || []).slice());
    case 'cxlit': return CXV(0, n.v);
    case 'walrus': { if (n.name === '__debug__') this.err(n.line, 'SyntaxError', '「__debug__」には代入できません（cannot assign to __debug__）', '__debug__ は Python が決める組み込み定数です'); const v = this.eval(n.e, env); this.assignTo({ k: 'name', name: n.name, line: n.line }, v, env, n.line, false); return v; }
    case 'name': {
      const v = env.get(n.name);
      if (v === UNBOUND) this.err(n.line, 'UnboundLocalError', '関数の中で代入している変数「' + n.name + '」を、代入する前に使っています（関数の中で代入した名前は、その関数のローカル変数になります）', '外側の変数を使いたいなら global ' + n.name + ' と宣言するか、引数として渡してください');
      if (v !== undefined) return v;
      if (Object.hasOwn(BUILTIN_CONSTANTS, n.name)) return BUILTIN_CONSTANTS[n.name];
      if (BUILTIN_NAMES.includes(n.name) || PY_BUILTINS.has(n.name)) return BUILTIN(n.name);
      this.err(n.line, 'NameError', '変数「' + n.name + '」はまだ作られていません（値が入っていません）', '使う前に代入してください。綴り（大文字・小文字）が合っているかも確認してください');
      return UNK();
    }
    case 'fstr': {
      let out = '', hasUnk = false;
      for (const p of n.parts) {
        if (p.s !== undefined) { out += p.s; continue; }
        const v = this.eval(p.e, env);
        if (p.doc) out += p.doc;
        if (isUnk(v) || isIter(v)) { hasUnk = true; out += '（実行時に決まる値）'; continue; }
        // B6-Py3：インスタンスは __format__／__str__／__repr__ を発火する
        if (v && v.__instance) {
          if (this.specialLookup(v, '__format__') !== undefined && !p.conv) {
            const fr = this.callSpecialArgs(v, '__format__', [p.fmt || ''], n.line, env);
            if (isUnk(fr)) { hasUnk = true; out += '（実行時に決まる値）'; continue; }
            if (typeof fr !== 'string') this.err(n.line, 'TypeError', '__format__ は文字列を返す必要があります', '__format__ は文字列を返してください');
            out += fr; continue;
          }
          const bv = (p.conv === 'r' || p.conv === 'a' || (p.doc && !p.fmt && !p.conv)) ? this.reprValueOf(v, n.line, env) : this.strValueOf(v, n.line, env);
          if (isUnk(bv)) { hasUnk = true; out += '（実行時に決まる値）'; continue; }
          if (p.fmt) this.err(n.line, 'TypeError', 'このオブジェクトには書式指定は使えません（unsupported format string passed to ' + typeName(v) + '.__format__）', '__format__ を定義するか、書式指定なしで使ってください');
          out += p.conv === 'a' ? asciiEsc(bv) : bv;
          continue;
        }
        let base = v;
        if (p.conv === 'r' || p.conv === 'a' || (p.doc && !p.fmt && !p.conv)) base = reprVal(v);
        else if (p.conv === 's') base = strVal(v);
        // B7 統合時の基盤修正 F-H：ネイティブ値＋書式指定は def.format へ委譲する。
        if (p.fmt && base && base.__native) { const d = nativeClassDef(base.__native); if (d && d.format) { const fr = d.format(this.stdlibCtx(env, n.line), base, p.fmt); if (typeof fr === 'string') { out += fr; continue; } } }
        const fs = fmtSpec(base, p.fmt);
        // R30F01B-N3（バッチ9 N28）：f文字列側でも、不正な書式指定は
        // 実 CPython どおり ValueError／TypeError で停止する（正当だが
        // 未対応な指定だけが従来どおり「対応外」の名指し停止になる）。
        if (fs && fs.__fmtErr) this.err(n.line, fs.kind, fs.msg, '');
        if (fs === null) { hasUnk = true; out += '（実行時に決まる値）'; this.diag(n.line, 'note', '対応外', '書式指定「' + p.fmt + '」はこの説明では扱いません。その部分は「実行時に決まる値」として示します', ''); continue; }
        out += fs;
      }
      return hasUnk ? UNK('文字列の一部が実行時に決まる値') : out;
    }
    case 'list': {
      const arr = [];
      for (const it of n.items) {
        if (it.star) { const sv = this.eval(it.e, env); const seq = this.unpackSeq(sv, n.line); if (seq === null) return UNK(); arr.push(...seq); }
        else arr.push(this.eval(it.e, env));
      }
      return LIST(arr);
    }
    case 'tuple': { const arr = []; for (const it of n.items) { if (it.e && it.e.k === 'star') { const seq = this.unpackSeq(this.eval(it.e.e, env), n.line); if (seq === null) return UNK(); arr.push(...seq); } else arr.push(this.eval(it.e, env)); } return TUPLE(arr); }
    case 'set': { const arr = []; for (const it of n.items) { let vs; if (it.e && it.e.k === 'star') { const sv = this.eval(it.e.e, env); this.checkUnpackable(sv, n.line); const prev = this.orderFree; this.orderFree = true; vs = this.iterable(sv, n.line); this.orderFree = prev; if (vs === null) return UNK(); } else vs = [this.eval(it.e, env)]; for (const v of vs) { this.needHash(v, n.line); if (isUnk(v)) return UNK(); if (!arr.some(x => this.eqByVal(x, v, n.line))) arr.push(v); } } return SET(arr); }
    case 'dict': {
      const d = DICT();
      for (const p of n.pairs) { if (p.dstar) { const dv = this.eval(p.dstar, env); if (isUnk(dv)) return UNK(); if (!isDict(dv)) this.err(n.line, 'TypeError', '** のあとには辞書を書いてください', ''); for (const e of dv.__dict.values()) dictSet(d, e.k, e.v); continue; } const k = this.eval(p.k, env); const v = this.eval(p.v, env); if (!isUnk(k) && !dictSet(d, k, v)) this.err(n.line, 'TypeError', '辞書のキーにできない型です（' + typeName(k) + '）', 'キーには文字列や数値を使ってください'); if (isUnk(k)) return UNK(); }
      return d;
    }
    case 'un': {
      const v = this.eval(n.e, env);
      if (n.op === 'not') { const t = this.truthyOf(v, n.line, env); return t === null ? {...UNK(),symbolic:{kind:'unknown',op:'not',a:symbolic(v)}} : BOOL(!t); }
      if (isUnk(v)) return UNK();
      if (isComplex(v)) { if (n.op === '-') return CXV(-v.__complex.re, -v.__complex.im); if (n.op === '+') return v; this.err(n.line, 'TypeError', '複素数には ~（ビット反転）は使えません', ''); }
      if (isBool(v)) { const nv = v.v ? 1 : 0; return NUM(n.op === '-' ? -nv : n.op === '+' ? nv : ~nv, false); }
      if (isNum(v)) {
        if (n.op === '~') { if (v.f) this.err(n.line, 'TypeError', '小数には ~（ビット反転）は使えません', '整数に対して使ってください'); const tv = Math.trunc(v.v); return NUM(Math.abs(tv) < 2147483648 ? ~tv : Number(~BigInt(tv)), false); }
        return n.op === '-' ? NUM(-v.v, v.f) : v;
      }
      // B7 統合時の基盤修正 F-G：ネイティブ値への単項演算の委譲。
      // def.unary があれば使い、無ければ符号反転のみ 0 - v（反射 binop）で試す。
      if (v && v.__native) {
        const d = nativeClassDef(v.__native);
        const ctx = this.stdlibCtx(env, n.line);
        if (d && d.unary) { const r = d.unary(ctx, v, n.op); if (r !== STDLIB_NOT_HANDLED && r !== undefined) return r; }
        if (n.op === '-') {
          try { const r = this.binOp('-', NUM(0, false), v, n.line); if (!isUnk(r)) return r; } catch (e) { if (!(e instanceof SimDiag)) throw e; }
        }
        this.err(n.line, 'TypeError', typeName(v) + ' には符号（' + n.op + '）を付けられません', '数値に対して使ってください');
      }
      // B6-Py3：__neg__／__pos__／__invert__ を発火する
      if (v && v.__instance) {
        const unMap = { '-': '__neg__', '+': '__pos__', '~': '__invert__' };
        const unName = unMap[n.op];
        if (unName && this.specialLookup(v, unName) !== undefined) return this.callSpecial(v, unName, n.line, env);
      }
      this.err(n.line, 'TypeError', typeName(v) + ' には符号（' + n.op + '）を付けられません', '数値に対して使ってください');
      return UNK();
    }
    case 'boolop': {
      let result = this.eval(n.items[0], env);
      for (let i = 1; i < n.items.length; i++) {
        const t = this.truthyOf(result, n.line, env);
        if (n.op === 'and' && t === false) return result;
        if (n.op === 'or' && t === true) return result;
        if (t === null) {if(hasNode([n.items[i]],x=>x.k==='call'))this.err(n.line,'未対応','短絡評価が未確定の関数呼び出しは説明に対応していません','');let right=this.eval(n.items[i],env);result={...UNK(),symbolic:{kind:'unknown',op:n.op,a:symbolic(result),b:symbolic(right)}};continue;}
        result = this.eval(n.items[i], env);
      }
      return result;
    }
    case 'bin': {
      if (n.l && n.l.k === 'bin') { // 左肩の長い連鎖（0 + 1 + … + 1999）は再帰せず左から畳む（スタック超過の回避）
        const chain = [];
        let cur = n;
        while (cur && cur.k === 'bin') { chain.unshift(cur); cur = cur.l; }
        let acc = this.eval(cur, env);
        for (const nd of chain) acc = this.binOp(nd.op, acc, this.eval(nd.r, env), nd.line);
        return acc;
      }
      const l = this.eval(n.l, env), r = this.eval(n.r, env);
      return this.binOp(n.op, l, r, n.line);
    }
    case 'cmp': {
      let accumulated=null,left = this.eval(n.first, env);
      for (const p of n.pairs) {
        const right = this.eval(p.e, env);
        const res = this.compare(p.op, left, right, n.line);
        if (isBool(res) && !res.v) return BOOL(false);
        if (isUnk(res)) accumulated=accumulated?{...UNK(),symbolic:{kind:'unknown',op:'and',a:symbolic(accumulated),b:symbolic(res)}}:res;
        left = right;
      }
      return accumulated||BOOL(true);
    }
    case 'ifexp': {
      const c = this.eval(n.cond, env); const t = this.truthyOf(c, n.line, env);
      if (t === null) return UNK();
      return this.eval(t ? n.then : n.els, env);
    }
    case 'sub': {
      const obj = this.eval(n.obj, env); const idx = this.eval(n.idx, env);
      return this.subGet(obj, idx, n.line);
    }
    case 'slice': {
      const obj = this.eval(n.obj, env);
      const lo = n.lo ? this.eval(n.lo, env) : null, hi = n.hi ? this.eval(n.hi, env) : null, st = n.step ? this.eval(n.step, env) : null;
      return this.sliceGet(obj, lo, hi, st, n.line);
    }
    case 'attr': {
      const obj = this.eval(n.obj, env);
      // B6-Py3：super プロキシ／property オブジェクトの属性
      if (isSuper(obj)) return this.getAttrSuper(obj, n.name, n.line, env);
      if (isProp(obj)) {
        if (n.name === 'fget') return obj.fget || NONE;
        if (n.name === 'fset') return obj.fset || NONE;
        if (n.name === 'fdel') return obj.fdel || NONE;
        if (n.name === '__name__') {
          if (obj.fget && isFunc(obj.fget)) return obj.fget.def.name;
          this.err(n.line, 'AttributeError', 'この property には __name__ がありません（getter がありません）', '');
        }
        if (n.name === 'getter' || n.name === 'setter' || n.name === 'deleter') return PROPMOD(obj, n.name);
        this.err(n.line, 'AttributeError', 'property には属性「' + n.name + '」がありません', '');
      }
      if (obj && obj.__instance) return this.getAttrInstance(obj, n.name, n.line, env);
      // B6-Py3：object.__new__／__getattribute__／__setattr__ の組み込み相当
      if (obj && ((obj.__builtin === 'object') || (obj.__type === 'object'))) {
        if (n.name === '__new__') return OBJNEW(null);
        if (n.name === '__getattribute__') return OBJGA;
        if (n.name === '__setattr__') return OBJSA;
      }
      if (obj && obj.__type && (n.name === '__name__' || n.name === '__qualname__')) return obj.__type;
      if (isFunc(obj) && n.name === '__annotations__') {
        const d = DICT();
        const toType = (v) => (v && v.__builtin && ['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set'].includes(v.__builtin)) ? TYPEVAL(v.__builtin) : v;
        for (const p of obj.def.params) if (p.ann) dictSet(d, p.name, toType(this.eval(p.ann, obj.env || env)));
        if (obj.def.retAnn) dictSet(d, 'return', toType(this.eval(obj.def.retAnn, obj.env || env)));
        return d;
      }
      if (isUnk(obj) && obj.mod === 'math' && n.name in MATH_CONST) return NUM(MATH_CONST[n.name], true);
      if (isUnk(obj) && obj.mod && isStdlibModule(obj.mod)) return this.stdlibModuleAttr(obj, n.name, n.line);
      if (isUnk(obj)) return UNK();
      if (isNone(obj)) this.err(n.line, 'AttributeError', 'None には属性「' + n.name + '」がありません（値が None になっていないか確認してください）', 'return を書き忘れた関数の戻り値などで None になっていないか確認してください');
      if (isNum(obj) && (n.name === 'real' || n.name === 'imag')) return n.name === 'real' ? obj : NUM(0, obj.f);
      if (isBool(obj) && (n.name === 'real' || n.name === 'imag')) return NUM(n.name === 'real' ? (obj.v ? 1 : 0) : 0, false);
      if (isNum(obj) && !obj.f && n.name === 'numerator') return obj;
      if (isNum(obj) && !obj.f && n.name === 'denominator') return NUM(1, false);
      // §3.2 是正：bool は int のサブクラスで、numerator／denominator も
      // メソッドではなく int と同じ実値（True なら 1／1、False なら 0／1）。
      // ここで返さないと下の TYPE_ATTRS 経路でメソッド参照として返ってしまう。
      if (isBool(obj) && n.name === 'numerator') return NUM(obj.v ? 1 : 0, false);
      if (isBool(obj) && n.name === 'denominator') return NUM(1, false);
      if (obj && obj.__range && obj.rng && (n.name === 'start' || n.name === 'stop' || n.name === 'step')) return NUM(obj.rng[n.name === 'start' ? 0 : n.name === 'stop' ? 1 : 2], false);
      // 統合第2弾の合成裁定：基礎の単純な classLookup 行は、B6 が
      // getAttrClass（ディスクリプタ／classmethod／super 等の完全な
      // 属性解決）へ置き換えたため、B7 側に残っていた同行は置かない
      // （残すと全てのクラス属性アクセスを横取りし、B6 の機構が
      // 影になる）。B7 の例外属性・ネイティブ属性の各行は値の族が
      // 互いに素なため、getAttrClass より前に置いて共存させる。
      if (obj && obj.__exc && obj.excAttrs && n.name in obj.excAttrs) return obj.excAttrs[n.name];
      if (obj && obj.__native) return this.stdlibNativeAttr(obj, n.name, env, n.line);
      if (obj && obj.__ncls) return this.stdlibClassAttr(obj, n.name, env, n.line);
      if (isComplex(obj) && (n.name === 'real' || n.name === 'imag')) return NUM(n.name === 'real' ? obj.__complex.re : obj.__complex.im, true);
      if (isSlice(obj)) { if (n.name === 'start') return obj.__slice.start; if (n.name === 'stop') return obj.__slice.stop; if (n.name === 'step') return obj.__slice.step; }
      if (isMemview(obj)) {
        const mv = obj.__memview;
        if (mv.released) this.err(n.line, 'ValueError', '解放済み（release 済み）の memoryview は使えません（operation forbidden on released memoryview object）', '');
        if (n.name === 'obj') return mv.obj;
        if (n.name === 'nbytes') return NUM(mv.len, false);
        if (n.name === 'readonly') return BOOL(mv.readonly);
        if (n.name === 'format') return 'B';
        if (n.name === 'itemsize') return NUM(1, false);
        if (n.name === 'ndim') return NUM(1, false);
        if (n.name === 'shape') return TUPLE([NUM(mv.len, false)]);
        if (n.name === 'strides') return TUPLE([NUM(1, false)]);
        if (n.name === 'suboffsets') return TUPLE([]);
        if (n.name === 'c_contiguous' || n.name === 'f_contiguous' || n.name === 'contiguous') return BOOL(true);
      }
      { // 型そのものへのクラスメソッド参照（int.from_bytes 等を値として取り出す形）
        const tname = obj && obj.__type ? obj.__type : obj && obj.__builtin && TYPE_BUILTINS.includes(obj.__builtin) ? obj.__builtin : null;
        if (tname && ['from_bytes', 'fromhex', 'from_number', 'fromkeys', 'maketrans'].includes(n.name)) return METHODREF(obj, n.name);
      }
      if (obj && obj.__class) return this.getAttrClass(obj, n.name, n.line, env);
      // B6-Py3：__class__ はあらゆる値でその型を返す
      if (n.name === '__class__' && obj !== undefined && !isUnk(obj)) return TYPEVAL(typeName(obj));
      // B6監査D12：__annotate__ は未検証（注釈の遅延評価の意味論を確定できない）
      if (n.name === '__annotate__' && (isFunc(obj) || (obj && obj.__class) || (obj && obj.__instance))) this.err(n.line, '未検証', 'object.__annotate__（注釈の遅延評価）は意味論が未検証のため、この説明では値を返しません', '');
      { const tn = typeName(obj); if (TYPE_ATTRS[tn] && !TYPE_ATTRS[tn].has(n.name)) this.err(n.line, 'AttributeError', tn + ' には属性「' + n.name + '」はありません', '綴りを確認するか、リファレンスで使える名前を確認してください'); }
      { const tn = typeName(obj); if (TYPE_ATTRS[tn] && TYPE_ATTRS[tn].has(n.name) && (typeof obj === 'string' || isList(obj) || isDict(obj) || isSet(obj) || isTuple(obj) || (obj && obj.__range) || isNum(obj) || isBool(obj) || isBytesLike(obj) || isComplex(obj) || isSlice(obj) || isMemview(obj))) return METHODREF(obj, n.name); }
      return UNK('属性「' + n.name + '」の値');
    }
    case 'call': return this.evalCall(n, env);
    case 'listcomp': case 'setcomp': case 'dictcomp': return this.evalComp(n, env);
    case 'lambda': this.diag(n.line, 'note', '対応外', 'lambda（無名関数）はこの説明では解釈できません', '通常の def で書くと説明できます'); return UNK('lambda の結果');
    case 'unkexpr': this.diag(n.line, 'note', '対応外', '「' + n.what + '」はこの説明では解釈できません。関係する値は「実行時に決まる値」として扱います', ''); return UNK(n.what + ' の結果');
    case 'star': { const v = this.eval(n.e, env); this.checkUnpackable(v, n.line); return v; }
    case '__val': return n.v;
  }
  return UNK();
};

const INPLACE_DONE = { __inplace: true };
// 複合代入（+= など）：リスト・集合・辞書の一部は CPython では同じオブジェクトを書き換える（別名にも反映される）
Interp.prototype.binOpInPlace = function (op, cur, rhs, line) {
  // B6-Py3：__iadd__ 等の in-place 特殊メソッドを発火する
  // （NotImplemented のときは通常の二項演算へフォールバックする）
  if (cur && cur.__instance) {
    const IMAP = { '+': '__iadd__', '-': '__isub__', '*': '__imul__', '@': '__imatmul__', '/': '__itruediv__', '//': '__ifloordiv__', '%': '__imod__', '**': '__ipow__', '<<': '__ilshift__', '>>': '__irshift__', '&': '__iand__', '^': '__ixor__', '|': '__ior__' };
    const inm = IMAP[op];
    if (inm && this.specialLookup(cur, inm) !== undefined) {
      const res = this.callSpecialArgs(cur, inm, [rhs], line, null);
      if (res !== undefined && !isNotImplemented(res)) return res;
      return this.binOp(op, cur, rhs, line);
    }
  }
  if (isBytearray(cur) && op === '+') {
    const seq = isBytesLike(rhs) ? bytesOf(rhs) : isMemview(rhs) ? mvBytes(rhs) : null;
    if (seq === null) { if (!isUnk(rhs)) this.err(line, 'TypeError', 'bytearray に足せるのは bytes のような並びだけです', ''); poison(cur, '書き換えられたかもしれない bytearray'); return INPLACE_DONE; }
    for (const x of seq) cur.__bytearray.push(x);
    return INPLACE_DONE;
  }
  if (isBytearray(cur) && op === '*') {
    if (!isNum(rhs) || rhs.f) this.err(line, 'TypeError', 'bytearray の繰り返し回数には整数を使ってください', '');
    const n = Math.trunc(rhs.v); const orig = cur.__bytearray.slice();
    cur.__bytearray.length = 0;
    if (n > 0) for (let k = 0; k < n; k++) for (const x of orig) cur.__bytearray.push(x);
    return INPLACE_DONE;
  }
  if (isList(cur) && (op === '+' || op === '*')) {
    if (op === '+') {
      const seq = this.iterable(rhs, line, true);
      if (seq === null) { if (!isUnk(rhs)) this.err(line, 'TypeError', 'リストに足せるのは、リストや文字列などの「並び」だけです', '右側は並びにしてください'); poison(cur, '書き換えられたかもしれないリスト'); return INPLACE_DONE; }
      for (const x of seq) cur.__list.push(x);
      return INPLACE_DONE;
    }
    if (!isNum(rhs) || rhs.f) this.err(line, 'TypeError', 'リストの繰り返し回数には整数を使ってください', '');
    const n = Math.trunc(rhs.v);
    if (n <= 0) { cur.__list.length = 0; return INPLACE_DONE; }
    const orig = cur.__list.slice();
    if (orig.length * n > 100000) { poison(cur, 'とても長いリスト'); return INPLACE_DONE; }
    cur.__list.length = 0;
    for (let k = 0; k < n; k++) for (const x of orig) cur.__list.push(x);
    return INPLACE_DONE;
  }
  if (isSet(cur) && isSet(rhs) && (op === '|' || op === '&' || op === '-' || op === '^')) {
    const res = this.binOp(op, cur, rhs, line);
    if (isSet(res)) { cur.__set.length = 0; for (const x of res.__set) cur.__set.push(x); }
    else poison(cur, '書き換えられたかもしれない集合');
    return INPLACE_DONE;
  }
  if (isDict(cur) && op === '|' && isDict(rhs)) {
    for (const e of rhs.__dict.values()) dictSet(cur, e.k, e.v);
    return INPLACE_DONE;
  }
  return this.binOp(op, cur, rhs, line);
};
Interp.prototype.binOp = function (op, l, r, line) {
  let res;
  if ((l && l.__native) || (r && r.__native)) { const nr = this.stdlibBinOp(op, l, r, line); res = nr === STDLIB_NOT_HANDLED ? this.binOp0(op, l, r, line) : nr; }
  else res = this.binOp0(op, l, r, line);
  if (isNum(res) && !res.f && !SAFE(res.v)) return BIG();
  if (isNum(res) && res.f && !Number.isFinite(res.v) && isNum(l) && isNum(r) && Number.isFinite(l.v) && Number.isFinite(r.v)) {
    if (op === '**') this.err(line, 'OverflowError', '計算結果が大きすぎて小数（float）で表せません', '');
    return res;
  }
  return res;
};
// B6-Py3：二項演算の特殊メソッド発火（左の __add__ 等 → 右の反射
// __radd__ 等の順。NotImplemented が返れば次の候補へ進む）。
Interp.prototype.tryBinSpecial = function (op, l, r, line) {
  const MAP = { '+': ['__add__', '__radd__'], '-': ['__sub__', '__rsub__'], '*': ['__mul__', '__rmul__'], '@': ['__matmul__', '__rmatmul__'], '/': ['__truediv__', '__rtruediv__'], '//': ['__floordiv__', '__rfloordiv__'], '%': ['__mod__', '__rmod__'], '**': ['__pow__', '__rpow__'], '<<': ['__lshift__', '__rlshift__'], '>>': ['__rshift__', '__rrshift__'], '&': ['__and__', '__rand__'], '^': ['__xor__', '__rxor__'], '|': ['__or__', '__ror__'] };
  const pair = MAP[op];
  if (!pair) return undefined;
  const [fwd, rev] = pair;
  if (l && l.__instance && this.specialLookup(l, fwd) !== undefined) {
    const res = this.callSpecialArgs(l, fwd, [r], line, null);
    if (res !== undefined && !isNotImplemented(res)) return res;
  }
  if (r && r.__instance && this.specialLookup(r, rev) !== undefined) {
    const res = this.callSpecialArgs(r, rev, [l], line, null);
    if (res !== undefined && !isNotImplemented(res)) return res;
  }
  return undefined;
};
// B6-Py3：__index__ 契約で整数化する。NUM／UNK／null（解釈できない）を返す。
Interp.prototype.indexValue = function (v, line) {
  if (isBool(v)) return NUM(v.v ? 1 : 0, false);
  if (isNum(v) && !v.f) return v;
  if (v && v.__instance && this.specialLookup(v, '__index__') !== undefined) {
    const r = this.callSpecial(v, '__index__', line, null);
    if (isUnk(r)) return r;
    if (isBool(r)) return NUM(r.v ? 1 : 0, false);
    if (isNum(r) && !r.f) return r;
    this.err(line, 'TypeError', '__index__() の戻り値（' + typeName(r) + '）は整数として解釈できません', '__index__ は整数を返してください');
  }
  return null;
};
Interp.prototype.binOp0 = function (op, l, r, line) {
  // B6-Py3：ユーザー定義クラスのインスタンスは特殊メソッドを発火する
  if ((l && l.__instance) || (r && r.__instance)) { const sr = this.tryBinSpecial(op, l, r, line); if (sr !== undefined) return sr; }
  if (op === '@') { this.diag(line, 'note', '対応外', '演算子 @ はこの説明では解釈できません', ''); return UNK(); }
  if (isUnk(l) || isUnk(r)) return {...UNK(),symbolic:{kind:'unknown',op,a:symbolic(l),b:symbolic(r)}};
  const ln = isBool(l) ? NUM(l.v ? 1 : 0, false) : l, rn = isBool(r) ? NUM(r.v ? 1 : 0, false) : r;
  if (isComplex(l) || isComplex(r)) {
    const pa = cxParts(l), pb = cxParts(r);
    if (pa && pb) {
      if (op === '+') return CXV(pa.re + pb.re, pa.im + pb.im);
      if (op === '-') return CXV(pa.re - pb.re, pa.im - pb.im);
      if (op === '*') return CXV(pa.re * pb.re - pa.im * pb.im, pa.re * pb.im + pa.im * pb.re);
      if (op === '/') { const d = pb.re * pb.re + pb.im * pb.im; if (d === 0) this.err(line, 'ZeroDivisionError', '0（複素数）で割り算はできません', ''); return CXV((pa.re * pb.re + pa.im * pb.im) / d, (pa.im * pb.re - pa.re * pb.im) / d); }
      if (op === '**') {
        if (pb.im === 0 && Number.isInteger(pb.re) && Math.abs(pb.re) <= 1000) { let acc = CXV(1, 0); const e = Math.abs(pb.re); for (let k = 0; k < e; k++) acc = CXV(acc.__complex.re * pa.re - acc.__complex.im * pa.im, acc.__complex.re * pa.im + acc.__complex.im * pa.re); if (pb.re < 0) { const d2 = acc.__complex.re ** 2 + acc.__complex.im ** 2; if (d2 === 0) this.err(line, 'ZeroDivisionError', '0 を負の数で累乗することはできません', ''); return CXV(acc.__complex.re / d2, -acc.__complex.im / d2); } return acc; }
        const rlog = Math.hypot(pa.re, pa.im), ang = Math.atan2(pa.im, pa.re); const lr = Math.log(rlog), na = pb.re * ang + pb.im * lr, nr = Math.exp(pb.re * lr - pb.im * ang); return CXV(nr * Math.cos(na), nr * Math.sin(na));
      }
      this.typeErr(line, op, l, r);
    }
    if ((isComplex(l) && (isNum(r) || isBool(r))) || (isComplex(r) && (isNum(l) || isBool(l)))) { /* cxParts で処理済み */ }
    else this.typeErr(line, op, l, r);
  }
  if (op === '+') {
    if (isBytesLike(l) && isBytesLike(r)) { const out = bytesOf(l).concat(bytesOf(r)); return isBytearray(l) ? BYTEARRAY(out) : BYTESV(out); }
    if (isNum(ln) && isNum(rn)) return NUM(ln.v + rn.v, ln.f || rn.f);
    if (typeof l === 'string' && typeof r === 'string') { if (l.length + r.length > 200000) return UNK('とても長い文字列'); return l + r; }
    if (isList(l) && isList(r)) { if (l.__list.length + r.__list.length > 200000) return UNK('とても長いリスト'); return LIST(l.__list.concat(r.__list)); }
    if (isTuple(l) && isTuple(r)) return TUPLE(l.__tuple.concat(r.__tuple));
    this.typeErr(line, op, l, r);
  }
  if (op === '-') {
    if (isNum(ln) && isNum(rn)) return NUM(ln.v - rn.v, ln.f || rn.f);
    if (isSet(l) && isSet(r)) { const res = l.__set.filter(x => !r.__set.some(y => this.eqByVal(x, y, line))); return isFrozenSet(l) ? FROZENSET(res) : SET(res); }
    this.typeErr(line, op, l, r);
  }
  if (op === '*') {
    if (isBytesLike(l) && isNum(rn) && !rn.f) { const a = repeatArr(bytesOf(l), rn.v); return a === null ? UNK('とても長いバイト列') : isBytes(l) ? BYTESV(a) : BYTEARRAY(a); }
    if (isNum(ln) && !ln.f && isBytesLike(r)) { const a = repeatArr(bytesOf(r), ln.v); return a === null ? UNK('とても長いバイト列') : isBytes(r) ? BYTESV(a) : BYTEARRAY(a); }
    if (isNum(ln) && isNum(rn)) return NUM(ln.v * rn.v, ln.f || rn.f);
    if (typeof l === 'string' && isNum(rn)) { if (isNum(r) && r.f) this.typeErr(line, op, l, r); return repeatStr(l, rn.v, line, this); }
    if (isNum(ln) && typeof r === 'string') { if (isNum(l) && l.f) this.typeErr(line, op, l, r); return repeatStr(r, ln.v, line, this); }
    if ((isList(l) || isTuple(l)) && isNum(rn) && !rn.f) { const a = repeatArr(isList(l) ? l.__list : l.__tuple, rn.v); return a === null ? UNK('とても長い並び') : isList(l) ? LIST(a) : TUPLE(a); }
    if (isNum(ln) && !ln.f && (isList(r) || isTuple(r))) { const a = repeatArr(isList(r) ? r.__list : r.__tuple, ln.v); return a === null ? UNK('とても長い並び') : isList(r) ? LIST(a) : TUPLE(a); }
    this.typeErr(line, op, l, r);
  }
  if (op === '/' || op === '//' || op === '%') {
    if (isNum(ln) && isNum(rn)) {
      if (rn.v === 0) this.err(line, 'ZeroDivisionError', '0 で割り算（または余り）を求めることはできません', '割る数が 0 にならないよう、条件で分けるか値を確認してください');
      if (op === '/') return NUM(ln.v / rn.v, true);
      if (ln.f || rn.f) { const dm = floatDivmod(ln.v, rn.v, line, this); return NUM(op === '//' ? dm.q : dm.m, true); }
      // 整数同士は BigInt で正確に（double の割り算では切り捨ての境界を間違えることがある）
      const A = BigInt(Math.trunc(ln.v)), B = BigInt(Math.trunc(rn.v));
      let q = A / B; if (A % B !== 0n && ((A < 0n) !== (B < 0n))) q -= 1n;
      return NUM(Number(op === '//' ? q : A - q * B), false);
    }
    if (op === '%' && typeof l === 'string') { this.diag(line, 'note', '対応外', '文字列の % 書式はこの説明では解釈できません', 'f文字列（f"…{値}…"）を使うと説明できます'); return UNK(); }
    this.typeErr(line, op, l, r);
  }
  if (op === '**') {
    if (isNum(ln) && isNum(rn)) {
      if (ln.v === 0 && rn.v < 0) this.err(line, 'ZeroDivisionError', '0 を負の数で累乗することはできません', '');
      if (!ln.f && !rn.f && rn.v >= 0) { // 整数の累乗は BigInt で正確に求め、安全な範囲を超えたら正直に「不明」を返す
        const E = Math.trunc(rn.v);
        if (E > 10000) return BIG();
        const R = BigInt(Math.trunc(ln.v)) ** BigInt(E);
        const n = Number(R);
        return SAFE(n) && BigInt(n) === R ? NUM(n, false) : BIG();
      }
      if (ln.v < 0 && !Number.isInteger(rn.v)) return UNK('複素数の結果'); // (-2) ** 0.5 は複素数になる
      const res = Math.pow(ln.v, rn.v);
      return NUM(res, ln.f || rn.f || rn.v < 0 || !Number.isInteger(res));
    }
    this.typeErr(line, op, l, r);
  }
  if (op === '|' || op === '&' || op === '^' || op === '<<' || op === '>>') {
    if (op === '|' && isClassValue(l) && isClassValue(r)) return { __union: [...(l.__union || [l]), ...(r.__union || [r])] }; // 型 | 型 は合併型（Python 3.10 以降、isinstance の第2引数に使える）
    if (isBool(l) && isBool(r) && op !== '<<' && op !== '>>') return BOOL(op === '|' ? (l.v || r.v) : op === '&' ? (l.v && r.v) : (l.v !== r.v));
    if (isSet(l) && isSet(r) && op !== '<<' && op !== '>>') {
      const wrap = (arr) => isFrozenSet(l) ? FROZENSET(arr) : SET(arr);
      if (op === '|') { const a = l.__set.slice(); for (const x of r.__set) if (!a.some(y => this.eqByVal(x, y, line))) a.push(x); return wrap(a); }
      if (op === '&') return wrap(l.__set.filter(x => r.__set.some(y => this.eqByVal(x, y, line))));
      const kept = l.__set.filter(x => !r.__set.some(y => this.eqByVal(x, y, line))); for (const x of r.__set) if (!l.__set.some(y => this.eqByVal(x, y, line)) && !kept.some(y => this.eqByVal(x, y, line))) kept.push(x); return wrap(kept); // 対称差：右だけにある要素を足す（共通要素は足さない）
    }
    if (op === '|' && isDict(l) && isDict(r)) { const d = isFrozenDict(l) ? FROZENDICT() : DICT(); for (const e of l.__dict.values()) dictSet(d, e.k, e.v); for (const e of r.__dict.values()) dictSet(d, e.k, e.v); return d; }
    if ((op === '|' || op === '&') && isView(l) && isView(r) && l.which === 'keys' && r.which === 'keys') {
      const a = viewItems(l), b = viewItems(r);
      return SET(op === '&' ? a.filter(x => b.some(y => eqVal(x, y) === true)) : [...a, ...b.filter(x => !a.some(y => eqVal(x, y) === true))]);
    }
    if (isNum(ln) && isNum(rn)) {
      if (ln.f || rn.f) this.typeErr(line, op, l, r); // 小数にビット演算は使えない
      const A = BigInt(Math.trunc(ln.v)), B = BigInt(Math.trunc(rn.v));
      let R;
      if (op === '|') R = A | B;
      else if (op === '&') R = A & B;
      else if (op === '^') R = A ^ B;
      else {
        if (B < 0n) this.err(line, 'ValueError', 'シフトの回数を負の数にはできません', '');
        if (B > 100000n) return BIG();
        R = op === '<<' ? A << B : A >> B;
      }
      const n = Number(R);
      return SAFE(n) && BigInt(n) === R ? NUM(n, false) : BIG();
    }
    this.typeErr(line, op, l, r);
  }
  return UNK();
};
// CPython の float の // と %（float_divmod と同じ計算：余りの符号は割る数に合わせる）
function floatDivmod(x, y, line, self) {
  if (Number.isNaN(x) || Number.isNaN(y)) return { q: NaN, m: NaN };
  if (!Number.isFinite(x)) self.err(line, 'ValueError', '無限大では割り算の切り捨て・余りは求められません', '');
  if (!Number.isFinite(y)) { // 割る数が無限大：余りは x または ±inf、商は 0 か -1
    const m0 = x % y;
    const m = m0 !== 0 && ((y < 0) !== (m0 < 0)) ? m0 + y : m0;
    return { q: x !== 0 && ((x < 0) !== (y < 0)) ? -1 : 0, m };
  }
  let mod = x % y;
  let div = (x - mod) / y;
  if (mod !== 0) { if ((y < 0) !== (mod < 0)) { mod += y; div -= 1; } } // CPython の float_divmod：余りの符号を割る数に合わせるとき商も1引く（0.5 // -3 は -1.0）
  else mod = y < 0 || Object.is(y, -0) ? -0 : 0;
  let q = Math.floor(div);
  if (div - q > 0.5) q += 1;
  if (q === 0) q = ((x < 0 || Object.is(x, -0)) !== (y < 0 || Object.is(y, -0))) ? -0 : 0; // 商が 0 のときの符号は通常の割り算 x/y に従う（-0.5 // -3 は 0.0、0.0 // -3 は -0.0）
  return { q, m: mod };
}
Interp.prototype.typeErr = function (line, op, l, r) {
  let fix = '型を確認してください。文字列と数値をくっつけたいときは str() で文字列に変えます';
  if (typeof l === 'string' && isNum(r) && op === '+') fix = '文字列に数値をくっつけるときは str() で文字列に変えてください（例："合計は" + str(x)）';
  if (isNum(l) && typeof r === 'string' && op === '+') fix = '数値に文字列を足すことはできません。int() や float() で数値に変えるか、str() で文字列同士にしてください';
  this.err(line, 'TypeError', typeName(l) + ' と ' + typeName(r) + ' の間では「' + op + '」は使えません', fix);
};
function repeatStr(s, n, line, self) {
  if (n < 0) return '';
  if (s.length * n > 100000) { self.diag(line, 'note', '注意', '文字列の繰り返しが大きすぎるため、結果は省略します', ''); return UNK('とても長い文字列'); }
  if (n > 0 && !Number.isInteger(n)) return UNK();
  return s.repeat(Math.trunc(n));
}
function repeatArr(a, n) { if (n <= 0) return []; if (a.length * n > 100000) return null; const out = []; for (let i = 0; i < n; i++) for (const x of a) out.push(x); return out; }

// B6-Py3：等価比較の特殊メソッド発火（__eq__／__ne__。NotImplemented
// なら相手側→同一性の既定へ進む）。戻り値が定まれば BOOL／UNK、
// 発火しなければ undefined。
Interp.prototype.tryEqSpecial = function (op, l, r, line) {
  const name = op === '==' ? '__eq__' : '__ne__';
  const attempt = (inst, other) => {
    if (!(inst && inst.__instance)) return undefined;
    let useName = name;
    // CPython：__ne__ が無く __eq__ だけがある場合は __eq__ の結果を反転する
    if (this.specialLookup(inst, useName) === undefined) {
      if (op === '!=' && this.specialLookup(inst, '__eq__') !== undefined) useName = '__eq__';
      else return undefined;
    }
    const res = this.callSpecialArgs(inst, useName, [other], line, null);
    if (res === undefined || isNotImplemented(res)) return undefined;
    if (isUnk(res)) return UNK();
    const t = this.truthyOf(res, line, null);
    if (t === null) return UNK();
    return BOOL(useName === '__eq__' && op === '!=' ? !t : t);
  };
  const a = attempt(l, r);
  if (a !== undefined) return a;
  return attempt(r, l);
};
// B6-Py3：in や要素探索での等価判定。どちらかがインスタンスなら
// __eq__（compare）で判定し、それ以外は従来の eqVal を使う。
// 同一オブジェクトは CPython と同じく __eq__ より先に一致とする。
Interp.prototype.eqByVal = function (a, b, line) {
  if (a === b) return true;
  if ((a && a.__instance) || (b && b.__instance)) {
    const c = this.compare('==', a, b, line);
    return isBool(c) ? c.v : false;
  }
  // B6監査D6：集合同士の比較は要素ごとに __eq__ を発火させる
  if (isSet(a) && isSet(b)) {
    if (a.__set.length !== b.__set.length) return false;
    return a.__set.every(x => b.__set.some(y => this.eqByVal(x, y, line)));
  }
  return eqVal(a, b) === true;
};
// B6-Py3：順序比較の特殊メソッド発火（__lt__ 等と反射の組み合わせ）。
Interp.prototype.tryOrdSpecial = function (op, l, r, line) {
  const FWD = { '<': '__lt__', '<=': '__le__', '>': '__gt__', '>=': '__ge__' };
  const REV = { '<': '__gt__', '<=': '__ge__', '>': '__lt__', '>=': '__le__' };
  const attempt = (inst, other, name) => {
    if (!(inst && inst.__instance) || this.specialLookup(inst, name) === undefined) return undefined;
    const res = this.callSpecialArgs(inst, name, [other], line, null);
    if (res === undefined || isNotImplemented(res)) return undefined;
    if (isUnk(res)) return UNK();
    const t = this.truthyOf(res, line, null);
    return t === null ? UNK() : BOOL(t);
  };
  const a = attempt(l, r, FWD[op]);
  if (a !== undefined) return a;
  return attempt(r, l, REV[op]);
};
Interp.prototype.compare = function (op, l, r, line) {
 if(isUnk(l)||isUnk(r))return{...UNK(),symbolic:{kind:'unknown',op,a:symbolic(l),b:symbolic(r)}};
  if ((l && l.__native) || (r && r.__native)) { const cr = this.stdlibCompare(op, l, r, line); if (cr !== STDLIB_NOT_HANDLED) return cr; }
  if (op === 'in' || op === 'not in') {
    let res = null;
    if (isUnk(l) || isUnk(r)) res = null;
    else if (typeof r === 'string' && typeof l === 'string') res = r.includes(l);
    // B6-Py3：要素か探す値のどちらかがインスタンスなら __eq__ で判定する
    else if (isList(r)) res = r.__list.some(x => this.eqByVal(x, l, line));
    else if (isTuple(r)) res = r.__tuple.some(x => this.eqByVal(x, l, line));
    else if (isSet(r)) { if (dictKeyId(l) === null) this.err(line, 'TypeError', typeName(l) + ' は集合の要素にできません（ハッシュできない型です）', ''); res = r.__set.some(x => this.eqByVal(x, l, line)); }
    else if (isDict(r)) { if (dictKeyId(l) === null) this.err(line, 'TypeError', typeName(l) + ' は辞書のキーにできません（ハッシュできない型です）', ''); res = dictGet(r, l) !== undefined || [...r.__dict.values()].some(e => this.eqByVal(e.k, l, line)); }
    else if (isIter(r)) {
      // CPython の in は、見つけた所までイテレータを進める（遅延イテレータは必要な分だけ生産する）
      res = false;
      for (;;) {
        const item = this.iterPull(r);
        if (this.iterFailed(r)) { res = null; break; }
        if (item === EXH) break;
        const e = eqVal(item, l);
        if (e === null) { res = null; break; }
        if (e) { res = true; break; }
      }
    }
    else if (isBytesLike(r)) { if (isBytesLike(l)) { const hay = bytesOf(r), ndl = bytesOf(l); res = ndl.length === 0 ? true : hay.some((_, i) => i + ndl.length <= hay.length && ndl.every((x, j) => hay[i + j] === x)); } else if (isNum(l) && !l.f || isBool(l)) { const bv = isBool(l) ? (l.v ? 1 : 0) : l.v; if (bv < 0 || bv > 255) this.err(line, 'ValueError', 'in の左側（バイト値）は 0〜255 の整数にしてください', ''); res = bytesOf(r).includes(bv); } else this.err(line, 'TypeError', 'bytes に対する in の左側は、整数か bytes のような並びにしてください', ''); }
    else if (isMemview(r)) { if (r.__memview.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません', ''); const hay = mvBytes(r); if (isBytesLike(l)) { const ndl = bytesOf(l); res = ndl.length === 0 ? true : hay.some((_, i) => i + ndl.length <= hay.length && ndl.every((x, j) => hay[i + j] === x)); } else if (isNum(l) && !l.f) res = hay.includes(l.v); else this.err(line, 'TypeError', 'memoryview に対する in の左側は整数か bytes のような並びにしてください', ''); }
    else if (r && r.__range) res = r.__range.some(x => eqVal(x, l) === true);
    else if (isView(r)) res = viewItems(r).some(x => eqVal(x, l) === true);
    // B6-Py3：__contains__、無ければ __iter__／__getitem__ の走査で判定
    else if (r && r.__instance) {
      if (this.specialLookup(r, '__contains__') !== undefined) {
        const cr = this.callSpecialArgs(r, '__contains__', [l], line, null);
        if (isUnk(cr)) res = null;
        else { const t = this.truthyOf(cr, line, null); res = t === null ? null : t; }
      } else {
        const seq = this.iterable(r, line, true);
        if (seq === null) res = null;
        else { res = false; for (const x of seq) { if (x === l) { res = true; break; } if ((x && x.__instance) || (l && l.__instance)) { const c = this.compare('==', x, l, line); if (!isBool(c)) { res = null; break; } if (c.v) { res = true; break; } continue; } const e = eqVal(x, l); if (e === null) { res = null; break; } if (e) { res = true; break; } } }
      }
    }
    else this.err(line, 'TypeError', typeName(r) + ' に対して in は使えません', '右側は文字列・リスト・辞書などの「集まり」にしてください');
    if (res === null) return UNK();
    return BOOL(op === 'in' ? res : !res);
  }
  // B6-Py3：__eq__／__ne__ が定義されていれば発火する（既定の同一性
  // 比較より優先。NaN の規則は数値同士のときだけ先行させる）
  if (op === '==' || op === '!=') {
    if (!((l && l.__instance) || (r && r.__instance))) {
      if ((isNum(l) && Number.isNaN(l.v)) || (isNum(r) && Number.isNaN(r.v))) return BOOL(op === '!=');
    } else {
      const er = this.tryEqSpecial(op, l, r, line);
      if (er !== undefined) return er;
    }
  }
  // RG-46：NaN は自分自身とも等しくない（CPython の float 比較は同一オブジェクトでも値比較）。
  // eqVal の同一性ショートカットはコンテナ要素・in の同一性規則（[n] == [n] や n in [n] は True）用に残し、ここでのみ先行させる。
  if (op === '==') { if ((isNum(l) && Number.isNaN(l.v)) || (isNum(r) && Number.isNaN(r.v))) return BOOL(false); const e = (isSet(l) && isSet(r)) ? this.eqByVal(l, r, line) : eqVal(l, r); return e === null ? UNK() : BOOL(e); } // B6監査D6：集合同士は要素の __eq__ を発火させる
  if (op === '!=') { if ((isNum(l) && Number.isNaN(l.v)) || (isNum(r) && Number.isNaN(r.v))) return BOOL(true); const e = (isSet(l) && isSet(r)) ? !this.eqByVal(l, r, line) : eqVal(l, r); return e === null ? UNK() : BOOL(!e); }
  if (op === 'is' || op === 'is not') {
    let res = null;
    if (isNone(l) || isNone(r)) res = isNone(l) && isNone(r);
    // R27-N20 兄弟表面：Ellipsis／NotImplemented はシングルトンなので、
    // is の結果は実装依存ではなく同一性で確定する（実 CPython でも同様）。
    else if (isEllipsis(l) || isEllipsis(r) || isNotImplemented(l) || isNotImplemented(r)) res = l === r;
    else if (isBool(l) && isBool(r)) res = l.v === r.v;
    // B7 統合時の基盤修正 F-F：ネイティブ値・ネイティブクラスは同一性が
    // 確定する（クラスは限定名、インスタンスはオブジェクト同一性）。
    else if ((l && (l.__native || l.__ncls)) || (r && (r.__native || r.__ncls))) {
      if (l && l.__ncls && r && r.__ncls) res = l.__ncls === r.__ncls;
      else if (l && l.__native && r && r.__native) res = l === r;
      // 高度A7班是正：typevalAlias を宣言したクラスと type() の型値は同一。
      else if (l && l.__ncls && r && r.__type) { const d = nativeClassDef(l.__ncls); res = !!(d && d.typevalAlias === r.__type); }
      else if (r && r.__ncls && l && l.__type) { const d = nativeClassDef(r.__ncls); res = !!(d && d.typevalAlias === l.__type); }
      else res = false;
    }
    else if (isUnk(l) || isUnk(r)) res = null;
    else {
      this.diag(line, 'note', '注意', 'is は「同じものかどうか」を見る演算子です。値の比較には == を使うのが普通です', '');
      // R30F01B-N4（バッチ9 N29）: クラスとそのインスタンスも同一性で
      // 決まるオブジェクトなので、is の判定対象に含める（type(x) is クラス
      // が、type() が実クラスを返すようになったことと連携する）。
      // TYPEVAL／組み込み型名は同一オブジェクトとは限らないため従来どおり
      // 未確定のままにする。
      const mut = (x) => isList(x) || isDict(x) || isSet(x) || isFunc(x) || isIter(x) || !!(x && (x.__class || x.__instance));
      if (mut(l) || mut(r)) res = l === r; // 別々に作ったリストなどは別のもの
      else res = null; // 数値・文字列・タプルが同じものかは Python の実装によって変わる
    }
    if (res === null) return UNK();
    return BOOL(op === 'is' ? res : !res);
  }
  // 順序比較
  if (isUnk(l) || isUnk(r)) return UNK();
  // B6-Py3：__lt__／__le__／__gt__／__ge__ が定義されていれば発火する
  if ((l && l.__instance) || (r && r.__instance)) { const or2 = this.tryOrdSpecial(op, l, r, line); if (or2 !== undefined) return or2; }
  const ln = isBool(l) ? NUM(l.v ? 1 : 0, false) : l, rn = isBool(r) ? NUM(r.v ? 1 : 0, false) : r;
  let c = null;
  if (isNum(ln) && isNum(rn) && (Number.isNaN(ln.v) || Number.isNaN(rn.v))) return BOOL(false); // RG-46：NaN との順序比較は全て False
  if (isNum(ln) && isNum(rn)) c = ln.v < rn.v ? -1 : ln.v > rn.v ? 1 : 0;
  else if (isComplex(l) || isComplex(r)) this.err(line, 'TypeError', '複素数は大小比較（' + op + '）ができません', '実部・虚部を取り出して比べてください');
  else if (isBytesLike(l) && isBytesLike(r)) { const a = bytesOf(l), b = bytesOf(r); c = 0; for (let i = 0; i < Math.min(a.length, b.length) && !c; i++) c = a[i] < b[i] ? -1 : a[i] > b[i] ? 1 : 0; if (!c) c = a.length < b.length ? -1 : a.length > b.length ? 1 : 0; }
  else if (typeof l === 'string' && typeof r === 'string') { const a = Array.from(l), b = Array.from(r); c = 0; for (let i = 0; i < Math.min(a.length, b.length) && !c; i++) { const x = a[i].codePointAt(0), y = b[i].codePointAt(0); c = x < y ? -1 : x > y ? 1 : 0; } if (!c) c = a.length < b.length ? -1 : a.length > b.length ? 1 : 0; }
  else if ((isList(l) && isList(r)) || (isTuple(l) && isTuple(r))) {
    const a = isList(l) ? l.__list : l.__tuple, b = isList(r) ? r.__list : r.__tuple; c = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const e = eqVal(a[i], b[i]); if (e === null) return UNK(); if (e) continue;
      const lt = this.compare('<', a[i], b[i], line); if (isUnk(lt)) return UNK(); c = lt.v ? -1 : 1; break;
    }
    if (!c) c = a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
  }
  else if (isSet(l) && isSet(r)) {
    const sub = l.__set.every(x => r.__set.some(y => this.eqByVal(x, y, line)));
    const sup = r.__set.every(x => l.__set.some(y => this.eqByVal(x, y, line)));
    return BOOL(op === '<' ? sub && !sup : op === '<=' ? sub : op === '>' ? sup && !sub : sup);
  }
  else this.err(line, 'TypeError', typeName(l) + ' と ' + typeName(r) + ' は大小比較（' + op + '）ができません', '比べる相手は同じ型（数値同士・文字列同士）にしてください');
  if (c === null) return UNK();
  return BOOL(op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0);
};

// 添字として使える整数か確かめる（bool は 0/1 として使える。float などは TypeError）
Interp.prototype.intIndex = function (idx, line, what) {
  if (isBool(idx)) return idx.v ? 1 : 0;
  // B6-Py3：__index__ を持つインスタンスは整数として解釈する
  if (idx && idx.__instance) { const iv = this.indexValue(idx, line); if (iv !== null && !isUnk(iv)) return iv.v; }
  if (!isNum(idx) || idx.f) this.err(line, 'TypeError', (what || '番号（インデックス）') + 'には整数を使ってください（' + typeName(idx) + ' は使えません）', '');
  return idx.v;
};
// __index__ 契約で整数として解釈する（enumerate の start、list.insert の番号用）。
// bool は 0／1、int はそのまま、__index__ を持つインスタンスはその戻り値で解釈し、
// float・文字列など解釈できない型は CPython どおり TypeError で止める。
// __index__ の結果が実行時に決まる場合は null を返し、呼び出し側が未確定に倒す。
Interp.prototype.indexInt = function (v, line, what) {
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v) && !v.f) return Math.trunc(v.v);
  if (v && v.__instance && this.specialLookup(v, '__index__') !== undefined) {
    const r = this.callSpecial(v, '__index__', line, null);
    if (r === undefined || isUnk(r)) return null;
    if (isBool(r)) return r.v ? 1 : 0;
    if (isNum(r) && !r.f) return Math.trunc(r.v);
    this.err(line, 'TypeError', '__index__() の戻り値（' + typeName(r) + '）は整数として解釈できません', '__index__ は整数を返してください');
  }
  this.err(line, 'TypeError', (what || '引数') + 'には整数を使ってください（' + typeName(v) + ' は整数として解釈できません）', '');
  return null;
};
Interp.prototype.subGet = function (obj, idx, line) {
  if (isUnk(obj) || isUnk(idx)) return UNK();
  // B6-Py3：添字が __index__ を持つインスタンスなら先に整数化する
  if (idx && idx.__instance) { const iv = this.indexValue(idx, line); if (iv !== null) { if (isUnk(iv)) return UNK(); idx = iv; } }
  if (obj && obj.__native) { const d = nativeClassDef(obj.__native); if (d && d.getitem) { const r = d.getitem(this.stdlibCtx(null, line), obj, idx); if (r !== STDLIB_NOT_HANDLED) return r; } this.err(line, 'TypeError', typeName(obj) + ' は [ ] で要素を取り出せません', ''); }
  // B6-Py3：__getitem__／__class_getitem__ を発火する
  if (obj && obj.__instance) {
    if (this.specialLookup(obj, '__getitem__') !== undefined) return this.callSpecialArgs(obj, '__getitem__', [idx], line, null);
    // A6監査PYF-04：dict 派生クラスが __missing__ を定義している場合は、
    // 未対応の object.__missing__ を名指しする（__getitem__ の不在が原因ではない）
    if (this.specialLookup(obj, '__missing__') !== undefined && classChain(obj.cls).some(c => (c.baseTypeNames || []).includes('dict')))
      this.err(line, '未対応', 'object.__missing__（キーが無いときの既定値）はこの説明では対応していません', '');
    this.err(line, 'TypeError', typeName(obj) + ' には [ ] で要素を取り出す使い方はできません（__getitem__ が定義されていません）', '');
  }
  if (obj && obj.__class) {
    const hit = classLookupOwner(obj, '__class_getitem__');
    if (hit) {
      const raw = isCM(hit.value) ? hit.value.fn : hit.value;
      if (isFunc(raw)) return this.callUserFunc(raw, [obj, idx], {}, this.globals, line);
      return this.callFn(raw, [obj, idx], this.globals, line);
    }
    this.err(line, 'TypeError', typeName(obj) + ' には [ ] で要素を取り出す使い方はできません', '');
  }
  // B6-Py2：スライスオブジェクトを添字に使う形（s = slice(1, 3); xs[s]）
  if (isSlice(idx)) {
    const sl = idx.__slice;
    const lo = isNone(sl.start) ? null : sl.start, hi = isNone(sl.stop) ? null : sl.stop, st = isNone(sl.step) ? null : sl.step;
    if (isMemview(obj)) {
      if (obj.__memview.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません', '');
      const arr = mvBytes(obj); const ix = this.sliceIdx(arr.length, lo, hi, st, line); if (ix === null) return UNK();
      const out = ix.idx.map(k => arr[k]); const buf = { data: out }; return MEMVIEW({ buf, off: 0, len: out.length, readonly: obj.__memview.readonly, released: false, obj: obj.__memview.obj });
    }
    return this.sliceGet(obj, lo, hi, st, line);
  }
  if (isBytesLike(obj)) {
    const arr = bytesOf(obj);
    idx = NUM(this.intIndex(idx, line), false);
    let i = Math.trunc(idx.v); if (i < 0) i += arr.length;
    if (i < 0 || i >= arr.length) this.err(line, 'IndexError', '番号 ' + fmtNum(idx) + ' のバイトはありません（長さは ' + arr.length + ' です）', '');
    return NUM(arr[i], false);
  }
  if (isMemview(obj)) {
    if (obj.__memview.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません', '');
    idx = NUM(this.intIndex(idx, line), false);
    let i = Math.trunc(idx.v); if (i < 0) i += obj.__memview.len;
    if (i < 0 || i >= obj.__memview.len) this.err(line, 'IndexError', '番号 ' + fmtNum(idx) + ' のバイトはありません（長さは ' + obj.__memview.len + ' です）', '');
    return NUM(obj.__memview.buf.data[obj.__memview.off + i], false);
  }
  if (typeof obj === 'string' || isList(obj) || isTuple(obj)) {
    const arr = typeof obj === 'string' ? Array.from(obj) : isList(obj) ? obj.__list : obj.__tuple;
    idx = NUM(this.intIndex(idx, line), false);
    let i = Math.trunc(idx.v);
    if (i < 0) i += arr.length;
    if (i < 0 || i >= arr.length) this.err(line, 'IndexError', arr.length ? '番号 ' + fmtNum(idx) + ' の要素はありません（要素は ' + arr.length + ' 個で、番号は 0〜' + (arr.length - 1) + ' です）' : '番号 ' + fmtNum(idx) + ' の要素はありません（要素は0個です）', '番号が要素の数を超えていないか確認してください。後ろから数えるときは -1 が最後です');
    return typeof obj === 'string' ? arr[i] : arr[i];
  }
  if (isDict(obj)) {
    // B6-Py3：__dict__ は属性の現在値を優先して読む（取得後に属性が変わった場合）
    if (obj.__instDictOf && typeof idx === 'string' && obj.__instDictOf.attrs.has(idx)) return obj.__instDictOf.attrs.get(idx);
    if (dictKeyId(idx) === null) this.err(line, 'TypeError', typeName(idx) + ' は辞書のキーにできません（ハッシュできない型です）', 'キーには文字列・数値・タプルなどを使ってください');
    const v = dictGet(obj, idx);
    if (v === undefined) {
      const hit = [...obj.__dict.values()].find(e => this.eqByVal(e.k, idx, line)); if (hit) return hit.v; // B6監査D4：ID再引きによるホスト例外漏れを排除
      this.err(line, 'KeyError', 'キー ' + reprVal(idx) + ' は辞書にありません', 'キーの綴りを確認するか、.get(' + reprVal(idx) + ') を使うと無いときに None が返ります');
    }
    return v;
  }
  if (obj && obj.__range) {
    idx = NUM(this.intIndex(idx, line), false);
    let i = Math.trunc(idx.v); if (i < 0) i += obj.__range.length;
    if (i < 0 || i >= obj.__range.length) this.err(line, 'IndexError', 'range の範囲外の番号です', '');
    return obj.__range[i];
  }
  this.err(line, 'TypeError', typeName(obj) + ' には [ ] で要素を取り出す使い方はできません', '');
  return UNK();
};
Interp.prototype.subSet = function (obj, idx, v, line) {
  if (obj && obj.__native) { const d = nativeClassDef(obj.__native); if (d && d.setitem) { d.setitem(this.stdlibCtx(null, line), obj, idx, v); return; } this.err(line, 'TypeError', typeName(obj) + ' は [ ] で要素を書き換えられません', ''); }
  if (isUnk(obj)) return;
  if (isFrozenDict(obj)) this.err(line, 'TypeError', 'frozendict は中身を書き換えられません（\'frozendict\' object does not support item assignment）', '新しい frozendict を作るか、dict に変換してから書き換えてください');
  if (isBytes(obj)) this.err(line, 'TypeError', 'bytes は中身を書き換えられません（\'bytes\' object does not support item assignment）', '変えたいときは bytearray を使ってください');
  if (isBytearray(obj)) {
    if (isSlice(idx)) {
      const sl = idx.__slice; const lo = isNone(sl.start) ? null : sl.start, hi = isNone(sl.stop) ? null : sl.stop, st = isNone(sl.step) ? null : sl.step;
      const ix = this.sliceIdx(obj.__bytearray.length, lo, hi, st, line); if (ix === null) { poison(obj, '書き換えられたかもしれない bytearray'); return; }
      let seq = isBytesLike(v) ? bytesOf(v).slice() : isMemview(v) ? mvBytes(v) : null;
      if (seq === null && (isList(v) || isTuple(v))) { const items = v.__list || v.__tuple; const conv = items.map((x) => (isBool(x) ? (x.v ? 1 : 0) : isNum(x) && !x.f ? x.v : null)); if (conv.every((x) => x !== null && x >= 0 && x <= 255)) seq = conv; }
      if (seq === null) this.err(line, 'TypeError', 'bytearray のスライス代入には bytes のような並びを渡してください', '');
      if (ix.step !== 1 && seq.length !== ix.idx.length) this.err(line, 'ValueError', 'スライス代入の要素数が合いません', '');
      if (ix.step === 1) obj.__bytearray.splice(ix.a, ix.idx.length, ...seq);
      else ix.idx.forEach((k, j) => { obj.__bytearray[k] = seq[j]; });
      return;
    }
    idx = NUM(this.intIndex(idx, line), false);
    let i = Math.trunc(idx.v); if (i < 0) i += obj.__bytearray.length;
    if (i < 0 || i >= obj.__bytearray.length) this.err(line, 'IndexError', '番号 ' + fmtNum(idx) + ' のバイトはありません（長さは ' + obj.__bytearray.length + ' です）', '');
    if (isUnk(v)) { obj.__bytearray[i] = 0; poison(obj, '書き換えられたかもしれない bytearray'); return; }
    const bv = isBool(v) ? (v.v ? 1 : 0) : isNum(v) && !v.f ? v.v : null;
    if (bv === null || bv < 0 || bv > 255) this.err(line, 'ValueError', 'bytearray の要素は 0〜255 の整数にしてください', '');
    obj.__bytearray[i] = bv; return;
  }
  if (isMemview(obj)) {
    if (obj.__memview.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません', '');
    if (obj.__memview.readonly) this.err(line, 'TypeError', '読み取り専用（readonly）の memoryview は書き換えられません', '');
    idx = NUM(this.intIndex(idx, line), false);
    let i = Math.trunc(idx.v); if (i < 0) i += obj.__memview.len;
    if (i < 0 || i >= obj.__memview.len) this.err(line, 'IndexError', '番号が範囲外です', '');
    const bv = isBool(v) ? (v.v ? 1 : 0) : isNum(v) && !v.f ? v.v : null;
    if (bv === null || bv < 0 || bv > 255) this.err(line, 'ValueError', 'memoryview の要素は 0〜255 の整数にしてください', '');
    obj.__memview.buf.data[obj.__memview.off + i] = bv; return;
  }
  if (isUnk(idx)) { if (isMutableVal(obj)) poison(obj, '書き換えられたかもしれない値'); return; }
  // B6-Py3：__setitem__ を発火する
  if (obj && obj.__instance) {
    if (this.specialLookup(obj, '__setitem__') !== undefined) { this.callSpecialArgs(obj, '__setitem__', [idx, v], line, null); return; }
    this.err(line, 'TypeError', typeName(obj) + ' には [ ] で代入できません（__setitem__ が定義されていません）', '');
  }
  // B6-Py3：インスタンスの __dict__ への代入は属性へも書き戻す
  if (obj && obj.__instDictOf && typeof idx === 'string') { if (dictSet(obj, idx, v)) obj.__instDictOf.attrs.set(idx, v); return; }
  if (isList(obj)) {
    idx = NUM(this.intIndex(idx, line), false);
    let i = Math.trunc(idx.v); if (i < 0) i += obj.__list.length;
    if (i < 0 || i >= obj.__list.length) this.err(line, 'IndexError', '番号 ' + fmtNum(idx) + ' の要素はありません（リストは ' + obj.__list.length + ' 個）', '末尾に足すときは append() を使ってください');
    obj.__list[i] = v; return;
  }
  if (isDict(obj)) { if (!dictSet(obj, idx, v)) this.err(line, 'TypeError', '辞書のキーにできない型です（' + typeName(idx) + '）', 'キーには文字列や数値を使ってください'); return; }
  if (typeof obj === 'string') this.err(line, 'TypeError', '文字列は中身を書き換えられません（文字列は変更できない決まりです）', '新しい文字列を作って代入し直してください');
  if (isTuple(obj)) this.err(line, 'TypeError', 'タプルは中身を書き換えられません', '変えたいときはリストを使ってください');
  this.err(line, 'TypeError', typeName(obj) + ' には [ ] で代入できません', '');
};
// スライスが指す番号の一覧（CPython の slice.indices と同じ規則）。番号が実行時に決まるなら null
Interp.prototype.sliceIdx = function (len, lo, hi, st, line) {
  // B6-Py3：境界が __index__ を持つインスタンスなら先に整数化する
  const convB = (b) => { if (b && b.__instance) { const iv = this.indexValue(b, line); if (iv === null) this.err(line, 'TypeError', 'スライスの番号には整数か None を使ってください', ''); return iv; } return b; };
  lo = convB(lo); hi = convB(hi); st = convB(st);
  for (const b of [lo, hi, st]) if (b !== null && !isNone(b) && !isUnk(b) && !(isBool(b) || (isNum(b) && !b.f))) this.err(line, 'TypeError', 'スライスの番号には整数か None を使ってください', '');
  if ([lo, hi, st].some(b => b && isUnk(b))) return null;
  const iv = b => b === null || isNone(b) ? null : isBool(b) ? (b.v ? 1 : 0) : b.v;
  const step = iv(st) === null ? 1 : iv(st);
  if (step === 0) this.err(line, 'ValueError', 'スライスの間隔（3つ目の数）を 0 にはできません', '');
  const adj = (v, def, lowB, highB) => { if (v === null) return def; if (v < 0) { v += len; if (v < lowB) v = lowB; } else if (v > highB) v = highB; return v; };
  const a = step > 0 ? adj(iv(lo), 0, 0, len) : adj(iv(lo), len - 1, -1, len - 1);
  const b = step > 0 ? adj(iv(hi), len, 0, len) : adj(iv(hi), -1, -1, len - 1);
  const idx = []; if (step > 0) for (let k = a; k < b; k += step) idx.push(k); else for (let k = a; k > b; k += step) idx.push(k);
  return { a, b, step, idx };
};
Interp.prototype.markUnknownList = function (obj, baseNode, env, line) {
  this.diag(line, 'note', '注意', '書き換える範囲が実行時に決まるため、このリストの中身は分からなくなります', '');
  if (baseNode && baseNode.k === 'name') env.set(baseNode.name, UNK('書き換えられたリスト'));
  else { const n = obj.__list.length; for (let k = 0; k < n; k++) obj.__list[k] = UNK('書き換えられたかもしれない要素'); }
};
Interp.prototype.sliceGet = function (obj, lo, hi, st, line) {
  if (isUnk(obj)) return UNK();
  if (obj && obj.__native) { const d = nativeClassDef(obj.__native); if (d && d.getitem) { const r = d.getitem(this.stdlibCtx(null, line), obj, { __slice: true, lo, hi, step: st }); if (r !== STDLIB_NOT_HANDLED) return r; } }
  if (isBytesLike(obj) || isMemview(obj)) {
    if (isMemview(obj) && obj.__memview.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません', '');
    const arr = isMemview(obj) ? mvBytes(obj) : bytesOf(obj);
    const ix = this.sliceIdx(arr.length, lo, hi, st, line);
    if (ix === null) return UNK();
    const out = ix.idx.map(k => arr[k]);
    if (isMemview(obj)) { const buf = { data: out }; return MEMVIEW({ buf, off: 0, len: out.length, readonly: obj.__memview.readonly, released: false, obj: obj.__memview.obj }); }
    return isBytes(obj) ? BYTESV(out) : BYTEARRAY(out);
  }
  if (typeof obj === 'string' || isList(obj) || isTuple(obj) || (obj && obj.__range)) {
    const arr = typeof obj === 'string' ? Array.from(obj) : isList(obj) ? obj.__list : isTuple(obj) ? obj.__tuple : obj.__range;
    const ix = this.sliceIdx(arr.length, lo, hi, st, line); // CPython の slice.indices と同じ切り詰め規則
    if (ix === null) return UNK();
    const out = ix.idx.map(k => arr[k]);
    if (typeof obj === 'string') return out.join('');
    if (obj && obj.__range) { const r = RANGE(out); if (obj.rng) { const ns = obj.rng[0] + ix.a * obj.rng[2], nstep = obj.rng[2] * ix.step; r.rng = [ns, ns + out.length * nstep, nstep]; } return r; }
    return isList(obj) ? LIST(out) : TUPLE(out);
  }
  this.diag(line, 'note', '対応外', typeName(obj) + ' のスライスはこの説明では解釈できません', '');
  return UNK();
};

/* ============ 呼び出し ============ */
Interp.prototype.evalCall = function (n, env) {
  // 呼び出しの記録（この実行で実際に現れた関数・メソッド。分岐で通らなかった側の呼び出しは記録されない）
  if (n.fn) { if (n.fn.k === 'name') this.noteCall(n.fn.name, 'func'); else if (n.fn.k === 'attr') this.noteCall(n.fn.name, 'method'); }
  if (n.args.some(a => a.dstar)) { // f(**d): 辞書の中身をキーワード引数として展開する
    const kwargs = { ...n.kwargs };
    for (const a of n.args) if (a.dstar) { const d = this.eval(a.e, env); if (isUnk(d)) return UNK(); if (!isDict(d)) this.err(n.line, 'TypeError', '** のあとには辞書を書いてください', ''); for (const e of d.__dict.values()) { if (typeof e.k !== 'string') this.err(n.line, 'TypeError', 'キーワード引数の名前は文字列にしてください', ''); kwargs[e.k] = { k: '__val', v: e.v }; } }
    n = { ...n, args: n.args.filter(a => !a.dstar), kwargs };
  }
  // メソッド呼び出し
  if (n.fn.k === 'attr') {
    const obj = this.eval(n.fn.obj, env);
    const args = this.evalArgs(n, env);
    if (args === null) return UNK();
    return this.callMethod(obj, n.fn.name, args, n.kwargs, env, n.line);
  }
  const fn = this.eval(n.fn, env);
  const args = this.evalArgs(n, env);
  if (args === null) return UNK();
  // B6-Py3：property の getter／setter／deleter、type.mro、object.__new__
  // 相当、__call__ の発火
  if (fn && fn.__propmod) return this.applyPropMod(fn, args, n.line);
  if (fn && fn.__mrofn) return LIST(mroAllOf(fn.cls));
  if (fn && fn.__objnew) { const t = (args[0] && args[0].__class) ? args[0] : fn.cls; return t ? { __instance: true, cls: t, attrs: new Map() } : UNK(); }
  if (fn && fn.__objga) { const o = args[0]; if (o && o.__instance) { this._gaBypass = (this._gaBypass || 0) + 1; try { return this.getAttrInstance(o, args[1], n.line, env); } finally { this._gaBypass--; } } return UNK(); }
  if (fn && fn.__objsa) { const o = args[0]; if (o && o.__instance) { this._saBypass = (this._saBypass || 0) + 1; try { this.setAttrInstance(o, args[1], args[2], n.line, env); } finally { this._saBypass--; } } return NONE; }
  if (fn && fn.__instance) { const r = this.callSpecialArgs(fn, '__call__', args, n.line, env, n.kwargs); if (r !== undefined) return r; }
  if (fn && fn.__builtin) return this.callBuiltin(fn.__builtin, args, n.kwargs, env, n.line, n);
  if (isFunc(fn)) return this.callUserFunc(fn, args, n.kwargs, env, n.line);
  if (fn && fn.__bound) return this.withSuperCtx(fn.owner, fn.instance, () => this.callUserFunc(fn.fn, [fn.instance, ...args], n.kwargs, env, n.line));
  if (fn && fn.__method) return this.callMethod(fn.obj, fn.name, args, n.kwargs, env, n.line);
  if (fn && fn.__class) return this.instantiate(fn, args, n.kwargs, env, n.line);
  if (fn && fn.__ncls) return this.stdlibConstruct(fn, args, n.kwargs, env, n.line);
  if (fn && fn.__native) { const cd = nativeClassDef(fn.__native); if (cd && cd.call) return cd.call(this.stdlibCtx(env, n.line), fn, args, this.stdlibKwargs(n.kwargs, env)); this.err(n.line, 'TypeError', typeName(fn) + ' は呼び出し（ ）ができません', ''); }
  if (isUnk(fn)) { for (const a of args) if (isMutableVal(a)) poison(a, '呼び出しで書き換えられたかもしれない値'); return UNK(); }
  this.err(n.line, 'TypeError', typeName(fn) + ' は呼び出し（ ）ができません', '関数名のあとに ( ) を付けて呼び出します。変数と関数を取り違えていないか確認してください');
  return UNK();
};
// R29-N15：ユーザー定義クラスの特殊メソッド（__bool__／__len__／__index__）の
// ディスパッチ。実 CPython 3.12 の規則（docs.python.org 3.12「真値判定」／
// 「len()」および実 CPython 3.12.3 での機械突合）:
//   - 真値判定は型（クラス）側の __bool__ を優先し、無ければ __len__ の
//     非ゼロで判定する。どちらも無ければ True。
//   - 特殊メソッドはインスタンス属性ではなく型から引く（インスタンスへ
//     代入した __bool__／__len__ は実物でも無視されることを実測で確認）。
//   - __bool__ が bool 以外を返したら TypeError、__len__ が負値を返したら
//     ValueError、整数として解釈できない値（float／str／None 等）を返したら
//     TypeError。__len__ の戻り値が __index__ を持つインスタンスなら
//     __index__ 経由で整数化する（operator.index の規則）。
//   - メソッド本体の結果が未確定（入力依存・BIG 等）なら判定も未確定に倒し、
//     黙って True に倒さない。
// R30F01B-N4（バッチ9 N29）：type() の3引数形で作ったクラスの継承連携用。
// クラスの属性を、自クラス→継承元（bases）の順に辿って引く。class 文で
// 作ったクラスは bases を持たないため従来どおり自クラスだけを見るのと等価。
function classChain(cls) {
  // B6-Py3：MRO（C3 線形化）の順にクラス値だけを並べる。線形化できない
  // 場合は従来の幅優先の辿りに倒す（クラス定義時に検証済みの通常クラス
  // では起きない）。
  return mroAllOf(cls).filter((c) => !!(c && c.__class));
}
// B6-Py3：C3 線形化による MRO 全体（クラス値と組み込み型トークン
// TYPEVAL の列。末尾は object）。結果はクラス値ごとにキャッシュする。
const _mroCache = new WeakMap();
function _mroKey(e) { return e && e.__class ? 'c:' + e.cname + ':' + _mroId(e) : 't:' + (e && e.__type); }
const _mroIds = new WeakMap(); let _mroSerial = 0;
function _mroId(c) { let id = _mroIds.get(c); if (id === undefined) { id = ++_mroSerial; _mroIds.set(c, id); } return id; }
function _directBases(cls) {
  const out = [];
  for (const b of (cls.bases || [])) out.push(b);
  for (const n of (cls.baseTypeNames || [])) out.push(TYPEVAL(n));
  return out;
}
function _linearize(cls, busy) {
  if (_mroCache.has(cls)) return _mroCache.get(cls);
  if (busy.has(cls)) return null; // 継承の循環
  busy.add(cls);
  const bases = _directBases(cls);
  let result;
  if (!bases.length) result = [cls, TYPEVAL('object')];
  else {
    const seqs = [];
    for (const b of bases) {
      if (b && b.__class) { const sub = _linearize(b, busy); if (sub === null) { busy.delete(cls); return null; } seqs.push(sub.slice()); }
      else seqs.push([b]);
    }
    seqs.push(bases.slice());
    const merged = [];
    for (;;) {
      const live = seqs.filter((s) => s.length);
      if (!live.length) break;
      let cand = null;
      for (const s of live) {
        const head = s[0], hk = _mroKey(head);
        if (!live.some((o) => o.slice(1).some((x) => _mroKey(x) === hk))) { cand = head; break; }
      }
      if (cand === null) { busy.delete(cls); return null; } // 一貫した順序が作れない
      merged.push(cand);
      for (const s of seqs) if (s.length && _mroKey(s[0]) === _mroKey(cand)) s.shift();
    }
    result = [cls, ...merged];
    if (!result.some((e) => e && e.__type === 'object')) result.push(TYPEVAL('object'));
  }
  busy.delete(cls);
  _mroCache.set(cls, result);
  return result;
}
function mroAllOf(cls) {
  if (!cls || !cls.__class) return [];
  const r = _linearize(cls, new Set());
  if (r) return r.slice();
  // 線形化に失敗した場合のフォールバック（従来の幅優先）
  const out = []; const seen = new Set(); const queue = [cls];
  while (queue.length) {
    const c = queue.shift();
    if (!c || seen.has(c)) continue;
    seen.add(c); out.push(c);
    for (const b of (c.bases || [])) queue.push(b);
  }
  out.push(TYPEVAL('object'));
  return out;
}
function classLookup(cls, name) {
  const hit = classLookupOwner(cls, name);
  return hit ? hit.value : undefined;
}
function classLookupOwner(cls, name) {
  for (const c of classChain(cls)) {
    if (c.cenv && c.cenv.vars && c.cenv.vars.has(name)) return { owner: c, value: c.cenv.vars.get(name) };
  }
  return null;
}
Interp.prototype.specialLookup = function (inst, name) {
  const cls = inst && inst.cls;
  if (!cls) return undefined;
  return classLookup(cls, name);
};
Interp.prototype.callSpecial = function (inst, name, line, env) {
  const m = this.specialLookup(inst, name);
  if (m === undefined) return undefined;
  if (isUnk(m)) return UNK(name + ' の結果');
  if (isFunc(m) || (m && (m.__bound || m.__method || m.__builtin || m.__class))) return this.callFn(m, [inst], env || this.globals, line);
  this.err(line, 'TypeError', name + ' の値（' + typeName(m) + '）は呼び出しできません（' + typeName(m) + ' object is not callable）', 'クラスの中で ' + name + ' は def で定義してください');
  return UNK();
};
// B6-Py3：引数つきの特殊メソッド呼び出し（__add__(other) 等の一般形）。
// 未定義なら undefined、値が未確定なら UNK を返す（callSpecial と同じ契約）。
Interp.prototype.callSpecialArgs = function (inst, name, args, line, env, kwargs) {
  const m = this.specialLookup(inst, name);
  if (m === undefined) return undefined;
  if (isUnk(m)) return UNK(name + ' の結果');
  if (isFunc(m)) return this.callUserFunc(m, [inst, ...args], kwargs || {}, env || this.globals, line);
  if (m && (m.__bound || m.__method || m.__builtin || m.__class)) return this.callFn(m, [inst, ...args], env || this.globals, line);
  this.err(line, 'TypeError', name + ' の値（' + typeName(m) + '）は呼び出しできません（' + typeName(m) + ' object is not callable）', 'クラスの中で ' + name + ' は def で定義してください');
  return UNK();
};
// B6-Py3：クラス側で見つかった生の値を、アクセス文脈（インスタンス経由／
// クラス経由）に合わせて束縛・発火する。classmethod はクラスへ、通常関数は
// インスタンスへ束縛し、property とディスクリプタ（__get__）は発火する。
Interp.prototype.bindClassAttr = function (cls, hit, inst, line, env) {
  const raw = hit.value;
  if (isCM(raw)) return { __bound: true, fn: raw.fn, instance: inst ? inst.cls : cls, owner: hit.owner };
  if (isSM(raw)) return raw.fn;
  if (isProp(raw)) {
    if (!inst) return raw; // クラス経由では property オブジェクト自体
    if (!raw.fget) this.err(line, 'AttributeError', 'この property には getter がありません（unreadable attribute）', '');
    return this.callFn(raw.fget, [inst], env, line);
  }
  if (raw && raw.__instance && this.specialLookup(raw, '__get__') !== undefined) {
    const gf = this.specialLookup(raw, '__get__');
    if (isFunc(gf)) return this.callUserFunc(gf, [raw, inst || NONE, cls], {}, env || this.globals, line);
    return this.callFn(gf, [raw, inst || NONE, cls], env || this.globals, line);
  }
  if (isFunc(raw)) return inst ? { __bound: true, fn: raw, instance: inst, owner: hit.owner } : raw;
  return raw;
};
// B6-Py3：データディスクリプタか（property は常時、インスタンスは
// __set__／__delete__ を持つとき）。
Interp.prototype.isDataDesc = function (v) {
  if (isProp(v)) return true;
  if (v && v.__instance) return this.specialLookup(v, '__set__') !== undefined || this.specialLookup(v, '__delete__') !== undefined;
  return false;
};
Interp.prototype.instDict = function (inst) {
  const d = DICT();
  for (const [k, v] of inst.attrs) dictSet(d, k, v);
  d.__instDictOf = inst; // B6-Py3：__dict__ 経由の代入を属性へ書き戻すための印
  return d;
};
// B6-Py3：インスタンスの属性読み取り（__getattribute__／データ
// ディスクリプタ／インスタンス辞書／非データディスクリプタ・束縛／
// __getattr__ の順。実 CPython の属性解決順に合わせる）。
Interp.prototype.getAttrInstance = function (obj, name, line, env) {
  if (name === '__class__') return obj.cls;
  if (name === '__dict__') return this.instDict(obj);
  if (name === '__annotations__') return obj.cls.annDict || DICT();
  const ga = this.specialLookup(obj, '__getattribute__');
  if (ga !== undefined && name !== '__getattribute__' && !this._gaDepth && !this._gaBypass) {
    if (isFunc(ga)) {
      this._gaDepth = (this._gaDepth || 0) + 1;
      try { return this.callUserFunc(ga, [obj, name], {}, env || this.globals, line); }
      catch (e) { if (!(e instanceof SimDiag && e.kind === 'AttributeError')) throw e; /* AttributeError なら通常解決＋__getattr__ へ */ }
      finally { this._gaDepth--; }
    }
  }
  const hit = classLookupOwner(obj.cls, name);
  if (hit && this.isDataDesc(hit.value)) return this.bindClassAttr(obj.cls, hit, obj, line, env);
  if (obj.attrs.has(name)) return obj.attrs.get(name);
  if (hit) return this.bindClassAttr(obj.cls, hit, obj, line, env);
  const gattr = this.specialLookup(obj, '__getattr__');
  if (gattr !== undefined && name !== '__getattr__') {
    if (isFunc(gattr)) return this.callUserFunc(gattr, [obj, name], {}, env || this.globals, line);
    if (!isUnk(gattr)) return this.callFn(gattr, [obj, name], env || this.globals, line);
    return UNK('__getattr__ の結果');
  }
  this.err(line, 'AttributeError', '属性がありません：' + name, '');
  return UNK();
};
// B6-Py3：クラス経由の属性読み取り。
Interp.prototype.getAttrClass = function (cls, name, line, env) {
  if (name === '__name__' || name === '__qualname__') return cls.cname;
  if (name === '__module__') return '__main__';
  if (name === '__class__') return TYPEVAL('type');
  if (name === '__dict__') { const d = DICT(); for (const [k, v] of cls.cenv.vars) dictSet(d, k, v); return d; }
  if (name === '__annotations__') return cls.annDict || DICT();
  const hit = classLookupOwner(cls, name);
  if (hit) return this.bindClassAttr(cls, hit, null, line, env);
  if (name === 'mro') return MROFN(cls);
  return UNK('クラス属性「' + name + '」の値');
};
// B6-Py3：super プロキシ経由の属性読み取り。MRO で sup.cls の次から探し、
// 見つけた値を sup.obj へ束縛・発火する。末尾の object の __new__ だけは
// 組み込み相当（OBJNEW）で補う。
Interp.prototype.getAttrSuper = function (sup, name, line, env) {
  const targetCls = sup.obj && sup.obj.__instance ? sup.obj.cls : (sup.obj && sup.obj.__class ? sup.obj : null);
  const full = targetCls ? mroAllOf(targetCls) : [sup.cls, TYPEVAL('object')];
  const keyOf = (e) => (e && e.__class ? 'c' + _mroId(e) : 't' + (e && e.__type));
  const startAt = full.findIndex((e) => keyOf(e) === keyOf(sup.cls));
  const rest = startAt >= 0 ? full.slice(startAt + 1) : [];
  for (const e of rest) {
    if (!e || !e.__class) continue;
    if (e.cenv && e.cenv.vars && e.cenv.vars.has(name)) {
      const hit = { owner: e, value: e.cenv.vars.get(name) };
      if (!sup.obj) return hit.value; // 未束縛 super：生の値を返す
      if (sup.obj.__instance) return this.bindClassAttr(targetCls, hit, sup.obj, line, env);
      return this.bindClassAttr(sup.obj, hit, null, line, env); // クラス束縛の super
    }
  }
  if (name === '__new__') return OBJNEW(null);
  this.err(line, 'AttributeError', "'super' オブジェクトには属性「" + name + "」がありません", '');
  return UNK();
};
// B6-Py3：インスタンスへの属性代入（__setattr__／データディスクリプタ／
// 通常代入の順）。
Interp.prototype.setAttrInstance = function (obj, name, v, line, env) {
  const sa = this.specialLookup(obj, '__setattr__');
  if (sa !== undefined && !this._saDepth && !this._saBypass) {
    if (isFunc(sa)) {
      this._saDepth = (this._saDepth || 0) + 1;
      try { this.callUserFunc(sa, [obj, name, v], {}, env || this.globals, line); return; }
      finally { this._saDepth--; }
    }
  }
  const hit = classLookupOwner(obj.cls, name);
  if (hit && this.isDataDesc(hit.value)) {
    const raw = hit.value;
    if (isProp(raw)) {
      if (!raw.fset) this.err(line, 'AttributeError', 'この property には setter がありません（property has no setter）', 'setter を定義するか、別の属性へ代入してください');
      this.callFn(raw.fset, [obj, v], env, line);
      return;
    }
    const sf = this.specialLookup(raw, '__set__');
    if (sf !== undefined) { this.callSpecialArgs(raw, '__set__', [obj, v], line, env); return; }
    this.err(line, 'AttributeError', 'このディスクリプタには __set__ がありません', '');
  }
  obj.attrs.set(name, v);
};
// B6-Py3：インスタンスの属性削除（__delattr__／property の deleter／
// __delete__／通常削除の順）。
Interp.prototype.delAttrInstance = function (obj, name, line, env) {
  const da = this.specialLookup(obj, '__delattr__');
  if (da !== undefined && !this._saDepth) {
    if (isFunc(da)) {
      this._saDepth = (this._saDepth || 0) + 1;
      try { this.callUserFunc(da, [obj, name], {}, env || this.globals, line); return; }
      finally { this._saDepth--; }
    }
  }
  const hit = classLookupOwner(obj.cls, name);
  if (hit && this.isDataDesc(hit.value)) {
    const raw = hit.value;
    if (isProp(raw)) {
      if (!raw.fdel) this.err(line, 'AttributeError', 'この property には deleter がありません（property has no deleter）', '');
      this.callFn(raw.fdel, [obj], env, line);
      return;
    }
    if (this.specialLookup(raw, '__delete__') !== undefined) { this.callSpecialArgs(raw, '__delete__', [obj], line, env); return; }
  }
  if (obj.attrs.has(name)) { obj.attrs.delete(name); return; }
  this.err(line, 'AttributeError', '属性がありません：' + name, '');
};
// B6-Py3：with の __exit__ を逆順に呼ぶ。pending（本体や __enter__ で
// 起きた例外）がある場合は例外型・例外値・None を渡し、いずれかの
// __exit__ が真を返せば抑制する（この関数は戻る）。抑制されなければ
// pending を再送出する。__exit__ 自身が例外を出したらそれが新しい
// pending になる。例外値はエンジンに例外オブジェクトが無いため
// 「実行時に決まる値」で近似する。
Interp.prototype.runExits = function (entered, pending, line) {
  let cur = pending || null;
  for (let i = entered.length - 1; i >= 0; i--) {
    const mgr = entered[i];
    if (this.specialLookup(mgr, '__exit__') === undefined) {
      if (!cur) this.err(line, 'AttributeError', typeName(mgr) + ' には __exit__ がありません', '');
      continue;
    }
    try {
      if (cur) {
        const kind = cur instanceof SimDiag ? cur.kind : 'Exception';
        const et = TYPEVAL(EXC_NAMES.has(kind) ? kind : 'Exception');
        const r = this.callSpecialArgs(mgr, '__exit__', [et, UNK('発生した例外'), NONE], line, null);
        const t = isUnk(r) ? null : this.truthyOf(r, line, null);
        if (t) cur = null;
      } else {
        this.callSpecialArgs(mgr, '__exit__', [NONE, NONE, NONE], line, null);
      }
    } catch (e) { cur = e; }
  }
  if (cur) throw cur;
};
// B6-Py3：引数なし super() のための文脈（メソッドを定義したクラスと
// self）を、束縛メソッド実行の間だけ差し込む。
Interp.prototype.withSuperCtx = function (cls, obj, thunk) {
  if (!cls) return thunk();
  const prev = this.superCtx;
  this.superCtx = { cls, obj };
  try { return thunk(); } finally { this.superCtx = prev; }
};
// B6-Py3：インスタンスの文字列表現（__str__ → __repr__ → 既定表記）。
// 値版（strValueOf／reprValueOf）は文字列か UNK を返し、表示版
// （strOf／reprOf）は UNK を表示ラベルへ直す。print／str()／f文字列など、
// 表示・変換が要る場所から使う。
Interp.prototype.reprValueOf = function (v, line, env) {
  if (v && v.__instance) {
    if (this.specialLookup(v, '__repr__') !== undefined) {
      const r = this.callSpecial(v, '__repr__', line, env);
      if (typeof r === 'string') return r;
      if (isUnk(r)) return r;
      if (r !== undefined) this.err(line, 'TypeError', '__repr__ は文字列を返す必要があります（__repr__ returned non-string）', '__repr__ は文字列を返してください');
    }
    return reprVal(v);
  }
  return reprVal(v);
};
Interp.prototype.strValueOf = function (v, line, env) {
  if (v && v.__instance) {
    if (this.specialLookup(v, '__str__') !== undefined) {
      const r = this.callSpecial(v, '__str__', line, env);
      if (typeof r === 'string') return r;
      if (isUnk(r)) return r;
      if (r !== undefined) this.err(line, 'TypeError', '__str__ は文字列を返す必要があります（__str__ returned non-string）', '__str__ は文字列を返してください');
    }
    return this.reprValueOf(v, line, env);
  }
  return strVal(v);
};
Interp.prototype.strOf = function (v, line, env) {
  const r = this.strValueOf(v, line, env);
  return isUnk(r) ? unknownLabel({ kind: 'unknown', source: r.desc }) : r;
};
Interp.prototype.reprOf = function (v, line, env) {
  const r = this.reprValueOf(v, line, env);
  return isUnk(r) ? unknownLabel({ kind: 'unknown', source: r.desc }) : r;
};
// __len__ の戻り値を長さ（0以上の整数）へ是正する。戻り値:
//   { known: true, len } ／ { known: false }（未確定）／ null（__len__ 自体が無い）
Interp.prototype.lenOfInstance = function (inst, line, env, depth) {
  const m = this.specialLookup(inst, '__len__');
  if (m === undefined) return null;
  const r = this.callSpecial(inst, '__len__', line, env);
  if (r === undefined || isUnk(r)) return { known: false };
  let cur = r;
  for (let d = depth || 0; ; d++) {
    if (isUnk(cur)) return { known: false };
    if (isBool(cur)) return { known: true, len: cur.v ? 1 : 0 };
    if (isNum(cur) && !cur.f) {
      if (cur.v < 0) this.err(line, 'ValueError', '__len__() は 0 以上を返す必要があります（__len__() should return >= 0）', '');
      return { known: true, len: cur.v };
    }
    if (cur && cur.__instance && d < 5 && this.specialLookup(cur, '__index__') !== undefined) {
      cur = this.callSpecial(cur, '__index__', line, env);
      if (cur === undefined) break;
      continue;
    }
    break;
  }
  this.err(line, 'TypeError', '__len__() の戻り値（' + typeName(cur) + '）は整数として解釈できません（object cannot be interpreted as an integer）', '__len__ は整数を返してください');
  return { known: false };
};
// 真値判定の正本。組み込み型は従来の truthy()、ユーザー定義クラスの
// インスタンスは __bool__／__len__ を引く（R29-N15。RG-254 の同族として
// 判定経路をここに統一し、if／while／not／and／or／三項／assert／内包条件／
// bool()／any／all／filter／sorted・zip のキーワード判定は全て本メソッド経由）。
Interp.prototype.truthyOf = function (v, line, env) {
  if (v && v.__instance) {
    if (this.specialLookup(v, '__bool__') !== undefined) {
      const r = this.callSpecial(v, '__bool__', line, env);
      if (r === undefined || isUnk(r)) return null;
      if (isBool(r)) return r.v;
      this.err(line, 'TypeError', '__bool__ は bool（True／False）を返す必要があります（__bool__ should return bool, returned ' + typeName(r) + '）', '__bool__ は True か False を返してください');
      return null;
    }
    const lr = this.lenOfInstance(v, line, env);
    if (lr === null) return true;
    if (!lr.known) return null;
    return lr.len !== 0;
  }
  return truthy(v);
};
// B6-Py3：生成は __new__ → __init__ の順（実 CPython と同じ）。
// __new__ が定義されていれば暗黙の staticmethod としてクラスを渡して
// 呼び、その戻り値がそのクラス（のサブクラス）のインスタンスのときだけ
// __init__ を実行する。__new__ が無い場合は従来どおり。
Interp.prototype.instantiate = function (cls, args, kwargs, env, line) {
  const fresh = () => ({ __instance: true, cls, attrs: new Map() });
  let inst = null;
  const newHit = classLookupOwner(cls, '__new__');
  if (newHit && isFunc(newHit.value)) {
    const r = this.withSuperCtx(newHit.owner, cls, () => this.callUserFunc(newHit.value, [cls, ...args], kwargs || {}, env, line));
    if (r && r.__instance) inst = r;
    else if (isUnk(r)) inst = fresh(); // 戻り値が未確定なら通常のインスタンスとして続ける
    else return r; // 別種の値を返したら __init__ は呼ばれず、その値が生成結果になる
  } else inst = fresh();
  const initHit = classLookupOwner(cls, '__init__');
  const init = initHit ? initHit.value : undefined;
  if (isFunc(init)) {
    // __init__ は、作られたインスタンスの型がこのクラス（のサブクラス）のときだけ呼ばれる
    if (inst && inst.__instance && classChain(inst.cls).includes(cls)) {
      try { const value = this.withSuperCtx(initHit.owner, inst, () => this.callUserFunc(init, [inst, ...args], kwargs || {}, env, line)); if (!isNone(value) && value !== undefined) this.err(line, 'TypeError', '__init__はNoneを返す必要があります', ''); }
      catch (e) { if (!(e instanceof Flow && e.kind === 'return')) throw e; }
    }
  }
  else if (init === undefined && (args.length || Object.keys(kwargs || {}).length)) {
    // __new__ だけが定義されている場合も、引数の検証は __new__ 側で済んでいる
    if (!newHit) this.err(line, 'TypeError', 'このクラスはコンストラクタ引数を受け取りません', '');
  }
  // B6監査D10：__del__ は破棄タイミングをモデル化しないため発火しない。
  // 黙って成功せず、対応外の注記で開示する（項目は未対応のまま）。
  if (inst && inst.__instance && classLookup(cls, '__del__') !== undefined)
    this.diag(line, 'note', '対応外', 'object.__del__（インスタンスが破棄されるときの処理）はこの説明では再現しません（破棄のタイミングをモデル化していないため）', '');
  return inst;
};
// B6-Py3：property.getter／setter／deleter の適用（新しい property を作る）
Interp.prototype.applyPropMod = function (wrapper, args, line) {
  const p = wrapper.prop;
  const acc = args[0];
  if (args.length !== 1 || !(isFunc(acc) || acc === undefined)) this.err(line, 'TypeError', 'property.' + wrapper.kind + '() には関数を1つ渡してください', '');
  if (wrapper.kind === 'getter') return PROPVAL(acc, p.fset, p.fdel);
  if (wrapper.kind === 'setter') return PROPVAL(p.fget, acc, p.fdel);
  return PROPVAL(p.fget, p.fset, acc);
};
Interp.prototype.callFn = function (fv, args, env, line) {
  // 値として渡された関数の呼び出し（sorted の key、filter/map の関数、デコレータの適用など）も「使った関数」に数える
  if (fv) { if (fv.__builtin) this.noteCall(fv.__builtin, 'func'); else if (fv.__method) this.noteCall(fv.name, 'method'); else if (isFunc(fv) && fv.def && fv.def.name) this.noteCall(fv.def.name, 'func'); }
  if (isUnk(fv)) { for (const a of args) if (isMutableVal(a)) poison(a, '呼び出しで書き換えられたかもしれない値'); return UNK(); }
  // B6-Py3：ラッパ値の呼び出し（デコレータ適用等の経路）
  if (fv && fv.__propmod) return this.applyPropMod(fv, args, line);
  if (fv && fv.__mrofn) return LIST(mroAllOf(fv.cls));
  if (fv && fv.__objnew) { const t = (args[0] && args[0].__class) ? args[0] : fv.cls; return t ? { __instance: true, cls: t, attrs: new Map() } : UNK(); }
  if (fv && fv.__objga) { const o = args[0]; if (o && o.__instance) { this._gaBypass = (this._gaBypass || 0) + 1; try { return this.getAttrInstance(o, args[1], line, env); } finally { this._gaBypass--; } } return UNK(); }
  if (fv && fv.__objsa) { const o = args[0]; if (o && o.__instance) { this._saBypass = (this._saBypass || 0) + 1; try { this.setAttrInstance(o, args[1], args[2], line, env); } finally { this._saBypass--; } } return NONE; }
  if (fv && fv.__bound) return this.withSuperCtx(fv.owner, fv.instance, () => this.callUserFunc(fv.fn, [fv.instance, ...args], {}, env, line));
  if (fv && fv.__instance) { const r = this.callSpecialArgs(fv, '__call__', args, line, env); if (r !== undefined) return r; }
  if (fv && fv.__builtin) return this.callBuiltin(fv.__builtin, args, {}, env, line, null);
  if (fv && fv.__method) return this.callMethod(fv.obj, fv.name, args, {}, env, line);
  if (fv && fv.__class) return this.instantiate(fv, args, {}, env, line);
  if (fv && fv.__ncls) return this.stdlibConstruct(fv, args, {}, env, line);
  if (fv && fv.__native) { const cd = nativeClassDef(fv.__native); if (cd && cd.call) return cd.call(this.stdlibCtx(env, line), fv, args, {}); this.err(line, 'TypeError', typeName(fv) + ' は呼び出し（ ）ができません', ''); }
  if (isFunc(fv)) return this.callUserFunc(fv, args, {}, env, line);
  this.err(line, 'TypeError', typeName(fv) + ' は呼び出し（ ）ができません', '');
  return UNK();
};
Interp.prototype.needHash = function (v, line) {
  if (!isUnk(v) && dictKeyId(v) === null) this.err(line, 'TypeError', typeName(v) + ' は集合の要素や辞書のキーにできません（ハッシュできない型です）', 'リストはタプルに変えると使えます');
};
// isinstance の第2引数（classinfo）の照合（PY-04）。戻り値：true／false／null（未確定）。
// CPython どおりタプル・合併型は先頭から照合し、一致した時点で True を返し、
// 型でない要素に行き当たったら TypeError で止める（isinstance(1, (int, 5)) は True、
// isinstance(1, (str, 5)) は TypeError という遅延評価の挙動も含む）。
Interp.prototype.isinstanceCheck = function (obj, ci, line) {
  if (isUnk(ci)) return null;
  if (isTuple(ci)) { for (const el of ci.__tuple) { const r = this.isinstanceCheck(obj, el, line); if (r !== false) return r; } return false; }
  if (ci && ci.__union) { for (const el of ci.__union) { const r = this.isinstanceCheck(obj, el, line); if (r !== false) return r; } return false; }
  if (ci && ci.__class) { if (isUnk(obj)) return null; return !!(obj && obj.__instance && classChain(obj.cls).includes(ci)); }
  if (ci && ci.__ncls) {
    const cd = nativeClassDef(ci.__ncls);
    if (isUnk(obj)) return null;
    if (obj && obj.__exc && cd && cd.exc) return this.stdlibExcMatches(obj.kind, cd.exc);
    if (obj && obj.__ncls) return obj.__ncls === ci.__ncls;
    if (!(obj && obj.__native)) {
      // B7 統合時の基盤修正 F-I：ABC が builtinTypes を宣言している場合、
      // 組み込み型の値をその ABC のインスタンスとして扱う
      // （isinstance(3, numbers.Integral) 等。CPython の仮想サブクラス登録に相当）。
      if (cd && cd.builtinTypes) { const tn = typeName(obj); if (cd.builtinTypes.includes(tn)) return true; }
      return false;
    }
    if (obj.__native === ci.__ncls) return true;
    const od = nativeClassDef(obj.__native);
    const seen = new Set(); const queue = [...((od && od.parents) || [])];
    while (queue.length) { const pp = queue.pop(); if (pp === ci.__ncls) return true; if (seen.has(pp)) continue; seen.add(pp); const pd = nativeClassDef(pp); if (pd && pd.parents) queue.push(...pd.parents); }
    return false;
  }
  let name = null;
  if (ci && ci.__type) name = ci.__type;
  else if (ci && ci.__builtin) name = ci.__builtin;
  if (name !== null) {
    if (EXC_NAMES.has(name)) {
      if (isUnk(obj)) return null;
      if (!(obj && obj.__exc)) return false;
      // R25-N1：except 照合と同じ完成した階層（excMatches）を使う。
      // 高度モード B7：標準ライブラリ例外（種別名が限定名）は登録済みの
      // 親子関係でも照合する。
      return excMatches(obj.kind, name) || this.stdlibExcMatches(obj.kind, name);
    }
    // R30F01B-N4（バッチ9 N29）：type() 3引数形で組み込み型を継承元に指定した
    // クラス（例：type('B', (int,), {})）のインスタンスは、その組み込み型の
    // インスタンスとしても扱う（実 CPython どおり。値としての数値演算等の
    // 振る舞いまでは再現しない＝報告書の裁定参照）。
    if (obj && obj.__instance) {
      const baseNames = classChain(obj.cls).flatMap(c => c.baseTypeNames || []);
      if (baseNames.includes(name)) return true;
    }
    if (TYPE_BUILTINS.includes(name) || name === 'NoneType' || name === 'enumerate' || name === 'zip' || name === 'map' || name === 'filter' || name === 'reversed' || name === 'slice' || name === 'bytearray' || name === 'memoryview') {
      if (isUnk(obj)) return null;
      return this.isinstanceOfType(obj, name);
    }
  }
  this.err(line, 'TypeError', 'isinstance() の2つ目（型の指定）が型ではありません（型、型のタプル、または | でつないだ型を使ってください）', '');
};
// isinstance(obj, 型名) の本体。obj は確定値であることが前提。
Interp.prototype.isinstanceOfType = function (obj, name) {
  if (name === 'object') return true;
  if (name === 'type') return !!(obj && (obj.__type || obj.__class || (obj.__builtin && isClassValue(obj))));
  if (isIter(obj)) return obj.kind === name; // zip／map／filter／enumerate／reversed 等のイテレータ値
  if (obj && (obj.__exc || obj.__instance || obj.__class || obj.__type || obj.__union || obj.__builtin)) return false; // 例外値・インスタンス・型そのもの等は組み込み型のインスタンスではない
  if (isFunc(obj) || isMethodRef(obj)) return false;
  return typeName(obj) === name || (name === 'int' && isBool(obj)); // bool は int のサブクラス
};
// key 関数の値を求める。不明が混ざれば null
Interp.prototype.keyed = function (items, keyFn, env, line) {
  const out = [];
  for (const x of items) { const k = keyFn ? this.callFn(keyFn, [x], env, line) : x; if (isUnk(k)) return null; out.push(k); }
  return out;
};
Interp.prototype.evalArgs = function (n, env) {
  const args = [];
  for (const a of n.args) {
    if (a.dstar) continue;
    if (a.star) { const seq = this.unpackSeq(this.eval(a.e, env), n.line); if (seq === null) return null; for (const x of seq) args.push(x); }
    else args.push(this.eval(a.e, env));
  }
  return args;
};
Interp.prototype.callUserFunc = function (fn, args, kwargs, env, line) {
  this.tick(); // 関数呼び出しも作業量の予算を消費する（fib のような指数爆発を止めるため）
  const def = fn.def;
  const params = def.params;
  const posParams = params.filter(p => !p.bare && !p.star && !p.kwOnly);
  const starParam = params.find(p => p.star === 1 && p.name);
  const kwParam = params.find(p => p.star === 2);
  const kwNames = Object.keys(kwargs);
  if (args.length > posParams.length && !starParam)
    this.err(line, 'TypeError', '関数「' + def.name + '」の引数が多すぎます（' + posParams.length + ' 個までなのに ' + args.length + ' 個渡しています）', '呼び出しの引数の数を確認してください');
  if (def.isGen === undefined) def.isGen = hasNode(def.body, x => x.k === 'unkexpr' && (x.what === 'yield' || x.what === 'yield from'));
  if (def.isGen) { this.diag(line, 'note', '対応外', 'ジェネレータ関数「' + def.name + '」（yield を含む関数）の中身はこの説明では順に実行しません。作られる値は「実行時に決まる値」として扱います', ''); return UNK('ジェネレータ「' + def.name + '」が作る値'); }
  const local = new Env(fn.env || this.globals); // 定義された場所のスコープを親にする（入れ子関数のクロージャ対応）
  if (!def.localNames) { const decl = declaredNames(def.body); def.localNames = [...assignedNames(def.body)].filter(x => !decl.has(x) && !params.some(p => p.name === x)); }
  for (const x of def.localNames) local.set(x, UNBOUND);
  const named = {};
  posParams.forEach((p, i) => { if (i < args.length) named[p.name] = args[i]; });
  const extraKw = {};
  for (const k of kwNames) {
    if (params.some(p => p.name === k)) {
      if (named[k] !== undefined) this.err(line, 'TypeError', '関数「' + def.name + '」の引数「' + k + '」に値が2つ渡されています', '');
      named[k] = this.eval(kwargs[k], env);
    } else if (kwParam) extraKw[k] = this.eval(kwargs[k], env);
    else this.err(line, 'TypeError', '関数「' + def.name + '」に引数「' + k + '」はありません', '引数名の綴りを確認してください');
  }
  for (const p of params) {
    if (p.bare) continue;
    if (p.star === 1) { local.set(p.name, TUPLE(args.slice(posParams.length))); continue; }
    if (p.star === 2) { const d = DICT(); for (const k of Object.keys(extraKw)) dictSet(d, k, extraKw[k]); local.set(p.name, d); continue; }
    if (named[p.name] !== undefined) { local.set(p.name, named[p.name]); continue; }
    if (p.def) { local.set(p.name, fn.defaults && p.name in fn.defaults ? fn.defaults[p.name] : this.eval(p.def, fn.env || this.globals)); continue; }
    this.err(line, 'TypeError', '関数「' + def.name + '」の引数「' + p.name + '」の値が渡されていません（必須の引数です）', '呼び出しの引数を確認してください');
  }
  this.step(line, '関数「' + def.name + '」を呼び出します（' + params.filter(p => !p.bare).map((p) => p.name + ' = ' + reprVal(local.get(p.name))).join('、') + '）');
  // R30-P-N1（バッチ9 N3）：呼出し深さの上限は「値を未確定化して継続」ではなく、
  // 実 CPython どおり RecursionError として発生させる。ユーザーコードの
  // try/except RecursionError（および親の RuntimeError／Exception 等）で
  // 捕捉できる（isCatchableDiag の対象）。捕捉されなければ run() 側で
  // truncated＋「説明の上限」（limit 種別）として正直に打ち切る。
  // 上限値 40 は本エンジンの説明モデル上の上限（手順・作業量予算と JS
  // スタックの安全域）であり、CPython 既定の約1000とは異なる旨は
  // メッセージと報告書で開示する（値を失って継続する形は残さない）。
  if (this.depth >= MAX_CALL_DEPTH) {
    const d = new SimDiag(line, 'RecursionError', '関数の呼び出しが深くなりすぎました（maximum recursion depth exceeded：この説明での呼び出しの深さの上限 ' + MAX_CALL_DEPTH + ' に達しました）', '自分自身を呼び出すときは、止まる条件があるか確認してください');
    d.excStr = 'maximum recursion depth exceeded'; d.excRepr = ''; d.depthLimit = true;
    throw d;
  }
  this.depth++;
  let ret = NONE; const prevOF = this.orderFree; this.orderFree = false;
  try { this.execBlock(def.body, local, { inFunc: true }); }
  catch (e) { if (e instanceof Flow && e.kind === 'return') ret = e.value; else { this.depth--; this.orderFree = prevOF; throw e; } }
  this.depth--; this.orderFree = prevOF;
  this.step(line, '関数「' + def.name + '」は ' + reprVal(ret) + ' を返します');
  return ret;
};

const ORDER_FREE = new Set(['sorted', 'sum', 'min', 'max', 'any', 'all', 'set', 'len']);
/* ============ B6（Python班1）：組み込み関数・定数・例外の高度差分ヘルパー ============
   hash の数値規則は CPython の仕様アルゴリズム（int は 2^61-1 剰余、float は
   有理数としての剰余、tuple は tupleobject.c の古典アルゴリズム）を BigInt で
   正確に計算する。結果が JS の数値で正確に表せない大きさのときは、値を
   捏造せず「実行時に決まる値」に倒す（大きな整数を BIG() に倒す既存方針と
   同じ）。文字列・bytes・None・同一性ハッシュ（関数・クラス・インスタンス・
   sentinel 等）は実行ごとに変わりうるため、常に「実行時に決まる値」を返す。 */
const PY_HASH_MOD = (1n << 61n) - 1n;
function pyIntHashBig(bv) { let h = bv >= 0n ? bv % PY_HASH_MOD : -((-bv) % PY_HASH_MOD); if (h === -1n) h = -2n; return h; }
function pyFloatHashBig(x) {
  if (x === 0) return 0n;
  const buf = new DataView(new ArrayBuffer(8)); buf.setFloat64(0, x);
  const bits = buf.getBigUint64(0);
  const sign = (bits >> 63n) ? -1n : 1n;
  const expBits = Number((bits >> 52n) & 0x7ffn);
  let mant = bits & ((1n << 52n) - 1n); let E;
  if (expBits === 0) E = -1074; else { mant |= (1n << 52n); E = expBits - 1075; }
  const eMod = ((BigInt(E) % 61n) + 61n) % 61n; // 2^61 ≡ 1 (mod 2^61-1) のため指数は 61 で剰余を取る
  let h = sign * ((mant % PY_HASH_MOD) * ((1n << eMod) % PY_HASH_MOD) % PY_HASH_MOD);
  if (h === -1n) h = -2n;
  return h;
}
function pyTupleHashBig(hs) { // CPython（Objects/tupleobject.c）の古典アルゴリズム。64bit 折り返しで計算する
  const M64 = (1n << 64n) - 1n;
  let x = 0x345678n; let mult = 1000003n; const n = hs.length;
  for (let i = 0; i < n; i++) {
    const y = ((hs[i] % (1n << 64n)) + (1n << 64n)) % (1n << 64n);
    x = ((x ^ y) * mult) & M64;
    const len = BigInt(n - 1 - i);
    mult = (mult + 82520n + len + len) & M64;
  }
  x = (x + 97531n) & M64;
  let s = x >= (1n << 63n) ? x - (1n << 64n) : x;
  if (s === -1n) s = -2n;
  return s;
}
function numFromHashBig(h) { const n = Number(h); return Number.isSafeInteger(n) && BigInt(n) === h ? NUM(n, false) : null; } // 安全な整数の範囲を超えるハッシュは、表示桁が化けるため数値化しない（BIG() と同じ方針）
// object()／sentinel() 用の共有クラス値（cenv は空。属性は各インスタンスの attrs が持つ）
let B6_OBJECT_CLASS = null, B6_SENTINEL_CLASS = null;
function b6ObjectClass() { if (!B6_OBJECT_CLASS) B6_OBJECT_CLASS = { __class: true, cname: 'object', cenv: new Env(null), bases: [], baseTypeNames: [] }; return B6_OBJECT_CLASS; }
function b6SentinelClass() { if (!B6_SENTINEL_CLASS) B6_SENTINEL_CLASS = { __class: true, cname: 'sentinel', cenv: new Env(null), bases: [], baseTypeNames: [] }; return B6_SENTINEL_CLASS; }
function classInfoOf(v) {
  if (!v || typeof v !== 'object') return null;
  if (v.__class) return { user: v };
  if (v.__type) return { builtin: v.__type };
  if (v.__builtin && (TYPE_BUILTINS.includes(v.__builtin) || EXC_NAMES.has(v.__builtin) || v.__builtin === 'sentinel')) return { builtin: v.__builtin };
  return null;
}
Interp.prototype.pyHash = function (v, line) {
  if (isUnk(v)) return UNK();
  if (isBool(v)) return NUM(v.v ? 1 : 0, false);
  if (isNum(v)) {
    if (!v.f) { const n = numFromHashBig(pyIntHashBig(BigInt(Math.trunc(v.v)))); return n !== null ? n : UNK('ハッシュ値'); }
    if (Number.isNaN(v.v)) return UNK('NaN のハッシュ値'); // CPython 3.12.3 実走では実行ごとに変わることを確認済み
    if (!Number.isFinite(v.v)) return NUM(v.v > 0 ? 314159 : -314159, false);
    const n = numFromHashBig(pyFloatHashBig(v.v)); return n !== null ? n : UNK('ハッシュ値');
  }
  if (typeof v === 'string') return UNK('文字列のハッシュ値'); // PYTHONHASHSEED で実行ごとに変わる
  if (isNone(v)) return UNK('None のハッシュ値');
  if (isTuple(v)) {
    const hs = [];
    for (const el of v.__tuple) { const eh = this.pyHash(el, line); if (isUnk(eh)) return UNK('タプルのハッシュ値'); hs.push(BigInt(Math.trunc(eh.v))); }
    const n = numFromHashBig(pyTupleHashBig(hs)); return n !== null ? n : UNK('タプルのハッシュ値');
  }
  if (isComplex(v)) {
    // CPython の complex_hash：実部と虚部のハッシュを 1000003（_PyHASH_IMAG）で合成する
    const hr = this.pyHash(NUM(v.__complex.re, true), line);
    const hi = this.pyHash(NUM(v.__complex.im, true), line);
    if (isUnk(hr) || isUnk(hi)) return UNK('ハッシュ値');
    let combined = BigInt(Math.trunc(hr.v)) + 1000003n * BigInt(Math.trunc(hi.v));
    if (combined === -1n) combined = -2n;
    const n = numFromHashBig(combined); return n !== null ? n : UNK('ハッシュ値');
  }
  if (isFrozenSet(v)) {
    // B6監査D1：CPython 3.12 Objects/setobject.c frozenset_hash を実走9ケースで突合済みの式。
    // shuffle(h) = ((h ^ 89869747) ^ (h << 16)) * 3644798167（64bit）の XOR 合成に
    // (要素数+1) * 1927868237 を XOR し、>>11 と >>25 で拡散、* 69069 + 907133923。
    // 安全整数を超える結果はエンジン既定方針（numFromHashBig）どおり未確定値にする。
    const MASK = 0xffffffffffffffffn;
    let h = 0n;
    for (const el of v.__set) { const eh = this.pyHash(el, line); if (isUnk(eh)) return UNK('ハッシュ値'); const e = BigInt(Math.trunc(eh.v)) & MASK; h ^= ((((e ^ 89869747n) ^ ((e << 16n) & MASK)) * 3644798167n) & MASK); }
    h ^= (BigInt(v.__set.length + 1) * 1927868237n) & MASK;
    h ^= (h >> 11n) ^ (h >> 25n);
    h = (h * 69069n + 907133923n) & MASK;
    if (h === MASK) h = 590923713n;
    if (h >= 0x8000000000000000n) h -= 0x10000000000000000n;
    const n = numFromHashBig(h); return n !== null ? n : UNK('ハッシュ値');
  }
  if (isFrozenDict(v)) return UNK('ハッシュ値'); // B6監査D1：ハッシュ可能（PEP 814）だが正確な合成規則を実走で確定できないため決めない
  if (isMemview(v) && !v.__memview.readonly) this.err(line, 'TypeError', 'ハッシュできない型です（unhashable type: \'memoryview\'）', '書き換え可能な memoryview はハッシュできません');
  if (isList(v) || isDict(v) || isSet(v) || isView(v) || isBytearray(v)) this.err(line, 'TypeError', 'ハッシュできない型です（unhashable type: \'' + typeName(v) + '\'）', 'ハッシュできるのは数値・タプルなど、変更できない値だけです');
  return UNK('ハッシュ値'); // 関数・クラス・インスタンス・bytes・range 等は同一性（アドレス）依存のため決めない
};
Interp.prototype.pyGetAttr = function (obj, name, env, line) {
  const NOT = { found: false };
  if (isUnk(obj)) return { unknown: true };
  if (obj && obj.__instance) {
    if (name === '__dict__') { const d = DICT(); for (const [k, v] of obj.attrs) dictSet(d, k, v); return { found: true, value: d }; }
    if (name === '__class__') return { found: true, value: obj.cls };
    if (obj.attrs.has(name)) return { found: true, value: obj.attrs.get(name) };
    const cv = classLookup(obj.cls, name);
    if (cv !== undefined) return { found: true, value: isFunc(cv) ? { __bound: true, fn: cv, instance: obj } : cv };
    return NOT;
  }
  if (obj && obj.__class) {
    if (name === '__name__' || name === '__qualname__') return { found: true, value: obj.cname };
    if (name === '__dict__') { const d = DICT(); for (const [k, v] of obj.cenv.vars) dictSet(d, k, v); return { found: true, value: d }; }
    const cv = classLookup(obj, name);
    if (cv !== undefined) return { found: true, value: cv };
    return NOT;
  }
  if (obj && obj.__type) { if (name === '__name__' || name === '__qualname__') return { found: true, value: obj.__type }; return NOT; }
  if (obj && obj.__builtin) { if (name === '__name__') return { found: true, value: obj.__builtin }; return NOT; }
  if (isFunc(obj)) {
    if (name === '__annotations__') {
      const d = DICT();
      const toType = (v) => (v && v.__builtin && ['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set'].includes(v.__builtin)) ? TYPEVAL(v.__builtin) : v;
      for (const p of obj.def.params) if (p.ann) dictSet(d, p.name, toType(this.eval(p.ann, obj.env || env)));
      if (obj.def.retAnn) dictSet(d, 'return', toType(this.eval(obj.def.retAnn, obj.env || env)));
      return { found: true, value: d };
    }
    return NOT;
  }
  if (isNum(obj) || isBool(obj)) {
    if (name === 'real') return { found: true, value: isBool(obj) ? NUM(obj.v ? 1 : 0, false) : obj };
    if (name === 'imag') return { found: true, value: isBool(obj) ? NUM(0, false) : NUM(0, obj.f) };
    if (name === 'numerator') { if (isBool(obj)) return { found: true, value: NUM(obj.v ? 1 : 0, false) }; if (!obj.f) return { found: true, value: obj }; return NOT; }
    if (name === 'denominator') { if (isBool(obj) || !obj.f) return { found: true, value: NUM(1, false) }; return NOT; }
  }
  if (obj && obj.__range && obj.rng && (name === 'start' || name === 'stop' || name === 'step')) return { found: true, value: NUM(obj.rng[name === 'start' ? 0 : name === 'stop' ? 1 : 2], false) };
  // B6監査D3：型班の値モデル（複素数・スライス・memoryview）のデータ属性
  if (isComplex(obj)) { if (name === 'real') return { found: true, value: NUM(obj.__complex.re, true) }; if (name === 'imag') return { found: true, value: NUM(obj.__complex.im, true) }; }
  if (isSlice(obj)) { if (name === 'start') return { found: true, value: obj.__slice.start }; if (name === 'stop') return { found: true, value: obj.__slice.stop }; if (name === 'step') return { found: true, value: obj.__slice.step }; }
  if (isMemview(obj)) {
    const mv = obj.__memview;
    if (mv.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません', '');
    if (name === 'obj') return { found: true, value: mv.obj };
    if (name === 'nbytes') return { found: true, value: NUM(mv.len, false) };
    if (name === 'readonly') return { found: true, value: BOOL(mv.readonly) };
    if (name === 'format') return { found: true, value: 'B' };
    if (name === 'itemsize') return { found: true, value: NUM(1, false) };
    if (name === 'ndim') return { found: true, value: NUM(1, false) };
    if (name === 'shape') return { found: true, value: TUPLE([NUM(mv.len, false)]) };
    if (name === 'strides') return { found: true, value: TUPLE([NUM(1, false)]) };
    if (name === 'suboffsets') return { found: true, value: TUPLE([]) };
    if (name === 'c_contiguous' || name === 'f_contiguous' || name === 'contiguous') return { found: true, value: BOOL(true) };
  }
  const tn = typeName(obj);
  if (TYPE_ATTRS[tn] && TYPE_ATTRS[tn].has(name) && (typeof obj === 'string' || isList(obj) || isDict(obj) || isSet(obj) || isTuple(obj) || (obj && obj.__range) || isNum(obj) || isBool(obj) || isBytesLike(obj) || isComplex(obj) || isSlice(obj) || isMemview(obj) || isFrozenDict(obj))) return { found: true, value: METHODREF(obj, name) };
  return NOT;
};
Interp.prototype.pySetAttr = function (obj, name, value, line) {
  if (obj && obj.__instance) {
    if (obj.__object) this.err(line, 'AttributeError', '\'object\' object has no attribute \'' + name + '\'（object() のインスタンスには属性を持たせられません）', '');
    if (obj.__sentinel) this.err(line, 'AttributeError', 'sentinel 値の属性は変更できません', '');
    obj.attrs.set(name, value); this.step(line, '属性「' + name + '」を ' + reprVal(value) + ' に設定します'); return;
  }
  if (obj && obj.__class) { obj.cenv.vars.set(name, value); this.step(line, 'クラス「' + obj.cname + '」の属性「' + name + '」を ' + reprVal(value) + ' に設定します'); return; }
  this.err(line, 'AttributeError', typeName(obj) + ' には属性「' + name + '」を設定できません（\'' + typeName(obj) + '\' object has no attribute \'' + name + '\'）', '');
};
Interp.prototype.pyDelAttr = function (obj, name, line) {
  if (obj && obj.__instance) {
    if (obj.attrs.has(name)) { obj.attrs.delete(name); this.step(line, '属性「' + name + '」を削除します'); return; }
    this.err(line, 'AttributeError', typeName(obj) + ' には属性「' + name + '」がありません', '');
  }
  if (obj && obj.__class) {
    if (obj.cenv.vars.has(name)) { obj.cenv.vars.delete(name); this.step(line, 'クラス「' + obj.cname + '」の属性「' + name + '」を削除します'); return; }
    this.err(line, 'AttributeError', 'type object \'' + obj.cname + '\' has no attribute \'' + name + '\'', '');
  }
  this.err(line, 'AttributeError', typeName(obj) + ' には属性「' + name + '」がありません', '');
};
Interp.prototype.issubclassOne = function (src, tgt) {
  if (tgt.builtin === 'object') return true;
  if (src.user) {
    if (tgt.user) return classChain(src.user).includes(tgt.user);
    if (EXC_NAMES.has(tgt.builtin)) return false; // ユーザー定義クラスは例外を継承できない（クラス継承自体が未対応）
    return classChain(src.user).some(c => (c.baseTypeNames || []).includes(tgt.builtin));
  }
  if (tgt.user) return false;
  const s = src.builtin, t = tgt.builtin;
  if (s === t) return true;
  if (EXC_NAMES.has(s) && EXC_NAMES.has(t)) return excMatches(s, t);
  if (EXC_NAMES.has(s) || EXC_NAMES.has(t)) return false;
  if (s === 'bool' && t === 'int') return true;
  return false;
};
Interp.prototype.envDict = function (e) { const d = DICT(); for (const [k, v] of e.vars) { if (v === UNBOUND) continue; dictSet(d, k, v); } return d; };
Interp.prototype.dirOf = function (obj, env, line) {
  // B6監査D9：__dir__ を定義したクラスのインスタンスでは、未対応の
  // object.__dir__ を既定の名前一覧で黙って代用しない
  if (obj && obj.__instance && this.specialLookup(obj, '__dir__') !== undefined)
    this.err(line, '未対応', 'object.__dir__（dir() の結果のカスタマイズ）はこの説明では対応していません', '');
  let names = null;
  if (obj && obj.__instance) { const s = new Set(); for (const k of obj.attrs.keys()) s.add(k); for (const c of classChain(obj.cls)) for (const k of c.cenv.vars.keys()) s.add(k); names = [...s]; }
  else if (obj && obj.__class) { const s = new Set(); for (const c of classChain(obj)) for (const k of c.cenv.vars.keys()) s.add(k); s.add('__name__'); names = [...s]; }
  else if (isFunc(obj)) names = ['__annotations__'];
  else { const tn = typeName(obj); if (TYPE_ATTRS[tn]) names = [...TYPE_ATTRS[tn]]; else if ((obj && obj.__type) || (obj && obj.__builtin)) names = []; }
  if (names === null) return UNK();
  names.sort(); return LIST(names);
};

Interp.prototype.callBuiltin = function (name, args, kwargs, env, line, node) {
  const prev = this.orderFree; this.orderFree = ORDER_FREE.has(name);
  try { return this.callBuiltin0(name, args, kwargs, env, line, node); } finally { this.orderFree = prev; }
};
Interp.prototype.callBuiltin0 = function (name, args, kwargs, env, line, node) {
  const kw = {};
  for (const k of Object.keys(kwargs || {})) kw[k] = this.eval(kwargs[k], env);
  // RG-15：宣言範囲外のキーワード引数を無言で無視しない。対応する名前だけを許可し、それ以外は名前を挙げて TypeError で止める
  const KW_ALLOWED = { print: ['sep', 'end', 'file', 'flush'], int: ['base'], float: [], bool: [], str: ['object', 'encoding', 'errors'], list: [], tuple: [], set: [], repr: [], iter: [], next: [], format: [], hex: [], bin: [], oct: [], map: [], filter: [], input: [], range: [], len: [], sum: ['start'], min: ['key', 'default'], max: ['key', 'default'], abs: [], round: ['number', 'ndigits'], sorted: ['key', 'reverse'], reversed: [], enumerate: ['start'], zip: ['strict'], type: [], isinstance: [], ord: [], chr: [], divmod: [], pow: ['base', 'exp', 'mod'], any: [], all: [], ascii: [], callable: [], delattr: [], dir: [], getattr: [], globals: [], hasattr: [], hash: [], id: [], issubclass: [], locals: [], setattr: [], vars: [], object: [], sentinel: ['repr', 'module'], aiter: [], anext: [], breakpoint: [], compile: [], eval: [], exec: [], help: [], __import__: [], bytes: ['encoding', 'errors'], bytearray: ['encoding', 'errors'], complex: ['real', 'imag'], frozenset: [], slice: [], memoryview: [] };
  if (Object.prototype.hasOwnProperty.call(KW_ALLOWED, name)) {
    for (const k of Object.keys(kw)) if (!KW_ALLOWED[name].includes(k)) this.err(line, 'TypeError', name + '() にキーワード引数「' + k + '」はありません', 'キーワード引数「' + k + '」は ' + name + '() では使えません。引数名を確認してください');
  }
  if (name === 'print' && kw.file !== undefined && !isNone(kw.file)) this.diag(line, 'note', '対応外', 'print() の file 引数（出力先の指定）はこの説明では対応していません', '出力先を指定しない形で試してください');
  if (name === 'str' && (kw.encoding !== undefined || kw.errors !== undefined)) this.diag(line, 'note', '対応外', 'str() のキーワード引数「' + (kw.encoding !== undefined ? 'encoding' : 'errors') + '」（バイト列の変換）はこの説明では対応していません', '');
  // キーワードで渡せる位置引数（CPython で実測確認済み：int の base、round の number、pow の base/exp/mod、str の object）を位置引数へ寄せる
  const fillKw = (slots) => { if (args.length > slots.length) return; const out = []; for (let i = 0; i < slots.length; i++) { if (i < args.length && kw[slots[i]] !== undefined) this.err(line, 'TypeError', name + '() の引数「' + slots[i] + '」に値が2つ渡されています', ''); const v = i < args.length ? args[i] : kw[slots[i]]; if (v === undefined) break; out.push(v); } args = out; };
  if (name === 'int' && kw.base !== undefined && args.length > 1) this.err(line, 'TypeError', 'int() の引数「base」に値が2つ渡されています', '');
  if (name === 'int' && kw.base !== undefined && args.length <= 1) args = [args[0], kw.base];
  if (name === 'round') fillKw(['number', 'ndigits']);
  if (name === 'pow') fillKw(['base', 'exp', 'mod']);
  if (name === 'str' && kw.object !== undefined) { if (args.length) this.err(line, 'TypeError', 'str() の引数「object」に値が2つ渡されています', ''); args = [kw.object]; }
  const ar = ARITY[name];
  if (ar && (args.length < ar[0] || args.length > ar[1])) {
    this.err(line, 'TypeError', name + '() の引数の数が合いません（' + (ar[0] === ar[1] ? ar[0] + ' 個' : ar[0] + '〜' + ar[1] + ' 個') + '必要ですが、' + args.length + ' 個渡しています）', 'リファレンスで ' + name + ' の使い方を確認してください');
  }
  switch (name) {
    case 'print': {
      let sep = ' ', end = '\n';
      if (kw.sep !== undefined && !isNone(kw.sep)) { if (isUnk(kw.sep)) { this.emitRaw('（実行時に決まる値）\n', line); return NONE; } if (typeof kw.sep !== 'string') this.err(line, 'TypeError', 'print() の sep は文字列か None にしてください', ''); sep = kw.sep; }
      if (kw.end !== undefined && !isNone(kw.end)) { if (isUnk(kw.end)) { this.emitRaw('（実行時に決まる値）\n', line); return NONE; } if (typeof kw.end !== 'string') this.err(line, 'TypeError', 'print() の end は文字列か None にしてください', ''); end = kw.end; }
      const text = args.map(a => this.strOf(a, line, env)).join(sep); // B6-Py3：__str__／__repr__ を発火
      this.emitRaw(text + end, line);
      this.step(line, '画面に「' + text + '」と表示します' + (end !== '\n' ? '（改行の代わりに ' + reprVal(end) + ' を付けます）' : ''));
      return NONE;
    }
    case 'repr': { const v0 = args[0]; if (v0 && v0.__instance) return this.reprValueOf(v0, line, env); return isUnk(v0) || isIter(v0) ? UNK() : reprVal(v0); } // B6-Py3：__repr__ を発火
    case 'iter': { const v = args[0]; if (isUnk(v)) return UNK(); if (isIter(v)) return v; if (v && v.__instance) { const pull = this.srcPull(v, line); if (pull === null) return UNK(); const it2 = ITER([], 'iterator'); it2.pull = pull; return it2; } const kind = isList(v) ? 'list_iterator' : isTuple(v) ? 'tuple_iterator' : typeof v === 'string' ? (/^[\x00-\x7f]*$/.test(v) ? 'str_ascii_iterator' : 'str_iterator') : isDict(v) ? 'dict_keyiterator' : isSet(v) ? 'set_iterator' : v && v.__range ? 'range_iterator' : isBytes(v) ? 'bytes_iterator' : isBytearray(v) ? 'bytearray_iterator' : isMemview(v) ? 'memory_iterator' : null; if (!kind) this.err(line, 'TypeError', typeName(v) + ' は繰り返しに使えません', ''); const pull = this.srcPull(v, line); if (pull === null) return UNK(); const it = ITER([], kind); it.pull = pull; return it; }
    case 'next': { const v = args[0]; if (isUnk(v)) return UNK(); if (!isIter(v)) this.err(line, 'TypeError', typeName(v) + ' は next() に使えません（イテレータではありません）', 'iter() でイテレータにしてから使ってください'); const r = this.iterPull(v); if (this.iterFailed(v)) return UNK(); if (r !== EXH) { this.step(line, v.kind + ' から次の値 ' + reprVal(r) + ' を取り出します'); return r; } if (args.length > 1) return args[1]; this.err(line, 'StopIteration', 'これ以上取り出せる値がありません', 'next(it, 既定値) のように2つ目を渡すと、終わったときにその値が返ります'); return UNK(); }
    case 'format': {
      // R30F01B-N3（バッチ9 N28）：不正な書式指定は未確定値に化けさせず、
      // 実 CPython どおり ValueError／TypeError で停止する。書式指定が
      // 文字列でない場合も実物どおり TypeError（argument 2 must be str）。
      if (isUnk(args[0])) return UNK();
      const spec = args.length > 1 ? args[1] : '';
      if (isUnk(spec)) return UNK();
      if (typeof spec !== 'string') this.err(line, 'TypeError', 'format() の2つ目（書式指定）は文字列にしてください（format() argument 2 must be str）', '');
      // B7 統合時の基盤修正 F-H：ネイティブ値の書式指定は def.format へ委譲する。
      if (args[0] && args[0].__native) { const d = nativeClassDef(args[0].__native); if (d && d.format) { const fr = d.format(this.stdlibCtx(env, line), args[0], spec); if (typeof fr === 'string') return fr; } }
      // B6-Py3：__format__ を発火する
      if (args[0] && args[0].__instance) {
        if (this.specialLookup(args[0], '__format__') !== undefined) { const fr = this.callSpecialArgs(args[0], '__format__', [spec], line, env); if (typeof fr === 'string') return fr; if (isUnk(fr)) return fr; this.err(line, 'TypeError', '__format__ は文字列を返す必要があります', '__format__ は文字列を返してください'); }
        if (spec === '') return this.strValueOf(args[0], line, env);
        this.err(line, 'TypeError', 'このオブジェクトには書式指定は使えません（unsupported format string passed to ' + typeName(args[0]) + '.__format__）', '__format__ を定義するか、書式指定なしで使ってください');
      }
      const r = fmtSpec(args[0], spec);
      if (r && r.__fmtErr) this.err(line, r.kind, r.msg, '');
      return r === null ? UNK('format の結果') : r;
    }
    case 'hex': case 'bin': case 'oct': { let v = args[0]; if (isUnk(v)) return UNK(); if (isBool(v)) v = NUM(v.v ? 1 : 0, false); if (!isNum(v) || v.f) this.err(line, 'TypeError', name + '() には整数を渡してください', ''); const base = { hex: 16, bin: 2, oct: 8 }[name]; const pre = { hex: '0x', bin: '0b', oct: '0o' }[name]; return (v.v < 0 ? '-' : '') + pre + Math.abs(v.v).toString(base); }
    case 'map': {
      // CPython の map は遅延評価：作るだけでは関数は呼ばれず、消費のたびに
      // 供給元から1行ずつ取って関数を適用する（R7-136）。
      if (isUnk(args[0])) return UNK();
      const pulls = [];
      for (const a of args.slice(1)) { const p = this.srcPull(a, line); if (p === null) return UNK(); pulls.push(p); }
      const it = ITER([], 'map');
      it.sources = args.slice(1).filter(isIter);
      const fn = args[0];
      it.pull = () => {
        const row = [];
        for (const p of pulls) { const r = p(); if (r === EXH) return EXH; row.push(r); }
        return this.callFn(fn, row, env, line);
      };
      return it;
    }
    case 'filter': {
      // CPython の filter も遅延評価：消費のたびに述語が真になる要素まで進む。
      const p = this.srcPull(args[1], line); if (p === null) return UNK();
      const it = ITER([], 'filter');
      it.sources = isIter(args[1]) ? [args[1]] : [];
      const fn = args[0];
      it.pull = () => {
        for (;;) {
          const x = p();
          if (x === EXH) return EXH;
          const r = isNone(fn) ? x : this.callFn(fn, [x], env, line);
          const t = this.truthyOf(r, line, env);
          if (t === null) { it.failed = true; return EXH; }
          if (t) return x;
        }
      };
      return it;
    }
    case 'input': {
      this.step(line, 'キーボードからの入力を待ちます（入力された値は実行時に決まります）');
      if (args.length && typeof args[0] === 'string') this.emitRaw(args[0], line); // プロンプトは改行なしで表示される
      return UNK('入力された値');
    }
    case 'len': {
      const v = args[0];
      if (isUnk(v)) return UNK();
      if (typeof v === 'string') return NUM(Array.from(v).length, false);
      if (isIter(v)) this.err(line, 'TypeError', v.kind + ' オブジェクトには長さ（len）がありません', 'list() で並びに変えてから len() を使ってください');
      if (isList(v)) return NUM(v.__list.length, false);
      if (isTuple(v)) return NUM(v.__tuple.length, false);
      if (isDict(v)) return NUM(v.__dict.size, false);
      if (isSet(v)) return NUM(v.__set.length, false);
      if (isView(v)) return NUM(v.__view.__dict.size, false);
      if (v && v.__range) return NUM(v.__range.length, false);
      if (isBytesLike(v)) return NUM(bytesOf(v).length, false);
      if (isMemview(v)) { if (v.__memview.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません（operation forbidden on released memoryview object）', ''); return NUM(v.__memview.len, false); }
      // R29-N15：ユーザー定義クラスのインスタンスは __len__ を引く（実
      // CPython どおり。定義済みなのに「長さがありません」としない）。
      if (v && v.__instance) {
        const lr = this.lenOfInstance(v, line, env);
        if (lr !== null) {
          if (!lr.known) return UNK();
          return NUM(lr.len, false);
        }
      }
      if (v && v.__native) { const d = nativeClassDef(v.__native); if (d && d.len) { const nn = d.len(this.stdlibCtx(env, line), v); if (nn !== null && nn !== undefined) return NUM(nn, false); } }
      this.err(line, 'TypeError', typeName(v) + ' には長さ（len）がありません', 'len() は文字列・リスト・辞書など「集まり」に使います');
      return UNK();
    }
    case 'range': {
      const ns = args.map(a => { if (isUnk(a)) return null; if (isBool(a)) return a.v ? 1 : 0; if (!isNum(a) || a.f) this.err(line, 'TypeError', 'range() の引数は整数にしてください（' + typeName(a) + ' は使えません）', ''); return a.v; });
      if (ns.some(x => x === null)) return UNK();
      let start = 0, stop, step = 1;
      if (ns.length === 1) stop = ns[0]; else if (ns.length === 2) { start = ns[0]; stop = ns[1]; } else { start = ns[0]; stop = ns[1]; step = ns[2]; }
      if (step === 0) this.err(line, 'ValueError', 'range() の3つ目（間隔）を 0 にはできません', '');
      const count = step > 0 ? Math.max(0, Math.ceil((stop - start) / step)) : Math.max(0, Math.ceil((start - stop) / -step));
      if (count > MAX_RANGE) { const u = UNK('要素がとても多い range・この説明では展開しません'); u.__knownRange = { start, step, count }; return u; }
      const arr = [];
      for (let k = 0; k < count; k++) arr.push(NUM(start + k * step, false));
      const r = RANGE(arr); r.rng = [start, stop, step]; return r;
    }
    case 'str': return args.length === 0 ? '' : isUnk(args[0]) ? UNK(args[0].desc) : isIter(args[0]) ? UNK(args[0].kind + ' オブジェクトの文字列表現') : this.strValueOf(args[0], line, env); // B6-Py3：__str__ を発火
    case 'int': {
      const v = args[0];
      if (isUnk(v)) return UNK();
      if (args.length === 0) return NUM(0, false);
      if (args.length > 1) { const b = args[1]; if (isUnk(b)) return UNK(); const bn = this.intIndex(b, line, 'int() の基数'); if (!(bn === 0 || (bn >= 2 && bn <= 36))) this.err(line, 'ValueError', 'int() の基数は 2〜36 か 0 にしてください', ''); if (typeof v !== 'string') this.err(line, 'TypeError', '基数を指定するときは、int() に文字列を渡してください', ''); }
      if (isNum(v)) { if (!Number.isFinite(v.v)) this.err(line, Number.isNaN(v.v) ? 'ValueError' : 'OverflowError', '無限大や NaN は整数に変換できません', ''); const n = Math.trunc(v.v); return SAFE(n) ? NUM(n === 0 ? 0 : n, false) : BIG(); }
      if (isBool(v)) return NUM(v.v ? 1 : 0, false);
      if (v && v.__native && args.length <= 1) { const d = nativeClassDef(v.__native); if (d && d.toInt) { const r = d.toInt(this.stdlibCtx(env, line), v); if (r !== STDLIB_NOT_HANDLED && r !== undefined) return r; } }
      // B6-Py3：__int__／__index__／__trunc__ を発火する
      if (v && v.__instance && args.length <= 1) {
        for (const mn of ['__int__', '__index__', '__trunc__']) {
          if (this.specialLookup(v, mn) !== undefined) {
            const r = this.callSpecial(v, mn, line, env);
            if (isUnk(r)) return r;
            if (isBool(r)) return NUM(r.v ? 1 : 0, false);
            if (isNum(r) && !r.f) return r;
            this.err(line, 'TypeError', mn + '() の戻り値（' + typeName(r) + '）は整数として解釈できません', mn + ' は整数を返してください');
          }
        }
      }
      if (typeof v === 'string') {
        let base = 10;
        if (args.length > 1) { const b = args[1]; if (isBool(b)) base = b.v ? 1 : 0; else if (isNum(b) && !b.f) base = b.v; }
        const r = pyIntFromStr(v, base);
        if (r.err) this.err(line, 'ValueError', '文字列「' + v + '」は整数に変換できません', 'int() で変えられるのは "123" のような数字だけの文字列です（アンダースコアは数字の間だけ使えます）');
        return r.big ? BIG() : NUM(r.n, false);
      }
      this.err(line, 'TypeError', typeName(v) + ' は int() で変換できません', '');
      return UNK();
    }
    case 'float': {
      const v = args[0];
      if (isUnk(v)) return UNK();
      if (v && v.__native && args.length <= 1) { const d = nativeClassDef(v.__native); if (d && d.toFloat) { const r = d.toFloat(this.stdlibCtx(env, line), v); if (r !== STDLIB_NOT_HANDLED && r !== undefined) return r; } }
      // B6-Py3：__float__／__index__ を発火する
      if (v && v.__instance) {
        for (const mn of ['__float__', '__index__']) {
          if (this.specialLookup(v, mn) !== undefined) {
            const r = this.callSpecial(v, mn, line, env);
            if (isUnk(r)) return r;
            if (isBool(r)) return NUM(r.v ? 1 : 0, true);
            if (isNum(r)) return NUM(r.v, true);
            this.err(line, 'TypeError', mn + '() の戻り値（' + typeName(r) + '）は小数として解釈できません', mn + ' は数値を返してください');
          }
        }
      }
      if (isNum(v)) return NUM(v.v, true);
      if (isBool(v)) return NUM(v.v ? 1 : 0, true);
      if (args.length === 0) return NUM(0, true);
      if (typeof v === 'string') { const t = normDigits(v.trim()); if (!usOkFloat(t)) this.err(line, 'ValueError', '文字列「' + v + '」は小数に変換できません', ''); const tu = t.replace(/_/g, ''); const sp = /^([+-]?)(inf|infinity|nan)$/i.exec(tu); if (sp) return NUM(/nan/i.test(sp[2]) ? NaN : (sp[1] === '-' ? -Infinity : Infinity), true); if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(tu)) return NUM(parseFloat(tu), true); this.err(line, 'ValueError', '文字列「' + v + '」は小数に変換できません', ''); }
      this.err(line, 'TypeError', typeName(v) + ' は float() で変換できません', '');
      return UNK();
    }
    case 'bool': { if (!args.length) return BOOL(false); const t = this.truthyOf(args[0], line, env); return t === null ? UNK() : BOOL(t); }
    case 'list': case 'tuple': case 'set': {
      if (args.length === 0) return name === 'list' ? LIST() : name === 'tuple' ? TUPLE() : SET();
      const seq = this.iterable(args[0], line, true);
      if (seq === null) { if (isUnk(args[0]) || isSet(args[0])) return UNK(); this.err(line, 'TypeError', typeName(args[0]) + ' は ' + name + '() で変換できません', ''); }
      if (name === 'list') return LIST(seq);
      if (name === 'tuple') return TUPLE(seq);
      const out = []; for (const x of seq) { this.needHash(x, line); if (!out.some(y => eqVal(x, y) === true)) out.push(x); }
      return SET(out);
    }
    case 'dict': {
      const d = DICT();
      if (args.length) {
        if (isUnk(args[0])) return UNK();
        if (isDict(args[0])) { for (const [id, e] of args[0].__dict) d.__dict.set(id, e); }
        else {
          const seq = this.iterable(args[0], line, true); if (seq === null) { if (isSet(args[0])) return UNK(); this.err(line, 'TypeError', typeName(args[0]) + ' から dict() は作れません', ''); }
          for (const p of seq) { const kv = isList(p) ? p.__list : isTuple(p) ? p.__tuple : null; if (!kv || kv.length !== 2) this.err(line, 'ValueError', 'dict() には (キー, 値) の組の並びを渡してください', ''); if (isUnk(kv[0])) return UNK(); this.needHash(kv[0], line); dictSet(d, kv[0], kv[1]); }
        }
      }
      for (const k of Object.keys(kw)) dictSet(d, k, kw[k]);
      return d;
    }
    case 'sum': {
      if (args.length > 1 && kw.start !== undefined) this.err(line, 'TypeError', 'sum() の引数「start」に値が2つ渡されています', '');
      const seq = this.iterable(args[0], line); if (seq === null) return UNK();
      let acc = args.length > 1 ? args[1] : kw.start !== undefined ? kw.start : NUM(0, false);
      if (seq.some(isUnk) || isUnk(acc)) return UNK();
      if (typeof acc === 'string') this.err(line, 'TypeError', 'sum() で文字列は連結できません', '文字列の連結には \'\'.join(...) を使ってください');
      const allNum = [acc, ...seq].every(x => isNum(x) || isBool(x));
      if (allNum && [acc, ...seq].some(x => isNum(x) && x.f)) { // Python 3.12 の sum は小数を補償加算する
        // ただし非有限な値が絡む場合は補償項が NaN 化して壊れるため、
        // 実 CPython と同様に通常の左から順の加算へ切り替える（R7-139：
        // sum([inf]) は inf、sum([1e308, 1e308]) は inf が正しい）。
        const vals = [acc, ...seq].map(x => isBool(x) ? (x.v ? 1 : 0) : x.v);
        let sm = 0, cmp = 0, nonFinite = false;
        for (const v of vals) { if (!Number.isFinite(v)) nonFinite = true; const t = sm + v; if (!Number.isFinite(t)) nonFinite = true; if (Math.abs(sm) >= Math.abs(v)) cmp += (sm - t) + v; else cmp += (v - t) + sm; sm = t; }
        if (nonFinite) { let naive = 0; for (const v of vals) naive += v; return NUM(naive, true); }
        return NUM(sm + cmp, true);
      }
      for (const x of seq) acc = this.binOp('+', acc, x, line);
      return acc;
    }
    case 'min': case 'max': {
      if (!args.length) this.err(line, 'TypeError', name + '() には少なくとも1つの引数が必要です', '');
      if (args.length > 1 && kw.default !== undefined) this.err(line, 'TypeError', name + '() に複数の位置引数があるときは default は指定できません（Cannot specify a default for ' + name + '() with multiple positional arguments）', 'default は、1つのイテラブルを渡す形でのみ使えます');
      let items = args.length === 1 ? this.iterable(args[0], line) : args;
      if (items === null) return UNK();
      if (!items.length) { if (kw.default !== undefined) return kw.default; this.err(line, 'ValueError', name + '() に空の集まりを渡すことはできません', '要素が1つ以上あるときに使ってください'); }
      const keys = this.keyed(items, kw.key && !isNone(kw.key) ? kw.key : null, env, line); if (keys === null) return UNK();
      let bi = 0;
      for (let i = 1; i < items.length; i++) { const c = this.compare(name === 'min' ? '<' : '>', keys[i], keys[bi], line); if (isUnk(c)) return UNK(); if (c.v) bi = i; }
      return items[bi];
    }
    case 'abs': { const v = args[0]; if (isUnk(v)) return UNK(); if (isBool(v)) return NUM(v.v ? 1 : 0, false); if (isNum(v)) return NUM(Math.abs(v.v), v.f); if (isComplex(v)) return NUM(Math.hypot(v.__complex.re, v.__complex.im), true); if (v && v.__instance && this.specialLookup(v, '__abs__') !== undefined) return this.callSpecial(v, '__abs__', line, env); if (v && v.__native) { const d = nativeClassDef(v.__native); if (d && d.unary) { const r = d.unary(this.stdlibCtx(env, line), v, 'abs'); if (r !== STDLIB_NOT_HANDLED && r !== undefined) return r; } } this.err(line, 'TypeError', typeName(v) + ' には abs() は使えません', '数値に使ってください'); return UNK(); } // B6-Py3：__abs__ を発火／B6 統合：複素数は絶対値（hypot）を返す
    case 'round': {
      let v = args[0]; if (isUnk(v)) return UNK();
      const ndRaw = args.length > 1 ? args[1] : kw.ndigits;
      // B7 統合時の基盤修正 F-G：ネイティブ値の round() は def.round へ委譲する。
      if (v && v.__native) { const d = nativeClassDef(v.__native); if (d && d.round) { const r = d.round(this.stdlibCtx(env, line), v, ndRaw); if (r !== STDLIB_NOT_HANDLED && r !== undefined) return r; } this.err(line, 'TypeError', typeName(v) + ' には round() は使えません', ''); }
      // B6-Py3：__round__ を発火する
      if (v && v.__instance && this.specialLookup(v, '__round__') !== undefined) {
        if (ndRaw === undefined || isNone(ndRaw)) return this.callSpecial(v, '__round__', line, env);
        return this.callSpecialArgs(v, '__round__', [ndRaw], line, env);
      }
      // bool は int のサブクラスとして 0／1 で扱い、ndigits の検証も含めて
      // 通常の数値と同じ経路で処理する（R7-138：round(True, -1) は 0、
      // round(False, "bad") は TypeError、round(1, True) は 1 が実物）。
      if (isBool(v)) v = NUM(v.v ? 1 : 0, false);
      if (!isNum(v)) this.err(line, 'TypeError', 'round() は数値に使います', '');
      if (ndRaw !== undefined && !isNone(ndRaw)) {
        if (isUnk(ndRaw)) return UNK();
        const nd = isBool(ndRaw) ? NUM(ndRaw.v ? 1 : 0, false) : ndRaw;
        if (!isNum(nd) || nd.f) this.err(line, 'TypeError', 'round() の2つ目（桁数）には整数を使ってください', '');
        const p = nd.v;
        // RG-82（R21-N13）: 負の ndigits も CPython で定義された決定的な丸め
        // （10 の冪の位への偶数丸め）。未知化せず正確な10進値で計算する。
        if (!v.f) {
          if (p >= 0) return v;
          const body = decRoundPlace(Math.abs(v.v), p);
          if (body === '0') return NUM(0, false);
          const n = Number(body);
          return Number.isSafeInteger(n) ? NUM(v.v < 0 ? -n : n, false) : BIG();
        }
        if (!Number.isFinite(v.v)) return v;
        if (p > 30) return UNK('round の結果');
        if (p < 0) return NUM(parseFloat((v.v < 0 || Object.is(v.v, -0) ? '-' : '') + decRoundPlace(Math.abs(v.v), p)), true);
        return NUM(parseFloat(decFixed(v.v, p)), true); // 2進数の正確な値を偶数丸め（round(2.675, 2) は 2.67）
      }
      if (!v.f) return v;
      if (Number.isFinite(v.v) && Math.abs(v.v) >= 2 ** 53) return BIG(); // とても大きな小数はすでに整数値（桁数が多く正確には示さない）
      if (!Number.isFinite(v.v)) this.err(line, Number.isNaN(v.v) ? 'ValueError' : 'OverflowError', '無限大や NaN は整数に丸められません', '');
      const n = parseInt(decFixed(v.v, 0), 10); // 偶数丸め（round(2.5) は 2）
      return SAFE(n) ? NUM(n === 0 ? 0 : n, false) : BIG();
    }
    case 'sorted': {
      const seq = this.iterable(args[0], line); if (seq === null) return UNK();
      const rev = kw.reverse !== undefined && this.truthyOf(kw.reverse, line, env) === true;
      const keys = this.keyed(seq, kw.key && !isNone(kw.key) ? kw.key : null, env, line); if (keys === null) return UNK();
      const idx = seq.map((_, i) => i);
      idx.sort((a, b) => { const c = this.cmpVals(keys[a], keys[b], line); return (rev ? -c : c) || a - b; });
      return LIST(idx.map(i => seq[i]));
    }
    case 'reversed': {
      // R30F01B-N2（バッチ9 N27）：reversed() が受理するのは __reversed__ を
      // 持つもの／__len__＋__getitem__ のシーケンスプロトコルを持つものだけ
      // （docs.python.org 3.12「reversed()」、実 CPython 3.12.3 で機械突合）。
      // 集合・イテレータ・ジェネレータ・map／filter／zip／enumerate の結果は
      // TypeError。従来は iterable() で任意のイテラブルを実体化して反転し、
      // 集合等の逆順を捏造していた。
      const v = args[0];
      if (isUnk(v)) return UNK();
      const notRev = () => this.err(line, 'TypeError', typeName(v) + ' は reversed() で逆順にできません（\'' + typeName(v) + '\' object is not reversible）', 'reversed() が使えるのはリスト・タプル・文字列・range・辞書など順序のある並びだけです');
      if (isIter(v)) notRev();
      if (isSet(v)) notRev();
      if (isList(v) || isTuple(v) || typeof v === 'string' || isDict(v) || isView(v) || (v && v.__range)) {
        const seq = this.iterable(v, line); if (seq === null) return UNK(); return ITER(seq.slice().reverse(), 'reversed');
      }
      if (v && v.__instance) {
        if (this.specialLookup(v, '__reversed__') !== undefined) {
          const r = this.callSpecial(v, '__reversed__', line, env);
          if (r === undefined || isUnk(r)) return UNK();
          if (isIter(r)) return r;
          const seq = this.iterable(r, line, true); if (seq === null) return UNK(); return ITER(seq, 'reversed');
        }
        if (this.specialLookup(v, '__len__') !== undefined && this.specialLookup(v, '__getitem__') !== undefined) {
          const lr = this.lenOfInstance(v, line, env);
          if (lr === null || !lr.known) return UNK();
          if (lr.len > 10000) return UNK('reversed の結果');
          const gm = this.specialLookup(v, '__getitem__');
          const items = [];
          for (let i = 0; i < lr.len; i++) items.push(this.callFn(gm, [v, NUM(i, false)], env, line));
          return ITER(items.reverse(), 'reversed');
        }
        notRev();
      }
      notRev();
      return UNK();
    }
    case 'enumerate': {
      if (args.length > 1 && kw.start !== undefined) this.err(line, 'TypeError', 'enumerate() の引数「start」に値が2つ渡されています', '');
      const sv = args.length > 1 ? args[1] : kw.start;
      let start = 0;
      if (sv !== undefined) {
        if (isUnk(sv)) return UNK();
        // start は __index__ 契約で解釈する（R7-137：True は 1、小数・文字列は TypeError）
        const si = this.indexInt(sv, line, 'enumerate() の start');
        if (si === null) return UNK();
        start = si;
      }
      const p = this.srcPull(args[0], line); if (p === null) return UNK();
      const it = ITER([], 'enumerate');
      it.sources = isIter(args[0]) ? [args[0]] : [];
      let n = start;
      it.pull = () => { const x = p(); if (x === EXH) return EXH; return TUPLE([NUM(n++, false), x]); };
      return it;
    }
    case 'zip': {
      // CPython の zip は遅延評価：消費のたびに各供給元から1つずつ取る。
      // strict の長さ検査も消費の進行に合わせて行うため、長さが違う組でも
      // 揃っている間は要素を返せる（R7-136）。
      const pulls = [], srcs = [];
      for (const a of args) { const p = this.srcPull(a, line); if (p === null) return UNK(); pulls.push(p); if (isIter(a)) srcs.push(a); }
      const strict = kw.strict !== undefined && this.truthyOf(kw.strict, line, env) === true;
      const it = ITER([], 'zip');
      it.sources = srcs;
      it.pull = () => {
        if (!pulls.length) return EXH;
        const row = [];
        for (let i = 0; i < pulls.length; i++) {
          const r = pulls[i]();
          if (r === EXH) {
            if (!strict) return EXH;
            if (row.length) this.err(line, 'ValueError', 'zip(..., strict=True) では、並びの長さが揃っていないとエラーになります', '');
            for (let j = i + 1; j < pulls.length; j++) if (pulls[j]() !== EXH) this.err(line, 'ValueError', 'zip(..., strict=True) では、並びの長さが揃っていないとエラーになります', '');
            return EXH;
          }
          row.push(r);
        }
        return TUPLE(row);
      };
      return it;
    }
    case 'type': {
      // R30F01B-N4（バッチ9 N29）：type() には1引数形（型の取得）と3引数形
      // （クラスの生成）の2つの正当な形がある（docs.python.org 3.12「type()」、
      // 実 CPython 3.12.3 で機械突合）。従来は ARITY が [1,1] 固定で、3引数形が
      // 「1個必要ですが3個渡しています」という虚偽原因で停止していた。
      if (args.length === 2) this.err(line, 'TypeError', 'type() の引数は1個（型の取得）か3個（クラスの生成）で渡してください（2個では呼び出せません）', 'type(値) か type(名前, 継承元のタプル, 属性の辞書) の形で使ってください');
      if (args.length === 3) {
        const [nm, bs, ns] = args;
        if (isUnk(nm) || isUnk(bs) || isUnk(ns)) return UNK('type() が作る型');
        if (typeof nm !== 'string') this.err(line, 'TypeError', 'type() の1つ目（クラス名）は文字列にしてください（type.__new__() argument 1 must be str）', '');
        if (!isTuple(bs)) this.err(line, 'TypeError', 'type() の2つ目（継承元）はタプルにしてください（type.__new__() argument 2 must be tuple）', '継承元が無いときは () を渡してください');
        if (!isDict(ns)) this.err(line, 'TypeError', 'type() の3つ目（属性）は辞書にしてください（type.__new__() argument 3 must be dict）', '');
        const bases = []; const baseTypeNames = [];
        for (const b of bs.__tuple) {
          if (isUnk(b)) return UNK('type() が作る型');
          if (b && b.__class) { bases.push(b); continue; }
          if (b && b.__type) { baseTypeNames.push(b.__type); continue; }
          if (b && b.__builtin && (TYPE_BUILTINS.includes(b.__builtin) || EXC_NAMES.has(b.__builtin))) { baseTypeNames.push(b.__builtin); continue; }
          // A6監査PYF-04：class 文側と同じく __mro_entries__ を名指しする
          if (b && b.__instance && this.specialLookup(b, '__mro_entries__') !== undefined)
            this.err(line, '未対応', 'object.__mro_entries__（基底クラスの差し替え）はこの説明では対応していません', '');
          // 高度A7班是正：クラス文側と同じく、標準ライブラリのクラスは
          // 型であるため未対応を名指しで止める（虚偽の理由にしない）。
          if (b && b.__ncls) this.err(line, '未対応', '標準ライブラリのクラス「' + b.__ncls + '」を基底にする継承はこの説明では対応していません', '組み込み型や自分で定義したクラスを基底にしてください');
          this.err(line, 'TypeError', 'type() の継承元には型だけを書いてください（bases must be types）', '');
        }
        // class 文と同じ形のクラス値（__class／cname／cenv）を作り、属性辞書の
        // 文字列キーをクラス属性として cenv へ入れる。これにより生成・属性
        // アクセス・メソッド呼び出し・特殊メソッド参照が既存のクラス機構
        // （instantiate／classLookup／isinstance の継承辿り）とそのまま連携する。
        // 文字列でないキーは実 CPython でも属性にならないため取り込まない。
        const classEnv = new Env(env);
        for (const e of ns.__dict.values()) { if (typeof e.k === 'string') classEnv.vars.set(e.k, e.v); }
        const cls = { __class: true, cname: nm, cenv: classEnv, bases, baseTypeNames };
        this.step(line, 'type() でクラス「' + nm + '」を作ります');
        return cls;
      }
      if (isUnk(args[0])) return UNK('型は実行時に決まります');
      // インスタンスについては TYPEVAL（名前だけの型値）ではなく実クラスを
      // 返す。これにより type(x) == クラス／type(x) is クラス が実物どおり
      // 成立し、isinstance の第2引数にもそのまま使える。
      if (args[0] && args[0].__instance) return args[0].cls;
      if (args[0] && args[0].__native) return makeNativeClass(args[0].__native);
      return TYPEVAL(typeName(args[0]));
    }
    case 'isinstance': {
      // 第2引数（型・型のタプル・合併型）を CPython どおり照合する（PY-04）。
      // タプルは先頭から評価され、一致した時点で True、型でない要素に行き当たれば TypeError。
      // 従来はタプルや不正な第2引数をすべて「実行時に決まる値」にしていた。
      const r = this.isinstanceCheck(args[0], args[1], line);
      return r === null ? UNK() : BOOL(r);
    }
    case 'ord': { const v = args[0]; if (isUnk(v)) return UNK(); if (typeof v === 'string' && Array.from(v).length === 1) return NUM(v.codePointAt(0), false); this.err(line, 'TypeError', 'ord() は1文字の文字列に使います', ''); return UNK(); }
    case 'chr': { const v = args[0]; if (isUnk(v)) return UNK(); const n = this.intIndex(v, line, 'chr() の引数'); if (!(n >= 0 && n <= 0x10FFFF)) this.err(line, 'ValueError', 'chr() の引数は 0〜1114111（0x10FFFF）の範囲にしてください', ''); return String.fromCodePoint(n); }
    case 'divmod': { const a = args[0], b = args[1]; if (isUnk(a) || isUnk(b)) return UNK(); // B6-Py3：__divmod__／__rdivmod__ を発火
      if (a && a.__instance && this.specialLookup(a, '__divmod__') !== undefined) return this.callSpecialArgs(a, '__divmod__', [b], line, env);
      if (b && b.__instance && this.specialLookup(b, '__rdivmod__') !== undefined) return this.callSpecialArgs(b, '__rdivmod__', [a], line, env); if ((a && a.__native) || (b && b.__native)) return TUPLE([this.binOp('//', a, b, line), this.binOp('%', a, b, line)]);
      if (!(isNum(a) || isBool(a)) || !(isNum(b) || isBool(b))) this.err(line, 'TypeError', 'divmod() には数値を渡してください', ''); if ((isBool(b) ? (b.v ? 1 : 0) : b.v) === 0) this.err(line, 'ZeroDivisionError', '0 で割ることはできません', ''); return TUPLE([this.binOp('//', a, b, line), this.binOp('%', a, b, line)]); }
    case 'pow': {
      if (args.length === 3) {
        const [b, e, m] = args;
        if (isUnk(b) || isUnk(e) || isUnk(m)) return UNK();
        const bad = x => !(isBool(x) || (isNum(x) && !x.f));
        if (bad(b) || bad(e) || bad(m)) this.err(line, 'TypeError', 'pow() に3つ目（割る数）を渡すときは、3つとも整数にしてください', '');
        const bv = isBool(b) ? (b.v ? 1 : 0) : b.v, ev = isBool(e) ? (e.v ? 1 : 0) : e.v, mv = isBool(m) ? (m.v ? 1 : 0) : m.v;
        if (!SAFE(bv) || !SAFE(ev) || !SAFE(mv)) return UNK('pow の結果');
        if (mv === 0) this.err(line, 'ValueError', 'pow() の3つ目（割る数）を 0 にはできません', '');
        const r = modPowBig(BigInt(bv), BigInt(ev), BigInt(mv));
        if (r.err) this.err(line, 'ValueError', 'pow() の底と割る数が互いに素でないため、負の指数の逆数が求められません', '');
        return SAFE(Number(r.v)) ? NUM(Number(r.v), false) : BIG();
      }
      return this.binOp('**', args[0], args[1], line);
    }
    case 'any': case 'all': {
      const v0 = args[0];
      // 未確定な要素が残っているのに決定的な要素が無い場合は、結果も
      // 未確定に倒す（R7-135：未知要素を既知扱いにして分岐を落とさない）。
      // 決定的な要素（any なら真、all なら偽）があれば、その時点で確定する。
      if (isIter(v0)) { // イテレータは途中まで消費して短絡する（CPython と同じ消費位置になる）
        let sawUnk = false;
        for (;;) {
          const x = this.iterPull(v0);
          if (this.iterFailed(v0)) return UNK();
          if (x === EXH) break;
          const t = this.truthyOf(x, line, env);
          if (t === null) { sawUnk = true; continue; }
          if (name === 'any' && t) return BOOL(true);
          if (name === 'all' && !t) return BOOL(false);
        }
        return sawUnk ? UNK() : BOOL(name === 'all');
      }
      const seq = this.iterable(args[0], line); if (seq === null) return UNK();
      let sawUnk = false; // 空なら any=False / all=True で確定（未確定要素が無いため）
      for (const x of seq) { const t = this.truthyOf(x, line, env); if (t === null) { sawUnk = true; continue; } if (name === 'any' && t) return BOOL(true); if (name === 'all' && !t) return BOOL(false); }
      return sawUnk ? UNK() : BOOL(name === 'all');
    }
    case 'ascii': { // repr の結果のうち非 ASCII 文字を \xXX／\uXXXX／\UXXXXXXXX に置換する（CPython の規則）
      const v = args[0]; if (isUnk(v) || isIter(v)) return UNK();
      const r = reprVal(v); let out = '';
      for (const ch of r) { const cp = ch.codePointAt(0); if (cp < 128) { out += ch; continue; } if (cp <= 0xff) out += '\\x' + cp.toString(16).padStart(2, '0'); else if (cp <= 0xffff) out += '\\u' + cp.toString(16).padStart(4, '0'); else out += '\\U' + cp.toString(16).padStart(8, '0'); }
      return out;
    }
    case 'id': return UNK('オブジェクトの識別値（id）'); // id はアドレス依存で実行ごとに変わるため決めない
    case 'callable': {
      const v = args[0]; if (isUnk(v)) return UNK();
      if (isFunc(v) || isMethodRef(v)) return BOOL(true);
      if (v && (v.__builtin || v.__type || v.__class || v.__bound)) return BOOL(true);
      if (v && v.__instance) return BOOL(this.specialLookup(v, '__call__') !== undefined);
      return BOOL(false);
    }
    case 'hash': return this.pyHash(args[0], line);
    case 'getattr': {
      const o = args[0], nm = args[1];
      if (isUnk(nm)) return UNK();
      if (typeof nm !== 'string') this.err(line, 'TypeError', '属性の名前は文字列にしてください（attribute name must be string）', '');
      if (isUnk(o)) return UNK();
      const r = this.pyGetAttr(o, nm, env, line);
      if (r.unknown) return UNK();
      if (r.found) return r.value;
      if (args.length > 2) return args[2];
      this.err(line, 'AttributeError', typeName(o) + ' には属性「' + nm + '」がありません', 'hasattr() で有無を確かめるか、getattr(対象, 名前, 既定値) の形で既定値を渡してください');
      return UNK();
    }
    case 'hasattr': {
      const o = args[0], nm = args[1];
      if (isUnk(nm)) return UNK();
      if (typeof nm !== 'string') this.err(line, 'TypeError', '属性の名前は文字列にしてください（attribute name must be string）', '');
      if (isUnk(o)) return UNK();
      const r = this.pyGetAttr(o, nm, env, line);
      if (r.unknown) return UNK();
      return BOOL(!!r.found);
    }
    case 'setattr': {
      const o = args[0], nm = args[1];
      if (isUnk(nm)) return UNK();
      if (typeof nm !== 'string') this.err(line, 'TypeError', '属性の名前は文字列にしてください（attribute name must be string）', '');
      if (isUnk(o)) return UNK();
      this.pySetAttr(o, nm, args[2], line);
      return NONE;
    }
    case 'delattr': {
      const o = args[0], nm = args[1];
      if (isUnk(nm)) return UNK();
      if (typeof nm !== 'string') this.err(line, 'TypeError', '属性の名前は文字列にしてください（attribute name must be string）', '');
      if (isUnk(o)) return UNK();
      this.pyDelAttr(o, nm, line);
      return NONE;
    }
    case 'dir': {
      if (!args.length) { const names = []; for (const [k, v] of env.vars) if (v !== UNBOUND) names.push(k); names.sort(); return LIST(names); }
      const o = args[0]; if (isUnk(o)) return UNK();
      return this.dirOf(o, env, line);
    }
    case 'globals': return this.envDict(this.globals);
    case 'locals': return this.envDict(env);
    case 'vars': {
      if (!args.length) return this.envDict(env);
      const o = args[0]; if (isUnk(o)) return UNK();
      if (o && o.__instance) { const d = DICT(); for (const [k, v] of o.attrs) dictSet(d, k, v); return d; }
      if (o && o.__class) { const d = DICT(); for (const [k, v] of o.cenv.vars) dictSet(d, k, v); return d; }
      if (isFunc(o)) return DICT(); // 関数の __dict__（このエンジンでは関数への属性付けを追跡しないため空のスナップショット）
      this.err(line, 'TypeError', 'vars() の引数には __dict__ を持つオブジェクトを渡してください（vars() argument must have __dict__ attribute）', '');
      return UNK();
    }
    case 'issubclass': {
      const a = args[0], b = args[1];
      if (isUnk(a) || isUnk(b)) return UNK();
      const src = classInfoOf(a);
      if (!src) this.err(line, 'TypeError', 'issubclass() の1つ目はクラスにしてください（issubclass() arg 1 must be a class）', '1つ目には調べたいクラスそのものを渡してください');
      const targets = [];
      const collect = (t) => {
        if (isUnk(t)) return 'unk';
        if (isTuple(t)) { for (const el of t.__tuple) { const r = collect(el); if (r) return r; } return null; }
        if (t && t.__union) { for (const el of t.__union) { const r = collect(el); if (r) return r; } return null; }
        const ci = classInfoOf(t); if (!ci) return 'bad'; targets.push(ci); return null;
      };
      const bad = collect(b);
      if (bad === 'unk') return UNK();
      if (bad === 'bad') this.err(line, 'TypeError', 'issubclass() の2つ目はクラスか、クラスを要素とするタプルにしてください（issubclass() arg 2 must be a class or tuple of classes）', '');
      return BOOL(targets.some(t => this.issubclassOne(src, t)));
    }
    case 'object': return { __instance: true, __object: true, cls: b6ObjectClass(), attrs: new Map() };
    case 'sentinel': { // PEP 661：名前と表示（repr）を持つ、同一性で比較される一意な値
      const nm = args[0];
      if (isUnk(nm)) return UNK();
      if (typeof nm !== 'string') this.err(line, 'TypeError', 'sentinel() の名前（1つ目）は文字列にしてください', '');
      const rep = args.length > 1 ? args[1] : kw.repr;
      if (rep !== undefined && isUnk(rep)) return UNK();
      if (rep !== undefined && !isNone(rep) && typeof rep !== 'string') this.err(line, 'TypeError', 'sentinel() の repr は文字列か None にしてください', '');
      const mod = kw.module;
      if (mod !== undefined && isUnk(mod)) return UNK();
      if (mod !== undefined && !isNone(mod) && typeof mod !== 'string') this.err(line, 'TypeError', 'sentinel() の module は文字列か None にしてください', '');
      const srepr = (rep === undefined || isNone(rep)) ? nm : rep;
      const smod = (mod === undefined || isNone(mod)) ? '__main__' : mod; // 呼び出し側モジュールの __name__ はこのエンジンでは '__main__' とみなす
      const attrs = new Map(); attrs.set('__name__', nm); attrs.set('__module__', smod);
      return { __instance: true, __sentinel: true, sname: nm, srepr, cls: b6SentinelClass(), attrs };
    }
    case 'aiter': case 'anext': this.err(line, '未対応', '非同期イテレータ用の「' + name + '」はこの説明では対応していません（非同期機構がありません）', ''); return UNK();
    case 'breakpoint': this.err(line, '未対応', 'breakpoint()（デバッガの起動）はこの説明では対応していません', ''); return UNK();
    case 'compile': case 'eval': case 'exec': this.err(line, '未対応', '動的コード実行の「' + name + '」はこの説明では対応していません（文字列からコードを実行する経路はこのエンジンのモデルと両立しません）', ''); return UNK();
    case 'help': this.err(line, '未対応', 'help()（対話的ヘルプ）はこの説明では対応していません', ''); return UNK();
    case '__import__': this.err(line, '未対応', '__import__()（モジュールの読み込み）はこの説明では対応していません', ''); return UNK();
    /* ===== B6-Py2：bytes／bytearray／complex／frozenset／slice／memoryview／frozendict のコンストラクタ ===== */
    case 'bytes': case 'bytearray': {
      const isBA = name === 'bytearray';
      const wrapB = (a) => isBA ? BYTEARRAY(a) : BYTESV(a);
      const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
      if (args.length === 0) return wrapB([]);
      const src0 = args[0];
      if (isUnk(src0)) return UNK();
      if (!isBA && src0 && src0.__instance && this.specialLookup(src0, '__bytes__') !== undefined) this.err(line, '未対応', 'object.__bytes__（bytes() への変換）はこの説明では対応していません', ''); // B6監査D15：真因を指す停止
      if (args.length >= 2 || kw.encoding !== undefined) {
        if (typeof src0 !== 'string') E('TypeError', 'エンコーディングを指定するときは、' + name + '() に文字列を渡してください', '');
        const enc = resolveEncoding(args[1] !== undefined ? args[1] : kw.encoding, E);
        const errors = checkErrorsMode(args[2] !== undefined ? args[2] : kw.errors, E);
        return wrapB(encodeStrToBytes(src0, enc, errors, E));
      }
      if (typeof src0 === 'string') E('TypeError', '文字列から ' + name + '() を作るときは、エンコーディングの指定が必要です（string argument without an encoding）', name + "('abc', 'utf-8') のように書いてください");
      if (isBool(src0) || (isNum(src0) && !src0.f)) {
        const n = isBool(src0) ? (src0.v ? 1 : 0) : Math.trunc(src0.v);
        if (n < 0) E('ValueError', '負の大きさは指定できません', '');
        if (n > 10000000) return UNK('とても長いバイト列');
        return wrapB(Array(n).fill(0));
      }
      if (isBytesLike(src0)) return wrapB(bytesOf(src0).slice());
      if (isMemview(src0)) { if (src0.__memview.released) E('ValueError', '解放済み（release 済み）の memoryview は使えません', ''); return wrapB(mvBytes(src0)); }
      const seq = this.iterableChecked(src0, line, true);
      if (seq === null) return UNK();
      const out = seq.map(x => { const bv = isBool(x) ? (x.v ? 1 : 0) : isNum(x) && !x.f ? x.v : null; if (bv === null) E('TypeError', name + '() の要素は整数にしてください（' + typeName(x) + ' は使えません）', ''); if (bv < 0 || bv > 255) E('ValueError', name + '() の要素は 0〜255 の整数にしてください', ''); return bv; });
      return wrapB(out);
    }
    case 'complex': {
      const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
      let a = args[0], b = args[1];
      if (kw.real !== undefined) { if (a !== undefined) E('TypeError', 'complex() の引数「real」に値が2つ渡されています', ''); a = kw.real; }
      if (kw.imag !== undefined) { if (b !== undefined) E('TypeError', 'complex() の引数「imag」に値が2つ渡されています', ''); b = kw.imag; }
      if (a === undefined) return CXV(0, 0);
      if (isUnk(a) || (b !== undefined && isUnk(b))) return UNK();
      if (typeof a === 'string') {
        if (b !== undefined) E('TypeError', 'complex() に文字列を渡すときは、2つ目の引数は指定できません', '');
        const pp = parseComplexStr(a, E); return CXV(pp.re, pp.im);
      }
      // A6監査PYF-04：__complex__ を定義したインスタンスは、未対応の
      // object.__complex__ を名指しする（変換できないことが原因ではない）
      if (a && a.__instance && this.specialLookup(a, '__complex__') !== undefined)
        E('未対応', 'object.__complex__（複素数への変換のカスタマイズ）はこの説明では対応していません', '');
      const pa = cxParts(a); if (!pa) E('TypeError', typeName(a) + ' は complex() で変換できません', '');
      if (b === undefined) return CXV(pa.re, pa.im);
      const pb = cxParts(b); if (!pb) E('TypeError', typeName(b) + ' は complex() で変換できません', '');
      return CXV(pa.re - pb.im, pa.im + pb.re);
    }
    case 'frozenset': {
      if (args.length === 0) return FROZENSET();
      if (isUnk(args[0])) return UNK();
      if (isFrozenSet(args[0])) return args[0];
      const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK();
      const out = []; for (const x of seq) { this.needHash(x, line); if (!out.some(y => eqVal(x, y) === true)) out.push(x); }
      return FROZENSET(out);
    }
    case 'slice': {
      if (args.length === 1) return SLICEV(NONE, args[0], NONE);
      if (args.length === 2) return SLICEV(args[0], args[1], NONE);
      return SLICEV(args[0], args[1], args[2]);
    }
    case 'memoryview': {
      const v = args[0];
      if (isUnk(v)) return UNK();
      if (isBytes(v)) return MEMVIEW({ buf: { data: v.__bytes }, off: 0, len: v.__bytes.length, readonly: true, released: false, obj: v });
      if (isBytearray(v)) return MEMVIEW({ buf: { data: v.__bytearray }, off: 0, len: v.__bytearray.length, readonly: false, released: false, obj: v });
      if (isMemview(v)) { if (v.__memview.released) this.err(line, 'ValueError', '解放済み（release 済み）の memoryview は使えません', ''); return MEMVIEW({ buf: v.__memview.buf, off: v.__memview.off, len: v.__memview.len, readonly: v.__memview.readonly, released: false, obj: v.__memview.obj }); }
      // A6監査PYF-04：__buffer__ を定義したインスタンスは、未対応の
      // object.__buffer__ を名指しする（バイト列でないことが原因ではない）
      if (v && v.__instance && this.specialLookup(v, '__buffer__') !== undefined)
        this.err(line, '未対応', 'object.__buffer__（バッファの公開）はこの説明では対応していません', '');
      this.err(line, 'TypeError', 'memoryview() には bytes や bytearray（バイト列）が必要です（memoryview: a bytes-like object is required）', '');
      return UNK();
    }
    case 'frozendict': {
      const d = FROZENDICT();
      if (args.length) {
        if (isUnk(args[0])) return UNK();
        if (isDict(args[0])) { for (const [id, e] of args[0].__dict) d.__dict.set(id, e); }
        else {
          const seq = this.iterable(args[0], line, true); if (seq === null) return UNK();
          for (const pp of seq) { const kv = isList(pp) ? pp.__list : isTuple(pp) ? pp.__tuple : null; if (!kv || kv.length !== 2) this.err(line, 'ValueError', 'frozendict() には (キー, 値) の組の並びを渡してください', ''); if (isUnk(kv[0])) return UNK(); this.needHash(kv[0], line); dictSet(d, kv[0], kv[1]); }
        }
      }
      for (const k of Object.keys(kw)) dictSet(d, k, kw[k]);
      return d;
    }
    // B6-Py3：classmethod／staticmethod／property／super の意味論
    case 'classmethod': {
      const f = args[0];
      if (args.length !== 1) this.err(line, 'TypeError', 'classmethod() には関数を1つ渡してください', '');
      if (isUnk(f)) return UNK('classmethod の結果');
      if (!(isFunc(f) || (f && (f.__builtin || f.__method || f.__bound)))) this.err(line, 'TypeError', 'classmethod() には呼び出せるもの（関数）を渡してください', '');
      return CMVAL(f);
    }
    case 'staticmethod': {
      const f = args[0];
      if (args.length !== 1) this.err(line, 'TypeError', 'staticmethod() には関数を1つ渡してください', '');
      if (isUnk(f)) return UNK('staticmethod の結果');
      if (!(isFunc(f) || (f && (f.__builtin || f.__method || f.__bound || f.__class)))) this.err(line, 'TypeError', 'staticmethod() には呼び出せるものを渡してください', '');
      return SMVAL(f);
    }
    case 'property': {
      if (args.length > 4) this.err(line, 'TypeError', 'property() の引数が多すぎます', '');
      const acc = [0, 1, 2].map((i) => {
        const a = args[i];
        if (a === undefined || isNone(a)) return null;
        if (isUnk(a)) return a;
        if (!(isFunc(a) || (a && (a.__builtin || a.__method || a.__bound)))) this.err(line, 'TypeError', 'property() の getter／setter／deleter には呼び出せるものか None を渡してください', '');
        return a;
      });
      if (acc.some(isUnk)) return UNK('property の結果');
      return PROPVAL(acc[0], acc[1], acc[2]);
    }
    case 'super': {
      if (args.length > 2) this.err(line, 'TypeError', 'super() の引数が多すぎます', '');
      if (args.length === 0) {
        const ctx = this.superCtx;
        if (!ctx || !ctx.cls) this.err(line, 'RuntimeError', 'super(): 引数なしの super() は、メソッドの中（__class__ セルがある場所）でだけ使えます', 'super(クラス, オブジェクト) の形で明示するか、クラスの中で定義したメソッドから使ってください');
        return SUPERVAL(ctx.cls, ctx.obj);
      }
      const t = args[0];
      if (isUnk(t)) return UNK('super の結果');
      if (!(t && t.__class) && !(t && t.__type) && !(t && t.__builtin && TYPE_BUILTINS.includes(t.__builtin)))
        this.err(line, 'TypeError', 'super() の1つ目には型を渡してください（super() argument 1 must be type）', '');
      // 組み込み型に対する super は、ユーザー定義クラスの MRO に現れないため対象外として止める
      if (!(t && t.__class)) this.err(line, '未対応', '組み込み型に対する super() はこの説明では対応していません', 'ユーザー定義クラスに対して使ってください');
      if (args.length === 1) return SUPERVAL(t, null);
      const o = args[1];
      if (isUnk(o)) return UNK('super の結果');
      if (o && o.__instance) {
        if (!classChain(o.cls).includes(t)) this.err(line, 'TypeError', 'super() の2つ目は、1つ目の型のインスタンス（またはサブクラス）でなければなりません', '');
        return SUPERVAL(t, o);
      }
      if (o && o.__class) {
        if (!classChain(o).includes(t) && o !== t) this.err(line, 'TypeError', 'super() の2つ目（クラス）は、1つ目の型のサブクラスでなければなりません', '');
        return SUPERVAL(t, o);
      }
      this.err(line, 'TypeError', 'super() の2つ目は、1つ目の型のインスタンスかサブクラスでなければなりません', '');
      return UNK();
    }
    case 'open': this.diag(line, 'note', '対応外', 'ファイルを開く処理（open）はこの説明では中身を読みません。読み取った内容は「実行時に決まる値」として扱います', ''); return UNK('ファイルの内容');
  }
  this.diag(line, 'note', '対応外', '組み込みの「' + name + '」はこの説明では解釈しません。結果は「実行時に決まる値」として扱います', '');
  return UNK(name + ' の結果');
};
// math モジュールの関数：値が決まり、結果が JavaScript と CPython で同じになるものだけ計算する
Interp.prototype.mathCall = function (name, args, line) {
  if (args.some(isUnk)) return UNK('math.' + name + ' の結果');
  const x = args[0];
  // B6-Py3：math.floor／ceil／trunc は __floor__／__ceil__／__trunc__ を発火する
  if (x && x.__instance && args.length === 1) {
    const mm = { floor: '__floor__', ceil: '__ceil__', trunc: '__trunc__' }[name];
    if (mm && this.specialLookup(x, mm) !== undefined) return this.callSpecial(x, mm, line, null);
  }
  const num = isNum(x) ? x.v : isBool(x) ? (x.v ? 1 : 0) : null;
  if (['sqrt', 'log', 'log2', 'log10', 'floor', 'ceil', 'fabs'].includes(name) && args.length === 1 && num === null) this.err(line, 'TypeError', 'math.' + name + '() には数値を渡してください', '');
  if (num === null || args.length !== 1) return UNK('math.' + name + ' の結果');
  if (name === 'sqrt') { if (num < 0) this.err(line, 'ValueError', '負の数の平方根は求められません（math domain error）', '負になる可能性があるなら、先に条件で確かめてください'); return NUM(Math.sqrt(num), true); }
  if (name === 'log' || name === 'log2' || name === 'log10') { if (num <= 0) this.err(line, 'ValueError', '0 以下の数の対数は求められません（math domain error）', ''); return UNK('math.' + name + ' の結果'); }
  if (name === 'fabs') return NUM(Math.abs(num), true);
  if (name === 'floor' || name === 'ceil') { if (!Number.isFinite(num)) this.err(line, Number.isNaN(num) ? 'ValueError' : 'OverflowError', '無限大や NaN は整数にできません', ''); const r = name === 'floor' ? Math.floor(num) : Math.ceil(num); return SAFE(r) ? NUM(r === 0 ? 0 : r, false) : BIG(); }
  return UNK('math.' + name + ' の結果');
};
Interp.prototype.cmpVals = function (a, b, line) {
  if (isUnk(a) || isUnk(b)) return 0;
  const c = this.compare('<', a, b, line);
  if (isBool(c)) return c.v ? -1 : (eqVal(a, b) === true ? 0 : 1);
  return 0;
};

/* ===== B6-Py2 ヘルパー（encode/decode・bytes/str 共通アルゴリズム・数値変換） ===== */
const ENC_OK = { 'utf-8': 'utf-8', 'utf8': 'utf-8', 'ascii': 'ascii', 'us-ascii': 'ascii', 'latin-1': 'latin-1', 'latin1': 'latin-1', 'iso-8859-1': 'latin-1', 'iso8859-1': 'latin-1' };
const ENC_KNOWN_UNSUPPORTED = new Set(['utf-16', 'utf-16-le', 'utf-16-be', 'utf-32', 'utf-32-le', 'utf-32-be', 'utf-7', 'shift_jis', 'shift-jis', 'sjis', 'cp932', 'euc-jp', 'iso-2022-jp', 'gbk', 'gb2312', 'big5', 'euc-kr', 'cp949', 'koi8-r', 'koi8-u', 'cp1252', 'cp1251', 'iso-8859-2', 'mac-roman', 'utf-8-sig', 'utf-16le', 'utf-16be']);
// エンコーディング名を解決する。対応外は E で停止する（未知の名前は CPython どおり LookupError、既知だが未対応の名前は「未対応」）
function resolveEncoding(name, E) {
  if (typeof name !== 'string') E('TypeError', 'エンコーディング名は文字列にしてください', '');
  const key = name.toLowerCase().replace(/_/g, '-');
  if (ENC_OK[key]) return ENC_OK[key];
  if (ENC_KNOWN_UNSUPPORTED.has(key)) E('未対応', 'エンコーディング「' + name + '」はこの説明では対応していません（対応するのは utf-8／ascii／latin-1 だけです）', 'utf-8／ascii／latin-1 のいずれかで試してください');
  E('LookupError', '未知のエンコーディングです：' + name, 'エンコーディング名を確認してください（対応するのは utf-8／ascii／latin-1 だけです）');
  return 'utf-8';
}
function checkErrorsMode(errors, E) {
  if (errors === undefined || errors === null) return 'strict';
  if (typeof errors !== 'string') E('TypeError', 'errors は文字列にしてください', '');
  if (!['strict', 'ignore', 'replace'].includes(errors)) E('未対応', 'エラー処理「' + errors + '」はこの説明では対応していません（対応するのは strict／ignore／replace だけです）', '');
  return errors;
}
function encodeStrToBytes(s, enc, errors, E) {
  const out = [];
  if (enc === 'utf-8') { const u8 = new TextEncoder().encode(s); for (const b of u8) out.push(b); return out; }
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const lim = enc === 'ascii' ? 0x80 : 0x100;
    if (cp < lim) { out.push(cp); continue; }
    if (errors === 'strict') E('UnicodeEncodeError', "'" + enc + "' コーデックでは文字 " + pyStrRepr(ch) + ' をエンコードできません', '');
    if (errors === 'replace') out.push(0x3f); // '?'
    // ignore は落とす
  }
  return out;
}
function decodeBytesToStr(arr, enc, errors, E) {
  if (enc === 'latin-1') return arr.map(b => String.fromCharCode(b)).join('');
  if (enc === 'ascii') {
    let out = '';
    for (const b of arr) {
      if (b < 0x80) { out += String.fromCharCode(b); continue; }
      if (errors === 'strict') E('UnicodeDecodeError', "'ascii' コーデックではバイト 0x" + b.toString(16) + ' をデコードできません', '');
      if (errors === 'replace') out += '�';
    }
    return out;
  }
  // utf-8（手作業デコード：errors の3モードを正確に再現する）
  let out = ''; let i = 0;
  const bad = () => { if (errors === 'strict') E('UnicodeDecodeError', "'utf-8' コーデックではバイト列をデコードできません（不正な UTF-8 です）", ''); if (errors === 'replace') out += '�'; };
  while (i < arr.length) {
    const b0 = arr[i];
    if (b0 < 0x80) { out += String.fromCharCode(b0); i++; continue; }
    let need = 0, cp = 0, min = 0;
    if (b0 >= 0xc2 && b0 <= 0xdf) { need = 1; cp = b0 & 0x1f; min = 0x80; }
    else if (b0 >= 0xe0 && b0 <= 0xef) { need = 2; cp = b0 & 0x0f; min = 0x800; }
    else if (b0 >= 0xf0 && b0 <= 0xf4) { need = 3; cp = b0 & 0x07; min = 0x10000; }
    else { bad(); i++; continue; }
    let ok = i + need < arr.length;
    if (ok) { for (let k = 1; k <= need; k++) { const bk = arr[i + k]; if (bk < 0x80 || bk > 0xbf) { ok = false; break; } cp = (cp << 6) | (bk & 0x3f); } }
    if (!ok || cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) { bad(); i++; continue; }
    out += String.fromCodePoint(cp); i += need + 1;
  }
  return out;
}
// バイト列の部分列探索（find 系）
function findSub(hay, ndl, start, end) {
  if (ndl.length === 0) return start <= end ? start : -1;
  for (let i = start; i + ndl.length <= end; i++) { let m = true; for (let j = 0; j < ndl.length; j++) if (hay[i + j] !== ndl[j]) { m = false; break; } if (m) return i; }
  return -1;
}
function countSub(hay, ndl, start, end) {
  if (ndl.length === 0) return Math.max(0, end - start) + 1;
  let c = 0, i = start;
  for (;;) { const at = findSub(hay, ndl, i, end); if (at < 0) return c; c++; i = at + ndl.length; }
}
function bytesIsWs(b) { return b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d || b === 0x0b || b === 0x0c; }
function splitBytes(arr, sep, max, fromRight) {
  if (sep === null) {
    const out = [];
    if (!fromRight) {
      let i = 0; const n = arr.length;
      while (true) { while (i < n && bytesIsWs(arr[i])) i++; if (i >= n) break; if (max >= 0 && out.length === max) { out.push(arr.slice(i)); break; } let j = i; while (j < n && !bytesIsWs(arr[j])) j++; out.push(arr.slice(i, j)); i = j; }
      return out;
    }
    let j = arr.length;
    while (true) { while (j > 0 && bytesIsWs(arr[j - 1])) j--; if (j <= 0) break; if (max >= 0 && out.length === max) { out.unshift(arr.slice(0, j)); break; } let i = j; while (i > 0 && !bytesIsWs(arr[i - 1])) i--; out.unshift(arr.slice(i, j)); j = i; }
    return out;
  }
  const parts = []; let i = 0;
  for (;;) { const at = findSub(arr, sep, i, arr.length); if (at < 0) { parts.push(arr.slice(i)); break; } parts.push(arr.slice(i, at)); i = at + sep.length; }
  if (max < 0 || parts.length <= max + 1) return parts;
  if (!fromRight) { const head = parts.slice(0, max); const rest = []; parts.slice(max).forEach((pt, k) => { if (k) rest.push(...sep); rest.push(...pt); }); return head.concat([rest]); }
  const tail = parts.slice(parts.length - max); const rest = []; parts.slice(0, parts.length - max).forEach((pt, k) => { if (k) rest.push(...sep); rest.push(...pt); }); return [rest].concat(tail);
}
const STR_LINE_BOUNDS = new Set(['\n', '\r', '\v', '\f', '\x1c', '\x1d', '\x1e', '\x85', '\u2028', '\u2029']);
function splitLinesStr(s, keepends) {
  const a = Array.from(s); const out = []; let cur = '';
  for (let i = 0; i < a.length; i++) {
    const ch = a[i];
    if (STR_LINE_BOUNDS.has(ch)) {
      let term = ch;
      if (ch === '\r' && a[i + 1] === '\n') { term = '\r\n'; i++; }
      out.push(keepends ? cur + term : cur); cur = ''; continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const BYTES_LINE_BOUNDS = new Set([0x0a, 0x0d, 0x0b, 0x0c, 0x1c, 0x1d, 0x1e, 0x85]);
function splitLinesBytes(arr, keepends) {
  const out = []; let cur = [];
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (BYTES_LINE_BOUNDS.has(b)) {
      let term = [b];
      if (b === 0x0d && arr[i + 1] === 0x0a) { term = [0x0d, 0x0a]; i++; }
      out.push(keepends ? cur.concat(term) : cur); cur = []; continue;
    }
    cur.push(b);
  }
  if (cur.length) out.push(cur);
  return out;
}
function expandTabsStr(s, tabsize) {
  let out = '', col = 0;
  for (const ch of s) {
    if (ch === '\t') { const n = tabsize <= 0 ? 0 : tabsize - (col % tabsize); out += ' '.repeat(n); col += n; }
    else if (ch === '\n' || ch === '\r') { out += ch; col = 0; }
    else { out += ch; col++; }
  }
  return out;
}
function expandTabsBytes(arr, tabsize) {
  const out = []; let col = 0;
  for (const b of arr) {
    if (b === 0x09) { const n = tabsize <= 0 ? 0 : tabsize - (col % tabsize); for (let k = 0; k < n; k++) out.push(0x20); col += n; }
    else if (b === 0x0a || b === 0x0d) { out.push(b); col = 0; }
    else { out.push(b); col++; }
  }
  return out;
}
function hexOfBytes(arr, sep, perSep) {
  const hex = arr.map(b => b.toString(16).padStart(2, '0')).join('');
  if (sep === undefined || sep === null) return hex;
  const groupChars = Math.max(1, perSep) * 2;
  const groups = [];
  for (let i = hex.length; i > 0; i -= groupChars) groups.unshift(hex.slice(Math.max(0, i - groupChars), i));
  return groups.join(sep);
}
function parseHexBytes(s, E, what) {
  const t = s.replace(/[\x09-\x0d\x20]/g, '');
  if (t.length % 2) E('ValueError', (what || 'fromhex') + '(): 16進文字列の長さは偶数にしてください', '');
  if (/[^0-9a-fA-F]/.test(t)) E('ValueError', (what || 'fromhex') + '(): 16進数でない文字が含まれています', '');
  const out = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.substr(i, 2), 16));
  return out;
}
// float.hex()（CPython 形式：0x1.8000000000000p+0）
function floatHex(x) {
  if (Number.isNaN(x)) return 'nan';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  const sign = (x < 0 || Object.is(x, -0)) ? '-' : '';
  const ax = Math.abs(x);
  if (ax === 0) return sign + '0x0.0p+0';
  const buf = new DataView(new ArrayBuffer(8)); buf.setFloat64(0, ax);
  const bits = buf.getBigUint64(0);
  const expBits = Number((bits >> 52n) & 0x7ffn);
  const mant = bits & ((1n << 52n) - 1n);
  const frac = mant.toString(16).padStart(13, '0');
  if (expBits === 0) return sign + '0x0.' + frac + 'p-1022';
  return sign + '0x1.' + frac + 'p' + (expBits - 1023 >= 0 ? '+' : '') + (expBits - 1023);
}
function gcdBig(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a; }
// float の正確な有理数比 {n:BigInt, d:BigInt}（d>0）
function floatRatio(x) {
  if (x === 0) return { n: 0n, d: 1n };
  const buf = new DataView(new ArrayBuffer(8)); buf.setFloat64(0, Math.abs(x));
  const bits = buf.getBigUint64(0);
  const expBits = Number((bits >> 52n) & 0x7ffn);
  let mant = bits & ((1n << 52n) - 1n); let e2;
  if (expBits === 0) e2 = -1074; else { mant |= (1n << 52n); e2 = expBits - 1075; }
  let n, d;
  if (e2 >= 0) { n = mant << BigInt(e2); d = 1n; } else { n = mant; d = 1n << BigInt(-e2); }
  const g = gcdBig(n, d); n /= g; d /= g;
  return { n: x < 0 ? -n : n, d };
}
// complex() の文字列解釈（CPython の文法の主要形：実部・虚部・j 接尾辞・括弧・空白）
function parseComplexStr(raw, E) {
  let t = raw.trim();
  if (t.startsWith('(') && t.endsWith(')')) t = t.slice(1, -1).trim();
  const body = t.replace(/\s+/g, '');
  if (!body) E('ValueError', '文字列「' + raw + '」は複素数に変換できません', '');
  const numRe = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
  const spRe = /^[+-]?(inf(inity)?|nan)$/i;
  const isNumTok = (s) => numRe.test(s) || spRe.test(s);
  const toF = (s) => spRe.test(s) ? (/nan/i.test(s) ? NaN : (s.startsWith('-') ? -Infinity : Infinity)) : parseFloat(s);
  if (/[jJ]$/.test(body)) {
    const core = body.slice(0, -1);
    // 実部と虚部の区切り：指数部の符号を除く最後の + / -
    let cut = -1;
    for (let i = core.length - 1; i > 0; i--) { if ((core[i] === '+' || core[i] === '-') && !/[eE]/.test(core[i - 1])) { cut = i; break; } }
    if (cut < 0) { if (!isNumTok(core)) E('ValueError', '文字列「' + raw + '」は複素数に変換できません', ''); return { re: 0, im: toF(core) }; }
    const reS = core.slice(0, cut), imS = core.slice(cut);
    if (!isNumTok(reS) || !isNumTok(imS)) E('ValueError', '文字列「' + raw + '」は複素数に変換できません', '');
    return { re: toF(reS), im: toF(imS) };
  }
  if (!isNumTok(body)) E('ValueError', '文字列「' + raw + '」は複素数に変換できません', '');
  return { re: toF(body), im: 0 };
}

Interp.prototype.callMethod = function (obj, name, args, kwargs, env, line) {
  // 実行時に確定したレシーバ型で修飾した名前も記録する（R7-151：トレースの
  // 参照チップが str.split 等の項目へ解決できるようにするため。短い名前の
  // 記録は従来どおり併せて残る）。
  if (typeof obj === 'string') this.noteCall('str.' + name, 'method');
  else if (isList(obj)) this.noteCall('list.' + name, 'method');
  else if (isDict(obj)) this.noteCall('dict.' + name, 'method');
  else if (isSet(obj)) this.noteCall('set.' + name, 'method');
  else if (isTuple(obj)) this.noteCall('tuple.' + name, 'method');
  else if (obj && obj.__range) this.noteCall('range.' + name, 'method');
  else if (isUnk(obj) && obj.mod) this.noteCall(obj.mod + '.' + name, 'method');
  // B6-Py3：super プロキシ経由のメソッド呼び出し
  if (isSuper(obj)) { const v = this.getAttrSuper(obj, name, line, env); return this.callFn(v, args, env, line); }
  // B6-Py3：object.__new__／__getattribute__／__setattr__ の組み込み相当
  if (obj && (obj.__builtin === 'object' || obj.__type === 'object')) {
    if (name === '__new__') { const t = args[0]; return (t && t.__class) ? { __instance: true, cls: t, attrs: new Map() } : UNK(); }
    if (name === '__getattribute__') { const o = args[0]; if (o && o.__instance) { this._gaBypass = (this._gaBypass || 0) + 1; try { return this.getAttrInstance(o, args[1], line, env); } finally { this._gaBypass--; } } return UNK(); }
    if (name === '__setattr__') { const o = args[0]; if (o && o.__instance) { this._saBypass = (this._saBypass || 0) + 1; try { this.setAttrInstance(o, args[1], args[2], line, env); } finally { this._saBypass--; } } return NONE; }
  }
  if (obj && (obj.__instance || obj.__class)) {
    const cls = obj.__instance ? obj.cls : obj;
    const own = obj.__instance && obj.attrs.has(name);
    const hitPre = own ? classLookupOwner(cls, name) : null;
    if (!own || (hitPre && this.isDataDesc(hitPre.value))) {
      // B6-Py3：classmethod／staticmethod／property／ディスクリプタ／
      // type.mro の発火（クラス側に置かれた値の規則）
      const hit = classLookupOwner(cls, name);
      if (hit) {
        const raw = hit.value;
        if (isCM(raw)) return this.withSuperCtx(hit.owner, obj, () => this.callUserFunc(raw.fn, [cls, ...args], kwargs, env, line));
        if (isSM(raw)) return this.callUserFunc(raw.fn, args, kwargs, env, line);
        if (isProp(raw)) {
          if (!obj.__instance) return this.callFn(raw, args, env, line);
          if (!raw.fget) this.err(line, 'AttributeError', 'この property には getter がありません（unreadable attribute）', '');
          const got = this.callFn(raw.fget, [obj], env, line);
          return this.callFn(got, args, env, line);
        }
        if (raw && raw.__instance && this.specialLookup(raw, '__get__') !== undefined) {
          const got = this.bindClassAttr(cls, hit, obj.__instance ? obj : null, line, env);
          return this.callFn(got, args, env, line);
        }
        if (isFunc(raw)) {
          if (obj.__instance) return this.withSuperCtx(hit.owner, obj, () => this.callUserFunc(raw, [obj, ...args], kwargs, env, line));
          return this.callUserFunc(raw, args, kwargs, env, line);
        }
        return this.callFn(raw, args, env, line);
      }
      if (name === 'mro') return LIST(mroAllOf(cls));
    }
    const method = own ? obj.attrs.get(name) : classLookup(cls, name);
    if (isFunc(method)) return this.callUserFunc(method, obj.__instance && !own ? [obj, ...args] : args, kwargs, env, line);
    if (method === undefined) this.err(line, 'AttributeError', '属性がありません：' + name, '');
    return this.callFn(method, args, env, line);
  }
  if (isUnk(obj) && obj.mod && isStdlibModule(obj.mod)) return this.stdlibModuleCall(obj.mod, name, args, kwargs, env, line);
  if (obj && obj.__native) return this.stdlibNativeCall(obj, name, args, kwargs, env, line);
  if (obj && obj.__ncls) return this.stdlibClassCall(obj, name, args, kwargs, env, line);
  if (isUnk(obj) && obj.mod === 'math') { const mk = Object.keys(kwargs || {}); if (mk.length) this.err(line, 'TypeError', 'math.' + name + '() にキーワード引数「' + mk[0] + '」はありません', 'キーワード引数「' + mk[0] + '」は math.' + name + '() では使えません'); return this.mathCall(name, args, line); }
  if (isUnk(obj)) return UNK();
  if (isNone(obj)) this.err(line, 'AttributeError', 'None にはメソッド「' + name + '」がありません（値が None になっていないか確認してください）', 'return を書き忘れた関数の戻り値などで None になっていないか確認してください');
  const arityErr = (need) => this.err(line, 'TypeError', 'メソッド「' + name + '」の引数の数が合いません（' + need + '）', 'リファレンスで使い方を確認してください');
  // RG-15：組み込み型メソッドのキーワード引数を無言で無視しない（dict.get 等は位置専用で実 Python は TypeError）
  { const kwKeys = Object.keys(kwargs || {});
    if (kwKeys.length) {
      const STR_KNOWN = ['upper', 'lower', 'title', 'capitalize', 'strip', 'lstrip', 'rstrip', 'split', 'rsplit', 'join', 'replace', 'find', 'index', 'rfind', 'rindex', 'count', 'startswith', 'endswith', 'isdigit', 'isdecimal', 'isnumeric', 'isalpha', 'isalnum', 'isspace', 'isascii', 'isidentifier', 'islower', 'isupper'];
      const LIST_KNOWN = ['append', 'extend', 'insert', 'pop', 'remove', 'index', 'count', 'sort', 'reverse', 'copy', 'clear'];
      const DICT_KNOWN = ['get', 'keys', 'values', 'items', 'update', 'pop', 'setdefault', 'popitem', 'copy', 'clear'];
      const SET_KNOWN = ['add', 'remove', 'discard', 'update', 'clear', 'pop', 'intersection_update', 'difference_update', 'symmetric_difference_update', 'union', 'intersection', 'difference', 'symmetric_difference', 'copy'];
      let allowed = null;
      if (typeof obj === 'string' && STR_KNOWN.includes(name)) allowed = (name === 'split' || name === 'rsplit') ? ['sep', 'maxsplit'] : [];
      else if (isList(obj) && LIST_KNOWN.includes(name)) allowed = name === 'sort' ? ['key', 'reverse'] : [];
      else if (isDict(obj) && DICT_KNOWN.includes(name)) allowed = name === 'update' ? null : []; // update のキーワードはキーとして取り込む正規の使い方
      else if (isSet(obj) && SET_KNOWN.includes(name)) allowed = [];
      else if ((isTuple(obj) || (obj && obj.__range)) && (name === 'count' || name === 'index')) allowed = [];
      if (allowed) for (const k of kwKeys) if (!allowed.includes(k)) this.err(line, 'TypeError', typeName(obj) + ' のメソッド「' + name + '」にキーワード引数「' + k + '」はありません', 'キーワード引数「' + k + '」は ' + name + '() では使えません。値は位置で渡してください');
    } }
  /* ===== B6-Py2：クラスメソッド形（型そのものへの呼び出し） ===== */
  {
    const tname = obj && obj.__type ? obj.__type : obj && obj.__builtin && TYPE_BUILTINS.includes(obj.__builtin) ? obj.__builtin : null;
    if (tname) {
      const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
      if (name === 'fromkeys' && (tname === 'dict' || tname === 'frozendict')) {
        if (args.length < 1 || args.length > 2) arityErr('1〜2 個');
        const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK();
        const d = tname === 'frozendict' ? FROZENDICT() : DICT();
        const val = args.length > 1 ? args[1] : NONE;
        for (const k of seq) { this.needHash(k, line); dictSet(d, k, val); }
        return d;
      }
      if (name === 'from_bytes' && tname === 'int') {
        if (args.length < 1 || args.length > 3) arityErr('1〜3 個');
        let barr = null;
        if (isBytesLike(args[0])) barr = bytesOf(args[0]).slice();
        else if (isMemview(args[0])) barr = mvBytes(args[0]);
        else { const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK(); barr = seq.map(x => { const bv = isBool(x) ? (x.v ? 1 : 0) : isNum(x) && !x.f ? x.v : null; if (bv === null || bv < 0 || bv > 255) E('ValueError', 'from_bytes の要素は 0〜255 の整数にしてください', ''); return bv; }); }
        const order = args[1] !== undefined ? args[1] : 'big';
        if (order !== 'big' && order !== 'little') E('ValueError', "byteorder は 'big' か 'little' にしてください", '');
        const signed = args[2] !== undefined ? this.truthyOf(args[2], line, env) === true : (kwargs && kwargs.signed !== undefined ? this.truthyOf(this.eval(kwargs.signed, env), line, env) === true : false);
        let acc = 0n; const ord = order === 'big' ? barr : barr.slice().reverse();
        for (const b of ord) acc = (acc << 8n) + BigInt(b);
        if (signed && barr.length && (order === 'big' ? barr[0] : barr[barr.length - 1]) >= 0x80) acc -= 1n << BigInt(barr.length * 8);
        return SAFE(Number(acc)) && BigInt(Number(acc)) === acc ? NUM(Number(acc), false) : BIG();
      }
      if (name === 'fromhex' && tname === 'float') {
        if (args.length !== 1) arityErr('1 個必要');
        if (typeof args[0] !== 'string') E('TypeError', 'float.fromhex() には文字列を渡してください', '');
        const t = args[0].trim();
        const hx = /^([+-]?)0[xX]([0-9a-fA-F]*)(?:\.([0-9a-fA-F]*))?(?:[pP]([+-]?\d+))?$/.exec(t);
        if (hx && (hx[2] || hx[3])) {
          let mant = 0n; const digits = (hx[2] || '') + (hx[3] || '');
          for (const ch of digits) mant = mant * 16n + BigInt(parseInt(ch, 16));
          let exp = (hx[4] ? parseInt(hx[4], 10) : 0) - 4 * (hx[3] || '').length;
          let val;
          if (mant === 0n) val = 0;
          else { while (mant > (1n << 200n)) { mant >>= 1n; exp++; } val = Number(mant) * Math.pow(2, exp); }
          return NUM(hx[1] === '-' ? -val : val, true);
        }
        if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return NUM(parseFloat(t), true);
        if (/^[+-]?(inf(inity)?|nan)$/i.test(t)) return NUM(/nan/i.test(t) ? NaN : (t.startsWith('-') ? -Infinity : Infinity), true);
        E('ValueError', '文字列「' + args[0] + '」は float.fromhex() で変換できません', '');
      }
      if (name === 'from_number' && (tname === 'float' || tname === 'complex')) {
        if (args.length !== 1) arityErr('1 個必要');
        const v = args[0]; if (isUnk(v)) return UNK();
        if (tname === 'float') { if (isNum(v)) return NUM(v.v, true); if (isBool(v)) return NUM(v.v ? 1 : 0, true); if (v && v.__instance) { for (const mn of ['__float__', '__index__']) { if (this.specialLookup(v, mn) !== undefined) { const r = this.callSpecial(v, mn, line, env); if (isUnk(r)) return r; if (isBool(r)) return NUM(r.v ? 1 : 0, true); if (isNum(r)) return NUM(r.v, true); E('TypeError', mn + '() の戻り値（' + typeName(r) + '）は小数として解釈できません', ''); } } } E('TypeError', 'float.from_number() には数値を渡してください', ''); } // B6監査D14：docs 3.14 の委譲
        const pp = cxParts(v); if (!pp) E('TypeError', 'complex.from_number() には数値を渡してください', '');
        return CXV(pp.re, pp.im);
      }
      if (name === 'fromhex' && (tname === 'bytes' || tname === 'bytearray')) {
        if (args.length !== 1) arityErr('1 個必要');
        if (typeof args[0] !== 'string') E('TypeError', tname + '.fromhex() には文字列を渡してください', '');
        const barr = parseHexBytes(args[0], E, tname + '.fromhex');
        return tname === 'bytes' ? BYTESV(barr) : BYTEARRAY(barr);
      }
      if (name === 'maketrans' && (tname === 'str' || tname === 'bytes' || tname === 'bytearray')) {
        return this.maketransImpl(tname, args, line);
      }
    }
  }
  /* ===== B6-Py2：数値メソッド（int／float／bool） ===== */
  if (isNum(obj) || isBool(obj)) {
    const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
    const iv = isBool(obj) ? (obj.v ? 1 : 0) : obj.v;
    if (name === 'conjugate') { if (args.length) arityErr('0 個'); return isBool(obj) ? NUM(iv, false) : obj; }
    if (name === 'bit_length' && !obj.f) { if (args.length) arityErr('0 個'); const a = Math.abs(Math.trunc(iv)); return NUM(a === 0 ? 0 : BigInt(a).toString(2).length, false); }
    if (name === 'bit_count' && !obj.f) { if (args.length) arityErr('0 個'); const a = Math.abs(Math.trunc(iv)); return NUM(a === 0 ? 0 : BigInt(a).toString(2).split('').filter(c => c === '1').length, false); }
    if (name === 'to_bytes' && !obj.f) {
      if (args.length < 2 || args.length > 3) arityErr('2〜3 個');
      const lenA = this.intIndex(args[0], line, 'to_bytes() の長さ'); if (lenA < 0) E('ValueError', 'to_bytes() の長さは 0 以上にしてください', '');
      const order = args[1]; if (order !== 'big' && order !== 'little') E('ValueError', "byteorder は 'big' か 'little' にしてください", '');
      const signed = args[2] !== undefined ? this.truthyOf(args[2], line, env) === true : (kwargs && kwargs.signed !== undefined ? this.truthyOf(this.eval(kwargs.signed, env), line, env) === true : false);
      let n = BigInt(Math.trunc(iv));
      if (n < 0n && !signed) E('OverflowError', '負の数は signed=False ではバイト列にできません', '');
      if (n < 0n) n += 1n << BigInt(lenA * 8);
      if (n < 0n || n >= (1n << BigInt(lenA * 8))) E('OverflowError', '整数が長さ ' + lenA + ' バイトに収まりません', '');
      const out = []; let tmp = n;
      for (let k = 0; k < lenA; k++) { out.push(Number(tmp & 0xffn)); tmp >>= 8n; }
      if (order === 'big') out.reverse();
      return BYTESV(out);
    }
    if (name === 'as_integer_ratio') {
      if (args.length) arityErr('0 個');
      if (!obj.f) return TUPLE([NUM(Math.trunc(iv), false), NUM(1, false)]);
      if (Number.isNaN(obj.v)) E('ValueError', 'NaN は有理数にできません', '');
      if (!Number.isFinite(obj.v)) E('OverflowError', '無限大は有理数にできません', '');
      const r = floatRatio(obj.v);
      // エンジン全体の規約どおり、安全な整数の範囲を超えた要素は BIG（不透明）にする
      // （int.from_bytes 等と同じ扱い。例：(0.1) の分母 2^55 はこの範囲を超える）
      const cvt = (b) => (SAFE(Number(b)) && BigInt(Number(b)) === b ? NUM(Number(b), false) : BIG());
      return TUPLE([cvt(r.n), cvt(r.d)]);
    }
    if (name === 'is_integer') { if (args.length) arityErr('0 個'); return BOOL(!obj.f ? true : Number.isInteger(obj.v)); }
    if (name === 'hex' && obj.f) { if (args.length) arityErr('0 個'); return floatHex(obj.v); }
  }
  /* ===== B6-Py2：complex メソッド ===== */
  if (isComplex(obj)) {
    if (name === 'conjugate') { if (args.length) arityErr('0 個'); return CXV(obj.__complex.re, -obj.__complex.im); }
    this.err(line, 'AttributeError', 'complex には「' + name + '」という属性（メソッド）はありません', '');
  }
  /* ===== B6-Py2：slice メソッド ===== */
  if (isSlice(obj)) {
    if (name === 'indices') {
      if (args.length !== 1) arityErr('1 個必要');
      const lenA = this.intIndex(args[0], line, 'indices() の長さ'); if (lenA < 0) this.err(line, 'ValueError', 'indices() の長さは 0 以上にしてください', '');
      const sl = obj.__slice;
      const ix = this.sliceIdx(lenA, isNone(sl.start) ? null : sl.start, isNone(sl.stop) ? null : sl.stop, isNone(sl.step) ? null : sl.step, line);
      if (ix === null) return UNK();
      return TUPLE([NUM(ix.a, false), NUM(ix.b, false), NUM(ix.step, false)]);
    }
    this.err(line, 'AttributeError', 'slice には「' + name + '」という属性（メソッド）はありません', '');
  }
  /* ===== B6-Py2：memoryview メソッド ===== */
  if (isMemview(obj)) {
    const mv = obj.__memview;
    const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
    if (mv.released) E('ValueError', '解放済み（release 済み）の memoryview は使えません（operation forbidden on released memoryview object）', '');
    switch (name) {
      case 'release': if (args.length) arityErr('0 個'); mv.released = true; return NONE;
      case 'tobytes': { if (args.length > 1) arityErr('0〜1 個'); return BYTESV(mvBytes(obj)); }
      case 'tolist': if (args.length) arityErr('0 個'); return LIST(mvBytes(obj).map(x => NUM(x, false)));
      case 'hex': {
        if (args.length > 2) arityErr('0〜2 個');
        let sep = null, per = 1;
        if (args.length >= 1 && !isNone(args[0])) { if (typeof args[0] !== 'string' || Array.from(args[0]).length !== 1) E('TypeError', 'hex() の区切りは1文字の文字列にしてください', ''); sep = args[0]; }
        if (args.length >= 2) per = this.intIndex(args[1], line, 'bytes_per_sep');
        return hexOfBytes(mvBytes(obj), sep, per);
      }
      case 'count': case 'index': {
        if (args.length < 1 || args.length > 3) arityErr('1〜3 個');
        const arr = mvBytes(obj);
        const bd = (v, d) => { if (v === undefined) return d; let k = this.intIndex(v, line, '開始・終了位置'); if (k < 0) { k += arr.length; if (k < 0) k = 0; } return Math.min(k, arr.length); };
        const st = bd(args[1], 0), en = bd(args[2], arr.length);
        if (isBytesLike(args[0])) { // B6監査D8：memoryview の count／index は要素（int）との一致で数える（bytes.count の部分列意味論ではない。docs 3.14／gh-125420）
          if (name === 'count') return NUM(0, false);
          E('ValueError', reprVal(args[0]) + ' は memoryview の中にありません', '');
        }
        const bv = isBool(args[0]) ? (args[0].v ? 1 : 0) : isNum(args[0]) && !args[0].f ? args[0].v : null;
        if (bv === null || bv < 0 || bv > 255) E('TypeError', 'memoryview の ' + name + '() には 0〜255 の整数か bytes のような並びを渡してください', '');
        if (name === 'count') return NUM(arr.slice(st, en).filter(x => x === bv).length, false);
        const at = arr.slice(st, en).indexOf(bv); if (at < 0) E('ValueError', reprVal(args[0]) + ' は memoryview の中にありません', '');
        return NUM(st + at, false);
      }
      case 'toreadonly': if (args.length) arityErr('0 個'); return MEMVIEW({ buf: mv.buf, off: mv.off, len: mv.len, readonly: true, released: false, obj: mv.obj });
      case 'cast': {
        if (args.length < 1 || args.length > 2) arityErr('1〜2 個');
        if (args[0] !== 'B') E('未対応', 'memoryview.cast() は書式 \'B\' だけに対応しています（他の書式はこの説明では対応していません）', "'B' で試してください");
        return MEMVIEW({ buf: mv.buf, off: mv.off, len: mv.len, readonly: mv.readonly, released: false, obj: mv.obj });
      }
    }
    this.err(line, 'AttributeError', 'memoryview には「' + name + '」という属性（メソッド）はありません', '');
  }
  /* ===== B6-Py2：bytes／bytearray メソッド ===== */
  if (isBytesLike(obj)) {
    return this.callBytesMethod(obj, name, args, kwargs, env, line);
  }
  if (typeof obj === 'string') {
    const S = (f, min, max) => { if (args.length < min || args.length > max) arityErr(min === max ? min + ' 個必要' : min + '〜' + max + ' 個'); return f(); };
    switch (name) {
      case 'upper': return S(() => obj.toUpperCase(), 0, 0);
      case 'lower': return S(() => obj.toLowerCase(), 0, 0);
      case 'title': return S(() => pyTitle(obj), 0, 0);
      case 'capitalize': return S(() => { const a = Array.from(obj); return a.length ? pyTitlecase(a[0]) + a.slice(1).join('').toLowerCase() : ''; }, 0, 0);
      case 'strip': case 'lstrip': case 'rstrip': return S(() => {
        const c = args[0]; if (c !== undefined && isUnk(c)) return UNK();
        if (c !== undefined && !isNone(c) && typeof c !== 'string') this.err(line, 'TypeError', name + '() の引数は文字列か None にしてください', '');
        const set = c === undefined || isNone(c) ? null : new Set(Array.from(c));
        const drop = ch => set ? set.has(ch) : isPyWs(ch);
        const a = Array.from(obj); let i = 0, j = a.length;
        if (name !== 'rstrip') while (i < j && drop(a[i])) i++;
        if (name !== 'lstrip') while (j > i && drop(a[j - 1])) j--;
        return a.slice(i, j).join('');
      }, 0, 1);
      case 'split': case 'rsplit': {
        if (args.length > 0 && kwargs && kwargs.sep) this.err(line, 'TypeError', name + '() の引数「sep」に値が2つ渡されています', '');
        if (args.length > 1 && kwargs && kwargs.maxsplit) this.err(line, 'TypeError', name + '() の引数「maxsplit」に値が2つ渡されています', '');
        const sepA = args.length > 0 ? args[0] : kwargs && kwargs.sep ? this.eval(kwargs.sep, env) : NONE;
        const maxA = args.length > 1 ? args[1] : kwargs && kwargs.maxsplit ? this.eval(kwargs.maxsplit, env) : NUM(-1, false);
        if (args.length > 2) arityErr('0〜2 個');
        if (isUnk(sepA) || isUnk(maxA)) return UNK();
        if (!isNone(sepA) && typeof sepA !== 'string') this.err(line, 'TypeError', name + '() の区切りは文字列か None にしてください', '');
        const mx = this.intIndex(maxA, line, 'maxsplit ');
        if (sepA === '') this.err(line, 'ValueError', '区切りに空文字列は使えません', '');
        return LIST(pySplit(obj, isNone(sepA) ? null : sepA, mx < 0 ? -1 : mx, name === 'rsplit'));
      }
      case 'join': return S(() => { const seq = this.iterableChecked(args[0], line, false); if (seq === null || seq.some(isUnk)) return UNK(); if (!seq.every(x => typeof x === 'string')) this.err(line, 'TypeError', 'join() は文字列の集まりに使います', '数値の集まりは str() で変えてから使ってください'); return seq.join(obj); }, 1, 1);
      case 'replace': return S(() => {
        if (args.some(isUnk)) return UNK();
        if (typeof args[0] !== 'string' || typeof args[1] !== 'string') this.err(line, 'TypeError', 'replace() には文字列を2つ渡してください', '');
        const oldS = args[0], newS = args[1];
        let cnt = args[2] !== undefined ? this.intIndex(args[2], line, 'replace() の回数') : -1;
        if (cnt < 0) cnt = Infinity;
        if (oldS === '') { // 空文字列の置換は、文字の間と両端へ挿入する
          const a = Array.from(obj); let out = '', used = 0, pos = 0;
          while (pos <= a.length && used < cnt) { out += newS; used++; if (pos < a.length) { out += a[pos]; } pos++; }
          return out + a.slice(pos).join('');
        }
        let out = '', i = 0, used = 0; // 置き換えた部分は再び探さない（1回だけ走査する）
        while (used < cnt) { const at = obj.indexOf(oldS, i); if (at < 0) break; out += obj.slice(i, at) + newS; i = at + oldS.length; used++; }
        return out + obj.slice(i);
      }, 2, 3);
      case 'find': case 'index': case 'rfind': case 'rindex': case 'count': case 'startswith': case 'endswith': return S(() => {
        if (args.some(isUnk)) return UNK();
        const nd = args[0], tupleOk = name === 'startswith' || name === 'endswith';
        const needles = tupleOk && isTuple(nd) ? nd.__tuple : [nd];
        const a = Array.from(obj), L = a.length;
        const bound = (v, def) => { if (v === undefined || isNone(v)) return def; let k = this.intIndex(v, line, '開始・終了位置'); if (k < 0) { k += L; if (k < 0) k = 0; } return k; };
        const st = bound(args[1], 0), en = Math.min(bound(args[2], L), L);
        if (tupleOk) {
          // startswith／endswith は CPython どおり候補を先頭から遅延検査する
          // （R7-146：先行候補が一致すれば後続の型違いには触れない）。
          // 範囲は [st, en) の窓として扱い、窓より長い候補は一致しない
          // （R7-147：逆転した空範囲では空文字列も一致しない）。
          for (const x of needles) {
            if (isUnk(x)) return UNK();
            if (typeof x !== 'string') this.err(line, 'TypeError', name + '() に渡す文字列の引数が ' + typeName(x) + ' になっています（文字列にしてください）', '');
            const nlen = Array.from(x).length;
            if (en - st < nlen) continue;
            const part = name === 'startswith' ? a.slice(st, st + nlen).join('') : a.slice(en - nlen, en).join('');
            if (part === x) return BOOL(true);
          }
          return BOOL(false);
        }
        for (const x of needles) if (typeof x !== 'string') this.err(line, 'TypeError', name + '() に渡す文字列の引数が ' + typeName(x) + ' になっています（文字列にしてください）', '');
        if (st > L || st > en) { if (name === 'count') return NUM(nd === '' && st <= L && st <= en ? 1 : 0, false); if (name === 'index' || name === 'rindex') this.err(line, 'ValueError', '文字列「' + nd + '」は見つかりません', 'find() を使うと、無いときに -1 が返ります'); return NUM(-1, false); }
        const sub = a.slice(st, en).join('');
        if (name === 'count') return NUM(nd === '' ? Array.from(sub).length + 1 : sub.split(nd).length - 1, false);
        const at = name[0] === 'r' ? sub.lastIndexOf(nd) : sub.indexOf(nd);
        if (at < 0) { if (name === 'index' || name === 'rindex') this.err(line, 'ValueError', '文字列「' + nd + '」は見つかりません', 'find() を使うと、無いときに -1 が返ります'); return NUM(-1, false); }
        return NUM(st + Array.from(sub.slice(0, at)).length, false);
      }, 1, 3);
      case 'isdigit': return S(() => BOOL(obj.length > 0 && Array.from(obj).every(isPyDigit)), 0, 0);
      case 'isdecimal': return S(() => BOOL(/^\p{Nd}+$/u.test(obj)), 0, 0);
      case 'isnumeric': return S(() => BOOL(obj.length > 0 && Array.from(obj).every(isPyNumeric)), 0, 0);
      // R7-148：CPython の分類は一般カテゴリではなく Unicode プロパティで
      // 定まる（実 CPython 3.12.3 で全件実測して確定）。
      // isalpha は「Letter」（Lm／Lt／Lu／Ll／Lo）のみで、Other_Alphabetic な
      // 結合文字（U+0345 等）は含まない。isalnum は Letter／数値（N）／
      // Digit プロパティの和集合。isidentifier は XID_Start／XID_Continue
      // （先頭は '_' も可、U+200C／U+200D は含まない）。islower／isupper は
      // Lowercase／Uppercase プロパティで判定し、タイトルケース（Lt）は
      // どちらの側にも属さず両方を不成立にする。
      case 'isalpha': return S(() => BOOL(obj.length > 0 && /^\p{L}+$/u.test(obj)), 0, 0);
      case 'isalnum': return S(() => BOOL(obj.length > 0 && Array.from(obj).every((ch) => /^\p{L}$/u.test(ch) || isPyNumeric(ch) || isPyDigit(ch))), 0, 0);
      case 'isspace': return S(() => BOOL(obj.length > 0 && Array.from(obj).every(isPyWs)), 0, 0);
      case 'isascii': return S(() => BOOL(/^[\x00-\x7F]*$/.test(obj)), 0, 0);
      case 'isidentifier': return S(() => { const a = Array.from(obj); return BOOL(a.length > 0 && (a[0] === '_' || /^\p{XID_Start}$/u.test(a[0])) && a.slice(1).every((ch) => ch !== '\u200c' && ch !== '\u200d' && /^\p{XID_Continue}$/u.test(ch))); }, 0, 0);
      case 'islower': return S(() => { const a = Array.from(obj); return BOOL(a.some((ch) => /^\p{Lowercase}$/u.test(ch)) && !a.some((ch) => /^\p{Uppercase}$/u.test(ch) || /^\p{Lt}$/u.test(ch))); }, 0, 0);
      case 'isupper': return S(() => { const a = Array.from(obj); return BOOL(a.some((ch) => /^\p{Uppercase}$/u.test(ch)) && !a.some((ch) => /^\p{Lowercase}$/u.test(ch) || /^\p{Lt}$/u.test(ch))); }, 0, 0);
      case 'casefold': return S(() => pyCasefold(obj), 0, 0);
      case 'center': case 'ljust': case 'rjust': return S(() => {
        const w = this.intIndex(args[0], line, '幅');
        let fill = ' ';
        if (args[1] !== undefined) { if (typeof args[1] !== 'string' || Array.from(args[1]).length !== 1) this.err(line, 'TypeError', '埋め文字は1文字の文字列にしてください', ''); fill = args[1]; }
        const a = Array.from(obj); if (a.length >= w) return obj;
        const n = w - a.length;
        if (name === 'ljust') return obj + fill.repeat(n);
        if (name === 'rjust') return fill.repeat(n) + obj;
        const l = Math.floor(n / 2); return fill.repeat(l) + obj + fill.repeat(n - l);
      }, 1, 2);
      case 'encode': return S(() => {
        const enc = resolveEncoding(args[0] !== undefined ? args[0] : (kwargs && kwargs.encoding !== undefined ? this.eval(kwargs.encoding, env) : 'utf-8'), (k, m, f) => this.err(line, k, m, f || ''));
        const errors = checkErrorsMode(args[1] !== undefined ? args[1] : (kwargs && kwargs.errors !== undefined ? this.eval(kwargs.errors, env) : undefined), (k, m, f) => this.err(line, k, m, f || ''));
        return BYTESV(encodeStrToBytes(obj, enc, errors, (k, m, f) => this.err(line, k, m, f || '')));
      }, 0, 2);
      case 'expandtabs': return S(() => expandTabsStr(obj, args[0] !== undefined ? this.intIndex(args[0], line, 'tabsize') : 8), 0, 1);
      case 'format': { if (args.some(isUnk)) return UNK(); return this.strFormatImpl(obj, args, kwargs, env, line, null); }
      case 'format_map': return S(() => { if (!isDict(args[0])) this.err(line, 'TypeError', 'format_map() には辞書（マッピング）を渡してください', ''); return this.strFormatImpl(obj, [], {}, env, line, args[0]); }, 1, 1);
      case 'isprintable': return S(() => BOOL(Array.from(obj).every((ch) => ch === ' ' || !NONPRINT_RE.test(ch))), 0, 0);
      case 'istitle': return S(() => {
        const a = Array.from(obj); let prevCased = false, hasCased = false;
        for (const ch of a) {
          const isUp = /^\p{Uppercase}$/u.test(ch) || /^\p{Lt}$/u.test(ch), isLow = /^\p{Lowercase}$/u.test(ch);
          if (isUp) { if (prevCased) return BOOL(false); prevCased = true; hasCased = true; }
          else if (isLow) { if (!prevCased) return BOOL(false); prevCased = true; hasCased = true; }
          else prevCased = false;
        }
        return BOOL(hasCased);
      }, 0, 0);
      case 'maketrans': return this.maketransImpl('str', args, line);
      case 'partition': case 'rpartition': return S(() => {
        if (typeof args[0] !== 'string') this.err(line, 'TypeError', name + '() には文字列を渡してください', '');
        if (args[0] === '') this.err(line, 'ValueError', '区切り（sep）に空文字列は使えません', '');
        const at = name === 'partition' ? obj.indexOf(args[0]) : obj.lastIndexOf(args[0]);
        if (at < 0) return name === 'partition' ? TUPLE([obj, '', '']) : TUPLE(['', '', obj]);
        return TUPLE([obj.slice(0, at), args[0], obj.slice(at + args[0].length)]);
      }, 1, 1);
      case 'removeprefix': case 'removesuffix': return S(() => {
        if (typeof args[0] !== 'string') this.err(line, 'TypeError', name + '() には文字列を渡してください', '');
        if (name === 'removeprefix') return obj.startsWith(args[0]) ? obj.slice(args[0].length) : obj;
        return obj.endsWith(args[0]) ? obj.slice(0, obj.length - args[0].length) : obj;
      }, 1, 1);
      case 'splitlines': return S(() => LIST(splitLinesStr(obj, args[0] !== undefined ? this.truthyOf(args[0], line, env) === true : false)), 0, 1);
      case 'swapcase': return S(() => Array.from(obj).map((ch) => {
        if (/^\p{Lowercase}$/u.test(ch)) return ch.toUpperCase();
        if (/^\p{Uppercase}$/u.test(ch) || /^\p{Lt}$/u.test(ch)) return ch.toLowerCase();
        return ch;
      }).join(''), 0, 0);
      case 'translate': return S(() => {
        if (!isDict(args[0])) this.err(line, 'TypeError', 'translate() には辞書（変換表）を渡してください', '');
        let out = '';
        for (const ch of obj) {
          const v = dictGet(args[0], NUM(ch.codePointAt(0), false));
          if (v === undefined) { out += ch; continue; }
          if (isNone(v)) continue;
          if (typeof v === 'string') { out += v; continue; }
          if (isNum(v) && !v.f) { out += String.fromCodePoint(v.v); continue; }
          this.err(line, 'TypeError', 'translate() の変換表の値は文字列・整数・None のいずれかにしてください', '');
        }
        return out;
      }, 1, 1);
      case 'zfill': return S(() => {
        const w = this.intIndex(args[0], line, '幅');
        const a = Array.from(obj); if (a.length >= w) return obj;
        const sign = (a[0] === '+' || a[0] === '-') ? 1 : 0;
        return a.slice(0, sign).join('') + '0'.repeat(w - a.length) + a.slice(sign).join('');
      }, 1, 1);
    }
  }
  if (isList(obj)) {
    switch (name) {
      case 'append': if (args.length !== 1) arityErr('1 個必要'); obj.__list.push(args[0]); this.step(line, 'リストの末尾に ' + reprVal(args[0]) + ' を追加します（要素は ' + obj.__list.length + ' 個になりました）'); return NONE;
      case 'extend': { if (args.length !== 1) arityErr('1 個必要'); const seq = this.iterableChecked(args[0], line, false); if (seq === null) { poison(obj, '書き換えられたかもしれないリスト'); return NONE; } if (obj.__list.length + seq.length > 200000) { poison(obj, 'とても長いリスト'); return NONE; } for (const x of seq) obj.__list.push(x); this.step(line, 'リストに ' + seq.length + ' 個の要素を追加します（要素は ' + obj.__list.length + ' 個になりました）'); return NONE; }
      case 'insert': { if (args.length !== 2) arityErr('番号と値の2個必要'); if (isUnk(args[0])) { poison(obj, '書き換えられたかもしれないリスト'); return NONE; } const ii = this.indexInt(args[0], line, 'insert() の番号'); if (ii === null) { poison(obj, '書き換えられたかもしれないリスト'); return NONE; } let i = ii; if (i < 0) i = Math.max(0, obj.__list.length + i); if (i > obj.__list.length) i = obj.__list.length; obj.__list.splice(i, 0, args[1]); this.step(line, 'リストの ' + i + ' 番目に ' + reprVal(args[1]) + ' を入れます'); return NONE; }
      case 'pop': { if (args.length > 1) arityErr('0〜1 個'); if (args.length && isUnk(args[0])) { if (!obj.__list.length) this.err(line, 'IndexError', '空のリストから pop() はできません', ''); obj.__list.pop(); for (let k = 0; k < obj.__list.length; k++) obj.__list[k] = UNK('取り出し後の要素'); return UNK('取り出した要素'); } const pi = args.length ? this.intIndex(args[0], line, 'pop() の番号') : null; if (!obj.__list.length) this.err(line, 'IndexError', '空のリストから pop() はできません', ''); let i = pi !== null ? pi : obj.__list.length - 1; if (i < 0) i += obj.__list.length; if (i < 0 || i >= obj.__list.length) this.err(line, 'IndexError', 'pop() の番号が範囲外です', ''); const v = obj.__list.splice(i, 1)[0]; this.step(line, 'リストから ' + reprVal(v) + ' を取り出して消します'); return v; }
      case 'remove': { if (args.length !== 1) arityErr('1 個必要'); if (isUnk(args[0])) { poison(obj, '書き換えられたかもしれないリスト'); return NONE; } const at = obj.__list.findIndex(x => eqVal(x, args[0]) === true); if (at < 0) this.err(line, 'ValueError', reprVal(args[0]) + ' はリストにありません', ''); obj.__list.splice(at, 1); this.step(line, 'リストから ' + reprVal(args[0]) + ' を消します'); return NONE; }
      case 'index': { if (!args.length || args.length > 3) arityErr('1〜3 個'); if (args.some(isUnk) || obj.__list.some(isUnk)) return UNK(); const L = obj.__list.length; const bd = (v, d) => { if (v === undefined) return d; let k = this.intIndex(v, line, '開始・終了位置'); if (k < 0) { k += L; if (k < 0) k = 0; } return Math.min(k, L); }; const st = bd(args[1], 0), en = bd(args[2], L); let at = -1; for (let k = st; k < en; k++) if (eqVal(obj.__list[k], args[0]) === true) { at = k; break; } if (at < 0) this.err(line, 'ValueError', reprVal(args[0]) + ' はリストにありません', ''); return NUM(at, false); }
      case 'count': if (args.length !== 1) arityErr('1 個必要'); if (isUnk(args[0])) return UNK(); return NUM(obj.__list.filter(x => eqVal(x, args[0]) === true).length, false);
      case 'sort': {
        if (args.length) this.err(line, 'TypeError', 'リストの sort() は位置引数を受け取りません（sort() takes no positional arguments）', 'key や reverse はキーワード引数で指定してください');
        const rev = kwargs && kwargs.reverse !== undefined ? this.truthyOf(this.eval(kwargs.reverse, env), line, env) === true : false;
        const keyFn = kwargs && kwargs.key ? this.eval(kwargs.key, env) : null;
        const keys = this.keyed(obj.__list, keyFn && !isNone(keyFn) ? keyFn : null, env, line);
        if (keys === null) { const n = obj.__list.length; obj.__list.length = 0; for (let i = 0; i < n; i++) obj.__list.push(UNK('並べ替え後の要素')); this.step(line, 'リストを並べ替えます（並べ替えの基準が実行時に決まるため、結果は分かりません）'); return NONE; }
        const idx = obj.__list.map((_, i) => i); const vals = obj.__list.slice();
        idx.sort((a, b) => { const c = this.cmpVals(keys[a], keys[b], line); return (rev ? -c : c) || a - b; });
        obj.__list.length = 0; idx.forEach(i => obj.__list.push(vals[i]));
        this.step(line, 'リストを並べ替えます → ' + reprVal(obj)); return NONE;
      }
      case 'reverse': if (args.length) arityErr('0 個'); obj.__list.reverse(); this.step(line, 'リストの並びを逆にします → ' + reprVal(obj)); return NONE;
      case 'copy': if (args.length) arityErr('0 個'); return LIST(obj.__list.slice());
      case 'clear': if (args.length) arityErr('0 個'); obj.__list.length = 0; this.step(line, 'リストを空にします'); return NONE;
    }
  }
  if (isDict(obj)) {
    if (name === 'fromkeys') { if (args.length < 1 || args.length > 2) arityErr('1〜2 個'); const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK(); const d = isFrozenDict(obj) ? FROZENDICT() : DICT(); const val = args.length > 1 ? args[1] : NONE; for (const k of seq) { this.needHash(k, line); dictSet(d, k, val); } return d; }
    if (isFrozenDict(obj) && ['update', 'pop', 'popitem', 'setdefault', 'clear'].includes(name)) this.err(line, 'AttributeError', 'frozendict には「' + name + '」という属性（メソッド）はありません（frozendict は変更できません）', '新しい frozendict を作るか、dict に変換してから書き換えてください');
    if (isFrozenDict(obj) && name === 'copy') { if (args.length) arityErr('0 個'); const d = FROZENDICT(); for (const [id, e] of obj.__dict) d.__dict.set(id, e); return d; }
    switch (name) {
      case 'get': { if (args.length < 1 || args.length > 2) arityErr('1〜2 個'); if (isUnk(args[0])) return UNK(); this.needHash(args[0], line); const v = dictGet(obj, args[0]); if (v !== undefined) return v; const hitG = [...obj.__dict.values()].find(e => this.eqByVal(e.k, args[0], line)); if (hitG) return hitG.v; return args.length > 1 ? args[1] : NONE; }
      case 'keys': if (args.length) arityErr('0 個'); return VIEW(obj, 'keys');
      case 'values': if (args.length) arityErr('0 個'); return VIEW(obj, 'values');
      case 'items': if (args.length) arityErr('0 個'); return VIEW(obj, 'items');
      case 'update': {
        if (args.length > 1) arityErr('0〜1 個');
        if (args.length) {
          const a0 = args[0]; if (isUnk(a0)) { this.diag(line, 'note', '注意', '更新に使う値が実行時に決まるため、辞書の中身は分からなくなります', ''); poison(obj, '更新されたかもしれない辞書'); return NONE; }
          if (isDict(a0)) { for (const e of a0.__dict.values()) dictSet(obj, e.k, e.v); }
          else { const seq = this.iterable(a0, line, true); if (seq === null) { if (isSet(a0)) { poison(obj, '更新されたかもしれない辞書'); return NONE; } this.err(line, 'TypeError', typeName(a0) + ' では辞書を更新できません', ''); } for (const p of seq) { const kv = isList(p) ? p.__list : isTuple(p) ? p.__tuple : typeof p === 'string' ? Array.from(p) : null; if (!kv || kv.length !== 2) this.err(line, 'ValueError', 'update() には (キー, 値) の組の並びを渡してください', ''); this.needHash(kv[0], line); dictSet(obj, kv[0], kv[1]); } }
        }
        for (const k of Object.keys(kwargs || {})) dictSet(obj, k, this.eval(kwargs[k], env));
        this.step(line, '辞書をまとめて更新します → ' + reprVal(obj)); return NONE;
      }
      case 'pop': { if (args.length < 1 || args.length > 2) arityErr('1〜2 個'); if (isUnk(args[0])) { poison(obj, '書き換えられたかもしれない辞書'); return UNK('取り出した値'); } const id = dictKeyId(args[0]); if (id === null || !obj.__dict.has(id)) { if (args.length > 1) return args[1]; this.err(line, 'KeyError', 'キー ' + reprVal(args[0]) + ' は辞書にありません', ''); } const v = obj.__dict.get(id).v; obj.__dict.delete(id); this.step(line, '辞書からキー ' + reprVal(args[0]) + ' を消します'); return v; }
      case 'setdefault': { if (args.length < 1 || args.length > 2) arityErr('1〜2 個'); if (isUnk(args[0])) { poison(obj, '書き換えられたかもしれない辞書'); return UNK('辞書の値'); } this.needHash(args[0], line); const cur = dictGet(obj, args[0]); if (cur !== undefined) return cur; dictSet(obj, args[0], args.length > 1 ? args[1] : NONE); return args.length > 1 ? args[1] : NONE; }
      case 'popitem': { if (args.length) arityErr('0 個'); if (!obj.__dict.size) this.err(line, 'KeyError', 'popitem(): 辞書が空です', ''); const entries = [...obj.__dict.entries()]; const last = entries[entries.length - 1]; obj.__dict.delete(last[0]); this.step(line, '辞書から最後の組を取り出します'); return TUPLE([last[1].k, last[1].v]); }
      case 'copy': { if (args.length) arityErr('0 個'); const d = DICT(); for (const [id, e] of obj.__dict) d.__dict.set(id, e); return d; }
      case 'clear': if (args.length) arityErr('0 個'); obj.__dict.clear(); this.step(line, '辞書を空にします'); return NONE;
    }
  }
  if (isSet(obj)) {
    if (isFrozenSet(obj) && ['add', 'remove', 'discard', 'update', 'clear', 'pop', 'intersection_update', 'difference_update', 'symmetric_difference_update'].includes(name)) this.err(line, 'AttributeError', 'frozenset には「' + name + '」という属性（メソッド）はありません（frozenset は変更できません）', '新しい frozenset を作ってください');
    switch (name) {
      case 'isdisjoint': { if (args.length !== 1) arityErr('1 個必要'); const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK(); return BOOL(!obj.__set.some(x => seq.some(y => this.eqByVal(x, y, line)))); }
      case 'issubset': { if (args.length !== 1) arityErr('1 個必要'); const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK(); return BOOL(obj.__set.every(x => seq.some(y => this.eqByVal(x, y, line)))); }
      case 'issuperset': { if (args.length !== 1) arityErr('1 個必要'); const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK(); return BOOL(seq.every(x => obj.__set.some(y => this.eqByVal(x, y, line)))); }
      case 'add': if (args.length !== 1) arityErr('1 個必要'); this.needHash(args[0], line); obj.__set.push(args[0]); if (!obj.__set.slice(0, -1).some(x => this.eqByVal(x, args[0], line))) this.step(line, '集合に ' + reprVal(args[0]) + ' を追加します'); else obj.__set.pop(); return NONE;
      case 'remove': { if (args.length !== 1) arityErr('1 個必要'); if (isUnk(args[0])) { poison(obj, '書き換えられたかもしれない集合'); return NONE; } this.needHash(args[0], line); const at = obj.__set.findIndex(x => this.eqByVal(x, args[0], line)); if (at < 0) this.err(line, 'KeyError', reprVal(args[0]) + ' は集合にありません', ''); obj.__set.splice(at, 1); return NONE; }
      case 'discard': { if (args.length !== 1) arityErr('1 個必要'); if (isUnk(args[0])) { poison(obj, '書き換えられたかもしれない集合'); return NONE; } this.needHash(args[0], line); const at = obj.__set.findIndex(x => this.eqByVal(x, args[0], line)); if (at >= 0) obj.__set.splice(at, 1); return NONE; }
      // 集合の演算メソッドは順序に依存しないため、引数の集合は並び順が未確定でも展開してよい（PY-01）。
      // 引数は CPython どおり複数受け付け（union 等）、確定した非イテラブルは TypeError で止める（PY-04）。
      case 'update': { for (const a of args) { const seq = this.iterableChecked(a, line, true); if (seq === null) { poison(obj, '書き換えられたかもしれない集合'); return NONE; } for (const x of seq) { this.needHash(x, line); if (!obj.__set.some(y => this.eqByVal(x, y, line))) obj.__set.push(x); } } this.step(line, '集合に要素を追加します → ' + reprVal(obj)); return NONE; }
      case 'clear': if (args.length) arityErr('0 個'); obj.__set.length = 0; this.step(line, '集合を空にします'); return NONE;
      case 'pop': { if (args.length) arityErr('0 個'); if (!obj.__set.length) this.err(line, 'KeyError', '空の集合から pop() はできません', ''); poison(obj, '要素が取り出された集合'); return UNK('取り出した要素'); }
      case 'intersection_update': { for (const a of args) { const seq = this.iterableChecked(a, line, true); if (seq === null) { poison(obj, '書き換えられたかもしれない集合'); return NONE; } for (const x of seq) this.needHash(x, line); const kept = obj.__set.filter(x => seq.some(y => this.eqByVal(x, y, line))); obj.__set.length = 0; for (const x of kept) obj.__set.push(x); } return NONE; }
      case 'difference_update': { for (const a of args) { const seq = this.iterableChecked(a, line, true); if (seq === null) { poison(obj, '書き換えられたかもしれない集合'); return NONE; } for (const x of seq) this.needHash(x, line); const kept = obj.__set.filter(x => !seq.some(y => this.eqByVal(x, y, line))); obj.__set.length = 0; for (const x of kept) obj.__set.push(x); } return NONE; }
      case 'symmetric_difference_update': { if (args.length !== 1) arityErr('1 個必要'); const seq = this.iterableChecked(args[0], line, true); if (seq === null) { poison(obj, '書き換えられたかもしれない集合'); return NONE; } const kept = obj.__set.filter(x => !seq.some(y => this.eqByVal(x, y, line))); const add = seq.filter(x => !obj.__set.some(y => this.eqByVal(x, y, line))); obj.__set.length = 0; for (const x of kept) obj.__set.push(x); for (const x of add) { this.needHash(x, line); if (!obj.__set.some(y => this.eqByVal(x, y, line))) obj.__set.push(x); } return NONE; }
      case 'union': { const out = obj.__set.slice(); for (const a of args) { const seq = this.iterableChecked(a, line, true); if (seq === null) return UNK(); for (const x of seq) { this.needHash(x, line); if (!out.some(y => this.eqByVal(x, y, line))) out.push(x); } } return isFrozenSet(obj) ? FROZENSET(out) : SET(out); }
      case 'intersection': { let cur = obj.__set.slice(); for (const a of args) { const seq = this.iterableChecked(a, line, true); if (seq === null) return UNK(); for (const x of seq) this.needHash(x, line); cur = cur.filter(x => seq.some(y => this.eqByVal(x, y, line))); } return isFrozenSet(obj) ? FROZENSET(cur) : SET(cur); }
      case 'difference': { let cur = obj.__set.slice(); for (const a of args) { const seq = this.iterableChecked(a, line, true); if (seq === null) return UNK(); for (const x of seq) this.needHash(x, line); cur = cur.filter(x => !seq.some(y => this.eqByVal(x, y, line))); } return isFrozenSet(obj) ? FROZENSET(cur) : SET(cur); }
      case 'symmetric_difference': { if (args.length !== 1) arityErr('1 個必要'); const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK(); for (const x of seq) this.needHash(x, line); const kept = obj.__set.filter(x => !seq.some(y => this.eqByVal(x, y, line))); for (const x of seq) if (!obj.__set.some(y => this.eqByVal(x, y, line)) && !kept.some(y => this.eqByVal(x, y, line))) kept.push(x); return isFrozenSet(obj) ? FROZENSET(kept) : SET(kept); }
      case 'copy': if (args.length) arityErr('0 個'); return isFrozenSet(obj) ? FROZENSET(obj.__set.slice()) : SET(obj.__set.slice());
    }
  }
  if (obj && obj.__range && name === 'count') { if (args.length !== 1) arityErr('1 個必要'); if (isUnk(args[0])) return UNK(); return NUM(obj.__range.filter(x => eqVal(x, args[0]) === true).length, false); }
  if (obj && obj.__range && name === 'index') { if (args.length !== 1) arityErr('1 個必要'); if (isUnk(args[0])) return UNK(); const at = obj.__range.findIndex(x => eqVal(x, args[0]) === true); if (at < 0) this.err(line, 'ValueError', reprVal(args[0]) + ' は range の中にありません', ''); return NUM(at, false); }
  if (isTuple(obj) && name === 'count') { if (args.length !== 1) arityErr('1 個必要'); if (isUnk(args[0])) return UNK(); return NUM(obj.__tuple.filter(x => eqVal(x, args[0]) === true).length, false); }
  // R30F01B-N1（バッチ9 N26）：tuple.index も list.index と同じく start／stop を
  // honor する（実 CPython 3.12.3 で機械突合：負数は長さを加えて正規化し、
  // 範囲内に無ければ ValueError）。list.index の既存の正しい実装に揃える。
  if (isTuple(obj) && name === 'index') { if (!args.length || args.length > 3) arityErr('1〜3 個'); if (args.some(isUnk) || obj.__tuple.some(isUnk)) return UNK(); const L = obj.__tuple.length; const bd = (v, d) => { if (v === undefined) return d; let k = this.intIndex(v, line, '開始・終了位置'); if (k < 0) { k += L; if (k < 0) k = 0; } return Math.min(k, L); }; const st = bd(args[1], 0), en = bd(args[2], L); let at = -1; for (let k = st; k < en; k++) if (eqVal(obj.__tuple[k], args[0]) === true) { at = k; break; } if (at < 0) this.err(line, 'ValueError', reprVal(args[0]) + ' はタプルにありません', ''); return NUM(at, false); }
  // モジュール属性など
  if (isUnk(obj) && obj.mod === 'math') return this.mathCall(name, args, line);
  if (obj && obj.__class) { const cv = classLookup(obj, name); if (cv !== undefined) return cv; return UNK('クラス属性「' + name + '」の値'); }
  if (obj && typeof obj === 'object' && obj.__unk) return UNK();
  { const tn = typeName(obj); if (TYPE_ATTRS[tn] && !TYPE_ATTRS[tn].has(name)) this.err(line, 'AttributeError', tn + ' には「' + name + '」という属性（メソッド）はありません', '綴りを確認するか、リファレンスで使えるメソッドを確認してください'); }
  this.diag(line, 'note', '対応外', typeName(obj) + ' の「' + name + '」はこの説明では解釈できません', 'リファレンスで使い方を確認し、実際の動きは実行して確かめてください');
  return UNK(typeName(obj) + '.' + name + ' の結果');
};


/* ===== B6-Py2：bytes／bytearray のメソッド本体（共通実装） ===== */
Interp.prototype.callBytesMethod = function (obj, name, args, kwargs, env, line) {
  const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
  const arityErr = (need) => this.err(line, 'TypeError', 'メソッド「' + name + '」の引数の数が合いません（' + need + '）', 'リファレンスで使い方を確認してください');
  const isBA = isBytearray(obj);
  const arr = bytesOf(obj);
  const wrap = (a) => isBA ? BYTEARRAY(a) : BYTESV(a);
  const tn = isBA ? 'bytearray' : 'bytes';
  if (args.some(isUnk)) return UNK();
  const subArr = (v, what) => {
    if (isBytesLike(v)) return bytesOf(v).slice();
    if (isMemview(v)) { if (v.__memview.released) E('ValueError', '解放済み（release 済み）の memoryview は使えません', ''); return mvBytes(v); }
    E('TypeError', (what || name) + '() には bytes のような並びを渡してください（' + typeName(v) + ' は使えません）', '');
    return null;
  };
  const subOrInt = (v) => { // find 系：bytes-like か 0〜255 の整数
    if (isBytesLike(v) || isMemview(v)) return { arr: subArr(v) };
    const bv = isBool(v) ? (v.v ? 1 : 0) : isNum(v) && !v.f ? v.v : null;
    if (bv !== null) { if (bv < 0 || bv > 255) E('ValueError', 'バイト値は 0〜255 の整数にしてください', ''); return { arr: [bv] }; }
    E('TypeError', name + '() には bytes のような並びか 0〜255 の整数を渡してください', '');
    return null;
  };
  const bounds = (st0, en0) => {
    const L = arr.length;
    const bd = (v, d) => { if (v === undefined || isNone(v)) return d; let k = this.intIndex(v, line, '開始・終了位置'); if (k < 0) { k += L; if (k < 0) k = 0; } return Math.min(k, L); };
    return [bd(st0, 0), bd(en0, L)];
  };
  switch (name) {
    case 'decode': {
      if (args.length > 2) arityErr('0〜2 個');
      const enc = resolveEncoding(args[0] !== undefined ? args[0] : (kwargs && kwargs.encoding !== undefined ? this.eval(kwargs.encoding, env) : 'utf-8'), E);
      const errors = checkErrorsMode(args[1] !== undefined ? args[1] : (kwargs && kwargs.errors !== undefined ? this.eval(kwargs.errors, env) : undefined), E);
      return decodeBytesToStr(arr, enc, errors, E);
    }
    case 'hex': {
      if (args.length > 2) arityErr('0〜2 個');
      let sep = null, per = 1;
      if (args.length >= 1 && !isNone(args[0])) { if (typeof args[0] !== 'string' || Array.from(args[0]).length !== 1) E('TypeError', 'hex() の区切りは1文字の文字列にしてください', ''); sep = args[0]; }
      if (args.length >= 2) per = this.intIndex(args[1], line, 'bytes_per_sep');
      return hexOfBytes(arr, sep, per);
    }
    case 'count': { if (args.length < 1 || args.length > 3) arityErr('1〜3 個'); const [st, en] = bounds(args[1], args[2]); return NUM(countSub(arr, subOrInt(args[0]).arr, st, en), false); }
    case 'find': case 'index': case 'rfind': case 'rindex': {
      if (args.length < 1 || args.length > 3) arityErr('1〜3 個');
      const [st, en] = bounds(args[1], args[2]);
      const ndl = subOrInt(args[0]).arr;
      let at;
      if (name === 'find' || name === 'index') at = findSub(arr, ndl, st, en);
      else { at = -1; for (let i = en - ndl.length; i >= st; i--) { if (ndl.every((x, j) => arr[i + j] === x)) { at = i; break; } } if (ndl.length === 0) at = en; }
      if (at < 0) { if (name === 'index' || name === 'rindex') E('ValueError', '部分列は見つかりません', 'find() を使うと、無いときに -1 が返ります'); return NUM(-1, false); }
      return NUM(at, false);
    }
    case 'startswith': case 'endswith': {
      if (args.length < 1 || args.length > 3) arityErr('1〜3 個');
      const [st, en] = bounds(args[1], args[2]);
      const cands = isTuple(args[0]) ? args[0].__tuple : [args[0]];
      for (const c of cands) {
        if (isUnk(c)) return UNK();
        const ndl = subArr(c);
        if (en - st < ndl.length) continue;
        const part = name === 'startswith' ? arr.slice(st, st + ndl.length) : arr.slice(en - ndl.length, en);
        if (part.every((x, j) => x === ndl[j])) return BOOL(true);
      }
      return BOOL(false);
    }
    case 'join': {
      if (args.length !== 1) arityErr('1 個必要');
      const seq = this.iterableChecked(args[0], line, false); if (seq === null) return UNK();
      const out = [];
      seq.forEach((x, i) => { if (i) out.push(...arr); out.push(...subArr(x, 'join')); });
      return wrap(out);
    }
    case 'maketrans': return this.maketransImpl(tn, args, line);
    case 'partition': case 'rpartition': {
      if (args.length !== 1) arityErr('1 個必要');
      const sep = subArr(args[0]);
      if (!sep.length) E('ValueError', '区切り（sep）に空のバイト列は使えません', '');
      const at = name === 'partition' ? findSub(arr, sep, 0, arr.length) : (() => { let a2 = -1; for (let i = arr.length - sep.length; i >= 0; i--) if (sep.every((x, j) => arr[i + j] === x)) { a2 = i; break; } return a2; })();
      if (at < 0) return name === 'partition' ? TUPLE([wrap(arr.slice()), wrap([]), wrap([])]) : TUPLE([wrap([]), wrap([]), wrap(arr.slice())]);
      return TUPLE([wrap(arr.slice(0, at)), wrap(sep.slice()), wrap(arr.slice(at + sep.length))]);
    }
    case 'removeprefix': case 'removesuffix': {
      if (args.length !== 1) arityErr('1 個必要');
      const p = subArr(args[0]);
      if (name === 'removeprefix') return wrap(p.length && arr.slice(0, p.length).every((x, j) => x === p[j]) ? arr.slice(p.length) : arr.slice());
      return wrap(p.length && arr.slice(arr.length - p.length).every((x, j) => x === p[j]) ? arr.slice(0, arr.length - p.length) : arr.slice());
    }
    case 'replace': {
      if (args.length < 2 || args.length > 3) arityErr('2〜3 個');
      const oldA = subArr(args[0]), newA = subArr(args[1]);
      let cnt = args[2] !== undefined ? this.intIndex(args[2], line, 'replace() の回数') : -1;
      if (cnt < 0) cnt = Infinity;
      const out = []; let i = 0, used = 0;
      if (!oldA.length) { // 空の置換は間と両端へ挿入
        while (i <= arr.length && used < cnt) { out.push(...newA); used++; if (i < arr.length) out.push(arr[i]); i++; }
        out.push(...arr.slice(i)); return wrap(out);
      }
      while (used < cnt) { const at = findSub(arr, oldA, i, arr.length); if (at < 0) break; out.push(...arr.slice(i, at), ...newA); i = at + oldA.length; used++; }
      out.push(...arr.slice(i)); return wrap(out);
    }
    case 'center': case 'ljust': case 'rjust': {
      if (args.length < 1 || args.length > 2) arityErr('1〜2 個');
      const w = this.intIndex(args[0], line, '幅');
      let fill = 0x20;
      if (args[1] !== undefined) { const f = subArr(args[1]); if (f.length !== 1) E('TypeError', '埋め文字は長さ1のバイト列にしてください', ''); fill = f[0]; }
      if (arr.length >= w) return wrap(arr.slice());
      const n = w - arr.length;
      if (name === 'ljust') return wrap(arr.concat(Array(n).fill(fill)));
      if (name === 'rjust') return wrap(Array(n).fill(fill).concat(arr));
      const l = Math.floor(n / 2); return wrap(Array(l).fill(fill).concat(arr, Array(n - l).fill(fill)));
    }
    case 'lstrip': case 'rstrip': case 'strip': {
      if (args.length > 1) arityErr('0〜1 個');
      const set = args[0] !== undefined && !isNone(args[0]) ? new Set(subArr(args[0])) : null;
      const drop = (b) => set ? set.has(b) : bytesIsWs(b);
      let i = 0, j = arr.length;
      if (name !== 'rstrip') while (i < j && drop(arr[i])) i++;
      if (name !== 'lstrip') while (j > i && drop(arr[j - 1])) j--;
      return wrap(arr.slice(i, j));
    }
    case 'split': case 'rsplit': {
      if (args.length > 2) arityErr('0〜2 個');
      const sepA = args[0]; const maxA = args[1];
      const mx = maxA !== undefined ? this.intIndex(maxA, line, 'maxsplit') : -1;
      const parts = (sepA === undefined || isNone(sepA)) ? splitBytes(arr, null, mx < 0 ? -1 : mx, name === 'rsplit') : (() => { const sep = subArr(sepA); if (!sep.length) E('ValueError', '区切りに空のバイト列は使えません', ''); return splitBytes(arr, sep, mx < 0 ? -1 : mx, name === 'rsplit'); })();
      return LIST(parts.map(pt => wrap(pt)));
    }
    case 'capitalize': {
      if (args.length) arityErr('0 個');
      const out = arr.map(b => (b >= 0x41 && b <= 0x5a) ? b + 0x20 : b);
      if (out.length && out[0] >= 0x61 && out[0] <= 0x7a) out[0] -= 0x20;
      return wrap(out);
    }
    case 'expandtabs': { if (args.length > 1) arityErr('0〜1 個'); const ts = args[0] !== undefined ? this.intIndex(args[0], line, 'tabsize') : 8; return wrap(expandTabsBytes(arr, ts)); }
    case 'lower': if (args.length) arityErr('0 個'); return wrap(arr.map(b => (b >= 0x41 && b <= 0x5a) ? b + 0x20 : b));
    case 'upper': if (args.length) arityErr('0 個'); return wrap(arr.map(b => (b >= 0x61 && b <= 0x7a) ? b - 0x20 : b));
    case 'swapcase': if (args.length) arityErr('0 個'); return wrap(arr.map(b => (b >= 0x41 && b <= 0x5a) ? b + 0x20 : (b >= 0x61 && b <= 0x7a) ? b - 0x20 : b));
    case 'title': {
      if (args.length) arityErr('0 個');
      const out = []; let prevCased = false;
      for (const b of arr) {
        const isLow = b >= 0x61 && b <= 0x7a, isUp = b >= 0x41 && b <= 0x5a;
        if (isLow || isUp) { out.push(prevCased ? (isUp ? b + 0x20 : b) : (isLow ? b - 0x20 : b)); prevCased = true; }
        else { out.push(b); prevCased = false; }
      }
      return wrap(out);
    }
    case 'splitlines': { if (args.length > 1) arityErr('0〜1 個'); const keep = args[0] !== undefined ? this.truthyOf(args[0], line, env) === true : false; return LIST(splitLinesBytes(arr, keep).map(pt => wrap(pt))); }
    case 'zfill': { if (args.length !== 1) arityErr('1 個必要'); const w = this.intIndex(args[0], line, '幅'); if (arr.length >= w) return wrap(arr.slice()); const sign = (arr[0] === 0x2b || arr[0] === 0x2d) ? 1 : 0; return wrap(arr.slice(0, sign).concat(Array(w - arr.length).fill(0x30), arr.slice(sign))); }
    case 'translate': {
      if (args.length < 1 || args.length > 2) arityErr('1〜2 個');
      const del = args[1] !== undefined ? new Set(subArr(args[1])) : new Set();
      if (isNone(args[0])) return wrap(arr.filter(b => !del.has(b)));
      const table = subArr(args[0]);
      if (table.length !== 256) E('ValueError', 'translate() の変換表は長さ256のバイト列にしてください', '');
      return wrap(arr.filter(b => !del.has(b)).map(b => table[b]));
    }
    case 'isalpha': if (args.length) arityErr('0 個'); return BOOL(arr.length > 0 && arr.every(b => (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a)));
    case 'isdigit': if (args.length) arityErr('0 個'); return BOOL(arr.length > 0 && arr.every(b => b >= 0x30 && b <= 0x39));
    case 'isascii': if (args.length) arityErr('0 個'); return BOOL(arr.every(b => b < 0x80));
    case 'isspace': if (args.length) arityErr('0 個'); return BOOL(arr.length > 0 && arr.every(bytesIsWs));
    case 'isalnum': if (args.length) arityErr('0 個'); return BOOL(arr.length > 0 && arr.every(b => (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a)));
    case 'islower': { if (args.length) arityErr('0 個'); const cased = arr.filter(b => (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a)); return BOOL(cased.length > 0 && cased.every(b => b >= 0x61 && b <= 0x7a)); }
    case 'isupper': { if (args.length) arityErr('0 個'); const cased = arr.filter(b => (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a)); return BOOL(cased.length > 0 && cased.every(b => b >= 0x41 && b <= 0x5a)); }
    case 'istitle': {
      if (args.length) arityErr('0 個');
      let prevCased = false, hasCased = false, ok = true;
      for (const b of arr) {
        const isLow = b >= 0x61 && b <= 0x7a, isUp = b >= 0x41 && b <= 0x5a;
        if (isUp) { if (prevCased) ok = false; prevCased = true; hasCased = true; }
        else if (isLow) { if (!prevCased) ok = false; prevCased = true; hasCased = true; }
        else prevCased = false;
      }
      return BOOL(ok && hasCased);
    }
    /* ---- bytearray 専用 ---- */
    case 'resize': {
      if (!isBA) break;
      if (args.length !== 1) arityErr('1 個必要');
      const n = this.intIndex(args[0], line, 'resize() の大きさ');
      if (n < 0) E('ValueError', 'resize() の大きさは 0 以上にしてください', '');
      if (n < arr.length) arr.length = n; else while (arr.length < n) arr.push(0);
      return NONE;
    }
    case 'take_bytes': {
      if (!isBA) break;
      if (args.length > 1) arityErr('0〜1 個');
      let n = arr.length;
      if (args.length && !isNone(args[0])) { n = this.intIndex(args[0], line, 'take_bytes() のバイト数'); if (n !== null && n < 0) n = arr.length + n; if (n === null || n < 0 || n > arr.length) E('IndexError', 'take_bytes() のバイト数が範囲外です（長さは ' + arr.length + ' です）', ''); } // B6監査D7：docs 3.15 の意味論（範囲外は IndexError、負数は末尾から数える）
      const out = arr.splice(0, n);
      return BYTESV(out);
    }
    case 'append': {
      if (!isBA) break;
      if (args.length !== 1) arityErr('1 個必要');
      const bv = isBool(args[0]) ? (args[0].v ? 1 : 0) : isNum(args[0]) && !args[0].f ? args[0].v : null;
      if (bv === null || bv < 0 || bv > 255) E('ValueError', 'append() には 0〜255 の整数を渡してください', '');
      arr.push(bv); return NONE;
    }
    case 'extend': {
      if (!isBA) break;
      if (args.length !== 1) arityErr('1 個必要');
      if (isBytesLike(args[0])) { for (const b of bytesOf(args[0])) arr.push(b); return NONE; }
      const seq = this.iterableChecked(args[0], line, true); if (seq === null) return UNK();
      for (const x of seq) { const bv = isBool(x) ? (x.v ? 1 : 0) : isNum(x) && !x.f ? x.v : null; if (bv === null || bv < 0 || bv > 255) E('ValueError', 'extend() の要素は 0〜255 の整数にしてください', ''); arr.push(bv); }
      return NONE;
    }
    case 'insert': {
      if (!isBA) break;
      if (args.length !== 2) arityErr('2 個必要');
      let i = this.intIndex(args[0], line, 'insert() の番号'); if (i < 0) i = Math.max(0, arr.length + i); if (i > arr.length) i = arr.length;
      const bv = isBool(args[1]) ? (args[1].v ? 1 : 0) : isNum(args[1]) && !args[1].f ? args[1].v : null;
      if (bv === null || bv < 0 || bv > 255) E('ValueError', 'insert() には 0〜255 の整数を渡してください', '');
      arr.splice(i, 0, bv); return NONE;
    }
    case 'pop': {
      if (!isBA) break;
      if (args.length > 1) arityErr('0〜1 個');
      if (!arr.length) E('IndexError', '空の bytearray から pop() はできません', '');
      let i = args.length ? this.intIndex(args[0], line, 'pop() の番号') : arr.length - 1;
      if (i < 0) i += arr.length;
      if (i < 0 || i >= arr.length) E('IndexError', 'pop() の番号が範囲外です', '');
      return NUM(arr.splice(i, 1)[0], false);
    }
    case 'remove': {
      if (!isBA) break;
      if (args.length !== 1) arityErr('1 個必要');
      const bv = isBool(args[0]) ? (args[0].v ? 1 : 0) : isNum(args[0]) && !args[0].f ? args[0].v : null;
      if (bv === null || bv < 0 || bv > 255) E('ValueError', 'remove() には 0〜255 の整数を渡してください', '');
      const at = arr.indexOf(bv); if (at < 0) E('ValueError', 'そのバイトは bytearray にありません', '');
      arr.splice(at, 1); return NONE;
    }
    case 'clear': if (!isBA) break; if (args.length) arityErr('0 個'); arr.length = 0; return NONE;
    case 'copy': if (args.length) arityErr('0 個'); return wrap(arr.slice());
    case 'reverse': if (!isBA) break; if (args.length) arityErr('0 個'); arr.reverse(); return NONE;
  }
  this.err(line, 'AttributeError', tn + ' には「' + name + '」という属性（メソッド）はありません', '綴りを確認するか、リファレンスで使えるメソッドを確認してください');
  return UNK();
};
/* ===== B6-Py2：maketrans（str／bytes／bytearray 共通） ===== */
Interp.prototype.maketransImpl = function (tname, args, line) {
  const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
  if (tname === 'str') {
    if (args.length < 1 || args.length > 3) this.err(line, 'TypeError', 'str.maketrans() の引数の数が合いません（1〜3 個）', '');
    const d = DICT();
    const put = (k, v) => dictSet(d, k, v);
    if (args.length === 1 && isDict(args[0])) {
      for (const e of args[0].__dict.values()) {
        let k = e.k;
        if (typeof k === 'string') { const ka = Array.from(k); if (ka.length !== 1) E('ValueError', 'maketrans の辞書のキー（文字列）は1文字にしてください', ''); k = NUM(ka[0].codePointAt(0), false); }
        else if (!(isNum(k) && !k.f)) E('TypeError', 'maketrans の辞書のキーは1文字の文字列か整数にしてください', '');
        const v = e.v;
        if (!(isNone(v) || typeof v === 'string' || (isNum(v) && !v.f))) E('TypeError', 'maketrans の辞書の値は文字列・整数・None のいずれかにしてください', '');
        put(k, v);
      }
      return d;
    }
    if (typeof args[0] !== 'string' || (args[1] !== undefined && typeof args[1] !== 'string')) E('TypeError', 'str.maketrans() の1・2つ目は文字列にしてください', '');
    const x = Array.from(args[0]), y = args[1] !== undefined ? Array.from(args[1]) : null;
    if (y && x.length !== y.length) E('ValueError', 'maketrans の1つ目と2つ目は同じ長さにしてください', '');
    x.forEach((ch, i) => put(NUM(ch.codePointAt(0), false), y ? y[i] : ch));
    if (args[2] !== undefined) { if (typeof args[2] !== 'string') E('TypeError', 'str.maketrans() の3つ目は文字列にしてください', ''); for (const ch of Array.from(args[2])) put(NUM(ch.codePointAt(0), false), NONE); }
    return d;
  }
  // bytes／bytearray.maketrans(frm, to)：長さ256の変換表（bytes）を返す
  if (args.length !== 2) this.err(line, 'TypeError', tname + '.maketrans() には2つの引数が必要です', '');
  const frm = isBytesLike(args[0]) ? bytesOf(args[0]) : null, to = isBytesLike(args[1]) ? bytesOf(args[1]) : null;
  if (!frm || !to) E('TypeError', tname + '.maketrans() には bytes のような並びを2つ渡してください', '');
  if (frm.length !== to.length) E('ValueError', 'maketrans の2つの引数は同じ長さにしてください', '');
  const table = Array.from({ length: 256 }, (_, i) => i);
  frm.forEach((b, i) => { table[b] = to[i]; });
  return BYTESV(table);
};


/* ===== B6-Py2：str.format／format_map の本体 ===== */
Interp.prototype.strFormatImpl = function (obj, args, kwargs, env, line, mapping) {
  const E = (kind, msg, fix) => this.err(line, kind, msg, fix || '');
  const kwVals = {};
  if (mapping) { /* format_map：mapping は dict 値 */ }
  else for (const k of Object.keys(kwargs || {})) kwVals[k] = this.eval(kwargs[k], env);
  let autoIdx = 0, usedAuto = false, usedManual = false;
  const resolveField = (field) => {
    // field = 名前（空／数字／識別子）＋ (.属性 | [キー]) の連鎖
    const m = /^([^.[]*)(.*)$/.exec(field);
    const head = m[1]; let rest = m[2];
    let base;
    if (mapping) {
      const key = /^\d+$/.test(head) ? NUM(parseInt(head, 10), false) : head;
      base = dictGet(mapping, key);
      if (base === undefined) { const e = new SimDiag(line, 'KeyError', 'キー ' + reprVal(key) + ' は辞書にありません', ''); throw e; }
    } else if (head === '') {
      if (usedManual) E('ValueError', '自動番号（{}）と手動番号（{0}）は混ぜられません', '');
      usedAuto = true;
      if (autoIdx >= args.length) E('IndexError', '位置引数の番号が範囲外です（' + autoIdx + '）', '');
      base = args[autoIdx++];
    } else if (/^\d+$/.test(head)) {
      if (usedAuto) E('ValueError', '自動番号（{}）と手動番号（{0}）は混ぜられません', '');
      usedManual = true;
      const i = parseInt(head, 10);
      if (i >= args.length) E('IndexError', '位置引数の番号が範囲外です（' + i + '）', '');
      base = args[i];
    } else {
      if (!(head in kwVals)) E('KeyError', 'キー「' + head + '」に対応する引数がありません', '');
      base = kwVals[head];
    }
    while (rest) {
      if (rest[0] === '.') {
        const mm = /^\.([^.[]+)(.*)$/.exec(rest); const an = mm[1]; rest = mm[2];
        if (isComplex(base) && (an === 'real' || an === 'imag')) base = NUM(an === 'real' ? base.__complex.re : base.__complex.im, true);
        else if (isNum(base) && (an === 'real' || an === 'imag')) base = an === 'real' ? base : NUM(0, base.f);
        else if (isBool(base) && (an === 'real' || an === 'imag')) base = NUM(an === 'real' ? (base.v ? 1 : 0) : 0, false);
        else E('未対応', 'format の属性参照「.' + an + '」はこの説明では対応していません', '');
      } else if (rest[0] === '[') {
        const close = rest.indexOf(']'); if (close < 0) E('ValueError', '書式文字列の [ が閉じられていません', '');
        const keyS = rest.slice(1, close); rest = rest.slice(close + 1);
        if (isDict(base)) { const key = /^-?\d+$/.test(keyS) ? NUM(parseInt(keyS, 10), false) : keyS; const v = dictGet(base, key); if (v === undefined) E('KeyError', 'キー ' + reprVal(key) + ' は辞書にありません', ''); base = v; }
        else if (isList(base) || isTuple(base) || typeof base === 'string') { if (!/^-?\d+$/.test(keyS)) E('TypeError', '添字には整数を使ってください', ''); base = this.subGet(base, NUM(parseInt(keyS, 10), false), line); }
        else E('未対応', 'format の添字参照はこの説明では対応していません', '');
      } else E('ValueError', '書式文字列のフィールドが正しくありません', '');
    }
    return base;
  };
  const render = (s, depth) => {
    let out = ''; let i = 0;
    const a = Array.from(s);
    // Array.from だと位置がずれるため、通常の文字列走査で処理する
    out = ''; i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === '{') {
        if (s[i + 1] === '{') { out += '{'; i += 2; continue; }
        // フィールド終端（入れ子は spec 内の1段まで数える）
        let d = 1, j = i + 1;
        while (j < s.length && d > 0) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; }
        if (d > 0) E('ValueError', '書式文字列の { が閉じられていません', '');
        const inner = s.slice(i + 1, j - 1); i = j;
        // conv と spec の分離
        let fieldPart = inner, conv = null, spec = null;
        const colonAt = (() => { let dd = 0; for (let k = 0; k < inner.length; k++) { if (inner[k] === '{') dd++; else if (inner[k] === '}') dd--; else if (inner[k] === ':' && dd === 0) return k; } return -1; })();
        if (colonAt >= 0) { fieldPart = inner.slice(0, colonAt); spec = inner.slice(colonAt + 1); }
        const bangAt = fieldPart.indexOf('!');
        if (bangAt >= 0) { conv = fieldPart.slice(bangAt + 1); fieldPart = fieldPart.slice(0, bangAt); if (conv.length !== 1 || !'sra'.includes(conv)) E('ValueError', '変換指定「!' + conv + '」は使えません（!s／!r／!a のいずれか）', ''); }
        let value = resolveField(fieldPart);
        if (isUnk(value)) return null;
        let baseStr;
        if (conv === 'r') baseStr = reprVal(value);
        else if (conv === 'a') baseStr = reprVal(value).replace(/[^\x00-\x7f]/g, (c) => { const cp = c.codePointAt(0); return cp <= 0xff ? '\\x' + cp.toString(16).padStart(2, '0') : cp <= 0xffff ? '\\u' + cp.toString(16).padStart(4, '0') : '\\U' + cp.toString(16).padStart(8, '0'); });
        else if (conv === 's') baseStr = strVal(value);
        if (spec !== null && spec.includes('{')) {
          if (depth >= 1) E('未対応', '書式指定の中の入れ子が深すぎます', '');
          const sub = render(spec, depth + 1); if (sub === null) return null; spec = sub;
        }
        if (spec === null || spec === '') { out += conv ? baseStr : strVal(value); continue; }
        // fmtSpec は値そのものを受け取る。conv 済みの場合は文字列として整形する
        const target = conv ? baseStr : value;
        const r = fmtSpec(target, spec);
        if (r && r.__fmtErr) E(r.kind, r.msg, '');
        if (r === null) return null;
        out += r;
        continue;
      }
      if (ch === '}') {
        if (s[i + 1] === '}') { out += '}'; i += 2; continue; }
        E('ValueError', '書式文字列に単独の } があります', '');
      }
      out += ch; i++;
    }
    return out;
  };
  const r = render(obj, 0);
  if (r === null) { this.diag(line, 'note', '対応外', '書式指定の一部はこの説明では扱いません。その部分は「実行時に決まる値」として示します', ''); return UNK('format の結果'); }
  return r;
};

Interp.prototype.evalComp = function (n, env) {
  if (n.k === 'listcomp' && n.gen) { // ジェネレータ式は作るだけでは中身を評価しない（CPython と同じ遅延評価）
    const it = ITER([], 'generator');
    it.pull = this.genPull(n, env, it);
    return it;
  }
  const r = this.compResults(n, env);
  if (r.unk) return UNK('実行時に決まる内包表記の結果');
  if (n.k === 'listcomp') return LIST(r.items);
  if (n.k === 'setcomp') return SET(r.items);
  const d = DICT();
  for (const [k, v] of r.items) dictSet(d, k, v);
  return d;
};
// 遅延評価のジェネレータを、初めて消費される時点で実体化する
Interp.prototype.materialize = function (it) {
  if (!it) return;
  if (it.lazy && !it.done) {
    it.done = true;
    const r = this.compResults(it.lazy.n, it.lazy.env);
    if (r.unk) { it.failed = true; it.__iter = []; }
    else it.__iter = r.items;
  }
  if (it.pull) while (!it.exhausted && this.iterProduce(it) !== EXH) { /* 全件生産 */ }
};
// 遅延イテレータ（pull 付き）を1件だけ生産し、内部バッファへ足す
Interp.prototype.iterProduce = function (it) {
  if (it.exhausted) return EXH;
  const v = it.pull();
  if (v === EXH) { it.exhausted = true; return EXH; }
  it.__iter.push(v);
  return v;
};
// イテレータから次の1件を取り出す（無ければ EXH）。遅延イテレータは
// 必要になった時点で1件だけ生産するため、副作用・消費位置・短絡が
// 実 CPython のイテレータと同じになる（R7-136）。
Interp.prototype.iterPull = function (it) {
  if ((it.pos || 0) < it.__iter.length) return it.__iter[(it.pos = (it.pos || 0) + 1) - 1];
  if (it.lazy && !it.done) { this.materialize(it); return this.iterPull(it); }
  if (it.pull && !it.exhausted) {
    const v = this.iterProduce(it);
    if (v === EXH) return EXH;
    it.pos = (it.pos || 0) + 1;
    return v;
  }
  return EXH;
};
// イテレータの残りを全て取り出す
Interp.prototype.iterDrain = function (it) {
  const out = [];
  for (;;) { const v = this.iterPull(it); if (v === EXH) break; out.push(v); }
  return out;
};
// イテレータ自身またはその供給元イテレータが未確定（生産失敗）かどうか
Interp.prototype.iterFailed = function (it) {
  return !!it && (it.failed === true || (it.sources || []).some((s) => this.iterFailed(s)));
};
// 値から「1件ずつ取り出す関数」を作る。リストは元の配列をライブに読む
// （作成後の要素の書き換え・追加が消費時に見える。実 CPython の
// list_iterator と同じ）。作れない（未確定）場合は null、確定した
// 非イテラブルは従来どおり TypeError で止める。
Interp.prototype.srcPull = function (v, line) {
  if (isIter(v)) return () => this.iterPull(v);
  if (isList(v)) { const arr = v.__list; let i = 0; return () => (i < arr.length ? arr[i++] : EXH); }
  if (isTuple(v)) { const arr = v.__tuple; let i = 0; return () => (i < arr.length ? arr[i++] : EXH); }
  if (typeof v === 'string') { const arr = Array.from(v); let i = 0; return () => (i < arr.length ? arr[i++] : EXH); }
  if (v && v.__range) { const arr = v.__range; let i = 0; return () => (i < arr.length ? arr[i++] : EXH); }
  if (isBytesLike(v)) { const arr = bytesOf(v); let i = 0; return () => (i < arr.length ? NUM(arr[i++], false) : EXH); }
  if (isMemview(v)) { if (v.__memview.released) return null; const snap = mvBytes(v); let i = 0; return () => (i < snap.length ? NUM(snap[i++], false) : EXH); }
  if (isDict(v) || isView(v)) {
    let snap = null, i = 0;
    return () => {
      if (snap === null) snap = isView(v) ? viewItems(v) : [...v.__dict.values()].map((e) => e.k);
      return i < snap.length ? snap[i++] : EXH;
    };
  }
  if (v && v.__instance) { const seq = this.iterable(v, line, true); if (seq === null) return null; let i = 0; return () => (i < seq.length ? seq[i++] : EXH); } // B6-Py3：__iter__／__getitem__ を実体化して引く
  const seq = this.iterable(v, line);
  if (seq === null) return null;
  let i = 0;
  return () => (i < seq.length ? seq[i++] : EXH);
};
// ジェネレータ式の増分生産。内包表記の走査状態（子環境と JS ジェネレータ）を
// 保持し、消費のたびに1要素だけ評価する。走査対象や条件が未確定なら
// owner.failed を立てて生産を打ち切る（結果全体が未確定になる）。
Interp.prototype.genPull = function (n, env, owner) {
  const child = new Env(env);
  const self = this;
  let unk = false;
  function* gen(idx) {
    if (idx >= n.gens.length) { yield true; return; }
    const g = n.gens[idx];
    const it = self.eval(g.iter, child);
    const seq = self.iterable(it, n.line, isUnk(it));
    if (seq === null) { unk = true; return; }
    for (const item of seq) {
      self.tick();
      self.assignToQuiet(g.target, item, child);
      let ok = true;
      for (const c of g.conds) { const t = self.truthyOf(self.eval(c, child), n.line, child); if (t === null) { unk = true; return; } if (t !== true) { ok = false; break; } }
      if (ok) yield* gen(idx + 1);
    }
  }
  const g = gen(0);
  return () => {
    const r = g.next();
    if (unk) { owner.failed = true; return EXH; }
    if (r.done) return EXH;
    return self.eval(n.elt, child);
  };
};
Interp.prototype.compResults = function (n, env) {
  const child = new Env(env);
  const results = [];
  const self = this;
  let unk = false;
  function* gen(idx) {
    if (idx >= n.gens.length) { yield true; return; }
    const g = n.gens[idx];
    const it = self.eval(g.iter, child);
    const seq = self.iterable(it, n.line, isUnk(it));
    if (seq === null) { unk = true; return; }
    for (const item of seq) {
      self.tick();
      self.assignToQuiet(g.target, item, child);
      let ok = true;
      for (const c of g.conds) { const t = self.truthyOf(self.eval(c, child), n.line, child); if (t === null) { unk = true; return; } if (t !== true) { ok = false; break; } }
      if (ok) yield* gen(idx + 1);
    }
  }
  for (const _ of gen(0)) {
    if (unk) break;
    if (n.k === 'listcomp' || n.k === 'genexpr') results.push(this.eval(n.elt, child)); // genexpr も要素式を集める（分岐が無いと空扱いになり any/all が反転する）
    else if (n.k === 'setcomp') { const v = this.eval(n.elt, child); this.needHash(v, n.line); if (!results.some(x => eqVal(x, v) === true)) results.push(v); }
    else { const k = this.eval(n.keyE, child); const v = this.eval(n.valE, child); if (isUnk(k)) { unk = true; break; } this.needHash(k, n.line); results.push([k, v]); }
    if (results.length > 10000) { unk = true; break; }
  }
  return { unk, items: results };
};
Interp.prototype.assignToQuiet = function (t, v, env) {
  if (t.k === 'name') { env.set(t.name, v); return; }
  if (t.k === 'starred') { this.assignToQuiet(t.t, v, env); return; }
  if (t.k === 'ttuple') { const items = isList(v) ? v.__list : isTuple(v) ? v.__tuple : []; t.items.forEach((it, i) => this.assignToQuiet(it, items[i] || UNK(), env)); }
  if (t.k === 'tuple') { const items = isList(v) ? v.__list : isTuple(v) ? v.__tuple : []; t.items.forEach((it, i) => this.assignToQuiet(it.e, items[i] || UNK(), env)); }
};

function padTo(s, fill, align, width) {
  const len = [...s].length; if (len >= width) return s; const n = width - len;
  if (align === '<') return s + fill.repeat(n);
  if (align === '^') { const l = Math.floor(n / 2); return fill.repeat(l) + s + fill.repeat(n - l); }
  return fill.repeat(n) + s;
}
function groupDigits(intPart, g) { return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, g); }
// Python の書式指定（format spec）。
// 戻り値の契約（R30F01B-N3／バッチ9 N28 で是正）：
//   - 文字列：整形結果（従来どおり計算できる範囲）。
//   - null：正当だが本エンジンが未対応な指定（g／G／c、無限大・NaN の整形、
//     float の n 等）。呼び出し側は従来どおり「実行時に決まる値」として示す。
//   - {__fmtErr, kind, msg}：実 CPython が例外にする不正な指定。呼び出し側は
//     kind（ValueError／TypeError）で停止させる。未確定値には化けさせない。
// 一次情報：実 CPython 3.12.3 の format() 実走（報告書に突合表を記載）。
//   例：format(5,'q')／format('a','d')／format(5.5,'d') は ValueError、
//   format(True,'d') は '1'（bool は int として扱う。ただしエラー時の型名は
//   bool）、format([1],'>5') は TypeError（unsupported format string）、
//   format(5,'.2d') は ValueError（整数書式に精度は書けない）、
//   format('a','+s')／'#s'／'=5'／',s'／'zs' はいずれも ValueError。
const FMT_ERR = (kind, msg) => ({ __fmtErr: true, kind, msg });
function fmtSpec(v, fmt) {
  if (fmt === null || fmt === undefined || fmt === '') return strVal(v);
  const m = /^(?:([\s\S])?([<>^=]))?([+\- ]?)(z?)(#?)(0?)(\d*)([,_]?)(?:\.(\d+))?([bcdeEfFgGnosxX%]?)$/.exec(fmt);
  if (!m) return FMT_ERR('ValueError', '書式指定「' + fmt + '」が正しくありません（Invalid format specifier）');
  let [, fill, align, sign, zflag, alt, zero, width, group, prec, type] = m;
  const explicitAlign = align;
  width = width ? parseInt(width, 10) : 0; prec = prec !== undefined ? parseInt(prec, 10) : null;
  // ---- 文字列 ----
  if (typeof v === 'string') {
    if (type && type !== 's') return FMT_ERR('ValueError', '文字列に書式コード「' + type + '」は使えません（Unknown format code \'' + type + '\' for object of type \'str\'）');
    if (sign) return FMT_ERR('ValueError', '文字列の書式指定に符号は書けません（Sign not allowed in string format specifier）');
    if (zflag) return FMT_ERR('ValueError', '文字列の書式指定に z は書けません（Negative zero coercion (z) not allowed in string format specifier）');
    if (alt) return FMT_ERR('ValueError', '文字列の書式指定に # は書けません（Alternate form (#) not allowed in string format specifier）');
    if (group) return FMT_ERR('ValueError', '文字列の書式指定に桁区切り（' + group + '）は書けません（Cannot specify \'' + group + '\' with \'s\'）');
    if (explicitAlign === '=') return FMT_ERR('ValueError', '文字列の書式指定に = 揃えは書けません（\'=\' alignment not allowed in string format specifier）');
    // 0 フラグは文字列では符号側パディング（= 揃え）ではなく 0 埋めとして働く
    const sfill = fill !== undefined && explicitAlign !== undefined ? fill : (zero ? '0' : ' ');
    const body = prec !== null ? [...v].slice(0, prec).join('') : v;
    return padTo(body, sfill, explicitAlign || '<', width);
  }
  // ---- 複素数（B6-Py2：空の型指定と f／e 型＋幅・揃えのみ対応。それ以外は未対応として null） ----
  if (isComplex(v)) {
    if (prec !== null && !type) return null; // 型指定なし＋精度は未対応（捏造しない）
    if (type && !['f', 'F', 'e', 'E'].includes(type)) return null;
    if (group) return null;
    const { re, im } = v.__complex;
    const p2 = prec === null ? 6 : prec;
    const part = (x) => { if (!Number.isFinite(x)) return String(x); if (!type) { const s = cxPart(x); return s; } if (type === 'f' || type === 'F') return decFixed(x, p2).replace(/^-/, ''); const de = decExp(Math.abs(x), p2); return de.body + 'e' + (de.exp < 0 ? '-' : '+') + String(Math.abs(de.exp)).padStart(2, '0'); };
    let body;
    if (!type && prec === null) body = cxRepr(v);
    else {
      const reS = (re < 0 || Object.is(re, -0) ? '-' : (sign === '+' ? '+' : sign === ' ' ? ' ' : '')) + part(Math.abs(re));
      const imSign = (im < 0 || Object.is(im, -0)) ? '-' : '+';
      body = reS + imSign + part(Math.abs(im)) + 'j';
    }
    const a2 = align || '>';
    return padTo(body, fill || ' ', a2, width);
  }
  // ---- 数値以外（bool は数値として別扱い） ----
  const isBoolV = isBool(v);
  if (!isNum(v) && !isBoolV) {
    if (v && v.__instance) return null; // __format__ を持つ可能性があるため断定しない
    return FMT_ERR('TypeError', typeName(v) + ' には書式指定は使えません（unsupported format string passed to ' + typeName(v) + '.__format__）');
  }
  const nv = isBoolV ? NUM(v.v ? 1 : 0, false) : v;
  const tn = isBoolV ? 'bool' : (nv.f ? 'float' : 'int');
  const floatFmtType = (t) => t === 'e' || t === 'E' || t === 'f' || t === 'F' || t === 'g' || t === 'G' || t === '%';
  // 書式コード 's' は文字列専用。数値への 's' は実物では Unknown format code
  // の ValueError（型名は int／float／bool のいずれかで報告される）。
  if (type === 's') return FMT_ERR('ValueError', '書式コード「s」は文字列専用です（Unknown format code \'s\' for object of type \'' + tn + '\'）');
  if (!nv.f) {
    // ---- 整数（bool を含む） ----
    if (zflag && !floatFmtType(type)) return FMT_ERR('ValueError', '整数の書式指定に z は書けません（Negative zero coercion (z) not allowed in integer format specifier）');
    if (prec !== null && (!type || 'bcdoxXn'.includes(type))) return FMT_ERR('ValueError', '整数の書式指定に精度（.桁数）は書けません（Precision not allowed in integer format specifier）');
    if (type === 'g' || type === 'G' || type === 'c') return null; // 正当だが未対応
  } else {
    // ---- 小数 ----
    if (type && 'bcdoxX'.includes(type)) return FMT_ERR('ValueError', '小数に書式コード「' + type + '」は使えません（Unknown format code \'' + type + '\' for object of type \'float\'）');
    if (type === 'g' || type === 'G') return null; // 正当だが未対応
    if (!Number.isFinite(nv.v)) return null; // inf／nan の整形は正当だが未対応（不正なコードは上で停止済み）
  }
  if (fill !== undefined && explicitAlign === undefined) { fill = undefined; }
  if (!fill) fill = zero && !explicitAlign ? '0' : ' ';
  if (zero && !explicitAlign) align = '=';
  const x = nv.v;
  const neg = (x < 0 || (nv.f && Object.is(x, -0))) && !(zflag && nv.f && Object.is(x, -0)); const ax = Math.abs(x);
  let body;
  if (!type) { if (prec !== null) return null; body = nv.f ? pyFloatRepr(ax) : String(ax); }
  else if (type === 'd' || type === 'n') { if (nv.f || prec !== null) return null; body = String(ax); }
  else if (type === 'f' || type === 'F' || type === '%') { const p = prec === null ? 6 : prec; const scaled = type === '%' ? ax * 100 : ax; body = (Number.isFinite(scaled) ? decFixed(scaled, p).replace(/^-/, '') : (type === 'F' ? 'INF' : 'inf')) + (type === '%' ? '%' : ''); }
  else if (type === 'e' || type === 'E') { const p = prec === null ? 6 : prec; const de = decExp(ax, p); body = de.body + 'e' + (de.exp < 0 ? '-' : '+') + String(Math.abs(de.exp)).padStart(2, '0'); if (type === 'E') body = body.toUpperCase(); }
  else if ('bxXo'.includes(type)) { if (nv.f || prec !== null) return null; const base = { b: 2, o: 8, x: 16, X: 16 }[type]; body = ax.toString(base); if (type === 'X') body = body.toUpperCase(); if (alt) body = '0' + (type === 'X' ? 'X' : type) + body; }
  else return null;
  if (group) { const at = body.search(/[.e%]/); const ip = at < 0 ? body : body.slice(0, at); body = groupDigits(ip, group) + (at < 0 ? '' : body.slice(at)); }
  const signStr = neg ? '-' : sign === '+' ? '+' : sign === ' ' ? ' ' : '';
  const a = align || '>';
  if (a === '=') return signStr + padTo(body, fill, '>', Math.max(0, width - signStr.length));
  return padTo(signStr + body, fill, a, width);
}

/* ============ 入口 ============ */
// 各文の開始行→終了行の対応（複合文は本体の最後の行まで）。説明文から該当コード範囲へ跳ぶための構造情報。
function computeLineEnds(stmts) {
  const map = {};
  const endOf = (node) => {
    let e = (node && typeof node.line === 'number') ? node.line : 0;
    if (node && typeof node === 'object') for (const k of Object.keys(node)) { const v = node[k]; if (Array.isArray(v)) { for (const x of v) if (x && typeof x === 'object') e = Math.max(e, endOf(x)); } else if (v && typeof v === 'object') e = Math.max(e, endOf(v)); }
    return e;
  };
  const reg = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const x of node) reg(x); return; }
    if (typeof node.line === 'number') { const e = endOf(node); if (!(node.line in map) || map[node.line] < e) map[node.line] = e; }
    for (const k of Object.keys(node)) { if (k === 'line') continue; const v = node[k]; if (v && typeof v === 'object') reg(v); }
  };
  try { reg(stmts); } catch (e) { return {}; } // 深すぎる入れ子等では範囲なし（開始行のみ）に倒す
  return map;
}
// コード中で使われている関数・メソッドの呼び出しと、自作関数の定義行を集める（サイドパネル表示用）。
// 呼び出しのほか、デコレータ（@name）と、引数として渡される関数参照（map(str, xs) や key=len 等）も
// 「使っている関数」に数える。関数参照は、組み込み関数か自作関数と確定できる名前だけを採用する。
function collectUsed(stmts) {
  const calls = []; const seen = new Set(); const defLines = {}; const refs = [];
  const add = (name, kind) => { const key = kind + ':' + name; if (!seen.has(key)) { seen.add(key); calls.push({ name, kind }); } };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (node.k === 'call' && node.fn) {
      if (node.fn.k === 'name') add(node.fn.name, 'func');
      else if (node.fn.k === 'attr') add(node.fn.name, 'method');
      for (const a of node.args || []) if (a && a.e && a.e.k === 'name') refs.push(a.e.name);
      if (node.kwargs) for (const kn of Object.keys(node.kwargs)) { const v = node.kwargs[kn]; if (v && v.k === 'name') refs.push(v.name); }
    }
    if (node.k === 'decorator' && node.expr && node.expr.k === 'name') add(node.expr.name, 'func');
    if (node.k === 'def' && node.name && !(node.name in defLines)) defLines[node.name] = node.line || 0;
    for (const k of Object.keys(node)) { const v = node[k]; if (v && typeof v === 'object') walk(v); }
  };
  try { walk(stmts); } catch (e) { return { usedCalls: [], defLines: {} }; }
  for (const name of refs) if (BUILTIN_NAMES.includes(name) || (name in defLines)) add(name, 'func');
  return { usedCalls: calls, defLines };
}
function simulatePython(code) {
  const { lines, diags } = splitLines(String(code || ''));
  const allDiags = diags.slice();
  if (!lines.length) return { diags: allDiags, steps: [], output: [], outputLines: [], vars: [], lineEnds: {}, usedCalls: [], defLines: {}, empty: true };
  let stmts;
  try { stmts = parseProgram(lines); }
  catch (e) {
    if (e instanceof SimDiag) { allDiags.push({ line: e.line, level: 'error', kind: e.kind, msg: e.message, fix: e.fix }); return { diags: allDiags, steps: [], output: [], outputLines: [], vars: [], lineEnds: {}, usedCalls: [], defLines: {}, parseFailed: true }; }
    if (e instanceof RangeError) { allDiags.push({ line: 1, level: 'error', kind: '対応外', msg: 'コードの入れ子が深すぎて、この説明では読み取れませんでした', fix: '' }); return { diags: allDiags, steps: [], output: [], outputLines: [], vars: [], lineEnds: {}, usedCalls: [], defLines: {}, parseFailed: true }; }
    throw e;
  }
  const interp = new Interp();
  const r = interp.run(stmts);
  const used = collectUsed(stmts);
  return { diags: allDiags.concat(r.diags), steps: r.steps, output: r.output, outputLines: r.outputLines || [], vars: r.vars, dynCalls: r.dynCalls || [], lineEnds: computeLineEnds(stmts), usedCalls: used.usedCalls, defLines: used.defLines };
}

/* ============ 分岐パスの列挙 ============
   実行時に決まる分岐（if/elif の条件、while の条件、対象が不明な for）について、
   取りうる実行パスを列挙する。各パスは「分岐点でどちらに進んだか」の仮定の組み合わせで、
   仮定のもとで通常の解釈を1回ぶん走らせた結果（手順・出力・最終状態）をそのまま使う。
   値そのものは捏造しない（条件の成否だけを仮定し、中の値は従来どおり「実行時に決まる値」として伝わる）。
   列挙は上限で打ち切り、打ち切った場合は truncated で正直に知らせる。 */
// 分岐ノード（if/while/for）に、AST の出現順で安定した番号を付ける（対応付けは文字列ではなく構造で持つ）
function assignBids(stmts) {
  const map = new Map(); let n = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (node.k === 'if' || node.k === 'while' || node.k === 'for') map.set(node, n++);
    for (const k of Object.keys(node)) { const v = node[k]; if (v && typeof v === 'object') walk(v); }
  };
  try { walk(stmts); } catch (e) { /* 入れ子が深すぎる場合は付いた分だけ使う */ }
  return map;
}
// 表示結果の同一判定（手順・出力・最終状態・エラーが全く同じパスは、利用者から見て同じ説明なので1つにまとめる）
function visibleSig(r) {
  return JSON.stringify([
    r.steps.map(s => s.line + ':' + s.text),
    r.output,
    r.vars.map(v => v.name + '=' + v.value),
    r.diags.filter(d => d.level === 'error').map(d => d.line + ':' + d.kind + ':' + d.msg),
  ]);
}
const MAX_PATHS = 2000;      // 表示するパスの上限（分岐100件規模は普通にありうる前提で大きめに取る）
const MAX_PATH_RUNS = 8000;  // 列挙のために解釈を走らせる回数の上限
const MAX_CHOICE_FLIPS = 24; // 1パスあたり反転を試す選択点の上限
const MAX_PATH_MS = 1200;    // 列挙の総時間の上限（超えたら打ち切って truncated で正直に知らせる）
function simulatePythonPaths(code, options={}) {
  const text = String(code || '');
  const { lines, diags } = splitLines(text);
  const allDiags = diags.slice();
  if (!lines.length) return { paths: [], truncated: false, hasBranches: false, fatalResult: simulatePython(text) };
  let stmts;
  try { stmts = parseProgram(lines); }
  catch (e) { return { paths: [], truncated: false, hasBranches: false, fatalResult: simulatePython(text) }; }
  const bids = assignBids(stmts);
  const used = collectUsed(stmts);
  const lineEnds = computeLineEnds(stmts);
  const queue = [new Map()];
  const seen = new Set();
  const mapSig = (m) => [...m.entries()].map(([k, v]) => k + '=' + (v ? 1 : 0)).sort().join('|');
  const queuedSigs = new Set([mapSig(queue[0])]); // 同じ仮定の組み合わせを二度走らせない（列挙の終了条件）
  const paths = [];
  let truncated = false, hasBranches = false, runs = 0;
  const t0 = Date.now();
  while (queue.length && runs < MAX_PATH_RUNS) {
    if (runs > 0 && (runs & 15) === 0 && Date.now() - t0 > MAX_PATH_MS) { truncated = true; break; }
    const dec = queue.shift(); runs++;
    const ctx = { decisions: dec, log: [], counts: new Map(), bids, capped: false };
    let r;
    try { r = new Interp(Object.assign(ctx,{initial:options.initial,capture:options.capture})).run(stmts); }
    catch (e) { if (!paths.length) throw e; truncated = true; break; }
    const result = { captures:r.captures, diags: allDiags.concat(r.diags), steps: r.steps, output: r.output, outputLines: r.outputLines || [], vars: r.vars, dynCalls: r.dynCalls || [], lineEnds, usedCalls: used.usedCalls, defLines: used.defLines };
    if (ctx.log.length) hasBranches = true;
    if (ctx.capped) truncated = true;
    // RG-65（R18-N8）：解釈側で打ち切られた（予算超過など）ことも列挙結果の打ち切りに反映する。
    if (r.truncated) truncated = true;
    const sig = visibleSig(result);
    if (!ctx.infeasible && !seen.has(sig)) {
      seen.add(sig);
      if (paths.length < MAX_PATHS) paths.push({ choices: ctx.log.map(c => ({ line: c.line, kind: c.kind, taken: c.taken, text: c.text, capped: !!c.capped })), stepCount: r.steps.length, result });
      else truncated = true;
    }
    // この実行で見つけた選択点を1つずつ反転させた続きを列挙候補に加える（同じ組み合わせは二度入れない。
    // 打ち切り済みの選択点は反転しても意味がないので数えない）
    const flippable = ctx.log.filter(c => !c.capped);
    if (flippable.length > MAX_CHOICE_FLIPS) truncated = true;
    const flips = Math.min(flippable.length, MAX_CHOICE_FLIPS);
    for (let i = 0; i < flips; i++) {
      const child = new Map();
      for (let j = 0; j < i; j++) child.set(flippable[j].key, flippable[j].taken);
      child.set(flippable[i].key, !flippable[i].taken);
      const cs = mapSig(child);
      if (!queuedSigs.has(cs)) { queuedSigs.add(cs); queue.push(child); }
    }
    if (queue.length > 8000) { queue.splice(8000); truncated = true; }
    if (paths.length >= MAX_PATHS) { if (queue.length) truncated = true; break; }
  }
  if (queue.length) truncated = true;
  return { paths, truncated, hasBranches, maxPaths: MAX_PATHS, lineEnds, usedCalls: used.usedCalls, defLines: used.defLines };
}




function fromModel(v){if(v?.kind==='unknown')return UNK(v.source);if(v===null)return NONE;if(typeof v==='number')return NUM(v,!Number.isInteger(v));if(typeof v==='boolean')return BOOL(v);if(Array.isArray(v))return LIST(v.map(fromModel));if(typeof v==='object'){let d=DICT();for(let [k,x]of Object.entries(v)){let key=String(k);dictSet(d,key,fromModel(x));}return d;}return v;}
function toModel(v,seen=new Set()){if(isUnk(v))return{kind:'unknown',source:v.desc};if(isNum(v)||isBool(v))return v.v;if(isNone(v))return null;if(isList(v)||v?.__tuple){if(seen.has(v))return{kind:'unknown',source:'循環参照'};seen.add(v);return(v.__list||v.__tuple).map(x=>toModel(x,new Set(seen)));}if(isDict(v)){if(seen.has(v))return{kind:'unknown',source:'循環参照'};seen.add(v);return Object.fromEntries([...v.__dict.values()].map(x=>[String(x.k),toModel(x.v,new Set(seen))]));}if(isFunc(v))return{kind:'unknown',source:'関数オブジェクト'};if(v&&v.__native)return{kind:'unknown',source:reprVal(v)};if(v&&v.__ncls)return{kind:'unknown',source:v.__ncls};return v;}
/* 高度モード B7：標準ライブラリ実装モジュール（advanced/）が使う公開 API。
 * 値コンストラクタと判定・表示関数をそのまま渡す（NONE 等の単例を複製しない）。 */
const PyAPI = { NUM, BOOL, NONE, LIST, TUPLE, DICT, SET, RANGE, ITER, UNK, ELLIPSIS, NOTIMPLEMENTED, isNum, isBool, isNone, isList, isTuple, isDict, isSet, isUnk, isFunc, reprVal, reprFull, strVal, typeName, truthy, dictGet, dictSet, dictKeyId };
export {simulatePython,simulatePythonPaths,splitLines,parseProgram,collectUsed,UNK,fromModel,toModel,PyAPI};

function symbolic(v){if(isUnk(v))return v.symbolic||{kind:'unknown',source:v.desc,id:v.identity};if(isNum(v)||isBool(v))return v.v;if(isNone(v))return null;return v;}
