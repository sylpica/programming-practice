# プログラミング練習 残件統合台帳（引継ぎ用）

- 作成：2026-11-15、Muse 側。対象リビジョンは `0ee8c7a` 固定（公開サイトと同一）。
- 目的：Codex 側は第3ラウンドで終了し、再開はユーザーがハルモニア2美術完了後に判断する。再開時に全残件を一括で渡せるよう、第1〜14ラウンド系の全残件を根本原因ごとに統合した台帳。再開までは全件「記録のみ」で、コード修正・push・Codex 連絡はしない。
- 材料：findings-round1-local.md／findings-round1-blind-fuzz.md／findings-round1-angleA.md／findings-round1-angleEF-ext.md、integration-round1-draft.md、findings-round2-verification.md、findings-round3-verification.md、findings-round4-solo.md 〜 findings-round14-solo.md、findings-round14b-saturation.md、findings-round14c-ui-pwa.md、repo/docs/audit/REQUIREMENTS.md（Codex 要件対応表）。
- 表記：統合ID は RG-01〜RG-41。重大度は統合元の最大値。再現手順は各統合元の出典ファイルの当該項目に記載されているため、本表では出典（ファイル名＋項目ID）を参照として示す。

## 第1〜3ラウンド由来の残件の確定

- INT-01〜INT-20（第1ラウンド統合表）は、findings-round2-verification.md で「修正済み18／限定範囲つき1（INT-12）／部分修正1（INT-20）」となり、限定・部分の残存として切り出された R2-N3（INT-12 由来）と R2-N1（INT-20 由来）、および R2-N2 は、findings-round3-verification.md で全て解消を確認した。
- Codex の第3ラウンド新規指摘 R3-F1〜F12（12件）は同ファイルで全件、欠陥の実在と修正の正しさを照合済み。
- したがって第1〜3ラウンド由来で未修正のまま残るのは **R3-N1 のみ**であり、RG-08 に収録した。
- 参考（残件に数えない観察）：R2-O1（ファイル取込時の `window.confirm` 上書き確認。ダイアログを抑制する環境では取込が完了しない。テンプレート読込経路ではないため欠陥とされていない）。再開時に INT-01 の裁定範囲と合わせて扱うかは統合側の判断とする。

---

## 統合台帳

### RG-01 共有実行器の深さ上限（64）によるパスの無言欠落
- 根本原因：else-if 連鎖が otherwise 内の入れ子 if として実行され、深さ上限（LIMITS.depth=64）を1条件ごとに消費する。上限超過はパス内のエラーに変換されるため、`truncated`／`reasons` に記録されず、打ち切りの告知なしにパスが欠落する。平坦な連鎖に対して「ブロックの入れ子が深すぎます」と表示される点も原因表示として誤り。
- 重大度：**P2**
- 統合元：R4-N1（findings-round4-solo.md、JavaScript／R／AutoHotkey）、R5-N1（findings-round5-solo.md、C#／c-family 経路）
- 影響する種類・表面：共有スクリプトエンジン（JavaScript／R／AutoHotkey）と C#。65条件以上の else-if 連鎖、深さ64超の入れ子。C／C++ は未知条件を作る手段がなく再現しないことを確認済み。
- 修正方針：else-if を深さを消費しない形で実行する、または深さ超過を打ち切りとして `truncated`＋`reasons` に必ず記録し、パス見出し・バナーで告知する。連鎖に対する文言は実態（連鎖の長さ）に合わせる。
- 受け入れ条件：65条件の else-if（JS／R／AHK／C#）と70段入れ子で、全パスが列挙されるか、欠落が告知されること。64条件まで完全だった既存挙動と、VBA／Python の正挙動に回帰がないこと。

### RG-02 0除算・特殊値の無言の JS 意味論化（Power Apps／Power Automate）
- 根本原因：0除算や特殊値を JavaScript 意味論（Infinity／NaN）で処理し、実物の意味論（Power Fx ではエラー値、Power Automate Desktop では .NET の実行時エラー）に合わせていない。表面によっては表示と最終状態が矛盾する。
- 重大度：**P2**
- 統合元：R11-N2（findings-round11-solo.md、Power Automate：全形式で無言 Infinity／NaN）、R7-N9（findings-round7-solo.md、Power Fx：Notify 表示 "Infinity" と最終状態 null の矛盾）、R12-N27（findings-round12-solo.md、Power Fx：Set に文字列 "Infinity"／"NaN" が格納される。R7-N9 と同根の別表面）
- 影響する種類・表面：Power Apps（表示・変数格納）、Power Automate（式の評価全般）。
- 修正方針：種類ごとの実物意味論に合わせ、0除算は明示エラー（またはエラー値）として、表示・trace・最終状態で一貫させる。ImageJ のように実物が Infinity の種類の扱いとは分離すること。
- 受け入れ条件：`1/0`、`0/0`、`5 % 0` 等の全形式で、実物どおりのエラーになるか、エラー値として全表面が一致すること。

### RG-03 R の NULL の意味論の欠落（長さ0でなく 0 として扱う）
- 根本原因：R エンジンが NULL を長さ1の値 0 として保持し、長さ0オブジェクトとしての意味論を持たないため、算術・比較・関数が誤った値を返す。
- 重大度：**P2**
- 統合元：R7-N1（findings-round7-solo.md、`NULL + 1` → c(1) 等の誤値捏造）、R8-N7（findings-round8-solo.md、`is.na(NULL)` が FALSE を返す。実 R は logical(0)）
- 影響する種類・表面：R の NULL が絡む全演算・関数。表示面の同根表面は RG-04（R5-N6）。
- 修正方針：NULL を長さ0の値として実装し、演算は長さ0を返し、`is.na(NULL)` は logical(0) を返すよう意味論を実 R に合わせる。
- 受け入れ条件：`NULL + 1`、`NULL == NULL`、`length(NULL + 1)`、`is.na(NULL)` が実 R と一致すること。NA の伝播や `c(1, NULL)` の既存の正挙動に回帰がないこと。

### RG-04 値表示の言語別書式の欠落（共有 formatValue が JS 記法のまま）
- 根本原因：共有の値整形（formatValue／display）が JavaScript の文字列表現をそのまま使い、各言語の正規表記（真偽値の大文字小文字、NULL／Inf の表記、浮動小数の既定桁数、配列・レコードの表記、文字列の引用符）に追従しない。trace・出力・最終状態で食い違いや実在しない表示形式を生む。
- 重大度：P3
- 統合元：R4-N3（findings-round4-solo.md、R trace 代入ナレーションの JS 配列記法）、R5-N4（findings-round5-solo.md、VBA Boolean の小文字表示と型名 boolean）、R5-N5（findings-round5-solo.md、Power Fx の Blank が「null」とナレーション）、R5-N6（findings-round5-solo.md、R の NULL が全表面で小文字 "null"）、R5-N7（findings-round5-solo.md、C# bool の trace・最終状態の小文字）、R6-N3（findings-round6-solo.md、C++／VBA／R の浮動小数桁数）、R6-N4（findings-round6-solo.md、C# 連結出力 "xtrue"。R5-N7 と同根の別表面）、R6-N5（findings-round6-solo.md、VBA 文字列出力の引用符）、R7-N7（findings-round7-solo.md、R の Inf が "Infinity"）、R7-N10（findings-round7-solo.md、C# double 書式。R6-N3 と同根の別表面）、R7-N11（findings-round7-solo.md、C# 配列の WriteLine が中身表示）、R8-N8（findings-round8-solo.md、R の空ベクトル表示 c()）、R14B-N3（findings-round14b-saturation.md、R の長さ1の演算結果だけが c(5) と表示され、同値のリテラル表示（5）と食い違う。内部のスカラー／ベクトル型区分が表示に漏れる）
- 影響する種類・表面：VBA／R／C#／C++／Power Apps の trace・出力・最終状態の全表示面。
- 修正方針：値整形を種類別に持ち、真偽・NULL 系・無限大・浮動小数の桁数・配列／ベクトル・文字列の表記を各言語の既定表示に合わせる。実在しない表示形式（c() 等）は作らない。
- 受け入れ条件：各統合元の再現値について、trace・出力・最終状態の3表面すべてが実物の表記と一致すること（同一画面内の矛盾がないこと）。

