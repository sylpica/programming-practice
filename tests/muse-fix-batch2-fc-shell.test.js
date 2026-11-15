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
const outCmd = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const fileNames = (r) =>
  r.paths.map((p) => p.model.files.map((f) => f.path.split("\\").at(-1)));
const lastPipelineGroup = (r) =>
  r.paths.map(
    (p) =>
      p.groups.find((g) => g.title === "最後に評価したパイプライン").entries[0][1],
  );
const errorlevel = (r) =>
  r.paths.map(
    (p) =>
      p.groups
        .find((g) => g.title === "バッチの終了状態")
        .entries.find(([k]) => k === "ERRORLEVEL")[1],
  );
const r6 = JSON.parse(
  fs.readFileSync(
    new URL("../docs/audit/reference-r6.json", import.meta.url),
    "utf8",
  ),
);
const r6Row = (kind, name) => r6.find((e) => e.kind === kind && e.name === name);
const byName = (def, name) => def.reference.find((r) => r.name === name);

// ---------- SH-C1: 予約デバイス名 ----------
test("fc-shell SH-C1 redirect to nul discards output and creates no file", () => {
  for (const code of [
    "echo hi > nul\ndir /b",
    "echo hi > NUL\ndir /b",
    "echo hi > nul.txt\ndir /b",
    "echo hi >> nul\ndir /b",
  ]) {
    const r = runCmd(code);
    assert.deepEqual(errors(r), [], code);
    assert.ok(!fileNames(r)[0].includes("nul"), code);
    assert.ok(!fileNames(r)[0].includes("nul.txt"), code);
    assert.ok(!outCmd(r)[0].includes("nul"), code);
  }
});
test("fc-shell SH-C1 redirect to con writes to the console, other devices are named", () => {
  const con = runCmd("echo hi > con");
  assert.deepEqual(errors(con), []);
  assert.ok(outCmd(con)[0].some((t) => t.includes("hi")));
  assert.ok(!fileNames(con)[0].includes("con"));
  for (const target of ["prn", "aux", "com1", "lpt1"]) {
    const r = runCmd("echo hi > " + target);
    assert.equal(errors(r).length, 1, target);
    assert.match(errors(r)[0].message, /予約デバイス名/, target);
    assert.ok(!fileNames(r)[0].includes(target), target);
  }
});
test("fc-shell SH-C1 ordinary redirect still creates and writes the file", () => {
  const r = runCmd("echo hi > out.txt\ntype out.txt");
  assert.deepEqual(errors(r), []);
  assert.ok(fileNames(r)[0].includes("out.txt"));
  assert.ok(outCmd(r)[0].some((t) => t.includes("hi")));
});

// ---------- SH-C2: 裸の echo ----------
test("fc-shell SH-C2 bare echo prints the current setting to stdout", () => {
  const off = runCmd("echo");
  assert.deepEqual(errors(off), []);
  assert.deepEqual(outCmd(off), [["ECHO は OFF です。"]]);
  const on = runCmd("echo on\necho");
  assert.deepEqual(errors(on), []);
  assert.deepEqual(outCmd(on), [["ECHO は ON です。"]]);
});

// ---------- SH-C3: dir 不一致 ----------
test("fc-shell SH-C3 dir with no match prints File Not Found and keeps ERRORLEVEL 1", () => {
  for (const code of ["dir /b *.xyz", "dir /b nope", "dir /b /s *.xyz"]) {
    const r = runCmd(code + "\necho after");
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outCmd(r), [["ファイルが見つかりません", "after"]], code);
    assert.deepEqual(errorlevel(r), ["1"], code);
  }
  const ok = runCmd("dir /b *.txt");
  assert.deepEqual(outCmd(ok), [["notes.txt", "readme.txt"]]);
  assert.deepEqual(errorlevel(ok), ["0"]);
});

// ---------- SH-P1: 解消済み確認（フェーズ1 NX-N17） ----------
test("fc-shell SH-P1 (already fixed) folder Length is $null through Where/Select/Sort", () => {
  const r = runPs(
    'Get-ChildItem | Where-Object { $_.PSIsContainer } | ForEach-Object { Write-Output "len=[$($_.Length)] isnull=$($null -eq $_.Length)" }',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["len=[] isnull=True"]]);
});

