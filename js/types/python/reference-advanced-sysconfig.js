/* 高度モード B7 G9：sysconfig モジュールのリファレンス差分（15件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 裁定方針は docs/audit/b7-g9-report.md を参照（環境依存値は実値化しない）。 */
export const referenceAdvanced = [
 {
  "name": "sysconfig._get_preferred_schemes",
  "category": "標準ライブラリ",
  "syntax": "sysconfig._get_preferred_schemes()",
  "description": "優先スキームを返す（内部用）。",
  "example": "import sysconfig\nsysconfig._get_preferred_schemes()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig._get_preferred_schemes"
 },
 {
  "name": "sysconfig.get_config_h_filename",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_config_h_filename()",
  "description": "pyconfig.h のパスを返す。",
  "example": "import sysconfig\nsysconfig.get_config_h_filename()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_config_h_filename"
 },
 {
  "name": "sysconfig.get_config_var",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_config_var()",
  "description": "設定変数1件を返す。",
  "example": "import sysconfig\nsysconfig.get_config_var()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_config_var"
 },
 {
  "name": "sysconfig.get_config_vars",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_config_vars()",
  "description": "設定変数を辞書で返す。",
  "example": "import sysconfig\nsysconfig.get_config_vars()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_config_vars"
 },
 {
  "name": "sysconfig.get_default_scheme",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_default_scheme()",
  "description": "デフォルトのインストールスキーム名を返す。",
  "example": "import sysconfig\nsysconfig.get_default_scheme()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_default_scheme"
 },
 {
  "name": "sysconfig.get_makefile_filename",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_makefile_filename()",
  "description": "Makefile のパスを返す。",
  "example": "import sysconfig\nsysconfig.get_makefile_filename()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_makefile_filename"
 },
 {
  "name": "sysconfig.get_path",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_path()",
  "description": "スキーム内のパス1件を返す。",
  "example": "import sysconfig\nsysconfig.get_path()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_path"
 },
 {
  "name": "sysconfig.get_path_names",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_path_names()",
  "description": "パス名のタプルを返す。",
  "example": "import sysconfig\nprint(sysconfig.get_path_names())",
  "caution": "公式ドキュメントに列挙されたパス名の集合（順序は CPython 3.12.3 実走で確認）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_path_names"
 },
 {
  "name": "sysconfig.get_paths",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_paths()",
  "description": "スキーム内の全パスを辞書で返す。",
  "example": "import sysconfig\nsysconfig.get_paths()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_paths"
 },
 {
  "name": "sysconfig.get_platform",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_platform()",
  "description": "プラットフォーム識別文字列を返す。",
  "example": "import sysconfig\nsysconfig.get_platform()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_platform"
 },
 {
  "name": "sysconfig.get_preferred_scheme",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_preferred_scheme()",
  "description": "用途別の優先スキーム名を返す。",
  "example": "import sysconfig\nsysconfig.get_preferred_scheme()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_preferred_scheme"
 },
 {
  "name": "sysconfig.get_python_version",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_python_version()",
  "description": "Python バージョン文字列を返す。",
  "example": "import sysconfig\nsysconfig.get_python_version()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_python_version"
 },
 {
  "name": "sysconfig.get_scheme_names",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.get_scheme_names()",
  "description": "スキーム名のタプルを返す。",
  "example": "import sysconfig\nsysconfig.get_scheme_names()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.get_scheme_names"
 },
 {
  "name": "sysconfig.is_python_build",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.is_python_build()",
  "description": "Python ビルドツリー内かを返す。",
  "example": "import sysconfig\nsysconfig.is_python_build()",
  "caution": "未検証です。インストールレイアウト・ビルド設定は実行環境依存であり、本アプリのエンジンには対応する事実が存在しないため、値を確定できないため、この項目の意味論は確定していません。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.is_python_build"
 },
 {
  "name": "sysconfig.parse_config_h",
  "category": "標準ライブラリ",
  "syntax": "sysconfig.parse_config_h()",
  "description": "設定ヘッダファイルを解析する。",
  "example": "import sysconfig\nsysconfig.parse_config_h()",
  "caution": "本アプリの高度モードでは未対応です。ファイルオブジェクトを前提とする API であり、本アプリのエンジンには実ファイルの実体がないため、この項目は再現しません。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/sysconfig.html#sysconfig.parse_config_h"
 }
];
