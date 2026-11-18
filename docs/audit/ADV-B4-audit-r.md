# ADV-B4 R監査班 報告書

対象：プログラミング練習アプリ 高度モード ブロックB4 の R 側（宣言の最終裁定・ブロック内修正）。
基準：実 R 4.3.3（`/usr/bin/Rscript`）＋公式ヘルプ（stat.ethz.ch／R-devel）。
GitHub への書き込みは行っていない。

## 1. 最終件数

| 区分 | 監査前 | 監査後 |
|---|---|---|
| 項目総数 | 1,082 | **1,085**（+3：項目追加） |
| 対応（supported） | 363 | **240** |
| 未対応（unsupported） | 714 | **845** |
| 未検証（unverified） | 5 | **0** |
| ハンドラ（重複解消後の実登録） | 213 | **220** |
| names | 929（509+420） | **929**（507+422） |

内訳：part1＝618件（対応129／未対応489）、part2＝467件（対応111／未対応356）。

## 2. 裁定の内訳

### 2.1 対応→未対応：134件（＋未検証→未対応 5件）

出発点の「対応なのにハンドラが無い161件」は次のとおり裁定した。

- エンジンが直接評価できる演算子・構文 **21件は対応を維持**（プローブで実測：`* + - / ^ <- =!= < <= == > >=! & && | || ( $<-, [<-`。例：`2*3`→6、`$<-` の列書き込み、`[<-` の要素書き込みが実際に動く）。
- 小さく忠実に実装できる **11件を新規実装**して対応を維持（§3）。
- 残り **129件を未対応へ**。これに、ハンドラはあるが到達不能なドット始まり5件を加え、対応→未対応は計134件。理由類型（description にとして全件追記済み）：

| 理由類型 | 件数 | 代表例 |
|---|---|---|
| 行列・配列オブジェクトを値モデルで表せない | 29 | matrix, array, diag, t, outer, %*% |
| 線形代数の分解・解法オブジェクト | 27 | qr 系13, svd, chol, solve, det |
| リスト／ペアリスト | 12 | list, as.list, split, rle |
| 因子 | 9 | factor, ordered, gl, cut |
| パーサが受理しない演算子・構文 | 8 | `**`, `->`, `<<-`, `%||%`, `{`（値としてのブロック）, assignOps（文書見出し） |
| 組み込み定数値が値モデルに無い | 8 | pi, letters, month.abb, NA_real_ 等 |
| 関数値を渡す高階関数 | 8 | Filter, Map, Reduce, lapply |
| 言語オブジェクト・遅延評価・特殊形 | 7 | switch, try, stop, replicate |
| 正規表現の位置属性付き結果 | 6 | regexpr, gregexpr, regmatches, strsplit |
| ドット始まり識別子がパーサ到達不能 | 6 |.colSums 系4,.bincode,.pretty |
| Bessel（精度を確定できない） | 4 | besselI/J/K/Y |
| S3 メソッド・ジェネリック | 4 | print.default, pretty.default, xtfrm, prmatrix |
| 整形規則への依存 | 3 | format.pval, formatDL,.format.zeros |
| その他 | 3 | sort_by（R 4.4以降の関数で 4.3.3 に無い）, jitter（乱数の撹拌）, anyMissing（§2.3） |

- 未検証→未対応 **5件**（全件確定）：`format.info`（format の桁決定規則に依存し忠実に再現できない。実 R では動作するが実装は見送り）、`grouping`（属性付き grouping クラスの順列を表せない）、`.rangeNum`／`.unlist`（R 4.3.3 の base 名前空間に実在せず呼び出せない内部名＋ドット到達不能。unlist 本体は対応）、`.standard_regexps`（ドット到達不能の内部ユーティリティ）。

### 2.2 未対応→対応：8件

`is.data.frame, assign, class, exists, get0, get, ls, objects`。データ操作班の環境ハンドラを実 R と照合し、対応へ倒した。項目文面は実態に合わせて書き換えた（is.data.frame の説明は「変換します」という誤記だったため判定の説明に修正、class は暗黙クラスのみ・integer→numeric の写像を caution で開示、assign/get 系は envir 等の環境引数と関数オブジェクト返却が名指し停止であることを caution で開示）。照合の過程で inherits の欠陥を発見し修正した（§5-2）。

### 2.3 実装-or-未対応の判断（候補12件）

