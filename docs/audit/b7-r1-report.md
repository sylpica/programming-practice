# B7 追補 R1 報告書：G4 是正（caution 正規化＋enum.Flag 単項 ~）

作業は専用コピー `adv-b7-r1` 内のみ。GitHub 書き込みなし。編集対象は G4 群の
リファレンス15ファイルと `impl-advanced-enum.js` のみで、エンジン本体
（engine.js）・advanced-manifest.js・advanced-engine.js は無変更。

## 1. caution の正規化（是正 159 件）

対象15ファイル（reference-advanced-{abc,array,bisect,collections,collections-abc,
contextlib,copy,dataclasses,enum,graphlib,heapq,pprint,reprlib,types,weakref}.js、
全329項目）で、`caution` が文字列でない（欠落）159件を機械集計で特定し是正した。
内訳：

| 是正内容 | 件数 |
|---|---|
| 注意点なし項目へ `caution: ''` を追加（supported） | 130 |
| unverified 項目へ未検証の理由文を新規追加（types の型オブジェクト群） | 27 |
| unsupported 項目へ未対応の理由文を新規追加（array.array.fromfile／tofile） | 2 |
| 合計 | 159 |

新規追加文は各項目の description に記載済みの理由のみから構成し、新しい事実は
足していない（例：types.FunctionType は「このエンジンでは関数を値から生成できない
ため未検証。」、array.array.fromfile は「このエンジンにはファイルオブジェクトが
ないため未対応。」）。他のフィールド・status は変更していない（git diff で
caution 行以外の変更が0件であることを確認）。

## 2. 未検証・未対応の文言統一（追記 47 件＋上記 2 件）

- status=unverified なのに caution に「未検証」を含まなかった74件のうち、
  caution が既に文字列だった47件（enum 31・array 4・abc 3・pprint 3・
  dataclasses 2・types 2・collections-abc 1・copy 1）に、各ファイルの既存
  標準文言（「…ため未検証。」の締め方）に倣い「この項目は未検証。」を追記した。
  残り27件は §1 の新規追加で解消。
- status=unsupported なのに「未対応」を含まなかった array.array.fromfile／
  tofile は §1 の新規追加（「…ため未対応。」）で解消。

是正後、全329項目で「caution は文字列」「unverified ⇒『未検証』を含む」
「unsupported ⇒『未対応』を含む」が成立することを新規テストで機械検証した。

## 3. enum.Flag の単項 ~ の実装

基盤の新フック `unary(ctx, self, op)` を、動的 Enum クラス定義
（createEnumClass の def）に追加した。

- 根拠（一次情報）：ローカル CPython 3.12.3 実走と CPython の enum.py 原文
  （Flag.__invert__）。STRICT/CONFORM は定義済みビット内での補集合
  （singles mask & ~v）、KEEP/EJECT（IntFlag の既定は KEEP）は cls(~v) の
  正規化で、名前なしビットも「定義済みビットと値のうち広い方の幅」内で反転する。
- 実装：共通ヘルパ `invertFlag` を新設し、def.unary の '~' と既存の
  `__invert__` メソッドの両方から使う（従来 __invert__ は allBits & ~v の
  単純式で、KEEP の名前なしビットケースでは CPython とずれていた点も合わせて是正）。
- 照合結果（CPython 実走＝エンジン実行で全件一致）：
  ~Perm.R → Perm.W|X（repr `<Perm.W|X: 6>`）、~Perm.W → Perm.R|X、
  ~(R|W) → Perm.X、~Perm(0) → Perm.R|W|X、~(R|W|X) の repr → `<Perm: 0>`、
  ~IPerm.R（IntFlag R=4,W=2,X=1）→ 3（repr `<IPerm.W|X: 3>`）、
  IntFlag A=1,B=2 で ~F(9) → 値6（repr `<F.B|4: 6>`）。
- 単項 '-' は通常の Flag では CPython でも TypeError のため追加していない
  （unary は '~' 以外 NOT_HANDLED を返し、エンジン側の TypeError に委ねる）。
  '+'・abs() も同様に TypeError を確認。通常の Enum への '~' も TypeError。
  IntFlag の '-' は従来どおり binop 委譲で整数の符号反転（-IPerm.R = -4）。

## 4. 検証

- 新規テスト `tests/muse-adv-b7-r1.test.js`（4件）全合格：
  (a) G4 対象15ファイル全329項目の caution 文字列性と状態語の一致、
  (b) ~Flag／~IntFlag の CPython 照合（期待値は CPython 3.12.3 実走で採取）、
  TypeError 系の確認。
- 既存テスト回帰なし：tests/muse-adv-b7-g4.test.js＋基盤
  （muse-adv-b7-foundation.test.js）＋math パイロット計114件全合格。
  あわせて B7 全群テスト（tests/muse-adv-b7-*.test.js、全1,387件）を実行：
  1,385件合格、2件失敗（muse-adv-b7-u.test.js の件数照合2件）。この2件は
  変更前のベースライン（git stash で本追補を退避した状態）でも同一に失敗する
  既存失敗であり、本追補による回帰ではない。

## 5. 残存

- IntEnum への単項 '~' は CPython では整数の補数（~Color.RED = -2）を返すが、
  本追補の対象は Flag 系のみのため未実装（現状はエンジン側 TypeError）。
  対応する場合はコーディネーターの裁定を仰ぐ。
- Flag の boundary=EJECT で反転結果が名前なしビットを含む場合、CPython は
  素の int を返す。現実装は flagFromValue の eject 経路（int を返す）に委ねて
  おり、幅マスク正規化との厳密な一致は未検証（関数型 API で boundary=EJECT を
  明示する用法自体が稀なため、実害は限定的と判断）。
- contextvars のリファレンスは本追補の対象15ファイルに含まれないため未変更
  （caution 欠落があれば別途 R 側の対象として切り出すこと）。
