# ADV-B4S stest 班報告書（R stats：検定・検出力）

## 1. 担当範囲と内訳

- 担当トピック数：36／名前数：38（スライス `slice-stest.json` の全名にちょうど1項目ずつ作成）。
- 内訳（名前単位）：**対応 1／未対応 37／未検証 0**。
  - 対応：`p.adjust` のみ（数値ベクトル→数値ベクトルで値モデルで忠実に再現可能）。
  - 未対応 37 の理由類型内訳：
    - クラス "htest" のリストオブジェクトを返すため：25件（ansari.test、bartlett.test、binom.test、Box.test、chisq.test、cor.test、fisher.test、fligner.test、friedman.test、kruskal.test、ks.test、mantelhaen.test、mauchly.test、mcnemar.test、mood.test、oneway.test、poisson.test、PP.test、prop.test、prop.trend.test、quade.test、shapiro.test、t.test、var.test、wilcox.test）。各項目の description には、その検定が返す構成要素（統計量・自由度・p値・信頼区間・推定値・帰無値・観測／期待度数など、公式ヘルプ Value 節の列挙）を個別に明記した。mauchly.test／oneway.test はモデルオブジェクト／formula 前提である点も併記。
    - クラス "pairwise.htest" のリスト（調整済みp値の下三角行列を含む）を返すため：3件（pairwise.prop.test、pairwise.t.test、pairwise.wilcox.test）。
    - クラス "power.htest" のリストを返すため：3件（power.anova.test、power.prop.test、power.t.test）。
    - aov モデルオブジェクト前提＋クラス c("multicomp", "TukeyHSD") のリストを返すため：1件（TukeyHSD）。
    - 第1引数が関数オブジェクトで、返り値も次元名付き行列（p値表）のため：1件（pairwise.table）。
    - 関数オブジェクトを要素に持つリンクオブジェクト（リスト）を返すため：1件（power）。
    - htest／power.htest オブジェクト前提の S3 印刷メソッド（不可視の返却を含む）ため：2件（print.htest、print.power.htest）。
    - データオブジェクト（文字列ベクトルの定数）で関数でないため：1件（p.adjust.methods）。
- 表記確認：スライスの name が正本である `Box.test`／`PP.test`（トピック名は box.test／pp.test）をそのまま項目名にした。実 R 4.3.3 の stats 名前空間でも同表記で実在を確認。

## 2. 一次情報と照合根拠

- 全36トピックについて公式ヘルプ（stat.ethz.ch R-manual R-devel、stats 4.6.0）の Usage／Description／Value を確認し、syntax・description・example・caution の事実の裏付けとした。
- 実 R 4.3.3（/usr/bin/Rscript）で機械確認：
  - 名前の実在：38名全てが stats 名前空間に存在。37名は関数（is.function = TRUE）。`p.adjust.methods` は is.function = FALSE（値 c("holm", "hochberg", "hommel", "bonferroni", "BH", "BY", "fdr", "none") の文字列ベクトル）であることを実測。
  - `print.htest`／`print.power.htest` は未 export だが、getFromNamespace で名前空間内に実在する関数（登録済み S3 メソッド）であることを確認し、BRIEF §7 の S3 規則により names に収録した。
  - 全関数の formals（引数名と順序）を採取し、各項目の syntax と全件一致を確認（wilcox.test の tol.root／digits.rank を含む）。
- 実装した関数 `p.adjust` の照合根拠＝**実 R 実測＋実装ソースの移植**：
  - 実 R 4.3.3 の `getFromNamespace("p.adjust", "stats")` で実装本体を取得し、そのアルゴリズムをそのまま JS へ移植した。
  - 25ケース（NA・NaN・タイ・名前付き・n 明示拡大・長さ 1／0・全 NA・文字／論理の強制変換を含む）×全8方式＝200件のバッテリを実 R で生成し、JS 実装と突き合わせて**全件一致**（許容誤差 1e-12 相対）。
  - 実測で判明した実装上の癖も再現した：(a) デフォルト引数 `n = length(p)` は遅延評価で NA 除去後の p に対して強制されるため、既定の n は NA を除いた長さ lp になる（明示した n はそのまま使われる）。(b) stopifnot(n >= lp) が n <= 1 の早期リターンより先に評価されるため、n = 1 でも lp > 1 なら "n >= lp is not TRUE" で停止する。(c) 方式ごとの倍率は lp ではなく n を使う。(d) hommel には上限 1 への切り捨てが無い。(e) match.arg のエラー文言は 'method' ではなく 'arg'（`'arg' should be one of ...` 等、全て実測）。

## 3. 名前キュレーション

- names（names-advanced-part5.js）は 37 件。除外は `p.adjust.methods` のみ：データオブジェクト（定数）であり関数ではないため（BRIEF §7。項目自体は未対応として作成し、理由を description に明記）。
- B4 の項目 1,085 件・names 929 件・基礎層項目との重複はゼロを機械照合済み。

## 4. テスト結果

- 担当テスト `tests/adv-b4s-stest.test.js`：12 件全て合格。
  - データ整合（分母・内訳・正規形・重複・ハンドラ登録は p.adjust のみ）。
  - p.adjust：F-01 分類（典型＝全8方式／境界＝長さ0・1・全NA・タイ・上限1／異常＝method 不正・n < lp・余分な引数・必須欠落・データフレーム／組み合わせ＝NA×n拡大、名前付き、部分一致引数名）を fake ctx で直接検証（集約配線前のため .bincode の前例に従った）。
  - 未対応 37 件は simulate で「このR関数は説明に対応していません：名前」と名指し停止し誤った値を返さないことを固定（p.adjust.methods は素の参照で「未定義の名前」として名指し停止）。
- 関連既存テスト（tests/adv-b4-*.test.js、muse-fix-batch{10,12,13}-r.test.js）：199 件中 198 件合格。失敗 1 件（muse-fix-batch13-r の "unknown function with unknown argument still names the function"）は**土台ツリー adv-b4 でも同一に失敗する既存事項**で、本班の変更（新規ファイルのみ・未配線）とは無関係であることを対照実行で確認した。コーディネーターへの申し送りとする。

## 5. 未検証・残存

- 未検証（unverified）は 0 件。全項目の意味論を公式ヘルプと実 R で確定できた。
- 残存・申し送り：
  1. 集約ファイル（functions-advanced.js／reference-advanced.js／names-advanced.js）への配線はコーディネーターの担当。配線が済むまで simulate 経由では p.adjust も名指し停止になる（項目の status は supported で確定。ハンドラ自体は fake ctx テストで実 R と照合済み）。
  2. p.adjust の周縁：引数 n に NA や長さ 2 以上のベクトルを渡した場合のエラー文言は実 R で直接実測しておらず、実 R の一般規則からの推定文言（"missing value where TRUE/FALSE needed"／"the condition has length > 1"）で実装した。通常の使用範囲（スカラーの n）には影響しない。
  3. 上記 4 の既存失敗 1 件（土台側）は本班の範囲外のため未修正。
