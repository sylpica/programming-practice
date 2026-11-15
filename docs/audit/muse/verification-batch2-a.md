# 独立検証報告 VERIFY-A（修正バッチ2・独立検証班A）

- 対象ツリー: `~/workspace/programming-practice-audit/work/fix-batch2/verify-a/`（修正済み統合ツリーのスナップショット）
- 検証者: 独立検証班A。コードは一切修正していない（本報告ファイルの追加のみ）。GitHub 書き込み・commit なし。
- 方法: 所見原文（findings-narrcheck / msgcheck / perfcheck / a11ycheck / storecheck / tplcheck / jpcheck / doccheck、verification-reffix の D1・D2）の再現手順を、修正後ツリーで**独立に書いたプローブ**（`/tmp/verify-a-probe.mjs`、`/tmp/verify-a-probe2.mjs`、`/tmp/verify-a-probe3.mjs`、`/tmp/verify-a-probe4.mjs`）で全件実行し、trace・出力・最終状態・文書実数値と照合した。文面項目は定義実体と個票 `reference-r2.json`／`reference-r6.json` の同期まで機械照合した。
- 独立実行の全体結果:
  - `npm test`: **2,493件・全合格（fail 0）**（所要約64秒）
  - native-audit（`PATH="$HOME/dotnet:$PATH" python3 tests/native-audit.py </dev/null`）: **正常終了**。`{"new_native_oracles": 64, "all_passed": true}`／`{"checks": 303, "C_CPP_stdout_matches_simulator": true, "Csharp_native_execution": 59, "Csharp_expected": 59, "Csharp_skipped": 0, "python_execution": 167}`
  - 機械集計した現在の実数: 全15種類、テンプレート **104**、リファレンス **995（対応933／参照専用62）**、用語集 **111**。種類別リファレンス: VBA 91、ImageJ 201、CloudFormation 176、Power Automate 15、AutoHotkey 26、UI.Vision 22、Power Apps 28、Python 165、R 44、C 26、C++ 31、C# 53、JavaScript 39、cmd 28、PowerShell 50。

## 総括

| 区分 | 対象 | 解消 | 一部解消 | 未解消 |
|---|---:|---:|---:|---:|
| NX-N1〜28（narrcheck） | 28 | **28** | 0 | 0 |
| M-N1〜6（msgcheck） | 6 | **6** | 0 | 0 |
| P-N1〜4（perfcheck） | 4 | **4** | 0 | 0 |
| A-N1〜7（a11ycheck） | 7 | **7** | 0 | 0 |
| S-N1〜3（storecheck） | 3 | **3** | 0 | 0 |
| T-1（tplcheck） | 1 | **1** | 0 | 0 |
| J-N1＋Y-1〜5（jpcheck） | 6 | **6** | 0 | 0 |
| D-N1〜10（doccheck） | 10 | **9** | **1（D-N2）** | 0 |
| reffix D1（未カバー表面） | 4群・9表面 | **9表面すべて** | 0 | 0 |
| reffix D2（不整合） | 8 | **8** | 0 | 0 |
| 合計 | 77番号（D1を表面で数えると82） | 76番号 | 1番号 | 0 |

- 未解消は **0件**。一部解消は **D-N2 の1件のみ**（詳細は §8 と §10）。
- 新規検出（原文リスト外）: **1件** — バッチ2の文書更新が参照する `docs/audit/MUSE-FIX-BATCH2.md` がツリー内に存在しない（§10）。観察2件（§11）。

---

## 1. narrcheck NX-N1〜28

全件、原文の再現プログラムを修正後ツリーで実行して確認した（プローブ1: 39チェック全PASS。NX-N5・NX-N10 は C／C++／C# の3種類それぞれで確認）。

