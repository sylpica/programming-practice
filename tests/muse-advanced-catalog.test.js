import { test } from "node:test";
import assert from "node:assert/strict";
import {
  itemStatus,
  statusInfo,
  countByStatus,
  mergeCatalog,
} from "../js/core/catalog.js";
import {
  MODE_STORAGE_KEY,
  getMode,
  setMode,
} from "../js/core/mode.js";

// ---- itemStatus ----

test("itemStatus: status が3値ならそれを優先する", () => {
  assert.equal(itemStatus({ status: "supported" }), "supported");
  assert.equal(itemStatus({ status: "unsupported" }), "unsupported");
  assert.equal(itemStatus({ status: "unverified" }), "unverified");
  // status が有効なら supported=false より優先される
  assert.equal(itemStatus({ status: "unverified", supported: false }), "unverified");
  assert.equal(itemStatus({ status: "supported", supported: false }), "supported");
});

test("itemStatus: status 欠落時は supported=false で unsupported に導出", () => {
  assert.equal(itemStatus({ supported: false }), "unsupported");
  assert.equal(itemStatus({ supported: true }), "supported");
  assert.equal(itemStatus({}), "supported");
});

test("itemStatus: status が不正値なら導出規則に倒れる", () => {
  assert.equal(itemStatus({ status: "unknown" }), "supported");
  assert.equal(itemStatus({ status: "unknown", supported: false }), "unsupported");
  assert.equal(itemStatus({ status: null, supported: false }), "unsupported");
  assert.equal(itemStatus({ status: 42 }), "supported");
});

// ---- statusInfo ----

test("statusInfo: 3状態の文言・クラスが仕様どおり", () => {
  assert.deepEqual(statusInfo("supported"), {
    tag: null,
    badge: "シミュレーション対応",
    badgeClass: "",
    ariaSuffix: "",
  });
  assert.deepEqual(statusInfo("unsupported"), {
    tag: "未対応",
    badge: "参照用 · 操作は未対応",
    badgeClass: " unsupported",
    ariaSuffix: "（参照用 · 操作は未対応）",
  });
  assert.deepEqual(statusInfo("unverified"), {
    tag: "未検証",
    badge: "参照用 · 意味論は未検証",
    badgeClass: " unverified",
    ariaSuffix: "（参照用 · 意味論は未検証）",
  });
});

// ---- countByStatus ----

test("countByStatus: itemStatus で数える", () => {
  const reference = [
    { status: "supported" },
    { status: "unsupported" },
    { status: "unverified" },
    { supported: false },
    {},
    { status: "bogus" },
  ];
  assert.deepEqual(countByStatus(reference), {
    total: 6,
    supported: 3,
    unsupported: 2,
    unverified: 1,
  });
  assert.deepEqual(countByStatus([]), {
    total: 0,
    supported: 0,
    unsupported: 0,
    unverified: 0,
  });
});

// ---- mergeCatalog ----

function makeBase() {
  return {
    reference: [
      { name: "baseFn()", summary: "base の要約", supported: true },
      { name: "otherFn()", summary: "もう1件", supported: true },
    ],
    templates: [{ id: "tpl-base", title: "base テンプレート" }],
    glossary: [
      ["基本用語", "base の定義"],
      ["共通", "base の共通定義"],
    ],
  };
}

test("mergeCatalog: base の順序を保持し高度項目を末尾に追加する", () => {
  const base = makeBase();
  const merged = mergeCatalog(base, {
    referenceAdvanced: [{ name: "advFn()", status: "supported" }],
    templatesAdvanced: [{ id: "tpl-adv", title: "高度" }],
    glossaryAdvanced: [["高度用語", "高度の定義"]],
  });
  assert.deepEqual(
    merged.reference.map((r) => r.name),
    ["baseFn()", "otherFn()", "advFn()"],
  );
  assert.deepEqual(
    merged.templates.map((t) => t.id),
    ["tpl-base", "tpl-adv"],
  );
  assert.deepEqual(
    merged.glossary.map((g) => g[0]),
    ["基本用語", "共通", "高度用語"],
  );
  assert.deepEqual(merged.problems, []);
});

test("mergeCatalog: override が複製に適用され入力を破壊しない", () => {
  const base = makeBase();
  const snapshot = structuredClone(base);
  const merged = mergeCatalog(base, {
    referenceOverrides: [
      { name: "baseFn()", summary: "上書き後の要約", status: "unverified" },
    ],
  });
  assert.equal(merged.reference[0].summary, "上書き後の要約");
  assert.equal(merged.reference[0].status, "unverified");
  assert.notEqual(merged.reference[0], base.reference[0]);
  assert.deepEqual(base, snapshot); // 入力は不変
  assert.deepEqual(merged.problems, []);
});

test("mergeCatalog: override の name は変更不可（上書き対象に含まれても無視）", () => {
  const base = makeBase();
  // name がキーとして現れるのは対象指定そのもの。値として別名を渡しても
  // 対象項目の name が書き換わらないことを確認する。
  const merged = mergeCatalog(base, {
    referenceOverrides: [{ name: "baseFn()", summary: "x" }],
  });
  assert.equal(merged.reference[0].name, "baseFn()");
});

test("mergeCatalog: 存在しない name への override は override-missing", () => {
  const merged = mergeCatalog(makeBase(), {
    referenceOverrides: [{ name: "noSuchFn()", summary: "x" }],
  });
  assert.equal(merged.reference.length, 2);
  assert.equal(merged.problems.length, 1);
  assert.equal(merged.problems[0].kind, "override-missing");
  assert.equal(merged.problems[0].name, "noSuchFn()");
});

