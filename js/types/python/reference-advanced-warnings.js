/* 高度モード B7 G9：warnings モジュールのリファレンス差分（9件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "warnings.catch_warnings",
  "category": "標準ライブラリ",
  "syntax": "warnings.catch_warnings",
  "description": "警告状態を保存・復元するコンテキストマネージャクラス。",
  "example": "import warnings\nprint(warnings.catch_warnings)",
  "caution": "本アプリの高度モードでは未対応です。with 文の出入りで警告状態を保存・復元する仕組みは、本アプリのエンジンでは再現できないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.catch_warnings"
 },
 {
  "name": "warnings.deprecated",
  "category": "標準ライブラリ",
  "syntax": "warnings.deprecated()",
  "description": "非推奨を宣言するデコレータを作る（Python 3.13以降）。",
  "example": "import warnings\nwarnings.deprecated()",
  "caution": "未検証です。警告フィルタと警告レジストリはインタプリタ全体の状態であり、本アプリのエンジンの diag 機構は警告フィルタ意味論を持たないため、送出・抑制の結果を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.deprecated"
 },
 {
  "name": "warnings.filterwarnings",
  "category": "標準ライブラリ",
  "syntax": "warnings.filterwarnings()",
  "description": "警告フィルタを（先頭へ）追加する。",
  "example": "import warnings\nwarnings.filterwarnings()",
  "caution": "未検証です。警告フィルタと警告レジストリはインタプリタ全体の状態であり、本アプリのエンジンの diag 機構は警告フィルタ意味論を持たないため、送出・抑制の結果を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.filterwarnings"
 },
 {
  "name": "warnings.formatwarning",
  "category": "標準ライブラリ",
  "syntax": "warnings.formatwarning(message, category, filename, lineno, line=None)",
  "description": "警告を指定形式の文字列へ整形する。",
  "example": "import warnings\nprint(warnings.formatwarning('msg', UserWarning, 'f.py', 3) == 'f.py:3: UserWarning: msg\\n')",
  "caution": "書式は公式ドキュメントと CPython 実走で確認した 'ファイル名:行: カテゴリ: メッセージ' 形式。line 引数がある場合は整形して2行目に付ける。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.formatwarning"
 },
 {
  "name": "warnings.resetwarnings",
  "category": "標準ライブラリ",
  "syntax": "warnings.resetwarnings()",
  "description": "警告フィルタを初期状態へ戻す。",
  "example": "import warnings\nwarnings.resetwarnings()",
  "caution": "未検証です。警告フィルタと警告レジストリはインタプリタ全体の状態であり、本アプリのエンジンの diag 機構は警告フィルタ意味論を持たないため、送出・抑制の結果を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.resetwarnings"
 },
 {
  "name": "warnings.showwarning",
  "category": "標準ライブラリ",
  "syntax": "warnings.showwarning()",
  "description": "警告を表示する（差し替え可能な関数）。",
  "example": "import warnings\nwarnings.showwarning()",
  "caution": "未検証です。警告フィルタと警告レジストリはインタプリタ全体の状態であり、本アプリのエンジンの diag 機構は警告フィルタ意味論を持たないため、送出・抑制の結果を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.showwarning"
 },
 {
  "name": "warnings.simplefilter",
  "category": "標準ライブラリ",
  "syntax": "warnings.simplefilter()",
  "description": "単純な警告フィルタを追加する。",
  "example": "import warnings\nwarnings.simplefilter()",
  "caution": "未検証です。警告フィルタと警告レジストリはインタプリタ全体の状態であり、本アプリのエンジンの diag 機構は警告フィルタ意味論を持たないため、送出・抑制の結果を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.simplefilter"
 },
 {
  "name": "warnings.warn",
  "category": "標準ライブラリ",
  "syntax": "warnings.warn()",
  "description": "警告を送出する。",
  "example": "import warnings\nwarnings.warn()",
  "caution": "未検証です。警告フィルタと警告レジストリはインタプリタ全体の状態であり、本アプリのエンジンの diag 機構は警告フィルタ意味論を持たないため、送出・抑制の結果を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.warn"
 },
 {
  "name": "warnings.warn_explicit",
  "category": "標準ライブラリ",
  "syntax": "warnings.warn_explicit()",
  "description": "場所情報を明示して警告を送出する。",
  "example": "import warnings\nwarnings.warn_explicit()",
  "caution": "未検証です。警告フィルタと警告レジストリはインタプリタ全体の状態であり、本アプリのエンジンの diag 機構は警告フィルタ意味論を持たないため、送出・抑制の結果を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/warnings.html#warnings.warn_explicit"
 }
];
