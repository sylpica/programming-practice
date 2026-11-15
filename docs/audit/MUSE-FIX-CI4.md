# Muse 修正報告書（CI是正：修正バッチ7の実シェル食い違い2件）

対象：修正バッチ7の配信コミット `b77ea21` に対する GitHub Actions の
validate-shells ジョブ失敗（ステップ「Compare shell cases with real
PowerShell and cmd」＝ `python tests/shell-native-audit.py --require-both`）。
失敗は PowerShell フィクスチャの2件で、いずれも修正バッチ7自身の
裁定ミス（RG-242／RG-244）である。validate ジョブ（npm test＋
native-audit）は成功していた。
台帳グループ：RG-262（文字列への `++`／`--`）、RG-263（括弧なし属性名）。
累計は 1,113件／263グループ。

## 失敗内容（一次情報）

`tests/shell-native-audit.py` の照合形式は CI3 報告書のとおりで、
成功側フィクスチャで実 PowerShell がエラーを返した場合は失敗として
記録される。同フィクスチャは `tests/powershell.test.js` がシミュレータの
単体テストにも使うため、期待値はシミュレータ側の主張を表す。

1. ケース `string increment converts to number`：プログラム
   `$s='5'`／`$s++`／`Write-Output $s`
   - **実 PowerShell の実測 = エラー**（"The '++' operator works only on
     numbers. The operand is a 'System.String'."、出力なし）
   - **シミュレータ側の主張 = "6"**（RG-242 の数値変換）
2. ケース `bare parameter attribute`：プログラム
   `function f { param([Parameter] $x) $x }`／`f 42`
   - **実 PowerShell の実測 = エラー**（"Cannot process argument
     transformation on parameter 'x'. Cannot convert the "42" value of
     type "System.Int32" to type
     "System.Management.Automation.ParameterAttribute"."）
   - **シミュレータ側の主張 = "42"**（RG-244 の属性解釈）

## どちらが誤りか（証拠による確定）

2件とも誤りはシミュレータ側（エンジン／パーサ＋フィクスチャ期待値）
である。根拠は次のとおり。

1. **実シェルの実測**：上記 CI ランで実 pwsh が両ケースともエラーを
   返した。エラーメッセージ自体が規則を述べている（`++` は数値専用で
   文字列は不可／`[Parameter]` は ParameterAttribute 型への変換として
   束縛される）。
2. **変更履歴**：両フィクスチャは修正バッチ7（0664d89）が RG-242／
   RG-244 の裁定に基づき成功ケースとして追加したもので、実シェル
   照合の最終確認は CI 委任とされていた（修正バッチ7報告書 §4）。
   その CI が裁定の誤りを確定させた。
3. **裁定の誤りの内訳**：RG-242 は about_Assignment_Operators の
   「数値であるか数値へ変換可能」という記述と `--`／`+=` との非対称を
   根拠にしたが、実物は変換可能な数値文字列でも演算子エラーにする
   （内部整合性の推論より実測が優先する）。なお R28-N4 の元の所見
   （文字列連結化）も誤りであり、正解は「エラー停止」である。
   RG-244 は文法 B.2.4 の attribute に引数なしの形があるという読みを
   根拠にしたが、実パーサは param 位置の括弧なし角括弧を型リテラル
   として解釈する（属性として扱われるのは括弧つきの形だけである）。

## 根本修正

### RG-262：`incDec()` の是正（`js/types/powershell/engine.js`）

保持値が文字列なら、`++`／`--` の双方を値の変換を試みずに演算子
エラーで停止させる（`++演算子は文字列には使えません`／
`--演算子は文字列には使えません`、カテゴリ RuntimeException）。
旧実装は `++` が専用の数値変換経路、`--` が `binary("-")` 経由で、
どちらも数値文字列を数値化していた（'5'++ → 6、'5'-- → 4）。
判定は保持値の型のみで行うため、代入時に数値へ変換済みの保持値
（`[int]` 束縛の '5' 等）は数値として従来どおり増減する。
RG-242 のコメントは実測根拠つきの正しい規則へ書き換えた。