- **実装した11件**：bitwAnd, bitwNot, bitwOr, bitwShiftL, bitwShiftR, bitwXor, anyNA, digamma, trigamma, psigamma, match.arg（すべて mopup ファイルへ追加。検証は §4）。
- **anyMissing は実装せず未対応**：実 R 4.3.3 および R-devel の base に `anyMissing` という関数は存在しない（名前空間で `exists` が FALSE、ヘルプにも無い）。項目は「存在しない関数名」として未対応に残し、names からも除去した。

### 2.4 ハンドラはあるが項目が無い3件

`sort.int, seq.int, rep.int`：公式ヘルプの Usage に基づき項目を part2 へ追加（対応）。names にも追加。実走で実 R と一致を確認（sort.int の既定 na.last=NA で NA が落ちる等）。

### 2.5 重複登録4件の裁定

集約 Map では後勝ち（math→char→data→mopup）のため、実働していた実装と影の実装を実 R と差分照合した。

| 名前 | 残した方 | 根拠（実 R 4.3.3 実測） |
|---|---|---|
| char.expand | mopup | 完全一致が複数ある場合は曖昧として character(0)、charmatch は 0 を返す。char 版は先頭一致を返し誤り |
| validUTF8／validEnc | mopup | 非文字列（1／NULL）は "invalid 'x' argument" でエラー。char 版は強制変換して値を返し誤り |
| strtoi | data | 実働側を残し、trim を「先行空白のみ」へ修正（§5-3） |

char 側の char.expand／validUTF8／validEnc／strtoi のハンドラと登録を削除した。

### 2.6 到達不能ハンドラ（.colSums 系4件・.bincode）

実測：`.colSums(...)`／`.bincode(...)` は共有パーサが「式を解釈できません：.」で停止し、呼び出しに到達できない（ドットが途中の sort.int 等は受理される）。
裁定：5項目すべて未対応（パーサ理由を開示）。data ファイルの `.colSums` 系4件のハンドラと `dotColRowFn` は削除した。
**例外**：`.bincode` のハンドラは mopup に残置した。理由は、編集権限外の `tests/adv-b4-r-eng4.test.js` が fake ctx で直接このハンドラを呼んで検証しているため。パーサ到達不能なのでシミュレーションで誤値を返す経路は存在しない。統合時に eng4 の当該ケースと一緒に外すことは可能（申し送り §7）。

### 2.7 scale

**対応を維持し、caution で開示**。数値そのものは実 R と一致する（ベクトル・データフレーム列ごと、center=FALSE の形、定数列の NaN まで差分バッテリで確認）。不足は表現面のみ（実 R は行列＋ scaled:center／scaled:scale 属性を返す）であり、caution に「結果を行列ではなくベクトル／データフレームで返し、属性は付かない（数値そのものは実 R と一致）」と明記した。

### 2.8 apply 系の限定実装

`tapply, table, sapply, vapply, mapply, apply`（FUN 文字列指定の単純集計のみ）は差分バッテリ（§4）で実 R と全件一致し、誤値を返す経路は無かったため対応を維持。各項目の example を、実際に動く文字列 FUN の形へ書き換え（従来の `tapply(..., sum)` や `table(rpois(100, 5))` はこのモデルで止まる形だった）、caution に「FUN は文字列指定のみ対応」を追記した。関数名をそのまま渡す形は読み取りフックで名指し停止する（設計どおり）。

### 2.9 zapsmall

項目 syntax を 4.3.3 基準 `zapsmall(x, digits = getOption("digits"))` に修正し、caution に「mFUN／min.d は R-devel のみで、指定すると unused argument で停止する（4.3.3 基準）」を追記。実装の挙動は実 R 4.3.3 と一致（`zapsmall(c(1,1e-12), mFUN=1)` → unused argument を実測）。

## 3. 新規実装の検証（実 R 4.3.3 とのグリッド照合）

