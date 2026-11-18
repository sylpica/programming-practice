# 高度A8班（C++＋CloudFormation）監査・修正報告書

- 担当：全体監査・高度A8班コーディネーター。対象は統合済みビルド（repo-reffix @ 04dfe2d）の自班コピー `work/lane-a8-exec/`。repo-reffix 本体・共有記録ファイル（台帳・状態ファイル・DEVELOPMENT.md・PROGRESS.md）には触れていない。GitHub 書き込みなし。
- 計画：`lanes/lane-a8/plan.md`／`probes.md`（C++ 41件＋回帰6件、CFN 26件）。判定線は U-44：「対応と書きながら間違っている」は不合格、「実装できそうでも未対応」は（1）画面の未対応表示（2）正直な名指し停止（3）誤値を返さない、の3条件で合格。確定できない意味論は未検証への降格が処置。
- 実施体制：8ワークストリーム（DATA-CFN／CFN-HOOK／DATA-CPP／CPP-EXEC／CPP-STOP／REG／TEXT／BROWSER）が独立プローブを実施し、コーディネーターが全欠陥を裁定のうえ自ツリーで修正した。各班の詳細は `docs/audit/lane-a8-work/findings-*.md` と台帳 TSV 群。
- **本班の合格はアプリ全体の収束ではない（U-46）。** 収束判定は全班統合後の全角度ラウンドに属する。

## 1. 実施角度と結果の要約

| 角度群 | 内容 | 結果 |
|---|---|---|
| C-11／F-02（DATA-CPP） | 合成カタログの件数・名前・到達性（scan／検索述語）の全数照合 | 合格（件数は §3 の是正で 288／4,627 へ更新） |
| CPP-01〜24＋B1〜B10（CPP-EXEC） | 対応274件の意味論を g++ 13.3.0（-std=c++2b）とブラインド照合、例題274件の再実測 | 合格（欠陥0。B8 の「273件実行可能」を統合ツリーで再確認） |
| CPP-25〜31＋未対応スイープ305件（CPP-STOP） | 名指し停止の照合（層化抽出 A58／B71／C131／D45） | **欠陥群を検出**（§2-1） |
| REG-01〜06（REG） | C printf／C div 波及／C# テンプレート／統合前後 JSON 完全一致／precache 静的検査 | 回帰0件（申し送り1件＝§4） |
| CFN-01〜07（DATA-CFN） | 台帳1,798件の名前・プロパティ要約・例示を Resource Specification 272.0.0 と照合 | 軽微欠陥1件（§2-2） |
| CFN-08〜18＋B1〜B7（CFN-HOOK） | 注記フックの付け忘れ・誤注記・冪等性・基礎不変 | 欠陥2件（§2-2） |
| F-04／J-01／X-01／M-01／D-17／F-03（TEXT） | 文面53,794フィールドの機械走査、停止文言カタログ化、用語集18語 | 欠陥4群（§2-3） |
| CFN-19／CFN-B4／D-01／D-02／D-11／D-12／E-02（BROWSER） | 実ブラウザ（Playwright＋Chrome for Testing）での注記可視化・オフライン・レイアウト | §5（実ブラウザ班の結果を記入） |

## 2. 新規欠陥と修正

### 2-1. C++：未対応名が汎用構文エラー（虚偽原因）に化けていた系統（CPP-STOP 検出）

未対応 4,641 件のデータ一貫性（status 明示・矛盾0・重複0）は合格だったが、実行側で「名指しでない停止」97件／305件、「黙った成功」15件が見つかった。誤値（黙って誤った値を返す）は0件。根本原因は3系統に集約され、いずれも `js/core/c-family.js` の parse() 内 cpp 専用トークン事前検査（B8 の関数オブジェクト検査と同じ場所・同じ作法）で**受理範囲を変えずに名指し停止へ置き換えた**。

