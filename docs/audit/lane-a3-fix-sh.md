# 高度A3班 修正チーム FIX-SH（画面開示・scanチップ）報告書

- 担当欠陥: T5-D01（`work/lane-a3-t5/docs/audit/lane-a3-t5-display.md`）— 実行前の使用中チップ（scan 経路、「コード全体」スコープ）に高度専用項目が一切表示されない。
- 土台: lane-a3-exec HEAD `04dfe2d`（修正バッチ16）。
- 結論: 根因2箇所（ImageJ scan／PowerShell scan の照合先が基礎カタログ固定）を是正し、回帰テストで固定した。簡易モードの挙動は無傷。

## 実施形態（環境障害と復旧の記録）

- 作業ツリー: `work/lane-a3-fix-sh`（`git clone --no-hardlinks`、lane-a3-exec HEAD `04dfe2d`）。
- 本セッション開始直後（2026-11-18 10:05 JST頃）から約1時間半、exec プロセスのファイル書き込みが全面的に EPERM（`write`/`pwrite`/`mmap`/`cp`/`dd`/`git clone` すべて "Operation not permitted"）となる環境障害が発生した。恒常ルール（書き込み障害時は間隔を空けて再試行）に従い 70 回以上リトライし、障害中は Node の `module.registerHooks` で同一パッチをメモリ上でのみ実コードへ適用する代替検証を先行実施した。書き込み復旧後に正規手順（clone→編集→テスト→コミット）を完遂し、代替検証と実ツリー検証の結果が一致することを確認した。他ツリー（lane-a3-exec 本体を含む）は一切変更していない。
- 実ブラウザ再確認は未実施（本サブエージェントはブラウザ操作不可。加えて監査報告どおり本 VM の CPU スロットリングで実行系がパース時間制限に当たる既知の環境要因がある）。scan は DOM 非依存の純粋関数であり、Node レベルの証拠で代替した（タスク指示の代替条項どおり）。

## 修正内容

### 1. ImageJ scan（js/types/imagej/index.js）

- 従来: モジュール内の基礎 `reference` に対してのみ `名前(` を照合。
- 是正: 照合先を `const catalog = definition.__catalogReference || reference;` とし、`catalog.some(...)` で照合。cmd／Python の scan の先例と同じ形。
- 呼び出し形 `名前(` の照合のみという既存仕様は維持（範囲を広げていない）。

### 2. PowerShell scan（js/types/powershell/index.js）

- 従来: `definition.reference.find(...)`（基礎）で大小無視照合。
- 是正: `const catalog = definition.__catalogReference || definition.reference;` を導入し `catalog.find(...)` へ変更。
- 変数・文字列・パイプライン・配列・ハッシュテーブルの擬似チップの分岐は不変更。

### 機構側の前提（変更なし・確認済み）

- `js/app.js`: `applyCatalog` が `target.__catalogReference = reference`（合成または基礎）、`switchType` が `active.__catalogReference = active.reference` を差し込む。
- `js/worker.js`: `activateAdvanced` が `definition.__catalogReference = merged.reference` を差し込む。IJ／PS の高度エンジンは scan を差し替えない（`advanced-engine.js` に scan 上書きなし）ため、本是正が両経路に効く。

## 検証結果（Node レベル、TZ=UTC）

### 欠陥の再現（修正前・実コード）

- 合成カタログ（loadAdvanced＋mergeCatalog、doCommand／Get-History を含むことを確認）を差し込んでも、IJ scan `doCommand("Quit");` → `[]`、PS scan `Get-History` → `[]`。監査の症状と一致。

### 新規回帰テスト tests/lane-a3-sh.test.js（4件）

- SH-IJ-1: 合成カタログ差し込みで IJ scan が `doCommand("Quit");` → `["doCommand"]`、`eval("x");` → `["eval"]`、Array.fourier／Fit.doFit も拾う。
- SH-PS-1: PS scan が Get-History／Get-Verb／ConvertTo-Html を返し、擬似チップ（変数・文字列・パイプライン）も維持。
- SH-BASE-1: `__catalogReference` 未設定では基礎項目のみ（doCommand／Get-History は出ない、eval／Get-Content は出る）。
- SH-BASE-2: 基礎カタログを差し込んだ状態（簡易モードの機構動作）でも高度項目は出ない。
- 検出能力の対照: 修正前コードでは SH-IJ-1／SH-PS-1 が失敗（2 pass／2 fail）、修正後コードでは 4/4 pass。

### 関連テスト（修正適用状態、TZ=UTC、全て pass）

| ファイル | 件数 |
|---|---|
| muse-advanced-catalog / muse-advanced-loader | 21 / 8 |
| muse-adv-b1-consistency / muse-adv-b1-cmd / muse-adv-b1-uivision | 10 / 73 / 49 |
| adv-b3-imagej-pure / adv-b3-imagej-state | 73 / 64 |
| adv-b3-powershell / adv-b3-ps-operators / powershell | 50 / 9 / 104 |
| muse-fix-batch13-imagej / batch9-imagej / batch9-powershell | 35 / 22 / 12 |
| muse-fix-batch2-imagej / batch3-imagej / batch4-imagej / batch5-imagej | 24 / 44 / 37 / 37 |
| muse-fix-ref-imagej / batch2-fc-imagej | 115 / 56 |
| muse-fix-batch3-psengine / psparser / psfollow | 27 / 16 / 15 |
| engine | 43 |

合計 944 件・失敗 0。基準線（TZ=UTC 全通過）を超える失敗なし。
注: 上記は自ツリーで `node --test`（対象23ファイル一括）により実施し、先行した registerHooks メモリ上パッチ検証（各ファイル個別プロセス）の結果と一致した。全スイート（TZ=UTC `npm test`）の結果は本書末尾の追記を参照。

## 触ったファイル

- 変更: `js/types/imagej/index.js`、`js/types/powershell/index.js`（各 scan の数行のみ。diff: 2ファイル・13 insertions／2 deletions）。
- 新規: `tests/lane-a3-sh.test.js`、`docs/audit/lane-a3-fix-sh.md`（本書）。
- precache.js は再生成していない。共有記録ファイル・他ツリーには触っていない。GitHub 書き込みなし。

## 残存事項

1. 実ブラウザでのチップ表示確認（高度モードで doCommand／Get-History のチップ＋未対応／未検証タグ）は未実施。低負荷環境での再確認を申し送る（scan の戻り値レベルでは本書で検証済み。チップ描画側 updateUsed は合成カタログで名前引きする既存実装のまま）。
2. 実行後チップ（trace 経路）・実行時名指し停止は監査時点で環境要因により未確認のまま（本修正の対象外）。
3. 環境障害中の代替検証用ステージング `work/lane-a3-fix-sh-staging/`（APPLY.md 等）は本ツリー確定に伴い削除済み（正本は本ツリー）。

## 追記: 全スイート結果

- 自ツリーで `TZ=UTC npm test` を実行: **7168 tests / 7168 pass / 0 fail**（新規テスト4件を含む）。基準線（TZ=UTC 全通過）どおりで、基準を超える失敗なし。
