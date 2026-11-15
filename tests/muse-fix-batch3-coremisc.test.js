import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../js/engine.js";
import { definition as cmd } from "../js/types/cmd/index.js";
import { definition as fx } from "../js/types/powerapps/index.js";

// ============ バッチ3・基盤／その他班 ============
// 1. P-N3 再裁定：ホスト例外漏出経路の根治（VBA 独立エンジン／cmd／Power Apps）
// 2. cmd 読み取り経路のデバイス規律（NUL は空の成功、CON 等は名指し停止）
// 3. R24-N35：Power Apps の Blank 文字列化は空文字列

const HOST_TEXT =
  /Cannot read properties|Do not know how to serialize|Converting circular structure|could not be cloned|host boom|Maximum call stack/i;

// ---------- 1a. VBA（js/engine.js）: ホスト例外が投げ返されず、生文言も漏れない ----------
test("batch3 P-N3 VBA: null source returns a Japanese generic error, not host text", () => {
  const r = simulate(null, {});
  assert.ok(r.error, "expected a top-level error result");
  assert.match(r.error.message, /予期しないエラー/);
  assert.doesNotMatch(r.error.message, HOST_TEXT);
  assert.deepEqual(r.paths, []);
});

test("batch3 P-N3 VBA: crafted model values (BigInt / circular / function) never throw host exceptions", () => {
  const circ = {};
  circ.self = circ;
  for (const model of [{ A1: 10n }, { A1: circ }, { A1: () => 1 }]) {
    let r;
    assert.doesNotThrow(() => {
      r = simulate("Sub Main()\nEnd Sub", model);
    });
    assert.ok(r.error, "expected a top-level error result");
    assert.match(r.error.message, /予期しないエラー/);
    assert.doesNotMatch(JSON.stringify(r), HOST_TEXT);
  }
});

test("batch3 P-N3 VBA: legitimate VBA errors and normal runs are unchanged", () => {
  const ok = simulate(
    "Sub Main()\n Dim x As Long\n x = 6 / 2\n Debug.Print x\nEnd Sub",
    {},
  );
  assert.equal(ok.error, undefined);
  assert.deepEqual(
    ok.paths[0].outputs.map((o) => o.text),
    ["3"],
  );
  const dz = simulate("Sub Main()\n Dim x As Long\n x = 1 / 0\nEnd Sub", {});
  assert.equal(dz.paths[0].error.code, 11);
  assert.match(dz.paths[0].error.message, /0 で除算しました/);
});

// ---------- 1b. cmd: 実行境界のホスト例外は汎用日本語文言になる ----------
test("batch3 P-N3 cmd: host exception from a crafted model is converted, raw text never leaks", () => {
  const model = { ...structuredClone(cmd.model.defaults) };
  Object.defineProperty(model, "files", {
    get() {
      throw new TypeError("host boom XYZ-987");
    },
  });
  const r = cmd.simulate("dir /b", model);
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err, "expected an error result");
  assert.doesNotMatch(JSON.stringify(r), HOST_TEXT);
  assert.match(err.message, /予期しないエラー|参照できません/);
});

// ---------- 1c. Power Apps: 解析・境界のホスト例外は学習者向け文言になる ----------
test("batch3 P-N3 powerapps: null code is converted, raw host text never leaks", async () => {
  const r = await fx.simulate(null, structuredClone(fx.model.defaults), {});
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err, "expected an error result");
  assert.doesNotMatch(JSON.stringify(r), HOST_TEXT);
});

// ---------- 2. cmd 読み取り経路のデバイス規律 ----------
const runCmd = (code, extra = {}) =>
  cmd.simulate(code, { ...structuredClone(cmd.model.defaults), ...extra });
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
const outCmd = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const fileNames = (r) =>
  r.paths.map((p) => p.model.files.map((f) => f.path.split("\\").at(-1)));
const errorlevel = (r) =>
  r.paths.map(
    (p) =>
      p.groups
        .find((g) => g.title === "バッチの終了状態")
        .entries.find(([k]) => k === "ERRORLEVEL")[1],
  );

test("batch3 cmd-device type nul is an empty success (incl. extension / folder forms)", () => {
  for (const code of ["type nul", "type NUL", "type nul.txt", "type logs\\nul"]) {
    const r = runCmd(code);
    assert.deepEqual(errors(r), [], code);
    assert.deepEqual(outCmd(r), [[]], code);
    assert.deepEqual(errorlevel(r), ["0"], code);
    assert.ok(!fileNames(r)[0].includes("nul"), code);
  }
});

test("batch3 cmd-device type of input devices stops naming the device", () => {
  for (const [code, name] of [
    ["type con", "CON"],
    ["type conin$", "CONIN$"],
    ["type aux", "AUX"],
    ["type prn", "PRN"],
    ["type lpt1", "LPT1"],
  ]) {
    const r = runCmd(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, new RegExp("予約デバイス名 " + name.replace("$", "\\$")), code);
    assert.doesNotMatch(errors(r)[0].message, /モデルにファイルがありません/, code);
  }
});

test("batch3 cmd-device type of a normal file still works, missing file still errors as before", () => {
  const ok = runCmd("type notes.txt");
  assert.deepEqual(errors(ok), []);
  assert.ok(outCmd(ok)[0].some((t) => t.includes("学習メモ")));
  const missing = runCmd("type missing.txt");
  assert.equal(errors(missing).length, 1);
  assert.match(errors(missing)[0].message, /モデルにファイルがありません/);
});

