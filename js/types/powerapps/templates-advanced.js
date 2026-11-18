// Power Fx 高度モード（ブロックB2）: 高度関数を使う教材。
// 形式は基礎 additional-templates.js と同じ（id/title/level/code/intro/refs）。
// refs は基礎リファレンスと reference-advanced.js の項目名を指す。
// 未対応・未検証の関数には依存しない。
export const templatesAdvanced = [
  {
    id: "fx-adv-stats",
    title: "平均・最大・標準偏差を求める",
    level: "応用",
    code: "ClearCollect(Scores, {Value: 60}, {Value: 80}, {Value: 100});\nSet(Avg, Average(Scores, Value));\nSet(Best, Max(Scores, Value));\nSet(Spread, StdevP(Scores, Value));\nNotify(Text(Avg) & \"/\" & Text(Best) & \"/\" & Text(Round(Spread, 1)))",
    intro: "テーブル形式の集計関数で平均80・最大100・母集団の標準偏差16.3を求めます。集計式は行の範囲で評価されます。",
    refs: ["ClearCollect", "Average", "Max", "StdevP", "Round", "Set", "Notify", "Text"],
  },
  {
    id: "fx-adv-shaping",
    title: "列を整形して並べ替える",
    level: "応用",
    code: "ClearCollect(Items, {Price: 100, Qty: 2}, {Price: 50, Qty: 5});\nClearCollect(Report, SortByColumns(AddColumns(Items, Total, Price * Qty), \"Total\", \"Descending\"));\nSet(Top, First(Report).Total);\nNotify(Text(Top))",
    intro: "AddColumnsで合計列を加え、SortByColumnsで降順に並べ、Firstで先頭の250を取り出します。整形関数は元のテーブルを変更しません。",
    refs: ["ClearCollect", "AddColumns", "SortByColumns", "First", "Set", "Notify", "Text"],
  },
  {
    id: "fx-adv-text",
    title: "文字列を分割して整える",
    level: "実践",
    code: "Set(Words, Concat(Split(\"apple, banana ,cherry\", \",\"), Proper(TrimEnds(Value)) & \";\"));\nNotify(Words)",
    intro: "Splitで区切り、TrimEndsとProperで各語を整え、Concatで連結します。結果は「Apple;Banana;Cherry;」です。",
    refs: ["Split", "Concat", "Proper", "TrimEnds", "Set", "Notify"],
  },
  {
    id: "fx-adv-error",
    title: "エラーを代替値に置き換える",
    level: "応用",
    code: "Set(Rate, IfError(Value(Input1.Text) / Value(\"0\"), -1));\nSet(Bad, IsError(Value(\"abc\")));\nNotify(If(Bad, \"変換エラー\", Text(Rate)))",
    intro: "IfErrorは0除算を捕まえて-1を返し、IsErrorは変換エラーを真偽値として判定します。エラーが評価全体を止めなくなります。",
    refs: ["IfError", "IsError", "Value", "Set", "Notify", "If", "Text"],
  },
  {
    id: "fx-adv-date",
    title: "締め切り日と曜日を計算する",
    level: "実践",
    code: "Set(Start, Date(2026, 1, 15));\nSet(Due, DateAdd(Start, 7));\nSet(Days, DateDiff(Start, Due));\nNotify(Due & \" 曜日=\" & Text(Weekday(Due)) & \" 日数=\" & Text(Days))",
    intro: "日時はこのモデルではISO形式の文字列です。2026-01-15の7日後は2026-01-22、曜日は5（木曜）、日数は7になります。",
    refs: ["Date", "DateAdd", "DateDiff", "Weekday", "Set", "Notify", "Text"],
  },
  {
    id: "fx-adv-group",
    title: "グループ化して数える",
    level: "応用",
    code: "ClearCollect(Sales, {City: \"東京\", V: 1}, {City: \"大阪\", V: 2}, {City: \"東京\", V: 3});\nClearCollect(ByCity, AddColumns(GroupBy(Sales, City, Rows), Count, CountRows(Rows)));\nSet(Tokyo, LookUp(ByCity, City = \"東京\", Count));\nNotify(Text(Tokyo))",
    intro: "GroupByで都市ごとにまとめ、AddColumnsとCountRowsで件数を付けます。東京の件数は2です。グループ化はUngroupで元に戻せます。",
    refs: ["ClearCollect", "GroupBy", "AddColumns", "CountRows", "LookUp", "Set", "Notify", "Text", "Ungroup"],
  },
];
