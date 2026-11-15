import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { definition as ps } from "../js/types/powershell/index.js";

const runPs = (code, extra = {}) =>
  ps.simulate(code, { ...structuredClone(ps.model.defaults), ...extra });
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
const outPs = (r) =>
  r.paths.map((p) =>
    p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
  );
const hostPs = (r) =>
  r.paths.map((p) =>
    p.outputs.filter((o) => o.channel === "Write-Host").map((o) => o.text),
  );
const filePaths = (r) => r.paths[0].model.files.map((e) => e.path);
const byName = (name) => ps.reference.find((r) => r.name === name);
const r6 = JSON.parse(
  fs.readFileSync(
    new URL("../docs/audit/reference-r6.json", import.meta.url),
    "utf8",
  ),
);
const r6Row = (name) =>
  r6.find((e) => e.kind === "powershell" && e.name === name);
const syncFields = ["description", "example", "returns", "caution", "source"];

// ---------- R24-N14: $PSVersionTable.PSVersion のプロパティ表面 ----------
test("batch3-psengine R24-N14 PSVersion.Major/Minor return the model's version components", () => {
  const r = runPs(
    "Write-Output $PSVersionTable.PSVersion.Major\nWrite-Output $PSVersionTable.PSVersion.Minor",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["7", "4"]]);
});
test("batch3-psengine R24-N14 version branch no longer misfires to old", () => {
  const r = runPs(
    'if ($PSVersionTable.PSVersion.Major -ge 5) { "modern" } else { "old" }',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["modern"]]);
});
test("batch3-psengine R24-N14 PSVersion still displays and compares as 7.4", () => {
  assert.deepEqual(outPs(runPs("Write-Output $PSVersionTable.PSVersion")), [
    ["7.4"],
  ]);
  assert.deepEqual(outPs(runPs('Write-Output "$($PSVersionTable.PSVersion)"')), [
    ["7.4"],
  ]);
  assert.deepEqual(outPs(runPs('[string]$PSVersionTable.PSVersion')), [["7.4"]]);
  assert.deepEqual(
    outPs(
      runPs(
        '$PSVersionTable.PSVersion -eq "7.4"\n$PSVersionTable.PSVersion -gt "7.3"\n$PSVersionTable.PSVersion -lt "7.5"\n$PSVersionTable.PSVersion -eq "7.4.0"',
      ),
    ),
    [["True", "True", "True", "False"]],
  );
  // 添字形・変数経由でも同じオブジェクトとして振る舞う。
  assert.deepEqual(outPs(runPs('$PSVersionTable["PSVersion"].Major')), [["7"]]);
  assert.deepEqual(
    outPs(runPs("$v=$PSVersionTable.PSVersion\nWrite-Output $v.Minor")),
    [["4"]],
  );
});
test("batch3-psengine R24-N14 unspecified Version components follow System.Version (-1)", () => {
  // モデルが保持する版文字列 "7.4" は2成分のみ。[Version]"7.4" の
  // Build／Revision は -1（未指定）であり、捏造しない。
  const r = runPs(
    "Write-Output $PSVersionTable.PSVersion.Build\nWrite-Output $PSVersionTable.PSVersion.Revision",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["-1", "-1"]]);
});

// ---------- R24-N14: $PWD／Get-Location の PathInfo 表面 ----------
test("batch3-psengine R24-N14 $PWD.ProviderPath and .Drive are real values, not $null", () => {
  const r = runPs(
    "Write-Output $PWD.ProviderPath\nWrite-Output $PWD.Drive.Name\nWrite-Output $PWD.Drive.Root",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["C:\\Practice", "C", "C:\\"]]);
  const drive = runPs("Write-Output $PWD.Drive");
  assert.match(outPs(drive)[0][0], /Name : C/);
});
test("batch3-psengine R24-N14 Get-Location returns the same full PathInfo and follows Set-Location", () => {
  const r = runPs(
    "(Get-Location).ProviderPath\n(Get-Location).Drive.Name\nSet-Location logs\n$PWD.ProviderPath\n$PWD.Drive.CurrentLocation\n(Get-Location).Path",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [
    ["C:\\Practice", "C", "C:\\Practice\\logs", "Practice\\logs", "C:\\Practice\\logs"],
  ]);
  assert.deepEqual(outPs(runPs("Write-Output $PWD.Provider.Name")), [
    ["FileSystem"],
  ]);
});

