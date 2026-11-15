import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { definitions, getDefinition } from "../js/types/registry.js";

// 修正バッチ2（日本語表記統一班）: findings-jpcheck の J-N1 / Y-1〜Y-5 の回帰テスト。
// 対象は利用者向け文面（レジストリ経由で表示される定義データ＋主要な UI 文字列）。
// コード識別子・URL・出典文字列、開発者向けコメントは対象外（コメント内の旧表記は残置が正）。

const REF_FIELDS = ["description", "summary", "args", "returns", "caution", "pitfalls", "category"];
function* userFacingFields() {
  for (const d of definitions) {
    for (const r of d.reference || [])
      for (const k of REF_FIELDS)
        if (typeof r[k] === "string") yield [`${d.id}:${r.name || r.id}.${k}`, r[k]];
    for (const t of d.templates || [])
      for (const k of ["title", "intro", "explain"])
        if (typeof t[k] === "string") yield [`${d.id}:tpl:${t.id}.${k}`, t[k]];
    for (const g of d.glossary || [])
      if (Array.isArray(g)) {
        yield [`${d.id}:gloss:${g[0]}.term`, String(g[0])];
        yield [`${d.id}:gloss:${g[0]}.def`, String(g[1])];
      }
    if (d.semantics)
      for (const k of ["description", "support"])
        if (typeof d.semantics[k] === "string") yield [`${d.id}:semantics.${k}`, d.semantics[k]];
    if (d.model)
      for (const k of ["title", "hint"])
        if (typeof d.model[k] === "string") yield [`${d.id}:model.${k}`, d.model[k]];
  }
}
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

// ---- J-N1: 「64ビットビット演算」は「64ビットのビット演算」に処置済み ----
test("J-N1 no field keeps the ambiguous '64ビットビット演算'", () => {
  for (const [where, text] of userFacingFields())
    assert.ok(!text.includes("64ビットビット演算"), where);
  const ahk = getDefinition("autohotkey");
  assert.ok(ahk.semantics.support.includes("64ビットのビット演算"));
});

// ---- Y-1: 長音の長形（フォルダー等）は短形へ統一 ----
const LONG_FORMS = ["フォルダー", "カウンター", "サーバー", "ユーザー", "パラメーター"];
test("Y-1 definition fields use short katakana forms only", () => {
  for (const [where, text] of userFacingFields())
    for (const w of LONG_FORMS) assert.ok(!text.includes(w), `${where} contains ${w}`);
});
test("Y-1 files whose occurrences were all user-facing strings are clean", () => {
  const checks = [
    ["../js/content.js", ["フォルダー", "カウンター", "ユーザー"]],
    ["../js/engine.js", ["フォルダー"]],
    ["../js/types/cloudformation/index.js", ["パラメーター"]],
    ["../js/types/cloudformation/reference-details.js", ["パラメーター"]],
    ["../js/types/powershell/engine.js", ["パラメーター"]],
    ["../js/types/powershell/index.js", ["パラメーター", "ユーザー"]],
    ["../js/types/r/index.js", ["ユーザー"]],
    ["../js/types/autohotkey/index.js", ["ユーザー"]],
    ["../js/types/imagej/reference-data.js", ["ユーザー"]],
    ["../js/types/python/reference.js", ["ユーザー"]],
    ["../js/types/powerapps/index.js", ["サーバー"]],
  ];
  for (const [rel, words] of checks) {
    const src = read(rel);
    for (const w of words) assert.ok(!src.includes(w), `${rel} contains ${w}`);
  }
  // PowerShell のエラーメッセージ（利用者向け文字列）は短形になっている
  const parser = read("../js/types/powershell/parser.js");
  assert.ok(parser.includes("パラメータが重複しています"));
  assert.ok(parser.includes("未対応のパラメータ："));
  // C/C++ の停止理由（利用者向け文字列）も短形
  assert.ok(read("../js/core/c-family.js").includes("ユーザ定義関数"));
});

// ---- Y-2: 「返り値」は「戻り値」へ統一 ----
test("Y-2 no '返り値' remains in definition fields or app sources", () => {
  for (const [where, text] of userFacingFields())
    assert.ok(!text.includes("返り値"), where);
  const vba = getDefinition("vba");
  const msgbox = vba.reference.find((r) => r.name === "MsgBox");
  assert.ok(msgbox.caution.includes("押したボタンの戻り値は扱いません"));
});

