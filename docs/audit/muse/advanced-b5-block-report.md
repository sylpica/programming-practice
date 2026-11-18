# 高度モード ブロックB5（C#＋JavaScript）納品報告書

- 担当：B5 コーディネーター（生産4班＋修正6班＋独立監査3班＋コーディネーター統合）
- ベース：`repo-reffix` HEAD bba3b26（修正バッチ13。テスト 4,597件／リファレンス 1,403件／用語集 139件）
- 作業ツリー：`~/workspace/programming-practice-audit/work/adv-b5/`（本報告書と成果物一式をローカルコミット。GitHub 書き込みなし——配信は親工程）
- 設計メモ：`docs/audit/muse/advanced-b5-design.md`（最終形に更新済み）

## 1. 成果と件数

### C#（棚卸し 445行＝代表項目のみが上限）
| 区分 | 件数 |
|---|---|
| 高度項目（referenceAdvanced） | 440件＝対応 284／未対応 156／未検証 0 |
| 基礎同名の上書き（referenceOverrides） | 5件（String.Empty、Math.E、Math.PI、Console.ReadLine、Console.WriteLine。全て対応） |
| 合計（棚卸し照合） | 445行＝対応 289／未対応 156／未検証 0 |

- テンプレート 8件（`cs-adv-*`）、用語集 24件。テンプレートは全件、統合エンジンで実行し出力を dotnet 実走と照合済み。
- supported 項目のカタログ例文は全数ハーネスで **289／289 件が実行成功**（監査時 154件失敗 → 例文修正班で解消）。

### JavaScript（棚卸し 721行、ECMA-262 2027草案＝2026-11-12版で固定）
| 区分 | 件数 |
|---|---|
| 高度項目（referenceAdvanced、489項目） | 対応 304／未対応 160／未検証 25 |
| 棚卸し行カバー | 702行（項目名 ∪ inventoryNames、監査で双方向照合済み）＋基礎収載 19行＝721行全数 |

- テンプレート 8件（`js-adv-*`）、用語集 21件。テンプレートは全件実行・intro との一致を監査確認済み。
- 方言の裁定：この方言は `new` 演算子を持たないため、コンストラクタは呼び出し形（`Map()`、`Date(0)` 等）で実装した（意図的なモデル裁定としてファイル冒頭とテンプレート intro に明示）。コールバック必須の呼び出しは全て名前付き未対応。ロケール／タイムゾーン依存項目は未検証として名前付き停止。

### テスト
- 追加テスト：`tests/adv-b5-csharp.test.js` 45件、`tests/adv-b5-javascript.test.js` 51件、`tests/adv-b5-catalog.test.js` 6件（カタログ構造不変条件：件数・ステータス分布・重複・上書き対象・バンドル主張・テンプレート refs 解決・用語集重複・マニフェスト）。
- 既存テストの意図的変更：`tests/muse-fix-batch2-fc-rjs.test.js` の7件——簡易モード時代に「停止する」ことを固定していた Math.max／ceil／sqrt、JSON.parse、Object.keys、Array.isArray、Math.PI は、単一エンジン契約（モードで実行結果は変わらない）により高度実装で動作するようになったため、新挙動を固定する形に書き換えた（console.warn の名前付き停止は維持）。加えて JS 修正班が Date の hasOwnProperty 停止期待1ブロックを JS-B5-04 の是正に合わせて書き換えた。
- 照合個票の同期（仕上げ時）：第6節の ushort caution 是正に伴い、`docs/audit/reference-r2.json` の csharp／ushort 行の caution を是正後文面へ同期し、sha256 を正規方式（fields をキーソートした JSON の sha256）で再計算した。是正が実態どおりであることは仕上げ時に実走で再確認した（`ushort.MaxValue`→65535、`ushort.MinValue`→0、いずれもエラーなし）。テスト期待値の変更ではなく、レビュー済み文面の正本側の追随である。
- 全スイート結果（仕上げコーディネーター最終実行、2026-11-17）：**総数 4,699件**（基礎 4,597＋B5 新規 102＝C# 45＋JS 51＋カタログ 6）。
  - 第1回：4,698 合格／1 失敗。失敗は `round3 all previously reviewed reference texts still match their source record` のみで、原因は上記 ushort caution 是正が照合個票 reference-r2.json に未同期だったこと（B5 起因の実不整合）。個票側を同期して処置した。
  - 処置後の関係ファイル再実行（round3／batch10-records の全行 sha256 照合／B5 カタログ・C#・JS／fc-rjs）：325件全合格。
  - 第2回（処置後）：4,698 合格／1 失敗。失敗は `P-N4 C preparation cost stays near-linear in statement count`（壁時計の性能測定）のみで、round3 は合格。P-N4 は第1回では合格しており、単独再実行では adv-b5 ツリー 2回・基礎ツリー（bba3b26）1回とも全合格（38/38）のため、この VM の CPU スロットリングによる環境フレークと裁定した（B5 の変更は C 準備コストの経路に触れていない）。
  - 以上により、B5 に帰属する失敗は残っていない。

