/* ブロックB3 PS-ENG: PowerShell 高度モード（コマンドレット・自動変数）のテスト。
 * 期待値は Microsoft Learn（PowerShell 7.4）の各コマンドレットヘルプと
 * about_Automatic_Variables から導いた。高度レジストリは activateAdvanced()
 * で有効化してから definition.simulate 経由で実行する。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/powershell/index.js";
import { applyAdvancedEngine } from "../js/types/powershell/advanced-engine.js";
import { CMDLETS } from "../js/types/powershell/engine-advanced-cmdlets.js";
import { AUTOVARS } from "../js/types/powershell/engine-advanced-vars.js";

applyAdvancedEngine(d);

const run = (code, extra = {}, limits) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra }, limits);
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
const out = (r) =>
  r.paths.map((p) =>
    p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
  );
const stream = (r) => r.paths[0].ps.streams[0];

/* ---------- レジストリの完全性 ---------- */
test("registry covers all non-base cmdlets with counts", () => {
  const keys = Object.keys(CMDLETS);
  assert.equal(keys.length, 250);
  const by = { run: 0, unsupported: 0, unverified: 0 };
  for (const k of keys) {
    const e = CMDLETS[k];
    if (e.run) by.run++;
    else if (e.unsupported) by.unsupported++;
    else if (e.unverified) by.unverified++;
    else assert.fail("no disposition for " + k);
    assert.ok(Array.isArray(e.params), k + " params");
  }
  assert.deepEqual(by, { run: 56, unsupported: 168, unverified: 26 });
  // 基礎にあるものは高度レジストリに二重登録しない
  for (const base of ["get-content", "select-object", "measure-object", "where-object", "foreach-object", "sort-object", "test-path", "write-output"])
    assert.ok(!(base in CMDLETS), base);
});
test("registry covers all non-base automatic variables", () => {
  assert.equal(Object.keys(AUTOVARS).length, 35);
  for (const base of ["?", "_", "psitem", "args", "home", "lastexitcode", "matches", "psversiontable", "pwd", "true", "false", "null"])
    assert.ok(!(base in AUTOVARS), base);
});

