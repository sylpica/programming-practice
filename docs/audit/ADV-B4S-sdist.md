# ADV-B4S sdist 班報告書（R stats：確率分布）

担当：B4S 補完ブロック sdist 班。スライス `slice-sdist.json` の 26 トピック／110 名を担当した。
成果物は次の 4 ファイル（集約ファイルへの配線はコーディネーター担当）。

- `js/types/r/functions-advanced-statsdist.js`（`builtins`：ハンドラ 81 件）
- `js/types/r/names-advanced-part3.js`（`names`：85 名）
- `js/types/r/reference-advanced-part3.js`（`referenceAdvanced`：110 項目）
- `tests/adv-b4s-sdist.test.js`（17 テストグループ、全緑）

## 件数（名前単位）

| 区分 | 件数 | 内訳 |
|---|---|---|
| 対応（supported） | 81 | d/p/q 系 60 ＋ r 系 21 のハンドラを実装 |
| 未対応（unsupported） | 29 | 見出し 25 ＋ ptukey／qtukey／psmirnov／qsmirnov |
| 未検証（unverified） | 0 | ― |
| 合計 | 110 | スライス全名と一致（重複・欠落なしを機械確認） |

## キュレーション

- スライス 110 名のうち **85 名が stats 名前空間に実在**（実 R 4.3.3 で機械確認）→ `names` に収録。内訳は d 系 20、p 系 22（psmirnov・ptukey 含む）、q 系 22（qsmirnov・qtukey 含む）、r 系 21。
- **25 名は実在しない見出し**（Beta, Binomial, Cauchy, Chisquare, distribution, Distributions, distributions, Exponential, FDist, GammaDist, Geometric, Hypergeometric, Lognormal, Logistic, Multinomial, NegBinomial, Normal, Poisson, SignRank, Smirnov, TDist, Tukey, Uniform, Weibull, Wilcoxon）→ ブリーフ §7 の補足どおり reference のみ unsupported（ドキュメント専用見出し）とし、`names` には入れない。
- `df`（F 分布の密度）は割当指示どおり実在関数として `names` に収録。
- 基礎層・part1／part2／part5 との名前重複はゼロを確認した。

## 実装した関数と手法

- **d/p/q 系 60 名**：Normal／Cauchy／Logistic／Uniform／Exponential／Lognormal／Weibull／Beta（非心含む）／Gamma／Chisquare（非心含む）／F（非心含む）／TDist（非心含む）の連続系と、Binomial／Poisson／Geometric／NegBinomial／Hypergeometric の離散系、SignRank／Wilcoxon（厳密 DP）、dmultinom、pbirthday／qbirthday。
- 数値核は全て自前実装：正規不完全ベータ（Lentz 連分数、両尾＋対数を同時算出）、正規不完全ガンマ（級数／連分数、対数空間）、pnorm は不完全ガンマ経由（裾も log.p まで正確）、qnorm は Acklam 初期値＋Newton（極端な裾は対数空間 Newton）。連続 q 系は二分法反転、離散 q 系は CDF の直接探索。
- 非心ベータ／カイ二乗／F は Poisson 混合（最大重み項から両方向へ展開）。非心 t の CDF は AS 243 型級数、密度はその項別微分。
- **r 系 21 名**：ブリーフ §5 の freshUnknown パターン。引数を実 R どおり検証（個数・パラメータの有効性・エラー文言・`NAs produced` 警告）してから `api.freshUnknown` を返す。rWishart／r2dtable／rmultinom も戻り値が行列・配列・リストであるが、rnorm の前例どおり「実行時の値」として同パターンを適用した（生成値そのものは決して返さない）。
- pbirthday／qbirthday は R ソース（birthday.R）を移植：k=2 は厳密積、k>2 は Diaconis–Mosteller 近似で、実 R と全数一致を検証した。なお qbirthday(coincident=10) は **1179**（ヘルプ内コメントの 1181 は古く、実 R が正）。

## 照合根拠

- 実 R 4.3.3（`/usr/bin/Rscript`）との一括照合バッテリー **349 式＋116 式**（典型・境界・退化パラメータ・log／lower.tail・ベクトル・名前・エラー系）を実施。
  - バッテリー1（349 式）：**348/349 が相対誤差 1e-9 以内で一致、警告の有無も全件一致**。唯一の差異 qf(0.95, 5, 10, ncp=2) は、SciPy の独立検証値（4.5856562760681951）と本実装（4.585656276068132）が 1.4e-14 で一致し、**実 R 値（4.585656284139611）の側に約 1.8e-9 の誤差**があると確定した。テストでは R 値を期待値とし許容誤差 1e-8 で固定している。
  - バッテリー2（116 式）：意図的な未対応 4 件（名指し停止）を除き全件一致。エラー文言（dmultinom 系、dnbinom の prob／mu、gamma の rate／scale 両指定、r2dtable、rmultinom、rsmirnov、r 系の `invalid arguments`、pbirthday／qbirthday のスカラー制約、unused argument、missing argument、部分一致）も全て実 R と一致。
  - 非心 t の CDF 級数は SciPy `nct.cdf` と全桁一致（0.15813564355691812）。実 R は約 1e-13 ずれる（R 自身の打切り誤差）ため、テストは 1e-9 で照合。
