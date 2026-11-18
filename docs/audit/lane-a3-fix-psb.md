# FIX-PS-B 修正報告書（PowerShell コマンドレット・自動変数・リファレンス）

- 担当：高度A3班 修正チーム FIX-PS-B
- 作業ツリー：`~/workspace/programming-practice-audit/work/lane-a3-fix-psb`（土台 lane-a3-exec、HEAD 04dfe2d）
- 根拠資料：`lane-a3-t2/docs/audit/lane-a3-t2-w2-ps.md`（§3 格上げ導出・§4 個別裁定・§5 台帳）、`lane-a3-t4/docs/audit/lane-a3-t4-ops-data.md` §3（D4／D5／D8／D11）
- 一次情報：Microsoft Learn（PowerShell 7.4 ビュー、取得日 2026-11-18）
- **期待値の性質に関する明記**：この VM には実 pwsh が存在しないため、本修正の期待値はすべて Learn の記述と .NET の仕様からの**導出**であり、実機 PowerShell での**実測ではない**。

## 1. 実装・是正内容

### A. 格上げ実装（未検証→対応）7件 — `engine-advanced-cmdlets.js`／`engine-advanced-vars.js`／`reference-advanced.js`

1. **ConvertTo-Html**（新規 `run` ハンドラ）
   - 既定 DOCTYPE は Learn 例示出力どおりの XHTML 1.0 Strict 文字列（URL 前の空白2つを含む）。既定 Head は `<title>HTML TABLE</title>`。
   - -As 既定 Table：最初のオブジェクトのプロパティが列見出し、欠けたプロパティは空セル、余分なプロパティは含めない。-As List は2列表（プロパティ名／値）。
   - -Fragment は表ブロックのみ（Learn Example 7 の実出力の形）。-Title／-Head／-CssUri／-Body／-PreContent／-PostContent を反映。出力は文字列の配列。
   - **行分割の慣行（開示）**：文字列配列への行分割位置の細部は Learn から確定できないため、分割は「Learn の例示出力の構造要素（DOCTYPE／html／head／head 内容／body／table／colgroup／見出し行／各データ行）を1要素ずつ」とする本モデルの慣行を採用し、reference の caution に明記した。colgroup は列ごとの `<col />` を1行にまとめる。セル文字列は & ＜ ＞ の基本エスケープのみ。
   - 計算プロパティ（スクリプトブロック式・Width／Alignment／FormatString 指定）、-Meta／-Charset、スカラー入力・配列の -InputObject 渡しは、確定できない形式として**名指しで未検証停止**に倒した。-Transitional の DOCTYPE は Strict 版からのパターン導出である（Strict 版と同形式で Transitional//EN に置換したもの）。

2. **Get-MarkdownOption／Set-MarkdownOption**
   - セッション状態は実行単位（`ctx.s.ps.markdownOption`）に保持し、再実行では既定値に初期化される（漏れないことをテストで固定）。
   - Get- は Learn Example 1 の既定11プロパティの正確な ANSI 値列を PSMarkdownOptionInfo 型で返す。
   - Set- は Learn のパラメータセット（個別設定／-Theme Dark|Light／-InputObject）を実装。Light テーマ値は Learn のとおり。値の検証は正規表現 `^\[*[0-9;]*?m{1}`。-PassThru で設定後のオブジェクトを返す。
   - 従来エンジンにあった誤ったパラメータ名（header1、bold、emphasis1 等）を Learn の実パラメータ名（Header1Color…Header6Color、Code、ImageAltTextForegroundColor、LinkForegroundColor、ItalicsForegroundColor、BoldForegroundColor）へ是正した。旧名はパラメータ束縛エラーになる。

3. **Import-PowerShellDataFile**
   - モデルの仮想 FS から .psd1 を読み、定数値のみの再帰下降パーサで評価して Hashtable を返す。式・コード（コマンド呼び出し、$ 付き二重引用符文字列、バッククォート等）が含まれれば実 PS どおりエラーにする。
   - 制限は Learn どおり 500 キー／5000 AST ノード。-Path（ワイルドカード可・最初の一致のみ）／-LiteralPath／-SkipLimitCheck を実装。

4. **Update-List**
   - PSCustomObject の配列プロパティへの -Add（末尾へ指定順に追加）／-Remove（一致項目をすべて削除）／-Replace（全体置換。-Add／-Remove と同時指定はエラー）。
   - -Property 指定時は更新後のオブジェクトを返し、省略時は変更セット（Add／Remove／Replace をキーとするハッシュテーブル）を返す。IList でないプロパティへの適用はエラー。

