# ADV-B4 Rデータ班1 報告書（トピック A〜L）

担当：高度モード ブロックB4・Rデータ班1。成果物は次の4ファイルのみ（GitHub書き込みなし）。

- `js/types/r/reference-advanced-part1.js`（高度リファレンス項目 part1）
- `js/types/r/names-advanced-part1.js`（高度名前一覧 part1）
- `tests/adv-b4-r-data1.test.js`（新規テスト、全緑）
- 本報告書

## 担当境界

- 棚卸し（`advanced-inventory/inventory-r.md`、base パッケージ436トピック）のうち、トピック名の頭文字が **A〜L**（大文字小文字を区別しない）のもの全て。
- **最初のトピック：`abbreviate`**、**最後のトピック：`ls`**。担当トピック数 **212**。
- 境界の曖昧さ対応：
  - 棚卸し全体（436件）に記号・数字で始まるトピックは存在しないことを機械確認した（落としなし）。
  - 小文字始まりのトピック（`abbreviate`、`agrep` 等）も全て自班で引き取った。
  - 棚卸し備考欄は Markdown の表であり、`|` を含む名前は `\|` とエスケープされていた。素朴に `|` で割ると `%||%`、`|`、`||`、`|.hexmode` が化けるため、Control／Logic／hexmode の3トピックはエスケープを復元して正本の名前で収録した（テスト側の抽出も同じ復元を行う）。

## 件数内訳

| 種別 | 件数 |
|---|---|
| 担当トピック | 212 |
| 棚卸しの関数名行（担当分、エスケープ復元後） | 731 |
| 名前一覧 `names`（part1） | **641** |
| リファレンス項目（基礎に同名が無いもの） | **618** |
| うち supported | 200 |
| うち unsupported（名指し理由つき） | 416 |
| うち unverified（名指し理由つき） | 2 |

- 名前一覧には基礎リファレンス既収録の名前（`c`、`cat`、`data.frame`、`length` 等23件）も含む（Set統合前提、重複は無い）。
- 項目は基礎リファレンス44件と同名重複ゼロ（テストで機械照合）。

## 一次情報と検証方法

- 一次情報：公式ヘルプ `https://stat.ethz.ch/R-manual/R-devel/library/base/html/<トピック>.html` を **212トピック全て取得成功**（curl、Title／Usage／Description／Examples を実際に読んで作成）。
- **ヘルプを読めなかったトピック：なし。**
- ただし、レンダリング済みヘルプ本文に別名として現れない S3 メソッド名が110件あった（例：`[.Date`、`print.by`、`format.Date`）。これらは実 R で実在確認した（次項）。確認できなかったのは棚卸しのエスケープ由来トークン3件のみで、関数名ではないため除外した（上記の境界対応を参照）。
- 実 R：**R 4.3.3**（`/usr/bin/Rscript`、コーディネーター通知により使用）。
  - 全618件の `example` を `parse()` で検証し、全件パース成功（当初59件の抽出アーティファクトは、公式 Examples の簡約または最小例への差し替えで解消）。
  - 本文に現れないメソッド名110件中107件を base 名前空間／S3レジストリで実在確認。残り `Math.POSIXlt`、`summary.difftime` は R 4.3.3 には無く、R-devel ヘルプに別名として記載があるもの。いずれも S3 メソッドとして unsupported で収録し、本メモを裁定根拠とする。
  - `str.POSIXt` は名前空間の一覧には現れないが `getS3method` で取得できることを確認した。

## 名前一覧から除外したもの（90件、黙っての棚上げではない）

関数名ではないため `names` に入れなかった。内訳はテストファイル内の `EXCLUDED`（topic:name 形式）に全件明記し、網羅テストはこの除外リストを前提に照合する。

- 概念・文書トークン：`fuzzy matching`、`Arithmetic`、`collation`、`Comparison`、`Control`、`Bessel`、`bessel`、`colon`、`Extract`、`Subscript`、`Logic`、`dots`、`date-time`、`time interval`、`long vector(s)`、`language object(s)`、`enclosure`、`promise`、`promises`、`Autoloads`、`locales`、`connection`、`connections`、`closure`、`else`、`in`、`finite`、`infinite` 等。
- 環境変数名（EnvVar／gctorture／icuSetCollate／libPaths トピック）：`HOME`、`R_USER`、`R_GCTORTURE`、`R_LIBS` 等 41件。R の関数ではない。
- クラス名：`Date`、`Dates`、`POSIXct`、`POSIXlt`、`POSIXt`。
- グループジェネリック名・機構名（groupGeneric／InternalMethods トピック）：`Math`、`Ops`、`Summary`、`Complex`、`matrixOps`、`.Group`、`.S3PrimitiveGenerics` 等。
- 文書のみトピックの名前：`base-package`、`base`。

## status 裁定（SPEC 第6章の原則）

