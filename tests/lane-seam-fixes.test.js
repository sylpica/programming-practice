import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  loadAdvanced,
  clearAdvancedCache,
} from "../js/core/advanced-loader.js";

// 横断・継ぎ目班の是正に対する回帰テスト。
// 対象は2件:
//  (1) SP-31: 高度差分が1ファイルも読めなかったとき、オフライン等の
//      到達不能は missing（追加なし）ではなく failed（読み込み失敗）と
//      して呼び出し側へ返し、利用者への注記に結びつける。
//  (2) R-9: SW のランタイムキャッシュ名を precache 世代に結びつけ、
//      版上がり時に旧世代の高度差分キャッシュが activate で破棄される。

const DEFAULT_FILES = [
  "advanced-manifest.js",
  "reference-advanced.js",
  "templates-advanced.js",
  "glossary-advanced.js",
];

async function withFetch(stub, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("seam SP-31: 到達不能（fetch 自体が失敗）なら全て failed になる", async () => {
  clearAdvancedCache();
  const r = await withFetch(
    async () => {
      throw new TypeError("fetch failed");
    },
    () =>
      loadAdvanced(
        { id: "seam-offline" },
        { baseUrl: "http://127.0.0.1:9/seam/" },
      ),
  );
  assert.deepEqual([...r.failed].sort(), [...DEFAULT_FILES].sort());
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.loaded, []);
});

test("seam SP-31: HTTP 応答が返る（404）場合は従来どおり missing", async () => {
  clearAdvancedCache();
  const r = await withFetch(
    async () => ({ ok: false, status: 404 }),
    () =>
      loadAdvanced(
        { id: "seam-notfound" },
        { baseUrl: "http://127.0.0.1:9/seam/" },
      ),
  );
  assert.deepEqual(r.failed, []);
  assert.deepEqual([...r.missing].sort(), [...DEFAULT_FILES].sort());
});

test("seam SP-31: file:// ベースでは到達性プローブを行わない（missing のまま）", async () => {
  clearAdvancedCache();
  const base = new URL("./fixtures/advanced/seam-absent-fixture/", import.meta.url)
    .href;
  const r = await withFetch(
    async () => {
      throw new TypeError("fetch failed");
    },
    () => loadAdvanced({ id: "seam-file" }, { baseUrl: base }),
  );
  assert.deepEqual(r.failed, []);
  assert.deepEqual([...r.missing].sort(), [...DEFAULT_FILES].sort());
});

// ---- SW (R-9) のハーネス: self / caches / fetch を差し替えて sw.js を評価する。
function loadSw(cacheName) {
  const listeners = {};
  const deleted = [];
  const opened = [];
  const puts = [];
  const self = {
    location: { origin: "http://localhost" },
    clients: { claim: async () => {} },
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
  };
  const cachesStub = {
    keys: async () => [
      "programming-practice-OLDHASH",
      "programming-practice-OLDHASH-advanced",
      "programming-practice-advanced",
      cacheName,
      cacheName + "-advanced",
      "unrelated-cache",
    ],
    delete: async (key) => {
      deleted.push(key);
      return true;
    },
    open: async (name) => {
      opened.push(name);
      return {
        put: async (req, res) => {
          puts.push({ name, url: req.url || String(req) });
        },
        match: async () => undefined,
      };
    },
    match: async () => "BASE-CACHED",
  };
  const sandbox = {
    self,
    caches: cachesStub,
    fetch: async () => new Response("ok", { status: 200 }),
    URL,
    Error,
    Promise,
    console,
    importScripts: (path) => {
      assert.equal(path, "./precache.js");
      self.PROGRAMMING_CACHE = cacheName;
      self.PROGRAMMING_ASSETS = [];
      // 修正バッチ20（RG-681）：sw.js の遅延判定は生成された遅延集合への
      // 所属で行うため、スタブも生成物の公開インタフェースに合わせて
      // PROGRAMMING_LAZY_ASSETS を供給する（アサーション自体は不変）。
      self.PROGRAMMING_LAZY_ASSETS = [
        "./js/types/python/reference-advanced-math.js",
      ];
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL("../sw.js", import.meta.url), "utf8"), sandbox);
  return { listeners, deleted, opened, puts, self };
}

test("seam R-9: activate は旧世代と旧式名のランタイムキャッシュを破棄し現行世代を残す", async () => {
  const { listeners, deleted } = loadSw("programming-practice-TESTHASH");
  let pending;
  listeners.activate({
    waitUntil: (p) => {
      pending = p;
    },
  });
  await pending;
  assert.deepEqual(
    [...deleted].sort(),
    [
      "programming-practice-OLDHASH",
      "programming-practice-OLDHASH-advanced",
      "programming-practice-advanced",
    ].sort(),
  );
});

test("seam R-9: 高度差分は現行世代名のランタイムキャッシュへ保存される", async () => {
  const { listeners, opened, puts } = loadSw("programming-practice-TESTHASH");
  let responsePromise;
  listeners.fetch({
    request: {
      method: "GET",
      url: "http://localhost/js/types/python/reference-advanced-math.js",
    },
    respondWith: (p) => {
      responsePromise = p;
    },
  });
  const res = await responsePromise;
  assert.equal(res.status, 200);
  // cache.put は非同期に進むため1ティック待つ
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(opened, ["programming-practice-TESTHASH-advanced"]);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].name, "programming-practice-TESTHASH-advanced");
});

test("seam R-9: 基礎アセットは従来どおり precache 側（caches.match）から返る", async () => {
  const { listeners, opened } = loadSw("programming-practice-TESTHASH");
  let responsePromise;
  listeners.fetch({
    request: { method: "GET", url: "http://localhost/js/app.js" },
    respondWith: (p) => {
      responsePromise = p;
    },
  });
  assert.equal(await responsePromise, "BASE-CACHED");
  assert.deepEqual(opened, []);
});