### RG-263：括弧なし属性名の型リテラル化（parser＋engine）

- `js/types/powershell/parser.js` の `parameters()`：RG-244 の特別扱い
  （parameter／cmdletbinding の読み飛ばし、validatenotnull 系の検証
  属性記録、allow 系の受理）を撤回し、括弧なしグループは他の型名と
  同様に型制約として保持する（既存ループの last-wins のまま）。
- `js/types/powershell/engine.js` のキャスト評価：既知の属性名8種
  （Parameter／ValidateNotNull／ValidateNotNullOrEmpty／
  ValidateNotNullOrWhitespace／AllowNull／AllowEmptyString／
  AllowEmptyCollection／CmdletBinding）に対応する型
  `System.Management.Automation.<名前>Attribute` への変換規則を
  追加した。$null はそのまま $null、非 $null 値は引数変換エラー
  （`引数変換エラー：値を <完全型名> へ変換できません：<値>`、
  カテゴリ ParameterBindingException）で停止する。実装場所を束縛
  経路でなくキャスト評価に置いたのは、束縛経路が既にキャスト評価を
  経由しており、束縛・既定値・単独キャスト式の全経路を単一規則で
  裁定できるためであり、`[int]`・`[BogusType]` の既存文言がすべて
  キャスト側から出ている流儀とも一致する。代償としてパラメータ名
  （実物の "on parameter 'x'"）は再現しない。
- 括弧つき `[Parameter(...)]` 属性と未知の型名 `[BogusType]` の
  「未対応の型変換」は不変。parser が validateNotNull を立てる経路は
  括弧なし検証属性だけだったため、是正後は常に false になる（engine
  側の検証チェックは到達不能になるが無害なため残置）。

### 照合ケース側の扱い（判断と証拠）

2件を成功側フィクスチャ `tests/fixtures/powershell-cases.json` から
削除し（77→75件）、エラー側フィクスチャ
`tests/fixtures/powershell-error-cases.json` へ3件を追加した
（3→6件。文字列 `++`／`--` の2件＋括弧なし属性の1件）。
これは照合の弱体化ではない。エラー側フィクスチャは双方向検証であり
（実シェルがエラーになること＋シミュレータがパターンに一致する原因
で停止することの両方を要求する）、実シェル側のエラーは当該 CI 自身が
実測したものである。PowerShell フィクスチャの総数は 80→81件、
`expected_total` は 188→189件へ増えており、照合の件数・方法は
減らしていない（件数はフィクスチャから導出されるため自動追随する）。
照合スクリプト `tests/shell-native-audit.py` 自体は無変更である。

同様に、誤った裁定を固定していた単体テストを是正した：
`tests/muse-fix-batch7-ps.test.js` の R28-N4 節（文字列への `++`／`--`
は演算子エラーへ全面書き換え）、R28-N5 節の `$h.'k'++` 行、
R28-N6 節（型リテラル＋引数変換エラーへ書き換え）。いずれもテスト名・
コメントに CI是正（RG-262／RG-263）である旨を明記した。

### 波及是正

`tests/muse-fix-batch6-ps.test.js` の R27-N3 節の対照
「変換可能な文字列変数への後置 -- は従来どおり動作する
（`$x='5'; $y=$x--` → 5, 4）」も RG-242 と同じ誤裁定を固定していた
ため、演算子エラーの期待へ書き換えた（同根箇所はこの1件のみ）。

## 兄弟表面のプローブ結果

### RG-262（文字列への `++`／`--`）

保持値が文字列の表面は、代入先の形状・前置後置を問わずすべて単一の
`incDec()` を通るため、全表面が一括して演算子エラーになった
（修正後の実走で一致を確認。停止時に保持値は書き換わらない）。

