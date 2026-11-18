// 高度モード B4S：R 高度リファレンス項目 part7（stats 時系列・平滑化 sts 班）。
// 項目形式は B4 最終形の確定契約（BRIEF 第4章）：追加フィールドは付けず、
// 未対応の理由は description に明記する。裁定の根拠は docs/audit/ADV-B4S-sts.md。
export const referenceAdvanced = [
  {
    "name": "ARMAacf",
    "category": "時系列",
    "syntax": "ARMAacf(ar = numeric(), ma = numeric(), lag.max = r, pacf = FALSE)",
    "description": "ARMA 過程の理論自己相関（pacf = TRUE のとき理論偏自己相関）を計算します。lag.max の既定値は max(length(ar), length(ma) + 1) です。",
    "example": "ARMAacf(ar = 0.8, lag.max = 4)",
    "caution": "結果にはラグ 0..lag.max の名前が付きます。MA のみのモデルでは lag.max が MA 次数より小さい場合でも次数まで値が返る実 R の癖を再現しています。係数に NA がある場合は実 R どおり欠損が伝播するか、filter の文言で停止します。",
    "status": "supported"
  },
  {
    "name": "ARMAtoMA",
    "category": "時系列",
    "syntax": "ARMAtoMA(ar = numeric(), ma = numeric(), lag.max)",
    "description": "ARMA 過程を無限 MA 表現に変換し、ψ 重みを lag.max 個返します。",
    "example": "ARMAtoMA(ar = 0.5, ma = 0.3, lag.max = 5)",
    "caution": "lag.max は必須引数です。",
    "status": "supported"
  },
  {
    "name": "HoltWinters",
    "category": "時系列",
    "syntax": "HoltWinters(x, alpha = NULL, beta = NULL, gamma = NULL, seasonal = c(\"additive\", \"multiplicative\"), start.periods = 2, l.start = NULL, b.start = NULL, s.start = NULL, optim.start = c(alpha = 0.3, beta = 0.1, gamma = 0.1), optim.control = list())",
    "description": "時系列に Holt-Winters 指数平滑法を適合し、クラス HoltWinters の適合オブジェクトを返します。【未対応の理由】ts クラス（tsp 属性）と適合オブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "HoltWinters(ldeaths)",
    "caution": "平滑化パラメータは optim による最適化で決まります。",
    "status": "unsupported"
  },
  {
    "name": "print.HoltWinters",
    "category": "時系列",
    "syntax": "print.HoltWinters(x,...)",
    "description": "HoltWinters 適合オブジェクトを表示する S3 メソッドです。【未対応の理由】HoltWinters オブジェクト自体が未対応であり、その表示メソッドも対象を持たないため",
    "example": "print(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "residuals.HoltWinters",
    "category": "時系列",
    "syntax": "residuals.HoltWinters(object,...)",
    "description": "HoltWinters 適合オブジェクトから残差（ts）を抽出する S3 メソッドです。【未対応の理由】HoltWinters オブジェクトと ts クラスを前提とし、値モデルで表せないため",
    "example": "residuals(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "KalmanForecast",
    "category": "時系列",
    "syntax": "KalmanForecast(n.ahead = 10L, mod, update = FALSE)",
    "description": "状態空間モデル（makeARIMA 等で作る mod リスト）に対してカルマンフィルタの予測を行い、予測値と状態のリストを返します。【未対応の理由】状態空間モデルのリスト表現と、その内部状態に本質的に依存するため",
    "example": "KalmanForecast(n.ahead = 5, mod = mod)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "KalmanLike",
    "category": "時系列",
    "syntax": "KalmanLike(y, mod, nit = 0L, update = FALSE)",
    "description": "状態空間モデルの対数尤度をカルマンフィルタで計算します。【未対応の理由】状態空間モデルのリスト表現（mod）に本質的に依存し、値モデルで表せないため",
    "example": "KalmanLike(y, mod)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "KalmanRun",
    "category": "時系列",
    "syntax": "KalmanRun(y, mod, nit = 0L, update = FALSE)",
    "description": "カルマンフィルタを実行し、残差と状態のリストを返します。【未対応の理由】状態空間モデルのリスト表現（mod）とリストの戻り値に依存し、値モデルで表せないため",
    "example": "KalmanRun(y, mod)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "KalmanSmooth",
    "category": "時系列",
    "syntax": "KalmanSmooth(y, mod, nit = 0L)",
    "description": "カルマン平滑化を実行し、平滑化された状態のリストを返します。【未対応の理由】状態空間モデルのリスト表現（mod）とリストの戻り値に依存し、値モデルで表せないため",
    "example": "KalmanSmooth(y, mod)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "makeARIMA",
    "category": "時系列",
    "syntax": "makeARIMA(phi, theta, Delta, kappa = 1e+06, SSinit = c(\"Gardner1980\", \"Rossignol2011\"), tol =.Machine$double.eps)",
    "description": "ARIMA モデルを状態空間表現のリスト（KalmanLike 等の引数 mod）に変換します。【未対応の理由】状態空間モデルのリスト表現そのものが戻り値であり、値モデルで表せないため",
    "example": "makeARIMA(phi = 0.5, theta = 0, Delta = 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.StructTS",
    "category": "時系列",
    "syntax": "predict.StructTS(object, n.ahead = 1L, se.fit = TRUE,...)",
    "description": "StructTS 適合オブジェクトから将来値を予測する S3 メソッドです。【未対応の理由】StructTS オブジェクト自体が未対応であり、予測結果も ts クラスで返るため",
    "example": "predict(fit, n.ahead = 5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.StructTS",
    "category": "時系列",
    "syntax": "print.StructTS(x, digits = max(3L, getOption(\"digits\") - 3L),...)",
    "description": "StructTS 適合オブジェクトを表示する S3 メソッドです。【未対応の理由】StructTS オブジェクト自体が未対応であり、その表示メソッドも対象を持たないため",
    "example": "print(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "StructTS",
    "category": "時系列",
    "syntax": "StructTS(x, type = c(\"level\", \"trend\", \"BSM\"), init = NULL, fixed = NULL, optim.control = NULL)",
    "description": "構造型時系列モデル（局所水準・局所線形トレンド・基本構造モデル）を状態空間モデルとして適合します。【未対応の理由】ts クラス（tsp 属性）と適合オブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "StructTS(log10(UKgas), type = \"BSM\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "acf",
    "category": "時系列",
    "syntax": "acf(x, lag.max = NULL, type = c(\"correlation\", \"covariance\", \"partial\"), plot = TRUE, na.action = na.fail, demean = TRUE,...)",
    "description": "自己共分散・自己相関（type = \"partial\" で偏自己相関）を推定し、クラス acf のオブジェクトを返して既定でプロットします。【未対応の理由】戻り値が acf オブジェクト（クラス付きリスト）であり、ts 入力のラグ換算（tsp 属性）にも依存するため。理論 ACF は ARMAacf で計算できます",
    "example": "acf(lh, plot = FALSE)",
    "caution": "plot = TRUE が既定で、グラフィックスを伴います。",
    "status": "unsupported"
  },
  {
    "name": "ccf",
    "category": "時系列",
    "syntax": "ccf(x, y, lag.max = NULL, type = c(\"correlation\", \"covariance\"), plot = TRUE, na.action = na.fail,...)",
    "description": "2 系列間の相互共分散・相互相関を推定し、クラス acf のオブジェクトを返して既定でプロットします。【未対応の理由】戻り値が acf オブジェクト（クラス付きリスト）であり、ts 入力のラグ換算（tsp 属性）にも依存するため",
    "example": "ccf(ldeaths, mdeaths, plot = FALSE)",
    "caution": "plot = TRUE が既定で、グラフィックスを伴います。",
    "status": "unsupported"
  },
  {
    "name": "pacf",
    "category": "時系列",
    "syntax": "pacf(x, lag.max, plot, na.action,...)",
    "description": "偏自己相関を推定し、クラス acf のオブジェクトを返して既定でプロットします。【未対応の理由】戻り値が acf オブジェクト（クラス付きリスト）であり、ts 入力のラグ換算（tsp 属性）にも依存するため。理論 PACF は ARMAacf の pacf = TRUE で計算できます",
    "example": "pacf(lh, plot = FALSE)",
    "caution": "plot = TRUE が既定で、グラフィックスを伴います。",
    "status": "unsupported"
  },
  {
    "name": "[.acf",
    "category": "時系列",
    "syntax": "x[i]",
    "description": "acf オブジェクトの一部を取り出す S3 ブラケットメソッドです。【未対応の理由】acf オブジェクト自体が未対応であるため。なおドットやブラケットを含む名前は共有パーサの識別子規則の対象外でもあります",
    "example": "a[2]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "acf2AR",
    "category": "時系列",
    "syntax": "acf2AR(acf)",
    "description": "与えた自己相関にちょうど一致する AR 過程の係数を計算します。【未対応の理由】戻り値が係数行列（行列型）であり、値モデルに行列型が無いため",
    "example": "acf2AR(acf(lh, plot = FALSE)$acf)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ar",
    "category": "時系列",
    "syntax": "ar(x, aic = TRUE, order.max = NULL, method = c(\"yule-walker\", \"burg\", \"ols\", \"mle\", \"yw\"), na.action = na.fail, series,...)",
    "description": "自己回帰（AR）モデルを適合し、クラス ar の適合オブジェクトを返します。【未対応の理由】適合オブジェクト（クラス付きリスト）を返し、ts 入力では tsp 属性にも依存するため",
    "example": "ar(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ar.burg",
    "category": "時系列",
    "syntax": "ar.burg(x,...)",
    "description": "Burg 法による AR 適合への S3 ジェネリックです。【未対応の理由】ar オブジェクトを返す適合系であり、値モデルで表せないため",
    "example": "ar.burg(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ar.burg.default",
    "category": "時系列",
    "syntax": "ar.burg.default(x, aic = TRUE, order.max = NULL, na.action = na.fail, demean = TRUE, series = NULL, var.method = 1L,...)",
    "description": "Burg 法で AR モデルを適合する ar.burg の既定メソッドです。【未対応の理由】ar オブジェクトを返す適合系であり、値モデルで表せないため",
    "example": "ar.burg(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ar.mle",
    "category": "時系列",
    "syntax": "ar.mle(x, aic = TRUE, order.max = NULL, na.action = na.fail, demean = TRUE, series = NULL,...)",
    "description": "最尤法で AR モデルを適合します。【未対応の理由】ar オブジェクトを返す適合系であり、値モデルで表せないため",
    "example": "ar.mle(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ar.yw",
    "category": "時系列",
    "syntax": "ar.yw(x,...)",
    "description": "Yule-Walker 法による AR 適合への S3 ジェネリックです。【未対応の理由】ar オブジェクトを返す適合系であり、値モデルで表せないため",
    "example": "ar.yw(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ar.yw.default",
    "category": "時系列",
    "syntax": "ar.yw.default(x, aic = TRUE, order.max = NULL, na.action = na.fail, demean = TRUE, series = NULL,...)",
    "description": "Yule-Walker 法で AR モデルを適合する ar.yw の既定メソッドです。【未対応の理由】ar オブジェクトを返す適合系であり、値モデルで表せないため",
    "example": "ar.yw(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.ar",
    "category": "時系列",
    "syntax": "predict.ar(object, newdata, n.ahead = 1L, se.fit = TRUE,...)",
    "description": "ar 適合オブジェクトから将来値を予測する S3 メソッドです。【未対応の理由】ar オブジェクト自体が未対応であり、予測結果も ts クラスで返るため",
    "example": "predict(fit, n.ahead = 5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.ar",
    "category": "時系列",
    "syntax": "print.ar(x, digits = max(3L, getOption(\"digits\") - 3L),...)",
    "description": "ar 適合オブジェクトを表示する S3 メソッドです。【未対応の理由】ar オブジェクト自体が未対応であり、その表示メソッドも対象を持たないため",
    "example": "print(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ar.ols",
    "category": "時系列",
    "syntax": "ar.ols(x, aic = TRUE, order.max = NULL, na.action = na.fail, demean = TRUE, intercept = demean, series = NULL,...)",
    "description": "最小二乗法で AR モデルを適合します。【未対応の理由】ar オブジェクトを返す適合系であり、値モデルで表せないため",
    "example": "ar.ols(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "arima",
    "category": "時系列",
    "syntax": "arima(x, order = c(0L, 0L, 0L), seasonal = list(order = c(0L, 0L, 0L), period = NA), xreg = NULL, include.mean = TRUE, transform.pars = TRUE, fixed = NULL, init = NULL, method = c(\"CSS-ML\", \"ML\", \"CSS\"), n.cond, SSinit = c(\"Gardner1980\", \"Rossignol2011\"), optim.method = \"BFGS\", optim.control = list(), kappa = 1e+06)",
    "description": "ARIMA モデルを最尤法等で適合し、クラス Arima の適合オブジェクトを返します。【未対応の理由】状態空間モデルによる最尤推定と適合オブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "arima(lh, order = c(1, 0, 0))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "arima.sim",
    "category": "時系列",
    "syntax": "arima.sim(model, n, rand.gen = rnorm, innov, n.start = NA, start.innov,...)",
    "description": "ARIMA モデルからランダムな時系列を生成し、ts として返します。【未対応の理由】乱数生成と ts クラス（tsp 属性）の両方に依存し、乱数の列を決定的に再現することもできないため",
    "example": "arima.sim(model = list(ar = 0.8), n = 100)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "arima0",
    "category": "時系列",
    "syntax": "arima0(x, order = c(0, 0, 0), seasonal = list(order = c(0, 0, 0), period = NA), xreg = NULL, include.mean = TRUE, delta = 0.01, transform.pars = TRUE, fixed = NULL, init = NULL, method = c(\"ML\", \"CSS\"), n.cond, optim.control = list())",
    "description": "ARIMA モデルを適合する旧来の実装で、クラス arima0 の適合オブジェクトを返します。【未対応の理由】最尤推定と適合オブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "arima0(lh, order = c(1, 0, 0))",
    "caution": "新しいコードでは arima の使用が推奨されます。",
    "status": "unsupported"
  },
  {
    "name": "predict.arima0",
    "category": "時系列",
    "syntax": "predict.arima0(object, n.ahead = 1L, newxreg = NULL, se.fit = TRUE,...)",
    "description": "arima0 適合オブジェクトから将来値を予測する S3 メソッドです。【未対応の理由】arima0 オブジェクト自体が未対応であり、予測結果も ts クラスで返るため",
    "example": "predict(fit, n.ahead = 5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.arima0",
    "category": "時系列",
    "syntax": "print.arima0(x, digits = max(3L, getOption(\"digits\") - 3L), se = TRUE,...)",
    "description": "arima0 適合オブジェクトを表示する S3 メソッドです。【未対応の理由】arima0 オブジェクト自体が未対応であり、その表示メソッドも対象を持たないため",
    "example": "print(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "approx",
    "category": "数学",
    "syntax": "approx(x, y = NULL, xout, method = \"linear\", n = 50, yleft, yright, rule = 1, f = 0, ties = mean, na.rm = TRUE)",
    "description": "データ点の間を線形（method = \"constant\" で定数）補間し、結果を list(x, y) で返します。【未対応の理由】戻り値がリスト（x と y の組）であり、値モデルにリスト型が無いため",
    "example": "approx(1:3, c(2, 4, 8), xout = 1.5)",
    "caution": "rule で外挿時の扱いが変わります。",
    "status": "unsupported"
  },
  {
    "name": "approxfun",
    "category": "数学",
    "syntax": "approxfun(x, y = NULL, method = \"linear\", yleft, yright, rule = 1, f = 0, ties = mean, na.rm = TRUE)",
    "description": "データ点の間を補間する関数を作成して返します。【未対応の理由】戻り値が関数オブジェクトであり、値モデルに関数値が無いため",
    "example": "f <- approxfun(1:3, c(2, 4, 8))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "bw.bcv",
    "category": "集計",
    "syntax": "bw.bcv(x, nb = 1000L, lower, upper, tol = 0.1 * lower)",
    "description": "カーネル密度推定のバンド幅を偏り交差検証（BCV）で選びます。【未対応の理由】内部のビニング済み密度に対する C 実装（bw_bcv／bw_phi 系）の数式を一次情報で確定できず、最適化の収束先を含む数値を忠実に再現できないため名指しで停止します",
    "example": "bw.bcv(faithful$eruptions)",
    "caution": "bw.nrd0／bw.nrd は対応しています。",
    "status": "unsupported"
  },
  {
    "name": "bw.nrd",
    "category": "集計",
    "syntax": "bw.nrd(x)",
    "description": "カーネル密度推定のバンド幅の経験則 1.06 * min(sd(x), IQR(x)/1.34) * n^(-1/5) を返します（Silverman の経験則）。",
    "example": "bw.nrd(1:10)",
    "caution": "長さ1未満では停止します。NA／NaN を含む場合は実 R の文言で停止します。",
    "status": "supported"
  },
  {
    "name": "bw.nrd0",
    "category": "集計",
    "syntax": "bw.nrd0(x)",
    "description": "カーネル密度推定のバンド幅の経験則 0.9 * min(sd(x), IQR(x)/1.34) * n^(-1/5) を返します。散らばりが 0 の場合は sd、|x[1]|、1 の順にフォールバックします（density の既定）。",
    "example": "bw.nrd0(1:10)",
    "caution": "長さ1未満では停止します。NA／NaN を含む場合は実 R の文言で停止します。",
    "status": "supported"
  },
  {
    "name": "bw.SJ",
    "category": "集計",
    "syntax": "bw.SJ(x, nb = 1000L, lower, upper, method = c(\"ste\", \"dpi\"), tol = 0.1 * lower)",
    "description": "カーネル密度推定のバンド幅を Sheather-Jones 法（解方程式 ste／直接プラグイン dpi）で選びます。【未対応の理由】内部のビニング済み密度に対する C 実装（bw_phi4／bw_phi6 系）の数式を一次情報で確定できず、数値を忠実に再現できないため名指しで停止します",
    "example": "bw.SJ(faithful$eruptions)",
    "caution": "bw.nrd0／bw.nrd は対応しています。",
    "status": "unsupported"
  },
  {
    "name": "bw.ucv",
    "category": "集計",
    "syntax": "bw.ucv(x, nb = 1000L, lower, upper, tol = 0.1 * lower)",
    "description": "カーネル密度推定のバンド幅を偏りのない交差検証（UCV）で選びます。【未対応の理由】内部のビニング済み密度に対する C 実装（bw_ucv）の数式を一次情報で確定できず、最適化の収束先を含む数値を忠実に再現できないため名指しで停止します",
    "example": "bw.ucv(faithful$eruptions)",
    "caution": "bw.nrd0／bw.nrd は対応しています。",
    "status": "unsupported"
  },
  {
    "name": "cpgram",
    "category": "時系列",
    "syntax": "cpgram(ts, taper = 0.1, main, ci.col = \"blue\")",
    "description": "累積ペリオドグラムを描き、Kolmogorov-Smirnov 型の信頼帯とあわせて表示します。【未対応の理由】グラフィックス専用の関数であり、値としての戻り値を持たないため",
    "example": "cpgram(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "decompose",
    "category": "時系列",
    "syntax": "decompose(x, type = c(\"additive\", \"multiplicative\"), filter = NULL)",
    "description": "移動平均で時系列をトレンド・季節・不規則の成分に分解し、クラス decomposed.ts のオブジェクトを返します。【未対応の理由】戻り値が成分ごとの ts を要素に持つクラス付きリストであり、値モデルで表せないため",
    "example": "decompose(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.decomposed.ts",
    "category": "時系列",
    "syntax": "plot.decomposed.ts(x,...)",
    "description": "decompose の分解結果を成分ごとに描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の decomposed.ts オブジェクト自体も未対応なため",
    "example": "plot(decompose(co2))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "density",
    "category": "集計",
    "syntax": "density(x,...)",
    "description": "カーネル密度推定を計算し、クラス density のオブジェクト（格子点 x と密度 y 等のリスト）を返します。【未対応の理由】戻り値がクラス付きリストであり、値モデルにリスト型が無いため。バンド幅の経験則 bw.nrd0／bw.nrd 自体は対応しています",
    "example": "density(faithful$eruptions)",
    "caution": "既定のバンド幅は bw.nrd0 です。",
    "status": "unsupported"
  },
  {
    "name": "diffinv",
    "category": "時系列",
    "syntax": "diffinv(x, lag = 1, differences = 1, xi, ...)",
    "description": "diff の逆演算（累積和の一般化）で、差分を取る前の系列を復元します。初期値 xi の既定は 0 です。",
    "example": "diffinv(c(1, 2, 3))",
    "caution": "結果の長さは length(x) + lag * differences です。名前は引き継がれません。データフレーム入力は対象外です。",
    "status": "supported"
  },
  {
    "name": "embed",
    "category": "時系列",
    "syntax": "embed(x, dimension = 1)",
    "description": "時系列を遅延ベクトルの行列（埋め込み行列）に変換します。【未対応の理由】戻り値が行列であり、値モデルに行列型が無いため",
    "example": "embed(1:10, 3)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "filter",
    "category": "時系列",
    "syntax": "filter(x, filter, method = c(\"convolution\", \"recursive\"), sides = 2, circular = FALSE, init = NULL)",
    "description": "線形フィルタ（畳み込みまたは再帰）を時系列に適用し、ts として返します。【未対応の理由】実 R は入力が素の数値ベクトルでも tsp 属性を持つ ts を返し（実測）、時刻のずれを含む ts としての意味論を属性なしの値で正直に表せないため",
    "example": "filter(1:10, rep(1, 3) / 3)",
    "caution": "畳み込みの端では NA が生じます。",
    "status": "unsupported"
  },
  {
    "name": "bandwidth.kernel",
    "category": "集計",
    "syntax": "bandwidth.kernel(k)",
    "description": "tskernel オブジェクトのバンド幅（次数 m から決まる値）を返します。【未対応の理由】tskernel オブジェクト（kernel の戻り値）自体が未対応であり、その属性に依存するため",
    "example": "bandwidth.kernel(kernel(\"daniell\", 5))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "df.kernel",
    "category": "集計",
    "syntax": "df.kernel(k)",
    "description": "tskernel オブジェクトの等価自由度を返します。【未対応の理由】tskernel オブジェクト自体が未対応であり、その属性に依存するため",
    "example": "df.kernel(kernel(\"daniell\", 5))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.tskernel",
    "category": "集計",
    "syntax": "is.tskernel(k)",
    "description": "オブジェクトが tskernel クラスかどうかを判定します。【未対応の理由】値モデルに tskernel クラスが存在せず、常に FALSE になる述語を対応とは数えないため",
    "example": "is.tskernel(kernel(\"daniell\", 5))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "kernel",
    "category": "集計",
    "syntax": "kernel(coef, m = 2, r, name = \"unknown\")",
    "description": "時系列の平滑化用カーネル（Daniell、修正 Daniell、Fejér、修正 Bartlett 等）を係数から作り、クラス tskernel のオブジェクトを返します。【未対応の理由】戻り値が tskernel オブジェクト（クラスと属性を持つベクトル）であり、値モデルで表せないため",
    "example": "kernel(\"daniell\", 5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.tskernel",
    "category": "集計",
    "syntax": "plot.tskernel(x, type = \"h\", xlab = \"k\", ylab = \"W[k]\", main,...)",
    "description": "tskernel オブジェクトの重みを描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の tskernel オブジェクト自体も未対応なため",
    "example": "plot(kernel(\"daniell\", 5))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "kernapply",
    "category": "集計",
    "syntax": "kernapply(x,...)",
    "description": "tskernel オブジェクトのカーネルを時系列に適用（畳み込み）する S3 ジェネリックです。【未対応の理由】必須引数の tskernel オブジェクト自体が未対応であり、生成手段が無いため",
    "example": "kernapply(lh, kernel(\"daniell\", 5))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ksmooth",
    "category": "モデル",
    "syntax": "ksmooth(x, y, kernel = c(\"box\", \"normal\"), bandwidth = 0.5, range.x = range(x), n.points = max(100L, length(x)), x.points)",
    "description": "Nadaraya-Watson カーネル回帰で平滑化し、結果を list(x, y) で返します。【未対応の理由】戻り値がリスト（評価点 x と平滑値 y の組）であり、値モデルにリスト型が無いため",
    "example": "ksmooth(1:10, (1:10)^2, kernel = \"normal\", bandwidth = 2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lag",
    "category": "時系列",
    "syntax": "lag(x, k = 1,...)",
    "description": "時系列を k 期だけ遅らせる S3 ジェネリックです（値そのものは変えず tsp 属性をずらします）。【未対応の理由】効果が tsp 属性のシフトのみにあり、属性を持たない数値ベクトルでは恒等写像になって意味を偽るため",
    "example": "lag(lh, 2)",
    "caution": "diff と組み合わせてラグ付き差分を作るのが典型的な用途です。",
    "status": "unsupported"
  },
  {
    "name": "lag.plot",
    "category": "時系列",
    "syntax": "lag.plot(x, lags = 1, layout = NULL, set.lags = 1L:lags, main = NULL, asp = 1, diag = TRUE, diag.col = \"gray\", type = \"p\", oma = NULL, ask = NULL, do.lines = (n <= 150), labels = do.lines,...)",
    "description": "ラグ付き散布図（x_t と x_{t-k} のプロット群）を描きます。【未対応の理由】グラフィックス専用の関数であり、値としての戻り値を持たないため",
    "example": "lag.plot(lh, lags = 4)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "line",
    "category": "モデル",
    "syntax": "line(x, y = NULL, iter = 1)",
    "description": "Tukey の resistant line（中央値ベースの頑健な直線）を適合し、クラス tukeyline のオブジェクトを返します。【未対応の理由】戻り値がクラス付きリストであり、値モデルで表せないため",
    "example": "line(1:10, c(2, 3, 5, 4, 6, 8, 7, 9, 11, 10))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "residuals.tukeyline",
    "category": "モデル",
    "syntax": "residuals.tukeyline(object, type = c(\"working\", \"response\", \"deviance\", \"pearson\", \"partial\"),...)",
    "description": "tukeyline オブジェクトから残差を抽出する S3 メソッドです。【未対応の理由】tukeyline オブジェクト自体が未対応であり、そのメソッドも対象を持たないため",
    "example": "residuals(line(1:5, 1:5))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "loess",
    "category": "モデル",
    "syntax": "loess(formula, data, weights, subset, na.action, model = FALSE, span = 0.75, enp.target, degree = 2L, parametric = FALSE, drop.square = FALSE, normalize = TRUE, family = c(\"gaussian\", \"symmetric\"), method = c(\"loess\", \"model.frame\"), control = loess.control(...),...)",
    "description": "局所回帰（LOESS）で散布図を平滑化し、クラス loess の適合オブジェクトを返します。【未対応の理由】数式オブジェクトと適合オブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "loess(y ~ x, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "loess.control",
    "category": "モデル",
    "syntax": "loess.control(surface = c(\"interpolate\", \"direct\"), statistics = c(\"approximate\", \"exact\", \"none\"), trace.hat = c(\"exact\", \"approximate\"), cell = 0.2, iterations = 4L, iterTrace = FALSE,...)",
    "description": "loess の制御パラメータをまとめたリストを作ります。【未対応の理由】戻り値がリストであり、値モデルにリスト型が無いため（loess 自体も未対応）",
    "example": "loess.control(surface = \"direct\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lowess",
    "category": "モデル",
    "syntax": "lowess(x, y = NULL, f = 2/3, iter = 3L, delta = 0.01 * diff(range(x)))",
    "description": "Cleveland の LOWESS 平滑化を行い、結果を list(x, y) で返します。【未対応の理由】戻り値がリスト（x と平滑値 y の組）であり、値モデルにリスト型が無いため",
    "example": "lowess(1:10, (1:10)^2)",
    "caution": "現在の推奨は loess ですが、こちらも未対応です。",
    "status": "unsupported"
  },
  {
    "name": "monthplot",
    "category": "時系列",
    "syntax": "monthplot(x,...)",
    "description": "季節部分系列プロット（月ごとの部分系列と平均）を描く S3 ジェネリックです。【未対応の理由】グラフィックスであり、ts の季節構造（frequency 属性）にも依存するため",
    "example": "monthplot(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.HoltWinters",
    "category": "時系列",
    "syntax": "plot.HoltWinters(x, predicted.values = NA, intervals = TRUE, separator = TRUE, col = 1, col.predicted = 2, col.intervals = 4, col.separator = 1, lty = 1, ylab = \"Observed / Fitted\", main = \"Holt-Winters filtering\", ylim = NULL,...)",
    "description": "HoltWinters の適合結果と観測値を描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の HoltWinters オブジェクト自体も未対応なため",
    "example": "plot(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.acf",
    "category": "時系列",
    "syntax": "plot.acf(x, ci = 0.95, type = \"h\", xlab = \"Lag\", ylab = NULL, ylim = NULL, main = NULL, ci.col = \"blue\", ci.type = c(\"white\", \"ma\"), max.mfrow = 6,...)",
    "description": "acf オブジェクトを描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の acf オブジェクト自体も未対応なため",
    "example": "plot(acf(lh))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.density",
    "category": "集計",
    "syntax": "plot.density(x, main = NULL, xlab = NULL, ylab = \"Density\", type = \"l\", zero.line = TRUE,...)",
    "description": "density オブジェクト（カーネル密度推定の結果）を描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の density オブジェクト自体も未対応なため",
    "example": "plot(density(faithful$eruptions))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lines.isoreg",
    "category": "モデル",
    "syntax": "lines.isoreg(x, col = \"red\", lwd = 1.5, do.points = FALSE, cex = 1.5, pch = 13,...)",
    "description": "等張回帰の適合結果を既存のプロットに追加する S3 メソッドです。【未対応の理由】グラフィックスであり、対象の isoreg オブジェクト自体も未対応なため",
    "example": "lines(ir)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.isoreg",
    "category": "モデル",
    "syntax": "plot.isoreg(x, plot.type = c(\"single\", \"row.wise\", \"col.wise\"), main, main2 = \"Cumulative Data and Convex Minorant\", xlab = \"x0\", ylab = \"x$y\",...)",
    "description": "等張回帰の適合結果を描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の isoreg オブジェクト自体も未対応なため",
    "example": "plot(ir)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lines.stepfun",
    "category": "数学",
    "syntax": "lines.stepfun(x,...)",
    "description": "ステップ関数を既存のプロットに追加する S3 メソッドです。【未対応の理由】グラフィックスであり、対象の stepfun オブジェクト自体も未対応なため",
    "example": "lines(fn)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.stepfun",
    "category": "数学",
    "syntax": "plot.stepfun(x, xval, xlim, ylim, xlab = \"x\", ylab = \"f(x)\", main = NULL, add = FALSE, verticals = TRUE, do.points = TRUE,...)",
    "description": "ステップ関数（経験分布関数など）を描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の stepfun オブジェクト自体も未対応なため",
    "example": "plot(stepfun(1:3, c(0, 0.3, 0.7, 1)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lines.ts",
    "category": "時系列",
    "syntax": "lines.ts(x,...)",
    "description": "時系列を既存のプロットに追加する S3 メソッドです。【未対応の理由】グラフィックスであり、ts クラスにも依存するため",
    "example": "lines(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.ts",
    "category": "時系列",
    "syntax": "plot.ts(x, y = NULL, plot.type = c(\"multiple\", \"single\"), xy.labels, xy.lines, panel = lines, yax.flip = FALSE, axes = TRUE,...)",
    "description": "時系列を描く S3 メソッドです。【未対応の理由】グラフィックスであり、ts クラス（tsp 属性）にも依存するため",
    "example": "plot(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.HoltWinters",
    "category": "時系列",
    "syntax": "predict.HoltWinters(object, n.ahead = 1L, prediction.interval = FALSE, level = 0.95,...)",
    "description": "HoltWinters 適合オブジェクトから将来値を予測する S3 メソッドです。【未対応の理由】HoltWinters オブジェクト自体が未対応であり、予測結果も ts クラスで返るため",
    "example": "predict(fit, n.ahead = 5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.Arima",
    "category": "時系列",
    "syntax": "predict.Arima(object, n.ahead = 1L, newxreg = NULL, se.fit = TRUE,...)",
    "description": "arima 適合オブジェクトから将来値を予測する S3 メソッドです。【未対応の理由】Arima オブジェクト自体が未対応であり、予測結果も ts クラスで返るため",
    "example": "predict(fit, n.ahead = 5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.loess",
    "category": "モデル",
    "syntax": "predict.loess(object, newdata = NULL, se = FALSE, na.action = na.pass,...)",
    "description": "loess 適合オブジェクトで新しいデータの予測値を計算する S3 メソッドです。【未対応の理由】loess オブジェクト自体が未対応であり、そのメソッドも対象を持たないため",
    "example": "predict(fit, newdata = data.frame(x = 0.5))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.smooth.spline",
    "category": "モデル",
    "syntax": "predict.smooth.spline(object, x, deriv = 0,...)",
    "description": "smooth.spline 適合オブジェクトで予測値や導関数を計算し、list(x, y) で返します。【未対応の理由】smooth.spline オブジェクト自体が未対応であり、戻り値もリストなため",
    "example": "predict(fit, x = 0.5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "spec",
    "category": "時系列",
    "syntax": "spec(x,...)",
    "description": "spectrum のヘルプページに別名として載る名前ですが、R 4.3.3 の stats 名前空間にそのような関数は存在しません（実走確認済み）。【未対応の理由】呼び出し可能な関数ではないため",
    "example": "spectrum(lh)",
    "caution": "スペクトル推定には spectrum を使います（こちらも未対応）。",
    "status": "unsupported"
  },
  {
    "name": "spectrum",
    "category": "時系列",
    "syntax": "spectrum(x,..., method = c(\"pgram\", \"ar\"))",
    "description": "スペクトル密度を推定する S3 ジェネリックで、クラス spec のオブジェクトを返して既定でプロットします。【未対応の理由】戻り値が spec オブジェクト（クラス付きリスト）であり、ts の周波数（tsp 属性）にも依存するため",
    "example": "spectrum(lh)",
    "caution": "plot = TRUE が既定で、グラフィックスを伴います。",
    "status": "unsupported"
  },
  {
    "name": "spec.ar",
    "category": "時系列",
    "syntax": "spec.ar(x, n.freq, order = NULL, plot = TRUE, na.action = na.fail, method = \"yule-walker\",...)",
    "description": "AR モデル適合によるスペクトル密度推定を行い、クラス spec のオブジェクトを返します。【未対応の理由】戻り値が spec オブジェクト（クラス付きリスト）であり、ar 適合とプロットにも依存するため",
    "example": "spec.ar(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "spec.pgram",
    "category": "時系列",
    "syntax": "spec.pgram(x, spans = NULL, kernel = NULL, taper = 0.1, pad = 0, fast = TRUE, demean = FALSE, detrend = TRUE, plot = TRUE, na.action = na.fail,...)",
    "description": "平滑化ペリオドグラムによるスペクトル密度推定を行い、クラス spec のオブジェクトを返します。【未対応の理由】戻り値が spec オブジェクト（クラス付きリスト）であり、tskernel とプロットにも依存するため。テーパー自体は spec.taper で計算できます",
    "example": "spec.pgram(lh)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "spec.taper",
    "category": "時系列",
    "syntax": "spec.taper(x, p = 0.1)",
    "description": "スペクトル推定のためのコサインベル・テーパーを系列の両端の割合 p に適用します。",
    "example": "spec.taper(1:10, 0.2)",
    "caution": "名前は保持されます。データフレーム・行列入力は対象外です。",
    "status": "supported"
  },
  {
    "name": "spline",
    "category": "数学",
    "syntax": "spline(x, y = NULL, n = 3 * length(x), method = \"fmm\", xmin = min(x), xmax = max(x), xout, ties = mean)",
    "description": "三次スプライン補間を行い、結果を list(x, y) で返します。【未対応の理由】戻り値がリスト（x と y の組）であり、値モデルにリスト型が無いため",
    "example": "spline(1:3, c(2, 4, 8), xout = 1.5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "splinefun",
    "category": "数学",
    "syntax": "splinefun(x, y = NULL, method = c(\"fmm\", \"periodic\", \"natural\", \"monoH.FC\", \"hyman\"), ties = mean)",
    "description": "三次スプライン補間を行う関数を作成して返します。【未対応の理由】戻り値が関数オブジェクトであり、値モデルに関数値が無いため",
    "example": "f <- splinefun(1:3, c(2, 4, 8))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "splinefunH",
    "category": "数学",
    "syntax": "splinefunH(x, y, m)",
    "description": "Hermite 補間スプライン（点と傾きを指定）を行う関数を作成して返します。【未対応の理由】戻り値が関数オブジェクトであり、値モデルに関数値が無いため",
    "example": "f <- splinefunH(1:3, c(2, 4, 8), c(1, 1, 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "smooth",
    "category": "集計",
    "syntax": "smooth(x, kind = c(\"3RS3R\", \"3RSS\", \"3RSR\", \"3R\", \"3\", \"S\"), twiceit = FALSE, endrule = c(\"Tukey\", \"copy\"), do.ends = FALSE)",
    "description": "Tukey の running median 平滑化（3R 系の反復平滑化と splitting）を数値ベクトルに適用します。",
    "example": "smooth(c(1, 3, 2, 5, 4))",
    "caution": "実 R は tukeysmooth クラスのオブジェクト（平滑化の反復回数等の属性付き）を返しますが、ここでは平滑化された数値ベクトルのみを返します。NA を含む場合は実 R の文言で停止します。",
    "status": "supported"
  },
  {
    "name": "smooth.spline",
    "category": "モデル",
    "syntax": "smooth.spline(x, y = NULL, w = NULL, df, spar = NULL, lambda = NULL, cv = FALSE, all.knots = FALSE, nknots =.nknots.smspl, keep.data = TRUE, df.offset = 0, penalty = 1, control.spar = list(), tol, keep.stuff = FALSE)",
    "description": "平滑化スプラインを適合し、クラス smooth.spline の適合オブジェクトを返します。【未対応の理由】適合オブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "smooth.spline(1:10, (1:10)^2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".nknots.smspl",
    "category": "モデル",
    "syntax": ".nknots.smspl(n)",
    "description": "smooth.spline の内部関数で、データ点数 n に対して既定のノット数を決めます。意味論は実 R 4.3.3 で確定済みです。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず（式を解釈できません）、呼び出しに到達できないため",
    "example": ".nknots.smspl(100)",
    "caution": "パーサがドット始まり名を受理するようになれば対応に昇格できます。",
    "status": "unsupported"
  },
  {
    "name": "smoothEnds",
    "category": "集計",
    "syntax": "smoothEnds(y, k = 3)",
    "description": "running median の端点（両端の (k-1)/2 個）を Tukey の端点規則で平滑化します。runmed の endrule = \"median\" の内部で使う関数です。",
    "example": "smoothEnds(c(1, 10, 2, 3, 4, 5), 3)",
    "caution": "k は奇数でなければなりません。名前は保持されます。NA がある場合は欠損を除いた平均・下側中央値で処理する実 R の規則を再現します。",
    "status": "supported"
  },
  {
    "name": "end",
    "category": "時系列",
    "syntax": "end(x,...)",
    "description": "時系列の終了時刻（c(期, 周期内位置)）を返す S3 ジェネリックです。【未対応の理由】tsp 属性に本質的に依存し、属性を持たない数値ベクトルでは実 R も既定の c(1, 1) 相当しか返さないため、意味を偽らず対応とは数えません",
    "example": "end(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "start",
    "category": "時系列",
    "syntax": "start(x,...)",
    "description": "時系列の開始時刻（c(期, 周期内位置)）を返す S3 ジェネリックです。【未対応の理由】tsp 属性に本質的に依存し、属性を持たない数値ベクトルでは実 R も既定の c(1, 1) 相当しか返さないため、意味を偽らず対応とは数えません",
    "example": "start(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.stepfun",
    "category": "数学",
    "syntax": "as.stepfun(x,...)",
    "description": "オブジェクトを stepfun（ステップ関数オブジェクト）に変換する S3 ジェネリックです。【未対応の理由】stepfun オブジェクト（環境に束縛を持つ関数オブジェクト）を前提とし、値モデルで表せないため",
    "example": "as.stepfun(ecdf(rivers))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.stepfun",
    "category": "数学",
    "syntax": "is.stepfun(x)",
    "description": "オブジェクトが stepfun クラスかどうかを判定します。【未対応の理由】値モデルに stepfun クラスが存在せず、常に FALSE になる述語を対応とは数えないため",
    "example": "is.stepfun(stepfun(1:3, c(0, 0.5, 0.8, 1)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "knots",
    "category": "数学",
    "syntax": "knots(Fn,...)",
    "description": "stepfun オブジェクトのノット（跳ぶ位置）を取り出す S3 ジェネリックです。【未対応の理由】stepfun オブジェクト自体が未対応であり、そのメソッドも対象を持たないため",
    "example": "knots(stepfun(1:3, c(0, 0.5, 0.8, 1)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.stepfun",
    "category": "数学",
    "syntax": "print.stepfun(x, digits = getOption(\"digits\") - 2,...)",
    "description": "stepfun オブジェクトを表示する S3 メソッドです。【未対応の理由】stepfun オブジェクト自体が未対応であり、その表示メソッドも対象を持たないため",
    "example": "print(stepfun(1:3, c(0, 0.5, 0.8, 1)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stepfun",
    "category": "数学",
    "syntax": "stepfun(x, y, f = as.numeric(right), ties = \"ordered\", right = FALSE)",
    "description": "ステップ関数（経験分布関数など）を表す関数オブジェクトを作成します。【未対応の理由】戻り値が関数オブジェクト（環境に束縛を持つ stepfun クラス）であり、値モデルに関数値が無いため",
    "example": "stepfun(1:3, c(0, 0.5, 0.8, 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.stepfun",
    "category": "数学",
    "syntax": "summary.stepfun(object,...)",
    "description": "stepfun オブジェクトの要約を計算する S3 メソッドです。【未対応の理由】stepfun オブジェクト自体が未対応であり、そのメソッドも対象を持たないため",
    "example": "summary(stepfun(1:3, c(0, 0.5, 0.8, 1)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stl",
    "category": "時系列",
    "syntax": "stl(x, s.window, s.degree = 0, t.window = NULL, t.degree = 1, l.window, l.degree, s.jump, t.jump, l.jump, robust = FALSE, inner, outer, na.action = na.fail)",
    "description": "LOESS による季節・トレンド分解（STL）を行い、クラス stl のオブジェクトを返します。【未対応の理由】ts の季節構造（frequency 属性）と、成分 ts を要素に持つクラス付きリストの戻り値を前提とし、値モデルで表せないため",
    "example": "stl(co2, s.window = \"periodic\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.stl",
    "category": "時系列",
    "syntax": "plot.stl(x, labels, set.pars, main = NULL, range.bars = TRUE,..., col.range = \"light gray\")",
    "description": "stl の分解結果を描く S3 メソッドです。【未対応の理由】グラフィックスであり、対象の stl オブジェクト自体も未対応なため",
    "example": "plot(stl(co2, s.window = \"periodic\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.stl",
    "category": "時系列",
    "syntax": "summary.stl(object, digits = getOption(\"digits\"),...)",
    "description": "stl オブジェクトの要約を表示する S3 メソッドです。【未対応の理由】stl オブジェクト自体が未対応であり、そのメソッドも対象を持たないため",
    "example": "summary(stl(co2, s.window = \"periodic\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "supsmu",
    "category": "モデル",
    "syntax": "supsmu(x, y, wt = rep(1, n), span = \"cv\", periodic = FALSE, bass = 0, trace = FALSE)",
    "description": "Friedman の super smoother（可変スパンの平滑化）を行い、結果を list(x, y) で返します。【未対応の理由】戻り値がリスト（x と平滑値 y の組）であり、値モデルにリスト型が無いため",
    "example": "supsmu(1:10, (1:10)^2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cycle",
    "category": "時系列",
    "syntax": "cycle(x,...)",
    "description": "時系列の各時点の周期内位置（月など）を返す S3 ジェネリックです。【未対応の理由】tsp 属性（frequency）に本質的に依存し、属性を持たない数値ベクトルでは意味をなさないため",
    "example": "cycle(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "deltat",
    "category": "時系列",
    "syntax": "deltat(x,...)",
    "description": "時系列のサンプリング間隔（1/frequency）を返す S3 ジェネリックです。【未対応の理由】tsp 属性に本質的に依存し、属性を持たない数値ベクトルでは意味をなさないため",
    "example": "deltat(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "frequency",
    "category": "時系列",
    "syntax": "frequency(x,...)",
    "description": "時系列の単位時間あたりの観測数（年あたりの期数）を返す S3 ジェネリックです。【未対応の理由】tsp 属性に本質的に依存し、属性を持たない数値ベクトルでは意味をなさないため",
    "example": "frequency(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "time",
    "category": "時系列",
    "syntax": "time(x,...)",
    "description": "時系列の各時点の時刻を ts として返す S3 ジェネリックです。【未対応の理由】tsp 属性に本質的に依存し、戻り値自体も ts クラスであるため",
    "example": "time(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "time.default",
    "category": "時系列",
    "syntax": "time.default(x, offset = 0, ts.eps = getOption(\"ts.eps\"),...)",
    "description": "time の既定メソッドで、tsp 属性から時刻の ts を構成します。【未対応の理由】tsp 属性に本質的に依存し、戻り値自体も ts クラスであるため",
    "example": "time(1:5)",
    "caution": "属性のないベクトルでは seq_along 相当の ts を返しますが、その ts を表せません。",
    "status": "unsupported"
  },
  {
    "name": "as.ts",
    "category": "時系列",
    "syntax": "as.ts(x,...)",
    "description": "オブジェクトを ts に変換する S3 ジェネリックです。【未対応の理由】変換先の ts クラス（tsp 属性）自体を値モデルで表せないため",
    "example": "as.ts(1:10)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cbind.ts",
    "category": "時系列",
    "syntax": "cbind.ts(..., deparse.level = 1)",
    "description": "複数の時系列を時刻でそろえて列結合し、mts を作る S3 メソッドです。【未対応の理由】ts／mts クラスと行列型の両方を前提とし、値モデルで表せないため",
    "example": "cbind.ts(ldeaths, mdeaths)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "head.ts",
    "category": "時系列",
    "syntax": "head(x,...)",
    "description": "ts の先頭部分を取るメソッドとしてヘルプに現れる名前ですが、R 4.3.3 の stats／utils 名前空間に head.ts という関数は存在しません（実走確認済み。head の ts 処理は内部実装です）。【未対応の理由】呼び出し可能な関数ではないため",
    "example": "head(co2)",
    "caution": "head 自体は utils のジェネリックです。",
    "status": "unsupported"
  },
  {
    "name": "is.mts",
    "category": "時系列",
    "syntax": "is.mts(x)",
    "description": "オブジェクトが多変量時系列（mts）かどうかを判定します。【未対応の理由】値モデルに mts クラスが存在せず、常に FALSE になる述語を対応とは数えないため",
    "example": "is.mts(cbind(ldeaths, mdeaths))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.ts",
    "category": "時系列",
    "syntax": "is.ts(x)",
    "description": "オブジェクトが ts かどうかを判定します。【未対応の理由】値モデルに ts クラスが存在せず、常に FALSE になる述語を対応とは数えないため",
    "example": "is.ts(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Ops.ts",
    "category": "時系列",
    "syntax": "Ops.ts(e1, e2)",
    "description": "ts 同士・ts と数値の算術演算を tsp をそろえて行うグループメソッドです。【未対応の理由】ts クラス（tsp 属性）同士の演算規則そのものであり、値モデルで表せないため",
    "example": "ldeaths + mdeaths",
    "caution": "演算子経由で呼ばれるため、関数呼び出しの項目としては説明専用です。",
    "status": "unsupported"
  },
  {
    "name": "t.ts",
    "category": "時系列",
    "syntax": "t.ts(x)",
    "description": "多変量時系列を行列として転置する S3 メソッドです。【未対応の理由】mts と行列型を前提とし、値モデルで表せないため",
    "example": "t(cbind(ldeaths, mdeaths))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tail.ts",
    "category": "時系列",
    "syntax": "tail(x,...)",
    "description": "ts の末尾部分を取るメソッドとしてヘルプに現れる名前ですが、R 4.3.3 の stats／utils 名前空間に tail.ts という関数は存在しません（実走確認済み）。【未対応の理由】呼び出し可能な関数ではないため",
    "example": "tail(co2)",
    "caution": "tail 自体は utils のジェネリックです。",
    "status": "unsupported"
  },
  {
    "name": "ts",
    "category": "時系列",
    "syntax": "ts(data = NA, start = 1, end = numeric(), frequency = 1, deltat = 1, ts.eps = getOption(\"ts.eps\"), class, names)",
    "description": "時系列オブジェクト（ts／mts）を作成します。【未対応の理由】生成物である ts クラス（tsp 属性を持つオブジェクト）自体を値モデルで表せないため",
    "example": "ts(1:10, frequency = 4, start = c(2020, 2))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[.ts",
    "category": "時系列",
    "syntax": "x[i]",
    "description": "ts の一部を取り出す S3 ブラケットメソッドです。【未対応の理由】ts クラス自体が未対応であるため。なおブラケットを含む名前は共有パーサの識別子規則の対象外でもあります",
    "example": "co2[1:6]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "diff.ts",
    "category": "時系列",
    "syntax": "diff.ts(x, lag = 1, differences = 1,...)",
    "description": "ts の差分を取り、tsp を調整して ts として返す S3 メソッドです。【未対応の理由】ts クラス（tsp 属性）を前提とするため。素のベクトルの差分は基礎層の diff で計算でき、逆演算は diffinv が対応しています",
    "example": "diff(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "na.omit.ts",
    "category": "時系列",
    "syntax": "na.omit.ts(object,...)",
    "description": "欠損を含む期を除き、内部の欠損を補間して ts を返す S3 メソッドです。【未対応の理由】ts クラス（tsp 属性）を前提とするため",
    "example": "na.omit(presidents)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ts.plot",
    "category": "時系列",
    "syntax": "ts.plot(..., gpars = list())",
    "description": "1 本以上の時系列を同じ時刻軸で描きます。【未対応の理由】グラフィックスであり、ts クラス（tsp 属性）にも依存するため",
    "example": "ts.plot(ldeaths, mdeaths)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ts.intersect",
    "category": "時系列",
    "syntax": "ts.intersect(..., dframe = FALSE)",
    "description": "複数の時系列の共通の時間範囲でそろえて結合します。【未対応の理由】ts／mts クラスと tsp 属性による時刻合わせを前提とし、値モデルで表せないため",
    "example": "ts.intersect(ldeaths, mdeaths)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ts.union",
    "category": "時系列",
    "syntax": "ts.union(..., dframe = FALSE)",
    "description": "複数の時系列の時間範囲の和集合でそろえて結合します（範囲外は NA）。【未対応の理由】ts／mts クラスと tsp 属性による時刻合わせを前提とし、値モデルで表せないため",
    "example": "ts.union(ldeaths, mdeaths)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tsSmooth",
    "category": "時系列",
    "syntax": "tsSmooth(object,...)",
    "description": "構造型時系列モデル等の平滑化結果を取り出す S3 ジェネリックです。【未対応の理由】StructTS 等の適合オブジェクトと ts クラスの戻り値を前提とし、値モデルで表せないため",
    "example": "tsSmooth(StructTS(log10(UKgas), type = \"BSM\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tsdiag",
    "category": "時系列",
    "syntax": "tsdiag(object, gof.lag,...)",
    "description": "時系列モデルの診断プロット（残差・ACF・Ljung-Box 統計量）を描く S3 ジェネリックです。【未対応の理由】グラフィックスであり、適合オブジェクトにも依存するため",
    "example": "tsdiag(arima(lh, order = c(1, 0, 0)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "hasTsp",
    "category": "時系列",
    "syntax": "hasTsp(x)",
    "description": "x に tsp 属性が無ければ c(1, NROW(x), 1) を付けて返し、あればそのまま返す関数です。【未対応の理由】働きが tsp 属性の付与そのものであり、属性を持たない値モデルでは意味をなさないため",
    "example": "hasTsp(1:5)",
    "caution": "述語ではなく属性を付ける関数です。",
    "status": "unsupported"
  },
  {
    "name": "tsp",
    "category": "時系列",
    "syntax": "tsp(x)",
    "description": "時系列の tsp 属性 c(開始時刻, 終了時刻, frequency) を返します。【未対応の理由】tsp 属性そのものを扱う関数であり、値モデルに該当する属性が無いため",
    "example": "tsp(co2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "window",
    "category": "時系列",
    "syntax": "window(x,...)",
    "description": "時系列の時間窓（開始・終了・拡張）を切り出す S3 ジェネリックです。【未対応の理由】tsp 属性による時刻指定と ts クラスの戻り値を前提とし、値モデルで表せないため",
    "example": "window(co2, start = c(1960, 1), end = c(1965, 12))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "isoreg",
    "category": "モデル",
    "syntax": "isoreg(x, y = NULL)",
    "description": "等張回帰（単調な階段関数の最小二乗適合）を計算し、クラス isoreg のオブジェクトを返します。【未対応の理由】戻り値がクラス付きリストであり、値モデルで表せないため",
    "example": "isoreg(1:5, c(1, 3, 2, 5, 4))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "runmed",
    "category": "集計",
    "syntax": "runmed(x, k, endrule = c(\"median\", \"keep\", \"constant\"), algorithm = NULL, na.action = c(\"+Big_alternate\", \"-Big_alternate\", \"na.omit\", \"fail\"), print.level = 0)",
    "description": "窓幅 k（奇数）の running median で数値ベクトルを平滑化します。endrule で両端の扱い（median／keep／constant）を選びます。",
    "example": "runmed(c(5, 1, 4, 2, 3), 3)",
    "caution": "実 R は結果に属性 k を付けますが、ここでは平滑化された数値ベクトルのみを返します。NA／NaN を含む入力は、na.action = \"fail\" の場合は実 R の文言で停止し、それ以外の na.action では C 実装の置換規則を忠実に再現できないため名指しで停止します。",
    "status": "supported"
  },
  {
    "name": "loess.smooth",
    "category": "モデル",
    "syntax": "loess.smooth(x, y, span = 2/3, degree = 1, family = c(\"symmetric\", \"gaussian\"), evaluation = 50,...)",
    "description": "scatter.smooth の内部で使う loess 平滑化で、結果を list(x, y) で返します。【未対応の理由】loess 適合に依存し、戻り値もリストであるため",
    "example": "loess.smooth(1:10, (1:10)^2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "scatter.smooth",
    "category": "モデル",
    "syntax": "scatter.smooth(x, y = NULL, span = 2/3, degree = 1, family = c(\"symmetric\", \"gaussian\"), xlab = NULL, ylab = NULL, ylim, evaluation = 50,..., lpars = list())",
    "description": "散布図に loess 平滑曲線を重ねて描きます。【未対応の理由】グラフィックスであり、loess 適合にも依存するため",
    "example": "scatter.smooth(1:10, (1:10)^2)",
    "caution": "",
    "status": "unsupported"
  }
];
