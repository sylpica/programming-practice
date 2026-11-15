# Codex R6：cmd／PowerShell追加（2026-11-15）

## 対象と前提

ユーザー指定の `docs/audit/muse/add-types-cmd-powershell.md` に基づく新種類2件の実装節目。既存アプリ全体の新しい独立監査ラウンドではない。配信後はMuseの監査を待機し、その後の依頼でCodexが一周監査（報告のみ）を行う。

- 土台は最新main `576b534`。Muse修正 `7992597`（1,125テスト）、CI修正 `d4179c9`（1,127テスト）を取り込んだ。既存テストを全実行し1,127件合格を確認して着手した。
- 仕様書がcmdのpause途中で実際に欠落していたため報告。補完版 `576b534` を全文読み直した。共通契約との矛盾は見つからなかった。先行cmd試作のpauseを、補完版指定の案内表示・無分岐継続へ合わせた。
- PROGRESS本文はR3時点、末尾はMuse第21ラウンド修正までの追記だった。記録を保持したうえで現在の15種類と次工程を更新した。
- モデル設定は変更なし。Reset usageは使用していない。サブエージェント不使用。

## 変更構造と教材

`js/types/cmd/` と `powershell/` にそれぞれ定義・独立パーサ・意味論を追加し、registryへ登録。`js/types/shell/` はモデルFSと予算アダプターを共有する。既存のexecuteProgramの予算・制約・trace契約を再利用し、既存エンジンやコアUI、CSS、保存キーは変更していない。画面側の種類別分岐は追加していない。

| 種類 | id | 拡張子 | 教材 | 基礎／実践／応用 | リファレンス | 用語 |
| --- | --- | --- | ---: | --- | ---: | ---: |
| コマンドプロンプト | cmd | .bat / .cmd | 8 | 2／3／3 | 26 | 5 |
| PowerShell | powershell | .ps1 | 8 | 2／3／3 | 37 | 5 |

全体は15種類・104教材・511リファレンス（対応450、参照専用61）。追加前の現在コードは448リファレンスであり、R2時点の441件と混同しない。既存レビュー記録448件の文面照合試験・旧88教材の導入リンク試験は元の対象集合のまま維持し、新しい教材・参照は契約試験と新規試験に含めた。保存試験の種類数を15へ更新した。

## 仕様別の実装範囲

詳細な対応・未対応は [DEVELOPMENT.md](../DEVELOPMENT.md) の「新種類追加・Codex R6」に一致させる。対応は部分集合であり、全cmd／全PowerShell互換とは扱わない。

| 指定範囲 | 実装した基本形・線引き |
| --- | --- |
| cmd出力・変数 | echo / echo. / @echo off、set、set /p、set /aの符号付き32ビット整数演算。%展開と遅延!展開の時点を区別。裸setは下側の最終状態で代替。 |
| cmd条件・反復 | if文字列==、整数比較、exist / errorlevel / defined、else・ブロック・not、既知文字列/I。forリスト・ワイルドカード・/L。非数値のEQU等は未対応として明示停止。 |
| cmd制御・入力 | goto / ラベル、call :label、%1〜%9／%~1、exit /b、rem、setlocal/endlocal。pauseは指定日本語案内を表示して続行、パス分岐なし。 |
| cmd FS | cd/chdir、dir /b、type、md/mkdir、rd/rmdir、del/erase、ren/rename、copy、move。モデル内のみ。日時・空き容量を捏造する裸dirは未対応として停止。 |
| cmd標準入出力 | >／>>は仮想ファイルへ、パイプは文字列を次段へ。findの単一ファイル／パイプ基本形。番号つき・入力・複合リダイレクト、&&／||は未対応停止。 |
| cmd状態 | ERRORLEVELを一律0に戻さない。setlocal、exit、find等の規則を追跡。モデル実行エラーは停止し、失敗コードを未確認表示。clsはモデル出力をクリア。コマンド表示設定はtrace／最終状態に示し、端末の入力行再描画は行わない。 |
| PS出力・値 | 成功ストリームのWrite-Output／暗黙出力と、画面のみのWrite-Hostを分離。数値・真偽・文字列・$null・配列・ハッシュテーブル、キー／基本プロパティ、配列参照。JSONモデルのオブジェクトはハッシュテーブルへ変換。 |
| PS文字列 | 二重引用符の変数と$(...)、単一引用符、基本バッククォート。-fやhere-string、複雑な型変換は未対応。非整数からintへの変換は誤って切り捨てず停止。 |
| PSパイプライン | オブジェクト・$_／$PSItem、Get-ChildItem、Where-Object、ForEach-Object、Select-Object、Sort-Object、Measure-Objectの掲載基本形。表示はプロパティと値、内部JSONを出さない。 |
| PS制御・関数 | if/elseif/else、foreach/for/while/do-while、基本switch/default、break/continue、function/param/return。return以前の成功出力も関数の出力。基本paramの明示nullと未指定を区別。 |
| PS FS・入力 | Set/Get-Location、Get/Set/Add-Content、New/Remove/Rename/Copy/Move-Item、Test-Path、Read-Hostモデル入力。単一パス中心、ディレクトリコピーは未対応。ファイル不在は元行と原因を示して停止。 |
| PS自動変数 | $?は最後のパイプラインの成否。$LASTEXITCODEは明示モデルの初期値のみ、外部プロセスを起動しない。自動変数や出力設定の変更は未対応停止。 |

