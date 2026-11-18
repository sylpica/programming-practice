# 高度A2班 収束判定ラウンド第3回報告書（LANE-A2-CONV3）

- 対象レーン: 高度A2班（Power Fx＝Power Apps／AutoHotkey v2／Power Automate WDL式）
- 土台: 正本 repo-reffix HEAD `f486c8b`（修正バッチ19＝高度モード統合第6弾）
- 作業ツリー: `~/workspace/programming-practice-audit/work/lane-a2-conv3/`（f486c8b のコピー。正本には触れていない。GitHub 書き込みなし）
- 計画正本: `lanes/lane-a2/plan.md`／`probes.md`（プローブ96件＝PFX-01〜31、WDL-01〜32、AHK-01〜33）。前回報告書: `docs/audit/LANE-A2-CONV2.md`（第2回、土台 4f41e11）
- **結論: 新規実質欠陥ゼロ。** 本班スコープ（3種別の高度表面）で新規の実質的欠陥は検出されなかった。RG-630 と第1回の修正13件は新ビルドでも全て成立し、未検証2件（PFX-12／13／14）は未検証のまま維持されている。本班の結果はアプリ全体の収束判定（U-46）ではない。

## 0. 差分の範囲特定（回帰リスクの前提）

`git diff 4f41e11..f486c8b --name-only` は95ファイルの変更を示すが、本班の3種別ディレクトリ（`js/types/autohotkey`、`js/types/powerapps`、`js/types/powerautomatecloud`。デスクトップ側 `js/types/powerautomate` も含む）に一致するファイルは**0件**だった。バッチ19のコード変更は他班スコープ（ImageJ の trace 照合、c-family.js の NULL 等価比較、UI.Vision の refs 正規化）のみで、本班のエンジン・データは第2回検証時のバイト列のままである。したがって本ラウンドは「同一コードの再実行による再現確認」が主眼となり、下記のとおり全項目が第2回結果を再現した。

## 1. プローブ再実行（96件／判定125行＋GATE-1）— UTC・JST とも FAIL 0、第2回とバイト一致

第2回と同一の独立プローブランナー（ツリー外 `work/lane-a2-conv3-probes/probes.mjs`、対象パスのみ自ツリーへ差し替え）を新ビルド上で再実行した。期待値は第1回で一次情報（Microsoft Learn／AutoHotkey v2 公式）により裁定済みの値を用いた（probes 表の誤り14件の訂正を含む）。

- 判定125行は **UTC／JST の両環境で FAIL 0**。
- 両環境の出力は**バイト単位で完全一致**し、さらに**第2回の出力ファイルともバイト単位で完全一致**した（`cmp` で確認）。WDL の `utcNow()`／`guid()` はモデル既定の基準時刻・決定的シードにより同一値を返し、書式パターン照合も両環境で合格。
- 統合前提ゲート（計画 §2-1）: ランナー内 GATE-1 合格。基礎 `definitions` は16種のままで `powerautomatecloud` は `advancedOnlyDefinitions` のみに存在する。

種別ごとの要点（全て第2回と同一結果）:

- **Power Fx**: PFX-01〜31 全件合格（裁定済み期待値）。列挙形（StartOfWeek.Monday／TimeUnit.Quarters）は名前を挙げて停止し、数値・文字列形で正値（7／2）を返す。PFX-06 は Table 形で 7（PFX-D1 成立）、PFX-20 `"abc" = "ABC"` = true（PFX-D2 成立）。
- **WDL**: WDL-01〜32 全件合格。裁定済みの6件（equals(true,1)=true、equals(null,'')=true、nthIndexOf 負値=末尾から→3、slice 範囲外=切り捨て→'ello'、dateDifference 定義順→'-2.00:00:00'、startsWith 大小不区別→true）はいずれも Learn どおりの挙動を維持。
- **AutoHotkey**: AHK-01〜33 全件合格。Try/Catch/Else/Finally の経路（AHK-01〜03）、F1 裁定（クラスなし Catch は Error のみを受ける。文字列・数値・オブジェクトの Throw は伝播して停止＝AHK-04〜06 で再現）、Map.CaseSense（明示 "On" で Count=2、Clone への引き継ぎも成立）、正規表現（\p{Lu} 等価変換、\K の名指し停止、\A の厳密化）すべて前回修正どおり。

## 2. RG-630＋前回修正13件の成立確認

