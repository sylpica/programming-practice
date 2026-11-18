// 高度モード ブロックB5（JavaScript）：高度ファイル構成の宣言（契約 第5章）。
// engineFile は予約フック（applyAdvancedEngine）の置き場として宣言するが、
// フックの具体仕様は契約 R-3 で未決のため、現時点の意味論は advanced-engine.js に
// 分離したうえで index.js のディスパッチからの委譲で静的合成している。
export const advancedManifest = {
  referenceParts: ["reference-advanced.js"],
  templatesFile: "templates-advanced.js",
  glossaryFile: "glossary-advanced.js",
  engineFile: "advanced-engine.js",
};
