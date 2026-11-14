import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const d = getDefinition("autohotkey");
const run = async (code) =>
  d.simulate(code, structuredClone({ ...d.model.defaults, event: null }));
const errors = (r) => {
  const out = [];
  if (r.error) out.push(r.error);
  for (const p of r.paths || []) if (p.error) out.push(p.error);
  return out;
};
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const vars = (r) => r.paths?.[0]?.vars || {};

// ---------- RG-19: AutoHotkey arrays are 1-based ----------
test("RG-19 a[1] is the first element and a[0] is an error", async () => {
  let r = await run("a := [10, 20]\nMsgBox a[1]\nMsgBox a[2]");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["10", "20"]);
  r = await run("a := [10, 20]\nMsgBox a[0]");
  assert.equal(errors(r)[0]?.category, "IndexError");
  r = await run("a := [10, 20]\nMsgBox a[3]");
  assert.equal(errors(r)[0]?.category, "IndexError");
});

test("RG-19 the a[A_Index] idiom visits every element", async () => {
  const r = await run("a := [10, 20, 30]\nLoop 3 {\nMsgBox a[A_Index]\n}");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["10", "20", "30"]);
});

test("RG-19 subscript assignment is 1-based, appends at Length+1", async () => {
  const r = await run(
    "a := [10, 20]\na[1] := 99\na[3] := 30\nMsgBox a[1]\nMsgBox a[2]\nMsgBox a[3]\nMsgBox a.Length",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["99", "20", "30", "3"]);
  assert.deepEqual(vars(r).a, [99, 20, 30]);
});

test("RG-19 negative indices count back from the end; bad indices stop honestly", async () => {
  const r = await run("a := [10, 20, 30]\nMsgBox a[-1]");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["30"]);
  const bad = await run("a := [10, 20]\nMsgBox a[1, 2]");
  assert.ok(errors(bad).length, "multiple subscripts must not be silently dropped");
  assert.doesNotMatch(JSON.stringify(errors(bad)), /<eof>|\.concat/);
  const str = await run('s := "hello"\nMsgBox s[1]');
  assert.ok(errors(str).length, "string subscript must not fabricate a 0-based character");
});

test("RG-19 compound assignment and postfix through a subscript stay 1-based", async () => {
  const r = await run("a := [10, 20]\na[2] += 5\nMsgBox a[2]\nMsgBox a[1]++\nMsgBox a[1]");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["25", "10", "11"]);
});

// ---------- RG-48: member resolution is case-insensitive ----------
test("RG-48 .Length (official spelling) works for arrays and strings", async () => {
  const r = await run('a := [1, 2, 3]\nMsgBox a.Length\nMsgBox a.length\nMsgBox "hello".Length');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["3", "3", "5"]);
});

test("RG-48 object properties resolve case-insensitively for read and write", async () => {
  const r = await run('o := {name: "x", score: 3}\nMsgBox o.Name\nMsgBox o.SCORE\no.Name := "y"\nMsgBox o.name');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["x", "3", "y"]);
  const ib = await run('r := InputBox("名前")\nMsgBox r.value');
  assert.deepEqual(errors(ib), []);
});

test("RG-48 unknown properties still stop with the property named", async () => {
  const r = await run("a := [1, 2]\nMsgBox a.Foo");
  assert.match(errors(r)[0]?.message || "", /Foo/);
});

// ---------- RG-55: boolean results display as 1/0 ----------
test("RG-55 comparison results display as 1/0 in output, trace and final state", async () => {
  const r = await run("b := 1 = 1\nc := (1 = 1) + 1\nMsgBox b\nMsgBox 1 = 1\nMsgBox 2 < 1\nMsgBox c");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["1", "1", "0", "2"]);
  assert.equal(vars(r).b, 1);
  const group = r.paths[0].groups[0].entries.find(([k]) => k === "b");
  assert.equal(group[1], "1");
  assert.ok(!JSON.stringify(r.paths[0].trace).includes("true"));
});

