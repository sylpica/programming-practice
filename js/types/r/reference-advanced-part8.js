// 高度モード B4S：R 高度リファレンス項目 part8（stats 多変量・クラスタ・その他）。
// 項目形式は B4S 共通ブリーフ第4章の正規形（追加フィールドなし）。
// syntax・description の事実は公式ヘルプ（stat.ethz.ch R-manual の
// 各トピック）と実 R 4.3.3 の実測に基づく（報告書
// docs/audit/ADV-B4S-smisc.md に根拠を記録）。
export const referenceAdvanced = [
  {
    "name": "Pair",
    "category": "モデル",
    "syntax": "Pair(x, y)",
    "description": "2つのベクトルを対にしたデータオブジェクト（クラス \"Pair\" の2列行列）を作ります。主に対応のある検定の formula インターフェースの一部として使われます。【未対応の理由】クラス付き行列オブジェクトを返すため（行列とクラス属性を値モデルで表せないため）",
    "example": "Pair(x, y)",
    "caution": "対応のあるデータ専用で、通常のベクトル演算の対象ではありません。",
    "status": "unsupported"
  },
  {
    "name": "estVar",
    "category": "モデル",
    "syntax": "estVar(object, ...)",
    "description": "多変量線形モデル（クラス \"mlm\" または \"SSD\" のオブジェクト）から推定分散共分散行列を取り出すメソッドです。【未対応の理由】適合済みモデルオブジェクトに依存し、行列を返すため",
    "example": "estVar(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSD",
    "category": "モデル",
    "syntax": "SSD(object, ...)",
    "description": "多変量線形モデル（クラス \"mlm\"）の残差平方和・積和行列と自由度などを含む、クラス \"SSD\" のリストを作るメソッドです。【未対応の理由】適合済みモデルオブジェクトに依存し、クラス付きリストと行列を返すため",
    "example": "SSD(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.hclust",
    "category": "モデル",
    "syntax": "as.hclust(x, ...)",
    "description": "オブジェクトを階層クラスタリング結果のクラス \"hclust\" へ変換する総称関数です。【未対応の理由】hclust オブジェクト（クラス付きリスト）を返す S3 総称関数のため",
    "example": "as.hclust(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "factanal",
    "category": "モデル",
    "syntax": "factanal(x, factors, data = NULL, covmat = NULL, n.obs = NA, subset, na.action, start = NULL, scores = c(\"none\", \"regression\", \"Bartlett\"), rotation = \"varimax\", control = NULL, ...)",
    "description": "最尤法による因子分析を行い、負荷量・独自性・適合の検定などを含むクラス \"factanal\" のオブジェクトを返します。【未対応の理由】モデルオブジェクト（クラス付きリスト）を返すため",
    "example": "factanal(x, factors = 2)",
    "caution": "回転（rotation）の既定は \"varimax\" です。",
    "status": "unsupported"
  },
  {
    "name": "print.summary.princomp",
    "category": "モデル",
    "syntax": "print.summary.princomp(x, digits = 3, loadings = x$print.loadings, cutoff = x$cutoff, ...)",
    "description": "主成分分析（princomp）の要約オブジェクトを表示するメソッドです。【未対応の理由】princomp のモデルオブジェクトとその要約オブジェクトに依存するため",
    "example": "print.summary.princomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.princomp",
    "category": "モデル",
    "syntax": "summary.princomp(object, loadings = FALSE, cutoff = 0.1, ...)",
    "description": "主成分分析（princomp）の要約（各主成分の重要度など）を作るメソッドです。【未対応の理由】princomp のモデルオブジェクトに依存するため",
    "example": "summary.princomp(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "biplot",
    "category": "その他",
    "syntax": "biplot(x, ...)",
    "description": "多変量データのバイプロット（観測と変数を同じ図に重ねた図）を描く総称関数です。【未対応の理由】グラフィックス（描画）のため",
    "example": "biplot(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "biplot.princomp",
    "category": "その他",
    "syntax": "biplot(x, choices = 1:2, scale = 1, pc.biplot = FALSE, ...)",
    "description": "主成分分析（prcomp／princomp）のバイプロットを描くメソッドです。【未対応の理由】グラフィックス（描画）のため、加えて主成分オブジェクトに依存するため",
    "example": "biplot.princomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cancor",
    "category": "モデル",
    "syntax": "cancor(x, y, xcenter = TRUE, ycenter = TRUE)",
    "description": "2組のデータ行列の正準相関（正準相関係数・正準変量など）を計算し、リストで返します。【未対応の理由】行列入力とリスト形式の結果に依存するため",
    "example": "cancor(x, y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cmdscale",
    "category": "モデル",
    "syntax": "cmdscale(d, k = 2, eig = FALSE, add = FALSE, x.ret = FALSE, list. = eig || add || x.ret)",
    "description": "距離から古典的（計量）多次元尺度構成法による座標を求めます。オプションにより座標行列、または固有値などを含むリストを返します。【未対応の理由】dist オブジェクト・行列を扱い、行列またはリストを返すため",
    "example": "cmdscale(d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "convolve",
    "category": "時系列",
    "syntax": "convolve(x, y, conj = TRUE, type = c(\"circular\", \"open\", \"filter\"))",
    "description": "2つの数値列の畳み込みを、FFT による定義どおりに計算します。type = \"circular\" は列を周期的に扱い（両列の長さが同じであることが必要）、\"open\" は両端に 0 を詰めた線形の畳み込み、\"filter\" は \"open\" の中央部分で、x への重み付き移動平均に対応します。",
    "example": "convolve(c(1, 2, 3), c(1, 2), type = \"open\")",
    "caution": "実 R が FFT で計算する都合上、NA は全要素へ伝播し、NaN や Inf があると全要素が NaN になります。論理値入力は複素数を返すため未対応です。",
    "status": "supported"
  },
  {
    "name": "cophenetic",
    "category": "モデル",
    "syntax": "cophenetic(x)",
    "description": "階層クラスタリングについて、2つの観測が初めて同じクラスタに併合される距離（コフェネティック距離）を dist オブジェクトで返します。【未対応の理由】hclust／dendrogram オブジェクトを入力とし、dist オブジェクトを返すため",
    "example": "cophenetic(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cutree",
    "category": "モデル",
    "syntax": "cutree(tree, k = NULL, h = NULL)",
    "description": "階層クラスタリングの樹形図をクラスタ数 k または高さ h で切断し、各観測の所属クラスタ番号を返します。【未対応の理由】hclust オブジェクトに依存するため",
    "example": "cutree(tree, k = 2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dendrapply",
    "category": "モデル",
    "syntax": "dendrapply(X, FUN, ...)",
    "description": "dendrogram の全ノードに関数 FUN を再帰的に適用し、dendrogram を返します。【未対応の理由】dendrogram オブジェクトとユーザ関数（FUN）の適用に依存するため",
    "example": "dendrapply(X, FUN)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.dendrogram",
    "category": "モデル",
    "syntax": "as.dendrogram(object, ...)",
    "description": "オブジェクトを dendrogram（樹形図）オブジェクトへ変換する総称関数です。【未対応の理由】dendrogram オブジェクト（クラス付きの入れ子リスト）を返すため",
    "example": "as.dendrogram(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.hclust.dendrogram",
    "category": "モデル",
    "syntax": "as.hclust(x, ...)",
    "description": "dendrogram オブジェクトを hclust オブジェクトへ変換するメソッドです。【未対応の理由】dendrogram／hclust オブジェクトに依存するため",
    "example": "as.hclust.dendrogram(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cut.dendrogram",
    "category": "モデル",
    "syntax": "cut.dendrogram(x, h, ...)",
    "description": "dendrogram を高さ h で切り、上部と下部の部分木を含むリストを返すメソッドです。【未対応の理由】dendrogram オブジェクトに依存し、リストを返すため",
    "example": "cut.dendrogram(x, h)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dendrogram",
    "category": "モデル",
    "syntax": "dendrogram",
    "description": "階層クラスタリングの樹形図を表すクラス \"dendrogram\" の文書見出しです。【未対応の理由】クラス名であり、呼び出せる関数ではないため",
    "example": "as.dendrogram(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.leaf",
    "category": "モデル",
    "syntax": "is.leaf(object)",
    "description": "dendrogram のノードが葉（末端の観測）かどうかを判定します。【未対応の理由】dendrogram オブジェクトの属性に依存するため",
    "example": "is.leaf(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "merge.dendrogram",
    "category": "モデル",
    "syntax": "merge.dendrogram(x, y, ..., height, adjust = c(\"auto\", \"add.max\", \"none\"))",
    "description": "複数の dendrogram を併合して1つの dendrogram にするメソッドです。【未対応の理由】dendrogram オブジェクトに依存するため",
    "example": "merge.dendrogram(x, y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nobs.dendrogram",
    "category": "モデル",
    "syntax": "nobs.dendrogram(object, ...)",
    "description": "dendrogram の葉（観測）の数を返すメソッドです。【未対応の理由】dendrogram オブジェクトに依存するため",
    "example": "nobs.dendrogram(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.dendrogram",
    "category": "その他",
    "syntax": "plot(x, type = c(\"rectangle\", \"triangle\"), center = FALSE, nodePar = NULL, edgePar = list(), leaflab = c(\"perpendicular\", \"textlike\", \"none\"), horiz = FALSE, ...)",
    "description": "dendrogram（樹形図）を描画するメソッドです。【未対応の理由】グラフィックス（描画）のため",
    "example": "plot.dendrogram(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.dendrogram",
    "category": "モデル",
    "syntax": "print.dendrogram(x, digits = getOption(\"digits\"), ...)",
    "description": "dendrogram オブジェクトをコンパクトに表示するメソッドです。【未対応の理由】dendrogram オブジェクトの表示メソッドのため",
    "example": "print.dendrogram(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rev.dendrogram",
    "category": "モデル",
    "syntax": "rev.dendrogram(x)",
    "description": "dendrogram の各ノードについて子ノードの順序を反転させるメソッドです。【未対応の理由】dendrogram オブジェクトに依存するため",
    "example": "rev.dendrogram(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "str.dendrogram",
    "category": "モデル",
    "syntax": "str.dendrogram(object, max.level = NA, digits.d = 3, give.attr = FALSE, ...)",
    "description": "dendrogram の内部構造を表示するメソッドです。【未対応の理由】dendrogram オブジェクトの表示メソッドのため",
    "example": "str.dendrogram(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[[.dendrogram",
    "category": "モデル",
    "syntax": "[[.dendrogram(x, ..., drop = TRUE)",
    "description": "dendrogram の部分木を取り出すブラケット（[[）メソッドです。【未対応の理由】dendrogram オブジェクトに依存する S3 ブラケットメソッドのため",
    "example": "x[[1]]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.dist",
    "category": "行列・配列",
    "syntax": "as.dist(m, diag = FALSE, upper = FALSE)",
    "description": "行列などを dist オブジェクト（距離行列）へ変換します。【未対応の理由】dist オブジェクト（クラスと属性を持つ下三角形式）を返すため",
    "example": "as.dist(m)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.matrix.dist",
    "category": "行列・配列",
    "syntax": "as.matrix.dist(x, ...)",
    "description": "dist オブジェクトを通常の行列へ戻すメソッドです。【未対応の理由】dist オブジェクトと行列のどちらも値モデルで表せないため",
    "example": "as.matrix.dist(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dist",
    "category": "行列・配列",
    "syntax": "dist(x, method = \"euclidean\", diag = FALSE, upper = FALSE, p = 2)",
    "description": "データの行間の距離（euclidean／maximum／manhattan／canberra／binary／minkowski）を計算し、dist オブジェクトで返します。【未対応の理由】dist オブジェクト（クラスと属性を持つ下三角形式）を返すため",
    "example": "dist(x)",
    "caution": "method の既定は \"euclidean\" です。",
    "status": "unsupported"
  },
  {
    "name": "format.dist",
    "category": "行列・配列",
    "syntax": "format.dist(x, ...)",
    "description": "dist オブジェクトを表示用に整形するメソッドです。【未対応の理由】dist オブジェクトの表示メソッドのため",
    "example": "format.dist(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "labels.dist",
    "category": "行列・配列",
    "syntax": "labels.dist(object, ...)",
    "description": "dist オブジェクトのラベルを取り出すメソッドです。【未対応の理由】dist オブジェクトに依存するため",
    "example": "labels.dist(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.dist",
    "category": "行列・配列",
    "syntax": "print.dist(x, diag = NULL, upper = NULL, digits = getOption(\"digits\"), justify = \"none\", right = TRUE, ...)",
    "description": "dist オブジェクトを行列状に表示するメソッドです。【未対応の理由】dist オブジェクトの表示メソッドのため",
    "example": "print.dist(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "add.scope",
    "category": "モデル",
    "syntax": "add.scope(terms1, terms2)",
    "description": "モデルの項（formula）の階層を保ちながら、基準モデルへ個別に追加できる項のラベルを文字列ベクトルで返します。【未対応の理由】formula／terms オブジェクトに依存するため",
    "example": "add.scope(terms1, terms2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "drop.scope",
    "category": "モデル",
    "syntax": "drop.scope(terms1, terms2)",
    "description": "モデルの項（formula）の階層を保ちながら、基準モデルから個別に削除できる項のラベルを文字列ベクトルで返します。【未対応の理由】formula／terms オブジェクトに依存するため",
    "example": "drop.scope(terms1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "factor.scope",
    "category": "モデル",
    "syntax": "factor.scope(factor, scope)",
    "description": "terms の \"factor\" 属性と scope から、追加・削除できる項を計算します（add.scope／drop.scope の内部処理で、通常は直接呼びません）。【未対応の理由】formula／terms オブジェクトとその属性に依存するため",
    "example": "factor.scope(factor, scope)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "fft",
    "category": "時系列",
    "syntax": "fft(z, inverse = FALSE)",
    "description": "配列の離散フーリエ変換を高速フーリエ変換（FFT）で計算し、複素数で返します。inverse = TRUE のときは正規化しない逆変換を行います。【未対応の理由】複素数ベクトルを値モデルで表せないため",
    "example": "fft(1:4)",
    "caution": "逆変換は長さで割らないため、往復させるには fft(fft(z), inverse = TRUE)/length(z) とします。",
    "status": "unsupported"
  },
  {
    "name": "mvfft",
    "category": "時系列",
    "syntax": "mvfft(z, inverse = FALSE)",
    "description": "行列の各列に離散フーリエ変換（FFT）を適用し、複素数行列で返します。【未対応の理由】複素数行列を値モデルで表せないため",
    "example": "mvfft(z)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "hclust",
    "category": "モデル",
    "syntax": "hclust(d, method = \"complete\", members = NULL)",
    "description": "非類似度（dist）から凝集型の階層クラスタリングを行い、併合過程・高さ・順序などを含むクラス \"hclust\" のオブジェクトを返します。【未対応の理由】dist オブジェクトを入力とし、hclust オブジェクト（クラス付きリスト）を返すため",
    "example": "hclust(d)",
    "caution": "method の既定は \"complete\"（最遠隣法）です。",
    "status": "unsupported"
  },
  {
    "name": "plot.hclust",
    "category": "その他",
    "syntax": "plot.hclust(x, labels = NULL, hang = 0.1, check = TRUE, axes = TRUE, frame.plot = FALSE, ann = TRUE, main = \"Cluster Dendrogram\", sub = NULL, xlab = NULL, ylab = \"Height\", ...)",
    "description": "hclust の樹形図（デンドログラム）を描くメソッドです。【未対応の理由】グラフィックス（描画）のため",
    "example": "plot.hclust(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.hclust",
    "category": "モデル",
    "syntax": "print.hclust(x, ...)",
    "description": "hclust オブジェクトを表示するメソッドです。【未対応の理由】hclust オブジェクトの表示メソッドのため",
    "example": "print.hclust(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "heatmap",
    "category": "その他",
    "syntax": "heatmap(x, Rowv = NULL, Colv = if (symm) \"Rowv\" else NULL, distfun = dist, hclustfun = hclust, scale = c(\"row\", \"column\", \"none\"), symm = FALSE, ...)",
    "description": "行列のヒートマップを、行と列のクラスタリング樹形図とともに描きます。【未対応の理由】グラフィックス（描画）のため、加えて行列と dendrogram に依存するため",
    "example": "heatmap(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "identify.hclust",
    "category": "その他",
    "syntax": "identify.hclust(x, FUN = NULL, N = 20, MAXCLUSTER = 20, DEV.FUN = NULL, ...)",
    "description": "描画済みの樹形図上で、対話的にクラスタを指し示して特定するメソッドです。【未対応の理由】対話的なグラフィックス操作のため",
    "example": "identify.hclust(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "interaction.plot",
    "category": "その他",
    "syntax": "interaction.plot(x.factor, trace.factor, response, fun = mean, type = c(\"l\", \"p\", \"b\", \"o\", \"c\"), legend = TRUE, ...)",
    "description": "2要因の交互作用図（各セルの response の要約を折れ線などで描いた図）を描きます。【未対応の理由】グラフィックス（描画）のため",
    "example": "interaction.plot(x.factor, trace.factor, response)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "fitted.kmeans",
    "category": "モデル",
    "syntax": "fitted.kmeans(object, method = c(\"centers\", \"classes\"), ...)",
    "description": "kmeans の結果から適合値（各観測のクラスタ中心、または所属クラス）を返すメソッドです。【未対応の理由】kmeans オブジェクトに依存するため",
    "example": "fitted.kmeans(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "kmeans",
    "category": "モデル",
    "syntax": "kmeans(x, centers, iter.max = 10, nstart = 1, algorithm = c(\"Hartigan-Wong\", \"Lloyd\", \"Forgy\", \"MacQueen\"), trace = FALSE)",
    "description": "K平均法によるクラスタリングを行い、クラスタ中心・所属・クラスタ内平方和などを含むリストを返します。【未対応の理由】リスト形式のモデル結果を返し、初期中心の乱数選択に依存するため",
    "example": "kmeans(x, centers = 3)",
    "caution": "初期中心は乱数で選ばれるため、結果は実行ごとに変わることがあります。",
    "status": "unsupported"
  },
  {
    "name": "print.kmeans",
    "category": "モデル",
    "syntax": "print.kmeans(x, ...)",
    "description": "kmeans オブジェクトを表示するメソッドです。【未対応の理由】kmeans オブジェクトの表示メソッドのため",
    "example": "print.kmeans(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "listof",
    "category": "モデル",
    "syntax": "listof",
    "description": "モデル適合（またはその一部）のリストに付けて、表示などのメソッドの振る舞いを制御するためのクラス \"listof\" の文書見出しです。【未対応の理由】クラス名であり、呼び出せる関数ではないため",
    "example": "listof",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "loadings",
    "category": "モデル",
    "syntax": "loadings(x, ...)",
    "description": "factanal の結果から負荷量（クラス \"loadings\"）を取り出す総称関数です。【未対応の理由】factanal のモデルオブジェクトと loadings クラスに依存するため",
    "example": "loadings(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.loadings",
    "category": "モデル",
    "syntax": "print.loadings(x, digits = 3, cutoff = 0.1, sort = FALSE, ...)",
    "description": "負荷量（loadings）を、絶対値が cutoff 未満の要素を空白にして表示するメソッドです。【未対応の理由】loadings クラスの表示メソッドのため",
    "example": "print.loadings(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "loglin",
    "category": "モデル",
    "syntax": "loglin(table, margin, start = rep(1, length(table)), fit = FALSE, eps = 0.1, iter = 20, param = FALSE, print = TRUE)",
    "description": "分割表に対数線形モデルを反復比例適合で当てはめ、適合値・残差・偏差などを含むリストを返します。【未対応の理由】表（配列）を入力とし、リスト形式のモデル結果を返すため",
    "example": "loglin(table, margin)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "mahalanobis",
    "category": "集計",
    "syntax": "mahalanobis(x, center, cov, inverted = FALSE, ...)",
    "description": "x の各行（ベクトル x は1行の観測として扱います）について、中心 center と共分散行列 cov に対するマハラノビス距離の2乗 (x - μ)' Σ^(-1) (x - μ) を返します。",
    "example": "mahalanobis(c(0, 0), c(1, 2), data.frame(a = c(1, 0), b = c(0, 1)))",
    "caution": "値モデルには行列が無いため、複数行の x と cov はデータフレームで表す形だけに対応します（実 R でも data.frame の cov は solve が受け付けます）。center = FALSE でセンタリングを省略します。特異な cov は実 R どおりエラーになります。",
    "status": "supported"
  },
  {
    "name": "medpolish",
    "category": "モデル",
    "syntax": "medpolish(x, eps = 0.01, maxiter = 10, trace.iter = TRUE, na.rm = FALSE)",
    "description": "行列に中央値ポリッシュ（頑健な二元表の加法分解）を適用し、全体効果・行効果・列効果・残差を含むリストを返します。【未対応の理由】行列を入力とし、リスト形式の結果を返すため",
    "example": "medpolish(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nextn",
    "category": "数学",
    "syntax": "nextn(n, factors = c(2, 3, 5))",
    "description": "n 以上で、factors の要素の冪の積として表せる最小の整数を返します。FFT が速くなる長さを求めるためなどに使われます。",
    "example": "nextn(1001)",
    "caution": "n は整数へ切り捨ててから探索します。factors が互いに素でない場合、結果が最小にならないことがあります（実 R の既知の挙動どおりです）。",
    "status": "supported"
  },
  {
    "name": "labels.dendrogram",
    "category": "モデル",
    "syntax": "labels.dendrogram(object, ...)",
    "description": "dendrogram の葉のラベルを返すメソッドです。【未対応の理由】dendrogram オブジェクトに依存するため",
    "example": "labels.dendrogram(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "order.dendrogram",
    "category": "モデル",
    "syntax": "order.dendrogram(x)",
    "description": "dendrogram の葉の順序（各葉が元の何番目の観測か）を返すメソッドです。【未対応の理由】dendrogram オブジェクトに依存するため",
    "example": "order.dendrogram(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.lm",
    "category": "その他",
    "syntax": "plot.lm(x, which = c(1, 2, 3, 5), ...)",
    "description": "線形モデル（lm）の診断プロット（残差図・正規 Q-Q 図など）を描くメソッドです。【未対応の理由】グラフィックス（描画）のため、加えて lm オブジェクトに依存するため",
    "example": "plot.lm(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.ppr",
    "category": "その他",
    "syntax": "plot.ppr(x, ask, type = \"o\", ...)",
    "description": "射影追跡回帰（ppr）のリッジ関数を描くメソッドです。【未対応の理由】グラフィックス（描画）のため、加えて ppr オブジェクトに依存するため",
    "example": "plot.ppr(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.spec",
    "category": "その他",
    "syntax": "plot.spec(x, add = FALSE, ci = 0.95, log = c(\"yes\", \"dB\", \"no\"), plot.type = c(\"marginal\", \"coherency\", \"phase\"), ...)",
    "description": "スペクトル密度（クラス \"spec\" のオブジェクト）を描くメソッドです。【未対応の理由】グラフィックス（描画）のため、加えて spec オブジェクトに依存するため",
    "example": "plot.spec(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.spec.coherency",
    "category": "その他",
    "syntax": "plot.spec.coherency(x, ci = 0.95, xlab = \"frequency\", ylab = \"squared coherency\", ...)",
    "description": "2系列間の二乗コヒーレンシーを描くメソッドです。【未対応の理由】グラフィックス（描画）のため、加えて spec オブジェクトに依存するため",
    "example": "plot.spec.coherency(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ppoints",
    "category": "集計",
    "syntax": "ppoints(n, a = if (n <= 10) 3/8 else 1/2)",
    "description": "確率プロット用の順序位置 (i - a)/(n + 1 - 2a)（i = 1, …, n）を返します。n が長さ2以上のベクトルのときは、その長さが個数 n になります。",
    "example": "ppoints(4)",
    "caution": "a の既定は、個数が10以下なら 3/8、それより大きければ 1/2 です。qqnorm／qqplot が内部で使います。",
    "status": "supported"
  },
  {
    "name": "ppr",
    "category": "モデル",
    "syntax": "ppr(x, ...)",
    "description": "射影追跡回帰（projection pursuit regression）を行い、クラス \"ppr\" のモデルオブジェクトを返します。【未対応の理由】モデルオブジェクト（クラス付きリスト）を返すため",
    "example": "ppr(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.prcomp",
    "category": "その他",
    "syntax": "plot.prcomp(x, main = deparse1(substitute(x)), ...)",
    "description": "主成分分析（prcomp）のスクリープロット（各主成分の分散の棒グラフ）を描くメソッドです。【未対応の理由】グラフィックス（描画）のため",
    "example": "plot.prcomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "prcomp",
    "category": "モデル",
    "syntax": "prcomp(x, retx = TRUE, center = TRUE, scale. = FALSE, tol = NULL, rank. = NULL, ...)",
    "description": "特異値分解による主成分分析を行い、標準偏差・回転行列・スコアなどを含むクラス \"prcomp\" のリストを返します。【未対応の理由】モデルオブジェクト（クラス付きリスト）と行列を返すため",
    "example": "prcomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.prcomp",
    "category": "モデル",
    "syntax": "predict.prcomp(object, newdata, ...)",
    "description": "prcomp の回転を使って、新しいデータの主成分スコアを計算するメソッドです。【未対応の理由】prcomp オブジェクトと行列演算に依存するため",
    "example": "predict.prcomp(object, newdata)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.prcomp",
    "category": "モデル",
    "syntax": "print.prcomp(x, print.x = FALSE, ...)",
    "description": "prcomp オブジェクト（標準偏差と分散の説明率）を表示するメソッドです。【未対応の理由】prcomp オブジェクトの表示メソッドのため",
    "example": "print.prcomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.summary.prcomp",
    "category": "モデル",
    "syntax": "print.summary.prcomp(x, digits = max(3, getOption(\"digits\") - 3), ...)",
    "description": "prcomp の要約オブジェクトを表示するメソッドです。【未対応の理由】prcomp の要約オブジェクトの表示メソッドのため",
    "example": "print.summary.prcomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.prcomp",
    "category": "モデル",
    "syntax": "summary.prcomp(object, ...)",
    "description": "prcomp の要約（各主成分の重要度）を作るメソッドです。【未対応の理由】prcomp オブジェクトに依存するため",
    "example": "summary.prcomp(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "preplot",
    "category": "モデル",
    "syntax": "preplot(object, ...)",
    "description": "適合済みモデルオブジェクトから、描画のための前計算オブジェクトを作る総称関数です。【未対応の理由】モデルオブジェクトと描画用オブジェクトに依存する S3 総称関数のため",
    "example": "preplot(object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.princomp",
    "category": "その他",
    "syntax": "plot.princomp(x, main = deparse1(substitute(x)), ...)",
    "description": "主成分分析（princomp）のスクリープロットを描くメソッドです。【未対応の理由】グラフィックス（描画）のため",
    "example": "plot.princomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.princomp",
    "category": "モデル",
    "syntax": "predict.princomp(object, newdata, ...)",
    "description": "princomp を使って、新しいデータの主成分スコアを計算するメソッドです。【未対応の理由】princomp オブジェクトと行列演算に依存するため",
    "example": "predict.princomp(object, newdata)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "princomp",
    "category": "モデル",
    "syntax": "princomp(x, cor = FALSE, scores = TRUE, covmat = NULL, ...)",
    "description": "共分散行列の固有値分解による主成分分析を行い、クラス \"princomp\" のリストを返します。【未対応の理由】モデルオブジェクト（クラス付きリスト）と行列を返すため",
    "example": "princomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.princomp",
    "category": "モデル",
    "syntax": "print.princomp(x, ...)",
    "description": "princomp オブジェクトを表示するメソッドです。【未対応の理由】princomp オブジェクトの表示メソッドのため",
    "example": "print.princomp(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.ts",
    "category": "時系列",
    "syntax": "print.ts(x, calendar, ...)",
    "description": "時系列（クラス \"ts\"）オブジェクトを表示するメソッドです。【未対応の理由】ts クラスオブジェクトを値モデルで表せないため",
    "example": "print.ts(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".preformat.ts",
    "category": "時系列",
    "syntax": ".preformat.ts(x, calendar, ...)",
    "description": "ts オブジェクトの表示用整形を行う内部関数（メソッド）です。【未対応の理由】ts クラスオブジェクトの表示整形に依存するため",
    "example": ".preformat.ts(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "qqline",
    "category": "その他",
    "syntax": "qqline(y, datax = FALSE, distribution = qnorm, probs = c(0.25, 0.75), qtype = 7, ...)",
    "description": "Q-Q プロットに、第1・第3四分位点を通る基準線を描き加えます。【未対応の理由】グラフィックス（描画）のため",
    "example": "qqline(y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "qqnorm",
    "category": "その他",
    "syntax": "qqnorm(y, ...)",
    "description": "正規 Q-Q プロット（標本分位点と正規分布の理論分位点の散布図）を描く総称関数です。【未対応の理由】グラフィックス（描画）のため",
    "example": "qqnorm(y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "qqplot",
    "category": "その他",
    "syntax": "qqplot(x, y, plot.it = TRUE, ...)",
    "description": "2つの標本（または標本と分布）の分位点を比べる Q-Q プロットを描きます。【未対応の理由】グラフィックス（描画）のため",
    "example": "qqplot(x, y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rect.hclust",
    "category": "その他",
    "syntax": "rect.hclust(tree, k = NULL, which = NULL, x = NULL, h = NULL, border = 2, cluster = NULL)",
    "description": "描画済みの樹形図上で、クラスタの周りに矩形を描きます。【未対応の理由】グラフィックス（描画）のため",
    "example": "rect.hclust(tree, k = 2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "reorder.dendrogram",
    "category": "モデル",
    "syntax": "reorder.dendrogram(x, wts, agglo.FUN = sum, ...)",
    "description": "重み wts に基づいて dendrogram の葉の順序を並べ替えるメソッドです。【未対応の理由】dendrogram オブジェクトに依存するため",
    "example": "reorder.dendrogram(x, wts)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "screeplot",
    "category": "その他",
    "syntax": "screeplot(x, ...)",
    "description": "主成分分析などのスクリープロット（分散・固有値の棒グラフや折れ線）を描く総称関数です。【未対応の理由】グラフィックス（描画）のため",
    "example": "screeplot(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sortedXyData",
    "category": "データフレーム",
    "syntax": "sortedXyData(x, y, data)",
    "description": "x の昇順に並べ替え、同じ x の値に対する y を平均した2列（x と y）のデータフレームを作ります。NA を含む行は除かれます。自己開始型の非線形回帰モデルの初期値計算に使われます。",
    "example": "sortedXyData(c(2, 1, 2), c(4, 3, 5))",
    "caution": "実 R の結果はクラス \"sortedXyData\" を持ちますが、このモデルでは通常のデータフレームとして返します。式（expression）で x／y を与え data で評価する形式は未対応です。",
    "status": "supported"
  },
  {
    "name": "stats-deprecated",
    "category": "パッケージ",
    "syntax": "stats-deprecated",
    "description": "stats パッケージの非推奨（deprecated）関数の文書見出しです（現在のところ、非推奨の関数はありません）。【未対応の理由】文書見出しであり、呼び出せる関数ではないため",
    "example": "stats-deprecated",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stats-package",
    "category": "パッケージ",
    "syntax": "stats-package",
    "description": "stats パッケージ全体（R 標準の統計パッケージ）の説明の文書見出しです。【未対応の理由】文書見出しであり、呼び出せる関数ではないため",
    "example": "stats-package",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stats",
    "category": "パッケージ",
    "syntax": "stats",
    "description": "stats パッケージを指す別名の文書見出しです。【未対応の理由】パッケージ名であり、呼び出せる関数ではないため",
    "example": "stats",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "symnum",
    "category": "文字列",
    "syntax": "symnum(x, cutpoints = c(0.3, 0.6, 0.8, 0.9, 0.95), symbols = if (numeric.x) c(\" \", \".\", \",\", \"+\", \"*\", \"B\") else c(\".\", \"|\"), legend = length(symbols) >= 3, na = \"?\", eps = 1e-5, numeric.x = is.numeric(x), corr = missing(cutpoints) && numeric.x, show.max = if (corr) \"1\", show.min = NULL, abbr.colnames = has.colnames, lower.triangular = corr && is.numeric(x) && is.matrix(x), diag.lower.tri = corr && !is.null(show.max))",
    "description": "数値（または論理値）ベクトルを、区間ごとの記号（1文字の文字列）に符号化します。相関行列や p 値などの構造の可視化に使われます。",
    "example": "symnum(c(0.1, 0.5, 0.99))",
    "caution": "実 R の結果はクラス \"noquote\" と \"legend\" 属性を持ち引用符なしで表示されますが、このモデルでは通常の文字列ベクトルとして返します（表示では引用符が付きます）。行列・配列への適用（列名の略記や下三角表示）は未対応です。",
    "status": "supported"
  },
  {
    "name": "toeplitz",
    "category": "行列・配列",
    "syntax": "toeplitz(x, r = NULL, symmetric = is.null(r))",
    "description": "第1列 x（非対称の場合は第1行 r も）から、対角線方向に一定の Toeplitz 行列を作ります。【未対応の理由】行列オブジェクトを値モデルで表せないため",
    "example": "toeplitz(1:5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "toeplitz2",
    "category": "行列・配列",
    "syntax": "toeplitz2(x, nrow = length(x) + 1 - ncol, ncol = length(x) + 1 - nrow)",
    "description": "右上から左下への境界ベクトル x から、T[i, j] = x[i - j + ncol] を満たす Toeplitz 行列（非対称・非正方も可）を作ります。【未対応の理由】行列オブジェクトを値モデルで表せないため",
    "example": "toeplitz2(x, nrow, ncol)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "promax",
    "category": "モデル",
    "syntax": "promax(x, m = 4)",
    "description": "因子負荷量に promax（斜交）回転を適用し、回転後の負荷量などを含むリストを返します。【未対応の理由】負荷量（loadings）オブジェクトを扱い、リストを返すため",
    "example": "promax(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "varimax",
    "category": "モデル",
    "syntax": "varimax(x, normalize = TRUE, eps = 1e-5)",
    "description": "因子負荷量に varimax（直交）回転を適用し、回転後の負荷量と回転行列を含むリストを返します。【未対応の理由】負荷量（loadings）オブジェクトを扱い、リストと行列を返すため",
    "example": "varimax(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "C",
    "category": "モデル",
    "syntax": "C(object, contr, how.many, ...)",
    "description": "因子（factor）の \"contrasts\" 属性（対比）を設定し、その因子を返します。【未対応の理由】因子オブジェクトと属性・対比行列に依存し、値モデルで忠実に再現できないため",
    "example": "C(object, contr)",
    "caution": "",
    "status": "unsupported"
  }
];
