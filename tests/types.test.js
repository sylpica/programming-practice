import { test } from "node:test";
import assert from "node:assert/strict";
import {
  definitions,
  getDefinition,
  validateDefinition,
} from "../js/types/registry.js";
import { decodeFile } from "../js/import.js";
import { parseJsonLocated } from "../js/core/data.js";
const run = async (id, code, model) => {
  let d = getDefinition(id);
  return d.simulate(code, model || d.model.defaults);
};
const first = async (id, code, model) => {
  let r = await run(id, code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const output = (p) => p.outputs.map((o) => o.text).join("\n");
test("13 tool definitions satisfy the extension contract", () => {
  assert.equal(definitions.length, 13);
  assert.equal(new Set(definitions.map((d) => d.id)).size, 13);
  for (let d of definitions) {
    validateDefinition(d);
    assert.ok(d.templates.length >= 3);
    assert.ok(d.reference.length >= 7);
    assert.ok(d.semantics.sources.length);
  }
});
test("all development templates parse and simulate; error lessons stop deliberately", async () => {
  for (let d of definitions)
    for (let t of d.templates) {
      let result = await d.simulate(t.code, t.model || d.model.defaults);
      assert.ok(
        !result.error,
        `${d.id}/${t.id}: ${JSON.stringify(result.error)}`,
      );
      assert.ok(result.paths.length, `${d.id}/${t.id}`);
      if (!t.id.endsWith("-error"))
        assert.ok(
          result.paths.every((p) => !p.error),
          `${d.id}/${t.id}: ${JSON.stringify(result.paths.find((p) => p.error)?.error)}`,
        );
    }
});
test("extensions are per-type, case-insensitive, with existing decoding safeguards", () => {
  let b = new TextEncoder().encode("test").buffer;
  for (let d of definitions) {
    assert.equal(
      decodeFile(b, "test" + d.extensions[0], d.extensions).text,
      "test",
    );
    assert.throws(() => decodeFile(b, "test.invalid", d.extensions));
  }
  assert.equal(
    decodeFile(b, "model.R", getDefinition("r").extensions).text,
    "test",
  );
});
test("located JSON maps repeated actions by structural positions", () => {
  let source =
    '{\n "Commands": [\n {"Command":"echo","Target":"same"},\n {"Command":"echo","Target":"same"}\n ]\n}';
  let p = parseJsonLocated(source);
  assert.equal(p.locations.get("/Commands/0"), 3);
  assert.equal(p.locations.get("/Commands/1"), 4);
  assert.throws(() => parseJsonLocated('{"x":1,"x":2}'));
});
test("Python imported interpreter: semantics and model globals", async () => {
  let p = await first(
    "python",
    "print(-7 // 2, -7 % 3)\na = [1, 2]\nb = a\nb.append(3)\nprint(a)",
  );
  assert.equal(output(p), "-4 2\n[1, 2, 3]");
  assert.equal(
    output(
      await first("python", "print(sum(numbers))", {
        globals: { numbers: [2, 3, 4] },
      }),
    ),
    "9",
  );
  let err = await first("python", "print([1][2])");
  assert.match(err.error.message, /IndexError/);
});
test("ImageJ model pixels known, outside 0, unspecified remains unknown", async () => {
  let p = await first(
    "imagej",
    "print(getPixel(0,0));\nsetPixel(0,0,55);\nprint(getPixel(0,0));\nprint(getPixel(-1,0));",
  );
  assert.deepEqual(
    p.outputs.map((o) => o.text),
    ["100", "55", "0"],
  );
  let q = await first("imagej", "print(getPixel(2,2));");
  assert.match(output(q), /実行時/);
});
test("CloudFormation top-level Transform order and event params", async () => {
  let d = getDefinition("cloudformation"),
    m = structuredClone(d.model.defaults);
  m.macros.A =
    'def handler(event, context):\n    f = event["fragment"]\n    f["Stage"] = "A"\n    return {"requestId":event["requestId"], "status":"SUCCESS", "fragment":f}';
  m.macros.B =
    'def handler(event, context):\n    f = event["fragment"]\n    f["Stage"] = f["Stage"] + "B"\n    return {"requestId":event["requestId"], "status":"success", "fragment":f}';
  let p = await first(
    "cloudformation",
    JSON.stringify({ Transform: ["A", "B"], Value: 1 }),
    m,
  );
  assert.match(p.groups[0].entries[1][1], /"Stage": "AB"/);
  assert.ok(!p.groups[0].entries[1][1].includes("Transform"));
});
test("CloudFormation requestId errors and Fn::Transform sibling scope", async () => {
  let d = getDefinition("cloudformation"),
    m = structuredClone(d.model.defaults);
  let handler =
    'def handler(event, context):\n    return {"requestId":"wrong", "status":"success", "fragment":event["fragment"]}';
  assert.match(
    (await first("cloudformation", handler, m)).error.message,
    /requestId/,
  );
  let p = await first("cloudformation", d.templates[1].code, m);
  let after = JSON.parse(p.groups[0].entries[1][1]);
  assert.equal(after.Resources.Bucket.Properties.Metadata.Stage, "test");
  assert.ok(!Object.hasOwn(after.Resources.Bucket.Properties, "Fn::Transform"));
});
test("Power Automate loops, model files and branch-linked actions", async () => {
  let d = getDefinition("powerautomate");
  let p = await first("powerautomate", d.templates[0].code);
  assert.equal(p.vars.Count, 3);
  let r = await run("powerautomate", d.templates[1].code);
  assert.equal(r.paths.length, 2);
  assert.equal(r.paths.filter((p) => p.model.sentMail.length === 1).length, 1);
  assert.ok(r.paths[0].trace.some((t) => t.refs.includes("Send email")));
  assert.ok(!r.paths[1].trace.some((t) => t.refs.includes("Send email")));
});
test("UI.Vision real JSON command schema, DOM model and while loop", async () => {
  let d = getDefinition("uivision");
  let p = await first("uivision", d.templates[0].code);
  assert.equal(p.model.pages[p.model.url].elements["id=name"].value, "学習者");
  assert.equal(p.vars.Result, "完了");
  assert.equal((await first("uivision", d.templates[1].code)).vars.count, 3);
  let bad = await first(
    "uivision",
    JSON.stringify({
      Commands: [{ Command: "click", Target: "id=missing", Value: "" }],
    }),
  );
  assert.match(bad.error.message, /要素/);
  assert.equal(bad.error.line, 1);
});
test("AutoHotkey runs only requested event, v2 title matching and SendText", async () => {
  let d = getDefinition("autohotkey");
  let p = await first("autohotkey", d.templates[0].code);
  assert.equal(p.model.windows[0].text, "こんにちは\n");
  let model = structuredClone(d.model.defaults);
  model.event = null;
  let none = await first("autohotkey", d.templates[0].code, model);
  assert.equal(none.model.windows[0].text, "");
  let hot = await first(
    "autohotkey",
    d.templates[1].code,
    d.templates[1].model,
  );
  assert.equal(hot.model.windows[0].text, "by the way");
  let q = await first("autohotkey", "x := 1\nX += 2", model);
  assert.equal(q.vars.x, 3);
});
test("Power Fx lazy If, bindings, ForAll and record patch", async () => {
  let d = getDefinition("powerapps"),
    p = await first("powerapps", d.templates[0].code);
  assert.equal(p.model.variables.Status, "十分");
  assert.equal(p.model.controls.Label1.Text, "3");
  let q = await first("powerapps", d.templates[1].code);
  assert.equal(q.model.variables.Total, 14);
  assert.deepEqual(
    q.model.collections.Items.map((x) => x.Square),
    [1, 4, 9],
  );
  let row = await first("powerapps", d.templates[2].code);
  assert.equal(row.model.screen, "Detail");
  assert.deepEqual(row.model.dataSources.Orders, [{ Name: "3", Done: false }]);
});
test("R vector recycling, NA, type promotion and 1-based indexing", async () => {
  let p = await first(
    "r",
    'x <- c(1, 2, 3)\ny <- x + c(10, 20)\nprint(y)\nprint(x[1])\nprint(x[9])\nprint(c(TRUE, 2, "x"))\nprint(-x)',
  );
  assert.equal(
    output(p),
    'c(11, 22, 13)\nc(1)\nc(NA)\nc("TRUE", "2", "x")\nc(-1, -2, -3)',
  );
  assert.ok(p.trace.some((t) => t.kind === "warning"));
  let err = await first("r", "if (NA) {\nprint(1)\n}");
  assert.match(err.error.message, /missing value/);
});
test("R dataframe column updates and copy-on-modify", async () => {
  let d = getDefinition("r"),
    p = await first("r", d.templates[1].code);
  assert.deepEqual(p.vars.df.columns.bonus, [55, 85, 100]);
  let q = await first("r", "x <- c(1,2)\ny <- x\ny[1] <- 9\nprint(x)");
  assert.equal(output(q), "c(1, 2)");
});
test("C/C++ pointer update and actual integer division semantics", async () => {
  for (let id of ["c", "cpp"]) {
    let d = getDefinition(id),
      p = await first(id, d.templates[1].code);
    assert.equal(
      Object.values(p.model.memory).find((m) => m.name === "values").values[1],
      99,
    );
    let q = await first(
      id,
      id === "c"
        ? 'int x = -7 / 2;\nprintf("%d", x);'
        : "int x = -7 / 2;\ncout << x;",
    );
    assert.equal(output(q), "-3");
  }
});
test("C undefined behavior never produces invented values", async () => {
  for (let source of [
    "int x;\nint y = x;",
    "int a[1] = {1};\nint y = a[1];",
    "int x = 2147483647;\nx = x + 1;",
    "int x = 1 / 0;",
  ]) {
    let p = await first("c", source);
    assert.equal(p.error.category, "未定義動作");
    assert.equal(p.outputs.length, 0);
  }
  let printf = await first("c", 'double x = 1.5;\nprintf("%d",x);');
  assert.equal(printf.error.category, "未定義動作");
});
test("C pointer lifetime and one-past distinction", async () => {
  let p = await first(
    "c",
    "int values[2] = {1,2};\nint *p = &values[0];\np = p + 2;\nint x = *p;",
  );
  assert.equal(p.error.category, "未定義動作");
  let q = await first("c", "int *p;\n{\nint x = 1;\np = &x;\n}\nint y = *p;");
  assert.equal(q.error.category, "未定義動作");
});
test("C# reference alias, array exception and overflow distinction", async () => {
  let d = getDefinition("csharp"),
    p = await first("csharp", d.templates[1].code);
  assert.equal(output(p), "5");
  let a = await first(
    "csharp",
    "int x = 2147483647;\nx = x + 1;\nConsole.WriteLine(x);",
  );
  assert.equal(output(a), "-2147483648");
  let b = await first(
    "csharp",
    "int x = 2147483647;\nchecked {\nx = x + 1;\n}",
  );
  assert.equal(b.error.category, "OverflowException");
  let error = await first("csharp", d.templates[2].code);
  assert.equal(error.error.category, "IndexOutOfRangeException");
});
test("JavaScript DOM, reference identity, const and block scope", async () => {
  let d = getDefinition("javascript"),
    p = await first("javascript", d.templates[0].code);
  assert.equal(p.model.dom.elements.result.textContent, "こんにちは、学習者");
  let q = await first("javascript", d.templates[1].code);
  assert.deepEqual(q.vars.values, [1, 2, 3, 4]);
  assert.ok(!Object.hasOwn(q.vars, "i"));
  let e = await first("javascript", "const x = 1;\nx = 2;");
  assert.equal(e.error.category, "TypeError");
  let scoped = await first(
    "javascript",
    "if (true) {\nlet x = 1;\n}\nconsole.log(x);",
  );
  assert.ok(scoped.error);
});
test("all new dialects reject unsupported syntax without executing host code", async () => {
  for (let [id, code] of [
    ["javascript", 'fetch("https://example.test")'],
    ["autohotkey", 'Run "notepad.exe"'],
    ["r", 'system("whoami")'],
    ["powerapps", 'Launch("https://example.test")'],
    ["c", 'system("whoami");'],
  ]) {
    let r = await run(id, code);
    assert.ok(r.error || r.paths.some((p) => p.error), id);
  }
});
test("symbolic branches prune repeated predicates and contradictory numeric ranges", async () => {
  for (let [id, code] of [
    [
      "python",
      'x=input()\nif x == "a":\n    y=1\nelif x == "a":\n    y=2\nelse:\n    y=3',
    ],
    [
      "imagej",
      'x=getNumber("x",0);if(x==1){y=1;}else if(x==1){y=2;}else{y=3;}',
    ],
    [
      "javascript",
      'let x=Number(prompt("x"));\nif(x>10){\nif(x<5){\nconsole.log("impossible");\n}else{\nconsole.log("ok");\n}\n}else{\nconsole.log("other");\n}',
    ],
  ]) {
    let r = await run(id, code);
    assert.equal(r.paths.length, 2, id);
    assert.ok(!r.paths.some((p) => output(p).includes("impossible")));
  }
});
test("input calls in a loop stay independent while stored unknown conditions stay fixed", async () => {
  let py = await run("python", 'while input() == "a":\n    print("A")');
  assert.equal(py.paths.length, 4);
  assert.ok(py.truncated);
  let fixed = await run("python", 'x=input()\nwhile x == "a":\n    print("A")');
  assert.equal(fixed.paths.length, 2);
  let js = await run(
    "javascript",
    'while(prompt("x") === "a"){\nconsole.log("A");\n}',
  );
  assert.equal(js.paths.length, 4);
  assert.ok(js.truncated);
});
test("Python path references include calls in loop headers", async () => {
  let p = await first("python", "for i in range(2):\n    print(i)");
  assert.ok(p.trace.some((t) => t.refs.includes("range")));
  assert.ok(p.trace.some((t) => t.refs.includes("print")));
});
test("AutoHotkey event assignments use local scope and = is case insensitive", async () => {
  let d = getDefinition("autohotkey"),
    model = structuredClone(d.model.defaults);
  let p = await first("autohotkey", "x := 1\n^!n:: {\nx := 3\n}", model);
  assert.equal(p.vars.x, 1);
  assert.equal(p.model.lastEventLocals.x, 3);
  model.event = null;
  assert.equal(
    output(
      await first("autohotkey", 'if "a" = "A" {\nMsgBox "same"\n}', model),
    ),
    "same",
  );
});
test("R variadic aggregation, named sequence args and NA algebra", async () => {
  let p = await first(
    "r",
    'print(sum(1,2,3))\nprint(seq(from=1,to=5,by=2))\nprint(1 ^ NA)\nprint(NA ^ 0)\nprint(NA & FALSE)\nprint(NA | TRUE)\nprint(c(TRUE) == "TRUE")',
  );
  assert.equal(
    output(p),
    "6\nc(1, 3, 5)\nc(1)\nc(1)\nc(FALSE)\nc(TRUE)\nc(TRUE)",
  );
});
