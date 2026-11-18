/* FIX-PS-B（高度A3監査是正）: PowerShell コマンドレット・自動変数・
 * リファレンスの回帰テスト。
 * 期待値は Microsoft Learn（PowerShell 7.4 ビュー、2026-11-18 取得）と
 * T2 報告書 §3 の導出に基づく。本 VM に実 pwsh は無いため、期待値は
 * Learn／.NET からの導出であり実測ではない。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/powershell/index.js";
import { applyAdvancedEngine } from "../js/types/powershell/advanced-engine.js";
import { CMDLETS } from "../js/types/powershell/engine-advanced-cmdlets.js";
import { AUTOVARS } from "../js/types/powershell/engine-advanced-vars.js";
import { referenceAdvanced } from "../js/types/powershell/reference-advanced.js";

applyAdvancedEngine(d);

const run = (code, extra = {}) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra });
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
const out = (r) =>
  r.paths.map((p) =>
    p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
  );
const stream = (r) => r.paths[0].ps.streams[0];
const refItem = (name) => referenceAdvanced.find((x) => x.name === name);

/* ---------- レジストリ分類（格上げ7件・再分類2件の反映） ---------- */
test("registry counts reflect upgrades and reclassifications", () => {
  const keys = Object.keys(CMDLETS);
  assert.equal(keys.length, 250);
  const by = { run: 0, unsupported: 0, unverified: 0 };
  for (const k of keys) {
    const e = CMDLETS[k];
    if (e.run) by.run++;
    else if (e.unsupported) by.unsupported++;
    else if (e.unverified) by.unverified++;
    else assert.fail("no disposition for " + k);
  }
  assert.deepEqual(by, { run: 56, unsupported: 168, unverified: 26 });
  for (const up of ["convertto-html", "get-markdownoption", "set-markdownoption", "import-powershelldatafile", "update-list", "measure-command"])
    assert.equal(typeof CMDLETS[up].run, "function", up);
  for (const re of ["convertto-clixml", "convertfrom-clixml"])
    assert.match(CMDLETS[re].unsupported, /7\.5-preview\.4/, re);
  assert.equal(Object.keys(AUTOVARS).length, 35);
  assert.equal(AUTOVARS.consolefilename({}, {}), "");
});

/* ---------- 宣言（reference）と分類の一致 ---------- */
test("reference statuses match the rulings", () => {
  for (const up of ["ConvertTo-Html", "Get-MarkdownOption", "Set-MarkdownOption", "Import-PowerShellDataFile", "Update-List", "Measure-Command", "$ConsoleFileName"])
    assert.equal(refItem(up).status, "supported", up);
  for (const re of ["ConvertTo-CliXml", "ConvertFrom-CliXml", "2>", "2>>", "2>&1"])
    assert.equal(refItem(re).status, "unsupported", re);
  // $$／$^ は裁定変更（2026-11-18）により未検証のまま
  for (const keep of ["$$", "$^"])
    assert.equal(refItem(keep).status, "unverified", keep);
  const clixmlReason = "PowerShell 7.5-preview.4 で導入されたコマンドレットであり、本モデルが対象とする PowerShell 7.4 には存在しないため";
  assert.equal(refItem("ConvertTo-CliXml").caution, clixmlReason);
  assert.equal(refItem("ConvertFrom-CliXml").caution, clixmlReason);
  const redirectReason = "リダイレクト基盤（ストリームのファイル転送・マージ）がモデルに無く、エラーストリームは値としてモデル化されていないため";
  for (const re of ["2>", "2>>", "2>&1"])
    assert.equal(refItem(re).caution, redirectReason, re);
  assert.match(refItem("$$").caution, /対話行入力（セッションが受け取った最後の行）がモデルに保持されておらず、最後の行の最後のトークンを確定できないため/);
  assert.match(refItem("$^").caution, /対話行入力（セッションが受け取った最後の行）がモデルに保持されておらず、最後の行の最初のトークンを確定できないため/);
});
test("CliXml cmdlets stop as unsupported with the prescribed reason", () => {
  for (const code of ["ConvertTo-CliXml -InputObject 1", "ConvertFrom-CliXml -InputObject 'x'"]) {
    const r = run(code);
    assert.match(errors(r)[0].message, /^未対応：Convert(To|From)-CliXml はモデルで未対応です（PowerShell 7\.5-preview\.4 で導入されたコマンドレットであり、本モデルが対象とする PowerShell 7\.4 には存在しないため）$/, code);
  }
});

