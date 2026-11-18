# ADV-B4 VBA 監査報告書（監査班）

- 対象：高度モード ブロックB4（Excel VBA）の高度差分5ファイル
  （`js/types/vba/reference-advanced.js`、`templates-advanced.js`、`glossary-advanced.js`、
  `functions-advanced.js`、`constants-advanced.js`）
- 監査テスト：`tests/adv-b4-audit-vba.test.js`（19件、新規）
- 実施日：2026-11-17
- 一次情報：Microsoft Learn（VBA 言語リファレンス／列挙ページ／Format 関数ページ）、
  MS-VBAL 仕様書（Microsoft 公式ダウンロード PDF）
- GitHub 書き込みなし。編集は担当ファイル域内のみ。

## 最終件数

| 区分 | 件数 |
|---|---|
| リファレンス項目（追加201＋上書き10） | 211 |
| 対応（supported） | 132 |
| 未対応（unsupported） | 79 |
| 未検証（unverified） | **0** |
| 対応関数／ハンドラ | 81／81（双方向一致） |
| 定数 | 46（全件到達・値一致） |
| テンプレート／用語集 | 5／13 |

## 角度ごとの実施内容と結果

### A群（実走）
- 全211件の example をシミュレータ（`definition.simulate`）に通した。
  対応132件は全件エラーなく実行、未対応79件は全件停止（黙って通ったもの0件）。
- テンプレート5件を実行し主張値と照合：deadline（46067／30）、format（`1,234,567`／
  `1,234.57`／`1/15/2026`）、split-join、loan（Pmt −8606.64297070824 は年金現価式の
  手計算と一致、IPmt −500、Pmt＝IPmt＋PPmt の恒等式成立）、branch（Choose→"A"、
  Switch→"合格"）。全件一致。

### B群（宣言↔挙動マトリクス、F-02）
- status と実挙動の機械照合を監査テストで固定した（上表の内訳どおり）。
- 未対応関数のうち代表19件（CallByName、CreateObject、Dir、Environ、EOF、FileAttr、
  FileDateTime、FileLen、GetAllSettings、GetAttr、GetObject、GetSetting、Loc、LOF、
  MacID、MacScript、Shell、Spc、Tab）は全件「関数 〈名前〉」と名指しで停止することを確認。
- 未知値（実行時に決まる値）の伝播：Year(Date)、Month(Now)、Sqr(Rnd)、Format(Date, …) の
  入れ子で「実行時に決まる：〈関数名〉 の引数による」となり、値の捏造なし。

### C群（一次情報照合）
- 定数46件：Learn の列挙ページ5件（DriveType／File Attribute／File Input/Output／
  SpecialFolder／System Color）を直接取得し全件一致。
- 財務13件：全件検証。恒等式（Pmt＝IPmt＋PPmt 等）＋手計算照合
  （SLN 18000、SYD 30000／6000、DDB 40000／24000）。IRR は Learn 使用例
  （−70000, 22000, 25000, 28000, 31000）で二分法の独立計算 0.17743588442252733 と
  ハンドラ 0.177435884422524 が 1e-12 以内で一致。
- 日付17件：全件検証。暦事実との照合（2026-01-15 は木曜→Weekday 5、
  2023-01-01 を vbMonday＋vbFirstFourDays で週52＝ISO 週番号と一致、DateDiff "ww" の
  日曜境界数え、月末・うるう年繰り越し、"yyyy" 境界）。
- その他関数：層化抽出26プローブ（Atn、Log/Exp、QBColor の MS-VBAL 表照合、RGB、
  Join/Split 往復、Filter、Format の各セクション、DatePart "y"、WeekdayName/MonthName
  略称、CBool、CByte の銀行丸め、Switch の Null、Error(94)、StrReverse の Unicode、
  InStrRev のテキスト比較ほか）。この抽出で D11 を検出した。

### D群（到達性・表示）
- D-05 検索到達性：app.js の検索述語（name＋category＋description＋syntax の小文字
  部分一致）を合成カタログ（基礎＋overrides＋advanced）に適用し、全211件の自名ヒットと
  定数のメンバー名ヒットでミス0件。
- D-07 テンプレート trace：refs は全件合成カタログに実在し、コードが依存する高度項目は
  supported のみ（監査テストで固定）。
- D-08/D-09 解説主張照合：テンプレートの想定出力と項目説明の値は実走値と一致（A群で実施）。

