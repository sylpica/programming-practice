# 簡易モード班 実行報告書（LANE-SIMPLE-EXEC）

- 対象：統合済みビルド（repo-reffix HEAD 04dfe2d）のコピー `work/lane-simple-exec/`
- 計画正本：`lanes/lane-simple/plan.md`／`probes.md`（LP-01〜LP-36、全92角度の判定どおり）
- 実施日：2026-11-18
- GitHub 書き込み：なし（ローカルのみ）

## 1. 担当既知事項の処置

### KD-1（台帳 RG-606）ImageJ getResult が名前付き結果表へ到達できない — 修正済み

- 一次情報：ImageJ `Functions.java` の getResult（第3引数＝結果表タイトル。`getResultsTable(title)` で解決し、列が無ければ NaN、文字列セルは数値解釈）。高度側の表解決（`js/types/imagej/engine-advanced-state.js` の resolveTable：結果表本体は `S.__resultsTitle || "Results"` で行は `S.results`、名前付き表は `S.__tables[title]`）と突き合わせて基礎側の正しい挙動を確定した。
- 欠陥：基礎 `js/types/imagej/engine.js` の `case "getResult"` は第3引数を無視し、常に既定の結果表しか読めなかった。Table.create で作った名前付き表の値を getResult で読み戻すことができない。
- 修正：タイトルを実在する表へ解決するよう書き換えた。結果表本体（タイトル省略時・現在の結果表タイトル指定時）は従来経路のまま完全不変。名前付き表はその行配列を読む。存在しないタイトルは従来どおり名指し停止（ただし原因文中の「このモデルにある結果表は『Results』だけです」という虚偽の案内を、Table.create への案内文へ改めた）。範囲外・列なしの文言は、名前付き表の場合のみタイトル付きの変形とし（高度側 cellGet の文面に倣う）、既定表では従来文言のまま。
- 検証（一次情報からブラインドに導出した期待値）：名前付き表からの読み＝期待値どおり、対照（タイトル省略／"Results" 明示）は従来値のまま、存在しないタイトルは停止、IJ.renameResults 後の新タイトルで解決・旧タイトルで停止・タイトル省略で新表を読む、列なし→NaN、文字列セル→数値解釈、行範囲外はタイトル入りの原因文で停止。

### KD-2（台帳 RG-607）Color.getLut が setLut を反映しない — 修正済み

- 一次情報：ImageJ functions.html の Color.getLut／Color.setLut（現在の画像の LUT の出し入れ）。高度側 getLut は画像に保持された `im.lut`（setLutImpl が設定）を返し、無ければ恒等 LUT。
- 欠陥：基礎 `case "Color.getLut"` は常に恒等 LUT を返し、Color.setLut／setLut で設定した LUT を読み戻せなかった。
- 修正：現在の画像に保持された LUT があればそのコピーを返し、無ければ従来どおり恒等 LUT。ステップ文言は保持時「setLut で設定した LUT を変数に入れます」（高度側と同一文面）、通常時は従来文言のまま。
- 検証：非恒等 LUT を Color.setLut 形・素の setLut 形のどちらで設定しても Color.getLut が設定値を返す。対照（未設定）は恒等 LUT のまま。

### RG-634 R の NA 名 print 表示 `[object Object]` — 表示層で是正済み

- 原因：基礎層の `names<-` は NA 名を内部 `null` で保持し表示では prefix なし（既存規約）だが、高度層 setNames（B4S の F6）は不足分を NA センチネルオブジェクトで埋めるため、`js/types/r/index.js` の `show` が `(nm ? nm + " = " : "")` でセンチネルを文字列化し `[object Object]` が漏れていた。値そのものと names() の意味論は実 R と一致しており変更対象外。
- 裁定：表示層で是正可能。同じ意味値の表示が構築経路（基礎／高度）で変わらないよう、基礎規約（NA 名は prefix なし）に統一した。
- 修正：`namePrefix` ヘルパー（文字列かつ非空のときだけ「名前 = 」を付ける）を追加し、`show` と `showFormatted` の両方で使用（兄弟表面の横掃し）。
- 検証：`print(setNames(c(1,2,3), "a"))` → `c(a = 1, 2, 3)`（artifact 解消）、digits 指定の print も清浄、names() は `c("a", NA, NA)` のまま不変、基礎経路 `c(a = 1, 2)`・全名前付き `c(a = 1, b = 2, c = 3)` は不変。

### 回帰テスト

- `tests/muse-lane-simple-exec.test.js` を新規作成（14件、期待値は一次情報からブラインドに導出）。TZ=UTC・TZ=Asia/Tokyo の双方で 14/14 全通過。