/* ---------- A1. ConvertTo-Html ---------- */
test("ConvertTo-Html default document shape (Learn)", () => {
  const r = run("[pscustomobject]@{Name='Alice'; Score=80} | ConvertTo-Html");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(stream(r), [
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"  "https://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
    "<html>",
    "<head>",
    "<title>HTML TABLE</title>",
    "</head>",
    "<body>",
    "<table>",
    "<colgroup><col /><col /></colgroup>",
    "<tr><th>Name</th><th>Score</th></tr>",
    "<tr><td>Alice</td><td>80</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ]);
});
test("ConvertTo-Html -Fragment, -As List, -Title, missing/extra properties", () => {
  assert.deepEqual(
    stream(run("[pscustomobject]@{Name='Alice'} | ConvertTo-Html -Fragment")),
    ["<table>", "<colgroup><col /></colgroup>", "<tr><th>Name</th></tr>", "<tr><td>Alice</td></tr>", "</table>"],
  );
  const list = stream(run("[pscustomobject]@{Name='Alice'; Score=80} | ConvertTo-Html -As List -Fragment"));
  assert.ok(list.includes("<tr><th>Name</th><td>Alice</td></tr>"));
  assert.ok(list.includes("<tr><th>Score</th><td>80</td></tr>"));
  const titled = stream(run("[pscustomobject]@{Name='Alice'} | ConvertTo-Html -Title 'T'"));
  assert.ok(titled.includes("<title>T</title>"));
  // 最初のオブジェクトのプロパティが列見出し。欠落は空セル、余分は含めない。
  const rows = stream(run("@([pscustomobject]@{A=1; B=2}, [pscustomobject]@{A=3; C=9}) | ConvertTo-Html -Fragment"));
  assert.ok(rows.includes("<tr><th>A</th><th>B</th></tr>"));
  assert.ok(rows.includes("<tr><td>3</td><td></td></tr>"));
  assert.ok(!rows.some((x) => x.includes("9</td>") && x.includes("<th>C</th>")));
});

/* ---------- A2. Get-/Set-MarkdownOption ---------- */
test("Get-MarkdownOption returns Learn Example 1 defaults", () => {
  const v = stream(run("Get-MarkdownOption"))[0];
  assert.equal(v.psType, "PSMarkdownOptionInfo");
  assert.deepEqual(v.properties, {
    Header1: "[7m",
    Header2: "[4;93m",
    Header3: "[4;94m",
    Header4: "[4;95m",
    Header5: "[4;96m",
    Header6: "[4;97m",
    Code: "[48;2;155;155;155;38;2;30;30;30m",
    Link: "[4;38;5;117m",
    Image: "[33m",
    EmphasisBold: "[1m",
    EmphasisItalics: "[36m",
  });
});
test("Set-MarkdownOption individual / theme / InputObject / PassThru / validation", () => {
  assert.deepEqual(out(run("Set-MarkdownOption -Header1Color '[32m'\n(Get-MarkdownOption).Header1")), [["[32m"]]);
  assert.deepEqual(out(run("Set-MarkdownOption -Theme Light\n(Get-MarkdownOption).Header2")), [["[4;33m"]]);
  assert.deepEqual(out(run("Set-MarkdownOption -Theme Dark\n(Get-MarkdownOption).Header2")), [["[4;93m"]]);
  const bad = run("Set-MarkdownOption -Header1Color 'red'");
  assert.match(errors(bad)[0].message, /検証パターン/);
  const thru = stream(run("Set-MarkdownOption -BoldForegroundColor '[35m' -PassThru"));
  assert.equal(thru[0].psType, "PSMarkdownOptionInfo");
  assert.equal(thru[0].properties.EmphasisBold, "[35m");
  assert.deepEqual(out(run("$o = Get-MarkdownOption\nSet-MarkdownOption -InputObject $o\n(Get-MarkdownOption).Header3")), [["[4;94m"]]);
  // 旧来の誤ったパラメータ名は束縛できない
  assert.match(errors(run("Set-MarkdownOption -Header1 '[32m'"))[0].message, /未対応のパラメータ/);
});
test("MarkdownOption state does not leak across runs", () => {
  run("Set-MarkdownOption -Header1Color '[32m'");
  assert.deepEqual(out(run("(Get-MarkdownOption).Header1")), [["[7m"]]);
});

/* ---------- A3. Import-PowerShellDataFile ---------- */
const psd1Files = (content, name = "data.psd1") => ({
  files: [
    { path: "C:\\Practice", type: "directory" },
    { path: "C:\\Practice\\" + name, type: "file", content },
  ],
});
test("Import-PowerShellDataFile reads constant-only data", () => {
  const extra = psd1Files("@{ Name = 'x'; N = 42; Flag = $true; List = @(1, 2); Nested = @{ A = 'b' } }");
  const v = stream(run("Import-PowerShellDataFile -Path .\\data.psd1", extra))[0];
  assert.equal(v.psType, "Hashtable");
  assert.equal(v.entries.get("Name"), "x");
  assert.equal(v.entries.get("N"), 42);
  assert.deepEqual(out(run("(Import-PowerShellDataFile -LiteralPath .\\data.psd1).Nested.A", extra)), [["b"]]);
});
test("Import-PowerShellDataFile rejects expressions and enforces limits", () => {
  const bad = run("Import-PowerShellDataFile -Path .\\bad.psd1", psd1Files("@{ X = Get-Date }", "bad.psd1"));
  assert.match(errors(bad)[0].message, /定数値のみ/);
  const big = "@{ " + Array.from({ length: 501 }, (_, i) => "K" + i + " = " + i).join("; ") + " }";
  const limited = run("Import-PowerShellDataFile -Path .\\big.psd1", psd1Files(big, "big.psd1"));
  assert.match(errors(limited)[0].message, /制限（500）/);
  assert.deepEqual(out(run("(Import-PowerShellDataFile -Path .\\big.psd1 -SkipLimitCheck).Count", psd1Files(big, "big.psd1"))), [["501"]]);
  // ワイルドカードは最初の一致のみ
  assert.deepEqual(out(run("(Import-PowerShellDataFile -Path .\\da*.psd1).Name", psd1Files("@{ Name = 'x' }"))), [["x"]]);
});

/* ---------- A4. Update-List ---------- */
test("Update-List Add / Remove / Replace on array properties", () => {
  const added = stream(run("$o = [pscustomobject]@{ Items = @(1, 2) }\n$o | Update-List -Property Items -Add 3, 4"))[0];
  assert.deepEqual(added.properties.Items, [1, 2, 3, 4]);
  const removed = stream(run("$o = [pscustomobject]@{ Items = @(1, 2, 2, 3) }\n$o | Update-List -Property Items -Remove 2"))[0];
  assert.deepEqual(removed.properties.Items, [1, 3]);
  const replaced = stream(run("$o = [pscustomobject]@{ Items = @(1, 2) }\n$o | Update-List -Property Items -Replace @(9)"))[0];
  assert.deepEqual(replaced.properties.Items, [9]);
});
test("Update-List changeset return and errors", () => {
  const cs = stream(run("$o = [pscustomobject]@{ Items = @(1, 2) }\n$o | Update-List -Add @{ Items = 3 }"))[0];
  assert.equal(cs.psType, "Hashtable");
  assert.ok(cs.entries.has("Add"));
  const nonList = run("$o = [pscustomobject]@{ Items = 5 }\n$o | Update-List -Property Items -Add 3");
  assert.match(errors(nonList)[0].message, /IList/);
  const conflict = run("$o = [pscustomobject]@{ Items = @(1) }\n$o | Update-List -Property Items -Add 2 -Replace @(9)");
  assert.match(errors(conflict)[0].message, /-Replace/);
});

/* ---------- A5. Measure-Command ---------- */
test("Measure-Command runs in current scope, suppresses output, returns TimeSpan unknown", () => {
  const r = run("$x = 0\nMeasure-Command { $x = 42 }\n$x");
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 1);
  assert.deepEqual(out(r), [["実行時に決まる：計測時間", "42"]]);
  const v = stream(r)[0];
  assert.equal(v.kind, "unknown");
  assert.equal(v.valueType, "TimeSpan");
  const quiet = run("Measure-Command { Write-Output 'hidden' }");
  assert.deepEqual(out(quiet), [["実行時に決まる：計測時間"]]);
});
test("Measure-Command executes per pipeline input with $_", () => {
  const r = run("$seen = 0\n1,2 | Measure-Command { $seen = $_ }\n$seen");
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 1);
  assert.deepEqual(out(r), [["実行時に決まる：計測時間", "2"]]);
});