### RG-05 C# の型意味論の欠落（char・型混在・暗黙縮小）
- 根本原因：C# エンジンの型規則が不完全で、char を文字列のように扱い、型混在の比較・連結や暗黙の縮小変換を、実 C# の型検査なしに処理する（無言の受理・誤値・虚偽の停止が混在）。
- 重大度：**P2**
- 統合元：R7-N2（findings-round7-solo.md、char 算術 `'a' + 1` → "a1"）、R7-N4（findings-round7-solo.md、`1 == "1"` が無言で True）、R7-N5（findings-round7-solo.md、null 文字列との連結が型エラー）、R8-N2（findings-round8-solo.md、文字列への関係演算子の無言受理）、R8-N3（findings-round8-solo.md、`true == 1` が無言で True。R7-N4 と同根の別表面）、R12-N14（findings-round12-solo.md、double → int の暗黙縮小を無言で切り捨て）
- 影響する種類・表面：C# の char 演算、==／関係演算子、文字列連結、数値型の代入変換。
- 修正方針：char の数値昇格、== と関係演算子の型検査、null 文字列の連結規則（null は空として連結）、暗黙縮小の禁止（明示エラー）を実 C# の型規則どおりに実装する。
- 受け入れ条件：統合元の全再現が実 C#（CI の実コンパイラ確認を含む）と一致すること。C／C++ 側の合法な同形コード（char 算術・切り捨て）に回帰がないこと。

### RG-06 パーサの構文認識不足による虚偽・汎用・トークン名指しの原因表示（C系中心）
- 根本原因：パーサに構文の処理自体が存在しない場合に、「未対応」の宣言ではなく、解析位置の無関係なトークン（本体先頭、型名、変数名、区切り記号）を名指すか、汎用の解釈エラーで停止する。宣言（DEVELOPMENT.md の対応・未対応リスト）にも記載がないものが多い。
- 重大度：**P2**
- 統合元：R12-N9（findings-round12-solo.md、三項演算子が C／C++／C#／JavaScript の全位置で汎用・虚偽の停止。R7-N3・R9-N6 を包摂する全位置版）、R7-N3（findings-round7-solo.md、三項演算子の引数位置）、R9-N6（findings-round9-solo.md、C++ cout チェーン内の三項演算子）、R11-N1（findings-round11-solo.md、C# 文字列補間が未宣言＋汎用停止。Learn 逐語例5件が全滅）、R9-N3（findings-round9-solo.md、C／C++ の中括弧なし if-else）、R10-N4（findings-round10-solo.md、C# の中括弧なし if-else）、R10-N5（findings-round10-solo.md、JavaScript の do-while が本体トークン名指し）、R12-N10（findings-round12-solo.md、switch が JS／C／C++／C#／AHK で "{" 名指し。C系 do-while の同根表面を含む）、R9-N4（findings-round9-solo.md、C／C++ のユーザー関数定義が「キャスト形式」を名指し）、R11-N3（findings-round11-solo.md、C# `int.MaxValue` が「未定義の名前：int」）、R12-N15（findings-round12-solo.md、C# キャスト `(int)d` が「未定義の名前：int」。R11-N3 と同根の別表面）、R11-N10（findings-round11-solo.md、C# `new DateTime` が変数名を名指し）、R11-N11（findings-round11-solo.md、代入式の被演算子位置が JS／C／C++／C# で「) が必要です」）、R12-N1（findings-round12-solo.md、C# foreach が未宣言＋汎用停止）、R12-N2（findings-round12-solo.md、C# checked／unchecked の式形式が「関数」扱い）、R12-N11（findings-round12-solo.md、C系の前置 ++／--）、R12-N12（findings-round12-solo.md、C系の複合代入 %=）、R12-N13（findings-round12-solo.md、C系の二項シフト <<／>>）、R12-N16（findings-round12-solo.md、C# 文字列の .Length）、R14-N4（findings-round14-solo.md、C++ のジェネリック型宣言。vector／set は NameError、map／pair はカンマ名指し）、R14-N5（findings-round14-solo.md、C# の静的フィールド参照 `Math.PI`／`Math.E`／`String.Empty` が「未定義の名前：Math／String」。R11-N3 と同根の別表面）、R14-N6（findings-round14-solo.md、C# `int.TryParse`／`double.TryParse` の `out` 引数が「) が必要です」）、R14-N7（findings-round14-solo.md、C# の初期化子付き配列生成式 `new T[] { ... }` が汎用原因で停止。サイズ指定形式は動作）、R14-N8（findings-round14-solo.md、C# のジェネリック型宣言 List／Dictionary／HashSet が汎用・トークン名指し）、R14-N10（findings-round14-solo.md、C++ `std::getline(std::cin, s)` が「未定義の名前：cin」。値位置の cin 参照だけが虚偽原因になる）
- 影響する種類・表面：C／C++／C#（c-family パーサ）が中心。JavaScript・AutoHotkey の同型表面（do-while、switch、代入式）を含む。
- 修正方針：構文ごとに「実装する」か「構文名を挙げた未対応宣言で停止し、宣言リストにも記載する」かのどちらかに統一する。三項演算子・文字列補間・foreach など教材頻出の構文は実装の可否を優先的に判断する。型名・変数名・本体トークンを原因にしない。
- 受け入れ条件：統合元の全再現コードで、実物どおりに動作するか、構文名を挙げて正直に停止すること。「) が必要です」「未定義の名前：＜型名＞」等の虚偽原因が再現しないこと。

### RG-07 共有スクリプトパーサ（script.js）の式解析の不足・誤認（JavaScript／R／Power Fx／AutoHotkey）
- 根本原因：共有スクリプトパーサの式解析が、文脈依存の構文（宣言初期化子のレコードリテラル、コールバック、行末継続、値としての if）を誤認し、未対応構文についてはパーサ内部の期待文や対象オブジェクト名を原因として表示する。
- 重大度：**P2**
- 統合元：R12-N6（findings-round12-solo.md、JavaScript の宣言初期化子のレコードリテラル `{a: 1}` が「} が必要です」で停止）、R9-N5（findings-round9-solo.md、JavaScript のコールバックが「) が必要です」）、R11-N8（findings-round11-solo.md、JavaScript の未対応構文が内部期待文・汎用エラーになる。`?.`／for-of／スプレッド／分割代入／`new Date` を集約）、R12-N17（findings-round12-solo.md、JavaScript の `??` が内部文言で停止。R11-N8 と同根の別表面）、R12-N18（findings-round12-solo.md、JavaScript の静的メンバーが「未定義の名前：Math／JSON 等」の虚偽原因）、R9-N9（findings-round9-solo.md、R の行末演算子による式継続が空トークンの原因表示で停止）、R13-N12（findings-round13-solo.md、R の if 式（値位置）が「if／else は未対応」の虚偽原因）、R8-N6（findings-round8-solo.md、Power Fx の in／exactin が「) が必要です」）、R14B-N2（findings-round14b-saturation.md、式の途中改行（括弧・添字・演算子の後の継続）が JavaScript／AutoHotkey／Power Apps で全般に失敗し、見えない改行トークンが原因表示になる。R9-N9 の R 表面と同根の、他種類および括弧／添字内範囲への拡大）
- 影響する種類・表面：JavaScript／R／Power Apps（Power Fx）／AutoHotkey の式解析全般。
- 修正方針：レコードリテラルの文脈判定（宣言初期化子）を修正する。未対応構文は演算子・構文名を挙げて停止し、内部期待文を出さない。静的メンバーはオブジェクト名ではなくメンバー名を原因とする。R の行末継続と値としての if を実装するか正直に宣言する。
- 受け入れ条件：統合元の全再現で、動作するか構文名を挙げた停止になること。配列内・引数位置など既に動く位置のレコードリテラルに回帰がないこと。

