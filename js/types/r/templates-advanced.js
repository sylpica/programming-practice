// 高度モード B4：R 高度テンプレート（高度差分）。基礎層と同形式。
// 収録条件：コードで使う関数は基礎実装済みか高度ハンドラ実在のものだけに限り、
// 全件を実 R 4.3.3 と本シミュレータの両方で実行し、値の一致を確認済み
// （docs/audit/ADV-B4-r-content.md）。paste／sprintf 等は未実装のため使わない。
export const templatesAdvanced = [
  {
    id: "r-adv-sort-rank",
    title: "並べ替えて順位を付ける",
    level: "実践",
    code: "score <- c(70, 95, 80, 95)\nprint(sort(score, decreasing = TRUE))\nprint(order(score, decreasing = TRUE))\nprint(rank(score))",
    intro:
      "sortは値そのものを並べ替え、orderは並べ替えのための添字を返します。rankは各要素の順位で、同点の95には平均順位3.5が付きます。出力は順に c(95, 95, 80, 70)、c(2, 4, 3, 1)、c(1, 3.5, 2, 3.5) です。",
    refs: ["c", "sort", "order", "rank", "print"],
  },
  {
    id: "r-adv-cumsum-diff",
    title: "累積和と階差を比べる",
    level: "実践",
    code: "daily <- c(3, 5, 2, 6)\nprint(cumsum(daily))\nprint(diff(cumsum(daily)))\nprint(diff(daily))",
    intro:
      "cumsumは先頭からの累積和 c(3, 8, 10, 16) を返し、diffは隣り合う要素の差（階差）を返します。累積和にdiffを適用すると元の増分 c(5, 2, 6) が戻り、diff(daily) は c(2, -3, 4) になります。",
    refs: ["c", "cumsum", "diff", "print"],
  },
  {
    id: "r-adv-which-match",
    title: "条件と値から位置を探す",
    level: "実践",
    code: "fruits <- c(\"apple\", \"banana\", \"cherry\", \"banana\")\nprint(which(fruits == \"banana\"))\nprint(match(c(\"cherry\", \"apple\"), fruits))\nprint(match(\"banana\", fruits))",
    intro:
      "whichは条件がTRUEになる位置をすべて返し、matchは探す値が最初に現れる位置だけを返します。bananaは2番目と4番目にありますが、match(\"banana\", fruits) は最初の2だけを返します。",
    refs: ["c", "which", "match", "print"],
  },
  {
    id: "r-adv-unique-dup",
    title: "重複を取り除く",
    level: "実践",
    code: "x <- c(5, 3, 5, 1, 3)\nprint(unique(x))\nprint(duplicated(x))\nprint(x[!duplicated(x)])\nprint(anyDuplicated(x))",
    intro:
      "uniqueは重複を取り除いて c(5, 3, 1) を返し、duplicatedは2回目以降の出現をTRUEで示します。x[!duplicated(x)] でも同じ重複除去ができ、anyDuplicatedは最初の重複の位置3を返します。",
    refs: ["c", "unique", "duplicated", "anyDuplicated", "print"],
  },
  {
    id: "r-adv-tapply-group",
    title: "グループ別に集計する",
    level: "応用",
    code: "score <- c(80, 90, 70, 100, 60)\ngrp <- c(\"A\", \"B\", \"A\", \"B\", \"A\")\nprint(tapply(score, grp, \"mean\"))\nprint(tapply(score, grp, \"sum\"))",
    intro:
      "tapplyはベクトルをグループごとに分けて、FUNを各グループに適用します。このアプリではFUNを文字列で指定します。平均は c(A = 70, B = 95)、合計は c(A = 210, B = 190) になります。",
    refs: ["c", "tapply", "print"],
  },
  {
    id: "r-adv-merge-colsums",
    title: "表を結合して列合計を出す",
    level: "応用",
    code: "sales <- data.frame(item = c(\"a\", \"b\", \"c\"), qty = c(2, 3, 5))\nprice <- data.frame(item = c(\"a\", \"b\", \"c\"), unit = c(100, 200, 300))\nm <- merge(sales, price, by = \"item\")\nm$total <- m$qty * m$unit\nprint(m)\nprint(colSums(m[, c(\"qty\", \"total\")]))",
    intro:
      "mergeは共通列itemの値が一致する行同士を結合します。結合後に金額列total（200、600、1500）を追加し、colSumsで数量の合計10と金額の合計2300を求めます。",
    refs: ["data.frame", "c", "merge", "colSums", "print"],
  },
  {
    id: "r-adv-apply-df",
    title: "表の行・列ごとに関数を適用する",
    level: "応用",
    code: "df <- data.frame(math = c(80, 90, 70), eng = c(60, 100, 80))\nprint(apply(df, 2, \"mean\"))\nprint(apply(df, 1, \"sum\"))\nprint(sapply(df, \"max\"))",
    intro:
      "applyはデータフレームの列ごと（MARGIN = 2）や行ごと（MARGIN = 1）に関数を適用します。このアプリではFUNを文字列で指定します。列の平均は c(math = 80, eng = 80)、行の合計は c(140, 190, 150)、sapplyによる列の最大値は c(math = 90, eng = 100) です。",
    refs: ["data.frame", "c", "apply", "sapply", "print"],
  },
];
