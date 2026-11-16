// 修正バッチ13（platform班）回帰テスト：R7-50／R7-56／R7-127〜R7-132／R7-134。
// js/app.js は Node で import できないため、既存テストと同方式で純関数を
// ソースから抽出して評価する。表示系（フォーカス・タブ競合・保存通知）は
// 実ブラウザ実測を報告書（findings-fix13-platform.md）に記録する。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getDefinition, definitions } from "../js/types/registry.js";
import { decodeFile, MAX_FILE_BYTES, MAX_CODE_LENGTH } from "../js/import.js";

const appSource = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const actionEditorSource = fs.readFileSync(
  new URL("../js/core/action-editor.js", import.meta.url),
  "utf8",
);
function extractFunctions(source, names) {
  const chunks = [];
  for (const name of names) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, name + " not found in js/app.js");
    let depth = 0,
      state = "code";
    let j = source.indexOf("{", start);
    for (; j < source.length; j++) {
      const c = source[j],
        next = source[j + 1];
      if (state === "code") {
        if (c === "'") state = "single";
        else if (c === '"') state = "double";
        else if (c === "`") state = "template";
        else if (c === "/" && next === "/") {
          state = "line";
          j++;
        } else if (c === "/" && next === "*") {
          state = "block";
          j++;
        } else if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      } else if (state === "single") {
        if (c === "\\") j++;
        else if (c === "'") state = "code";
      } else if (state === "double") {
        if (c === "\\") j++;
        else if (c === '"') state = "code";
      } else if (state === "template") {
        if (c === "\\") j++;
        else if (c === "`") state = "code";
      } else if (state === "line") {
        if (c === "\n") state = "code";
      } else if (state === "block") {
        if (c === "*" && next === "/") {
          state = "code";
          j++;
        }
      }
    }
    chunks.push(source.slice(start, j));
  }
  return chunks.join("\n");
}
const helpers = new Function(
  extractFunctions(appSource, [
    "isPlainRecord",
    "sanitizeDraftSnapshotFields",
    "sanitizeDrafts",
    "mergeActivePrevious",
    "finalErrorMessage",
  ]) +
    "\nreturn { isPlainRecord, sanitizeDraftSnapshotFields, sanitizeDrafts, mergeActivePrevious, finalErrorMessage };",
)();
const { sanitizeDrafts, mergeActivePrevious, finalErrorMessage } = helpers;

// ---- R7-50: 部分的に型が壊れた保存データの項目単位検証 ----
test("R7-50 sanitizeDrafts drops a non-string code but keeps the entry shell", () => {
  const { drafts, invalid } = sanitizeDrafts({
    vba: { code: { broken: true }, templateId: "cells" },
  });
  assert.equal(invalid, true);
  assert.equal(drafts.vba.code, undefined);
  assert.equal(drafts.vba.templateId, "cells");
});

test("R7-50 sanitizeDrafts drops a string entry instead of exploding it into numeric keys", () => {
  const { drafts, invalid } = sanitizeDrafts({ vba: "abc" });
  assert.equal(invalid, true);
  assert.deepEqual(drafts, {});
  assert.ok(!("0" in (drafts.vba || {})));
});

test("R7-50 sanitizeDrafts keeps valid drafts untouched and broken slots are dropped per-slot", () => {
  const good = {
    vba: {
      code: "Sub A()",
      byTemplate: { cells: { code: "A" }, if: { code: "B" } },
      freeDraft: { code: "F" },
    },
  };
  const ok = sanitizeDrafts(structuredClone(good));
  assert.equal(ok.invalid, false);
  assert.deepEqual(ok.drafts, good);
  const mixed = sanitizeDrafts({
    vba: {
      byTemplate: { cells: { code: { broken: true } }, if: { code: "B" } },
      freeDraft: { code: 42 },
    },
  });
  assert.equal(mixed.invalid, true);
  assert.equal(mixed.drafts.vba.byTemplate.cells, undefined);
  assert.equal(mixed.drafts.vba.byTemplate.if.code, "B");
  assert.equal(mixed.drafts.vba.freeDraft, undefined);
});

test("R7-50 startup routes v3/v2/v1 loads through sanitizeDrafts and backs up to recovery", () => {
  assert.ok(appSource.includes("sanitizeDrafts(saved.drafts)"));
  assert.ok(appSource.includes("sanitizeDrafts(migrated.drafts)"));
  assert.ok(appSource.includes('sanitizeDrafts({ vba: migrated.draft })'));
  assert.ok(appSource.includes('localStorage.setItem("programming-practice-recovery-v3", raw)'));
  assert.ok(appSource.includes('$("recoveryNotice").hidden = false'));
  assert.ok(htmlSource.includes('id="recoveryNotice"'));
});