### RG-08 AutoHotkey パーサの構文認識不足による虚偽・汎用・空の原因表示
- 根本原因：AutoHotkey のパーサが、文形式（括弧なし）呼び出しの引数解析、宣言構文（関数定義・class）、参照渡し、引数省略、特殊ループ等を認識できず、関数名・区切り記号・本体トークンを名指すか、空の原因表示で停止する。
- 重大度：P3
- 統合元：R3-N1（findings-round3-verification.md、文形式呼び出しで単項 +/− で始まる引数が「未定義の名前：＜関数名＞」になる。第4ラウンドで再現範囲の拡大＝引数の全形式と引数なし文形式を確認済み）、R6-N6（findings-round6-solo.md、文形式で1文字の括弧文字列が解釈エラーになり内部トークン `<eof>`／`.concat` が露出）、R9-N7（findings-round9-solo.md、for ループが「( が必要です」）、R9-N8（findings-round9-solo.md、`.=` 連結代入が「式を解釈できません：=」）、R11-N5（findings-round11-solo.md、ユーザー関数定義が "{" を名指し）、R12-N3（findings-round12-solo.md、Try／Catch が「レコードのフィールド名が必要です」）、R13-N5（findings-round13-solo.md、IsSet／IsSetRef が未設定変数で NameError）、R13-N6（findings-round13-solo.md、ByRef 引数 `&変数` が「未定義の名前」）、R13-N7（findings-round13-solo.md、引数の中間省略がカンマを名指し）、R13-N8（findings-round13-solo.md、ラベル／Goto が空の原因表示）、R13-N9（findings-round13-solo.md、Loop Files／Parse／Read がカンマを名指し）、R13-N10（findings-round13-solo.md、Switch 文と class 定義が "{" を名指し。Switch は RG-06 の R12-N10 と表面が重なる）
- 影響する種類・表面：AutoHotkey の文形式呼び出しと宣言構文全般。
- 修正方針：文形式引数の解析（単項符号・文字列リテラル・省略・参照渡し）を全面的に見直す。未対応の宣言構文は構文名を挙げて停止し、内部トークンを表示しない。
- 受け入れ条件：統合元の全再現に加え、文形式の引数パターン横断（文字列・数値・変数・式・符号始まり・省略・参照）で、動作するか正直な停止になること。

### RG-09 VBA パーサの構文エラーの誤分類
- 根本原因：VBA パーサが構文エラーを誤った構文カテゴリに分類し、無関係な構文名や汎用文で停止する。宣言済みの未対応でも対象を名指さない。
- 重大度：P3
- 統合元：R6-N7（findings-round6-solo.md、ブロック終端欠落が「End Sub の位置が不正」）、R6-N8（findings-round6-solo.md、`Dim x As` の型名欠落に無関係な原因）、R12-N4（findings-round12-solo.md、ReDim／ReDim Preserve が汎用の「式が必要です」。宣言済み未対応なのに名指さない）、R14B-N4（findings-round14b-saturation.md、行継続 `_` が未対応で、継続行の先頭トークンを原因として停止する。宣言の対応・未対応リストのどちらにも記載なし）
- 影響する種類・表面：VBA の構文エラー表示。
- 修正方針：ブロック終端の欠落は欠けている End X を、型名の欠落はその旨を、ReDim は宣言済み未対応として構文名を挙げて表示する。行継続 `_` は実装するか、未対応として構文名を挙げて停止する（継続行のトークンを原因にしない）。
- 受け入れ条件：統合元の全再現で、直すべき箇所を指す原因表示になること。

### RG-10 アクション／データ形式エンジンの原因表示（決め打ち・生エラー・付け替え）
- 根本原因：入力形式やブロック構造の検証が、アプリ自身の言葉でない表示（単一メッセージへの決め打ち、第三者ライブラリの生エラー）になるか、ブロックの事前検証が本来の原因（開始コマンドの未対応）を別の対象（end）に付け替える。
- 重大度：P3
- 統合元：R6-N9（findings-round6-solo.md、JSON 構文エラーが PA／UI.Vision／CFN で「JSONのキーは文字列で指定してください」に決め打ち）、R12-N5（findings-round12-solo.md、CloudFormation の YAML 短縮タグがライブラリの生エラー（英語）で停止。宣言済み未対応）、R13-N2（findings-round13-solo.md、UI.Vision の forEach…end が end を指す汎用原因で停止し本来の原因が隠れる）
- 影響する種類・表面：Power Automate／UI.Vision／CloudFormation の入力検証とエラー表示。
- 修正方針：JSON パーサの失敗理由を分類して表示する。YAML 短縮タグは未対応宣言に変換する。ブロック検証は開始コマンド側の未対応を優先して表示する。
- 受け入れ条件：統合元の全再現で、実際の誤りを指す日本語の原因表示になること。

### RG-11 数値リテラル・型名の字句解釈の不備
- 根本原因：数値リテラルの字句解析が、基数接頭辞（0x／0b／0o）・先行ゼロ・接尾辞（U／UL／ULL／LL／L／m）・複合型名（long long）を言語別文法どおりに処理できず、誤値の受理、虚偽の原因表示、実在しない変数の生成を起こす。
- 重大度：**P2**
- 統合元：R5-N2（findings-round5-solo.md、先行ゼロ `077` を十進解釈する誤値。C／C++ は実物 63、`08` の無言受理、Python／JavaScript の本来エラーになる `077` の無言受理）、R4-N2（findings-round4-solo.md、0x／0b／0o が Python 以外で虚偽の原因表示で停止）、R5-N3（findings-round5-solo.md、C系の U／UL／ULL 接尾辞が部分受理され値とエラーが同時に出る）、R7-N6（findings-round7-solo.md、C／C++ の long long 誤読と幻の変数 "long"、LL 接尾辞）、R8-N4（findings-round8-solo.md、C# の decimal リテラル（m 接尾辞）が虚偽の原因表示で停止）
- 影響する種類・表面：JavaScript／R／C／C++／C#／AutoHotkey の数値リテラル全般。
- 修正方針：言語別のリテラル文法を実装する。対応しない形式は、リテラルの形式自体を名指して停止し、誤値を受理しない。先行ゼロの可否は言語ごとに実物どおりにする。
- 受け入れ条件：統合元の一覧について実コンパイラ／実物（gcc／g++／CPython／Node）と照合し一致すること。最終状態に幻の変数が現れないこと。

### RG-12 数値文字列の暗黙変換規則の欠落（VBA／Power Fx）
- 根本原因：数値化できる文字列の暗黙変換規則が、演算子・種類ごとに欠けている（VBA の `+` の混合型だけが変換規則を欠く。Power Fx の `+` と `=` に変換がない）。
- 重大度：**P2**
- 統合元：R6-N1（findings-round6-solo.md、VBA の `"5" + 3` が型エラー。実 VBA は 8）、R6-N12（findings-round6-solo.md、Power Fx の `"5" + 3` が型エラー。実ランタイム未確認の留保つき）、R7-N8（findings-round7-solo.md、Power Fx の `=` が大文字小文字を区別し数値文字列と変換しない。実ランタイム未確認の留保つき）
- 影響する種類・表面：Excel VBA の `+`、Power Apps の算術と比較。
- 修正方針：VBA は古典規則どおり `+` の混合型変換を実装する。Power Fx は公式仕様と実ランタイムで変換規則を確定させてから実装する（留保の解消が前提）。
- 受け入れ条件：VBA は `"5" + 3`／`5 + "3"` が 8 になり、`"a" + 3` の正しいエラーなど周辺規則と一致すること。Power Fx は一次情報で確定した規則と一致すること。

### RG-13 AutoHotkey の暗黙連結の未実装
- 根本原因：空白区切りの暗黙連結が式の文法に組み込まれておらず、現れる位置によって結果が無言で欠落するか、虚偽の原因で停止する。
- 重大度：**P2**
- 統合元：R10-N2（findings-round10-solo.md、代入文で第2オペランド以降が無言で欠落。引数位置では変数名を名指して停止する表面も同項目に記録）、R13-N13（findings-round13-solo.md、引数位置で「) が必要です」の虚偽原因）
- 影響する種類・表面：AutoHotkey の文字列構築全般（公式チュートリアルの典例形）。
- 修正方針：暗黙連結を式として実装し、代入・引数・文の各位置で一貫させる。
- 受け入れ条件：公式 Beginner Tutorial §5／§6 の典例（`MsgBox "MyVar equals " MyVar "!!"` 等）が実物どおりに動作すること。

