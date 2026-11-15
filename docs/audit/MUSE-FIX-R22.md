# Muse 修正報告書：第22ラウンド（MUSE-FIX-R22）

- 実施：2026-11-15、Muse 側（修正コーディネーター＋領域別5班：cmd／PowerShell／既存種類／UI・保存／監査基盤）
- 対象：`findings-round22-solo.md` の新規欠陥31件（R22-N1〜N31、P1×1／P2×9／P3×21）。ベースは GitHub main コミット `9b25da5`（全15種類、テスト1,308件合格のツリー）。
- 結果：**全31件を実装で処置。格下げ（正直な未対応化）0件、保留0件、非欠陥裁定0件。** 未確認候補19件には触れていない（現行挙動を維持）。
- テスト：1,308件 → **1,410件・全合格（fail 0）**。内訳：新規回帰テスト78件（cmd 36／PowerShell 20／既存種類 13／UI 9）＋ブラインド fixture 編入24件。
- precache は全変更の最後に再生成し、`node scripts/precache.mjs --check` 通過。
- 台帳（`docs/audit/muse/consolidated-residual-register.md`）に RG-87〜RG-115 を新設し、R22-N20 を RG-78 への追加表面として記録。累計は元項目247件・115グループ。
- 宣言（`docs/DEVELOPMENT.md`）は cmd 節・PowerShell 節を実装に合わせて更新（その他の種類は既存宣言と修正後挙動の一致を確認し無変更）。

## 項目ごとの処置と根拠

### cmd（R22-N1〜N11、全件実装）

| 項目 | 処置 | 根拠・内容 |
|---|---|---|
| N1（P1） | 実装 | 動的変数の解決を `dynamicValue()` に共通化し、%形（読み取り時）と !形（実行時）が同じ規則を使うよう統一。同名環境変数が影、未定義なら ERRORLEVEL＝現在の終了コード、CD＝現在のフォルダ、RANDOM／DATE／TIME は実行時に決まる値。Microsoft Learn「cmd」の動的変数と遅延展開の定義。再現4件すべて期待値どおり（EL=9／`C:\Practice\logs`／set /a で 11／for 内 call 後も正値） |
| N2 | 実装 | `percent()` で `%%`→`%` に畳む（`7%%3`→1、`echo 100%%`→`100%`）。`%%<文字>` と `%%~` は for 変数参照として保持し for 処理は無傷。単一%形の引数展開（`%3`＝第3引数）は実バッチの正規の意味論のため維持し、「正規綴りだけが失敗する逆転」を解消 |
| N3 | 実装 | `type`／`cd` の引数を trim（`cd` は `/d` 除去後も）。パイプ前後の空白も解消。`dir` のパターンも `words()` トークン化経由にし末尾空白を吸収 |
| N4 | 実装 | `dir /b /s` を実装：対象フォルダ以下をモデル順に再帰列挙しフルパス出力、trace と ERRORLEVEL も付与。`/s` 単独は従来どおり「/b 形式のみ」で正直に停止、未知オプションはオプション名を挙げて停止 |
| N5 | 実装 | 根本原因は「展開後の値に含まれる `&`／`|` が再解析で区切りと誤認される」こと。未知値用スロット機構を拡張し、構造文字を含む既知の値もプレースホルダ経由で運ぶよう変更。`set "X=a & b"`／`set "X=a|b"` の後 `echo [%X%]` が `[a & b]`／`[a|b]` を出力。Microsoft Learn「set」の正規形 |
| N6 | 実装 | 単独括弧ブロックを、ブロック全体への遅延展開適用より前に振り分け、ブロック内各コマンドが自身の実行時に !展開するよう変更（% は読み取り時のまま） |
| N7 | 実装 | for 基本リストの分割を `forItems()` に分離し、区切りを空白・カンマ・セミコロン・イコールに拡張（引用符内は保護） |
| N8 | 実装 | `practice.cmd` のハードコードを削除。`%0`／`%~0` は「実行時に決まる：バッチファイル名（%0）」の未知値とし、全出現が同一 id を共有（`if "%0"=="%0"` が単一パスで真） |
| N9 | 実装 | `del` は対象を解決し（未知なら「未確認」で停止）、一致0件なら「モデルに削除対象のファイルがありません：<対象>」で実行エラー停止。終了状態の ERRORLEVEL は既存ランタイム機構により「実行時に決まる：失敗したコマンドの終了コード（未確認）」と表示。実 ERRORLEVEL の数値は一次情報で未確定のため作っていない（DEVELOPMENT.md にも明記）。DEVELOPMENT 自身の規則との内部整合が根拠 |
| N10 | 実装 | find は未対応オプションを先に検出し「未対応：findのオプション /n」のように名指しで停止（引用なし文字列の場合は従来の引用エラーが残る） |
| N11 | 実装 | コマンド後段の `<>|` チェックを引用符・キャレットを尊重する `hasBareSpecial()` に変更。`echo "a | b"`／`echo "a > b"` がリテラル出力に（set /a のビット演算 `|` は無傷） |

