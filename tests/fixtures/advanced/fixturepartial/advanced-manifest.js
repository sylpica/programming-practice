// テスト用フィクスチャ: manifest に referenceParts だけを書き、
// templatesFile／glossaryFile を省略した種類を再現する（監査 D-2）。
// 省略されたキーの既定ファイルは「明示」ではないため、不存在は
// failed ではなく missing に入らなければならない。
export const advancedManifest = {
  referenceParts: ["reference-advanced.js"],
};
