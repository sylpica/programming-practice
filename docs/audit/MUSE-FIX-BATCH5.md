# Muse 修正バッチ5報告書：第26ラウンド監査（全面カタログ）の新規欠陥25件の処置

- 実施日：2026-11-15（JST）
- 対象：公開ビルド **2a964e0**（修正バッチ4 配信後）の第26ラウンド全面監査で新規に検出された欠陥 **R26-N1〜N25 の25件**（P2×2、P3×23。回帰0件）。正本は監査ワークスペースの `findings-round26.md` と班別報告 `findings-r26-*.md`。
- 結果：**25件全件を処置**。テストは 3,090件 → **3,281件**（新規テストファイル8件）で全件合格。`tests/native-audit.py` は exit 0（checks 348、C# 59件全件実行・スキップ0、Python 実物実行212、all_passed true）。リファレンスは **1,086件（対応1,024／参照専用62）** で変更なし（照合個票 r2 1,007行／r6 79行も無変更）。
- 台帳：`docs/audit/muse/consolidated-residual-register.md` に **RG-194〜RG-213（20グループ）** を新設。累計は **1,059件／213グループ（RG-01〜RG-213）**。
- 作業体制：言語・領域別の6班（PowerShell／Python／R／ImageJ／その他言語／コア）が各自の専用コピー（ベース e2c5f67）で修正し、変更ファイルが班同士で完全に分離された状態で統合担当が統合した。統合後に別コピーでの独立検証（修正班の回帰テストを流用せず、findings から起こした独自ハーネス91ケース＝欠陥再現82＋保持確認9で「ベースで再現 → 統合で解消」を全件機械判定、＋ F-02 全面再照合）を実施し、**差し戻しゼロ** で確認した（検証報告：監査ワークスペース `verification-batch5.md`）。
- GitHub への書き込みは本バッチでは行っていない（配信は親工程が節目に一括で実施する）。

## 1. 裁定と前提訂正

いずれも一次情報に基づく。裁定が監査（findings）側の主張と異なる場合は、その旨と根拠を明記した。

1. **JS 分割代入の前提訂正（R26-N7）**：監査は「RG-07 の『分割代入と名指す』方針が宣言位置にのみ届いている」としたが、実走では宣言位置の分割代入も未対応の名指し停止だった。文位置・宣言位置の両方を同一の新規機構で実装した（実 Node 24.22.1 と全数対照）。生成・実行は `dialect === "js"` の分岐内にゲートし、他方言（ahk のクラスメソッド引数等）は従来の名指し停止を維持した。
2. **PowerShell 期待エラー照合の拡張（R26-N1）**：param 既定値内の範囲カンマが変換エラー（実 pwsh の ArgumentTransformationError）になるケース2件を `tests/fixtures/powershell-error-cases.json` へ追加（計3件）。`tests/shell-native-audit.py` の期待件数はフィクスチャ件数から自動算出され、expected_powershell 117→119／expected_total 166→168 へ件数一致で増えた（既存ケースの判定・期待値は無変更）。当VMに実シェルが無いため、**実シェルでの最終確認は配信後の CI（validate-shells）に委ねられる**。
3. **Power Apps Switch の最小引数（R26-N15）**：第26ラウンドの F-04 が確認した正挙動（`Switch(1, 1)` の末尾単独引数＝Default 解釈）を壊さないため、Switch の最小引数は2と裁定し、lowerBehavior 側と call() 側（従来は3で、`Text(Switch(1, "def"))` のような値形が誤って停止していた）の両経路を2に統一した。If は最小2。
4. **cmd 既存テストの期待値是正（R26-N23）**：未定義変数の空置換を前提に凍結していた `tests/cmd.test.js` の2件（`xx` → `x%MISSING%x`、`ab` → `a%missing%b`）を、実 cmd／SS64（未定義変数は `%名前%` のまま残る）に基づいて是正した（テスト内コメントに根拠を明記）。テストの弱体化ではなく、期待値を実物の挙動に合わせる是正である。

## 2. 処置一覧（番号単位）