test("mergeCatalog: duplicate-name は先行側を残し重複側を捨てる", () => {
  const merged = mergeCatalog(makeBase(), {
    referenceAdvanced: [
      { name: "baseFn()", status: "supported", summary: "base と重複" },
      { name: "advFn()", status: "supported", summary: "1件目" },
      { name: "advFn()", status: "unsupported", summary: "advanced 内重複" },
    ],
  });
  assert.deepEqual(
    merged.reference.map((r) => r.name),
    ["baseFn()", "otherFn()", "advFn()"],
  );
  assert.equal(merged.reference[2].summary, "1件目");
  const dups = merged.problems.filter((p) => p.kind === "duplicate-name");
  assert.equal(dups.length, 2);
  assert.deepEqual(
    dups.map((p) => p.name),
    ["baseFn()", "advFn()"],
  );
});

test("mergeCatalog: duplicate-template-id は先行側を残す", () => {
  const merged = mergeCatalog(makeBase(), {
    templatesAdvanced: [
      { id: "tpl-base", title: "base と重複" },
      { id: "tpl-new", title: "新規" },
      { id: "tpl-new", title: "advanced 内重複" },
    ],
  });
  assert.deepEqual(
    merged.templates.map((t) => t.id),
    ["tpl-base", "tpl-new"],
  );
  assert.equal(merged.templates[1].title, "新規");
  const dups = merged.problems.filter((p) => p.kind === "duplicate-template-id");
  assert.equal(dups.length, 2);
});

test("mergeCatalog: glossary-duplicate は base を残し警告として記録する", () => {
  const merged = mergeCatalog(makeBase(), {
    glossaryAdvanced: [
      ["共通", "高度側の定義"],
      ["新規用語", "新規の定義"],
    ],
  });
  assert.deepEqual(merged.glossary, [
    ["基本用語", "base の定義"],
    ["共通", "base の共通定義"],
    ["新規用語", "新規の定義"],
  ]);
  assert.equal(merged.problems.length, 1);
  assert.equal(merged.problems[0].kind, "glossary-duplicate");
  assert.equal(merged.problems[0].name, "共通");
});

test("mergeCatalog: status-missing / status-invalid を記録し合成は続行する", () => {
  const merged = mergeCatalog(makeBase(), {
    referenceAdvanced: [
      { name: "noStatus()" },
      { name: "badStatus()", status: "weird" },
      { name: "okStatus()", status: "supported" },
    ],
  });
  assert.equal(merged.reference.length, 5);
  const kinds = merged.problems.map((p) => [p.kind, p.name]);
  assert.deepEqual(kinds, [
    ["status-missing", "noStatus()"],
    ["status-invalid", "badStatus()"],
  ]);
  // 表示は itemStatus の導出規則に従う
  assert.equal(itemStatus(merged.reference[2]), "supported");
  assert.equal(itemStatus(merged.reference[3]), "supported");
});

test("mergeCatalog: advanced 省略時は base のコピーをそのまま返す", () => {
  const base = makeBase();
  const merged = mergeCatalog(base, {});
  assert.deepEqual(merged.reference, base.reference);
  assert.deepEqual(merged.templates, base.templates);
  assert.deepEqual(merged.glossary, base.glossary);
  assert.deepEqual(merged.problems, []);
  assert.notEqual(merged.reference, base.reference); // 配列自体は複製
});

// ---- mode.js ----

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test("mode: キーなしでは simple", () => {
  assert.equal(getMode(memoryStorage()), "simple");
});

test("mode: setMode/getMode の往復と保存形式", () => {
  const storage = memoryStorage();
  setMode("advanced", storage);
  assert.equal(storage.map.get(MODE_STORAGE_KEY), '{"mode":"advanced"}');
  assert.equal(getMode(storage), "advanced");
  setMode("simple", storage);
  assert.equal(getMode(storage), "simple");
});

test("mode: 不正値は simple として保存される", () => {
  const storage = memoryStorage();
  setMode("weird", storage);
  assert.equal(storage.map.get(MODE_STORAGE_KEY), '{"mode":"simple"}');
  assert.equal(getMode(storage), "simple");
});

test("mode: 破損 JSON・未知の値は simple にフォールバック", () => {
  assert.equal(
    getMode(memoryStorage({ [MODE_STORAGE_KEY]: "{not json" })),
    "simple",
  );
  assert.equal(
    getMode(memoryStorage({ [MODE_STORAGE_KEY]: '{"mode":"ultra"}' })),
    "simple",
  );
  assert.equal(
    getMode(memoryStorage({ [MODE_STORAGE_KEY]: '{"mode":"advanced"}' })),
    "advanced",
  );
  assert.equal(getMode(memoryStorage({ [MODE_STORAGE_KEY]: "null" })), "simple");
});

test("mode: storage 例外でも例外を投げず simple にフォールバック", () => {
  const throwing = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
  };
  assert.equal(getMode(throwing), "simple");
  assert.doesNotThrow(() => setMode("advanced", throwing));
});

test("mode: storage 省略時も例外を投げない", () => {
  assert.doesNotThrow(() => getMode());
  assert.doesNotThrow(() => setMode("advanced"));
  assert.doesNotThrow(() => setMode("bogus"));
});

test("mode: 既存キー programming-practice-v3 には触らない", () => {
  const storage = memoryStorage({ "programming-practice-v3": "progress" });
  setMode("advanced", storage);
  getMode(storage);
  assert.equal(storage.map.get("programming-practice-v3"), "progress");
  assert.deepEqual(
    [...storage.map.keys()].sort(),
    ["programming-practice-v3", MODE_STORAGE_KEY].sort(),
  );
});