| ID | 再現手順（修正後ツリーでの実行結果） | 判定 |
|---|---|---|
| NX-N1 | AHK `for v in [10,20,30]`＋`break`（v=20）: total=**10**、出力 "10"、trace に「ループを抜けます」があり「繰り返し 3回目」なし | 解消 |
| NX-N2 | 同型 `continue`: total=**40**、出力 "40"、「繰り返し 3回目」に到達 | 解消 |
| NX-N3 | Power Apps model `variables:{x:9}` で `Set(X,5); Notify(Text(X))`: 出力 **"5"**、変数は単一キー `x=5` のみ | 解消 |
| NX-N4 | `collections:{items:[3件]}` で `ClearCollect(Items,{Value:99})`: 出力 **"1"**、単一キー・1件に置換。兄弟表面 Collect も出力 "4"（既存へ追記）を確認 | 解消 |
| NX-N5 | do-while（本体1回）を C／C++／C# で実行: いずれも終了注記は「**1回実行してループを終了します**」、出力 11（「0回実行」は消滅） | 解消 |
| NX-N6 | C: `unsigned char d=c+100`→出力 **200 44**、`=-1`→**255**、`=260`→**4**、`unsigned int 3000000000`→受理、`4294967295+1`→**0**、`unsigned short 70000`→**4464**。符号付き `short 40000` は従来どおり「処理系依存」で停止（誤適用のみ是正） | 解消 |
| NX-N7 | ImageJ 三項: 真側のみ実行され出力 `f called`／`1` のみ（g の実行・出力なし）。未選択側の範囲外添字 `arr[99]` でも停止せず x=10 | 解消 |
| NX-N8 | PowerShell `Write-Output $?`／`Write-Host $?`: いずれも **True**（文字列 "?" ではない） | 解消 |
| NX-N9 | VBA 配列代入: trace は「a(0) ← **2**」「a(1) ← **4**」（銀行丸め後の格納値）、`True`→「a(0) ← **-1**」、`Range("B2")`→「a(0) ← **85**」 | 解消 |
| NX-N10 | do-while 初回反復の break／continue を C／C++／C# で実行: break 版は出力 **1** で正常終了、continue 版は出力 **12**（「繰り返しの外では使えません」の誤停止なし） | 解消 |
| NX-N11 | ImageJ `while(i<150)`: 打ち切り注記は出るが「終了します」のステップは**なし**、print 未実行。通常終了（3回）の場合は「繰り返しは全 3 回で終了します」が従来どおり出る | 解消 |
| NX-N12 | 分布なし画像への `run("8-bit")`: 「**現在の値の範囲はモデルでは未確定です**」。分布ありの対照では実範囲（0〜255）が従来どおり引用される | 解消 |
| NX-N13 | 未確定保存先の `saveAs`: 「保存します」の断定ステップは**出ず**、「未確認：保存先のパスが未確定です」で停止、出力なし | 解消 |
| NX-N14 | AHK `SetTitleMatchMode 3`: trace は「タイトル一致モードを **3（完全一致）に設定します**」、groups のモード表示も「3（完全一致）」、WinExist は 0（完全一致の効果と一致） | 解消 |
| NX-N15 | Power Apps context `{a:1}` で `UpdateContext({A:2})`: 読み戻し **"2"**、コンテキストは単一キー `a=2` | 解消 |
| NX-N16 | Power Automate Increase: +5→「Count を 15 に**増やします**」、+0→「Count は 15 のまま**変わりません**」、-3→「Count を 12 に**減らします**」、最終値12 | 解消 |
| NX-N17 | PowerShell `Get-ChildItem \| Select-Object Name,Length`: フォルダ logs は「Length : **$null**」。`Measure-Object Length -Sum` は **Sum=46／Count=3**（捏造の1が混入しない）。`[pscustomobject]@{Name="A"}` の `.Length -eq $null` は True | 解消 |
| NX-N18 | VBA 後判定 Do: 終了ステップ「1回実行してループを終了します」の帰属行は **Loop 行（5行目）**、x=11 | 解消 |
| NX-N19 | C# foreach 終了後: 反復変数 `x` は最終 vars にも groups にも**残らない**、出力 "1" | 解消 |
| NX-N20 | ImageJ getPixel: コードで書いた (3,4)=77 は「このコードで書き込んだ値」、モデル既定の (0,0)=100 は「**モデルで予め与えられた値**」と区別される | 解消 |
| NX-N21 | `for (var i = 0; ...)`: 開始ステップは「for の繰り返しに入ります（**var i = 0**）」（「（…）」プレースホルダなし）、出力 0,1,2 | 解消 |
| NX-N22 | AHK `Send "{Enter}"`: 説明は「「メモ帳」へ **{Enter}** を入力します」（実改行の埋め込みなし）、モデル側の text には "\n" が正しく入る | 解消 |
| NX-N23 | AHK 添字代入: 「**a[2] に 99 を代入します**」「**a[1] に 15 を代入します**」（「対象 に」は消滅）、最終値 [15,99,30] | 解消 |
| NX-N24 | UI.Vision 効果未定義要素の click: 「**モデルに効果は定義されていません**」。onClick 定義ありの対照では「定義された効果を反映します」＋実際に効果が反映される | 解消 |
| NX-N25 | UI.Vision break→「**ループを抜けます**」、continue→「**次の繰り返しへ進みます**」（コマンド名そのままの文はなし） | 解消 |
| NX-N26 | CloudFormation テンプレートモード groups「テンプレート断片／入力」: **Transform キーを含まない**実際に渡した断片（Resources のみ）が示される | 解消 |
| NX-N27 | PowerShell `Write-Host "a","b" -Separator "-"`: 画面出力は **"a-b"** | 解消 |
| NX-N28 | cmd `set X=`: trace は「**X を未定義にします（削除します）**」、最終 vars に X なし | 解消 |

