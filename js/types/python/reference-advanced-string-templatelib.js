/* 高度モード B7（G13）：string.templatelib のリファレンス（全12件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "string.templatelib.Interpolation",
  "category": "標準ライブラリ",
  "syntax": "Interpolation(value, expression, conversion=None, format_spec=\"\")",
  "description": "t 文字列の補間部分を表すクラス。value（値）、expression（式の文字列）、conversion（変換指定子）、format_spec（書式指定）を保持する。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Interpolation"
 },
 {
  "name": "string.templatelib.Interpolation.__new__",
  "category": "標準ライブラリ",
  "syntax": "Interpolation.__new__(...)",
  "description": "Interpolation の生成。t 文字列リテラルからのみ意味のある値が作られる。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Interpolation.__new__"
 },
 {
  "name": "string.templatelib.Interpolation.conversion",
  "category": "標準ライブラリ",
  "syntax": "interp.conversion",
  "description": "変換指定子（'s' / 'r' / 'a' のいずれか、または None）。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Interpolation.conversion"
 },
 {
  "name": "string.templatelib.Interpolation.expression",
  "category": "標準ライブラリ",
  "syntax": "interp.expression",
  "description": "補間式のソース文字列。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Interpolation.expression"
 },
 {
  "name": "string.templatelib.Interpolation.format_spec",
  "category": "標準ライブラリ",
  "syntax": "interp.format_spec",
  "description": "書式指定の文字列（補間を含む場合は Template）。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Interpolation.format_spec"
 },
 {
  "name": "string.templatelib.Interpolation.value",
  "category": "標準ライブラリ",
  "syntax": "interp.value",
  "description": "補間された値そのもの。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Interpolation.value"
 },
 {
  "name": "string.templatelib.Template",
  "category": "標準ライブラリ",
  "syntax": "Template(*args)",
  "description": "t 文字列全体を表すクラス。文字列断片と Interpolation が交互に並ぶ。iter() で要素を取り出せる。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Template"
 },
 {
  "name": "string.templatelib.Template.__new__",
  "category": "標準ライブラリ",
  "syntax": "Template.__new__(...)",
  "description": "Template の生成。t 文字列リテラルからのみ意味のある値が作られる。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Template.__new__"
 },
 {
  "name": "string.templatelib.Template.interpolations",
  "category": "標準ライブラリ",
  "syntax": "template.interpolations",
  "description": "補間部分（Interpolation）のタプル。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Template.interpolations"
 },
 {
  "name": "string.templatelib.Template.strings",
  "category": "標準ライブラリ",
  "syntax": "template.strings",
  "description": "文字列断片のタプル（補間の前後と間のリテラル）。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Template.strings"
 },
 {
  "name": "string.templatelib.Template.values",
  "category": "標準ライブラリ",
  "syntax": "template.values",
  "description": "補間値のタプル。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.Template.values"
 },
 {
  "name": "string.templatelib.convert",
  "category": "標準ライブラリ",
  "syntax": "convert(obj, /, conversion)",
  "description": "変換指定子を適用する：'s' は str()、'r' は repr()、'a' は ascii()、None はそのまま返す。",
  "example": "from string.templatelib import Template, Interpolation",
  "caution": "本アプリの高度モードでは未対応です（t 文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/string.templatelib.html#string.templatelib.convert"
 },
];
