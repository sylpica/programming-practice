# 収束判定ラウンド報告書：高度A5班（C#＋JavaScript）

- 対象ツリー：`~/workspace/programming-practice-audit/work/lane-a5-conv/`（統合ビルド HEAD **4771801**、branch batch17-integration と同一コミット）
- 前回報告書：`work/lane-a5-exec/docs/audit/LANE-A5-EXEC.md`（実行フェーズ、欠陥 F1〜F8 修正済み）
- 証拠置き場：`~/workspace/programming-practice-audit/work/lane-a5-conv-scratch/`（以下「scratch」）
- 実施形態：前任コーディネーターが報告書・コミットを残さず終了したため、本報告書は**仕上げ担当**が scratch の検証成果を棚卸しし、不足分のみを実施して完遂したもの。scratch の数値は鵜呑みにせず、要所は再集計・再実行・実行フェーズ raw とのバイト比較で裏付けた。
- **結論：新規実質欠陥 0 件。** 本ラウンドでコード変更は行っていない（追加は本報告書のみ）。

## 1. 棚卸し（計画項目ごとの実施状況の切り分け）

| 項目 | 前任の状態 | 仕上げ担当の実施 |
|---|---|---|
| C# ブラインド照合（337件） | 実施済み（cs-blind-summary.json／cs-blind-findings.md 完結） | サマリと findings の全数値を突合（一致）。dotnet スポットチェックを再実行 |
| C# プローブ44件（cs-probes-raw.json） | 実施済み（集計なし） | 全件を集計し期待値と照合 |
| C# ファズ300件＋書式12件（cs-fuzz-raw.json） | 実施済み（集計なし） | dotnet 出力と突合し不一致を確定 |
| C# 未対応マトリクス156件（cs-matrix-raw.json） | 実施済み（分類が粗い） | 実行フェーズ raw と全件バイト比較し、前回裁定の維持を確認 |
| JS 対応342件（js-supported-raw.json） | 実施済み（集計なし） | 全件を集計し実行フェーズ内訳と照合 |
| JS 未対応・未検証マトリクス186件 | **未実施**（js-matrix-raw.json は0バイトの残骸のみ） | **新規に実行**（§3.6） |
| JS プローブ43件（js-probes-raw.json） | 実施済み | 全件を集計し期待値と照合 |
| 未検証25件（js-unverified25-raw.json） | 実施済み | 全件を集計し裁定済み内訳と照合 |
| F1〜F8 統合後再確認 | 一部実施（f1-cross-surface／f3-f4-f7／f7-probe のスクリプトと口頭所見のみ、結果保存なし） | スクリプトを再実行して結果を取得。F2／F3／F6 は JS マトリクスの差分で実証。F8 はソース確認 |
| CS-B04 実文字形の再確認 | 未実施 | **新規に実施**（§3.8） |
| RG-653 実行後チップ内訳（seam2-raw.json） | 実施済み（集計なし） | C#／JS具体形／JS束ねの3数値を再集計し統合記録と照合 |
| 全スイートゲート（UTC／JST） | 未実施（証拠なし） | **新規に実行**（§4） |
| D-01 ブラウザ実測 | 未実施 | 本担当の環境ではブラウザ操作手段がなく未実施（§5） |

## 2. C# ブラインド照合（一次情報＝実 dotnet 8.0.428）

scratch の `cs-blind-summary.json` と `cs-blind-findings.md` を全項目突合し、完全一致を確認した。

- 総件数337件（基礎48＋高度289＝新規284＋override 5）。コンパイル 337/337、実行 336/337。
- 完全一致 333件。改行のみ差異1件（Console.Write、断片化によるもので欠陥でない）。
- 差異3件＝開示済みモデル限界（long.MaxValue／long.MinValue／ulong.MaxValue。64ビット境界値を未確定値として返す設計）→ 実行フェーズ裁定どおり**再発見として扱わない**。
- 環境項目1件＝Console.ReadKey（dotnet 側がリダイレクト環境で例外、アプリは出力なし成功）。
- 誤値 0件、アプリのエラー停止 0件。実行フェーズの水準を維持。
- 仕上げ担当の追加裏付け：`dotnet-spotcheck.mjs` を再実行し、標本8件中7件が期待値ファイルと一致。残る string.Empty の不一致は採取側ハーネスのトリムが空行を消すアーティファクトであることを、`spot1.mjs` で生区間 `"\n\n"`（空行が出力されている）を確認して切り分けた。アプリ側の不一致ではない。
- 注記1：findings 見出しの「HEAD 04dfe2d」は前任のラベル誤記。実ツリーは 4771801（git status 清浄で確認）。
- 注記2：findings が成果物として挙げる cs-blind-spotcheck.json は scratch に保存されていなかった。上記の再実行で代替した。

