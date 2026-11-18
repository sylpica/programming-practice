# 収束判定ラウンド第3回 高度A3班（ImageJ＋PowerShell）報告書

- 対象ビルド：統合ビルド（修正バッチ19）HEAD **f486c8b**
- 作業ツリー：`~/workspace/programming-practice-audit/work/lane-a3-conv3/`（正本 repo-reffix のコピー。コピー直後に js／tests が正本とバイト同一であることを diff で確認。本班はコード変更を行っていない）
- 実施日：2026-11-18
- 計画の正本：`lanes/lane-a3/plan.md`／`probes.md`。前回報告書：`work/lane-a3-conv2/docs/audit/LANE-A3-CONV2.md`
- 基準線：全スイート 7,548件（親が f486c8b で UTC／JST 両環境全通過を独立実測済み）

## 結論

- **新規実質欠陥ゼロ**（本ラウンドで新規の実質的欠陥は検出されなかった。コード変更なし）
- プローブ90件（ランナー135チェック）を新ビルド上で全件再実行し、全件裁定した。結果は第1回・第2回と完全同一（PASS 120／FAIL 6／RECORD 9。FAIL 6件は全て裁定済みの非欠陥。後述）。判定行だけでなく actual を含む全出力行が第2回とバイト同一だった
- 件数再現：ImageJ **566＝対応509／未対応44／未検証13**、PowerShell **369＝対応149／未対応180／未検証40**（アプリ自身の countByStatus による実測。第1回・第2回と同一）
- **RG-675（第2回の自班欠陥＝ImageJ trace 照合）の修正が統合ビルドで成立していることをエンジン水準で独立再実測した**（機構スイープ＋挙動バッテリー全項目 OK。詳細は次節）。ブラウザでのチップ表示確認は本ラウンドではブラウザ専任班が担当するため、本班からは委譲と明記する
- IJ-R5／R6（KD-1／KD-2 の決着）の成立維持、PS-09 の開示整合の維持、eval の名指し停止（Node 水準）を確認した
- ゲート：UTC 全量 7,544／7,548、JST 全量 7,542／7,548。失敗は全て壁時計タイミング系（経路上限2000系・探索上限1,200ms・近線形性能形）で、個別再実行の通過または無変更ベースツリーでの同一失敗により全件を環境フレークと裁定し、**実質は両環境とも 7,548／7,548**（詳細は「ゲート」節）
- 本班の結果は全体の収束判定ではない（U-46）。集約は親の判断に委ねる

## RG-675 修正の統合後成立確認（エンジン水準）

対象コード：`js/types/imagej/index.js` の trace refs 照合が `(definition.__catalogReference || reference)` になっている（scan の FIX-SH と同形。説明コメント付き）。独立スクリプト `work/a3conv3-rg675-check.mjs` で次を実測し、全項目 OK だった。

- **機構水準の全数スイープ**：合成カタログ 566件中、高度専用名は 365件。その全数が、合成カタログ注入時の照合述語で解決された（未解決 0）。カタログ未注入（簡易モード）では高度専用名は1件も解決されず（漏れ 0）、基礎名（print／Math.pow／getResult）は解決される＝簡易モード不変
- **挙動水準**：実際に実行して trace refs（refsInTrace）に現れることを確認した高度専用関数＝Color.toString（第2回の再現コード。refs は `["Color.toString", "print"]`、出力も "red" で正しい）、Array.concat、Array.fill、String.format、IJ.pad、IJ.checksum、Table.get。基礎項目 Math.pow も合成カタログ経由で従来どおり出現。簡易モード（未注入）での基礎コードの refs も従来どおり
- 統合ツリーに含まれる第2回の回帰テスト `tests/muse-lane-a3-conv2.test.js`（CONV2-IJ-1／2）も全スイート内で通過している（ゲートの失敗分に含まれない）
- PowerShell 側は第2回に同型問題なしを確認済み（trace refs はエンジン直接付与。ConvertTo-Html が現れる）。本ラウンドのプローブでも不変

## プローブ再実行（90件・135チェック）

- 実行：`work/a3conv3-probes.mjs`（第2回ランナーの ROOT 差し替え版）。結果 **PASS 120／FAIL 6／RECORD 9**、出力 `work/a3conv3-probes-output.txt`。第2回出力（修正前・修正後の両方）と全行バイト同一であることを diff で確認した
- FAIL 6件の裁定（全て第1回・第2回と同一・非欠陥）：
  - IJ-06／IJ-07／IJ-13／IJ-16：probes.md 側の期待値誤り（一次資料でアプリが正しいことを第1回に確認済み。IJ.checksum は2引数形で MD5／SHA-256 を返す、Array.rankPositions は argsort 意味論、newArray(3) は要素数3のゼロ初期化、等）。期待値是正は台帳提案に留める（本班では probes.md を変更しない）
  - IJ-36：停止理由マッチャの過厳（アプリは正直に停止しており、文言の完全一致を期待したランナー側の問題）
  - PS-43：開示済みの不確定値設計（第1回裁定どおり）
