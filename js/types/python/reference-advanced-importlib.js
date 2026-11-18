/* 高度モード B7 G12：importlib のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "importlib.__import__",
  "category": "標準ライブラリ",
  "syntax": "importlib.__import__(...)",
  "description": "__import__ は importlib の関数。",
  "example": "import importlib\n# importlib.__import__ の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/importlib.html#importlib.__import__"
 },
 {
  "name": "importlib.import_module",
  "category": "標準ライブラリ",
  "syntax": "importlib.import_module(...)",
  "description": "名前でモジュールを import する（レジストリ済みに限る）。",
  "example": "import importlib\nm = importlib.import_module('getopt')\nprint(m)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/importlib.html#importlib.import_module"
 },
 {
  "name": "importlib.invalidate_caches",
  "category": "標準ライブラリ",
  "syntax": "importlib.invalidate_caches(...)",
  "description": "invalidate_caches は importlib の関数。",
  "example": "import importlib\nm = importlib.import_module('getopt')\nprint(m)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/importlib.html#importlib.invalidate_caches"
 },
 {
  "name": "importlib.reload",
  "category": "標準ライブラリ",
  "syntax": "importlib.reload(...)",
  "description": "reload は importlib の関数。",
  "example": "import importlib\n# importlib.reload の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/importlib.html#importlib.reload"
 }
];