共通の仮想FSはC:\Practice以下の明示ツリーで、実ファイルに接続しない。実処理系差分試験だけが、一時ディレクトリの試験用ファイルと実シェルを使う。cmdのコードページやロケール依存の完了メッセージ、PSの端末書式を完全再現する宣言ではない。文字列ソートはen-USモデル、ファイル列挙はモデル配列順。ハッシュテーブルのキー順は実物の順序保証ではない。

### 正直な未対応・未確認

外部プロセス、UNC／ドライブ相対パス、実アクセス権・特殊ファイル・複雑なワイルドカード操作、cmd高度展開・for /F等・複合リダイレクト、PSモデルFileInfo等のメタデータへの書込・一般.NET・モジュール・非同期／並列・高度な関数／パラメーター・プロバイダー等は対象外。パス・命令・オプション名を示して停止する。

PSでは.NET固有／未確認の正規表現、-likeの文字クラス、未確定の型変換・複合文字列比較・副作用のある未知短絡評価、文字列部分式内の分岐を停止する。`Select-Object -First` が副作用を伴う上流処理を途中停止する形式も明示停止し、先に全件処理した誤った最終状態を表示しない。副作用のない基本パイプラインのFirstは対応。対応範囲の詳細はDEVELOPMENTに列挙した。

## 一次情報と再導出

Microsoft Learnのブラウザ取得と、公式の原稿リポジトリを使用した。シェル経由のLearn一括取得は403となったため、公式Gitリポジトリで照合を継続した。追加63項目の掲載説明・戻り値・注意点と根拠を [reference-r6.json](reference-r6.json) に記録した。原稿ごとの固定コミットURLとSHA-256を含む。既存511件すべてを今回新たに全文レビューしたとは扱わない。

- [cmd](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd)、[set](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/set_1)、[setlocal](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setlocal)、[if](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/if)、[for](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/for)、[call](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/call)。その他FS命令も個票の公式ページと照合。
- [about Pipelines](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipelines?view=powershell-7.4)、[Functions](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions?view=powershell-7.4)、[Return](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_return?view=powershell-7.4)、[Comparison Operators](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comparison_operators?view=powershell-7.4)、[Arrays](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_arrays?view=powershell-7.4)、[Hash Tables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_hash_tables?view=powershell-7.4)。各コマンドレットも個票の公式ページと照合。
- Windows公式原稿：`MicrosoftDocs/windowsserverdocs@a0a65c62a67f277772a21f51648e994f1f2dd0b0`。
- PowerShell公式原稿：`PowerShell/PowerShell-Docs@ebaa235784a688ec72ab642186c4c17460fb438b`、7.4版。

PS代表57件は独立した期待出力fixtureを用意し、アプリの機械照合に加えて実PowerShell 7.4.6でも一致を確認した。全45教材・使用例はそれぞれ新しい一時FSで、正確な掲載コードを実PowerShell実行して正常終了を確認した。後者は期待出力の独立照合57件と区別する。cmdの展開順・算術・call等は公式資料から期待値を導出して単体試験し、13件を実cmd差分用に恒常化した。

