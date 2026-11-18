// 高度モード B4S：R 項目データ「記述統計・集計」（stats パッケージ、高度差分）。
// 担当スライスは b4s-notes/slice-sdesc.json（20トピック／33名）。
// 意味論・ステータスは公式ヘルプと実 R 4.3.3（/usr/bin/Rscript）の実測で
// 裁定した（根拠は docs/audit/ADV-B4S-sdesc.md）。syntax は公式ヘルプの
// Usage どおり。対応12件／未対応21件／未検証0件。
export const referenceAdvanced = [
{
name: "addmargins",
category: "行列・配列",
syntax: "addmargins(A, margin = seq_along(dim(A)), FUN = sum, quiet = FALSE)",
description:
"表や配列 A の指定した次元に、FUN（既定は sum）で計算した周辺合計などの余白を付け加える。【未対応の理由】対象は dim 属性を持つ表・配列（class \"table\" を含む）であり、この値モデルには行列・配列型が無いため、入力も結果も忠実に表せない。",
example: "addmargins(UCBAdmissions)",
caution: "未対応（表・配列オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "aggregate",
category: "集計",
syntax: "aggregate(x, by, FUN,..., simplify = TRUE, drop = TRUE)",
description:
"データフレームや時系列を、by で指定したグループごとに FUN で集計する（数式メソッド aggregate(formula, data, FUN,...) もある）。【未対応の理由】by はリスト（値モデルに無い）で渡すのが正規の形であり、数式メソッドは formula オブジェクトに依存する。さらに FUN の結果の simplify／drop の意味論は因子の水準に依存するため、この値モデルでは忠実に表せない。",
example: "aggregate(len, by, mean)",
caution: "未対応（リスト・数式・因子の意味論を表せないため）。",
status: "unsupported",
},
{
name: "ave",
category: "集計",
syntax: "ave(x,..., FUN = mean)",
description:
"数値ベクトル x を、グループ化変数（...）で分けた各グループごとに FUN（既定は mean）で集計し、x と同じ長さのベクトルとして返す。グループ化変数が欠損の要素は、それぞれ単独のグループとして扱われる（実 R 4.3.3 実測）。FUN の結果はグループの長さにリサイクルされる。グループ化変数にデータフレームを渡すと、その各列がグループ化変数になる。",
example: 'ave(c(1, 2, 3, 4), c("a", "a", "b", "b"))',
caution:
"FUN は関数値では渡せず、文字列で集計名を指定する形のみ対応する（sum／mean／median／min／max／length／sd／seq_along）。x 自体へのデータフレーム入力は未対応。",
status: "supported",
},
{
name: "complete.cases",
category: "欠損値",
syntax: "complete.cases(...)",
description:
"ベクトル・行列・データフレームの各ケース（要素／行）について、欠損（NA／NaN）が1つも含まれなければ TRUE を返す論理ベクトル。複数の引数を渡すと、すべての引数で欠損が無いケースだけが TRUE になる。引数の長さが揃っていない場合はエラーになる。",
example: "complete.cases(c(1, NA, 3))",
caution: "引数なし、または NULL だけの場合はエラーになる。",
status: "supported",
},
{
name: "cor",
category: "集計",
syntax:
'cor(x, y = NULL, use = "everything", method = c("pearson", "kendall", "spearman"))',
description:
"x と y の相関係数を計算する。method は pearson（既定）／kendall（順位相関、タイ補正つき）／spearman（順位の pearson 相関）。use は欠損の扱いで、everything（欠損があれば結果は NA）／na.or.complete／complete.obs／all.obs／pairwise.complete.obs から選ぶ（前方一致の省略可）。どちらかの標準偏差が0のときは NA を警告つきで返す。",
example: "cor(1:10, 2:11)",
caution:
"x にデータフレームを渡す形（相関行列を返す）は未対応。x だけでは計算できず、y が必要。",
status: "supported",
},
{
name: "cov",
category: "集計",
syntax:
'cov(x, y = NULL, use = "everything", method = c("pearson", "kendall", "spearman"))',
description:
"x と y の共分散（不偏分散と同じ n-1 で割る形）を計算する。use の欠損の扱いは cor と同じ。method が kendall のときは、相関ではなく順位の一致・不一致ペア数から作る未正規化の値 2(C-D) を返す（R 公式ソースで確認）。spearman のときは順位の共分散を返す。",
example: "cov(1:10, 2:11)",
caution:
"x にデータフレームを渡す形（分散共分散行列を返す）は未対応。method が pearson 以外で use = \"pairwise.complete.obs\" はエラーになる。",
status: "supported",
},
{
name: "cov2cor",
category: "集計",
syntax: "cov2cor(V)",
description:
"分散共分散行列 V を相関行列に変換する。【未対応の理由】入力も結果も行列（dim 属性を持つ値）であり、この値モデルには行列型が無いため忠実に表せない。",
example: "cov2cor(V)",
caution: "未対応（行列を表せないため）。",
status: "unsupported",
},
{
name: "var",
category: "集計",
syntax: "var(x, y = NULL, na.rm = FALSE, use)",
description:
"x の不偏分散（n-1 で割る）を計算する。y を渡すと共分散になる。na.rm = TRUE で欠損を除いて計算する。use を明示すると na.rm より優先され、欠損の扱いは everything／na.or.complete／complete.obs／all.obs／pairwise.complete.obs から選べる。観測が1つだけのときは NA。x が文字列のときは数値へ変換して計算する（変換できない要素は NA になり警告が出る）。",
example: "var(1:10)",
caution:
"x にデータフレームを渡す形（分散共分散行列を返す）は未対応。use を明示した場合は na.rm は無視される。",
status: "supported",
},
{
name: "cov.wt",
category: "集計",
syntax:
'cov.wt(x, wt = rep(1/nrow(x), nrow(x)), cor = FALSE, center = TRUE, method = c("unbiased", "ML"))',
description:
"重み付きの共分散（必要に応じて中心と相関も）を計算し、cov／center／cor などの要素を持つリストを返す。【未対応の理由】結果が名前付きリストであり、この値モデルにはリスト型が無いため忠実に表せない。",
example: "cov.wt(x, wt)",
caution: "未対応（リストを返すため）。",
status: "unsupported",
},
{
name: "ecdf",
category: "数学",
syntax: "ecdf(x)",
description:
"数値ベクトル x の経験累積分布関数（ECDF）を作る。【未対応の理由】結果は class \"ecdf\" を持つ関数オブジェクトであり、この値モデルには関数型が無いため忠実に表せない。",
example: "ecdf(x)",
caution: "未対応（関数オブジェクトを返すため）。",
status: "unsupported",
},
{
name: "plot.ecdf",
category: "数学",
syntax:
'plot(x,..., ylab = "Fn(x)", verticals = FALSE, col.01line = "gray70", pch = 19)',
description:
"ecdf オブジェクトを描画する S3 メソッド。【未対応の理由】対象の ecdf オブジェクト（関数オブジェクト）をこの値モデルで表せないうえ、描画そのものも対象外のため。",
example: "plot(ecdf(x))",
caution: "未対応（ecdf オブジェクトと描画を表せないため）。",
status: "unsupported",
},
{
name: "print.ecdf",
category: "数学",
syntax: 'print(x, digits = getOption("digits") - 2,...)',
description:
"ecdf オブジェクトを表示する S3 メソッド。【未対応の理由】対象の ecdf オブジェクト（関数オブジェクト）をこの値モデルで表せないため。",
example: "print(ecdf(x))",
caution: "未対応（ecdf オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "quantile.ecdf",
category: "数学",
syntax: "quantile(x,...)",
description:
"ecdf オブジェクトに対する quantile の S3 メソッド（環境に閉じ込められた観測値から分位点を取り出す）。【未対応の理由】対象の ecdf オブジェクト（関数オブジェクト）をこの値モデルで表せないため。",
example: "quantile(ecdf(x))",
caution: "未対応（ecdf オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "summary.ecdf",
category: "数学",
syntax: "summary(object,...)",
description:
"ecdf オブジェクトの要約（分位点など）を返す S3 メソッド。【未対応の理由】対象の ecdf オブジェクト（関数オブジェクト）をこの値モデルで表せないため。",
example: "summary(ecdf(x))",
caution: "未対応（ecdf オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "as.table.ftable",
category: "行列・配列",
syntax: "as.table(x,...)",
description:
"ftable オブジェクトを table に変換する S3 メソッド。【未対応の理由】ftable も table も dim 属性と class を持つオブジェクトであり、この値モデルには行列・配列型が無いため忠実に表せない。",
example: "as.table(ftable(x))",
caution: "未対応（ftable／table オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "ftable",
category: "行列・配列",
syntax:
"ftable(..., exclude = c(NA, NaN), row.vars = NULL, col.vars = NULL)",
description:
"「平らな」分割表（ftable）を作る。各変数の水準の組み合わせごとに度数を数え、行変数・列変数の見出しを持つ表にする。【未対応の理由】結果は class \"ftable\"（行列に row.vars／col.vars などの属性を持たせたもの）であり、この値モデルには行列型も属性つきオブジェクトも無いため忠実に表せない。",
example: "ftable(a, b)",
caution: "未対応（ftable オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "ftable.formula",
category: "行列・配列",
syntax: "ftable(formula, data = NULL, subset, na.action,...)",
description:
"数式（formula）で指定して ftable を作る S3 メソッド。【未対応の理由】formula オブジェクトに依存し、結果の ftable オブジェクトもこの値モデルで表せないため。",
example: "ftable(a + b ~ c, data = df)",
caution: "未対応（数式オブジェクトと ftable を表せないため）。",
status: "unsupported",
},
{
name: "format.ftable",
category: "行列・配列",
syntax:
'format(x, quote = TRUE, digits = getOption("digits"), method = c("non.compact", "row.compact", "col.compact", "compact"), lsep = " | ", justify = c("left", "right"),...)',
description:
"ftable オブジェクトを表示用の文字列に整形する S3 メソッド。【未対応の理由】対象の ftable オブジェクトをこの値モデルで表せないため。",
example: "format(ftable(x))",
caution: "未対応（ftable オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "print.ftable",
category: "行列・配列",
syntax: 'print(x, digits = getOption("digits"),...)',
description:
"ftable オブジェクトを表示する S3 メソッド。【未対応の理由】対象の ftable オブジェクトをこの値モデルで表せないため。",
example: "print(ftable(x))",
caution: "未対応（ftable オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "read.ftable",
category: "ファイル",
syntax:
'read.ftable(file, sep = "", quote = "\\"", row.var.names, col.vars, skip = 0)',
description:
"write.ftable で書き出した形式のファイルを読み、ftable オブジェクトとして復元する。【未対応の理由】ファイル入出力が対象外であるうえ、結果の ftable オブジェクトをこの値モデルで表せないため。",
example: 'read.ftable("ftable.txt")',
caution: "未対応（ファイル入出力と ftable オブジェクトのため）。",
status: "unsupported",
},
{
name: "write.ftable",
category: "ファイル",
syntax:
'write.ftable(x, file = "", quote = TRUE, append = FALSE, digits = getOption("digits"), sep = " ",...)',
description:
"ftable オブジェクトを、read.ftable で読み戻せる形式でファイルに書き出す。【未対応の理由】ファイル入出力が対象外であるうえ、対象の ftable オブジェクトをこの値モデルで表せないため。",
example: 'write.ftable(ftable(x), file = "ftable.txt")',
caution: "未対応（ファイル入出力と ftable オブジェクトのため）。",
status: "unsupported",
},
{
name: "fivenum",
category: "集計",
syntax: "fivenum(x, na.rm = TRUE)",
description:
"Tukey の5数要約（最小値・下ヒンジ・中央値・上ヒンジ・最大値）を返す。ヒンジは quantile の分位点とは定義が異なり、並べ替えた値の位置を (n+3)/2 の深さで取る。na.rm の既定は TRUE で、欠損を除いて計算する。na.rm = FALSE で欠損があると、5つとも NA になる。",
example: "fivenum(1:10)",
caution: "文字列ベクトルには使えない（エラーになる）。",
status: "supported",
},
{
name: "IQR",
category: "集計",
syntax: "IQR(x, na.rm = FALSE, type = 7)",
description:
"四分位範囲（第3四分位点 − 第1四分位点）を返す。quantile の type（既定 7）で分位点を計算する。文字列ベクトルは数値へ変換してから計算する（変換できない要素は NA になり警告が出る）。",
example: "IQR(1:10)",
caution: "空ベクトルでは NA になる。",
status: "supported",
},
{
name: "mad",
category: "集計",
syntax:
"mad(x, center = median(x), constant = 1.4826, na.rm = FALSE, low = FALSE, high = FALSE)",
description:
"中央絶対偏差（MAD）を返す。center（既定は中央値）からの絶対偏差の中央値に constant（既定 1.4826、正規分布で標準偏差と一致させるための定数）を掛ける。偶数個のとき low = TRUE で中央値候補の小さい方、high = TRUE で大きい方を使う。low と high の両方を TRUE にできるのは奇数個のときだけで、偶数個ではエラーになる（実 R 4.3.3 実測）。center や constant にベクトルを渡すとリサイクルされる。",
example: "mad(1:9)",
caution: "文字列ベクトルには使えない（エラーになる）。low の NA は FALSE として扱われる。",
status: "supported",
},
{
name: "quantile",
category: "集計",
syntax:
"quantile(x, probs = seq(0, 1, 0.25), na.rm = FALSE, names = TRUE, type = 7, digits = 7,...)",
description:
"標本分位点を計算する。type は分位点の定義方法で 1〜9 の9種類があり、既定は type 7（位置 1+(n-1)p の線形補間）。type 1〜3 は不連続な定義（順序統計量の選択）、type 4〜9 は連続な定義（補間）。結果には probs をパーセント表示した名前（例 \"25%\"）が付く（names = TRUE のとき）。probs が [0,1] の外にあるとエラー。空ベクトルや欠損だけのときは各 probs に対して NA が返る。文字列ベクトルでは、補間が要らない type 1〜3 の選択だけが動き、補間が必要な場合はエラーになる。",
example: "quantile(1:10)",
caution:
"type に 1〜9 の整数以外を渡した場合はエラーとして扱う（実 R では未定義の動作になるため）。名前のパーセント表示は digits 桁の近似で、ごく小さい確率では実 R と末尾が異なることがある。",
status: "supported",
},
{
name: "weighted.mean",
category: "集計",
syntax: "weighted.mean(x, w,..., na.rm = FALSE)",
description:
"重み付き平均を計算する。重み w を省略すると単純平均になる。計算は sum((x*w)[w!= 0]) / sum(w) で、重みが0の要素は x が NA や Inf でも結果に影響しない。na.rm = TRUE のときは x が欠損のペアだけを除く（w の欠損は除かれず、結果は NA になる）。x と w の長さが違うとエラー。",
example: "weighted.mean(c(3.7, 3.3, 3.5, 2.8), c(5, 5, 4, 1)/15)",
caution:
"na.rm は名前で指定する（3番目の位置引数は... に入り、na.rm には効かない）。データフレーム入力は未対応。",
status: "supported",
},
{
name: "weighted.mean.default",
category: "集計",
syntax: "weighted.mean(x, w,..., na.rm = FALSE)",
description:
"weighted.mean の既定メソッド。実 R では stats パッケージ内部の S3 メソッドで、利用者向けにはエクスポートされていないが、意味論は weighted.mean と同じ（重み付き平均。重み0の要素は和から除く）。このシミュレータでは名前で直接呼び出せる形で同じ意味論を実装する。",
example: "weighted.mean.default(c(1, 2), c(1, 3))",
caution: "実 R ではエクスポートされていないメソッド（stats:::weighted.mean.default）。",
status: "supported",
},
{
name: "print.xtabs",
category: "行列・配列",
syntax: 'print(x, na.print = "",...)',
description:
"xtabs オブジェクト（class \"xtabs\"）を表示する S3 メソッド。【未対応の理由】対象の xtabs オブジェクト（class を持つ配列）をこの値モデルで表せないため。",
example: "print(xtabs(x))",
caution: "未対応（xtabs オブジェクトを表せないため）。",
status: "unsupported",
},
{
name: "xtabs",
category: "行列・配列",
syntax:
"xtabs(formula = ~., data = parent.frame(), subset, sparse = FALSE, na.action, na.rm = FALSE, addNA = FALSE, exclude = if(!addNA) c(NA, NaN), drop.unused.levels = FALSE)",
description:
"数式で指定した変数の組み合わせごとに度数（または重み）を集計し、分割表（class c(\"xtabs\", \"table\")）を作る。【未対応の理由】formula オブジェクトに依存し、結果も dim 属性と class を持つ配列で、この値モデルでは忠実に表せないため。",
example: "xtabs(~ a + b, data = df)",
caution: "未対応（数式オブジェクトと表オブジェクトのため）。",
status: "unsupported",
},
{
name: "setNames",
category: "ベクトル",
syntax: "setNames(object = nm, nm)",
description:
"object に名前 nm を付けて返す（元の変数は変更されない）。nm が短いと、足りない名前は NA で埋められる。nm が長いとエラーになる。nm の要素は文字列に変換される（数値は \"10\" のような文字列、論理値は \"TRUE\"／\"FALSE\"）。object を省略すると、nm 自体にその値が名前として付く。データフレームに使うと列名が変わる。",
example: 'setNames(1:3, c("foo", "bar", "baz"))',
caution:
"データフレームでは、列名に NA を含む形・重複する列名・不足分が NA 名になる形は値モデルで表せないため未対応（名指しでエラーになる）。",
status: "supported",
},
{
name: "relevel",
category: "型変換",
syntax: "relevel(x, ref,...)",
description:
"因子 x の基準水準（参照カテゴリ）を ref に変える。【未対応の理由】対象は因子（levels と class \"factor\" を持つ整数ベクトル）であり、この値モデルには因子型が無いため忠実に表せない。",
example: 'relevel(f, "b")',
caution: "未対応（因子を表せないため）。",
status: "unsupported",
},
{
name: "reorder",
category: "型変換",
syntax:
"reorder(x, X, FUN = mean,..., order = is.ordered(x), decreasing = FALSE)",
description:
"因子 x の水準の順序を、X を水準ごとに FUN で集計した値の順に並べ替える（集計値は属性 \"scores\" に保存される）。【未対応の理由】対象は因子であり、並べ替えの結果も \"scores\" 属性を持つ因子として返るため、この値モデルでは忠実に表せない。",
example: "reorder(f, x, mean)",
caution: "未対応（因子と属性を表せないため）。",
status: "unsupported",
},
{
name: "reshape",
category: "データフレーム",
syntax:
'reshape(data, varying = NULL, v.names = NULL, timevar = "time", idvar = "id", ids = 1:NROW(data), times = seq_along(varying[[1]]), drop = NULL, direction, new.row.names = NULL, sep = ".", split)',
description:
"データフレームをワイド形式とロング形式の間で変換する。【未対応の理由】varying のリスト形式（値モデルにリスト型が無い）や、結果に付く \"reshapeWide\"／\"reshapeLong\" 属性による反転操作など、変換の意味論全体をこの値モデルでは忠実に表せないため。",
example: 'reshape(df, direction = "long")',
caution: "未対応（リスト形式の指定と属性による反転を表せないため）。",
status: "unsupported",
},
];
