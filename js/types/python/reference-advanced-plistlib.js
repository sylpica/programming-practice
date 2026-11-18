/* 高度モード B7 G7: plistlib のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "plistlib.FMT_BINARY",
  "category": "プロパティリスト",
  "syntax": "FMT_BINARY",
  "description": "バイナリ形式を表す列挙値。整数 2 とは等しくならない。",
  "example": "import plistlib\nprint(plistlib.FMT_BINARY == 2)",
  "caution": "この形式での dumps/loads 自体は未検証。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "PlistFormat"
 },
 {
  "name": "plistlib.FMT_XML",
  "category": "プロパティリスト",
  "syntax": "FMT_XML",
  "description": "XML 形式を表す列挙値。通常の Enum で、整数 1 とは等しくならない（FMT_XML == 1 は False）。",
  "example": "import plistlib\nprint(plistlib.FMT_XML == 1)",
  "caution": "dumps の fmt に整数を渡すと ValueError（Unsupported format）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "PlistFormat"
 },
 {
  "name": "plistlib.InvalidFileException",
  "category": "プロパティリスト",
  "syntax": "class InvalidFileException(ValueError)",
  "description": "plist として不正な入力の場合の例外（ValueError のサブクラス）。",
  "example": "import plistlib\ntry:\n    plistlib.loads(plistlib.dumps({'a': 1})[:10])\nexcept plistlib.InvalidFileException:\n    print('error')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "例外クラス"
 },
 {
  "name": "plistlib.UID",
  "category": "プロパティリスト",
  "syntax": "class UID(data)",
  "description": "バイナリ plist の UID 参照を表すクラス。.data に整数を持ち、repr は 'UID(n)'。",
  "example": "import plistlib\nprint(plistlib.UID(5))",
  "caution": "XML 形式の dumps では扱えない（TypeError）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "クラス"
 },
 {
  "name": "plistlib.UID.data",
  "category": "プロパティリスト",
  "syntax": "UID.data",
  "description": "UID の整数値。",
  "example": "import plistlib\nprint(plistlib.UID(5).data)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "int"
 },
 {
  "name": "plistlib.dump",
  "category": "プロパティリスト",
  "syntax": "dump(value, file, *, fmt=FMT_XML, skipkeys=False, sort_keys=True)",
  "description": "プロパティリストをファイルへ書き出す。",
  "example": "import plistlib\nplistlib.dump({}, open('x.plist', 'wb'))",
  "caution": "ファイルを前提とするため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "None"
 },
 {
  "name": "plistlib.dumps",
  "category": "プロパティリスト",
  "syntax": "dumps(value, *, fmt=FMT_XML, skipkeys=False, sort_keys=True)",
  "description": "オブジェクトをプロパティリスト形式の bytes に変換する。XML 形式に対応する。",
  "example": "import plistlib\nprint(plistlib.dumps({'k': 'v'}).decode('utf-8'))",
  "caution": "バイナリ形式（FMT_BINARY）での生成は未検証。UID は XML 形式では TypeError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "bytes"
 },
 {
  "name": "plistlib.load",
  "category": "プロパティリスト",
  "syntax": "load(fp, *, fmt=None, dict_type=dict)",
  "description": "ファイルからプロパティリストを読み込む。",
  "example": "import plistlib\nplistlib.load(open('x.plist', 'rb'))",
  "caution": "ファイルを前提とするため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "オブジェクト"
 },
 {
  "name": "plistlib.loads",
  "category": "プロパティリスト",
  "syntax": "loads(data, *, fmt=None, dict_type=dict)",
  "description": "プロパティリスト（XML 形式）を解析してオブジェクトを返す。data は bytes。",
  "example": "import plistlib\nprint(plistlib.loads(plistlib.dumps({'a': 1})))",
  "caution": "バイナリ形式（bplist00）の解析は未検証で、日付値は未確定値になる。入力は bytes（dumps の戻り値等）を使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/plistlib.html",
  "returns": "オブジェクト"
 }
];
