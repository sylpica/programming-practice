# ADV-B4S 修正報告書（独立監査 F1〜F10 への処置）

修正チームが、本体ツリー（adv-b4s）で監査欠陥 F1〜F10 を根因修正した記録。
期待値の正本は制作側報告書ではなく一次情報（実 R 4.3.3 `/usr/bin/Rscript`・
公式ヘルプ Usage／formals、非心カイ二乗は mpmath 40〜50 桁の独立計算）。

注記：監査コピー内の `ADV-B4S-AUDIT.md` は F2 の途中で終わる 55 行の
ファイルだったため、F3〜F10 の処置は委託時の欠陥要約と本チームの
実 R 実測・独立検証に基づいて行った。

触ったファイル：

- `js/types/r/functions-advanced-statsdist.js`（F1・F2・F3・F4・F5・F9）
- `js/types/r/functions-advanced-statsdesc.js`（F6）
- `js/types/r/reference-advanced-part3.js`（F7 rWishart example／caution）
- `js/types/r/reference-advanced-part6.js`（F8 qr.influence syntax）
- `js/types/r/reference-advanced-part7.js`（F8 arima／arima0／lag.plot／diffinv syntax）
- `js/types/r/reference-advanced-part9.js`（F7 head／tail example）
- `js/types/r/reference-advanced-part10.js`（F8 find syntax、F10 example 4 件）
- `tests/adv-b4s-sdesc.test.js`（F6 の期待値 1 件を実測根拠つきで変更）
- `tests/adv-b4s-fix.test.js`（新規：F1〜F10 の回帰テスト 10 件）

集約ファイル・precache・台帳・状態ファイルは触っていない。コミットしていない。

## F1（値）pnbinom の q = Inf が NaN

- 根因：`pnbinomPair` に q = Infinity のガードが無く、
  `betaincPair(prob, size, Inf)` が NaN を返していた。兄弟の `ppoisPair`
  には同型のガード（q === Infinity で PAIR1）があった。
- 修正：`pnbinomPair` に `q === Infinity` で PAIR1 を返すガードを追加
  （mu 形も同じ合成 prob 経由のため同時に解消）。
- 照合：実 R 実測どおり `pnbinom(Inf, 10, 0.4)` = 1、
  lower.tail=FALSE で 0、log.p=TRUE で 0、mu 形で 1、警告なし。
  有限 q（pnbinom(3, 10, 0.4) = 0.007793016832000013）と
  qnbinom の回帰も確認。

## F2（警告）離散 d 系の x = ±Inf で余分な警告

- 根因：共有ヘルパ `nonIntX` が `!Number.isInteger(x)` のみで判定し、
  Inf（整数でない）でも `non-integer x = Infinity` を警告していた。
  実 R は有限の非整数にのみ警告する。
- 修正：`nonIntX` に有限性ガード（`Number.isFinite(x)` でない場合は
  警告しない）を追加し、利用側すべて（dbinom／dpois／dgeom／dnbinom／
  dhyper）に一括で効かせた。
- 同根の洗い：dbinom／dhyper は範囲チェックで Inf が先に処理され元々
  無警告（有限非整数の警告は維持）。dwilcox／dsignrank は実 R でも
  非整数・Inf で警告しないことを実測し、現行（無警告）と一致を確認。
  dmultinom は nonIntX を使わない別経路で監査対象外。
- 照合：dpois(c(3, Inf, -Inf), 4) 等で警告が消え、値 0 は不変。
  dpois(2.5, 4) 等の有限非整数では警告が残ることを回帰テストで固定。

## F3（警告）rlogis の余分な警告＋同根の洗い

- 根因：`rlogis` の検証が scale < 0 を一律に不正扱いしていた。実 R の
  rlogis は負の scale でも正常な値を返し警告しない（qlogis の単調反転）。
- 修正：rlogis の警告条件を「location／scale が NA／NaN のときのみ」に変更。
- 同根の洗い（全 r 系を実 R と 1 件ずつ照合し、食い違ったものを修正）：
  - `rexp`：rate = 0 でも実 R は警告する → 条件を e <= 0 に変更。
  - `rgeom`：prob = 0 でも警告する → e <= 0 || e > 1 に変更。
  - `rgamma`：scale／rate が負でも警告するのに未検証だった → 両方に
    e < 0 の検証を追加（scale=0／rate=0 は実測どおり無警告）。
  - `rhyper`：k > m + n でも警告する → リサイクルを考慮した横断
    チェックを追加（警告は最大 1 回に集約。k = m + n は正常）。
  - `rnbinom`：size = 0 でも警告する → size の条件を e <= 0 に変更。
  - `rt`／`rcauchy`／`rlnorm`／`rf`：ncp／location／meanlog の NA が
    実 R では警告対象なのに未検証だった → NA／NaN のみの検証を追加。
  - その他（rbeta／rbinom／rchisq／rpois／rsignrank／rweibull／
    rwilcox）は実測と一致しており変更なし。

