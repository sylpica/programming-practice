# 高度モード B4（Excel VBA＋R）― VBA エンジン班 報告書

担当：VBA 関数ハンドラ（`js/types/vba/functions-advanced.js`）・定数（`js/types/vba/constants-advanced.js`）・新規テスト（`tests/adv-b4-vba-eng.test.js`）・本報告書。
一次情報は Microsoft Learn の VBA 言語リファレンス各ページ（確認日 2026-11-17）。QBColor の戻り値表のみ、Learn の QBColor ページに数値表が無いため MS-VBAL の QBColor 節を正本とした。GitHub への書き込みは行っていない。

## 1. プローブ結果一覧（実装前）

対象102件（棚卸しの関数「未収録」94件＋「参照のみ」8件：CallByName、Dir、FormatDateTime、GetAttr、Shell、StrConv、VarType、Weekday）について、基礎エンジン（高度差分が空の状態）で `definition.simulate` による代表呼び出しを実行した。

- **102件すべて**が、パスエラー「この構文は説明に対応していません：関数 \<名前\>」で**正直に停止**した（黙った誤値・暗黙の Empty 化はなし）。例外は Split の直接添字形式 `Split(...)(0)` のみで、これは「オブジェクトのメソッド呼び出し」として停止した（代入経由でも「関数 split」で停止することを別途確認）。
- したがって**基礎層が正しく実装済みで、高度ハンドラ登録が遮蔽してしまう名前は1件もなかった**。棚卸し「未収録」でも基礎実装があると懸念された書式・大文字小文字変換系（Format、LCase/UCase のうち LCase/UCase は基礎実装済みで対象外、Format は未実装）もこの結果で確定した。基礎実装済みの CInt／CLng／CDbl／CStr／Trim／String／Val／IsNumeric／IsNull／IsEmpty／LBound／UBound 等にはハンドラを登録していない。
- 定数46件は全件、現状では暗黙の Empty 変数として解決されていた（定数としての解決なし）ことを同じプローブで確認した。

実装後の再プローブでは、実装対象81件すべてが期待値で返り、未対応21件は引き続き関数名を名指して停止すること、定数46件全件が値で解決することを確認した。

## 2. 実装した関数（81件）

ハンドラ契約（SPEC 第3章）どおり `(args, ctx) => VBA値` で実装。引数個数違いはエラー450、型不一致は13、引数不正は5、Null の不正使用は94、オーバーフローは6。

| 群 | 関数（件数） |
|---|---|
| 文字列 | Asc、Chr、Hex、Oct、Str、LTrim、RTrim、StrReverse、InStrRev、StrComp、Space、Partition（12） |
| 数学 | Atn、Cos、Exp、Log、Sgn、Sin、Sqr、Tan（8） |
| 型変換 | CBool、CByte、CCur、CDate、CDec、CLngLng、CLngPtr、CSng、CVar、CVErr（10） |
| 制御・選択 | IIf、Choose、Switch（3） |
| 配列・文字列集合 | Join、Split、Filter（3） |
| 判定・型情報 | IsArray、IsDate、IsError、IsMissing、IsObject、TypeName、VarType、Error（8） |
| 日付・時刻 | DateAdd、DateDiff、DatePart、DateSerial、DateValue、Day、Hour、Minute、Second、Month、Year、Weekday、WeekdayName、MonthName、TimeSerial、TimeValue、FormatDateTime（17） |
| 財務 | DDB、FV、IPmt、IRR、MIRR、NPer、NPV、PPmt、Pmt、PV、Rate、SLN、SYD（13） |
| 書式 | Format、FormatCurrency、FormatDateTime（日付群と重複）、FormatNumber、FormatPercent（4） |
| StrConv・色 | StrConv、RGB、QBColor（3） |

（合計81件。FormatDateTime は日付群に数えた。）

### 2.1 日付モデルと CDate の受理書式

