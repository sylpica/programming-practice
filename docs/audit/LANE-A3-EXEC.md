# 高度A3班（ImageJ＋PowerShell）監査・修正 実行報告書

- 担当: 高度A3班コーディネーター（仕上げ）。前任コーディネーターが修正適用の途中で終了したため、本報告書が本班の最終報告である。
- 対象ツリー: `work/lane-a3-exec`（土台 repo-reffix `04dfe2d`「修正バッチ16」）。コミット構成: `d9a6b87`（FIX-SH）＋本仕上げコミット（FIX-IJ-A／FIX-IJ-B／FIX-PS-A2／FIX-PS-B の未コミット分＋ precache 再生成＋本報告書）。
- 計画正本: `lanes/lane-a3/plan.md`（作業流 W1〜W6）、`probes.md`（90件）。
- 監査チーム報告: T1 `lane-a3-t1-w2-ij.md`（W2-IJ）、T2 `lane-a3-t2-w2-ps.md`（W2-PS）、T3 `lane-a3-t3-probes.md`（W1＋W4）、T4 `lane-a3-t4-ops-data.md`（W3＋データ面）、T5 `lane-a3-t5-display.md`（W5）。
- 修正記録: `lane-a3-fix-sh.md`／`lane-a3-fix-ija.md`／`lane-a3-fix-ijb.md`／`lane-a3-fix-psa2.md`（FIX-PS-A を取り込み）／`lane-a3-fix-psb.md`。
- **実測でないことの明記**: この VM に実 pwsh・実 ImageJ は無い。PowerShell の期待値は全件 Microsoft Learn／.NET 公式ドキュメントからの導出、ImageJ の期待値は公式ソース（Functions.java 等、sha256 ピン照合済み）からの導出である。実シェル照合は CI の validate-shells と親工程の範囲（plan.md §5）。
- GitHub 書き込みは行っていない。共有記録ファイル（台帳・状態ファイル・DEVELOPMENT.md・PROGRESS.md）には触れていない。

---

## 1. 作業流ごとの結果

### W1（ImageJ ブラインド再導出）— 実施済み（T3）
- プローブ90件（IJ 47＋PS 43）を統合前ツリーで実行: **85件一致／3件不一致／2件形式差のみ**。
- 不一致3件の処置: PS-16（単項 -join）＝欠陥 D1 → FIX-PS-A で是正（§2）。IJ-R3（Plot.getLimits の誤原因エラー）＝欠陥 D4 → FIX-IJ-B の REF 接続で是正し、未初期化変数でも名指し未検証停止に届くことを仕上げプローブで再確認した。PS-35（`[int]::MaxValue + 1`）＝欠陥としない（§3 の裁定記録参照）。

### W2（未検証104件の理由再確認）— 実施済み（T1／T2）。詳細は §4
- ImageJ 52件: 格上げ可能39／理由妥当7／理由書き換え6 → 修正班が全件処置（格上げ39件実装、書き換え6件適用、妥当7件は据え置き）。
- PowerShell 52件: 格上げ可能7／理由妥当28／書き換え17 → 修正班が全件処置（格上げ7件実装、書き換え17件のうち5件は再分類、12件は理由文書き換え）。

### W3（PowerShell 演算子スイープ）— 実施済み（T4）。詳細は §3
- Learn 優先順位表の全順位と照合し、比較グループ・ビットグループ・範囲・カンマ・単項の相対順位は全数一致、prec 再番号の回帰なし。差異は D1（-join 意味論）・D2（?? 結合）・D3（-f 段位）・D6（`${}` 置換）の4件で、いずれも FIX-PS-A で是正。裁定差2件（-xor 同格性・-is 数値型）は FIX-PS-B が画面開示を追加して処置。

### W4（到達可能性スイープ＋C-12 対応表）— 実施済み（T3）
- C-12 対応表: ImageJ は宣言⇔挙動が 558/558 一致。PowerShell は対応188/188 到達可能、未対応・未検証の名指し停止は 169/175＋47/52 で、例外11件（欠陥 D5）→ FIX-PS-A／FIX-PS-B／FIX-PS-A2 で全件処置（複合演算子・リダイレクトの名指し化、リダイレクト3件の未対応への再分類、$$／$^ の到達是正）。
- 検索到達不能6件（T4-D11）→ FIX-PS-B が inventoryNames でデータ側を是正（検索述語は不変更）。

