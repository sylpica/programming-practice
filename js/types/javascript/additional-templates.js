const data = [
  {
    "id": "js-coercion",
    "title": "文字列と数値の変換を比べる",
    "level": "基礎",
    "code": "console.log(\"5\" + 2);\nconsole.log(Number(\"5\") + 2);\nconsole.log(\"5\" == 5);\nconsole.log(\"5\" === 5);",
    "intro": "文字列連結と数値加算、==と===の違いを既知値で確認します。",
    "refs": [
      "console.log",
      "Number"
    ]
  },
  {
    "id": "js-scope",
    "title": "varの巻き上げとletのスコープ",
    "level": "実践",
    "code": "console.log(stage);\nvar stage = \"外\";\nlet count = 1;\n{\n    let count = 2;\n    console.log(count);\n}\nconsole.log(count);\nconsole.log(stage);",
    "intro": "varは宣言が巻き上がります。ブロック内のletは外のcountを変更しません。初期化前のlet参照は別途エラーになります。",
    "refs": [
      "console.log"
    ]
  },
  {
    "id": "js-build-summary",
    "title": "入力から合計を作りモデルDOMへ追加する",
    "level": "応用",
    "code": "const input = document.getElementById(\"name\");\nconst count = Number(input.value);\nconst values = [2, 3, count];\nlet total = 0;\nfor (let i = 0; i < values.length; i++) { total += values[i]; }\nconst summary = document.createElement(\"p\");\nsummary.id = \"summary\";\nsummary.textContent = \"合計: \" + total;\ndocument.body.appendChild(summary);\nconsole.log(document.getElementById(\"summary\").textContent);",
    "intro": "モデルの入力値7を使い、集計した段落をモデルbodyへ追加します。実DOMは変更しません。",
    "refs": [
      "document.getElementById",
      "Number",
      "for",
      "document.createElement",
      "textContent",
      "appendChild",
      "console.log"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  result[2].model.dom.elements.name.value = "7";
  return result;
}
