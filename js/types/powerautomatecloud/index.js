// Power Automate（クラウド）＝ワークフロー定義言語（Workflow Definition
// Language, WDL）の式関数の新種別（高度モード用、ユーザー決定 U-47）。
// 既存の Power Automate（デスクトップ）種別とは別種別であり、そちらには
// 一切触れない。
//
// 設計判断（一次情報：Microsoft Learn「Workflow Definition Language
// functions reference」と「Workflow Definition Language schema for
// Azure Logic Apps」の式文法）:
// - 文法は式だけを受け付ける。関数呼び出し、単一引用符の文字列
//   リテラル（'' が引用符のエスケープ、@{式} 補間、@@ が @ の
//   エスケープ）、数値、true/false/null、括弧、式文法の演算子
//   （算術 + - * / %、比較 == != < > <= >=、論理 && || !、
//   メンバー参照 .名前、添字 [式]）に限る。配列・オブジェクトの
//   リテラル記法は WDL の式文法に無いため入れず、createArray() や
//   json() 等の関数で作る（文法に無い形は名前を挙げて停止する）。
// - 式全体の先頭の @（@concat(...) 形式）と @{式} 形式は、ワーク
//   フロー定義 JSON での式の書き方として受理する。
// - 時刻系（utcNow 等）は実時刻を装わず、モデルの基準時刻
//   （defaults.baseTime、利用者が編集できる ISO 文字列）を使う
//   決定的モデルにする。rand/guid も同様に、モデルのシードから
//   決定的に生成し、その旨を semantics と項目の注意書きで明示する。
// - ワークフローの実行時ランタイム（トリガー／アクションの入出力、
//   ループの現在項目、パラメーター、変数ストア等）に本質的に依存する
//   21件は supported=false とし、呼び出されたら関数名と理由を挙げて
//   正直に停止する（値を捏造しない）。
import { PracticeError, toLearnerError } from "../../core/script.js";
import { rows, sourceFailure } from "../../core/data.js";
import { formatModelValue, LIMITS } from "../../core/contract.js";

const WDL_REFERENCE_URL =
  "https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-functions-reference";

// ワークフローの実行時ランタイム依存で未対応とする21件（棚卸しの
// 「未対応候補」と一致）。理由は全件共通の本質（実行時ランタイム依存）。
export const UNSUPPORTED_FUNCTIONS = [
  "action",
  "actions",
  "body",
  "formDataMultiValues",
  "formDataValue",
  "item",
  "items",
  "iterationIndexes",
  "listCallbackUrl",
  "multipartBody",
  "outputs",
  "parameters",
  "result",
  "trigger",
  "triggerBody",
  "triggerFormDataMultiValues",
  "triggerFormDataValue",
  "triggerMultipartBody",
  "triggerOutputs",
  "variables",
  "workflow",
];
const UNSUPPORTED_SET = new Set(
  UNSUPPORTED_FUNCTIONS.map((n) => n.toLowerCase()),
);
const RUNTIME_REASON =
  "ワークフローの実行時ランタイム（トリガー／アクションの入出力など）に依存するため、この学習モデルでは対応していません";

