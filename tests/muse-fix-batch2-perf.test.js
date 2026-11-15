// 修正バッチ2「性能班」回帰テスト（P-N1／P-N2／P-N4）
// - P-N1: 文字列・配列の倍増でヒープ OOM しないこと（子プロセスに隔離し、
//   512MB 上限でも異常終了せず、結果サイズが有界であること）。
// - P-N2: 状態スナップショットと表示の切り詰め（省略記法つき）。
// - P-N4: VBA の使用関数解決（usedReferences）の結果一致と後処理の有界性。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { getDefinition } from "../js/types/registry.js";
import { usedReferences } from "../js/content.js";
import { formatValue, formatModelValue } from "../js/core/contract.js";
import { truncateDisplayText } from "../js/core/presentation.js";

const ROOT = new URL("../", import.meta.url).href;
const run = async (id, code, extra) => {
  const d = getDefinition(id);
  const model = structuredClone(d.model.defaults);
  if (extra) Object.assign(model, extra);
  return d.simulate(code, model);
};

// 子プロセスで倍増系ケースを実行し、serialize 後のバイト数を返す。
// OOM で異常終了した場合は status が 0 にならず、ここで失敗になる。
const CHILD = `
import { serialize } from "node:v8";
const root = process.env.PERF_ROOT;
const { getDefinition } = await import(root + "js/types/registry.js");
const CASES = {
  vba: ["vba", "Dim s As String\\ns = \\"a\\"\\nFor i = 1 To 40\\n  s = s & s\\nNext i"],
  javascript: ["javascript", "let s = \\"a\\";\\nfor (let i = 0; i < 40; i++) { s = s + s; }"],
  imagej: ["imagej", "s = \\"a\\";\\nfor (i = 0; i < 40; i++) { s = s + s; }"],
  powershell: ["powershell", "$s = \\"a\\"\\nforeach ($i in 1..40) { $s = $s + $s }"],
  powershell_array: ["powershell", "$s = \\"a\\" * 100000\\n$a = @($s)\\nforeach ($i in 1..17) { $a = $a + $a }"],
  autohotkey: ["autohotkey", "s := \\"a\\"\\nLoop 40 {\\n  s := s . s\\n}"],
  cmd: ["cmd", "set S=a\\n:loop\\nset S=%S%%S%\\nset /a N+=1\\nif %N% LSS 30 goto loop"],
  csharp: ["csharp", "string s = \\"a\\";\\nfor (int i = 0; i < 40; i++) { s = s + s; }"],
  cpp: ["cpp", "#include <string>\\nint main() {\\n  std::string s = \\"a\\";\\n  for (int i = 0; i < 40; i++) { s = s + s; }\\n  return 0;\\n}"],
  python: ["python", "s = \\"a\\"\\nfor i in range(40):\\n    s = s + s"],
};
const [id, code] = CASES[process.argv.at(-1)];
const def = getDefinition(id);
const model = structuredClone(def.model.defaults);
if (id === "autohotkey") model.event = null;
const r = await def.simulate(code, model);
console.log("SIZE " + serialize(r).length);
`;
function childSize(caseName) {
  const res = spawnSync(
    process.execPath,
    ["--max-old-space-size=512", "--input-type=module", "-e", CHILD, caseName],
    {
      env: { ...process.env, PERF_ROOT: ROOT },
      encoding: "utf8",
      timeout: 90000,
    },
  );
  assert.equal(
    res.status,
    0,
    `${caseName}: 子プロセスが異常終了しました (status=${res.status}, signal=${res.signal})\n${res.stderr?.slice(-500) || ""}`,
  );
  const m = /SIZE (\d+)/.exec(res.stdout || "");
  assert.ok(m, `${caseName}: サイズが出力されませんでした: ${res.stdout}`);
  return Number(m[1]);
}

for (const caseName of [
  "vba",
  "javascript",
  "imagej",
  "powershell",
  "powershell_array",
  "autohotkey",
  "cmd",
  "csharp",
  "cpp",
  "python",
]) {
  test(`P-N1: 倍増ループが OOM せず結果サイズが有界 (${caseName})`, () => {
    const size = childSize(caseName);
    // 修正前は VBA で約134MB、他系統はヒープ OOM で異常終了した。
    assert.ok(size < 2_000_000, `${caseName}: 結果が大きすぎます (${size} bytes)`);
  });
}

test("P-N1: PowerShell の未確定値 id が倍増しない", async () => {
  const r = await run(
    "powershell",
    '$s = "a"\nforeach ($i in 1..40) { $s = $s + $s }',
  );
  const v = r.paths[0].vars.s;
  assert.equal(v?.kind, "unknown");
  // 修正前は id だけで約6,700万文字になった。
  assert.ok(JSON.stringify(v).length < 100_000);
});