- **supported（200件）**：値モデル（ベクトル・行列・因子・データフレーム・リスト・NA・未知値）で忠実に表せる純粋関数に限った。例：`abbreviate`、`agrep`、`append`、`backsolve`、`besselI` 等のベッセル関数、`bitw*`、`chol`、`colSums` 系、`cut`、`diag`、`findInterval`、`grep` 系、`gl`、`interaction`、`kappa`、`kronecker`、`lapply` 系、`Log` 系、`Hyperbolic` 系、`Extremes` 系、`funprog` 系、`formatC`／`prettyNum`、`ISOdate` を除く日付非依存のもの、演算子（`%%` 等の基礎既収録を除く `*`、`^`、比較演算子、論理演算子、`%||%`、代入演算子）。
- **unsupported（416件）**：理由を名指しで全件に付けた。主な類型：
  - 環境・検索パス・名前解決（`assign`、`attach`、`environment` 系、`get`、`ls`、`library` 等）
  - 言語オブジェクト・約束（promise）・遅延評価（`call`、`eval` 系、`expression`、`delayedAssign`、`force`、`dots`、`bquote`、`formals`、`body` 等）
  - 接続・ファイルシステム・外部リソース（`connections` 系、`files` 系、`dcf`、`list.files`、`getwd` 等）
  - 外部ネイティブ呼び出し（`.Call`、`.External`、`.C`、`.Fortran`、`dyn.load`、DLL 照会系）
  - 任意クラスへの S3 ディスパッチ／S3 メソッド（`all.equal`、`as.data.frame`、`format`、および `[.Date`、`print.*`、`Math.factor` 等のクラス別メソッド全件）
  - クラス表現を値モデルが持たないもの（Date／POSIXct／POSIXlt／difftime／complex／hexmode／AsIs）
  - セッション・ビルド・ロケール等の環境照会（`capabilities`、`gc` 系、`commandArgs`、`locales`、`gettext`、`iconv` 等）
  - 文書のみ（`base-package`、`contributors`、`copyright`、`license`、`LongVectors`）
- **unverified（2件）**：
  - `grouping`：返り値の属性（grouping 情報）の正確な表現を値モデルで確定できなかったため。
  - `format.info`：整形情報の正確な内訳を一次情報だけで確定できなかったため。

## 裁定メモ（迷った名前と判断）

- `basename`／`dirname`／`file.path`：ファイル系だが実在確認をしない純粋な文字列操作のため supported。`file.*` の実ファイル操作系は全て unsupported と区別した。
- `cat`：基礎リファレンス既収録のため項目は作らない（名前一覧には含む）。file 引数での出力は接続依存だが、本体は基礎層の裁定に従う。
- `cbind`／`rbind`：データフレーム結合は基礎の値モデルで表せるため supported とし、`cbind.data.frame`／`rbind.data.frame` のメソッド名は S3 として unsupported に分けた。
- `jitter`：乱数で結果が未確定値になるが、基礎層の `rnorm` 等と同じ扱い（未確定値として表せる）ため supported。
- `eigen`：一般に行列の固有値が複素数になり得て、複素数を持たない値モデルで忠実に表せないため unsupported。
- `identical`：環境・外部ポインタを含む同一性判定を含むため unsupported（数値等の純粋比較だけなら表せるが、関数の意味論全体は表せないため厳しめに倒した）。
- `dontCheck`：意味論は `identity` と同一と公式に明記されているため supported。
- `is.single`：R に単精度型が無く呼び出すとエラーになる仕様のため unsupported。
- `apply`／`lapply` 系：基礎エンジンの IMPLEMENTED に同系関数があり、関数適用は値モデルで表せるため supported。ただし FUN に任意関数を取るため、実装側では基礎の関数適用機構の範囲に限られる点はコーディネーター監査に委ねる。
- 定数（`letters`、`LETTERS`、`month.abb`、`month.name`、`pi`）：値として表せるため supported。`month.name` はロケール依存の注記を caution に書いた。
- ロケールカテゴリ名（`LC_ALL` 等）：文字列定数として名前一覧に収録し、項目は `locales` トピックの unsupported（プロセスのロケール状態に依存）を継承した。

## テスト

`tests/adv-b4-r-data1.test.js`（node --test で **5件全緑**）：

1. 全項目のスキーマ検証（必須フィールド、status と supported の一致、unsupported／unverified の reason 必須、topic が A〜L 範囲内）。
2. 項目名の重複なし・基礎リファレンスとの重複なし。
3. `names` の重複なし・全項目名を含むこと。
4. 網羅検証：棚卸しファイルを機械抽出（`\|` エスケープ復元つき）し、担当731名が「基礎リファレンス ∪ names」に、文書化した除外90件を除いて漏れなく現れること。
5. 全項目の topic が棚卸しの A〜L トピックに実在すること。

集約ファイル経由でも確認済み：`names-advanced.js` の `advancedNames` に part1 の641件、`reference-advanced.js` の `referenceAdvanced` に part1 の618件が統合される。

## 残存・未確認

- ヘルプ未読トピック：**なし**（212件全て取得・精読）。
- unverified 項目：`grouping`、`format.info` の2件（理由は上記）。
- R 4.3.3 に存在しないが R-devel ヘルプに別名のあるメソッド：`Math.POSIXlt`、`summary.difftime`（unsupported で収録済み、根拠は本報告書）。
- example はパース検証までで、全件の実走（意味論）検証はしていない。ヘルプ Examples 由来の式は未定義変数を含むものがあるため、実走照合は実装班・監査側の実 R 照合（SPEC 第7章 A-03）に委ねる。
