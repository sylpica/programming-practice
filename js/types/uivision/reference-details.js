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
    "description": "テキストや変数の内容をログへ出力します。Value欄に色を指定すると、ログの表示色を指定できます（任意）。",
    "syntax": "echo | テキスト | 色（任意）",
    "caution": "色にはredやgreenなどの色名、または#shownotificationを指定できます。このモデルでは色はログ出力のテキストには反映しません。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/echo"
  },
  "if": {
    "description": "JavaScript条件が真の場合のブロックを選びます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/if"
  },
  "elseif": {
    "description": "先行条件が偽で、この条件が真の場合のブロックを選びます。製品でのコマンド名の綴りはelseIfで、このモデルではelseif／elseIfのどちらも使えます。",
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
  "Number": {
    "description": "式の中で文字列などを数値へ変換します（JavaScriptのNumber関数）。executeScript_Sandboxのreturn式などで使います。",
    "returns": "変換した数値（変換できない場合は NaN）",
    "source": "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Number"
  },
  "break": {
    "description": "最も内側のループを終了します。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide#break"
  },
  "continue": {
    "description": "現在の反復の残りを飛ばして次の反復へ進みます。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide#continue"
  },
  "assertText": {
    "description": "要素のテキストを期待パターンと照合して検証します。パターンはワイルドカード（*は任意の文字列、?は任意の1文字）を使ったglob形式で、exact:を付けると完全一致、regexp:を付けると正規表現として照合します。不一致はエラーです。",
    "returns": "式の戻り値なし（コマンド）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/asserttext-verifytext"
  },
  "String": {
    "description": "式の中で値を文字列へ変換します（JavaScriptのString関数）。executeScript_Sandboxのreturn式などで使います。",
    "returns": "変換した文字列",
    "source": "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String"
  },
  "${!times}": {
    "description": "timesループの中で使える組み込み変数です。現在の繰り返し回数を1始まりで表します。",
    "returns": "現在の繰り返し回数（1始まり）",
    "source": "https://ui.vision/rpa/docs/selenium-ide/times"
  },
  "!statusOK": {
    "description": "コマンドの成否を表す組み込み変数です。エラーになった場合や、storeText／storeValueで要素が見つからず#LNFになった場合にfalseになります。falseは成功したコマンドでは自動では戻らず、storeでtrueを保存すると手動で戻せます。",
    "returns": "真偽値（正常時はtrue、エラーや#LNFのときfalse）",
    "source": "https://ui.vision/rpa/docs/#!statusok"
  },
  "!errorIgnore": {
    "description": "文字列\"true\"に設定すると、コマンドでエラーが起きてもマクロを止めずに継続します。",
    "returns": "設定値（文字列）",
    "source": "https://ui.vision/rpa/docs/#!errorignore"
  }
};