## 2. 成果ファイル

新規（両種別）：`reference-advanced.js`、`templates-advanced.js`、`glossary-advanced.js`、`advanced-engine.js`、`advanced-manifest.js`（`js/types/csharp/` と `js/types/javascript/`）。
既存ファイルへの変更（全て区切り明示・種別／managed 限定）：
- `js/core/c-family.js`：C# 呼び出しディスパッチの委譲ブロック、表示系分岐（transformDisplay／WriteLine 配列分岐／csConcatText、高度値の表示形）、静的定数の型名レジストリ（CLR 名＝エイリアス等価、ushort／float／double／bool 定数追加）、TryParse 解析形の一般化、ref／out／in 引数修飾の解析パス、戻り型推論テーブル、要素型タグ `__elemSys` の表示側読み取り。基礎 catalog の ushort 項目 caution の陳腐化是正1件（第6節）。
- `js/types/javascript/index.js`：高度エンジンへの委譲点、Date 文字列化の統一（モデル変換 jsStringValue 経由）、メソッド値読み取りのガード、JSON.stringify の RawJSON プレースホルダ置換、Math／JSON の `[Symbol.toStringTag]` 先行解決。
- precache（`precache.js`、`sw.js`、`scripts/precache.mjs`）は無変更。高度ファイルは precache に含まれていないことを監査で確認済み。
- `docs/audit/reference-r2.json`：csharp／ushort 行の caution 同期と sha256 再計算のみ（第1節・第6節）。他の行は無変更。
- precache チェックの実測（仕上げ時）：`node scripts/precache.mjs --check` は **不合格（stale）**。理由は分離できており、(1) 基礎側の陳腐化——c-family.js と javascript/index.js の変更で集約ハッシュが変わり、キャッシュ名が現行 `programming-practice-31501b2ec29e25` から変わる、(2) 高度ファイルの混入——現行スクリプトのまま再生成すると新規高度ファイル10件がそのまま資産一覧に入る（81件→91件。除外される資産は0件）。したがって本ブロックでは再生成せず（B3 の先例どおり）、統合時に機構側で除外パターンを実装してから再生成すること（第3節の統合要件 X-04 と同一件）。

## 3. 機構契約（advanced-interface.md）との整合

整合済み：高度項目の status 明記、基礎同名は referenceOverrides 経由のみ（C# 5件。JS は重複0件）、ファイル命名（reference-advanced／templates-advanced／glossary-advanced／advanced-engine／advanced-manifest）、templatesAdvanced 定数形、precache 除外、擬似言語は対象外、モードで実行結果を変えない（モード条件分岐なし）。

差異（受容済み・解消は配線のみ）：
1. `scan`（両種別）と `inventoryNames`（JS）は契約 第4.1 の項目表に無い追加フィールド（F-02 到達性メタデータ）。現行アプリの scanScript は name のみを読むため、scan の機構側消費は未検証。
2. エンジン接続は applyAdvancedEngine フックでなく静的合成（フック具体仕様が契約 R-3 未決のため）。意味論は advanced-engine.js に分離済みで、移行は配線変更のみ。