### RG-14 R の演算子の型検査回避と関数定義の虚偽原因
- 根本原因：R エンジンの演算子実装で、NA 伝播や `^` の恒等処理といった近道が被演算子の型検査より先に効き、本来エラーになる式が無言で NA／1 を返す。関数定義は未対応と宣言されず、引数名の NameError という虚偽原因になる。
- 重大度：P3
- 統合元：R12-N19（findings-round12-solo.md、文字列×NA 等が無言で NA／1）、R12-N20（findings-round12-solo.md、`%in%` が文字被演算子で「数値の型が一致しません」）、R12-N23（findings-round12-solo.md、関数定義が引数名の NameError で停止）、R14-N9（findings-round14-solo.md、引数位置の無名関数式 `sapply(c(1, 2), function(v) v * 2)` が「) が必要です」の虚偽原因で停止。R12-N23 と同根の別表面）
- 影響する種類・表面：R の二項演算子と関数定義。
- 修正方針：型検査を近道処理より先に行う。`%in%` は被演算子の型に応じた正直な原因にする。関数定義は未対応と宣言して停止する。
- 受け入れ条件：統合元の全再現が実 R のエラー／結果と一致すること。数値での NA 伝播など正挙動に回帰がないこと。

### RG-15 宣言範囲外の引数の無言無視（受理して捨てる）
- 根本原因：関数・メソッドの引数検証がなく、対応範囲外の引数（書式、length.out、each、キーワード引数）がエラーにならず受理されて無言で捨てられ、学習者が効いたと誤認する結果を返す。
- 重大度：P3
- 統合元：R8-N5（findings-round8-solo.md、Power Fx の Text(値, 書式) の書式引数の無言無視）と R12-N30（findings-round12-solo.md、同上。**同一表面の二重計上のため統合先で1表面として扱う**）、R12-N21（findings-round12-solo.md、R の seq の length.out／along.with の無言無視）、R12-N22（findings-round12-solo.md、R の rep の each 等。単独では虚偽エラー、併用では無言無視で誤値）、R12-N29（findings-round12-solo.md、Python の dict.get のキーワード引数の無言無視。解説・実物は TypeError）
- 影響する種類・表面：Power Apps／R／Python の関数引数全般。
- 修正方針：対応しない引数は、引数名を挙げて停止するか、正しく実装する。受理して捨てる経路をなくす。
- 受け入れ条件：統合元の全再現で、正しい結果か、引数を名指した正直な停止になること。

### RG-16 Power Fx の引数検証とスコープ解決の欠落
- 根本原因：Power Fx の引数の個数・空の検証がなく、スコープ外の名前付き演算子（ThisRecord）が未定義として扱われず素通りする。
- 重大度：**P2**
- 統合元：R6-N2（findings-round6-solo.md、空引数が黙って実行され、`Set(x, )` で既存値が無言で Blank に消える、`Notify()` が "null" を出す）、R13-N1（findings-round13-solo.md、トップレベルの ThisRecord が無言で「未設定」として格納される）
- 影響する種類・表面：Power Apps の関数呼び出し全般とレコードスコープ。
- 修正方針：空引数・個数不足を構文エラーとして停止する。スコープ外の ThisRecord 等は名前を挙げて停止する。
- 受け入れ条件：統合元の全再現が構文エラー／名前を挙げた停止になること。ForAll 内の ThisRecord の正挙動に回帰がないこと。

### RG-17 ImageJ の対応関数の実装不備（状態反映・出力引数・表示）
- 根本原因：対応（supported）と宣言した ImageJ モデル関数の実装が公式仕様どおりでなく、書き込み系の無言 no-op、出力引数の評価順の誤り、表示整形の破壊、選択種別の記録漏れがある。
- 重大度：**P2**
- 統合元：R12-N7（findings-round12-solo.md、changeValues が無言で完全に何もしない）、R12-N8（findings-round12-solo.md、setMinAndMax が無言で反映されない）、R8-N10（findings-round8-solo.md、endsWith の空サフィックスが 0。実物は Java 準拠で 1）、R8-N11（findings-round8-solo.md、d2s の Infinity／NaN 表示が "Infini.ty"／"N.aN" に破壊される）、R12-N31（findings-round12-solo.md、selectionType が直線・折れ線で「実行時に決まる値」になり解説のコード表と食い違う）、R13-N3（findings-round13-solo.md、getBoundingRect が未代入の出力変数という正規の形で虚偽原因で停止）
- 影響する種類・表面：ImageJ の測定・選択・画素・表示系の対応関数。
- 修正方針：公式ソース（ij.macro.Functions）と照合して各関数を実装し直すか、正直な未対応に格下げする（宣言と実装を一致させる）。出力引数を持つ関数は引数を値として先行評価しない。
- 受け入れ条件：統合元の全再現が公式仕様と一致すること。同型の出力引数関数（getDimensions 等）の横断確認で新たな虚偽原因が出ないこと。

### RG-18 その他の対応関数の実装不備（Power Fx LookUp／VBA Replace）
- 根本原因：対応と宣言した関数の意味論の実装が不完全で、引数が無視される（LookUp の削減列）、任意引数が不正確な原因で拒否される（Replace）。Text() のレコード文字列化が JavaScript 既定の "[object Object]" になる点も含む。
- 重大度：**P2**
- 統合元：R8-N1（findings-round8-solo.md、Power Fx LookUp の削減列引数が無視され "[object Object]" が表示される）、R8-N9（findings-round8-solo.md、VBA Replace の任意引数が「引数の数が一致していません」という不正確な原因で拒否される）
- 影響する種類・表面：Power Apps の LookUp／Text、Excel VBA の Replace。
- 修正方針：LookUp の第3引数（削減列）を実装し、レコード値の文字列化を人間向け表示にする。Replace の任意引数（start／count／compare）を実装するか、未対応の対象を正確に名指して停止する。
- 受け入れ条件：統合元の再現が公式仕様どおりの結果・表示になること。Filter＋CountRows 等の正挙動に回帰がないこと。

### RG-19 AutoHotkey の配列が 0-based
- 根本原因：配列モデルが JavaScript 配列の 0 始まりをそのまま使い、AutoHotkey v2 の 1 始まりと矛盾する。A_Index は正しく 1 始まりのため、エンジン内部でも規約が食い違う。
- 重大度：**P2**
- 統合元：R9-N1（findings-round9-solo.md、`a[1]` が2番目の要素を無言で返し、慣用形 `a[A_Index]` が壊れる）
- 影響する種類・表面：AutoHotkey の配列全般。
- 修正方針：添字の意味論を 1 始まりに合わせる（内部表現・境界エラー・表示の全て）。
- 受け入れ条件：`a[1]` が先頭、`a[0]` がエラー、`a[A_Index]` の慣用ループが全要素を処理すること。

### RG-20 VBA の ":" / "," 1文字文字列リテラルの停止
- 根本原因：中身がちょうど ":" または "," の文字列リテラルを被演算子・引数として使うと停止する（区切り文字とリテラル内容の混同が疑われる。出典ファイルの切り分けによる）。
- 重大度：**P2**
- 統合元：R9-N2（findings-round9-solo.md、`"結果" & ":" & total`、`Len(":")` 等が「式が必要です」で停止。ラベル組み立て・CSV 連結の常套形）
- 影響する種類・表面：Excel VBA の文字列リテラル全般。
- 修正方針：リテラルの内容に依存しない字句・構文処理にし、区切り文字とリテラルを混同しない。
- 受け入れ条件：被演算子・引数・代入右辺の全位置で、":" / "," リテラルを含む再現コードが動作すること。