## 2. msgcheck M-N1〜6

| ID | 再現結果 | 判定 |
|---|---|---|
| M-N1 | PS 対応パラメーターの値不足6件（`Get-ChildItem -Path`／`-Filter`、`Get-Content -Path`、`Set-Location -Path`、`Test-Path -Path`、`Remove-Item -Path`）はすべて「**…の値が必要です**」（未対応とは言わない）。真に未対応の `-Credential` は値あり／なしで**同一文言・同一カテゴリ**の「未対応のパラメータ」 | 解消 |
| M-N2 | JS BigInt: `10n+1`→「**BigIntと通常の数値は混ぜて演算できません**」、`10n/0n`・`10n%0n`→「**0で割ることはできません**」（V8 の英語文言の漏出なし）。同型演算 `10n+20n` は正常動作 | 解消 |
| M-N3 | JS `const a=1; a=2;`→「**const で宣言した変数には再代入できません**」（英語文言なし） | 解消 |
| M-N4 | cmd 引数不足9表面すべてが不足を名指しする: find→「findには検索文字列が必要です」、copy→「copyにはコピー元とコピー先が必要です」、ren→「renには元のパスと新しい名前が必要です」、type→「typeにはファイル名が必要です」、goto→「gotoにはラベルが必要です」、if／for→条件・ループ変数等の不足を伝える文言（「未対応のcmdコマンド」ではない）、md→「mdにはフォルダ名が必要です」（無言成功ではない） | 解消 |
| M-N5 | AHK 定義済み変数の呼び出し: `x()`→「**x は関数ではありません（数値は呼び出せません）**」、`arr()`→配列版も同様。未知関数 `UnknownFunc(1)` は従来どおり「未対応です：UnknownFunc」 | 解消 |
| M-N6 | Power Automate 未定義変数への Increase→「**変数がありません：Nope**」。文字列変数への Increase は従来どおり「数値型の変数と増分が必要です」（区別が付く） | 解消 |

## 3. perfcheck P-N1〜4

P-N1 の OOM 再現は**子プロセス＋メモリ上限（`--max-old-space-size=512`）で封じ込めて**実行した。

