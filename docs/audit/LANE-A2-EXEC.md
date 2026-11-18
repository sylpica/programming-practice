# 高度A2班 監査・修正 実行報告書（LANE-A2-EXEC）

- 対象レーン: 高度A2班（Power Fx＝Power Apps／AutoHotkey v2／Power Automate WDL）
- 土台: repo-reffix HEAD `04dfe2d`（統合パス3完了時点）＋コーディネーターの RG-630 是正コミット `173efae`
- 作業ツリー: `~/workspace/programming-practice-audit/work/lane-a2-exec/`（repo-reffix 本体には触れていない。GitHub 書き込みなし）
- 計画正本: `lanes/lane-a2/plan.md`／`probes.md`（プローブ96件＝PFX-01〜31、WDL-01〜32、AHK-01〜33）
- チーム報告書: `work/lane-a2-team-wdl/docs/audit/lane-a2-team-wdl.md`、`work/lane-a2-team-pfx/docs/audit/lane-a2-team-pfx.md`、`work/lane-a2-team-ahk/docs/audit/lane-a2-team-ahk.md`
- **本班の合格はアプリ全体の収束ではない（U-46）**。収束判定は統合ビルドに対する全レーン合同の全角度ラウンドで行う。

## 1. 監査開始ゲート（計画 §2）— 全5件成立

| # | ゲート | 結果 | 根拠 |
|---|---|---|---|
| 1 | WDL のレジストリ登録（高度専用） | ✓ | `powerautomatecloud.advancedOnly = true` で `advancedOnlyDefinitions` のみに存在し、基礎 `definitions` は16種のまま |
| 2 | precache 除外 | ✓ | `scripts/precache.mjs` 15行目に高度ファイル除外パターン実装済み。生成済み precache.js に高度専用データファイル（advanced-manifest／advanced-engine／-advanced.js 等）は含まれず、基礎エントリ（`js/types/powerautomatecloud/index.js`、`js/core/advanced-loader.js`）のみ |
| 3 | 統合カタログ（Power Fx） | ✓ | mergeCatalog で参照221件（基礎28＋高度193）、テンプレート12、glossary 20、problems なし |
| 4 | 高度エンジン未適用時の正直な停止 | ✓ | `applyAdvancedEngine` 未適用では AHK の Map／Buffer 等が未対応として停止し、適用後に実行される |
| 5 | AHK 値の表示整形 | ✓ | trace／表示文字列で Map は `{"a": 1}`、Buffer は `{"Buffer（バイト列）": [7, 7]}` と整形され、`__ahkType`／`entries`／`bytes` の漏れなし（最終状態表示は js/core/contract.js の formatModelValue 経由） |

## 2. §0 件数照合 — 計画の主張と全件一致

| 種別 | 高度差分 | 内訳 | テンプレート | glossary |
|---|---|---|---|---|
| Power Fx | 193 | 対応136／未対応52／未検証5 | 6 | 11 |
| AutoHotkey | 405 | 対応98／未対応307／未検証0 | 6 | 15 |
| WDL | 137 | 対応116／未対応21／未検証0 | 6 | 8 |

Power Fx 未検証5件は計画どおり **AsType／IsType／RecordOf／Summarize／Type** で確定。

## 3. RG-630 裁定と処置（WDL のタイムゾーン依存）— エンジン是正で解消

### 症状と切り分け
- WDL `formatDateTime('03/15/2018')` が JST 環境で `2018-03-14T15:00:00.0000000`（−9時間）を返し、UTC 環境では期待どおり `2018-03-15T00:00:00.0000000` を返した。`tests/adv-b2-wdl.test.js` の (f2) が JST でのみ失敗。
- 統合前ツリー（49034f2）でも同一失敗を再現し、**統合回帰ではなく既存欠陥**であることを確認済み。

