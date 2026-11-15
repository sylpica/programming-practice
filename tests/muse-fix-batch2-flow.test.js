import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ2・フロー系班（Power Apps／Power Automate／UI.Vision／
// CloudFormation）の回帰テスト。
// 出典: findings-narrcheck.md §3（NX-N3/N4/N15/N16/N24/N25/N26）、
// findings-msgcheck.md（M-N6）。

const clone = (x) => structuredClone(x);
async function runWith(id, code, mutate) {
  const d = getDefinition(id);
  const model = clone(d.model.defaults);
  if (mutate) mutate(model);
  const r = await d.simulate(code, model);
  return r;
}
async function firstWith(id, code, mutate) {
  const r = await runWith(id, code, mutate);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0];
}
const texts = (p) => p.trace.map((t) => t.text);
const groupEntry = (p, title, key) => {
  const g = p.groups.find((x) => x.title === title);
  assert.ok(g, "group not found: " + title);
  const e = g.entries.find(([k]) => k === key);
  assert.ok(e, "entry not found: " + key);
  return e[1];
};

/* ---------------- Power Apps: NX-N3 / NX-N4 / NX-N15 と同根表面 -------- */

// NX-N3: Set が大小だけ違う既存変数を同一変数として更新する
test("NX-N3 Set(X) overwrites existing variable x case-insensitively", async () => {
  const p = await firstWith("powerapps", "Set(X, 5); Notify(Text(X))", (m) => {
    m.variables = { x: 9 };
  });
  assert.deepEqual(p.outputs.map((o) => o.text), ["5"]);
  assert.deepEqual(Object.keys(p.model.variables), ["x"]);
  assert.equal(p.model.variables.x, 5);
  assert.ok(texts(p).some((t) => /に 5 を設定/.test(t)));
});

// NX-N3 兄弟表面: 同一実行内の繰り返し Set でも別エントリを作らない
test("NX-N3 repeated Set with different casing keeps a single variable", async () => {
  const p = await firstWith(
    "powerapps",
    "Set(Count, 1); Set(COUNT, 2); Notify(Text(count))",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["2"]);
  assert.deepEqual(Object.keys(p.model.variables), ["Count"]);
  assert.equal(p.model.variables.Count, 2);
});

// NX-N4: ClearCollect が大小だけ違う既存コレクションを置き換える
test("NX-N4 ClearCollect(Items) replaces existing collection items", async () => {
  const p = await firstWith(
    "powerapps",
    "ClearCollect(Items, {Value: 99}); Notify(Text(CountRows(Items)))",
    (m) => {
      m.collections = { items: [{ Value: 1 }, { Value: 2 }, { Value: 3 }] };
    },
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["1"]);
  assert.deepEqual(Object.keys(p.model.collections), ["items"]);
  assert.deepEqual(p.model.collections.items, [{ Value: 99 }]);
  assert.ok(texts(p).some((t) => /レコード数は 1 です/.test(t)));
});

// NX-N4 兄弟表面（所見原文が同型と明記）: Collect も既存キーへ追記する
test("NX-N4 sibling: Collect appends to the differently-cased collection", async () => {
  const p = await firstWith(
    "powerapps",
    "Collect(Items, {Value: 99}); Notify(Text(CountRows(items)))",
    (m) => {
      m.collections = { items: [{ Value: 1 }, { Value: 2 }, { Value: 3 }] };
    },
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["4"]);
  assert.deepEqual(Object.keys(p.model.collections), ["items"]);
  assert.equal(p.model.collections.items.length, 4);
});

// NX-N4 兄弟表面: Clear も大小不区別に既存コレクションを消去する
test("NX-N4 sibling: Clear(ITEMS) empties the existing collection", async () => {
  const p = await firstWith(
    "powerapps",
    "Clear(ITEMS); Notify(Text(CountRows(items)))",
    (m) => {
      m.collections = { items: [{ Value: 1 }] };
    },
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["0"]);
  assert.deepEqual(Object.keys(p.model.collections), ["items"]);
  assert.deepEqual(p.model.collections.items, []);
});

// NX-N15: UpdateContext が大小だけ違う既存コンテキスト変数を更新する
test("NX-N15 UpdateContext({A}) updates existing context variable a", async () => {
  const p = await firstWith(
    "powerapps",
    "UpdateContext({A: 2}); Notify(Text(A))",
    (m) => {
      m.screens = { Home: { context: { a: 1 } }, Detail: { context: {} } };
    },
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["2"]);
  assert.deepEqual(Object.keys(p.model.screens.Home.context), ["a"]);
  assert.equal(p.model.screens.Home.context.a, 2);
});

