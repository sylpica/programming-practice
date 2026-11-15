import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { definition as ps } from "../js/types/powershell/index.js";
import { definition as cmd } from "../js/types/cmd/index.js";

const runPs = (code, extra = {}) =>
  ps.simulate(code, { ...structuredClone(ps.model.defaults), ...extra });
const runCmd = (code, extra = {}) =>
  cmd.simulate(code, { ...structuredClone(cmd.model.defaults), ...extra });
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
const outPs = (r) =>
  r.paths.map((p) =>
    p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
  );
const hostPs = (r) =>
  r.paths.map((p) =>
    p.outputs.filter((o) => o.channel === "Write-Host").map((o) => o.text),
  );
const traceCmd = (r) => r.paths.map((p) => p.trace.map((t) => t.text));
const r6 = JSON.parse(
  fs.readFileSync(
    new URL("../docs/audit/reference-r6.json", import.meta.url),
    "utf8",
  ),
);
const r6Row = (kind, name) =>
  r6.find((e) => e.kind === kind && e.name === name);
const byName = (def, name) => def.reference.find((r) => r.name === name);

// ---------- NX-N8: コマンド引数位置の $? ----------
test("batch2-shell NX-N8 Write-Output $? in argument position is True, not \"?\"", () => {
  for (const code of [
    "Write-Output $?",
    "Write-Output -InputObject $?",
    "echo $?",
  ]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outPs(r), [["True"]], code);
  }
});
test("batch2-shell NX-N8 Write-Host $? in argument position is True", () => {
  const r = runPs("Write-Host $?");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(hostPs(r), [["True"]]);
});
test("batch2-shell NX-N8 $? as a parameter value is evaluated as an automatic variable", () => {
  const r = runPs("Write-Output 1\nWrite-Output $?");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["1", "True"]]);
});
test("batch2-shell NX-N8 bareword and wildcard arguments still parse as literals", () => {
  const r = runPs('Get-ChildItem -Filter "*.txt" | Select-Object Name');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [
    ["Name : notes.txt", "Name : readme.txt"],
  ]);
  const r2 = runPs("Get-ChildItem *.txt | Select-Object Name");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(outPs(r2), [
    ["Name : notes.txt", "Name : readme.txt"],
  ]);
});

// ---------- NX-N17: Length を持たないオブジェクト ----------
test("batch2-shell NX-N17 Select-Object shows $null Length for folders, real Length for files", () => {
  const r = runPs("Get-ChildItem | Select-Object Name,Length");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [
    [
      "Name : notes.txt\nLength : 14",
      "Name : data.csv\nLength : 22",
      "Name : readme.txt\nLength : 10",
      "Name : logs\nLength : $null",
    ],
  ]);
});
test("batch2-shell NX-N17 Measure-Object Length -Sum excludes the fabricated folder size", () => {
  const r = runPs("Get-ChildItem | Measure-Object Length -Sum");
  assert.deepEqual(errors(r), []);
  const props = r.paths[0].ps.streams[0][0].properties;
  assert.equal(props.Sum, 46);
  assert.equal(props.Count, 3);
});
test("batch2-shell NX-N17 PSCustomObject without Length yields $null but Count stays 1", () => {
  const r = runPs(
    '[pscustomobject]@{Name="A"} | ForEach-Object { $_.Length -eq $null }\n[pscustomobject]@{Name="A"} | ForEach-Object { $_.Count }',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["True", "1"]]);
});
test("batch2-shell NX-N17 Length semantics for scalars, strings, arrays, hashtables and $null", () => {
  const r = runPs(
    "(5).Length -eq $null\n($true).Length -eq $null\n\"hi\".Length\n@(1,2).Length\n$h=@{a=1;b=2}\n$h.Length -eq $null\n$h.Count\n$null.Length\n$null.Count",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [
    ["True", "True", "2", "2", "True", "2", "0", "0"],
  ]);
});

