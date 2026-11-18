# B7 G2（decimal）報告書

担当：高度モード ブロックB7・G2チーム（decimal 全163件）
一次情報：Python 公式ドキュメント 3.15（library/decimal）、CPython 3.12.3 実走（/usr/bin/python3）
作業ツリー：`adv-b7-g2`（基盤 `adv-b7` の専用コピー）。新規ファイル追加のみで、共有ファイルには触れていない。GitHub への書き込みは行っていない（ローカルコミットのみ）。

## 区分別件数（全163件）

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装 | 126 | Decimal クラス1、Decimal メソッド54、Context クラス1、Context メソッド66、モジュール関数4（getcontext／setcontext／localcontext／IEEEContext） |
| 束ね値 | 27 | data 19（定義済みコンテキスト3、ROUND_* 8、HAVE_THREADS、HAVE_CONTEXTVAR、IEEE_CONTEXT_MAX_BITS、SPEC_VERSION、MAX_PREC、MAX_EMAX、MIN_EMIN、MIN_ETINY）＋ Context 属性8（prec／rounding／Emin／Emax／capitals／clamp／flags／traps） |
| 例外対応付け | 10 | DecimalException、Clamped、DivisionByZero、FloatOperation、Inexact、InvalidOperation、Overflow、Rounded、Subnormal、Underflow |
| 未対応（unsupported） | 0 | ― |
| 未検証（unverified） | 9 | 下記「再分類」参照（個別実装3＋束ね値6。status としての区分であり、上表の区分別件数と重なる） |

status 集計：supported 154件／unverified 9件／unsupported 0件。

## 再分類（項目名と理由）

- **decimal.localcontext → unverified**：マネージャの生成・`__enter__`/`__exit__` の明示呼び出しは実装・照合済みだが、本アプリのエンジンでは with 文が `__enter__`/`__exit__` を呼ばないため、with 依存の挙動が再現できない（caution に明記）。
- **decimal.IEEEContext → unverified**：Python 3.14 追加で、検証環境の CPython 3.12.3 に存在しない。公式ドキュメントと IEEE 754 交換形式の既知値（32→prec 7／Emax 96、64→prec 16／Emax 384、128→prec 34／Emax 6144、clamp=1）で実装したが実走照合はできていない。
- **decimal.Decimal.from_number → unverified**：Python 3.14 追加で 3.12.3 に存在しない。公式ドキュメント（float／int／Decimal のみ受理）に基づいて実装したが実走照合はできていない。
- **decimal.IEEE_CONTEXT_MAX_BITS → unverified**：値は公式ドキュメント 3.15 の 512 を採用。3.12.3 には定数自体が無い。
- **decimal.SPEC_VERSION → unverified**：Python 3.15 追加。公式ドキュメントに具体値の明記がなく、値を捏造しないため UNK として登録。
- **decimal.MAX_PREC／MAX_EMAX／MIN_EMIN／MIN_ETINY → unverified**：実値（±999999999999999999、MIN_ETINY は -1999999999999999997）がエンジンの安全整数範囲を超え、正確な束ね値として保持できないため UNK として登録。
- **decimal.Decimal.to_sci_string は対象外**：バックログに無く、CPython 3.12.3 の C 実装にも存在しない（Context.to_sci_string のみ収載・実装）。
- **内部例外4件を追加登録（ref 項目外）**：ConversionSyntax、DivisionImpossible、DivisionUndefined、InvalidContext。例外メッセージ（`[<class 'decimal.ConversionSyntax'>]` 等）と except 階層（いずれも InvalidOperation のサブクラス）を CPython と一致させるために必要だった。
- backlog の current 欄の接尾辞一致誤検出（decimal.Context.abs 等）は、コーディネーターの訂正どおり全て新規項目として referenceAdvanced に収載した（referenceOverrides は不使用）。

## 照合方法と範囲

- **プログラム単位の実走照合 1,028 ケース全一致**（エンジン実行結果と CPython 3.12.3 の出力を機械比較。辞書 repr の間隔とエラー表示の種別名という基盤全体の表示形式差のみ正規化して比較）：
  - 手書きバッチ 178 件（生成・四則・quantize・sqrt／exp／ln／log10・特殊値・冪の特殊ケース・シグナル／フラグ／トラップ・例外捕捉・コンテキスト検証・localcontext 明示呼び出し・IEEEContext 等）
  - ランダムグリッド 850 件（シード固定）：四則 120、超越関数（sqrt／exp／ln／log10、引数の大きさ 10^-300〜10^300、prec 1〜60）310、1 付近の ln／log10 60、冪（整数・非整数・負の底）140、quantize＋丸め8種 60、fma／logb／normalize 40、除算・剰余・remainder_near 80、next_plus／minus／compare_total 60、exp の正負大域 40（重複分類あり）
