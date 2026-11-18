# 高度モード B4S・R utils その他全般班（umisc）報告書

## 1. 担当範囲と内訳

- 担当：utils パッケージその他全般 **132 トピック／284 名**（スライス `slice-umisc.json` の全件）。
- 成果物（新規作成のみ。既存ファイルは編集していない。集約への配線はコーディネーター担当）：
  - `js/types/r/reference-advanced-part10.js`（項目 284 件）
  - `js/types/r/names-advanced-part10.js`（名前 247 件）
  - `js/types/r/functions-advanced-utilsmisc.js`（ハンドラ 2 件）
  - `tests/adv-b4s-umisc.test.js`（14 テスト、全合格）
- ステータス内訳（名前単位）：**対応 2／未対応 282／未検証 0**。
  - 対応は `formatUL`／`formatOL` のみ（純粋な文字列整形で、値モデルで忠実に表せることを差分バッテリで確認した）。
  - 未検証は 0 件：全件、一次情報（公式ヘルプ＋実 R 実走）で裁定を確定できた。

## 2. 実装した関数の照合根拠（実 R 実測）

### formatUL／formatOL（トピック format）
- 意味論の正本：公式ヘルプ（R-devel、utils 4.6.0）の Usage／Description と、実 R 4.3.3 の実装ソース（`formatUL`／`formatOL`／内部 `.format_rl_table` を `getFromNamespace` で取得して読解）。
- 実装は `.format_rl_table` の再現：ラベルを `format(justify="right")` 相当に右寄せし、各項目を strwrap 相当の折り返し（幅＝width－ラベル幅－1、核アルゴリズムは eng2 の strwrapHandler から転用）にかけ、継続行をラベル幅だけ字下げする。`formatOL` のラベル生成（arabic／Alph／alph／Roman／roman、`seq.int(start, length.out)`、`LETTERS[labels]` の添字規則、`as.roman` の範囲 1..3899、上限エラー）も実 R のソースどおり再現した。
- 照合：固定 65 ケース（典型／境界／異常／組み合わせ、警告の有無を含む）＋ランダム 300 ケースの差分バッテリで、JS 実装と実 R 4.3.3 の出力（バイト長前置形式で厳密比較）が**全件一致**。実 R 側は `LC_ALL=C.UTF-8` で実行（本シミュレータのロケールモデルは eng2 の strwrap と同じ UTF-8 前提。C ロケールでは実 R の文字幅がバイト基準になり折り返し位置が変わることを実測で確認した上で、モデル側の前提に合わせた）。
- width の既定値 72 は `0.9 * getOption("width")`（オプション width の既定 80）で、eng2 strwrap の確定前例に従った。
- 名指し停止にした経路：`label` が長さ 0 の場合（実 R は内部表現依存の結果を返すため再現せず、専用メッセージで停止。テストで固定）。

## 3. 未対応の理由類型の内訳（名前単位、計 282）

| 類型 | 件数 | 代表例 |
|---|---|---|
| 構造化（クラス付き）オブジェクト | 49 | person／bibentry／citation／hashtab／object.size／packageStatus／toLatex 系 |
| 対話操作・GUI・ウィンドウ | 35 | menu／select.list／askYesNo／View／winMenu*／choose.files |
| パッケージ管理・リポジトリ・ミラー | 26 | install.packages／update.packages／available.packages／setRepositories |
| 環境・名前空間・S3 内省 | 23 | getFromNamespace／getAnywhere／getS3method／methods／isS3method |
| 文書生成・Sweave・雛形作成 | 22 | Sweave／Rtangle／prompt／package.skeleton／rtags |
| ファイル・ネットワーク・OS 連携 | 20 | download.file／tar／zip／make.socket／readRegistry／clipboard 系 |
| ヘルプ・文書表示／検索 | 19 | help／help.search／help.start／RSiteSearch／vignette |
| 内部・管理用・実験的ユーティリティ | 18 | rcompgen／hsearch_db／aspell-utils 系／warnErrList／charClass |
| 文書見出し・コマンドライン・非関数名 | 15 | BATCH／INSTALL／Rscript／utils-package／Question |
| 編集・履歴（対話的編集） | 13 | edit／fix／file.edit／savehistory／history |
| セッション・システム情報（値を捏造しない） | 11 | sessionInfo／localeToCharset／packageDescription／win.version |
| デバッグ・プロファイル | 11 | Rprof／Rprofmem／debugger／recover／findLineNum |
| 外部プログラム・デモ実行 | 7 | aspell／demo／example／browseURL／bug.report |
| 言語オブジェクト・ソース参照 | 7 | removeSource／getParseData／getSrc* 系 |
| 副作用のみ（不可視 NULL・可変ハンドル等） | 6 | alarm／flush.console／txtProgressBar 系 |

