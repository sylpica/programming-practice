# Muse 修正報告書（第9バッチ：CI 実シェル照合の是正）

対象：修正バッチ2の配信コミット `8b0abc2` に対する GitHub Actions ラン #22
の validate-shells ジョブ失敗（ステップ「Compare shell cases with real
PowerShell and cmd」＝ `python tests/shell-native-audit.py --require-both`）。
validate ジョブ（npm test＋native-audit）は成功していた。
台帳グループ：RG-164（元項目 1件）。累計は 954件／164グループ。

## 失敗内容（一次情報）

CI ログの要約は `{"native_shell_checks": 164, "powershell": 115, "cmd": 49,
"passed": false}` で、AssertionError は
`[["null foreach scalar", ["0"], ["1"]]]` の1件のみだった。

`tests/shell-native-audit.py` のアサーション形式を確認した。PowerShell
フィクスチャの失敗は `(name, actual, expected[0])` の形で記録され、
`actual` は実 PowerShell（pwsh）の実行結果文字列、`expected[0]` は
フィクスチャ `tests/fixtures/powershell-cases.json` の期待値である。
同フィクスチャは `tests/powershell.test.js` がシミュレータの単体テストにも
使うため、期待値はシミュレータ側の主張を表す。よって本件は：

- ケース `null foreach scalar`：プログラム
  `$n=0;foreach($x in $null){$n++};$n`
- **実 PowerShell の実測 = "0"**（foreach 本体は0回）
- **シミュレータ側の主張 = "1"**（本体を1回実行し、$x に $null を入れる）

## どちらが誤りか（証拠による確定）

誤りはシミュレータ側（エンジン＋フィクスチャ期待値）である。根拠は3点。

1. **一次情報（言語仕様）**：Microsoft Learn の PowerShell 言語仕様
   第8章 §8.4.4「The foreach statement」は次のとおり定める。
   "If pipeline designates a scalar (excluding the value $null) instead of
   a collection, that scalar is treated as a collection of one element.
   If pipeline designates the value $null, pipeline is treated as a
   collection of zero elements."
   すなわち、スカラーは（$null を除き）1要素、**$null は0要素**。
2. **実シェルの実測**：上記 CI ランで実 pwsh が "0" を返した（164件中
   本件のみ不一致）。
3. **変更履歴**：バッチ2以前のフィクスチャ期待値は "0" であった
   （base スナップショット 4a528db）。修正バッチ2（e034e57）が
   funcheck の SH-P6 裁定に基づき、エンジンとフィクスチャ期待値の
   両方を「1回実行」へ変更したものが本件である。

SH-P6 の裁定が誤った理由：根拠とされた about_Foreach には $null の
反復回数の定めがない。$null を1オブジェクトとして扱う記述は
about_Automatic_Variables の $null 節にあるが、それは
(a)「コレクションに**含まれる** $null は1オブジェクトとして数える」
（＝ `@($null)` のように要素である場合）と、
(b)「$null を ForEach-Object コマンドレットへパイプすると値が生成される」
（＝パイプライン側の列挙）についてのものであり、foreach **文** が
コレクションとして $null 自体を指定する場合には適用されない。
foreach 文とパイプラインは $null の扱いが非対称であり、SH-P6 は
パイプライン側の規則を文側へ取り違えた。

## 根本修正

`js/types/powershell/engine.js` の `loop()` における foreach 文の
要素計算だけを変更した（`enumerate()` やパイプライン側は変更しない）。

- 式が指定する値（expressionValue）が配列なら従来どおりその要素、
  $null 以外のスカラーなら1要素、**$null／undefined（出力なし＝
  AutomationNull を含む）なら0要素**とした。
- コマンド収集の結果（expressionValue を持たない経路）では、収集値が
  **単一の $null のとき0要素**とした。パイプラインが指定する値が
  $null である以上、言語仕様の0要素規則がそのまま適用される。
  これにより、`@($null)` を返す関数（パイプラインで展開され単一の
  $null 出力になる）も0回になる一方、明示式 `@($null)` と `@(F)` は
  配列として1回を維持する。

副次的に解消する誤り：0回反復ではループ変数へ代入が起きないため、
`$x=9;foreach($x in $null){};$x` が実挙動どおり 9 を保持する
（従来は $null で上書きされ、後続の `$null -eq $x` まで誤っていた）。

### 照合ケース側の扱い（判断と証拠）

フィクスチャ `null foreach scalar` の期待値を "1" → "0" へ戻した。
これは照合の弱体化ではない。当該期待値はバッチ2で誤った裁定に基づき
変更されたものであり、正値は言語仕様 §8.4.4・実シェルの実測・
バッチ2以前の期待値の三者が一致する "0" である。照合スクリプト
`tests/shell-native-audit.py` 自体は無変更であり、照合の件数・方法は
一切減らしていない。同様に、欠陥側の期待値を固定していた単体テスト
（`tests/muse-fix-batch2-fc-shell.test.js` の SH-P6 テスト）も、
正しい挙動（$null リテラル／$null 変数とも0回）へ是正し、
RG-164 による裁定是正である旨をテスト名とコメントに明記した。