## F4（検証漏れ）rsmirnov の sizes 値検証

- 根因：長さ 2 のチェックしか無く、`rsmirnov(3, c(-1, 12))` が通っていた。
- 修正：実 R 4.3.3 実測の文言どおりに値検証を追加。NA／NaN →
  `missing value where TRUE/FALSE needed`、0 以下 →
  `not enough 'x' data`、±Inf → `invalid 'times' value`。
  非整数（10.5 等）は実 R どおり切り捨てで正常。

## F5（過剰停止）rWishart の n／df 検証

- 根因：通常の r 系検証（rRun）が n < 0 を一律エラーにしていたが、
  実 R の rWishart は n が負・0・NA・numeric(0) でも 1 スライスの
  配列を返し、n = 2.5 は切り捨て、ベクトル n は先頭要素を使う。
- 修正：専用ハンドラ `rWishartH` に置換。n は存在確認のみ。
  df は C 実装の検証（df < 次元 p で
  `inconsistent degrees of freedom and dimension`）に合わせ、
  p >= 1 が常時成り立つことから df < 1 は無条件に停止し、Sigma が
  具体的な平方長ベクトルなら p = sqrt(length) でも判定する
  （例：c(1, 0, 0, 1) は 2 次元なので df = 1.5 は停止、df = 2 は正常。
  いずれも実 R の diag(2) での実測と一致）。df = NA は実 R どおり
  エラー・警告なしで通す（NaN の配列が返る形）。
- 残存：Sigma が未知値・データフレーム等で次元が分からない形では
  df ∈ [1, p) の判定はできない（値モデルの制約。従来からの限定）。

## F6（名前属性）setNames の不足分

- 根因：不足分の名前に null を入れており、監査の照合（生の名前属性）
  では "" と読めた。実 R では NA 埋め
  （names(setNames(c(1, 2, 3), "a")) は "a", NA, NA）。
- 修正：不足分と nm 自体の NA 要素を、値モデルの NA（H.NA）で
  表すよう変更。データフレーム列名の NA 検出も H.isNA に追随。
  自班テスト（adv-b4s-sdesc）の期待値 ["a", null, null] を、実 R 実測を
  根拠に ["a", NA, NA] へ変更（コメントに根拠を明記）。
- 照合：`names(setNames(c(1, 2, 3), "a"))` は sim でも
  c("a", NA, NA) を返し、監査スクリプト角度2の名前属性差は 0 件になった。
- 残存（コーディネーター判断待ち）：エンジン表示層（js/types/r/index.js
  の show）は NA 名を持つベクトルの print で `[object Object] = 2` の
  ように表示する。これは本修正の担当範囲外ファイル起因の表示 artifact
  で、基礎層の `names<-` は NA 名を内部 null で保持する別規約のため、
  どちらの表現を正本にするかはエンジン側の判断が必要。値・names() の
  意味論は実 R と一致している。

## F7（example 3 件）

- rWishart：`rWishart(2, 5, diag(2))` は diag が未対応で sim で実行
  できないため、値モデルの表現形 `rWishart(2, 5, c(1, 0, 0, 1))`
  （sdist テストで正例として使われている形）に差し替え、caution に
  diag(2) との等価である旨を明記した。
  残存：実 R では Sigma は行列オブジェクト必須で、ベクトルリテラル形は
  実 R 単体ではエラーになる。行列を作る式（diag／matrix／array）は
  すべて sim 未対応のため、単一の example で両方を満たす形は存在しない。
  監査の角度5a（sim で実行できること）を優先し、等価形を caution に残した。
- head／tail：定数 `letters` は sim のモデルに無く、さらに `6L` の
  整数リテラルも sim 未対応だったため、
  `head(c("a", "b", "c", "d", "e", "f", "g", "h"), n = -6)` /
  `tail(...)` に差し替え。sim で c("a", "b")／c("g", "h") を返し、
  実 R でも同じ結果になることを実走確認済み。

## F8（syntax 事実誤り 5 件）

いずれも実 R の formals と公式ヘルプ Usage の両方で確認して修正：

- find（part10）：`find(what, mode = "any", numeric = FALSE, simple.words = TRUE)`
  （?apropos の Usage・utils::find の formals と一致）。
- arima（part7）：method の直後に `n.cond` を追加（Usage・formals と一致）。
- arima0（part7）：method の直後・optim.control の前に `n.cond` を追加。
- lag.plot（part7）：`type = "p"` の後に
  `oma = NULL, ask = NULL, do.lines = (n <= 150), labels = do.lines` を
  追加（?lag.plot の Usage と一致）。
- diffinv（part7）：末尾に `...` を追加し
  `diffinv(x, lag = 1, differences = 1, xi, ...)`
  （diffinv.default の formals と一致）。
- qr.influence（part6）：公式ヘルプ（?lm.influence の Usage）の
  `qr.influence(qr, res, tol = 10 * .Machine$double.eps)` に差し替え。

## F9（数値精度）非心カイ二乗の大きな ncp

