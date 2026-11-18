# 収束判定ラウンド第3回・ブラウザ残件モップアップ班 報告書

対象ビルド: 正本 `repo-reffix/` HEAD **f486c8b**（アプリコードは一切変更していない。確認専任）
実施日: 2026-11-18（UTC 13:5x〜14:4x）
証拠置き場: 同ディレクトリ配下 `lane-browser-mopup-work/`（results-mopup.json / diag-results.json / results-lp19b.json / results-d01b.json / results-d01c.json / shot-sp51.png / shot-lp19-supplementary.png / shot-d01.png / ハーネス一式）

## 冒頭明記：新規実質欠陥の疑い 1件

**precache 集合だけではアプリが起動しない**（詳細 §1）。静的 import で起動時に必須な38ファイルが、ファイル名パターンによる「高度ファイル」分類で precache から除外されている。再現と三方切り分け（A/B/C）まで完了した確度の高い疑いであり、最終判定は統合側に委ねる。本欠陥のため LP-19 は規定方法（出荷集合ツリー）では実施できなかった。

## 判定サマリ

| 項目 | 判定 | 備考 |
|---|---|---|
| SP-51（状態タグ・バッジの3表面一致） | **合格** | 実ブラウザで3表面一致を確認。件数も照合済み |
| LP-19（経路上限2,000の打ち切り告知のブラウザ表示） | **未確認**（出荷集合では起動不可＝上記欠陥により実施不能） | 補助測定（静的閉包を補った集合）では告知表示を確認。Node では経路上限そのものへの到達を確認。欠陥修正後に真の出荷集合で再実施が必要 |
| D-01（検索同定 CFN AWS::S3::Bucket／C++ std::sort） | **合格**（再々確認） | 両項目とも同定。C++ はヒット9件中に完全一致項目 `std::sort` を確認 |

## §1 新規実質欠陥の疑い：precache 集合で起動できない

### 再現手順
1. `repo-reffix/`（f486c8b）を、precache.js の `PROGRAMMING_ASSETS` に載るファイルだけを 200 で返し、それ以外を 404 にする HTTP サーバで配信する（本班ハーネス `mopup_run.py` の ship 配信、および切り分け用 `diag.py` 条件A）。
2. Chromium（Chrome for Testing 1255）で開く。
3. `#macroType` の option が 75 秒待っても **0件のまま**で、アプリが初期化しない。

### 切り分け（diag.py、2026-11-18 14:32〜14:35 UTC）
- **条件A（precache 集合のみ）**: options=0（75.3秒）。404／ERR_ABORTED が `advanced-engine.js`（2種別分）、`reference-advanced-names.js`（2件）、`semantics-advanced.js`（2種別分）、`functions-advanced.js`（R）に発生し、モジュールグラフが崩壊。
- **条件C（A＋名前表2件のみ追加）**: options=0（75.2秒）。失敗が次層へ移る（`advanced-engine.js`、`engine-advanced.js`、`engine-advanced-ops.js`、VBA の `functions-advanced.js`／`constants-advanced.js`）。名前表だけでは不十分。
- **条件B（A＋静的閉包の不足38件すべて）**: **options=16 が 2.0 秒で成立、失敗リクエスト0・エラー0**。起動する。

### 静的閉包の機械照合（Node）
`js/app.js` と `js/worker.js` から静的 import/export-from のみを辿った閉包は 113 ファイル。そのうち precache 未収載は **38件**（cmd/advanced-engine.js、powershell/engine-advanced{,-cmdlets,-vars,-ops}.js、vba/functions-advanced.js、vba/constants-advanced.js、vba/reference-advanced-names.js、autohotkey/semantics-advanced.js、uivision/advanced-engine.js、powerapps/semantics-advanced.js、r/functions-advanced.js、r/names-advanced{,-part1..10}.js、r/functions-advanced-*.js（13件）、r/reference-advanced-names.js、csharp/advanced-engine.js、javascript/advanced-engine.js）。これらは全て両モード共通の起動グラフ上にあり、遅延読み込みされる項目データ本体（reference-advanced*.js 等）とは別物である。

