/* 高度モード B7 G7: tomllib のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "tomllib.TOMLDecodeError",
  "category": "TOML形式",
  "syntax": "class TOMLDecodeError(ValueError)",
  "description": "TOML の解析失敗を表す例外（ValueError のサブクラス）。メッセージは「内容 (at line L, column C)」形式で、文書末尾のエラーは (at end of document) になる。",
  "example": "import tomllib\ntry:\n    tomllib.loads('a = ')\nexcept tomllib.TOMLDecodeError:\n    print('error')",
  "caution": "例外オブジェクトの属性（msg/doc/pos 等）はこの環境では保持できない（属性項目は未検証）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "例外クラス"
 },
 {
  "name": "tomllib.TOMLDecodeError.colno",
  "category": "TOML形式",
  "syntax": "TOMLDecodeError.colno",
  "description": "エラー位置の列番号。",
  "example": "e.colno",
  "caution": "例外値に属性を持たせることがこの環境ではできないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "int"
 },
 {
  "name": "tomllib.TOMLDecodeError.doc",
  "category": "TOML形式",
  "syntax": "TOMLDecodeError.doc",
  "description": "解析対象だった文字列全体。",
  "example": "e.doc",
  "caution": "例外値に属性を持たせることがこの環境ではできないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "str"
 },
 {
  "name": "tomllib.TOMLDecodeError.lineno",
  "category": "TOML形式",
  "syntax": "TOMLDecodeError.lineno",
  "description": "エラー位置の行番号。",
  "example": "e.lineno",
  "caution": "例外値に属性を持たせることがこの環境ではできないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "int"
 },
 {
  "name": "tomllib.TOMLDecodeError.msg",
  "category": "TOML形式",
  "syntax": "TOMLDecodeError.msg",
  "description": "エラーメッセージ本体。",
  "example": "e.msg",
  "caution": "例外値に属性を持たせることがこの環境ではできないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "str"
 },
 {
  "name": "tomllib.TOMLDecodeError.pos",
  "category": "TOML形式",
  "syntax": "TOMLDecodeError.pos",
  "description": "エラー位置の文字インデックス。",
  "example": "e.pos",
  "caution": "例外値に属性を持たせることがこの環境ではできないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "int"
 },
 {
  "name": "tomllib.load",
  "category": "TOML形式",
  "syntax": "load(fp, *, parse_float=float)",
  "description": "バイナリファイルから TOML を読み込む。",
  "example": "import tomllib\ntomllib.load(open('x.toml', 'rb'))",
  "caution": "バイナリファイルを前提とするため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "dict"
 },
 {
  "name": "tomllib.loads",
  "category": "TOML形式",
  "syntax": "loads(s, *, parse_float=float)",
  "description": "TOML 文字列を解析して辞書を返す。文字列・数値・真偽値・配列・テーブル・インラインテーブル・複数行文字列に対応し、不正な文法は TOMLDecodeError。",
  "example": "import tomllib\nprint(tomllib.loads('a = 1\\n[t]\\nb = \"x\"'))",
  "caution": "日時値は対応する datetime 実装が自群に無いため未確定値になる（解析の検証自体は行う）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tomllib.html",
  "returns": "dict"
 }
];
