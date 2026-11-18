/* 高度モード B7 G10：email のリファレンス差分（4件、生成＋分類は b7-g10 報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "email.message_from_binary_file",
  "category": "標準ライブラリ",
  "syntax": "email.message_from_binary_file()",
  "description": "email の関数「message_from_binary_file」。詳細は公式ドキュメントを参照。",
  "example": "import email",
  "caution": "本アプリの高度モードでは未対応です。ファイルオブジェクトが前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/email.parser.html#email.message_from_binary_file"
 },
 {
  "name": "email.message_from_bytes",
  "category": "標準ライブラリ",
  "syntax": "email.message_from_bytes()",
  "description": "email の関数「message_from_bytes」。詳細は公式ドキュメントを参照。",
  "example": "import email",
  "caution": "未検証です。bytes をエンジンの値として表せない（bytes リテラルは未確定値になる）ため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/email.parser.html#email.message_from_bytes"
 },
 {
  "name": "email.message_from_file",
  "category": "標準ライブラリ",
  "syntax": "email.message_from_file()",
  "description": "email の関数「message_from_file」。詳細は公式ドキュメントを参照。",
  "example": "import email",
  "caution": "本アプリの高度モードでは未対応です。ファイルオブジェクトが前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/email.parser.html#email.message_from_file"
 },
 {
  "name": "email.message_from_string",
  "category": "標準ライブラリ",
  "syntax": "email.message_from_string()",
  "description": "email の関数「message_from_string」。詳細は公式ドキュメントを参照。",
  "example": "import email",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/email.parser.html#email.message_from_string"
 }
];