### R26-N1（P2）PowerShell param 既定値の内側で範囲右辺カンマ抑止が継承される → RG-194

`param($a = (2 -in 1..5,9))` 等で、括弧・`@()`・`@{}`・キャスト・単項の内側へ noComma が継承され、内側のカンマが配列リテラル区切りに化けて入れ子配列になり、真偽が黙って反転していた。根因は `parameters()` が既定値の式全体を noComma の下で読んでいたこと。カンマ抑止をパラメータ列の水準にのみ残し、内側に入る全分岐（括弧／部分式・配列・ハッシュ・キャスト・単項・前置・添字・スクリプトブロック／関数本体・条件括弧）で noComma を戻して復元する方式に統一した。根拠は文法 B.2.3（範囲の両辺とも array-literal-expression でありカンマは配列リテラル区切り）。兄弟表面として `-(1..3,4)` の文字列化、`$b[1..3,4]` の添字、`@{ a = 1..2,3 }` のハッシュ値、`function f([int]$a = (2 -in 1..5,9))` の関数ヘッダー形も全数確認して一致させた。区切りカンマ `param($a = 1..2, $b = 9)` 等の正常系は不変。

### R26-N2（P2）PowerShell 引数モードの `++`／`--` 接着形がホスト例外文言を漏出 → RG-195

`Write-Output 1--2` 等の接着形（13形）が、式パース側の未定義ノード参照に落ち、V8 の生文言 `Cannot read properties of undefined (reading 'k')` を学習者向け表示に漏出していた（RG-183 の接着処理は単独演算子のみが対象だった）。B.1.7 の generic-token として接着対象を二連演算子・連鎖形・先行形・符号形・文字列接着・カンマ要素の前置形まで拡張し、接着形ファズ490件で漏出0を確認した。加えて防御層として engine の `set()` に代入先ガードを追加し、パス内エラー出口でも `toLearnerError` 変換を通すことで、外側 catch（RG-177）だけでは届かなかった実行中の漏出経路を塞いだ。残存として、式位置 `(1--2)` の文面は未確認候補 U-6 のまま変更していない（ただし防御層により `(1--)`／`(++1)`／`'x'++` は生文言漏出から名前指しの停止へ変わった）。

### R26-N3（P3）Python except ハンドラの動的値が評価されない → RG-197

`T = (ValueError, TypeError)` を束縛して `except T:` と書くと虚偽の TypeError で停止し、`except make_handler():` は黙って不捕捉だった（RG-175 の照合は式の形に限定されていた）。`resolveExceptHandler` を「ハンドラ式を一般に評価し、評価結果の値で検証・照合する」形へ書き換え、タプル値・呼出結果・添字・属性・条件式の全形を実 CPython 3.12.3 と一致させた。RG-175 の評価順序・遅延性は維持し、タプル要素の評価が例外を起こしたら残り要素を評価しない実物の構築規則にも一致させた。コンストラクタ呼出はインスタンスマーカーを返すため、未対応コンストラクタの診断ではなく実物どおり TypeError になる。

### R26-N4（P3）Python 入れ子タプルの except ハンドラが黙って受理される → RG-197

`except ((ValueError,), TypeError):` が黙って受理されていた（実 CPython では TypeError）。N3 の値レベル化により、要素の値がタプルであること自体が TypeError になる実物の規則が効くようになった。isinstance 側のタプル平坦化（合法）は従来どおり維持した。

### R26-N5（P3）Python KeyError の str が引用符なし → RG-198

`KeyError('port')` の str が引用符なしの `port` だった（実 CPython は repr の `'port'`）。docs.python.org「Built-in Exceptions」の規則（引数が1つのとき `__str__` はその引数の repr）を raise 経路に実装し、print／str()／f文字列／未捕捉表示行／再 raise 後の表示の全表面が同じ str を使うよう統一した。整数・タプル・0個・複数引数と他例外の表示は不変。実 CPython 3.12.3 で約50形状を対照した。

### R26-N6（P3）R の予約定数への代入が検証されない → RG-199

