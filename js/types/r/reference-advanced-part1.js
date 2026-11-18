// 高度モード B4：R 高度リファレンス項目 part1（トピック A-L 相当）。
// 項目形式はモード機構の確定契約（advanced-interface.md 第4章）：
// 正規形＋ status 必須。supported 真偽値・reason・topic 等の追加フィールドは
// 付けない（未対応／未検証の理由は description に明記する。トピックの
// 対応は棚卸しファイルと各班報告書に残る）。
export const referenceAdvanced = [
  {
    "name": "abbreviate",
    "category": "文字列",
    "syntax": "abbreviate(names.arg, minlength = 4, use.classes = TRUE, dot = FALSE, strict = FALSE, method = c(\"left.kept\", \"both.sides\"), named = TRUE)",
    "description": "文字列を、元の文字列同士が区別できる範囲で minlength 文字以上に短縮します。",
    "example": "x <- c(\"mean\", \"median\")\nabbreviate(x, 2)",
    "caution": "NAはそのまま保持されます。非ASCII文字では警告が出ることがあります。",
    "status": "supported"
  },
  {
    "name": "agrep",
    "category": "文字列",
    "syntax": "agrep(pattern, x, max.distance = 0.1, costs = NULL, ignore.case = FALSE, value = FALSE, fixed = TRUE, useBytes = FALSE)",
    "description": "一般化Levenshtein編集距離による近似（あいまい）文字列マッチングを行い、一致した要素の添字または論理値を返します。",
    "example": "agrep(\"lasy\", \"1 lazy 2\")",
    "caution": "max.distanceの解釈はコスト指定で変わります。fixed=FALSEでも正規表現としては解釈されません。",
    "status": "supported"
  },
  {
    "name": "agrepl",
    "category": "文字列",
    "syntax": "agrepl(pattern, x, max.distance = 0.1, costs = NULL, ignore.case = FALSE, fixed = TRUE, useBytes = FALSE)",
    "description": "一般化Levenshtein編集距離による近似（あいまい）文字列マッチングを行い、一致した要素の添字または論理値を返します。",
    "example": "agrepl(x)",
    "caution": "max.distanceの解釈はコスト指定で変わります。fixed=FALSEでも正規表現としては解釈されません。",
    "status": "supported"
  },
  {
    "name": "all",
    "category": "論理",
    "syntax": "all(..., na.rm = FALSE)",
    "description": "全ての論理値がTRUEかどうかを長さ1で返します。",
    "example": "x <- c(1, 2)\nall(x < 0)",
    "caution": "NAが混ざると結果はNAになります（na.rm=TRUEで除けます）。長さ0ではTRUEです。",
    "status": "supported"
  },
  {
    "name": "all.equal",
    "category": "その他",
    "syntax": "all.equal(target, current, ...)",
    "description": "2つのオブジェクトが「ほぼ等しい」かを調べ、異なれば差異の報告（文字列）を返します。【未対応の理由】任意クラスへのS3ディスパッチ（all.equalメソッド群）に本質的に依存し、値モデルで忠実に再現できないため",
    "example": "all.equal(pi, 355/113)",
    "caution": "浮動小数点の近似比較です。if条件に直接使わず isTRUE(all.equal(...)) としてください。任意クラスへのS3ディスパッチを含みます。",
    "status": "unsupported"
  },
  {
    "name": "attr.all.equal",
    "category": "その他",
    "syntax": "attr.all.equal(target, current, ..., check.attributes = TRUE, check.names = TRUE)",
    "description": "2つのオブジェクトが「ほぼ等しい」かを調べ、異なれば差異の報告（文字列）を返します。【未対応の理由】任意クラスへのS3ディスパッチ（all.equalメソッド群）に本質的に依存し、値モデルで忠実に再現できないため",
    "example": "attr.all.equal(x)",
    "caution": "浮動小数点の近似比較です。if条件に直接使わず isTRUE(all.equal(...)) としてください。任意クラスへのS3ディスパッチを含みます。",
    "status": "unsupported"
  },
  {
    "name": "all.names",
    "category": "環境と言語",
    "syntax": "all.names(expr, functions = TRUE, max.names = -1L, unique = FALSE)",
    "description": "式や呼び出しの中に現れる全ての名前（変数名・関数名）を文字列ベクトルで返します。【未対応の理由】言語オブジェクト（expression/call）の走査に依存し、値モデルで忠実に再現できないため",
    "example": "all.names(expression(sin(x+y)))",
    "caution": "言語オブジェクト（式・呼び出し）を引数に取るため、通常の値とは扱いが異なります。",
    "status": "unsupported"
  },
  {
    "name": "all.vars",
    "category": "環境と言語",
    "syntax": "all.vars(expr, functions = FALSE, max.names = -1L, unique = TRUE)",
    "description": "式や呼び出しの中に現れる全ての名前（変数名・関数名）を文字列ベクトルで返します。【未対応の理由】言語オブジェクト（expression/call）の走査に依存し、値モデルで忠実に再現できないため",
    "example": "all.vars(expression(sin(x+y)))",
    "caution": "言語オブジェクト（式・呼び出し）を引数に取るため、通常の値とは扱いが異なります。",
    "status": "unsupported"
  },
  {
    "name": "any",
    "category": "論理",
    "syntax": "any(..., na.rm = FALSE)",
    "description": "論理値のうち少なくとも1つがTRUEかどうかを長さ1で返します。",
    "example": "x <- c(1, 2)\nany(x < 0)",
    "caution": "TRUEが無くNAが混ざると結果はNAになります。長さ0ではFALSEです。",
    "status": "supported"
  },
  {
    "name": "aperm",
    "category": "行列・配列",
    "syntax": "aperm(a, perm, ...)",
    "description": "配列の次元を perm で指定した順序に入れ替えて転置します。【未対応の理由】S3ジェネリック（aperm.default／aperm.table）であり任意クラスへのディスパッチに依存するため",
    "example": "aperm(x, c(2,1,3))",
    "caution": "S3ジェネリックであり、tableクラス等へのディスパッチを含みます。",
    "status": "unsupported"
  },
  {
    "name": "append",
    "category": "ベクトル",
    "syntax": "append(x, values, after = length(x))",
    "description": "ベクトル x の after の位置に values を挿入して結合します。",
    "example": "append(1:5, 0:1, after = 3)",
    "caution": "after=0 は先頭への挿入です。型は共通型へ変換されます。",
    "status": "supported"
  },
  {
    "name": "apply",
    "category": "行列・配列",
    "syntax": "apply(X, MARGIN, FUN, ..., simplify = TRUE)",
    "description": "配列・行列の周辺（行・列など）に FUN を適用した結果をベクトル・配列・リストで返します。",
    "example": "apply(data.frame(x = c(1, 2), y = c(3, 4)), 2, \"sum\")",
    "caution": "結果の簡約化（simplify）により返り値の形が変わります。MARGINの指定を誤ると意図と逆の周辺に適用されます。このモデルでは対象はデータフレームのみで、FUN は文字列で集計名を指定する形のみ対応します（行列は未対応）。",
    "status": "supported"
  },
  {
    "name": "args",
    "category": "環境と言語",
    "syntax": "args(name)",
    "description": "関数の仮引数名とデフォルト値を表示します。【未対応の理由】関数オブジェクトの引数内省に依存し、値モデルで忠実に再現できないため",
    "example": "args(ls)",
    "caution": "関数オブジェクトや関数名を対象とし、値の計算ではありません。",
    "status": "unsupported"
  },
  {
    "name": "*",
    "category": "演算子",
    "syntax": "x * y",
    "description": "数値・複素数ベクトルに対する単項・二項の算術演算子（+ - * / ^ %% %/%）です。",
    "example": "2 * 3",
    "caution": "短い側はリサイクルされます。%% の結果の符号は除数に一致し、%/% は floor 除算です。",
    "status": "supported"
  },
  {
    "name": "**",
    "category": "演算子",
    "syntax": "x ** y",
    "description": "数値・複素数ベクトルに対する単項・二項の算術演算子（+ - * / ^ %% %/%）です。【未対応の理由】共有パーサが ** 演算子を受理しないため（累乗は ^ で対応）",
    "example": "2 ** 3",
    "caution": "短い側はリサイクルされます。%% の結果の符号は除数に一致し、%/% は floor 除算です。",
    "status": "unsupported"
  },
  {
    "name": "+",
    "category": "演算子",
    "syntax": "x + y",
    "description": "数値・複素数ベクトルに対する単項・二項の算術演算子（+ - * / ^ %% %/%）です。",
    "example": "1 + 2",
    "caution": "短い側はリサイクルされます。%% の結果の符号は除数に一致し、%/% は floor 除算です。",
    "status": "supported"
  },
  {
    "name": "-",
    "category": "演算子",
    "syntax": "x - y",
    "description": "数値・複素数ベクトルに対する単項・二項の算術演算子（+ - * / ^ %% %/%）です。",
    "example": "3 - 1",
    "caution": "短い側はリサイクルされます。%% の結果の符号は除数に一致し、%/% は floor 除算です。",
    "status": "supported"
  },
  {
    "name": "/",
    "category": "演算子",
    "syntax": "x / y",
    "description": "数値・複素数ベクトルに対する単項・二項の算術演算子（+ - * / ^ %% %/%）です。",
    "example": "6 / 2",
    "caution": "短い側はリサイクルされます。%% の結果の符号は除数に一致し、%/% は floor 除算です。",
    "status": "supported"
  },
  {
    "name": "^",
    "category": "演算子",
    "syntax": "x ^ y",
    "description": "数値・複素数ベクトルに対する単項・二項の算術演算子（+ - * / ^ %% %/%）です。",
    "example": "2 ^ 3",
    "caution": "短い側はリサイクルされます。%% の結果の符号は除数に一致し、%/% は floor 除算です。",
    "status": "supported"
  },
  {
    "name": "array",
    "category": "行列・配列",
    "syntax": "array(data = NA, dim = length(data), dimnames = NULL)",
    "description": "data を dim で指定した次元に並べた配列を作ります（as.array／is.array は変換・判定）。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "array(letters)",
    "caution": "data は列優先（第1次元から）で詰められ、長さが次元積に満たなければリサイクルされます。",
    "status": "unsupported"
  },
  {
    "name": "as.array",
    "category": "行列・配列",
    "syntax": "as.array(x, ...)",
    "description": "data を dim で指定した次元に並べた配列を作ります（as.array／is.array は変換・判定）。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "as.array(letters)",
    "caution": "data は列優先（第1次元から）で詰められ、長さが次元積に満たなければリサイクルされます。",
    "status": "unsupported"
  },
  {
    "name": "is.array",
    "category": "行列・配列",
    "syntax": "is.array(x)",
    "description": "data を dim で指定した次元に並べた配列を作ります（as.array／is.array は変換・判定）。",
    "example": "x <- c(1, 2)\nis.array(x)",
    "caution": "data は列優先（第1次元から）で詰められ、長さが次元積に満たなければリサイクルされます。",
    "status": "supported"
  },
  {
    "name": "array2DF",
    "category": "データフレーム",
    "syntax": "array2DF(x, responseName = \"Value\", sep = \"\", base = list(LETTERS), simplify = TRUE, allowLong = TRUE)",
    "description": "配列（tapply結果のようなリスト配列を含む）をデータフレームへ変換します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "array2DF(s1, simplify = FALSE)",
    "caution": "次元名が無い次元には base のラベルが生成されます。",
    "status": "unsupported"
  },
  {
    "name": "as.data.frame",
    "category": "データフレーム",
    "syntax": "as.data.frame(x, row.names = NULL, optional = FALSE, ...)",
    "description": "オブジェクトをデータフレームへ変換します（is.data.frame は判定）。（as.data.frame はそのクラス向けのメソッドです。）【未対応の理由】S3ジェネリックであり任意クラスへのディスパッチに依存するため",
    "example": "as.data.frame(L0, col.names = nms)",
    "caution": "S3ジェネリックであり、任意クラスへのメソッドディスパッチに依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.data.frame.AsIs",
    "category": "データフレーム",
    "syntax": "as.data.frame.AsIs(x, ...)",
    "description": "オブジェクトをデータフレームへ変換します（is.data.frame は判定）。（as.data.frame.AsIs はそのクラス向けのメソッドです。）【未対応の理由】S3ジェネリックであり任意クラスへのディスパッチに依存するため",
    "example": "as.data.frame.AsIs(x)",
    "caution": "S3ジェネリックであり、任意クラスへのメソッドディスパッチに依存します。",
    "status": "unsupported"
  },
  {
    "name": "is.data.frame",
    "category": "データフレーム",
    "syntax": "is.data.frame(x)",
    "description": "オブジェクトがデータフレームかどうかを判定します（監査で実 R と照合済み）。",
    "example": "is.data.frame(data.frame(x = c(1, 2)))",
    "caution": "このモデルでデータフレームになるのは data.frame() で作った値だけです。",
    "status": "supported"
  },
  {
    "name": "as.character.Date",
    "category": "日付と時刻",
    "syntax": "as.character.Date(x, ...)",
    "description": "文字列・数値・POSIXct などを Date クラス（暦日）へ変換します。format.Date／as.character.Date はその表示・文字列化です。（as.character.Date はそのクラス向けのメソッドです。）【未対応の理由】Dateクラスオブジェクトの表現とS3メソッド（format.Date等）に依存し、値モデルで忠実に再現できないため",
    "example": "as.character.Date(x)",
    "caution": "書式に合わない文字列はNAになります。数値からの変換には origin が必須です。Dateクラスはこのモデルでは値として忠実に表せません。",
    "status": "unsupported"
  },
  {
    "name": "as.Date",
    "category": "日付と時刻",
    "syntax": "as.Date(x, ...)",
    "description": "文字列・数値・POSIXct などを Date クラス（暦日）へ変換します。format.Date／as.character.Date はその表示・文字列化です。（as.Date はそのクラス向けのメソッドです。）【未対応の理由】Dateクラスオブジェクトの表現とS3メソッド（format.Date等）に依存し、値モデルで忠実に再現できないため",
    "example": "as.Date(x, \"%d%b%Y\")",
    "caution": "書式に合わない文字列はNAになります。数値からの変換には origin が必須です。Dateクラスはこのモデルでは値として忠実に表せません。",
    "status": "unsupported"
  },
  {
    "name": "format.Date",
    "category": "日付と時刻",
    "syntax": "format.Date(x, ...)",
    "description": "文字列・数値・POSIXct などを Date クラス（暦日）へ変換します。format.Date／as.character.Date はその表示・文字列化です。（format.Date はそのクラス向けのメソッドです。）【未対応の理由】Dateクラスオブジェクトの表現とS3メソッド（format.Date等）に依存し、値モデルで忠実に再現できないため",
    "example": "format.Date(x)",
    "caution": "書式に合わない文字列はNAになります。数値からの変換には origin が必須です。Dateクラスはこのモデルでは値として忠実に表せません。",
    "status": "unsupported"
  },
  {
    "name": "as.environment",
    "category": "環境と言語",
    "syntax": "as.environment(x)",
    "description": "数値や文字列を検索パス上の対応する環境へ変換します。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "as.environment(1)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "as.function",
    "category": "環境と言語",
    "syntax": "as.function(x, ...)",
    "description": "リスト（仮引数リスト＋本体式）を関数オブジェクトへ変換します。【未対応の理由】関数オブジェクトの生成と言語オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "as.function(alist(a = , b = 2, a+b))",
    "caution": "言語オブジェクトと環境に依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.double.POSIXlt",
    "category": "日付と時刻",
    "syntax": "as.double.POSIXlt(x, ...)",
    "description": "日付・時刻を POSIXct／POSIXlt クラスへ変換します。（as.double.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとタイムゾーン処理、S3メソッドに依存し、値モデルで忠実に再現できないため",
    "example": "as.double.POSIXlt(x)",
    "caution": "タイムゾーン tz の解釈が結果を左右します。POSIXltは要素リスト表現で、演算には向きません。",
    "status": "unsupported"
  },
  {
    "name": "as.POSIXct",
    "category": "日付と時刻",
    "syntax": "as.POSIXct(x, tz = \"\", ...)",
    "description": "日付・時刻を POSIXct／POSIXlt クラスへ変換します。（as.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとタイムゾーン処理、S3メソッドに依存し、値モデルで忠実に再現できないため",
    "example": "as.POSIXct(z, origin = \"1960-01-01\")",
    "caution": "タイムゾーン tz の解釈が結果を左右します。POSIXltは要素リスト表現で、演算には向きません。",
    "status": "unsupported"
  },
  {
    "name": "as.POSIXlt",
    "category": "日付と時刻",
    "syntax": "as.POSIXlt(x, tz = \"\", ...)",
    "description": "日付・時刻を POSIXct／POSIXlt クラスへ変換します。（as.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとタイムゾーン処理、S3メソッドに依存し、値モデルで忠実に再現できないため",
    "example": "as.POSIXlt(Sys.time())",
    "caution": "タイムゾーン tz の解釈が結果を左右します。POSIXltは要素リスト表現で、演算には向きません。",
    "status": "unsupported"
  },
  {
    "name": "AsIs",
    "category": "その他",
    "syntax": "AsIs(...)",
    "description": "I() でオブジェクトのクラスに \"AsIs\" を付けて「そのまま」扱うことを示します（変換・解釈の抑制）。【未対応の理由】クラス属性とS3ディスパッチ（print.AsIs／[.AsIs）に依存し、値モデルで忠実に再現できないため",
    "example": "AsIs(x)",
    "caution": "クラス属性の付与であり、S3ディスパッチに影響します。",
    "status": "unsupported"
  },
  {
    "name": "I",
    "category": "その他",
    "syntax": "I(x)",
    "description": "I() でオブジェクトのクラスに \"AsIs\" を付けて「そのまま」扱うことを示します（変換・解釈の抑制）。【未対応の理由】クラス属性とS3ディスパッチ（print.AsIs／[.AsIs）に依存し、値モデルで忠実に再現できないため",
    "example": "I(x)",
    "caution": "クラス属性の付与であり、S3ディスパッチに影響します。",
    "status": "unsupported"
  },
  {
    "name": "print.AsIs",
    "category": "その他",
    "syntax": "print.AsIs(x, ...)",
    "description": "I() でオブジェクトのクラスに \"AsIs\" を付けて「そのまま」扱うことを示します（変換・解釈の抑制）。（print.AsIs はそのクラス向けのメソッドです。）【未対応の理由】クラス属性とS3ディスパッチ（print.AsIs／[.AsIs）に依存し、値モデルで忠実に再現できないため",
    "example": "print.AsIs(x)",
    "caution": "クラス属性の付与であり、S3ディスパッチに影響します。",
    "status": "unsupported"
  },
  {
    "name": "[.AsIs",
    "category": "その他",
    "syntax": "[.AsIs",
    "description": "I() でオブジェクトのクラスに \"AsIs\" を付けて「そのまま」扱うことを示します（変換・解釈の抑制）。（[.AsIs はそのクラス向けのメソッドです。）【未対応の理由】クラス属性とS3ディスパッチ（print.AsIs／[.AsIs）に依存し、値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "クラス属性の付与であり、S3ディスパッチに影響します。",
    "status": "unsupported"
  },
  {
    "name": "asplit",
    "category": "行列・配列",
    "syntax": "asplit(x, MARGIN, drop = FALSE)",
    "description": "配列・行列を MARGIN で指定した周辺ごとに分割し、リストで返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "asplit(x, 2)",
    "caution": "MARGINが複数次元だと各スライスは配列のまま残ります。",
    "status": "unsupported"
  },
  {
    "name": "assign",
    "category": "環境と言語",
    "syntax": "assign(x, value, pos = -1, envir = as.environment(pos), inherits = FALSE, immediate = TRUE)",
    "description": "名前（文字列）で指定した変数へ値を代入します。このモデルではシミュレータの変数環境への代入として再現します（監査で実 R と照合済み）。",
    "example": "assign(\"x\", 42)",
    "caution": "envir／pos 等の環境引数と inherits = TRUE は未対応で、指定すると名指しで停止します。予約定数名（TRUE／NA／Inf 等）への代入は実 R どおりエラーになります。",
    "status": "supported"
  },
  {
    "name": "assignOps",
    "category": "環境と言語",
    "syntax": "assignOps(...)",
    "description": "代入演算子（<- <<- -> ->> =）です。<-, ->, = は現在の環境、<<-, ->> は親環境方向へ代入します。【未対応の理由】呼び出せる関数ではなく代入演算子群の文書見出しのため（各演算子は個別項目で裁定済み）",
    "example": "assignOps(x)",
    "caution": "<<- は通常の代入とは対象範囲が異なります。= は関数呼び出しの引数代入と混同しやすい記法です。",
    "status": "unsupported"
  },
  {
    "name": "->",
    "category": "環境と言語",
    "syntax": "value -> x",
    "description": "代入演算子（<- <<- -> ->> =）です。<-, ->, = は現在の環境、<<-, ->> は親環境方向へ代入します。【未対応の理由】右向き代入（->）を共有パーサが受理しないため",
    "example": "1 -> x",
    "caution": "<<- は通常の代入とは対象範囲が異なります。= は関数呼び出しの引数代入と混同しやすい記法です。",
    "status": "unsupported"
  },
  {
    "name": "->>",
    "category": "環境と言語",
    "syntax": "value ->> x",
    "description": "代入演算子（<- <<- -> ->> =）です。<-, ->, = は現在の環境、<<-, ->> は親環境方向へ代入します。【未対応の理由】右向き代入（->>）を共有パーサが受理せず、親環境への代入も値モデルに無いため",
    "example": "1 ->> x",
    "caution": "<<- は通常の代入とは対象範囲が異なります。= は関数呼び出しの引数代入と混同しやすい記法です。",
    "status": "unsupported"
  },
  {
    "name": "<-",
    "category": "環境と言語",
    "syntax": "x <- value",
    "description": "代入演算子（<- <<- -> ->> =）です。<-, ->, = は現在の環境、<<-, ->> は親環境方向へ代入します。",
    "example": "x <- 1",
    "caution": "<<- は通常の代入とは対象範囲が異なります。= は関数呼び出しの引数代入と混同しやすい記法です。",
    "status": "supported"
  },
  {
    "name": "<<-",
    "category": "環境と言語",
    "syntax": "x <<- value",
    "description": "代入演算子（<- <<- -> ->> =）です。<-, ->, = は現在の環境、<<-, ->> は親環境方向へ代入します。【未対応の理由】共有パーサが受理せず、親環境への代入を値モデルで表せないため",
    "example": "x <<- 1",
    "caution": "<<- は通常の代入とは対象範囲が異なります。= は関数呼び出しの引数代入と混同しやすい記法です。",
    "status": "unsupported"
  },
  {
    "name": "=",
    "category": "環境と言語",
    "syntax": "x = value",
    "description": "代入演算子（<- <<- -> ->> =）です。<-, ->, = は現在の環境、<<-, ->> は親環境方向へ代入します。",
    "example": "x = 1",
    "caution": "<<- は通常の代入とは対象範囲が異なります。= は関数呼び出しの引数代入と混同しやすい記法です。",
    "status": "supported"
  },
  {
    "name": "attach",
    "category": "環境と言語",
    "syntax": "attach(what, pos = 2L, name = deparse1(substitute(what), backtick=FALSE), warn.conflicts = TRUE)",
    "description": "データベース（データフレーム・リスト・環境など）を検索パスへ取り付け、名前だけで参照できるようにします。【未対応の理由】検索パスと環境に依存し、値モデルで忠実に再現できないため",
    "example": "attach(women)",
    "caution": "同名オブジェクトのマスキング（競合）が起きます。",
    "status": "unsupported"
  },
  {
    "name": ".conflicts.OK",
    "category": "環境と言語",
    "syntax": ".conflicts.OK(...)",
    "description": "データベース（データフレーム・リスト・環境など）を検索パスへ取り付け、名前だけで参照できるようにします。【未対応の理由】検索パスと環境に依存し、値モデルで忠実に再現できないため",
    "example": ".conflicts.OK(x)",
    "caution": "同名オブジェクトのマスキング（競合）が起きます。",
    "status": "unsupported"
  },
  {
    "name": "attr",
    "category": "その他",
    "syntax": "attr(x, which, exact = FALSE)",
    "description": "オブジェクトの特定の属性を取得・設定します。【未対応の理由】属性システム一般（任意属性の取得・設定）に依存し、値モデルで忠実に再現できないため",
    "example": "attr(x,\"dim\")",
    "caution": "属性はクラスや次元などオブジェクトの振る舞いを左右します。",
    "status": "unsupported"
  },
  {
    "name": "attributes",
    "category": "その他",
    "syntax": "attributes(x)",
    "description": "オブジェクトの属性リスト全体を取得・設定します。【未対応の理由】属性システム一般に依存し、値モデルで忠実に再現できないため",
    "example": "attributes(x)",
    "caution": "属性の一括設定は次元やクラスを壊すことがあります。",
    "status": "unsupported"
  },
  {
    "name": "autoload",
    "category": "環境と言語",
    "syntax": "autoload(name, package, reset = FALSE, ...)",
    "description": "パッケージのオンデマンド読み込みのための約束（promise）を作成します。【未対応の理由】約束（promise）の遅延評価とパッケージ読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "autoload(\"interpSpline\", \"splines\")",
    "caution": "約束（promise）の遅延評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "autoloader",
    "category": "環境と言語",
    "syntax": "autoloader(name, package, ...)",
    "description": "パッケージのオンデマンド読み込みのための約束（promise）を作成します。【未対応の理由】約束（promise）の遅延評価とパッケージ読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "autoloader(x)",
    "caution": "約束（promise）の遅延評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".Autoloaded",
    "category": "環境と言語",
    "syntax": ".Autoloaded(...)",
    "description": "パッケージのオンデマンド読み込みのための約束（promise）を作成します。【未対応の理由】約束（promise）の遅延評価とパッケージ読み込みに依存し、値モデルで忠実に再現できないため",
    "example": ".Autoloaded",
    "caution": "約束（promise）の遅延評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".AutoloadEnv",
    "category": "環境と言語",
    "syntax": ".AutoloadEnv(...)",
    "description": "パッケージのオンデマンド読み込みのための約束（promise）を作成します。【未対応の理由】約束（promise）の遅延評価とパッケージ読み込みに依存し、値モデルで忠実に再現できないため",
    "example": ".AutoloadEnv(x)",
    "caution": "約束（promise）の遅延評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "backsolve",
    "category": "行列・配列",
    "syntax": "backsolve(r, x, k = ncol(r), upper.tri = TRUE, transpose = FALSE)",
    "description": "三角行列を係数とする連立一次方程式を解きます（backsolve は上三角、forwardsolve は下三角）。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "backsolve(r, x <- c(8,4,2))",
    "caution": "三角でない部分の要素は使われません。k で使う列数を制限できます。",
    "status": "unsupported"
  },
  {
    "name": "forwardsolve",
    "category": "行列・配列",
    "syntax": "forwardsolve(l, x, k = ncol(l), upper.tri = FALSE, transpose = FALSE)",
    "description": "三角行列を係数とする連立一次方程式を解きます（backsolve は上三角、forwardsolve は下三角）。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "forwardsolve(x)",
    "caution": "三角でない部分の要素は使われません。k で使う列数を制限できます。",
    "status": "unsupported"
  },
  {
    "name": "balancePOSIXlt",
    "category": "日付と時刻",
    "syntax": "balancePOSIXlt(x, fill.only = FALSE, classed = TRUE)",
    "description": "範囲外・欠けた要素を持つ POSIXlt 日時を「バランス」させて正規化します。【未対応の理由】POSIXltクラスの内部表現に依存し、値モデルで忠実に再現できないため",
    "example": "balancePOSIXlt(d1, fill.only = TRUE)",
    "caution": "POSIXltクラス内部表現に依存します。",
    "status": "unsupported"
  },
  {
    "name": "unCfillPOSIXlt",
    "category": "日付と時刻",
    "syntax": "unCfillPOSIXlt(x)",
    "description": "範囲外・欠けた要素を持つ POSIXlt 日時を「バランス」させて正規化します。【未対応の理由】POSIXltクラスの内部表現に依存し、値モデルで忠実に再現できないため",
    "example": "unCfillPOSIXlt(d1)",
    "caution": "POSIXltクラス内部表現に依存します。",
    "status": "unsupported"
  },
  {
    "name": "basename",
    "category": "ファイル",
    "syntax": "basename(path)",
    "description": "ファイルパスの最後の区切りまでを取り除いた部分（basename）と、区切りより前（dirname）を返します。",
    "example": "basename(file.path(\"\",\"p1\",\"p2\",\"p3\", c(\"file1\", \"file2\")))",
    "caution": "文字列操作であり、ファイルの実在は確認しません。末尾が区切りの場合は空文字列になることがあります。",
    "status": "supported"
  },
  {
    "name": "dirname",
    "category": "ファイル",
    "syntax": "dirname(path)",
    "description": "ファイルパスの最後の区切りまでを取り除いた部分（basename）と、区切りより前（dirname）を返します。",
    "example": "dirname (file.path(\"\",\"p1\",\"p2\",\"p3\", \"filename\"))",
    "caution": "文字列操作であり、ファイルの実在は確認しません。末尾が区切りの場合は空文字列になることがあります。",
    "status": "supported"
  },
  {
    "name": "besselI",
    "category": "数学",
    "syntax": "besselI(x, nu, expon.scaled = FALSE)",
    "description": "ベッセル関数（第1種 J・第2種 Y、変形ベッセル I・K）を計算します。【未対応の理由】ベッセル関数の数値計算は実装せず、精度を実 R と照合して確定できないため（誤値を避けるための未対応）",
    "example": "besselI(x, nu = nu)",
    "caution": "x が負の場合など定義域外では NaN になることがあります。expon.scaled=TRUE は exp(-x) 倍のスケーリングです。",
    "status": "unsupported"
  },
  {
    "name": "besselJ",
    "category": "数学",
    "syntax": "besselJ(x, nu)",
    "description": "ベッセル関数（第1種 J・第2種 Y、変形ベッセル I・K）を計算します。【未対応の理由】ベッセル関数の数値計算は実装せず、精度を実 R と照合して確定できないため（誤値を避けるための未対応）",
    "example": "besselJ(x, nu = nu)",
    "caution": "x が負の場合など定義域外では NaN になることがあります。expon.scaled=TRUE は exp(-x) 倍のスケーリングです。",
    "status": "unsupported"
  },
  {
    "name": "besselK",
    "category": "数学",
    "syntax": "besselK(x, nu, expon.scaled = FALSE)",
    "description": "ベッセル関数（第1種 J・第2種 Y、変形ベッセル I・K）を計算します。【未対応の理由】ベッセル関数の数値計算は実装せず、精度を実 R と照合して確定できないため（誤値を避けるための未対応）",
    "example": "besselK(x0, nu = nu)",
    "caution": "x が負の場合など定義域外では NaN になることがあります。expon.scaled=TRUE は exp(-x) 倍のスケーリングです。",
    "status": "unsupported"
  },
  {
    "name": "besselY",
    "category": "数学",
    "syntax": "besselY(x, nu)",
    "description": "ベッセル関数（第1種 J・第2種 Y、変形ベッセル I・K）を計算します。【未対応の理由】ベッセル関数の数値計算は実装せず、精度を実 R と照合して確定できないため（誤値を避けるための未対応）",
    "example": "besselY(xx, nu=nu)",
    "caution": "x が負の場合など定義域外では NaN になることがあります。expon.scaled=TRUE は exp(-x) 倍のスケーリングです。",
    "status": "unsupported"
  },
  {
    "name": ".bincode",
    "category": "ベクトル",
    "syntax": ".bincode(x, breaks, right = TRUE, include.lowest = FALSE)",
    "description": "数値ベクトルを breaks の区間に分け、区間番号（整数コード）を返します（cut の内部実装）。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず（式を解釈できません）、呼び出しに到達できないため",
    "example": ".bincode(x, b, TRUE)",
    "caution": "区間外の値は NA です。right／include.lowest で端の扱いが変わります。",
    "status": "unsupported"
  },
  {
    "name": "activeBindingFunction",
    "category": "環境と言語",
    "syntax": "activeBindingFunction(sym, env)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "activeBindingFunction(x)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "bindenv",
    "category": "環境と言語",
    "syntax": "bindenv(...)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "bindenv(x)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "bindingIsActive",
    "category": "環境と言語",
    "syntax": "bindingIsActive(sym, env)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "bindingIsActive(\"fred\", .GlobalEnv)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "bindingIsLocked",
    "category": "環境と言語",
    "syntax": "bindingIsLocked(sym, env)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "bindingIsLocked(x)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "environmentIsLocked",
    "category": "環境と言語",
    "syntax": "environmentIsLocked(env)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "environmentIsLocked(x)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "lockBinding",
    "category": "環境と言語",
    "syntax": "lockBinding(sym, env)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "lockBinding(\"x\", e)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "lockEnvironment",
    "category": "環境と言語",
    "syntax": "lockEnvironment(env, bindings = FALSE)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "lockEnvironment(e)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "makeActiveBinding",
    "category": "環境と言語",
    "syntax": "makeActiveBinding(sym, fun, env)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "makeActiveBinding(\"fred\", f, .GlobalEnv)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "unlockBinding",
    "category": "環境と言語",
    "syntax": "unlockBinding(sym, env)",
    "description": "環境や束縛のロック、アクティブバインディング（参照時に自動で関数が呼ばれる束縛）を扱います。【未対応の理由】環境・束縛のロックとアクティブバインディングに依存し、値モデルで忠実に再現できないため",
    "example": "unlockBinding(\"x\", e)",
    "caution": "環境と束縛の状態に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "bitwAnd",
    "category": "数学",
    "syntax": "bitwAnd(a, b)",
    "description": "整数ベクトルをビット集合とみなした論理演算（And／Or／Xor／Not／シフト）を行います。",
    "example": "bitwAnd(15, 7)",
    "caution": "対象は整数として扱われます。シフト量が大きい場合の結果は環境依存の面があります。",
    "status": "supported"
  },
  {
    "name": "bitwNot",
    "category": "数学",
    "syntax": "bitwNot(a)",
    "description": "整数ベクトルをビット集合とみなした論理演算（And／Or／Xor／Not／シフト）を行います。",
    "example": "bitwNot(0:12)",
    "caution": "対象は整数として扱われます。シフト量が大きい場合の結果は環境依存の面があります。",
    "status": "supported"
  },
  {
    "name": "bitwOr",
    "category": "数学",
    "syntax": "bitwOr(a, b)",
    "description": "整数ベクトルをビット集合とみなした論理演算（And／Or／Xor／Not／シフト）を行います。",
    "example": "bitwOr(15, 7)",
    "caution": "対象は整数として扱われます。シフト量が大きい場合の結果は環境依存の面があります。",
    "status": "supported"
  },
  {
    "name": "bitwShiftL",
    "category": "数学",
    "syntax": "bitwShiftL(a, n)",
    "description": "整数ベクトルをビット集合とみなした論理演算（And／Or／Xor／Not／シフト）を行います。",
    "example": "bitwShiftL(1, 2)",
    "caution": "対象は整数として扱われます。シフト量が大きい場合の結果は環境依存の面があります。",
    "status": "supported"
  },
  {
    "name": "bitwShiftR",
    "category": "数学",
    "syntax": "bitwShiftR(a, n)",
    "description": "整数ベクトルをビット集合とみなした論理演算（And／Or／Xor／Not／シフト）を行います。",
    "example": "bitwShiftR(-1, 1:31)",
    "caution": "対象は整数として扱われます。シフト量が大きい場合の結果は環境依存の面があります。",
    "status": "supported"
  },
  {
    "name": "bitwXor",
    "category": "数学",
    "syntax": "bitwXor(a, b)",
    "description": "整数ベクトルをビット集合とみなした論理演算（And／Or／Xor／Not／シフト）を行います。",
    "example": "bitwXor(15, 7)",
    "caution": "対象は整数として扱われます。シフト量が大きい場合の結果は環境依存の面があります。",
    "status": "supported"
  },
  {
    "name": "body",
    "category": "環境と言語",
    "syntax": "body(fun = sys.function(sys.parent()))",
    "description": "関数オブジェクトの本体（仮引数を除く定義式）を取得・設定します。【未対応の理由】関数オブジェクトと言語オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "body(body)",
    "caution": "言語オブジェクトと関数オブジェクトに依存します。",
    "status": "unsupported"
  },
  {
    "name": "bquote",
    "category": "環境と言語",
    "syntax": "bquote(expr, where = parent.frame(), splice = FALSE)",
    "description": "式の一部だけを評価して埋め込む部分置換（Lispのbackquote相当）を行います。【未対応の理由】言語オブジェクトと環境での評価に依存し、値モデルで忠実に再現できないため",
    "example": "bquote(a == a)",
    "caution": "言語オブジェクトと評価環境に依存します。",
    "status": "unsupported"
  },
  {
    "name": "browser",
    "category": "環境と言語",
    "syntax": "browser(text = \"\", condition = NULL, expr = TRUE, skipCalls = 0L)",
    "description": "式の実行を中断し、呼ばれた環境を対話的に検査できるブラウザへ入ります。【未対応の理由】対話的デバッガと環境検査に依存し、値モデルで忠実に再現できないため",
    "example": "browser(x)",
    "caution": "対話的デバッグ機構であり、非対話実行では意味を持ちません。",
    "status": "unsupported"
  },
  {
    "name": "browserCondition",
    "category": "環境と言語",
    "syntax": "browserCondition(n = 1)",
    "description": "browser 呼び出しに渡されたテキスト・条件・デバッグ状態を取得します。【未対応の理由】デバッガの内部状態に依存し、値モデルで忠実に再現できないため",
    "example": "browserCondition(x)",
    "caution": "デバッガの内部状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "browserSetDebug",
    "category": "環境と言語",
    "syntax": "browserSetDebug(n = 1)",
    "description": "browser 呼び出しに渡されたテキスト・条件・デバッグ状態を取得します。【未対応の理由】デバッガの内部状態に依存し、値モデルで忠実に再現できないため",
    "example": "browserSetDebug(x)",
    "caution": "デバッガの内部状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "browserText",
    "category": "環境と言語",
    "syntax": "browserText(n = 1)",
    "description": "browser 呼び出しに渡されたテキスト・条件・デバッグ状態を取得します。【未対応の理由】デバッガの内部状態に依存し、値モデルで忠実に再現できないため",
    "example": "browserText(x)",
    "caution": "デバッガの内部状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "builtins",
    "category": "環境と言語",
    "syntax": "builtins(internal = FALSE)",
    "description": "全ての組み込みオブジェクトの名前を返します。【未対応の理由】インタプリタ内部のシンボルテーブルに依存し、値モデルで忠実に再現できないため",
    "example": "builtins(x)",
    "caution": "インタプリタのシンボルテーブルを直接参照します。",
    "status": "unsupported"
  },
  {
    "name": "by",
    "category": "データフレーム",
    "syntax": "by(data, INDICES, FUN, ..., simplify = TRUE)",
    "description": "データフレームを因子で分割し、各部分に FUN を適用します（tapply のデータフレーム版ラッパー）。【未対応の理由】S3クラス（by）オブジェクトとそのディスパッチに依存するため",
    "example": "by(warpbreaks[, 1:2], warpbreaks[,\"tension\"], summary)",
    "caution": "S3クラス by のオブジェクトを返し、表示は print.by に依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.by",
    "category": "データフレーム",
    "syntax": "print.by(x, ...)",
    "description": "データフレームを因子で分割し、各部分に FUN を適用します（tapply のデータフレーム版ラッパー）。（print.by はそのクラス向けのメソッドです。）【未対応の理由】S3クラス（by）オブジェクトとそのディスパッチに依存するため",
    "example": "print.by(x)",
    "caution": "S3クラス by のオブジェクトを返し、表示は print.by に依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.call",
    "category": "環境と言語",
    "syntax": "as.call(x)",
    "description": "呼び出し（call）オブジェクトを作成・判定・変換します。【未対応の理由】言語オブジェクト（call）に依存し、値モデルで忠実に再現できないため",
    "example": "as.call(list(quote(mean), quote(x)))",
    "caution": "言語オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "call",
    "category": "環境と言語",
    "syntax": "call(name, ...)",
    "description": "呼び出し（call）オブジェクトを作成・判定・変換します。【未対応の理由】言語オブジェクト（call）に依存し、値モデルで忠実に再現できないため",
    "example": "call(call)",
    "caution": "言語オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "is.call",
    "category": "環境と言語",
    "syntax": "is.call(x)",
    "description": "呼び出し（call）オブジェクトを作成・判定・変換します。【未対応の理由】言語オブジェクト（call）に依存し、値モデルで忠実に再現できないため",
    "example": "is.call(call)",
    "caution": "言語オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "callCC",
    "category": "環境と言語",
    "syntax": "callCC(fun)",
    "description": "現在の継続（continuation）を引数として関数を呼びます（下方継続のみ）。【未対応の理由】継続（continuation）という制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "callCC(function(k) 1)",
    "caution": "継続という制御構造に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".Call",
    "category": "その他",
    "syntax": ".Call(.NAME, ..., PACKAGE)",
    "description": "読み込み済みのコンパイル済み C/C++ コードへ R オブジェクトを渡して呼び出します。【未対応の理由】外部コンパイル済みコードの呼び出しに依存し、値モデルで忠実に再現できないため",
    "example": ".Call(x)",
    "caution": "外部ネイティブコードの呼び出しです。",
    "status": "unsupported"
  },
  {
    "name": ".External",
    "category": "その他",
    "syntax": ".External(.NAME, ..., PACKAGE)",
    "description": "読み込み済みのコンパイル済み C/C++ コードへ R オブジェクトを渡して呼び出します。【未対応の理由】外部コンパイル済みコードの呼び出しに依存し、値モデルで忠実に再現できないため",
    "example": ".External(x)",
    "caution": "外部ネイティブコードの呼び出しです。",
    "status": "unsupported"
  },
  {
    "name": "capabilities",
    "category": "その他",
    "syntax": "capabilities(what = NULL, Xchk = any(nas %in% c(\"X11\", \"jpeg\", \"png\", \"tiff\")))",
    "description": "この R ビルドに組み込まれた任意機能の有無を報告します。【未対応の理由】実行環境のビルド構成の照会であり、値モデルで忠実に再現できないため",
    "example": "capabilities()",
    "caution": "実行環境のビルド構成に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": "cbind",
    "category": "データフレーム",
    "syntax": "cbind(..., deparse.level = 1)",
    "description": "ベクトル・行列・データフレームを列方向（cbind）または行方向（rbind）に結合します。",
    "example": "cbind(data.frame(x = c(1, 2)), y = c(3, 4))",
    "caution": "S3ジェネリックでありデータフレーム用メソッドを含みます。長さが揃わない場合はリサイクルされます。このモデルではデータフレームを含む形のみ対応し、ベクトルのみの結合は行列を返すため名指しで停止します。",
    "status": "supported"
  },
  {
    "name": "cbind.data.frame",
    "category": "データフレーム",
    "syntax": "cbind.data.frame(x, ...)",
    "description": "ベクトル・行列・データフレームを列方向（cbind）または行方向（rbind）に結合します。（cbind.data.frame はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "cbind.data.frame(x)",
    "caution": "S3ジェネリックでありデータフレーム用メソッドを含みます。長さが揃わない場合はリサイクルされます。",
    "status": "unsupported"
  },
  {
    "name": "rbind",
    "category": "データフレーム",
    "syntax": "rbind(..., deparse.level = 1)",
    "description": "ベクトル・行列・データフレームを列方向（cbind）または行方向（rbind）に結合します。",
    "example": "rbind(data.frame(x = c(1, 2)), data.frame(x = c(3, 4)))",
    "caution": "S3ジェネリックでありデータフレーム用メソッドを含みます。長さが揃わない場合はリサイクルされます。このモデルではデータフレーム同士の結合のみ対応し、ベクトルのみの結合は行列を返すため名指しで停止します。",
    "status": "supported"
  },
  {
    "name": "rbind.data.frame",
    "category": "データフレーム",
    "syntax": "rbind.data.frame(x, ...)",
    "description": "ベクトル・行列・データフレームを列方向（cbind）または行方向（rbind）に結合します。（rbind.data.frame はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "rbind.data.frame(x)",
    "caution": "S3ジェネリックでありデータフレーム用メソッドを含みます。長さが揃わない場合はリサイクルされます。",
    "status": "unsupported"
  },
  {
    "name": "char.expand",
    "category": "文字列",
    "syntax": "char.expand(input, target, nomatch = stop(\"no match\"))",
    "description": "input が target の要素のうち一意な前方一致（省略形）であるものを探し、その要素を返します。",
    "example": "char.expand(\"me\", locPars, warning(\"Could not expand!\"))",
    "caution": "一意に定まらない場合は nomatch の動作（既定はエラー）になります。",
    "status": "supported"
  },
  {
    "name": "character",
    "category": "型変換",
    "syntax": "character(length = 0)",
    "description": "character 型ベクトルを作成・変換・判定します。",
    "example": "form <- 3\ncharacter(form)",
    "caution": "数値から変換すると最大15有効桁で文字列化されます。",
    "status": "supported"
  },
  {
    "name": "is.character",
    "category": "型変換",
    "syntax": "is.character(x)",
    "description": "character 型ベクトルを作成・変換・判定します。",
    "example": "x <- \"a\"\nis.character(x)",
    "caution": "数値から変換すると最大15有効桁で文字列化されます。",
    "status": "supported"
  },
  {
    "name": "charmatch",
    "category": "文字列",
    "syntax": "charmatch(x, table, nomatch = NA_integer_)",
    "description": "x の各要素が table の要素へ部分一致（前方一致）するかを調べ、添字を返します。",
    "example": "charmatch(\"\", \"\")",
    "caution": "一致なしは nomatch（既定 NA）、複数候補への一致は 0 を返します。",
    "status": "supported"
  },
  {
    "name": "casefold",
    "category": "文字列",
    "syntax": "casefold(x, upper = FALSE)",
    "description": "文字列中の文字を1対1で置換します（chartr）。tolower／toupper／casefold は大文字小文字変換です。",
    "example": "x <- \"AbC\"\ncasefold(x)",
    "caution": "chartr の old と new は同じ長さが必要です。ロケールにより変換結果が変わる文字があります。",
    "status": "supported"
  },
  {
    "name": "chartr",
    "category": "文字列",
    "syntax": "chartr(old, new, x)",
    "description": "文字列中の文字を1対1で置換します（chartr）。tolower／toupper／casefold は大文字小文字変換です。",
    "example": "x <- \"six\"\nchartr(\"iXs\", \"why\", x)",
    "caution": "chartr の old と new は同じ長さが必要です。ロケールにより変換結果が変わる文字があります。",
    "status": "supported"
  },
  {
    "name": "tolower",
    "category": "文字列",
    "syntax": "tolower(x)",
    "description": "文字列中の文字を1対1で置換します（chartr）。tolower／toupper／casefold は大文字小文字変換です。",
    "example": "x <- \"ABC\"\ntolower(x)",
    "caution": "chartr の old と new は同じ長さが必要です。ロケールにより変換結果が変わる文字があります。",
    "status": "supported"
  },
  {
    "name": "toupper",
    "category": "文字列",
    "syntax": "toupper(x)",
    "description": "文字列中の文字を1対1で置換します（chartr）。tolower／toupper／casefold は大文字小文字変換です。",
    "example": "x <- \"abc\"\ntoupper(x)",
    "caution": "chartr の old と new は同じ長さが必要です。ロケールにより変換結果が変わる文字があります。",
    "status": "supported"
  },
  {
    "name": "chkDots",
    "category": "環境と言語",
    "syntax": "chkDots(..., which.call = -1, allowed = character(0))",
    "description": "呼び出し元の ... に想定外の引数が渡されていないかを警告します。【未対応の理由】呼び出しフレームの検査に依存し、値モデルで忠実に再現できないため",
    "example": "chkDots(...)",
    "caution": "呼び出し元のフレームを検査するユーティリティです。",
    "status": "unsupported"
  },
  {
    "name": "chol",
    "category": "行列・配列",
    "syntax": "chol(x, ...)",
    "description": "実対称正定値行列のコレスキー分解を計算します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "chol(m)",
    "caution": "正定値でない行列ではエラーになります。結果は上三角行列です。",
    "status": "unsupported"
  },
  {
    "name": "chol2inv",
    "category": "行列・配列",
    "syntax": "chol2inv(x, size = NCOL(x), LINPACK = FALSE)",
    "description": "コレスキー分解（または QR 分解の R 部分）から対称正定値行列の逆行列を計算します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "chol2inv(cma)",
    "caution": "入力は分解結果であり、元の行列そのものではありません。",
    "status": "unsupported"
  },
  {
    "name": "chooseOpsMethod",
    "category": "その他",
    "syntax": "chooseOpsMethod(x, y, mx, my, cl, reverse)",
    "description": "Ops グループジェネリックで2つのメソッド候補があるときにどちらを使うかを決める内部関数です。【未対応の理由】S3ディスパッチ機構に依存し、値モデルで忠実に再現できないため",
    "example": "chooseOpsMethod(x, y, mx, my, cl, reverse)",
    "caution": "S3ディスパッチ機構そのものに依存します。",
    "status": "unsupported"
  },
  {
    "name": "class",
    "category": "その他",
    "syntax": "class(x)",
    "description": "オブジェクトのクラスを返します。このモデルでは暗黙クラス（numeric／character／logical／data.frame／NULL 等）のみを返します（監査で実 R と照合済み）。",
    "example": "class(c(1, 2))",
    "caution": "実 R の integer 型はこのモデルでは numeric として表すため、整数ベクトルのクラスは \"numeric\" になります。クラス属性の設定（class<-）や継承階層は未対応です。",
    "status": "supported"
  },
  {
    "name": "inherits",
    "category": "その他",
    "syntax": "inherits(x, what, which = FALSE)",
    "description": "オブジェクトのクラスを取得・設定し、継承関係を調べます。【未対応の理由】クラス属性とS3ディスパッチ機構に依存し、値モデルで忠実に再現できないため",
    "example": "inherits(x, \"a\")",
    "caution": "クラス属性はS3ディスパッチの基礎であり、任意クラスを値モデルでは表せません。",
    "status": "unsupported"
  },
  {
    "name": "isa",
    "category": "その他",
    "syntax": "isa(x, what)",
    "description": "オブジェクトのクラスを取得・設定し、継承関係を調べます。【未対応の理由】クラス属性とS3ディスパッチ機構に依存し、値モデルで忠実に再現できないため",
    "example": "isa(x)",
    "caution": "クラス属性はS3ディスパッチの基礎であり、任意クラスを値モデルでは表せません。",
    "status": "unsupported"
  },
  {
    "name": "nameOfClass",
    "category": "その他",
    "syntax": "nameOfClass(x)",
    "description": "オブジェクトのクラスを取得・設定し、継承関係を調べます。【未対応の理由】クラス属性とS3ディスパッチ機構に依存し、値モデルで忠実に再現できないため",
    "example": "nameOfClass(x)",
    "caution": "クラス属性はS3ディスパッチの基礎であり、任意クラスを値モデルでは表せません。",
    "status": "unsupported"
  },
  {
    "name": "oldClass",
    "category": "その他",
    "syntax": "oldClass(x)",
    "description": "オブジェクトのクラスを取得・設定し、継承関係を調べます。【未対応の理由】クラス属性とS3ディスパッチ機構に依存し、値モデルで忠実に再現できないため",
    "example": "oldClass(x)",
    "caution": "クラス属性はS3ディスパッチの基礎であり、任意クラスを値モデルでは表せません。",
    "status": "unsupported"
  },
  {
    "name": "unclass",
    "category": "その他",
    "syntax": "unclass(x)",
    "description": "オブジェクトのクラスを取得・設定し、継承関係を調べます。【未対応の理由】クラス属性とS3ディスパッチ機構に依存し、値モデルで忠実に再現できないため",
    "example": "unclass(x)",
    "caution": "クラス属性はS3ディスパッチの基礎であり、任意クラスを値モデルでは表せません。",
    "status": "unsupported"
  },
  {
    "name": ".class2",
    "category": "その他",
    "syntax": ".class2(x)",
    "description": "オブジェクトのクラスを取得・設定し、継承関係を調べます。【未対応の理由】クラス属性とS3ディスパッチ機構に依存し、値モデルで忠実に再現できないため",
    "example": ".class2(pi)",
    "caution": "クラス属性はS3ディスパッチの基礎であり、任意クラスを値モデルでは表せません。",
    "status": "unsupported"
  },
  {
    "name": "col",
    "category": "行列・配列",
    "syntax": "col(x, as.factor = FALSE)",
    "description": "行列状オブジェクトの各要素の列番号を表す行列（または因子）を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "col(ma)",
    "caution": "x に次元が無い場合はエラーになります。",
    "status": "unsupported"
  },
  {
    "name": ".col",
    "category": "行列・配列",
    "syntax": ".col(dim)",
    "description": "行列状オブジェクトの各要素の列番号を表す行列（または因子）を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": ".col(3:4)",
    "caution": "x に次元が無い場合はエラーになります。",
    "status": "unsupported"
  },
  {
    "name": "colnames",
    "category": "データフレーム",
    "syntax": "colnames(x, do.NULL = TRUE, prefix = \"col\")",
    "description": "行列状オブジェクトの行名（rownames）・列名（colnames）を取得・設定します。",
    "example": "m2 <- data.frame(a = 1:2, b = 3:4)\ncolnames(m2, do.NULL = FALSE)",
    "caution": "名前の長さは対応する次元の大きさと一致する必要があります。",
    "status": "supported"
  },
  {
    "name": "rownames",
    "category": "データフレーム",
    "syntax": "rownames(x, do.NULL = TRUE, prefix = \"row\")",
    "description": "行列状オブジェクトの行名（rownames）・列名（colnames）を取得・設定します。",
    "example": "m0 <- data.frame(a = 1:2)\nrownames(m0)",
    "caution": "名前の長さは対応する次元の大きさと一致する必要があります。",
    "status": "supported"
  },
  {
    "name": "colMeans",
    "category": "行列・配列",
    "syntax": "colMeans(x, na.rm = FALSE, dims = 1)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。",
    "example": "x <- data.frame(a = 1:2, b = 3:4)\ncolMeans(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "supported"
  },
  {
    "name": "colSums",
    "category": "行列・配列",
    "syntax": "colSums(x, na.rm = FALSE, dims = 1)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。",
    "example": "x <- data.frame(a = 1:2, b = 3:4)\ncolSums(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "supported"
  },
  {
    "name": "rowMeans",
    "category": "行列・配列",
    "syntax": "rowMeans(x, na.rm = FALSE, dims = 1)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。",
    "example": "x <- data.frame(a = 1:2, b = 3:4)\nrowMeans(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "supported"
  },
  {
    "name": "rowSums",
    "category": "行列・配列",
    "syntax": "rowSums(x, na.rm = FALSE, dims = 1)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。",
    "example": "x <- data.frame(a = 1:2, b = 3:4)\nrowSums(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "supported"
  },
  {
    "name": ".colMeans",
    "category": "行列・配列",
    "syntax": ".colMeans(x, m, n, na.rm = FALSE)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず（式を解釈できません）、呼び出しに到達できないため",
    "example": ".colMeans(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "unsupported"
  },
  {
    "name": ".colSums",
    "category": "行列・配列",
    "syntax": ".colSums(x, m, n, na.rm = FALSE)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず（式を解釈できません）、呼び出しに到達できないため",
    "example": ".colSums(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "unsupported"
  },
  {
    "name": ".rowMeans",
    "category": "行列・配列",
    "syntax": ".rowMeans(x, m, n, na.rm = FALSE)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず（式を解釈できません）、呼び出しに到達できないため",
    "example": ".rowMeans(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "unsupported"
  },
  {
    "name": ".rowSums",
    "category": "行列・配列",
    "syntax": ".rowSums(x, m, n, na.rm = FALSE)",
    "description": "数値配列・データフレームの行・列ごとの合計（rowSums／colSums）と平均（rowMeans／colMeans）を計算します。【未対応の理由】ドット始まりの識別子を共有パーサが受理せず（式を解釈できません）、呼び出しに到達できないため",
    "example": ".rowSums(x)",
    "caution": "NA を含む行・列は na.rm=FALSE では NA になります。dims で配列の周辺の取り方が変わります。",
    "status": "unsupported"
  },
  {
    "name": "commandArgs",
    "category": "その他",
    "syntax": "commandArgs(trailingOnly = FALSE)",
    "description": "R セッション起動時に渡されたコマンドライン引数のコピーを返します。【未対応の理由】セッションのコマンドラインという実行環境に依存し、値モデルで忠実に再現できないため",
    "example": "commandArgs()",
    "caution": "セッションの起動方法に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": "comment",
    "category": "その他",
    "syntax": "comment(x)",
    "description": "オブジェクトの comment 属性を取得・設定します。【未対応の理由】属性システム（comment属性）に依存し、値モデルで忠実に再現できないため",
    "example": "comment(x)",
    "caution": "属性システムに依存し、comment は通常の表示では出力されません。",
    "status": "unsupported"
  },
  {
    "name": "!=",
    "category": "演算子",
    "syntax": "x != y",
    "description": "原子ベクトルの値を比較する関係演算子（< > <= >= == !=）です。",
    "example": "1 != 2",
    "caution": "型が異なる場合は共通型へ変換してから比較されます。NA との比較結果は NA です。文字列の照合順序はロケール依存です。",
    "status": "supported"
  },
  {
    "name": "<",
    "category": "演算子",
    "syntax": "x < y",
    "description": "原子ベクトルの値を比較する関係演算子（< > <= >= == !=）です。",
    "example": "1 < 2",
    "caution": "型が異なる場合は共通型へ変換してから比較されます。NA との比較結果は NA です。文字列の照合順序はロケール依存です。",
    "status": "supported"
  },
  {
    "name": "<=",
    "category": "演算子",
    "syntax": "x <= y",
    "description": "原子ベクトルの値を比較する関係演算子（< > <= >= == !=）です。",
    "example": "1 <= 2",
    "caution": "型が異なる場合は共通型へ変換してから比較されます。NA との比較結果は NA です。文字列の照合順序はロケール依存です。",
    "status": "supported"
  },
  {
    "name": "==",
    "category": "演算子",
    "syntax": "x == y",
    "description": "原子ベクトルの値を比較する関係演算子（< > <= >= == !=）です。",
    "example": "1 == 2",
    "caution": "型が異なる場合は共通型へ変換してから比較されます。NA との比較結果は NA です。文字列の照合順序はロケール依存です。",
    "status": "supported"
  },
  {
    "name": ">",
    "category": "演算子",
    "syntax": "x > y",
    "description": "原子ベクトルの値を比較する関係演算子（< > <= >= == !=）です。",
    "example": "2 > 1",
    "caution": "型が異なる場合は共通型へ変換してから比較されます。NA との比較結果は NA です。文字列の照合順序はロケール依存です。",
    "status": "supported"
  },
  {
    "name": ">=",
    "category": "演算子",
    "syntax": "x >= y",
    "description": "原子ベクトルの値を比較する関係演算子（< > <= >= == !=）です。",
    "example": "2 >= 1",
    "caution": "型が異なる場合は共通型へ変換してから比較されます。NA との比較結果は NA です。文字列の照合順序はロケール依存です。",
    "status": "supported"
  },
  {
    "name": "Arg",
    "category": "型変換",
    "syntax": "Arg(z)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "Arg(.)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "as.complex",
    "category": "型変換",
    "syntax": "as.complex(x, ...)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "as.complex(1)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "complex",
    "category": "型変換",
    "syntax": "complex(length.out = 0, real = numeric(), imaginary = numeric(), modulus = 1, argument = 0)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "complex(real = 1, imaginary = 2)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "Conj",
    "category": "型変換",
    "syntax": "Conj(z)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "Conj(x)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "Im",
    "category": "型変換",
    "syntax": "Im(z)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "Im = 0: NAs <- vapply(list(NA, NA_integer_, NA_real_, NA_character_, NA_complex_), as.complex, 0+0i)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "is.complex",
    "category": "型変換",
    "syntax": "is.complex(x)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "is.complex(x)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "Mod",
    "category": "型変換",
    "syntax": "Mod(z)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "Mod(zz)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "Re",
    "category": "型変換",
    "syntax": "Re(z)",
    "description": "複素数ベクトルの作成・変換・判定と、実部・虚部・絶対値・偏角・共役を取得します。【未対応の理由】複素数型を値モデルが扱わないため",
    "example": "Re(NAs)",
    "caution": "このモデルは複素数を扱いません（基礎層の方針）。",
    "status": "unsupported"
  },
  {
    "name": "allowInterrupts",
    "category": "条件とエラー",
    "syntax": "allowInterrupts(expr)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "allowInterrupts(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.character.condition",
    "category": "条件とエラー",
    "syntax": "as.character.condition(x, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。（as.character.condition はそのクラス向けのメソッドです。）【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "as.character.condition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "computeRestarts",
    "category": "条件とエラー",
    "syntax": "computeRestarts(cond = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "computeRestarts(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "condition",
    "category": "条件とエラー",
    "syntax": "condition(...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "condition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "conditionCall",
    "category": "条件とエラー",
    "syntax": "conditionCall(c)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "conditionCall(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "conditionCall.condition",
    "category": "条件とエラー",
    "syntax": "conditionCall.condition(x, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。（conditionCall.condition はそのクラス向けのメソッドです。）【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "conditionCall.condition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "conditionMessage",
    "category": "条件とエラー",
    "syntax": "conditionMessage(c)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "conditionMessage(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "conditionMessage.condition",
    "category": "条件とエラー",
    "syntax": "conditionMessage.condition(x, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。（conditionMessage.condition はそのクラス向けのメソッドです。）【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "conditionMessage.condition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "conditions",
    "category": "条件とエラー",
    "syntax": "conditions(...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "conditions(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "errorCondition",
    "category": "条件とエラー",
    "syntax": "errorCondition(message, ..., class = NULL, call = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "errorCondition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "findRestart",
    "category": "条件とエラー",
    "syntax": "findRestart(name, cond = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "findRestart(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "globalCallingHandlers",
    "category": "条件とエラー",
    "syntax": "globalCallingHandlers(...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "globalCallingHandlers(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "invokeRestart",
    "category": "条件とエラー",
    "syntax": "invokeRestart(r, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "invokeRestart(\"foo\", 1, 2)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "invokeRestartInteractively",
    "category": "条件とエラー",
    "syntax": "invokeRestartInteractively(r)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "invokeRestartInteractively(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "isRestart",
    "category": "条件とエラー",
    "syntax": "isRestart(x)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "isRestart(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "messageCondition",
    "category": "条件とエラー",
    "syntax": "messageCondition(message, ..., class = NULL, call = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "messageCondition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.condition",
    "category": "条件とエラー",
    "syntax": "print.condition(x, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。（print.condition はそのクラス向けのメソッドです。）【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "print.condition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "restartDescription",
    "category": "条件とエラー",
    "syntax": "restartDescription(r)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "restartDescription(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "restartFormals",
    "category": "条件とエラー",
    "syntax": "restartFormals(r)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "restartFormals(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "signalCondition",
    "category": "条件とエラー",
    "syntax": "signalCondition(cond)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "signalCondition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "simpleCondition",
    "category": "条件とエラー",
    "syntax": "simpleCondition(message, call = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "simpleCondition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "simpleError",
    "category": "条件とエラー",
    "syntax": "simpleError(message, call = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "simpleError(\"test error\")",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "simpleMessage",
    "category": "条件とエラー",
    "syntax": "simpleMessage(message, call = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "simpleMessage(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "simpleWarning",
    "category": "条件とエラー",
    "syntax": "simpleWarning(message, call = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "simpleWarning(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "suspendInterrupts",
    "category": "条件とエラー",
    "syntax": "suspendInterrupts(expr)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "suspendInterrupts(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "tryCatch",
    "category": "条件とエラー",
    "syntax": "tryCatch(expr, ..., finally)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "tryCatch(1, finally = print(\"Hello\"))",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "tryInvokeRestart",
    "category": "条件とエラー",
    "syntax": "tryInvokeRestart(r, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "tryInvokeRestart(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "warningCondition",
    "category": "条件とエラー",
    "syntax": "warningCondition(message, ..., class = NULL, call = NULL)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "warningCondition(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "withCallingHandlers",
    "category": "条件とエラー",
    "syntax": "withCallingHandlers(expr, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "withCallingHandlers({ warning(\"A\"); 1+2 }, warning = function(w) {})",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "withRestarts",
    "category": "条件とエラー",
    "syntax": "withRestarts(expr, ...)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": "withRestarts(stop(\"A\"), abort = function() {})",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".handleSimpleError",
    "category": "条件とエラー",
    "syntax": ".handleSimpleError(h, msg, call)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": ".handleSimpleError(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".signalSimpleWarning",
    "category": "条件とエラー",
    "syntax": ".signalSimpleWarning(msg, call)",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": ".signalSimpleWarning(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".tryResumeInterrupt",
    "category": "条件とエラー",
    "syntax": ".tryResumeInterrupt()",
    "description": "エラー・警告などの条件（condition）を発生・処理・再開するための機構です。【未対応の理由】条件ハンドラ・再開（restart）という評価制御機構に依存し、値モデルで忠実に再現できないため",
    "example": ".tryResumeInterrupt(x)",
    "caution": "条件ハンドラと再開（restart）は評価制御に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "conflicts",
    "category": "環境と言語",
    "syntax": "conflicts(where = search(), detail = FALSE)",
    "description": "検索パス上で同名オブジェクトが複数存在する（マスキングされている）ものを報告します。【未対応の理由】検索パスと環境に依存し、値モデルで忠実に再現できないため",
    "example": "conflicts(, TRUE)",
    "caution": "検索パスと環境に依存します。",
    "status": "unsupported"
  },
  {
    "name": "bzfile",
    "category": "入出力",
    "syntax": "bzfile(description, open = \"\", encoding = getOption(\"encoding\"), compression = 9)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "bzfile(zzfil, \"w\")",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "clipboard",
    "category": "入出力",
    "syntax": "clipboard(...)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "clipboard(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "close",
    "category": "入出力",
    "syntax": "close(con, ...)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "close(zz)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "fifo",
    "category": "入出力",
    "syntax": "fifo(description, open = \"\", blocking = FALSE, encoding = getOption(\"encoding\"))",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "fifo(\"testfifo\", open = \"w+\")",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file",
    "category": "入出力",
    "syntax": "file(description = \"\", open = \"\", blocking = TRUE, encoding = getOption(\"encoding\"), raw = FALSE, method = getOption(\"url.method\", \"default\"))",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "file(fileext=\".data\")",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "flush",
    "category": "入出力",
    "syntax": "flush(con)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "flush(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "gzfile",
    "category": "入出力",
    "syntax": "gzfile(description, open = \"\", encoding = getOption(\"encoding\"), compression = 6)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "gzfile(zzfil, \"w\")",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "isIncomplete",
    "category": "入出力",
    "syntax": "isIncomplete(con)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "isIncomplete(con2)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "isOpen",
    "category": "入出力",
    "syntax": "isOpen(con, rw = \"\")",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "isOpen(Tfile, \"r\")",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "open",
    "category": "入出力",
    "syntax": "open(con, ...)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "open(con)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "pipe",
    "category": "入出力",
    "syntax": "pipe(description, open = \"\", encoding = getOption(\"encoding\"))",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "pipes # read listing of current directory readLines(pipe(\"ls -1\")) # remove trailing commas. Suppose",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.connection",
    "category": "入出力",
    "syntax": "print.connection(x, ...)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。（print.connection はそのクラス向けのメソッドです。）【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "print.connection(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "serverSocket",
    "category": "入出力",
    "syntax": "serverSocket(port)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "serverSocket(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "socketAccept",
    "category": "入出力",
    "syntax": "socketAccept(socket, blocking = FALSE, open = \"a+\", encoding = getOption(\"encoding\"), timeout = getOption(\"timeout\"), options = getOption(\"socketOptions\"))",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "socketAccept(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "socketConnection",
    "category": "入出力",
    "syntax": "socketConnection(host = \"localhost\", port, server = FALSE, blocking = FALSE, open = \"a+\", encoding = getOption(\"encoding\"), timeout = getOption(\"timeout\"), options = getOption(\"socketOptions\"))",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "socketConnection(port = 79, blocking = TRUE)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "socketTimeout",
    "category": "入出力",
    "syntax": "socketTimeout(socket, timeout = -1)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "socketTimeout(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "summary.connection",
    "category": "入出力",
    "syntax": "summary.connection(x, ...)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。（summary.connection はそのクラス向けのメソッドです。）【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "summary.connection(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "unz",
    "category": "入出力",
    "syntax": "unz(description, filename, open = \"\", encoding = getOption(\"encoding\"))",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "unz(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "url",
    "category": "入出力",
    "syntax": "url(description, open = \"\", blocking = TRUE, encoding = getOption(\"encoding\"), method = getOption(\"url.method\", \"default\"), headers = NULL)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "url(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "xzfile",
    "category": "入出力",
    "syntax": "xzfile(description, open = \"\", encoding = getOption(\"encoding\"), compression = 6)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "xzfile(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "zstdfile",
    "category": "入出力",
    "syntax": "zstdfile(description, open = \"\", encoding = getOption(\"encoding\"), compression = 9)",
    "description": "ファイル・URL・パイプ・ソケットなどの接続（connection）を作成・開閉します。【未対応の理由】接続（connection）という外部リソースに依存し、値モデルで忠実に再現できないため",
    "example": "zstdfile(x)",
    "caution": "外部リソース（ファイルシステム・ネットワーク）に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "Constants",
    "category": "定数",
    "syntax": "Constants",
    "description": "R に組み込まれた定数（letters／LETTERS／month.abb／month.name／pi）です。【未対応の理由】組み込み定数であり、エンジンの値モデルに定数値が無く、名前が未定義名として停止するため",
    "example": "pi",
    "caution": "pi 以外はベクトル定数です。month.name はロケールで変わります。",
    "status": "unsupported"
  },
  {
    "name": "LETTERS",
    "category": "定数",
    "syntax": "LETTERS",
    "description": "R に組み込まれた定数（letters／LETTERS／month.abb／month.name／pi）です。【未対応の理由】組み込み定数であり、エンジンの値モデルに定数値が無く、名前が未定義名として停止するため",
    "example": "LETTERS",
    "caution": "pi 以外はベクトル定数です。month.name はロケールで変わります。",
    "status": "unsupported"
  },
  {
    "name": "letters",
    "category": "定数",
    "syntax": "letters",
    "description": "R に組み込まれた定数（letters／LETTERS／month.abb／month.name／pi）です。【未対応の理由】組み込み定数であり、エンジンの値モデルに定数値が無く、名前が未定義名として停止するため",
    "example": "letters",
    "caution": "pi 以外はベクトル定数です。month.name はロケールで変わります。",
    "status": "unsupported"
  },
  {
    "name": "month.abb",
    "category": "定数",
    "syntax": "month.abb",
    "description": "R に組み込まれた定数（letters／LETTERS／month.abb／month.name／pi）です。【未対応の理由】組み込み定数であり、エンジンの値モデルに定数値が無く、名前が未定義名として停止するため",
    "example": "month.abb",
    "caution": "pi 以外はベクトル定数です。month.name はロケールで変わります。",
    "status": "unsupported"
  },
  {
    "name": "pi",
    "category": "定数",
    "syntax": "pi",
    "description": "R に組み込まれた定数（letters／LETTERS／month.abb／month.name／pi）です。【未対応の理由】組み込み定数であり、エンジンの値モデルに定数値が無く、名前が未定義名として停止するため",
    "example": "pi",
    "caution": "pi 以外はベクトル定数です。month.name はロケールで変わります。",
    "status": "unsupported"
  },
  {
    "name": "contributors",
    "category": "その他",
    "syntax": "contributors",
    "description": "R プロジェクト貢献者の一覧（文書ページ）です。呼び出せる関数ではありません。【未対応の理由】文書のみのページで、対応する関数が存在しないため",
    "example": "contributors(x)",
    "caution": "文書のみです。",
    "status": "unsupported"
  },
  {
    "name": "%||%",
    "category": "制御",
    "syntax": "x %||% y",
    "description": "R 言語の基本的な制御フロー構文（if／for／while／repeat／break／next と %||%）です。全て予約語です。【未対応の理由】共有パーサが %||% 演算子を受理しないため",
    "example": "NULL %||% 1",
    "caution": "if の条件は長さ1で NA でないことが必要です。%||% は左辺が NULL のとき右辺を返します。",
    "status": "unsupported"
  },
  {
    "name": "copyright",
    "category": "その他",
    "syntax": "copyright",
    "description": "R のビルドに使われたファイルの著作権情報（文書）です。【未対応の理由】ビルド付随文書の表示であり、値モデルで忠実に再現できないため",
    "example": "copyright(x)",
    "caution": "文書情報であり計算ではありません。",
    "status": "unsupported"
  },
  {
    "name": "copyrights",
    "category": "その他",
    "syntax": "copyrights",
    "description": "R のビルドに使われたファイルの著作権情報（文書）です。【未対応の理由】ビルド付随文書の表示であり、値モデルで忠実に再現できないため",
    "example": "copyrights(x)",
    "caution": "文書情報であり計算ではありません。",
    "status": "unsupported"
  },
  {
    "name": "crossprod",
    "category": "行列・配列",
    "syntax": "crossprod(x, y = NULL, ...)",
    "description": "行列のクロス積を返します。crossprod は t(x) %*% y、tcrossprod は x %*% t(y) と等価で高速です。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "crossprod(1:4)",
    "caution": "y が NULL の場合は x 自身とのクロス積です。次元が適合しないとエラーになります。",
    "status": "unsupported"
  },
  {
    "name": "tcrossprod",
    "category": "行列・配列",
    "syntax": "tcrossprod(x, y = NULL, ...)",
    "description": "行列のクロス積を返します。crossprod は t(x) %*% y、tcrossprod は x %*% t(y) と等価で高速です。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "tcrossprod(as.matrix(x))",
    "caution": "y が NULL の場合は x 自身とのクロス積です。次元が適合しないとエラーになります。",
    "status": "unsupported"
  },
  {
    "name": "Cstack_info",
    "category": "その他",
    "syntax": "Cstack_info",
    "description": "C スタックのサイズと使用量を報告します。【未対応の理由】インタプリタ内部（Cスタック）の照会であり、値モデルで忠実に再現できないため",
    "example": "Cstack_info()",
    "caution": "インタプリタ内部情報です。",
    "status": "unsupported"
  },
  {
    "name": "cummax",
    "category": "ベクトル",
    "syntax": "cummax(x)",
    "description": "要素の累積和（cumsum）・累積積（cumprod）・累積最大（cummax）・累積最小（cummin）を返します。",
    "example": "cummax(c(3:1, 2:0, 4:2))",
    "caution": "NA が現れると、それ以降の要素は原則 NA になります。",
    "status": "supported"
  },
  {
    "name": "cummin",
    "category": "ベクトル",
    "syntax": "cummin(x)",
    "description": "要素の累積和（cumsum）・累積積（cumprod）・累積最大（cummax）・累積最小（cummin）を返します。",
    "example": "cummin(c(3:1, 2:0, 4:2))",
    "caution": "NA が現れると、それ以降の要素は原則 NA になります。",
    "status": "supported"
  },
  {
    "name": "cumprod",
    "category": "ベクトル",
    "syntax": "cumprod(x)",
    "description": "要素の累積和（cumsum）・累積積（cumprod）・累積最大（cummax）・累積最小（cummin）を返します。",
    "example": "cumprod(1:10)",
    "caution": "NA が現れると、それ以降の要素は原則 NA になります。",
    "status": "supported"
  },
  {
    "name": "cumsum",
    "category": "ベクトル",
    "syntax": "cumsum(x)",
    "description": "要素の累積和（cumsum）・累積積（cumprod）・累積最大（cummax）・累積最小（cummin）を返します。",
    "example": "cumsum(1:10)",
    "caution": "NA が現れると、それ以降の要素は原則 NA になります。",
    "status": "supported"
  },
  {
    "name": "curlGetHeaders",
    "category": "入出力",
    "syntax": "curlGetHeaders(url, redirect = TRUE, verify = TRUE, timeout = 0L, TLS = \"\")",
    "description": "URL のレスポンスヘッダをネットワーク経由で取得します。【未対応の理由】ネットワークアクセスに依存し、値モデルで忠実に再現できないため",
    "example": "curlGetHeaders(\"http://bugs.r-project.org\")",
    "caution": "ネットワークアクセスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "cut",
    "category": "因子",
    "syntax": "cut(x, ...)",
    "description": "数値ベクトルの範囲を区間に分け、各値が属する区間を表す因子へ変換します。【未対応の理由】戻り値が因子であり、因子をエンジンの値モデルで表せないため",
    "example": "cut(Z, breaks = -6:6)",
    "caution": "区間外の値は NA になります。breaks の端の扱いは right／include.lowest で変わります。",
    "status": "unsupported"
  },
  {
    "name": "cut.POSIXt",
    "category": "日付と時刻",
    "syntax": "cut.POSIXt(...)",
    "description": "日時オブジェクトに対する cut のメソッドです。（cut.POSIXt はそのクラス向けのメソッドです。）【未対応の理由】POSIXtクラスへのS3メソッドであり、値モデルで忠実に再現できないため",
    "example": "cut.POSIXt(x)",
    "caution": "POSIXtクラスとS3ディスパッチに依存します。",
    "status": "unsupported"
  },
  {
    "name": "data.class",
    "category": "その他",
    "syntax": "data.class(x)",
    "description": "任意オブジェクトのクラスを（旧S互換の観点で）判定します。【未対応の理由】クラス機構に依存し、値モデルで忠実に再現できないため",
    "example": "data.class(factor(x))",
    "caution": "クラス機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": "data.matrix",
    "category": "データフレーム",
    "syntax": "data.matrix(frame, rownames.force = NA)",
    "description": "データフレームの全列を数値化して列として束ねた数値行列を返します。因子は内部コードになります。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "data.matrix(DF[1:2])",
    "caution": "文字列表現の数値化で情報が失われることがあります。",
    "status": "unsupported"
  },
  {
    "name": "date",
    "category": "日付と時刻",
    "syntax": "date",
    "description": "現在のシステム日時を文字列で返します。【未対応の理由】実行時のシステム時刻に依存し、再現可能な値として表せないため",
    "example": "date()",
    "caution": "実行時のシステム時刻に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": "as.list.Date",
    "category": "日付と時刻",
    "syntax": "as.list.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（as.list.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.list.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "c.Date",
    "category": "日付と時刻",
    "syntax": "c.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（c.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "c.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Math.Date",
    "category": "日付と時刻",
    "syntax": "Math.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（Math.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "Math.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "mean.Date",
    "category": "日付と時刻",
    "syntax": "mean.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（mean.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "mean.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.Date",
    "category": "日付と時刻",
    "syntax": "print.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（print.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "print.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "split.Date",
    "category": "日付と時刻",
    "syntax": "split.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（split.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "split.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Summary.Date",
    "category": "日付と時刻",
    "syntax": "Summary.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（Summary.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "Summary.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "summary.Date",
    "category": "日付と時刻",
    "syntax": "summary.Date(x, ...)",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（summary.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "summary.Date(x)",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[.Date",
    "category": "日付と時刻",
    "syntax": "[.Date",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（[.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[<-.Date",
    "category": "日付と時刻",
    "syntax": "[<-.Date",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（[<-.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[1] <- x[1]",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[[.Date",
    "category": "日付と時刻",
    "syntax": "[[.Date",
    "description": "暦日を表す Date クラスの説明と、そのメソッド群（print.Date 等）です。（[[.Date はそのクラス向けのメソッドです。）【未対応の理由】DateクラスとそのS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[[1]]",
    "caution": "DateクラスとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "anyNA.POSIXlt",
    "category": "日付と時刻",
    "syntax": "anyNA.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "anyNA.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.data.frame.POSIXlt",
    "category": "日付と時刻",
    "syntax": "as.data.frame.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（as.data.frame.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.data.frame.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.list.POSIXct",
    "category": "日付と時刻",
    "syntax": "as.list.POSIXct(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（as.list.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.list.POSIXct(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.matrix.POSIXlt",
    "category": "日付と時刻",
    "syntax": "as.matrix.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（as.matrix.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.matrix.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "c.POSIXct",
    "category": "日付と時刻",
    "syntax": "c.POSIXct(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（c.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "c.POSIXct(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "DateTimeClasses",
    "category": "日付と時刻",
    "syntax": "DateTimeClasses(...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "DateTimeClasses(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "duplicated.POSIXlt",
    "category": "日付と時刻",
    "syntax": "duplicated.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（duplicated.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "duplicated.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "is.finite.POSIXlt",
    "category": "日付と時刻",
    "syntax": "is.finite.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（is.finite.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "is.finite.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "is.infinite.POSIXlt",
    "category": "日付と時刻",
    "syntax": "is.infinite.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（is.infinite.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "is.infinite.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "is.na.POSIXlt",
    "category": "日付と時刻",
    "syntax": "is.na.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（is.na.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "is.na.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "is.nan.POSIXlt",
    "category": "日付と時刻",
    "syntax": "is.nan.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（is.nan.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "is.nan.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "length.POSIXlt",
    "category": "日付と時刻",
    "syntax": "length.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（length.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "length.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Math.POSIXlt",
    "category": "日付と時刻",
    "syntax": "Math.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（Math.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "Math.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Math.POSIXt",
    "category": "日付と時刻",
    "syntax": "Math.POSIXt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（Math.POSIXt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "Math.POSIXt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "mean.POSIXct",
    "category": "日付と時刻",
    "syntax": "mean.POSIXct(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（mean.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "mean.POSIXct(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "names.POSIXlt",
    "category": "日付と時刻",
    "syntax": "names.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（names.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "names.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Ops.POSIXt",
    "category": "日付と時刻",
    "syntax": "Ops.POSIXt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（Ops.POSIXt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "Ops.POSIXt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.POSIXct",
    "category": "日付と時刻",
    "syntax": "print.POSIXct(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（print.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "print.POSIXct(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "split.POSIXct",
    "category": "日付と時刻",
    "syntax": "split.POSIXct(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（split.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "split.POSIXct(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "str.POSIXt",
    "category": "日付と時刻",
    "syntax": "str.POSIXt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "str.POSIXt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Summary.POSIXct",
    "category": "日付と時刻",
    "syntax": "Summary.POSIXct(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（Summary.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "Summary.POSIXct(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "summary.POSIXct",
    "category": "日付と時刻",
    "syntax": "summary.POSIXct(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（summary.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "summary.POSIXct(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Summary.POSIXlt",
    "category": "日付と時刻",
    "syntax": "Summary.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（Summary.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "Summary.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "unique.POSIXlt",
    "category": "日付と時刻",
    "syntax": "unique.POSIXlt(x, ...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（unique.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "unique.POSIXlt(x)",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "$<-.POSIXlt",
    "category": "日付と時刻",
    "syntax": "$<-.POSIXlt",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（$<-.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "df$x <- 1",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "+.POSIXt",
    "category": "日付と時刻",
    "syntax": "+.POSIXt",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（+.POSIXt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "+.POSIXt",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "-.POSIXt",
    "category": "日付と時刻",
    "syntax": "-.POSIXt",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（-.POSIXt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "-.POSIXt",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": ".leap.seconds",
    "category": "日付と時刻",
    "syntax": ".leap.seconds(...)",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": ".leap.seconds",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[.POSIXct",
    "category": "日付と時刻",
    "syntax": "[.POSIXct",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（[.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[.POSIXlt",
    "category": "日付と時刻",
    "syntax": "[.POSIXlt",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（[.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[<-.POSIXct",
    "category": "日付と時刻",
    "syntax": "[<-.POSIXct",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（[<-.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[1] <- x[1]",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[<-.POSIXlt",
    "category": "日付と時刻",
    "syntax": "[<-.POSIXlt",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（[<-.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[1] <- x[1]",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[[.POSIXct",
    "category": "日付と時刻",
    "syntax": "[[.POSIXct",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（[[.POSIXct はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[[1]]",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[[.POSIXlt",
    "category": "日付と時刻",
    "syntax": "[[.POSIXlt",
    "description": "日時を表す POSIXct／POSIXlt クラスの説明と、そのメソッド群です。（[[.POSIXlt はそのクラス向けのメソッドです。）【未対応の理由】POSIXct／POSIXltクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[[1]]",
    "caution": "タイムゾーンとS3メソッドに依存します。",
    "status": "unsupported"
  },
  {
    "name": "read.dcf",
    "category": "入出力",
    "syntax": "read.dcf(file, fields = NULL, all = FALSE, keep.white = NULL)",
    "description": "Debian Control File（DCF）形式でファイルから読み取り・書き出しを行います。【未対応の理由】実ファイルへの入出力に依存し、値モデルで忠実に再現できないため",
    "example": "read.dcf(file = system.file(\"DESCRIPTION\", package = \"splines\"), fields = c(\"Package\", \"Version\", \"Title\"))",
    "caution": "実ファイルへの入出力に依存します。",
    "status": "unsupported"
  },
  {
    "name": "write.dcf",
    "category": "入出力",
    "syntax": "write.dcf(x, file = \"\", append = FALSE, useBytes = FALSE, indent = 0.1 * getOption(\"width\"), width = 0.9 * getOption(\"width\"), keep.white = NULL)",
    "description": "Debian Control File（DCF）形式でファイルから読み取り・書き出しを行います。【未対応の理由】実ファイルへの入出力に依存し、値モデルで忠実に再現できないため",
    "example": "write.dcf(x)",
    "caution": "実ファイルへの入出力に依存します。",
    "status": "unsupported"
  },
  {
    "name": "debug",
    "category": "環境と言語",
    "syntax": "debug(fun, text = \"\", condition = NULL, signature = NULL)",
    "description": "関数のデバッグフラグを設定・解除・照会します。【未対応の理由】デバッガと関数オブジェクトの状態に依存し、値モデルで忠実に再現できないため",
    "example": "debug(library)",
    "caution": "対話的デバッガと関数オブジェクトの状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "debuggingState",
    "category": "環境と言語",
    "syntax": "debuggingState(on = NULL)",
    "description": "関数のデバッグフラグを設定・解除・照会します。【未対応の理由】デバッガと関数オブジェクトの状態に依存し、値モデルで忠実に再現できないため",
    "example": "debuggingState(x)",
    "caution": "対話的デバッガと関数オブジェクトの状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "debugonce",
    "category": "環境と言語",
    "syntax": "debugonce(fun, text = \"\", condition = NULL, signature = NULL)",
    "description": "関数のデバッグフラグを設定・解除・照会します。【未対応の理由】デバッガと関数オブジェクトの状態に依存し、値モデルで忠実に再現できないため",
    "example": "debugonce(sample)",
    "caution": "対話的デバッガと関数オブジェクトの状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "isdebugged",
    "category": "環境と言語",
    "syntax": "isdebugged(fun, signature = NULL)",
    "description": "関数のデバッグフラグを設定・解除・照会します。【未対応の理由】デバッガと関数オブジェクトの状態に依存し、値モデルで忠実に再現できないため",
    "example": "isdebugged(x)",
    "caution": "対話的デバッガと関数オブジェクトの状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "undebug",
    "category": "環境と言語",
    "syntax": "undebug(fun, signature = NULL)",
    "description": "関数のデバッグフラグを設定・解除・照会します。【未対応の理由】デバッガと関数オブジェクトの状態に依存し、値モデルで忠実に再現できないため",
    "example": "undebug(x)",
    "caution": "対話的デバッガと関数オブジェクトの状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "declare",
    "category": "環境と言語",
    "syntax": "declare(...)",
    "description": "インタプリタ・コンパイラ・解析ツール向けにコード情報を宣言する枠組みです。【未対応の理由】言語・コンパイラ機構への宣言であり、値モデルで忠実に再現できないため",
    "example": "declare(x)",
    "caution": "言語・コンパイラ機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": "Defunct",
    "category": "その他",
    "syntax": "Defunct(new, package = NULL, msg)",
    "description": "削除された関数が呼ばれたときに廃止を通知する内部仕組みです。【未対応の理由】廃止通知の内部機構であり、値として再現する対象ではないため",
    "example": "Defunct(x)",
    "caution": "廃止関数のスタブ専用であり、通常の計算には使いません。",
    "status": "unsupported"
  },
  {
    "name": "defunct",
    "category": "その他",
    "syntax": "defunct(...)",
    "description": "削除された関数が呼ばれたときに廃止を通知する内部仕組みです。【未対応の理由】廃止通知の内部機構であり、値として再現する対象ではないため",
    "example": "defunct(x)",
    "caution": "廃止関数のスタブ専用であり、通常の計算には使いません。",
    "status": "unsupported"
  },
  {
    "name": ".Defunct",
    "category": "その他",
    "syntax": ".Defunct(new, package = NULL, msg)",
    "description": "削除された関数が呼ばれたときに廃止を通知する内部仕組みです。【未対応の理由】廃止通知の内部機構であり、値として再現する対象ではないため",
    "example": ".Defunct(x)",
    "caution": "廃止関数のスタブ専用であり、通常の計算には使いません。",
    "status": "unsupported"
  },
  {
    "name": "delayedAssign",
    "category": "環境と言語",
    "syntax": "delayedAssign(x, value, eval.env = parent.frame(1), assign.env = parent.frame(1))",
    "description": "値が要求されたときに初めて式を評価する約束（promise）を作成して代入します。【未対応の理由】約束（promise）の遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "delayedAssign(\"x\", msg)",
    "caution": "約束（promise）の遅延評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "deparse",
    "category": "環境と言語",
    "syntax": "deparse(expr, width.cutoff = 60L, backtick = mode(expr) %in% c(\"call\", \"expression\", \"(\", \"function\"), control = c(\"keepNA\", \"keepInteger\", \"niceNames\", \"showAttributes\"), nlines = -1L)",
    "description": "未評価の式を文字列へ変換（デパース）します。deparse1 は長さ1の文字列で返します。【未対応の理由】言語オブジェクトの文字列化に依存し、値モデルで忠実に再現できないため",
    "example": "deparse(args(lm))",
    "caution": "言語オブジェクトを文字列化する処理であり、式そのものが引数です。",
    "status": "unsupported"
  },
  {
    "name": "deparse1",
    "category": "環境と言語",
    "syntax": "deparse1(expr, collapse = \" \", width.cutoff = 500L, ...)",
    "description": "未評価の式を文字列へ変換（デパース）します。deparse1 は長さ1の文字列で返します。【未対応の理由】言語オブジェクトの文字列化に依存し、値モデルで忠実に再現できないため",
    "example": "deparse1(substitute(x))",
    "caution": "言語オブジェクトを文字列化する処理であり、式そのものが引数です。",
    "status": "unsupported"
  },
  {
    "name": "..deparseOpts",
    "category": "環境と言語",
    "syntax": "..deparseOpts(...)",
    "description": "deparse／dput／dump のデパース制御オプションを処理する内部仕組みです。【未対応の理由】言語オブジェクトの文字列化機構に依存し、値モデルで忠実に再現できないため",
    "example": "..deparseOpts",
    "caution": "言語オブジェクトの文字列化機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".deparseOpts",
    "category": "環境と言語",
    "syntax": ".deparseOpts(control)",
    "description": "deparse／dput／dump のデパース制御オプションを処理する内部仕組みです。【未対応の理由】言語オブジェクトの文字列化機構に依存し、値モデルで忠実に再現できないため",
    "example": ".deparseOpts(\"exact\")",
    "caution": "言語オブジェクトの文字列化機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": "Deprecated",
    "category": "その他",
    "syntax": "Deprecated(new, package = NULL, msg, old = as.character(sys.call(sys.parent()))[1L])",
    "description": "近々削除されるオブジェクトが呼ばれたときに非推奨を通知する内部仕組みです。【未対応の理由】非推奨通知の内部機構であり、値として再現する対象ではないため",
    "example": "Deprecated(x)",
    "caution": "非推奨スタブ専用です。",
    "status": "unsupported"
  },
  {
    "name": "deprecated",
    "category": "その他",
    "syntax": "deprecated(...)",
    "description": "近々削除されるオブジェクトが呼ばれたときに非推奨を通知する内部仕組みです。【未対応の理由】非推奨通知の内部機構であり、値として再現する対象ではないため",
    "example": "deprecated(x)",
    "caution": "非推奨スタブ専用です。",
    "status": "unsupported"
  },
  {
    "name": ".Deprecated",
    "category": "その他",
    "syntax": ".Deprecated(new, package = NULL, msg, old = as.character(sys.call(sys.parent()))[1L])",
    "description": "近々削除されるオブジェクトが呼ばれたときに非推奨を通知する内部仕組みです。【未対応の理由】非推奨通知の内部機構であり、値として再現する対象ではないため",
    "example": ".Deprecated(x)",
    "caution": "非推奨スタブ専用です。",
    "status": "unsupported"
  },
  {
    "name": "det",
    "category": "行列・配列",
    "syntax": "det(x, ...)",
    "description": "行列の行列式を計算します。determinant は行列式の絶対値（対数スケール可）と符号を分けて返します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "det(matrix(1:4, 2))",
    "caution": "det は determinant の modulus を符号付きで返す形です。特異行列では 0 になります。",
    "status": "unsupported"
  },
  {
    "name": "determinant",
    "category": "行列・配列",
    "syntax": "determinant(x, logarithm = TRUE, ...)",
    "description": "行列の行列式を計算します。determinant は行列式の絶対値（対数スケール可）と符号を分けて返します。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "determinant(x)",
    "caution": "det は determinant の modulus を符号付きで返す形です。特異行列では 0 になります。",
    "status": "unsupported"
  },
  {
    "name": "detach",
    "category": "環境と言語",
    "syntax": "detach(name, pos = 2L, unload = FALSE, character.only = FALSE, force = FALSE)",
    "description": "attach したデータベースやパッケージを検索パスから取り外します。【未対応の理由】検索パスと環境に依存し、値モデルで忠実に再現できないため",
    "example": "detach(package:splines)",
    "caution": "検索パスと環境に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".Device",
    "category": "入出力",
    "syntax": ".Device",
    "description": "開いているグラフィックスデバイスの一覧（.Devices）とアクティブなデバイス名（.Device）です。【未対応の理由】グラフィックスデバイスの状態に依存し、値モデルで忠実に再現できないため",
    "example": ".Device(x)",
    "caution": "グラフィックスデバイスという外部状態です。",
    "status": "unsupported"
  },
  {
    "name": ".Devices",
    "category": "入出力",
    "syntax": ".Devices",
    "description": "開いているグラフィックスデバイスの一覧（.Devices）とアクティブなデバイス名（.Device）です。【未対応の理由】グラフィックスデバイスの状態に依存し、値モデルで忠実に再現できないため",
    "example": ".Devices(x)",
    "caution": "グラフィックスデバイスという外部状態です。",
    "status": "unsupported"
  },
  {
    "name": "diag",
    "category": "行列・配列",
    "syntax": "diag(x = 1, nrow, ncol, names = TRUE)",
    "description": "行列の対角要素の抽出・置換、または対角行列の作成を行います。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "diag(3)",
    "caution": "x が行列でない場合は単位行列様の作成として解釈されます。名前付きベクトルでは名前が次元名になります。",
    "status": "unsupported"
  },
  {
    "name": "diff",
    "category": "ベクトル",
    "syntax": "diff(x, ...)",
    "description": "隣り合う要素の差（階差）を、lag 間隔・differences 回の反復で計算します。",
    "example": "diff(1:10, 2)",
    "caution": "結果は元のベクトルより短くなります。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "as.difftime",
    "category": "日付と時刻",
    "syntax": "as.difftime(tim, format = \"%X\", units = \"auto\", tz = \"UTC\")",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（as.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "as.difftime(c(\"0:3:20\", \"11:23:15\"))",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.double.difftime",
    "category": "日付と時刻",
    "syntax": "as.double.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（as.double.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "as.double.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.list.difftime",
    "category": "日付と時刻",
    "syntax": "as.list.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（as.list.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "as.list.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "c.difftime",
    "category": "日付と時刻",
    "syntax": "c.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（c.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "c.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "diff.difftime",
    "category": "日付と時刻",
    "syntax": "diff.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（diff.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "diff.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "difftime",
    "category": "日付と時刻",
    "syntax": "difftime(time1, time2, tz, units = c(\"auto\", \"secs\", \"mins\", \"hours\", \"days\", \"weeks\"))",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "difftime(c(\"0:3:20\", \"11:23:15\"))",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "format.difftime",
    "category": "日付と時刻",
    "syntax": "format.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（format.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "format.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "is.numeric.difftime",
    "category": "日付と時刻",
    "syntax": "is.numeric.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（is.numeric.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "is.numeric.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Math.difftime",
    "category": "日付と時刻",
    "syntax": "Math.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（Math.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "Math.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "mean.difftime",
    "category": "日付と時刻",
    "syntax": "mean.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（mean.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "mean.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Ops.difftime",
    "category": "日付と時刻",
    "syntax": "Ops.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（Ops.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "Ops.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.difftime",
    "category": "日付と時刻",
    "syntax": "print.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（print.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "print.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "rep.difftime",
    "category": "日付と時刻",
    "syntax": "rep.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（rep.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "rep.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Summary.difftime",
    "category": "日付と時刻",
    "syntax": "Summary.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（Summary.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "Summary.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "summary.difftime",
    "category": "日付と時刻",
    "syntax": "summary.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（summary.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "summary.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "units.difftime",
    "category": "日付と時刻",
    "syntax": "units.difftime(x, ...)",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（units.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "units.difftime(x)",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "*.difftime",
    "category": "日付と時刻",
    "syntax": "*.difftime",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（*.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "d * 2",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "/.difftime",
    "category": "日付と時刻",
    "syntax": "/.difftime",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（/.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "d / 2",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[.difftime",
    "category": "日付と時刻",
    "syntax": "[.difftime",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（[.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "[<-.difftime",
    "category": "日付と時刻",
    "syntax": "[<-.difftime",
    "description": "時刻の差（時間間隔）を表す difftime オブジェクトを作成・操作します。（[<-.difftime はそのクラス向けのメソッドです。）【未対応の理由】difftimeクラスと日時演算に依存し、値モデルで忠実に再現できないため",
    "example": "x[1] <- x[1]",
    "caution": "単位（secs／mins／hours／days／weeks）の選択が表示と数値に影響します。difftimeクラスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "dim",
    "category": "行列・配列",
    "syntax": "dim(x)",
    "description": "オブジェクトの次元を取得・設定します。",
    "example": "x <- data.frame(a = 1:2, b = 3:4)\ndim(x)",
    "caution": "次元を設定すると要素の並びは列優先で解釈されます。要素数と次元積が一致する必要があります。",
    "status": "supported"
  },
  {
    "name": "dimnames",
    "category": "行列・配列",
    "syntax": "dimnames(x)",
    "description": "オブジェクトの次元名を取得・設定します。provideDimnames は次元名を自動生成して付けます。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "dimnames(x)",
    "caution": "次元名の長さは対応する次元の大きさと一致する必要があります。",
    "status": "unsupported"
  },
  {
    "name": "provideDimnames",
    "category": "行列・配列",
    "syntax": "provideDimnames(x, sep = \"\", base = list(. = LETTERS), unique = TRUE, use.names = FALSE)",
    "description": "オブジェクトの次元名を取得・設定します。provideDimnames は次元名を自動生成して付けます。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "provideDimnames(N <- array(1:24, dim = 2:4))",
    "caution": "次元名の長さは対応する次元の大きさと一致する必要があります。",
    "status": "unsupported"
  },
  {
    "name": "do.call",
    "category": "環境と言語",
    "syntax": "do.call(what, args, quote = FALSE, envir = parent.frame())",
    "description": "関数名または関数と引数リストから呼び出しを構築して実行します。【未対応の理由】関数オブジェクトと評価環境に依存し、値モデルで忠実に再現できないため",
    "example": "do.call(\"complex\", list(imaginary = 1:3))",
    "caution": "関数オブジェクトと評価環境（envir）に依存します。",
    "status": "unsupported"
  },
  {
    "name": "dontCheck",
    "category": "その他",
    "syntax": "dontCheck(x)",
    "description": "identity と同じ値を返しますが、R CMD check の解析向けに検査抑制の指示として解釈されます。【未対応の理由】式オブジェクトをそのまま返す特殊形であり、言語オブジェクトをエンジンの値モデルで表せないため",
    "example": "dontCheck(x)",
    "caution": "チェックツール向けのマーカーであり、計算上の意味は identity と同一です。",
    "status": "unsupported"
  },
  {
    "name": "...",
    "category": "環境と言語",
    "syntax": "...(...)",
    "description": "関数内の ... （可変長引数）と ..1, ..2 などの参照、および ...length／...names／...elt です。【未対応の理由】可変長引数の約束（promise）としての遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "f <- function(...) ...length()",
    "caution": "... を仮引数に持つ関数の中でだけ使えます。約束（promise）として遅延評価されます。",
    "status": "unsupported"
  },
  {
    "name": "...elt",
    "category": "環境と言語",
    "syntax": "...elt(n)",
    "description": "関数内の ... （可変長引数）と ..1, ..2 などの参照、および ...length／...names／...elt です。【未対応の理由】可変長引数の約束（promise）としての遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "...elt(n)",
    "caution": "... を仮引数に持つ関数の中でだけ使えます。約束（promise）として遅延評価されます。",
    "status": "unsupported"
  },
  {
    "name": "...length",
    "category": "環境と言語",
    "syntax": "...length()",
    "description": "関数内の ... （可変長引数）と ..1, ..2 などの参照、および ...length／...names／...elt です。【未対応の理由】可変長引数の約束（promise）としての遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "...length()",
    "caution": "... を仮引数に持つ関数の中でだけ使えます。約束（promise）として遅延評価されます。",
    "status": "unsupported"
  },
  {
    "name": "...names",
    "category": "環境と言語",
    "syntax": "...names()",
    "description": "関数内の ... （可変長引数）と ..1, ..2 などの参照、および ...length／...names／...elt です。【未対応の理由】可変長引数の約束（promise）としての遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "...names()",
    "caution": "... を仮引数に持つ関数の中でだけ使えます。約束（promise）として遅延評価されます。",
    "status": "unsupported"
  },
  {
    "name": "..1",
    "category": "環境と言語",
    "syntax": "..1(...)",
    "description": "関数内の ... （可変長引数）と ..1, ..2 などの参照、および ...length／...names／...elt です。【未対応の理由】可変長引数の約束（promise）としての遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "..1(x)",
    "caution": "... を仮引数に持つ関数の中でだけ使えます。約束（promise）として遅延評価されます。",
    "status": "unsupported"
  },
  {
    "name": "..2",
    "category": "環境と言語",
    "syntax": "..2(...)",
    "description": "関数内の ... （可変長引数）と ..1, ..2 などの参照、および ...length／...names／...elt です。【未対応の理由】可変長引数の約束（promise）としての遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "..2(x)",
    "caution": "... を仮引数に持つ関数の中でだけ使えます。約束（promise）として遅延評価されます。",
    "status": "unsupported"
  },
  {
    "name": "as.double",
    "category": "型変換",
    "syntax": "as.double(x, ...)",
    "description": "double（倍精度）型ベクトルを作成・変換・判定します。single／as.single は互換用の扱いです。",
    "example": "x <- c(1, 2)\nas.double(x)",
    "caution": "as.single は実際には double として扱われます。",
    "status": "supported"
  },
  {
    "name": "as.single",
    "category": "型変換",
    "syntax": "as.single(x, ...)",
    "description": "double（倍精度）型ベクトルを作成・変換・判定します。single／as.single は互換用の扱いです。",
    "example": "x <- c(1, 2)\nas.single(x)",
    "caution": "as.single は実際には double として扱われます。",
    "status": "supported"
  },
  {
    "name": "double",
    "category": "型変換",
    "syntax": "double(length = 0)",
    "description": "double（倍精度）型ベクトルを作成・変換・判定します。single／as.single は互換用の扱いです。",
    "example": "double(1)",
    "caution": "as.single は実際には double として扱われます。",
    "status": "supported"
  },
  {
    "name": "is.double",
    "category": "型変換",
    "syntax": "is.double(x)",
    "description": "double（倍精度）型ベクトルを作成・変換・判定します。single／as.single は互換用の扱いです。",
    "example": "is.double(1)",
    "caution": "as.single は実際には double として扱われます。",
    "status": "supported"
  },
  {
    "name": "single",
    "category": "型変換",
    "syntax": "single(length = 0)",
    "description": "double（倍精度）型ベクトルを作成・変換・判定します。single／as.single は互換用の扱いです。",
    "example": "x <- 2\nsingle(x)",
    "caution": "as.single は実際には double として扱われます。",
    "status": "supported"
  },
  {
    "name": "dget",
    "category": "入出力",
    "syntax": "dget(file, keep.source = FALSE)",
    "description": "オブジェクトの ASCII テキスト表現をファイルやコンソールへ書き出します。dget はその逆で再構築します。【未対応の理由】実ファイルへの入出力と言語オブジェクトの文字列化に依存し、値モデルで忠実に再現できないため",
    "example": "dget(fil)",
    "caution": "実ファイル・接続への入出力と、式の文字列化に依存します。",
    "status": "unsupported"
  },
  {
    "name": "dput",
    "category": "入出力",
    "syntax": "dput(x, file = \"\", control = c(\"keepNA\", \"keepInteger\", \"niceNames\", \"showAttributes\"))",
    "description": "オブジェクトの ASCII テキスト表現をファイルやコンソールへ書き出します。dget はその逆で再構築します。【未対応の理由】実ファイルへの入出力と言語オブジェクトの文字列化に依存し、値モデルで忠実に再現できないため",
    "example": "dput(base::mean, fil)",
    "caution": "実ファイル・接続への入出力と、式の文字列化に依存します。",
    "status": "unsupported"
  },
  {
    "name": "drop",
    "category": "行列・配列",
    "syntax": "drop(x)",
    "description": "配列から長さ1の次元を取り除きます。",
    "example": "drop(c(1, 2, 3))",
    "caution": "全ての次元が長さ1の場合はベクトルになります。",
    "status": "supported"
  },
  {
    "name": "droplevels",
    "category": "因子",
    "syntax": "droplevels(x, ...)",
    "description": "因子またはデータフレーム内の因子から、使われていない水準を除きます。【未対応の理由】S3ジェネリックでありクラスへのディスパッチに依存するため",
    "example": "droplevels(aq)",
    "caution": "S3ジェネリック（factor／data.frameメソッド）です。NA水準の扱いは exclude で変わります。",
    "status": "unsupported"
  },
  {
    "name": "dump",
    "category": "入出力",
    "syntax": "dump(list, file = \"dumpdata.R\", append = FALSE, control = \"all\", envir = parent.frame(), evaluate = TRUE)",
    "description": "名前で指定したオブジェクト群のテキスト表現をファイルへ書き出します。【未対応の理由】実ファイルへの出力と環境に依存し、値モデルで忠実に再現できないため",
    "example": "dump(ls(pattern = '^[xyz]'), fil)",
    "caution": "実ファイルへの出力と環境内のオブジェクト参照に依存します。",
    "status": "unsupported"
  },
  {
    "name": "anyDuplicated",
    "category": "ベクトル",
    "syntax": "anyDuplicated(x, incomparables = FALSE, ...)",
    "description": "ベクトル・データフレーム等の各要素（行）が、それより前に現れた要素の重複かどうかを論理ベクトルで返します。anyDuplicated は最初の重複位置を返します。",
    "example": "warpbreaks <- c(1, 2, 1)\nanyDuplicated(warpbreaks)",
    "caution": "incomparables の指定で比較不能として扱う値を除外できます。因子では水準として比較されます。",
    "status": "supported"
  },
  {
    "name": "duplicated",
    "category": "ベクトル",
    "syntax": "duplicated(x, incomparables = FALSE, ...)",
    "description": "ベクトル・データフレーム等の各要素（行）が、それより前に現れた要素の重複かどうかを論理ベクトルで返します。anyDuplicated は最初の重複位置を返します。",
    "example": "x <- c(1, 2, 1)\nduplicated(x)",
    "caution": "incomparables の指定で比較不能として扱う値を除外できます。因子では水準として比較されます。",
    "status": "supported"
  },
  {
    "name": "dyn.load",
    "category": "その他",
    "syntax": "dyn.load(x, local = TRUE, now = TRUE, ...)",
    "description": "DLL（共有ライブラリ）を読み込み・解放し、ネイティブシンボルの有無を調べます。【未対応の理由】外部ネイティブコードの動的読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "dyn.load(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "dyn.unload",
    "category": "その他",
    "syntax": "dyn.unload(x)",
    "description": "DLL（共有ライブラリ）を読み込み・解放し、ネイティブシンボルの有無を調べます。【未対応の理由】外部ネイティブコードの動的読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "dyn.unload(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "is.loaded",
    "category": "その他",
    "syntax": "is.loaded(symbol, PACKAGE = \"\", type = \"\")",
    "description": "DLL（共有ライブラリ）を読み込み・解放し、ネイティブシンボルの有無を調べます。【未対応の理由】外部ネイティブコードの動的読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "is.loaded(\"supsmu\")",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "R_MAX_NUM_DLLS",
    "category": "その他",
    "syntax": "R_MAX_NUM_DLLS(...)",
    "description": "DLL（共有ライブラリ）を読み込み・解放し、ネイティブシンボルの有無を調べます。【未対応の理由】外部ネイティブコードの動的読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "R_MAX_NUM_DLLS(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "eapply",
    "category": "環境と言語",
    "syntax": "eapply(env, FUN, ..., all.names = FALSE, USE.NAMES = TRUE)",
    "description": "環境内の全ての値に関数を適用し、リストで返します。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "eapply(env, mean)",
    "caution": "環境オブジェクトに依存します。",
    "status": "unsupported"
  },
  {
    "name": "eigen",
    "category": "行列・配列",
    "syntax": "eigen(x, symmetric, only.values = FALSE, EISPACK = FALSE)",
    "description": "数値行列の固有値と固有ベクトル（スペクトル分解）を計算します。【未対応の理由】固有値が複素数になり得て、値モデル（複素数なし）で忠実に再現できないため",
    "example": "eigen(cbind(c(1,-1), c(-1,1)))",
    "caution": "一般の行列では固有値が複素数になり得ます。このモデルは複素数を扱わないため、実固有値の場合に限っても表現がリスト依存になります。",
    "status": "unsupported"
  },
  {
    "name": "print.eigen",
    "category": "行列・配列",
    "syntax": "print.eigen(x, ...)",
    "description": "数値行列の固有値と固有ベクトル（スペクトル分解）を計算します。（print.eigen はそのクラス向けのメソッドです。）【未対応の理由】固有値が複素数になり得て、値モデル（複素数なし）で忠実に再現できないため",
    "example": "print.eigen(x)",
    "caution": "一般の行列では固有値が複素数になり得ます。このモデルは複素数を扱わないため、実固有値の場合に限っても表現がリスト依存になります。",
    "status": "unsupported"
  },
  {
    "name": "encodeString",
    "category": "文字列",
    "syntax": "encodeString(x, width = 0, quote = \"\", na.encode = TRUE, justify = c(\"left\", \"right\", \"centre\", \"none\"))",
    "description": "文字列ベクトルを print と同じ規則でエスケープし、必要に応じて幅に合わせて整形します。",
    "example": "x <- \"abc\"\nencodeString(x)",
    "caution": "NA の扱いは na.encode で変わります。引用符は quote で指定します。",
    "status": "supported"
  },
  {
    "name": "enc2native",
    "category": "文字列",
    "syntax": "enc2native(x)",
    "description": "文字列ベクトルの宣言エンコーディングを取得・設定します。enc2native／enc2utf8 はネイティブ／UTF-8 表現へ変換します。【未対応の理由】文字列のエンコーディング宣言という内部表現属性に依存し、値モデルで忠実に再現できないため",
    "example": "enc2native(x)",
    "caution": "エンコーディングの宣言は文字列の内部表現属性に依存します。",
    "status": "unsupported"
  },
  {
    "name": "enc2utf8",
    "category": "文字列",
    "syntax": "enc2utf8(x)",
    "description": "文字列ベクトルの宣言エンコーディングを取得・設定します。enc2native／enc2utf8 はネイティブ／UTF-8 表現へ変換します。【未対応の理由】文字列のエンコーディング宣言という内部表現属性に依存し、値モデルで忠実に再現できないため",
    "example": "enc2utf8(x)",
    "caution": "エンコーディングの宣言は文字列の内部表現属性に依存します。",
    "status": "unsupported"
  },
  {
    "name": "Encoding",
    "category": "文字列",
    "syntax": "Encoding(x)",
    "description": "文字列ベクトルの宣言エンコーディングを取得・設定します。enc2native／enc2utf8 はネイティブ／UTF-8 表現へ変換します。【未対応の理由】文字列のエンコーディング宣言という内部表現属性に依存し、値モデルで忠実に再現できないため",
    "example": "Encoding(x.)",
    "caution": "エンコーディングの宣言は文字列の内部表現属性に依存します。",
    "status": "unsupported"
  },
  {
    "name": "baseenv",
    "category": "環境と言語",
    "syntax": "baseenv()",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "baseenv()",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "emptyenv",
    "category": "環境と言語",
    "syntax": "emptyenv()",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "emptyenv(x)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "env.profile",
    "category": "環境と言語",
    "syntax": "env.profile(env)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "env.profile(eh)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "environment",
    "category": "環境と言語",
    "syntax": "environment(fun = NULL)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "environment()",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "environmentName",
    "category": "環境と言語",
    "syntax": "environmentName(env)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "environmentName(x)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "globalenv",
    "category": "環境と言語",
    "syntax": "globalenv()",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "globalenv(x)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "is.environment",
    "category": "環境と言語",
    "syntax": "is.environment(x)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "is.environment(.GlobalEnv)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "new.env",
    "category": "環境と言語",
    "syntax": "new.env(hash = TRUE, parent = parent.frame(), size = 29L)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "new.env(parent = baseenv())",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "parent.env",
    "category": "環境と言語",
    "syntax": "parent.env(env)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "parent.env(x)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": ".BaseNamespaceEnv",
    "category": "環境と言語",
    "syntax": ".BaseNamespaceEnv(...)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": ".BaseNamespaceEnv(x)",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": ".GlobalEnv",
    "category": "環境と言語",
    "syntax": ".GlobalEnv(...)",
    "description": "環境の取得・設定・作成・判定を行います（new.env、parent.env、globalenv 等）。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": ".GlobalEnv",
    "caution": "環境オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "eval",
    "category": "環境と言語",
    "syntax": "eval(expr, envir = parent.frame(), enclos = if(is.list(envir) || is.pairlist(envir)) parent.frame() else baseenv())",
    "description": "式を指定した環境で評価します（eval／evalq／eval.parent／local）。【未対応の理由】言語オブジェクトと環境での評価に依存し、値モデルで忠実に再現できないため",
    "example": "eval(2 ^ 2 ^ 3)",
    "caution": "言語オブジェクトと環境での評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "eval.parent",
    "category": "環境と言語",
    "syntax": "eval.parent(expr, n = 1)",
    "description": "式を指定した環境で評価します（eval／evalq／eval.parent／local）。【未対応の理由】言語オブジェクトと環境での評価に依存し、値モデルで忠実に再現できないため",
    "example": "eval.parent(x)",
    "caution": "言語オブジェクトと環境での評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "evalq",
    "category": "環境と言語",
    "syntax": "evalq(expr, envir, enclos)",
    "description": "式を指定した環境で評価します（eval／evalq／eval.parent／local）。【未対応の理由】言語オブジェクトと環境での評価に依存し、値モデルで忠実に再現できないため",
    "example": "evalq(evalq(a+b+aa, list(a = 1)), list(b = 5))",
    "caution": "言語オブジェクトと環境での評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "local",
    "category": "環境と言語",
    "syntax": "local(expr, envir = new.env())",
    "description": "式を指定した環境で評価します（eval／evalq／eval.parent／local）。【未対応の理由】言語オブジェクトと環境での評価に依存し、値モデルで忠実に再現できないため",
    "example": "local()",
    "caution": "言語オブジェクトと環境での評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "exists",
    "category": "環境と言語",
    "syntax": "exists(x, where = -1, envir = , frame, mode = \"any\", inherits = TRUE)",
    "description": "名前のオブジェクトが定義されているかを返します。このモデルではシミュレータの変数・組み込み定数・関数名が対象です（監査で実 R と照合済み）。",
    "example": "exists(\"pi\")",
    "caution": "mode で種類（\"function\" 等）を絞れます。envir／where／frame 等の環境引数は未対応です。",
    "status": "supported"
  },
  {
    "name": "get0",
    "category": "環境と言語",
    "syntax": "get0(x, envir = pos.to.env(-1L), mode = \"any\", inherits = TRUE, ifnotfound = NULL)",
    "description": "名前（文字列）でオブジェクトを検索し、無ければ ifnotfound（既定は NULL）を返します。このモデルではシミュレータの変数と組み込み定数が対象です（監査で実 R と照合済み）。",
    "example": "get0(\"no.such\", ifnotfound = 0)",
    "caution": "関数名を指定した場合は関数オブジェクトを返せないため名指しで停止します。envir 等の環境引数は未対応です。",
    "status": "supported"
  },
  {
    "name": "expand.grid",
    "category": "データフレーム",
    "syntax": "expand.grid(..., KEEP.OUT.ATTRS = TRUE, stringsAsFactors = TRUE)",
    "description": "与えたベクトル・因子の全ての組み合わせを表すデータフレームを作成します。",
    "example": "expand.grid(x = c(1, 2), y = c(\"a\", \"b\"), stringsAsFactors = FALSE)",
    "caution": "第1引数が最も速く変化します。文字列は既定（stringsAsFactors=TRUE）で因子化される場合があります。このモデルでは文字列列は stringsAsFactors = FALSE のときのみ対応し、既定の因子化は名指しで停止します。",
    "status": "supported"
  },
  {
    "name": "as.expression",
    "category": "環境と言語",
    "syntax": "as.expression(x, ...)",
    "description": "未評価の式オブジェクト（expression）を作成・変換・判定します。【未対応の理由】言語オブジェクト（expression）に依存し、値モデルで忠実に再現できないため",
    "example": "as.expression(x)",
    "caution": "言語オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "expression",
    "category": "環境と言語",
    "syntax": "expression(...)",
    "description": "未評価の式オブジェクト（expression）を作成・変換・判定します。【未対応の理由】言語オブジェクト（expression）に依存し、値モデルで忠実に再現できないため",
    "example": "expression(1 + 0:9)",
    "caution": "言語オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "is.expression",
    "category": "環境と言語",
    "syntax": "is.expression(x)",
    "description": "未評価の式オブジェクト（expression）を作成・変換・判定します。【未対応の理由】言語オブジェクト（expression）に依存し、値モデルで忠実に再現できないため",
    "example": "is.expression(x)",
    "caution": "言語オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "getElement",
    "category": "添字",
    "syntax": "getElement(object, name)",
    "description": "ベクトル・行列・配列・リストの部分を抽出・置換する演算子（[ [[ $ と代入形）です。getElement は [[ の関数形です。",
    "example": "getElement(x)",
    "caution": "添字は1始まりです。$ は名前の部分一致を行います。drop=FALSE で次元の保持が変わります。",
    "status": "supported"
  },
  {
    "name": "$<-",
    "category": "添字",
    "syntax": "x[i] x[i, j, ... , drop = TRUE] x[[i, exact = TRUE]] x[[i, j, ..., exact = TRUE]] x$name getElement(object, name) x[i] <",
    "description": "ベクトル・行列・配列・リストの部分を抽出・置換する演算子（[ [[ $ と代入形）です。getElement は [[ の関数形です。",
    "example": "df$x <- 1",
    "caution": "添字は1始まりです。$ は名前の部分一致を行います。drop=FALSE で次元の保持が変わります。",
    "status": "supported"
  },
  {
    "name": "[.Dlist",
    "category": "添字",
    "syntax": "[.Dlist",
    "description": "ベクトル・行列・配列・リストの部分を抽出・置換する演算子（[ [[ $ と代入形）です。getElement は [[ の関数形です。（[.Dlist はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "添字は1始まりです。$ は名前の部分一致を行います。drop=FALSE で次元の保持が変わります。",
    "status": "unsupported"
  },
  {
    "name": "[.listof",
    "category": "添字",
    "syntax": "[.listof",
    "description": "ベクトル・行列・配列・リストの部分を抽出・置換する演算子（[ [[ $ と代入形）です。getElement は [[ の関数形です。（[.listof はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "添字は1始まりです。$ は名前の部分一致を行います。drop=FALSE で次元の保持が変わります。",
    "status": "unsupported"
  },
  {
    "name": "[.simple.list",
    "category": "添字",
    "syntax": "[.simple.list",
    "description": "ベクトル・行列・配列・リストの部分を抽出・置換する演算子（[ [[ $ と代入形）です。getElement は [[ の関数形です。（[.simple.list はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "添字は1始まりです。$ は名前の部分一致を行います。drop=FALSE で次元の保持が変わります。",
    "status": "unsupported"
  },
  {
    "name": "[<-",
    "category": "添字",
    "syntax": "x[i] x[i, j, ... , drop = TRUE] x[[i, exact = TRUE]] x[[i, j, ..., exact = TRUE]] x$name getElement(object, name) x[i] <",
    "description": "ベクトル・行列・配列・リストの部分を抽出・置換する演算子（[ [[ $ と代入形）です。getElement は [[ の関数形です。",
    "example": "x[1] <- x[1]",
    "caution": "添字は1始まりです。$ は名前の部分一致を行います。drop=FALSE で次元の保持が変わります。",
    "status": "supported"
  },
  {
    "name": "$<-.data.frame",
    "category": "添字",
    "syntax": "$<-.data.frame",
    "description": "データフレームに対する抽出・置換演算子（[ [[ $ のメソッド）です。（$<-.data.frame はそのクラス向けのメソッドです。）【未対応の理由】データフレームへのS3メソッド群であり、ディスパッチに依存するため",
    "example": "df$x <- 1",
    "caution": "データフレームへのS3ディスパッチとして実装されるメソッド群です。",
    "status": "unsupported"
  },
  {
    "name": "[.data.frame",
    "category": "添字",
    "syntax": "[.data.frame",
    "description": "データフレームに対する抽出・置換演算子（[ [[ $ のメソッド）です。（[.data.frame はそのクラス向けのメソッドです。）【未対応の理由】データフレームへのS3メソッド群であり、ディスパッチに依存するため",
    "example": "x[1]",
    "caution": "データフレームへのS3ディスパッチとして実装されるメソッド群です。",
    "status": "unsupported"
  },
  {
    "name": "[<-.data.frame",
    "category": "添字",
    "syntax": "[<-.data.frame",
    "description": "データフレームに対する抽出・置換演算子（[ [[ $ のメソッド）です。（[<-.data.frame はそのクラス向けのメソッドです。）【未対応の理由】データフレームへのS3メソッド群であり、ディスパッチに依存するため",
    "example": "x[1] <- x[1]",
    "caution": "データフレームへのS3ディスパッチとして実装されるメソッド群です。",
    "status": "unsupported"
  },
  {
    "name": "[[.data.frame",
    "category": "添字",
    "syntax": "[[.data.frame",
    "description": "データフレームに対する抽出・置換演算子（[ [[ $ のメソッド）です。（[[.data.frame はそのクラス向けのメソッドです。）【未対応の理由】データフレームへのS3メソッド群であり、ディスパッチに依存するため",
    "example": "x[[1]]",
    "caution": "データフレームへのS3ディスパッチとして実装されるメソッド群です。",
    "status": "unsupported"
  },
  {
    "name": "[.factor",
    "category": "添字",
    "syntax": "[.factor",
    "description": "因子に対する抽出・置換演算子（[ [[ のメソッド）です。（[.factor はそのクラス向けのメソッドです。）【未対応の理由】因子へのS3メソッドであり、ディスパッチに依存するため",
    "example": "x[1]",
    "caution": "因子へのS3メソッドであり、drop で未使用水準の除去ができます。",
    "status": "unsupported"
  },
  {
    "name": "[<-.factor",
    "category": "添字",
    "syntax": "[<-.factor",
    "description": "因子に対する抽出・置換演算子（[ [[ のメソッド）です。（[<-.factor はそのクラス向けのメソッドです。）【未対応の理由】因子へのS3メソッドであり、ディスパッチに依存するため",
    "example": "x[1] <- x[1]",
    "caution": "因子へのS3メソッドであり、drop で未使用水準の除去ができます。",
    "status": "unsupported"
  },
  {
    "name": "[[.factor",
    "category": "添字",
    "syntax": "[[.factor",
    "description": "因子に対する抽出・置換演算子（[ [[ のメソッド）です。（[[.factor はそのクラス向けのメソッドです。）【未対応の理由】因子へのS3メソッドであり、ディスパッチに依存するため",
    "example": "x[[1]]",
    "caution": "因子へのS3メソッドであり、drop で未使用水準の除去ができます。",
    "status": "unsupported"
  },
  {
    "name": "max",
    "category": "集計",
    "syntax": "max(..., na.rm = FALSE)",
    "description": "最大値・最小値を返します。pmax／pmin は複数ベクトルをリサイクルして要素ごとの最大・最小を返します。",
    "example": "max(c(-2, 3))",
    "caution": "引数が空の場合は警告と -Inf／Inf を返します。NA は na.rm=FALSE では伝播します。",
    "status": "supported"
  },
  {
    "name": "min",
    "category": "集計",
    "syntax": "min(..., na.rm = FALSE)",
    "description": "最大値・最小値を返します。pmax／pmin は複数ベクトルをリサイクルして要素ごとの最大・最小を返します。",
    "example": "min(5:1, 3)",
    "caution": "引数が空の場合は警告と -Inf／Inf を返します。NA は na.rm=FALSE では伝播します。",
    "status": "supported"
  },
  {
    "name": "pmax",
    "category": "集計",
    "syntax": "pmax(..., na.rm = FALSE)",
    "description": "最大値・最小値を返します。pmax／pmin は複数ベクトルをリサイクルして要素ごとの最大・最小を返します。",
    "example": "pmax(c(1, 5), c(2, 3))",
    "caution": "引数が空の場合は警告と -Inf／Inf を返します。NA は na.rm=FALSE では伝播します。",
    "status": "supported"
  },
  {
    "name": "pmax.int",
    "category": "集計",
    "syntax": "pmax.int(..., na.rm = FALSE)",
    "description": "最大値・最小値を返します。pmax／pmin は複数ベクトルをリサイクルして要素ごとの最大・最小を返します。",
    "example": "pmax.int(c(1, 5), c(2, 3))",
    "caution": "引数が空の場合は警告と -Inf／Inf を返します。NA は na.rm=FALSE では伝播します。",
    "status": "supported"
  },
  {
    "name": "pmin",
    "category": "集計",
    "syntax": "pmin(..., na.rm = FALSE)",
    "description": "最大値・最小値を返します。pmax／pmin は複数ベクトルをリサイクルして要素ごとの最大・最小を返します。",
    "example": "pmin(5:1, 3)",
    "caution": "引数が空の場合は警告と -Inf／Inf を返します。NA は na.rm=FALSE では伝播します。",
    "status": "supported"
  },
  {
    "name": "pmin.int",
    "category": "集計",
    "syntax": "pmin.int(..., na.rm = FALSE)",
    "description": "最大値・最小値を返します。pmax／pmin は複数ベクトルをリサイクルして要素ごとの最大・最小を返します。",
    "example": "pmin.int(c(1, 5), c(2, 3))",
    "caution": "引数が空の場合は警告と -Inf／Inf を返します。NA は na.rm=FALSE では伝播します。",
    "status": "supported"
  },
  {
    "name": "extSoftVersion",
    "category": "その他",
    "syntax": "extSoftVersion",
    "description": "R が使う第三者ソフトウェアのバージョンを報告します。【未対応の理由】実行環境の構成照会であり、値モデルで忠実に再現できないため",
    "example": "extSoftVersion()",
    "caution": "実行環境の構成に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": "addNA",
    "category": "因子",
    "syntax": "addNA(x, ifany = FALSE)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "addNA()",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "as.factor",
    "category": "因子",
    "syntax": "as.factor(x)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。（as.factor はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "as.factor(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "as.ordered",
    "category": "因子",
    "syntax": "as.ordered(x)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "as.ordered(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "c.factor",
    "category": "因子",
    "syntax": "c.factor(x, ...)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。（c.factor はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "c.factor(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "factor",
    "category": "因子",
    "syntax": "factor(x = character(), levels, labels = levels, exclude = NA, ordered = is.ordered(x), nmax = NA)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "factor(substring(\"statistics\", 1:10, 1:10), levels = letters)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "is.factor",
    "category": "因子",
    "syntax": "is.factor(x)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。",
    "example": "x <- c(1, 2)\nis.factor(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "supported"
  },
  {
    "name": "is.ordered",
    "category": "因子",
    "syntax": "is.ordered(x)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。",
    "example": "x <- c(1, 2)\nis.ordered(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "supported"
  },
  {
    "name": "Math.factor",
    "category": "因子",
    "syntax": "Math.factor(x, ...)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。（Math.factor はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "Math.factor(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "Ops.factor",
    "category": "因子",
    "syntax": "Ops.factor(x, ...)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。（Ops.factor はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "Ops.factor(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "Ops.ordered",
    "category": "因子",
    "syntax": "Ops.ordered(x, ...)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "Ops.ordered(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "ordered",
    "category": "因子",
    "syntax": "ordered(x)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "ordered(4:1)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "Summary.factor",
    "category": "因子",
    "syntax": "Summary.factor(x, ...)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。（Summary.factor はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": "Summary.factor(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "Summary.ordered",
    "category": "因子",
    "syntax": "Summary.ordered(x, ...)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "Summary.ordered(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": ".valid.factor",
    "category": "因子",
    "syntax": ".valid.factor(object)",
    "description": "ベクトルを因子（カテゴリ型）へ符号化します。ordered は順序付き因子を作ります。addNA は NA を水準化します。（.valid.factor はそのクラス向けのメソッドです。）【未対応の理由】S3メソッド（特定クラスへのディスパッチ）であり、任意クラスへのディスパッチを値モデルで忠実に再現できないため",
    "example": ".valid.factor(x)",
    "caution": "levels に無い値は NA になります。因子同士の演算は制限され、比較は順序付きでのみ可能です。",
    "status": "unsupported"
  },
  {
    "name": "file.access",
    "category": "ファイル",
    "syntax": "file.access(names, mode = 0)",
    "description": "ファイルシステム上のファイルのアクセス可否を調べます。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "file.access(dir(\".\"))",
    "caution": "実ファイルシステムに依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.choose",
    "category": "ファイル",
    "syntax": "file.choose(new = FALSE)",
    "description": "対話的にファイルを選択します。【未対応の理由】対話的ファイル選択UIに依存し、値モデルで忠実に再現できないため",
    "example": "file.choose(x)",
    "caution": "対話的UIに依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.info",
    "category": "ファイル",
    "syntax": "file.info(..., extra_cols = TRUE)",
    "description": "ファイルのサイズ・モード・更新時刻などの情報を抽出します。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "file.info(dir())",
    "caution": "実ファイルシステムに依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.mode",
    "category": "ファイル",
    "syntax": "file.mode(...)",
    "description": "ファイルのサイズ・モード・更新時刻などの情報を抽出します。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "file.mode(x)",
    "caution": "実ファイルシステムに依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.mtime",
    "category": "ファイル",
    "syntax": "file.mtime(...)",
    "description": "ファイルのサイズ・モード・更新時刻などの情報を抽出します。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "file.mtime(file.path(R.home(\"bin\"), c(\"\", file.path(c(\"\", \"exec\"), \"R\"))) )",
    "caution": "実ファイルシステムに依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.size",
    "category": "ファイル",
    "syntax": "file.size(...)",
    "description": "ファイルのサイズ・モード・更新時刻などの情報を抽出します。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "file.size(x)",
    "caution": "実ファイルシステムに依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.path",
    "category": "ファイル",
    "syntax": "file.path(..., fsep = .Platform$file.sep)",
    "description": "要素をパス区切りで連結してファイルパスを構築します。",
    "example": "x <- \"a\"\nfile.path(x)",
    "caution": "文字列操作であり、ファイルの実在は確認しません。区切りはプラットフォーム依存（fsep）です。",
    "status": "supported"
  },
  {
    "name": "file.show",
    "category": "ファイル",
    "syntax": "file.show(..., header = rep(\"\", nfiles), title = \"R Information\", delete.file = FALSE, pager = getOption(\"pager\"), encoding = \"\")",
    "description": "テキストファイルをページャで表示します。【未対応の理由】ページャ表示という外部出力に依存し、値モデルで忠実に再現できないため",
    "example": "file.show(file.path(R.home(\"doc\"), \"COPYRIGHTS\"))",
    "caution": "表示デバイス・ページャに依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.append",
    "category": "ファイル",
    "syntax": "file.append(file1, file2)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.append(\"A\", \"B\")",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.copy",
    "category": "ファイル",
    "syntax": "file.copy(from, to, overwrite = recursive, recursive = FALSE, copy.mode = TRUE, copy.date = FALSE)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.copy(\"A\", \"C\")",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.create",
    "category": "ファイル",
    "syntax": "file.create(..., showWarnings = TRUE)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.create(\"A\")",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.exists",
    "category": "ファイル",
    "syntax": "file.exists(...)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.exists(x)",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.link",
    "category": "ファイル",
    "syntax": "file.link(from, to)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.link(x)",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.remove",
    "category": "ファイル",
    "syntax": "file.remove(...)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.remove(\"A\")",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.rename",
    "category": "ファイル",
    "syntax": "file.rename(from, to)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.rename(x)",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "file.symlink",
    "category": "ファイル",
    "syntax": "file.symlink(from, to)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "file.symlink(file.path(\"..\", c(\"A\", \"B\")), \".\")",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "files",
    "category": "ファイル",
    "syntax": "files(...)",
    "description": "ファイルの作成・存在確認・削除・名前変更・追加・コピー・リンク作成を行います。【未対応の理由】実ファイルシステムへの副作用に依存し、値モデルで忠実に再現できないため",
    "example": "files(\"tmp\")",
    "caution": "実ファイルシステムへの副作用に依存します。",
    "status": "unsupported"
  },
  {
    "name": "dir.create",
    "category": "ファイル",
    "syntax": "dir.create(path, showWarnings = TRUE, recursive = FALSE, mode = \"0777\")",
    "description": "ディレクトリの作成・存在確認と、ファイル権限（chmod／umask）を扱います。【未対応の理由】実ファイルシステムとOS権限に依存し、値モデルで忠実に再現できないため",
    "example": "dir.create(x)",
    "caution": "実ファイルシステムとOSの権限モデルに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Sys.chmod",
    "category": "ファイル",
    "syntax": "Sys.chmod(paths, mode = \"0777\", use_umask = TRUE)",
    "description": "ディレクトリの作成・存在確認と、ファイル権限（chmod／umask）を扱います。【未対応の理由】実ファイルシステムとOS権限に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.chmod(list.dirs(\".\"), \"777\")",
    "caution": "実ファイルシステムとOSの権限モデルに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Sys.umask",
    "category": "ファイル",
    "syntax": "Sys.umask(mode = NA)",
    "description": "ディレクトリの作成・存在確認と、ファイル権限（chmod／umask）を扱います。【未対応の理由】実ファイルシステムとOS権限に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.umask(x)",
    "caution": "実ファイルシステムとOSの権限モデルに依存します。",
    "status": "unsupported"
  },
  {
    "name": "umask",
    "category": "ファイル",
    "syntax": "umask(mode = NA)",
    "description": "ディレクトリの作成・存在確認と、ファイル権限（chmod／umask）を扱います。【未対応の理由】実ファイルシステムとOS権限に依存し、値モデルで忠実に再現できないため",
    "example": "umask(x)",
    "caution": "実ファイルシステムとOSの権限モデルに依存します。",
    "status": "unsupported"
  },
  {
    "name": "find.package",
    "category": "環境と言語",
    "syntax": "find.package(package, lib.loc = NULL, quiet = FALSE, verbose = getOption(\"verbose\"))",
    "description": "インストール済みパッケージのパスを探します。【未対応の理由】パッケージライブラリの構成照会に依存し、値モデルで忠実に再現できないため",
    "example": "find.package(\"knitr\")",
    "caution": "パッケージライブラリという環境構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "packageNotFoundError",
    "category": "環境と言語",
    "syntax": "packageNotFoundError(package, lib.loc, call = NULL)",
    "description": "インストール済みパッケージのパスを探します。【未対応の理由】パッケージライブラリの構成照会に依存し、値モデルで忠実に再現できないため",
    "example": "packageNotFoundError(x)",
    "caution": "パッケージライブラリという環境構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "path.package",
    "category": "環境と言語",
    "syntax": "path.package(package, quiet = FALSE)",
    "description": "インストール済みパッケージのパスを探します。【未対応の理由】パッケージライブラリの構成照会に依存し、値モデルで忠実に再現できないため",
    "example": "path.package(x)",
    "caution": "パッケージライブラリという環境構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "findInterval",
    "category": "ベクトル",
    "syntax": "findInterval(x, vec, rightmost.closed = FALSE, all.inside = FALSE, left.open = FALSE, checkSorted = TRUE, checkNA = TRUE)",
    "description": "非減少ベクトル vec の区間のうち、各 x が属する区間の番号を返します。",
    "example": "x <- c(1.5, 3)\nv <- c(1, 2, 3)\nfindInterval(x, v)",
    "caution": "vec はソート済みが前提です。端の扱いは rightmost.closed／left.open 等で変わります。NA は原則 NA を返します。",
    "status": "supported"
  },
  {
    "name": "force",
    "category": "環境と言語",
    "syntax": "force(x)",
    "description": "関数引数の評価を強制します。【未対応の理由】約束（promise）の遅延評価に依存し、値モデルで忠実に再現できないため",
    "example": "force(y)",
    "caution": "約束（promise）の遅延評価に本質的に依存します。",
    "status": "unsupported"
  },
  {
    "name": "forceAndCall",
    "category": "環境と言語",
    "syntax": "forceAndCall(n, FUN, ...)",
    "description": "先頭 n 個の引数を強制評価してから関数を呼びます。【未対応の理由】約束（promise）と関数オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "forceAndCall(x)",
    "caution": "約束（promise）と関数オブジェクトに依存します。",
    "status": "unsupported"
  },
  {
    "name": "Foreign",
    "category": "その他",
    "syntax": "Foreign(...)",
    "description": "読み込み済みのコンパイル済みコード（C／Fortran）を呼び出します。【未対応の理由】外部コンパイル済みコードの呼び出しに依存し、値モデルで忠実に再現できないため",
    "example": "Foreign(x)",
    "caution": "外部ネイティブコードの呼び出しです。",
    "status": "unsupported"
  },
  {
    "name": ".C",
    "category": "その他",
    "syntax": ".C(.NAME, ..., NAOK = FALSE, DUP = TRUE, PACKAGE, ENCODING)",
    "description": "読み込み済みのコンパイル済みコード（C／Fortran）を呼び出します。【未対応の理由】外部コンパイル済みコードの呼び出しに依存し、値モデルで忠実に再現できないため",
    "example": ".C(x)",
    "caution": "外部ネイティブコードの呼び出しです。",
    "status": "unsupported"
  },
  {
    "name": ".Fortran",
    "category": "その他",
    "syntax": ".Fortran(.NAME, ..., NAOK = FALSE, DUP = TRUE, PACKAGE, ENCODING)",
    "description": "読み込み済みのコンパイル済みコード（C／Fortran）を呼び出します。【未対応の理由】外部コンパイル済みコードの呼び出しに依存し、値モデルで忠実に再現できないため",
    "example": ".Fortran(x)",
    "caution": "外部ネイティブコードの呼び出しです。",
    "status": "unsupported"
  },
  {
    "name": "formals",
    "category": "環境と言語",
    "syntax": "formals(fun = sys.function(sys.parent()), envir = parent.frame())",
    "description": "関数の仮引数リストを取得・設定します。【未対応の理由】関数オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "formals(lm)",
    "caution": "関数オブジェクトと言語オブジェクトに依存します。",
    "status": "unsupported"
  },
  {
    "name": "format",
    "category": "文字列",
    "syntax": "format(x, ...)",
    "description": "オブジェクトを表示用に整形し、共通書式の文字列へ変換します。【未対応の理由】S3ジェネリックであり任意クラスへのディスパッチに依存するため",
    "example": "format(1:10)",
    "caution": "S3ジェネリックであり、任意クラスへのメソッドディスパッチに依存します。",
    "status": "unsupported"
  },
  {
    "name": "format.info",
    "category": "文字列",
    "syntax": "format.info(x, digits = NULL, nsmall = 0)",
    "description": "format(x, digits, nsmall) がどのように整形するかの情報を返します。【未対応の理由】format の桁決定規則（有効桁・指数表記への切り替え）に依存する整形幅の計算であり、エンジンの値モデルで忠実に再現できないため",
    "example": "format.info(123)",
    "caution": "整形規則は数値表現の内部規則に依存します。",
    "status": "unsupported"
  },
  {
    "name": "format.pval",
    "category": "文字列",
    "syntax": "format.pval(pv, digits = max(1, getOption(\"digits\") - 2), eps = .Machine$double.eps, na.form = \"NA\", ...)",
    "description": "p値を表示用に整形します（小さな値は eps 未満として表示）。【未対応の理由】p値の表示整形（属性付き文字化）であり、エンジンの値モデルで忠実に再現できないため",
    "example": "format.pval(c(stats::runif(5), pi^-100, NA))",
    "caution": "digits の既定はオプション digits に依存します。",
    "status": "unsupported"
  },
  {
    "name": "formatC",
    "category": "文字列",
    "syntax": "formatC(x, digits = NULL, width = NULL, format = NULL, flag = \"\", mode = NULL, big.mark = \"\", big.interval = 3L, small.mark = \"\", small.interval = 5L, decimal.mark = getOption(\"OutDec\"), preserve.width = \"individual\", zero.print = NULL, replace.zero = TRUE, drop0trailing = FALSE)",
    "description": "C言語形式の書式で数値・文字列を整形します（formatC）。prettyNum は大きな数値へ桁区切り等を加えて整形します。",
    "example": "xx <- c(1.234, 5.6)\nformatC(xx)",
    "caution": "format の指定が無い場合の既定動作は mode に依存します。幅の保持は preserve.width で変わります。",
    "status": "supported"
  },
  {
    "name": "prettyNum",
    "category": "文字列",
    "syntax": "prettyNum(x, big.mark = \"\", big.interval = 3L, small.mark = \"\", small.interval = 5L, decimal.mark = getOption(\"OutDec\"), input.d.mark = decimal.mark, preserve.width = c(\"common\", \"individual\", \"none\"), zero.print = NULL, replace.zero = FALSE, drop0trailing = FALSE, is.cmplx = NA, ...)",
    "description": "C言語形式の書式で数値・文字列を整形します（formatC）。prettyNum は大きな数値へ桁区切り等を加えて整形します。",
    "example": "r <- c(1000, 2000)\nprettyNum(r, big.mark = \",\")",
    "caution": "format の指定が無い場合の既定動作は mode に依存します。幅の保持は preserve.width で変わります。",
    "status": "supported"
  },
  {
    "name": ".format.zeros",
    "category": "文字列",
    "syntax": ".format.zeros(x, zero.print, nx = suppressWarnings(as.numeric(x)), replace = FALSE, warn.non.fitting = TRUE)",
    "description": "C言語形式の書式で数値・文字列を整形します（formatC）。prettyNum は大きな数値へ桁区切り等を加えて整形します。【未対応の理由】ドット始まりの内部整形関数であり、共有パーサが受理せず到達できないため",
    "example": ".format.zeros(x)",
    "caution": "format の指定が無い場合の既定動作は mode に依存します。幅の保持は preserve.width で変わります。",
    "status": "unsupported"
  },
  {
    "name": "formatDL",
    "category": "文字列",
    "syntax": "formatDL(x, y, style = c(\"table\", \"list\"), width = 0.9 * getOption(\"width\"), indent = NULL)",
    "description": "項目と説明のベクトルを2列表または説明リスト形式に整形します。【未対応の理由】日付型（Date）の整形であり、日付値をエンジンの値モデルで表せないため",
    "example": "formatDL(unlist(.Machine))",
    "caution": "表示幅 width に依存して折り返しが変わります。",
    "status": "unsupported"
  },
  {
    "name": "function",
    "category": "環境と言語",
    "syntax": "function( arglist )",
    "description": "関数の定義（function／\\）と return です。【未対応の理由】関数オブジェクトの生成という言語機構であり、値として再現する対象ではないため",
    "example": "function(x) x",
    "caution": "言語構文であり、関数オブジェクトの生成そのものです。",
    "status": "unsupported"
  },
  {
    "name": "return",
    "category": "環境と言語",
    "syntax": "return(value)",
    "description": "関数の定義（function／\\）と return です。【未対応の理由】関数オブジェクトの生成という言語機構であり、値として再現する対象ではないため",
    "example": "return(x)",
    "caution": "言語構文であり、関数オブジェクトの生成そのものです。",
    "status": "unsupported"
  },
  {
    "name": "Filter",
    "category": "ベクトル",
    "syntax": "Filter(f, x)",
    "description": "関数型プログラミングの汎用高階関数です。Reduce は二項関数で畳み込み、Filter／Find／Position は述語で要素を探し、Map は各要素へ関数を適用し、Negate は述語を否定します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため",
    "example": "Filter(is.function, sapply(ls(baseenv()), get, baseenv()))",
    "caution": "Find／Position は見つからない場合に nomatch を返します。Map の結果は simplify されません（lapply と異なります）。",
    "status": "unsupported"
  },
  {
    "name": "Find",
    "category": "ベクトル",
    "syntax": "Find(f, x, right = FALSE, nomatch = NULL)",
    "description": "関数型プログラミングの汎用高階関数です。Reduce は二項関数で畳み込み、Filter／Find／Position は述語で要素を探し、Map は各要素へ関数を適用し、Negate は述語を否定します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため",
    "example": "Find(function(x) x > 2, 1:5)",
    "caution": "Find／Position は見つからない場合に nomatch を返します。Map の結果は simplify されません（lapply と異なります）。",
    "status": "unsupported"
  },
  {
    "name": "Map",
    "category": "ベクトル",
    "syntax": "Map(f, ...)",
    "description": "関数型プログラミングの汎用高階関数です。Reduce は二項関数で畳み込み、Filter／Find／Position は述語で要素を探し、Map は各要素へ関数を適用し、Negate は述語を否定します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため",
    "example": "Map()",
    "caution": "Find／Position は見つからない場合に nomatch を返します。Map の結果は simplify されません（lapply と異なります）。",
    "status": "unsupported"
  },
  {
    "name": "Negate",
    "category": "ベクトル",
    "syntax": "Negate(f)",
    "description": "関数型プログラミングの汎用高階関数です。Reduce は二項関数で畳み込み、Filter／Find／Position は述語で要素を探し、Map は各要素へ関数を適用し、Negate は述語を否定します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため",
    "example": "Negate(is.function)",
    "caution": "Find／Position は見つからない場合に nomatch を返します。Map の結果は simplify されません（lapply と異なります）。",
    "status": "unsupported"
  },
  {
    "name": "Position",
    "category": "ベクトル",
    "syntax": "Position(f, x, right = FALSE, nomatch = NA_integer_)",
    "description": "関数型プログラミングの汎用高階関数です。Reduce は二項関数で畳み込み、Filter／Find／Position は述語で要素を探し、Map は各要素へ関数を適用し、Negate は述語を否定します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため",
    "example": "Position(x)",
    "caution": "Find／Position は見つからない場合に nomatch を返します。Map の結果は simplify されません（lapply と異なります）。",
    "status": "unsupported"
  },
  {
    "name": "Reduce",
    "category": "ベクトル",
    "syntax": "Reduce(f, x, init, right = FALSE, accumulate = FALSE, simplify = TRUE)",
    "description": "関数型プログラミングの汎用高階関数です。Reduce は二項関数で畳み込み、Filter／Find／Position は述語で要素を探し、Map は各要素へ関数を適用し、Negate は述語を否定します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため",
    "example": "Reduce(`+`, x)",
    "caution": "Find／Position は見つからない場合に nomatch を返します。Map の結果は simplify されません（lapply と異なります）。",
    "status": "unsupported"
  },
  {
    "name": "gc",
    "category": "その他",
    "syntax": "gc(verbose = getOption(\"verbose\"), reset = FALSE, full = TRUE)",
    "description": "ガベージコレクションを明示的に実行し、メモリ使用量を報告します。gcinfo は自動GCの報告フラグを設定します。【未対応の理由】インタプリタのメモリ管理に依存し、値モデルで忠実に再現できないため",
    "example": "gc()",
    "caution": "インタプリタのメモリ管理に依存します。",
    "status": "unsupported"
  },
  {
    "name": "gcinfo",
    "category": "その他",
    "syntax": "gcinfo(verbose)",
    "description": "ガベージコレクションを明示的に実行し、メモリ使用量を報告します。gcinfo は自動GCの報告フラグを設定します。【未対応の理由】インタプリタのメモリ管理に依存し、値モデルで忠実に再現できないため",
    "example": "gcinfo(TRUE)",
    "caution": "インタプリタのメモリ管理に依存します。",
    "status": "unsupported"
  },
  {
    "name": "gc.time",
    "category": "その他",
    "syntax": "gc.time(on = TRUE)",
    "description": "GCタイミング有効化以降にガベージコレクションへ費やした時間を報告します。【未対応の理由】セッションの実行状態に依存し、値モデルで忠実に再現できないため",
    "example": "gc.time()",
    "caution": "セッションの実行状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "gctorture",
    "category": "その他",
    "syntax": "gctorture(on = TRUE)",
    "description": "ほぼ全てのメモリ割り当てでGCを発生させ、メモリ保護バグを探すための torture モードを切り替えます。【未対応の理由】インタプリタ内部のデバッグ機構であり、値モデルで忠実に再現できないため",
    "example": "gctorture(x)",
    "caution": "インタプリタ内部のデバッグ機構であり、実行が非常に遅くなります。",
    "status": "unsupported"
  },
  {
    "name": "gctorture2",
    "category": "その他",
    "syntax": "gctorture2(step, wait = step, inhibit_release = FALSE)",
    "description": "ほぼ全てのメモリ割り当てでGCを発生させ、メモリ保護バグを探すための torture モードを切り替えます。【未対応の理由】インタプリタ内部のデバッグ機構であり、値モデルで忠実に再現できないため",
    "example": "gctorture2(x)",
    "caution": "インタプリタ内部のデバッグ機構であり、実行が非常に遅くなります。",
    "status": "unsupported"
  },
  {
    "name": "dynGet",
    "category": "環境と言語",
    "syntax": "dynGet(x, ifnotfound = , minframe = 1L, inherits = FALSE)",
    "description": "名前でオブジェクトを検索して返します。mget は複数名を、dynGet は呼び出しフレーム方向を検索します。【未対応の理由】環境と検索パスでの名前解決に依存し、値モデルで忠実に再現できないため",
    "example": "dynGet(x)",
    "caution": "環境と検索パスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "get",
    "category": "環境と言語",
    "syntax": "get(x, pos = -1, envir = as.environment(pos), mode = \"any\", inherits = TRUE)",
    "description": "名前（文字列）でオブジェクトを検索して返します。このモデルではシミュレータの変数と組み込み定数（pi／letters 等）が対象です（監査で実 R と照合済み）。",
    "example": "get(\"pi\")",
    "caution": "関数名を指定した場合は関数オブジェクトを返せないため名指しで停止します。envir／pos 等の環境引数は未対応です。",
    "status": "supported"
  },
  {
    "name": "mget",
    "category": "環境と言語",
    "syntax": "mget(x, envir = as.environment(pos), mode = \"any\", ifnotfound, inherits = FALSE, pos = -1)",
    "description": "名前でオブジェクトを検索して返します。mget は複数名を、dynGet は呼び出しフレーム方向を検索します。【未対応の理由】環境と検索パスでの名前解決に依存し、値モデルで忠実に再現できないため",
    "example": "mget(c(\"x\", \"y\"), envir = e)",
    "caution": "環境と検索パスに依存します。",
    "status": "unsupported"
  },
  {
    "name": "getDLLRegisteredRoutines",
    "category": "その他",
    "syntax": "getDLLRegisteredRoutines(dll, addNames = TRUE)",
    "description": "DLLに登録されたネイティブルーチンの情報を照会します。【未対応の理由】外部ネイティブコードに依存し、値モデルで忠実に再現できないため",
    "example": "getDLLRegisteredRoutines(dlls[[\"base\"]])",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.NativeRoutineList",
    "category": "その他",
    "syntax": "print.NativeRoutineList(x, ...)",
    "description": "DLLに登録されたネイティブルーチンの情報を照会します。【未対応の理由】外部ネイティブコードに依存し、値モデルで忠実に再現できないため",
    "example": "print.NativeRoutineList(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "DLLInfo",
    "category": "その他",
    "syntax": "DLLInfo",
    "description": "現在のセッションに読み込まれている全DLLの一覧を取得します。【未対応の理由】セッションのDLL読み込み状態に依存し、値モデルで忠実に再現できないため",
    "example": "DLLInfoList",
    "caution": "セッションの動的読み込み状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "DLLInfoList",
    "category": "その他",
    "syntax": "DLLInfoList",
    "description": "現在のセッションに読み込まれている全DLLの一覧を取得します。【未対応の理由】セッションのDLL読み込み状態に依存し、値モデルで忠実に再現できないため",
    "example": "DLLInfoList",
    "caution": "セッションの動的読み込み状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "getLoadedDLLs",
    "category": "その他",
    "syntax": "getLoadedDLLs",
    "description": "現在のセッションに読み込まれている全DLLの一覧を取得します。【未対応の理由】セッションのDLL読み込み状態に依存し、値モデルで忠実に再現できないため",
    "example": "getLoadedDLLs()",
    "caution": "セッションの動的読み込み状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.DLLInfo",
    "category": "その他",
    "syntax": "print.DLLInfo(x, ...)",
    "description": "現在のセッションに読み込まれている全DLLの一覧を取得します。【未対応の理由】セッションのDLL読み込み状態に依存し、値モデルで忠実に再現できないため",
    "example": "print.DLLInfo(x)",
    "caution": "セッションの動的読み込み状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "$.DLLInfo",
    "category": "その他",
    "syntax": "$.DLLInfo",
    "description": "現在のセッションに読み込まれている全DLLの一覧を取得します。【未対応の理由】セッションのDLL読み込み状態に依存し、値モデルで忠実に再現できないため",
    "example": "info$path",
    "caution": "セッションの動的読み込み状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "[.DLLInfoList",
    "category": "その他",
    "syntax": "[.DLLInfoList",
    "description": "現在のセッションに読み込まれている全DLLの一覧を取得します。（[.DLLInfoList はそのクラス向けのメソッドです。）【未対応の理由】セッションのDLL読み込み状態に依存し、値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "セッションの動的読み込み状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "getNativeSymbolInfo",
    "category": "その他",
    "syntax": "getNativeSymbolInfo(name, PACKAGE, unlist = TRUE, withRegistrationInfo = FALSE)",
    "description": "動的読み込みされたネイティブシンボル（C／Fortran）の説明を取得します。【未対応の理由】外部ネイティブコードに依存し、値モデルで忠実に再現できないため",
    "example": "getNativeSymbolInfo(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "NativeSymbol",
    "category": "その他",
    "syntax": "NativeSymbol(...)",
    "description": "動的読み込みされたネイティブシンボル（C／Fortran）の説明を取得します。【未対応の理由】外部ネイティブコードに依存し、値モデルで忠実に再現できないため",
    "example": "NativeSymbol(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "NativeSymbolInfo",
    "category": "その他",
    "syntax": "NativeSymbolInfo(name, PACKAGE, unlist = TRUE, withRegistrationInfo = FALSE)",
    "description": "動的読み込みされたネイティブシンボル（C／Fortran）の説明を取得します。【未対応の理由】外部ネイティブコードに依存し、値モデルで忠実に再現できないため",
    "example": "NativeSymbolInfo(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "RegisteredNativeSymbol",
    "category": "その他",
    "syntax": "RegisteredNativeSymbol(...)",
    "description": "動的読み込みされたネイティブシンボル（C／Fortran）の説明を取得します。【未対応の理由】外部ネイティブコードに依存し、値モデルで忠実に再現できないため",
    "example": "RegisteredNativeSymbol(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "bindtextdomain",
    "category": "その他",
    "syntax": "bindtextdomain(domain, dirname = NULL)",
    "description": "メッセージの翻訳（NLS）のための低水準関数です。gettext は翻訳済み文字列を、ngettext は単数・複数形を返します。【未対応の理由】翻訳カタログとロケール環境に依存し、値モデルで忠実に再現できないため",
    "example": "bindtextdomain(\"R\")",
    "caution": "翻訳カタログとロケールという環境構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "gettext",
    "category": "その他",
    "syntax": "gettext(..., domain = NULL, trim = TRUE)",
    "description": "メッセージの翻訳（NLS）のための低水準関数です。gettext は翻訳済み文字列を、ngettext は単数・複数形を返します。【未対応の理由】翻訳カタログとロケール環境に依存し、値モデルで忠実に再現できないため",
    "example": "gettext(n, \"%d variable has missing values\", \"%d variables have missing values\")",
    "caution": "翻訳カタログとロケールという環境構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "ngettext",
    "category": "その他",
    "syntax": "ngettext(n, msg1, msg2, domain = NULL)",
    "description": "メッセージの翻訳（NLS）のための低水準関数です。gettext は翻訳済み文字列を、ngettext は単数・複数形を返します。【未対応の理由】翻訳カタログとロケール環境に依存し、値モデルで忠実に再現できないため",
    "example": "ngettext(n, \"%d variable has missing values\", \"%d variables have missing values\")",
    "caution": "翻訳カタログとロケールという環境構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "Sys.setLanguage",
    "category": "その他",
    "syntax": "Sys.setLanguage(lang, unset = \"en\")",
    "description": "メッセージの翻訳（NLS）のための低水準関数です。gettext は翻訳済み文字列を、ngettext は単数・複数形を返します。【未対応の理由】翻訳カタログとロケール環境に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.setLanguage()",
    "caution": "翻訳カタログとロケールという環境構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "getwd",
    "category": "ファイル",
    "syntax": "getwd()",
    "description": "作業ディレクトリの取得（getwd）と設定（setwd）を行います。【未対応の理由】プロセスの作業ディレクトリという状態に依存し、値モデルで忠実に再現できないため",
    "example": "getwd()",
    "caution": "プロセスのファイルシステム状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "setwd",
    "category": "ファイル",
    "syntax": "setwd(dir)",
    "description": "作業ディレクトリの取得（getwd）と設定（setwd）を行います。【未対応の理由】プロセスの作業ディレクトリという状態に依存し、値モデルで忠実に再現できないため",
    "example": "setwd(WD)",
    "caution": "プロセスのファイルシステム状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "gl",
    "category": "因子",
    "syntax": "gl(n, k, length = n*k, labels = seq_len(n), ordered = FALSE)",
    "description": "水準のパターンを指定して因子を生成します。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "gl(2, 8, labels = c(\"Control\", \"Treat\"))",
    "caution": "n（水準数）と k（各水準の繰り返し）から長さが決まります。",
    "status": "unsupported"
  },
  {
    "name": "gregexec",
    "category": "文字列",
    "syntax": "gregexec(pattern, text, ignore.case = FALSE, perl = FALSE, fixed = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。【未対応の理由】マッチ位置・長さの属性（match.length 等）付きの結果をエンジンの値モデルで表せないため",
    "example": "gregexec()",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "unsupported"
  },
  {
    "name": "gregexpr",
    "category": "文字列",
    "syntax": "gregexpr(pattern, text, ignore.case = FALSE, perl = FALSE, fixed = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。【未対応の理由】マッチ位置・長さの属性（match.length 等）付きの結果をエンジンの値モデルで表せないため",
    "example": "gregexpr(\"e\", txt)",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "unsupported"
  },
  {
    "name": "grep",
    "category": "文字列",
    "syntax": "grep(pattern, x, ignore.case = FALSE, perl = FALSE, value = FALSE, fixed = FALSE, useBytes = FALSE, invert = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。",
    "example": "letters <- c(\"a\", \"B\", \"c\")\ngrep(\"[a-z]\", letters)",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "supported"
  },
  {
    "name": "grepl",
    "category": "文字列",
    "syntax": "grepl(pattern, x, ignore.case = FALSE, perl = FALSE, fixed = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。",
    "example": "grepl(\"a\", c(\"a\", \"b\"))",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "supported"
  },
  {
    "name": "grepv",
    "category": "文字列",
    "syntax": "grepv(pattern, x, ignore.case = FALSE, perl = FALSE, value = TRUE, fixed = FALSE, useBytes = FALSE, invert = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。",
    "example": "grepv(x)",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "supported"
  },
  {
    "name": "gsub",
    "category": "文字列",
    "syntax": "gsub(pattern, replacement, x, ignore.case = FALSE, perl = FALSE, fixed = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。",
    "example": "gsub(\"([ab])\", \"\\\\1_\\\\1_\", \"abc and ABC\")",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "supported"
  },
  {
    "name": "regexec",
    "category": "文字列",
    "syntax": "regexec(pattern, text, ignore.case = FALSE, perl = FALSE, fixed = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。【未対応の理由】マッチ位置・長さの属性（match.length 等）付きの結果をエンジンの値モデルで表せないため",
    "example": "regexec(\"^(([^:]+)://)?([^:/]+)(:([0-9]+))?(/.*)\", x)",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "unsupported"
  },
  {
    "name": "regexpr",
    "category": "文字列",
    "syntax": "regexpr(pattern, text, ignore.case = FALSE, perl = FALSE, fixed = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。【未対応の理由】マッチ位置・長さの属性（match.length 等）付きの結果をエンジンの値モデルで表せないため",
    "example": "regexpr(\"en\", txt)",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "unsupported"
  },
  {
    "name": "sub",
    "category": "文字列",
    "syntax": "sub(pattern, replacement, x, ignore.case = FALSE, perl = FALSE, fixed = FALSE, useBytes = FALSE)",
    "description": "文字列ベクトルの各要素に対して正規表現パターンのマッチング（grep／grepl／grepv）、マッチ位置の取得（regexpr／gregexpr／regexec／gregexec）、置換（sub／gsub）を行います。",
    "example": "sub(\"([ab])\", \"\\\\1_\\\\1_\", \"abc and ABC\")",
    "caution": "sub は最初のマッチのみ、gsub は全マッチを置換します。perl=TRUE で正規表現エンジンが変わります。マッチしなかった要素の regexpr は -1 です。",
    "status": "supported"
  },
  {
    "name": "grepRaw",
    "category": "文字列",
    "syntax": "grepRaw(pattern, x, offset = 1L, ignore.case = FALSE, value = FALSE, fixed = FALSE, all = FALSE, invert = FALSE)",
    "description": "raw ベクトル内の部分文字列パターンを検索します。【未対応の理由】raw型を値モデルが扱わないため",
    "example": "grepRaw(\"no match\", \"textText\")",
    "caution": "raw型をこのモデルは扱いません。",
    "status": "unsupported"
  },
  {
    "name": "grouping",
    "category": "ベクトル",
    "syntax": "grouping(...)",
    "description": "同一の値が隣接するよう引数を並べ替える順列を、グループ分割の属性付きで返します。【未対応の理由】返り値が grouping クラスの属性付き順列であり、属性とクラスをエンジンの値モデルで表せないため",
    "example": "grouping(x <- c(1, 1, 3:1, 1:4, 3), y <- c(9, 9:1), z <- c(2, 1:9))",
    "caution": "返り値は順列そのものであり、並べ替え済みの値ではありません。属性にグループ情報を持ちます。",
    "status": "unsupported"
  },
  {
    "name": "gzcon",
    "category": "入出力",
    "syntax": "gzcon(con, level = 6, allowNonCompressed = TRUE, text = FALSE)",
    "description": "既存の接続を包み、読み取りの展開・書き込みの圧縮を行う接続を返します。【未対応の理由】接続（connection）に依存し、値モデルで忠実に再現できないため",
    "example": "gzcon(url(\"https://www.stats.ox.ac.uk/pub/datasets/csb/ch12.dat.gz\"))",
    "caution": "接続（connection）に依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.character.hexmode",
    "category": "その他",
    "syntax": "as.character.hexmode(x, ...)",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。（as.character.hexmode はそのクラス向けのメソッドです。）【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.character.hexmode(x)",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "as.hexmode",
    "category": "その他",
    "syntax": "as.hexmode(x)",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。（as.hexmode はそのクラス向けのメソッドです。）【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.hexmode(\"7fffffff\")",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "format.hexmode",
    "category": "その他",
    "syntax": "format.hexmode(x, ...)",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。（format.hexmode はそのクラス向けのメソッドです。）【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "format.hexmode(x)",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "hexmode",
    "category": "その他",
    "syntax": "hexmode(x)",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "hexmode(\"7fffffff\")",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "print.hexmode",
    "category": "その他",
    "syntax": "print.hexmode(x, ...)",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。（print.hexmode はそのクラス向けのメソッドです。）【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "print.hexmode(x)",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "!.hexmode",
    "category": "その他",
    "syntax": "!.hexmode",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。（!.hexmode はそのクラス向けのメソッドです。）【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "!.hexmode",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "&.hexmode",
    "category": "その他",
    "syntax": "&.hexmode",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。（&.hexmode はそのクラス向けのメソッドです。）【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.hexmode(\"a\") & as.hexmode(\"b\")",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "[.hexmode",
    "category": "その他",
    "syntax": "[.hexmode",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。（[.hexmode はそのクラス向けのメソッドです。）【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "x[1]",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "|.hexmode",
    "category": "その他",
    "syntax": "|.hexmode",
    "description": "整数を16進数で表示する hexmode クラスのオブジェクトを作成・操作します。【未対応の理由】hexmodeクラスとS3メソッド群に依存し、値モデルで忠実に再現できないため",
    "example": "as.hexmode(\"a\") | as.hexmode(\"b\")",
    "caution": "hexmodeクラスとそのS3メソッド群に依存します。",
    "status": "unsupported"
  },
  {
    "name": "acosh",
    "category": "数学",
    "syntax": "acosh(x)",
    "description": "双曲線関数（cosh／sinh／tanh）とその逆関数（acosh／asinh／atanh）を計算します。",
    "example": "x <- 2\nacosh(x)",
    "caution": "定義域外（例：atanh(1)）では Inf や NaN になることがあります。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "asinh",
    "category": "数学",
    "syntax": "asinh(x)",
    "description": "双曲線関数（cosh／sinh／tanh）とその逆関数（acosh／asinh／atanh）を計算します。",
    "example": "x <- 1\nasinh(x)",
    "caution": "定義域外（例：atanh(1)）では Inf や NaN になることがあります。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "atanh",
    "category": "数学",
    "syntax": "atanh(x)",
    "description": "双曲線関数（cosh／sinh／tanh）とその逆関数（acosh／asinh／atanh）を計算します。",
    "example": "x <- 0.5\natanh(x)",
    "caution": "定義域外（例：atanh(1)）では Inf や NaN になることがあります。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "cosh",
    "category": "数学",
    "syntax": "cosh(x)",
    "description": "双曲線関数（cosh／sinh／tanh）とその逆関数（acosh／asinh／atanh）を計算します。",
    "example": "x <- 1\ncosh(x)",
    "caution": "定義域外（例：atanh(1)）では Inf や NaN になることがあります。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "sinh",
    "category": "数学",
    "syntax": "sinh(x)",
    "description": "双曲線関数（cosh／sinh／tanh）とその逆関数（acosh／asinh／atanh）を計算します。",
    "example": "x <- 1\nsinh(x)",
    "caution": "定義域外（例：atanh(1)）では Inf や NaN になることがあります。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "tanh",
    "category": "数学",
    "syntax": "tanh(x)",
    "description": "双曲線関数（cosh／sinh／tanh）とその逆関数（acosh／asinh／atanh）を計算します。",
    "example": "x <- 1\ntanh(x)",
    "caution": "定義域外（例：atanh(1)）では Inf や NaN になることがあります。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "iconv",
    "category": "文字列",
    "syntax": "iconv(x, from = \"\", to = \"\", sub = NA, mark = TRUE, toRaw = FALSE)",
    "description": "文字列ベクトルをエンコーディング間で変換します。iconvlist は利用可能なエンコーディング名を返します。【未対応の理由】システムのエンコーディング変換実装に依存し、値モデルで忠実に再現できないため",
    "example": "iconv(\"abc\", from = \"UTF-8\", to = \"UTF-8\")",
    "caution": "変換できない文字は sub の指定（既定 NA）になります。システムの iconv 実装に依存します。",
    "status": "unsupported"
  },
  {
    "name": "iconvlist",
    "category": "文字列",
    "syntax": "iconvlist()",
    "description": "文字列ベクトルをエンコーディング間で変換します。iconvlist は利用可能なエンコーディング名を返します。【未対応の理由】システムのエンコーディング変換実装に依存し、値モデルで忠実に再現できないため",
    "example": "iconvlist()",
    "caution": "変換できない文字は sub の指定（既定 NA）になります。システムの iconv 実装に依存します。",
    "status": "unsupported"
  },
  {
    "name": "icuGetCollate",
    "category": "文字列",
    "syntax": "icuGetCollate(type = c(\"actual\", \"valid\"))",
    "description": "ICUによる照合（collation）の設定を制御・取得します。【未対応の理由】ICUとロケール環境に依存し、値モデルで忠実に再現できないため",
    "example": "icuGetCollate()",
    "caution": "ICUはビルド任意要素であり、ロケール環境に依存します。",
    "status": "unsupported"
  },
  {
    "name": "icuSetCollate",
    "category": "文字列",
    "syntax": "icuSetCollate(...)",
    "description": "ICUによる照合（collation）の設定を制御・取得します。【未対応の理由】ICUとロケール環境に依存し、値モデルで忠実に再現できないため",
    "example": "icuSetCollate(case_first = \"upper\")",
    "caution": "ICUはビルド任意要素であり、ロケール環境に依存します。",
    "status": "unsupported"
  },
  {
    "name": "identical",
    "category": "その他",
    "syntax": "identical(x, y, num.eq = TRUE, single.NA = TRUE, attrib.as.set = TRUE, ignore.bytecode = TRUE, ignore.environment = FALSE, ignore.srcref = TRUE, extptr.as.ref = FALSE)",
    "description": "2つのオブジェクトが厳密に等しいかを TRUE／FALSE で返します。【未対応の理由】環境・外部ポインタを含むオブジェクト同一性判定に依存し、値モデルで忠実に再現できないため",
    "example": "identical(1, NULL)",
    "caution": "環境や外部ポインタの同一性判定を含み、属性の扱いは引数で変わります。数値の近似比較ではありません。",
    "status": "unsupported"
  },
  {
    "name": "identity",
    "category": "ベクトル",
    "syntax": "identity(x)",
    "description": "引数をそのまま返す恒等関数です。",
    "example": "x <- c(1, 2)\nidentity(x)",
    "caution": "変換は一切行われません。",
    "status": "supported"
  },
  {
    "name": "ifelse",
    "category": "ベクトル",
    "syntax": "ifelse(test, yes, no)",
    "description": "test の要素ごとに、TRUE なら yes、FALSE なら no の要素を選んだベクトルを返します。",
    "example": "x <- c(1, -1)\nifelse(x >= 0, x, NA)",
    "caution": "test が NA の位置は NA になります。yes／no はリサイクルされますが、型・属性は test 由来で制限され、日付等のクラスは保持されません。",
    "status": "supported"
  },
  {
    "name": "as.integer",
    "category": "型変換",
    "syntax": "as.integer(x, ...)",
    "description": "integer（整数）型ベクトルを作成・変換・判定します。",
    "example": "as.integer()",
    "caution": "実数から変換すると0方向へ切り捨てられます。範囲外は NA と警告になります。",
    "status": "supported"
  },
  {
    "name": "integer",
    "category": "型変換",
    "syntax": "integer(length = 0)",
    "description": "integer（整数）型ベクトルを作成・変換・判定します。",
    "example": "integer()",
    "caution": "実数から変換すると0方向へ切り捨てられます。範囲外は NA と警告になります。",
    "status": "supported"
  },
  {
    "name": "is.integer",
    "category": "型変換",
    "syntax": "is.integer(x)",
    "description": "integer（整数）型ベクトルを作成・変換・判定します。",
    "example": "is.integer(1)",
    "caution": "実数から変換すると0方向へ切り捨てられます。範囲外は NA と警告になります。",
    "status": "supported"
  },
  {
    "name": "interaction",
    "category": "因子",
    "syntax": "interaction(..., drop = FALSE, sep = \".\", lex.order = FALSE)",
    "description": "複数の因子の交互作用を表す因子を計算します。結果は常に順序なし因子です。【未対応の理由】因子（水準付きカテゴリ値）をエンジンの値モデルで表せないため",
    "example": "interaction(a, b)",
    "caution": "水準の組み合わせの順序は lex.order で変わります。drop=TRUE で現れない組み合わせを除きます。",
    "status": "unsupported"
  },
  {
    "name": "interactive",
    "category": "その他",
    "syntax": "interactive",
    "description": "R が対話的に実行されているかを返します。【未対応の理由】セッションの実行形態に依存し、値モデルで忠実に再現できないため",
    "example": "interactive()",
    "caution": "セッションの実行形態に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": ".Internal",
    "category": "その他",
    "syntax": ".Internal(call)",
    "description": "インタプリタ組み込みの内部コードを呼び出します。【未対応の理由】インタプリタ内部コードの呼び出しであり、値モデルで忠実に再現できないため",
    "example": ".Internal(x)",
    "caution": "R開発者向けの内部機構です。",
    "status": "unsupported"
  },
  {
    "name": "invisible",
    "category": "入出力",
    "syntax": "invisible(x = NULL)",
    "description": "オブジェクトの不可視コピーを返します（自動表示されなくなります）。【未対応の理由】不可視性という表示機構に依存し、値モデルで忠実に再現できないため",
    "example": "invisible(x)",
    "caution": "「不可視」は表示機構に依存する性質です。",
    "status": "unsupported"
  },
  {
    "name": "is.finite",
    "category": "数学",
    "syntax": "is.finite(x)",
    "description": "要素が有限か（is.finite）、無限か（is.infinite）、NaNか（is.nan）を要素ごとに判定します。Inf／NaN は無限大と非数です。",
    "example": "x <- c(1, Inf)\nis.finite(x)",
    "caution": "is.finite は NA・NaN・Inf のいずれでも FALSE です。is.na(NaN) は TRUE ですが is.nan(NA) は FALSE です。",
    "status": "supported"
  },
  {
    "name": "is.infinite",
    "category": "数学",
    "syntax": "is.infinite(x)",
    "description": "要素が有限か（is.finite）、無限か（is.infinite）、NaNか（is.nan）を要素ごとに判定します。Inf／NaN は無限大と非数です。",
    "example": "x <- c(1, Inf)\nis.infinite(x)",
    "caution": "is.finite は NA・NaN・Inf のいずれでも FALSE です。is.na(NaN) は TRUE ですが is.nan(NA) は FALSE です。",
    "status": "supported"
  },
  {
    "name": "is.nan",
    "category": "数学",
    "syntax": "is.nan(x)",
    "description": "要素が有限か（is.finite）、無限か（is.infinite）、NaNか（is.nan）を要素ごとに判定します。Inf／NaN は無限大と非数です。",
    "example": "x <- c(1, NaN)\nis.nan(x)",
    "caution": "is.finite は NA・NaN・Inf のいずれでも FALSE です。is.na(NaN) は TRUE ですが is.nan(NA) は FALSE です。",
    "status": "supported"
  },
  {
    "name": "is.function",
    "category": "型変換",
    "syntax": "is.function(x)",
    "description": "オブジェクトが関数か（is.function）、プリミティブ関数か（is.primitive）を判定します。【未対応の理由】関数オブジェクトの判定に依存し、値モデルで忠実に再現できないため",
    "example": "is.function(1)",
    "caution": "関数オブジェクトの判定であり、値の計算ではありません。",
    "status": "unsupported"
  },
  {
    "name": "is.primitive",
    "category": "型変換",
    "syntax": "is.primitive(x)",
    "description": "オブジェクトが関数か（is.function）、プリミティブ関数か（is.primitive）を判定します。【未対応の理由】関数オブジェクトの判定に依存し、値モデルで忠実に再現できないため",
    "example": "is.primitive(sum)",
    "caution": "関数オブジェクトの判定であり、値の計算ではありません。",
    "status": "unsupported"
  },
  {
    "name": "is.language",
    "category": "環境と言語",
    "syntax": "is.language(x)",
    "description": "オブジェクトが言語オブジェクト（名前・呼び出し・式）かを判定します。【未対応の理由】言語オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "is.language(quote(x))",
    "caution": "言語オブジェクトそのものを扱います。",
    "status": "unsupported"
  },
  {
    "name": "is.object",
    "category": "その他",
    "syntax": "is.object(x)",
    "description": "オブジェクトに内部の OBJECT ビット（クラス属性）が立っているかを返します。【未対応の理由】インタプリタ内部表現（OBJECTビット）に依存し、値モデルで忠実に再現できないため",
    "example": "is.object(1)",
    "caution": "インタプリタ内部表現に依存する判定です。",
    "status": "unsupported"
  },
  {
    "name": "is.atomic",
    "category": "型変換",
    "syntax": "is.atomic(x)",
    "description": "オブジェクトが原子型か（is.atomic）、再帰的（リスト状）構造か（is.recursive）を判定します。",
    "example": "x <- c(1, 2)\nis.atomic(x)",
    "caution": "is.atomic(NULL) は FALSE です（R 4.4以降）。環境も再帰的とみなされます。",
    "status": "supported"
  },
  {
    "name": "is.recursive",
    "category": "型変換",
    "syntax": "is.recursive(x)",
    "description": "オブジェクトが原子型か（is.atomic）、再帰的（リスト状）構造か（is.recursive）を判定します。",
    "example": "x <- c(1, 2)\nis.recursive(x)",
    "caution": "is.atomic(NULL) は FALSE です（R 4.4以降）。環境も再帰的とみなされます。",
    "status": "supported"
  },
  {
    "name": "is.single",
    "category": "型変換",
    "syntax": "is.single(x)",
    "description": "単精度型かを報告します。R には単精度値が存在しないため、実際にはエラーになります。【未対応の理由】Rに単精度型が存在せずエラー専用であり、値として再現する対象ではないため",
    "example": "is.single(x)",
    "caution": "呼び出すとエラーになる仕様です。",
    "status": "unsupported"
  },
  {
    "name": "is.unsorted",
    "category": "ベクトル",
    "syntax": "is.unsorted(x, na.rm = FALSE, strictly = FALSE)",
    "description": "オブジェクトが（増加順に）ソートされていないかを、実際にソートせずに判定します。",
    "example": "x <- c(3, 1, 2)\nis.unsorted(x)",
    "caution": "NA の扱いは na.rm で変わります。strictly=TRUE は厳密な増加を要求します。",
    "status": "supported"
  },
  {
    "name": "ISOdate",
    "category": "日付と時刻",
    "syntax": "ISOdate(year, month, day, hour = 12, min = 0, sec = 0, tz = \"GMT\")",
    "description": "数値表現（年月日時分秒）から日時を作成する便利関数です。ISOdate は正午を既定とします。【未対応の理由】POSIXctクラスとタイムゾーンに依存し、値モデルで忠実に再現できないため",
    "example": "ISOdate(x)",
    "caution": "POSIXctクラスを返し、タイムゾーン tz に依存します。",
    "status": "unsupported"
  },
  {
    "name": "ISOdatetime",
    "category": "日付と時刻",
    "syntax": "ISOdatetime(year, month, day, hour, min, sec, tz = \"\")",
    "description": "数値表現（年月日時分秒）から日時を作成する便利関数です。ISOdate は正午を既定とします。【未対応の理由】POSIXctクラスとタイムゾーンに依存し、値モデルで忠実に再現できないため",
    "example": "ISOdatetime(x)",
    "caution": "POSIXctクラスを返し、タイムゾーン tz に依存します。",
    "status": "unsupported"
  },
  {
    "name": "asS3",
    "category": "その他",
    "syntax": "asS3(object, flag = TRUE, complete = TRUE)",
    "description": "オブジェクトがS4クラスのインスタンスかを判定し、S4／S3表現へ変換します。【未対応の理由】S4クラス機構に依存し、値モデルで忠実に再現できないため",
    "example": "asS3(x)",
    "caution": "S4クラス機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": "asS4",
    "category": "その他",
    "syntax": "asS4(object, flag = TRUE, complete = TRUE)",
    "description": "オブジェクトがS4クラスのインスタンスかを判定し、S4／S3表現へ変換します。【未対応の理由】S4クラス機構に依存し、値モデルで忠実に再現できないため",
    "example": "asS4(x)",
    "caution": "S4クラス機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": "isS4",
    "category": "その他",
    "syntax": "isS4(object)",
    "description": "オブジェクトがS4クラスのインスタンスかを判定し、S4／S3表現へ変換します。【未対応の理由】S4クラス機構に依存し、値モデルで忠実に再現できないため",
    "example": "isS4(pi)",
    "caution": "S4クラス機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": "S4",
    "category": "その他",
    "syntax": "S4(object)",
    "description": "オブジェクトがS4クラスのインスタンスかを判定し、S4／S3表現へ変換します。【未対応の理由】S4クラス機構に依存し、値モデルで忠実に再現できないため",
    "example": "S4(pi)",
    "caution": "S4クラス機構に依存します。",
    "status": "unsupported"
  },
  {
    "name": "isSymmetric",
    "category": "行列・配列",
    "syntax": "isSymmetric(object, ...)",
    "description": "行列などが対称（複素行列ではエルミート）かを判定します。【未対応の理由】S3ジェネリックでありディスパッチに依存するため",
    "example": "isSymmetric(D3 <- diag(3))",
    "caution": "S3ジェネリックであり、行列メソッドのみが実装されています。許容誤差 tol で判定します。",
    "status": "unsupported"
  },
  {
    "name": "jitter",
    "category": "数学",
    "syntax": "jitter(x, factor = 1, amount = NULL)",
    "description": "数値ベクトルへ小さなノイズ（ジッター）を加えます。【未対応の理由】乱数で値を撹拌する関数であり、決定的な値として再現できないため（乱数系の扱いは基礎層の未知値モデルにも無い）",
    "example": "jitter(c(rep(1, 3), rep(1.2, 4), rep(3, 3)))",
    "caution": "乱数を使うため結果は実行ごとに変わる未確定値です。再現には set.seed が必要です（未対応）。",
    "status": "unsupported"
  },
  {
    "name": "kappa",
    "category": "行列・配列",
    "syntax": "kappa(z, ...)",
    "description": "行列の条件数（行列ノルムと逆行列ノルムの積）を計算または推定します。rcond はその逆数の推定です。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "kappa(x1 <- cbind(1, 1:10))",
    "caution": "exact=FALSE の既定では推定値です。正方行列が対象です。",
    "status": "unsupported"
  },
  {
    "name": "rcond",
    "category": "行列・配列",
    "syntax": "rcond(x, norm = c(\"O\",\"I\",\"1\"), triangular = FALSE, uplo = \"U\", ...)",
    "description": "行列の条件数（行列ノルムと逆行列ノルムの積）を計算または推定します。rcond はその逆数の推定です。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": "rcond(x)",
    "caution": "exact=FALSE の既定では推定値です。正方行列が対象です。",
    "status": "unsupported"
  },
  {
    "name": ".kappa_tri",
    "category": "行列・配列",
    "syntax": ".kappa_tri(z, exact = FALSE, LINPACK = TRUE, norm = NULL, uplo = \"U\", ...)",
    "description": "行列の条件数（行列ノルムと逆行列ノルムの積）を計算または推定します。rcond はその逆数の推定です。【未対応の理由】行列と分解・解法オブジェクト（qr／svd 等）をエンジンの値モデルで表せないため",
    "example": ".kappa_tri(x)",
    "caution": "exact=FALSE の既定では推定値です。正方行列が対象です。",
    "status": "unsupported"
  },
  {
    "name": "kronecker",
    "category": "行列・配列",
    "syntax": "kronecker(X, Y, FUN = \"*\", make.dimnames = FALSE, ...)",
    "description": "2つの配列の一般化クロネッカー積を計算します。%x% はその演算子形です。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "kronecker(4, M)",
    "caution": "FUN で要素積の代わりの二項関数を指定できます。次元名は make.dimnames で制御します。",
    "status": "unsupported"
  },
  {
    "name": "%x%",
    "category": "行列・配列",
    "syntax": "kronecker(X, Y, FUN = \"*\", make.dimnames = FALSE, ...) X %x% Y",
    "description": "2つの配列の一般化クロネッカー積を計算します。%x% はその演算子形です。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "matrix(1:4, 2) %x% matrix(1:4, 2)",
    "caution": "FUN で要素積の代わりの二項関数を指定できます。次元名は make.dimnames で制御します。",
    "status": "unsupported"
  },
  {
    "name": "l10n_info",
    "category": "その他",
    "syntax": "l10n_info",
    "description": "ローカリゼーション情報を報告します。【未対応の理由】ロケール環境の照会であり、値モデルで忠実に再現できないため",
    "example": "l10n_info()",
    "caution": "ロケール環境に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": "La_library",
    "category": "その他",
    "syntax": "La_library",
    "description": "使用中の LAPACK 実装の共有オブジェクト名を報告します。【未対応の理由】実行環境の構成照会であり、値モデルで忠実に再現できないため",
    "example": "La_library()",
    "caution": "実行環境の構成に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": "La_version",
    "category": "その他",
    "syntax": "La_version",
    "description": "使用中の LAPACK のバージョンを報告します。【未対応の理由】実行環境の構成照会であり、値モデルで忠実に再現できないため",
    "example": "La_version()",
    "caution": "実行環境の構成に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": "labels",
    "category": "その他",
    "syntax": "labels(object, ...)",
    "description": "オブジェクトから表示・描画用のラベルを取り出すジェネリック関数です。【未対応の理由】S3ジェネリックであり任意クラスへのディスパッチに依存するため",
    "example": "labels(x)",
    "caution": "S3ジェネリックであり任意クラスへのディスパッチに依存します。",
    "status": "unsupported"
  },
  {
    "name": "lapply",
    "category": "ベクトル",
    "syntax": "lapply(X, FUN, ...)",
    "description": "リストやベクトルの各要素へ FUN を適用します。lapply はリスト、sapply は可能なら簡約化した結果、vapply は FUN.VALUE で型を指定した結果、replicate は式を繰り返し評価した結果、simplify2array はリストの配列化を返します。【未対応の理由】関数値を値として渡す高階関数であり、関数値の無いエンジンの値モデルで再現できないため（戻り値もリストになる）",
    "example": "lapply(x, mean)",
    "caution": "sapply の簡約化により返り値の型が入力に依存して変わります。vapply は FUN.VALUE と型が合わないとエラーです。",
    "status": "unsupported"
  },
  {
    "name": "replicate",
    "category": "ベクトル",
    "syntax": "replicate(n, expr, simplify = \"array\")",
    "description": "リストやベクトルの各要素へ FUN を適用します。lapply はリスト、sapply は可能なら簡約化した結果、vapply は FUN.VALUE で型を指定した結果、replicate は式を繰り返し評価した結果、simplify2array はリストの配列化を返します。【未対応の理由】式を繰り返し評価してリスト／配列にまとめるため、式オブジェクトとリストをエンジンの値モデルで表せないため",
    "example": "replicate(100, mean(rexp(10)))",
    "caution": "sapply の簡約化により返り値の型が入力に依存して変わります。vapply は FUN.VALUE と型が合わないとエラーです。",
    "status": "unsupported"
  },
  {
    "name": "sapply",
    "category": "ベクトル",
    "syntax": "sapply(X, FUN, ..., simplify = TRUE, USE.NAMES = TRUE)",
    "description": "リストやベクトルの各要素へ FUN を適用します。lapply はリスト、sapply は可能なら簡約化した結果、vapply は FUN.VALUE で型を指定した結果、replicate は式を繰り返し評価した結果、simplify2array はリストの配列化を返します。",
    "example": "sapply(c(-1, 2, -3), \"abs\")",
    "caution": "sapply の簡約化により返り値の型が入力に依存して変わります。vapply は FUN.VALUE と型が合わないとエラーです。このモデルでは FUN は文字列で関数名を指定する形のみ対応します。関数名をそのまま渡す形は未対応です。",
    "status": "supported"
  },
  {
    "name": "simplify2array",
    "category": "ベクトル",
    "syntax": "simplify2array(x, higher = TRUE, except = c(0L, 1L))",
    "description": "リストやベクトルの各要素へ FUN を適用します。lapply はリスト、sapply は可能なら簡約化した結果、vapply は FUN.VALUE で型を指定した結果、replicate は式を繰り返し評価した結果、simplify2array はリストの配列化を返します。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "simplify2array(x)",
    "caution": "sapply の簡約化により返り値の型が入力に依存して変わります。vapply は FUN.VALUE と型が合わないとエラーです。",
    "status": "unsupported"
  },
  {
    "name": "vapply",
    "category": "ベクトル",
    "syntax": "vapply(X, FUN, FUN.VALUE, ..., USE.NAMES = TRUE)",
    "description": "リストやベクトルの各要素へ FUN を適用します。lapply はリスト、sapply は可能なら簡約化した結果、vapply は FUN.VALUE で型を指定した結果、replicate は式を繰り返し評価した結果、simplify2array はリストの配列化を返します。",
    "example": "vapply(c(-1, 2), \"abs\", 0)",
    "caution": "sapply の簡約化により返り値の型が入力に依存して変わります。vapply は FUN.VALUE と型が合わないとエラーです。このモデルでは FUN は文字列で関数名を指定する形のみ対応します。関数名をそのまま渡す形は未対応です。",
    "status": "supported"
  },
  {
    "name": ".Last.value",
    "category": "環境と言語",
    "syntax": ".Last.value",
    "description": "直前に評価されたトップレベル式の値が代入される内部変数です。【未対応の理由】セッションの評価状態に依存し、値モデルで忠実に再現できないため",
    "example": ".Last.value # keep them library(\"splines\") # returns invisibly .Last.value # shows what library(.) a",
    "caution": "セッションの評価状態に依存します。",
    "status": "unsupported"
  },
  {
    "name": "lengths",
    "category": "ベクトル",
    "syntax": "lengths(x, use.names = TRUE)",
    "description": "リストや原子ベクトルの各要素の長さを整数ベクトルで返します。",
    "example": "l <- c(1, 2)\nlengths(l)",
    "caution": "要素がオブジェクトの場合はその length が使われます。大きな長さでは numeric になります。",
    "status": "supported"
  },
  {
    "name": "levels",
    "category": "因子",
    "syntax": "levels(x)",
    "description": "変数の levels 属性を取得・設定します（因子の水準）。",
    "example": "levels(c(\"a\", \"b\"))",
    "caution": "水準の再命名は levels への代入で行います。長さが合わないとエラーです。",
    "status": "supported"
  },
  {
    "name": "libcurlVersion",
    "category": "その他",
    "syntax": "libcurlVersion",
    "description": "使用中の libcurl のバージョンを報告します。【未対応の理由】実行環境の構成照会であり、値モデルで忠実に再現できないため",
    "example": "libcurlVersion()",
    "caution": "実行環境の構成に依存する値です。",
    "status": "unsupported"
  },
  {
    "name": ".libPaths",
    "category": "環境と言語",
    "syntax": ".libPaths(new, include.site = TRUE)",
    "description": "パッケージを探すライブラリツリー（.libPaths）と、その代表パス（.Library／.Library.site）です。【未対応の理由】パッケージライブラリの構成に依存し、値モデルで忠実に再現できないため",
    "example": ".libPaths()",
    "caution": "ファイルシステム上のライブラリ構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".Library",
    "category": "環境と言語",
    "syntax": ".Library(...)",
    "description": "パッケージを探すライブラリツリー（.libPaths）と、その代表パス（.Library／.Library.site）です。【未対応の理由】パッケージライブラリの構成に依存し、値モデルで忠実に再現できないため",
    "example": ".Library(x)",
    "caution": "ファイルシステム上のライブラリ構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": ".Library.site",
    "category": "環境と言語",
    "syntax": ".Library.site(...)",
    "description": "パッケージを探すライブラリツリー（.libPaths）と、その代表パス（.Library／.Library.site）です。【未対応の理由】パッケージライブラリの構成に依存し、値モデルで忠実に再現できないため",
    "example": ".Library.site(x)",
    "caution": "ファイルシステム上のライブラリ構成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "conflictRules",
    "category": "環境と言語",
    "syntax": "conflictRules(pkg, mask.ok = NULL, exclude = NULL)",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": "conflictRules(x)",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": "format.libraryIQR",
    "category": "環境と言語",
    "syntax": "format.libraryIQR(x, ...)",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": "format.libraryIQR(x)",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": "format.packageInfo",
    "category": "環境と言語",
    "syntax": "format.packageInfo(x, ...)",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": "format.packageInfo(x)",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": "library",
    "category": "環境と言語",
    "syntax": "library(package, help, pos = 2, lib.loc = NULL, character.only = FALSE, logical.return = FALSE, warn.conflicts, quietly = FALSE, verbose = getOption(\"verbose\"), mask.ok, exclude, include.only, attach.required = missing(include.only))",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": "library()",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": "print.libraryIQR",
    "category": "環境と言語",
    "syntax": "print.libraryIQR(x, ...)",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": "print.libraryIQR(x)",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": "print.packageInfo",
    "category": "環境と言語",
    "syntax": "print.packageInfo(x, ...)",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": "print.packageInfo(x)",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": "require",
    "category": "環境と言語",
    "syntax": "require(package, lib.loc = NULL, quietly = FALSE, warn.conflicts, character.only = FALSE, mask.ok, exclude, include.only, attach.required = missing(include.only))",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": "require(splines)",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": ".noGenerics",
    "category": "環境と言語",
    "syntax": ".noGenerics(...)",
    "description": "アドオンパッケージを読み込み検索パスへ取り付けます（library／require）。【未対応の理由】パッケージ読み込みと検索パスに依存し、値モデルで忠実に再現できないため",
    "example": ".noGenerics(x)",
    "caution": "パッケージと検索パス・環境に依存します。require は失敗してもエラーにせず FALSE を返します。",
    "status": "unsupported"
  },
  {
    "name": "library.dynam",
    "category": "その他",
    "syntax": "library.dynam(chname, package, lib.loc, verbose = getOption(\"verbose\"), file.ext = .Platform$dynlib.ext, ...)",
    "description": "パッケージからコンパイル済みコードを読み込み・解放します。【未対応の理由】外部ネイティブコードの読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "library.dynam()",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "library.dynam.unload",
    "category": "その他",
    "syntax": "library.dynam.unload(chname, libpath, verbose = getOption(\"verbose\"), file.ext = .Platform$dynlib.ext)",
    "description": "パッケージからコンパイル済みコードを読み込み・解放します。【未対応の理由】外部ネイティブコードの読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "library.dynam.unload()",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": ".dynLibs",
    "category": "その他",
    "syntax": ".dynLibs(new)",
    "description": "パッケージからコンパイル済みコードを読み込み・解放します。【未対応の理由】外部ネイティブコードの読み込みに依存し、値モデルで忠実に再現できないため",
    "example": ".dynLibs(x)",
    "caution": "外部ネイティブコードに依存します。",
    "status": "unsupported"
  },
  {
    "name": "licence",
    "category": "その他",
    "syntax": "licence",
    "description": "R のライセンス条項（文書）です。【未対応の理由】ライセンス文書の表示であり、値として再現する対象ではないため",
    "example": "licence(x)",
    "caution": "文書情報であり計算ではありません。",
    "status": "unsupported"
  },
  {
    "name": "license",
    "category": "その他",
    "syntax": "license",
    "description": "R のライセンス条項（文書）です。【未対応の理由】ライセンス文書の表示であり、値として再現する対象ではないため",
    "example": "license(x)",
    "caution": "文書情報であり計算ではありません。",
    "status": "unsupported"
  },
  {
    "name": "alist",
    "category": "ベクトル",
    "syntax": "alist(...)",
    "description": "リストを作成・変換・判定します。pairlist／alist は引数リスト用のペアリストを作ります（alist は未評価のまま保持）。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "alist(x = , y = 2+3, ... = )",
    "caution": "alist の要素は約束として保持され評価されません。list の要素は評価されます。",
    "status": "unsupported"
  },
  {
    "name": "as.list",
    "category": "ベクトル",
    "syntax": "as.list(x, ...)",
    "description": "リストを作成・変換・判定します。pairlist／alist は引数リスト用のペアリストを作ります（alist は未評価のまま保持）。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "as.list(e1)",
    "caution": "alist の要素は約束として保持され評価されません。list の要素は評価されます。",
    "status": "unsupported"
  },
  {
    "name": "as.pairlist",
    "category": "ベクトル",
    "syntax": "as.pairlist(x)",
    "description": "リストを作成・変換・判定します。pairlist／alist は引数リスト用のペアリストを作ります（alist は未評価のまま保持）。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "as.pairlist(x)",
    "caution": "alist の要素は約束として保持され評価されません。list の要素は評価されます。",
    "status": "unsupported"
  },
  {
    "name": "is.list",
    "category": "ベクトル",
    "syntax": "is.list(x)",
    "description": "リストを作成・変換・判定します。pairlist／alist は引数リスト用のペアリストを作ります（alist は未評価のまま保持）。",
    "example": "x <- c(1, 2)\nis.list(x)",
    "caution": "alist の要素は約束として保持され評価されません。list の要素は評価されます。",
    "status": "supported"
  },
  {
    "name": "is.pairlist",
    "category": "ベクトル",
    "syntax": "is.pairlist(x)",
    "description": "リストを作成・変換・判定します。pairlist／alist は引数リスト用のペアリストを作ります（alist は未評価のまま保持）。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "is.pairlist(.Options)",
    "caution": "alist の要素は約束として保持され評価されません。list の要素は評価されます。",
    "status": "unsupported"
  },
  {
    "name": "list",
    "category": "ベクトル",
    "syntax": "list(...)",
    "description": "リストを作成・変換・判定します。pairlist／alist は引数リスト用のペアリストを作ります（alist は未評価のまま保持）。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "list(x = cars[,1], y = cars[,2])",
    "caution": "alist の要素は約束として保持され評価されません。list の要素は評価されます。",
    "status": "unsupported"
  },
  {
    "name": "pairlist",
    "category": "ベクトル",
    "syntax": "pairlist(...)",
    "description": "リストを作成・変換・判定します。pairlist／alist は引数リスト用のペアリストを作ります（alist は未評価のまま保持）。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "pairlist(.Options)",
    "caution": "alist の要素は約束として保持され評価されません。list の要素は評価されます。",
    "status": "unsupported"
  },
  {
    "name": "dir",
    "category": "ファイル",
    "syntax": "dir(path = \".\", pattern = NULL, all.files = FALSE, full.names = FALSE, recursive = FALSE, ignore.case = FALSE, include.dirs = FALSE, no.. = FALSE, fixed = FALSE)",
    "description": "指定ディレクトリ内のファイル・ディレクトリ名を文字列ベクトルで返します。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "dir(\"../..\", pattern = \"^[a-lr]\", full.names = TRUE, ignore.case = TRUE)",
    "caution": "実ファイルシステムに依存します。pattern は正規表現です。",
    "status": "unsupported"
  },
  {
    "name": "list.dirs",
    "category": "ファイル",
    "syntax": "list.dirs(path = \".\", full.names = TRUE, recursive = TRUE)",
    "description": "指定ディレクトリ内のファイル・ディレクトリ名を文字列ベクトルで返します。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "list.dirs(R.home(\"doc\"))",
    "caution": "実ファイルシステムに依存します。pattern は正規表現です。",
    "status": "unsupported"
  },
  {
    "name": "list.files",
    "category": "ファイル",
    "syntax": "list.files(path = \".\", pattern = NULL, all.files = FALSE, full.names = FALSE, recursive = FALSE, ignore.case = FALSE, include.dirs = FALSE, no.. = FALSE, fixed = FALSE)",
    "description": "指定ディレクトリ内のファイル・ディレクトリ名を文字列ベクトルで返します。【未対応の理由】実ファイルシステムに依存し、値モデルで忠実に再現できないため",
    "example": "list.files(R.home())",
    "caution": "実ファイルシステムに依存します。pattern は正規表現です。",
    "status": "unsupported"
  },
  {
    "name": "list2DF",
    "category": "データフレーム",
    "syntax": "list2DF(x = list(), nrow = 0)",
    "description": "変数のリストからデータフレームを作成します。【未対応の理由】リスト／ペアリストをエンジンの値モデルで表せないため",
    "example": "list2DF(list(x = x, n = n))",
    "caution": "列長は nrow に合わせてリサイクルされます。",
    "status": "unsupported"
  },
  {
    "name": "list2env",
    "category": "環境と言語",
    "syntax": "list2env(x, envir = NULL, parent = parent.frame(), hash = (length(x) > 100), size = max(29L, length(x)))",
    "description": "リストの要素をオブジェクトとして含む環境を作成します。【未対応の理由】環境オブジェクトに依存し、値モデルで忠実に再現できないため",
    "example": "list2env(L)",
    "caution": "環境オブジェクトの生成に依存します。",
    "status": "unsupported"
  },
  {
    "name": "load",
    "category": "入出力",
    "syntax": "load(file, envir = parent.frame(), verbose = FALSE)",
    "description": "save で書き出したデータセットをファイルから再読み込みします。【未対応の理由】実ファイルと環境への読み込みに依存し、値モデルで忠実に再現できないため",
    "example": "load(\"all.rda\")",
    "caution": "実ファイルと環境への読み込みに依存します。",
    "status": "unsupported"
  },
  {
    "name": "LC_ALL",
    "category": "その他",
    "syntax": "LC_ALL(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.getlocale(\"LC_ALL\")",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_COLLATE",
    "category": "その他",
    "syntax": "LC_COLLATE(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.getlocale(\"LC_COLLATE\")",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_CTYPE",
    "category": "その他",
    "syntax": "LC_CTYPE(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "LC_CTYPE(x)",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_MEASUREMENT",
    "category": "その他",
    "syntax": "LC_MEASUREMENT(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "LC_MEASUREMENT(x)",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_MESSAGES",
    "category": "その他",
    "syntax": "LC_MESSAGES(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "LC_MESSAGES(x)",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_MONETARY",
    "category": "その他",
    "syntax": "LC_MONETARY(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "LC_MONETARY(x)",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_NUMERIC",
    "category": "その他",
    "syntax": "LC_NUMERIC(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "LC_NUMERIC(x)",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_PAPER",
    "category": "その他",
    "syntax": "LC_PAPER(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.getlocale(\"LC_PAPER\")",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "LC_TIME",
    "category": "その他",
    "syntax": "LC_TIME(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.getlocale(\"LC_TIME\")",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "Sys.getlocale",
    "category": "その他",
    "syntax": "Sys.getlocale(category = \"LC_ALL\")",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.getlocale()",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "Sys.setlocale",
    "category": "その他",
    "syntax": "Sys.setlocale(category = \"LC_ALL\", locale = \"\")",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": "Sys.setlocale(\"LC_TIME\", \"de\")",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": ".LC.categories",
    "category": "その他",
    "syntax": ".LC.categories(...)",
    "description": "プロセスのロケールの各側面を取得（Sys.getlocale）・設定（Sys.setlocale）します。【未対応の理由】プロセスのロケール状態に依存し、値モデルで忠実に再現できないため",
    "example": ".LC.categories # of length 9 on all platforms ## Not run: Sys.setlocale(\"LC_COLLATE\", \"C\") # turn of",
    "caution": "ロケールは文字列比較や日付表示など多くの処理に影響します。",
    "status": "unsupported"
  },
  {
    "name": "exp",
    "category": "数学",
    "syntax": "exp(1)",
    "description": "対数（log は自然対数、log10 は常用、log2 は二進、logb は底指定）と指数関数（exp、expm1、log1p は小さい x での精度を保つ版）を計算します。",
    "example": "exp(3)",
    "caution": "負の値の対数は NaN と警告になります。log(0) は -Inf です。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "expm1",
    "category": "数学",
    "syntax": "expm1(x)",
    "description": "対数（log は自然対数、log10 は常用、log2 は二進、logb は底指定）と指数関数（exp、expm1、log1p は小さい x での精度を保つ版）を計算します。",
    "example": "x <- 1\nexpm1(x)",
    "caution": "負の値の対数は NaN と警告になります。log(0) は -Inf です。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "log",
    "category": "数学",
    "syntax": "log(x, base = exp(1))",
    "description": "対数（log は自然対数、log10 は常用、log2 は二進、logb は底指定）と指数関数（exp、expm1、log1p は小さい x での精度を保つ版）を計算します。",
    "example": "log(exp(3))",
    "caution": "負の値の対数は NaN と警告になります。log(0) は -Inf です。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "log10",
    "category": "数学",
    "syntax": "log10(x)",
    "description": "対数（log は自然対数、log10 は常用、log2 は二進、logb は底指定）と指数関数（exp、expm1、log1p は小さい x での精度を保つ版）を計算します。",
    "example": "log10(1e7)",
    "caution": "負の値の対数は NaN と警告になります。log(0) は -Inf です。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "log1p",
    "category": "数学",
    "syntax": "log1p(x)",
    "description": "対数（log は自然対数、log10 は常用、log2 は二進、logb は底指定）と指数関数（exp、expm1、log1p は小さい x での精度を保つ版）を計算します。",
    "example": "x <- 1\nlog1p(x)",
    "caution": "負の値の対数は NaN と警告になります。log(0) は -Inf です。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "log2",
    "category": "数学",
    "syntax": "log2(x)",
    "description": "対数（log は自然対数、log10 は常用、log2 は二進、logb は底指定）と指数関数（exp、expm1、log1p は小さい x での精度を保つ版）を計算します。",
    "example": "x <- 8\nlog2(x)",
    "caution": "負の値の対数は NaN と警告になります。log(0) は -Inf です。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "logb",
    "category": "数学",
    "syntax": "logb(x, base = exp(1))",
    "description": "対数（log は自然対数、log10 は常用、log2 は二進、logb は底指定）と指数関数（exp、expm1、log1p は小さい x での精度を保つ版）を計算します。",
    "example": "x <- 8\nlogb(x)",
    "caution": "負の値の対数は NaN と警告になります。log(0) は -Inf です。NA は伝播します。",
    "status": "supported"
  },
  {
    "name": "isFALSE",
    "category": "論理",
    "syntax": "isFALSE(x)",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "x <- FALSE\nisFALSE(x)",
    "caution": "&&／|| は長さ1でないとエラー（R 4.3以降は警告を経て）になります。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "isTRUE",
    "category": "論理",
    "syntax": "isTRUE(x)",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "x <- TRUE\nisTRUE(x)",
    "caution": "&&／|| は長さ1でないとエラー（R 4.3以降は警告を経て）になります。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "xor",
    "category": "論理",
    "syntax": "xor(x, y)",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "xor(TRUE, FALSE)",
    "caution": "&&／|| は長さ1でないとエラー（R 4.3以降は警告を経て）になります。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "!",
    "category": "論理",
    "syntax": "!x",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "!TRUE",
    "caution": "&&／|| は長さ1でないとエラーになります（R 4.3.3 で実測。旧版の警告経由ではありません）。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "&",
    "category": "論理",
    "syntax": "x & y",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "TRUE & FALSE",
    "caution": "&&／|| は長さ1でないとエラーになります（R 4.3.3 で実測。旧版の警告経由ではありません）。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "&&",
    "category": "論理",
    "syntax": "x && y",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "TRUE && FALSE",
    "caution": "&&／|| は長さ1でないとエラーになります（R 4.3.3 で実測。旧版の警告経由ではありません）。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "|",
    "category": "論理",
    "syntax": "x | y",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "TRUE | FALSE",
    "caution": "&&／|| は長さ1でないとエラーになります（R 4.3.3 で実測。旧版の警告経由ではありません）。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "||",
    "category": "論理",
    "syntax": "x || y",
    "description": "論理演算子（! & && | ||）と xor、isTRUE／isFALSE です。& と | は要素ごと、&& と || は長さ1を評価して短絡します。",
    "example": "TRUE || FALSE",
    "caution": "&&／|| は長さ1でないとエラーになります（R 4.3.3 で実測。旧版の警告経由ではありません）。NA との三値論理に注意してください。",
    "status": "supported"
  },
  {
    "name": "as.logical",
    "category": "型変換",
    "syntax": "as.logical(x, ...)",
    "description": "logical 型ベクトルを作成・変換・判定します。TRUE／FALSE は予約定数、T／F はその別名変数です。",
    "example": "as.logical(c(1, 0))",
    "caution": "T／F は再代入できるため TRUE／FALSE の使用が安全です。数値の 0 以外は TRUE へ変換されます。",
    "status": "supported"
  },
  {
    "name": "is.logical",
    "category": "型変換",
    "syntax": "is.logical(x)",
    "description": "logical 型ベクトルを作成・変換・判定します。TRUE／FALSE は予約定数、T／F はその別名変数です。",
    "example": "x <- TRUE\nis.logical(x)",
    "caution": "T／F は再代入できるため TRUE／FALSE の使用が安全です。数値の 0 以外は TRUE へ変換されます。",
    "status": "supported"
  },
  {
    "name": "logical",
    "category": "型変換",
    "syntax": "logical(length = 0)",
    "description": "logical 型ベクトルを作成・変換・判定します。TRUE／FALSE は予約定数、T／F はその別名変数です。",
    "example": "logical(2)",
    "caution": "T／F は再代入できるため TRUE／FALSE の使用が安全です。数値の 0 以外は TRUE へ変換されます。",
    "status": "supported"
  },
  {
    "name": "lower.tri",
    "category": "行列・配列",
    "syntax": "lower.tri(x, diag = FALSE)",
    "description": "行列の下三角（lower.tri）・上三角（upper.tri）の位置に TRUE を入れた論理行列を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "lower.tri(m2)",
    "caution": "diag=TRUE で対角成分を含めます。",
    "status": "unsupported"
  },
  {
    "name": "upper.tri",
    "category": "行列・配列",
    "syntax": "upper.tri(x, diag = FALSE)",
    "description": "行列の下三角（lower.tri）・上三角（upper.tri）の位置に TRUE を入れた論理行列を返します。【未対応の理由】行列・配列オブジェクトをエンジンの値モデルで表せないため",
    "example": "upper.tri(x)",
    "caution": "diag=TRUE で対角成分を含めます。",
    "status": "unsupported"
  },
  {
    "name": "ls",
    "category": "環境と言語",
    "syntax": "ls(name, pos = -1L, envir = as.environment(pos), all.names = FALSE, pattern, sorted = TRUE)",
    "description": "変数環境内のオブジェクト名を文字列ベクトルで返します。このモデルではシミュレータの変数が対象です（監査で実 R と照合済み）。",
    "example": "ls()",
    "caution": "pattern（正規表現）／all.names／sorted に対応します。環境引数（name／pos／envir）は未対応です。",
    "status": "supported"
  },
  {
    "name": "objects",
    "category": "環境と言語",
    "syntax": "objects(name, pos= -1L, envir = as.environment(pos), all.names = FALSE, pattern, sorted = TRUE)",
    "description": "変数環境内のオブジェクト名を文字列ベクトルで返します（ls の別名）。このモデルではシミュレータの変数が対象です（監査で実 R と照合済み）。",
    "example": "objects()",
    "caution": "pattern（正規表現）／all.names／sorted に対応します。環境引数（name／pos／envir）は未対応です。",
    "status": "supported"
  }
];