### W5（画面開示 U-45）— 部分実施（T5＋FIX-SH）。詳細は §3(c)
- 実ブラウザで個票・一覧・状態フィルタを15項目確認し全件合格（バッジ＋理由文の表示、フィルタ件数の完全一致）。
- 欠陥 T5-D01（実行前 scan チップに高度専用項目が現れない）を検出 → FIX-SH が是正しコミット済み（d9a6b87）。
- **未実施として記録**: 実行画面での名指し停止表示（確認点③）と実行後チップ（trace 経路）は、本 VM の CPU スロットリングで対応済みコードでも解析時間上限が発動するため環境要因で未確認のままである。エンジン水準では T3 の simulate プローブと本仕上げのプローブで名指し停止を確認済みだが、画面確認の合格根拠にはしない。低負荷環境（横断班・収束ラウンド）での再確認を申し送る。FIX-SH 適用後のチップ実表示の実ブラウザ再確認も同じ理由で未実施（scan は純粋関数であり Node 水準で検証済み）。

### W6（申し送り再確認）— 実施済み。詳細は §3(d)
- 基礎申し送り2件（getResult の表タイトル／Color.getLut）は、統合前ツリーでの実測として T3 が表面矛盾を確認し、本仕上げでも再実測した。修正は簡易班が実施済みで本ツリーには未統合のため、本班では修正していない（§3(d)）。

---

## 2. 修正一覧と根拠

### FIX-SH（コミット d9a6b87）— T5-D01
- IJ／PS の scan の照合先を基礎カタログ固定から合成カタログ（`__catalogReference`）へ是正。回帰テスト `tests/lane-a3-sh.test.js`（4件）。簡易モード無傷は SH-BASE-1／2 で固定。

### FIX-IJ-A — W2-IJ 格上げ3件
- `Array.findMaxima`／`Array.findMinima`／`Array.fourier` を未検証から対応へ格上げ。根拠: MaximumFinder.java／FHT.java を追加取得（sha256 ピン一致）し全アルゴリズムを確定。fourier は float32 再現（Math.fround）が必須条件。併せて findMaxima の description の edgeMode 既定誤記を Functions.java の実コード（`int edgeMode = 0;`）で是正（公式 functions.html 側の誤記）。
- 回帰テスト `tests/lane-a3-ija.test.js`（21件）。既存テスト3件の期待値を格上げに追随して更新（根拠コメント付き）。

### FIX-IJ-B — W2-IJ 格上げ36件＋是正群
- REF 接続: 高度側に `advancedRefMaps`（ADV_REF99／ADV_REF_SKIP1）を新設し、基礎 `engine.js` の変更は委譲範囲内のみ（import、evCall の高度時のみ追加参照、H への `readRef` 追加）。簡易モード無傷を `tests/lane-a3-ijb-simple.test.js`（4件）で固定。
- 格上げ: Color系7件（Colors.java の色名表・colorToString 規則）、Fit系9件（閉形式の範囲のみ。直線・対数線形・多項式2〜8次・Exp／Power 線形。範囲外は Nelder-Mead 依存として名指し未検証停止のまま）、Plot／Table／Roi／Stack／REF系20件（Plot.getLimits は setLimits 明示設定時のみ、等、範囲限定は各項目の caution に開示）。
- 是正: Overlay.setLabelFontSize の arity 1..1→1..2（T4-D7。functions.html の公式 syntax が2引数）、Roi.setFillColor の実副作用（area 型 ROI で stroke が消える）の実装、理由書き換え6件の適用（§4）、括弧なし例文群の呼び出し形への是正（T4-D9。Overlay.flatten／Plot.appendToStack／reset）、selectionName 例文の呼び出し形への是正（組み込み値としての実装は基礎 readVar の変更を要し許可範囲外のため行わない裁定を記録）。
- 裁定の開示: Fit.rSquared は重み付き集計で統一（実 Fitter の getRSquared は重みを扱わない近似だがモデル内一貫性を優先。caution 開示済み）。多項式フィットは厳密解であり実 ImageJ（simplex 反復）と末尾桁が異なりうる旨を caution に開示。Stack.getUnits の既定補完は読み取り経路のみ。
- 回帰テスト `tests/lane-a3-ijb.test.js`（48件）。既存テスト10件の期待値を一次情報の証拠に基づき更新（理由コメント FIX-IJB を明記）。

