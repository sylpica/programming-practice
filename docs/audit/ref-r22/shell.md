# リファレンス完全性修正 R22 — cmd／PowerShell 裁定記録

- 対象報告書：`reference-completeness-round22.md` の cmd 節・PowerShell 節（§5 の cmd／PowerShell 分を含む）
- 変更ファイル：`js/types/cmd/index.js`、`js/types/powershell/index.js`、新規テスト `tests/muse-fix-ref-shell.test.js`
- 抽出成果物：`docs/audit/ref-r22/shell-r6.json`（38行＝cmd 11行＋PowerShell 27行。ビルド後の定義オブジェクトから node スクリプトで抽出）
- 追加後のリファレンス総数：cmd 28件（従前26件＋新規2件）、PowerShell 45件（従前37件＋新規8件）
- 検証：`node --test tests/audit.test.js` 全673件合格（新規項目の使用例を含む自種分エラーなし）、`node --test tests/muse-fix-ref-shell.test.js` 3件合格

## cmd

| 対象 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| `set /p`（第1層） | 独立項目を追加 | `set /a` が独立項目である前例に倣う。scan も `set /p` を当該項目へ寄せるよう拡張し、テンプレート cmd-input の refs にも追加 | Microsoft Learn「set」コマンド（/p の書式・Enter のみの入力では変数が変わらない仕様） https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/set_1 |
| 動的変数5件 `%ERRORLEVEL%`・`%CD%`・`%RANDOM%`・`%DATE%`・`%TIME%`（第1層） | 1項目「動的変数」に束ねて追加。各名を項目名相当の構文行と本文に明記 | エンジン `dynamicValue` の実装どおり、%RANDOM%／%DATE%／%TIME% は実行時に決まる値、%ERRORLEVEL%／%CD% は同名環境変数が優先される規則を本文に明記。scan が5名いずれの出現でも「動的変数」へ到達することをテストで確認。あわせて既存「変数展開」項目の本文にも動的変数への言及を追記 | Microsoft Learn「cmd」コマンド（動的環境変数の一覧と、同名環境変数を定義すると動的値が隠れる仕様） https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd |
| `%0`（第2層） | `call` 項目の本文に追記 | %0 はバッチファイル自身の名前。モデルでは実行時に決まる値として扱う旨（semantics の宣言と一致）を明記 | Microsoft Learn「call」コマンド https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/call |
| `if` 演算子列挙（§5） | `if` 項目の本文に追記 | 実装が処理する ==・EQU・NEQ・LSS・LEQ・GTR・GEQ・exist・defined・errorlevel・not・/I を全て列挙 | Microsoft Learn「if」コマンド https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/if |
| `setlocal` の DisableDelayedExpansion（§5） | `setlocal` 項目の構文行に追記 | 実装（engine の setlocal 処理）が受理する形式を構文行へ反映 | Microsoft Learn「setlocal」コマンド https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setlocal |
| 別名5種（到達可能性） | 正名項目の本文に別名を追記 | chdir→`cd` 項目、mkdir→`md` 項目、rmdir→`rd` 項目、erase→`del` 項目、rename→`ren` 項目。scan は従前から別名を正名へ寄せるため、本文追記で検索到達性も改善 | Microsoft Learn 各コマンドページ（cd／md／rd／del／ren。いずれも別名が公式に併記される） https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cd |

## PowerShell