// ---------- R24-N32: New-Item ファイル形の親フォルダ自動生成 ----------
test("batch3-psengine R24-N32 New-Item File creates missing parent folders", () => {
  const r = runPs("New-Item -ItemType File -Path sub\\f.txt");
  assert.deepEqual(errors(r), []);
  assert.ok(filePaths(r).includes("C:\\Practice\\sub"));
  assert.ok(filePaths(r).includes("C:\\Practice\\sub\\f.txt"));
  const deep = runPs(
    "New-Item -ItemType File -Path a\\b\\c\\f.txt\nTest-Path a\\b\\c\\f.txt",
  );
  assert.deepEqual(errors(deep), []);
  assert.deepEqual(outPs(deep)[0].at(-1), "True");
  const named = runPs(
    "New-Item -Path sub -Name f2.txt -ItemType File\nTest-Path sub\\f2.txt",
  );
  assert.deepEqual(errors(named), []);
  assert.deepEqual(outPs(named)[0].at(-1), "True");
});
test("batch3-psengine R24-N32 New-Item Directory form and Set-Content contrast are unchanged", () => {
  const dir = runPs("New-Item -ItemType Directory -Path x\\y\\z\nTest-Path x\\y\\z");
  assert.deepEqual(errors(dir), []);
  assert.deepEqual(outPs(dir)[0].at(-1), "True");
  // Set-Content は実 PowerShell でも親を自動生成しない（New-Item のみの是正）。
  const sc = runPs('Set-Content missing-dir\\x.txt -Value "hi"');
  assert.equal(errors(sc).length, 1);
  assert.match(errors(sc)[0].message, /親フォルダがありません/);
});

// ---------- §3.3: 読み取り経路のデバイス名 ----------
test("batch3-psengine device-read Get-Content nul is empty (immediate EOF), not a missing file", () => {
  for (const code of ["Get-Content nul", "Get-Content NUL", "Get-Content nul.txt", "Get-Content logs\\nul", "cat nul", "gc nul"]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outPs(r), [[]], code);
  }
  const raw = runPs("Get-Content nul -Raw");
  assert.deepEqual(errors(raw), []);
  assert.deepEqual(outPs(raw), [[""]]);
});
test("batch3-psengine device-read other devices stop naming the device", () => {
  for (const [code, device] of [
    ["Get-Content con", "CON"],
    ["Get-Content prn", "PRN"],
    ["Get-Content aux", "AUX"],
    ["Get-Content com1", "COM1"],
    ["Get-Content lpt1", "LPT1"],
    ['Get-Content "conin$"', "CONIN$"],
  ]) {
    const r = runPs(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, new RegExp("予約デバイス名 " + device.replace("$", "\\$")), code);
    assert.doesNotMatch(errors(r)[0].message, /モデルにファイルがありません/, code);
  }
  // 通常ファイルの読み取りは不変。
  assert.deepEqual(outPs(runPs("Get-Content notes.txt")), [["学習メモ"]]);
});