| # | 欠陥 | 修正 |
|---|---|---|
| A8-1 | `std::ranges::sort` を筆頭に ranges::／ranges::views:: 59件、`std::execution::par`、`std::filesystem::path`、`std::chrono::*`、`std::meta::*` 等の入れ子名前空間12件が全形で `SyntaxError:; が必要です`（CPP-27／30／31） | 修飾名チェーン検査を追加：`std::<...>::<...>` の連鎖を完全名で名指し停止（例：「std::ranges::sort は未対応です」）。除外：string／vector／array のイテレータ型（宣言パーサが処理）、std::numbers::*、std::string::npos、同一ソース内で宣言された利用者型（宣言自体の文言を優先） |
| A8-2 | 対応クラスの非イテレータ系メンバ型26件（std::string::size_type、std::vector::value_type、std::pair::first_type 等）が正しい宣言形でも「変数名が必要です」等の汎用文言で停止 | 同チェーン検査で型名を完全名で名指し停止 |
| A8-3 | `std::transform`（ラムダ形）・`std::find_if`／`std::count_if`（ラムダ形）が `) が必要です` の汎用エラー（CPP-25／26） | ラムダ検査を追加：呼び出しの引数内にあるラムダは呼び出し名と併せて名指す（「transform へ渡すラムダ式は未対応です」）。単独のラムダも「ラムダ式は未対応です」と名指す。対応関数のラムダ比較子（sort 等）も同形で名指される |
| A8-4 | `std::make_pair<int, int>(1, 2)` 等の明示的テンプレート引数呼び出しが `SyntaxError:; が必要です`（CPP-B7。理由が原因と無関係） | テンプレート引数呼び出し検査を追加（「明示的なテンプレート引数（make_pair<...>）は未対応です」）。比較式 `a < b > (c)` と取り違えないよう引数リストの形で判別し、推論形 make_pair(1, 2) は従来どおり実行できる |
| A8-5 | `std::optional<int> o = 5;` が「代入先が不正です」（別要因の文言）。optional／tuple 等のクラステンプレートが汎用宣言検査の対象外だった（CPP-29 注記） | cpp の汎用型リストに、カタログ収載のクラステンプレート30種（optional、variant、tuple、span、expected、function、complex、bitset、valarray、shared_ptr、unique_ptr、weak_ptr、priority_queue、multimap、multiset、unordered_multimap、unordered_multiset、forward_list、basic_string、initializer_list、atomic、lock_guard、unique_lock、scoped_lock、shared_lock、promise、future、packaged_task、barrier、counting_semaphore）を追加し、map／set と同じ「ジェネリック型 X<...> の宣言は未対応です」で名指し |
| A8-6 | std::vector／std::pair のクラス名項目が status=未対応＋caution「値モデルは未実装のため、実行できません」という**事実に反する申告**（両クラスは実装済みで正常実行される。std::array は正しく対応） | 両項目を対応へ是正し虚偽 caution を除去。あわせて std::pair の syntax が cppreference 取り込み時の別宣言（formatter 最適化の変数テンプレート）になっていた誤りを宣言形 `template< class T, class U > struct pair;` に修正 |
| A8-7 | イテレータ系メンバ型12件（string／vector／array の iterator／const_iterator／reverse_iterator／const_reverse_iterator）が未対応表示なのに正しく実行できる（status と振る舞いの不一致） | 実測（REG-04 の11パターン＋各項目の例題実行）で宣言・参照・前進・比較が実 C++ どおり動くことを確認し、12件を対応へ是正。caution は実態に合わせて「この型でイテレータ変数を宣言し、begin() などが返すイテレータを受けて使うことができます」へ書き換え |

- 裁定（欠陥としない）：CPP-26 のユーザー定義述語形は、関数定義の時点で「ユーザ定義関数 isBig の定義は未対応です」と名指し停止する。これは前提構文（ユーザー定義関数の定義）自体が未対応であり、最初に到達する未対応構文を正直に名指しているため、虚偽原因ではないと裁定する。CPP-25 の関数オブジェクト形も B8 既定の構文名指し（「比較関数や演算を指定する形式（関数オブジェクト）は未対応です」）で停止しており、同様に受理する。CPP-29 注記の optional 初期化子形は A8-5 で解消した。
- 件数への影響：C++ 高度は対応 274→**288**、未対応 4,641→**4,627**、未検証 0、総数 4,915 不変（合成総数 4,948 = 基礎33＋高度4,915）。

### 2-2. CloudFormation（DATA-CFN／CFN-HOOK 検出）

