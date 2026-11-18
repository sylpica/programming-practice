import { definition as cmd } from './cmd/index.js';
import { definition as powershell } from './powershell/index.js';
import { definition as vba } from "./vba/index.js";
import { definition as imagej } from "./imagej/index.js";
import { definition as cloudformation } from "./cloudformation/index.js";
import { definition as powerautomate } from "./powerautomate/index.js";
import { definition as autohotkey } from "./autohotkey/index.js";
import { definition as uivision } from "./uivision/index.js";
import { definition as powerapps } from "./powerapps/index.js";
import { definition as python } from "./python/index.js";
import { definition as r } from "./r/index.js";
import { definition as c } from "./c/index.js";
import { definition as cpp } from "./cpp/index.js";
import { definition as csharp } from "./csharp/index.js";
import { definition as javascript } from "./javascript/index.js";
import { pseudoDefinition as pseudo } from "./pseudo/index.js";
import { definition as powerautomatecloud } from "./powerautomatecloud/index.js";
export const definitions = [
  vba,
  imagej,
  cloudformation,
  powerautomate,
  autohotkey,
  uivision,
  powerapps,
  python,
  r,
  c,
  cpp,
  csharp,
  javascript,
  cmd,
  powershell,
  pseudo,
];
// 高度モードでのみ現れる種別（U-47：Power Automate（クラウド））。
// 簡易モードの種別集合（definitions）には含めない：definitions の件数や
// 基礎カタログ集計（全種別の項目数ピン等）は簡易モードの集合に対する
// ものとして従来どおりに保ち、表示可否は app.js がモードで振り分ける。
// getDefinition は両集合から引く（Worker が高度モードの実行で必要）。
powerautomatecloud.advancedOnly = true;
export const advancedOnlyDefinitions = [powerautomatecloud];
export function getDefinition(id) {
  return (
    definitions.find((d) => d.id === id) ||
    advancedOnlyDefinitions.find((d) => d.id === id) ||
    definitions[0]
  );
}
export function validateDefinition(d) {
  for (let key of [
    "id",
    "name",
    "extensions",
    "syntax",
    "reference",
    "templates",
    "semantics",
    "model",
    "scan",
    "simulate",
  ])
    if (!d[key]) throw Error(`種類定義に ${key} が必要です`);
  if (
    !Array.isArray(d.extensions) ||
    !d.extensions.every((x) => x.startsWith("."))
  )
    throw Error("拡張子の定義が不正です");
  // 共有UI契約（js/app.js が読む下位形状）の必須サブフィールド検査。
  // R30-N1／N2 の再発防止：model／semantics のキーの存在だけでは、
  // defaults や sources[].url が undefined のまま素通りし、実UIで
  // 初期値が文字列 "undefined" になる等の統合欠陥を検出できない。
  const model = d.model;
  if (typeof model !== "object" || model === null || Array.isArray(model))
    throw Error("種類定義の model が不正です");
  if (model.kind !== "json" && model.kind !== "sheet")
    throw Error("種類定義の model.kind が不正です");
  if (typeof model.title !== "string" || model.title.length === 0)
    throw Error("種類定義の model.title が必要です");
  if (typeof model.hint !== "string" || model.hint.length === 0)
    throw Error("種類定義の model.hint が必要です");
  if (
    typeof model.defaults !== "object" ||
    model.defaults === null ||
    Array.isArray(model.defaults)
  )
    throw Error("種類定義の model.defaults が必要です");
  const semantics = d.semantics;
  if (
    typeof semantics !== "object" ||
    semantics === null ||
    Array.isArray(semantics)
  )
    throw Error("種類定義の semantics が不正です");
  if (
    typeof semantics.description !== "string" ||
    semantics.description.length === 0
  )
    throw Error("種類定義の semantics.description が必要です");
  if (typeof semantics.support !== "string" || semantics.support.length === 0)
    throw Error("種類定義の semantics.support が必要です");
  if (!Array.isArray(semantics.sources) || semantics.sources.length === 0)
    throw Error("種類定義の semantics.sources が必要です");
  for (const source of semantics.sources) {
    if (
      !source ||
      typeof source.title !== "string" ||
      source.title.length === 0 ||
      typeof source.url !== "string" ||
      !source.url.startsWith("https://")
    )
      throw Error("種類定義の semantics.sources の title／url が不正です");
  }
  return d;
}
const ids = new Set();
for (let d of [...definitions, ...advancedOnlyDefinitions]) {
  validateDefinition(d);
  d.templates.forEach((t, i) => {
    t.level = t.level === "入門" ? "基礎" : (t.level || ["基礎", "実践", "応用"][i % 3]);
  });
  if (ids.has(d.id)) throw Error("種類idが重複しています");
  ids.add(d.id);
}
