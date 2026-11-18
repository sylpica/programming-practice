// 収束ラウンド A4: R 等価形・RG-633・RG-634・型付きNA項目の確認
import { getDefinition } from "../../../js/types/registry.js";
import { loadAdvanced, clearAdvancedCache } from "../../../js/core/advanced-loader.js";
import { mergeCatalog, itemStatus } from "../../../js/core/catalog.js";

const d = getDefinition("r");
clearAdvancedCache();
const adv = await loadAdvanced(d);
const merged = mergeCatalog(
  { reference: d.reference, templates: d.templates, glossary: d.glossary },
  adv,
);
const byName = (n) => merged.reference.find((r) => r.name === n);

// 型付き NA 定数のカタログ状態
for (const n of ["NA", "NA_real_", "NA_integer_", "NA_character_", "NA_complex_", "NULL", "NaN", "Inf", "TRUE", "FALSE", "T", "F"]) {
  const it = byName(n);
  console.log(`item ${n}: ${it ? itemStatus(it) : "ABSENT"}`);
}

// RG-633: 引き継ぎ17名の存在＋未対応8件の理由明記
const rg633 = ["ptukey", "qtukey", "psmirnov", "qsmirnov", "bw.ucv", "bw.bcv", "bw.SJ", "runmed", ".nknots.smspl",
  "bw.nrd", "bw.nrd0", "bw.SJ", "density", "ksmooth", "sm.density", "p.adjust", "pairwise.t.test"];
console.log("--- RG-633 names ---");
for (const n of new Set(rg633)) {
  const it = byName(n);
  console.log(`${n}: ${it ? itemStatus(it) : "ABSENT"}${it && itemStatus(it) === "unsupported" ? " desc=" + (it.description ?? "").slice(0, 60) : ""}`);
}

const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const outs = async (code) => {
  const r = await run(code);
  const p = r.paths?.[0];
  return { err: (r.error ?? p?.error)?.message ?? null, outs: (p?.outputs ?? []).map((o) => o.text) };
};

// 等価形（型付きNAを as.numeric(NA) 等に置換した R5／R6 の検証）
console.log("--- equivalent forms ---");
console.log("is.nan(as.numeric(NA)):", JSON.stringify(await outs("cat(is.nan(as.numeric(NA)))"))); // 実R FALSE
console.log("is.na(NaN):", JSON.stringify(await outs("cat(is.na(NaN))"))); // TRUE
console.log("NaN %in% as.numeric(NA):", JSON.stringify(await outs("cat(NaN %in% as.numeric(NA))"))); // FALSE
console.log("NA %in% NaN:", JSON.stringify(await outs("cat(NA %in% NaN)"))); // FALSE
console.log("NaN %in% NaN:", JSON.stringify(await outs("cat(NaN %in% NaN)"))); // TRUE
console.log("NA %in% NA:", JSON.stringify(await outs("cat(NA %in% NA)"))); // TRUE
console.log("median(as.numeric(NA)):", JSON.stringify(await outs("cat(median(as.numeric(NA)))"))); // NA

// RG-634: setNames の NA 名表示（簡易班修正の統合確認）
console.log("--- RG-634 ---");
console.log('print(setNames(c(1,2,3), "a")):', JSON.stringify(await outs('print(setNames(c(1, 2, 3), "a"))')));
console.log('print(setNames(c(1,2), c("a", NA))):', JSON.stringify(await outs('print(setNames(c(1, 2), c("a", NA)))')));