test("batch3 cmd-device copy nul creates an empty file (classic empty-file form)", () => {
  const r = runCmd("copy nul empty.txt");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(errorlevel(r), ["0"]);
  const f = r.paths[0].model.files.find((x) => x.path.endsWith("empty.txt"));
  assert.ok(f, "empty.txt must be created");
  assert.equal(f.content, "");
  const nested = runCmd("copy nul logs\\made.txt");
  assert.deepEqual(errors(nested), []);
  assert.ok(
    nested.paths[0].model.files.some((x) => x.path.endsWith("logs\\made.txt")),
  );
});

test("batch3 cmd-device copy nul respects the overwrite discipline and device destinations", () => {
  // 既存ファイルへの上書きは通常 copy と同じく /y 明示が必要（未確認で停止）。
  const noFlag = runCmd("copy nul notes.txt");
  assert.equal(errors(noFlag).length, 1);
  assert.match(errors(noFlag)[0].message, /上書きには明示した強制オプション/);
  const flagged = runCmd("copy /y nul notes.txt");
  assert.deepEqual(errors(flagged), []);
  assert.equal(
    flagged.paths[0].model.files.find((x) => x.path.endsWith("notes.txt"))
      .content,
    "",
  );
  // 書き込み先デバイスの規律（バッチ2是正）と矛盾しない：NUL 宛は破棄、
  // PRN 等は名前を挙げて停止する。
  const toNul = runCmd("copy nul nul");
  assert.deepEqual(errors(toNul), []);
  assert.ok(!fileNames(toNul)[0].includes("nul"));
  const toPrn = runCmd("copy nul prn");
  assert.equal(errors(toPrn).length, 1);
  assert.match(errors(toPrn)[0].message, /予約デバイス名 PRN/);
});

test("batch3 cmd-device copy/move from CON still stops naming it; move from NUL also stops (rename semantics)", () => {
  for (const code of ["copy con out.txt", "move con out.txt", "move nul out.txt"]) {
    const r = runCmd(code);
    assert.equal(errors(r).length, 1, code);
    assert.match(errors(r)[0].message, /予約デバイス名/, code);
    assert.ok(!fileNames(r)[0].includes("out.txt"), code);
  }
});

test("batch3 cmd-device find reads NUL as empty input and stops naming CON", () => {
  const nul = runCmd('find "メモ" nul');
  assert.deepEqual(errors(nul), []);
  assert.deepEqual(outCmd(nul), [[]]);
  assert.deepEqual(errorlevel(nul), ["1"]);
  const con = runCmd('find "メモ" con');
  assert.equal(errors(con).length, 1);
  assert.match(errors(con)[0].message, /予約デバイス名 CON/);
  const file = runCmd('find "メモ" notes.txt');
  assert.deepEqual(errors(file), []);
  assert.ok(outCmd(file)[0].some((t) => t.includes("学習メモ")));
});

test("batch3 cmd-device type nul redirected creates the classic empty file", () => {
  const r = runCmd("type nul > created.txt");
  assert.deepEqual(errors(r), []);
  const f = r.paths[0].model.files.find((x) => x.path.endsWith("created.txt"));
  assert.ok(f);
  assert.equal(f.content, "");
});

// ---------- 3. R24-N35 Power Apps: Blank の文字列化 ----------
const runFx = async (code) =>
  fx.simulate(code, structuredClone(fx.model.defaults), {});
const fxFirst = async (code) => {
  const r = await runFx(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const fxOutputs = (p) => p.outputs.map((o) => o.text);

test("batch3 R24-N35 Notify(Blank()) shows an empty message, not \"null\"", async () => {
  const p = await fxFirst('Notify(Blank()); Notify("after")');
  assert.deepEqual(fxOutputs(p), ["", "after"]);
});

test("batch3 R24-N35 Blank reached through variables / LookUp also stringifies to empty", async () => {
  assert.deepEqual(fxOutputs(await fxFirst("Set(x, Blank()); Notify(x)")), [""]);
  assert.deepEqual(
    fxOutputs(await fxFirst("Notify(LookUp(Table({v:1}), v>9))")),
    [""],
  );
});

test("batch3 R24-N35 trace notes for Set / Switch do not leak \"null\" for Blank", async () => {
  const set = await fxFirst("Set(x, Blank())");
  assert.ok(set.trace.every((t) => !/(^| )null( |$)/.test(t.text)), JSON.stringify(set.trace));
  assert.ok(set.trace.some((t) => t.text.includes("x に  を設定し")));
  const sw = await fxFirst('Switch(Blank(), 1, "one", "other")');
  assert.ok(sw.trace.every((t) => !t.text.includes("null")), JSON.stringify(sw.trace));
});

test("batch3 R24-N35 concatenation and Text() keep Blank as empty (already-correct surfaces pinned)", async () => {
  assert.deepEqual(fxOutputs(await fxFirst('Notify("a" & Blank() & "b")')), ["ab"]);
  assert.deepEqual(fxOutputs(await fxFirst("Notify(Text(Blank()))")), [""]);
  assert.deepEqual(fxOutputs(await fxFirst('Notify(Text(Blank(), "0.00"))')), [""]);
});

test("batch3 R24-N35 non-Blank Notify values are unchanged", async () => {
  assert.deepEqual(fxOutputs(await fxFirst('Notify(5); Notify(true); Notify("x")')), [
    "5",
    "true",
    "x",
  ]);
});
