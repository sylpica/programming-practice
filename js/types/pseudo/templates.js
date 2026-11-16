// IPA擬似言語のテンプレート。科目Bサンプル問題・公開問題の典型パターンを題材にする。
export const TEMPLATES = [
  {
    id: "pseudo-fee", title: "料金を年齢で決める関数", level: "基礎",
    intro: "科目Bサンプル問題の問1と同じ形です。引数 age の値が分からないため、100・300・500 の3つの道筋に分かれます。",
    refs: ["関数・手続の宣言", "整数型", "if", "elseif", "else", "endif", "return", "日本語の条件句"],
    code: `○整数型: fee(整数型: age)
  if (age が 3 以下)
    return 100
  elseif (age が 6 以下)
    return 300
  else
    return 500
  endif`,
  },
  {
    id: "pseudo-calc", title: "商・余り・実数除算", level: "基礎",
    intro: "÷ と mod の基本です。整数どうしの ÷ は商になり、実数を含む ÷ は実数除算になる違いを確認します。",
    refs: ["変数の宣言", "整数型", "実数型", "÷", "mod", "×", "+", "代入"],
    code: `整数型: a ← 7
整数型: b ← 2
整数型: q ← a ÷ b
整数型: r ← a mod b
実数型: d ← 7.0 ÷ 2
整数型: s ← a × b + 1`,
  },
  {
    id: "pseudo-sum", title: "for と while で合計する", level: "基礎",
    intro: "数える繰返し（for）と、条件で繰り返す（while）の基本形です。",
    refs: ["変数の宣言", "整数型", "for", "endfor", "ずつ増やす", "while", "endwhile", "関係演算子", "代入", "+", "-"],
    code: `整数型: total ← 0
for (i を 1 から 5 まで 1 ずつ増やす)
  total ← total + i
endfor
整数型: n ← 3
while (n > 0)
  total ← total + n
  n ← n - 1
endwhile`,
  },
  {
    id: "pseudo-reverse", title: "配列を逆順にする手続き", level: "実践",
    intro: "科目Bサンプル問題の問2と同じ形です。配列は参照で渡るため、手続きの中の入れ替えが呼び出し側の大域変数にも反映します。",
    refs: ["大域変数の宣言", "配列型", "関数・手続の宣言", "変数の宣言", "for", "endfor", "ずつ増やす", "要素数", "÷", "添字アクセス", "代入", "手続・関数の呼出し", "-", "+"],
    code: `大域: 整数型の配列: data ← {10, 20, 30, 40}
○reverseArray(整数型の配列: arr)
  整数型: i, j, tmp
  for (i を 1 から arrの要素数 ÷ 2 まで 1 ずつ増やす)
    j ← arrの要素数 - i + 1
    tmp ← arr[i]
    arr[i] ← arr[j]
    arr[j] ← tmp
  endfor
reverseArray(data)`,
  },
  {
    id: "pseudo-search", title: "線形探索で位置を返す関数", level: "実践",
    intro: "配列を先頭から順に調べ、見つけた要素番号を返します。見つからない場合は -1 を返します。",
    refs: ["大域変数の宣言", "配列型", "関数・手続の宣言", "変数の宣言", "整数型", "for", "endfor", "ずつ増やす", "要素数", "if", "endif", "添字アクセス", "関係演算子", "return", "代入", "手続・関数の呼出し"],
    code: `大域: 整数型の配列: data ← {4, 8, 15, 16, 23}
○整数型: find(整数型の配列: arr, 整数型: target)
  整数型: i
  for (i を 1 から arrの要素数 まで 1 ずつ増やす)
    if (arr[i] = target)
      return i
    endif
  endfor
  return -1
整数型: pos ← find(data, 15)`,
  },
  {
    id: "pseudo-gcd", title: "ユークリッドの互除法", level: "実践",
    intro: "mod を使って最大公約数を求める古典的なアルゴリズムです。",
    refs: ["関数・手続の宣言", "整数型", "変数の宣言", "while", "endwhile", "関係演算子", "mod", "代入", "return", "手続・関数の呼出し"],
    code: `○整数型: gcd(整数型: a, 整数型: b)
  整数型: r
  while (b ≠ 0)
    r ← a mod b
    a ← b
    b ← r
  endwhile
  return a
整数型: g ← gcd(48, 18)`,
  },
  {
    id: "pseudo-sparse", title: "疎行列を圧縮形式に変換する", level: "応用",
    intro: "科目Bサンプル問題の問4の題材です。0でない要素だけを「個数・列・値」の並びで別の二次元配列へ移します。未使用の場所は未定義の値のまま残ります。",
    refs: ["大域変数の宣言", "二次元配列型", "サイズ指定生成", "未定義の値", "関数・手続の宣言", "変数の宣言", "整数型", "for", "endfor", "ずつ増やす", "行数", "列数", "if", "endif", "関係演算子", "添字アクセス", "×", "+", "代入", "手続・関数の呼出し"],
    code: `大域: 整数型の二次元配列: matrix ← {{5, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 2, 0}}
大域: 整数型の二次元配列: sparseMatrix ← {3行9列の 未定義の値}
○convSparseMatrix(整数型の二次元配列: matrix)
  整数型: i, j, cnt
  for (i を 1 から matrixの行数 まで 1 ずつ増やす)
    cnt ← 0
    for (j を 1 から matrixの列数 まで 1 ずつ増やす)
      if (matrix[i, j] ≠ 0)
        cnt ← cnt + 1
        sparseMatrix[i][cnt × 2] ← j
        sparseMatrix[i][cnt × 2 + 1] ← matrix[i, j]
      endif
    endfor
    sparseMatrix[i][1] ← cnt
  endfor
convSparseMatrix(matrix)`,
  },
  {
    id: "pseudo-stack", title: "スタックの push と pop", level: "応用",
    intro: "令和7年度公開問題の問3の題材です。未定義の値で初期化した配列と、積まれた個数を数える大域変数でスタックを表します。",
    refs: ["大域変数の宣言", "配列型", "整数型", "サイズ指定生成", "未定義の値", "関数・手続の宣言", "添字アクセス", "代入", "+", "return", "手続・関数の呼出し", "変数の宣言"],
    code: `大域: 整数型の配列: stk ← {3個の 未定義の値}
大域: 整数型: top ← 0
○push(整数型: val)
  top ← top + 1
  stk[top] ← val
○整数型: pop()
  整数型: val ← stk[top]
  stk[top] ← 未定義の値
  top ← top - 1
  return val
push(10)
push(20)
整数型: x ← pop()`,
  },
];