## 3. 項目別結果

### 3.1 C# プローブ44件（cs-probes-raw.json）

全件期待どおり。CS-T17 は var の名指し停止（裁定済み）、CS-X07 は DateTime.Ticks の未確定値（R-B5-01）、CS-X10 は汎用停止（R-B5-05 族）、CS-X04 は "25.0%" 一致、CS-B06／B08 は OverflowException の正直な停止、CS-X06 は書式 'R' を名指しして停止。

### 3.2 C# ファズ（cs-fuzz-raw.json）

- シード固定300件：**300/300 一致**（実行フェーズは F1 欠陥により 298/300。F1 是正がファズ水準でも裏付けられた）。
- 書式系12件：11件一致。残る FMT-E（`String.Format("{0}", 9223372036854775807L)`）は整数リテラル安全ガードによる未確認停止で、実行フェーズで裁定済みの既知挙動（CS-X04 と同族）。書式エンジンの欠陥ではない。

### 3.3 C# 未対応マトリクス156件（cs-matrix-raw.json）

- conv ランナーの分類は粗い（名指し停止56／汎用文言97／未確定値実行1／言及なし2）が、**実行フェーズ raw と全156件の挙動（停止文言・出力）がバイト同一**であることを仕上げ担当が比較確認した。したがって実行フェーズの精密裁定（型ゲート名指し・阻害構文名指し・汎用停止4件は R-B5-05 族として存置、捏造値 0件）がそのまま維持される。
- 未確定値実行1件＝DateTime.Ticks（R-B5-01、捏造なし・裁定済み）。
- 言及なし2件はいずれも阻害構文の名指し停止（StringBuilder.Chars は例文の var 宣言、Dictionary Item はジェネリック型宣言）であり、項目名でなく阻害要因を名指す正直な停止。

### 3.4 JS 対応342件（js-supported-raw.json）

- 具体形102件：Node 一致43件（うち F5 で是正した RegExp.prototype.exec／test の2件を含む）、出力なし実行可50件、突合対象外4件、相違だが欠陥でない5件（Date.now の未確定値化、globalThis／JSON／Math／Reflect の名前空間オブジェクト表示＝モデル境界）。
- 図式形240件：静的照合214件＋実行時判明26件（未定義プレースホルダ）。実行フェーズ内訳と一致。
- エラー・誤値の新規検出なし。

### 3.5 JS 未検証25件（js-unverified25-raw.json）

全件確認。24件は項目名指しの未確認停止（現地時間系18件、ロケール系6件は F6 是正後の統一文言。Date toLocaleDateString／toLocaleTimeString は「ロケール（言語・地域設定）と現地時間（タイムゾーン）に依存するため未確認です」）。残る1件 Array[Symbol.species] は未確定値を返す（R-B5-02 再確認）。全て実行フェーズ裁定と一致。

### 3.6 JS 未対応・未検証マトリクス186件（仕上げ担当が新規実行）

- 前任は未実施だったため `js-run-matrix.mjs` を実行し、js-matrix-raw.json を scratch に保存した（保存時に EPERM が断続したため /tmp 経由で実行し、md5 一致を確認して scratch へ配置）。
- 実行フェーズ raw とのバイト比較：**144件同一、42件差分**。42件の差分は全て統合された修正の反映であり、新規の悪化はゼロ：
  - **F2**：prototype／constructor 読み書き停止37件が、汎用文言からプロパティ名指し（例「このプロパティはモデルでは未対応です：Array.prototype」）へ変化。
  - **F3**：Symbol キー呼び出し3件（Array.prototype[Symbol.iterator]、Function.prototype[Symbol.hasInstance]、RegExp.prototype[Symbol.matchAll]）が、空欄名指しからキー名指しへ変化。
  - **F6**：Date toLocale 系2件の停止理由にロケールが追加。
