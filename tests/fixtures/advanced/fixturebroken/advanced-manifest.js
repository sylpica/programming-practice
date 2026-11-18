// テスト用フィクスチャ: manifest に明示されたファイルの失敗を再現する。
// reference-missing.js と engine-missing.js は意図的に存在しない。
// templates-bad.js は export の型が不正。
export const advancedManifest = {
  referenceParts: ["reference-ok.js", "reference-missing.js"],
  templatesFile: "templates-bad.js",
  glossaryFile: null,
  engineFile: "engine-missing.js",
};
