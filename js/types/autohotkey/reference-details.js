// Return contracts and primary documentation for the supported teaching subset.
export const referenceDetails = {
  "Send": {
    "returns": "戻り値なし",
    "source": "https://www.autohotkey.com/docs/v2/lib/Send.htm"
  },
  "SendText": {
    "returns": "戻り値なし",
    "source": "https://www.autohotkey.com/docs/v2/lib/Send.htm"
  },
  "WinExist": {
    "returns": "HWND、見つからなければ0",
    "source": "https://www.autohotkey.com/docs/v2/lib/WinExist.htm"
  },
  "WinActive": {
    "returns": "HWND、一致しなければ0",
    "source": "https://www.autohotkey.com/docs/v2/lib/WinActive.htm"
  },
  "WinActivate": {
    "returns": "戻り値なし",
    "source": "https://www.autohotkey.com/docs/v2/lib/WinActivate.htm"
  },
  "WinClose": {
    "returns": "戻り値なし",
    "source": "https://www.autohotkey.com/docs/v2/lib/WinClose.htm"
  },
  "SetTitleMatchMode": {
    "returns": "変更前の一致モード（Integerまたは\"RegEx\"）または変更前の速度設定（\"Fast\"／\"Slow\"）",
    "source": "https://www.autohotkey.com/docs/v2/lib/SetTitleMatchMode.htm"
  },
  "Click": {
    "returns": "戻り値なし",
    "source": "https://www.autohotkey.com/docs/v2/lib/Click.htm"
  },
  "MouseMove": {
    "returns": "戻り値なし",
    "source": "https://www.autohotkey.com/docs/v2/lib/MouseMove.htm"
  },
  "Sleep": {
    "returns": "戻り値なし",
    "source": "https://www.autohotkey.com/docs/v2/lib/Sleep.htm"
  },
  "MsgBox": {
    "returns": "押されたボタンを表す文字列（例：OK）",
    "source": "https://www.autohotkey.com/docs/v2/lib/MsgBox.htm"
  },
  "InputBox": {
    "returns": "ValueとResultを持つオブジェクト",
    "source": "https://www.autohotkey.com/docs/v2/lib/InputBox.htm"
  },
  "IsSet": {
    "returns": "代入済みなら1、未代入なら0",
    "source": "https://www.autohotkey.com/docs/v2/Variables.htm"
  },
  "IsSetRef": {
    "returns": "参照先が代入済みなら1、未代入なら0",
    "source": "https://www.autohotkey.com/docs/v2/Variables.htm"
  },
  "if": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://www.autohotkey.com/docs/v2/lib/If.htm"
  },
  "Loop": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://www.autohotkey.com/docs/v2/lib/Loop.htm"
  },
  "while": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://www.autohotkey.com/docs/v2/lib/While.htm"
  },
  "for": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://www.autohotkey.com/docs/v2/lib/For.htm"
  },
  "break": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://www.autohotkey.com/docs/v2/lib/Break.htm"
  },
  "continue": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://www.autohotkey.com/docs/v2/lib/Continue.htm"
  },
  "return": {
    "returns": "戻り値なし、またはreturn式の値",
    "source": "https://www.autohotkey.com/docs/v2/lib/Return.htm"
  },
  "A_Index": {
    "returns": "現在の繰り返し回数（Integer、ループ外では0）",
    "source": "https://www.autohotkey.com/docs/v2/Variables.htm"
  },
  "A_*（組み込み変数）": {
    "returns": "各変数の現在の値（A_Space・A_Tabは固定値、A_TitleMatchModeは現在の一致モード、それ以外は実行時に決まる値）",
    "source": "https://www.autohotkey.com/docs/v2/Variables.htm"
  },
  "Length": {
    "returns": "配列の要素数（Integer）",
    "source": "https://www.autohotkey.com/docs/v2/lib/Array.htm"
  },
  "Hotkey": {
    "returns": "ホットキー定義（この教材ではイベント本体）",
    "source": "https://www.autohotkey.com/docs/v2/Hotkeys.htm"
  },
  "Hotstring": {
    "returns": "ホットストリング定義（置換）",
    "source": "https://www.autohotkey.com/docs/v2/Hotstrings.htm"
  }
};
