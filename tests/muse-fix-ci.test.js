import test from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// CI の native-audit は dotnet がある環境で C# の教材例を実コンパイルする。
// C# の教材例は void Main に包まれるため、本体に値を返す return があると
// 実 C# では CS0127 でコンパイルできない（RG-58 で追加した return 項目が
// この形で CI を落とした再発防止）。
test("C# teaching examples contain no value-return inside the void Main wrapper", () => {
  const d = getDefinition("csharp");
  const codes = [
    ...d.templates.map((t) => t.code),
    ...d.reference.map((r) => r.example),
  ];
  assert.ok(codes.length > 0);
  for (const code of codes) {
    assert.doesNotMatch(
      code,
      /\breturn\s+[^;\s]/,
      `value-return is invalid in the void Main wrapper: ${code.slice(0, 80)}`,
    );
  }
});

test("C# return reference example compiles in principle (bare return in Main)", async () => {
  const d = getDefinition("csharp");
  const item = d.reference.find((r) => r.name === "return");
  assert.ok(item, "return reference item must exist for trace refs (RG-58)");
  assert.match(item.example, /static void Main\(\) \{\nreturn;/);
  const r = await d.simulate(
    item.example,
    structuredClone(d.model.defaults),
  );
  assert.equal(r.paths?.[0]?.outputs?.map((o) => o.text).join("") ?? "", "");
});

// 統合配信 6763392 の CI は native-audit（実コンパイラ照合）で落ちた。VM に
// gcc があっても npm test 側では同じ失敗クラスを捕まえられていなかったため、
// 実コンパイルが必要な前提を静的検査として固定する（RG-143）。
test("C examples using bool/true/false include <stdbool.h>", () => {
  const d = getDefinition("c");
  const codes = [
    ...d.templates.map((t) => ["template", t.id, t.code]),
    ...d.reference.map((r) => ["reference", r.name, r.example]),
  ];
  assert.ok(codes.length > 0);
  for (const [section, name, code] of codes) {
    if (/\b(bool|true|false)\b/.test(code)) {
      assert.ok(
        code.includes("#include <stdbool.h>"),
        `C ${section} ${name}: bool/true/false requires <stdbool.h> in C17: ${code.slice(0, 80)}`,
      );
    }
  }
});

test("C++ examples using std::string include <string> and never declare bare string", () => {
  const d = getDefinition("cpp");
  const codes = [
    ...d.templates.map((t) => ["template", t.id, t.code]),
    ...d.reference.map((r) => ["reference", r.name, r.example]),
  ];
  assert.ok(codes.length > 0);
  for (const [section, name, code] of codes) {
    assert.doesNotMatch(
      code,
      /(^|\n)\s*string\s+[A-Za-z_]\w*\s*(=|;)/,
      `C++ ${section} ${name}: bare 'string' declaration does not compile without std::: ${code.slice(0, 80)}`,
    );
    if (code.includes("std::string")) {
      assert.ok(
        code.includes("#include <string>"),
        `C++ ${section} ${name}: std::string requires <string>: ${code.slice(0, 80)}`,
      );
    }
  }
});
