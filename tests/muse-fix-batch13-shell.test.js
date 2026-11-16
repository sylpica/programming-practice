// 修正バッチ13・shell班（cmd／PowerShell）の回帰テスト。
// 対象：Codex 一周監査ステップ5で「現行でも有効（B）」と裁定された
// R7-01〜16、R7-69〜75、R7-196〜213 の41件＋ECHO特別裁定1件。
// 期待値は findings-step5-shell.md／codex-step5-adjudication.md §3 の
// 実機測定（実 cmd／PowerShell 7.4.6）に基づく。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code, extra) => {
  const d = getDefinition(id);
  const model = structuredClone(d.model.defaults);
  if (extra) Object.assign(model, extra);
  return d.simulate(code, model);
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const errText = (r) => errors(r).map((e) => e.message).join("\n");
const out = (r) =>
  (r.paths || []).map((p) =>
    p.outputs
      .filter((o) => o.channel === "stdout" || o.channel === "pipeline")
      .map((o) => o.text),
  );
const cmd = (code, extra) => run("cmd", code, extra);
const ps = (code, extra) => run("powershell", code, extra);
const filesOf = (r) =>
  (r.paths || []).map((p) => p.model.files.map((f) => f.path));
const fileContent = (r, name) =>
  (r.paths || []).map(
    (p) => p.model.files.find((f) => f.path.endsWith(name))?.content,
  );

/* ================= cmd ================= */

test("R7-01: percent expansion is re-parsed, delayed is not", async () => {
  let r = await cmd('set "X=hello&echo injected"\necho %X%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["hello", "injected"]]);
  r = await cmd(
    'setlocal EnableDelayedExpansion\nset "X=hello&echo injected"\necho !X!',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["hello&echo injected"]]);
});

test("R7-02: unmatched ! is removed under delayed expansion", async () => {
  const r = await cmd("setlocal EnableDelayedExpansion\necho hello!world");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["helloworld"]]);
});

test("R7-03: if exist honours wildcards", async () => {
  const r = await cmd("if exist *.txt echo found");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["found"]]);
});

test("R7-196: /i does not turn numeric comparisons into string ones", async () => {
  const r = await cmd(
    "if /i 2 LSS 10 (echo YES) else (echo NO)\nif /i 2 GTR 10 (echo YES) else (echo NO)\nif /i 10 GEQ 2 (echo YES) else (echo NO)",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["YES", "NO", "YES"]]);
});

test("R7-197: cmd number parsing (octal, invalid octal, saturation)", async () => {
  const r = await cmd(
    "if 00010 EQU 8 (echo YES) else (echo NO)\nif 08 EQU 8 (echo YES) else (echo NO)\nif 2147483648 EQU 2147483647 (echo YES) else (echo NO)",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["YES", "NO", "YES"]]);
});

test("R7-198: set/type clear ERRORLEVEL, rd leaves it, set /p sets it", async () => {
  const el7 = { errorlevel: 7 };
  let r = await cmd("set X=one\nif errorlevel 1 (echo BAD) else (echo GOOD)", el7);
  assert.deepEqual(out(r), [["GOOD"]]);
  r = await cmd("type notes.txt\nif errorlevel 1 (echo BAD) else (echo GOOD)", el7);
  assert.equal(out(r)[0].at(-1), "GOOD");
  r = await cmd("rd logs\nif errorlevel 1 (echo BAD) else (echo GOOD)", el7);
  assert.deepEqual(out(r), [["BAD"]]);
  r = await cmd('set /p "ANSWER=Prompt:"\necho EL=%ERRORLEVEL%', {
    inputs: { ANSWER: [""] },
  });
  assert.deepEqual(out(r), [["Prompt:", "EL=1"]]);
  r = await cmd('set /p "ANSWER=Prompt:"\necho EL=%ERRORLEVEL%', {
    errorlevel: 7,
    inputs: { ANSWER: ["Alice"] },
  });
  assert.deepEqual(out(r), [["Prompt:", "EL=0"]]);
});

test("R7-199: unmatched endlocal continues without error", async () => {
  const r = await cmd("endlocal\necho EL=%ERRORLEVEL%", { errorlevel: 7 });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["EL=7"]]);
});