/* ---------- パス・仮想FS ---------- */
test("Join-Path joins and resolves relative parts", () => {
  const r = run('Join-Path "C:\\Practice" "sub\\file.txt"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\sub\\file.txt"]]);
  const r2 = run('Join-Path -Path "C:\\Practice" -ChildPath "a" -AdditionalChildPath "b","c"');
  assert.deepEqual(out(r2), [["C:\\Practice\\a\\b\\c"]]);
});
test("Join-Path -Resolve fails for a missing path", () => {
  const r = run('Join-Path "C:\\Practice" "nope.txt" -Resolve');
  assert.match(errors(r)[0].message, /モデルにパスがありません/);
});
test("Split-Path modes", () => {
  assert.deepEqual(out(run('Split-Path "C:\\Practice\\notes.txt"')), [["C:\\Practice"]]);
  assert.deepEqual(out(run('Split-Path "C:\\Practice\\notes.txt" -Leaf')), [["notes.txt"]]);
  assert.deepEqual(out(run('Split-Path "C:\\Practice\\notes.txt" -Extension $true')), [[".txt"]]);
  assert.deepEqual(out(run('Split-Path "C:\\Practice\\notes.txt" -LeafBase $true')), [["notes"]]);
  assert.deepEqual(out(run('Split-Path "C:\\Practice\\notes.txt" -Qualifier $true')), [["C:"]]);
  assert.deepEqual(out(run('Split-Path "C:\\Practice\\notes.txt" -IsAbsolute $true')), [["True"]]);
});
test("Resolve-Path and Convert-Path return the model path", () => {
  const r = run('Resolve-Path "notes.txt"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\notes.txt"]]);
  assert.deepEqual(out(run('Resolve-Path "notes.txt" -Relative $true')), [["notes.txt"]]);
  assert.deepEqual(out(run('Convert-Path "notes.txt"')), [["C:\\Practice\\notes.txt"]]);
  assert.match(errors(run('Resolve-Path "missing.txt"'))[0].message, /モデルにパスがありません/);
});
test("Get-Item returns FileInfo with model properties", () => {
  const r = run('Get-Item "notes.txt"');
  assert.deepEqual(errors(r), []);
  const v = stream(r)[0];
  assert.equal(v.psType, "FileInfo");
  assert.equal(v.properties.Name, "notes.txt");
  assert.equal(v.properties.FullName, "C:\\Practice\\notes.txt");
  assert.equal(v.properties.PSIsContainer, false);
  assert.equal(v.properties.Length, 14);
  assert.equal(v.properties.Extension, ".txt");
});
test("Clear-Content empties a model file", () => {
  const r = run("Clear-Content notes.txt\nGet-Content notes.txt");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [[]]);
});
test("Push-Location / Pop-Location move within the model", () => {
  const r = run("Push-Location logs\n(Get-Location).Path\nPop-Location\n(Get-Location).Path");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\logs", "C:\\Practice"]]);
  const empty = run("Pop-Location");
  assert.match(errors(empty)[0].message, /場所スタックが空/);
});
test("Get-PSDrive and Get-PSProvider describe the model drive", () => {
  const r = run("(Get-PSDrive).Name\n(Get-PSProvider).Name");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C", "FileSystem"]]);
});
test("Get-FileHash computes SHA-256 and SHA-1 of the model content bytes", () => {
  const extra = {
    files: [
      { path: "C:\\Practice", type: "directory" },
      { path: "C:\\Practice\\abc.txt", type: "file", content: "abc" },
    ],
  };
  // FIPS 180-4 の既知ベクトル（"abc"）
  assert.deepEqual(
    out(run("(Get-FileHash abc.txt).Hash", extra)),
    [["BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD"]],
  );
  assert.deepEqual(
    out(run("(Get-FileHash abc.txt -Algorithm SHA1).Hash", extra)),
    [["A9993E364706816ABA3E25717850C26C9CD0D89D"]],
  );
  const bad = run("Get-FileHash abc.txt -Algorithm MD5", extra);
  assert.match(errors(bad)[0].message, /未対応：Get-FileHash -Algorithm MD5/);
});

/* ---------- 変換 ---------- */
test("ConvertTo-Json serializes a hashtable and -Compress compacts", () => {
  const r = run('@{Name="Alice"; Score=80} | ConvertTo-Json -Compress');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [['{"Name":"Alice","Score":80}']]);
});
test("ConvertTo-Json stops unverified beyond -Depth", () => {
  const r = run("@{a=@{b=@{c=1}}} | ConvertTo-Json");
  assert.match(errors(r)[0].message, /未検証：ConvertTo-Json の -Depth/);
  const ok = run("@{a=@{b=@{c=1}}} | ConvertTo-Json -Depth 5 -Compress");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(out(ok), [['{"a":{"b":{"c":1}}}']]);
});
test("ConvertFrom-Json builds objects and hashtables", () => {
  const r = run('$o = \'{"Name":"Alice","Score":80}\' | ConvertFrom-Json\n$o.Name\n$o.Score');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Alice", "80"]]);
  const h = run('$h = \'{"Name":"Alice"}\' | ConvertFrom-Json -AsHashtable\n$h["Name"]');
  assert.deepEqual(out(h), [["Alice"]]);
  const bad = run("'not json' | ConvertFrom-Json");
  assert.match(errors(bad)[0].message, /JSONの解析に失敗/);
});
test("Test-Json validates without throwing", () => {
  assert.deepEqual(out(run("Test-Json '{\"a\":1}'")), [["True"]]);
  assert.deepEqual(out(run("Test-Json '{bad}'")), [["False"]]);
});
test("ConvertTo-Csv / ConvertFrom-Csv round trip values", () => {
  const r = run(
    '$rows = \'[{"Name":"Alice","Score":"80"},{"Name":"Bob","Score":"90"}]\' | ConvertFrom-Json\n$rows | ConvertTo-Csv',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Name,Score", "Alice,80", "Bob,90"]]);
  const back = run(
    'Get-Content data.csv | ConvertFrom-Csv | Select-Object -ExpandProperty Name',
  );
  assert.deepEqual(errors(back), []);
  assert.deepEqual(out(back), [["Alice"]]);
});
test("Export-Csv writes and Import-Csv reads the model file", () => {
  const r = run(
    '$rows = \'[{"Name":"Alice","Score":"80"}]\' | ConvertFrom-Json\n$rows | Export-Csv exp.csv\nImport-Csv exp.csv | Select-Object -ExpandProperty Score',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["80"]]);
});
test("ConvertFrom-StringData parses key=value lines", () => {
  const r = run('$h = "a=1`nb=2" | ConvertFrom-StringData\n$h.a\n$h.b');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1", "2"]]);
});