NA／NA_integer_／NA_real_／NA_complex_／NA_character_／Inf／NaN への代入が、黙った無効化・誤帰属・再束縛（型付き NA は値の捏造）を起こしていた（RG-181 の R 分は TRUE／FALSE／NULL のみが対象だった）。定数リスト `RESERVED_CONSTANTS` を `semantics.step` の入口で演算子形を問わず検証する形にし、複合代入（`NA += 1`）・for 反復変数（`for (NA in 1:2)`）の同根表面も遮断した。根拠は ?Reserved。T／F の再代入可能な挙動は維持。当VMに実 R は無く、機械突合は公式ドキュメント照合のみ（実 R での突合は従来どおり未実施）。

### R26-N7（P3）JavaScript 分割代入（文位置）が虚偽名指しで停止 → RG-209

`[a, b] = [b, a]` が「配列リテラルには代入できません」と虚偽名指しで停止し、宣言位置も未対応だった（前提訂正は §1-1）。パターン解析・検証・実行時束縛を新規機構として実装し、swap／穴／既定値／残余（入れ子含む）／メンバー・添字要素／入れ子パターン／文字列右辺／括弧つきオブジェクト形（既定値・別名・残余含む）を実 Node 24.22.1 と全数対照した。不正なターゲットは従来どおり Invalid LHS で名指しし、裸の `{a} = obj` は実物どおりブロックとして停止する。計算済みキー `({[k]: v} = obj)` と for-of／for-in の反復変数としての分割代入は、名前を挙げた未対応停止を維持した。

### R26-N8（P3）DEVELOPMENT.md の件数記述の陳腐化 → RG-213

RG-186 の処置が REQUIREMENTS 側のみで DEVELOPMENT 側を取り残していた。`docs/DEVELOPMENT.md` の現在形の件数記述（「現行936件の対応項目」→ 1,024件）、バッチ4節の追加（種類別件数と合計 1,086件（対応1,024／参照専用62）、個票 r2 1,007行／r6 79行、MUSE-FIX-BATCH4.md への参照）、Python 宣言の例外項目数（「等25件」→「等69件」）を実測に追随させ、文書内の数値をレジストリ実測（総数・対応／参照専用・種類別・テンプレート104・用語集111）と機械照合して一致を確認した。過去バッチ節の件数は時系列の履歴記録として維持している。

### R26-N9（P3）ImageJ simNumArg 統一残存（誤値・虚偽原因側） → RG-202

d2s の桁数文字列が "1" 化、parseInt の基数文字列が NaN 化、setResult の文字列行が虚偽原因の停止、setMinAndMax の文字列第2引数が黙って無視されていた。simBuiltin の全 case を全数棚卸しして数値引数位置を simNumArg／simInt へ統一した。棚卸しで追加検出した同根表面（setThreshold の文字列連結化、makeRectangle、getHistogram の nBins、setVoxelSize、makeLine・makePolygon の文字列座標、getPixel・setPixel・changeValues、random の seed の虚偽原因）も一掃した。数値として読めない文字列は RG-188 の裁定どおり未確定のまま（値を捏造しない）。

### R26-N10（P3）ImageJ simNumArg 統一残存（確定可能な未確定化側） → RG-202

getResult／getResultLabel の文字列行、String.pad、String.fromCharCode、Math 系（11表面）が、確定可能なのに未確定になっていた。N9 と同じ棚卸しで一掃し、実 ImageJ の返し形（getResultLabel のラベル文字列、fromCharCode の文字列、Math.acos のラジアン値等）に一致させた。

### R26-N11（P3）ImageJ close の引数が無視される → RG-203

`close("Other*")` 等が引数を無視し常にアクティブ画像を閉じていた。ピン留め版 Functions.java の close 実装どおりに是正した：タイトル／ワイルドカードのパターン一致（大文字小文字を区別しない）、`"\Others"` は最前面以外を閉じる、`"*"` は全て、一致なしは何も閉じない、数値引数は getString() の規則で文字列パターンとして解釈（`close(99)` は "99" に一致する画像を閉じる）、第2引数 "keep" を受理。非画像ウィンドウ（Results 等）はモデル外のため何も閉じない（従来より実物に近い）。

