# ADV-B4 R実装班1（数値・数学・集計）報告書

担当：R 高度関数グループ「数値・数学・集計」（`js/types/r/functions-advanced-math.js`）
テスト：`tests/adv-b4-r-eng1.test.js`（17テスト群）
GitHub への書き込みは行っていない。編集したのは担当3ファイルのみ。

## 実 R の使用

- 使用した：**R 4.3.3**（`/usr/bin/Rscript`、Rscript (R) version 4.3.3 (2024-02-29)）。
- 期待値と端の意味論は、公式ヘルプ（stat.ethz.ch R-manual、base 4.6.0）の Examples と
実 R 4.3.3 の実測（`%.17g` 出力を含む）で裁定した。
- `round` については R 本体の一次ソース `src/nmath/fround.c`（R 4.x の fround
アルゴリズム）を読み、double 演算のまま再現した（後述）。
- 指示書にあった `docs/audit/CODEX-R7.md` は本ツリーに存在しなかった。実測記録は
`js/types/r/index.js` 内の B13-R（R7-*）コメントとして埋め込まれており、そちらと
MUSE-FIX-BATCH13.md を参照した。

## 実装した名前（68件）

| トピック | 名前 |
|---|---|
| MathFun／Trig／Hyperbolic／Log | abs, sqrt, sin, cos, tan, asin, acos, atan, atan2, sinpi, cospi, tanpi, sinh, cosh, tanh, asinh, acosh, atanh, exp, expm1, log, log1p, log10, log2, logb, gamma, lgamma |
| Round | round, signif, trunc, ceiling, floor |
| Special | beta, lbeta, choose, lchoose, factorial, lfactorial |
| Summary | prod, cumsum, cumprod, cummax, cummin, diff, range |
| Extremes | min, max, pmax, pmin, pmax.int, pmin.int |
| sort／order | sort, sort.int, sort.list, rev, order, rank |
| unique | unique, duplicated, anyDuplicated |
| which／match／findInterval | which, which.min, which.max, match, findInterval |
| seq 系 | seq.int, seq_along, sequence |

基礎層で名前だけあった未実装分（abs, sqrt, log, log10, log2, exp, sin, cos, tan,
asin, acos, atan, atan2, round, floor, ceiling, trunc, min, max, range, sort, rev,
order, unique）を含む。基礎実装済みの名前（c, sum, mean, median, sd, seq, seq_len,
rep, length, is.na, as.numeric, as.character, print, cat, data.frame, nrow, ncol,
names, read.csv）には登録していない。

## 実装しなかった名前と名指し理由（担当スコープ内：6件）

- **besselI, besselJ, besselK, besselY**（Bessel トピック）：未対応。
実 R は Amos の ZEVAL 系ルーチンで倍精度全域の高精度を保証するが、本モデルで
用意できる級数／漸近展開（Numerical Recipes 級）では位数・引数の全域で
実 R と末尾桁まで一致する保証ができない。本アプリの表示は full precision の
ため、近似誤差がそのまま誤値として見える。「誤った値を返すくらいなら止める」
原則により登録しない（画面では未対応として開示される）。
- **cut**：未対応。因子（factor）を返すが値モデルに因子型が無いため忠実に
表せない（指示どおり）。
- **arrayInd**（which トピック）：未対応。行列の行列添字（dim 属性）を返すが
値モデルに行列型が無いため表せない。なお `which` の `arr.ind = TRUE` 経路も
同じ理由で名指し停止にした。

担当列挙外として触らなかった名前：digamma, trigamma, psigamma（Special トピック
内だが本班の担当列挙に無い）、sort_by、is.unsorted、zapsmall、sign（いずれも
独立トピックで本班の担当列挙に無い）。

経路単位の名指し停止（実装済み関数内）：
- `sort.int(partial =...)`（部分ソート）、`sort.int(index.return = TRUE)`
（リストを返すため）、`sort.list(partial =...)`、`rank(ties.method = "random")`
（乱数）、`which(arr.ind = TRUE)`、`findInterval(all.inside = TRUE)` かつ
区間が作れない vec（長さ1未満）。
- データフレーム入力は各関数で名指し停止（sort は実 R の文言
"cannot xtfrm data frames" を使用）。

## `%in%` について（申し送り確認済み）

