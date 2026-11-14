# 第13ラウンド単独監査（Muse 側）— カタログ完全性／大文字小文字規則／位置マトリクス

- 実施日：2026-11-15
- 対象：`~/workspace/programming-practice-audit/repo/`（0ee8c7a 固定）
- 前提：Codex 側は第3ラウンドで終了済み。本ラウンドの発見は全て「任意の積み残し」として記録のみ。コード修正・push・Codex への連絡は行っていない。
- 分類基準：妥当な最小呼び出しで実行し、エラーが項目名・構文名を名指せば「正直な停止」、名指さない汎用停止・内部トークン・無言の誤動作・虚偽の原因表示は欠陥として数える（第12ラウンドの判定基準を踏襲）。

## 結論

**このラウンドは新規欠陥ゼロではない。新規13件（P2×0、P3×13）。未収束のため監査は継続する。**

累計残件：108件（第12ラウンドまで）＋13件 ＝ **121件（P2×20、P3×101）**

---

## 角度1：公式関数・コマンド一覧の完全性

公式リファレンスの一覧を全数取得し、カタログ型7種類（指定5種類＋VBA／AutoHotkey）を全件判定した。

### Power Apps（Power Fx）— 公式 Formula reference（Microsoft Learn）約190項目中172件を判定

- 実装済み約23関数（Blank/Clear/ClearCollect/Collect/CountRows/Defaults/Filter/ForAll/If/IsBlank/LookUp/Navigate/Notify/Patch/Switch/Table/Text/UpdateContext/Value/Sequence/Set/Sum のテーブル形）は正しく動作。
- それ以外の大半は「このPower Fx関数は説明に対応していません：<名前>」と名前を挙げて正直に停止。
- **新規1件（R13-N1）**。

**R13-N1 (P3) Power Apps: トップレベルの `ThisRecord` が未定義名エラーにならず、無言で「未設定」のまま格納される**
- 再現：`Set(r, ThisRecord)` → エラーなし、r は「未設定」と表示されるだけ。`Notify(Text(r))` を続けてもエラーなし。
- 対照：ThisItem／Parent／Self／App／Connection／Location／Clock／Compass／Host は全て `NameError：未定義の名前：<名>` で正直に停止する。`ThisRecord.V`（トップレベル）は「空のオブジェクトは参照できません」で停止する。ForAll 内の `ThisRecord.V` は正常動作。
- ThisRecord は列挙ではなく名前付き演算子（レコードスコープ）であり、トップレベルにスコープは存在しない。スコープ外の名前だけが無言で素通りし、学習者は「代入したのに未設定」という状態だけを見る。

- 既知の再現（新規でない）：in／exactin 演算子が「) が必要です」で停止 ＝ R8-N6 と同一表面。
- 観察（欠陥でない）：`Sum(1,2,3)` は「テーブルが必要です」と対応形の要件を具体的に述べて停止（テーブル形は動作）。`Text("a""b")` は実 Power Fx どおり二重引用符エスケープで動作。

### Power Automate（ワークフロー定義言語 WDL）— 公式 Reference guide（Microsoft Learn）136関数を判定

- 135件が「未対応：この構文は説明に対応していません：<名前>」と名前を挙げて正直に停止。**新規ゼロ**。
- 観察：`not(true)` だけが x=false で正しく動作する（共有スクリプト実行器のパーサが `not` を単項演算子として扱う文法上の偶然の一致。値は WDL として正しいため欠陥としない）。なお PA 型の宣言範囲は PAD（デスクトップフロー）であり、WDL はクラウドフローの言語である点も前提として記録する。

### UI.Vision — 公式 Selenium IDE Commands＋フロー制御＋visual 系、84件＋精査プローブを判定

- 動作確認：echo、store、executeScript_Sandbox、type、click（モデルページの送信が完了に変わる）、storeText、storeValue、open、assertText（正の期待で通過・誤った期待で「テキストが一致しません」と正しく失敗）、throwError 系、times/end、break、continue、if/else/end（変数定義済みの場合）。
- 64件が「このコマンドは説明に対応していません：<名前>」と名前を挙げて正直に停止（verify 系・assert 系の大半、storeEval、executeScript、csv 系、wait 系、visual 系、XClick 等を含む）。
- **新規1件（R13-N2）**。

