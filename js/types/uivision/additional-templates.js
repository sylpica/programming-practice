const data = [
  {
    "id": "ui-store-echo",
    "title": "値を保存してログへ出す",
    "level": "基礎",
    "code": "{\n  \"Name\": \"練習モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"学習者\",\n      \"Value\": \"Name\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"こんにちは、${Name}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "intro": "storeで作った変数をechoで展開します。ブラウザや外部ページの操作はありません。",
    "refs": [
      "store",
      "echo"
    ]
  },
  {
    "id": "ui-check-model",
    "title": "モデルフォームの入力値を読む",
    "level": "実践",
    "code": "{\n  \"Name\": \"練習モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"type\",\n      \"Target\": \"id=name\",\n      \"Value\": \"確認者\"\n    },\n    {\n      \"Command\": \"storeValue\",\n      \"Target\": \"id=name\",\n      \"Value\": \"Name\"\n    },\n    {\n      \"Command\": \"click\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertText\",\n      \"Target\": \"id=result\",\n      \"Value\": \"完了\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${Name}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "intro": "入力値を読み、明示したボタン効果の後のテキストを検査します。assertTextが一致しない場合は停止します。",
    "refs": [
      "open",
      "type",
      "storeValue",
      "click",
      "assertText",
      "echo"
    ]
  },
  {
    "id": "ui-loop-select",
    "title": "繰り返しと条件で入力内容を変える",
    "level": "応用",
    "code": "{\n  \"Name\": \"練習モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"store\",\n      \"Target\": \"0\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"while\",\n      \"Target\": \"${count} < 3\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"if\",\n      \"Target\": \"${count} == 2\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"type\",\n      \"Target\": \"id=name\",\n      \"Value\": \"最後\"\n    },\n    {\n      \"Command\": \"else\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"type\",\n      \"Target\": \"id=name\",\n      \"Value\": \"途中\"\n    },\n    {\n      \"Command\": \"end\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"executeScript_Sandbox\",\n      \"Target\": \"return Number(${count}) + 1;\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"end\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"storeValue\",\n      \"Target\": \"id=name\",\n      \"Value\": \"Result\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${Result}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "intro": "3回のループの最後だけ入力を変更します。Sandboxは掲載した単純式だけをモデルで評価します。",
    "refs": [
      "while",
      "if",
      "type",
      "executeScript_Sandbox",
      "storeValue",
      "echo"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  return result;
}