- 実行できてしまう項目は Array[Symbol.species] の1件のみで、返すのは未確定値（R-B5-02）。捏造値 0件。

### 3.7 JS プローブ43件（js-probes-raw.json）

全件期待どおり。X01 名指し停止、X02 正直な停止（後置形は "2" で動作）、X03 アロー構文名指し＋X03b 項目名指し、X04 SyntaxError、X05 Array.prototype 名指し停止、X06 ホスト関数ソース漏れなし（hasNativeCode=false、hasFunctionSource=false）、X07 計算済みプロパティ名の構文名指し停止、X08／X09 名指し未確認停止（理由はモデル実態と一致）、X10 未確定値（R-B5-02）、X11 は 1.5、X12 RangeError。

### 3.8 F1〜F8 統合後再確認

- **F1**（整数除算の −0）：`f1-cross-surface.mjs` 再実行で bad 0（C#／C／C++ の整数除算 −0 正規化 8/8、double の −0 は保持）。`cs-negzero2.mjs` の残存疑問 `(int)(-1.0 / 3.0 * 3)` は、仕上げ担当が実 dotnet で実行し **-1**（アプリ出力と一致。IEEE 754 の ties-to-even により (-1.0/3.0)*3 は正確に -1.0）であることを確定。前任スクリプト内コメントの予想（0）は誤りで、アプリが正しい。
- **F2／F3／F6**：§3.6 のマトリクス差分42件で統合後文言を実証。加えて `f3-f4-f7-probes.mjs` 再実行で F3 の名指し（`a[Symbol.iterator]`）を直接確認。
- **F4**（Symbol キー代入）：同プローブ再実行で「Symbol キーのプロパティはモデルでは未対応です」の正直な停止、誤キー化なしを確認。
- **F5**（RegExp 例文）：§3.4 のとおり Node 一致に転じたことを確認。
- **F7**（scan の `__catalogReference` 配線）：`f7-probe.mjs` 再実行で、高度 scan が Object.keys／Math.Max を含み基礎 scan が含まないことを両言語で確認。回帰テスト A5-F7 も両環境のスイートで通過（§4）。メンバー呼び出し形の scan 解決については §3.10 の申し送り追記を参照。
- **F8**（基礎正式名7件の inventoryNames）：conv ツリーの `js/types/javascript/reference-details.js` に7正式名全件（Array.prototype.push／pop／join、Iterator.prototype.join、%TypedArray%.prototype.join、Number.parseInt、Number.NaN）の inventoryNames が存在し、`js/app.js` の検索索引が inventoryNames を取り込む配線（L939-946）も現存することを確認。
- **CS-B04**（Char.ConvertToUtf32 のエスケープ形）：conv ツリーで実文字形（サロゲートペアを実コード単位で渡す形）を仕上げ担当が実測し、**128512** を返すことを確認（実 dotnet でも 128512）。エスケープ文字列形は「未確認の文字エスケープ（実際の文字を入力してください）」の正直な名指し停止のまま。実行フェーズ裁定を再確認。

### 3.9 RG-653（実行後チップの自項目解決）現状確認（seam2-raw.json 再集計）

統合記録の数値と完全一致し、現状維持を確認した：

- C#：207/337件が自項目へ解決しない（解決 130件）。
- JS 具体形：41/108件が解決しない（解決 67件）。
- JS 束ね項目：構成可能な31/31件が解決しない（基礎束ね5件＝push／pop／join／parseInt／NaN は seam2 ハーネスの構成表に無く未測定。これは実行フェーズの「31件」の数え方と同一）。
- テンプレート：C# 8本＋JS 8本、全て bad 0（refs 欠落・エラーなし）。
- 用語集：高度 C# 24件／JS 21件、統合総数 28／26件、issues 0、相互参照の未解決 0。

### 3.10 RG-653 への申し送り追記（新規欠陥ではなく既登録残存の同族実測）