- **ポリガンマ（digamma／trigamma／psigamma）**：漸化式で引数を12以上へ移し、digamma は Bernoulli 数による漸近展開、m≥1 は Hurwitz ゼータの Euler–Maclaurin 展開。照合グリッド m=0..6 × x∈{0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 1, 1.5, 2, 2.7, 3.3, 5, 7.9, 10, 25, 100, 170}＋負値・極・無限大で、**最大相対誤差 5.8e-15**。極（0・負の整数）は deriv 奇数→Inf、偶数→NaN＋警告という実 R の規則を再現。deriv の上限 100（実 R の n_max）も実装した（§5-4）。
- **bitw 系**：型規則（数値同士のみ、logical／character は "unimplemented type"、型混在は "'a' and 'b' must have the same type"）、切り捨て、範囲外 NA＋警告、リサイクリング無警告、右シフトは符号なし、結果が -2^31 になる演算は NA、をすべて実測に基づいて実装。
- **anyNA**：ベクトル・データフレーム全列・NULL・空ベクトルを実測照合。
- **match.arg**：NULL→先頭候補、完全一致優先、前方一致の展開、曖昧・不一致・長さ0 のエラー文、several.ok の重複可、長さ>1 は choices と完全一致のときだけ先頭、を R ソースと実測で照合。

## 4. 角度ごとの実施結果

- **一次情報照合**：全裁定を実 R 4.3.3 の実測と公式ヘルプ（Usage／Examples）で裏付けた。名前キュレーションは base 名前空間の関数 1,345 件と全 929 名を機械照合（§6）。
- **実走（A-03）**：対応項目の example を全件シミュレータに通した（裁定前 363 件：92 件が無エラー、271 件はプレースホルダ変数の未定義名エラーで、実 R でも同様に止まる公式ヘルプ断片＝宣言上の欠陥ではないと分類）。そのうち項目自身が原因で止まる例は裁定・例の書き換えで解消し、書き換えた 55 件は全件無エラーで実行できることを監査テストで固定した。未対応項目の example は、正直に停止するか構文提示に留まることを確認した（無エラーで通る 7 件は print／summary／table の総称関数が肩代わりする形で、誤値にはならないと裁定）。
- **差分バッテリ（F/B群）**：apply 系・scale・bitw・strtoi・char.expand・rep.int・環境系など 55 式を実 R とシミュレータで突き合わせ、全件一致（例外は §7 の残存に明記）。敵対的入力（NA／NaN／Inf、空ベクトル、長さ不一致リサイクリング、型混在、引数名の部分一致、余分な引数、未知値 readline() の伝播）も投入し、誤値経路は §5 のとおり修正した。警告の文言は基礎層の慣習（リサイクリング警告等）と矛盾しないことを確認した。
- **構造照合**：status⇔ハンドラの対応表を機械抽出し、対応＝到達可能／未対応＝ハンドラなし（.bincode の明示例外のみ）を全件検証。監査テストで固定した。
- **契約チェック（advanced-interface.md 第11章、R 分）**：(a) 全項目に status あり ✓ (b) 項目名の重複なし（part 間・overrides 含む）✓ (c) overrides は空のまま正しい（基礎項目で status 反転が必要な名前は無い）✓ (d) テンプレート 7 件の refs は全件実在し基礎か対応項目、用語集 12 語は基礎と重複なし ✓ (e) 対応項目は全件到達可能 ✓ (f) テンプレートの未対応依存なし ✓ (g) 高度差分ファイル名は `-advanced` パターンに適合し precache 対象外であることを確認 ✓。

## 5. 発見した欠陥と修正（ブロック内）

1. **rep.int の誤値**（mopup）：スカラー times を要素ごとの回数として扱い、`rep.int(c(1,2), 2)` が実 R の `c(1,2,1,2)` ではなく `c(1,1,2,2)` を返していた。実 R の意味論（スカラー＝全体の繰り返し、ベクトル＝要素ごと）に修正。監査テストで固定。
2. **exists／get／get0 が inherits = FALSE を無視**（data）：組み込み定数に対しても TRUE／値を返していた（実 R：`exists("pi", inherits=FALSE)` は FALSE、get は object not found）。lookupName に inherits を伝播させ、FALSE のときは現在の環境だけを探すよう修正。
3. **strtoi の両端 trim**（data）：`strtoi("42 ")` が実 R の NA ではなく 42 になっていた。先行空白のみ読み飛ばすよう修正し、9 値のグリッド（空白・16進・8進・範囲外・小数文字列）で全件一致を確認。
4. **psigamma の deriv 上限なし**（mopup、監査で新規実装した側の欠陥）：deriv=101 以上を計算していたが、実 R は上限 100（n_max）で NaN＋警告2件を返す。上限を実装（deriv=100 は実 R と 15 桁一致を維持）。
5. **重複登録の影実装の誤値**（char）：char.expand（完全一致の重複で先頭を返す）／validUTF8・validEnc（非文字列を強制変換して値を返す）は実 R と異なる実装だった。実働側（mopup／data）が正しいことを差分照合で確認し、char 側を削除（§2.5）。
6. **監査作業中の自己欠陥**：参照移行スクリプトが項目名 `toString` を Object.prototype のプロパティと誤認し、toString 項目の description／example／caution を `undefined` に破損させた。data2 のスキーマ検証で検出し、HEAD の原文どおりに復旧済み（他のプロトタイプ衝突名は無いことを全件確認）。

