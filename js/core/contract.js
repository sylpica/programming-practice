import { unknownLabel } from "./presentation.js";
export const LIMITS = Object.freeze({
  paths: 2000,
  operations: 100000,
  milliseconds: 1200,
  steps: 600,
  iterations: 100,
  source: 100000,
  depth: 64,
});
export const isUnknown = (v) =>
  !!v && typeof v === "object" && v.kind === "unknown";
export const unknown = (source, id = source) => ({
  kind: "unknown",
  source,
  id,
});
export function formatValue(v) {
  // RG-51：BigInt は実 JavaScript の表記（末尾 n）で表示する。
  if (typeof v === "bigint") return v.toString() + "n";
  if (isUnknown(v)) return unknownLabel(v);
  if (v?.kind === "NA") return "NA（欠損値）";
  if (v?.kind === "uninitialized" || v?.kind === "js-uninitialized") return "未初期化";
  if (v?.kind === "pointer") return `モデル上の参照先 ${v.object}・要素位置 ${v.offset}（実アドレスではありません）`;
  if (v === undefined) return "未設定";
  if (typeof v === "string") return v;
  if (v === null) return "null";
  return typeof v === "object" ? JSON.stringify(safe(v), null, 2) : String(v);
}
export function refsInTrace(path) {
  return [...new Set((path?.trace || []).flatMap((t) => t.refs || []))];
}

function safe(v, seen = new Map(), path = "$") {
  if (typeof v === "bigint") return v.toString() + "n";
  if (isUnknown(v)) return unknownLabel(v);
  if (v?.kind === "NA") return "NA（欠損値）";
  if (v?.kind === "uninitialized" || v?.kind === "js-uninitialized") return "未初期化";
  if (v?.kind === "pointer") return `モデル上の参照先 ${v.object}・要素位置 ${v.offset}（実アドレスではありません）`;
  if (v === undefined) return "未設定";
  if (typeof v === "number" && !Number.isFinite(v)) return String(v);
  if (v === null || typeof v !== "object") return v;
  if (seen.has(v)) return { 参照: seen.get(v) };
  seen.set(v, path);
  if (v.kind === "data.frame") return { データフレーム: safe(v.columns, seen, path + ".columns") };
  if (v.__defaultSource) return { データソースの既定値: v.__defaultSource, 値: safe(Object.fromEntries(Object.entries(v).filter(([k]) => k !== "__defaultSource")), seen, path + ".defaults") };
  if (v.__class) return { クラス: v.__class, フィールド: safe(Object.fromEntries(Object.entries(v).filter(([k]) => k !== "__class")), seen, path + ".fields") };
  return Array.isArray(v)
    ? v.map((x, i) => safe(x, seen, path + "[" + i + "]"))
    : Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, safe(x, seen, path + "." + k)]),
      );
}

// Display state as named values rather than leaking serialized model records.
// formatValue remains available for explicit JSON template/fragment comparison.
export function formatModelValue(value) {
  const checked = new Set();
  function hasModel(v, depth = 0) {
    if (!v || typeof v !== "object" || checked.has(v)) return false;
    if (depth > 12) return true;
    checked.add(v);
    return Object.hasOwn(v, "kind") || v.__class || v.__defaultSource || typeof v.tagName === "string" || Object.values(v).some(x => hasModel(x, depth + 1));
  }
  if (!hasModel(value)) return formatValue(value);
  const seen = new Map();
  let count = 0;
  function show(v, depth = 0, path = "状態") {
    if (++count > 1200 || depth > 12) return "…（状態表示の上限）";
    if (v === null || typeof v !== "object" || isUnknown(v) || ["NA", "uninitialized", "js-uninitialized", "pointer"].includes(v.kind)) return formatValue(v);
    if (seen.has(v)) return "参照：" + seen.get(v);
    seen.set(v, path);
    if (Array.isArray(v)) return v.length ? v.map((item, i) => `${i}: ${show(item, depth + 1, path + "[" + i + "]")}`).join("\n") : "空の配列";
    if (v.kind === "data.frame") return "データフレーム\n" + show(v.columns, depth + 1, path);
    const labels = {kind:"種類",tagName:"タグ",id:"ID",textContent:"テキスト",value:"値",children:"子要素",__class:"クラス",__defaultSource:"既定値のデータソース"};
    const heading = typeof v.tagName === "string" ? `DOM要素 <${v.tagName.toLowerCase()}>` : v.__class ? `${v.__class} のオブジェクト` : "";
    const fields = Object.entries(v).filter(([key]) => key !== "__class" && !(heading && key === "tagName"));
    const body = fields.map(([key, item]) => `${labels[key] || key}: ${show(item, depth + 1, path + "." + key)}`).join("\n");
    return [heading, body || "項目なし"].filter(Boolean).join("\n");
  }
  return show(value);
}