### PowerShell（R22-N12〜N18、全件実装）

| 項目 | 処置 | 根拠・内容 |
|---|---|---|
| N12（P2） | 実装 | `binary()` に `*` の繰返し分岐を追加。`"abc" * 2`→`abcabc`、`"5" * 2`→`55`（黙った誤答を解消）、`@(1,2) * 2`→`1,2,1,2`。右辺の小数→整数変換は .NET の最近接・偶数側丸め、負の回数とモデル上限超過は明示停止。複合代入 `*=` も同経路。Microsoft Learn `about_Arithmetic_Operators` |
| N13（P2） | 実装 | `property()` の FileInfo 等向け「実行時に決まる値」フォールバックを削除し、未知プロパティは PSCustomObject と同じく決定的に $null。`Select-Object Bogus`→全件 `Bogus : $null`、`Where-Object { $_.Bogus -eq $null }`→単一パス・全件通過。モデルに明示された未確定値（内容未指定ファイルの Length 等）は従来どおり保持 |
| N14 | 実装 | 右辺が配列で左辺がスカラー／$null のとき、`-eq`→False、`-ne`→True、$null 対配列の順序比較→False（それ以外の非 $null スカラー対配列の順序比較は従来どおり正直に未対応停止）。Microsoft Learn `about_Comparison_Operators` のコレクション比較規則。DEVELOPMENT.md の対応範囲側へ明記 |
| N15 | 実装 | New-Item に `-Name` を実装（`-Path` 省略時は現在フォルダを親として結合）。`-Path.` の汎用エラーは、引数モードで `.`／`..` をパス文字列として受理するよう parser を直し、対象パスを解決した名指しエラーに改善。残る汎用パースエラーもパラメーター値の文脈で包んで名指し化 |
| N16 | 実装 | parser の `expr()` に前置ノード `pre` を追加し、engine で「更新後の値を返す」意味論を実装（後置は従来どおり旧値）。文としての単独前置は出力抑制、for 更新子・短絡評価・Select -First の副作用検出にも `pre` を含めた |
| N17 | 実装 | parser のパラメーター解析で値のないパラメーターを検出し「未対応のパラメーター：Get-ChildItem -bogus」とコマンド名＋パラメーター名で停止するよう統一 |
| N18 | 実装 | parser の `pipeline()` で `|` の後に改行トークンを読み飛ばすよう変更。式ステージ・コマンドステージ間・複数段・空行挟み・代入右辺・条件内でも継続可能 |

### 既存13種類（R22-N19〜N23、全件実装）

| 項目 | 処置 | 根拠・内容 |
|---|---|---|
| N19（P2） | 実装 | パーサに `starHead` フラグを導入し、表示位置（タプル・集合表示、代入／return 右辺の並び）の要素先頭でのみ `*` を許可。二項演算子直後等では SyntaxError「「*」はここでは使えません」。評価側に展開可能性チェックを追加し、確定した非イテラブルへの展開は TypeError で停止（`print(*2)` の無言消滅、`[1, *2]` の未知値化を解消）。正当なアンパック・`*args`・`**` は不変。CPython 3.12 の文法・意味論が根拠 |
| N20（P2） | 実装（RG-78 への追加表面） | 共有パーサ `simple()` の終端チェックが次のトークンを未対応として名指していたのが根本原因。C ファミリ側で終端チェック由来のエラーだけを「; が必要です」（SyntaxError）へ変換。文内部の正直な未対応（例：`switch`）は従来文面を維持。再現4件＋複合代入形が全て真因表示に |
| N21 | 実装 | C# のクラス本体ループに `<eof>` チェックを追加し、修飾子直後・型直後で入力が終わる形も含め「} が必要です」で停止（生 TypeError の露出を解消）。C／C++ 経路は不変 |
| N22（P2） | 実装 | `typeOf` の二項ノードで、C#（managed）の場合に `+` のどちらかが string なら結果型を `string` と伝播（従来は C++ のみ）。`"x" + 1 + 2`→`x12`、`"x" + 1 + 'c'`→`x1c`。`"x" - 1` の型エラー、C／C++ の挙動は不変。C# 仕様の左結合・文字列変換が根拠 |
| N23 | 実装 | Power Automate「Set variable」で target 欠落／空 →「Set variable には変数名（target）が必要です」、value 欠落（キー自体なし）→「Set variable には値（value）が必要です」で停止。幻の変数 `undefined` は生成されない。明示的な `0`／`false`／`null`／`""` は従来どおり設定可能。Microsoft Learn の変数アクション（変数名・値は必須）が根拠 |

