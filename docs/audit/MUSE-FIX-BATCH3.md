# 修正バッチ3 修正報告書（Muse 側、2026-11-15）

## 概要

- 対象：第24ラウンド全面監査（対象ビルド 8b0abc2）の新規欠陥 R24-N1〜N38（38件）、同報告書 §3.2 の既知残存1件（Python 数値プロパティ）、§3.3 の既知残存表面7件、未確認候補から裁定で採用した U-1（PowerShell の16進数・単位接尾辞の文面欠落）の **全47件**。
- 台帳登録：RG-165〜RG-173（9グループ）。累計は元項目 **1,001件／173グループ**。
- 結果：全件処置。統合後に別コピーでの独立検証（対象全件の再現→解消を独立プローブ177件＋未掲載名プローブ約55件＋ F-02 機械照合で確認）を実施し、**差し戻しゼロ**。検証報告は監査ワークスペースの `verification-batch3.md`。
- テスト：2,500件 → **2,721件、全件合格**（新規テストファイル10件）。
- native-audit：exit 0、checks 304、C# 59/59 実行・スキップ0、C/C++ stdout 一致、Python 168、all_passed true。
- リファレンス：995件 → **998件（対応936／参照専用62）**。照合個票 reference-r2.json 919行／reference-r6.json 79行（定義との全フィールド一致、sha256 は 919/919 が正規方式で再現可能であることを検証班が独立確認）。
- **F-02（関数漏れ完全性）再照合：漏れ 0 件**（3方向照合＋正本突き合わせ＋到達性＋ゴースト確認を全15種類・全ビューに適用。詳細は §5）。

## 進め方と統合時の裁定

- 角度・言語別の7班（PowerShell パーサ／PowerShell エンジン／ImageJ・VBA／Python・JS／R／C家族／コア・その他）が、それぞれ専用スナップショットコピー（ベース b42548d）で作業し、担当ファイル以外は変更しない規律で実施した。共有ファイル（台帳・DEVELOPMENT.md・precache・既存テストの期待値）は統合担当のみが変更した。パーサ班からの申し送り2件（乗算の繰返し意味論の残り、switch 照合配線）は、統合済みツリーをコピーした PowerShell 追随班が担当した。
- **統合時裁定1（乗算の逆方向）**：パーサ班の申し送りは「`Write-Output (2 * 1,2)` は実 PowerShell で繰返し 1,2,1,2 になる」としていたが、一次情報（Microsoft Learn「about_Arithmetic_Operators」）は「評価方法は式の左端のオブジェクトの型で決まる」「右辺を左辺の .NET 型へ変換できなければ演算は失敗する」「加算と乗算は厳密には交換可能でない（(ab) と (ba) は常には一致しない）」と定め、繰返しの実例はすべて文字列／配列が左辺の形（`@("!") * 4`、`"!" * 3`、`$array * 2`、`"file" * 3`）のみで、逆方向の実例 `16 + "file"` は InvalidArgument（変換エラー）である。したがって `2 * @(1,2)` と `3 * "ab"` は繰返しではなく変換エラーが実物の挙動であり、追随班の実装から逆方向の繰返し分岐を除去した（順方向の繰返し本体の共有化と、数値文字列が変換される従来挙動 `2 * "3"` = 6 は維持）。パーサ側の AST 是正（カンマ演算子の優先順位そのもの）は R24-N3 の本丸であり維持している。本裁定は RG-164 の教訓（裁定の取り違えが回帰を生む）に基づき、実シェルで検証できない主張を一次情報で検証してから採用したものである。CI の validate-shells（実 PowerShell）での最終確認は次回配信時に行われる（フィクスチャに該当ケースは含まれていないため、照合の合否には影響しない）。
- **統合時裁定2（P-N3 の兄弟表面と CloudFormation）**：coremisc 班の申し送りを受け、外側 catch が `sourceFailure(e)` で例外文言を素通しする同形の表面を全種類で洗った。AutoHotkey／Power Automate／UI.Vision／ImageJ は、著作者エラー（PracticeError、または category を持つエラー）を素通しし、それ以外を変換層 `toLearnerError` へ通すガードつきで是正した。CloudFormation は到達するエラーがすべて著作者エラー（日本語文面＋line／category を持つ素の Error。組込み Transform の未対応、未確認マクロ、テンプレート検証ほか）であり、一律変換を適用するとそれらの文面が汎用文言に潰れる実害を統合時に実測した（round2「top-level Transform object and list object params」と audit-blind「cloudformation/missing macro」が回帰として検出され、変換を取り消して解消）。よって CloudFormation の外側 catch は現行維持とし、ホスト例外が到達した場合の漏出経路は「理論上ありうるが実測されていない残存」として §6 に明記する。

