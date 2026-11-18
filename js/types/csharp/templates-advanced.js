// 高度モード B5：C# 高度テンプレート（高度差分）。基礎層と同形式。
// code は文レベルの断片で、index.js の consoleProgram で包まれる前提。
// 使う項目はすべて高度モードで supported になる見込みの代表項目に限り、
// ラムダ・デリゲート必須の項目（Enumerable.Where 等）や画面制御系は使わない。
const data = [
  {
    "id": "cs-adv-string-basic",
    "title": "文字列を取り出す・探す",
    "level": "高度",
    "code": "string text = \"programming\";\nConsole.WriteLine(text.Length);\nConsole.WriteLine(text.Substring(0, 4));\nConsole.WriteLine(text.IndexOf(\"gram\"));\nConsole.WriteLine(text.Contains(\"ram\"));\nConsole.WriteLine(text.ToUpper());",
    "intro": "文字列の長さ、部分文字列の取り出し、検索と大文字化を既知値で確認します。",
    "refs": [
      "String.Length",
      "String.Substring",
      "String.IndexOf",
      "String.Contains",
      "String.ToUpper",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-adv-string-edit",
    "title": "文字列を分割・結合・整形する",
    "level": "高度",
    "code": "string csv = \"apple,banana,cherry\";\nstring[] parts = csv.Split(',');\nConsole.WriteLine(parts.Length);\nConsole.WriteLine(parts[1]);\nstring joined = String.Join(\"-\", parts);\nConsole.WriteLine(joined);\nstring padded = \"  tea  \";\nConsole.WriteLine(padded.Trim());\nConsole.WriteLine(padded.Trim().Length);",
    "intro": "カンマ区切りを配列へ分割し、別の区切りで結合します。Trimで前後の空白も取り除きます。",
    "refs": [
      "String.Split",
      "Array.Length",
      "String.Join",
      "String.Trim",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-adv-math",
    "title": "Mathで絶対値・比較・丸めを使う",
    "level": "高度",
    "code": "Console.WriteLine(Math.Abs(-7));\nConsole.WriteLine(Math.Max(12, 30));\nConsole.WriteLine(Math.Min(12, 30));\nConsole.WriteLine(Math.Clamp(42, 0, 10));\nConsole.WriteLine(Math.Sign(-5));\nConsole.WriteLine(Math.Sqrt(81));",
    "intro": "Mathの静的メソッドで絶対値、最大・最小、範囲への丸め込み、符号、平方根を求めます。",
    "refs": [
      "Math.Abs",
      "Math.Max",
      "Math.Min",
      "Math.Clamp",
      "Math.Sign",
      "Math.Sqrt",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-adv-linq-list",
    "title": "配列をリスト化して調べ、重複を除いて集計する",
    "level": "高度",
    "code": "int[] scores = {70, 85, 60, 85};\nConsole.WriteLine(scores.ToList().Count);\nConsole.WriteLine(scores.ToList().IndexOf(85));\nConsole.WriteLine(scores.ToList().Contains(60));\nConsole.WriteLine(scores.Distinct().Count());\nConsole.WriteLine(scores.Skip(1).Take(2).Sum());\nConsole.WriteLine(scores.Sum());",
    "intro": "配列をToList()でその場でリスト化し、件数・位置・含むかを調べます。Listを変数に保持する形は使わず、連鎖の中だけで使います。Distinctで重複を除いた件数と、SkipとTakeで切り取った範囲の合計も確認します。",
    "refs": [
      "Enumerable.ToList",
      "List<T>.Count",
      "List<T>.IndexOf",
      "List<T>.Contains",
      "Enumerable.Distinct",
      "Enumerable.Count",
      "Enumerable.Skip",
      "Enumerable.Take",
      "Enumerable.Sum",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-adv-hashset",
    "title": "ToHashSetで重複を取り除いて集合を比べる",
    "level": "高度",
    "code": "string[] tags = {\"tea\", \"coffee\", \"tea\", \"cake\"};\nConsole.WriteLine(tags.ToHashSet().Count);\nConsole.WriteLine(tags.ToHashSet().Contains(\"coffee\"));\nConsole.WriteLine(tags.ToHashSet().Contains(\"juice\"));\nConsole.WriteLine(tags.ToHashSet().SetEquals(new string[]{\"tea\", \"coffee\", \"cake\"}));",
    "intro": "配列をToHashSet()でその場で集合化し、重複を取り除いた件数と含むかを調べます。集合を変数に保持する形は使わず、連鎖の中だけで使います。SetEqualsで別の配列と要素が一致するかも確認します。",
    "refs": [
      "Enumerable.ToHashSet",
      "HashSet<T>.Count",
      "HashSet<T>.Contains",
      "HashSet<T>.SetEquals",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-adv-linq",
    "title": "LINQで合計・最大・平均を求める",
    "level": "高度",
    "code": "int[] values = {4, 8, 15, 16, 23, 42};\nConsole.WriteLine(values.Sum());\nConsole.WriteLine(values.Max());\nConsole.WriteLine(values.Min());\nConsole.WriteLine(values.Count());\nConsole.WriteLine(values.Average());",
    "intro": "配列に対してLINQの集計メソッド（拡張メソッド）を呼び、合計・最大・最小・件数・平均を求めます。条件式を渡す形は使っていません。",
    "refs": [
      "Enumerable.Sum",
      "Enumerable.Max",
      "Enumerable.Min",
      "Enumerable.Count",
      "Enumerable.Average",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-adv-datetime",
    "title": "DateTimeで日付を読み、進める",
    "level": "高度",
    "code": "Console.WriteLine(DateTime.Parse(\"2026-11-17\").Year);\nConsole.WriteLine(DateTime.Parse(\"2026-11-17\").Month);\nConsole.WriteLine(DateTime.Parse(\"2026-11-17\").Day);\nConsole.WriteLine(DateTime.Parse(\"2026-11-17\").AddDays(14).Month);\nConsole.WriteLine(DateTime.Parse(\"2026-11-17\").AddDays(14).Day);\nConsole.WriteLine(DateTime.DaysInMonth(2026, 11));\nConsole.WriteLine(DateTime.Parse(\"2026-11-17\").DayOfWeek);",
    "intro": "文字列をDateTime.Parseで読み、その場で年月日と曜日を読み取ります。日付を変数に保持する形は使わず、Parseからの連鎖で読みます。14日進めると月をまたぐことと、11月の日数も確認します。現在時刻は使いません。",
    "refs": [
      "DateTime.Parse",
      "DateTime.Year",
      "DateTime.Month",
      "DateTime.Day",
      "DateTime.AddDays",
      "DateTime.DaysInMonth",
      "DateTime.DayOfWeek",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-adv-timespan",
    "title": "TimeSpanをParseで読み、成分と合計を比べる",
    "level": "高度",
    "code": "Console.WriteLine(TimeSpan.Parse(\"1.02:30:00\").Days);\nConsole.WriteLine(TimeSpan.Parse(\"1.02:30:00\").Hours);\nConsole.WriteLine(TimeSpan.Parse(\"1.02:30:00\").TotalHours);\nConsole.WriteLine(TimeSpan.Parse(\"02:30:00\").TotalMinutes);\nConsole.WriteLine(TimeSpan.Parse(\"01:00:00\").Add(TimeSpan.Parse(\"00:30:00\")).TotalMinutes);\nConsole.WriteLine(TimeSpan.Parse(\"02:00:00\").Subtract(TimeSpan.Parse(\"00:30:00\")).TotalMinutes);",
    "intro": "文字列をTimeSpan.Parseで読み、その場で日・時などの成分とTotal系の合計量を読み取ります。期間を変数に保持する形は使わず、Parseからの連鎖で読みます。AddとSubtractで期間を足し引きした結果も確認します。",
    "refs": [
      "TimeSpan.Parse",
      "TimeSpan.Days",
      "TimeSpan.Hours",
      "TimeSpan.TotalHours",
      "TimeSpan.TotalMinutes",
      "TimeSpan.Add",
      "TimeSpan.Subtract",
      "Console.WriteLine"
    ]
  }
];

// 契約（advanced-interface.md 第5章）に基づく定数エクスポート。
// model は付けない（基礎テンプレートと同じく、実行時に種類の既定モデルが使われる）。
export const templatesAdvanced = data;
