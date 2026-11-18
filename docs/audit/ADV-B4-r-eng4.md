# ADV-B4 R実装班4（残余の純粋関数）報告書

- 担当：R実装班4（コーディネーターが全体統合と監査を行う。GitHub 書き込みなし）
- 成果物：`js/types/r/functions-advanced-mopup.js`（実装）、`tests/adv-b4-r-eng4.test.js`（テスト）
- 検証環境：実 R は `/usr/bin/Rscript` = **R 4.3.3**。一次情報は公式ヘルプ（stat.ethz.ch R-manual）、R 本体の R ソース（各関数の印字）および C ソース（pretty.c／seq.c、いずれも R-4-3-branch）。

## 1. 実装した名前（28件）

all、any、xor、isTRUE、isFALSE、is.finite、is.infinite、is.nan、union、intersect、setdiff、setequal、is.element、rep.int、rep_len、replace、unname、.bincode、pretty、zapsmall、basename、dirname、file.path、char.expand、validUTF8、validEnc、sign、summary

候補28名はすべて reference-advanced-part1/part2 に status="supported" で宣言があることを機械照合した（rep.int のみ例外。下記申し送り1）。開始時に既登録キーを全グループから機械抽出し、重複登録が無いことを確認した（数値班71キー、データ班77キー、基礎層19キーと重複なし。sign は未実装だったため本班で実装）。

主な意味論の裁定（いずれも実 R 4.3.3 で実測）：

- **all／any**：三値論理どおりの NA 規則。na.rm は `...` の後ろ＝名前でのみ指定可で、部分名（na.r 等）はデータとして扱われる。na.rm の強制は C 実装の規則（NA・NULL・長さ0・解釈不能文字列は TRUE 相当、0 は FALSE、長さ2以上は `'length = N' in coercion to 'logical(1)'` でエラー）を再現。数値・文字列引数は引数ごとに強制警告。データフレームは列連結で判定。
- **xor**：R ソース `(x | y) & !(x & y)` どおり。文字列はエラー。リサイクル警告あり（実 R は `|` と `&` で2回出るが、本フレームワークの慣行に合わせ1回だけ出す）。
- **is.finite 系**：型別の規則（文字列は全て FALSE でエラーなし、NULL は logical(0)、名前保持、df は "default method not implemented for type 'list'"）。引数数エラーは `"N arguments passed to 'is.finite' which requires 1"` の形。
- **sets 系**：R ソース（sets.R）どおり。union=`unique(c(as.vector(x), as.vector(y)))`、intersect の NULL 早期 return と重複除去順序、setdiff は x の型で返す、is.element=`match(el, set, 0) > 0`。match は NA↔NA・NaN↔NaN のみ一致（NA≠NaN）。全演算で名前は落ちる。
- **rep.int／rep_len**：どちらも名前を落とす（rep 本体との違いを実測で確認）。times の切り捨て・検証文言（"invalid 'times' value" 等）、rep.int(NULL, 3) の "unimplemented type 'NULL' in 'rep3'"、rep_len(NULL, 3) の "cannot replicate NULL to a non-zero length" を再現。長さ上限は基礎層慣行の10000。
- **replace**：部分代入そのままの規則（範囲外は NA で埋めて拡張、負添字は除外、NA 添字は無言で飛ばす、論理添字はリサイクル、名前添字は未存在名で追加、values 長さ0は "replacement has length zero"、個数不一致は警告）。
- **unname**：ベクトルは名前除去。df は後述の名指し停止。
- **.bincode**：区間規則（right と include.lowest の端の扱い）を実測で確定。breaks に NA／NaN を含む場合は後述の名指し停止。
- **zapsmall**：R 4.3.3 の R ソースそのまま（`digits = getOption("digits")` のみ。mx は NA を除く全要素の最大で、df では全列通算）。digits がベクトルの場合もスカラー max を使う実測挙動を再現。
- **basename／dirname**：数値・論理・NULL は "a character vector argument expected"（強制なし）。dirname は末尾スラッシュ処理を含む導出規則を判別ケース全件で実測と一致させた（例：dirname("a//")="a"、dirname("//a//b//")="//a//b"、dirname("")=""）。
- **file.path**：NA 要素は伝播せず文字列 "NA" になる。リサイクルは無言。fsep は第1要素を文字列化。
- **char.expand**：charmatch の規則（完全一致優先、曖昧なら nomatch を評価せず character(0)、無一致のみ nomatch 評価）を R ソースどおり再現。
- **validUTF8／validEnc**：文字ベクトルのみ（他は "invalid 'x' argument"）。NA 要素は TRUE。モデルでは JS 文字列の孤立サロゲート有無で判定。
- **sign**：.Primitive の引数数エラー文言、df は列ごと処理（文字列列は "non-numeric-alike variable(s) in data frame: 列名"）、名前保持、-0 は 0。
- **summary**：summary.default のうち数値・論理・文字列ベクトルと NULL を実装。分位数は stats:::quantile.default の **type 1〜9 全タイプ**を移植し、実 R とグリッド照合した（下記3節）。digits 指定時のみ signif を全体（Mean 含む）に適用。余分な引数は `...` で無言に無視される実測挙動を再現。

## 2. 実装しなかった候補・名指しで停止する範囲

候補そのものを丸ごと実装しなかったものは **0件**。ただし次の範囲は、誤った値を返すくらいなら api.fail で名指し停止する方針（SPEC 第4章）により、関数内の一部範囲を停止にしている：