- **表現**：シリアル値（1899-12-30 起点の Double）。整数部が日、小数部が時刻。負シリアルは trunc で日部を取り、小数部の絶対値が時刻になる（実 VBA の負シリアルの規則）。カレンダー変換はグレゴリオ暦の通日算法で JS Date／ローカル TZ に依存しない。
- **曜日・週規則**：firstdayofweek／firstweekofyear は Learn の定義どおり実装（vbFirstJan1＝1月1日を含む週、vbFirstFourDays＝新年に4日以上含む最初の週、vbFirstFullWeek＝最初の丸一週）。vbUseSystem（0）はシステム設定依存のため `ctx.unsupported` で名指し停止。DatePart の週番号は、年末の日が翌年第1週の範囲でも当年の週番号（最大53）を返す実 VBA の挙動に合わせた。DateDiff の "ww" は週開始日を (date1, date2] で数え、"w" は date1 の曜日を date2 まで数える（Learn の説明どおり）。DateDiff の h/n/s は境界の数。
- **CDate／日付文字列の受理書式**（en-US を正本）：`YYYY/MM/DD`、`YYYY-MM-DD`、`YYYY.MM.DD`、`MM/DD/YYYY`（2桁年は 00–29→2000年代、30–99→1900年代）、月名形式（`February 12, 1969`／`12 February 1969`、略称可）、時刻 `H:MM[:SS[.fff]]`（AM/PM 可）、日付＋時刻の結合。モデル拡張として `YYYY年M月D日` も受理する。数値文字列（`"45000"`）は日付として受理しない（エラー13）。
- **IsDate**：実 VBA では数値式は日付とみなされないため、モデルでは数値を一律 False とし、日付として解釈できる文字列のみ True とした（モデルでは Date 型と Double が同一表現で区別できないための裁定）。

### 2.2 財務

- FV／PV／Pmt／NPer／IPmt／PPmt は、Learn 各ページの使用例で符号を検証した恒等式 `FV = -(PV*q + Pmt*A)`（q=(1+rate)^nper、A=((q-1)/rate)*(1+rate*type)、rate=0 では A=nper）で統一した。IPmt の type=1（期首払い）は第1期の利息を 0 とし、検証例 IPmt(0.1, 2, 3, 1000, 0, 1) = -63.4441… を手計算と照合した。
- IRR／Rate は Learn の記述どおり guess（既定0.1）から Newton 反復し、20回以内に収束しなければエラー5で失敗させる（実 VBA の失敗の再現）。
- **DDB の式の注意**：Learn の DDB ページに印刷された式 `((cost - salvage) * factor) / life` は本文の「償却は初回が最大で以後逓減」と矛盾し、そのままでは定額になってしまうため、期首簿価逓減の標準形（各期 = min(期首簿価×factor/life, 期首簿価−残存価額)）で実装した。一次情報内の矛盾として明記する。

### 2.3 Format 系の範囲

- Format：数値指定子（0 # . , % E+/E- 指数、末尾カンマの縮小、桁区切り、最大4セクション、引用符リテラル）、定義済み書式名（General Number／Currency／Fixed／Standard／Percent／Scientific／Yes/No／True/False／On/Off／General Date／Long Date／Medium Date／Short Date／Long Time／Medium Time／Short Time）、日付指定子（yyyy yy mmmm mmm mm m dddd ddd dd d hh h nn n ss s q y ww w am/pm a/p c。m の月／分は h 直後・s 直前の文脈規則）、文字列指定子（@ & < > !）を実装。範囲外（色指定子 [Red] 等、未知の日付指定子）は誤値を返さず `ctx.unsupported`／`ctx.fail` で名指し停止する。Format の丸めは Round 関数の銀行丸めではなく四捨五入（0.5 は絶対値方向）。
- FormatNumber／FormatCurrency／FormatPercent：桁数・先行ゼロ・負数の括弧・桁区切りの TriState 引数を実装。ロケールは en-US 前提（通貨記号 $、FormatCurrency の負数既定は括弧）であることをここに明記する。
- Partition の幅は (stop+1) の文字数とした（VB.NET 版 Partition の Remarks が「string representation of (Stop + 1)」と明示し、VBA 版の「stop の文字数＋1」の記述および stop=1000 の例 " 100: 100" と一致する解釈）。

### 2.4 StrConv

