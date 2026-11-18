# ADV-B4 VBAデータ班 報告書

担当：VBAデータ班（リファレンス項目・テンプレート・用語集・対応表・データテスト）
対象ファイル：`js/types/vba/reference-advanced.js`、`js/types/vba/templates-advanced.js`、`js/types/vba/glossary-advanced.js`、`tests/adv-b4-vba-data.test.js`、本報告書。
一次情報：Microsoft Learn の VBA 言語リファレンス（棚卸し `inventory-vba.md` の各行の出典URL。確認の基準日は棚卸しの 2026-11-16、本作業での定数値の再確認は 2026-11-17）。

## 1. 件数内訳（種別ごと）

高度リファレンス項目は全 **213件**（棚卸しの未収録203件＋参照のみ10件の全件。漏れなしはテストで機械照合済み）。

| 種別 | 件数 | supported | unsupported | unverified |
|---|---|---|---|---|
| 関数 | 102（未収録94＋参照のみ8） | 81 | 21 | 0 |
| ステートメント | 65（未収録63＋参照のみ2） | 5 | 60 | 0 |
| 定数 | 46（未収録46） | 46 | 0 | 0 |
| **合計** | **213** | **132** | **81** | **0** |

- 同名別項目：`Error`（関数／ステートメント）と `Seek`（関数／ステートメント）は棚卸しの数え方どおり別項目として2件ずつ収録した。そのため名前の種類は211種、項目数は213件。
- 基礎リファレンスとの名前の重なりは、上書き対象の参照のみ10件（CallByName、Dir、FormatDateTime、GetAttr、Shell、StrConv、VarType、Weekday／SetAttr、Unload）だけであることをテストで検証した。
- 定数の項目名について：SPEC 第2章（F-02到達性）が「メンバー名単位（グループ名.メンバー名）」を定めるため、その形式で46件を作った。値の裏付けはグループ単位で Learn の各定数ページを取り、実装班の `constants-advanced.js` の登録値とも全件一致した（後述）。

### 関数 unsupported 21件（名指し理由の要旨）

実ファイルシステム依存：Dir、EOF、FileAttr、FileDateTime、FileLen、GetAttr、Input、Loc、LOF、Seek（関数）。レジストリ依存：GetAllSettings、GetSetting。外部オブジェクト／シェル依存：CallByName、CreateObject、GetObject、Shell。OS環境依存：Environ。Mac固有：MacID、MacScript。出力位置指定（Print # 専用）：Spc、Tab。

### ステートメント supported 5件

Do...Loop、For...Next、For Each...Next、If...Then...Else、Exit。いずれも基礎実装と同一実体の棚卸し表記であり、プローブで実際に実行できることを確認した（次節）。Exit は基礎の Exit Do／Exit For／Exit Sub への対応を description に明記した。

## 2. ステートメントのプローブ結果

方法：`js/types/vba/index.js` の `definition.simulate` に、対象文を含む最小コードを通した（2026-11-17 実施）。判定は「エラーなくパスが返る＝実行可能」「停止＝unsupported」。

### 実行できたもの（paths=1、エラーなし）→ supported

| 項目 | プローブコード（要旨） | 結果 |
|---|---|---|
| Do...Loop | `Do While i < 3 … Loop` | 実行可 |
| For...Next | `For i = 1 To 3 … Next i`（合計計算） | 実行可 |
| For Each...Next | `For Each v In Array(1, 2) … Next v` | 実行可 |
| If...Then...Else | If／Else 両分岐つき | 実行可 |
| Exit | `For … Exit For … Next`、`Sub … Exit Sub … End Sub` | 実行可 |

### 停止したもの（60件）→ unsupported