## 項目単位の処置（RG 対応）

### RG-165 R24-N1（P2・回帰）PowerShell 複合式の虚偽原因停止
根本原因は修正バッチ2の SH-P3 追随フォールバック（名前なし引数の命名フォールバック）が正常な場面でも発火していたこと。フォールバックの発火条件を「引数が本当に存在しない（undefined）場合」に限定し、`-f` の命名など SH-P3 本来の対象は維持した。`Where-Object { $_ % 2 -eq 0 }`、`if ($age -ge 18 -and $age -lt 65)` 等が正常評価に戻り、ee01f07 の対照挙動と一致することを検証班が変形9件を含む実走で確認した。

### RG-166 PowerShell パーサ（R24-N2、N3、N30、N31、§3.3 `Write-Output 1..3`）
- N2：数値字句を言語仕様の文法（B.1.9.1／B.1.9.2）へ書き直し、`.5`／`1.e2` 等を受理、不完全な字句（`0x`、`1e`、`0b2`、`1KBB`、`1_000` 等）は全位置で字句段階の名指し停止に統一した。副次的変更として、モデルの数値変換が対応していない型接尾辞つき字句（`1d`、`1l`、`0o17`、`123abc`）は、虚偽の原因や無言の分割ではなく正直な名指し停止になった。
- N3：カンマ演算子を式内に実装（優先順位7、二項演算子より強く結合。`param(...)` の既定値、単項・キャストの被演算子、範囲の右辺では抑止）。`(2 -in 1,2,3)` → True、`(1,2,2 -eq 2)` → 2,2 等が実物と一致する。乗算の残り表面は統合時裁定1のとおり。
- N30：switch オプション（-Wildcard／-Regex／-Exact／-CaseSensitive）を AST に記録し、エンジン側で既存の比較意味論へ配線した（-Wildcard→-like、-Regex→-match（$Matches も設定）、-CaseSensitive→ -c 変種、競合時は最後の指定が優先、照合節が文字列でない場合は about_Switch どおり無視）。-File と未知オプションは名指し停止のまま（§6 参照）。
- N31：引数モードの単独演算子トークン（`+` ほか `-`／`/`／`%`／`=`）を about_Parsing どおり文字列引数として渡すよう是正。
- §3.3：`Write-Output 1..3` が範囲を構築して 1,2,3 を出すよう是正。

### RG-167 PowerShell エンジン・リファレンス（R24-N4、N14、N16、N32、§3.3 読み取り／Copy-Item 先、U-1）
- N14：`$PSVersionTable.PSVersion` を「7.4」由来の Version オブジェクトに是正（Major=7、Minor=4、Build／Revision は System.Version の規則で未指定＝−1 とし、捏造しない。文字列形・比較は一貫）。`$PWD`／Get-Location は完全な PathInfo 形（Path、ProviderPath=C:\Practice、Drive、Provider）を返すよう是正し、添字形・変数経由・キャスト・Set-Location 追随の兄弟表面も一掃。
- N32：New-Item のファイル形で親フォルダを自動生成（ディレクトリ形と同等。Set-Content は実物どおり自動生成しない）。
- §3.3 読み取り：コンテンツを読むコマンドレットは Get-Content のみ。NUL（大小文字・拡張子・フォルダつきを含む）は即時 EOF の空として読み、CON／PRN／AUX／COM1／LPT1／CONIN$ は名指し停止。
- §3.3 書き込み先：Copy-Item／Move-Item／Set-Content／Add-Content／New-Item／Rename-Item を一掃。宛先 NUL は破棄（Move は元を削除）、CON／CONOUT$ は画面チャネルへ出力、その他デバイスは名指し停止。コピー元 NUL は空のコピー。Out-File は未実装（名指し停止）のまま変更なし。
- N4：「比較演算子」の syntax を全30綴りへ拡張し -c／-i 接頭辞規則を説明。**「包含演算子」を新設**（12綴り、Microsoft Learn に基づく意味論）。
- N16：「プロパティ」項目へ `.Name`／`.FullName` を追記（syntax・説明・使用例。値はエンジンの `info()` と突き合わせて確認）。
- U-1：「算術・代入演算子」項目へ16進数（0x1F=31）と単位接尾辞（KB／MB／GB／TB／PB）の言及を追加。
- 個票 r6：PowerShell 行 50→51、総数 78→79、13行を更新しフィールド不一致0。

