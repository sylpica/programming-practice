# Codex 第2ラウンド・統合裁定後の修正

基点は`6b85ac47953d18995f1ecc303be6cb6bb16310fb`。2026-11-14のMuse統合・裁定と、同日書き直し版の要件正本に従う。第1ラウンドの独立監査は履歴として保持し、今回は提示された統合指摘を参照して修正した。修正SHAは本報告を追加したコミット自身（`git log --diff-filter=A --format=%H -- docs/audit/CODEX-R2.md`）。

**二重監査は未収束。** Codexの修正・ローカル再検証の節目であり、Museによる公開サイト再監査と他主体の収束判定を代行しない。新アイコンは再取得不能で未反映。公開サイト直接操作は今回の裁定によりMuse担当で、Codexの配信をその確認待ちで止めない。

## A〜Fの範囲

| 角度 | 全13種類で実施した範囲 | 限界・未実施 |
| --- | --- | --- |
| A 一次資料 | 全441リファレンスの掲載説明・戻り値・注意点を照合し、個票・文面ハッシュを固定。公式Web、公式原本リポジトリ、実装、規格を併用。13種類の件数は新正本対応表に記載。 | 掲載文面の照合であり、任意コード・全引数の完全互換性の立証ではない。Rの取得元の一部は公式ソースのミラー。 |
| B 固定した独立期待値 | 第1ラウンドで出力を見る前に固定した13×5＝65代表例と全88教材の期待値を再実行。今回の修正用34回帰試験は、Muse指摘を見た後の試験なので新たな「ブラインド」件数に加えない。 | 独立性が同じ前提の試験を二重監査の代用にしない。 |
| C ローカル実操作 | Chromiumの13種類×4画面×7状態×2幅＝728。初期／入力／実行／エラー／パス／ファイル／オフライン。375/1440px。追加の正本操作26、全教材カード176、下書き保全26、修正表示回帰24。 | 公開サイトはMuse担当。iOS実機・全OS・全ブラウザは未実施。テーマ切替機能はない。 |
| D 敵対入力 | 13×41＝533。空、不正構文、深い入れ子、10万文字超、日本語・絵文字、無限ループ相当、期限。既存のVBA/CloudFormationの2,000超過試験も継続。 | 固定シードの有限コーパス。全入力の証明ではない。 |
| E オフライン/PWA | 全13種類のオフライン冷再読込・実行・画面切替、SW、precache整合。既存apple-touch-iconはPNG・180×180。 | 新デザイン5ファイルは未取得。旧アイコンを新デザインの反映済みとは報告しない。iOSホーム画面の実機操作は未実施。 |
| F 保存 | 破損/旧キー/移行/容量失敗/実SW更新の9ケース、更新後13下書きとオフライン復元。追加26ケースでfreeDraftの保全・再読込・種類別復元。 | 全破損形状・全ストレージ障害の網羅ではない。 |

新正本37項目の判定は[REQUIREMENTS.md](REQUIREMENTS.md)。適合32／未確認5（2-4、4-1、10-1〜3）。アイコン未反映を37項目の集計の外に明記する。441件の個票は[REFERENCE-R2.md](REFERENCE-R2.md)、機械可読なレビュー対象文面は[reference-r2.json](reference-r2.json)。

## 裁定された指摘への対応

全行の再現コード・操作は`tests/round2.test.js`、`tests/round2-browser.py`、`tests/template-drafts.py`、`tests/native-audit.py`と既存回帰に保存した。「修正済」は本節目の対応部分集合で再検証した意味で、Museの再監査済みではない。

