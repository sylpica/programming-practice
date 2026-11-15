# 本体開発の実装範囲（2026-11-15 JST）

本体初版と監査修正後の対応範囲です。Muse／Codexの独立監査は第22ラウンド（CodexはR6）まで実施され、各修正バッチ（RG-87〜RG-144）を適用済みです。二重監査の収束は宣言していません。

## 共通基盤

15種類を `定義データ + 種類ごとのモジュール` で登録。種類別の下書き、モデル、テンプレート、手動／自動モード、ソート、選択パスを保存します。旧VBA／中間名称の保存データは移行し、元データを削除しません。編集中の不正なモデルJSONも生テキストで保持します。

コード／フロー説明、元行／アクションへのジャンプ、到達経路、前後・先頭末尾・番号・Enter、3ソートと選択保持、最大2,000件の動的注記、探索上限とWorker終了、表示パスに連動する使用項目、下側の終了状態、共通ファイル取り込み、104テンプレート、別メニューのリファレンス・用語、オフラインPWAを実装しました。

## 種類ごとの対応範囲と制限

| 種類           | 本体で実装した範囲                                                                                                         | 主な未対応・未確認                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Excel VBA      | 従来のASTエンジン、モデルシート、宣言型／Variant、配列、If / Select Case / For / For Each / Do、Exit、On Error、出力       | 実Excel、複数シート・外部ブック、With、GoToラベル、動的配列の要素参照・ReDim（宣言のみ対応）、未知Step、複雑な未知値比較                                     |
| ImageJ         | 既存アプリのパーサ・評価器・200リファレンス・10テンプレート、画像／画素／ROI／測定表モデル                                 | 実画像、プラグイン、実ファイル。画像フィルター等は自然言語の動作説明と明示したモデル上の近似で、実画素結果は捏造しない      |
| CloudFormation | JSON / YAML、Transformの記載順、Fn::Transformの兄弟スコープ、Pythonハンドラ、requestId／status／fragmentの検査、前後比較   | 実AWS、SAM／Include、IAM、YAML短縮タグ、一般的なテンプレート妥当性・リソース検証                                            |
| Power Automate | Desktopの変数・If / Else・Loop / For each / Loop condition・Exit loop、モデルファイル／メール、アクション編集              | 製品エクスポート形式ではない学習用JSON。コネクター、実送信、UI自動化、詳細な例外処理設定                                    |
| AutoHotkey v2  | 起動部分と単一イベント、基本ホットキー／ホットストリング、If / Loop / While、ウィンドウ解決、SendTextと限定Send、マウス    | #HotIf、タイマー、複雑なSend・ホットストリング、CoordMode変更、ユーザー関数、アプリ固有の入力効果                           |
| UI.Vision RPA  | Classic Commands JSON、アクション編集、open / click / type / storeText等、If / While / times、限定Sandbox式、モデルDOM効果 | 任意JS、実CSS／XPath探索、OCR／画像認識、実ネットワーク・非同期挙動。モデルのロケーターキーで解決                           |
| Power Apps     | en-US Power Fx、Set・UpdateContext・If／Switch、Collect、純粋ForAll、テーブル集計、Patch、画面遷移、Reset、表示数式再計算  | 一般の型推論・委任、実Dataverse、採番、非同期、画面イベント、順序依存のForAll副作用                                         |
| Python         | 既存アプリの部分評価器、型・コンテナ・関数・クラス・例外、160リファレンス・10テンプレート、モデルglobals                    | 完全なCPythonではない。外部モジュール・実ファイル・ネットワーク等。対応外は停止。未知の短絡評価に関数呼び出しを含む式は停止 |
| R              | numeric / logical / characterのベクトル、NA、リサイクル、添字、データフレーム、集計、If / For / While                      | パッケージ、因子、S3/S4、複素数・raw、integer型上限、ユーザー関数、一般のデータフレーム添字代入                             |
| C              | モデルABI、宣言・配列・ポインタ・スコープ寿命、If / For / While、printf、整数演算                                          | 動的確保、構造体、ユーザー関数、多次元、複雑な宣言。精度外の64ビット計算と処理系依存変換は停止                    |
| C++            | 上記の基礎C系構文、cout、ポインタ／配列、同じ型の変数へのint&参照、std::stringの基本連結                                                                                    | STL、一般のクラス・テンプレート、オーバーロード、RAII、動的確保等                                                           |
| C#             | int演算、unchecked／checked、配列例外、単純フィールドのクラス・参照共有、Console                                           | LINQ、一般のコンストラクタ・継承・プロパティ、unsafe、ユーザー関数、一般の.NET API                                          |
| JavaScript     | 基本宣言・If / For / While、typeof、型変換、配列・参照、モデルDOM読書き・要素作成、BigInt リテラルと BigInt 同士の演算                                                  | 関数定義、コールバック／イベント、非同期、fetch、一般のDOM API、Symbol等                                            |

