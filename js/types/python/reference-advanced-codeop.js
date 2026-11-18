/* 高度モード B7 G8：codeop モジュールのリファレンス差分（全3件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 全件が新規収載（referenceAdvanced）。生成器：/tmp/g8gen/gen.py（作業用） */
export const referenceAdvanced = [
 {
  "name": "codeop.compile_command",
  "category": "標準ライブラリ",
  "syntax": "codeop.compile_command(source, filename='<input>', symbol='single')",
  "description": "対話入力が完全かどうかを判定してコンパイルする。",
  "example": "import codeop\nprint(codeop.compile_command('1 + 1'))",
  "caution": "未検証です。戻り値がコードオブジェクトだが、エンジンにコードオブジェクトが存在せず、不完全入力との区別も含めて結果を確定できないため、未検証として収載しています。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/codeop.html#codeop.compile_command",
 },
 {
  "name": "codeop.Compile",
  "category": "標準ライブラリ",
  "syntax": "codeop.Compile",
  "description": "フラグを保持するコンパイラクラス。",
  "example": "import codeop\nprint(codeop.Compile)",
  "caution": "未検証です。戻り値がコードオブジェクトだが、エンジンにコードオブジェクトが存在せず、不完全入力との区別も含めて結果を確定できないため、未検証として収載しています。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/codeop.html#codeop.Compile",
 },
 {
  "name": "codeop.CommandCompiler",
  "category": "標準ライブラリ",
  "syntax": "codeop.CommandCompiler",
  "description": "対話入力用コンパイラクラス。",
  "example": "import codeop\nprint(codeop.CommandCompiler)",
  "caution": "未検証です。戻り値がコードオブジェクトだが、エンジンにコードオブジェクトが存在せず、不完全入力との区別も含めて結果を確定できないため、未検証として収載しています。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/codeop.html#codeop.CommandCompiler",
 },
];
export const referenceOverrides = [];
