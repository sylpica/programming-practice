# MUSE-FIX-REF：リファレンス完全性修正 報告書（2026-11-15）

第22ラウンド付随監査（`reference-completeness-round22.md`）で検出された関数リファレンスの漏れを、全件裁定して修正した記録。台帳では RG-116〜RG-135（20グループ）、項目ごとの一次情報の照合記録は `docs/audit/MUSE-REF-R22.md`（各班の原記録は `docs/audit/ref-r22/`）。

## 対象と裁定の内訳

対象は監査報告書の **464名（第1層368名＋第2層96名）**、同報告書 §5 の文面不整合（Power Apps／R／VBA／PowerShell／cmd 分）、および報告書が「漏れに数えなかった」領域（Python のフォールバック受理群、ImageJ の Dialog.*／SIM_EXTRA、Power Apps の保留中だった書式変更提案）。全件を次のいずれかで処置した。

| 裁定 | 件数（名数ベース） | 内容 |
|---|---:|---|
| 項目追加（個別） | 343名 | 宣言範囲内・実装あり・テンプレート使用ありの名前を個別項目として新設（うち25名は監査の名数外＝Python 例外クラス） |
| 項目追加（束ね） | 137名 | AutoHotkey A_* 110件（＋A_Index は個別化）、cmd 動的変数5件、PowerShell のキャスト5型・論理演算子4形・算術代入演算子11形、Power Apps in／exactin 2件を、6件の束ね項目で新設。いずれも各名前から項目へ到達できることを確認（AHK は scan の別名解決を実装しテストで固定、cmd は scan 到達をテストで確認） |
| 本文・書式の追記是正 | 7名＋§5・別名・パラメーター群 | else（C／C++／C#）・%0・Loop Until・$true／$false 等は親項目への追記で解消。§5 の文面是正（Power Apps 6区分8項目、R 5件、VBA Replace、cmd if／setlocal、PowerShell の実装済み追加パラメーター）、別名の本文追記（cmd 5種、PowerShell 23種）を含む。照合個票の変更行は47行 |
| 意図的除外の宣言化 | 1名 | JavaScript `length`：refs 除外をテストで明示検証している設計判断に基づき、項目化せず DEVELOPMENT.md に意図的除外として宣言 |
| 宣言化裁定（項目化せず） | 70名 | Python のフォールバック受理のみの組み込み29件と TYPE_ATTRS メソッド41件（監査の名数外）：専用実装がなく未対応として停止する実態と項目化が矛盾するため、DEVELOPMENT.md に対応範囲外として全名を宣言 |
| 非漏れ裁定 | 7名 | ImageJ SIM_EXTRA のみ6件（監査の名数外。実装なし・正直に停止）、C++ cin（getline 項目への明記で足りる） |

- Python 例外クラス25件は、報告書では備考（フォールバック）扱いだったが、raise 文と try のハンドラ照合で種類名として実処理されるため項目追加に裁定した（上の「項目追加（個別）」に含む）。
- Power Apps の保留中だった書式変更提案（Text の書式引数、LookUp の第3引数、And／Or／Not の関数形）は、And／Or／Not を項目追加、Text／LookUp 等を書式是正として、照合個票の更新とセットで処置した（RG-128／RG-129）。

## 項目数の変化

- 総数：**511件 → 978件（対応917／参照専用61）**（参照専用の内訳は不変。全追加は対応項目）。
- 種類別：Excel VBA 66→90、ImageJ 141→200、CloudFormation 49→171（固有7→11＋Python委譲42→160）、Power Automate 14→15、AutoHotkey 17→26、UI.Vision 18→22、Power Apps 23→28、Python 42→160、R 23→44、C 9→26、C++ 10→31、C# 11→53、JavaScript 25→39、cmd 26→28、PowerShell 37→45。
- 新規項目は349件（相異なる項目）。Python の新規118件は CloudFormation のリファレンスにも複製されるため、アプリ総数の増分は467件。
- 照合個票：`docs/audit/reference-r2.json` 448行→905行、`docs/audit/reference-r6.json` 63行→73行。いずれもビルド後の定義オブジェクトから抽出して生成し、報告書の round3 照合テスト（全項目の文面一致）で検証済み。

## 品質確認

- 追加・変更した全項目について、宣言＝文面＝実装挙動の3点一致を確認。対応項目の使用例はテスト（`tests/audit.test.js`）が全件をエンジンで実実行し、エラーなしを確認する仕組みで担保した。Python の新規119項目は expected と実出力の一致まで個別に実実行確認した。
- 全テスト：**1,410件 → 2,041件**。全件実行で全合格（fail 0）を確認した。パス上限の実時間予算テスト2件はベースラインでも負荷により断続的に落ちる既知の事象で、確認のための再実行では1件が落ちたが、単独再実行では2件とも合格した（負荷起因であり本修正との関連はない）。
- 件数ピンの追随：`tests/muse-fix-r22-ui.test.js` の総数ピン 511→978。`tests/muse-fix-ui.test.js` の RG-29 legacyLinks ピン 87→93（増加6件は A_Index／PI／return／TypeError／$／NA の項目新設により、テンプレート解説文中の正当な言及がリンク化されたもの。全件をベースラインとの差分で確認し、midWord は0のまま）。
- precache は全変更の最後に再生成し、`node scripts/precache.mjs --check` を通過した。
- DEVELOPMENT.md は最終状態に同期した（種類別表の件数、C の unsigned 宣言の陳腐化是正、Python フォールバック群と JavaScript length の宣言、完全性修正の節を新設）。

