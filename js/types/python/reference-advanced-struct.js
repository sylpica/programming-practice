/* 高度モード B7 G7: struct のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "struct.Struct",
  "category": "バイナリ構造",
  "syntax": "class Struct(format)",
  "description": "書式を事前に解釈したクラス。.format と .size を持ち、pack/unpack 等のメソッドで再利用する。",
  "example": "import struct\ns = struct.Struct('>h')\nprint(s.size, s.pack(258))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "クラス"
 },
 {
  "name": "struct.Struct.format",
  "category": "バイナリ構造",
  "syntax": "Struct.format",
  "description": "コンストラクタに渡した書式文字列。",
  "example": "import struct\nprint(struct.Struct('>h').format)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "str"
 },
 {
  "name": "struct.Struct.iter_unpack",
  "category": "バイナリ構造",
  "syntax": "Struct.iter_unpack(buffer)",
  "description": "この書式でバッファを繰り返し展開するイテレータ。",
  "example": "import struct\nprint(list(struct.Struct('>h').iter_unpack(struct.pack('>hh', 1, 2))))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "イテレータ（tuple）"
 },
 {
  "name": "struct.Struct.pack",
  "category": "バイナリ構造",
  "syntax": "Struct.pack(*values)",
  "description": "この書式で値をバイト列に詰める。",
  "example": "import struct\nprint(struct.Struct('>h').pack(258))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "bytes"
 },
 {
  "name": "struct.Struct.pack_into",
  "category": "バイナリ構造",
  "syntax": "Struct.pack_into(buffer, offset, *values)",
  "description": "書き込み可能バッファへ詰める。",
  "example": "import struct\nstruct.Struct('>h').pack_into(buf, 0, 1)",
  "caution": "書き込み可能なバイト列バッファをこの環境で表せないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "None"
 },
 {
  "name": "struct.Struct.size",
  "category": "バイナリ構造",
  "syntax": "Struct.size",
  "description": "書式が表すバイト数（calcsize と同じ）。",
  "example": "import struct\nprint(struct.Struct('>h').size)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "int"
 },
 {
  "name": "struct.Struct.unpack",
  "category": "バイナリ構造",
  "syntax": "Struct.unpack(buffer)",
  "description": "この書式でバイト列を展開する。",
  "example": "import struct\nprint(struct.Struct('>h').unpack(struct.pack('>h', 258)))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "tuple"
 },
 {
  "name": "struct.Struct.unpack_from",
  "category": "バイナリ構造",
  "syntax": "Struct.unpack_from(buffer, offset=0)",
  "description": "この書式で offset 位置から展開する。",
  "example": "import struct\nprint(struct.Struct('>h').unpack_from(struct.pack('>hh', 1, 2), 2))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "tuple"
 },
 {
  "name": "struct.calcsize",
  "category": "バイナリ構造",
  "syntax": "calcsize(format)",
  "description": "書式が表すバイト数を返す。'@' ではネイティブのアライメントが入る。",
  "example": "import struct\nprint(struct.calcsize('@bh'), struct.calcsize('<lh'))",
  "caution": "標準モード（=<>!）では l/L は4バイトで、n/N/P は使えない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "int"
 },
 {
  "name": "struct.error",
  "category": "バイナリ構造",
  "syntax": "class error(Exception)",
  "description": "struct のエラーを表す例外。不正な書式や値の範囲外で送出される。",
  "example": "import struct\ntry:\n    struct.pack('>b', 1000)\nexcept struct.error:\n    print('error')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "例外クラス"
 },
 {
  "name": "struct.iter_unpack",
  "category": "バイナリ構造",
  "syntax": "iter_unpack(format, buffer)",
  "description": "バッファを書式サイズずつに区切ってタプルを順に返すイテレータ。長さは書式サイズの倍数でなければならない。",
  "example": "import struct\nprint(list(struct.iter_unpack('>h', struct.pack('>hh', 1, 2))))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "イテレータ（tuple）"
 },
 {
  "name": "struct.pack",
  "category": "バイナリ構造",
  "syntax": "pack(format, *values)",
  "description": "書式文字列に従って値をバイト列に詰める。書式文字（bBhHiIlLqQefdsP等）とエンディアン指定（@=< >!）の規則は CPython どおり。",
  "example": "import struct\nprint(struct.pack('>h', 258))",
  "caution": "文字列を 's' に渡すと struct.error。生成される bytes は内部表現で返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "bytes"
 },
 {
  "name": "struct.pack_into",
  "category": "バイナリ構造",
  "syntax": "pack_into(format, buffer, offset, *values)",
  "description": "書き込み可能バッファの offset 位置へ値を詰める。",
  "example": "import struct\nstruct.pack_into('>h', buf, 0, 1)",
  "caution": "書き込み可能なバイト列バッファ（bytearray 等）をこの環境で表せないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "None"
 },
 {
  "name": "struct.unpack",
  "category": "バイナリ構造",
  "syntax": "unpack(format, buffer)",
  "description": "バイト列を書式に従って値のタプルに展開する。バッファの長さは calcsize と一致しなければならない。",
  "example": "import struct\nprint(struct.unpack('>h', struct.pack('>h', 258)))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "tuple"
 },
 {
  "name": "struct.unpack_from",
  "category": "バイナリ構造",
  "syntax": "unpack_from(format, buffer, offset=0)",
  "description": "バッファの offset 位置から書式に従って値を取り出す。",
  "example": "import struct\nprint(struct.unpack_from('>h', struct.pack('>hh', 1, 2), 2))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/struct.html",
  "returns": "tuple"
 }
];
