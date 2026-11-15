# MUSE-REF-R22：リファレンス完全性修正の照合個票（2026-11-15）

第22ラウンド付随監査（`reference-completeness-round22.md`）で検出されたリファレンスの漏れ（確実368名＋部分漏れ96名）と §5 の文面不整合について、追加・変更した全項目の一次情報の根拠と裁定を記録する個票。種類別の担当記録（`docs/audit/ref-r22/` 配下の各班フラグメント）をそのまま編纂したもので、各項目の書式・意味は表中の公式資料で照合済み。追加・変更した項目の文面は、照合個票 `docs/audit/reference-r2.json`（従来13種類、最終905行）および `docs/audit/reference-r6.json`（新規2種類、最終73行）と同期している（ビルド後の定義オブジェクトからの抽出で生成し、完全一致を機械検証済み）。

注記：reference-r2.json の既存行のうち7行は、本修正以前から sha256 が fields の再計算値と一致していない（過去の編集で sha が追随しなかったもの）。テストは sha256 を参照しないため影響はないが、記録として残す。新規・変更行の sha256 は「fields をキーソートした JSON の sha256」で統一した（既存行の大多数と同一方式）。



---

## リファレンス完全性修正 R22 — Excel VBA 担当台帳

- 対象: `reference-completeness-round22.md` の「Excel VBA」節（第1層10件・第2層14件）＋ §5 の Replace 注意書き
- 変更ファイル: `js/content.js`（rows 追加・Replace 修正）、`js/types/vba/reference-details.js`（returns/source 追加）、`tests/muse-fix-ref-vba.test.js`（新規）
- 結果: VBA リファレンス総数 **66件 → 90件**（対応 58→82件／参照専用 8件のまま）。追加・変更の機械可読な個票は `vba-r2.json`（25行＝追加24件＋変更1件、ビルド後の `definitions` からスクリプト抽出）。

## カテゴリ方針と束ね判断（第2層の裁定）

- **全14件を個別項目にした（束ね項目は採用しなかった）。** 理由: 本アプリの名前解決 `usedReferences`（`js/content.js`）は、コード中のトークンと**リファレンス項目名との完全一致**でのみ項目へ解決する方式である。定数や演算子を1項目に束ねると、束ね名以外の名前（例: 束ね名が「定数」なら `Empty` や `vbTab`）は使用中チップに一切解決できなくなる。束ねを成立させるには別名→項目の解決機構を新規に実装する必要があり、既存の名前解決・trace refs・UI の解決（`js/app.js` の `resolveReferenceName`）全体への侵襲が大きい。一方、個別項目にすれば既存機構のまま全名が解決できることを新規テスト（`tests/muse-fix-ref-vba.test.js` の scan 検証）で全件確認した。意味・戻り値・注意点も名前ごとに異なるため、教材としても個別項目が適切である。
- カテゴリは、既存カテゴリに性質が合うものは既存へ寄せ（Single/Object=型、Time/Timer=日時、Rnd=数値、Command/CurDir/FreeFile/IMEStatus=入出力、DoEvents=手続き）、定数7件・演算子5件・文キーワード2件については既存に該当カテゴリが存在しないため **「定数」「演算子」「文」を新設** した。
- 第1層の括弧なし組み込み8件は、エンジンが「実行時に決まる値」を返す実装（`js/engine.js` の bareBuiltins、RG-24）を持つため、使用例は代入文などエンジンでエラーなく実行できる形にした。`Rnd()` のような括弧つき呼び出しは未対応（名前を挙げて停止）であることも Rnd の注意書きに明記した。
- Nothing は値として使うとエラー91になる（実測）ため、使用例は `Set` による代入形のみとした。

## 裁定表

