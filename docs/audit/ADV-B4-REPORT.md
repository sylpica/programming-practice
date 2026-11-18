# 高度モード ブロックB4（Excel VBA＋R）統合報告書

コーディネーター統合報告。作業ツリー `work/adv-b4/`（ベース bba3b26）にローカルコミット済み。GitHub への書き込みは行っていない（使った書き込みコール数：0件。配信は親工程の担当）。

## 1. 成果物と最終件数

### Excel VBA（高度対象 約438件＝未収載203＋参照のみ10＋定数・既存分の確定裁定）

| 区分 | 件数 |
|---|---|
| リファレンス追加項目（referenceAdvanced） | 201 |
| 基礎項目への上書き（referenceOverrides） | 10 |
| うち対応（supported） | **132**（関数81＋ステートメント5＋定数46） |
| うち未対応（unsupported） | **79**（全件に名指し理由を description へ明記） |
| うち未検証（unverified） | **0** |
| 関数ハンドラ（functions-advanced.js） | 81 |
| 定数（constants-advanced.js） | 46（列挙型5グループ、値は Learn で全件裏付け） |
| テンプレート | 5（全件シミュレータ実行＋値照合済み） |
| 用語集 | 13 |

### R（base パッケージ 436トピック／関数名1,298行）

| 区分 | 件数 |
|---|---|
| リファレンス追加項目（referenceAdvanced、part1＋part2） | 1,085 |
| うち対応（supported） | **240** |
| うち未対応（unsupported） | **845**（全件に名指し理由を description へ明記） |
| うち未検証（unverified） | **0**（監査で5件全て確定裁定し未対応へ移行） |
| 関数ハンドラ（4グループファイル合計） | 220 |
| 名前一覧（advancedNames、関数名のみ） | 929 |
| 基礎項目への上書き（referenceOverrides） | 0（反転が必要な基礎項目は無いことを監査で確認） |
| テンプレート | 7（全件シミュレータ＋実 R で出力一致を確認） |
| 用語集 | 12 |

## 2. 進め方（チーム編成と検証）

- 編成：コーディネーター＋11班（VBA実装／VBAデータ／Rデータ×2／R実装×4／Rコンテンツ／監査×2）。各班は所有ファイルを分離し、一次情報での裏付けと専用テストを必須とした。
- 一次情報：VBA は Microsoft Learn の言語リファレンス、R は公式ヘルプ（stat.ethz.ch、R-devel）＋実 R 4.3.3（この VM にインストールして実走照合。Codex 監査の実測記録は補助証拠に留めた）。
- 監査：角度カタログをブロック範囲で全件実施（仕様書 ADV-B4-SPEC.md 第7章に適用範囲と対象外理由を明記）。宣言↔挙動マトリクスは両種別とも機械照合で全件一致を確認した。

## 3. 監査結果

### VBA 監査（報告書 ADV-B4-audit-vba.md）
- 欠陥10件を発見し全件修正（監査テスト19件で固定）：TimeValue の Null 規則、InStrRev／StrComp の端規則・Null、財務の非有限値（NPV／MIRR）、CDec の定義域、DateSerial／DateAdd／TimeSerial の範囲ガード、Format の文字列書式、MonthName の caution 文面ほか。
- 新規欠陥類型：**負シリアルの OLE 符号化**（1899-12-30 より前の日付＋時刻で Day／Hour がずれる）を発見し、符号化ヘルパを新設して4経路に適用した。今後の日付系監査の恒常チェック候補。
- 全211件の example 実走、定数46件の Learn 全件照合、財務・日付の全件照合（IRR は独立計算と 1e-12 一致）を実施。

### R 監査（報告書 ADV-B4-audit-r.md）
- 宣言の最終裁定：対応→未対応 134件（行列・線形代数・リスト・因子・特殊形・定数値・到達不能等、理由類型別に内訳あり）、未対応→対応 8件（環境アクセス系。実 R 照合のうえ反転）、未検証→未対応 5件（全件確定し未検証は0に）。運算子・構文21件はプローブで実評価を確認し対応を維持、小さく忠実な11件（bitw 系・ポリガンマ・anyNA・match.arg）は新規実装（ポリガンマは実 R と最大相対誤差 5.8e-15）。
- 欠陥6件を発見し修正：rep.int のスカラー times の誤値、exists／get の inherits 無視、strtoi の両端 trim、psigamma の deriv 上限、重複登録の影実装3件の誤値（char.expand／validUTF8／validEnc。実働側が正しいことを差分照合し影を削除）、strtoi の重複解消。
- 名前キュレーションの独立検証：929件を R 4.3.3 の base 名前空間と機械照合し、非関数4件を除去、grepv を復帰、項目追加に伴い3件を追加。
- 到達不能ハンドラ（.colSums 系）：ハンドラを削除し項目を未対応化（パーサ理由を開示）。`.bincode` のハンドラのみ eng4 テストの直接検証用に残置（§6 参照）。

