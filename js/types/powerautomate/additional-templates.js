const data = [
  {
    "id": "pa-read-model",
    "title": "モデルの文章を読みメッセージにする",
    "level": "基礎",
    "code": "{\n  \"name\": \"練習モデル\",\n  \"actions\": [\n    {\n      \"action\": \"Read text from file\",\n      \"target\": \"Text\",\n      \"value\": \"C:/model/input.txt\"\n    },\n    {\n      \"action\": \"Display message\",\n      \"value\": \"入力: %Text%\"\n    }\n  ]\n}",
    "intro": "既定モデルのファイル内容を変数へ読み、表示します。実ファイルは開きません。",
    "refs": [
      "Read text from file",
      "Display message"
    ]
  },
  {
    "id": "pa-break-total",
    "title": "条件でループを抜ける",
    "level": "実践",
    "code": "{\n  \"name\": \"練習モデル\",\n  \"actions\": [\n    {\n      \"action\": \"Set variable\",\n      \"target\": \"Total\",\n      \"value\": 0\n    },\n    {\n      \"action\": \"Loop\",\n      \"target\": \"Index\",\n      \"from\": 1,\n      \"to\": 10,\n      \"step\": 1\n    },\n    {\n      \"action\": \"If\",\n      \"condition\": \"%Index% > 5\"\n    },\n    {\n      \"action\": \"Exit loop\"\n    },\n    {\n      \"action\": \"End\"\n    },\n    {\n      \"action\": \"Increase variable\",\n      \"target\": \"Total\",\n      \"value\": \"%Index%\"\n    },\n    {\n      \"action\": \"End\"\n    },\n    {\n      \"action\": \"Display message\",\n      \"value\": \"合計 %Total%\"\n    }\n  ]\n}",
    "intro": "1から5を足し、6になったらExit loopで終了します。条件とループのEndの対応も学びます。",
    "refs": [
      "Loop",
      "If",
      "Exit loop",
      "Increase variable",
      "Display message"
    ]
  },
  {
    "id": "pa-select-report",
    "title": "条件に合う要素だけモデルファイルへ集める",
    "level": "応用",
    "code": "{\n  \"name\": \"練習モデル\",\n  \"actions\": [\n    {\n      \"action\": \"Set variable\",\n      \"target\": \"Items\",\n      \"value\": [\n        1,\n        2,\n        3,\n        4\n      ]\n    },\n    {\n      \"action\": \"Write text to file\",\n      \"target\": \"C:/model/report.txt\",\n      \"value\": \"\",\n      \"append\": false\n    },\n    {\n      \"action\": \"For each\",\n      \"target\": \"Item\",\n      \"value\": \"%Items%\"\n    },\n    {\n      \"action\": \"If\",\n      \"condition\": \"%Item% >= 3\"\n    },\n    {\n      \"action\": \"Write text to file\",\n      \"target\": \"C:/model/report.txt\",\n      \"value\": \"%Item%\",\n      \"append\": true\n    },\n    {\n      \"action\": \"End\"\n    },\n    {\n      \"action\": \"End\"\n    },\n    {\n      \"action\": \"Read text from file\",\n      \"target\": \"Report\",\n      \"value\": \"C:/model/report.txt\"\n    },\n    {\n      \"action\": \"Display message\",\n      \"value\": \"%Report%\"\n    }\n  ]\n}",
    "intro": "For eachとIfを組み合わせ、3と4だけを追記します。結果はモデル内の文字列34です。",
    "refs": [
      "For each",
      "If",
      "Write text to file",
      "Read text from file"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  return result;
}