/* ---------- 値の操作 ---------- */
test("Compare-Object reports <= and => and == with -IncludeEqual", () => {
  const r = run("Compare-Object @(1,2,3) @(2,3,4)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(
    stream(r).map((v) => [v.properties.InputObject, v.properties.SideIndicator]),
    [[1, "<="], [4, "=>"]],
  );
  const eq = run("Compare-Object @(1,2) @(2,3) -IncludeEqual");
  assert.deepEqual(
    stream(eq).map((v) => [v.properties.InputObject, v.properties.SideIndicator]),
    [[1, "<="], [2, "=="], [3, "=>"]],
  );
});
test("Group-Object groups pipeline values", () => {
  const r = run("'a','b','a' | Group-Object");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(
    stream(r).map((v) => [v.properties.Name, v.properties.Count]),
    [["a", 2], ["b", 1]],
  );
});
test("Get-Unique removes adjacent duplicates of sorted input", () => {
  const r = run("1,1,2,2,3 | Sort-Object | Get-Unique");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1", "2", "3"]]);
});
test("Join-String joins with separator, prefix and suffix", () => {
  assert.deepEqual(out(run("'a','b','c' | Join-String -Separator ','")), [["a,b,c"]]);
  // 既定の区切りは $OFS の既定値（空白1つ）
  assert.deepEqual(out(run("'a','b' | Join-String")), [["a b"]]);
  assert.deepEqual(
    out(run("'a','b' | Join-String -Separator '-' -OutputPrefix '<' -OutputSuffix '>'")),
    [["<a-b>"]],
  );
});
test("Select-String finds lines in files and input, -Quiet returns bool", () => {
  const r = run('Select-String -Pattern "Alice" -Path data.csv');
  assert.deepEqual(errors(r), []);
  const v = stream(r)[0];
  assert.equal(v.properties.Line, "Alice,80");
  assert.equal(v.properties.LineNumber, 2);
  assert.equal(v.properties.Path, "C:\\Practice\\data.csv");
  assert.deepEqual(out(run('"hello" | Select-String -Pattern "ell" -Quiet')), [["True"]]);
  assert.deepEqual(out(run('"hello" | Select-String -Pattern "z" -Quiet')), [["False"]]);
});
test("New-Object PSCustomObject and Add-Member NoteProperty", () => {
  const r = run(
    "$o = New-Object -TypeName PSCustomObject -Property @{A=1}\n$o | Add-Member -MemberType NoteProperty -Name B -Value 2\n$o.A\n$o.B",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1", "2"]]);
  const bad = run("New-Object -TypeName System.Random");
  assert.match(errors(bad)[0].message, /未対応：New-Object -TypeName/);
});

/* ---------- 実行時に決まる値 ---------- */
test("Get-Random returns an unknown value that branches comparisons", () => {
  const r = run("Get-Random -Maximum 10");
  assert.deepEqual(errors(r), []);
  assert.match(out(r)[0][0], /実行時に決まる：乱数/);
  const b = run("if ((Get-Random -Maximum 10) -gt 5) { 'big' } else { 'small' }");
  assert.deepEqual(errors(b), []);
  assert.deepEqual(out(b), [["big"], ["small"]]);
});
test("New-Guid returns an unknown string", () => {
  const r = run("New-Guid");
  assert.deepEqual(errors(r), []);
  assert.match(out(r)[0][0], /実行時に決まる：.*GUID/);
});
test("Get-Date without a model time returns an unknown current date", () => {
  const r = run("Get-Date");
  assert.deepEqual(errors(r), []);
  assert.match(out(r)[0][0], /実行時に決まる：現在の日時/);
});
test("Get-Date from Unix time and ISO date is deterministic", () => {
  // 1700000000 = 2023-11-14T22:13:20Z
  const r = run(
    "$d = Get-Date -UnixTimeSeconds 1700000000\n$d.Year\n$d.Month\n$d.Day\n$d.Hour\n$d.Minute\n$d.Second",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["2023", "11", "14", "22", "13", "20"]]);
  assert.deepEqual(out(run('Get-Date -Date "2024-02-29" -Format "yyyy/MM/dd"')), [["2024/02/29"]]);
  assert.deepEqual(out(run('Get-Date -Date "2024-03-05" -UFormat "%Y-%m-%d"')), [["2024-03-05"]]);
  assert.deepEqual(out(run('(Get-Date -Date "2024-01-02" -Year 2025).Year')), [["2025"]]);
  const culture = run('Get-Date -Date "02/29/2024"');
  assert.match(errors(culture)[0].message, /未検証：Get-Date -Date/);
});
test("New-TimeSpan computes components and totals", () => {
  assert.deepEqual(out(run("(New-TimeSpan -Days 1 -Hours 2).TotalHours")), [["26"]]);
  assert.deepEqual(out(run('(New-TimeSpan -Start "2024-01-01" -End "2024-01-03").Days')), [["2"]]);
  assert.deepEqual(out(run("(New-TimeSpan -Minutes 90).TotalMinutes")), [["90"]]);
});