| ID / 重大度 | 対象・再現 | 根拠 | 修正・再検証 |
| --- | --- | --- | --- |
| テンプレート切替 P1 | 未編集のテンプレート間でもconfirm。ダイアログ禁止環境で選択不能。 | ユーザー裁定1。中核の入口操作と下書き保全。 | dropdown/cardともconfirm撤去。編集時は自由練習に移しfreeDraftへ保存。「なし」でコードとモデルを復元。全13×2幅の26ケースでダイアログ禁止、未編集/保存済み/編集中、再読込/種類切替を確認。 |
| INT-02 P1 | RのNA、C/C++ポインタ、C#の__class等が生JSONで露出。 | 内部表現を実ランタイム値に見せない共通要件。 | NA、未初期化、参照、data.frame、クラス、Defaults等を整形。メモリのname/type/aliveも人間向け表示。循環参照でも停止しない。ブラウザの説明・最終状態を確認。 |
| INT-03 P2 | JS console.log等が「式を評価します：未設定」、AHK/Fxがnull。 | 戻り値なしの文・処理の仕様。 | 呼出しで既に説明した場合は重ねない。説明がない戻り値なしの式は自然文。表示回帰でプレースホルダ不在。 |
| INT-04 P2 | c-pointerをそのままgccへ渡すとstdio.h不足。 | [printf](https://en.cppreference.com/w/c/io/fprintf)。 | ヘッダーを追加。全C教材・例をGCCでコンパイル。 |
| INT-05 P2 | cpp-pointerをg++へ渡すとiostream/std::不足。 | [std::cout](https://en.cppreference.com/w/cpp/io/cout)。 | ヘッダー・std::を追加。全C++教材・例をG++でコンパイル。 |
| INT-06 P2 | typeof 5が解析失敗。 | [MDN typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)。 | 基本型、モデル組込み、未宣言名、TDZを区別。TDZはReferenceError。回帰・実画面で確認。 |
| INT-07 P2 | char配列の文字列初期化・単一文字・文字列出力が不可。 | N1570 6.4.4.4 / 6.7.9 / 7.21.6.1。 | ASCII char初期化と書換え、ヌル終端を伴う%s、%cを追加。終端なしの%sは未定義動作で停止。非ASCII char配列初期化・文字列ポインタ初期化は未対応。 |
| INT-08 P2 | int&を宣言できない。 | [C++参照初期化](https://en.cppreference.com/w/cpp/language/reference_initialization)。 | 同型の宣言済み変数への参照と双方向読書きを追加。別名のスコープ終了が参照先の寿命を終えないことも回帰。配列要素・const・一時値への参照は未対応と明示。 |
| INT-09 P3 | Transformの単体/list内Name/Parametersオブジェクトを拒否。 | [AWS::Includeの構文](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-include.html)、[custom event](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html)。 | 構文を受理。custom Lambdaのトップレベルparamsは公式どおり空で、その旨を表示。Fn::Transformのparamsは保持。組込みInclude等の処理本体は範囲外で明示停止。 |
| INT-10 P3 | mean(c("a","b"))で停止。 | [R mean](https://stat.ethz.ch/R-manual/R-devel/library/base/html/mean.html)。 | NAと警告を返して次の文へ進む。空・na.rm・trimも確認。 |
| INT-11 P3 | for(;;)を拒否。 | C/C++ forの省略条件。 | 初期化/条件/更新の省略を解析。有限breakと無限ループの可視的打ち切りを確認。 |
| INT-12 P3 | sizeofを関数扱いで拒否。 | N1570 6.5.3.4。 | 基本型・宣言済み変数/配列・文字列・単純式のsizeofを非評価で計算。Cの'a'はint、C++はcharと区別。ポインタABI、VLA、配列型直接指定、未対応の型推定は未対応で止める。 |
| INT-13 P3 | std::stringの+/+=を拒否。 | [basic_string operator+](https://en.cppreference.com/w/cpp/string/basic_string/operator%2B)。 | std::stringと文字列リテラルの基本連結。生の文字列リテラル同士をstd::stringとして連結しない。 |
| INT-14 P3 | Filterの委任注意が空。 | [Microsoft委任](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview)。 | 委任条件、非委任の既定500/最大2,000、ローカルモデルとの差を明記。 |
| INT-15 P3 | cout例がそのままコンパイル不能。 | std::coutの名前空間とiostream。 | 全C/C++例を完全なmainへ統一し実コンパイラ確認。 |
| INT-16 P3 | 契約/ブラウザ試験が種類数13固定。 | 拡張契約。 | 指定2ファイルの固定件数を撤去。ダミー14番目を再追加し、コアUI変更0で実行・オフライン確認。 |
| INT-17 P3 | 未定義名の分類がNameError。 | ECMAScript ReferenceError。 | JSの分類をReferenceErrorへ変更。トレースと下側終了状態にも分類を表示し、ブラウザで露出経路を確認。 |
| INT-18 P3 | EXTENDINGに試験の最低件数が未記載。 | 契約試験の実際の基準。 | テンプレート6・リファレンス7・一次資料1以上と段階条件を明記。 |
| INT-19 P3 | 編集しても古いテンプレート解説が残る。 | 新正本6-3/7-4。 | コードが一致しなくなれば自由練習へ変更し解説を消去。旧保存の不一致も復元時に整合。 |
| INT-20 P3 | JS/Pythonの同一文の重複、VBA括弧、Pythonの不自然な真偽表現、Date/Now同文。 | 出力・代入の作用とDate/Nowの仕様。 | JSの二重説明を除去。Pythonの同じ代入文内の出力/代入を一説明へまとめ、反復や別処理は消さない。VBAの条件ラベルをコロン表記、Pythonを成立/不成立表現、日付/日時を区別。 |

INT-09/12の上記限定範囲は[DEVELOPMENT.md](../DEVELOPMENT.md)にも記録した。未対応を成功として通さない。P3は今回ユーザーが明示した対象を実施した。指定外の任意P3を実施するための変更はしない。

## 一次資料・実コンパイラ照合から追加で修正した実質欠陥

| ID / 重大度 | 再現・根拠 | 修正と確認 |
| --- | --- | --- |
| R2-A1 P2 | 追加済みC/C++教材6件もmain/ヘッダー不足。GCC/G++で失敗。 | 6件を完全なプログラムへ変更。C/C++全29例をコンパイルし、UB教材2件以外の27件は標準出力もモデルと一致。 |
| R2-A2 P2 | C#のCounter宣言後のトップレベル文は、実物の配置規則に反する。 | using SystemとProgram.Mainを持つ教材・使用例へ統一。ローカルSDKなしのためネイティブ確認はCI結果で確定し、ローカル成功と偽らない。 |
| R2-A3 P2 | Python/CFNリファレンスに存在しない標準入力欄・Pyodide同梱の記載。 | 実物CPythonの仕様と、このアプリの未知入力・未対応外部ライブラリを区別。441件の文面個票へ固定。 |
| R2-A4 P2 | UI.VisionのstoreText/storeValueのロケーター不一致で誤停止。 | 公式の#LNF継続を実装し回帰。入力要素のstoreTextも空文字列へ。 |
| R2-A5 P2 | AutoHotkey SetTitleMatchModeの戻り値がnull。 | 公式の変更前設定を返す。old := SetTitleMatchMode(3)が既定2を返すことを確認。 |
| R2-A6 P2 | R as.numericの変換警告が欠落、meanのtrimを無視。 | NA生成の警告、trim付き平均を実装し回帰。 |
| R2-A7 P2 | printf("100%%")を誤停止。%cへdoubleを渡しても値を断定。 | 書式検査を変換前に行い、%cも昇格後の型を検査。不一致は未定義動作。 |
| R2-A8 P2 | ImageJ setColorとシステム全体の前景色、changeValuesのROI、replaceの条件の説明が不正確。 | 公式Functions.java・マニュアルで訂正。新旧の資料差分は公式実装を併用して裁定。 |

Cの組込み型としてstring宣言を受理していた経路も未対応停止へ変更し、char配列と区別した。

修正中の総合試験では、Fn::Transformのparamsを誤って空にした回帰2件を検出した。トップレベルだけに限定し直し、既存の期待値を変えずに再合格した。失敗を成功件数へ加算していない。参照別名の寿命・sizeofの型差・C++文字列終端・未対応sizeofの推測禁止も追加回帰で確認した。

## ブラインド期待値の再実行

| 種類 | 独立代表例 | 不一致 | 全教材 | 不一致 |
| --- | ---: | ---: | ---: | ---: |
| Excel VBA | 5 | 0 | 8 | 0 |
| ImageJ | 5 | 0 | 10 | 0 |
| CloudFormation | 5 | 0 | 6 | 0 |
| Power Automate | 5 | 0 | 6 | 0 |
| AutoHotkey | 5 | 0 | 6 | 0 |
| UI.Vision | 5 | 0 | 6 | 0 |
| Power Apps | 5 | 0 | 6 | 0 |
| Python | 5 | 0 | 10 | 0 |
| R | 5 | 0 | 6 | 0 |
| C | 5 | 0 | 6 | 0 |
| C++ | 5 | 0 | 6 | 0 |
| C# | 5 | 0 | 6 | 0 |
| JavaScript | 5 | 0 | 6 | 0 |
| 合計 | 65 | 0 | 88 | 0 |

元の期待値の作成時点・初回不一致はCODEX-R1に記録した。今回の再実行を、新規の完全独立なブラインド導出と呼ばない。

## 最終ローカル実測

- Node：681件合格、失敗0。新規34回帰、既存65代表例・88教材・380対応例を含む。
- precache整合・git diff --check：合格。静的サイトのためビルド不要。
- ブラウザ：728画面×状態ケース、正本操作26、全教材カード176、下書き復元26、第2ラウンド表示24を合格。pageerrorなし。375pxと1440px。
- 既存browser.py：16表示チェック・200%・関数連動・取込/取消・オフライン合格。browser-types.py：13種類・88教材・104表示・保存・編集器・全種類オフライン合格。
- 保存9ケース、実SW更新後13下書き、オフライン復元：合格。
- ダミー14種類目：追加3箇所（モジュール、registry、生成precache）、コア変更0、オフライン合格。
- ファズ533件：期限超過/例外漏れ0。
- ネイティブ81例：C/C++29件コンパイル、うち27件の出力一致（UB教材2件は実行しない）。Python52件構文検査、うち43件実行。外部依存/実ファイル前提の9例は未実行。ローカルC# SDKはなくネイティブ実行0。
- GitHub Actionsにもネイティブ教材試験を追加。CI環境でdotnetが利用できればC#の全16教材・例をビルドし、意図的な例外教材も検査する。配信前の本文でCI実行成功を先取りしない。

ブラウザ・ファズは有限の状態表であり、全入力や全実環境を網羅したという意味ではない。実AWS・Windows・実メール・外部DOMには接続しない。実施ログ・画面画像はwork/audit（Git管理外）。永続的な再現手順はtests、対象文面はdocs/auditへ同梱した。

## アイコン・配信・残件

指定5ファイルはmuse.ai許可先追加の連絡後、新規接続でそれぞれ再取得したが、全件`Tunnel connection failed: 403 Forbidden`。取得成功0、差し替え0。既存アイコンを保持し、新デザインやmaskableファイルを架空に生成していない。Muse側の別経路での反映待ち。取得試行結果はwork/audit/icons-r2.json。既存apple-touch-iconは実PNG180×180のまま。

全修正・試験・対応表・本報告・PROGRESSを同じ節目コミットへまとめる。push-filesツールが提供されていないため、Gitの1回のpushを用いる。PR/マージは不要。**使った書き込みコール数：配信後の会話で実績を確定する（予定1件、配信前は0件）。**

残件は、新アイコンの別経路反映、Museの公開サイト再監査（375px・ファイル・オフライン・ReferenceError表示を含む）、両者の新規P0〜P2ゼロの収束確認。任意の未指定P3は実施しない。モデル切替・子エージェント利用なし。期限2026-11-20。
