/* 高度モード B7 G7: quopri のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "quopri.decode",
  "category": "Quoted-Printable",
  "syntax": "decode(input, output, header=False)",
  "description": "入力ファイルの quoted-printable をデコードして出力ファイルへ書く。",
  "example": "import quopri\nquopri.decode(infile, outfile)",
  "caution": "ファイルオブジェクトを前提とするため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/quopri.html",
  "returns": "None"
 },
 {
  "name": "quopri.decodestring",
  "category": "Quoted-Printable",
  "syntax": "decodestring(input, header=False)",
  "description": "quoted-printable をデコードする。header=True では _ を空白として扱う。",
  "example": "import quopri\nprint(quopri.decodestring('a=20b'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/quopri.html",
  "returns": "bytes"
 },
 {
  "name": "quopri.encode",
  "category": "Quoted-Printable",
  "syntax": "encode(input, output, quotetabs, header)",
  "description": "入力ファイルを quoted-printable に変換して出力ファイルへ書く。",
  "example": "import quopri\nquopri.encode(infile, outfile, False, False)",
  "caution": "ファイルオブジェクトを前提とするため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/quopri.html",
  "returns": "None"
 },
 {
  "name": "quopri.encodestring",
  "category": "Quoted-Printable",
  "syntax": "encodestring(input, quotetabs=False, header=False)",
  "description": "バイト列を quoted-printable 形式にする。binascii.b2a_qp と同じ規則。",
  "example": "import quopri\nprint(quopri.encodestring('a b'))",
  "caution": "入力の bytes リテラルはこの環境では未確定値になるため、文字列入力を使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/quopri.html",
  "returns": "bytes"
 }
];
