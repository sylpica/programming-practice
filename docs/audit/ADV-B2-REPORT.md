# 高度モード ブロックB2 報告書（Power Apps／AutoHotkey v2／Power Automate WDL新種別）

- 作業ツリー：`~/workspace/programming-practice-audit/work/adv-b2/`（ベース bba3b26）
- GitHub 書き込み：なし（本ブロックはローカル完結。配信は親工程）
- テスト総数：基礎 4,597 ＋ 高度 106 ＝ **4,703 件、全合格**（コーディネーター自身の最終実行で確認。既知の時間予算フレーキー3件も最終実行では発生せず）

## 1. 成果物と件数

| 種別 | 母数 | 対応 | 未対応 | 未検証 | テンプレート | 用語集 | 専用テスト |
|---|---|---|---|---|---|---|---|
| Power Apps（Power Fx）高度差分 | 193（棚卸し未収録分） | 136 | 52 | 5 | 6 | 11 | 56 |
| AutoHotkey v2 高度差分 | 405（未収録398＋公式列挙で確定した7） | 98 | 307 | 0 | 6 | 15 | 35 |
| Power Automate（クラウド）WDL 新種別（U-47） | 137 | 116 | 21 | 0 | 6 | 8 | 15（プローブ台帳408件） |

- AutoHotkey の未確認3グループは公式ドキュメントから列挙して母数を確定した（InputHook メソッド4件、RegExMatchInfo メソッド3件、String 固有メソッド0件。詳細は `docs/audit/ADV-B2-AHK-ENUM.md`）。
- WDL テストは台帳方式（正常・境界304件＋異常系104件）で、対応116件全件に2件以上のプローブがあることをメタテストで機械保証する。
- Power Fx の Column は監査で未検証→対応へ裁定変更（下記）。最終内訳は対応136／未対応52／未検証5（AsType／IsType／RecordOf／Summarize／Type）。

## 2. 実装の形（モード機構契約への適合）

契約文書 `work/adv-mech/docs/audit/muse/advanced-interface.md` に可能な範囲で寄せた。

- 差分ファイルは種類ごとに `reference-advanced.js`（`referenceAdvanced` を export、`status` のみで状態を表し `supported` 併記なし）／`templates-advanced.js`／`glossary-advanced.js`（[語, 定義] ペア）／`advanced-manifest.js`／`advanced-engine.js` に分離。
- エンジン拡張の入口は `advanced-engine.js` の `applyAdvancedEngine(definition, merged)` に集約した。未適用（簡易モード相当）では基礎挙動と完全に一致することを、基礎テスト全件の合格と専用 gating テストで固定している。
- 基礎側の変更は `js/types/powerapps/index.js` と `js/types/autohotkey/index.js` の最小配線のみ（高度ハンドラへの委譲可否チェック。モード判定・localStorage 参照は一切なし）。既存種別「Power Automate（デスクトップ）」は無変更。precache.js は再生成していない（高度ファイル名は契約の除外パターンに一致）。
- WDL 新種別は `js/types/powerautomatecloud/` に自己完結した種類定義として配置し、registry には登録していない（統合側の作業）。

### 契約との残存差異

1. index.js に委譲可否の最小チェックが残る（契約 未決 R-2 の「最低限の配線」の解釈。B1 初例で確定したら追随する）。
2. `applyAdvancedEngine` の `merged` 引数は未使用（契約 未決 R-3 で形が未確定。有効化は semantics-advanced 側の有効化 API 呼び出しで完結）。
3. WDL 新種別は高度差分ファイルを持たず基礎定義のみで完結する方式（契約 未決 R-5。mergeCatalog の観点では「base＝新種別定義そのもの、advanced 差分＝空」。status 形式への移行が要るかはモード機構コーディネーターの確定事項）。

## 3. ブロック監査の結果（角度カタログを3種別範囲で実施、対象外は理由明記）

監査は3班並行（Power Fx／WDL／AHK＋横断機械照合）で実施し、所見は全件同ブロック内で修正・再検証した。主なもの：

### Power Fx（所見11件：P2×5、P3×6、全件修正）
- Atan2 の引数順が逆（Learn は Atan2(X, Y)）
- Weekday の戻り値種別 12〜16 が1つずつずれ
- Index の範囲外が Blank を返していた（Learn はエラー値）
- DateDiff の Quarters 単位が未実装（文面からも欠落）
- 集計関数が数値でない値を変換・エラー化していた（Learn は無視）
- Trunc の小数桁引数、Round 系の桁数省略の受理、With 内側の動作数式の誤停止、Count の複数列テーブルへの 0 返却（捏造）、JSON caution の実挙動との不一致
- 裁定変更：Column は Learn で意味論が確定していた（ParseJSON 等の動的レコードから列名で値を取る関数）ため未検証→対応に変更し実装した。残る未検証5件はモデルに型同一性・型値の仕組みが無く確定できないことを Learn 文面で再確認済み。

