import fs from "node:fs";
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
const fixtures = JSON.parse(
  fs.readFileSync(new URL("./fixtures/powershell-cases.json", import.meta.url)),
);
for (const [name, code, expected] of fixtures)
  test("powershell " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), [], JSON.stringify(r.error));
    assert.deepEqual(out(r), expected);
  });
test("powershell file objects retain properties through all stages", () => {
  const r = run(
    'Get-ChildItem -File | Where-Object {$_.Extension -eq ".txt"} | Sort-Object Name | Select-Object Name,FullName,Length',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(
    r.paths[0].ps.streams[0].map((v) => v.properties.Name),
    ["notes.txt", "readme.txt"],
  );
  assert.ok(r.paths[0].ps.streams[0].every((v) => v.properties.Length > 0));
  assert.ok(
    r.paths[0].outputs.every((o) => !/"kind"|\[object Object\]/.test(o.text)),
  );
});
test("powershell measure has correct count and sum", () => {
  const r = run("1..4|Measure-Object -Sum");
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].ps.streams[0][0].properties.Count, 4);
  assert.equal(r.paths[0].ps.streams[0][0].properties.Sum, 10);
});
test("powershell known input alternatives and unknown branches", () => {
  for (const extra of [{}, { inputs: { Answer: ["yes", "no"] } }]) {
    const r = run('$a=Read-Host "Answer"\nif($a -eq "yes"){1}else{2}', extra);
    assert.deepEqual(errors(r), []);
    assert.equal(r.paths.length, 2);
    assert.deepEqual(out(r), [["1"], ["2"]]);
  }
});
test("powershell unknown case insensitive comparisons share constraints", () => {
  const r = run('$a=Read-Host "A"\nif($a -eq "YES"){1}\nif($a -eq "yes"){2}');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1", "2"], []]);
});
test("powershell filter on an unknown property branches without JSON leakage", () => {
  const r = run('$a=Read-Host "A"\n$a | Where-Object {$_ -eq "yes"}');
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 2);
  assert.ok(r.paths.some((p) => p.ps.streams[0].length === 0));
});
for (const [code, pattern] of [
  ["Get-Content missing.txt", "ファイル"],
  ["Set-Location missing", "フォルダ"],
  ["unknown-command", "unknown-command"],
  ["Get-Location -Bogus 1", "Bogus|bogus"],
  ["Get-Location 3", "位置引数"],
  ["function f { f }\nf", "上限"],
  ["while($true){}", "上限"],
  ["$a=1/0", "0"],
  ['$a="bad"-1', "数値"],
  ["[UnknownType]3", "型変換"],
])
  test("powershell explicit errors and limits " + code, () => {
    const r = run(code, {}, { depth: 8, iterations: 5 });
    assert.ok(
      r.truncated || errors(r).some((e) => new RegExp(pattern).test(e.message)),
      JSON.stringify(r),
    );
  });
test("powershell all templates and reference examples execute", () => {
  for (const t of [
    ...d.templates,
    ...d.reference.map((r) => ({ id: r.name, code: r.example })),
  ]) {
    const r = run(t.code);
    assert.deepEqual(errors(r), [], t.id + ": " + JSON.stringify(errors(r)));
    assert.ok(r.paths.length);
  }
});

test("powershell JSON model objects become human-readable hashtables", () => {
  const r = run("$item.Name\n$item", {
    variables: { item: { Name: "Alice", Score: 80 } },
  });
  assert.deepEqual(errors(r), []);
  assert.equal(out(r)[0][0], "Alice");
  assert.match(out(r)[0][1], /Name : Alice/);
  assert.doesNotMatch(
    JSON.stringify(r.paths[0].groups),
    /ps-object|\\"kind\\"|\[object Object\]/,
  );
});
test("powershell path explosion emits a notice at the shared 2000 path cap", () => {
  const code = Array.from(
    { length: 11 },
    (_, i) =>
      "$v" +
      i +
      '=Read-Host "V' +
      i +
      '"\nif($v' +
      i +
      ' -eq "yes"){' +
      i +
      "}",
  ).join("\n");
  const r = run(code, {}, { milliseconds: 10000, operations: 1000000 });
  assert.equal(r.paths.length, 2000);
  assert.ok(r.truncated);
  assert.match(r.reasons.join(" "), /パス数/);
});

test("powershell does not invent eager side effects when Select-Object stops upstream", () => {
  const r = run(
    "$x=0\n1..3 | ForEach-Object {$x++; $_} | Select-Object -First 1\n$x",
  );
  assert.match(errors(r)[0].message, /未対応.*Select-Object.*途中停止/);
  assert.equal(r.paths[0].vars.x, 0);
});

test("powershell does not treat filesystem metadata as writable custom properties", () => {
  const r = run(
    '$file=Get-ChildItem -File | Select-Object -First 1\n$file.Name="changed"',
  );
  assert.match(errors(r)[0].message, /未対応.*FileInfo.*プロパティ/);
});
