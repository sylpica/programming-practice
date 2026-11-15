# リファレンス完全性修正 R22：C／C++／C#（C系）裁定記録

- 対象：`reference-completeness-round22.md` の「C」「C++」「C#」節（第1層・第2層の全件）
- 実装：`js/core/c-family.js`（共有リファレンス行の追加と `if` 項目の文面追記のみ。エンジン挙動は変更していない）、`js/types/c| cpp| csharp/reference-details.js`（returns／source の追加）
- 検証：`tests/muse-fix-ref-cfamily.test.js`（新規10件、全合格）、`tests/audit.test.js` の自種分（c／cpp／csharp の runnable reference は全合格。同スイートの失敗4件は imagej 担当分で本担当外）、`tests/muse-fix-cfamily.test.js`（41件全合格）
- 一次情報：cppreference（C／C++）、Microsoft Learn（C# 言語リファレンス／.NET API）。各項目の source は `cfamily-r2.json` に項目ごとに記録。

## 件数サマリ

| 言語 | 修正前 | 第1層（追加） | 第2層（追加） | 第2層（文面・言及で解消） | 修正後 |
|---|---|---|---|---|---|
| C | 9 | 17 | 0 | else 1（if 追記） | 26 |
| C++ | 10 | 21 | 0 | else 1（if 追記）、cin 1（getline 言及） | 31 |
| C# | 11 | 23 | 静的メンバー定数 19 | else 1（if 追記） | 53 |

## C（第1層17件：全件を項目追加で解消）

| 名前 | 裁定 | 理由・根拠（一次情報） |
|---|---|---|
| long | 項目追加 | 宣言・キャスト・sizeof が動作する基本型。cppreference C arithmetic types。別名 long int／signed long と、`long long` の long への畳み込み受理を本文・注意書きに明記 |
| float | 項目追加 | 同上。f 接尾辞の扱いを注意書きに明記 |
| char | 項目追加 | 同上。モデルでは文字コード数値として扱うこと、符号が処理系依存で範囲外変換は未確認として停止することを明記 |
| short | 項目追加 | 同上。別名 short int／signed short を明記 |
| bool | 項目追加（部分実装の明記） | 宣言・代入は動作するが、`(bool)` キャストは C では明示的に未対応（parseCast が名前を挙げて停止）という部分実装である点を注意書きに正直に記載 |
| unsigned int | 項目追加 | 複合型名で宣言が動作。別名 `unsigned`（= unsigned int）を本文に明記。宣言側の旧記述との食い違いは後節の文案を参照 |
| unsigned long | 項目追加 | 同上。別名 unsigned long int、`unsigned long long` の unsigned long への畳み込み受理を明記 |
| unsigned short | 項目追加 | 同上。別名 unsigned short int を明記 |
| unsigned char | 項目追加 | 同上。char と別型で符号なしが保証される旨を明記 |
| signed char | 項目追加 | 同上。`signed` 単独（= int）との違いを含め、char と別型である旨を明記 |
| do | 項目追加 | do-while は実装済みでトレース refs が `do` を出す。cppreference C do |
| sizeof | 項目追加 | 型形式・式形式とも実装済み。モデルサイズ表（char・bool=1、short=2、int・float=4、double=8、long は longBits）と結果型（size_t 相当）を本文に明記。cppreference C sizeof |
| キャスト | 項目追加（項目名「キャスト」） | C形式キャスト `(型)式` が実装済み。書式は cppreference C cast operator（`( type-name ) expression`、実在を確認）で照合。C では (bool) キャスト未対応である旨を注意書きに明記 |
| 三項演算子 | 項目追加（項目名「三項演算子」） | 条件演算子 `?:` が実装済み。cppreference C operator_other（conditional operator）で照合 |
| abs | 項目追加 | call ハンドラに専用処理あり。INT_MIN は未定義動作として停止する旨を明記。cppreference C abs |
| break | 項目追加 | 共有パーサ・実行系に実装済みで refs が `break` を出す。cppreference C break |
| continue | 項目追加 | 同上。cppreference C continue |

## C++（第1層21件：全件を項目追加で解消）

C 共通17件（long、float、char、short、bool、unsigned int、unsigned long、unsigned short、unsigned char、signed char、do、sizeof、キャスト、三項演算子、abs、break、continue）は C と同じ裁定で項目追加。相違点：**bool は `(bool)` キャストを含め完全対応**であり、その旨を項目に記載（実走でも確認）。一次情報は cppreference C++ 側ページ（types／do／sizeof／explicit_cast／operator_other／math/abs／break／continue）。