### 一次情報（Microsoft Learn「ワークフロー定義言語 関数リファレンス」、2026-11-18 取得）
- `formatDateTime('03/15/2018')` // Returns '2018-03-15T00:00:00.0000000'
- `formatDateTime('03/15/2018 12:00:00', 'yyyy-MM-ddTHH:mm:ss')` // Returns '2018-03-15T12:00:00'（壁時計が保存される）
- `parseDateTime('20/10/2014', 'fr-fr')` // Returns '2014-10-20T00:00:00.0000000'
- `convertToUtc('01/01/2018 00:00:00', 'Pacific Standard Time')` // Returns '2018-01-01T08:00:00.0000000Z'（ゾーンなし入力は**指定されたゾーン**で解釈され、閲覧者のゾーンではない）
- `dateDifference('2015-02-08', '2018-07-30')` // Returns '1268.00:00:00'。既定書式は "o"（ISO 8601）。

### 裁定
実 Power Automate／Logic Apps はサーバー側 UTC で動作し、ゾーン情報のないタイムスタンプは UTC の壁時計として解釈される。エンジンが実行環境（ブラウザ）のローカルタイムゾーンで解釈していたのは、JST のブラウザ利用者にも影響する**実欠陥**であり、テスト側の TZ 固定ではなく**エンジン是正**が正しい（選択肢1）。

### 根本原因と修正
- 原因: `js/types/powerautomatecloud/index.js` の `parseTimestamp` が素の `Date.parse` を使っており、ゾーンなし文字列がローカルタイムゾーン解釈になっていた。同根の第2表面として `simulate` 内の `baseTime` 解釈も同じ経路だった。他の表面（parseWithFormat は Date.UTC 使用、convertToUtc／convertTimeZone の壁時計処理は正規表現ベース）は TZ 安全であることを確認済み。
- 修正: `parseTimestampMs`／`utcFromParts` を新設（明示ゾーン付き→Date.parse、ISO 日付のみ→仕様どおり、構造化された ISO／スラッシュ形式→要素抽出＋Date.UTC＋範囲検査で V8 の受理範囲を保存（2月30日→3月2日の繰り越し含む）、その他→ローカル要素を UTC として再解釈）。`parseTimestamp` と `baseTime` 解釈の両方をこの経路へ統一。
- 検証: 19件のプローブ式＋ゾーンなし baseTime の utcNow が TZ=Asia/Tokyo／UTC／America/New_York／Pacific/Kiritimati で完全一致。`ticks('2018-03-15T00:00:00')` = `636566688000000000n` で Z 付き形と同値。エラー挙動（'not-a-date'、'2018-13-01' の解釈不能停止）は不変。
- 回帰テスト: `tests/lane-a2-wdl-tz.test.js`（新規4件）を JST／UTC／America/New_York で合格固定。**B2-WDL スイートは JST でも 15/15 全合格**になった（従来 14/15）。

## 4. 観察事項: デスクトップ種別の名称（計画 D-17 の前提訂正）

デスクトップ種別の `name` は "Power Automate" であり、導入時（bba3b26／93d80e4／04dfe2d で確認）から改名されたことはない。U-47 の正本表現は「既存の種類は「Power Automate（デスクトップ）」として**不変に残し**」であり、 operative なのは「不変」で、（デスクトップ）は説明的な併記である。計画 D-17 の「改名が伝播すべきだった」という前提は誤読と裁定し、**改名は行わない**（不変条件に反し、固定済みテストへ波及するため）。"Power Automate（デスクトップ）" の利用者向け使用は WDL 種別自身の semantics 説明文中の記述的表現のみ。

## 5. WDL 班結果（プローブ WDL-01〜32、C-12 全137件）

- 合格25件、挙動記録のみ2件（WDL-14／15: `isFloat('NaN')`／`isFloat('Infinity')` ともに false。項目文面に確定主張が無いことも確認）。
- **プローブ表の誤り6件**（いずれもアプリ側が Learn どおり。コーディネーターが Learn 該当節を再読して全件独立確認済み）:
  - WDL-03 `equals(true,1)` → true（Learn の equals 例そのもの: "Both values are equivalent"）
  - WDL-04 `equals(null,'')` → true（論理比較の注記: null 値は空文字列 "" に変換）
  - WDL-07 nthIndexOf 負値 → 末尾から探す（Learn パラメータ説明に明記。アプリは 3）
  - WDL-08 slice → 範囲外は切り捨て（Learn 例 `slice('Hello World', 30)` → `''`）
  - WDL-10 dateDifference → 表の引数順取り違え（定義は endDate − startDate。アプリの `-2.00:00:00` が正）
  - WDL-29 startsWith → 大小不区別（Learn 明記 "This function isn't case-sensitive"。アプリは true）