### FIX-PS-A／FIX-PS-A2 — T4-D1／D2／D3／D6／D5・D10＋$$／$^ 是正
- D1: 単項 -join の既定区切りを空白から空文字列へ（Learn about_Join）。既存テストの誤った期待値 `"a b"` も根拠コメント付きで `"ab"` へ是正。
- D2: `??` の右結合（連鎖）と三項 else 枝の `??`、三項直後の `??` 折り返しを実装。
- D3: `-f` の優先順位を 50→55 へ（Learn about_Operator_Precedence で乗除より上位）。
- D6: -replace の `${名前}` 置換を .NET 規則へ（数字のみ→番号グループ、未知の名前→リテラル保持）。`$番号` 形式の不存在グループのリテラル残しは T4 が .NET 規則で再裏付け済み。
- D5／D10: 複合演算子・リダイレクト（`&&`／`||`／`??=`／`>`／`>>`／`2>`／`2>>`／`2>&1`）を断片ではなく演算子全体の名指し停止へ（`compoundOperatorAt`／`failCompoundOperator`）。
- $$／$^: コーディネーター裁定により FIX-PS-A の「裸形を名指し未対応停止」は取り消し。裸形も波括弧形と同一の var トークンを発行し、AUTOVARS の未検証ハンドラ（ラベルつき未確定値）へ到達させる（未検証の自動変数は未確定値を返すのが本アプリの一貫した設計）。
- 回帰テスト `tests/lane-a3-psa.test.js`（8件）。

### FIX-PS-B — W2-PS 格上げ7件＋再分類＋開示
- 格上げ7件: ConvertTo-Html（構造範囲。行分割位置は Learn 例示出力の構造要素単位とするモデル慣行を caution に開示）、Get-MarkdownOption／Set-MarkdownOption（Learn 例の既定値列。誤ったパラメータ名も是正）、Import-PowerShellDataFile（定数ハッシュテーブルの範囲、制限 500キー／5000ノード）、Update-List（モデル配列プロパティへの範囲）、Measure-Command（位置引数のスクリプトブロック形。名前付き形式はエンジンの既存制約として caution 開示）、$ConsoleFileName（確定値 `""`）。
- 再分類5件: ConvertTo-CliXml／ConvertFrom-CliXml → 未対応（PowerShell 7.5-preview.4 導入で本モデルの対象 7.4 には存在しない）、リダイレクト 2>／2>>／2>&1 → 未対応（実挙動が従来から未対応と同一だった分類不整合の是正）。
- 理由文書き換え: §4 の12件（reference caution とエンジン停止理由を統一）。
- 開示の是正（T4-D4／D5／D8）: -xor の同格性裁定差を高度 -xor 項目と基礎「論理演算子」項目の caution に開示。-is の数値型裁定を -is 項目の caution に開示。New-Object の例文を対応範囲（PSObject 形式）へ差し替え＋範囲開示。Tee-Object の制限開示。
- Join-Path 是正（T3 の PS-42 観察から確定した欠陥）: 戻り値を純粋な文字列結合へ（`Join-Path "a" "b"` → `a\b`。相対パスの絶対化を廃止）。
- 検索到達性（T4-D11）: 正式綴り6件（`? :`、`[ ]`、`@( )`、`@{}`、`( )`、`$( )`）を inventoryNames としてデータ側に追加。
- **逸脱の申告（FIX-PS-B §2 の記録を継承）**: 基礎 `js/types/powershell/engine.js` に Measure-Command 用の `execBlock` クロージャ追加（2ハンク）。高度コマンドレットからのみ到達可能で基礎挙動に影響しないことを全スイートで確認した。
- 回帰テスト `tests/lane-a3-psb.test.js`（21件）。コーディネーター対応事項だった既存テスト2件の期待値更新（レジストリ件数 {run: 56, unsupported: 168, unverified: 26}、$ConsoleFileName の未検証リストからの除外）は本仕上げで適用済みであることを diff で確認した。