| # | 欠陥 | 修正 |
|---|---|---|
| A8-8 | 全角の Type（`ＡWS::S3::Bucket`）が注記対象から漏れる（CFN-B5 サブケース）。形状判定が ASCII の startsWith のみだった | `js/types/cloudformation/advanced-engine.js` の注記候補判定に NFKC 形状判定を追加。台帳照合・例外照合・注記文面は元の文字列のまま（正規化名で台帳に一致して注記が消えることはない）。小文字 aws:: は NFKC で大文字化しないため従来どおり対象外 |
| A8-9 | テンプレート cfn-adv-multi-resource の intro「モデルのAddMetadataは断片をそのまま返します」が実挙動（トップレベルに Metadata {Stage: dev} を追加）と矛盾（CFN-16） | intro を「モデルのAddMetadataは、断片のトップレベルにMetadata（Stage: dev）を追加します。」へ修正 |
| A8-10 | AWS::ApplicationSignals::Discovery のゼロプロパティ文だけ「設定可能なプロパティはありません。」で、他の3種別の標準文と不統一（CFN-03、軽微） | 標準文「このリソースタイプにはプロパティがありません。」へ統一 |

- 裁定（欠陥としない）：仕様 JSON 272.0.0 にあってカタログに無い 325 種別は、カタログ範囲が公式ドキュメント掲載 1,798 種別という台帳決定に基づく**範囲の裁定**であり、欠落ではない（DATA-CFN の逆差分台帳 ledger-cfn-spec-extra.tsv に全件記録）。CFN 文面の2世代書式（必須の標し方・総数の単位「件／個」）は意味が正確なため観察に留める。
- CFN-04 はコーディネーターが公式ドキュメントで直接裁定し合格（DeviceFarm::Project の4プロパティ、SageMaker::ExperimentTrialComponent の7プロパティとも公式 CFN ドキュメントの Properties と一致。Cloud Control スキーマの追加プロパティは CFN ドキュメントに無いため不採用が正しい）。

### 2-3. 文面（TEXT 検出）

| # | 欠陥 | 修正 |
|---|---|---|
| A8-11 | 定義域外を例示する数学項目の example 5件：std::acosh（対応）の example が acosh(0.5)（自らの説明文「引数は 1 以上」と矛盾）、std::acoshf(0.5)、std::acosl(2)、std::asinl(2)、std::atanhl(2)（いずれも実 C++ で NaN になる使い方を例示） | 定義域内へ差し替え（acosh／acoshf は 1.5、他は 0.5）。acosh(1.5) の実行値は g++ 実値 0.9624236… の表示丸め 0.962424 と一致を実走確認。TEXT 班の機械走査は acoshf を取りこぼしていたため、コーディネーターが全数学項目を再走査して5件を確定した |
| A8-12 | イテレータ無効化の開示が対応項目の文面に無い（B8 §6-6 の「開示済み」が項目文面で保持されていない） | エンジンの実挙動を測定（イテレータは位置ベースで無効化を追跡しない：erase でずれた先の要素を指す、clear 後は範囲外として正直に停止、等）し、変更系メンバ23項目（string 12件＋vector 11件：assign／clear／erase／insert／emplace／emplace_back／pop_back／push_back／replace／resize／swap／operator=／operator+=）の caution に「このシミュレータではイテレータの無効化を再現しません。変更前に得たイテレータは位置で要素を指し続けるため、実物（無効化されたイテレータの使用は未定義動作）とは動きが異なる場合があります」を追記。reserve／shrink_to_fit は既存 caution がモデル差を開示済みのため対象外 |
| A8-13 | 停止文言「イテレータの移動量は整数です」（c-family.js）が誤り理由の文をなしていない（M-01／T-4） | 「イテレータの移動量は整数でなければなりません」へ修正 |

## 3. 回帰確認（REG 班＋修正後の再実測）

- REG-01（C printf 19件）・REG-02（C／C++ div の混線なし）・REG-03（C# テンプレート全6本）・REG-05（CPP-01／04 の基礎／高度不変、CFN-09 相当の注記差分のみ）は統合前スナップショット（deliver-stage18）と正規化 JSON 完全一致で合格。REG-04（transformSource の型名破壊）は再発なし（イテレータ型名を含む11パターン全て実 C++ どおり）。
- REG-06（データ側到達性）は DATA-CPP が合格（自己名到達性 4,948／4,948、束ね綴り 1,845 出現・失敗0）。
- E-02 静的面：precache 86資産に高度ファイル混入0件、`scripts/precache.mjs --check` 終了コード0（REG 班実測）。
- c-family.js の変更は cpp 専用分岐内に限定し、C／C# の対照プローブと全体テストで波及なしを確認した（§6）。
- 修正した全欠陥は `tests/muse-lane-a8-regressions.test.js`（新規）に回帰テスト化した。

