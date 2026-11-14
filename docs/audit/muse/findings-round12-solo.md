# プログラミング練習 監査 第12ラウンド（Muse 側単独）

- 対象: repo 0ee8c7a 固定（`~/workspace/programming-practice-audit/repo/`、公開サイトと同一リビジョン）
- 実施日: 2026-11-15
- 位置づけ: Codex 側は第3ラウンドで終了済み。本ラウンドは Muse 側単独監査の継続。コード修正・push・Codex への連絡は行っていない（欠陥は残件として記録のみ）。
- 実行基盤: `work/r10-lib.mjs` の `runFull`（全エンジンを実コードで駆動）。比較対象として Node 実物（JavaScript 差分 3,124 件）、CPython 実物（Python 差分 6,018 件）、実 R の仕様、AutoHotkey v2 公式ドキュメント、ImageJ 公式マクロ仕様を一次情報として照合した。

## 結論

**このラウンドは新規欠陥ゼロではない（未収束）。新規欠陥 34 件（P2×5、P3×29）。累計残件は 108 件（P2×20、P3×88）になった。**

今回の角度は (1) 宣言と振る舞いのマトリクス、(2) パーサ受理構文の全数ファズ、(3) 使用関数の解説文の正確性、(4) アクセシビリティと意味構造。過去ラウンドが「代表入力での動作」を見てきたのに対し、本ラウンドは「宣言の外側・境界・大文字小文字・宣言外引数・書き込み系関数の持続性」を体系的に潰したため、宣言済み範囲の内側にある無言の誤動作（ImageJ changeValues の完全な無言 no-op、AHK のキーワード大文字小文字、C# の暗黙縮小変換など）が新たに表面化した。

---

## 角度1: 宣言と振る舞いのマトリクス

### 実施内容

- DEVELOPMENT.md の種類別対応範囲表と各種類のリファレンス supported フラグ（全 441 件を実測: vba 66 / imagej 141 / cloudformation 49 / powerautomate 14 / autohotkey 17 / uivision 17 / powerapps 23 / python 42 / r 23 / c 8 / cpp 9 / csharp 10 / javascript 22）を正本とし、「対応」構文・関数を代表入力で実行、「未対応・未宣言」の頻出構文が名前を挙げて正直に止まるかを確認した。
- ImageJ は対応関数 107 件から測定・選択・画素・結果表・ファイル系の代表 40 件超を実データモデルで実行。CloudFormation は組み込み関数（Fn::If / Ref / Fn::Join / Fn::Sub）を含むテンプレートと、ハンドラ応答の異常系（status 欠落・requestId 不一致・failure）を投入。UI.Vision / Power Automate は宣言済みコマンド・アクションの境界入力（存在しないロケーター、回数 0・負数、空リスト、非リスト、欠落ファイル）と未宣言の頻出コマンド（storeEval / Wait / Comment 等）を投入した。

### 結果（健全だった部分）

- Power Apps の未掲載関数（Mod / Round / Int / Left / Mid / Len / Coalesce / Concatenate / Not / Average / First）、AutoHotkey の未掲載組み込み関数（Abs / SubStr / StrLen / Floor / Mod / Round / Format）、VBA の未対応関数（IIf / Choose / Switch / Str / Sgn / Sqr / Split / Join / InStrRev / StrReverse / Space / Static / With / GoTo 等）、R の未掲載関数（ifelse / which / sort / rev / unique / head / round / sqrt / abs / log / sprintf / paste0 / as.* / factor）は、いずれも名前を挙げて正直に停止した。
- UI.Vision は全プローブ健全（未宣言コマンドは名前を挙げて停止、storeText / storeValue のロケーター不一致は宣言どおり #LNF、times 0 回・負数の扱いも妥当）。
- Power Automate は概ね健全（step 0 は明示エラー、非リストの For each は正直な未対応停止、欠落ファイルは名前を挙げて停止、未知アクションは名前を挙げて停止）。
- CloudFormation の組み込み関数は未評価のまま素通しされ（マクロ模擬という宣言範囲と整合）、requestId 不一致・failure 応答は正しく検出された。status の大文字小文字不区別（"SUCCESS" / "Success" を成功として扱う）も解説どおりだった。
- ImageJ の測定系（getStatistics / getHistogram / getSelectionBounds の無選択時＝画像全体、roiManager のコマンド名大文字小文字不区別、setThreshold の往復、getDimensions / getVoxelSize の未校正値）は解説どおりだった。