### R26-N12（P3）ImageJ resetThreshold(99) がアリティ検査をすり抜ける → RG-203

sig の括弧なし形（`"resetThreshold"`）がアリティ検査（括弧内を数える方式）の対象外で、引数付き呼出しが無言で受理されていた。sig を `"resetThreshold()"` へ是正し（sig は個票の照合フィールドに含まれないため同期への影響なし）、全201項目の sig を棚卸しして同型の抜けが他にないことを確認した（残りの括弧なし7項目は変数・プロパティ・実行時ガード済みの正当な形）。

### R26-N13（P3）VBA の vbTextCompare／vbBinaryCompare が未定義 → RG-204

両定数が未定義で暗黙の Empty 変数化し、InStr が 0 を返し Replace が無言で無効化していた。Microsoft「Miscellaneous constants」に基づき、比較定数（vbBinaryCompare=0／vbTextCompare=1／vbDatabaseCompare=2）と文字列定数族（vbCr／vbLf／vbNewLine／vbNullChar／vbNullString／vbFormFeed／vbVerticalTab）を VBA 専用エンジン（`js/engine.js`。vbCrLf／vbTab の既存定義と同じ場所で、取込み元は vba/index.js のみ）の定義へ追加した。vbDatabaseCompare を InStr に渡す場合は Excel どおりエラー5になる。

### R26-N14（P3）CloudFormation Transform の ""／null が黙って無視される → RG-205

Transform の有無判定が真偽ベースで、""／null が「節なし」とみなされ未変換で成功していた。有無判定をキー存在（Object.hasOwn）へ変更し空名チェックを追加して、スカラー・配列要素・オブジェクト形 Name の不正形を全て Transform の検証文言で名指し停止に統一した（Fn::Transform 側の Name "" も自身の検証文言に是正）。空配列 `[]` の受理は維持。

### R26-N15（P3）Power Apps If の最小引数検証がない → RG-206

`If()` が Blank、`If(true)` が条件値そのものを返していた。RG-16 と同一文言の最小引数検証（If は2以上）を lowerBehavior と Set 系の両経路に追加し、Switch の 0 引数が汎用文言で停止していた表面も引数個数エラーへ是正した（Switch の最小は §1-3 の裁定どおり2）。実装済み可変長関数の最小引数は全数確認済みで、If の末尾単独＝Else、Switch の末尾＝Default の正常形は不変。

### R26-N16（P3）AutoHotkey 三項演算子が虚偽原因で停止 → RG-210

`x := c ? 1 : 2` 等が「) が必要です」等の虚偽原因で停止していた（公式 v2 の演算子なのに未対応とも名指されなかった）。根因は2層（条件演算子の許可方言に ahk が無いこと、共有優先順位表の `:`（区間演算子）が三項の真側を飲み込むこと）で、許可方言への ahk 追加と ahk 専用優先順位表（`:` を含まず `<<`／`>>` を追加）の新設で根治し、短絡評価・右結合も実 v2 と一致させた。累乗 `**` は ahk のみ単一トークンとして生成し評価を実装した（「未対応：*」の誤名指しも解消。`2 ** 3 ** 2` → 512、`-2 ** 2` → -4 は公式の優先順位どおり）。棚卸しで追加検出した `<<`／`>>` の名指し（「代入の区切りが必要です」）もビット演算の名指しへ是正した。根拠は AutoHotkey v2 公式ドキュメントの演算子表。

### R26-N17（P3）Power Automate の %…% 包み算術条件が変数参照と誤認される → RG-207

`%A% + %B% >= 10` のような条件だけが変数参照と誤認され、真因でない '%' を名指して解釈エラーになっていた（値側は正しく評価できる）。条件側に `unwrapPercentWrapped` を新設して If／Else if／Loop condition の3表面へ適用し、値側の解釈と揃えた。包みの解除は、%変数% を仮名に置換した内側が構文解析できる場合に限定し、`%A% == %B%` のような比較形を壊さない。包み内の 0 除算は真因のエラーを保持する。値側の挙動は不変。