- 大半は「この構文は説明に対応していません：＜文の内容＞」と構文を挙げて停止した（AppActivate、Beep、Call、ChDir、ChDrive、Declare、Deftype（DefInt で実施）、DeleteSetting、Enum、Erase、Error（文）、Event、FileCopy、Function、GoSub...Return、GoTo、Implements、Kill、Load、MkDir、Name、On...GoSub, On...GoTo、Option Compare、Option Private、Private、Property Get／Let／Set、Public、RaiseEvent、Randomize、Reset、Resume、RmDir、SaveSetting、SendKeys、SetAttr、Static、Stop、Type、Unload、While...Wend、With）。
- ファイル番号系（Close、Get、Input #、Line Input #、Lock、Unlock、Open、Print #、Put、Seek（文）、Width #、Write #）は「この構文は説明に対応していません：#」と停止した。停止自体は正直だが、文言がファイル番号トークン「#」のみで文名を挙げていない。F-03（名指しの正直な停止）の観点では粗いため、コーディネーターへの申し送りとする（エンジン側の話であり本班の担当ファイル外）。
- ReDim は「この構文は説明に対応していません：ReDim（動的配列）」と名指しで停止した。
- LSet／RSet は、前段の固定長文字列宣言（`String * 10`）の時点で「As New / 固定長文字列」と停止した。
- Const は定数名トークン（「X」）を挙げて停止した。
- End（単独）は「対応する開始文がありません：End」と停止した（エンジンは End をブロック終端としてのみ扱う）。

## 3. 裁定で迷った項目と根拠

1. **While...Wend → unsupported**。課題指示の例示では「基礎文の表記バリアント」に含まれていたが、プローブの結果、基礎エンジンは While...Wend 構文を受理せず名指しで停止した。基礎の対応範囲の説明（`js/types/vba/index.js` の semantics.support）にも While は含まれていない。つまり Do While...Loop と意味は同じでも構文実体が別であり、「実際に実行できるものだけ supported」の原則に従い unsupported とし、reason に「Do While...Loop で書ける」旨を明記した。
2. **IsMissing → supported**。実 VBA では Optional 引数専用の関数だが、本アプリはユーザー定義プロシージャを持たないため、取りうる結果は常に False であり、それがモデル内では正しい意味論になる。caution と報告書にこの前提を明記した。
3. **StrConv → supported（部分実装）**。課題指示の方針どおり supported とし、caution に「対応する変換は一部に限られます（部分実装）」と明記した。Format 関数も書式の全域は広いが、同様に supported とした（部分対応の範囲確定は実装班・統合監査側）。
4. **CVErr → supported**。エラー値を生成する純粋な関数であり、基礎エンジンにエラー値のモデルがあるため supported とした。
5. **CLngLng／CLngPtr → supported**。実 VBA では 64 ビット版専用（CLngPtr はポインタ安全な変換）だが、数値変換としての意味論はモデル内で再現できるため supported とし、その旨を caution に書いた。
6. **Call（文）→ unsupported**。基礎エンジンは単一 Sub のみで、ユーザー定義プロシージャ呼び出し自体を受理しない（プローブ確認）。複数プロシージャ前提のため unsupported。
7. **定数の項目形式**。課題指示の「グループ単位で値を束ねる方式」と SPEC 第2章の「メンバー名単位」が食い違って見えたが、到達性（F-02）を定める SPEC を優先しメンバー名単位で項目化した。値の検証はグループ単位で行い、束ねは実装側（constants-advanced.js）が担う形で両立している。

## 4. 定数46件の値の裏付け

2026-11-17 に Microsoft Learn の各定数ページを直接取得して照合した。

- DriveType constants：Unknown=0、Removable=1、Fixed=2、Remote=3、CDROM=4、RAMDisk=5。
- File Attribute constants：Normal=0、ReadOnly=1、Hidden=2、System=4、Volume=8、Directory=16、Archive=32、Alias=64、Compressed=128。
- File Input/Output constants：ForReading=1、ForWriting=2、ForAppending=8。
- SpecialFolder constants：WindowsFolder=0、SystemFolder=1、TemporaryFolder=2。
- System Color constants：vbScrollBars=&H80000000 ～ vbInfoBackground=&H80000018（連番）。description には16進値と符号付き10進値の両方を記載した。

上記すべてが実装班の `constants-advanced.js` の登録値と一致した。また Learn の各ページ冒頭の注記（対応するタイプライブラリへの参照がある場合に使える定数）を、DriveType／FileAttribute／FileInputOutput／SpecialFolder の各項目の caution に反映した。

