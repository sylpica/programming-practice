// 高度モード（ブロックB1）: UI.Vision RPA の高度テンプレート（高度側で新規に足す分だけ）。
export const templatesAdvanced = [
  {
    "id": "ui-adv-assert",
    "title": "要素の存在とタイトルを確認する",
    "code": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"open\",\n      \"Target\": \"https://example.test/form\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertElementPresent\",\n      \"Target\": \"id=name\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertElementNOTPresent\",\n      \"Target\": \"id=missing\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"verifyElementPresent\",\n      \"Target\": \"id=submit\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"assertTitle\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"storeTitle\",\n      \"Target\": \"\",\n      \"Value\": \"pageTitle\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"タイトルは「${pageTitle}」です\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "intro": "assertElementPresent／assertTitleは不一致で止まる検証、verifyElementPresentは止まらない検証です。基礎モデルのページはタイトル未設定（空文字）です。",
    "refs": [
      "open",
      "assertElementPresent",
      "assertElementNOTPresent",
      "verifyElementPresent",
      "assertTitle",
      "storeTitle",
      "echo"
    ]
  },
  {
    "id": "ui-adv-csv-roundtrip",
    "title": "CSVへ保存して読み直す",
    "code": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"山田\",\n      \"Value\": \"!csvLine\"\n    },\n    {\n      \"Command\": \"store\",\n      \"Target\": \"東京\",\n      \"Value\": \"!csvLine\"\n    },\n    {\n      \"Command\": \"csvsave\",\n      \"Target\": \"data.csv\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"csvRead\",\n      \"Target\": \"data.csv\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${!COL1}\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${!COL2}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "intro": "storeで!csvLineへ値を積み、csvsaveで保存した行を、csvReadで読み直して${!COL1}／${!COL2}へ入れます。モデルにCSVが無い状態から始めます。",
    "refs": [
      "store",
      "csvsave",
      "csvRead",
      "echo"
    ]
  },
  {
    "id": "ui-adv-do-loop",
    "title": "do／repeatIfでカウンタを回す",
    "code": "{\n  \"Name\": \"練習マクロ\",\n  \"CreationDate\": \"モデル\",\n  \"Commands\": [\n    {\n      \"Command\": \"store\",\n      \"Target\": \"0\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"do\",\n      \"Target\": \"\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"executeScript_Sandbox\",\n      \"Target\": \"return Number(${count}) + 1;\",\n      \"Value\": \"count\"\n    },\n    {\n      \"Command\": \"repeatIf\",\n      \"Target\": \"${count} < 3\",\n      \"Value\": \"\"\n    },\n    {\n      \"Command\": \"echo\",\n      \"Target\": \"${count}\",\n      \"Value\": \"\"\n    }\n  ]\n}",
    "intro": "do／repeatIfは後判定ループです。本体を1回実行してから条件を判定するため、カウンタは必ず1回は進み、3で止まります。",
    "refs": [
      "store",
      "do",
      "executeScript_Sandbox",
      "repeatIf",
      "echo"
    ]
  }
];