各項目の description には、類型名ではなく「その関数の具体的事情」を名指しで記載した（例：object.size は「サイズ値自体が R の内部表現に依存する見積もりである」点、localeToCharset は「既定引数が現在のセッションロケールに依存する」点を明記）。

## 4. 慎重裁定した候補の結論

- **alarm／flush.console**：実 R 4.3.3 実測で戻り値はいずれも不可視 NULL（`withVisible()` で確認）。不可視性は値モデルに無く、B4 で `invisible` 自体を未対応とした前例と整合させ未対応。alarm はプラットフォームで鳴らし方が異なる点も caution に明記。
- **globalVariables／suppressForeignCheck**：パッケージ名前空間への登録という副作用＋不可視の戻り値で、モデルに名前空間が無いため未対応。
- **object.size**：クラス `"object_size"` 付き数値で、サイズ値自体が実装依存の見積もり。誤ったサイズを返すくらいなら未対応（課題指示どおり）。
- **getFromNamespace／getAnywhere／getS3method／methods／isS3method／isS3stdGeneric**：いずれも環境・名前空間の実登録状態や関数オブジェクトそのものに依存。isS3method は名前文字列への述語に見えるが、判定は探索環境に実在するメソッド登録に依存し文字列だけでは確定できないため未対応とした。
- **removeSource／getParseData／sourceutils**：言語オブジェクト・srcref 属性の操作のため未対応。
- **hashtab 系（14 名）**：**前提の訂正**―課題指示では「実 R 4.3.3 に存在しない」とあったが、本環境の実 R 4.3.3 の utils 名前空間に 14 名全てが関数として存在することを機械確認した（`hashtab` 本体も実走可能）。裁定は未対応のまま：参照意味論を持つ可変オブジェクトを値モデルで表せないため（実験的機能である点も理由に含む）。版差については「4.3.3 に存在した」ことが実測事実であり、報告書にこの通り記録する。
- **charClass**：**前提の訂正**―正規表現の文字クラス文書ではなく、C99 ワイド文字分類（wctype）へのインタフェースである実在関数（4.3.3 で実走確認）。分類結果が C ライブラリのロケール（wctype テーブル）に依存し環境で値が変わるため未対応。
- **warnErrList／process.events／hsearch-utils／sourceutils／aspell-utils**：内部ユーティリティとして裁定（条件オブジェクト／イベントループ／ヘルプ DB／srcref／外部プログラム依存をそれぞれ名指し）。
- **clipboard 系（3 名）**：Windows のクリップボード操作のため未対応（基礎層の "clipboard" とは別名で重複なし）。

## 5. 名前キュレーション（names から除外した 37 名）

実在確認は実 R 4.3.3 の utils 名前空間に対する機械確認（exists／is.function、全 284 名）。除外は次の 37 名で、項目（reference）は全件に作った。