**R13-N2 (P3) UI.Vision: `forEach`…`end` の組が「対応する開始アクションがありません」で停止し、forEach 未対応という本来の原因が隠れる**
- 再現：`executeScript_Sandbox` で配列を作り `forEach`／`echo`／`end` と並べると、最上位の原因が「対応する開始アクションがありません」（end を指す汎用原因）になり、実行は一切進まない。
- 切り分け：forEach 単独では「このコマンドは説明に対応していません：forEach」と名前を挙げて停止する。未知コマンド名・if_v2 単独も同様に名前を挙げる。ブロック構造の事前検証が end の不一致を先に報告するため、実 UIV では正しい組（forEach は開始コマンド）でも原因が end に付け替わる。

- 既知の再現（新規でない）：while ループ内の store 由来値の文字列連結「011」＝ R10-N3 と同一表面。
- 観察（欠陥でない）：未知コマンド名は名前を挙げて正直に停止する。do/repeatIf、gotoIf も名前を挙げて停止（gotoLabel 方式が本アプリの前提）。

### CloudFormation（組み込み関数）— 公式 Intrinsic function reference 全21項目を判定

- 20件が宣言どおり未評価で素通し（"undefined"／[object Object] の混入なし）。**新規ゼロ**。
- 既知の再現（新規でない）：Fn::Transform 配列形式が「未確認：モデルにマクロ定義がありません：undefined」で停止 ＝ R11-N4 と同一表面。オブジェクト形式は正常動作。未登録マクロは名前を挙げて正直に停止。

### ImageJ（組み込み関数）— 公式 Built-in Macro Functions の抽出全項目、374件のプローブで判定

- 純粋関数の中核（abs〜toUpperCase、Math.*、文字列メソッド s.*、Array.copy/sort/getStatistics、Dialog 一式、Overlay の基本操作、roiManager の reset/count/select/deselect/measure、Stack の取得系、String.pad/join/trim 等）は正しく動作し、期待値スポット検証も一致。
- 未対応項目は「未確認：<名前> はモデルで未対応です」等、名前を挙げて正直に停止（名前空間群170件中115件が正直な停止、55件が動作、汎用停止はゼロ）。
- **新規1件（R13-N3）**。

**R13-N3 (P3) ImageJ: `getBoundingRect` が未代入の出力変数を渡す正規の形で「変数 x は、まだ値が代入されていません」という虚偽の原因で停止する**
- 再現：`makeRectangle(1, 2, 3, 4); getBoundingRect(x, y, w, h); print(w);` → 「変数 x は、まだ値が代入されていません」で停止。選択なしでも同一。
- 切り分け：変数を事前に代入しておくと「未確認：getBoundingRect はモデルで未対応です」と関数名を挙げて正直に停止する。同型の出力引数関数（getDimensions、getStatistics、getMinAndMax、getThreshold、getVoxelSize、getCursorLoc、Stack.getDimensions 等）は未代入変数のままでも動作するか名前を挙げて停止する。getBoundingRect だけが引数を値として先に評価し、利用者の変数を責める原因表示になる。出力引数に事前代入を要しないのが ImageJ の正規の書き方。

- 観察（欠陥でない）：reset／selectionName／toolID／Property.getList は SIM_OFFICIAL 表に無いため「『<名前>』は定義されていない関数です」という別文言で停止するが、名前を挙げているため正直な停止と判定（文言の不統一として記録）。`open()` は「未確認：モデルに画像ファイルがありません」とモデル範囲を明示して停止。

### VBA（角度4）— 公式 Functions (VBA) 一覧152件＋$ 変種23件を判定

- 実装済み中核は値が正しい：Abs、Fix、InStr、Int、LBound、LCase／Left／Mid／Right／Trim／UCase、Len、Replace、Round（銀行丸め）、UBound、Val、Array。InputBox／Date／Now は「実行時に決まる」未確定値。84件が「この構文は説明に対応していません：関数 <名前>」と名前を挙げて正直に停止。
- **新規1件（R13-N4）**。

**R13-N4 (P3) VBA: 括弧なしの組み込み関数参照が暗黙の変数として Empty になる現象が、R11-N9 の `Time` 以外に7関数ある（Rnd、Timer、Command、CurDir、FreeFile、DoEvents、IMEStatus）**
- 再現：`x = Rnd` → エラーなし、`rnd=Empty; x=Empty` と表示される。Timer／Command／CurDir／FreeFile／DoEvents／IMEStatus も同型。
- 実 VBA では括弧なしも有効な関数呼び出し。対照：`x = Rnd()` は「関数 rnd」と名前を挙げて正直に停止する。R11-N9 は「Time だけ」と明記されていたため、別表面として新規に数える（R12-N25 の複数キーワード1件集約の前例にならい7関数を1件に集約）。