| 名前 | 裁定 | 理由・根拠（一次情報） |
|---|---|---|
| string（std::string） | 項目追加 | 既定構築・直接初期化・添字読み書き・`+`／`+=` 連結・比較が実装済み。メソッド（.length() 等）は未実装である旨を注意書きに明記。cppreference basic_string |
| 参照（`型&`） | 項目追加（項目名「参照」） | C++専用ゲートで宣言が動作し、別名経由の読み書きが参照先へ伝播する（使用例で実走確認：`ref = 2` 後に `n` が 2）。ポインタとは別概念である旨を明記。cppreference reference |
| getline | 項目追加 | `std::getline(std::cin, 変数)` 形式のみ実装済み。モデルでは入力を未確定値として扱う旨を明記。cppreference basic_string/getline |
| endl | 項目追加 | `std::endl` が改行として評価される。実物は改行＋フラッシュのマニピュレータだがモデルではフラッシュを再現しない旨を明記。cppreference manip/endl |

## C#（第1層23件：全件を項目追加で解消）

| 名前 | 裁定 | 理由・根拠（一次情報） |
|---|---|---|
| long | 項目追加 | System.Int64。Microsoft Learn integral numeric types |
| float | 項目追加 | System.Single。Microsoft Learn floating-point numeric types |
| char | 項目追加 | 16ビット Unicode 文字（System.Char）。Microsoft Learn char |
| bool | 項目追加 | System.Boolean。Microsoft Learn bool |
| short | 項目追加 | System.Int16。integral numeric types |
| string | 項目追加 | 参照型。Length と添字に対応する旨を明記。Microsoft Learn reference types |
| uint | 項目追加 | System.UInt32。モデル側の制限（後述）を注意書きに明記 |
| ulong | 項目追加 | System.UInt64。境界値が未確定値になる旨を明記 |
| ushort | 項目追加 | System.UInt16。`ushort.MaxValue／MinValue` が静的表になく未対応で停止する非対称を注意書きに明記 |
| byte | 項目追加 | System.Byte。モデル側の制限（後述）を注意書きに明記 |
| sbyte | 項目追加 | System.SByte。integral numeric types |
| do | 項目追加 | do-while 実装済み。iteration statements |
| 三項演算子 | 項目追加（項目名「三項演算子」） | 条件演算子 `?:` 実装済み。`??` は未対応である旨を明記。Microsoft Learn conditional operator |
| キャスト | 項目追加（項目名「キャスト」） | C#専用 parseCast が実装済み。decimal へのキャストのみ未対応である旨を明記。Microsoft Learn type-testing-and-cast |
| foreach | 項目追加 | C#専用ゲートで実装済み、refs が `foreach` を出す。iteration statements |
| unchecked | 項目追加 | ブロック・式の両形式が実装済み。既存 checked 項目と対になる。checked-and-unchecked |
| new | 項目追加（項目名「new」） | new 式は `new 型[個数]`、`new 型[] {…}`、引数なし `new クラス名()` のみ対応である旨を明記。Microsoft Learn new operator |
| 文字列補間 | 項目追加（項目名「文字列補間」） | `$"…{式}…"` の基本形が実装済み。配置指定・書式指定子は未対応である旨を明記。Microsoft Learn interpolated strings |
| int.TryParse | 項目追加 | （文字列, out 変数）形式が実装済み。int.Parse は未実装である旨を明記。Microsoft Learn Int32.TryParse |
| double.TryParse | 項目追加 | 同上。Microsoft Learn Double.TryParse |
| Length | 項目追加 | 配列・文字列の両表面が実装済み。Microsoft Learn Array.Length（文字列は String.Length） |
| break | 項目追加 | 実装済み。switch はモデル未対応である旨を注意書きに明記。jump statements |
| continue | 項目追加 | 実装済み。jump statements |

## C# 静的メンバー定数19件（第2層：全件を個別項目として追加）

全名：`int.MaxValue`、`int.MinValue`、`uint.MaxValue`、`uint.MinValue`、`short.MaxValue`、`short.MinValue`、`byte.MaxValue`、`byte.MinValue`、`sbyte.MaxValue`、`sbyte.MinValue`、`char.MaxValue`、`char.MinValue`、`Math.PI`、`Math.E`、`String.Empty`、`string.Empty`、`long.MaxValue`、`long.MinValue`、`ulong.MaxValue`