| 項目 | 確認方法（本ラウンド） | 結果 |
|---|---|---|
| RG-630（WDL タイムゾーン依存のエンジン是正） | ランナー内 RG-630a/b/c: `formatDateTime('03/15/2018')` = `2018-03-15T00:00:00.0000000`、`formatDateTime('03/15/2018 12:00:00', 'yyyy-MM-ddTHH:mm:ss')` = `2018-03-15T12:00:00`（WDL D-1 の 'T' リテラルを含む）、`ticks` のゾーンなし／Z付き同値（636566688000000000）を UTC・JST 両環境で照合（両環境とも PASS）。全プローブ出力の TZ 間バイト一致。WDL TZ 回帰テスト（lane-a2-wdl-tz）両環境全通過 | ✓ 成立 |
| PFX-D1（Sum の文字列強制変換） | PFX-06（Table 形）= 7、数値形 `Sum("5", 3)` = 3 | ✓ |
| PFX-D2（テキスト等値の大小不区別） | PFX-20 = true | ✓ |
| PFX-D3（CountA が空文字列を数える） | `CountA(Table({Value: 1}, {Value: ""}, {Value: 2}))` = 3（プローブ内に含む） | ✓ |
| PFX-D4（Weekday の StartOfWeek 開示） | Weekday 項目 caution に「StartOfWeek 列挙のメンバー参照（StartOfWeek.Monday など）はこのモデルでは解決できないため、数値コードで指定します」が存在（補足チェックで実測、UTC・JST とも PASS） | ✓ |
| PFX-D5（定義域外関数の caution 是正） | Acos 項目 caution が「実 Power Fx では未定義の結果は Blank になりますが（Microsoft Learn）、このモデルでは名前を挙げて停止します」であることを実測（両環境 PASS） | ✓ |
| AHK F1（クラスなし Catch は Error のみ） | AHK-04／05／06 の伝播、AHK-02orig（文字列 Throw）の伝播、公式形（Error Throw）の捕捉 | ✓ |
| AHK F2（Catch のクラス照合） | Catch Map／Array／Object が対応する Throw 値を受ける（AHK-F2a〜c） | ✓ |
| AHK F3（Catch／Finally なし Try の暗黙の Error 受け取り） | AHK-F3: Error を投げた後の後続処理が実行される | ✓ |
| AHK F4（Round の戻り値型） | AHK-17: `Round(2.567, 2)` の値が Float（表示文字列 "2.57"）、`Type(...)` = "Float" | ✓ |
| AHK F5（未捕捉オブジェクト Throw の表示整形） | AHK-F5: エラー文に `[object Object]` を含まない | ✓ |
| AHK F6（正規表現変換のエスケープ対・文字クラス意識） | AHK-F6a（`\\A` リテラル一致=1）／F6b（`[\A]` クラス一致=1） | ✓ |
| AHK F7（文面の公式整合） | EnvGet／EnvSet とも status=unsupported で、description に読み／書きの区別、caution に「仮想環境変数での代替は最終判断事項として保留されています」の明記があることを実測（補足チェック両環境 PASS） | ✓ |

加えて、本班関係テスト7ファイル（adv-b2 3種＋lane-a2 監査3種＋WDL TZ 回帰）は **UTC／JST とも 184/184 全通過**。この中には計画 §1-4 の名指し停止全数照合（AHK 未対応の通常関数 **271/271** が自分の名前を挙げて停止、ドット形の照合を含む）と C-12 の宣言×挙動マトリクスが含まれる。

## 3. 未検証の維持（PFX-12／13／14、PFX-15）— 合格条件を満たす

- **PFX-12** `Blank() = 0` → 挙動記録: false（第2回記録と同一）。**PFX-13** `Blank() = ""` → false（同）。**PFX-14** `"5" + 3` → 型不一致（「数値の型が一致しません」）で停止し、8 を返さない（同）。いずれも期待値として断定せず記録のみ。
- 文面側: 本ツリーの Power Fx 種別ファイル全走査（grep）で、`Blank() = 0`／`Blank() = ""`／`"5" + 3` について確定した真偽・変換結果を主張する文面は**存在しない**ことを直接確認した。未検証の維持が成立。
- **PFX-15** 未検証5件（AsType／IsType／RecordOf／Summarize／Type）は全て status が `unverified` のまま（データ側で実測、補足チェック両環境 PASS）で、呼び出し時は自分の名前を挙げて停止し、捏造した挙動を返さない（プローブで実測）。

## 4. 母数照合（計画 §0／追加D-17）

補足チェック（`work/lane-a2-conv3-probes/checks.mjs`、12件全 PASS、UTC・JST 両環境）で実データから機械集計した。

| 種別 | 実測 | 期待 |
|---|---|---|
| Power Fx 高度差分 | 193件 = 対応136／未対応52／未検証5 | 一致 |
| AutoHotkey 高度差分 | 405件 = 対応98／未対応307 | 一致 |
| WDL（新種別） | 137件 = 対応116／未対応21／未検証0（`supported` 真偽値で集計） | 一致 |

## 5. 挙動記録のみのプローブ（期待値を断定しない項目）

全て第2回記録と同一（プローブ出力のバイト一致により担保）で、文面との矛盾は無かった。