- **F-04 照合 154 件全一致**：supported 全項目の example を CPython 実走の期待出力（テスト側ケース表）と照合。
- **自群テスト 413 件全通過**（`node --test tests/muse-adv-b7-g2.test.js`）。基盤・math の既存テスト 99 件も全通過（回帰なし）。
- 照合過程で発見・修正した主な欠陥：モジュール関数の登録形式（素の関数が契約）、例外 def の `exc` は種別名文字列、roundDrop の全桁落ち分岐で ROUND_DOWN が HALF 系に落ちる、sqrt の負のガード桁、logb 結果へのコンテキスト適用、normalize の「丸め→末尾ゼロ除去」の順序、剰余・remainder_near 結果への精度適用、next_plus/minus の借り規則（prec=3 で 1.00 の前任は 0.999）、log10 のスケール計算、float→Decimal 変換の既約化（末尾ゼロ）、Context repr のシグナル表示順（libmpdec 順）と flags 辞書のキー順（_pydecimal 順）の分離、UNK 値を Decimal で二重に包む不具合。

## 既知の微差

- **hash の跨型整合は再現不能**：基盤の dictKeyId がネイティブ hash に接頭辞を付けるため、`Decimal('1.0')` と `1.0` の辞書キーは一致しない（CPython では一致）。Decimal 同士では正準形（符号・正規化係数・指数）で一貫させた。加えて組み込み `hash()` 自体がネイティブに dispatch されない。
- **sNaN の等価比較**：eq フックが静的 ctx のためシグナルを送出できず False を返す（順序比較では InvalidOperation を送出可能）。CPython では等価比較でも sNaN はシグナルする。
- **属性代入が効かない**：`getcontext().prec = 5` や `ctx.traps[X] = False` は基盤仕様で無言に捨てられる。変更はコンストラクタ引数・clear_flags／clear_traps・setcontext 経由のみ（ref の caution に明記）。
- **単項演算子と組み込み変換**：`-Decimal('1')`、`abs()`、`int()`、`float()`、`round()`、組み込み `divmod()` はネイティブに dispatch されず再現できない（Context.divmod メソッドは動作する）。
- **巨大な指数**：|指数| が安全整数範囲を超える Decimal は生成時点で UNK になる。exp は引数の絶対値が概算 3,000,000 を超えると diag 付きで UNK に倒す（それ以下はグリッド照合済み）。
- **実行単位の状態**：現在のコンテキストと定義済みコンテキストの flags は simulate 呼び出しを跨いで残る（基盤に初期化フックが無い）。テストでは各プログラム冒頭の `setcontext(Context())` で初期化している。
- **同一性（is）**：`setcontext(c)` 後に `c is getcontext()` が CPython では True になるが、基盤はネイティブ値の同一性を追跡しないため「実行時に決まる値」になる。
- **issubclass 組み込み**がネイティブクラスに未対応のため、例外階層は except での捕捉（親クラス・多重継承先での捕捉を含む）によって検証した。

## 基盤要請

1. ネイティブ値への属性代入（setattr）フック：Context の属性変更と traps／flags 辞書の要素代入を再現するために必要。
2. 単項演算子（+／-）のネイティブ dispatch：Decimal の単項マイナス・プラスが現在は書けない。
3. 組み込み関数 `int()`／`float()`／`abs()`／`round()`／`divmod()`／`hash()` のネイティブ dispatch（__int__／__float__／__abs__／__round__／__hash__ 相当）。
4. with 文での `__enter__`／`__exit__` 呼び出し：実現すれば localcontext を supported にできる。
5. simulate 実行単位でのモジュール状態初期化フック（現在のコンテキストのリセット等）。
6. dictKeyId の数値タワー整合（int／float／Decimal の混在キー）。
7. `issubclass` のネイティブクラス対応と、クラス値の `__name__` 属性。

## 残存

- 担当範囲（decimal 163 件）の実装・リファレンス・テスト・照合は完了。残存作業なし。
- 任意の積み残しとして、基盤要請 4 が実現した場合の localcontext の supported 化と、基盤要請 6 が実現した場合の hash 跨型整合の再検証がある（いずれも基盤側の対応が前提のため、本チームでは実施しない）。

## 作成ファイル

- `js/types/python/impl-advanced-decimal.js`（意味論実装：Decimal／Context／例外／モジュール関数・データの登録）
- `js/types/python/reference-advanced-decimal.js`（リファレンス正規形 163 件：referenceAdvanced、referenceOverrides は空）
- `tests/muse-adv-b7-g2.test.js`（413 件：ケース 258＋F-04 154＋完全性 1）
- `docs/audit/b7-g2-report.md`（本報告書）
