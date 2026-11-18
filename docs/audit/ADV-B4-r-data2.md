# ADV-B4 Rデータ班2（トピック M〜Z）報告書

担当：Rデータ班2。成果物は次の4ファイルのみ（GitHub書き込みなし）。

- `js/types/r/reference-advanced-part2.js`（高度リファレンス項目 part2）
- `js/types/r/names-advanced-part2.js`（高度名前一覧 part2）
- `tests/adv-b4-r-data2.test.js`（新規テスト：全4件緑）
- 本報告書

## 担当境界

- 棚卸し正本 `advanced-inventory/inventory-r.md`（base パッケージ436トピック）のうち、**トピック名（ヘルプページ名）の頭文字が M〜Z（大小文字不問）のもの全て**。最初の担当トピックは `make.names`、最後は `zutils`。
- 記号始まり・数字始まりのトピックは棚卸し全436件中に**存在しない**（全件が英字始まり）ため、境界の曖昧さは生じず、引き取り対象も無かった。
- 担当トピック数：**224件**。見出し（対象名）総数：**567件**。

## 件数内訳

| 区分 | 件数 |
|---|---|
| 担当トピック | 224 |
| 見出し総数 | 567 |
| 除外（関数名ではない見出し） | 87 |
| 基礎リファレンスに同名項目があり項目を作らなかった名前 | 16 |
| 名前一覧（names-advanced-part2） | **478** |
| リファレンス項目（reference-advanced-part2） | **464** |
| うち supported | 163 |
| うち unsupported | 298 |
| うち unverified | 3 |

- 項目のあるトピックは206件。残り18トピックは、全見出しが基礎既存（例：mean、names、sum）か全見出しが除外（例：Startup、Quotes、Syntax）か、項目対象が基礎名のみのため項目ゼロ。
- 基礎既存で項目を作らなかった16件：`%in%`（match）、`mean`、`is.na`・`NA`（NA）、`names`、`ncol`・`nrow`（nrow）、`NULL`、`as.numeric`（numeric）、`print`、`readline`、`rep`、`sample`、`seq`・`seq_len`（seq）、`sum`。いずれも基礎リファレンス実物（`js/types/r/index.js` の reference）に同名項目があることを確認した。課題文にある現行のみ存在する5件（median、read.csv、rnorm、runif、sd）は担当トピックに現れないため項目に含めていない。

## 一次情報と検証方法

- 一次情報は公式ヘルプ `https://stat.ethz.ch/R-manual/R-devel/library/base/html/<トピック>.html`（R-devel、base 4.6.0）。**担当224トピック全件を実際に取得・精読した**（Title／Description／Usage／Examples を機械抽出して照合）。**読めなかったトピックは0件**（未検証トピック一覧は「なし」）。
- syntax は各ページ Usage の代表形を転記（S3メソッドはメソッドの呼び出し形を転記し、長すぎる署名は代表形に簡約した旨を項目内でなく本書に記す）。
- 実 R を使用：**R 4.3.3**（`/usr/bin/Rscript`）。
  - 全464項目の example を実 R で構文解析（parse）し、全件合格。抽出過程で断片化した17件＋不整合37件は、実走可能な最小例に手当てした。
  - supported 項目の example は固定具（x／df／m 等）を用意して実走確認し、フィクスチャ不足以外の失敗が残らないことを確認した。
  - 疑わしい名前の実在を 4.3.3 の base 名前空間で照合した（下記「バージョン差異」参照）。

## バージョン差異（R-devel 4.6.0 ヘルプが正本、実走は 4.3.3）

次は R-devel ヘルプに実在するが **R 4.3.3 には存在しない**名前。正本（棚卸し・公式ヘルプ）に従い名前・項目に含めた。

- `anyMissing`（NA）、`%notin%`（match）、`is.string`（toString）、`sort_by`（sort_by）：4.3.3 の base 名前空間に無い（4.4以降／R-develで追加）。is.string の caution にはその旨を明記した。
- 逆に索引の別名見出しであり実在しないことを 4.3.3 でも確認したもの（`arccos`／`arcsin`／`arctan`、`intersection`、`atomic`、`localeconv` 等）は除外した。

## 除外した見出し（87件、関数名ではないもの）

理由の類型：ドキュメントトピック名・概念の別名見出し（Memory、Syntax、regex、Trig の Trig、Special、Reserved、tilde の tilde、typeof の type、UseMethod の S3Methods、vector の atomic、sets の intersection、name の name／symbol、matmult の matmult、Paren、pipeOp、Primitive の primitive、reg.finalizer の finalizer、Sys.localeconv の localeconv 等）、環境変数名（options の R_*／MC_CORES、Startup の R_*、timezones の TZ／TZDIR、Rhome の R_HOME、RdUtils の RD2PDF_INPUTENC）、起動ファイル・起動時オブジェクト名（Startup の Renviron／Rprofile／.First 等14件）、引用記号・リテラル記法（Quotes の8件、NumericConstants の 0x1／1i／1L）、語句見出し（path.expand の tilde expansion、utf8Conversion の code point／Unicode、UTF8filepaths の2件、timezones の time zone 等）、クラス文書・条件クラス名（srcfile の *-class 4件、StackOverflows の6件）、シェルコマンド（RdUtils の Rd2pdf／Rdconv は R の関数ではない）。全件の一覧と個別理由は生成時の照合表に基づき、テスト側の EXCLUDED 集合（87件）と一致することを機械照合済み。

## 名前一覧からの追加除外（2件）

