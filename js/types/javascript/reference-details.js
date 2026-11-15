// Return contracts and primary documentation for the supported teaching subset.
export const referenceDetails = {
  "console.log": {
    "returns": "undefined",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/console/log_static"
  },
  "document.getElementById": {
    "returns": "一致するElement、なければnull",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById"
  },
  "document.querySelector": {
    "returns": "最初に一致するElement、なければnull",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector"
  },
  "document.createElement": {
    "returns": "新しいElement",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement"
  },
  "appendChild": {
    "returns": "追加したNode",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild"
  },
  "textContent": {
    "returns": "文字列（ノードの種類によってnull）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent"
  },
  "value": {
    "returns": "文字列（このモデルの入力要素）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/value"
  },
  "push": {
    "returns": "追加後の長さ",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push"
  },
  "pop": {
    "returns": "削除した末尾の値。空配列はundefined",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop"
  },
  "Number": {
    "returns": "数値、変換不能ならNaN",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number"
  },
  "String": {
    "returns": "文字列",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String"
  },
  "Boolean": {
    "returns": "真偽値",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean"
  },
  "parseInt": {
    "returns": "整数、読み取れなければNaN",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt"
  },
  "Math.abs": {
    "returns": "非負の数値",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/abs"
  },
  "Math.floor": {
    "returns": "負の無限大方向に丸めた整数値",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor"
  },
  "Math.round": {
    "returns": "近い整数値。同点は正の無限大側",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round"
  },
  "JSON.stringify": {
    "returns": "JSON文字列、対象によってundefined。循環参照等は例外",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify"
  },
  "prompt": {
    "returns": "文字列、キャンセルはnull",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt"
  },
  "alert": {
    "returns": "undefined",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Window/alert"
  },
  "if": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else"
  },
  "for": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for"
  },
  "addEventListener": {
    "returns": "undefined",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener"
  },
  "let": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let"
  },
  "const": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const"
  },
  "var": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var"
  },
  "join": {
    "returns": "区切り文字列で連結した文字列",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join"
  },
  "while": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while"
  },
  "break": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/break"
  },
  "continue": {
    "returns": "戻り値なし（宣言または制御文）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/continue"
  },
  "typeof": {
    "returns": "型を表す文字列（\"number\"、\"string\"、\"bigint\"、\"boolean\"、\"undefined\"、\"object\"、\"function\"のいずれか）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof"
  },
  "BigInt": {
    "returns": "BigInt値",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt"
  },
  "オブジェクトリテラル": {
    "returns": "新しいオブジェクト",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object"
  },
  "id": {
    "returns": "文字列（要素のID。設定がなければ空文字列）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Element/id"
  },
  "tagName": {
    "returns": "文字列（タグ名。HTML要素では大文字）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Element/tagName"
  },
  "children": {
    "returns": "子要素のコレクション（このモデルでは要素の配列）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Element/children"
  },
  "document.body": {
    "returns": "body要素（Element）",
    "source": "https://developer.mozilla.org/en-US/docs/Web/API/Document/body"
  },
  "undefined": {
    "returns": "プリミティブ値undefinedそのもの",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined"
  },
  "NaN": {
    "returns": "数値NaNそのもの",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN"
  },
  "Infinity": {
    "returns": "数値Infinityそのもの",
    "source": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Infinity"
  }
};
