# ADV-B4S smisc 班報告書（R stats：多変量・クラスタ・その他）

- 担当スライス：`work/b4s-notes/slice-smisc.json`（49 トピック／91 名）
- 成果物：
  - `js/types/r/reference-advanced-part8.js`（91 項目）
  - `js/types/r/names-advanced-part8.js`（85 名）
  - `js/types/r/functions-advanced-statsmisc.js`（実装 6 関数）
  - `tests/adv-b4s-smisc.test.js`（16 テスト）
- 照合環境：実 R 4.3.3（`/usr/bin/Rscript`）実走＋ R 本体ソース
  （stats パッケージの R/fft.R・R/ppoints.R・R/mahalanobis.R・R/symnum.R・
  R/selfStart.R・src/fourier.c）＋公式ヘルプ Usage。

## 1. 件数内訳（名前単位）

| 区分 | 件数 |
|---|---|
| 対応（supported） | 6 |
| 未対応（unsupported） | 85 |
| 未検証（unverified） | 0 |
| 合計（スライス全名） | 91 |

スライス 91 名 ↔ リファレンス 91 項目の集合一致、B4 part1／part2
（1,085 項目）および基礎層との重複ゼロを機械照合で確認した。

## 2. 実装した関数と照合根拠（全て実 R 4.3.3 実走で検証）

| 関数 | 照合根拠 |
|---|---|
| convolve | 実測（公式例の移動平均、open／circular／filter、conj 切替、名前伝播、NA／NaN の全要素伝播、type の match.arg 規則とエラー文言）＋ fft.R の定義。直接和で定義どおり再現（FFT 本体は使わない） |
| ppoints | 実測（n=1／4／10／11 の a 切替境界、非整数 n、ベクトル n、a の二重リサイクルと警告2回、NA／長さ0／文字列のエラー）＋ ppoints.R |
| nextn | 実測（切捨て、factors の順序依存＝非互素で非最小、文字列 factors の受理、NA の型エラーと要素 NA の区別、2^53）＋ fourier.c の C 実装（int 経路／double 経路の分岐条件まで再現） |
| mahalanobis | 実測（ベクトル x は1行の観測、data.frame の cov 受理、特異／計算特異のエラー順序と文言、center の sweep リサイクル警告、tol の `...` 経由、結果名は明示 rownames のみ）＋ mahalanobis.R |
| symnum | 実測（corr 既定経路、区間境界は (c_j, c_{j+1}]＋最初の区間のみ左端含む、p 値の星印例、論理値経路、show.max=FALSE でも format(maxc) になる分岐）＋ symnum.R |
| sortedXyData | 実測（グループ平均、NA 行と全 NA グループの消失、data 引数の無視、文字列の数値化）＋ selfStart.R |

テスト中に見つけて修正した実装バグ：symnum の区間判定が境界値を
右隣の区間に誤って割り当てていた（cut の規則に合わせて修正し、
境界値ケースをテストに追加）。

裁定メモ：
- toeplitz は当初実装候補だったが、返り値が行列（実測 class "matrix"）で
  値モデルに表現できないため未対応に裁定（B4 の array 等の前例と同じ）。
- fft／mvfft は複素数を値モデルで表せないため未対応。
- cmdscale は条件により座標行列またはリストを返すため未対応。
- symnum は "noquote" クラスと legend 属性を再現せず通常の文字列
  ベクトルとして返す制限つきで対応（caution に明記）。
- sortedXyData は式形式とクラス属性を除き、2列データフレームとして対応。

## 3. 未対応の理由類型（85 件）

| 類型 | 件数 | 例 |
|---|---|---|
| モデルオブジェクト／クラス付きリスト／モデル結果のリスト（とそのメソッド） | 46 | hclust、kmeans、prcomp、princomp、factanal、dendrogram 系メソッド群 |
| グラフィックス（描画・対話操作） | 18 | biplot、heatmap、plot.*、qqnorm、qqline、qqplot、screeplot |
| dist オブジェクト（クラス＋属性の下三角形式） | 6 | dist、as.dist、print.dist |
| 文書見出し・クラス名（呼び出せる関数でない） | 5 | stats-package、stats、stats-deprecated、dendrogram、listof |
| formula／terms・因子と属性に依存 | 4 | factor.scope、add.scope、drop.scope、C |
| 行列を返す | 2 | toeplitz、toeplitz2 |
| 複素数を返す | 2 | fft、mvfft |
| ts クラスに依存 | 2 | print.ts、.preformat.ts |

未対応の 79 名（names 収録分）はテストで「このR関数は説明に対応して
いません：<名前>」の名指し停止を固定し、誤った値を返さないことを確認した。

## 4. names からの除外（6 名）と理由

名前空間照合（実 R で stats 名前空間の実在を確認）の結果：
- `dendrogram`、`listof`：クラス名であり関数でない。
- `stats`、`stats-package`、`stats-deprecated`：文書見出し／パッケージ名。
- `[[.dendrogram`：関数として実在するが S3 ブラケットメソッドのため
  ブリーフのキュレーション規則により除外。

上記 6 名はリファレンス項目としては作成し unsupported とした
（names は 91 − 6 = 85 件）。

## 5. テスト結果

- `tests/adv-b4s-smisc.test.js`：16 件全て合格。
- R 関連既存テスト（adv-b4-*、muse-fix-batch*-r 等）：集約への配線を
  検証用コピー上で行って実行し、回帰のないことを確認（全体の
  `npm test` はコーディネーター担当のため未実施）。

## 6. 残存（既知の割り切り）

- nextn：長さ2以上の全 NA ベクトルは実 R では型エラーになるが、
  モデルの NA は型を持たないため NA 結果に倒した。n = Inf は実 R 自体が
  終了しないため名指し停止。2^53 超の探索は精度限界のため名指し停止。
- mahalanobis：相互条件数は LAPACK の推定と末尾桁が異なり得る
  （エラー種別は一致）。`...` の tol は完全一致と接頭辞のみ対応。
  5番目以降の位置引数（実 R では solve の b として次元エラー）は
  名指し停止に倒した（安全側の意図的な相違）。
- symnum：legend 属性・"noquote" クラス・行列適用（列名略記／下三角）は
  再現しない。show.max=TRUE 時の format(v, digits=1) は formatRNum で代用。
- ppoints：文字列スカラー n の辞書順比較に依存する病理ケースは
  実 R と異なり得る。
- convolve：純 NA の論理値ベクトルは実 R では複素数 NA だが、
  表示が同じため数値 NA として処理した。
- sortedXyData：x のグループ化は15有効桁の文字列化経由
  （実 R の as.character 経由 tapply を再現）。
- `.preformat.ts` は先頭が "." のためシミュレータのパーサが呼び出し式
  として解釈できず構文エラーになる（誤った値は返らない。テストで固定）。

## 7. コーディネーターへの申し送り

- 集約ファイル（functions-advanced.js／names-advanced.js／
  reference-advanced.js）への part8 の配線は未実施（契約どおり
  コーディネーター担当）。本班の検証は作業ツリーのコピー上で
  一時配線して行った。共有ツリーの集約ファイルは、検証時に一時
  配線した分も含め、最終状態では本班による変更を含まないことを
  確認済み（2026-11-18 時点で集約側は part1／part2／part7 等の
  統合が進行中）。