## 2. プローブ・照合の実施結果（Node／機械照合）

| 項目 | 結果 |
|---|---|
| F-02 基礎側件数 | リファレンス 1,403件（対応1,328／参照専用75）、用語集 139件、テンプレート 112件 — バッチ13正本と完全一致 |
| データ同一性（対 deliver-stage18） | 全16種別×（reference／glossary／templates）で差分は C# ushort 項目の caution 文言1件のみ。これは B5 仕上げ時の記録是正（CS-FIX2a で MaxValue／MinValue が実装され旧文言が虚偽化したための同期）であり、説明可能な既知差分。回帰ではない |
| 到達性スイープ（A-09 機械化） | 基礎項目の syntax から抽出した 2,683 トークン全件が、アプリの検索述語（name／category／description／syntax＋inventoryNames／scan への小文字部分一致、クエリ全体一致）で自項目にヒット。ミス 0 |
| D-07 テンプレート trace 走査 | 全112テンプレートを基礎エンジンで実行し、trace／出力／変数の内部トークン漏れ（`[object Object]`、`SIM_UNK`、`__tables` 等）を走査。漏れ 0、テンプレート先頭エラー 0 |
| E-06 旧名走査 | ユーザー可視ファイル（index.html／js／style.css／manifest／sw.js／precache.js／README）に「VBA練習」「マクロ練習」等の旧名なし |
| D-17 静的文言（対 deliver-stage18） | index.html の差分は許容分のみ（ブランド文言削除＝RG-612、モードトグル＋modeNote、resultNotes、リファレンス状態サマリ＋状態フィルタ）。style.css の差分も .brand／.editor-wrap／.left-column／.workspace の RG-612 分とモード・状態タグ・resultNotes の新規セレクタに限定 |
| LP-12 取込上限 | BOM＋ちょうど100,000文字を受理（デコード後 100,000 文字）、100,001文字は「コードは100000文字以内にしてください。」で拒否 |
| LP-13 取込の受理・拒否 | 先頭 0xFF の .py を CP932 救済で受理、VT（0x0B）含みの .c を受理、0x01 含みは「バイナリファイルの可能性があるため取り込めません。」で拒否 |
| LP-14 拡張子不一致 | 期待拡張子と異なるファイルは「.py ファイルを選んでください。」で拒否 |
| LP-15 cmd ECHO 連結形 | `echo%CD%`・`echo!CD!` は実物の構文エラー文言 "The filename, directory name, or volume label syntax is incorrect." で停止。対照 `echo %CD%` は `C:\Practice` を出力 |
| LP-16 PowerShell モデル files=0 | エンジン層で「モデルfilesは配列で指定してください」を確認。UI の最終状態欄文言「モデルの確認で停止しました。モデルを修正して再実行してください。実行結果はありません。」は app.js のモデルエラー整形（573行付近）と一致することを静的に確認（実ブラウザでの状態欄表示は未実施＝§5） |
| LP-18 深さ上限の変形 | 括弧＋二項演算150重・条件式120重・ジェネレータ式150重のいずれも「対応外：コードの入れ子が深すぎて、この説明では読み取れませんでした」で深さを理由に停止。対照（50重）は正常値。浅い括弧のみの入れ子は上限に当たらず正常評価（上限は演算子・式の入れ子深さが対象） |
| LP-24 ImageJ eval | 「未対応：eval はモデルで未対応です」で名指し停止し、後続文は出力されず。リファレンス eval 項目は supported=false で caution に「このアプリでは未対応として停止する。」を含む |
| LP-28 Remove-Item 詳細 | -Force の是正文言「隠し項目・読み取り専用項目の削除も許可する-Forceも実装されています（-Forceは確認そのものを省略するものではありません）」が入り、旧文言なし |
| LP-29 Set-Content 詳細 | 「別名sc」なし（「別名」自体なし）。R22-N39 の除去が維持されている |

### 観察事項（欠陥ではない）

- ImageJ で表示ステップ上限300に達するループ（例：256回×3文）は i=100 で無言に止まるが、バッチ13正本（deliver-stage18）でもバイト同一の挙動を確認済み。正本どおりの確定挙動であり回帰ではない。

## 3. テスト結果