// ---------- SH-P2: フィルタ代入は $null ----------
test("fc-shell SH-P2 assigning an empty filter result yields $null, not an empty array", () => {
  const r = runPs(
    '$r = @(1,3) -eq 2\nWrite-Output "rIsNull=$($null -eq $r)"\nWrite-Output "count=$($r.Count)"',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["rIsNull=True", "count=0"]]);
  const kept = runPs("$r = @(1,2,3) -eq 2\nWrite-Output $r");
  assert.deepEqual(outPs(kept), [["2"]]);
  const direct = runPs('Write-Output (@(1,3) -eq 2)\nWrite-Output "END"');
  assert.deepEqual(outPs(direct), [["END"]]);
  const ne = runPs("$r = @(1,2) -ne 9\nWrite-Output $r");
  assert.deepEqual(outPs(ne), [["1", "2"]]);
});

// ---------- SH-P3: 演算子の虚偽原因 ----------
test("fc-shell SH-P3 containment operators execute inside parentheses", () => {
  for (const [code, expected] of [
    ["Write-Output (@(1,2,3) -contains 2)", "True"],
    ["Write-Output (@(1,2,3) -contains 9)", "False"],
    ["Write-Output (2 -in @(1,2,3))", "True"],
    ["Write-Output (5 -notin @(1,2,3))", "True"],
    ["Write-Output (@(1,2,3) -notcontains 5)", "True"],
    ['Write-Output (@("a","B") -ccontains "b")', "False"],
    ['Write-Output (@("a","B") -icontains "b")', "True"],
    ['Write-Output ("B" -cin @("a","B"))', "True"],
  ]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outPs(r), [[expected]], code);
  }
});
test("fc-shell SH-P3 case variants of comparison operators execute inside parentheses", () => {
  for (const [code, expected] of [
    ['Write-Output ("ABC" -cmatch "abc")', "False"],
    ['Write-Output ("ABC" -imatch "abc")', "True"],
    ['Write-Output ("b" -cgt "A")', "True"],
    ['Write-Output ("b" -igt "a")', "True"],
    ['Write-Output ("a" -cle "a")', "True"],
    ['Write-Output ("a" -ige "A")', "True"],
  ]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outPs(r), [[expected]], code);
  }
});
test("fc-shell SH-P3 -f stops with its own name, never a paren error", () => {
  for (const code of ['Write-Output ("{0}" -f 42)', '"{0}" -f 42']) {
    const r = runPs(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, /未対応：書式演算子 -f/, code);
    assert.doesNotMatch(errors(r)[0].message, /\) が必要です/, code);
  }
});
test("fc-shell SH-P3 static member access names the :: construct (SEM-4)", () => {
  const r = runPs("[math]::Round(2.5)");
  assert.equal(errors(r).length, 1);
  assert.match(errors(r)[0].message, /静的メンバーアクセス（::）/);
});

// ---------- SH-P4: 解消済み確認（フェーズ1 NX-N27） ----------
test("fc-shell SH-P4 (already fixed) Write-Host -Separator is honoured", () => {
  const r = runPs('Write-Host "a","b" -Separator "@@"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(hostPs(r), [["a@@b"]]);
});

// ---------- SH-P5: 代入は最終パイプラインを書き換えない ----------
test("fc-shell SH-P5 assignment does not overwrite the last pipeline value", () => {
  const r = runPs("Write-Output 9\n$x = 5");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["9"]]);
  assert.deepEqual(lastPipelineGroup(r), ["9"]);
  const only = runPs("$x = 5");
  assert.deepEqual(lastPipelineGroup(only), ["（出力なし）"]);
  const inc = runPs("Write-Output 9\n$x = 1\n$x++");
  assert.deepEqual(lastPipelineGroup(inc), ["9"]);
});

