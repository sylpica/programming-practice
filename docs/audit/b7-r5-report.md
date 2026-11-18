# B7 追補 R5 報告書（G6/G2 フック配線）

担当：追補チーム R5（G6/G2 フック配線担当）
作業ツリー：`work/adv-b7-r5/`（GitHub 書き込みなし・ローカルコミットのみ）
前提：基盤フック `unary` / `round` / `format` / `setattr`（F-D/F-G/F-H 系）を利用し、エンジン本体・manifest は編集していない。

## 結果サマリ

| 作業 | 結果 |
|---|---|
| 1. timedelta の unary | 実装完了（`impl-advanced-datetime.js`） |
| 2. date/datetime/time の format | 実装完了（同上） |
| 3. Fraction/Decimal の format | 両方とも実装完了（Decimal は新規実装、Fraction は G1 既存整形を配線） |
| 4. Context の setattr | 実装完了（`impl-advanced-decimal.js`、create_decimal での実効確認まで） |
| 5. Decimal の round | 実装完了（ただしタスク文の期待値に CPython との相違あり。下記） |
| 6. G6 未検証61件の再判定 | **status 変更 0件**（理由は全件環境依存で、kwargs 起因は0件。下記） |
| 7. 検証 | 新規テスト7ブロック全合格。B7 全テスト 1,390件中 1,388件合格（残り2件は既存不整合、下記） |

検証方法：全項目を CPython 3.12.3 実走との差分照合で確認した。キュレーション184件＋ランダムスイープ1,282件（Decimal 書式・round・setattr・timedelta 単項）の計1,466件で、不一致は「設計どおりの正直な停止」3件（後述）のみ。

## 作業1：timedelta の unary

`timedeltaDef` に `unary` フックを追加。`-` は符号反転、`+` は同値のコピー（`x is +x` が False になることまで確認）、`abs` は絶対値。`~` は NOT_HANDLED を返し基盤の TypeError に委ねる（CPython も TypeError）。
境界：`-timedelta.max` は OverflowError（`days=-1000000000; must have magnitude <= 999999999`、コンストラクタと同一文面）、`-timedelta.min` と `abs(timedelta.min)` は `timedelta(days=999999999)` で範囲内。ランダムスイープ60件でも全一致。

## 作業2：date/datetime/time の format フック

各クラス定義に `format` フックを追加し、既存 `__format__` メソッドと同じ規則（空 spec は str(self)、それ以外は全体を strftime 書式として解釈）にした。CPython では `format(date, '>10')` が `'>10'`、`'hello'` が `'hello'` と素通しになること、未知コード `%Q` がそのまま返ること、time の日付部が 1900-01-01 基準（`%Y` → `'1900'`）であることまで実走で一致を確認。`format()` と f文字列の両経路で動作する。

## 作業3：Fraction/Decimal の format

### Fraction
`FractionDef` に `format` フックを追加し、G1 の既存整形関数（`formatFloatStyle`／`formatGeneral`）を再利用して `__format__` メソッドと結果を一致させた。解釈できない書式は CPython どおり `ValueError: Invalid format specifier '...' for object of type 'Fraction'` にする（メソッド側は未検証停止のまま）。
照合の過程で G1 側の CPython との差異2件を是正した（`__format__` 経由にも効く副次的修正）：
- 幅指定時の既定配置が左揃えになっていた → 数値として右揃えに是正。
- `,`／`_` グルーピングが正規表現で読み捨てられていた → 整数部へ適用するよう是正。