### RG-168 ImageJ（R24-N5、N6、N18〜N22）
根本原因は数値引数の変換が関数ごとにばらばらだったこと。Java の `(int)` 変換意味論（0方向への切り捨て、NaN→0、±Inf→int 境界）を持つ共通ヘルパー `simInt` を新設し全数値引数へ適用した。selectImage は切り捨て後に正直にエラー（ホスト例外の漏出なし）、newImage は次元を切り捨て、1未満はエラー（従来コメントの「0 は可」は Functions.java と矛盾するため訂正）。newArray の負数、String.pad の第1引数（従来は Math.round）も統一。fromCharCode は全引数を走査し範囲外をエラーに。Math.min/max は引数ちょうど2個に是正（minOf/maxOf と同じ文言）。同根の兄弟表面9件（配列添字の読み書きの切り捨て、isOpen の ID、setPixel の座標・値、roiManager("select")、getResult／setResult の行、substring／charAt／indexOf の開始位置、charCodeAt／parseInt の基数・d2s・getHistogram の統一、makeLine／makePolygon 頂点の `(int)Math.round`）も一掃した。38関数形×異常引数の314プローブでホスト例外漏出0・経路喪失0。

### RG-169 VBA（R24-N17）
LBound／UBound の次元引数を実装（次元1を返し、範囲外の次元はエラー9、本当の個数不一致のみエラー450、次元値は Long 変換＝銀行丸め）。実装は共有 js/engine.js と js/content.js に最小変更で入れ、個票 r2 の VBA 2行を同期（全917行→919行の sha256 を再検証）。