| 対象 | 裁定 | 理由 | 一次情報の根拠 |
|---|---|---|---|
| 自動変数 `$_` | 個別項目を追加 | パイプラインの現在項目。$PSItem と同値である旨を明記 | Microsoft Learn about_Automatic_Variables https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-7.4 |
| 自動変数 `$PSItem` | 個別項目を追加 | $_ と同値である旨を明記 | 同上 |
| 自動変数 `$?` | 個別項目を追加 | 直前のコマンド／パイプラインの成否を保持 | 同上 |
| 自動変数 `$LASTEXITCODE` | 個別項目を追加 | モデルでは外部プログラムを実行しないため、明示した初期値のみ保持する旨を明記（DEVELOPMENT.md の宣言と一致） | 同上 |
| 自動変数 `$args` | 個別項目を追加 | 関数の余分な引数を保持（engine が `args` へ格納する実装に対応） | 同上 |
| 型変換（キャスト）5型 `[string]`・`[bool]`／`[boolean]`・`[int]`／`[int32]`・`[double]`・`[pscustomobject]`（第1層） | 1項目「型変換（キャスト）」に束ねて追加。各型名（別表記を含む全7表記）を構文・本文に明記 | parser の cast 解析と engine の変換処理に対応。テンプレート ps-transform が使う [pscustomobject] も含む | Microsoft Learn about_Type_Operators https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_type_operators?view=powershell-7.4 |
| 論理演算子4形 `-and`・`-or`・`-not`・`!`（第1層） | 独立項目「論理演算子」を追加 | 既存の唯一の演算子項目「比較演算子」は比較のみで論理を含まないため分離 | Microsoft Learn about_Logical_Operators https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_logical_operators?view=powershell-7.4 |
| 算術・代入演算子11形 `+`・`-`・`*`・`/`・`%`・`+=`・`-=`・`*=`・`/=`・`++`・`--`（第2層） | 1項目「算術・代入演算子」に束ねて追加。全11形を構文行に明記 | parser／engine の実装に対応。++／-- はモデル対応範囲として後置形式である旨を本文に明記 | Microsoft Learn about_Arithmetic_Operators／about_Assignment_Operators https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_arithmetic_operators?view=powershell-7.4 |
| 定数 `$true`・`$false`（第2層） | `変数` 項目の本文に `$null` と並べて追記 | 自動変数として about_Automatic_Variables に定義される定数であり、変数の項目で $null と並記するのが学習者の到達経路として自然なため | Microsoft Learn about_Automatic_Variables／about_Variables https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_variables?view=powershell-7.4 |
| コマンドレットの追加パラメーター（§5） | 各項目の本文に「実装されている追加パラメーター」を追記 | engine の known パラメーター表に基づく：Get-ChildItem=-Recurse／-File／-Directory、Select-Object=-ExpandProperty／-Last／-Skip、Write-Host=-Separator、Set-Content／Add-Content=-NoNewline、Measure-Object=-Average／-Maximum／-Minimum、New-Item=-Force／-Value、Remove-Item=-Force、Copy-Item=-Force、Move-Item=-Force | Microsoft Learn 各コマンドレットページ（Get-ChildItem 等） https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem?view=powershell-7.4 |
| 別名23種（到達可能性） | 正名項目の本文に別名を追記（全名列挙は下記） | engine の alias 表の全23種を、正名項目の本文へ漏れなく記載。テストで全名の出現を機械確認 | Microsoft Learn about_Aliases／各コマンドレットページ https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_aliases?view=powershell-7.4 |

### PowerShell 別名23種と追記先（全名列挙）

| 別名 | 正名（追記先項目） |
|---|---|
| echo | Write-Output |
| gci | Get-ChildItem |
| ls | Get-ChildItem |
| dir | Get-ChildItem |
| where | Where-Object |
| ? | Where-Object |
| foreach | ForEach-Object |
| % | ForEach-Object |
| select | Select-Object |
| sort | Sort-Object |
| measure | Measure-Object |
| cd | Set-Location |
| pwd | Get-Location |
| cat | Get-Content |
| gc | Get-Content |
| sc | Set-Content |
| ac | Add-Content |
| ni | New-Item |
| ri | Remove-Item |
| rm | Remove-Item |
| ren | Rename-Item |
| cp | Copy-Item |
| mv | Move-Item |

## 裁定の内訳

- cmd：第1層6件（set /p 1件＋動的変数5件）→ 新規2項目で処置。第2層1件（%0）→ 本文追記。§5 2件（if 演算子列挙、setlocal 構文）→ 追記。別名5種 → 本文追記。
- PowerShell：第1層14名（自動変数5件＋キャスト5型＋論理演算子4形）→ 新規8項目で処置。第2層13件（算術・代入11形＋定数2件）→ 新規1項目（算術・代入演算子。上の新規8項目に含む）＋本文追記で処置。§5 1群（追加パラメーター）→ 対象10項目の本文へ追記。別名23種 → 本文追記。
- 新規項目の合計：cmd 2件＋PowerShell 8件＝10件。本文・構文を変更した既存項目：cmd 9件＋PowerShell 19件＝28件。shell-r6.json は新規・変更の全38項目分を収録。