## 開発中の確認

- Node標準テスト：既存VBA43件に、種類契約、全テンプレート、型・境界・モデル変化、エラー、未知条件、スコープ・保存対応などを追加。
- 全58テンプレートで解析・パス表示を確認。C系の範囲外アクセス教材は、意図どおり未定義動作／例外で停止することを確認。
- Chromium：13種類×4メニュー×375 / 1440pxの104ケースで横方向のはみ出しなし。
- 種類別のコード、モデル、ソート、選択パスの切替と再読込、編集中の不正JSONの保持を確認。
- アクションの追加・編集・順序変更・削除・対応箇所へのジャンプは共通編集基盤で実装し、UI.Visionで開発中の操作試験を実施。
- 全13種類のモジュールと教材をキャッシュした後、オフラインの冷再読込と種類切替・実行を確認。
- VBAの従来ブラウザ試験（自動／手動、ナビゲーション、ソート、同文ジャンプ、取り込み・キャンセル、200%表示、オフライン）も保持。

正確なテスト件数・CI結果・配信コミットは完成範囲報告とActionsを参照してください。

## 未実施の検証

各実製品（Excel、ImageJ、Windows AutoHotkey、Power Platform、AWS、.NET）やR本体との全面的な自動差分試験、iOS実機でのインストール試験は未実施です。Museとの独立二重監査は第22ラウンドまで実施済みですが、収束判定は未実施です。全種類とも「全構文／全APIに対応」とは扱いません。

## Codex独立監査の修正節目1（2026-11-14）

本体初版の記録に続き、ユーザー指定の独立監査を開始した。結果・変更範囲・未確認は `docs/audit/CODEX-R1.md`、原文正本の項目別対応は `docs/audit/REQUIREMENTS.md` を参照する。二重監査の収束は未確認。

- JavaScript：既知値の演算・巻き上げ・TDZを修正。未知値の型変換前後を混ぜる条件や、副作用を含む未知短絡評価等は未確認として停止する。未実装の文字エスケープは別の文字列に変換せず明示停止する。
- ImageJ：directories / files / runtime をモデルに明示。モデルにない画像の寸法・ビット深度・一覧・バージョンを捏造しない。不明な画像処理後の個別画素を保持しない。34参照項目の未実装表示を訂正し、未確認の処理は停止する。200項目のリファレンスすべてがシミュレーション可能という意味ではない。
- Python：単純なインスタンスと属性・メソッドを追跡する。継承・メタクラス等は未対応。open / with・csv等の一般モジュールは実行せず、教材はメモリ内の明示辞書・表データで説明する。「仮想ファイル一覧」があるとは説明しない。
- C/C++/C#：掲載APIを対象言語別に整理。C#配列の別名・要素型・初期値、C++のbool昇格・出力、実行入力の識別を修正した。
- 共通UI：モデル入力はコード側で開閉。使用項目・リファレンス・用語集は右（375pxは下）、終了状態はコードの下。テンプレート解説はその下へ全展開し、内側スクロールを設けない。「なし」にすると非表示になる。

対応表示リファレンスの使用例は、自立コードとして実行確認する対象である（現行917件の対応項目の使用例はテストで全件実行される）。説明文・実物仕様の照合は項目単位の個票（REFERENCE-R2.md、reference-r2.json／reference-r6.json、MUSE-REF-R22.md）で管理し、使用例試験と区別する。

### 練習テンプレートの補充