- 既知の再現（新規でない）：Boolean の小文字表示（IsEmpty／IsNull／IsNumeric → true）＝ R5-N4。
- 観察（欠陥でない）：$ 変種23件は全てレキサで「この構文は説明に対応していません：$」と明示停止（R7 の `#` 日付リテラル判断と同類）。日付関数群（Day／Month／Year／Hour／DateAdd／TimeSerial）は関数名を挙げて正直に停止。

### AutoHotkey（角度4）— 公式関数索引（autohotkey.com/docs/v2/lib）約330項目＋制御構文＋#ディレクティブ、335件のプローブで判定

- 実装済み（WinExist／WinActive／WinActivate／WinClose／Click／MouseMove／Send／SendText／Sleep／MsgBox／InputBox／SetTitleMatchMode）はモデル窓に対して正しく動作。303件が名前を挙げて正直に停止。
- **新規6件（R13-N5〜N10）**。

**R13-N5 (P3) AutoHotkey: `IsSet`／`IsSetRef` が未設定変数に対して `NameError：未定義の名前：y` で停止する**
- 再現：`x := IsSet(y)`（y 未設定）→ 引数の先行評価で NameError。`x := IsSetRef(y)` も同一。
- 実 AHK の IsSet は未設定変数に対して 0 を返すこと自体が目的の関数。設定済み変数（`y := 5` の後）では「このAutoHotkey関数は未対応です：IsSet」と名前を挙げて停止するのに、主用途である未設定ケースだけが変数名を責める虚偽の原因になる。

**R13-N6 (P3) AutoHotkey: ByRef 引数 `&変数` が「未定義の名前：<変数名>」という虚偽の原因で停止する**
- 再現：`MouseGetPos(&mx, &my)` → 「未定義の名前：mx」。`WinGetPos(&wx, …)`、`SplitPath(…, &nm)`、`VarSetStrCapacity(&s, …)` も同型。
- `&` は AHK v2 の正規の参照渡し記法であり、変数が未定義なのではない。出力引数を持つ公式シグネチャ（MouseGetPos、WinGetPos、WinGetClientPos、ControlGetPos、MonitorGet 系など）が軒並みこの形で書けず、原因が利用者の変数名に付け替わる。

**R13-N7 (P3) AutoHotkey: 呼び出し引数の中間省略 `F(a, , c)` が「式を解釈できません：,」で停止する**
- 再現：`MsgBox('hi', , 0)` → パス0件で汎用パースエラー。ControlMove／WinMove の公式シグネチャ（省略引数を含む形）も同一。
- 中間省略は AHK v2 の正規の記法。末尾省略（`WinExist('メモ帳',)`）は動作する。実装済み関数の正規の呼び出し形がカンマを名指す原因で書けない。

**R13-N8 (P3) AutoHotkey: ラベル定義行と `Goto` が、空の原因表示「式を解釈できません：」で停止する**
- 再現：`done:` のラベル行だけのマクロでも「式を解釈できません：」＋（トークン名が空）で停止。`goto done`＋ラベルの組も同一。
- ラベル／Goto は索引掲載の基本構文。原因表示のトークン名が空で、何が問題か一切示されない。

**R13-N9 (P3) AutoHotkey: 文形式の特殊ループ `Loop Files`／`Loop Parse`／`Loop Read` が「この構文は説明に対応していません：,」とカンマを名指して停止する**
- 再現：`Loop Files, 'C:\*.*' { }`、`Loop Parse, 'a,b', ',' { }` → いずれもカンマを名指して停止（カンマを外した形でも同一）。
- 通常の Loop（回数・無限）は動作する。特殊ループは索引掲載の Loop の正規の形であり、未対応なら構文名を挙げるべきところを区切り記号が原因にされる。

