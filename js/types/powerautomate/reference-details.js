// Return contracts and primary documentation for the supported teaching subset.
export const referenceDetails = {
  "Set variable": {
    "returns": "指定した変数に値を設定",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/variables#assign",
    "description": "新規または既存の変数に値を設定します。"
  },
  "Increase variable": {
    "returns": "指定した数値変数を更新",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/variables#increasevariable",
    "description": "数値変数を指定量だけ増加させます。"
  },
  "Display input dialog": {
    "returns": "UserInputとButtonPressed。本モデルの入力は未確定",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/display#inputdialog",
    "description": "入力ダイアログで得る文字列と押されたボタンを扱います。本モデルでは入力値を捏造しません。"
  },
  "If": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/conditionals#if",
    "description": "条件が成立したときだけブロック内のアクションを実行します。"
  },
  "Else": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/conditionals#else",
    "description": "前のIf条件が成立しなかった場合のブロックです。"
  },
  "Else if": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/conditionals#elseif",
    "description": "前のIfやElse ifの条件がすべて成立せず、この条件が成立した場合のブロックです。条件を複数段つなげられます。"
  },
  "End": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/flowcontrol#end",
    "description": "条件ブロックまたはループの終わりです。"
  },
  "Loop": {
    "returns": "LoopIndex（本モデルではtargetで指定）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#loop",
    "description": "開始・終了・増分に従ってインデックスを更新し、アクションを繰り返します。"
  },
  "For each": {
    "returns": "CurrentItem（本モデルではtargetで指定）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#foreach",
    "description": "リストの各項目を順に変数へ入れ、本体を実行します。"
  },
  "Loop condition": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#while",
    "description": "条件が成立している間、本体を繰り返します。"
  },
  "Exit loop": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops#break",
    "description": "現在のループから抜け、ループの後へ進みます。"
  },
  "Write text to file": {
    "returns": "出力変数なし。モデルファイルの内容を更新",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/file#writetext",
    "description": "テキストを指定先へ書き込み、追記または上書きします。本モデルのファイルだけを更新します。"
  },
  "Read text from file": {
    "returns": "FileContents（本モデルではtargetで指定）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/file#readtextfromfile",
    "description": "指定先のテキストを読み込みます。本モデルに明示した内容だけを扱います。"
  },
  "Send email": {
    "returns": "出力変数なし。実送信せずモデルへ記録",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/email#sendemail",
    "description": "メール作成・送信アクションを説明します。実際のSMTP通信はせず、モデルに記録します。"
  },
  "Display message": {
    "returns": "ButtonPressed（本モデルはメッセージの出力のみ）",
    "source": "https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/display#showmessagedialog",
    "description": "メッセージダイアログを表示する操作を、アプリの出力として説明します。"
  }
};