test("R7-209: copy/move print their success message to stdout", async () => {
  let r = await cmd("copy /y notes.txt fresh.txt");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["        1 file(s) copied."]]);
  r = await cmd(
    'copy /y notes.txt fresh.txt | find "copied"\nif errorlevel 1 (echo BAD) else (echo GOOD)',
  );
  assert.deepEqual(out(r), [["        1 file(s) copied.", "GOOD"]]);
  r = await cmd("move /y notes.txt moved.txt");
  assert.deepEqual(out(r), [["        1 file(s) moved."]]);
});

test("R7-209: set /p prompt is written to stdout (and into redirects)", async () => {
  const r = await cmd(
    'set /p "ANSWER=Prompt:" > out.txt\necho A=[%ANSWER%]\ntype out.txt',
    { inputs: { ANSWER: ["Alice"] } },
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["A=[Alice]", "Prompt:"]]);
});

test("R7-210: CMDEXTVERSION is 2 in both expansion forms", async () => {
  const r = await cmd(
    "echo [%CMDEXTVERSION%]\nsetlocal EnableDelayedExpansion\necho [!CMDEXTVERSION!]",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["[2]", "[2]"]]);
});

test("R7-210: CMDCMDLINE is a runtime value, never fabricated or literal", async () => {
  const r = await cmd("echo [%CMDCMDLINE%]");
  assert.deepEqual(errors(r), []);
  assert.match(out(r)[0][0], /実行時に決まる/);
  assert.ok(!out(r)[0][0].includes("%CMDCMDLINE%"));
});

test("ECHO: concatenated echo forms stop with the real diagnostics", async () => {
  let r = await cmd("cd logs\necho%CD%");
  assert.equal(errors(r).length, 1);
  assert.match(
    errText(r),
    /The filename, directory name, or volume label syntax is incorrect\./,
  );
  assert.deepEqual(out(r), [[]]);
  r = await cmd("setlocal EnableDelayedExpansion\ncd logs\necho!CD!");
  assert.match(
    errText(r),
    /The filename, directory name, or volume label syntax is incorrect\./,
  );
  r = await cmd("cd logs\necho!CD!");
  assert.match(
    errText(r),
    /The filename, directory name, or volume label syntax is incorrect\./,
  );
  r = await cmd("echo%ERRORLEVEL%", { errorlevel: 7 });
  assert.match(errText(r), /'echo7' is not recognized as an internal or external command/);
  // 対照：空白ありの通常形は従来どおり動く。
  r = await cmd("cd logs\necho %CD%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\logs"]]);
});

/* ================= PowerShell ================= */

test("R7-04: $null takes part in ordering comparisons as the zero value", async () => {
  const r = await ps(
    "1 -gt $null; -1 -lt $null; $null -lt 1; $null -gt -1; 1 -ge $null",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["True", "True", "True", "True", "True"]]);
});

test("R7-05: right-hand array converts to the left-hand type for -eq", async () => {
  const r = await ps("$true -eq @(1,2); '1 2' -eq @(1,2)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["True", "True"]]);
});

test("R7-06: $null * 5 is $null, 5 * $null is 0", async () => {
  const r = await ps("($null * 5) -eq $null; 5 * $null; $null * 5");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["True", "0"]]);
});

test("R7-07: positional args fill parameters not bound by name", async () => {
  const r = await ps(
    'function f {param($a,$b) "$a,$b"}\nf -a 1 2\nf 1 -a 2',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1,2", "2,1"]]);
});

test("R7-08: $Matches updates on scalar -notmatch, never for array input", async () => {
  let r = await ps("'a' -match '(a)'\n'b' -notmatch '(b)'\n$Matches[1]");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["True", "False", "b"]]);
  r = await ps("@('a','b') -match '(.)'\n$null -eq $Matches");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["a", "b", "True"]]);
});

test("R7-09: Select-Object -First and -Last return the union", async () => {
  const r = await ps(
    "1,2 | Select-Object -First 1 -Last 1\n1,2,3 | Select-Object -First 1 -Last 1 -Skip 1",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1", "2", "2", "3"]]);
});

test("R7-10: -ExpandProperty of a missing property is an error", async () => {
  const r = await ps("1,2 | Select-Object -ExpandProperty DoesNotExist");
  assert.equal(errors(r).length, 1);
  assert.match(errText(r), /Property "DoesNotExist" cannot be found\./);
});

test("R7-11: extra positional argument after -InputObject is a binding error", async () => {
  const r = await ps("Write-Output -InputObject 1 2");
  assert.equal(errors(r).length, 1);
  assert.match(errText(r), /束縛できない追加の引数/);
});

test("R7-12: empty and hex strings convert to numbers", async () => {
  const r = await ps("[int]''; [double]''; 0 -eq ''; 0 -eq '0x0'");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["0", "0", "True", "True"]]);
});