| ID | 再現結果 | 判定 |
|---|---|---|
| P-N1 | 文字列倍々40回を8系統（VBA／JavaScript／ImageJ／PowerShell／AutoHotkey／cmd／C#／C++）で子プロセス実行: **全系統が異常終了せず**（status 0）、結果サイズは 24,604〜292,624 バイト（上限200万バイト未満）。cmd は「展開後の文字列が長すぎます（上限は200000文字です）」、C#／C++ は「文字列が長くなりすぎて処理できませんでした」という日本語の上限文言で止まる | 解消 |
| P-N2 | VBA 倍々25回: 結果 JSON は **55,737バイト**（修正前 約134MB）。長い文字列の表示は省略記法つきで切り詰められる（`formatValue` 5000文字→1,036文字、「省略」「全5000文字」の表示あり） | 解消 |
| P-N3 | C++ `std::string` 倍々: 停止文言は日本語「文字列が長くなりすぎて処理できませんでした。文字列を短くして再実行してください。」で、**"Invalid string length" の漏出なし** | 解消 |
| P-N4 | C 準備コスト: 1,000文 **82ms** → 4,000文 **200ms**（最小値・3回測定、伸び約2.45倍で線形圏。修正前実測は約14倍）。準備段階も時間上限の対象になり、`milliseconds:1` では「解析時間の上限で停止しました」と日本語で正直に打ち切る。VBA 側の後処理（使用関数解決）も確認: 11分岐・512パス・打ち切りで約1,290ms、trace への refs 付与も機能（修正前の同条件 3,693ms から改善） | 解消 |

## 4. a11ycheck A-N1〜7

コントラストは style.css の実色から WCAG 相対輝度式で**独立に再計算**した。

| ID | 再計算・確認結果 | 判定 |
|---|---|---|
| A-N1 | `--muted` は **#5c6f63** に変更。白 5.37／ページ背景 4.98／シート見出し背景 4.77／出力背景 4.90／pale 4.84 — **全て 4.5:1 以上** | 解消 |
| A-N2 | 行番号色は `var(--muted)`（#5c6f63）／背景 #f2f5f0 で **4.88:1**（旧色 #a1b0a6 は適用 CSS から消滅） | 解消 |
| A-N3 | `--focus` は **#b07d1a**。白 3.62／背景 3.36／pale 3.26 — **全て 3:1 以上**。`:focus-visible` と選択アウトラインの両方が共有変数を参照 | 解消 |
| A-N4 | 本質的な境界（button／input・select／シートセル／chip／#modelJson／アクションカード）は `--border-strong` **#7a8a7e（白に対して 3.64:1）** に統一。なお装飾的な区切り線には旧 `--border` #dce5df が残るが、これはコンポーネント識別に必要な境界ではなく、CSS コメントでも装飾用と明示して分離されている（原文の対象は入力欄・セルの識別境界であり、その表面は解消） | 解消 |
| A-N5 | `applyResult` が打ち切り詳細を `limitText` として組み立て、視覚表示（#limit）と **live region（#resultStatus）の両方**に同じ文言を入れることをソースで確認 | 解消 |
| A-N6 | `#refDetail` の article タグに `aria-live="polite"` と `aria-atomic="true"` が付与されていることを index.html で確認 | 解消 |
| A-N7 | `preferredScrollBehavior()` を抽出して実行: `prefers-reduced-motion` 一致時→"auto"、不一致時→"smooth"。app.js／action-editor.js とも無条件の `behavior:"smooth"` は残っていない | 解消 |

## 5. storecheck S-N1〜3

js/app.js から純関数（parseLegacyV1／retryPendingRecoveries／fileDraft）を**独立に抽出して実挙動を確認**し、save() の制御フローはソース上の順序で裏取りした。

