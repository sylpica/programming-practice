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
  }
};
