# リファレンス完全性修正 R22 — Excel VBA 担当台帳

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
