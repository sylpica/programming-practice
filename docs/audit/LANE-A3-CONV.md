# 収束判定ラウンド 高度A3班（ImageJ＋PowerShell）報告書

- 対象: 統合ビルド（修正バッチ17）ブランチ batch17-integration、HEAD **4771801**
- 作業ツリー: `work/lane-a3-conv/`（repo-reffix の無改造コピー。本報告書の追加以外、ツリーは 4771801 と一致＝git status 清浄を確認）
- 実施日: 2026-11-18
- 計画正本: `lanes/lane-a3/plan.md`、`lanes/lane-a3/probes.md`。前回報告書: `work/lane-a3-exec/docs/audit/LANE-A3-EXEC.md`

## 結論

- **新規実質欠陥ゼロ**（アプリ側）。コード修正なし、回帰テスト追加なし、出荷ファイル変更なし（precache 再生成は不要）。
- プローブ90件は全件再実行し、全件裁定完了。統合ビルドで未検証再裁定の件数（IJ 566＝対応509／未対応44／未検証13、PS 369＝対応149／未対応180／未検証40）を再現した。
- IJ-R5／IJ-R6 は KD-1／KD-2 の統合により解消していることを実測で確定した。
- ゲート: UTC 全量 7,512 件中 7,509 通過（失敗3件はパス上限系の時間依存で、全て単独再実行で通過）。JST は全227ファイルをグループ実行で網羅し失敗2件（同系のみ）で、個別裁定により両TZとも実質 7,512 件全通過相当と判定する（詳細は「ゲート」節）。
- ブラウザ実測: FIX-SH 後の実行前チップ表示は実画面で確認できた。eval の実行画面での名指し停止と実行後チップは、本 VM の極端な CPU スロットリング（他レーンの並行スイートによる負荷、load average 12〜29、メモリ残量約270MB の時点もあり）のため**未確認**のまま残る。合格とは書かない。低負荷環境での再実施を申し送る（詳細は「ブラウザ実測」節）。
- 本班の結果は全体の収束判定ではない（U-46）。

## プローブ再実行（90件）

ランナー `work/a3conv-probes.mjs`（135チェック）で統合ビルド上に再実行した。結果は **PASS 120／FAIL 6／RECORD 9**。FAIL 6件・RECORD 9件は全て裁定済みで、アプリ側の欠陥は無い。

### 件数再現（アプリ自身の countByStatus 実測）

| 対象 | 総数 | 対応 | 未対応 | 未検証 | 前回再裁定と一致 |
|---|---|---|---|---|---|
| ImageJ | 566 | 509 | 44 | 13 | 一致 |
| PowerShell | 369 | 149 | 180 | 40 | 一致 |

### IJ-R5／IJ-R6 決着確認（KD-1／KD-2 統合済み）

- **IJ-R5（KD-1、getResult のタイトル解決）決着**: 基礎 `getResult("Value", 0, "MyTable")` が名前付き表から 42 を返し、高度 `Table.get` と一致した（前回は停止していた）。既定 Results 表も正常。不存在タイトルは名前を挙げて停止し、旧・虚偽の案内文「このモデルにある結果表は「Results」だけです」は消滅して正しい案内文に置換されている。
- **IJ-R6（KD-2、Color.getLut）決着**: `Color.getLut` が setLut／Color.setLut どちらの経路でも保持 LUT を返す（r[0]=9 で両読み取りとも "9"。前回 Color.getLut は恒等の "0" だった）。未設定時の恒等 LUT 対照も正常。

### IJ-R1〜R4・PS 再確認

- IJ-R1: Fit 直線 rSquared="1"／nParams="2"。IJ-R2: Color.toString(255,0,0)="red"。IJ-R3: Plot.getLimits は setLimits 明示時に書き戻し（0,10,-1,1）、自動範囲では名指し未検証停止。IJ-R4: setVoxelSize(0.5,…) で toScaled(x=10)→"5"、toUnscaled(u=5)→"10"。全て前回処置どおり。
- PS-R1: 履歴系5件（Get-History 等）は unverified のまま。PS-R2: カルチャ系4件 unverified。PS-R3: ConvertTo-Html は supported（格上げ反映）。PS-R5: リダイレクト 2>／2>>／2>&1 は unsupported（再分類反映）。PS-R4 自動変数: $$／$^／$Error／$ExecutionContext／$Host／$input／$MyInvocation／$PID／$PROFILE／$PSCmdlet／$PSHOME／$StackTrace／$PSCulture／$PSUICulture が unverified、$ConsoleFileName は supported（確定値 "" への格上げ反映）。前回の処置内訳と一致。
- **PS-09（開示・挙動の整合のみ再確認）**: `$true -xor $true -and $false` → "True"（裁定差の存置どおり）。開示は基礎「論理演算子」項目と高度「-xor」項目の両 caution に「モデルでは -and が -or／-xor より強く結合します（実 PowerShell では -and／-or／-xor は同格で左結合です）」と明記され、挙動と整合する。