### F群（ファズ）
- 引数過不足（エラー450）・型不一致（13）は実装班テストと監査プローブで確認。
- Null 入力：関数ごとの規則を MS-VBAL で裁定し、違反3件を欠陥化（D1、D2、D3）。
- 境界値：月末・うるう年・負シリアル（D7 の欠陥類型を新設）、負の利率（D4）、
  巨大値でのオーバーフロー（D5、D6）、Integer 引数範囲（D6）。
- 未知値入力の伝播は B群のとおり捏造なし。

### X-01（HTML 解釈）
- `js/` と `index.html` に innerHTML の使用はなく、app.js は textContent で描画する。
  新規文面が HTML として解釈される経路はない。

### E-06（旧名・旧形式の残存）
- reference-advanced.js に旧形式フィールド（owner 等）の残存なし。形式は契約の正規形
  （status のみ、理由は description 内マーカー）。

### 契約チェック（advanced-interface.md 第11章）
- (a) 全211件に status あり ✓　(b) referenceAdvanced 内および overrides との name 重複なし ✓
- (c) overrides 10件は全件基礎に実在 ✓　(d) F-02 到達性 ✓（B群）
- (e) 対応項目は全件到達・実行可能 ✓　(f) テンプレートは未対応項目に黙って依存しない ✓
- (g) ファイル名は全件 `-advanced` 除外パターンに一致 ✓（機構側の問題は「残存」参照）
- 用語集13件は基礎と重複なし ✓

## 発見した欠陥と修正（全件、担当ファイル内で修正し監査テストで固定）

| # | 欠陥 | 一次情報 | 修正 |
|---|---|---|---|
| D1 | TimeValue(Null) がエラー94になっていた（Null を返すのが正） | MS-VBAL 6.1.2.4.1.12 | `hTimeValue` を Null 伝播に修正 |
| D2 | InStrRev：(a) 空マッチ＋start＞Len で Len を返していた（start を返すのが正）(b) start/compare の Null で Null を返していた（94 が正） | MS-VBAL 戻り値表 | 戻り値表の記載順どおりに修正、数値引数の Null は 94 |
| D3 | StrComp：compare の Null で Null を返していた（94 が正） | MS-VBAL | 文字列側 Null は Null のまま、compare の Null は 94 |
| D4 | 財務の非有限値：NPV(−1, …) が Infinity、MIRR が誤った有限値（−1）を返していた | Learn（NPV の利率 −1 は定義域外） | rate=−1＋要素ありはエラー11、非有限の結果はエラー6 で停止 |
| D5 | CDec("1E30") を黙って返していた（Decimal 定義域超） | MS-VBAL（Decimal の定義域 ±79,228,162,514,264,337,593,543,950,335） | 定義域超はエラー6 |
| D6 | DateSerial(10000,1,1) 等の範囲外を黙って返していた | Learn（100年〜9999年） | 結果範囲外はエラー5、引数の Integer 範囲超はエラー6。DateAdd／TimeSerial にも同種のガードを追加 |
| D7 | **負シリアルの OLE 符号化（新規欠陥類型）**：1899-12-30 より前の日付＋時刻（例 CDate("1899/12/29 6:00")）が誤符号化され Day/Hour がずれていた | OLE 日付形式（整数部＝日、時刻は絶対値。−1.25＝12/29 06:00）。.NET FromOADate の Learn 備考と照合 | `composeSerial` ヘルパーを新設し parsedToSerial／addMonthsSerial／hTimeSerial／hDateAdd に適用 |
| D8 | IsObject(CVErr(…)) が True を返していた（エラー値はオブジェクトではない） | Learn（IsObject の定義） | `hIsObject` から "err" を除外し False |
| D9 | TypeName/VarType の配列（Variant()／8204 か、要素型推論か） | MS-VBAL＋値モデルの制約 | **欠陥とせず**：Array()／Split()／Filter() の戻りは Variant 配列であり実 VBA でも "Variant()"／8204 が正。監査側で一時変更したが実装班テスト失敗を契機に再裁定し、実装班の §2.5 モデル裁定を支持して差し戻した |
| D10 | リファレンス文面の誤り：MonthName の caution「month に Null を渡すと Null を返します」が誤り（署名は Long のためエラー94。ハンドラ挙動が正） | MS-VBAL（MonthName の署名） | caution を「Null を渡すと、実行時エラーになります。」に修正 |
| D11 | Format の文字列書式：(a) プレースホルダ不足時のパディングが末尾に付いていた（`Format("ab", "@@@")` が "ab "、正しくは " ab"）(b) 大文字小文字のみの書式（"<"／">"）が空文字列を返していた | Learn Format ページ（「Placeholders are filled from right to left」および使用例 Format("HELLO", "<") → "hello"） | `formatStringSection` を書き換え：右詰め既定のパディング位置、過剰時の落とし側（右詰め=左端／左詰め=右端）、プレースホルダなし節の大文字小文字適用を正した |