5. **Measure-Command**
   - スクリプトブロックを現在のスコープで実行する（入力がある場合は入力ごとに `$_` を設定して実行し、状態は順に引き継ぐ）。ブロックの出力は表示しない。戻り値は TimeSpan 型の「実行時に決まる値」（Get-Date／Get-Random と同じ未確定値の機構）。
   - 実物は合計の計測時間を1つの TimeSpan として返すため、入力が複数でも返す値は1つにした（入力ごとに結果を返すと同一状態が複製され、後段の文が二重実行される不具合を実測して是正した）。
   - **制約の開示**：名前付き形式 `-Expression {…}` は、エンジンが名前付き引数を事前評価する既存の制約（基礎 Where-Object の -FilterScript 名前付き形と同種）により、ディスパッチ前に停止する。位置引数のスクリプトブロック形が対応形であり、reference の caution にこの制約を明記した。

6. **$ConsoleFileName**
   - モデルに .psc1 読込経路が存在しないため、AUTOVARS の確定値として空文字列を登録した。

### B. 再分類（宣言側）
- **ConvertTo-CliXml／ConvertFrom-CliXml** → unsupported（reference・レジストリ両方）。理由文は裁定どおり「PowerShell 7.5-preview.4 で導入されたコマンドレットであり、本モデルが対象とする PowerShell 7.4 には存在しないため」。
- **リダイレクト 2>／2>>／2>&1** → unsupported。理由文は裁定どおり「リダイレクト基盤（ストリームのファイル転送・マージ）がモデルに無く、エラーストリームは値としてモデル化されていないため」。
- **$$／$^** → **コーディネーター裁定変更（2026-11-18）により再分類を取り消し**、未検証のまま据え置いた。波括弧形 `${$}`／`${^}` が既に AUTOVARS の未検証ハンドラで「ラベルつき未確定値」を返す設計（既存テスト adv-b3-powershell.test.js 357行で固定）と整合させるためである。本チームの担当は宣言側の理由文統一のみ：reference の caution とエンジン側の未検証理由を「対話行入力（セッションが受け取った最後の行）がモデルに保持されておらず、最後の行の最初／最後のトークンを確定できないため」に統一した。裸形のパーサ受理（挙動側）は FIX-PS-A2 の担当。

### C. 理由文の書き換え（未検証のまま）10件
T2 報告書 §4 の修正案どおり、reference の caution とエンジン側の停止理由文を統一した：ConvertFrom-Markdown、ConvertTo-Xml、Get-Culture、Get-UICulture、Get-Member、Get-PSCallStack、Get-Verb（以上 `engine-advanced-cmdlets.js` の UNVERIFIED 理由）、$input、$MyInvocation、$PSCmdlet（`engine-advanced-vars.js` の未検証理由）。宣言と実挙動（停止文言）の一致は回帰テストで固定した。

### D. 開示・例文の是正
1. **-xor の裁定差**：高度の -xor 項目と基礎「論理演算子」項目の caution に「モデルでは -and が -or／-xor より強く結合します（実 PowerShell では -and／-or／-xor は同格で左結合です）」を開示。
2. **-is の数値型裁定**：-is 項目の caution に「モデルの整数値は int 相当として判定します（実 PowerShell で long になる大きな整数リテラルでも int として判定されます）」を開示。
3. **New-Object**：例文を対応範囲で動作する PSObject 形式（`New-Object -TypeName System.Management.Automation.PSCustomObject -Property @{Name='x'}`）へ差し替え、caution に対応範囲（PSObject 形式のみ、System.Version 等の .NET 型は未対応停止）を開示。
4. **Tee-Object**：caution に、オブジェクト値の整形が未検証として停止する制限を開示（Out-File／Out-String の開示と同水準）。
5. **Join-Path**（コーディネーター実測の新規欠陥）：戻り値を純粋な結合文字列に是正した（`Join-Path "a" "b"` → `a\b`。相対パスの絶対化を廃止）。第3位置引数以降は「未対応：Join-Pathの追加の位置引数」としてエンジン既存のパラメータバインドエラーの慣行でエラーにする。-Resolve は結合したパスに対して存在確認する形に改めた。reference の Join-Path 項目の文面も実態に合わせた。Split-Path は元来文字列ベースであり整合を確認した。絶対パスを使う既存テスト（adv-b3 の Join-Path 3件）は純粋結合でも同じ結果になるため一次情報どおり両立する。

### E. 検索到達性（T4-D11 のデータ側）
基礎 reference の constructs マップに任意要素 `inventoryNames` を追加できるよう拡張し（検索述語そのものは不変更）、次の正式綴りを各項目の検索フィールドに追加した：三項演算子 ← `? :`、配列 ← `[ ]`・`@( )`、ハッシュテーブル ← `@{}`、算術・代入演算子 ← `( )`、文字列 ← `$( )`。
- **判断の記録**：`( )`（グループ化）の帰属は、基礎 reference に独立したグループ化項目が存在せず、丸括弧を扱う項目が「算術・代入演算子」（括弧による優先順位を含む）であるため同項目とした。`[ ]` は添字項目ではなく配列項目に付けた（T4-D11 の対応付けどおり）。