### Decimal
`decFormatValue` を新規実装し `DEC_CLASS.format` に配線。CPython 3.12.3 実走マトリクス（約120件の個別探査＋ランダムスイープ約800件）で規則を確定した：
- 丸めは現在のコンテキストの rounding を使う（prec は使わない）。
- 精度の既定値は「係数の桁をそのまま出す」：f／% は小数部桁数＝max(0, −e)（% は指数+2 後）、e は係数桁数−1、g／n は有効桁数＝係数桁数。明示精度では丸め＋ゼロ埋め。
- g／n は丸めた桁を保持（末尾ゼロを落とさない）。科学表記の切替は float の g（調整指数 < −4）と違い **Decimal の to-sci 規則**（丸め後の指数 > 0、または調整指数 < −6）。例：`format(Decimal('3E-6'), '.2g')` は `'0.000003'`、`format(Decimal('1.5E-7'), 'g')` は `'1.5e-7'`。
- ゼロの e 書式の癖を再現：精度省略時は元の指数（`0.00` → `'0e-2'`、`0E+5` → `'0e+5'`）、明示時は指数＋精度（`0` の `.2e` → `'0.00e+2'`）。
- 指数は符号必須・ゼロ埋めなし（`'1.23e+4'`。float の `e+04` と異なる）。
- 型なし・精度なしは str(self)（E の大文字小文字はコンテキスト capitals 依存）。型なし・精度ありは有効桁へ丸めて to-sci 文字列化。
- 特殊値：本体は `Infinity`／`NaN`+payload／`sNaN`+payload（% 型では `'Infinity%'` のように % が付く）。ゼロフラグは特殊値では空白埋めになる。
- z フラグ：符号が落ちるのは「整形後の本体がゼロ」のとき（丸めでゼロになった負値も。`format(Decimal('-1.35E-5'), 'z.1f')` → `'0.0'`）。
- 不正書式は `ValueError: invalid format string`。**`_` グルーピングも Decimal では不正**（3.12.3 実走。Fraction や float と異なる）。整数型（d/x/o/b）・s・c・`,n`・`.` 単独（精度なしの `.`）も不正。

## 作業4：Context の setattr

`CX_CLASS` に `setattr` フックを追加。対象は prec／rounding／Emin／Emax／capitals／clamp／flags／traps の8フィールドで、検証はコンストラクタと同じ `applyCxFields` を通すため例外の種類・文面まで CPython と一致する。それ以外の名前は `AttributeError: 'decimal.Context' object has no attribute '...'`（Context は任意属性を持てない）。
検証は読み戻しだけでなく実効まで確認した：`c = Context(prec=5); c.prec = 3` の後に `c.create_decimal('1.2345')` が `'1.23'` になること、rounding／Emax／Emin（Etiny 経由で `create_decimal('1E-40')` → `'0E-37'`）の変更が create_decimal の結果を変えること、`getcontext().prec = 7` が後続の演算に効くこと。
副次的修正（CPython 再照合で判明した G2 側の単純化を是正）：
- `applyCxFields` の信号 dict 判定：従来は「dict 形は常に KeyError」だったが、CPython は**全信号ちょうどの dict を受理**し（値は真理値解釈）、欠け・余分なキー・非信号キーの dict のみ KeyError。コンストラクタ経路にも効く是正で、G2 テストへの影響なし（同文面の期待は G2 テストに存在しない）。
- 属性代入では list／tuple 形を受け付けない（`TypeError: argument must be a signal dict`）。コンストラクタは list を受理するため、setattr フック側でのみ事前に弾く。

## 作業5：Decimal の round（タスク文との相違あり）

`DEC_CLASS` に `round` フックを実装した。**タスク文の「round(Decimal('2.5')) == Decimal('3')」は CPython 3.12.3 実走と一致しない**。実際の CPython の `Decimal.__round__` は：
- ndigits 省略／None：**偶数丸めで int を返す**（コンテキスト不使用）。`round(Decimal('2.5'))` は int の `2`、`round(Decimal('3.5'))` は `4`。NaN は `ValueError: cannot convert NaN to integer`、Infinity は `OverflowError: cannot convert Infinity to integer`。
- ndigits あり：**現在のコンテキストでの quantize と等価**（丸めモード・prec・InvalidOperation の発生条件までコンテキスト依存）。`round(Decimal('2.567'), 2)` は `Decimal('2.57')` でタスク文と一致。prec=3・ROUND_DOWN の下では `2.56` になり、`round(Decimal('12345'), -1)` は InvalidOperation になる。
実装は ndigits ありを既存 `opQuantize`（量子化先 1E−ndigits、現在のコンテキスト）へ委譲し、ndigits 省略は偶数丸めの整数化とした。ケースマトリクス＋ランダムスイープ（丸めモード×精度の組合せ含む）で全一致。

## 作業6：G6 未検証61件の再判定（変更 0件）

