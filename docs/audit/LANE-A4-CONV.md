# 収束判定ラウンド報告書：高度A4班（Excel VBA＋R）

- 対象：統合ビルド（修正バッチ17）branch batch17-integration、HEAD 4771801
- 作業ツリー：`~/workspace/programming-practice-audit/work/lane-a4-conv/`（repo-reffix 本体は不変）
- 判定：**新規実質欠陥 1件（修正済み）** — CONV-A4-01（R の sort／order 系 NULL 入力処理）。詳細は §4。
  - 本班の結果は全体の収束判定そのものではない（U-46：全角度ラウンドで新規実質欠陥ゼロが収束条件）。

## 1. 分母の再現（mergeCatalog 実測、統合ビルド）

| 言語 | 総数 | 対応 | 未対応 | 未検証 | problems | 重複名 |
|---|---|---|---|---|---|---|
| VBA | 539 | 450 | 89 | 0 | [] | 0 |
| R | 2,045 | 413 | 1,632 | 0 | [] | 0 |

- VBA 定数カテゴリは 288件（基礎242＋高度46）全て対応。台帳の定数メンバー280件との差分8件（Empty／Null／Nothing／True／False／vbSimplifiedChinese／vbTraditionalChinese／vbLinguisticCasing）は前回裁定どおり。
- 基準線（VBA 539＝450／89、R 2,045＝413／1,632）を統合ビルドで再現した。

## 2. プローブ再実行（計画正本 probes.md：84件＋拡張電池）

### 2.1 VBA プローブ（46件・約82サブケース）

- 結果：68 pass／7 fail／5 observe。**7 fail は全て前回裁定済みの状態と一致**し、新規欠陥なし。
  - V18b（Replace の start<1）：Microsoft Learn が未定義のため**未確認候補**のまま（欠陥としない）。
  - V20c／V20d（AscW／ChrW）、VB8（LenB）：カタログ外項目への名指し停止（findings-a4-vba-sem.md §冒頭の裁定どおり）。Len の caution は LenB 未対応を開示済み。
  - V21c（Hex(CLng(-1))="FFFF"）、V23a／V23b（VarType が 5）：**F-04 の開示済み統一 Double 値モデル**。VarType／Hex の caution 文面（数値は Double で保持／最小型幅）を本ビルドでも確認。
  - VB13（Len(String(1000000,"a"))）：SEM-03 の設計どおり、値長上限（200,000）超過は不定値として正直に表示（捏造なし）。
- 主な正常確認：V9a（1/0→エラー11）、V9b（0/0→エラー6。MS-VBAL 5.6.9.3.5 準拠。probes.md 記載の「11」は古い）、V12／V13（シリアル日付モデルで整合：DateSerial(2026,3,1) のシリアル 46082、DateAdd 月末→2026/2/28、DateDiff=9）、V15b（Option Base 1 で LBound=1）、V6b（"a" + Null の Null 伝播）、VB11／VB12（Option Explicit 未宣言・ループ外 Exit For はパース時帰属で停止）。
- VBA 定数280件のブラインド照合（期待表は Learn 定数ページ22件から独立構築）：回帰テスト `tests/lane-a4-vba-const.test.js`＋`lane-a4-vba-sem.test.js` の 37件が統合ビルドで全通過。vbCalGreg=0／vbCalHijri=1 を Learn の Calendar 定数ページで再確認。StrConv vbProperCase の数字境界は未確認のまま、正直な（断定しない）表示を維持。

### 2.2 R プローブ（38件・約66サブケース、実 R 4.3.3 を最終審級として照合）

- 結果：**新規欠陥ゼロ**。全ての相違は findings-a4-r-sem.md §1 の裁定済み状態と一致。
- probes.md 側の期待値誤り（アプリが正しいことを実 R で再証明）：R3c（median(NaN)=NA）、RB1b（seq(NULL)=integer(0)）、RB7（as.numeric()=double(0)）。
- 型付き NA（NA_real_ 等）は未対応宣言どおりの名指し停止。等価形で再検証し全て実 R と一致（is.nan(as.numeric(NA))=FALSE、NaN %in% as.numeric(NA)=FALSE、NA %in% NaN=FALSE 等）。
- R12c（print(1/3) の全精度表示）は確立済みの表示規約（テストで固定）。R14（data.frame((1+1)) の列名）は R7-27 の開示済みモデル制限（値は正しい）。R16b（文字添字での新要素代入）は正直停止の既知残存。R22（read.csv の text 引数）はモデル内蔵データ専用経路の制限（項目文面で開示）。
- RG-633 スポット確認：実装不能8件（ptukey／qtukey／psmirnov／qsmirnov／bw.ucv／bw.bcv／bw.SJ／.nknots.smspl）は全て未対応宣言＋理由文のまま。runmed／bw.nrd／bw.nrd0／p.adjust は対応。
- **RG-634（簡易班の NA 名表示修正）の統合確認**：`print(setNames(c(1,2,3), "a"))` → `c(a = 1, 2, 3)` と正確に表示（統合ビルドで成立）。NA 名は接頭辞なしで表示され、names() の意味論は不変。

