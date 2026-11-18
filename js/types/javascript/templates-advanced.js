// 高度モード B5：JavaScript 高度テンプレート（高度差分）。基礎層と同形式。
// この方言には関数値がないため、コールバック必須のメソッド
// （map／filter／reduce／forEach 等）は使わず、コールバックなしで
// 完結する形だけを使う。モデルDOMは基礎と同じモデル前提。
const data = [
  {
    "id": "js-adv-array-edit",
    "title": "配列の切り取り・差し替え・反転",
    "level": "高度",
    "code": "const values = [10, 20, 30, 40];\nconsole.log(values.slice(1, 3));\nvalues.splice(1, 1, 25);\nconsole.log(values);\nconsole.log(values.indexOf(30));\nconsole.log(values.includes(50));\nvalues.reverse();\nconsole.log(values);",
    "intro": "sliceは元の配列を変えず、spliceはその場で差し替えます。検索と反転もあわせて確認します。",
    "refs": [
      "Array.prototype.slice",
      "Array.prototype.splice",
      "Array.prototype.indexOf",
      "Array.prototype.includes",
      "Array.prototype.reverse",
      "console.log"
    ]
  },
  {
    "id": "js-adv-array-create",
    "title": "配列を作って並べ替える",
    "level": "高度",
    "code": "const words = Array.of(\"tea\", \"coffee\", \"cake\");\nconsole.log(words.length);\nconsole.log(Array.isArray(words));\nconst nums = [30, 5, 100, 42];\nnums.sort();\nconsole.log(nums);\nconsole.log(words.at(-1));",
    "intro": "Array.ofで配列を作り、isArrayで判定します。sortの既定は文字列としての並べ替えで、数値の大小順にはならない点と、atの負の添字を確認します。",
    "refs": [
      "Array.of",
      "Array.isArray",
      "Array.prototype.sort",
      "Array.prototype.at",
      "console.log"
    ]
  },
  {
    "id": "js-adv-string",
    "title": "文字列の検索と整形",
    "level": "高度",
    "code": "const text = \"JavaScript\";\nconsole.log(text.slice(0, 4));\nconsole.log(text.includes(\"Script\"));\nconsole.log(text.indexOf(\"a\"));\nconst padded = \"  tea  \";\nconsole.log(padded.trim());\nconst code = \"7\";\nconsole.log(code.padStart(3, \"0\"));\nconsole.log(text.toLowerCase());\nconst csv = \"a,b,c\";\nconsole.log(csv.split(\",\"));",
    "intro": "部分文字列の取り出し、含むかの判定、空白の除去、桁埋め、分割を既知値で確認します。",
    "refs": [
      "Array.prototype.slice",
      "Array.prototype.includes",
      "Array.prototype.indexOf",
      "String.prototype.trim",
      "String.prototype.padStart",
      "String.prototype.toLowerCase",
      "String.prototype.split",
      "console.log"
    ]
  },
  {
    "id": "js-adv-object",
    "title": "Objectの静的メソッドでキーと値を扱う",
    "level": "高度",
    "code": "const item = { name: \"tea\", price: 300 };\nconsole.log(Object.keys(item));\nconsole.log(Object.values(item));\nconsole.log(Object.entries(item));\nconst copy = Object.assign({}, item, { price: 350 });\nconsole.log(copy.price);\nconsole.log(item.price);\nconsole.log(Object.hasOwn(item, \"name\"));",
    "intro": "キー・値・組の一覧を取り出し、assignで浅いコピーを作って上書きします。元のオブジェクトは変わりません。",
    "refs": [
      "Object.keys",
      "Object.values",
      "Object.entries",
      "Object.assign",
      "Object.hasOwn",
      "console.log"
    ]
  },
  {
    "id": "js-adv-map-set",
    "title": "MapとSetで対応と重複なし集合を扱う",
    "level": "高度",
    "code": "const scores = Map();\nscores.set(\"tea\", 300);\nscores.set(\"coffee\", 450);\nconsole.log(scores.get(\"tea\"));\nconsole.log(scores.has(\"cake\"));\nconsole.log(scores.size);\nconst tags = Set([\"red\", \"blue\", \"red\"]);\nconsole.log(tags.size);\nconsole.log(tags.has(\"blue\"));\ntags.add(\"green\");\nconsole.log(tags.size);",
    "intro": "Mapはキーと値の対応、Setは重複を許さない集合です。同じ値の再登録で件数が増えないことを確認します。この環境ではnewを付けず、Map()やSet(...)のように関数として呼び出して作ります。",
    "refs": [
      "Map",
      "Set",
      "Map.prototype.set",
      "Map.prototype.get",
      "Map.prototype.has",
      "Map.prototype.size",
      "Set.prototype.add",
      "Map.prototype.has",
      "Map.prototype.size",
      "console.log"
    ]
  },
  {
    "id": "js-adv-json",
    "title": "JSONへ変換して読み戻す",
    "level": "高度",
    "code": "const item = { name: \"tea\", price: 300 };\nconst text = JSON.stringify(item);\nconsole.log(text);\nconst back = JSON.parse(text);\nconsole.log(back.name);\nconsole.log(back.price + 50);\nconsole.log(JSON.stringify([1, 2, 3]));",
    "intro": "オブジェクトをJSON文字列へ変換し、parseで読み戻して値が保たれることを確認します。",
    "refs": [
      "JSON.stringify",
      "JSON.parse",
      "console.log"
    ]
  },
  {
    "id": "js-adv-date",
    "title": "DateをUTCで作って読み取る",
    "level": "高度",
    "code": "const day = Date(Date.UTC(2026, 10, 17, 9, 30, 0));\nconsole.log(day.getUTCFullYear());\nconsole.log(day.getUTCMonth());\nconsole.log(day.getUTCDate());\nconsole.log(day.getUTCHours());\nconsole.log(day.toISOString());",
    "intro": "UTCで固定の日時を作り、各部を読み取ります。月は0始まり（10が11月）で、環境のタイムゾーンに左右されない形です。現在時刻は使いません。この環境ではnewを付けず、Date(...)のように関数として呼び出して作ります。",
    "refs": [
      "Date",
      "Date.UTC",
      "Date.prototype.getUTCFullYear",
      "Date.prototype.getUTCMonth",
      "Date.prototype.getUTCDate",
      "Date.prototype.getUTCHours",
      "Date.prototype.toISOString",
      "console.log"
    ]
  },
  {
    "id": "js-adv-number-math",
    "title": "数値の判定とMathの拡張メソッド",
    "level": "高度",
    "code": "console.log(Number.isInteger(42));\nconsole.log(Number.isInteger(4.2));\nconsole.log(Number.isSafeInteger(9007199254740991));\nconsole.log(Math.max(3, 9, 4));\nconsole.log(Math.min(3, 9, 4));\nconsole.log(Math.trunc(-1.9));\nconsole.log(Math.ceil(1.2));\nconsole.log(Math.pow(2, 10));",
    "intro": "整数かどうかと安全な整数の範囲を判定し、最大・最小、切り捨て・切り上げ、べき乗を求めます。",
    "refs": [
      "Number.isInteger",
      "Number.isSafeInteger",
      "Math.max",
      "Math.min",
      "Math.trunc",
      "Math.ceil",
      "Math.pow",
      "console.log"
    ]
  }
];

// 契約（advanced-interface.md 第5章）に基づく定数エクスポート。
// model は付けない（基礎テンプレートと同じく、実行時に種類の既定モデルが使われる）。
export const templatesAdvanced = data;