// 同根表面: Patch／Defaults のデータソース名も大小不区別に解決する
test("PowerApps sibling: Patch/Defaults resolve the data source case-insensitively", async () => {
  const p = await firstWith(
    "powerapps",
    "Patch(orders, Defaults(ORDERS), {Name: \"A\"}); Notify(Text(CountRows(Orders)))",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["1"]);
  assert.deepEqual(Object.keys(p.model.dataSources), ["Orders"]);
  assert.equal(p.model.dataSources.Orders.length, 1);
  assert.equal(p.model.dataSources.Orders[0].Name, "A");
});

// 同根表面: Collect のデータソース判定も大小不区別（別コレクションを作らない）
test("PowerApps sibling: Collect on a differently-cased data source still stops", async () => {
  const r = await runWith("powerapps", "Collect(orders, {Value: 1})");
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err);
  assert.match(err.message, /コレクションだけに対応します/);
});

// 同根表面: Set のコントロール／コレクション名衝突判定も大小不区別
test("PowerApps sibling: Set colliding with a collection name in any casing stops", async () => {
  const r = await runWith("powerapps", "Set(ITEMS, 1)", (m) => {
    m.collections = { items: [] };
  });
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err);
  assert.match(err.message, /コントロール／コレクションと同じ変数名は使えません/);
});

// 同根表面: Reset のコントロール名・メンバー名・Navigate の画面名も大小不区別
test("PowerApps sibling: Reset, member access and Navigate are case-insensitive", async () => {
  const p = await firstWith("powerapps", "Reset(input1); Notify(Input1.TEXT)");
  assert.deepEqual(p.outputs.map((o) => o.text), ["3"]);
  const q = await firstWith("powerapps", "Navigate(detail)");
  assert.equal(q.model.screen, "Detail");
});

/* ---------------- Power Automate: NX-N16 / M-N6 ------------------------- */

const pa = (actions) => JSON.stringify({ name: "学習フロー", actions });

// NX-N16: Increase variable の説明は実際の増減方向に即する
test("NX-N16 Increase variable narration follows the actual direction", async () => {
  const p = await firstWith(
    "powerautomate",
    pa([
      { action: "Set variable", target: "Count", value: 10 },
      { action: "Increase variable", target: "Count", value: 5 },
      { action: "Increase variable", target: "Count", value: 0 },
      { action: "Increase variable", target: "Count", value: -3 },
    ]),
  );
  const t = texts(p);
  assert.ok(t.includes("Count を 15 に増やします"), JSON.stringify(t));
  assert.ok(t.includes("Count は 15 のまま変わりません"), JSON.stringify(t));
  assert.ok(t.includes("Count を 12 に減らします"), JSON.stringify(t));
  // 「増やします」は +5 の回に1回だけ（+0・-3 の回には出ない）
  assert.equal(t.filter((x) => x === "Count を 15 に増やします").length, 1);
  assert.equal(p.vars.Count, 12);
});

// M-N6: 存在しない変数への Increase は不存在を名指しする
test("M-N6 Increase variable on a missing variable names the missing variable", async () => {
  const r = await runWith(
    "powerautomate",
    pa([{ action: "Increase variable", target: "Nope", value: 1 }]),
  );
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err);
  assert.match(err.message, /変数がありません：Nope/);
  assert.doesNotMatch(err.message, /数値型の変数と増分が必要です/);
});

// M-N6 対照: 存在する文字列変数への Increase は従来どおり型の文言
test("M-N6 contrast: Increase variable on a string variable keeps the type message", async () => {
  const r = await runWith(
    "powerautomate",
    pa([
      { action: "Set variable", target: "S", value: "abc" },
      { action: "Increase variable", target: "S", value: 1 },
    ]),
  );
  const err = r.error || r.paths?.[0]?.error;
  assert.ok(err);
  assert.match(err.message, /数値型の変数と増分が必要です/);
});

/* ---------------- UI.Vision: NX-N24 / NX-N25 ---------------------------- */

const uiv = (Commands) => JSON.stringify({ Name: "練習マクロ", Commands });
const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });

// NX-N24: 効果未定義の要素の click は「定義された効果」と言わない
test("NX-N24 click without a defined effect says so honestly", async () => {
  const p = await firstWith(
    "uivision",
    uiv([cmd("open", "https://example.test/form"), cmd("click", "id=name")]),
  );
  const t = texts(p);
  assert.ok(
    t.some((x) => /モデルに効果は定義されていません/.test(x)),
    JSON.stringify(t),
  );
  assert.ok(!t.some((x) => /定義された効果を反映します/.test(x)));
  assert.deepEqual(p.model.clicks, ["id=name"]);
});