### FAIL 6件の裁定（全てアプリ側の欠陥ではない）

一次情報の正本は `work/adv-b3-src/`（functions.html／Functions.java／Tools.java、ピン照合済み）。

- **IJ-06／IJ-07 = probes.md の期待値誤り**: 実 ImageJ の `IJ.checksum` は2引数 `(method, source)` で MD5／SHA-256 の16進文字列を返す（functions.html、Functions.java `checksum()`）。probes.md の「CRC32・891568578」は誤り。アプリの1引数での arity エラーは正しい。是正プローブで検証済み: `IJ.checksum("MD5 string", "abc")` = `900150983cd24fb0d6963f7d28e17f72`、`("SHA-256 string", "abc")` = `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`、`("MD5 string", "")` = `d41d8cd98f00b204e9800998ecf8427e`、不正 method は正直なエラー。
- **IJ-13 = probes.md の期待値誤り**: `Array.rankPositions` は functions.html 定義どおり「最小値のインデックスから始まる順位付けインデックス」（argsort）。`[5,5,1]` → アプリの `[2, 0, 1]` が正しく、probes.md の `[1, 2, 0]`（要素ごとの順位解釈）は誤り。文字列版（compareToIgnoreCase）も `[1, 0, 2]` で整合。
- **IJ-16 = probes.md の期待値誤り（concat 半分）**: `newArray(size)` は単一数値引数＝サイズ（functions.html）。`newArray(3)` = [0,0,0] のため concat 結果 `[1, 2, 0, 0, 0]` はアプリが正しい。2配列形 `Array.concat(newArray(1,2), newArray(3,4))` = `[1, 2, 3, 4]` で連結意味論も検証済み。reverse 半分は一致。
- **IJ-36 = プローブのマッチャ過厳**: 小文字 `array.sort` は「変数 array は、まだ値が代入されていません」で正直に停止（黙った受理なし）。説明文は実 ImageJ の "Undefined variable" と整合。実質要件（正直なエラー停止）は充足。
- **PS-43 = 開示済み設計との裁定**: `Get-Date -Format "yyyy"` は「実行時に決まる：現在日時の文字列」というラベル付き未確定値を返す。リファレンス項目自体が `returns: "日付オブジェクト（実行時に決まる値）"` と開示し全表面で一貫する（A-14）。年を捏造しない正直な扱いであり、probes.md の「4桁の年」期待はこの開示済み設計と競合する。実質欠陥ではない。

### RECORD 9件の裁定（全て整合）

- IJ-17: sd="1"（Functions.java `getArrayStatistics` の標本標準偏差の式と一致。mn/mx/mean も一致）。
- IJ-27: v="NaN"、b="1"、w="NaN"（NaN 伝播は正しい）。
- IJ-35: 100万要素＋ループ合計は全パスで「実行時に決まる値」＋理由の正直な未確定宣言。誤値・部分合計の成功扱いなし。小配列の対照では正確な合計 "5"。
- PS-20（`5 -is [long]` → "False"、-is caution に数値型裁定の開示あり、実 PS とも一致）、PS-31b（`1.0 / 0` → "Infinity"）、PS-34b（`"abc"[3]` → エラーなく出力なし＝$null）、PS-R4、DISC-xor、DISC-is、DISC-joinpath（出力 `a\b` で項目の example・「文字列として結合」宣言と矛盾なし）。

## ブラウザ実測

環境: Playwright（`tools/venv/`）＋ Chrome for Testing（`tools/browsers/chromium-1255/chrome-linux/chrome`）、ローカルリレー 127.0.0.1:18080、対象は lane-a3-conv を 127.0.0.1:4173 で配信したもの。スクリプトは `work/a3conv-browser.py`、`work/a3conv-browser-retry2.py`、結果は `work/a3conv-browser-results.json`。

### 確認できたもの（FIX-SH 実表示、W5 残部の一部）