### 2.3 R deparse 拡張スイープ（90形）

- 原子・単項／二項演算子・組込み呼出・入れ子の組合せ90形で `names(data.frame(式))` をアプリ×実 R で突合。
- 結果：82形完全一致、7形は括弧形（R7-27 の開示済み制限クラス：明示括弧が deparse で落ちる。値には影響なし）、1形は factor（未対応宣言どおりの名指し停止で、宣言と整合）。
- 前回 D-1／D-2／D-3 の修正が保持されていることを確認。**新規欠陥ゼロ**。

### 2.4 R 差分バッテリ（欠損値系 105ケース）

- 関数26種（mean／median／sd／var／sum／prod／min／max／range／length／sort／rev／unique／cumsum／abs／sqrt／log／exp／round／any／all／sign／floor／ceiling／as.numeric／as.character／head／tail）×入力（NULL／numeric(0)／NA／NaN／c(1,NA)／c(1,NaN)／文字／論理／Inf／na.rm 変種）を最終状態の値レベルで実 R 4.3.3 と突合。
- 結果：**105件中104件完全一致**、残り1件（as.character(Inf)）は照合ハーネスの直列化都合（アプリの値も文字列 "Inf" で正しい）。警告の有無・エラー有無も全件一致（range(NULL) の警告件数差は実 R の2件をアプリが1件に集約する表現差で、値と警告の存在は一致）。
- 前回 F-01 系（min(NULL)=Inf＋警告、mean("a")=NA＋警告、unique の NA／NaN 保持等）は全て保持。

### 2.5 全項目 example 実走電池（宣言↔挙動マトリクス）

| 言語 | 宣言 | 件数 | 実行可 | 停止 |
|---|---|---|---|---|
| VBA | 対応 | 450 | 448 | 2（分離・下記） |
| VBA | 未対応 | 89 | 0 | 89 |
| R | 対応 | 413 | 396 | 17（分離・下記） |
| R | 未対応 | 1,632 | 1（`[.table`・既知残存） | 1,631 |

- VBA の停止2件は Option Explicit／Option Base（モジュール先頭宣言）。正位置（モジュール先頭＋後続 Sub）で実走し正常実行を確認（LBound=1 等）。欠陥ではない。
- R の停止17件は R-example1 で文書化された分離集合と**名前まで完全一致**（agrepl、char.expand、getElement、`$<-`、`[<-`、grepv、sort.list、rev、gamma、strwrap、cos、cospi、sin、sinpi、tan、tanpi、unname）。R-example1 の前提追加79件（part2 26件＋part1 53件）が統合ビルドで成立していることを裏付けた。
- R 未対応で実行できた1件 `[.table` は §5.5 の既知残存（直接形が共有パーサで書けないため汎用 `[` 経路の example を据え置き）。
- example 実行経路での `[object Object]` 混入は両言語とも0件。

## 3. 前回修正分の保持確認

- テストスイート内の A4 回帰テスト群（lane-a4-vba-const／lane-a4-vba-sem／lane-a4-r-sem／lane-a4-complete 系）が統合ビルドで全通過（§5 のゲート参照）。
- 個別確認：VBA 検査関数（SEM-01/02/03）、文字列×数値比較、到達性2件（V-D06-1：高度名がチップで解決し mergeCatalog problems []、V-到達1：inventoryNames 234件のフルネーム解決）、R deparse 3系統、sd 文字列強制、p.adjust の n 引数、sort.list の method="quick" は全て保持。

## 4. 新規実質欠陥 CONV-A4-01（修正済み）

- **内容**：R の sort／order 系の NULL 入力処理が実 R 4.3.3 と相違していた（差分バッテリの周辺スポット確認で発見。バッテリ本体105件には含まれない表面）。
  | 表面 | 実 R 4.3.3 | 修正前 | 修正後 |
  |---|---|---|---|
  | sort(NULL) | NULL を返す | 空ベクトル（is.null=FALSE、print は c()） | NULL ✓ |
  | sort.int(NULL) | NULL を返す | 空ベクトル | NULL ✓ |
  | order() | NULL を返す | 空ベクトル | NULL ✓ |
  | order(NULL)／order(NULL, 1:3) | エラー "argument 1 is not a vector" | 無言で空／"argument lengths differ" | 実 R と同一文言でエラー ✓ |
  | order(1:3, NULL) | エラー "argument 2 is not a vector" | "argument lengths differ" | 同一文言 ✓ |
  | sort.list(NULL) | エラー "argument 1 is not a vector" | 空ベクトル | 同一文言 ✓ |
  - rev(NULL)=NULL、rank(NULL)=長さ0 は従来どおり一致していた（回帰テストで固定）。