/* ---------- コマンド情報・別名・出力系 ---------- */
test("Get-Command finds cmdlets, aliases and reports missing names", () => {
  assert.deepEqual(out(run("(Get-Command Get-Content).CommandType")), [["Cmdlet"]]);
  assert.deepEqual(out(run("(Get-Command ls).Definition")), [["Get-ChildItem"]]);
  assert.deepEqual(out(run("(Get-Command ConvertTo-Json).Name")), [["ConvertTo-Json"]]);
  const bad = run("Get-Command No-Such-Thing");
  assert.match(errors(bad)[0].message, /モデルにコマンドが見つかりません/);
});
test("Get-Alias reads the static alias table", () => {
  assert.deepEqual(out(run("(Get-Alias gci).Definition")), [["Get-ChildItem"]]);
  const bad = run("Get-Alias nosuchalias");
  assert.match(errors(bad)[0].message, /モデルに別名が見つかりません/);
});
test("Out-Null discards, Out-File writes lines, Out-String joins", () => {
  assert.deepEqual(out(run("1,2 | Out-Null")), [[]]);
  const f = run('"hello" | Out-File out.txt\nGet-Content out.txt');
  assert.deepEqual(errors(f), []);
  assert.deepEqual(out(f), [["hello"]]);
  assert.deepEqual(out(run('"a","b" | Out-String')), [["a\r\nb\r\n"]]);
});
test("Tee-Object passes values through and captures a variable", () => {
  const r = run("'x' | Tee-Object -Variable v\n$v");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["x", "x"]]);
});
test("Write-Warning records a warning, Write-Verbose is silent by default", () => {
  const w = run('Write-Warning "careful"');
  assert.deepEqual(errors(w), []);
  assert.ok(w.paths[0].outputs.some((o) => o.channel === "Write-Warning" && o.text === "careful"));
  const v = run('Write-Verbose "detail"\nWrite-Debug "dbg"\nWrite-Information "info"');
  assert.deepEqual(errors(v), []);
  assert.deepEqual(v.paths[0].outputs, []);
});
test("Write-Error is non-terminating by default", () => {
  const r = run('Write-Error "oops"\n"after"');
  assert.deepEqual(errors(r), []);
  assert.ok(r.paths[0].outputs.some((o) => o.channel === "Write-Error" && o.text === "oops"));
  assert.deepEqual(out(r), [["after"]]);
});
test("Start-Sleep is a no-op for the data flow", () => {
  assert.deepEqual(out(run('Start-Sleep -Seconds 0\n"done"')), [["done"]]);
});