- A1: 高度モード・ImageJ で `doCommand("Quit");` を入力すると、実行前の使用中チップ（scan 経路）に高度専用項目 **doCommand＋未対応タグ**（`chip unsupported`）が表示される。前回 T5-D01（実行前チップに高度専用項目が現れない）は実画面で解消を確認した。
- A2: `eval("x = 1;");` では **eval＋未対応タグ**のチップが表示される。

### 未確認のまま残るもの（環境要因）

- B: eval の実行画面での名指し停止表示。C: 対照コード（`s = Color.toString(255, 0, 0); print(s);`）の実行完了と実行後チップ（trace 経路、スコープ「表示中のパス」）。
- 試行実績: 3セッション・実行試行12回以上。全て結果表示に至らず、アプリの正直な環境停止で終わった。内訳: 「解析時間の上限で停止しました。コードを小さくして再実行してください。」（eval 4回＋対照4回）、「解析用Workerでエラーが発生しました。」（eval 1回）。その後 Chromium の起動自体が SIGTRAP で2回失敗した。
- 対照コードは対応済みの最小コードであり、内容によらず同じ停止になることから、アプリ側の欠陥とは判定しない。前回 T5 が対照実行で下した環境要因の裁定と同一の現象である。当時の負荷は load average 12〜29（他レーンの収束スイートが同一 VM で並行実行中）、メモリ残量約270MB の時点もあった。
- なお、エンジン水準では eval の名指し停止（「ここで止まります：未対応：eval はモデルで未対応です」）をプローブ再実行で確認済みだが、これは実行画面確認の合格根拠にはしない。
- **申し送り**: B／C は低負荷環境（または公開サイト実測）で再実施が必要。

## ゲート（全スイート、基準線 7,512 件）

- **UTC 全量実行**: 7,512 件中 **7,509 通過・3 失敗**。失敗は全てパス上限系の時間依存テスト（`audit nested macro cross product reports the 2000 path cap`、`cmd path cap is explicit and never exceeds the common 2000 paths`、`default maximum is exactly 2000 paths`）で、失敗時の所要時間はいずれも約10秒（壁時計上限の切り捨て署名）。3件とも単独再実行で通過した（cmd は単独 8.6 秒で通過）。
- **JST**: 全量実行は運用上の理由で2度とも完走しなかった（1度目はランナーがサマリを残さず消失、2度目はログが空で終了）。代わりに全227ファイルを6グループに分けて全て実行し（各ファイルは最低1回は JST で実行される網羅）、失敗は2件のみだった: `cmd path cap…` と `powershell path explosion emits a notice at the shared 2000 path cap`（いずれも約10秒の同系）。
  - `powershell path explosion…` は JST 単独再実行で通過（10.5 秒）。
  - `cmd path cap…` は JST 単独再実行でも当時の極端な負荷（load average 25〜29）では約10.3 秒で切り捨てられたが、**ベース対照**として無改造の repo-reffix@4771801 が同一負荷・同一条件で同一に失敗することを確認した。本ツリーは 4771801 とバイト同一であり、UTC では単独通過済みのため、環境フレークと裁定する。コード起因の失敗ではない。
- 以上により、両TZとも実質 **7,512 件全通過相当**と判定する。失敗の全件が「パス上限 2000 件」系の壁時計依存テストに限られ、値の誤りに起因する失敗は両TZを通じてゼロだった。

## 欠陥・台帳提案

- **新規実質欠陥ゼロ**（アプリ側）。修正・回帰テスト追加・precache 再生成はいずれも無し。
- 台帳提案（probes.md 側の期待値是正。アプリではなくプローブ文書の誤り）:
  1. IJ-06／IJ-07: `IJ.checksum` の期待を2引数 `(method, source)`・MD5／SHA-256 の16進文字列へ是正すること（現行の「CRC32・891568578」は一次情報と不一致）。
  2. IJ-13: `Array.rankPositions` の期待を argsort 解釈（`[5,5,1]` → `[2, 0, 1]`）へ是正すること。
  3. IJ-16: `newArray(3)` はサイズ解釈で [0,0,0] であり、concat 期待 `[1, 2, 0, 0, 0]` が正である旨へ是正すること。

## 触ったファイル

- 追加: `docs/audit/LANE-A3-CONV.md`（本報告書）のみ。アプリコード・テスト・出荷ファイルへの変更は一切なし。
- ツリー外の作業ファイル（コミット対象外）: `work/a3conv-probes.mjs`、`work/a3conv-browser.py`、`work/a3conv-browser-retry2.py`、`work/a3conv-browser-results.json`、`work/a3conv-jst-groups.log`。
- 共有記録ファイル・台帳は触っていない。GitHub 書き込みはしていない。