## 兄弟表面のプローブ結果

修正前後で、foreach 文の全入口形状とパイプライン側の列挙を
シミュレータで全数プローブし、実挙動（言語仕様および CI で
照合済みのフィクスチャ）と突き合わせた。

foreach 文（修正前 → 修正後）：

| 形状 | 実挙動 | 修正前 | 修正後 |
|---|---|---|---|
| `foreach($x in $null)` | 0回 | 1回 ✗ | 0回 |
| $null を保持する変数／未定義変数／括弧式 `($null)` | 0回 | 1回 ✗ | 0回 |
| $null を返す関数（素・括弧・変数経由） | 0回 | 1回 ✗ | 0回 |
| `@($null)` を返す関数（展開され単一 $null 出力） | 0回 | 1回 ✗ | 0回 |
| 出力のない関数 | 0回 | 0回 | 0回 |
| `@()`／`@($null)`／`@(1,$null,2)`／`$null,$null` | 0／1／3／2回 | 一致 | 一致 |
| スカラー（5／0／$false／$true／""／文字列／ハッシュテーブル） | 1回 | 一致 | 一致 |
| `@(F)`（F は $null を返す） | 1回 | 一致 | 一致 |
| ループ変数の保持（0回時は旧値、通常時は最終要素） | 保持 | $null で上書き ✗ | 保持 |

パイプライン側（全て修正前から一致し、変更していない）：

| 形状 | 実挙動 | シミュレータ |
|---|---|---|
| `$null \| ForEach-Object {1}` | 1回（出力 1） | 一致 |
| $null 変数／`@($null)` のパイプ | 1回 | 一致 |
| `@() \| ForEach-Object {1}` | 0回 | 一致 |
| `1,$null,2 \| ForEach-Object` の回数 | 3回 | 一致 |
| `$null \| Where-Object {$true} \| ForEach-Object {1}` | 1回 | 一致 |
| `$null.Count`／`@($null).Count` | 0／1 | 一致 |

対象外とした表面：単項カンマ `,@($null)` は従来どおり未対応の構文
として SyntaxError で正直に停止する（黙った誤値ではない）。本件の根
（$null コレクション意味論）とは別の未実装構文であり、RG-164 の
範囲には含めない。

## 回帰テスト

`tests/muse-fix-ci3.test.js`（6件）を新設した。当 VM でも落ちる
単体レベルで、$null の全入口形状の0回反復、ループ変数の保持、
スカラー1回・配列要素ごとの保存、パイプライン側の非対称の保存を
固定する。修正前は6件中4件が失敗し、修正後は全件合格することを
確認した（保存側の2件は修正前から合格）。

## 検証結果

- `npm test`：**2,500件全件合格**（2,494＋新規6。失敗・スキップなし）。
- `python3 tests/native-audit.py`（標準入力 EOF、dotnet を PATH に
  含む）：**exit 0**。要約 `{"checks": 303,
  "C_CPP_stdout_matches_simulator": true, "Csharp_native_execution": 59,
  "Csharp_expected": 59, "Csharp_skipped": 0,
  "Csharp_compiler_available": true, "python_execution": 167}`、
  末尾の native-r3.py も `all_passed: true`。
- `tests/shell-native-audit.py` は当 VM に実シェル（pwsh／cmd.exe）が
  ないため R22-N29 のとおり全件スキップとなり、ローカルでは実行
  できない。実シェル照合の再確認は次回 Windows CI に委ねられる。
  ただし本件の実測値 "0" は当該 CI 自身が出したものであり、修正は
  その実測と言語仕様の両方に一致させてある。
- precache は全変更の最後に再生成し `node scripts/precache.mjs
  --check` 通過。

## 変更ファイル

- `js/types/powershell/engine.js`（foreach 文の要素計算と裁定コメント）
- `tests/fixtures/powershell-cases.json`（`null foreach scalar` の
  期待値を "0" へ復元）
- `tests/muse-fix-batch2-fc-shell.test.js`（SH-P6 テストの期待値を是正）
- `tests/muse-fix-ci3.test.js`（回帰テスト6件、新規）
- `precache.js`（再生成）
- `PROGRESS.md`（現行状態の数値を更新：テスト2,500件、台帳954件／164グループ）
- `docs/audit/muse/consolidated-residual-register.md`（RG-164 を登録）
- `docs/audit/MUSE-FIX-CI3.md`（本報告書）

## 未確認事項

- CI ランナーの pwsh の正確なバージョン番号は未確認（ログ要約には
  含まれない）。foreach 文の $null 規則は言語仕様で定められ、
  Windows PowerShell 5.1／PowerShell 7 の双方で同一であるため、
  是正の成否はバージョンに依存しない。
- 実 Windows での再照合（validate-shells ジョブの通過）は、配信後の
  次回 CI で確認される事項であり、本報告書の時点では未実施。