### RG-170 Python／JavaScript／UI.Vision（R24-N7、N12、N13、N15、N23、N24、N25、N36、N37、N38、§3.2）
- N7：except ハンドラの照合が既存の例外階層 EXC_PARENTS を歩くよう是正（LookupError←IndexError／KeyError、ArithmeticError←ZeroDivisionError／OverflowError、OSError←FileNotFoundError、RuntimeError←NotImplementedError／RecursionError、ValueError←UnicodeError、ImportError←ModuleNotFoundError、NameError←UnboundLocalError。raise 形・実際に発生したエラーの双方）。`except Exception` は KeyboardInterrupt／SystemExit を捕捉しない。これに伴い、虚偽になった RA-16／RA-17 世代の開示文面（「照合は完全一致のみ」等）を例外項目9件から除去し、個票 r2 の Python 行と CloudFormation 伝播行を同期した。既存テストの RA-16／RA-17 は、開示の不在と階層照合の実挙動を固定する形へ統合担当が書き換えた。
- N23：from import した実装済み関数がモジュールメソッド参照として束縛され、属性形と同じ決定的な計算経路へ到達するよう是正（別名・複数名可）。`import *` はモジュールの公開名（定数5＋関数62）を実際に取り込むよう是正（従来は無言で何も取り込まなかった）。
- §3.2（裁定＝項目化）：新項目 **「数値の属性」** を Python リファレンスへ新設（docs.python.org の numbers 仕様に基づき real／imag／numerator／denominator を説明し、int／float／bool の項目から相互参照）。bool の numerator／denominator を実値（True→1/1、False→0/1）へ是正。全12通りの種類×属性を実 CPython 3.12 と突き合わせ一致（`(1.5).numerator` の AttributeError を含む）。CloudFormation へも伝播行を追加（個票 r2 は 919行）。
- N37／N38：`next` の syntax を `next(iterator)`／`next(iterator, default)` へ、`dict.pop` を `dict.pop(key[, default])` へ是正。Python の全 syntax フィールドを走査し、虚偽の `=None` 既定値はこの2件のみだったことを確認。
- N12：代入ターゲットの検証を右辺評価より前に移動（共有 executeProgram。Node と等価に不正な左辺を形で名指す。書き込み可能な形は変数・添字・メンバーと C 家族の `*p`。R の `x <- 1`、AutoHotkey の `x := 1`、C の `*p = 9` の非回帰を確認）。
- N13：JS 字句の形状検証を入れ、不正な字句（`1e`、`0x`、`0b2`、`0o8`、`1.5n`、`0xZZ`）を名指し停止に。基数つき BigInt リテラル（`0x1Fn` 等）は実 Node どおり評価するよう是正。
- N24：欠引数＝undefined のヘルパーを JS 組み込みへ横断適用（`Math.abs()`→NaN、`JSON.stringify()`→undefined、`document.createElement()`→"UNDEFINED"。Number()／String()／Boolean()／parseInt() 等は実 Node と照合し既に正しいことを確認）。
- N25：typeof の大域名テーブルを実 Node で再構築（BigInt→"function" ほか。利用者のシャドーイングは維持）。
- N15（JS 側）：演算子位置の `in`／`instanceof` を正直な名指し停止に是正（同位置の他の未対応演算子は既に名指しされていたことを確認）。
- N36：UI.Vision サンドボックスで `undefined`／`NaN`／`Infinity` を定義済み大域名として解決（元の再現コードがエラーなく `[undefined]` を出す）。

### RG-171 R（R24-N8、N26〜N29）
変更は js/types/r/index.js のみ。
- N8：空添字の代入を実装（名前を保持したベクトルのリサイクル、スカラーは全置換、`df[] <- 0` は全列、`df$a[] <- 0` も可。空の置換値は "replacement has length zero"）。読み取り形 `x[]` はオブジェクト自体を返すよう是正（従来はスカラー／NULL を壊していた。単一列データフレームの崩壊も是正）。兄弟表面として `x[1,2]` の読み書きは "incorrect number of dimensions" で正直に停止（従来は第2添字を無言で落としていた）。matrix は表面なし（matrix() 自体が名指し停止）。
- N26：実装済み全関数の引数規律を公式 Usage と突き合わせて是正。厳格な集合（length、is.na、nrow、ncol、names、seq_len、sd の名前のみ引数、readline、rnorm、runif、sample、rep の位置5番目）は実 R の文言で `unused argument (…)` エラーに。`...` を受ける集合（c、sum、mean、median、as.numeric、as.character、print、cat、data.frame、read.csv、seq の名指し停止）は受理を維持する確認済み（paste は本アプリ未実装＝名指し停止のため、代替として cat 等で `...` を確認）。
- N27：for ループの意味論を R の semantics.step で `each` を横取りして実装（コアは担当外）。NULL・長さ0は0回で継続、スカラーは1回、データフレームは列を反復。確定できない対象には正直な理由文を出す。
- N28：data.frame の仮引数（row.names／check.rows／check.names／fix.empty.names／stringsAsFactors）を列と分離（row.names は長さ不一致をエラーにし保持）。cat の仮引数（file／sep／fill／labels／append）も引数として扱い、`file` はモデルファイルへ書き出して表示しない（append=TRUE は追記）。cat／sum の名前つき `...` データは順序どおり含め、mean／median の名前つき `...` は実 R どおり無視されることを確認。
- N29：is.na のデータフレーム形を同形の論理データフレーム（行名保持）へ是正。ベクトル／スカラー／NULL／read.csv の形も確認。