### 機構（一次資料＝リポジトリ内ソース）
- `scripts/precache.mjs` の除外規則 `ADVANCED_FILE_RE = /(^|\/)(advanced-manifest|advanced-engine)\.js$|-advanced[^\/]*\.js$/` は「`-advanced` を含む .js」を一律に高度差分（precache せず sw.js のランタイムキャッシュで扱う）とみなす。`sw.js` 側も同一パターンで判定し、該当ファイルは network-first＋ランタイムキャッシュ、オフライン時はキャッシュが無ければ `advanced resource unavailable offline` で失敗させる。
- 一方で各種別の `index.js` は高度エンジンや名前表を**静的 import** している（例：`js/types/vba/index.js:102` と `js/types/r/index.js:13` の `reference-advanced-names.js`。後者は SP-21 修正（バッチ18）で「名前だけの照合表を静的 import する」設計として導入されたもの。R は `functions-advanced.js` も静的 import する）。
- `sw.js` の activate は世代交代時に旧ランタイムキャッシュ（ADVANCED_CACHE）を削除する。したがって**新世代の初回起動をオフラインで行うと、起動必須の静的ファイルが network-first で取得できず、ランタイムキャッシュも空のため、簡易モードでもアプリが起動しない（白紙）**。オンラインでは無症状であり、フルツリー配信の従来ブラウザ確認が全て合格してきたことと矛盾しない。
- `precache --check` は生成器との整合しか見ないため、この欠陥では通過する。静的閉包 ⊆ precache∪（遅延専用）という観点の検査が従来ラウンドの実施範囲に入っていなかったことが、未検出の理由とみられる。
- 参考：現行公開ビルド（d2f2198）は高度モード統合前のため本欠陥の対象外。本欠陥は高度統合側（少なくともバッチ18以降の名前表静的化を含む）の問題。

### 本班の処置
アプリコードは変更しない（担当外）。修正方針（分類をファイル名ではなく実際の読み込み機構で分ける等）は統合側の判断に委ねる。LP-19 の再実施は本欠陥の修正後に必要。

## §2 SP-51（状態タグ・バッジの3表面一致）— 合格

方法：フルツリー配信・高度モード・PowerShell（専任班の対象データどおり）。前班の失敗原因（evaluate 型誤り）を避け、プリミティブのみを返す評価式で実施。
- 概要表示：`対応 149 件／未対応 180 件／未検証 40 件（全 369 件）` — A3班の照合件数と一致。
- 詳細バッジ：対応（Write-Output）＝「シミュレーション対応」、未対応（Clear-Host）＝「参照用 · 操作は未対応」、未検証（Add-History）＝「参照用 · 意味論は未検証」。
- 一覧ボタン：未対応・未検証にのみタグが付き、対応には付かない（`Clear-Host未対応`／`Add-History未検証`／`Write-Output`）。
- コード全体スキャンのチップ：`Write-Output`（タグなし）、`Clear-Host未対応`、`Add-History未検証` と3状態が一致。
- 実行後チップ：`Write-Output "hi"` 実行でチップ［Write-Output、文字列］、状態「1件のパス…」、出力 `hi` を表示。
- 証拠：shot-sp51.png（131,033 bytes）、results-mopup.json の sp51 節（バッジ全文・チップ列を収録）。pageerror は 404 が1件のみ（フルツリー配信時の favicon 相当とみられ、本判定には影響しない。特定はしていない）。

## §3 LP-19（経路上限2,000の打ち切り告知）— 未確認（実施不能の理由が確定）