// ---- Y-3: 範囲チルダは波ダッシュ U+301C へ統一（全角チルダ U+FF5E の残置なし） ----
test("Y-3 no fullwidth tilde U+FF5E in fields, sources or index.html", () => {
  for (const [where, text] of userFacingFields())
    assert.ok(!text.includes("～"), where);
  for (const rel of [
    "../js/content.js",
    "../js/engine.js",
    "../js/core/c-family.js",
    "../js/app.js",
    "../index.html",
  ])
    assert.ok(!read(rel).includes("～"), rel);
  const vba = getDefinition("vba");
  assert.ok(vba.reference.find((r) => r.name === "Long").caution.includes("-2147483648〜2147483647"));
  assert.ok(read("../index.html").includes("到達可能な0〜2回の経路"));
});

// ---- Y-4: 句点直後の半角スペースと、フィールド先頭の半角スペースを除去 ----
test("Y-4 no '。 ' sequence and no leading space in any user-facing field", () => {
  for (const [where, text] of userFacingFields()) {
    assert.ok(!text.includes("。 "), where);
    assert.ok(!/^ /.test(text), where);
    assert.ok(!text.includes("。。"), where);
  }
  const imagej = getDefinition("imagej");
  // 追記テンプレート由来の caution は、note が空なら文そのものが caution になる
  assert.equal(
    imagej.reference.find((r) => r.name === "Roi.translate").caution,
    "このアプリでは未確認として停止する。",
  );
  const python = getDefinition("python");
  assert.ok(
    python.reference.find((r) => r.name === "open").caution.endsWith("未対応として停止する。"),
  );
  const ahk = getDefinition("autohotkey");
  assert.ok(
    ahk.reference
      .find((r) => r.name === "Hotstring")
      .caution.includes("未対応です。モデルeventを::btw"),
  );
});

// ---- Y-5: caution の文体は種類内の多数派（= description の文体）へ統一 ----
const MAJORITY = {
  vba: "polite",
  imagej: "plain",
  cloudformation: "plain",
  powerautomate: "polite",
  autohotkey: "polite",
  uivision: "polite",
  powerapps: "polite",
  python: "plain",
  r: "polite",
  c: "polite",
  cpp: "polite",
  csharp: "polite",
  javascript: "polite",
  cmd: "polite",
  powershell: "polite",
};
const POLITE_END = /(です|ます|ました|ません|ください|でしょう|でした|ましょう|ませんでした)$/;
function sentences(t) {
  return t.split(/(?<=。)(?![）)」』])/).map((s) => s.trim()).filter(Boolean);
}
function sentenceStyle(s) {
  let core = s.replace(/。$/, "").trim();
  for (let i = 0; i < 3; i++) {
    const m = core.match(/（[^（）]*）$/);
    if (m) core = core.slice(0, m.index).trim();
    else break;
  }
  core = core.replace(/[）)」』]$/, "");
  if (!core) return "empty";
  return POLITE_END.test(core) ? "polite" : "plain";
}
test("Y-5 every caution sentence follows its type's majority style", () => {
  for (const d of definitions) {
    const maj = MAJORITY[d.id];
    assert.ok(maj, `majority style not defined for ${d.id}`);
    for (const r of d.reference || []) {
      if (!r.caution) continue;
      for (const s of sentences(r.caution)) {
        const st = sentenceStyle(s);
        assert.ok(
          st === "empty" || st === maj,
          `${d.id}:${r.name || r.id} caution sentence is ${st}, expected ${maj}: ${s}`,
        );
      }
    }
  }
});
test("Y-5 plain-style types keep no polite token anywhere in cautions", () => {
  for (const d of definitions) {
    if (MAJORITY[d.id] !== "plain") continue;
    for (const r of d.reference || [])
      if (r.caution)
        assert.ok(!/(です|ます)/.test(r.caution), `${d.id}:${r.name || r.id}`);
  }
});
test("Y-5 spot checks on converted cautions", () => {
  const imagej = getDefinition("imagej");
  assert.ok(
    imagej.reference
      .find((r) => r.name === "Math.sinh")
      .caution.startsWith("実物の ImageJ マクロ言語には Math.sinh は存在しない。"),
  );
  const python = getDefinition("python");
  assert.ok(python.reference.find((r) => r.name === "with").caution.includes("部分対応である"));
  const cf = getDefinition("cloudformation");
  assert.ok(
    cf.reference.find((r) => r.name === "Transform").caution ===
      "実AWSのマクロ定義はモデルのmacrosと別である。",
  );
  const cmd = getDefinition("cmd");
  assert.ok(
    cmd.reference
      .find((r) => r.name === "echo")
      .caution.startsWith("バッチ・コマンド拡張有効の部分モデルです。"),
  );
});
