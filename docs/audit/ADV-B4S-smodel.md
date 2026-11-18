# 高度モード B4S・R stats モデル系（smodel 班）報告書

担当：R stats のモデル・数式・抽出子表面（BRIEF：`work/b4s-notes/BRIEF.md`、スライス：`work/b4s-notes/slice-smodel.json`）。
成果物は新規ファイルのみ（集約ファイル・既存ファイルは一切編集していない。検証中の一時配線は全て `git checkout` で戻し、tracked ファイルがクリーンであることを最終確認した）。

## 1. 件数（名前単位）

- 担当：114 トピック／196 名（スライス全名にちょうど1項目ずつ作成。テストでスライス順・重複ゼロを機械照合）
- 対応（supported）：4 名 ― na.fail／na.omit／na.pass／offset
- 未対応（unsupported）：192 名
- 未検証（unverified）：0 名
- names 収録：186 名（項目196 − 除外10。第5章）

## 2. 実装した関数と照合根拠（全て実 R 4.3.3 実走）

実装ファイル：`js/types/r/functions-advanced-statsmodel.js`（`builtins` に4件）。

| 関数 | 意味論の確定根拠 | 実走で確認した要点 |
|---|---|---|
| na.fail(object, ...) | 公式ヘルプ na.fail（Usage／Details）＋実 R 実走 | NA でも NaN でも `missing values in object` でエラー。NULL は専用メッセージ `no input has determined the number of cases`（実走で発見し実装に反映）。引数欠落は `argument "object" is missing, with no default`。... の余分な引数は無視される |
| na.omit(object, ...) | 同上 | NA と NaN の両方を除去（実走）。名前属性・データフレームの行名を引き継ぐ。NULL は NULL を返す。除去が無い場合は入力をそのまま返す |
| na.pass(object, ...) | 同上 | 恒等。NULL もそのまま返す |
| offset(object) | 公式ヘルプ offset の Value「The input value」＋実 R 実走 | ベクトル・スカラ・文字列・データフレーム・NULL の全てで恒等。余分な引数は `unused argument (2)`（... を持たない） |

検証方法（多角）：
1. 実 R 4.3.3 の実走（上表の全ケースを Rscript で採取し、期待値化）。
2. ハンドラ単体検証：集約配線前のため .bincode／stest の前例に従い fake ctx で直接検証（`tests/adv-b4s-smodel.test.js`、F-01 分類＝典型／境界／異常／組み合わせを各関数に用意）。
3. simulate 経由の end-to-end 検証：集約3ファイル（functions-advanced.js／names-advanced.js／reference-advanced.js）へ一時配線し、simulate ベースの検証（値・表示・エラーの28ケース）が全件合格することを確認した後に配線を戻した。配線自体はコーディネーター担当。
4. 未対応192名は「名指しで停止し誤った値を返さない」ことをテストで固定（呼び出し形183名＝エンジンの名指し停止文言、ドット始まり5名＝パーサの「式を解釈できません」、見出し2名＝「未定義の名前」）。

範囲の限定（正直な申告）：na.omit は実 R では除去位置を na.action 属性として保持するが、値モデルには属性が無いため保持しない（項目の caution に明記）。属性の消費者は napredict／naresid／na.action のみで、いずれも未対応のため、このモデルの中では観測可能な差異は生じない。

## 3. 慎重候補の検討記録（安易に未対応へ倒さなかったもの）

