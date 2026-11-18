// 高度モード B4S：R 関数名キュレーション「記述統計・集計」（stats）。
// 担当スライス33名は全て実 R 4.3.3 の stats 名前空間に実在することを
// getNamespace("stats") で機械確認したため、除外なしで全件収録する。
// うち print.ecdf／quantile.ecdf／summary.ecdf／as.table.ftable／
// ftable.formula／format.ftable／print.ftable／print.xtabs／
// weighted.mean.default の9件はエクスポートされていない内部名
// （S3 メソッド）だが、関数として実在する（報告書 ADV-B4S-sdesc.md）。
export const names = [
  "addmargins",
  "aggregate",
  "ave",
  "complete.cases",
  "cor",
  "cov",
  "cov2cor",
  "var",
  "cov.wt",
  "ecdf",
  "plot.ecdf",
  "print.ecdf",
  "quantile.ecdf",
  "summary.ecdf",
  "as.table.ftable",
  "ftable",
  "ftable.formula",
  "format.ftable",
  "print.ftable",
  "read.ftable",
  "write.ftable",
  "fivenum",
  "IQR",
  "mad",
  "quantile",
  "weighted.mean",
  "weighted.mean.default",
  "print.xtabs",
  "xtabs",
  "setNames",
  "relevel",
  "reorder",
  "reshape",
];