// ---------- RG-32: control keywords are case-insensitive ----------
test("RG-32 official-capitalization keywords all run", async () => {
  const cases = [
    ['x := 1\nIf x = 1 {\nMsgBox "yes"\n}', ["yes"]],
    ['x := 2\nIf x = 1 {\nMsgBox "one"\n} Else {\nMsgBox "other"\n}', ["other"]],
    ['x := 2\nIf x = 1 {\nMsgBox "one"\n} Else If x = 2 {\nMsgBox "two"\n}', ["two"]],
    ['n := 0\nWhile n < 2 {\nn += 1\n}\nMsgBox n', ["2"]],
    ['n := 0\nWhile (n < 2) {\nn += 1\n}\nMsgBox n', ["2"]],
    ['Loop 2 {\nMsgBox "x"\n}', ["x", "x"]],
    ['loop 2 {\nMsgBox "x"\n}', ["x", "x"]],
    ['LOOP 1 {\nMsgBox "x"\n}', ["x"]],
    ['Loop 5 {\nIf A_Index = 2 {\nBreak\n}\nMsgBox A_Index\n}', ["1"]],
    ['Loop 3 {\nIf A_Index = 2 {\nContinue\n}\nMsgBox A_Index\n}', ["1", "3"]],
    ['x := 1\nIF x = 1 {\nMSGBOX "Y"\n}', ["Y"]],
  ];
  for (const [code, expected] of cases) {
    const r = await run(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outputs(r), expected, code);
  }
});

test("RG-32 Return with official capitalization works inside a hotkey block", async () => {
  const dflt = { ...d.model.defaults, event: "^!n" };
  const r = await d.simulate('^!n:: {\nMsgBox "a"\nReturn\nMsgBox "b"\n}', structuredClone(dflt));
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["a"]);
});

test("RG-32 lowercase keyword behaviour is unchanged", async () => {
  const r = await run('x := 0\nwhile x < 2 {\nx += 1\n}\nif x = 2 {\nMsgBox "two"\n} else {\nMsgBox "no"\n}');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["two"]);
});

// ---------- RG-44: backtick control escapes ----------
test("RG-44 `a `b `f `v become the official control characters", async () => {
  const r = await run('s := "x`ay`bz`fw`v"\nMsgBox s');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["x\x07y\x08z\x0Cw\x0B"]);
  const keep = await run('MsgBox "a`nb`tc`;d"');
  assert.deepEqual(errors(keep), []);
  assert.deepEqual(outputs(keep), ["a\nb\tc;d"]);
});

test("RG-32/RG-44 keywords and escapes inside strings and comments are untouched", async () => {
  const r = await run('MsgBox "If While Loop `a"\n; If this comment were code it would not run\nMsgBox "done"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["If While Loop \x07", "done"]);
});

// ---------- RG-33: Loop…Until must not vanish silently ----------
test("RG-33 Loop…Until (official reference form) runs and produces its result", async () => {
  const r = await run("i := 0\nLoop {\ni++\n} Until i >= 3\nMsgBox i");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["3"]);
  assert.equal(vars(r).i, 3);
  assert.ok(r.paths[0].trace.some((t) => /Until/.test(t.text)));
});

test("RG-33 Until works with a counted Loop, lowercase until, and next-line placement", async () => {
  let r = await run("i := 0\nLoop 10 {\ni++\n} Until i >= 3\nMsgBox i");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["3"]);
  r = await run("i := 0\nLoop {\ni++\n} until i >= 2\nMsgBox i");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["2"]);
  r = await run("i := 0\nLoop\n    i++\nUntil i >= 3\nMsgBox i");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["3"]);
});

test("RG-33 a stray Until names the clause instead of disappearing", async () => {
  const r = await run("x := 1\nUntil x >= 3\nMsgBox x");
  assert.ok(errors(r).length);
  assert.match(JSON.stringify(errors(r)), /Until/);
  assert.doesNotMatch(JSON.stringify(errors(r)), /__AHK|__ahk/);
});