// ---- R7-127: 他タブが同種の別スロットを更新済みの形 ----
test("R7-127 mergeActivePrevious keeps the other tab's newer slot that this tab did not touch", () => {
  // タブ2の起動時スナップショット（base）：A も B も古い値。
  const baseEntry = {
    code: "B_OLD",
    byTemplate: { cells: { code: "SLOT_A_OLD" }, if: { code: "B_OLD" } },
    freeDraft: { code: "F0" },
  };
  // タブ1が A を更新して保存した内容（stored）。
  const storedEntry = {
    code: "SLOT_A_NEW",
    byTemplate: { cells: { code: "SLOT_A_NEW" }, if: { code: "B_OLD" } },
    freeDraft: { code: "F0" },
  };
  // タブ2は A の古い写しを保持したまま B だけを編集した（mine）。
  const mineEntry = {
    code: "SLOT_B_NEW",
    byTemplate: { cells: { code: "SLOT_A_OLD" }, if: { code: "SLOT_B_NEW" } },
    freeDraft: { code: "F0" },
  };
  const merged = mergeActivePrevious(baseEntry, mineEntry, storedEntry);
  assert.equal(merged.byTemplate.cells.code, "SLOT_A_NEW", "他タブの新しい A が巻き戻らないこと");
  assert.equal(merged.byTemplate.if.code, "SLOT_B_NEW", "自タブが編集した B は自分の版");
});

test("R7-127 RG-86 shapes still hold after the per-slot merge rewrite", () => {
  const baseEntry = { byTemplate: { a: { code: "a0" } }, freeDraft: { code: "f0" } };
  const mineEntry = { byTemplate: { a: { code: "a1" } }, freeDraft: { code: "f0" } };
  const storedEntry = {
    byTemplate: { a: { code: "a0" }, b: { code: "bB" } },
    freeDraft: { code: "fB" },
  };
  const merged = mergeActivePrevious(baseEntry, mineEntry, storedEntry);
  assert.deepEqual(merged.byTemplate.a, { code: "a1" });
  assert.deepEqual(merged.byTemplate.b, { code: "bB" });
  assert.deepEqual(merged.freeDraft, { code: "fB" });
  const mineFree = { byTemplate: {}, freeDraft: { code: "f1" } };
  assert.deepEqual(mergeActivePrevious(baseEntry, mineFree, storedEntry).freeDraft, {
    code: "f1",
  });
  assert.deepEqual(mergeActivePrevious(baseEntry, mineEntry, null), mineEntry);
});

// ---- R7-130: 自アプリが保存した上限内コードの再取込み保証 ----
test("R7-130 a full-size app-saved file (BOM + 100000 chars, >300000 bytes) imports cleanly", () => {
  const text = "#" + "あ".repeat(99999);
  assert.equal(text.length, MAX_CODE_LENGTH);
  const buf = new TextEncoder().encode("\uFEFF" + text);
  assert.ok(buf.byteLength > 300000, "再現条件：従来の300000バイト上限を超えること");
  assert.ok(buf.byteLength <= MAX_FILE_BYTES);
  const r = decodeFile(buf.buffer, "a.txt", [".txt"]);
  assert.equal(r.text, text);
  // BOMなしの上限ちょうど（多バイト100000文字）も取り込める。
  const plain = new TextEncoder().encode("あ".repeat(100000));
  assert.equal(decodeFile(plain.buffer, "a.txt", [".txt"]).text.length, 100000);
});

test("R7-130 limits still reject oversize bytes and overlong text", () => {
  assert.throws(
    () => decodeFile(new Uint8Array(MAX_FILE_BYTES + 1).buffer, "a.txt", [".txt"]),
    /300KB以内/,
  );
  assert.throws(
    () => decodeFile(new TextEncoder().encode("a".repeat(100001)).buffer, "a.txt", [".txt"]),
    /100000文字以内/,
  );
  // app.js の事前チェックも同じ上限を共有する。
  assert.ok(appSource.includes("file.size > MAX_FILE_BYTES"));
});