// ---------- SH-P6 → RG-164 で裁定是正: foreach と $null ----------
// SH-P6 は「foreach は $null を1回実行する」としたが、言語仕様 §8.4.4 と
// Windows CI の実 pwsh（"0"）により誤りと確定。$null は0回が正しい。
test("fc-shell SH-P6 (corrected by RG-164) foreach over $null runs zero times, over @() zero times", () => {
  const overNull = runPs(
    'foreach ($n in $null) { Write-Output "iter" }\nWrite-Output "END"',
  );
  assert.deepEqual(errors(overNull), []);
  assert.deepEqual(outPs(overNull), [["END"]]);
  const overEmpty = runPs(
    'foreach ($n in @()) { Write-Output "iter" }\nWrite-Output "END"',
  );
  assert.deepEqual(outPs(overEmpty), [["END"]]);
  const overArray = runPs("foreach ($n in @(1,2)) { Write-Output $n }");
  assert.deepEqual(outPs(overArray), [["1", "2"]]);
  const overVar = runPs(
    '$x = $null\nforeach ($n in $x) { Write-Output "iter" }\nWrite-Output "END"',
  );
  assert.deepEqual(outPs(overVar), [["END"]]);
});

// ---------- SH-P7: 範囲添字 ----------
test("fc-shell SH-P7 range subscripts return the selected elements", () => {
  const r = runPs("$a = @(1,2,3,4)\n$b = $a[1..2]\nWrite-Output $b");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["2", "3"]]);
  const neg = runPs("$a = @(1,2,3,4)\nWrite-Output $a[-1..-2]");
  assert.deepEqual(outPs(neg), [["4", "3"]]);
  const str = runPs('Write-Output "abcd"[0..1]');
  assert.deepEqual(outPs(str), [["a", "b"]]);
  const bad = runPs("$a = @(1,2,3)\nWrite-Output $a[1.5]");
  assert.match(errors(bad)[0].message, /整数の添字が必要です/);
});

// ---------- R23-N1: 自動変数 ----------
test("fc-shell R23-N1 $PWD follows the model location and branches correctly", () => {
  assert.deepEqual(outPs(runPs("Write-Output $PWD.Path")), [["C:\\Practice"]]);
  assert.deepEqual(outPs(runPs("Set-Location logs\nWrite-Output $PWD.Path")), [
    ["C:\\Practice\\logs"],
  ]);
  const branch = runPs(
    'if ($PWD.Path -eq "C:\\Practice") { Write-Output "here" } else { Write-Output "elsewhere" }',
  );
  assert.deepEqual(errors(branch), []);
  assert.deepEqual(outPs(branch), [["here"]]);
});
test("fc-shell R23-N1 $PSVersionTable always has a value; $HOME is never silently $null", () => {
  const v = runPs(
    "Write-Output $PSVersionTable.PSVersion\nWrite-Output $PSVersionTable.PSEdition",
  );
  assert.deepEqual(errors(v), []);
  assert.deepEqual(outPs(v), [["7.4", "Core"]]);
  const notNull = runPs(
    'if ($null -eq $PSVersionTable) { Write-Output "null" } else { Write-Output "has-value" }',
  );
  assert.deepEqual(outPs(notNull), [["has-value"]]);
  const home = runPs(
    'if ($null -eq $HOME) { Write-Output "null" } else { Write-Output "has-value" }',
  );
  assert.deepEqual(errors(home), []);
  // $HOME は未確定値なので、$null 側と値あり側の両パスが列挙される。
  assert.deepEqual(
    home.paths.map((p) => p.outputs.map((o) => o.text)).flat().sort(),
    ["has-value", "null"],
  );
  const blocked = runPs('$PWD = "x"');
  assert.match(errors(blocked)[0].message, /自動変数への代入/);
});

// ---------- R23-N2: 数値リテラル ----------
test("fc-shell R23-N2 hexadecimal and unit-suffixed literals are single numbers", () => {
  for (const [code, expected] of [
    ["Write-Output 0x1F", ["31"]],
    ["$x = 0x1F\nWrite-Output $x", ["31"]],
    ["Write-Output (0x1F)", ["31"]],
    ["$a = @(0x1, 2)\nWrite-Output $a", ["1", "2"]],
    ["Write-Output 1KB", ["1024"]],
    ["Write-Output 1MB", ["1048576"]],
    ["Write-Output 2GB", ["2147483648"]],
    ["Write-Output 1.5KB", ["1536"]],
    ["Write-Output 0x10KB", ["16384"]],
    ["$x = 2KB + 1\nWrite-Output $x", ["2049"]],
  ]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outPs(r), [expected], code);
  }
});

