/* 収束判定ラウンド・高度A6班（C＋Pythonコア）の回帰テスト。
 * CONV-A6-01: 基礎 str.format 項目への「未対応として停止する」追記（js/types/python/index.js）
 *   が実挙動と矛盾していた（ブロックB6で単一エンジンに実装され、簡易モードでも
 *   実行できる。修正バッチ8の裁定どおり参照専用分類自体は残すが、停止の主張は外す）。
 * CONV-A6-02: 基礎 with 項目の文面が、プロトコル実装前の部分モデル
 *   （__enter__／__exit__ を再現しない・as 変数は未確定値）のまま残っていた。
 *   実測（W1〜W4）に基づき文面を実挙動へ合わせる。
 * 期待値の一次情報：CPython 3.12.3 実走（with の例外伝播・抑制、str.format の IndexError）。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const def = getDefinition("python");
const run = (code) => def.simulate(code, structuredClone(def.model.defaults));
const errText = (r) =>
  [r?.error, ...(r?.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => (typeof e === "string" ? e : e.message || String(e)))
    .join("\n");
const outText = (r) => (r?.paths?.[0]?.outputs || []).map((o) => o.text).join("");

test("CONV-A6-01: str.format 基礎項目は停止を主張せず、例が簡易モードで実行できる", async () => {
  const it = def.reference.find((i) => i.name === "str.format");
  assert.ok(it, "str.format 項目がある");
  assert.ok(
    !it.caution.includes("未対応として停止する"),
    "caution が実挙動に反する停止を主張しない: " + it.caution,
  );
  const r = await run(it.example);
  assert.equal(errText(r), "");
  assert.equal(outText(r), "2 + 3 = 5");
  // 引数不足は IndexError（caution の残りの記述も実挙動と一致する）
  const short = await run('print("{} {}".format(1))');
  assert.ok(errText(short).includes("IndexError"), errText(short));
  // 他の参照専用項目（open）への追記は維持される（外しすぎの防止）
  const open = def.reference.find((i) => i.name === "open");
  assert.ok(open.caution.includes("未対応として停止する"), open.caution);
});

test("CONV-A6-02: with は __enter__ の戻り値を as 変数へ入れ、文面もそれと一致する", async () => {
  const it = def.reference.find((i) => i.name === "with");
  assert.ok(it, "with 項目がある");
  assert.ok(!it.description.includes("後始末そのものは再現しない"), it.description);
  assert.ok(it.caution.includes("__exit__ が True を返すと"), it.caution);
  // W1: __enter__ の戻り値が as 変数に入る
  const w1 = await run(
    "class C:\n    def __enter__(self):\n        return 42\n    def __exit__(self, *a):\n        return False\nwith C() as c:\n    print(c)",
  );
  assert.equal(errText(w1), "");
  assert.equal(outText(w1), "42");
  // W2: 本文の例外で __exit__ が呼ばれ、False なら伝播する
  const w2 = await run(
    'class C:\n    def __enter__(self):\n        return self\n    def __exit__(self, *a):\n        print("exit呼ばれた")\n        return False\nwith C():\n    raise ValueError("x")',
  );
  assert.equal(outText(w2), "exit呼ばれた");
  assert.ok(errText(w2).includes("ValueError"), errText(w2));
  // W3: __exit__ が True を返すと例外は抑えられる
  const w3 = await run(
    'class C:\n    def __enter__(self):\n        return self\n    def __exit__(self, *a):\n        return True\nwith C():\n    raise ValueError("x")\nprint("到達")',
  );
  assert.equal(errText(w3), "");
  assert.equal(outText(w3), "到達");
  // W4: プロトコルを持たない対象は従来の部分モデル（未確定値・停止しない）
  const w4 = await run("with 5 as c:\n    print(c)");
  assert.equal(errText(w4), "");
  assert.ok(outText(w4).includes("実行時に決まる"), outText(w4));
});
