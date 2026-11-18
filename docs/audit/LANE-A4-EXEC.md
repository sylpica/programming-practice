# 高度A4班（Excel VBA ＋ R）監査・修正 実行報告書（LANE-A4-EXEC）

- 対象ツリー：`work/lane-a4-exec/`（repo-reffix HEAD 04dfe2d の完全コピー）
- 計画正本：`lanes/lane-a4/plan.md` ／ `probes.md`（プローブ84件）
- 所見ファイル：`findings-a4-complete.md`（完全性・到達性）、`findings-a4-vba-const.md`（VBA定数）、`findings-a4-vba-sem.md`（VBA意味論）、`findings-a4-r-sem.md`（R基礎意味論）、`findings-a4-r-stats.md`（R統計／utils）
- 本班の合格はアプリ全体の収束ではない（U-46）。

## 1. フェーズ0（分母確定）

B4 報告書（ADV-B4-REPORT.md）と B4S 報告書（ADV-B4S-REPORT.md）を取り込み、統合ツリー（04dfe2d）上で実測した。

### VBA
- 基礎リファレンス 338件（対応318／未対応20）、高度ファイル 201件（対応128／未対応73）＋上書き10件 → 統合カタログ **539件（対応450／未対応89／未検証0）**。重複名・統合不整合なし。
- 高度定数（advancedConstants）は46エントリ。定数は基礎カテゴリ「定数」242件と合わせて**個別項目として員数照合**（棚卸し inventory-vba.md の規則どおり）。
- B4 の「対応132」はハンドラ側の数え（関数81＋文5＋定数46）であり項目数ではない。統合実データ 539／450／89 を正とする。

### R
- 基礎 44件（全対応）。高度 part1＋part2 ＝ 1,085件（B4）、part3〜part10 ＝ 916件（B4S：110＋33＋38＋196＋127＋91＋37＋284）。
- 高度合計 **2,001件（対応369／未対応1,632／未検証0）** ＝ B4S 主張と一致。統合 **2,045件（対応413／未対応1,632）**。
- advancedNames は 1,759 一意名 ✓。advancedBuiltins はハンドラ Map 348件（対応369とは設計上一致しない。C-12 の挙動が裁定基準）。

### RG-633 スポット確認
引き継ぎ17名全て存在。未対応8件（ptukey／qtukey／psmirnov／qsmirnov／bw.ucv／bw.bcv／bw.SJ／.nknots.smspl）は description に理由を明記。

## 2. 実施角度（計画 §4）

74件実施／8件部分／10件対象外（理由は各所見ファイルに記載）。主な角度：一次資料照合（Microsoft Learn／MS-VBAL、R 公式ヘルプ＋実 R 4.3.3 実測）、ブラインド再導出（定数期待値表を Learn 22ページから独立構築、R プローブは実 R 先行測定）、C-12 宣言↔挙動マトリクス全件、到達性・完全性の機械照合（F-02／F-03）、差分プローブ（入力を変えた実 R 突合せ）、ファズ的境界（規模ガード境界の内外）。

## 3. プローブ結果

- VBA：V1–V24／VB1–VB13／VC1–VC9（46件）＋A群角度を実施。裁定変更2件：**V9b は 0/0 がエラー6（MS-VBAL 5.6.9.3.5。probes.md の期待値11を一次資料で是正。1/0＝11 は不変）**、V12 はシリアル値モデルとして裁定、V13／VC5 の日付リテラルは既裁定のモデル限界。
- VBA 定数280件：値 280/280、VarType 280/280（モデル内基準）、リファレンス本文の数値主張 280/280、検索到達性 280/280。VC1–VC9 全通過。**新規欠陥0**。
- R：R1–R28／RB1–RB10（38件）全件裁定。アプリ側の値・挙動の不一致0件。期待値側の誤り3件はいずれもアプリが正しいことを実 R で確認（median(NaN)＝NA_real_、seq(NULL)＝integer(0)、as.numeric()＝numeric(0)）。deparse 再構成スイープ約90形、F-01 拡張約95件（欠損値ケース）を実 R と突合。
- RG-633 裁定（13群）：10群は開示どおり通過。3件の欠陥を検出・修正（§4 の D1–D3）。

