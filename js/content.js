export const templates = [
  {
    id: "cells",
    title: "基礎 · セルに値を入れる",
    code: `Sub はじめてのマクロ()
    Dim price As Long
    price = 100
    Range("A1").Value = price
    Range("B1").Value = "りんご"
    Debug.Print Range("A1").Value
End Sub`,
    intro:
      "Dimで変数を用意し、RangeのValueでモデルシートへ書き込みます。最後にDebug.Printの出力を確認します。",
    refs: ["Dim", "Range", "Value", "Debug.Print"],
  },
  {
    id: "if",
    title: "基礎 · 点数で条件分岐",
    code: `Sub 合否判定()
    Dim score As Long
    score = Range("B2").Value
    If score >= 80 Then
        Range("C2").Value = "合格"
    ElseIf score >= 60 Then
        Range("C2").Value = "再挑戦"
    Else
        Range("C2").Value = "復習しよう"
    End If
End Sub`,
    intro:
      "B2のモデル値に基づいて、成立する条件を上から順に確認します。B2を「未確定」にすると到達可能な分岐を探索します。",
    refs: ["If", "Range", "Value", "Long"],
  },
  {
    id: "for",
    title: "繰り返し · 合計を求める",
    code: `Sub 合計()
    Dim i As Long
    Dim total As Long
    For i = 1 To 5
        total = total + i
    Next i
    Range("A5").Value = total
    MsgBox total
End Sub`,
    intro:
      "1から5までを加算します。Nextでカウンターが増え、終了時にはiが6になることも追えます。",
    refs: ["For", "Next", "Cells", "MsgBox"],
  },
  {
    id: "each",
    title: "繰り返し · セルを巡回",
    code: `Sub 一括入力()
    Dim cell As Range
    For Each cell In Range("A1:A5")
        cell.Value = 100
    Next cell
End Sub`,
    intro:
      "For Eachは範囲内のセルを順に取り出します。Setで扱うオブジェクトと通常の値の違いを学べます。",
    refs: ["For Each", "Range", "Value", "Set"],
  },
  {
    id: "input",
    title: "分岐 · 入力によって変わる処理",
    code: `Sub 入力の分岐()
    Dim answer As String
    answer = InputBox("はい または いいえ")
    Select Case answer
        Case "はい"
            MsgBox "開始します"
        Case "いいえ"
            MsgBox "終了します"
        Case Else
            MsgBox "入力を確認してください"
    End Select
End Sub`,
    intro:
      "InputBoxの入力値は未確定のまま扱います。Caseは上から順に評価され、最初に一致した処理だけが実行されます。",
    refs: ["InputBox", "Select Case", "MsgBox"],
  },
  {
    id: "do",
    title: "繰り返し · 条件で終了",
    code: `Sub 条件ループ()
    Dim n As Long
    n = 0
    Do While n < 3
        n = n + 1
        Debug.Print n
    Loop
End Sub`,
    intro:
      "条件を確認してから処理します。Do Untilでは条件が成立した時点で終了します。",
    refs: ["Do", "Debug.Print", "Long"],
  },
  {
    id: "array",
    title: "配列 · 添字とエラー",
    code: `Option Base 1
Sub 配列の確認()
    Dim items(3) As String
    items(1) = "りんご"
    items(2) = "みかん"
    Debug.Print LBound(items), UBound(items)
    On Error Resume Next
    Debug.Print items(4)
    Debug.Print Err.Number
    On Error GoTo 0
End Sub`,
    intro:
      "Option Base 1では省略した下限が1になります。範囲外の添字はエラー9。Resume Nextがあると次の文へ進みます。",
    refs: ["Option Base", "LBound", "UBound", "On Error", "Err.Number"],
  },
  {
    id: "text",
    title: "文字列 · 表記を整える",
    code: `Sub 文字列の整理()
    Dim name As String
    name = "  excel vba  "
    name = UCase(Trim(name))
    Range("A1").Value = name
    Debug.Print Len(name)
    Debug.Print Left(name, 5)
End Sub`,
    intro:
      "前後の半角スペースを除き、大文字にそろえます。文字数や先頭の文字を取り出す関数も確認しましょう。",
    refs: ["Trim", "UCase", "Len", "Left"],
  },
];
// name, category, syntax, explanation, example, caution, executable
const rows = [
  [
    "Dim",
    "宣言",
    "Dim 名前 As 型",
    "変数と型を宣言します。Asを省略した変数はVariantです。",
    "Dim count As Long",
    "Dim a, b As Long では a はVariant、bだけがLongです。",
    1,
  ],
  [
    "Long",
    "型",
    "Dim n As Long",
    "32ビットの符号付き整数。初期値は0です。",
    "Dim total As Long",
    "範囲は-2147483648～2147483647。超えるとエラー6です。",
    1,
  ],
  [
    "Integer",
    "型",
    "Dim n As Integer",
    "16ビットの符号付き整数です。",
    "Dim n As Integer",
    "範囲は-32768～32767。大きな行番号にはLongを使います。",
    1,
  ],
  [
    "Variant",
    "型",
    "Dim value As Variant",
    "数値・文字列・Empty・Nullなどを格納できます。",
    "Dim value As Variant",
    "演算結果は内部の型によって変わります。未初期化はEmptyです。",
    1,
  ],
  [
    "String",
    "型",
    "Dim text As String",
    "文字列を格納する型。初期値は空文字列です。",
    "Dim title As String",
    "Nullの代入はエラー94になります。",
    1,
  ],
  [
    "Boolean",
    "型",
    "Dim flag As Boolean",
    "True / False を格納します。",
    "Dim flag As Boolean",
    "数値への変換ではTrueは-1、Falseは0です。",
    1,
  ],
  [
    "Double",
    "型",
    "Dim x As Double",
    "倍精度の浮動小数点数です。",
    "Dim x As Double",
    "小数には丸め誤差があります。",
    1,
  ],
  [
    "Range",
    "セル・オブジェクト",
    'Range("A1").Value',
    "セルやセル範囲を表すオブジェクトです。",
    'Range("A1:A3").Value = 100',
    "本アプリではA1:C5の単一シートのみ。複数セルのValue読み取りは未対応です。",
    1,
  ],
  [
    "Cells",
    "セル・オブジェクト",
    "Cells(行, 列).Value",
    "行番号・列番号でセルを指定します。番号は1始まりです。",
    'Cells(2, 3).Value = "完了"',
    "Cells(2, 3)はC2。モデルシート範囲外は未対応と表示します。",
    1,
  ],
  [
    "Value",
    "セル・オブジェクト",
    "セル.Value = 値",
    "セルの値を読み書きします。",
    'Range("A1").Value = 100',
    "モデルシートにない実際のExcelの値は推測しません。",
    1,
  ],
  [
    "Value2",
    "セル・オブジェクト",
    "セル.Value2",
    "日付型・通貨型へ変換せずに値を扱います。",
    'Debug.Print Range("A1").Value2',
    "このモデルには日付・通貨のセル型はありません。",
    1,
  ],
  [
    "Row",
    "セル・オブジェクト",
    "セル.Row",
    "範囲の先頭行番号を返します。",
    'Debug.Print Range("B3").Row',
    "結果は3です。",
    1,
  ],
  [
    "Column",
    "セル・オブジェクト",
    "セル.Column",
    "範囲の先頭列番号を返します。",
    'Debug.Print Range("B3").Column',
    "結果は2です。",
    1,
  ],
  [
    "Count",
    "セル・オブジェクト",
    "範囲.Count",
    "範囲のセル数を返します。",
    'Debug.Print Range("A1:A5").Count',
    "結果は5です。",
    1,
  ],
  [
    "Set",
    "セル・オブジェクト",
    "Set obj = オブジェクト",
    "オブジェクトへの参照を代入します。",
    'Set cell = Range("A1")',
    "値の代入にはSetを使いません。未設定オブジェクトの参照はエラー91です。",
    1,
  ],
  [
    "Worksheet",
    "セル・オブジェクト",
    "Dim ws As Worksheet",
    "ワークシートを表す型です。",
    'Set ws = ThisWorkbook.Worksheets("Sheet1")',
    "宣言と未設定エラーのみ対応。実シートの取得・操作は未対応です。",
    0,
  ],
  [
    "Worksheets",
    "セル・オブジェクト",
    'Worksheets("シート名")',
    "ブックのワークシート一覧にアクセスします。",
    'Worksheets("Sheet1").Range("A1").Value = 1',
    "名前が存在しないとエラー9。シミュレーションは未対応です。",
    0,
  ],
  [
    "Workbook",
    "セル・オブジェクト",
    "Dim wb As Workbook",
    "Excelブックを表す型です。",
    "Set wb = ThisWorkbook",
    "宣言と未設定エラーのみ対応。ブック操作は未対応です。",
    0,
  ],
  [
    "Workbooks",
    "セル・オブジェクト",
    "Workbooks.Open(パス)",
    "開いているブックの一覧です。Openでファイルを開きます。",
    'Set wb = Workbooks.Open("C:\\data.xlsx")',
    "外部ファイルの読み書きはシミュレーション未対応です。",
    0,
  ],
  [
    "ThisWorkbook",
    "セル・オブジェクト",
    "ThisWorkbook",
    "マクロのコードを保存しているブックです。",
    "Debug.Print ThisWorkbook.Name",
    "ActiveWorkbookとは異なる場合があります。シミュレーション未対応です。",
    0,
  ],
  [
    "ActiveWorkbook",
    "セル・オブジェクト",
    "ActiveWorkbook",
    "現在アクティブなブックです。",
    "Debug.Print ActiveWorkbook.Name",
    "ユーザー操作で変わります。シミュレーション未対応です。",
    0,
  ],
  [
    "Offset",
    "セル・オブジェクト",
    "範囲.Offset(行, 列)",
    "基準セルから相対移動した範囲を返します。",
    'Range("A1").Offset(1, 1).Value = 10',
    "シミュレーション未対応です。",
    0,
  ],
  [
    "ClearContents",
    "セル・オブジェクト",
    "範囲.ClearContents",
    "セルの数式と値を削除します。書式は残ります。",
    'Range("A1").ClearContents',
    "シミュレーション未対応です。",
    0,
  ],
  [
    "If",
    "分岐",
    "If 条件 Then … ElseIf 条件 Then … Else … End If",
    "成立した最初の条件のブロックを実行します。",
    'If n > 0 Then\n    MsgBox "正"\nEnd If',
    "複数行形式のみ対応。Nullの条件は成立しません。",
    1,
  ],
  [
    "Select Case",
    "分岐",
    "Select Case 値 … Case Is >= 80 … Case 1 To 5 … End Select",
    "上から順にCaseを評価し、最初に一致した処理を実行します。",
    'Select Case n\nCase 1 To 3\n    MsgBox "範囲内"\nEnd Select',
    "Caseを抜けると他のCaseは実行しません。",
    1,
  ],
  [
    "For",
    "繰り返し",
    "For i = 開始 To 終了 Step 増分 … Next i",
    "開始・終了・Stepをループ開始時に評価します。",
    "For i = 5 To 1 Step -1\n    Debug.Print i\nNext i",
    "終了値を含みます。Step 0は終了しない可能性があります。",
    1,
  ],
  [
    "Next",
    "繰り返し",
    "Next i",
    "カウンターをStep分増やし、Forの条件へ戻ります。",
    "Next i",
    "終了時のカウンターは通常、終了値を超えた値です。",
    1,
  ],
  [
    "For Each",
    "繰り返し",
    "For Each item In 集合 … Next item",
    "配列やRangeの要素を順番に扱います。",
    'For Each cell In Range("A1:A5")\n    cell.Value = 1\nNext cell',
    "配列はVariant、RangeはVariantまたはObject型の変数を使います。",
    1,
  ],
  [
    "Do",
    "繰り返し",
    "Do While 条件 … Loop / Do … Loop Until 条件",
    "Whileは条件成立中、Untilは条件成立まで繰り返します。",
    "Do While n < 3\n    n = n + 1\nLoop",
    "後判定なら最初の1回は必ず実行します。未確定条件は代表パスを表示します。",
    1,
  ],
  [
    "Exit For",
    "繰り返し",
    "Exit For",
    "最も内側のFor / For Eachから抜けます。",
    "If i = 3 Then\n    Exit For\nEnd If",
    "カウンターを増やさずループの次へ進みます。",
    1,
  ],
  [
    "Exit Do",
    "繰り返し",
    "Exit Do",
    "最も内側のDoループから抜けます。",
    "Exit Do",
    "Forを抜けるにはExit Forを使います。",
    1,
  ],
  [
    "Exit Sub",
    "手続き",
    "Exit Sub",
    "現在のSubをただちに終了します。",
    "Exit Sub",
    "後続の文は実行されません。",
    1,
  ],
  [
    "Sub",
    "手続き",
    "Sub 名前() … End Sub",
    "値を返さない手続きです。",
    'Sub Sample()\n    MsgBox "こんにちは"\nEnd Sub',
    "本アプリは引数なしの単一Sub、または文だけのコードに対応します。",
    1,
  ],
  [
    "Debug.Print",
    "入出力",
    "Debug.Print 式, 式",
    "VBEのイミディエイトウィンドウへ出力します。",
    'Debug.Print "合計", total',
    "アプリでは出力欄に表示。タブ位置やセミコロン書式は未対応です。",
    1,
  ],
  [
    "MsgBox",
    "入出力",
    "MsgBox メッセージ",
    "メッセージダイアログを表示します。",
    'MsgBox "完了"',
    "本アプリはメッセージ1引数の文のみ。押したボタンの返り値は扱いません。",
    1,
  ],
  [
    "InputBox",
    "入出力",
    'InputBox("質問")',
    "文字列の入力を受け取ります。キャンセルは空文字列です。",
    'answer = InputBox("名前は？")',
    "入力を捏造しません。結果は未確定として分岐探索に使います。",
    1,
  ],
  [
    "On Error",
    "エラー処理",
    "On Error Resume Next / On Error GoTo 0",
    "実行時エラーを無視して次の文へ進むか、通常の停止に戻します。",
    "On Error Resume Next",
    "GoTo ラベル形式のハンドラーは未対応。構文エラーは無視しません。",
    1,
  ],
  [
    "Err.Number",
    "エラー処理",
    "Err.Number",
    "最後に発生した実行時エラーの番号です。",
    "Debug.Print Err.Number",
    "エラーがまだなければ0です。Err.Clearは未対応です。",
    1,
  ],
  [
    "Option Explicit",
    "宣言",
    "Option Explicit",
    "変数の宣言を必須にします。",
    "Option Explicit\nDim n As Long",
    "未宣言変数は説明を停止して表示します。",
    1,
  ],
  [
    "Option Base",
    "配列",
    "Option Base 0 / Option Base 1",
    "配列宣言で省略した添字下限を指定します。",
    "Option Base 1\nDim items(3) As String",
    "明示した下限は優先されます。多次元・動的配列は未対応です。",
    1,
  ],
  [
    "Array",
    "配列",
    "Array(値1, 値2, …)",
    "Variant配列を作成します。",
    "items = Array(10, 20, 30)",
    "この非修飾Arrayの下限にはOption Baseが適用されます。",
    1,
  ],
  [
    "LBound",
    "配列",
    "LBound(配列)",
    "配列の添字の下限です。",
    "Debug.Print LBound(items)",
    "本アプリでは1次元のみ対応します。",
    1,
  ],
  [
    "UBound",
    "配列",
    "UBound(配列)",
    "配列の添字の上限です。",
    "Debug.Print UBound(items)",
    "要素数そのものではありません。",
    1,
  ],
  [
    "Len",
    "文字列",
    "Len(文字列)",
    "文字数を返します。",
    'Debug.Print Len("Excel")',
    "NullにはNull。バイト数を調べるLenBは未対応です。",
    1,
  ],
  [
    "Left",
    "文字列",
    "Left(文字列, 文字数)",
    "先頭から指定数の文字を取り出します。",
    'Debug.Print Left("Excel", 2)',
    "負の文字数はエラー5です。",
    1,
  ],
  [
    "Right",
    "文字列",
    "Right(文字列, 文字数)",
    "末尾から指定数の文字を取り出します。",
    'Debug.Print Right("Excel", 2)',
    "0文字なら空文字列です。",
    1,
  ],
  [
    "Mid",
    "文字列",
    "Mid(文字列, 開始位置[, 文字数])",
    "1始まりの位置から文字を取り出します。",
    'Debug.Print Mid("Excel", 2, 2)',
    "開始位置0以下はエラー5。Mid文による置換は未対応です。",
    1,
  ],
  [
    "Trim",
    "文字列",
    "Trim(文字列)",
    "前後の半角スペースを除きます。",
    'Debug.Print Trim("  VBA  ")',
    "全角スペースやタブは除きません。",
    1,
  ],
  [
    "UCase",
    "文字列",
    "UCase(文字列)",
    "英字を大文字へ変換します。",
    'Debug.Print UCase("vba")',
    "NullにはNullを返します。",
    1,
  ],
  [
    "LCase",
    "文字列",
    "LCase(文字列)",
    "英字を小文字へ変換します。",
    'Debug.Print LCase("VBA")',
    "日本語文字には通常変化がありません。",
    1,
  ],
  [
    "Replace",
    "文字列",
    "Replace(文字列, 検索文字, 置換文字)",
    "一致する文字列を置換します。",
    'Debug.Print Replace("a-b", "-", "/")',
    "本アプリは3引数のバイナリ比較のみです。",
    1,
  ],
  [
    "InStr",
    "文字列",
    "InStr(文字列, 検索文字)",
    "最初に一致した位置を1始まりで返します。",
    'Debug.Print InStr("Excel", "c")',
    "見つからなければ0。本アプリは2引数形式のみです。",
    1,
  ],
  [
    "CStr",
    "型変換",
    "CStr(値)",
    "値を文字列へ変換します。",
    "Debug.Print CStr(100)",
    "Nullはエラー94です。",
    1,
  ],
  [
    "CInt",
    "型変換",
    "CInt(値)",
    "Integerへ変換します。",
    "Debug.Print CInt(2.5)",
    "ちょうど.5は偶数への丸め。範囲外はエラー6です。",
    1,
  ],
  [
    "CLng",
    "型変換",
    "CLng(値)",
    "Longへ変換します。",
    "Debug.Print CLng(3.5)",
    "整数への変換は切り捨てではありません。",
    1,
  ],
  [
    "CDbl",
    "型変換",
    "CDbl(値)",
    "Doubleへ変換します。",
    'Debug.Print CDbl("12.5")',
    "数値にできない文字列はエラー13です。地域依存書式は未対応。",
    1,
  ],
  [
    "Val",
    "型変換",
    "Val(文字列)",
    "文字列の先頭にある数値部分を読みます。",
    'Debug.Print Val("12abc")',
    "小数点はピリオド。16進数・型接尾辞はこのモデルでは未対応です。",
    1,
  ],
  [
    "IsNumeric",
    "型変換",
    "IsNumeric(値)",
    "数値として評価できるか調べます。",
    'Debug.Print IsNumeric("12")',
    "本アプリは10進数の通常表記に対応します。",
    1,
  ],
  [
    "IsEmpty",
    "型変換",
    "IsEmpty(値)",
    "VariantがEmptyかどうかを返します。",
    "Debug.Print IsEmpty(Empty)",
    "空文字列とEmptyは異なります。",
    1,
  ],
  [
    "IsNull",
    "型変換",
    "IsNull(値)",
    "値がNullかどうかを返します。",
    "Debug.Print IsNull(Null)",
    "Null = Null はTrueではなくNullです。",
    1,
  ],
  [
    "Abs",
    "数値",
    "Abs(数値)",
    "絶対値を返します。",
    "Debug.Print Abs(-3)",
    "NullにはNullを返します。",
    1,
  ],
  [
    "Int",
    "数値",
    "Int(数値)",
    "負の無限大方向へ整数化します。",
    "Debug.Print Int(-1.8)",
    "結果は-2。Fixとは負数で異なります。",
    1,
  ],
  [
    "Fix",
    "数値",
    "Fix(数値)",
    "小数部を0方向へ切り捨てます。",
    "Debug.Print Fix(-1.8)",
    "結果は-1です。",
    1,
  ],
  [
    "Round",
    "数値",
    "Round(数値[, 桁数])",
    "指定した小数桁数に丸めます。",
    "Debug.Print Round(2.5)",
    "VBAは偶数丸め。ExcelのROUND関数と違うことがあります。",
    1,
  ],
  [
    "Date",
    "日時",
    "Date",
    "実行日の値を返します。",
    "Debug.Print Date",
    "実行時に決まる値として表示します。日付演算は未対応です。",
    1,
  ],
  [
    "Now",
    "日時",
    "Now",
    "実行時の日時を返します。",
    "Debug.Print Now",
    "現在時刻を仮定して説明しません。",
    1,
  ],
];
export const reference = rows.map(
  ([name, category, syntax, description, example, caution, supported]) => ({
    name,
    category,
    syntax,
    description,
    example,
    caution,
    supported: !!supported,
  }),
);
export const glossary = [
  ["マクロ", "操作を自動化するプログラム。ExcelではVBAで記述できます。"],
  ["VBE", "VBAコードを編集するVisual Basic Editor。Alt + F11で開きます。"],
  ["変数", "名前を付けて値を保存する場所です。"],
  ["代入", "右側の値を左側の変数やセルに保存する操作です。"],
  [
    "オブジェクト",
    "セル・シート・ブックなど、プロパティやメソッドを持つ対象です。",
  ],
  ["プロパティ", "オブジェクトが持つ値や状態。セルの値などです。"],
  ["メソッド", "オブジェクトに対する操作です。"],
  ["条件分岐", "条件に応じて実行する処理を変えることです。"],
  ["ループ", "条件や回数に従って処理を繰り返すことです。"],
  ["配列", "添字を使って複数の値をまとめて扱う入れ物です。"],
  ["実行時エラー", "コードを実行している間に発生するエラーです。"],
  ["イミディエイトウィンドウ", "VBEで出力の確認や短い式の評価に使う画面です。"],
  [
    "モデルシート",
    "このアプリが説明に使用する小さな仮想ワークシートです。実際のExcelとは接続していません。",
  ],
];
export function usedReferences(tokens) {
  let found = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "id") continue;
    for (let r of [...reference].sort(
      (a, b) => b.name.length - a.name.length,
    )) {
      let pieces = r.name.toLowerCase().match(/[\w]+|\./g),
        slice = tokens.slice(i, i + pieces.length);
      if (
        slice.length === pieces.length &&
        slice.every(
          (t, j) => t.type !== "string" && t.v.toLowerCase() === pieces[j],
        )
      ) {
        if (!found.includes(r.name)) found.push(r.name);
        break;
      }
    }
  }
  return found;
}