機構側への統合要件：
- **検索インデックス**：統合後の統合カタログ検索は `inventoryNames` と `scan` を索引対象に含めること。現行の検索述語（name／category／description／syntax）のままでは JS の棚卸し名 205名（対応項目に束ねられた140名を含む）が自項目に到達できない（監査 JS-B5-07／AUD-X の X-02）。
- **precache 除外**：`scripts/precache.mjs` に高度ファイルの除外パターン（ファイル名に `-advanced` を含むもの、`advanced-engine.js`、`advanced-manifest.js`）がまだ無い。現行の出荷 precache は混入なしで健全だが、再生成前に除外を実装すること（AUD-X の X-04）。

## 4. 監査結果と処置

角度カタログは3監査班（横断／C#／JS）がブロック範囲で全件実施し、対象外には理由を明記した（各監査報告書：横断は統合時検証記録、C# は `work/adv-b5-audit-cs/docs/audit/muse/findings-adv-b5-audit-csharp.md`、JS は `work/adv-b5-audit-js/docs/audit/muse/findings-adv-b5-audit-javascript.md`）。

### AUD-X（横断）：P1 0／P2 2／P3 4
- X-01（P2）テンプレート refs がバンドル名を指す5件 → コーディネーターが項目名へ修正済み。
- X-02（P2）検索到達性 → 機構側要件として第3節に記録。
- X-03（P3）基礎収載19行の台帳 → JS reference-advanced.js 冒頭コメントに明記済み。
- X-04（P3）precache 除外未実装 → 機構側要件として第3節に記録。
- X-05（P3）カタログ固定テストなし → `tests/adv-b5-catalog.test.js` を新設。
- X-06（P3）設計メモのドリフト → 最終形に更新済み。

