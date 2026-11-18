/* 統合第5弾（修正バッチ18）の統合是正の回帰テスト。
 *
 * 同根スイープ（収束ラウンドA6班の申し送り→親裁定で統合時に処置）:
 * 基礎 Python のモジュール概説項目 random／json／datetime は、index.js が
 * 一律に「このアプリのシミュレーションでは未対応として停止する。」を追記
 * していたが、高度モードでは標準ライブラリ実装（ブロックB7）により読み込み・
 * 主な機能が実行できるため、追記が高度モードの実挙動と矛盾していた
 * （CONV-A6-01 と同根）。分類（supported=false・参照専用）は残置し、追記を
 * モード別の実態を併記する文面へ差し替えた。
 * 実測の根拠（統合ツリー）:
 *   簡易モード: 3項目とも例が「未対応：このモジュールの読み込みは未対応です」
 *   で停止する。高度モード: random の例は seed 固定で期待値 "b"、json の例は
 *   期待値の JSON 文字列、datetime の例は "2024-02-29" を出力する。
 *   対照の open／os は両モードとも停止するため従来の追記を維持する。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { getDefinition } from "../js/types/registry.js";

const def = getDefinition("python");
const run = (code) => def.simulate(code, structuredClone(def.model.defaults));
const errText = (r) =>
  [r?.error, ...(r?.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => (typeof e === "string" ? e : e.message || String(e)))
    .join("\n");
const outText = (r) => (r?.paths?.[0]?.outputs || []).map((o) => o.text).join("");

const SWEEP = ["random", "json", "datetime"];
const NEW_NOTE =
  "この項目は未対応分類の参照専用として残している。簡易モードではモジュールの読み込み自体が未対応として停止するが、高度モードでは読み込みや主な機能を実行できる。";

test("同根スイープ: random／json／datetime の追記はモード別の実態を併記し、分類は残置される", () => {
  for (const nm of SWEEP) {
    const it = def.reference.find((i) => i.name === nm);
    assert.ok(it, nm + " 項目がある");
    assert.equal(it.supported, false, nm + " の参照専用分類は残置");
    assert.ok(it.caution.endsWith(NEW_NOTE), nm + ": " + it.caution);
    assert.ok(
      !it.caution.includes("このアプリのシミュレーションでは未対応として停止する。"),
      nm + " に無条件の停止主張が残らない",
    );
    assert.ok(it.caution.includes("未対応"), nm + " は未対応を含む（R29-N4 在庫不変条件）");
    assert.ok(!it.caution.includes("未確認"), nm + " は未確認を含まない");
  }
  // 対照: 両モードで実際に停止する項目の追記は維持される（外しすぎの防止）
  for (const nm of ["open", "os", "numpy.array", "pandas.DataFrame"]) {
    const it = def.reference.find((i) => i.name === nm);
    assert.ok(
      it.caution.includes("このアプリのシミュレーションでは未対応として停止する。"),
      nm + ": " + it.caution,
    );
  }
});

test("同根スイープ: 簡易モードでは3項目の例はモジュール読み込みで名指し停止する", async () => {
  for (const nm of SWEEP) {
    const it = def.reference.find((i) => i.name === nm);
    const r = await run(it.example);
    assert.equal(outText(r), "", nm + " は簡易で出力しない");
    assert.ok(
      errText(r).includes("未対応：このモジュールの読み込みは未対応です"),
      nm + " -> " + errText(r),
    );
  }
});

test("同根スイープ: 高度モードでは3項目の例が期待値どおり実行できる", () => {
  // 高度エンジンの登録は import 副作用でプロセス全域に効くため、子プロセスで測る。
  const root = new URL("../", import.meta.url).href;
  const script = `
    const { getDefinition } = await import(${JSON.stringify(root + "js/types/registry.js")});
    await import(${JSON.stringify(root + "js/types/python/advanced-engine.js")});
    const def = getDefinition("python");
    const out = {};
    for (const nm of ["random", "json", "datetime"]) {
      const it = def.reference.find((i) => i.name === nm);
      const r = await def.simulate(it.example, structuredClone(def.model.defaults));
      out[nm] = {
        out: (r?.paths?.[0]?.outputs || []).map((o) => o.text).join(""),
        err: [r?.error, ...(r?.paths || []).map((p) => p.error)].filter(Boolean).map((e) => (typeof e === "string" ? e : e.message || String(e))).join("\\n"),
        expected: it.expected,
      };
    }
    console.log(JSON.stringify(out));
  `;
  const stdout = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    { encoding: "utf8", timeout: 120000 },
  );
  const res = JSON.parse(stdout.trim().split("\n").at(-1));
  for (const nm of SWEEP) {
    assert.equal(res[nm].err, "", nm + " は高度でエラーなし");
    assert.equal(res[nm].out, res[nm].expected, nm + " の例が期待値どおり");
  }
});