// ---------- §3.3: 書き込み先デバイス ----------
test("batch3-psengine device-write Copy-Item to NUL discards and creates no file", () => {
  for (const target of ["nul", "NUL", "nul.txt", "logs\\nul"]) {
    const r = runPs("Copy-Item notes.txt " + target);
    assert.deepEqual(errors(r), [], target);
    assert.ok(filePaths(r).includes("C:\\Practice\\notes.txt"), target);
    assert.ok(!filePaths(r).some((p) => /nul/i.test(p)), target);
  }
});
test("batch3-psengine device-write Copy-Item to CON displays content and creates no file", () => {
  const r = runPs("Copy-Item notes.txt con");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(hostPs(r), [["学習メモ"]]);
  assert.ok(!filePaths(r).some((p) => /con$/i.test(p)));
  const quoted = runPs('Copy-Item notes.txt "conout$"');
  assert.deepEqual(errors(quoted), []);
  assert.deepEqual(hostPs(quoted), [["学習メモ"]]);
});
test("batch3-psengine device-write Copy-Item to other devices stops naming the device", () => {
  for (const target of ["prn", "aux", "com1", "lpt1"]) {
    const r = runPs("Copy-Item notes.txt " + target);
    assert.equal(errors(r).length, 1, target);
    assert.match(errors(r)[0].message, /予約デバイス名/, target);
    assert.ok(filePaths(r).includes("C:\\Practice\\notes.txt"), target);
  }
});
test("batch3-psengine device-write Move-Item to NUL/CON removes the source and creates no file", () => {
  const nul = runPs("Move-Item notes.txt nul");
  assert.deepEqual(errors(nul), []);
  assert.ok(!filePaths(nul).includes("C:\\Practice\\notes.txt"));
  assert.ok(!filePaths(nul).some((p) => /nul/i.test(p)));
  const con = runPs("Move-Item notes.txt con");
  assert.deepEqual(errors(con), []);
  assert.deepEqual(hostPs(con), [["学習メモ"]]);
  assert.ok(!filePaths(con).includes("C:\\Practice\\notes.txt"));
  const prn = runPs("Move-Item notes.txt prn");
  assert.equal(errors(prn).length, 1);
  assert.match(errors(prn)[0].message, /予約デバイス名 PRN/);
  assert.ok(filePaths(prn).includes("C:\\Practice\\notes.txt"));
});
test("batch3-psengine device-write Set-Content/Add-Content follow the same device semantics", () => {
  const nul = runPs('Set-Content nul -Value "x"\nAdd-Content nul -Value "y"');
  assert.deepEqual(errors(nul), []);
  assert.ok(!filePaths(nul).some((p) => /nul/i.test(p)));
  const con = runPs('Set-Content con -Value "hi"');
  assert.deepEqual(errors(con), []);
  assert.deepEqual(hostPs(con), [["hi"]]);
  assert.ok(!filePaths(con).some((p) => /con$/i.test(p)));
  const conout = runPs('Set-Content "conout$" -Value "hi"');
  assert.deepEqual(errors(conout), []);
  assert.deepEqual(hostPs(conout), [["hi"]]);
  const prn = runPs('Set-Content prn -Value "hi"');
  assert.equal(errors(prn).length, 1);
  assert.match(errors(prn)[0].message, /予約デバイス名 PRN/);
});
test("batch3-psengine device-write New-Item and Rename-Item never create device-named files", () => {
  for (const code of [
    "New-Item -ItemType File -Path nul",
    "New-Item -ItemType Directory -Path con",
    "New-Item -ItemType File -Path sub\\prn.txt",
  ]) {
    const r = runPs(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, /予約デバイス名/, code);
    assert.ok(!filePaths(r).some((p) => /(nul|con|prn)/i.test(p.split("\\").at(-1))), code);
  }
  const ren = runPs("Rename-Item notes.txt nul");
  assert.equal(errors(ren).length, 1);
  assert.match(errors(ren)[0].message, /予約デバイス名 NUL/);
  assert.ok(filePaths(ren).includes("C:\\Practice\\notes.txt"));
});
test("batch3-psengine device-read-source Copy-Item from NUL copies empty content; from CON stops naming it", () => {
  const r = runPs("Copy-Item nul empty.txt\nTest-Path empty.txt");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["True"]]);
  const entry = r.paths[0].model.files.find((e) => e.path.endsWith("empty.txt"));
  assert.equal(entry.content, "");
  for (const code of ["Copy-Item con out.txt", "Move-Item con out.txt", "Move-Item nul out.txt"]) {
    const rr = runPs(code);
    assert.equal(errors(rr).length, 1, code);
    assert.match(errors(rr)[0].message, /予約デバイス名/, code);
    assert.ok(!filePaths(rr).some((p) => p.endsWith("out.txt")), code);
  }
});
test("batch3-psengine device-write missing source and folder source keep honest errors", () => {
  const missing = runPs("Copy-Item missing.txt nul");
  assert.equal(errors(missing).length, 1);
  assert.match(errors(missing)[0].message, /コピー／移動元がありません/);
  const folder = runPs("Copy-Item logs nul");
  assert.equal(errors(folder).length, 1);
  assert.match(errors(folder)[0].message, /予約デバイス名 NUL へのフォルダのコピー/);
  // 通常のコピー／移動は不変。
  const ok = runPs("Copy-Item notes.txt copied.txt\nMove-Item copied.txt moved.txt\nGet-Content moved.txt");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outPs(ok), [["学習メモ"]]);
});
test("batch3-psengine device Out-File stays an unsupported cmdlet named in the error", () => {
  const r = runPs('Write-Output "x" | Out-File out.txt');
  assert.ok(errors(r).length);
  assert.match(errors(r)[0].message, /Out-File/);
});