## 4. 申し送り・裁定事項（本班では修正しない）

1. **REG-02 の期待値側の誤り**：probes.md の「C の div(10,3) で quot=3/rem=1」は両ツリー・両モードとも未達。実測では C の div／ldiv／lldiv は高度カタログでも未対応と開示され、C++ の std::div が正値（3, 1）を返す。統合起因の回帰ではなく基礎からの仕様であり、プローブ期待値が C と std:: を取り違えた可能性が高い。C の担当班（A6）と計画側の裁定に委ねる。
2. **std::NULL の表示不一致（軽微）**：項目は未対応＋「対象外」の caution だが、基礎エンジンが NULL リテラルとして評価し `null` と表示する。実 C++ に std::NULL は存在せず項目の未対応自体は正しい。基礎側の NULL リテラル表示に根を持つため、基礎担当班の裁定事項として記録する（本班ではデータ・エンジンとも変更しない）。
3. **D-17 観察4件**（DEVELOPMENT.md 種類別表の簡易範囲記述に限定注記がない、陳腐化した数値、PROGRESS.md の 1,393／1,403 隣接不一致、高度件数の正本文書への未記載）：共有記録ファイルは本班の管轄外のため統合工程へ申し送る。現行状態に関する虚偽主張は検出されていない。
4. **M-01 の疑わしい観察5件**（「このイテレータ演算は未対応です」の演算子名欠落、vector コンストラクタ形式の不特定、swap 引数の断定形文言 等）：欠陥とまでは判定せず、統合工程の文言監査の材料として findings-text.md §3 (b) に全件記録。
5. **J-01 観察**（説明文の常体／です・ます体混在＝対応分にも37件、「シミュレータ／シミュレーション」二表記 等）：意味を誤らせないため欠陥としない。

## 5. 実ブラウザ確認（BROWSER 班）

Playwright＋Chrome for Testing で自班ツリーを実操作し、**欠陥 0 件**。

- **CFN-19（最重点）合格**：高度・CloudFormation で台帳外 Type（AWS::FakeService::Thing）を実行し、`#resultNotes` に注記全文が画面表示されることを DOM 実測で確認（hidden=false、display=block、可視矩形あり、文面はフック班の Node 実測と完全一致）。編集直後の scan 経路でも表示。対照：台帳内のみでは注記枠自体が出ない、簡易モードでは同一入力でも注記が出ない（基礎 226 件に復帰）。
- **CFN-B4 合格**：Type に `<script>` を含む入力でも注記はエスケープ表示され、script 要素の注入・ダイアログは 0 件（X-01 の静的結果と一致）。
- **D-01 合格**：4画面×状態フィルタ・検索・詳細・テンプレート読込・種類連打で異常なし（pageerror 全セッション 0 件）。件数表示は実測時点のデータと一致（C++ 高度 全4,948件＝基礎33＋高度4,915 の加算形、CFN 高度 全2,024件）。本報告書 §2 の是正後は C++ の内訳が対応 321／未対応 4,627（総数 4,948 不変）に変わる。表示機構自体は本確認で検証済み。
- **D-02 合格**：幅 320／375／768／1280px で最長名（std::string::find_first_not_of、CFN 67字名）とも `scrollWidth == clientWidth`、文字切れ・はみ出し・実質縦書き崩れなし。
- **D-11／D-12 合格**：種類切替往復・モード切替跨ぎで下書き保持、リロード後もモード（専用キー）・種類・下書きが復元。簡易モードで高度専用名は「該当する項目はありません。」のみで漏洩なし。
- **E-02 部分合格（残件あり）**：precache（85資産）に高度ファイル 0 件、ランタイムキャッシュに cpp／cfn 高度一式が入り、オフライン再訪で CFN 高度（全2,024件）が機能することを確認。一方、(a) cpp のオフライン DOM 確定測定、(b) 高度ファイルブロック時の開示文の画面実測、(c) CFN-19 の解析 Worker 完走経路での再確認、(d) D-01 検索ヒット同定1件、の4点は**未完了の残件**とする。理由は環境要因：本 VM の強い CPU 競合で解析 Worker が全種類・全モード一様にアプリ内上限で正直に停止表示した（対照でも再現）うえ、00:49 以降 Chromium 自体が起動直後 SIGTRAP で起動不能となった（アプリ起因ではない）。静かな環境での再測を統合工程へ引き継ぐ。注記表示そのものは scan 経路＋同一描画関数で確認済みであり、(c) は経路違いの再確認に留まる。