- **根本原因**：`js/types/r/functions-advanced-math.js` の sortCore が NULL を空配列に潰していたこと、および orderHandler が NULL のデータ引数を空ベクトルに読み替えていたこと。
- **修正**：sortCore 先頭で NULL をそのまま返す／orderHandler で sort.list の NULL を名指しエラーにし、order の NULL データ引数を位置番号つきエラー（"argument N is not a vector"）にし、データ引数なしの order() は NULL を返すよう是正。いずれも実 R 4.3.3 実測に基づく。
- **回帰テスト**：`tests/lane-a4-conv.test.js`（8件、全通過）。通常の sort／order 挙動が不変であることも同テストで固定。
- **precache**：変更ファイルは高度差分ファイル（`-advanced*.js`）であり precache 対象外（scripts/precache.mjs の ADVANCED_FILE_RE）。`node scripts/precache.mjs --check` 通過。

## 5. ゲート結果

- 対象ツリーのテスト総数：**7,520件**（基準線 7,512 ＋ CONV-A4-01 の回帰テスト8件）。
- **UTC 全スイート：7,516 pass／4 fail**。**JST 全スイート：7,517 pass／3 fail**。
- 失敗は全て「2000パス上限」系の壁時計予算テスト（cmd／powershell／engine／audit のマクロ直積／CFN）で、10班並行実行による高負荷（ロードアベレージ最大32.5、割当1.5 CPU）下でのタイミングフレークと裁定する。根拠：
  1. **ベース対照**：変更前の無変更ツリー（HEAD 4771801 そのまま）での UTC 全スイートでも同一署名の失敗が3件出た（cmd／powershell／CFN R25-N4、いずれも約10秒の予算到達＋パス数不足）。
  2. **個別再実行で全件通過**：cmd.test.js 41/41、powershell は cmd との2ファイル実行で通過、engine.test.js 43/43（"default maximum is exactly 2000 paths" を含む）、audit.test.js 1,541/1,541（"audit nested macro cross product" を含む）、CFN R25-N4 は個別通過。本班の変更（R の sort／order のみ）との因果経路はない。
  3. 統合ビルドは班開始前に UTC／JST とも 7,512/7,512 全通過が確認されている。
- A4 関連の回帰テスト群（lane-a4-vba-const／lane-a4-vba-sem／lane-a4-r-sem／lane-a4-complete 系＋新規 lane-a4-conv 8件）は両 TZ の全スイート内で全通過。
- precache：`node scripts/precache.mjs --check` 通過（変更ファイルは高度差分で precache 対象外のためマニフェスト不変）。

## 6. 残存・未確認（前回からの引き継ぎ、いずれも未修正のまま記録）

- V18b（VBA Replace の start<1）：Learn 未定義のため未確認候補のまま。
- VB9／VB10 系の未確認保持事項、StrConv vbProperCase の数字境界：未確認のまま（断定しない表示を維持）。
- R16b（文字添字での新要素代入）：正直停止の制限。
- R22（read.csv の text 引数）：モデル内蔵データ専用経路の制限（文面開示あり）。
- R14（明示括弧形の列名）：開示済みモデル制限。
- 型付き NA の直接形：未対応宣言どおりの停止（等価形で意味論は到達可能）。
- `[.table` の example と宣言の食い違い：既知残存。

## 7. 台帳への提案（共有記録は変更していない）

- CONV-A4-01 を台帳に登録すること：種別＝是正（実 R 照合）、対象＝R sort／order 系 NULL 入力、根拠＝実 R 4.3.3 実測、回帰テスト＝tests/lane-a4-conv.test.js。
- probes.md の V9b 期待値「11」は MS-VBAL 準拠の「6」へ更新すること（アプリの現行挙動が正しい）。

## 8. 触ったファイル

- `js/types/r/functions-advanced-math.js`（CONV-A4-01 修正）
- `tests/lane-a4-conv.test.js`（新規：回帰テスト8件）
- `docs/audit/LANE-A4-CONV.md`（本報告書）
- `docs/audit/lane-a4-work/`（作業スクリプト一式：分母・プローブ・差分／deparse 電池・example 電池の実走コード。アプリ本体ではない）
