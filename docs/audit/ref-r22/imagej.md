# リファレンス完全性修正 R22 — ImageJ 担当記録

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
