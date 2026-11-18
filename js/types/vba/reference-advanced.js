// 高度モード B4：VBA 高度リファレンス項目（高度差分）。
// 項目形式はモード機構の確定契約（advanced-interface.md 第4章）：
// 正規形＋ status 必須。supported 真偽値・reason・その他の追加フィールドは
// 付けない（未対応／未検証の理由は description に明記する）。
// referenceOverrides は基礎項目への上書き定義（参照のみだった10件の
// 高度モードでの確定状態）。name の重複で基礎項目を変えることはしない。
export const referenceAdvanced = [
  {
    "name": "Asc",
    "category": "文字列",
    "syntax": "Asc(string)",
    "description": "文字列の先頭の文字に対応する文字コード（Integer）を返します。",
    "example": "x = Asc(\"A\")",
    "caution": "引数の文字列が空の場合は実行時エラーになります。",
    "status": "supported"
  },
  {
    "name": "Chr",
    "category": "文字列",
    "syntax": "Chr(charcode)",
    "description": "文字コード charcode に対応する文字（String）を返します。",
    "example": "x = Chr(65)",
    "caution": "charcode の範囲は 0～255 です。",
    "status": "supported"
  },
  {
    "name": "Filter",
    "category": "配列",
    "syntax": "Filter(sources, match, [include, [compare]])",
    "description": "文字列の配列 sources のうち、match を含む要素だけ（include が False のときは含まない要素だけ）を集めた、添字 0 始まりの配列を返します。",
    "example": "parts = Filter(Array(\"apple\", \"banana\", \"apricot\"), \"ap\")",
    "caution": "一致する要素がない場合は、要素数が 0 の配列を返します。",
    "status": "supported"
  },
  {
    "name": "InStrRev",
    "category": "文字列",
    "syntax": "InStrRev(stringcheck, stringmatch, [start, [compare]])",
    "description": "stringcheck の中で stringmatch が最後に現れる位置を返します。見つからない場合は 0 を返します。start で、検索を始める位置（右側の起点）を指定できます。",
    "example": "x = InStrRev(\"abcabc\", \"bc\")",
    "caution": "戻り値の位置は、検索方向とは無関係に文字列の先頭から数えた位置です。",
    "status": "supported"
  },
  {
    "name": "Join",
    "category": "文字列",
    "syntax": "Join(source, [delimiter])",
    "description": "配列 source の各要素を、delimiter で区切ってつないだ文字列を返します。",
    "example": "x = Join(Array(\"a\", \"b\", \"c\"), \",\")",
    "caution": "delimiter を省略すると、区切りはスペース1個になります。",
    "status": "supported"
  },
  {
    "name": "LTrim",
    "category": "文字列",
    "syntax": "LTrim(string)",
    "description": "文字列の先頭にあるスペースを取り除いた文字列を返します。",
    "example": "x = LTrim(\"  abc\")",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "RTrim",
    "category": "文字列",
    "syntax": "RTrim(string)",
    "description": "文字列の末尾にあるスペースを取り除いた文字列を返します。",
    "example": "x = RTrim(\"abc  \")",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Split",
    "category": "文字列",
    "syntax": "Split(expression, [delimiter, [limit, [compare]]])",
    "description": "文字列 expression を delimiter で区切って分割し、添字 0 始まりの文字列の配列を返します。limit で返す要素の最大数を指定できます。",
    "example": "parts = Split(\"a,b,c\", \",\")",
    "caution": "expression が空文字列の場合は要素数 0 の配列を、delimiter が空文字列の場合は expression 全体を1要素とする配列を返します。",
    "status": "supported"
  },
  {
    "name": "StrComp",
    "category": "文字列",
    "syntax": "StrComp(string1, string2, [compare])",
    "description": "2つの文字列を比較した結果を返します。string1 が小さいとき -1、等しいとき 0、大きいとき 1 です。compare には vbBinaryCompare や vbTextCompare などの比較方法定数を指定します。",
    "example": "x = StrComp(\"abc\", \"ABC\", vbTextCompare)",
    "caution": "string1 か string2 のどちらかが Null の場合は Null を返します。",
    "status": "supported"
  },
  {
    "name": "StrReverse",
    "category": "文字列",
    "syntax": "StrReverse(expression)",
    "description": "文字列の文字の並びを逆順にした文字列を返します。",
    "example": "x = StrReverse(\"abc\")",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Format",
    "category": "文字列",
    "syntax": "Format(expression, [format, [firstdayofweek, [firstweekofyear]]])",
    "description": "expression を、format で指定した書式（定義済みの名前付き書式、または書式指定子を組み合わせたユーザー定義書式）に従って整形した文字列を返します。",
    "example": "x = Format(1234.5, \"#,##0.00\")",
    "caution": "format を省略した場合は Str 関数とほぼ同じ変換になりますが、符号用に先頭のスペースは付きません。",
    "status": "supported"
  },
  {
    "name": "FormatCurrency",
    "category": "文字列",
    "syntax": "FormatCurrency(expression, [numdigitsafterdecimal, [includeleadingdigit, [useparensfornegativenumbers, [groupdigits]]]])",
    "description": "数値を、OS の地域設定で定義された通貨書式に従って整形した文字列を返します。引数で小数部の桁数や桁区切りの有無などを調整できます。",
    "example": "x = FormatCurrency(1234.5)",
    "caution": "通貨記号や桁区切りの実際の表示は、実行環境の地域設定に依存します。",
    "status": "supported"
  },
  {
    "name": "FormatNumber",
    "category": "文字列",
    "syntax": "FormatNumber(expression, [numdigitsafterdecimal, [includeleadingdigit, [useparensfornegativenumbers, [groupdigits]]]])",
    "description": "数値を、OS の地域設定に基づく数値書式で整形した文字列を返します。引数で小数部の桁数や桁区切りの有無などを調整できます。",
    "example": "x = FormatNumber(1234.567, 2)",
    "caution": "小数部の桁数（numdigitsafterdecimal）を省略すると -1 となり、地域設定の既定値が使われます。",
    "status": "supported"
  },
  {
    "name": "FormatPercent",
    "category": "文字列",
    "syntax": "FormatPercent(expression, [numdigitsafterdecimal, [includeleadingdigit, [useparensfornegativenumbers, [groupdigits]]]])",
    "description": "数値を 100 倍し、末尾に % を付けた書式の文字列を返します。その他の引数は FormatNumber と同じ意味です。",
    "example": "x = FormatPercent(0.75)",
    "caution": "小数部の桁数を省略すると -1 となり、地域設定の既定値（通常は小数2桁）が使われます。",
    "status": "supported"
  },
  {
    "name": "Space",
    "category": "文字列",
    "syntax": "Space(number)",
    "description": "number 個のスペースからなる文字列を返します。",
    "example": "x = Space(3)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Partition",
    "category": "文字列",
    "syntax": "Partition(number, start, stop, interval)",
    "description": "start から stop までの範囲を interval 刻みに区切ったとき、number が属する区間を「下限 : 上限」形式の文字列で返します。",
    "example": "x = Partition(25, 0, 100, 10)",
    "caution": "number が start より小さい場合は最初の区間の前、stop より大きい場合は最後の区間の後を表す文字列を返します。",
    "status": "supported"
  },
  {
    "name": "Hex",
    "category": "型変換",
    "syntax": "Hex(number)",
    "description": "数値を、16進表記で表した文字列を返します。",
    "example": "x = Hex(255)",
    "caution": "引数が整数でない場合は、変換前に整数へ丸められます。負の数は2の補数表現になります。このアプリでは負の数の桁数は値が収まる最小の型の幅になります（例：Hex(-1) は \"FFFF\" です。実 VBA で Long 型の -1 は \"FFFFFFFF\" になります）。",
    "status": "supported"
  },
  {
    "name": "Oct",
    "category": "型変換",
    "syntax": "Oct(number)",
    "description": "数値を、8進表記で表した文字列を返します。",
    "example": "x = Oct(8)",
    "caution": "引数が整数でない場合は、変換前に整数へ丸められます。負の数は2の補数表現になります。このアプリでは負の数の桁数は値が収まる最小の型の幅になります（例：Hex(-1) は \"FFFF\" です。実 VBA で Long 型の -1 は \"FFFFFFFF\" になります）。",
    "status": "supported"
  },
  {
    "name": "Str",
    "category": "型変換",
    "syntax": "Str(number)",
    "description": "数値を文字列で表したものを返します。正の数では、符号のための先頭スペースが付きます。",
    "example": "x = Str(123)",
    "caution": "小数点は地域設定によらず常にピリオドで表されます。",
    "status": "supported"
  },
  {
    "name": "CBool",
    "category": "型変換",
    "syntax": "CBool(expression)",
    "description": "式を Boolean 型に変換します。数値の 0 は False、それ以外は True になります。文字列 \"True\" / \"False\" も変換できます。",
    "example": "x = CBool(1)",
    "caution": "数値でも \"True\" / \"False\" でもない文字列を渡すと、型が一致しないエラーになります。",
    "status": "supported"
  },
  {
    "name": "CByte",
    "category": "型変換",
    "syntax": "CByte(expression)",
    "description": "式を Byte 型（0～255 の整数）に変換します。",
    "example": "x = CByte(125.5678)",
    "caution": "小数部分は銀行丸め（最も近い偶数への丸め）で処理されます。範囲外の値はオーバーフローエラーになります。",
    "status": "supported"
  },
  {
    "name": "CCur",
    "category": "型変換",
    "syntax": "CCur(expression)",
    "description": "式を Currency 型（小数部4桁までの固定小数点数）に変換します。",
    "example": "x = CCur(123.45678)",
    "caution": "小数部5桁目以降は銀行丸めで処理されます。",
    "status": "supported"
  },
  {
    "name": "CDate",
    "category": "型変換",
    "syntax": "CDate(expression)",
    "description": "日付や時刻として解釈できる式を Date 型に変換します。数値を渡した場合は、そのシリアル値に対応する日付になります。",
    "example": "x = CDate(\"2026/1/15\")",
    "caution": "文字列の解釈は実行環境の地域設定に依存します。日付として解釈できない場合は型が一致しないエラーになります。IsDate で事前に確認できます。",
    "status": "supported"
  },
  {
    "name": "CDec",
    "category": "型変換",
    "syntax": "CDec(expression)",
    "description": "式を Decimal サブタイプの値に変換します。Decimal は小数部なしで最大29桁、小数部ありで最大28桁を正確に表せます。",
    "example": "x = CDec(\"12345678901234567890\")",
    "caution": "Decimal は独立したデータ型ではなく、Variant のサブタイプです。",
    "status": "supported"
  },
  {
    "name": "CSng",
    "category": "型変換",
    "syntax": "CSng(expression)",
    "description": "式を Single 型（単精度浮動小数点数）に変換します。",
    "example": "x = CSng(123.456)",
    "caution": "Single の範囲を超える値や、精度を超えた桁は丸められます。",
    "status": "supported"
  },
  {
    "name": "CVar",
    "category": "型変換",
    "syntax": "CVar(expression)",
    "description": "式を Variant 型に変換します。数値はその内容に応じた数値サブタイプとして保持されます。",
    "example": "x = CVar(123)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "CLngLng",
    "category": "型変換",
    "syntax": "CLngLng(expression)",
    "description": "式を LongLong 型（64ビット整数）に変換します。",
    "example": "x = CLngLng(1234567890123)",
    "caution": "64ビット版の VBA でのみ使用できます。32ビット版では使用できません。",
    "status": "supported"
  },
  {
    "name": "CLngPtr",
    "category": "型変換",
    "syntax": "CLngPtr(expression)",
    "description": "式を LongPtr 型に変換します。LongPtr は実行環境のビット数に応じて Long または LongLong として振る舞う、ポインタを扱うための整数型です。",
    "example": "x = CLngPtr(123)",
    "caution": "主に Declare した外部プロシージャへポインタを渡す場面で使います。",
    "status": "supported"
  },
  {
    "name": "TypeName",
    "category": "型変換",
    "syntax": "TypeName(varname)",
    "description": "変数の型名を表す文字列を返します（例：\"Integer\"、\"String\"、\"Double\"）。オブジェクトが Nothing の場合は \"Nothing\" を返します。",
    "example": "x = TypeName(42)",
    "caution": "引数が配列の場合は、要素の型名の後に () が付いた文字列を返します。このアプリでは数値を Double として保持するため、整数リテラルでも \"Double\" を返します（実 VBA では \"Integer\" です）。",
    "status": "supported"
  },
  {
    "name": "Atn",
    "category": "数値",
    "syntax": "Atn(number)",
    "description": "数値のアークタンジェント（逆正接）を、ラジアンで返します。戻り値は -π/2 ～ π/2 の範囲です。",
    "example": "x = Atn(1)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Cos",
    "category": "数値",
    "syntax": "Cos(number)",
    "description": "ラジアンで表した角度のコサインを返します。",
    "example": "x = Cos(0)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Exp",
    "category": "数値",
    "syntax": "Exp(number)",
    "description": "e（自然対数の底）の number 乗を返します。",
    "example": "x = Exp(1)",
    "caution": "number が 709.782712893 を超えるとオーバーフローエラーになります。",
    "status": "supported"
  },
  {
    "name": "Log",
    "category": "数値",
    "syntax": "Log(number)",
    "description": "数値の自然対数（e を底とする対数）を返します。",
    "example": "x = Log(10)",
    "caution": "number が 0 以下の場合は実行時エラーになります。任意の底 n の対数は Log(x) / Log(n) で求めます。",
    "status": "supported"
  },
  {
    "name": "Sgn",
    "category": "数値",
    "syntax": "Sgn(number)",
    "description": "数値の符号を表す値を返します。正の数なら 1、0 なら 0、負の数なら -1 です。",
    "example": "x = Sgn(-5)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Sin",
    "category": "数値",
    "syntax": "Sin(number)",
    "description": "ラジアンで表した角度のサインを返します。",
    "example": "x = Sin(0)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Sqr",
    "category": "数値",
    "syntax": "Sqr(number)",
    "description": "数値の平方根を返します。",
    "example": "x = Sqr(9)",
    "caution": "number が負の場合は実行時エラーになります。",
    "status": "supported"
  },
  {
    "name": "Tan",
    "category": "数値",
    "syntax": "Tan(number)",
    "description": "ラジアンで表した角度のタンジェントを返します。",
    "example": "x = Tan(0)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "QBColor",
    "category": "数値",
    "syntax": "QBColor(color)",
    "description": "0～15 の色番号に対応する RGB の色値を返します（QuickBasic 互換の色の表に基づきます）。",
    "example": "x = QBColor(4)",
    "caution": "color が 0～15 の範囲外の場合は実行時エラーになります。",
    "status": "supported"
  },
  {
    "name": "RGB",
    "category": "数値",
    "syntax": "RGB(red, green, blue)",
    "description": "赤・緑・青の各成分（0～255）から、色を表す Long の値を組み立てて返します。",
    "example": "x = RGB(255, 0, 0)",
    "caution": "255 を超えた成分は 255 として扱われます。",
    "status": "supported"
  },
  {
    "name": "DateAdd",
    "category": "日時",
    "syntax": "DateAdd(interval, number, date)",
    "description": "date に対して、interval で指定した単位（\"yyyy\"=年、\"m\"=月、\"d\"=日、\"h\"=時など）の number 分を加えた日付を返します。number に負の数を指定すると過去の日付になります。",
    "example": "x = DateAdd(\"d\", 7, Date)",
    "caution": "interval の \"m\" は月、\"n\" は分を表します。月末の日付に月を加える場合は、結果はその月の月末日に調整されます。",
    "status": "supported"
  },
  {
    "name": "DateDiff",
    "category": "日時",
    "syntax": "DateDiff(interval, date1, date2, [firstdayofweek, [firstweekofyear]])",
    "description": "date1 から date2 までの間に、interval で指定した単位の区切りが何回あるかを返します。date2 が後の日付なら正、前の日付なら負の値になります。",
    "example": "x = DateDiff(\"d\", Date, DateAdd(\"d\", 10, Date))",
    "caution": "単純な差ではなく区切りの数を数えます。たとえば interval が \"yyyy\" のとき、12月31日から1月1日へは1日しか離れていなくても 1 になります。",
    "status": "supported"
  },
  {
    "name": "DatePart",
    "category": "日時",
    "syntax": "DatePart(interval, date, [firstdayofweek, [firstweekofyear]])",
    "description": "日付から、interval で指定した部分（\"yyyy\"=年、\"m\"=月、\"d\"=日、\"q\"=四半期、\"ww\"=週番号など）を数値で取り出して返します。",
    "example": "x = DatePart(\"m\", Date)",
    "caution": "interval の \"w\" は曜日、\"y\" は年間通算日、\"ww\" は週番号を表します。",
    "status": "supported"
  },
  {
    "name": "DateSerial",
    "category": "日時",
    "syntax": "DateSerial(year, month, day)",
    "description": "年・月・日を指定して、その日付を表す値を組み立てて返します。",
    "example": "x = DateSerial(2026, 1, 15)",
    "caution": "month に 13、day に 0 などを指定すると、翌年や前月に繰り上げ・繰り下げて解釈されます（相対的な日付指定ができます）。",
    "status": "supported"
  },
  {
    "name": "DateValue",
    "category": "日時",
    "syntax": "DateValue(date)",
    "description": "日付を表す文字列を日付の値に変換して返します。時刻の部分は含まれません。",
    "example": "x = DateValue(\"2026/1/15\")",
    "caution": "文字列の解釈は実行環境の地域設定に依存します。日付として認識できない文字列を渡すと、型が一致しないエラーになります。",
    "status": "supported"
  },
  {
    "name": "Day",
    "category": "日時",
    "syntax": "Day(date)",
    "description": "日付から「日」を表す 1～31 の数値を返します。",
    "example": "x = Day(Date)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Month",
    "category": "日時",
    "syntax": "Month(date)",
    "description": "日付から「月」を表す 1～12 の数値を返します。",
    "example": "x = Month(Date)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Year",
    "category": "日時",
    "syntax": "Year(date)",
    "description": "日付から「年」を表す数値を返します。",
    "example": "x = Year(Date)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Hour",
    "category": "日時",
    "syntax": "Hour(time)",
    "description": "時刻から「時」を表す 0～23 の数値を返します。",
    "example": "x = Hour(Now)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Minute",
    "category": "日時",
    "syntax": "Minute(time)",
    "description": "時刻から「分」を表す 0～59 の数値を返します。",
    "example": "x = Minute(Now)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Second",
    "category": "日時",
    "syntax": "Second(time)",
    "description": "時刻から「秒」を表す 0～59 の数値を返します。",
    "example": "x = Second(Now)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "MonthName",
    "category": "日時",
    "syntax": "MonthName(month, [abbreviate])",
    "description": "月の番号に対応する月の名前（実行環境の言語）を返します。abbreviate に True を指定すると省略形を返します。",
    "example": "x = MonthName(1)",
    "caution": "month に Null を渡すと、実行時エラーになります。",
    "status": "supported"
  },
  {
    "name": "TimeSerial",
    "category": "日時",
    "syntax": "TimeSerial(hour, minute, second)",
    "description": "時・分・秒を指定して、その時刻を表す値を組み立てて返します。",
    "example": "x = TimeSerial(13, 30, 0)",
    "caution": "hour に 24 以上を指定するなど、範囲外の値は繰り上げて解釈されます。",
    "status": "supported"
  },
  {
    "name": "TimeValue",
    "category": "日時",
    "syntax": "TimeValue(time)",
    "description": "時刻を表す文字列を時刻の値に変換して返します。日付の部分は切り捨てられます。",
    "example": "x = TimeValue(\"13:30:00\")",
    "caution": "文字列の解釈は実行環境の地域設定に依存します。",
    "status": "supported"
  },
  {
    "name": "WeekdayName",
    "category": "日時",
    "syntax": "WeekdayName(weekday, [abbreviate, [firstdayofweek]])",
    "description": "曜日を表す番号に対応する曜日の名前（実行環境の言語）を返します。weekday は firstdayofweek を起点とする番号です。",
    "example": "x = WeekdayName(1)",
    "caution": "abbreviate に True を指定すると省略形を返します。",
    "status": "supported"
  },
  {
    "name": "DDB",
    "category": "数値",
    "syntax": "DDB(cost, salvage, life, period, [factor])",
    "description": "定率法（倍率法）によって、資産の period 期における減価償却費を返します。cost は取得価額、salvage は残存価額、life は耐用期間（期数）です。",
    "example": "x = DDB(100000, 10000, 5, 1)",
    "caution": "factor を省略すると 2（倍額定率法）になります。",
    "status": "supported"
  },
  {
    "name": "FV",
    "category": "数値",
    "syntax": "FV(rate, nper, pmt, [pv, [type]])",
    "description": "一定の支払額 pmt と一定の利率 rate に基づく投資の将来価値を返します。nper は期間数、pv は現在価値、type は支払時期（期末=0、期首=1）です。",
    "example": "x = FV(0.005, 12, -10000)",
    "caution": "金額の符号は、支払うお金を負、受け取るお金を正として表すのが原則です。",
    "status": "supported"
  },
  {
    "name": "IPmt",
    "category": "数値",
    "syntax": "IPmt(rate, per, nper, pv, [fv, [type]])",
    "description": "一定の支払額と一定の利率に基づき、per 期の支払額のうち利息にあたる部分を返します。",
    "example": "x = IPmt(0.01, 1, 12, 100000)",
    "caution": "金額の符号は、支払うお金を負、受け取るお金を正として表すのが原則です。",
    "status": "supported"
  },
  {
    "name": "IRR",
    "category": "数値",
    "syntax": "IRR(values(), [guess])",
    "description": "キャッシュフローの配列 values() に対する内部収益率を、反復計算によって返します。values() の各要素は、等間隔の期間ごとの収支です。",
    "example": "x = IRR(Array(-100000, 30000, 40000, 50000))",
    "caution": "values() には少なくとも1つの正の値と1つの負の値が必要です。収束しない場合はエラーになり、guess（既定は 0.1＝10%）を変えて再試行します。",
    "status": "supported"
  },
  {
    "name": "MIRR",
    "category": "数値",
    "syntax": "MIRR(values(), finance_rate, reinvest_rate)",
    "description": "キャッシュフローの配列に対する修正内部収益率を返します。負のキャッシュフローの借入利率 finance_rate と、正のキャッシュフローの再投資利率 reinvest_rate を分けて計算します。",
    "example": "x = MIRR(Array(-100000, 30000, 40000, 50000), 0.08, 0.05)",
    "caution": "values() には少なくとも1つの正の値と1つの負の値が必要です。",
    "status": "supported"
  },
  {
    "name": "NPer",
    "category": "数値",
    "syntax": "NPer(rate, pmt, pv, [fv, [type]])",
    "description": "一定の支払額 pmt と一定の利率 rate に基づく投資の期間数を返します。",
    "example": "x = NPer(0.01, -10000, 100000)",
    "caution": "金額の符号は、支払うお金を負、受け取るお金を正として表すのが原則です。",
    "status": "supported"
  },
  {
    "name": "NPV",
    "category": "数値",
    "syntax": "NPV(rate, values())",
    "description": "割引率 rate でキャッシュフローの配列 values() を割り引いた、正味現在価値を返します。",
    "example": "x = NPV(0.08, Array(30000, 40000, 50000))",
    "caution": "values() の最初の要素は1期間後のキャッシュフローとして割り引かれます。時点 0 の初期投資は配列に含めず、結果から別に差し引きます。",
    "status": "supported"
  },
  {
    "name": "Pmt",
    "category": "数値",
    "syntax": "Pmt(rate, nper, pv, [fv, [type]])",
    "description": "一定の利率 rate と期間数 nper に基づき、現在価値 pv に対する1期間あたりの支払額（元金と利息の合計）を返します。",
    "example": "x = Pmt(0.005, 12, 100000)",
    "caution": "金額の符号は、支払うお金を負、受け取るお金を正として表すのが原則です。",
    "status": "supported"
  },
  {
    "name": "PPmt",
    "category": "数値",
    "syntax": "PPmt(rate, per, nper, pv, [fv, [type]])",
    "description": "一定の支払額と一定の利率に基づき、per 期の支払額のうち元金にあたる部分を返します。",
    "example": "x = PPmt(0.01, 1, 12, 100000)",
    "caution": "金額の符号は、支払うお金を負、受け取るお金を正として表すのが原則です。",
    "status": "supported"
  },
  {
    "name": "PV",
    "category": "数値",
    "syntax": "PV(rate, nper, pmt, [fv, [type]])",
    "description": "一定の支払額 pmt と一定の利率 rate に基づき、将来の支払いの列の現在価値を返します。",
    "example": "x = PV(0.005, 12, -10000)",
    "caution": "金額の符号は、支払うお金を負、受け取るお金を正として表すのが原則です。",
    "status": "supported"
  },
  {
    "name": "Rate",
    "category": "数値",
    "syntax": "Rate(nper, pmt, pv, [fv, [type, [guess]]])",
    "description": "一定の支払額に基づく投資の、1期間あたりの利率を反復計算によって返します。",
    "example": "x = Rate(12, -10000, 100000)",
    "caution": "反復計算が収束しない場合はエラーになります。guess（既定は 0.1＝10%）を変えると収束する場合があります。",
    "status": "supported"
  },
  {
    "name": "SLN",
    "category": "数値",
    "syntax": "SLN(cost, salvage, life)",
    "description": "定額法による、資産の1期間あたりの減価償却費を返します。（cost － salvage）÷ life で計算されます。",
    "example": "x = SLN(100000, 10000, 5)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SYD",
    "category": "数値",
    "syntax": "SYD(cost, salvage, life, per)",
    "description": "年数合計法（級数法）によって、資産の per 期における減価償却費を返します。",
    "example": "x = SYD(100000, 10000, 5, 1)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "Choose",
    "category": "分岐",
    "syntax": "Choose(index, choice-1, [choice-2, ...])",
    "description": "index の値（1始まり）に対応する位置の選択肢を返します。index が選択肢の範囲外の場合は Null を返します。",
    "example": "x = Choose(2, \"a\", \"b\", \"c\")",
    "caution": "index が整数でない場合は、最も近い整数に丸めてから評価されます。",
    "status": "supported"
  },
  {
    "name": "IIf",
    "category": "分岐",
    "syntax": "IIf(expr, truepart, falsepart)",
    "description": "expr が True のときは truepart を、False のときは falsepart を返します。",
    "example": "x = IIf(score >= 60, \"合格\", \"再挑戦\")",
    "caution": "truepart と falsepart は、どちらが返る場合でも両方とも評価されます。評価されるとエラーになる式を書くと、If 文では起きないエラーが起きることがあります。",
    "status": "supported"
  },
  {
    "name": "Switch",
    "category": "分岐",
    "syntax": "Switch(expr-1, value-1, [expr-2, value-2, ...])",
    "description": "条件と値の組を左から順に評価し、最初に True になった条件に対応する値を返します。どの条件も True にならない場合は Null を返します。",
    "example": "x = Switch(n < 0, \"負\", n = 0, \"ゼロ\", n > 0, \"正\")",
    "caution": "返す値が決まった後も含め、式はすべて評価されるため、評価されるとエラーになる式は置けません。",
    "status": "supported"
  },
  {
    "name": "CVErr",
    "category": "エラー処理",
    "syntax": "CVErr(errornumber)",
    "description": "指定したエラー番号に対応するエラー値（Variant の Error サブタイプ）を返します。ユーザー定義の Function プロシージャからエラーを返すために使います。",
    "example": "x = CVErr(2042)",
    "caution": "errornumber が有効なエラー番号でない場合は、CVErr 自体が実行時エラーになります。",
    "status": "supported"
  },
  {
    "name": "Error",
    "category": "エラー処理",
    "syntax": "Error([errornumber]) ／ Error errornumber",
    "description": "エラー番号に対応するエラーメッセージの文字列を返します。errornumber を省略すると、直近に発生したエラーのメッセージを返します。文として使う形（Error errornumber）は、指定した番号の実行時エラーを発生させます。",
    "example": "x = Error(13)",
    "caution": "文として使う形（Error 番号）は未対応です（基礎エンジンが Error 文を受理しません）。対応しているのは関数の形のみです。",
    "status": "supported"
  },
  {
    "name": "IsArray",
    "category": "型変換",
    "syntax": "IsArray(varname)",
    "description": "変数が配列のとき True を返します。",
    "example": "x = IsArray(parts)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "IsDate",
    "category": "型変換",
    "syntax": "IsDate(expression)",
    "description": "式が日付として認識できるとき True を返します。",
    "example": "x = IsDate(\"2026/1/15\")",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "IsError",
    "category": "型変換",
    "syntax": "IsError(expression)",
    "description": "式がエラー値（CVErr で作られた値など）のとき True を返します。",
    "example": "x = IsError(cellValue)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "IsMissing",
    "category": "型変換",
    "syntax": "IsMissing(argname)",
    "description": "プロシージャの Optional 引数が、呼び出し時に省略されたかどうかを調べます。省略されていれば True を返します。",
    "example": "x = IsMissing(optArg)",
    "caution": "IsMissing が使えるのは Optional の Variant 引数だけです。本アプリはユーザー定義プロシージャを扱わないため、この関数の結果は常に False になります。",
    "status": "supported"
  },
  {
    "name": "IsObject",
    "category": "型変換",
    "syntax": "IsObject(identifier)",
    "description": "識別子がオブジェクトへの参照のとき True を返します。",
    "example": "x = IsObject(obj)",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "CreateObject",
    "category": "セル・オブジェクト",
    "syntax": "CreateObject(class, [servername])",
    "description": "指定したクラスの ActiveX オブジェクトを作成し、その参照を返します。【未対応の理由】外部の ActiveX／OLE オブジェクトの生成は、ブラウザ内シミュレーションでは原理的に再現できないため未対応です。",
    "example": "Set obj = CreateObject(\"Scripting.FileSystemObject\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Environ",
    "category": "入出力",
    "syntax": "Environ({envstring | n})",
    "description": "OS の環境変数の文字列を返します。名前（envstring）または環境文字列テーブル内の順序（n）で指定します。【未対応の理由】OS の環境変数はブラウザ内シミュレーションに存在しないため未対応です。",
    "example": "x = Environ(\"PATH\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "EOF",
    "category": "入出力",
    "syntax": "EOF(filenumber)",
    "description": "Open ステートメントで開いたファイルが、末尾に達したかどうかを返します。【未対応の理由】実ファイル入出力に依存するため未対応です。",
    "example": "x = EOF(1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "FileAttr",
    "category": "入出力",
    "syntax": "FileAttr(filenumber, [returntype])",
    "description": "Open ステートメントで開いたファイルの、開き方のモードや OS のファイルハンドルを返します。【未対応の理由】開いている実ファイルの情報参照に依存するため未対応です。",
    "example": "x = FileAttr(1, 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "FileDateTime",
    "category": "入出力",
    "syntax": "FileDateTime(pathname)",
    "description": "指定したファイルが作成された、または最後に変更された日時を返します。【未対応の理由】実ファイルの日時参照に依存するため未対応です。",
    "example": "x = FileDateTime(\"C:\\work\\book.xlsx\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "FileLen",
    "category": "入出力",
    "syntax": "FileLen(pathname)",
    "description": "指定したファイルの長さ（バイト数）を返します。【未対応の理由】実ファイルのサイズ参照に依存するため未対応です。",
    "example": "x = FileLen(\"C:\\work\\book.xlsx\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "GetAllSettings",
    "category": "入出力",
    "syntax": "GetAllSettings(appname, section)",
    "description": "Windows レジストリ内の Visual Basic の設定領域から、指定したアプリケーションのキー設定の一覧を、2次元配列で返します。【未対応の理由】Windows レジストリの読み取りはブラウザ内シミュレーションでは再現できないため未対応です。",
    "example": "x = GetAllSettings(\"MyApp\", \"Startup\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "GetObject",
    "category": "セル・オブジェクト",
    "syntax": "GetObject([pathname], [class])",
    "description": "指定したファイルに含まれる ActiveX オブジェクト、または指定したクラスの ActiveX オブジェクトへの参照を取得します。【未対応の理由】外部の ActiveX オブジェクトの取得はブラウザ内シミュレーションでは再現できないため未対応です。",
    "example": "Set obj = GetObject(\"C:\\work\\book.xlsx\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "GetSetting",
    "category": "入出力",
    "syntax": "GetSetting(appname, section, key, [default])",
    "description": "Windows レジストリ内の Visual Basic の設定領域から、指定したキー設定の値を返します。【未対応の理由】Windows レジストリの読み取りはブラウザ内シミュレーションでは再現できないため未対応です。",
    "example": "x = GetSetting(\"MyApp\", \"Startup\", \"Left\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Input",
    "category": "入出力",
    "syntax": "Input(number, [#]filenumber)",
    "description": "Open ステートメントで開いたシーケンシャルファイルから、number で指定した文字数を読み取って返します。【未対応の理由】実ファイルからの読み取りに依存するため未対応です。",
    "example": "x = Input(10, #1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Loc",
    "category": "入出力",
    "syntax": "Loc(filenumber)",
    "description": "Open ステートメントで開いたファイルの、現在の読み取り・書き込み位置を返します。【未対応の理由】実ファイルの現在位置に依存するため未対応です。",
    "example": "x = Loc(1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "LOF",
    "category": "入出力",
    "syntax": "LOF(filenumber)",
    "description": "Open ステートメントで開いたファイルのサイズ（バイト数）を返します。【未対応の理由】実ファイルのサイズに依存するため未対応です。",
    "example": "x = LOF(1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "MacID",
    "category": "型変換",
    "syntax": "MacID(constant)",
    "description": "Macintosh 上で、4文字の定数を対応する値に変換します。主にリソースの種類の指定に使います。【未対応の理由】Macintosh 固有の機能であり、対象環境に存在しないため未対応です。",
    "example": "x = MacID(\"TEXT\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "MacScript",
    "category": "手続き",
    "syntax": "MacScript(script)",
    "description": "Macintosh 上で AppleScript のスクリプトを実行し、その結果を返します。【未対応の理由】Macintosh のスクリプト実行はブラウザ内シミュレーションでは再現できないため未対応です。",
    "example": "x = MacScript(\"return 1\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Seek",
    "category": "入出力",
    "syntax": "Seek(filenumber) ／ Seek [#]filenumber, position",
    "description": "Open ステートメントで開いたファイルの、現在の読み取り・書き込み位置を返します。文として使う形は、ファイル内の位置を設定します。【未対応の理由】実ファイルの現在位置・位置設定に依存するため未対応です。",
    "example": "x = Seek(1)",
    "caution": "ステートメントとしての Seek（位置の設定）とは別の項目です。",
    "status": "unsupported"
  },
  {
    "name": "Spc",
    "category": "入出力",
    "syntax": "Spc(n)",
    "description": "Print # ステートメントや Debug.Print での出力に、n 個のスペースを挿入するための位置指定関数です。【未対応の理由】ファイル・印刷出力専用の位置指定であり、出力先を持たない本アプリでは再現できないため未対応です。",
    "example": "Debug.Print \"a\"; Spc(5); \"b\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Tab",
    "category": "入出力",
    "syntax": "Tab([n])",
    "description": "Print # ステートメントや Debug.Print での出力位置を、n 桁目へ移すための位置指定関数です。【未対応の理由】ファイル・印刷出力専用の位置指定であり、出力先を持たない本アプリでは再現できないため未対応です。",
    "example": "Debug.Print \"a\"; Tab(10); \"b\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Do...Loop",
    "category": "繰り返し",
    "syntax": "Do [{While | Until} condition] ... Loop",
    "description": "条件が満たされる間（While）、または条件が満たされるまで（Until）、ブロック内の文を繰り返し実行します。条件は Do の側にも Loop の側にも書けます。棚卸し表記の項目で、基礎の Do 文と同一実体です。",
    "example": "Dim i As Long\nDo While i < 3\n    i = i + 1\nLoop",
    "caution": "条件を書かない Do...Loop は、Exit Do で抜けなければ無限に繰り返します。",
    "status": "supported"
  },
  {
    "name": "Exit",
    "category": "文",
    "syntax": "Exit {Do | For | Function | Property | Sub}",
    "description": "Do ループ、For ループ、Function／Sub プロシージャなどを途中で抜けます。棚卸しでは Exit として一括された項目で、基礎では Exit Do／Exit For／Exit Sub として実装されています。",
    "example": "For i = 1 To 3\n    Exit For\nNext i",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "For Each...Next",
    "category": "繰り返し",
    "syntax": "For Each element In group ... Next [element]",
    "description": "配列やコレクションの各要素について、ブロック内の文を繰り返し実行します。棚卸し表記の項目で、基礎の For Each 文と同一実体です。",
    "example": "Dim v As Variant\nFor Each v In Array(1, 2)\n    Debug.Print v\nNext v",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "For...Next",
    "category": "繰り返し",
    "syntax": "For counter = start To end [Step step] ... Next [counter]",
    "description": "カウンタ変数を start から end まで step ずつ変化させながら、ブロック内の文を繰り返し実行します。棚卸し表記の項目で、基礎の For 文と同一実体です。",
    "example": "Dim total As Long\nFor i = 1 To 3\n    total = total + i\nNext i",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "If...Then...Else",
    "category": "分岐",
    "syntax": "If condition Then ... [ElseIf condition Then ...] [Else ...] End If",
    "description": "条件が True のときにブロック内の文を実行します。ElseIf で条件を追加し、Else でどの条件にも当てはまらない場合の処理を書きます。棚卸し表記の項目で、基礎の If 文と同一実体です。",
    "example": "Dim x As Long\nIf 1 = 1 Then\n    x = 1\nElse\n    x = 2\nEnd If",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "AppActivate",
    "category": "文",
    "syntax": "AppActivate title, [wait]",
    "description": "実行中の他のアプリケーションのウィンドウをアクティブにします。title にはタイトルバーに表示される文字列を指定します。【未対応の理由】OS のアプリケーションウィンドウの操作はブラウザ内シミュレーションでは再現できないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "AppActivate \"Microsoft Excel\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Beep",
    "category": "文",
    "syntax": "Beep",
    "description": "コンピュータのスピーカーからビープ音を鳴らします。【未対応の理由】システムのサウンド装置への出力はブラウザ内シミュレーションでは再現できないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Beep",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Call",
    "category": "手続き",
    "syntax": "Call name [argumentlist]",
    "description": "Sub または Function プロシージャへ制御を移して呼び出します。Call を使う場合は、引数リストを括弧で囲む必要があります。【未対応の理由】本アプリは単一の Sub のみを扱い、Call によるプロシージャ呼び出しは受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Call MySub(1, 2)",
    "caution": "Call を省略して呼び出す場合は、引数を括弧で囲みません。",
    "status": "unsupported"
  },
  {
    "name": "ChDir",
    "category": "入出力",
    "syntax": "ChDir path",
    "description": "カレントフォルダ（現在の作業フォルダ）を変更します。【未対応の理由】実ファイルシステムのカレントフォルダ変更に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "ChDir \"C:\\work\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ChDrive",
    "category": "入出力",
    "syntax": "ChDrive drive",
    "description": "カレントドライブを変更します。【未対応の理由】実ドライブの変更に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "ChDrive \"C\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Close",
    "category": "入出力",
    "syntax": "Close [[#]filenumberlist]",
    "description": "Open ステートメントで開いたファイル入出力を終了し、ファイルを閉じます。【未対応の理由】実ファイル入出力に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Close #1",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Const",
    "category": "宣言",
    "syntax": "Const constname [As type] = expression",
    "description": "定数を宣言します。定数には実行中に値を代入できません。モジュールレベルでは Public／Private も指定できます。【未対応の理由】基礎エンジンは Const 文を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。本アプリで使える定数は組み込み定数のみです。",
    "example": "Const MaxCount As Long = 100",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Declare",
    "category": "宣言",
    "syntax": "Declare [PtrSafe] {Sub | Function} name Lib \"libname\" [Alias \"aliasname\"] [([arglist])] [As type]",
    "description": "DLL（ダイナミックリンクライブラリ）に含まれる外部プロシージャを、モジュールレベルで宣言します。【未対応の理由】外部 DLL のプロシージャの宣言と実行はブラウザ内シミュレーションでは再現できないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Declare Function GetTickCount Lib \"kernel32\" () As Long",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Deftype",
    "category": "宣言",
    "syntax": "Deftype letterrange",
    "description": "DefBool、DefByte、DefInt、DefLng、DefCur、DefSng、DefDbl、DefDec、DefDate、DefStr、DefObj、DefVar など14種の総称です。変数名の先頭文字ごとに、宣言時の既定のデータ型をモジュールレベルで設定します。【未対応の理由】基礎エンジンは Deftype 系の宣言を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。（プローブは DefInt で実施）",
    "example": "DefInt I-N",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "DeleteSetting",
    "category": "入出力",
    "syntax": "DeleteSetting appname, section, [key]",
    "description": "Windows レジストリ内の Visual Basic の設定領域から、アプリケーションの設定（セクションまたはキー）を削除します。【未対応の理由】Windows レジストリの削除はブラウザ内シミュレーションでは再現できないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "DeleteSetting \"MyApp\", \"Startup\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "End",
    "category": "文",
    "syntax": "End",
    "description": "実行を直ちに終了します。変数の解放やファイルの終了処理は行われません。【未対応の理由】基礎エンジンは単独の End 文を持たず、End If などブロックの終端としてのみ扱うため未対応です。プローブでは「対応する開始文がありません：End」と停止しました。",
    "example": "End",
    "caution": "End If、End Select、End Sub などは、それぞれ対応するブロックの終端であり、この End 文とは別の扱いです。",
    "status": "unsupported"
  },
  {
    "name": "Enum",
    "category": "宣言",
    "syntax": "[Public | Private] Enum name ... End Enum",
    "description": "列挙型を定義します。メンバーには自動的に連番の Long 値が割り当てられます。【未対応の理由】基礎エンジンは Enum 定義を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。組み込みの列挙定数（vb〜 で始まる定数）は利用できます。",
    "example": "Enum Colors\n    Red\n    Green\nEnd Enum",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Erase",
    "category": "配列",
    "syntax": "Erase arraylist",
    "description": "配列を再初期化します。固定長配列では各要素が初期値に戻り、動的配列では確保した領域が解放されます。【未対応の理由】基礎エンジンは Erase 文を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Erase myArray",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Event",
    "category": "手続き",
    "syntax": "[Public] Event procedurename [(arglist)]",
    "description": "クラスモジュールで、カスタムイベントを宣言します。発生は RaiseEvent 文で行います。【未対応の理由】クラスモジュールとイベント機構を本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Public Event Finished()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "FileCopy",
    "category": "入出力",
    "syntax": "FileCopy source, destination",
    "description": "ファイルをコピーします。source はコピー元、destination はコピー先のパスです。【未対応の理由】実ファイルのコピーに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "FileCopy \"a.txt\", \"b.txt\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Function",
    "category": "手続き",
    "syntax": "[Public | Private | Friend] [Static] Function name [(arglist)] [As type] ... End Function",
    "description": "値を返すユーザー定義の Function プロシージャを定義します。戻り値は、プロシージャ名への代入で設定します。【未対応の理由】本アプリは単一の Sub のみを扱い、Function プロシージャの定義は受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Function Twice(ByVal n As Long) As Long\n    Twice = n * 2\nEnd Function",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Get",
    "category": "入出力",
    "syntax": "Get [#]filenumber, [recnumber], varname",
    "description": "Open ステートメントで開いたランダムアクセス／バイナリファイルから、変数へデータを読み取ります。【未対応の理由】実ファイルからの読み取りに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Get #1, 1, myValue",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "GoSub...Return",
    "category": "手続き",
    "syntax": "GoSub line ... Return",
    "description": "同じプロシージャ内のラベル行へ分岐し、Return 文で GoSub の次の文へ戻ります。【未対応の理由】基礎エンジンはラベルと GoSub...Return を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "GoSub MyLabel",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "GoTo",
    "category": "手続き",
    "syntax": "GoTo line",
    "description": "同じプロシージャ内のラベル行へ、無条件に分岐します。【未対応の理由】基礎エンジンは GoTo とラベルを受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。基礎のエラー処理は On Error GoTo 0 の範囲に限られます。",
    "example": "GoTo MyLabel",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Implements",
    "category": "宣言",
    "syntax": "Implements interfacename",
    "description": "クラスモジュールが、指定したインターフェース（または他のクラス）を実装することを宣言します。【未対応の理由】クラスモジュールを本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Implements IMyInterface",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Input #",
    "category": "入出力",
    "syntax": "Input #filenumber, varlist",
    "description": "Open ステートメントで開いたシーケンシャルファイルからデータを読み取り、カンマ区切りの値を varlist の変数へ順に代入します。【未対応の理由】実ファイルからの読み取りに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Input #1, myValue",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Kill",
    "category": "入出力",
    "syntax": "Kill pathname",
    "description": "指定したファイルを削除します。パスにワイルドカードも使えます。【未対応の理由】実ファイルの削除に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Kill \"a.txt\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Line Input #",
    "category": "入出力",
    "syntax": "Line Input #filenumber, varname",
    "description": "Open ステートメントで開いたシーケンシャルファイルから1行を読み取り、文字列変数へ代入します。【未対応の理由】実ファイルからの読み取りに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Line Input #1, myLine",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Load",
    "category": "文",
    "syntax": "Load object",
    "description": "フォームやコントロールなどのオブジェクトをメモリへ読み込みます（表示はされません）。【未対応の理由】UserForm などの GUI オブジェクトを本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Load UserForm1",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Lock",
    "category": "入出力",
    "syntax": "Lock [#]filenumber [, recordrange]",
    "description": "Open ステートメントで開いたファイルの全体、またはレコードの範囲を、他のプロセスからアクセスできないようロックします。【未対応の理由】実ファイルのロックに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Lock #1",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Unlock",
    "category": "入出力",
    "syntax": "Unlock [#]filenumber [, recordrange]",
    "description": "Lock 文でかけたロックを解除し、他のプロセスがファイルへアクセスできるようにします。【未対応の理由】実ファイルのロック解除に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Unlock #1",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "LSet",
    "category": "文字列",
    "syntax": "LSet stringvar = string",
    "description": "固定長文字列の変数へ、文字列を左詰めで代入します。ユーザー定義型の変数同士の代入にも使います。【未対応の理由】基礎エンジンは固定長文字列（String * 長さ）を未対応としており、LSet 文も受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "LSet myFixed = \"abc\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "MkDir",
    "category": "入出力",
    "syntax": "MkDir path",
    "description": "新しいフォルダを作成します。【未対応の理由】実ファイルシステムへのフォルダ作成に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "MkDir \"C:\\work\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Name",
    "category": "入出力",
    "syntax": "Name oldpathname As newpathname",
    "description": "ファイルやフォルダの名前を変更します。別のフォルダを指定すると移動もできます。【未対応の理由】実ファイル／フォルダの名前変更・移動に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Name \"a.txt\" As \"b.txt\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "On...GoSub, On...GoTo",
    "category": "手続き",
    "syntax": "On expression GoSub destinationlist / On expression GoTo destinationlist",
    "description": "式の値（1始まり）に応じて、列挙したラベルのうち対応する位置のラベルへ分岐します。GoSub 版は Return で戻ります。【未対応の理由】基礎エンジンはラベルへの分岐を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "On 1 GoTo Label1",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Open",
    "category": "入出力",
    "syntax": "Open pathname For mode [Access access] [lock] As [#]filenumber [Len=reclength]",
    "description": "ファイルを開き、ファイル番号を通じた入出力を可能にします。mode には Input、Output、Append、Random、Binary などを指定します。【未対応の理由】実ファイル入出力に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Open \"a.txt\" For Input As #1",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Option Compare",
    "category": "宣言",
    "syntax": "Option Compare {Binary | Text | Database}",
    "description": "モジュール内での文字列比較の既定の方法を指定します。Binary は文字コード順、Text は大文字小文字を区別しない順です。【未対応の理由】基礎エンジンは Option Compare を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。比較方法の指定は、StrComp や InStr などの compare 引数で行います。",
    "example": "Option Compare Text",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Option Private",
    "category": "宣言",
    "syntax": "Option Private Module",
    "description": "モジュールの内容（Public なプロシージャや変数など）を、他のプロジェクトから参照できないようにします。【未対応の理由】複数モジュール／プロジェクトの概念を本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Option Private Module",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Print #",
    "category": "入出力",
    "syntax": "Print #filenumber, [outputlist]",
    "description": "書式付きのデータを、Open ステートメントで開いたシーケンシャルファイルへ書き込みます。【未対応の理由】実ファイルへの書き込みに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Print #1, \"abc\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Private",
    "category": "宣言",
    "syntax": "Private [WithEvents] varname [([subscripts])] [As [New] type]",
    "description": "モジュールレベルの Private 変数を宣言します。その変数は、宣言したモジュール内でのみ使えます。【未対応の理由】基礎エンジンはモジュールレベルの Private 宣言を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。変数の宣言は Sub の中での Dim で行います。",
    "example": "Private myValue As Long",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Property Get",
    "category": "手続き",
    "syntax": "[Public | Private | Friend] [Static] Property Get name [(arglist)] [As type] ... End Property",
    "description": "クラスモジュールで、プロパティの値を返す Property プロシージャを定義します。【未対応の理由】クラスモジュールを本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Public Property Get MyValue() As Long\nEnd Property",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Property Let",
    "category": "手続き",
    "syntax": "[Public | Private | Friend] [Static] Property Let name ([arglist,] value) ... End Property",
    "description": "クラスモジュールで、プロパティへ値を設定する Property プロシージャを定義します。【未対応の理由】クラスモジュールを本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Public Property Let MyValue(ByVal v As Long)\nEnd Property",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Property Set",
    "category": "手続き",
    "syntax": "[Public | Private | Friend] [Static] Property Set name ([arglist,] reference) ... End Property",
    "description": "クラスモジュールで、プロパティへオブジェクト参照を設定する Property プロシージャを定義します。【未対応の理由】クラスモジュールを本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Public Property Set MyObj(ByVal v As Object)\nEnd Property",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Public",
    "category": "宣言",
    "syntax": "Public [WithEvents] varname [([subscripts])] [As [New] type]",
    "description": "モジュールレベルの Public 変数を宣言します。その変数は、すべてのモジュールから使えます。【未対応の理由】基礎エンジンはモジュールレベルの Public 宣言を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。変数の宣言は Sub の中での Dim で行います。",
    "example": "Public myValue As Long",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Put",
    "category": "入出力",
    "syntax": "Put [#]filenumber, [recnumber], varname",
    "description": "変数の内容を、Open ステートメントで開いたランダムアクセス／バイナリファイルへ書き込みます。【未対応の理由】実ファイルへの書き込みに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Put #1, 1, myValue",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "RaiseEvent",
    "category": "手続き",
    "syntax": "RaiseEvent eventname [(argumentlist)]",
    "description": "Event 文で宣言したカスタムイベントを発生させます。【未対応の理由】イベント機構を本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "RaiseEvent Finished",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Randomize",
    "category": "数値",
    "syntax": "Randomize [number]",
    "description": "乱数ジェネレータを初期化し、Rnd 関数が返す乱数の列を変えます。number を省略するとシステムタイマに基づく値が使われます。【未対応の理由】基礎エンジンは Randomize 文を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。Rnd 関数そのものは利用できます。",
    "example": "Randomize",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ReDim",
    "category": "配列",
    "syntax": "ReDim [Preserve] varname(subscripts) [As type]",
    "description": "動的配列の大きさを宣言し直します。Preserve を付けると、既存の要素の値を保持したまま大きさを変更できます。【未対応の理由】基礎エンジンは動的配列と ReDim を未対応として名指しで停止するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。固定長の配列は Dim で宣言します。",
    "example": "ReDim myArray(10)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Reset",
    "category": "入出力",
    "syntax": "Reset",
    "description": "Open ステートメントで開いたすべてのファイルを閉じ、書き込みバッファの内容をファイルへ書き込みます。【未対応の理由】実ファイル入出力に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Reset",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Resume",
    "category": "エラー処理",
    "syntax": "Resume [{Next | line}]",
    "description": "エラー処理ルーチンの終了後に、実行を再開します。Resume はエラーになった文から、Resume Next は次の文から、Resume line は指定したラベルから再開します。【未対応の理由】基礎エンジンのエラー処理は On Error Resume Next／On Error GoTo 0 の範囲に限られ、Resume 文は受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Resume Next",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "RmDir",
    "category": "入出力",
    "syntax": "RmDir path",
    "description": "空のフォルダを削除します。【未対応の理由】実ファイルシステムのフォルダ削除に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "RmDir \"C:\\work\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "RSet",
    "category": "文字列",
    "syntax": "RSet stringvar = string",
    "description": "固定長文字列の変数へ、文字列を右詰めで代入します。【未対応の理由】基礎エンジンは固定長文字列（String * 長さ）を未対応としており、RSet 文も受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "RSet myFixed = \"abc\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SaveSetting",
    "category": "入出力",
    "syntax": "SaveSetting appname, section, key, setting",
    "description": "Windows レジストリ内の Visual Basic の設定領域へ、アプリケーションの設定を保存します。【未対応の理由】Windows レジストリへの書き込みはブラウザ内シミュレーションでは再現できないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "SaveSetting \"MyApp\", \"Startup\", \"Left\", \"100\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SendKeys",
    "category": "入出力",
    "syntax": "SendKeys string, [wait]",
    "description": "キーボードから入力したかのように、キーストロークをアクティブなウィンドウへ送ります。【未対応の理由】OS へのキー入力送信はブラウザ内シミュレーションでは再現できないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "SendKeys \"abc\"",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Static",
    "category": "宣言",
    "syntax": "Static varname [([subscripts])] [As [New] type]",
    "description": "プロシージャの終了後も値を保持する、ローカル変数を宣言します。【未対応の理由】基礎エンジンは Static 宣言を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Static counter As Long",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Stop",
    "category": "文",
    "syntax": "Stop",
    "description": "実行を一時停止します。ファイルは閉じられず、変数の値も保持されます（デバッグ用途）。【未対応の理由】基礎エンジンは Stop 文を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Stop",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Type",
    "category": "宣言",
    "syntax": "[Private | Public] Type typename ... End Type",
    "description": "ユーザー定義型をモジュールレベルで定義します。メンバーには変数や固定長配列などを置けます。【未対応の理由】基礎エンジンは Type 定義を受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Type MyRecord\n    Id As Long\nEnd Type",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "While...Wend",
    "category": "繰り返し",
    "syntax": "While condition ... Wend",
    "description": "条件が True の間、ブロック内の文を繰り返し実行します。【未対応の理由】基礎エンジンは While...Wend 構文を受理せず、構文名を挙げて停止するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。同じ繰り返しは Do While...Loop で書けます。",
    "example": "Dim i As Long\nWhile i < 3\n    i = i + 1\nWend",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Width #",
    "category": "入出力",
    "syntax": "Width #filenumber, width",
    "description": "Open ステートメントで開いたファイルの出力行の幅（1行の文字数）を設定します。【未対応の理由】実ファイルへの出力設定に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Width #1, 80",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "With",
    "category": "文",
    "syntax": "With object ... End With",
    "description": "1つのオブジェクトに対する一連の文を、オブジェクト名を繰り返さずに書けるようにします。ブロック内では .プロパティ のように先頭のドットで参照します。【未対応の理由】基礎エンジンは With 文を未対応としており（基礎の対応範囲の説明にも未対応と明記）、受理しないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "With Range(\"A1\")\n    .Value = 1\nEnd With",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Write #",
    "category": "入出力",
    "syntax": "Write #filenumber, [outputlist]",
    "description": "データを、Open ステートメントで開いたシーケンシャルファイルへ、Input # で読み戻せる区切り付きの形式で書き込みます。【未対応の理由】実ファイルへの書き込みに依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Write #1, \"abc\", 123",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "DriveTypeConstants.Unknown",
    "category": "定数",
    "syntax": "Unknown",
    "description": "DriveTypeConstants グループの定数（値は 0）。FileSystemObject の Drive オブジェクトの DriveType プロパティが返す値の1つで、ドライブの種類を判別できないことを表します。",
    "example": "x = Unknown",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "DriveTypeConstants.Removable",
    "category": "定数",
    "syntax": "Removable",
    "description": "DriveTypeConstants グループの定数（値は 1）。FileSystemObject の Drive オブジェクトの DriveType プロパティが返す値の1つで、フロッピードライブなどの、メディアを取り外せるドライブを表します。",
    "example": "x = Removable",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "DriveTypeConstants.Fixed",
    "category": "定数",
    "syntax": "Fixed",
    "description": "DriveTypeConstants グループの定数（値は 2）。FileSystemObject の Drive オブジェクトの DriveType プロパティが返す値の1つで、ハードドライブなどの、メディアが固定されたドライブを表します。",
    "example": "x = Fixed",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "DriveTypeConstants.Remote",
    "category": "定数",
    "syntax": "Remote",
    "description": "DriveTypeConstants グループの定数（値は 3）。FileSystemObject の Drive オブジェクトの DriveType プロパティが返す値の1つで、ネットワークドライブを表します。",
    "example": "x = Remote",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "DriveTypeConstants.CDROM",
    "category": "定数",
    "syntax": "CDROM",
    "description": "DriveTypeConstants グループの定数（値は 4）。FileSystemObject の Drive オブジェクトの DriveType プロパティが返す値の1つで、CD-ROM ドライブを表します。",
    "example": "x = CDROM",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "DriveTypeConstants.RAMDisk",
    "category": "定数",
    "syntax": "RAMDisk",
    "description": "DriveTypeConstants グループの定数（値は 5）。FileSystemObject の Drive オブジェクトの DriveType プロパティが返す値の1つで、ローカルコンピュータの RAM を使った RAM ディスクを表します。",
    "example": "x = RAMDisk",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.Normal",
    "category": "定数",
    "syntax": "Normal",
    "description": "FileAttributeConstants グループの定数（値は 0）。ファイル属性を表す値の1つで、属性が設定されていない通常のファイルを表します。属性はビットの組み合わせで表されます。",
    "example": "x = Normal",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.ReadOnly",
    "category": "定数",
    "syntax": "ReadOnly",
    "description": "FileAttributeConstants グループの定数（値は 1）。ファイル属性を表す値の1つで、読み取り専用ファイルを表します。属性はビットの組み合わせで表されます。",
    "example": "x = ReadOnly",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.Hidden",
    "category": "定数",
    "syntax": "Hidden",
    "description": "FileAttributeConstants グループの定数（値は 2）。ファイル属性を表す値の1つで、隠しファイルを表します。属性はビットの組み合わせで表されます。",
    "example": "x = Hidden",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.System",
    "category": "定数",
    "syntax": "System",
    "description": "FileAttributeConstants グループの定数（値は 4）。ファイル属性を表す値の1つで、システムファイルを表します。属性はビットの組み合わせで表されます。",
    "example": "x = System",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.Volume",
    "category": "定数",
    "syntax": "Volume",
    "description": "FileAttributeConstants グループの定数（値は 8）。ファイル属性を表す値の1つで、ドライブのボリュームラベルを表します。属性はビットの組み合わせで表されます。",
    "example": "x = Volume",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.Directory",
    "category": "定数",
    "syntax": "Directory",
    "description": "FileAttributeConstants グループの定数（値は 16）。ファイル属性を表す値の1つで、フォルダ（ディレクトリ）を表します。属性はビットの組み合わせで表されます。",
    "example": "x = Directory",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.Archive",
    "category": "定数",
    "syntax": "Archive",
    "description": "FileAttributeConstants グループの定数（値は 32）。ファイル属性を表す値の1つで、前回のバックアップ以降に変更されたファイルを表します。属性はビットの組み合わせで表されます。",
    "example": "x = Archive",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.Alias",
    "category": "定数",
    "syntax": "Alias",
    "description": "FileAttributeConstants グループの定数（値は 64）。ファイル属性を表す値の1つで、リンク（ショートカット）を表します。属性はビットの組み合わせで表されます。",
    "example": "x = Alias",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileAttributeConstants.Compressed",
    "category": "定数",
    "syntax": "Compressed",
    "description": "FileAttributeConstants グループの定数（値は 128）。ファイル属性を表す値の1つで、圧縮されたファイルを表します。属性はビットの組み合わせで表されます。",
    "example": "x = Compressed",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileInputOutputConstants.ForReading",
    "category": "定数",
    "syntax": "ForReading",
    "description": "FileInputOutputConstants グループの定数（値は 1）。FileSystemObject の OpenTextFile などでファイルを開く方法を指定する値の1つで、ファイルを読み取り専用に開くことを表します。このモードでは書き込みはできません。",
    "example": "x = ForReading",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileInputOutputConstants.ForWriting",
    "category": "定数",
    "syntax": "ForWriting",
    "description": "FileInputOutputConstants グループの定数（値は 2）。FileSystemObject の OpenTextFile などでファイルを開く方法を指定する値の1つで、ファイルへ書き込むために開くことを表します。同名のファイルがある場合は内容が上書きされます。",
    "example": "x = ForWriting",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "FileInputOutputConstants.ForAppending",
    "category": "定数",
    "syntax": "ForAppending",
    "description": "FileInputOutputConstants グループの定数（値は 8）。FileSystemObject の OpenTextFile などでファイルを開く方法を指定する値の1つで、ファイルの末尾へ追記するために開くことを表します。",
    "example": "x = ForAppending",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "SpecialFolderConstants.WindowsFolder",
    "category": "定数",
    "syntax": "WindowsFolder",
    "description": "SpecialFolderConstants グループの定数（値は 0）。FileSystemObject の GetSpecialFolder メソッドの引数に使う値の1つで、Windows オペレーティングシステムのファイルが入る Windows フォルダを表します。",
    "example": "x = WindowsFolder",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "SpecialFolderConstants.SystemFolder",
    "category": "定数",
    "syntax": "SystemFolder",
    "description": "SpecialFolderConstants グループの定数（値は 1）。FileSystemObject の GetSpecialFolder メソッドの引数に使う値の1つで、ライブラリ、フォント、デバイスドライバが入る System フォルダを表します。",
    "example": "x = SystemFolder",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "SpecialFolderConstants.TemporaryFolder",
    "category": "定数",
    "syntax": "TemporaryFolder",
    "description": "SpecialFolderConstants グループの定数（値は 2）。FileSystemObject の GetSpecialFolder メソッドの引数に使う値の1つで、一時ファイルを置く Temp フォルダを表します。パスは TMP 環境変数で決まります。",
    "example": "x = TemporaryFolder",
    "caution": "この定数グループは、対応するタイプライブラリへの参照がプロジェクトにある場合に使える定数です（Microsoft Learn）。",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbScrollBars",
    "category": "定数",
    "syntax": "vbScrollBars",
    "description": "SystemColorConstants グループの定数（値は &H80000000、10進数では -2147483648）。Windows のシステム色の1つで、スクロールバーの色を表します。",
    "example": "x = vbScrollBars",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbDesktop",
    "category": "定数",
    "syntax": "vbDesktop",
    "description": "SystemColorConstants グループの定数（値は &H80000001、10進数では -2147483647）。Windows のシステム色の1つで、デスクトップの色を表します。",
    "example": "x = vbDesktop",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbActiveTitleBar",
    "category": "定数",
    "syntax": "vbActiveTitleBar",
    "description": "SystemColorConstants グループの定数（値は &H80000002、10進数では -2147483646）。Windows のシステム色の1つで、アクティブなウィンドウのタイトルバーの色を表します。",
    "example": "x = vbActiveTitleBar",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbInactiveTitleBar",
    "category": "定数",
    "syntax": "vbInactiveTitleBar",
    "description": "SystemColorConstants グループの定数（値は &H80000003、10進数では -2147483645）。Windows のシステム色の1つで、アクティブでないウィンドウのタイトルバーの色を表します。",
    "example": "x = vbInactiveTitleBar",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbMenuBar",
    "category": "定数",
    "syntax": "vbMenuBar",
    "description": "SystemColorConstants グループの定数（値は &H80000004、10進数では -2147483644）。Windows のシステム色の1つで、メニューの背景色を表します。",
    "example": "x = vbMenuBar",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbWindowBackground",
    "category": "定数",
    "syntax": "vbWindowBackground",
    "description": "SystemColorConstants グループの定数（値は &H80000005、10進数では -2147483643）。Windows のシステム色の1つで、ウィンドウの背景色を表します。",
    "example": "x = vbWindowBackground",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbWindowFrame",
    "category": "定数",
    "syntax": "vbWindowFrame",
    "description": "SystemColorConstants グループの定数（値は &H80000006、10進数では -2147483642）。Windows のシステム色の1つで、ウィンドウの枠の色を表します。",
    "example": "x = vbWindowFrame",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbMenuText",
    "category": "定数",
    "syntax": "vbMenuText",
    "description": "SystemColorConstants グループの定数（値は &H80000007、10進数では -2147483641）。Windows のシステム色の1つで、メニュー上の文字の色を表します。",
    "example": "x = vbMenuText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbWindowText",
    "category": "定数",
    "syntax": "vbWindowText",
    "description": "SystemColorConstants グループの定数（値は &H80000008、10進数では -2147483640）。Windows のシステム色の1つで、ウィンドウ内の文字の色を表します。",
    "example": "x = vbWindowText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbTitleBarText",
    "category": "定数",
    "syntax": "vbTitleBarText",
    "description": "SystemColorConstants グループの定数（値は &H80000009、10進数では -2147483639）。Windows のシステム色の1つで、タイトルバーなどの文字の色を表します。",
    "example": "x = vbTitleBarText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbActiveBorder",
    "category": "定数",
    "syntax": "vbActiveBorder",
    "description": "SystemColorConstants グループの定数（値は &H8000000A、10進数では -2147483638）。Windows のシステム色の1つで、アクティブなウィンドウの境界の色を表します。",
    "example": "x = vbActiveBorder",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbInactiveBorder",
    "category": "定数",
    "syntax": "vbInactiveBorder",
    "description": "SystemColorConstants グループの定数（値は &H8000000B、10進数では -2147483637）。Windows のシステム色の1つで、アクティブでないウィンドウの境界の色を表します。",
    "example": "x = vbInactiveBorder",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbApplicationWorkspace",
    "category": "定数",
    "syntax": "vbApplicationWorkspace",
    "description": "SystemColorConstants グループの定数（値は &H8000000C、10進数では -2147483636）。Windows のシステム色の1つで、MDI アプリケーションの背景色を表します。",
    "example": "x = vbApplicationWorkspace",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbHighlight",
    "category": "定数",
    "syntax": "vbHighlight",
    "description": "SystemColorConstants グループの定数（値は &H8000000D、10進数では -2147483635）。Windows のシステム色の1つで、コントロールで選択された項目の背景色を表します。",
    "example": "x = vbHighlight",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbHighlightText",
    "category": "定数",
    "syntax": "vbHighlightText",
    "description": "SystemColorConstants グループの定数（値は &H8000000E、10進数では -2147483634）。Windows のシステム色の1つで、選択された項目の文字の色を表します。",
    "example": "x = vbHighlightText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbButtonFace",
    "category": "定数",
    "syntax": "vbButtonFace",
    "description": "SystemColorConstants グループの定数（値は &H8000000F、10進数では -2147483633）。Windows のシステム色の1つで、コマンドボタンの表面の陰影の色を表します。",
    "example": "x = vbButtonFace",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbButtonShadow",
    "category": "定数",
    "syntax": "vbButtonShadow",
    "description": "SystemColorConstants グループの定数（値は &H80000010、10進数では -2147483632）。Windows のシステム色の1つで、コマンドボタンの縁の陰影の色を表します。",
    "example": "x = vbButtonShadow",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbGrayText",
    "category": "定数",
    "syntax": "vbGrayText",
    "description": "SystemColorConstants グループの定数（値は &H80000011、10進数では -2147483631）。Windows のシステム色の1つで、淡色表示（無効状態）の文字の色を表します。",
    "example": "x = vbGrayText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbButtonText",
    "category": "定数",
    "syntax": "vbButtonText",
    "description": "SystemColorConstants グループの定数（値は &H80000012、10進数では -2147483630）。Windows のシステム色の1つで、プッシュボタン上の文字の色を表します。",
    "example": "x = vbButtonText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbInactiveCaptionText",
    "category": "定数",
    "syntax": "vbInactiveCaptionText",
    "description": "SystemColorConstants グループの定数（値は &H80000013、10進数では -2147483629）。Windows のシステム色の1つで、アクティブでないタイトルバーの文字の色を表します。",
    "example": "x = vbInactiveCaptionText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vb3DHighlight",
    "category": "定数",
    "syntax": "vb3DHighlight",
    "description": "SystemColorConstants グループの定数（値は &H80000014、10進数では -2147483628）。Windows のシステム色の1つで、3D 表示要素のハイライト色を表します。",
    "example": "x = vb3DHighlight",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vb3DDKShadow",
    "category": "定数",
    "syntax": "vb3DDKShadow",
    "description": "SystemColorConstants グループの定数（値は &H80000015、10進数では -2147483627）。Windows のシステム色の1つで、3D 表示要素の最も濃い影の色を表します。",
    "example": "x = vb3DDKShadow",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vb3DLight",
    "category": "定数",
    "syntax": "vb3DLight",
    "description": "SystemColorConstants グループの定数（値は &H80000016、10進数では -2147483626）。Windows のシステム色の1つで、vb3DHighlight の次に明るい 3D の色を表します。",
    "example": "x = vb3DLight",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbInfoText",
    "category": "定数",
    "syntax": "vbInfoText",
    "description": "SystemColorConstants グループの定数（値は &H80000017、10進数では -2147483625）。Windows のシステム色の1つで、ツールチップの文字の色を表します。",
    "example": "x = vbInfoText",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "SystemColorConstants.vbInfoBackground",
    "category": "定数",
    "syntax": "vbInfoBackground",
    "description": "SystemColorConstants グループの定数（値は &H80000018、10進数では -2147483624）。Windows のシステム色の1つで、ツールチップの背景色を表します。",
    "example": "x = vbInfoBackground",
    "caution": "",
    "status": "supported"
  }
];

export const referenceOverrides = [
  {
    "name": "StrConv",
    "category": "文字列",
    "syntax": "StrConv(string, conversion, [localeID])",
    "description": "文字列に、conversion で指定した変換（VbStrConv 定数：vbUpperCase、vbLowerCase、vbProperCase、vbWide、vbNarrow、vbKatakana、vbHiragana など）を適用した結果を返します。",
    "example": "x = StrConv(\"ABC\", vbLowerCase)",
    "caution": "本アプリで対応する変換は一部に限られます（部分実装）。",
    "status": "supported"
  },
  {
    "name": "VarType",
    "category": "型変換",
    "syntax": "VarType(varname)",
    "description": "変数のサブタイプを表す数値（VbVarType 定数）を返します。引数が配列の場合は、vbArray（8192）と要素の型を表す値の合計を返します。",
    "example": "x = VarType(42)",
    "caution": "戻り値は vbInteger、vbString などの VbVarType 定数と比較して判定します。このアプリでは数値を Double として保持するため、整数リテラルでも vbDouble（5）を返します（実 VBA では整数リテラルは vbInteger（2）です）。",
    "status": "supported"
  },
  {
    "name": "Weekday",
    "category": "日時",
    "syntax": "Weekday(date, [firstdayofweek])",
    "description": "日付の曜日を表す数値を返します。firstdayofweek で指定した曜日を 1 として数え、省略時は日曜日が 1（日曜=1、月曜=2、…、土曜=7）です。",
    "example": "x = Weekday(Date)",
    "caution": "戻り値は vbSunday、vbMonday などの曜日定数と比較して判定します。",
    "status": "supported"
  },
  {
    "name": "FormatDateTime",
    "category": "日時",
    "syntax": "FormatDateTime(date, [namedformat])",
    "description": "日付や時刻を指定した書式で表した文字列を返します。namedformat には vbGeneralDate、vbLongDate、vbShortDate、vbLongTime、vbShortTime などの VbDateTimeFormat 定数を指定します。",
    "example": "x = FormatDateTime(Date, vbLongDate)",
    "caution": "実際の表示形式は、実行環境の地域設定に依存します。",
    "status": "supported"
  },
  {
    "name": "CallByName",
    "category": "セル・オブジェクト",
    "syntax": "CallByName(object, procname, calltype, [args()])",
    "description": "文字列で名前を指定して、オブジェクトのメソッドを実行したり、プロパティを設定・取得したりします。calltype には vbMethod などの VbCallType 定数を指定します。【未対応の理由】オブジェクトのメンバーを名前で動的に呼び出す機能であり、本アプリの値モデル（単一シートのセル範囲のみ）では再現できないため未対応です。",
    "example": "x = CallByName(Range(\"A1\"), \"Value\", vbGet)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Dir",
    "category": "入出力",
    "syntax": "Dir([pathname], [attributes])",
    "description": "指定したパターンやファイル属性に一致するファイルやフォルダの名前を返します。attributes には vbDirectory などのファイル属性定数を指定します。【未対応の理由】実ファイルシステムの検索に依存するため未対応です。本アプリは実ファイルにアクセスしません。",
    "example": "x = Dir(\"*.txt\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "GetAttr",
    "category": "入出力",
    "syntax": "GetAttr(pathname)",
    "description": "ファイルやフォルダの属性を表す数値を返します。戻り値は vbReadOnly、vbDirectory などのファイル属性定数の組み合わせです。【未対応の理由】実ファイルの属性取得に依存するため未対応です。",
    "example": "x = GetAttr(\"C:\\work\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Shell",
    "category": "入出力",
    "syntax": "Shell(pathname, [windowstyle])",
    "description": "実行可能プログラムを実行し、そのタスク ID を返します。windowstyle には vbNormalFocus などの VbAppWinStyle 定数を指定します。【未対応の理由】外部プログラムの実行はブラウザ内シミュレーションでは再現できないため未対応です。",
    "example": "x = Shell(\"notepad.exe\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SetAttr",
    "category": "文",
    "syntax": "SetAttr pathname, attributes",
    "description": "ファイルの属性を設定します。attributes には vbReadOnly、vbHidden などのファイル属性定数を指定します。【未対応の理由】実ファイルの属性設定に依存するため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "SetAttr \"a.txt\", vbNormal",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Unload",
    "category": "文",
    "syntax": "Unload object",
    "description": "フォームやコントロールなどのオブジェクトをメモリから解放します。【未対応の理由】UserForm などの GUI オブジェクトを本アプリは持たないため未対応です。基礎エンジンにプローブを通したところ、構文名を挙げて停止しました（報告書に記録）。",
    "example": "Unload UserForm1",
    "caution": "",
    "status": "unsupported"
  }
];