## 4. 新規欠陥と修正（全て根本修正＋回帰テスト）

### VBA（js/engine.js、js/content.js、js/types/vba/index.js）
- **SEM-01（中度）**：検査関数（IsObject／TypeName／VarType／IsArray／IsDate／IsError 等）が Nothing／Range を検査できず、エラー91 や誤答（TypeName(Range)＝"String" 等）を返した。引数解決が既定プロパティ変換・エラー91変換を先行させるのが根因。Nothing を8関数、Range を3関数へ素通しするよう是正。
- **SEM-02（中度）**：文字列×数値の比較が静的型付き経路でのみ未対応停止し Variant 経路と矛盾。MS-VBAL に従い typedCompare が文字列側を Let 変換（失敗時はエラー13）してから数値比較するよう是正（Select Case でも有効）。Boolean×String は規則確定不能のため未対応のまま（残存）。
- **SEM-03（中度）**：String 関数が未実装（String 型項目との名前衝突）。Learn に基づき基礎組込として実装（負数→エラー5、Null→94、範囲外コード→5 等）。
- **F-04（軽度・開示処置）**：VarType／TypeName／Hex／Oct の値モデル差（統一 Double モデル）を caution 開示に切替（値は変更せず）。定数チームからの VarType 数値モデルの申し送りへの回答を兼ねる。
- **V-D06-1（中度〜高度・完全性チーム指摘）**：高度201項目が使用中チップに解決されなかった（usedReferences が基礎338のみ照合）。content.js に registerReferenceNames を追加し、vba/index.js で高度名を登録（199/211。「#」含み5件・「...」含み7件は誤一致防止のため除外し理由を明記）。簡易モードでは app.js の実効カタログ判定で高度名が落ちることを複製検証済み。
- **V-到達1（軽度・同上）**：基礎定数234件がフルネーム検索（ColorConstants.vbBlack 等）で到達不能。フルネーム対応表234件を inventoryNames として付与（生成側照合 234/234）。

### R 基礎（js/types/r/index.js、functions-advanced-math.js、reference-advanced-part1/part2）
- **D-1（中度）makeNameR の X 接頭辞規則**：`-(1 + 1)` が "..1...1."（実 R "X..1...1."）等。?make.names の規則（元の先頭文字で判定）に是正。
- **D-2（中度）文字列リテラルの deparse に引用符なし**：`data.frame("a")` が "a"（実 R "X.a."）。引用符＋エスケープ付きで再構成するよう修正。
- **D-3（軽度）右辺の単項演算子への余分な括弧**：`2 ^ -1` が "X2...1."（実 R "X2..1"）。全演算子を実測し是正。修正後スイープ全形が実 R と一致。
- **D-4（中度）sd の文字列強制**：実 R は `sd(c("a","b"))`＝NA＋強制警告（var 経由 as.double）。基礎集計ハンドラに強制＋警告を追加。既存テスト期待値1件を実測＋公式ヘルプの両証拠で変更。
- **D-5（軽度）sort.list の method="quick" 誤拒否**：実 R は受理（order は不受理）。共有ハンドラの候補を関数別に分岐。
- **R-D06-1（中度・完全性チーム指摘）**：実行前 scan が基礎44のみ＋ドット名5件（data.frame 等）を解決不能。照合対象を実効カタログ（基礎＋高度 part1〜10）へ拡大し、ドット名は1トークン完全一致、高度演算子・`$<-`／`[<-`・深度0の `=` を補完。
- **R-D06-2（中度・同上）**：高度演算子（21件）が trace refs を出さず、基礎定数（NA／NULL／NaN／Inf／TRUE／FALSE／T／F）が実行後未登録。全二項演算子・単項・&&／||・定数8件の裸参照・代入／置換演算子を登録。例外：`(` は AST に括弧ノードが残らず trace refs では表現不能（scan では解決可能。同種の制限として記録）。
- **R-挙動2（軽度・同上）**：未定義基底への `df$x <- 1` が誤った案内で停止。未定義名として帰属を是正（添字形・入れ子形も同根処理）。
- **R-C12-1（軽度〜中度・同上）**：未対応7項目の example が汎用経路で実行できてしまう。part2 の6件（`{`、pretty.default、print.data.frame、print.summaryDefault、print.summary.table、summary.table）を直接形に差し替え全て停止を実測。`[.table` は名前が `[` で始まり共有パーサで呼出形に書けないため分離（現行 example 据え置き、食い違いを所見に明記）。
- **R-example1（軽度・同上）**：対応96項目の example が単独実行不能（未定義の前提変数）。全件 part1／part2 所在と確定し、**part2 の26件は前提追加を適用し全件単独実行を実測**。**part1 の53件は本統合で前提追加を適用し、統合ツリー上で 53/53 単独実行を実測**（うち `single` は前提を `x <- 2` に是正：`single(c(1,2))` は実 R でも "invalid 'length' argument" であり、アプリの挙動は実 R と一致することを確認のうえ example 側を修正）。分離17件（引数不足の断片、未対応ラッパ、Trig 6件、代入文自体）は理由を所見に明記。

