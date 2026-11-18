/* 高度モード B7 G8：pyclbr モジュール（全19件）。
 * 一次情報：公式ドキュメント 3.15（library/pyclbr）と CPython 本体
 * Lib/pyclbr.py（コンストラクタの意味論を実走で照合）。
 * 方針：Class／Function は素朴なデータ保持クラスとして忠実に再現
 * できる。モジュール読み取り系はファイル前提のため未対応。 */
import { PyAPI } from './engine.js';
import { BOOL, NONE, LIST, DICT, unsupportedFn } from './impl-advanced-g8-common.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';

const { dictSet } = PyAPI;

const classDef = {
  typeName: 'Class',
  construct: (ctx, args, kwargs) => {
    if (args.length < 5) ctx.err('TypeError', 'Class() の引数が不足しています', '');
    const [module, name, superArg, file, lineno] = args;
    const parent = args.length > 5 ? args[5] : NONE;
    const endLineno = 'end_lineno' in kwargs ? kwargs.end_lineno : NONE;
    return ctx.native('pyclbr.Class', {
      module, name,
      super: PyAPI.isNone(superArg) ? LIST([]) : superArg,
      file, lineno, parent, endLineno,
      methods: DICT(), children: DICT(),
    });
  },
  attrs: {
    module: (ctx, self) => self.data.module,
    name: (ctx, self) => self.data.name,
    super: (ctx, self) => self.data.super,
    file: (ctx, self) => self.data.file,
    lineno: (ctx, self) => self.data.lineno,
    parent: (ctx, self) => self.data.parent,
    end_lineno: (ctx, self) => self.data.endLineno,
    methods: (ctx, self) => self.data.methods,
    children: (ctx, self) => self.data.children,
  },
};
registerStdlibClass('pyclbr.Class', classDef);

const functionDef = {
  typeName: 'Function',
  construct: (ctx, args, kwargs) => {
    if (args.length < 4) ctx.err('TypeError', 'Function() の引数が不足しています', '');
    const [module, name, file, lineno] = args;
    const parent = args.length > 4 ? args[4] : NONE;
    const isAsync = args.length > 5 ? args[5] : false;
    const endLineno = 'end_lineno' in kwargs ? kwargs.end_lineno : NONE;
    return ctx.native('pyclbr.Function', {
      module, name, file, lineno, parent,
      isAsync: typeof isAsync === 'object' ? ctx.truthy(isAsync) === true : !!isAsync,
      endLineno, children: DICT(),
    });
  },
  attrs: {
    module: (ctx, self) => self.data.module,
    name: (ctx, self) => self.data.name,
    file: (ctx, self) => self.data.file,
    lineno: (ctx, self) => self.data.lineno,
    parent: (ctx, self) => self.data.parent,
    is_async: (ctx, self) => BOOL(self.data.isAsync),
    end_lineno: (ctx, self) => self.data.endLineno,
    children: (ctx, self) => self.data.children,
  },
};
registerStdlibClass('pyclbr.Function', functionDef);

registerStdlibModule('pyclbr', {
  functions: {
    readmodule: unsupportedFn('pyclbr.readmodule', 'モジュールファイルの読み取りが前提で、エンジンでは再現できない'),
    readmodule_ex: unsupportedFn('pyclbr.readmodule_ex', 'モジュールファイルの読み取りが前提で、エンジンでは再現できない'),
  },
  classes: {
    Class: classDef,
    Function: functionDef,
  },
});