// reference は rows 形式（name/category/syntax/description/example/
// caution/supported）。未対応21件は supported=false（rows の第7要素）。
const reference = rows([
  // ---- 文字列 ----
  ["chunk", "文字列", "chunk(value, length)", "文字列または配列を、指定した長さごとの断片（チャンク）の配列に分割します。", "chunk('abcdef', 2)", "文字列では文字数、配列では要素数で区切ります。"],
  ["concat", "文字列", "concat(value1, value2, ...)", "文字列同士、または配列同士をつなげます。文字列と配列を混ぜることはできません。", "concat('Hello', ' ', 'WDL')", "引数が全て配列のときは配列の連結、それ以外は文字列の連結になります。"],
  ["endsWith", "文字列", "endsWith(text, suffix)", "文字列が指定した接尾辞で終わるかを調べます。", "endsWith('report.txt', '.txt')", "大文字と小文字は区別しません。"],
  ["formatNumber", "文字列", "formatNumber(number, format [, locale])", "数値を書式文字列で整形します。このモデルでは 0・#・小数点・桁区切り・% のカスタム書式と、C（通貨、en-US／ja-JP のみ）に対応します。", "formatNumber(1234.5, '#,##0.00')", "対応外の書式・ロケールは名前を挙げて停止します。"],
  ["guid", "文字列", "guid([format])", "GUID を生成します。書式は D（既定）／N／B／P／X です。", "guid('N')", "このモデルでは実物の乱数生成ではなく、モデルの guidSeed から決定的に生成します（同じモデル・同じ呼出し順では同じ値になります）。実運用の GUID とは性質が異なります。"],
  ["indexOf", "文字列", "indexOf(text, substring)", "部分文字列が最初に現れる位置（0始まり）を返します。見つからなければ -1 です。", "indexOf('hello', 'l')", "大文字と小文字は区別しません。"],
  ["isFloat", "文字列", "isFloat(string [, locale])", "文字列を浮動小数点数として解釈できるかを調べます。", "isFloat('1.5')", "ロケールは en-US／ja-JP のみ対応します。整数の形の文字列も浮動小数点数として解釈できるため true になります。"],
  ["isInt", "文字列", "isInt(string [, locale])", "文字列を整数として解釈できるかを調べます。", "isInt('42')", "ロケールは en-US／ja-JP のみ対応します。"],
  ["lastIndexOf", "文字列", "lastIndexOf(text, substring)", "部分文字列が最後に現れる位置（0始まり）を返します。見つからなければ -1 です。", "lastIndexOf('hello', 'l')", "大文字と小文字は区別しません。"],
  ["length", "文字列", "length(stringOrArray)", "文字列の文字数、または配列の要素数を返します。", "length('hello')", "文字列は UTF-16 コード単位の数（.NET の String.Length と同じ数え方）です。"],
  ["nthIndexOf", "文字列", "nthIndexOf(text, substring, occurrence)", "部分文字列が occurrence 回目（1始まり）に現れる位置を返します。見つからなければ -1 です。", "nthIndexOf('hello', 'l', 2)", "大文字と小文字は区別しません。occurrence に負の数を指定すると末尾から数えます。"],
  ["replace", "文字列", "replace(text, oldString, newString)", "文字列中の oldString を全て newString に置き換えます。", "replace('a-b-a', 'a', 'x')", "検索は大文字と小文字を区別します（WDL の仕様）。"],
  ["slice", "文字列", "slice(value, startIndex [, endIndex])", "文字列または配列の、開始位置から終了位置の直前までを取り出します。", "slice('abcdef', 1, 4)", "負の位置は末尾から数えます。開始位置が長さを超えた場合は空を返し、範囲外の位置は端に丸めます。"],
  ["split", "文字列", "split(text, delimiter)", "区切り文字列で分割した配列を返します。", "split('a,b,c', ',')", ""],
  ["startsWith", "文字列", "startsWith(text, prefix)", "文字列が指定した接頭辞で始まるかを調べます。", "startsWith('report.txt', 'report')", "大文字と小文字は区別しません。"],
  ["substring", "文字列", "substring(text, startIndex [, length])", "開始位置（0始まり）から指定した文字数を取り出します。length を省略すると開始位置から末尾までを取り出します。", "substring('abcdef', 2, 3)", "開始位置と長さの合計が文字列の長さを超える指定は名前を挙げて停止します。"],
  ["toLower", "文字列", "toLower(text)", "文字列を小文字に変換します。", "toLower('AbC')", ""],
  ["toUpper", "文字列", "toUpper(text)", "文字列を大文字に変換します。", "toUpper('AbC')", ""],
  ["trim", "文字列", "trim(text)", "文字列の前後の空白を取り除きます。", "trim('  hi  ')", ""],
  ["trimByteOrderMark", "文字列", "trimByteOrderMark(text)", "文字列またはバイナリ値の先頭にあるバイト順マーク（BOM、U+FEFF）を取り除きます。", "trimByteOrderMark('abc')", "取り除くのは先頭だけです。null を渡すと空文字列を返します。"],
  // ---- コレクション ----
  ["contains", "コレクション", "contains(collection, value)", "コレクション・文字列・オブジェクトに対象が含まれるかを調べます。文字列では部分文字列、オブジェクトではキーの有無を調べます。", "contains(createArray(1, 2, 3), 2)", "検索は大文字と小文字を区別します（WDL の仕様）。"],
  ["empty", "コレクション", "empty(collection)", "値が空（null、空文字列、空の配列、空のオブジェクト）かを調べます。", "empty(createArray())", "数値や真偽値はコレクションではないため、名前を挙げて停止します。"],
  ["first", "コレクション", "first(collectionOrString)", "配列の最初の要素、または文字列の最初の文字を返します。空の場合は null を返します。", "first(createArray(3, 1, 2))", ""],
  ["intersection", "コレクション", "intersection(array1, array2, ...)", "全ての配列に共通する要素だけの配列を返します（重複は除きます）。", "intersection(createArray(1, 2, 3), createArray(2, 3, 4))", ""],
  ["item", "コレクション", "item()", "繰返し処理の中で現在処理中の項目を返します。", "item()", RUNTIME_REASON, false],
  ["join", "コレクション", "join(array, delimiter)", "配列の要素を区切り文字列でつないだ文字列を返します。", "join(createArray('a', 'b'), '-')", ""],
  ["last", "コレクション", "last(collectionOrString)", "配列の最後の要素、または文字列の最後の文字を返します。空の場合は null を返します。", "last(createArray(3, 1, 2))", ""],
  ["reverse", "コレクション", "reverse(array)", "配列の要素の順序を逆にした新しい配列を返します（元の配列は変更しません）。", "reverse(createArray(1, 2, 3))", ""],
  ["skip", "コレクション", "skip(array, count)", "配列の先頭から指定した個数を除いた新しい配列を返します。", "skip(createArray(1, 2, 3), 1)", ""],
  ["sort", "コレクション", "sort(array [, sortByProperty])", "配列を昇順に並べ替えた新しい配列を返します。オブジェクトの配列では並べ替えに使うプロパティ名を指定できます。", "sort(createArray(3, 1, 2))", "数値と文字列が混在する配列は名前を挙げて停止します。"],
  ["take", "コレクション", "take(collectionOrString, count)", "配列または文字列の先頭から指定した個数を取り出します。", "take(createArray(1, 2, 3), 2)", ""],
  ["union", "コレクション", "union(array1, array2, ...)", "全ての配列の要素を合わせた配列を返します（重複は除きます）。", "union(createArray(1, 2), createArray(2, 3))", ""],
  // ---- 論理比較 ----
  ["and", "論理比較", "and(expression1, expression2, ...)", "全ての条件が true のとき true を返します。", "and(equals(1, 1), greater(3, 2))", "false が確定した時点で残りの引数は評価しません。"],
  ["equals", "論理比較", "equals(value1, value2)", "2つの値が等しいかを調べます。型が違う場合は変換して比較し、文字列は大文字と小文字を区別しません。", "equals(1, '1')", "型まで厳密に比べたい場合は strongEquals を使います。"],
  ["greater", "論理比較", "greater(value1, value2)", "value1 が value2 より大きいかを調べます。", "greater(3, 2)", "数値は数値として、文字列は大文字と小文字を区別せずに比べます。"],
  ["greaterOrEquals", "論理比較", "greaterOrEquals(value1, value2)", "value1 が value2 以上かを調べます。", "greaterOrEquals(2, 2)", ""],
  ["if", "論理比較", "if(condition, valueIfTrue, valueIfFalse)", "条件に応じてどちらか一方の値を返します。選ばれなかった側の式は評価しません。", "if(greater(3, 2), '大きい', '小さい')", ""],
  ["less", "論理比較", "less(value1, value2)", "value1 が value2 より小さいかを調べます。", "less(2, 3)", ""],
  ["lessOrEquals", "論理比較", "lessOrEquals(value1, value2)", "value1 が value2 以下かを調べます。", "lessOrEquals(2, 2)", ""],
  ["not", "論理比較", "not(expression)", "真偽を反転します。", "not(equals(1, 2))", ""],
  ["or", "論理比較", "or(expression1, expression2, ...)", "いずれかの条件が true のとき true を返します。", "or(equals(1, 2), greater(3, 2))", "true が確定した時点で残りの引数は評価しません。"],
  ["strongEquals", "論理比較", "strongEquals(value1, value2, ...)", "2つ以上の値が、型も含めて等しいかを調べます。型変換は行いません。", "strongEquals(1, 1)", "型が異なる値同士を渡すと、false ではなくエラーで停止します。文字列の比較では大文字と小文字を区別します。整数と小数は同じ数値型として比べます。"],
  // ---- 変換 ----
  ["array", "変換", "array(value)", "値を1要素の配列に変換します。", "array('a')", "既に配列の値を渡すと名前を挙げて停止します。"],
  ["base64", "変換", "base64(string)", "文字列を Base64 で符号化した文字列を返します。", "base64('hello')", "文字列は UTF-8 として符号化します。"],
  ["base64ToBinary", "変換", "base64ToBinary(base64String)", "Base64 文字列をバイナリ値に戻します。", "base64ToBinary('aGVsbG8=')", "このモデルのバイナリ値は {kind: 'binary', base64} の形で表します。"],
  ["base64ToJson", "変換", "base64ToJson(base64String)", "Base64 文字列を復号し、JSON として解釈した値を返します。", "base64ToJson('eyJhIjoxfQ==')", ""],
  ["base64ToString", "変換", "base64ToString(base64String)", "Base64 文字列を復号した文字列を返します。", "base64ToString('aGVsbG8=')", "復号結果は UTF-8 として解釈します。"],
  ["binary", "変換", "binary(value)", "文字列をバイナリ値に変換します（UTF-8 のバイト列）。", "binary('hello')", "このモデルのバイナリ値は {kind: 'binary', base64} の形で表します。"],
  ["bool", "変換", "bool(value)", "値を真偽値に変換します。文字列は 'true'／'false'（大文字小文字不区別）のみ、数値は 0 が false、0 以外が true に変換できます。", "bool('true')", "変換できない値は名前を挙げて停止します。"],
  ["createArray", "変換", "createArray(value1, value2, ...)", "引数を要素とする配列を作ります。引数なしでは空の配列になります。", "createArray(1, 'a', true)", ""],
  ["dataUri", "変換", "dataUri(value)", "文字列を data URI（data:text/plain;charset=utf-8;base64,...）に変換します。バイナリ値は application/octet-stream になります。", "dataUri('hello')", ""],
  ["dataUriToBinary", "変換", "dataUriToBinary(dataUri)", "data URI をバイナリ値に戻します。", "dataUriToBinary('data:text/plain;base64,aGVsbG8=')", ""],
  ["dataUriToString", "変換", "dataUriToString(dataUri)", "data URI を文字列に戻します。", "dataUriToString('data:text/plain;charset=utf-8;base64,aGVsbG8=')", ""],
  ["decimal", "変換", "decimal(value)", "値を10進数に変換します。", "decimal('1.25')", "このモデルでは JavaScript の数値で表すため、10進数の厳密な精度は保証しません。"],
  ["decodeBase64", "変換", "decodeBase64(base64String)", "base64ToString の別名です。Base64 文字列を復号した文字列を返します。", "decodeBase64('aGVsbG8=')", ""],
  ["decodeDataUri", "変換", "decodeDataUri(dataUri)", "dataUriToBinary の別名です。data URI をバイナリ値に戻します。", "decodeDataUri('data:text/plain;charset=utf-8;base64,aGVsbG8=')", ""],
  ["decodeUriComponent", "変換", "decodeUriComponent(encodedString)", "uriComponentToString の別名です。URI 符号化された文字列を戻します。", "decodeUriComponent('a%20b')", ""],
  ["encodeBase64", "変換", "encodeBase64(string)", "base64 の別名です。文字列を Base64 で符号化します。", "encodeBase64('hello')", ""],
  ["encodeUriComponent", "変換", "encodeUriComponent(string)", "uriComponent の別名です。文字列を URI 用に符号化します。", "encodeUriComponent('a b')", ""],
  ["float", "変換", "float(value [, locale])", "値を浮動小数点数に変換します。", "float('1.5')", "ロケールは en-US／ja-JP のみ対応します。"],
  ["int", "変換", "int(value)", "値を整数に変換します。文字列は整数の形でなければならず、数値は偶数丸め（.NET の変換規則）で整数化します。", "int('42')", ""],
  ["json", "変換", "json(value)", "文字列を JSON として解釈した値を返します。文字列でない値はそのまま返します。", "json('{\"a\": 1}')", "解釈できない文字列は理由を挙げて停止します。"],
  ["parse", "変換", "parse(value)", "json の旧称です（非推奨）。文字列を JSON として解釈した値を返します。", "parse('{\"a\": 1}')", "Microsoft Learn で deprecated と明記されています。新しい式では json を使います。"],
  ["string", "変換", "string(value)", "値を文字列に変換します。null は空文字列、オブジェクトと配列は JSON 文字列になります。", "string(42)", ""],
  ["uriComponent", "変換", "uriComponent(value)", "文字列を URI の構成要素として使えるよう符号化（パーセント符号化）します。", "uriComponent('a b&c')", ""],
  ["uriComponentToBinary", "変換", "uriComponentToBinary(encodedString)", "URI 符号化された文字列を復号し、バイナリ値として返します。", "uriComponentToBinary('a%20b')", ""],
  ["uriComponentToString", "変換", "uriComponentToString(encodedString)", "URI 符号化された文字列を復号して返します。", "uriComponentToString('a%20b')", ""],
  ["xml", "変換", "xml(value)", "値を XML として表します。オブジェクトは要素へ変換し（キーが要素名、'@名前' キーが属性）、XML 文字列は整形式か検証してそのまま返します。", "xml(json('{\"root\": {\"a\": 1}}'))", "このモデルでは XML の値は文字列として表します。"],
  // ---- 数学 ----
  ["add", "数学", "add(value1, value2)", "2つの数値の和を返します。", "add(1, 2)", ""],
  ["div", "数学", "div(dividend, divisor)", "商を返します。両方とも整数のときは整数の商、小数を含むときは通常の割算になります。", "div(10, 3)", "0 で割ると名前を挙げて停止します。小数の判定は、引数が小数リテラル（5.0 の形）や float() などで書かれているかによります。"],
  ["max", "数学", "max(value1, value2, ...) または max(array)", "最大の数値を返します。配列を1つ渡す形も使えます。", "max(1, 5, 3)", ""],
  ["min", "数学", "min(value1, value2, ...) または min(array)", "最小の数値を返します。配列を1つ渡す形も使えます。", "min(1, 5, 3)", ""],
  ["mod", "数学", "mod(dividend, divisor)", "割算の余りを返します。余りの符号は被除数（左辺）と同じになります。", "mod(10, 3)", "0 で割ると名前を挙げて停止します。"],
  ["mul", "数学", "mul(value1, value2)", "2つの数値の積を返します。", "mul(3, 4)", ""],
  ["pow", "数学", "pow(base, exponent)", "べき乗を返します。", "pow(2, 10)", ""],
  ["rand", "数学", "rand(minimum, maximum)", "minimum 以上 maximum 未満の整数を返します。", "rand(1, 7)", "このモデルでは実物の乱数ではなく、モデルの randSeed から決定的に生成します（同じモデル・同じ呼出し順では同じ値になります）。"],
  ["range", "数学", "range(startIndex, count)", "startIndex から始まる count 個の整数の配列を返します。", "range(1, 4)", "count の上限は 10,000 件です（学習モデルの上限）。"],
  ["sub", "数学", "sub(value1, value2)", "2つの数値の差を返します。", "sub(5, 3)", ""],
  // ---- 日時 ----
  ["addDays", "日時", "addDays(timestamp, days [, format])", "タイムスタンプに日数を加えた値を返します。", "addDays('2026-01-15T09:00:00Z', 3, 'yyyy-MM-dd')", "書式を指定しない場合は ISO 8601（UTC）で返します。"],
  ["addHours", "日時", "addHours(timestamp, hours [, format])", "タイムスタンプに時間数を加えた値を返します。", "addHours('2026-01-15T09:00:00Z', 5, 'yyyy-MM-dd HH:mm')", ""],
  ["addMinutes", "日時", "addMinutes(timestamp, minutes [, format])", "タイムスタンプに分数を加えた値を返します。", "addMinutes('2026-01-15T09:00:00Z', 90, 'HH:mm')", ""],
  ["addSeconds", "日時", "addSeconds(timestamp, seconds [, format])", "タイムスタンプに秒数を加えた値を返します。", "addSeconds('2026-01-15T09:00:00Z', 30, 'HH:mm:ss')", ""],
  ["addToTime", "日時", "addToTime(timestamp, interval, timeUnit [, format])", "タイムスタンプに、時間単位（Second／Minute／Hour／Day／Week／Month／Year）で指定した間隔を加えます。", "addToTime('2026-01-15T09:00:00Z', 2, 'Week', 'yyyy-MM-dd')", ""],
  ["convertFromUtc", "日時", "convertFromUtc(timestamp, destinationTimeZone [, format])", "UTC のタイムスタンプを指定したタイムゾーンの現地時刻に変換します。", "convertFromUtc('2026-01-15T09:00:00Z', 'Tokyo Standard Time', 'yyyy-MM-dd HH:mm')", "タイムゾーンは Windows のタイムゾーン ID（例：Tokyo Standard Time）と IANA 名（例：Asia/Tokyo）に対応します。対応外の名前は名前を挙げて停止します。"],
  ["convertTimeZone", "日時", "convertTimeZone(timestamp, sourceTimeZone, destinationTimeZone [, format])", "タイムスタンプを変換元のタイムゾーンから変換先のタイムゾーンへ変換します。入力は変換元タイムゾーンの現地時刻として解釈します。", "convertTimeZone('2026-01-15T18:00:00', 'Tokyo Standard Time', 'UTC', 'yyyy-MM-dd HH:mm')", ""],
  ["convertToUtc", "日時", "convertToUtc(timestamp, sourceTimeZone [, format])", "指定したタイムゾーンの現地時刻を UTC に変換します。", "convertToUtc('2026-01-15T18:00:00', 'Asia/Tokyo', 'yyyy-MM-dd HH:mm')", ""],
  ["dateDifference", "日時", "dateDifference(startDate, endDate)", "2つのタイムスタンプの差（endDate − startDate）を TimeSpan 文字列で返します。", "dateDifference('2026-01-15T09:00:00Z', '2026-01-17T09:00:00Z')", "書式は .NET の TimeSpan 標準形式（例：2.00:00:00）で、小数部がある場合だけ小数部（7桁）を付けます。"],
  ["dayOfMonth", "日時", "dayOfMonth(timestamp)", "タイムスタンプの日（1〜31）を返します。", "dayOfMonth('2026-01-15T09:00:00Z')", ""],
  ["dayOfWeek", "日時", "dayOfWeek(timestamp)", "タイムスタンプの曜日を数値で返します（日曜日=0〜土曜日=6）。", "dayOfWeek('2026-01-15T09:00:00Z')", ""],
  ["dayOfYear", "日時", "dayOfYear(timestamp)", "タイムスタンプの年内通算日（1始まり）を返します。", "dayOfYear('2026-02-01T09:00:00Z')", ""],
  ["formatDateTime", "日時", "formatDateTime(timestamp [, format [, locale]])", "タイムスタンプを指定した書式で整形します。書式を省略すると ISO 8601（UTC）になります。", "formatDateTime('2026-01-15T09:00:00Z', 'yyyy/MM/dd HH:mm')", "対応する書式トークンは yyyy・MM・dd・HH・mm・ss・fff・tt などです。T は .NET 書式では指定子ではなくリテラル文字で、そのまま出力します（Learn の例 'yyyy-MM-ddTHH:mm:ss' → '2018-03-15T12:00:00'）。引用符で囲んだ部分と \ でエスケープした文字もリテラルとして扱います。対応外のトークン（曜日名・月名など）は名前を挙げて停止します。ロケールは en-US／ja-JP のみ対応します。"],
  ["formatTimeSpan", "日時", "formatTimeSpan(timespan [, format])", "TimeSpan 文字列を整形します。書式を省略すると .NET の標準形にそろえます。", "formatTimeSpan('1.02:03:04')", "書式トークンは d・hh・mm・ss・fff に対応します。"],
  ["getFutureTime", "日時", "getFutureTime(interval, timeUnit [, format])", "基準時刻から指定した間隔だけ未来のタイムスタンプを返します。", "getFutureTime(3, 'Day', 'yyyy-MM-dd')", "このモデルの「現在」は実時刻ではなく、モデルの基準時刻（baseTime）です。"],
  ["getPastTime", "日時", "getPastTime(interval, timeUnit [, format])", "基準時刻から指定した間隔だけ過去のタイムスタンプを返します。", "getPastTime(3, 'Day', 'yyyy-MM-dd')", "このモデルの「現在」は実時刻ではなく、モデルの基準時刻（baseTime）です。"],
  ["parseDateTime", "日時", "parseDateTime(timestamp [, locale [, format]])", "文字列をタイムスタンプとして解釈し、ISO 8601（UTC）で返します。書式を指定した場合はその書式どおりに読み、UTC として解釈します。", "parseDateTime('2026/01/15 09:00', 'ja-JP', 'yyyy/MM/dd HH:mm')", "ロケールは en-US／ja-JP／en-GB のみ対応します。書式のリテラル（T・引用符で囲んだ部分・\ エスケープ）の扱いは formatDateTime と同じです。"],
  ["startOfDay", "日時", "startOfDay(timestamp [, format])", "その日の開始（00:00:00）を返します。", "startOfDay('2026-01-15T09:30:00Z', 'yyyy-MM-dd HH:mm:ss')", ""],
  ["startOfHour", "日時", "startOfHour(timestamp [, format])", "その時間の開始（分・秒が0）を返します。", "startOfHour('2026-01-15T09:30:45Z', 'HH:mm:ss')", ""],
  ["startOfMonth", "日時", "startOfMonth(timestamp [, format])", "その月の開始（1日 00:00:00）を返します。", "startOfMonth('2026-01-15T09:30:00Z', 'yyyy-MM-dd')", ""],
  ["subtractFromTime", "日時", "subtractFromTime(timestamp, interval, timeUnit [, format])", "タイムスタンプから、時間単位で指定した間隔を引きます。addToTime の逆です。", "subtractFromTime('2026-01-15T09:00:00Z', 2, 'Day', 'yyyy-MM-dd')", ""],
  ["ticks", "日時", "ticks(timestamp)", "タイムスタンプの .NET ticks（0001-01-01 からの100ナノ秒単位）を返します。", "ticks('2026-01-15T09:00:00Z')", "現代の日付では ticks が JavaScript の安全な整数範囲を超えるため、このモデルでは BigInt として正確に返します（表示は整数のままです）。"],
  ["utcNow", "日時", "utcNow([format])", "現在の UTC 日時を返します。", "utcNow('yyyy-MM-dd')", "このモデルでは実時刻を装わず、モデルの基準時刻（baseTime）を返します。基準時刻はモデルで編集できます。"],
  // ---- ワークフロー（全件未対応：実行時ランタイム依存） ----
  ["action", "ワークフロー", "action(name)", "名前で指定したアクション全体（入出力）を返します。", "action('Get_items')", RUNTIME_REASON, false],
  ["actions", "ワークフロー", "actions(name)", "スコープ内のアクションの入出力を返します。", "actions('Scope')", RUNTIME_REASON, false],
  ["body", "ワークフロー", "body(name)", "アクションの出力の body 部分を返します。", "body('Get_items')", RUNTIME_REASON, false],
  ["formDataMultiValues", "ワークフロー", "formDataMultiValues(name, key)", "トリガー／アクションのフォームデータから、キーの値を全て返します。", "formDataMultiValues('trigger', 'key')", RUNTIME_REASON, false],
  ["formDataValue", "ワークフロー", "formDataValue(name, key)", "トリガー／アクションのフォームデータから、キーの最初の値を返します。", "formDataValue('trigger', 'key')", RUNTIME_REASON, false],
  ["items", "ワークフロー", "items(name)", "繰返し（For each）の対象コレクションを返します。", "items('For_each')", RUNTIME_REASON, false],
  ["iterationIndexes", "ワークフロー", "iterationIndexes(name)", "並行繰返しの現在のインデックスを返します。", "iterationIndexes('For_each')", RUNTIME_REASON, false],
  ["listCallbackUrl", "ワークフロー", "listCallbackUrl()", "ワークフローのコールバック URL を返します。", "listCallbackUrl()", RUNTIME_REASON, false],
  ["multipartBody", "ワークフロー", "multipartBody(name, index)", "トリガー／アクションの multipart 本体のパートを返します。", "multipartBody('trigger', 0)", RUNTIME_REASON, false],
  ["outputs", "ワークフロー", "outputs(name)", "アクションの出力全体を返します。", "outputs('Get_items')", RUNTIME_REASON, false],
  ["parameters", "ワークフロー", "parameters(name)", "ワークフロー定義のパラメーターの値を返します。", "parameters('endpoint')", RUNTIME_REASON, false],
  ["result", "ワークフロー", "result(name)", "スコープ内の全アクションの実行結果を返します。", "result('Scope')", RUNTIME_REASON, false],
  ["trigger", "ワークフロー", "trigger()", "トリガー全体（入出力）を返します。", "trigger()", RUNTIME_REASON, false],
  ["triggerBody", "ワークフロー", "triggerBody()", "トリガーの出力の body 部分を返します。", "triggerBody()", RUNTIME_REASON, false],
  ["triggerFormDataMultiValues", "ワークフロー", "triggerFormDataMultiValues(key)", "トリガーのフォームデータから、キーの値を全て返します。", "triggerFormDataMultiValues('key')", RUNTIME_REASON, false],
  ["triggerFormDataValue", "ワークフロー", "triggerFormDataValue(key)", "トリガーのフォームデータから、キーの最初の値を返します。", "triggerFormDataValue('key')", RUNTIME_REASON, false],
  ["triggerMultipartBody", "ワークフロー", "triggerMultipartBody(index)", "トリガーの multipart 本体のパートを返します。", "triggerMultipartBody(0)", RUNTIME_REASON, false],
  ["triggerOutputs", "ワークフロー", "triggerOutputs()", "トリガーの出力全体を返します。", "triggerOutputs()", RUNTIME_REASON, false],
  ["variables", "ワークフロー", "variables(name)", "ワークフロー変数の値を返します。", "variables('count')", RUNTIME_REASON, false],
  ["workflow", "ワークフロー", "workflow()", "ワークフロー自体の情報（ID、名前、実行情報など）を返します。", "workflow()", RUNTIME_REASON, false],
  // ---- URI解析 ----
  ["uriHost", "URI解析", "uriHost(uri)", "URI のホスト部分を返します。", "uriHost('https://example.com:8080/path?q=1')", "絶対 URI でなければ名前を挙げて停止します。"],
  ["uriPath", "URI解析", "uriPath(uri)", "URI のパス部分（先頭の / を含む）を返します。", "uriPath('https://example.com/path/to?q=1')", ""],
  ["uriPathAndQuery", "URI解析", "uriPathAndQuery(uri)", "URI のパスとクエリを合わせた部分を返します。", "uriPathAndQuery('https://example.com/path?q=1')", ""],
  ["uriPort", "URI解析", "uriPort(uri)", "URI のポート番号を返します。明示されていない場合はスキームの既定ポート（http=80、https=443）です。", "uriPort('https://example.com/path')", ""],
  ["uriQuery", "URI解析", "uriQuery(uri)", "URI のクエリ部分を返します（先頭の ? は含みません）。クエリが無ければ空文字列です。", "uriQuery('https://example.com/path?q=1&r=2')", ""],
  ["uriScheme", "URI解析", "uriScheme(uri)", "URI のスキーム（https など）を返します。", "uriScheme('https://example.com/path')", ""],
  // ---- JSON・XML操作 ----
  ["addProperty", "JSON・XML操作", "addProperty(object, propertyName, value)", "JSON オブジェクトにプロパティを追加した新しいオブジェクトを返します（元のオブジェクトは変更しません）。", "addProperty(json('{\"a\": 1}'), 'b', 2)", "同名のプロパティが既にある場合は名前を挙げて停止します（上書きしたい場合は setProperty を使います）。"],
  ["coalesce", "JSON・XML操作", "coalesce(value1, value2, ...)", "null でない最初の引数を返します。全て null の場合は null です。", "coalesce(null, null, 'x')", "null でない値が決まった時点で残りの引数は評価しません。"],
  ["decodeXmlName", "JSON・XML操作", "decodeXmlName(name)", "encodeXmlName で符号化された名前を元に戻します（_xHHHH_ 形式を復号）。", "decodeXmlName('a_x0020_b')", ""],
  ["decodeXmlValue", "JSON・XML操作", "decodeXmlValue(value)", "XML の実体参照（&amp; など）を元の文字に戻します。", "decodeXmlValue('a &amp; b')", ""],
  ["encodeXmlName", "JSON・XML操作", "encodeXmlName(name)", "XML の要素名・属性名として使えない文字を _xHHHH_ 形式に符号化します。", "encodeXmlName('a b')", ""],
  ["encodeXmlValue", "JSON・XML操作", "encodeXmlValue(value)", "XML の値として使えるよう、& < > \" ' を実体参照に符号化します。", "encodeXmlValue('a & b')", ""],
  ["mergeObjects", "JSON・XML操作", "mergeObjects(object1, object2, ...)", "複数の JSON オブジェクトを統合した新しいオブジェクトを返します。プロパティ名は大文字小文字を区別せずに対応付け、入れ子のオブジェクトは再帰的に統合し、配列は位置ごとに統合します（同名のスカラーは後ろが優先）。", "mergeObjects(json('{\"a\": 1}'), json('{\"b\": 2}'))", ""],
  ["removeProperty", "JSON・XML操作", "removeProperty(object, propertyName)", "JSON オブジェクトからプロパティを取り除いた新しいオブジェクトを返します（元のオブジェクトは変更しません）。", "removeProperty(json('{\"a\": 1, \"b\": 2}'), 'a')", "指定したプロパティが無い場合は、元のオブジェクトをそのまま返します。"],
  ["setProperty", "JSON・XML操作", "setProperty(object, propertyName, value)", "JSON オブジェクトのプロパティを設定（追加または上書き）した新しいオブジェクトを返します（元のオブジェクトは変更しません）。", "setProperty(json('{\"a\": 1}'), 'a', 9)", ""],
  ["xpath", "JSON・XML操作", "xpath(xmlText, xpathExpression)", "XML 文字列に対して XPath の部分集合を評価します。要素は XML 文字列の配列、属性（/@名前）と text() は文字列の配列、count(...) は個数を返します。", "xpath('<root><a>1</a><a>2</a></root>', '/root/a')", "対応する XPath は、要素名の並び、//（子孫）、[n]（n番目）、[@属性='値']、/@属性、/text()、count(...) のみです。対応外の軸・関数は名前を挙げて停止します。"],
]);