- WDL-05 は部分未確認: 素の `decodeDataUri` はバイナリ値を返し Learn どおり。`string(バイナリ値)` に表が期待する `'Hello'` は Learn の string() に根拠が無く未確認として記録（現挙動＝Base64 表現を「挙動記録」と明記してテスト固定）。
- WDL-13 の原物不変は、式モデルに変数別名が無いため同一式内で観測できず、`structuredClone` 後に削除する実装のコード確認で担保（方法を明記）。
- WDL-16 のタイムゾーン名小文字は正規ゾーンへ解決して正しい値を返すもので、虚偽結果ではないため欠陥と判定せず。
- C-12: adv-b2 テスト群（カタログ完全性・対応116件の使用例実行・(f)/(f2) 台帳で全関数2件以上のプローブ・未対応21件の名指し停止・到達性スイープ）に加え、`name()` 直接呼び出しでも未対応21件全件が名前とランタイム理由を挙げて停止することを補強確認。全て合格。
- RG-630 追随: WDL テスト群全26件を4つの TZ 環境で実行し全環境 26/26 合格・同一結果。残存 TZ 依存表面なし。

### 新規欠陥 WDL D-1（重要度: 高）— 書式の 'T' リテラル
- 事実: Learn の代表例 `formatDateTime('03/15/2018 12:00:00','yyyy-MM-ddTHH:mm:ss')` が「書式トークン「T」は未対応です」で停止していた。.NET カスタム書式では 'T' は指定子ではなくリテラル。項目文面にも 'T' リテラルの開示が無く「開示済み制限」とは言えないため**欠陥と裁定**。
- 根本原因: 書式解釈器が .NET のリテラル規則（裸の T・引用符・`\` エスケープ）を実装しておらず、英字を一律に未対応扱いしていた。副次的に `checkFormatRun` が混在英字列全体を1ランとして測り、`ddddT…` では `dddd` 自体を名指しできていなかった。
- 修正: `readFormatLiteral` を新設し `formatParts`／`parseWithFormat` 両系統に組み込み（formatDateTime／add・subtract 系／convert 系／startOf 系／getFuture・getPast／utcNow／parseDateTime の全16表面＋解釈側へ波及）。`checkFormatRun` を同字ラン判定に変更。formatDateTime／parseDateTime の注意文を実態に合わせて追記。
- 回帰テスト: `tests/lane-a2-wdl-audit.test.js`（7件）。`formatTimeSpan` は独自実装で書式制限が既存テストの宣言済み挙動のため対象外。

## 6. Power Fx 班結果（プローブ PFX-01〜31、C-12 全221件）

- プローブの大半は合格。JST／UTC 両環境で全プローブ完全一致（環境依存なし）。
- **プローブ表の誤り2件**（コーディネーターが Learn function-round を再読して独立確認済み）:
  - PFX-08: `Trunc` に小数桁は指定できない（Learn: "Decimal places cannot be specified with Trunc"）。統合ビルドの引数エラー停止が正しい。
  - PFX-09: `Round` の DecimalPlaces は必須（Learn 構文表で Required）。同上。
- **新規欠陥5件（全て根本修正＋回帰テスト付き）**:
  - **PFX-D1（高）**: 基礎 Sum が文字列を `Number()` 強制変換し全体が NaN 化していた。Learn function-aggregates（非数値は無視）に従い、テーブル形・数値形とも「数値のみ集計、無ければ Blank」に修正。`js/types/powerapps/index.js`。
  - **PFX-D2（高）**: テキスト等値比較が大小区別だった（`"abc" = "ABC"` が false）。`fxEqual` を導入し `=`／`<>`／Switch／Filter 条件を統一。`js/types/powerapps/index.js`。**残存申し送り**: 順序比較（`>`／`<` 等）は共有コア baseBinary（js/core）経由で大小区別のまま — 共有ファイルのため本班では触らず申し送り（§10）。
  - **PFX-D3（中）**: CountA が空文字列を除外していた。Learn function-table-counts は "" を数えると明記（コーディネーターが逐語確認済み）。修正＋B2 テストの誤った期待値 2→3 を Learn 引用付きで是正。`semantics-advanced.js`、`tests/adv-b2-powerapps.test.js`。
  - **PFX-D4（低・文面）**: Weekday 項目だけ StartOfWeek 列挙形の未解決開示が無かった → caution 追加。`reference-advanced.js`。
  - **PFX-D5（低・文面）**: Acos／Asin／Ln／Log／Power／Sqrt＋同根の Cot の caution が「エラー値になるため」と誤って確定主張していた（Learn は未定義結果＝Blank）。7件を「実 Power Fx では Blank だが、このモデルでは停止する」旨の正しい開示に是正（エンジン挙動は不変）。`reference-advanced.js`。
- **PFX-15 再裁定（未検証5件）— ステータスは独断で変更せず、提案として記録**:
  - AsType／IsType: Learn 現行文面では Dynamic 値＋Type の実例（`AsType( ParseJSON( "{\"a\":1}" ), Type( {a: Number} ) )` 等）で確定可能になっている → **対応化の提案**（前提: Type 値表現と ParseJSON 第2引数の実装）。
  - Summarize: 意味論は完全定義済みで、未検証の理由は意味論の未確定ではなく本モデルのパーサー（As 構文）と ThisGroup スコープの不在 → **unsupported 寄りへの再分類の提案**。
  - RecordOf／Type: B2 裁定は現行モデルでは妥当（RecordOf は Type 内でのみ意味を持ち、Type の受け皿がモデルに無い）。
  - 5件とも使用時は自分の名前を挙げて停止し、捏造した挙動を返さないことを実測。
- PFX-12〜14: 確定を装う文面は全走査で無し（合格条件＝未検証の維持を満たす）。エンジン実挙動（`Blank() = 0` → false、`Blank() = ""` → false、`"5" + 3` → 型エラー停止）は記録のみで期待値として断定していない。
- PFX-16／17／18・Remove 部分一致は記録のみ（PFX-16 の文面は PFX-D5 で是正。Value の桁区切りは Learn en-US 例との差異として申し送り §10）。
- C-12: 高度193（supported 136 の使用例は135件正常＋Error 関数の宣言どおりの発生1件、unsupported 52＋unverified 5 は全件名指し停止）、基礎28件全件正常。修正後も JST／UTC 同一結果で回帰なし。

## 7. AutoHotkey 班結果（プローブ AHK-01〜33、C-12 全405件＋基礎26件）

- **プローブ表の誤り・前提是正6件**（コーディネーターが公式 Throw.htm／Map.htm を再読して F1 と AHK-10 を独立確認済み）:
  - AHK-04／05／06: 裸 Catch は非 Error 値を受けない（下記 F1 と同根）。
  - AHK-10: Map.CaseSense の既定は "On"＝区別する（Map.htm: "On by default... Key lookups are case-sensitive. This is the default setting."）。本表の「既定は区別しない」は v1 的前提の誤り。アプリ実装・文面とも公式どおり。
  - AHK-02／03: 文字列 Throw では目的（Else／Finally の検証）が果たせないため公式形（Error Throw）に是正して確認。
  - AHK-19／20: WinActivate／Send は基礎対応であり「未対応停止」の前提自体が誤り（モデルに無いタイトルは TargetError、Send はモデルへ送信）。
- **新規欠陥7件（全て根本修正＋回帰テスト付き）**:
  - **F1（P1）**: **B2 の「P1修正」自体が公式と逆だった** — クラスなし Catch が文字列・数値・オブジェクトを何でも受けていた（「公式仕様どおり」と誤記したコメント付き）。公式 Throw.htm: "Values of all kinds can be thrown, but if Catch is used without specifying a class (or Try is used without Catch or Finally), it will only catch instances of the Error class."（コーディネーターが逐語確認済み）。Error のみに是正し、型名の単独指定（Catch String 等）を変数名と誤認していた問題も併せて修正。B2 テストの依存期待値は一次情報の根拠コメント付きで書き換え。`js/types/autohotkey/index.js`。
  - **F2（P2）**: Catch Object／Map／Array が対応オブジェクトを受けなかった → クラス照合を是正（Error 値の Object 基底一致含む）。`semantics-advanced.js`。
  - **F3（P2）**: Catch／Finally なし Try の暗黙の Error 受け取りを実装（公式 Throw.htm の同括弧書きが根拠）。`semantics-advanced.js`。
  - **F4（P2）**: Round の戻り値型を是正（桁数>0 のみ Float、省略・0・負は整数）。B2 テスト期待値も是正。`semantics-advanced.js`。
  - **F5（P3）**: 未捕捉オブジェクト Throw の "[object Object]" 表示を整形表示に是正。`semantics-advanced.js`。
  - **F6（P2）**: 正規表現変換のエスケープ盲・クラス盲置換（`\\A` リテラル・`[\A]` が ValueError 化）を、エスケープ対と文字クラスを意識した1パス走査（convertRegexEscapes）に置換。B2 の \K 修正と同根の兄弟表面。`semantics-advanced.js`。
  - **F7（P3）**: Catch／Round／Throw のリファレンス文面を公式整合に是正。`reference-advanced.js`。
- 名指し停止の全数照合: 通常関数 **271/271** が名指し停止。ドット形36件は構築可能な3件（Array.__Enum／Map.__Enum／Object.OwnProps）が名指し停止、残り33件（File.* 10・Menu.* 15・InputHook.* 4・Func.* 4）はコンストラクタ自体が停止し到達不能と記録。
- C-12: 対応98件を文脈付きで実行し 97/98＋Throw は投げるのが宣言どおり。基礎26/26。
- C-03: trace・最終状態表示・出力のいずれにも内部キー漏れなし。ただし paths[].vars の生オブジェクトには内部表現が残る（B2 申し送り6 のデータ層残存、表示には出ない。共有側の管轄として申し送り §10）。
- Try/Catch の Else 節（B2 是正点）: 例外なしでのみ実行・Catch 発動時は不実行・伝播時は不実行・Finally は全経路、を公式形で再現確認。
- 記録のみ・未確認の維持: AHK-16（Round タイ方向は公式で確定できず記録のみ。実装は 0 から遠い側）、AHK-22（EnvGet の仮想環境変数代替は「保留」の明記のまま）。

## 8. 統合と検証（コーディネーター実施）

### 統合方法
- 3班は各々のツリー（土台 173efae のコピー）で作業し、環境障害（後述）のためコミットできなかった。コーディネーターが変更ファイルを本ツリーへ取り込み、**全12件の変更・新規ファイルについてチームコピーとの sha256 バイト一致を検証**した（エンジン7件、既存テスト2件、新規テスト3件）。
- precache.js は統合後の実ツリーで再生成し、公式手順 `node scripts/precache.mjs --check` の合格を確認（キャッシュ名 `programming-practice-0b5f248e75d283`、アセット一覧は不変）。

### テスト結果（統合ツリー・静穏条件）
| 環境 | 全スイート（209ファイル） | 結果 |
|---|---|---|
| TZ=Asia/Tokyo | 7,242件 | **全合格** |
| TZ=UTC | 7,242件 | **全合格** |

- 内訳（両環境共通）: チャンク別 2,394＋1,822＋512＋845＋725＋944 = 7,242。ベースライン 7,164 件から +78 件（新規テスト: WDL監査7＋PFX監査26＋AHK監査41＋WDL TZ回帰4）。
- レーン関係テスト（adv-b2 3種＋新規監査3種＋TZ回帰）は両環境とも 184/184。
- **基準線の変更（明示）**: RG-630 のエンジン是正により、**JST でも全通過が新しい基準線**になった（従来は JST のみ RG-630 の1件失敗が基準線）。UTC 全通過は維持。
- 切り分け記録: 統合前の並行負荷下で走らせた全スイート実行で末尾に2件の失敗（powershell path-cap「1!==2000」、未同定の false/true 1件）が見えたが、静穏条件での今回の全件再実行では**どちらも再現しなかった**（powershell path-cap はチャンク4に含まれ合格）。VM のタイミングフレークと裁定し、欠陥としては扱わない。再現した場合はベースツリー対照の上で再裁定すること。

### コーディネーターの独立検証（チーム報告を鵜呑みにしていない事項）
- WDL プローブ表の誤り6件を Microsoft Learn の該当節（equals／nthIndexOf／slice／startsWith／dateDifference 定義／論理比較の null 変換注記）で再読確認。
- PFX-D3 の根拠（function-table-counts の CountA 文面）と PFX-08／09（function-round）を Learn で逐語確認。
- AHK F1 の根拠（Throw.htm の Catch 意味論）と AHK-10（Map.htm の CaseSense 既定 "On"）を公式ドキュメントで逐語確認。
- 3班すべての修正差分を目視精査し、報告どおりの最小差分であることを確認。

### 実施しなかった角度
- D-01 ブラウザ実機スモーク（モード切替→WDL 種別の高度限定出現、ステータスタグ表示）は本班では未実施。接合レーンが全ブラウザマトリクスを担当する前提で、申し送りとする。

## 9. 環境障害と事故の記録

- **exec 書き込み EPERM エピソード**（2026-11-18 00:47 UTC 頃〜）: シェル経由のファイル書き込みが全面的に遮断され、3班とも自コピーでの git コミットが不可能だった。各班はシンボリックリンク併用コピー＋ファイルツールでの実体化で作業を完遂し、コーディネーターが §8 の方法で統合した。本ツリー（lane-a2-exec）の内容自体は無傷であることをハッシュで確認済み。
- **precache 一時切り詰め事故**（WDL 班）: チームコピー側で `node scripts/precache.mjs` を実行した際、シンボリックリンク経由の実パス解決により lane-a2-exec 側の precache.js が一時的に 0 バイト化した。事故前にバイト一致を検証済みだったコピーから即座に書き戻され、復旧後の sha256 が正規生成物と一致することと `--check` 合格をコーディネーターも再確認した（本報告書 §8 の統合前チェックで、precache.js／WDL エンジン／TZ テストの3件が HEAD 173efae とバイト一致であることを確認済み）。恒久対策: リンク農場ツリーでは precache スクリプトを実行しない。

## 10. 申し送り（共有側・他レーン・台帳宛て）

### 共有側への申し送り
1. Power Fx のテキスト順序比較（`>`／`<`／`>=`／`<=`）は共有コア baseBinary（js/core）の大小区別比較のまま。等値（PFX-D2 で是正）と揃えるかは共有側の判断。
2. AutoHotkey の整数除算 `//` 演算子（AHK-31）: 共有コアの演算子管轄。現状は名前・理由入りの正直な停止。
3. ユーザー定義関数／アロー関数（AHK-33）: 基礎の未対応宣言の範囲。対応可否は基礎レーンの判断事項。
4. paths[].vars 生オブジェクトの内部キー残存（B2 申し送り6 の存続）: 表示には出ない。データ層の整形は js/core 側の判断事項。
5. Ceil／Floor の戻り値型（観察事項）: 現行は Float タグ保持（Ceil(1.2) が "2.0" 表示）。Round（F4 是正）との整合は一次情報の追加確認が要るため本班では変更していない（B2 テストが現行挙動を固定）。
6. Power Fx の基礎 Value の桁区切り: Learn en-US 例（`Value("123,456")` = 123456）と本モデル（変換エラー）の差異。基礎仕様判断を伴うため本班では挙動を変更していない（項目文面は「地域依存書式は未対応」と開示済み）。
7. 角括弧リテラル `[3, "text", 4]` の行スコープでは Value 列が解決できず `Sum([3, "text", 4], Value)` が「未定義の名前：Value」で停止する（Table 形では正常）。rowEval の単一列正規化の話であり、PFX-D1 の範囲とは別件として記録。