### AUD-CS（C#）：P1 4／P2 8／P3 3
全件処置済み（修正班 CS-FIX2a／CS-FIX2b＋コーディネーターのカタログ修正＋例文修正班 CS-EXFIX）：
- F01 Decimal.Parse の虚偽の対応宣言 → 未対応へ格下げ（エンジンは全形停止が実態）。
- F02 CLR 型名の静的フィールドが NameError → 型名レジストリでエイリアス等価に実装。あわせて未実装だった ushort／float／double／bool 定数を dotnet 実測値で実装し、該当8項目を対応へ反転。TimeSpan 静的メンバー・Console.Title／ForegroundColor 書き込みは名前付き停止に。
- F03 Char.ConvertToUtf32(char, char) の誤振り分け（55357→正値 128512）→ 第2引数の型で判別。同型点検で Convert.ToInt32(char, 基数）の誤値も発見・是正。
- F04 DateTime.Ticks → 未対応へ格下げ（残存 R-B5-01）。
- F05／F06 式結果の配列表示が System.Double[]／String[] になる → 生成側で要素型タグ `__elemSys`（非列挙）を付け、表示側が読む形に是正（System.Int32[] 等の正しい表示を確認）。ToCharArray は基礎の要素表現（1文字文字列）が実測で正と判明し、タグで型を保持（表示は tea／System.Char[] 相当）。
- F07 String.Format カスタム数値書式 → 部分集合（0／#／小数点／桁区切り／%）を dotnet バッテリー123件中122件一致で実装（不一致1件はエンジンのリテラル上限が原因の別件）。範囲外書式は「未対応」と分かる文言で停止。なお監査文中の `{0:0.0%}` 期待値「25.0 %」は dotnet 実走（空白なし "25.0%"）と異なり、実走を正とした。
- F08／F09 TryParse の CLR 形・ref 引数・CultureInfo 直接呼び出し → 解析形を一般化（int／double は実行、他型は名前付き停止）、ref／out／in 修飾を解析で処理、CultureInfo は全メソッド名前付き停止に統一。
- F10 対応項目の例文 154件が実行不可 → エンジン修正で30件自己修復、残り124件中123件を例文修正（Parse／From 系チェーン、宣言済み配列経由、ToList／ToHashSet インライン形、実文字化）。最後の1件（UInt64.MinValue）は第6節の裁定で未対応化し例文も停止到達形に変更。最終ハーネスで対応例文 289／289 実行成功。
- F11 char／short／sbyte 戻り値の型推論（CS0266）→ typeOf に managed 限定テーブルを追加。
- F12 HashSet.SymmetricExceptWith の scan 欠落 → 追加。
- F13 Char.IsSurrogate(string, int) 追加（dotnet 実測：範囲外は ArgumentOutOfRangeException）。
- F14 未対応項目の caution に「未検証」文言が混入した7件 → 文面整理（C# の未検証は真に0件）。
- F15＝X-06。
- 欠陥ゼロ確認範囲：棚卸し↔カタログ双方向一致（445＝440＋5）、未対応161件（当時）の黙った素通り 0件、層化バッテリー86件 dotnet 照合（差分は全て所見に帰属）、テンプレート8／用語集24は誤りなし。
- 観察事項：棚卸し自体に Char.IsHighSurrogate／IsLowSurrogate／DateTime.IsLeapYear の行が無い（エンジンは Char の2件を実装済みだがカタログ項目なし）。棚卸し側の欠落として記録する。

### AUD-JS（JavaScript）：P1 5／P2 5／P3 4
修正班 JS-FIX2a（エンジン）／JS-FIX2b（カタログ）で処置：
- B5-01 %TypedArray%.from／.of 未実装 → 全12種別に実装（コールバック形は名前付き停止）。
- B5-02 X.prototype 26件＋constructor バンドルが対応宣言なのに読み取り停止 → プロトタイプオブジェクトは値として表現できないモデル境界として **未対応へ格下げ**（実挙動の名前付き停止と一致）。静的 BYTES_PER_ELEMENT は実値を返すよう実装し対応を維持。
- B5-03 `[Symbol.toStringTag]` が黙って undefined → レシーバ種別ごとのタグ文字列を返すよう実装。`[Symbol.unscopables]` は仕様の16キー（Node 実測で確定）のオブジェクトを返す。
- B5-04 hasOwnProperty／propertyIsEnumerable が31種中29種のレシーバで未収録停止 → 種別ごとの own キー判定（Node 実測の範囲のみ）をフォールバック実装し全レシーバで一致。
- B5-05 isPrototypeOf／__defineGetter__ 等／toLocaleString の停止漏れ → メソッド名ベースの一括判定で全レシーバ一貫化。文字列・真偽値の toLocaleString はロケール非依存を確認し実値を返す。
- B5-06 メソッド値読み取りでホスト関数のソースが漏れる（93ケース）→ 解決結果がホスト関数になる読み取りを「実行時に決まる：メソッド値（関数値）」の未確定値に置換（valueType:"function" で typeof の従来挙動を維持）。基礎テストに固定された読み取り挙動が無いことを全検索で確認のうえ全レシーバに適用。
- B5-07＝X-02（機構側）。B5-08＝X-01（修正済み。監査側も正本での解消を追記確認）。
- B5-09 ホスト不在時に内部式の断片を停止理由に出す → Float16 系ほかのホスト委譲箇所を全数点検し、RegExp.escape と同水準の名前付き停止に統一。
- B5-10 ホストに JSON.rawJSON が無い環境で stringify が黙って undefined → トークン付きプレースホルダ方式で自前埋め込み化し、ホスト不在でも "123" を返す。
- B5-11 Iterator ヘルパーの停止文言が項目を名指さない → 「Iterator.prototype.<名> は未対応です（反復子は値として表現できません）」に統一。
- B5-12 定型 description 9件 → 具体的な挙動説明に書き換え。unscopables の syntax をデータプロパティ形に修正。returns「結果の値」263件は残存 R-B5-03。
- B5-13 example の `new ` 39件 → 呼び出し形化（対応32件は具体値で実走確認）。あわせて syntax 欄の `new ` 39件もコーディネーターが呼び出し形に統一（基礎カタログの syntax に `new ` を含む項目が無いことと整合）。受け手未定義・`...` のみの例は残存 R-B5-04。
- B5-14 Array[Symbol.species] の直接読み取りが未確認停止にならない → 観察事項として残存 R-B5-02（誤値が観測される経路は確認されず）。
- 欠陥ゼロ確認範囲：汎用内部エラーは全実走（489形式＋敵対的465ケース＋層化60件＋ホスト不在13件）で 0件、対応 299／331件（監査時点）が宣言どおり動作、未検証 24／25件が理由つき停止、層化サンプル60件は Node／仕様本文と実質全件一致。

## 5. 残存（理由つき）

- **R-B5-01（CS-F04）**：DateTime.Ticks はカタログ未対応だが、インライン読み取り（`DateTime.Parse(...).Ticks`）では停止せず未確定マーカー「実行時に決まる：DateTime.Ticks（64ビット値）」を返す。メンバー読み取りは呼び出しフックを経由せず値が構築時に埋まるためで、誤値（捏造した数値）ではない。TimeSpan.Ticks は対応（相対値のため表現可能）。
- **R-B5-02（JS-B5-14）**：`Array[Symbol.species]`（未検証）の直接読み取りは未確認停止でなく未確定値を返す。派生生成は通常配列を返すため誤値の観測経路なし。
- **R-B5-03（JS-B5-12）**：JS 高度項目 263件の returns が「結果の値」の定型文（虚偽ではないが具体性に欠ける）。文面の具体化は未実施。
- **R-B5-04（JS-B5-13）**：JS 高度項目の example には受け手変数が未定義のもの（209件）と `...` プレースホルダのみのもの（305件）が残る（図式的な例示スタイル）。`new ` 形は全廃済み。画面で例が自動実行される経路はなく、実行教材はテンプレート（全件実行可能）が担う。
- **R-B5-05**：未対応項目の例文のうち、ラムダ必須の Enumerable.Aggregate／All はラムダ構文自体の解析停止（エンジン全体の扱い）になり項目名の停止には届かない。CultureInfo.GetCultures の例文は CultureTypes（列挙型は未モデル化）の名前解決で停止する。Array.LongLength／Rank の例文はメンバー名を明示する CompileError（「フィールドがありません」）で停止する。いずれも正直な停止であり、汎用内部エラー・誤値はなし。
- **R-B5-06**：Char の (string, int) オーバーロードのうち IsSurrogate／IsSurrogatePair 以外（IsDigit／IsLetter／GetUnicodeCategory 等）は汎用文言の停止のまま（誤値は返さない）。
- **R-B5-07**：文字列補間の書式指定子（`$"{x:0.00}"`）はパーサ側の未対応停止（高度差分以前からの扱い）。
- **R-B5-08**：`System.` 接頭辞形のメンバー読み取り（例 `System.Int32.MaxValue`）は基礎従来どおり NameError（監査所見の対象外。`System.Int32.TryParse` は名前付き停止に届く）。
- **R-B5-09**：Float16 系（Float16Array／Math.f16round／DataView の Float16 入出力）はホスト実装に依存する。ホスト不在環境では名前付き未対応停止になる（カタログ caution に依存の明記あり）。
- **R-B5-10**：JS の Date 複数引数コンストラクタは UTC 解釈（実 JS のローカル解釈と異なる。advanced-engine.js 冒頭に明記済みのモデル裁定）。ローカル時刻系 getter／setter は未検証として停止する。
- **R-B5-11**：基礎側の既知残存は不変（JS の配列スプレッドは名前付き未対応、前置 ++／-- は全位置未実装、C# の switch 式は名前付き未対応、foreach の変換なし緩さは意図的に維持）。JS-ENG 申告分：基礎 Math.abs 等の引数変換（api.toNumber 経由）ではタグ付き Symbol 引数が TypeError でなく NaN になる（基礎ケースは無変更）。

## 6. コーディネーター裁定の記録

- **UInt64.MinValue**：基礎側が RA-37 で「静的メンバーの表になく未対応として停止（実値は 0）」と開示済みの意図的な制限であることを確認したため、エンジン変更はせず、高度項目を未対応に格下げして開示を揃えた（caution に実値 0 を明記。例文は名前付き停止に届く形に変更）。他の64ビット境界値（long／ulong の MaxValue、long の MinValue）は未確定値として返るため対応のまま。
- **ushort 基礎 caution の是正**：CS-FIX2a が ushort.MaxValue／MinValue を実装したことで、基礎カタログ（c-family.js 内）の ushort 項目 caution「静的メンバーの表になく未対応として停止します」が事実と異なる文面になったため、「ushort.MaxValue／MinValue 自体も参照できます。」に是正した（文面のみの変更。ulong 項目の開示文は現在も事実と一致するため不変）。
- **ToCharArray の要素表現**：指示書の前提（char[] は文字コード数値）は実測で誤りと判明（基礎の char[] 要素は1文字文字列で一貫）。数値化は添字表示・foreach・Join と既存テストを壊すため、要素表現は維持し要素型タグで型を保持する方式を正とした。
- **String.Format の % 書式**：監査文中の期待値「25.0 %」は dotnet 実走と異なり、実走値 "25.0%" を正とした。
- **Char.IsSurrogatePair の範囲外**：当初ブリーフの「false を返す」は dotnet 実測（ArgumentOutOfRangeException）で訂正され、実測どおり実装した。
- **JS の prototype／constructor 項目**：値を返せる静的 BYTES_PER_ELEMENT は実装して対応維持、それ以外は未対応へ格下げ（第4節 B5-02）。
- **照合個票 reference-r2.json の ushort 行同期（仕上げコーディネーター裁定）**：全スイート第1回で round3 の文面ピンが ushort caution 是正との不整合で失敗した。旧 caution（「静的メンバーの表になく未対応として停止」）は CS-FIX2a の実装により事実に反する画面文面であり、戻す選択肢はない。バッチ9／10 の先例どおり、是正後文面へ個票を同期し sha256 を正規方式で再計算するのが正しい処置と裁定した（テストの期待値を弱める変更ではない）。実走の裏付け（MaxValue 65535／MinValue 0）は第1節に記録。
- **件数・例文の機械再照合（仕上げコーディネーター実施）**：本報告書の主張をツリー実データで再照合し、全て一致した。C# 高度 440件＝対応 284／未対応 156／未検証 0、上書き 5件は全て対応で対象は基礎に実在、合計 445件＝対応 289／未対応 156／未検証 0（棚卸し inventory-csharp.md のデータ行 445行とも一致）。対応例文は全数ハーネス（Main 骨格で包んで simulate、エラーなしを成功とする）で **289／289 件が実行成功**。JS 高度 489件＝対応 304／未対応 160／未検証 25、項目名 ∪ inventoryNames ＝ 702、棚卸し inventory-javascript.md は項目一覧 721行＝未収録 702＋基礎収載 19（基礎カタログ自体は 39項目を持ち、残りは棚卸しの「現行のみ存在する項目」側の収載）。

## 7. 統合時の接点一覧（親工程向け）

- c-family.js の B5 接点は全て「高度モード ブロックB5」区切りコメント付き・managed 限定：呼び出し委譲、表示分岐3箇所、静的定数レジストリ、TryParse 解析、引数修飾解析、戻り型推論、タグ表示読み取り、ushort caution 文面。
- JS index.js の B5 接点：高度エンジン委譲点、Date 文字列化、メソッド値ガード、RawJSON 置換、toStringTag 先行解決。
- 共有ファイル（台帳・状態ファイル）には一切触れていない。precache は再生成していない。