### R26-N18（P3）UI.Vision executeScript の非有限結果が最終状態で null 化 → RG-208

`executeScript` の非有限結果（Infinity／NaN／-Infinity）が最終状態の直列化で null に化け、echo の表示（"Infinity" 等）と矛盾していた（RG-02 と同型）。simulate 完了後のスナップショット（`paths[].vars`）に限り非有限数を文字列表現へ置換する `finiteSafeSnapshot` を追加し、表示を echo と一致させた。実行中の数値としての働きは不変で、ネストした配列内も対象にした。

### R26-N19（P3）C++ 直接リスト初期化が虚偽原因で停止 → RG-211

`int x{5};` 等が「; が必要です」という虚偽原因で停止していた（g++ では合法）。`=` 付き形と同じ初期化子 AST で直接形を実装し、RG-192 の narrowing 検査を直接形にも共用した（`unsigned int u{-1};`、`int x{1.5};` は g++ 13.3 どおり narrowing 停止）。配列形・std::string・空波括弧（`int e{};` → 0）・for 初期化位置も対象。C は直接形を受理せず、文言を真因名指しへ是正した。C# の同形も文言を是正した。

### R26-N20（P3）C のスカラー波括弧初期化が停止 → RG-211

`int x = {5};` が「数値型が一致しません」で停止していた（gcc では C11 で合法、値は5）。C のスカラー波括弧初期化を受理し、C の通常変換（`unsigned int` の {-1} → 4294967295、`unsigned char` の {300} → 44、余分な要素は先頭採用、`{}` → 0）を適用した。C++ の narrowing 規則は不変。

### R26-N21（P3）PowerShell 非整数の範囲端点が虚偽原因で停止 → RG-196

`1.5..3` が「整数範囲のモデル上限」という虚偽原因で停止していた（実 PS は端点を [int] へ変換して 2..3 になる）。言語仕様 §6.4 の [int] 変換（.NET 準拠の偶数丸め）を専用変換として実装し、端点を実値化した（文字列数値端点も対象）。上限の名指し停止は丸め後の端点差が実際に上限（10,000）を超える場合に限定し、非有限端点は変換原因で停止する。`[int]1.5` のキャスト自体は既存の名前指し停止のまま（本件の範囲外）。

### R26-N22（P3）cmd `set /a x=5%0` が内部プレースホルダを漏出 → RG-212

percent 展開が `set /a` の式中の `%0` を位置引数プレースホルダへ置換し、内部文字列 `__CMD_VALUE_0__` が学習者向け文言に漏出していた。set /a 文脈では `%名前%` の変数参照だけを展開し単独 `%` を剰余演算子として残すよう是正した（`5%0` はアプリ自身の流儀の0除算停止、`7%3` は剰余1。従来は `%3` が消えて誤値7になっていた同根表面も是正）。arithmetic 側には、内部プレースホルダが式へ流入したら未確認として停止するガードを追加した（`set /a x=%RANDOM%` の黙った0化も是正）。プレースホルダの生成箇所と学習者向け経路は全数棚卸し済み。

### R26-N23（P3）cmd `echo %undefined%` が裸 echo の状態文を出す → RG-212

未定義変数が空に展開され、`echo %undefined%` が裸 echo の状態文（"ECHO is on." 相当）を出していた。実 cmd／SS64 どおり、未定義変数は `%名前%` のリテラルを保持するよう是正した。「定義済み空」と「未定義」を区別する definedness 判定を導入し、`set x=` での削除（削除後は再び未定義としてリテラルに戻る）も実 cmd に一致させた。遅延展開 `!未定義!` の空展開（別の規則）は不変。既存テスト2件の期待値是正は §1-4 を参照。

### R26-N24（P3）R seq の単独引数形が誤値 → RG-200

