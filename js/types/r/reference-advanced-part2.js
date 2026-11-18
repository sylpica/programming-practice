// 高度モード B4：R 高度リファレンス項目 part2（トピック M-Z 相当）。
// 項目形式はモード機構の確定契約（advanced-interface.md 第4章）：
// 正規形＋ status 必須。supported 真偽値・reason・topic 等の追加フィールドは
// 付けない（未対応／未検証の理由は description に明記する。トピックの
// 対応は棚卸しファイルと各班報告書に残る）。
export const referenceAdvanced = [
  {
    "name": "make.names",
    "category": "文字列",
    "syntax": "make.names(names, unique = FALSE, allow_ = TRUE)",
    "description": "文字列ベクトルを、Rの名前として文法的に正しい形へ変換します（空白や記号を . に置換し、先頭が数字なら X を付ける等）。",
    "example": "make.names(c(\"a and b\", \"a-and-b\"), unique = TRUE)",
    "caution": "unique=FALSE（既定）では重複が残ります。予約語と衝突する名前には . が付加されます。",
    "status": "supported"
  },
  {
    "name": "make.unique",
    "category": "文字列",
    "syntax": "make.unique(names, sep = \".\")",
    "description": "文字列ベクトルの重複要素に連番（sepと番号）を付けて一意にします。",
    "example": "make.unique(c(\"a\", \"a\", \"a\"))",
    "caution": "既に一意な要素は変更されません。付番は元の順序を保ったまま行われます。",
    "status": "supported"
  },
  {
    "name": "mapply",
    "category": "適用関数",
    "syntax": "mapply(FUN, ..., MoreArgs = NULL, SIMPLIFY = TRUE, USE.NAMES = TRUE)",
    "description": "複数の引数ベクトル・リストの要素を並行に取り出し、関数FUNを適用します（多変量版のsapply）。",
    "example": "mapply(\"+\", c(1, 2), c(10, 20))",
    "caution": "短い引数はリサイクルされます。SIMPLIFY=TRUE（既定）では結果がベクトル・行列へ簡約されることがあります。FUNはこのモデルで扱える関数に限ります。このモデルでは FUN は文字列（二項演算子か単純な関数名）のみ対応します。関数名をそのまま渡す形は未対応です。",
    "status": "supported"
  },
  {
    "name": ".mapply",
    "category": "適用関数",
    "syntax": ".mapply(FUN, dots, MoreArgs)",
    "description": "mapplyの内部実装版。引数リストdotsに対してFUNを並行適用します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため",
    "example": ".mapply(function(a, b) a + b, list(1:3, 4:6), NULL)",
    "caution": "短い引数はリサイクルされます。SIMPLIFY=TRUE（既定）では結果がベクトル・行列へ簡約されることがあります。FUNはこのモデルで扱える関数に限ります。",
    "status": "unsupported"
  },
  {
    "name": "margin.table",
    "category": "集計",
    "syntax": "margin.table(x, margin = NULL)",
    "description": "marginSumsの旧称。配列の指定マージンについて合計を求めます。【未対応の理由】分割表（table オブジェクト＝属性付き配列）をエンジンの値モデルで表せないため",
    "example": "margin.table(x, margin = NULL)",
    "caution": "margin=NULL（既定）では全体の合計（長さ1）を返します。",
    "status": "unsupported"
  },
  {
    "name": "marginSums",
    "category": "集計",
    "syntax": "marginSums(x, margin = NULL)",
    "description": "配列（分割表）の指定したマージン（次元）について合計を求めます。【未対応の理由】分割表（table オブジェクト＝属性付き配列）をエンジンの値モデルで表せないため",
    "example": "marginSums(m, 1)",
    "caution": "margin=NULL（既定）では全体の合計（長さ1）を返します。",
    "status": "unsupported"
  },
  {
    "name": "mat.or.vec",
    "category": "行列・配列",
    "syntax": "mat.or.vec(nr, nc)",
    "description": "nr×ncのゼロ行列を作ります。nc=1のときは長さnrのゼロベクトルを返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "mat.or.vec(3, 1)",
    "caution": "返る型がncの値で変わります（nc>1で行列、nc=1でベクトル）。",
    "status": "unsupported"
  },
  {
    "name": "match",
    "category": "ベクトル",
    "syntax": "match(x, table, nomatch = NA_integer_, incomparables = NULL)",
    "description": "xの各要素がtableの中で最初に一致する位置（添字）を返します。一致しなければnomatch（既定はNA）を返します。",
    "example": "match(c(2, 5), c(5, 2, 5))",
    "caution": "型が異なる要素同士は強制変換されてから比較されます。NA同士は一致とみなされます。",
    "status": "supported"
  },
  {
    "name": "%notin%",
    "category": "ベクトル",
    "syntax": "x %notin% table",
    "description": "xの各要素がtableに含まれないかを要素ごとに判定します（%in%の否定）。【未対応の理由】base R に存在しないユーザー定義の演算子であり、共有パーサも受理しないため",
    "example": "\"%w/o%\" <- function(x, y) x[x %notin% y]",
    "caution": "型が異なる要素同士は強制変換されてから比較されます。NA同士は一致とみなされます。",
    "status": "unsupported"
  },
  {
    "name": "match.arg",
    "category": "文字列",
    "syntax": "match.arg(arg, choices, several.ok = FALSE)",
    "description": "候補choicesの中から、引数argと前方一致（部分一致）するものを1つ選びます。完全一致が優先されます。",
    "example": "match.arg(\"b\", c(\"a\", \"b\"))",
    "caution": "前方一致で複数候補に当てはまるとエラーになります。argが候補のどれとも一致しなければエラーです。",
    "status": "supported"
  },
  {
    "name": "match.call",
    "category": "言語オブジェクト",
    "syntax": "match.call(definition = sys.function(sys.parent()), call = sys.call(sys.parent()), expand.dots = TRUE, envir = parent.frame(2L))",
    "description": "現在の関数呼び出しを、全ての引数が完全な名前で指定されたcallオブジェクトとして返します。【未対応の理由】呼び出しオブジェクト（call）と呼び出しフレームを扱い、値モデルでは忠実に表せない",
    "example": "match.call(get, call(\"get\", \"abc\", i = FALSE, p = 3))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "match.fun",
    "category": "言語オブジェクト",
    "syntax": "match.fun(FUN, descend = TRUE)",
    "description": "名前や文字列で指定された関数を検索し、関数オブジェクトとして取り出します。【未対応の理由】関数オブジェクトそのものを検索して返し、値モデルでは関数を値として表せない",
    "example": "match.fun(\"*\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "abs",
    "category": "数学",
    "syntax": "abs(x)",
    "description": "絶対値を要素ごとに返します。",
    "example": "abs(c(-2, 3))",
    "caution": "負の数にsqrtを適用するとNaNと警告になります。NAはNAのまま伝播します。",
    "status": "supported"
  },
  {
    "name": "sqrt",
    "category": "数学",
    "syntax": "sqrt(x)",
    "description": "平方根（主平方根）を要素ごとに返します。",
    "example": "sqrt(c(4, 9))",
    "caution": "負の数にsqrtを適用するとNaNと警告になります。NAはNAのまま伝播します。",
    "status": "supported"
  },
  {
    "name": "%*%",
    "category": "行列・配列",
    "syntax": "x %*% y",
    "description": "行列の積（内積）を計算します。ベクトルは行・列行列へ自動的に読み替えて適合させます。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "(z <- x %*% x)",
    "caution": "両辺の内側の次元が一致しない場合はエラーです。要素ごとの積には * を使います。",
    "status": "unsupported"
  },
  {
    "name": "as.matrix",
    "category": "行列・配列",
    "syntax": "as.matrix(x, ...)",
    "description": "引数を行列へ変換します。データフレームでは全列を共通の型へ変換して行列化します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "is.matrix(as.matrix(1:10))",
    "caution": "byrow=FALSE（既定）のため、値は列ごとに詰められます。dataの長さが行列の要素数の約数でない場合は警告とリサイクルが起こります。",
    "status": "unsupported"
  },
  {
    "name": "is.matrix",
    "category": "行列・配列",
    "syntax": "is.matrix(x)",
    "description": "引数が（厳密な）行列かどうかを判定します。",
    "example": "is.matrix(c(1, 2))",
    "caution": "byrow=FALSE（既定）のため、値は列ごとに詰められます。dataの長さが行列の要素数の約数でない場合は警告とリサイクルが起こります。",
    "status": "supported"
  },
  {
    "name": "matrix",
    "category": "行列・配列",
    "syntax": "matrix(data = NA, nrow = 1, ncol = 1, byrow = FALSE, dimnames = NULL)",
    "description": "値のベクトルから行列を作ります。既定では列方向（列優先）に値が詰められます。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "matrix(1:6, nrow = 2)",
    "caution": "byrow=FALSE（既定）のため、値は列ごとに詰められます。dataの長さが行列の要素数の約数でない場合は警告とリサイクルが起こります。",
    "status": "unsupported"
  },
  {
    "name": "max.col",
    "category": "行列・配列",
    "syntax": "max.col(m, ties.method = c(\"random\", \"first\", \"last\"))",
    "description": "行列の各行について、最大値のある列番号を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "table(mc <- max.col(swiss))",
    "caution": "ties.method=\"random\"（既定）では同点のときランダムに選ばれるため、結果は実行時に決まります。再現性が必要なら\"first\"等を指定します。",
    "status": "unsupported"
  },
  {
    "name": "memCompress",
    "category": "その他",
    "syntax": "memCompress(from, type = c(\"gzip\", \"bzip2\", \"xz\", \"zstd\", \"none\"))",
    "description": "rawベクトルをメモリ上で圧縮します（gzip／bzip2／xz／zstd）。【未対応の理由】raw型（バイト列）の圧縮・展開であり、値モデルにrawが無い",
    "example": "txt.gz <- memCompress(txt, \"g\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "memDecompress",
    "category": "その他",
    "syntax": "memDecompress(from, type = c(\"unknown\", \"gzip\", \"bzip2\", \"xz\", \"zstd\", \"none\"), asChar = FALSE)",
    "description": "圧縮されたrawベクトルをメモリ上で展開します。【未対応の理由】raw型（バイト列）の圧縮・展開であり、値モデルにrawが無い",
    "example": "txt2 <- strsplit(memDecompress(txt.gz, \"g\", asChar = TRUE), \"\\n\")[[1]]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "mem.maxVSize",
    "category": "システム",
    "syntax": "mem.maxVSize(vsize = 0)",
    "description": "ベクトルヒープの最大サイズ（MiB）を照会・設定します。【未対応の理由】Rプロセスのヒープ上限という実行環境の状態を読み書きし、値モデルでは表せない",
    "example": "mem.maxVSize(vsize = 0)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "memory.profile",
    "category": "システム",
    "syntax": "memory.profile()",
    "description": "内部オブジェクト（consセル）の種別ごとの使用数を返します。【未対応の理由】R内部のメモリ使用状況（SEXPREC種別）という実行環境の内部状態であり、値モデルでは表せない",
    "example": "memory.profile()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "merge",
    "category": "データフレーム",
    "syntax": "merge(x, y, ...)",
    "description": "2つのデータフレームを共通列（または行名）で結合します（データベースの結合演算）。",
    "example": "merge(data.frame(id = 1:2, a = c(\"x\", \"y\")), data.frame(id = 1:2, b = c(10, 20)))",
    "caution": "共通列の値が重複していると行が増殖します（直積）。all.x／all.yを指定しない限り、一致しない行は結果から落ちます。",
    "status": "supported"
  },
  {
    "name": "message",
    "category": "入出力",
    "syntax": "message(..., domain = NULL, appendLF = TRUE)",
    "description": "引数を連結して診断メッセージを生成します。【未対応の理由】診断メッセージという条件（condition）の生成・抑制機構であり、値の計算として表せない",
    "example": "message(\"ABC\", \"DEF\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "packageStartupMessage",
    "category": "入出力",
    "syntax": "packageStartupMessage(..., domain = NULL, appendLF = TRUE)",
    "description": "パッケージ読み込み時の開始メッセージを生成します。【未対応の理由】診断メッセージという条件（condition）の生成・抑制機構であり、値の計算として表せない",
    "example": "packageStartupMessage(\"initializing ...\", appendLF = FALSE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "suppressMessages",
    "category": "入出力",
    "syntax": "suppressMessages(expr, classes = \"message\")",
    "description": "式を評価し、その間に発生するメッセージ条件を抑制します。【未対応の理由】診断メッセージという条件（condition）の生成・抑制機構であり、値の計算として表せない",
    "example": "suppressMessages(message(\"ABC\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "suppressPackageStartupMessages",
    "category": "入出力",
    "syntax": "suppressPackageStartupMessages(expr)",
    "description": "式を評価し、パッケージ開始メッセージを抑制します。【未対応の理由】診断メッセージという条件（condition）の生成・抑制機構であり、値の計算として表せない",
    "example": "suppressPackageStartupMessages(testit())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".makeMessage",
    "category": "入出力",
    "syntax": ".makeMessage(..., domain = NULL, appendLF = FALSE)",
    "description": "メッセージ文字列を組み立てる内部関数です。【未対応の理由】診断メッセージという条件（condition）の生成・抑制機構であり、値の計算として表せない",
    "example": ".makeMessage(..., domain = NULL, appendLF = FALSE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "missing",
    "category": "言語オブジェクト",
    "syntax": "missing(x)",
    "description": "関数の中で、仮引数に値が指定されたかどうかを判定します。【未対応の理由】仮引数が渡されたかは約束（promise）の状態であり、遅延評価に本質的に依存する",
    "example": "f <- function(y) missing(y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "mode",
    "category": "型判定",
    "syntax": "mode(x)",
    "description": "オブジェクトのモード（型の分類：numeric／character／logical等）を取得・設定します。",
    "example": "mode(c(1, 2))",
    "caution": "代入形（mode(x) <- value）は型変換を伴います。typeofとは分類の粒度が異なります。",
    "status": "supported"
  },
  {
    "name": "storage.mode",
    "category": "型判定",
    "syntax": "storage.mode(x)",
    "description": "オブジェクトの内部記憶モードを取得・設定します。",
    "example": "storage.mode(1:3)",
    "caution": "代入形（mode(x) <- value）は型変換を伴います。typeofとは分類の粒度が異なります。",
    "status": "supported"
  },
  {
    "name": "mtfrm",
    "category": "その他",
    "syntax": "mtfrm(x)",
    "description": "match()で比較できる形へオブジェクトを変換するS3総称関数です。【未対応の理由】match用のS3総称関数であり、任意クラスへのメソッドディスパッチに依存する",
    "example": "mtfrm(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "anyMissing",
    "category": "欠損値",
    "syntax": "NA",
    "description": "ベクトルの中に欠損値（NA）が1つでもあるかを返します（anyNAと同様の欠損検査）。【未対応の理由】base R（4.3.3 および R-devel の base）に anyMissing という関数は存在しないため（欠損の検査は anyNA を使用）",
    "example": "anyMissing(c(1, NA))",
    "caution": "NA同士の比較（==）はNAを返すため、欠損の判定にはis.na／anyNAを使います。",
    "status": "unsupported"
  },
  {
    "name": "anyNA",
    "category": "欠損値",
    "syntax": "anyNA(x, recursive = FALSE)",
    "description": "ベクトルの中にNA（NaNを含む）が1つでもあるかを返します。",
    "example": "anyNA(c(1, NA, 3))",
    "caution": "NA同士の比較（==）はNAを返すため、欠損の判定にはis.na／anyNAを使います。",
    "status": "supported"
  },
  {
    "name": "NA_character_",
    "category": "欠損値",
    "syntax": "NA",
    "description": "文字列型の欠損値（長さ1のcharacter型NA）です。【未対応の理由】型付き NA 定数であり、エンジンの値モデル（型を持たない NA）に定数値が無く、名前が未定義名として停止するため",
    "example": "c(\"a\", NA_character_)",
    "caution": "NA同士の比較（==）はNAを返すため、欠損の判定にはis.na／anyNAを使います。",
    "status": "unsupported"
  },
  {
    "name": "NA_complex_",
    "category": "欠損値",
    "syntax": "NA",
    "description": "複素数型の欠損値（長さ1のcomplex型NA）です。【未対応の理由】複素数型の定数であり、値モデルに複素数が無い",
    "example": "NA_complex_",
    "caution": "NA同士の比較（==）はNAを返すため、欠損の判定にはis.na／anyNAを使います。",
    "status": "unsupported"
  },
  {
    "name": "NA_integer_",
    "category": "欠損値",
    "syntax": "NA",
    "description": "整数型の欠損値（長さ1のinteger型NA）です。【未対応の理由】型付き NA 定数であり、エンジンの値モデル（型を持たない NA）に定数値が無く、名前が未定義名として停止するため",
    "example": "c(1L, NA_integer_)",
    "caution": "NA同士の比較（==）はNAを返すため、欠損の判定にはis.na／anyNAを使います。",
    "status": "unsupported"
  },
  {
    "name": "NA_real_",
    "category": "欠損値",
    "syntax": "NA",
    "description": "実数型の欠損値（長さ1のnumeric型NA）です。【未対応の理由】型付き NA 定数であり、エンジンの値モデル（型を持たない NA）に定数値が無く、名前が未定義名として停止するため",
    "example": "c(1.5, NA_real_)",
    "caution": "NA同士の比較（==）はNAを返すため、欠損の判定にはis.na／anyNAを使います。",
    "status": "unsupported"
  },
  {
    "name": "as.name",
    "category": "言語オブジェクト",
    "syntax": "as.name(x)",
    "description": "文字列をシンボル（名前オブジェクト）へ変換します。as.symbolと同一です。【未対応の理由】シンボル（名前オブジェクト）という言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "an <- as.name(\"arrg\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.symbol",
    "category": "言語オブジェクト",
    "syntax": "as.symbol(x)",
    "description": "文字列をシンボル（名前オブジェクト）へ変換します。as.nameと同一です。【未対応の理由】シンボル（名前オブジェクト）という言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "as.symbol(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.name",
    "category": "言語オブジェクト",
    "syntax": "is.name(x)",
    "description": "オブジェクトがシンボルかどうかを判定します。【未対応の理由】シンボル（名前オブジェクト）という言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "is.name(an)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.symbol",
    "category": "言語オブジェクト",
    "syntax": "is.symbol(x)",
    "description": "オブジェクトがシンボルかどうかを判定します。is.nameと同一です。【未対応の理由】シンボル（名前オブジェクト）という言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "is.symbol(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nargs",
    "category": "言語オブジェクト",
    "syntax": "nargs()",
    "description": "関数の中で、その関数へ実際に渡された引数の個数を返します。【未対応の理由】呼び出しフレーム内の引数の個数を数えるもので、約束とフレームに依存する",
    "example": "tst <- function(a, b = 3, ...) {nargs()}",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nchar",
    "category": "文字列",
    "syntax": "nchar(x, type = \"chars\", allowNA = FALSE, keepNA = NA)",
    "description": "文字列ベクトルの各要素の文字数（type=\"chars\"）を返します。",
    "example": "x <- \"abc\"\nnchar(x)",
    "caution": "NA要素についてはkeepNAの設定によりNAが返ります。type=\"bytes\"ではバイト数、\"width\"では表示幅を数えます。",
    "status": "supported"
  },
  {
    "name": "nzchar",
    "category": "文字列",
    "syntax": "nzchar(x, keepNA = FALSE)",
    "description": "文字列ベクトルの各要素が空文字列でないか（長さが0でないか）を返します。",
    "example": "nzchar(c(\"a\", \"\"))",
    "caution": "NA要素についてはkeepNAの設定によりNAが返ります。type=\"bytes\"ではバイト数、\"width\"では表示幅を数えます。",
    "status": "supported"
  },
  {
    "name": "nlevels",
    "category": "その他",
    "syntax": "nlevels(x)",
    "description": "引数が持つ水準（レベル）の数を返します。因子でない引数には0を返します。【未対応の理由】factor（因子）の水準数を返す関数であり、値モデルに因子が無い",
    "example": "nlevels(gl(3, 7))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.matrix.noquote",
    "category": "その他",
    "syntax": "noquote(obj, right = FALSE)",
    "description": "noquoteオブジェクトを行列へ変換するS3メソッドです。【未対応の理由】noquoteクラスのオブジェクトとそのS3メソッドであり、クラスとディスパッチが値モデルに無い",
    "example": "as.matrix(noquote(c(\"a\", \"b\")))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "c.noquote",
    "category": "その他",
    "syntax": "noquote(obj, right = FALSE)",
    "description": "noquoteオブジェクトを結合するS3メソッドです。【未対応の理由】noquoteクラスのオブジェクトとそのS3メソッドであり、クラスとディスパッチが値モデルに無い",
    "example": "c(noquote(\"a\"), noquote(\"b\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "noquote",
    "category": "その他",
    "syntax": "noquote(obj, right = FALSE)",
    "description": "文字列を、表示の際に引用符を付けないnoquoteクラスのオブジェクトにします。【未対応の理由】noquoteクラスのオブジェクトとそのS3メソッドであり、クラスとディスパッチが値モデルに無い",
    "example": "noquote(c(\"a\", \"b\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.noquote",
    "category": "その他",
    "syntax": "noquote(obj, right = FALSE)",
    "description": "noquoteオブジェクトを表示するS3メソッドです。【未対応の理由】noquoteクラスのオブジェクトとそのS3メソッドであり、クラスとディスパッチが値モデルに無い",
    "example": "print(noquote(c(\"a\", \"b\")))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[.noquote",
    "category": "その他",
    "syntax": "noquote(obj, right = FALSE)",
    "description": "noquoteオブジェクトの部分を取り出すS3メソッドです。【未対応の理由】noquoteクラスのオブジェクトとそのS3メソッドであり、クラスとディスパッチが値モデルに無い",
    "example": "noquote(c(\"a\", \"b\"))[1]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "norm",
    "category": "行列・配列",
    "syntax": "norm(x, type = c(\"O\", \"I\", \"F\", \"M\", \"2\"))",
    "description": "行列のノルム（1ノルム／無限大ノルム／フロベニウスノルム／最大絶対値／スペクトルノルム）を計算します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "norm(matrix(1:4, 2), type = \"F\")",
    "caution": "type=\"2\"（スペクトルノルム）は特異値分解に基づきます。行列でない引数はエラーです。",
    "status": "unsupported"
  },
  {
    "name": "normalizePath",
    "category": "ファイル",
    "syntax": "normalizePath(path, winslash = \"\\\\\", mustWork = NA)",
    "description": "ファイルパスをプラットフォームの正規形（絶対パス）へ変換します。【未対応の理由】実ファイルシステム上のパスを正規化するもので、実在ファイルの有無に依存する",
    "example": "cat(normalizePath(c(R.home(), tempdir())), sep = \"\\n\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NotYetImplemented",
    "category": "その他",
    "syntax": "NotYetImplemented()",
    "description": "未実装機能であることを示すエラーを発生させる標識関数です。【未対応の理由】R本体の未実装機能・未使用引数を標示するための内部標識であり、利用者向けの計算機能として再現する対象ではない",
    "example": "NotYetImplemented()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NotYetUsed",
    "category": "その他",
    "syntax": "NotYetUsed(arg, error = TRUE)",
    "description": "未使用の引数であることを示す標識関数です。【未対応の理由】R本体の未実装機能・未使用引数を標示するための内部標識であり、利用者向けの計算機能として再現する対象ではない",
    "example": "NotYetUsed(arg, error = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".NotYetImplemented",
    "category": "その他",
    "syntax": ".NotYetImplemented()",
    "description": "未実装機能であることを示すエラーを発生させる標識関数です。【未対応の理由】R本体の未実装機能・未使用引数を標示するための内部標識であり、利用者向けの計算機能として再現する対象ではない",
    "example": ".NotYetImplemented()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".NotYetUsed",
    "category": "その他",
    "syntax": ".NotYetUsed(arg, error = TRUE)",
    "description": "未使用の引数であることを示す標識関数です。【未対応の理由】R本体の未実装機能・未使用引数を標示するための内部標識であり、利用者向けの計算機能として再現する対象ではない",
    "example": ".NotYetUsed(arg, error = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NCOL",
    "category": "データフレーム",
    "syntax": "NCOL(x)",
    "description": "ベクトルを1列の行列とみなして列数を返します（ベクトルなら1、NULLなら0）。",
    "example": "NCOL(1:12)",
    "caution": "nrow／ncolと違い、次元を持たないベクトルでもNULLを返しません。",
    "status": "supported"
  },
  {
    "name": "NROW",
    "category": "データフレーム",
    "syntax": "NROW(x)",
    "description": "ベクトルを1列の行列とみなして行数を返します（長さ0のベクトルでも1行相当の扱いを含む、nrowの頑健版）。",
    "example": "NROW(1:12)",
    "caution": "nrow／ncolと違い、次元を持たないベクトルでもNULLを返しません。",
    "status": "supported"
  },
  {
    "name": "::",
    "category": "演算子",
    "syntax": "pkg::name",
    "description": "パッケージの名前空間から、公開（export）されたオブジェクトを取り出します。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "base::log",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ":::",
    "category": "演算子",
    "syntax": "pkg:::name",
    "description": "パッケージの名前空間から、非公開を含む内部オブジェクトを取り出します。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "stats:::coef.default",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Last.lib",
    "category": "パッケージ",
    "syntax": ".Last.lib(libpath)",
    "description": "パッケージがデタッチされる際に最後に呼ばれるフック関数です。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": ".Last.lib(libpath)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".onAttach",
    "category": "パッケージ",
    "syntax": ".onAttach(libname, pkgname)",
    "description": "パッケージがアタッチされる際に呼ばれるフック関数です。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": ".onAttach(libname, pkgname)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".onDetach",
    "category": "パッケージ",
    "syntax": ".onDetach(libpath)",
    "description": "パッケージがデタッチされる際に呼ばれるフック関数です。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": ".onDetach(libpath)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".onLoad",
    "category": "パッケージ",
    "syntax": ".onLoad(libname, pkgname)",
    "description": "パッケージの名前空間が読み込まれる際に呼ばれるフック関数です。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": ".onLoad(libname, pkgname)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".onUnload",
    "category": "パッケージ",
    "syntax": ".onUnload(libpath)",
    "description": "パッケージの名前空間が解放される際に呼ばれるフック関数です。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": ".onUnload(libpath)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "attachNamespace",
    "category": "パッケージ",
    "syntax": "attachNamespace(ns, pos = 2L, depends = NULL, exclude, include.only)",
    "description": "名前空間を読み込み、検索パスへアタッチします。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "attachNamespace(ns, pos = 2L, depends = NULL, exclude, include.only)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "isNamespaceLoaded",
    "category": "パッケージ",
    "syntax": "isNamespaceLoaded(name)",
    "description": "名前空間が読み込み済みかどうかを返します。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "statL <- isNamespaceLoaded(\"stats\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "loadedNamespaces",
    "category": "パッケージ",
    "syntax": "loadedNamespaces()",
    "description": "読み込み済みの名前空間の一覧を返します。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "(lns <- loadedNamespaces())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "loadNamespace",
    "category": "パッケージ",
    "syntax": "loadNamespace(package, lib.loc = NULL, ...)",
    "description": "パッケージの名前空間を読み込みます。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "ns <- loadNamespace(\"utils\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "requireNamespace",
    "category": "パッケージ",
    "syntax": "requireNamespace(package, ..., quietly = FALSE)",
    "description": "名前空間を静かに読み込み、成否を論理値で返します。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "requireNamespace(package, ..., quietly = FALSE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "unloadNamespace",
    "category": "パッケージ",
    "syntax": "unloadNamespace(ns)",
    "description": "名前空間を解放します。【未対応の理由】パッケージ／名前空間の読み込み・管理を伴い、値モデルでは再現できない",
    "example": "unloadNamespace(\"utils\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "topenv",
    "category": "環境",
    "syntax": "topenv(envir = parent.frame(), matchThisEnv = getOption(\"topLevelEnvironment\"))",
    "description": "環境の包含関係をたどり、最上位の環境（トップレベル環境）を返します。【未対応の理由】環境オブジェクト・検索パスに依存し、値モデルでは忠実に表せない",
    "example": "topenv(.GlobalEnv)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.null",
    "category": "型変換",
    "syntax": "as.null(x, ...)",
    "description": "引数を無視して常にNULLを返す関数です（総称関数のメソッド用）。",
    "example": "as.null(c(1, 2))",
    "caution": "NULLは長さ0であり、c()に渡しても要素は増えません。",
    "status": "supported"
  },
  {
    "name": "is.null",
    "category": "型変換",
    "syntax": "is.null(x)",
    "description": "引数がNULLかどうかを判定します。",
    "example": "is.null(NULL)",
    "caution": "NULLは長さ0であり、c()に渡しても要素は増えません。",
    "status": "supported"
  },
  {
    "name": "is.numeric",
    "category": "型変換",
    "syntax": "is.numeric(x)",
    "description": "引数が数値として解釈できる型（numeric／integer）かどうかを判定します。",
    "example": "x <- c(1, 2)\nis.numeric(x)",
    "caution": "is.numericは因子に対してはFALSEを返します。日付・日時クラスにもFALSEです。",
    "status": "supported"
  },
  {
    "name": "numeric",
    "category": "型変換",
    "syntax": "numeric(length = 0)",
    "description": "指定した長さの数値ベクトル（0で初期化）を作ります。",
    "example": "numeric(3)",
    "caution": "is.numericは因子に対してはFALSEを返します。日付・日時クラスにもFALSEです。",
    "status": "supported"
  },
  {
    "name": "anyNA.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの欠損を判定するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.character.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトを文字列化するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.list.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトをリスト化するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.numeric_version",
    "category": "その他",
    "syntax": "as.numeric_version(x)",
    "description": "numeric_versionクラスへ変換する関数です。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "as.numeric_version(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.package_version",
    "category": "その他",
    "syntax": "as.package_version(x)",
    "description": "package_versionクラスへ変換する関数です。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "as.package_version(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "c.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトを結合するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "duplicated.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの重複を判定するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "format.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトを整形するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getRversion",
    "category": "その他",
    "syntax": "getRversion()",
    "description": "実行中のRのバージョンをpackage_versionオブジェクトで返します。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "getRversion()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.na.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの欠損を判定するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.numeric_version",
    "category": "その他",
    "syntax": "is.numeric_version(x)",
    "description": "numeric_versionクラスかどうかを判定します。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "is.numeric_version(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.package_version",
    "category": "その他",
    "syntax": "is.package_version(x)",
    "description": "package_versionクラスかどうかを判定します。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "is.package_version(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "「1.2-3」のような数値バージョンを表すオブジェクトを作ります。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Ops.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの比較演算を行うS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "package_version",
    "category": "その他",
    "syntax": "package_version(x, strict = TRUE)",
    "description": "パッケージのバージョンを表すオブジェクトを作ります。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "x <- package_version(c(\"1.2-4\", \"1.2-3\", \"2.1\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトを表示するS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rep.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトを繰り返すS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "R_system_version",
    "category": "その他",
    "syntax": "R_system_version(x, strict = TRUE)",
    "description": "R本体のバージョンを表すオブジェクトを作ります。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "R_system_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Summary.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの要約（範囲比較）を行うS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "unique.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの重複を取り除くS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "xtfrm.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの順序付けを行うS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "$.package_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "package_versionオブジェクトの要素を取り出すS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの部分を取り出すS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[<-.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの部分を置き換えるS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[[.numeric_version",
    "category": "その他",
    "syntax": "numeric_version(x, strict = TRUE)",
    "description": "numeric_versionオブジェクトの単一要素を取り出すS3メソッドです。【未対応の理由】numeric_version／package_versionというS3クラスのオブジェクトとメソッドディスパッチを前提とし、そのクラスが値モデルに無い",
    "example": "numeric_version(x, strict = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.character.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeオブジェクトを文字列化するS3メソッドです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "as.octmode(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeクラスへ変換します。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "(on <- as.octmode(c(16, 32, 127:129)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "format.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeオブジェクトを整形するS3メソッドです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "as.octmode(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "octmode",
    "category": "その他",
    "syntax": "octmode(x)",
    "description": "整数を8進数表示するoctmodeクラスのオブジェクトです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "(on <- as.octmode(c(16, 32, 127:129)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeオブジェクトを表示するS3メソッドです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "as.octmode(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "!.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeオブジェクトのビット否定を行うS3メソッドです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "as.octmode(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "&.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeオブジェクトのビット積を行うS3メソッドです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "as.octmode(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeオブジェクトの部分を取り出すS3メソッドです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "as.octmode(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "|.octmode",
    "category": "その他",
    "syntax": "as.octmode(x)",
    "description": "octmodeオブジェクトのビット和を行うS3メソッドです。【未対応の理由】octmodeクラス（8進表示の整数クラス）のオブジェクトとS3メソッドであり、そのクラスが値モデルに無い",
    "example": "as.octmode(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "on.exit",
    "category": "制御",
    "syntax": "on.exit(expr = NULL, add = FALSE, after = TRUE)",
    "description": "現在の関数の終了時（正常終了・エラー時とも）に評価される式を記録します。【未対応の理由】関数の終了時に式を評価する仕組みであり、遅延評価と呼び出しフレームに本質的に依存する",
    "example": "on.exit(par(opar))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Ops.Date",
    "category": "日付と時刻",
    "syntax": "date + x",
    "description": "Dateクラスの演算（Opsグループ）のS3メソッドです。【未対応の理由】Dateクラスの日時オブジェクトを前提とし、値モデルに日付クラスが無い",
    "example": "date + x",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "+.Date",
    "category": "日付と時刻",
    "syntax": "date + x",
    "description": "Dateオブジェクトへの日数の加算を行うS3メソッドです。【未対応の理由】Dateクラスの日時オブジェクトを前提とし、値モデルに日付クラスが無い",
    "example": "date + x",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "-.Date",
    "category": "日付と時刻",
    "syntax": "date + x",
    "description": "Dateオブジェクトからの日数の減算・日付同士の差を行うS3メソッドです。【未対応の理由】Dateクラスの日時オブジェクトを前提とし、値モデルに日付クラスが無い",
    "example": "date + x",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getOption",
    "category": "システム",
    "syntax": "getOption(x, default = NULL)",
    "description": "指定した名前のオプションの現在値を返します。【未対応の理由】セッション全体に効くグローバルオプションという実行環境の状態を読み書きし、値モデルに無い",
    "example": "getOption(\"width\") == options()$width",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "options",
    "category": "システム",
    "syntax": "options(...)",
    "description": "Rの計算・表示に影響するグローバルオプションを取得・設定します。【未対応の理由】セッション全体に効くグローバルオプションという実行環境の状態を読み書きし、値モデルに無い",
    "example": "op <- options(); utils::str(op)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Options",
    "category": "システム",
    "syntax": ".Options",
    "description": "現在のオプションを保持するリスト（変数）です。【未対応の理由】セッション全体に効くグローバルオプションという実行環境の状態を読み書きし、値モデルに無い",
    "example": ".Options",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "order",
    "category": "ベクトル",
    "syntax": "order(..., na.last = TRUE, decreasing = FALSE, method = c(\"auto\", \"shell\", \"radix\"))",
    "description": "引数を昇順（または降順）に並べ替えるための置換（順序の添字）を返します。同点は後続の引数で判定します。",
    "example": "(ii <- order(x <- c(1,1,3:1,1:4,3), y <- c(9,9:1), z <- c(2,1:9)))",
    "caution": "order自体は値を並べ替えません。x[order(x)]のように添字として使います。na.lastでNAの位置が変わります。",
    "status": "supported"
  },
  {
    "name": "sort.list",
    "category": "ベクトル",
    "syntax": "sort.list(x, partial = NULL, na.last = TRUE, decreasing = FALSE, method = c(\"auto\", \"shell\", \"quick\", \"radix\"))",
    "description": "ベクトルを並べ替えるための置換を返します（orderの単一引数版）。",
    "example": "system.time(o <- sort.list(x, method = \"quick\", na.last = NA))",
    "caution": "order自体は値を並べ替えません。x[order(x)]のように添字として使います。na.lastでNAの位置が変わります。",
    "status": "supported"
  },
  {
    "name": "outer",
    "category": "行列・配列",
    "syntax": "outer(X, Y, FUN = \"*\", ...)",
    "description": "2つの配列の全要素の組み合わせに関数FUN（既定は積）を適用した配列を返します（外積の一般化）。【未対応の理由】外積は行列を返し、関数値（FUN）も引数に取るため、エンジンの値モデルで表せないため",
    "example": "outer(y, x, `^`)",
    "caution": "結果の次元はc(dim(X), dim(Y))になります。FUNにはベクトル化された関数が必要です。",
    "status": "unsupported"
  },
  {
    "name": "%o%",
    "category": "行列・配列",
    "syntax": "X %o% Y",
    "description": "2つのベクトルの外積（outer(X, Y, \"*\")）を返します。【未対応の理由】外積は行列を返し、エンジンの値モデルで行列を表せないため",
    "example": "x %o% x",
    "caution": "結果の次元はc(dim(X), dim(Y))になります。FUNにはベクトル化された関数が必要です。",
    "status": "unsupported"
  },
  {
    "name": "(",
    "category": "制御",
    "syntax": "( ... )",
    "description": "丸括弧は式をグループ化し、評価順序を指定します。引数をそのまま返す恒等関数と等価です。",
    "example": "(1 + 2) * 3",
    "caution": "{ }ブロック内では、途中の式の値は捨てられ、最後の式の値だけが残ります。",
    "status": "supported"
  },
  {
    "name": "{",
    "category": "制御",
    "syntax": "{ ... }",
    "description": "波括弧は複数の式を1つのブロックとしてまとめ、最後の式の値を返します。【未対応の理由】波括弧ブロックを式として値を返す形（代入の右辺・引数位置）を共有パーサが再現できないため（制御構文の本体としての並びは if／for 等の基礎項目で扱う）",
    "example": "y <- { x <- 1; x + 1 }",
    "caution": "{ }ブロック内では、途中の式の値は捨てられ、最後の式の値だけが残ります。",
    "status": "unsupported"
  },
  {
    "name": "parse",
    "category": "言語オブジェクト",
    "syntax": "parse(file = \"\", n = NULL, text = NULL, prompt = \"?\", keep.source = getOption(\"keep.source\"), srcfile, encoding = \"unknown\")",
    "description": "テキストやファイルを構文解析し、未評価のexpressionオブジェクトを返します。【未対応の理由】未評価の式や呼び出し等の言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "parse(file = fil, n = 3)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "str2expression",
    "category": "言語オブジェクト",
    "syntax": "str2expression(text)",
    "description": "文字列を構文解析し、expressionオブジェクトを返します。【未対応の理由】未評価の式や呼び出し等の言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "str2expression(text)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "str2lang",
    "category": "言語オブジェクト",
    "syntax": "str2lang(s)",
    "description": "文字列を構文解析し、call等の言語オブジェクトを返します。【未対応の理由】未評価の式や呼び出し等の言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "str2lang(s)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "paste",
    "category": "文字列",
    "syntax": "paste (..., sep = \" \", collapse = NULL, recycle0 = FALSE)",
    "description": "引数を文字列へ変換してから、sepを挟んで要素ごとに連結します。collapseを指定すると全体を1つの文字列に畳みます。",
    "example": "paste(c(\"a\", \"b\"), 1:2, sep = \"-\")",
    "caution": "長さの異なる引数はリサイクルされます。NAは文字列\"NA\"として連結されます（na.rm引数はありません）。",
    "status": "supported"
  },
  {
    "name": "paste0",
    "category": "文字列",
    "syntax": "paste0(..., collapse = NULL, recycle0 = FALSE)",
    "description": "sep=\"\"のpasteです。引数を文字列化して区切りなしで連結します。",
    "example": "paste0(1:12)",
    "caution": "長さの異なる引数はリサイクルされます。NAは文字列\"NA\"として連結されます（na.rm引数はありません）。",
    "status": "supported"
  },
  {
    "name": "path.expand",
    "category": "ファイル",
    "syntax": "path.expand(path)",
    "description": "パス文字列の先頭の ~ をユーザーのホームディレクトリへ置換する等、パスを展開します。【未対応の理由】ホームディレクトリ等のOS環境に依存してパスを展開するもので、値モデルでは忠実に表せない",
    "example": "path.expand(\"~/foo\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "pcre_config",
    "category": "システム",
    "syntax": "pcre_config()",
    "description": "このRセッションで使用中のPCREの構成オプションを返します。【未対応の理由】使用中のPCREライブラリの設定という実行環境情報を返し、値モデルでは表せない",
    "example": "pcre_config()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "|>",
    "category": "演算子",
    "syntax": "lhs |> rhs",
    "description": "左辺の値を、右辺の呼び出しの第1引数（または _ の位置）へ差し込んで評価します（前方パイプ演算子）。【未対応の理由】パイプ演算子は式を書き換えて評価する構文であり、このモデルのパーサが受理しない",
    "example": "mtcars |> head()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Platform",
    "category": "システム",
    "syntax": ".Platform",
    "description": "Rが構築・実行されているOS等のプラットフォーム情報を保持するリスト（変数）です。【未対応の理由】Rが構築されたプラットフォーム情報という実行環境の値であり、値モデルでは表せない",
    "example": ".Platform$OS.type",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "plot",
    "category": "入出力",
    "syntax": "plot(x, y, ...)",
    "description": "オブジェクトをグラフィックスデバイスへ描画する総称関数です（散布図等）。【未対応の理由】グラフィックスデバイスへの描画であり、値モデルでは再現できない",
    "example": "plot(cars)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "pmatch",
    "category": "文字列",
    "syntax": "pmatch(x, table, nomatch = NA_integer_, duplicates.ok = FALSE)",
    "description": "xの各要素について、tableの要素と前方一致する最初の位置を返します（部分一致）。",
    "example": "pmatch(\"\", \"\")",
    "caution": "前方一致する候補が複数ある要素はNA（nomatch）になります。完全一致は常に優先されます。",
    "status": "supported"
  },
  {
    "name": "polyroot",
    "category": "数学",
    "syntax": "polyroot(z)",
    "description": "実数または複素数係数の多項式の根（ゼロ点）を全て求めます。【未対応の理由】多項式の根は一般に複素数であり、値モデルに複素数が無い",
    "example": "polyroot(c(1, 2, 1))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "pos.to.env",
    "category": "環境",
    "syntax": "pos.to.env(x)",
    "description": "検索パス上の位置を指定して、その位置の環境を返します。【未対応の理由】環境オブジェクト・検索パスに依存し、値モデルでは忠実に表せない",
    "example": "pos.to.env(1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "pretty",
    "category": "数学",
    "syntax": "pretty(x, ...)",
    "description": "xの範囲を覆う、等間隔で「きりのよい」数（1・2・5×10^n）の列を約n+1個計算します（軸の目盛り候補）。",
    "example": "pretty(1:15)",
    "caution": "返る目盛りの個数はちょうどn+1とは限りません。",
    "status": "supported"
  },
  {
    "name": "pretty.default",
    "category": "数学",
    "syntax": "pretty(x, ...)",
    "description": "prettyのデフォルトメソッドです。【未対応の理由】S3 メソッドであり、任意クラスへのディスパッチをエンジンの値モデルで再現できないため（総称関数の pretty は対応）",
    "example": "pretty.default(1:10)",
    "caution": "返る目盛りの個数はちょうどn+1とは限りません。",
    "status": "unsupported"
  },
  {
    "name": ".pretty",
    "category": "数学",
    "syntax": ".pretty(x, n = 5, min.n = n %/% 3, ...)",
    "description": "prettyの内部実装版です。【未対応の理由】pretty の内部関数（ドット始まり）であり、共有パーサが受理せず到達できないため（総称関数の pretty は対応）",
    "example": ".pretty(c(1, 9), 5)",
    "caution": "返る目盛りの個数はちょうどn+1とは限りません。",
    "status": "unsupported"
  },
  {
    "name": ".Primitive",
    "category": "言語オブジェクト",
    "syntax": ".Primitive(name)",
    "description": "名前で指定した内部実装関数（primitive関数）そのものを返します。【未対応の理由】内部実装関数（primitive）を名前で引き当てて呼び出す仕組みであり、値モデルでは表せない",
    "example": "mysqrt <- .Primitive(\"sqrt\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.Dlist",
    "category": "入出力",
    "syntax": "print(x, ...)",
    "description": "Dlistクラスのオブジェクトを表示するprintのS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "print(structure(list(a = 1), class = \"Dlist\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.simple.list",
    "category": "入出力",
    "syntax": "print(x, ...)",
    "description": "simple.listクラスのオブジェクトを表示するprintのS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "print(structure(list(1, 2), class = \"simple.list\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.data.frame",
    "category": "入出力",
    "syntax": "print(x, ..., digits = NULL, quote = FALSE, right = TRUE, row.names = TRUE, max = NULL)",
    "description": "データフレームを表示するprintのS3メソッドです。【未対応の理由】printのS3メソッドであり、メソッドディスパッチが値モデルに無い（データフレームの表示自体は基礎のprintが担う）",
    "example": "print.data.frame(data.frame(x = 1:2, y = 3:4))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.default",
    "category": "入出力",
    "syntax": "print(x, digits = NULL, quote = TRUE, na.print = NULL, print.gap = NULL, right = FALSE, max = NULL, width = NULL, useSource = TRUE, ...)",
    "description": "printのデフォルトメソッド。ベクトル等の引数を整形して表示し、引数を不可視に返します。【未対応の理由】S3 メソッドであり、任意クラスへのディスパッチをエンジンの値モデルで再現できないため（総称関数の print は基礎層で対応）",
    "example": "print.default(c(1, 2, 3))",
    "caution": "表示桁数はdigits（既定はオプション）に従います。コンソールの整形はこのモデルでは再現されません。",
    "status": "unsupported"
  },
  {
    "name": "prmatrix",
    "category": "入出力",
    "syntax": "prmatrix(x, rowlab =, collab =, quote = TRUE, right = FALSE, na.print = NULL, ...)",
    "description": "行列を旧来の形式で表示します（Sとの互換のために残された表示関数）。【未対応の理由】行列の整形表示であり、行列をエンジンの値モデルで表せないため",
    "example": "prmatrix(m6 <- diag(6), rowlab = rep(\"\", 6), collab = rep(\"\", 6))",
    "caution": "表示専用であり、値は返しません（不可視のNULL）。行・列ラベルはrowlab／collabで与えます。",
    "status": "unsupported"
  },
  {
    "name": "print.proc_time",
    "category": "システム",
    "syntax": "proc.time()",
    "description": "proc_timeオブジェクトを表示するS3メソッドです。【未対応の理由】Rプロセスの経過・CPU時間という実行時に決まる測定値であり、値モデルでは忠実に表せない",
    "example": "proc.time()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "proc.time",
    "category": "システム",
    "syntax": "proc.time()",
    "description": "現在のRプロセスが既に消費した実時間とCPU時間を秒で返します。【未対応の理由】Rプロセスの経過・CPU時間という実行時に決まる測定値であり、値モデルでは忠実に表せない",
    "example": "ptm <- proc.time()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.proc_time",
    "category": "システム",
    "syntax": "proc.time()",
    "description": "proc_timeオブジェクトの要約を表示するS3メソッドです。【未対応の理由】Rプロセスの経過・CPU時間という実行時に決まる測定値であり、値モデルでは忠実に表せない",
    "example": "proc.time()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "prod",
    "category": "集計",
    "syntax": "prod(..., na.rm = FALSE)",
    "description": "全ての引数の値の積を返します。",
    "example": "print(prod(1:7)) == print(gamma(8))",
    "caution": "NAが含まれると結果はNAになります（na.rm=TRUEで除外可能）。空の積は1です。",
    "status": "supported"
  },
  {
    "name": "prop.table",
    "category": "集計",
    "syntax": "prop.table(x, margin = NULL)",
    "description": "proportionsの旧称。表の各要素を指定マージンの合計で割った割合を返します。",
    "example": "x <- c(1, 2, 3)\nprop.table(x, margin = NULL)",
    "caution": "margin=NULL（既定）では全体の合計で割ります。",
    "status": "supported"
  },
  {
    "name": "proportions",
    "category": "集計",
    "syntax": "proportions(x, margin = NULL)",
    "description": "表の各要素を、指定マージンの合計で割った割合（条件付き比率）を返します。",
    "example": "m <- c(1, 2, 3)\nproportions(m, 1)",
    "caution": "margin=NULL（既定）では全体の合計で割ります。",
    "status": "supported"
  },
  {
    "name": "clearPushBack",
    "category": "入出力",
    "syntax": "clearPushBack(connection)",
    "description": "接続へ押し戻された行を全て破棄します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "clearPushBack(connection)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "pushBack",
    "category": "入出力",
    "syntax": "pushBack(data, connection, newLine = TRUE, encoding = c(\"\", \"bytes\", \"UTF-8\"))",
    "description": "テキスト行を接続へ押し戻し、次回の読み取りで再び読めるようにします。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "pushBack(c(\"aa\", \"bb\"), zz)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "pushBackLength",
    "category": "入出力",
    "syntax": "pushBackLength(connection)",
    "description": "接続へ押し戻されている行数を返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "pushBackLength(zz)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "as.qr",
    "category": "行列・配列",
    "syntax": "as.qr(x)",
    "description": "qrオブジェクトへ変換します（内部用）。【未対応の理由】qrオブジェクトへの内部変換であり、分解オブジェクトの生成はqr()の役割で、単体では意味を持たない",
    "example": "as.qr(x)",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "is.qr",
    "category": "行列・配列",
    "syntax": "is.qr(x)",
    "description": "qrオブジェクトかどうかを判定します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "is.qr(x)",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr",
    "category": "行列・配列",
    "syntax": "qr(x, ...)",
    "description": "行列のQR分解を計算し、分解結果（qrオブジェクト）を返します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr(matrix(c(2, 1, 1, 2), 2))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.coef",
    "category": "行列・配列",
    "syntax": "qr.coef(qr, y)",
    "description": "QR分解から、連立方程式の解（係数）を求めます。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.coef(qr(matrix(c(2, 0, 0, 2), 2)), c(2, 4))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.default",
    "category": "行列・配列",
    "syntax": "qr(x, ...)",
    "description": "qrのデフォルトメソッドです。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr(matrix(c(2, 1, 1, 2), 2))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.fitted",
    "category": "行列・配列",
    "syntax": "qr.fitted(qr, y, k = qr$rank)",
    "description": "QR分解から当てはめ値を求めます。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.fitted(qr(matrix(c(2, 0, 0, 2), 2)), c(2, 4))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.qty",
    "category": "行列・配列",
    "syntax": "qr.qty(qr, y)",
    "description": "QR分解のQ転置とベクトルの積（t(Q) %*% y）を求めます。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.qty(qr(matrix(c(2, 0, 0, 2), 2)), c(2, 4))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.qy",
    "category": "行列・配列",
    "syntax": "qr.qy(qr, y)",
    "description": "QR分解のQとベクトルの積（Q %*% y）を求めます。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.qy(qr(matrix(c(2, 0, 0, 2), 2)), c(2, 4))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.resid",
    "category": "行列・配列",
    "syntax": "qr.resid(qr, y)",
    "description": "QR分解から残差を求めます。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.resid(qr(matrix(c(2, 0, 0, 2), 2)), c(2, 4))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.solve",
    "category": "行列・配列",
    "syntax": "qr.solve(a, b, tol = 1e-7)",
    "description": "QR分解を用いて連立方程式を解きます。【未対応の理由】行列と QR 分解オブジェクトをエンジンの値モデルで表せないため",
    "example": "qr.solve(matrix(c(2, 0, 0, 2), 2), c(2, 4))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "solve.qr",
    "category": "行列・配列",
    "syntax": "qr(x, ...)",
    "description": "qrオブジェクトを用いて連立方程式を解くsolveのS3メソッドです。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "solve.qr(qr(matrix(c(2, 0, 0, 2), 2)), c(2, 4))",
    "caution": "qrオブジェクトは分解の内部表現を含むリストであり、階数（rank）やピボット選択に注意が必要です。列の線形従属があると解は一意でなくなります。",
    "status": "unsupported"
  },
  {
    "name": "qr.Q",
    "category": "行列・配列",
    "syntax": "qr.Q(qr, complete = FALSE, Dvec =)",
    "description": "qrオブジェクトから直交行列Qを再構成します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.Q(qr(matrix(1:4, 2)))",
    "caution": "ピボット選択が行われた場合、列の順序は元の行列と異なることがあります。",
    "status": "unsupported"
  },
  {
    "name": "qr.R",
    "category": "行列・配列",
    "syntax": "qr.R(qr, complete = FALSE)",
    "description": "qrオブジェクトから上三角行列Rを再構成します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.R(qr(matrix(1:4, 2)))",
    "caution": "ピボット選択が行われた場合、列の順序は元の行列と異なることがあります。",
    "status": "unsupported"
  },
  {
    "name": "qr.X",
    "category": "行列・配列",
    "syntax": "qr.X(qr, complete = FALSE, ncol =)",
    "description": "qrオブジェクトから元の行列Xを再構成します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "qr.X(qr(matrix(1:4, 2)))",
    "caution": "ピボット選択が行われた場合、列の順序は元の行列と異なることがあります。",
    "status": "unsupported"
  },
  {
    "name": "q",
    "category": "システム",
    "syntax": "q(save = \"default\", status = 0, runLast = TRUE)",
    "description": "quitの別名。現在のRセッションを終了します。【未対応の理由】Rセッションそのものを終了させる操作であり、値の計算として表せない",
    "example": "quit(\"yes\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "quit",
    "category": "システム",
    "syntax": "quit(save = \"default\", status = 0, runLast = TRUE)",
    "description": "現在のRセッションを終了します。【未対応の理由】Rセッションそのものを終了させる操作であり、値の計算として表せない",
    "example": "quit(\"yes\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Last",
    "category": "システム",
    "syntax": "quit(save = \"default\", status = 0, runLast = TRUE)",
    "description": "セッション終了時に最後に評価されるフック関数です。【未対応の理由】Rセッションそのものを終了させる操作であり、値の計算として表せない",
    "example": ".Last <- function() cat(\"終了\\n\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Last.sys",
    "category": "システム",
    "syntax": "quit(save = \"default\", status = 0, runLast = TRUE)",
    "description": "セッション終了時にシステム側で評価されるフック関数です。【未対応の理由】Rセッションそのものを終了させる操作であり、値の計算として表せない",
    "example": ".Last.sys <- function() cat(\"bye\\n\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "RNGkind",
    "category": "乱数",
    "syntax": "RNGkind(kind = NULL, normal.kind = NULL, sample.kind = NULL)",
    "description": "乱数生成器の種類（生成法・正規乱数法・標本抽出法）を設定・照会します。【未対応の理由】乱数生成器の内部状態（.Random.seed）を読み書きするものであり、このモデルでは乱数は未確定値として扱い状態を持たない",
    "example": "ok <- RNGkind()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "RNGversion",
    "category": "乱数",
    "syntax": "RNGversion(vstr)",
    "description": "指定したRバージョン当時の乱数生成器の設定を再現します。【未対応の理由】乱数生成器の内部状態（.Random.seed）を読み書きするものであり、このモデルでは乱数は未確定値として扱い状態を持たない",
    "example": "RNGversion(getRversion())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "set.seed",
    "category": "乱数",
    "syntax": "set.seed(seed, kind = NULL, normal.kind = NULL, sample.kind = NULL)",
    "description": "乱数の種を設定し、乱数列を再現可能にします。【未対応の理由】乱数生成器の内部状態（.Random.seed）を読み書きするものであり、このモデルでは乱数は未確定値として扱い状態を持たない",
    "example": "set.seed(42); u1 <- runif(30)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Random.seed",
    "category": "乱数",
    "syntax": ".Random.seed <- c(rng.kind, n1, n2, ...)",
    "description": "乱数生成器の現在の内部状態を保持する整数ベクトル（変数）です。【未対応の理由】乱数生成器の内部状態（.Random.seed）を読み書きするものであり、このモデルでは乱数は未確定値として扱い状態を持たない",
    "example": "runif(1); .Random.seed[1:6]; runif(1); .Random.seed[1:6]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "range",
    "category": "集計",
    "syntax": "range(..., na.rm = FALSE)",
    "description": "全ての引数を通じた最小値と最大値の組（長さ2）を返します。",
    "example": "range(c(1, 5, 3))",
    "caution": "na.rm=FALSE（既定）ではNAが1つでもあると結果はNA, NAになります。",
    "status": "supported"
  },
  {
    "name": ".rangeNum",
    "category": "集計",
    "syntax": ".rangeNum(..., na.rm, finite, isNumeric)",
    "description": "rangeの内部実装版（数値用）です。【未対応の理由】実 R 4.3.3 の base 名前空間に存在せず呼び出せない内部名であり、ドット始まりで共有パーサも受理しないため",
    "example": ".rangeNum(..., na.rm, finite, isNumeric)",
    "caution": "na.rm=FALSE（既定）ではNAが1つでもあると結果はNA, NAになります。",
    "status": "unsupported"
  },
  {
    "name": "rank",
    "category": "集計",
    "syntax": "rank(x, na.last = TRUE, ties.method = c(\"average\", \"first\", \"last\", \"random\", \"max\", \"min\"))",
    "description": "ベクトルの値の順位（小さい順のランク）を返します。同順位や欠損値の扱いは引数で指定します。",
    "example": "(r1 <- rank(x1 <- c(3, 1, 4, 15, 92)))",
    "caution": "ties.method=\"average\"（既定）では同点に平均順位が付きます。na.lastの指定でNAの扱いが変わります。",
    "status": "supported"
  },
  {
    "name": "rapply",
    "category": "適用関数",
    "syntax": "rapply(object, f, classes = \"ANY\", deflt = NULL, how = c(\"unlist\", \"replace\", \"list\"), ...)",
    "description": "リストの各葉（要素）に再帰的に関数fを適用します。結果の構造はhowで指定します。【未対応の理由】リストへの再帰適用であり、リストと関数値をエンジンの値モデルで表せないため",
    "example": "rapply(list(1, list(2, 3)), function(z) z * 2)",
    "caution": "classesで適用対象の型を絞れます。FUNはこのモデルで扱える関数に限ります。",
    "status": "unsupported"
  },
  {
    "name": "as.raw",
    "category": "型変換",
    "syntax": "as.raw(x)",
    "description": "数値等をraw（バイト）へ変換します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "xx[1] <- as.raw(40)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.raw",
    "category": "型変換",
    "syntax": "is.raw(x)",
    "description": "raw型かどうかを判定します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "is.raw(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "raw",
    "category": "型変換",
    "syntax": "raw(length = 0)",
    "description": "指定した長さのrawベクトル（0で初期化）を作ります。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "xx <- raw(2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rawConnection",
    "category": "入出力",
    "syntax": "rawConnection(object, open = \"r\")",
    "description": "rawベクトルへの入出力を行う接続を作ります。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない。またraw型も値モデルに無い",
    "example": "zz <- rawConnection(raw(0), \"r+\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rawConnectionValue",
    "category": "入出力",
    "syntax": "rawConnectionValue(con)",
    "description": "raw接続に書き込まれた内容をrawベクトルで返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない。またraw型も値モデルに無い",
    "example": "rawConnectionValue(zz)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "charToRaw",
    "category": "型変換",
    "syntax": "charToRaw(x)",
    "description": "文字列を、そのバイト列を表すrawベクトルへ変換します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "(y <- charToRaw(x))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "intToBits",
    "category": "型変換",
    "syntax": "intToBits(x)",
    "description": "整数を32ビットのrawベクトルへ展開します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "str(pBi <- packBits(intToBits(i)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "numToBits",
    "category": "型変換",
    "syntax": "numToBits(x)",
    "description": "数値の内部表現をビット列として取り出します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "d2b  <- function(x) vapply(as.double(x), function(x)           numToBits(x) , raw(64L))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "numToInts",
    "category": "型変換",
    "syntax": "numToInts(x)",
    "description": "数値の内部表現を整数として取り出します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "d2bI <- function(x) vapply(as.double(x), function(x) intToBits(numToInts(x)), raw(64L))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "packBits",
    "category": "型変換",
    "syntax": "packBits(x, type = c(\"raw\", \"integer\", \"double\"))",
    "description": "ビット列のrawベクトルを詰め込んでraw／整数／実数へ変換します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "packBits(as.raw(0:31))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rawShift",
    "category": "型変換",
    "syntax": "rawShift(x, n)",
    "description": "rawベクトルのビットを左右へシフトします。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "rawShift(y, 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rawToBits",
    "category": "型変換",
    "syntax": "rawToBits(x)",
    "description": "rawベクトルをビット単位のrawベクトルへ展開します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "rawToBits(y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rawToChar",
    "category": "型変換",
    "syntax": "rawToChar(x, multiple = FALSE)",
    "description": "rawベクトルを文字列へ変換します。【未対応の理由】raw型（バイト列）を扱い、値モデルにrawが無い",
    "example": "rawToChar(y)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "readBin",
    "category": "入出力",
    "syntax": "readBin(con, what, n = 1L, size = NA_integer_, signed = TRUE, endian = .Platform$endian)",
    "description": "接続またはrawベクトルからバイナリデータを読み取ります。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない。バイナリ入出力である",
    "example": "readBin(zz, integer(), 4)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "writeBin",
    "category": "入出力",
    "syntax": "writeBin(object, con, size = NA_integer_, endian = .Platform$endian, useBytes = FALSE)",
    "description": "接続またはrawベクトルへバイナリデータを書き込みます。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない。バイナリ入出力である",
    "example": "writeBin(1:10, zz)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "readChar",
    "category": "入出力",
    "syntax": "readChar(con, nchars, useBytes = FALSE)",
    "description": "接続から指定文字数分の文字列を読み取ります。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "readChar(zz, nc)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "writeChar",
    "category": "入出力",
    "syntax": "writeChar(object, con, nchars = nchar(object, type = \"chars\"), eos = \"\", useBytes = FALSE)",
    "description": "接続へ文字列を書き込みます。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "writeChar(x, zz, nc, eos = NULL)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "readLines",
    "category": "入出力",
    "syntax": "readLines(con = stdin(), n = -1L, ok = TRUE, warn = TRUE, encoding = \"unknown\", skipNul = FALSE)",
    "description": "接続からテキスト行を読み取り、文字列ベクトルで返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "readLines(fil, n = -1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "infoRDS",
    "category": "入出力",
    "syntax": "infoRDS(file)",
    "description": "RDSファイルの情報を返します。【未対応の理由】実ファイルへの入出力を伴い、オフラインの値モデルでは再現できない",
    "example": "infoRDS(file)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "readRDS",
    "category": "入出力",
    "syntax": "readRDS(file, refhook = NULL)",
    "description": "saveRDSで保存したファイルからオブジェクトを復元します。【未対応の理由】実ファイルへの入出力を伴い、オフラインの値モデルでは再現できない",
    "example": "women2 <- readRDS(fil)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "saveRDS",
    "category": "入出力",
    "syntax": "saveRDS(object, file = \"\", ascii = FALSE, version = NULL, compress = TRUE, refhook = NULL)",
    "description": "単一のRオブジェクトをファイルへ保存します（直列化）。【未対応の理由】実ファイルへの入出力を伴い、オフラインの値モデルでは再現できない",
    "example": "saveRDS(women, fil)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "readRenviron",
    "category": "システム",
    "syntax": "readRenviron(path)",
    "description": "Renviron形式のファイルを読み取り、環境変数を設定します。【未対応の理由】ファイルを読み取ってOS環境変数を設定するもので、値モデルでは再現できない",
    "example": "readRenviron(\"~/.Renviron\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Recall",
    "category": "制御",
    "syntax": "Recall(...)",
    "description": "呼び出し中の関数自身を指すプレースホルダで、改名に強い再帰関数を書くために使います。【未対応の理由】関数定義内での再帰呼び出しのプレースホルダであり、関数オブジェクトと呼び出しの仕組みに依存する",
    "example": "if(n<=2) { if(n>=0) 1 else 0 } else Recall(n-1) + Recall(n-2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "reg.finalizer",
    "category": "その他",
    "syntax": "reg.finalizer(e, f, onexit = FALSE)",
    "description": "オブジェクトがガベージコレクトされる際に呼ばれる関数を登録します。【未対応の理由】ガベージコレクション時のファイナライザ登録であり、メモリ管理の仕組みに依存する",
    "example": "g <- function(x){ e <- environment(); reg.finalizer(e, f) }",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "regmatches",
    "category": "文字列",
    "syntax": "regmatches(x, m, invert = FALSE)",
    "description": "regexpr等で得たマッチ情報mを使い、xからマッチした部分文字列を取り出します（代入形では置換します）。【未対応の理由】マッチ位置・長さの属性（match.length 等）付きの結果をエンジンの値モデルで表せないため",
    "example": "regmatches(\"abc123\", regexpr(\"[0-9]+\", \"abc123\"))",
    "caution": "mはregexpr／gregexpr／regexec等の結果でなければならず、xとの長さの対応が前提です。",
    "status": "unsupported"
  },
  {
    "name": "rep_len",
    "category": "ベクトル",
    "syntax": "rep_len(x, length.out)",
    "description": "xを繰り返して、ちょうどlength.outの長さのベクトルを作ります。",
    "example": "x <- c(1, 2)\nrep_len(x, 10)",
    "caution": "rep_lenはtimesやeachによる指定はできず、長さの調整だけを行います。",
    "status": "supported"
  },
  {
    "name": "replace",
    "category": "ベクトル",
    "syntax": "replace(x, list, values)",
    "description": "ベクトルxの、listで指定した位置の要素をvaluesで置き換えたものを返します。",
    "example": "replace(c(1, 2, 3), 2, 9)",
    "caution": "x自体は変更されず、置き換えた新しいベクトルが返ります。valuesは必要に応じてリサイクルされます。",
    "status": "supported"
  },
  {
    "name": "rev",
    "category": "ベクトル",
    "syntax": "rev(x)",
    "description": "引数の要素の順序を逆転させたものを返します。",
    "example": "stopifnot(sort(x, decreasing = TRUE) == rev(sort(x)))",
    "caution": "元のオブジェクトは変更されません。",
    "status": "supported"
  },
  {
    "name": "R.home",
    "category": "システム",
    "syntax": "R.home(component = \"home\")",
    "description": "Rのホームディレクトリ（またはその構成要素）のパスを返します。【未対応の理由】Rのインストールディレクトリという実行環境情報を返し、値モデルでは表せない",
    "example": "rbind(home = R.home(), bin  = R.home(\"bin\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "inverse.rle",
    "category": "ベクトル",
    "syntax": "inverse.rle(x, ...)",
    "description": "rleの結果から元のベクトルを復元します。【未対応の理由】連長圧縮のリスト（rle の結果）を引数に取るため、エンジンの値モデルで表せないため",
    "example": "inverse.rle(rle(c(1, 1, 2)))",
    "caution": "NAは他のNAと同一の値として連にまとめられます。",
    "status": "unsupported"
  },
  {
    "name": "print.rle",
    "category": "ベクトル",
    "syntax": "rle(x)",
    "description": "rleオブジェクトを表示するS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "print(rle(c(1, 1, 2)))",
    "caution": "NAは他のNAと同一の値として連にまとめられます。",
    "status": "unsupported"
  },
  {
    "name": "rle",
    "category": "ベクトル",
    "syntax": "rle(x)",
    "description": "ベクトルの連（同じ値の連続）の長さと値を計算します（ランレングス符号化）。【未対応の理由】連長圧縮のリスト（lengths／values）を返すため、エンジンの値モデルで表せないため",
    "example": "rle(x)",
    "caution": "NAは他のNAと同一の値として連にまとめられます。",
    "status": "unsupported"
  },
  {
    "name": "remove",
    "category": "環境",
    "syntax": "remove(..., list = character(), pos = -1, envir = as.environment(pos), inherits = FALSE)",
    "description": "指定した環境からオブジェクトを削除します（rmと同一）。【未対応の理由】環境オブジェクト・検索パスに依存し、値モデルでは忠実に表せない",
    "example": "remove(..., list = character(), pos = -1, envir = as.environment(pos), inherits = FALSE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rm",
    "category": "環境",
    "syntax": "rm (..., list = character(), pos = -1, envir = as.environment(pos), inherits = FALSE)",
    "description": "指定した環境からオブジェクトを削除します（removeと同一）。【未対応の理由】環境オブジェクト・検索パスに依存し、値モデルでは忠実に表せない",
    "example": "rm(tmp)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "ceiling",
    "category": "数学",
    "syntax": "ceiling(x)",
    "description": "各要素以上で最小の整数（正の無限大方向への丸め）を返します。",
    "example": "x1 <- c(1.5, 2.3)\n(non.int <- ceiling(x1) != floor(x1))",
    "caution": "roundの.5の扱いは偶数丸めであり、浮動小数点の内部表現により見かけと異なる結果になることがあります。",
    "status": "supported"
  },
  {
    "name": "floor",
    "category": "数学",
    "syntax": "floor(x)",
    "description": "各要素以下で最大の整数（負の無限大方向への丸め）を返します。",
    "example": "x1 <- c(1.5, 2.3)\nx1[trunc(x1) != floor(x1)]",
    "caution": "roundの.5の扱いは偶数丸めであり、浮動小数点の内部表現により見かけと異なる結果になることがあります。",
    "status": "supported"
  },
  {
    "name": "round",
    "category": "数学",
    "syntax": "round(x, digits = 0, ...)",
    "description": "数値を指定した桁数（digits、10の冪）へ丸めます。五捨六入ではなく、偶数丸め（IEC 60559）が使われます。",
    "example": "round(.5 + -2:4)",
    "caution": "roundの.5の扱いは偶数丸めであり、浮動小数点の内部表現により見かけと異なる結果になることがあります。",
    "status": "supported"
  },
  {
    "name": "signif",
    "category": "数学",
    "syntax": "signif(x, digits = 6)",
    "description": "数値を指定した有効桁数（digits）へ丸めます。",
    "example": "signif(123.456, 4)",
    "caution": "roundの.5の扱いは偶数丸めであり、浮動小数点の内部表現により見かけと異なる結果になることがあります。",
    "status": "supported"
  },
  {
    "name": "trunc",
    "category": "数学",
    "syntax": "trunc(x, ...)",
    "description": "小数部を切り捨てて整数部を返します（0方向への丸め）。",
    "example": "x1 <- c(1.5, 2.3)\nx1[trunc(x1) != floor(x1)]",
    "caution": "roundの.5の扱いは偶数丸めであり、浮動小数点の内部表現により見かけと異なる結果になることがあります。",
    "status": "supported"
  },
  {
    "name": "round.Date",
    "category": "日付と時刻",
    "syntax": "round(x, ...)",
    "description": "Dateオブジェクトを指定単位へ丸めるS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "round(as.Date(\"2026-01-15\"), \"months\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "round.POSIXt",
    "category": "日付と時刻",
    "syntax": "round(x, units = c(\"secs\", \"mins\", \"hours\", \"days\", \"months\", \"years\"))",
    "description": "POSIXtオブジェクトを指定単位へ丸めるS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "round(as.POSIXct(\"2026-01-15 10:30:00\"), \"hours\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "trunc.Date",
    "category": "日付と時刻",
    "syntax": "trunc(x, units = c(\"secs\", \"mins\", \"hours\", \"days\", \"months\", \"years\"), ...)",
    "description": "Dateオブジェクトを指定単位で切り捨てるS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "trunc(as.Date(\"2026-01-15\"), \"months\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "trunc.POSIXt",
    "category": "日付と時刻",
    "syntax": "trunc(x, units = c(\"secs\", \"mins\", \"hours\", \"days\", \"months\", \"years\"), ...)",
    "description": "POSIXtオブジェクトを指定単位で切り捨てるS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "trunc(as.POSIXct(\"2026-01-15 10:30:00\"), \"hours\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "row",
    "category": "行列・配列",
    "syntax": "row(x, as.factor = FALSE)",
    "description": "行列状オブジェクトの各要素の行番号を表す行列を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "row(matrix(1:6, nrow = 2))",
    "caution": "as.factor=TRUEでは行番号の代わりに因子を返しますが、このモデルでは因子は扱いません。",
    "status": "unsupported"
  },
  {
    "name": ".row",
    "category": "行列・配列",
    "syntax": ".row(dim)",
    "description": "rowの内部実装版（次元から直接作ります）。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "(i34 <- .row(3:4))",
    "caution": "as.factor=TRUEでは行番号の代わりに因子を返しますが、このモデルでは因子は扱いません。",
    "status": "unsupported"
  },
  {
    "name": "row.names",
    "category": "データフレーム",
    "syntax": "row.names(x)",
    "description": "データフレームの行名（文字ベクトル）を取得・設定します。【未対応の理由】基礎モデルの明記仕様でデータフレームの行名は未対応であり、行名属性を忠実に扱えない",
    "example": "row.names(df) <- 1 : 4",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "rowsum",
    "category": "集計",
    "syntax": "rowsum(x, group, reorder = TRUE, ...)",
    "description": "行列状オブジェクトについて、グループ変数groupの水準ごとに各列の合計を求めます。",
    "example": "rowsum(c(1, 2, 3, 4), c(\"a\", \"a\", \"b\", \"b\"))",
    "caution": "groupは行数と同じ長さが必要です。reorder=TRUE（既定）ではグループはソート順に並びます。",
    "status": "supported"
  },
  {
    "name": ".S3method",
    "category": "その他",
    "syntax": ".S3method(generic, class, method)",
    "description": "スクリプト内でS3メソッドを登録します。【未対応の理由】S3メソッドの登録という名前空間・ディスパッチ機構の操作であり、値モデルでは表せない",
    "example": ".S3method(\"gen\", \"cls\", met)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "save",
    "category": "入出力",
    "syntax": "save(..., list = character(), file, ascii = FALSE, version = NULL, envir = parent.frame(), ...)",
    "description": "Rオブジェクトの外部表現をファイルへ書き出します（loadで読み戻し可能）。【未対応の理由】実ファイルへの書き出し（直列化）を伴い、オフラインの値モデルでは再現できない",
    "example": "save(x, y, file = \"xy.RData\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "scale",
    "category": "行列・配列",
    "syntax": "scale(x, center = TRUE, scale = TRUE)",
    "description": "数値行列の各列を中心化（平均を引く）・尺度化（標準偏差等で割る）します。",
    "example": "x <- c(1, 2, 3)\n(centered.x <- scale(x, scale = FALSE))",
    "caution": "center／scaleに論理値・数値ベクトルのどちらも指定できます。結果にはscaled:center等の属性が付きます。このモデルでは結果を行列ではなくベクトル／データフレームで返し、scaled:center／scaled:scale 属性は付きません（数値そのものは実 R と一致します）。",
    "status": "supported"
  },
  {
    "name": "scan",
    "category": "入出力",
    "syntax": "scan(file = \"\", what = double(), nmax = -1, sep = \"\", ...)",
    "description": "コンソールまたはファイルからデータを読み取り、ベクトルやリストにします。【未対応の理由】コンソールやファイルからの読み取りであり、値モデルでは再現できない",
    "example": "pp <- scan(\"ex.data\", skip = 1, quiet = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "search",
    "category": "環境",
    "syntax": "search()",
    "description": "現在の検索パス（アタッチされたパッケージとオブジェクトの一覧）を返します。【未対応の理由】環境オブジェクト・検索パスに依存し、値モデルでは忠実に表せない",
    "example": "search()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "searchpaths",
    "category": "環境",
    "syntax": "searchpaths()",
    "description": "検索パスの各要素のパスを返します。【未対応の理由】環境オブジェクト・検索パスに依存し、値モデルでは忠実に表せない",
    "example": "searchpaths()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "isSeekable",
    "category": "入出力",
    "syntax": "isSeekable(con)",
    "description": "接続が位置の変更（シーク）に対応しているかを返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "isSeekable(con)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "seek",
    "category": "入出力",
    "syntax": "seek(con, ...)",
    "description": "接続の現在の読み書き位置を取得・設定します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "seek(con, ...)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "truncate",
    "category": "入出力",
    "syntax": "truncate(con, ...)",
    "description": "接続を指定位置で切り詰めます。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "truncate(con, ...)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "seq_along",
    "category": "ベクトル",
    "syntax": "seq_along(along.with)",
    "description": "引数の長さに沿った整数列（1, 2, …, length(along.with)）を作ります。",
    "example": "seq_along(c(\"a\", \"b\", \"c\"))",
    "caution": "長さ0の引数にはinteger(0)を返します。seq_lenと違い、引数は長さではなく対象そのものです。",
    "status": "supported"
  },
  {
    "name": "seq.Date",
    "category": "日付と時刻",
    "syntax": "seq(from, to, by, length.out = NULL, along.with = NULL, ...)",
    "description": "Dateオブジェクトの等間隔の列を作るseqのS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "seq(as.Date(\"2026-01-01\"), by = \"month\", length.out = 3)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "seq.POSIXt",
    "category": "日付と時刻",
    "syntax": "seq(from, to, by, length.out = NULL, along.with = NULL, ...)",
    "description": "POSIXtオブジェクトの等間隔の列を作るseqのS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "seq(as.POSIXct(\"2026-01-01\"), by = \"day\", length.out = 3)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sequence",
    "category": "ベクトル",
    "syntax": "sequence(nvec, ...)",
    "description": "各要素nvec[i]について1から始まる列を作り、連結したベクトルを返します（from／byの指定も可能）。",
    "example": "sequence(c(3, 2))",
    "caution": "nvecに0以下の値が含まれると、その部分は空になります。",
    "status": "supported"
  },
  {
    "name": "serialize",
    "category": "入出力",
    "syntax": "serialize(object, connection, ascii, xdr = TRUE, version = NULL, refhook = NULL)",
    "description": "Rオブジェクトを接続またはrawベクトルへ直列化します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない。また直列化形式はrawを介する",
    "example": "x <- serialize(list(1,2,3), NULL)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "unserialize",
    "category": "入出力",
    "syntax": "unserialize(connection, refhook = NULL)",
    "description": "直列化されたデータからRオブジェクトを復元します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない。また直列化形式はrawを介する",
    "example": "unserialize(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "intersect",
    "category": "ベクトル",
    "syntax": "intersect(x, y)",
    "description": "2つのベクトルの共通集合（両方に現れる要素、重複なし）を返します。",
    "example": "x <- c(1, 2)\ny <- c(2, 3)\nintersect(x, y)",
    "caution": "いずれも重複を取り除いてから処理します。NA同士は一致として扱われます。",
    "status": "supported"
  },
  {
    "name": "is.element",
    "category": "ベクトル",
    "syntax": "is.element(el, set)",
    "description": "elの各要素がsetに含まれるかを要素ごとに判定します（%in%と等価）。",
    "example": "x <- c(1, 2)\ny <- c(2, 3)\nis.element(x, y)",
    "caution": "いずれも重複を取り除いてから処理します。NA同士は一致として扱われます。",
    "status": "supported"
  },
  {
    "name": "setdiff",
    "category": "ベクトル",
    "syntax": "setdiff(x, y)",
    "description": "差集合（xにあってyにない要素、重複なし）を返します。非対称です。",
    "example": "x <- c(1, 2)\ny <- c(2, 3)\nsetdiff(x, y)",
    "caution": "いずれも重複を取り除いてから処理します。NA同士は一致として扱われます。",
    "status": "supported"
  },
  {
    "name": "setequal",
    "category": "ベクトル",
    "syntax": "setequal(x, y)",
    "description": "2つのベクトルが集合として等しいか（順序・重複を無視）を判定します。",
    "example": "x <- c(1, 2)\ny <- c(2, 3)\nsetequal(x, y)",
    "caution": "いずれも重複を取り除いてから処理します。NA同士は一致として扱われます。",
    "status": "supported"
  },
  {
    "name": "union",
    "category": "ベクトル",
    "syntax": "union(x, y)",
    "description": "2つのベクトルの和集合（重複を除いた全要素）を返します。",
    "example": "x <- c(1, 2)\ny <- c(2, 3)\nunion(x, y)",
    "caution": "いずれも重複を取り除いてから処理します。NA同士は一致として扱われます。",
    "status": "supported"
  },
  {
    "name": "setSessionTimeLimit",
    "category": "システム",
    "syntax": "setSessionTimeLimit(cpu = Inf, elapsed = Inf)",
    "description": "セッション全体の計算にCPU時間・経過時間の上限を設定します。【未対応の理由】計算時間の制限という実行環境の制御であり、値の計算として表せない",
    "example": "setSessionTimeLimit(cpu = Inf, elapsed = Inf)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "setTimeLimit",
    "category": "システム",
    "syntax": "setTimeLimit(cpu = Inf, elapsed = Inf, transient = FALSE)",
    "description": "トップレベルの計算にCPU時間・経過時間の上限を設定します。【未対応の理由】計算時間の制限という実行環境の制御であり、値の計算として表せない",
    "example": "setTimeLimit(cpu = Inf, elapsed = Inf, transient = FALSE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "closeAllConnections",
    "category": "入出力",
    "syntax": "closeAllConnections()",
    "description": "全ての接続を閉じます。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "closeAllConnections()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getAllConnections",
    "category": "入出力",
    "syntax": "getAllConnections()",
    "description": "全ての接続の番号を返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "getAllConnections()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getConnection",
    "category": "入出力",
    "syntax": "getConnection(what)",
    "description": "番号から接続オブジェクトを返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "mycon <- getConnection(3)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "isatty",
    "category": "入出力",
    "syntax": "isatty(con)",
    "description": "接続が端末かどうかを返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "c(isatty(stdin()), isatty(stdout()), isatty(stderr()))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "nullfile",
    "category": "入出力",
    "syntax": "nullfile()",
    "description": "ヌルファイル（出力捨て先）のパスを返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "nullfile()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "showConnections",
    "category": "入出力",
    "syntax": "showConnections(all = FALSE)",
    "description": "現在開いている接続の一覧を表示します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "showConnections(all = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stderr",
    "category": "入出力",
    "syntax": "stderr()",
    "description": "標準エラー出力への接続を返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "c(isatty(stdin()), isatty(stdout()), isatty(stderr()))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stdin",
    "category": "入出力",
    "syntax": "stdin()",
    "description": "標準入力への接続を返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "c(isatty(stdin()), isatty(stdout()), isatty(stderr()))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "stdout",
    "category": "入出力",
    "syntax": "stdout()",
    "description": "標準出力への接続を返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "c(isatty(stdin()), isatty(stdout()), isatty(stderr()))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "shQuote",
    "category": "文字列",
    "syntax": "shQuote(string, type = c(\"sh\", \"csh\", \"cmd\", \"cmd2\"))",
    "description": "文字列を、OSのシェルへ渡す際に安全な引用形へ変換します。",
    "example": "shQuote(\"a b\")",
    "caution": "typeでシェルの種類（sh／csh／cmd等）を指定します。実際のシェル実行は伴いません（文字列変換のみ）。",
    "status": "supported"
  },
  {
    "name": "sign",
    "category": "数学",
    "syntax": "sign(x)",
    "description": "各要素の符号（正なら1、0なら0、負なら-1）を返します。",
    "example": "sign(c(-2, 0, 3))",
    "caution": "NAはNA、NaNはNaNのまま返ります。",
    "status": "supported"
  },
  {
    "name": "sink",
    "category": "入出力",
    "syntax": "sink(file = NULL, append = FALSE, type = c(\"output\", \"message\"), split = FALSE)",
    "description": "Rの出力の送り先を接続へ切り替えます（sink.numberは切替段数を返します）。【未対応の理由】出力先を接続へ切り替える操作であり、接続と出力経路の状態に依存する",
    "example": "sink(\"sink-examp.txt\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "slice.index",
    "category": "行列・配列",
    "syntax": "slice.index(x, MARGIN)",
    "description": "配列について、指定した次元（MARGIN）に沿ったスライス番号を各要素に付けた行列を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "slice.index(matrix(1:6, nrow = 2), 1)",
    "caution": "row／colの多次元版です。",
    "status": "unsupported"
  },
  {
    "name": "@",
    "category": "その他",
    "syntax": "object@name",
    "description": "オブジェクトのスロット（S4）やプロパティの内容を取り出します。【未対応の理由】S4オブジェクトのスロット操作であり、S4クラスが値モデルに無い",
    "example": "object@name",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "@<-",
    "category": "その他",
    "syntax": "object@name",
    "description": "オブジェクトのスロットの内容を置き換えます。【未対応の理由】S4オブジェクトのスロット操作であり、S4クラスが値モデルに無い",
    "example": "object@name",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "socketSelect",
    "category": "入出力",
    "syntax": "socketSelect(socklist, write = FALSE, timeout = NULL)",
    "description": "複数のソケット接続のうち、最初に利用可能になったものを待ちます。【未対応の理由】ソケット接続の待ち合わせであり、ネットワークと接続に依存する",
    "example": "socketSelect(list(s, s), c(TRUE, FALSE), timeout = 0)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "solve",
    "category": "行列・配列",
    "syntax": "solve(a, b, ...)",
    "description": "連立方程式 a %*% x = b をxについて解きます。bを省略するとaの逆行列を返します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "solve(matrix(c(2, 0, 0, 2), 2), c(2, 4))",
    "caution": "aが特異（正則でない）場合はエラーになります。逆行列だけが必要な場合でも数値的な注意が必要です。",
    "status": "unsupported"
  },
  {
    "name": "sort",
    "category": "ベクトル",
    "syntax": "sort(x, decreasing = FALSE, ...)",
    "description": "ベクトルを昇順（既定）または降順に並べ替えたものを返します。",
    "example": "sort(c(3, 1, 2))",
    "caution": "na.last=NA（既定）ではNAは除去されます。TRUEにすると末尾、FALSEにすると先頭に置かれます。部分ソート（partial）の結果は完全には整列しません。",
    "status": "supported"
  },
  {
    "name": "sort_by",
    "category": "ベクトル",
    "syntax": "sort_by(x, y, ...)",
    "description": "オブジェクトxを、別のオブジェクトy（複数可）の順序に従って並べ替えます。データフレームでは行の並べ替えになります。【未対応の理由】R 4.4 以降の関数で基準版（R 4.3.3）に無く、データフレーム・リストの並べ替えをエンジンの値モデルで表せないため",
    "example": "with(mtcars, sort_by(mpg, am))",
    "caution": "yはxと同じ長さ・行数でなければなりません。",
    "status": "unsupported"
  },
  {
    "name": "source",
    "category": "入出力",
    "syntax": "source(file, local = FALSE, echo = verbose, print.eval = echo, exprs, ...)",
    "description": "ファイル・URL・接続からRコードを読み取り、順に評価します。【未対応の理由】ファイルやURLからコードを読み取って評価するもので、実ファイルと評価環境に依存する",
    "example": "source(\"model.R\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "withAutoprint",
    "category": "入出力",
    "syntax": "withAutoprint(exprs, evaluated = FALSE, local = parent.frame(), ...)",
    "description": "式を、自動表示（オートプリント）付きで評価する補助関数です。【未対応の理由】ファイルやURLからコードを読み取って評価するもので、実ファイルと評価環境に依存する",
    "example": "withAutoprint({ x <- 1:3; x })",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "beta",
    "category": "数学",
    "syntax": "beta(a, b)",
    "description": "ベータ関数 B(a, b) の値を返します。",
    "example": "beta(2, 3)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "choose",
    "category": "数学",
    "syntax": "choose(n, k)",
    "description": "二項係数（n個からk個を選ぶ組み合わせの数）を返します。",
    "example": "choose(5, 2)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "digamma",
    "category": "数学",
    "syntax": "digamma(x)",
    "description": "ディガンマ関数（ガンマ関数の対数微分）を返します。",
    "example": "digamma(1)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "factorial",
    "category": "数学",
    "syntax": "factorial(x)",
    "description": "階乗 x!（ガンマ関数による一般化を含む）を返します。",
    "example": "factorial(100)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "gamma",
    "category": "数学",
    "syntax": "gamma(x)",
    "description": "ガンマ関数 Γ(x) の値を返します。",
    "example": "plot(x, gamma(x), ylim = c(-20,20), col = \"red\", type = \"l\", lwd = 2, main = expression(Gamma(x)))",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "lbeta",
    "category": "数学",
    "syntax": "lbeta(a, b)",
    "description": "ベータ関数の絶対値の自然対数を返します。",
    "example": "lbeta(2, 3)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "lchoose",
    "category": "数学",
    "syntax": "lchoose(n, k)",
    "description": "二項係数の絶対値の自然対数を返します。",
    "example": "lchoose(10, 3)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "lfactorial",
    "category": "数学",
    "syntax": "lfactorial(x)",
    "description": "階乗の自然対数を返します。",
    "example": "lfactorial(10000)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "lgamma",
    "category": "数学",
    "syntax": "lgamma(x)",
    "description": "ガンマ関数の絶対値の自然対数を返します。",
    "example": "x <- 2\nlgamma(x)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "psigamma",
    "category": "数学",
    "syntax": "psigamma(x, deriv = 0)",
    "description": "ポリガンマ関数（ディガンマ関数のderiv階微分）を返します。",
    "example": "psigamma(2, deriv = 1)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "trigamma",
    "category": "数学",
    "syntax": "trigamma(x)",
    "description": "トリガンマ関数（ディガンマ関数の微分）を返します。",
    "example": "trigamma(1)",
    "caution": "gammaは負の整数ではInf、大きな引数ではオーバーフローしてInfになります。chooseのnが負の場合等は定義が拡張されています。",
    "status": "supported"
  },
  {
    "name": "split",
    "category": "ベクトル",
    "syntax": "split(x, f, drop = FALSE, ...)",
    "description": "ベクトルxを、グループ変数fの水準ごとに分割したリストを返します。【未対応の理由】グループごとの要素を集めたリストを返すため、エンジンの値モデルで表せないため",
    "example": "split(1:6, c(\"a\", \"a\", \"b\", \"b\", \"c\", \"c\"))",
    "caution": "fはxと同じ長さが必要です。drop=FALSE（既定）では要素のない水準も結果に残ります。",
    "status": "unsupported"
  },
  {
    "name": "unsplit",
    "category": "ベクトル",
    "syntax": "unsplit(value, f, drop = FALSE)",
    "description": "splitで分割したリストを、元のベクトルへ再構成します。【未対応の理由】グループごとのリスト（split の結果）を引数に取るため、エンジンの値モデルで表せないため",
    "example": "unsplit(split(1:4, c(\"a\", \"a\", \"b\", \"b\")), c(\"a\", \"a\", \"b\", \"b\"))",
    "caution": "fはxと同じ長さが必要です。drop=FALSE（既定）では要素のない水準も結果に残ります。",
    "status": "unsupported"
  },
  {
    "name": "gettextf",
    "category": "文字列",
    "syntax": "gettextf(fmt, ..., domain = NULL, trim = TRUE)",
    "description": "sprintfのラッパーで、書式文字列の翻訳（ドメイン）を介して整形します。",
    "example": "gettextf(\"value = %d\", 3)",
    "caution": "書式と値の型が合わない場合はエラーや警告になります。引数はリサイクルされます。gettextfの翻訳カタログはこのモデルには無いため、原文のまま整形されます。",
    "status": "supported"
  },
  {
    "name": "sprintf",
    "category": "文字列",
    "syntax": "sprintf(fmt, ...)",
    "description": "C言語形式の書式文字列fmtに従って値を整形し、文字列ベクトルを返します（%d、%s、%f、%.2f等）。",
    "example": "sprintf(\"%s is %f feet tall\\n\", \"Sven\", 7.1)",
    "caution": "書式と値の型が合わない場合はエラーや警告になります。引数はリサイクルされます。gettextfの翻訳カタログはこのモデルには無いため、原文のまま整形されます。",
    "status": "supported"
  },
  {
    "name": "dQuote",
    "category": "文字列",
    "syntax": "dQuote(x, q = getOption(\"useFancyQuotes\"))",
    "description": "テキストを二重引用符（“ ”）で囲みます。",
    "example": "cat(\"\\ndistinguish plain\", sQuote(\"single\"), \"and\", dQuote(\"double\"), \"quotes\\n\")",
    "caution": "使う引用符はオプションuseFancyQuotesに依存します。ASCII引用符になる設定もあります。",
    "status": "supported"
  },
  {
    "name": "sQuote",
    "category": "文字列",
    "syntax": "sQuote(x, q = getOption(\"useFancyQuotes\"))",
    "description": "テキストを一重引用符（‘ ’）で囲みます。",
    "example": "paste(\"argument\", sQuote(\"x\"), \"must be non-zero\")",
    "caution": "使う引用符はオプションuseFancyQuotesに依存します。ASCII引用符になる設定もあります。",
    "status": "supported"
  },
  {
    "name": "as.character.srcref",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcrefを文字列化するS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "close.srcfile",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcfileを閉じるS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "close.srcfilealias",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcfilealiasを閉じるS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getSrcLines",
    "category": "言語オブジェクト",
    "syntax": "getSrcLines(srcfile, first, last)",
    "description": "srcfileから指定範囲のソース行を取り出します。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "getSrcLines(src, 1, 4)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "open.srcfile",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcfileを開くS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "open.srcfilealias",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcfilealiasを開くS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.srcfile",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcfileを表示するS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.srcref",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcrefを表示するS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "srcfile",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "ソースファイルへの参照（srcfileオブジェクト）を作ります。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "src <- srcfile(system.file(\"DESCRIPTION\", package = \"base\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "srcfilealias",
    "category": "言語オブジェクト",
    "syntax": "srcfilealias(filename, srcfile)",
    "description": "srcfileの別名（エイリアス）オブジェクトを作ります。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfilealias(filename, srcfile)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "srcfilecopy",
    "category": "言語オブジェクト",
    "syntax": "srcfilecopy(filename, lines, timestamp = Sys.time(), isFile = FALSE)",
    "description": "テキスト行からsrcfileオブジェクトを作ります。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfilecopy(filename, lines, timestamp = Sys.time(), isFile = FALSE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "srcref",
    "category": "言語オブジェクト",
    "syntax": "srcref(srcfile, lloc)",
    "description": "ソースコードへの参照（srcrefオブジェクト）です。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "ref <- srcref(src, c(1, 1, 2, 1000))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.srcfile",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcfileの要約を表示するS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.srcref",
    "category": "言語オブジェクト",
    "syntax": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "description": "srcrefの要約を表示するS3メソッドです。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": "srcfile(filename, encoding = getOption(\"encoding\"), Enc = \"unknown\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".isOpen",
    "category": "言語オブジェクト",
    "syntax": ".isOpen(srcfile)",
    "description": "srcfileが開いているかを判定する内部関数です。【未対応の理由】ソースファイル参照（srcref）という言語オブジェクトとファイル操作を扱い、値モデルでは表せない",
    "example": ".isOpen(srcfile)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "standardGeneric",
    "category": "その他",
    "syntax": "standardGeneric(f, fdef)",
    "description": "S4メソッドのディスパッチを開始する関数です（通常はメソッド定義から自動生成されます）。【未対応の理由】S4メソッドディスパッチの開始関数であり、S4が値モデルに無い",
    "example": "standardGeneric(f, fdef)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "endsWith",
    "category": "文字列",
    "syntax": "endsWith(x, suffix)",
    "description": "文字列ベクトルxの各要素が、suffixで終わるかを判定します。",
    "example": "endsWith(c(\"abc\", \"abd\"), \"c\")",
    "caution": "prefix／suffixはxの長さにリサイクルされます。正規表現ではなく文字どおりの一致です。",
    "status": "supported"
  },
  {
    "name": "startsWith",
    "category": "文字列",
    "syntax": "startsWith(x, prefix)",
    "description": "文字列ベクトルxの各要素が、prefixで始まるかを判定します。",
    "example": "startsWith(c(\"abc\", \"abd\"), \"ab\")",
    "caution": "prefix／suffixはxの長さにリサイクルされます。正規表現ではなく文字どおりの一致です。",
    "status": "supported"
  },
  {
    "name": "geterrmessage",
    "category": "エラー処理",
    "syntax": "geterrmessage()",
    "description": "直近のエラーメッセージを返します。【未対応の理由】直近のエラーというセッション状態に依存し、値モデルでは表せない",
    "example": "geterrmessage()",
    "caution": "stopはエラー条件を発生させるため、tryCatch等で捕捉されない限り実行が止まります。",
    "status": "unsupported"
  },
  {
    "name": "stop",
    "category": "エラー処理",
    "syntax": "stop(..., call. = TRUE, domain = NULL)",
    "description": "実行を停止し、引数を連結したエラーメッセージを発生させます。【未対応の理由】エラー条件オブジェクトの生成・送出であり、条件機構をエンジンの値モデルで表せないため",
    "example": "try(if(iter > 10) stop(\"too many iterations\"))",
    "caution": "stopはエラー条件を発生させるため、tryCatch等で捕捉されない限り実行が止まります。",
    "status": "unsupported"
  },
  {
    "name": "stopifnot",
    "category": "エラー処理",
    "syntax": "stopifnot(..., exprs, exprObject, local = TRUE, domain = NULL)",
    "description": "全ての引数の式がTRUEでなければ、最初に満たされなかった式を示してエラーを発生させます。【未対応の理由】式の遅延評価と条件機構に依存し、エンジンの値モデルで再現できないため",
    "example": "stopifnot(1 == 1, all.equal(pi, 3.14159265), 1 < 2)",
    "caution": "各式はall(...)がTRUEになる必要があります。NAはエラー扱いです。",
    "status": "unsupported"
  },
  {
    "name": "as.character.POSIXt",
    "category": "日付と時刻",
    "syntax": "as.character(x, digits = ..., OutDec = \".\", ...)",
    "description": "POSIXtオブジェクトを文字列化するS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "as.character(as.POSIXct(\"2026-01-15 10:30:00\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "format.POSIXct",
    "category": "日付と時刻",
    "syntax": "format(x, format = \"\", tz = \"\", usetz = FALSE, ...)",
    "description": "POSIXctオブジェクトを文字列へ整形するS3メソッドです。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "format(as.POSIXct(\"2026-01-15 10:30:00\"), \"%Y/%m/%d\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "strftime",
    "category": "日付と時刻",
    "syntax": "strftime(x, format = \"\", tz = \"\", usetz = FALSE, ...)",
    "description": "日時オブジェクトを書式に従って文字列へ変換します。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "strftime(x, format = \"\", tz = \"\", usetz = FALSE, ...)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "strptime",
    "category": "日付と時刻",
    "syntax": "strptime(x, format, tz = \"\")",
    "description": "文字列を書式に従って解釈し、POSIXlt日時オブジェクトへ変換します。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "z <- strptime(x, \"%d%b%Y\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "strrep",
    "category": "文字列",
    "syntax": "strrep(x, times)",
    "description": "文字列ベクトルの各要素を、timesで指定した回数だけ繰り返し連結します。",
    "example": "strrep(\"ABC\", 2)",
    "caution": "timesは要素ごとに異なる値をベクトルで指定できます。",
    "status": "supported"
  },
  {
    "name": "strsplit",
    "category": "文字列",
    "syntax": "strsplit(x, split, fixed = FALSE, perl = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素を、区切りsplitのマッチ箇所で分割し、リストを返します。【未対応の理由】分割結果を文字列のリストとして返すため、エンジンの値モデルで表せないため",
    "example": "noquote(strsplit(\"A text I want to display with spaces\", NULL)[[1]])",
    "caution": "splitは既定では正規表現として解釈されます。固定文字列で割る場合はfixed=TRUEを指定します。分割結果はリストであり、ベクトルではありません。",
    "status": "unsupported"
  },
  {
    "name": "strtoi",
    "category": "型変換",
    "syntax": "strtoi(x, base = 0L)",
    "description": "文字列を、指定した基数（base）に従って整数へ変換します。",
    "example": "strtoi(c(\"0xff\", \"077\", \"123\"))",
    "caution": "変換できない文字列はNAになります。base=0（既定）では接頭辞（0x等）から基数を推定します。",
    "status": "supported"
  },
  {
    "name": "strtrim",
    "category": "文字列",
    "syntax": "strtrim(x, width)",
    "description": "文字列ベクトルの各要素を、指定した表示幅widthに収まるよう切り詰めます。",
    "example": "strtrim(c(\"abcdef\", \"abcdef\", \"abcdef\"), c(1,5,10))",
    "caution": "表示幅は文字数とは限りません（全角文字やエンコーディングに依存します）。",
    "status": "supported"
  },
  {
    "name": "structure",
    "category": "その他",
    "syntax": "structure(.Data, ...)",
    "description": "オブジェクトに属性（名前・次元・クラス等）を設定して返します。【未対応の理由】任意の属性（クラスを含む）を付与でき、クラス付きオブジェクトは値モデルで忠実に表せない",
    "example": "structure(1:6, dim = 2:3)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "strwrap",
    "category": "文字列",
    "syntax": "strwrap(x, width = 0.9 * getOption(\"width\"), indent = 0, exdent = 0, prefix = \"\", simplify = TRUE, initial = prefix)",
    "description": "文字列を、指定した幅に収まるよう単語境界で折り返し、段落として整形します。",
    "example": "writeLines(strwrap(x, width = 60))",
    "caution": "widthの既定値はオプションwidthに依存します。日本語のような空白のない文字列では単語境界で折れません。",
    "status": "supported"
  },
  {
    "name": "subset",
    "category": "ベクトル",
    "syntax": "subset(x, ...)",
    "description": "条件を満たす部分（ベクトル・行列・データフレームの行）を返します。【未対応の理由】条件式subsetや列選択selectを未評価の式として受け取りデータ内で評価するもので、遅延評価に本質的に依存する",
    "example": "subset(airquality, Temp > 80, select = c(Ozone, Temp))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "enquote",
    "category": "言語オブジェクト",
    "syntax": "enquote(cl)",
    "description": "関数の引数をquoteする一方向ユーティリティです。【未対応の理由】未評価の式や呼び出し等の言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "enquote(cl)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "quote",
    "category": "言語オブジェクト",
    "syntax": "quote(expr)",
    "description": "引数を評価せず、式（言語オブジェクト）そのものを返します。【未対応の理由】未評価の式や呼び出し等の言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "quote(expr)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "substitute",
    "category": "言語オブジェクト",
    "syntax": "substitute(expr, env)",
    "description": "式を未評価のまま取り出し、環境中の変数を値で置換した構文木を返します。【未対応の理由】未評価の式や呼び出し等の言語オブジェクトを扱い、値モデルでは忠実に表せない",
    "example": "(s.e <- substitute(expression(a + b), list(a = 1)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "substr",
    "category": "文字列",
    "syntax": "substr(x, start, stop)",
    "description": "文字列ベクトルのstart文字目からstop文字目までの部分文字列を取り出します（代入形では置換します）。",
    "example": "substr(\"abcdef\", 2, 4)",
    "caution": "位置は文字単位で1始まりです。範囲外の位置は切り捨てられます。NA要素はNAになります。",
    "status": "supported"
  },
  {
    "name": "substring",
    "category": "文字列",
    "syntax": "substring(text, first, last = NULL)",
    "description": "文字列のfirst文字目からlast文字目までの部分文字列を取り出します（substrとほぼ同等で、引数のリサイクル規則が異なります）。",
    "example": "substring(\"abcdef\", 1:6, 1:6)",
    "caution": "位置は文字単位で1始まりです。範囲外の位置は切り捨てられます。NA要素はNAになります。",
    "status": "supported"
  },
  {
    "name": "format.summaryDefault",
    "category": "集計",
    "syntax": "summary(object, ...)",
    "description": "summaryDefaultオブジェクトを整形するS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "format(summary(1:10))",
    "caution": "summaryは総称関数であり、結果は引数の型によって変わります。",
    "status": "unsupported"
  },
  {
    "name": "print.summaryDefault",
    "category": "集計",
    "syntax": "summary(object, ...)",
    "description": "summaryDefaultオブジェクトを表示するS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "print.summaryDefault(summary(1:10))",
    "caution": "summaryは総称関数であり、結果は引数の型によって変わります。",
    "status": "unsupported"
  },
  {
    "name": "summary",
    "category": "集計",
    "syntax": "summary(object, ...)",
    "description": "オブジェクトの要約（数値では最小・四分位・平均・最大、データフレームでは列ごと）を返します。",
    "example": "attenu <- c(1, 2, 3, 4)\nsummary(attenu, digits = 4)",
    "caution": "summaryは総称関数であり、結果は引数の型によって変わります。",
    "status": "supported"
  },
  {
    "name": "La.svd",
    "category": "行列・配列",
    "syntax": "La.svd(x, nu = min(n, p), nv = min(n, p))",
    "description": "LAPACKを用いて特異値分解を計算します（svdの厳密版）。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "La.svd(matrix(c(3, 0, 0, 2), 2))",
    "caution": "u、vの列数はnu、nvで制限できます。符号の不定性があるため、uとvの符号は実装依存です。",
    "status": "unsupported"
  },
  {
    "name": "svd",
    "category": "行列・配列",
    "syntax": "svd(x, nu = min(n, p), nv = min(n, p), LINPACK = FALSE)",
    "description": "行列の特異値分解（SVD）を計算し、特異値dと行列u、vを返します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "svd(matrix(c(3, 0, 0, 2), 2))",
    "caution": "u、vの列数はnu、nvで制限できます。符号の不定性があるため、uとvの符号は実装依存です。",
    "status": "unsupported"
  },
  {
    "name": "sweep",
    "category": "行列・配列",
    "syntax": "sweep(x, MARGIN, STATS, FUN = \"-\", check.margin = TRUE, ...)",
    "description": "配列の指定マージンについて、統計量STATSを関数FUN（既定は減算）で「掃き出し」した配列を返します。",
    "example": "sweep(data.frame(x = c(1, 2), y = c(3, 4)), 2, c(10, 20))",
    "caution": "STATSの長さは対象マージンの次元と一致しなければならず、check.marginで検査されます。FUNはこのモデルで扱える関数に限ります。",
    "status": "supported"
  },
  {
    "name": "switch",
    "category": "制御",
    "syntax": "switch(EXPR, ...)",
    "description": "式EXPRの値（文字列または数値）に応じて、後続の引数から1つを選んで評価します。【未対応の理由】式の遅延評価（選択された引数だけを評価する特殊形）に依存し、エンジンの値モデルで再現できないため",
    "example": "switch(\"b\", a = 1, b = 2)",
    "caution": "数値の場合は位置で、文字列の場合は名前の完全一致で選びます。一致する選択肢が無い場合はNULLを返します。選ばれなかった引数は評価されません。",
    "status": "unsupported"
  },
  {
    "name": "Sys.getenv",
    "category": "システム",
    "syntax": "Sys.getenv(x = NULL, unset = \"\", names = NA)",
    "description": "OSの環境変数の値を取得します。【未対応の理由】OS・実行環境の状態に依存し、値モデルでは忠実に表せない",
    "example": "Sys.getenv(c(\"R_HOME\", \"R_PAPERSIZE\", \"R_PRINTCMD\", \"HOST\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.getpid",
    "category": "システム",
    "syntax": "Sys.getpid()",
    "description": "現在のRセッションのプロセスIDを返します。【未対応の理由】OS・実行環境の状態に依存し、値モデルでは忠実に表せない",
    "example": "Sys.getpid()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.glob",
    "category": "ファイル",
    "syntax": "Sys.glob(paths, dirmark = FALSE)",
    "description": "ファイルパスに対してワイルドカード展開（glob）を行い、一致するパスを返します。【未対応の理由】実ファイルシステムに対するワイルドカード展開であり、値モデルでは再現できない",
    "example": "Sys.glob(file.path(R.home(), \"library\", \"*\", \"R\", \"*.rdx\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.info",
    "category": "システム",
    "syntax": "Sys.info()",
    "description": "OS・ユーザー等のシステム情報を返します。【未対応の理由】OS・実行環境の状態に依存し、値モデルでは忠実に表せない",
    "example": "Sys.info()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.localeconv",
    "category": "システム",
    "syntax": "Sys.localeconv()",
    "description": "現在のロケールの数値・通貨表記の詳細を返します。【未対応の理由】現在のロケール（OS・言語環境）の詳細であり、実行環境に依存する",
    "example": "Sys.localeconv()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "parent.frame",
    "category": "環境",
    "syntax": "parent.frame(n = 1)",
    "description": "呼び出し元の関数の評価環境を返します。【未対応の理由】呼び出しスタック（フレーム）へのアクセスであり、値モデルでは表せない",
    "example": "print(sys.frame(-1)); print(parent.frame())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sys.on.exit",
    "category": "環境",
    "syntax": "sys.on.exit()",
    "description": "呼び出しスタック上の関数のon.exit式を返します。【未対応の理由】呼び出しスタック（フレーム）へのアクセスであり、値モデルでは表せない",
    "example": "f <- function() { on.exit(print(1)); sys.on.exit() }",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sys.parent",
    "category": "環境",
    "syntax": "sys.parent(n = 1)",
    "description": "呼び出しスタック上n段上の関数のフレーム番号を返します。【未対応の理由】呼び出しスタック（フレーム）へのアクセスであり、値モデルでは表せない",
    "example": "f <- function() sys.parent()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sys.status",
    "category": "環境",
    "syntax": "sys.status()",
    "description": "呼び出しスタックの状態（sys.calls等をまとめたリスト）を返します。【未対応の理由】呼び出しスタック（フレーム）へのアクセスであり、値モデルでは表せない",
    "example": "gg <- function(y) sys.status()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.readlink",
    "category": "ファイル",
    "syntax": "Sys.readlink(paths)",
    "description": "パスがシンボリックリンクかどうかと、そのリンク先を返します。【未対応の理由】実ファイルへの入出力を伴い、オフラインの値モデルでは再現できない",
    "example": "is.symlink <- function(paths) isTRUE(nzchar(Sys.readlink(paths), keepNA=TRUE))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.setenv",
    "category": "システム",
    "syntax": "Sys.setenv(...)",
    "description": "OSの環境変数を設定します。【未対応の理由】OS・実行環境の状態に依存し、値モデルでは忠実に表せない",
    "example": "print(Sys.setenv(R_TEST = \"testit\", \"A+C\" = 123))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.unsetenv",
    "category": "システム",
    "syntax": "Sys.unsetenv(x)",
    "description": "OSの環境変数を削除します。【未対応の理由】OS・実行環境の状態に依存し、値モデルでは忠実に表せない",
    "example": "Sys.unsetenv(\"R_TEST\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.setFileTime",
    "category": "ファイル",
    "syntax": "Sys.setFileTime(path, time)",
    "description": "ファイルやディレクトリの時刻（更新時刻等）を設定します。【未対応の理由】実ファイルへの入出力を伴い、オフラインの値モデルでは再現できない",
    "example": "Sys.setFileTime(path, time)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.sleep",
    "category": "システム",
    "syntax": "Sys.sleep(time)",
    "description": "指定した秒数だけ、Rの実行を一時停止します。【未対応の理由】実行を一定時間停止させる副作用であり、値の計算として表せない",
    "example": "Sys.sleep(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sys.source",
    "category": "入出力",
    "syntax": "sys.source(file, envir = baseenv(), chdir = FALSE, ...)",
    "description": "ファイル中の式を構文解析し、指定した環境で順に評価します。【未対応の理由】ファイルを構文解析して環境内で評価するもので、実ファイルと評価環境に依存する",
    "example": "sys.source(tmp, env)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.Date",
    "category": "日付と時刻",
    "syntax": "Sys.Date()",
    "description": "現在の日付をDateオブジェクトで返します。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い。また現在時刻は実行時に決まる値である",
    "example": "Sys.Date()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.time",
    "category": "日付と時刻",
    "syntax": "Sys.time()",
    "description": "現在の日時をPOSIXctオブジェクトで返します。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い。また現在時刻は実行時に決まる値である",
    "example": "Sys.time()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.which",
    "category": "システム",
    "syntax": "Sys.which(names)",
    "description": "OSのコマンドwhich相当の処理で、実行ファイルのフルパスを探します。【未対応の理由】OS・実行環境の状態に依存し、値モデルでは忠実に表せない",
    "example": "Sys.which(c(\"ftp\", \"ping\", \"texi2dvi\", \"this-does-not-exist\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "shell",
    "category": "システム",
    "syntax": "system(command, intern = FALSE,",
    "description": "WindowsでOSコマンドを実行します（systemのWindows版）。【未対応の理由】OSコマンドの実行という外部呼び出しであり、値モデルでは再現できない",
    "example": "shell(\"dir\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "system",
    "category": "システム",
    "syntax": "system(command, intern = FALSE, ignore.stdout = FALSE, ignore.stderr = FALSE, wait = TRUE, input = NULL, timeout = 0, ...)",
    "description": "指定したOSコマンドをシェル経由で実行します。【未対応の理由】OSコマンドの実行という外部呼び出しであり、値モデルでは再現できない",
    "example": "t1 <- try(system(\"who\", intern = TRUE))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "system.file",
    "category": "パッケージ",
    "syntax": "system.file(..., package = \"base\", lib.loc = NULL, mustWork = FALSE)",
    "description": "パッケージ内等の、Rシステムファイルのフルパスを返します。【未対応の理由】パッケージのインストール先ファイルの探索であり、ファイルシステムに依存する",
    "example": "system.file()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "system.time",
    "category": "システム",
    "syntax": "system.time(expr, gcFirst = TRUE)",
    "description": "式を評価し、それに要したCPU時間・経過時間を返します。【未対応の理由】式の実行に要したCPU時間の測定であり、実行時に決まる測定値と遅延評価に依存する",
    "example": "system.time(for(i in 1:100) mad(runif(1000)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "system2",
    "category": "システム",
    "syntax": "system2(command, args = character(), stdout = \"\", stderr = \"\", stdin = \"\", input = NULL, env = character(), wait = TRUE, timeout = 0, ...)",
    "description": "引数を分けて指定してOSコマンドを実行します（systemの改良版）。【未対応の理由】OSコマンドの実行という外部呼び出しであり、値モデルでは再現できない",
    "example": "system2(\"echo\", \"hello\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "t",
    "category": "行列・配列",
    "syntax": "t(x)",
    "description": "行列またはデータフレームの転置（行と列の入れ替え）を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "t(matrix(1:6, nrow = 2))",
    "caution": "データフレームは行列へ変換されてから転置されるため、全要素が共通の型になります。ベクトルは1行の行列として扱われます。",
    "status": "unsupported"
  },
  {
    "name": "as.data.frame.table",
    "category": "集計",
    "syntax": "table(...,",
    "description": "tableオブジェクトをデータフレームへ変換するS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "as.data.frame(table(c(\"a\", \"b\", \"a\")))",
    "caution": "useNAでNAの数え方が変わります（既定\"no\"では数えません）。引数は因子として解釈されるため、数値の連続値はそのまま水準になります。",
    "status": "unsupported"
  },
  {
    "name": "as.table",
    "category": "集計",
    "syntax": "as.table(x, ...)",
    "description": "配列等をtableクラスのオブジェクトへ変換します。【未対応の理由】tableクラスのオブジェクトを生成し、そのクラスが値モデルに無い",
    "example": "as.table(x, ...)",
    "caution": "useNAでNAの数え方が変わります（既定\"no\"では数えません）。引数は因子として解釈されるため、数値の連続値はそのまま水準になります。",
    "status": "unsupported"
  },
  {
    "name": "is.table",
    "category": "集計",
    "syntax": "is.table(x)",
    "description": "tableクラスかどうかを判定します。【未対応の理由】tableクラスの判定であり、クラス体系が値モデルに無い",
    "example": "is.table(x)",
    "caution": "useNAでNAの数え方が変わります（既定\"no\"では数えません）。引数は因子として解釈されるため、数値の連続値はそのまま水準になります。",
    "status": "unsupported"
  },
  {
    "name": "print.summary.table",
    "category": "集計",
    "syntax": "table(...,",
    "description": "summary.tableの結果を表示するS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "print.summary.table(summary(table(c(\"a\", \"b\", \"a\"))))",
    "caution": "useNAでNAの数え方が変わります（既定\"no\"では数えません）。引数は因子として解釈されるため、数値の連続値はそのまま水準になります。",
    "status": "unsupported"
  },
  {
    "name": "summary.table",
    "category": "集計",
    "syntax": "table(...,",
    "description": "tableオブジェクトの要約（カイ二乗検定等）を表示するS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "summary.table(table(c(\"a\", \"b\", \"a\")))",
    "caution": "useNAでNAの数え方が変わります（既定\"no\"では数えません）。引数は因子として解釈されるため、数値の連続値はそのまま水準になります。",
    "status": "unsupported"
  },
  {
    "name": "table",
    "category": "集計",
    "syntax": "table(..., exclude = if (useNA == \"no\") c(NA, NaN), useNA = c(\"no\", \"ifany\", \"always\"), dnn = list.names(...), deparse.level = 1)",
    "description": "因子（または因子化できる引数）の水準の組み合わせごとに度数を数え、分割表（度数表）を作ります。",
    "example": "table(c(\"a\", \"b\", \"a\"))",
    "caution": "useNAでNAの数え方が変わります（既定\"no\"では数えません）。引数は因子として解釈されるため、数値の連続値はそのまま水準になります。このモデルでは1本のベクトルの度数のみ対応し、結果は度数の名前付きベクトルで返します。複数ベクトルの分割表は未対応です。",
    "status": "supported"
  },
  {
    "name": "[.table",
    "category": "集計",
    "syntax": "table(...,",
    "description": "tableオブジェクトの部分を取り出すS3メソッドです。【未対応の理由】S3メソッドであり、対象クラスとメソッドディスパッチが値モデルに無い",
    "example": "table(c(\"a\", \"b\", \"a\"))[1]",
    "caution": "useNAでNAの数え方が変わります（既定\"no\"では数えません）。引数は因子として解釈されるため、数値の連続値はそのまま水準になります。",
    "status": "unsupported"
  },
  {
    "name": "tabulate",
    "category": "集計",
    "syntax": "tabulate(bin, nbins = max(1, bin, na.rm = TRUE))",
    "description": "整数値ベクトルbinについて、1からnbinsまでの各整数が何回現れるかを数えます。",
    "example": "tabulate(c(2,3,5))",
    "caution": "binの範囲外の値やNAは無視されます。",
    "status": "supported"
  },
  {
    "name": "Exec",
    "category": "制御",
    "syntax": "Exec(expr, envir)",
    "description": "式を現在のフレームで実行（exec）し、末尾再帰を可能にします。【未対応の理由】末尾呼び出しの実行機構（式の評価フレームの再利用）であり、値モデルでは表せない",
    "example": "Exec(as.call(c(list(substitute(what)), args)), parent.frame())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Tailcall",
    "category": "制御",
    "syntax": "Tailcall(FUN, ...)",
    "description": "関数呼び出しを末尾呼び出しとして実行し、スタック消費を抑えます。【未対応の理由】末尾呼び出しの実行機構（式の評価フレームの再利用）であり、値モデルでは表せない",
    "example": "Tailcall(lfact_iter, val, n - 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tapply",
    "category": "適用関数",
    "syntax": "tapply(X, INDEX, FUN = NULL, ..., default = NA, simplify = TRUE)",
    "description": "ベクトルXを、INDEX（グループ変数）の水準の組み合わせごとに分け、各グループへ関数FUNを適用します。",
    "example": "tapply(c(1, 2, 3, 4), c(\"a\", \"a\", \"b\", \"b\"), \"sum\")",
    "caution": "INDEXはXと同じ長さが必要です。FUN=NULLのときは添字ベクトルが返ります。FUNはこのモデルで扱える関数に限ります。このモデルでは FUN は文字列で集計名（\"sum\" 等）を指定する形のみ対応します。関数名をそのまま渡す形は未対応です。",
    "status": "supported"
  },
  {
    "name": "addTaskCallback",
    "category": "システム",
    "syntax": "addTaskCallback(f, data = NULL, name = character())",
    "description": "トップレベルのタスクが完了するたびに呼ばれる関数を登録します。【未対応の理由】トップレベルタスク完了時のコールバック登録というセッション機構であり、値モデルでは表せない",
    "example": "n <- addTaskCallback(times(4))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "removeTaskCallback",
    "category": "システム",
    "syntax": "removeTaskCallback(id)",
    "description": "登録したタスクコールバックを解除します。【未対応の理由】トップレベルタスク完了時のコールバック登録というセッション機構であり、値モデルでは表せない",
    "example": "removeTaskCallback(n)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "taskCallbackManager",
    "category": "システム",
    "syntax": "taskCallbackManager(handlers = list(), registered = FALSE, verbose = FALSE)",
    "description": "トップレベルタスク完了時のコールバックを管理するマネージャを作ります。【未対応の理由】タスクコールバックの管理機構であり、値モデルでは表せない",
    "example": "h <- taskCallbackManager()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getTaskCallbackNames",
    "category": "システム",
    "syntax": "getTaskCallbackNames()",
    "description": "現在登録されている内部タスクコールバックの名前を返します。【未対応の理由】タスクコールバックの登録状態というセッション情報であり、値モデルでは表せない",
    "example": "getTaskCallbackNames()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tempdir",
    "category": "ファイル",
    "syntax": "tempdir()",
    "description": "セッション用の一時ディレクトリのパスを返します。【未対応の理由】一時ファイルのパス生成であり、実ファイルシステムを前提とする",
    "example": "tempdir()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tempfile",
    "category": "ファイル",
    "syntax": "tempfile(pattern = \"file\", tmpdir = tempdir(), fileext = \"\")",
    "description": "一時ファイルとして使えるファイル名（パス）を生成します。【未対応の理由】一時ファイルのパス生成であり、実ファイルシステムを前提とする",
    "example": "tempfile(c(\"ab\", \"a b c\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "textConnection",
    "category": "入出力",
    "syntax": "textConnection(object, open = \"r\", local = FALSE, name = deparse1(substitute(object)), encoding = c(\"\", \"bytes\", \"UTF-8\"))",
    "description": "文字列ベクトルへの入出力を行うテキスト接続を作ります。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "zz <- textConnection(LETTERS)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "textConnectionValue",
    "category": "入出力",
    "syntax": "textConnectionValue(con)",
    "description": "テキスト接続へ書き込まれた内容を文字列ベクトルで返します。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "textConnectionValue(con)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "~",
    "category": "演算子",
    "syntax": "y ~ model",
    "description": "モデル式（formula）の左辺と右辺を区切るチルダ演算子です（y ~ model）。【未対応の理由】モデル式（formula）オブジェクトを構築する演算子であり、formulaが値モデルに無い",
    "example": "y ~ model",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "OlsonNames",
    "category": "日付と時刻",
    "syntax": "OlsonNames(tzdir = NULL)",
    "description": "利用可能なタイムゾーン名（Olson名）の一覧を返します。【未対応の理由】OSのタイムゾーンデータベースとPOSIXtクラスに依存し、値モデルでは表せない",
    "example": "str(OlsonNames())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "Sys.timezone",
    "category": "日付と時刻",
    "syntax": "Sys.timezone(location = TRUE)",
    "description": "現在のタイムゾーンの名前を返します。【未対応の理由】OSのタイムゾーンデータベースとPOSIXtクラスに依存し、値モデルでは表せない",
    "example": "Sys.timezone()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".sys.timezone",
    "category": "日付と時刻",
    "syntax": "Sys.timezone(location = TRUE)",
    "description": "タイムゾーンを保持する内部変数です。【未対応の理由】OSのタイムゾーンデータベースとPOSIXtクラスに依存し、値モデルでは表せない",
    "example": ".sys.timezone",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "is.string",
    "category": "文字列",
    "syntax": "is.string(x)",
    "description": "xが「文字列」かどうか、すなわち長さ1の文字列ベクトルかどうかを判定します。",
    "example": "x <- \"a\"\nis.string(x)",
    "caution": "toStringは長い要素を切り詰めることがあります（width指定）。is.stringはR 4.4以降で追加された関数です（R-develヘルプに記載）。",
    "status": "supported"
  },
  {
    "name": "toString",
    "category": "文字列",
    "syntax": "toString(x, ...)",
    "description": "オブジェクトを、幅に収まる1つの文字列へ変換します（formatの補助関数）。",
    "example": "x <- c(1, 2)\ntoString(x)",
    "caution": "toStringは長い要素を切り詰めることがあります（width指定）。is.stringはR 4.4以降で追加された関数です（R-develヘルプに記載）。",
    "status": "supported"
  },
  {
    "name": "returnValue",
    "category": "その他",
    "syntax": "returnValue(default = NULL)",
    "description": "トレース中の関数の戻り値を返します。【未対応の理由】関数の呼び出しへのデバッグコード挿入（トレース）機構であり、値の計算として表せない",
    "example": "returnValue(default = NULL)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "trace",
    "category": "その他",
    "syntax": "trace(what, tracer, exit, at, print, signature, where = topenv(parent.frame()), edit = FALSE)",
    "description": "関数の指定箇所にデバッグ用コードを挿入してトレースを有効にします。【未対応の理由】関数の呼び出しへのデバッグコード挿入（トレース）機構であり、値の計算として表せない",
    "example": "trace(sum)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tracingState",
    "category": "その他",
    "syntax": "tracingState(on = NULL)",
    "description": "トレース機能の有効・無効を照会・設定します。【未対応の理由】関数の呼び出しへのデバッグコード挿入（トレース）機構であり、値の計算として表せない",
    "example": "tracingState(on = NULL)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "untrace",
    "category": "その他",
    "syntax": "untrace(what, signature = NULL, where = topenv(parent.frame()))",
    "description": "traceによるトレースを取り消します。【未対応の理由】関数の呼び出しへのデバッグコード挿入（トレース）機構であり、値の計算として表せない",
    "example": "untrace(sum)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".doTrace",
    "category": "その他",
    "syntax": ".doTrace(expr, msg)",
    "description": "トレース時に式を評価する内部関数です。【未対応の理由】関数の呼び出しへのデバッグコード挿入（トレース）機構であり、値の計算として表せない",
    "example": ".doTrace(expr, msg)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "traceback",
    "category": "その他",
    "syntax": "traceback(x = NULL, max.lines = getOption(\"traceback.max.lines\", getOption(\"deparse.max.lines\", -1L)))",
    "description": "直近の捕捉されなかったエラーの呼び出しスタックを表示します。【未対応の理由】呼び出しスタックの照会であり、値モデルでは表せない",
    "example": "traceback()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Traceback",
    "category": "その他",
    "syntax": "traceback(x = NULL, max.lines = getOption(\"traceback.max.lines\",",
    "description": "直近のエラーの呼び出しスタックを保持する変数です。【未対応の理由】呼び出しスタックの照会であり、値モデルでは表せない",
    "example": ".Traceback",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".traceback",
    "category": "その他",
    "syntax": ".traceback(x = NULL, max.lines = getOption(\"traceback.max.lines\", getOption(\"deparse.max.lines\", -1L)))",
    "description": "呼び出しスタックをリストとして返します。【未対応の理由】呼び出しスタックの照会であり、値モデルでは表せない",
    "example": ".traceback(x = NULL, max.lines = getOption(\"traceback.max.lines\", getOption(\"deparse.max.lines\", -1L)))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "retracemem",
    "category": "その他",
    "syntax": "retracemem(x, previous = NULL)",
    "description": "コピーされたオブジェクトへ印を引き継ぎます。【未対応の理由】オブジェクトの内部コピーの追跡というメモリ管理機構であり、値モデルでは表せない",
    "example": "retracemem(f, retracemem(d))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "tracemem",
    "category": "その他",
    "syntax": "tracemem(x)",
    "description": "オブジェクトに印を付け、内部でコピーされるたびにメッセージを表示させます。【未対応の理由】オブジェクトの内部コピーの追跡というメモリ管理機構であり、値モデルでは表せない",
    "example": "tracemem(a)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "untracemem",
    "category": "その他",
    "syntax": "untracemem(x)",
    "description": "tracememの印を取り消します。【未対応の理由】オブジェクトの内部コピーの追跡というメモリ管理機構であり、値モデルでは表せない",
    "example": "untracemem(a)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "transform",
    "category": "データフレーム",
    "syntax": "transform(`_data`, ...)",
    "description": "データフレームの列を、その内部で式を評価して追加・変更します。【未対応の理由】データフレーム内で式を評価して列を追加・変更するもので、遅延評価に本質的に依存する",
    "example": "transform(airquality, Ozone = -Ozone)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "acos",
    "category": "数学",
    "syntax": "acos(x)",
    "description": "逆余弦（アークコサイン）を返します。結果はラジアンで、範囲は[0, π]です。",
    "example": "acos(0.5)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "asin",
    "category": "数学",
    "syntax": "asin(x)",
    "description": "逆正弦（アークサイン）を返します。結果はラジアンで、範囲は[-π/2, π/2]です。",
    "example": "asin(0.5)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "atan",
    "category": "数学",
    "syntax": "atan(x)",
    "description": "逆正接（アークタンジェント）を返します。結果はラジアンです。",
    "example": "x <- 1\natan(x)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "atan2",
    "category": "数学",
    "syntax": "atan2(y, x)",
    "description": "y/xの逆正接を、象限を考慮して返します（2引数のアークタンジェント）。",
    "example": "x <- 2\ny <- 1\natan2(y, x)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "cos",
    "category": "数学",
    "syntax": "cos(x)",
    "description": "余弦（コサイン）を返します。引数はラジアンです。",
    "example": "tx <- cbind(x, cos(pi*x), cospi(x), sin(pi*x), sinpi(x), tan(pi*x), tanpi(x), deparse.level=2)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "cospi",
    "category": "数学",
    "syntax": "cospi(x)",
    "description": "cos(π*x)を、π倍の表現のまま精度よく計算します。",
    "example": "tx <- cbind(x, cos(pi*x), cospi(x), sin(pi*x), sinpi(x), tan(pi*x), tanpi(x), deparse.level=2)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "sin",
    "category": "数学",
    "syntax": "sin(x)",
    "description": "正弦（サイン）を返します。引数はラジアンです。",
    "example": "tx <- cbind(x, cos(pi*x), cospi(x), sin(pi*x), sinpi(x), tan(pi*x), tanpi(x), deparse.level=2)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "sinpi",
    "category": "数学",
    "syntax": "sinpi(x)",
    "description": "sin(π*x)を、π倍の表現のまま精度よく計算します。",
    "example": "tx <- cbind(x, cos(pi*x), cospi(x), sin(pi*x), sinpi(x), tan(pi*x), tanpi(x), deparse.level=2)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "tan",
    "category": "数学",
    "syntax": "tan(x)",
    "description": "正接（タンジェント）を返します。引数はラジアンです。",
    "example": "tx <- cbind(x, cos(pi*x), cospi(x), sin(pi*x), sinpi(x), tan(pi*x), tanpi(x), deparse.level=2)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "tanpi",
    "category": "数学",
    "syntax": "tanpi(x)",
    "description": "tan(π*x)を、π倍の表現のまま精度よく計算します。",
    "example": "tx <- cbind(x, cos(pi*x), cospi(x), sin(pi*x), sinpi(x), tan(pi*x), tanpi(x), deparse.level=2)",
    "caution": "定義域外の引数（例：acos(2)）ではNaNと警告になります。角度は度ではなくラジアンです。",
    "status": "supported"
  },
  {
    "name": "trimws",
    "category": "文字列",
    "syntax": "trimws(x, which = c(\"both\", \"left\", \"right\"), whitespace = \"[ \\t\\r\\n]\")",
    "description": "文字列の先頭・末尾（whichで指定、既定は両端）の空白を取り除きます。",
    "example": "x <- \" a \"\ntrimws(x)",
    "caution": "対象はwhitespace引数（既定は空白・タブ・改行）で変更できます。文字列内部の空白は除去されません。",
    "status": "supported"
  },
  {
    "name": "try",
    "category": "エラー処理",
    "syntax": "try(expr, silent = FALSE, outFile = getOption(\"try.outFile\", default = stderr()))",
    "description": "式を評価し、エラーが起きても実行を止めず、エラーオブジェクトを返します。【未対応の理由】式の遅延評価と条件（エラー）機構に依存し、エンジンの値モデルで再現できないため",
    "example": "try(log(\"a\"))",
    "caution": "返り値は通常の値とエラーオブジェクト（try-errorクラス）のどちらかになります。silent=TRUEでエラーメッセージの表示を抑えます。",
    "status": "unsupported"
  },
  {
    "name": "typeof",
    "category": "型判定",
    "syntax": "typeof(x)",
    "description": "オブジェクトの内部型（typeof：double／integer／character／logical／list等）を返します。",
    "example": "typeof(2)",
    "caution": "modeやstorage.modeとは分類が異なります。整数もdoubleも数値ですが、typeofでは区別されます。",
    "status": "supported"
  },
  {
    "name": "unique",
    "category": "ベクトル",
    "syntax": "unique(x, incomparables = FALSE, ...)",
    "description": "ベクトル・データフレーム・配列から、重複した要素（または行）を取り除いたものを返します。",
    "example": "x <- c(1, 1, 2)\n(ux <- unique(x))",
    "caution": "順序は最初の出現順に保持されます。データフレームでは行単位で重複が除かれます。",
    "status": "supported"
  },
  {
    "name": "units",
    "category": "その他",
    "syntax": "units(x)",
    "description": "オブジェクトの単位（units属性）を取得・設定する総称関数です。【未対応の理由】単位（units）属性を持つS3オブジェクトのための総称関数であり、クラスと属性体系が値モデルに無い",
    "example": "units(x)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "unlink",
    "category": "ファイル",
    "syntax": "unlink(x, recursive = FALSE, force = FALSE, expand = TRUE)",
    "description": "指定したファイルやディレクトリを削除します。【未対応の理由】実ファイルへの入出力を伴い、オフラインの値モデルでは再現できない",
    "example": "unlink(x, recursive = FALSE, force = FALSE, expand = TRUE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "unlist",
    "category": "リスト",
    "syntax": "unlist(x, recursive = TRUE, use.names = TRUE)",
    "description": "リスト構造を平坦化し、全ての原子要素を含む1つのベクトルを返します。",
    "example": "unlist(c(a = 1, b = 2))",
    "caution": "要素の型が混在する場合は共通の型へ変換されます。recursive=FALSEでは1階層だけを展開します。",
    "status": "supported"
  },
  {
    "name": ".unlist",
    "category": "リスト",
    "syntax": ".unlist(x, recursive = TRUE, use.names = TRUE)",
    "description": "unlistの内部実装版です。【未対応の理由】実 R 4.3.3 の base 名前空間に存在せず呼び出せない内部名であり、ドット始まりで共有パーサも受理しないため（unlist 本体は対応）",
    "example": ".unlist(x, recursive = TRUE, use.names = TRUE)",
    "caution": "要素の型が混在する場合は共通の型へ変換されます。recursive=FALSEでは1階層だけを展開します。",
    "status": "unsupported"
  },
  {
    "name": "unname",
    "category": "ベクトル",
    "syntax": "unname(obj, force = FALSE)",
    "description": "オブジェクトの名前属性（names／dimnames）を取り除いて返します。",
    "example": "barplot(unname(z), axes = FALSE)",
    "caution": "元のオブジェクトは変更されず、属性を外したコピーが返ります。",
    "status": "supported"
  },
  {
    "name": "use",
    "category": "パッケージ",
    "syntax": "use(package, include.only)",
    "description": "スクリプト内でパッケージを読み込み、その公開要素を検索パスへアタッチします。【未対応の理由】パッケージの名前空間の読み込みとアタッチを伴い、値モデルでは再現できない",
    "example": "use(package, include.only)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "NextMethod",
    "category": "その他",
    "syntax": "NextMethod(generic = NULL, object = NULL, ...)",
    "description": "現在のメソッドから、クラス階層の次のメソッドを呼び出します。【未対応の理由】S3メソッドディスパッチそのものの機構であり、任意クラスへのディスパッチが値モデルに無い",
    "example": "NextMethod(generic = NULL, object = NULL, ...)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "UseMethod",
    "category": "その他",
    "syntax": "UseMethod(generic, object)",
    "description": "総称関数から、引数のクラスに応じたS3メソッドへディスパッチします。【未対応の理由】S3メソッドディスパッチそのものの機構であり、任意クラスへのディスパッチが値モデルに無い",
    "example": "UseMethod(generic, object)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Class",
    "category": "その他",
    "syntax": "UseMethod(generic, object)",
    "description": "ディスパッチ中のオブジェクトのクラスを保持する変数です。【未対応の理由】S3メソッドディスパッチそのものの機構であり、任意クラスへのディスパッチが値モデルに無い",
    "example": "f.default <- function(x) .Class",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Generic",
    "category": "その他",
    "syntax": "UseMethod(generic, object)",
    "description": "ディスパッチ中の総称関数名を保持する変数です。【未対応の理由】S3メソッドディスパッチそのものの機構であり、任意クラスへのディスパッチが値モデルに無い",
    "example": "f.default <- function(x) .Generic",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".Method",
    "category": "その他",
    "syntax": "UseMethod(generic, object)",
    "description": "ディスパッチ中のメソッド名を保持する変数です。【未対応の理由】S3メソッドディスパッチそのものの機構であり、任意クラスへのディスパッチが値モデルに無い",
    "example": "f.default <- function(x) .Method",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "getHook",
    "category": "パッケージ",
    "syntax": "getHook(hookName)",
    "description": "指定した名前のフックに登録された関数のリストを返します。【未対応の理由】パッケージの読み込みイベントへのフック登録であり、パッケージ機構に依存する",
    "example": "getHook(hookName)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "packageEvent",
    "category": "パッケージ",
    "syntax": "packageEvent(pkgname, event = c(\"onLoad\", \"attach\", \"detach\", \"onUnload\"))",
    "description": "パッケージイベントのフック名を生成します。【未対応の理由】パッケージの読み込みイベントへのフック登録であり、パッケージ機構に依存する",
    "example": "setHook(packageEvent(\"grDevices\", \"onLoad\"), function(...) grDevices::ps.options(horizontal = FALSE))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "setHook",
    "category": "パッケージ",
    "syntax": "setHook(hookName, value, action = c(\"append\", \"prepend\", \"replace\"))",
    "description": "パッケージイベントのフックへ関数を登録します。【未対応の理由】パッケージの読み込みイベントへのフック登録であり、パッケージ機構に依存する",
    "example": "setHook(packageEvent(\"grDevices\", \"onLoad\"), function(...) grDevices::ps.options(horizontal = FALSE))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".userHooksEnv",
    "category": "パッケージ",
    "syntax": "getHook(hookName)",
    "description": "ユーザーフックを保持する内部環境です。【未対応の理由】パッケージの読み込みイベントへのフック登録であり、パッケージ機構に依存する",
    "example": ".userHooksEnv",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "intToUtf8",
    "category": "文字列",
    "syntax": "intToUtf8(x, multiple = FALSE, allow_surrogate_pairs = FALSE)",
    "description": "Unicodeコードポイントの整数ベクトルを、UTF-8文字列へ変換します。",
    "example": "intToUtf8(946)",
    "caution": "不正なバイト列ではNAになります。intToUtf8で0は終端として扱われます。",
    "status": "supported"
  },
  {
    "name": "utf8ToInt",
    "category": "文字列",
    "syntax": "utf8ToInt(x)",
    "description": "UTF-8で符号化された文字列を、Unicodeコードポイントの整数ベクトルへ変換します。",
    "example": "utf8ToInt(\"bißchen\")",
    "caution": "不正なバイト列ではNAになります。intToUtf8で0は終端として扱われます。",
    "status": "supported"
  },
  {
    "name": "validEnc",
    "category": "文字列",
    "syntax": "validEnc(x)",
    "description": "文字列が想定エンコーディングとして妥当かを判定します（validUTF8の一般化）。",
    "example": "validEnc(\"abc\")",
    "caution": "判定はバイト列の形式のみであり、文字化けの有無までは保証しません。",
    "status": "supported"
  },
  {
    "name": "validUTF8",
    "category": "文字列",
    "syntax": "validUTF8(x)",
    "description": "文字列ベクトルの各要素が、そのエンコーディングとして正しいかを判定します。",
    "example": "validUTF8(c(\"a\", \"b\"))",
    "caution": "判定はバイト列の形式のみであり、文字化けの有無までは保証しません。",
    "status": "supported"
  },
  {
    "name": "as.vector",
    "category": "型変換",
    "syntax": "as.vector(x, mode = \"any\")",
    "description": "オブジェクトをベクトルへ変換します。属性（名前以外）は取り除かれます。",
    "example": "as.vector(c(a = 1, b = 2))",
    "caution": "is.vectorは名前属性を持つベクトルでもTRUEですが、dim等の属性があるとFALSEになります。",
    "status": "supported"
  },
  {
    "name": "is.vector",
    "category": "型変換",
    "syntax": "is.vector(x, mode = \"any\")",
    "description": "オブジェクトがベクトル（属性を持たない原子ベクトル等）かどうかを判定します。",
    "example": "x <- c(1, 2)\nis.vector(x)",
    "caution": "is.vectorは名前属性を持つベクトルでもTRUEですが、dim等の属性があるとFALSEになります。",
    "status": "supported"
  },
  {
    "name": "vector",
    "category": "型変換",
    "syntax": "vector(mode = \"logical\", length = 0)",
    "description": "指定したモード（型）と長さのベクトルを、型のゼロ値で初期化して作ります。",
    "example": "vector(\"numeric\", 3)",
    "caution": "is.vectorは名前属性を持つベクトルでもTRUEですが、dim等の属性があるとFALSEになります。",
    "status": "supported"
  },
  {
    "name": "Vectorize",
    "category": "適用関数",
    "syntax": "Vectorize(FUN, vectorize.args = arg.names, SIMPLIFY = TRUE, USE.NAMES = TRUE)",
    "description": "スカラー関数をベクトル化した新しい関数を返します（mapplyのラッパー生成）。【未対応の理由】関数を受け取り新しい関数オブジェクトを返すもので、値モデルでは関数を値として表せない",
    "example": "vrep <- Vectorize(rep.int)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "R.Version",
    "category": "システム",
    "syntax": "R.Version()",
    "description": "実行中のRの詳細なバージョン情報をリストで返します。【未対応の理由】実行中のR本体のバージョン情報という実行環境の値であり、値モデルでは表せない",
    "example": "R.Version()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "R.version.string",
    "category": "システム",
    "syntax": "R.version.string",
    "description": "Rのバージョンを表す文字列（変数）です。【未対応の理由】実行中のR本体のバージョン情報という実行環境の値であり、値モデルでは表せない",
    "example": "mtext(R.version.string, side = 1, line = 4, adj = 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "R_compiled_by",
    "category": "システム",
    "syntax": "R_compiled_by()",
    "description": "Rをコンパイルしたコンパイラの情報を返します。【未対応の理由】実行中のR本体のバージョン情報という実行環境の値であり、値モデルでは表せない",
    "example": "R_compiled_by()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "version",
    "category": "システム",
    "syntax": "R.version",
    "description": "Rのバージョン情報を保持するリスト（変数）です（R.versionのコピー）。【未対応の理由】実行中のR本体のバージョン情報という実行環境の値であり、値モデルでは表せない",
    "example": "R.version$os",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "suppressWarnings",
    "category": "エラー処理",
    "syntax": "suppressWarnings(expr, classes = \"warning\")",
    "description": "式を評価し、その間の警告を抑制します。【未対応の理由】警告条件（condition）の生成・抑制という条件機構とセッション状態に依存し、値の計算として表せない",
    "example": "suppressWarnings(warning(\"testit\"))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "warning",
    "category": "エラー処理",
    "syntax": "warning(..., call. = TRUE, immediate. = FALSE, noBreaks. = FALSE, domain = NULL)",
    "description": "警告メッセージを発生させます（実行は止まりません）。【未対応の理由】警告条件（condition）の生成・抑制という条件機構とセッション状態に依存し、値の計算として表せない",
    "example": "testit <- function() warning(\"testit\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "c.warnings",
    "category": "エラー処理",
    "syntax": "warnings(...)",
    "description": "warningsオブジェクトを結合するS3メソッドです。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "c(warnings(), warnings())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "duplicated.warnings",
    "category": "エラー処理",
    "syntax": "warnings(...)",
    "description": "warningsオブジェクトの重複を判定するS3メソッドです。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "duplicated(warnings())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "last.warning",
    "category": "エラー処理",
    "syntax": "warnings(...)",
    "description": "直近の警告を保持する内部変数です。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "last.warning",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.summary.warnings",
    "category": "エラー処理",
    "syntax": "print(x, ...)",
    "description": "warningsの要約を表示するS3メソッドです。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "print(summary(warnings()))",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "print.warnings",
    "category": "エラー処理",
    "syntax": "print(x, tags, header, ...)",
    "description": "warningsオブジェクトを表示するS3メソッドです。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "print(warnings())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "summary.warnings",
    "category": "エラー処理",
    "syntax": "summary(object, ...)",
    "description": "warningsオブジェクトの要約を作るS3メソッドです。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "summary(warnings())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "unique.warnings",
    "category": "エラー処理",
    "syntax": "warnings(...)",
    "description": "warningsオブジェクトの重複を取り除くS3メソッドです。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "unique(warnings())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "warnings",
    "category": "エラー処理",
    "syntax": "warnings(...)",
    "description": "直近のトップレベル命令で発生した警告の一覧を表示します。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "tail(warnings(), 2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "[.warnings",
    "category": "エラー処理",
    "syntax": "warnings(...)",
    "description": "warningsオブジェクトの部分を取り出すS3メソッドです。【未対応の理由】セッションに蓄積された警告（last.warning）という状態に依存し、値モデルでは表せない",
    "example": "warnings()[1]",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "julian",
    "category": "日付と時刻",
    "syntax": "julian(x, ...)",
    "description": "Date／POSIXtオブジェクトから、起点からの日数（ユリウス日）を求めます。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "julian(Sys.Date(), -2440588)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "months",
    "category": "日付と時刻",
    "syntax": "months(x, abbreviate)",
    "description": "Date／POSIXtオブジェクトから月名を取り出します。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "months  (.leap.seconds)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "quarters",
    "category": "日付と時刻",
    "syntax": "quarters(x, abbreviate)",
    "description": "Date／POSIXtオブジェクトから四半期（Q1〜Q4）を取り出します。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "quarters(.leap.seconds)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "weekdays",
    "category": "日付と時刻",
    "syntax": "weekdays(x, abbreviate)",
    "description": "Date／POSIXtオブジェクトから曜日名を取り出します。【未対応の理由】Date／POSIXtクラスの日時オブジェクトを前提とし、値モデルに日付・時刻クラスが無い",
    "example": "weekdays(.leap.seconds)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "arrayInd",
    "category": "ベクトル",
    "syntax": "arrayInd(ind, .dim, .dimnames = NULL, useNames = FALSE)",
    "description": "線形添字を、配列の多次元添字（行列）へ変換します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "arrayInd(5, c(3, 4))",
    "caution": "NAはTRUEではないため結果に含まれません。arr.ind=TRUEでは多次元添字の行列が返ります。",
    "status": "unsupported"
  },
  {
    "name": "which",
    "category": "ベクトル",
    "syntax": "which(x, arr.ind = FALSE, useNames = TRUE)",
    "description": "論理ベクトルのTRUEの位置（添字）を返します。",
    "example": "LETTERS <- c(\"A\", \"B\", \"R\")\nwhich(LETTERS == \"R\")",
    "caution": "NAはTRUEではないため結果に含まれません。arr.ind=TRUEでは多次元添字の行列が返ります。",
    "status": "supported"
  },
  {
    "name": "which.max",
    "category": "集計",
    "syntax": "which.max(x)",
    "description": "数値ベクトルの最大値の位置（最初の添字）を返します。",
    "example": "x <- c(1, 3, 2)\nwhich.max(x)",
    "caution": "NAは無視されます。同点の場合は最初の位置が返ります。空ベクトルではinteger(0)です。",
    "status": "supported"
  },
  {
    "name": "which.min",
    "category": "集計",
    "syntax": "which.min(x)",
    "description": "数値ベクトルの最小値の位置（最初の添字）を返します。",
    "example": "x <- c(1, 3, 2)\nwhich.min(x)",
    "caution": "NAは無視されます。同点の場合は最初の位置が返ります。空ベクトルではinteger(0)です。",
    "status": "supported"
  },
  {
    "name": "with",
    "category": "言語オブジェクト",
    "syntax": "with(data, expr, ...)",
    "description": "データ（リスト・データフレーム等）から作った環境の中で式を評価します。【未対応の理由】データから作った環境の中で式を評価するもので、環境と遅延評価に本質的に依存する",
    "example": "with(mtcars, mpg[cyl == 8  &  disp > 350])",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "within",
    "category": "言語オブジェクト",
    "syntax": "within(data, expr, ...)",
    "description": "withと同様の環境で式を評価し、変更されたデータを返します。【未対応の理由】データから作った環境の中で式を評価するもので、環境と遅延評価に本質的に依存する",
    "example": "within(data.frame(x = 1:2), y <- x * 2)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "withVisible",
    "category": "言語オブジェクト",
    "syntax": "withVisible(x)",
    "description": "式を評価し、その値と「自動表示されるか」のフラグを組にして返します。【未対応の理由】式の「可視性」という評価意味論に依存し、値モデルでは表せない",
    "example": "withVisible(x <- 1)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "write",
    "category": "入出力",
    "syntax": "write(x, file = \"data\", ncolumns = if(is.character(x)) 1 else 5, append = FALSE, sep = \" \")",
    "description": "データをファイルまたは接続へ書き出します（内部でcatを使います）。【未対応の理由】実ファイルへの入出力を伴い、オフラインの値モデルでは再現できない",
    "example": "write(month.abb,  \"\")",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "writeLines",
    "category": "入出力",
    "syntax": "writeLines(text, con = stdout(), sep = \"\\n\", useBytes = FALSE)",
    "description": "文字列ベクトルを、行として接続へ書き込みます。【未対応の理由】接続（入出力チャネル）オブジェクトを扱い、値モデルでは表せない",
    "example": "writeLines(text, con = stdout(), sep = \"\\n\", useBytes = FALSE)",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "xtfrm",
    "category": "ベクトル",
    "syntax": "xtfrm(x)",
    "description": "xと同じ順序に並ぶ数値ベクトルを返す総称関数です（順序付けの補助）。【未対応の理由】S3 ジェネリックであり、任意クラスへのディスパッチに依存するため",
    "example": "xtfrm(x)",
    "caution": "xtfrmは総称関数であり、結果は引数の型によって変わります。order／sortの内部で使われます。",
    "status": "unsupported"
  },
  {
    "name": "zapsmall",
    "category": "数学",
    "syntax": "zapsmall(x, digits = getOption(\"digits\"))",
    "description": "ベクトル内の最大値と比べて十分小さい値を0に置き換えます（roundの桁数を調整して実現）。",
    "example": "zapsmall(c(1, 1e-12))",
    "caution": "判定は相対的な大きさに基づきます。digitsで感度を調整できます。mFUN／min.d は R-devel の新引数で基準版の R 4.3.3 には無いため、このモデルでも指定すると unused argument で停止します（4.3.3 基準）。",
    "status": "supported"
  },
  {
    "name": ".Machine",
    "category": "システム",
    "syntax": ".Machine",
    "description": "Rが動作しているマシンの数値特性（最大の整数、doubleの精度等）を保持するリスト（変数）です。【未対応の理由】実行マシンの数値特性という実行環境の値であり、値モデルでは表せない",
    "example": ".Machine",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".packages",
    "category": "パッケージ",
    "syntax": ".packages(all.available = FALSE, lib.loc = NULL)",
    "description": "利用可能なパッケージの一覧等の情報を返します。【未対応の理由】インストール済みパッケージの情報を返すもので、パッケージ管理とファイルシステムに依存する",
    "example": "(.packages())",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": ".standard_regexps",
    "category": "その他",
    "syntax": ".standard_regexps()",
    "description": "R内部で使う標準的な正規表現の集合を返します。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず到達できない内部ユーティリティのため",
    "example": ".standard_regexps()",
    "caution": "",
    "status": "unsupported"
  },
  {
    "name": "sort.int",
    "category": "ベクトル",
    "syntax": "sort.int(x, partial = NULL, na.last = NA, decreasing = FALSE, method = c(\"auto\", \"shell\", \"radix\"), index.return = FALSE)",
    "description": "ベクトルを並べ替えます（sort の内部版で、既定で欠損値を除きます）。",
    "example": "sort.int(c(3, 1, 2))",
    "caution": "na.last の既定は NA（欠損値を除去）で、sort の既定（TRUE＝末尾）と異なります。index.return=TRUE の形は未対応で名指しで停止します。",
    "status": "supported"
  },
  {
    "name": "seq.int",
    "category": "ベクトル",
    "syntax": "seq.int(from, to, by, length.out, along.with, ...)",
    "description": "数列を生成します（seq の内部版）。",
    "example": "seq.int(1, 5)",
    "caution": "seq と同じ規則で数列を生成します。日付・時刻の列は未対応です。",
    "status": "supported"
  },
  {
    "name": "rep.int",
    "category": "ベクトル",
    "syntax": "rep.int(x, times)",
    "description": "ベクトルを繰り返します（rep の内部版で、名前は付きません）。スカラーの times はベクトル全体の繰り返し回数です。",
    "example": "rep.int(c(1, 2), 2)",
    "caution": "each／length.out は rep.int にはありません（rep 側で指定します）。",
    "status": "supported"
  }
];