| # | 名前 | 層 | 裁定 | 理由 | 一次情報（公式ページ／URL） |
|---:|---|---|---|---|---|
| 1 | Time | 第1層 | 項目追加（日時） | 括弧なし組み込みとして実行時に決まる値を返す実装あり（`js/engine.js` bareBuiltins）。同形式の Date／Now には項目があり不揃いだった。使用例は `Debug.Print Time` | Time function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/time-function.md |
| 2 | Rnd | 第1層 | 項目追加（数値） | 同上。公式は引数省略可能な関数だが本エンジンの対応は括弧なし参照のみのため、使用例は代入文 `x = Rnd` とし、括弧つき未対応を注意書きに明記 | Rnd function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/rnd-function.md |
| 3 | Timer | 第1層 | 項目追加（日時） | 同上。午前0時からの経過秒数（Single）を返す公式仕様に合わせた | Timer function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/timer-function.md |
| 4 | Command | 第1層 | 項目追加（入出力） | 同上。公式では Access で利用できる関数と明記されているため、その旨を注意書きに正直に記載し、本アプリでは実行時に決まる文字列として扱う | Command function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/command-function.md |
| 5 | CurDir | 第1層 | 項目追加（入出力） | 同上。公式の引数（ドライブ指定）はエンジン未対応のため注意書きに明記し、使用例は括弧なし形 | CurDir function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/curdir-function.md |
| 6 | FreeFile | 第1層 | 項目追加（入出力） | 同上。公式の戻り値は Integer（次の空きファイル番号）。引数・ファイル入出力自体は対象外である旨を注意書きに明記 | FreeFile function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/freefile-function.md |
| 7 | DoEvents | 第1層 | 項目追加（手続き） | 同上。公式の戻り値（単独版 VB ではフォーム数、それ以外では0）を returns に記載。本アプリは戻り値のみ実行時に決まる値として表示 | DoEvents function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/doevents-function.md |
| 8 | IMEStatus | 第1層 | 項目追加（入出力） | 同上。公式は Integer の状態コードを返し東アジア版のみ。コードがロケール依存である旨を注意書きに明記 | IMEStatus function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/imestatus-function.md |
| 9 | Single | 第1層 | 項目追加（型） | Dim の型リストと cast（binary32 丸め）に実装があるのに型項目だけ欠けていた。既存の型項目（Long 等）の体裁に倣い、公式の範囲（約±3.402823E38、最小約1.401298E-45）と初期値0を記載 | Single data type — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/single-data-type.md |
| 10 | Object | 第1層 | 項目追加（型） | Dim の型リストと cast のオブジェクト型処理に実装があり、`Dim o As Object`＋`Set` が動作する。公式どおり「32ビットのアドレス、あらゆるオブジェクト参照を代入可能、初期値は Nothing」を記載 | Object data type — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/object-data-type.md |
| 11 | Empty | 第2層・定数 | 項目追加（定数、個別項目） | エンジンに専用値（`js/engine.js` の id 解決で EMPTY）がある。束ねず個別項目とし、名前解決できることをテストで確認。定義は公式 Keywords ページ（未初期化 Variant のサブタイプ）および Variant data type ページで照合 | Variant data type（Empty の定義を含む）／Keywords (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/variant-data-type.md |
| 12 | Null | 第2層・定数 | 項目追加（定数、個別項目） | 同上（有効なデータがないことを表す Variant のサブタイプ）。Null の伝播と「Null 同士でも等しくない」はエンジンの binary 処理とも一致 | Variant data type（Null の定義を含む）／Keywords (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/variant-data-type.md |
| 13 | Nothing | 第2層・定数 | 項目追加（定数、個別項目） | エンジンに専用値（NOTHING）がある。公式どおり「Set で代入し、オブジェクト変数と実オブジェクトの結び付きを解く」値。使用例は実測で実行可能な Set 形のみ（値としての使用はエラー91） | Nothing keyword (VBA) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/nothing-keyword.md |
| 14 | True | 第2層・定数 | 項目追加（定数、個別項目） | エンジンに専用値がある。Boolean 項目の説明内に現れるのみだったため独立項目化。数値変換で -1 は公式 Keywords ページおよび Boolean data type ページで照合 | Boolean data type — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/boolean-data-type.md |
| 15 | False | 第2層・定数 | 項目追加（定数、個別項目） | 同上。数値変換で 0 | Boolean data type — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/boolean-data-type.md |
| 16 | vbCrLf | 第2層・定数 | 項目追加（定数、個別項目） | エンジンに専用値（"\r\n"）があり、従来はどこにも記載がなかった。公式 Miscellaneous constants の Chr(13)+Chr(10) で照合 | Miscellaneous constants — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/miscellaneous-constants.md |
| 17 | vbTab | 第2層・定数 | 項目追加（定数、個別項目） | 同上（"\t"、Chr(9)） | Miscellaneous constants — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/miscellaneous-constants.md |
| 18 | And | 第2層・演算子 | 項目追加（演算子、個別項目） | エンジンに専用処理（論理積・ビット AND・Null 伝播）がある。演算子カテゴリ自体がなかったため新設し個別項目化。短絡評価なし・Null 規則はエンジン実装とも一致 | And operator — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/and-operator.md |
| 19 | Or | 第2層・演算子 | 項目追加（演算子、個別項目） | 同上（論理和・ビット OR。True との Or は Null でも True） | Or operator — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/or-operator.md |
| 20 | Xor | 第2層・演算子 | 項目追加（演算子、個別項目） | 同上（排他的論理和。一方が Null なら Null） | Xor operator — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/xor-operator.md |
| 21 | Mod | 第2層・演算子 | 項目追加（演算子、個別項目） | エンジンに専用処理（被演算子の整数丸め、丸め後除数0はエラー11＝RG-31）がある。注意書きはその実装仕様に合わせた | Mod operator — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/mod-operator.md |
| 22 | Not | 第2層・演算子 | 項目追加（演算子、個別項目） | エンジンに専用処理（真偽反転／数値はビット反転、Null は Null）がある単項演算子 | Not operator — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/not-operator.md |
| 23 | Let | 第2層・文 | 項目追加（文、個別項目） | パーサが代入文の接頭辞として処理する（`js/engine.js` の assignRow）。公式どおり「Let は省略可能、オブジェクト代入は Set」を記載。新設カテゴリ「文」に配置 | Let statement (VBA) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/let-statement.md |
| 24 | Rem | 第2層・文 | 項目追加（文、個別項目） | パーサがコメント行として処理する。公式どおり「アポストロフィと等価、文の後ろではコロン区切り」を注意書きに記載（コロン形式は実測でも動作）。cmd の rem が独立項目であることとも整合 | Rem statement (VBA) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/rem-statement.md |
| 25 | Replace | §5 | 本文修正（注意書き＋構文） | 旧注意書き「3引数のバイナリ比較のみ」は実装より狭かった。実装は3〜6引数（start／count／compare、compare=-1 のみ未対応、RG-18 で検証済み）のため、構文に任意引数を追加し、注意書きを実装に合わせて書き換えた。使用例・説明・returns・source は変更なし | Replace function (Visual Basic for Applications) — https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/replace-function.md |

## 検証

- `node --test tests/audit.test.js`: 697件全合格。うち `audit runnable reference: vba/*` は新規24件全件を含む（使用例がエンジンでエラーなく実行できることを確認）。
- `node --test tests/muse-fix-ref-vba.test.js`（新規）: 5件全合格。内訳は、24件全件の個別項目・supported・全フィールド・公式 source の存在、24件全件の使用例の無エラー実行、24件全件の `scan`（usedReferences）による名前解決、括弧なし組み込み8件が幻の変数を作らず「実行時に決まる値」になること、Replace の文面と実装（6引数可・compare=-1 のみ未対応）の一致。
- `node --test tests/muse-fix-vba.test.js tests/engine.test.js tests/types.test.js`: 85件全合格（既存 VBA 挙動に回帰なし）。
- 補足: `docs/audit/reference-r2.json` 本体と round3 テストの照合（全441件の件数・文面一致）は今回の追加で当然に差分が出る。台帳側の更新は本担当の変更範囲外のため触っていない（追加・変更25件の個票は `vba-r2.json` に分離してある）。


---

## リファレンス完全性修正 R22 — ImageJ 担当記録

- 対象リスト：`reference-completeness-round22.md` の「ImageJ」節（第1層41件・第2層 Dialog.* 18件）＋備考の SIM_EXTRA のみの6件。
- 一次情報：imagej.net「Built-in Macro Functions」（https://imagej.net/ij/developer/macro/functions.html 、項目別出典は functions2.html の当該アンカーを各項目の source に設定）。
- 変更ファイル：`js/types/imagej/reference-data.js`（項目59件追加）、`js/types/imagej/reference-details.js`（出典59件追加）、`js/types/imagej/engine.js`（PI の call ケース1件追加、下記）、`js/types/imagej/index.js`（exampleSetup の継承プロパティ対策1行、下記）、`tests/muse-fix-ref-imagej.test.js`（新規）。
- 結果：ImageJ リファレンス総数 141件 → **200件**（対応 107→166件／参照専用 34件は不変）。追加59件は全件 supported=true。

## 裁定サマリ

| 区分 | 件数 | 裁定 |
|---|---:|---|
| 第1層（エンジンに実処理あり・項目なし） | 41 | 全件を項目追加（supported） |
| 第2層（Dialog.* 汎用受理のみ） | 18 | 全件を項目追加（supported）。注意書きに「Dialog. 接頭辞が汎用モデルで受理され、値は実行時に決まる」旨を明記 |
| SIM_EXTRA のみ（実装なし） | 6 | 全件を非漏れとして裁定（項目は追加しない） |
| 合計 | 65 | 追加59件／非漏れ6件 |

## 第1層 41件の裁定

根拠の「実装」は `js/types/imagej/engine.js` の simBuiltin／evMethod／readVar 等の実処理（監査報告書の行番号はスナップショット基準、本記録では処理の所在で示す）。「一次情報」は公式 Built-in Macro Functions の当該見出し・節。

| # | 名前 | 裁定 | 理由（実装根拠） | 一次情報の根拠 |
|---:|---|---|---|---|
| 1 | sin | 追加 | simBuiltin に Math[name] による実計算がある。同族の atan2 のみ項目があった不揃いの解消 | 見出し `sin(angle)`「Returns the sine of an angle (in radians)」 |
| 2 | cos | 追加 | 同上 | 見出し `cos(angle)` |
| 3 | tan | 追加 | 同上 | 見出し `tan(angle)` |
| 4 | asin | 追加 | 同上 | 見出し `asin(n)`「Returns the inverse sine (in radians)」 |
| 5 | acos | 追加 | 同上 | 見出し `acos(n)` |
| 6 | atan | 追加 | 同上。戻り範囲 -PI/2〜PI/2 を説明に明記 | 見出し `atan(n)` |
| 7 | lastIndexOf | 追加 | simBuiltin case で String.lastIndexOf を返す実処理。indexOf の対 | 見出し `lastIndexOf(string, substring)` |
| 8 | trim | 追加 | simBuiltin case で Java String.trim 相当（U+0020 以下除去）の実処理 | String Functions 節 `String.trim(string)` およびメソッド一覧 s.trim。裸名 trim は同節の関数と同義として記載 |
| 9 | toLowerCase | 追加 | simBuiltin case の実処理 | 見出し `toLowerCase(string)` |
| 10 | toUpperCase | 追加 | simBuiltin case の実処理 | 見出し `toUpperCase(string)` |
| 11 | charCodeAt | 追加 | simBuiltin case で charCodeAt を返す実処理 | 見出し `charCodeAt(string, index)`。index 範囲 0〜lengthOf(string) も同見出しに基づく |
| 12 | fromCharCode | 追加 | simBuiltin case で String.fromCharCode を返す実処理 | 見出し `fromCharCode(value1, ..., valueN)`（1つ以上の Unicode 値）。sig はエンジンの arity 計数に合わせ `fromCharCode(value, ...)` とし、可変長であることは説明で担保 |
| 13 | toString | 追加 | simBuiltin case で ImageJ の数値表示整形（simFmt）を返す実処理 | 見出し `toString(number)`／`toString(number, decimalPlaces)`。第2引数の桁数指定はエンジンがモデル化していないため、その旨を注意書きに正直に記載 |
| 14 | getBoundingRect | 追加 | REF_FNS に含まれ、simBuiltin case が ROI の外接矩形（選択なしでは画像全体）を変数へ書き込む実処理。同義の getSelectionBounds には項目があった | 見出し `getBoundingRect(x, y, width, height)`「Replace by getSelectionBounds」。旧名であることと置き換え案内を説明・注意書きに明記 |
| 15 | Math.abs | 追加 | simBuiltin の Math.* 汎用ディスパッチ（Math[mf]）で実計算。Math.min／Math.max／Math.ceil のみ項目があった不揃いの解消（以下 Math.* 19件すべて同じ理由） | Math Functions 節（1.52u以降）見出し `Math.abs(n)`。ver は同節の宣言に合わせ「1.52u以降」 |
| 16 | Math.sqrt | 追加 | 同上。負数で NaN になる旨は公式どおり | 同節 `Math.sqrt(n)` |
| 17 | Math.exp | 追加 | 同上 | 同節 `Math.exp(n)` |
| 18 | Math.log | 追加 | 同上。自然対数であることを明記 | 同節 `Math.log(n)` |
| 19 | Math.log10 | 追加 | 同上（専用に Math.log10 で計算） | 同節 `Math.log10(n)` |
| 20 | Math.floor | 追加 | 同上。裸名 floor と対になる | 同節 `Math.floor(n)` |
| 21 | Math.sin | 追加 | 同上 | 同節 `Math.sin(angle)` |
| 22 | Math.cos | 追加 | 同上 | 同節 `Math.cos(angle)` |
| 23 | Math.tan | 追加 | 同上 | 同節 `Math.tan(n)` |
| 24 | Math.asin | 追加 | 同上 | 同節 `Math.asin(n)` |
| 25 | Math.acos | 追加 | 同上 | 同節 `Math.acos(n)` |
| 26 | Math.atan | 追加 | 同上。戻り範囲 -PI/2〜PI/2 は公式どおり | 同節 `Math.atan(n)` |
| 27 | Math.sinh | 追加 | simBuiltin の Math.* 汎用ディスパッチで実計算（Math.sinh）。説明は双曲線関数の定義 sinh(n)=(e^n−e^−n)/2 に基づく | 公式 Web カタログの Math Functions 節に個別見出しは無い（2026-11-15 確認）。エンジン側に実処理があり監査対象となったため、定義に基づく説明で項目化した。この点は本記録に明示し、項目側では版数（ver）を付けていない |
| 28 | Math.cosh | 追加 | 同上（Math.cosh）。定義 cosh(n)=(e^n+e^−n)/2 | 同上 |
| 29 | Math.tanh | 追加 | 同上（Math.tanh）。定義 tanh(n)=sinh(n)/cosh(n) | 同上 |
| 30 | Math.pow | 追加 | simBuiltin case で2引数の実計算 | Math Functions 節 `Math.pow(base, exponent)` |
| 31 | Math.atan2 | 追加 | simBuiltin case で2引数の実計算。裸名 atan2 と対 | 同節 `Math.atan2(y, x)` |
| 32 | Math.sqr | 追加 | simBuiltin case で n×n の実計算 | 同節 `Math.sqr(n)`「Returns the square of n」 |
| 33 | Math.round | 追加 | simBuiltin case で Math.round の実計算 | 同節 `Math.round(n)` |
| 34 | String.trim | 追加 | simBuiltin case の実処理 | String Functions 節 `String.trim(string)`。メソッド形式 s.trim() への置換可（1.52t以降）も同節に基づく |
| 35 | String.join | 追加 | simBuiltin case で配列を区切り文字列で連結する実処理（区切り省略時は ", "） | 同節 `String.join(array)`／`String.join(array, delimiter)`。sig は `String.join(array[, delimiter])` |
| 36 | String.pad | 追加 | simBuiltin case で先行ゼロ埋めの実処理 | 同節 `String.pad(n, length)`（n は数値でも文字列でもよい） |
| 37 | contains | 追加（メソッド専用形） | evMethod（s.contains(...)）でのみ実処理され、数値文脈では 1/0、文字列文脈では "true"/"false" を返す。裸名の関数形式はエンジンに無く、公式にも無いため、sig はメソッド形式 `s.contains(substring)` とし、その旨を注意書きに明記 | String Functions 節のメソッド一覧「s.contains(s2)」（1.52t以降）。ver は「1.52t以降」 |
| 38 | charAt | 追加（メソッド専用形） | evMethod（s.charAt(i)）でのみ実処理され、範囲外はエラーで停止する。裸名の関数形式は公式にも無い（Unicode 値は charCodeAt の担当）ため、sig はメソッド形式 `s.charAt(index)` | 同節メソッド一覧「s.charAt(i)」（1.52t以降） |
| 39 | matches | 追加（メソッド専用形） | evMethod（s.matches(regex)）でのみ実処理され、文字列全体との一致を ^(?:…)$ で判定する。裸名形式 matches(string, regex) は公式にあるがエンジンでは未対応で停止するため、対応はメソッド形式のみである旨を注意書きに明記 | 見出し `matches(string, regex)` およびメソッド一覧「s.matches(s2)」（メソッド形式は1.52t以降） |
| 40 | PI | 追加 | readVar が Math.PI を返す実処理があり、代入は writeVar が禁止する定義済み定数。同種の nImages／nSlices／nResults には項目があった | 見出し `PI`「Returns the constant π (3.14159265)」 |
| 41 | File.separator | 追加 | evExpr の path 処理が "/" を返す実処理。File.exists 等の File 系項目と同列の定義済み変数 | File Functions 節 `File.separator`「Returns the file name separator character ("/" or "\")」。モデルでは "/" を返す旨を注意書きに明記 |

## 第2層 Dialog.* 18件の裁定

エンジンは `Dialog.` で始まる名前を汎用処理で受理し（ステップ表示＋未確定値の返却）、静的チェックのホワイトリスト SIM_OFFICIAL にも載るため未定義エラーにならない。既存の Dialog 項目8件（create／addNumber／addString／addChoice／show／getNumber／getString／getChoice）が supported として掲載されている方針に合わせ、全件を supported で追加した。全件の注意書きに「このアプリでは Dialog. 接頭辞が汎用モデルで受理され、値は実行時に決まるものとして扱う（個別の動作はモデル化されていない）」と正直に明記した。使用例は全件、単独でエラーなく実行できることを実測した（tests/muse-fix-ref-imagej.test.js）。

| # | 名前 | 裁定 | 一次情報の根拠（公式 Dialog 節） |
|---:|---|---|---|
| 1 | Dialog.addCheckbox | 追加 | `Dialog.addCheckbox(label, default)` |
| 2 | Dialog.addCheckboxGroup | 追加 | `Dialog.addCheckboxGroup(rows, columns, labels, defaults)` |
| 3 | Dialog.addDirectory | 追加 | `Dialog.addDirectory(label, defaultPath)`（1.53d以降。第3引数の幅指定は1.54i以降として注意書きに分離） |
| 4 | Dialog.addFile | 追加 | `Dialog.addFile(label, defaultPath)`（1.53d以降。同上） |
| 5 | Dialog.addHelp | 追加 | `Dialog.addHelp(url)`（"<html>" で始まる場合は HTML メッセージ表示） |
| 6 | Dialog.addImage | 追加 | `Dialog.addImage(pathOrURL)`（パスまたは URL） |
| 7 | Dialog.addImageChoice | 追加 | `Dialog.addImageChoice(label)`（1.53d以降。第2引数 defaultImage は1.53s以降として注意書きに分離）。取得は Dialog.getImageChoice |
| 8 | Dialog.addMessage | 追加 | `Dialog.addMessage(string)`／`(string, fontSize, fontColor)`（後ろ2引数は省略可） |
| 9 | Dialog.addRadioButtonGroup | 追加 | `Dialog.addRadioButtonGroup(label, items, rows, columns, default)` |
| 10 | Dialog.addSlider | 追加 | `Dialog.addSlider(label, min, max, default)` |
| 11 | Dialog.addToSameRow | 追加 | `Dialog.addToSameRow()`（1.51r以降） |
| 12 | Dialog.createNonBlocking | 追加 | `Dialog.createNonBlocking("Title")`（モードレスなダイアログを作成） |
| 13 | Dialog.getCheckbox | 追加 | `Dialog.getCheckbox()`（次のチェックボックスの状態 true/false を返す） |
| 14 | Dialog.getImageChoice | 追加 | `Dialog.getImageChoice()`（画像選択欄で選ばれた画像のタイトルを返す） |
| 15 | Dialog.getLocation | 追加 | `Dialog.getLocation(x, y)`（ダイアログの画面位置を返す。1.54g以降） |
| 16 | Dialog.getRadioButton | 追加 | `Dialog.getRadioButton()`（ラジオボタングループの選択項目を返す） |
| 17 | Dialog.setInsets | 追加 | `Dialog.setInsets(top, left, bottom)`（次に追加する項目の余白を上書き） |
| 18 | Dialog.setLocation | 追加 | `Dialog.setLocation(x, y)`（ダイアログの表示位置を設定） |

## SIM_EXTRA のみの6件の裁定（非漏れ・項目は追加しない）

6件とも静的チェックの誤検出防止ホワイトリスト SIM_EXTRA にのみ載り、エンジンに実処理（case）が無い。実行時は「未確認：モデルで未対応」として正直に停止するため、項目の追加はしない（追加すると supported の幽霊項目になる）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| getMetadata | 非漏れ（追加しない） | SIM_EXTRA のみ。実行時は未対応で停止し、宣言と一致する |
| setMetadata | 非漏れ（追加しない） | 同上 |
| isKeyDown | 非漏れ（追加しない） | 同上（公式には存在する関数だが、本アプリのエンジンに実装が無い） |
| screenWidth | 非漏れ（追加しない） | 同上 |
| screenHeight | 非漏れ（追加しない） | 同上 |
| getBoolean | 非漏れ（追加しない） | 同上（公式には存在する関数だが、本アプリのエンジンに実装が無い） |

## 付随する最小修正（js/types/imagej/** の範囲内）

項目追加だけでは露出した既存の不整合2件を、同範囲内で最小修正した。

1. `engine.js`：定義済み定数 PI は readVar に実処理がある一方、パーサの「括弧省略呼び出し」変換で PI が0引数呼び出しに化け、simBuiltin に受け口が無く「未確認」で停止していた。同種の nImages／nSlices／nResults には simBuiltin の call ケースがあるため、同じ位置に `case "PI": return Math.PI;` を1件追加して体裁を揃えた。
2. `index.js`：exampleSetup の参照が素のオブジェクト添字だったため、項目名 `toString` が Object.prototype.toString を拾い、使用例の先頭に "function toString() { [native code] }" が混入した。`Object.prototype.hasOwnProperty.call(exampleSetup, r.name)` による自有プロパティ判定に変更した（既存141件の使用例に変化は無いことを全件テストで確認）。

exampleSetup への前提コード追加は不要だった（追加59件の使用例はすべて自己完結形にした）。

## 名前解決の確認

- 呼び出し形54件（Math.*／String.* のドット形式、Dialog.*、裸名関数、getBoundingRect）：各項目の使用例に対して定義の `scan()` が当該項目名を返すことをテストで確認した。
- メソッド専用形3件（contains／charAt／matches）：レシーバ付きの使用形 `s.メソッド(...)` は、アプリ本体（js/app.js）の resolveReferenceName と同じ接尾辞解決で項目名に解決されること、および文字列リテラルをレシーバにした形式では `scan()` でも項目名として捕捉されることをテストで確認した。なおエンジンのトレース refs は値メソッドを対象外とする既存仕様のため、トレース経由のチップ表示は呼び出し形とは経路が異なる（既存の文字列メソッド一般と同じ扱い）。
- 定数2件（PI／File.separator）：呼び出し形ではないため scan の対象外（既存の nImages 等の変数項目と同じ）。リファレンス名としての同一名解決と、使用例がエラーなく実行できることをテストで確認した。

## 検証結果

- `node --test tests/audit.test.js`：890件全件合格（追加59件の使用例を含む ImageJ の runnable reference は自種分エラーなし。総数200件のうち参照専用34件を除く166件が実行対象）。
- `node --test tests/muse-fix-ref-imagej.test.js`（新規）：120件全件合格（存在・supported・出典、使用例の実行、scan／接尾辞解決、Dialog の注意書き、SIM_EXTRA 6件の非項目化）。
- 全テストスイート（tests/*.test.js）では上記のほか、件数を固定した統合台帳系の既存テスト（総数511件ピン、round3 の照合件数ピン、RG-29 の legacyLinks=87 ピン）が、各種の項目追加に伴い要統合更新として失敗する。RG-29 については自種分の影響を切り分け済みで、ImageJ テンプレート ij-3 の intro に PI への正当な新規リンクが1件増えたのみ（midWord は 0 を維持）。これらのピン更新と reference-r2.json 本体への統合は担当範囲外（台帳・reference-r2.json 本体は変更禁止）のため、統合担当への引き継ぎ事項とする。


---

## リファレンス完全性修正 R22 — Python／CloudFormation 裁定記録

- 対象報告書：`reference-completeness-round22.md` の「Python」節と「CloudFormation」節
- 変更ファイル：`js/types/python/reference.js`（新規118件追加＋`with` 文面修正）、`js/types/python/index.js`（`with` の未対応注記の出し分けのみ。エンジン挙動は変更していない）、`js/types/cloudformation/index.js`（固有4件追加）、`js/types/cloudformation/reference-details.js`（固有4件の returns／source 追加）、新規テスト `tests/muse-fix-ref-python.test.js`
- 抽出成果物：`docs/audit/ref-r22/python-r2.json`（123行＝Python 119行（新規118＋変更 `with` 1）＋CloudFormation 4行。ビルド後の定義オブジェクトから node スクリプトで抽出。Python 定義の独自フィールドは summary→description、pitfalls→caution、doc→source と対応付けた）
- 追加後のリファレンス総数：Python 160件（従前42件＋新規118件。対応151／参照専用9で、参照専用の内訳は従前どおり open・with・str.format・random・json・os・datetime・numpy.array・pandas.DataFrame）。CloudFormation 171件（従前49件＝固有7＋Python委譲42 → 固有11＋Python委譲160）
- 検証：`node --test tests/audit.test.js` 全1,130件合格（新規項目の使用例は Python 自種分・CloudFormation ハンドラ内包分の両方でエラーなし）。`node --test tests/muse-fix-ref-python.test.js` 9件合格、`tests/muse-fix-python.test.js`／`tests/muse-fix-cloudformation.test.js`／`tests/types.test.js` 47件合格。追加・変更した全項目の使用例は、エンジン実実行で出力が `expected` と一致することを自前プローブでも確認済み（119／119件。従前項目の input／filter は対象外の既存事情で不一致だが本修正の対象ではない）
- 一次情報の根拠の表記：Python は公式ドキュメント日本語版 3.12（https://docs.python.org/ja/3.12/ 配下）を行ごとに「ページ#アンカー」で示す。CloudFormation は AWS 公式「マクロのリクエスト・レスポンス」https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html

## Python 第1層（89件）— 全件「項目を追加」で処置

### 組み込み関数（16件）

| 名前 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| float | 項目を追加 | `callBuiltin0` に専用 case があり変換が計算される。int／str と対になる基本変換で項目がなかった | library/functions.html#float |
| bool | 項目を追加 | 専用 case あり。真理値判定の基礎で、TYPE 系項目の前提になる | library/functions.html#bool |
| reversed | 項目を追加 | 専用 case あり。sorted／iter と対のイテレータ関数 | library/functions.html#reversed |
| ord | 項目を追加 | 専用 case あり。chr と対 | library/functions.html#ord |
| chr | 項目を追加 | 専用 case あり。ord と対 | library/functions.html#chr |
| divmod | 項目を追加 | 専用 case あり（商と余りの組）。演算子 // ％ の意味づけにも必要 | library/functions.html#divmod |
| pow | 項目を追加 | 専用 case あり（3引数 mod 付き含む） | library/functions.html#pow |
| any | 項目を追加 | 専用 case あり（短絡評価・イテレータ消費位置まで実装） | library/functions.html#any |
| all | 項目を追加 | 専用 case あり。any と対 | library/functions.html#all |
| repr | 項目を追加 | 専用 case あり。str との違いが教材論点 | library/functions.html#repr |
| hex | 項目を追加 | 専用 case あり。bin／oct と組の基数変換 | library/functions.html#hex |
| bin | 項目を追加 | 専用 case あり | library/functions.html#bin |
| oct | 項目を追加 | 専用 case あり | library/functions.html#oct |
| format | 項目を追加 | 専用 case あり（組み込み関数版）。メソッド版 str.format が参照専用項目として存在するのと対照的だった | library/functions.html#format |
| next | 項目を追加 | 専用 case あり。iter と対でイテレータ教材の中心 | library/functions.html#next |
| iter | 項目を追加 | 専用 case あり。next と対 | library/functions.html#iter |

### str メソッド（26件）

いずれもエンジンの str メソッド専用 case（STR_KNOWN）で実際に計算される。項目があったのは str.split／str.join のみで、テンプレートでも使われる str.strip／str.replace を含め全件を追加した。根拠は全件 library/stdtypes.html の各メソッド節（#str.<名前>）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| str.upper | 項目を追加 | 大文字化。lower と対の基本変換 |
| str.lower | 項目を追加 | 小文字化。upper と対の基本変換 |
| str.title | 項目を追加 | 単語先頭の大文字化。capitalize との違いが論点 |
| str.capitalize | 項目を追加 | 先頭のみ大文字化。title との違いが論点 |
| str.strip | 項目を追加 | 両端の空白除去。テンプレートでも使用され解説文でも名前が挙がっていた（方向3にも該当） |
| str.lstrip | 項目を追加 | 左端のみ。strip と組 |
| str.rstrip | 項目を追加 | 右端のみ。strip と組 |
| str.rsplit | 項目を追加 | 右からの分割。split の対 |
| str.replace | 項目を追加 | 置換。テンプレートでも使用され解説文でも名前が挙がっていた（方向3にも該当） |
| str.find | 項目を追加 | 位置検索（見つからなければ -1）。index と対 |
| str.index | 項目を追加 | 位置検索（見つからなければ ValueError）。find と対 |
| str.rfind | 項目を追加 | 末尾からの位置検索。find の対 |
| str.rindex | 項目を追加 | 末尾からの位置検索。index の対 |
| str.count | 項目を追加 | 出現回数。list.count と対 |
| str.startswith | 項目を追加 | 接頭辞判定。endswith と対 |
| str.endswith | 項目を追加 | 接尾辞判定。startswith と対 |
| str.isdigit | 項目を追加 | 数字判定。isdecimal／isnumeric と範囲の違いが論点 |
| str.isdecimal | 項目を追加 | 10進数字判定。isdigit より狭い |
| str.isnumeric | 項目を追加 | 数値文字判定。isdigit より広い |
| str.isalpha | 項目を追加 | 文字判定。isalnum と対 |
| str.isalnum | 項目を追加 | 英数字判定。isalpha／isdigit と組 |
| str.isspace | 項目を追加 | 空白判定 |
| str.isascii | 項目を追加 | ASCII 判定（空文字列でも True の例外性が論点） |
| str.isidentifier | 項目を追加 | 識別子判定 |
| str.islower | 項目を追加 | 小文字判定。isupper と対 |
| str.isupper | 項目を追加 | 大文字判定。islower と対 |

### list メソッド（9件）

いずれも専用 case で実際に変更・取得が行われる。項目があったのは list.append／list.sort のみ。根拠は全件 tutorial/datastructures.html#more-on-lists（既存 list.append の doc と同じページ）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| list.extend | 項目を追加 | 要素ごとの追加。append との違いが最重要の論点 |
| list.insert | 項目を追加 | 位置指定の挿入 |
| list.pop | 項目を追加 | 取り出し。append と対でスタック操作の中心 |
| list.remove | 項目を追加 | 値による削除。pop／del との使い分けが論点 |
| list.index | 項目を追加 | 位置検索。count と対 |
| list.count | 項目を追加 | 個数。index と対 |
| list.reverse | 項目を追加 | その場での逆転。reversed との違いが論点 |
| list.copy | 項目を追加 | 浅いコピー。代入との違いが論点 |
| list.clear | 項目を追加 | 全削除。del との共有関係の違いが論点 |

### dict メソッド（8件）

いずれも専用 case あり。項目があったのは dict.get／dict.items のみ。根拠は全件 library/stdtypes.html の各メソッド節（#dict.<名前>、既存 dict.get の doc と同じ形式）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| dict.keys | 項目を追加 | キーのビュー。items 項目本文でも言及されていた |
| dict.values | 項目を追加 | 値のビュー。keys と組 |
| dict.update | 項目を追加 | まとめて更新・上書き |
| dict.pop | 項目を追加 | キー指定の取り出し。get との違いが論点 |
| dict.setdefault | 項目を追加 | 取得と登録の複合操作 |
| dict.popitem | 項目を追加 | 最後の組の取り出し（LIFO が仕様） |
| dict.copy | 項目を追加 | 浅いコピー。list.copy と対 |
| dict.clear | 項目を追加 | 全削除。list.clear と対 |

### set メソッド（14件）

set のメソッド項目は1件もなかったが、エンジンには全件の専用 case がある。全件を追加した。根拠は全件 library/stdtypes.html の集合型の節（#set、既存 set 項目の doc と同じページ。集合メソッドには個別アンカーがないため節単位）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| set.add | 項目を追加 | 要素の追加。集合操作の入口 |
| set.remove | 項目を追加 | 要素の削除（無ければ KeyError）。discard と対 |
| set.discard | 項目を追加 | 要素の削除（無くてもエラーなし）。remove と対 |
| set.update | 項目を追加 | 複数要素の追加。union との違い（変更 vs 新規）が論点 |
| set.clear | 項目を追加 | 全削除 |
| set.pop | 項目を追加 | 任意要素の取り出し。エンジンは取り出す要素が定まらないため未確定値を返す実装であり、使用例・注意書きもその実態に合わせた |
| set.intersection_update | 項目を追加 | 共通要素だけに更新。intersection と対 |
| set.difference_update | 項目を追加 | 差集合に更新。difference と対 |
| set.symmetric_difference_update | 項目を追加 | 対称差に更新。symmetric_difference と対 |
| set.union | 項目を追加 | 和集合（新しい集合）。update と対 |
| set.intersection | 項目を追加 | 積集合（新しい集合） |
| set.difference | 項目を追加 | 差集合（新しい集合） |
| set.symmetric_difference | 項目を追加 | 対称差（新しい集合） |
| set.copy | 項目を追加 | 浅いコピー。list.copy／dict.copy と対 |

### tuple／range メソッド（4件）

いずれも専用 case あり（メソッド項目ゼロだった）。根拠は tuple が library/stdtypes.html#tuple、range が同 #range（各型項目の doc と同じページ）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| tuple.count | 項目を追加 | 個数。タプルに許される数少ないメソッドの1つ |
| tuple.index | 項目を追加 | 位置検索。count と組でタプルのメソッドはこの2つだけ |
| range.count | 項目を追加 | 含有個数（0 か 1）。列挙せず判定される点が論点 |
| range.index | 項目を追加 | 位置。count と組 |

### 構文（12件）

項目があった構文は for／if／while／try（＋参照専用の with）のみで、DEVELOPMENT.md が「型・コンテナ・関数・クラス・例外」を対応範囲と宣言し、テンプレートも def／class を教えているため、全件を追加した。

| 名前 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| def | 項目を追加 | 関数定義。エンジンに専用処理がありテンプレートの中心 | reference/compound_stmts.html#function-definitions |
| class | 項目を追加 | クラス定義。エンジンに専用処理がありテンプレートでも使用 | reference/compound_stmts.html#class-definitions |
| return | 項目を追加 | 関数の戻り値。def と不可分 | reference/simple_stmts.html#the-return-statement |
| break | 項目を追加 | ループ終了。for／while 項目の前提 | reference/simple_stmts.html#the-break-statement |
| continue | 項目を追加 | 周回スキップ。break と対 | reference/simple_stmts.html#the-continue-statement |
| pass | 項目を追加 | 何もしない文。def／class の雛形に必須 | reference/simple_stmts.html#the-pass-statement |
| del | 項目を追加 | 束縛・要素の削除。エンジンに名前／添字／スライスの専用処理あり | reference/simple_stmts.html#the-del-statement |
| assert | 項目を追加 | 表明。AssertionError と対応 | reference/simple_stmts.html#the-assert-statement |
| raise | 項目を追加 | 例外の発生。try 項目・例外クラス項目の前提 | reference/simple_stmts.html#the-raise-statement |
| global／nonlocal | 項目を追加（1項目「global文／nonlocal文」に束ねる） | エンジンに両形式の専用処理あり（global はモジュール変数、nonlocal は外側関数の変数への宣言）。使用例は global の代入パターン（CloudFormation ハンドラ内包でも実行できる形）で実証し、nonlocal は構文・注意書きで扱う | reference/simple_stmts.html#the-global-statement |
| 内包表記 | 項目を追加（id は comprehension） | リスト内包等はエンジンに専用処理があり、map／filter 項目の関連先としても必要 | reference/expressions.html#displays-for-lists-sets-and-dictionaries |
| f文字列 | 項目を追加（id は f-string） | フォーマット文字列リテラルはエンジンに専用処理があり、str.format 項目からも参照される現在の標準表記 | reference/lexical_analysis.html#formatted-string-literals |

## Python 第2層 math 関数（4件）— 全件「個別項目を追加」で処置

モジュール単位の `math` 項目しかなかったが、エンジンの mathCall で実際に計算されるのは sqrt／log 系の定義域チェックを除くと sqrt・fabs・floor・ceil の4件が中心であり、個別項目を追加した（log／log2／log10 は定義域チェックのみで結果は未確定値のため、個別項目は作らない）。根拠は全件 library/math.html の各節（#math.<名前>）。

| 名前 | 裁定 | 理由 |
|---|---|---|
| math.sqrt | 項目を追加 | 専用計算あり（負数は ValueError）。math 項目の使用例でも使われていた |
| math.fabs | 項目を追加 | 専用計算あり（常に float）。abs との違いが論点 |
| math.floor | 項目を追加 | 専用計算あり（床）。ceil と対、int() の切り捨てとの違いが論点 |
| math.ceil | 項目を追加 | 専用計算あり（天井）。floor と対 |

## 例外クラス（25件）— 全件「項目を追加」で処置

呼び出し（コンストラクタ）としては汎用フォールバックだが、`raise` 文と try のハンドラ照合では種類名として実処理される（階層照合を含む）ため、全件をカテゴリ「例外」の項目として追加した。使用例は全件 try／raise／except で捕捉できる形にし、エンジン実実行で捕捉を確認済み。根拠は全件 library/exceptions.html の各節（#<クラス名>）。コンストラクタ呼び出しを値として使う形は本アプリでは未確定値になる旨は、各項目の syntax／returns の範囲（raise／except での使用）に限定して明記した。

| 名前 | 裁定 | 理由（発生場面） |
|---|---|---|
| Exception | 項目を追加 | 通常例外すべての基底。まとめて捕捉する際の指定先 |
| BaseException | 項目を追加 | 全例外の最上位。SystemExit／KeyboardInterrupt の親である点が論点 |
| ValueError | 項目を追加 | 値が不適切な変換・計算（int("abc") 等）。最も頻出 |
| TypeError | 項目を追加 | 型に合わない操作・引数の誤り。最も頻出 |
| KeyError | 項目を追加 | 辞書に無いキー。dict.get 項目と対応 |
| IndexError | 項目を追加 | シーケンスの範囲外。list.pop 項目と対応 |
| ZeroDivisionError | 項目を追加 | ゼロ除算 |
| NameError | 項目を追加 | 未定義の名前。del 項目と対応 |
| AttributeError | 項目を追加 | 無い属性・メソッド |
| RuntimeError | 項目を追加 | 分類外の実行時エラーの受け皿 |
| StopIteration | 項目を追加 | イテレータの終了合図。next／iter 項目と対応 |
| AssertionError | 項目を追加 | assert の失敗。assert 項目と対応 |
| ImportError | 項目を追加 | import の失敗。ModuleNotFoundError の親 |
| ModuleNotFoundError | 項目を追加 | モジュール自体が無い（ImportError のサブクラス） |
| OSError | 項目を追加 | OS 系エラーの基底。FileNotFoundError の親 |
| FileNotFoundError | 項目を追加 | ファイルが無い（OSError のサブクラス） |
| NotImplementedError | 項目を追加 | 未実装の表明（RuntimeError のサブクラス） |
| ArithmeticError | 項目を追加 | 算術エラーの基底（ZeroDivisionError／OverflowError の親） |
| LookupError | 項目を追加 | 探索エラーの基底（KeyError／IndexError の親） |
| OverflowError | 項目を追加 | 数値の過大（ArithmeticError のサブクラス） |
| RecursionError | 項目を追加 | 再帰の深さ超過（RuntimeError のサブクラス） |
| UnicodeError | 項目を追加 | 符号化・復号エラー（ValueError のサブクラス） |
| EOFError | 項目を追加 | input() の終端到達。input 項目と対応 |
| KeyboardInterrupt | 項目を追加 | Ctrl+C の割り込み（BaseException 系で except Exception では捕捉されない点が論点） |
| SystemExit | 項目を追加 | sys.exit() による終了（BaseException 系）。本アプリの照合は簡略化され except Exception でも一致する場合がある旨を注意書きに明記 |

## フォールバック受理のみの組み込み（29件）— 全件「現行どおり＋宣言化」で処置（項目化しない）

仕組み：`PY_BUILTINS` に名前があるため NameError にはならず受理されるが、`callBuiltin0` に専用 case がなく、呼び出すと「組み込みの『名前』はこの説明では解釈しません。結果は『実行時に決まる値』として扱います」という未対応の注記（その実行経路は停止）になる。専用の意味・計算を説明する項目を作ると実装の実態（未対応）と食い違うため、項目化せず、DEVELOPMENT.md への宣言追加で未対応範囲を明示する裁定とした（宣言文案は末尾）。個別の理由は次のとおり。

| 名前 | 理由 |
|---|---|
| ascii | repr の ASCII エスケープ版で、専用 case はない。教材範囲では repr で代替できる |
| breakpoint | デバッガ連携用。学習モデルにデバッガは存在しない |
| bytearray | バイト列型は本アプリの対応型の範囲外で、専用処理がない |
| bytes | bytearray と同じくバイト列型が対応範囲外 |
| callable | 呼び出し可能性の判定だが専用 case がない |
| classmethod | 記述子（デコレータ）で、クラスの応用機能。専用処理がない |
| compile | 動的コンパイル。eval／exec と同じく動的実行はモデル化しない |
| complex | 複素数型は対応型の範囲外で、専用処理がない |
| delattr | 動的属性の削除。属性操作の専用処理がない |
| dir | スコープ内省系。専用処理がない |
| eval | 動的実行。任意コードの実行は学習モデルでは扱わない |
| exec | eval と同じく動的実行 |
| frozenset | イミュータブル集合型は対応範囲外。set で代替できる |
| getattr | 動的属性の取得。専用処理がない |
| globals | スコープ内省系。専用処理がない |
| hasattr | 動的属性の判定。専用処理がない |
| hash | ハッシュ値は実行環境依存で、モデルでは再現しない |
| help | 対話ヘルプ。学習モデルにヘルプシステムはない |
| id | オブジェクト ID は実行環境依存で、モデルでは再現しない |
| issubclass | 継承判定。isinstance には専用項目があるが、こちらは専用 case がなくクラス階層の教材範囲外 |
| locals | スコープ内省系。専用処理がない |
| memoryview | バッファ型は対応範囲外 |
| object | 基底型のコンストラクタ。専用処理がない |
| property | 記述子。専用処理がない |
| setattr | 動的属性の設定。専用処理がない |
| slice | スライスオブジェクトの生成。添字記法 [a:b] 自体は構文として処理されるが、slice() 呼び出しの専用 case はない |
| staticmethod | 記述子（デコレータ）。専用処理がない |
| super | 継承先の呼び出し。エンジンは super() を専用処理せず、クラス教材は単独クラスの範囲 |
| vars | スコープ内省系。専用処理がない |

## TYPE_ATTRS のフォールバックメソッド（41件）— 全件「現行どおり＋宣言化」で処置（項目化しない）

仕組み：`TYPE_ATTRS` に属性名があるため AttributeError にならずメソッド参照として受理されるが、メソッド呼び出しの専用 case がなく、呼び出すと「未対応：<型> の『<名前>』はこの説明では解釈できません」でその経路が止まる（全件を実実行プローブで確認済み）。組み込みと同様、専用項目を作ると実態と食い違うため項目化せず宣言化する。数値型の属性 real／imag／numerator／denominator は専用処理で実値が返るためフォールバックではない（メソッドではなく属性であり、対象外）。

| 型 | 名前（全数） | 理由 |
|---|---|---|
| str（18件） | casefold、center、encode、expandtabs、format_map、isprintable、istitle、ljust、maketrans、partition、removeprefix、removesuffix、rjust、rpartition、splitlines、swapcase、translate、zfill | いずれも整形・分割・判定の応用メソッドで専用 case がない。特に casefold は lower との使い分けが教材論点になりうるが、未対応である以上は宣言で明示するに留める。str.format は参照専用項目が既にあるため、この群には数えない |
| dict（1件） | fromkeys | クラスメソッド的な生成方法で専用 case がない |
| set（3件） | isdisjoint、issubset、issuperset | 関係判定の3件。演算子（<=、>= 等）や他の集合メソッドは専用処理があるが、この3件は専用 case がない |
| int（7件） | as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes | 整数の応用メソッド群で専用 case がない |
| float（5件） | as_integer_ratio、conjugate、fromhex、hex、is_integer | 浮動小数点数の応用メソッド群で専用 case がない |
| bool（7件） | as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes | int の属性表を継承するメソッド群で、bool としても専用 case がない（実実行プローブで確認） |

## with 項目（参照専用）— 文面を実装の実態に合わせて修正

| 対象 | 裁定 | 理由 | 根拠 |
|---|---|---|---|
| with | 項目文面を修正（項目の追加・削除はなし。supported=false の参照専用分類とエンジン挙動は変更しない） | 従前の文面は「未対応として停止」と読めるものだったが、実装は (1) コンテキスト式を評価し、(2) as 変数に「with で開いた値」という未確定値を束縛し、(3) 本文を実行する部分実行である（イテレータや未確定値を渡した場合は出入りの出力をプレースホルダで示す）。__enter__／__exit__ の実際の処理や後始末は再現されない。`with open(...)` が停止するのは open 自体が未対応のためである。summary／pitfalls と、index.js で付加される注記をこの実態に合わせて書き換え、使用例も部分実行で実際に動く形（独自コンテキストマネージャ＋本文の print）に差し替えて実実行確認した | エンジン `js/types/python/engine.js` の with 実行部（式の評価→as 変数への未確定値の束縛→本文の実行）。一次情報としての with の意味は reference/compound_stmts.html#the-with-statement |

## CloudFormation 第1層（固有4件）— 全件「固有項目を追加」で処置

いずれもハンドラの event／応答として実際にコードで扱われるフィールドで、兄弟フィールド（fragment／params／requestId／status／templateParameterValues）には項目があった。根拠は全件 AWS 公式「マクロのリクエスト・レスポンス」。

| 名前 | 裁定 | 理由 |
|---|---|---|
| region | 固有項目を追加 | モデル既定 event に入りハンドラへ渡される（`js/types/cloudformation/index.js` の model.defaults.event）。event の出所を示す基本フィールド |
| accountId | 固有項目を追加 | 同上。アカウント ID のフィールド |
| transformId | 固有項目を追加 | モデル既定 event に入り、マクロ呼び出し時は呼び出し側のマクロ名で上書きされて渡される |
| errorMessage | 固有項目を追加 | 応答検査で実際に読まれる（status が success 以外／欠落のときに失敗理由として表示）。テストでも使用されている |

なお Python 委譲分の漏れは Python 側の追加（118件）がそのまま伝播して解消する（CloudFormation のリファレンスは pythonDefinition.reference を複製する構造）。新規 Python 項目の使用例は、ハンドラ内包形（def handler の内側にインデントした形）でも全件エラーなく実行できることを確認済み。

## DEVELOPMENT.md への宣言文案（コーディネーター反映用）

Python の対応範囲の宣言に、次の趣旨の文を追加する（文案）。

> Python：次の組み込み名は PY_BUILTINS の受理のみで専用処理はなく、呼び出すと未対応として停止します（リファレンス項目はありません）：ascii、breakpoint、bytearray、bytes、callable、classmethod、compile、complex、delattr、dir、eval、exec、frozenset、getattr、globals、hasattr、hash、help、id、issubclass、locals、memoryview、object、property、setattr、slice、staticmethod、super、vars。例外クラス名（Exception、ValueError 等25件）は raise 文と try のハンドラ照合でのみ処理し、コンストラクタ呼び出しを値として使う形は未対応です。また TYPE_ATTRS に載る次のメソッドは参照のみ受理され、呼び出しは未対応として停止します（リファレンス項目はありません）：str の casefold、center、encode、expandtabs、format_map、isprintable、istitle、ljust、maketrans、partition、removeprefix、removesuffix、rjust、rpartition、splitlines、swapcase、translate、zfill、dict の fromkeys、set の isdisjoint、issubset、issuperset、int の as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes、float の as_integer_ratio、conjugate、fromhex、is_integer、bool の as_integer_ratio、bit_count、bit_length、conjugate、from_bytes、is_integer、to_bytes。with 文は部分対応です（本文は実行し、as 変数には未確定値が入り、__enter__／__exit__ の処理や後始末は再現しません。open との組み合わせは open 自体が未対応のため停止します）。

あわせて、DEVELOPMENT.md 種類別表の Python 行にある「42リファレンス」の記数は 160 への更新が必要です（本担当の変更範囲外のため未反映）。

## 裁定の内訳

- Python 第1層89件 → 新規89項目で処置（組み込み16＋str 26＋list 9＋dict 8＋set 14＋tuple／range 4＋構文12）。
- Python 第2層 math 4件 → 新規4項目で処置。
- 例外クラス25件 → 新規25項目で処置（カテゴリ「例外」）。
- フォールバック受理のみの組み込み29件＋TYPE_ATTRS フォールバックメソッド41件 → 項目化せず「現行どおり＋宣言化」（名前は全数列挙済み。宣言の反映はコーディネーター）。
- with 1件 → 文面修正（分類・挙動は不変）。
- CloudFormation 第1層（固有）4件 → 新規4項目で処置。Python 委譲分は Python 追加118件の伝播で解消。
- 新規項目の合計：Python 118件＋CloudFormation 固有4件。変更した既存項目：Python `with` 1件。python-r2.json は新規・変更の全123行を収録。


---

## リファレンス完全性修正 R22 — AutoHotkey 裁定記録

- 対象報告書：`reference-completeness-round22.md` の AutoHotkey 節（第1層118名・第2層1件）
- 変更ファイル：`js/types/autohotkey/index.js`（rows への項目追加・Loop 項目の文面変更・scan ラッパの A_* 別名解決）、`js/types/autohotkey/reference-details.js`（新規項目の returns／source）、新規テスト `tests/muse-fix-ref-ahk.test.js`
- 抽出成果物：`docs/audit/ref-r22/ahk-r2.json`（10行＝新規9件＋変更1件（Loop）。ビルド後の定義オブジェクトから node スクリプトで抽出）
- 追加後の AutoHotkey リファレンス総数：26件（従前17件＋新規9件。全件 supported）
- 検証：`node --test tests/muse-fix-ref-ahk.test.js` 8件合格、`node --test tests/muse-fix-ahk.test.js`（既存）と合わせて50件合格。`node --test tests/audit.test.js`（全890件）では AutoHotkey 分は全件合格（新規項目の runnable reference を含む）。同テストの失敗4件と `tests/types.test.js` の失敗1件はいずれも ImageJ 分（ij-3 テンプレート／PI／fromCharCode／toString）で、本担当の変更とは無関係。

## 個別裁定（A_* 以外）

| 対象 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| `IsSet`（第1層） | 個別項目を追加 | 引数を評価せず未代入を確認する専用処理（index.js の call ハンドラ）があり、DEVELOPMENT 宣言内。未代入変数の読み取りがエラーになる言語仕様上、学習者の到達経路として必須 | AutoHotkey v2 公式「Variables and Expressions」：未代入変数の読み取りはエラーであり IsSet で検出できる https://www.autohotkey.com/docs/v2/Variables.htm |
| `IsSetRef`（第1層） | 個別項目を追加 | IsSet と対の専用処理。参照（&変数）を受け取る形が IsSet と異なるため分離。本文の caution にモデルの実装どおり「参照先が配列・オブジェクトのときに1、数値・文字列のときに0」を明記 | 同上（v2 変更点公式要約でも `IsSet(Var)`／`IsSetRef(&Ref)` は対で「代入済みなら1」と定義） |
| `for`（`for Key, Value in Collection`、第1層） | 個別項目を追加 | ahkForEach ノードとして専用実行があり、trace の refs が `for` を出すのに解決先がなかった。配列では Key=1始まり添字、オブジェクトでは Key=プロパティ名である旨を明記 | AutoHotkey v2 公式「For Loop」：列挙子が返す値を変数へ格納して繰り返す https://www.autohotkey.com/docs/v2/lib/For.htm |
| `break`（第1層） | 個別項目を追加 | 共有パーサ・実行器に専用処理があり、if／Loop／while が項目化されている以上、ループ終了の基本文が不可視なのは不揃い。ループ外ではエラーになる旨を caution に明記（実装で確認） | AutoHotkey v2 公式「Language」：Break はループを終了（terminate）する https://www.autohotkey.com/docs/v2/Language.htm |
| `continue`（第1層） | 個別項目を追加 | break と対の専用処理。現在の繰り返しの残りを飛ばして次へ進む | AutoHotkey v2 公式「Continue」：残りを飛ばして新しい繰り返しを始める https://www.autohotkey.com/docs/v2/lib/Continue.htm |
| `return`（第1層） | 個別項目を追加 | 専用処理があり、ホットキー本体を途中で終える実用形が既存テストでも使われている。使用例はモデルで実行できるホットキー本体の早期終了形とし、式付きは関数内のみと caution に明記（モデルはユーザー関数定義が未対応） | AutoHotkey v2 公式「Return」：関数・ホットキーから呼び出し側へ戻る。式は関数内でのみ https://www.autohotkey.com/docs/v2/lib/Return.htm |
| `Length`（プロパティ、第1層） | 個別項目を追加 | 配列・文字列への読み書き専用実装（RG-48）がある。配列では取得・設定（伸長は値なし要素、短縮は切り捨て）、文字列では文字数の取得、プロパティ名は大文字小文字不区別である旨を明記 | AutoHotkey v2 公式「Array Object」Length プロパティ：配列の長さを取得・設定する https://www.autohotkey.com/docs/v2/lib/Array.htm |
| Loop の Until 節（第2層） | 既存 `Loop` 項目の syntax と本文に Until 形式を追記（変更行として ahk-r2.json に収録） | `rewriteUntil` で実装され DEVELOPMENT でも宣言済みなのに項目文面に記載がなかった。syntax を「Loop 回数 { … } / Loop { … } Until 条件」とし、本文に「本体を1回実行するごとにその後で条件を評価し、成立したら終了する」を追記 | AutoHotkey v2 公式「Loop」／「Language」：Until は各繰り返しの後に式を評価し真ならループを終了する https://www.autohotkey.com/docs/v2/lib/Loop.htm |

## 組み込み変数 A_* 全111件の裁定

処置は2区分：**A_Index のみ個別項目**（テンプレート・テストでも使われる中心的な変数で、ループ内での意味が独立しているため）、**残り110件は束ね項目「A_*（組み込み変数）」**。束ね項目の本文には固定値／実行時に決まる値の区別と代表名を列挙し、caution に未対応21件の扱いを明記した。

あわせて **scan の別名解決**を index.js の scan ラッパ後処理として実装した（cmd の動的変数を束ね項目へ寄せる前例に倣う方法）。コード内の A_* 名（照合は大文字小文字不区別）が、A_Index は個別項目へ、それ以外の実装済み110件は束ね項目へ、使用中チップとして解決される。機械検証では実装済み111件全件の解決と、未対応21件・未知の名前（A_Banana）が解決されないことを確認した（テスト `tests/muse-fix-ref-ahk.test.js` は代表名＋未対応21件全件を固定している）。

一次情報の根拠：AutoHotkey v2 公式「Variables and Expressions」の Built-in Variables 一覧（正本） https://www.autohotkey.com/docs/v2/Variables.htm 。A_Index は同ページ Loop 節で「最初の実行で1、2回目で2、…、ループ外では0、最内ループ優先」と定義される。

### 個別項目（1件）

| 名前 | 区分 | 値の性質 |
|---|---|---|
| A_Index | 個別項目 | ループの繰り返し回数（実行時に決まる値。ループ外では0） |

### 束ね項目「A_*（組み込み変数）」— 固定値（2件）

A_Space（空白1文字）、A_Tab（タブ1文字）

### 束ね項目「A_*（組み込み変数）」— 実行時に決まる値（108件、全名）

A_AhkPath、A_AhkVersion、A_AllowMainWindow、A_AppData、A_AppDataCommon、A_Args、A_Clipboard、A_ComSpec、A_ComputerName、A_ControlDelay、A_CoordModeCaret、A_CoordModeMenu、A_CoordModeMouse、A_CoordModePixel、A_CoordModeToolTip、A_Cursor、A_DD、A_DDD、A_DDDD、A_DefaultMouseSpeed、A_Desktop、A_DesktopCommon、A_DetectHiddenText、A_DetectHiddenWindows、A_EndChar、A_EventInfo、A_FileEncoding、A_HotkeyInterval、A_HotkeyModifierTimeout、A_Hour、A_IconFile、A_IconHidden、A_IconNumber、A_IconTip、A_InitialWorkingDir、A_Is64bitOS、A_IsAdmin、A_IsCompiled、A_IsCritical、A_IsPaused、A_IsSuspended、A_KeyDelay、A_KeyDelayPlay、A_KeyDuration、A_KeyDurationPlay、A_Language、A_LastError、A_LineFile、A_LineNumber、A_ListLines、A_MDay、A_MM、A_MMM、A_MMMM、A_MSec、A_MaxHotkeysPerInterval、A_MenuMaskKey、A_Min、A_Mon、A_MouseDelay、A_MouseDelayPlay、A_MyDocuments、A_Now、A_NowUTC、A_OSVersion、A_PriorHotkey、A_PriorKey、A_ProgramFiles、A_Programs、A_ProgramsCommon、A_PtrSize、A_RegView、A_ScreenDPI、A_ScreenHeight、A_ScreenWidth、A_ScriptDir、A_ScriptFullPath、A_ScriptHwnd、A_ScriptName、A_Sec、A_SendLevel、A_SendMode、A_StartMenu、A_StartMenuCommon、A_Startup、A_StartupCommon、A_StoreCapsLockMode、A_Temp、A_ThisHotkey、A_TickCount、A_TimeIdle、A_TimeIdleKeyboard、A_TimeIdleMouse、A_TimeIdlePhysical、A_TimeSincePriorHotkey、A_TimeSinceThisHotkey、A_TitleMatchMode、A_TitleMatchModeSpeed、A_TrayMenu、A_UserName、A_WDay、A_WinDelay、A_WinDir、A_WorkingDir、A_YDay、A_YWeek、A_YYYY、A_Year

（全108名はエンジンの `AHK_BUILTIN_RUNTIME` 集合と機械照合済み。モデルではいずれも値を捏造せず「実行時に決まる値」として扱う。）

### 解決対象に含めないもの（21件、漏れではない）

`AHK_BUILTIN_UNSUPPORTED` の21件は、読み取り時に名前を挙げて未対応で停止する実装であり、報告書でも漏れに数えられていない。scan でも解決対象に含めない：A_LoopField、A_LoopFileName、A_LoopFileExt、A_LoopFileDir、A_LoopFileFullPath、A_LoopFileShortPath、A_LoopFileShortName、A_LoopFileTimeModified、A_LoopFileTimeCreated、A_LoopFileTimeAccessed、A_LoopFileAttrib、A_LoopFileSize、A_LoopFileSizeKB、A_LoopFileSizeMB、A_LoopReadLine、A_LoopRegName、A_LoopRegType、A_LoopRegKey、A_LoopRegSubKey、A_LoopRegTimeModified、A_ThisFunc。

## 裁定の内訳

- 第1層118名 → 新規9項目で全件処置：個別8件（IsSet、IsSetRef、for、break、continue、return、Length、A_Index）＋束ね1件（A_*（組み込み変数）で110件：固定値2件＋実行時に決まる値108件）。
- 第2層1件（Loop の Until 節）→ 既存 Loop 項目の syntax・本文へ追記（変更1件）。
- 新規項目の使用例はすべて参照・実行できる形（A_* は参照形、return はホットキー本体の早期終了形）とし、`node --test tests/audit.test.js` の runnable reference で自種分エラーなしを確認した。
- ahk-r2.json は追加・変更の全10項目分を収録。


---

## リファレンス完全性修正 R22：C／C++／C#（C系）裁定記録

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


---

## リファレンス完全性修正：R／JavaScript／Power Apps／Power Automate／UI.Vision 担当分（misc）

- 対象リスト：`reference-completeness-round22.md` の R／JavaScript／Power Apps／Power Automate／UI.Vision 各節（§5 の R／Power Apps 分を含む）
- 処置方針：項目追加を基本とし、追加・変更した全項目の使用例は `node --test tests/audit.test.js` の自種分（audit runnable reference）でエラーなしを確認済み。追加後の総数：R 44件／JavaScript 39件／Power Apps 28件／Power Automate 15件／UI.Vision 22件。
- フラグメント：`misc-r2.json`（58行＝追加45件＋変更13件。ビルド後の定義オブジェクトから node スクリプトで抽出）

## 名前解決の検証方法と凡例

各追加名について、(1) `scan(code)`（コード中の使用名検出）と (2) 実行トレースの `refs`（アプリ側 `resolveReferenceName` による解決を含む）の2経路で、対象名を含む最小コードを実行して実測した。

- 「scan可」＝識別子トークンとして名前が一致し、scan が項目名を返す。
- 「trace可」＝実行トレースの refs が（接頭辞除去の解決後に）項目名へ解決される。
- 演算子・添字・リテラル形状の名前は、トークナイザが識別子として扱わず（演算子トークン）、AST の二項／添字／メンバノードも refs を持たないため、現行の仕組みではどちらの経路でも解決できない。これはエンジン側の仕組みの制約であり、本修正の範囲（エンジン挙動を変更しない）では項目側で解消できない。該当名は各表の「解決」欄に「不可（仕組み制約）」と明記した。

## R（第1層12件・第2層9件・§5 5件）

### 第1層（12件すべて個別項目を追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| rnorm | 項目追加 | 専用分岐が未確定値を返す実装あり（readline と同列）。値は作らず未確定値である旨を本文に明記。R 公式 stats「Normal」 | scan可／trace可 |
| runif | 項目追加 | 同上。R 公式 stats「Uniform」 | scan可／trace可 |
| sample | 項目追加 | 専用分岐が未確定値を返す実装あり。項目には「抽出結果は未確定値で、どの要素が選ばれたかは示さない」と正直に記載。R 公式 base「sample」 | scan可／trace可 |
| `%in%` | 項目追加 | RG-14 の専用実装（全体照合・NA同士一致・結果にNAなし）。R 公式 base「match」 | 不可（仕組み制約：演算子トークン） |
| `$` | 項目追加（列参照・代入の両方を記載） | 読み（存在しない列はNULL）・書き（列の追加・置換）の実装あり、テンプレートの中心操作。R 公式 base「Extract」 | 不可（仕組み制約：メンバノードは列名を refs に持ち、$ 自体は現れない） |
| `[` | 項目追加（単独添字） | subset 実装（正負・論理・文字列添字）。R 公式 base「Extract」 | 不可（仕組み制約：添字ノードは refs を持たない） |
| `[[` | 項目追加（二重添字） | ベクトルの単一要素・データフレームの列取り出しの実装あり。R 公式 base「Extract」 | 不可（仕組み制約：同上） |
| NA | 項目追加 | var 読みの専用処理あり。R 公式 base「NA」 | scan可（trace は定数読みのため refs なし） |
| NULL | 項目追加 | 定数表＋長さ0の意味論（RG-03）。R 公式 base「NULL」 | scan可（同上） |
| break | 項目追加 | 共有パーサ・実行の実装あり。R 公式 base「Control」 | scan可／trace可 |
| next | 項目追加 | R 方言でのみ受理される実装あり。R 公式 base「Control」 | scan可／trace可 |
| repeat | 項目追加 | R 方言でのみ受理される実装あり。R 公式 base「Control」 | scan可／trace可 |

### 第2層（9件すべて個別項目を追加）

束ねる場合は名前解決できることが条件とされたため、識別子として解決できる定数6件は全件を個別項目にした。演算子3件は仕組み上どのみち解決できないが、検索・学習の単位として個別項目にした。

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| `:` | 項目追加 | コロン演算子の専用分岐あり、テンプレートでも多用。R 公式 base「Colon」 | 不可（仕組み制約：演算子トークン） |
| `%%` | 項目追加 | 剰余の実装あり。R 公式 base「Arithmetic」 | 不可（仕組み制約：同上） |
| `%/%` | 項目追加 | 整数除算の実装あり。R 公式 base「Arithmetic」 | 不可（仕組み制約：同上） |
| NaN | 項目追加（個別） | var 読みの専用処理あり。R 公式 base「is.finite」（NaN／Inf のヘルプ） | scan可 |
| Inf | 項目追加（個別） | var 読みの専用処理あり。同上 | scan可 |
| TRUE | 項目追加（個別） | 定数表あり。R 公式 base「logical」 | scan可 |
| FALSE | 項目追加（個別） | 定数表あり。同上 | scan可 |
| T | 項目追加（個別） | TRUE の別名として定数表あり。再定義可能な点を注意書きに明記。同上 | scan可 |
| F | 項目追加（個別） | FALSE の別名として定数表あり。再定義可能な点を注意書きに明記。同上 | scan可 |

### §5（5件すべて項目への追記で処置）

| 対象 | 裁定 | 内容 |
|---|---|---|
| mean の trim 引数 | 項目を修正 | 書式を `mean(x, trim = 0, na.rm = FALSE)` にし、trim（両端の切り取り割合、0.5以上で中央値）を本文に追記。実装（named.trim の処理）と R 公式 base「mean」に一致 |
| names の適用範囲 | 項目を修正 | 書式を `names(x)` に改め、データフレームの列名だけでなく名前付きベクトルの要素名にも働く旨を明記。使用例も名前付きベクトルに変更。実装（namesOf 経由）と R 公式 base「names」に一致 |
| length のデータフレーム時の値 | 項目を修正 | 「データフレームでは列数を返す（行数は nrow）」を追記。実装（data.frame では列数を返す分岐）と R 公式 base「length」に一致 |
| if の式形式 | 項目を修正 | 書式に `値 <- if (条件) 式 else 式` を追加し、値を返す式として使える旨（else なし・不成立なら NULL）を本文に追記。実装（ifexpr）と R 公式 base「Control」に一致 |
| データフレームへの要素演算（RG-70） | **data.frame 項目への追記**で処置（独立項目にしない） | 独立項目化しない理由：RG-70 は「データフレームへの二項演算」という振る舞いであり、対応する固有の名前（関数名・キーワード）が存在しない。演算子側の項目（`%%` 等）からも到達できないため、学習者が探す先は data.frame 項目が自然であり、そこへ「四則演算・比較は列ごとの要素演算」と追記した。実装（binary の RG-70 分岐）と一致 |

## JavaScript（第1層7件・第2層8件）

### 第1層（7件すべて項目を追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| join | 項目追加 | push／pop と同列の配列メソッド実装あり。MDN「Array.prototype.join」 | scan可／trace可（呼び出し名 `values.join` が接頭辞除去で join に解決） |
| typeof | 項目追加 | パーサ・評価に専用実装（未宣言名・TDZ 含む）。MDN「typeof」 | scan可（trace は単項演算のため refs なし） |
| while | 項目追加（do-while も同項目でカバー） | 実装あり、refs は両形式とも `while` を共有。書式・本文に do-while を併記。MDN「while」 | scan可／trace可 |
| break | 項目追加 | パーサ・実行の実装あり。MDN「break」 | scan可／trace可 |
| continue | 項目追加 | 同上。MDN「continue」 | scan可／trace可 |
| BigInt | 項目追加 | リテラルと BigInt 同士の演算の実装あり。本文・注意書きに「`BigInt(...)` コンストラクタ呼び出しは未実装」と明記。MDN「BigInt」 | 不可（仕組み制約：リテラル `123n` には識別子トークンが現れず、項目名 BigInt と照合する対象がない） |
| オブジェクトリテラル | 項目追加（名前は「オブジェクトリテラル」） | 宣言初期化を含むリテラルの実装あり。MDN「Object」 | 不可（仕組み制約：リテラル構文には名前トークンがない） |

### 第2層（8件：7件追加＋1件は意図的除外として宣言化）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| length | **項目化せず「意図的除外として宣言化」** | `tests/muse-fix-core.test.js` が「length は refs に含めない」ことを明示的に検証しており、意図的除外の可能性が高い。項目化すると refs 除外の設計と矛盾するため、宣言による明示に留める。下記「宣言文案」をコーディネーターが宣言側（DEVELOPMENT.md 等）へ反映すること | —（除外が裁定） |
| id | 項目追加 | モデル DOM プロパティ。textContent／value の既存項目の体裁に倣った。MDN「Element.id」 | scan可／trace可（メンバ語彙として pendingRefs に載る） |
| tagName | 項目追加 | 同上。MDN「Element.tagName」 | scan可／trace可 |
| children | 項目追加 | 同上。MDN「Element.children」 | scan可／trace可 |
| document.body | 項目追加 | モデル DOM の body（createElement の結果の追加先）。MDN「Document.body」 | scan可（trace はメンバ名 body 単体では項目名と一致しない） |
| undefined | 項目追加 | 名前解決で専用に値を返す実装あり。MDN「undefined」 | scan可 |
| NaN | 項目追加 | 同上。MDN「NaN」 | scan可 |
| Infinity | 項目追加 | 同上。MDN「Infinity」 | scan可 |

#### length の宣言文案（コーディネーター反映用）

> JavaScript の `length`（配列・文字列のプロパティ）は意図的除外とする：使用中チップの refs には含めないことをテストで明示検証している設計判断（`tests/muse-fix-core.test.js`）に基づき、リファレンス項目は設けない。プロパティ自体の読み取りはモデルで対応している。

## Power Apps（第1層4件・第2層2件・§5 6区分8項目）

### 第1層（4件すべて項目を追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| And | 項目追加（関数形） | arity 定義と case 実装あり（RG-50）。Microsoft Learn Power Fx「And, Or, Not functions（function-logicals）」 | scan可／trace可 |
| Or | 項目追加（関数形） | 同上 | scan可／trace可 |
| Not | 項目追加（関数形） | 同上 | scan可／trace可 |
| ThisRecord | 項目追加 | レコードスコープ内でのみ解決し、外では名指しで停止する実装あり。Microsoft Learn Power Fx「Operators（ThisRecord）」 | scan可（trace は識別子読みのため refs なし） |

### 第2層（2件を1項目に束ねて追加）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| in／exactin | 項目「in（演算子）」を追加し両形式をカバー | binary 処理として実装あり（文字列の部分文字列判定・テーブルの包含、in は大小不区別／exactin は区別）。同一演算子ファミリであり、書式欄に両形式を併記した。Microsoft Learn Power Fx「Operators（in and exactin）」 | 不可（仕組み制約：項目名に「（演算子）」を含むため識別子トークンと一致せず、二項ノードも refs を持たない） |

### §5（書式変更提案の処置：8項目を実装どおりに更新。変更行はすべて misc-r2.json に含む）

| 項目 | 裁定 | 内容（実装との照合結果） |
|---|---|---|
| Text | 書式・本文・注意書きを更新 | 書式を `Text(Value [, Format [, ResultLanguageTag]])` に更新。使用例も書式付き `Text(Count, "#,##0")` に変更。モデルの対応範囲（数値書式のみ・言語タグは en-US のみ・日付書式は未対応）を注意書きに明記。実装（fxFormatNumber、tag は en-US のみ受理）と Microsoft Learn「Text function」に一致 |
| LookUp | 書式・本文・使用例を更新 | 第3引数（削減式）を書式 `LookUp(Table, Condition [, ReductionFormula])` に追記し、本文と使用例（`Value * 10`）に反映。実装（RG-18 の削減式評価）と一致 |
| If | 書式・本文を更新 | 固定引数形 `If(Condition, Then, Else)` を可変長 `If(Condition1, Then1 [, Condition2, Then2, ...] [, Else])` に更新。実装（lowerBehavior の可変長処理、arity [2, ∞)）と一致 |
| Switch | 書式・本文を更新 | 可変長 `Switch(Value, Match1, Result1 [, Match2, Result2, ...] [, Default])` に更新。実装（arity [3, ∞)）と一致 |
| Collect | 書式・本文を更新 | `Collect(Collection, Record1 [, Record2, ...])` とし、複数レコード・テーブルの一括追加を明記。実装（arity [2, ∞)、各引数を展開して追加）と一致 |
| ClearCollect | 書式・本文を更新 | `ClearCollect(Collection, RecordOrTable1 [, RecordOrTable2, ...])` とし、Collect と同様の複数指定を明記。実装と一致 |
| Sequence | 書式・本文を是正 | 書式を `Sequence(Records [, Start [, Step]])` に改め、Start／Step の省略可と既定値（各1）を明記。項目自身の使用例 `Sequence(3)` との食い違いを解消。実装（省略時は 1）と一致 |
| Navigate | 文面を実装に合わせて制限を明記 | 実装は第1引数のみ（arity [1, 1]）で、第2・第3引数を渡すと引数個数エラーで停止する。その旨を注意書きに明記し、書式は `Navigate(Screen)` のまま（実装より広げない）。Microsoft Learn の実関数は第2・第3引数を持つが、本モデルの制限として明示した |

## Power Automate（第1層1件）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| Else if | 項目追加 | classify で `"Else if": "elseif"` に分類され、`actionProgram` が分岐を構築・実行する。If／Else／End の体裁（reference-details の description／returns／source）に倣った。パレット外のアクションのため、パレットには加えずリファレンスへ直接追加した（UI.Vision の Number と同じ「参照専用の追加」方式）。Microsoft Learn「Conditionals（Else if）」 | scan可／trace可（アクション名が refs になる） |

## UI.Vision（第1層1件・第2層3件）

| 名前 | 裁定 | 理由・一次情報の根拠 | 解決 |
|---|---|---|---|
| String | 項目追加（第1層） | Sandbox 式の関数として Number と並べて実装あり（式で使える関数はこの2件のみ、他は未対応で停止）。Number 項目の体裁・方針コメント（RG-59「コマンドではないが式の語彙として載せる」）に倣った。一次情報は JavaScript の String（MDN） | trace可（式内の呼び出し名として refs に載る。scan はコマンド名のみ対象のため対象外＝Number と同じ扱い） |
| ${!times} | 項目追加（第2層） | times ループ内で1始まりのカウンタとして提供される組み込み変数（実装で counterName として設定）。Number を式の語彙として載せた前例と同方針。UI.Vision 公式「times」 | 不可（仕組み制約：変数名は scan（コマンド名のみ）・trace refs のどちらの対象でもない） |
| !statusOK | 項目追加（第2層） | 各コマンド実行後に成功可否が設定される組み込み変数（初期化・実行後更新の実装あり）。同方針。UI.Vision 公式ドキュメント | 不可（仕組み制約：同上） |
| !errorIgnore | 項目追加（第2層） | 文字列 "true" のときエラーを継続扱いにする組み込み変数（実装あり）。同方針。UI.Vision 公式ドキュメント | 不可（仕組み制約：同上） |

## 申し送り

- 総リファレンス件数が 511 から増えるため、件数を固定している既存テスト（`tests/muse-fix-r22-ui.test.js` の total=511 検証）や台帳・DEVELOPMENT.md の件数表記はコーディネーター側で更新が必要。
- JavaScript `length` の宣言文案（上記）は未反映。宣言側への反映はコーディネーターが行う。
- 名前解決が「不可（仕組み制約）」の項目は、項目自体はリファレンス一覧から参照できるが、使用中チップには現れない。解消にはエンジン側（scan／refs の仕組み）の変更が必要で、本修正の範囲外。


---

## リファレンス完全性修正 R22 — cmd／PowerShell 裁定記録

- 対象報告書：`reference-completeness-round22.md` の cmd 節・PowerShell 節（§5 の cmd／PowerShell 分を含む）
- 変更ファイル：`js/types/cmd/index.js`、`js/types/powershell/index.js`、新規テスト `tests/muse-fix-ref-shell.test.js`
- 抽出成果物：`docs/audit/ref-r22/shell-r6.json`（38行＝cmd 11行＋PowerShell 27行。ビルド後の定義オブジェクトから node スクリプトで抽出）
- 追加後のリファレンス総数：cmd 28件（従前26件＋新規2件）、PowerShell 45件（従前37件＋新規8件）
- 検証：`node --test tests/audit.test.js` 全673件合格（新規項目の使用例を含む自種分エラーなし）、`node --test tests/muse-fix-ref-shell.test.js` 3件合格

## cmd

| 対象 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| `set /p`（第1層） | 独立項目を追加 | `set /a` が独立項目である前例に倣う。scan も `set /p` を当該項目へ寄せるよう拡張し、テンプレート cmd-input の refs にも追加 | Microsoft Learn「set」コマンド（/p の書式・Enter のみの入力では変数が変わらない仕様） https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/set_1 |
| 動的変数5件 `%ERRORLEVEL%`・`%CD%`・`%RANDOM%`・`%DATE%`・`%TIME%`（第1層） | 1項目「動的変数」に束ねて追加。各名を項目名相当の構文行と本文に明記 | エンジン `dynamicValue` の実装どおり、%RANDOM%／%DATE%／%TIME% は実行時に決まる値、%ERRORLEVEL%／%CD% は同名環境変数が優先される規則を本文に明記。scan が5名いずれの出現でも「動的変数」へ到達することをテストで確認。あわせて既存「変数展開」項目の本文にも動的変数への言及を追記 | Microsoft Learn「cmd」コマンド（動的環境変数の一覧と、同名環境変数を定義すると動的値が隠れる仕様） https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd |
| `%0`（第2層） | `call` 項目の本文に追記 | %0 はバッチファイル自身の名前。モデルでは実行時に決まる値として扱う旨（semantics の宣言と一致）を明記 | Microsoft Learn「call」コマンド https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/call |
| `if` 演算子列挙（§5） | `if` 項目の本文に追記 | 実装が処理する ==・EQU・NEQ・LSS・LEQ・GTR・GEQ・exist・defined・errorlevel・not・/I を全て列挙 | Microsoft Learn「if」コマンド https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/if |
| `setlocal` の DisableDelayedExpansion（§5） | `setlocal` 項目の構文行に追記 | 実装（engine の setlocal 処理）が受理する形式を構文行へ反映 | Microsoft Learn「setlocal」コマンド https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setlocal |
| 別名5種（到達可能性） | 正名項目の本文に別名を追記 | chdir→`cd` 項目、mkdir→`md` 項目、rmdir→`rd` 項目、erase→`del` 項目、rename→`ren` 項目。scan は従前から別名を正名へ寄せるため、本文追記で検索到達性も改善 | Microsoft Learn 各コマンドページ（cd／md／rd／del／ren。いずれも別名が公式に併記される） https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cd |

## PowerShell

| 対象 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| 自動変数 `$_` | 個別項目を追加 | パイプラインの現在項目。$PSItem と同値である旨を明記 | Microsoft Learn about_Automatic_Variables https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-7.4 |
| 自動変数 `$PSItem` | 個別項目を追加 | $_ と同値である旨を明記 | 同上 |
| 自動変数 `$?` | 個別項目を追加 | 直前のコマンド／パイプラインの成否を保持 | 同上 |
| 自動変数 `$LASTEXITCODE` | 個別項目を追加 | モデルでは外部プログラムを実行しないため、明示した初期値のみ保持する旨を明記（DEVELOPMENT.md の宣言と一致） | 同上 |
| 自動変数 `$args` | 個別項目を追加 | 関数の余分な引数を保持（engine が `args` へ格納する実装に対応） | 同上 |
| 型変換（キャスト）5型 `[string]`・`[bool]`／`[boolean]`・`[int]`／`[int32]`・`[double]`・`[pscustomobject]`（第1層） | 1項目「型変換（キャスト）」に束ねて追加。各型名（別表記を含む全7表記）を構文・本文に明記 | parser の cast 解析と engine の変換処理に対応。テンプレート ps-transform が使う [pscustomobject] も含む | Microsoft Learn about_Type_Operators https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_type_operators?view=powershell-7.4 |
| 論理演算子4形 `-and`・`-or`・`-not`・`!`（第1層） | 独立項目「論理演算子」を追加 | 既存の唯一の演算子項目「比較演算子」は比較のみで論理を含まないため分離 | Microsoft Learn about_Logical_Operators https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_logical_operators?view=powershell-7.4 |
| 算術・代入演算子11形 `+`・`-`・`*`・`/`・`%`・`+=`・`-=`・`*=`・`/=`・`++`・`--`（第2層） | 1項目「算術・代入演算子」に束ねて追加。全11形を構文行に明記 | parser／engine の実装に対応。++／-- はモデル対応範囲として後置形式である旨を本文に明記 | Microsoft Learn about_Arithmetic_Operators／about_Assignment_Operators https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_arithmetic_operators?view=powershell-7.4 |
| 定数 `$true`・`$false`（第2層） | `変数` 項目の本文に `$null` と並べて追記 | 自動変数として about_Automatic_Variables に定義される定数であり、変数の項目で $null と並記するのが学習者の到達経路として自然なため | Microsoft Learn about_Automatic_Variables／about_Variables https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_variables?view=powershell-7.4 |
| コマンドレットの追加パラメーター（§5） | 各項目の本文に「実装されている追加パラメーター」を追記 | engine の known パラメーター表に基づく：Get-ChildItem=-Recurse／-File／-Directory、Select-Object=-ExpandProperty／-Last／-Skip、Write-Host=-Separator、Set-Content／Add-Content=-NoNewline、Measure-Object=-Average／-Maximum／-Minimum、New-Item=-Force／-Value、Remove-Item=-Force、Copy-Item=-Force、Move-Item=-Force | Microsoft Learn 各コマンドレットページ（Get-ChildItem 等） https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem?view=powershell-7.4 |
| 別名23種（到達可能性） | 正名項目の本文に別名を追記（全名列挙は下記） | engine の alias 表の全23種を、正名項目の本文へ漏れなく記載。テストで全名の出現を機械確認 | Microsoft Learn about_Aliases／各コマンドレットページ https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_aliases?view=powershell-7.4 |

### PowerShell 別名23種と追記先（全名列挙）

| 別名 | 正名（追記先項目） |
|---|---|
| echo | Write-Output |
| gci | Get-ChildItem |
| ls | Get-ChildItem |
| dir | Get-ChildItem |
| where | Where-Object |
| ? | Where-Object |
| foreach | ForEach-Object |
| % | ForEach-Object |
| select | Select-Object |
| sort | Sort-Object |
| measure | Measure-Object |
| cd | Set-Location |
| pwd | Get-Location |
| cat | Get-Content |
| gc | Get-Content |
| sc | Set-Content |
| ac | Add-Content |
| ni | New-Item |
| ri | Remove-Item |
| rm | Remove-Item |
| ren | Rename-Item |
| cp | Copy-Item |
| mv | Move-Item |

## 裁定の内訳

- cmd：第1層6件（set /p 1件＋動的変数5件）→ 新規2項目で処置。第2層1件（%0）→ 本文追記。§5 2件（if 演算子列挙、setlocal 構文）→ 追記。別名5種 → 本文追記。
- PowerShell：第1層14名（自動変数5件＋キャスト5型＋論理演算子4形）→ 新規8項目で処置。第2層13件（算術・代入11形＋定数2件）→ 新規1項目（算術・代入演算子。上の新規8項目に含む）＋本文追記で処置。§5 1群（追加パラメーター）→ 対象10項目の本文へ追記。別名23種 → 本文追記。
- 新規項目の合計：cmd 2件＋PowerShell 8件＝10件。本文・構文を変更した既存項目：cmd 9件＋PowerShell 19件＝28件。shell-r6.json は新規・変更の全38項目分を収録。