### UI・保存（R22-N24〜N27、全件実装）

| 項目 | 処置 | 根拠・内容 |
|---|---|---|
| N24（P2） | 実装 | 原因を実測で確定：`details` の内容は `::details-content` ラッパー（display:block）に包まれるため、パネルへの flex 指定が `.model-body` に届いていなかった。`@media (min-width:761px)` 内で `.model-panel::details-content` を flex column（flex:1／min-height:0／overflow:hidden）化、summary を `flex-shrink:0` で固定、`.model-body` を唯一の内部スクロール領域にし、リセット行は `.model-body` 内で sticky にして見出し直下に保持（HTML 構造は不変で RG-37 を維持）。Playwright＋Chromium で幅761〜1440・シート版／JSON版とも、フォーカス後もパネル scrollTop=0・見出しとリセットが常時カード内にあることを確認。375px は従来どおり |
| N25 | 実装 | 切り離し判定を純関数 `templateSelectionAfterChange()` に切り出し、一回限りの保持フラグを導入。明示的選択直後は選択表示と解説を維持し、その後の追加編集では従来どおり「なし」へ切り離す。種類切替時の復元は `restoredTemplateSelection()` で記録済みの選択を維持。実ブラウザで再選択・種類往復・後続編集の切り離しまで確認 |
| N26 | 実装 | (1) テンプレート集の副題を「小さなマクロから、ひとつずつ。」→「小さなコードから、ひとつずつ。」へ。(2) 空結果文言を「該当する項目はありません。」に全3箇所統一。(3) caution が空のリファレンスでは要素自体を描画しない条件付き描画へ（実ブラウザで javascript 25件中 `.caution` は2件のみ・空要素0件を確認） |
| N27 | 実装 | 移行判定を純関数 `parseLegacyV2(raw)` に切り出し（empty／drafts／recovery の3値）。パース失敗時も原文を `programming-practice-recovery-v2` へ保全し、保全書き込み自体の失敗時は v3 と同様に `storageBlocked` を立てる。実ブラウザで `"{bad"` の保全、形式不正の保全（従来挙動）、正常な v2 の移行をすべて確認 |

### 監査基盤（R22-N28〜N31、全件実装）

| 項目 | 処置 | 根拠・内容 |
|---|---|---|
| N28 | 実装 | `tests/extension-audit.py` の種類数14固定を廃止。レジストリ定義数を node で動的取得し、期待値＝定義数＋1（ダミー）とした（現行は定義15→期待16）。この VM には Playwright／chromium が無く実行確認は不可（`ModuleNotFoundError` で即死することを確認済み）。py_compile と導出ロジックの単体確認で担保 |
| N29 | 実装 | `tests/shell-native-audit.py` に期待総数の導出（PowerShell 102＝fixture 57＋教材45、cmd 47＝ケース13＋教材34、計149）と `expected_*／skipped_*` の出力フィールドを追加。未実施がある場合は stderr 警告＋`passed:false`＋非0終了（`--require-both` の有無にかかわらず）。両ランタイムがある場合の挙動（Windows CI の必須ジョブ）は不変。この VM で修正後実測：skipped 149 明示・exit 1 |
| N30 | 実装 | `tests/native-audit.py`／`tests/native-r3.py` に `Csharp_expected／Csharp_skipped`（native-r3 は `Csharp_executed` も）を追加し、未実施時は stderr に警告。期待件数は定義側から数える（native-audit 17件＝テンプレート6＋参照例11、native-r3 3件）。exit コードは現行維持（0）。CI への setup-dotnet 追加は下記「要別途配信」参照 |
| N31 | 実装 | ブラインド fixture へ cmd／PowerShell の基本形24件を編入：`audit-blind.json` ＋10件（各5）、`audit-blind-r3.json` ＋10件（各5）、`audit-templates.json` ＋4件（実在テンプレート cmd-calculate／cmd-subroutine／ps-values／ps-function）。期待値はアプリ出力から写さず Microsoft Learn の意味論から独立に導出し、全24件が導出どおり合格（落選・期待値の曲げゼロ）。係争中の表面（遅延展開の動的変数、文字列×整数、`%%` 剰余等）は回避。`tests/browser-audit.py` の分岐サンプル辞書にも両種を追加（未知入力で実際に2パスになることをエンジンで事前確認） |

