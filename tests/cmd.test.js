import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/cmd/index.js";
const run = (code, extra = {}, limits) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra }, limits);
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean),
  out = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
for (const [name, code, expected] of [
  ["quoted echo", 'echo "hello"', [['"hello"']]],
  ["assignment retains quotes", 'set X="hello"\necho %X%', [['"hello"']]],
  // R26-N23 是正：未定義変数は実 cmd／SS64 どおり %名前% のまま残る
  // （従来の空文字置換の期待値を実物根拠で是正）。
  ["missing variable", "echo x%MISSING%x", [["x%MISSING%x"]]],
  ["case insensitive names", "set Name=Alice\necho %NAME%", [["Alice"]]],
  [
    "frozen block expansion",
    "set X=before\n(\n set X=after\n echo %X%\n)\necho %X%",
    [["before", "after"]],
  ],
  [
    "delayed expansion",
    'setlocal EnableDelayedExpansion\nset N=0\nfor /L %%i in (1,1,3) do (\n set /a "N=N+1"\n echo %N% !N!\n)\nendlocal',
    [["0 1", "0 2", "0 3"]],
  ],
  [
    "if delayed body timing",
    "setlocal EnableDelayedExpansion\nset N=0\nif 1 EQU 1 (\n set N=2\n echo !N!\n)\nendlocal",
    [["2"]],
  ],
  ["descending loop", "for /L %%i in (3,-1,1) do echo %%i", [["3", "2", "1"]]],
  ["wildcard", "for %%f in (*.txt) do echo %%f", [["notes.txt", "readme.txt"]]],
  ["quoted list items", 'for %%i in ("a b" c) do echo %%i', [['"a b"', "c"]]],
  ["integer wrap", 'set /a "N=2147483647+1"\necho %N%', [["-2147483648"]]],
  ["octal hex", 'set /a "N=010+0x10"\necho %N%', [["24"]]],
  [
    "subroutine",
    'call :sub "a b"\necho after\ngoto :eof\n:sub\necho %1\necho %~1\nexit /b 7',
    [['"a b"', "a b", "after"]],
  ],
  [
    "errorlevel greater or equal",
    "call :sub\nif errorlevel 2 echo yes\ngoto :eof\n:sub\nexit /b 3",
    [["yes"]],
  ],
  [
    "errorlevel shadow",
    "set ERRORLEVEL=shadow\necho %ERRORLEVEL%\nif errorlevel 1 echo wrong",
    [["shadow"]],
  ],
  ["cd", "cd logs\necho %CD%", [["C:\\Practice\\logs"]]],
  [
    "candidate input",
    'set /p X=\nif "%X%"=="yes" (\n echo Y\n) else (\n echo N\n)',
    [["Y"], ["N"]],
  ],
])
  test("cmd " + name, () => {
    const r = run(
      code,
      name === "candidate input" ? { inputs: { X: ["yes", "no"] } } : {},
    );
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });
test("cmd unknown input branches without inventing a value", () => {
  const r = run('set /p X=\nif "%X%"=="yes" (\n echo Y\n) else (\n echo N\n)');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Y"], ["N"]]);
  assert.ok(r.paths.every((p) => p.vars.X.kind === "unknown"));
  assert.deepEqual(
    r.paths.map((p) => p.outputs[0].line),
    [3, 5],
  );
});
test("cmd correlated unknown branches prune impossible combinations", () => {
  const r = run('set /p X=\nif "%X%"=="yes" echo Y\nif "%X%"=="no" echo N');
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 3);
  assert.ok(r.paths.every((p) => p.outputs.length < 2));
});
for (const [code, pattern] of [
  ["for /F %%i in (x) do echo %%i", "for"],
  ["unknowncommand abc", "unknowncommand"],
  ["echo x | find x", "二重引用符"],
  ["goto missing", "ラベル"],
  ['set /a "N=09"', "8進"],
  ['set /a "N=1/0"', "0除算"],
  ["if 1==1 (\necho x", "閉|対応"],
  ["echo %X:~1%", "部分文字列"],
])
  test("cmd rejects unsupported or invalid " + code, () => {
    const r = run(code);
    assert.match(errors(r)[0].message, new RegExp(pattern));
    assert.ok(errors(r)[0].line > 0);
  });
