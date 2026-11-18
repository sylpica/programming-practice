// 高度モード ブロックB5（C#）：高度ファイル構成の宣言（契約 第5章）。
// engineFile は予約フック（applyAdvancedEngine）の置き場として宣言するが、
// フックの具体仕様は契約 R-3 で未決のため、現時点の意味論は advanced-engine.js に
// 分離したうえで c-family.js の managed 限定委譲ブロックから静的合成している。
export const advancedManifest = {
  referenceParts: ["reference-advanced.js"],
  templatesFile: "templates-advanced.js",
  glossaryFile: "glossary-advanced.js",
  engineFile: "advanced-engine.js",
};