/* ---------- A6/B. 自動変数 ---------- */
test("$ConsoleFileName is the determined empty string", () => {
  const r = run("$ConsoleFileName");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(stream(r), [""]);
  assert.equal(refItem("$ConsoleFileName").status, "supported");
});
test("${$} and ${^} stay unverified unknowns with the unified reason", () => {
  for (const [code, tail] of [["${$}", "最後のトークン"], ["${^}", "最初のトークン"]]) {
    const r = run(code);
    assert.deepEqual(errors(r), [], code);
    assert.match(out(r)[0][0], /実行時に決まる：未検証/, code);
    assert.match(out(r)[0][0], new RegExp("対話行入力（セッションが受け取った最後の行）がモデルに保持されておらず、最後の行の" + tail + "を確定できないため"), code);
  }
});

/* ---------- C. 理由文の統一（宣言と停止文言の一致） ---------- */
test("unverified stop reasons match the reference cautions", () => {
  const cases = [
    ["Get-Culture", "Get-Culture"],
    ["Get-UICulture", "Get-UICulture"],
    ["Get-Member", "'abc' | Get-Member"],
    ["Get-PSCallStack", "Get-PSCallStack"],
    ["Get-Verb", "Get-Verb"],
    ["ConvertFrom-Markdown", "'# T' | ConvertFrom-Markdown"],
    ["ConvertTo-Xml", "[pscustomobject]@{A=1} | ConvertTo-Xml"],
  ];
  for (const [name, code] of cases) {
    const r = run(code);
    assert.ok(errors(r).length > 0, name);
    assert.ok(
      errors(r)[0].message.includes(refItem(name).caution),
      name + ": " + errors(r)[0].message,
    );
  }
  for (const [name, code] of [["$input", "$input"], ["$MyInvocation", "$MyInvocation"], ["$PSCmdlet", "$PSCmdlet"]]) {
    const r = run(code);
    assert.deepEqual(errors(r), [], name);
    assert.ok(out(r)[0][0].includes(refItem(name).caution), name + ": " + out(r)[0][0]);
  }
});

