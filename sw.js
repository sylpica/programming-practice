importScripts("./precache.js");
const CACHE = self.PROGRAMMING_CACHE;
// 遅延読み込みファイル（高度モードの項目データ本体）専用のランタイム
// キャッシュ。precache には含めず、初回取得時に network-first でここへ
// 保存する。
// 名前は precache の世代（CACHE のハッシュ部分）に結びつける。アプリが
// 版上がりすると activate が旧世代のランタイムキャッシュを削除する
// ため、旧版のデータ本体が無期限に残留しない（横断監査 R-9 の判定・処置）。
// 同一世代の間はオフライン再訪でそのまま使われる。
const ADVANCED_CACHE = CACHE + "-advanced";
// 遅延読み込みファイルの判定は、生成された遅延集合（precache.js の
// PROGRAMMING_LAZY_ASSETS）への所属で行う。分類の正本は scripts/
// precache.mjs が到達方法（静的 import 閉包の外側）から算出した集合で
// あり、ファイル名パターンでは判定しない（修正バッチ20・RG-681：静的
// import される高度エンジンや名前照合表まで名前だけで遅延扱いされ、
// 新世代の初回起動をオフラインで行うと白紙になっていた）。
const LAZY_FILES = new Set(
  (self.PROGRAMMING_LAZY_ASSETS || []).map((p) => p.replace(/^\.\//, "")),
);
const SCOPE_PATH = (() => {
  try {
    const p = new URL("./", self.location.href).pathname;
    return p.endsWith("/") ? p : p + "/";
  } catch {
    return "/";
  }
})();
function isLazyFile(url) {
  try {
    const pathname = new URL(url).pathname;
    return (
      pathname.startsWith(SCOPE_PATH) &&
      LAZY_FILES.has(pathname.slice(SCOPE_PATH.length))
    );
  } catch {
    return false;
  }
}
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(self.PROGRAMMING_ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith("programming-practice-") ||
                  key.startsWith("vba-practice-")) &&
                key !== CACHE &&
                // ランタイムキャッシュは現行世代（CACHE と同ハッシュ）の
                // ものだけを残し、旧世代分はここで破棄する。
                key !== ADVANCED_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  if (isLazyFile(event.request.url)) {
    // 遅延読み込みファイルは network-first: 成功時はランタイムキャッシュへ保存し、
    // ネットワーク失敗時はキャッシュを返し、無ければ失敗させる（捏造しない）。
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 正常応答（2xx）のみキャッシュする。404 等のエラー応答を保存すると
          // オフライン時に存在しないファイルが「ある」ように見えてしまう
          // （監査 D-6 の是正）。エラー応答はそのまま返し、キャッシュの
          // 古いコピーで上書きもしない。
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(ADVANCED_CACHE)
              .then((cache) => cache.put(event.request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches
            .open(ADVANCED_CACHE)
            .then((cache) => cache.match(event.request))
            .then((cached) => {
              if (cached) return cached;
              throw new Error("advanced resource unavailable offline");
            }),
        ),
    );
    return;
  }
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