### 台帳への提案（番号は台帳管理側で採番されたい。次空きは RG-636 の想定）
1. RG-630: 本報告書 §3 の裁定・是正をもって**解消**として記録（JST 全通過が新基準線）。
2. WDL D-1（書式 'T' リテラル、重要度: 高）を新規欠陥として登録。
3. PFX-D1〜D5 を新規欠陥として登録（D1・D2 は高、D3 は中、D4・D5 は低・文面）。
4. AHK F1〜F7 を新規欠陥として登録（F1 は P1。**B2 の P1 修正が公式と逆だった**旨を明記）。
5. プローブ表（lanes/lane-a2/probes.md）の誤り計14件（WDL-03／04／07／08／10／29、PFX-08／09、AHK-02／03／04／05／06／10 の前提・期待値、および AHK-19／20 の前提）を、一次情報の根拠付きで訂正。
6. PFX-15 の提案2件（AsType／IsType の対応化＝Type 値表現と ParseJSON 第2引数が前提、Summarize の unsupported 寄り再分類）を検討事項として登録。
7. B2 テストの期待値是正3件（CountA 2→3、AHK auditC の公式意味論への書き換え、AHK Round "3.0"→3）は一次情報の根拠コメント付きで実施済みである旨を記録。

## 11. 残存・未確認（統合一覧）