| ID | 記録 |
|---|---|
| PFX-04b | 角括弧形 `Index([10, 20, 30], 4)` も範囲外エラーで停止（Blank を返さない） |
| PFX-06b | 角括弧形 `Sum([3, "text", 4], Value)` は「未定義の名前：Value」で停止（共有側申し送りのまま。本班スコープ外の既知事項であり新規欠陥ではない） |
| PFX-16 | `Acos(2)` は定義域エラーで停止（文面は PFX-D5 是正どおり） |
| PFX-17 | 列挙形は TimeUnit 名指し停止（月末日ケースは未確認のまま記録のみ） |
| PFX-18 | `Value("1,000")` は変換エラーで停止（桁区切りは未確認のまま） |
| WDL-05b | `string(バイナリ値)` は Base64 表現 `"SGVsbG8="` を返す（Learn 未定義のため未確認のまま） |
| WDL-14／15 | `isFloat('NaN')`／`isFloat('Infinity')` ともに false（文面に確定主張なし） |
| WDL-16b | タイムゾーン名小文字 `tokyo standard time` は正規ゾーンへ解決し `2026-01-01 09:00`（虚偽結果ではない） |
| AHK-10 | 既定 Map で別ケースのキーを読むと「キーが Map にありません」で停止（公式の既定 "On" と整合） |
| AHK-16 | `Round(2.5)` = 3、`Round(3.5)` = 4（タイは 0 から遠い側。方向は未確認のまま） |
| AHK-19 | `WinActivate("Untitled")` は「対象ウィンドウがありません」で停止（基礎対応種別のため名指し未対応停止ではない） |
| AHK-20 | `Send("abc")` はエラーなくモデルへ送信（基礎対応） |
| AHK-22 | `EnvGet` は名指し未対応停止（「このAutoHotkey関数は未対応です：EnvGet」）。値を捏造しない |
| AHK-31 | `7 // 2` は「AutoHotkeyの整数除算 // は未対応です」と名前・理由を挙げて停止（共有コア管轄の申し送りのまま） |
| AHK-32 | `"abc" = "ABC"` → 1（真）、`"abc" == "ABC"` → 0（偽）。公式どおり |
| AHK-33 | アロー関数は「アロー関数（=>）」と名前を挙げて正直に停止（基礎未対応の申し送りのまま） |
| AHK-F6a／F6b | ともに一致位置 1 を記録（第2回と同一） |

## 6. ゲート結果（全スイート）

自ツリー（f486c8b のコピー、本班はコード変更なし）で全スイート（`node --test tests/*.test.js`、7,548件）を実行した。本ラウンドは全11班が並行実行しており、VM（共有1.5 CPU）は終始強く競合していた（全量所要時間は UTC 約1,188秒／JST 約1,369秒）。

| 環境 | 結果（生値） | 失敗内訳 |
|---|---|---|
| UTC | 7,543／7,548 | 下記5件（全て実時間系） |
| JST | 7,543／7,548 | 同一の5件（全て実時間系） |

- **失敗5件（両環境で同一）**: (1) `audit nested macro cross product reports the 2000 path cap`、(2) `cmd path cap is explicit and never exceeds the common 2000 paths`（約10,005〜10,011ms の予算打ち切り署名）、(3) `default maximum is exactly 2000 paths`（約10,102〜10,297ms）、(4) `powershell path explosion emits a notice at the shared 2000 path cap`（約10,095〜10,205ms）、(5) `R25-N4 finite deep nesting (50/200/1000) keeps working`（depth=1000 で「変換の探索上限で停止しました」＝計算予算の早期発動）。いずれも「2000パス上限」や深い入れ子の計算予算を実時間で検証するテスト族で、本班スコープ（Power Fx／AHK／WDL）のテストは両環境とも全通過している。
- **ベース対照による裁定**: 該当5ファイル（audit／cmd／engine／muse-fix-batch4-cfn／powershell、計1,752件）を個別再実行したところ、自ツリーでは (1) が通過し残り4件が同一署名で失敗（1,748／1,752）。**無変更の正本 repo-reffix（同一コミット f486c8b、清浄ツリー）でも同一4件が同一署名で失敗し、件数も 1,748／1,752 で完全一致**した。親が静穏条件で実施した同一コミットの独立実測は UTC・JST とも 7,548／7,548 全通過である。以上により、両環境の失敗5件は全て環境タイミングフレークと裁定し、欠陥として数えない（実質ゲートは両環境とも **7,548／7,548**）。期待値の変更は行っていない。
- 本班関係テスト（§2 末尾）は両環境とも 184／184 全通過で、RG-630 是正後の基準線（JST でも全通過）を本班範囲で再確認した。

## 7. 触ったファイル

- `docs/audit/LANE-A2-CONV3.md`（本報告書）— 本ツリーの変更はこの1ファイルのみ。エンジン・テスト・データへの変更は無い（新規欠陥ゼロのため修正なし）。
- プローブランナー・補足チェック・結果はツリー外 `~/workspace/programming-practice-audit/work/lane-a2-conv3-probes/`（`probes.mjs`、`checks.mjs`、`results-utc.txt`、`results-jst.txt`、`suite-utc.log`、`suite-jst.log`）に保存した。

## 8. 台帳への提案

- 新規欠陥の起票提案は無い（本班スコープで新規実質欠陥ゼロ）。
- 既知の申し送り（Power Fx テキスト順序比較、AHK `//` 演算子、アロー関数、角括弧リテラルの行スコープ、paths[].vars のデータ層整形）は本ラウンドでも同一状態であることを確認した。状態変更の提案は無い。
