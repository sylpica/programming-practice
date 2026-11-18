# 収束判定ラウンド第2回 高度A3班（ImageJ＋PowerShell）報告書

- 対象ビルド：統合ビルド（修正バッチ18）HEAD **4f41e11**
- 作業ツリー：`~/workspace/programming-practice-audit/work/lane-a3-conv2/`（正本 repo-reffix のコピー。本班の変更はこのツリー内のみ）
- 実施日：2026-11-18
- 計画の正本：`lanes/lane-a3/plan.md`／`probes.md`。第1回報告書：`work/lane-a3-conv/docs/audit/LANE-A3-CONV.md`
- 基準線：全スイート 7,535件（親が 4f41e11 で UTC／JST 両環境全通過を独立実測済み）

## 結論

- **新規実質欠陥 1件**（ImageJ の実行後チップから高度専用関数が欠落する欠陥。RG-672 のブラウザ残件 C の確認過程で検出。自ツリー内で根本修正＋回帰テスト追加済み。詳細は次節）
- プローブ90件（ランナー135チェック）を新ビルド上で全件再実行し、全件裁定した。結果は第1回と完全同一（PASS 120／FAIL 6／RECORD 9。FAIL 6件は全て第1回裁定済みの非欠陥。後述）
- 件数再現：ImageJ **566＝対応509／未対応44／未検証13**、PowerShell **369＝対応149／未対応180／未検証40**（アプリ自身の countByStatus による実測。第1回と同一）
- IJ-R5／R6（KD-1／KD-2 の決着）の成立維持、PS-09 の開示整合の維持を確認した
- **RG-672 のブラウザ残件は本班分を全て消化した**：eval の実行画面での名指し停止（項目 B）と実行後チップ（項目 C、trace 経路）を実ブラウザで確認。C は修正前ランで FAIL し、上記欠陥の検出につながった。修正後に再確認して PASS
- ゲート：UTC は全量2回の失敗分（パス上限系の壁時計テスト3件）を単独再実行の全通過で環境フレークと裁定し実質 7,537／7,537。JST は全量実行が環境要因で2回とも完走できなかったため、テストファイル233本を4分割して全件実行し **7,537／7,537 全通過**（詳細は「ゲート」節）
- 本班の結果は全体の収束判定ではない（U-46）。本班で新規欠陥が1件出た以上、第2回は収束ラウンドにはならない（親の統合判断に委ねる）

## 新規実質欠陥（1件）と修正

### 現象
高度モードで `s = Color.toString(255, 0, 0); print(s);` を実行すると、実行後の使用中チップ（スコープ「表示中のパス」）に `print` しか現れず、実際に実行された高度専用関数 `Color.toString` が欠落する。エンジン水準で同根範囲を実測したところ、高度専用項目は全て欠落していた（`Color.toString`、`Array.concat`、`Array.fill`、`String.format`、`IJ.pad`、`IJ.checksum`、`Table.get`、`Fit.*`、`Plot.*` 等。基礎項目は全て出現）。実行結果そのもの（出力・変数）は正しく、チップ表示だけが実行実態と食い違う表示欠陥。

### 根本原因
`js/types/imagej/index.js` の simulate が、各ステップの used（実際に呼ばれた関数名の累積）を trace エントリの refs へ変換する際、基礎カタログ（モジュール内 `reference`）だけで照合していた。実行前チップ側の scan は FIX-SH（T5-D01 是正）で有効カタログ（`definition.__catalogReference`）照合になっていたが、trace 側に同根の「基礎閉じ」が残っていた。統合カタログが注入される高度モードでのみ顕在化する。バッチ17で修正された RG-653（C#／JS の実行後チップ欠落）と同型の欠陥の ImageJ 版。

### 修正
- `js/types/imagej/index.js`：trace の refs 照合を `(definition.__catalogReference || reference)` へ変更（scan の FIX-SH と同じ形に統一）。簡易モード（カタログ未注入時）は従来どおり基礎カタログ照合で挙動不変
- 回帰テスト：`tests/muse-lane-a3-conv2.test.js`（2件）
  - CONV2-IJ-1：統合カタログ注入時、高度専用関数（Color.toString／Array.concat／Table.get）が refsInTrace に現れ、基礎項目（Math.pow）も従来どおり現れる
  - CONV2-IJ-2：カタログ未注入時は基礎フォールバックのまま（簡易モード不変）
  - 2件とも UTC／JST 両環境で通過（JST は分割ゲートのチャンク1に含まれる）
