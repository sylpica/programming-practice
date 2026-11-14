const data = [
  {
    "id": "r-index",
    "title": "添字で必要な要素を取り出す",
    "level": "基礎",
    "code": "x <- c(10, 20, 30)\nprint(x[c(1, 3)])\nprint(x[-2])",
    "intro": "添字は1始まりです。正の添字による選択と負の添字による除外を比べます。",
    "refs": [
      "c",
      "print"
    ]
  },
  {
    "id": "r-filter-loop",
    "title": "ループと条件で合計する",
    "level": "実践",
    "code": "x <- c(2, 5, 8, 1)\ntotal <- 0\nfor (i in seq_len(length(x))) {\n    if (x[i] >= 5) { total <- total + x[i] }\n}\nprint(total)",
    "intro": "seq_lenで添字を作り、条件に合う5と8だけを合計します。空のベクトルでも1:0にしない方法です。",
    "refs": [
      "c",
      "seq_len",
      "length",
      "for",
      "if",
      "print"
    ]
  },
  {
    "id": "r-frame-select",
    "title": "列を追加して合格者を選ぶ",
    "level": "応用",
    "code": "df <- data.frame(name = c(\"A\", \"B\", \"C\"), score = c(60, 80, 95))\ndf$bonus <- df$score + 5\npassed <- df$bonus >= 80\nprint(df[passed, ])\nprint(mean(df$bonus))",
    "intro": "ベクトル化した列計算とlogicalの行選択を組み合わせます。行・列の基準は明示した表です。",
    "refs": [
      "data.frame",
      "c",
      "mean",
      "print"
    ]
  }
];

export function additionalTemplates(defaultModel) {
  const result = structuredClone(data);
  for (const t of result) t.model = structuredClone(defaultModel);
  return result;
}