test("R7-13: Sort-Object comparison type follows the first element", async () => {
  const r = await ps("2,'10' | Sort-Object\n'10',2 | Sort-Object");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["2", "10", "10", "2"]]);
});

test("R7-14: empty array repetition returns immediately", async () => {
  const t0 = Date.now();
  const r = await ps("@() * 100000000");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [[]]);
  assert.ok(Date.now() - t0 < 5000, "empty repetition must not spin");
});

test("R7-15: $null or missing -Path is a binding error, no file named null", async () => {
  let r = await ps('Set-Content $null "secret"');
  assert.equal(errors(r).length, 1);
  assert.match(errText(r), /-Pathが必要です/);
  assert.ok(!filesOf(r)[0].some((f) => f.endsWith("\\null")));
  r = await ps("Get-Content");
  assert.equal(errors(r).length, 1);
  assert.match(errText(r), /-Pathが必要です/);
});

test("R7-16: Extension of a dot-leading name is the whole name", async () => {
  const r = await ps(
    'New-Item -Path ".hidden" | Select-Object -ExpandProperty Extension',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [[".hidden"]]);
});

test("R7-69: Get-ChildItem -Recurse follows wildcard paths", async () => {
  const model = {
    files: [
      { path: "C:\\Practice", type: "directory" },
      { path: "C:\\Practice\\notes.txt", type: "file", content: "n\r\n" },
      { path: "C:\\Practice\\empty.txt", type: "file", content: "" },
      { path: "C:\\Practice\\lines.txt", type: "file", content: "a\r\n" },
      { path: "C:\\Practice\\logs", type: "directory" },
      { path: "C:\\Practice\\logs\\nested.txt", type: "file", content: "x\r\n" },
    ],
  };
  let r = await ps(
    'Get-ChildItem -Path "*.txt" -Recurse | Select-Object -ExpandProperty Name',
    model,
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["notes.txt", "empty.txt", "lines.txt", "nested.txt"]]);
  r = await ps(
    'Get-ChildItem -Path ".\\*.txt" -Recurse | Select-Object -ExpandProperty Name',
    model,
  );
  assert.deepEqual(out(r), [["notes.txt", "empty.txt", "lines.txt", "nested.txt"]]);
});

test("R7-70: Get-Content -Raw of an empty file is $null", async () => {
  const r = await ps(
    "Set-Content out.txt $null\n(Get-Content out.txt -Raw) -eq $null",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["True"]]);
});

test("R7-71: lone CR is a line separator for Get-Content", async () => {
  const r = await ps(
    '"a`rb`nc`r`nd" | Set-Content out.txt\n@(Get-Content out.txt).Count',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["4"]]);
});

test("R7-72: Set-Location with no argument moves to $HOME", async () => {
  const r = await ps("Set-Location\n(Get-Location).Path");
  assert.deepEqual(errors(r), []);
  assert.match(out(r)[0][0], /実行時に決まる：\$HOME/);
});

test("R7-73: Measure-Object with an absent property outputs nothing", async () => {
  const r = await ps(
    '1,2,3 | Measure-Object -Property NoSuchProperty -Sum\n"done"',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["done"]]);
});

test("R7-74: Select-Object -Property with a wildcard selects matches only", async () => {
  const r = await ps('1,2 | Select-Object -Property "NoSuch*"');
  assert.deepEqual(errors(r), []);
  const values = r.paths[0].ps.streams[0];
  assert.equal(values.length, 2);
  for (const v of values)
    assert.deepEqual(Object.keys(v.properties), []);
});

test("R7-75: sc is not a Set-Content alias in PowerShell 7.4", async () => {
  const r = await ps('sc out.txt "Hello"');
  assert.equal(errors(r).length, 1);
  assert.match(errText(r), /未対応のPowerShellコマンドレット／関数：sc/);
  assert.ok(!filesOf(r)[0].some((f) => f.endsWith("out.txt")));
});

test("R7-200: array -Path works for Set/Get-Content and Test-Path", async () => {
  const r = await ps(
    "Set-Content -Path @('notes.txt','readme.txt') -Value 'x'\nGet-Content @('notes.txt','readme.txt')\nTest-Path @('notes.txt','readme.txt')",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["x", "x", "True", "True"]]);
  assert.ok(!filesOf(r)[0].some((f) => f.includes(",")));
});