### RG-172 C家族（R24-N9、N10、N11、N33、N34、§3.3×2、N15 の C# 側）
変更は js/core/c-family.js のみ。実測は gcc／g++ 13.3 と dotnet 8（~/dotnet）の実コンパイル・実実行に基づく。
- N9：`abs` の引数を検証（個数≠1・非数値は CompileError。実測：gcc で too few／too many arguments、g++ で no matching function）。一掃範囲：C家族で実装済みの固定引数関数は abs のみ（labs／llabs／fabs／sqrt／pow／strlen は未実装で対象を名指して停止する正直な状態。printf は可変長）。同じく無検証だった Console.ReadLine(引数) にも個数検証を追加。
- N10：C# の配列宣言で初期化値 null を「長さ未指定」と誤診していた根本原因を是正。null 変数として受理し、メンバー／添字アクセスは既存経路が NullReferenceException で停止する（実測と一致）。
- N11：`new 型[n]{…}` の宣言長をパーサ2経路の双方で保持し、要素数≠宣言長を CompileError に是正（実測：両方向とも CS0847、`new int[0]{}` は合法で一致）。
- N33：double.TryParse を既定スタイル（Float｜AllowThousands）専用検証へ置換（実 dotnet で約50形式を実測し全件一致。NaN の大小文字・符号、"1,0,0"→100、",100"→False、"100,"→True、"∞"→False、溢れ→±Infinity True 等）。実装済み TryParse は int／double のみで、int 側も実測表と全件一致を確認。
- N34：TryParse の第1引数 null は CompileError ではなく False＋out=0 へ是正（int／double 両方、変数経由の null を含む。実測で確認）。
- N15（C# 側）：数値字句の正規表現がメンバーアクセスのドットを小数点として食う欠陥が2層（c-family の transformSource と共有トークナイザ）にあり、担当範囲内の c-family 側トークン正規化で是正。`10.ToString()` は `(10)` 形と同じく「.ToString」を名指して停止するようになった（実 C# ではコンパイル可だが ToString 自体が未掲載のため名指し停止が正直な対応）。`10.`／`1.e3` 等の正規リテラルは不変を回帰確認。
- §3.3 配列初期化子：実測で言語別に再裁定。C は `{1.5, 2}` が警告止まりで切り捨て保持（合法、現行維持）。C++ は定数の浮動小数点要素→整数型を narrowing エラーに是正（変数要素は実物どおり警告・切り捨て受理を維持）。
- §3.3 接尾辞定数：実 dotnet の行列実測（`byte b = 200u／200L／200ul`、`int n = 200u／200L`、`char c = 65u`、`(uint)200` の代入まで全て CS0266、`long l = 200ul` も CS0266、`ulong ul = 200L` は合法 等）に基づき、接尾辞定数を暗黙変換規則の対象として扱うよう cast() へチェックを追加（ul 接尾辞が long 型に化けていた変換も是正）。一掃範囲は接尾辞定数×全整数型。変数・実行時値の変換は修正バッチ2の既存テストが固定するモデル規則のため対象外として維持。

