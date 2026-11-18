/* 高度モード B7 G13：secrets（9件）。
 *
 * 一次情報：CPython 3.12.3 の Lib/secrets.py と実走。
 * 乱数源は OS のエントロピーであり、生成される「値そのもの」は原理的に
 * 再現・照合できない。そのため生成系は status を unverified とし、実装は
 * 形式（長さ・文字集合・範囲）と決定的な端ケース（0 件・空列・負数の
 * エラー）だけを正確に再現し、乱数部分は未確定（UNK）として返す。
 * compare_digest は hmac 由来の純粋な定数時間比較で、完全に実装する。
 * DEFAULT_ENTROPY はデータ（32）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  BOOL, NONE, UNK, I, isNum, isBool, isNone, isUnk, noKw, arity,
  isBytesVal, bytesArr, makeBytesVal,
} from './impl-advanced-g13-common.js';

const RAND_DESC = 'OS の乱数で決まる値・この説明では確定しません';
function nonnegInt(ctx, v, fname, bitLengthErr) {
  if (isUnk(v)) return null;
  if (isBool(v)) return v.v ? 1 : 0;
  if (isNum(v) && !v.f) return v.v;
  if (isNum(v) && v.f && bitLengthErr) ctx.err('AttributeError', "'float' object has no attribute 'bit_length'", '');
  ctx.err('TypeError', "'" + ctx.typeName(v) + "' object cannot be interpreted as an integer", '');
  return null;
}
function randbelowFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'randbelow'); arity(ctx, args, 1, 1, 'randbelow');
  const n = nonnegInt(ctx, args[0], 'randbelow', true);
  if (n === null) return UNK(RAND_DESC);
  if (n <= 0) ctx.err('ValueError', 'Upper bound must be positive.', '');
  if (n === 1) return I(0);
  ctx.diag('randbelow の戻り値は OS の乱数で決まるため、この説明では確定しません（範囲は 0 以上 ' + n + ' 未満です）');
  return ctx.unk(RAND_DESC);
}
function randbitsFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'randbits'); arity(ctx, args, 1, 1, 'randbits');
  const k = nonnegInt(ctx, args[0], 'randbits', false);
  if (k === null) return UNK(RAND_DESC);
  if (k < 0) ctx.err('ValueError', 'number of bits must be non-negative', '');
  if (k === 0) return I(0);
  ctx.diag('randbits の戻り値は OS の乱数で決まるため、この説明では確定しません（' + k + ' ビットの非負整数です）');
  return ctx.unk(RAND_DESC);
}
function choiceFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'choice'); arity(ctx, args, 1, 1, 'choice');
  const seq = args[0];
  if (isUnk(seq)) return UNK(RAND_DESC);
  let items = null;
  if (typeof seq === 'string') items = Array.from(seq);
  else { const l = ctx.listOf(seq); if (l) items = l; }
  if (items === null) {
    // range やイテラブル等：エンジンの iterable で取り出す
    const it = ctx.iterable(seq);
    if (!it) ctx.err('TypeError', "'" + ctx.typeName(seq) + "' object is not subscriptable", '');
    items = it;
  }
  if (items.length === 0) ctx.err('IndexError', 'Cannot choose from an empty sequence', '');
  if (items.length === 1) return items[0];
  ctx.diag('choice の選択結果は OS の乱数で決まるため、この説明では確定しません');
  return ctx.unk(RAND_DESC);
}
function tokenBytesFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'token_bytes');
  const n = args.length ? nonnegInt(ctx, args[0], 'token_bytes', false) : 32;
  if (n === null) return UNK(RAND_DESC);
  if (n < 0) ctx.err('ValueError', 'negative argument not allowed', '');
  if (n === 0) return makeBytesVal([]);
  ctx.diag('token_bytes の内容は OS の乱数で決まるため、この説明では確定しません（長さ ' + n + ' バイトです）');
  return ctx.unk(RAND_DESC);
}
function tokenHexFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'token_hex');
  const n = args.length ? nonnegInt(ctx, args[0], 'token_hex', false) : 32;
  if (n === null) return UNK(RAND_DESC);
  if (n < 0) ctx.err('ValueError', 'negative argument not allowed', '');
  if (n === 0) return '';
  ctx.diag('token_hex の内容は OS の乱数で決まるため、この説明では確定しません（' + (2 * n) + ' 文字の16進文字列です）');
  return ctx.unk(RAND_DESC);
}
function tokenUrlsafeFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'token_urlsafe');
  const n = args.length ? nonnegInt(ctx, args[0], 'token_urlsafe', false) : 32;
  if (n === null) return UNK(RAND_DESC);
  if (n < 0) ctx.err('ValueError', 'negative argument not allowed', '');
  if (n === 0) return '';
  ctx.diag('token_urlsafe の内容は OS の乱数で決まるため、この説明では確定しません（URL-safe な base64 文字列です）');
  return ctx.unk(RAND_DESC);
}
function compareDigestFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'compare_digest'); arity(ctx, args, 2, 2, 'compare_digest');
  const [a, b] = args;
  if (isUnk(a) || isUnk(b)) return UNK('compare_digest');
  const aStr = typeof a === 'string', bStr = typeof b === 'string';
  const aBytes = bytesArr(a) !== null, bBytes = bytesArr(b) !== null;
  if (aStr && bStr) {
    if (!/^[\x00-\x7F]*$/.test(a) || !/^[\x00-\x7F]*$/.test(b)) ctx.err('TypeError', 'comparing strings with non-ASCII characters is not supported', '');
    return BOOL(a === b);
  }
  if (aBytes && bBytes) {
    const x = bytesArr(a), y = bytesArr(b);
    return BOOL(x.length === y.length && x.every((v, i) => v === y[i]));
  }
  if (aStr || bStr) ctx.err('TypeError', "a bytes-like object is required, not 'str'", '');
  ctx.err('TypeError', "unsupported operand types(s) or combination of types: '" + ctx.typeName(a) + "' and '" + ctx.typeName(b) + "'", '');
  return BOOL(false);
}

registerStdlibModule('secrets', {
  data: { DEFAULT_ENTROPY: I(32) },
  classes: {
    SystemRandom: {
      typeName: 'SystemRandom',
      construct(ctx, args, kwargs) {
        // random.SystemRandom は引数を取らない（seed は無視される設計だが
        // CPython の SystemRandom() は引数なし）。生成値が乱数のため
        // インスタンスのメソッド結果は未確定になる。
        return ctx.native('secrets.SystemRandom', {});
      },
      methods: {
        randbelow: (ctx, self, args, kwargs) => randbelowFn(ctx, args, kwargs),
        getrandbits: (ctx, self, args, kwargs) => randbitsFn(ctx, args, kwargs),
        choice: (ctx, self, args, kwargs) => choiceFn(ctx, args, kwargs),
        randbytes: (ctx, self, args, kwargs) => tokenBytesFn(ctx, args, kwargs),
      },
    },
  },
  functions: {
    choice: choiceFn,
    randbelow: randbelowFn,
    randbits: randbitsFn,
    token_bytes: tokenBytesFn,
    token_hex: tokenHexFn,
    token_urlsafe: tokenUrlsafeFn,
    compare_digest: compareDigestFn,
  },
});
