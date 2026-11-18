// 未対応スイープ再確認：前回台帳 ledger-cpp-stop-sweep.tsv（305件）の probe をそのまま再実行し、
// 現在のカタログ status（288対応化後）と併せて分類する。
// 分類: named-stop（項目末尾名 or 完全名が停止文言に現れる）/ owner-named-stop（所有クラス名で停止）/
//       unnamed-stop（名指しでない停止）/ silent-success（エラーなし）/ probe-inapplicable
import fs from "node:fs";
import { run } from "./harness.mjs";
import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";

const LEDGER = process.env.HOME + "/workspace/programming-practice-audit/work/lane-a8-exec/docs/audit/lane-a8-work/ledger-cpp-stop-sweep.tsv";
const lines = fs.readFileSync(LEDGER, "utf8").trim().split("\n");
const header = lines[0].split("\t");
const rows = lines.slice(1).map((l) => { const c = l.split("\t"); const o = {}; header.forEach((h, i) => o[h] = c[i] ?? ""); return o; });
console.log("ledger rows:", rows.length, "cols:", header.join(","));

// 現在の合成カタログで status を引く
const def = getDefinition("cpp");
const adv = await loadAdvanced(def);
const merged = mergeCatalog(def, adv);
const byName = new Map();
for (const it of merged.reference || []) byName.set(it.name, itemStatus(it));
console.log("catalog total:", byName.size, "problems:", JSON.stringify(merged.problems || null));

const tail = (name) => name.split("::").pop();
const owner = (name) => { const p = name.split("::"); return p.length >= 2 ? p.slice(0, -1).join("::") : ""; };

const out = [];
let counts = {};
for (const row of rows) {
  const name = row.item;
  const probe = row.probe;
  let cls, errs = [], outputs = "";
  if (!probe || row.result === "probe-inapplicable") { cls = "probe-inapplicable"; }
  else {
    // 台帳 probe は main 本体断片（末尾に " return 0; }" を含む形）→ そのまま wrap せず HDR と結合済みか判定
    const code = probe.includes("int main()") ? probe : null;
    let r;
    if (code) r = await run(code);
    else {
      // probe 欄は "...;  return 0; }" 形式（本体+閉じ）。HDR と組み立てる
      const body = probe.replace(/\s*return 0; \}\s*$/, "");
      const HDRS = `#include <iostream>\n#include <string>\n#include <vector>\n#include <array>\n#include <utility>\n#include <cmath>\n#include <cstdlib>\n#include <cctype>\n#include <cstring>\n#include <numeric>\n#include <algorithm>\n#include <bit>\n#include <numbers>\n#include <climits>\nint main() {\n`;
      r = await run(HDRS + body + `\n return 0;\n}`);
    }
    errs = r.errors; outputs = r.outputs.map((a) => a.join("")).join("||");
    if (errs.length === 0) cls = "silent-success";
    else {
      const e = errs.join(" ");
      if (e.includes(name) || e.includes(tail(name))) cls = "named-stop";
      else if (owner(name) && e.includes(owner(name))) cls = "owner-named-stop";
      else if (e.includes(name.replace(/^std::/, ""))) cls = "named-stop";
      else cls = "unnamed-stop";
    }
  }
  const nowStatus = byName.get(name) ?? "(not-in-catalog)";
  counts[cls] = (counts[cls] || 0) + 1;
  out.push({ item: name, stratum: row.stratum, prev: row.result, now: cls, nowStatus, error: errs.join(" ;; "), outputs, probe });
  console.log(`${name}\tprev=${row.result}\tnow=${cls}\tstatus=${nowStatus}\t${errs.join(" ;; ")}`);
}
console.log("COUNTS", JSON.stringify(counts));
const tsv = ["item\tstratum\tprev_result\tnow_result\tnow_status\terror\toutputs", ...out.map((o) => [o.item, o.stratum, o.prev, o.now, o.nowStatus, o.error, o.outputs].join("\t"))].join("\n");
fs.writeFileSync(new URL("./ledger-conv-stop-sweep.tsv", import.meta.url), tsv);
fs.writeFileSync(new URL("./sweep-result.json", import.meta.url), JSON.stringify(out, null, 1));