追加指示により全88件へ増やした。全13種類に基礎から応用まで複数の教材を用意し、従来3件だった種類は各段階2件ずつの6件とした。段階は定義データで管理し、テンプレート集のカードから同じ練習画面へコードを読み込む。全176入口操作とNode期待値照合を実施。詳細な件数はdocs/audit/REQUIREMENTS.mdに記載。

## 第2ラウンドで追加・修正した範囲

- テンプレートの全選択経路からconfirmを撤去。編集時は自由練習へ移し、種類別のfreeDraftをテンプレート閲覧中も保持する。「なし」で復元し、再読込・種類切替でも保全する。
- C/C++：ASCIIの単一文字、char配列の文字列初期化とヌル終端を持つ文字列出力、空欄を持つfor、基本sizeofを追加。sizeofは明示ABI（char 1、int 4、long 4/8、float 4、double 8、bool 1バイト）に限る。ポインタ・VLA・配列型直接指定・未確認の式は停止。UTF-8文字列リテラルのバイト数はモデルとして扱い、char配列の非ASCII初期化は未対応と明示する。
- C++：同じ型の宣言済み変数への参照宣言と読み書き、参照寿命、std::stringと文字列リテラルの+ / +=を扱う。配列要素への参照、const参照、一時オブジェクト、一般の文字列メソッドは未対応。文字列リテラル同士をstd::stringとして連結しない。
- C/C++教材とリファレンス例をヘッダーとmainを持つコンパイル可能なコードへ統一。C#もusing SystemとProgram.Mainを含める。意図的な未定義動作教材はネイティブで実行しない。
- R：meanの非数値はNAと警告。trim付き平均とas.numericの変換警告を扱う。内部NA・データフレームを学習者向けに整形する。
- JavaScript：typeof（未宣言名とTDZを区別）とReferenceError表示。戻り値のない出力文の重複説明を除去。
- AutoHotkey：SetTitleMatchModeが変更前のモードを返す。UI.Vision：storeText/storeValueのロケーター不一致は#LNFを保存して継続する。
- CloudFormation：TransformのName/Parametersオブジェクトと配列内オブジェクトを解析する。カスタムLambdaのトップレベルparamsは公式のevent仕様に従い空にする。AWS::IncludeのトップレベルParametersは専用の組込み仕様であり、このモデルでは実装しない。Fn::Transformのparamsとは混同しない。
- リファレンスは説明・戻り値・注意点を一次資料へ対応付ける。戻り値と公式資料リンクも表示する。対応／参照専用の区別は維持（現行は対応917件／参照専用61件）。静的説明文の照合と、任意コード・全引数の実環境互換性は別である。個票はdocs/audit/REFERENCE-R2.mdとMUSE-REF-R22.mdを参照。

新アイコンはMuse側の25e40db以降で反映済み。636f8d0でmanifest変更後のprecache再生成も完了し、Codex第3ラウンドではPNGの実体・寸法を確認して保持する。

## 第3ラウンドで追加・修正した範囲