宣言面の欠陥（対応宣言と実装の不一致 161 件＋到達不能 5 件＋未検証 5 件）は §2 の裁定で全件解消した。

## 6. 名前キュレーションの独立検証

names 全 929 件を R 4.3.3 の base 名前空間の関数一覧と機械照合し、4.3.3 に無い名前は R-devel ヘルプで実在を確認した。

- **除去（4件）**：`AsIs`（クラス名で関数ではない）、`Math.POSIXlt`／`summary.difftime`（4.3.3 の base にメソッド実体が無く、ヘルプ別名のみ）、`anyMissing`（関数自体が存在しない）。
- **復帰（1件）**：`grepv`（R-devel の grep ヘルプで `grepv(pattern, x, …, value = TRUE)` として実在を確認。データ班が非関数リストに入れていたものを names へ戻し、data1 テストの NONFUNCTION からも外した）。
- **追加（3件）**：sort.int／seq.int／rep.int（項目追加に合わせて）。
- **維持を検証した名前**：`str.POSIXt`（getS3method で実在）、`sort_by`／`is.string`（4.3.3 に無いが R-devel ヘルプで関数の実在を確認）。
- 結果：part1 509→507、part2 420→422、総数 929 のまま。データ班テスト2件の固定リスト・固定件数を裁定に合わせて更新し、理由をテストコメントに残した（data2 の棚卸し由来の導出件数は 58→56 に変化）。

## 7. 既存テストの裁定

- **B4 R テスト一式**（data1／data2／eng1〜4／content＋監査テスト）：104 件中 103 件合格。残る1件は **eng4 の rep.int 期待値の誤り**（テスト側の欠陥）：`tests/adv-b4-r-eng4.test.js`（約182行目）が `rep.int(c(1, 2), 2)` の期待値を `c(1, 1, 2, 2)` としているが、実 R 4.3.3 の実測は `c(1, 2, 1, 2)` であり、コメントの「実 R 実測」も誤り。監査班の編集権限外のため、**コーディネーターによる期待値の修正を申し送る**（誤値に合わせて実装を戻すことはしない）。
- **R 関連の既存テスト**（muse-fix-batch12-r／batch13-r／batch2-fc-rjs／muse-fix-r）：118 件中 117 件合格。残る1件は batch13 の `sqrt(readline())` で、sqrt 実装に伴う陳腐化した前提（意図した挙動変更）であり回帰ではない。
- 全テストスイートの実行結果は本報告書の追補として扱う（VBA 側の失敗があっても R 監査班の担当域外）。

## 8. 残存・申し送り

1. **eng4 rep.int テストの期待値修正**（§7）：コーディネーター対応。
2. **.bincode ハンドラの残置**（§2.6）：eng4 の直接単体テストのためだけに残してある。統合時に当該テストケースと一緒に削除可能。
3. **エンジン／パーサ側の制約**（index.js は編集禁止のため申し送り）：`**`、`->`、`<<-`、ドット始まり識別子、値としてのブロック、組み込み定数の裸名解決は、エンジン側が対応しない限り項目は未対応のまま（宣言で正直に開示済み）。
4. **bitw 系の裸 NA**：値モデルの NA は型を持たないため、実 R が論理 NA と数値の組み合わせで出す型不一致エラーを再現できない（数値ベクトル内の NA は正しく NA になる）。コード内コメントに明記。
5. **mapply のリサイクリング警告文**：基礎層の共通文言（"longer object length is not a multiple of shorter object length"）を使っており、実 R の mapply 専用文言とは異なる。値は一致する。
6. **sapply(list(),...) 等**：list() 自体が未対応のため停止する。リスト裁定と一貫した挙動として許容する。
7. **class の integer 写像**：実 R の integer 型はこのモデルでは numeric として表すため、`class(1:3)` は "numeric" になる（実 R は "integer"）。caution で開示済み。