test("R7-200 sweep: array -Path also works for Remove-Item/Get-ChildItem", async () => {
  const r = await ps(
    "Get-ChildItem @('notes.txt','readme.txt') | Select-Object -ExpandProperty Name\nRemove-Item @('data.csv')\nTest-Path data.csv",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["notes.txt", "readme.txt", "False"]]);
});

test("R7-201: wildcard -Path expands for Set/Get-Content and Test-Path", async () => {
  const r = await ps(
    "Set-Content -Path '*.txt' -Value 'x'\nGet-Content -Path '*.txt'\nTest-Path '[n]otes.txt'",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["x", "x", "True"]]);
  assert.ok(!filesOf(r)[0].some((f) => f.endsWith("*.txt")));
});

test("R7-202: New-Item rejects Windows-invalid characters", async () => {
  const r = await ps(
    "New-Item -Path 'bad<.txt' -ItemType File -Value 'x' -Force",
  );
  assert.equal(errors(r).length, 1);
  assert.match(
    errText(r),
    /The filename, directory name, or volume label syntax is incorrect\./,
  );
  assert.ok(!filesOf(r)[0].some((f) => f.includes("bad<")));
});

test("R7-203: $null values write no lines", async () => {
  const r = await ps(
    "Set-Content -Path 'fresh.txt' -Value $null\nGet-ChildItem fresh.txt | Select-Object -ExpandProperty Length\nSet-Content -Path 'f2.txt' -Value @($null,'a',$null,'b')\nGet-ChildItem f2.txt | Select-Object -ExpandProperty Length",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["0", "6"]]);
  assert.deepEqual(fileContent(r, "fresh.txt"), [""]);
});

test("R7-204: New-Item -Value with an array writes System.Object[]", async () => {
  const r = await ps(
    "New-Item -Path 'fresh.txt' -Value @(1,2) -ItemType File\nGet-Content -Raw fresh.txt",
  );
  assert.deepEqual(errors(r), []);
  assert.equal(out(r)[0].at(-1), "System.Object[]");
  assert.deepEqual(fileContent(r, "fresh.txt"), ["System.Object[]"]);
});

test("R7-205: Select-Object counts reject $null, arrays and Int32 overflow", async () => {
  for (const code of [
    "1,2,3,4 | Select-Object -First $null",
    "1,2,3,4 | Select-Object -Skip $null",
    "1,2,3,4 | Select-Object -First 2147483648",
    "1,2,3,4 | Select-Object -First @()",
  ]) {
    const r = await ps(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errText(r), /Select-Object/, code);
  }
});

test("R7-206: member enumeration skips elements without the key", async () => {
  const r = await ps(
    "$x=@(@{a=1},@{b=2}); $x.a.Count\n$y=@(@{a=$null},@{b=2}); $y.a.Count",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1", "0"]]);
});

test("R7-207: quoted strings are never syntax", async () => {
  let r = await ps('"return"; \'after\'');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["return", "after"]]);
  r = await ps('Write-Output ";"; Write-Output "|"; Write-Output "{"; ";"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [[";", "|", "{", ";"]]);
});

test("R7-211: function automatic variables $input/$PSBoundParameters/$MyInvocation", async () => {
  let r = await ps("function Pass { $input }\n1,2,3 | Pass");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1", "2", "3"]]);
  r = await ps(
    "function Check {param($x) $PSBoundParameters.Count}\nCheck -x 7\nCheck 7",
  );
  assert.deepEqual(out(r), [["1", "1"]]);
  r = await ps("function Check {$MyInvocation.MyCommand.Name}\nCheck");
  assert.deepEqual(out(r), [["Check"]]);
});

test("R7-212: duplicate parameter names are a parse error", async () => {
  const r = await ps("function Check {param($x,$x) $x}\nCheck 1 2");
  assert.equal(errors(r).length, 1);
  assert.match(errText(r), /Duplicate parameter \$x in parameter list\./);
  const r2 = await ps("function Check {param($x,$X) $x}\nCheck 1 2");
  assert.equal(errors(r2).length, 1);
});

test("R7-213: protected variable names cannot be parameters", async () => {
  for (const code of [
    "function Check {param($true) $true}\nCheck 7",
    "function Check {param($null) 1}\nCheck 7",
  ]) {
    const r = await ps(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errText(r), /read-only or constant/, code);
  }
});
