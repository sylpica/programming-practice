# B7 追補 R3 報告書（ast/io 是正＋xml 新規項目）

作業ツリー：`~/workspace/programming-practice-audit/work/adv-b7-r3/`（自専用コピー）。
GitHub 書き込みなし。エンジン本体（engine.js 等）・advanced-manifest.js は未編集。

## 1. ast.AST の位置属性（4件：lineno／col_offset／end_lineno／end_col_offset）

**結論：supported を維持し、不足していた「代入」側の配線を是正した。**

調査結果：

- 位置情報そのものは保持されていた。ノード生成時に kwargs で与えた位置属性は
  `data.attrs` に保存され、読み取りゲッタも配線済みで、生成時指定の読み取りは
  CPython どおり返っていた（例：`Constant(value=1, lineno=3).lineno == 3`、
  Assign ノードで `1 0 1 5`）。
- 欠けていたのは**代入**側だった。エンジンはクラス定義に `setattr` が無い場合、
  属性代入を属性バッグへ保存するが、読み取りは `def.attrs` のゲッタが先に解決
  されるためバッグが見えず、`c = ast.Constant(1); c.lineno = 5; print(c.lineno)`
  が CPython（→5）と異なり AttributeError になっていた。
- 是正（`js/types/python/impl-advanced-ast.js` の `makeNodeDef`）：ノードクラス
  定義に `setattr`／`delattr`／`attrFallback` を追加。フィールドは `data.fields`、
  位置属性は `data.attrs`、その他の任意属性は `data.extra`（生成時 kwargs の
  未知属性の保存先）へ書き分け、CPython の `__dict__` 保持と同じ挙動にした。
- `ast.parse` については、parse 自体が別項目として unverified（エンジンの
  パーサは CPython の AST を公開しない）であり、parse 結果からは位置情報を
  捏造して返していない（未確定値として正直に返る）。位置属性4件の例題は
  parse を使わず手組み立てで検証されるため、supported の根拠は保たれる。
- 未設定時の読み取りは CPython どおり AttributeError（`ast.AST()` 直でも同様。
  CPython 3.12.3 実走で `ast.AST._attributes == ()` を確認）。

検証：tests/muse-adv-b7-r3.test.js に、生成時読み取り（例題4件＋Assign 形）、
代入・上書き・削除・任意属性、未設定 AttributeError、parse 未検証の維持を収載。

## 2. io の基底クラス属性（2件 → unverified）

`js/types/python/reference-advanced-io.js` の2件を supported → **unverified**
に変更し、caution に理由と「未検証」を明記した。

- `io.BufferedIOBase.raw`：値が返るのは BufferedReader 等のラッパ経由のみで、
  前提のファイルオブジェクト系が未検証のため到達不能。
- `io.TextIOBase.buffer`：値が返るのは TextIOWrapper 経由のみで、同様に到達不能。

件数への影響：io は全76件のまま。G11 全体の区分は supported 170→168、
unverified 164→166 に変わる（§5 の g11 TALLY の件を参照）。

## 3. xml.is_valid_name／xml.is_valid_text（新規2件・supported）

一次情報の取得経緯：

- 指定 URL `https://raw.githubusercontent.com/python/cpython/v3.15/Lib/xml/__init__.py`
  は 404（タグ v3.15 は存在しない）。同じ内容を **3.15 ブランチ**と main で取得：
  `Lib/xml/__init__.py` は `from .utils import *` で2関数を公開し、実装本体は
  `Lib/xml/utils.py`。main と 3.15 ブランチの utils.py はバイト一致を確認。
- 公式ドキュメント https://docs.python.org/3/library/xml.html で、3.15 追加・
  許可／禁止文字・開始文字規則・is_valid_text の禁止範囲（C0 制御文字（TAB・
  CR・LF 除く）／サロゲート／U+FFFE・U+FFFF）を確認。

新規ファイル（**コーディネーターによる manifest 登録が必要**）：

- `js/types/python/impl-advanced-xml.js`：モジュール `'xml'` に2関数を登録。
  utils.py の正規表現をそのまま移植（所有量指定子 `*+` は一致判定の結果を
  変えないため `*` に置換。JS RegExp の `u` フラグでアストラル面
  U+10000–U+EFFFF とサロゲート範囲を処理）。
  **衝突確認**：既存ファイルの `'xml'` モジュール登録は無し（`xml.dom`、
  `xml.sax`、`xml.etree.ElementTree` 等のサブモジュール登録のみ）ため衝突しない。
- `js/types/python/reference-advanced-xml.js`：2項目を正規形で収載
  （name/category/syntax/description/example/caution/status/returns/source）。

検証方法：CPython 3.15 の utils.py から採取した関数をローカル Python 3.12.3
（re の意味論は同一）で実走し、ケース表を採取して全件照合した。

- is_valid_name：通常名・許可文字（`:` `-` `.` `_` `·`（2文字目以降）`‿` `ʼ`
  ZWNJ U+200C、開始文字 U+0370／U+052F／`、`／U+F900／結合文字 U+0301／漢字）
  は True、開始文字違反（数字・`-`・`.`・`·`・`‿`）・禁止文字（`<` `/` `!`
  `?` `=` 空白・`×` `÷`）・空文字列は False、アストラル面 U+10000／U+E0001
  は True、範囲外 U+F0000 は False。
- is_valid_text：通常文字列・空文字列・TAB/CR/LF・U+007F・U+0085・絵文字は
  True、C0 制御文字（U+0000／U+0008／U+000B／U+000C／U+001F）・サロゲート
  （U+D800／U+DFFF）・U+FFFE／U+FFFF は False。
- 異常系：非文字列（int／None）・引数過不足は TypeError（CPython の
  メッセージ文面に一致）。from import でも利用可能。

以上より2件とも **supported** とした。

## 4. 区分別件数（本追補の変更分）

- 是正（状態変更なし）：ast 位置属性 4件（supported 維持、impl の配線追加）
- 状態変更：io 2件 supported → unverified
- 新規収載：xml 2件（supported、個別実装）

## 5. 検証結果

- `tests/muse-adv-b7-r3.test.js`：11件全合格。
- `tests/muse-adv-b7-g8.test.js`：79件全合格（ast 変更の影響なし）。
- `tests/muse-adv-b7-foundation.test.js`：11件全合格。
- `tests/muse-adv-b7-math.test.js`：92件全合格。
- `tests/muse-adv-b7-g11.test.js`：11件中10件合格。**唯一の失敗は構造照合の
  TALLY 深さ比較のみ**で、本追補で指示された io 2件の unverified 化による
  必然の差分（actual {supported: 168, unsupported: 157, unverified: 166} vs
  TALLY {supported: 170, unsupported: 157, unverified: 164}）。既存テストは
  共有ファイルのため本チームでは編集せず、**統合時にコーディネーター側で
  TALLY を {supported: 168, unsupported: 157, unverified: 166} へ更新**されたい。
  それ以外の g11 テスト（例題照合・ケース表）は全て合格している。

## 6. コーディネーターへの依頼・残存

- 新規ファイル2件の manifest 登録：`impl-advanced-xml.js` /
  `reference-advanced-xml.js`（モジュール名 `'xml'`）。
- g11 TALLY の更新（上記 §5）。
- 未検証の新規発生分は io の2件のみ（理由は §2）。ast／xml に未検証への
  倒しは行っていない。