仕上げ担当の実測で、scan（実行前チップ）側にも RG-653 と同族の「refs の名前形」未解決形があることを確認した。統合工程の引き継ぎ範囲に含めるよう申し送る：

- 静的形は解決する：`Object.keys(...)` → scan に "Object.keys" が現れる（F7 配線の効果）。
- 基礎短名形は解決する：`[1,2,3].push(4)` → scan に "push"（基礎項目の短名）が現れる。
- 高度項目の正式名形は現れない：`[1,2,3].toSorted()` → scan は ["console.log"] のみ（Array.prototype.toSorted が現れない）。
- 一部メンバー形は現れない：`"abc".toUpperCase()` → scan は ["console.log"] のみ（項目自体は対応・実行可能で、検索到達性は F8 の inventoryNames で担保される）。

項目自体の実行・値・説明には影響せず、チップ（関連項目ナビゲーション）の到達性のみの問題であり、RG-653 と同じ共有機構（refs のメンバー名形記録）が根本にあるため、新規欠陥として起票せず RG-653 の申し送りに統合する。

## 4. 全スイートゲート（仕上げ担当が実行）

`node --test tests/*.test.js`（250ファイル）を conv ツリーで両環境実行した。

| 環境 | 総数 | 通過 | 失敗 |
|---|---|---|---|
| UTC | 7,512 | 7,507 | 5 |
| JST（Asia/Tokyo） | 7,512 | 7,510 | 2 |

- 失敗は全てパス上限・時間予算系のテスト（cmd path cap、powershell path explosion、engine default maximum、audit nested macro、R25-N4 deep nesting）で、**A5 範囲（C#／JS）の失敗は両環境ともゼロ**。A5 回帰テスト9件（tests/muse-lane-a5-exec.test.js、F1〜F8）は両環境とも全通過。
- 裁定：これらは回帰・欠陥ではない。根拠：(1) 失敗したテストはいずれも約10秒の時間予算上限に張り付く署名を示した。(2) 未改変のベースツリー `repo-reffix`（同一コミット 4771801・清浄）でも同一テストが同一署名で失敗することを仕上げ担当が対照実行で確認した（cmd path cap、powershell path explosion。engine default maximum はベース側の再実行では通過する等、負荷で揺れる）。(3) conv ツリーは本ラウンドでコード変更ゼロであり、差分自体が存在しない。(4) 親の同日検証では負荷の低い条件で両環境 7,512/7,512 全通過が記録されている。以上から、VM の CPU スロットリングによる環境フレークと裁定する。

## 5. 未実施・引き継ぎ

- **D-01 ブラウザ実測は本ラウンド未実施**：本担当（汎用サブエージェント）の環境にはブラウザ操作手段がない。実行フェーズで実施済みの最小確認（高度パネル表示・チップ・コンソールエラーなし）を引き継ぐに留め、本ラウンドで実ブラウザ確認が取れたとは主張しない。必要なら親側でブラウザ担当へ回すこと。

## 6. 欠陥・変更のまとめ

- **新規実質欠陥：0件。**
- 処置を要する新規所見：なし。RG-653 への申し送り追記1件（§3.10、新規起票せず）。
- 触ったファイル：本報告書 `docs/audit/LANE-A5-CONV.md` の新規作成のみ（アプリコード・テスト・共有記録には一切触れていない）。scratch 側では js-matrix-raw.json を保存（前任の0バイト残骸を置換、md5 照合済み）。
- GitHub 書き込み：なし。

## 7. 証拠ファイル（scratch）

- C# ブラインド：cs-blind-summary.json、cs-blind-findings.md、cs-blind-expected.json、cs-blind-app.json、cs-blind-items.json
- C# プローブ／ファズ／マトリクス：cs-probes-raw.json、cs-fuzz-raw.json、cs-dotnet-out.txt、cs-matrix-raw.json
- JS：js-probes-raw.json、js-supported-raw.json、js-unverified25-raw.json、js-matrix-raw.json
- 継ぎ目（RG-653）：seam2-raw.json
- F 系プローブ：f1-cross-surface.mjs、cs-negzero2.mjs、f3-f4-f7-probes.mjs、f7-probe.mjs