### RG-173 コア・Power Apps・cmd（§3.3 P-N3、R24-N35、§3.3 cmd `type`）
- P-N3：漏出経路は到達不能ではなく実在し、実測で特定した。(i) VBA エンジン（js/engine.js、executeProgram とは独立）は変換層を持たず、`simulate(null)` が生のホスト文言を返し、BigInt／循環参照のモデルセルは JSON 後処理で TypeError を simulate の外へ投げ、関数値セルは structuredClone の DOMException を投げていた。実行時の `error()` も生文言を記録していた。(ii) Power Apps の外側 catch が `sourceFailure(e)` で素通し。(iii) cmd の shellRuntime がディスパッチ例外の文言を変換層より先に記録し、外側 catch も素通しだった。根治：js/engine.js に変換層 `toLearnerVBAError` を新設し、パース／宣言／実行時の各 catch と simulate の内側／外側分割（後処理例外は投げずエラー結果で返す）に適用。Power Apps は `sourceFailure(toLearnerError(e))` へ、cmd はディスパッチの変換つき入口と外側 catch の変換へ是正。兄弟表面の扱いは統合時裁定2のとおり（AutoHotkey／Power Automate／UI.Vision／ImageJ はガードつきで是正、CloudFormation は現行維持）。なお R24-N15 は本件と同根ではない（パーサ起因の原因帰属の誤りであり、パーサ側の修正で足りる）と切り分けた。
- §3.3 cmd 読み取り：`type nul`（拡張子・フォルダつきを含む）は空で成功（ERRORLEVEL 0）。CON／CONIN$／AUX／PRN／LPT1 は名指し停止。`copy` のコピー元 NUL は空読み取り（0バイトファイルを作成。古典的な `copy nul file` 形）へ、宛先デバイスの規則はバッチ2と整合。`move` のコピー元デバイスは move の意味論として名指し停止を維持（裁定を記録）。`find` のファイル引数 NUL は空入力（不一致、ERRORLEVEL 1、継続）。sort は cmd 未実装。dir／if exist／del／ren は読み取り経路でないため変更なし（`if exist nul` の真理値は存在意味論であり読み取り経路の範囲外として未処置＝§6）。
- N35：共有ヘルパー `fxFormatValue`（Blank → ""）を新設し、Notify 出力・Set の注記・Switch の注記・Notify の型エラー文へ適用。さらに `semantics.format` として渡し、コアのステップ整形からも "null" が漏れないようにした。`&` 連結と Text() は既に正しく回帰で固定。最終状態グループの JSON 内の `null` は欠陥でないと裁定した（モデル状態の JSON 表記であり、Microsoft Learn 自身が Power Apps でデータソースの NULL は blank として表されると説明している）。

## §5 F-02 再照合の結果（独立検証）

検証班が findings-r24-fref.md の方法（3方向照合＋正本突き合わせ＋到達性＋ゴースト確認）を全15種類・全ビューに適用した。結果は **漏れ 0 件**：
- ランタイム総数 998（対応936／参照専用62）が定義と一致し、個票 r2 919行＋r6 79行は全フィールド一致・sha256 再現 919/919。
- 方向3（到達性）：scan 395件／宣言 refs 369件／trace refs 425件すべて未解決0（trace の2件はアプリ自身の接尾辞解決で `push`／`appendChild` へ解決されることを実装で確認）。
- ゴースト0／逆幽霊0（使用例998件を実走）。
- AutoHotkey の A_Loop 系は宣言済み未対応の名指し停止であり漏れに数えない。

## §6 未処置・未確認（黙って落とさないための明記）