- **データフレーム入力**：union／intersect／setdiff／setequal／is.element（as.vector がリストを返すため）、replace の x（リスト部分代入になるため）、unname（force=FALSE でも列名 NULL の df をモデルで表せない。force=TRUE は実 R 自身のエラー "invalid 'dimnames' given for data frame" を再現）、summary（列ごとの整形表を表せない）、xor（列連結の意味論が自明でないため）。
- **.bincode の breaks に NA／NaN を含む場合**：C の二分探索が NaN 比較に依存し、単純な区間規則では再現できないことを実測で確認した（例：.bincode(1.5, c(0, NA, 2)) = 1、.bincode(0.5, c(NA, 1, 2)) = 1 は区間規則と矛盾する）。名指しで停止する。
- **summary の quantile.type が 1〜9 の範囲外**：実 R は壊れた結果や "object 'a' not found" を返すバグ領域のため、`'quantile.type' must be an integer between 1 and 9` で名指し停止にした。
- **summary の factor／list 等**：値モデルで表せないため数値・論理・文字列・NULL 以外は停止。

## 3. pretty の検証方法

近似ではなく移植で実装した：

1. pretty.default の R 4.3.3 ソース（検証順序・既定値・エラー文言）を確認。
2. 本体は R-4-3-branch の pretty.c を移植。**trunk 版と 4.3.3 版で eps_correction の式が異なる**ことを突き止め、4.3.3 版（lo は符号によらず (1−DBL_EPSILON) 倍、up は (1+DBL_EPSILON) 倍、ゼロ端は ∓DBL_MIN／±DBL_MIN）を採用した。警告文言も 4.3.3 の "corrected to" に合わせた。
3. 数列生成は seq.c の規則（両端は from／to に固定、内側のみ `rfrom + i * rby`、rby = (rto − rfrom) / (length.out − 1)）を移植。素朴な `l + i * step` では末端が 1ulp ずれることを実測で確認し、この規則で解消した。
4. グリッド照合：固定端25件×引数バリエーション＋ set.seed(42) のランダム1400件、計 **1525ケース**を実 R 4.3.3 の出力（%.17g）とビット単位で比較。**値照合した1524件は全件一致**。残る1件は `pretty(c(0, 4.9406564584124654e-324), n = 7, eps.correct = 1)` で、実 R が 1,112,539 点を返す非正規数域の退化ケース。アプリのベクトル長上限（10000）とシミュレータ上限により再現対象外とし、ここに名指しで残す。
5. あわせて summary の quantile 全9タイプも3ベクトル×9タイプで実 R と照合し全件一致した。

## 4. テスト結果

- `node --test tests/adv-b4-r-eng4.test.js`：**18件全合格**（実ツリー）。実装した全28関数をカバー（.bincode は fake ctx 直接呼び出し、その他は definition.simulate）。端ケースとして NA と na.rm、空ベクトル、型の異なる集合演算、pretty の複数パラメータ、quantile 全タイプを含む。
- `node --test tests/muse-fix-batch13-r.test.js`：30件中29件合格。失敗1件 `print(sqrt(readline()))`（unknown 引数時の関数名表示）は、**自班ファイルをスケルトンに戻しても再現**し、ベースツリー（repo-reffix）では30件全合格であることを対照確認した。sqrt 実装に伴う既知の陳腐化前提であり本班起因ではない。
- 他班テスト `tests/adv-b4-r-eng1.test.js`／`tests/adv-b4-r-eng3.test.js`：34件全合格（自班の集約追加で壊れていない）。

## 5. 申し送り（宣言・到達性・モデル限界）

1. **rep.int の宣言欠落**：reference-advanced-part1/part2 と names-advanced のいずれにも rep.int の項目が存在しない（part2 の Vectorize 例文中に名前が現れるだけ）。タスク文が明示的に対象に挙げていたため実装したが、宣言側への追加を要する。
2. **zapsmall の mFUN／min.d**：参照宣言にある両引数は R-devel の新引数で、R 4.3.3 には存在しない。本実装は 4.3.3 どおり unused argument で停止する。宣言側を 4.3.3 に合わせるか、将来版に合わせるかの裁定を要する。
3. **.bincode の到達性**：ドット始まり名は共有パーサが識別子として受理せず、simulate 経由では到達不能（データ班の .colSums と同じ状況）。ハンドラは登録済みで、テストは fake ctx の直接呼び出しで検証した。パーサ側でドット始まり名を扱うかの判断はコーディネーターに委ねる。
4. **summary の空ベクトルの型区別**：モデルでは numeric(0)／logical(0)／character(0) がすべて空配列で区別できない。本実装は空ベクトルを数値分岐に倒す（実 R の summary(logical(0)) は Mode のみを返す点で乖離する）。型タグ付き空ベクトルをモデルに導入しない限り解消しない。
5. **rep_len(numeric(0), 3) の型付き NA**：実 R は型付き NA を返すが、モデルの NA は無型のため無型 NA で代替した。
6. **basename(NA) の解釈**：モデルの NA は無型。実 R では論理 NA はエラー、NA_character_ は NA を返す。本実装は NA 要素を NA_character_ と解釈して NA を返す（basename(TRUE) 等の論理ベクトルはエラーにする）。基礎層で typeof(NA) = "logical" としている点と併せ、単独 NA の扱いは解釈が分かれる箇所として残す。
7. **pretty の警告文言の数値整形**：R の %g（有効数字6桁）を簡易整形で近似した。文言の骨格は 4.3.3 原文どおりだが、数値の桁表現が実 R と完全一致しない場合がある。

## 6. 未確定事項

- 上記申し送り1・2は宣言側の裁定待ち（実装はタスク文と実 R 4.3.3 に従った）。
- 申し送り3はパーサ側の判断待ち。
- pretty の退化ケース1件（3節）はアプリ上限により再現対象外として確定扱いにせず、未検証候補としてここに残す。
