# ADV-B4 R実装班3（データ・型・適用）報告書

担当：R 高度関数グループ「データ・型・適用」（`js/types/r/functions-advanced-data.js`）
テスト：`tests/adv-b4-r-eng3.test.js`（17テスト群）
GitHub への書き込みは行っていない。編集したのは担当3ファイルのみ。

## 実 R の使用

- 使用した：**R 4.3.3**（`/usr/bin/Rscript`、R version 4.3.3 (2024-02-29)）。
- 期待値と端の意味論は、公式ヘルプ（stat.ethz.ch R-manual、base）と
  実 R 4.3.3 の実測で裁定した。主な実測は本文の各所に根拠として記す。

## 担当名の確定リスト（機械抽出）

データ班2ファイル（reference-advanced-part1.js／part2.js、全1,082件）から、
担当ドメイン（型判定・型変換／ベクトル・データフレーム操作／環境アクセス／
適用・グループ化）に関わるトピック集合
（append, apply, cbind, colSums, dim, lengths, nrow, merge, mode, typeof,
NULL, numeric, vector, character, double, integer, logical, list, lapply,
mapply, tapply, split, outer, table, sweep, scale, exists, get, environment,
assign, ls, as.data.frame, class, colnames, Extract, unlist, rapply, by, drop,
matrix, array, expand.grid, list2DF, array2DF, data.matrix, funprog,
is.recursive, factor, ifelse, rowsum, tabulate, proportions, identity,
levels, strtoi, is.unsorted）で機械抽出した **148件** を担当確定リストとする。
うち本班がハンドラを登録したのは **77件**（下表）。基礎層で実装済みの名前
（c, sum, mean, median, sd, seq, seq_len, rep, length, is.na, as.numeric,
as.character, print, cat, data.frame, nrow, ncol, names, read.csv）には
登録していない。

なお指示書の例示にあった **head／tail／stack はデータ班2ファイルに項目が
無い**（いずれも base パッケージでなく utils 側の関数のため base インベントリ
対象外）。カタログに無い名前をエンジンだけに登録すると F-02 の3方向突合で
不整合になるため、本班では実装せず申し送りとする（下記）。

## 実装した名前（77件）

| 区分 | 名前 |
|---|---|
| 型情報 | typeof, mode, storage.mode, class |
| 型判定 is.* | is.numeric, is.double, is.integer, is.character, is.logical, is.list, is.data.frame, is.vector, is.atomic, is.recursive, is.null, is.array, is.matrix, is.factor, is.ordered |
| 型変換・生成 | numeric, double, single, integer, character, logical, vector, as.double, as.single, as.integer, as.logical, as.null, as.vector, strtoi |
| ベクトル・DF操作 | append, lengths, NROW, NCOL, dim, colnames, rownames, getElement, drop, identity, levels, ifelse, is.unsorted, cbind, rbind, merge, expand.grid, unlist |
| 集約（DF／平坦） | colSums, rowSums, colMeans, rowMeans, .colSums, .rowSums, .colMeans, .rowMeans, rowsum, tabulate, proportions, prop.table |
| 変換系 | sweep, scale |
| 適用・グループ化 | tapply, table, sapply, vapply, mapply, apply |
| 環境アクセス | assign, get, get0, exists, ls, objects |

## 型対応表（値モデル → 実 R の規則）

値の種別は要素から決まる（ベクトルは c() の共通型変換で均質なことが前提）。

| モデル上の値 | typeof | mode | storage.mode | class | is.list | is.vector | is.atomic | is.recursive |
|---|---|---|---|---|---|---|---|
| 数値ベクトル／数値スカラー（NaN・Inf 含む） | "double" | "numeric" | "double" | "numeric" | FALSE | TRUE | TRUE | FALSE |
| 文字列ベクトル | "character" | "character" | "character" | "character" | FALSE | TRUE | TRUE | FALSE |
| 論理ベクトル／NA スカラー | "logical" | "logical" | "logical" | "logical" | FALSE | TRUE | TRUE | FALSE |
| データフレーム | "list" | "list" | "list" | "data.frame" | **TRUE** | FALSE | FALSE | TRUE |
| NULL | "NULL" | "NULL" | "NULL" | "NULL" | FALSE | FALSE | **TRUE** | FALSE |
| 長さ0ベクトル | "double"（規約） | "numeric" | "double" | "numeric" | FALSE | TRUE | TRUE | FALSE |

