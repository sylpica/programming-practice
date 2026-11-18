# 高度モード基盤 修正検証報告書（独立検証チーム）

- 対象：コミット db67a7f（監査 D-1〜D-7 の処置申告）
- 検証コピー：`~/workspace/programming-practice-audit/work/adv-mech-v/`
- 先行監査：`docs/audit/muse/advanced-mech-audit.md`（対象 7c27e9e、P2×2・P3×5）
- 方法：申告を前提にせず、Node プローブ／実ブラウザ（ローカルサーバ＋Playwright／Chromium 1255、executable_path 指定・証明書エラー無視）で各指摘を独立に再現・確認した。コード修正はしていない。
- 総合判定：**D-1〜D-7 全件解消を確認（全項目合格）**。観察1件（precache ハッシュの陳腐化、下記）。

## 項目ごとの結果

### 1. D-1（failed 時は基礎のみ）― 合格

- 一時フィクスチャ（js/types/uivision/、検証後削除済み）：manifest が `referenceParts: ["reference-missing-fx.js", "reference-advanced.js"]` を明示し、読み込める高度項目 `advFxD1()` を1件置いて高度モードへ切替。
- 実測：件数表示は「対応 25 件／未対応 0 件／未検証 0 件（全 25 件）」＝基礎カタログのみ（先行監査の再現では全28件相当の部分合成だった）。読み込めた `advFxD1()` も `#refList` に表示されなかった。開示行は「高度モード：…表示します。（高度データの一部を読み込めませんでした）」と末尾注記あり。ページエラー0件。
- フィクスチャを正常形（不存在ファイル除去）に戻すと：件数「対応 26 件…（全 26 件）」、`advFxD1()` が表示され、失敗注記は消えた。

### 2. D-2（manifest 省略キーは missing）― 合格

- Node プローブで `loadAdvanced` を fixturepartial に対して実行：`failed: []`、`missing: ["templates-advanced.js", "glossary-advanced.js"]`、`loaded: ["advanced-manifest.js", "reference-advanced.js"]`。
- `node --test tests/muse-advanced-loader.test.js` は項目8の合算実行（47件全合格）に含まれ合格。

### 3. D-3（二重計上なし）― 合格

- fixturebroken：`loaded: ["advanced-manifest.js", "reference-ok.js"]`、`failed: ["reference-missing.js", "templates-bad.js", "engine-missing.js"]`、`missing: []`。templates-bad.js は failed のみにあり loaded に無い。
- 全フィクスチャ（fixtureadv／fixtureplain／fixturebroken／fixturepartial）で loaded／missing／failed の3リスト間に重複なし（プローブで機械確認）。

### 4. D-4（状態導出の統一）― 合格

- 一時フィクスチャ：`status: "bogus"` かつ `supported: false` の項目 `advFxBogus()`（検証後削除済み）。itemStatus の導出規則では unsupported になる条件。
- 実測（実ブラウザ）：件数表示は「対応 25 件／未対応 1 件／未検証 0 件（全 26 件）」と未対応に計上。状態フィルタ「未対応」では表示され、「対応のみ」では表示されない。一覧ボタンはタグ「未対応」・クラス unsupported・aria-label「advFxBogus()（参照用 · 操作は未対応）」。個票バッジは「参照用 · 操作は未対応」（class="badge unsupported"）。3表面すべて一致。ページエラー0件。

### 5. D-5（除外パターンの拡大）― 合格

- `js/types/uivision/reference-advanced2.js` を一時配置し `node scripts/precache.mjs` を実行：生成された precache.js に当該ファイルは含まれなかった（grep 件数0）。確認後ファイル削除＋再生成し、最終的に precache.js はコミット済みとバイト同一へ復元済み（md5 一致を確認）。
- 正規表現の文字列一致：sw.js と scripts/precache.mjs の `ADVANCED_FILE_RE` は共に `/(^|\/)(advanced-manifest|advanced-engine)\.js$|-advanced[^\/]*\.js$/` で一致。

### 6. D-6（SW は正常応答のみキャッシュ）― 合格

- コード確認：sw.js は `if (response.ok)` の内側でのみ `cache.put` する。
- 実ブラウザ（SW 制御下で fetch）：不存在の高度ファイル `nope-advanced.js` は 404 で、ランタイムキャッシュ `programming-practice-advanced` のキーに含まれなかった。存在する `reference-advanced.js` は 200 で、キーに保存された（キー一覧は当該URLのみ）。ページエラー0件。

### 7. D-7（failed をキャッシュしない）― 合格

- Node プローブで fixturebroken を2回 `loadAdvanced`：2回目は1回目と別オブジェクト（再読込された）で、failed 内容は同一（`["reference-missing.js", "templates-bad.js", "engine-missing.js"]`）。

### 8. 回帰 spot check ― 合格

- `node --test tests/muse-advanced-catalog.test.js tests/muse-advanced-loader.test.js tests/muse-fix-batch8-ui.test.js`：**47件全 pass／0 fail**。
- 簡易モード初期表示（実ブラウザ、uivision）：開示文「簡易モード：よく使う関数を中心に収録しています。全ての関数が実装されているわけではありません。網羅的な収録は高度モードにあります。」、件数「対応 25 件／未対応 0 件／未検証 0 件（全 25 件）」――先行監査の実測と一致。ページエラー0件。

## 観察（不合格ではない）

- コミット済み precache.js のキャッシュ名ハッシュが、現ツリーでの再生成結果と一致しない（`node scripts/precache.mjs --check` が stale を報告する。差分はハッシュ文字列のみで、アセット一覧は同一）。D-5 の検証範囲（除外・正規表現一致）は満たすが、修正コミット時点で precache 再生成が最終内容より前に行われた可能性があり、次回配信時に再生成すれば解消する。機能影響はキャッシュ名が変わらない点のみ（旧キャッシュが残る）で、実害は確認されなかった。

## 後片付け確認

- 一時フィクスチャ（uivision の advanced-manifest.js／reference-advanced.js／reference-advanced2.js、検証用プローブ _verify_probe.mjs）は**全て削除済み**。`git status` は本報告書以外クリーン。
- precache.js はコミット済み（db67a7f）とバイト同一に復元済み（md5 一致）。
- GitHub 書き込みなし。コード修正なし。