- 全種類の不確定値は「実行時に決まる：条件／由来」の形で表示する。VBA・共通エンジン・Pythonの表記だけを整え、未知値の識別子・制約用データは変えない。内部のmodelトークンや同じ接頭辞の入れ子を出さない。
- モデルDOM・クラス・ポインタ・NA・画像等の状態は人間向けに整形する。通常の配列・レコードと明示的なJSON.stringify、CloudFormationの変換断片JSONは用途を保つ。モデルレコードの内部キーを生JSONとして表示しない。
- C/C++：C形式の単項キャスト `(型)式` を解析する。int、long、short、char、signed char、unsigned char、unsigned int、unsigned short、unsigned long、float、double、C++のboolと、掲載した標準的なsigned/unsigned複合表記を扱う。`(int)sizeof(...)`、入れ子、式中の優先順位、sizeof内で副作用を評価しないことを扱う。unsignedキャストに伴う整数昇格・通常の算術変換とmodulo演算、printfの%uを追加した。
- キャストの未対応：ポインタ・参照・const/volatile修飾・構造体/クラス・独自型・long long/long double/void・C++名前付き/関数形式。認識した形式は「キャストのこの形式は未対応」と明示して停止する。未対応の型宣言まで受理するという意味ではない。unsigned／signed の複合型名による変数宣言（unsigned int、unsigned long、unsigned short、unsigned char、signed char。単独の unsigned は unsigned int、signed は int として受理し、long long は long へ畳み込んで受理する）は対応済み。
- C/C++のモデルABIはchar 8、short 16、int 32、long 32/64ビット、float IEEE 754 binary32、double binary64。plain charの符号が決まらない変換は0〜127の共通範囲だけ計算し、範囲外は環境依存として停止する。安全整数を超える64ビット結果は未確認で停止。C17/C++17の符号付き範囲外整数変換は処理系依存、範囲外の浮動小数点→整数・double→float変換と符号付き単項マイナスのオーバーフローは未定義動作として停止する。float演算はbinary32に丸めてからdoubleへ拡張する。float演算の非有限結果は未確認停止。
- sizeofの結果型は、このモデルのlongBits=64ではunsigned long、32ではunsigned intとする（LP64/ILP32に限るモデル上のsize_t）。任意の実機ABIを推定しない。shortのサイズも2バイトと明示する。既存のポインタ・VLA等の未対応は維持する。
- 後置インクリメントの式の値は変更前である。traceには値の更新と「後置式の値は変更前」を併記する。
- AutoHotkey：0除算はZeroDivisionError、非数値の算術演算はTypeError。数値文字列の算術とASCIIの大文字小文字を無視する= / !=を扱う。64ビットのビット演算（^ / & / |）と整数除算 // は未対応と明示して停止し、他言語の意味やコメントとして処理しない。StrLen等の非掲載関数は引き続き未対応。整数リテラル・数値文字列・モデル変数・演算結果・インクリメントの安全整数範囲外と非有限数は未確認で停止する。64ビット整数をNumberへ丸めて実行値として提示しない。
- UI.Vision：times内の${!times}を1始まりで用意し、入れ子終了時に外側へ戻す。break/continueも検証した。timesの外にある!timesの値は今回の対応範囲外で、値を推測して残さない。
- 第3ラウンドの新規指摘、一次資料、全37項目・全13種類の再検証範囲はdocs/audit/CODEX-R3.mdに記録する。有限の検証を完全互換性や二重監査の収束に読み替えない。

- C#：double等のフィールド・配列要素の複合代入は宣言型から演算型を求め、結果を左辺へ変換する。C系共通のfloatリテラル・float演算はbinary32で丸めてからdoubleへ拡張する。新しいC#3例をSDKのあるCIでも実検証する。

## Muse 修正バッチで追加・修正した範囲（2026-11-15）

残件台帳 RG-01〜RG-77（元項目198件）の修正に伴う宣言変更。詳細は `docs/audit/MUSE-FIX-20261115.md` を参照。

