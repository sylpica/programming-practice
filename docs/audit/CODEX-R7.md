# Codex R7 独立監査 — ee01f07（節目1・未完了）

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