### 精査で発見した記録外変更2件（黙って取り込まず、ここに明記して存置する）
1. **`js/types/powershell/engine.js` の文字列展開正規表現への `\$`／`\^` 追加（1行）**: 修正記録5件のいずれにも適用済みとして記載がない。FIX-PS-A2 報告書 §6-1 が「是正する場合は同正規表現へ追加する1行変更で足りる」と仕様まで明記しながら環境制約で見送った変更そのものである。仕上げプローブで、二重引用符内の裸形 `$$` が波括弧形 `${$}` と同一の複合 unknown（「実行時に決まる：実行時に展開する文字列」）を返すことを確認した（変更前はリテラル `"$$"` のまま）。$$／$^ のコーディネーター裁定（裸形＝波括弧形）と整合し、全スイートも通過するため存置する。
2. **`js/types/imagej/index.js` の support 文面「画像フィルター等」→「画像フィルタ等」（1行）**: 修正記録に記載がない。T4-D12（表記揺れ）の指摘対象そのもので、文面のみの変更で挙動に影響しないため存置する。なお D12 の残部（ユーザ／ユーザーの混在）は §6 の残存に記録する。

---

## 3. 計画の重点事項（a）〜（d）の確定

### (a) 未検証104件の再確認結果
§4 に型別件数と処置を記録した。合成カタログの状態件数はアプリ自身の `countByStatus` で実測し、処置結果と完全一致した:
- ImageJ: 全566件 ＝ 対応 509／未対応 44／未検証 13（着手前 470／44／52。格上げ39件が未検証→対応へ移動、未対応は不変）。
- PowerShell: 全369件 ＝ 対応 149／未対応 180／未検証 40（着手前 142／175／52。格上げ7件、再分類5件が未検証から移動）。

### (b) 演算子の優先順位・結合の Learn 全件照合と PS-09
- T4 が Learn about_Operator_Precedence の全順位とモデル prec を照合: 比較グループ（同格・左結合）・ビットグループ・範囲・カンマ・単項は全数一致。差異は -f の段位のみで FIX-PS-A（D3）が是正。仕上げプローブで `2 * "{0}" -f 3` → **6** を再確認した。
- **PS-09**（`$true -xor $true -and $false`）: 本ツリー実測は **$true**。実 PowerShell は同格・左結合で $false になるため、これは B3 以来の裁定（-xor を -or 同格に置き -and と分離する基礎モデルへ合わせる）による**裁定差**であり、欠陥として是正はしない。ただし T4 が「利用者向けリファレンスに開示が無い」ことを欠陥（D4）としており、FIX-PS-B が高度 -xor 項目と基礎「論理演算子」項目の両方の caution に裁定差の開示を追加した。仕上げプローブで両 caution の開示文と実挙動 $true の存置を再確認した。同種の -is 数値型裁定（`2147483648 -is [long]` → False、`-is [int]` → True。実 PS と逆）も -is 項目の caution に開示済みであることを再確認した。

### (c) ImageJ `eval` の画面開示（U-45）
- 個票・一覧では未対応バッジ（「参照用 · 操作は未対応」）＋理由文が表示されることを T5 が実ブラウザで確認済み（15項目全件合格の一部）。
- 実行時の名指し停止は、エンジン水準では本仕上げのプローブで再確認した: `eval("x = 1;")` → 「未対応：eval はモデルで未対応です」で停止し、変数 x は定義されない（vars は空）。`eval()`（引数なし）は名指し停止より先に引数個数エラーになる（IJ-32 の裁定どおり）。
- 実行**画面**での表示確認は W5 の記録どおり環境要因で未確認のまま（§1 W5）。実施済みとは記録しない。

