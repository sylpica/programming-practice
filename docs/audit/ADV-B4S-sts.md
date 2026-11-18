# ADV-B4S sts 班報告書（R stats：時系列・平滑化）

## 1. 担当範囲と内訳

- 担当スライス：`b4s-notes/slice-sts.json` の **65 トピック／127 名**（stats の時系列・平滑化領域）。
- 内訳（名前単位）：**対応 9／未対応 118／未検証 0**。
- 成果物：
  - `js/types/r/reference-advanced-part7.js`（127 項目、スライス順に全名ちょうど 1 項目ずつ）
  - `js/types/r/names-advanced-part7.js`（122 名。除外 5 件は §4）
  - `js/types/r/functions-advanced-statsts.js`（ハンドラ 9 件のみ登録）
  - `tests/adv-b4s-sts.test.js`（20 件、全合格）

## 2. 実装した 9 関数と照合根拠

いずれも実 R 4.3.3（/usr/bin/Rscript）の実走と、R 本体の関数ソース（stats/R および stats/src のダンプ）の移植で意味論を確定した。

| 関数 | 照合根拠 |
|---|---|
| diffinv | diffinv.default／diffinv.vector のソースをダンプして移植。differences>1 の再帰（diff(xi) 経由）までソースどおり。実測 6 ケース＋ランダム突合 |
| bw.nrd0 | ソース移植。フォールバック連鎖（sd→\|x[1]\|→1）と NaN 時の if(NA) エラーまで実測再現 |
| bw.nrd | ソース移植（フォールバックなし）。IQR は quantile type 7 |
| runmed | R ラッパー（runmed.R）移植＋C の中央値更新は実走で確定。ヘルプ例データ（41 点）で endrule 3 種とも全値一致。constant 端規則は「最も近い内部平滑値」と等価であることを 3 データセットで確認 |
| smooth | stats/src/smooth.c 全行と smooth.R ラッパーを移植（sm_3R の iter 意味論、split 規則、do.ends の符号規約まで）。全 kind×endrule×do.ends×twiceit をランダム突合 |
| smoothEnds | runmed.R 内ソースを完全移植。med.3／med3i の NA 扱い（欠損を除いた平均）、med.odd の下側中央値まで再現。ヘルプの stopifnot 例で一致 |
| ARMAacf | ソース移植。B&D (3.3.8) の線形方程式＋再帰、pacf は Durbin–Levinson。閉形式（ARMA(2,1) の (1+3n)·2^-n 系）と一致。MA 専用分岐が lag.max<q で切り捨てない癖、lag.max=0 の名前 NA の癖、係数 NA の伝播／filter 停止条件まで実測再現 |
| ARMAtoMA | C の漸化式 ψ_j = θ_j + Σφ_i ψ_{j-i} を移植。閉形式と一致 |
| spec.taper | ソース移植。p の検証順序、m=0 の素通り（文字列でも素通り）まで実測再現 |

差分検証ハーネス（成果物には含めない）：ランダム入力 **313 ケース**（runmed／smoothEnds／smooth／diffinv／bw／ARMAacf／ARMAtoMA／spec.taper）を JS 実装と Rscript で突き合わせ、**全件一致**（整数結果は完全一致、浮動小数は相対 1e-9〜1e-12 以内）。

属性の扱い（正直な限定）：実 R は runmed の結果に属性 k を、smooth の結果に tukeysmooth クラスと反復情報の属性を付ける。値モデルに属性付き数値ベクトルの表現が無いため、本実装は**値（数値ベクトル）のみ**を返し、その旨を各項目の caution に明記した。

## 3. 未対応 118 件の理由類型内訳

リファレンス各項目の description に明記した理由文からの機械集計（合計 118）。

