// 高度モード B4S：R 高度リファレンス項目 part9（utils データ操作・入出力）。
// 項目形式は B4S 共通ブリーフ第4章の正規形（status 必須、追加フィールド
// なし。未対応／未検証の理由は description に明記する）。
// 事実は公式ヘルプ（stat.ethz.ch R-manual）と実 R 4.3.3 の実測・関数
// ソースで裏付けた（報告書 docs/audit/ADV-B4S-udata.md）。
export const referenceAdvanced = [
{
"name": "URLdecode",
"category": "文字列",
"syntax": "URLdecode(URL)",
"description": "URL の %xx 形式のパーセントエンコーディングをデコードして文字列に戻します。+ は + のまま（空白にはなりません）。不正な %xx は実 R どおり警告のうえ 0 として扱われ、結果に NUL が埋め込まれる場合はエラーで停止します。",
"example": "URLdecode(\"a%20url%20with%20spaces\")",
"caution": "デコード後のバイト列は UTF-8 として文字列化します。NA は実 R の charToRaw の仕様で文字列 \"NA\" としてデコードされます（実測）。",
"status": "supported"
},
{
"name": "URLencode",
"category": "文字列",
"syntax": "URLencode(URL, reserved = FALSE, repeated = FALSE)",
"description": "URL 中の文字を %xx 形式にパーセントエンコードします。英数字と - _. ~ 以外の文字が対象で、予約文字（! $ & ' () * +,; =: /? @ # []）は reserved = TRUE のときだけエンコードされます。多バイト文字はバイト単位でエンコードされます。",
"example": "URLencode(\"a url with spaces and / and @\")",
"caution": "repeated = FALSE（既定）で %xx を含む文字列は、実 R 本体どおり丸ごとそのまま返ります。NA は実 R の仕様で文字列 \"NA\" になります（実測）。",
"status": "supported"
},
{
"name": "adist",
"category": "文字列",
"syntax": "adist(x, y = NULL, costs = NULL, counts = FALSE, fixed = TRUE, partial =!fixed, ignore.case = FALSE, useBytes = FALSE)",
"description": "2つの文字列間の一般化 Levenshtein（編集）距離を計算し、x の要素×y の要素の行列で返します。【未対応の理由】戻り値が counts = TRUE のときの \"counts\"（3次元配列）や \"trafos\" 等の属性を伴う行列であり、属性付き行列を値モデルで忠実に表せないため（属性を落とした行列で誤った値を返さないための未対応）",
"example": "adist(\"kitten\", \"sitting\")",
"caution": "partial = TRUE では部分一致の距離（agrep と同じ）になります。costs で挿入・削除・置換のコストを変えられます。",
"status": "unsupported"
},
{
"name": "aregexec",
"category": "文字列",
"syntax": "aregexec(pattern, text, max.distance = 0.1, costs = NULL, ignore.case = FALSE, fixed = FALSE, useBytes = FALSE)",
"description": "近似文字列マッチの開始位置と、括弧で捕捉した部分式の位置を、要素ごとに \"match.length\" 属性付き整数ベクトルを持つリストで返します。【未対応の理由】戻り値が属性付きベクトルのリストであり、リスト型と属性を値モデルで忠実に表せないため",
"example": "aregexec(\"laysy\", \"1 lazy\", max.distance = 2)",
"caution": "agrep と違い、既定ではパターンを正規表現として解釈します（fixed = FALSE）。",
"status": "unsupported"
},
{
"name": "capture.output",
"category": "入出力",
"syntax": "capture.output(..., file = NULL, append = FALSE, type = c(\"output\", \"message\"), split = FALSE)",
"description": "引数の式を評価し、その出力（print や cat の結果）を文字列ベクトルとして返すか、ファイルへ送ります。【未対応の理由】式の遅延評価と出力先の付け替え（sink）に本質的に依存し、値モデルで忠実に再現できないため",
"example": "capture.output(1 + 1, 2 + 2)",
"caution": "file を指定すると戻り値は invisible な NULL で、出力はファイルへ書かれます。",
"status": "unsupported"
},
{
"name": "combn",
"category": "ベクトル",
"syntax": "combn(x, m, FUN = NULL, simplify = TRUE,...)",
"description": "x の要素から m 個を選ぶ全ての組み合わせを生成します。x が正の整数なら seq(x) の要素が対象です。FUN を渡すと各組み合わせに FUN を適用します。このモデルでは FUN を文字列で集計名（\"sum\"／\"mean\"／\"median\"／\"min\"／\"max\"／\"length\"／\"sd\"）で指定し、結果が長さ1に簡約される形のみ対応します。",
"example": "combn(1:4, 2, FUN = \"sum\")",
"caution": "FUN = NULL の結果は行列、simplify = FALSE の結果はリストになるため、その形は名指しで停止します。FUN へは... 経由で na.rm を渡せます。",
"status": "supported"
},
{
"name": "compareVersion",
"category": "パッケージ",
"syntax": "compareVersion(a, b)",
"description": "2つのパッケージバージョン文字列を比べ、a が古ければ -1、等しければ 0、新しければ 1 を返します。要素は. と - で区切って整数として比較し、要素が欠けている側は、要素がある側より古いものとして扱われます。不正な形式はエラーになります。",
"example": "compareVersion(\"7.2-0\", \"7.1-12\")",
"caution": "compareVersion(\"1.0\", \"1.0.0\") は -1 です（末尾の 0 の有無ではなく要素の有無で決まります）。NA との比較は、a が NA なら -1、b が NA なら 1 を返します（実 R 本体どおり）。",
"status": "supported"
},
{
"name": "count.fields",
"category": "ファイル",
"syntax": "count.fields(file, sep = \"\", quote = \"\\\"'\", skip = 0, blank.lines.skip = TRUE, comment.char = \"#\")",
"description": "ファイルを読み、各行が sep で区切られたいくつのフィールドからなるかを数えてベクトルで返します。【未対応の理由】ファイル入力のため（基礎層 read.csv はモデル内蔵データ専用の経路で、高度ハンドラの契約で公開された道具からは到達できない）",
"example": "count.fields(\"data.txt\", sep = \":\")",
"caution": "引用符内の改行を含む行では、その行の数えが NA になり、次の行に合算されます。",
"status": "unsupported"
},
{
"name": "data",
"category": "パッケージ",
"syntax": "data(..., list = character(), package = NULL, lib.loc = NULL, verbose = getOption(\"verbose\"), envir =.GlobalEnv, overwrite = TRUE)",
"description": "パッケージ等に用意されたデータセットを指定した環境へ読み込みます。引数なしでは利用可能なデータセットの一覧を packageIQR クラスのオブジェクトで返します。【未対応の理由】このモデルには読み込むデータセットが無く、環境への副作用と packageIQR クラスオブジェクトも値モデルで表せないため",
"example": "data(USArrests, \"VADeaths\")",
"caution": "データセット名は引用符なしの名前でも文字列でも指定できます。同名の既存オブジェクトは上書きされます（overwrite）。",
"status": "unsupported"
},
{
"name": "print.packageIQR",
"category": "その他",
"syntax": "print.packageIQR(x,...)",
"description": "data() が返す packageIQR クラスのオブジェクト（データセット一覧）を整形して表示する S3 メソッドです。【未対応の理由】packageIQR クラスオブジェクトと、ページャへの表示という副作用に依存し、値モデルで忠実に再現できないため",
"example": "print.packageIQR(x)",
"caution": "戻り値は invisible な x 自身で、本体は画面（ページャ）への表示です。",
"status": "unsupported"
},
{
"name": "file_test",
"category": "ファイル",
"syntax": "file_test(op, x, y)",
"description": "シェルの test コマンド形式でファイルの状態を調べます。単項テストは \"-f\"（通常ファイル）\"-d\"（ディレクトリ）\"-L\"／\"-h\"（シンボリックリンク）\"-x\"（実行可能）\"-w\"（書き込み可能）\"-r\"（読み取り可能）、二項テストは \"-nt\"（より新しい）\"-ot\"（より古い）です。【未対応の理由】実ファイルシステムへの照会であり、モデルの仮想ファイルストアでは忠実に再現できないため",
"example": "file_test(\"-d\", \"data\")",
"caution": "二項テストは両方のファイルが存在しない限り FALSE です。",
"status": "unsupported"
},
{
"name": "glob2rx",
"category": "文字列",
"syntax": "glob2rx(pattern, trim.head = FALSE, trim.tail = TRUE)",
"description": "シェルのワイルドカード（glob）パターンを正規表現に変換します。? は.（任意の1文字）、* は.*（任意の文字列）になり、全体が ^ と $ で錨付けされます。trim.head = TRUE で先頭の ^.* を、trim.tail = TRUE（既定）で末尾の.*$ を取り除きます。",
"example": "glob2rx(\"*.doc\")",
"caution": "実 R 本体の変換規則どおり、エスケープされるのは. と ( [ { の直前への \\ 挿入のみで、+ や) などはそのまま残ります。NA は文字列 \"NA\" として変換されます（実測）。",
"status": "supported"
},
{
"name": "hasName",
"category": "ベクトル",
"syntax": "hasName(x, name)",
"description": "name の各要素が x の名前（names(x)）に含まれるかどうかを、name と同じ長さの論理ベクトルで返します。name %in% names(x) と等価で、部分一致はしません。データフレームでは列名が対象です。",
"example": "hasName(c(a = 1, b = 2), c(\"a\", \"c\"))",
"caution": "x に名前が無い場合や x が NULL の場合は全て FALSE です。name が NA の場合は、x の名前に NA がある場合だけ TRUE です。",
"status": "supported"
},
{
"name": "head",
"category": "ベクトル",
"syntax": "head(x, n = 6L,...)",
"description": "オブジェクトの先頭部分を返します。ベクトルでは先頭 n 要素、データフレームでは n を長さ2まで指定でき（行数・列数）、行名は元の行番号が保持されます。n が負の場合は「最後の |n| 個を除いた残り」です。n の NA はその次元の全選択を意味します（全て NA の場合はエラー）。",
"example": "head(c(\"a\", \"b\", \"c\", \"d\", \"e\", \"f\", \"g\", \"h\"), n = -6)",
"caution": "n の既定値は 6L です。行列・配列・関数への適用は、対象の値が値モデルに無いため扱えません。",
"status": "supported"
},
{
"name": "tail",
"category": "ベクトル",
"syntax": "tail(x, n = 6L, keepnums = FALSE, addrownums,...)",
"description": "オブジェクトの末尾部分を返します。ベクトルでは末尾 n 要素、データフレームでは n を長さ2まで指定でき（行数・列数）、行名は元の行番号が保持されます。n が負の場合は「先頭の |n| 個を除いた残り」です。n の NA はその次元の全選択を意味します（全て NA の場合はエラー）。",
"example": "tail(c(\"a\", \"b\", \"c\", \"d\", \"e\", \"f\", \"g\", \"h\"), n = -6)",
"caution": "データフレームでは keepnums の既定値が TRUE（メソッドの仕様）で、行名は常に元の行番号になります。addrownums は非推奨で、指定すると実 R どおり非推奨警告が出ます。",
"status": "supported"
},
{
"name": ".checkHT",
"category": "ベクトル",
"syntax": ".checkHT(n, d)",
"description": "head／tail のメソッドが n と dim(x) の妥当性を検証するための補助関数です。【未対応の理由】実 R 4.3.3 の utils 名前空間に.checkHT が存在しないため（4.3.3 では内部関数 checkHT としてのみ存在し、.checkHT は R-devel のヘルプにのみ現れる名前。実 R 4.3.3 で機械確認済み）",
"example": ".checkHT(6L, NULL)",
"caution": "head／tail 本体の n 検証は、このモデルでも checkHT と同じ規則・文言で実施しています。",
"status": "unsupported"
},
{
"name": "modifyList",
"category": "その他",
"syntax": "modifyList(x, val, keep.null = FALSE)",
"description": "名前付きリスト x を、別のリスト val の要素で再帰的に更新します（val にだけある要素は追加、共通要素は置換、入れ子のリスト同士は再帰）。このモデルではリスト型が無いため、データフレーム同士の形のみ対応します（実 R でも modifyList(df, df) は data.frame を返します）。",
"example": "modifyList(data.frame(a = 1:3, b = 4:6), data.frame(b = 5:7, c = 7:9))",
"caution": "列の長さは行数と一致するか長さ1（リサイクル）でなければならず、違う場合は実 R どおり「replacement has N rows, data has M」で停止します。keep.null による NULL 要素の保持・削除は、データフレームに NULL 列が存在しないため現れません。",
"status": "supported"
},
{
"name": "read.DIF",
"category": "入出力",
"syntax": "read.DIF(file, header = FALSE, dec = \".\", numerals = c(\"allow.loss\", \"warn.loss\", \"no.loss\"), row.names, col.names, as.is =!stringsAsFactors, na.strings = \"NA\", colClasses = NA, nrows = -1, skip = 0, check.names = TRUE, blank.lines.skip = TRUE, stringsAsFactors = FALSE, transpose = FALSE, fileEncoding = \"\")",
"description": "スプレッドシートの DIF（Data Interchange Format）ファイルを読み、データフレームを作成します。【未対応の理由】ファイル入力のため（基礎層 read.csv はモデル内蔵データ専用の経路で、高度ハンドラの契約で公開された道具からは到達できない）",
"example": "read.DIF(\"data.dif\", header = TRUE, transpose = TRUE)",
"caution": "Excel が出力する DIF は transpose = TRUE が必要なことがあります。",
"status": "unsupported"
},
{
"name": "read.fortran",
"category": "入出力",
"syntax": "read.fortran(file, format,..., as.is = TRUE, colClasses = NA)",
"description": "Fortran 形式の書式指定（F・D・X・A・I）で固定形式データファイルを読み、データフレームを作成します。【未対応の理由】ファイル入力のため（基礎層 read.csv はモデル内蔵データ専用の経路で、高度ハンドラの契約で公開された道具からは到達できない）",
"example": "read.fortran(\"data.txt\", c(\"F2.1\", \"F2.0\", \"I2\"))",
"caution": "内部では read.fwf を使います。書式の小数桁指定 d は、ファイル内に小数点があっても値をずらします。",
"status": "unsupported"
},
{
"name": "read.fwf",
"category": "入出力",
"syntax": "read.fwf(file, widths, header = FALSE, sep = \"\\t\", skip = 0, row.names, col.names, n = -1, buffersize = 2000, fileEncoding = \"\",...)",
"description": "固定幅形式（fixed width format）のファイルを読み、データフレームを作成します。負の幅は読み飛ばす列を表します。【未対応の理由】ファイル入力のため（基礎層 read.csv はモデル内蔵データ専用の経路で、高度ハンドラの契約で公開された道具からは到達できない）",
"example": "read.fwf(\"data.txt\", widths = c(1, 2, 3))",
"caution": "内部では read.table を使います。幅0や行末を超えたフィールドは NA になります。",
"status": "unsupported"
},
{
"name": "read.table",
"category": "入出力",
"syntax": "read.table(file, header = FALSE, sep = \"\", quote = \"\\\"'\", dec = \".\", numerals = c(\"allow.loss\", \"warn.loss\", \"no.loss\"), row.names, col.names, as.is =!stringsAsFactors, tryLogical = TRUE, na.strings = \"NA\", colClasses = NA, nrows = -1, skip = 0, check.names = TRUE, fill =!blank.lines.skip, strip.white = FALSE, blank.lines.skip = TRUE, comment.char = \"#\", allowEscapes = FALSE, flush = FALSE, stringsAsFactors = FALSE, fileEncoding = \"\", encoding = \"unknown\", text, skipNul = FALSE)",
"description": "表形式のファイルを読み、データフレームを作成します。read.csv／read.delim 等は既定値の違うラッパーです。【未対応の理由】ファイル入力のため（基礎層 read.csv はモデル内蔵データ専用の経路であり、read.table の既定値（header = FALSE、sep = \"\" 等）や text 引数の解釈まで含めて、高度ハンドラの契約で公開された道具からは到達できない）",
"example": "read.table(\"data.txt\", header = TRUE)",
"caution": "列はまず文字列として読まれ、type.convert で logical／integer／numeric／complex／factor のいずれかに変換されます。",
"status": "unsupported"
},
{
"name": "as.relistable",
"category": "ベクトル",
"syntax": "as.relistable(x)",
"description": "リスト等のオブジェクトに \"relistable\" クラスを付け、unlist した後で relist により元の構造へ戻せるようにします。【未対応の理由】\"relistable\" クラス付きリストオブジェクトを値モデルで表せないため",
"example": "as.relistable(list(mean = c(0, 1)))",
"caution": "戻せる構造は unlist 時に \"skeleton\" 属性として保持されます。",
"status": "unsupported"
},
{
"name": "is.relistable",
"category": "ベクトル",
"syntax": "is.relistable(x)",
"description": "オブジェクトが \"relistable\" クラスを持つかどうかを判定します。このモデルでは relistable なオブジェクトを作る手段が無い（as.relistable が未対応）ため、実 R でもベクトルやデータフレームに対して FALSE であるのと同様に、常に FALSE を返します。",
"example": "is.relistable(c(1, 2))",
"caution": "クラス付きオブジェクト一般の判定ではなく、relistable クラスの有無だけを見ます。",
"status": "supported"
},
{
"name": "relist",
"category": "ベクトル",
"syntax": "relist(flesh, skeleton)",
"description": "ベクトル flesh の内容を、リスト skeleton の構造に流し込んでリストに戻します（unlist の逆操作）。【未対応の理由】骨格・結果ともにリスト型であり、値モデルで表せないため",
"example": "relist(c(0, 1, 1, 1, 1, 0), list(mean = c(0, 1), vcov = matrix(0, 2, 2)))",
"caution": "skeleton を省略すると flesh の \"skeleton\" 属性が使われます。",
"status": "unsupported"
},
{
"name": "unlist.relistable",
"category": "ベクトル",
"syntax": "unlist(x, recursive = TRUE, use.names = TRUE)",
"description": "\"relistable\" クラスオブジェクトに対する unlist の S3 メソッドで、平らにしたベクトルに \"skeleton\" 属性（元の構造）を付けます。【未対応の理由】\"relistable\" クラスと属性付きベクトルを値モデルで表せないため",
"example": "unlist(as.relistable(list(a = 1, b = 2:3)))",
"caution": "通常の unlist と違い、戻り値に relist 用の骨格情報が属性として付きます。",
"status": "unsupported"
},
{
"name": "as.roman",
"category": "型変換",
"syntax": "as.roman(x)",
"description": "数値や文字列（アラビア数字・ローマ数字）を \"roman\" クラスの数値に変換します。内部表現は整数で、表示・整形はローマ数字（I, V, X,...）になります。1〜4999 の範囲外は NA になります。【未対応の理由】\"roman\" クラスの表示形（ローマ数字）と Ops／Summary のメソッドディスパッチに本質的に依存し、値モデルで忠実に再現できないため（整数のまま返すと表示が変わり、文字列で返すと数値演算が壊れる）",
"example": "as.roman(1:5)",
"caution": "as.roman(\"XIV\") のようにローマ数字文字列からも変換できます。",
"status": "unsupported"
},
{
"name": "Ops.roman",
"category": "その他",
"syntax": "r1 + r2",
"description": "\"roman\" クラスに対する演算（算術・比較・論理）のグループメソッドです。整数としての演算規則がそのまま適用されます。【未対応の理由】\"roman\" クラスオブジェクトと S3 グループメソッドのディスパッチに依存し、値モデルで表せないため",
"example": "as.roman(3) + as.roman(4)",
"caution": "演算結果も roman クラスで、範囲（1〜4999）を外れると NA になります。",
"status": "unsupported"
},
{
"name": "Summary.roman",
"category": "その他",
"syntax": "max(r1)",
"description": "\"roman\" クラスに対する要約（max／min／range／sum／prod 等）のグループメソッドです。整数としての規則が適用され、結果は roman クラスで返ります。【未対応の理由】\"roman\" クラスオブジェクトと S3 グループメソッドのディスパッチに依存し、値モデルで表せないため",
"example": "sum(as.roman(c(1, 2, 3)))",
"caution": "min は要素が全て NA のとき等に as.roman(NA) を返します。",
"status": "unsupported"
},
{
"name": ".romans",
"category": "その他",
"syntax": ".romans",
"description": "ローマ数字の基本辞書（名前付き文字ベクトル）です。【未対応の理由】呼び出し可能な関数ではなく、パッケージ内部のデータオブジェクトのため（項目は分母の監査可能性のために作り、names には収録しない）",
"example": ".romans",
"caution": "as.roman／format.roman の内部で使われる変換表です。",
"status": "unsupported"
},
{
"name": "stack",
"category": "データフレーム",
"syntax": "stack(x, select, drop = FALSE,...)",
"description": "データフレームの各列を縦に積み重ね、values（連結した値）と ind（元の列名）の2列のデータフレームにします。select で対象列を列名・位置・論理値のベクトルで選べます（実 R では式でも選べます）。型の違う列は unlist と同じ規則で共通型に変換されます。",
"example": "stack(data.frame(a = 1:2, b = 3:4))",
"caution": "実 R では ind は因子（factor）ですが、このモデルでは因子を表せないため列名の文字列ベクトルになります。リスト入力と、式による select（例：select = -ctrl）は未対応です。",
"status": "supported"
},
{
"name": "unstack",
"category": "データフレーム",
"syntax": "unstack(x, form,...)",
"description": "stack の逆操作で、form（値 ~ 指標の両辺フォーミュラ）に従ってベクトルをグループごとの列に分け、リストまたはデータフレームで返します。【未対応の理由】フォーミュラ（formula）オブジェクトに本質的に依存し、値モデルで表せないため",
"example": "unstack(data.frame(values = 1:4, ind = c(\"a\", \"a\", \"b\", \"b\")), values ~ ind)",
"caution": "form を省略すると x のフォーミュラ属性（formula(x)）が使われます。各グループの長さが揃えば結果はデータフレームになります。",
"status": "unsupported"
},
{
"name": "str",
"category": "その他",
"syntax": "str(object,...)",
"description": "任意の R オブジェクトの内部構造をコンパクトに表示します。【未対応の理由】戻り値は invisible な NULL で、本体は端末への表示という副作用であり、表示文字列を値として返すと実 R と異なる値になってしまうため（安易に文字列を返す実装はしない）",
"example": "str(1:12)",
"caution": "診断用の表示関数です。strOptions() で表示の既定値を変えられます。",
"status": "unsupported"
},
{
"name": "strOptions",
"category": "その他",
"syntax": "strOptions(strict.width = \"no\", digits.d = 3, vec.len = 4, list.len = 99, deparse.lines = NULL, drop.deparse.attr = TRUE, formatNum = function(x,...) format(x, trim = TRUE, drop0trailing = TRUE,...))",
"description": "str() の表示オプションをまとめて作る便利関数で、options(str =.) に渡して使います。【未対応の理由】セッション全体のオプション（options）という大域状態に依存し、値モデルで忠実に再現できないため",
"example": "strOptions(strict.width = \"wrap\")",
"caution": "戻り値はオプションのリストで、それ自体では表示は変わりません。",
"status": "unsupported"
},
{
"name": "strcapture",
"category": "データフレーム",
"syntax": "strcapture(pattern, x, proto, perl = FALSE, useBytes = FALSE)",
"description": "正規表現 pattern の捕捉グループで文字列ベクトル x からトークンを取り出し、proto（データフレーム）の列名と型に従って変換したデータフレームを返します。マッチしない行は全列 NA です。proto の列の型は、見本値か、data.frame(chr = character(), start = integer(),...) の形で直接渡した場合の型指定から判定します。",
"example": "strcapture(\"(.*?):([[:digit:]]+)-([[:digit:]]+)\", \"chr1:1-1000\", data.frame(chr = character(), start = integer(), end = integer()))",
"caution": "proto のデータ自体は無視されます。型が判別できない空列を含む proto を変数経由で渡した場合は名指しで停止します。因子・Date 型の列と useBytes = TRUE は未対応です。正規表現は JavaScript のエンジンで評価するため、POSIX の左端最長一致とは結果が異なる場合があります。",
"status": "supported"
},
{
"name": "type.convert",
"category": "型変換",
"syntax": "type.convert(x, na.strings = \"NA\", as.is, dec = \".\", numerals = c(\"allow.loss\", \"warn.loss\", \"no.loss\"), tryLogical = TRUE,...)",
"description": "オブジェクトを logical／integer／numeric／complex／character／factor のうち適切な型へ変換します。まず文字列化し、na.strings と空文字列を欠損として、logical（tryLogical）→ integer → numeric の順に全要素が受け入れられる最初の型を選びます。全要素が欠損なら logical になります。データフレームでは列ごとに再帰的に適用されます。",
"example": "type.convert(c(\"1\", \"2\"), as.is = TRUE)",
"caution": "as.is を省略すると実 R どおり警告（'as.is' should be specified by the caller; using TRUE）が出て TRUE として扱われます。as.is = FALSE で文字列のまま残る場合は因子への変換になるため名指しで停止します。複素数への変換も値モデルで表せないため停止します。",
"status": "supported"
},
{
"name": "type.convert.default",
"category": "型変換",
"syntax": "type.convert(x, na.strings = \"NA\", as.is, dec = \".\", numerals = c(\"allow.loss\", \"warn.loss\", \"no.loss\"), tryLogical = TRUE,...)",
"description": "type.convert のデフォルトメソッドです。ベクトルをまず文字列化し、logical → integer → numeric → complex の順に全要素が受け入れられる最初の型へ変換します（データフレーム・リストのメソッドは列・要素ごとにこれを適用します）。",
"example": "type.convert.default(c(\"TRUE\", \"F\"), as.is = TRUE)",
"caution": "as.is を省略すると警告が出て TRUE として扱われます。因子・複素数への変換は値モデルで表せないため名指しで停止します。",
"status": "supported"
},
{
"name": "write.table",
"category": "入出力",
"syntax": "write.table(x, file = \"\", append = FALSE, quote = TRUE, sep = \" \", eol = \"\\n\", na = \"NA\", dec = \".\", row.names = TRUE, col.names = TRUE, qmethod = c(\"escape\", \"double\"), fileEncoding = \"\")",
"description": "オブジェクトをデータフレームに変換してファイル（または接続）へ書き出します。write.csv／write.csv2 は区切りと小数点の既定値を変えたラッパーです。【未対応の理由】ファイル出力のため（基礎層の仮想ファイルストアは read.csv と cat の専用経路であり、write.table の書式規則まで含めて高度ハンドラからは到達できない）",
"example": "write.table(data.frame(a = 1:3), file = \"data.txt\")",
"caution": "file = \"\" はコンソールへの出力を意味します。数値は最大精度（15桁）で書かれます。",
"status": "unsupported"
}
];
