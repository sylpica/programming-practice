const data = [
  {
    "id": "cpp-price",
    "title": "単価と数量から合計を計算する",
    "level": "基礎",
    "code": "#include <iostream>\nint main() {\nint price = 120;\nint count = 3;\nint total = price * count;\nstd::cout << total << std::endl;\nreturn 0;\n}",
    "intro": "intの既知値を計算します。C/C++は明示したモデルABI、C#は32ビットintで説明します。",
    "refs": [
      "int",
      "cout"
    ]
  },
  {
    "id": "cpp-positive-total",
    "title": "配列から正の値だけを合計する",
    "level": "実践",
    "code": "#include <iostream>\nint main() {\nint values[4] = {-2, 4, 0, 7};\nint total = 0;\nfor (int i = 0; i < 4; i++) {\n    if (values[i] > 0) { total += values[i]; }\n}\nstd::cout << total << std::endl;\nreturn 0;\n}",
    "intro": "配列の範囲内だけを走査し、条件に合う4と7を足します。",
    "refs": [
      "array",
      "for",
      "if",
      "cout"
    ]
  },
  {
    "id": "cpp-pointer-loop",
    "title": "ポインタとループで配列を更新する",
    "level": "応用",
    "code": "#include <iostream>\nint main() {\nint values[3] = {1, 2, 3};\nint *p = &values[0];\nfor (int i = 0; i < 3; i++) {\n    *(p + i) = *(p + i) * 2;\n}\nstd::cout << values[0] << std::endl;\nstd::cout << values[2] << std::endl;\nreturn 0;\n}",
    "intro": "同じ配列の有効範囲内でポインタ演算し、要素を2倍にします。実アドレスや範囲外の値は捏造しません。",
    "refs": [
      "pointer",
      "array",
      "for"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  return result;
}