- 定数 `NA`／`NULL` は基礎リファレンスに定数項目として存在するが、names 経由で FUNCTION_NAMES へ入れると、エンジンが「関数名を値として使う形」と誤判定し、`mean(..., trim = NULL)`、`seq_len(NULL)` 等の既存テスト5件が退行することを実測した。そのため names には入れない（網羅は基礎リファレンス側で担保。テストで「除外はこの2件だけ」であることを固定した）。

## status 裁定（SPEC 第6章の原則の適用）

- supported（163件）：値モデル（ベクトル・データフレーム・NA・未知値）で忠実に表せる純粋関数。文字列操作、数学関数、行列演算（QR／SVD／solve 含む）、並べ替え・集計、集合演算、型判定・型変換、適用関数（mapply／rapply／tapply／outer／sweep）など。
- unsupported（298件）：理由を名指しで全件に付けた。主な類型は、環境・検索パス・呼び出しスタック依存、言語オブジェクト（parse／quote／substitute／シンボル）、遅延評価・約束依存（missing／nargs／on.exit／with／subset／transform）、接続・実ファイル・デバイス・外部プロセス、パッケージ／名前空間操作、S3／S4 の任意クラスディスパッチとクラス前提オブジェクト（numeric_version、octmode、noquote、warnings、table クラス等）、Date／POSIXt クラス、factor 前提（nlevels）、raw 型、複素数（polyroot、NA_complex_）、乱数状態（set.seed 等）、セッション状態（options、警告履歴）、実行環境・時刻等の測定値。
- unverified（3件）：`.standard_regexps`（内部ユーティリティで意味論を一次情報で確定できない）、`.rangeNum`・`.unlist`（R-devel の Usage に現れるが実 R 4.3.3 の base 名前空間に存在せず実走で確定できない）。

## 裁定メモ（迷った名前と判断）

- **tapply／split／unsplit／table／rowsum／marginSums**：グループ変数は実 R では因子化されるが、値のベクトルによるグループ化として忠実に表せるため supported とした。因子そのものを前提とする `nlevels` は unsupported（因子が値モデルに無い）。
- **qr 系（qr、qr.coef 等11件＋qr.Q／qr.R／qr.X）**：分解自体は純粋な数値計算であり、結果オブジェクトはリスト構造として表せる前提で supported。`as.qr` のみ内部変換として unsupported とした。
- **switch／try／stopifnot／stop**：遅延評価やエラー機構を含むが、結果の意味論は AST レベルの実装で忠実に表せるため supported とし、caution／本メモに残す。実装班は値ハンドラではなくエンジン側の特殊形として扱う必要がある。
- **print.default／prmatrix**：print のデフォルトメソッドと旧式表示は、基礎 print の表示範囲で表せるため supported。クラス固有の print／summary メソッドは全て unsupported（S3 ディスパッチ）。
- **summary／sort／unique／rev／xtfrm 等の総称関数**：ベクトル・データフレームに対するデフォルトメソッドが純粋であるため総称関数自体は supported とし、クラス固有メソッドは unsupported に分けた。
- **message／warning 系**：出力副作用だけでなく条件（condition）機構とセッション状態に依存するため unsupported。基礎の print／cat（単なる出力）とは扱いを分けた。
- **textConnection／rawConnection**：棚卸しでは「実装」候補だったが、接続オブジェクト自体が値モデルに無いため unsupported とした（理由に明記）。
- **row.names**：基礎モデルの明記仕様（行名は未対応）に従い unsupported。
- **shQuote／gettextf**：文字列変換として純粋なため supported（gettextf の翻訳カタログが無い点は caution に明記）。
- **Paren の `(`／`{`**：基礎パーサがグループ化・ブロックとして受理する構文であるため supported（ドキュメント項目）。
- **`::`／`:::`／`|>`／`~`／`@`**：パーサが名指し停止する、または formula／名前空間／S4 スロットの意味論であり unsupported。
- **NotYetImplemented／NotYetUsed 系**：R 本体の未実装標識であり利用者向け計算機能ではないため unsupported（理由に明記）。
- **`.pretty`／`.mapply`／`.row`**：公式 Usage に現れ実 R でも公開されている内部版は、本体と同じ status とした。`.rangeNum`／`.unlist` は 4.3.3 に存在しないため unverified に分けた（上記）。

## テストと既存テストへの影響

- 新規テスト `tests/adv-b4-r-data2.test.js`：全4件緑。内容は、件数・status 内訳、スキーマ検証（必須フィールド、status と supported の一致、reason の必須条件、topic が担当224件に含まれること、基礎との重複なし）、names が自 part の項目名を全て含むこと、棚卸し実物からの機械抽出による網羅照合（567見出し ＝ 除外87 ＋ 定数省略2 ＋ names 478 と一致し、基礎に無い名前は項目ちょうど1件）。
- 既存 R テストへの影響：関連テスト群（batch12-r／13-r／3-r〜6-r、muse-fix-r、fc-rjs、pyr 2件）を、part2 をスケルトンに戻した対照実行と比較し、**pass／fail 件数が完全一致**することを確認した（作業ツリーは他班の統合途中で、対照側にも既存の失敗がある。本班の追加による新規失敗はゼロ。NA／NULL を names に含めた初期版では5件の退行が出たため、上記のとおり除外して解消した）。

## 残存・コーディネーターへの申し送り

- supported と宣言した163件は実装班（functions-advanced-*）との機械照合対象。特に適用関数系（FUN 引数）、qr 系（リスト構造の結果オブジェクト）、switch／try（特殊形）は実装方式の裁定が必要。
- unverified 3件は、R 4.4以降の実走環境が用意できれば再裁定可能。
- 角度カタログのうち本班の変更表面に当たらないもの（E群の保存・公開・テーマ、D群のモード機構等）は対象外（理由：B4 はデータとエンジンに閉じ、本班はデータファイルのみを変更したため）。
