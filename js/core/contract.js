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
  if (isUnknown(v)) return `実行時に決まる（${v.source}）`;
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
  if (isUnknown(v)) return `実行時に決まる（${v.source}）`;
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