### WDL（所見16系統、全件修正）
- replace／contains が大小文字を区別せず、文面も「区別しません（仕様）」と虚偽だった（Learn は case-sensitive）
- nthIndexOf の負の occurrence、slice の範囲外、substring の length 必須化（Learn は任意）
- equals(true, 1)・equals(null, '') の誤り、bool の対応表、removeProperty の原物返却、decodeDataUri の戻り値型（バイナリ）
- 日時の既定書式が "o" 形式でない（同根で17関数表面）、dateDifference の形式、addToTime の月末丸め、div の小数判定、タイムゾーン名の大小文字等
- 期待値を変更した既存テスト9件は、いずれも一次情報＋修正前実測で従来値の誤りを証明済み。

### AutoHotkey（所見6件：P1×1、P2×4、P3×1、全件修正＋Else 節の追加是正）
- クラスなし Catch が Throw された非 Error 値（文字列・数値・オブジェクト）を受けられなかった
- Map.CaseSense が黙って無視されていた（代入・読み出し・キー照合・Clone 引き継ぎを公式どおりに是正）
- PCRE→JS RegExp 変換の黙った誤値（\p{...} の等価変換、\K 等は構文名を挙げて未対応停止、\z／\A の厳密化）
- 高度値の内部表現がトレース表示に漏れていた（semantics.format を接続し可読化）
- Round の説明文が公式と逆、EnvGet／EnvSet の文面不整合
- 追加是正：Try/Catch の Else 節が原因を誤る文言で止まっていた問題を、Else 節の正しい実装（例外なしでのみ実行、Catch 発動時・伝播時は実行しない、Finally は全経路）で解消した。

### 横断機械照合
- F-02：3種別とも棚卸し↔高度カタログの過不足ゼロ。supported 項目は全件エンジン到達可能。AHK の未対応の通常関数271件は全件が自分の名前を挙げて停止することを機械実行で確認。
- 契約チェックリスト (a)〜(g)：status 全件付与、name/id 重複なし、referenceOverrides 不使用、テンプレート refs は supported のみ、precache 混入なし（現行 precache.js に対して）。
- コーディネーター独立裏付け：主要修正8件（PA の Atan2／Weekday／DateDiff Quarters、WDL の replace／nthIndexOf／equals／utcNow 書式／substring）を自プローブで再現確認した。

### 対象外とした角度（理由）
- 実ブラウザ・レイアウト・キーボード等の D 群、保存・SW 実測等の E 群：画面と基盤は機構側の担当で、本ブロックの差分データと意味論の範囲外（D-07 のテンプレート trace 機械走査のみ実施し18件全件を確認）。
- 実物ランタイム照合（A-03）：Power Fx／AHK／WDL のいずれも実物実行系が無く、一次情報照合で代替した。

## 4. 残存・統合への申し送り

1. **registry 登録**：`powerautomatecloud` を registry に登録し、高度モードでのみ現れる振り分けを行う（機構側）。
2. **precache.mjs の除外パターン**：機構側で契約のパターン（`advanced-manifest.js`／`advanced-engine.js`／`-advanced` を含む.js）を実装すること。現行の基礎版 precache.mjs のまま再生成すると高度ファイルが混入する。
3. **カタログ合成と scan 対象化**：referenceAdvanced／templatesAdvanced／glossaryAdvanced の definition への合成、名前解決・検索の対象化（機構側）。
4. **applyAdvancedEngine の接続**：merged 引数の形が確定したら（契約 R-3）接続を調整する。
5. **WDL の基礎層の置き方**（契約 R-5）：現行方式を正式に認めるか、status 形式への移行が要るかの確定。
6. **AHK の最終状態（vars）表示**：トレース面は是正済みだが、`paths[].vars` の生値には Map／Buffer の内部キーが残る。表示整形は共有の表示層の責務のため、統合側で formatModelValue の高度値対応を確認されたい。
7. **semantics.support 宣言文への高度説明の併記要否**：基礎側の宣言文は不変更のまま。併記するかは統合ブロックの判断。
8. **未確認候補**（一次情報で確定できず現行挙動を維持。文面との矛盾なし）：Power Fx の三角関数定義域外の扱い／DateDiff の月末日ケース／Remove の部分レコード一致範囲／桁区切り "1,000" の受理可否。WDL の isFloat('NaN')／isFloat('Infinity')。AHK の Round のタイ（中間値）の丸め方向。
9. **EnvGet／EnvSet**：仮想環境変数での代替は最終判断事項として保留のまま（項目文面は読み／書きの区別まで是正済み）。

## 5. 変更ファイル一覧

- 新規：`js/types/powerapps/` の高度差分5ファイル、`js/types/autohotkey/` の高度差分5ファイル、`js/types/powerautomatecloud/index.js`、テスト3ファイル（`tests/adv-b2-powerapps.test.js`／`adv-b2-autohotkey.test.js`／`adv-b2-wdl.test.js`）、`docs/audit/ADV-B2-AHK-ENUM.md`、本報告書。
- 変更：`js/types/powerapps/index.js`、`js/types/autohotkey/index.js`（最小配線のみ）。
- 無変更を確認：既存種別 powerautomate（デスクトップ）、registry.js、precache.js、scripts/precache.mjs、sw.js。
