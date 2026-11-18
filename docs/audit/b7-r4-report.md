# B7 追補 R4 報告書（G13 等価性・G1b ABC 是正）

担当：追補チーム R4。作業ツリー `adv-b7-r4` のみで作業し、GitHub 書き込みは
していない（ローカルコミットのみ）。エンジン本体・manifest は未編集。

## 最重要：タスク前提2件が CPython 3.12.3 実走で否定された（前提訂正）

規約 §4（値は CPython と一致させる。一次情報は CPython 実走）に従い、
着手前に前提を実走検証したところ、タスク文の前提2件が誤りだったため、
誤った前提どおりの実装は行わず、CPython の実挙動に合わせて是正した。
コーディネーターの裁定を仰ぎたい事項として明記する。

### 訂正1：IPv4Interface == IPv4Address は CPython では **False**

- 実走（3.12.3）：`IPv4Interface('192.168.0.1/24') == IPv4Address('192.168.0.1')`
は両方向とも False。`hash` も一致しない（集合で2要素、辞書引きは miss）。
- 一次情報：CPython の `IPv4Interface.__eq__`／`IPv6Interface.__eq__` は
アドレス部分が等しくても `self.network == other.network` を要求し、
Address には network が無いため False を返す。ソースのコメントに
「An interface with an associated network is NOT the same as an
unassociated address. That's why the hash takes the extra info into
account.」と明記されている。
- したがって「Interface 側 eq が false を返すのが原因で、null にすれば
True になる」という前提は成立しない。現行エンジンも既に False を返して
おり、結果自体は CPython と一致していた。

### 訂正2：Decimal は numbers.Number に **登録されている**

- 実走（3.12.3）：`isinstance(Decimal('1'), numbers.Number)` は **True**。
Complex／Real／Rational／Integral はすべて False。
- 一次情報：`_pydecimal.py` 3862行目 `_numbers.Number.register(Decimal)`。
numbers.py と _pydecimal.py のコメントは「Decimal を Real として登録
しない」ことを明示しているのであって、Number への登録は実在する。
- したがって「接続しない（False が正しい）」という前提は Number について
誤り。Number にだけ接続するのが CPython どおり。

## 実施した変更

### 1. ipaddress（impl-advanced-ipaddress.js）— 結果不変の null 委ね化

- Address／Interface の `eq` と Network の `eq` で、異種型（限定名が異なる
相手・非ネイティブ値）に対して `false` で確定させず `null`
（NotImplemented 相当）を返し、基盤の反射（相手側 eq）に委ねる形へ変更。
- 両側が null の場合は基盤が False に確定させるため、検証マトリクスの
全結果は変更前・CPython ともに一致する（Interface⇔Address 両方向 False、
Interface 同士は ip＋ネットワーク一致時のみ True、hash 不一致に伴う
集合2要素・辞書 miss も一致）。同クラス同士の比較ロジックは無変更。
- 検証マトリクス（v4／v6）：A==I／I==A／I==I（同一・prefix 違い・ip 違い）／
A==A／!=／異バージョン／対 int・str・None・Network／集合・辞書のキー
挙動／isinstance の継承（Interface は Address のサブクラス＝True は維持）
を CPython 実走と全件照合済み（tests/muse-adv-b7-r4.test.js）。

### 2. numbers ABC（impl-advanced-g1.js）— builtinTypes 宣言

変更前は `isinstance(3, numbers.Integral)` 等が全て False になる実欠陥が
あった。基盤（engine.js の isinstance）が対象 ABC の `builtinTypes` を
直接見る仕様のため、CPython の登録関係を各 ABC に直接列挙した：

- Number／Complex／Real：`['int', 'float', 'bool']`
- Rational／Integral：`['int', 'bool']`

根拠：numbers.py の明示登録は Complex.register(complex)／
Real.register(float)／Integral.register(int) で、bool は int のサブクラス。
基盤が親 ABC を辿らないため、到達可能性を各 ABC に展開してある。

### 3. Fraction の parents（impl-advanced-g1.js）— 既存設定を検証（変更なし）

- FractionDef には既に `parents: ['numbers.Rational']` が設定されており、
基盤が Rational→Real→Complex→Number と推移的に辿るため、行列
（Number／Complex／Real／Rational＝True、Integral＝False）が CPython と
一致することを確認した。追加変更は不要だった。

### 4. Decimal の接続（impl-advanced-decimal.js）— parents 追加

- DEC_CLASS に `parents: ['numbers.Number']` を追加（Number のみ。他の
ABC へは接続しない）。これにより isinstance 行列が CPython と一致する。
- 対象ファイルは本来 G2 の担当ファイルだが、R4 の検証範囲（numbers 行列の
全件照合）に Decimal が含まれるため本ツリーで是正した。統合時に G2 側の
変更と衝突する場合は本変更を優先されたい（根拠は訂正2）。

## 検証（すべてローカル実行）

- CPython 3.12.3 実走：ipaddress 等価性マトリクス全件、numbers isinstance
行列（3／True／1.5／Fraction(1,2)／Decimal('1') × 5 ABC）を確定。
numbers 行列はテスト内でも CPython を子プロセス実行して機械照合する。
- 新規テスト `tests/muse-adv-b7-r4.test.js`：24件全合格。
- 既存テスト：g13＋g1＋foundation＋g2（decimal）＝571件全合格。
B7 全体（muse-adv-b7-*.test.js）＝1407件中1405合格。残り2件
（muse-adv-b7-u.test.js のカタログ件数照合）は変更前のクリーンツリー
でも同一に失敗する既存不整合で、本是正とは無関係（stash で切り分け済み）。

## 残存・裁定を仰ぐ事項

- 前提訂正2件（Interface⇔Address は False が正、Decimal は Number に接続
が正）について、タスク文との相違をコーディネーターに確認されたい。
本報告書の実装は CPython 3.12.3 実走＋CPython ソースを根拠にしている。
- タスク文が挙げたファイル名 impl-advanced-numbers.js／
impl-advanced-fractions.js は本ツリーに存在せず、実体は
impl-advanced-g1.js（cmath／fractions／numbers を同居）にあったため、
そちらを編集した。
- hash() 組み込み自体はエンジン未対応のため、hash の整合は集合・辞書の
キー挙動で照合した（CPython の hash 数値そのものの再現は対象外）。
