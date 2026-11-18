/* 高度モード B7 G8：tabnanny モジュールのリファレンス差分（全5件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 全件が新規収載（referenceAdvanced）。生成器：/tmp/g8gen/gen.py（作業用） */
export const referenceAdvanced = [
 {
  "name": "tabnanny.NannyNag",
  "category": "標準ライブラリ",
  "syntax": "tabnanny.NannyNag",
  "description": "曖昧なインデントを検出したときに送出される例外。",
  "example": "import tabnanny\nprint(tabnanny.NannyNag)",
  "caution": "Exception のサブクラスとして対応付けている。送出時は msg のみが例外文字列になり、lineno／line は例外値に保持できない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tabnanny.html#tabnanny.NannyNag",
 },
 {
  "name": "tabnanny.process_tokens",
  "category": "標準ライブラリ",
  "syntax": "tabnanny.process_tokens(tokens)",
  "description": "トークンの並びを検査し、曖昧なインデントがあれば NannyNag を送出する。",
  "example": "import tabnanny\nprint(tabnanny.process_tokens([(4, '\\n', (1, 0), (1, 1), '\\n'), (0, '', (2, 0), (2, 0), '')]))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tabnanny.html#tabnanny.process_tokens",
 },
 {
  "name": "tabnanny.check",
  "category": "標準ライブラリ",
  "syntax": "tabnanny.check(file_or_dir)",
  "description": "ファイル／ディレクトリを検査する。",
  "example": "import tabnanny\nprint(tabnanny.check)",
  "caution": "本アプリの高度モードでは未対応です。ファイル／ディレクトリの読み取りが前提で、エンジンでは再現できないため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tabnanny.html#tabnanny.check",
 },
 {
  "name": "tabnanny.verbose",
  "category": "標準ライブラリ",
  "syntax": "tabnanny.verbose",
  "description": "詳細表示フラグ（既定は 0）。",
  "example": "import tabnanny\nprint(tabnanny.verbose)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tabnanny.html#tabnanny.verbose",
 },
 {
  "name": "tabnanny.filename_only",
  "category": "標準ライブラリ",
  "syntax": "tabnanny.filename_only",
  "description": "ファイル名だけを表示するフラグ（既定は 0）。",
  "example": "import tabnanny\nprint(tabnanny.filename_only)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tabnanny.html#tabnanny.filename_only",
 },
];
export const referenceOverrides = [];