### 新規欠陥

**R12-N1 (P3) C#: foreach が宣言のどちらのリストにも無く、汎用の「) が必要です」で停止する**
- 再現: `int[] a = {1, 2, 3}; int s = 0; foreach (int v in a) { s += v; } Console.WriteLine(s);`（var 形式・波括弧なし・string 配列でも同一）。
- DEVELOPMENT.md の C# 対応範囲（int演算、unchecked／checked、配列例外、単純フィールドのクラス・参照共有、Console）にも未対応欄にも foreach の記載が無く、c-family パーサに foreach の処理自体が存在しない。foreach は C# 教材の配列反復の常套形であり、R11-N1（文字列補間）と同型の「未宣言＋汎用停止」。

**R12-N2 (P3) C#: checked / unchecked の式形式が「関数」扱いの虚偽原因で停止する**
- 再現: `int x = 2147483647; int r = checked(x + 1);` → 「この関数は説明に対応していません：checked」。unchecked(x + 1) も同一。
- DEVELOPMENT.md は C# の対応範囲に「unchecked／checked」を明記し、ブロック形式 `checked { … }` は正しく OverflowException になる。式形式だけが、関数呼び出しであるかのような原因表示で止まる。

**R12-N3 (P3) AutoHotkey: Try / Catch が「レコードのフィールド名が必要です」という無関係な原因で停止する**
- 再現: ホットキーブロック内で `Try { Throw Error("x") } Catch { MsgBox "caught" }` → 「エラー：レコードのフィールド名が必要です」。
- Try/Catch は AHK 教材の頻出構文で、宣言のどちらのリストにも無い。レコード記法とは無関係であり、原因表示が虚偽。

**R12-N4 (P3) VBA: ReDim / ReDim Preserve が「式が必要です」という汎用原因で停止する**
- 再現: `Dim a() As Long` / `ReDim a(2)` → 「式が必要です」。`ReDim Preserve a(2)` も同一。
- DEVELOPMENT.md は VBA の未対応欄に「動的配列」を明記している。宣言済み未対応であるにもかかわらず、ReDim を名指さず汎用文法エラーで止まる。

**R12-N5 (P3) CloudFormation: YAML 短縮タグがライブラリの生エラー（英語）で停止する**
- 再現: YAML テンプレートで `BucketName: !If [IsProd, prod, dev]` → `unknown tag !<!If> (5:42)` 以下、YAML パーサの英語スタック表示がそのまま出る。
- DEVELOPMENT.md は「YAML短縮タグ」を未対応と明記しているが、停止表示はアプリ自身の未対応宣言ではなく第三者ライブラリの生出力。なお不正 JSON は日本語のアプリ側メッセージで正しく止まる。

**R12-N6 (P2) JavaScript: 宣言の初期化子に置いたレコードリテラルが「} が必要です」という虚偽原因で停止する**
- 再現: `let o = {a: 1};`（const / var でも同一）→ 「} が必要です」。
- 一方で `let o = {};`、メンバー代入 `o.a = 1`、配列内 `[{v: 1}]`、引数位置、if 条件内ではレコードは正常に動く。`{a: 1}` 形式のオブジェクトリテラルは JS 教材の最も基本的な記法であり、宣言のどちらのリストにも無いまま、位置依存で壊れている。JS テンプレート 6 件は `= {` を 1 件も使っていないため顕在化していなかった。