- 根因：Poisson 混合の打切りが重みの絶対値（w_j < 1e-17）基準だった
  ため、遠い裾では支配項が w_j ≈ 1e-20 級の小さい j（ncp=150・x=4 では
  j ≈ 6..17）にあっても欠落していた。加えて密度は線形空間で
  exp(log密度) を混合しており裾の精度が落ちていた。
- 修正：非心カイ二乗専用の対数空間混合 `ncx2LogMixture` を新設。
  対数重みで峰から両方向へ走査し、打切りは「その先の全項の上限が
  現在の最大項の e^-50 以下」という相対基準（CDF は logP <= 0、
  密度は log f の全域上限 chisqLdMax で bound）でのみ行う。
  pchisq は logLo を保持したまま返す（log.p でも裾が潰れない）。
  dchisq／df(df2=Inf 経由) も同じ混合に統一した。
  退化形（項が全て -Inf）では相対基準が発火しないため、絶対基準
  （log 重みが -700 以下）も併設した。
- 照合（境界の確定）：x ∈ {0.5, 1, 2, 4, 10, 25, 50, 100, 200, 400}、
  df ∈ {1, 4, 10, 40}、ncp ∈ {10, 50, 80, 100, 150, 300, 1000} の
  280 件を SciPy と照合し、dchisq 対数の最大絶対誤差 5.5e-12、
  pchisq は SciPy が有限な範囲で相対誤差 1e-9 以内。
  SciPy 自体がアンダーフロー／誤差を持つケース（ncp=1000 の logcdf、
  (1, 10, ncp=300) で SciPy が 1.3e-3 ずれる等）は mpmath 40 桁で
  再照合し、sim 側が真値と対数絶対誤差 6e-12 以内で一致することを確認。
  監査の再現ケース pchisq(4, 4, ncp=150) は 3.6673779157925705e-26
  （真値 3.6673779157925851e-26）、dchisq 対数は -57.54422477258186
  （真値 -57.544224772581865）まで改善した。
  よって名指し停止＋caution 開示が必要な残存領域はなく、caution の
  変更はしていない（打切りは相対基準化され、絶対打切りの領域自体が
  消えたため）。なお実 R 自身の dchisq は大きな ncp で真値からずれる
  （ncp=150 で対数誤差 0.24、ncp=99 で 0.25）ため、密度の正本は
  実 R ではなく mpmath／SciPy とした（非心 t の既存方針と同じ）。

## F10（example 文法 4 件）

ブラケットメソッドの example が裸の名前で実 R の式として解析できな
かったため、part6 の `[.terms`（例 `terms[1]`）と同じ添字式の形に統一：

- `[.getAnywhere` → `getAnywhere("mean")[1]`
- `[[.hashtab` → `h[["key"]]`
- `$.person` → `person("John", "Doe", email = "john@example.com")$email`
- `[.person` → `person("John", "Doe")[1]`

4 件とも実 R 4.3.3 の parse() で解析できることを確認し、getAnywhere／
person 系は実走でも結果が返ることを確認した。

## 検証結果

- 関連テスト：tests/adv-b4s-*.test.js 全 8 ファイル＋
  tests/adv-b4-audit-r.test.js＋tests/muse-fix-batch5-r.test.js
  ＝ 158 件全緑。新規 tests/adv-b4s-fix.test.js ＝ 10 件全緑。
- 監査スクリプト再実行（本体ツリーへ一時コピーして実施、検証後に除去）：
  - 角度3・5a（audit-b4s-stop-examples）：未対応の停止失敗 0 件、
    対応 129 件の example 実行失敗 0 件（修正前は F7 の 3 件が失敗）。
  - 角度2（audit-b4s-diff、独立プローブ 890 件）：値一致 760・エラー
    一致 126・不一致 4・文言差 0・名前属性差 0（修正前は不一致 11＋
    名前属性差 1）。F1〜F6・F9 の再現ケースは全て解消。
    残る不一致 4 件はいずれも本修正の対象外で、内訳は次のとおり：
    (1) dchisq(4, 4, ncp=99, log) — 実 R 自身の誤差（R は -36.5859、
    真値 mpmath は -36.33144351204792 で sim と 1e-14 一致）。
    (2) qf(0.95, 5, 10, ncp=2) — 実 R 値が SciPy 検証値から 1.8e-9
    ずれる既知の R 側誤差（sdist テスト冒頭に記録済み。sim の値は
    修正前後で不変）。
    (3)(4) weighted.mean.default／type.convert.default — 実 R では
    .default メソッドがエクスポートされておらず呼び出し自体が
    エラーになるが、B4S では対応項目として意図的に登録されている
    （sim の挙動は修正前後で不変）。
- 全テストスイート（tests/*.test.js、4897 件）：4889 件合格、
  失敗 8 件はすべて VBA 系（muse-fix-batch8／batch10／batch13）で、
  未修正の監査コピーでも同一の 8 件が失敗する既存失敗であり、
  本修正による回帰ではない。