// ---------- R23-N7: プロパティ項目 ----------
test("fc-shell R23-N7 property reference item covers all seven property names", () => {
  const item = byName(ps, "プロパティ");
  assert.ok(item);
  for (const name of [
    "Length",
    "Count",
    "Extension",
    "Keys",
    "Values",
    "PSIsContainer",
    "Path",
  ])
    assert.ok(
      item.syntax.includes(name) && item.description.includes(name),
      name,
    );
  const r = runPs(item.example);
  assert.deepEqual(errors(r), []);
  const row = r6Row("powershell", "プロパティ");
  assert.ok(row);
  for (const f of ["description", "example", "returns", "caution", "source"])
    assert.equal(row[f], item[f], f);
});
test("fc-shell R23-N7 automatic-variable items exist and stay in sync with r6", () => {
  for (const name of ["$PWD", "$PSVersionTable", "$HOME"]) {
    const item = byName(ps, name);
    assert.ok(item, name);
    const r = runPs(item.example);
    assert.deepEqual(errors(r), [], name);
    const row = r6Row("powershell", name);
    assert.ok(row, name);
    assert.equal(row.description, item.description, name);
  }
  assert.equal(ps.reference.length, 52); // +1 修正バッチ3（R24-N4 包含演算子）+1 修正バッチ8（R29-N3 三項演算子）
  assert.equal(r6.filter((e) => e.kind === "powershell").length, 52);
  assert.equal(r6.length, 80);
});

// ---------- R23-N8: BOM・不可視文字 ----------
test("fc-shell R23-N8 BOM and NBSP are accepted, other invisible characters are named", () => {
  assert.deepEqual(outPs(runPs("\uFEFF$x = 1\nWrite-Output $x")), [["1"]]);
  assert.deepEqual(outPs(runPs("$x = 1\n\uFEFFWrite-Output $x")), [["1"]]);
  assert.deepEqual(outPs(runPs("$x\u00A0=\u00A01\nWrite-Output $x")), [["1"]]);
  const zwsp = runPs("Write-Output\u200B1");
  assert.equal(errors(zwsp).length, 1);
  assert.match(errors(zwsp)[0].message, /U\+200B（不可視文字）/);
});

// ---------- RA-65: Where-Object の別名 ? ----------
test("fc-shell RA-65 the ? alias of Where-Object executes like where", () => {
  for (const code of ["1..5 |? { $_ -gt 2 }", "1..5 | ? { $_ -gt 2 }"]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outPs(r), [["3", "4", "5"]], code);
  }
  // リファレンス文面「別名where・?でも同じ処理をします」が真になった。
  assert.ok(byName(ps, "Where-Object").description.includes("?"));
});

// ---------- RA-67: キャスト構文の全表記 ----------
test("fc-shell RA-67 cast syntax lists all seven spellings and they execute", () => {
  const item = byName(ps, "型変換（キャスト）");
  for (const spelling of [
    "[string]",
    "[int]",
    "[int32]",
    "[double]",
    "[bool]",
    "[boolean]",
    "[pscustomobject]",
  ])
    assert.ok(item.syntax.includes(spelling), spelling);
  const r = runPs('[int32]"5" + 1\n[boolean]1\n[int]"5" + 1\n[bool]0');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["6", "True", "6", "False"]]);
});

// ---------- RA-68: スイッチ開示の不揃い ----------
test("fc-shell RA-68 switch disclosure is aligned between syntax and text", () => {
  assert.match(byName(cmd, "rd").description, /\/qもあわせて指定します/);
  assert.match(byName(cmd, "move").description, /\/yを明示します/);
  const del = byName(cmd, "del");
  assert.match(del.description, /\/qを指定すると確認なしで削除します/);
  assert.match(del.description, /すべてのファイルを削除する場合は\/qの明示が必要です/);
  assert.match(byName(ps, "Test-Path").description, /-PathType Leaf/);
  const ri = byName(ps, "Remove-Item");
  assert.ok(ri.syntax.includes("-Recurse") && ri.syntax.includes("-Force"));
  assert.match(ri.description, /-Recurse/);
  assert.match(ri.description, /-Force/);
  for (const [def, kind, name] of [
    [cmd, "cmd", "rd"],
    [cmd, "cmd", "move"],
    [cmd, "cmd", "del"],
    [ps, "powershell", "Test-Path"],
    [ps, "powershell", "Remove-Item"],
  ])
    assert.equal(r6Row(kind, name).description, byName(def, name).description, name);
});