// reference-details 方式：returns／source をファイル末尾でマージする
// （powerapps/index.js 末尾のパターン）。source は Microsoft Learn の
// WDL 関数リファレンス（各関数の詳細アンカー）。
const referenceDetails = {};
{
  const returnsByName = {
    chunk: "断片の配列", concat: "連結した文字列または配列", endsWith: "真偽値",
    formatNumber: "整形した文字列", guid: "GUID文字列", indexOf: "位置（整数）。なければ -1",
    isFloat: "真偽値", isInt: "真偽値", lastIndexOf: "位置（整数）。なければ -1",
    length: "長さ（整数）", nthIndexOf: "位置（整数）。なければ -1", replace: "置換後の文字列",
    slice: "取り出した文字列または配列", split: "文字列の配列", startsWith: "真偽値",
    substring: "部分文字列", toLower: "文字列", toUpper: "文字列", trim: "文字列",
    trimByteOrderMark: "文字列またはバイナリ値（null の場合は空文字列）", contains: "真偽値", empty: "真偽値",
    first: "最初の要素。空なら null", intersection: "共通要素の配列", item: "現在処理中の項目",
    join: "連結した文字列", last: "最後の要素。空なら null", reverse: "逆順の配列",
    skip: "先頭を除いた配列", sort: "並べ替えた配列", take: "先頭から取り出した配列または文字列",
    union: "統合した配列", and: "真偽値", equals: "真偽値", greater: "真偽値",
    greaterOrEquals: "真偽値", if: "条件で選ばれた値", less: "真偽値", lessOrEquals: "真偽値",
    not: "真偽値", or: "真偽値", strongEquals: "真偽値", array: "1要素の配列",
    base64: "Base64文字列", base64ToBinary: "バイナリ値", base64ToJson: "JSONとして解釈した値",
    base64ToString: "文字列", binary: "バイナリ値", bool: "真偽値", createArray: "配列",
    dataUri: "data URI文字列", dataUriToBinary: "バイナリ値", dataUriToString: "文字列",
    decimal: "数値（10進数）", decodeBase64: "文字列", decodeDataUri: "バイナリ値",
    decodeUriComponent: "文字列", encodeBase64: "Base64文字列", encodeUriComponent: "符号化した文字列",
    float: "数値（浮動小数点数）", int: "整数", json: "JSONとして解釈した値",
    parse: "JSONとして解釈した値", string: "文字列", uriComponent: "符号化した文字列",
    uriComponentToBinary: "バイナリ値", uriComponentToString: "文字列", xml: "XML文字列",
    add: "和（数値）", div: "商（数値）", max: "最大値（数値）", min: "最小値（数値）",
    mod: "余り（数値）", mul: "積（数値）", pow: "べき乗（数値）", rand: "整数",
    range: "整数の配列", sub: "差（数値）", addDays: "タイムスタンプ文字列",
    addHours: "タイムスタンプ文字列", addMinutes: "タイムスタンプ文字列",
    addSeconds: "タイムスタンプ文字列", addToTime: "タイムスタンプ文字列",
    convertFromUtc: "タイムスタンプ文字列", convertTimeZone: "タイムスタンプ文字列",
    convertToUtc: "タイムスタンプ文字列", dateDifference: "TimeSpan文字列",
    dayOfMonth: "日（整数）", dayOfWeek: "曜日（整数、日曜日=0）", dayOfYear: "年内通算日（整数）",
    formatDateTime: "整形した文字列", formatTimeSpan: "整形した文字列",
    getFutureTime: "タイムスタンプ文字列", getPastTime: "タイムスタンプ文字列",
    parseDateTime: "タイムスタンプ文字列（ISO 8601）", startOfDay: "タイムスタンプ文字列",
    startOfHour: "タイムスタンプ文字列", startOfMonth: "タイムスタンプ文字列",
    subtractFromTime: "タイムスタンプ文字列", ticks: "ticks（BigInt）", utcNow: "タイムスタンプ文字列",
    action: "アクション全体", actions: "アクションの入出力", body: "出力の body",
    formDataMultiValues: "フォームデータの値の配列", formDataValue: "フォームデータの値",
    items: "繰返しの対象コレクション", iterationIndexes: "インデックス",
    listCallbackUrl: "コールバック URL文字列", multipartBody: "multipart のパート",
    outputs: "アクションの出力全体", parameters: "パラメーターの値", result: "実行結果の配列",
    trigger: "トリガー全体", triggerBody: "トリガー出力の body",
    triggerFormDataMultiValues: "フォームデータの値の配列", triggerFormDataValue: "フォームデータの値",
    triggerMultipartBody: "multipart のパート", triggerOutputs: "トリガーの出力全体",
    variables: "変数の値", workflow: "ワークフローの情報",
    uriHost: "ホスト文字列", uriPath: "パス文字列", uriPathAndQuery: "パスとクエリの文字列",
    uriPort: "ポート番号（整数）", uriQuery: "クエリ文字列", uriScheme: "スキーム文字列",
    addProperty: "プロパティを追加したオブジェクト", coalesce: "null でない最初の値",
    decodeXmlName: "名前文字列", decodeXmlValue: "文字列", encodeXmlName: "符号化した名前文字列",
    encodeXmlValue: "符号化した文字列", mergeObjects: "統合したオブジェクト",
    removeProperty: "プロパティを取り除いたオブジェクト", setProperty: "プロパティを設定したオブジェクト",
    xpath: "ノードまたは値の配列（count の場合は整数）",
  };
  for (const r of reference)
    referenceDetails[r.name] = {
      returns: returnsByName[r.name] || "値",
      source: `${WDL_REFERENCE_URL}#${r.name.toLowerCase()}`,
    };
}

// ---------------------------------------------------------------------
// 値のヘルパー
// ---------------------------------------------------------------------
const isBinary = (v) =>
  !!v && typeof v === "object" && !Array.isArray(v) && v.kind === "binary" && typeof v.base64 === "string";
const isPlainObject = (v) =>
  !!v && typeof v === "object" && !Array.isArray(v) && !isBinary(v);
function fmt(v) {
  if (isBinary(v)) {
    const bytes = base64ToBytes(v.base64).length;
    return `バイナリ（${bytes}バイト、base64: ${v.base64}）`;
  }
  if (typeof v === "bigint") return v.toString();
  return formatModelValue(v);
}
function bytesToBase64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function base64ToBytes(b64) {
  const clean = String(b64).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1)
    throw new PracticeError(`Base64 文字列が不正です：${b64}`, 1);
  let bin;
  try {
    bin = atob(clean);
  } catch {
    throw new PracticeError(`Base64 文字列が不正です：${b64}`, 1);
  }
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const utf8ToBase64 = (text) => bytesToBase64(new TextEncoder().encode(text));
const base64ToUtf8 = (b64) => new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(b64));
function toDisplayString(v, fname) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "bigint") return v.toString();
  if (isBinary(v)) return v.base64;
  return JSON.stringify(v);
}
// 型変換して比べる equals 用の緩い等価（文字列は大小不区別、数値文字列は数値化）。
// Learn の論理比較の注記どおり、null は空文字列として比べる。また
// Learn の equals 例（equals(true, 1) は true）どおり、真偽値は
// 数値（true=1／false=0）とも比べる。
function looseEqual(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) {
    const other = a === null || a === undefined ? b : a;
    return other === null || other === undefined || other === "";
  }
  if (isBinary(a) || isBinary(b))
    return isBinary(a) && isBinary(b) && a.base64 === b.base64;
  if (typeof a === "number" || typeof b === "number") {
    const conv = (v) =>
      typeof v === "number" ? v : typeof v === "boolean" ? (v ? 1 : 0) : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    const na = conv(a), nb = conv(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
    if (typeof a === "boolean" || typeof b === "boolean") return false;
  }
  if (typeof a === "boolean" || typeof b === "boolean") {
    const ba = typeof a === "boolean" ? a : typeof a === "string" ? (a.toLowerCase() === "true" ? true : a.toLowerCase() === "false" ? false : null) : null;
    const bb = typeof b === "boolean" ? b : typeof b === "string" ? (b.toLowerCase() === "true" ? true : b.toLowerCase() === "false" ? false : null) : null;
    if (ba !== null && bb !== null) return ba === bb;
    return false;
  }
  if (typeof a === "string" && typeof b === "string")
    return a.toLowerCase() === b.toLowerCase();
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => looseEqual(x, b[i]));
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && looseEqual(a[k], b[k]));
  }
  return a === b;
}
function strictEqual(a, b) {
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b))
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => strictEqual(x, b[i]));
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && strictEqual(a[k], b[k]));
  }
  if (isBinary(a) || isBinary(b)) return isBinary(a) && isBinary(b) && a.base64 === b.base64;
  return a === b;
}
function compareValues(a, b, fname, line) {
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === "string" && typeof b === "string") {
    const x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  // 数値文字列との混在は数値として比べる（equals と同じ変換方針）。
  const na = typeof a === "string" && a.trim() !== "" ? Number(a) : NaN;
  const nb = typeof b === "string" && b.trim() !== "" ? Number(b) : NaN;
  if (typeof a === "number" && !Number.isNaN(nb)) return a < nb ? -1 : a > nb ? 1 : 0;
  if (typeof b === "number" && !Number.isNaN(na)) return na < b ? -1 : na > b ? 1 : 0;
  throw new PracticeError(`${fname}：比べられるのは数値同士または文字列同士だけです`, line);
}

// ---------------------------------------------------------------------
// 字句解析・構文解析（式だけの文法）
// ---------------------------------------------------------------------
function tokenize(source) {
  const out = [];
  let i = 0, line = 1;
  while (i < source.length) {
    const c = source[i];
    if (c === "\n") { out.push({ v: "\n", line }); line++; i++; continue; }
    if (c === " " || c === "\t" || c === "\r") { i++; continue; }
    if (c === "'") {
      // 文字列リテラル：'' は引用符のエスケープ。@{ } 補間と @@ は
      // 評価時に処理するため、生の内容をそのまま保持する。補間
      // @{...} の内側では入れ子の文字列リテラル（'A' など）が現れる
      // ため、補間の深さを数えながら走査し、内側の引用符で外側の
      // 文字列を閉じない。
      const start = line;
      let raw = "";
      i++;
      let closed = false, depth = 0, inNestedStr = false;
      while (i < source.length) {
        if (depth > 0) {
          if (inNestedStr) {
            if (source[i] === "'" && source[i + 1] === "'") { raw += "''"; i += 2; continue; }
            if (source[i] === "'") inNestedStr = false;
            raw += source[i++];
            continue;
          }
          if (source[i] === "'") { inNestedStr = true; raw += source[i++]; continue; }
          if (source[i] === "{") depth++;
          else if (source[i] === "}") depth--;
          raw += source[i++];
          continue;
        }
        if (source.startsWith("@{", i)) { depth = 1; raw += "@{"; i += 2; continue; }
        if (source[i] === "'") {
          if (source[i + 1] === "'") { raw += "''"; i += 2; continue; }
          i++; closed = true; break;
        }
        if (source[i] === "\n") throw new PracticeError("文字列の途中で改行されています", start, "SyntaxError");
        raw += source[i++];
      }
      if (!closed) throw new PracticeError("文字列が閉じられていません", start, "SyntaxError");
      out.push({ v: raw, k: "string", line: start });
      continue;
    }
    if (c === '"')
      throw new PracticeError("WDL の文字列は単一引用符（'...'）で書きます。二重引用符は JSON 文字列の中だけで使います", line, "SyntaxError");
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(source[i + 1] || ""))) {
      const m = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      out.push({ v: m[0], k: "number", line });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      out.push({ v: m[0], k: "id", line });
      i += m[0].length;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) { out.push({ v: two, line }); i += 2; continue; }
    if ("+-*/%<>!(),.[];@{}:".includes(c)) { out.push({ v: c, line }); i++; continue; }
    throw new PracticeError(`この文字は WDL の式では使えません：${c}`, line, "SyntaxError");
  }
  out.push({ v: "<eof>", line });
  return out;
}
// 文字列リテラルの生内容を、リテラル部分と @{式} の部分に分ける。
// '' → '、@@ → @ の展開もここで行う（補間の内側は式として解析する）。
function splitInterpolation(raw, line) {
  const parts = [];
  let text = "", i = 0;
  const pushText = () => { if (text) { parts.push({ k: "text", value: text }); text = ""; } };
  while (i < raw.length) {
    if (raw.startsWith("''", i)) { text += "'"; i += 2; continue; }
    if (raw.startsWith("@@", i)) { text += "@"; i += 2; continue; }
    if (raw.startsWith("@{", i)) {
      // 対応する } を探す（文字列リテラル内の } と入れ子を数える）。
      let depth = 1, j = i + 2, inStr = false;
      while (j < raw.length && depth > 0) {
        const ch = raw[j];
        if (inStr) {
          if (ch === "'") {
            if (raw[j + 1] === "'") { j += 2; continue; }
            inStr = false;
          }
          j++; continue;
        }
        if (ch === "'") { inStr = true; j++; continue; }
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        j++;
      }
      if (depth !== 0) throw new PracticeError("文字列の補間 @{...} が閉じられていません", line, "SyntaxError");
      pushText();
      parts.push({ k: "expr", node: parseSingleExpression(raw.slice(i + 2, j - 1), line) });
      i = j;
      continue;
    }
    text += raw[i++];
  }
  pushText();
  return parts;
}
const PRECEDENCE = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, ">": 4, "<=": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
class ExpressionParser {
  constructor(source, baseLine = 1) {
    this.ts = tokenize(source);
    this.i = 0;
    this.baseLine = baseLine;
  }
  peek() { return this.ts[this.i]; }
  take(v) {
    const t = this.ts[this.i++];
    if (v && t?.v !== v) throw new PracticeError(`式に ${v} が必要です`, t?.line || this.baseLine, "SyntaxError");
    return t;
  }
  skipSeparators() { while (this.peek()?.v === "\n" || this.peek()?.v === ";") this.i++; }
  parseProgram() {
    const exprs = [];
    this.skipSeparators();
    while (this.peek()?.v !== "<eof>") {
      exprs.push(this.parseExpression());
      if (!["\n", ";", "<eof>"].includes(this.peek()?.v))
        throw new PracticeError(`式の後に予期しない記号があります：${this.peek()?.v}`, this.peek()?.line || this.baseLine, "SyntaxError");
      this.skipSeparators();
    }
    if (!exprs.length) throw new PracticeError("式が書かれていません", this.baseLine, "SyntaxError");
    return exprs;
  }
  parseExpression(min = 0) {
    let t = this.take();
    if (!t || t.v === "<eof>") throw new PracticeError("式を解釈できません（式が途中で終わっています）", this.baseLine, "SyntaxError");
    let a;
    const meta = { line: t.line };
    if (t.k === "number") a = { ...meta, k: "literal", value: Number(t.v), raw: t.v };
    else if (t.k === "string") a = { ...meta, k: "stringLiteral", parts: splitInterpolation(t.v, t.line) };
    else if (t.v === "(") { a = this.parseExpression(0); this.take(")"); }
    else if (t.v === "-" || t.v === "+" || t.v === "!") a = { ...meta, k: "unary", op: t.v, arg: this.parseExpression(7) };
    else if (t.v === "[") throw new PracticeError("WDL の式に配列リテラルはありません。配列は createArray() などで作ります", t.line, "SyntaxError");
    else if (t.v === "{") throw new PracticeError("WDL の式にオブジェクトリテラルはありません。オブジェクトは json() などで作ります", t.line, "SyntaxError");
    else if (t.k === "id") {
      const lower = t.v.toLowerCase();
      if (lower === "true") a = { ...meta, k: "literal", value: true };
      else if (lower === "false") a = { ...meta, k: "literal", value: false };
      else if (lower === "null") a = { ...meta, k: "literal", value: null };
      else if (this.peek()?.v === "(") {
        this.take("(");
        const args = [];
        if (this.peek()?.v !== ")") {
          for (;;) {
            args.push(this.parseExpression(0));
            if (this.peek()?.v !== ",") break;
            this.take(",");
          }
        }
        this.take(")");
        a = { ...meta, k: "call", name: t.v, args };
      } else a = { ...meta, k: "name", name: t.v };
    } else throw new PracticeError(`式を解釈できません：${t.v}`, t.line, "SyntaxError");
    // 後置（メンバー参照・添字）と二項演算子。
    for (;;) {
      const op = this.peek();
      if (!op) break;
      if (op.v === ".") {
        this.take(".");
        const prop = this.take();
        if (prop?.k !== "id") throw new PracticeError("メンバー参照にはプロパティ名が必要です", op.line, "SyntaxError");
        a = { k: "member", target: a, name: prop.v, line: op.line };
        continue;
      }
      if (op.v === "[") {
        this.take("[");
        const index = this.parseExpression(0);
        this.take("]");
        a = { k: "index", target: a, index, line: op.line };
        continue;
      }
      const prec = PRECEDENCE[op.v];
      if (prec === undefined || prec < min) break;
      this.take();
      a = { k: "binary", op: op.v, a, b: this.parseExpression(prec + 1), line: op.line };
    }
    return a;
  }
}
function parseSingleExpression(source, line) {
  const p = new ExpressionParser(source, line);
  const node = p.parseExpression(0);
  if (p.peek()?.v !== "<eof>")
    throw new PracticeError("補間 @{...} の中の式を解釈できません", line, "SyntaxError");
  return node;
}
// プログラム全体の解析。先頭の @／@{...}（ワークフロー定義 JSON での
// 式の書き方）を剥がしてから式として読む。
function parseProgram(code) {
  const trimmed = code.trim();
  if (trimmed.startsWith("@{")) {
    // 全体が @{式} の形かを確認する（対応する } が末尾にある場合のみ）。
    let depth = 0, inStr = false, end = -1;
    for (let j = 1; j < trimmed.length; j++) {
      const ch = trimmed[j];
      if (inStr) {
        if (ch === "'") { if (trimmed[j + 1] === "'") j++; else inStr = false; }
        continue;
      }
      if (ch === "'") { inStr = true; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end === trimmed.length - 1)
      return [parseSingleExpression(trimmed.slice(2, end), 1)];
  }
  const body = trimmed.startsWith("@") ? trimmed.slice(1) : code;
  return new ExpressionParser(body).parseProgram();
}
function collectCallNames(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (node.k === "call") out.add(node.name);
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) v.forEach((x) => collectCallNames(x, out));
    else if (v && typeof v === "object") collectCallNames(v, out);
  }
  if (node.parts) for (const p of node.parts) if (p.node) collectCallNames(p.node, out);
  return out;
}

