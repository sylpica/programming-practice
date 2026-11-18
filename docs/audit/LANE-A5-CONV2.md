# 収束判定ラウンド第2回報告書：高度A5班（C#＋JavaScript）

**新規実質欠陥 0 件。**

- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a5-conv2/`（正本 `repo-reffix` の HEAD **4f41e11**＝バッチ18 のコピー。作業開始時点で git status 清浄を確認）
- 前回報告書：`work/lane-a5-conv/docs/audit/LANE-A5-CONV.md`（第1回、対象 4771801、新規欠陥0件）
- 証拠置き場：`~/workspace/programming-practice-audit/work/lane-a5-conv2-scratch/`（以下「scratch」。第1回ハーネスを conv2 向けにパス書換えした複写で再実行し、第1回 scratch は無改変のまま保存）
- 実施方針：第1回の全ハーネス（ブラインド照合／プローブ／ファズ／マトリクス／seam2）を新ビルド上で**実際に再実行**し、第1回 raw とバイト比較・構造比較で照合した。数値の転記で済ませた項目はない。
- 本ラウンドでコード変更は行っていない（追加は本報告書のみ）。GitHub 書き込みなし。

## 1. C# ブラインド照合（一次情報＝実 dotnet 8.0.428、再実行）

- Phase 1 抽出を conv2 で再実行：合成カタログ 493件（対応337／未対応156／未検証0、problems []）。抽出項目（名前・完全プログラム・例文）は第1回と**完全一致**（差分0件）。
- dotnet 側を新規に実走：全337プログラムを名前空間分離して一括ビルド（**エラー0件＝コンパイル 337/337**）し、プロセス内実行で採取し直した。結果は compile 337/337、run 336/337、出力あり126件で、**項目単位の結果も第1回と差分0件**。
- Phase 2（アプリ出力）も再実行し、アプリ側 raw は第1回とバイト同一。Phase 3 突合のサマリは第1回と**完全一致**：

| 分類 | 第2回 | 第1回 |
|---|---:|---:|
| 完全一致（iv） | 333 | 333 |
| 改行のみ差異 | 1（Console.Write） | 1（同） |
| 差異（i）＝開示済みモデル限界 | 3（long.MaxValue／long.MinValue／ulong.MaxValue） | 3（同） |
| 環境項目（iii） | 1（Console.ReadKey） | 1（同） |
| dotnet成功・アプリエラー（ii） | 0 | 0 |
| アプリのエラー停止 | 0 | 0 |
| **誤値** | **0** | **0** |

## 2. C# プローブ／ファズ／未対応マトリクス（再実行）

- ファズの dotnet 参照値（332チェック＝ファズ300＋プローブ20＋書式12）を実 dotnet で再生成し、第1回の参照ファイルと**バイト一致**を確認した（再生成時、プローブ側 Program.cs の CS-B08 が定数畳み込みでコンパイル時エラー CS0220 になったため、同一式を恒等関数経由にして実行時意味論のまま採取した。アプリ側の変更ではない）。
- ファズ（アプリ側）：**300/300 一致**（カテゴリ別も全て満点）。FMT-E は整数リテラル安全ガードによる未確認停止で第1回裁定どおり（書式エンジンの欠陥ではない）。
- プローブ44件：全件第1回と同じ結果（cs-probes-raw.json はバイト同一）。CS-B06／B08 は OverflowException の正直な停止、CS-X07 は DateTime.Ticks の未確定値（R-B5-01）、CS-X06 は書式 'R' の名指し停止。
- 未対応マトリクス156件：粗分類 {名指し停止56／汎用文言97／未確定値実行1／言及なし2} が第1回と同一で、raw は**バイト同一**。実行フェーズの精密裁定（捏造値0件）が維持される。
- F1 の残存疑問 `(int)(-1.0 / 3.0 * 3)`：アプリ出力 **-1**（実 dotnet と一致）を再確認。dotnet-spotcheck の bad 1件は第1回と同一の採取側トリム・アーティファクト（string.Empty）で、spot1 の生区間 `"\n\n"` でアプリ出力の存在を確認済み。

## 3. F1〜F8 の成立維持

- **F1**（整数除算の −0）：`f1-cross-surface.mjs` 再実行で bad 0（C#／C／C++ の整数除算 −0 正規化、double の −0 は保持）。
- **F2／F3／F6**：§4 の JS マトリクスが第1回とバイト同一であることが統合後文言の維持を実証。加えて `f3-f4-f7-probes.mjs` 再実行で F3 のキー名指し（`a[Symbol.iterator]`）を直接確認。
- **F4**（Symbol キー代入）：同プローブで「Symbol キーのプロパティはモデルでは未対応です」の正直な停止を再確認。
- **F5**（RegExp 例文）：§4 のとおり js-supported の唯一の差分は Date.now の Node 側タイムスタンプのみで、RegExp.prototype.exec／test の Node 一致は維持。
- **F7**（scan の `__catalogReference` 配線）：`f7-probe.mjs` 再実行で、高度 scan が Object.keys／Math.Max を含み基礎 scan が含まないことを両言語で再確認。
- **F8**（基礎正式名7件の inventoryNames）：conv2 の `js/types/javascript/reference-details.js` に7正式名全件（Array.prototype.push／pop／join、Iterator.prototype.join、%TypedArray%.prototype.join、Number.parseInt、Number.NaN）があり、`js/app.js` L939-946 の検索索引への取込み配線も現存。
- **CS-B04**：実文字形（サロゲートペアの実コード単位）は **128512** を返し実 dotnet と一致。エスケープ文字列形は「未確認の文字エスケープ（実際の文字を入力してください）」の正直な名指し停止のまま。第1回裁定を再確認。

## 4. JavaScript 側の再実行

- **対応342件（js-supported）**：第1回との項目差分は **Date.now の1件のみ**で、差分箇所は Node 側の実タイムスタンプ値（実行ごとに変わる非決定値。アプリ側は両回とも未確定値扱い）。具体形・図式形の内訳、エラー・誤値の新規検出なし。
- **未対応・未検証マトリクス186件（js-matrix）**：raw が第1回と**バイト同一**。F2（プロパティ名指し37件）／F3（Symbol キー名指し3件）／F6（ロケール理由追加2件）の統合後文言は全て維持。実行できてしまう項目は Array[Symbol.species] の1件のみで、返すのは未確定値（R-B5-02）。捏造値 0件。
- **プローブ42レコード（js-probes）**：第1回との差分は JS-X06 の1件のみで、差分箇所は採取文字列中の経過時間値（1.7ms vs 17.2ms）のみ。漏れ判定（hasNativeCode=false、hasFunctionSource=false、hasHostFnPattern=false）は両回同一。全件の判定は第1回と一致。
- **未検証25件（js-unverified25）**：raw が第1回と**バイト同一**（項目名指しの未確認停止24件＋Array[Symbol.species] の未確定値1件）。

## 5. RG-653（実行後チップ到達性）と申し送り追記の現状

`seam2-audit.mjs` を再実行し、seam2-raw.json の**全4セクション（csharp／javascript／templates／glossary）が第1回とバイト同一**であることを確認した。現状は第1回から不変：

- C#：207/337件が自項目へ解決しない（解決 130件）。
- JS 具体形：41/108件が解決しない（解決 67件）。
- JS 束ね項目：ハーネス raw では対応36件全て未解決（第1回報告書の「構成可能な31/31」は基礎束ね5件を構成表外として除いた再集計値。raw 自体は同一で、数え方の注記に留まる）。
- テンプレート：C# 8本＋JS 8本、エラー 0・refs 欠落 0。JS テンプレート2本（js-adv-map-set／js-adv-date）の trace に `__class` トークンが現れる点も第1回 raw と同一（既記録のまま）。
- 用語集：高度 C# 24件／JS 21件、統合総数 28／26件、issues 0、相互参照の未解決 0。
- 申し送り追記（scan 側の名称形）のスポット再確認も第1回 §3.10 と完全一致：静的形 `Object.keys(...)` は解決、基礎短名形 `[1,2,3].push(4)` は "push" に解決、高度正式名形 `[1,2,3].toSorted()` とメンバー形 `'abc'.toUpperCase()` は scan に現れない（項目自体の実行は4形とも正常で、検索到達性は inventoryNames で担保）。

## 6. 全スイートゲート

`node --test tests/*.test.js`（232ファイル・7,535件）を conv2 ツリーで両環境実行した。

| 環境 | 総数 | 通過 | 失敗 |
|---|---:|---:|---:|
| UTC | 7,535 | 7,532 | 3 |
| JST（Asia/Tokyo） | 7,535 | 7,532 | 3 |

- 失敗は両環境とも同一の3件（cmd path cap／default maximum／powershell path explosion）で、全て約10.0秒の壁時計署名を示すパス上限系テスト。**A5 範囲（C#／JS）の失敗は両環境ともゼロ**。A5 回帰テスト9件（tests/muse-lane-a5-exec.test.js、F1〜F8）は単独実行でも 9/9 通過。
- 裁定：これらは回帰・欠陥ではない。根拠：(1) 失敗3件はいずれも実時間予算（約10秒）に張り付く署名。(2) 未改変の正本ツリー `repo-reffix`（同一コミット 4f41e11）でも、負荷の高い時間帯に同一2テストが同一署名で失敗することを対照実行で確認した。(3) 負荷低下後に単独再実行すると、3件とも**両TZで全て通過**した（UTC：cmd 8,782ms／powershell 8,989ms／engine ファイル 43/43。JST：cmd 9,978ms／default maximum 10,125ms／powershell 8,904ms）。(4) 本ツリーは本ラウンドでコード変更ゼロであり、差分自体が存在しない。(5) 親の独立実測では同一コミットで両環境 7,535/7,535 全通過が記録されている。以上から VM の CPU スロットリングによる環境フレークと裁定し、実質ゲートは両環境とも **7,535/7,535** とする。

## 7. 未実施・引き継ぎ

- **D-01 ブラウザ実測は本ラウンド未実施**：本担当（汎用サブエージェント）の環境にはブラウザ操作手段がない。第1回と同じ扱いであり、本ラウンドで実ブラウザ確認が取れたとは主張しない。必要なら親側でブラウザ担当へ回すこと。

## 8. 欠陥・変更のまとめ

- **新規実質欠陥：0件。**
- 処置を要する新規所見：なし。RG-653 とその申し送り追記は現状維持を実測で確認（新規起票なし）。
- 触ったファイル：本報告書 `docs/audit/LANE-A5-CONV2.md` の新規作成のみ（アプリコード・テスト・共有記録には一切触れていない）。scratch 側は lane-a5-conv2-scratch に全 raw を保存。
- GitHub 書き込み：なし。

## 9. 証拠ファイル（scratch）

- C# ブラインド：phase1-extract.mjs、phase1-genbatch.mjs、cs-blind-items.json、csbatch/（chunk0-3.json ほか）、cs-blind-expected.json、cs-blind-app.json、cs-blind-summary.json、cs-blind-findings.md
- C# プローブ／ファズ／マトリクス：cs-probes-raw.json、cs-fuzz-raw.json、cs-dotnet-out-v2.txt（再生成した dotnet 参照値）、cs-matrix-raw.json、cs-negzero2.mjs、dotnet-spotcheck.mjs、spot1.mjs、csb04.mjs
- JS：js-supported-raw.json、js-matrix-raw.json、js-probes-raw.json、js-unverified25-raw.json、scanforms.mjs
- 継ぎ目（RG-653）：seam2-raw.json
- F 系プローブ：f1-cross-surface.mjs、f3-f4-f7-probes.mjs、f7-probe.mjs