## 2. 対象外ファイルへの変更（逸脱の申告）
- **`js/types/powershell/engine.js`（基礎エンジン）**：Measure-Command のスクリプトブロック実行には、基礎エンジン内部の `capture`／スコープ機構へアクセスする口が必要だったため、`command()` 内に `execBlock` クロージャを追加し、高度コマンドレットの ctx に渡す変更を1件だけ加えた（diff は2ハンクのみ：クロージャ定義と ctx への追加）。対象ファイル一覧に含まれないファイルへの変更であるため、ここに明示する。変更は高度コマンドレットからのみ到達可能で、基礎の挙動には影響しない（全テストスイープで確認）。

## 3. 触ったファイル
- `js/types/powershell/reference-advanced.js`（宣言側：格上げ7件の status、再分類、理由文、開示、例文）
- `js/types/powershell/engine-advanced-cmdlets.js`（新規 `run` ハンドラ6件、Join-Path 是正、再分類、理由文）
- `js/types/powershell/engine-advanced-vars.js`（$ConsoleFileName 確定値、$$／$^・$input・$MyInvocation・$PSCmdlet の理由文）
- `js/types/powershell/engine.js`（上記 §2 の execBlock 追加のみ）
- `js/types/powershell/index.js`（基礎項目：論理演算子の開示、inventoryNames 拡張と6綴りの追加。scan 関数には触れていない）
- `tests/lane-a3-psb.test.js`（新規、回帰テスト21件）
- `docs/audit/lane-a3-fix-psb.md`（本報告書）
- `js/types/powershell/engine-advanced.js` は内容変更なし（検証のみ）。

## 4. 検証結果
- 新規回帰テスト `tests/lane-a3-psb.test.js`：**21件全通過**（TZ=UTC）。
- 既存 PowerShell 関連テスト：powershell.test.js／adv-b3-ps-operators.test.js／muse-fix-batch9-powershell.test.js の125件は全通過。adv-b3-powershell.test.js は50件中48件通過し、失敗2件はいずれも本修正の設計どおり（§5 のコーディネーター対応事項）。
- 全テストスイープ（TZ=UTC、全 tests/*.test.js を2分割で実行）：**7,185件中7,183件通過**。失敗は adv-b3-powershell.test.js の設計どおりの2件のみ（§5-1）。基準線（TZ=UTC 全通過）を超える失敗は無い。
- ローカルコミット：作業完了時点で exec 経由の書き込みが回復していたため、ツリーを実ファイル化（次項 §6）した上でローカルコミット済み。`git status` は清浄。実体化後のツリーでも PowerShell 関連テスト196件を再実行し、結果は同一（194件通過、失敗は設計どおりの2件のみ）であることを確認した。

## 5. 残存事項（コーディネーター対応事項）
1. **既存テスト adv-b3-powershell.test.js の期待値更新（2件）**：本修正の設計どおりに失敗する既存テストが2件ある。同ファイルは本チームの対象外のため編集していない。
   - レジストリ件数テスト：期待値 {run: 50, unsupported: 166, unverified: 34} → 正しくは **{run: 56, unsupported: 168, unverified: 26}**（総数250は不変。格上げ6件＋再分類2件の内訳）。
   - 自動変数テスト（357行）：`$ConsoleFileName` が未検証リストに含まれているが、格上げにより確定値 `""` を返すようになったため、同リストから除外する更新が必要。
2. **裸形 $$／$^ のパーサ受理**は FIX-PS-A2 の担当（本チームは宣言側の理由文統一まで）。
3. ConvertTo-Html の行分割位置・colgroup 内部・エスケープ細部の確定は、実 pwsh での実測が可能な環境が別途必要（本モデルでは慣行として開示済み）。

## 6. 作業上の記録
- 本 VM の exec 経由のファイル書き込みが EPERM で全面ブロックされたため、作業ツリーは lane-a3-exec からのシンボリックリンク森として構築し、編集対象ファイルのみ実コピーを自ツリー内に作成して編集した。テスト実行時は Node のシンボリックリンク解決で実体（lane-a3-exec 側）が読まれるのを防ぐため、`--preserve-symlinks --preserve-symlinks-main` を付けて自ツリーのコードを実行している（この注意なしに実行すると他ツリーのコードでテストが通ってしまう）。
- 編集の正確性は、各ファイルについて元ファイルとの `diff -U0` で「残る差分は意図した編集のみ」であることを確認した（特に engine.js は2ハンクのみ）。
- 作業の最終段階で exec 書き込みが回復したため、コミットに先立ちシンボリックリンク森（966件）をすべて実ファイルへ実体化した。現在のツリーは自己完結しており、preserve-symlinks フラグなしでテストが実行できる。
