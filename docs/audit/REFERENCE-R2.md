# 全441リファレンスの一次資料照合（第2ラウンド）

対象はアプリに表示する説明・戻り値・注意点。全件の項目名・照合後の文面・例・出典・文面ハッシュは[reference-r2.json](reference-r2.json)に固定した。全441件をレビュー対象とし、CloudFormation内のPython42件は同じPython資料に照合した結果を再利用する。重複した資料・同じ前提を独立監査の数へ水増ししない。

一次資料はMicrosoft Learnの原本リポジトリ、ImageJ公式マニュアルと公式Java実装、AWS現行公式Web、AutoHotkey v2公式Docs、UI.Vision公式コマンド資料、Power Fx公式原本、CPython 3.12公式Docs、Rソース所収マニュアル、N1570、C++標準ドラフト/cppreference、C#公式Docs、MDN原本とECMA/DOM仕様。RのGitHub取得先はwch/r-sourceミラーと明記する。新規取得174ファイル（重複URLを含む）のURL・SHAは[primary-sources-r2.json](primary-sources-r2.json)。Webのみで確認したAWS/UI.Vision/C規格/cppreference等は各項目の出典と下記補足を参照する。単なるURL存在確認・名前の一致・使用例の実行を、説明の全件照合の代わりにはしていない。

「照合済」は、掲載した説明と注意点が対象仕様と矛盾しないかを点検した判定。未掲載の全引数・全バージョン・全APIまで実装したという意味ではない。シミュレータ固有の制限は公式仕様ではなく、このアプリの実装・試験と照合した。空の注意点は「注意すべき事項が世の中にない」という意味ではない。参照専用61件を対応済みへ変更していない。

## 照合で修正した事項

- 全種類の戻り値の説明と出典を揃えた。ImageJが保持していたretとPythonのreturnsを実際の画面にも表示する。
- ImageJのsetColorは画像の描画色で、システム全体の前景色を変更しない。setForegroundColor、ROI内changeValues、replaceの正規表現条件を訂正。newImageの既定値は古い文章の一律whiteより公式IJ.createImage実装（8/RGBは白、16/32は黒）を優先した。Roi/Colorの新しい項目は公式Functions.javaも併用した。
- PythonとCloudFormationに残った移植元の標準入力欄・Pyodide同梱版の説明を撤去。openのencodingの既定値はロケール・UTF-8モードに依存すると訂正。
- AutoHotkey SetTitleMatchModeは変更前の設定を返す。実装・戻り値の説明を修正。
- UI.Visionの汎用文をコマンドごとの作用へ置換。storeText/storeValueは不一致で#LNFを保存し継続。入力要素のstoreTextは空文字列。公式[storeText](https://ui.vision/rpa/docs/selenium-ide/storetext)、[storeValue](https://ui.vision/rpa/docs/selenium-ide/storevalue)で確認。
- Power Apps Filterに委任と既定500／最大2,000件の取得制限を追加。データソースや式に依存する制約と、ローカルモデルを区別。
- R meanは非数値ならNA＋警告。as.numericの変換警告、trimを再検証。
- C/C++の使用例はヘッダー・main・名前空間を含めた。printfの%%と文字出力の型検査も修正。C#の使用例も完全なconsole programにする。
- AWSの[トップレベルオブジェクト形式](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-include.html)と、[カスタムLambda eventのparams](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html)は別規定。オブジェクト構文は受理するが、カスタムマクロのトップレベルparamsは空。組込みAWS::Includeの処理は未対応。

N1570では6.4.4.4（Cの文字定数の型）、6.5.3.4（sizeofと非評価）、6.7.9（文字配列の初期化）、7.21.6.1（書式出力）を照合。Cのchar a[3]="abc"とC++の終端領域必須を混同しない。モデルABIの固定値を、すべての実装で共通の値とは説明しない。

## 個票

各行の3欄は説明／戻り値／注意点の点検結果。完全なレビュー対象文面はJSON個票にあり、ここは追跡用の索引。