### RG-21 R のコロン演算子 `:` の優先順位の逆転
- 根本原因：式パーサの優先順位で `:` が最も緩く結合するようになっており、実 R（`*` や `-` より強く結合）と正反対のため、算術式が隣接すると無言で誤値になる。
- 重大度：**P2**
- 統合元：R10-N1（findings-round10-solo.md、公式マニュアル §2.3 の比較例 `2*1:15`／`1:n-1`／`1:n+1` が全て誤値）
- 影響する種類・表面：R の `:` を含む式全般。
- 修正方針：優先順位表を実 R の演算子優先順位に合わせる。
- 受け入れ条件：マニュアル §2.3 の比較例3件が実 R と一致し、単独の `1:n`・降順 `n:1` の正挙動に回帰がないこと。

### RG-22 UI.Vision のテキスト由来変数の型付け
- 根本原因：store／storeText／storeValue で保存されたテキスト由来の値が、executeScript／while の式評価で文字列型のまま渡され、製品のテキスト置換→JavaScript 評価（数値として扱われる）と異なる結果になる。
- 重大度：**P2**
- 統合元：R10-N3（findings-round10-solo.md、公式 while 慣用形が "01"／"011" と誤った値・回数で動く）
- 影響する種類・表面：UI.Vision の変数と式評価全般。
- 修正方針：スクリプト評価に渡す値の型付けを製品仕様に合わせ、数値として解釈できる値は数値として渡す。
- 受け入れ条件：公式ドキュメントの while 慣用形が 0, 1, 2 の3回で正しく動き、executeScript で数値を返した場合の既存の正挙動に回帰がないこと。

### RG-23 VBA のエラー行番号の二重表示
- 根本原因：VBA エンジン（js/engine.js）の3箇所がエラーメッセージ本文に行番号を埋め込んでおり、UI 側の「N行：」前置と二重化する。他エンジンは line フィールド分離の設計で発生しない。
- 重大度：P3
- 統合元：R9-N10（findings-round9-solo.md、未終了文字列で「3行：3行：…」）、R11-N7（findings-round11-solo.md、レキサの未知文字でも二重表示。R9-N10 と同根の別表面）
- 影響する種類・表面：Excel VBA のエラー表示（ステータス欄）。
- 修正方針：メッセージ本文から行番号を取り除き、line フィールドに分離する（他エンジンと同設計に統一）。該当は engine.js の3箇所全て。
- 受け入れ条件：未終了文字列・未知文字の両方で、UI の行番号が1回だけ表示されること。

### RG-24 VBA の括弧なし組み込み関数参照が暗黙変数として Empty になる
- 根本原因：括弧なしで参照された組み込み関数名が関数として解決されず、Option Explicit のない VBA の暗黙宣言に紛れて、実在しない変数として Empty になる。`Date`／`Now` は正しく「実行時に決まる」として扱われるのと対照的。
- 重大度：P3
- 統合元：R11-N9（findings-round11-solo.md、`Time` が暗黙変数になり幻の変数 `time=Empty` が最終状態に現れる）、R13-N4（findings-round13-solo.md、同現象が Rnd／Timer／Command／CurDir／FreeFile／DoEvents／IMEStatus の7関数にもあることを確認）
- 影響する種類・表面：Excel VBA の引数なし組み込み関数全般。
- 修正方針：括弧なし参照を組み込み関数として解決し、「実行時に決まる」値として扱うか、名前を挙げて正直に停止する。暗黙変数に落とさない。
- 受け入れ条件：対象8関数全件で、値が正しく扱われるか名前を挙げた停止になり、最終状態に幻の変数が現れないこと。

### RG-25 CloudFormation の未設定値 "undefined" の学習者向けメッセージ混入
- 根本原因：未設定の値（マクロ名、展開 status の失敗理由）を、そのまま JavaScript の undefined の文字列化としてエラーメッセージに埋め込んでいる。
- 重大度：P3
- 統合元：R11-N4（findings-round11-solo.md、配列形式 Fn::Transform で「マクロ（undefined）」）、R12-N32（findings-round12-solo.md、status のない応答で「失敗しました（undefined）」。R11-N4 と同根の別表面）
- 影響する種類・表面：CloudFormation のマクロ展開とシミュレーション応答のエラー表示。
- 修正方針：未設定時は名前や理由を捏造せず、欠落自体を正確に表示する（例：マクロ名が応答に含まれていません）。
- 受け入れ条件：両再現で "undefined" が画面に出ず、欠落が学習者の言葉で表示されること。

### RG-26 ImageJ の `macro "…" { }` 定義が定義として処理されず本文が実行される
- 根本原因：Macro Set の定義形が、定義のみを登録して呼び出されない間は何もしないという実物の意味論（skipMacro）で処理されておらず、本文がそのまま実行される。
- 重大度：P3
- 統合元：R11-N6（findings-round11-solo.md、公式 Macro Sets 逐語例で定義ブロック内の print が実際に実行され誤った観測値が表示される）
- 影響する種類・表面：ImageJ のマクロ定義（Macro Sets の読み替え全般）。
- 修正方針：定義形を検出したら本文を実行せず、定義として登録のみ行う（実物の意味論に合わせる）。
- 受け入れ条件：公式 Macro Sets 例で出力が出ないこと。通常のトップレベル実行との混在でも定義部が実行されないこと。

### RG-27 VBA の Select Case のパス条件ラベルに内部表現 "false or" が漏れる
- 根本原因：パス条件ラベルの生成が、内部の条件蓄積表現をそのまま文字列化しており、「false or C が 90 に一致する」といった内部表現が学習者向けラベルに現れる。第2ラウンドで直した未知条件ラベルの整形（INT-20）と同じ整形系の未適用箇所。
- 重大度：P3
- 統合元：R4-N4（findings-round4-solo.md、vba/input の教材で全 Case パスに漏れ）
- 影響する種類・表面：Excel VBA の Select Case を含む全テンプレートのパス条件ラベル。
- 修正方針：ラベル生成で内部表現を学習者向けの文に変換する（未知条件ラベルの整形系に統一）。
- 受け入れ条件：対象テンプレートの全パスで内部表現（false or 等）が出力に現れないこと。他種類のラベルに回帰がないこと。

### RG-28 JavaScript の使用中チップの refs 名前不一致（push／appendChild の消滅）
- 根本原因：trace の refs が受け手つきの名前（`same.push`）で記録され、リファレンス項目名（`push`）と一致しないため、使用中チップの生成から落ちる。ユーザーが処方した「チップ生成で落ちた項目をコンソールに出す」診断でも名前が未収載のため出口がなく、無言で消える。
- 重大度：P3
- 統合元：R5-N8（findings-round5-solo.md、js-array／js-build-summary で実行後にチップが消える）
- 影響する種類・表面：JavaScript のメソッド呼び出し全般の使用中チップ。
- 修正方針：refs の名前の正規化（メソッド名への分離）を trace 生成側かチップ照合側で統一する。
- 受け入れ条件：対象テンプレートで実行後も push／appendChild チップが残ること。同種の受け手つき refs の横断確認で新たな消滅がないこと。

### RG-29 解説のインラインリンクが単語の途中で誤リンクする
- 根本原因：解説文のリンク化（linkedText）が部分文字列一致で項目名を探すため、単語の途中にある部分文字列までリンクになり、学習者が無関係な項目・壊れた見た目に誘導される。
- 重大度：P3
- 統合元：R5-N9（findings-round5-solo.md、`No.95/96` → "o.95" が No 項目、`Int(7.8)` → "nt(7." が Int 項目に一致。4箇所で確認）
- 影響する種類・表面：全88テンプレートの解説文のインラインリンク。
- 修正方針：単語境界を尊重するリンク化に変える。
- 受け入れ条件：全88テンプレートの解説文を機械走査し、単語途中のリンクが0件であること。正しいリンク（項目名の完全一致）に回帰がないこと。

### RG-30 JavaScript の単体レコード表示と JSON.stringify が配列表示 "[]" になる
- 根本原因：単体レコード（オブジェクト）の表示と JSON 化が配列として処理され、`console.log(o)` が "[]"、`JSON.stringify(o)` が "[]" になる。レコードリテラル自体の実行（代入・For の反復）は正しく、表示経路だけが壊れている。
- 重大度：P3
- 統合元：R12-N28（findings-round12-solo.md）
- 影響する種類・表面：JavaScript のレコード値の表示・JSON 化。
- 修正方針：レコードと配列の判別を値モデルで正し、表示と JSON 化を実 JavaScript に合わせる。
- 受け入れ条件：`console.log(o)` と `JSON.stringify(o)` が実 JavaScript と一致し、配列の表示に回帰がないこと。

