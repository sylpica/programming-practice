/* 高度モード B7 G7: base64 のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "base64.a85decode",
  "category": "Base64変換",
  "syntax": "a85decode(b, *, foldspaces=False, adobe=False, ignore_chars=' \\t\\n\\r\\v')",
  "description": "Ascii85 をデコードする。'z' はゼロ4バイト、adobe=True で <~ ~> の囲みを処理する。",
  "example": "import base64\nprint(base64.a85decode(base64.a85encode('hello')))",
  "caution": "末尾の1文字だけの端数グループは黙って捨てられる（CPython の挙動どおり）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.a85encode",
  "category": "Base64変換",
  "syntax": "a85encode(b, *, foldspaces=False, wrapcol=0, pad=False, adobe=False)",
  "description": "Ascii85 でエンコードする。foldspaces で4連続ゼロを 'z' に、adobe で <~ ~> で囲む。",
  "example": "import base64\nprint(base64.a85encode('hello'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b16decode",
  "category": "Base64変換",
  "syntax": "b16decode(s, casefold=False)",
  "description": "16進数文字列をデコードする。casefold=False では大文字のみ。",
  "example": "import base64\nprint(base64.b16decode('666F6F'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b16encode",
  "category": "Base64変換",
  "syntax": "b16encode(s)",
  "description": "バイト列を16進数（大文字）でエンコードする。hexlify と同じ。",
  "example": "import base64\nprint(base64.b16encode('foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b32decode",
  "category": "Base64変換",
  "syntax": "b32decode(s, casefold=False, map01=None)",
  "description": "Base32 をデコードする。casefold=True で小文字を許容し、map01 で 0/1 の読み替え文字を指定する。",
  "example": "import base64\nprint(base64.b32decode('MZXW6==='))",
  "caution": "map01 を指定すると文字 0 は map01 の文字へ、1 は L へ置き換えられる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b32encode",
  "category": "Base64変換",
  "syntax": "b32encode(s)",
  "description": "バイト列を Base32（RFC 4648、大文字 alphabet）でエンコードする。",
  "example": "import base64\nprint(base64.b32encode('foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b32hexdecode",
  "category": "Base64変換",
  "syntax": "b32hexdecode(s, casefold=False)",
  "description": "拡張16進 alphabet の Base32 をデコードする。",
  "example": "import base64\nprint(base64.b32hexdecode('CPNMU==='))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b32hexencode",
  "category": "Base64変換",
  "syntax": "b32hexencode(s)",
  "description": "拡張16進 alphabet（0-9A-V）の Base32 でエンコードする。",
  "example": "import base64\nprint(base64.b32hexencode('foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b64decode",
  "category": "Base64変換",
  "syntax": "b64decode(s, altchars=None, validate=False)",
  "description": "Base64 文字列をデコードする。validate=False では alphabet 外の文字を除去してから解釈する。",
  "example": "import base64\nprint(base64.b64decode('aGVsbG8='))",
  "caution": "データ文字数が 4 の倍数 +1 の場合は binascii.Error。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b64encode",
  "category": "Base64変換",
  "syntax": "b64encode(s, altchars=None)",
  "description": "バイト列を標準 Base64 でエンコードする。この環境では入力に ASCII 文字列も使える（生成された bytes は内部表現で返る）。",
  "example": "import base64\nprint(base64.b64encode('hello'))",
  "caution": "入力の bytes リテラル（b'...'）はこの環境では未確定値になるため、文字列入力か他関数の戻り値を使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b85decode",
  "category": "Base64変換",
  "syntax": "b85decode(b)",
  "description": "Base85 をデコードする。",
  "example": "import base64\nprint(base64.b85decode(base64.b85encode('hello')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.b85encode",
  "category": "Base64変換",
  "syntax": "b85encode(b, pad=False)",
  "description": "Base85（git 方式の alphabet）でエンコードする。pad=True で末尾を = で埋める。",
  "example": "import base64\nprint(base64.b85encode('hello'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.decode",
  "category": "Base64変換",
  "syntax": "decode(input, output)",
  "description": "入力ファイルの Base64 をデコードして出力ファイルへ書き出す。",
  "example": "import base64\nbase64.decode(infile, outfile)",
  "caution": "ファイルオブジェクトを前提とするため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "None"
 },
 {
  "name": "base64.decodebytes",
  "category": "Base64変換",
  "syntax": "decodebytes(s)",
  "description": "改行を含む Base64 をデコードする。",
  "example": "import base64\nprint(base64.decodebytes(base64.encodebytes('hello')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.encode",
  "category": "Base64変換",
  "syntax": "encode(input, output)",
  "description": "入力ファイルから読み取って Base64 で出力ファイルへ書き出す。",
  "example": "import base64\nbase64.encode(infile, outfile)",
  "caution": "ファイルオブジェクトを前提とするため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "None"
 },
 {
  "name": "base64.encodebytes",
  "category": "Base64変換",
  "syntax": "encodebytes(s)",
  "description": "バイト列を Base64 でエンコードし、76文字ごとに改行を入れる（MIME 形式）。",
  "example": "import base64\nprint(base64.encodebytes('hello world hello world'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.standard_b64decode",
  "category": "Base64変換",
  "syntax": "standard_b64decode(s)",
  "description": "標準 alphabet で Base64 デコードする。",
  "example": "import base64\nprint(base64.standard_b64decode('aGVsbG8='))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.standard_b64encode",
  "category": "Base64変換",
  "syntax": "standard_b64encode(s)",
  "description": "標準 alphabet（+ と /）で Base64 エンコードする。b64encode と同じ。",
  "example": "import base64\nprint(base64.standard_b64encode('hello'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.urlsafe_b64decode",
  "category": "Base64変換",
  "syntax": "urlsafe_b64decode(s)",
  "description": "URL 安全な alphabet で Base64 デコードする。",
  "example": "import base64\nprint(base64.urlsafe_b64decode('aGVsbG8_'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.urlsafe_b64encode",
  "category": "Base64変換",
  "syntax": "urlsafe_b64encode(s)",
  "description": "URL 安全な alphabet（- と _）で Base64 エンコードする。",
  "example": "import base64\nprint(base64.urlsafe_b64encode('hello?'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.z85decode",
  "category": "Base64変換",
  "syntax": "z85decode(b)",
  "description": "Z85 をデコードする。入力長は5の倍数でなければならない。3.15 で追加された関数。",
  "example": "import base64\nprint(base64.z85decode('HelloWorld'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 },
 {
  "name": "base64.z85encode",
  "category": "Base64変換",
  "syntax": "z85encode(b)",
  "description": "Z85（ZeroMQ）でエンコードする。入力長は4の倍数でなければならない。3.15 で追加された関数。",
  "example": "import base64\nprint(base64.z85encode(base64.b16decode('864FD26FB559F75B')))",
  "caution": "長さが4の倍数でない入力は ValueError。仕様のテストベクタ（HelloWorld）で照合済み。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/base64.html",
  "returns": "bytes"
 }
];
