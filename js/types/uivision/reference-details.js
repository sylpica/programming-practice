// Return contracts and primary documentation for the supported teaching subset.
export const referenceDetails = {
  "open": {
    "description": "指定URLを現在のモデルタブで開きます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/open"
  },
  "click": {
    "description": "ロケーターに一致する要素をクリックします。モデルに明示したonClick効果だけを反映します。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/click"
  },
  "type": {
    "description": "入力要素の値を置き換えます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/type"
  },
  "store": {
    "description": "Targetの値を、Valueで指定した変数に保存します。",
    "returns": "変数に保存した値",
    "source": "https://ui.vision/rpa/docs/selenium-ide/store"
  },
  "storeText": {
    "description": "要素のテキストを変数へ保存します。入力要素では空文字列、ロケーター不一致では#LNFです。",
    "returns": "変数に保存した値",
    "source": "https://ui.vision/rpa/docs/selenium-ide/storetext"
  },
  "storeValue": {
    "description": "入力要素のvalueを変数へ保存します。ロケーター不一致では#LNFです。",
    "returns": "変数に保存した値",
    "source": "https://ui.vision/rpa/docs/selenium-ide/storevalue"
  },
  "echo": {
    "description": "テキストや変数の内容をログへ出力します。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/echo"
  },
  "if": {
    "description": "JavaScript条件が真の場合のブロックを選びます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/if"
  },
  "elseif": {
    "description": "先行条件が偽で、この条件が真の場合のブロックを選びます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/if"
  },
  "else": {
    "description": "先行する条件がすべて偽の場合のブロックです。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/if"
  },
  "end": {
    "description": "条件またはループのブロックを閉じます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/if"
  },
  "while": {
    "description": "条件が成立している間、本体を繰り返します。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/while"
  },
  "times": {
    "description": "指定した回数だけ本体を繰り返します。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/times"
  },
  "executeScript_Sandbox": {
    "description": "ページから隔離した式を評価し、returnの結果を変数へ保存します。本モデルは単純式の部分集合です。",
    "returns": "変数に保存した値",
    "source": "https://ui.vision/rpa/docs/selenium-ide/executescript"
  },
  "break": {
    "description": "最も内側のループを終了します。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/"
  },
  "continue": {
    "description": "現在の反復の残りを飛ばして次の反復へ進みます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/"
  },
  "assertText": {
    "description": "要素のテキストを期待文字列と完全一致で検証します。不一致はエラーです。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/asserttext-verifytext"
  }
};