// ---------------------------------------------------------------------
// 日時ヘルパー（.NET 書式トークンの部分集合）
// ---------------------------------------------------------------------
const pad = (n, w = 2) => String(n).padStart(w, "0");
function utcParts(ms) {
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), ms: d.getUTCMilliseconds() };
}
const FORMAT_TOKENS = ["yyyy", "fff", "yy", "MM", "dd", "HH", "hh", "mm", "ss", "tt", "M", "d", "H", "h", "m", "s"];
// 同じ文字の長い並び（dddd=曜日名、MMMM=月名、yyyyy など）は、短い
// トークンの繰り返しとして誤って受理せず、並び自体を名指しで止める。
function checkFormatRun(format, i, fname, line) {
  // 位置 i から始まる「同じ英字の連続」だけを数える。異種の英字が
  // 混ざる並び（yyyyMMdd など）はトークンの連結として別途解釈
  // されるため、並びの途中で打ち切って判定する（dddd の直後に
  // リテラル T が続く形でも、dddd を名指しで止められる）。
  const ch = format[i];
  let run = "";
  if (/[A-Za-z]/.test(ch)) while (format[i + run.length] === ch) run += ch;
  const maxFor = { y: 4, M: 2, d: 2, H: 2, h: 2, m: 2, s: 2, f: 3, t: 2 };
  if (run && run.length > (maxFor[run[0]] ?? 0))
    throw new PracticeError(`${fname}：書式トークン「${run}」は未対応です（曜日名・月名などの名前表記には対応していません）`, line);
}
// .NET のカスタム日時書式では、T は書式指定子ではなくリテラル
// 文字である（Learn の formatDateTime 例が
// 'yyyy-MM-ddTHH:mm:ss' で '2018-03-15T12:00:00' を返す）。
// また '...'／"..." で囲んだ部分と、\ でエスケープした1文字も
// リテラルとして扱う（Learn の parseDateTime 例の 'HH\h' など）。
// 位置 i がリテラルの開始なら { text, next } を、そうでなければ
// null を返す。
function readFormatLiteral(format, i, fname, line) {
  const c = format[i];
  if (c === "T") return { text: "T", next: i + 1 };
  if (c === "\\") {
    if (i + 1 >= format.length)
      throw new PracticeError(`${fname}：書式の末尾の「\\」の後に文字がありません`, line);
    return { text: format[i + 1], next: i + 2 };
  }
  if (c === "'" || c === '"') {
    let text = "", j = i + 1;
    while (j < format.length) {
      if (format[j] === c) {
        if (format[j + 1] === c) { text += c; j += 2; continue; }
        return { text, next: j + 1 };
      }
      text += format[j];
      j++;
    }
    throw new PracticeError(`${fname}：書式の引用符「${c}」が閉じられていません`, line);
  }
  return null;
}
function formatParts(p, format, fname, line) {
  let out = "", i = 0;
  while (i < format.length) {
    const lit = readFormatLiteral(format, i, fname, line);
    if (lit) { out += lit.text; i = lit.next; continue; }
    checkFormatRun(format, i, fname, line);
    const token = FORMAT_TOKENS.find((t) => format.startsWith(t, i));
    if (token) {
      const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
      out += {
        yyyy: String(p.y).padStart(4, "0"), yy: pad(p.y % 100), MM: pad(p.mo), M: String(p.mo),
        dd: pad(p.d), d: String(p.d), HH: pad(p.h), H: String(p.h), hh: pad(h12), h: String(h12),
        mm: pad(p.mi), m: String(p.mi), ss: pad(p.s), s: String(p.s),
        fff: pad(p.ms, 3), tt: p.h < 12 ? "AM" : "PM",
      }[token];
      i += token.length;
      continue;
    }
    const c = format[i];
    if (/[A-Za-z]/.test(c))
      throw new PracticeError(`${fname}：書式トークン「${c}」は未対応です（対応：yyyy・MM・dd・HH・mm・ss・fff・tt など）`, line);
    out += c;
    i++;
  }
  return out;
}
// 書式を省略した場合の既定は、Learn が全日時関数で明記する
// .NET の "o" 形式（yyyy-MM-ddTHH:mm:ss.fffffffK、小数部7桁）。
// ゾーン情報を持つ入力では末尾に Z を付け、持たない入力では
// 付けない（formatDateTime('03/15/2018') の Learn 例が
// '2018-03-15T00:00:00.0000000' と末尾なしで返るため）。
function oFormat(ms, suffix) {
  const p = utcParts(ms);
  const frac = String(p.ms * 10000).padStart(7, "0");
  return `${String(p.y).padStart(4, "0")}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}.${frac}${suffix}`;
}
function oFormatParts(p) {
  const frac = String((p.ms || 0) * 10000).padStart(7, "0");
  return `${String(p.y).padStart(4, "0")}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}.${frac}`;
}
const zoneSuffixOf = (s) =>
  typeof s === "string" && /(?:[zZ]|[+-]\d{2}:?\d{2})\s*$/.test(s.trim()) ? "Z" : "";
const formatInstant = (ms, format, fname, line, suffix = "Z") =>
  format ? formatParts(utcParts(ms), format, fname, line) : oFormat(ms, suffix);
// タイムスタンプ文字列を絶対時刻（ミリ秒）へ変換する。変換できない
// 場合は NaN を返す。
// ゾーン指定（Z または ±hh:mm 等）のある文字列は、その指定自体が
// 絶対時刻を決めるため、結果は実行環境に依存しない。ゾーン指定の
// 無い文字列は、実 Power Automate／Logic Apps（サーバー側＝UTC で
// 動作するランタイム）の意味論どおり、書かれた壁時計をそのまま
// UTC として解釈する。JavaScript の Date.parse はゾーンなし文字列
// を実行環境のローカル時刻として解釈し、利用者のタイムゾーンで
// 結果が変わってしまうため、そのままでは使えない（台帳 RG-630。
// 根拠：Learn の formatDateTime 例は '03/15/2018' →
// '2018-03-15T00:00:00.0000000'、'03/15/2018 12:00:00' →
// '2018-03-15T12:00:00' と壁時計が保存されることを示す）。
function parseTimestampMs(value) {
  const s = value.trim();
  if (/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s)) return Date.parse(s);
  // ISO 形式の日付のみ（YYYY-MM-DD）は ECMAScript 仕様で UTC として
  // 解釈されるため、そのまま返す。
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(s);
  // 構造化できる形式は、構成要素を取り出して UTC で組み直す。
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?)?$/.exec(s);
  if (m) return utcFromParts(+m[1], +m[2], +m[3], m[4], m[5], m[6], m[7]);
  m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?)?$/.exec(s);
  if (m) return utcFromParts(+m[1], +m[2], +m[3], m[4], m[5], m[6], m[7]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?\s*([AaPp][Mm])?)?$/.exec(s);
  if (m) {
    let h = m[4] === undefined ? undefined : +m[4];
    if (m[8] !== undefined && h !== undefined) h = (h % 12) + (m[8].toLowerCase() === "pm" ? 12 : 0);
    return utcFromParts(+m[3], +m[1], +m[2], h, m[5], m[6], m[7]);
  }
  // それ以外の形式（月名を含む表記など）は Date.parse が受理する
  // 範囲を保ちつつ、ローカル時刻として解釈された壁時計を取り出して
  // UTC として組み直す。
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return NaN;
  const d = new Date(ms);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}
// 月・日の範囲外（13月・32日など）は Date.parse と同じく解釈不能
// とし、それ以外の桁あふれ（2月30日など）は Date.UTC の繰り上げで
// Date.parse の従来挙動に合わせる。
function utcFromParts(y, mo, d, h, mi, sec, frac) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return NaN;
  const hh = h === undefined ? 0 : +h, mm = mi === undefined ? 0 : +mi, ss = sec === undefined ? 0 : +sec;
  if (hh > 23 || mm > 59 || ss > 59) return NaN;
  const ms = frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0;
  return Date.UTC(y, mo - 1, d, hh, mm, ss, ms);
}
function parseTimestamp(value, fname, line) {
  if (typeof value !== "string")
    throw new PracticeError(`${fname}：タイムスタンプは文字列で指定してください`, line);
  const ms = parseTimestampMs(value);
  if (Number.isNaN(ms))
    throw new PracticeError(`${fname}：タイムスタンプとして解釈できません：${value}`, line);
  return ms;
}
function parseWithFormat(value, format, fname, line) {
  // 書式トークンを正規表現へ変換し、UTC の壁時計として解釈する。
  let pattern = "", i = 0;
  const fields = [];
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  while (i < format.length) {
    const lit = readFormatLiteral(format, i, fname, line);
    if (lit) { pattern += escapeRe(lit.text); i = lit.next; continue; }
    checkFormatRun(format, i, fname, line);
    const token = FORMAT_TOKENS.find((t) => format.startsWith(t, i));
    if (token) {
      fields.push(token);
      pattern += token === "tt" ? "(AM|PM)" : token === "fff" ? "(\\d{1,3})" : "(\\d+)";
      i += token.length;
      continue;
    }
    const c = format[i];
    if (/[A-Za-z]/.test(c))
      throw new PracticeError(`${fname}：書式トークン「${c}」は未対応です`, line);
    pattern += escapeRe(c);
    i++;
  }
  const m = new RegExp("^" + pattern + "$").exec(value.trim());
  if (!m) throw new PracticeError(`${fname}：書式 ${format} で解釈できません：${value}`, line);
  const p = { y: 1970, mo: 1, d: 1, h: 0, mi: 0, s: 0, ms: 0 };
  let pm = false, h12 = null;
  fields.forEach((token, idx) => {
    const v = m[idx + 1];
    if (token === "yyyy") p.y = Number(v);
    else if (token === "yy") p.y = 2000 + Number(v);
    else if (token === "MM" || token === "M") p.mo = Number(v);
    else if (token === "dd" || token === "d") p.d = Number(v);
    else if (token === "HH" || token === "H") p.h = Number(v);
    else if (token === "hh" || token === "h") h12 = Number(v);
    else if (token === "mm" || token === "m") p.mi = Number(v);
    else if (token === "ss" || token === "s") p.s = Number(v);
    else if (token === "fff") p.ms = Number(v.padEnd(3, "0"));
    else if (token === "tt") pm = v === "PM";
  });
  if (h12 !== null) p.h = (h12 % 12) + (pm ? 12 : 0);
  const ms = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s, p.ms);
  const back = utcParts(ms);
  if (back.y !== p.y || back.mo !== p.mo || back.d !== p.d)
    throw new PracticeError(`${fname}：日付として解釈できません：${value}`, line);
  return ms;
}
function addTimeUnit(ms, interval, unit, fname, line) {
  const u = String(unit).toLowerCase().replace(/s$/, "");
  const p = utcParts(ms);
  if (u === "second") return ms + interval * 1000;
  if (u === "minute") return ms + interval * 60000;
  if (u === "hour") return ms + interval * 3600000;
  if (u === "day") return ms + interval * 86400000;
  if (u === "week") return ms + interval * 7 * 86400000;
  if (u === "month" || u === "year") {
    // .NET の AddMonths／AddYears と同じく、移動先の月に同じ日が
    // 無い場合はその月の末日に丸める（1月31日の1か月後は2月28日）。
    const months = u === "month" ? interval : interval * 12;
    const first = new Date(Date.UTC(p.y, p.mo - 1 + months, 1));
    const ty = first.getUTCFullYear(), tm = first.getUTCMonth();
    const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    return Date.UTC(ty, tm, Math.min(p.d, lastDay), p.h, p.mi, p.s, p.ms);
  }
  throw new PracticeError(`${fname}：時間単位「${unit}」は未対応です（Second／Minute／Hour／Day／Week／Month／Year）`, line);
}
function timespanString(diffMs) {
  const sign = diffMs < 0 ? "-" : "";
  let rest = Math.abs(Math.round(diffMs));
  const days = Math.floor(rest / 86400000); rest -= days * 86400000;
  const h = Math.floor(rest / 3600000); rest -= h * 3600000;
  const mi = Math.floor(rest / 60000); rest -= mi * 60000;
  const s = Math.floor(rest / 1000); rest -= s * 1000;
  // .NET の TimeSpan 標準形式（"c"）どおり、小数部が0のときは
  // 小数部自体を省略する（Learn の dateDifference 例：
  // "1268.00:00:00"）。
  const frac = rest ? "." + String(rest * 10000).padStart(7, "0") : "";
  return `${sign}${days ? days + "." : ""}${pad(h)}:${pad(mi)}:${pad(s)}${frac}`;
}
function parseTimespan(value, fname, line) {
  if (typeof value !== "string")
    throw new PracticeError(`${fname}：TimeSpan は文字列で指定してください`, line);
  const m = /^(-)?(?:(\d+)\.)?(\d+):([0-5]?\d):([0-5]?\d)(?:\.(\d{1,7}))?$/.exec(value.trim());
  if (!m) throw new PracticeError(`${fname}：TimeSpan として解釈できません：${value}`, line);
  const ms = ((Number(m[2] || 0) * 24 + Number(m[3])) * 3600 + Number(m[4]) * 60 + Number(m[5])) * 1000 +
    (m[6] ? Number(m[6].padEnd(7, "0")) / 10000 : 0);
  return (m[1] ? -1 : 1) * ms;
}
// タイムゾーン変換（Intl 使用）。Windows のタイムゾーン ID の代表例を
// IANA 名へ寄せ、IANA 名はそのまま Intl で検証する。
const WINDOWS_TZ = {
  "UTC": "UTC", "Tokyo Standard Time": "Asia/Tokyo", "Korea Standard Time": "Asia/Seoul",
  "China Standard Time": "Asia/Shanghai", "India Standard Time": "Asia/Kolkata",
  "Pacific Standard Time": "America/Los_Angeles", "Mountain Standard Time": "America/Denver",
  "Central Standard Time": "America/Chicago", "Eastern Standard Time": "America/New_York",
  "Alaskan Standard Time": "America/Anchorage", "Hawaiian Standard Time": "Pacific/Honolulu",
  "GMT Standard Time": "Europe/London", "W. Europe Standard Time": "Europe/Berlin",
  "AUS Eastern Standard Time": "Australia/Sydney", "New Zealand Standard Time": "Pacific/Auckland",
};
function resolveTimeZone(name, fname, line) {
  // タイムゾーン名は大文字小文字を区別せずに解決する（Windows ID
  // の表からも、IANA 名の正規表記からも探す）。
  const winKey = Object.keys(WINDOWS_TZ).find((k) => k.toLowerCase() === String(name).toLowerCase());
  let tz = winKey ? WINDOWS_TZ[winKey] : name;
  if (!winKey && typeof Intl.supportedValuesOf === "function") {
    const canon = Intl.supportedValuesOf("timeZone").find((z) => z.toLowerCase() === String(name).toLowerCase());
    if (canon) tz = canon;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    throw new PracticeError(`${fname}：タイムゾーン「${name}」は未対応です（Windows のタイムゾーン ID か IANA 名で指定してください）`, line);
  }
}
function zonedParts(ms, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t) => Number(parts.find((x) => x.type === t).value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour") % 24, mi: get("minute"), s: get("second"), ms: ((ms % 1000) + 1000) % 1000 };
}
function zoneOffsetMs(ms, tz) {
  const p = zonedParts(ms, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}
function wallToInstant(p, tz) {
  const wall = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s, p.ms || 0);
  let instant = wall - zoneOffsetMs(wall, tz);
  instant = wall - zoneOffsetMs(instant, tz);
  return instant;
}
function wallPartsOf(value, fname, line) {
  if (typeof value !== "string")
    throw new PracticeError(`${fname}：タイムスタンプは文字列で指定してください`, line);
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?/.exec(value.trim());
  if (!m) throw new PracticeError(`${fname}：タイムスタンプとして解釈できません：${value}`, line);
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +(m[6] || 0), ms: m[7] ? Number(m[7].padEnd(3, "0").slice(0, 3)) : 0 };
}