**R12-N7 (P2) ImageJ: changeValues が無言で完全に何もしない（宣言済み対応関数）**
- 再現: `setPixel(2, 2, 50); changeValues(0, 255, 9); print(getPixel(2, 2));` → 50 のまま（全値域を指定しても不変）。既定画像の画素（100）に対する `changeValues(90, 110, 7)` も不変。
- リファレンスは changeValues を対応（supported）とし「画素値が v1 以上 v2 以下の画素を v3 に置き換える」と説明するが、実際には画素が一切書き換わらず、エラーも未確定表示も出ない。前処理マクロを書いた学習者は「置換した」ものとして結果を誤認する。なお setPixel の書き込み自体は正常に持続する。

**R12-N8 (P3) ImageJ: setMinAndMax が無言で反映されず、getMinAndMax が既定範囲を返し続ける**
- 再現: `setMinAndMax(10, 200); getMinAndMax(lo, hi); print(lo, hi);` → 「0 255」（既定値）。
- 対照的に setThreshold / getThreshold の往復は正常（10 100）。表示範囲の設定・取得という対応関数の組が、設定側だけ無言で欠落している。

---

## 角度2: パーサ受理構文の全数ファズ

### 実施内容

- 各エンジンのパーサ・優先順位表をコードから列挙した（VBA の演算子表、script コアの prec / jsPrec、文の種類 block / declare / assign / expression / if / for / while / each / repeat / break / continue / return / action、C系パーサ）。
- 列挙した全演算子×境界被演算子（空文字列、負数、文字列、未設定値、NA / NaN、真偽値、レコード、配列）のマトリクスを実行し、実物との差分を取った: JavaScript は Node 実物と 3,124 件、Python は CPython 実物と 6,018 件を自動比較。R は実 R の仕様（公式 Arithmetic ドキュメント含む）と照合。文レベルの列挙（ループ外 break / continue、最上位 return、do-while、switch、foreach、ラベル付き文等）も全エンジンで実施した。

### 結果（健全だった部分）

- **Python は新規欠陥ゼロ**: 内包表記、walrus、デコレータ、クラス、キーワード引数、スター展開、assert、例外処理まで宣言どおりに動き、未対応（lambda / match 文 / with / ジェネレータ / str.format）は名前を挙げて正直に止まる。差分比較 6,018 件で残った差異は宣言済みの `%` 書式の正直な停止のみ。
- JavaScript の `**` は「このJavaScript演算子は未対応です」と正直に止まる。C/C++ の char 算術・比較連鎖・sizeof、C# の定数式オーバーフロー（実 C# の定数畳み込みどおり）、R の NA 伝播の大半は実物と一致した。
- VBA は概ね忠実（Not のビット反転、True=−1、Empty の意味論、除算・Mod のエラー 11 系メッセージ）。AHK の組み込み関数呼び出しは大文字小文字を区別しない（WinExist / winexist とも動作）。

### 新規欠陥

**R12-N9 (P2) 三項演算子 ?: が C / C++ / C# / JavaScript の全位置で汎用・虚偽の原因で停止し、宣言にも無い**
- 再現例: C `int r = (x > 0) ? 1 : 2;`、C# `int r = x > 0 ? 1 : 2;`、JS `let r = true ? 1 : 2;`。
- 停止表示は位置依存で「式を解釈できません：?」「) が必要です」「宣言の区切りが必要です」等に散らばり、?: を名指す正直な未対応宣言はどこにも無い。両パーサ（c-family / script）に三項演算子の処理自体が存在しない。R7-N3 は引数位置の表面のみだったが、本ラウンドで全位置・4 言語にわたることが確定した。なお AHK の三項演算子は「未対応：?」と演算子を名指して止まるため本件に含めない。