## 検証実績

| 検証 | 実測結果 |
| --- | --- |
| Node全体 `npm test` | 1,308件合格、失敗0。追加2種類の単体118件を含む。 |
| 新2種類の教材・使用例 | cmd 34件／PS 45件すべて、モデル上で解析・実行。Node契約試験も合格。 |
| 実PowerShell 7.4.6 | 独立期待値57件＋全45教材・使用例＝102件合格。 |
| 実cmd | ローカルはLinuxのため0件。13代表＋34教材・使用例をWindows CIの必須ジョブへ追加。スキップは成功扱いにしない。 |
| 既存ネイティブ教材 | 83件合格。C/C++出力比較、Python43実行。ローカルC# SDKなしでC#実行0件、既存Linux CIで検証する。 |
| 既存追加オラクル | 61件合格（C24、C++24、Python8、JS4、CFN1）。 |
| ファズ | 15種類×41＝615件。外側期限超過0、未捕捉例外0。空／巨大／不正構文／絵文字／深い入れ子／無限ループ相当を含む。 |
| 分岐・上限 | 未確定入力・候補列挙・矛盾剪定・パス連動を単体で確認。両新種類の2,048相当のパス爆発で2,000件上限と停止理由を確認。 |
| 全体ブラウザ | Chromium、15種類・全104教材・4画面×375/1440px＝120配置、横はみ出し0、例外0。15種類すべてオフライン再訪・切替・実行可能。 |
| 追加2種類の操作 | 32教材カード入口、16画面、10ファイル操作（.bat/.cmd/.ps1、通常／drop）、4行ジャンプ、4手動／自動＋パス操作、4エラー、4オフライン再訪。例外0。 |
| 保存・SW更新 | 破損等9ケース合格。実SW更新後も15種類の下書きを保持、オフライン再読込合格。 |
| 配信整合 | 全変更の最後にprecache再生成、`--check`、`git diff --check`。Actionsの実績は節目配信後の最終回答で確定。 |

ブラウザは既存Playwright検証環境でローカルHTTPを実操作した。新2種類のパス切替で使用中チップが変化し、クリックでリファレンスが開く。エディタ編集でテンプレート解説が消えることも確認。全種類×任意コード×全状態の完全証明はしていない。公開サイト・iOS実機の操作はMuse担当。

### 実装中に修正して再照合した点

PSの$nullと出力なしの区別、単一要素配列・参照、$Matchesの数値キー、ハッシュの型別キー、浮動小数点の基本文字列化、明示nullの関数引数、switchの文字列比較、Test-Pathの空・ワイルドカード、Copy-Itemの通常上書きを是正した。cmdの括弧内%展開、遅延展開、引数引用符、局所環境復帰、32ビット演算、複合代入の優先順位、末尾空白を回帰化した。PSの上流副作用の途中停止は未対応宣言で停止する。これらは未配信の新実装の検証であり、既存13種類全体の監査収束やMuseの独立監査の代替ではない。

## Modern Web Guidance

GoogleChrome公式 `modern-web-guidance@4dd968349e54ca45a05dd5c818fb035c9054b022` のスキルを取得し、CLI検索・single-line-overflow取得を実施。スクロール保持・読めるオーバーフローを確認した。新しいCSSや画面構造は導入せず、共通UIの文字を切らない方針を継続した。プロジェクト依存は追加せず、一時ディレクトリだけへ導入した。

## 配信と次工程

全変更・PROGRESS・本報告を同じ節目コミットにまとめ、git push 1回で配信する。push-filesツールがないためGitを使用。PR作成・マージ・コメント・workflow手動起動は不要。**使った書き込みコール数：1件（節目配信予定。実際のSHA、CIとPages成否は最終回答で確定）**。

cmd.exeのローカル不在は未確認として隠さず、Windows CIの必須検証が成功するまでPagesを配信しない構成にした。CI失敗は成功と報告しない。最終配信後は待機し、Museによる新種類の監査・公開確認を受ける。二重監査の収束済みとは宣言しない。