| 件数 | 類型 | 該当名 |
|---:|---|---|
| 42 | ts クラス／tsp 属性・適合オブジェクト依存（属性系、ts 演算、適合系のメソッド類） | print.HoltWinters, residuals.HoltWinters, predict.StructTS, print.StructTS, ar.burg, ar.burg.default, ar.mle, ar.yw, ar.yw.default, predict.ar, print.ar, ar.ols, predict.arima0, print.arima0, filter, lag, residuals.tukeyline, predict.HoltWinters, predict.Arima, predict.loess, end, start, knots, print.stepfun, summary.stepfun, summary.stl, cycle, deltat, frequency, time, time.default, as.ts, Ops.ts, ts, diff.ts, na.omit.ts, ts.intersect, ts.union, tsSmooth, hasTsp, tsp, window |
| 30 | リストを返す／リスト表現（状態空間モデル等）に依存 | HoltWinters, KalmanForecast, KalmanLike, KalmanRun, KalmanSmooth, makeARIMA, StructTS, acf, ccf, pacf, ar, arima, arima0, approx, decompose, density, ksmooth, line, loess, loess.control, lowess, predict.smooth.spline, spectrum, spec.ar, spline, smooth.spline, stl, supsmu, isoreg, loess.smooth |
| 18 | グラフィックス（描画専用／描画メソッド） | cpgram, plot.decomposed.ts, plot.tskernel, lag.plot, monthplot, plot.HoltWinters, plot.acf, plot.density, lines.isoreg, plot.isoreg, lines.stepfun, plot.stepfun, lines.ts, plot.ts, plot.stl, ts.plot, tsdiag, scatter.smooth |
| 6 | tskernel オブジェクト依存（生成手段自体が未対応） | bandwidth.kernel, df.kernel, is.tskernel, kernel, kernapply, spec.pgram |
| 5 | 関数オブジェクトを返す／必要とする | approxfun, splinefun, splinefunH, as.stepfun, stepfun |
| 4 | 行列型が値モデルに無い | acf2AR, embed, cbind.ts, t.ts |
| 3 | C 実装の数式を一次情報で確定できない | bw.bcv, bw.SJ, bw.ucv |
| 3 | 実在しない関数（文書上の別名・内部実装） | spec, head.ts, tail.ts |
| 3 | クラスが存在せず常に FALSE になる述語 | is.stepfun, is.mts, is.ts |
| 3 | ドット・ブラケット名でパーサ到達不能 | [.acf, [.ts, .nknots.smspl |
| 1 | 乱数生成と ts クラスの併存 | arima.sim |

個別の裁定メモ：

- **filter**：数値列自体は再現可能だが、実 R は素の数値ベクトル入力でも tsp 属性を持つ ts を返す（実測：filter(1:5, rep(1,3)) は tsp c(1,5,1) 付き）。時刻のずれを含む ts としての意味論を属性なしの値で表すと虚偽になるため未対応とした。
- **lag**：効果が tsp のシフトのみで値が不変（実測）。恒等実装は意味を偽るため未対応。
- **time／start／end 等の属性系**：属性のないベクトルに対して実 R が返す既定値（c(1,1) 等）は再現できるが、それを「対応」と数えるのは水増しに当たるため未対応とした（B4 の is.* 述語の裁定と同方針）。
- **bw.ucv／bw.bcv／bw.SJ**：ビニング済み密度に対する C 実装（bw_ucv／bw_bcv／bw_phi4／bw_phi6）の数式がヘルプに無く、C ソースの取得もできなかった。最適化の収束先を含む数値を忠実に再現できないため名指し停止（参考実測値：bw.ucv(1:10)=2.1753、bw.bcv=2.1781、bw.SJ(ste)=2.4377）。
- **runmed の NA**：NA／NaN を含む入力は C 実装の ±Big 置換と中央値更新の相互作用で結果が決まり、ヘルプ記述（na.omit は欠損除去と等価）と C の実挙動（長さを保持し欠損が残る）が矛盾する（実走確認）。よって na.action="fail" は実 R の正確な文言で停止、それ以外は名指し停止とし、NA の無い入力のみ完全実装した。
- **.nknots.smspl**：意味論はソース移植で確定し数値も検証済みだが、ドット始まりの識別子を共有パーサが受理せず呼び出しに到達できない。B4 の確定方針（到達不能ハンドラは登録せず項目を未対応化。ADV-B4-REPORT §6）に倣い、ハンドラはファイル内に注記付きで残置し builtins には登録していない。パーサが対応すれば即昇格できる。

## 4. names キュレーション（除外 5 件）

| 名前 | 除外理由 |
|---|---|
| [.acf | S3 ブラケットメソッド（識別子として受理されない） |
| [.ts | S3 ブラケットメソッド（同上） |
| spec | R 4.3.3 の stats 名前空間に存在しない（spectrum の文書別名。実走確認） |
| head.ts | stats／utils 名前空間に存在しない（head の ts 処理は内部実装。実走確認） |
| tail.ts | stats／utils 名前空間に存在しない（同上） |

除外名についてもリファレンス項目は作り、理由を明記した（項目 127 件＝スライス全名）。

## 5. 検証記録

- 担当テスト `tests/adv-b4s-sts.test.js`：**20 件全合格**（データ整合 5 件＋ハンドラ直接検証 15 件。fake ctx 方式は .bincode の前例に倣った。期待値は実 R 実測）。
- 差分ハーネス：313 ケース全件一致（§2）。
- 一時配線（functions／names 集約へ自班分のみ）した状態で simulate 経由の動作も確認済み。検証後は集約ファイルを HEAD 状態へ復元した（配線はコーディネーターの統合工程）。
- 関連既存テスト：`tests/adv-b4-*.test.js`（eng1–4／audit-r／content／data1–2）、`tests/adv-b4s-*.test.js`（他班）、`tests/muse-fix-batch*-r.test.js` 等を回帰確認。一時配線の部分状態では audit-r の到達可能性チェックが 1 件落ちるが、これは「names と builtins のみ配線し reference を配線していない」人工的な中間状態によるもので、HEAD 素の状態では audit-r は 15 件全合格に戻ることを確認した。
- 既存の失敗 1 件（自班と無関係）：`muse-fix-batch13-r.test.js` の「B13-R unknown function with unknown argument still names the function」（readline の未確定値まわり）は、HEAD 素の状態・自班ファイル未取込の条件でも再現する事前存在の失敗であり、本班の変更によるものではない。

## 6. 残存・未確認事項

1. **bw.ucv／bw.bcv／bw.SJ**：C ソース（bandwidth.c）が取得できれば数式を確定して昇格できる可能性がある。現状は名指し停止が正直な上限。
2. **runmed の NA スコープ**：na.action の各方式での C の欠損伝播を完全再現するには runmed.c の移植が要る。現状は「fail のみ実 R 文言で停止、それ以外は名指し停止」。
3. **smoothEnds の病理コーナー**：k2>=3 かつ窓が系列長に対して大きい非対称ケース（右端添字がちょうど境界に触れる場合）は実 R の添字規則の近似として実装し、負正混在になる場合は実 R の文言で停止する。ランダム突合の範囲では不一致は出ていない。
4. **spec.taper のデータフレーム／行列入力**：実 R は行列にも適用できるが、値モデルに行列が無いため名指し停止とした（ベクトル入力は完全対応）。
5. **ARMAacf の病理**：(a) 特異系では実 R は LAPACK の詳細文言（U[i,i] の位置付き）を出すが、本実装は "system is exactly singular" で停止する（停止自体は一致）。(b) 文字列係数で r=1 短絡になる入力では実 R が文字列をそのまま返す病理があるが、本実装は数値必須で停止する。(c) lag.max=0 かつ pacf=TRUE では実 R 4.3.3 が segfault する（C_pacf1 のバグ）ため突合不能。本実装は空ベクトルを返す。
6. **属性の非再現**：runmed の属性 k、smooth の tukeysmooth クラス／反復情報は返さない（§2）。値そのものは一致する。
7. **.nknots.smspl の昇格条件**：共有パーサがドット始まり識別子を受理するようになった場合に、残置した実装を登録して supported にできる（判断はコーディネーター）。