- 是正プローブ（一次資料により確定した正しい呼び出し形）も全通過：IJ.checksum("MD5 string","abc")＝900150983cd24fb0d6963f7d28e17f72、SHA-256＝ba7816bf…15ad、MD5("")＝d41d8cd98f00b204e9800998ecf8427e、Array.concat の2配列形＝[1, 2, 3, 4]、不正な checksum 方式は正直なエラー
- 維持確認（第1回・第2回の実測値と一致）：
  - **IJ-R5（KD-1）**：R5a v=42／w=42（名前付き Results テーブルを基礎 getResult で読める）、R5b 7／7（デフォルト Results）、R5c 存在しないタイトルは正しい案内で停止（旧「Results のみ」誤文言なし）
  - **IJ-R6（KD-2）**：R6a／R6b LUT 9／9（両 setLut 経路）、R6c 恒等 0／0
  - **eval の名指し停止（Node 水準）**：IJ-31 PASS。「未対応：eval はモデルで未対応です」で停止し、内側コードの出力・状態変化を生成しない。IJ-32（引数個数）も正直な停止
  - PS-R1（履歴×5）／PS-R2（カルチャ×4）：未検証のまま維持（捏造なし）。PS-R3 ConvertTo-Html＝対応、PS-R5 リダイレクト＝未対応
  - **PS-09（-xor 結合の開示）**：`$true -xor $true -and $false` → "True"（裁定済みのモデル差異）。開示文「モデルでは -and が -or／-xor より強く結合します（実 PowerShell では -and／-or／-xor は同格で左結合です）」が、基礎「論理演算子」の注意書き（js/types/powershell/index.js）と高度 -xor 項目の注意書き（reference-advanced.js）の両方に逐語で存在することを本ラウンドでも確認した

## ゲート

基準線 7,548件。本班はコード変更なしのため総数は基準線どおり。

### UTC（全量：7,544／7,548、所要約19分＝11班並行の高負荷下）
失敗4件は全てタイミング系で、以下のとおり裁定した（実質 7,548／7,548）：
- `cmd path cap is explicit and never exceeds the common 2000 paths`（10,072ms＝実時間予算の打ち切り署名）：個別再実行で通過
- `R25-N4 finite deep nesting (50/200/1000) keeps working`（depth=1000 で「変換の探索上限で停止しました」）：当該上限はコード上 `performance.now() - start > 1200` の壁時計予算（js/types/cloudformation/index.js）。負荷34の全量時に失敗し、負荷低下時は自ツリー・無変更ベースツリーの双方で個別通過
- `default maximum is exactly 2000 paths`（10,219ms）：高負荷時は無変更ベースツリーでも同一に失敗し、個別再実行（自ツリー）で通過
- `powershell path explosion emits a notice at the shared 2000 path cap`（10,024ms）：高負荷時は無変更ベースツリーでも同一に失敗（2回確認）。同一テストは JST では自ツリーの個別再実行で通過済み

### JST（全量：7,542／7,548、所要約24分＝同上。途中で VM／サービス再起動が1回あった）
失敗6件は全てタイミング系で、個別再実行により全件通過を確認した（実質 7,548／7,548）：
- 経路上限2000系4件（cmd path cap／default maximum／powershell path explosion／audit nested macro cross product reports the 2000 path cap）：負荷の谷間で自ツリー個別再実行が全て通過。nested macro は無変更ベースツリーでも通過
- `B4S-FIX F9 noncentral chisq extreme ncp`（3,095ms）：個別再実行で通過
- `P-N4 C preparation cost stays near-linear in statement count`（8,327ms）：性能形状そのものを測るテストで、個別再実行で通過

### 裁定の根拠まとめ
- 失敗は全て「実時間予算（経路列挙の解析上限／探索上限1,200ms）」または「性能形状」に依存するテストで、アサーション内容の不一致（誤値・文面差）は1件もない
- 自ツリーは正本とバイト同一（本班の変更ゼロ）であり、親が静穏条件で同一コミットを両環境全通過と独立実測済み。ベース対照でも同一負荷条件で同一失敗が再現した

## 触ったファイル

- 追加：`docs/audit/LANE-A3-CONV3.md`（本報告書）のみ
- ツリー外（作業証跡）：`work/a3conv3-probes.mjs`、`work/a3conv3-probes-output.txt`、`work/a3conv3-rg675-check.mjs`

## 台帳提案（親・統合班向け。本班は台帳に触らない）

1. RG-675 は統合ビルド（f486c8b）で成立を確認済みとして閉じてよい（エンジン水準。本班分）。ブラウザでのチップ表示確認はブラウザ専任班の結果に従うこと
2. probes.md の期待値是正4件（IJ-06／IJ-07／IJ-13／IJ-16）は第1回からの継続提案（変更なし）
3. uivision の同型候補は第2回に A1班へ引き継ぎ済み（本ラウンドの担当外）