## 変更ファイル一覧（43件）

- リファレンス本体：`js/content.js`（VBA）、`js/core/c-family.js`（C系共有行）、`js/types/imagej/reference-data.js`、`js/types/python/reference.js`、`js/types/cmd/index.js`、`js/types/powershell/index.js`、`js/types/cloudformation/index.js`、`js/types/autohotkey/index.js`、`js/types/javascript/index.js`、`js/types/powerapps/index.js`、`js/types/powerautomate/index.js`、`js/types/uivision/index.js`、`js/types/r/index.js`
- 詳細（returns／source 等）の追加：`js/types/vba/reference-details.js`、`js/types/imagej/reference-details.js`、`js/types/cloudformation/reference-details.js`、`js/types/autohotkey/reference-details.js`、`js/types/c/reference-details.js`、`js/types/cpp/reference-details.js`、`js/types/csharp/reference-details.js`、`js/types/javascript/reference-details.js`、`js/types/powerapps/reference-details.js`、`js/types/powerautomate/reference-details.js`、`js/types/uivision/reference-details.js`、`js/types/r/reference-details.js`
- 付随の最小修正：`js/types/imagej/engine.js`（PI の case 追加）、`js/types/imagej/index.js`（exampleSetup の hasOwnProperty 化）、`js/types/python/index.js`（with の注記の出し分け）
- テスト：新規 `tests/muse-fix-ref-vba.test.js`、`tests/muse-fix-ref-imagej.test.js`、`tests/muse-fix-ref-python.test.js`、`tests/muse-fix-ref-ahk.test.js`、`tests/muse-fix-ref-cfamily.test.js`、`tests/muse-fix-ref-misc.test.js`、`tests/muse-fix-ref-shell.test.js`、ピン更新 `tests/muse-fix-r22-ui.test.js`、`tests/muse-fix-ui.test.js`
- 文書・記録：`docs/DEVELOPMENT.md`、`docs/audit/reference-r2.json`、`docs/audit/reference-r6.json`、`docs/audit/MUSE-REF-R22.md`、`docs/audit/MUSE-FIX-REF.md`、`docs/audit/muse/consolidated-residual-register.md`、`docs/audit/ref-r22/`（各班の原記録14ファイル）
- 生成物：`precache.js`

## 判断に迷って独自に決めた点

1. **ImageJ の PI への engine case 追加**：報告書は PI を「実装あり」としていたが、実際はパーサの括弧省略変換で PI が0引数呼び出し化し未対応で停止していた。項目の使用例を実行可能にするため、同種の組み込み変数（nImages 等）の既存体裁に合わせて `case "PI"` を追加した。リファレンス追加に必要な最小限と判断したが、エンジン変更であるため明記する。同様に exampleSetup の参照が項目名 `toString` で Object.prototype を拾う問題も、hasOwnProperty 判定への是正で解消した。
2. **Python 例外クラス25件の項目化**：報告書の分類（備考）より一段強く、実処理（raise／try 照合）があることを根拠に項目化した。
3. **Python フォールバック群70件の宣言化**：項目化すると「対応している」という誤った宣言になるため、項目化せず未対応範囲の宣言に留めた。
4. **VBA 第2層の個別項目化**：名前解決が項目名との完全一致方式のため、束ね項目では使用中チップに解決できない。解決機構の新設より個別項目化を選んだ（新カテゴリ「定数」「演算子」「文」を新設）。
5. **C# 静的メンバー定数19件の個別項目化** と、C系の記号形式4件（キャスト、三項演算子、参照、文字列補間）を日本語の construct 名の項目としたこと（記号形式はトークナイザ／AST が refs を持たないため自動解決の対象外である旨を個票に記録）。
6. **JavaScript length の宣言化**：テストが refs 除外を明示検証していることを意図的除外の根拠とした。
7. **R のデータフレームへの要素演算**：固有の名前がないため独立項目にせず、学習者の到達先である data.frame 項目への追記で処置した。
8. **Power Automate Else if の追加方式**：パレットには加えず、UI.Vision の Number と同じ参照専用の追加方式とした（palette と reference が同一ソースのため、分類経路のみで現れる名前の扱いとして整合）。
9. **reference-r2.json の sha256**：導出方式（fields をキーソートした JSON の sha256）を特定し、新規・変更行に適用した。既存行のうち7行は本修正以前から再計算値と一致していない（過去の編集で sha が追随しなかったもの）。テストは sha256 を参照しないため、既存行はそのまま残し、個票に記録した。

## 申し送り（本修正では直さなかったもの）

- **C# の符号なし型の代入変換の制限**：`byte n = 200;` 等、符号付き対応型の範囲を超える値の代入がモデルで停止する（実 C# では有効）。エンジン挙動の変更を伴うため本修正では直さず、該当項目の注意書きに明記した。欠陥として扱うかは次回監査の判断に委ねる。
- **演算子・添字等の名前解決の仕組み制約**：R の `[`／`$`、JavaScript の BigInt リテラル等、一部の項目はトークナイザ／AST が refs を持たないため使用中チップには現れない（リファレンス一覧からの検索では到達可能）。項目ごとに個票へ記録した。
- **ImageJ Math.sinh／cosh／tanh**：公式 Web カタログの Math 節に個別見出しが確認できなかったため、定義に基づく説明で項目化し、出典の版情報は付けていない（個票に明記）。