### (d) 基礎申し送り2件（IJ-R5／IJ-R6）— 統合前ツリーでの実測
本ツリー（簡易班の修正は未統合）で本仕上げが再実測した:
- **IJ-R5**: 名前付き表を作って `Table.set("Value", 0, 42)` した後でも、基礎 `getResult("Value", 0, "MyTable")` は「getResult で指定された結果表「MyTable」が見つかりません」で停止する（案内文は「このモデルにある結果表は「Results」だけです」）。一方、高度 `Table.get("Value", 0, "MyTable")` は 42 を返す。**表面矛盾は本ツリーに現存する**。
- **IJ-R6**: `setLut` 後の素の `getLut` は設定した LUT を反映する（r2[0]=9）が、`Color.getLut` は setLut／Color.setLut のどちらの経路でも恒等 LUT を返す（r2[0]=0、長さ256の恒等表）。**不整合は本ツリーに現存する**。
- 両件とも修正は簡易班が実施済み（KD-1／KD-2）であり、本ツリーへの統合は修正統合工程の範囲。本班は修正していない。

### 裁定記録（欠陥としないもの）
- **PS-35**: probes.md の期待（long への昇格）は、`::` を未対応と宣言する棚卸し側の前提と矛盾する資料間の不整合であり、アプリは「未対応：.NET型の静的メンバーアクセス（::）」と正確に名指して停止し誤値を返さない。アプリ側の欠陥としない（T3／T4 の裁定を継承）。

---

## 4. W2 再裁定の内訳（理由型別）

理由型: (i) 一次情報の未取得ファイル・実装詳細依存、(ii) 実行環境・ホスト依存、(iii) モデルに無い状態依存、(iv) 書き戻し機構（REF_FNS）の範囲外、(v) 作業未了。

### ImageJ 52件（T1 台帳）
| 処置 | 件数 | 内訳 |
|---|---|---|
| 格上げ（対応へ） | 39 | T1 台帳の理由型の記録どおりの内訳: 型(i) 23件、型(i)/(v) 1件（Fit.logResults）、型(iv) 7件、型(iv)+(i) 6件、型(iv)+(iii) 2件。対象は Array 3、Color 7（Roi 色3を含む）、Fit 9、Plot／Table／Roi／Stack／REF 系 20 |
| 理由書き換え（未検証のまま） | 6 | Fit.plot、IJ.getFullVersion、List.setMeasurements、Plot.getFrameBounds、Roi.setPolygonSplineAnchors、Roi.setPolylineSplineAnchors。reference caution とエンジン停止文を T1 §5 の修正案どおりに統一 |
| 理由妥当（据え置き） | 7 | doWand、floodFill、getImageInfo、Image.paste、imageCalculator（いずれも型(iii): 全画素値・モデル外メタデータ依存）、List.setCommands（型(ii): インストール済みプラグイン依存）、Overlay.xor（型(iii): 複合形状の表現がモデルに無い） |

### PowerShell 52件（T2 台帳）
| 処置 | 件数 | 内訳 |
|---|---|---|
| 格上げ（対応へ） | 7 | ConvertTo-Html、Get-MarkdownOption、Set-MarkdownOption、Import-PowerShellDataFile、Update-List、Measure-Command（いずれも型(v) 作業未了が主因）、$ConsoleFileName（型(iii) だが確定値 `""` が確定） |
| 再分類（未対応へ） | 5 | ConvertTo-CliXml、ConvertFrom-CliXml（版不整合: 7.5-preview.4 導入）、リダイレクト 2>／2>>／2>&1（分類不整合: 実挙動が未対応と同一） |
| 理由書き換え（未検証のまま） | 12 | $$／$^（理由統一。分類は未検証のまま）、ConvertFrom-Markdown、ConvertTo-Xml、Get-Culture、Get-UICulture、Get-Member、Get-PSCallStack、Get-Verb（照合を実施したうえで Learn 自身が完全な一覧を保証しないことを理由に明記）、$input、$MyInvocation、$PSCmdlet |
| 理由妥当（据え置き） | 28 | 履歴系・$Error 系（型(iii): セッション状態がモデルに無い）、ホスト・書式・モジュール系（型(ii)(iii)）ほか。T2 台帳の各行に根拠を明記 |

