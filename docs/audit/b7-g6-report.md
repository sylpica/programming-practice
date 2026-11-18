# B7 G6チーム（日時・カレンダー系）報告書

担当：datetime（109件）、time（55件）、calendar（85件）、zoneinfo（10件）、計259件。
作業ツリー：`work/adv-b7-g6`（自専用コピー）。新規ファイルの追加のみで、共有ファイル（engine.js、stdlib-registry.js、advanced/index.js、既存テスト）は一切変更していない。GitHub への書き込みはしていない。

契約はコーディネーター確定の `advanced-interface.md` を群規約より優先して適用した：リファレンスは正規形 `{name, category, syntax, description, example, caution, status, returns?, source?}`、配置は `js/types/python/` 直下＋ファイル名に `-advanced`、expected はリファレンスに入れず自群テスト側で保持。

## 区分別件数

| モジュール | 個別実装 | 束ね値 | 例外対応付け | 未検証 | 未対応 | 計 |
|---|---|---|---|---|---|---|
| datetime | 63 | 37 | 0 | 9 | 0 | 109 |
| time | 5 | 11 | 0 | 35 | 4 | 55 |
| calendar | 40 | 33 | 2 | 10 | 0 | 85 |
| zoneinfo | 0 | 0 | 2 | 7 | 1 | 10 |
| **合計** | **108** | **81** | **4** | **61** | **5** | **259** |

status 集計では supported 193 / unverified 61 / unsupported 5（supported = 個別実装＋束ね値＋例外対応付け）。

- 個別実装：クラス・関数・メソッドを意味論まで実装（date/datetime/time/timedelta/timezone/tzinfo の各クラス、Calendar/TextCalendar/HTMLCalendar、gmtime/strftime/strptime 等）。
- 束ね値：data/attribute（date.min/max/resolution、MINYEAR/MAXYEAR/UTC、struct_time の tm_* 属性、Day/Month 列挙メンバー、day_name/month_name 等）。
- 例外対応付け：calendar.IllegalMonthError / IllegalWeekdayError（ValueError 継承、送出・捕捉とも動作）、zoneinfo.ZoneInfoNotFoundError（KeyError 継承）/ InvalidTZPathWarning（RuntimeWarning 継承）。
- 未対応（unsupported）：time.sleep、time.clock_settime、time.clock_settime_ns、time.tzset、zoneinfo.reset_tzpath。呼び出すと「未対応」として正直に停止する。
- 未検証（unverified）：下記「再分類・未検証の内訳」参照。呼び出すと「未検証：理由」の診断を出して確定値を返さない。

## 再分類・未検証の内訳（項目名と理由）

- **datetime.date.strptime / datetime.time.strptime（unverified）**：CPython 3.12.3 実走と公式ドキュメントの両方で**存在しない**ことを確認した（strptime は datetime クラスのみに存在）。捏造実装はせず、caution にその旨を明記して未検証に倒した。
- **datetime の時刻源依存9件のうち代表**：date.today、date.fromtimestamp、datetime.now / today / utcnow / fromtimestamp、datetime.timestamp はローカルタイムゾーン・現在時刻に依存するため unverified。ただし timestamp は aware な datetime、fromtimestamp は tz に固定オフセット timezone を渡す場合に限り決定論的に計算する（caution に明記）。datetime.strptime は上記のとおり実在しないため unverified。
- **time の環境依存35件**：CLOCK_* 定数13件、timezone/altzone/daylight/tzname の環境値4件、ctime/localtime/mktime（ローカル TZ 依存）3件、time/time_ns/monotonic 系/ perf_counter/process_time/clock_gettime 系などクロック関数15件。いずれも実行環境で値が決まるため unverified。一方 gmtime（引数で秒指定・UTC）、asctime、strftime、strptime、struct_time は決定論的に実装した。
- **calendar の pr 系6件**（TextCalendar.prmonth/prweek/pryear、モジュール関数 prcal/prmonth）：標準出力への表示が本体で、エンジンからは再現できないため unverified（format 系は全て実装済み）。
- **calendar.Locale 系2件**（LocaleTextCalendar/LocaleHTMLCalendar）：ロケール依存のため unverified（生成はできるが format 系は未検証診断を出す）。
- **HTMLCalendar.formatyearpage**：戻り値が bytes で既定エンコーディングが環境依存のため unverified。
- **IllegalMonthError.month / IllegalWeekdayError.weekday（各属性）**：例外自体の送出・捕捉・メッセージは対応付け済みだが、エンジンの例外値が属性を保持できないため属性項目のみ unverified。
- **zoneinfo 7件**：ZoneInfo 本体とそのメソッド（clear_cache/from_file/no_cache）、key 属性、TZPATH、available_timezones。エンジンに tz データベースが無いため unverified。datetime.timezone で代用するような見せかけはしていない。

## 照合方法と範囲