// NX-N24: onClick が定義された要素では効果を述べ、実際に反映される
test("NX-N24 click with onClick states and applies the defined effect", async () => {
  const p = await firstWith(
    "uivision",
    uiv([cmd("open", "https://example.test/form"), cmd("click", "id=submit")]),
  );
  assert.ok(texts(p).some((x) => /定義された効果を反映します/.test(x)));
  assert.equal(
    p.model.pages["https://example.test/form"].elements["id=result"].text,
    "完了",
  );
});

// NX-N24: href 遷移では遷移先 URL を引用する
test("NX-N24 click with href cites the destination URL", async () => {
  const p = await firstWith(
    "uivision",
    uiv([cmd("open", "https://example.test/form"), cmd("click", "id=link")]),
    (m) => {
      m.pages["https://example.test/form"].elements["id=link"] = {
        tag: "a",
        text: "進む",
        href: "https://example.test/other",
      };
      m.pages["https://example.test/other"] = { elements: {} };
    },
  );
  assert.ok(
    texts(p).some((x) => /リンク先 https:\/\/example\.test\/other へ遷移します/.test(x)),
    JSON.stringify(texts(p)),
  );
  assert.equal(p.model.url, "https://example.test/other");
});

// NX-N25: break の説明はコマンド名ではなく「ループを抜けます」
test("NX-N25 break is explained as leaving the loop, not the raw command name", async () => {
  const p = await firstWith(
    "uivision",
    uiv([
      cmd("open", "https://example.test/form"),
      cmd("times", "3"),
      cmd("break"),
      cmd("end"),
    ]),
  );
  const t = texts(p);
  assert.ok(t.includes("ループを抜けます"), JSON.stringify(t));
  assert.ok(!t.includes("break"));
  assert.equal(t.filter((x) => /繰り返し \d回目/.test(x)).length, 1);
});

// NX-N25: continue の説明は「次の繰り返しへ進みます」
test("NX-N25 continue is explained as moving to the next iteration", async () => {
  const p = await firstWith(
    "uivision",
    uiv([
      cmd("open", "https://example.test/form"),
      cmd("store", "0", "count"),
      cmd("while", "${count} < 3"),
      cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"),
      cmd("continue"),
      cmd("echo", "x"),
      cmd("end"),
    ]),
  );
  const t = texts(p);
  assert.ok(t.includes("次の繰り返しへ進みます"), JSON.stringify(t));
  assert.ok(!t.includes("continue"));
  assert.equal(p.vars.count, 3);
});

/* ---------------- CloudFormation: NX-N26 ------------------------------- */

// NX-N26: テンプレート断片の「入力」はマクロへ実際に渡した断片
// （Transform キー除去後）を示す
test("NX-N26 template-mode input group shows the fragment actually passed (no Transform key)", async () => {
  const p = await firstWith(
    "cloudformation",
    JSON.stringify({
      Transform: "AddMetadata",
      Resources: { Bucket: { Type: "AWS::S3::Bucket" } },
    }),
  );
  const input = groupEntry(p, "テンプレート断片", "入力");
  assert.doesNotMatch(input, /"Transform"/);
  assert.match(input, /"Resources"/);
  assert.match(input, /AWS::S3::Bucket/);
  const after = groupEntry(p, "テンプレート断片", "変換後");
  assert.match(after, /"Metadata"/);
});

// NX-N26 兄弟表面: Fn::Transform のみの場合も「入力」に Fn::Transform
// キーを含めない
test("NX-N26 Fn::Transform keys are also stripped from the input group", async () => {
  const p = await firstWith(
    "cloudformation",
    JSON.stringify({
      Resources: {
        Bucket: {
          Type: "AWS::S3::Bucket",
          Properties: {
            "Fn::Transform": {
              Name: "AddMetadata",
              Parameters: { Stage: "test" },
            },
            BucketName: "practice-bucket",
          },
        },
      },
    }),
  );
  const input = groupEntry(p, "テンプレート断片", "入力");
  assert.doesNotMatch(input, /Fn::Transform/);
  assert.match(input, /practice-bucket/);
});

// NX-N26 対照: ハンドラモードの groups（入力断片 → 変換後の断片）は不変
test("NX-N26 contrast: handler-mode groups keep the passed event fragment", async () => {
  const d = getDefinition("cloudformation");
  const p = await firstWith("cloudformation", d.templates[2].code);
  const input = groupEntry(p, "入力断片 → 変換後の断片", "入力");
  assert.match(input, /AWS::S3::Bucket/);
  const after = groupEntry(p, "入力断片 → 変換後の断片", "変換後");
  assert.match(after, /Metadata/);
});
