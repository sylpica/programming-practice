/* 高度モード B7（G13）：wsgiref.util のリファレンス（全7件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "wsgiref.util.FileWrapper",
  "category": "標準ライブラリ",
  "syntax": "FileWrapper(filelike, blksize=8192)",
  "description": "ファイルライクオブジェクトをイテラブルにするラッパー（ストリーム前提）。",
  "example": "from wsgiref.util import FileWrapper",
  "caution": "本アプリの高度モードでは未対応です（ファイルライクなストリームを前提とするため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.util.FileWrapper"
 },
 {
  "name": "wsgiref.util.application_uri",
  "category": "標準ライブラリ",
  "syntax": "application_uri(environ)",
  "description": "アプリケーションの URL を再構成する。ホストは HTTP_HOST を優先し、ポートが既定値なら省略する。",
  "example": "from wsgiref.util import application_uri\nenv = {'wsgi.url_scheme': 'http', 'HTTP_HOST': 'example.com', 'SCRIPT_NAME': '/app'}\nprint(application_uri(env))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.util.application_uri"
 },
 {
  "name": "wsgiref.util.guess_scheme",
  "category": "標準ライブラリ",
  "syntax": "guess_scheme(environ)",
  "description": "environ の HTTPS が 'yes' / 'on' / '1' なら 'https'、それ以外は 'http' を返す。",
  "example": "from wsgiref.util import guess_scheme\nprint(guess_scheme({'HTTPS': 'on'}))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.util.guess_scheme"
 },
 {
  "name": "wsgiref.util.is_hop_by_hop",
  "category": "標準ライブラリ",
  "syntax": "is_hop_by_hop(header_name)",
  "description": "ホップバイホップヘッダー（Connection、Keep-Alive、Proxy-Authenticate、Proxy-Authorization、TE、Trailers、Transfer-Encoding、Upgrade）なら True。大文字小文字を区別しない。",
  "example": "from wsgiref.util import is_hop_by_hop\nprint(is_hop_by_hop('Connection'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.util.is_hop_by_hop"
 },
 {
  "name": "wsgiref.util.request_uri",
  "category": "標準ライブラリ",
  "syntax": "request_uri(environ, include_query=True)",
  "description": "リクエスト URI 全体を再構成する（PATH_INFO を引用し、クエリ文字列を付ける）。",
  "example": "from wsgiref.util import request_uri\nenv = {'wsgi.url_scheme': 'http', 'HTTP_HOST': 'ex.com', 'SCRIPT_NAME': '/app', 'PATH_INFO': '/x y', 'QUERY_STRING': 'q=1'}\nprint(request_uri(env))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.util.request_uri"
 },
 {
  "name": "wsgiref.util.setup_testing_defaults",
  "category": "標準ライブラリ",
  "syntax": "setup_testing_defaults(environ)",
  "description": "WSGI environ にテスト用の既定値を setdefault で補う。",
  "example": "from wsgiref.util import setup_testing_defaults\nenv = {}\nsetup_testing_defaults(env)\nprint(env['SERVER_NAME'])",
  "caution": "wsgi.input / wsgi.errors はストリームのため、本アプリでは値が確定しない（未確定の値が入る）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.util.setup_testing_defaults"
 },
 {
  "name": "wsgiref.util.shift_path_info",
  "category": "標準ライブラリ",
  "syntax": "shift_path_info(environ)",
  "description": "PATH_INFO の先頭要素を SCRIPT_NAME へ移し、その要素を返す。PATH_INFO が空なら None。",
  "example": "from wsgiref.util import shift_path_info\nenv = {'SCRIPT_NAME': '/app', 'PATH_INFO': '/x/y'}\nprint(shift_path_info(env))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.util.shift_path_info"
 },
];
