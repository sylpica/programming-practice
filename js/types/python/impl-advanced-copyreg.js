/* 高度モード B7 G13：copyreg（2件）。
 * 一次情報：CPython 3.12.3 の Lib/copyreg.py。pickle() は呼び出し可能性を
 * 検証して dispatch_table に登録し、constructor_ob があれば constructor()
 * を呼ぶ。constructor() は呼び出し可能性の検証のみで None を返す。
 * 登録表はモジュール内状態として保持する（dispatch_table 自体は本群の
 * リファレンス項目外。pickle モジュール本体との接続は基盤要請として
 * 報告書に挙げる）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  NONE, isUnk, isCallableVal,
} from './impl-advanced-g13-common.js';

const dispatchTable = new Map();
function typeKey(ctx, v) {
  if (v && v.__ncls) return 'cls:' + v.__ncls;
  if (v && v.__builtin) return 'builtin:' + v.__builtin;
  if (v && v.__native) return 'native:' + v.__native;
  return 'val:' + ctx.repr(v);
}

registerStdlibModule('copyreg', {
  functions: {
    pickle: (ctx, args, kwargs) => {
      const names = ['ob_type', 'pickle_function', 'constructor_ob'];
      const all = [...args];
      for (const k of Object.keys(kwargs || {})) {
        const idx = names.indexOf(k);
        if (idx === -1) ctx.err('TypeError', "pickle() got an unexpected keyword argument '" + k + "'", '');
        if (idx < args.length) ctx.err('TypeError', "pickle() got multiple values for argument '" + k + "'", '');
        all[idx] = kwargs[k];
      }
      if (all.length < 2 || all.length > 3 || all[0] === undefined || all[1] === undefined) ctx.err('TypeError', 'pickle() takes 2 to 3 positional arguments but ' + args.length + ' were given', '');
      const [obType, fn, ctorOb] = all;
      if (isUnk(obType) || isUnk(fn)) return UNK('copyreg.pickle');
      if (!isCallableVal(fn)) ctx.err('TypeError', 'reduction functions must be callable', '');
      dispatchTable.set(typeKey(ctx, obType), fn);
      if (all.length === 3 && ctorOb !== undefined && !ctx.isNone(ctorOb)) {
        if (isUnk(ctorOb)) return UNK('copyreg.pickle');
        if (!isCallableVal(ctorOb)) ctx.err('TypeError', 'constructors must be callable', '');
      }
      return NONE;
    },
    constructor: (ctx, args, kwargs) => {
      for (const k of Object.keys(kwargs || {})) {
        if (k !== 'object') ctx.err('TypeError', "constructor() got an unexpected keyword argument '" + k + "'", '');
        if (args.length) ctx.err('TypeError', "constructor() got multiple values for argument 'object'", '');
        args = [kwargs[k]];
      }
      if (args.length !== 1) ctx.err('TypeError', 'constructor() takes exactly one argument (' + args.length + ' given)', '');
      if (isUnk(args[0])) return UNK('copyreg.constructor');
      if (!isCallableVal(args[0])) ctx.err('TypeError', 'constructors must be callable', '');
      return NONE;
    },
  },
});