test("P-N1: JavaScript の疎な配列書き込みは上限で止まる", async () => {
  const r = await run(
    "javascript",
    "let a = [1];\na[100000000] = 2;",
  );
  assert.ok(
    r.paths.some((p) => /上限（200000）/.test(p.error?.message || "")),
    JSON.stringify(r.paths.map((p) => p.error?.message)),
  );
});

test("P-N1: AutoHotkey の疎な添字書き込みは上限で止まる", async () => {
  const r = await run("autohotkey", "a := []\na[100000000] := 1", {
    event: null,
  });
  const messages = [r.error, ...r.paths.map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
  assert.ok(
    messages.some((m) => /上限（200000）/.test(m)),
    JSON.stringify(messages),
  );
});

test("P-N1: ImageJ の巨大な配列拡張は上限で止まる", async () => {
  const r = await run("imagej", "a = newArray(3);\na[100000000] = 1;");
  const messages = [r.error, ...r.paths.map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
  assert.ok(
    messages.some((m) => /上限（200000）/.test(m)),
    JSON.stringify(messages),
  );
});

test("P-N1: ImageJ の newArray(巨大) は実体を作らない", async () => {
  const r = await run("imagej", "a = newArray(100000000);");
  const v = r.paths[0].vars.a;
  // ImageJ のラッパーは未確定値を表示文字列「（実行時に決まる値）」で
  // 格納する。巨大配列の実体（長さ1億の配列）が作られていないこと。
  assert.ok(
    v?.kind === "unknown" || v === "（実行時に決まる値）" || r.paths[0].error,
    "未確定値化するか明示エラーで止まること",
  );
  assert.ok(!Array.isArray(v));
});

test("P-N2: VBA 倍増25回の結果オブジェクトが肥大しない", async () => {
  const r = await run(
    "vba",
    'Dim s As String\ns = "a"\nFor i = 1 To 25\n  s = s & s\nNext i',
  );
  // 修正前は約134MBだった。
  assert.ok(JSON.stringify(r).length < 1_000_000);
});

test("P-N2: 長い文字列の表示は省略記法つきで切り詰められる", () => {
  const text = formatValue("a".repeat(5000));
  assert.ok(text.length < 2200, `表示が長すぎます (${text.length})`);
  assert.ok(/省略/.test(text), "省略したことが分かる記法が必要です");
  assert.ok(/全5000文字/.test(text), "全体の長さが示されること");
});

test("P-N2: truncateDisplayText は短い文字列を変えない", () => {
  assert.equal(truncateDisplayText("abc"), "abc");
  const long = truncateDisplayText("x".repeat(3000));
  assert.ok(long.length < 2100 && /省略/.test(long));
});

test("P-N2: formatModelValue の合算表示にも上限がある", () => {
  const model = {
    kind: "test-model",
    items: Array.from({ length: 50 }, (_, i) => ({
      name: "item" + i,
      text: "b".repeat(1000),
    })),
  };
  const text = formatModelValue(model);
  assert.ok(text.length <= 8100, `合算表示が長すぎます (${text.length})`);
});

test("P-N4: usedReferences の解決結果が従来どおりである", () => {
  const id = (v) => ({ type: "id", v });
  const sym = (v) => ({ type: "sym", v });
  assert.deepEqual(usedReferences([id("InputBox")]), ["InputBox"]);
  assert.deepEqual(usedReferences([id("MsgBox"), sym("("), id("x")]), [
    "MsgBox",
  ]);
  assert.deepEqual(usedReferences([id("不明な名前")]), []);
  // 文字列リテラル内の同名は参照として数えない。
  assert.deepEqual(usedReferences([{ type: "string", v: "InputBox" }]), []);
});

test("P-N4: VBA ラッパーの後処理でトレースへ参照が付く", async () => {
  const code = Array.from(
    { length: 6 },
    (_, i) => `If InputBox("${i}") = "a" Then\nx = ${i}\nEnd If`,
  ).join("\n");
  const r = await run("vba", code);
  assert.ok(r.paths.length > 1);
  const withRefs = r.paths.flatMap((p) => p.trace).filter((t) => t.refs?.length);
  assert.ok(withRefs.length > 0, "refs が付いたトレース項目があること");
  assert.ok(
    withRefs.some((t) => t.refs.includes("InputBox")),
    "InputBox が使用関数として解決されること",
  );
});

test("副次: Worker 異常時の文言が「開始できません」ではない", () => {
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.ok(
    !app.includes("解析用Workerを開始できません"),
    "開始失敗と決めつける文言が残っています",
  );
  assert.ok(app.includes("解析用Workerでエラーが発生しました"));
});