---

## 5. ゲート結果（本仕上げで実行）

| ゲート | 結果 |
|---|---|
| A3 専用＋B3 系テスト（TZ=UTC、11ファイル） | **406／406 通過** |
| 全スイート（TZ=UTC、`node --test tests/*.test.js`） | **7,270／7,270 全通過**（土台 7,164＋新規テスト 106＝IJA 21＋IJB 48＋IJB-simple 4＋PSA 8＋PSB 21＋SH 4） |
| 全スイート（TZ=Asia/Tokyo） | 7,269／7,270。失敗は **WDL タイムゾーン依存1件（B2-WDL (f2) F-01 台帳）のみ**で、本ツリーの基準線（A2 班の RG-630 是正を含まない）どおり。タイミング系フレークは今回の両実行で発生しなかった |
| precache | 最終形で再生成し `--check` 合格（キャッシュ名 `programming-practice-e64a2496ad2ba6`）。再生成は exec 書き込みの EPERM 障害のため、生成スクリプトと同一ロジックの読み取り専用複製でバイト列を生成しファイルツールで書き込んだ。`--check`（スクリプト自身の再計算との照合）が合格しており、スクリプト生成物とバイト同一であることを保証する。再生成後に precache 参照テスト2ファイル＋SH テスト（33件）を再実行し全通過 |
| 合成カタログ件数（countByStatus 実測） | IJ 566＝対応509／未対応44／未検証13、PS 369＝対応149／未対応180／未検証40（§3(a)） |
| 仕上げプローブ（独自実測） | PS-09＝$true（開示あり）、-join＝"ab"、?? 連鎖＝7、三項 else の ??＝3、-f 結合＝6、`${nope}` リテラル保持、`${1}`＝"x"、&&／||／??=／2> の名指し停止、$$ 裸形＝波括弧形と同一出力（文字列内も一致）、Join-Path＝`a\b`、$ConsoleFileName＝""、ConvertTo-CliXml の版理由つき未対応停止、eval の名指し停止＋x 未定義、findMaxima＝{1,3}、fourier 定数＝{√2, 0}、Fit 呼び出し形 rSquared＝1／nParams＝2／f(10)＝21、setLabelFontSize 2引数の動作、Overlay.flatten() の名指し停止、Plot.getLimits の未初期化変数での名指し未検証停止、IJ-R5／IJ-R6 の現存確認（§3(d)） |

---

## 6. 残存・未確認

1. **W5 の画面確認の残部**（§1 W5）: 実行画面での名指し停止表示・実行後チップ・FIX-SH 後のチップ実表示は、低負荷環境での再確認が未実施。収束ラウンドへ申し送る。
2. **T4-D12 の残部**: ユーザ／ユーザーの表記混在は IJ／PS 範囲でも基礎ファイル（engine.js、reference-data.js 等）を含む10件が残る。修正チームの処置対象に含まれておらず、本仕上げでも新規修正は行っていない（フィルター側1件は §2 の記録外変更で解消）。
3. **Fit の残存**: Fit.plot は未検証のまま（Fitter.java 未取得のため表示内容を確定できない。理由文は是正済み）。対応範囲外の組み込み式・カスタム式は Nelder-Mead 依存として名指し未検証停止。Fit.logResults の Status／iterations／time／標準偏差行は再現しない（caution 開示済み）。
4. **範囲限定つき格上げの残部**: Plot.getLimits の自動範囲、RoiManager.rotate の oval／traced／composite、Roi.getContainedPoints／getFeretPoints／getSplineAnchors の対応形状以外、Plot.showValues(WithLabels) の小数桁メタデータ、toScaled／toUnscaled のプロット付随時 descaling — いずれも名前・理由を挙げた未検証停止または caution 開示の形で残置。
5. **ConvertTo-Html の細部**: 行分割位置・colgroup 内部・エスケープ細部はモデル慣行として開示済み。実 pwsh での実測照合は CI／親工程の範囲。
6. **文字列展開の残存（FIX-PS-A2 §6-1 の継承）**: `"x$$y"` のように `$$` の直後に通常変数名が続く形は、後半が通常変数展開として処理される既存挙動のまま（本修正群では触れていない）。
7. **引数モードの `??`**: 括弧なし引数位置の `??` 連鎖は対象外（FIX-PS-A から引き継いだ範囲注記）。
8. **T4 の未確認事項の継承**: PS-26（$Matches）／PS-40a（ConvertFrom-Json）は監査チームの実行系エスケープ起因で未確定のまま。全935項目の説明文の逐語照合は実施範囲外（実施範囲で見つかった矛盾は D1／D4／D5／D7／D8 として処置済み）。用語集の収載漏れ候補（IJ「スライス」「ヒストグラム」、PS「エイリアス」）は軽微な改善候補として未処置。
9. **IJ-R5／IJ-R6（KD-1／KD-2）**: §3(d) のとおり本ツリーでは現存し、簡易班の修正との統合は修正統合工程の範囲。