`%in%` は演算子として基礎層 `js/types/r/index.js` の二項演算で実装済み
（NA は NA に、NaN は NaN に一致し相互に一致しない。B13-R R7-28）。
パーサ対応も済んでいるため、本班での追加実装は不要だった。`match` は同じ
照合規則で実装した。

## 端の意味論で裁定した点（根拠つき）

1. **round は R 本体 fround.c のアルゴリズムを再現**。当初「scale して rint」
案は実 R と食い違った（round(0.15,1)：実 R=0.1／案=0.2、round(2.675,2)：
実 R=2.67／案=2.68）。一次ソース fround.c を読み、(a) digits の整数化は
`floor(digits + 0.5)`（実測 round(2.5, 0.6)=2.5、round(123.456, -1.7)=100 と
一致）、(b) 本体は `x*10^dig` の floor/ceil を x との距離 du/dd で比較し、
同点では i10 が奇数のときだけ切り上げる、を double 演算のまま実装した。
実測20点超（0.05→0、0.45→0.4、0.55→0.6、0.65→0.7、0.295→0.3、0.105→0.1、
123.65→123.7、100.15→100.2、100.05→100、負の桁・digits リサイクル含む）
全て一致した。
2. **signif は round と異なる**：実測では10進表示（15有効桁）に対する偶数丸め
（signif(0.15,1)=0.2、signif(0.25,1)=0.2、signif(0.35,1)=0.4、
signif(2.675,3)=2.68、signif(1.005,3)=1）。`toExponential(14)` の15桁を
10進文字列のまま偶数丸めする実装にし、全実測点と一致した。digits の範囲は
公式ヘルプの「1...22」に従いクランプ（実測 signif(x, 0)=1桁扱い、
signif(x, 30) は22桁扱いで不変）。
3. **min/max の NA と NaN の優先順位**（Extremes ヘルプ＋実測）：NA があれば NA、
無ければ NaN があれば NaN（min(c(1,NaN))=NaN、min(c(NA,NaN))=NA）。
空集合は min=Inf／max=-Inf＋警告、character は辞書順、logical は数値化。
range は NaN のとき両端とも NaN（実測）。prod も同じ優先順位で、
prod(numeric(0))=1、character は "invalid 'type' (character) of argument"。
4. **cum 系は一度欠損したら以降すべて欠損**（実測 cumsum(c(1,NA,3))=1,NA,NA、
cummax も同じ）。character は as.numeric 相当へ変換され、変換不能は
NA＋警告 "NAs introduced by coercion"（実測 cumsum(c("a","b"))=NA,NA、
cumsum(c("1","2"))=1,3）。
5. **choose の k は整数化される**（実測 choose(5,2.5)=10＋警告
"'k' (2.50) must be integer, rounded to 2"）。整数 n は積形式（負の n の
一般化も一致：choose(-2,2)=3、choose(-1,1)=-1）、非整数 n は gamma 形式
（choose(5.5,2)=12.375、choose(2.5,3)=0.3125）。k<0 や k>n（n≥0）は 0、
lchoose では -Inf。
6. **gamma の極と溢れ**：非正整数で NaN＋警告 "NaNs produced"、lgamma は Inf
（実測 gamma(-1)=NaN、lgamma(-1)=Inf）。gamma(172) 以降は Inf＋
"value out of range in 'gammafn'"。beta(0,1)=Inf、beta(-1,2)=NaN（実測）。
整数・半整数は直接経路（gamma(5)=24、gamma(0.5)=sqrt(pi) が double まで
実 R と一致）、一般形は Lanczos g=7（相対誤差 ~1e-15、末尾1〜2桁が
実 R と異なりうる。gamma(3.7)：実 R 4.170651783796604／実装
4.170651783796614）。
7. **which は数値を受け付けない**（実測 which(c(0,1,2)) は
"argument to 'which' is not logical" でエラー）。NA は落とす。
which.min/max は NA・NaN を捨て、無ければ長さ0、最初に現れた極値を返す
（which.min ヘルプ）。character は数値変換＋警告（実測）。
useNames=FALSE でも名前が引き継がれる実 R 4.3.3 の挙動を実測で確認し、
名前は常時引き継ぐ実装にした。
8. **order は長さ1のキーをリサイクルしない**（実測 order(c(2,1,3), 1) は
"argument lengths differ" エラー）。sort.list の na.last 既定は TRUE
（formals 実測）、sort／sort.int は NA（除去）。rank の na.last="keep"、
ties.method 各種（random のみ名指し停止）を実装。
9. **log は base もリサイクルされる**（実測 log(8, base=c(2,3)) が動作）。
base=2/10 は log2/log10 で計算し整数値が正確に出るようにした。
10. **trunc は余分な引数を黙って受けるが floor/ceiling はエラー**
（実測 trunc(1.5,2)=1、floor(1.5,2) は
"2 arguments passed to 'floor' which requires 1"）。そのまま再現した。
11. **seq.int(5)=1:5、sequence の負数・NA は
"'lengths' must be a vector of non-negative integers" エラー、小数は
切り捨て**（いずれも実測）。
12. **findInterval の未ソート vec は
"'vec' must be sorted non-decreasingly and not contain NAs"**（実測）。
character の x は数値変換＋警告（実測）。
13. **整数オーバーフロー**：値モデルに integer 型が無く全て double のため、
実 R の integer 演算オーバーフロー（NA＋警告）は発生しない。該当するのは
factorial/gamma の double 溢れのみで、6 のとおり Inf＋警告で再現した。

