import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/powershell/index.js";
const run = (code, extra = {}, limits) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra }, limits);
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean),
  out = (r) =>
    r.paths.map((p) =>
      p.outputs.filter((o) => o.channel === "pipeline").map((o) => o.text),
    );

// R22-N12: 文字列×整数・配列×整数は繰返し（about_Arithmetic_Operators）
test("r22-ps N12 string multiplied by integer repeats the string", () => {
  const r = run('"abc" * 2\n"ab" * 0\n$s="xy"\n$s * 3');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["abcabc", "", "xyxyxy"]]);
});
test("r22-ps N12 numeric string multiplied by integer repeats, not numeric product", () => {
  const r = run('"5" * 2');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["55"]]);
});
test("r22-ps N12 array multiplied by integer repeats the array", () => {
  const r = run("@(1,2) * 2\n$a=@(7,8)\n$a * 3\n$a.Count");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [
    ["1", "2", "1", "2", "7", "8", "7", "8", "7", "8", "2"],
  ]);
});
test("r22-ps N12 plain numeric multiplication is unchanged", () => {
  const r = run('3 * 4\n2 * "3"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["12", "6"]]);
});

// R22-N13: モデル化オブジェクトの存在しないプロパティは決定的に $null
test("r22-ps N13 Select-Object of a missing FileInfo property yields $null", () => {
  const r = run("Get-ChildItem -File | Select-Object Bogus");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [
    ["Bogus : $null", "Bogus : $null", "Bogus : $null"],
  ]);
});
test("r22-ps N13 Where-Object on a missing property is a single all-pass path", () => {
  const r = run(
    "Get-ChildItem -File | Where-Object { $_.Bogus -eq $null } | Select-Object Name",
  );
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 1);
  assert.deepEqual(out(r), [
    ["Name : notes.txt", "Name : data.csv", "Name : readme.txt"],
  ]);
});
test("r22-ps N13 missing property accessed directly is $null while known properties work", () => {
  const r = run(
    "$f=Get-ChildItem -File | Select-Object -First 1\n$f.Bogus -eq $null\n$f.Name\n$f.Length",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["True", "notes.txt", "14"]]);
});
test("r22-ps N13 modelled unknown values stay unknown, missing properties become $null", () => {
  const files = [
    { path: "C:\\Practice", type: "directory" },
    { path: "C:\\Practice\\mystery.bin", type: "file" },
  ];
  const r = run("Get-ChildItem -File | Select-Object Name,Length,Bogus", {
    files,
  });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [
    [
      "Name : mystery.bin\nLength : 実行時に決まる：モデルに未指定のサイズ\nBogus : $null",
    ],
  ]);
});

// R22-N14: $null -eq <配列> は通常のスカラー比較で False
test("r22-ps N14 $null on the left of an array comparison evaluates normally", () => {
  const r = run(
    '$a=@()\nif ($null -eq $a) { "yes" } else { "no" }\n$null -eq $a\n$null -ne $a\n$null -eq @(1,2)',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["no", "False", "True", "False"]]);
});
test("r22-ps N14 scalar compared with an array on the right is not equal", () => {
  const r = run("1 -eq @(1)\n1 -ne @(1)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["False", "True"]]);
});

// R22-N15: New-Item -Name
test("r22-ps N15 New-Item -Name without -Path creates in the current folder", () => {
  const r = run("New-Item -ItemType Directory -Name empty1\nTest-Path empty1");
  assert.deepEqual(errors(r), []);
  assert.equal(out(r)[0].at(-1), "True");
  assert.ok(
    r.paths[0].groups.some((g) =>
      JSON.stringify(g.entries).includes("empty1"),
    ),
  );
});
test("r22-ps N15 New-Item combines -Path and -Name", () => {
  const r = run(
    "New-Item -Path . -Name f.txt -ItemType File\nTest-Path f.txt\nNew-Item -Path logs -Name sub -ItemType Directory\nTest-Path logs\\sub",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(
    out(r)[0].filter((t) => t === "True"),
    ["True", "True"],
  );
});
test("r22-ps N15 New-Item -Path . names the existing target instead of a generic parse error", () => {
  const r = run("New-Item -Path. -ItemType Directory");
  assert.ok(errors(r).length);
  assert.doesNotMatch(errors(r)[0].message, /未対応または不正なPowerShellの式：\./);
  assert.match(errors(r)[0].message, /既に存在します：C:\\Practice/);
});
test("r22-ps N15 an invalid parameter value names the parameter", () => {
  const r = run("New-Item -Path ] -ItemType File");
  assert.ok(errors(r).length);
  assert.match(errors(r)[0].message, /New-Item -path/);
});

// R22-N16: 前置インクリメント／デクリメント
test("r22-ps N16 prefix increment returns the updated value", () => {
  const r = run("$i=1\n$y=++$i\n$y\n$i");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["2", "2"]]);
});
test("r22-ps N16 prefix decrement and standalone prefix forms", () => {
  const r = run("$i=5\n--$i\n$i\n++$i\n$i");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["4", "5"]]);
});
test("r22-ps N16 prefix increment works as a for-loop update", () => {
  const r = run("for ($i=0; $i -lt 3; ++$i) { $i }");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["0", "1", "2"]]);
});

// R22-N17: Get-ChildItem の未知パラメーターは対象を名指しする
test("r22-ps N17 Get-ChildItem with an unknown parameter names it", () => {
  for (const code of [
    "Get-ChildItem -Bogus",
    "Get-ChildItem -Bogus -File",
    "Get-ChildItem -Bogus 1",
  ]) {
    const r = run(code);
    assert.ok(errors(r).length, code);
    assert.match(errors(r)[0].message, /未対応のパラメータ：Get-ChildItem -bogus/, code);
  }
});

// R22-N18: 行末パイプによる改行継続
test("r22-ps N18 a trailing pipe continues the pipeline on the next line", () => {
  const r = run("1..3 |\n ForEach-Object { $_ + 1 }");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["2", "3", "4"]]);
});
test("r22-ps N18 pipe continuation works between command stages and repeatedly", () => {
  const r = run(
    "Get-ChildItem -File |\n Select-Object Name\n1..3 |\n\n ForEach-Object { $_ * 2 } |\n Sort-Object -Descending",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [
    ["Name : notes.txt", "Name : data.csv", "Name : readme.txt", "6", "4", "2"],
  ]);
});
