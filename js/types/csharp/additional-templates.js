const data = [
  {
    "id": "csharp-price",
    "title": "単価と数量から合計を計算する",
    "level": "基礎",
    "code": "int price = 120;\nint count = 3;\nint total = price * count;\nConsole.WriteLine(total);",
    "intro": "intの既知値を計算します。C/C++は明示したモデルABI、C#は32ビットintで説明します。",
    "refs": [
      "int",
      "Console.WriteLine"
    ]
  },
  {
    "id": "csharp-positive-total",
    "title": "配列から正の値だけを合計する",
    "level": "実践",
    "code": "int[] values = {-2, 4, 0, 7};\nint total = 0;\nfor (int i = 0; i < 4; i++) {\n    if (values[i] > 0) { total += values[i]; }\n}\nConsole.WriteLine(total);",
    "intro": "配列の範囲内だけを走査し、条件に合う4と7を足します。",
    "refs": [
      "array",
      "for",
      "if",
      "Console.WriteLine"
    ]
  },
  {
    "id": "cs-shared-total",
    "title": "共有オブジェクトへ配列の合計を集める",
    "level": "応用",
    "code": "class Counter { public int Total; }\nCounter first = new Counter();\nCounter same = first;\nint[] values = {1, 2, 3, 4, 5};\nchecked {\n    for (int i = 0; i < 5; i++) { same.Total += values[i]; }\n}\nConsole.WriteLine(first.Total);",
    "intro": "別名のsameから同じCounterを更新します。checked内で計算し、元のfirstから結果を読みます。",
    "refs": [
      "class",
      "array",
      "for",
      "checked",
      "Console.WriteLine"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  return result;
}