- 共通：下書きは種類ごとではなく「編集を始めたテンプレート」ごとに保持する（旧形式の保存データはそのまま読み込める）。値表示は各言語の正規表記に合わせ、trace・出力・最終状態で一致させる。
- Excel VBA：行継続 `_`、Replace の任意引数（start／count／compare。compare の -1 は未対応）、括弧なし組み込み関数参照（Time／Rnd／Timer 等は実行時に決まる値）、文字列リテラルと数値の古典的な `+` 規則、条件位置の "True"／"False" 文字列変換に対応。`Dim a()` の動的配列宣言は対応（要素参照はエラー9）、ReDim／ReDim Preserve は未対応と明記。Boolean は True／False、文字列は引用符なしで表示する。
- Python：タブ・空白混在インデントは TabError 相当で停止。dict メソッド等のキーワード引数は名前を挙げて検証する（`int(..., base=)` は実装）。先行ゼロ整数リテラルは形式を引用して SyntaxError。大きな range は代表パスとして打ち切りを明示し、到達不可能なパスを作らない。
- R：NULL（長さ0）の意味論、名前付きベクトルと名前添字、`%in%`、`df[[列]]` の列取り出し、データフレームへの要素演算、`seq` の length.out／along.with、`rep` の each／length.out／ベクトル times に対応。ユーザー関数定義と関数名引数は対象を名指して未対応停止する。表示は学習用の c(...) 表記に統一し、空ベクトルと長さ1スカラーの実 R コンソール表記（numeric(0) 等）とは異なる。
- C／C++／C#：三項演算子、do-while、中括弧なし if-else、被演算子位置の代入式、前置 ++/--、複合代入 `%=`、二項シフト、基数・8進・接尾辞付きリテラル、行スプライス（C／C++ のコメント）に対応。C++ の std::string は既定構築で空文字列になり、添字・直接初期化・数値との比較不可・条件不可を実 C++ どおり扱う。C# は文字列補間（基本形）、foreach、キャスト、静的メンバー、TryParse、文字列の .Length と添字、入れ子宣言スペースの同名禁止（CS0136）、値型と null の比較不可に対応。未対応として明記：switch 文、ユーザー定義の関数・メソッド定義、ジェネリック型宣言、raw 文字列、C# decimal、#include 以外の前処理ディレクティブ、ポインタ型等の sizeof、C# 補間の整列・書式指定子。
- AutoHotkey：Loop の Until 節と For、IsSet／IsSetRef、組み込み変数 A_*（実行時に決まる値として扱い、A_Space・A_Tab は固定値）、暗黙の連結と省略引数、キーワード・プロパティ名の大文字小文字不区別、配列の1始まり添字、真偽結果の 1／0 表示、数値文字列の真偽・等値変換、v2 のコメント規則に対応。未対応として明記：ユーザー関数定義、Try／Catch、Switch、クラス定義、ラベル／Goto、Loop Files／Parse／Read 等。
- Power Apps：0除算はエラーとして停止、関数の引数個数を検証、ThisRecord はレコードスコープ内のみ、True／False は大小を問わず受理、Text の数値書式と LookUp の削減式、条件位置のテキスト変換（"true"／"false" のみ）に対応。
- JavaScript：オブジェクトリテラルの宣言初期化、BigInt リテラルと BigInt 同士の演算（表示は末尾 n 付き）に対応（未対応は Symbol 等）。

### Muse 修正バッチ第2弾（2026-11-15、第21ラウンド RG-78〜RG-86＋追加表面）

- 共通：下書きの保存は、保存直前に保存済みを読み直して種類ごとにマージする（複数タブで開いても、他タブが書いた下書きを丸ごと上書きで消さない）。エディタのフッターにキー操作の案内（Tab／Esc→Tab／Ctrl+Enter）を表示する。パスの並び順ラベルは実指標どおり「手順が多い順／手順が短い順」。
- C／C++／C#：文末の `;` は必須で、欠落は「; が必要です」として停止する（従来は次の文として無言で実行されていた）。C++ の std::string と char の `+`／`+=` は連結として扱う。自己初期化（`int x = x + 1;`）は未初期化読みとして停止する（C／C++ は未定義動作、C# は未割り当てエラー）。printf の %f で非有限値は inf／-inf／nan と表示する。エラーメッセージ本文にはカテゴリ接頭辞（未対応：等）を付けず、カテゴリは専用欄でのみ表す。
- R：同一行に区切りなく続く第2文は停止する（代入文にも終端検査）。未知値を含む print／cat は出力行を消さず「（実行時に決まる値）」と表示する。
- Python：round() の負の ndigits（10の冪の位への偶数丸め）に対応する。
- JavaScript：数値区切りリテラル（`1_000`、基数リテラル内も可）に対応し、不正な配置はリテラルを名指しして停止する。console.log の -0 は "-0"、コレクション内の undefined は undefined と表示する。行頭の二項演算子は式の継続として扱う（C系も同じ）。
- Power Apps：UpdateContext は、現在の画面がモデルに存在しない場合、画面名を挙げた日本語エラーで停止する。


## 新種類追加・Codex R6（2026-11-15）

最新基盤はMuse修正 `7992597`、CI是正 `d4179c9`、補完仕様 `576b534`。既存13種類の意味論・コアUIは変更していない。追加後は15種類／104テンプレート／511リファレンス（対応450／参照専用61）。追加2種類は各8テンプレート（基礎2・実践3・応用3）、cmd 26／PowerShell 37リファレンス。その後のリファレンス完全性修正（次節）で総数は978件（対応917／参照専用61）、cmd 28／PowerShell 45リファレンスになった。Microsoft Learnの公式原稿と掲載文面の照合記録は `docs/audit/reference-r6.json`、検証は `CODEX-R6.md`。

