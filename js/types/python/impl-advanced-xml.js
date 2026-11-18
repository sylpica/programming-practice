/* 高度モード B7 R3 追補：xml パッケージ本体（is_valid_name／is_valid_text）。
 * Python 3.15 で追加された実在の関数。一次情報：公式ドキュメント 3.15
 * （library/xml）と CPython 3.15 ブランチ Lib/xml/__init__.py
 * （`from .utils import *` で公開）および Lib/xml/utils.py 本体ソース。
 * utils.py の正規表現をそのまま移植した（所有量指定子 `*+` は一致判定の
 * 結果を変えないため通常の `*` に置き換えた）。
 * 'xml' モジュール名の登録は既存ファイルには無く（xml.dom 等のサブ
 * モジュール登録のみ）、衝突しない。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';

const { BOOL } = PyAPI;

/* Lib/xml/utils.py の is_valid_name のパターン（W3C XML の Name 生成規則）。
 * NameStartChar */
const NAME_START =
  ':A-Z_a-z' +
  '\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF' +
  '\u200C\u200D' +
  '\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF' +
  '\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}';
/* NameChar */
const NAME_CHAR =
  '\\-.0-9:A-Z_a-z' +
  '\xB7' +
  '\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF' +
  '\u200C\u200D\u203F\u2040' +
  '\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF' +
  '\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}';
const NAME_RE = new RegExp('^[' + NAME_START + '][' + NAME_CHAR + ']*$', 'u');

/* Lib/xml/utils.py の _ILLEGAL_XML_CHAR：
 * C0 制御文字（TAB・CR・LF を除く）、サロゲート、U+FFFE／U+FFFF。 */
const ILLEGAL_XML_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/u;

function stringArg(ctx, args, kwargs, label) {
  if (kwargs && Object.keys(kwargs).length) ctx.err('TypeError', label + '() takes no keyword arguments', '');
  if (args.length !== 1) ctx.err('TypeError', label + '() takes exactly one argument (' + args.length + ' given)', '');
  const v = args[0];
  if (ctx.isUnk(v)) return null;
  if (typeof v !== 'string') ctx.err('TypeError', "expected string or bytes-like object, got '" + ctx.typeName(v) + "'", '');
  return v;
}

registerStdlibModule('xml', {
  functions: {
    is_valid_name: (ctx, args, kwargs) => {
      const s = stringArg(ctx, args, kwargs, 'is_valid_name');
      if (s === null) return ctx.unk('xml.is_valid_name の結果');
      return BOOL(NAME_RE.test(s));
    },
    is_valid_text: (ctx, args, kwargs) => {
      const s = stringArg(ctx, args, kwargs, 'is_valid_text');
      if (s === null) return ctx.unk('xml.is_valid_text の結果');
      return BOOL(!ILLEGAL_XML_CHAR_RE.test(s));
    },
  },
});