## 5. 対応表（現行のみ存在する項目48件 → 棚卸し名・扱い）

| 現行名 | 対応する棚卸し名／扱い |
|---|---|
| ActiveWorkbook | 対応なし（Excel オブジェクトモデル。棚卸しの範囲外） |
| And | 対応なし（演算子。関数／文／定数の一覧対象外） |
| Attribute | 対応なし（棚卸しのステートメント一覧に未掲載） |
| Boolean | 対応なし（データ型） |
| Cells | 対応なし（Excel オブジェクトモデル） |
| ClearContents | 対応なし（Excel Range のメソッド） |
| Column | 対応なし（Excel Range のプロパティ） |
| Count | 対応なし（コレクションのプロパティ） |
| Debug.Print | 対応なし（棚卸しのステートメント一覧に未掲載） |
| Do | **Do...Loop** |
| Double | 対応なし（データ型） |
| Empty | 対応なし（リテラル／特殊な値） |
| Err.Number | 対応なし（Err オブジェクトのプロパティ） |
| Exit Do | **Exit**（棚卸しは Exit として一括） |
| Exit For | **Exit** |
| Exit Sub | **Exit** |
| False | 対応なし（リテラル） |
| For | **For...Next** |
| For Each | **For Each...Next** |
| If | **If...Then...Else** |
| Integer | 対応なし（データ型） |
| Long | 対応なし（データ型） |
| Mod | 対応なし（演算子） |
| Next | **For...Next／For Each...Next** の終端（単独項目としては対応なし） |
| Not | 対応なし（演算子） |
| Nothing | 対応なし（リテラル） |
| Null | 対応なし（リテラル／特殊な値） |
| Object | 対応なし（データ型） |
| Offset | 対応なし（Excel Range のメソッド） |
| Or | 対応なし（演算子） |
| QueryClose | 対応なし（フォームのイベント名。定数 VbQueryClose とは別） |
| Range | 対応なし（Excel オブジェクトモデル） |
| Row | 対応なし（Excel Range のプロパティ） |
| Show | 対応なし（UserForm のメソッド） |
| Single | 対応なし（データ型） |
| ThisWorkbook | 対応なし（Excel オブジェクトモデル） |
| True | 対応なし（リテラル） |
| Value | 対応なし（Excel Range のプロパティ） |
| Value2 | 対応なし（Excel Range のプロパティ） |
| Variant | 対応なし（データ型） |
| Workbook | 対応なし（Excel オブジェクトモデル） |
| Workbooks | 対応なし（Excel オブジェクトモデル） |
| Worksheet | 対応なし（Excel オブジェクトモデル） |
| Worksheets | 対応なし（Excel オブジェクトモデル） |
| Xor | 対応なし（演算子） |
| vbLinguisticCasing | 対応なし（棚卸し調査で定数一覧の各ページに掲載を確認できなかった現行のみの定数） |
| vbSimplifiedChinese | 対応なし（同上） |
| vbTraditionalChinese | 対応なし（同上） |

## 6. テンプレート（5件）と用語集（13件）

テンプレート（`templates-advanced.js`、基礎層と同形式）：

| id | 題材 | 使用する高度項目 |
|---|---|---|
| adv-deadline | 期限計算 | DateSerial、DateAdd、DateDiff |
| adv-format | 表示整形 | Format、FormatNumber、FormatDateTime |
| adv-split-join | 文字列の分割と結合 | Split、Join |
| adv-loan | ローン計算 | Pmt、IPmt、PPmt |
| adv-branch | 番号・条件による分岐 | Choose、Switch |

コードは基礎＋高度の supported 項目だけで構成し、テストで機械検証した（コード中の識別子が既知項目に一致する場合はすべて supported であること。End Sub の End は構文上の終端として除外）。