| 形状 | 実挙動 | 修正前 | 修正後 |
|---|---|---|---|
| 変数・前置／後置（'5'） | エラー | 6／4 | 演算子エラー |
| '5.5'／'-3'／'abc'／'' | エラー（値によらず） | 数値化または変換エラー | 演算子エラー（変換エラーにしない） |
| 後置の式位置 `Write-Output ($s++)` | エラー・出力なし | "5" を出力 | エラー・出力なし |
| メンバー／引用符付きメンバー／PSCustomObject／添字 | エラー | 6／4 | 演算子エラー |
| `param([string]$s)` 束縛・`[string]` キャスト代入 | エラー（保持値は文字列） | 6／4 | 演算子エラー |
| `param([int]$x='5')`／`[int]` キャスト代入 | 6／4（保持値は数値） | 6／4 | 6／4（不変） |
| 数値・小数の `++`／`--`、`$s += 1` → "51" | 従来どおり | 一致 | 一致（不変） |

対象外とした表面：文頭の型付き宣言 `[string]$s='5'` は、シミュレータの
現行到達範囲では代入文自体が SyntaxError で停止し保持値が作られない
（incDec 以前の既存制限。本件の根とは別のため現行維持し、回帰テストで
注記つきで固定）。文字列でない保持値（$null・真偽値・配列・
ハッシュテーブル）への `++`／`--` は実測根拠が文字列分のみのため
現行維持し、回帰テストで固定した（配列 `++` の連結と `--` の変換
エラーの非対称を含む）。

### RG-263（括弧なし属性名）

| 形状 | 実挙動 | 修正前 | 修正後 |
|---|---|---|---|
| `param([Parameter] $x)`、`f 42` | 引数変換エラー（**CI実測**） | `42` を出力 | 引数変換エラー ✓ |
| 他属性名7種の括弧なし形＋非 $null | 同規則（外挿・未確認） | 出力（属性として受理等） | 引数変換エラー |
| `param([Parameter] $x = 9)`、引数なし | 既定値への変換は実シェル未確認 | `9` を出力 | 引数変換エラー（既定値にも変換を適用する既存束縛仕様の帰結） |
| 引数なし・既定値なし／`f $null`／既定値 $null | $null 通過 | $null | $null（不変） |
| `[Parameter] [string] $x`／`[string] [Parameter] $x` | 実シェル未測定（未確認） | 両方とも出力 | last-wins の帰結：前者は正常、後者は引数変換エラー |
| 単独キャスト `([Parameter]42)`／`[ParameterAttribute]`／完全修飾表記 | 同規則（外挿・未確認） | 「未対応の型変換」 | 引数変換エラー |
| `[Parameter()]`／`[Parameter(Mandatory=$true)]`／`[BogusType]` | 従来どおり | 一致 | 一致（不変） |
| 文位置 `[CmdletBinding] param(...)` | 実シェル未確認 | 出力 | 不変（関数属性の位置で型変換経路を通らないため） |

## 回帰テスト

- `tests/muse-fix-ci4-inc.test.js`（5件、新規）：文字列 `++`／`--` の
  全代入先形状・前置後置・型付き束縛と、文字列でない保持値の現行
  挙動の保存を固定する。
- `tests/muse-fix-ci4-attr.test.js`（7件、新規）：括弧なし属性名8種・
  既定値・$null 通過・複数括弧・単独キャスト・対照の保存を固定する。
- 是正した既存テスト：`tests/muse-fix-batch7-ps.test.js`
  （R28-N4／N5／N6 節）、`tests/muse-fix-batch6-ps.test.js`
  （R27-N3 節の対照）。
- エラー側フィクスチャのシミュレータ側照合は
  `tests/muse-fix-batch4-ps.test.js` が6件全件を自動で担う。

## 検証結果