---

## 7. 触ったファイル（本仕上げコミット分。d9a6b87 の FIX-SH 分を除く）

| ファイル | 担当修正 |
|---|---|
| `js/types/imagej/engine-advanced-pure.js` | FIX-IJ-A（移植ヘルパー＋3ハンドラ）、FIX-IJ-B（wavelengthToColor、理由文） |
| `js/types/imagej/engine-advanced-state.js` | FIX-IJ-B（Color／Fit／Plot／Table／Roi／Stack／REF ハンドラ群、理由文、裁定メモ） |
| `js/types/imagej/engine-advanced.js` | FIX-IJ-B（advancedRefMaps） |
| `js/types/imagej/engine.js` | FIX-IJ-B（REF 接続のみ: import／evCall／readRef） |
| `js/types/imagej/index.js` | 記録外変更（§2-2: フィルタ表記） |
| `js/types/imagej/reference-advanced.js` | FIX-IJ-A／FIX-IJ-B（status／caution／例文） |
| `js/types/powershell/engine-advanced-cmdlets.js` | FIX-PS-B（格上げ6ハンドラ、Join-Path、再分類、理由文） |
| `js/types/powershell/engine-advanced-ops.js` | FIX-PS-A（D1、D6） |
| `js/types/powershell/engine-advanced-vars.js` | FIX-PS-B（$ConsoleFileName、理由文） |
| `js/types/powershell/engine.js` | FIX-PS-B（execBlock 追加）、記録外変更（§2-1: 文字列展開の \$\|\^） |
| `js/types/powershell/index.js` | FIX-PS-B（論理演算子の開示、inventoryNames）＋FIX-SH 残部 |
| `js/types/powershell/parser.js` | FIX-PS-A（D2、D3、D5／D10）、FIX-PS-A2（$$／$^） |
| `js/types/powershell/reference-advanced.js` | FIX-PS-B（status／理由文／開示／例文） |
| `tests/adv-b3-imagej-pure.test.js` | FIX-IJ-A（3件）、FIX-IJ-B（1件）の期待値更新 |
| `tests/adv-b3-imagej-state.test.js` | FIX-IJ-B（9件）の期待値更新 |
| `tests/adv-b3-powershell.test.js` | FIX-PS-B §5 コーディネーター対応事項（2件） |
| `tests/adv-b3-ps-operators.test.js` | FIX-PS-A（D1 期待値是正） |
| `tests/lane-a3-ija.test.js`／`lane-a3-ijb.test.js`／`lane-a3-ijb-simple.test.js`／`lane-a3-psa.test.js`／`lane-a3-psb.test.js` | 新規回帰テスト（計102件） |
| `docs/audit/lane-a3-fix-ija.md`／`lane-a3-fix-ijb.md`／`lane-a3-fix-psa2.md`／`lane-a3-fix-psb.md` | 修正記録（FIX-SH 分は d9a6b87 に同梱済み） |
| `precache.js` | 本仕上げで再生成（§5） |
| `docs/audit/LANE-A3-EXEC.md` | 本報告書 |