実行確認：高度関数の実装（functions-advanced.js）の完成後にシミュレータで全5件を実行し、全件エラーなくパスが返った。値の照合：adv-deadline の開始日シリアルは 46037（2026-01-15）、期限は 46067（ちょうど30日後）。adv-loan の Pmt は -8606.64… で、一次情報の年金現価式から手計算した値（100000×0.005／(1－1.005^-12) ≒ 8606.64、支払いは負）と一致した。なお初稿の adv-deadline は `Dim … As Date` を使っていたが、基礎エンジンは型 Date を受理しない（「型 date」と名指しで停止）ため、型指定なしの Dim に修正した。

用語集（`glossary-advanced.js`、13件）：シリアル値、銀行丸め、減価償却、定率法、定額法、年数合計法、内部収益率、正味現在価値、現在価値、将来価値、週の開始曜日、書式指定子、名前付き書式。基礎用語集との重複がないことをテストで検証した。

## 7. テスト結果

`tests/adv-b4-vba-data.test.js`（10件）：

- 棚卸しとの全件照合（埋め込みリスト＋棚卸しファイル実物の機械抽出の二重照合）✔
- スキーマ検証（必須フィールド、status と supported の一致、unsupported の reason 非空、example 非空、カテゴリは基礎慣行の範囲）✔
- ステータス内訳（132／81／0）✔、同名別項目（Error／Seek）✔、基礎との重なりは上書き10件のみ ✔
- 定数46件（メンバー名単位・全件 supported・値の記載）✔
- テンプレート形式と使用項目の範囲 ✔、用語集 ✔
- registry ロード確認 ✔（作業中は実装班ファイルの編集中で一時的に失敗したが、export の追加後に再実行して全10件グリーンを確認した）

追加の統合前照合（本班で実施）：

- **リファレンス↔実装の突き合わせ（F-02）**：実装班の `advancedBuiltins` のキーは **81件**で、本班の supported 関数 **81件と完全一致**した（supported なのに実装がないもの 0件、未対応なのに実装があるもの 0件。ただし名前だけの照合では Error 関数（supported、実装あり）と Error 文（unsupported）が同名で混ざるため、Error の1件は内訳で確認した）。
- 既存テストへの影響：`tests/engine.test.js`、`tests/muse-fix-vba.test.js`、`tests/muse-fix-batch13-vba.test.js` は合計94件すべてグリーン。本班のデータファイルはエンジンや基礎定義から import されていないため、既存挙動への影響はない。
- `tests/muse-fix-batch10-vba.test.js` に1件の失敗がある（「CCur/CSng/CBool stay named unsupported stops」）。これは本班の変更ではなく、実装班が CCur／CSng／CBool を高度関数として実装したことで、基礎時代の「未対応として停止する」という既存テストの期待値が陳腐化したもの。統合側で当該テストの期待値を B4 の仕様に合わせて更新する必要がある（申し送り2）。なお4ファイル一括実行時に一度だけもう1件の失敗が見えたが、単独再実行では再現しなかった（並行実行時の時間予算系フレーキーの疑い。SPEC 第6章の既知事項に該当しうる）。

## 8. 未確定事項・申し送り

1. ~~registry ロードとテンプレートの実行確認は実装の完成待ち~~ → **解消済み**。実装班の `functions-advanced.js` 完成後に再実行し、テスト全10件グリーン、テンプレート全5件の実行確認、リファレンス supported 81関数↔実装キー81件の完全一致まで確認した（第6・7節）。残る統合監査側の作業は、合成カタログ（基礎＋高度）での検索・表示確認（D-05／D-06）と precache 整合（E-02）など、本班の担当ファイル外の項目のみ。
2. **既存テスト `muse-fix-batch10-vba.test.js` の期待値1件が B4 実装で陳腐化**（第7節）。統合側で期待値の更新が必要。
3. **ファイル番号系ステートメントの停止文言が「#」のみ**（第2節）。F-03 の観点で文名を挙げる文言への改善を検討されたい（engine.js は本班の担当外）。
4. unverified は **0件**。一次情報で意味を確認できなかった項目はなかった（棚卸し自体も未確認0件で、本班の再確認でも新規の未確認は生じなかった）。