// ---------- R24-N4: 比較30綴り＋包含12綴り ----------
const COMPARISON_30 = [
  "-eq", "-ne", "-gt", "-ge", "-lt", "-le", "-like", "-notlike", "-match", "-notmatch",
  "-ceq", "-cne", "-cgt", "-cge", "-clt", "-cle", "-clike", "-cnotlike", "-cmatch", "-cnotmatch",
  "-ieq", "-ine", "-igt", "-ige", "-ilt", "-ile", "-ilike", "-inotlike", "-imatch", "-inotmatch",
];
const CONTAINMENT_12 = [
  "-contains", "-ccontains", "-icontains", "-notcontains", "-cnotcontains", "-inotcontains",
  "-in", "-cin", "-iin", "-notin", "-cnotin", "-inotin",
];
test("batch3-psengine R24-N4 comparison item lists all 30 spellings and the -c/-i prefix rule", () => {
  const item = byName("比較演算子");
  assert.ok(item);
  for (const op of COMPARISON_30) assert.ok(item.syntax.includes(op), "syntax " + op);
  for (const op of COMPARISON_30.slice(10))
    assert.ok(item.description.includes(op), "description " + op);
  assert.match(item.description, /-c接頭辞/);
  assert.match(item.description, /-i接頭辞/);
});
test("batch3-psengine R24-N4 containment operators have their own item with all 12 spellings", () => {
  const item = byName("包含演算子");
  assert.ok(item, "包含演算子 item must exist");
  assert.equal(item.supported, true);
  for (const op of CONTAINMENT_12) {
    assert.ok(item.syntax.includes(op), "syntax " + op);
    assert.ok(item.description.includes(op), "description " + op);
  }
  assert.match(item.description, /真偽値/);
  assert.match(item.description, /-inは左右が逆/);
  const r = runPs(item.example);
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["True", "True", "True", "True"]]);
});
test("batch3-psengine R24-N4 containment semantics execute for base and -c/-i variants", () => {
  const r = runPs(
    '@(1,2) -contains 2\n@("a") -ccontains "A"\n@("a") -icontains "A"\n5 -notin @(1,2)\n2 -cin @(1,2)\n"x" -inotin @("X")',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["True", "False", "True", "True", "True", "False"]]);
});
test("batch3-psengine R24-N4 comparison -c/-i variants execute with correct case semantics", () => {
  const r = runPs(
    '"a" -cgt "B"\n"a" -igt "B"\n"ABC" -clike "a*"\n"ABC" -ilike "a*"\n"abc123" -cmatch "[0-9]+"\n"abc" -inotmatch "z"',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["True", "False", "False", "True", "True", "True"]]);
});

// ---------- R24-N16: プロパティ .Name／.FullName ----------
test("batch3-psengine R24-N16 property item lists .Name and .FullName with their meanings", () => {
  const item = byName("プロパティ");
  for (const name of ["Name", "FullName"]) {
    assert.ok(item.syntax.includes("." + name), "syntax " + name);
    assert.ok(item.description.includes(name), "description " + name);
  }
  assert.match(item.description, /Nameはファイル・フォルダの名前のみ（パスを含みません）/);
  assert.match(item.description, /FullNameはフルパス/);
  const r = runPs(item.example);
  assert.deepEqual(errors(r), []);
});
test("batch3-psengine R24-N16 engine Name/FullName values match the item text", () => {
  const names = runPs("Get-ChildItem | ForEach-Object { Write-Output $_.Name }");
  assert.deepEqual(errors(names), []);
  assert.deepEqual(outPs(names), [["notes.txt", "data.csv", "readme.txt", "logs"]]);
  const full = runPs("Get-ChildItem -File | ForEach-Object { Write-Output $_.FullName }");
  assert.deepEqual(outPs(full), [
    ["C:\\Practice\\notes.txt", "C:\\Practice\\data.csv", "C:\\Practice\\readme.txt"],
  ]);
});

// ---------- U-1: 数値リテラル形式の到達可能性 ----------
test("batch3-psengine U-1 numeric literal forms are mentioned in the arithmetic item and execute", () => {
  const item = byName("算術・代入演算子");
  assert.ok(item.description.includes("0x1F") || item.example.includes("0x1F"));
  assert.ok(item.description.includes("1KB") || item.example.includes("1KB"));
  assert.match(item.description, /16進形式/);
  assert.match(item.description, /単位接尾辞/);
  const r = runPs("Write-Output 0x1F\nWrite-Output 1KB\nWrite-Output 2MB");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["31", "1024", "2097152"]]);
  const itemRun = runPs(item.example);
  assert.deepEqual(errors(itemRun), []);
});

// ---------- 個票 reference-r6.json 同期 ----------
test("batch3-psengine r6 rows for all touched PowerShell items are in sync with the definition", () => {
  for (const name of [
    "プロパティ", "比較演算子", "包含演算子", "算術・代入演算子",
    "$PWD", "$PSVersionTable", "Get-Location", "Get-Content",
    "Set-Content", "Add-Content", "New-Item", "Rename-Item",
    "Copy-Item", "Move-Item",
  ]) {
    const item = byName(name),
      row = r6Row(name);
    assert.ok(item, "definition " + name);
    assert.ok(row, "r6 row " + name);
    for (const f of syncFields) assert.equal(row[f], item[f], name + "." + f);
  }
  assert.equal(ps.reference.length, 51);
  assert.equal(r6.filter((e) => e.kind === "powershell").length, 51);
  assert.equal(r6.length, 79);
});
