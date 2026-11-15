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
];
export function getDefinition(id) {
  return definitions.find((d) => d.id === id) || definitions[0];
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
  return d;
}
const ids = new Set();
for (let d of definitions) {
  validateDefinition(d);
  d.templates.forEach((t, i) => {
    t.level = t.level === "入門" ? "基礎" : (t.level || ["基礎", "実践", "応用"][i % 3]);
  });
  if (ids.has(d.id)) throw Error("種類idが重複しています");
  ids.add(d.id);
}