// ---- R7-131: VT／FF を含む正当なソースの受理 ----
test("R7-131 form feed and vertical tab sources are accepted, other controls stay rejected", () => {
  assert.equal(
    decodeFile(new TextEncoder().encode("\x0Cprint(1)\n").buffer, "a.py", [".py"]).text,
    "\x0Cprint(1)\n",
  );
  assert.equal(
    decodeFile(new TextEncoder().encode("int a\x0B= 1;\n").buffer, "a.c", [".c"]).text,
    "int a\x0B= 1;\n",
  );
  for (const bad of ["a\x01b", "a\x07b", "a\x1Fb", "a\x7Fb"])
    assert.throws(
      () => decodeFile(new TextEncoder().encode(bad).buffer, "a.txt", [".txt"]),
      /バイナリファイルの可能性があるため/,
      JSON.stringify(bad),
    );
});

// ---- R7-128／R7-129: アクション欄の未反映保持・実行抑止・フォーカス復元（ソース固定） ----
test("R7-128 action editor keeps pending edits and app.js suppresses run while pending", () => {
  assert.ok(actionEditorSource.includes("pendingEdits"));
  assert.ok(actionEditorSource.includes('setAttribute("aria-invalid", "true")'));
  assert.ok(actionEditorSource.includes("hasPendingError"));
  assert.ok(actionEditorSource.includes("getPendingError"));
  const runStart = appSource.indexOf("function run()");
  const runBlock = appSource.slice(runStart, appSource.indexOf("function sortPaths()", runStart));
  assert.ok(runBlock.includes("hasPendingError"));
  assert.ok(runBlock.includes("未反映のため実行しませんでした"));
});

test("R7-129 action editor restores focus by stable key across renders", () => {
  assert.ok(actionEditorSource.includes("dataset.focusKey"));
  assert.ok(actionEditorSource.includes("restoreFocus"));
  assert.ok(actionEditorSource.includes("root.contains(ae)"));
});

// ---- R7-132: 保存失敗時の救出案内の限定明記 ----
test("R7-132 storage notice states the file rescue covers code only", () => {
  const m = htmlSource.match(/<p id="storageNotice"[\s\S]*?<\/p>/);
  assert.ok(m, "storageNotice が見つからない");
  assert.ok(m[0].includes("ファイルへ保存できるのはコードのみ"));
  assert.ok(m[0].includes("モデルなどの状態は保存できません"));
});

// ---- R7-134: モデル検証エラーのフッター分類 ----
test("R7-134 finalErrorMessage separates model errors from syntax errors", () => {
  assert.equal(
    finalErrorMessage({ category: "モデルエラー", message: "モデルfilesは配列で指定してください" }),
    "モデルの確認で停止しました。モデルを修正して再実行してください。実行結果はありません。",
  );
  assert.equal(
    finalErrorMessage({ category: "構文エラー", message: "x" }),
    "構文の確認で停止しました。実行結果はありません。",
  );
  assert.equal(
    finalErrorMessage({ message: "x" }),
    "構文の確認で停止しました。実行結果はありません。",
  );
  assert.ok(appSource.includes('$("final").textContent = finalErrorMessage(r.error);'));
});

test("R7-134 PowerShell model error keeps its category end to end", async () => {
  const d = getDefinition("powershell");
  const r = await d.simulate("Write-Output 1", { files: 0 });
  assert.equal(r.error.category, "モデルエラー");
  assert.match(
    finalErrorMessage(r.error),
    /モデルを修正して再実行してください/,
  );
});

// ---- R7-56: 用語集の未収載概念の追加 ----
test("R7-56 all previously missing glossary concepts are now listed", () => {
  const checks = [
    ["vba", "添字"],
    ["r", "添字"],
    ["c", "添字"],
    ["cpp", "添字"],
    ["imagej", "チャンネル"],
    ["powerautomate", "ループ"],
    ["autohotkey", "イベント"],
    ["uivision", "サンドボックス"],
    ["powerapps", "表示数式"],
    ["powerapps", "再計算"],
    ["python", "内包表記"],
    ["csharp", "例外"],
    ["javascript", "巻き上げ"],
    ["cmd", "サブルーチン"],
    ["powershell", "ハッシュテーブル"],
  ];
  for (const [id, word] of checks) {
    const entry = getDefinition(id).glossary.find((g) => g[0] === word);
    assert.ok(entry, `${id} に「${word}」がない`);
    assert.ok(entry[1].length >= 10, `${id}/${word} の定義が短すぎる`);
  }
  const total = definitions.reduce((n, d) => n + (d.glossary || []).length, 0);
  assert.equal(total, 139, "用語集総数（124 + 追加15箇所）");
});