## テスト結果

- 担当テスト `tests/adv-b4-r-eng1.test.js`：**17テスト群すべて通過**
（切り分け用コピーで確認。後述の統合問題のため）。
- 既存 R テスト `tests/muse-fix-batch13-r.test.js`：担当ファイル起因の
退行は1件のみ（下記申し送り2）。それ以外は従来どおり通過。

## 未確定事項・申し送り（コーディネーター宛て）

1. **names-advanced の定数名が基礎層を壊している**。
リファレンス班が登録した `advancedNames`（1121件）に `NA`, `NULL`, `pi`,
`TRUE`, `FALSE`, `Inf`, `NaN` 等の定数名が含まれ、`js/types/r/index.js` が
それらを FUNCTION_NAMES へ統合するため、値としての `NA`／`NULL` が
「関数名 NA を値として使う形」で停止するようになった。証拠：現行ツリーで
`tests/muse-fix-batch13-r.test.js` が
`print(NULL + "1")` のアサーションで失敗する。担当テストも現行ツリーでは
NA/NULL を使う群が同理由で失敗する（実行時点で 17群中9群通過、変動あり）。
切り分け：ツリーのコピーで names-advanced-part1/2 と
reference-advanced-part1/2 を HEAD に戻すと、担当テスト 17/17・batch13 は
下記2を除き全通過した。対処案：advancedNames から予約定数
（NA 系・NULL・TRUE・FALSE・Inf・NaN・pi・letters 等の Constants トピック
名）を除外するか、index.js の read 側で定数の特殊処理を FUNCTION_NAMES
検査より先に行う（共有ファイルのため本班は未編集）。
2. **batch13 の R7-80 テスト**が「未実装関数の例」
として `sqrt(readline())` の名指し停止を期待している。B4 で sqrt を実装
したため、未確定引数は基礎関数と同様に未確定値として伝播するのが正しい
挙動になり、この1アサーションだけが落ちる。例を未実装のままの実在名
（例：tgamma 等）へ差し替える更新が統合側で必要。
3. **signif の digits の小数 coercion** は未実測（trunc と仮定して実装。
round 側は fround.c で確定済み）。実害は digits に小数を渡す場合のみ。
4. **文字列の照合順序**はロケール依存（実 R の Comparison）。本実装は
C ロケール相当のコード順で近似した。sort/order/rank/min/max/pmax の
character 経路に適用される旨、リファレンス側 caution の参考にされたい。
5. **min(character(0))** は値モデルでは numeric(0) と区別できないため
Inf＋警告になる（実 R は NA＋警告）。モデル側の制約として記録する。
6. **gamma 一般形の精度**は Lanczos g=7 の相対誤差 ~1e-15 が上限で、
実 R（gammafn）と末尾桁が異なる場合がある。整数・半整数・代表的な
beta/choose 値は double まで一致することを実測で確認済み。
7. findInterval の `checkNA = FALSE` 指定時は実 R が「プラットフォーム依存の
無意味な結果」を許す仕様のため、本実装は NA 伝播のままにした
（checkSorted=FALSE の検証スキップは実装済み）。