- vbUpperCase／vbLowerCase／vbProperCase（単語区切りは Learn が列挙する Chr(0)・タブ・改行・垂直タブ・フォームフィード・復帰・スペース）を実装。
- vbWide／vbNarrow は Unicode 対応表（全角 ASCII U+FF01–FF5E、半角カタカナ U+FF61–FF9F と全角カタカナの対応、濁点・半濁点の合成・分解を含む）で実装。vbKatakana／vbHiragana はひらがな⇔カタカナのコードポイント変換。
- vbUnicode／vbFromUnicode（バイト配列モデルなし）、中国語変換・vbLinguisticCasing（ロケール依存）、LCID 指定時は名指し停止。

### 2.5 TypeName／VarType の対応表（値モデル→実 VBA）

| モデルの値 | TypeName | VarType |
|---|---|---|
| Empty | "Empty" | 0 (vbEmpty) |
| Null | "Null" | 1 (vbNull) |
| Boolean | "Boolean" | 11 (vbBoolean) |
| 数値 | "Double" | 5 (vbDouble) |
| 文字列 | "String" | 8 (vbString) |
| 配列 | "Variant()" | 8204 (vbArray+vbVariant) |
| CVErr 値 | "Error" | 10 (vbError) |
| Range（単一セル解決後は通常届かない） | "Range" | 9 (vbObject) |
| Nothing（value() 解決で通常届かない） | "Nothing" | 9 (vbObject) |

数値はモデルが Double で保持するため一律 Double とする。実 VBA のリテラル Integer 等のサブタイプは、ハンドラへ渡る値だけでは区別できない（モデル制約として明記）。

### 2.6 その他のモデル裁定

- Asc は最初の文字の Unicode コードポイントを返す（実 VBA はロケールのコードページ値。ASCII 範囲では一致）。Chr は 0–255 を Latin-1 として返す。
- CDec は Decimal の 96 ビット精度を再現できないため Double で保持する。CLngPtr は 64 ビット前提で CLngLng と同じとした。
- CVErr の戻り値（{kind:"err", code}）は IsError／VarType では正しく判定できるが、エンジンの `display()` が err 種別専用の表示を持たないため `Debug.Print CVErr(2042)` の表示は実 VBA の "Error 2042" と一致しない。エンジン側の表示対応はコーディネーターへの申し送り（本班は engine.js 編集禁止）。
- Error() の引数なし形式は、エンジン状態の現在エラー番号（Err.Number 相当）に対するメッセージを返す。エラーメッセージ文字列は Learn／MS-VBAL の英語公式文言を用いた（エンジン内部の停止文言が日本語なのとは別に、関数値としては実 VBA の英語文言が正本）。
- IsMissing は、このモデルに Optional 引数を持つユーザー定義プロシージャが存在せず、呼び出しは常に対象を伴うため、渡された引数については常に False を返す実装とした。
- IIf／Choose／Switch はエンジンの eager 評価が実 VBA の「全引数評価」と一致する（IIf の選ばれなかった分岐のエラーも再現されることをテストで確認）。

## 3. 実装しなかった関数（21件）と名指し理由

いずれもハンドラを作らず、基礎エンジンの「関数 \<名前\>」という名指し停止のまま（＝リファレンス側で未対応として開示される前提）。

| 関数 | 理由 |
|---|---|
| CallByName | オブジェクトモデルのメンバー呼び出しに依存し、値モデルに再現対象がない |
| CreateObject | 外部 ActiveX/OLE オブジェクトの生成は再現できない |
| Dir | 実ファイルシステムの検索に依存 |
| Environ | OS 環境変数の取得に依存 |
| EOF | 実ファイル入出力に依存 |
| FileAttr | 開いている実ファイルのモード参照に依存 |
| FileDateTime | 実ファイルの更新日時に依存 |
| FileLen | 実ファイルのサイズに依存 |
| GetAllSettings | Windows レジストリの読み取りに依存 |
| GetAttr | 実ファイルの属性取得に依存 |
| GetObject | 外部 ActiveX オブジェクトの取得に依存 |
| GetSetting | Windows レジストリの読み取りに依存 |
| Input | 実ファイルからの読み取りに依存 |
| Loc | 実ファイルの現在位置に依存 |
| LOF | 実ファイルのサイズに依存 |
| MacID | Macintosh 固有の OS 機能に依存 |
| MacScript | Macintosh のスクリプト実行に依存 |
| Seek | 実ファイルの現在位置に依存 |
| Shell | 外部プログラムの実行に依存 |
| Spc | ファイル／印刷出力（Print #）専用の位置指定であり、Debug.Print のモデルに意味を持たない |
| Tab | 同上 |