- 自ツリー全スイート（TZ=UTC）：7,178件中 7,175件通過、失敗3件。失敗は全てパス上限系タイミングテスト（`audit nested macro cross product reports the 2000 path cap`／`cmd path cap is explicit and never exceeds the common 2000 paths`／`powershell path explosion emits a notice at the shared 2000 path cap`）で、共有 VM の高負荷下で探索上限が先に発動したもの。同一ツリーで当該3ファイルを単独再実行したところ 1,686件全通過したため、負荷フレークと裁定（自変更は ImageJ／R のみで VBA・cmd・PowerShell のパス列挙には無関係）。
- TZ=Asia/Tokyo 基準線：WDL ファイルで既知の RG-630 タイムゾーン依存1件のみ失敗することを確認。新規テスト14件は JST でも全通過。

## 4. 新規欠陥

- 本ラウンドで新規に発見した実質的欠陥：**0件**（担当3件の修正と上記の照合・プローブの範囲）。
- ただし実ブラウザ角度（§5）が環境要因で未実施のため、収束判定は行わない。

## 5. 残存・未確認（実ブラウザ角度が環境ブロック）

実ブラウザ確認（LP-01〜LP-11、LP-16 の UI 表示、LP-17、LP-19〜LP-23、LP-25〜LP-27・LP-30〜LP-36 のブラウザ面、D-01 全操作マトリクス）は、本実行環境でブラウザが起動できず**未実施**。

- 証拠：tools の Chrome for Testing 159、Playwright キャッシュの Chromium 1248／1194、headless shell 1248 のいずれも起動直後またはページ読み込み時に SIGTRAP（exit 133）で終了。WebKit（Playwright）は起動処理がハングし応答なし。同一 VM 上の他ラインのブラウザプロセスは稼働しており、本セル固有の制約とみられる。ランタイム再起動を挟んだ時間帯から発生しており、書き込み EPERM の断続発生と同時期。
- 静的・Node 側で代替確認した範囲：モード開示文・保存警告文（storageNotice）・回復通知文（recoveryNotice）の文面は index.html／app.js で確認済み。モードキー解釈（getMode／normalizeMode）は純関数であり、破損・未知値のフォールバックはそちらが正本。取込の受理・拒否は §2 のとおり関数レベルで確認済み。リファレンス件数・到達性・詳細文言はデータレベルで全数確認済み。
- したがって未確認として残るのは「実際の描画・操作でのみ分かる」部分：320／375／768／1280px のレイアウト（文字切れ・実質縦書き・横はみ出し）、キーボード到達性とフォーカス、二タブ競合の実挙動、SW オフライン再訪、PAD ビルダの未反映ガードの実操作、パス上限告知とソート3種の実表示、モード往復の実操作、HTML エスケープの実描画。

## 6. 触ったファイル

- `js/types/imagej/engine.js`（KD-1／KD-2 の修正）
- `js/types/r/index.js`（RG-634 の表示層是正）
- `tests/muse-lane-simple-exec.test.js`（新規・回帰テスト14件）
- `docs/audit/LANE-SIMPLE-EXEC.md`（本報告書）

repo-reffix 本体・共有記録ファイル（台帳・状態ファイル・DEVELOPMENT.md・PROGRESS.md）には触っていない。precache の再生成は不要だった（対象ファイルは precache 対象外の JS モジュール差分のみで、内容変更に伴う版数管理は統合工程の担当）。

### コミット状況（環境障害の記録）

変更一式は作業ツリー上に完成しているが、ローカルコミットは実行環境の書き込み障害のため本報告書作成時点では未了。障害の実測：シェル／Node からのファイル内容書き込み（write システムコール）が EPERM で全面拒否され（ファイル作成・mkdir・rename 等のメタデータ操作は可）、git は "unable to write loose object file: Operation not permitted" で失敗する。ファイルツール経由の書き込みは可能なため報告書はそちらで作成した。書き込みが回復し次第、`git add js/types/imagej/engine.js js/types/r/index.js tests/muse-lane-simple-exec.test.js docs/audit/LANE-SIMPLE-EXEC.md` のうえ単一コミットする想定（再試行は継続中）。実ブラウザの SIGTRAP（§5）も同時期・同セルで発生しており、ランタイム再起動後に発生した環境側の制約とみられる。

## 7. 台帳への提案

- RG-606／RG-607：基礎側で修正済み（本報告書 §1）。高度側の挙動と一致することを確認済みのため、両件とも「修正済み・検証済み」への状態更新を提案する。
- RG-634：表示層で是正済み（値・names() の意味論は不変）。状態更新を提案する。
- 実ブラウザ角度の未実施分（§5）は、ブラウザが起動できる環境で簡易モード班プローブ LP-01〜LP-36 のブラウザ面のみを追試する再開手順として記録することを提案する（Node／機械照合分は本ラウンドで完了済み）。