### RG-31 VBA の `\` と Mod のエラー種別取り違え
- 根本原因：整数除算 `\` は被演算子の丸め後に除数が 0 になるケースを正しく「0 で除算しました」（エラー11）と分類するのに対し、Mod は同じ条件で「オーバーフローしました」と分類する。不整合に加え、同じ入力のパス間でも分類が食い違う。
- 重大度：P3
- 統合元：R12-N24（findings-round12-solo.md、`5 Mod 0.5` 等）
- 影響する種類・表面：Excel VBA の Mod 演算子。
- 修正方針：Mod の丸め後除数が 0 の場合をエラー11に分類し、`\` と同じ経路に統一する。
- 受け入れ条件：再現式が「0 で除算しました」になり、通常の Mod の正挙動に回帰がないこと。

### RG-32 AutoHotkey の制御キーワードの大文字小文字区別
- 根本原因：制御キーワード（if／while／return 等）の照合が大文字小文字に敏感で、公式ドキュメントの大文字始まり表記（If／While／Return／Loop／For）を弾く。一方、関数名・メソッド名は不区別で通り、照合方針が不統一。
- 重大度：**P2**
- 統合元：R12-N25（findings-round12-solo.md、公式ドキュメント表記の貼り付けが「式が必要です」で停止。公式表記のユーザー関数定義は動作することも確認済み）
- 影響する種類・表面：AutoHotkey の制御キーワード全般。
- 修正方針：キーワード照合を大文字小文字不区別に統一する（言語仕様どおり）。
- 受け入れ条件：公式ドキュメント表記の全キーワード（If／Else／While／Loop／For／Return／Break／Continue）が動作し、小文字表記の既存挙動に回帰がないこと。

### RG-33 AutoHotkey の Loop…Until 節の結果の無言消失
- 根本原因：Until 節を持つ Loop の実行結果が、エラーも出力も trace もなく消える（節の未対応処理が実行全体を巻き込む経路。出典ファイルの観測による）。
- 重大度：**P2**
- 統合元：R12-N26（findings-round12-solo.md、公式リファレンス逐語例が無言で結果消失）
- 影響する種類・表面：AutoHotkey の Loop…Until。
- 修正方針：Until 節を実装するか、節を名指して正直に停止する。無言消失の経路をなくす。
- 受け入れ条件：再現コードで、結果が出るか、明示の停止理由が表示されること。

### RG-34 Power Automate の公式ブールリテラル True／False が未定義名で停止
- 根本原因：Power Automate の式評価が共有の JavaScript 方言に依存し、PAD 公式リテラル表にある True／False（大文字）を持たない。原因表示も JavaScript 方言のままで、PAD の言葉になっていない。
- 重大度：P3
- 統合元：R13-N11（findings-round13-solo.md、`%True%`／`%False%` が「未定義の名前」で停止）
- 影響する種類・表面：Power Automate の式・リテラル全般。
- 修正方針：PAD のリテラル（True／False）を型に受理し、原因表示を PAD の言葉に合わせる。
- 受け入れ条件：`%True%`／`%False%` が動作し、小文字 true／false の既存挙動に回帰がないこと。

### RG-35 CR のみ改行の貼り付けで行・原因が壊れる（取込経路と不整合）
- 根本原因：貼り付け（simulate 入口）では改行の正規化が行われず、エンジンが `\r` を行境界として扱わないため、行番号・原因判定が崩れる。ファイル取込経路（decodeFile）は正規化しており、入口で挙動が食い違う。
- 重大度：P3
- 統合元：R6-N10（findings-round6-solo.md、CR のみの Python ソースで2行目以降の明確な誤りまで「1行：インデントが正しくありません」に化ける）
- 影響する種類・表面：全種類の貼り付け入力（行番号・エラー原因の全て）。
- 修正方針：simulate 入口で `\r\n`／`\r` を `\n` に正規化し、取込経路と同一にする。
- 受け入れ条件：CR のみのソースで、LF 版と行番号・原因表示が一致すること。

### RG-36 Python のタブ・空白混在インデントの無言受理
- 根本原因：インデント判定がタブと空白を同一視するため、実 Python が TabError にする混在を無言で受理する（製品宣言書済みの非対応領域。出典ファイルの判断による）。
- 重大度：P3
- 統合元：R6-N11（findings-round6-solo.md）
- 影響する種類・表面：Python のインデント判定。
- 修正方針：同一ブロック内でのタブ・空白の混在を検出し、IndentationError 相当として停止する。
- 受け入れ条件：混在入力でエラーになり、タブのみ／空白のみの入力は正常に動くこと。

### RG-37 UI のアクセシビリティ・意味構造（入れ子ボタン・見出し階層）
- 根本原因：生成部品の意味構造が画面ごとに統一されておらず、対話要素の入れ子と見出しレベルの飛びがある。フォーカス順序の実測自体が未実施（第12ラウンドの積み残し）。
- 重大度：P3
- 統合元：R12-N33（findings-round12-solo.md、問題画面 `<summary>` 内にリセット `<button>` が入れ子）、R12-N34（findings-round12-solo.md、リファレンス項目の h3 が h1 の直下でレベルが飛ぶ）
- 影響する種類・表面：問題画面の要約要素、各種リファレンス表示の見出し階層。
- 修正方針：リセットボタンを summary の外へ移す。リファレンス項目の見出しレベルを画面の階層に合わせる。あわせてフォーカス順序の実測を行う。
- 受け入れ条件：実ブラウザで、入れ子解消・見出し階層・フォーカス順序が確認できること。

### RG-38 R の名前付きベクトル（c() の要素名）の無言消失
- 根本原因：R エンジンの `c()` が名前付き引数（要素名＝値）を受けると、名前だけでなく値ごと捨てて空ベクトルを返す。名前付きベクトルは R の基礎形であり、エラーも警告もなくデータが消える。
- 重大度：**P2**
- 統合元：R14-N1（findings-round14-solo.md、`v <- c(a = 1, b = 2)` の後に `print(v)` が `c()` になり最終状態も `v=c()`、`v["a"]` が `c(NA)` になる）
- 影響する種類・表面：R の `c()` の名前付き要素全般。
- 修正方針：`c()` の名前付き引数を名前つきベクトルとして実装する。実装しない場合は引数の形を名指して停止し、無言で空ベクトルにしない。
- 受け入れ条件：`c(a = 1, b = 2)` が名前つきで保持され、`v["a"]` が 1 を返すこと。名前なし `c(1, 2)` の正挙動に回帰がないこと。

### RG-39 共有スクリプト字句解析が `[[`／`]]` を単一トークンとして扱い、入れ子配列リテラルが隣接位置で壊れる
- 根本原因：共有スクリプト基盤の字句解析が `[[` と `]]` を単一トークンとして扱うため、配列リテラルの最初または最後の要素が配列リテラルだと汎用エラーで停止する。空白を入れた形・中間位置の入れ子・push による構築は動作し、最も普通の綴りでのみ壊れる。二次元配列は教材の基本形である。
- 重大度：**P2**
- 統合元：R14-N2（findings-round14-solo.md、JavaScript：`[1, [2, 3]]` が「] が必要です」、`[[1, 2], [3]]` が「式を解釈できません：[[」）＋ R14B-N1（findings-round14b-saturation.md、JavaScript／AutoHotkey：隣接位置での失敗と、空白形・中間位置・push 構築の成功を切り分け、字句解析の単一トークン化を根本原因として特定）
- **重複裁定：両者は同一欠陥である。** R14-N2 の再現はすべて隣接（冒頭 `[[`／末尾 `]]`）の位置で失敗しており、R14B-N1 の切り分け結果と一致する。本台帳では2報告を統合して **1件** として数える（件数への影響は「件数と取りこぼしチェック」の注記に明記）。
- 影響する種類・表面：JavaScript／AutoHotkey の入れ子配列リテラル（初期化子・代入・引数・式文・書き込み位置）。
- 修正方針：字句解析で `[[`／`]]` を単一トークンにまとめず、配列リテラルの入れ子を処理する。他エンジンの正挙動（二重括弧の添字等）と混同しないこと。
- 受け入れ条件：`[[1, 2], [3, 4]]`、`[1, [2, 3]]`、深さ3の入れ子が JavaScript／AutoHotkey で動作し、`m[0][1]` の参照と書き込みが正しいこと。空白形・中間位置の既存の正挙動に回帰がないこと。

### RG-40 C++ std::string モデルの実装不備（有効な操作を「未定義動作」と誤判定）
- 根本原因：C++ の文字列モデルの評価が、有効範囲の添字参照と直接初期化を、未定義動作／未初期化の読み取りと誤判定して停止する。範囲外添字の UB 判定自体は実物どおりであり、有効な操作だけが虚偽の判定を受ける。
- 重大度：**P2**
- 統合元：R14-N3（findings-round14-solo.md、`std::string s = "hello"; std::cout << s[1];` が「未定義動作：無効または寿命の切れたポインタの参照」、`std::string s("ab");`（直接初期化）が「未定義動作：未初期化の値を読み取っています」で停止する2再現）
- 影響する種類・表面：C++ の std::string の添字参照と初期化。
- 修正方針：文字列モデルの添字の範囲判定と初期化状態の追跡を実 C++ に合わせ、有効な操作を未定義動作と判定しない。
- 受け入れ条件：再現2件が実 C++（g++ 照合）と一致し、範囲外添字が引き続き未定義動作として扱われること。コピー初期化・連結・比較の正挙動に回帰がないこと。

### RG-41 ImageJ のパス条件ラベルが括弧なし組み込み呼び出しに `()` を付加する
- 根本原因：パス条件ラベルの生成が、括弧なしで書かれた組み込み呼び出し（nImages 等）を呼び出し形に正規化して `nImages()` と表示するため、ラベルの引用が学習者のコードと一致しない。真偽の判定自体は全て正しい。
- 重大度：P3
- 統合元：R14-N11（findings-round14-solo.md、テンプレート ij-4 の `if (nImages == 0)` が「条件（nImages() == 0）」と表示される。nResults／nSlices でも同型を確認）
- 影響する種類・表面：ImageJ の括弧なし組み込み呼び出しを含む条件のパス条件ラベル。
- 修正方針：ラベルはコードの表記を忠実に引用し、正規化で `()` を付加しない。
- 受け入れ条件：対象の再現でラベルがコードどおりに表示され、関数形・文字列比較・変数条件の既存の正確な引用に回帰がないこと。

---

## 件数と取りこぼしチェック

- 元項目の総数：**135件**（P2 ×24、P3 ×111）。内訳はラウンド別に、R3＝1（P3×1）、R4＝4（P2×1／P3×3）、R5＝9（P2×2／P3×7）、R6＝12（P2×2／P3×10）、R7＝11（P2×2／P3×9）、R8＝11（P2×1／P3×10）、R9＝10（P2×2／P3×8）、R10＝5（P2×3／P3×2）、R11＝11（P2×2／P3×9）、R12＝34（P2×5／P3×29）、R13＝13（P3×13）、R14系＝14（P2×4／P3×10。下記の重複裁定により、報告15件から1件を統合した実質件数）。
- 統合後の件数：**41件**（RG-01〜RG-41）。
- 取りこぼしチェックの方法：
  1. 各 findings ファイルの結論表の項目IDを全件列挙し、本台帳の「統合元」と1対1で突合する。各IDはちょうど1つの RG に属する（例外は下記の重なり注記のみ）。
  2. ラウンドごとの自己申告累計（R5 終了時26件→R6 37件→R7 48件→R8 58件→R9 63件→R10 68件→R11 79件→R12 108件→R13 121件）と、本台帳のラウンド別内訳の合計121件が一致することを検算する（実際に機械突合済み：台帳から抽出した固有ID 121件が期待集合と完全一致した）。第14ラウンド系は本更新で、R14-N1〜N11 と R14B-N1〜N4 の全15報告を列挙し、下記の重複1件の統合を除く各IDがちょうど1つの RG に属することを1対1で突合した（実質追加14件、累計135件）。
  3. 重大度の内訳（P2 ×24）が、ラウンド別内訳の合計と一致することを検算する。
  4. 第1〜3ラウンド分は、INT-01〜20・R2-N1〜N3・R3-F1〜F12 の消込を findings-round2/3-verification.md で全件確認し、未修正のまま残るのは R3-N1 のみであることを確定してから集計に含めた。
- 重なりの注記（二重の修正指示を避けるため）：
  - R8-N5 と R12-N30 は同一表面（Power Fx の Text 書式引数）の二重計上。RG-15 では1表面として扱う（件数121は各ラウンドの申告累計を保つため、元項目の数としては両方を数える）。
  - R12-N9 は R7-N3・R9-N6 の全位置版であり、3件は同じ根本原因（三項演算子の未対応）として RG-06 に束ねた。
  - R12-N10（switch）と R13-N10 の AutoHotkey 表面は重なるが、R12-N10 は他種類を含むため RG-06、R13-N10 は AHK 宣言構文群として RG-08 に置いた。修正時は switch の扱いを両 RG で矛盾させないこと。
  - RG-06／RG-07／RG-08／RG-09／RG-10 は「未対応構文を正直に宣言する」基盤の共通化でまとめて改善できる同類型であり、RG-04 は表示整形の種類別化として横断的に効く。修正指示（fix-instruction-all-residuals-draft.md）ではこの横断方針も併記した。
  - **重複裁定（第14ラウンド系）：R14-N2 と R14B-N1 は同一欠陥のため RG-39 に統合し、1件として数える。** 第14ラウンド本体の自己申告累計は132件（121＋11）、並行角度Bの自己申告累計は125件（121＋4）で、どちらも他方を含まないため単純合算は136件になるが、重複1件（P2）を解消した後の実質総数は **135件（P2 ×24、P3 ×111）** である。
- 監査履歴の追記（第14ラウンド系、2026-11-15）：
  - 第14ラウンド本体（findings-round14-solo.md）：新規11件（P2×3、P3×8）。角度4（パスごとの最終状態の正直さ、全88テンプレート／94パス）は新規ゼロだった。
  - 追加並行角度B（findings-round14b-saturation.md、飽和ファズ／メタモルフィック／不変条件、エンジン実行3,365件）：新規4件（P2×2、P3×2）。うち1件は本体の R14-N2 と重複（上記裁定）。
  - 追加並行角度C（findings-round14c-ui-pwa.md、実UI・PWA 使い倒し）：**438件の実測で新規欠陥ゼロ**。この実測により、付録の要件 2-5／6-2／11-1／9-1 に Muse 側の証拠が付いた（各要件の行に反映済み）。残件の追加はない。

---

## 付録：37要件 × 充足証拠の対応表

要件番号・要旨は repo/docs/audit/REQUIREMENTS.md（Codex 側の要件対応表、対象リビジョン 0ee8c7a）の番号付けを正本とする。「Muse 側の証拠」は Muse 側監査ファイル（このワークスペース内）への参照。「Codex 側判定」は同対応表の記載。

| 要件 | 要旨 | Muse 側の証拠（ファイル・節） | Codex 側判定 | 備考 |
|---|---|---|---|---|
| 1-1 | 13種類＋練習モード | findings-round2-verification.md §3（Playwright 26/26 実地）、findings-round10-solo.md 角度5（全種類の画面契約） | 適合 | |
| 1-2 | 順序：ImageJ→AWS→PA→AHK→UIV→PApps→Py→R→C→C++→C#→JS→VBA | findings-round10-solo.md 角度5、findings-round12-solo.md 角度4 | 適合 | |
| 2-1 | 分岐パスと最終状態・出力・trace | findings-round4-solo.md 角度1、findings-round6-solo.md 角度4、findings-round11-solo.md 角度2 | 適合 | 表示面の残件は RG-04 等 |
| 2-2 | 実行・クリア・自動実行の UI 配置 | findings-round10-solo.md 角度5（自動実行チェック等の存在を全種類で確認）、findings-round2-verification.md §3 | 適合 | |
| 2-3 | 最大100パスで実質は打ち切り頼み。停止は正確な原因で | findings-round6-solo.md 角度3、findings-round9-solo.md 角度2、findings-round11-solo.md 角度2 | 適合 | 原因表示の虚偽が RG-06〜RG-10 に残件として残るため一部未充足 |
| 2-4 | 繰り返し・比較・関数・組込の冠詞を実際に模倣 | integration-round1-draft.md A-4（CX03/05/06 の実行確認）、findings-round7-solo.md 角度1、findings-round11-solo.md 角度3 | 未確認 | 全面性の証明はなし。関連残件 RG-16、RG-24 |
| 2-5 | 下に長い解説を持つ問題でも説明パネル内スクロールで追随 | findings-round14c-ui-pwa.md「要件2-5」（全13種類×320／375px、26件全 PASS。説明本文だけが内側スクロールし、見出しと実行ボタンは外側で不動であることを実測） | 適合 | 2026-11-15 の追加角度14c で Muse 側の証拠が付いた |
| 3-1 | パスのラベルは人間向け（内部式を出さない） | findings-round9-solo.md 角度3 | 適合 | |
| 3-2 | 分岐未選択では先頭に戻る／追随 | integration-round1-draft.md A-4 の CX15 備考（角度C でジャンプ＋追随の適合を確認） | 適合 | 先頭位置の精度の Muse 側実測は未実施 |
| 4-1 | 全分岐パスを列挙し並べ直す | findings-round5-solo.md 角度1、findings-round9-solo.md 角度3・5、findings-round10-solo.md 角度3 | 未確認 | RG-01 により深い連鎖では一部未充足 |
| 4-2 | パス条件は日本語ラベルを出す | findings-round9-solo.md 角度3 | 適合 | |
| 4-3 | 他の質問と切り離し残り入力を後続で確認 | findings-round9-solo.md 角度3 | 適合 | |
| 4-4 | カバレッジ済み／不足で順序決定 | findings-round9-solo.md 角度3 | 適合 | |
| 4-5 | 問題条件を満たす代表候補を優先 | findings-round9-solo.md 角度3 | 適合 | |
| 4-6 | 次パスは連続3個まで深掘り | findings-round9-solo.md 角度3 | 適合 | |
| 4-7 | パス数上限2,000本・全件が未処理なら理由 | findings-round5-solo.md 角度1、findings-round4-solo.md 角度3、findings-round9-solo.md 角度5 | 適合 | 深さ64起因の欠落は RG-01 |
| 5-1 | チップ：使用中／ひとつ前／小道具／前へ／次へ | findings-round5-solo.md 角度3、findings-round10-solo.md 角度5 | 適合 | |
| 5-2 | パス連動チップの高さ（行数帯） | findings-round5-solo.md 角度3 | 適合 | 関連残件 RG-28 |
| 5-3 | クリックで開き別内容に出会える | findings-round5-solo.md 角度3（実地クリック） | 適合 | |
| 5-4 | 解説：リファレンス集約 | findings-round2-verification.md INT-02、findings-round3-verification.md §4・§5、findings-round10-solo.md 角度5 | 適合 | |
| 6-1 | レイアウトが一画面で安定（狭い側） | findings-round9-solo.md 角度4、findings-round10-solo.md 角度5 | 適合 | |
| 6-2 | 狭い画面でも本文や操作エリアを押し潰さない | findings-round14c-ui-pwa.md「要件6-2」（39件全 PASS。使用中チップ領域が上限＋内部スクロールで頭打ちになり、リファレンス・用語集の押し潰しとパネルの重なりがゼロであることを幾何で確認） | 適合 | 2026-11-15 の追加角度14c で Muse 側の証拠が付いた |
| 6-3 | 画面のタイトルへ素早く戻れる導線 | findings-round2-verification.md INT-19、findings-round10-solo.md 角度4・5 | 適合 | |
| 7-1 | 解説の主用途はチップ。文中の単語→チップ | findings-round5-solo.md 角度3、findings-round7-solo.md 角度4 | 適合 | 関連残件 RG-29（単語途中の誤リンク） |
| 7-2 | 固定ガイドはテンプレート切替に依らない共通リファレンス | findings-round10-solo.md 角度4 | 適合 | |
| 7-3 | データの実物性（4テーマ×10項目ほか） | integration-round1-draft.md の (c)（88件の内訳）、findings-round12-solo.md 角度1、repo/docs/audit/REQUIREMENTS.md の種類別表 | 適合 | |
| 7-4 | 固定ページは全体俯瞰に寄せる | findings-round2-verification.md INT-19、findings-round10-solo.md 角度4 | 適合 | |
| 8-1 | 画面表示・ファイル取込でテキスト投入 | findings-round2-verification.md §3 | 適合 | 取込時の確認ダイアログは観察 R2-O1 |
| 9-1 | 縦長にせず主役を画面の一番上に。恒常文は下 | findings-round2-verification.md §3（375px）、findings-round4-solo.md 角度4（320／768px）、findings-round14c-ui-pwa.md「要件9-1」（26件全 PASS。全13種類×320／375px で、ワークスペース下端 ≦ 恒常文ブロック上端 ＜ フッター上端の順序と、初回表示に免責が入らないことを実測） | 適合 | 2026-11-15 の追加角度14c で「恒常的な文章は下」の配置の直接証拠が付いた |
| 10-1 | 監査は多角的（相互非開示→統合でもう一巡） | findings-round1-local.md／blind-fuzz／angleA／angleEF-ext、integration-round1-draft.md、findings-round2/3-verification.md、findings-round4〜14-solo.md、findings-round14b-saturation.md、findings-round14c-ui-pwa.md（実施の証拠） | 未確認 | 収束は未達（Muse 側は継続中）。完了の証拠はなし |
| 10-2 | 成果物は実際に使えるか | findings-round3-verification.md §5（公開サイト最終確認）、findings-round2-verification.md §3 | 未確認 | Muse 側の実使用確認は実施済み。Codex 側判定は他主体（Codex）のため未確認 |
| 10-3 | 結論が途中で途切れないように進める | 監査プロンプト（~/workspace/audit-prompts/programming-practice-audit-prompt-20261114.md）＋ findings-round1〜14系の各ファイル（実施の証拠） | 未確認 | 継続中 |
| 11-1 | 結果ウィンドウの拡大と連携（任意）の取消 | findings-round14c-ui-pwa.md「要件11-1」（26件全 PASS。全13種類×320／375px で、拡大／最大化／フルスクリーンを示す操作要素がゼロであり、結果パネルが元の大きさのままであることを積極的に確認） | 適合 | 2026-11-15 の追加角度14c で Muse 側の証拠が付いた |
| 11-2 | 5-4 の再掲 | findings-round2-verification.md INT-02、findings-round3-verification.md §4・§5、findings-round10-solo.md 角度5 | 適合 | 5-4 と同じ |
| 11-3 | 6-3 の再掲 | findings-round2-verification.md INT-19、findings-round10-solo.md 角度4・5 | 適合 | 6-3 と同じ |
| 11-4 | 4-7 の再掲 | findings-round5-solo.md 角度1、findings-round4-solo.md 角度3、findings-round9-solo.md 角度5 | 適合 | 4-7 と同じ |
| 12-1 | 用語集は学習者が実際に調べる項目 | findings-round8-solo.md 角度3（用語集65項目の監査）、findings-round9-solo.md 角度4（参考項目441項目）、findings-round13-solo.md 角度1（カタログ完全性） | 適合 | |

- 証拠なし要件（Muse 側 findings）：第14ラウンド追加角度14c（findings-round14c-ui-pwa.md、実UI・PWA 438件・新規欠陥ゼロ）により、**2-5／6-2／11-1／9-1 の4件すべてに Muse 側の実測証拠が付いた**。残る証拠上の課題は、収束自体（10-1〜10-3）が未達であることのみ。