### 共通シェルモデル

実Windowsや実ファイル・プロセスには接続しない。`cwd`（初期C:\Practice）、`files`（path、type、content、length）、`variables`、`inputs`を明示JSONから読み取る。パスはWindows形式・大文字小文字非区別。初期ツリーはnotes.txt、data.csv、readme.txt、logs。実行後の一覧はモデルのツリー、ファイルの内容はtype／Get-Contentで確認する。入力候補配列は列挙し、未指定は未確定値。無限ループ・goto・再帰・パス爆発は時間／操作／深さ／繰り返し／2,000パスの予算で停止し理由を返す。外部コマンドや未知の構文は名前・元行を示して停止する。

UNC、ドライブ相対パス、実アクセス権・ロック・シンボリックリンク・特殊ファイル・別プロバイダーは未対応。ファイル操作は単一パスの基本形。未モデル化の内容・サイズ等を実物の値として作らない。ファイル本文は文字列または未確定値だけを受理する。モデル列挙順はfiles配列順で、実機のファイル順序やロケールを再現する宣言ではない。

### コマンドプロンプト（cmd）

対応：バッチ形式・コマンド拡張有効。echo／echo.／@echo off、set文字列・set /p入力・set /a（符号付き32ビット、8/16進、算術・シフト・ビット演算、単一複合代入）、%VAR%／%ERRORLEVEL%／%CD%、setlocal/endlocalと遅延!VAR!、ifの文字列==・整数EQU/NEQ/LSS/LEQ/GTR/GEQ・exist/defined/errorlevel・not・既知文字列の/I、括弧／else、for基本リスト／ワイルドカード／/L、gotoとラベル、call :label／%1〜%9／%~1、exitと/b、rem、pause、cd/chdir、dir /b（/s併用時は対象フォルダ以下の再帰列挙をフルパスで表示）、type、md/mkdir、rd/rmdir、del/erase、ren/rename、copy、move、cls、find、>／>>、基本テキストパイプ。バッチの%%エスケープ（単一の%リテラル。ただし%%i等のfor変数参照は除く）にも対応し、set /aの剰余は%%で書ける。%0（起動したバッチ名）はモデルに存在しないため固定名を作らず「実行時に決まる」値として表示する。for基本リストの区切りは空白・カンマ・セミコロン・イコール。引数の前後の空白は区切りであり、type／cd等でも名前の一部にしない。引用符で囲んだ値の中の&／|や、引用符内リテラルの|はコマンド区切りとして扱わない。

%展開は括弧を含む論理コマンドの読み取り時、!展開は実行時（単独の括弧ブロック内でも実行時）。遅延展開の動的変数!ERRORLEVEL!／!CD!／!RANDOM!等も、同名の環境変数が未定義なら実行時の内部値で解決する（環境変数で影を作った場合はそちらが優先）。endlocal／バッチ・サブルーチン終端で局所環境を戻す。pauseは案内「続行するには何かキーを押してください . . .」を出して入力があったものとして続行し、分岐させない。初期コマンド表示はoff、on/off設定はtraceと最終状態に示し、入力コマンド自体の端末再描画は再現しない。裸のechoは設定の説明、裸のsetは最終状態で一覧表示を代替。clsはモデルの出力パネルをクリアする。

ERRORLEVELはコマンドごとに保持／更新する。setlocal（引数あり0／なし1）、exitの指定値、findの一致0／不一致1等を追跡し、全コマンド成功時に無条件で0へ戻さない。未対応で停止した命令は実行しない。モデル上の失敗は停止し、失敗時の終了コードを未確認として表示する（存在しないファイルへのdelも黙って成功扱いにせずこの規則に従う。del不在時の実ERRORLEVEL数値自体は一次情報で未確定のため作らない）。findの未対応オプション（/n・/v・/c等）は検索文字列の引用不足と誤認させず、オプション名を挙げて停止する。copy/moveの完了・FS操作は日本語traceで説明し、ロケール依存の実端末メッセージやコピー件数表示を捏造しない。パイプ各段の環境変数とcwdは親へ持ち出さず、標準出力文字列のみを次段へ渡す。