未検証（意味論を一次情報で確定できなかった）関数は **0件**。実装した81件は全件、Learn の仕様・使用例から導いた期待値でテストした。

## 4. 定数（46件）

`constants-advanced.js` に棚卸しの定数「未収録」46件を全件登録した（キーは小文字メンバー名）。出典はファイル冒頭コメントにグループ単位で記載：

- DriveType（6件）：Unknown=0、Removable=1、Fixed=2、Remote=3、CDROM=4、RAMDisk=5 ― Learn「DriveType constants」
- File Attribute（9件、メンバー名）：Normal=0、ReadOnly=1、Hidden=2、System=4、Volume=8、Directory=16、Archive=32、Alias=64、Compressed=128 ― Learn「File Attribute constants」（vb 接頭辞版は基礎層登録済みのため重複させない）
- File Input/Output（3件）：ForReading=1、ForWriting=2、ForAppending=8 ― Learn「File Input/Output constants」
- SpecialFolder（3件）：WindowsFolder=0、SystemFolder=1、TemporaryFolder=2 ― Learn「SpecialFolder constants」
- System Color（25件）：vbScrollBars=&H80000000 〜 vbInfoBackground=&H80000018 を符号付き Long 値（-2147483648〜-2147483624）で登録 ― Learn「System Color constants」

テストで46件全件を名前で引いて値が返ることを確認した。文字列定数（vbCrLf 等）は基礎層解決済みのため登録していない。

## 5. ステートメント実現可能性メモ（未収録63件＋参照のみ2件）

実装はしていない。分類の根拠は現行パーサの実プローブ（代表文を simulate し、停止形態を確認）による。現行の停止は大別して「パース時（トップレベルエラー）で文を名指す正直な停止」が多く、受理して黙って捨てる経路はプローブ範囲では見つからなかった。ただしファイル系文は字句解析の `#` で停止し文名が出ない（後述）。

### 5.1 パーサ拡張なしで扱えるもの（現行で受理済み／表記差異のみ）― 5件

| 項目 | 現行の実態 |
|---|---|
| Do...Loop | Do として実装済み（表記差異） |
| For...Next | For として実装済み（表記差異） |
| For Each...Next | For Each として実装済み（表記差異） |
| If...Then...Else | If として実装済み（表記差異） |
| Exit | Exit Do／Exit For／Exit Sub として実装済み（表記差異。Exit Function／Exit Property は対象外） |

### 5.2 パーサ変更が要るもの（言語機能として実装可能）― 31件

Call、Const、Deftype、End（End Function 等の複合形を含む）、Enum、Erase、Error（ステートメント）、Event、Function、GoSub...Return、GoTo、Implements、LSet、On...GoSub/On...GoTo、Option Compare、Option Private、Private、Property Get、Property Let、Property Set、Public、RaiseEvent、Randomize、ReDim、Resume、RSet、Static、Stop、Type、While...Wend、With

（数え方：上記は31件のうち、複数プロシージャ・ユーザー定義型・イベント・ラベル遷移などエンジン構造の拡張を伴うものを含む。「パーサ変更が要る」は最小でも構文受理＋意味論の追加が必要という意味で、規模は項目ごとに異なる。特に Function／Property／Event／Implements／Type／Enum は単一 Sub モデルそのものの拡張、GoTo／GoSub／On...GoTo はラベルと制御フローグラフの拡張、With は暗黙レシーバの拡張が要る。ReDim は現行「ReDim（動的配列）」と名指して停止中だが、動的配列の要素参照自体が未対応のため、受理だけ先行させると誤値の温床になる。LSet／RSet は現行では代入先名で停止しており、固定長文字列の意味論とセットで要る。）

### 5.3 原理的に未対応（実ファイル・OS・GUI・レジストリ依存）― 29件

AppActivate、Beep、ChDir、ChDrive、Close、Declare、DeleteSetting、FileCopy、Get、Input #、Kill、Line Input #、Load、Lock、Unlock、MkDir、Name、Open、Print #、Put、Reset、RmDir、SaveSetting、Seek（ステートメント）、SendKeys、SetAttr（参照のみ）、Unload（参照のみ）、Width #、Write #

