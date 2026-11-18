# ADV-B4S sdesc 班報告書（R stats：記述統計・集計）

## 1. 担当範囲と分母

- 担当スライス：`work/b4s-notes/slice-sdesc.json`（20トピック／33名）。
- 成果物（新規作成のみ。既存ファイルの編集・コミット・GitHub 書き込みはなし）：
  - `js/types/r/reference-advanced-part4.js`（33項目）
  - `js/types/r/names-advanced-part4.js`（33名）
  - `js/types/r/functions-advanced-statsdesc.js`（ハンドラ12件）
  - `tests/adv-b4s-sdesc.test.js`（17テスト）
- 内訳（名前単位）：**対応 12／未対応 21／未検証 0**。

## 2. 対応した12件と照合根拠

いずれも実 R 4.3.3（`/usr/bin/Rscript`）の実測を正とし、公式ヘルプ
（stat.ethz.ch R-manual、stats パッケージ）の Usage・引数仕様と、
必要に応じて R 公式ソースで裏付けた。

| 名前 | 実装の要点 | 照合根拠 |
|---|---|---|
| var | use の pmatch（前方一致）、use 明示時は na.rm 無視、文字列の C 変換（coerceVector 相当＋警告） | 実測＋公式ソース stats/R/cor.R・src/main/cov.c |
| cov | cor と同じエンジン。kendall は未正規化の 2(C−D)、spearman は順位の共分散 | 実測（kendall 実測値 4／タイ時 8）＋cov.c |
| cor | kendall は tau-b（タイ補正分母）、spearman は順位の pearson 相関、標準偏差0で NA＋警告 | 実測＋cor.R |
| quantile | type 1〜9 全型式を原典の算法どおり実装。名前は format_perc（digits 桁）近似。文字ベクトルは補間が要る場合のみエラー | 実測（9型式×5分位の全値）＋公式ソース quantile.R |
| IQR | as.numeric 変換後に quantile の diff（type 引継ぎ） | 実測＋quantile.R |
| fivenum | n4＝floor((n+3)/2)/2 のヒンジ算法。na.rm 既定 TRUE | 実測 |
| mad | constant 既定 1.4826、low／high 補正。low&high 両方 TRUE は偶数 n のみエラー（奇数 n では正常） | 実測（偶奇で分けて確認） |
| weighted.mean | sum((x*w)[w != 0])/sum(w)。重み0要素の除外、na.rm は x のペアのみ除去 | 実測＋公式ソース weighted.mean.R |
| weighted.mean.default | 上と同じ意味論（下記5節参照） | 実測（stats::: 経由） |
| complete.cases | 複数引数・データフレーム行単位。長さ不一致と入力なしは実 R の文言でエラー | 実測 |
| setNames | names<- 意味論。短い nm は NA 埋め、長い nm はエラー、object 省略時は nm 自体が対象 | 実測 |
| ave | FUN は文字列指定のみ（sum／mean／median／min／max／length／sd／seq_along／range）。グループ化変数が欠損の要素は単独グループ。FUN 結果は split<- 意味論でリサイクル | 実測（NA グループ・range リサイクル等） |

## 3. 未対応21件と理由の類型

全件、リファレンスの description に理由を名指しで明記した。

- 関数オブジェクトを返す／それに依存（5件）：ecdf、plot.ecdf、print.ecdf、quantile.ecdf、summary.ecdf
- 行列・表（dim 属性）オブジェクトを表せない（3件）：cov2cor、addmargins、および ftable 系の基盤
- class "ftable"（行列＋属性）を表せない（5件）：ftable、as.table.ftable、ftable.formula、format.ftable、print.ftable
- ファイル入出力＋ftable クラス（2件）：read.ftable、write.ftable
- 数式オブジェクト依存＋class つき配列（2件）：xtabs、print.xtabs
- 名前付きリストを返す（1件）：cov.wt
- 因子オブジェクトを表せない（2件）：relevel、reorder（reorder は "scores" 属性も使う）
- リスト／数式／因子水準に意味論が依存し部分実装になる（1件）：aggregate（by のリスト形式、数式メソッド、simplify／drop の因子依存。部分的に正しくなる実装はしない方針で未対応）
- データフレーム再構成を忠実に表せない（1件）：reshape（varying のリスト形式、"reshapeWide"／"reshapeLong" 属性による反転操作）

データフレーム入力の var／cov／cor（行列を返す形）も、名前自体は対応としつつ、その入力形だけを名指しでエラーにしている。

## 4. テスト

- `tests/adv-b4s-sdesc.test.js`：17テスト全緑。
- 内訳：データ整合5件（分母・内訳・正規形・名前の重複機械照合・ハンドラ登録範囲）、ハンドラ検証12件（F-01 分類：典型／境界／異常／組み合わせ）。
- ハンドラは集約ファイルへの配線前（配線はコーディネーター担当）のため、stest 班・.bincode の前例と同じく fake ctx で直接検証した。期待値は実 R の出力（%.17g）を採取したもの。
- quantile は type 1〜9 の全型式を実測値と突き合わせた。var／cov／cor は use の各値・kendall／spearman・pairwise・空データ・エラー文言まで実測で固定した。

## 5. 名前キュレーション

- 実 R 4.3.3 の `getNamespace("stats")` で33名全てが関数として実在することを機械確認したため、names は33名全件収録（除外なし）。
- うち9件（print.ecdf、quantile.ecdf、summary.ecdf、as.table.ftable、ftable.formula、format.ftable、print.ftable、print.xtabs、weighted.mean.default）はエクスポートされていない内部名（S3 メソッド）。
- weighted.mean.default のみ対応側：実 R では `stats:::weighted.mean.default` として実在する既定メソッドであり、シミュレータは名前で登録する方式のため、既定メソッドの意味論をそのまま実装した（リファレンスにも未エクスポートである旨を明記）。

## 6. 残存・逸脱（意図的に取った判断）

- quantile の名前（パーセント表示）：formatC の "fg" 書式を Number の precision 変換で近似した。通常の確率では実測と一致するが、ごく小さい確率（1e-5% 級）では末尾の表記が実 R と異なることがある。
- quantile の type 不正値（0、2.5、10 等）：実 R では未定義動作や内部エラーになるため、1〜9 の整数以外は "'type' must be in 1:9" で名指しエラーにした（逸脱として明記）。
- quantile の fuzz 仮引数：R 4.3.3 の実測では `...` で無視されるが、R-devel のヘルプ Usage にあるため受理して算法に使う形にした。
- weighted.mean／ave のデータフレーム入力：実 R では列数基準の degenerate な動作になるが、意味のある計算ではないため名指しでエラーにした。
- ave の警告回数：グループ化変数のリサイクル警告は実 R では複数回出る場合があるが、本実装では1回にまとめた（値そのものは一致）。
- mad の center に長いベクトルを渡した場合のリサイクル細部（結果長が max になる形）は実装したが、実測で固定したのは警告文言と代表ケースのみ。

## 7. 作業上の注意（統合担当向け）

- 大きなファイルの新規書き込み時に、文字列「未対応の理由」を角括弧で囲んだ形が書き込み経路で除去される現象を確認した。本班では edit による再挿入で復旧し、リファレンス内に21件（未対応全件）あることを機械確認済み。統合時に他班の成果物をマージする際は、同マーカーの件数を数えて確認することを推奨する。
