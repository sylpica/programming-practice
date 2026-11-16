import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/cmd/index.js";
const run = (code, extra = {}, limits) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra }, limits);
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean),
  out = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));

// R22-N1: delayed expansion resolves dynamic variables at run time.
for (const [name, code, expected] of [
  [
    "delayed !ERRORLEVEL! after call",
    "setlocal EnableDelayedExpansion\ncall :s\necho EL=!ERRORLEVEL!\ngoto :eof\n:s\nexit /b 9",
    [["EL=9"]],
  ],
  [
    "delayed !CD! after cd",
    "setlocal EnableDelayedExpansion\ncd logs\necho !CD!",
    [["C:\\Practice\\logs"]],
  ],
  [
    "delayed !ERRORLEVEL! inside set /a",
    'setlocal EnableDelayedExpansion\ncall :s\nset /a "N=!ERRORLEVEL!+1"\necho %N%\ngoto :eof\n:s\nexit /b 10',
    [["11"]],
  ],
  [
    "delayed !ERRORLEVEL! after call inside for block",
    'setlocal EnableDelayedExpansion\nset N=0\nfor /L %%i in (1,1,3) do (\n call :inc\n echo !ERRORLEVEL! !N!\n)\ngoto :eof\n:inc\nset /a "N=N+1"\nexit /b 2',
    [["2 1", "2 2", "2 3"]],
  ],
  [
    "delayed dynamic variable shadowed by environment variable",
    "setlocal EnableDelayedExpansion\nset ERRORLEVEL=shadow\necho !ERRORLEVEL!",
    [["shadow"]],
  ],
])
  test("cmd R22-N1 " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });

test("cmd R22-N1 delayed !RANDOM! stays a runtime-determined value", () => {
  const r = run("setlocal EnableDelayedExpansion\necho !RANDOM!");
  assert.deepEqual(errors(r), []);
  assert.match(out(r)[0][0], /実行時に決まる/);
});

// R22-N2: %% is the batch escape for a literal %; %%i stays a for variable.
for (const [name, code, expected] of [
  ["modulo spelled %%%%", 'set /a "N=7%%3"\necho %N%', [["1"]]],
  ["echo literal percent", "echo 100%%", [["100%"]]],
  [
    "for variable is not collapsed by the %% escape",
    "for /L %%i in (1,1,3) do echo %%i",
    [["1", "2", "3"]],
  ],
  [
    "%% escape inside a for body",
    'for /L %%i in (1,1,2) do echo 100%%',
    [["100%", "100%"]],
  ],
])
  test("cmd R22-N2 " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });

// R22-N3: trailing whitespace is an argument delimiter for type/cd,
// including the space before a pipe.
for (const [name, code, expected] of [
  ["type with trailing space", "type notes.txt ", [["学習メモ\r\n"]]],
  [
    "type piped to find with spaces around the pipe",
    'type notes.txt | find "学習"',
    [["学習メモ"]],
  ],
  ["cd with trailing space", "cd logs \necho %CD%", [["C:\\Practice\\logs"]]],
  ["dir pattern with trailing space", "dir /b *.txt ", [["notes.txt", "readme.txt"]]],
])
  test("cmd R22-N3 " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });

// R22-N4: dir /b /s lists recursively with full paths instead of
// silently producing nothing.
test("cmd R22-N4 dir /b /s lists the tree recursively with full paths", () => {
  const r = run("dir /b /s");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [
    [
      "C:\\Practice\\notes.txt",
      "C:\\Practice\\data.csv",
      "C:\\Practice\\readme.txt",
      "C:\\Practice\\logs",
    ],
  ]);
  assert.ok(r.paths[0].trace.length > 0);
});

test("cmd R22-N4 dir /b /s honours patterns, order and subfolders", () => {
  const files = [
    { path: "C:\\Practice", type: "directory" },
    { path: "C:\\Practice\\a.txt", type: "file", content: "a\r\n" },
    { path: "C:\\Practice\\sub", type: "directory" },
    { path: "C:\\Practice\\sub\\b.txt", type: "file", content: "b\r\n" },
    { path: "C:\\Practice\\sub\\c.log", type: "file", content: "c\r\n" },
  ];
  let r = run("dir /b *.txt /s", { files });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\a.txt", "C:\\Practice\\sub\\b.txt"]]);
  r = run("dir /b /s sub", { files });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\sub\\b.txt", "C:\\Practice\\sub\\c.log"]]);
});

test("cmd R22-N4 dir without /b still stops honestly and names bad options", () => {
  let r = run("dir /s");
  assert.match(errors(r)[0].message, /\/b 形式のみ/);
  r = run("dir /b /a");
  assert.match(errors(r)[0].message, /dirのオプション \/a/);
});

// R22-N5: quoted separators in a set value survive expansion intact.
// テスト是正（修正バッチ13・R7-01）: % 展開の2ケースは Codex の実機
// 測定により旧前提が誤りと裁定された。実 cmd では % 展開は解析
// フェーズのテキスト置換であり再解析されるため、値中の & は
// コマンド区切りとして働く（遅延展開 !X! は実行時展開で再解析
// されないため、従来どおり値がそのまま残る）。
for (const [name, code, expected] of [
  [
    "delayed expansion of a pipe value",
    'setlocal EnableDelayedExpansion\nset "X=a|b"\necho !X!',
    [["a|b"]],
  ],
])
  test("cmd R22-N5 " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });

test("cmd R22-N5 corrected: percent expansion is re-parsed (R7-01)", () => {
  // echo [%X%] は echo [a & b] として再解析され、[a までが出力され、
  // b] は未知のコマンドとして停止する（実 cmd の2行挙動と同型）。
  let r = run('set "X=a & b"\necho [%X%]');
  assert.deepEqual(out(r), [["[a "]]);
  assert.match(errors(r)[0].message, /cmdの構文 b\]/);
  r = run('set "X=a|b"\necho [%X%]');
  assert.equal(errors(r).length, 1);
  assert.ok(!JSON.stringify(out(r)).includes("[a|b]"));
});

// R22-N6: !VAR! in a bare block expands at execution time too, while
// %VAR% in the same block stays at read time.
test("cmd R22-N6 bare block delayed expansion is execution time", () => {
  const r = run(
    "setlocal EnableDelayedExpansion\nset X=before\n(\n set X=after\n echo !X!\n echo %X%\n)",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["after", "before"]]);
});

// R22-N7: for basic-list delimiters are space, comma, semicolon, equals.
for (const [name, code, expected] of [
  [
    "comma semicolon space",
    "for %%i in (a,b;c d) do echo %%i",
    [["a", "b", "c", "d"]],
  ],
  ["equals", "for %%i in (a=b c) do echo %%i", [["a", "b", "c"]]],
  [
    "quoted item keeps its delimiters",
    'for %%i in ("a,b" c;d) do echo %%i',
    [['"a,b"', "c", "d"]],
  ],
])
  test("cmd R22-N7 " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });

// R22-N8: %0 is not a fabricated script name.
test("cmd R22-N8 %0 is a runtime-determined value, not practice.cmd", () => {
  const r = run("echo %0");
  assert.deepEqual(errors(r), []);
  assert.match(out(r)[0][0], /実行時に決まる：バッチファイル名（%0）/);
  assert.ok(!out(r)[0][0].includes("practice.cmd"));
});

test("cmd R22-N8 %0 is the same unknown value at every use", () => {
  const r = run('if "%0"=="%0" echo same');
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 1);
  assert.deepEqual(out(r), [["same"]]);
});

// R22-N9: deleting a missing file stops like other model failures,
// with the failure exit code shown as unconfirmed (no invented value).
test("cmd R22-N9 del of a missing file stops and does not continue", () => {
  const r = run("del nosuch.txt\necho after");
  assert.equal(out(r)[0].length, 0);
  assert.match(errors(r)[0].message, /削除対象のファイルがありません/);
  const state = r.paths[0].groups.find((g) => g.title === "バッチの終了状態");
  const errorlevel = state.entries.find(([k]) => k === "ERRORLEVEL")[1];
  assert.match(errorlevel, /実行時に決まる：失敗したコマンドの終了コード（未確認）/);
});

test("cmd R22-N9 del of an existing file and unmatched wildcard", () => {
  let r = run("copy notes.txt temp.txt\ndel temp.txt\necho done");
  assert.deepEqual(errors(r), []);
  // テスト是正（修正バッチ13・R7-209）: copy の成功メッセージは実 cmd
  // では標準出力へ出るため、期待値に含める。
  assert.deepEqual(out(r), [["        1 file(s) copied.", "done"]]);
  r = run("del *.xyz");
  assert.match(errors(r)[0].message, /削除対象のファイルがありません/);
});

// R22-N10: unsupported find options are named, not misreported as a
// quoting problem.
for (const option of ["/n", "/v", "/c"])
  test("cmd R22-N10 find " + option + " is named as unsupported", () => {
    const r = run('find ' + option + ' "学習" notes.txt');
    assert.match(
      errors(r)[0].message,
      new RegExp("未対応：findのオプション " + option),
    );
  });

test("cmd R22-N10 unquoted find string still reports the quoting rule", () => {
  const r = run("echo x | find x");
  assert.match(errors(r)[0].message, /二重引用符/);
});

// R22-N11: separators inside double quotes are literal text.
for (const [name, code, expected] of [
  ["quoted pipe in echo", 'echo "a | b"', [['"a | b"']]],
  ["quoted redirect in echo", 'echo "a > b"', [['"a > b"']]],
  ["quoted ampersand in echo", 'echo "a & b"', [['"a & b"']]],
])
  test("cmd R22-N11 " + name, () => {
    const r = run(code);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(out(r), expected);
  });

test("cmd R22-N11 find can search for a quoted pipe literally", () => {
  const files = [
    { path: "C:\\Practice", type: "directory" },
    {
      path: "C:\\Practice\\notes.txt",
      type: "file",
      content: "a|b\r\nother\r\n",
    },
  ];
  const r = run('find "a|b" notes.txt', { files });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["a|b"]]);
});