| # | 種類 | 項目 | 説明 | 戻り値 | 注意点 | 一次資料 |
| ---: | --- | --- | --- | --- | --- | --- |

| 1 | vba | Dim | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/dim-statement.md) |
| 2 | vba | Long | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/long-data-type.md) |
| 3 | vba | Integer | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/integer-data-type.md) |
| 4 | vba | Variant | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/variant-data-type.md) |
| 5 | vba | String | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/string-data-type.md) |
| 6 | vba | Boolean | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/boolean-data-type.md) |
| 7 | vba | Double | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/double-data-type.md) |
| 8 | vba | Range | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range(object).md) |
| 9 | vba | Cells | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Application.Cells.md) |
| 10 | vba | Value | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range.Value.md) |
| 11 | vba | Value2 | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range.Value2.md) |
| 12 | vba | Row | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range.Row.md) |
| 13 | vba | Column | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range.Column.md) |
| 14 | vba | Count | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range.Count.md) |
| 15 | vba | Set | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/set-statement.md) |
| 16 | vba | Worksheet | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Worksheet.md) |
| 17 | vba | Worksheets | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Worksheets.md) |
| 18 | vba | Workbook | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Workbook.md) |
| 19 | vba | Workbooks | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Workbooks.md) |
| 20 | vba | ThisWorkbook | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Application.ThisWorkbook.md) |
| 21 | vba | ActiveWorkbook | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Application.ActiveWorkbook.md) |
| 22 | vba | Offset | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range.Offset.md) |
| 23 | vba | ClearContents | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/api/Excel.Range.ClearContents.md) |
| 24 | vba | If | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/ifthenelse-statement.md) |
| 25 | vba | Select Case | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/select-case-statement.md) |
| 26 | vba | For | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/fornext-statement.md) |
| 27 | vba | Next | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/fornext-statement.md) |
| 28 | vba | For Each | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/for-eachnext-statement.md) |
| 29 | vba | Do | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/doloop-statement.md) |
| 30 | vba | Exit For | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/exit-statement.md) |
| 31 | vba | Exit Do | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/exit-statement.md) |
| 32 | vba | Exit Sub | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/exit-statement.md) |
| 33 | vba | Sub | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/sub-statement.md) |
| 34 | vba | Debug.Print | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/print-method.md) |
| 35 | vba | MsgBox | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/msgbox-function.md) |
| 36 | vba | InputBox | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/inputbox-function.md) |
| 37 | vba | On Error | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/on-error-statement.md) |
| 38 | vba | Err.Number | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/number-property-visual-basic-for-applications.md) |
| 39 | vba | Option Explicit | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/option-explicit-statement.md) |
| 40 | vba | Option Base | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/option-base-statement.md) |
| 41 | vba | Array | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/array-function.md) |
| 42 | vba | LBound | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/lbound-function.md) |
| 43 | vba | UBound | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/ubound-function.md) |
| 44 | vba | Len | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/len-function.md) |
| 45 | vba | Left | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/left-function.md) |
| 46 | vba | Right | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/right-function.md) |
| 47 | vba | Mid | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/mid-function.md) |
| 48 | vba | Trim | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/ltrim-rtrim-and-trim-functions.md) |
| 49 | vba | UCase | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/ucase-function.md) |
| 50 | vba | LCase | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/lcase-function.md) |
| 51 | vba | Replace | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/replace-function.md) |
| 52 | vba | InStr | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/instr-function.md) |
| 53 | vba | CStr | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Concepts/Getting-Started/type-conversion-functions.md) |
| 54 | vba | CInt | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Concepts/Getting-Started/type-conversion-functions.md) |
| 55 | vba | CLng | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Concepts/Getting-Started/type-conversion-functions.md) |
| 56 | vba | CDbl | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Concepts/Getting-Started/type-conversion-functions.md) |
| 57 | vba | Val | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/val-function.md) |
| 58 | vba | IsNumeric | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/isnumeric-function.md) |
| 59 | vba | IsEmpty | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/isempty-function.md) |
| 60 | vba | IsNull | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/isnull-function.md) |
| 61 | vba | Abs | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/abs-function.md) |
| 62 | vba | Int | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/int-fix-functions.md) |
| 63 | vba | Fix | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/int-fix-functions.md) |
| 64 | vba | Round | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/round-function.md) |
| 65 | vba | Date | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/date-function.md) |
| 66 | vba | Now | 照合済 | 照合済 | 照合済 | [資料](https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/now-function.md) |
| 67 | imagej | getPixel | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getPixel) |
| 68 | imagej | getValue | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getValue) |
| 69 | imagej | setPixel | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setPixel) |
| 70 | imagej | setColor | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setColor) |
| 71 | imagej | drawLine | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#drawLine) |
| 72 | imagej | getWidth | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getWidth) |
| 73 | imagej | getHeight | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getHeight) |
| 74 | imagej | bitDepth | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#bitDepth) |
| 75 | imagej | getTitle | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getTitle) |
| 76 | imagej | getInfo | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getInfo) |
| 77 | imagej | getImageID | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getImageID) |
| 78 | imagej | selectImage | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#selectImage) |
| 79 | imagej | selectWindow | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#selectWindow) |
| 80 | imagej | newImage | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#newImage) |
| 81 | imagej | nImages | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#nImages) |
| 82 | imagej | getDimensions | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getDimensions) |
| 83 | imagej | getVoxelSize | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getVoxelSize) |
| 84 | imagej | getPixelSize | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getPixelSize) |
| 85 | imagej | getLut | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getLut) |
| 86 | imagej | getDateAndTime | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getDateAndTime) |
| 87 | imagej | getLocationAndSize | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getLocationAndSize) |
| 88 | imagej | getDisplayedArea | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getDisplayedArea) |
| 89 | imagej | setVoxelSize | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setVoxelSize) |
| 90 | imagej | changeValues | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#changeValues) |
| 91 | imagej | getMinAndMax | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getMinAndMax) |
| 92 | imagej | setMinAndMax | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setMinAndMax) |
| 93 | imagej | Color.getLut | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Color.getLut) |
| 94 | imagej | isOpen | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#isOpen) |
| 95 | imagej | makeRectangle | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#makeRectangle) |
| 96 | imagej | makeOval | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#makeOval) |
| 97 | imagej | makePolygon | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#makePolygon) |
| 98 | imagej | makeLine | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#makeLine) |
| 99 | imagej | makeSelection | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#makeSelection) |
| 100 | imagej | getSelectionBounds | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getSelectionBounds) |
| 101 | imagej | getSelectionCoordinates | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getSelectionCoordinates) |
| 102 | imagej | getLine | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getLine) |
| 103 | imagej | getCursorLoc | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getCursorLoc) |
| 104 | imagej | selectionType | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#selectionType) |
| 105 | imagej | roiManager | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#roiManager) |
| 106 | imagej | Roi.getBounds | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.getBounds) |
| 107 | imagej | Roi.getCoordinates | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.getCoordinates) |
| 108 | imagej | Roi.contains | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.contains) |
| 109 | imagej | Roi.move | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.move) |
| 110 | imagej | Roi.translate | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.translate) |
| 111 | imagej | Roi.setStrokeWidth | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.setStrokeWidth) |
| 112 | imagej | Roi.setStrokeColor | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.setStrokeColor) |
| 113 | imagej | Roi.setFillColor | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.setFillColor) |
| 114 | imagej | Roi.setName | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.setName) |
| 115 | imagej | Roi.getName | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.getName) |
| 116 | imagej | Roi.setPosition | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.setPosition) |
| 117 | imagej | Roi.getPosition | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.getPosition) |
| 118 | imagej | Roi.getProperty | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.getProperty) |
| 119 | imagej | Roi.setProperty | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Roi.setProperty) |
| 120 | imagej | RoiManager.select | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#RoiManager.select) |
| 121 | imagej | RoiManager.selectByName | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#RoiManager.selectByName) |
| 122 | imagej | RoiManager.getName | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#RoiManager.getName) |
| 123 | imagej | RoiManager.getIndex | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#RoiManager.getIndex) |
| 124 | imagej | RoiManager.delete | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#RoiManager.delete) |
| 125 | imagej | setForegroundColor | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setForegroundColor) |
| 126 | imagej | getStatistics | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getStatistics) |
| 127 | imagej | getRawStatistics | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getRawStatistics) |
| 128 | imagej | Stack.getStatistics | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Stack.getStatistics) |
| 129 | imagej | getHistogram | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getHistogram) |
| 130 | imagej | setThreshold | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setThreshold) |
| 131 | imagej | getThreshold | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getThreshold) |
| 132 | imagej | resetThreshold | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#resetThreshold) |
| 133 | imagej | setAutoThreshold | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setAutoThreshold) |
| 134 | imagej | getProfile | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getProfile) |
| 135 | imagej | getResult | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getResult) |
| 136 | imagej | getResultLabel | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getResultLabel) |
| 137 | imagej | nResults | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#nResults) |
| 138 | imagej | setResult | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setResult) |
| 139 | imagej | updateResults | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#updateResults) |
| 140 | imagej | getSliceNumber | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getSliceNumber) |
| 141 | imagej | setSlice | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setSlice) |
| 142 | imagej | nSlices | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#nSlices) |
| 143 | imagej | Stack.getDimensions | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Stack.getDimensions) |
| 144 | imagej | Stack.getPosition | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Stack.getPosition) |
| 145 | imagej | Stack.setPosition | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Stack.setPosition) |
| 146 | imagej | open | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#open) |
| 147 | imagej | saveAs | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#saveAs) |
| 148 | imagej | getFileList | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getFileList) |
| 149 | imagej | getDirectory | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getDirectory) |
| 150 | imagej | close | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#close) |
| 151 | imagej | getArgument | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getArgument) |
| 152 | imagej | File.open | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#File.open) |
| 153 | imagej | File.append | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#File.append) |
| 154 | imagej | File.exists | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#File.exists) |
| 155 | imagej | showMessage | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#showMessage) |
| 156 | imagej | showStatus | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#showStatus) |
| 157 | imagej | showProgress | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#showProgress) |
| 158 | imagej | waitForUser | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#waitForUser) |
| 159 | imagej | getNumber | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getNumber) |
| 160 | imagej | getString | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getString) |
| 161 | imagej | Dialog.create | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.create) |
| 162 | imagej | Dialog.addNumber | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.addNumber) |
| 163 | imagej | Dialog.addString | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.addString) |
| 164 | imagej | Dialog.addChoice | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.addChoice) |
| 165 | imagej | Dialog.show | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.show) |
| 166 | imagej | Dialog.getNumber | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.getNumber) |
| 167 | imagej | Dialog.getString | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.getString) |
| 168 | imagej | Dialog.getChoice | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Dialog.getChoice) |
| 169 | imagej | lengthOf | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#lengthOf) |
| 170 | imagej | substring | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#substring) |
| 171 | imagej | indexOf | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#indexOf) |
| 172 | imagej | startsWith | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#startsWith) |
| 173 | imagej | endsWith | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#endsWith) |
| 174 | imagej | replace | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#replace) |
| 175 | imagej | split | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#split) |
| 176 | imagej | d2s | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#d2s) |
| 177 | imagej | parseInt | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#parseInt) |
| 178 | imagej | parseFloat | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#parseFloat) |
| 179 | imagej | newArray | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#newArray) |
| 180 | imagej | Array.sort | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Array.sort) |
| 181 | imagej | Array.copy | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Array.copy) |
| 182 | imagej | Array.getStatistics | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Array.getStatistics) |
| 183 | imagej | abs | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#abs) |
| 184 | imagej | Math.min | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Math.min) |
| 185 | imagej | Math.max | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Math.max) |
| 186 | imagej | minOf | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#minOf) |
| 187 | imagej | maxOf | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#maxOf) |
| 188 | imagej | isNaN | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#isNaN) |
| 189 | imagej | pow | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#pow) |
| 190 | imagej | sqrt | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#sqrt) |
| 191 | imagej | exp | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#exp) |
| 192 | imagej | log | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#log) |
| 193 | imagej | atan2 | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#atan2) |
| 194 | imagej | round | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#round) |
| 195 | imagej | floor | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#floor) |
| 196 | imagej | Math.ceil | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#Math.ceil) |
| 197 | imagej | random | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#random) |
| 198 | imagej | run | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#run) |
| 199 | imagej | runMacro | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#runMacro) |
| 200 | imagej | eval | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#eval) |
| 201 | imagej | setBatchMode | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setBatchMode) |
| 202 | imagej | exit | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#exit) |
| 203 | imagej | print | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#print) |
| 204 | imagej | setOption | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#setOption) |
| 205 | imagej | call | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#call) |
| 206 | imagej | getVersion | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#getVersion) |
| 207 | imagej | requires | 照合済 | 照合済 | 照合済 | [資料](https://imagej.net/ij/developer/macro/functions2.html#requires) |
| 208 | cloudformation | Transform | 照合済 | 照合済 | 照合済 | [資料](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html) |
| 209 | cloudformation | Fn::Transform | 照合済 | 照合済 | 照合済 | [資料](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html) |
| 210 | cloudformation | fragment | 照合済 | 照合済 | 照合済 | [資料](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html) |
| 211 | cloudformation | params | 照合済 | 照合済 | 照合済 | [資料](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html) |
| 212 | cloudformation | requestId | 照合済 | 照合済 | 照合済 | [資料](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html) |
| 213 | cloudformation | status | 照合済 | 照合済 | 照合済 | [資料](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html) |
| 214 | cloudformation | templateParameterValues | 照合済 | 照合済 | 照合済 | [資料](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html) |
| 215 | cloudformation | print | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#print) |
| 216 | cloudformation | len | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#len) |
| 217 | cloudformation | sum | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#sum) |
| 218 | cloudformation | min | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#min) |
| 219 | cloudformation | max | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#max) |
| 220 | cloudformation | range | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#range) |
| 221 | cloudformation | enumerate | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#enumerate) |
| 222 | cloudformation | zip | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#zip) |
| 223 | cloudformation | sorted | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#sorted) |
| 224 | cloudformation | type | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#type) |
| 225 | cloudformation | int | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#int) |
| 226 | cloudformation | str | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str) |
| 227 | cloudformation | list | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#list) |
| 228 | cloudformation | dict | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#dict) |
| 229 | cloudformation | set | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#set) |
| 230 | cloudformation | tuple | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#tuple) |
| 231 | cloudformation | abs | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#abs) |
| 232 | cloudformation | round | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#round) |
| 233 | cloudformation | open | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#open) |
| 234 | cloudformation | input | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#input) |
| 235 | cloudformation | isinstance | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#isinstance) |
| 236 | cloudformation | map | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#map) |
| 237 | cloudformation | filter | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#filter) |
| 238 | cloudformation | str.split | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str.split) |
| 239 | cloudformation | str.join | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str.join) |
| 240 | cloudformation | str.format | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str.format) |
| 241 | cloudformation | list.append | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/tutorial/datastructures.html#more-on-lists) |
| 242 | cloudformation | list.sort | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#list.sort) |
| 243 | cloudformation | dict.get | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#dict.get) |
| 244 | cloudformation | dict.items | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#dict.items) |
| 245 | cloudformation | for | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-for-statement) |
| 246 | cloudformation | if | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-if-statement) |
| 247 | cloudformation | while | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-while-statement) |
| 248 | cloudformation | with | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-with-statement) |
| 249 | cloudformation | try | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-try-statement) |
| 250 | cloudformation | math | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/math.html) |
| 251 | cloudformation | random | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/random.html) |
| 252 | cloudformation | json | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/json.html) |
| 253 | cloudformation | os | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/os.html) |
| 254 | cloudformation | datetime | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/datetime.html) |
| 255 | cloudformation | numpy.array | 照合済 | 照合済 | 照合済 | [資料](https://numpy.org/doc/1.26/reference/generated/numpy.array.html) |
| 256 | cloudformation | pandas.DataFrame | 照合済 | 照合済 | 照合済 | [資料](https://pandas.pydata.org/pandas-docs/version/2.2/reference/api/pandas.DataFrame.html) |
| 257 | powerautomate | Set variable | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/variables#assign) |
| 258 | powerautomate | Increase variable | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/variables#increasevariable) |
| 259 | powerautomate | Display input dialog | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/display#displayinputdialog) |
| 260 | powerautomate | If | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/conditionals#if) |
| 261 | powerautomate | Else | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/conditionals#else) |
| 262 | powerautomate | End | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops) |
| 263 | powerautomate | Loop | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#loop) |
| 264 | powerautomate | For each | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#foreach) |
| 265 | powerautomate | Loop condition | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#while) |
| 266 | powerautomate | Exit loop | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#break) |
| 267 | powerautomate | Write text to file | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/file#writetexttofile) |
| 268 | powerautomate | Read text from file | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/file#readtextfromfile) |
| 269 | powerautomate | Send email | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/email#sendemail) |
| 270 | powerautomate | Display message | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/display#displaymessage) |
| 271 | autohotkey | Send | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/Send.htm) |
| 272 | autohotkey | SendText | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/Send.htm) |
| 273 | autohotkey | WinExist | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/WinExist.htm) |
| 274 | autohotkey | WinActive | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/WinActive.htm) |
| 275 | autohotkey | WinActivate | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/WinActivate.htm) |
| 276 | autohotkey | WinClose | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/WinClose.htm) |
| 277 | autohotkey | SetTitleMatchMode | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/SetTitleMatchMode.htm) |
| 278 | autohotkey | Click | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/Click.htm) |
| 279 | autohotkey | MouseMove | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/MouseMove.htm) |
| 280 | autohotkey | Sleep | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/Sleep.htm) |
| 281 | autohotkey | MsgBox | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/MsgBox.htm) |
| 282 | autohotkey | InputBox | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/InputBox.htm) |
| 283 | autohotkey | if | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/If.htm) |
| 284 | autohotkey | Loop | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/Loop.htm) |
| 285 | autohotkey | while | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/lib/While.htm) |
| 286 | autohotkey | Hotkey | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/Hotkeys.htm) |
| 287 | autohotkey | Hotstring | 照合済 | 照合済 | 照合済 | [資料](https://www.autohotkey.com/docs/v2/Hotstrings.htm) |
| 288 | uivision | open | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/open) |
| 289 | uivision | click | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/click) |
| 290 | uivision | type | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/type) |
| 291 | uivision | store | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/store) |
| 292 | uivision | storeText | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/storetext) |
| 293 | uivision | storeValue | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/storevalue) |
| 294 | uivision | echo | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/echo) |
| 295 | uivision | if | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/if) |
| 296 | uivision | elseif | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/if) |
| 297 | uivision | else | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/if) |
| 298 | uivision | end | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/if) |
| 299 | uivision | while | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/while) |
| 300 | uivision | times | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/times) |
| 301 | uivision | executeScript_Sandbox | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/executescript) |
| 302 | uivision | break | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/) |
| 303 | uivision | continue | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/) |
| 304 | uivision | assertText | 照合済 | 照合済 | 照合済 | [資料](https://ui.vision/rpa/docs/selenium-ide/asserttext-verifytext) |
| 305 | powerapps | Set | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-set) |
| 306 | powerapps | UpdateContext | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-updatecontext) |
| 307 | powerapps | If | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-if) |
| 308 | powerapps | Switch | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-if) |
| 309 | powerapps | Collect | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-clear-collect-clearcollect) |
| 310 | powerapps | Clear | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-clear-collect-clearcollect) |
| 311 | powerapps | ClearCollect | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-clear-collect-clearcollect) |
| 312 | powerapps | Table | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-table) |
| 313 | powerapps | Sequence | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-sequence) |
| 314 | powerapps | ForAll | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-forall) |
| 315 | powerapps | CountRows | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-table-counts) |
| 316 | powerapps | Sum | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-aggregates) |
| 317 | powerapps | Filter | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-filter-lookup) |
| 318 | powerapps | LookUp | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-filter-lookup) |
| 319 | powerapps | Patch | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-patch) |
| 320 | powerapps | Defaults | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-defaults) |
| 321 | powerapps | Navigate | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-navigate) |
| 322 | powerapps | Reset | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-reset) |
| 323 | powerapps | Text | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-text) |
| 324 | powerapps | Value | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-value) |
| 325 | powerapps | Blank | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-isblank-isempty) |
| 326 | powerapps | IsBlank | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-isblank-isempty) |
| 327 | powerapps | Notify | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-showerror) |
| 328 | python | print | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#print) |
| 329 | python | len | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#len) |
| 330 | python | sum | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#sum) |
| 331 | python | min | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#min) |
| 332 | python | max | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#max) |
| 333 | python | range | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#range) |
| 334 | python | enumerate | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#enumerate) |
| 335 | python | zip | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#zip) |
| 336 | python | sorted | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#sorted) |
| 337 | python | type | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#type) |
| 338 | python | int | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#int) |
| 339 | python | str | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str) |
| 340 | python | list | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#list) |
| 341 | python | dict | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#dict) |
| 342 | python | set | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#set) |
| 343 | python | tuple | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#tuple) |
| 344 | python | abs | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#abs) |
| 345 | python | round | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#round) |
| 346 | python | open | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#open) |
| 347 | python | input | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#input) |
| 348 | python | isinstance | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#isinstance) |
| 349 | python | map | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#map) |
| 350 | python | filter | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/functions.html#filter) |
| 351 | python | str.split | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str.split) |
| 352 | python | str.join | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str.join) |
| 353 | python | str.format | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#str.format) |
| 354 | python | list.append | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/tutorial/datastructures.html#more-on-lists) |
| 355 | python | list.sort | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#list.sort) |
| 356 | python | dict.get | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#dict.get) |
| 357 | python | dict.items | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/stdtypes.html#dict.items) |
| 358 | python | for | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-for-statement) |
| 359 | python | if | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-if-statement) |
| 360 | python | while | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-while-statement) |
| 361 | python | with | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-with-statement) |
| 362 | python | try | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/reference/compound_stmts.html#the-try-statement) |
| 363 | python | math | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/math.html) |
| 364 | python | random | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/random.html) |
| 365 | python | json | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/json.html) |
| 366 | python | os | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/os.html) |
| 367 | python | datetime | 照合済 | 照合済 | 照合済 | [資料](https://docs.python.org/ja/3.12/library/datetime.html) |
| 368 | python | numpy.array | 照合済 | 照合済 | 照合済 | [資料](https://numpy.org/doc/1.26/reference/generated/numpy.array.html) |
| 369 | python | pandas.DataFrame | 照合済 | 照合済 | 照合済 | [資料](https://pandas.pydata.org/pandas-docs/version/2.2/reference/api/pandas.DataFrame.html) |
| 370 | r | c | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/c.html) |
| 371 | r | sum | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/sum.html) |
| 372 | r | mean | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/mean.html) |
| 373 | r | median | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/median.html) |
| 374 | r | sd | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/sd.html) |
| 375 | r | length | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/length.html) |
| 376 | r | seq | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/seq.html) |
| 377 | r | seq_len | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/seq.html) |
| 378 | r | rep | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/rep.html) |
| 379 | r | data.frame | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/dataframe.html) |
| 380 | r | nrow | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/nrow.html) |
| 381 | r | ncol | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/nrow.html) |
| 382 | r | names | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/names.html) |
| 383 | r | is.na | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/NA.html) |
| 384 | r | as.numeric | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/numeric.html) |
| 385 | r | as.character | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/character.html) |
| 386 | r | print | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/print.html) |
| 387 | r | cat | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/cat.html) |
| 388 | r | readline | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/readline.html) |
| 389 | r | read.csv | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/utils/html/read.table.html) |
| 390 | r | if | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/Control.html) |
| 391 | r | for | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/Control.html) |
| 392 | r | while | 照合済 | 照合済 | 照合済 | [資料](https://stat.ethz.ch/R-manual/R-devel/library/base/html/Control.html) |
| 393 | c | int | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/language/arithmetic_types) |
| 394 | c | double | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/language/arithmetic_types) |
| 395 | c | array | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/language/array) |
| 396 | c | pointer | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/language/pointer) |
| 397 | c | if | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/language/if) |
| 398 | c | for | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/language/for) |
| 399 | c | while | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/language/while) |
| 400 | c | printf | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/c/io/fprintf) |
| 401 | cpp | int | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/language/types) |
| 402 | cpp | double | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/language/types) |
| 403 | cpp | array | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/language/array) |
| 404 | cpp | pointer | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/language/pointer) |
| 405 | cpp | if | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/language/if) |
| 406 | cpp | for | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/language/for) |
| 407 | cpp | while | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/language/while) |
| 408 | cpp | printf | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/io/c/fprintf) |
| 409 | cpp | cout | 照合済 | 照合済 | 照合済 | [資料](https://en.cppreference.com/w/cpp/io/cout) |
| 410 | csharp | int | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/integral-numeric-types) |
| 411 | csharp | double | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types) |
| 412 | csharp | array | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/arrays) |
| 413 | csharp | if | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/selection-statements) |
| 414 | csharp | for | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements) |
| 415 | csharp | while | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements) |
| 416 | csharp | Console.WriteLine | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/api/system.console.writeline) |
| 417 | csharp | Console.ReadLine | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/api/system.console.readline) |
| 418 | csharp | class | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/class) |
| 419 | csharp | checked | 照合済 | 照合済 | 照合済 | [資料](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/checked-and-unchecked) |
| 420 | javascript | console.log | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/console/log_static) |
| 421 | javascript | document.getElementById | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById) |
| 422 | javascript | document.querySelector | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) |
| 423 | javascript | document.createElement | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement) |
| 424 | javascript | appendChild | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild) |
| 425 | javascript | textContent | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent) |
| 426 | javascript | value | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/value) |
| 427 | javascript | push | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push) |
| 428 | javascript | pop | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop) |
| 429 | javascript | Number | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) |
| 430 | javascript | String | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) |
| 431 | javascript | Boolean | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) |
| 432 | javascript | parseInt | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt) |
| 433 | javascript | Math.abs | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/abs) |
| 434 | javascript | Math.floor | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor) |
| 435 | javascript | Math.round | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round) |
| 436 | javascript | JSON.stringify | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) |
| 437 | javascript | prompt | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt) |
| 438 | javascript | alert | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert) |
| 439 | javascript | if | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else) |
| 440 | javascript | for | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for) |
| 441 | javascript | addEventListener | 照合済 | 照合済 | 照合済 | [資料](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) |

441/441の掲載文面を照合。実ランタイムでの使用例検証は別集計であり、全13製品の実環境へ接続・実行したとは報告しない。ネイティブ実行の範囲と未実施はCODEX-R2.mdに記録。