`seq(0)` が空、`seq(-1)` が c(1) になっていた（実 R はいずれも c(1, 0) 系）。根因は2層（単独引数を seq_len 相当の長さ解釈で処理していたこと、単項マイナスの結果や `c(5)` が長さ1の配列で運ばれ数値形を取り逃がすこと）。?seq の第5用法（長さ1の数値なら `1:from` と解釈。seq(0) でも）に基づき単独引数形を統一処理へ是正した（`seq(0)` → c(1, 0)、`seq(-1)` → c(1, 0, -1)、`seq(-0.5)` → c(1, 0)、`seq(2.5)` → c(1, 2)、NA 単独 → c(1)）。NaN／Inf は従来どおり停止。

### R26-N25（P3）R 乱数系が常時エラーの引数を受理 → RG-201

`sample(1:3, 5)`（replace=FALSE の母集団超過）、負の size、`rnorm(-1)`、`runif(-2)` が未確定値として受理されていた。実装済みの乱数系は rnorm／runif／sample の3関数のみと棚卸しし（sample.int／rbinom／rpois 等は未実装として名指し停止する既存経路）、決定的に不正な引数を名前を挙げて停止するようにした（根拠は ?sample／?Normal／?Uniform）。合法形の未確定値モデルは維持。分数 size、prob の検証、文字列 n は公式ドキュメントで確定できないため現状維持（回帰ガードのみ追加）。

## 3. 検証結果

### 統合ツリー（統合担当の実行）

- `npm test`：**3,281件全件合格**（3,090＋新規191）。
- `python3 tests/native-audit.py </dev/null`（PATH に ~/dotnet）：**exit 0**。checks 348、C# 実物実行59/59・スキップ0、Python 実物実行212、all_passed true。
- レジストリ実測：総数1,086（対応1,024／参照専用62）、種類別は VBA 91／ImageJ 201／CFN 221／PA 15／AHK 26／UIV 22／PowerApps 28／Python 210／R 44／C 26／C++ 31／C# 53／JS 39／cmd 28／PS 51。テンプレート104、用語集111。個票 r2 1,007行／r6 79行。
- precache 再生成済み、`node scripts/precache.mjs --check` 通過。

### 独立検証（別コピー、検証報告 `verification-batch5.md`）

- 方法：ベース（e2c5f67 の git archive）と統合ツリーの2コピーを検証側が自前で用意し、findings から起こした独自ハーネス91ケース（欠陥再現82＋保持確認9）を両ツリーで実走して機械判定した。修正班の回帰テストは流用していない。
- 結果：**R26-N1〜N25 の25件全件が「ベースで再現 → 統合で解消」を確認**。N1 は param 既定値の全位置（括弧・二重括弧・@()・@{}・キャスト・単項・-in 右辺）と正常系の保持、N2 は13形全てでホスト文言の消失、N21 は偶数丸め4点、N23 はリテラル保持と定義済み空変数の空展開の両立を確認した。N3／N4 は実 CPython 3.12.3 でも期待値を対照した。
- F-02 再照合：レジストリ実測は両ツリー同一で期待値と全一致（総数1,086／対応1,024／参照専用62、種類別も一致）。個票 r2／r6 はベースと sha256 完全一致（無変更）。到達性は `tests/muse-fix-batch4-docs.test.js` 14/14 合格で維持を確認。DEVELOPMENT.md の件数記述（N8）は実測と一致。
- テスト：統合ツリー 3,281/3,281 全件合格（初回の RG-56 単発失敗は個別再実行とベースツリー対照で環境フレークと切り分け済み。ベース全件は 3,090/3,090）。native-audit は exit 0（checks 348、C# 59/59・スキップ0）。
- **差し戻し：0件。**

## 4. 未処置・未確認・提案（実施せず、ここに明記する）