test("RG-33 an Until that never holds stops at the iteration limit explicitly", async () => {
  const r = await run("i := 0\nLoop {\ni++\n} Until i >= 1000\nMsgBox i");
  assert.equal(vars(r).i, 100);
  assert.ok(r.paths[0].trace.some((t) => t.kind === "limit"));
  assert.deepEqual(outputs(r), []);
});

// ---------- RG-13: implicit concatenation ----------
test("RG-13 the Beginner Tutorial forms work verbatim", async () => {
  let r = await run('MyVar := 42\nMsgBox "MyVar equals " MyVar "!!"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["MyVar equals 42!!"]);
  r = await run('y := "world"\nx := "hello " y\nMsgBox x');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["hello world"]);
});

test("RG-13 implicit concatenation is consistent in assignment, argument and condition positions", async () => {
  let r = await run('x := "a" "b"\nMsgBox x');
  assert.deepEqual(outputs(r), ["ab"]);
  r = await run('x := "n=" 5\nMsgBox x');
  assert.deepEqual(outputs(r), ["n=5"]);
  r = await run('x := "a"\nMsgBox("v=" x)');
  assert.deepEqual(outputs(r), ["v=a"]);
  r = await run('x := "ab"\nif x = "a" "b" {\nMsgBox "y"\n}');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["y"]);
  r = await run('a := [7, 8]\nMsgBox "first=" a[1]');
  assert.deepEqual(outputs(r), ["first=7"]);
});

test("RG-13 no silent truncation and no internal tokens in indeterminate concatenation", async () => {
  const r = await run('x := InputBox("q").Value\ny := "pre " x\nMsgBox y');
  assert.deepEqual(errors(r), []);
  const shown = JSON.stringify(r.paths[0].outputs) + JSON.stringify(r.paths[0].groups);
  assert.doesNotMatch(shown, /\.concat|<eof>/);
  assert.match(shown, /pre /);
});

// ---------- RG-08 (R13-N7): omitted arguments ----------
test("RG-08 omitted middle arguments no longer name the comma", async () => {
  const r = await run("MsgBox('hi', , 0)\nMsgBox(\"done\")");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["hi", "done"]);
  const arr = await run("a := [1, , 3]\nMsgBox a.Length\nMsgBox a[1]\nMsgBox a[3]");
  assert.deepEqual(errors(arr), []);
  assert.deepEqual(outputs(arr), ["3", "1", "3"]);
});

// ---------- RG-08: statement-form parsing and honest unsupported stops ----------
test("RG-08 statement-form calls accept sign-led first arguments", async () => {
  let r = await run("MsgBox -3");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["-3"]);
  r = await run("MsgBox +3");
  assert.deepEqual(outputs(r), ["3"]);
  r = await run("Click -10, 20");
  assert.deepEqual(errors(r), []);
});

test("RG-08 statement-form bracket strings and explicit concatenation", async () => {
  let r = await run('MsgBox "["');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["["]);
  r = await run('MsgBox "("');
  assert.deepEqual(outputs(r), ["("]);
  r = await run('MsgBox "[" . "x"');
  assert.deepEqual(outputs(r), ["[x"]);
});

test("RG-08 for loops iterate arrays and objects", async () => {
  let r = await run(
    "total := 0\nfor idx, v in [10, 20, 30] {\n total := total + v\n}\nMsgBox total",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["60"]);
  r = await run('out := ""\nfor v in ["a", "b"] {\n out := out . v\n}\nMsgBox out');
  assert.deepEqual(outputs(r), ["ab"]);
  r = await run('for k, v in {name: "x"} {\n MsgBox k . "=" . v\n}');
  assert.deepEqual(outputs(r), ["name=x"]);
});

test("RG-08 concatenation assignment .= works", async () => {
  const r = await run('s := "ab"\ns .= "cd"\nMsgBox s');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["abcd"]);
});