## 統合側の独立検証（コーディネーター実施）

- 5ブランチを統合したツリーで `npm test` 全件：**1,410件・全合格**（各ブランチの申告件数の合算と一致）。
- 既知の環境依存フレーク（本修正とは無関係）：`tests/cmd.test.js`／`tests/powershell.test.js` のパス上限テスト2件は、エンジンへ実時間 10,000ms の予算を渡して2,000パス列挙を検証するため、VM の CPU スロットリング下では予算内に列挙が終わらず断続的に失敗する。**修正前のベースツリー（9b25da5 スナップショット）でも同一条件で同じ2件が失敗することを対照確認済み**であり、本バッチの変更による退行ではない。通常負荷時は統合ツリーで 1,410/1,410 合格（所要13秒）を記録している。恒常対策（予算の CPU 時間化やテスト側の余裕拡大）は本バッチの対象外として申し送る。
- 主要再現ケースを統合側で再実行して是正を確認：N1（`EL=9`）、N2（`7%%3`→1、`100%%`→`100%`）、N12（`"5" * 2`→`55`）、N14（`$null -eq @()`→False で正常評価）、N19（SyntaxError／TypeError の正直な停止と正当なアンパックの維持）、N20（「; が必要です」）、N21（「} が必要です」）、N22（`"x12"`）。
- 基盤スクリプトを統合ツリーで実測：`shell-native-audit.py` は skipped 149 明示・exit 1、`native-audit.py` は Csharp_expected 17／skipped 17 の明示＋stderr 警告・exit 0。修正した Python 5本はすべて py_compile 合格。
- N24／N25／N26／N27 は担当班が Playwright＋Chromium（ヘッドレス）で修正前再現→修正後解消を実測済み（幅761〜1440、375px、種類往復、v2 正常系／形式不正系を含む）。

## 変更ファイル一覧（27件）

- アプリ本体：`index.html`、`style.css`、`js/app.js`、`js/core/c-family.js`、`js/types/cmd/engine.js`、`js/types/cmd/index.js`、`js/types/powershell/engine.js`、`js/types/powershell/parser.js`、`js/types/powershell/index.js`、`js/types/python/engine.js`、`js/types/powerautomate/index.js`、`precache.js`（再生成）
- 宣言・台帳・本報告書：`docs/DEVELOPMENT.md`、`docs/audit/muse/consolidated-residual-register.md`、`docs/audit/MUSE-FIX-R22.md`（本ファイル）
- テスト・監査基盤：`tests/muse-fix-r22-cmd.test.js`（新規36件）、`tests/muse-fix-r22-ps.test.js`（新規20件）、`tests/muse-fix-r22-existing.test.js`（新規13件）、`tests/muse-fix-r22-ui.test.js`（新規9件）、`tests/fixtures/audit-blind.json`、`tests/fixtures/audit-blind-r3.json`、`tests/fixtures/audit-templates.json`、`tests/browser-audit.py`、`tests/extension-audit.py`、`tests/shell-native-audit.py`、`tests/native-audit.py`、`tests/native-r3.py`

## 格下げ・保留にした項目

**なし。** 全31件を実装で処置した。一次情報で確定できない数値（R22-N9 の del 失敗時の実 ERRORLEVEL 値）は捏造せず「未確認」表示とし、DEVELOPMENT.md と台帳 RG-95 にその旨を明記した（これは格下げではなく、宣言済みの失敗時規則への一致）。

## 要別途配信（CI ワークフローの変更）

`.github/workflows/` は push-files で書けないため、本バッチでは変更していない。配信時に以下の変更を別途行うこと。

対象ファイル：`.github/workflows/pages.yml`、validate ジョブ。現行は setup-dotnet が無く、ubuntu-latest ランナーイメージ標準搭載の .NET SDK への暗黙依存になっている（イメージ変更で C# の native 照合17件＋3件が無言スキップへ逆戻りする構造）。`actions/setup-node` ステップの直後、`npm test` より前に次を追加すること：

```yaml
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.0.x"
```

## 申し送り

- `PROGRESS.md` の「dotnetがあればC#全16例も」という記述（92〜93行目等）は現行の17件（テンプレート6＋参照例11）とずれている。PROGRESS.md は履歴文書のため本バッチでは編集していない。次回 PROGRESS 更新時に合わせて是正されたい。
- R22-N28（extension-audit.py）はこの VM に Playwright／chromium が無く実行確認ができていない。ブラウザのある環境での実行確認が残件。
- 実ブラウザでのオフライン再読込（監査の E-02 実地部分）は本バッチの対象外（監査側の残件として継続）。
