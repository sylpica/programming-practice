# FIX-PS-A2 修正報告書（$$／$^ の扱いの是正）

- 担当: 修正チーム FIX-PS-A2（高度A3班）
- 土台: lane-a3-exec（HEAD 04dfe2d）の作業コピー lane-a3-fix-psa2 に、先行する FIX-PS-A（lane-a3-fix-psa）の変更を取り込んだうえで、コーディネーター裁定により $$／$^ の是正方向を変更したもの。
- 裁定（コーディネーター）: 未検証の自動変数は「ラベルつき未確定値を返す」が本アプリの一貫した設計であり、裸形 `$$`／`$^` のパーサ拒否だけが異常である。$$／$^ は**未検証のまま**とし、裸形も波括弧形 `${$}`／`${^}` と同じ未検証応答（未確定値）に届くよう是正する。FIX-PS-A の「裸形の名指し未対応停止」は取り消して置き換える。
- 一次情報: Microsoft Learn about_Automatic_Variables（$$／$^ はセッションが受け取った最後の行の最後／最初のトークンを保持する自動変数）。
- **注意: この VM に実 pwsh は存在しないため、期待値は一次情報と既存テストの固定からの導出であり、実機実測ではない。**

## 1. 取り込んだ FIX-PS-A 変更の一覧

FIX-PS-A の報告書 `docs/audit/lane-a3-fix-psa.md` と lane-a3-exec との diff で変更ファイルを特定し、全て自ツリーへ反映した（取り込み方法と検証は §5）。

| # | 内容 | ファイル |
|---|---|---|
| D1 | 単項 -join の既定区切りを空白 `" "` から空文字列へ是正（Learn about_Join） | `js/types/powershell/engine-advanced-ops.js` |
| D2 | `??` の連鎖（右結合）と三項 else 枝の `??`、`nullCoalAhead` ガード、三項直後の `??` 折り返し | `js/types/powershell/parser.js` |
| D3 | `-f` の優先順位を 50 → 55 へ是正（Learn about_Operator_Precedence） | `js/types/powershell/parser.js` |
| D6 | -replace の `${名前}` 置換を .NET 規則へ是正（数字のみ→番号グループ、未知の名前→リテラル保持） | `js/types/powershell/engine-advanced-ops.js` |
| D5／D10 | 複合演算子・リダイレクト（`&&`／`||`／`??=`／`>`／`>>`／`2>`／`2>>`／`2>&1`）の名指し停止（`compoundOperatorAt`／`failCompoundOperator`） | `js/types/powershell/parser.js` |
| 既存テスト是正 | `tests/adv-b3-ps-operators.test.js` の単項 -join 期待値 `"a b"` → `"ab"`（根拠コメント付記） | `tests/adv-b3-ps-operators.test.js` |
| 回帰テスト | FIX-PS-A の回帰テスト 8 件（うち $$／$^ の1件は §2 のとおり本チームで置き換え） | `tests/lane-a3-psa.test.js` |

FIX-PS-A の $$／$^ 変更（裸形を名指し未対応停止にする）**以外**は全て維持した。宣言側（reference の status／caution）は FIX-PS-B の担当であり、本修正でも変更していない。precache.js は再生成していない。

## 2. $$／$^ の是正（本チームの変更）

### 機序
- 波括弧形 `${$}`／`${^}` は、トークナイザの波括弧分岐が var トークン（v = `"$"`／`"^"`）を発行し、高度エンジンの AUTOVARS（`engine-advanced-vars.js`）に既存の未検証ハンドラ（キー `"$"`／`"^"`、`unk(...)`）へ到達して、`$PID`／`$PSHOME` と同じ「実行時に決まる：未検証：…」というラベルつき未確定値を返してきた。既存テスト `tests/adv-b3-powershell.test.js`（environment-dependent automatic variables are unverified unknowns）もこの分類を固定している。
- 裸形だけは字句規則が `$`／`^` を受理せず、統合ツリーでは汎用文言「未対応：このPowerShell変数の形式」で停止し、FIX-PS-A はこれを「未対応：$$（対話行入力の状態はモデルに無いため）」という名指し未対応停止へ変えていた。

### 変更（parser.js トークナイザの `$` 分岐のみ）
- FIX-PS-A の名指し未対応停止ブロックを取り消し、代わりに裸形の2文字目が `$`／`^` の場合、波括弧形と**同一の var トークン**（v = `"$"`／`"^"`）を発行して変数参照として受理するようにした。これにより裸形は追加の分岐なしに、波括弧形と全く同じ経路で AUTOVARS の未検証ハンドラへ到達する（簡易モードでの到達先も波括弧形と同一になる）。
- AUTOVARS・engine 側のハンドラには一切触れていない（未検証のまま）。

### 修正後プローブ（自ツリー実測）
| 入力 | 結果 |
|---|---|
| `Write-Output $$` | `実行時に決まる：未検証：$$ は直前のコマンド行の最後のトークンであり、セッション履歴はモデルに保持されていないため確定できません`（エラーなし） |
| `Write-Output $^` | `実行時に決まる：未検証：$^ は直前のコマンド行の最初のトークンであり、セッション履歴はモデルに保持されていないため確定できません`（エラーなし） |
| `Write-Output ${$}`／`Write-Output ${^}` | 上記裸形と**完全同一**の出力 |
| `Write-Output ($$)`／`Write-Output ($^)`（式位置） | 同じ未検証応答 |
| `$$`／`$^`（単独文） | 同じ未検証応答 |
| `Write-Output $$.Length` | `実行時に決まる：プロパティ Length`（未確定値へのメンバーアクセスとして従来どおり伝播） |
| `Write-Output $?`／`$PID`／`$PSHOME` | 不変（`True`／各未検証応答） |