/* ---------- 変数コマンドレット ---------- */
test("Set/New/Get/Remove/Clear-Variable work on the model scope", () => {
  assert.deepEqual(out(run("Set-Variable -Name foo -Value 42\n$foo")), [["42"]]);
  assert.deepEqual(out(run("New-Variable -Name bar -Value 7\nGet-Variable bar -ValueOnly")), [["7"]]);
  assert.deepEqual(out(run("Get-Variable seed -ValueOnly", { variables: { seed: 5 } })), [["5"]]);
  const dup = run("New-Variable -Name x -Value 1\nNew-Variable -Name x -Value 2");
  assert.match(errors(dup)[0].message, /同じ名前の変数が既にあります/);
  const cleared = run("$v = 3\nClear-Variable -Name v\n$v -eq $null");
  assert.deepEqual(out(cleared), [["True"]]);
  const removed = run("$v = 3\nRemove-Variable -Name v\nGet-Variable v");
  assert.match(errors(removed)[0].message, /モデルに変数が見つかりません/);
});

/* ---------- 未対応・未検証の名指し停止 ---------- */
for (const [code, pattern] of [
  ["Start-Process notepad", /未対応：Start-Process はモデルで未対応です/],
  ["Get-Service", /未対応：Get-Service はモデルで未対応です/],
  ["1 | Format-Table", /未対応：Format-Table はモデルで未対応です/],
  ["Start-Job { 1 }", /未対応：Start-Job はモデルで未対応です/],
  ["Get-Acl notes.txt", /未対応：Get-Acl はモデルで未対応です/],
  ["Get-Culture", /未検証：Get-Culture は意味論を一次情報で確定できていないため停止します/],
  ["Get-History", /未検証：Get-History は意味論を一次情報で確定できていないため停止します/],
  ["Get-ExecutionPolicy", /未検証：Get-ExecutionPolicy/],
  ['Join-Path "C:\\Practice" "x" -Bogus 1', /未対応のパラメータ：Join-Path -bogus/],
])
  test("named stop: " + code, () => {
    const r = run(code);
    assert.ok(errors(r).length, JSON.stringify(r.paths?.[0]?.outputs ?? r));
    assert.match(errors(r)[0].message, pattern);
  });

/* ---------- 自動変数 ---------- */
test("automatic variables with deterministic model values", () => {
  assert.deepEqual(out(run("$PSEdition")), [["Core"]]);
  assert.deepEqual(out(run("$IsWindows\n$IsLinux\n$IsMacOS\n$IsCoreCLR")), [["True", "False", "False", "True"]]);
  assert.deepEqual(out(run("$NestedPromptLevel")), [["0"]]);
  assert.deepEqual(out(run("$ShellId")), [["Microsoft.PowerShell"]]);
  assert.deepEqual(out(run("$PSBoundParameters.Count")), [["0"]]);
  assert.deepEqual(out(run("$PSCommandPath -eq ''\n$PSScriptRoot -eq ''")), [["True", "True"]]);
});
test("context-only automatic variables are $null outside their context", () => {
  for (const name of ["$Event", "$EventArgs", "$EventSubscriber", "$Sender", "$PSSenderInfo", "$this", "$PSDebugContext", "$foreach", "$switch"])
    assert.deepEqual(stream(run(name)), [null], name);
});
test("environment-dependent automatic variables are unverified unknowns", () => {
  for (const name of ["$PID", "$PROFILE", "$PSCulture", "$PSUICulture", "$Host", "$Error", "$PSHOME", "$StackTrace", "$ExecutionContext", "$input", "$MyInvocation", "$PSCmdlet", "${$}", "${^}"]) {
    const r = run(name);
    assert.deepEqual(errors(r), [], name);
    assert.match(out(r)[0][0], /実行時に決まる：未検証/, name);
  }
});
test("$foreach inside a loop is an unverified unknown, not a fabricated enumerator", () => {
  const r = run("foreach ($i in 1..2) { $foreach }");
  assert.deepEqual(errors(r), []);
  assert.ok(stream(r).some((v) => v && v.kind === "unknown"));
});