| ID | 確認結果 | 判定 |
|---|---|---|
| S-N1 | save() は v3 書き込み成功の直後（try 内）に `$("storageNotice").hidden = true;` を実行し、失敗時（catch）に `hidden = false` にする。成功後に通知が残る経路はない | 解消 |
| S-N2 | save() は `storageBlocked` のとき毎回 `retryPendingRecoveries()` を再試行し、全て保全できるまで v3 を上書きせず、成功したら `storageBlocked = false` で通常保存へ復帰する。抽出した retry 関数の実挙動でも、失敗中は pending が残り、回復後は書き込まれて pending が空になることを確認 | 解消 |
| S-N3 | `parseLegacyV1('"hello"')`／`parseLegacyV1('[1,2]')` はともに `{kind:"empty"}`（数字キーの混入なし）、正規のオブジェクトは `{kind:"draft"}` で取り込まれる。起動時の v1 読み込みも parseLegacyV1 経由に変わっている | 解消 |

## 6. tplcheck T-1

| ID | 確認結果 | 判定 |
|---|---|---|
| T-1 | VBA `each` テンプレートの intro は「ループ変数cellには各セルの参照がそのまま渡されるため、オブジェクト変数への通常の代入で必要なSetは、For Eachでは書きません」と、**コードにない Set を「学べる」とは述べず、Set が不要な理由を説明する**文面に変わっている。コード内に Set は依然なく、実行結果も A1:A5 すべて 100 で正常 | 解消 |

## 7. jpcheck J-N1／Y-1〜5

定義実体の全フィールド（リファレンス／テンプレート／用語集／semantics）＋ js ソース＋index.html を機械走査した。

| ID | 確認結果 | 判定 |
|---|---|---|
| J-N1 | 「64ビットビット演算」は **0件**、「64ビットのビット演算」が3件（semantics と停止理由の両表面を含む） | 解消 |
| Y-1 | 定義フィールド内の長形（フォルダー／カウンター／サーバー／ユーザー／パラメーター等）は **0件**、短形に統一（フォルダ 47件・カウンタ 16件など）。js ソースに残る長形は開発者向けコメント内のみ（例: engine.js のコメント「ユーザー関数」）で、利用者向け文面には残っていない | 解消 |
| Y-2 | 「返り値」は定義フィールド・js ソースとも **0件**（「戻り値」328件に統一。MsgBox の caution も「押したボタンの戻り値は扱いません」） | 解消 |
| Y-3 | 全角チルダ U+FF5E は **0件**、波ダッシュ U+301C に統一（104件） | 解消 |
| Y-4 | 「。＋半角スペース」は全フィールドで **0件**。ImageJ の定型 caution の先頭スペースも除去済み。なお対象範囲外の観察として、PowerShell「変数」項目の **syntax フィールド**に先頭スペース（`" $name = 値"`）が1件残る（§11。原文 Y-4 の対象は prose フィールドの句点後スペースと caution 先頭スペースであり、その範囲は解消） | 解消 |
| Y-5 | caution の全 sentences を文単位で分類し、種類ごとの description 多数派文体（vba／powerautomate／autohotkey／uivision／powerapps／r／c／cpp／csharp／javascript／cmd／powershell = polite、imagej／cloudformation／python = plain）と照合: **違反 0件** | 解消 |

## 8. doccheck D-N1〜10

文書の主張を、定義データの機械集計（種類別件数・段階内訳・総数）と `npm test` 実測（2,493件）で照合した。