test("RG-08 unsupported declarations stop naming the construct", async () => {
  const cases = [
    ["Add(a, b) {\n return a + b\n}", /関数定義（Add）/],
    ["try {\n x := 1\n} catch {\n x := 2\n}", /Try／Catch/],
    ["x := 1\nswitch x {\n case 1:\n  y := 2\n}", /Switch/],
    ["class Foo {\n}", /class（クラス定義）/],
    ['goto done\ndone:\nMsgBox "x"', /Goto/],
    ['done:\nMsgBox "x"', /ラベル（done:）/],
    ['Loop Files "*.txt" {\n}', /Loop Files/],
    ['Loop Parse "a,b", "," {\n}', /Loop Parse/],
    ['Loop Read "f.txt" {\n}', /Loop Read/],
  ];
  for (const [code, pattern] of cases) {
    const r = await run(code);
    const msgs = errors(r).map((e) => e.message).join(" ");
    assert.match(msgs, pattern, code);
    assert.doesNotMatch(msgs, /<eof>|\.concat/, code);
  }
});

test("RG-08 IsSet and IsSetRef do not raise NameError on unset variables", async () => {
  let r = await run("MsgBox IsSet(y)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["0"]);
  r = await run("y := 5\nMsgBox IsSet(y)");
  assert.deepEqual(outputs(r), ["1"]);
  r = await run("y := [1]\nMsgBox IsSetRef(&y)");
  assert.deepEqual(outputs(r), ["1"]);
  r = await run("MsgBox IsSetRef(&z)");
  assert.deepEqual(outputs(r), ["0"]);
});

test("RG-08 unimplemented functions are named before their arguments are blamed", async () => {
  const r = await run("MouseGetPos &mx, &my");
  const msgs = errors(r).map((e) => e.message).join(" ");
  assert.match(msgs, /MouseGetPos/);
  assert.doesNotMatch(msgs, /未定義の名前：m[xy]/);
});

test("RG-08 truncated expressions never expose internal tokens", async () => {
  const r = await run("x :=");
  const msgs = errors(r).map((e) => e.message).join(" ");
  assert.ok(msgs.length > 0);
  assert.doesNotMatch(msgs, /<eof>|\.concat/);
});

test("RG-08 plain expression statements keep their reading", async () => {
  const r = await run("x := 5\nx - 3\nMsgBox x");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["5"]);
});

// ---------- RG-64 (R18-N6): built-in variables A_* ----------
test("RG-64 built-in variables resolve as runtime-determined, never undefined names", async () => {
  const names = [
    "A_Now", "A_TickCount", "A_Hour", "A_Min", "A_Sec", "A_MSec",
    "A_YYYY", "A_MM", "A_DD", "A_WDay", "A_NowUTC", "A_ScriptDir",
    "A_WorkingDir", "A_IsAdmin", "A_OSVersion", "A_ScreenWidth",
  ];
  for (const name of names) {
    const r = await run(`x := ${name}`);
    assert.deepEqual(errors(r), [], name);
    const x = vars(r).x;
    assert.equal(x?.kind, "unknown", name);
    assert.equal(x?.source, name, name);
  }
  // Recognition is case-insensitive, like every other AHK name.
  const lower = await run("x := a_now");
  assert.deepEqual(errors(lower), []);
  assert.equal(vars(lower).x?.kind, "unknown");
});

test("RG-64 built-in values display as runtime-determined and branch honestly", async () => {
  const r = await run("MsgBox A_Hour");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["実行時に決まる：A_Hour"]);
  const cond = await run('if A_Hour < 12 {\nMsgBox "am"\n} else {\nMsgBox "pm"\n}');
  assert.deepEqual(errors(cond), []);
  const texts = cond.paths.flatMap((p) => (p.outputs || []).map((o) => o.text));
  assert.ok(texts.includes("am") && texts.includes("pm"));
});