61件すべての caution を原文で再確認したところ、**未検証理由が kwargs／モジュール修飾形だった項目は0件**だった。全件の理由は環境依存（現在時刻の時刻源、ローカルタイムゾーン、プラットフォーム依存のクロック ID、ロケール、標準出力への表示、bytes／エンコーディング、例外値の属性保持不可、tz データベースなし、CPython に存在しない strptime）である。
あわせて代表プローブ（62プログラム）を実走し、全件が今も正直に止まる（未検証診断／「実行時に決まる」プレースホルダ／存在しない属性は AttributeError）ことを確認した。具体値を返すのは caution 自身が「決定計算できる」と明記している形のみ（固定 tz の `datetime.fromtimestamp(0, timezone.utc)` → `'1970-01-01 00:00:00+00:00'`、aware な `timestamp()` → `1704067200.0`）で、項目全体としては環境依存が残るため unverified のままが正しい。
kwargs 二重評価バグ（F-C）の修正自体はモジュール修飾形の実走で別途確認した：`datetime.timedelta(days=1)`、`datetime.datetime(2024,1,1, tzinfo=datetime.timezone.utc)`、`calendar.TextCalendar(firstweekday=6)`、`date.replace(year=2025)` 等がすべて決定計算でき、未検証診断を出さない。これらは既存の supported 項目の実行形であり、status の変更対象ではない。
**よって status の引き上げは行わない**（引き上げれば G6 テストの件数照合 193/61/5 とも不整合になる）。

## 既知の微差・残件（R5 の範囲外として報告）

1. **巨大整数の round**：`round(Decimal('1E+30'))` のような安全整数（2^53）を超える整数化は、正確な値を出さず未検証として正直に停止する（G2 の BIGDESC と同じ既存方針）。CPython は任意精度で返す。ランダムスイープ1,282件中の不一致はこの3件のみ。
2. **traps/flags への dict 項目代入**：`c.traps[InvalidOperation] = False` は CPython では実データに効くが、本実装では属性 getter が毎回新しい dict を返すため書き戻されない。属性代入（setattr フック）の範囲外の経路で、G2 の getter 設計に起因する。今回の作業では扱っていない。
3. **Fraction の float 系書式の細部**：formatGeneral（型なし書式）の 3.13+ 規則採用など、G1 の既存方針はそのまま維持した（format フックと `__format__` メソッドで結果が一致することのみ担保）。
4. **Decimal format の fill がサロゲートペア文字**の場合、JS の UTF-16 単位で解釈するため CPython とずれることがある（エンジン全体の既存制約と同種）。
5. 参考までに観測した範囲外の事象：`calendar.Calendar().prmonth` / `HTMLCalendar().prmonth` はエンジンで AttributeError（CPython には存在する）。リファレンス項目としては存在しないため R5 では扱っていない。
6. **B7-U テスト2件の失敗は既存不整合**：`tests/muse-adv-b7-u.test.js` の「ファイル別件数と総数」「backlog／uncovered との全件照合」が、R5 の変更を除いた更地（統合コミット baa76fa）でも同一内容で失敗する（名前集合で17件差）。U 統合側の件数更新漏れとみられ、R5 の変更ファイルとは無関係。

## テスト

- 新規：`tests/muse-adv-b7-r5.test.js`（7ブロック。期待値はすべて CPython 3.12.3 実走との差分照合で確認済み）
  実行：`node --test tests/muse-adv-b7-r5.test.js`
- 既存：g6／g2／g1／基盤テストは変更前 606件全合格 → 変更後も全合格。B7 全テスト（`tests/muse-adv-b7-*.test.js`、1,390件）は 1,388件合格・2件失敗（上記6の既存不整合のみ）。

## 変更ファイル

- `js/types/python/impl-advanced-datetime.js`：timedelta の unary、date/datetime/time の format フック
- `js/types/python/impl-advanced-decimal.js`：Decimal の format（新規実装一式）・round フック、Context の setattr フック、applyCxFields の信号 dict 判定是正
- `js/types/python/impl-advanced-g1.js`：Fraction の format フック、formatFloatStyle の右揃え既定・グルーピング是正
- `tests/muse-adv-b7-r5.test.js`：新規テスト
- `docs/audit/b7-r5-report.md`：本報告書