// ---------- NX-N27: Write-Host の -Separator ----------
test("batch2-shell NX-N27 Write-Host positional array honours -Separator", () => {
  const r = runPs('Write-Host "a","b" -Separator "-"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(hostPs(r), [["a-b"]]);
});
test("batch2-shell NX-N27 Write-Host separator works for spaced, named and variable arrays", () => {
  for (const code of [
    'Write-Host "a" "b" -Separator "-"',
    'Write-Host -Object "a","b" -Separator "-"',
    '$a=@("a","b")\nWrite-Host $a -Separator "-"',
  ]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(hostPs(r), [["a-b"]], code);
  }
  const plain = runPs('Write-Host "a","b"');
  assert.deepEqual(hostPs(plain), [["a b"]]);
});

// ---------- NX-N28: cmd set X= は削除 ----------
test("batch2-shell NX-N28 set X= narrates deletion, not an empty assignment", () => {
  const r = runCmd("@echo off\nset X=hello\nset X=\necho [%X%]");
  assert.deepEqual(errors(r), []);
  assert.ok(traceCmd(r)[0].includes("X を未定義にします（削除します）"));
  assert.ok(
    !traceCmd(r)[0].some((t) => t.startsWith("X を設定します：") && t.endsWith("：")),
  );
  assert.deepEqual(Object.keys(r.paths[0].vars), []);
});
test("batch2-shell NX-N28 quoted set \"X=\" also narrates deletion", () => {
  const r = runCmd('set X=hello\nset "X="\necho [%X%]');
  assert.deepEqual(errors(r), []);
  assert.ok(traceCmd(r)[0].includes("X を未定義にします（削除します）"));
});

// ---------- M-N1: PowerShell パラメーター値不足 ----------
test("batch2-shell M-N1 supported parameters missing a value name the missing value", () => {
  for (const code of [
    "Get-ChildItem -Path",
    "Get-ChildItem -Filter",
    "Get-Content -Path",
    "Set-Location -Path",
    "Test-Path -Path",
    "Remove-Item -Path",
    "Get-ChildItem -Path -Recurse",
    "Select-Object -First",
    "New-Item -Path",
    "Write-Host -Separator",
    "Rename-Item -NewName",
    "Copy-Item -Destination",
  ]) {
    const r = runPs(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, /の値が必要です$/, code);
    assert.doesNotMatch(errors(r)[0].message, /未対応のパラメータ/, code);
    assert.equal(errors(r)[0].category, "ParameterBindingException", code);
  }
});
test("batch2-shell M-N1 unsupported parameters are consistent with and without a value", () => {
  for (const [bare, withValue] of [
    ["Get-ChildItem -Credential", 'Get-ChildItem -Credential "x"'],
    ["Get-ChildItem -Depth", "Get-ChildItem -Depth 2"],
    ["Get-ChildItem -Bogus", "Get-ChildItem -Bogus 1"],
  ]) {
    const a = errors(runPs(bare))[0],
      b = errors(runPs(withValue))[0];
    assert.match(a.message, /未対応のパラメータ：Get-ChildItem -/, bare);
    assert.equal(a.message, b.message, bare);
    assert.equal(a.category, b.category, bare);
    assert.equal(a.category, "未対応", bare);
  }
});
test("batch2-shell M-N1 unsupported switch -Force on Get-ChildItem stays unsupported", () => {
  const r = runPs("Get-ChildItem -Force");
  assert.match(errors(r)[0].message, /未対応のパラメータ：Get-ChildItem -force/);
  assert.equal(errors(r)[0].category, "未対応");
});
test("batch2-shell M-N1 supported parameters with values still work", () => {
  const r = runPs('Get-ChildItem -Path "C:/model"');
  // パラメーター自体は受理され、ファイルシステム側のエラーまで進む。
  assert.match(errors(r)[0].message, /モデルにパスがありません/);
  const ok = runPs("Test-Path notes.txt");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outPs(ok), [["True"]]);
});

