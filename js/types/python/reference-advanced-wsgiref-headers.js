/* 高度モード B7（G13）：wsgiref.headers のリファレンス（全3件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "wsgiref.headers.Headers",
  "category": "標準ライブラリ",
  "syntax": "Headers(headers=None)",
  "description": "(名前, 値) タプルのリストで HTTP ヘッダーを管理するクラス。名前の照合は大文字小文字を区別しない。",
  "example": "from wsgiref.headers import Headers\nh = Headers([('Content-Type', 'text/html')])\nprint(h['Content-Type'])",
  "caution": "制御文字を含む名前・値は ValueError。名前・値が str でない場合は AssertionError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.headers.Headers"
 },
 {
  "name": "wsgiref.headers.Headers.add_header",
  "category": "標準ライブラリ",
  "syntax": "h.add_header(_name, _value, **_params)",
  "description": "パラメータ付きヘッダーを追加する。パラメータ名の _ は - に変換され、空でないパラメータ値は引用符で囲まれる。",
  "example": "from wsgiref.headers import Headers\nh = Headers()\nh.add_header('Content-Disposition', 'attachment', filename='a.txt')\nprint(h['Content-Disposition'])",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.headers.Headers.add_header"
 },
 {
  "name": "wsgiref.headers.Headers.get_all",
  "category": "標準ライブラリ",
  "syntax": "h.get_all(name)",
  "description": "名前が一致するすべての値のリストを返す（大文字小文字を区別しない）。無ければ空リスト。",
  "example": "from wsgiref.headers import Headers\nh = Headers([('Set-Cookie', 'a=1'), ('Set-Cookie', 'b=2')])\nprint(h.get_all('set-cookie'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/wsgiref.html#wsgiref.headers.Headers.get_all"
 },
];
