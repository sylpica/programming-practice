// 高度モード B4S：R 高度カタログ名前一覧 part9（utils データ操作・入出力）。
// FUNCTION_NAMES へ統合されるため、実在する「関数名」だけを収録する。
// 収録基準は実 R 4.3.3 の utils 名前空間で関数として存在すること
// （Rscript で機械確認済み。報告書 docs/audit/ADV-B4S-udata.md）。
// 除外：.checkHT（4.3.3 の名前空間に存在しない。内部関数 checkHT のみ）、
// .romans（関数ではなく名前付き文字ベクトルのデータオブジェクト）。
export const names = [
  "URLdecode",
  "URLencode",
  "adist",
  "aregexec",
  "capture.output",
  "combn",
  "compareVersion",
  "count.fields",
  "data",
  "print.packageIQR",
  "file_test",
  "glob2rx",
  "hasName",
  "head",
  "tail",
  "modifyList",
  "read.DIF",
  "read.fortran",
  "read.fwf",
  "read.table",
  "as.relistable",
  "is.relistable",
  "relist",
  "unlist.relistable",
  "as.roman",
  "Ops.roman",
  "Summary.roman",
  "stack",
  "unstack",
  "str",
  "strOptions",
  "strcapture",
  "type.convert",
  "type.convert.default",
  "write.table",
];
