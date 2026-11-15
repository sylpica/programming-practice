import test from "node:test";
import assert from "node:assert/strict";
import { definition as cmd } from "../js/types/cmd/index.js";
import { definition as ps } from "../js/types/powershell/index.js";

const byName = (def, name) => def.reference.find((r) => r.name === name);

test("ref-shell cmd: set /p と動的変数は独立項目で到達できる", () => {
  assert.ok(byName(cmd, "set /p"));
  const dyn = byName(cmd, "動的変数");
  assert.ok(dyn);
  for (const n of ["%ERRORLEVEL%", "%CD%", "%RANDOM%", "%DATE%", "%TIME%"])
    assert.ok(
      dyn.syntax.includes(n) && dyn.description.includes(n),
      n,
    );
  assert.ok(cmd.scan('set /p "A=Q? "').includes("set /p"));
  assert.ok(cmd.scan("echo %ERRORLEVEL%").includes("動的変数"));
  assert.ok(cmd.scan("echo %RANDOM%").includes("動的変数"));
  assert.ok(byName(cmd, "変数展開").description.includes("動的変数"));
  assert.ok(byName(cmd, "call").description.includes("%0"));
  const ifDesc = byName(cmd, "if").description;
  for (const op of ["==", "EQU", "NEQ", "LSS", "LEQ", "GTR", "GEQ", "exist", "defined", "errorlevel", "not", "/I"])
    assert.ok(ifDesc.includes(op), op);
  assert.ok(byName(cmd, "setlocal").syntax.includes("DisableDelayedExpansion"));
  assert.ok(byName(cmd, "cd").description.includes("chdir"));
  assert.ok(byName(cmd, "md").description.includes("mkdir"));
  assert.ok(byName(cmd, "rd").description.includes("rmdir"));
  assert.ok(byName(cmd, "del").description.includes("erase"));
  assert.ok(byName(cmd, "ren").description.includes("rename"));
});

test("ref-shell powershell: 自動変数・キャスト・演算子が項目化されている", () => {
  for (const n of ["$_", "$PSItem", "$?", "$LASTEXITCODE", "$args"])
    assert.ok(byName(ps, n), n);
  const cast = byName(ps, "型変換（キャスト）");
  assert.ok(cast);
  for (const t of ["[string]", "[bool]", "[boolean]", "[int]", "[int32]", "[double]", "[pscustomobject]"])
    assert.ok(cast.syntax.includes(t) || cast.description.includes(t), t);
  const logic = byName(ps, "論理演算子");
  assert.ok(logic);
  for (const op of ["-and", "-or", "-not", "!"])
    assert.ok(logic.syntax.includes(op), op);
  const arith = byName(ps, "算術・代入演算子");
  assert.ok(arith);
  for (const op of ["+", "-", "*", "/", "%", "+=", "-=", "*=", "/=", "++", "--"])
    assert.ok(arith.syntax.includes(op), op);
  const vars = byName(ps, "変数").description;
  for (const c of ["$true", "$false", "$null"]) assert.ok(vars.includes(c), c);
});

test("ref-shell powershell: 別名23種が正名項目の本文に全て現れる", () => {
  const all = ps.reference.map((r) => r.description).join("\n");
  const aliases = [
    "echo", "gci", "ls", "dir", "where", "?", "foreach", "%", "select",
    "sort", "measure", "cd", "pwd", "cat", "gc", "sc", "ac", "ni", "ri",
    "rm", "ren", "cp", "mv",
  ];
  assert.equal(aliases.length, 23);
  for (const a of aliases) assert.ok(all.includes(a), a);
  // 主要な追加パラメーターの言及
  assert.ok(byName(ps, "Get-ChildItem").description.includes("-Recurse"));
  assert.ok(byName(ps, "Select-Object").description.includes("-ExpandProperty"));
  assert.ok(byName(ps, "Write-Host").description.includes("-Separator"));
  assert.ok(byName(ps, "Set-Content").description.includes("-NoNewline"));
  assert.ok(byName(ps, "Add-Content").description.includes("-NoNewline"));
  assert.ok(byName(ps, "Remove-Item").description.includes("-Force"));
});
