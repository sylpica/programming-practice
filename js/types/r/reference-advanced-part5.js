// 高度モード B4S：R 高度リファレンス項目 part5（stats 検定・検出力：stest 班）。
// 項目形式は B4 最終形（BRIEF §4）：追加フィールドは付けず、未対応の理由は
// description に名指しで明記する。syntax／description／example の事実は
// 公式ヘルプ（stat.ethz.ch R-manual R-devel、stats 4.6.0）の Usage／
// Description／Value で裏付けた（各検定の Value 節が列挙する htest の
// 構成要素を項目ごとに明記している）。
// 検定系は全てクラス "htest"（pairwise 系は "pairwise.htest"、検出力系は
// "power.htest"）のリストオブジェクトを返すため、値モデルで忠実に再現
// できず原則未対応。数値ベクトル→数値ベクトルの p.adjust のみ実装した
// （functions-advanced-statstest.js、実 R のソースアルゴリズムを移植し
// テストで照合）。
export const referenceAdvanced = [
{
"name": "ansari.test",
"category": "検定",
"syntax": "ansari.test(x, y, alternative = c(\"two.sided\", \"less\", \"greater\"), exact = NULL, conf.int = FALSE, conf.level = 0.95,...)",
"description": "2標本の尺度パラメータの差に対するAnsari-Bradley検定を行います。【未対応の理由】クラス \"htest\" のリスト（統計量・p値・帰無仮説での尺度比 null.value、conf.int = TRUE のときは尺度比の信頼区間 conf.int と推定値 estimate を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "ansari.test(ramsay, jung.parekh)",
"caution": "exactが未指定の場合、両標本の有限値が50未満でタイが無ければ正確なp値、そうでなければ正規近似が使われます。タイがある場合は中間順位が使われます。",
"status": "unsupported"
},
{
"name": "bartlett.test",
"category": "検定",
"syntax": "bartlett.test(x, g,...)",
"description": "各群（標本）の分散が等しいという帰無仮説に対するBartlett検定を行います。【未対応の理由】クラス \"htest\" のリスト（BartlettのK二乗統計量 statistic・その近似カイ二乗分布の自由度 parameter・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "bartlett.test(InsectSprays$count, InsectSprays$spray)",
"caution": "xが数値ベクトルのリストの場合は各要素が標本とみなされ、gは無視されます。xにはlmを継承する適合済み線形モデルオブジェクトのリストも渡せます。",
"status": "unsupported"
},
{
"name": "binom.test",
"category": "検定",
"syntax": "binom.test(x, n, p = 0.5, alternative = c(\"two.sided\", \"less\", \"greater\"), conf.level = 0.95)",
"description": "ベルヌーイ試行の成功確率に関する単純な帰無仮説の正確検定を行います。【未対応の理由】クラス \"htest\" のリスト（成功回数 statistic・試行回数 parameter・p値・成功確率の信頼区間 conf.int と推定値 estimate・帰無仮説での成功確率 null.value を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "binom.test(c(682, 243), p = 3/4)",
"caution": "信頼区間はClopper-Pearson法で得られます。xが長さ2のベクトル（成功数と失敗数）の場合、nは無視されます。",
"status": "unsupported"
},
{
"name": "Box.test",
"category": "検定",
"syntax": "Box.test(x, lag = 1, type = c(\"Box-Pierce\", \"Ljung-Box\"), fitdf = 0)",
"description": "時系列の独立性の帰無仮説に対するBox-Pierce検定またはLjung-Box検定の統計量を計算します（portmanteau検定）。【未対応の理由】クラス \"htest\" のリスト（検定統計量 statistic・fitdfを差し引いた近似カイ二乗分布の自由度 parameter・p値・実施した検定種別 method を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "Box.test(rnorm(100), lag = 1)",
"caution": "欠損値は扱えません。ARMA適合の残差に適用する場合はfitdf = p+qとすると近似が良くなります（lag > fitdfが必要）。",
"status": "unsupported"
},
{
"name": "TukeyHSD",
"category": "検定",
"syntax": "TukeyHSD(x, which, ordered = FALSE, conf.level = 0.95,...)",
"description": "因子の水準の平均の差に対する、族ごとの被覆確率を指定した信頼区間の集合を、Student化された範囲統計量（Tukeyの正直有意差法）に基づいて作ります。【未対応の理由】入力がaov等の適合済みモデルオブジェクトであることが前提で、クラス c(\"multicomp\", \"TukeyHSD\") のリスト（項ごとに行列 diff／lwr／upr／p adj を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "TukeyHSD(fm1, \"tension\", ordered = TRUE)",
"caution": "ジェネリック関数で、ここでの説明はクラス \"aov\" の適合に対するメソッドのものです。whichで対象の項を指定でき、因子でない項は警告付きで落とされます。",
"status": "unsupported"
},
{
"name": "chisq.test",
"category": "検定",
"syntax": "chisq.test(x, y = NULL, correct = TRUE, p = rep(1/length(x), length(x)), rescale.p = FALSE, simulate.p.value = FALSE, B = 2000)",
"description": "カイ二乗分割表検定と適合度検定を行います。【未対応の理由】クラス \"htest\" のリスト（カイ二乗統計量 statistic・自由度 parameter・p値に加え、観測度数 observed・帰無仮説での期待度数 expected・Pearson残差 residuals・標準化残差 stdres を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "chisq.test(c(A = 20, B = 15, C = 25))",
"caution": "連続性補正（correct）は2×2表の場合にのみ使われます。simulate.p.value = TRUEではモンテカルロシミュレーションでp値を計算し、その場合parameterはNAになります。",
"status": "unsupported"
},
{
"name": "cor.test",
"category": "検定",
"syntax": "cor.test(x, y, alternative = c(\"two.sided\", \"less\", \"greater\"), method = c(\"pearson\", \"kendall\", \"spearman\"), exact = NULL, conf.level = 0.95, continuity = FALSE,...)",
"description": "Pearsonの積率相関係数、Kendallのτ、Spearmanのρのいずれかを用いて、対になった標本間の関連を検定します。【未対応の理由】クラス \"htest\" のリスト（検定統計量 statistic・p値・関連の尺度の推定値 estimate（cor／tau／rho）・Pearson法で完全対が4組以上ある場合の信頼区間 conf.int を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "cor.test(x, y, method = \"kendall\")",
"caution": "信頼区間はPearson法の場合にのみ返ります。Kendall／Spearmanではexactの扱いが異なり、タイがある場合は正確なp値は計算されません。",
"status": "unsupported"
},
{
"name": "fisher.test",
"category": "検定",
"syntax": "fisher.test(x, y = NULL, workspace = 200000, hybrid = FALSE, hybridPars = c(expect = 5, percent = 80, Emin = 1), control = list(), or = 1, alternative = \"two.sided\", conf.int = TRUE, conf.level = 0.95, simulate.p.value = FALSE, B = 2000)",
"description": "周辺度数を固定した分割表における行と列の独立性の帰無仮説に対するFisherの正確検定を行います。【未対応の理由】クラス \"htest\" のリスト（p値を持ち、2×2表の場合にのみオッズ比の信頼区間 conf.int・条件付き最尤推定値 estimate・帰無仮説でのオッズ比 null.value が加わる。統計量 statistic は持たない）を返すため、値モデルで忠実に再現できないため",
"example": "fisher.test(TeaTasting, alternative = \"greater\")",
"caution": "2×2表より大きい表ではネットワークアルゴリズムで計算され、表が大きすぎるとエラーになります。alternativeとorは2×2表の場合にのみ使われます。",
"status": "unsupported"
},
{
"name": "fligner.test",
"category": "検定",
"syntax": "fligner.test(x, g,...)",
"description": "各群（標本）の分散が等しいという帰無仮説に対するFligner-Killeen（中央値）検定を行います。【未対応の理由】クラス \"htest\" のリスト（Fligner-Killeen:med X^2統計量 statistic・その近似カイ二乗分布の自由度 parameter・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "fligner.test(InsectSprays$count, InsectSprays$spray)",
"caution": "各標本は中央値で中心化されます（F-K:med版）。xが数値ベクトルのリストの場合はgは無視されます。",
"status": "unsupported"
},
{
"name": "friedman.test",
"category": "検定",
"syntax": "friedman.test(y, groups, blocks,...)",
"description": "繰り返しのないブロックデータに対するFriedman順位和検定を行います。【未対応の理由】クラス \"htest\" のリスト（Friedmanのカイ二乗統計量 statistic・その近似カイ二乗分布の自由度 parameter・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "friedman.test(RoundingTimes)",
"caution": "groupsとblocksの各組み合わせに観測がちょうど1つずつある完備ブロック計画専用です。yが行列の場合は列・行の添字からgroupsとblocksが得られ、yにNAを含むブロックは除かれます。",
"status": "unsupported"
},
{
"name": "kruskal.test",
"category": "検定",
"syntax": "kruskal.test(x, g,...)",
"description": "Kruskal-Wallis順位和検定を行います（各群で分布の位置パラメータが等しいという帰無仮説）。【未対応の理由】クラス \"htest\" のリスト（Kruskal-Wallis順位和統計量 statistic・その近似カイ二乗分布の自由度 parameter・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "kruskal.test(list(x, y, z))",
"caution": "xがリストの場合はgは警告付きで無視されます。リストの非数値要素は警告付きで強制変換されます。",
"status": "unsupported"
},
{
"name": "ks.test",
"category": "検定",
"syntax": "ks.test(x, y,..., alternative = c(\"two.sided\", \"less\", \"greater\"), exact = NULL, simulate.p.value = FALSE, B = 2000)",
"description": "1標本または2標本のKolmogorov-Smirnov検定を行います。【未対応の理由】クラス c(\"ks.test\", \"htest\") を継承するリスト（経験分布関数の最大差である検定統計量 statistic とp値を持ち、parameterは持たない）を返すため、値モデルで忠実に再現できないため",
"example": "ks.test(x, y)",
"caution": "1標本検定でタイがあると常に警告が出ます。yに分布名を与える場合、そのパラメータはデータから推定せず...で事前に指定しなければなりません。",
"status": "unsupported"
},
{
"name": "mantelhaen.test",
"category": "検定",
"syntax": "mantelhaen.test(x, y = NULL, z = NULL, alternative = c(\"two.sided\", \"less\", \"greater\"), correct = TRUE, exact = FALSE, conf.level = 0.95)",
"description": "三元交互作用が無いという仮定のもとで、2つの名義変数が各層で条件付き独立であるという帰無仮説に対するCochran-Mantel-Haenszelカイ二乗検定を行います。【未対応の理由】クラス \"htest\" のリスト（Mantel-Haenszelカイ二乗統計量 statistic・自由度 parameter・p値を持ち、2×2×K表の場合にのみ共通オッズ比の信頼区間 conf.int・推定値 estimate・帰無値 null.value が加わる）を返すため、値モデルで忠実に再現できないため",
"example": "mantelhaen.test(Rabbits)",
"caution": "漸近分布は三元交互作用が無い場合にのみ有効です。alternative／correct／exact／conf.levelは2×2×K表の場合にのみ使われます。",
"status": "unsupported"
},
{
"name": "mauchly.test",
"category": "検定",
"syntax": "mauchly.test(object,...)",
"description": "Wishart分布に従う共分散行列（またはその変換）が所与の行列に比例するかどうかを検定します（球面性のMauchly検定）。【未対応の理由】入力がクラス \"mlm\" または \"SSD\" のモデルオブジェクトであることが前提のS3ジェネリックで、クラス \"htest\" のオブジェクト（MauchlyのW統計量・自由度・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "mauchly.test(mlmfit, X = ~1)",
"caution": "典型的な用途は繰り返し測定デザインで、X = ~1とする使い方が一般的です。p値はSASとわずかに異なります（漸近近似に2次の項を含むため）。",
"status": "unsupported"
},
{
"name": "mcnemar.test",
"category": "検定",
"syntax": "mcnemar.test(x, y = NULL, correct = TRUE)",
"description": "2次元分割表の行と列の対称性に対するMcNemarのカイ二乗検定を行います。【未対応の理由】クラス \"htest\" のリスト（McNemar統計量 statistic・その近似カイ二乗分布の自由度 parameter・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "mcnemar.test(Performance)",
"caution": "帰無仮説はセル[i,j]と[j,i]に分類される確率が等しいことです。連続性補正は2×2表の場合にのみ使われます。",
"status": "unsupported"
},
{
"name": "mood.test",
"category": "検定",
"syntax": "mood.test(x, y, alternative = c(\"two.sided\", \"less\", \"greater\"),...)",
"description": "尺度パラメータの差に対するMoodの2標本検定を行います。【未対応の理由】クラス \"htest\" のリスト（検定統計量 statistic とp値を持ち、自由度 parameter は持たない）を返すため、値モデルで忠実に再現できないため",
"example": "mood.test(ramsay, jung.parekh)",
"caution": "帰無仮説は尺度パラメータ比s = 1です。タイがある場合はMielke（1967）の定式化が使われます。",
"status": "unsupported"
},
{
"name": "oneway.test",
"category": "検定",
"syntax": "oneway.test(formula, data, subset, na.action, var.equal = FALSE)",
"description": "正規分布からの2つ以上の標本の平均が等しいかどうかを検定します（分散が等しいとは限りません）。【未対応の理由】入力がformulaオブジェクト（lhs ~ rhs）であることが前提で、クラス \"htest\" のリスト（F統計量 statistic・F分布の自由度 parameter・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "oneway.test(extra ~ group, data = sleep)",
"caution": "var.equal = FALSE（既定）ではWelch（1951）の近似法、TRUEでは一元配置分散分析の単純なF検定が行われます。formulaの右辺に複数の項がある場合はその交互作用でグループ化されます。",
"status": "unsupported"
},
{
"name": "poisson.test",
"category": "検定",
"syntax": "poisson.test(x, T = 1, r = 1, alternative = c(\"two.sided\", \"less\", \"greater\"), conf.level = 0.95)",
"description": "Poisson分布の率パラメータ、または2つの率パラメータの比に関する単純な帰無仮説の正確検定を行います。【未対応の理由】クラス \"htest\" のリスト（事件数 statistic・対応する期待数 parameter・p値・率または率比の信頼区間 conf.int と推定値 estimate・帰無仮説での率 r である null.value を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "poisson.test(137, 24.19893)",
"caution": "Tは事件数の時間基準（人年や母集団サイズなど）です。2標本の場合は総事件数で条件付けた二項検定に帰着します。",
"status": "unsupported"
},
{
"name": "PP.test",
"category": "検定",
"syntax": "PP.test(x, lshort = TRUE)",
"description": "xに単位根があるという帰無仮説を定常な対立仮説に対して検定するPhillips-Perron検定を計算します。【未対応の理由】クラス \"htest\" のリスト（補正済みt統計量 statistic・打ち切りラグパラメータ parameter・内挿で得たp値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "PP.test(x)",
"caution": "欠損値は扱えません。分散の推定にはNewey-West推定量が使われ、p値はBanerjee他（1993）の表4.2から内挿されます。lshortで打ち切りラグの短い版／長い版が切り替わります。",
"status": "unsupported"
},
{
"name": "prop.test",
"category": "検定",
"syntax": "prop.test(x, n, p = NULL, alternative = c(\"two.sided\", \"less\", \"greater\"), conf.level = 0.95, correct = TRUE)",
"description": "複数の群の比率（成功確率）が等しいこと、または所与の値に等しいことの帰無仮説を検定します。【未対応の理由】クラス \"htest\" のリスト（Pearsonのカイ二乗統計量 statistic・自由度 parameter・p値・標本比率の推定値 estimate・群が1つか2つの場合の信頼区間 conf.int を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "prop.test(c(83, 90, 129, 70), c(86, 93, 136, 82))",
"caution": "群が3つ以上の場合、対立仮説は常に両側になり信頼区間はNULLになります。Yatesの連続性補正は、標本比率の差の絶対値を超えない場合にのみ使われます。",
"status": "unsupported"
},
{
"name": "prop.trend.test",
"category": "検定",
"syntax": "prop.trend.test(x, n, score = seq_along(x))",
"description": "比率の傾向に対するカイ二乗検定を行います（対数オッズがscoreに比例して変化する局所的対立仮説に対して漸近的に最適）。【未対応の理由】クラス \"htest\" のオブジェクト（傾向のカイ二乗統計量・自由度1のp値・標本比率の推定値等を持つリスト）を返すため、値モデルで忠実に再現できないため",
"example": "prop.trend.test(c(83, 90, 129, 70), c(86, 93, 136, 82))",
"caution": "scoreの既定値は群番号です。本来はprop.testへ統合されるべきものと公式ヘルプに記されています。",
"status": "unsupported"
},
{
"name": "quade.test",
"category": "検定",
"syntax": "quade.test(y, groups, blocks,...)",
"description": "繰り返しのないブロックデータに対するQuade検定を行います。【未対応の理由】クラス \"htest\" のリスト（QuadeのF統計量 statistic・近似F分布の分子／分母自由度 parameter・p値を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "quade.test(y)",
"caution": "groupsとblocksの各組み合わせに観測がちょうど1つずつある完備ブロック計画専用です。yが行列の場合は列・行の添字からgroupsとblocksが得られます。",
"status": "unsupported"
},
{
"name": "shapiro.test",
"category": "検定",
"syntax": "shapiro.test(x)",
"description": "正規性のShapiro-Wilk検定を行います。【未対応の理由】クラス \"htest\" のリスト（Shapiro-Wilk統計量 W である statistic と近似p値を持ち、parameterは持たない）を返すため、値モデルで忠実に再現できないため",
"example": "shapiro.test(rnorm(100, mean = 5, sd = 3))",
"caution": "欠損値は許されますが、非欠損値の数は3以上5000以下でなければなりません。p値の計算はn = 3では正確、それ以外は近似です。",
"status": "unsupported"
},
{
"name": "t.test",
"category": "検定",
"syntax": "t.test(x, y = NULL, alternative = c(\"two.sided\", \"less\", \"greater\"), mu = 0, paired = FALSE, var.equal = FALSE, conf.level = 0.95,...)",
"description": "データベクトルに対する1標本および2標本のt検定を行います。【未対応の理由】クラス \"htest\" のリスト（t統計量 statistic・自由度 parameter・p値・平均または平均差の信頼区間 conf.int と推定値 estimate・帰無値 null.value・標準誤差 stderr を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "t.test(1:10, y = c(7:20))",
"caution": "var.equal = FALSE（既定）では分散を群ごとに推定しWelchの自由度近似が使われます。paired = TRUEではxとyの両方が必要で長さが同じでなければならず、欠損値は対ごとに除かれます。",
"status": "unsupported"
},
{
"name": "var.test",
"category": "検定",
"syntax": "var.test(x, y, ratio = 1, alternative = c(\"two.sided\", \"less\", \"greater\"), conf.level = 0.95,...)",
"description": "正規母集団からの2標本の分散を比較するF検定を行います。【未対応の理由】クラス \"htest\" のリスト（F統計量 statistic・F分布の自由度 parameter・p値・母分散比の信頼区間 conf.int・標本分散比の推定値 estimate・帰無仮説での分散比 null.value を持つ）を返すため、値モデルで忠実に再現できないため",
"example": "var.test(x, y)",
"caution": "xとyには数値ベクトルのほか、lmを継承する適合済み線形モデルオブジェクトも渡せます。ratioは帰無仮説での母分散比です。",
"status": "unsupported"
},
{
"name": "wilcox.test",
"category": "検定",
"syntax": "wilcox.test(x, y = NULL, alternative = c(\"two.sided\", \"less\", \"greater\"), mu = 0, paired = FALSE, exact = NULL, correct = TRUE, conf.int = FALSE, conf.level = 0.95, tol.root = 1e-4, digits.rank = Inf,...)",
"description": "データベクトルに対する1標本および2標本のWilcoxon検定を行います（2標本版はMann-Whitney検定としても知られます）。【未対応の理由】クラス \"htest\" のリスト（名前付きの検定統計量 statistic・p値・位置パラメータ null.value を持ち、conf.int = TRUE のときは位置パラメータの信頼区間 conf.int と推定値 estimate が加わる）を返すため、値モデルで忠実に再現できないため",
"example": "wilcox.test(x, y)",
"caution": "exactが未指定の場合、標本の有限値が50未満なら正確なp値が計算され、タイがある場合は観測順位で条件付けた分布による正確推論が行われます。非有限値（Infや欠損値）は除かれます。",
"status": "unsupported"
},
{
"name": "pairwise.prop.test",
"category": "検定",
"syntax": "pairwise.prop.test(x, n, p.adjust.method = p.adjust.methods,...)",
"description": "多重検定の補正付きで、比率の対の間の pairwise 比較を計算します。【未対応の理由】クラス \"pairwise.htest\" のオブジェクト（調整済みp値の下三角行列 p.value・検定法 method・データ名 data.name・調整法 p.adjust.method を持つリスト）を返すため、値モデルで忠実に再現できないため",
"example": "pairwise.prop.test(smokers, patients)",
"caution": "...はprop.testへ渡されます。p値の調整法の既定は \"holm\" です。",
"status": "unsupported"
},
{
"name": "pairwise.t.test",
"category": "検定",
"syntax": "pairwise.t.test(x, g, p.adjust.method = p.adjust.methods, pool.sd =!paired, paired = FALSE, alternative = c(\"two.sided\", \"less\", \"greater\"),...)",
"description": "多重検定の補正付きで、群の水準間の pairwise 比較（t検定）を計算します。【未対応の理由】クラス \"pairwise.htest\" のオブジェクト（調整済みp値の下三角行列 p.value・検定法 method・データ名 data.name・調整法 p.adjust.method を持つリスト）を返すため、値モデルで忠実に再現できないため",
"example": "pairwise.t.test(Ozone, Month)",
"caution": "計算されるのは比較行列の下三角のみです。pool.sd = TRUEの場合はt.testを実際には呼ばないため...の引数は無視され、pool.sdとpairedは同時にTRUEにできません。",
"status": "unsupported"
},
{
"name": "pairwise.wilcox.test",
"category": "検定",
"syntax": "pairwise.wilcox.test(x, g, p.adjust.method = p.adjust.methods, paired = FALSE,...)",
"description": "多重検定の補正付きで、群の水準間の pairwise 比較（Wilcoxon順位和検定）を計算します。【未対応の理由】クラス \"pairwise.htest\" のオブジェクト（調整済みp値の下三角行列 p.value・検定法 method・データ名 data.name・調整法 p.adjust.method を持つリスト）を返すため、値モデルで忠実に再現できないため",
"example": "pairwise.wilcox.test(Ozone, Month)",
"caution": "計算されるのは比較行列の下三角のみのため、alternativeを両側以外にする場合はgの水準が意味のある順序になっている必要があります。...はwilcox.testへ渡されます。",
"status": "unsupported"
},
{
"name": "pairwise.table",
"category": "検定",
"syntax": "pairwise.table(compare.levels, level.names, p.adjust.method)",
"description": "多重検定の補正付きで、pairwise比較のp値の表を作ります（pairwise.*系が内部で使う関数）。【未対応の理由】第1引数compare.levelsが関数オブジェクト（添字iとjから未調整p値を計算する関数）であり関数オブジェクトを値モデルで表せないうえ、返り値も下三角形式のp値表（次元名付き行列＝table）であるため",
"example": "pairwise.table(compare.levels, level.names, \"holm\")",
"caution": "compare.levelsはiとjについて対称（入れ替えても同じp値）であることが前提です。通常はpairwise.t.test等の内部から使われます。",
"status": "unsupported"
},
{
"name": "p.adjust",
"category": "検定",
"syntax": "p.adjust(p, method = p.adjust.methods, n = length(p))",
"description": "p値の集合を受け取り、いずれかの方法で調整したp値を返します（数値ベクトル→数値ベクトルで、名前はpから引き継がれます）。",
"example": "p.adjust(c(0.01, 0.04, 0.03), method = \"BH\")",
"caution": "methodは前方一致による省略形でも指定できます（\"bonf\"等）。NAはそのまま保持され調整の対象から外れますが、その場合に既定のnはNAを除いた要素数になります。nを要素数より大きくすると、観測されていないp値はbonferroni／holmでは観測された全てのpより大きいもの、その他の方法では1とみなして計算されます。",
"status": "supported"
},
{
"name": "p.adjust.methods",
"category": "検定",
"syntax": "p.adjust.methods",
"description": "p.adjustで使える調整法の名前を並べた文字列ベクトル c(\"holm\", \"hochberg\", \"hommel\", \"bonferroni\", \"BH\", \"BY\", \"fdr\", \"none\") です。【未対応の理由】呼び出し可能な関数ではなくデータオブジェクト（文字列ベクトルの定数）のため",
"example": "p.adjust.methods",
"caution": "p.adjustのmethod引数の既定値として使われ、その場合は先頭の \"holm\" が選ばれます。",
"status": "unsupported"
},
{
"name": "power",
"category": "モデル",
"syntax": "power(lambda = 1)",
"description": "リンク関数 η = μ^λ に基づくリンクオブジェクトを作ります（一般化線形モデルのfamilyで使う）。【未対応の理由】linkfun／linkinv／mu.eta／validetaという関数オブジェクトを要素に持つリスト（リンクオブジェクト）を返すため、値モデルで忠実に再現できないため",
"example": "power(1/3)",
"caution": "lambdaが0以下では0とみなされlogリンクになり、lambda = 1（既定）は恒等リンクです。数値の累乗（^演算子）や検定の検出力（power.t.test等）とは別物です。",
"status": "unsupported"
},
{
"name": "power.anova.test",
"category": "検定",
"syntax": "power.anova.test(groups = NULL, n = NULL, between.var = NULL, within.var = NULL, sig.level = 0.05, power = NULL)",
"description": "バランスした一元配置分散分析検定の検出力を計算するか、目標の検出力を得るためのパラメータを求めます。【未対応の理由】クラス \"power.htest\" のオブジェクト（引数と計算された値にmethodとnoteを加えたリスト）を返すため、値モデルで忠実に再現できないため",
"example": "power.anova.test(groups = 4, n = 5, between.var = 1, within.var = 3)",
"caution": "groups／n／between.var／within.var／sig.level／powerのうちちょうど1つをNULLとして渡し、その値が他から求められます。sig.levelには非NULLの既定値があるため、求めたい場合は明示的にNULLを渡します。",
"status": "unsupported"
},
{
"name": "power.prop.test",
"category": "検定",
"syntax": "power.prop.test(n = NULL, p1 = NULL, p2 = NULL, sig.level = 0.05, power = NULL, alternative = c(\"two.sided\", \"one.sided\"), strict = FALSE, tol =.Machine$double.eps^0.25)",
"description": "比率の2標本検定の検出力を計算するか、目標の検出力を得るためのパラメータを求めます。【未対応の理由】クラス \"power.htest\" のオブジェクト（引数と計算された値にmethodとnoteを加えたリスト）を返すため、値モデルで忠実に再現できないため",
"example": "power.prop.test(n = 50, p1 = 0.5, p2 = 0.75)",
"caution": "n／p1／p2／sig.level／powerのうちちょうど1つをNULLとして渡し、その値が他から求められます。条件によっては解が存在せず警告が出る場合があります。",
"status": "unsupported"
},
{
"name": "power.t.test",
"category": "検定",
"syntax": "power.t.test(n = NULL, delta = NULL, sd = 1, sig.level = 0.05, power = NULL, type = c(\"two.sample\", \"one.sample\", \"paired\"), alternative = c(\"two.sided\", \"one.sided\"), strict = FALSE, tol =.Machine$double.eps^0.25)",
"description": "1標本または2標本のt検定の検出力を計算するか、目標の検出力を得るためのパラメータを求めます。【未対応の理由】クラス \"power.htest\" のオブジェクト（引数と計算された値にmethodとnoteを加えたリスト）を返すため、値モデルで忠実に再現できないため",
"example": "power.t.test(n = 20, delta = 1)",
"caution": "n／delta／sd／sig.level／powerのうちちょうど1つをNULLとして渡し、その値が他から求められます。sdとsig.levelには非NULLの既定値があるため、求めたい場合は明示的にNULLを渡します。求解にはunirootが使われます。",
"status": "unsupported"
},
{
"name": "print.htest",
"category": "検定",
"syntax": "print.htest(x, digits = getOption(\"digits\"), prefix = \"\\t\",...)",
"description": "クラス \"htest\" のオブジェクト（検定結果）を表示するprintのS3メソッドです。【未対応の理由】htestオブジェクトそのものを入力として前提とするS3印刷メソッドであり、整形表示と引数xの不可視の返却（invisible）を値モデルで忠実に再現できないため",
"example": "print.htest(x)",
"caution": "通常はprint(x)がクラスに応じて自動でこのメソッドを呼びます。htestのmethod要素はprefix付きで折り返してタイトルとして表示されます。",
"status": "unsupported"
},
{
"name": "print.power.htest",
"category": "検定",
"syntax": "print.power.htest(x, digits = getOption(\"digits\"),...)",
"description": "クラス \"power.htest\" のオブジェクト（検出力計算の結果）を表示するprintのS3メソッドです。【未対応の理由】power.htestオブジェクトそのものを入力として前提とするS3印刷メソッドであり、整形表示と引数xの不可視の返却（invisible）を値モデルで忠実に再現できないため",
"example": "print.power.htest(ptt)",
"caution": "通常はprint(x)がクラスに応じて自動でこのメソッドを呼びます。methodがタイトル、noteが脚注として表示され、残りの要素は「名前 = 値」の整列形式で表示されます。",
"status": "unsupported"
}
];