### R 統計／utils（functions-advanced-statstest.js、reference-advanced-part3／9／10）
- **D1（中度）p.adjust の `n` 引数**：実 R の NA／NaN 時文言は `n >= lp is not TRUE`（stopifnot）であり B4S の推定文言と相違。文字列 n="3" が誤って調整値を返していた（実 R は "non-numeric argument to binary operator"）。実 R の評価順序どおり根本修正。B4S の「未実測文言」残存は本件で**実測により解消**。
- **D2（軽度）pbirthday**：実 R の classes ベクトル時のゴミ値（-2079246038392.4644）逸脱が未開示だったため caution に開示追加（アプリの挙動自体は正）。
- **D3（軽度）formatUL／formatOL**：formatRNum 近似が未開示（実測差分：実 R "200.0" vs アプリ "200"、極端桁での科学表記切替）。caution に開示追加（挙動の全面再実装はせず開示裁定）。
- **理由マーカー形式統一**：part9 の非標準形式23件を全て 形式へ統一し、part3〜part10 の未対応787件全件がマーカー形式であることを機械検証。

### B4 残存の再実測（解消確認）
完全性チームの再実測で、B4 残存3件が統合ツリー上で解消済みであることを確認した：CVErr 表示は全経路 "Error 2042"（`[object Object]` なし）、ファイル番号文12形は全て文名で停止、`.bincode` ハンドラは削除済み（項目は理由付き未対応）。台帳側の記録更新は親（統合担当）の作業として申し送る。

## 5. 裁定変更

- **vbCalGreg=0／vbCalHijri=1 を確定**：Learn の Calendar 定数表で確認（従来は未確認候補）。アプリの値・本文と一致。
- **V9b（0/0＝エラー6）**：MS-VBAL 5.6.9.3.5 で probes.md の期待値を是正。
- **p.adjust 文言**：B4S 推定文言を実 R 実測で是正（§4 D1）。
- 既存テスト期待値の変更は4件（バッチ13：deparse 2件・sd 1件、他1件は sd 強制に伴うもの）。いずれも実 R 実測＋公式ヘルプの両証拠をテスト内コメントに明記。

## 6. 残存・未確認

- VBA：VB9（次元0のエラー番号は9のまま未確認）、VB10（Len(True) リテラル形は未確認）、V18b（Replace の start<1）、IsNumeric(Nothing)／IsMissing(Nothing)（SEM-01 の同根だが値が確定不能のため未処置）、Boolean×String 比較（規則確定不能）、StrConv vbProperCase の数字境界（未確認のまま正直に表示）、棚卸し外定数3件（vbSimplifiedChinese 等。裏付けなしとして記録し値を断定せず）。
- R：`(` の trace refs 表現不能（§4 R-D06-2 の例外）、`[.table` の example 食い違い（§4 R-C12-1）、NA 列名の "" 表現（バッチ7裁定の表現限界）、R16b 文字添字の新要素代入の正直停止、read.csv の text 引数非対応、bitw の型なし NA 制限、match.arg の NA 解釈差、`var` の同根の文字列強制（sd と同根。統計チーム所見経由で記録のみ）、sum／prod のエラー文言差。
- 性能残存：dsignrank n≈400 の冷実行が低速 VM ではエンジンの 1200ms 上限に当たり、正しい値の後に切断通知が付くことがある（誤値なし）。
- **RG-634**（setNames の NA 名が `[object Object]` と表示される artifact）は基礎層 index.js 起因で**他班の範囲**として再確認のみ（値レベルの is.na(names()) は実 R と一致）。
- 基礎層 as.character(1e12) の同根事項を記録のみ。