## 6. テスト結果

- **全体スイート（修正後・最終）**：TZ=UTC で **7,179件全通過（失敗0）**。TZ=Asia/Tokyo で 7,179件中 **失敗1件のみ＝既知の RG-630**（B2-WDL F-01、日時系のタイムゾーン依存）であり、基準線どおり。本班の変更に起因する新規失敗は無い。
- 修正前スナップショットの基準線実測は UTC 7,164件中6件失敗（全て既知のタイミングフレーク群：パス上限・準備コスト系）。修正後は件数が +15（本班の回帰テスト新規分）となり、UTC ではフレーク群も含め全通過した。
- **回帰テスト** `tests/muse-lane-a8-regressions.test.js`：**15件全通過**（チェーン名指し／テンプレート引数／ラムダ／汎用型宣言／vector・pair 是正／イテレータ型12件の対応化／数学 example 5件と acosh 実値／無効化 caution 23件と位置ベース挙動の固定／advance 文言）。
- **件数再測**：C++ 高度 4,915件 ＝ 対応 288／未対応 4,627／未検証 0（是正前 274／4,641 から、vector・pair の2件＋イテレータ型12件が対応へ）。統合カタログ総数 4,948（基礎33＋高度4,915）は不変、統合の対応は 321。mergeCatalog の problems は 0。
- **ドメインスキャン**（数学関数の example 引数が定義域外でないか）：是正前5件（acosh／acoshf／acosl／asinl／atanhl）→ **是正後0件**。
- **precache**：再生成済み、`scripts/precache.mjs --check` 合格。
- 作業中の事故と復旧：無効化 caution の一括適用スクリプトが VM の書き込み障害（EPERM）の最中に失敗し、`reference-advanced-part6.js` が一時 0 バイト化した。同ファイルは統合ツリー側の同一ファイル（git HEAD とバイト一致を SHA-256 で確認）から、250行ごとの境界ハッシュ照合つき転写で復元し、最終的に SHA-256 完全一致・diff クリーンを確認したうえで、イテレータ是正12件と無効化 caution 23件を再適用した（diff は想定どおり47行）。

## 7. 触ったファイル

- `js/core/c-family.js`：cpp 専用の事前検査3系統（修飾名チェーン／明示テンプレート引数／ラムダ）追加、cpp 汎用型リスト拡張、停止文言1件修正（A8-13）
- `js/types/cloudformation/advanced-engine.js`：NFKC 形状判定（A8-8）
- `js/types/cloudformation/templates-advanced.js`：intro 修正（A8-9）
- `js/types/cloudformation/reference-advanced-part2.js`：Discovery 文面統一（A8-10）
- `js/types/cpp/reference-advanced-part1.js`：std::vector 是正、数学 example 5件中4件（A8-6／A8-11）
- `js/types/cpp/reference-advanced-part3.js`：std::pair 是正＋syntax 修正（A8-6）
- `js/types/cpp/reference-advanced-part6.js`：イテレータ型12件の是正（A8-7）、変更系メンバ23件への無効化 caution 追記（A8-12）
- `tests/muse-lane-a8-regressions.test.js`：新規（本班の全修正の回帰テスト）
- 報告書・班内成果物：`docs/audit/LANE-A8-EXEC.md`（本書）、`docs/audit/lane-a8-work/`（findings 8件・台帳 TSV・検証スクリプト）

## 8. 残存・未確認

- ラムダ／修飾名の名指しは「受理範囲を変えない文言の是正」であり、機能実装ではない。std::ranges 等は引き続き未対応（画面表示と一致）。
- 汎用ラムダ（`<typename T>` 付き）や捕捉リストの初期化捕捉など、検査の対象形に合わないラムダ表面形は従来の汎用エラーに落ちる場合がある（誤値・黙った成功にはならない）。
- CFN 台帳は 2026-11-16 時点のスナップショット（272.0.0）のまま。仕様の版上げは本班の範囲外。
- 実ブラウザの残件4点（§5 の E-02 (a)〜(d)）：VM の CPU 競合と Chromium 起動障害という環境要因で未測定。合格とは判定せず、静かな環境での再測を統合工程へ引き継ぐ。
- 本班の合格はアプリ全体の収束判定（U-46）ではない。
