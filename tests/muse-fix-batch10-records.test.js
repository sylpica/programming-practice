// 修正バッチ10（記録・公開物）回帰テスト：R31-N14／N15／N16。
//
// [SHA-1] 個票 docs/audit/reference-r2.json の全行 sha256 再計算照合（R31-N14）。
//   バッチ9で VBA Val／IsNumeric の caution を同期した際に sha256 の再計算が
//   2行だけ漏れ、旧文面のハッシュが残った。従来の照合テストは fields の一致と
//   一部の行の sha しか見ておらず、全件合格のまま素通りしたため、全行を対象化する。
//   ハッシュ方式は正規方式 sha256(json.dumps(fields, sort_keys=True,
//   ensure_ascii=False))（Python）であり、下記の pyDumps はその Node 再現
//   （区切り ", " と ": "、キーソート、文字列は JSON.stringify と等価な範囲で
//   エスケープ）。全1,313行で Python 実測と一致することを確認済み。
// [MAN-1] manifest.webmanifest の theme_color が index.html の meta
//   theme-color と一致し、style.css のパレットに実在する（R31-N16）。
// [PRG-H] PROGRESS.md 冒頭ヘッダの「最終更新」反映範囲が、文書内の最新の
//   「現在の状態（修正バッチN 時点）」bullet の N と一致する（R31-N15）。
//   バッチ9の機械照合テスト群はこのヘッダを対象外だったため陳腐化が素通りした。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

function pyDumps(obj) {
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ": " + JSON.stringify(obj[k])).join(", ") +
    "}"
  );
}

test("SHA-1: reference-r2.json の全行で sha256 が fields の再計算値と一致する", () => {
  const rows = JSON.parse(read("docs/audit/reference-r2.json"));
  assert.ok(rows.length > 0, "個票が空でないこと");
  const bad = [];
  for (const row of rows) {
    const h = createHash("sha256").update(pyDumps(row.fields), "utf8").digest("hex");
    if (h !== row.sha256) bad.push(`${row.kind}/${row.name}`);
  }
  assert.deepEqual(bad, [], `sha256 が陳腐化している行: ${bad.join(", ")}`);
});

test("MAN-1: manifest の theme_color が meta theme-color と一致しパレットに実在する", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  const html = read("index.html");
  const m = html.match(/<meta\s+name="theme-color"\s+content="(#[0-9a-fA-F]{6})"/);
  assert.ok(m, "index.html に meta theme-color があること");
  assert.equal(manifest.theme_color, m[1], "manifest theme_color と meta の一致");
  const css = read("style.css");
  assert.ok(
    css.toLowerCase().includes(manifest.theme_color.toLowerCase()),
    `theme_color ${manifest.theme_color} が style.css のパレットに実在すること`,
  );
  const bg = css.match(/--bg:\s*(#[0-9a-fA-F]{6})/);
  assert.ok(bg, "style.css に --bg があること");
  assert.equal(manifest.background_color, bg[1], "background_color と --bg の一致");
});

test("PRG-H: PROGRESS.md 冒頭ヘッダの反映範囲が最新の状態 bullet と一致する", () => {
  const progress = read("PROGRESS.md");
  const header = progress.match(/最終更新：.*$/m);
  assert.ok(header, "PROGRESS.md に最終更新ヘッダがあること");
  const states = [...progress.matchAll(/現在の状態（修正バッチ(\d+) 時点）/g)].map((x) =>
    Number(x[1]),
  );
  assert.ok(states.length > 0, "「現在の状態（修正バッチN 時点）」bullet があること");
  const latest = Math.max(...states);
  assert.ok(
    header[0].includes(`修正バッチ${latest}までを反映`),
    `ヘッダ「${header[0]}」が最新の修正バッチ${latest}までを反映と示すこと`,
  );
});