## 4. モード機構の確定契約への適合と差異

適合済み：項目の正規形（status 一本化、追加フィールド廃止、理由は description へ畳み込み）、上書きは referenceOverrides 経由のみ、name 一意性（Error／Seek の同名項目を統合）、既定ファイル構成（manifest なし）、ファイル名の precache 除外パターン、テンプレートの未対応依存禁止、ID の接頭辞（vba-adv-／r-adv-）。

差異（統合時に機構側で吸収されたい事項）：
1. **エンジン拡張の経路**：契約の `applyAdvancedEngine` フックではなく、計画書 1.3 形式の静的合成（`js/engine.js`、`js/types/r/index.js` へのコーディネーター所有フックブロック）。フックの具体仕様は契約自身が B1 初例まで未確定としており（R-3）、VBA のインタプリタは共有 engine.js 内にあって種類定義から到達できないため。拡張データ（functions-advanced／constants-advanced／names-advanced）は純粋なテーブルモジュールに分離済みで、フック確定後に移設可能。
2. **precache**：本ツリーでは自己整合のため現行スクリプトで再生成し `--check` 合格の状態にしてある（高度ファイルを含む）。契約どおりの除外は機構側 `scripts/precache.mjs` の変更で実施されたい。
3. `source`／`returns`（任意フィールド）は未収録。情報は description／caution に含めた。

## 5. 既存テストへの影響（全件裁定済み）

フルスイート 4,759件：合格4,751／失敗8。失敗8件は全て「簡易モード時代の未対応・停止を固定した期待値」と高度実装の意図した挙動変更との衝突であり、回帰ではない（各監査班が独立に裁定）。基礎テスト自体は変更していない。統合時に親工程で期待値の扱いを判断されたい。

- VBA（7件）：batch8 の StrConv／Shell／CallByName 停止（StrConv を実装）、batch8 vbasweep の参照のみ項目の停止4件（StrConv／FormatDateTime／VarType／Weekday を definitive に対応化）、batch8 の function owners 停止（同上を含む）、batch10 の CCur／CSng／CBool 停止（3件とも実装）。
- R（1件）：batch13 の `sqrt(readline())`（sqrt を実装したため未知値伝播が正しい挙動になった）。
- B4 の新規テストは 162件全緑。

## 6. 残存・申し送り

1. **R の stats／utils パッケージ**：本ブロックの制作・監査単位は棚卸し数値どおり base パッケージ（436トピック）とした。U-49（base＋stats＋utils）の stats／utils 全面分は本ブロックの件数に含まれない（既存の stats／utils 由来の基礎実装＝median、sd、rnorm、runif、read.csv 等は基礎層にそのまま残る）。head／tail 等の utils 関数も同様に対象外。親工程の判断に回す。
2. **エンジン側事項**（本ブロックでは編集禁止のため申し送り）：(a) VBA のファイル番号系文等の停止文言が「#」のみで文名が出ない（停止自体は正直。F-03 の粒度）。(b) VBA の CVErr 値の表示が `[object Object]` になる（実 VBA は "Error 2042"）。(c) R のパーサ制約（`**`、`->`、`<<-`、ドット始まり識別子、値としてのブロック、組み込み定数の裸名解決）はエンジン側が対応しない限り該当項目は未対応のまま（宣言で開示済み）。(d) `.bincode` ハンドラは eng4 テストの直接検証のためだけに残置。統合時に当該テストケースと一緒に削除可能。
3. **未確認候補**（黙って棚上げせず記録する）：(a) VBA StrConv の vbProperCase における数字境界の扱いは一次情報で確定できなかった（現行実装は維持し、監査報告書に記録）。(b) R の pretty の非正規数域の退化ケース1件（実 R が 1,112,539 点を返す入力）はベクトル長上限のため再現対象外として名指しで残置（報告書 ADV-B4-r-eng4.md）。(c) R の文字列照合はロケール依存の近似（C ロケール相当）を含む範囲があり、項目と報告書に開示済み。
4. **任意残件**：VBA TypeName の caution 文面の単純化は任意の残件として発生したが、方針により実施しない（監査報告書に記録済み）。

## 7. 参照

- ブロック仕様：`docs/audit/ADV-B4-SPEC.md`
- 各班報告書：`docs/audit/ADV-B4-vba-eng.md`、`ADV-B4-vba-data.md`、`ADV-B4-r-data1.md`、`ADV-B4-r-data2.md`、`ADV-B4-r-eng1.md`〜`ADV-B4-r-eng4.md`、`ADV-B4-r-content.md`、`ADV-B4-audit-vba.md`、`ADV-B4-audit-r.md`
- 監査要件・角度カタログ：`~/workspace/programming-practice-audit/audit-requirements-consolidated.md`、`audit-angle-catalog.md`、確定契約 `~/workspace/programming-practice-audit/work/adv-mech/docs/audit/muse/advanced-interface.md`
