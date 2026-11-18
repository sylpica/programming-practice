// AutoHotkey v2 高度差分テンプレート（ADV-B2）
// 高度差分で対応した関数・文だけを使い、未対応項目には依存しない。
// 基礎セット（index.js の templates）には合成しない（合成は別ブロックの担当）。
const model = () => ({
  event: null,
  variables: {},
  windows: [{ id: 1, title: "メモ帳", text: "", exists: true }],
  activeId: 1,
  mouse: { x: 0, y: 0 },
  keys: [],
});
export const templatesAdvanced = [
  {
    id: "ahk-adv-format",
    title: "Formatと文字列関数で整形する",
    level: "高度",
    code: 'name := Trim("  tanaka  ")\ncode := Format("{:04d}", 42)\nMsgBox StrUpper(name) . " / " . code',
    intro: "Trim で前後の空白を取り除き、Format の書式指定（0埋め4桁）と StrUpper で整形して表示します。",
    refs: ["Trim", "Format", "StrUpper", "MsgBox"],
    model: model(),
  },
  {
    id: "ahk-adv-array-map",
    title: "配列とMapのメソッドを使う",
    level: "高度",
    code: 'scores := [70, 85, 60]\nscores.Push(90)\ntotal := 0\nfor v in scores {\n    total += v\n}\nrank := Map("first", scores[2])\nMsgBox total . " / " . rank.Get("first")',
    intro: "配列へ Push で追加し、合計を数えます。Map にはキーと値の組を入れ、Get で取り出します。",
    refs: ["Array.Push", "Map", "Map.Get", "MsgBox"],
    model: model(),
  },
  {
    id: "ahk-adv-try-regex",
    title: "Try/Catchと正規表現で検証する",
    level: "高度",
    code: 'text := "order-2024-001"\nTry {\n    pos := RegExMatch(text, "\\d{4}", &m)\n    year := m[0]\n} Catch Error as e {\n    year := "error: " . e.Message\n}\nMsgBox year',
    intro: "RegExMatch で年らしい数字を探し、マッチオブジェクトから全体の一致を取り出します。エラーが起きた場合は Catch でメッセージを受け取ります。",
    refs: ["Try", "Catch", "Throw", "RegExMatch", "RegExMatchInfo.Pos", "MsgBox"],
    model: model(),
  },
  {
    id: "ahk-adv-switch-parse",
    title: "SwitchとLoop Parseで振り分ける",
    level: "高度",
    code: 'out := ""\nLoop Parse, "red,green,blue", "," {\n    Switch A_LoopField {\n    Case "red":\n        out .= "R"\n    Case "green":\n        out .= "G"\n    Default:\n        out .= "?"\n    }\n}\nMsgBox out',
    intro: "Loop Parse でカンマ区切りを1つずつ取り出し（A_LoopField）、Switch で値ごとに振り分けます。一致しないものは Default です。",
    refs: ["Loop Parse", "Switch", "MsgBox"],
    model: model(),
  },
  {
    id: "ahk-adv-date-sort",
    title: "日付計算と並べ替え",
    level: "高度",
    code: 'start := "20240101000000"\nnextWeek := DateAdd(start, 7, "Days")\ndays := DateDiff(nextWeek, start, "Days")\nlist := Sort("pear`napple`nkiwi")\nMsgBox FormatTime(nextWeek, "yyyy-MM-dd") . " (" . days . ") " . list',
    intro: "DateAdd で1週間後のタイムスタンプを作り、DateDiff で日数を確認します。Sort で改行区切りの項目を並べ替え、FormatTime で読みやすい日付にします。",
    refs: ["DateAdd", "DateDiff", "FormatTime", "Sort", "MsgBox"],
    model: model(),
  },
  {
    id: "ahk-adv-buffer",
    title: "Bufferへ数値を読み書きする",
    level: "高度",
    code: 'buf := Buffer(8)\nNumPut("Int", 123456, buf)\nNumPut("Short", -7, buf, 4)\na := NumGet(buf, 0, "Int")\nb := NumGet(buf, 4, "Short")\nMsgBox a . " / " . b',
    intro: "Buffer をバイト列として用意し、NumPut でオフセットを指定して数値を書き込み、NumGet で読み戻します。実メモリではなく教材のモデル上で読み書きします。",
    refs: ["Buffer", "NumPut", "NumGet", "MsgBox"],
    model: model(),
  },
];