- precache 再生成済み（`node scripts/precache.mjs`＋`--check` 合格）

### 検証
- エンジン水準：修正前 refs＝`["print"]` → 修正後 `["Color.toString", "print"]`
- 実ブラウザ（修正後ラン）：チップ `[Color.toString, print]`（スコープ「表示中のパス」）を確認
- プローブ全件を修正後に再実行し、判定行が修正前と完全一致することを diff で確認（欠陥修正による他項目への影響なし）
- PowerShell 側は同型の問題なし（trace の refs はエンジンが直接付与する機構であり、高度専用項目 `ConvertTo-Html` が refsInTrace に現れることを実測）

### 申し送り（未検証候補・本班では欠陥と断定しない）
`js/types/uivision/index.js`（458行・466行付近）にも `reference.some((r) => r.name === ...)` による名前照合がある。ただし対象はコマンド名の解決であり trace refs の機構とは異なるため、本班では未検証のまま候補として申し送る。同型でないかは横断班／A1班での確認を提案する。

## プローブ再実行（90件・135チェック）

- 実行：`work/a3conv2-probes.mjs`（第1回ランナーの ROOT 差し替え版）。結果 **PASS 120／FAIL 6／RECORD 9** で第1回と完全同一（出力 `work/a3conv2-probes-output.txt`、修正後再実行分 `work/a3conv2-probes-output-fixed.txt` も判定行一致）
- FAIL 6件の裁定（全て第1回と同一・非欠陥）：
  - IJ-06／IJ-07／IJ-13／IJ-16：probes.md 側の期待値誤り（一次資料でアプリが正しいことを第1回に確認済み。IJ.checksum は2引数形で MD5／SHA-256 を返す、Array.rankPositions は argsort 意味論、newArray(3) は要素数3のゼロ初期化、等）。期待値是正は台帳提案に留める（本班では probes.md を変更しない）
  - IJ-36：停止理由マッチャの過厳（アプリは正直に停止しており、文言の完全一致を期待したランナー側の問題）
  - PS-43：開示済みの不確定値設計（第1回裁定どおり）
- 是正プローブ（第1回で一次資料により確定した正しい呼び出し形）は新ビルドでも全通過：IJ.checksum("MD5 string","abc")＝900150983cd24fb0d6963f7d28e17f72、SHA-256＝ba7816bf…15ad、MD5("")＝d41d8cd98f00b204e9800998ecf8427e、Array.concat の2配列形＝[1, 2, 3, 4]、不正な checksum 方式は正直なエラー
- 維持確認（第1回の実測値と一致）：
  - IJ-R1〜R4：r="1"／n="2"、"red"、R3a／R3b、5／10
  - **IJ-R5（KD-1）**：R5a v=42／w=42（名前付き Results テーブルを基礎 getResult で読める）、R5b 7／7（デフォルト Results）、R5c 存在しないタイトルは正しい案内で停止（旧「Results のみ」誤文言なし）
  - **IJ-R6（KD-2）**：R6a／R6b LUT 9／9（両 setLut 経路）、R6c 恒等 0／0
  - PS-R1（履歴×5）／PS-R2（カルチャ×4）：未検証のまま維持（捏造なし）。PS-R3 ConvertTo-Html＝対応、PS-R5 リダイレクト＝未対応、PS-R4 の個別状態も不変
  - **PS-09（-xor 結合の開示）**：`$true -xor $true -and $false` → "True"（裁定済みのモデル差異）。開示文は基礎「論理演算子」の注意書きと高度 -xor 項目の注意書きの両方に逐語で存在することを確認

## ブラウザ実測（RG-672 本班分の消化）

