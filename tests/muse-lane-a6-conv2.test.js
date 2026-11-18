/* 収束判定ラウンド第2回・高度A6班（C＋Pythonコア）の回帰テスト。
 * CONV2-A6-01: ヌルポインタ値（モデルでは JS の null）と整数 0 の等価比較が
 *   実 C と逆の値を返していた。C11 6.3.2.3／6.5.9 では整数定数 0 はヌル
 *   ポインタ定数であり、ポインタとの等価比較ではポインタ型へ変換される
 *   ため NULL == 0 は真になる。従来は c-family の binary が baseBinary の
 *   JS 緩い等価（null == 0 → false）に委ねていた。A8班の観察
 *   （printf("%d", NULL == 0) が 0）を受けて本班が裁定し、共有核で是正した。
 * 期待値の一次情報：gcc 13.3.0（-std=c11、LC_ALL=C）実走。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { loadAdvanced } from "../js/core/advanced-loader.js";
import { mergeCatalog } from "../js/core/catalog.js";

const errText = (r) =>
  [r?.error, ...(r?.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => (typeof e === "string" ? e : e.message || String(e)))
    .join("\n");
const outText = (r) => (r?.paths?.[0]?.outputs || []).map((o) => o.text).join("");
const C = (body) =>
  `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\nint main() {\n${body}\n return 0;\n}`;

// 高度を有効化する前に、簡易モード（基礎エンジン）でも是正が効くことを固定する
const cPlain = getDefinition("c");
const runPlain = (code) => cPlain.simulate(C(code), structuredClone(cPlain.model.defaults));

test("CONV2-A6-01: 簡易モードでも NULL == 0 は真（実 C と一致）", async () => {
  const eq = await runPlain('printf("%d", NULL == 0);');
  assert.equal(errText(eq), "");
  assert.equal(outText(eq), "1");
  const ne = await runPlain('printf("%d", NULL != 0);');
  assert.equal(outText(ne), "0");
  const v = await runPlain('int *p = NULL; printf("%d%d", p == 0, 0 == p);');
  assert.equal(outText(v), "11");
});

// js/worker.js の activateAdvanced と同一手順で高度モードを有効化する
async function activate(id) {
  const def = getDefinition(id);
  const loaded = await loadAdvanced(def);
  assert.ok(loaded && !(loaded.failed && loaded.failed.length), id);
  const merged = mergeCatalog(
    { reference: def.reference, templates: def.templates, glossary: def.glossary || [] },
    loaded,
  );
  def.__catalogReference = merged.reference;
  const em = loaded.engineModule;
  if (em && typeof em.applyAdvancedEngine === "function") {
    const hooked = em.applyAdvancedEngine(def, merged);
    if (hooked && hooked !== def) {
      if (typeof hooked.scan === "function") def.scan = hooked.scan;
      if (typeof hooked.simulate === "function") def.simulate = hooked.simulate;
    }
  }
  return def;
}
const cdef = await activate("c");
const runC = (code) => cdef.simulate(C(code), structuredClone(cdef.model.defaults));

test("CONV2-A6-01: ヌルポインタと整数の等価比較（関数戻り値・失敗時 NULL を含む）", async () => {
  // 関数が返したヌルポインタと 0 の比較（従来は 0 を返していた）
  const fn = await runC('printf("%d", strchr("abc", \'x\') == 0);');
  assert.equal(errText(fn), "");
  assert.equal(outText(fn), "1");
  // 確保失敗で返る NULL と 0 の比較（要素数上限超過は NULL を返す裁定）
  const fail = await runC('int *p = calloc(20000000, sizeof(int)); printf("%d", p == 0);');
  assert.equal(outText(fail), "1");
  // 0 以外の数値とは等しくならない
  const one = await runC('printf("%d%d", NULL == 1, NULL != 1);');
  assert.equal(outText(one), "01");
  // 文字定数 '\0'（整数 0）とも等しい
  const nul = await runC('printf("%d", NULL == \'\\0\');');
  assert.equal(outText(nul), "1");
});

test("CONV2-A6-01: 従来どおりの表面は変えない（NULL 同士・実ポインタ・関係演算・真理値）", async () => {
  const nn = await runC('int *p = NULL; printf("%d%d", p == NULL, NULL == NULL);');
  assert.equal(outText(nn), "11");
  // 実ポインタは 0 と決して等しくない（CF-02 の経路）
  const real = await runC('int x = 5; int *p = &x; printf("%d%d", p == 0, p != 0);');
  assert.equal(outText(real), "01");
  // 関係演算・真理値は従来どおり（null は 0 として扱われる）
  const rel = await runC('printf("%d%d", NULL < 1, NULL <= 0);');
  assert.equal(outText(rel), "11");
  const truth = await runC('if (NULL) printf("T"); else printf("F"); printf("%d", !NULL);');
  assert.equal(outText(truth), "F1");
});

test("CONV2-A6-01: 共有核の是正は C++ の nullptr にも効く", async () => {
  const cpp = await activate("cpp");
  const runCpp = (code) =>
    cpp.simulate(
      `#include <cstdio>\n#include <cstdlib>\nint main() {\n${code}\n return 0;\n}`,
      structuredClone(cpp.model.defaults),
    );
  const r = await runCpp('printf("%d%d", nullptr == 0, nullptr != 0);');
  assert.equal(errText(r), "");
  assert.equal(outText(r), "10");
  const v = await runCpp('int *p = nullptr; printf("%d", p == 0);');
  assert.equal(outText(v), "1");
});