**R13-N10 (P3) AutoHotkey: `Switch` 文と `class` 定義が、本体ブロックの「{」を名指して停止する**
- 再現：`switch 2 { case 2: x := 1 }` → 「この構文は説明に対応していません：{」。`class C { m() { return 1 } }` も同一。
- If／Loop／While のブロック波括弧は動作するため、波括弧自体は受理される。宣言ブロックの「{」名指しは関数定義（R11 の既知表面）と同型だが、Switch と class は別の構文であるため別表面として数える。

- 既知の再現（新規でない）：配列が 0-based ＝ R9-N1。for 文が「( が必要です」＝ R9-N7。Try/Catch/Finally/Throw が「レコードのフィールド名が必要です」＝ R12-N3。Loop…Until の無言消失 ＝ R12-N26（本ラウンドの再現でも、Until 条件が無視され回数上限まで回り後続文が無言で消えることを再確認。回数指定 Loop＋Until では Until 名を挙げて停止する形も確認）。0x リテラルが絡む項目（PixelSearch、PostMessage 等）の「) が必要です」は R4-N2 の再現（10進数に置き換えると全て名前を挙げて正直に停止）。
- 判定保留（欠陥としない）：コールバック系（SetTimer、OnError、Hotkey、OnClipboardChange、OnExit、CallbackCreate、ComObjConnect）は、宣言上未対応のユーザー関数定義に遮蔽され単独判定できない。識別子を渡した場合は、その識別子の未定義を名指して停止する（正直な範囲）。
- 観察（欠陥でない）：#ディレクティブ18件は「この構文は説明に対応していません：#」と明示停止（宣言で #HotIf 等は未対応と明記済み）。#Requires は受理される。オブジェクトリテラル引数での HasBase／ObjSetBase は名前を挙げて正直に停止（初期プローブの `Object` 渡しはプローブ側の要因）。

---

## 角度2：キーワードと識別子の大文字小文字規則（全13種類）

公式規則とエンジンの受理を、代表キーワード・関数名・変数名の表記ゆれで体系確認した。

- **VBA**：完全準拠。関数（ABS／abs）、文キーワード（IF…THEN…END IF／If…End If）、変数名（DIM X と x の同一視）、MSGBOX 文まで全て区別なしに受理。
- **Power Fx**：準拠。TEXT／text／IF／if、変数名のケース違いも受理。
- **AutoHotkey**：関数名・変数名・TRUE/FALSE リテラルは区別なし（WINEXIST／msgbox／MSGBOX、MyVar／myvar）。組み込み変数 A_Index は A_INDEX／a_index でも受理。制御キーワードだけが大文字小文字に敏感 ＝ **R12-N25（既知・P2）のまま**。A_LoopIndex は実在しない変数名であり NameError は正しい。
- **ImageJ／Python／JavaScript／C／C++／C#／R**：公式どおり区別する側で一貫。誤ったケースは名前を挙げて停止するか具体的なエラーになる（例：C# の Console.WRITELINE は関数名を挙げて停止、R の PRINT は名前を挙げて停止、ImageJ の ABS／gettitle は未定義関数として名前を挙げる）。なお当初の候補だった C の `Printf` は、切り分けの結果、正規ケースのみ受理・誤ケースは名前を挙げて停止することを確認し**取り消し**（初回プローブの打ち間違い）。
  - 既知の再現：JS の `Math.FLOOR` が「未定義の名前：Math」になるのは R12-N18 と同一表面。
- **CloudFormation**：`!Join`／`!join` の短縮タグは両ケースとも YAML ライブラリの生エラーで停止 ＝ R12-N5 の類型（既知）。ケースによる差はない。
- **UI.Vision**：ECHO／Store／CLICK 等の表記ゆれは全て名前を挙げて停止する（小文字形のみ受理）。ただしコマンド名のケースに関する公式規則を一次情報で確定できなかったため、欠陥としては数えない（観察）。
- **新規1件（R13-N11）**。

**R13-N11 (P3) Power Automate: 公式ブールリテラル `True`／`False` が「未定義の名前」で停止する**
- 再現：Set variable アクションの値 `%True%` → `ReferenceError：未定義の名前：True`。`%False%` も同一。
- 受理されるのは JS 式の `%true%`／`%false%` のみ。PAD（デスクトップフロー）の式で公式のブールリテラルは True／False（Microsoft の変数データ型ドキュメント）であり、正規のリテラルが共有スクリプト実行器の JS 方言の都合で虚偽の原因表示になる。

---

## 角度3：位置マトリクス（式の形 × 構文位置）

三項演算子その他の「式の形」を、代入・引数・初期化子・条件・戻り値の各位置で種類ごとに列挙確認した。

- **三項演算子**：Python の if 式は全位置（代入・引数・戻り値・条件）で正常動作。C／C++／C#／JavaScript は全位置で汎用・トークン原因で停止 ＝ **R12-N9 の再確認**。AutoHotkey も全位置で同型に停止し、C# の `??` も「式を解釈できません：?」で停止することを確認したが、いずれも共有式パーサの演算子欠落という R12-N9／R12-N17 と同一の根であるため、同項目の対象拡大として記録し新規には数えない。
- **代入式の被演算子位置**：C／C++／JS の `(x = 5)`、`(x += 5)` は「) が必要です」で停止 ＝ **R11-N11 の再現**（新規でない）。文位置の複合代入は動作。
- **JavaScript のユーザー関数**：宣言・関数式・アロー関数の全形が停止するが、定義の support 文言に「関数定義・コールバック…は未対応です」と明示宣言されているため欠陥としない（原因表示がトークン的である点のみ観察）。
- **Power Fx／ImageJ／VBA**：比較式の引数位置、If の入れ子、レコードリテラル、関数定義と戻り値、IIf の正直な停止など、位置による不整合なし。VBA の bool 代入で小文字 true 表示になるのは R5-N4 の再現。
- **UI.Vision**：store の Target は仕様上リテラル位置であり式位置ではないため、`${…}` 式の判定対象から除外した（式位置である executeScript_Sandbox は JS 方言として三項欠落が R12-N9 と一貫）。
- **新規2件（R13-N12、N13）**。

**R13-N12 (P3) R: `if` を式（値）として使うと「if／else は未対応」という虚偽の原因で停止する**
- 再現：`x <- if (TRUE) 1 else 2` → 「この構文は説明に対応していません：else」で停止。`x <- if (TRUE) 1` → 「このR関数は説明に対応していません：if」。
- 切り分け：文位置の if／if-else は両形とも正常動作（x=1）。R では if は値を返す式であり、代入位置だけが、動作しているはずの if／else を未対応と名指す。ifelse は関数名を挙げて正直に停止する（対照的に正しい）。

**R13-N13 (P3) AutoHotkey: 暗黙連結が引数位置では「) が必要です」という虚偽原因で停止する**
- 再現：`x := "a"` の後に `MsgBox("v=" x)` → 「) が必要です」で停止（括弧は存在する）。
- 代入位置の暗黙連結は無言で第2オペランド以降が欠落する ＝ R10-N2（P2・既知）。同じ未対応の根から、位置によって「無言の誤値」と「虚偽原因の停止」の別表面になっているため、新規として数える。