| ID | 照合結果 | 判定 |
|---|---|---|
| D-N1 | REQUIREMENTS の R6 表「現在のリファレンス数」と結びの文が現在値に更新され、**種類別15種類すべてと合計が実数と完全一致**（合計 **995（対応933／参照専用62）**、例: Python 165、ImageJ 201、PowerShell 50）。旧「511リファレンス」を現在値とする記述は消滅。ただし同文が参照する `docs/audit/MUSE-FIX-BATCH2.md` が存在しない問題が別途ある（§10） | 解消（数値・表）。参照先の欠落は新規検出として §10 に分離 |
| D-N2 | 原文が求めた部分は実施済み: PROGRESS 末尾に「第22ラウンド修正〜CI是正（RG-87〜RG-144）」節が追加され、「現在の状態」表の cmd／PowerShell 行も「実装済み・Muse監査済み／8教材／28参照・45参照」に現行化された。**しかし修正バッチ2自体の節目が PROGRESS に記録されておらず**、PROGRESS の最新「現在の状態」は HEAD `91efaff` 時点の **978リファレンス／テスト2,055件** のままで、現在のツリー実数（**995／2,493件**）と食い違う。DEVELOPMENT／REQUIREMENTS はバッチ2後の値に更新されているため、文書間の不整合として残る | **一部解消** |
| D-N3 | DEVELOPMENT 種類表の JavaScript 行は対応範囲側に「BigInt リテラルと BigInt 同士の演算」を明記し、未対応は「Symbol等」に限定されている | 解消 |
| D-N4 | DEVELOPMENT 種類表・VBA semantics とも「**動的配列の要素参照・ReDim（宣言のみ対応）**」等の限定表記に是正（宣言のみ受理・要素参照はエラー9・ReDim は未対応停止という実挙動とも一致） | 解消 |
| D-N5 | DEVELOPMENT 冒頭は「Muse／Codexの独立監査は第22ラウンド（CodexはR6）まで実施され、各修正バッチ（RG-87〜RG-144）を適用済みです。二重監査の収束は宣言していません」に現行化。「第2ラウンド修正中」「二重監査は未実施」の記述は消滅 | 解消 |
| D-N6 | 台帳（consolidated-residual-register.md）冒頭に「**注記（D-N6 是正、2026-11-15）**: 本冒頭の前提文は作成時点（RG-48 まで）のものであり…現行状態は末尾の各「処置結果」節を参照すること」という注記が追加され、旧前提文にも「（作成時点の前提。上の注記を参照）」が付記されている（課題文の想定どおりの処置） | 解消 |
| D-N7 | REQUIREMENTS の ImageJ 段階内訳は第一表・R6 表とも **基礎5／実践1／応用4** で、データの level 集計（基礎5／実践1／応用4）と一致 | 解消 |
| D-N8 | DEVELOPMENT の TYPE_ATTRS 列挙に float の **hex** が追加されている（「float の as_integer_ratio、conjugate、fromhex、hex、is_integer」） | 解消 |
| D-N9 | MUSE-FIX-REF 内の Python 新規項目数は **118** に統一（119 の記述は 0件） | 解消 |
| D-N10 | SOURCES.md に **コマンドプロンプト／PowerShell の行が追加**され（いずれも Microsoft Learn へのリンク付き）、表題日付も 2026-11-15 に更新されている | 解消 |

## 9. verification-reffix D1（9表面）・D2（8件）

### D1: 未カバー表面（番号単位で列挙）

| # | 表面 | 確認結果 | 判定 |
|---|---|---|---|
| D1-1 | ImageJ `.length` プロパティ | 独立項目が追加され supported=true、説明で lengthOf との区別を明記。実走でも `a.length`→3、`"hello".length`→5。個票にも同文面で同期（§9.3） | 解消 |
| D1-2 | PowerShell `$Matches` | 自動変数の項目が追加された。実走: `"abc123" -match "[0-9]+"` の後 `$Matches[0]`→**123** | 解消 |
| D1-3a | PowerShell `-notlike` | 比較演算子項目の文面に含まれ、一覧検索で到達可能。実走 `"abc" -notlike "a*"`→False | 解消 |
| D1-3b | PowerShell `-notmatch` | 同上。実走 `"abc" -notmatch "^b"`→True | 解消 |
| D1-3c | PowerShell `-ceq` | 同上。実走 `"a" -ceq "A"`→**False**（大小区別）、`"a" -ceq "a"`→True | 解消 |
| D1-3d | PowerShell `-cne` | 同上。実走 `"a" -cne "A"`→True | 解消 |
| D1-3e | PowerShell `-ieq` | 同上。実走 `"a" -ieq "A"`→**True**（大小不区別） | 解消 |
| D1-3f | PowerShell `-ine` | 同上。実走 `"a" -ine "A"`→False | 解消 |
| D1-4 | VBA `Attribute` 文 | 個別項目が追加され supported=true（Rem と同格）。実走でも `Attribute VB_Name = "Module1"` を含むコードがエラーなく実行される。個票にも同期 | 解消 |

