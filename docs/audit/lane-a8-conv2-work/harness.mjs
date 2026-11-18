// WS-CPP 収束ラウンド共通ハーネス（前回ラウンドと同形）
import { getDefinition } from "../../../js/types/registry.js";

export const HDR = `#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\n#include <utility>\n#include <cmath>\n#include <cstdlib>\n#include <cctype>\n#include <cstring>\n#include <numeric>\n#include <algorithm>\n#include <bit>\n#include <numbers>\n#include <climits>\nint main() {\n`;
export const wrap = (body) => HDR + body + `\n return 0;\n}`;

export function errStr(r) {
  const es = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
  return es;
}
export function outTexts(r) {
  return (r.paths || []).map((p) => (p.outputs || []).map((o) => o.text));
}
export function outChannels(r) {
  return (r.paths || []).map((p) => (p.outputs || []).map((o) => o.channel));
}
export async function run(code) {
  const d = getDefinition("cpp");
  try {
    const r = await d.simulate(code, structuredClone(d.model.defaults));
    return {
      errors: errStr(r),
      outputs: outTexts(r),
      channels: outChannels(r),
      vars: (r.paths || []).map((p) => p.vars),
      trace: (r.paths || []).map((p) => (p.trace || []).map((t) => (typeof t === "string" ? t : t.text || JSON.stringify(t)))),
      raw: r,
    };
  } catch (e) {
    return { errors: ["THROW " + e.message], outputs: [], channels: [], vars: [], trace: [], raw: null };
  }
}
export const runBody = (body) => run(wrap(body));
