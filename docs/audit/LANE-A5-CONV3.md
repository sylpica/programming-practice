# 収束判定ラウンド第3回報告書：高度A5班（C#＋JavaScript）

**新規実質欠陥 0 件。**

- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a5-conv3/`（正本 `repo-reffix` の HEAD **f486c8b**＝バッチ19 のコピー。作業開始時点で git status 清浄を確認し、本ラウンドでアプリコード・テストには一切触れていない＝ツリーは正本とバイト同一のまま）
- 前回報告書：`work/lane-a5-conv2/docs/audit/LANE-A5-CONV2.md`（第2回、対象 4f41e11、新規欠陥0件）
- 証拠置き場：`~/workspace/programming-practice-audit/work/lane-a5-conv3-scratch/`（以下「scratch」。第2回ハーネスを conv3 向けにパス書換えした複写で再実行し、第2回 scratch は無改変のまま保存）
- 実施方針：第2回の全ハーネス（ブラインド照合／プローブ／ファズ／マトリクス／seam2）を新ビルド上で**実際に再実行**し、第2回 raw とバイト比較・構造比較で照合した。数値の転記で済ませた項目はない。本ラウンドの重点は、バッチ19の **RG-676（c-family の NULL 等価比較是正）が C# へ波及していないこと**の実測確認。
- GitHub 書き込みなし。

## 1. C# ブラインド照合（一次情報＝実 dotnet 8.0.428、再実行）

- Phase 1 抽出を conv3 で再実行：合成カタログから対応337件を抽出し、抽出項目 JSON は第2回と**完全一致**（差分0件）。
- dotnet 側を新規に実走：全337プログラムを名前空間分離して一括ビルド（**エラー0件＝コンパイル 337/337**）し、4チャンクでプロセス内実行を採取し直した。チャンク記録337件は第2回と**項目単位で全件バイト一致**（差分0件）。
- Phase 2（アプリ出力）・Phase 3（突合）も再実行。サマリは第2回と**完全一致**：

| 分類 | 第3回 | 第2回 |
|---|---:|---:|
| 完全一致（iv） | 333 | 333 |
| 改行のみ差異 | 1（Console.Write） | 1（同） |
| 差異（i）＝開示済みモデル限界 | 3（long.MaxValue／long.MinValue／ulong.MaxValue） | 3（同） |
| 環境項目（iii） | 1（Console.ReadKey） | 1（同） |
| dotnet成功・アプリエラー（ii） | 0 | 0 |
| アプリのエラー停止 | 0 | 0 |
| **誤値** | **0** | **0** |

- cs-blind-expected.json／cs-blind-summary.json は第2回とバイト同一。cs-blind-app.json のバイト差はメタデータの `updatedAt` タイムスタンプのみ（レコード単位の構造比較では337件すべて一致）。cs-blind-findings.md の差分は対象ツリーのパスの1行のみ。

## 2. RG-676（NULL 等価比較是正）の C# 非波及確認（本ラウンド重点・新規実施）

バッチ19で `js/core/c-family.js` の `binary()` に追加された是正は、コード上 `!managed` でガードされ、`managed` は `id === "csharp"` でのみ真（c-family.js:3464）。この構造確認に加え、アプリ実挙動で20ケースを新規プローブ（scratch/rg676-csharp-null.mjs）し、**バッチ18ツリー（4f41e11、是正前）でも同一プローブを実行して全20ケースの出力がバイト一致**することを確認した。是正の C# への観測可能な影響はゼロ。

- 参照型 null 比較は実 C# と一致：`string s = null; s == null` → True、`s != null` → False、`s == "a"` → False、リテラル `null == null` → True。
- 漏洩シグネチャの直接検査：`string s = null; s == 0` は、是正が漏れていれば null→0 変換で True になるはずが、アプリは **False** を返す（本節末尾の観察参照）。null を 0 として扱う経路は C# で発火していない。
- nullable 型（`int?`／`bool?`／`double?`）はアプリ方言の対象外で、全ケースが構文名を挙げる正直な名指し停止（「nullable 型（int?）は未対応」）。実 C# の期待値（`int? x = null; x == 0` → False 等）は実 dotnet で別途裏付け済み（N05 False／N06 True／N07 True／N09 False／N11 False／N13 False／N17 False／N19 False、`int == null` は CS0472 警告つきでコンパイル可・False）。持ち上げ演算子の表面自体が方言に存在しないため、RG-676 型の誤値が入り込む経路はない。
- `object` 型の宣言も方言対象外の名指し停止（従来どおり）。
- **観察（新規欠陥には数えない）**：`string s = null; s == 0` は実 C# ではコンパイルエラー（CS0019）だが、アプリは False と評価する。これはバッチ18以前からのモデルの型検査の緩さ（foreach の変換なし緩さ R-B5-11 と同族の、静的型検査を完全には行わないモデル特性）で、バッチ19前後で不変。コンパイルできる実 C# プログラムと矛盾する値を返すものではなく、RG-676 の漏洩でもない。台帳への記録は親の判断に委ねる。

## 3. C# プローブ／ファズ／未対応マトリクス（再実行）

- プローブ44件：cs-probes-raw.json は第2回と**バイト同一**（CS-B06／B08 の OverflowException 正直停止、CS-X07 の DateTime.Ticks 未確定値＝R-B5-01、CS-X06 の書式 'R' 名指し停止を含む全件が同一判定）。
- ファズ：dotnet 参照値332チェックを実 dotnet で再生成し第2回と**バイト一致**。アプリ側ファズは **300/300 一致**（カテゴリ別も全て満点）、cs-fuzz-raw.json もバイト同一。
- 未対応マトリクス156件：raw は第2回と**バイト同一**。粗分類 {名指し停止56／汎用文言97／未確定値実行1／言及なし2} も同一で、実行フェーズの精密裁定（捏造値0件）が維持される。
- スポットチェック：CS-B04 実文字形は **128512** で実 dotnet と一致、エスケープ形は正直な名指し停止のまま。dotnet-spotcheck の bad 1件は第2回と同一の採取側トリム・アーティファクト（string.Empty）で、spot1 の生区間 `"\n\n"` でアプリ出力の存在を確認済み。F1 の残存疑問 `(int)(-1.0 / 3.0 * 3)` はアプリ出力 **-1**（実 dotnet と一致）。

## 4. F1〜F8 の成立維持

- **F1**（整数除算の −0）：`f1-cross-surface.mjs` 再実行で bad 0（C#／C／C++ の整数除算 −0 正規化、double の −0 は保持）。
- **F2／F3／F6**：§5 の JS マトリクスが第2回とバイト同一であることが統合後文言の維持を実証。`f3-f4-f7-probes.mjs` 再実行で F3 のキー名指し（`a[Symbol.iterator]`）を直接確認。
- **F4**（Symbol キー代入）：同プローブで「Symbol キーのプロパティはモデルでは未対応です」の正直な停止を再確認。
- **F5**（RegExp 例文）：§5 のとおり js-supported の唯一の差分は Date.now の Node 側タイムスタンプのみで、RegExp.prototype.exec／test の Node 一致は維持。
- **F7**（scan の `__catalogReference` 配線）：`f7-probe.mjs` 再実行で、高度 scan が Object.keys／Math.Max を含み基礎 scan が含まないことを両言語で再確認。
- **F8**（基礎正式名7件の inventoryNames）：第2回と同一の配線が現存（js-supported／seam2 のバイト同一性が裏付け）。

## 5. JavaScript 側の再実行

- **対応342件（js-supported）**：第2回とのリーフ差分は **Date.now の1件のみ**で、差分箇所は Node 側の実タイムスタンプ値（実行ごとに変わる非決定値。アプリ側は両回とも未確定値扱い）。エラー・誤値の新規検出なし。
- **未対応・未検証マトリクス186件（js-matrix）**：raw が第2回と**バイト同一**（F2／F3／F6 の文言維持、実行できてしまうのは Array[Symbol.species] の未確定値のみ＝R-B5-02、捏造値0件）。
- **プローブ42レコード（js-probes）**：第2回とのリーフ差分は JS-X06 の1件のみで、差分は採取文字列中の経過時間値（elapsed 3.30ms vs 1.72ms）のみ。漏れ判定（hasNativeCode=false、hasFunctionSource=false、hasHostFnPattern=false）は両回同一。
- **未検証25件（js-unverified25）**：raw が第2回と**バイト同一**（項目名指しの未確認停止24件＋Array[Symbol.species] の未確定値1件）。

## 6. RG-653（実行後チップ到達性）と申し送り追記の現状

`seam2-audit.mjs` を再実行し、seam2-raw.json の**全4セクション（csharp／javascript／templates／glossary）が第2回とバイト同一**であることを確認した。現状は不変：

- C#：207/337件が自項目へ解決しない（解決 130件）。
- JS 具体形：41/108件が解決しない（解決 67件）。JS 束ね項目は raw で対応36件全て未解決（数え方の注記は第1回報告書のとおり）。
- テンプレート：C# 8本＋JS 8本、エラー 0・refs 欠落 0。JS テンプレート2本の trace の `__class` トークンも同一。
- 用語集：高度 C# 24件／JS 21件、統合総数 28／26件、issues 0、相互参照の未解決 0。
- 申し送り追記（scan 側の名称形）のスポット再確認（scanforms.mjs）も第2回と完全一致：静的形 `Object.keys(...)` と基礎短名形 `[1,2,3].push(4)` は解決、高度正式名形 `[1,2,3].toSorted()` とメンバー形 `'abc'.toUpperCase()` は scan に現れない（項目自体の実行は正常、検索到達性は inventoryNames で担保）。

## 7. 全スイートゲート

`node --test tests/*.test.js`（7,548件）を conv3 ツリーで両環境実行した。本ツリーは本ラウンドでコード変更ゼロ（git status 清浄）であり、正本とバイト同一である。

### UTC

- 全量1回：7,548件中 **7,541通過／7失敗**。失敗は全て実時間・性能系で、A5 範囲（C#／JS）の失敗はゼロ：
  - cmd path cap（10,002ms）／default maximum（10,608ms）／powershell path explosion（10,083ms）：約10秒の壁時計署名を持つ既知のパス上限系。
  - audit nested macro cross product（1,302ms）：パス上限到達前に解析時間上限が先に効く形。**未改変の正本ツリーでも同一負荷下で同一テストが同一形で失敗**する対照を確認（1,540通過／1失敗）。
  - B4S-FIX F9 noncentral chisq（1,800ms）：アプリの探索上限停止（category: limit）。**正本ツリーでも同一形で失敗**する対照を確認。
  - P-N4 C preparation cost（8,793ms）：性能系。個別再実行で **38/38 全通過**。
  - R25-N4 finite deep nesting（2,888ms）：性能系。**正本ツリーの個別実行で 23/23 全通過**。
- 実行時の負荷は load average 最大44（11班並行）に達しており、全失敗が負荷依存の署名・対照と一致する。親の静穏条件での独立実測（同一コミット両環境 7,548/7,548 全通過）とあわせ、環境タイミングフレークと裁定し、実質ゲートは **7,548／7,548** とする。

### JST

- 初回試行は VM 再起動（uptime のリセットで確認）に伴う SIGTERM で中断し結果なし。ログファイル出力方式で再実行した（scratch/jst-suite.log）。
- 全量1回：7,548件中 **7,546通過／2失敗**。失敗は cmd path cap（10,104ms）と powershell path explosion（10,068ms）の2件で、いずれも約10秒の壁時計署名を持つ既知のパス上限系。A5 範囲の失敗はゼロ。
- 個別再実行（中程度の負荷下）で cmd.test.js **41/41**、powershell.test.js **104/104** が全通過。環境タイミングフレークと裁定し、実質ゲートは **7,548／7,548** とする。

## 8. 未実施・引き継ぎ

- **D-01 ブラウザ実測は本ラウンド未実施**：本担当（汎用サブエージェント）の環境にはブラウザ操作手段がない。第1回・第2回と同じ扱いであり、本ラウンドで実ブラウザ確認が取れたとは主張しない。ブラウザ専任班の担当範囲。

## 9. 欠陥・変更のまとめ

- **新規実質欠陥：0件。**
- 処置を要する新規所見：なし。RG-653 とその申し送り追記は現状維持を実測で確認。RG-676 の C# 非波及を構造（`!managed` ガード）＋実挙動（20ケース・バッチ18対照でバイト一致）の両面で確認。
- 観察1件（§2末尾）：`string == 0` の型検査の緩さはバッチ18以前からのモデル特性で不変。新規欠陥には数えないが、記録として残す。
- 触ったファイル：本報告書 `docs/audit/LANE-A5-CONV3.md` の新規作成のみ（アプリコード・テスト・共有記録には一切触れていない）。scratch 側は lane-a5-conv3-scratch に全 raw と JST スイートログを保存。
- GitHub 書き込み：なし。

## 10. 証拠ファイル（scratch）

- C# ブラインド：phase1-extract.mjs、phase1-genbatch.mjs、cs-blind-items.json、csbatch/（chunk0-3.json ほか）、cs-blind-expected.json、cs-blind-app.json、cs-blind-summary.json、cs-blind-findings.md
- C# プローブ／ファズ／マトリクス：cs-probes-raw.json、cs-fuzz-raw.json、cs-dotnet-out-v2.txt（再生成した dotnet 参照値）、cs-matrix-raw.json、cs-negzero2.mjs、dotnet-spotcheck.mjs、spot1.mjs、csb04.mjs
- RG-676：rg676-csharp-null.mjs（アプリ側20ケース）
- JS：js-supported-raw.json、js-matrix-raw.json、js-probes-raw.json、js-unverified25-raw.json、scanforms.mjs
- 継ぎ目（RG-653）：seam2-raw.json
- F 系プローブ：f1-cross-surface.mjs、f3-f4-f7-probes.mjs、f7-probe.mjs
- ゲート：jst-suite.log（JST 全量の TAP ログ）