### D2: 文面・記録の不整合（8件）

| # | 確認結果（どの修正で解消したか） | 判定 |
|---|---|---|
| D2-1 | cmd/dir の個票不一致: 定義実体の description（「/sを併用すると対象フォルダ以下を再帰的にフルパスで列挙します。」を含む）と `reference-r6.json` の同項目が**一致**。さらに全995項目で文面5フィールド（description／returns／caution／example／source）の個票同期を機械照合し、**不一致 0件・過不足 0件**だった（個票の再生成・同期で解消） | 解消 |
| D2-2 | sha256 の記録: MUSE-REF-R22 の注記が是正され、方式が「fields をキーソートした JSON（UTF-8、ensure_ascii=False、json.dumps 既定の区切り）」と明記された。その方式で独立に再計算すると **reference-r2.json の 917行全てが再現一致（917/917）** し、sha256 を欠く行も **0行**になった（旧7行の欠落は補完済み）。r6 は行ごとの sha256 を持たず公式原稿の sourceSHA256 を記録する形式である旨も注記で明示された | 解消 |
| D2-3 | PowerShell「算術・代入演算子」項目: description が「**前置形式 ++$x・--$x と後置形式 $x++・$x-- の両方に対応します**」に是正され、実走でも `++$x` が動作する（文面是正で解消） | 解消 |
| D2-4 | C++ getline 項目の caution: 「cin >> x の抽出も、モデルでは**抽出先の変数が未確定値になります**」に是正され、現在の実挙動と一致する。実走では `std::cin >> x;` は停止せず x が未確定値（kind=unknown、出力「実行時に決まる：標準入力」）になることを確認（原文時点の「x=7 のまま完走」とも、旧 caution の「シフト演算として解釈され停止」とも異なる現行挙動に、文面が追随している） | 解消 |
| D2-5 | DEVELOPMENT の Python TYPE_ATTRS 列挙に float `hex` を追加（= D-N8 と同一箇所） | 解消 |
| D2-6 | 修正報告書の誤記2件: (1)「Python の新規119項目」は **118** に訂正（= D-N9）。(2) 変更ファイル一覧の見出しは「**変更ファイル一覧（58件）**」に訂正され、実数と一致 | 解消 |
| D2-7 | ImageJ の SIM_EXTRA のみ件数: DEVELOPMENT に「**SIM_EXTRA のみの7件（getMetadata、String.format 等）**」と明記され、String.format は項目化されず実走でも「未確認：String.format はモデルで未対応です」で停止する（列挙の是正で解消） | 解消 |
| D2-8 | 裁定記録が項目実物より強かった3件: (1) C系 signed 系別名は int／long／short 等の項目文面に言及があり到達可能（signed int／signed long／signed short の各形を文面内で確認）。(2) C# の未確定値3件（long.MaxValue／long.MinValue／ulong.MaxValue）は **returns にも実値の数値が明記**された（例:「実値は 9223372036854775807。モデルでは未確定値として返ります」）。(3) PowerShell キャスト項目の **syntax に全7表記**（[string]／[int]／[int32]／[double]／[bool]／[boolean]／[pscustomobject]）が明記された | 解消 |

### 9.3 個票同期の全数照合（D1・D2 の裏付け）