test("cmd local environment returns at script and subroutine end", () => {
  let r = run("set X=outer\nsetlocal\nset X=inner");
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].vars.X, "outer");
  r = run(
    "set X=outer\ncall :sub\necho %X%\ngoto :eof\n:sub\nsetlocal\nset X=inner\nexit /b",
  );
  assert.deepEqual(out(r), [["outer"]]);
});
test("cmd loops and gotos stop with explicit resource notices", () => {
  for (const code of [
    ":again\ngoto again",
    "for /L %%i in (1,1,1000000) do echo %%i",
  ]) {
    const r = run(code, {}, { steps: 30, iterations: 10 });
    assert.ok(r.truncated);
    assert.ok(r.reasons.length);
  }
});
test("cmd every provided template and reference executes on its explicit model", () => {
  for (const t of [
    ...d.templates,
    ...d.reference.map((r) => ({ id: r.name, code: r.example })),
  ]) {
    const r = run(t.code);
    assert.deepEqual(errors(r), [], t.id);
    assert.ok(r.paths.length);
  }
});
test("cmd arithmetic quoted bitwise and compound assignments", () => {
  const r = run('set N=5\nset /a "N+=2"\nset /a "M=N^3"\necho %N% %M%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["7 4"]]);
});
test("cmd path cap is explicit and never exceeds the common 2000 paths", () => {
  const code = Array.from(
      { length: 11 },
      (_, i) => "set /p X" + i + '=\nif "%X' + i + '%"=="yes" echo ' + i,
    ).join("\n"),
    r = run(code, {}, { milliseconds: 10000, operations: 1000000 });
  assert.ok(r.truncated);
  assert.equal(r.paths.length, 2000);
  assert.match(r.reasons.join(" "), /パス数/);
});
test("cmd compound assignment applies the operator to the complete right-hand expression", () => {
  const r = run('set N=5\nset /a "N*=1+2"\necho %N%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["15"]]);
});
test("cmd minimum integer remains signed in subsequent arithmetic", () => {
  const r = run('set /a "N=-2147483648"\nset /a "M=N/2"\necho %N% %M%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["-2147483648 -1073741824"]]);
});
for (const [name, code, expected] of [
  [
    "redirect",
    "echo first > out.txt\necho second >> out.txt\ntype out.txt",
    [["first \r\nsecond \r\n"]],
  ],
  ["pipe", 'echo apple | find "app"', [["apple "]]],
  [
    // テスト是正（修正バッチ13・R7-209）: copy／move の成功メッセージは
    // 実 cmd では標準出力へ出る。従来の期待値はメッセージ欠落という
    // 誤った振る舞いを固定していたため、実物の出力に合わせて是正する。
    "filesystem mutations",
    "md extra\ncopy notes.txt extra\\copy.txt\nren extra\\copy.txt renamed.txt\nmove extra\\renamed.txt moved.txt\ntype moved.txt\ndel moved.txt\nrd extra",
    [["        1 file(s) copied.", "        1 file(s) moved.", "学習メモ\r\n"]],
  ],
  [
    "pause",
    "pause\necho resumed",
    [["続行するには何かキーを押してください . . .", "resumed"]],
  ],
  ["clear screen", "echo old\ncls\necho new", [["new"]]],
  ["literal trailing spaces", "set X=value \necho [%X%]", [["[value ]"]]],
])
  test("cmd completed " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });

test("cmd missing names do not alias a variable named undefined", () => {
  const r = run("set undefined=bad\necho a%missing%b");
  assert.deepEqual(errors(r), []);
  // R26-N23 是正：未定義名は "undefined" という変数にも空文字にもならず、
  // 実 cmd どおり %missing% のリテラルのまま残る。
  assert.deepEqual(out(r), [["a%missing%b"]]);
});