- **一次資料**：公式ドキュメント（https://docs.python.org/ja/3.15/library/{datetime,time,calendar,zoneinfo}.html）と CPython 3.12.3 実走（/usr/bin/python3）。calendar は /usr/lib/python3.12/calendar.py のアルゴリズム（formatmonth/formatyear/pyCenter 相当）を移植し、文字列出力を実走と一致させた。strptime の %U/%W 週換算は _strptime の規則を実走ケースで検証して実装。
- **差分照合43件**：同一プログラムを CPython とエンジンで実行し出力を完全比較（formatyear/formatmonth の複数行文字列、HTML 出力、ISO 週境界、astimezone、struct_time スライス等）。全件一致。
- **F-04 照合**：supported 193件全ての example をエンジンで実行し、エラーなし・未検証診断なしを確認（テストに組み込み済み）。期待出力はテストファイルのケース表で保持。
- **境界ケース**：ISO 週（2021-01-01 → 2020年第53週、2019-12-30 → 2020年第1週、fromisocalendar の週53可否・曜日範囲エラー）、うるう年（2000年は閏年・1900年は平年、2月29日生成可否）、月末（1月31日＋1日 → 2月1日）、序数往復（1=0001-01-01、3652059=9999-12-31、範囲外は OverflowError）、timedelta 正規化（負値は days が負方向 floor・seconds/microseconds は正範囲、float 引数は偶数丸め 1.5→2・2.5→2）、fold（replace で保持・timedelta 加算で 0 にリセット）、naive/aware 混在の比較・減算は TypeError、timezone の ±24時間ちょうども ValueError、strftime/strptime の %j・%U・%W・%z・%Z、struct_time のスライス・負添字、time.strftime への11要素タプルは TypeError（CPython 実走どおり）。
- **暦の正本**：proleptic Gregorian。JS の Date は使わず序数（ordinal）ベースの整数演算（CPython の ord2ymd 周期分解）で実装。strftime/strptime のロケール依存コード（%a/%A/%b/%B/%p）は C ロケール（英語）として実装し、リファレンスにも明記した。

## 基盤要請・確認事項

1. **モジュール属性経由のクラス生成で kwargs が二重評価される**：`import datetime` して `datetime.timedelta(days=1)` のようにモジュール属性経由でクラスを生成すると、kwargs の値が UNK（「実行時に決まる：値」）になって渡る。from-import 形式（`from datetime import timedelta; timedelta(days=1)`）とモジュール関数経由は正常。再現はカスタムモジュール probe でも確認済み。推定原因は engine.js の stdlibModuleCall が kwargs を評価した後、クラス分岐で stdlibConstruct が再度評価する二重評価。G6 側はテスト・例題を from-import 形式に寄せて回避したが、学習者が自然に書く `datetime.timedelta(days=...)` が壊れるため基盤側の修正を要請する。
2. **単項マイナス／プラスと abs() がネイティブへ委譲されない**：`-timedelta(days=1)` は TypeError、abs(timedelta) も TypeError になる（CPython ではどちらも有効）。binop と同様の委譲経路を要請する。
3. **`is` / `is not` がネイティブ値で UNK になる**：`datetime.UTC is datetime.timezone.utc` が確定できない。シングルトン同一性の判定経路を要請する。
4. **format() 組み込みと f 文字列の書式指定がネイティブ __format__ へ委譲されない**：`format(date(2024,2,29), '%Y/%m/%d')` がエンジン側の書式検証で ValueError になる。__format__ メソッド自体は実装済みで、例題は直接呼び出しに寄せた。
5. **manifest 登録**：モジュール別リファレンス4ファイル（reference-advanced-{datetime,time,calendar,zoneinfo}.js）の `advanced-manifest.js` への referenceParts 登録は共有ファイル作業のためコーディネーターに要請する。G6 内の集約は `group-advanced-g6.js` が担い、`referenceAdvanced`（259件連結）と REF_DATETIME/REF_TIME/REF_CALENDAR/REF_ZONEINFO を export 済み。
6. **配置の不整合（参考）**：基礎パイロット math は契約配置（js/types/python 直下・-advanced）ではなく `js/types/python/advanced/` 配下にある。G6 は契約配置を採用したため、集約方法が math と異なる。統一はコーディネーター裁定に委ねる。
7. **基礎カタログの素名項目について（契約指示3への回答）**：G6 の限定名259件は基礎リファレンスの項目名と完全一致しないため、全件を新規項目として referenceAdvanced に収載した。基礎側にある素名項目（'datetime' 等）の状態変更が必要かどうかはコーディネーター裁定待ちとして記録する（referenceOverrides は使用していない）。
8. **ネイティブ値への属性代入**：`Calendar.firstweekday = x` のような代入はエンジンで扱えない可能性があるため、setfirstweekday メソッドで代替した。代入経路の対応可否を確認事項とする。
9. **参考**：エンジンの str メソッドには未対応のものがある（例 splitlines）。G6 の実装範囲外だが、テスト作成時に観測したため記録する。

## 残存

- 未検証61件は、時刻源・ローカルタイムゾーン・tz データベース・標準出力など、エンジン側に一次資料がないものに限る。特に zoneinfo.ZoneInfo の本実装は tz データベースの収載が前提（基盤側の判断待ち）。
- 上記基盤要請1〜4が解消されれば、例題・テストをモジュール属性経由の自然な表記に戻せる。

## テスト結果

- `node --test tests/muse-adv-b7-g6.test.js`：**142件全件合格**（値ケース＋異常ケース＋未検証の正直さ＋リファレンス整合性＋F-04 全例題実行）。
- 既存の math／foundation テスト（99件）も全件合格で、影響なし。

## 作成ファイル一覧

- `js/types/python/datetime-core-advanced.js`（共有コア：序数演算・timedelta 正規化・strftime/strptime・スライス添字）
- `js/types/python/impl-advanced-datetime.js`
- `js/types/python/impl-advanced-time.js`
- `js/types/python/impl-advanced-calendar.js`
- `js/types/python/impl-advanced-zoneinfo.js`
- `js/types/python/reference-advanced-datetime.js`（109件）
- `js/types/python/reference-advanced-time.js`（55件）
- `js/types/python/reference-advanced-calendar.js`（85件）
- `js/types/python/reference-advanced-zoneinfo.js`（10件）
- `js/types/python/group-advanced-g6.js`（集約）
- `tests/muse-adv-b7-g6.test.js`
- `docs/audit/b7-g6-report.md`（本書）