/* ---------- D. 開示・例文の是正 ---------- */
test("Join-Path is a pure join and extra positional args are an error", () => {
  assert.deepEqual(out(run('Join-Path "a" "b"')), [["a\\b"]]);
  assert.deepEqual(out(run('Join-Path "C:\\Practice" "sub\\file.txt"')), [["C:\\Practice\\sub\\file.txt"]]);
  const extra = run('Join-Path "a" "b" "c"');
  assert.match(errors(extra)[0].message, /追加の位置引数/);
  assert.match(refItem("Join-Path").caution, /パスを解決せず文字列として結合します/);
});
test("operator disclosures: -xor precedence, -is integer ruling", () => {
  assert.match(refItem("-xor").caution, /モデルでは -and が -or／-xor より強く結合します（実 PowerShell では -and／-or／-xor は同格で左結合です）/);
  const base = d.reference.find((x) => x.name === "論理演算子");
  assert.match(base.caution, /-and が -or／-xor より強く結合します（実 PowerShell では -and／-or／-xor は同格で左結合です）/);
  assert.match(refItem("-is").caution, /モデルの整数値は int 相当として判定します/);
});
test("New-Object scope disclosure and working example; Tee-Object disclosure", () => {
  assert.ok(!refItem("New-Object").example.includes("System.Version"));
  assert.match(refItem("New-Object").caution, /PSObject 形式/);
  assert.deepEqual(errors(run(refItem("New-Object").example)), []);
  assert.match(errors(run("New-Object -TypeName System.Version -ArgumentList '1.0'"))[0].message, /未対応：New-Object -TypeName System\.Version/);
  assert.match(refItem("Tee-Object").caution, /オブジェクト値の整形（ファイルへの書き出し時の書式）は未検証として停止します/);
});

/* ---------- E. 検索到達性（inventoryNames） ---------- */
test("inventory spellings reach their items via the search index", () => {
  // app.js の refSearchText と同じ索引構成（述語は変更していない）。
  const refSearchText = (r) => {
    const parts = [r.name, r.category, r.description, r.syntax];
    if (Array.isArray(r.inventoryNames)) parts.push(...r.inventoryNames);
    if (typeof r.scan === "string") parts.push(r.scan);
    return parts.filter((x) => typeof x === "string").join(" ").toLowerCase();
  };
  const all = [...d.reference, ...referenceAdvanced];
  const reach = (spelling, name) => {
    const item = all.find((x) => x.name === name);
    assert.ok(item, name);
    assert.ok(refSearchText(item).includes(spelling.toLowerCase()), name + " <- " + spelling);
  };
  reach("? :", "三項演算子");
  reach("[ ]", "配列");
  reach("@( )", "配列");
  reach("@{}", "ハッシュテーブル");
  reach("( )", "算術・代入演算子");
  reach("$( )", "文字列");
});