- R CMD コマンド／文書見出し（関数ではない）：BATCH、COMPILE、REMOVE、INSTALL、LINK、SHLIB、RHOME、Rscript、build、check、Question、utils-package、utils、rcompgen、completion、mirrorAdmin、aspell-utils、utils-deprecated
- 環境変数・設定名：R_INSTALL_STAGED、R_INSTALL_TAR、R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE、R_BIOC_VERSION、R_REPOSITORIES、Rconsole、Rdevga
- データオブジェクト：SweaveSyntaxLatex、SweaveSyntaxNoweb、Filters、CITATION、osVersion
- 実在関数として確認できない旧名・記法：vignettes、getBioCmirrors（いずれも 4.3.3 名前空間に無く、現行ヘルプ Usage にも無い）、??（独立した関数オブジェクトは存在しない）
- S3 ブラケットメソッド（BRIEF §7）：[.getAnywhere、[.person、$.person、[[.hashtab

収録側の特記：
- Windows 専用関数 29 名（getClipboardFormats、readClipboard、writeClipboard、DLL.version、loadRconsole、arrangeWindows、choose.dir、choose.files、getWindowsHandle、getWindowsHandles、readRegistry、getIdentification、getWindowTitle、setStatusBar、setWindowTitle、shortPathName、winDialog、winDialogString、winMenuAdd、winMenuAddItem、winMenuDel、winMenuDelItem、winMenuItems、winMenuNames、winProgressBar、getWinProgressBar、setWinProgressBar、close.winProgressBar、win.version）は Linux 版 4.3.3 の名前空間に無いが、公式ヘルプに実在関数として載るため収録し、syntax はヘルプ Usage から取った。
- `?` は utils 名前空間に実在する関数（`function(e1, e2)`）として収録。hashtab 系 14 名も 4.3.3 実在を確認して収録。
- 基礎層 44 項目・B4 part1／part2 項目と名前・B4S part5（stest）との重複は機械照合で 0 件。

## 6. テスト結果

- 担当テスト `tests/adv-b4s-umisc.test.js`：**14 件全合格**。内容：分母・内訳・正規形の機械検証、names の除外・重複検証、formatUL／formatOL の F-01 ケース（典型／境界／異常／組み合わせ、実 R 実測値）、未対応 282 件全件の simulate 停止確認（うち 271 件は名前を含むエラー、残り 11 件はドット始まり・ブラケット・ハイフン見出しでパーサ段階の停止＝値を返さないことを固定）、類型代表 34 件の名指し停止確認。
- 関連既存テスト（adv-b4-r-eng1〜4、data1／2、content、audit-r、stest、muse-fix-batch12／13-r）：153 件中 151 合格。失敗 2 件はいずれも本班の変更に起因しない：
  - `muse-fix-batch13-r` の B13-R 1 件は、土台ツリー（adv-b4）でも同一に失敗する既知事項（対照実行で確認）。
  - `adv-b4-audit-r` の 1 件は「項目の無いハンドラ: diffinv」で、他班（sts）の配線が集約ファイルに入ったことによるもの。本班のファイルは集約に未配線で無関係（コーディネーターの統合時に他班側で解消されるべき事項として申し送る）。

## 7. 残存・未確認事項

- 集約ファイル（reference-advanced.js／names-advanced.js／functions-advanced.js）への part10／utilsmisc の配線はコーディネーター担当で未実施。配線後に simulate 経由で formatUL／formatOL が到達可能になることの確認は統合時の課題。
- formatUL の `label` 長さ 0 の経路は名指し停止（§2）。実 R は内部表現依存の結果を返すため、モデル側で再現しない判断を維持する。
- formatOL／formatUL の数値ラベルの整形は `format()` の完全な再現ではなく H.formatRNum（as.character 相当）で近似した。差分バッテリの範囲（通常のラベル・数値）では一致を確認済みだが、極端な桁数の数値ラベルでは実 R の `format()` と差が出うる。
- 文字幅は eng2 の displayWidth モデル（UTF-8 ロケール前提）に従う。C ロケール実 R とは多バイト文字列の折り返し位置が異なる（§2 に実測根拠を記録）。
- 上記以外に未確認・未裁定の項目は無い（未検証 0 件）。
