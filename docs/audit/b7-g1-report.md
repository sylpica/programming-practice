# B7 G1（数理・統計系）報告書

対象：cmath 30件／fractions 13件／numbers 10件／statistics 35件／random 32件（計120件）
作業ツリー：`work/adv-b7-g1b`（基盤コピー HEAD de93ea9＝契約適合済みの上に構築。前任ツリー adv-b7-g1 は HEAD 8d34a66 の契約適合前コピーだったため、基盤は使わず impl 草案2ファイルのみを移植した）

## 区分別件数（F-16）

| 区分 | 件数 | 内訳 |
|---|---|---|
| 個別実装（supported） | 80 | fractions 12、numbers 5（クラス）、statistics 34（NormalDist 本体＋13サブ項目＋関数19）、random 29 |
| 束ね値（supported） | 5 | cmath.pi／e／tau／inf／nan（実数定数） |
| 例外対応付け | 1 | statistics.StatisticsError（excParents: ValueError。捕捉・親クラス捕捉をテストで確認） |
| 未対応（unsupported） | 25 | cmath の関数23＋複素数定数 infj／nanj（エンジンに複素数値型なし） |
| 未検証（unverified） | 9 | fractions.Fraction.from_decimal、numbers の抽象 property／メソッド5件（Complex.conjugate／imag／real、Rational.numerator／denominator）、random.randbytes、random.Random.randbytes、random.SystemRandom |
| 合計 | 120 | supported 86／unsupported 25／unverified 9 |

再分類：バックログの candidate は全件「実装」だったが、上記のとおり cmath 25件を未対応、9件を未検証に再分類した（理由は区分欄のとおり。いずれも「忠実に表現できないものを捏造しない」原則による）。

## 前任草案の検証結果

対象：impl-advanced-g1.js（615行）、impl-advanced-g1-random.js（818行）。全関数・全クラスを CPython 3.12.3 実走と突合した（照合ケース延べ約200件）。

- **採用（検証合格）**：fractions.Fraction の全体（BigInt 有理数演算、from_float、limit_denominator、__format__ の厳密10進書式、hash の数値タワー整合、比較・演算子）、numbers の抽象クラス群（抽象インスタンス化の TypeError 文面まで一致）、cmath の「定数のみ束ね値・関数は diag＋未確定値で正直に停止」の方針（勝手な複素数表現の発明は無かった）、random の MT19937＋init_by_array＋genrand_res53 の構成、SHA-512 自前実装（文字列シード version 2）、gauss の内部保持、getstate／setstate、分布関数の各アルゴリズム。
- **修正して採用（1件、重大）**：MT の初期化での 32bit 乗算の精度落ち。`1812433253 * (prev ^ ...)` 等を JS の通常乗算で計算していたため 2^53 を超えて精度が落ち、**seed(42) の random() 列すら CPython と一致していなかった**（エンジン 0.4985177668524141 vs CPython 0.6394267984578837）。乗算を Math.imul 化し、float シードの符号処理（hash 値を符号なし64bit化していたのを、CPython どおり hash 値そのものを int シードとして渡す形）も修正。以後、seed(int／負数／2^40／float／str version1・2)、random／getrandbits／randint／randrange／choice／choices／shuffle／sample／uniform／triangular／gauss／normalvariate／expovariate／gammavariate／betavariate／paretovariate／weibullvariate／lognormvariate／binomialvariate／vonmisesvariate の列が CPython と一致することを確認した。
- **却下**：なし（草案の構成・方針は妥当で、上記修正で全て検証合格になった）。
- statistics は前任未着手のため新規実装（impl-advanced-statistics.js）。

## 照合方法と範囲

- CPython 実走照合（/usr/bin/python3、3.12.3）：自作ハーネスで同一プログラムをエンジンと CPython の双方で実行し、標準出力と例外種別を機械比較した。fractions／numbers／random／statistics で延べ約200ケース＋リファレンス対応例題86件全件（F-04）。
- statistics の float 入力は、CPython の _sum／_ss と同様に厳密な二進有理数として BigInt 蓄積し、stdev／pstdev の平方根は CPython の _float_sqrt_of_frac（正しく丸めた平方根）を移植した。mean([1e50, 1, -1e50]) = 0.3333333333333333 のような桁落ちケースでも一致する。
- kde／kde_random（Python 3.13 追加でローカル 3.12 に無い）：CPython 公式リポジトリの 3.13 版 Lib/statistics.py を一次情報として移植し、公式ドキュメント／docstring の例で照合した（kde の密度表17点が小数3桁で全点一致、cdf の丸め 0.22、kde_random の seed=8675309 の10個の丸め列 [0.7, 6.2, 1.2, 6.9, 7.0, 1.8, 2.5, -0.5, -1.8, 5.6] が完全一致）。
- Fraction.from_number（Python 3.14 追加）：公式ドキュメント 3.15 の受け入れ規則に基づき実装。ローカル実走は不可のため、エンジン内での int／float／Fraction 入力の動作のみ確認した。
- NormalDist.inv_cdf は Wichura AS241 を CPython ソースから移植（照合中に係数2件の転記ミスを発見・修正し、以後 CPython と完全一致）。