---

## 新規欠陥一覧（第13ラウンド）

| 番号 | 重大度 | 種類 | 要約 |
|---|---|---|---|
| R13-N1 | P3 | Power Apps | トップレベルの ThisRecord が無言で「未設定」として格納される |
| R13-N2 | P3 | UI.Vision | forEach…end が end を指す汎用原因で停止し本来の原因が隠れる |
| R13-N3 | P3 | ImageJ | getBoundingRect が未代入の出力変数で虚偽原因で停止 |
| R13-N4 | P3 | VBA | 括弧なし組み込み関数参照7件が暗黙変数として Empty になる |
| R13-N5 | P3 | AutoHotkey | IsSet／IsSetRef が未設定変数で NameError（虚偽原因） |
| R13-N6 | P3 | AutoHotkey | ByRef 引数 `&変数` が「未定義の名前」の虚偽原因で停止 |
| R13-N7 | P3 | AutoHotkey | 引数の中間省略がカンマを名指して停止 |
| R13-N8 | P3 | AutoHotkey | ラベル／Goto が空の原因表示で停止 |
| R13-N9 | P3 | AutoHotkey | Loop Files／Parse／Read がカンマを名指して停止 |
| R13-N10 | P3 | AutoHotkey | Switch 文と class 定義が「{」を名指して停止 |
| R13-N11 | P3 | Power Automate | 公式ブールリテラル True／False が未定義名で停止 |
| R13-N12 | P3 | R | if 式（値位置）が「if／else 未対応」の虚偽原因で停止 |
| R13-N13 | P3 | AutoHotkey | 暗黙連結が引数位置で「) が必要です」の虚偽原因で停止 |

**このラウンドで新規欠陥ゼロか：否（新規13件、P2×0／P3×13）。累計121件（P2×20、P3×101）。監査は未収束であり、第14ラウンドへ継続する。**

## 実施メモ

- 検証基盤：`work/r10-lib.mjs` の `runFull`（第10ラウンド以来のハーネス）。本ラウンドのスイープは `work/r13-pfx.mjs`、`r13-wdl.mjs`、`r13-cfn.mjs`、`r13-vba.mjs`、`r13-ahk.mjs`、`r13-uiv.mjs`、`r13-ij1.mjs`、`r13-ij2.mjs`、`r13-ij3.mjs`、`r13-case.mjs`、`r13-pos.mjs` と各精査ファイル（`*-review*.mjs`）。
- 公式カタログの出典：Power Fx／WDL は Microsoft Learn、UI.Vision は ui.vision 公式ドキュメント、CloudFormation は AWS 公式 Intrinsic function reference、ImageJ は imagej.net 公式 Built-in Macro Functions、VBA は Microsoft Learn の Functions (VBA) 一覧、AutoHotkey は autohotkey.com 公式ドキュメントの関数索引。
- ブラウザ実操作の角度は本ラウンドの対象外（カタログ・パーサレベルの検証に集中）。エンジン側の一次確認は全てハーネス実行結果に基づく。