未対応／未確認として停止：外部バッチ／プロセス、call二重展開、%変数の部分文字列・置換、for /F・/R・/D、shift、&&／||、2>等の番号つき・複合・入力リダイレクト、複雑な複合代入や算術上限の未確認ケース、非数値のEQU等（文字列には==を使う）、未確定値の/I比較、裸dirや/b以外の詳細列挙、複数ファイルのcopy/move、rd /sの対話確認（/qを指定）、全件delの確認（/qを指定）、日本語コードページ・ロケール依存の実表示。エスケープは対応する基本形のみ。

### PowerShell

PowerShell 7.4を根拠にするWindowsパス・UTF-8／CRLFの部分モデル。対応：数値・真偽値・$null・文字列・配列・範囲・ハッシュテーブル／キー／基本プロパティ、変数代入・基本算術（文字列×整数・配列×整数の繰返しを含む）・インクリメント（前置・後置）、二重引用符の変数／$(...)展開、単一引用符、基本バッククォート、if/elseif/else、foreach/for/while/do-while、リテラルのswitchとdefault、break/continue、function／先頭param／return、基本の型変換。比較は左辺がコレクションのときだけフィルタ意味論になり、左辺スカラー／$null対右辺配列は通常のスカラー比較（-eqはFalse／-neはTrue）になる。モデルvariablesのJSONオブジェクトはハッシュテーブルへ変換する。ハッシュテーブルのキー順は実物の順序保証ではない。

オブジェクトパイプライン：Write-Outputと暗黙出力は成功ストリーム、Write-Hostは画面のみ。$nullと出力なしを区別し、代入した配列の参照と単一要素配列を保持する。行末の`|`による改行継続に対応する。$_／$PSItem、Get-ChildItem（FileInfo／DirectoryInfo相当の明示プロパティ。存在しないプロパティはモデル化オブジェクトでも$null）、Where-Object／ForEach-Objectのブロック、Select-ObjectのProperty/ExpandProperty/First/Last/Skip、Sort-Objectの基本キーと降順、Measure-ObjectのCount/Sum/Average/Minimum/Maximumを扱う。オブジェクトはプロパティと値を表示し、生JSONを出さない。

ファイル：Set/Get-Location、Get/Set/Add-Content、New/Remove/Rename/Copy/Move-Item、Test-Path。New-Itemは-Path／-Name／-ItemTypeの基本形（-Nameは-Pathを親とし、-Path省略時は現在フォルダ）に対応する。モデル内だけで書込・移動・削除する。Read-Hostはモデル入力。関数からはreturn行だけでなくそれ以前の成功ストリーム出力も返す。$?は最後のパイプラインの成否、$LASTEXITCODEは明示した初期値のみ（外部プログラムを実行しない）。不在パス等のエラーは元行と原因を示して停止する。

未対応／未確認として停止：実ホスト・外部コマンド・モジュール・ジョブ・非同期・並列、一般.NETメソッド、FileInfo等のモデルメタデータへのプロパティ書込、正規表現の.NET固有／非ASCIIの未確認形式、-likeの文字クラス、-f、here-string、advanced function／属性／複雑なパラメーターセット・スコープ修飾、bool型の関数パラメーター変換、非整数からintへの変換と範囲外演算、未確定型変換・複合文字列比較・副作用のある未知短絡評価、文字列部分式内での分岐、Select-Object -Firstによる副作用のある上流処理の途中停止（無副作用の列選択は対応）、プロバイダー・複雑なFSオプション・ディレクトリコピー（基本Copy-Itemは単一ファイル）、自動変数や出力設定の変更。対応オプションは各コマンドの基本部分集合で、未掲載パラメーターは停止する。オブジェクト書式は学習用の近似、文字列ソートはen-USモデル。

## リファレンス完全性修正（2026-11-15、第22ラウンド付随監査対応）

