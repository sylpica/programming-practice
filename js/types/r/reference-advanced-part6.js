// 高度モード B4S：R 高度リファレンス項目 part6（stats モデル・数式・抽出子 smodel 班）。
// 項目形式は B4 最終形の確定契約（BRIEF 第4章）：追加フィールドは付けず、
// 未対応の理由は description に明記する。裁定の根拠は docs/audit/ADV-B4S-smodel.md。
export const referenceAdvanced = [
  {
    "name": "AIC",
    "category": "モデル",
    "syntax": "AIC(object, ..., k = 2)",
    "description": "適合済みモデルオブジェクトから赤池情報量基準（AIC）を抽出します（対数尤度とパラメータ数から計算されます）。【未対応の理由】logLikメソッドを持つ適合済みモデルオブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "AIC(fit)",
    "caution": "k は1パラメータあたりのペナルティです。",
    "status": "unsupported"
  },
  {
    "name": "BIC",
    "category": "モデル",
    "syntax": "BIC(object, ...)",
    "description": "適合済みモデルオブジェクトからベイズ情報量基準（BIC）を抽出します（ペナルティに log(n) を使います）。【未対応の理由】logLikメソッドを持つ適合済みモデルオブジェクト（クラス付きリスト）を前提とし、値モデルで表せないため",
    "example": "BIC(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "add1",
    "category": "モデル",
    "syntax": "add1(object, scope, ...)",
    "description": "モデルに scope の項を1つずつ追加した場合の適合度（AIC等）の表を計算します。【未対応の理由】適合済みモデルオブジェクトと scope（数式オブジェクト）を前提とし、再適合を伴うため",
    "example": "add1(fit, scope = ~ x1 + x2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "drop1",
    "category": "モデル",
    "syntax": "drop1(object, scope, ...)",
    "description": "モデルから項を1つずつ削除した場合の適合度（AIC等）の表を計算します。【未対応の理由】適合済みモデルオブジェクトと scope（数式オブジェクト）を前提とし、再適合を伴うため",
    "example": "drop1(fit, scope = ~ x1 + x2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "alias",
    "category": "モデル",
    "syntax": "alias(object, ...)",
    "description": "線形モデルの項の間のエイリアス（完全な線形従属）関係を調べ、結果をリストで返します。【未対応の理由】lm等の適合済みモデルオブジェクト（とその計画行列）を前提とし、リストを返すため",
    "example": "alias(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "anova",
    "category": "モデル",
    "syntax": "anova(object, ...)",
    "description": "適合済みモデルオブジェクトの分散分析表を計算するS3ジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "anova(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "anova.glm",
    "category": "モデル",
    "syntax": "anova(object, ..., dispersion = NULL, test = NULL)",
    "description": "一般化線形モデルの適合に対する逸脱度分析表を計算する anova のメソッドです。【未対応の理由】glmクラスの適合済みモデルオブジェクトを前提とし、値モデルで表せないため",
    "example": "anova(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "anova.lm",
    "category": "モデル",
    "syntax": "anova(object, ...)",
    "description": "線形モデルの適合に対する分散分析表（逐次平方和）を計算する anova のメソッドです。【未対応の理由】lmクラスの適合済みモデルオブジェクトを前提とし、値モデルで表せないため",
    "example": "anova(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "anova.mlm",
    "category": "モデル",
    "syntax": "anova.mlm(object, ..., test = c(\"Pillai\", \"Wilks\", \"Hotelling-Lawley\", \"Roy\", \"Spherical\"), Sigma = diag(nrow = p), T = Thin.row(Proj(M) - Proj(X)), M = diag(nrow = p), X = ~0, idata = data.frame(index = seq_len(p)), tol = 1e-07)",
    "description": "多変量線形モデル同士の比較のための分散分析表を計算する anova のメソッドです。【未対応の理由】mlmクラスの適合済みモデルオブジェクトを前提とし、値モデルで表せないため",
    "example": "anova(fit1, fit2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "aov",
    "category": "モデル",
    "syntax": "aov(formula, data = NULL, projections = FALSE, qr = TRUE, contrasts = NULL, ...)",
    "description": "分散分析モデルを適合します（lm のラッパーで、Error 項による誤差層の層別ができます）。【未対応の理由】数式オブジェクトを入力とし、aov／lmクラス付きのモデルオブジェクト（リスト）を生成して返すため",
    "example": "aov(y ~ x, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Error",
    "category": "モデル",
    "syntax": "Error(term)",
    "description": "aov の数式の中で誤差層を指定するための特殊項です（公式ヘルプでは関数の形で説明されます）。【未対応の理由】関数オブジェクトとしては存在せず（実 R 4.3.3 の stats 名前空間に同名の関数は無いことを確認済みで、aov の数式では terms の特殊項として処理されます）、加えて数式（言語オブジェクト）自体が未対応のため",
    "example": "aov(y ~ x + Error(block), data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.aov",
    "category": "モデル",
    "syntax": "print.aov(x, intercept = FALSE, tol = sqrt(.Machine$double.eps), ...)",
    "description": "aov オブジェクトを表示する print のメソッドです。【未対応の理由】aovクラスのモデルオブジェクトを前提とし、その表示整形に依存するため",
    "example": "print.aov(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "asOneSidedFormula",
    "category": "モデル",
    "syntax": "asOneSidedFormula(object)",
    "description": "オブジェクトを片側数式（~ の右辺のみの数式）へ変換します。【未対応の理由】数式（言語）オブジェクトを生成して返し、環境を引き継ぐため",
    "example": "asOneSidedFormula(~ x + y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "case.names",
    "category": "モデル",
    "syntax": "case.names(object, ...)",
    "description": "適合済みモデルからケース名（観測の名前）を返すジェネリックです。【未対応の理由】適合済みモデルオブジェクト（lmのモデルフレーム等）を前提とするため",
    "example": "case.names(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "case.names.lm",
    "category": "モデル",
    "syntax": "case.names.lm(object, full = FALSE, ...)",
    "description": "適合済みモデルからケース名（観測の名前）を返します（lm向けのメソッドです）。【未対応の理由】lmクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "case.names(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "variable.names",
    "category": "モデル",
    "syntax": "variable.names(object, ...)",
    "description": "適合済みモデルから変数名を返すジェネリックです。【未対応の理由】適合済みモデルオブジェクト（lmのモデルフレーム等）を前提とするため",
    "example": "variable.names(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "variable.names.lm",
    "category": "モデル",
    "syntax": "variable.names.lm(object, full = FALSE, ...)",
    "description": "適合済みモデルから変数名を返します（lm向けのメソッドです）。【未対応の理由】lmクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "variable.names(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".checkMFClasses",
    "category": "モデル",
    "syntax": ".checkMFClasses(cl, m, ordNotOK = FALSE)",
    "description": "モデルフレームへ渡された変数の型（クラス）を検査する内部関数です。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず呼び出しに到達できないことに加え、モデルフレームのクラス検査という内部処理のため",
    "example": ".checkMFClasses(cl, x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".getXlevels",
    "category": "モデル",
    "syntax": ".getXlevels(Terms, m)",
    "description": "モデルフレームから因子水準（xlevels）を抽出する内部関数です。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず呼び出しに到達できないことに加え、termsオブジェクトと因子水準を扱う内部関数のため",
    "example": ".getXlevels(terms, mf)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".MFclass",
    "category": "モデル",
    "syntax": ".MFclass(x)",
    "description": "モデルフレームの列の型（クラス）を判定する内部関数です。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず呼び出しに到達できないことに加え、モデルフレームの内部処理のため",
    "example": ".MFclass(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "coef",
    "category": "モデル",
    "syntax": "coef(object, ...)",
    "description": "適合済みモデルオブジェクトから係数（パラメータ推定値）を抽出するジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "coef(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "coef.default",
    "category": "モデル",
    "syntax": "coef.default(object, complete = TRUE, ...)",
    "description": "適合済みモデルオブジェクトから係数（パラメータ推定値）を抽出します（coef のデフォルトメソッドです）。【未対応の理由】モデルオブジェクトの coefficients 要素を取り出す前提のメソッドであり、値モデルにモデルオブジェクトが無いため",
    "example": "coef.default(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "coefficients",
    "category": "モデル",
    "syntax": "coefficients(object, ...)",
    "description": "適合済みモデルオブジェクトから係数（パラメータ推定値）を抽出します（coef の別名です）。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "coefficients(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "confint",
    "category": "モデル",
    "syntax": "confint(object, parm, level = 0.95, ...)",
    "description": "適合済みモデルのパラメータの信頼区間を計算するジェネリックです。【未対応の理由】適合済みモデルオブジェクト（とプロファイル尤度計算）を前提とするため",
    "example": "confint(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "constrOptim",
    "category": "数学",
    "syntax": "constrOptim(theta, f, grad, ui, ci, mu = 1e-04, control = list(), method = if (is.null(grad)) \"Nelder-Mead\" else \"BFGS\", outer.iterations = 100, outer.eps = 1e-05, ..., hessian = FALSE)",
    "description": "線形不等式制約 ui %*% theta - ci >= 0 の下で関数 f を対数障壁法で最小化し、結果をリストで返します。【未対応の理由】ユーザ関数 f／grad（関数値）を引数に取ることと、結果をリストで返すため（関数値・リスト型が値モデルに無い）",
    "example": "constrOptim(c(0, 0), f, NULL, ui = diag(2), ci = c(0, 0))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "contr.helmert",
    "category": "モデル",
    "syntax": "contr.helmert(n, contrasts = TRUE, sparse = FALSE)",
    "description": "因子の水準に対する Helmert 対比の行列を返します（各水準をそれ以前の水準の平均と対比します）。【未対応の理由】返り値が対比行列（matrix）であり、値モデルに行列型が無いため（sparse = TRUE では Matrix パッケージの疎行列クラスを返す点も再現できない）",
    "example": "contr.helmert(4)",
    "caution": "contrasts = FALSE では n 行 n 列の指示行列を返します。",
    "status": "unsupported"
  },
  {
    "name": "contr.poly",
    "category": "モデル",
    "syntax": "contr.poly(n, scores = 1:n, contrasts = TRUE, sparse = FALSE)",
    "description": "因子の水準に対する直交多項式対比の行列を返します。【未対応の理由】返り値が対比行列（matrix）であり、値モデルに行列型が無いため（sparse = TRUE では Matrix パッケージの疎行列クラスを返す点も再現できない）",
    "example": "contr.poly(3)",
    "caution": "contrasts = FALSE では0次の定数項の列も含みます。",
    "status": "unsupported"
  },
  {
    "name": "contr.SAS",
    "category": "モデル",
    "syntax": "contr.SAS(n, contrasts = TRUE, sparse = FALSE)",
    "description": "因子の水準に対する SAS 式の対比行列を返します（最後の水準を基準とする contr.treatment のラッパーです）。【未対応の理由】返り値が対比行列（matrix）であり、値モデルに行列型が無いため（sparse = TRUE では Matrix パッケージの疎行列クラスを返す点も再現できない）",
    "example": "contr.SAS(5)",
    "caution": "contrasts = FALSE では n 行 n 列の指示行列を返します。",
    "status": "unsupported"
  },
  {
    "name": "contr.sum",
    "category": "モデル",
    "syntax": "contr.sum(n, contrasts = TRUE, sparse = FALSE)",
    "description": "因子の水準に対する総和ゼロ対比（sum contrasts）の行列を返します。【未対応の理由】返り値が対比行列（matrix）であり、値モデルに行列型が無いため（sparse = TRUE では Matrix パッケージの疎行列クラスを返す点も再現できない）",
    "example": "contr.sum(4)",
    "caution": "contrasts = FALSE では n 行 n 列の指示行列を返します。",
    "status": "unsupported"
  },
  {
    "name": "contr.treatment",
    "category": "モデル",
    "syntax": "contr.treatment(n, base = 1, contrasts = TRUE, sparse = FALSE)",
    "description": "因子の水準に対する処置対比の行列を返します（各水準を base で指定した基準水準と対比します）。【未対応の理由】返り値が対比行列（matrix）であり、値モデルに行列型が無いため（sparse = TRUE では Matrix パッケージの疎行列クラスを返す点も再現できない）",
    "example": "contr.treatment(5)",
    "caution": "contrasts = FALSE では n 行 n 列の指示行列を返します。",
    "status": "unsupported"
  },
  {
    "name": "contrasts",
    "category": "モデル",
    "syntax": "contrasts(x, contrasts = TRUE, sparse = FALSE)",
    "description": "因子やデータフレームの列に対する対比行列を取得・設定します。【未対応の理由】因子オブジェクトと contrasts 属性の取得・設定に依存し、値モデルに因子型と任意属性が無いため",
    "example": "contrasts(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "delete.response",
    "category": "モデル",
    "syntax": "delete.response(termobj)",
    "description": "terms オブジェクトから応答変数を除去した terms オブジェクトを返します。【未対応の理由】terms／数式（言語）オブジェクトを操作して返すため",
    "example": "delete.response(terms)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "drop.terms",
    "category": "モデル",
    "syntax": "drop.terms(termobj, dropx = NULL, keep.response = FALSE)",
    "description": "terms オブジェクトから指定した項を除去した terms オブジェクトを返します。【未対応の理由】terms／数式（言語）オブジェクトを操作して返すため",
    "example": "drop.terms(terms, dropx = 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "reformulate",
    "category": "モデル",
    "syntax": "reformulate(termlabels, response = NULL, intercept = TRUE, env = parent.frame())",
    "description": "文字列ベクトルから数式オブジェクトを構築します。【未対応の理由】数式（言語）オブジェクトを生成し、環境を保持するため",
    "example": "reformulate(c(\"x\", \"z\"), response = \"y\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[.terms",
    "category": "モデル",
    "syntax": "[.terms",
    "description": "terms オブジェクトの添字抽出メソッドです。【未対応の理由】S3のブラケットメソッドであり通常の関数呼び出しの形では使えず、termsオブジェクトにも依存するため",
    "example": "terms[1]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "D",
    "category": "数学",
    "syntax": "D(expr, name)",
    "description": "式を指定した名前で記号微分し、式（言語オブジェクト）を返します。【未対応の理由】式（言語オブジェクト）を引数に取り、式を返すため",
    "example": "D(expression(x^2), \"x\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "deriv",
    "category": "数学",
    "syntax": "deriv(expr, namevec, function.arg = NULL, tag = \".expr\", hessian = FALSE, ...)",
    "description": "式の記号微分を行い、勾配の属性付きの式（または関数オブジェクト）を返します。【未対応の理由】式（言語オブジェクト）と勾配属性付きの返り値・関数オブジェクトの生成に依存するため",
    "example": "deriv(~ x^2, \"x\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "deriv3",
    "category": "数学",
    "syntax": "deriv3(expr, namevec, function.arg = NULL, tag = \".expr\", hessian = TRUE, ...)",
    "description": "式の記号微分を行い、勾配とヘッセ行列の属性付きの式（または関数オブジェクト）を返します。【未対応の理由】式（言語オブジェクト）と勾配・ヘッセ行列の属性付き返り値・関数オブジェクトの生成に依存するため",
    "example": "deriv3(~ x^2, \"x\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "deviance",
    "category": "モデル",
    "syntax": "deviance(object, ...)",
    "description": "適合済みモデルオブジェクトの逸脱度を返すジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "deviance(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "df.residual",
    "category": "モデル",
    "syntax": "df.residual(object, ...)",
    "description": "適合済みモデルオブジェクトの残差自由度を返すジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "df.residual(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dummy.coef",
    "category": "モデル",
    "syntax": "dummy.coef(object, ...)",
    "description": "元の符号化（フルランクでないパラメータ化）での係数を抽出するジェネリックです。【未対応の理由】適合済みモデルオブジェクトを前提とし、結果をリストで返すため",
    "example": "dummy.coef(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dummy.coef.lm",
    "category": "モデル",
    "syntax": "dummy.coef.lm(object, use.na = FALSE, ...)",
    "description": "元の符号化（フルランクでないパラメータ化）での係数を抽出します（lm向けのメソッドです）。【未対応の理由】lmクラスの適合済みモデルオブジェクトを前提とし、結果をリストで返すため",
    "example": "dummy.coef(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "eff.aovlist",
    "category": "モデル",
    "syntax": "eff.aovlist(aovlist)",
    "description": "多層分散分析（aovlist オブジェクト）の各層の効率を計算します。【未対応の理由】aovlistクラスのモデルオブジェクト（層別された適合のリスト）を前提とするため",
    "example": "eff.aovlist(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "effects",
    "category": "モデル",
    "syntax": "effects(object, ...)",
    "description": "線形モデルの適合から直交効果（QR分解に基づく効果）を抽出するジェネリックです。【未対応の理由】適合済みモデルオブジェクトとそのQR分解を前提とするため",
    "example": "effects(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "expand.model.frame",
    "category": "モデル",
    "syntax": "expand.model.frame(model, extras, envir = environment(formula(model)), na.expand = FALSE)",
    "description": "適合済みモデルのモデルフレームに新しい変数を追加します。【未対応の理由】モデルオブジェクト・モデルフレーム・環境に依存し、値モデルで表せないため",
    "example": "expand.model.frame(fit, extras = ~ z)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "extractAIC",
    "category": "モデル",
    "syntax": "extractAIC(fit, scale, k = 2, ...)",
    "description": "適合済みモデルから AIC 相当量（と有効パラメータ数）を抽出するジェネリックです（step が使います）。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "extractAIC(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "binomial",
    "category": "モデル",
    "syntax": "binomial(link = \"logit\")",
    "description": "一般化線形モデルの二項分布族とリンク関数を表す family オブジェクトを生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "binomial()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "family",
    "category": "モデル",
    "syntax": "family(object, ...)",
    "description": "適合済みモデルや family オブジェクトから family オブジェクトを抽出するジェネリックです。【未対応の理由】familyオブジェクト（関数を含むリスト）を返し、適合済みモデルオブジェクトを前提とするため",
    "example": "family(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Gamma",
    "category": "モデル",
    "syntax": "Gamma(link = \"inverse\")",
    "description": "一般化線形モデルのガンマ分布族とリンク関数を表す family オブジェクトを生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "Gamma()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "gaussian",
    "category": "モデル",
    "syntax": "gaussian(link = \"identity\")",
    "description": "一般化線形モデルの正規分布族とリンク関数を表す family オブジェクトを生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "gaussian()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "inverse.gaussian",
    "category": "モデル",
    "syntax": "inverse.gaussian(link = \"1/mu^2\")",
    "description": "一般化線形モデルの逆正規分布族とリンク関数を表す family オブジェクトを生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "inverse.gaussian()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "poisson",
    "category": "モデル",
    "syntax": "poisson(link = \"log\")",
    "description": "一般化線形モデルのポアソン分布族とリンク関数を表す family オブジェクトを生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "poisson()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "quasi",
    "category": "モデル",
    "syntax": "quasi(link = \"identity\", variance = \"constant\")",
    "description": "一般化線形モデルの準尤度族（リンクと分散関数を直接指定する family オブジェクト）を生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "quasi(link = \"log\", variance = \"mu\")",
    "caution": "quasi では尤度が定義されないため AIC は計算できません。",
    "status": "unsupported"
  },
  {
    "name": "quasibinomial",
    "category": "モデル",
    "syntax": "quasibinomial(link = \"logit\")",
    "description": "一般化線形モデルの準二項分布族を表す family オブジェクトを生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "quasibinomial()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "quasipoisson",
    "category": "モデル",
    "syntax": "quasipoisson(link = \"log\")",
    "description": "一般化線形モデルの準ポアソン分布族を表す family オブジェクトを生成します。【未対応の理由】familyオブジェクトは関数（linkfun／variance等）を含むリストであり、関数値とリスト型が値モデルに無いため",
    "example": "quasipoisson()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "fitted.values",
    "category": "モデル",
    "syntax": "fitted.values(object, ...)",
    "description": "適合済みモデルオブジェクトから適合値を抽出するジェネリックです（fitted の別名です）。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "fitted.values(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.formula",
    "category": "モデル",
    "syntax": "as.formula(object, env = parent.frame())",
    "description": "文字列やオブジェクトを数式オブジェクトへ変換します。【未対応の理由】数式（言語）オブジェクトを生成し、環境を保持するため",
    "example": "as.formula(\"y ~ x\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "DF2formula",
    "category": "モデル",
    "syntax": "DF2formula(x, env = parent.frame())",
    "description": "データフレームの列名から数式オブジェクト（応答 ~ 残りの列）を構築します。【未対応の理由】数式（言語）オブジェクトを生成し、環境を保持するため",
    "example": "DF2formula(d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "formula",
    "category": "モデル",
    "syntax": "formula(x, ...)",
    "description": "モデルオブジェクト等から数式を抽出するジェネリックです。【未対応の理由】数式（言語）オブジェクトを返し、モデルオブジェクト等を前提とするため",
    "example": "formula(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.formula",
    "category": "モデル",
    "syntax": "print.formula(x, showEnv = !identical(e, .GlobalEnv), ...)",
    "description": "数式オブジェクトを表示する print のメソッドです。【未対応の理由】数式（言語）オブジェクトを前提とし、その表示整形に依存するため",
    "example": "print.formula(f)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[.formula",
    "category": "モデル",
    "syntax": "[.formula",
    "description": "数式オブジェクトの添字抽出メソッドです。【未対応の理由】S3のブラケットメソッドであり通常の関数呼び出しの形では使えず、数式オブジェクトにも依存するため",
    "example": "f[2]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "formula.nls",
    "category": "モデル",
    "syntax": "formula.nls(x, ...)",
    "description": "nls オブジェクトから数式を抽出する formula のメソッドです。【未対応の理由】nlsクラスのモデルオブジェクトを前提とし、数式（言語）オブジェクトを返すため",
    "example": "formula(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getInitial",
    "category": "モデル",
    "syntax": "getInitial(object, data, mCall, LHS, ...)",
    "description": "selfStart モデルから初期パラメータ推定値を得るジェネリックです。【未対応の理由】initial属性を持つ selfStart 関数オブジェクトと数式・呼び出しオブジェクトに依存するため",
    "example": "getInitial(SSlogis, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "glm",
    "category": "モデル",
    "syntax": "glm(formula, family = gaussian, data, weights, subset, na.action, start = NULL, etastart, mustart, offset, control = list(...), model = TRUE, method = \"glm.fit\", x = FALSE, y = TRUE, singular.ok = TRUE, contrasts = NULL, ...)",
    "description": "一般化線形モデルを反復重み付き最小二乗で適合します。【未対応の理由】数式オブジェクトを入力とし、関数を含むfamilyオブジェクトやQR分解を含む glmクラス付きモデルオブジェクト（リスト）を生成して返すため",
    "example": "glm(y ~ x, family = binomial, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "weights.glm",
    "category": "モデル",
    "syntax": "weights.glm(object, type = c(\"prior\", \"working\"), ...)",
    "description": "glm の適合から重み（事前重みまたは作業重み）を抽出する weights のメソッドです。【未対応の理由】glmクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "weights(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "glm.control",
    "category": "モデル",
    "syntax": "glm.control(epsilon = 1e-08, maxit = 25, trace = FALSE)",
    "description": "glm の適合の制御パラメータ（収束判定・最大反復回数等）をまとめたリストを返します。【未対応の理由】返り値がリストであり、値モデルにリスト型が無いため（制御リストは glm の内部でのみ意味を持ちます）",
    "example": "glm.control(maxit = 50)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "family.glm",
    "category": "モデル",
    "syntax": "family.glm(object, ...)",
    "description": "glm の適合から family オブジェクトを抽出する family のメソッドです。【未対応の理由】familyオブジェクト（関数を含むリスト）を返し、glmオブジェクトを前提とするため",
    "example": "family(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "residuals.glm",
    "category": "モデル",
    "syntax": "residuals.glm(object, type = c(\"deviance\", \"pearson\", \"working\", \"response\", \"partial\"), ...)",
    "description": "glm の適合から残差を抽出する residuals のメソッドです。【未対応の理由】glmクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "residuals(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cooks.distance",
    "category": "モデル",
    "syntax": "cooks.distance(model, ...)",
    "description": "回帰の削除診断である Cook の距離を計算するジェネリックです。【未対応の理由】lm等の適合済みモデルオブジェクト（とその影響量計算）を前提とするため",
    "example": "cooks.distance(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "cooks.distance.lm",
    "category": "モデル",
    "syntax": "cooks.distance.lm(model, infl = lm.influence(model, do.coef = FALSE), res = weighted.residuals(model), sd = sqrt(deviance(model)/df.residual(model)), hat = infl$hat, ...)",
    "description": "回帰の削除診断である Cook の距離を計算します（lm向けのメソッドです）。【未対応の理由】lmクラスの適合済みモデルオブジェクト（とその影響量計算）を前提とするため",
    "example": "cooks.distance(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "covratio",
    "category": "モデル",
    "syntax": "covratio(model, infl = lm.influence(model, do.coef = FALSE), res = weighted.residuals(model))",
    "description": "回帰の削除診断である共分散比（COVRATIO）を計算します。【未対応の理由】lm等の適合済みモデルオブジェクト（とその影響量計算）を前提とするため",
    "example": "covratio(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dfbeta",
    "category": "モデル",
    "syntax": "dfbeta(model, ...)",
    "description": "各観測を削除したときの係数の変化（DFBETA）を計算します。【未対応の理由】lm等の適合済みモデルオブジェクト（とその影響量計算）を前提とし、結果が行列になるため",
    "example": "dfbeta(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dfbetas",
    "category": "モデル",
    "syntax": "dfbetas(model, ...)",
    "description": "各観測を削除したときの係数の変化の標準化版（DFBETAS）を計算します。【未対応の理由】lm等の適合済みモデルオブジェクト（とその影響量計算）を前提とし、結果が行列になるため",
    "example": "dfbetas(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "dffits",
    "category": "モデル",
    "syntax": "dffits(model, infl = lm.influence(model, do.coef = FALSE), res = weighted.residuals(model))",
    "description": "回帰の削除診断である DFFITS を計算します。【未対応の理由】lm等の適合済みモデルオブジェクト（とその影響量計算）を前提とするため",
    "example": "dffits(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "hat",
    "category": "モデル",
    "syntax": "hat(x, intercept = TRUE)",
    "description": "計画行列からハット行列の対角要素（てこ比）を計算する内部関数です。【未対応の理由】行列を入力としQR分解等の行列演算を前提とするため（値モデルに行列型が無い）",
    "example": "hat(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "hatvalues",
    "category": "モデル",
    "syntax": "hatvalues(model, ...)",
    "description": "線形モデルの適合からてこ比（ハット行列の対角要素）を抽出するジェネリックです。【未対応の理由】lm等の適合済みモデルオブジェクトを前提とするため",
    "example": "hatvalues(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "influence.measures",
    "category": "モデル",
    "syntax": "influence.measures(model, infl = influence(model))",
    "description": "回帰の削除診断（dfbetas／dffits／covratio／Cook距離／てこ比）をまとめた influence.measures クラス付きリストを返します。【未対応の理由】lmクラスの適合済みモデルオブジェクトを前提とし、クラス付きリストを返すため",
    "example": "influence.measures(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rstandard",
    "category": "モデル",
    "syntax": "rstandard(model, ...)",
    "description": "線形モデルの適合から標準化残差を計算するジェネリックです。【未対応の理由】lm等の適合済みモデルオブジェクト（とその影響量計算）を前提とするため",
    "example": "rstandard(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rstudent",
    "category": "モデル",
    "syntax": "rstudent(model, ...)",
    "description": "線形モデルの適合からスチューデント化削除残差を計算するジェネリックです。【未対応の理由】lm等の適合済みモデルオブジェクト（とその影響量計算）を前提とするため",
    "example": "rstudent(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "integrate",
    "category": "数学",
    "syntax": "integrate(f, lower, upper, subdivisions = 100L, rel.tol = .Machine$double.eps^0.25, abs.tol = rel.tol, stop.on.error = TRUE, keep.xy = FALSE, aux = NULL)",
    "description": "1変数関数の区間 [lower, upper] での定積分を適応求積で計算し、積分値と誤差推定等を含む integrate クラス付きリストを返します。【未対応の理由】ユーザ関数 f（関数値）を引数に取ること（関数定義自体がこのエンジンでは未対応）と、クラス付きリストを返すため",
    "example": "integrate(function(x) x, 0, 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.integrate",
    "category": "数学",
    "syntax": "print.integrate(x, digits = getOption(\"digits\"), ...)",
    "description": "integrate の結果を表示する print のメソッドです。【未対応の理由】integrateクラスの結果オブジェクトを前提とし、その表示整形に依存するため",
    "example": "print.integrate(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.empty.model",
    "category": "モデル",
    "syntax": "is.empty.model(x)",
    "description": "terms オブジェクト（モデルの数式）が空かどうかを判定します。【未対応の理由】termsオブジェクトを前提とするため",
    "example": "is.empty.model(terms)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lm",
    "category": "モデル",
    "syntax": "lm(formula, data, subset, weights, na.action, method = \"qr\", model = TRUE, x = FALSE, y = FALSE, qr = TRUE, singular.ok = TRUE, contrasts = NULL, offset, ...)",
    "description": "線形モデルを最小二乗で適合します。【未対応の理由】数式オブジェクトを入力とし、QR分解やモデルフレームを含む lmクラス付きモデルオブジェクト（リスト）を生成して返すため",
    "example": "lm(y ~ x, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.lm",
    "category": "モデル",
    "syntax": "print.lm(x, digits = max(3L, getOption(\"digits\") - 3L), ...)",
    "description": "lm の適合（呼び出しと係数）を表示する print のメソッドです。【未対応の理由】lmクラスのモデルオブジェクトを前提とし、その表示整形に依存するため",
    "example": "print.lm(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "influence",
    "category": "モデル",
    "syntax": "influence(model, ...)",
    "description": "回帰診断のための影響量を計算するジェネリックです。【未対応の理由】適合済みモデルオブジェクトを前提とし、てこ比等を含むリストを返すため",
    "example": "influence(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lm.influence",
    "category": "モデル",
    "syntax": "lm.influence(model, do.coef = TRUE)",
    "description": "lm の適合から影響量（てこ比・削除時の sigma・係数変化）を計算し、リストで返します。【未対応の理由】lmクラスのモデルオブジェクトを前提とし、リストを返すため",
    "example": "lm.influence(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "qr.influence",
    "category": "モデル",
    "syntax": "qr.influence(qr, res, tol = 10 * .Machine$double.eps)",
    "description": "QR分解オブジェクトから影響量を計算する関数として公式ヘルプに記載される名前です。【未対応の理由】実 R 4.3.3 の stats 名前空間に同名の関数は存在しないため（現行の lm.influence は C 実装の C_influence を使います）。加えてQR分解オブジェクト自体も値モデルで表せないため",
    "example": "qr.influence(qrstr)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "family.lm",
    "category": "モデル",
    "syntax": "family.lm(object, ...)",
    "description": "lm の適合から family オブジェクト（gaussian）を返す family のメソッドです。【未対応の理由】familyオブジェクト（関数を含むリスト）を返し、lmオブジェクトを前提とするため",
    "example": "family(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "formula.lm",
    "category": "モデル",
    "syntax": "formula.lm(x, ...)",
    "description": "lm の適合から数式を抽出する formula のメソッドです。【未対応の理由】lmクラスのモデルオブジェクトを前提とし、数式（言語）オブジェクトを返すため",
    "example": "formula(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "labels.lm",
    "category": "モデル",
    "syntax": "labels.lm(object, ...)",
    "description": "lm の適合から項ラベルを返す labels のメソッドです。【未対応の理由】lmクラスのモデルオブジェクト（とその terms オブジェクト）を前提とするため",
    "example": "labels(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "residuals.lm",
    "category": "モデル",
    "syntax": "residuals.lm(object, type = c(\"working\", \"response\", \"deviance\", \"pearson\", \"partial\"), ...)",
    "description": "lm の適合から残差を抽出する residuals のメソッドです。【未対応の理由】lmクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "residuals(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lm.fit",
    "category": "モデル",
    "syntax": "lm.fit(x, y, offset = NULL, method = \"qr\", tol = 1e-07, singular.ok = TRUE, ...)",
    "description": "計画行列 x と応答 y から最小二乗適合を行う低水準フィッタで、QR分解を含むリストを返します。【未対応の理由】行列を入力とし、QR分解オブジェクトを含むリストを返すため（値モデルに行列型・リスト型が無い）",
    "example": "lm.fit(x, y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lm.wfit",
    "category": "モデル",
    "syntax": "lm.wfit(x, y, w, offset = NULL, method = \"qr\", tol = 1e-07, singular.ok = TRUE, ...)",
    "description": "計画行列 x と応答 y の重み付き最小二乗適合を行う低水準フィッタで、QR分解を含むリストを返します。【未対応の理由】行列を入力とし、QR分解オブジェクトを含むリストを返すため（値モデルに行列型・リスト型が無い）",
    "example": "lm.wfit(x, y, w)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".lm.fit",
    "category": "モデル",
    "syntax": ".lm.fit(x, y, tol = 1e-07)",
    "description": "最小二乗適合を行う内部フィッタ（lm.fit の内部実装）です。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず呼び出しに到達できないことに加え、行列入力とQR分解を含むリスト返却のため",
    "example": ".lm.fit(x, y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "logLik",
    "category": "モデル",
    "syntax": "logLik(object, ...)",
    "description": "適合済みモデルオブジェクトの対数尤度を、自由度等の属性を持つ logLik クラス付き数値で返すジェネリックです。【未対応の理由】適合済みモデルオブジェクトを前提とし、属性付きクラスオブジェクトを返すため",
    "example": "logLik(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ls.diag",
    "category": "モデル",
    "syntax": "ls.diag(ls.out)",
    "description": "lsfit の結果から回帰診断量を計算し、リストで返します。【未対応の理由】lsfit結果オブジェクト（リスト）を前提とし、リストを返すため",
    "example": "ls.diag(lsfit(x, y))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ls.print",
    "category": "モデル",
    "syntax": "ls.print(ls.out, digits = 4L, print.it = TRUE)",
    "description": "lsfit の結果を表示します。【未対応の理由】lsfit結果オブジェクト（リスト）を前提とし、その表示整形に依存するため",
    "example": "ls.print(lsfit(x, y))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "lsfit",
    "category": "モデル",
    "syntax": "lsfit(x, y, wt = NULL, intercept = TRUE, tolerance = 1e-07, yname = NULL)",
    "description": "最小二乗適合を行う旧式の関数で、係数・残差・QR分解等を含むリストを返します。【未対応の理由】行列を入力とし、QR分解を含むリストを返すため（値モデルに行列型・リスト型が無い）",
    "example": "lsfit(x, y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "make.link",
    "category": "モデル",
    "syntax": "make.link(link)",
    "description": "リンク関数の名前から、linkfun／linkinv／mu.eta／valideta 等の関数を含むリストを作成します。【未対応の理由】関数を含むリストを返すため（関数値・リスト型が値モデルに無い）",
    "example": "make.link(\"logit\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "makepredictcall",
    "category": "モデル",
    "syntax": "makepredictcall(var, call)",
    "description": "model.frame が予測用の行列を作る際に、項の呼び出しを書き換えるためのジェネリックです。【未対応の理由】言語オブジェクト（call）を引数に取り、言語オブジェクトを返すため",
    "example": "makepredictcall(var, call)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SafePrediction",
    "category": "モデル",
    "syntax": "SafePrediction",
    "description": "makepredictcall のヘルプトピックに併記される「安全な予測（Safe Prediction）」の概念見出しです。【未対応の理由】呼び出し可能な関数ではなくヘルプ上の概念エイリアスであり、stats の名前空間に同名の関数は存在しないため",
    "example": "SafePrediction",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "manova",
    "category": "モデル",
    "syntax": "manova(formula, data = NULL, projections = FALSE, qr = TRUE, contrasts = NULL, ...)",
    "description": "多変量分散分析モデルを適合します（多変量応答版の aov）。【未対応の理由】数式オブジェクトを入力とし、manova／mlmクラス付きモデルオブジェクト（リスト）を生成して返すため",
    "example": "manova(cbind(y1, y2) ~ x, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "model.extract",
    "category": "モデル",
    "syntax": "model.extract(frame, component)",
    "description": "モデルフレームから指定した要素（応答・重み・オフセット等）を抽出します。【未対応の理由】モデルフレーム（terms等の特殊な属性を持つデータフレーム）を前提とするため",
    "example": "model.extract(mf, \"response\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "model.offset",
    "category": "モデル",
    "syntax": "model.offset(x)",
    "description": "モデルフレームからオフセット要素を抽出します。【未対応の理由】モデルフレーム（特殊な属性を持つデータフレーム）を前提とするため",
    "example": "model.offset(mf)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "model.response",
    "category": "モデル",
    "syntax": "model.response(data, type = \"any\")",
    "description": "モデルフレームから応答変数を抽出します。【未対応の理由】モデルフレーム（特殊な属性を持つデータフレーム）を前提とするため",
    "example": "model.response(mf)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "model.weights",
    "category": "モデル",
    "syntax": "model.weights(x)",
    "description": "モデルフレームから重みを抽出します。【未対応の理由】モデルフレーム（特殊な属性を持つデータフレーム）を前提とするため",
    "example": "model.weights(mf)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "get_all_vars",
    "category": "モデル",
    "syntax": "get_all_vars(formula, data = NULL, ...)",
    "description": "数式とデータから、数式に現れる全変数を含むデータフレームを作成します。【未対応の理由】数式オブジェクトと環境での変数解決に依存するため",
    "example": "get_all_vars(y ~ x, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "model.frame",
    "category": "モデル",
    "syntax": "model.frame(formula, ...)",
    "description": "数式や適合済みモデルからモデルフレームを抽出するジェネリックです。【未対応の理由】数式／モデルオブジェクトを前提とし、terms等の特殊な属性を持つモデルフレームを返すため",
    "example": "model.frame(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "model.matrix",
    "category": "モデル",
    "syntax": "model.matrix(object, data = environment(object), contrasts.arg = NULL, xlev = NULL, ...)",
    "description": "数式（termsオブジェクト）から計画行列（デザイン行列）を構築します。【未対応の理由】数式オブジェクトを入力とし、行列を返すため（値モデルに行列型が無い）",
    "example": "model.matrix(~ x, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "model.tables",
    "category": "モデル",
    "syntax": "model.tables(x, type = c(\"effects\", \"means\"), se = FALSE, na.action = na.pass, ...)",
    "description": "aov の適合から効果または平均の表を計算し、リストで返します。【未対応の理由】aovクラスのモデルオブジェクトを前提とし、リストを返すため",
    "example": "model.tables(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "na.action",
    "category": "欠損値",
    "syntax": "na.action(object, ...)",
    "description": "オブジェクトの na.action 属性（欠損値処理の記録）を抽出するジェネリックです。【未対応の理由】属性システムに依存し、値モデルのオブジェクトは na.action 属性を持たないため",
    "example": "na.action(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "na.contiguous",
    "category": "欠損値",
    "syntax": "na.contiguous(object, ...)",
    "description": "時系列オブジェクトから NA でない最長の連続区間を取り出すジェネリックです。【未対応の理由】ts（時系列）クラスオブジェクトを前提とし、値モデルに ts 型が無いため",
    "example": "na.contiguous(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "na.exclude",
    "category": "欠損値",
    "syntax": "na.exclude(object, ...)",
    "description": "欠損を含むケースを除去し、除去した位置を class が \"exclude\" の na.action 属性として結果に保持します（naresid／napredict で NA を詰め戻すための処理です）。【未対応の理由】na.omit との本質的な差異が na.action 属性のクラスそのものであり、その属性と詰め戻し機構を値モデルで表せないため",
    "example": "na.exclude(c(1, NA, 3))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "na.fail",
    "category": "欠損値",
    "syntax": "na.fail(object, ...)",
    "description": "欠損値（NA／NaN）を1つでも含めばエラー \"missing values in object\" にし、含まなければ object をそのまま返します。このモデルではベクトルとデータフレームに対応します。",
    "example": "na.fail(c(1, 2, 3))",
    "caution": "データフレームでは、いずれかの列に欠損を含む行が1つでもあればエラーになります。行列・時系列など値モデルに無い型は対象外です。",
    "status": "supported"
  },
  {
    "name": "na.omit",
    "category": "欠損値",
    "syntax": "na.omit(object, ...)",
    "description": "欠損値（NA／NaN）を含む要素（ベクトル）または行（データフレーム）を除いたオブジェクトを返します。このモデルではベクトルとデータフレームに対応します。",
    "example": "na.omit(c(1, NA, 3))",
    "caution": "実 R では除去した位置が na.action 属性として結果に保持されますが、このモデルでは属性を保持しません（属性を使う napredict／naresid／na.exclude は未対応です）。",
    "status": "supported"
  },
  {
    "name": "na.pass",
    "category": "欠損値",
    "syntax": "na.pass(object, ...)",
    "description": "欠損値があっても何もせず、object をそのまま返します。",
    "example": "na.pass(c(1, NA, 3))",
    "caution": "",
    "status": "supported"
  },
  {
    "name": "napredict",
    "category": "欠損値",
    "syntax": "napredict(omit, x, ...)",
    "description": "na.exclude で除去された位置に NA を詰め戻し、予測値等の長さを元のデータに合わせます。【未対応の理由】第1引数が na.action 属性オブジェクト（クラス付きの整数ベクトル）であり、属性とクラスを値モデルで表せないため",
    "example": "napredict(na, x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "naresid",
    "category": "欠損値",
    "syntax": "naresid(omit, x, ...)",
    "description": "na.exclude で除去された位置に NA を詰め戻し、残差の長さを元のデータに合わせます。【未対応の理由】第1引数が na.action 属性オブジェクト（クラス付きの整数ベクトル）であり、属性とクラスを値モデルで表せないため",
    "example": "naresid(na, x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "naprint",
    "category": "欠損値",
    "syntax": "naprint(x, ...)",
    "description": "na.action 属性オブジェクトを表示するメソッドです。【未対応の理由】na.action 属性オブジェクトを前提とし、その表示整形に依存するため",
    "example": "naprint(na)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nlm",
    "category": "数学",
    "syntax": "nlm(f, p, ..., hessian = FALSE, typsize = rep(1, length(p)), fscale = 1, print.level = 0, ndigit = 12, gradtol = 1e-06, stepmax = max(1000 * sqrt(sum((p/typsize)^2)), 1000), steptol = 1e-06, iterlim = 100, check.analyticals = TRUE)",
    "description": "Newton 型のアルゴリズムで非線形関数を最小化し、最小値・推定値・勾配等を含むリストを返します。【未対応の理由】ユーザ関数 f（関数値）を引数に取ることと、結果をリストで返すため（関数値・リスト型が値モデルに無い）",
    "example": "nlm(f, p = c(0, 0))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nlminb",
    "category": "数学",
    "syntax": "nlminb(start, objective, gradient = NULL, hessian = NULL, ..., scale = 1, control = list(), lower = -Inf, upper = Inf)",
    "description": "PORT ルーチンによる箱型制約付き最適化を行い、推定値・目的関数値等を含むリストを返します。【未対応の理由】ユーザ関数 objective／gradient（関数値）を引数に取ることと、結果をリストで返すため（関数値・リスト型が値モデルに無い）",
    "example": "nlminb(c(0, 0), f)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nls",
    "category": "モデル",
    "syntax": "nls(formula, data = parent.frame(), start, control = nls.control(), algorithm = c(\"default\", \"plinear\", \"port\"), trace = FALSE, subset, weights, na.action, model = FALSE, lower = -Inf, upper = Inf, ...)",
    "description": "非線形最小二乗モデルを適合します。【未対応の理由】数式オブジェクトを入力とし、nlsクラス付きモデルオブジェクト（リスト）を生成して返すため",
    "example": "nls(y ~ SSlogis(x, Asym, xmid, scal), data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nls.control",
    "category": "モデル",
    "syntax": "nls.control(maxiter = 50, tol = 1e-05, minFactor = 1/1024, printEval = FALSE, warnOnly = FALSE, scaleOffset = 0, nDcentral = FALSE)",
    "description": "nls の反復計算の制御パラメータをまとめたリストを返します。【未対応の理由】返り値がリストであり、値モデルにリスト型が無いため（制御リストは nls の内部でのみ意味を持ちます）",
    "example": "nls.control(maxiter = 100)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NLSstAsymptotic",
    "category": "モデル",
    "syntax": "NLSstAsymptotic(xy)",
    "description": "ソート済み xy データから漸近回帰モデルの初期値探索に使う量を計算します。【未対応の理由】sortedXyData（xyVectorクラス）オブジェクトを前提とし、値モデルにその型が無いため",
    "example": "NLSstAsymptotic(xy)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NLSstClosestX",
    "category": "モデル",
    "syntax": "NLSstClosestX(xy, yval)",
    "description": "ソート済み xy データで、y が yval に最も近い点の x を返します（逆補間）。【未対応の理由】sortedXyData（xyVectorクラス）オブジェクトを前提とし、値モデルにその型が無いため",
    "example": "NLSstClosestX(xy, 0.5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NLSstLfAsymptote",
    "category": "モデル",
    "syntax": "NLSstLfAsymptote(xy)",
    "description": "ソート済み xy データから左側の水平漸近値の初期推定を計算します。【未対応の理由】sortedXyData（xyVectorクラス）オブジェクトを前提とし、値モデルにその型が無いため",
    "example": "NLSstLfAsymptote(xy)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NLSstRtAsymptote",
    "category": "モデル",
    "syntax": "NLSstRtAsymptote(xy)",
    "description": "ソート済み xy データから右側の水平漸近値の初期推定を計算します。【未対応の理由】sortedXyData（xyVectorクラス）オブジェクトを前提とし、値モデルにその型が無いため",
    "example": "NLSstRtAsymptote(xy)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nobs",
    "category": "モデル",
    "syntax": "nobs(object, ...)",
    "description": "適合済みモデルオブジェクトから観測数を抽出するジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "nobs(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "numericDeriv",
    "category": "数学",
    "syntax": "numericDeriv(expr, theta, rho = parent.frame(), dir = 1, eps = .Machine$double.eps^(1/if (central) 3 else 2), central = FALSE)",
    "description": "式を数値的に微分し、勾配（行列）の属性付きの数値ベクトルを返します。【未対応の理由】式（言語オブジェクト）と環境を引数に取り、行列の勾配属性を付けて返すため",
    "example": "numericDeriv(quote(x^2), \"x\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "offset",
    "category": "モデル",
    "syntax": "offset(object)",
    "description": "モデル数式の中で、係数を1に固定して線形予測子へ加えるオフセット項を表します。値としては入力をそのまま返します。",
    "example": "offset(c(1, 2, 3))",
    "caution": "数式の中での役割（線形予測子への加算）は、数式自体が未対応のため再現しません。値としての振る舞い（入力をそのまま返すこと）のみ対応します。",
    "status": "supported"
  },
  {
    "name": "optim",
    "category": "数学",
    "syntax": "optim(par, fn, gr = NULL, ..., method = c(\"Nelder-Mead\", \"BFGS\", \"CG\", \"L-BFGS-B\", \"SANN\", \"Brent\"), lower = -Inf, upper = Inf, control = list(), hessian = FALSE)",
    "description": "汎用の最適化を行い、最適点・最適値・収束コード等を含むリストを返します。【未対応の理由】ユーザ関数 fn／gr（関数値）を引数に取ることと、結果をリストで返すため（関数値・リスト型が値モデルに無い）",
    "example": "optim(c(0, 0), f)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "optimHess",
    "category": "数学",
    "syntax": "optimHess(par, fn, gr = NULL, ..., control = list())",
    "description": "最適化のためのヘッセ行列を数値微分で計算し、行列で返します。【未対応の理由】ユーザ関数 fn（関数値）を引数に取ることと、行列を返すため（関数値・行列型が値モデルに無い）",
    "example": "optimHess(c(0, 0), f)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "optimise",
    "category": "数学",
    "syntax": "optimise(f, interval, ..., lower = min(interval), upper = max(interval), maximum = FALSE, tol = .Machine$double.eps^0.25)",
    "description": "1変数関数の区間内での最適化を行い、最適点とその値を含むリストを返します（optimize の別名です）。【未対応の理由】ユーザ関数 f（関数値）を引数に取ることと、結果をリストで返すため（関数値・リスト型が値モデルに無い）",
    "example": "optimise(f, c(0, 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "optimize",
    "category": "数学",
    "syntax": "optimize(f, interval, ..., lower = min(interval), upper = max(interval), maximum = FALSE, tol = .Machine$double.eps^0.25)",
    "description": "1変数関数の区間内での最適化を行い、最適点とその値を含むリストを返します。【未対応の理由】ユーザ関数 f（関数値）を引数に取ることと、結果をリストで返すため（関数値・リスト型が値モデルに無い）",
    "example": "optimize(f, c(0, 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "makepredictcall.poly",
    "category": "モデル",
    "syntax": "makepredictcall.poly(var, call)",
    "description": "poly 項について予測用の呼び出しを書き換える makepredictcall のメソッドです。【未対応の理由】言語オブジェクト（call）を引数・返り値とし、polyオブジェクトの属性にも依存するため",
    "example": "makepredictcall.poly(var, call)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "poly",
    "category": "モデル",
    "syntax": "poly(x, ..., degree = 1, coefs = NULL, raw = FALSE, simple = FALSE)",
    "description": "直交多項式の基底を行列で返します（次数と係数の属性を持つ poly クラス付き行列）。【未対応の理由】返り値が属性付きの行列であり、値モデルに行列型と任意属性が無いため",
    "example": "poly(x, degree = 2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "polym",
    "category": "モデル",
    "syntax": "polym(..., degree = 1, coefs = NULL, raw = FALSE)",
    "description": "複数の変数に対する直交多項式の基底を行列で返します（poly の多変量版）。【未対応の理由】返り値が属性付きの行列であり、値モデルに行列型と任意属性が無いため",
    "example": "polym(x, y, degree = 2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.poly",
    "category": "モデル",
    "syntax": "predict.poly(object, newdata, ...)",
    "description": "poly オブジェクトの係数を使って、新しい x に対する多項式基底を計算する predict のメソッドです。【未対応の理由】polyオブジェクト（係数属性付き行列）を前提とし、行列を返すため",
    "example": "predict(p, newdata = 1:5)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "pairs.profile",
    "category": "モデル",
    "syntax": "pairs.profile(x, ...)",
    "description": "profile オブジェクトのプロファイル対数尤度を対プロットで描画する関数として公式ヘルプに記載される名前です。【未対応の理由】実 R 4.3.3 の stats 名前空間に同名の関数は存在しないため（stats の profile 描画メソッドは plot.profile.nls のみです）。加えて profile オブジェクトとグラフィックス描画を前提とするため",
    "example": "pairs.profile(pr)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.profile",
    "category": "モデル",
    "syntax": "plot.profile(x, ...)",
    "description": "profile オブジェクトのプロファイル対数尤度をプロットする関数として公式ヘルプに記載される名前です。【未対応の理由】実 R 4.3.3 の stats 名前空間に同名の関数は存在しないため（stats の profile 描画メソッドは plot.profile.nls のみです）。加えて profile オブジェクトとグラフィックス描画を前提とするため",
    "example": "plot.profile(pr)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot.profile.nls",
    "category": "モデル",
    "syntax": "plot.profile.nls(x, levels, conf = c(99, 95, 90, 80, 50)/100, absVal = TRUE, ylab = NULL, lty = 2, ...)",
    "description": "nls の profile オブジェクトをプロットします。【未対応の理由】profile.nlsオブジェクトを前提とすることと、グラフィックス描画のため（このエンジンに描画が無い）",
    "example": "plot.profile.nls(pr)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict",
    "category": "モデル",
    "syntax": "predict(object, ...)",
    "description": "適合済みモデルオブジェクトから予測値を計算するジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "predict(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.glm",
    "category": "モデル",
    "syntax": "predict.glm(object, newdata = NULL, type = c(\"link\", \"response\", \"terms\"), se.fit = FALSE, dispersion = NULL, terms = NULL, na.action = na.pass, ...)",
    "description": "glm の適合から予測値を計算する predict のメソッドです。【未対応の理由】glmクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "predict(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.lm",
    "category": "モデル",
    "syntax": "predict.lm(object, newdata, se.fit = FALSE, scale = NULL, df = Inf, interval = c(\"none\", \"confidence\", \"prediction\"), level = 0.95, type = c(\"response\", \"terms\"), terms = NULL, na.action = na.pass, pred.var = res.var/weights, weights = 1, rankdeficient = c(\"warnif\", \"simple\", \"non-estim\", \"NA\", \"NAwarn\"), tol = 1e-06, verbose = FALSE, ...)",
    "description": "lm の適合から予測値（信頼区間・予測区間も可）を計算する predict のメソッドです。【未対応の理由】lmクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "predict(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "predict.nls",
    "category": "モデル",
    "syntax": "predict.nls(object, newdata, se.fit = FALSE, scale = NULL, df = Inf, interval = c(\"none\", \"confidence\", \"prediction\"), level = 0.95, ...)",
    "description": "nls の適合から予測値を計算する predict のメソッドです。【未対応の理由】nlsクラスの適合済みモデルオブジェクトを前提とするため",
    "example": "predict(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "printCoefmat",
    "category": "モデル",
    "syntax": "printCoefmat(x, digits = max(3L, getOption(\"digits\") - 2L), signif.stars = getOption(\"show.signif.stars\"), signif.legend = signif.stars, dig.tst = max(1L, min(5L, digits - 1L)), cs.ind = 1:k, tst.ind = k + 1, zap.ind = integer(), P.values = NULL, has.Pvalue = nc >= 4L && length(cn <- colnames(x)) && substr(cn[nc], 1L, 3L) %in%     c(\"Pr(\", \"p-v\"), eps.Pvalue=.Machine$double.eps, na.print=\"NA\", quote=FALSE, right=TRUE, ...)",
    "description": "係数行列に有意性スター等を付けて表示するための整形表示関数です。【未対応の理由】行列を入力とし、コンソール表示の整形そのものを目的とするため（値モデルに行列型が無い）",
    "example": "printCoefmat(m)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "profile",
    "category": "モデル",
    "syntax": "profile(fitted, ...)",
    "description": "適合済みモデルのプロファイル尤度を計算するジェネリックです。【未対応の理由】適合済みモデルオブジェクトを前提とし、profileクラス付きリストを返すため",
    "example": "profile(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "profile.glm",
    "category": "モデル",
    "syntax": "profile.glm(fitted, which = 1:p, alpha = 0.01, maxsteps = 10, del = zmax/5, trace = FALSE, ...)",
    "description": "glm の適合のプロファイル尤度を計算する profile のメソッドとして公式ヘルプに記載される名前です。【未対応の理由】実 R 4.3.3 の stats 名前空間に同名の関数は存在しないため（stats の profile メソッドは profile.nls のみです）。加えて glm オブジェクトを前提とし、profileクラス付きリストを返すため",
    "example": "profile(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "profile.nls",
    "category": "モデル",
    "syntax": "profile.nls(fitted, which = 1L:npar, maxpts = 100, alphamax = 0.01, delta.t = cutoff/5, ...)",
    "description": "nls の適合のプロファイル尤度を計算します。【未対応の理由】nlsクラスのモデルオブジェクトを前提とし、profileクラス付きリストを返すため",
    "example": "profile(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "proj",
    "category": "モデル",
    "syntax": "proj(object, ...)",
    "description": "線形モデルの適合の射影（各項への射影）を計算するジェネリックです。【未対応の理由】適合済みモデルオブジェクトを前提とし、射影を行列・リストで返すため",
    "example": "proj(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "replications",
    "category": "モデル",
    "syntax": "replications(formula, data = NULL, na.action)",
    "description": "数式の各項の複製数（実験計画のバランス）を調べます。【未対応の理由】数式オブジェクトとデータフレームの組み合わせに依存し、結果の解釈も数式の項構造を前提とするため",
    "example": "replications(y ~ x, data = d)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "resid",
    "category": "モデル",
    "syntax": "resid(object, ...)",
    "description": "適合済みモデルオブジェクトから残差を抽出します（residuals の別名です）。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "resid(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "residuals",
    "category": "モデル",
    "syntax": "residuals(object, ...)",
    "description": "適合済みモデルオブジェクトから残差を抽出するジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "residuals(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "residuals.default",
    "category": "モデル",
    "syntax": "residuals.default(object, ...)",
    "description": "オブジェクトの residuals 要素を取り出す residuals のデフォルトメソッドです。【未対応の理由】モデルオブジェクト（residuals要素を持つリスト）を前提とするメソッドであり、値モデルにモデルオブジェクトが無いため",
    "example": "residuals(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "se.contrast",
    "category": "モデル",
    "syntax": "se.contrast(object, ...)",
    "description": "aov の項に対する対比の標準誤差を計算するジェネリックです。【未対応の理由】aovクラスのモデルオブジェクトを前提とするため",
    "example": "se.contrast(fit, list(x = 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "se.contrast.aov",
    "category": "モデル",
    "syntax": "se.contrast.aov(object, contrast.obj, coef = contr.helmert(ncol(contrast))[, 1L], data = NULL, ...)",
    "description": "aov の項に対する対比の標準誤差を計算します（aov向けのメソッドです）。【未対応の理由】aovクラスのモデルオブジェクトを前提とするため",
    "example": "se.contrast(fit, list(x = 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "selfStart",
    "category": "モデル",
    "syntax": "selfStart(model, initial, parameters, template)",
    "description": "自己開始型の非線形モデル関数（selfStartクラス付き関数オブジェクト）を構築します。【未対応の理由】関数オブジェクトを生成し、initial等の属性を付けるため（関数値と任意属性が値モデルに無い）",
    "example": "selfStart(model, initial, parameters)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sigma",
    "category": "モデル",
    "syntax": "sigma(object, ...)",
    "description": "適合済みモデルオブジェクトから残差標準偏差（sigma）を抽出するジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "sigma(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "simulate",
    "category": "モデル",
    "syntax": "simulate(object, nsim = 1, seed = NULL, ...)",
    "description": "適合済みモデルオブジェクトから応答をシミュレーションし、データフレームまたはリストで返します。【未対応の理由】適合済みモデルオブジェクトを前提とし、乱数生成を含む結果をデータフレーム／リストで返すため",
    "example": "simulate(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSasymp",
    "category": "モデル",
    "syntax": "SSasymp(input, Asym, R0, lrc)",
    "description": "漸近回帰モデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSasymp(x, Asym, R0, lrc)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSasympOff",
    "category": "モデル",
    "syntax": "SSasympOff(input, Asym, lrc, c0)",
    "description": "オフセット付き漸近回帰モデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSasympOff(x, Asym, lrc, c0)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSasympOrig",
    "category": "モデル",
    "syntax": "SSasympOrig(input, Asym, lrc)",
    "description": "原点を通る漸近回帰モデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSasympOrig(x, Asym, lrc)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSbiexp",
    "category": "モデル",
    "syntax": "SSbiexp(input, A1, lrc1, A2, lrc2)",
    "description": "二重指数モデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSbiexp(x, A1, lrc1, A2, lrc2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSfol",
    "category": "モデル",
    "syntax": "SSfol(Dose, input, lKe, lKa, lCl)",
    "description": "一次コンパートメントモデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSfol(Dose, Time, lKe, lKa, lCl)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSfpl",
    "category": "モデル",
    "syntax": "SSfpl(input, A, B, xmid, scal)",
    "description": "4パラメータロジスティックモデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSfpl(x, A, B, xmid, scal)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSgompertz",
    "category": "モデル",
    "syntax": "SSgompertz(x, Asym, b2, b3)",
    "description": "Gompertz 成長モデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSgompertz(x, Asym, b2, b3)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSlogis",
    "category": "モデル",
    "syntax": "SSlogis(input, Asym, xmid, scal)",
    "description": "ロジスティックモデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSlogis(x, Asym, xmid, scal)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSmicmen",
    "category": "モデル",
    "syntax": "SSmicmen(input, Vm, K)",
    "description": "Michaelis-Menten モデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSmicmen(x, Vm, K)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "SSweibull",
    "category": "モデル",
    "syntax": "SSweibull(x, Asym, Drop, lrc, pwr)",
    "description": "Weibull 成長モデルを表す自己開始型モデル関数です（nls の数式として使うと初期値を自動推定します）。【未対応の理由】本体が selfStart クラス付き関数オブジェクトであり、呼び出し結果にも勾配（行列）の属性が付くため、関数値・属性・行列を値モデルで表せない",
    "example": "SSweibull(x, Asym, Drop, lrc, pwr)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stat.anova",
    "category": "モデル",
    "syntax": "stat.anova(table, test = c(\"Rao\", \"LRT\", \"Chisq\", \"F\", \"Cp\"), scale, df.scale, n)",
    "description": "anova.glm が使う逸脱度表の検定統計量を計算する内部関数です。【未対応の理由】anova表オブジェクトと glm 適合の文脈を前提とする内部関数のため",
    "example": "stat.anova(tab)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "step",
    "category": "モデル",
    "syntax": "step(object, scope, scale = 0, direction = c(\"both\", \"backward\", \"forward\"), trace = 1, keep = NULL, steps = 1000, k = 2, ...)",
    "description": "AIC による段階的なモデル選択を行い、選択されたモデルオブジェクトを返します。【未対応の理由】適合済みモデルオブジェクトと scope（数式オブジェクト）を前提とし、モデルオブジェクトを返すため",
    "example": "step(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.summary.aov",
    "category": "モデル",
    "syntax": "print.summary.aov(x, digits = max(3L, getOption(\"digits\") - 3L), symbolic.cor = FALSE, signif.stars = getOption(\"show.signif.stars\"), ...)",
    "description": "aov の要約オブジェクトを表示する print のメソッドです。【未対応の理由】summary.aovクラス付きリストを前提とし、その表示整形に依存するため",
    "example": "print.summary.aov(s)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.aov",
    "category": "モデル",
    "syntax": "summary.aov(object, intercept = FALSE, split, expand.split = TRUE, keep.zero.df = TRUE, ...)",
    "description": "aov の適合の要約（分散分析表）を summary.aov クラス付きリストで返します。【未対応の理由】aovクラスのモデルオブジェクトを前提とし、クラス付きリストを返すため",
    "example": "summary(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.summary.glm",
    "category": "モデル",
    "syntax": "print.summary.glm(x, digits = max(3L, getOption(\"digits\") - 3L), symbolic.cor = x$symbolic.cor, signif.stars = getOption(\"show.signif.stars\"), show.residuals = FALSE, ...)",
    "description": "glm の要約オブジェクトを表示する print のメソッドです。【未対応の理由】summary.glmクラス付きリストを前提とし、その表示整形に依存するため",
    "example": "print.summary.glm(s)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.glm",
    "category": "モデル",
    "syntax": "summary.glm(object, dispersion = NULL, correlation = FALSE, symbolic.cor = FALSE, ...)",
    "description": "glm の適合の要約を summary.glm クラス付きリストで返します。【未対応の理由】glmクラスのモデルオブジェクトを前提とし、クラス付きリストを返すため",
    "example": "summary(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.summary.lm",
    "category": "モデル",
    "syntax": "print.summary.lm(x, digits = max(3L, getOption(\"digits\") - 3L), symbolic.cor = x$symbolic.cor, signif.stars = getOption(\"show.signif.stars\"), ...)",
    "description": "lm の要約オブジェクトを表示する print のメソッドです。【未対応の理由】summary.lmクラス付きリストを前提とし、その表示整形に依存するため",
    "example": "print.summary.lm(s)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.lm",
    "category": "モデル",
    "syntax": "summary.lm(object, correlation = FALSE, symbolic.cor = FALSE, ...)",
    "description": "lm の適合の要約を summary.lm クラス付きリストで返します。【未対応の理由】lmクラスのモデルオブジェクトを前提とし、クラス付きリストを返すため",
    "example": "summary(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.summary.manova",
    "category": "モデル",
    "syntax": "print.summary.manova(x, digits = getOption(\"digits\"), ...)",
    "description": "manova の要約オブジェクトを表示する print のメソッドです。【未対応の理由】summary.manovaクラス付きリストを前提とし、その表示整形に依存するため",
    "example": "print.summary.manova(s)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.manova",
    "category": "モデル",
    "syntax": "summary.manova(object, test = c(\"Pillai\", \"Wilks\", \"Hotelling-Lawley\", \"Roy\"), intercept = FALSE, tol = 1e-07, ...)",
    "description": "manova の適合の要約を summary.manova クラス付きリストで返します。【未対応の理由】manovaクラスのモデルオブジェクトを前提とし、クラス付きリストを返すため",
    "example": "summary(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.summary.nls",
    "category": "モデル",
    "syntax": "print.summary.nls(x, digits = max(3L, getOption(\"digits\") - 3L), symbolic.cor = x$symbolic.cor, signif.stars = getOption(\"show.signif.stars\"), ...)",
    "description": "nls の要約オブジェクトを表示する print のメソッドです。【未対応の理由】summary.nlsクラス付きリストを前提とし、その表示整形に依存するため",
    "example": "print.summary.nls(s)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.nls",
    "category": "モデル",
    "syntax": "summary.nls(object, correlation = FALSE, symbolic.cor = FALSE, ...)",
    "description": "nls の適合の要約を summary.nls クラス付きリストで返します。【未対応の理由】nlsクラスのモデルオブジェクトを前提とし、クラス付きリストを返すため",
    "example": "summary(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "termplot",
    "category": "モデル",
    "syntax": "termplot(model, data = NULL, envir = environment(formula(model)), partial.resid = FALSE, rug = FALSE, terms = NULL, se = FALSE, xlabs = NULL, ylabs = NULL, main = NULL, col.term = 2, lwd.term = 1.5, col.se = \"orange\", lty.se = 2, lwd.se = 1, col.res = \"gray\", cex = 1, pch = par(\"pch\"), col.smth = \"darkred\", lty.smth = 2, span.smth = 2/3, ask = dev.interactive() && nb.fig < n.tms, use.factor.levels = TRUE, smooth = NULL, ylim = \"common\", plot = TRUE, transform.x = FALSE, ...)",
    "description": "回帰モデルの各項の部分効果をプロットします。【未対応の理由】適合済みモデルオブジェクトを前提とすることと、グラフィックス描画のため（このエンジンに描画が無い）",
    "example": "termplot(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "labels.terms",
    "category": "モデル",
    "syntax": "labels.terms(object, ...)",
    "description": "terms オブジェクトから項ラベルを返す labels のメソッドです。【未対応の理由】termsオブジェクトを前提とするため",
    "example": "labels(terms)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "terms",
    "category": "モデル",
    "syntax": "terms(x, ...)",
    "description": "数式から terms オブジェクトを構築、またはモデルオブジェクトから terms を抽出するジェネリックです。【未対応の理由】termsオブジェクトは項と属性（dataClasses／predvars等）を保持する言語由来のオブジェクトであり、値モデルで表せないため",
    "example": "terms(f)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "terms.formula",
    "category": "モデル",
    "syntax": "terms.formula(x, specials = NULL, abb = NULL, data = NULL, neg.out = TRUE, keep.order = FALSE, simplify = FALSE, ..., allowDotAsName = FALSE)",
    "description": "数式から terms オブジェクトを構築する terms のメソッドです。【未対応の理由】termsオブジェクトは項と属性（dataClasses／predvars等）を保持する言語由来のオブジェクトであり、値モデルで表せないため",
    "example": "terms(f)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "terms.object",
    "category": "モデル",
    "syntax": "terms.object",
    "description": "terms オブジェクト（数式から作られる項情報オブジェクト）の構造を説明する文書トピックです。【未対応の理由】文書見出しであり、呼び出し可能な同名の関数は存在しないため",
    "example": "terms.object",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "uniroot",
    "category": "数学",
    "syntax": "uniroot(f, interval, ..., lower = min(interval), upper = max(interval), f.lower = f(lower, ...), f.upper = f(upper, ...), extendInt = c(\"no\", \"yes\", \"downX\", \"upX\"), check.conv = FALSE, tol = .Machine$double.eps^0.25, maxiter = 1000, trace = 0)",
    "description": "1変数関数の根（零点）を区間内で Brent 法により求め、根・関数値・反復回数等を含むリストを返します。【未対応の理由】ユーザ関数 f（関数値）を引数に取ることと、結果をリストで返すため（関数値・リスト型が値モデルに無い）",
    "example": "uniroot(f, c(0, 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getCall",
    "category": "モデル",
    "syntax": "getCall(x, ...)",
    "description": "モデルオブジェクトから適合時の呼び出し（callオブジェクト）を抽出するジェネリックです。【未対応の理由】言語オブジェクト（call）を返し、適合済みモデルオブジェクトを前提とするため",
    "example": "getCall(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "update",
    "category": "モデル",
    "syntax": "update(object, formula., ..., evaluate = TRUE)",
    "description": "モデルオブジェクトの呼び出しを更新し、再適合します。【未対応の理由】呼び出し（言語）オブジェクトの書き換えと環境での再評価に依存し、モデルオブジェクトを返すため",
    "example": "update(fit, ~ . + z)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "update.formula",
    "category": "モデル",
    "syntax": "update.formula(old, new, ...)",
    "description": "数式オブジェクトを別の数式で更新します（. は旧数式の辺を表します）。【未対応の理由】数式（言語）オブジェクト同士の操作のため",
    "example": "update.formula(f, y ~ . + z)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "vcov",
    "category": "モデル",
    "syntax": "vcov(object, ...)",
    "description": "適合済みモデルオブジェクトのパラメータの分散共分散行列を返すジェネリックです。【未対応の理由】適合済みモデルオブジェクトを前提とし、行列を返すため（値モデルに行列型が無い）",
    "example": "vcov(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "vcov.lme",
    "category": "モデル",
    "syntax": "vcov(object, ...)",
    "description": "vcov の lme 向けメソッドは nlme パッケージ側に定義されるもので、stats の名前空間には存在しません。【未対応の理由】stats の名前空間に同名の関数は存在しないため（nlme のメソッドであり、本カタログの対象パッケージ外）",
    "example": "vcov(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "vcov.summary.lm",
    "category": "モデル",
    "syntax": "vcov.summary.lm(object, complete = TRUE, ...)",
    "description": "summary.lm オブジェクトから分散共分散行列を計算する vcov のメソッドです。【未対応の理由】summary.lmクラス付きリストを前提とし、行列を返すため",
    "example": "vcov(s)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".vcov.aliased",
    "category": "モデル",
    "syntax": ".vcov.aliased(aliased, vc, complete = TRUE)",
    "description": "エイリアスされた（推定できない）係数がある場合に、分散共分散行列へ NA の行と列を追加する補助関数です。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず呼び出しに到達できないことに加え、行列を引数・返り値とするため",
    "example": ".vcov.aliased(aliased, vc)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "weighted.residuals",
    "category": "モデル",
    "syntax": "weighted.residuals(obj, drop0 = TRUE)",
    "description": "lm／glm オブジェクトから重み付き残差を計算します。【未対応の理由】モデルオブジェクト（残差と重みの要素を持つリスト）を前提とするため",
    "example": "weighted.residuals(fit)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "weights",
    "category": "モデル",
    "syntax": "weights(object, ...)",
    "description": "モデルオブジェクト等から重みを抽出するジェネリックです。【未対応の理由】適合済みモデルオブジェクトへのS3ディスパッチに本質的に依存し、値モデルで表せないため",
    "example": "weights(fit)",
    "caution": "",
    "status": "unsupported"
  }
];