// ---------- RA-69: $_／$PSItem の適用範囲 ----------
test("fc-shell RA-69 $_ and $PSItem descriptions cover switch clauses and the model agrees", () => {
  for (const name of ["$_", "$PSItem"]) {
    const item = byName(ps, name);
    assert.match(item.description, /switchの節の中では判定中の値/, name);
    assert.equal(r6Row("powershell", name).description, item.description, name);
  }
  const r = runPs('switch (2) { 2 { "cur=$_" } }');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outPs(r), [["cur=2"]]);
});

// ---------- SH-C1 追随（バッチ2）: copy/move/ren/md のデバイス名 ----------
test("fc-shell SH-C1-follow copy to NUL discards and creates no file, source stays", () => {
  for (const code of [
    "copy notes.txt nul\ndir /b",
    "copy notes.txt NUL\ndir /b",
    "copy notes.txt nul.txt\ndir /b",
    "copy notes.txt logs\\nul\ndir /b",
  ]) {
    const r = runCmd(code);
    assert.deepEqual(errors(r), [], code);
    assert.ok(fileNames(r)[0].includes("notes.txt"), code);
    assert.ok(!fileNames(r)[0].includes("nul"), code);
    assert.ok(!fileNames(r)[0].includes("nul.txt"), code);
    assert.deepEqual(errorlevel(r), ["0"], code);
  }
});
test("fc-shell SH-C1-follow copy to CON/CONOUT$ displays the content and creates no file", () => {
  for (const target of ["con", "CON", "conout$"]) {
    const r = runCmd("copy notes.txt " + target);
    assert.deepEqual(errors(r), [], target);
    assert.ok(outCmd(r)[0].some((t) => t.includes("学習メモ")), target);
    assert.ok(!fileNames(r)[0].includes("con"), target);
    assert.ok(fileNames(r)[0].includes("notes.txt"), target);
  }
});
test("fc-shell SH-C1-follow copy to other devices stops naming the device", () => {
  for (const target of ["prn", "aux", "com1", "lpt1", "conin$"]) {
    const r = runCmd("copy notes.txt " + target + "\ndir /b");
    assert.equal(errors(r).length, 1, target);
    assert.match(errors(r)[0].message, /予約デバイス名/, target);
    assert.ok(fileNames(r)[0].includes("notes.txt"), target);
    assert.ok(!fileNames(r)[0].includes(target.replace("$", "")), target);
  }
});
test("fc-shell SH-C1-follow move to NUL removes the source and creates no file", () => {
  const r = runCmd("move notes.txt nul\ndir /b");
  assert.deepEqual(errors(r), []);
  assert.ok(!fileNames(r)[0].includes("notes.txt"));
  assert.ok(!fileNames(r)[0].includes("nul"));
  assert.deepEqual(errorlevel(r), ["0"]);
});
test("fc-shell SH-C1-follow move to CON displays then removes the source; move to PRN stops", () => {
  const con = runCmd("move notes.txt con");
  assert.deepEqual(errors(con), []);
  assert.ok(outCmd(con)[0].some((t) => t.includes("学習メモ")));
  assert.ok(!fileNames(con)[0].includes("notes.txt"));
  assert.ok(!fileNames(con)[0].includes("con"));
  const prn = runCmd("move notes.txt prn");
  assert.equal(errors(prn).length, 1);
  assert.match(errors(prn)[0].message, /予約デバイス名 PRN/);
  assert.ok(fileNames(prn)[0].includes("notes.txt"));
});
test("fc-shell SH-C1-follow copy from a missing source to NUL still errors on the source", () => {
  const r = runCmd("copy missing.txt nul");
  assert.equal(errors(r).length, 1);
  assert.match(errors(r)[0].message, /コピー／移動元がありません/);
});
test("fc-shell SH-C1-follow copy/move from a device stops naming the device and creates nothing", () => {
  // 修正バッチ3（§3.3 再裁定）: copy のコピー元 NUL は実 cmd が 0 バイト読み取りとして
  // 空ファイルを作る（SS64 Redirection / Microsoft Learn 予約デバイス名）ため対象から外し、
  // 別テストで成功を固定する。con からの copy と move のデバイス元停止は不変。
  for (const code of ["copy con out.txt", "move con out.txt"]) {
    const r = runCmd(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, /予約デバイス名/, code);
    assert.ok(!fileNames(r)[0].includes("out.txt"), code);
    assert.ok(!fileNames(r)[0].includes("empty.txt"), code);
  }
});
test("fc-shell SH-C1-follow ordinary copy/move destinations still work", () => {
  const copied = runCmd("copy notes.txt copy.txt\ntype copy.txt");
  assert.deepEqual(errors(copied), []);
  assert.ok(fileNames(copied)[0].includes("copy.txt"));
  assert.ok(outCmd(copied)[0].some((t) => t.includes("学習メモ")));
  const toDir = runCmd("copy notes.txt logs\ndir /b logs");
  assert.deepEqual(errors(toDir), []);
  assert.deepEqual(outCmd(toDir), [["notes.txt"]]);
  const moved = runCmd("move notes.txt moved.txt\ndir /b");
  assert.deepEqual(errors(moved), []);
  assert.ok(fileNames(moved)[0].includes("moved.txt"));
  assert.ok(!outCmd(moved)[0].includes("notes.txt"));
});
test("fc-shell SH-C1-follow ren to a device name stops naming it and keeps the original", () => {
  for (const target of ["nul", "con.txt", "prn", "lpt1"]) {
    const r = runCmd("ren notes.txt " + target);
    assert.equal(errors(r).length, 1, target);
    assert.match(errors(r)[0].message, /予約デバイス名/, target);
    assert.ok(fileNames(r)[0].includes("notes.txt"), target);
  }
  const ok = runCmd("ren notes.txt new.txt\ndir /b");
  assert.deepEqual(errors(ok), []);
  assert.ok(fileNames(ok)[0].includes("new.txt"));
});
test("fc-shell SH-C1-follow md with a device name (any component) stops naming it", () => {
  for (const code of ["md nul", "md con", "md nul\\sub", "md sub\\lpt1", "mkdir aux"]) {
    const r = runCmd(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, /予約デバイス名/, code);
    assert.ok(!fileNames(r)[0].includes("nul"), code);
    assert.ok(!fileNames(r)[0].includes("con"), code);
    assert.ok(!fileNames(r)[0].includes("sub"), code);
  }
  const ok = runCmd("md newdir\ndir /b");
  assert.deepEqual(errors(ok), []);
  assert.ok(fileNames(ok)[0].includes("newdir"));
});
test("fc-shell SH-C1-follow folder source to a device stops naming the device", () => {
  for (const code of ["copy logs nul", "move logs nul", "move logs con"]) {
    const r = runCmd(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, /予約デバイス名/, code);
    assert.ok(fileNames(r)[0].includes("logs"), code);
  }
});
test("fc-shell SH-C1-follow redirect route still covers type/dir outputs to devices", () => {
  const nul = runCmd("type notes.txt > nul\ndir /b");
  assert.deepEqual(errors(nul), []);
  assert.ok(!fileNames(nul)[0].includes("nul"));
  const con = runCmd("dir /b > con");
  assert.deepEqual(errors(con), []);
  assert.ok(outCmd(con)[0].includes("notes.txt"));
  assert.ok(!fileNames(con)[0].includes("con"));
});
test("fc-shell R23-N2-follow binary literal 0b is named, never split into 0 and a word", () => {
  // 実 PowerShell の数値リテラルに 0b 形式は無い。"0" と "b101" への
  // 黙った分割（誤値・虚偽原因）にせず、式モードではリテラルを名指して
  // 止める。引数モードは修正バッチ6（R27-N5）の再裁定で、文法 B.1.7 の
  // generic-token として単一の文字列引数になる（分割ではない）。
  for (const code of ["$x = 0b101", "Write-Output (0b0)"]) {
    const r = runPs(code);
    assert.ok(errors(r).length, code);
    assert.match(errors(r)[0].message, /未対応：2進数リテラル（0[bB][01]+）/, code);
    assert.doesNotMatch(errors(r)[0].message, /コマンドレット／関数：b/, code);
  }
  for (const [code, text] of [["Write-Output 0b101", "0b101"], ["Write-Output 0B11", "0B11"]]) {
    const r = runPs(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outPs(r), [[text]], code);
  }
  // 16進・単位接尾辞の受理には影響しない
  assert.deepEqual(errors(runPs("Write-Output 0x1F")), []);
  assert.deepEqual(errors(runPs("Write-Output 1KB")), []);
});