根拠・注記：
- is.list(データフレーム)=TRUE、is.atomic(NULL)=TRUE、is.vector(NULL)=FALSE、
  typeof(NA)="logical"、class(NULL)="NULL" はいずれも実 R 4.3.3 実測どおり。
- **integer 型はモデル化されていない**（基礎層宣言どおり）：実 R では
  `1:3` の typeof は "integer" だが、本モデルでは全て double として表す。
  したがって is.integer は全入力に FALSE、is.double は数値に TRUE、
  sapply(1:3, "typeof") は "double" を返す（実 R の "integer" と異なるのは
  モデル側の既知の制約であり、基礎層の `:`／seq の表現と一貫する）。
- **長さ0ベクトルは型情報を持てない**（numeric(0) も character(0) も
  同じ [] になる）。typeof 等は numeric(0) 相当として扱う規約とし、
  未確定事項に挙げる。
- is.array／is.matrix／is.factor／is.ordered は、dim 属性・因子がモデルに
  存在しないため全入力 FALSE が忠実な写像（実 R でも通常ベクトル・
  データフレームに対して FALSE。実測で確認）。

## 環境アクセス調査の結論

基礎実装（js/types/r/index.js の高度ディスパッチ）を読むと、ハンドラには
`ctx.s`（シミュレーション状態）が渡り、`s.vars` が変数環境そのものである。
実証テストで次を確認した：

- `assign("y", 42)` の後、`print(y)` と `get("y")` が 42 を返し、最終状態の
  vars にも y=42 が残る（**書き込みが後続の評価へ一貫して反映される**）。
- `get("x")` は通常の代入で作った変数も読める。`ls()` は s.vars のキーと
  一致する。

よって既定引数の範囲では assign／get／get0／exists／ls／objects を忠実に
写像できると裁定し実装した。写像の範囲と名指し停止：

- exists の探索範囲は「ユーザ変数＋予約定数・base のデータオブジェクト
  （pi, letters, LETTERS, month.abb, month.name）＋実在関数名（基礎の
  FUNCTION_NAMES と高度カタログ名）」。実測 exists("mean")=TRUE に対応。
  mode 引数は any／function／型名の範囲で解釈する。
- get が関数名に当たった場合は関数オブジェクトを返せないため名指し停止。
  見つからない名前は実 R どおり `object '<name>' not found` で停止。
- envir／pos／where／frame 引数が指定された形、assign の inherits=TRUE は
  写像できないため名指し停止。assign の予約語（TRUE 等）への代入は実 R では
  成功するが、シミュレータの定数解決を壊すため名指し停止にした（相違点）。
- mget（リストを返す）、dynGet、rm（言語オブジェクトで名前を受ける）は
  実装しない（データ班の unsupported 宣言を支持）。

## 実装しなかった名前と名指し理由

### A. データ班が supported と宣言したが、値モデルの制約で再裁定した36件（申し送り）

結果がリスト／行列／配列／因子になる、または関数値を要するため、
本モデルでは忠実に表せない。データ班宣言との不一致として監査の裁定を仰ぐ。

- **リストを返す**：list, as.list, pairlist, as.pairlist, is.pairlist
  （is.pairlist はペアリストが存在しないため FALSE が忠実だが、宣言との
  整合のため登録を見送った）、alist（遅延評価の約束）, lapply（一般形は
  リストを返す。sapply／vapply の簡約形のみ本班で実装）, simplify2array,
  rapply, Filter, Find, Map, Negate, Position, Reduce（いずれも関数値を要する）
- **行列・配列を返す**：array, as.array, as.matrix, matrix, outer, %o%,
  data.matrix, array2DF, list2DF（リスト入力が本質）, .mapply（dots リスト）
- **因子を返す**：factor, ordered, as.ordered, addNA, Ops.ordered,
  Summary.ordered（is.factor／is.ordered の FALSE 判定のみ実装した）