- **CloudFormation の外側 catch**：統合時裁定2のとおり現行維持。到達するエラーはすべて著作者エラーであることを統合時に列挙・実測したが、未知のホスト例外が到達した場合にその文言が素通しになる経路は理論上残る（実測された漏出はない）。
- **PowerShell の Test-Path／Get-ChildItem／Remove-Item／Set-Location のデバイス名挙動**：§3.3 の裁定範囲（コンテンツ読み取り経路と書き込み先）外のため現行維持（例：`Test-Path nul` → False）。
- **PowerShell の引用符なし `conout$`**：引数モードの `$` 字句でパーサ側が停止する（エンジン班は引用符形で確認済み）。パーサ側の表面として残置。
- **PowerShell switch の -File**：実装ではなく名指し停止（R24-N30 の欠陥定義＝虚偽原因の解消には適合するが、「実装済み」とは扱わない。検証班の観察として明記）。
- **R の残存**：for ループが100回上限に達しても `truncated` フラグが立たない（種類層に API がなく表示のみの差異）。引数の部分一致（例：`row.nam=`）は未対応。列のない data.frame（row.names のみ）はモデルで表現できない。実機 R での再確認は当 VM では不可能であり、公式ドキュメントで裁定した。
- **ImageJ の残存**：setSlice の範囲外挙動は f01a の裁定どおり現行維持（現行マスターの Functions.java はエラーにするため、親側での再確認候補として記録）。VBA の次元0のエラー番号は指示に基づき9とした（実 VBA は5の可能性があり未確認）。fromCharCode の非数値引数は実物のエラー文言が確定しないため現行維持。VBA の次元引数への Null はエンジン汎用の Long 変換に従う（エラー13。実物の番号は未確認）。
- **C家族の残存**：`int[] a = null; a = new int[2];` の再代入と `new int[2].Length` の式位置メンバーアクセスは、ベース（未修正）でも同一エラーになる既存表面であることを対照実走で確認済みであり、本バッチの指摘範囲外として未処置（回帰ではない）。C++ の double→float 波括弧 narrowing（例：`float a[1] = {1e300}`）は §3.3 の指摘（整数型への変換）の範囲外として未処置。C での `abs("x")` は当 VM の gcc 既定では警告止まりだが、所見の裁定（GCC 14／CI ではエラー）と C++ の実測に従い CompileError で統一した。
- **cmd `if exist nul` の真理値**：存在意味論であり読み取り経路の範囲外として未処置。
- **検証班の観察（欠陥に数えない）**：PowerShell の `-replace` 等はハイフンなし裸名で停止する（第24ラウンドの未確認候補と同型の従前様相であり回帰ではない）。
- **タイミング揺れの観察（欠陥に数えない）**：最終確認の全件実行で RG-56（深い式の深さ原因表示）が1回失敗し、同時期の個別実行でも1回失敗した。同テストは全件実行では2回（統合直後と検証コピー）とも合格し、ベースツリー（b42548d）との対照では両ツリーとも calm／負荷時の個別実行で再現しなかった。深さ判定と準備段階デッドラインの競合が当 VM の CPU スロットリング下で揺れる、パス上限テストと同型の環境要因と切り分けた（バッチ3の変更は深さ計算に触れていない）。
- **実シェル照合**（tests/shell-native-audit.py）は当 VM では実行できないため、本バッチの PowerShell／cmd 修正は一次情報（Microsoft Learn／言語仕様／SS64）で裁定し、フィクスチャ期待値の変更は行っていない。唯一の例外は統合時裁定1（乗算の逆方向）で、これはフィクスチャではなくエンジン挙動の裁定であり、根拠は §「統合時の裁定」に明記した。

## 変更ファイル一覧

- 実装：js/engine.js、js/content.js、js/core/c-family.js、js/core/script.js、js/types/autohotkey/index.js、js/types/cmd/engine.js、js/types/imagej/engine.js、js/types/imagej/index.js、js/types/javascript/index.js、js/types/powerapps/index.js、js/types/powerautomate/index.js、js/types/powershell/engine.js、js/types/powershell/index.js、js/types/powershell/parser.js、js/types/python/engine.js、js/types/python/reference.js、js/types/r/index.js、js/types/uivision/index.js（js/types/cloudformation/index.js は統合時に検討のうえ現行維持のため変更なし）
- 個票・文書：docs/audit/reference-r2.json、docs/audit/reference-r6.json、docs/DEVELOPMENT.md、docs/audit/REQUIREMENTS.md、docs/audit/muse/consolidated-residual-register.md、PROGRESS.md（本報告書の数値へ追随）、precache.js（再生成）
- 新規テスト：tests/muse-fix-batch3-cfamily.test.js、-coremisc、-imagej、-psengine、-psfollow、-psparser、-python、-r、-script、-vba（計10ファイル）
- 既存テストの期待値是正（統合担当のみ、根拠は各ファイル内のコメントに明記）：tests/muse-fix-batch2-fc-python.test.js（件数 165→166／176→177／個票 917→919、RA-16／RA-17 を R24-N7 の実挙動へ書き換え）、tests/muse-fix-batch2-fc-vba.test.js（個票 917→919）、tests/muse-fix-batch2-fc-shell.test.js（PowerShell 50→51／個票 r6 78→79、copy 元 NUL を §3.3 再裁定により停止対象から除外）、tests/muse-fix-batch2-fc-flow2.test.js（個票 917→919）、tests/muse-fix-r22-ui.test.js（総数 995→998）、tests/muse-fix-ref-python.test.js（Python 165→166／CloudFormation 176→177）