// ---------------------------------------------------------------------
// XML ヘルパー（整形式の部分集合のパーサと XPath の部分集合）
// ---------------------------------------------------------------------
const XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodeXmlEntities = (s) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, body) => {
    if (body.startsWith("#x")) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return XML_ENTITIES[body];
  });
const encodeXmlText = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
function parseXml(source, fname, line) {
  let i = 0;
  const fail = (msg) => { throw new PracticeError(`${fname}：XML が不正です（${msg}）`, line); };
  const skipMisc = () => {
    for (;;) {
      while (i < source.length && /\s/.test(source[i])) i++;
      if (source.startsWith("<?", i)) { const e = source.indexOf("?>", i); if (e < 0) fail("処理命令が閉じられていません"); i = e + 2; continue; }
      if (source.startsWith("<!--", i)) { const e = source.indexOf("-->", i); if (e < 0) fail("コメントが閉じられていません"); i = e + 3; continue; }
      if (source.startsWith("<!", i)) { const e = source.indexOf(">", i); if (e < 0) fail("宣言が閉じられていません"); i = e + 1; continue; }
      break;
    }
  };
  function parseElement() {
    // source[i] === '<' の前提。
    i++;
    const nameMatch = /^[A-Za-z_][\w:.-]*/.exec(source.slice(i));
    if (!nameMatch) fail("要素名が必要です");
    const tag = nameMatch[0];
    i += tag.length;
    const attrs = {};
    for (;;) {
      while (i < source.length && /\s/.test(source[i])) i++;
      if (source.startsWith("/>", i)) { i += 2; return { tag, attrs, children: [], text: "" }; }
      if (source[i] === ">") { i++; break; }
      const am = /^[^\s=/>]+/.exec(source.slice(i));
      if (!am) fail("属性が不正です");
      const aname = am[0];
      i += aname.length;
      while (/\s/.test(source[i] || "")) i++;
      if (source[i] !== "=") fail(`属性 ${aname} に = が必要です`);
      i++;
      while (/\s/.test(source[i] || "")) i++;
      const q = source[i];
      if (q !== '"' && q !== "'") fail("属性値は引用符で囲みます");
      const end = source.indexOf(q, i + 1);
      if (end < 0) fail("属性値が閉じられていません");
      attrs[aname] = decodeXmlEntities(source.slice(i + 1, end));
      i = end + 1;
    }
    const children = [];
    let text = "";
    for (;;) {
      if (i >= source.length) fail(`要素 <${tag}> が閉じられていません`);
      if (source.startsWith(`</${tag}>`, i)) { i += tag.length + 3; return { tag, attrs, children, text }; }
      if (source.startsWith("<!--", i)) { const e = source.indexOf("-->", i); if (e < 0) fail("コメントが閉じられていません"); i = e + 3; continue; }
      if (source.startsWith("<![CDATA[", i)) {
        const e = source.indexOf("]]>", i);
        if (e < 0) fail("CDATA が閉じられていません");
        text += source.slice(i + 9, e);
        i = e + 3;
        continue;
      }
      if (source[i] === "<") { children.push(parseElement()); continue; }
      const next = source.indexOf("<", i);
      const chunk = next < 0 ? source.slice(i) : source.slice(i, next);
      text += decodeXmlEntities(chunk);
      i = next < 0 ? source.length : next;
    }
  }
  skipMisc();
  if (source[i] !== "<") fail("ルート要素が必要です");
  const root = parseElement();
  skipMisc();
  if (i < source.length) fail("ルート要素の後に余分な内容があります");
  return root;
}
function serializeXml(node) {
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${encodeXmlText(v)}"`).join("");
  if (!node.children.length && node.text === "") return `<${node.tag}${attrs}/>`;
  const inner = node.children.length ? node.children.map(serializeXml).join("") : encodeXmlText(node.text);
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}
function objectToXml(node, fname, line) {
  const build = (tag, value) => {
    if (value === null || value === undefined) return `<${tag}/>`;
    if (Array.isArray(value)) return value.map((v) => build(tag, v)).join("");
    if (isPlainObject(value)) {
      const attrs = {}, children = [];
      let text = "";
      for (const [k, v] of Object.entries(value)) {
        if (k.startsWith("@")) attrs[k.slice(1)] = toDisplayString(v, fname);
        else if (k === "#text") text = toDisplayString(v, fname);
        else children.push(build(k, v));
      }
      const attrStr = Object.entries(attrs).map(([k, v]) => ` ${k}="${encodeXmlText(v)}"`).join("");
      const inner = children.join("") + (text ? encodeXmlText(text) : "");
      return inner ? `<${tag}${attrStr}>${inner}</${tag}>` : `<${tag}${attrStr}/>`;
    }
    return `<${tag}>${encodeXmlText(toDisplayString(value, fname))}</${tag}>`;
  };
  const keys = Object.keys(node);
  if (keys.length !== 1)
    throw new PracticeError("xml：オブジェクトを XML に変換するには、ルート要素名のキーが1つ必要です", line);
  return build(keys[0], node[keys[0]]);
}
function evalXpath(xmlText, expression, line) {
  const fname = "xpath";
  let expr = String(expression).trim();
  let countMode = false;
  const countMatch = /^count\((.*)\)$/.exec(expr);
  if (countMatch) { countMode = true; expr = countMatch[1].trim(); }
  if (/::|\(\)(?!$)/.test(expr.replace(/text\(\)$/, "")) && !countMode)
    throw new PracticeError(`xpath：式「${expression}」の軸や関数は未対応です（要素名の並び、//、[n]、[@属性='値']、/@属性、/text()、count(...) のみ対応）`, line);
  const root = parseXml(xmlText, fname, line);
  const descendantFirst = expr.startsWith("//");
  let body = expr.replace(/^\//, "").replace(/^\//, "");
  if (!body) throw new PracticeError("xpath：パスが空です", line);
  const steps = body.split("/").filter((s) => s !== "");
  let current = [root];
  let resultKind = "elements";
  steps.forEach((step, idx) => {
    if (step.startsWith("@")) {
      if (idx !== steps.length - 1) throw new PracticeError("xpath：/@属性 は最後にだけ置けます", line);
      resultKind = "attrs";
      const aname = step.slice(1);
      current = current.filter((n) => Object.hasOwn(n.attrs, aname)).map((n) => n.attrs[aname]);
      return;
    }
    if (step === "text()") {
      if (idx !== steps.length - 1) throw new PracticeError("xpath：/text() は最後にだけ置けます", line);
      resultKind = "texts";
      current = current.map((n) => n.text);
      return;
    }
    const m = /^([A-Za-z_][\w:.-]*|\*)(?:\[(\d+)\]|\[@([\w:.-]+)='([^']*)'\])?$/.exec(step);
    if (!m) throw new PracticeError(`xpath：ステップ「${step}」は未対応です`, line);
    const [, tag, nth, attrName, attrValue] = m;
    let next = [];
    const collect = (node, deep) => {
      for (const child of node.children) {
        if (tag === "*" || child.tag === tag) next.push(child);
        if (deep) collect(child, true);
      }
    };
    if (idx === 0) {
      if (descendantFirst) {
        if (tag === "*" || root.tag === tag) next.push(root);
        collect(root, true);
      } else {
        if (tag !== "*" && root.tag !== tag)
          throw new PracticeError(`xpath：ルート要素は <${root.tag}> で、パスは /${root.tag} から始める必要があります`, line);
        next = [root];
      }
    } else for (const node of current) collect(node, false);
    if (attrName) next = next.filter((n) => n.attrs[attrName] === attrValue);
    if (nth) {
      const pick = next[Number(nth) - 1];
      next = pick ? [pick] : [];
    }
    current = next;
  });
  if (countMode) return current.length;
  if (resultKind === "elements") return current.map((n) => (typeof n === "string" ? n : serializeXml(n)));
  return current.map((v) => String(v));
}

// ---------------------------------------------------------------------
// 評価器
// ---------------------------------------------------------------------
const CANONICAL = new Map(reference.map((r) => [r.name.toLowerCase(), r.name]));
function reqStr(v, fname, line) {
  if (typeof v !== "string") throw new PracticeError(`${fname}：文字列が必要です`, line);
  return v;
}
function reqNum(v, fname, line) {
  if (typeof v !== "number" || Number.isNaN(v)) throw new PracticeError(`${fname}：数値が必要です`, line);
  return v;
}
function reqInt(v, fname, line) {
  reqNum(v, fname, line);
  if (!Number.isInteger(v)) throw new PracticeError(`${fname}：整数が必要です`, line);
  return v;
}
function reqArr(v, fname, line) {
  if (!Array.isArray(v)) throw new PracticeError(`${fname}：配列が必要です`, line);
  return v;
}
function reqObj(v, fname, line) {
  if (!isPlainObject(v)) throw new PracticeError(`${fname}：JSON オブジェクトが必要です`, line);
  return v;
}
function reqBool(v, fname, line) {
  if (typeof v !== "boolean") throw new PracticeError(`${fname}：真偽値が必要です`, line);
  return v;
}
function checkLocale(v, fname, line, allowed = ["en-US", "ja-JP"]) {
  if (v === undefined) return;
  if (typeof v !== "string" || !allowed.some((a) => a.toLowerCase() === v.toLowerCase()))
    throw new PracticeError(`${fname}：ロケール「${v}」は未対応です（対応：${allowed.join("／")}）`, line);
}
function parseNumberString(v, fname, line) {
  // 不変カルチャの数値解釈では桁区切りのカンマを許す（Learn の
  // 例 float('10,000.333') は 10000.333）。カンマは取り除く。
  const t = String(v).trim().replace(/,/g, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(t))
    throw new PracticeError(`${fname}：数値として解釈できません：${v}`, line);
  return Number(t);
}
function formatNumberImpl(value, format, locale, line) {
  const fname = "formatNumber";
  checkLocale(locale, fname, line);
  const currency = /^([Cc])(\d+)?$/.exec(format);
  if (currency) {
    const ja = (locale || "en-US").toLowerCase() === "ja-jp";
    const digits = currency[2] !== undefined ? Number(currency[2]) : ja ? 0 : 2;
    const fixed = Math.abs(value).toFixed(digits);
    const [ip, fp = ""] = fixed.split(".");
    const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (value < 0 ? "-" : "") + (ja ? "¥" : "$") + grouped + (fp ? "." + fp : "");
  }
  if (/[a-zA-Z]/.test(format.replace(/%/g, "")))
    throw new PracticeError(`${fname}：書式「${format}」は未対応です（対応：0・#・小数点・桁区切り・% のカスタム書式と C）`, line);
  const pct = (format.match(/%/g) || []).length;
  const scaled = value * Math.pow(100, pct);
  const dotAt = format.indexOf(".");
  const intFmt = dotAt < 0 ? format : format.slice(0, dotAt);
  const fracFmt = dotAt < 0 ? "" : format.slice(dotAt + 1);
  const fracPh = fracFmt.replace(/[^0#]/g, "");
  const fracCount = fracPh.length;
  const mandatoryFrac = fracPh.split("").reduce((acc, c, idx) => (c === "0" ? idx + 1 : acc), 0);
  const intPh = intFmt.replace(/[^0#]/g, "");
  const minInt = intPh.split("").filter((c) => c === "0").length;
  const grouping = /0|#/.test(intFmt.split(",")[0] || "") && intFmt.includes(",");
  const fixed = Math.abs(scaled).toFixed(fracCount);
  let [ip, fp = ""] = fixed.split(".");
  while (fp.length > mandatoryFrac && fp.endsWith("0")) fp = fp.slice(0, -1);
  let intDisplay = ip === "0" && minInt === 0 && !/[1-9]/.test(fp) && scaled === 0 ? "" : ip.padStart(minInt, "0");
  if (grouping && intDisplay.length > 3) intDisplay = intDisplay.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // リテラル文字（% を除く）は書式内の位置どおりに残す簡易モデル：
  // 先頭・末尾のリテラルだけを保持する。
  const leadLit = (intFmt.match(/^[^0#.,]*/) || [""])[0];
  const tailLit = ((dotAt < 0 ? intFmt : fracFmt).match(/[^0#.,]*$/) || [""])[0];
  return (scaled < 0 ? "-" : "") + leadLit + intDisplay + (fp ? "." + fp : "") + "%".repeat(pct) + (tailLit === "%" ? "" : tailLit.replace(/%/g, ""));
}
function deterministicGuid(state) {
  const seedText = String(state.model.guidSeed) + ":" + state.guidCounter++;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  let s = h || 1;
  const bytes = [];
  for (let i = 0; i < 16; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; bytes.push((s >>> 16) & 0xff); }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes;
}
const guidHex = (bytes) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
function parseDataUri(value, fname, line) {
  const m = /^data:([^,]*?)(;base64)?,([\s\S]*)$/.exec(value);
  if (!m) throw new PracticeError(`${fname}：data URI として解釈できません：${value}`, line);
  if (m[2]) return base64ToBytes(m[3]);
  return new TextEncoder().encode(decodeURIComponent(m[3]));
}

const EAGER = {
  // 文字列
  chunk: { min: 2, max: 2, run([v, size], ctx) {
    const n = reqInt(size, "chunk", ctx.line);
    if (n <= 0) throw new PracticeError("chunk：長さは1以上で指定してください", ctx.line);
    if (typeof v === "string") { const out = []; for (let i = 0; i < v.length; i += n) out.push(v.slice(i, i + n)); return out; }
    if (Array.isArray(v)) { const out = []; for (let i = 0; i < v.length; i += n) out.push(v.slice(i, i + n)); return out; }
    throw new PracticeError("chunk：文字列または配列が必要です", ctx.line);
  } },
  concat: { min: 1, max: Infinity, run(args, ctx) {
    if (args.some((a) => Array.isArray(a))) {
      if (!args.every((a) => Array.isArray(a))) throw new PracticeError("concat：文字列と配列を混ぜることはできません", ctx.line);
      return args.flat();
    }
    return args.map((a) => toDisplayString(a, "concat")).join("");
  } },
  endsWith: { min: 2, max: 2, run: ([t, s], ctx) => reqStr(t, "endsWith", ctx.line).toLowerCase().endsWith(reqStr(s, "endsWith", ctx.line).toLowerCase()) },
  formatNumber: { min: 2, max: 3, run: ([v, f, locale], ctx) => formatNumberImpl(reqNum(v, "formatNumber", ctx.line), reqStr(f, "formatNumber", ctx.line), locale, ctx.line) },
  guid: { min: 0, max: 1, run([format], ctx) {
    const bytes = deterministicGuid(ctx.state);
    const hex = guidHex(bytes);
    const d = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const f = format === undefined ? "D" : String(format).toUpperCase();
    if (f === "D") return d;
    if (f === "N") return hex;
    if (f === "B") return "{" + d + "}";
    if (f === "P") return "(" + d + ")";
    if (f === "X") {
      const words = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16)];
      const rest = [];
      for (let i = 16; i < 32; i += 2) rest.push("0x" + hex.slice(i, i + 2));
      return `{0x${words[0]},0x${words[1]},0x${words[2]},{${rest.join(",")}}}`;
    }
    throw new PracticeError(`guid：書式「${format}」は未対応です（D／N／B／P／X）`, ctx.line);
  } },
  indexOf: { min: 2, max: 2, run: ([t, s], ctx) => reqStr(t, "indexOf", ctx.line).toLowerCase().indexOf(reqStr(s, "indexOf", ctx.line).toLowerCase()) },
  isFloat: { min: 1, max: 2, run([v, locale], ctx) {
    checkLocale(locale, "isFloat", ctx.line);
    // 不変カルチャでは桁区切りのカンマを許す（Learn の例
    // isFloat('10,000.00') は true）。.NET の寛容さに倣い、
    // カンマの位置は問わず取り除いてから判定する。
    return typeof v === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v.trim().replace(/,/g, ""));
  } },
  isInt: { min: 1, max: 2, run([v, locale], ctx) {
    checkLocale(locale, "isInt", ctx.line);
    return typeof v === "string" && /^[+-]?\d+$/.test(v.trim());
  } },
  lastIndexOf: { min: 2, max: 2, run([t, s], ctx) {
    const text = reqStr(t, "lastIndexOf", ctx.line), sub = reqStr(s, "lastIndexOf", ctx.line);
    // Learn の明記する空文字列の境界：検索文字列が空のときは
    // 「文字列の長さ − 1」（両方とも空のときは 0）を返す。
    if (sub === "") return text === "" ? 0 : text.length - 1;
    return text.toLowerCase().lastIndexOf(sub.toLowerCase());
  } },
  length: { min: 1, max: 1, run([v], ctx) {
    if (typeof v === "string" || Array.isArray(v)) return v.length;
    throw new PracticeError("length：文字列または配列が必要です", ctx.line);
  } },
  nthIndexOf: { min: 3, max: 3, run([t, s, occ], ctx) {
    const text = reqStr(t, "nthIndexOf", ctx.line).toLowerCase(), sub = reqStr(s, "nthIndexOf", ctx.line).toLowerCase();
    const n = reqInt(occ, "nthIndexOf", ctx.line);
    if (n === 0) throw new PracticeError("nthIndexOf：occurrence は0以外で指定してください（負の数は末尾から数えます）", ctx.line);
    // 出現位置を全て集め、正の occurrence は先頭から、負の
    // occurrence は末尾から数える（Learn の明記どおり）。
    const positions = [];
    for (let from = 0;;) {
      const at = text.indexOf(sub, from);
      if (at < 0) break;
      positions.push(at);
      from = at + Math.max(sub.length, 1);
    }
    const picked = n > 0 ? positions[n - 1] : positions[positions.length + n];
    return picked === undefined ? -1 : picked;
  } },
  replace: { min: 3, max: 3, run([t, oldS, newS], ctx) {
    const text = reqStr(t, "replace", ctx.line), target = reqStr(oldS, "replace", ctx.line), repl = reqStr(newS, "replace", ctx.line);
    if (target === "") throw new PracticeError("replace：置き換え元の文字列が空です", ctx.line);
    // Learn の明記どおり、replace は大文字と小文字を区別する。
    return text.split(target).join(repl);
  } },
  slice: { min: 2, max: 3, run([v, start, end], ctx) {
    if (typeof v !== "string" && !Array.isArray(v)) throw new PracticeError("slice：文字列または配列が必要です", ctx.line);
    const len = v.length;
    // Learn の明記どおり、範囲外の位置はエラーにせず、開始位置が
    // 長さを超えたら空を返し、終了位置は末尾までに丸める。
    const norm = (x) => { const n = reqInt(x, "slice", ctx.line); const p = n < 0 ? len + n : n; return Math.min(Math.max(p, 0), len); };
    const s = norm(start), e = end === undefined ? len : norm(end);
    return v.slice(s, Math.max(s, e));
  } },
  split: { min: 2, max: 2, run([t, d], ctx) {
    const delim = reqStr(d, "split", ctx.line);
    if (delim === "") throw new PracticeError("split：区切り文字列が空です", ctx.line);
    return reqStr(t, "split", ctx.line).split(delim);
  } },
  startsWith: { min: 2, max: 2, run: ([t, s], ctx) => reqStr(t, "startsWith", ctx.line).toLowerCase().startsWith(reqStr(s, "startsWith", ctx.line).toLowerCase()) },
  substring: { min: 2, max: 3, run([t, start, len], ctx) {
    const text = reqStr(t, "substring", ctx.line), s = reqInt(start, "substring", ctx.line);
    // length は省略でき、省略時は開始位置から末尾まで（Learn の明記）。
    const n = len === undefined ? text.length - s : reqInt(len, "substring", ctx.line);
    if (s < 0 || n < 0 || s + n > text.length) throw new PracticeError(`substring：範囲が文字列の長さを超えています（開始 ${s}、長さ ${n}、文字列の長さ ${text.length}）`, ctx.line);
    return text.slice(s, s + n);
  } },
  toLower: { min: 1, max: 1, run: ([v], ctx) => reqStr(v, "toLower", ctx.line).toLowerCase() },
  toUpper: { min: 1, max: 1, run: ([v], ctx) => reqStr(v, "toUpper", ctx.line).toUpperCase() },
  trim: { min: 1, max: 1, run: ([v], ctx) => reqStr(v, "trim", ctx.line).trim() },
  trimByteOrderMark: { min: 1, max: 1, run([v], ctx) {
    // Learn の明記どおり、取り除くのは先頭の BOM だけであり、
    // null を渡すと空文字列を返す。バイナリ値にも使える。
    if (v === null || v === undefined) return "";
    if (isBinary(v)) {
      const bytes = base64ToBytes(v.base64);
      const stripped = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.slice(3) : bytes;
      return { kind: "binary", base64: bytesToBase64(stripped) };
    }
    return reqStr(v, "trimByteOrderMark", ctx.line).replace(/^﻿+/, "");
  } },
  // コレクション
  contains: { min: 2, max: 2, run([c, v], ctx) {
    // Learn の明記どおり、contains は大文字と小文字を区別する
    // （endsWith や indexOf などとは異なる）。
    if (typeof c === "string") return typeof v === "string" ? c.includes(v) : false;
    if (Array.isArray(c)) return c.some((x) => strictEqual(x, v));
    if (isPlainObject(c)) return typeof v === "string" && Object.hasOwn(c, v);
    throw new PracticeError("contains：コレクション、文字列、またはオブジェクトが必要です", ctx.line);
  } },
  empty: { min: 1, max: 1, run([v], ctx) {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return v.length === 0;
    if (Array.isArray(v)) return v.length === 0;
    if (isPlainObject(v)) return Object.keys(v).length === 0;
    throw new PracticeError("empty：コレクション、文字列、または null が必要です（数値や真偽値には使えません）", ctx.line);
  } },
  first: { min: 1, max: 1, run([v], ctx) {
    if (typeof v === "string") return v.length ? v[0] : null;
    if (Array.isArray(v)) return v.length ? v[0] : null;
    throw new PracticeError("first：配列または文字列が必要です", ctx.line);
  } },
  intersection: { min: 2, max: Infinity, run(args, ctx) {
    const arrays = args.map((a) => reqArr(a, "intersection", ctx.line));
    return arrays[0].filter((x, i) => arrays[0].findIndex((y) => looseEqual(y, x)) === i && arrays.slice(1).every((a) => a.some((y) => looseEqual(y, x))));
  } },
  join: { min: 2, max: 2, run: ([a, d], ctx) => reqArr(a, "join", ctx.line).map((x) => toDisplayString(x, "join")).join(reqStr(d, "join", ctx.line)) },
  last: { min: 1, max: 1, run([v], ctx) {
    if (typeof v === "string") return v.length ? v[v.length - 1] : null;
    if (Array.isArray(v)) return v.length ? v[v.length - 1] : null;
    throw new PracticeError("last：配列または文字列が必要です", ctx.line);
  } },
  reverse: { min: 1, max: 1, run: ([a], ctx) => [...reqArr(a, "reverse", ctx.line)].reverse() },
  skip: { min: 2, max: 2, run([a, n], ctx) {
    const count = reqInt(n, "skip", ctx.line);
    if (count < 0) throw new PracticeError("skip：個数は0以上で指定してください", ctx.line);
    return reqArr(a, "skip", ctx.line).slice(count);
  } },
  sort: { min: 1, max: 2, run([a, key], ctx) {
    const arr = [...reqArr(a, "sort", ctx.line)];
    const valueOf = (x) => {
      if (key === undefined) return x;
      if (!isPlainObject(x) || !Object.hasOwn(x, key)) throw new PracticeError(`sort：プロパティ「${key}」が無い要素があります`, ctx.line);
      return x[key];
    };
    const vals = arr.map(valueOf);
    // Learn の明記どおり、並べ替えのキーは int・float・string・
    // bool のいずれか。真偽値同士（false < true）も並べ替えられる。
    const kinds = new Set(vals.map((v) => (typeof v === "number" ? "n" : typeof v === "string" ? "s" : typeof v === "boolean" ? "b" : "?")));
    if (kinds.has("?") || kinds.size > 1) throw new PracticeError("sort：要素は数値同士・文字列同士・真偽値同士でなければなりません", ctx.line);
    return arr.sort((x, y) => {
      const vx = valueOf(x), vy = valueOf(y);
      if (typeof vx === "boolean" && typeof vy === "boolean") return vx === vy ? 0 : vx ? 1 : -1;
      return compareValues(vx, vy, "sort", ctx.line);
    });
  } },
  take: { min: 2, max: 2, run([v, n], ctx) {
    const count = reqInt(n, "take", ctx.line);
    if (count < 0) throw new PracticeError("take：個数は0以上で指定してください", ctx.line);
    if (typeof v === "string" || Array.isArray(v)) return v.slice(0, count);
    throw new PracticeError("take：配列または文字列が必要です", ctx.line);
  } },
  union: { min: 2, max: Infinity, run(args, ctx) {
    const out = [];
    for (const a of args) for (const x of reqArr(a, "union", ctx.line)) if (!out.some((y) => looseEqual(y, x))) out.push(x);
    return out;
  } },
  // 論理比較（eager なもの）
  equals: { min: 2, max: 2, run: ([a, b]) => looseEqual(a, b) },
  greater: { min: 2, max: 2, run: ([a, b], ctx) => compareValues(a, b, "greater", ctx.line) > 0 },
  greaterOrEquals: { min: 2, max: 2, run: ([a, b], ctx) => compareValues(a, b, "greaterOrEquals", ctx.line) >= 0 },
  less: { min: 2, max: 2, run: ([a, b], ctx) => compareValues(a, b, "less", ctx.line) < 0 },
  lessOrEquals: { min: 2, max: 2, run: ([a, b], ctx) => compareValues(a, b, "lessOrEquals", ctx.line) <= 0 },
  not: { min: 1, max: 1, run: ([v], ctx) => !reqBool(v, "not", ctx.line) },
  // 変換
  array: { min: 1, max: 1, run([v], ctx) {
    if (Array.isArray(v)) throw new PracticeError("array：値は既に配列です", ctx.line);
    return [v];
  } },
  base64: { min: 1, max: 1, run([v], ctx) {
    if (isBinary(v)) return v.base64;
    return utf8ToBase64(reqStr(v, "base64", ctx.line));
  } },
  base64ToBinary: { min: 1, max: 1, run: ([v], ctx) => ({ kind: "binary", base64: bytesToBase64(base64ToBytes(reqStr(v, "base64ToBinary", ctx.line))) }) },
  base64ToJson: { min: 1, max: 1, run([v], ctx) {
    try { return JSON.parse(base64ToUtf8(reqStr(v, "base64ToJson", ctx.line))); }
    catch (e) { if (e instanceof PracticeError) throw e; throw new PracticeError("base64ToJson：復号した内容が JSON として解釈できません", ctx.line); }
  } },
  base64ToString: { min: 1, max: 1, run([v], ctx) {
    try { return base64ToUtf8(reqStr(v, "base64ToString", ctx.line)); }
    catch (e) { if (e instanceof PracticeError) throw e; throw new PracticeError("base64ToString：復号した内容が UTF-8 として解釈できません", ctx.line); }
  } },
  binary: { min: 1, max: 1, run([v], ctx) {
    if (isBinary(v)) return v;
    return { kind: "binary", base64: utf8ToBase64(reqStr(v, "binary", ctx.line)) };
  } },
  bool: { min: 1, max: 1, run([v], ctx) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") { const t = v.trim().toLowerCase(); if (t === "true") return true; if (t === "false") return false; }
    // Learn の bool の対応表どおり、数値は 0 が false、0 以外
    // （-1 を含む）が true。
    if (typeof v === "number") return v !== 0;
    throw new PracticeError(`bool：真偽値へ変換できません：${fmt(v)}`, ctx.line);
  } },
  createArray: { min: 0, max: Infinity, run: (args) => args },
  dataUri: { min: 1, max: 1, run([v], ctx) {
    if (isBinary(v)) return `data:application/octet-stream;base64,${v.base64}`;
    const text = typeof v === "string" ? v : JSON.stringify(v);
    return `data:text/plain;charset=utf-8;base64,${utf8ToBase64(text)}`;
  } },
  dataUriToBinary: { min: 1, max: 1, run: ([v], ctx) => ({ kind: "binary", base64: bytesToBase64(parseDataUri(reqStr(v, "dataUriToBinary", ctx.line), "dataUriToBinary", ctx.line)) }) },
  dataUriToString: { min: 1, max: 1, run([v], ctx) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(parseDataUri(reqStr(v, "dataUriToString", ctx.line), "dataUriToString", ctx.line)); }
    catch (e) { if (e instanceof PracticeError) throw e; throw new PracticeError("dataUriToString：内容が UTF-8 として解釈できません", ctx.line); }
  } },
  decimal: { min: 1, max: 1, run([v], ctx) {
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseNumberString(v, "decimal", ctx.line);
    throw new PracticeError("decimal：数値または文字列が必要です", ctx.line);
  } },
  decodeBase64: { min: 1, max: 1, run([v], ctx) {
    try { return base64ToUtf8(reqStr(v, "decodeBase64", ctx.line)); }
    catch (e) { if (e instanceof PracticeError) throw e; throw new PracticeError("decodeBase64：復号した内容が UTF-8 として解釈できません", ctx.line); }
  } },
  decodeDataUri: { min: 1, max: 1, run: ([v], ctx) => ({ kind: "binary", base64: bytesToBase64(parseDataUri(reqStr(v, "decodeDataUri", ctx.line), "decodeDataUri", ctx.line)) }) },
  decodeUriComponent: { min: 1, max: 1, run([v], ctx) {
    try { return decodeURIComponent(reqStr(v, "decodeUriComponent", ctx.line)); }
    catch { throw new PracticeError("decodeUriComponent：URI 符号化された文字列として解釈できません", ctx.line); }
  } },
  encodeBase64: { min: 1, max: 1, run: ([v], ctx) => utf8ToBase64(reqStr(v, "encodeBase64", ctx.line)) },
  encodeUriComponent: { min: 1, max: 1, run: ([v], ctx) => encodeURIComponent(reqStr(v, "encodeUriComponent", ctx.line)).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()) },
  float: { min: 1, max: 2, run([v, locale], ctx) {
    checkLocale(locale, "float", ctx.line);
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseNumberString(v, "float", ctx.line);
    throw new PracticeError("float：数値または文字列が必要です", ctx.line);
  } },
  int: { min: 1, max: 1, run([v], ctx) {
    if (typeof v === "number") {
      const f = Math.floor(v), diff = v - f;
      return diff > 0.5 ? f + 1 : diff < 0.5 ? f : f % 2 === 0 ? f : f + 1;
    }
    if (typeof v === "string" && /^[+-]?\d+$/.test(v.trim())) return Number(v.trim());
    throw new PracticeError(`int：整数へ変換できません：${fmt(v)}`, ctx.line);
  } },
  json: { min: 1, max: 1, run([v], ctx) {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); }
    catch { throw new PracticeError(`json：JSON として解釈できません：${v.slice(0, 60)}`, ctx.line); }
  } },
  parse: { min: 1, max: 1, run([v], ctx) {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); }
    catch { throw new PracticeError(`parse：JSON として解釈できません：${v.slice(0, 60)}`, ctx.line); }
  } },
  string: { min: 1, max: 1, run: ([v]) => toDisplayString(v, "string") },
  uriComponent: { min: 1, max: 1, run: ([v], ctx) => encodeURIComponent(reqStr(v, "uriComponent", ctx.line)).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()) },
  uriComponentToBinary: { min: 1, max: 1, run([v], ctx) {
    try { return { kind: "binary", base64: utf8ToBase64(decodeURIComponent(reqStr(v, "uriComponentToBinary", ctx.line))) }; }
    catch { throw new PracticeError("uriComponentToBinary：URI 符号化された文字列として解釈できません", ctx.line); }
  } },
  uriComponentToString: { min: 1, max: 1, run([v], ctx) {
    try { return decodeURIComponent(reqStr(v, "uriComponentToString", ctx.line)); }
    catch { throw new PracticeError("uriComponentToString：URI 符号化された文字列として解釈できません", ctx.line); }
  } },
  xml: { min: 1, max: 1, run([v], ctx) {
    if (typeof v === "string") { parseXml(v, "xml", ctx.line); return v; }
    if (isPlainObject(v)) return objectToXml(v, "xml", ctx.line);
    throw new PracticeError("xml：XML 文字列または JSON オブジェクトが必要です", ctx.line);
  } },
  // 数学
  add: { min: 2, max: 2, run: ([a, b], ctx) => reqNum(a, "add", ctx.line) + reqNum(b, "add", ctx.line) },
  sub: { min: 2, max: 2, run: ([a, b], ctx) => reqNum(a, "sub", ctx.line) - reqNum(b, "sub", ctx.line) },
  mul: { min: 2, max: 2, run: ([a, b], ctx) => reqNum(a, "mul", ctx.line) * reqNum(b, "mul", ctx.line) },

  mod: { min: 2, max: 2, run([a, b], ctx) {
    const x = reqNum(a, "mod", ctx.line), y = reqNum(b, "mod", ctx.line);
    if (y === 0) throw new PracticeError("mod：0 で割ることはできません", ctx.line);
    return x % y;
  } },
  pow: { min: 2, max: 2, run: ([a, b], ctx) => Math.pow(reqNum(a, "pow", ctx.line), reqNum(b, "pow", ctx.line)) },
  max: { min: 1, max: Infinity, run(args, ctx) {
    const vals = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    if (!vals.length) throw new PracticeError("max：値が必要です", ctx.line);
    return Math.max(...vals.map((v) => reqNum(v, "max", ctx.line)));
  } },
  min: { min: 1, max: Infinity, run(args, ctx) {
    const vals = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    if (!vals.length) throw new PracticeError("min：値が必要です", ctx.line);
    return Math.min(...vals.map((v) => reqNum(v, "min", ctx.line)));
  } },
  rand: { min: 2, max: 2, run([min, max], ctx) {
    const lo = reqInt(min, "rand", ctx.line), hi = reqInt(max, "rand", ctx.line);
    if (hi <= lo) throw new PracticeError("rand：maximum は minimum より大きくなければなりません", ctx.line);
    ctx.state.randState = (Math.imul(ctx.state.randState, 1103515245) + 12345) >>> 0;
    // LCG の上位ビットの偏りをならすための攪拌（決定的生成の範囲内）。
    const mixed = (ctx.state.randState ^ (ctx.state.randState >>> 16)) >>> 0;
    return lo + Math.floor((mixed / 4294967296) * (hi - lo));
  } },
  range: { min: 2, max: 2, run([start, count], ctx) {
    const s = reqInt(start, "range", ctx.line), n = reqInt(count, "range", ctx.line);
    if (n < 0) throw new PracticeError("range：count は0以上で指定してください", ctx.line);
    if (n > 10000) throw new PracticeError("range：count が上限（10,000件）を超えています", ctx.line);
    return Array.from({ length: n }, (_, i) => s + i);
  } },
  // 日時
  addDays: { min: 2, max: 3, run: ([t, n, f], ctx) => formatInstant(parseTimestamp(t, "addDays", ctx.line) + reqInt(n, "addDays", ctx.line) * 86400000, f, "addDays", ctx.line, zoneSuffixOf(t)) },
  addHours: { min: 2, max: 3, run: ([t, n, f], ctx) => formatInstant(parseTimestamp(t, "addHours", ctx.line) + reqInt(n, "addHours", ctx.line) * 3600000, f, "addHours", ctx.line, zoneSuffixOf(t)) },
  addMinutes: { min: 2, max: 3, run: ([t, n, f], ctx) => formatInstant(parseTimestamp(t, "addMinutes", ctx.line) + reqInt(n, "addMinutes", ctx.line) * 60000, f, "addMinutes", ctx.line, zoneSuffixOf(t)) },
  addSeconds: { min: 2, max: 3, run: ([t, n, f], ctx) => formatInstant(parseTimestamp(t, "addSeconds", ctx.line) + reqInt(n, "addSeconds", ctx.line) * 1000, f, "addSeconds", ctx.line, zoneSuffixOf(t)) },
  addToTime: { min: 3, max: 4, run: ([t, n, unit, f], ctx) => formatInstant(addTimeUnit(parseTimestamp(t, "addToTime", ctx.line), reqInt(n, "addToTime", ctx.line), unit, "addToTime", ctx.line), f, "addToTime", ctx.line, zoneSuffixOf(t)) },
  subtractFromTime: { min: 3, max: 4, run: ([t, n, unit, f], ctx) => formatInstant(addTimeUnit(parseTimestamp(t, "subtractFromTime", ctx.line), -reqInt(n, "subtractFromTime", ctx.line), unit, "subtractFromTime", ctx.line), f, "subtractFromTime", ctx.line, zoneSuffixOf(t)) },
  convertFromUtc: { min: 2, max: 3, run([t, tz, f], ctx) {
    const zone = resolveTimeZone(reqStr(tz, "convertFromUtc", ctx.line), "convertFromUtc", ctx.line);
    const parts = zonedParts(parseTimestamp(t, "convertFromUtc", ctx.line), zone);
    return f ? formatParts(parts, f, "convertFromUtc", ctx.line) : oFormatParts(parts);
  } },
  convertToUtc: { min: 2, max: 3, run: ([t, tz, f], ctx) => formatInstant(wallToInstant(wallPartsOf(t, "convertToUtc", ctx.line), resolveTimeZone(reqStr(tz, "convertToUtc", ctx.line), "convertToUtc", ctx.line)), f, "convertToUtc", ctx.line) },
  convertTimeZone: { min: 3, max: 4, run([t, src, dst, f], ctx) {
    const instant = wallToInstant(wallPartsOf(t, "convertTimeZone", ctx.line), resolveTimeZone(reqStr(src, "convertTimeZone", ctx.line), "convertTimeZone", ctx.line));
    const parts = zonedParts(instant, resolveTimeZone(reqStr(dst, "convertTimeZone", ctx.line), "convertTimeZone", ctx.line));
    return f ? formatParts(parts, f, "convertTimeZone", ctx.line) : oFormatParts(parts);
  } },
  dateDifference: { min: 2, max: 2, run: ([a, b], ctx) => timespanString(parseTimestamp(b, "dateDifference", ctx.line) - parseTimestamp(a, "dateDifference", ctx.line)) },
  dayOfMonth: { min: 1, max: 1, run: ([t], ctx) => utcParts(parseTimestamp(t, "dayOfMonth", ctx.line)).d },
  dayOfWeek: { min: 1, max: 1, run: ([t], ctx) => new Date(parseTimestamp(t, "dayOfWeek", ctx.line)).getUTCDay() },
  dayOfYear: { min: 1, max: 1, run([t], ctx) {
    const ms = parseTimestamp(t, "dayOfYear", ctx.line), p = utcParts(ms);
    return Math.floor((ms - Date.UTC(p.y, 0, 1)) / 86400000) + 1;
  } },
  formatDateTime: { min: 1, max: 3, run([t, f, locale], ctx) {
    checkLocale(locale, "formatDateTime", ctx.line);
    const ms = parseTimestamp(t, "formatDateTime", ctx.line);
    return f === undefined ? formatInstant(ms, undefined, "formatDateTime", ctx.line, zoneSuffixOf(t)) : formatInstant(ms, reqStr(f, "formatDateTime", ctx.line), "formatDateTime", ctx.line);
  } },
  formatTimeSpan: { min: 1, max: 2, run([v, f], ctx) {
    const ms = parseTimespan(v, "formatTimeSpan", ctx.line);
    if (f === undefined) return timespanString(ms);
    const totalSec = Math.abs(ms) / 1000;
    const days = Math.floor(totalSec / 86400), hours = Math.floor(totalSec / 3600) % 24, mins = Math.floor(totalSec / 60) % 60, secs = Math.floor(totalSec) % 60;
    // .NET のカスタム TimeSpan 書式では、%d のように % を前置して
    // 1文字のトークンを指定する（Learn の例：'%d' は日数だけを返す）。
    let out = String(f).replace(/%([dhmsf])/g, "$1");
    const frac7 = String(Math.round((Math.abs(ms) % 1000) * 10000)).padStart(7, "0");
    out = out.replace(/fffffff/g, frac7).replace(/fff/g, frac7.slice(0, 3))
      .replace(/dd/g, pad(days)).replace(/d/g, String(days))
      .replace(/hh/g, pad(hours)).replace(/h/g, String(hours))
      .replace(/mm/g, pad(mins)).replace(/m/g, String(mins))
      .replace(/ss/g, pad(secs)).replace(/s/g, String(secs));
    if (/[A-Za-z]/.test(out)) throw new PracticeError(`formatTimeSpan：書式「${f}」に未対応のトークンが含まれています`, ctx.line);
    return (ms < 0 ? "-" : "") + out;
  } },
  getFutureTime: { min: 2, max: 3, run: ([n, unit, f], ctx) => formatInstant(addTimeUnit(ctx.state.baseMs, reqInt(n, "getFutureTime", ctx.line), unit, "getFutureTime", ctx.line), f, "getFutureTime", ctx.line, zoneSuffixOf(ctx.state.model.baseTime)) },
  getPastTime: { min: 2, max: 3, run: ([n, unit, f], ctx) => formatInstant(addTimeUnit(ctx.state.baseMs, -reqInt(n, "getPastTime", ctx.line), unit, "getPastTime", ctx.line), f, "getPastTime", ctx.line, zoneSuffixOf(ctx.state.model.baseTime)) },
  parseDateTime: { min: 1, max: 3, run([v, locale, f], ctx) {
    checkLocale(locale, "parseDateTime", ctx.line, ["en-US", "ja-JP", "en-GB"]);
    reqStr(v, "parseDateTime", ctx.line);
    const ms = f !== undefined ? parseWithFormat(v, reqStr(f, "parseDateTime", ctx.line), "parseDateTime", ctx.line) : parseTimestamp(v, "parseDateTime", ctx.line);
    return formatInstant(ms, undefined, "parseDateTime", ctx.line, zoneSuffixOf(v));
  } },
  startOfDay: { min: 1, max: 2, run([t, f], ctx) {
    const p = utcParts(parseTimestamp(t, "startOfDay", ctx.line));
    return formatInstant(Date.UTC(p.y, p.mo - 1, p.d), f, "startOfDay", ctx.line, zoneSuffixOf(t));
  } },
  startOfHour: { min: 1, max: 2, run([t, f], ctx) {
    const p = utcParts(parseTimestamp(t, "startOfHour", ctx.line));
    return formatInstant(Date.UTC(p.y, p.mo - 1, p.d, p.h), f, "startOfHour", ctx.line, zoneSuffixOf(t));
  } },
  startOfMonth: { min: 1, max: 2, run([t, f], ctx) {
    const p = utcParts(parseTimestamp(t, "startOfMonth", ctx.line));
    return formatInstant(Date.UTC(p.y, p.mo - 1, 1), f, "startOfMonth", ctx.line, zoneSuffixOf(t));
  } },
  ticks: { min: 1, max: 1, run: ([t], ctx) => (BigInt(parseTimestamp(t, "ticks", ctx.line)) + 62135596800000n) * 10000n },
  utcNow: { min: 0, max: 1, run: ([f], ctx) => formatInstant(ctx.state.baseMs, f, "utcNow", ctx.line, zoneSuffixOf(ctx.state.model.baseTime)) },
  // URI解析
  uriHost: { min: 1, max: 1, run: ([v], ctx) => parseUri(v, "uriHost", ctx.line).hostname },
  uriPath: { min: 1, max: 1, run: ([v], ctx) => parseUri(v, "uriPath", ctx.line).pathname },
  uriPathAndQuery: { min: 1, max: 1, run([v], ctx) { const u = parseUri(v, "uriPathAndQuery", ctx.line); return u.pathname + u.search; } },
  uriPort: { min: 1, max: 1, run([v], ctx) {
    const u = parseUri(v, "uriPort", ctx.line);
    if (u.port) return Number(u.port);
    const def = { "http:": 80, "https:": 443, "ftp:": 21, "ws:": 80, "wss:": 443 }[u.protocol];
    if (def === undefined) throw new PracticeError(`uriPort：スキーム「${u.protocol.replace(":", "")}」の既定ポートが分かりません`, ctx.line);
    return def;
  } },
  uriQuery: { min: 1, max: 1, run: ([v], ctx) => parseUri(v, "uriQuery", ctx.line).search.replace(/^\?/, "") },
  uriScheme: { min: 1, max: 1, run: ([v], ctx) => parseUri(v, "uriScheme", ctx.line).protocol.replace(/:$/, "") },
  // JSON・XML操作
  addProperty: { min: 3, max: 3, run([o, name, value], ctx) {
    const obj = reqObj(o, "addProperty", ctx.line), key = reqStr(name, "addProperty", ctx.line);
    if (Object.hasOwn(obj, key)) throw new PracticeError(`addProperty：プロパティ「${key}」は既にあります（上書きには setProperty を使います）`, ctx.line);
    return { ...structuredClone(obj), [key]: value };
  } },
  setProperty: { min: 3, max: 3, run: ([o, name, value], ctx) => ({ ...structuredClone(reqObj(o, "setProperty", ctx.line)), [reqStr(name, "setProperty", ctx.line)]: value }) },
  removeProperty: { min: 2, max: 2, run([o, name], ctx) {
    const obj = reqObj(o, "removeProperty", ctx.line), key = reqStr(name, "removeProperty", ctx.line);
    // Learn の明記どおり、プロパティが無ければ元のオブジェクトを
    // そのまま返す（エラーにはしない）。
    const copy = structuredClone(obj);
    if (Object.hasOwn(copy, key)) delete copy[key];
    return copy;
  } },
  mergeObjects: { min: 2, max: Infinity, run(args, ctx) {
    // Learn の明記どおり、プロパティ名は大文字小文字を区別せずに
    // 対応付け、入れ子のオブジェクトは再帰的に統合し、配列は
    // 位置ごとに統合する。スカラーは後ろの値が優先する。
    const deepMerge = (base, extra) => {
      const out = structuredClone(base);
      for (const [k, v] of Object.entries(extra)) {
        const existing = Object.keys(out).find((key) => key.toLowerCase() === k.toLowerCase());
        if (existing === undefined) { out[k] = structuredClone(v); continue; }
        const cur = out[existing];
        if (isPlainObject(cur) && isPlainObject(v)) out[existing] = deepMerge(cur, v);
        else if (Array.isArray(cur) && Array.isArray(v)) {
          const merged = [...cur];
          v.forEach((item, i) => {
            if (i < merged.length && isPlainObject(merged[i]) && isPlainObject(item)) merged[i] = deepMerge(merged[i], item);
            else if (i < merged.length) merged[i] = structuredClone(item);
            else merged.push(structuredClone(item));
          });
          out[existing] = merged;
        } else out[existing] = structuredClone(v);
      }
      return out;
    };
    return args.map((a) => reqObj(a, "mergeObjects", ctx.line)).reduce((acc, a) => deepMerge(acc, a));
  } },
  encodeXmlName: { min: 1, max: 1, run([v], ctx) {
    const name = reqStr(v, "encodeXmlName", ctx.line);
    let out = "";
    for (let i = 0; i < name.length; i++) {
      const c = name[i];
      const valid = i === 0 ? /[A-Za-z_:]/.test(c) : /[A-Za-z0-9_:.-]/.test(c);
      const escapeLike = c === "_" && /^_x[0-9A-Fa-f]{4}_/.test(name.slice(i));
      out += valid && !escapeLike ? c : "_x" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "_";
    }
    return out;
  } },
  decodeXmlName: { min: 1, max: 1, run: ([v], ctx) => reqStr(v, "decodeXmlName", ctx.line).replace(/_x([0-9A-Fa-f]{4})_/g, (m, hex) => String.fromCharCode(parseInt(hex, 16))) },
  encodeXmlValue: { min: 1, max: 1, run: ([v], ctx) => encodeXmlText(reqStr(v, "encodeXmlValue", ctx.line)) },
  decodeXmlValue: { min: 1, max: 1, run: ([v], ctx) => decodeXmlEntities(reqStr(v, "decodeXmlValue", ctx.line)) },
  xpath: { min: 2, max: 2, run: ([x, expr], ctx) => evalXpath(reqStr(x, "xpath", ctx.line), reqStr(expr, "xpath", ctx.line), ctx.line) },
};
// EAGER のキーは参照名の表記（camelCase）で書かれているため、
// 大文字小文字を区別しない照合用に小文字キーへ寄せた表を別に持つ。
const EAGER_BY_LOWER = Object.fromEntries(
  Object.entries(EAGER).map(([k, v]) => [k.toLowerCase(), v]),
);
function parseUri(v, fname, line) {
  reqStr(v, fname, line);
  try { return new URL(v); }
  catch { throw new PracticeError(`${fname}：絶対 URI として解釈できません：${v}`, line); }
}