- **分割結果がリスト**：split, unsplit
- **代入演算子（関数ではない）**：$<-, [<-（基礎層の write 経路で受理済み。
  ハンドラ登録の対象ではない）
- **replicate**（lapply トピック）：第2引数が遅延評価の式であり、評価済みの
  値しか受け取れないハンドラ契約では再評価できないため。

### B. 経路単位の名指し停止（実装済み関数の中の非対応形）

- cbind／rbind：ベクトル同士は行列を返すため停止。データフレーム同士と、
  データフレーム＋ベクトル（列名が argName または式の deparse で決まる形）
  のみ実装。cbind の重複列名は実 R では重複のまま残るが、モデルの列は
  オブジェクトのため基礎層の添字選択と同じく `.1` サフィックスで一意化する
  （表現上の相違点として明記）。
- apply：データフレーム入力＋文字列 FUN のみ（ベクトル入力は実 R どおり
  `dim(X) must have a positive length` で停止）。
- sweep：データフレーム入力のみ。実 R では次元の無いベクトルはエラーに
  なることを実測で確認したため、ベクトル形は名指し停止（指示書の候補とは
  異なるが実 R 優先）。FUN は四則演算子の文字列のみ。
- scale：実 R は常に行列＋属性（scaled:center 等）を返すが、指示書の裁定
  指針に従い「値の部分集合」としてベクトル→ベクトル、データフレーム→
  データフレームで実装した。**形状と属性は再現していない**（申し送り）。
  中心化・尺度因子の数値規則は実測で確認（center=TRUE の因子は
  sqrt(Σ(x−x̄)²/max(1, n−1))、center=FALSE, c(3,4) で因子5、scale(5)=NaN）。
- tapply／sapply／vapply／mapply：FUN は文字列指定（match.fun の文字指定は
  実 R でも合法）の単純な集計ホワイトリストのみ。bare な関数名は基礎層の
  read フックが「関数名 sum を値として使う形（apply系の関数名引数など）」
  で名指し停止する（実測で確認）。simplify=FALSE／SIMPLIFY=FALSE は
  リストを返すため停止。tapply の複数グループ化列（データフレーム INDEX の
  2列以上）は配列を返すため停止。vapply の FUN.VALUE 長さ≠1 も同様。
- table：1ベクトル（または1列データフレーム）のみ。複数ベクトルは
  多次元表になるため停止。NA と NaN は別水準で、並びは通常水準→NaN→NA
  （実測）。useNA="always" は NA 水準を0件でも出すが NaN 水準は実在時のみ
  （実測）。
- merge：データフレーム同士のみ。incomparables は停止。
- expand.grid：文字列列は stringsAsFactors=FALSE のときのみ（既定では
  因子になるため停止）。KEEP.OUT.ATTRS の属性は再現しない。
- as.vector：データフレーム入力は実 R ではリストを返す（実測）ため停止。
- rowsum：ベクトル入力のみ（実 R は1列行列を返す。値とグループ名は一致）。
  NA グループは実測どおり残し、警告 "missing values for 'group'" を出す。
- proportions／prop.table：ベクトル入力のみ。

### C. データ班の unsupported 宣言を支持し実装しなかったもの（担当ドメイン内）

by, print.by, cbind.data.frame, rbind.data.frame, inherits, isa, nameOfClass,
oldClass, unclass, .class2（class 本体は下記 D で再裁定）, 環境系
（baseenv, emptyenv, env.profile, environment, environmentName, globalenv,
is.environment, new.env, parent.env, .BaseNamespaceEnv, .GlobalEnv）,
dynGet, mget, as.data.frame 群（as.data.frame, as.data.frame.AsIs,
as.data.frame.table, as.table, is.table, print.summary.table, summary.table,
[.table, [.Dlist, [.listof, [.simple.list）, 因子メソッド群
（as.factor, c.factor, Math.factor, Ops.factor, Summary.factor,
.valid.factor）。

理由はデータ班の宣言どおり（S3 ディスパッチ／環境オブジェクト／クラス
属性に依存）。as.data.frame 系のうち is.data.frame の判定だけは下記 D で
再裁定した。

### D. データ班が unsupported と宣言したが再裁定して実装した8件（申し送り）

値モデルの範囲では忠実に写像できるため実装した。宣言との不一致として
監査の裁定を仰ぐ。

- **class**：モデル値の class は一意に決まる（型対応表）。S3 クラスの
  一般論には踏み込まない。
- **is.data.frame**：データフレームかどうかは値の種別そのもの。
- **assign, get, get0, exists, ls, objects**：環境アクセス調査（上記）の
  結論に基づく。データ班の理由は「環境に依存」だったが、シミュレータ
  状態への写像が一貫することを実証したため、既定引数の範囲に限って実装。

### E. ドット始まり名の到達不能（申し送り）

.colSums／.rowSums／.colMeans／.rowMeans はハンドラを登録したが、
**共有パーサのトークナイザが `.colSums` を `.` と `colSums` に分割する**
ため、現状の文法では呼び出しが到達不能である（実測：tokenize で確認、
simulate では「式を解釈できません：.」で停止）。パーサ側の制約であり
本班の担当外。登録自体は残してあるので、パーサがドット始まり識別子を
受理するようになればそのまま動く。

### F. unverified（1件）

- **.unlist**（データ班も unverified）：内部変種であり一次情報で意味論を
  確定できないため実装しない。unlist 本体は実装済み。

## 端の意味論で裁定した点（根拠つき）

1. **append の名前**：名前なし要素の名前は ""（実測 append(c(a=1,b=2), 9,
   after=1) の名前は a, "", b）。
2. **lengths(1:3) は c(1,1,1)**（エラーではない。実測）。lengths(df) は
   列ごとの長さに列名が付く。
3. **cbind の列名**：名前なしベクトル引数の列名は式の deparse（実測
   cbind(df, 10:11) の列名は "10:11"）。AST からの簡易 deparse で再現。
4. **rbind は列名で照合**する（実測：列順の違う2つの df が名前で揃う）。
   行名は全て既定のとき暗黙の連番のまま（実測 rbind(df, df) の行名は
   "1"〜"4"）。
5. **merge の NA キーは NA に一致**する（match の規則。実測）。
   既定は共通列すべてが by、sort=TRUE で by 昇順（NA は最後）。
6. **colSums の文字列表**は実測どおり `'x' must be numeric` で停止。
   colSums(ベクトル) は `'x' must be an array of at least two dimensions`。
7. **ifelse は test の名前を引き継ぐ**（実測）。NA の test は NA。
8. **is.unsorted**：NA を含むと NA（na.rm=FALSE）、実測で確認。
9. **as.integer の範囲外**は NA＋警告 "NAs introduced by coercion to
   integer range"（実測）。as.integer(NaN) は警告なしで NA（実測）。
   as.logical("1") は NA（実測）。
10. **strtoi の base=0** は 0x→16進・先行0→8進（実測 "010"→8）。
11. **getElement(df, "zz") は NULL**（エラーではない。実測）。
12. **drop はベクトル・データフレームとも恒等**（実測）。

## テスト結果

- 担当テスト `tests/adv-b4-r-eng3.test.js`：**17テスト群すべて通過**。
- 既存 R テスト `tests/muse-fix-batch13-r.test.js`：30件中29件通過。
  失敗1件は `sqrt(readline())` の R7-80 アサーションで、eng1 が sqrt を
  実装したことに伴う既知の申し送り（eng1 報告書の申し送り2）と同一。
  ベースツリー（repo-reffix）では30/30通過すること、本班のファイルを
  スケルトンに戻しても結果が変わらないことを対照確認した（本班起因でない）。
- 併せて adv-b4-r-eng1.test.js は17/17通過（本班の変更による退行なし）。
  adv-b4-r-data1／data2 のテスト失敗（2件／3件）は、本班のファイルを
  スケルトンに戻しても同一に再現する既存の状態であり、本班起因ではない。

## 未確定事項

1. 長さ0ベクトルの型（型対応表の規約）：numeric(0) 相当として扱った。
   character(0) を作って typeof を取るような使い方はモデルでは区別
   できない。
2. 文字列の照合順序（tapply／table／rowsum／merge の整列）はロケール
   依存であり、本実装はコード順（C ロケール相当）で近似した。
3. merge の by 列の型が数値×文字列のように異なる場合の共通型変換は
   c() の規則で近似した（実 R の match 規則の全域は未検証）。
4. scale の属性（scaled:center／scaled:scale）と行列形状は再現して
   いない（B 節参照）。後続で属性を使うコードは続かない。
5. sapply(1:3, "typeof") 等、整数が絡む結果はモデルの double 表現に
   従う（型対応表の注記参照）。
