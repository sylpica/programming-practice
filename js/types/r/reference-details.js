// Return contracts and primary documentation for the supported teaching subset.
export const referenceDetails = {
  "c": {
    "returns": "共通の型へ変換したベクトル。引数なしはNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/c.html"
  },
  "sum": {
    "returns": "長さ1の合計値（空集合の合計は0）",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/sum.html"
  },
  "mean": {
    "returns": "長さ1の平均値。数値でも論理値でもない引数は警告とNA",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/mean.html"
  },
  "median": {
    "returns": "長さ1の中央値、値がない場合はNA",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/median.html"
  },
  "sd": {
    "returns": "標本標準偏差。値が1個以下ならNA",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/sd.html"
  },
  "length": {
    "returns": "長さ1の非負整数（巨大ベクトルではdouble）",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/length.html"
  },
  "seq": {
    "returns": "整数またはdoubleの数列",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/seq.html"
  },
  "seq_len": {
    "returns": "1から指定長までの整数ベクトル。0なら空",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/seq.html"
  },
  "rep": {
    "returns": "繰り返したベクトル",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/rep.html"
  },
  "data.frame": {
    "returns": "データフレーム",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/dataframe.html"
  },
  "nrow": {
    "returns": "行数。次元がなければNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/nrow.html"
  },
  "ncol": {
    "returns": "列数。次元がなければNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/nrow.html"
  },
  "names": {
    "returns": "文字列の名前ベクトル、名前がなければNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/names.html"
  },
  "is.na": {
    "returns": "要素ごとの論理ベクトル（NaNもTRUE）",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/NA.html"
  },
  "as.numeric": {
    "returns": "数値ベクトル。変換不能な文字列はNAと警告",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/numeric.html"
  },
  "as.character": {
    "returns": "文字列ベクトル",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/character.html"
  },
  "print": {
    "returns": "引数を不可視に返す（画面出力も行う）",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/print.html"
  },
  "cat": {
    "returns": "不可視のNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/cat.html"
  },
  "readline": {
    "returns": "長さ1の文字列。非対話実行では空文字列",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/readline.html"
  },
  "read.csv": {
    "returns": "データフレーム",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/utils/html/read.table.html"
  },
  "if": {
    "returns": "選択した式の値。該当しなければ不可視のNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/Control.html"
  },
  "for": {
    "returns": "不可視のNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/Control.html"
  },
  "while": {
    "returns": "不可視のNULL",
    "source": "https://stat.ethz.ch/R-manual/R-devel/library/base/html/Control.html"
  }
};