- 環境：Playwright（Python）＋Chrome for Testing（`tools/browsers/chromium-1255`）、本班ツリーを 127.0.0.1:4173 で配信、ローカルリレー 127.0.0.1:18080 経由。第1回スクリプトの conv2 版（`work/a3conv2-browser-retry2.py`、結果 `work/a3conv2-browser-retry2-results.json`）
- **項目 B（eval の実行画面での名指し停止）：確認済み**
  - 修正前ランで試行1回目に成功：trace に「ここで止まります：未対応：eval はモデルで未対応です」、最終状態に「1行で停止：未対応：eval はモデルで未対応です」
  - B2：最終状態に変数 x は存在しない（未定義のまま停止）ことを確認
  - 修正後ランでも再確認（試行1回目はアプリの解析時間上限による環境停止、2回目で成功）
- **項目 C（実行後チップ・trace 経路）：修正後に確認済み**
  - 対照実行（`Color.get(255, 0, 0)` 経由）は完了し出力 "red"（C1／C2 PASS）
  - 修正前ラン：チップは `print` のみで C3 FAIL → 上記欠陥を検出
  - 修正後ラン：チップ `[Color.toString, print]`（スコープ「表示中のパス」）で C3 PASS
- スクリーンショット：`work/a3conv2-browser-eval.png`／`work/a3conv2-browser-control.png`

## ゲート

基準線 7,535件＋本班の新規回帰テスト2件＝**7,537件**。

### UTC
- 全量1回目：7,536／7,537（失敗1件）。全量2回目：7,534／7,537（失敗3件）
- 失敗は全てパス上限2000系の壁時計テスト（`cmd path cap is explicit and never exceeds the common 2000 paths`／`default maximum is exactly 2000 paths`／`powershell path explosion emits a notice at the shared 2000 path cap`）。各テストの所要時間が約10.0〜10.4秒＝実時間予算で打ち切られた署名（アサーション `1 !== 2000` は列挙途中の打ち切り）であり、第1回でも同負荷条件で同型失敗→単独通過した裁定済みフレーク群
- 3件とも UTC 単独再実行で全通過（2／2＋1／1）。本班の変更（imagej の refs 照合・新規テスト）は失敗テストの対象外。親の静穏時実測（4f41e11 で 7,535／7,535）と合わせ、**UTC は実質 7,537／7,537 全通過**と裁定する

### JST
- 全量実行を2回試行したが、いずれも環境要因で完走できなかった（1回目：✔ 7,070件・✖ 0件まで記録された時点でプロセス終了。2回目：出力ファイルが0バイトのまま終了。同時期に長時間プロセスからファイルへのリダイレクト書き込みが消失する事象が反復したため、出力経路をパイプ＋grep 抽出に切り替えた）
- テストファイル233本を4分割（58／58／59／58本）して JST で全件実行：**2,834＋1,983＋1,453＋1,267＝7,537件、全通過・失敗0件**
- TZ感受性の高いファイル群（WDL TZ テスト、本班の新規テスト含む21件）は個別にも JST 全通過を確認

## 触ったファイル

- 変更：`js/types/imagej/index.js`（trace refs 照合の有効カタログ化）、`precache.js`（再生成）
- 追加：`tests/muse-lane-a3-conv2.test.js`、`docs/audit/LANE-A3-CONV2.md`（本報告書）
- ツリー外（作業証跡）：`work/a3conv2-probes.mjs`、`work/a3conv2-probes-output.txt`、`work/a3conv2-probes-output-fixed.txt`、`work/a3conv2-browser-retry2.py`、`work/a3conv2-browser-retry2-results.json`、`work/a3conv2-browser-eval.png`、`work/a3conv2-browser-control.png`、`work/a3conv2-browser-run.log`／`run2.log`

## 台帳提案（親・統合班向け。本班は台帳に触らない）

1. 本欠陥（ImageJ trace refs の基礎閉じ／RG-653 同型）を新規 RG として登録すること（次番号は親管理の RG-675 以降）
2. probes.md の期待値是正4件（IJ-06／IJ-07／IJ-13／IJ-16）は第1回からの継続提案
3. RG-672 の本班分（eval 実行画面・実行後チップ）は消化済みとして閉じてよい。他班分の残件は各班の報告に従うこと
4. uivision の同型候補（未検証）は横断班／A1班への引き継ぎ事項として記録すること
