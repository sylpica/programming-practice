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
  if (v === undefined) return "未設定";
  if (typeof v === "string") return v;
  if (v === null) return "null";
  return typeof v === "object" ? JSON.stringify(safe(v), null, 2) : String(v);
}
export function refsInTrace(path) {
  return [...new Set((path?.trace || []).flatMap((t) => t.refs || []))];
}

function safe(v, seen = new Map(), path = "$") {
  if (v === undefined) return "未設定";
  if (typeof v === "number" && !Number.isFinite(v)) return String(v);
  if (v === null || typeof v !== "object") return v;
  if (seen.has(v)) return { 参照: seen.get(v) };
  seen.set(v, path);
  return Array.isArray(v)
    ? v.map((x, i) => safe(x, seen, path + "[" + i + "]"))
    : Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, safe(x, seen, path + "." + k)]),
      );
}