- na.fail／na.pass：属性を伴わず、ベクトル／データフレームに対する意味論が純粋 → 対応。
- na.omit：除去そのものは値モデルで忠実に表せる → 対応（属性は上記のとおり限定を明記）。
- na.exclude：na.omit との本質的な差異が na.action 属性のクラス（"exclude"）そのものであり、その属性と naresid／napredict の詰め戻しを表せない → 未対応。
- napredict／naresid：第1引数が na.action 属性オブジェクト（クラス付き整数ベクトル）→ 未対応。
- contr.helmert／contr.poly／contr.SAS／contr.sum／contr.treatment：計算自体は純粋だが、返り値が対比行列（matrix）であり値モデルに行列型が無い（B4 の確定制約「リスト型なし・因子なし・行列型なし・関数値なし」）。sparse = TRUE では Matrix パッケージの疎行列クラスになる点も再現不能 → 未対応。
- offset：数式内が本来の用途だが、値としての意味論は恒等で完全に確定できる → 対応（数式内での役割は caution に明記）。
- case.names／variable.names（と各 .lm）：ヘルプ上も lm メソッドのみが文書化され、適合済みモデルのモデルフレームを前提とする → 未対応。
- make.link：関数を含むリストを返す → 未対応。glm.control／nls.control：純粋な制御値だがリストを返す → 未対応。
- D／deriv／deriv3：式（言語オブジェクト）と勾配・ヘッセ属性 → 未対応。get_all_vars／replications：数式＋データ＋環境依存 → 未対応。

## 4. 未対応理由類型の内訳（192名・主類型で集計）

| 類型 | 件数 | 代表例 |
|---|---|---|
| A 適合済みモデルオブジェクト前提（適合・抽出・要約・診断・S3ディスパッチ） | 92 | lm, glm, nls, aov, manova, coef, predict.*, summary.*, residuals.*, cooks.distance, step |
| B 数式・terms・言語オブジェクト依存 | 24 | formula, terms, reformulate, D, deriv, model.matrix, update.formula |
| C family オブジェクト（関数を含むリスト）を返す | 9 | binomial, gaussian, poisson, quasi |
| D リストを返す（制御リスト・結果リスト） | 6 | glm.control, nls.control, make.link, lsfit |
| E ユーザ関数を引数に取りリスト等を返す（最適化・積分・求根） | 10 | optim, nlm, nlminb, constrOptim, integrate, uniroot, optimize |
| F 行列を返す・行列入力 | 13 | contr.*, poly, vcov, lm.fit, hat, printCoefmat |
| G 関数オブジェクトの生成（selfStart 系） | 12 | selfStart, SSlogis 等 SS* 10件, getInitial |
| H 属性・因子への依存（na.action 系） | 6 | na.action, na.exclude, napredict, naresid, naprint, contrasts |
| I stats 名前空間に存在しない・文書見出し | 8 | Error, qr.influence, pairs.profile, plot.profile, profile.glm, SafePrediction, terms.object, vcov.lme |
| J ドット始まり内部関数（共有パーサが受理しない） | 5 | .checkMFClasses, .getXlevels, .MFclass, .lm.fit, .vcov.aliased |
| K グラフィックス描画 | 2 | termplot, plot.profile.nls |
| L 特殊クラスオブジェクト前提（ts・sortedXyData） | 5 | na.contiguous, NLSst* 4件 |

## 5. 名前キュレーション（names から除外した10名と理由）

実在確認は実 R 4.3.3 の stats 名前空間への機械確認（`exists`＋`is.function`、および `getAnywhere`／`ls(asNamespace("stats"))` による再確認）による。188名は関数として存在を確認した。