- 規定方法(c)「出荷ファイルだけのツリー」は §1 の欠陥により**アプリ自体が起動しない**ため、この方法では原理的に実施できなかった。過去3回の未確認は環境要因とされてきたが、今回、出荷集合に限れば環境ではなくビルド側の欠陥が原因であることを切り分けで確定した（フルツリーでは同時刻に SP-51 等が正常動作）。
- Node 実測（Worker と同一の入口 `def.simulate`、対象 f486c8b）：CMD の rem 形状（`set /p`＋`if … rem` ×11）が最速で、経路上限 2,000 件に到達（paths=2000、truncated=true、理由「パス数の上限（2000件）」、857〜918ms、複数回再現）。対照 d2f2198 でも同一形状が同結果（918〜925ms）。経路上限の機構そのものは対象ビルドで正しく働く。
- 補助測定（precache＋静的閉包38件＝起動可能集合、対象 f486c8b、実ブラウザ）：rem 形状の実行で状態欄に「**最大2000件までです。すべての分岐パスは表示されていません。**」を含む告知が表示され、`#limit` が表示状態（hidden=false）で同文を保持した（shot-lp19-supplementary.png、118,357 bytes）。ただしこの実行でアプリが示した打ち切り理由は「探索回数・時間の上限」であり（ブラウザ内 Worker の壁時計条件による）、「パス数の上限」という理由文字列そのもののブラウザ表示は未確認のまま残る。
- 残件：§1 欠陥の修正後、真の出荷集合ツリーで LP-19 を再実施し、経路上限理由での告知表示までを確認すること。

## §4 D-01（検索同定）— 合格（再々確認）

- CloudFormation：概要「対応 1,798 件…」側で検索 `AWS::S3::Bucket` の先頭ヒットが完全一致 `AWS::S3::Bucket`（ヒット2件）。実 `select_option` で種別切替。
- C++：概要 `対応 321 件／未対応 4627 件／未検証 0 件（全 4948 件）`（既知件数と一致）。検索 `std::sort` のヒット9件中に完全一致項目 **`std::sort`**（タグなし＝対応）を確認（先頭は `std::sortable未対応`）。全ヒットは results-d01c.json に収録。
- 証拠：shot-d01.png（99,927 bytes）、results-d01b.json／results-d01c.json。
- ハーネス上の注記：`#macroType` への `select_option` が本 VM では断続的に actionability タイムアウトした（要素自体は DOM 実測で表示・有効を確認済み。SP-51 と CFN 切替では成功）。C++ 切替はアプリ自身の change ハンドラへの JS イベント発火で代替した。アプリ側の欠陥とは判定しない（環境・自動化側の事象）。

## §5 環境記録（判定の前提として）

- Chromium の SIGTRAP 即死窓が 2026-11-18 13:5x〜14:24 UTC 頃まで継続（生 CLI・Playwright 両バイナリとも exit 133／起動即閉、負荷 0.45〜1.8 でも発生）。本班の探査ループはこの間 28 回以上の起動失敗を記録した。
- その途中でランタイム再起動が発生し、背景実行していたハーネス（proc_20fbffc2d202）の最終結果が失われた。保存済み出力と結果ファイルの不在を確認したうえで、再起動直後の窓（前班の実績どおり再起動直後が動作窓）で再実行し、SP-51 合格以降の全結果を得た。再実行は読み取り専用の測定であり、アプリ・外部への副作用はない。
- 本班コピー `work/lane-browser-mopup/` は作成時の EPERM 窓で `cp -a`／`git archive` ともに 0 バイト化したファイルを含むため、アプリの実測は全て正本 `repo-reffix/` と `deliver-stage18/` の読み取り専用配信で行った。本コピーは報告書と証拠ファイルの置き場としてのみ使用している（アプリツリーとして使ってはならない）。

追記（コミット可否）：本コピーには `.git` が存在せず（EPERM 窓でのコピー時に欠落）、ローカルコミットはできなかった。報告書と証拠ファイルはツリーに残したまま未コミットとする。統合側はファイル実物を直接取り込むこと。