function evaluate(node, state) {
  switch (node.k) {
    case "literal": return node.value;
    case "stringLiteral": {
      let out = "";
      for (const part of node.parts) {
        if (part.k === "text") out += part.value;
        else out += toDisplayString(evaluate(part.node, state), "補間");
      }
      return out;
    }
    case "name":
      throw new PracticeError(`名前「${node.name}」は WDL の式では使えません（変数の参照は variables() などの関数で行いますが、このモデルでは未対応です）`, node.line);
    case "unary": {
      const v = evaluate(node.arg, state);
      if (node.op === "!") return !reqBool(v, "!", node.line);
      return node.op === "-" ? -reqNum(v, "-", node.line) : reqNum(v, "+", node.line);
    }
    case "binary": {
      if (node.op === "&&") {
        const a = reqBool(evaluate(node.a, state), "&&", node.line);
        return a ? reqBool(evaluate(node.b, state), "&&", node.line) : false;
      }
      if (node.op === "||") {
        const a = reqBool(evaluate(node.a, state), "||", node.line);
        return a ? true : reqBool(evaluate(node.b, state), "||", node.line);
      }
      const a = evaluate(node.a, state), b = evaluate(node.b, state);
      if (node.op === "==") return looseEqual(a, b);
      if (node.op === "!=") return !looseEqual(a, b);
      if (["<", ">", "<=", ">="].includes(node.op)) {
        const c = compareValues(a, b, node.op, node.line);
        return { "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[node.op];
      }
      const x = reqNum(a, node.op, node.line), y = reqNum(b, node.op, node.line);
      if ((node.op === "/" || node.op === "%") && y === 0)
        throw new PracticeError(`${node.op}：0 で割ることはできません`, node.line);
      return { "+": x + y, "-": x - y, "*": x * y, "/": x / y, "%": x % y }[node.op];
    }
    case "member": {
      const target = evaluate(node.target, state);
      if (target === null || target === undefined)
        throw new PracticeError(`メンバー参照：対象が null のため「${node.name}」を参照できません`, node.line);
      if (isPlainObject(target)) {
        if (Object.hasOwn(target, node.name)) return target[node.name];
        const key = Object.keys(target).find((k) => k.toLowerCase() === node.name.toLowerCase());
        return key !== undefined ? target[key] : null;
      }
      throw new PracticeError(`メンバー参照：「${node.name}」を参照できるのは JSON オブジェクトだけです`, node.line);
    }
    case "index": {
      const target = evaluate(node.target, state), index = evaluate(node.index, state);
      if (Array.isArray(target)) {
        const n = reqInt(index, "添字", node.line);
        if (n < 0 || n >= target.length) throw new PracticeError(`添字：位置 ${n} は配列の範囲外です（要素数 ${target.length}）`, node.line);
        return target[n];
      }
      if (typeof target === "string") {
        const n = reqInt(index, "添字", node.line);
        if (n < 0 || n >= target.length) throw new PracticeError(`添字：位置 ${n} は文字列の範囲外です（長さ ${target.length}）`, node.line);
        return target[n];
      }
      if (isPlainObject(target)) {
        const key = reqStr(index, "添字", node.line);
        if (Object.hasOwn(target, key)) return target[key];
        const found = Object.keys(target).find((k) => k.toLowerCase() === key.toLowerCase());
        return found !== undefined ? target[found] : null;
      }
      throw new PracticeError("添字：対象は配列、文字列、または JSON オブジェクトだけです", node.line);
    }
    case "call": return evaluateCall(node, state);
    default: throw new PracticeError("式を解釈できません", node.line || 1);
  }
}
function evaluateCall(node, state) {
  const lower = node.name.toLowerCase();
  const canonical = CANONICAL.get(lower);
  if (!canonical)
    throw new PracticeError(`関数は対応していません：${node.name}`, node.line, "未対応");
  if (UNSUPPORTED_SET.has(lower))
    throw new PracticeError(`${canonical} は${RUNTIME_REASON}`, node.line, "未対応");
  // 遅延評価の関数（選ばれなかった側・確定した残りを評価しない）。
  if (lower === "if") {
    if (node.args.length !== 3)
      throw new PracticeError(`if の引数の数が正しくありません（3 個が必要です）`, node.line);
    const cond = reqBool(evaluate(node.args[0], state), "if", node.line);
    return evaluate(cond ? node.args[1] : node.args[2], state);
  }
  if (lower === "div") {
    // Learn の例どおり、div(11, 5) は整数の商 2、div(11, 5.0) は
    // 小数の商 2.2。JavaScript の数値は整数と小数を区別しないため、
    // 引数の式の形（小数リテラルや float()／decimal() の呼び出し、
    // それらを含む算術式）から「小数として書かれたか」を判定する。
    if (node.args.length !== 2)
      throw new PracticeError("div の引数の数が正しくありません（2 個が必要です）", node.line);
    const staticallyFloat = (n) => {
      if (!n || typeof n !== "object") return false;
      if (n.k === "literal") return typeof n.raw === "string" && /[.eE]/.test(n.raw);
      if (n.k === "call") {
        const name = n.name.toLowerCase();
        if (name === "float" || name === "decimal") return true;
        if (["add", "sub", "mul", "div", "mod", "pow"].includes(name)) return n.args.some(staticallyFloat);
        return false;
      }
      if (n.k === "binary") return staticallyFloat(n.a) || staticallyFloat(n.b);
      if (n.k === "unary") return staticallyFloat(n.arg);
      return false;
    };
    const x = reqNum(evaluate(node.args[0], state), "div", node.line);
    const y = reqNum(evaluate(node.args[1], state), "div", node.line);
    if (y === 0) throw new PracticeError("div：0 で割ることはできません", node.line);
    const asFloat = staticallyFloat(node.args[0]) || staticallyFloat(node.args[1]) || !Number.isInteger(x) || !Number.isInteger(y);
    return asFloat ? x / y : Math.trunc(x / y);
  }
  if (lower === "strongequals") {
    // Learn の明記どおり、strongEquals は2つ以上の値を受け付け、
    // 型が異なる値同士では false でなくエラーで停止する（整数と
    // 小数は同じ数値型として比べる）。
    if (node.args.length < 2)
      throw new PracticeError("strongEquals の引数の数が正しくありません（2 個以上が必要です）", node.line);
    const values = node.args.map((a) => evaluate(a, state));
    const kindOf = (v) =>
      v === null || v === undefined ? "null" : isBinary(v) ? "binary" : Array.isArray(v) ? "array" : typeof v;
    const first = kindOf(values[0]);
    for (const v of values)
      if (kindOf(v) !== first)
        throw new PracticeError(`strongEquals：型が異なる値は比べられません（${first} と ${kindOf(v)}）。型をそろえるか、型変換して比べる equals を使います`, node.line);
    return values.every((v) => strictEqual(v, values[0]));
  }
  if (lower === "coalesce") {
    if (node.args.length < 1) throw new PracticeError("coalesce の引数の数が正しくありません（1 個以上が必要です）", node.line);
    for (const arg of node.args) {
      const v = evaluate(arg, state);
      if (v !== null && v !== undefined) return v;
    }
    return null;
  }
  if (lower === "and" || lower === "or") {
    if (node.args.length < 2) throw new PracticeError(`${canonical} の引数の数が正しくありません（2 個以上が必要です）`, node.line);
    for (const arg of node.args) {
      const v = reqBool(evaluate(arg, state), canonical, node.line);
      if (lower === "and" && !v) return false;
      if (lower === "or" && v) return true;
    }
    return lower === "and";
  }
  const impl = EAGER_BY_LOWER[lower];
  if (!impl) throw new PracticeError(`関数は対応していません：${node.name}`, node.line, "未対応");
  if (node.args.length < impl.min || node.args.length > impl.max)
    throw new PracticeError(`${canonical} の引数の数が正しくありません（${impl.min === impl.max ? impl.min + " 個" : impl.max === Infinity ? impl.min + " 個以上" : impl.min + "〜" + impl.max + " 個"}が必要です）`, node.line);
  const values = node.args.map((a) => evaluate(a, state));
  return impl.run(values, { line: node.line, state });
}

// ---------------------------------------------------------------------
// 種類定義
// ---------------------------------------------------------------------
const MODEL_DEFAULTS = {
  baseTime: "2026-01-15T09:00:00.000Z",
  randSeed: 42,
  guidSeed: "wdl-learning",
};
export const definition = {
  id: "powerautomatecloud",
  name: "Power Automate（クラウド）",
  extensions: [".txt", ".json"],
  syntax: { name: "ワークフロー定義言語（WDL）式", caseSensitive: false },
  reference,
  templates: [
    {
      id: "pacloud-string",
      title: "文字列操作と補間",
      code: "concat('注文', ':', toUpper(substring('abcdef', 0, 3)))\n'結果は @{concat('A', string(add(1, 2)))} です @@home'",
      intro: "関数で文字列を組み立て、@{式} の補間と @@ のエスケープ（リテラルの @）を確認します。",
      refs: ["concat", "toUpper", "substring", "string", "add"],
    },
    {
      id: "pacloud-collection",
      title: "コレクションの並べ替えと共通要素",
      code: "sort(createArray(3, 1, 2))\njoin(sort(createArray(3, 1, 2)), ',')\nintersection(createArray(1, 2, 3), createArray(2, 3, 4))",
      intro: "createArray で配列を作り、sort・join・intersection で処理します。配列リテラルは WDL の式文法に無いため関数で作ります。",
      refs: ["createArray", "sort", "join", "intersection"],
    },
    {
      id: "pacloud-datetime",
      title: "基準時刻と日時の計算",
      code: "utcNow('yyyy-MM-dd')\naddDays(utcNow(), 7, 'yyyy-MM-dd')\nformatDateTime(getFutureTime(2, 'Week'), 'yyyy/MM/dd')",
      intro: "utcNow は実時刻ではなくモデルの基準時刻（baseTime）を返します。基準時刻はモデルで編集できます。",
      refs: ["utcNow", "addDays", "getFutureTime", "formatDateTime"],
    },
    {
      id: "pacloud-convert",
      title: "変換と JSON のメンバー参照",
      code: "base64('hello')\njson('{\"name\": \"A\", \"price\": 120}').price\nstring(add(40, 2))",
      intro: "Base64 符号化、json() で解釈したオブジェクトへのメンバー参照、文字列への変換を確認します。",
      refs: ["base64", "json", "string", "add"],
    },
    {
      id: "pacloud-json",
      title: "JSON オブジェクトの編集と XPath",
      code: "setProperty(json('{\"a\": 1}'), 'b', 2)\naddProperty(json('{\"a\": 1}'), 'b', 2).b\nxpath('<root><a>1</a><a>2</a></root>', '/root/a')",
      intro: "setProperty／addProperty は元のオブジェクトを変更せず、新しいオブジェクトを返します。xpath は XML 文字列の要素を配列で返します。",
      refs: ["setProperty", "addProperty", "json", "xpath"],
    },
    {
      id: "pacloud-condition",
      title: "条件・URI解析・coalesce",
      code: "if(greater(length(createArray(1, 2, 3)), 2), max(10, 20, 5), 0)\nuriHost('https://example.com:8080/path?q=1')\ncoalesce(null, null, 'fallback')",
      intro: "if は選ばれなかった側を評価しません。coalesce は null でない最初の値を返します。",
      refs: ["if", "greater", "length", "createArray", "max", "uriHost", "coalesce"],
    },
  ],
  glossary: [
    ["式", "値を計算する記述です。WDL では、ワークフロー定義 JSON の文字列値の中で @ から始める形（@concat(...)）や @{式} の形で書きます。"],
    ["補間", "文字列リテラルの中に @{式} と書いて、式の結果を文字列へ埋め込む仕組みです。リテラルの @ は @@ と書いて表します。"],
    ["ワークフロー定義", "トリガーとアクションの並びを JSON で記述したものです。式関数はその中で値を計算するために使います。この種別は式だけを扱い、ワークフロー自体の実行は行いません。"],
    ["トリガー", "ワークフローを開始するきっかけ（受信した要求やメールなど）です。トリガーの出力に依存する関数（triggerBody など）は、このモデルでは未対応です。"],
    ["アクション", "ワークフロー内の1つの処理です。アクションの入出力に依存する関数（outputs など）は、このモデルでは未対応です。"],
    ["基準時刻（モデル）", "utcNow などが返す「現在」の代わりに使う、モデルで編集できる決まった時刻です。実時刻を装わず、同じ入力では常に同じ結果になるようにするための仕組みです。"],
    ["バイナリ値", "文字列とは別の、バイト列としての値です。このモデルでは {kind: 'binary', base64} の形で表し、base64() などで文字列と相互変換できます。"],
    ["決定的モデル", "乱数や現在時刻のような実行ごとに変わる要素を、モデルのシードや基準時刻から再現可能な形で置き換えた学習用モデルです。rand と guid もこの方針で生成します。"],
  ],
  model: {
    kind: "json",
    title: "モデル基準時刻・シード",
    hint: "baseTime は utcNow／getFutureTime／getPastTime が使う基準時刻（ISO 8601）です。randSeed と guidSeed は rand／guid の決定的生成に使うシードです。いずれも編集できます。",
    defaults: MODEL_DEFAULTS,
  },
  semantics: {
    description:
      "Power Automate（クラウド）と Azure Logic Apps が使うワークフロー定義言語（WDL）の式関数を評価します。既存の Power Automate（デスクトップ）種別とは別種別で、デスクトップフローのアクションは扱いません。式は関数呼び出し・文字列リテラル（@{式} 補間と @@ エスケープを含む）・数値・true/false/null・括弧・式文法の演算子で構成され、配列とオブジェクトは createArray()／json() 等の関数で作ります。",
    support:
      "対応は棚卸し全137件のうち116件です。ワークフローの実行時ランタイム依存の21件（trigger、outputs、variables など）は未対応で、呼び出すと関数名と理由を挙げて停止します。utcNow 等の時刻系は実時刻ではなくモデルの基準時刻（baseTime）を使う決定的モデルで、rand／guid もモデルのシードから決定的に生成します（実物の乱数・一意性とは性質が異なります）。タイムゾーン変換は Windows のタイムゾーン ID の代表例と IANA 名に対応し、日時書式は .NET トークンの部分集合のみ対応します。xpath は XPath の部分集合のみ対応します。",
    sources: [
      {
        title: "Microsoft Learn ワークフロー定義言語 関数リファレンス",
        url: "https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-functions-reference",
      },
      {
        title: "Microsoft Learn ワークフロー定義言語スキーマ",
        url: "https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-definition-language",
      },
    ],
  },
  scan(code) {
    const found = new Set();
    for (const m of String(code).matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
      const canonical = CANONICAL.get(m[1].toLowerCase());
      if (canonical) found.add(canonical);
    }
    return [...found];
  },
  async simulate(code, model) {
    const isModelObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
    if (model !== undefined && !isModelObject(model))
      return sourceFailure(new PracticeError("モデルはオブジェクト（JSON）で指定してください", 1, "モデルエラー"));
    const merged = { ...MODEL_DEFAULTS, ...(model || {}) };
    const baseMs = typeof merged.baseTime === "string" ? parseTimestampMs(merged.baseTime) : NaN;
    if (Number.isNaN(baseMs))
      return sourceFailure(new PracticeError(`モデルbaseTimeは ISO 8601 のタイムスタンプ文字列で指定してください：${merged.baseTime}`, 1, "モデルエラー"));
    if (typeof merged.randSeed !== "number" || !Number.isFinite(merged.randSeed))
      return sourceFailure(new PracticeError("モデルrandSeedは数値で指定してください", 1, "モデルエラー"));
    if (typeof merged.guidSeed !== "string" && typeof merged.guidSeed !== "number")
      return sourceFailure(new PracticeError("モデルguidSeedは文字列または数値で指定してください", 1, "モデルエラー"));
    let exprs;
    try {
      exprs = parseProgram(String(code));
    } catch (e) {
      return sourceFailure(e instanceof PracticeError ? e : toLearnerError(e));
    }
    const state = {
      model: merged,
      baseMs,
      randState: Math.abs(Math.trunc(merged.randSeed)) % 2147483648 || 1,
      guidCounter: 0,
    };
    const trace = [], vars = {};
    const groups = () => [
      {
        title: "評価結果",
        entries: [
          ["結果", vars["結果"] === undefined ? "（なし）" : fmt(vars["結果"])],
          ["式の数", String(exprs.length)],
        ],
      },
      {
        title: "モデル（決定的な基準）",
        entries: [
          ["基準時刻 baseTime", String(merged.baseTime)],
          ["randSeed", String(merged.randSeed)],
          ["guidSeed", String(merged.guidSeed)],
        ],
      },
    ];
    try {
      exprs.forEach((node, idx) => {
        const value = evaluate(node, state);
        vars[`式${idx + 1}`] = value;
        vars["結果"] = value;
        const refs = [...collectCallNames(node)]
          .map((n) => CANONICAL.get(n.toLowerCase()))
          .filter(Boolean);
        trace.push({
          line: node.line || 1,
          text: `式${idx + 1} の結果：${fmt(value)}`,
          kind: "step",
          refs: [...new Set(refs)],
        });
      });
    } catch (e) {
      const err = e instanceof PracticeError ? e : toLearnerError(e);
      return {
        paths: [{
          id: 1, trace, outputs: [], vars, groups: groups(), model: merged,
          error: { line: err.line || 1, message: err.message, category: err.category || "エラー" },
        }],
        truncated: false,
        limits: LIMITS,
      };
    }
    const last = exprs[exprs.length - 1];
    return {
      paths: [{
        id: 1,
        trace,
        outputs: [{ channel: "評価結果", text: fmt(vars["結果"]), line: last.line || 1 }],
        vars,
        groups: groups(),
        model: merged,
      }],
      truncated: false,
      limits: LIMITS,
    };
  },
};

// reference-details 方式のマージ（powerapps/index.js 末尾のパターン）。
for (const r of definition.reference)
  if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
