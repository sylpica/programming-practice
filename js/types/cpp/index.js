import { additionalTemplates } from "./additional-templates.js";
import { createCFamily } from "../../core/c-family.js";
export const definition = createCFamily({
  id: "cpp",
  name: "C++",
  extensions: [".cpp", ".cc", ".cxx", ".hpp", ".h", ".txt"],
  language: "cpp",
});

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);

// B8: scan 拡張。基礎項目の解決（scanScript）は従来どおり維持し、
// 宣言から「変数→表示クラス」の対応を作って、変数.メンバ／変数->メンバ／
// クラス::メンバ の形から高度メンバ項目名（std::vector::push_back 等）を
// 追加で返す。リファレンスに存在する名前だけを、出現順・重複なしで足す。
const baseScan = definition.scan;
const MEMBER_CLASSES = ["vector", "array", "pair", "string"];
const ITERATOR_NAMES = [
  "iterator",
  "const_iterator",
  "reverse_iterator",
  "const_reverse_iterator",
];

function scanTokens(code) {
  const text = String(code)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
  const tokens = [];
  const re = /[A-Za-z_][A-Za-z0-9_]*|::|->|\S/g;
  let m;
  while ((m = re.exec(text))) tokens.push(m[0]);
  return tokens;
}
const isId = (t) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(t || "");

function skipAngles(tokens, i) {
  // tokens[i] === "<" の位置から対応する ">" の次を返す。
  let depth = 0;
  while (i < tokens.length) {
    if (tokens[i] === "<") depth++;
    else if (tokens[i] === ">") {
      depth--;
      if (depth === 0) return i + 1;
    } else if (tokens[i] === ">>") {
      depth -= 2;
      if (depth <= 0) return i + 1;
    }
    i++;
  }
  return i;
}

function collectDeclarations(tokens) {
  // varClass: 変数名 → 表示クラス（std::vector 等）
  // varIterElem: イテレータ変数名 → 指す要素の表示クラス（-> 解決用）
  const varClass = new Map(),
    varIterElem = new Map();
  for (let i = 0; i < tokens.length; i++) {
    let j = i,
      cls = null;
    if (tokens[j] === "std" && tokens[j + 1] === "::") j += 2;
    if (!MEMBER_CLASSES.includes(tokens[j])) continue;
    cls = "std::" + tokens[j];
    j++;
    let elemClass = cls;
    if (tokens[j] === "<") {
      // テンプレート引数の先頭がクラスなら要素クラスとして使う（pair 等）。
      const first = tokens[j + 1];
      if (MEMBER_CLASSES.includes(first)) elemClass = "std::" + first;
      else if (first === "std" && tokens[j + 2] === "::" && MEMBER_CLASSES.includes(tokens[j + 3]))
        elemClass = "std::" + tokens[j + 3];
      j = skipAngles(tokens, j);
    } else if (cls !== "std::string") continue;
    let isIter = false;
    if (tokens[j] === "::" && ITERATOR_NAMES.includes(tokens[j + 1])) {
      isIter = true;
      j += 2;
    }
    // 宣言子列： , 区切りで ; まで。初期化子は深さ0の , ; で判定する。
    let depth = 0,
      expectName = true;
    for (; j < tokens.length; j++) {
      const t = tokens[j];
      if (["(", "[", "{"].includes(t)) depth++;
      else if ([")", "]", "}"].includes(t)) {
        if (depth === 0) break;
        depth--;
      } else if (depth === 0 && t === ";") break;
      else if (depth === 0 && t === ",") expectName = true;
      else if (depth === 0 && expectName && isId(t)) {
        if (isIter) varIterElem.set(t, elemClass);
        else varClass.set(t, cls);
        expectName = false;
      }
    }
  }
  return { varClass, varIterElem };
}

function advancedMemberScan(code) {
  const tokens = scanTokens(code);
  const { varClass, varIterElem } = collectDeclarations(tokens);
  const found = [];
  const push = (name) => {
    if (!found.includes(name)) found.push(name);
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // クラス::メンバ / std::クラス::メンバ / クラス<...>::メンバ
    let j = i,
      cls = null;
    if (t === "std" && tokens[j + 1] === "::" && MEMBER_CLASSES.includes(tokens[j + 2])) {
      cls = "std::" + tokens[j + 2];
      j += 3;
    } else if (MEMBER_CLASSES.includes(t)) {
      cls = "std::" + t;
      j += 1;
    }
    if (cls) {
      let k = j;
      if (tokens[k] === "<") k = skipAngles(tokens, k);
      if (tokens[k] === "::" && isId(tokens[k + 1])) {
        const member = tokens[k + 1];
        if (!ITERATOR_NAMES.includes(member)) push(`${cls}::${member}`);
        continue;
      }
    }
    // 変数.メンバ
    if (isId(t) && varClass.has(t) && tokens[i + 1] === "." && isId(tokens[i + 2]))
      push(`${varClass.get(t)}::${tokens[i + 2]}`);
    // 変数->メンバ（イテレータ経由は要素クラスで解決）
    if (isId(t) && tokens[i + 1] === "->" && isId(tokens[i + 2])) {
      if (varIterElem.has(t)) push(`${varIterElem.get(t)}::${tokens[i + 2]}`);
      else if (varClass.has(t)) push(`${varClass.get(t)}::${tokens[i + 2]}`);
    }
  }
  return found;
}

// 名前空間スコープ項目（std::sort、std::numbers::pi 等）の解決。
// scanScript は "." 区切りしか照合しないため、"::" 区切りの名前は
// トークン列の連続部分列として照合する。演算子名など識別子だけで
// 構成できない名前は対象外（リファレンス検索で到達可能）。
function advancedNamespaceScan(code, names) {
  const tokens = scanTokens(code);
  const found = [];
  for (const name of names) {
    if (!name.includes("::")) continue;
    const parts = name.split("::");
    if (!parts.every((p) => isId(p))) continue;
    outer: for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== parts[0]) continue;
      let k = i;
      for (let j = 1; j < parts.length; j++) {
        if (tokens[k + 1] !== "::" || tokens[k + 2] !== parts[j])
          continue outer;
        k += 2;
      }
      found.push(name);
      break;
    }
  }
  return found;
}

definition.scan = (code) => {
  const base = baseScan(code);
  try {
    const names = new Set(definition.reference.map((r) => r.name));
    const extra = advancedMemberScan(code).filter(
      (n) => names.has(n) && !base.includes(n),
    );
    const nsExtra = advancedNamespaceScan(code, names).filter(
      (n) => !base.includes(n) && !extra.includes(n),
    );
    return [...base, ...extra, ...nsExtra];
  } catch {
    return base;
  }
};