第22ラウンド付随監査（`reference-completeness-round22.md`）で検出されたリファレンスの漏れ（確実368名＋部分漏れ96名）と §5 の文面不整合を全件裁定・修正した。処置の記録は台帳 RG-116〜RG-135、項目ごとの一次情報の照合記録は `docs/audit/MUSE-REF-R22.md`、修正報告書は `docs/audit/MUSE-FIX-REF.md`。照合個票 `docs/audit/reference-r2.json`（従来13種類）と `docs/audit/reference-r6.json`（新規2種類）は最終状態に同期済み。

最終のリファレンス件数（種類別）：Excel VBA 90、ImageJ 200、CloudFormation 171（固有11＋Python委譲160）、Power Automate 15、AutoHotkey 26、UI.Vision 22、Power Apps 28、Python 160、R 44、C 26、C++ 31、C# 53、JavaScript 39、cmd 28、PowerShell 45。合計 **978件（対応917／参照専用61）**。

その後の修正バッチ2（2026-11-15）で、VBA Attribute・ImageJ `.length`・Python math 定数5件（CloudFormation 伝播5件を含む）・PowerShell 自動変数とプロパティ項目の追加、ImageJ Math.sinh/cosh/tanh の未対応分類への是正、Python `with` の対応分類への是正等を行い、現在の件数は次のとおり：Excel VBA 91、ImageJ 201、CloudFormation 176（固有11＋Python委譲165）、Power Automate 15、AutoHotkey 26、UI.Vision 22、Power Apps 28、Python 165、R 44、C 26、C++ 31、C# 53、JavaScript 39、cmd 28、PowerShell 50。合計 **995件（対応933／参照専用62）**。照合個票は `docs/audit/reference-r2.json` 917行／`docs/audit/reference-r6.json` 78行。詳細は `docs/audit/MUSE-FIX-BATCH2.md`。

この修正で確定した宣言事項：

- Python：次の組み込み名は PY_BUILTINS の受理のみで専用処理はなく、呼び出すと未対応として停止します（リファレンス項目はありません）：ascii、breakpoint、bytearray、bytes、callable、classmethod、compile、complex、delattr、dir、eval、exec、frozenset、getattr、globals、hasattr、hash、help、id、issubclass、locals、memoryview、object、property、setattr、slice、staticmethod、super、vars。例外クラス名（Exception、ValueError 等25件）は項目化し、raise 文と try のハンドラ照合で処理します（コンストラクタ呼び出しを値として使う形は未対応）。また TYPE_ATTRS に載る次のメソッドは参照のみ受理され、呼び出しは未対応として停止します（リファレンス項目はありません）：str の casefold、center、encode、expandtabs、format_map、isprintable、istitle、ljust、maketrans、partition、removeprefix、removesuffix、rjust、rpartition、splitlines、swapcase、translate、zfill、dict の fromkeys、set の isdisjoint、issubset、issuperset、int の as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes、float の as_integer_ratio、conjugate、fromhex、hex、is_integer、bool の as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes。with 文は部分対応です（本文は実行し、as 変数には未確定値が入り、__enter__／__exit__ の処理や後始末は再現しません。open との組み合わせは open 自体が未対応のため停止します）。
- JavaScript：`length`（配列・文字列のプロパティ）は意図的除外とする。使用中チップの refs には含めないことをテストで明示検証している設計判断（`tests/muse-fix-core.test.js`）に基づき、リファレンス項目は設けない。プロパティ自体の読み取りはモデルで対応している。
- AutoHotkey：組み込み変数 A_* は、A_Index を個別項目とし、その他の実装済み110件は束ね項目「A_*（組み込み変数）」に集約する。scan は実装済みの A_* 名を束ね項目（A_Index は個別項目）へ解決する。明示的に未対応の21件（A_LoopField 等）は項目化も解決もしない。
- ImageJ：`Dialog.` 接頭辞の汎用受理（ステップ表示＋未確定値）で処理される18件は項目化し、汎用モデルである旨を注意書きに明記した。SIM_EXTRA のみの7件（getMetadata、String.format 等）は実装がなく実行時に未確認として停止するため、項目化しない。
- C 系：unsigned／signed の複合型名による変数宣言は対応済み（キャスト節の記述も本節で是正）。C# の符号なし型（byte／uint／ushort）は、代入時の変換で対応する符号付き型の範囲を超える値を停止するモデル制限があり、該当項目の注意書きに明記した。