- 実測で確定した意味論の例：結果の名前は第 1 引数からのみ引き継ぐ／リサイクリングは無警告（stats の C 実装）／論理フラグの NA は真として扱う（C 実装が NA_LOGICAL を真と解釈）／離散 q のパラメータは rint 強制、psignrank は floor(q+0.5)／Beta・Gamma・F の退化形（パラメータ 0・Inf）の質量規則は全て実測どおり実装。

## 未対応の理由（類型別）

- **Tukey（ptukey／qtukey）**：学生化範囲分布は二重数値積分に依存し、全域の精度を実 R の許容誤差で確定できない。近似を supported と偽らず名指し停止に倒した（参照実測値：ptukey(3,5,10)=0.71701345201552802、qtukey(0.95,5,10)=4.6542930755433387）。
- **Smirnov（psmirnov／qsmirnov）**：正確分布は格子経路の列挙／条件付き分布に依存し再現できない（参照実測値：psmirnov(0.3,c(10,12))=0.37029224645323711、qsmirnov(0.95,c(10,12))=0.55000000000000004）。rsmirnov は生成系として freshUnknown で対応。
- **見出し 25 名**：実在関数ではないため（上記キュレーション参照）。
- Smirnov の syntax は R 4.3.3 の formals を正とした（R-devel ヘルプの `alternative=` 形式は 4.3.3 では unused argument エラーになるため不採用。他関数も全て 4.3.3 の `args()` 採取値）。

## 規模ガードと逸脱（いずれも reference の caution にも明記）

- **規模ガード 2 件**（誤った値を返すくらいなら名指し停止）：dsignrank 系は n>400 で停止、dwilcox 系は DP セル数 (m(m+1)/2)·(n(n+1)/2) > 3e7 で停止。文言は「…は説明に対応していません」形式の名指し停止。
- **逸脱 2 件**（実 R 自体の不具合の再現を避けた）：
  1. qbirthday(prob, coincident<2)：実 R は無限ループする（実測でハングを確認）ため、JS は 1 を返す。
  2. pbirthday の classes ベクトル：実 R はゴミ値（classes=c(365,100) で −2079246038392.4644）を返すため、JS は先頭要素＋警告に倒す。
- **rWishart の検証限定**：Sigma の行列性は値モデルで検証できないため、n／df の存在確認と df<0 時の `inconsistent degrees of freedom and dimension` 停止に限定した。
- **log.p の精度注記**：Hypergeometric／Wilcoxon／SignRank の log.p は log(F) 経由のため、極端な裾では対数空間での絶対精度が落ちる（確率値そのものは実測一致）。
- 大規模整数の lgamma は Lanczos 本体へ直接回し、総和ループを回避している。

## テストと回帰

- `tests/adv-b4s-sdist.test.js`：F-01 分類（典型／境界／異常／組み合わせ）で 17 グループ、**全緑**（配線済み検証コピーで実行）。
- 既存 R テスト 13 ファイルとの回帰比較（無配線コピー vs 配線コピー）：私の配線で増える失敗は次の **2 件のみで、いずれも統合時に既存テスト側の前提更新が必要なもの**（成果物の不具合ではない）。
  1. `muse-fix-batch5-r.test.js` の R26-N25：「rbinom／rpois は未実装で名指し停止」という B4S 以前の前提。B4S で実装した結果、不正な n は実 R の文言 `invalid arguments` で停止するようになった（エラーである点は不変）。
  2. `adv-b4-audit-r.test.js` の整合テスト：`ALL = [...refP1, ...refP2]` と part1／part2 固定で書かれており、part3 を集約へ配線すると dbeta 等が「項目の無いハンドラ」と判定される。統合時に ALL へ part3 を追加されたい（私のファイル同士では supported ⇔ ハンドラ有無・全ハンドラに項目あり、を機械確認済み）。
- なお `muse-fix-batch13-r.test.js` の B13-R 1 件は、無配線の現行ツリーでも失敗する既存失敗であり、本班の範囲外。

## 統合時の配線メモ（コーディネーター向け）

- `functions-advanced.js`：`functions-advanced-statsdist.js` の `builtins` を spread 追加。
- `names-advanced.js`：`names-advanced-part3.js` の `names` を追加。
- `reference-advanced.js`：`reference-advanced-part3.js` の `referenceAdvanced` を追加。
- 上記 3 点を検証コピーで実施し、本報告書のテスト結果はその状態で取得した。