| 区分 | 件数 | 裁定 |
|---|---|---|
| 実値で返る（int.MaxValue=2147483647、uint.MaxValue=4294967295、Math.PI、String.Empty 等） | 16 | 個別項目を追加。returns に実値を記録し、使用例 `Console.WriteLine(名前);` を実走確認 |
| 未確定値で返る（`long.MaxValue`、`long.MinValue`、`ulong.MaxValue`） | 3 | 個別項目を追加し、**未確定値として返る旨と実値**（9223372036854775807／-9223372036854775808／18446744073709551615）を注意書きと returns に明記 |

## 第2層：else／cin の裁定

| 名前 | 対象 | 裁定 | 理由 |
|---|---|---|---|
| else | C／C++／C# 共通 | 非漏れ化（if 項目へ文面追記） | 修正前の if 項目は構文行に `else { … }` を含むのみで、本文が else の動作を説明していなかったため「不足」と判定。共有の if 項目の説明文を「条件が真なら if のブロック、偽なら else のブロック（あれば）を実行します。else if で条件を連ねることもできます。」へ追記し、3言語とも解消。テストで description／syntax の else 言及を固定 |
| cin（std::cin） | C++ | 非漏れ（独立項目は設けない） | 実装上の用途は getline の第1引数に限られ、`cin >> x` の抽出演算子は未実装（シフト演算として解釈され停止）。getline 項目の本文・注意書きに「std::cin はこの関数の第1引数としてだけ使う」「抽出演算子は未実装」を明記したため、独立項目なしでカバー済みと裁定 |

## 名前解決の確認

- scan（コード文字列照合）で解決を確認：`do`、`sizeof`、`abs`、`break`、`continue`、`string`、`getline`、`endl`、`foreach`、`unchecked`、`new`、`int.TryParse`、`double.TryParse`、`Length`、`int.MaxValue`、`String.Empty`、`Math.PI`、`long.MaxValue` ほか静的定数のドット形式全般。
- トレース refs で解決を確認：複合型名（`unsigned int`、`unsigned long`、`signed char` 等。宣言ノードが型名を refs に出す）、`foreach`、`break`、`int.TryParse`（呼び出し名）。
- 解決機構の対象外（既存方式と同じ扱い）：`キャスト`、`三項演算子`、`参照`、`文字列補間` は記号形式のため項目名を日本語の construct 名とし、scan／refs の自動解決は行われない（PowerShell の「型変換（キャスト）」等と同方式）。構文欄に実記号（`(型)式`、`?:`、`型&`、`$"…{式}…"`）を明記して利用者が引けるようにした。

## 宣言側の陳腐化：DEVELOPMENT.md 修正文案（反映はコーディネーター）

現行コードでは unsigned／signed の複合型名による変数宣言が実際に動作する（宣言・キャスト・sizeof・演算を実走確認）が、`docs/DEVELOPMENT.md` には旧記述が残っている。文案：

1. 24行目（種類別表の C 行・未対応欄）：
   - 現行：「動的確保、構造体、ユーザー関数、多次元、unsignedの変数宣言、複雑な宣言。…」
   - 文案：「動的確保、構造体、ユーザー関数、多次元、複雑な宣言。…」（「unsignedの変数宣言、」を削除）
2. 80行目（キャスト節の末尾）：
   - 現行：「unsignedの変数宣言は引き続き未対応。」
   - 文案：「unsigned／signed の複合型名による変数宣言（unsigned int、unsigned long、unsigned short、unsigned char、signed char。単独の unsigned は unsigned int、signed は int として受理し、long long は long へ畳み込んで受理する）は対応済み。」

## 実走で判明したモデル側の制限（リファレンス漏れではないが項目に明記）

- C# の符号なし型（byte／uint／ushort）は、代入時の変換で対応する符号付き型の範囲（sbyte／int／short）を超える値を「整数への変換が範囲外です」として停止する（例：`byte n = 200;`、`uint n = 3000000000;` は実C#では有効だがモデルでは停止）。uint／byte／ushort の各項目の注意書きに明記した。静的定数自体の参照（`Console.WriteLine(uint.MaxValue);` 等）は正常に動作する。
