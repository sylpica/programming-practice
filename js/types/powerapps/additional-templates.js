const data = [
  {
    "id": "fx-price",
    "title": "単価と数量を計算する",
    "level": "基礎",
    "code": "Set(Price, 120);\nSet(Quantity, 3);\nSet(Total, Price * Quantity);\nNotify(Text(Total))",
    "intro": "Setで変数を作り、計算結果を通知します。数式の入力言語はen-USです。",
    "refs": [
      "Set",
      "Text",
      "Notify"
    ]
  },
  {
    "id": "fx-filter-total",
    "title": "条件に合うレコードを集計する",
    "level": "実践",
    "code": "ClearCollect(Items, {Value: 1}, {Value: 2}, {Value: 3});\nClearCollect(Selected, Filter(Items, Value >= 2));\nSet(Total, Sum(Selected, Value));\nNotify(Text(CountRows(Selected)) & \":\" & Text(Total))",
    "intro": "Filterで2以上のレコードを選び、件数と合計を求めます。コレクションは明示したローカルモデルです。",
    "refs": [
      "ClearCollect",
      "Filter",
      "Sum",
      "CountRows",
      "Text",
      "Notify"
    ]
  },
  {
    "id": "fx-build-save",
    "title": "表の変換結果をモデルデータソースへ保存する",
    "level": "応用",
    "code": "ClearCollect(Items, ForAll(Sequence(4), {Square: Value * Value}));\nSet(Total, Sum(Items, Square));\nPatch(Orders, Defaults(Orders), {Name: Text(Total), Done: true});\nNavigate(Detail);\nNotify(Text(Total))",
    "intro": "ForAllは副作用のない行変換に使い、その後にPatchと画面遷移を行います。実データソースには接続しません。",
    "refs": [
      "ForAll",
      "Sequence",
      "ClearCollect",
      "Sum",
      "Patch",
      "Defaults",
      "Navigate",
      "Notify"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  return result;
}
