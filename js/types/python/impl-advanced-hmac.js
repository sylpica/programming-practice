/* 高度モード B7 G7：hmac。コアは impl-advanced-hashlib.js の HMAC 実装。
 * name 属性は CPython どおり 'hmac-<digestname>'。 */
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import { NONE, I, makeBytesVal, bytesArr, unkRet, onlyKw } from './impl-advanced-g7-common.js';
import { HASH_INFO, hmacBytes, isHashObj, hashObjDigest } from './impl-advanced-hashlib.js';

function resolveDigestmod(ctx, dm) {
  if (typeof dm === 'string') {
    const name = dm.toLowerCase();
    if (HASH_INFO[name] && !HASH_INFO[name].shake && !HASH_INFO[name].blake) return name;
    ctx.err('ValueError', 'unsupported hash type', '');
  }
  if (isHashObj(dm)) return dm.data.algo;
  if (ctx.isUnk(dm)) return null;
  ctx.err('TypeError', 'digestmod must be a hash name, hash object, or callable', '');
  return null;
}
function computeDigest(data) {
  return hmacBytes(data.algo, data.key, data.msg);
}
const HMAC_Q = 'hmac.HMAC';
function hmacNew(ctx, args, kwargs) {
  if (args.length < 1 || args.length > 3) ctx.err('TypeError', 'new() takes from 1 to 3 positional arguments', '');
  const key = bytesArr(args[0]);
  if (key === null) { if (ctx.isUnk(args[0])) return unkRet(ctx, 'hmac.new の鍵'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
  const msg = args.length >= 2 && !ctx.isNone(args[1]) ? bytesArr(args[1]) : [];
  if (msg === null) { if (ctx.isUnk(args[1])) return unkRet(ctx, 'hmac.new のメッセージ'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
  const dm = args.length >= 3 ? args[2] : (kwargs.digestmod !== undefined ? kwargs.digestmod : 'md5');
  const algo = resolveDigestmod(ctx, dm);
  if (algo === null) return unkRet(ctx, 'hmac.new の digestmod');
  return ctx.native(HMAC_Q, { algo, key: [...key], msg: [...msg] });
}

const HMAC_DEF = {
  typeName: 'HMAC',
  construct: (ctx, args, kwargs) => {
    if (args.length < 1 || args.length > 3) ctx.err('TypeError', 'HMAC() takes from 1 to 3 positional arguments', '');
    const key = bytesArr(args[0]);
    if (key === null) { if (ctx.isUnk(args[0])) return unkRet(ctx, 'hmac の鍵'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
    const msg = args.length >= 2 && !ctx.isNone(args[1]) ? bytesArr(args[1]) : [];
    if (msg === null) { if (ctx.isUnk(args[1])) return unkRet(ctx, 'hmac のメッセージ'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
    const dm = args.length >= 3 ? args[2] : (kwargs.digestmod !== undefined ? kwargs.digestmod : null);
    if (dm === null) ctx.err('TypeError', 'HMAC() missing required argument: digestmod', '');
    const algo = resolveDigestmod(ctx, dm);
    if (algo === null) return unkRet(ctx, 'hmac の digestmod');
    return ctx.native(HMAC_Q, { algo, key: [...key], msg: [...msg] });
  },
  methods: {
    update: (ctx, self, args) => {
      if (args.length !== 1) ctx.err('TypeError', 'update() takes exactly one argument', '');
      const a = bytesArr(args[0]);
      if (a === null) { if (ctx.isUnk(args[0])) return NONE; ctx.err('TypeError', 'object supporting the buffer API required', ''); }
      self.data.msg.push(...a);
      return NONE;
    },
    digest: (ctx, self) => makeBytesVal(computeDigest(self.data)),
    hexdigest: (ctx, self) => computeDigest(self.data).map((b) => b.toString(16).padStart(2, '0')).join(''),
    copy: (ctx, self) => ctx.native(HMAC_Q, { algo: self.data.algo, key: [...self.data.key], msg: [...self.data.msg] }),
  },
  attrs: {
    name: (ctx, self) => 'hmac-' + self.data.algo,
    digest_size: (ctx, self) => I(HASH_INFO[self.data.algo].digestSize),
    block_size: (ctx, self) => I(HASH_INFO[self.data.algo].blockSize),
  },
};

registerStdlibModule('hmac', {
  classes: { HMAC: HMAC_DEF },
  functions: {
    new: hmacNew,
    digest: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'hmac.digest');
      if (args.length !== 3) ctx.err('TypeError', 'digest() takes exactly 3 positional arguments', '');
      const key = bytesArr(args[0]), msg = bytesArr(args[1]);
      if (key === null || msg === null) { if (ctx.isUnk(args[0]) || ctx.isUnk(args[1])) return unkRet(ctx, 'hmac.digest の入力'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
      const algo = resolveDigestmod(ctx, args[2]);
      if (algo === null) return unkRet(ctx, 'hmac.digest の digestmod');
      return makeBytesVal(hmacBytes(algo, key, msg));
    },
    compare_digest: (ctx, args, kwargs) => {
      onlyKw(ctx, kwargs, [], 'hmac.compare_digest');
      if (args.length !== 2) ctx.err('TypeError', 'compare_digest() takes exactly 2 positional arguments', '');
      const [a, b] = args;
      const ab = bytesArr(a), bb = bytesArr(b);
      if (typeof a === 'string' && typeof b === 'string') {
        if (/[^\x00-\x7f]/.test(a) || /[^\x00-\x7f]/.test(b)) ctx.err('TypeError', 'comparing strings with non-ASCII characters is not supported', '');
        let eq = a.length === b.length;
        for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) eq = false;
        const { BOOL } = ctx.V;
        return BOOL(eq && a.length === b.length);
      }
      if (ab !== null && bb !== null) {
        let eq = ab.length === bb.length;
        for (let i = 0; i < Math.min(ab.length, bb.length); i++) if (ab[i] !== bb[i]) eq = false;
        return ctx.V.BOOL(eq);
      }
      if (ctx.isUnk(a) || ctx.isUnk(b)) return unkRet(ctx, 'compare_digest の入力');
      ctx.err('TypeError', 'unsupported operand types for compare_digest', '');
      return ctx.V.BOOL(false);
    },
  },
});