- `npm test`：**3,732件全件合格**（3,722 − 成功フィクスチャ2件 +
  新規12件。失敗・スキップなし）。
- `python3 tests/native-audit.py`（標準入力 EOF、dotnet を PATH に
  含む）：**exit 0**。要約 `{"checks": 351,
  "C_CPP_stdout_matches_simulator": true, "Csharp_native_execution": 59,
  "Csharp_expected": 59, "Csharp_skipped": 0,
  "Csharp_compiler_available": true, "python_execution": 215}`、
  末尾の native-r3.py も `all_passed: true`。
- `tests/shell-native-audit.py` は当 VM に実シェル（pwsh／cmd.exe）が
  ないため全件スキップとなり、ローカルでは実行できない。要約の
  `expected_total: 189`、`expected_powershell: 140`（フィクスチャ81件＋
  教材59件）が正しく導出されることは確認した。実シェル照合の再確認は
  次回 Windows CI に委ねられる。ただし本件の実測値は当該 CI 自身が
  出したものであり、修正はその実測に一致させてある。
- 独立検証（別コピー・独自プローブ）：ベース（0664d89）で両ケースの
  誤出力（"6"／"42"）が再現し、統合ツリーで両ケースが主張文言どおりの
  エラーで停止することを確認。独自プローブ47件が全件合格（連結で作った
  文字列・二重引用符文字列への `++`、小数の前置 `--` 等の班テストに無い
  形状を含む）、エラー側フィクスチャ6件の実走も6/6合格、PowerShell
  関連テスト 219/219 合格。**差し戻しゼロ**。検証報告は
  `verification-ci4.md`（監査ワークスペース）。
- precache は全変更の最後に再生成し `node scripts/precache.mjs
  --check` 通過。

## 変更ファイル

- `js/types/powershell/engine.js`（`incDec()` の是正＋属性型への変換規則）
- `js/types/powershell/parser.js`（`parameters()` の RG-244 特別扱いの撤回）
- `tests/fixtures/powershell-cases.json`（誤フィクスチャ2件を削除）
- `tests/fixtures/powershell-error-cases.json`（エラーケース3件を追加）
- `tests/muse-fix-batch7-ps.test.js`（R28-N4／N5／N6 節の期待値を是正）
- `tests/muse-fix-batch6-ps.test.js`（R27-N3 節の同根対照を波及是正）
- `tests/muse-fix-ci4-inc.test.js`（回帰テスト5件、新規）
- `tests/muse-fix-ci4-attr.test.js`（回帰テスト7件、新規）
- `precache.js`（再生成）
- `PROGRESS.md`（現行状態の数値を更新：テスト3,732件、台帳1,113件／263グループ）
- `docs/audit/muse/consolidated-residual-register.md`（RG-262〜RG-263 を登録）
- `docs/audit/MUSE-FIX-CI4.md`（本報告書）

## 未確認事項

- RG-263 の棚卸しで「外挿・未確認」「実シェル未確認」とした形状
  （Parameter 以外の属性名の括弧なし形、既定値への束縛時変換、
  複数括弧の組合せ、文位置の括弧なし `[CmdletBinding]`、単独キャスト
  形）は、実 PowerShell での追加実測が望ましい。特に複数括弧の
  last-wins はシミュレータ既存規則の帰結であり、実物が複数の型
  リテラルをどう扱うかは未測定である。
- RG-262 の文字列でない保持値（$null・真偽値・配列・ハッシュ
  テーブル）への `++`／`--` は、実測根拠が無いため現行挙動を維持
  した。これも実シェルでの追加実測が望ましい。
- CI ランナーの pwsh の正確なバージョン番号は未確認（CI3 と同様）。
  両規則ともエラーメッセージの文言自体が CI ログに残っており、
  是正の成否はバージョンに依存しない。
- 実 Windows での再照合（validate-shells ジョブの通過）は、配信後の
  次回 CI で確認される事項であり、本報告書の時点では未実施。
