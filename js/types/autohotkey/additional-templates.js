const data = [
  {
    "id": "ahk-calc",
    "title": "変数と計算をメッセージにする",
    "level": "基礎",
    "code": "price := 120\ncount := 3\ntotal := price * count\nMsgBox total",
    "intro": "自動実行部分で数値変数を計算します。モデルeventはnullにし、ホットキーは発火させません。",
    "refs": [
      "MsgBox"
    ]
  },
  {
    "id": "ahk-match-window",
    "title": "完全一致でモデルウィンドウを選ぶ",
    "level": "実践",
    "code": "SetTitleMatchMode 3\nif WinExist(\"メモ帳\") {\n    WinActivate \"メモ帳\"\n    SendText \"練習中\"\n}\nMsgBox WinActive(\"メモ帳\")",
    "intro": "タイトルの完全一致でモデルウィンドウを探して入力します。実Windowsには接続しません。",
    "refs": [
      "SetTitleMatchMode",
      "WinExist",
      "WinActivate",
      "SendText",
      "WinActive"
    ]
  },
  {
    "id": "ahk-nested-index",
    "title": "二重ループで行と列を入力する",
    "level": "応用",
    "code": "Loop 2 {\n    row := A_Index\n    Loop 2 {\n        SendText row . \":\" . A_Index . \"`n\"\n    }\n}\nMsgBox \"完了\"",
    "intro": "外側のA_Indexをrowへ保存し、内側では列番号を使います。結果は明示したモデルウィンドウの文字列です。",
    "refs": [
      "Loop",
      "SendText",
      "MsgBox"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  for (const t of result) t.model.event = null;
  return result;
}
