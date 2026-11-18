/* 高度モード B7 G1：statistics モジュールのリファレンス差分（35件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。 */
export const referenceAdvanced = [
 {
  "name": "statistics.NormalDist",
  "category": "標準ライブラリ",
  "syntax": "class statistics.NormalDist(mu=0.0, sigma=1.0)",
  "description": "正規分布を表すクラス。mu が平均、sigma が標準偏差。",
  "example": "import statistics\nprint(statistics.NormalDist(2.4, 1.6))",
  "caution": "sigma が負の場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist"
 },
 {
  "name": "statistics.NormalDist.cdf",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.cdf(x)",
  "description": "累積分布関数 P(X <= x) を返す。",
  "example": "import statistics\nprint(round(statistics.NormalDist(2.4, 1.6).cdf(3.0), 12))",
  "caution": "erf の近似評価のため、CPython と最終桁が 1ulp ずれる場合がある。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.cdf"
 },
 {
  "name": "statistics.NormalDist.from_samples",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.from_samples(data)",
  "description": "標本データの平均と標本標準偏差から NormalDist を作るクラスメソッド。",
  "example": "import statistics\nnd = statistics.NormalDist.from_samples([2, 4, 4, 4, 5, 5, 7, 9])\nprint(nd.mean, nd.stdev)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.from_samples"
 },
 {
  "name": "statistics.NormalDist.inv_cdf",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.inv_cdf(p)",
  "description": "逆累積分布関数。P(X <= x) = p となる x を返す。",
  "example": "import statistics\nprint(statistics.NormalDist(10, 2).inv_cdf(0.975))",
  "caution": "p は 0.0 < p < 1.0 でなければ StatisticsError。Wichura AS241 の近似を使う（CPython と同じ）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.inv_cdf"
 },
 {
  "name": "statistics.NormalDist.mean",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.mean",
  "description": "平均 mu（property）。",
  "example": "import statistics\nprint(statistics.NormalDist(2.4, 1.6).mean)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.mean"
 },
 {
  "name": "statistics.NormalDist.median",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.median",
  "description": "中央値（= mu、property）。",
  "example": "import statistics\nprint(statistics.NormalDist(2.4, 1.6).median)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.median"
 },
 {
  "name": "statistics.NormalDist.mode",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.mode",
  "description": "最頻値（= mu、property）。",
  "example": "import statistics\nprint(statistics.NormalDist(2.4, 1.6).mode)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.mode"
 },
 {
  "name": "statistics.NormalDist.overlap",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.overlap(other)",
  "description": "2つの正規分布の重なり係数（0.0〜1.0）を返す。",
  "example": "import statistics\nprint(round(statistics.NormalDist(2.4, 1.6).overlap(statistics.NormalDist(3.2, 2.0)), 12))",
  "caution": "erf の近似評価のため、CPython と最終桁が 1ulp ずれる場合がある（実測：0.8035050657330205 に対し末尾1桁差）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.overlap"
 },
 {
  "name": "statistics.NormalDist.pdf",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.pdf(x)",
  "description": "確率密度関数の値 P(x <= X < x+dx) / dx を返す。",
  "example": "import statistics\nprint(statistics.NormalDist().pdf(0))",
  "caution": "sigma が 0 の場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.pdf"
 },
 {
  "name": "statistics.NormalDist.quantiles",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.quantiles(n=4)",
  "description": "等確率の区間に分ける n-1 個の分位点のリストを返す。",
  "example": "import statistics\nprint(statistics.NormalDist(5, 2).quantiles(4))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.quantiles"
 },
 {
  "name": "statistics.NormalDist.samples",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.samples(n, *, seed=None)",
  "description": "分布から n 個の標本を生成したリストを返す。",
  "example": "import statistics\nprint(statistics.NormalDist(0, 1).samples(3, seed=42))",
  "caution": "seed を省略するとグローバルな乱数を使うため値は確定しない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.samples"
 },
 {
  "name": "statistics.NormalDist.stdev",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.stdev",
  "description": "標準偏差 sigma（property）。",
  "example": "import statistics\nprint(statistics.NormalDist(2.4, 1.6).stdev)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.stdev"
 },
 {
  "name": "statistics.NormalDist.variance",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.variance",
  "description": "分散 sigma の2乗（property）。",
  "example": "import statistics\nprint(statistics.NormalDist(2.4, 1.6).variance)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.variance"
 },
 {
  "name": "statistics.NormalDist.zscore",
  "category": "標準ライブラリ",
  "syntax": "NormalDist.zscore(x)",
  "description": "標準スコア (x - mean) / stdev を返す。",
  "example": "import statistics\nprint(statistics.NormalDist(10, 2).zscore(14))",
  "caution": "sigma が 0 の場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.NormalDist.zscore"
 },
 {
  "name": "statistics.StatisticsError",
  "category": "標準ライブラリ",
  "syntax": "class statistics.StatisticsError",
  "description": "統計計算のエラーを表す例外。ValueError のサブクラス。",
  "example": "import statistics\ntry:\n    statistics.mean([])\nexcept statistics.StatisticsError:\n    print('caught')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.StatisticsError"
 },
 {
  "name": "statistics.correlation",
  "category": "標準ライブラリ",
  "syntax": "statistics.correlation(x, y, *, method='linear')",
  "description": "ピアソン（method='ranked' ではスピアマン）の相関係数を返す。",
  "example": "import statistics\nprint(statistics.correlation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]))",
  "caution": "どちらかの入力が定数だと StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.correlation"
 },
 {
  "name": "statistics.covariance",
  "category": "標準ライブラリ",
  "syntax": "statistics.covariance(x, y)",
  "description": "2入力の標本共分散を返す。",
  "example": "import statistics\nprint(statistics.covariance([1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 1, 2, 3, 1, 2, 3]))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.covariance"
 },
 {
  "name": "statistics.fmean",
  "category": "標準ライブラリ",
  "syntax": "statistics.fmean(data, weights=None)",
  "description": "データを float に変換して算術平均を返す。常に float。",
  "example": "import statistics\nprint(statistics.fmean([3.5, 4.0, 5.25]))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.fmean"
 },
 {
  "name": "statistics.geometric_mean",
  "category": "標準ライブラリ",
  "syntax": "statistics.geometric_mean(data)",
  "description": "幾何平均を float で返す。",
  "example": "import statistics\nprint(statistics.geometric_mean([54, 24, 36]))",
  "caution": "空・0・負の値を含む場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.geometric_mean"
 },
 {
  "name": "statistics.harmonic_mean",
  "category": "標準ライブラリ",
  "syntax": "statistics.harmonic_mean(data, weights=None)",
  "description": "調和平均を返す。いずれかの値が 0 の場合は 0。",
  "example": "import statistics\nprint(statistics.harmonic_mean([40, 60]))",
  "caution": "負の値を含む場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.harmonic_mean"
 },
 {
  "name": "statistics.kde",
  "category": "標準ライブラリ",
  "syntax": "statistics.kde(data, h, kernel='normal', *, cumulative=False)",
  "description": "カーネル密度推定で確率密度関数（cumulative=True では累積分布関数）を返す（Python 3.13 で追加）。",
  "example": "import statistics\nf = statistics.kde([-2.1, -1.3, -0.4, 1.9, 5.1, 6.2], h=1.5)\nprint(round(f(0), 3))",
  "caution": "ローカルの CPython 3.12 には無いため、CPython 公式リポジトリの 3.13 ソースと公式ドキュメントの例で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.kde"
 },
 {
  "name": "statistics.kde_random",
  "category": "標準ライブラリ",
  "syntax": "statistics.kde_random(data, h, kernel='normal', *, seed=None)",
  "description": "kde の推定密度に従ってランダムな値を選ぶ関数を返す（Python 3.13 で追加）。",
  "example": "import statistics\nrand = statistics.kde_random([-2.1, -1.3, -0.4, 1.9, 5.1, 6.2], h=1.5, seed=8675309)\nprint(round(rand(), 1))",
  "caution": "ローカルの CPython 3.12 には無いため、CPython 公式リポジトリの 3.13 ソースと公式ドキュメントの例（10個の丸め列）で照合した。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.kde_random"
 },
 {
  "name": "statistics.linear_regression",
  "category": "標準ライブラリ",
  "syntax": "statistics.linear_regression(x, y, *, proportional=False)",
  "description": "単回帰の傾きと切片を LinearRegression(slope, intercept) で返す。",
  "example": "import statistics\nprint(statistics.linear_regression([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]))",
  "caution": "x が定数だと StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.linear_regression"
 },
 {
  "name": "statistics.mean",
  "category": "標準ライブラリ",
  "syntax": "statistics.mean(data)",
  "description": "算術平均。Fraction のデータでは Fraction を返す等、入力の型に応じた結果になる。",
  "example": "import statistics\nprint(statistics.mean([1, 2, 3, 4, 4]))",
  "caution": "空の場合は StatisticsError。内部では正確な有理数演算で合計するため、float の単純合計とは結果が異なる場合がある。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.mean"
 },
 {
  "name": "statistics.median",
  "category": "標準ライブラリ",
  "syntax": "statistics.median(data)",
  "description": "中央値。偶数個では中央2値の平均。",
  "example": "import statistics\nprint(statistics.median([1, 3, 5, 7]))",
  "caution": "空の場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.median"
 },
 {
  "name": "statistics.median_grouped",
  "category": "標準ライブラリ",
  "syntax": "statistics.median_grouped(data, interval=1.0)",
  "description": "階級にまとめられたデータの中央値を補間で推定する。",
  "example": "import statistics\nprint(statistics.median_grouped([2, 2, 3, 3, 3, 4]))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.median_grouped"
 },
 {
  "name": "statistics.median_high",
  "category": "標準ライブラリ",
  "syntax": "statistics.median_high(data)",
  "description": "大きい方の中央値（必ずデータに含まれる値）。",
  "example": "import statistics\nprint(statistics.median_high([1, 3, 5, 7]))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.median_high"
 },
 {
  "name": "statistics.median_low",
  "category": "標準ライブラリ",
  "syntax": "statistics.median_low(data)",
  "description": "小さい方の中央値（必ずデータに含まれる値）。",
  "example": "import statistics\nprint(statistics.median_low([1, 3, 5, 7]))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.median_low"
 },
 {
  "name": "statistics.mode",
  "category": "標準ライブラリ",
  "syntax": "statistics.mode(data)",
  "description": "最頻値。複数ある場合は最初に現れたものを返す。文字列など名義データにも使える。",
  "example": "import statistics\nprint(statistics.mode(['red', 'blue', 'blue', 'red', 'green', 'red', 'red']))",
  "caution": "空の場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.mode"
 },
 {
  "name": "statistics.multimode",
  "category": "標準ライブラリ",
  "syntax": "statistics.multimode(data)",
  "description": "最頻値のリストを、最初に現れた順で返す。",
  "example": "import statistics\nprint(statistics.multimode('aabbbbccddddeeffffgg'))",
  "caution": "空の場合は空のリスト。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.multimode"
 },
 {
  "name": "statistics.pstdev",
  "category": "標準ライブラリ",
  "syntax": "statistics.pstdev(data, mu=None)",
  "description": "母標準偏差（母分散の平方根）。",
  "example": "import statistics\nprint(statistics.pstdev([1.5, 2.5, 2.5, 2.75, 3.25, 4.75]))",
  "caution": "平方根は有理数から正しく丸めて計算する（CPython の _float_sqrt_of_frac と同じ方式）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.pstdev"
 },
 {
  "name": "statistics.pvariance",
  "category": "標準ライブラリ",
  "syntax": "statistics.pvariance(data, mu=None)",
  "description": "母分散。Fraction のデータでは Fraction を返す。",
  "example": "import statistics\nprint(statistics.pvariance([0.0, 0.25, 0.25, 1.25, 1.5, 1.75, 2.75, 3.25]))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.pvariance"
 },
 {
  "name": "statistics.quantiles",
  "category": "標準ライブラリ",
  "syntax": "statistics.quantiles(data, *, n=4, method='exclusive')",
  "description": "データを等確率の n 区間に分ける n-1 個の分位点のリストを返す。",
  "example": "import statistics\nprint(statistics.quantiles([1, 2, 3, 4, 5]))",
  "caution": "データが2点未満の場合は StatisticsError（CPython 3.12 の挙動。3.13 以降は1点で複製を返す変更がある）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.quantiles"
 },
 {
  "name": "statistics.stdev",
  "category": "標準ライブラリ",
  "syntax": "statistics.stdev(data, xbar=None)",
  "description": "標本標準偏差（標本分散の平方根）。",
  "example": "import statistics\nprint(statistics.stdev([1.5, 2.5, 2.5, 2.75, 3.25, 4.75]))",
  "caution": "平方根は有理数から正しく丸めて計算する（CPython の _float_sqrt_of_frac と同じ方式）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.stdev"
 },
 {
  "name": "statistics.variance",
  "category": "標準ライブラリ",
  "syntax": "statistics.variance(data, xbar=None)",
  "description": "標本分散。Fraction のデータでは Fraction を返す。",
  "example": "import statistics\nprint(statistics.variance([2.75, 1.75, 1.25, 0.25, 0.5, 1.25, 3.5]))",
  "caution": "データが2点未満の場合は StatisticsError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/statistics.html#statistics.variance"
 }
];
