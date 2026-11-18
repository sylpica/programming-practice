// 高度モード（ブロックB6）: C 標準ライブラリの意味論拡張の集約点。
// エリア別モジュール（lib-*-advanced.js）がエクスポートする
// handlers（名前→ハンドラ関数）と returnTypes（名前→戻り型の
// 文字列、または引数型の配列を受けて戻り型を返す関数）を合成し、
// c-family の library フックへ渡す { call, returnType } を返す。
// ハンドラの署名は
//   (args, values, s, api, node, H) => 値 | LIBRARY_UNHANDLED
// args は引数の AST 配列、values は評価済み引数値の配列、H は
// c-family 内部ヘルパー（typeOf / cString / isPtr / deref /
// targetPointer / width / allocate / isUnknown / formatPrintf /
// language / managed）。
import { LIBRARY_UNHANDLED } from "../../core/c-family.js";
import { handlers as mathHandlers, returnTypes as mathReturnTypes } from "./lib-math-advanced.js";
import { handlers as stringHandlers, returnTypes as stringReturnTypes } from "./lib-string-advanced.js";
import { handlers as stdlibHandlers, returnTypes as stdlibReturnTypes } from "./lib-stdlib-advanced.js";
import { handlers as stdioHandlers, returnTypes as stdioReturnTypes } from "./lib-stdio-advanced.js";
import { handlers as wideHandlers, returnTypes as wideReturnTypes } from "./lib-wide-advanced.js";

const AREAS = [
  ["math", mathHandlers, mathReturnTypes],
  ["string", stringHandlers, stringReturnTypes],
  ["stdlib", stdlibHandlers, stdlibReturnTypes],
  ["stdio", stdioHandlers, stdioReturnTypes],
  ["wide", wideHandlers, wideReturnTypes],
];

export function createCLibrary(H) {
  const table = {};
  const types = {};
  for (const [area, map, typeMap] of AREAS) {
    for (const [name, fn] of Object.entries(map)) {
      if (table[name])
        throw new Error(`C ライブラリハンドラの重複: ${name} (${area})`);
      table[name] = fn;
    }
    for (const [name, t] of Object.entries(typeMap || {})) {
      if (types[name])
        throw new Error(`C ライブラリ戻り型の重複: ${name} (${area})`);
      types[name] = t;
    }
  }
  return {
    call: (name, args, values, s, api, node) => {
      const fn = table[name];
      if (!fn) return LIBRARY_UNHANDLED;
      return fn(args, values, s, api, node, H);
    },
    returnType: (name, argTypes) => {
      const t = types[name];
      if (t === undefined) return null;
      return typeof t === "function" ? t(argTypes) : t;
    },
  };
}

export { LIBRARY_UNHANDLED };