- 定義実体 995項目と個票（reference-r2.json **917行**＋reference-r6.json **78行**＝995行）は、(kind, name) の集合が**完全一致（過不足0）**。
- 文面5フィールド（description／returns／caution／example／source）は**全995項目で一致（不一致0件）**。
- supported は r2 の行では全件一致。r6 の行はスキーマ上 supported／sha256 を持たず、代わりに公式原稿の sourceSHA256 と review を記録する形式（MUSE-REF-R22 の是正注記で明示）であり、スキーマ差として確認した。

## 10. 一部解消の詳細（差し戻し用）: D-N2

- 期待: PROGRESS に最新の節目（少なくとも当該修正バッチまで）と現在の実数値が記録され、「現在の状態」がツリーと一致すること。
- 実際: PROGRESS の最新節は「第22ラウンド修正〜CI是正（RG-87〜RG-144）」までで、その「現在の状態（HEAD `91efaff` 時点）」は **978リファレンス（対応917／参照専用61）／テスト2,055件／台帳729件・144グループ**。現在のツリー実数は **995リファレンス（対応933／参照専用62）／テスト2,493件**（本検証で実測）。修正バッチ2の節目は PROGRESS に存在しない。
- 差分: リファレンス +17件（995−978）、テスト +438件（2,493−2,055）が PROGRESS 未反映。cmd／PowerShell 行の「28参照／45参照」自体は現行値（28／50 のうち PowerShell は 45→50 に増えているため、この行の参照数も厳密には陳腐化している: PowerShell 行は「45参照」のままだが実数は **50**）。
- 補足: DEVELOPMENT.md（995件・種類別内訳・個票917行／78行）と REQUIREMENTS.md（995件）はバッチ2後の値に更新済みなので、不足は PROGRESS 側だけ。

## 11. 新規検出・観察（原文リスト外）

### 新規検出 N-A1: 参照先文書 `docs/audit/MUSE-FIX-BATCH2.md` が存在しない

- DEVELOPMENT.md（「詳細は `docs/audit/MUSE-FIX-BATCH2.md`」）と REQUIREMENTS.md（「`docs/audit/MUSE-FIX-BATCH2.md` を参照」）の2箇所が、ツリー内に存在しないファイルを参照している。現行文書（PROGRESS／README／DEVELOPMENT／EXTENDING／SOURCES／REQUIREMENTS）の .md 参照を機械走査した結果、欠落はこの1ファイル・2箇所のみ。
- 期待: バッチ2の修正報告書ファイルが同梱されるか、参照が実在ファイルへ向けられること。現状は D-N1／D-N2 の是正文が指す詳細先が辿れない。

### 観察 O-A1: PowerShell「変数」項目の syntax 先頭スペース

- `syntax: " $name = 値"` と syntax フィールド先頭に半角スペースが1件残る。原文 Y-4 の対象（prose の句点後スペース・caution 先頭スペース）には含まれない表面のため欠陥には数えないが、表示上の体裁として記録する。

### 観察 O-A2: Y-1 の長形は開発者コメント内に残存

- js ソース内の「ユーザー」「パラメーター」は全てコードコメント内（利用者向け文字列ではない）。jpcheck 原文の対象範囲（利用者向け文面）では解消済みのため欠陥には数えない。

## 12. 検証の範囲と限界

- 本検証は Node 上の `simulate()` 実走、CSS／HTML／app.js の静的・抽出実行、文書と定義データの機械照合によるもので、実ブラウザでの画面操作（スクリーンリーダー実機、200%拡大時の目視等）は含まない。A-N5／A-N6 は live region への文言・属性の到達をコードレベルで確認したもの。
- S-N1／S-N2 は jsdom 実アプリ起動ではなく、app.js の純関数の抽出実行＋save() のソース上の制御順序で確認した（原文 storecheck の jsdom ハーネスとは別経路の独立確認）。
- P-N4 の時間測定はこの VM の負荷に依存するため、絶対値ではなく伸び率（2倍→4倍規模での比率）と上限文言の到達で判定した（原文 perfcheck の判定原則と同じ）。