**R12-N10 (P3) switch 文が JavaScript / C / C++ / C# / AutoHotkey で本体の "{" を名指して停止する**
- 再現: 各言語の標準的な switch 文 → 「未対応：この構文は説明に対応していません：{」。
- R10-N5 / R11-N5（本体トークン名指し系列）と同根の新表面。switch はどの言語でも宣言のどちらのリストにも無い。C系の do-while が同じく "{" 名指しで止まることも同根表面として併記する（JS の do-while は R10-N5 で既報）。

**R12-N11 (P3) C系: 前置 ++x / --x が汎用の「式を解釈できません：++」で停止する**
- 再現: C `int y = ++x;`。後置 x++ と式中の `x++ + 1` は正常。前置インクリメントは C 教材の基本形であり、宣言のどちらのリストにも無い。

**R12-N12 (P3) C系: 複合代入 %= が「式を解釈できません：=」で停止する**
- 再現: `x %= 3;`。+= / -= / *= / /= は正常。<<= / >>= は `<<` を名指す正直な未対応停止であり、%= だけが不整合に汎用文言で止まる。

**R12-N13 (P3) C系: 二項シフト << / >> が汎用の「式を解釈できません：<<」で停止する**
- 再現: `int r = 1 << 3;`。複合代入形 <<= では `<<` を名指して正直に止まるのと不整合。

**R12-N14 (P3) C#: double から int への暗黙の縮小変換を無言で切り捨てて受理する**
- 再現: `int r = 7.9;` → 7。変数形 `double d = 7.9; int r = d;` も 7。
- 実 C# ではコンパイルエラーになる暗黙の縮小変換を、警告なく切り捨てて実行する（C では合法で正しいため、言語別の型検査が効いていない）。学習者は C# の型安全性について誤った理解をする。

**R12-N15 (P3) C#: キャスト (int)d が「未定義の名前：int」で停止する**
- 再現: `double d = 7.9; int r = (int)d;` → 「未定義の名前：int」。
- 型名を変数名と誤認する虚偽原因。R11-N3 と同根の別表面。

**R12-N16 (P3) C#: 文字列の .Length が「フィールドがありません：Length」で停止する一方、配列の .Length は正常**
- 再現: `string s = "abc"; int r = s.Length;` → エラー。`int[] a = {1,2,3}; a.Length` → 3 で正常。
- 文字列の長さ取得は C# 教材の頻出形。宣言のどちらのリストにも無い。

**R12-N17 (P3) JavaScript: ?? （nullish coalescing）が内部文言の理由で停止する**
- 再現: `let r = a ?? 5;`（a が null / undefined / 値ありのいずれでも）→ 「未対応：この構文は説明に対応していません：宣言の区切りが必要です」。
- 未対応と銘打ちながら理由が ?? を名指さず、パーサ内部の期待文言になっている（対照: `**` は演算子を名指して正直に止まる）。R11-N8 のリスト（?. / for-of / スプレッド / 分割代入 / new Date）に ?? は含まれていなかった。

**R12-N18 (P3) JavaScript: 未対応の静的メンバーが「未定義の名前：Math / JSON / Number / Object / Array / String」という虚偽原因で停止する**
- 再現: `Math.max(1, 2)` → 「未定義の名前：Math」。`JSON.parse("{}")`、`Number.isInteger(1)`、`Object.keys(o)`、`Array.isArray(a)`、`String.fromCharCode(65)`、`Math.PI` も同型。
- 対象オブジェクト自体は存在し一部対応済み（Math.abs / floor / round、JSON.stringify、Number / String / Boolean 変換は正常）であるにもかかわらず、オブジェクト自体が未定義であるかのように表示される。

**R12-N19 (P3) R: 算術の近道（NA 伝播と ^ の恒等処理）が文字列の型検査より先に効き、エラーになるべき式が NA / 1 を無言で返す**
- 再現: `"a" ^ 0` → c(1)（実 R はエラー）、`"a" ^ NA` → NA、`"a" + NA` / `NA + "a"` / `"2" + NA` / `"a" * NA` / `"" + NA` → NA（実 R は全て "non-numeric argument to binary operator" エラー）。
- 一次情報: R 公式 Arithmetic ドキュメントの「1 ^ y and y ^ 0 are 1, always」は numeric / complex ベクトルに対する規定であり、文字列には適用されない。なお `(-1) ^ NA` の括弧なし解釈など、実 R と一致する部分は欠陥に含めていない。

**R12-N20 (P3) R: %in% が文字被演算子では「数値の型が一致しません」という誤解を招く原因で停止する**
- 再現: `"a" %in% c("a", "b")` → 「数値の型が一致しません」。数値被演算子では「未対応：…%in%」と正直に宣言されるため、被演算子の型によって正直さが変わる。

**R12-N21 (P3) R: seq の宣言外引数 length.out / along.with が無言で無視され、端点だけの誤った列を返す**
- 再現: `seq(0, 1, length.out = 5)` → c(0, 1)（実 R: c(0, 0.25, 0.5, 0.75, 1)）。`seq(1, 2, along.with = c(9, 8, 7))` も c(1, 2)。
- アプリの宣言する書式は seq(from, to, by) で length.out は範囲外だが、引数自体は受理されて無言で捨てられるため、学習者は要素数の指定が効いたと誤認する。by 指定は正常。

**R12-N22 (P3) R: rep の宣言外引数の扱いが一貫しない（単独では虚偽エラー、併用では無言無視で誤値）**
- 再現: `rep(c(1, 2), each = 2)` → 「invalid times」（実 R: c(1, 1, 2, 2)）。`rep(c(1, 2), each = 2, times = 2)` → c(1, 2, 1, 2)（each が無言で無視された誤値。実 R は 8 要素）。`rep(1, length.out = 3)` と `rep(c(1, 2), times = c(2, 1))` も「invalid times」。
- アプリの宣言書式は rep(x, times) で each / length.out / ベクトル times は範囲外だが、エラーになるか無言で誤値を返すかが引数の組み合わせで変わる。

**R12-N23 (P3) R: 関数定義が未対応と宣言されず、引数名の NameError という虚偽原因で停止する**
- 再現: `f <- function(x) x + 1`（定義のみでも）→ 「NameError：未定義の名前：x」。波括弧形式でも同一。
- DEVELOPMENT.md は R の未対応欄に「ユーザー関数」を明記しているが、エンジンは定義を未対応と宣言せず、本体を引数未束縛のまま評価したかのような原因を表示する。

**R12-N24 (P3) VBA: Mod で小数の除数が銀行丸めで 0 になる場合に「オーバーフローしました」と返し、エラー種別を取り違える**
- 再現: `5 Mod 0.5`、`10 Mod 0.4`、`0 Mod 0.5` → 「オーバーフローしました」。実 VBA は被演算子を丸めた上でエラー 11（0 除算）。
- 同じエンジンの `\` は正しく 0 除算を返す（`10 \ 0.4` → 0 で除算）。他の小数 Mod（`5 Mod 1.5` → 1 等）は正常。

**R12-N25 (P2) AutoHotkey: 制御キーワードが大文字小文字に敏感で、公式ドキュメント表記の大文字始まりで汎用・虚偽の原因で停止する**
- 再現: ホットキーブロック内で `If x = 1 { … }` → 「未対応：{」または「このAutoHotkey関数は未対応です：If」。`While` → 同様。`Else` → 「レコードのフィールド名が必要です」。`Return` → 「未定義の名前：Return」。ループ内 `Break` → 「未定義の名前：Break」。逆に `loop`（小文字）は「未対応：{」で止まり、`Loop`（大文字始まり）だけが動く。正常に動くのは `if / while / else / return / break / continue`（全て小文字）と `Loop`（大文字始まり）の組み合わせのみ。
- 実 AHK v2 はキーワードの大文字小文字を区別せず、公式ドキュメントの例は `If` / `While` / `Loop` / `Return` の大文字始まりで書かれる。DEVELOPMENT.md は AHK の対応範囲に「If / Loop / While」を明記しているにもかかわらず、標準表記を写した学習者が軒並み不可解な原因で止まる。組み込み関数名（WinExist 等）は大文字小文字不区別であり、キーワードだけが不統一に敏感。

**R12-N26 (P2) AutoHotkey: Loop … Until 節を書くと、エラーも出力も無く実行結果全体が無言で消える**
- 再現: `i := 0` / `Loop { i++ } Until i >= 3` / `MsgBox i`（Until / until のどちらでも、括弧付き条件でも同一）→ パスは 1 件あるが、出力が空で、後続の MsgBox も表示されず、エラーも出ない。
- Until は実 AHK の Loop の標準節。宣言のどちらのリストにも無いが、正直な停止ではなく結果の無言消失になるため、学習者には「実行したのに何も起きない」状態だけが残る。

**R12-N27 (P3) Power Apps: Set で 1/0 を格納すると文字列 "Infinity" / "NaN" が値として保存される（R7-N9 と同根の別表面）**
- 再現: `Set(r, 1 / 0)` → r に文字列 "Infinity"。`Set(r, 0 / 0)` → "NaN"。`Set(r, -1 / 0)` → "-Infinity"。
- R7-N9（Notify の "Infinity" 表示と最終状態 null の矛盾）と同じゼロ除算の根が、変数への格納という別表面に現れたもの。

---

## 角度3: 使用関数の解説文の正確性

### 実施内容

- 全 13 種類のリファレンス description / caution から検証可能な主張（戻り値、境界での挙動、型変換、引数制限）を抽出し、第 8 ラウンドで検証済みの関数を避けて新しいサンプルで照合した。対象は JS（Math.round の同点処理、parseInt の部分変換、push / pop の戻り値、変換関数群、JSON.stringify）、C系（printf の書式・型不一致時の停止、幅・精度指定、C# の配列範囲外例外名、Console.WriteLine の引数制限）、R（sd の要素 1 個＝NA、data.frame の列リサイクル、c の型階層、if の長さ 2 以上条件、as.numeric の変換不能＝NA）、VBA（Trim の全角スペース・タブ、Mid / Left のエラー 5、InStr / Replace の引数制限、Val の 16 進停止、Round の偶数丸め、Len / UCase の Null 伝播、Do 後判定の 1 回実行、Dim の混在宣言）、Power Apps（Text / Value / IsBlank / Sequence / Collect / If・Switch の遅延評価 / LookUp の最初一致）、Python（min / max の default、dict.get のキーワード引数、split の空白処理、map / filter、isinstance(True, int)）、ImageJ（getSelectionBounds の無選択時、selectionType のコード表、getInfo の未知キー、roiManager、changeValues / setMinAndMax は角度 1 と重なるためそちらに記載）、UI.Vision（storeText の入力要素＝空文字列、type の置き換え）、CloudFormation（status の大文字小文字不区別）、AutoHotkey（WinExist の部分一致、SetTitleMatchMode の 1 / 2 / 3、WinActivate の TargetError）。

### 結果（健全だった部分）

- 上記の大半は解説どおりだった。特に VBA の注意書き（Trim、偶数丸め、Null 伝播、引数制限）と R の注意書き（sd、リサイクル、型階層）、Power Apps の遅延評価と LookUp の最初一致、AutoHotkey のタイトル照合モードは、境界サンプルでも主張と実挙動が一致した。
- Python の dict.get の注意書き自体は CPython 実物とも一致していた（下記 N29 はエンジン側の不整合）。

### 新規欠陥

**R12-N28 (P3) JavaScript: レコード単体の表示と JSON.stringify が "[]" になり、実内容と食い違う**
- 再現: `let o = {}; o.a = 1; console.log(o);` → `[]`。`console.log(JSON.stringify(o));` → `[]`（実 JS は `{"a":1}`）。
- メンバー読み取り `o.a` は 5 を返すなど値自体は保持されており、配列内レコードの stringify（`[{"v":1}]`）は正常。単体レコードの全体表示だけが空配列として化ける。リファレンスの JSON.stringify の説明「JSON文字列へ変換します」とも食い違う。

**R12-N29 (P3) Python: dict.get のキーワード引数が、解説（TypeError）と異なり無言で無視される**
- 再現: `d = {"a": 1}` / `d.get("b", default=0)` → None を返す（キーワード自体が無視され、既定値 0 も使われない）。
- リファレンスの注意書きは「引数は位置専用で、d.get("b", default=0) のようなキーワード指定は TypeError」と明記し、CPython 実物も TypeError を返すことを本ラウンドで実測確認した。エンジンだけが無言で受理・無視する。

**R12-N30 (P3) Power Apps: Text の書式引数が無言で無視され、書式なしの文字列が返る**
- 再現: `Set(r, Text(123.456, "0.00"))` → "123.456"（実 Power Fx は "123.46"）。`Text(5, "000")`、`Text(1234567, "#,##0")`、`Text(0.5, "0%")` でも書式は反映されない。
- アプリの宣言書式は Text(Value) の 1 引数だが、第 2 引数はエラーにもならず無言で捨てられる。書式指定は Power Fx 教材の常套形であり、学習者は書式が効いたと誤認する（R12-N21 の seq と同型の「宣言外引数の無言無視」）。

**R12-N31 (P3) ImageJ: selectionType が直線・折れ線の選択では「実行時に決まる値」になり、解説のコード表と食い違う**
- 再現: `makeLine(0, 0, 10, 10); print(selectionType());` → （実行時に決まる値)。`makeSelection("polyline", xs, ys)` でも同一。
- リファレンスの selectionType は「直線=5、折れ線=6」を含むコード表を明示し、makeRectangle → 0、makeOval → 1、makePolygon → 2 は実際にも返る。線系の選択だけ作成時に種別が記録されない。

**R12-N32 (P3) CloudFormation: ハンドラ応答に status が無いと「マクロが失敗しました：undefined」と表示する（R11-N4 と同根の別表面）**
- 再現: ハンドラが `{"requestId": …, "fragment": …}`（status 欠落）を返す → 「マクロが失敗しました：undefined」。
- 失敗理由の位置に JS の undefined が文字列化されて出る。R11-N4（Fn::Transform 配列形でマクロ名が "undefined"）と同じく、未設定値をメッセージへ混入させる根の別表面。

---

## 角度4: アクセシビリティと意味構造

### 実施内容と制約

- 本ラウンドの実行セルでは Chromium の起動が OS のメモリマッピング制限（mmap: Operation not permitted）で全ビルド（1248 / 1194 / headless shell）とも不可能だったため、Playwright による実操作点検は実施できなかった。代わりに index.html 全文と、画面を生成する JS（app.js / core/action-editor.js）のデータレベル点検で代替した。**Tab キーによる実際のフォーカス移動順序の実測は未実施**であり、その点は本ラウンドの未検証範囲として明記する。
- 点検項目: html の lang、見出し階層、nav の aria-current 管理、静的フォーム要素のラベル関連付け、JS 生成要素（チップ、リファレンス項目、トレース、出力リンク、テンプレートカード、シートセル、アクション編集 UI）の要素種別と名前、aria-live、:focus-visible スタイル、tabindex の使用、details / summary の構造。

### 結果（健全だった部分）

- `lang="ja"`、title、nav の `aria-label="メインメニュー"` と表示切替時の aria-current 追従（showView）あり。
- 静的要素は全てラベル付き（macroType は label for、テンプレート選択・並び順・検索・自動実行は label 包み込み、パス番号は aria-label、エディタの aria-label は種類切替時に「{種類名} コード / フロー」へ更新される）。
- JS 生成の操作要素は本物の `<button>` でテキスト名を持つ（使用中チップ、リファレンス一覧、トレース行、出力リンクには行移動先を含む aria-label）。テンプレートカードは article + h2 + ボタンの構造。シートのセル入力には「セル A1」形式の aria-label。アクション編集 UI の select / input にも aria-label がある。
- 結果ステータスは role="status" aria-live="polite"。:focus-visible のアウトライン（3px）が button / a / input / textarea / select / summary に定義されている。tabindex の乱用は無し。用語集は dl / dt / dd。非表示の画面は hidden 属性で支援技術からも隠れる。

### 新規欠陥

**R12-N33 (P3) 練習画面: <summary> の内側に <button id="resetModel"> が入れ子になっている**
- 場所: index.html の details#modelPanel。summary（それ自体が開閉操作を持つ対話要素）の中に h2 と「リセット」ボタンが入っている。
- 対話要素の入れ子は HTML 仕様上も不適合で、スクリーンリーダーでは開閉コントロールの中のボタンとして読み上げが混乱し、キーボード操作でも Enter / Space の意味が競合する。ボタンは summary の外に出すべき構造。

**R12-N34 (P3) リファレンス画面: 見出し階層が h1 の次に h3 へ飛ぶ**
- 場所: リファレンス画面の各項目カード（refArticle が項目名を h3 で生成）。画面の h1「関数・アクションのリファレンス」の下に h2 を経ず h3 が並ぶ。
- 練習画面側では h2 パネルの下の h3 として整合しているため、生成部品の見出しレベルが画面ごとに使い分けられていないことが原因。見出しジャンプによる文書構造の把握を妨げる。

### 観察（欠陥として数えない）

- 画面切替時にフォーカスは移動しない。nav ボタン経由ではフォーカスが nav に残るため実害は小さいが、テンプレートカードの「このテンプレートで練習する」を押すと、そのボタン自体が非表示になりフォーカスが body へ落ちる。実ブラウザでの確認は次回以降の実操作ラウンドに持ち越す。

---

## 欠陥として数えなかった観察事項

- AHK: `"" == 0` / `"" == false` が true になる点は、公式ドキュメントでは確定できず未確定として数えない。文字列同士の関係演算子が TypeError になるのは実 AHK v2 の正しい挙動（公式ドキュメントで確認）。
- AHK: bare な `Rnd` / `Timer` が Empty になるのは暗黙変数の意味論と一致する範囲（括弧付き `Rnd()` は名前を挙げて正直に停止）。VBA の bare `Time` の Empty 表示は R11-N9 と同根。
- VBA: `ReDim` 以外の汎用気味の停止（Const 宣言、行継続 `_`）は対象を名指しているため正直な停止の範囲とした。`2147483647 + 1` 等のオーバーフローはアプリのリファレンスが明示するモデルであり実 VBA も文脈依存のため数えない。
- R: `c() + 1` の表示は R8-N8 と同根。未知関数へ未束縛の引数を渡した際の引数側 NameError は実 R の評価順序とも解釈できるため数えない。PA の If 条件に文字列変数を単体で置いた場合の真偽強制も、宣言上の簡略化の可能性を否定できず未裁定。
- ImageJ: newImage の画素や run("Invert") 等の全体効果が「実行時に決まる値」になるのは、実画素結果を捏造しないという DEVELOPMENT の方針と一貫するため数えない（N7 / N8 は旧来の具体値がそのまま残る点が異なる）。getInfo の未知キーが未確定値になる点も、解説（空文字列）との差はあるが保守側の扱いのため観察に留める。makeLine の線幅引数・getPixel の範囲外＝0 も実仕様の範囲。
- C: printf のエラー文に接頭辞が二重に出る箇所（「未定義動作：未定義動作：…」「未対応：未対応：…」）は表示上の粗さとして観察に留める。C のカンマ演算子は R11-N11 と同根。
- CFN: Fn::If / Ref 等が未評価で素通しされるのはマクロ模擬の宣言範囲と整合。PA の `%'5' + 1%` → "51" の連結も PAD の意味論の範囲。
- ハーネス上の注意（アプリの欠陥ではない）: AHK のトップレベル（ホットキー無し）コードは、モデル event が "^!n" 固定の runFull では「モデルのeventに対応するホットキー／ホットストリングがありません」になる。テンプレート ahk-loop 等も同じ理由でハーネス上は止まるが、これはモデル設定側の問題であり欠陥として数えていない（実アプリではテンプレート選択時にモデルが切り替わる）。

## 累計

- 第 11 ラウンド終了時点: 74 件（P2×15、P3×59）
- 第 12 ラウンド新規: **34 件（P2×5、P3×29）** — R12-N1〜N34
- **累計: 108 件（P2×20、P3×88）。収束条件（新規欠陥ゼロのラウンド）には未到達。**