## 既知の微差

- random.betavariate／random.vonmisesvariate：超越関数（log／acos 等）の JS Math と CPython（libm）の差で、最終桁が 1ulp ずれる場合がある（実測：seed 5 の betavariate(2, 5) で末尾1桁差）。列そのもの（乱数消費）は一致している。
- statistics.NormalDist.cdf／overlap：erf を不完全ガンマ関数の級数・連分数で近似しているため、CPython（libm の erf）と最終桁が 1ulp ずれる場合がある（実測：overlap で 0.8035050657330205 に対し末尾1桁差）。例題は丸め表示で回避し、caution に明記した。

## 基盤要請（共有ファイルには触っていない）

1. **複素数値型の追加**：cmath 全面対応には、エンジンに複素数値型（複素数リテラル 1j の解釈を含む）が必須。現状は cmath 関数23件＋定数2件が未対応。
2. **組み込み関数のネイティブ型への委譲**：hash()（未対応）、round()／float()／format() が Fraction の __round__／__float__ 相当／__format__ に委譲されず、math.floor／math.ceil も Fraction を受け付けない（ctx.num がネイティブ値を数値化しない）。Fraction 側のメソッド実装は検証済みなので、委譲が入ればそのまま一致する。現状はリファレンスの caution にメソッド経由の使い方を明記した。
3. **単項マイナス等のネイティブ委譲**：-Fraction のような単項演算がネイティブクラスに届かない（クラス定義に neg フック自体が無い）。
4. **isinstance の組み込み型→ABC 登録**：isinstance(3, numbers.Integral)／isinstance(3.5, numbers.Real) が False になる（組み込み型が numbers の ABC に登録されていないため）。Fraction 等のネイティブ側の parents 照合は正常。
5. **issubclass／type(x).__name__**：issubclass は未対応、ネイティブクラスの __name__ 属性が無い。
6. **大きな整数リテラル**：安全整数範囲を超えるリテラル（例 36028797018963968）が未確定値になるため、Fraction(0.1) の厳密値のような大きな分子・分母をリテラルで書く照合ができない（from_float 経由では正確に扱える）。
7. 統合時作業（コーディネーター）：advanced-engine.js への import 追加（impl-advanced-g1.js、impl-advanced-g1-random.js、impl-advanced-statistics.js）と、advanced-manifest.js の referenceParts への5ファイル追加をお願いする。

## 残存

- fractions.Fraction.from_decimal：Decimal 本体（他群）の実装が無いため Decimal 入力は未検証。Decimal 実装の data 形式が確定すれば連携可能。
- numbers の抽象 property 5件：property オブジェクト自体を値として返せないため未検証（具象クラス Fraction での値は対応済み）。
- random.randbytes／Random.randbytes：bytes 型が無いため値は未検証（乱数列の消費手順は再現済み）。seed の bytes 版も同じ理由で値は確定しない。
- random.SystemRandom：OS 乱数源のため未検証（getstate／setstate の NotImplementedError は再現済み）。
- statistics の Decimal 入力：未検証（diag＋未確定値で正直に停止する）。有限でない値（inf／nan）を含む分散系も未検証に倒している（mean 等の単純な経路は float として処理）。
- statistics.quantiles の1点データ：CPython 3.12 の挙動（StatisticsError）に合わせた。3.13 以降は「data の複製を返す」変更があるため、対象バージョンの裁定があれば追随する。
- NormalDist の単項マイナス・+x（__neg__／__pos__）はクラス定義にフックが無いため未実装（binop の +,-,*,/ と reflected は実装済み）。

## 作成ファイル

- js/types/python/impl-advanced-g1.js（cmath／fractions／numbers、前任草案を検証のうえ移植）
- js/types/python/impl-advanced-g1-random.js（random、前任草案＋MT 乗算の修正）
- js/types/python/impl-advanced-statistics.js（statistics、新規）
- js/types/python/reference-advanced-cmath.js（30件）
- js/types/python/reference-advanced-fractions.js（13件）
- js/types/python/reference-advanced-numbers.js（10件）
- js/types/python/reference-advanced-random.js（32件）
- js/types/python/reference-advanced-statistics.js（35件）
- tests/muse-adv-b7-g1.test.js（40テスト、全合格。基盤・math の既存テスト99件も回帰なし）
- docs/audit/b7-g1-report.md（本報告書）