確定欠陥は D1〜D8、D10、D11 の **10件**（うち D2・D4・D6・D7・D11 は複数表面にまたがる）。
全件修正済みで、監査テスト19件＋実装班・データ班テスト39件は全合格。

## 既存テスト失敗の裁定

VBA 関連の既存テスト（対象14ファイル・300件）で失敗7件。**全件「参照のみ項目の
definitive 裁定（高度実装）による意図した挙動変更」であり回帰ではない**と独立判定した。

- `muse-fix-batch10-vba.test.js` 1件：CCur/CSng/CBool の未対応固定 → 実装済みのため
  （実装班の申し送りと一致）。
- `muse-fix-batch8-cfnvba.test.js` 2件：StrConv 実装に伴うもの。なお Shell／CallByName は
  引き続き名指しで停止することを監査で再確認済み。
- `muse-fix-batch8-vbasweep.test.js` 4件（**実装班報告書に未記載だった分**）：
  FormatDateTime／VarType／Weekday の owner example と function owners テスト。3関数とも
  referenceOverrides で supported に確定済みで、example は正しく実行される（Weekday(Date)
  は実行時値のため正直な未知値になる）ことを確認して意図した変更と裁定。
- `engine.test.js` は全合格（パス上限系の既知フレーキーは今回発生せず）。

フルスイート（`npm test`、4,744件）：合格4,734／失敗10。失敗の内訳は上記 VBA 7件と
**R 側3件**（`adv-b4 r-data2` のスキーマ検証＝R 項目 toString の description 欠落、
`eng4 rep.int and rep_len`、`B13-R unknown function`）。R 側3件は VBA ファイルと無関係で
本班の担当外のため、コーディネーター／R 班への申し送りとする。

## F-03 観察（実測）

ファイル番号系12文（Open／Close／Print #／Write #／Input #／Line Input #／Get／Put／
Seek 文／Lock／Unlock／Width #）と Input 関数の # 形式は、すべてトップレベルで
「この構文は説明に対応していません：#」と停止し、**文名が出ない**。LSet／RSet は変数名のみ、
Const は定数名トークンのみを挙げて停止する。裸の End は「対応する開始文がありません：End」
となり原因表示として紛らわしい。停止自体は正直（黙って通る経路はないことを監査テストで
固定）だが、名指しが粗い／一部は虚偽原因に近い。**engine.js 事項として申し送る**。

## 残存（申し送り・未確認）

1. **F-03 の停止文言**（上記）：engine.js 側の改善事項。
2. **CVErr の表示**：`Debug.Print CVErr(2042)` が `[object Object]` と表示される
   （実 VBA は "Error 2042"）。engine.js の display 事項。実装班の既存申し送りと一致。
3. **precache 機構**：高度ファイル名は `-advanced` 除外パターンに一致する（命名は合格）。
   ただし本ツリーの `scripts/precache.mjs` には高度差分の除外処理がなく、
   `node scripts/precache.mjs --check` は "Precache manifest is stale" で失敗し、現行
   `precache.js` に高度ファイルは含まれていない（再生成すると混入する状態）。
   機構側の統合事項として申し送る。
4. **StrConv vbProperCase の数字境界**（例 "2abc" → "2Abc"）：MS-VBAL は単語区切りの
   定義のみで数字の扱いを一次情報で確定できず、**未確認候補**として記録（修正しない）。
5. **呼び出し結果への直接添字**（例 `Filter(...)(1)`、`Split(...)(0)`）は基礎パーサの
   制約で停止する。変数経由では正常動作を確認済み。基礎側の制約として記録。
6. **TypeName の caution 文面**：配列が Variant() になる理由の説明は値モデルの裁定に
   依存する。挙動は D9 のとおり裁定済みで、文面の単純化のみ任意残件とする。
7. **ドット形式の定数参照**（例 `DriveTypeConstants.Fixed`）はプロパティとして停止する。
   エンジンはメンバー名解決のみで、SPEC の範囲どおりの観察事項。
8. 値モデルの制約（数値リテラルのサブタイプ推論なし、Space(200001) 以上の未知値化、
   IsObject(Nothing)＝True のモデル判断）は実装班が開示済みで、本監査でも維持を妥当と判断。