（数え方：SetAttr／Unload は「参照のみ」2件を含む。この群は全件、現行でも停止する。ただし Close／Get／Input #／Line Input #／Lock／Unlock／Open／Print #／Put／Seek／Width #／Write # の11件は字句解析段階で `#` として停止し、文名がメッセージに出ない。F-03「名指しの正直な停止」の観点では、停止自体は正直だが名指しが弱い。字句解析でファイル番号リテラルを文脈付きで受けるか、文名を含む停止文言にする改善はコーディネーターへの申し送りとする。）

### 5.4 申し送り（ステートメント）

- End は現行「対応する開始文がありません：End」で停止する。裸の End（実行終了）はこの文言だと原因が伝わりにくい。
- LSet／RSet は停止文言が代入先の変数名のみで文名が出ない。
- 合計の突合：対象65件（未収録63件＋参照のみ2件）＝ §5.1 の5件 ＋ §5.2 の31件 ＋ §5.3 の29件（参照のみ2件 SetAttr／Unload は §5.3 に含む）。

## 6. テスト結果

- 新規 `tests/adv-b4-vba-eng.test.js`：29テスト全合格。実装81関数すべてに Learn 由来の期待値（境界：月末・うるう年・負数・Null・型不一致・引数過不足を含む）と、定数46件の全件解決、未対応21件のうち代表7件の名指し停止を確認した。
- 既存（指示分）`tests/engine.test.js`＋`tests/muse-fix-batch13-vba.test.js`：batch13 は全合格。engine.test.js は1件「default maximum is exactly 2000 paths」が失敗したが、これはパス上限／時間予算系で、ベースツリー `repo-reffix` でも同一テストが同一に失敗することを対照確認済み（本変更起因ではない。切り分け詳細は §7）。
- その他の VBA 関連テスト：batch2／batch3／batch7／batch2-fc は全合格。batch8-cfnvba で2件、batch10-vba で1件の失敗があるが、いずれも「従来は未対応で停止すること」を固定した既存テストと、高度モードで新規実装した関数（StrConv、CCur／CSng／CBool）の意図した挙動変更との衝突であり、基礎意味論の回帰ではない（§7 に明細）。

## 7. 既存テストとの衝突・切り分け（コーディネーター判断待ち）

1. `tests/muse-fix-batch8-cfnvba.test.js`（2件）：「参照のみ」項目の使用例が正直に停止することを固定。StrConv は本班の裁定で高度モード実装（SPEC §5「参照のみは definitive に裁定」）したため、該当2件が失敗する。Shell／CallByName は引き続き名指し停止している。リファレンス側の StrConv 項目を supported へ更新するのに合わせて、既存テスト側の前提更新が必要。
2. `tests/muse-fix-batch10-vba.test.js`（1件）：「CCur/CSng/CBool はリファレンス項目が無く名指し停止のまま」を固定。3関数とも棚卸しの「未収録（実装候補）」であり本班が実装したため失敗する。同上、前提更新が必要。
3. `tests/engine.test.js` の「default maximum is exactly 2000 paths」：本変更前後ではなく環境要因の切り分けとして、ベースツリー（repo-reffix、高度差分なし）で同一テストを単体実行しても同一に失敗することを確認した。パス列挙の時間予算（VM の CPU スロットリング）系の既知フレーキーと判断する。

## 8. 未確定事項

- なし（未検証として残した関数は0件）。モデル裁定として一次情報だけでは決まらず判断を明記した点は §2.1（IsDate の数値扱い）、§2.2（DDB の式の矛盾）、§2.3（FormatCurrency のロケール既定、Partition の幅）、§2.5（TypeName の数値サブタイプ）、§2.6（Asc／Chr のコードページ、CDec の精度、CLngPtr のビット幅、Error() 引数なし形式、IsMissing）に集約した。
- コーディネーターへの申し送り：(a) CVErr 値の表示（engine.js の display に err 種別の表示追加が要る）、(b) ファイル系ステートメント11件の停止文言が `#` のみで文名を含まない点、(c) §7 の既存テスト3件の前提更新。