| 名前 | 除外理由 |
|---|---|
| [.terms / [.formula | S3 のブラケットメソッド（BRIEF §7 の除外規則どおり。項目のみ作成） |
| terms.object | terms オブジェクトの構造を説明する文書トピックで、同名の関数は存在しない |
| SafePrediction | makepredictcall のヘルプ上の概念エイリアス（Rd の \alias）で、関数オブジェクトは存在しない |
| vcov.lme | vcov の lme メソッドは nlme パッケージ側に定義される（R ソース vcov.R の注記「gls and lme methods moved to nlme」）。stats 名前空間に存在しない |
| Error | **関数オブジェクトとして存在しない**。実走確認：`stats::Error` は「not an exported object」、`stats:::Error` は「object not found」。ただし `aov(y ~ x + Error(b))` は正常に動作する ― Error は aov の数式の中で terms の特殊項として処理されるため。項目は作成し、この事実を理由に明記した |
| qr.influence | 実 R 4.3.3 の stats 名前空間に存在しない（現行の lm.influence は C 実装の C_influence を使用。名前空間一覧で確認） |
| pairs.profile / plot.profile | 実 R 4.3.3 の stats 名前空間に存在しない（stats の profile 描画メソッドは plot.profile.nls のみ） |
| profile.glm | 実 R 4.3.3 の stats 名前空間に存在しない（`methods("profile")` で確認できる stats のメソッドは profile.nls のみ） |

申し送り：課題ブリーフでは Error を「実在関数として項目＋names を裁定」とされていたが、一次情報（実 R 4.3.3）がこれと異なるため、項目は作成し names には収録しない裁定とした。基礎層との重複チェックも実施済み（基礎層・B4 part1/part2 の項目・名前との重複ゼロをテストで機械照合。基礎層に R の Error 項目は無い）。

## 6. syntax の照合

- 全188関数について実 R 4.3.3 の `formals()` を一括採取し、自筆 syntax と引数名・デフォルト値を機械突合せした。差分36件＋デフォルト差分17件を修正（例：anova.mlm の完全形、profile.nls の引数名 maxpts／alphamax／delta.t、terms.formula の neg.out = TRUE と allowDotAsName、summary.aov の keep.zero.df = TRUE、stat.anova の test 候補と必須引数 scale／df.scale／n、print.summary.* の symbolic.cor = x$symbolic.cor）。
- deriv／deriv3 は公式ヘルプ Usage のデフォルトメソッド形（function.arg = NULL, tag = ".expr", hessian は deriv3 で TRUE）に修正した。
- ジェネリックで formals が (object, ...) 等に縮約されるもの（manova, update, getInitial, model.matrix, model.tables, integrate）は、公式ヘルプ Usage の文書化された形を採用した。

## 7. テスト結果と回帰切り分け

- 担当テスト `tests/adv-b4s-smodel.test.js`：10件全件合格（未配線の納品状態で合格する形にしてある）。
- 関連既存テスト（adv-b4-r-eng1〜4／data1〜2／content／audit-r、muse-fix-batch{2,3,4,5,12,13}-r、adv-b4s-stest）：失敗は1件のみ ― muse-fix-batch13-r の "unknown function with unknown argument still names the function"。これは一時配線を全て戻した土台ツリーでも同一に失敗する既存事項（B4 §5 の既知事項の範囲）で、本班の変更とは無関係であることを対照実行で確認した（stest 班の報告書でも同一の切り分けが記録されている）。
- adv-b4-audit-r の「到達可能性」テストは B4 の part1/part2 のみを対象に構築されており（テスト冒頭の import で確認）、B4S のハンドラを一時配線した状態では「項目の無いハンドラ: na.fail」と出る。これは集約（reference への part6 統合）が済めば解消する配線順序の問題であり、part6 内部の整合（項目⇔名前⇔ハンドラ）は担当テストで照合済み。統合時に B4S 用に監査範囲を広げる場合はコーディネーター側で対応されたい。

## 8. 未検証・残存

- 未検証（unverified）：0件。意味論が確定できない項目は残らなかった（全項目を公式ヘルプ＋実 R 4.3.3 で裁定）。
- 残存1：R-devel（4.6.0）ヘルプと実 R 4.3.3 で名前の有無が食い違う5名（Error を除く qr.influence／pairs.profile／plot.profile／profile.glm、および vcov.lme）は、BRIEF §6／§7 の規則（実 R 4.3.3 の名前空間で機械確認）に従い 4.3.3 を正とした。将来ランタイムの R が更新された場合は再確認が必要。
- 残存2：na.omit の na.action 属性は保持しない（第2章）。属性を前提とする後段処理は全て未対応のため実害は無いが、属性そのものを扱う機能が将来対応する場合は再裁定が必要。
- 残存3：example は未対応項目では「文書として正しい使用例」であり、エンジンで実行可能という意味ではない（BRIEF §4 どおり）。