## 7. テスト結果

- 基準線（着手前・UTC）：7,164件中 7,159 pass／5 fail（全て既知のタイミング・フレーク族：パス上限系4件＋P-N4）。
- 新規テスト（統合ツリー上で実行）：tests/lane-a4-vba-sem.test.js 33件、tests/lane-a4-vba-const.test.js 4件、tests/lane-a4-r-sem.test.js 13件、tests/lane-a4-r-stats.test.js 13件 ＝ **63件全通過**。
- 全体スイート（統合ツリー・UTC、4群に分けて実行）：**7,227件（＝基準線7,164＋新規63）中 7,226 pass／1 fail**。唯一の失敗は cmd パス上限テスト（10秒予算超過のタイミング・フレーク）。**cmd＋audit の単独再実行では 1,582/1,582 全通過**し、基準線で未確定だったフレーク疑い2件（cmd パス上限、audit 入れ子マクロ パス上限）は環境フレークとして裁定を確定した。自変更起因の失敗は0件。
- precache：統合ツリー上で再生成し `node scripts/precache.mjs --check` 通過（キャッシュ名 programming-practice-79e502f278c6c6）。
- 統合ツリー上の分母再検証：mergeCatalog 実測で VBA 539（対応450／未対応89／未検証0、problems なし）、R 2,045（対応413／未対応1,632／未検証0、problems なし）＝フェーズ0確定値と一致。

## 8. 触ったファイル

- js/engine.js（SEM-01／02／03）
- js/content.js（registerReferenceNames 追加）
- js/types/vba/index.js（高度名登録、F-04 caution、フルネーム対応表234件）
- js/types/r/index.js（deparse 3系統、sd 強制、scan、refs、未定義名帰属）
- js/types/r/functions-advanced-math.js（D-5）
- js/types/r/functions-advanced-statstest.js（p.adjust）
- js/types/r/reference-advanced-part1.js（example 前提53件。うち single は前提是正を含む）
- js/types/r/reference-advanced-part2.js（example 前提26件、C12 直接形6件）
- js/types/r/reference-advanced-part3.js（pbirthday caution）
- js/types/r/reference-advanced-part9.js（理由マーカー23件）
- js/types/r/reference-advanced-part10.js（formatUL／formatOL caution）
- tests/lane-a4-vba-sem.test.js（新規33件）、tests/lane-a4-vba-const.test.js（新規4件）、tests/lane-a4-r-sem.test.js（新規13件）、tests/lane-a4-r-stats.test.js（新規13件）
- tests/muse-fix-batch13-r.test.js（期待値3件を両証拠付きで変更）
- precache.js（再生成）
- docs/audit/LANE-A4-EXEC.md（本報告書）

## 9. 環境障害の記録

作業期間中、exec（bash）プロセスのファイル書き込みが EPERM で全面ブロックされる障害が継続した（読み取り・テスト実行・ファイルツール経由の書き込みは可能）。このため各チームのローカルコミットは障害中に完了できず、統合はファイル内容のバイト照合（sha256／cmp）をもって実施した。転送時の転記劣化（空白・インデント欠落）に対処するため、読み取り直後の小チャンク転送＋機械照合を徹底した。tests/lane-a4-r-stats.test.js の MARKER 行のみ、元ファイルの \u エスケープ表記に対しリテラル文字表記となった（JS 文字列として同一値。機能差なし）。障害中に一度、統合先の js/content.js と js/engine.js が 0 バイト化する事故があったが、チームツリーの正本からバイト単位で復旧し sha256 一致を確認済み。repo-reffix 本体には一切触れていない。