- **提案（別バッチ候補）VBA 定数のリファレンス項目化**：RG-204 で定義した10定数（vbBinaryCompare／vbTextCompare／vbDatabaseCompare／vbCr／vbLf／vbNewLine／vbNullChar／vbNullString／vbFormFeed／vbVerticalTab）は実行できるがリファレンス項目が無い。既存テストが VBA の項目総数を91に固定しているため、項目化には総数固定の更新と項目ごとの returns／source の確定を伴う別バッチとして扱う（本バッチでは実施しない）。
- **提案（別バッチ候補）R 型付き NA のリファレンス項目化と読取り側対応**：型付き NA（NA_integer_ 等）にはリファレンス項目が無く、単独で読むと「未定義の名前」で停止する（定数としては文面が不正確）。項目追加と読取り側の NA 対応を一体の別バッチとして扱う（本バッチでは実施しない）。
- **未確認のまま変更なし**：PowerShell 式位置 `(1--2)` の文面（未確認候補 U-6）。防御層により生文言の漏出は解消したが、文面自体は確定根拠が無いため変更していない。`$(...)` 部分式は従来どおり名前指しの制限として維持。
- **宣言済みモデルとして維持**：Python の関数本体内で構築した例外インスタンスは従来の C3 名指し停止、内部起因（非 raise）の KeyError の print(e) は C2 設計どおり未確定。R の分数 size／prob 検証／文字列 n、rnorm の sd<0・runif の min>max（実 R ではエラーでなく NaN＋警告）は現状維持。ImageJ の newImage 文字列寸法（U-4）、substring の非数値引数（U-5）、Array.getStatistics の文字列要素・newArray("3")（U-6）、selectImage("1")（U-7）は事前裁定どおり未確認候補のまま。JS の計算済みキー分割代入と for-of／for-in の分割代入ターゲットは名前指しの未対応停止を維持。スクリプト先頭の `param(...)` は従来どおり名前指しの停止。
- **実シェル最終確認の委任**：本バッチで追加した PowerShell 期待エラーケース2件（param 既定値内の範囲カンマ）を含む shell-native 照合の実シェル実行は当VMで未実施であり、配信後の CI（validate-shells）で確認される事項である。

## 5. 変更ファイル一覧（統合ツリー、26ファイル＋文書類）

- コード（16件）：`js/core/c-family.js`、`js/core/script.js`、`js/engine.js`、`js/types/autohotkey/index.js`、`js/types/cloudformation/index.js`、`js/types/cmd/arithmetic.js`、`js/types/cmd/engine.js`、`js/types/imagej/engine.js`、`js/types/imagej/reference-data.js`（resetThreshold の sig 1行のみ）、`js/types/powerapps/index.js`、`js/types/powerautomate/index.js`、`js/types/powershell/engine.js`、`js/types/powershell/parser.js`、`js/types/python/engine.js`、`js/types/r/index.js`、`js/types/uivision/index.js`
- テスト（10件）：`tests/cmd.test.js`（期待値是正2件）、`tests/fixtures/powershell-error-cases.json`（期待エラーケース＋2件）、新規 `tests/muse-fix-batch5-cfamily.test.js`、`tests/muse-fix-batch5-cmd.test.js`、`tests/muse-fix-batch5-imagej.test.js`、`tests/muse-fix-batch5-misc.test.js`、`tests/muse-fix-batch5-ps.test.js`、`tests/muse-fix-batch5-python.test.js`、`tests/muse-fix-batch5-r.test.js`、`tests/muse-fix-batch5-script.test.js`
- 文書・その他：`docs/DEVELOPMENT.md`（件数追随）、`docs/audit/muse/consolidated-residual-register.md`（RG-194〜RG-213 登録）、`docs/audit/MUSE-FIX-BATCH5.md`（本報告書）、`PROGRESS.md`（バッチ5の記録と現在の状態の更新）、`precache.js`（再生成）

## 6. 次工程

1. 親工程による配信（push-files 一括）と CI 確認。特に **validate-shells** で、本バッチで追加した PowerShell 期待エラーケース2件を含む実シェル照合の最終確認を行うこと。
2. 公開サイトのバイト照合。
3. 第27ラウンド全面監査（収束判定は全面カタログで新規の実質的欠陥ゼロのラウンドでのみ行う）。