// ---------- M-N4: cmd 引数不足 ----------
test("batch2-shell M-N4 find with no arguments reports a missing search string", () => {
  for (const code of ["find", "find /i"]) {
    const r = runCmd(code);
    assert.match(errors(r)[0].message, /findには検索文字列が必要です/, code);
  }
  const unquoted = runCmd("find x notes.txt");
  assert.match(
    errors(unquoted)[0].message,
    /findの検索文字列は二重引用符で囲んでください/,
  );
});
test("batch2-shell M-N4 copy/move/ren shortages report what is missing, excess stays unsupported", () => {
  for (const [code, pattern] of [
    ["copy", /copyにはコピー元とコピー先が必要です/],
    ["copy a.txt", /copyにはコピー元とコピー先が必要です/],
    ["move a.txt", /moveには移動元と移動先が必要です/],
    ["ren", /renには元のパスと新しい名前が必要です/],
    ["ren a.txt", /renには元のパスと新しい名前が必要です/],
  ]) {
    const r = runCmd(code);
    assert.match(errors(r)[0].message, pattern, code);
    assert.equal(errors(r)[0].category, "SyntaxError", code);
  }
  for (const [code, pattern] of [
    ["copy a.txt b.txt c.txt", /未対応：copy\/moveは単一のコピー元・コピー先のみ/],
    ["ren a.txt b.txt c.txt", /未対応：renは単一パスと新しい名前のみ/],
    ["copy *.txt b.txt", /未対応：copy\/moveは単一のコピー元・コピー先のみ/],
  ]) {
    const r = runCmd(code);
    assert.match(errors(r)[0].message, pattern, code);
  }
});
test("batch2-shell M-N4 type and goto shortages report what is missing", () => {
  assert.match(errors(runCmd("type"))[0].message, /typeにはファイル名が必要です/);
  assert.match(
    errors(runCmd("type missing.txt"))[0].message,
    /モデルにファイルがありません/,
  );
  assert.match(errors(runCmd("goto"))[0].message, /gotoにはラベルが必要です/);
  assert.match(
    errors(runCmd("goto missing"))[0].message,
    /ラベルが見つかりません：missing/,
  );
});
test("batch2-shell M-N4 bare if and for report missing syntax, not unsupported commands", () => {
  assert.match(
    errors(runCmd("if"))[0].message,
    /ifには条件と実行するコマンドが必要です/,
  );
  assert.match(
    errors(runCmd("for"))[0].message,
    /forにはループ変数、対象の一覧と実行するコマンドが必要です/,
  );
});
test("batch2-shell M-N4 bare md/mkdir and call report missing arguments", () => {
  assert.match(errors(runCmd("md"))[0].message, /mdにはフォルダ名が必要です/);
  assert.match(
    errors(runCmd("mkdir"))[0].message,
    /mkdirにはフォルダ名が必要です/,
  );
  assert.match(
    errors(runCmd("call"))[0].message,
    /callには呼び出し先ラベルが必要です/,
  );
  const ok = runCmd("md extra\nrd extra");
  assert.deepEqual(errors(ok), []);
});

// ---------- D1-2: $Matches ----------
test("batch2-shell D1-2 $Matches reference item exists and its example resolves the match", () => {
  const item = byName(ps, "$Matches");
  assert.ok(item);
  assert.equal(item.supported, true);
  const r = runPs(item.example);
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["True", "123"]]);
  const groups = runPs(
    '"abc123" -match "([a-z]+)([0-9]+)"\n$Matches[1]\n$Matches[2]',
  );
  assert.deepEqual(errors(groups), []);
  assert.deepEqual(outPs(groups), [["True", "abc", "123"]]);
});
test("batch2-shell D1-2 $Matches row in reference-r6.json is in sync with the definition", () => {
  const item = byName(ps, "$Matches"),
    row = r6Row("powershell", "$Matches");
  assert.ok(row);
  for (const field of ["description", "example", "returns", "caution", "source"])
    assert.equal(row[field], item[field], field);
});

// ---------- D1-3: 比較演算子の変種6表記 ----------
test("batch2-shell D1-3 comparison variants are named in syntax and description and execute", () => {
  const item = byName(ps, "比較演算子");
  for (const op of ["-notlike", "-notmatch", "-ceq", "-cne", "-ieq", "-ine"]) {
    assert.ok(item.syntax.includes(op), "syntax " + op);
    assert.ok(item.description.includes(op), "description " + op);
  }
  assert.equal(r6Row("powershell", "比較演算子").description, item.description);
  const r = runPs(
    '"abc" -notlike "z*"\n"abc" -notmatch "z"\n"Abc" -ceq "abc"\n"Abc" -cne "abc"\n"Abc" -ieq "abc"\n"Abc" -ine "abc"',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [
    ["True", "True", "False", "True", "True", "False"],
  ]);
});

// ---------- D2-3: 算術・代入演算子の前置形式 ----------
test("batch2-shell D2-3 arithmetic item no longer claims postfix-only and prefix executes", () => {
  const item = byName(ps, "算術・代入演算子");
  assert.doesNotMatch(item.description, /後置形式に対応します/);
  assert.doesNotMatch(item.description, /後置形式のみ/);
  assert.ok(item.description.includes("前置形式"));
  assert.ok(item.syntax.includes("++$x"));
  assert.ok(item.syntax.includes("--$x"));
  assert.equal(
    r6Row("powershell", "算術・代入演算子").description,
    item.description,
  );
  const r = runPs("$x=1\n$y=++$x\n$y\n$x");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["2", "2"]]);
});

// ---------- D2-1: cmd/dir 個票同期 ----------
test("batch2-shell D2-1 cmd dir row in reference-r6.json matches the definition", () => {
  const item = byName(cmd, "dir"),
    row = r6Row("cmd", "dir");
  assert.ok(item.description.includes("/sを併用すると対象フォルダ以下を再帰的にフルパスで列挙します。"));
  assert.equal(row.description, item.description);
});