- WDL: `string(バイナリ値)` の 'Hello' 期待（WDL-05 後段）は Learn 未定義の未確認。isFloat の 'NaN'／'Infinity'（WDL-14／15）は挙動記録のみ。将来 Learn に確定文面が出れば監査テストの「挙動記録」を期待値へ格上げ可能。
- Power Fx: 未検証5件のステータスは不変（提案は §10-6）。DateDiff 月末日（PFX-17）は未確認のまま。Remove の部分レコード一致の文面は曖昧さとして記録のみ（確定主張とは断定せず）。Error 値モデルの近似（文字列 Message を持つユーザーオブジェクトを投げると Error 値として扱われる）は AHK 側の残存として記録。
- AutoHotkey: Round タイ方向（AHK-16）は未確認のまま。EnvGet 仮想環境変数代替（AHK-22）は保留のまま。ドット形33件はコンストラクタ停止により到達不能（名指し停止の全数照合の範囲外として明記）。`\p{Letter}` 等の長いプロパティ名は偶然一致するものがあるが、JS の u フラグで解釈できないものは正直な ValueError（観察事項）。

## 12. 触ったファイル（統合ツリー、HEAD 173efae からの差分）

エンジン:
- `js/types/powerautomatecloud/index.js`（WDL D-1。RG-630 是正は 173efae に含む）
- `js/types/powerapps/index.js`（PFX-D1、PFX-D2）
- `js/types/powerapps/semantics-advanced.js`（PFX-D3）
- `js/types/powerapps/reference-advanced.js`（PFX-D4、PFX-D5）
- `js/types/autohotkey/index.js`（AHK F1）
- `js/types/autohotkey/semantics-advanced.js`（AHK F2〜F6）
- `js/types/autohotkey/reference-advanced.js`（AHK F7）

テスト:
- `tests/adv-b2-powerapps.test.js`（PFX-D3 の期待値是正1件）
- `tests/adv-b2-autohotkey.test.js`（AHK F1 の auditC 書き換え、F4 の Round 期待値是正）
- `tests/lane-a2-wdl-audit.test.js`（新規7件）
- `tests/lane-a2-pfx-audit.test.js`（新規26件）
- `tests/lane-a2-ahk-audit.test.js`（新規41件）
- `tests/lane-a2-wdl-tz.test.js`（新規4件、173efae に含む）

その他:
- `precache.js`（統合後に再生成、`--check` 合格。キャッシュ名 `programming-practice-0b5f248e75d283`）
- `docs/audit/LANE-A2-EXEC.md`（本報告書）

共有記録ファイル（台帳・状態ファイル・DEVELOPMENT.md・PROGRESS.md）は一切触れていない。台帳への提案は §10 に集約した。
