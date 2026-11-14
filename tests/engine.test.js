import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, EMPTY, NULL, parse, lex, LIMITS } from "../js/engine.js";
import { templates, usedReferences } from "../js/content.js";
import { decodeFile } from "../js/import.js";
const sim = (s, m = {}, l = {}) => simulate(s, m, l);
const path = (s) => {
  let r = sim(s);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const outputs = (s) => path(s).outputs.map((x) => x.text);
test("independent template calculations", () => {
  let expected = {
    cells: { price: 100 },
    if: { score: 85 },
    for: { total: 15, i: 6 },
    do: { n: 3 },
    text: { name: "EXCEL VBA" },
  };
  for (let t of templates) {
    let r = sim(t.code, { B2: 85 });
    assert.ok(!r.error, t.id);
    assert.ok(
      r.paths.every((p) => !p.error),
      t.id,
    );
    for (let [k, v] of Object.entries(expected[t.id] || {}))
      assert.equal(r.paths[0].vars[k], v);
  }
  assert.equal(sim(templates[4].code).paths.length, 3);
});
test("VBA Variant coercion, Empty and Null", () => {
  assert.deepEqual(
    outputs(
      'Debug.Print "2" + "3"\na = "2"\nb = 3\nDebug.Print a + b\nDebug.Print Empty + 3\nDebug.Print Null + 3\nDebug.Print Null = Null\na = "2"\nb = 100\nDebug.Print a > b\nDebug.Print "2" < "10"',
    ),
    ['"23"', "5", "3", "Null", "Null", "true", "false"],
  );
  assert.deepEqual(
    outputs(
      'Debug.Print Null & "x"\nDebug.Print False And Null\nDebug.Print True Or Null',
    ),
    ['"x"', "false", "true"],
  );
});
test("typed strings coerce at assignment and integer bank rounding", () =>
  assert.deepEqual(
    outputs(
      'Dim n As Long\nn = "12"\nDebug.Print n\nDebug.Print CInt(2.5)\nDebug.Print CLng(3.5)\nDebug.Print Int(-1.8), Fix(-1.8)',
    ),
    ["12", "2", "4", "-2, -1"],
  ));
test("positive and negative Step, no entry and Exit For", () => {
  assert.equal(path("For i = 5 To 1 Step -2\nx = x + i\nNext i").vars.x, 9);
  assert.equal(path("For i = 5 To 1\nx = 99\nNext i").vars.i, 5);
  assert.equal(
    path("For i = 1 To 9\nIf i = 3 Then\nExit For\nEnd If\nNext i").vars.i,
    3,
  );
});
test("For bound is evaluated once", () => {
  let p = path("n = 3\nFor i = 1 To n\nn = 1\nx = x + 1\nNext i");
  assert.equal(p.vars.x, 3);
  assert.equal(p.vars.i, 4);
});
test("Select Case first matching, Is and To", () =>
  assert.deepEqual(
    outputs(
      'n = 5\nSelect Case n\nCase 1 To 5\nDebug.Print "first"\nCase Is >= 5\nDebug.Print "second"\nEnd Select',
    ),
    ['"first"'],
  ));
test("known branch pruning and runtime branch trace", () => {
  assert.equal(
    sim("If 2 > 1 Then\nx = 1\nElse\nx = 2\nEnd If").paths.length,
    1,
  );
  let r = sim(
    'x = InputBox("x")\nIf x = "a" Then\ny = 1\nElseIf x = "a" Then\ny = 2\nElse\ny = 3\nEnd If',
  );
  assert.deepEqual(r.paths.map((p) => p.vars.y).sort(), [1, 3]);
});
test("known Select eliminates contradictory cases", () => {
  let r = sim(
    'x = InputBox("x")\nSelect Case x\nCase "a"\ny = 1\nCase "a"\ny = 2\nCase Else\ny = 3\nEnd Select',
  );
  assert.deepEqual(r.paths.map((p) => p.vars.y).sort(), [1, 3]);
});
test("numeric interval contradictions pruned", () => {
  let r = sim(
    'Dim x As Long\nx = Range("A1").Value\nIf x > 10 Then\nIf x < 5 Then\ny = 1\nElse\ny = 2\nEnd If\nElse\ny = 3\nEnd If',
    { A1: { kind: "unknown", source: "model" } },
  );
  assert.deepEqual(r.paths.map((p) => p.vars.y).sort(), [2, 3]);
});
test("post test and until loops", () => {
  assert.equal(path("n = 0\nDo\nn = n + 1\nLoop While n < 3").vars.n, 3);
  assert.equal(path("Do Until True\nn = 1\nLoop").vars.n, undefined);
  assert.equal(path("Do\nn = 1\nLoop Until True").vars.n, 1);
});
test("unchanged unknown condition cannot spontaneously change", () => {
  let r = sim('Do While Range("A1").Value > 0\nx = x + 1\nLoop', {
    A1: { kind: "unknown", source: "model" },
  });
  assert.equal(r.paths.length, 2);
  assert.ok(r.truncated);
});
test("changing runtime input enumerates zero, one, two and continuation", () => {
  let r = sim('Do While InputBox("next") = "yes"\nx = x + 1\nLoop');
  assert.equal(r.paths.length, 4);
  assert.ok(r.truncated);
});
test("unknown For creates representative paths without inventing end", () => {
  let r = sim(
    'Dim n As Long\nn = Range("A1").Value\nFor i = 1 To n\nx = x + 1\nNext i',
    { A1: { kind: "unknown", source: "model" } },
  );
  assert.equal(r.paths.length, 4);
  assert.ok(r.truncated);
});
test("range cells, foreach and reference objects", () => {
  let p = path(
    'Dim c As Range\nFor Each c In Range("A1:A3")\nc.Value = 7\nNext c\nCells(2, 2).Value = 9',
  );
  assert.deepEqual(
    p.changes.map(([k, v]) => [k, v]),
    [
      ["A1", 7],
      ["A2", 7],
      ["B2", 9],
      ["A3", 7],
    ],
  );
});
test("bounds Option Base and explicit lower bound", () => {
  assert.deepEqual(
    outputs(
      "Option Base 1\nDim a(3) As Long\nDim b(0 To 2) As Long\nDebug.Print LBound(a), UBound(a), LBound(b)\na(1) = 4\nDebug.Print a(1)",
    ),
    ["1, 3, 0", "4"],
  );
  assert.equal(sim("Dim a(2)\nx = a(3)").paths[0].error.code, 9);
});
test("runtime errors 13 91 11 6 and error line", () => {
  for (let [code, s] of [
    [13, 'Dim n As Long\nn = "no"'],
    [91, "Dim r As Range\nx = r.Value"],
    [11, "x = 1 / 0"],
    [6, "Dim n As Integer\nn = 40000"],
  ])
    assert.equal(sim(s).paths[0].error.code, code);
  assert.equal(sim("x = 1\nx = 1 / 0").paths[0].error.line, 2);
});
test("On Error Resume Next, Err and reset", () => {
  let r = sim(
    "On Error Resume Next\nx = 1 / 0\nDebug.Print Err.Number\nx = 2\nOn Error GoTo 0\nx = 1 / 0",
  );
  assert.equal(r.paths[0].vars.x, 2);
  assert.equal(r.paths[0].outputs[0].text, "11");
  assert.equal(r.paths[0].error.code, 11);
});
test("Exit Sub stops all following code", () =>
  assert.equal(path("x = 1\nExit Sub\nx = 2").vars.x, 1));
test("unsupported never silently executes", () => {
  for (let s of [
    'With Range("A1")',
    "x = Foo(1)",
    "If True Then x = 2",
    "On Error GoTo handler",
    'Workbooks.Open("x")',
    "Option Compare Text",
    'x = Range("Z9").Value',
  ]) {
    let r = sim(s);
    assert.match(
      r.error?.message || r.paths[0].error?.message || "",
      /対応していません/,
    );
  }
});
test("line identity survives repeated statements and colon", () => {
  let r = sim("If False Then\nx = 1\nElse\nx = 1\nEnd If");
  assert.ok(
    r.paths[0].trace.some((t) => t.line === 4 && t.text.includes("x ←")),
  );
  assert.equal(path("x = 1: x = 2").vars.x, 2);
});
test("limits terminate constant and huge loops", () => {
  let r = sim("Do\nx = x + 1\nLoop");
  assert.ok(r.truncated);
  assert.ok(r.operations < 1000);
  let r2 = sim("For i = 1 To 100000000\nx = 1\nNext i");
  assert.ok(r2.truncated);
  assert.equal(r2.paths[0].vars.i, 101);
});
test("path budget and parser depth remain bounded", () => {
  let src = Array.from(
    { length: 12 },
    (_, i) => `If InputBox("${i}") = "a" Then\nx = ${i}\nEnd If`,
  ).join("\n");
  let r = sim(src, {}, { paths: 30, milliseconds: 5000 });
  assert.equal(r.paths.length, 30);
  assert.ok(r.truncated);
  assert.ok(sim("(".repeat(200) + "1" + ")".repeat(200)).error);
});
test("function extraction ignores comments and string literals", () => {
  assert.deepEqual(
    usedReferences(lex('x = "Range MsgBox"\n\' Cells\nDebug.Print Len("abc")')),
    ["Debug.Print", "Len"],
  );
});
test("import text encoding, extension, binary detection", () => {
  let encoded = new TextEncoder().encode("Sub Sample()\r\nEnd Sub");
  assert.equal(
    decodeFile(encoded.buffer, "sample.bas").text,
    "Sub Sample()\nEnd Sub",
  );
  assert.throws(() => decodeFile(encoded.buffer, "sample.exe"));
  assert.throws(() => decodeFile(new Uint8Array([0, 1, 2]).buffer, "a.txt"));
  let bom = new Uint8Array([255, 254, 65, 0, 10, 0]);
  assert.equal(decodeFile(bom.buffer, "a.bas").text, "A\n");
});
test("malformed fuzz does not crash public engine", () => {
  let seed = 17;
  for (let i = 0; i < 250; i++) {
    let s = "";
    for (let n = 0; n < 80; n++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      s += "()\n\"+If Next,=#'abc"[seed % 20] || "!";
    }
    let r = sim(s);
    assert.ok(r.error || r.paths);
  }
});
test("typed and Variant addition differ per Microsoft specification", () => {
  assert.equal(
    sim('Dim s As String\nDim n As Long\ns = "2"\nn = 3\nx = s + n').paths[0]
      .error.code,
    13,
  );
  assert.deepEqual(
    outputs(
      'Dim s As String\ns = "2"\nv = 3\nDebug.Print s + v\nDebug.Print Empty + "abc"',
    ),
    ['"23"', '"abc"'],
  );
});
test("typed numeric versus numeric Variant string and typed string vs Variant", () => {
  assert.deepEqual(
    outputs(
      'Dim n As Long\nn = 10\nv = "2"\nDebug.Print n > v\nDim s As String\ns = "2"\nv = 100\nDebug.Print s > v',
    ),
    ["true", "true"],
  );
  assert.equal(
    sim('Dim n As Long\nv = "text"\nx = n > v').paths[0].error.code,
    13,
  );
});
test("integer expression overflow and Long arithmetic", () => {
  assert.equal(sim("x = 32767 + 1").paths[0].error.code, 6);
  assert.deepEqual(outputs("Dim n As Long\nn = 32767\nDebug.Print n + 1"), [
    "32768",
  ]);
});
test("unsupported function with unknown argument still stops", () => {
  let r = sim('x = InputBox("x")\ny = UnsupportedFunction(x)');
  assert.match(r.paths[0].error.message, /対応していません/);
});
test("missing End Sub and misplaced End Sub are syntax errors", () => {
  assert.ok(sim("Sub Test()\nx = 1").error);
  assert.ok(sim("End Sub").error);
});
test("Next line is traced and counter update explained", () => {
  let p = path("For i = 1 To 2\nx = i\nNext i");
  assert.equal(p.trace.filter((t) => t.line === 3).length, 2);
  assert.equal(p.vars.i, 3);
});
test("Dim is procedure scoped and not reinitialized inside loops", () => {
  let p = path("For i = 1 To 3\nDim n As Long\nn = n + 1\nNext i");
  assert.equal(p.vars.n, 3);
  assert.equal(path("x = n\nIf False Then\nDim n As Long\nEnd If").vars.x, 0);
  assert.ok(sim("If False Then\nDim n As Long\nDim n As String\nEnd If").error);
});
test("compound disjunction constraints stay consistent across branches", () => {
  let r = sim(
    'Dim x As Long\nx = Range("A1").Value\nIf x > 10 Or x < 5 Then\nIf x <= 10 And x >= 5 Then\ny = 999\nElse\ny = 1\nEnd If\nElse\ny = 2\nEnd If',
    { A1: { kind: "unknown", source: "A1" } },
  );
  assert.deepEqual(r.paths.map((p) => p.vars.y).sort(), [1, 2]);
});
test("symbolic linear counters preserve reachable termination", () => {
  let r = sim(
    'Dim start As Long\nstart = Range("A1").Value\nFor i = start To 2\nx = x + 1\nNext i',
    { A1: { kind: "unknown", source: "A1" } },
  );
  assert.equal(r.paths.length, 4);
  assert.ok(!r.paths.some((p) => p.error));
});
test("adversarial compound formulas honor exploration limits", () => {
  let s = Array.from(
    { length: 14 },
    (_, i) => `(InputBox("${i}") = "yes" Or InputBox("${i}b") = "no")`,
  ).join(" And ");
  let r = sim(
    "If " + s + " Then\nx = 1\nEnd If",
    {},
    { operations: 1500, milliseconds: 200 },
  );
  assert.ok(r.truncated || r.paths[0]?.error);
  assert.ok(r.operations < 1600);
});
test("array For Each requires Variant even when Object declared", () => {
  let r = sim(
    "Dim x As Object\nFor Each x In Array(1, 2)\nDebug.Print x\nNext x",
  );
  assert.match(r.paths[0].error.message, /Variant/);
});
test("integer symbolic domains exclude impossible fractional intervals", () => {
  let r = sim(
    'Dim n As Long\nn = Range("A1").Value\nIf n > 1 And n < 2 Then\nx = 999\nElse\nx = 1\nEnd If',
    { A1: { kind: "unknown", source: "A1" } },
  );
  assert.equal(r.paths.length, 1);
  assert.equal(r.paths[0].vars.x, 1);
});
test("exact branch constraints refine later reads", () => {
  let r = sim(
    'x = InputBox("x")\nIf x = "" Then\nDebug.Print Len(x)\nElse\nDebug.Print x\nEnd If',
  );
  assert.equal(r.paths[0].outputs[0].text, "0");
});
test("Len and Abs runtime domains cannot become negative", () => {
  for (let fn of ["Len", "Abs"]) {
    let r = sim(
      `x = InputBox("x")\nIf ${fn}(x) < 0 Then\ny = 999\nElse\ny = 1\nEnd If`,
    );
    assert.equal(r.paths.length, 1);
    assert.equal(r.paths[0].vars.y, 1);
  }
});
test("Next overflow and postcondition errors identify their actual line", () => {
  let r = sim("Dim i As Integer\nFor i = 32767 To 32767\nx = 1\nNext i");
  assert.equal(r.paths[0].error.code, 6);
  assert.equal(r.paths[0].error.line, 4);
  let post = sim("Do\nx = 1\nLoop While 1 / 0");
  assert.equal(post.paths[0].error.line, 3);
});
test("Select Case uses declared String comparison with a numeric Variant", () => {
  assert.deepEqual(
    outputs(
      'Dim s As String\ns = "2"\nv = 100\nSelect Case s\nCase Is > v\nDebug.Print "string-order"\nCase Else\nDebug.Print "wrong"\nEnd Select',
    ),
    ['"string-order"'],
  );
});
test("default maximum is exactly 2000 paths", () => {
  let src = Array.from(
    { length: 12 },
    (_, i) => `If InputBox("${i}") = "a" Then\nx = ${i}\nEnd If`,
  ).join("\n");
  let r = sim(src, {}, { milliseconds: 10000, operations: 500000 });
  assert.equal(r.paths.length, LIMITS.paths);
  assert.equal(r.limits.paths, 2000);
  assert.ok(r.truncated);
});
test("blind loop oracle across directions, bounds and Step", () => {
  for (let from of [-3, 0, 4])
    for (let to of [-2, 1, 5])
      for (let step of [-3, -1, 1, 2]) {
        let values = [];
        for (let i = from; step > 0 ? i <= to : i >= to; i += step)
          values.push(i);
        let r = path(
          `total = 0\nFor i = ${from} To ${to} Step ${step}\ntotal = total + i\nNext i`,
        );
        assert.equal(
          r.vars.total,
          values.reduce((a, b) => a + b, 0),
        );
        assert.equal(r.vars.i, from + values.length * step);
      }
});