## 3. 回帰テスト

- `tests/lane-a3-psa.test.js` の $$／$^ テストを、FIX-PS-A の「名指し未対応停止」固定から、新裁定の固定へ置き換えた（テスト名: `FIX-PS-A2: $$ and $^ reach the same unverified AUTOVARS response as the braced forms`）。内容: 裸形 `Write-Output $$`／`Write-Output $^` がエラーなく未検証の未確定値を返すこと、裸形と波括弧形の出力が `deepEqual` で同一であること、波括弧形の分類が不変であること、式位置 `($$)`／`($^)` でも同じ応答であること。
- FIX-PS-A の他の回帰テスト 7 件はそのまま取り込み、全て通過（§4）。

## 4. 検証結果

- 対象3ファイル（TZ=UTC）: `tests/lane-a3-psa.test.js`（8件）＋ `tests/adv-b3-ps-operators.test.js`（9件）＋ `tests/adv-b3-powershell.test.js`（50件）= **67/67 通過**。
- 全テストスイート（TZ=UTC）: `tests/*.test.js` 全 7,172 件を実行し、**7,172 件通過・失敗 0 件**。基準線（TZ=UTC 全通過）を超える失敗は無い。パーサ変更の影響範囲として PowerShell 以外の種別も含む全件が対象。
- 取り込みの完全性: 自ツリーの `engine-advanced-ops.js` と `tests/adv-b3-ps-operators.test.js` は FIX-PS-A 版とバイト一致、`parser.js` は FIX-PS-A 版との diff が §2 の $$ ハンク**のみ**であることを diff で確認した。lane-a3-exec 本体との diff は、変更ファイル4件（parser.js／engine-advanced-ops.js／adv-b3-ps-operators.test.js／新規 lane-a3-psa.test.js）と本報告書のみ。

## 5. 触ったファイル

| ファイル | 変更 |
|---|---|
| `js/types/powershell/parser.js` | FIX-PS-A 分（D2、D3、D5／D10）を取り込み、$$／$^ 分を §2 の是正へ置き換え |
| `js/types/powershell/engine-advanced-ops.js` | FIX-PS-A 分（D1、D6）をそのまま取り込み |
| `tests/adv-b3-ps-operators.test.js` | FIX-PS-A 分（D1 期待値是正）をそのまま取り込み |
| `tests/lane-a3-psa.test.js` | FIX-PS-A の新規回帰テストを取り込み、$$／$^ テストを新裁定へ置き換え |
| `docs/audit/lane-a3-fix-psa2.md` | 本報告書 |

作業環境の注記: この VM では exec プロセスからのファイル内容書き込みが EPERM で遮断され `git clone` が成立しない（FIX-PS-A と同じ制約）。そのため自ツリーは lane-a3-exec へのシンボリックリンク＋変更ファイルのみ実ファイルという構成で構築し、実ファイルはファイルツールで転写した（転写後に上記 §4 のバイト一致／diff 限定を確認済み）。テスト実行時は Node の `--preserve-symlinks` を付与し、モジュール解決がツリー内に閉じる条件で実行した。**ローカルコミットは `.git` を持たないため環境上実施できなかった**が、変更ファイルは全て実ファイルとして存在し、実クローンへの取り込み時にそのままコミット可能な状態である。

## 6. 残存事項

1. **文字列展開内の裸形 `$$`／`$^`**: 二重引用符内展開はトークナイザではなく `engine.js` 独自の展開正規表現（統合ツリー engine.js 1255行付近: `/^\$(?:\{([^}]+)\}|([\p{L}_][\p{L}\p{N}_]*|\?))/u`）が担うため、本修正の範囲外として未変更である。実測した現行挙動: `Write-Output "$$"` → リテラル `"$$"`、`Write-Output "$^"` → リテラル `"$^"`（誤った値を捏造はしない安全側）。一方、波括弧形 `Write-Output "${$}"` は複合 unknown「実行時に決まる：実行時に展開する文字列」を返すため、文字列内では裸形と波括弧形で応答が一致していない。是正する場合は同正規表現の裸名側の選択肢へ `\$` と `\^` を追加する1行変更で足り（追加後の全体文字列形は波括弧形と同じ複合 unknown になる見込み）、engine.js（3,641行）の実ファイル化が必要なため本ツリーでは見送った。なお `"x$$y"` の `$$` の後ろに通常変数名が続く形は、従来から後半が通常変数展開として処理される既存挙動であり、本修正では触れていない。
2. **引数モードの `??`**: FIX-PS-A から引き継いだ範囲注記。括弧なし引数位置の `??` 連鎖は対象外（再現式は全て括弧内・式モード）。
3. **コミットについて**: §5 の注記のとおり、ローカルコミットは環境上実施できなかった。変更ファイル一覧は §5 の表のとおり。
4. 期待値は一次情報（Learn）と既存テストの固定からの導出であり、実 pwsh での実測ではない（冒頭の注意を参照）。

## 7. テスト結果サマリ

| 対象 | 結果 |
|---|---|
| `tests/lane-a3-psa.test.js`（8 件、$$／$^ は新裁定の固定） | 8/8 通過 |
| `tests/adv-b3-ps-operators.test.js`（9 件、D1 是正後の期待値を含む） | 9/9 通過 |
| `tests/adv-b3-powershell.test.js`（50 件、波括弧形の未検証固定を含む） | 50/50 通過 |
| 全スイート `tests/*.test.js`（TZ=UTC） | 7,172/7,172 通過、失敗 0 |
