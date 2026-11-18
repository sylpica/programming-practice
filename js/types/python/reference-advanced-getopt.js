/* 高度モード B7 G12：getopt のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "getopt.GetoptError",
  "category": "標準ライブラリ",
  "syntax": "getopt.GetoptError(msg)",
  "description": "getopt の解析エラー例外。msg と opt 属性を持つ。",
  "example": "import getopt\nprint(getopt.getopt(['-a'], 'a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/getopt.html#getopt.GetoptError"
 },
 {
  "name": "getopt.error",
  "category": "標準ライブラリ",
  "syntax": "getopt.error(msg)",
  "description": "error は getopt の例外クラス。",
  "example": "import getopt\nprint(getopt.getopt(['-a'], 'a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/getopt.html#getopt.error"
 },
 {
  "name": "getopt.getopt",
  "category": "標準ライブラリ",
  "syntax": "getopt.getopt(...)",
  "description": "引数リストを短い/長いオプションとして解析し (opts, args) を返す。",
  "example": "import getopt\nprint(getopt.getopt(['-a'], 'a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/getopt.html#getopt.getopt"
 },
 {
  "name": "getopt.gnu_getopt",
  "category": "標準ライブラリ",
  "syntax": "getopt.gnu_getopt(...)",
  "description": "GNU 式に引数を並べ替えて解析する getopt。",
  "example": "import getopt\nprint(getopt.getopt(['-a'], 'a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/getopt.html#getopt.gnu_getopt"
 }
];
