# Codex R7 独立監査 — ee01f07（節目6・未完了）

対象は引き続き **ee01f07402b404c7b9dbcd83935b4be3bc4de187、全15種類・104テンプレート・978リファレンス**。配信日：2026-11-16 JST。Muse側の指摘一覧・個票を参照せず、固定対象の実装・公式資料・実ランタイムから独立に確認した。

節目6の追加は **17件（P2：15、P3：2）**。累計 **151件（P1：0、P2：136、P3：15）**。Museとの重複を除いた件数ではない。同じ原因の入力違い、過去の補強、判定を保留した差分を件数へ加算していない。[節目6の追加指摘](#節目6の追加指摘)と[残作業](#節目6の残作業)を参照。

**使った書き込みコール数：1件（この節目）。累計15件。** 報告書だけをmainへまとめて配信するgit push 1回。過去の節目は5件、4件、2件、2件、1件。GitHubへのgit pushを数え、ローカル作業・読取り・CI内の保存は含めない。製品コード・教材・既存テスト・DEVELOPMENT.mdは変更していない。監査用ブランチの追加pushもマージもない。

配信準備時のmainは前回報告の `329085b47a801518c9029079a3f6ce992d1b3c93`。各指摘はee01f07で再現する。その後のmainの修正状況を再監査したものではない。

**観点1〜8の監査は未完了。** 今回はPythonとCloudFormationの委譲Pythonの型・引数・イテレータ・未知値・例外階層・文字分類、およびリファレンスへの解決・教材の説明を進めた。全15種類・全104教材・978参照項目・111用語・全ビューの未了対象を維持する。サブエージェント・リセット権は使用していない。依頼モデル／推論設定をこの会話のツールから変更・確認できない制約も継続し、設定を検証したと偽らない。

## 節目5までの記録

以下は前回内容を保持した履歴。件数・書き込み回数・未実施の記述は当時の値であり、今回の状況は末尾の節目6で更新する。


対象は引き続き **ee01f07402b404c7b9dbcd83935b4be3bc4de187、全15種類・104テンプレート・978リファレンス**。配信日：2026-11-16 JST。Muse側の指摘一覧・個票を参照せず、固定対象の実装、公式資料、実ランタイムから独立に確認した。

節目5の追加は **8件（P2：4、P3：4）**。累計 **134件（P1：0、P2：121、P3：13）**。Museとの重複を除いた件数ではない。同じ原因の入力違いと既報R7-50の補強を新規件数へ加算していない。[節目5の追加指摘](#節目5の追加指摘)と[残作業](#節目5の残作業)を参照。

**使った書き込みコール数：1件（この節目）。累計14件。** 報告書だけをmainへまとめて配信するgit push 1回。過去の節目は5件、4件、2件、2件。ローカル作業、読取り、CI内の保存を含めず、GitHubへ書き込むgit pushを数えている。製品コード・教材・既存テスト・DEVELOPMENT.mdは変更していない。監査用ブランチの追加pushもマージも行っていない。

配信準備時のmainは前回報告の `1d0bf0238a35b6a0450b5a87ca752ee7eaa0dd99`。各指摘はee01f07の再現であり、その後のmainに同じ欠陥が残っているとの再監査ではない。

**観点1〜8の監査は未完了。** 今回は保存・複数タブ・取込み・破損・保存失敗・オフライン・編集フォーカス・エラー分類を進めた。全15種類の全関数、全104教材・978参照項目・111用語・全ビューの未了分を維持する。サブエージェント・リセット権は使っていない。依頼モデル／推論設定をこの会話のツールから変更・検証できない制約も継続し、設定を確認したと偽らない。

## 節目4までの記録

以下は前回内容を保持した履歴。件数・書き込み回数・未実施の記述は当時の値であり、今回の状況は末尾の節目5で更新する。


対象は引き続き **ee01f07402b404c7b9dbcd83935b4be3bc4de187、全15種類・104テンプレート・978リファレンス**。配信日：2026-11-16 JST。Muse側の指摘一覧・個票を参照せず、固定対象の実装と公式資料・実ランタイムから独立に確認した。

節目4の追加は **26件（P2：25、P3：1）**。累計 **126件（P1：0、P2：117、P3：9）**。Museとの重複を除いた新規件数ではない。同じ原因の複数入力、既報の補強を水増しして数えない。[節目4の追加指摘](#節目4の追加指摘)と[残作業](#節目4の残作業)を参照。

**使った書き込みコール数：2件（この節目）。累計13件。** Windows用の監査専用ブランチへのgit push 1回と、報告書だけをmainへまとめて配信するgit push 1回。過去の節目は5件、4件、2件。ローカル作業、読取り、公式ソースの読取り専用clone、CI内の保存は含めない。製品コード・教材・既存テスト・DEVELOPMENT.mdは変更していない。監査ブランチをmainへマージしていない。

配信準備時のmainは前回報告の `196360c7060540329566cd893b6e0960262a9b6c`。個々の指摘はee01f07で再現する。進んだmainに同じ欠陥が残るとの再監査ではない。

**観点1〜8の監査は未完了。** この節目はAHK・UI.Vision・PAD・Power Appsの状態と異常入力を進め、JavaScriptへ共通する追加引数の評価も確認した。全15種類の残作業、978参照項目、全104教材・全ビューの対象は維持する。サブエージェント・リセット権は使用していない。依頼モデル／推論設定を会話のツールから変更・確認できないという制約も前回どおりで、設定を検証したと偽らない。

## 節目3までの記録

以下は前回内容を保持した履歴。累計・書き込み回数・未実施の記述は当時の値であり、今回の状況は末尾の節目4で更新する。


監査対象は引き続き **ee01f07402b404c7b9dbcd83935b4be3bc4de187、全15種類・104テンプレート・978リファレンス**。配信日：2026-11-16 JST。Muse側の指摘一覧は読まず、修正後mainの挙動を固定対象へ混ぜていない。

節目3では **追加22件（全てP2）**。累計 **100件（P1：0、P2：92、P3：8）**。同じ原因の多数の入力はまとめ、実測追加は重複計上しない。これはMuseと重複しない新規件数を表すものではない。[追加指摘](#節目3の追加指摘)と[更新した残作業](#節目3の残作業)を参照。

**使った書き込みコール数：2件（この節目）。累計11件。** 監査専用ブランチへWindows性能計測を送るgit push 1回と、この報告書だけをまとめてmainへ配信するgit push 1回。前の節目は5件、4件。ローカル作業用ファイル・読取り・CI内の保存は数に含めない。製品コード・教材・既存テスト・DEVELOPMENT.mdの修正や、監査ブランチのmainへのマージは行っていない。

配信準備時のmainは前の報告コミット `830ca4b7fd15fd503527588f89f3fde791344a8c`。本書は固定したee01f07の監査であり、最新mainに個々の欠陥が残ると判定する再監査ではない。

**観点1〜8は未完了。** この節目ではVBA・ImageJ・R・C/C++の未確認部分を進めたが、他種類や文面・保存・全ビュー等の残作業を削っていない。978項目と全実装の全引数・全組合せを一次情報に照合し終えたとは扱わない。前の記録を保持し、状況を末尾で更新する。

依頼されたGPT-6.1 Sol／推論「中」の設定を会話のツールから変更・検証する手段はないため、設定を確認済みとは報告しない。サブエージェント・リセット権は使用していない。

## 節目2までの記録

以下は前回の内容を保持した履歴。書き込み回数や当時の累計、未実施の記述は当時の値であり、この節目の更新は後記を優先する。


対象は引き続き **ee01f07402b404c7b9dbcd83935b4be3bc4de187、全15種類・104テンプレート・978リファレンス**。配信日：2026-11-16 JST。mainの後続修正を対象へ混ぜず、Muse側の指摘一覧・個票は参照していない。

節目2では **追加22件（P2：20、P3：2）** を報告する。累計は **78件（P1：0、P2：70、P3：8）**。これは独立検出件数であり、Museとの重複を除外した件数ではない。既報への実測追加は重複計上しない。[節目2の追加指摘](#節目2の追加指摘)と[更新した残作業](#節目2の残作業台帳)を参照。

**使った書き込みコール数：4件（この節目）。累計9件。** この節目の内訳は監査専用ブランチへのgit push 3回と、報告書だけをmainへまとめて配信するgit push 1回。前回は5回。計数の定義は前回どおりGitHubへの書き込みコールであり、ローカル作業用ファイルやCI内成果物の保存を含めない。製品コード・教材・既存テスト・DEVELOPMENT.mdは修正していない。監査ブランチをmainへマージしていない。

配信準備時点のmainは `0ece37fdfa6a308c8e9477297b191a577062bdb6`。本書はee01f07の結果を記録し、進んだmainにまだ欠陥が残っているとの判定ではない。対象コミットの画面または固定checkoutで再現すること。

**観点1〜8の監査は継続中。完了・収束ではない。** 特に、978項目すべての説明と一次情報の逐語的照合、全実装名からリファレンス／除外宣言への対応表、全関数の全引数・組合せ・停止理由の網羅は未了。対象を削って完了とは扱わない。前回の記録は下に保持し、実施不能・未了の現状は節目2台帳で更新する。

依頼のGPT-6.1 Sol／推論「中」は引き続き希望設定として扱う。会話内のツールで親モデル・推論設定を変更／確認できないため、適用を検証したとは記載しない。サブエージェント、リセット権は使用していない。

## 節目1の記録

以下は前回配信の記録。実施状況のうちC# CLI不在、WindowsのFileInfoタイムアウト等は後の節目2で更新されている。前回の書き込み回数5件も当時の値を保持する。


監査対象：`ee01f07402b404c7b9dbcd83935b4be3bc4de187`、15種類／104テンプレート／978リファレンス（対応917／参照専用61）。2026-11-15 JST の依頼に基づく。

配信直前のmainは他の作業により `db16f5e65ffd42c306243cbbc4b2b37ccda431c0` へ進んでいた。本報告は指定のee01f07を監査したもので、配信先mainの追加修正を再監査した報告ではない。更新後のMuse指摘一覧は読んでいない。

**これは途中報告であり、観点1〜8の完了・欠陥収束の宣言ではない。** 全種類を対象に着手し、全教材・全リファレンス例の実行と、独自の境界・異常値・組合せ検証を行った。一方、978項目の説明・書式・期待出力と、全実装分岐の全引数についての一次情報照合は完了していない。未了を「確認済み・なし」に読み替えない。残りは末尾の台帳に保持する。

**使った書き込みコール数：5件。** GitHubへの書き込みを行う `git push` のコール数で数えた。監査専用ブランチへの4回（検証スクリプト／実ランタイムの準備・タイムアウト記録を含む）と、この報告書だけをmainへ配信する1回。mainへの節目配信は今回の1回だけ。作業用ファイルのローカル作成、読取り、CI内の成果物アップロードはこの数に含めない。本体コード・既存テスト・教材・DEVELOPMENT.md の修正は行っていない。監査専用ブランチはmainへマージしていない。

依頼されたモデルは GPT-6.1 Sol／推論「中」。この会話内のツールでは親モデル・推論設定を変更／検証できないため、適用を確認済みとは記録しない。サブエージェントは使用していない。

## 独立性・検証方法

Muse側の指摘一覧、監査個票、修正台帳は読んでいない。必須照合対象の DEVELOPMENT.md、本体実装・定義データ・現行CI構成を読み、先に独自の入力を作った。既存テスト全体の実行は行ったが、Muse指摘一覧を差分入力や期待値に転用していない。本報告の件数は独立検出件数であり、Museとの重複を除いた「新規件数」ではない。

共通の再現手順：対象コミットのアプリをHTTPで開く→指定の種類を選ぶ→テンプレートを「なし」にしてコード欄へ下記コードを入力→必要なモデル値を設定→実行→出力・終了状態・エラーを確認する。各独立ケースは既定モデルへ戻す。AutoHotkeyの単独式は `event: null` を設定する。連続した文を持たないケース群は、前のエラーで後続が止まらないよう別々に実行する。

Node APIでも `getDefinition(id).simulate(code, structuredClone(definition.model.defaults))` で再現できる。ローカル差分用スクリプトは独立作業ディレクトリだけに作成した。通常実行が正常な場合でも、実物にない値・正常終了・分岐を出すものを重点的に確認した。正直な未対応／未確認停止は欠陥に数えていない。

### 実行環境と確認済みの範囲

- Linux：Node 24.22.1、Python 3.12.14、gcc/g++ 14.2.0、Chromium 156.0.8078.79。
- 作業ディレクトリに展開した実物：PowerShell 7.4.6、R 4.2.2 Patched、ImageJ 1.54p／OpenJDK 21。既存アプリの実装をこれらへ置換したのではなく、比較先として使用。
- Windows：GitHub Actionsの Windows Server 2025（10.0.26100）。cmd.exe、PowerShell 7.6.9、AutoHotkey 2.0.19、およびAdd-TypeでコンパイルしたC#を実行。後続CIではWindows側のPowerShellを7.4.6へ固定した検証も実施（結果の詳細は後記）。
- 既存Nodeテスト：2,055件成功、失敗0、skip 0（13,740.677 ms）。独立監査完了の証拠とは扱わない。
- 独自の全件実行：104テンプレート＋978リファレンス例。参照専用61件の停止を対応漏れとは数えず、対応917件の例で新たな停止なし。C/C++/C#の3つの範囲外アクセス教材は意図した停止。
- 独自差分：Pythonの初期86ケースと1,112ケースの関数・メソッド行列、R 261ケース、ImageJ 205ケース、PowerShellの独自ケース群、JavaScript/C系/モデルアクションの追加再現。数値のJSON書出しでNaN/Infがnullになる比較ノイズ、イテレータの実アドレス、対話入力の端末エコーは欠陥から除外した。
- 既存ネイティブ検証：239件（C/C++69、Python170：実行161／構文確認のみ9）と別途の61オラクルが成功。ここでC#59＋3件はdotnet CLI不在でskipされており、合格へ読み替えていない。C#は別途Windowsで本報告のTryParseを検証した。
- ブラウザ：15種類×4ビュー×375/1440pxの120表示を確認。全104テンプレートのセレクターからの実行、追加の切替3経路を確認。横はみ出しなし。ラベルを持たない可視フォーム部品なし。エディタからのEsc→Tab退出、容量超過の保存失敗通知を確認。

Windows検証の原文・スクリプト：

- [初回：cmd・PowerShell・性能](https://github.com/sylpica/programming-practice/actions/runs/43716605104)（監査ブランチ `96dad5c2cd3ed938ade55c56805422fc44275c76`）。
- [AHK・.NET追加](https://github.com/sylpica/programming-practice/actions/runs/43717377487)（`94dd31abbbc60fe54b8aba9cfd7585659f171749`）。
- [7.4.6固定の初回](https://github.com/sylpica/programming-practice/actions/runs/43717952641)（`be784095fee4be4d360136b5b7fadfb4b74e794c`）。FileInfoを含む結果を深さ20でJSON化する監査ケースがタイムアウトし、ジョブ失敗。内部のどの処理が時間を消費したかまでは未確定。これをアプリの欠陥や合格とは数えない。
- [最終：7.4.6固定・タイムアウト記録継続版](https://github.com/sylpica/programming-practice/actions/runs/43718149275)（`da8b336219351f487f2a9bbeec3efc6148c500df`）。バージョン文字列7.4.6を確認。ジョブはsuccessだが、ドット名のFileInfoケース1件は30秒でtimeoutとして記録している。したがって全オラクル合格という意味ではない。Get-ContentのPath欠落は `Cannot process command because of one or more missing mandatory parameters: Path.` と実測した。

## 個別依頼：cd後の連結echo（実Windows）

毎回空の一時ディレクトリと `sub` を作り、別々の `probe.cmd` を `cmd.exe /d /q /c probe.cmd` で実行した。各batの冒頭は `@echo off`。`cd` とechoを別の行にし、cd前に同一論理行で展開される条件を避けた。

```bat
cd sub
echo%CD%
```

標準出力は空。標準エラー（原文）：

```text
The filename, directory name, or volume label syntax is incorrect.
```

```bat
setlocal EnableDelayedExpansion
cd sub
echo!CD!
```

同じく標準出力は空、同じ構文エラー。どちらもパスを表示しない。`cd "sub"` と引用して移動したケースでも同じだった。今回の一時パスは `C:\Users\RUNNER~1\AppData\Local\Temp\tmp44nhg5db\sub`。

```bat
cmd /c exit 7
echo%ERRORLEVEL%
```

標準出力は空。標準エラー：

```text
'echo7' is not recognized as an internal or external command,
operable program or batch file.
```

遅延形 `echo!ERRORLEVEL!` も7にして同じ未知コマンドエラーを確認。したがって質問の二択では全て「パスや値の出力にはならずエラー」。ただし、CDの2形はERRORLEVELの例とエラー理由が異なる。「未知コマンドとして停止」というモデルは結果の停止には一致するが、実cmdの診断理由の再現とは一致しない。環境変数でCDを上書きした場合や任意のパス文字列すべてにまで、この実測を一般化しない。公式構文・代替の `echo:%var%` は [CMD-echo] を参照。

## 独立検出した欠陥

以下の55件に、後記の用語集未収載1件を加え、計56件。P1：0、P2：50、P3：6。修正・Museとの重複裁定は行っていない。

### R7-01（P2）通常の環境変数展開でコマンド区切りをデータ化する

対象：cmd。上記の共通手順で次を実行する。

```text
set "X=hello&echo injected"
echo %X%
```

実際：アプリは1行 `hello&echo injected`。Windows cmd は2行 `hello`、`injected`。

期待：通常の % 展開と遅延 ! 展開を同じ構文保護にしない。通常展開の実行結果を再現するか、該当する展開を未対応として停止する。遅延展開では実 cmd も1行になる。

根拠：[CMD-set] と Windows CI 原文。`js/types/cmd/engine.js` の percent/slot が通常展開にも構文文字保護を適用している。

### R7-02（P2）遅延展開時の対にならない ! が残る

対象：cmd。上記の共通手順で次を実行する。

```text
setlocal EnableDelayedExpansion
echo hello!world
```

実際：アプリ `hello!world`。実 cmd `helloworld`。

期待：実 cmd と同じく対にならない ! を取り除くか、その形式を明示して未対応停止する。

根拠：[CMD-cmd]、Windows CI の delayed missing bang。

### R7-03（P2）if exist のワイルドカードを通常のパスとして照合する

対象：cmd。上記の共通手順で次を実行する。

```text
if exist *.txt echo found
```

実際：既定モデルに notes.txt と readme.txt があるのに出力なし。実 cmd は同じ条件で `found`。

期待：ワイルドカード存在条件を照合し、真側へ進む。未対応なら条件を偽と確定しない。

根拠：[CMD-if]。Microsoft Learn の echo 使用例にも `if exist *.rpt` が掲載される。[CMD-echo]。

### R7-04（P2）$null との大小比較が一律 False になる

対象：PowerShell。上記の共通手順で次を実行する。

```text
1 -gt $null
-1 -lt $null
$null -lt 1
$null -gt -1
1 -ge $null
```

実際：アプリは5件とも False。実 PowerShell は5件とも True。

期待：null を含む大小関係を実物に合わせる。境界の0・負数も分ける。

根拠：[PS-Compare]、PowerShell 7.4.6 Linux／Windows CI。`binary` の null 分岐が大小関係を失っている。

### R7-05（P2）右辺配列とのスカラー比較を常に不一致とする

対象：PowerShell。上記の共通手順で次を実行する。

```text
$true -eq @(1,2)
'1 2' -eq @(1,2)
```

実際：アプリ False、False。実 PowerShell True、True。

期待：右辺が単独の値として扱われることと、無条件に不一致になることを区別する。左辺型への変換が必要。DEVELOPMENT.md の「スカラー対右辺配列は -eq False/-ne True」という断定も同時に誤り。

根拠：[PS-Compare] の左辺型への変換規則、実ランタイム。

### R7-06（P2）$null 左辺の乗算を0に変える

対象：PowerShell。上記の共通手順で次を実行する。

```text
$null * 5
5 * $null
```

実際：アプリは両方0。実 PowerShell は前者 $null、後者0。

期待：左辺 $null の乗算結果を保持する。`$null -eq ($null * 5)` の分岐も現在は逆になる。

根拠：[PS-Null] に同じ順序依存の仕様が示されている。Windows CI でも確認。

### R7-07（P2）関数の名前付き引数が位置引数の割当てを消す

対象：PowerShell。上記の共通手順で次を実行する。

```text
function f {param($a,$b) "$a,$b"}
f -a 1 2
f 1 -a 2
```

実際：アプリ `1,`、`2,`。実 PowerShell `1,2`、`2,1`。

期待：名前で束縛済みの仮引数を除き、残る仮引数へ位置引数を割り当てる。未消費の値だけを $args に入れる。

根拠：[PS-Binding]、実 PowerShell。現在は仮引数の添字と位置引数の添字を固定で一致させている。

### R7-08（P2）$Matches の更新条件が -notmatch と配列で逆になる

対象：PowerShell。上記の共通手順で次を実行する。

```text
'a' -match '(a)'
'b' -notmatch '(b)'
$Matches[1]
```

実際：アプリ True、False、a。実 PowerShell True、False、b。別途 `@('a','b') -match '(.)'; $Matches[1]` では、未定義のはずの Matches をアプリが生成する。

期待：スカラーの -notmatch でも一致した正規表現のキャプチャを更新する。左辺コレクションの -match/-notmatch は Matches を更新しない。

根拠：[PS-Compare]、[PS-Auto]、Windows CI。

### R7-09（P2）Select-Object の First と Last を連続スライスにする

対象：PowerShell。上記の共通手順で次を実行する。

```text
1,2 | Select-Object -First 1 -Last 1
1,2,3 | Select-Object -First 1 -Last 1 -Skip 1
```

実際：アプリは1、2をそれぞれ1件だけ出す。実 PowerShell の各結果は1・2、2・3。

期待：同時指定時は先頭側と末尾側の選択を合成する。First で切った配列に Last をかけない。

根拠：[PS-Select]、Windows CI。

### R7-10（P2）存在しない ExpandProperty を正常な空結果にする

対象：PowerShell。上記の共通手順で次を実行する。

```text
1,2 | Select-Object -ExpandProperty DoesNotExist
```

実際：アプリは無エラーで出力なし。実 PowerShell は `Property "DoesNotExist" cannot be found.`。

期待：指定した展開プロパティの不在を報告する。任意のプロパティ読取りが $null を返すことと、このパラメーターのエラーを分ける。

根拠：[PS-Select]、実 PowerShell。

### R7-11（P2）Write-Output の束縛できない追加引数を無視する

対象：PowerShell。上記の共通手順で次を実行する。

```text
Write-Output -InputObject 1 2
```

実際：アプリは1だけ出力し正常終了。実 PowerShell は argument 2 を受ける位置パラメーターがない旨のエラー。

期待：追加引数を捨てない。正しい束縛を行うか、追加引数を未対応として停止する。

根拠：[PS-Output]、Windows CI。

### R7-12（P2）変換できる空文字列・16進文字列を変換不能とする

対象：PowerShell。上記の共通手順で次を実行する。

```text
[int]''
[double]''
0 -eq ''
0 -eq '0x0'
```

実際：アプリは先頭の変換を RuntimeException で停止。各行を別々に実行すると、比較は False。実 PowerShell は0、0、True、True。

期待：対応する基本型変換を再現するか、未実装形式だと明示する。実際には変換可能な値を「数値へ変換できません」と断定しない。

根拠：[PS-Conversion]、[PS-Compare]、7.4.6 の実測。

### R7-13（P2）Sort-Object の混在型を文字列比較へ固定する

対象：PowerShell。上記の共通手順で次を実行する。

```text
2,'10' | Sort-Object
```

実際：アプリは10、2の順。実 PowerShell は2、10の順（先頭が数値のケース）。対照の `'10',2` は文字列順になる。

期待：実物の型を考慮した比較を行うか、混在型の並べ替えを未対応停止する。en-US の照合順だけの制限では説明できない。

根拠：[PS-Sort]、実 PowerShell。

### R7-14（P2）空配列の巨大な繰返しが内部の時間予算を迂回する

対象：PowerShell。上記の共通手順で次を実行する。

```text
@() * 2147483648
```

実際：Windows CI のモデル単体実行は8秒で強制終了（8,133.226 ms）。`@() * 100000000` も内部実行1,273.063 ms、操作カウント10のまま。実 PowerShell は空結果で短時間に終了。

期待：出力要素数が0でも反復回数を検査する。内側のループで予算を確認するか、空配列なら即時返す。ブラウザには別途2,500 msのWorker監視があり、メイン画面が無期限に固まるという指摘ではない。

根拠：[PS-Arithmetic]、Windows CI の model-performance。`binary` の配列繰返しループ内に api.check がない。

### R7-15（P2）必須パスの欠落から null という実在パスを作る

対象：PowerShell。上記の共通手順で次を実行する。

```text
Set-Content null "secret"
Get-Content
```

実際：アプリは引数なしの Get-Content で `secret` を読む。未指定 Path の null を文字列 "null" へ変えている。 Windows PowerShell 7.4.6ではPath必須引数不足として停止した。

期待：Path を未指定なら必須引数不足として停止する。`null` という名前のファイルを選んではならない。

根拠：[PS-Content] の Path 必須指定。`p("path",0,null)` → windowsPath の String(path) が原因。

### R7-16（P2）先頭がドットの名前で Extension を捏造する

対象：PowerShell。上記の共通手順で次を実行する。

```text
New-Item -Path ".hidden" -ItemType File
(Get-ChildItem -File | Where-Object {$_.Name -eq ".hidden"}).Extension
```

実際：アプリの Extension は空文字列。実 .NET の Path.GetExtension(".hidden") は `.hidden`。 これはLinux PowerShell 7.4.6での実測。Windows側のこのFileInfoを含むケースは監査ハーネスごとtimeoutになり、当該プロパティ結果は未採取。

期待：FileInfo 相当と宣言した Extension の算出を実物に合わせるか、この名前形式を未対応とする。 本件のWindows実測は継続対象。

根拠：[NET-Extension]、PowerShell 7.4.6／.NET の実測。`info` の dot > 0 が原因。

### R7-17（P2）round と pow が過剰引数を検査前に捨てる

対象：Python／CloudFormation の Pythonハンドラ。上記の共通手順で次を実行する。

```text
print(round(1,2,3))
print(pow(1,2,3,4))
```

実際：各行を単独実行するとアプリは1。CPython はいずれも TypeError。

期待：余分な引数を落とさず検査する。fillKw が ARITY 検査前に位置引数列を短くしている。

根拠：[PY-Functions]、CPython 3.12.14 の独自マトリクス。CloudFormation は同じ評価器へ委譲する。

### R7-18（P2）set・tuple・range メソッドが引数の過不足を無視する

対象：Python／CloudFormation の Pythonハンドラ。上記の共通手順で次を実行する。

```text
print(({1,2}).add(1,2))
print(({1,2}).discard())
print(({1,2}).clear(1))
print(((1,2)).count())
print((range(3)).index(1,2))
```

実際：アプリは順に None、None、None、0、1。CPython は全件 TypeError。set.remove/copy/symmetric_difference_update、tuple.count、range.count にも同型の再現あり。

期待：各メソッドの引数個数を検証する。引数の有無を無視して値や正常な更新を生成しない。

根拠：[PY-Types]、CPython の1,112ケース差分。

### R7-19（P2）非イテラブルを extend・集合更新で無視する

対象：Python／CloudFormation の Pythonハンドラ。上記の共通手順で次を実行する。

```text
a=[1,2]
a.extend(None)
print(a)
```

実際：アプリは例外なしで [1, 2]。CPython は NoneType が iterable でない TypeError。set.update(0)、intersection_update(0)、difference_update(0)、symmetric_difference_update(0) も黙って続行。set.discard([]) も unhashable のエラーを出さない。

期待：非イテラブル・ハッシュ不能値を停止する。正常な no-op として扱わない。

根拠：[PY-Types]、CPython 実測。

### R7-20（P2）tuple.index の start/stop を捨てる

対象：Python／CloudFormation の Pythonハンドラ。上記の共通手順で次を実行する。

```text
print((1,2).index(1,2))
```

実際：アプリは0。CPython は検索開始位置2以降に1がないため ValueError。

期待：境界引数を適用するか、その形式を未対応停止する。

根拠：[PY-Types] の共通シーケンス index 規則、実測。

### R7-21（P2）seq の1引数形式で0と負数の列が壊れる

対象：R。上記の共通手順で次を実行する。

```text
print(seq(0))
print(seq(-1))
```

実際：アプリは空ベクトル、c(1)。実 R は c(1,0)、c(1,0,-1)。文字列1引数でも長さ由来の列と数値変換が混同される。

期待：seq(n) と seq_len(n) を区別し、1:n と単一引数の型・長さ規則を適用する。

根拠：[R-seq] に seq(0) を含む1引数の規則が明記されている。R 4.2.2 実測。

### R7-22（P2）R の必須引数・過剰引数を正常値にする

対象：R。上記の共通手順で次を実行する。

```text
print(length())
print(length(1,2))
print(is.na())
```

実際：単独実行でアプリは1、1、FALSE。実 R はいずれも引数数のエラー。nrow()/ncol()/names() と各過剰引数にも再現。seq_len(1,2) も1を返す。

期待：必須引数と個数を検査する。値のない引数を undefined の値として計算しない。

根拠：[R-length]、[R-NA]、[R-seq] と R 4.2.2 実測。

### R7-23（P2）mean(NULL) を NaN とする

対象：R。上記の共通手順で次を実行する。

```text
print(mean(NULL))
```

実際：アプリは NaN。実 R は NA_real_ と「numeric/logical でない」という警告。c() も NULL のため同じ。

期待：NULL を numeric(0) と同一視せず、非数値型の平均の規則を適用する。

根拠：[R-mean]、実 R。

### R7-24（P2）median が NULL／NaN の違いを失う

対象：R。上記の共通手順で次を実行する。

```text
print(median(NULL))
print(median(NaN))
```

実際：アプリは NA、NaN。実 R は NULL、NA。

期待：元の型と欠損除去の規則を保持する。リファレンスの「値がない場合はNA」という無条件の説明も NULL ケースを取りこぼす。

根拠：[R-median]、R 4.2.2 の median.default の実測。

### R7-25（P2）as.numeric(NaN) が NA になる

対象：R。上記の共通手順で次を実行する。

```text
print(as.numeric(NaN))
print(is.na(as.numeric(NaN)))
```

実際：アプリは c(NA)、c(TRUE)。前者は実 R の NaN と異なる。is.na だけでは両者の取り違えを発見できない。

期待：NaN を変換不能文字列の NA と混同しない。

根拠：[R-numeric]、実 R。

### R7-26（P2）引数なしの型変換が存在しない文字列を作る

対象：R。上記の共通手順で次を実行する。

```text
print(as.character())
print(as.numeric())
```

実際：アプリは c("undefined")、c(NA)。実 R は character(0)、numeric(0)。

期待：引数なしの正規形の長さ0ベクトルを返す。JS内部値 undefined を利用者の文字列として作らない。

根拠：[R-character]、[R-numeric]、実 R。

### R7-27（P2）data.frame の省略列名を V1 に固定する

対象：R。上記の共通手順で次を実行する。

```text
print(names(data.frame(1)))
```

実際：アプリは "V1"。実 R は "X1"。data.frame(c(1,2))、複数の位置引数等でも列名が異なる。

期待：引数式から作られる既定列名を適用するか、名前なし引数を未対応停止する。後続の名前による列参照も誤る。

根拠：[R-frame] の列名生成規則、実 R。

### R7-28（P2）%in% が NaN と NA を同じ欠損として一致させる

対象：R。上記の共通手順で次を実行する。

```text
print(NaN %in% c(NA))
```

実際：アプリ c(TRUE)。実 R FALSE。

期待：NaN は NaN と、NA は NA と照合する。両者を一つの欠損トークンにまとめない。

根拠：[R-match]、実 R。

### R7-29（P2）newArray の負数・小数を無言で別のサイズにする

対象：ImageJ。上記の共通手順で次を実行する。

```text
a=newArray(-1); print(a.length);
```

実際：アプリは長さ0。実 ImageJ は Negative array size。別ケース newArray(1.5) はアプリ2、実物1。

期待：負サイズは停止し、小数は実物の整数化に合わせるか未対応停止する。

根拠：[IJ-Functions]、[IJ-Source] の newArray、ImageJ 1.54p 実測。

### R7-30（P2）Math.min/max の不正な引数個数を有効な計算にする

対象：ImageJ。上記の共通手順で次を実行する。

```text
print(Math.min(0));
print(Math.max(1,2,3));
```

実際：各行を単独実行するとアプリは0、3。実 ImageJ は構文エラーで実行を完了しない。

期待：2引数の関数として個数を検査する。一般のJS Math.min/max の可変長引数を移植しない。

根拠：[IJ-Functions]、[IJ-Source] の doMath/getLastArg、1.54p 実測。

### R7-31（P2）lengthOf(number) で数値を文字列化して長さを返す

対象：ImageJ。上記の共通手順で次を実行する。

```text
print(lengthOf(-1));
```

実際：アプリは2。実 ImageJ は文字列・配列として不適切な引数として停止する。

期待：対象型を検証する。数値の表示桁数を返してはならない。

根拠：[IJ-Functions]、[IJ-Source] の lengthOf、1.54p 実測。

### R7-32（P2）範囲外 charCodeAt を NaN として正常出力する

対象：ImageJ。上記の共通手順で次を実行する。

```text
print(charCodeAt("abc",-1));
```

実際：アプリ NaN。実 ImageJ は Index (-1) is outside of the 0-2 range。

期待：範囲外添字をエラーとして止める。

根拠：[IJ-Functions]、[IJ-Source] の charCodeAt/checkIndex、実測。

### R7-33（P2）fromCharCode の範囲と複数引数が実物と異なる

対象：ImageJ。上記の共通手順で次を実行する。

```text
print(fromCharCode(-1));
print(fromCharCode(1,2,3));
```

実際：単独実行で、負数はアプリが U+FFFF を生成、実物は0～65535の範囲エラー。複数引数はアプリ U+0001 のみ、実物 U+0001/U+0002/U+0003。

期待：引数の有効範囲を検査し、複数のコードを連結する。未対応なら余分な引数を捨てず停止する。

根拠：[IJ-Functions]、[IJ-Source] の fromCharCode、実測。

### R7-34（P2）型付き数値変数の Len が文字数になる

対象：Excel VBA。上記の共通手順で次を実行する。

```text
Dim n As Long
n = 1
Debug.Print Len(n)
```

実際：アプリは1。Long変数の格納に必要なバイト数は4。リファレンスも Len(文字列)・文字数という説明に狭めているが、この制限の宣言はない。

期待：型付き変数のサイズと Variant／String の文字数を区別するか、数値型変数の Len を未対応停止する。実 Excel はこの環境では未実測。

根拠：[VBA-Len] の varname と Variant の区別、および [VBA-Long]。

### R7-35（P2）Null／未知値の伝播が引数数検査を迂回する

対象：Excel VBA。上記の共通手順で次を実行する。

```text
Debug.Print Len(Null,1)
```

実際：アプリは無エラーで Null を出す。

期待：Len は引数1個のみ。Null伝播より先に個数を検証して停止する。実 Excel のエラー文言・コードまでは未実測。

根拠：[VBA-Len] に引数は1つだけと明記。evalExpr の arity 検査より前に Null／未知値を返す。

### R7-36（P2）引数なしの Math 関数が0になる

対象：JavaScript。上記の共通手順で次を実行する。

```text
console.log(Math.abs());
console.log(Math.floor());
console.log(Math.round());
```

実際：アプリは全て0。実 JavaScript は全て NaN。

期待：省略引数を undefined として扱い、ToNumber の結果を保つ。null へ置換しない。

根拠：[ECMA-Math]、Node.js 24.22.1。

### R7-37（P2）JSON.stringify の第2・第3引数を捨てる

対象：JavaScript。上記の共通手順で次を実行する。

```text
console.log(JSON.stringify({a:1,b:2},["a"]));
console.log(JSON.stringify([1,2],null,2));
```

実際：アプリは全プロパティ、字下げなし。実物は a だけ、2スペース字下げの配列。

期待：replacer/space を扱うか、指定された場合は未対応停止する。受理して第1引数だけで計算しない。

根拠：[ECMA-JSON]。

### R7-38（P2）appendChild が既存の親からノードを外さない

対象：JavaScript。上記の共通手順で次を実行する。

```text
const a=document.createElement("p");
const b=document.createElement("div");
document.body.appendChild(a);
b.appendChild(a);
console.log(document.body.children.length);
```

実際：アプリ1。実DOMは0（aはbへ移動する）。同じ親に2回追加すると重複も生成する。

期待：既存ノードの親子関係を更新するか、この組合せを明示して停止する。

根拠：[DOM] の pre-insert/adopt/append 規則。

### R7-39（P2）親要素の textContent が子の更新を反映しない

対象：JavaScript。上記の共通手順で次を実行する。

```text
const a=document.createElement("p");
a.textContent="x";
document.body.appendChild(a);
console.log(document.body.textContent);
```

実際：アプリ undefined。実DOMは x。

期待：textContent の読取りを子のテキストに連動させるか、親からの集約読取りを未対応停止する。

根拠：[DOM] の descendant text content と textContent getter。

### R7-40（P2）存在しない String.Length を生成し、教材例も成功扱い

対象：AutoHotkey v2。上記の共通手順で次を実行する。

```text
MsgBox "abc".Length
```

実際：モデル event=null でアプリ3。実AutoHotkey 2.0.19 は `PropertyError: This value of type "String" has no property named "Length".`。リファレンス Length の説明・戻り値・hello.Lengthの使用例も同じ誤り。

期待：標準の文字列へ Length を生やさない。文字列長は StrLen を参照し、未実装なら停止する。配列.Length の対応は正しい。

根拠：[AHK-Objects] の primitive prototype の拡張例、[AHK-StrLen]、Windows CI。

### R7-41（P2）単項 ! が数値文字列の真偽値を取り違える

対象：AutoHotkey v2。上記の共通手順で次を実行する。

```text
MsgBox !"0"
```

実際：event=null でアプリ0、実物1。対照として同じアプリの if "0" は偽になり、同一種類内でも不一致。

期待：数値文字列0の真偽値規則を条件式と単項否定で統一する。

根拠：[AHK-Boolean]、Windows CI。

### R7-42（P2）IsSet に変数以外を渡しても1を返す

対象：AutoHotkey v2。上記の共通手順で次を実行する。

```text
MsgBox IsSet(1)
```

実際：event=null でアプリ1。実物は `IsSet requires a variable.` で停止。

期待：直接の変数参照かどうかを検査する。式の値が既知かどうかを IsSet の意味に置き換えない。

根拠：[AHK-IsSet]、Windows CI。

### R7-43（P2）abs の仮引数型への変換を行わず小数を返す

対象：C。上記の共通手順で次を実行する。

```text
#include <stdio.h>
#include <stdlib.h>
int main() {
 printf("%d\n",abs(1.5));
 return 0;
}
```

実際：Cモデルの出力1.5。gcc C17 の実出力1。

期待：int 仮引数への変換を行い、戻り値も int とする。正しく扱えない引数型なら明示して停止する。

根拠：[C-Standard] 6.5.2.2、7.22.6.1。C++のオーバーロード選択とは別に、Cの再現として検出した。

### R7-44（P2）printf の %c がUnicodeコード点になる

対象：C／C++。上記の共通手順で次を実行する。

```text
#include <stdio.h>
int main() {
 printf("%c\n",256);
 return 0;
}
```

実際：アプリは U+0100（Ā）と改行。gcc の実出力バイトは 00 0A。

期待：%c の int 引数は unsigned char に変換して扱う。Windowsのコードページ等を再現できない範囲なら値を捏造せず未対応停止する。

根拠：[C-Standard] 7.21.6.1 の c 変換、[CPP-Standard] のCライブラリ継承。

### R7-45（P2）double.TryParse がJS Numberの文法で真偽を決める

対象：C#。上記の共通手順で次を実行する。

```text
using System;
class Program {
 static void Main() {
  double x;
  Console.WriteLine(double.TryParse("0x10",out x));
  Console.WriteLine(x);
 }
}
```

実際：0x10：アプリ True/16、実 .NET False/0。文字列だけを変えて NaN：アプリ False/0、実物 True/NaN。1,000：アプリ False/0、Windows実物 True/1000。

期待：TryParse(String,out Double) の規則・カルチャーを明示して適用する。未対応の書式は false と偽装しない。

根拠：[NET-TryParse]、Windows CI Add-TypeでコンパイルしたC#。

### R7-46（P2）必須ターゲット欠落から undefined の変数・ファイルを作る

対象：Power Automate。上記の共通手順で次を実行する。

```text
{"actions":[{"action":"Display input dialog","value":"ask"},{"action":"Display message","value":"%undefined%"}]}
```

実際：アプリは変数 undefined に入力値を保存し、後続の参照まで成功させる。Read text from file の target 欠落でも同じ。Write text to file の target 欠落は undefined というモデルファイルキーへ書く。

期待：学習用JSONの出力変数・パスが欠落した時点で、実際に不足した項目を名指しして停止する。Set variable だけの必須検査では不十分。

根拠：[PAD-Dialog]、[PAD-File]、アプリの各リファレンス書式。製品エクスポート互換性の主張ではない。

### R7-47（P2）CountRows が文字列の文字数を返す

対象：Power Apps。上記の共通手順で次を実行する。

```text
Notify(Text(CountRows("abc")))
```

実際：アプリ3。

期待：テーブル引数の型エラー／未対応として停止する。文字列長をレコード数として返さない。

根拠：[FX-Count]。一般的型推論の未対応を理由に、既知の型違いを正常値へ変えてよいことにはならない。

### R7-48（P2）Filter／LookUp だけがテキスト false を真にする

対象：Power Apps。上記の共通手順で次を実行する。

```text
Set(R,Filter(Table({x:1}),"false"));
Notify(Text(CountRows(R)))
```

実際：アプリ1。if等の条件用変換では同じ "false" を偽として扱う。

期待：この入力を型エラーとするなら明示停止し、テキスト条件変換を対応すると宣言するなら偽として扱う。どちらでも行を無条件採用してはならない。

根拠：[FX-Filter]、DEVELOPMENT.md の条件位置のテキスト変換の宣言。rowEval後の table.filter がJS真偽値を直接使う。

### R7-49（P2）変換可能な Value の入力を変換不能と断定する

対象：Power Apps。上記の共通手順で次を実行する。

```text
Notify(Text(Value("10%")))
Notify(Text(Value("1e3")))
```

実際：単独実行でどちらも「Value：数値へ変換できません」のエラー。

期待：実Power Fxのen-USでは0.1、1000。部分モデルで未実装なら、対応外の数値書式であることを正直に表示する。

根拠：[FX-Value]。

### R7-50（P2）形式が部分的に壊れた保存データを原文退避せず上書きする

対象：共通UI／保存。上記の共通手順で次を実行する。

```text
localStorage.setItem("programming-practice-v3", JSON.stringify({active:"vba",drafts:{vba:{code:{broken:true}}}}));
location.reload();
```

実際：エディタが [object Object]。保存領域の code もこの文字列へ自動上書きされ、recovery は作られず、保存異常の表示もない。drafts.vba が文字列のケースも文字添字のプロパティへ分解される。

期待：コード・下書き項目の型まで検証し、壊れた原文を保全して通知する。構文的に壊れたJSONを recovery に保存する経路は確認済みだが、部分的な型破損が漏れている。

根拠：[Web-Storage] と DEVELOPMENT.md の下書き保全宣言、Chromium実測。

### R7-51（P3）自動実行の用語定義がAutoHotkey v1型になっている

対象：AutoHotkey v2 用語集。上記の共通手順で次を実行する。

```text
^!n:: {
 MsgBox "event"
}
x := 7
MsgBox x
```

実際：用語集は「ホットキーなどの定義が始まるまでが自動実行部分」と説明。実装は event=null でも下側の x=7、MsgBox x を実行する。

期待：v2では定義を読み飛ばし、停止命令／ファイル末尾までトップレベルの実行が続くと説明する。実装の挙動はこの点で正しい。

根拠：[AHK-Scripts] の Startup/auto-execute、[AHK-Objects] と同じ公式v2資料。

### R7-52（P3）前置インクリメントの対応がリファレンスへ反映されていない

対象：PowerShell リファレンス。上記の共通手順で次を実行する。

```text
$x=1
++$x
```

実際：実装は2を返し、DEVELOPMENT.md も前置・後置対応を宣言する。リファレンス「算術・代入演算子」は後置だけの書式・説明で、前置の項目も範囲外宣言もない。

期待：同項目へ前置の書式と式の値の違いを掲載する。

根拠：[PS-Arithmetic]、実装の pre/post と DEVELOPMENT.md。

### R7-53（P3）実装済み $Matches にリファレンス項目がない

対象：PowerShell リファレンス。上記の共通手順で次を実行する。

```text
'a' -match '(a)'
$Matches[1]
```

実際：実装はキャプチャを保持するが、45件の項目に Matches がない。「比較演算子」の説明にも更新・保持・配列左辺の例外がない。範囲外宣言もない。

期待：独立項目または束ね項目の明示的な構成要素として説明し、使用中ビューからも参照できるようにする。

根拠：[PS-Auto]、[PS-Compare]。

### R7-54（P3）BigInt の対応宣言が同一文書内で矛盾する

対象：JavaScript／DEVELOPMENT.md。上記の共通手順で次を実行する。

```text
console.log(1n+2n);
```

実際：実装は3n。DEVELOPMENT.md冒頭の種類表はBigIntを未対応欄に含め、後段の修正節は対応済みとする。

期待：現在の対応表を実装・後段の確定宣言に合わせる。古い制限を現在の未対応欄へ残さない。

根拠：[ECMA-BigInt]、DEVELOPMENT.md の種類表とMuse修正バッチ節。指摘一覧は参照していない。

### R7-55（P3）条件式では必ず == という教材説明が広すぎる

対象：ImageJ テンプレート ij-1。上記の共通手順で次を実行する。

```text
if (1 < 2) { print("ok"); }
```

実際：このコードは実装でも実ImageJでも正しく動く。一方、教材解説末尾は「条件の中では必ず == を使います」と断定する。

期待：「等しいかどうかの比較には ==」と限定する。大小比較や論理条件まで否定する文にしない。

根拠：[IJ-Functions] と公式 [IJ-Language] の条件・演算子。

### R7-56（P3）教材に現れる概念語の用語集未収載（15種類）

再現：種類を選ぶ→下表の教材を開いて該当語を確認→用語集ビューの全項目を確認する。検索による単なる表記違いではなく、当該概念を説明する項目がない。期待：ユーザー指定の観点5に従い、教材で前提にする概念を用語集に加えるか、既存の束ね項目から明示的に説明する。関数リファレンスがあることと、概念の定義が用語集にあることは区別する。

| 種類 | 教材・掲載語の例 | 未収載の概念 | 一次情報・根拠 |
|---|---|---|---|
| Excel VBA | array「配列・添字とエラー」 | 添字 | [VBA-Array] の添字による要素参照 |
| ImageJ | ij-9「チャンネル分割」 | チャンネル | [IJ-Functions] のStack/getDimensions |
| CloudFormation | cfn-local「兄弟要素」 | 兄弟要素のスコープ | AWS公式Fn::Transform（下記） |
| Power Automate | pa-counter「回数ループ」 | ループ | Microsoft Learn Desktop Loops（下記） |
| AutoHotkey | ahk-hotkey のモデルevent | イベント | [AHK-Scripts] の起動後のイベント実行 |
| UI.Vision | ui-loop「Sandbox」 | サンドボックス | UI.Vision公式executeScript_Sandbox（下記） |
| Power Apps | fx-state のbindings・表示数式 | 表示数式・再計算 | Microsoft Learn Power Fx概要（下記） |
| Python | tpl-list-loop 解説 | 内包表記 | [PY-Types] とPython公式チュートリアルのList Comprehensions |
| R | r-index | 添字 | R公式Extract（下記） |
| C | c-array の添字0 | 添字 | [C-Standard] 6.5.2.1 |
| C++ | cpp-array の添字0 | 添字 | [CPP-Standard] expr.sub |
| C# | csharp-error | 例外 | Microsoft Learn C#例外処理（下記） |
| JavaScript | js-scope「巻き上げ」 | 巻き上げ | ECMAScriptの宣言初期化規則 [ECMA-Decl] |
| cmd | cmd-subroutine | サブルーチン | Microsoft Learn call（下記） |
| PowerShell | ps-values「ハッシュテーブル」 | ハッシュテーブル | PowerShell公式about_Hash_Tables（下記） |

本件は、全単語を無制限に項目化する提案ではなく、教材の主題・説明に直接登場する概念を対象にした未収載の検出である。既存項目の定義誤りはR7-51、リファレンスの漏れ・誤りはR7-15/24/34/40/52/53等を別に記録した。

## 種類別の全件実行結果と、確認済み・なしの範囲

次表の「なし」は限定した確認に対する結果。資料の全項目照合や任意入力の完全互換性について、欠陥なしと宣言するものではない。

| 種類 | テンプレート | リファレンス | 対応例の新たな停止 | 独立再現・文面の結果 |
|---|---:|---:|---|---|
| vba | 8 | 90 | 確認済み・なし | R7-34/35/56 |
| imagej | 10 | 200 | 確認済み・なし | R7-29〜33/55/56 |
| cloudformation | 6 | 171 | 確認済み・なし | 委譲PythonのR7-17〜20、用語R7-56 |
| powerautomate | 6 | 15 | 確認済み・なし | R7-46/56 |
| autohotkey | 6 | 26 | 確認済み・なし | R7-40〜42/51/56 |
| uivision | 6 | 22 | 確認済み・なし | 既定モデルの22リファレンス例・6教材の動作に追加欠陥なし。用語R7-56 |
| powerapps | 6 | 28 | 確認済み・なし | R7-47〜49/56 |
| python | 10 | 160 | 確認済み・なし | R7-17〜20/56 |
| r | 6 | 44 | 確認済み・なし | R7-21〜28/56 |
| c | 6 | 26 | 確認済み・なし | R7-43/44/56 |
| cpp | 6 | 31 | 確認済み・なし | 共通実装のR7-44、用語R7-56 |
| csharp | 6 | 53 | 確認済み・なし | R7-45/56 |
| javascript | 6 | 39 | 確認済み・なし | R7-36〜39/54/56 |
| cmd | 8 | 28 | 確認済み・なし | R7-01〜03/56、連結echoの実測は前記 |
| powershell | 8 | 45 | 確認済み・なし | R7-04〜16/52/53/56 |


共通の確認済み・なし：120表示の横はみ出し、可視フォーム部品のラベル欠落、容量超過時に保存成功と誤表示する挙動、全104テンプレートの単独実行における新たな想定外停止。データ型破損時の原文喪失はR7-50のため「なし」ではない。全停止メッセージを検証し終えたという意味ではない。

### 表示・性能の実測

全教材・参照専用も含む全例の独自Node実行で、各種類の最長の単例時間は次のとおり。これは列挙した通常の教材例の最大値であり、任意入力を含む大域的な最悪時間ではない。

| 種類 | 最長単例 ms |
|---|---:|
| vba | 15.703 |
| imagej | 15.354 |
| cloudformation | 34.255 |
| powerautomate | 3.995 |
| autohotkey | 13.975 |
| uivision | 1.432 |
| powerapps | 2.205 |
| python | 3.166 |
| r | 3.710 |
| c | 7.645 |
| cpp | 0.873 |
| csharp | 1.682 |
| javascript | 1.979 |
| cmd | 5.316 |
| powershell | 12.773 |


Windowsの重い入力の実測はR7-14。8秒の親プロセス停止を「8秒で内部予算が作動した」とは扱わない。ブラウザ外側のWorker監視は2,500 msで、CPU負荷・タイマー配送を含む厳密な壁時計保証ではない。

## 観点1〜8の進捗・残り（範囲は削除しない）

| 観点 | 今回の確認 | 未完了・次に必要な作業 |
|---|---|---|
| 1 一次情報との照合 | 上記の公式資料と実物による個別再現。全15種類を対象に実装・教材・定義を読み、Windows cmdの個別依頼も実測 | 15種類の全対応構文・全関数についての項目単位の一次情報照合。特にCloudFormation/PAD/UI.Visionの全分岐、Excel実物との差分 |
| 2 宣言との一致 | DEVELOPMENT.mdを照合し、PS右辺配列とJS BigInt等を検出 | 全エンジンの受理分岐を宣言へ対応付けた完全な双方向台帳 |
| 3 経路・表示・状態 | 既存テスト、全テンプレートの実行、UIの切替と表示、複数言語で値・分岐の誤りを再現 | 全未知条件の制約・相互矛盾・到達不能パス、全下書き/テンプレート間の組合せ、マルチタブ同時更新競合の全経路 |
| 4 新規2種類 | 遠慮なくR7-01〜16を検出。Windows実出力を保存。cmd連結形の回答を記載 | 全コマンドのオプション・展開・FS操作の組合せをWindowsの明示的なテスト表で継続 |
| 5 完全性・正確性 | 全978項目を列挙し、全例を実行。全用語集を読み、文面誤り・漏れを記載 | 全978項目の書式/説明/期待出力を一次情報と1件ずつ照合し終えたわけではない。実装→項目/除外宣言の全関数対応表、全ビューの文面一致も未完了 |
| 6 関数の境界・異常・組合せ | Python1,112、R261、ImageJ205等の独自行列。0/1/-1/空/Null相当/型違い/過不足/入れ子/条件/パイプラインの再現を記録 | 各種類の各関数に対する指定された全カテゴリの埋まりを検証する残りのケース。今回の有限行列を全組合せ網羅とは呼ばない |
| 7 104教材・全エラー | 104件の全タイトル/解説/コードを読み、単独実行・UI選択実行。リファレンス例の全実行。誤ったエラー理由も記録 | 全104教材の主張の実製品での検証、各エンジンの全エラー発火点ごとの理由照合。現在は一部実物未実施 |
| 8 文面・a11y・破損・性能 | 日本語・用語集の誤り、型破損、容量超過、120表示、ラベル・キーボード退出、Windows性能 | スクリーンリーダー実機、Safari/Firefox/iOS、全フォーカス遷移、PWA障害時全経路、最悪ケース探索の継続 |

### 現環境で未実施となった理由

- Excel／Power Apps／Power Automate Desktop／実AWS／実UI.Visionの製品セッションには接続していない。Microsoft Learn・AWS・製品公式資料および明示モデルを照合したが、実Excelや実クラウド操作の出力を作って記載してはいない。
- ローカルdotnet CLIはないため、既存のC#全59教材/参照例と追加3ケースのネイティブスイートは今回未実施。Windows CIは利用できるため、これは永続的な実施不能ではなく残作業。Windows Add-TypeによるTryParseの再現を、この全件スイートの代わりの完了証明にしない。
- ImageJの対話ダイアログ・実画像処理全般は未実施。pure macroのエラーはheadlessだとエラーダイアログ自体でHeadlessExceptionになるため、公式1.54pソースのエラー分岐とも突き合わせた。制御用InterpreterのignoreErrorsによる「エラー後の出力」は、成功出力として採用していない。
- 使用できるブラウザ実機はChromiumのみ。スクリーンリーダーやiOS実機の検証結果はない。
- ツールの回数・使用量制限通知は受けていない。リセット権は使っていない。未完了は制限に達したという報告ではなく、この節目時点の作業範囲の明示である。リセット時刻は通知されていないため推測しない。

全種類・観点1〜8は継続対象のまま保持する。本書を完成監査や「残り欠陥なし」の根拠に使わない。

## 一次情報リンク

以下は本報告の個別主張の根拠。公式文書・公式ソース・標準化委員会ドラフトを使用し、C/C++の第三者リファレンスだけを根拠にはしていない。

[CMD-set]: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/set_1
[CMD-cmd]: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd
[CMD-if]: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/if
[CMD-echo]: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/echo
[PS-Compare]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comparison_operators?view=powershell-7.4
[PS-Null]: https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-null?view=powershell-7.4
[PS-Binding]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parameter_binding?view=powershell-7.4
[PS-Auto]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-7.4
[PS-Select]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-object?view=powershell-7.4
[PS-Output]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-output?view=powershell-7.4
[PS-Conversion]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_type_conversion?view=powershell-7.4
[PS-Sort]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/sort-object?view=powershell-7.4
[PS-Arithmetic]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_arithmetic_operators?view=powershell-7.4
[PS-Content]: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content?view=powershell-7.4
[NET-Extension]: https://learn.microsoft.com/en-us/dotnet/api/system.io.path.getextension?view=net-8.0
[PY-Functions]: https://docs.python.org/3.12/library/functions.html
[PY-Types]: https://docs.python.org/3.12/library/stdtypes.html
[R-seq]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/seq.html
[R-length]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/length.html
[R-NA]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/NA.html
[R-mean]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/mean.html
[R-median]: https://stat.ethz.ch/R-manual/R-devel/library/stats/html/median.html
[R-numeric]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/numeric.html
[R-character]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/character.html
[R-frame]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/data.frame.html
[R-match]: https://stat.ethz.ch/R-manual/R-devel/library/base/html/match.html
[IJ-Functions]: https://imagej.net/ij/developer/macro/functions.html
[IJ-Source]: https://github.com/imagej/ImageJ/blob/v1.54p/ij/macro/Functions.java
[IJ-Language]: https://imagej.net/ij/developer/macro/macros.html
[VBA-Len]: https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/len-function
[VBA-Long]: https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/long-data-type
[ECMA-Math]: https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math-object
[ECMA-JSON]: https://tc39.es/ecma262/multipage/structured-data.html#sec-json.stringify
[ECMA-BigInt]: https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-bigint-type
[DOM]: https://dom.spec.whatwg.org/
[AHK-Objects]: https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/Objects.htm#L532
[AHK-StrLen]: https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/StrLen.htm
[AHK-Boolean]: https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/Concepts.htm
[AHK-IsSet]: https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/IsSet.htm
[AHK-Scripts]: https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/Scripts.htm#L36
[C-Standard]: https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf
[CPP-Standard]: https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4659.pdf
[NET-TryParse]: https://learn.microsoft.com/en-us/dotnet/api/system.double.tryparse?view=net-8.0
[PAD-Dialog]: https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/display
[PAD-File]: https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/file
[FX-Count]: https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-table-counts
[FX-Filter]: https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-filter-lookup
[FX-Value]: https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-value
[Web-Storage]: https://html.spec.whatwg.org/multipage/webstorage.html
[ECMA-Decl]: https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-globaldeclarationinstantiation
[VBA-Array]: https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/array-function


用語集の追加根拠：

- [AWS Fn::Transform](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-transform.html)
- [PAD Loops](https://learn.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/loops)
- [UI.Vision executeScript](https://ui.vision/rpa/docs/selenium-ide/executescript)
- [Power Fx overview](https://learn.microsoft.com/en-us/power-platform/power-fx/overview)
- [Python List Comprehensions](https://docs.python.org/3.12/tutorial/datastructures.html#list-comprehensions)
- [R Extract](https://stat.ethz.ch/R-manual/R-devel/library/base/html/Extract.html)
- [C# exception handling](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/exception-handling)
- [cmd call](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/call)
- [PowerShell Hash Tables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_hash_tables?view=powershell-7.4)


## 節目2で追加した検証と既報への追記

### Windows・実ランタイム

監査ブランチのスクリプトは製品のソースを変更せずに実シェル／コンパイラを起動するもの。結果が期待どおりのエラーでも記録を継続し、CI successを全ケースの一致と読み替えていない。

- [Windowsシェル追加実測：run 43721812095](https://github.com/sylpica/programming-practice/actions/runs/43721812095)：cmd 85件（8教材＋28参照例＋49追加）、PowerShell 79件（8教材＋45参照例＋26追加）、計164件、各ケースのタイムアウト0。PowerShellはダウンロードした7.4.6を明示して起動した。
- [Windows C#全教材・参照例と境界値：run 43722002319](https://github.com/sylpica/programming-practice/actions/runs/43722002319)：59教材／参照例＋38境界ケース＝97件、タイムアウト0。59教材／参照例は全てコンパイル成功。配列範囲外の教材は意図どおりIndexOutOfRangeException。追加では負の定数配列長と暗黙縮小変換の2件がコンパイルエラー、null.Lengthとcheckedオーバーフローは実行時例外。これらをスイートの異常終了ではなく実言語の結果として記録した。ターゲットはnet8.0。
- Linux：公式.NET SDK 8.0.408を作業用ディレクトリに展開し、同じC#97件を実行。別に数値型12×12の全144組を実コンパイルした。前回「CLI不在で未実施」だった59例はこれにより未実施ではなくなった。任意のC#コード全体を検証済みという意味ではない。
- Power Fx：公式NuGetのMicrosoft.PowerFx.Interpreter 1.3.1を.NET 8のRecalcEngineから起動し、89式をCheck／Eval。Canvas／Power Apps製品セッションとは区別する。単一列テーブルのToObject表現とアプリのレコード配列表現の違いは、そのまま欠陥に数えていない。ForAllのBlank行についてもSDKのオブジェクト表現の差だけで新規欠陥とは判定していない。
- JavaScript：Number／String／Boolean／parseInt／Math.abs・floor・round／JSON.stringifyとpush／pop／joinの260ケースをNode実物と照合。空引数、0、1、−1、空文字列、null、undefined、空配列、配列、オブジェクト、非数、非有限値、大きな値、余分な引数を含む。別にDOM関連10ケースを空のChromium 156ページと照合した。260件は当該関数群の入力表であり、DOMやJavaScript全構文の網羅完了ではない。

今回のWindows監査スクリプト準備の失敗も隠さず記録する。

1. [run 43721686567](https://github.com/sylpica/programming-practice/actions/runs/43721686567)：cmd途中の日本語ケース名のログ書出しでPython既定cp1252がUnicodeEncodeError。製品の失敗として数えていない。
2. run 43721812095：シェル164件は完了したが、続くC#用JSONの既定cp1252読込でUnicodeDecodeError。したがってジョブ全体はfailure。シェル結果のRESULT_JSON_START／END内のJSONは最後まで出力されている。
3. run 43722002319：C#データのUTF-8明示後に97件完了、ジョブsuccess。[監査用スクリプトの固定コミット](https://github.com/sylpica/programming-practice/tree/bc11210/audit-probes/step2)。失敗したジョブを全検証成功と記載しない。

Windowsの追加シェルケースは毎回別の一時フォルダを使う。追加FSケースではnotes.txt／empty.txt／lines.txt／logs/nested.txt、教材例では既定モデル相当のnotes.txt／data.csv／readme.txt／logsを用意した。cmdのprobe.cmd自身の列挙、絶対パスのルート、OS列挙順、copy/moveのロケール依存件数メッセージ、Read-Hostの入力エコーはモデルとの差分から除いた。未知の入力候補の全分岐を1回の実シェル入力に一致させようとはしていない。

### 既報の追加確認（新しい指摘件数には含めない）

- **R7-16**：Windows 7.4.6で `$file=New-Item -Path ".hidden" -ItemType File; $file.Extension` の出力は `.hidden`。前回はFileInfo全体の深いJSON化がタイムアウトしたが、今回はスカラーだけを採って658.8635msで完了した。アプリの空文字列とは不一致。前回のWindows未確定は解消。
- **R7-09**：`1,2,3 | Select-Object -Skip 1 -Last 1` はWindows 7.4.6で2、アプリ3。先にslice(skip)してから末尾を取る処理は、この組合せでも誤る。[Select-Object](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-object?view=powershell-7.4)。
- **R7-02**：`setlocal EnableDelayedExpansion` の後の `set X=a^!b; echo !X!` は実cmdでab、アプリa!b。引用付き `set X="a!b"` でも実物の!は消え、アプリは残る。各文は別行。既報の遅延展開処理の追加再現とし、別件に数えない。
- **R7-37／R7-36に関係する引数欠落**：`console.log(String(JSON.stringify()));` はNode実物でundefined、アプリnull。[ECMAScript JSON.stringify](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.stringify)。replacer／spaceだけでなく引数なしの評価も誤る。既報のJSON処理への追記として扱う。
- **R7-47〜49**：CountRowsへの文字列、Filterの文字列条件、Valueの%／指数表現を公式Power Fx SDKでも照合。Canvas実機と呼び替えない。

### 状態・表示・文面の追加確認

下書きコード保持の実ブラウザ検証は888件、失敗0、pageerror 0。15種類間の全225有向遷移、再読込み後の15種類、各種類内の異なるテンプレート間の全648有向遷移を実行した。各種類に異なる自由下書き、各テンプレートに異なる追記を保存し、戻ったときのコードを比較した。**このコード保持の領域は確認済み・なし。**

モデル値と選択表示を含めた追加実行も888件、失敗0、pageerror 0。テンプレート遷移648件ではVBAのセルA1、他種類のJSONモデルに区別可能な監査値を保存し、戻ったときにコード・モデル入力欄・選択テンプレートを比較した。**この試験でのコード／モデル／選択表示の復元不整合は確認済み・なし。** 同時編集の競合・壊れた下書き・容量超過をこの正常データ試験で合格にしていない。

全15種類の用語集111項目の文面を通読した。既報のAHK自動実行説明以外に今回新たに確定した定義の誤りはないが、全111定義の一次情報照合完了ではない。教材用語の未収載はR7-56を保持し、追加の抜け探索も継続する。リファレンスは実装済みPython属性の漏れとPowerShellの別名誤記を追加した。JavaScript／R／Power Fx／AHKのcall内のリテラル名抽出も補助に使ったが、動的ディスパッチ・基底エンジン・プロパティを含む完全な名簿の代わりにしない。

Windowsでの今回の実シェル起動全体（プロセス起動・監査用投影を含む）の最大はcmd 60.8385ms（typeからfindへのパイプ）、PowerShell 658.8635ms（.hidden作成＋拡張子）だった。これはアプリの実行時間や最悪入力の上限ではない。C#97件のコンパイルの最大17,123.5034msも監査用ビルド時間であり、アプリの性能指標と混同しない。アプリのWindows性能評価は前回の実測・R7-14を保持し、より重い入力探索は継続する。

## 節目2の追加指摘

各指摘の再現はee01f07の固定画面で行う。JSONのフローはコード欄へそのまま貼り付ける。異なる式や異常値はそれぞれ独立に初期化して実行する。範囲外の入力は正しい理由の未対応／未確認停止でも合格とし、黙った正常値・誤った分岐・不正な状態の生成を問題としている。

### R7-57（P2）暗黙の数値変換を許さない変数代入まで受理する

対象：C#。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
using System;
class Program {
    static void Main() {
        int n = 1;
        short x = n;
        Console.WriteLine(x);
    }
}
```

実際：アプリは1を表示して正常終了。Windowsの実コンパイラは CS0266: Cannot implicitly convert type 'int' to 'short'. An explicit conversion exists (are you missing a cast?)。Linux SDK 8.0.408でも同じ。

期待：intの「変数」からshortへの代入にはキャストが必要。定数式 `short x = 1;` が許される規則を変数へ広げない。型変換表どおりにエラー、または未対応として停止する。sbyte／byte／short／ushort／int／uint／long／ulong／float／double／decimal／charの12×12＝144組を各々コンパイルし、実物ではコンパイルエラーなのにアプリが受理する組合せを49通り確認した。49個の独立欠陥へ水増しせず、この型変換検査の欠陥1件として数える。

根拠：[Microsoft Learn：数値変換](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/numeric-conversions)。実装：js/core/c-family.js の代入時変換。Windows再現は後記CIの short variable narrow。

### R7-58（P2）string型のnullをTryParseへ渡す正しい用法をコンパイルエラーにする

対象：C#。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
using System;
class Program {
    static void Main() {
        string s = null;
        int n;
        Console.WriteLine(int.TryParse(s, out n));
        Console.WriteLine(n);
    }
}
```

実際：アプリは「TryParse の第1引数は文字列です」（CompileError）で停止。実Windowsはコンパイル成功、出力は False 改行 0。Linuxでも同じ。

期待：stringオーバーロードへのnull入力は変換失敗のFalseとout値0。誤った型を渡したコンパイルエラーにしない。裸のnullリテラルのオーバーロード解決とは分け、上記のstring変数で再現する。

根拠：[Microsoft Learn：Int32.TryParse(String, Int32)](https://learn.microsoft.com/en-us/dotnet/api/system.int32.tryparse?view=net-8.0)。Windows CIの typed null TryParse。

### R7-59（P3）実装済み数値・range・関数属性に項目も除外宣言もない

対象：Python／CloudFormationの委譲Python。再現：上記共通手順でコードを入力・実行。Pythonはそのまま実行。CloudFormationではhandler内へ同じ文を置き、既定eventをそのまま返す正常なresponseを末尾に付ける。

```text
print((3).real, (3).imag, (3).numerator, (3).denominator)
r = range(1, 5, 2)
print(r.start, r.stop, r.step)
def f(x: int) -> str:
    return str(x)
print(f.__annotations__)
```

実際：アプリは順に 3 0 3 1、1 5 2、{'x': <class 'int'>, 'return': <class 'str'>} を具体的に表示する。一方、Python160項目とCloudFormation171項目の名前・書式・説明・注意・例の全フィールドに real／imag／numerator／denominator／rangeのstart・stop・step／__annotations__ の説明がない。使用中チップもこれらへ解決しない。DEVELOPMENT.mdの明示除外にも含まれない。

期待：公式に存在し実装も値を返す属性は、ユーザー指定の関数・コマンド・変数の完全性監査の対象として束ね項目等で説明するか、意図的除外を宣言する。属性を実装済みと認めながら無記載にしない。

根拠：[Python数値型・range](https://docs.python.org/3.12/library/stdtypes.html)、[関数の属性](https://docs.python.org/3.12/reference/datamodel.html#user-defined-functions)。実装：js/types/python/engine.js:2098以降。DEVELOPMENT.mdの未対応メソッド一覧は照合したが、Muse監査個票は参照していない。

### R7-60（P2）引用した数値風文字列を数値へ変え、値と厳密比較を誤る

対象：UI.Vision。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
{
  "Commands": [
    {
      "Command": "store",
      "Target": "001",
      "Value": "x"
    },
    {
      "Command": "executeScript_Sandbox",
      "Target": "return \"${x}\";",
      "Value": "y"
    },
    {
      "Command": "echo",
      "Target": "${y}"
    }
  ]
}
```

実際：アプリのyは数値1、echoは1。Targetを `return String("${x}");` にしても文字列1。`return "${x}" === "001";` はfalse。

期待：引用内へ展開した文字列001を保持し、上の厳密比較はtrue。Numberを明示した場合との違いを保持するか、未対応として停止する。

根拠：[UI.Vision公式executeScript：引用内の変数展開例とES5の範囲](https://ui.vision/rpa/docs/selenium-ide/executescript)、[ECMAScript文字列](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type)。実装のsemantics.readがuiConditionの文字列用一時変数にもNumber変換を行う。実UI.Vision製品セッションでは未実測。

### R7-61（P2）引数なしString()が空文字列でなくnullという文字列を作る

対象：UI.Vision。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
{"Commands":[
 {"Command":"executeScript_Sandbox","Target":"return String();","Value":"x"},
 {"Command":"echo","Target":"${x}"}
]}
```

実際：アプリは文字列nullを表示する。

期待：ES5でもString()は空文字列。String(null)と区別する。Node実物でも空文字列を確認。

根拠：[ECMAScript Stringコンストラクター](https://tc39.es/ecma262/multipage/text-processing.html#sec-string-constructor-string-value)、[UI.Vision公式のES5 Sandbox宣言](https://ui.vision/rpa/docs/selenium-ide/executescript)。js/types/uivision/index.js のString呼出しが存在しない第1引数をreadし、nullを文字列化する。

### R7-62（P2）引用内の変数を使ったwhile条件が固定文字列に化ける

対象：UI.Vision。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
{
  "Commands": [
    {
      "Command": "store",
      "Target": "2",
      "Value": "x"
    },
    {
      "Command": "while",
      "Target": "\"${x}\" != \"0\""
    },
    {
      "Command": "executeScript_Sandbox",
      "Target": "return Number(${x}) - 1;",
      "Value": "x"
    },
    {
      "Command": "end"
    },
    {
      "Command": "echo",
      "Target": "${x}"
    }
  ]
}
```

実際：アプリはx=-98まで実行し、「ループの代表パス・回数上限」で打ち切る。echoへ到達しない。引用なしの `${x} != 0` にするとx=0で終了する。

期待：引用内も各反復時の変数値を文字列として評価し、2回でx=0、echo 0となる。対応外なら反復前に正直に停止する。上限の表示自体は正直だが、そこへ至る条件評価が誤り。

根拠：[UI.Vision：if/whileもSandbox式で評価](https://ui.vision/rpa/docs/selenium-ide/executescript)。js/types/uivision/index.js のaction-loopだけはuiConditionを通らず、`${x}`を識別子文字列xへ単純置換する。実製品セッションでは未実測。

### R7-63（P2）Tableがテーブル引数を展開せず、スカラーもレコードとして受理する

対象：Power Apps／Power Fx。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
Set(Result, CountRows(Table(Table({x:1},{x:2}))))
```

実際：アプリResult=1。実Microsoft.PowerFx.Interpreter 1.3.1のRecalcEngineは2。`Set(Result, CountRows(Table({x:1},Table({x:2},{x:3}))))` もアプリ2、SDK3。さらに `Set(Result, Table(1,2))` はアプリ[1,2]、SDKは引数の型エラー。

期待：Tableのレコード／テーブル引数からレコードを連結する。スカラー引数を通して存在しない正常なテーブルを作らない。リファレンスの `Table(Record, Record, ...)` だけの書式も、テーブル引数を記載するか部分対応を明記する。

根拠：[Microsoft Learn：Table](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-table)。公式SDKの実行はCanvas実機の検証とは区別する。実装：js/types/powerapps/index.js のcase table。

### R7-64（P2）関数形And／Orが短絡せず不要な式のゼロ除算で停止する

対象：Power Apps／Power Fx。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
Set(Result, And(false, 1/0 = 0))
```

実際：アプリは0で割ることはできませんで停止。公式SDKはfalse。`Set(Result, Or(true, 1/0 = 0))` もアプリ停止、SDK true。

期待：結果が確定した後続式を評価せず、false／trueを返す。リファレンスが関数形と演算子形を同じ意味と説明することとも一致させる。

根拠：[Microsoft Learn：And／Or／Not](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-logicals)、[公式Power Fx実装](https://github.com/microsoft/Power-Fx)。Microsoft.PowerFx.Interpreter 1.3.1で上記2式を実測。アプリはargs.map(get)で先に全引数を評価する。

### R7-65（P2）テーブルをスカラーへ暗黙変換し、型エラーを正常値にする

対象：Power Apps／Power Fx。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
Set(Result, Not(Table()))
```

実際：アプリはfalse。`Set(Result, Sequence(Table()))` は空テーブル、`Set(Result, Text(Table()))` は文字列[]。公式SDKはそれぞれ型エラー（Logical／Number等が必要）となる。

期待：数値・真偽値・文字列に対応する入力型を検査する。テーブルをJSのtruthy、Number([])、文字列化で処理して正常値を捏造しない。

根拠：[論理関数](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-logicals)、[Sequence](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-sequence)、[Text](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-text)。公式SDK1.3.1のCheckで各式の型エラーを確認した。

### R7-66（P2）入力requestIdが未確定だとresponseからの欠落まで見逃す

対象：CloudFormation。再現：上記共通手順でコードを入力・実行。モデルのeventを {"fragment":{}} に置き換える。requestIdを省略するとモデルが正直な未確定値を補う仕様を使う。

```text
def handler(event, context):
    return {"status":"success", "fragment":{}}
```

実際：アプリはエラーも未確認停止もなくresponseを受理する。値が不明であることと、必須キーを返していないことを区別できていない。

期待：responseにrequestIdが存在しないことは入力IDが未確定でも判定可能。必須キー欠落として停止する。具体的なIDの推測は不要。

根拠：[AWS公式：マクロのresponse形式](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html#template-macros-response)。js/types/cloudformation/index.js の比較はevent.requestIdがunknownならキー欠落の検査も飛ばす。実AWS実行では未実測。

### R7-67（P3）存在するstatusの型不正をキー欠落と誤診する

対象：CloudFormation。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
def handler(event, context):
    return {"requestId":event["requestId"], "status":None, "fragment":{}}
```

実際：「レスポンスにstatusが含まれていません」。statusを1またはTrueにしても同じ。いずれもキーは含まれている。

期待：statusの値／型が不正であると説明する。キーの追加だけを直す方向へ誘導しない。

根拠：[AWS公式：statusのresponse契約](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros-author.html)。js/types/cloudformation/index.js は typeof response.status !== string を一律に欠落として表示する。

### R7-68（P2）偽値のFn::Transform指定を削除して正常終了する

対象：CloudFormation。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
{"Resources":{"Fn::Transform":false,"Keep":1}}
```

実際：エラーも未対応表示もなくFn::Transformを消して処理する。falseをnull／0／空文字列にした場合も同じ。

期待：Fn::Transformの存在を判定し、不正な指定ならNameが必要等の正しい理由で停止する。一般的なテンプレート全体の検証ではなく、自身が処理する組込み関数の引数の検査。指定を黙って無かったことにしない。

根拠：[AWS公式：Fn::TransformのName必須構文](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-transform.html)。js/types/cloudformation/index.js は先にbaseからキーを削除し、後で値のtruthyで処理の有無を決める。実AWS実行では未実測。

### R7-69（P2）ワイルドカードと-Recurseの組合せで下位ファイルを列挙しない

対象：PowerShell。再現：上記共通手順でコードを入力・実行。モデルのC:\Practice直下にnotes.txt、empty.txt、lines.txtとlogsフォルダ、logs内にnested.txtを明示する。各ファイル本文は任意の既知文字列。Windowsでは同じ構造を新規の一時フォルダに作り、そこで実行する。

```text
Get-ChildItem -Path "*.txt" -Recurse | Select-Object Name
```

実際：アプリはnotes.txt／empty.txt／lines.txtだけ。実Windows 7.4.6はこの3件とlogs内のnested.txtの4件。実際の列挙順は比較対象から除外した。`.\*.txt` にしても同じ欠落。

期待：ワイルドカードを使う場合にも下位フォルダを再帰探索する。再現できない組合せなら停止する。リファレンスとDEVELOPMENT.mdの-Recurse対応宣言の範囲内。

根拠：[Microsoft Learn：Get-ChildItem](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem?view=powershell-7.4)、実Windowsの該当ケース（values内にName:nested.txt）。実装はentryがdirectoryのときだけ再帰し、パターン指定時はlistFilesの直下結果で終了する。

### R7-70（P2）空ファイルのGet-Content -Rawを空文字列としnull比較を誤る

対象：PowerShell。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
Set-Content out.txt $null
(Get-Content out.txt -Raw) -eq $null
```

実際：アプリはFalse。実Windows 7.4.6はTrue。

期待：空ファイルの実際の読み取り結果を再現し、後続のnull判定を変えない。Set-Contentが空ファイルを作ること自体は誤りと数えない。原因はget-contentのraw分岐が空本文も常に1個の空文字列として返すこと。

根拠：[Microsoft Learn：Get-Content](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content?view=powershell-7.4)、[Set-Content](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-content?view=powershell-7.4)。実Windowsは標準化した出力 {"values":[true],"error":null}。

### R7-71（P2）CR単独の改行を行境界として読まない

対象：PowerShell。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
"a`rb`nc`r`nd" | Set-Content out.txt
@(Get-Content out.txt).Count
```

実際：アプリ3、実Windows 7.4.6は4。

期待：CR、LF、CRLFの実物の行分割に合わせるか、未対応の改行形式として停止する。本文中のCRを前の行へ残し、行数を過小にしない。

根拠：[Microsoft Learn：Get-Contentの行単位出力](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content?view=powershell-7.4)、実Windows values:[4]。js/types/powershell/engine.js はCRLFだけをLFへ変換し、LFでsplitする。

### R7-72（P2）引数なしSet-Locationがホームへ移らず現在フォルダに留まる

対象：PowerShell。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
Set-Location
(Get-Location).Path
```

実際：アプリはC:\Practice。実Windows 7.4.6では一時作業フォルダから C:\Users\runneradmin へ移動した。

期待：Path省略時は現在ユーザーのホームを使う。モデルにホームがないなら未確認／未対応として正直に停止し、現在フォルダと同じだと決めない。

根拠：[Microsoft Learn：Set-Location -Pathの既定値](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location?view=powershell-7.4)。実Windows values:["C:\\Users\\runneradmin"]。アプリはp(path,0,s.model.cwd)を用いている。

### R7-73（P2）存在しないプロパティの測定結果オブジェクトを捏造する

対象：PowerShell。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
1,2,3 | Measure-Object -Property NoSuchProperty -Sum
```

実際：アプリは Count:0／Sum:0 等を持つGenericMeasureInfoを1個出力。実Windows 7.4.6は成功ストリームに何も出さない（values:[]、error:null）。

期待：存在しないプロパティから測定結果オブジェクトを作らない。実物と同じ出力数、または未対応停止にする。後続の@(...).CountやForEachの回数を変えない。

根拠：[Microsoft Learn：Measure-ObjectとProperty](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/measure-object?view=powershell-7.4)、実Windows該当ケース。実装は全プロパティが欠落していても最後にobject(props)を必ず返す。

### R7-74（P2）Select-Objectのプロパティパターンを文字通りの名前として作る

対象：PowerShell。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
1,2 | Select-Object -Property "NoSuch*"
```

実際：アプリは `NoSuch* : $null` というプロパティを各オブジェクトに作る。実Windows 7.4.6は各々空のPSCustomObjectで、NoSuch*というプロパティは存在しない。監査出力のNativeTypeは空オブジェクトを示す監査用の印であり、実物のプロパティではない。

期待：Propertyのワイルドカードを展開するか、その形式を未対応として停止する。実物にない名前のプロパティを捏造しない。

根拠：[Microsoft Learn：Select-Object -Property](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-object?view=powershell-7.4)。実Windowsの安全な投影結果とアプリのobject(Object.fromEntries)を照合。

### R7-75（P2）PowerShell 7.4にはないscをSet-Contentの標準別名として教える

対象：PowerShellのリファレンス／実装。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
sc out.txt "Hello"
Get-Content out.txt
```

実際：アプリはSet-Contentとしてファイルを作りHelloを出力する。リファレンスにも「別名scでも同じ処理」とある。しかしWindowsの固定したPowerShell 7.4.6で `Get-Alias sc -ErrorAction SilentlyContinue | Select-Object Name,Definition` は出力なし（values:[]）。

期待：この教材が対象とするPowerShell 7.4の標準別名としてscを教えない。Windows PowerShell 5.1等との版差、ユーザー定義の別名の有無を区別する。Windows上のsc.exeの実行結果まで、このGet-Alias検証で確認したとは主張しない。

根拠：[Microsoft Learn：Set-Content、対象7.4](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-content?view=powershell-7.4)、[Get-Alias](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-alias?view=powershell-7.4)、実Windows 7.4.6でのGet-Alias照合。

### R7-76（P2）createElementの引数欠落・不正名から存在しない要素を作る

対象：JavaScript／DOM。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
console.log(document.createElement().tagName);
```

実際：アプリはNULL。実ChromiumはTypeError: 1 argument required, but only 0 present。`document.createElement("a b").tagName` はアプリA B、実物InvalidCharacterError。数値1もアプリ1、実物InvalidCharacterError。

期待：必須引数の有無と要素名の妥当性を検査し、エラーまたは未対応停止にする。`createElement(null)` が実物でもNULL要素を作るケースとは区別して検証した。

根拠：[WHATWG DOM：createElement](https://dom.spec.whatwg.org/#dom-document-createelement)、[Web IDL呼出し規則](https://webidl.spec.whatwg.org/#es-operations)。Chromium 156の別の空ページで同じ式を実行した。実装は第1引数をString化してtagNameを返すだけ。

### R7-77（P2）getElementByIdの引数欠落を通常の未発見nullにする

対象：JavaScript／DOM。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
console.log(document.getElementById());
```

実際：アプリはnull。実ChromiumはTypeError: 1 argument required, but only 0 present。

期待：存在しないIDを指定した結果のnullと、必須引数欠落を区別して停止する。未発見の正常分岐へ流さない。

根拠：[WHATWG DOM：getElementById](https://dom.spec.whatwg.org/#dom-nonelementparentnode-getelementbyid)、[Web IDL](https://webidl.spec.whatwg.org/#es-operations)。Chromium 156の実測。

### R7-78（P2）appendChildが非Nodeと循環した親子関係を正常に作る

対象：JavaScript／DOM。再現：上記共通手順でコードを入力・実行。既定モデルを使用する。

```text
let a = document.createElement("div");
let b = {};
a.appendChild(b);
```

実際：アプリは空の一般オブジェクトbを子として受理する。実ChromiumはTypeError: parameter 1 is not of type Node。`let a={}; let b={}; a.appendChild(b);` もアプリ正常、実物はa.appendChild is not a function。`let a=document.createElement("div"); a.appendChild(a);` ではアプリが自己循環を作り、実物はHierarchyRequestError。

期待：レシーバーと子がNodeであること、親子関係の妥当性を検査する。扱えない関係は停止し、実DOMに存在し得ない状態を作らない。既報R7-38の「正常なNodeを別の親へ移すと元の親から外れない」とは再現入力・必要な検査が異なる。

根拠：[WHATWG DOM：pre-insert validityとappend](https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity)、Chromium 156の実測。実装は一般のobjectならchildren配列へpushする。

## 節目2の残作業台帳

前回から対象範囲を減らしていない。以下は全て継続対象。例を全件実行したことと、書式・説明・出力・実装の全経路の一次情報照合が完了したことを区別する。

| 種類 | 教材／参照 | この節目までの主な証拠 | 未了として保持する作業 |
|---|---:|---|---|
| VBA | 8／90 | 全例実行、Lenの独立再現、文面・ブラウザ遷移 | 90項目の全署名・境界値・型・表示と公式資料の全対応、実Excel照合 |
| ImageJ | 10／200 | 全例実行、205独自ケース、公式1.54pソース、用語通読 | 全200項目の説明・実装名との対応、pure macroと画像・ダイアログ全経路 |
| CloudFormation | 6／171 | AWS event／response／Transformスコープ照合、今回3件、Python委譲 | 全11固有項目＋160委譲項目の完全対応、全入れ子・分岐・停止理由、実AWS |
| PAD | 6／15 | 全例、モデルアクション、下書き遷移、既報の捏造再現 | 全15アクションの全引数・引用・ループ・エラー理由、実PAD |
| AutoHotkey | 6／26 | 全例、Windows 2.0.19、A_*集約宣言、用語通読 | 110変数の全値／未確定性、全関数の境界・型・省略引数・全イベント |
| UI.Vision | 6／22 | 全例、公式ES5宣言と今回の文字列・while再現 | 全22項目の全引数、例外無視・要素操作・未確定分岐、実拡張 |
| Power Apps | 6／28 | 全例、公式SDK89式、今回Table／論理／型検査 | 全28関数の全入力行列、状態更新・表示数式・既定値・全ビュー、実Canvas |
| Python | 10／160 | 全例、初期86＋1,112独自入力、今回属性漏れ | 実装名と除外宣言の完全突合、全関数の全引数・キーワード・組合せ |
| R | 6／44 | 全例、R 4.2.2で261入力、用語通読 | 全44関数の全境界・引数束縛・NA/NaN/NULL・表示・一次情報照合 |
| C | 6／26 | 全例、gccオラクル、C標準ドラフト、状態遷移 | 全型・変換・未定義動作／未対応停止・printf書式・全参照項目 |
| C++ | 6／31 | 全例、g++オラクル、C++標準ドラフト、状態遷移 | 全型・オーバーロード・参照／文字列・全参照項目 |
| C# | 6／53 | 全59例と追加38をLinux／Windows、全144数値変換 | 配列・参照・メソッド・入力・書式等の残る全引数行列、全項目文面 |
| JavaScript | 6／39 | 全例、260関数／メソッド入力、DOM10実測 | 残るDOM状態・言語構文・未確定制約・全39項目の一次情報と表示 |
| cmd | 8／28 | 全36例＋49独自ケースをWindows、個別echo実測 | 全28項目と実装名・展開の全段階・ワイルドカード・制御／エラー理由 |
| PowerShell | 8／45 | 全53例＋26独自ケースをWindows 7.4.6、既報の比較等 | 全45項目の全パラメーター・型・省略・列挙・パイプライン組合せ |

共通：全104教材のタイトル・説明・期待動作の一次情報全照合、978参照項目の書式・説明・期待出力の全照合、全実装関数・コマンド・変数とリファレンス／範囲外宣言の双方向対応、用語の未収載・ビュー間矛盾、全エラー原因の再現、分岐とパス制約の健全性、破損保存の全形・同時編集・PWA・フォーカス遷移、より重い入力の性能探索が残る。正常データの遷移試験が合格でも、R7-50の型破損による原文喪失は解消していない。

現環境での制約：Excel、実Power Apps／PAD、実AWS、実UI.Visionの製品セッション、スクリーンリーダー・iOS・Safari・Firefox実機は使用できていない。公式文書・公式SDK・標準・製品ソースや明示モデルで照合した部分は、それぞれの証拠の種類を記した。ImageJのGUI／実画像処理の全経路も未実施。Windows CIと.NET CLIは現在利用でき、C#全59例を「実施不能」のまま放置してはいない。

PADの引用内変数とLoop conditionの追加候補も保持しているが、実製品の式構文・モデル表記との対応が未確定なので、この節目では確定欠陥に数えない。SDKの表現差や監査スクリプトの失敗を欠陥件数へ足していない。

使用量／回数制限の通知は受けていない。リセット権は使っておらず、リセット時刻の通知もない。未完了を制限到達と偽って報告しない。引き続き全範囲を保持して監査する。


## 節目3の検証範囲・証拠

- **R追加138入力**を実R 4.2.2と比較。名前付き引数、data.frameを各関数へ渡す場合、NA／NaN／Inf、空集合、rep／seqの引数優先・小数変換等を追加した。JSONでNaN／Infがnullになる差は、そのまま欠陥にしていない。さらに乱数／入力関数の不正入力5件を照合。
- **ImageJ全200参照名×0／8引数の400入力**を実装で実行し、エラー表示と後続出力の矛盾を確認した。これは関数ごとの正しい引数全てを確認した試験ではない。別にpure macro等11ケースを公式ImageJ 1.54p／OpenJDK 21で実行した。初めのignoreErrorsを有効にした比較は、エラー後の出力を成功と誤認しないよう、同じケースを通常のエラー処理で再実行した。headlessでエラーUIがHeadlessExceptionとなるケースはgetErrorMessageと公式Functions.javaの該当分岐を併用した。GUI画像処理全体を実測したとは呼ばない。
- **C/C++追加45ケース**をgcc／g++ 14.2.0、C17／C++17、pedantic-errorsでコンパイルし、コンパイル成功の安全なケースは実行。absの引数とprintfとの入れ子、getlineの代入先等を比較した。実言語のコンパイル失敗を合格や任意出力へ読み替えない。
- **VBA追加436入力**（27呼出し関数×16入力＋4ケース）を実装で実行。Microsoft LearnのVBA資料、MS-VBALの該当事項を照合した。Val／IsNumericの32ケースは.NET 8のMicrosoft.VisualBasicで補助比較したが、**Visual Basic .NETの結果を実Excel VBAの実測とはしていない**。Left等の小数引数や、公式情報間で他入力型の記述に差のある箇所は、補助比較だけで全てを確定欠陥にしていない。
- **VBAの実装名からの漏れ確認**：evalExprのid／member／callを読み、実装済み27呼出し関数、括弧なし10組込み、Empty／Null／Nothing／True／False／vbCrLf／vbTabの7定数、Rangeの5プロパティとErr.Numberの計6プロパティを90参照項目へ照合。この列挙範囲の項目漏れは**確認済み・なし**。未知の一般メソッドは未対応停止で、実装済み名と誤認していない。書式・説明・全引数・全構文の正確性の合格を意味しない。
- **実ブラウザ4再現**：ImageJの静的エラー後にLog 1／Log AFTERが表示されること、Rのsumが0、rep(NULL)がc()、VBAのReplace(Null,...)がNullと表示されることをChromiumで確認。APIだけの値を画面で非表示なら表示欠陥と呼ぶ、という誤りを避けた。新しい下書き・アクセシビリティ全経路の合格とはしない。

### Windowsの性能実測

[Windows CI run 43749028788](https://github.com/sylpica/programming-practice/actions/runs/43749028788)（監査専用ブランチbb434b1、Windows Server 2025・Node 22）。毎回別のNodeプロセスでee01f07のRエンジンを起動し、空の基底ベクトルに対する反復を計測した。外部の4秒タイムアウトは監査側の保護であり、アプリの探索制御による停止とは区別する。

| times | Windowsのsimulate時間 | プロセス起動込みの壁時計 | 結果 |
|---:|---:|---:|---|
| 10,000,000 | 120.1225 ms | 274.5474 ms | 正常に戻るがrep(NULL)の型／表示は誤り |
| 100,000,000 | 1006.9569 ms | 1125.9329 ms | 同上 |
| 1,000,000,000 | 4秒以内に戻らず | 4012.0254 msで外部終了 | エンジン自身の探索上限では止まっていない |

コードはいずれも `a <- rep(c(),times=...,length.out=1)`。Linux Node 24でも10,000,000回122.8226ms、100,000,000回1575.6876ms（戻った後に探索上限）、1,000,000,000回は4秒で外部終了。実Rでは同じ10億回指定が警告とNULLで即時に完了し、system.timeのelapsedは分解能上0秒だった。これは実測した入力集合の最重例であり、任意入力全体の最悪時間や上限値の証明ではない。UIの別のWorker監視による保護がなくなったとは主張しない。

### 既報の補強と保留

- **R7-22**：`rnorm()` は実Rでnが必須、`readline(1,2)` はunused argument (2)だが、アプリはいずれも未確定値として継続。既報の引数数検査の欠陥へ追記し、別件に数えない。既知の負数を受ける乱数関数の意味検査はR7-100で分けた。
- **R7-24**：`sd(c(NaN,1))` も実RはNA、アプリNaN。統計関数のNaN／欠損の扱いの追加再現。R7-25のas.numericによるNaN→NAもベクトル内で再現した。
- **R7-35**：`Len(InputBox("?"),1)` も未確定値の早期returnが引数数検査を迂回する。既知のNullだけの問題ではない。新規件数には含めない。
- `Dialog.`から始まる架空の名前が通る疑いは、ImageJの静的検査が先に未知名を拒否することを確認して棄却した。ソースの接頭辞分岐だけで欠陥を断定していない。
- VBAの小数位置・長さ引数、より広い変換形式、ImageJのGUI専用機能の追加候補は、実機／資料との照合が残る。未確定候補を確定件数へ混ぜない。

## 節目3の追加指摘

各再現はee01f07の固定checkout／固定画面で行う。コードごとに初期化し、同じ指摘中に別の式を挙げた場合も独立に実行する。保存先mainの後続修正を使わない。

### R7-79（P2）sumの名前付き実引数を合計から黙って落とす

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(sum(a=1,b=2))
```

実際：アプリ0、R 4.2.2は3。sum(x=c(1,2,3))も0対6。sum(1,a=2)は1対3。

期待：na.rm以外の...へ渡した数値を名前の有無で落とさず合計する。未対応なら計算前に停止。

根拠：[R公式sum](https://stat.ethz.ch/R-manual/R-devel/library/base/html/sum.html)。実装call内でposだけをflatMapし、namedの数値を捨てる。

### R7-80（P2）存在しない関数が未確定引数を受けると正常扱いになる

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
a <- as.numerci(readline())
print(a)
```

実際：アプリは「as.numerciの引数による」という未確定値を作って継続。実Rはcould not find function "as.numerci"。既知値を渡すas.numerci(1)ではアプリも未対応停止するため、未知値だけ検査を抜ける。

期待：関数の存在／対応を先に検査する。未知値だから架空の関数の返り値を作ってよいとはしない。

根拠：[R言語定義：関数評価](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Function-evaluation)。R 4.2.2の実測と、callのswitchより前のpos.some(isUnknown)分岐。

### R7-81（P2）repのlength.outよりtimesを先に適用して空の結果にする

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(rep(1:2,times=0,length.out=3))
```

実際：アプリは空配列（表示c()）、実Rは[1] 1 2 1。

期待：length.outがあるときtimesは無視する。元のベクトルから必要な長さへ反復する。

根拠：[R公式rep：length.outの優先](https://stat.ethz.ch/R-manual/R-devel/library/base/html/rep.html)。実装は先にtimes=0でoutPairsを空にし、length.out処理で空のまま返す。

### R7-82（P2）data.frameのオプションを存在しないデータ列にする

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(names(data.frame(x=1:2,stringsAsFactors=FALSE)))
```

実際：アプリはxとstringsAsFactors、実Rはxだけ。row.names=c("a","b")やcheck.names=FALSEも、アプリでは同名の列を作る。

期待：予約されたオプションを列データと区別し、対応外ならオプション名を挙げて停止する。

根拠：[R公式data.frameの署名](https://stat.ethz.ch/R-manual/R-devel/library/base/html/data.frame.html)。実装は全argsを列へ変換する。

### R7-83（P2）データフレームを普通の単一要素ベクトルにして変換・欠損判定を誤る

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(as.numeric(data.frame(x=1:2)))
```

実際：アプリNA、実Rは'list' object cannot be coerced to type 'double'。as.character(data.frame(x=1:2))もアプリ[object Object]、実Rは文字列1:2。is.na(data.frame(x=1:2))はアプリ単一FALSE、実Rは2行1列のFALSE行列。

期待：データフレームの型・列・形状を保つ処理、または正直な未対応停止にする。JSオブジェクトを数値／文字列に変えて値を捏造しない。

根拠：[numeric](https://stat.ethz.ch/R-manual/R-devel/library/base/html/numeric.html)、[character](https://stat.ethz.ch/R-manual/R-devel/library/base/html/character.html)、[NA](https://stat.ethz.ch/R-manual/R-devel/library/base/html/NA.html)。R 4.2.2で3式を別々に実測。

### R7-84（P2）rep(NULL)をNULLでなく空の数値ベクトルにする

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(rep(NULL))
```

実際：アプリは空配列（表示c()）、実RはNULL。length.outを正にしても実Rは警告付きNULLだが、アプリは空配列（表示c()）。

期待：NULLの型を保持する。空の数値ベクトルとNULLを同一表示・値として扱わない。

根拠：[R公式repのNote：NULLの結果は常にNULL](https://stat.ethz.ch/R-manual/R-devel/library/base/html/rep.html)。

### R7-85（P2）有効な小数の件数引数を不正な値と誤診する

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(rep(1:2,times=1.9))
```

実際：アプリ「timesは0以上の整数で指定してください」（エラー）、実Rは[1] 1 2。each=1.9、length.out=3.9も実Rでは有効で、順に1 2、1 2 1。seq_len(1.9)は実Rで1、seq(from=1,to=2,length.out=1.9)は1 2だがアプリはともにエラー。

期待：関数ごとの切捨て／切上げ規則を再現するか、小数引数を未対応として説明する。実言語で不正な入力であるように直させない。

根拠：[R公式rep](https://stat.ethz.ch/R-manual/R-devel/library/base/html/rep.html)、[seq](https://stat.ethz.ch/R-manual/R-devel/library/base/html/seq.html)。R 4.2.2で5ケース実測。

### R7-86（P2）repの内部ループに探索上限が効かず、不要な反復で停止を遅らせる

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
a <- rep(c(),times=1000000000,length.out=1)
```

実際：Linux／Windowsとも別プロセスの4秒タイムアウトに達し、アプリのsimulateは戻らなかった。Windowsでは1千万回120.1225ms、1億回1006.9569ms。実Rは10億回でも計測分解能上elapsed 0秒、警告とNULLで終了した。

期待：NULLの反復は即時に扱い、内部処理にも探索上限を適用する。空のpairsに対する不要なpush反復を延々行わない。これは全域の最悪時間を証明した値ではなく、今回の比較ケースの実測。UI側の別のWorker監視タイムアウトがあることは区別する。

根拠：[R公式rep](https://stat.ethz.ch/R-manual/R-devel/library/base/html/rep.html)、[Windows CI実測](https://github.com/sylpica/programming-practice/actions/runs/43749028788)。js/core/contract.jsの1200msとrep内のforループを照合。

### R7-87（P2）requiresが既知の不足バージョンでもマクロを継続する

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
requires("9.99");
print("AFTER");
```

実際：モデルruntime.version=1.54pでもアプリはAFTERを出力。実ImageJ 1.54pはバージョン不足の案内を出し、AFTERは出力しない。

期待：最低バージョンの条件を判定して止める。未判定なら未確認停止にし、「要件を確認します」と説明して継続しない。

根拠：[ImageJ公式requires](https://imagej.net/ij/developer/macro/functions2.html#requires)、[1.54p Functions.java](https://github.com/imagej/ImageJ/blob/v1.54p/ij/macro/Functions.java) requires内のinterp.done=true。実測の案内はThis plugin or macro requires ImageJ 9.99 or later. Use Help>Update ImageJ to upgrade to the latest version.（改行あり）。

### R7-88（P2）evalが内側の出力を落としたまま実行したと説明する

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
eval("print(\"INNER\");");
print("AFTER");
```

実際：アプリはAFTERだけ。実ImageJ 1.54pはINNER、AFTER。トレースは「渡された文字列をマクロとして実行します（中身の説明は省略します）」とする。

期待：動的実行が対応外ならその場で正直に停止する。説明の省略と実行結果の省略を混同しない。

根拠：[ImageJ公式eval](https://imagej.net/ij/developer/macro/functions2.html#eval)。実物のpure macroをheadlessで実行し、出力を確認した。

### R7-89（P2）Array.sortが混在型や並行配列の長さ不一致を正常に並べ替える

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
a=newArray(2,1);
b=newArray("x");
Array.sort(a,b);
print(a[0],b[0]);
```

実際：アプリは1 xと出力。実ImageJはArrays must have same lengthで停止。a=newArray("b",1);Array.sort(a);もアプリは継続、実物はMixed strings and numbers。

期待：配列の型と長さを検査して停止する。第1配列だけを変更して並行配列を元のままにしない。

根拠：[ImageJ公式Array.sort](https://imagej.net/ij/developer/macro/functions2.html#Array.sort)、[公式1.54p sortArray](https://github.com/imagej/ImageJ/blob/v1.54p/ij/macro/Functions.java)。通常のエラー処理では上記errorMessageを得てheadlessのエラーUIでHeadlessExceptionとなる。エラー無視設定後の後続出力は成功結果に使っていない。

### R7-90（P2）Array.sortの有効な3配列形式を引数エラーにして第3配列を取り残す

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
a=newArray(2,1);
b=newArray("b","a");
c=newArray(4,3);
Array.sort(a,b,c);
print(a[0],b[0],c[0]);
```

実際：アプリは「Array.sort の引数の数が違います」と表示しつつ1 a 4を出力。実ImageJ 1.54pは正常に1 a 3。

期待：3個以上の並行配列を同じ順で並べ替えるか、部分対応の未対応停止として説明する。2配列までという制限を実言語の引数誤りとしない。リファレンス書式・注意にも範囲を明示する。

根拠：[ImageJ公式Array.sort](https://imagej.net/ij/developer/macro/functions2.html#Array.sort)、公式sortArrayのwhile(nextToken==comma)で後続の全配列を並べ替える処理。1.54pで実測。

### R7-91（P2）getFileListがサブフォルダを落とし非対象の隠し項目を返す

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。モデルdirectoriesにroot=/workspace/work/r7c/ij-fixtures/とsub=/workspace/work/r7c/ij-fixtures/sub/を指定。filesにroot直下のa.txt、.hidden、Thumbs.dbとsub/nested.txtを明示する。実物では同じ構造を作った。別パスにする場合はコードとモデルの両方を置換。

```text
a=getFileList("/workspace/work/r7c/ij-fixtures/");
for(i=0;i<a.length;i++){print(a[i]);}
```

実際：アプリはa.txt、.hidden、Thumbs.db。実ImageJ 1.54pはa.txt、sub/。サブフォルダ内のnested.txtそのものは直下の一覧に含めない。

期待：直下のサブフォルダを末尾/付きで含め、.で始まる名前とThumbs.dbを実物どおり除外する。単なる出力順の違いではない。

根拠：[ImageJ公式getFileList](https://imagej.net/ij/developer/macro/functions2.html#getFileList)、公式Functions.javaのgetFileListと実測。

### R7-92（P2）File.existsが明示した存在フォルダを存在しないと返す

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。R7-91と同じフォルダ・ファイル構造を明示する。

```text
print(File.exists("/workspace/work/r7c/ij-fixtures/sub/"));
```

実際：アプリ0、実ImageJ 1.54pは1。親rootフォルダでも0対1。

期待：フォルダも存在判定の対象。モデルで存在を判定できないなら未確定とし、falseを捏造しない。

根拠：[ImageJ公式File.exists](https://imagej.net/ij/developer/macro/functions2.html#File.exists)、実測。実装はfilesにないパスがdirectories内にあると0へ分岐する。

### R7-93（P2）静的に検出した引数エラーがあっても後続処理・出力を生成する

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(abs(1,2));
print("AFTER");
```

実際：アプリはabsの引数の数エラーを表示しつつ1とAFTERを出力。実ImageJは右括弧が必要とのエラーで停止しAFTERは出力しない。全200参照名それぞれに0引数／8引数を付けた400入力を調べ、エラーありかつAFTERを生成するものが263件あった。

期待：エラーのあるプログラムの後続状態・出力を、実行された結果として生成しない。誤った引数数を未対応として止める場合も、実際にそこで停止する。400入力を263個の独立欠陥とは数えず、共通の停止制御の欠陥1件とする。

根拠：[ImageJマクロ言語](https://imagej.net/ij/developer/macro/macros.html)、公式Functions.javaのgetArg等のエラー経路。1.54pで右括弧不足のerrorMessageとHeadlessExceptionを得て停止を確認。静的diagsが実行前の停止に使われていない。

### R7-94（P2）absの余分な引数を黙って捨てる

対象：C／C++。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
#include <stdio.h>
#include <stdlib.h>
int main(){
    int r=abs(-1,0);
    printf("%d",r);
    return 0;
}
```

実際：アプリは1。gcc C17／g++ C++17（pedantic-errors）はtoo many arguments to function absでコンパイル失敗。入れ子のprintf("%d",abs(-1,0))でも同じ。

期待：標準関数の引数数を検査する。第2引数を無視して正常な戻り値を作らない。

根拠：[C標準ドラフトN1570 7.22.6.1](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)、[C++標準ドラフトN4659](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4659.pdf)。実装はvalues[0]だけをMath.absへ渡す。

### R7-95（P2）getlineの戻り値を入力文字列として扱い型不正な代入を通す

対象：C++。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
#include <iostream>
#include <string>
int main(){
    std::string s;
    std::string r=std::getline(std::cin,s);
    return 0;
}
```

実際：アプリはrを入力由来の未確定値として正常に代入。実g++ C++17はbasic_istream<char>からstd::stringへ変換できずコンパイル失敗。int r=...、bool r=...も実物は失敗するがアプリは受理する。

期待：getlineは入力を書き込むsと、戻り値のistream参照を区別する。戻り値の利用を扱えなければ未対応停止にする。

根拠：[C++標準N4659のstringのgetline宣言](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4659.pdf)。実装はsへ書き込んだ未確定値そのものをreturnする。

### R7-96（P2）Valが指数表記の指数を読み捨てて値を変える

対象：VBA。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
Debug.Print Val("1e3")
```

実際：アプリ1。Microsoft.VisualBasic.Conversion.Valによる補助照合は1000。1.2e-2もアプリ1.2、補助照合0.012。

期待：数値部分として指数を評価するか、指数形式を未対応として止める。文字eを単なる末尾として切り捨てない。

根拠：[VBA公式Val](https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/val-function)、[MicrosoftのVal実装・API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.visualbasic.conversion.val?view=net-8.0)。実Excel VBAでは未実測。補助照合のVisual Basic .NETをVBA実機と表記しない。アプリの正規表現には指数部がない。

### R7-97（P2）IsNumericが非VBA形式の0x接頭辞を数値とする

対象：VBA。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
Debug.Print IsNumeric("0x10")
```

実際：アプリTrue。Microsoft.VisualBasic.Information.IsNumericの補助照合はFalse。0b10も同様。リファレンスはこのモデルを10進数の通常表記に限定すると宣言している。

期待：VBAで数値として有効でない形式はFalse、または宣言どおり未対応停止にする。JSのNumberが受け付ける形式を無条件にVBAへ持ち込まない。

根拠：[VBA公式IsNumeric](https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/isnumeric-function)、[VBA数値型変換](https://learn.microsoft.com/en-us/office/vba/language/concepts/getting-started/type-conversion-functions)。実Excel VBA未実測。JSのNumber(x)による受理と自身の10進数制限を照合した。

### R7-98（P2）Nullの一律伝播がReplaceのエラーとIsNumericのBooleanを消す

対象：VBA。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
Debug.Print Replace(Null,"a","b")
```

実際：アプリはNullを表示して継続。公式ReplaceはexpressionがNullならエラー。Debug.Print IsNumeric(Null)もアプリNullだが、IsNumericはBooleanを返しNull入力はFalseとなる。

期待：有効な引数数でも関数固有のNull規則を適用する。ReplaceをNull値の成功に、IsNumericをNull型にしない。既報R7-35の「Nullが引数数検査を抜ける」とは別の、正しい引数数での挙動。

根拠：[VBA公式ReplaceのReturn values](https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/replace-function)、[MS-VBAL IsNumericのBoolean宣言とNull時の規則](https://learn.microsoft.com/en-us/openspecs/microsoft_general_purpose_programming_languages/ms-vbal/d920bc45-c366-4151-97dc-58c6a5b82780)。実Excel VBA未実測。MS-VBALの他の入力型までこのNullの確認結果から一般化しない。

### R7-99（P2）別画像を閉じると生存中画像のIDが変わり選択できなくなる

対象：ImageJ。再現：ee01f07で種類を選択しコードを入力・実行。モデルimagesを同じ寸法・画素設定の2画像にし、titleを順にA、Bとする。

```text
selectImage("B");
id=getImageID();
selectImage("A");
close();
selectImage(id);
print(getTitle());
```

実際：アプリではBのモデルIDは-2だがAを閉じるとBが配列先頭へ移り、selectImage(id)は「存在しない画像」で停止する。

期待：開いたままのBのIDを維持し、Bを選んでタイトルBを表示する。IDの数値自体を実物のIDに合わせる必要はないが、同一性を保つ。

根拠：[ImageJ公式getImageID／selectImage](https://imagej.net/ij/developer/macro/functions2.html#getImageID)。ImageJ 1.54pのImagePlusをheadlessで2個作り、A.close前後のB.getIDがともに-3であることを実測。これはGUIマクロ全体の実行ではなく、ID不変性の補助確認。実装は-(active+1)を返し、closeで配列を詰める。

### R7-100（P2）乱数関数が既知の不正引数でも正常な未確定値として継続する

対象：R。再現：ee01f07で種類を選択しコードを入力・実行。既定モデルを使用する。

```text
print(rnorm(-1))
```

実際：アプリはエラーなしで実行時の未確定値を表示する。実Rはinvalid argumentsで停止。runif(-1)も同じ。sample(NULL,1)は実Rでinvalid first argumentだがアプリは未確定値として継続する。

期待：乱数の値が未確定であることと、既知の引数の妥当性を区別する。既知の負の件数や無効な母集団はエラー、または未対応停止として表示する。

根拠：[R公式Normal](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Normal.html)、[Uniform](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Uniform.html)、[sample](https://stat.ethz.ch/R-manual/R-devel/library/base/html/sample.html)。R 4.2.2実測。実装はreadline／rnorm／runif／sampleの名前を見た時点で検査せずfreshUnknownを返す。

## 節目3の残作業

前の節目の全15種類別台帳と観点1〜8を引き継ぐ。この節目の追加試験で対象を一部へ縮小したり、台帳を消したりはしていない。

| 観点 | この節目で進めた範囲 | 継続する残作業 |
|---|---|---|
| 1 一次情報・実挙動 | R、ImageJ、C/C++の実物比較、VBAの公式資料と補助ランタイム | 全15種類の全機能の一次情報照合。実Excel／Canvas／PAD／AWS／UI.Vision製品セッション |
| 2 宣言との一致 | VBAの実装名と項目の照合、ImageJ／Rの対応範囲・誤ったエラー原因 | DEVELOPMENT.md全宣言と実装の双方向対応、各部分対応の例外全件 |
| 3 パス・表示・状態 | ImageJの静的エラー後実行、画像IDの同一性、Rの型・表示 | 全分岐制約、状態遷移・同時編集・保存・復元の未確認経路。前の正常データ888件の結果は保持 |
| 4 新2種類 | WindowsでRエンジン性能を追加測定。cmd／PowerShellの既報・実測を保持 | cmd／PowerShellの全引数・全展開段階・全パイプライン等。今回それらの追加全件試験をしたという意味ではない |
| 5 関数・参照・用語の完全性／正確性 | VBAの列挙可能な呼出し・組込み・定数・プロパティに項目漏れなし。ImageJ Array.sort等の書式問題 | 全15種類の完全名簿と参照／除外宣言の突合、978項目の全説明・書式・出力、111用語と教材用語の全一次情報・ビュー間照合 |
| 6 境界・異常値・組合せ | R138＋5、VBA436、ImageJ400＋11、C/C++45、画像IDの組合せ | 全関数の全引数位置・型・過不足・境界・入れ子・副作用・未知値の行列。今回の件数を全網羅としない |
| 7 全104教材・全エラー理由 | ImageJの静的エラー後の出力、Rの有効な小数引数に対する誤診 | 全104教材の主張と公式期待結果、全エンジンの全停止理由の再現 |
| 8 文面・a11y・保存劣化・性能 | WindowsでRの重い入力を実測、画面4再現 | 全文面・フォーカス・aria・壊れた保存の全形・PWA劣化・さらなる最重入力探索。実スクリーンリーダー／Safari／Firefox／iOS |

VBAの27関数等の項目漏れ確認を、VBA90項目の全説明／全挙動が正しいという結論へ広げない。ImageJ400件も引数数・停止制御を洗う入力集合であり、200関数の全型・全オプションの代わりではない。実施不能の製品セッション・GUI・実機があること、実施可能な部分にも残作業があることを分けて保持する。

使用量・回数制限の通知は受けていない。リセット権は使っていない。リセット時刻の通知もないため推測しない。今回も節目の未完了報告であり、完成監査として扱わない。


## 節目4の検証範囲と一次情報

### AutoHotkeyの実Windows照合

[Windows CI run 43751293375](https://github.com/sylpica/programming-practice/actions/runs/43751293375)、[監査スクリプト7aaf157](https://github.com/sylpica/programming-practice/tree/7aaf157/audit-probes/step4)。公式配布のAutoHotkey 2.0.19をWindows Server 2025で起動し16ケースを比較した。

監査用のGUIを2個だけ作り、Bをアクティブにしてから実行した。実行できた12ケースではACTIVE_B=1を出力してフォーカスの前提を確認。残り4ケースは過剰引数が読込み時に検出され、GUI作成前に終了コード2となった。これをフォーカス失敗や未検証と取り違えていない。対話MsgBoxの出力はFileAppend String(...)へ置換して標準出力へ採取し、型エラーはcatchのType／Messageを記録した。InputBoxの過剰引数ケースは読込み時に拒否され、ダイアログを放置してタイムアウトした結果ではない。

実測の主な組合せ：IsSetRefの数値・空文字・VarRef以外、forのbreak／continueと通常Object、Floatから文字列、Sleepの型と個数、複数組込みの過剰引数、同じタイトル部分を持つ2窓のWinActive、WinText、Last Found Window。全16件が正常終了という意味ではなく、実物のエラーを含めて結果を得た。

InputBoxを2回呼ぶ場合のResultの独立性は、公式の返り値契約とアプリの分岐を照合したもの。実WindowsでOK／Cancelを2回自動操作した実測ではない。ValueだけfreshUnknownでResultは同じ記号を使う実装と、0／3だけの到達パスを確認した。

AutoHotkeyの公式サイトは一部403となったため、公式AutoHotkeyDocsリポジトリのv2資料を読んだ。第三者の解説へ置き換えていない。

### Power FxのSDK・資料・状態確認

Microsoft.PowerFx.Interpreter **1.3.1**、.NET SDK **8.0.408**を使用。最初の153式を既定DecimalとNumberIsFloat=trueの両方でCheck／Evalし、さらにIsBlankや文字列比較へ入れた4式をFloatモードで確認した（Floatは計157式）。実Canvas製品セッションの実測とは区別する。アプリのJS数値とSDKの既定Decimalの違いだけを欠陥に数えないため、Textの丸めはFloatでも再確認した。たとえばText(-1,"0,")はDecimalが0、Floatが-0で、アプリはFloatと一致するため指摘から除いた。

- #／0、空文字列、Blank、0／1／−1、小数の丸め、%、桁区切り・桁縮小、文字を挟む数値書式、対応外書式、Sequenceの小数、BlankだけのSum等。
- 画面コンテキストとグローバルの同名変数、Navigate後のbindings、変数を経由したPatchについては公式の変数・画面・レコードの契約と明示モデルを照合。SDKの純粋式の試験だけでCanvas画面動作を検証したとはしない。
- Blank()=0、Blank()=""、Blank()=false、Blank()=Blank()の4式は、今回のSDKモードではそれぞれfalse／false／false／trueで、アプリと一致。この入力集合の比較は**確認済み・なし**。他のBlank／型違いの全組合せが正しいとの意味ではない。

レコードのin演算はSDKで「色として解釈できない」というErrorValueになった。同型レコードの完全一致の対照式まで同様となり、この結果をアプリに必要なエラーとして採用していない。実Canvasや別の公式実装経路での裏付けが必要な保留項目。エラーオブジェクトのJSON表現を、通常の戻り値だと誤認していない。

### UI.VisionとPAD

UI.Visionは公式資料に加え、公式A9T9/RPAのソースを読取り専用で取得し、比較先を **17b6302f1617b838efe2b26d3ef19c2face81350** に固定した。assertText→globMatch、変数名の大文字正規化、!TIMESの読取専用指定、空名の除外を確認した。実拡張をロードして製品のマクロを実行したわけではない。

PADは学習用JSONが実製品のexport互換でないという宣言を維持したうえで、通常の%表記の変数名と%%のリテラルをMicrosoft Learnへ照合した。Power Fx有効フローv2.43以降のケースセンシティブな名前とは分けた。実PAD製品セッション未接続という制約は残る。

実装名の対応確認：PADの全15アクション名は参照項目へ対応し、この命令名の列挙範囲の漏れは**確認済み・なし**。Power Appsのcall内26関数、ThisRecord、in／exactin（束ね項目）も参照へ対応。UI.VisionはNumber／Stringと通常コマンド・内部変数を確認し、旧名endIf／endWhileの漏れを追加した。これらを全構文・全型・全用語の完全性の合格とは呼ばない。

### 組合せ・画面・教材

JavaScriptの8関数×3種の追加引数と、UI.VisionのNumber／String×3種、計30ケースをNode実物と比較。追加引数が返り値に使われなくても評価は必要という規則を確認し、未定義名／null.xの例外が消える箇所を検出した。

追加26件の掲載コードを固定対象のAPIで再実行し、同じコード・モデルを実Chromiumでも操作した。画面の先頭パスの出力とエラー理由はAPI結果と一致し、26操作でpageerror 0。**今回のAPI結果と画面出力の取り違えは確認済み・なし**。アプリ自身の不正な値・分岐が正しいとの意味ではない。InputBoxの全パス欠落はAPIのパス集合でも確認した。

AHK・UI.Vision・PAD・Power Appsの全24テンプレートのタイトル・intro・コードを通読し、既定モデルでの既存全件実行記録とも照合した。この24件について今回新たに確定したタイトル／説明と掲載コードの主張の不一致はない。これは全104教材の公式照合の完了でも、テンプレートから使える全入力の合格でもない。PADのpa-break-totalの「6」はコード上のIndexで、合計は15となることを確認した。合計が6になるという誤った期待値は作っていない。

## 節目4の追加指摘

再現は指定コミットの固定画面で種類を選択して行う。JSONはそのままコード欄へ貼る。複数ケースは前のエラーで後続を止めないよう独立に実行する。実Windowsと、公式資料／ソース／SDKからの判定を各指摘で分ける。

### R7-101（P2）IsSetRefが代入済みの数値・文字列を未代入とする

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnullにする。

```text
x:=1
MsgBox IsSetRef(&x)
```

実際：アプリ0、実Windows 2.0.19は1。x:=""でも0対1。IsSetRef(x)へ配列を直接渡すとアプリ1だが実物はVarRefを要求するTypeError。IsSetRef(1)はアプリ0、実物TypeError。

期待：参照先に値があるかを判定し、値が配列／オブジェクトかどうかで判定しない。VarRef以外は止める。リファレンスの「数値・文字列は0」というモデル注意書きも実物と矛盾する値を教えており、未対応停止の宣言へ替えるだけなら合格。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[IsSet／IsSetRef](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/IsSet.htm)。

### R7-102（P2）forのbreakを無視しcontinueでループと後続を止める

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnullにする。

```text
n:=0
for v in [10,20,30] {
 n+=1
 break
}
MsgBox n
```

実際：アプリは3、実Windowsは1。breakをcontinueへ置換すると、アプリはn=1でMsgBoxへ到達しないが実物は3。

期待：breakはループを終え、continueは次の反復へ進む。ネストの外側へ制御信号を漏らさない。runForEachがbreakを消してactiveへ戻し、continueを残したままdoneへ入れている。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[For](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/For.htm)。

### R7-103（P2）通常Objectを列挙可能なコレクションとして扱う

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnullにする。

```text
n:=0
for k,v in {a:1,b:2} {
 n+=v
}
MsgBox n
```

実際：アプリは3、実WindowsはTypeError: Value not enumerable.。

期待：通常のObjectには列挙子がないため停止する。OwnProps等を扱えないなら未対応停止にし、プロパティを勝手にforの要素にしない。リファレンスの「オブジェクトではプロパティ名」という無条件の説明も修正対象。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[Forの__Enum要件](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/For.htm)。

### R7-104（P2）整数値のFloatを文字列化すると小数部を失い比較が変わる

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnullにする。

```text
x:=1.0 . ""
MsgBox x
MsgBox (x == "1.0")
```

実際：アプリは文字列1と比較結果0。実Windowsは文字列1.0と比較結果1。

期待：Floatの文字列表現を保つか、保持できない型変換を未確認として止める。数値として等しくても文字列への変換後の分岐を変えない。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[数値と文字列変換](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/Concepts.htm)。

### R7-105（P2）Sleepの型不正を検査せず後続処理を実行する

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnullにする。

```text
Sleep "bad"
MsgBox "AFTER"
```

実際：アプリはAFTER。実WindowsはTypeError: Parameter #1 of Sleep requires a Number, but received a String. で停止。

期待：数値を要求する引数を検査し、badミリ秒の待機を実行したかのように説明しない。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[Sleep](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/Sleep.htm)。

### R7-106（P2）組込み関数の過剰引数を黙って捨てる

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnullにする。SendText等の比較でも実WindowsのGUIは監査専用ウィンドウだけを使用した。

```text
Sleep 0,0
MsgBox "AFTER"
```

実際：アプリはAFTER。実WindowsはToo many parameters passed to function. Specifically: Sleep（読込み時、終了コード2）。SendText "x","y"、SetTitleMatchMode(2,3)、InputBox("p","t","","d","extra")も実物は過剰引数で停止するが、アプリは送信・戻り値・入力オブジェクトを正常に生成する。

期待：関数ごとの引数個数を検査し、未対応形なら停止する。第1引数だけ処理して残りを無かったことにしない。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。各関数の公式署名。

### R7-107（P2）WinActiveが最初の一致ウィンドウだけで判定する

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnull、windowsをID 1のR7 Window AとID 2のR7 Window B（いずれもexists=true、text=present text）とし、activeIdを2にする。

```text
MsgBox (WinActive("R7 Window") > 0)
```

実際：アプリ0。実WindowsはBがアクティブであることを確認（ACTIVE_B=1）したうえで1。

期待：アクティブなBがタイトル条件に合えばBのHWNDを返す。同じ部分文字列を持つAが先に見つかっても0にしない。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[WinActive](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/WinActive.htm)。

### R7-108（P2）WinExistのWinText引数を無視して別条件の窓を見つける

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnull、windowsをID 1のR7 Window AとID 2のR7 Window B（いずれもexists=true、text=present text）とし、activeIdを2にする。

```text
MsgBox WinExist("R7 Window","absent text")
```

実際：アプリはID 1、実Windowsは0。監査GUIにはpresent textだけがありabsent textは存在しない。

期待：タイトルとWinTextの両条件を評価するか、WinTextが未対応なら名指しで停止する。見つからないはずの窓を発見して後続分岐へ流さない。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[WinExist](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/WinExist.htm)。

### R7-109（P2）Last Found Windowを保持せず引数なしWinExistが先頭の窓を返す

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnull、windowsをID 1のR7 Window AとID 2のR7 Window B（いずれもexists=true、text=present text）とし、activeIdを2にする。

```text
x:=WinExist("R7 Window B")
MsgBox (WinExist()=x)
```

実際：アプリ0、実Windows1。アプリの最初のWinExistはBのID 2だが、次のWinExist()はAのID 1を返している。

期待：引数なしはLast Found Windowを使い、直前に見つけたBを維持する。状態をモデル化しないなら引数なしを未対応として止める。

根拠：[AutoHotkey公式資料](https://github.com/AutoHotkey/AutoHotkeyDocs/tree/v2/docs)、[Windows 2.0.19実測](https://github.com/sylpica/programming-practice/actions/runs/43751293375)。[Last Found Window](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/misc/WinTitle.htm)。

### R7-110（P2）別々のInputBoxのResultを同じ未確定値へ結び付けパスを欠く

対象：AutoHotkey。再現：ee01f07で種類を選び、コードを入力・実行。モデルeventをnullにする。

```text
a:=InputBox("A")
b:=InputBox("B")
x:=0
if a.Result="OK" {
 x+=1
}
if b.Result="OK" {
 x+=2
}
MsgBox x
```

実際：アプリの結果はx=3と0の2パスだけ。上限による打切りはない。

期待：別の2回のダイアログのOK／Cancelは独立で、OK→Cancelの1、Cancel→OKの2も到達可能。Resultにも呼出しごとに独立の記号を割り当てる。ValueはfreshUnknownだがResultは同じsource/idを繰り返している。

根拠：[InputBoxのResult契約](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/InputBox.htm)。この入力組合せは公式契約からの到達可能性照合であり、Windowsで2ダイアログを自動操作した実測ではない。

### R7-111（P2）同名の画面変数とグローバル変数を上書き・消失させる

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
UpdateContext({X:1}); Set(X,2); Set(Result,X)
```

実際：アプリResult=2。画面コンテキストのX=1をSet(X,2)が参照用のs.varsで上書きする。さらに Set(X,100);UpdateContext({X:1});Navigate(Detail);Set(Result,X) は、モデルのグローバルX=100があるのに未定義の名前Xで停止する。

期待：同じ画面内ではコンテキスト変数X=1が優先される。別画面へ移るとグローバルX=100を参照する。2つのスコープを1つの辞書として上書き／削除しない。

根拠：[Microsoft Learn：変数のスコープと優先順位](https://learn.microsoft.com/en-us/power-platform/power-fx/variables)、[Set](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-set)。実Canvasでは未実測。

### R7-112（P2）画面遷移後に表示数式が再計算されず旧画面の値を残す

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。screensをHome.context={X:1}、Detail.context={X:2}、bindingsを{"Label1.Text":"Text(X)"}とする。他は既定。

```text
Navigate(Detail)
```

実際：現在画面Detail、変数X=2なのにLabel1.Textは1。初期化時のHomeの値が残る。

期待：Xを参照する表示数式を遷移後のスコープで再計算し2とする。次の別のSetが偶然再計算を起こすまで古い表示にしない。

根拠：[UpdateContextの自動再計算](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-updatecontext)、[Navigate](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-navigate)。実装はNavigate内でrecalcを呼ばない。実Canvas未実測。

### R7-113（P2）変数へ保存した元レコードをPatchの対象として認識しない

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。dataSources.Orders=[{ID:1,Done:false}]とする。

```text
Set(r,LookUp(Orders,ID=1)); Patch(Orders,r,{Done:true})
```

実際：「更新するレコードがデータソースにありません」。同じLookUpを直接Patchの第2引数に置くと更新できる。

期待：データソース由来レコードを変数へ保存しても追跡可能性を保ち、ID 1のDoneをtrueへ更新する。SetのstructuredCloneでJS参照が変わったことを、元レコードがないというエラーにしない。

根拠：[Microsoft Learn：Patchのbase recordは変数等を経由してよい](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-patch)。実Canvas未実測。

### R7-114（P2）Sequenceが有効な小数の件数を不正と誤診する

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
Set(Result,CountRows(Sequence(0.9)))
```

実際：アプリ「Sequenceの行数が不正または上限を超えています」。公式SDKは0。1.9は公式SDKで1。

期待：Recordsを切り捨てる規則を適用するか、小数形式が未対応だと正直に説明する。0.9を実言語で不正な行数として直させない。

根拠：[Microsoft Learn：Sequence](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-sequence)。Microsoft.PowerFx.Interpreter 1.3.1のDecimal／Floatで照合。

### R7-115（P2）BlankだけのSumを0にしてIsBlankの分岐を変える

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
Set(Result,IsBlank(Sum(Table({x:Blank()}),x)))
```

実際：アプリfalse、公式SDKはtrue。内部のSumはアプリ0、公式SDKはBlank。

期待：有効な数値のない集計結果と数値0を区別する。

根拠：[Microsoft Learn：集計関数](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-aggregates)、[公式Power Fx実装](https://github.com/microsoft/Power-Fx)。SDK1.3.1で直接のSumとIsBlankを実行した。

### R7-116（P2）TextのBlank入力が書式処理を迂回して常に空文字列になる

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
Set(Result,Text(Blank(),"0"))
```

実際：アプリ空文字列、公式SDKは0という文字列。0.00書式もアプリ空、SDK0.00。未対応の書式もBlankだけは検証を迂回して空文字列になる。

期待：書式を伴うBlankの変換規則に合わせるか未対応停止にする。書式検証を入力値のBlankによって省略しない。

根拠：[Microsoft Learn：Text](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-text)。公式SDK1.3.1のDecimal／Floatで一致した結果。IsBlank(Text(Blank(),"0"))はSDK false、アプリtrue。

### R7-117（P2）Textの#書式が不要な0や小数点を付ける

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
Set(Result,IsBlank(Text(0,"#")))
```

実際：アプリfalse、公式SDK true。Text(0,"#")はアプリ0、SDK空文字列。Text(1,"0.##")はアプリ1.、SDK1。Text(0,"#.00")はアプリ0.00、SDK.00。

期待：#は不要な0を表示せず、小数部が省略されたとき不要な小数点を残さない。書式が0を要求する場合と区別する。

根拠：[Microsoft Learn：Textのnumber placeholders](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-text)。SDK1.3.1でDecimal／Floatを確認。

### R7-118（P2）Textの丸めがPower Fxの書式結果と異なる

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
Set(Result,Text(1.005,"0.00"))
```

実際：アプリ1.00、公式SDK1.01。2.675も2.67対2.68。1.005の0%書式は100%対101%。

期待：対象ホストの数値形式に応じた書式の丸めを再現するか、未確定な書式結果として停止する。

根拠：[Microsoft Learn：Textの桁数超過時の丸め](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-text)。SDK1.3.1の既定DecimalだけでなくNumberIsFloat=trueでも同じ期待値を確認した。JSのtoFixedとの型差だけで指摘していない。実Canvasでは未実測。

### R7-119（P2）Textの桁の途中に置く文字を末尾へ移す

対象：Power Apps。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
Set(Result,Text(1,"00-00"))
```

実際：アプリ0001-、公式SDK00-01。1000も1000-対10-00。

期待：桁プレースホルダと文字の位置を保つ。扱えない配置なら未対応として停止する。

根拠：[Microsoft Learn：Textのcustom format](https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-text)。SDK1.3.1のDecimal／Floatで照合。実装は全整数桁を最初のphへ一括出力している。

### R7-120（P2）assertTextが有効なパターンを完全一致として失敗させる

対象：UI.Vision。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
{
  "Commands": [
    {
      "Command": "assertText",
      "Target": "id=result",
      "Value": "未*"
    },
    {
      "Command": "echo",
      "Target": "AFTER"
    }
  ]
}
```

実際：既定のid=resultの未送信に対して未*で検査するとテキストが一致しませんで停止。

期待：公式のパターン照合で一致させるか、パターン形式が未対応だと説明する。リファレンスの「完全一致」という無条件の説明も実仕様と異なる。

根拠：[公式assertText](https://ui.vision/rpa/docs/selenium-ide/asserttext-verifytext)、[公式実装17b6302 command_runner.js](https://github.com/A9T9/RPA/blob/17b6302f1617b838efe2b26d3ef19c2face81350/src/ext/content_script/command_runner.js)のassertText→globMatch。実拡張セッション未実測。

### R7-121（P2）変数名の大小文字を区別し正しい参照・内部設定を失敗させる

対象：UI.Vision。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
{
  "Commands": [
    {
      "Command": "store",
      "Target": "abc",
      "Value": "Name"
    },
    {
      "Command": "echo",
      "Target": "${name}"
    }
  ]
}
```

実際：Nameへ保存後の${name}が「変数がありません」で停止。!ERRORIGNOREにtrueを保存してもエラーを無視できず止まる。

期待：変数名・内部変数名を公式仕様どおり同一視する。!ERRORIGNOREを別の無関係な変数として作らない。

根拠：[UI.Vision公式変数実装](https://github.com/A9T9/RPA/blob/17b6302f1617b838efe2b26d3ef19c2face81350/src/common/variables.js)。setで大文字へ正規化しgetでも大文字へ変換する。実拡張セッション未実測。

### R7-122（P3）実装済みendIf／endWhileの項目・別名説明・除外宣言がない

対象：UI.Vision。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
{
  "Commands": [
    {
      "Command": "if",
      "Target": "true"
    },
    {
      "Command": "echo",
      "Target": "YES"
    },
    {
      "Command": "endIf"
    }
  ]
}
```

実際：アプリはendIfで正常にブロックを閉じYESを出す。endWhileも対応してAFTERへ進む。一方22参照項目の名前・書式・説明・例にもDEVELOPMENT.mdにも両名の記載がない。

期待：既存end項目へ旧名・別名として束ねて説明するか、意図的除外を宣言する。

根拠：[公式end：formerly endWhile and endIf](https://ui.vision/rpa/docs/selenium-ide/end)。js/types/uivision/index.jsのclassifyで両名がendへ対応する。

### R7-123（P2）通常PADの変数名を大小文字で別物にする

対象：Power Automate Desktop。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
{
  "actions": [
    {
      "action": "Set variable",
      "target": "Name",
      "value": "abc"
    },
    {
      "action": "Display message",
      "value": "%name%"
    }
  ]
}
```

実際：Nameを設定した直後の%name%で未定義の名前name。

期待：通常の%表記のデスクトップフローでは変数名を大小文字で同一視する。Power Fx有効フローv2.43以降の大小文字区別と混同しない。

根拠：[Microsoft Learn：通常フローの変数名](https://learn.microsoft.com/en-us/power-automate/guidance/rpa-sap-playbook/adding-variables-to-vbscript)、[Power Fx有効フローの版差](https://learn.microsoft.com/en-us/power-automate/desktop-flows/power-fx)。本アプリの%表記を対象にした資料照合。実PAD未実測。

### R7-124（P2）%%エスケープを処理せず誤った文面や構文エラーにする

対象：Power Automate Desktop。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
{
  "actions": [
    {
      "action": "Display message",
      "value": "100%%"
    }
  ]
}
```

実際：アプリは100%%をそのまま表示。Price=20を設定して%%Price%%を表示するケースは「式を解釈できません：%」で停止。

期待：%%をリテラルの%として扱い、100%や%Price%を表示する。後者を変数参照として再展開しない。

根拠：[Microsoft Learn：% notationと%%によるescape](https://learn.microsoft.com/en-us/power-automate/desktop-flows/variable-manipulation)。実PAD未実測。

### R7-125（P2）使わない追加引数の評価を省略し、本来の例外を消す

対象：JavaScript／UI.Vision。再現：ee01f07で種類を選び、コードを入力・実行。JavaScriptでは掲載コード。UI.VisionではexecuteScript_SandboxのTargetをreturn String("1",NoSuchR7);、Valueをrとし、echo ${r}を続ける。

```text
console.log(String("1",NoSuchR7));
```

実際：JavaScriptアプリは1、Node実物はReferenceError: NoSuchR7 is not defined。UI.Vision Sandboxのreturn String("1",NoSuchR7);もアプリ1。同じ差はNumberでも再現。JavaScriptのBoolean、Math.abs/floor/round、JSON.stringifyでも追加引数の未定義名やnull.xの例外を無視する。

期待：関数が追加引数の値を使用しなくても、呼出し前の全実引数の評価を行う。第1引数だけ読んで正常値を生成しない。

根拠：[ECMAScript ArgumentListEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-argument-lists-runtime-semantics-argumentlistevaluation)、[UI.VisionのES5 Sandbox](https://ui.vision/rpa/docs/selenium-ide/executescript)。独立30ケースをNodeと比較。UI拡張セッションは未実測。

### R7-126（P2）読取専用の!timesや空名へstoreして存在しない状態を作る

対象：UI.Vision。再現：ee01f07で種類を選び、コードを入力・実行。既定モデルを使用する。

```text
{
  "Commands": [
    {
      "Command": "store",
      "Target": "5",
      "Value": "!times"
    },
    {
      "Command": "echo",
      "Target": "${!times}"
    }
  ]
}
```

実際：アプリはループ外で!timesに5を設定しecho 5。Valueを空文字列にしたstoreでは空名の変数も作る。

期待：!TIMESは読取専用なのでユーザーのstoreを止める。空名は公式変数setterで無視され、空名の変数は存在しない。アプリがより明確な入力エラーとして止める方法でも合格だが、幻の変数を作らない。

根拠：[UI.Vision公式!TIMESのread-only宣言](https://ui.vision/rpa/docs/)、[公式variables.js](https://github.com/A9T9/RPA/blob/17b6302f1617b838efe2b26d3ef19c2face81350/src/common/variables.js)のreadonly配列／書込拒否と空キー除外。実拡張セッション未実測。

## 節目4の残作業

対象を縮小せず、節目3までの全15種類別台帳・観点1〜8を保持する。

| 観点 | この節目の進捗 | 残作業 |
|---|---|---|
| 1 一次情報 | Windows AHK16、公式SDK Decimal153／Float157、公式UI.Visionソース、Microsoft Learn | 全15種類の残る全機能・型・書式の照合。実Canvas／PAD／UI.Vision等の製品セッション |
| 2 対応宣言 | AHKの値・窓条件、Power Appsの再計算、UI旧名、PAD通常式とPower Fx有効式の区別 | DEVELOPMENT.md全宣言の双方向照合、各制限の正直な停止 |
| 3 パス・状態・表示 | AHKの独立入力とループ信号、窓の状態、Power Appsのスコープ・Patch、26画面再現 | 全種類の全分岐制約、保存・復元・同時編集・テンプレート切替の未確認経路 |
| 4 cmd／PowerShell | 既報と実Windowsの連結echo等の結果を保持 | 新2種類の残る全引数・パイプライン・展開段階・書式・エラー理由。今回追加全件試験したとはしない |
| 5 完全性・正確性 | PAD15命令とPower Apps26関数等の項目対応、UI旧名の漏れ、AHK／Text等の誤説明 | 978項目すべての記述・期待出力と一次情報、全実装名の完全対応表、111用語と教材語・ビュー間説明 |
| 6 全関数の境界・異常値・組合せ | AHKの型・引数・ループ・窓、Text／Sequence／Sum、追加引数30入力 | 全関数の各引数位置・全型・空集合・null相当・未知値・副作用・入れ子。今回の入力集合で代替しない |
| 7 全104教材・全停止理由 | 4種類24教材の主張とコード、Sleep等の不正引数、偽の未定義／不一致エラー | 残る教材と全エンジンの全停止理由を再現し一次情報へ照合 |
| 8 文面・a11y・劣化・性能 | 画面26操作、明示した出力・表示書式 | 全文面、aria・フォーカス、破損／容量超過／PWAの全経路、最重入力探索。前回のWindows性能実測を保持 |

VBA・ImageJ・Python・R・C・C++・C#・JavaScript・CloudFormation、cmd／PowerShellについても前の未了事項は全て継続する。今回はそれらの全機能を再検証したという意味ではない。Power FxレコードinのSDK結果、残るBlank／型変換・レコード列名の扱い、UI.Visionの追加コマンド境界等も保留・継続対象。

実Excel／Canvas／PAD／AWS／UI.Vision製品セッション、実スクリーンリーダー、Safari／Firefox／iOS実機、ImageJのGUI全経路は未実施。公式資料・ソース・SDKの判定を実機の出力に作り替えていない。Windows AHKで測れたものは測り、できた範囲と未実施を分けた。

使用量・回数制限の通知は受けていない。リセット権は使っていない。リセット時刻の通知もないため推測しない。この節目も未完了報告であり、完成監査や欠陥収束の宣言ではない。


## 節目5の検証範囲と結果

固定対象ee01f07をChromium 156の独立したテスト用コンテキストで起動した。利用者の実セッション・保存領域には触れていない。Windows CIへの追加pushは行っておらず、今回の画面・取込み試験はLinux環境である。過去のWindows実測値は前節までの記録を維持する。

- 同じ種類の異なるテンプレートを2タブで編集する画面再現を全15種類で実施し、15件とも先の変更が失われた。実装の保存ヘルパーそのものを抽出した追加検査では、104テンプレート内の同一種類・異なるテンプレートの有向組合せ648件すべてで同じ消失を確認。異なる種類の有向組合せ210件では保持できた。648／210件はヘルパー検査であり、ブラウザで858回操作したという意味ではない。
- コードの通常の保存→ファイル取込みは全15種類で一致し、**確認済み・なし**。これはモデル・表示設定まで保存されるという意味ではない。取込み確認の取消しはコードを保持し、file入力も空へ戻った。この取消し経路は**確認済み・なし**。
- UTF-8、UTF-8 BOM、BOM付きUTF-16LE／BE、Shift_JISの各固定入力を全15種類へ渡した75件は改行正規化を含め期待どおり。拡張子の大文字表記を受理し、不正拡張子15件を拒否した。この90入力の判定は**確認済み・なし**。全ての混合・曖昧な文字コードを保証するものではない。別途、正しい制御文字と保存上限の失敗をR7-130／131に掲載。
- Service Workerの準備完了後、ネットワークを切って再読込みし、全15種類の既定モデルと明示した先頭テンプレートを実行した。各種類でWorkerが結果を返し、練習・リファレンス・テンプレート・用語集の計60ビューが利用できた。このオフライン起動・ビュー表示は**確認済み・なし**。全式の意味論や全更新世代のキャッシュ移行を保証するものではない。
- 保存データのcodeをnull、true、1、空配列、空オブジェクト、非空オブジェクトへ置き換え、15種類×6の90件を確認。ページ例外0、保存警告0、回復用別キー0。オブジェクト30件すべてが`[object Object]`へ変換され、元のオブジェクトを保持した回復データは残らなかった。これは**既報R7-50の補強**であり、新たな90件や別欠陥には数えない。コードが文字列以外の保存データを正当なコードとして扱わず、破損を伝え原本を保全する必要がある。
- ImageJのsimBuiltin内の明示case名136個を参照項目名と照合し、この名前集合の漏れは**確認済み・なし**。未対応名の巨大な一覧を「実装済み関数」へ数え替えていない。全組込み変数・別名・説明・期待出力・用語の完全対応は引き続き未了。

ローカル証跡は`/workspace/work/r7e/`の`state-results.json`、`merge-matrix.json`、`import-offline-results.json`、`decode-results.json`、`corruption-results.json`、`quota-focus-results.json`、`diagnostics-results.json`。これらのローカルファイルはmainへ追加せず、再現に必要な条件・手順・実出力を本報告へ記す。取込み試験の初回には監査スクリプトのPlaywright API名の誤りがあり修正後に全体を再実行した。破損データ投入も前のWorker完了を待ってから再実行し、テスト投入値が前の実行の保存に上書きされる競合を除いた。いずれも製品の修正ではない。

## 節目5の追加指摘

### R7-127（P2）同じ種類の別テンプレートを編集した他タブの下書きを消す

**対象・場所**：全15種類、`js/app.js`のmergeActivePrevious／fileDraft。観点2・3・8。

**再現**：同じ種類のテンプレートA・Bに異なるコードを保存しておく。同じURLを2タブで開き、タブ1はA、タブ2はBを選ぶ。自動実行を切り、タブ1でAを`SLOT_A_NEW`へ編集する。保存データのAがNEWになった後、タブ2でBだけを編集する。タブ2を再読込みしてAを選ぶ。

**実際**：Aは以前の`SLOT_A_OLD`に戻る。警告なし。全15種類の最初の2テンプレートで再現し、648組のヘルパー検査も同じ結果。後のタブはAを編集していないのに、古いmine.byTemplateの全項目が最新stored.byTemplateへ上書きされる。異なる種類の210組ではこの消失は起きない。

**期待・根拠**：変更していない別テンプレートの保存済み下書きを保持するか、競合を表示し回復できるようにする。固定対象の[DEVELOPMENT.md](https://github.com/sylpica/programming-practice/blob/ee01f07/docs/DEVELOPMENT.md)はテンプレート別保持と他タブの下書きを丸ごと上書きで消さない方針を宣言している。[HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html#introduction)も複数窓での共有状態にロックを仮定できないと説明する。今回は同時刻のsetItem競争を必要とせず、順番に編集するだけで失う。同じテンプレートへの同時編集の最終書込み優先を欠陥としたものではない。

### R7-128（P2）アクション欄の不正入力を残したまま古い値で正常実行する

**対象・場所**：PAD、共通`js/core/action-editor.js`のinput.onchangeと実行状態。観点3・7・8。

**再現**：PADのコードへ次を貼り、アクション一覧の1番valueを`1`から`bad`へ変更してTab、そのまま実行する。

```json
{"actions":[{"action":"Set variable","target":"x","value":1},{"action":"Display message","value":"%x%"}]}
```

**実際**：Tab直後はJSONのUnexpected tokenエラーが表示される。しかし実行ボタンは有効で、実行するとエラー表示は通常の「1件のパス」に置き換わり、出力は「メッセージ 1」。アクション欄は`bad`のまま、コード欄はvalue:1のままで一致しない。

**期待・根拠**：入力エラーが未解消ならその項目と状態を維持して実行を止める、または変更を明確に戻して、実行対象と表示値を一致させる。[WCAG 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)は検出した入力エラーの項目と理由を文字で示すことを要求する。最初のエラー表示だけでは、後で正常結果へ置き換えられる未反映入力を説明できない。PADの数値フィールドで実測した指摘であり、共有エディタの全種類・全フィールドが同じ入力で失敗するとの主張ではない。

### R7-129（P3）アクション欄をキーボードで編集するとフォーカスが本文へ落ちる

**対象・場所**：PAD／UI.Vision、共通action-editorのrender／commit。観点8。

**再現**：PADの先頭テンプレートで1番valueの`0`を`10`へ変えTabを押す。別途UI.Visionの`ui-store-echo`で1番Targetの「学習者」を「別の値」へ変えTabを押す。

**実際**：コードへの変更反映は成功するが、どちらもdocument.activeElementがBODYとなり、次の編集欄への連続移動が失われる。変更のたびにroot.replaceChildrenで編集UI全体を破棄し、フォーカスを復元していない。

**期待・根拠**：編集後も次の論理的な操作対象へ移れるよう、入力位置または次の対象を保持する。[WCAG 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)の意味と操作性を保つ順序に関係する操作上の欠陥。キーボードトラップや実スクリーンリーダーでの失敗まで実測したものではなく、単独でページ全体のWCAG不適合を断定しない。

### R7-130（P2）文字数上限内のコードを自分で保存すると取込み上限を超える

**対象・場所**：共通保存・取込み、`js/app.js`のdownloadと`js/import.js`。観点3・8。

**再現**：Pythonのコード欄へ`"#" + "あ" * 99999`で生成した文字列を貼る（実際のコードは#に続く「あ」99999個、計100000文字）。保存ボタンで.pyをダウンロードし、コード欄を別の短いコードに変えて、その保存ファイルを取り込む。

**実際**：出力ファイルはBOMを含め300001バイトで、取込みは「ファイルは300KB以内にしてください。」と拒否する。100000文字のコメントコードはCPython 3.12で終了コード0、アプリの文字数上限内。通常15種類のコード保存→取込みは成功するが、この境界では戻せない。

**期待・根拠**：アプリ自身が保存を受け付けた上限内コードは取り込めるようにするか、保存前に非互換な上限を明示して止める。[File APIのBlob文字列処理](https://www.w3.org/TR/FileAPI/#process-blob-parts)はUTF-8符号化する。日本語99999個は299997バイト、#は1、BOMは3で計300001となる。[Pythonのコメント仕様](https://docs.python.org/3/reference/lexical_analysis.html#comments)上も有効なコード。文字数とバイト数の制限の併存自体ではなく、保存した自身のファイルを読めない整合性を指摘する。

### R7-131（P2）正当なソースのFF／VTをバイナリ扱いして取り込めない

**対象・場所**：Python／C、共通`js/import.js`の制御文字検査。観点1・7・8。

**再現**：Pythonで次のバイト列のファイルを作成し、各種類で取り込む。

```python
from pathlib import Path
Path("formfeed.py").write_bytes(b"\x0cprint(1)\n")
Path("vertical.c").write_bytes(b'#include <stdio.h>\nint\x0bmain(){printf("1");return 0;}\n')
```

**実際**：両ファイルとも「バイナリファイルの可能性があるため取り込めません。」と拒否。Pythonは実画面のファイル取込みでも再現した。Cは同じ取込み関数decodeFileで拒否を確認。CPython 3.12の前者は`1`、GCC 14.2の後者は`gcc -std=c17 -pedantic-errors vertical.c -o vertical`で成功して実行出力`1`。同じ文字列をアプリのsimulateへ渡すと両方とも出力1を返す。

**期待・根拠**：対応する有効なテキストソースとして取り込むか、少なくとも対応外制御文字という実際の制限を宣言・表示する。[Python字句解析](https://docs.python.org/3/reference/lexical_analysis.html#indentation)は行頭FFを認め、インデント計算で無視すると定義。[WG14 N1570 §6.4](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)は空白類にVT・FFを含める。今回は不正UTF-8や任意のバイナリ受理を求めるものではなく、エンジン自体が扱える正当なソースの拒否である。

### R7-132（P3）保存失敗時の救出案内がモデルも救える下書き保存と誤解させる

**対象・場所**：共通保存警告と保存ボタン。観点3・8。

**再現**：テスト用コンテキストの起動前に次を仕込み、QuotaExceededErrorを注入する。実容量を満杯にした実測とは区別する。

```javascript
const originalSet = Storage.prototype.setItem;
Storage.prototype.setItem = function(k, v) {
  if (k === "programming-practice-v3")
    throw new DOMException("Quota", "QuotaExceededError");
  return originalSet.call(this, k, v);
};
```

PowerShellのモデルvariablesへ`{"AuditModelValue":98765}`を設定し、`Write-Output $AuditModelValue`を実行。警告の案内に従い保存する。保存不能状態のまま再読込みし、保存した.ps1を取り込む。

**実際**：警告は「ブラウザへの保存ができませんでした。保存ボタンで下書きをファイルへ保存してください。」。保存ファイルはコード1行のみ。再読込み後のモデルvariablesは{}で、実行前の`pipeline 98765`は復元されない。

**期待・根拠**：保存警告は、ファイルへ救えるのはコードだけで、モデル等は別に退避が必要と明示する。固定対象[DEVELOPMENT.md](https://github.com/sylpica/programming-practice/blob/ee01f07/docs/DEVELOPMENT.md)の下書きにはモデル等も含まれ、[HTML Storage.setItem](https://html.spec.whatwg.org/multipage/webstorage.html#dom-storage-setitem)は保存不能時のQuotaExceededErrorを定義する。コード専用エクスポート機能自体を欠陥とせず、保存失敗時の劣化・救出範囲の案内の不正確さを指摘する。

### R7-133（P3）HTTPで開いているWorker読込み失敗にもHTTPで開き直せと案内する

**対象・場所**：共通`js/app.js`のworker.onerror。観点7・8。

**再現**：Service Workerのない新しいテストコンテキストでHTTPから起動し、DevTools等で`/js/worker.js`へのリクエストだけを失敗させる。実測URLは`http://127.0.0.1:4181/`、Playwrightのroute.abort('failed')で失敗を注入した。

**実際**：「解析用Workerを開始できません。HTTP(S)でアプリを開き直してください。」。すでにHTTPであり、その案内に従っても読込みを阻害した条件は解消しない。

**期待・根拠**：Workerの読込み・開始失敗を正直に知らせ、HTTP起因を確認できないエラーでは原因を断定しない。[HTML Workers処理モデル](https://html.spec.whatwg.org/multipage/workers.html#worker-processing-model)にはスクリプト取得失敗によるerror通知もある。全てのerrorがfileスキーム起因という契約はない。ネットワーク・CSP等の正確な原因まで常に断定せよという要求ではない。

### R7-134（P3）モデル検証エラーをコード構文エラーと表示する

**対象・場所**：共通`js/app.js`のapplyResultエラー用フッター。観点7・8。

**再現**：PowerShellでコードを`Write-Output 1`、モデルJSONを`{"files":0}`として実行する。

**実際**：先頭は正しく「1行：モデルエラー：モデルfilesは配列で指定してください」だが、最終状態欄は「構文の確認で停止しました。実行結果はありません。」。構文が正しいコードまで誤った分類で説明する。

**期待・根拠**：モデルの型検証で止まった場合はモデルの修正を示し、コード構文の停止と区別する。[Microsoft Learn Write-Output](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-output?view=powershell-7.4)の引数形式上、コードは有効である。アプリのモデルfilesの配列契約に対する検証エラーをコード構文のエラーとする根拠はない。[WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)の誤りの箇所・内容を示す方針にも沿って分類を統一する。

## 節目5の残作業

**観点1〜8は未完了。** 既存の全15種類別台帳、全104教材、978リファレンス、111用語、全ビューを維持する。今回の状態検査を全関数の監査の代わりにはしない。

| 観点 | 今回の進捗 | 継続する残作業 |
|---|---|---|
| 1 一次情報 | HTML／File API／WCAG、Python字句規則、WG14、PowerShell資料と実装・画面の照合 | 全15種類の未照合の関数・構文・型・書式と実製品差 |
| 2 宣言 | テンプレート別保持・他タブ保護の宣言違反を全15種類で再現 | DEVELOPMENT.mdの全宣言の双方向対応表、範囲外入力の正直な停止 |
| 3 パス・状態・表示 | 15種類の2タブ、648同種類／210異種類の保存ヘルパー、通常保存・取消し・編集欄不整合 | 同一スロット競合、コードとモデルの交差、旧版データ移行の全形状、全エンジンの全分岐制約 |
| 4 cmd／PowerShell | 既報の実Windows連結echo等を保持、PowerShellで保存失敗とモデルエラー画面を追加 | 残る全引数・パイプライン・展開段階・表示・停止理由。今回Windowsを追加実行したとはしない |
| 5 完全性・正確性 | ImageJの明示case136名と参照項目の対応 | 978項目全記述・期待出力、全実装名／変数／別名と範囲外宣言の完全対応、111用語と教材語・ビュー間矛盾 |
| 6 全関数の境界等 | 取込みの上限・合法な制御文字、破損code6形状×15を追加 | 各関数の全引数位置・0／1／−1・空集合・null相当・型違い・過不足・副作用・入れ子・連鎖・パイプライン |
| 7 104教材・全停止理由 | 取込み、編集エラー消失、Workerとモデル停止理由 | 前節までの未照合教材、全エンジンの全停止理由・教材タイトル／説明の一次照合 |
| 8 文面・a11y・劣化・性能 | PAD／UI編集フォーカス、Quota例外注入、90破損、15保存、文字コード90、オフライン60ビュー | 全文面・aria・ラベル・全フォーカス経路、実容量枯渇、キャッシュ更新世代、最重入力探索とWindows UI性能 |

VBA・ImageJ・CloudFormation・PAD・AHK・UI.Vision・Power Apps・Python・R・C・C++・C#・JavaScript・cmd・PowerShellの残作業を全て継続する。実Excel／Canvas／PAD／AWS／UI.Vision製品セッション、実スクリーンリーダー、Safari／Firefox／iOS実機、ImageJのGUI全経路は環境・接続がなく未実施。Windows CIで追加可能な検証・性能測定は「不可能」ではなく未実施として残す。今回のLinuxブラウザ試験からWindowsの時間を推測していない。

使用量・回数制限の通知は受けておらず、リセット権も使っていない。出力が長いツール応答は文脈上限で切られたため、必要な結果を小分けに読み直した。利用枠のリセット時刻の通知はないので推測しない。これも未完了の節目報告であり、全範囲完了や欠陥収束の宣言ではない。


## 節目6の検証範囲・一次情報・判定

CPython **3.12.14**、Unicodeデータ **15.0.0**、Node **24.22.1**、Chromium **156**を使用。固定対象ee01f07のエンジンと公式Python 3.12資料・CPythonソース・実CPythonを照合した。新規のWindows CI実行・pushは行っていない。CloudFormationはアプリの委譲Pythonでの再現であり、実AWS Lambdaの実測ではない。

### 境界・異常値・組合せ

| 入力集合 | 実施数 | 結果・適用範囲 |
|---|---:|---|
| 組込み関数と文字列／list／dictメソッドの境界・型・個数、重点コード | 739 | CPythonと比較。0／1／−1、bool、None、空文字列、空コンテナ、小数、inf／nan等。各実装の全入力域を終えたという意味ではない |
| Unicode代表コード・複数文字・追加境界 | 175 | 7メソッドの具体的な誤値、ジェネレータの副作用、非有限和等を再確認 |
| any／all × list／iter × 長さ0〜3 × 要素False／True／同じ未知x | 160 | 定義した有限集合を全列挙。到達集合が32組で不足（R7-135） |
| startswith／endswith × 本文3種 × 候補3種 × start7種 × end7種 | 882 | start／endは−5、−1、0、1、2、3、5。定義した有限集合を全列挙し22組不一致（R7-147） |
| 集合8メソッド × ハッシュ不能要素list／dict | 16 | 6メソッドの12入力で不正継続。updateとsymmetric_difference_updateの4入力は正しくTypeError（R7-145） |
| 掲載25例外型 × 掲載25ハンドラ | 625 | 定義した全組合せをCPythonと照合し12組不一致（R7-150） |

計**延べ2597入力**。異なる検査群で重複するコードを含み、2597個の異なる欠陥や全関数の完全網羅とは数えない。引数を無視する差があっても既報R7-17〜20等に該当するもの、正直な未確定表示だけのもの、実物と一致するものは新規指摘から除外した。たとえばsortedのreverseへ文字列や小数を渡す2例は、このCPythonでは真偽変換されアプリと一致したため「TypeErrorを出さない欠陥」とはしていない。

Unicodeについては、0〜0x10FFFFを列挙し、Unicode 15.0で未割当の文字とサロゲートを除いた**286719コードポイント×10判定、2867190判定**を比較した。アプリから抽出した実際の判定式を評価した検査であり、2867190回アプリの全構文解析・画面操作をしたものではない。抽出した一般カテゴリの式がPythonの各メソッドの規則と異なる候補を得てから、古くから存在する代表7文字をアプリの完全なsimulate経路と実CPythonで再現した。

候補差分数はisdigit 787、isnumeric 81、isalpha 1694、isalnum 1458、isidentifier 26、islower 312、isupper 151。**4509候補を4509件の確定欠陥としない**。Node側のUnicode版差に依存する候補を含み得るため、R7-148へ確実な代表例を集約した。同じ単一コードポイント集合ではisdecimal／isspace／isasciiの差は0、**確認済み・なし**。空文字列・複数文字・将来Unicode版・任意の文字列全体の正しさまで保証しない。

### リファレンスの完全性・正確性と全ビュー

Pythonの明示ディスパッチ名を、組込み39、str29、list11、dict10、set14、tuple2、range2、具体値を返すmath4の計**111名**として抽出し、全て参照項目へ対応することを確認した。この集合の項目名漏れは**確認済み・なし**。open／str.formatの未対応停止も含めた名前対応の検査であり、111関数すべてを完全に実装しているという意味ではない。属性の既報R7-59、汎用モジュール受付、別名、型の属性、構文、例外等をこの111名で置き換えていない。

一方、項目が存在する組込み型メソッド67項目の掲載例を全件実行し、自身の参照名がscanとtraceに載るか調べたところ、**67件すべてで欠落**した（R7-151）。使用中チップが存在する参照へ誘導できない問題を、項目そのものがない問題と区別している。math.sqrtも同じ画面でリンク欠落を確認したが、残るmath全項目についてこの指摘の67件へ混ぜていない。

Python160項目のうち「対応」とされる**151項目の例を全て実CPythonで実行**し、全151件が終了コード0。期待値の記載は150件で標準出力と一致した。inputの1件は、期待表示に端末で入力した「タロウ」のエコーも含み、stdinパイプによる標準出力だけとは異なる。これを「値の捏造」や誤った期待出力の新規欠陥に数えていない。この151例の実行可能性と掲載値について、新たに確定した誤りは**確認済み・なし**。全書式・全説明・全注意書き・未対応9項目の逐文照合の完了ではない。

参照一覧・教材一覧・用語集を全15種類分再抽出し、用語定義111項目を通読した。追加で確定した用語定義の誤りはない。既報のAHK自動実行（R7-51）と教材語の漏れ（R7-56）は維持する。「111項目を全て一次情報へ逐文照合済み・問題なし」とはしない。今回の一次照合は特にPythonの数値・文字列・イテレータ・例外の記述を進めたもので、他言語の残る定義照合も継続する。

### 教材・画面再現

Python全10教材のタイトル・intro・コードを通読し、全10コードを実CPythonとアプリで再実行した。全10件の出力は一致し、実行エラーなし。**掲載コードの既定実行結果の差は確認済み・なし**。文章中のsplitの戻り値と、関連参照の誤検出は別にR7-149／151として報告する。これにより前節のAHK／UI.Vision／PAD／Power Appsの24教材に加えて、Python10教材の今回確認を追加した。残る教材を省略して104件全ての公式照合が済んだとはしない。

追加17指摘の代表コードをPythonと、CloudFormationの委譲Pythonでも再確認した。共通のCloudFormation手順は、掲載コードを次のhandlerの本文へ4空白でインデントし、モデルは既定のまま実行する。R7-149はPython教材の文面だけを対象とする。

```python
def handler(event, context):
    # ここへ掲載コードを入れる
    return {"requestId": event["requestId"], "status": "success", "fragment": event["fragment"]}
```

代表コードのAPI再実行は計33操作。Chromiumでも同じ33操作と教材2ビューの文面を確認し、pageerror 0。実出力・誤停止の画面とAPIの間に新たな取り違えはなく、**この再現集合での表示一致は確認済み・なし**。画面が示す計算結果や分類が正しいという合格ではない。後から追加したケースのため監査スクリプトがCloudFormation表示のままPython教材を選ぼうとして一度停止したが、種類を戻す手順へ直し、全体を再実行した。古い結果ファイルを再実行成功の証拠にしていない。

ローカル証跡は`/workspace/work/r7f/`の`python-results.json`、`python-more-results.json`、`python-unknown-results.json`、`python-boundary-results.json`、`python-hash-results.json`、`python-exception-results.json`、`unicode-summary.json`、`unicode-differences.json`、`python-name-map.json`、`method-links.json`、`material-native.json`、`template-comparison.json`、`recheck-results.json`、`browser-results.json`。mainへの配信は本報告書だけとし、必要な再現コード・条件・実出力・一次情報を各指摘へ記載する。

## 節目6の追加指摘


### R7-135（P2）any／allが未知要素を既知の真偽へ潰し、到達可能な分岐を落とす

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
x=input()
if any([False,x]):
    print("T")
else:
    print("F")
```

実際：アプリはFの1パスのみ。all([True,x])はTのみ。長さ0〜3、要素False／True／同じ未知x、list／iter、any／allの全160組で32組の到達集合が不足する。

期待：入力が空文字列ならF、非空ならTなので両方を到達可能とするか、正直に未確定として停止する。既知の非決定要素が1つあることは結果確定の根拠にならない。

根拠：[公式any／all](https://docs.python.org/3.12/library/functions.html#any)、[真偽判定](https://docs.python.org/3.12/library/stdtypes.html#truth-value-testing)。同じ未知xを空文字列／非空文字列のinput戻り値へ具体化してCPythonで求めた真偽集合と比較。実装は未知を飛ばした後、known=trueなら全体を既知扱いする。

### R7-136（P2）イテレータを先取り・複写して副作用・消費位置・後続変更を誤る

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
def f(x):
    print(x)
    return x
it=map(f,[1,2])
print("made")
print(next(it))
```

実際：実CPythonは made→1→1、アプリは1→2→made→1。filterも同じ。iter／enumerate／reversed／zipをa=[1,2]から作った後a[1]=9にすると、実物は9を読むがアプリは古い2を読む。zip([1],[2,3],strict=True)は実物で最初のnextが(1,2)を返せるのに作成時にValueError。ジェネレータ式をanyへ渡す場合も、最初の真値で終わらず後続の副作用が出る。

期待：遅延消費と元オブジェクトへの参照を保持するか、その意味論を再現できない組合せで明示停止する。作成時に全要素を確定・消費しない。各関数の別入力を独立欠陥として水増しせず、イテレータの先取りモデルの問題として集約する。

根拠：[公式map／filter／enumerate／zip](https://docs.python.org/3.12/library/functions.html#map)、[共通シーケンスのiterator](https://docs.python.org/3.12/library/stdtypes.html#common-sequence-operations)、[ジェネレータ式](https://docs.python.org/3.12/reference/expressions.html#generator-expressions)。実CPythonとアプリを同一コードで照合。

### R7-137（P2）enumerateのstartがTrueなら0、小数なら切捨て、文字列なら0になる

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print(list(enumerate(["a"], True)))
```

実際：アプリ[(0, 'a')]、実CPython[(1, 'a')]。start=1.5はアプリ1に丸め、start="3"は0に置換するが、どちらも実物はTypeError。

期待：整数として使える値だけをstartとし、boolは整数1／0として扱う。不正型から黙って連番を捏造しない。

根拠：[公式enumerate](https://docs.python.org/3.12/library/functions.html#enumerate)、[整数インデックス契約](https://docs.python.org/3.12/reference/datamodel.html#object.__index__)。CPython実測。実装はisNumならMath.trunc、それ以外0。

### R7-138（P2）roundのbool早期返却とndigitsの型判定が丸め・エラーを誤る

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print(round(True,-1))
```

実際：アプリ1、実CPython0。round(False,"bad")はアプリ0だが実物TypeError。反対にround(1,True)は実物1なのにアプリは桁数が整数でないとしてTypeError。

期待：boolをintの派生型として数値1／0へ扱い、指定桁の丸めと桁数検証を行う。既報R7-17の過剰引数切捨てとは別の、正しい引数個数での型・値の誤り。

根拠：[公式round](https://docs.python.org/3.12/library/functions.html#round)、[boolとint](https://docs.python.org/3.12/library/stdtypes.html#boolean-type-bool)。CPython実測。

### R7-139（P2）sumの補償加算が無限大をnanへ変える

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print(sum([float("inf")]))
```

実際：アプリnan、実CPython inf。[-inf]もnan対-inf、[inf,1]もnan対inf、[1e308,1e308]もnan対inf。

期待：NaNでない無限大の合計を適切に保持するか非有限値が未対応と停止する。補償項のInfinity-Infinityで元の合計を壊さない。

根拠：[公式sum](https://docs.python.org/3.12/library/functions.html#sum)、[float](https://docs.python.org/3.12/library/functions.html#float)。CPython 3.12の実出力を照合。精度改善の補償加算は実装されているが非有限値の分岐がない。

### R7-140（P2）位置引数と同名キーワードの重複を黙って捨てる

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print(sum([1],2,start=3))
```

実際：アプリ3、実CPythonはTypeError。同じ問題はint("10",2,base=8)（アプリ2）、"a,b".split(",",sep=";")、rsplit(",",1,maxsplit=2)にもある。

期待：同じパラメーターを二重に渡した呼出しはTypeErrorまたは未対応停止とし、片方を選んで正常値を作らない。

根拠：[呼出しの引数束縛](https://docs.python.org/3.12/reference/expressions.html#calls)、[sum／int](https://docs.python.org/3.12/library/functions.html#sum)、[split](https://docs.python.org/3.12/library/stdtypes.html#str.split)。実CPythonの4例すべてTypeErrorを確認。

### R7-141（P2）min／maxの複数位置引数形式で禁止されたdefaultを無視する

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print(min(1,2,default=9))
```

実際：アプリ1、実CPythonはCannot specify a default for min() with multiple positional argumentsのTypeError。maxでもアプリ2、実物TypeError。

期待：defaultを受け付けるイテラブル1引数形式と複数値形式を区別する。

根拠：[公式min](https://docs.python.org/3.12/library/functions.html#min)、[max](https://docs.python.org/3.12/library/functions.html#max)。リファレンスの3つの書式にはこの区別があるが、実装はdefaultを空集合の時しか見ない。

### R7-142（P2）list.sortが禁止された位置引数を何個渡しても無視する

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
a=[2,1]
a.sort(9)
print(a)
```

実際：アプリ[1, 2]、実CPythonはsort() takes no positional argumentsのTypeError。0〜4個の位置引数を検査し、1〜4個がアプリで通った。

期待：key／reverseをキーワード専用として検証し、位置引数があれば停止する。R7-18のset／tuple／rangeとは別の、list.sort固有の漏れ。

根拠：[公式list.sort](https://docs.python.org/3.12/library/stdtypes.html#list.sort)。CPython実測と160項目内のlist.sort書式を照合。

### R7-143（P2）list.insertが小数の位置を丸め、型違いにも個数エラーを案内する

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
a=[10,20]
a.insert(1.5,99)
print(a)
```

実際：アプリ[10, 99, 20]、実CPythonはfloat object cannot be interpreted as an integerのTypeError。ソースは小数をMath.truncする。a.insert("1",99)でも、正しく2引数を渡しているのに「引数の数が合いません（番号と値の2個必要）」と案内する。

期待：位置は整数インデックスとして検証し、小数を黙って切り捨てない。型違いは個数でなく位置の型を示す。boolの位置True／Falseは実物・アプリとも正しく1／0になるため、この正常例を欠陥に数えていない。

根拠：[可変シーケンスのinsert](https://docs.python.org/3.12/library/stdtypes.html#mutable-sequence-types)、[__index__](https://docs.python.org/3.12/reference/datamodel.html#object.__index__)。CPython実測。

### R7-144（P2）reversedが逆順走査できないsetやiteratorを正常な列にする

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print(list(reversed(iter([1,2]))))
```

実際：アプリ[2, 1]、実CPythonはlist_iterator object is not reversibleのTypeError。set()もアプリ[]だが実物TypeError。非空setもアプリが内部順序を逆転して値を返す。

期待：任意のiterableを逆順化せず、reversibleな対象を検証する。順序を持たない集合から確定した順序を作らない。

根拠：[公式reversed](https://docs.python.org/3.12/library/functions.html#reversed)。reversedは__reversed__またはシーケンスプロトコルを要求する。今回のlist_iterator／setはいずれも満たさない。

### R7-145（P2）集合演算がハッシュ不能な要素を集合へ入れるか正常に無視する

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print({1}.intersection([[1]]))
```

実際：アプリset()、実CPythonはunhashable type: listのTypeError。union／symmetric_differenceでは{1,[1]}という存在できない集合を作る。difference／intersection_update／difference_updateでも正常結果を作る。8メソッド×list／dictの16入力を比較し、この6メソッドの12入力で不正に継続。update／symmetric_difference_updateの4入力は正しくTypeErrorで停止。

期待：すべての入力要素のハッシュ可能性を検証してから集合演算するか、明示未対応停止とする。集合の表示順が不明という注記では、要素自体が存在できない問題を解消しない。

根拠：[公式集合型](https://docs.python.org/3.12/library/stdtypes.html#set-types-set-frozenset)。実CPython実測。既報R7-19の非iterable引数とは別で、外側は正当なlist、内側要素がハッシュ不能なケース。

### R7-146（P2）startswith／endswithがタプル候補の一致後まで型検査して誤停止する

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print("a".startswith(("a",1)))
```

実際：実CPython True、アプリは2番目候補intのTypeError。endswithも同じ。

期待：先の候補が一致したらTrueを返し、到達しない後続候補の不正型で正しい呼出しを止めない。タプル先頭が不正型なら実物もTypeErrorであり、候補の全不正型を許可すべきという意味ではない。

根拠：[公式startswith](https://docs.python.org/3.12/library/stdtypes.html#str.startswith)、[endswith](https://docs.python.org/3.12/library/stdtypes.html#str.endswith)、[CPython unicodeobject.c](https://github.com/python/cpython/blob/v3.12.0/Objects/unicodeobject.c)のunicode_startswith_impl／unicode_endswith_impl。実CPython実測。

### R7-147（P2）startswith／endswithが逆転した空範囲で空文字列に一致する

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print("a".startswith("",1,0))
```

実際：アプリTrue、実CPython False。endswithも同じ。文字列3種×候補3種×開始7種×終了7種×2メソッドの882組では22組が不一致。

期待：開始・終了を含む範囲指定の意味を保持し、逆転した範囲を空文字列の通常スライスとして一致させない。

根拠：[公式startswith／endswith](https://docs.python.org/3.12/library/stdtypes.html#str.startswith)、[CPythonのtailmatch](https://github.com/python/cpython/blob/v3.12.0/Objects/unicodeobject.c)。実CPython実測。

### R7-148（P2）Unicode分類を一般カテゴリで代用し、7メソッドの真偽を誤る

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print("\u00bc".isdigit())
print("一".isnumeric())
print("\u0345".isalpha())
print("\u0345".isalnum())
print("\u037a".isidentifier())
print("\u00aa".islower())
print("\u01c5".isupper())
```

実際：実CPythonは順にFalse／True／False／False／False／True／False、アプリは全行で逆。分数をdigitにし、漢数字をnumericから外し、結合文字をalpha／alnumにし、NFKC後に識別子にならない文字を許し、Other_LowercaseやTitlecaseの分類も誤る。

期待：Numeric_Type、Pythonの文字カテゴリ、XID／NFKC、cased文字等の各メソッド固有規則を適用する。対応できなければ未確定・未対応停止とし、具体的な逆のBooleanを教えない。

根拠：[公式文字列分類](https://docs.python.org/3.12/library/stdtypes.html#str.isdigit)、[識別子の規則](https://docs.python.org/3.12/reference/lexical_analysis.html#identifiers)。代表7行はアプリAPIと実CPythonで再現。Unicodeバージョン差だけの候補は欠陥件数へ加算していない。

### R7-149（P3）文字列教材がsplitの戻り値を新しい文字列とも説明する

対象：Pythonのテンプレート／リファレンス。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print(type("2026-11-10".split("-")).__name__)
```

実際：Python教材tpl-stringsのintroは「splitの結果はリスト」と正しく説明した後、掲載したメソッドについて「新しい文字列を戻り値として返します」と一律に述べる。アプリ・実CPythonとも掲載確認コードはlist、教材のpartsもlist。リファレンスstr.splitのreturnsは正しくlistであり、ビュー間で説明が矛盾する。

期待：不変性の説明と戻り値の型を分け、strip／join／replaceはstr、splitはlistと説明する。教材のコード実行自体の誤りとはしない。

根拠：[公式str.split](https://docs.python.org/3.12/library/stdtypes.html#str.split)、[str.join](https://docs.python.org/3.12/library/stdtypes.html#str.join)、固定対象のtpl-stringsとstr.splitリファレンス。

### R7-150（P2）例外の継承関係を見ず、親型exceptの見逃しとExceptionの過剰捕捉が起きる

対象：Python／CloudFormationの委譲Python。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
try:
    raise KeyError("x")
except LookupError:
    print("caught")
print("after")
```

実際：実CPythonはcaught→after、アプリはKeyErrorで停止。参照される25例外型×25ハンドラの625組を照合し12組が不一致。LookupErrorのKeyError／IndexError、ArithmeticErrorのZeroDivisionError／OverflowError、ImportErrorのModuleNotFoundError、OSErrorのFileNotFoundError、RuntimeErrorのNotImplementedError／RecursionError、ValueErrorのUnicodeErrorを捕まえない。反対にexcept ExceptionはBaseException／KeyboardInterrupt／SystemExitまで捕まえて正常継続する。

期待：宣言した例外階層に従って、派生型を親型ハンドラへ一致させる。Exceptionに派生しない終了・割込み等をExceptionで消さない。

根拠：[公式例外階層](https://docs.python.org/3.12/library/exceptions.html#exception-hierarchy)、[exceptの照合](https://docs.python.org/3.12/reference/compound_stmts.html#except-clause)。CPython 3.12.14の全625組と比較。実装は型名の完全一致とException／BaseExceptionの無条件一致だけで判定している。

### R7-151（P3）メソッドの参照リンクを全て落とし、教材ではprintからintを誤検出する

対象：Pythonの実行・リファレンス・教材の対応。再現：ee01f07でPythonを選び、既定モデルで次を入力して実行する。CloudFormationの委譲部分は、コードをhandler(event, context)の本文へインデントして入れ、最後に正常応答を返す手順も後述の共通条件で再確認した。R7-149は文面の再現を実際欄に記載する。

```python
print("a,b".split(","))
```

実際：リファレンスにstr.splitがあるのに、コード全体のscanも実行後の使用中チップもprintだけ。対応する組込み型メソッド67項目の掲載例を全件検査し、67件すべてで自身の参照名がscan・traceから欠ける。tpl-stringsの関連項目はprint／intのみで、strip／split／join／replaceが出ず、呼んでいないintが現れる。Python10教材中、実際にintを呼ぶのはCSV教材だけだが、全10教材の関連項目にintが入る。

期待：実際の呼出し対象を型付きの参照名へ解決し、使用したメソッドへの参照を表示する。printの部分文字列intを呼出しとして数えない。項目自体が存在しないR7-59とは別の、存在する項目へ各ビューから到達するための対応の欠陥。

根拠：[公式str.split](https://docs.python.org/3.12/library/stdtypes.html#str.split)、固定対象のPythonリファレンス67項目・scan／normalize／templates.refs。属性名splitをstr.splitへ解決せず完全名一致で落とし、教材側はcode.includes("int(")でprint(を一致させる。API全67例、実画面の使用中・教材説明で照合。

## 節目6の残作業

**観点1〜8は引き続き未完了。** 既存の種類別台帳・全15種類・104教材・978参照項目・111用語・全ビューを維持する。Pythonを深く確認した節目であり、他の種類を監査対象から外したものではない。

| 観点 | 今回の進捗 | 残作業 |
|---|---|---|
| 1 一次情報 | CPythonと2597入力、文字分類の全単一コードポイント集合、例外階層、Python公式資料 | 全15種類の残る関数・構文・型・書式と実製品差。外部ランタイムのない領域は公式資料・SDK・ソースの判定と区別 |
| 2 宣言 | 対応する例外型・メソッドと誤挙動、名前111件の項目対応、対応151例の実行 | DEVELOPMENT.md全宣言の双方向対応表、汎用受理・型属性・既知の範囲外入力の正直な停止 |
| 3 パス・状態・表示 | 未知の真偽の全160組、イテレータの副作用・参照・消費、親例外型と到達分岐 | 他言語を含む全分岐制約、前節の保存・旧版データ移行・交差編集の未確認経路 |
| 4 cmd／PowerShell | 既報の実Windows連結echo等を保持 | 残る全引数・展開段階・パイプライン・表示書式・停止理由。今回追加のWindows試験は行っていない |
| 5 完全性・正確性 | Python111名の対応、67メソッドの全ビュー解決漏れ、151例、111用語の通読 | 全978項目の逐文・期待値・範囲宣言、全実装名／属性／変数／別名の完全対応、用語の一次逐文照合・教材語・ビュー間矛盾 |
| 6 全関数の境界等 | 例外625全組、prefix882全組、未知真偽160全組、型・引数・非有限値・イテレータ等 | 各関数の各引数位置・全型・空集合・大値・null相当・過不足・副作用・入れ子・連鎖・パイプライン。今回の有限集合で代替しない |
| 7 104教材・全停止理由 | Python10教材の文面と両ランタイム全実行、insertの偽の個数エラー、誤った例外停止 | 前節までの未照合教材・全エンジンの全停止理由、期待される未対応停止の再現 |
| 8 文面・a11y・劣化・性能 | 説明の戻り値矛盾、関連／使用中リンク、33画面実行＋教材2ビュー | 全文面・aria・ラベル・全フォーカス経路、実容量枯渇、キャッシュ世代、最重入力探索とWindows UI性能。以前のWindows性能実測は保持 |

Excel VBA、ImageJ、CloudFormation、PAD、AutoHotkey、UI.Vision、Power Apps、Python、R、C、C++、C#、JavaScript、cmd、PowerShellの未了事項は全て継続する。Pythonについても、関数／クラス／例外の残る構文・特殊メソッド・キーワード束縛・未知値・巨大値・可変オブジェクト・全エラー理由は未了。正しく動いた具体例の数から、これらを合格へ変えていない。

実Excel／Canvas／PAD／AWS／UI.Visionの製品セッション、実スクリーンリーダー、Safari／Firefox／iOS実機、ImageJのGUI全経路は環境・接続がなく未実施。Windows CIで追加可能な作業は未実施として残し、不可能と書き換えていない。Linux実測からWindowsの実時間を捏造しない。

使用量・回数制限の通知は受けていない。リセット権は使っておらず、リセット時刻の通知もないので推測しない。この節目は未完了報告であり、全範囲完了や欠陥収束の宣言ではない。