test("RG-64 documented constants A_Space and A_Tab have their fixed values", async () => {
  const r = await run('x := "a" A_Space "b"\ny := A_Tab');
  assert.deepEqual(errors(r), []);
  assert.equal(vars(r).x, "a b");
  assert.equal(vars(r).y, "\t");
});

test("RG-64 loop-context built-ins stop naming the variable; A_Index is untouched", async () => {
  const r = await run("x := A_LoopField");
  const e = errors(r)[0];
  assert.equal(e?.category, "未対応");
  assert.match(e?.message ?? "", /A_LoopField/);
  const idx = await run("Loop 2 {\nMsgBox A_Index\n}");
  assert.deepEqual(errors(idx), []);
  assert.deepEqual(outputs(idx), ["1", "2"]);
  const isset = await run("MsgBox IsSet(A_Now)");
  assert.deepEqual(outputs(isset), ["1"]);
  // A name that is not a real built-in keeps the honest undefined error.
  const fake = await run("x := A_Banana");
  assert.equal(errors(fake)[0]?.category, "NameError");
});

test("RG-55 logical NOT and compound conditions yield 1/0", async () => {
  const r = await run('x := !0\ny := !"a"\nMsgBox x\nMsgBox y\nif 1 < 2 && 2 < 3 {\nMsgBox "ok"\n}');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["1", "0", "ok"]);
  assert.equal(vars(r).x, 1);
  assert.equal(vars(r).y, 0);
});

// ---------- RG-73 (R20-N3): numeric strings are falsy when zero ----------
test("RG-73 numeric strings use their numeric value as truthiness", async () => {
  const branch = async (cond) => {
    const r = await run(`if ${cond} {\nMsgBox "T"\n} else {\nMsgBox "F"\n}`);
    assert.deepEqual(errors(r), []);
    return outputs(r)[0];
  };
  assert.equal(await branch('"0"'), "F");
  assert.equal(await branch('"0.0"'), "F");
  assert.equal(await branch('"00"'), "F");
  assert.equal(await branch('"2"'), "T");
  assert.equal(await branch('"false"'), "T");
  assert.equal(await branch('"x"'), "T");
  assert.equal(await branch('""'), "F");
});

// ---------- RG-72 (R19-N10): the empty string is not equal to 0 ----------
test("RG-72 equality does not convert the empty string to 0", async () => {
  const eq = async (expr) => {
    const r = await run(`MsgBox ${expr}`);
    assert.deepEqual(errors(r), []);
    return outputs(r)[0];
  };
  assert.equal(await eq('"" = 0'), "0");
  assert.equal(await eq('0 = ""'), "0");
  assert.equal(await eq('"" == 0'), "0");
  assert.equal(await eq('"" != 0'), "1");
  assert.equal(await eq('" " = 0'), "0");
  assert.equal(await eq('"0" = 0'), "1");
  assert.equal(await eq('"a" = 0'), "0");
  assert.equal(await eq('"" = 1'), "0");
});

// ---------- RG-68 (R19-N2): AutoHotkey v2 comment rules ----------
test("RG-68 a semicolon not preceded by space/tab is not a comment", async () => {
  const r = await run("x := 42;comment\nMsgBox x");
  assert.ok(errors(r).length > 0, "must not silently accept ;comment as a comment");
});
test("RG-68 a mid-expression /* is not a comment", async () => {
  const r = await run("x := 40 + /* comment */ 2\nMsgBox x");
  assert.ok(errors(r).length > 0, "must not evaluate as if /* */ were a comment");
});
test("RG-68 an unterminated block comment runs to EOF without error", async () => {
  const r = await run("x := 42\nMsgBox x\n/* unterminated\ny := 999\nMsgBox y");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["42"]);
});
test("RG-68 ordinary comments keep working", async () => {
  const r = await run("; leading\nx := 42 ; trailing\n/* block\ncomment */\nMsgBox x");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["42"]);
});
