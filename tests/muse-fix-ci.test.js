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

// 是正配信 41cc179 の CI は再び native-audit で落ちた。C リファレンス `abs`
// の使用例が <stdlib.h> なしで abs() を呼び、GCC 14 系（CI）では暗黙の関数
// 宣言が既定でエラーになる一方、ローカルの GCC 13 では警告止まりだった
// （環境差）。同種の項目が背後に隠れていないかを collect-all で全件確認し、
// 残るのは C／C++ の abs 項目だけだった（C++ 版は libstdc++ の推移的
// インクルードで偶然通り、宣言ヘッダー <cstdlib> を欠いていた）。
// 再発防止として、C／C++ の全教材例について「呼び出すライブラリ関数は、
// その宣言ヘッダーを直接インクルードしていること」を静的に固定する
// （RG-144）。これにより CI のコンパイラ世代に依存せず同じ失敗クラスを
// npm test で捕まえられる。
const LIBFN_HEADERS = {
  printf: ["stdio.h", "cstdio"], fprintf: ["stdio.h", "cstdio"],
  sprintf: ["stdio.h", "cstdio"], snprintf: ["stdio.h", "cstdio"],
  scanf: ["stdio.h", "cstdio"], puts: ["stdio.h", "cstdio"],
  putchar: ["stdio.h", "cstdio"], getchar: ["stdio.h", "cstdio"],
  fopen: ["stdio.h", "cstdio"], fclose: ["stdio.h", "cstdio"],
  fgets: ["stdio.h", "cstdio"], fputs: ["stdio.h", "cstdio"],
  abs: ["stdlib.h", "cstdlib"], labs: ["stdlib.h", "cstdlib"],
  llabs: ["stdlib.h", "cstdlib"], exit: ["stdlib.h", "cstdlib"],
  atoi: ["stdlib.h", "cstdlib"], atol: ["stdlib.h", "cstdlib"],
  atof: ["stdlib.h", "cstdlib"], strtol: ["stdlib.h", "cstdlib"],
  malloc: ["stdlib.h", "cstdlib"], calloc: ["stdlib.h", "cstdlib"],
  realloc: ["stdlib.h", "cstdlib"], free: ["stdlib.h", "cstdlib"],
  rand: ["stdlib.h", "cstdlib"], srand: ["stdlib.h", "cstdlib"],
  system: ["stdlib.h", "cstdlib"], qsort: ["stdlib.h", "cstdlib"],
  strlen: ["string.h", "cstring"], strcpy: ["string.h", "cstring"],
  strncpy: ["string.h", "cstring"], strcat: ["string.h", "cstring"],
  strcmp: ["string.h", "cstring"], strncmp: ["string.h", "cstring"],
  strchr: ["string.h", "cstring"], strstr: ["string.h", "cstring"],
  memcpy: ["string.h", "cstring"], memset: ["string.h", "cstring"],
  memcmp: ["string.h", "cstring"],
  sqrt: ["math.h", "cmath"], pow: ["math.h", "cmath"],
  floor: ["math.h", "cmath"], ceil: ["math.h", "cmath"],
  fabs: ["math.h", "cmath"], fmod: ["math.h", "cmath"],
  sin: ["math.h", "cmath"], cos: ["math.h", "cmath"],
  tan: ["math.h", "cmath"], log: ["math.h", "cmath"],
  log10: ["math.h", "cmath"], exp: ["math.h", "cmath"],
  round: ["math.h", "cmath"], trunc: ["math.h", "cmath"],
  isdigit: ["ctype.h", "cctype"], isalpha: ["ctype.h", "cctype"],
  isspace: ["ctype.h", "cctype"], isupper: ["ctype.h", "cctype"],
  islower: ["ctype.h", "cctype"], toupper: ["ctype.h", "cctype"],
  tolower: ["ctype.h", "cctype"],
  assert: ["assert.h", "cassert"],
  time: ["time.h", "ctime"], clock: ["time.h", "ctime"],
  difftime: ["time.h", "ctime"],
};
const CPP_STD_HEADERS = { string: "string", getline: "string", cout: "iostream", cin: "iostream", endl: "iostream" };

test("C/C++ examples include the header declaring every library function they call", () => {
  for (const lang of ["c", "cpp"]) {
    const d = getDefinition(lang);
    const codes = [
      ...d.templates.map((t) => ["template", t.id, t.code]),
      ...d.reference.map((r) => ["reference", r.name, r.example]),
    ];
    assert.ok(codes.length > 0);
    for (const [section, name, code] of codes) {
      const includes = new Set([...code.matchAll(/#include\s*<([^>]+)>/g)].map((m) => m[1]));
      const body = code
        .replace(/#include\s*<[^>]+>/g, "")
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/'(?:\\.|[^'\\])'/g, "' '")
        .replace(/\/\/[^\n]*/g, "");
      for (const [fn, headers] of Object.entries(LIBFN_HEADERS)) {
        if (new RegExp(`(?<![\\w.:])${fn}\\s*\\(`).test(body)) {
          assert.ok(
            headers.some((h) => includes.has(h)),
            `${lang} ${section} ${name}: calls ${fn}() but includes neither ${headers.map((h) => `<${h}>`).join(" nor ")} (implicit declaration is an error on GCC 14+): ${code.slice(0, 80)}`,
          );
        }
      }
      if (lang === "cpp") {
        for (const [fn, header] of Object.entries(CPP_STD_HEADERS)) {
          if (new RegExp(`std::${fn}\\b`).test(body)) {
            assert.ok(
              includes.has(header),
              `cpp ${section} ${name}: uses std::${fn} but does not include <${header}>: ${code.slice(0, 80)}`,
            );
          }
        }
      }
    }
  }
});
