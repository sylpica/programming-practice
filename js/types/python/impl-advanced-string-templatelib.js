/* 高度モード B7 G13：string.templatelib（12件）。
 * t 文字列（PEP 750）はエンジンのパーサが対応していない構文であり、
 * Template の本来の生成経路（t 文字列リテラル）が存在しない。そのため
 * 本モジュールは全項目を未対応とする（理由：言語構文の未対応）。
 * クラス属性の意味論そのものはリファレンス側で正確に扱う。
 * 一次情報：公式ドキュメント（3.15）string.templatelib。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { unsupportedFn, unsupportedCtor } from './impl-advanced-g13-common.js';

const REASON = 't文字列リテラル（PEP 750）の構文に本アプリのパーサが対応していないため';
registerStdlibModule('string.templatelib', {
  classes: {
    Template: {
      typeName: 'Template',
      construct: unsupportedCtor('string.templatelib.Template', REASON),
      attrs: {
        strings: (ctx) => { ctx.err('未対応', 'string.templatelib.Template.strings は本アプリの高度モードでは未対応です（' + REASON + '）', ''); },
        values: (ctx) => { ctx.err('未対応', 'string.templatelib.Template.values は本アプリの高度モードでは未対応です（' + REASON + '）', ''); },
        interpolations: (ctx) => { ctx.err('未対応', 'string.templatelib.Template.interpolations は本アプリの高度モードでは未対応です（' + REASON + '）', ''); },
      },
    },
    Interpolation: {
      typeName: 'Interpolation',
      construct: unsupportedCtor('string.templatelib.Interpolation', REASON),
      attrs: {
        value: (ctx) => { ctx.err('未対応', 'string.templatelib.Interpolation.value は本アプリの高度モードでは未対応です（' + REASON + '）', ''); },
        expression: (ctx) => { ctx.err('未対応', 'string.templatelib.Interpolation.expression は本アプリの高度モードでは未対応です（' + REASON + '）', ''); },
        conversion: (ctx) => { ctx.err('未対応', 'string.templatelib.Interpolation.conversion は本アプリの高度モードでは未対応です（' + REASON + '）', ''); },
        format_spec: (ctx) => { ctx.err('未対応', 'string.templatelib.Interpolation.format_spec は本アプリの高度モードでは未対応です（' + REASON + '）', ''); },
      },
    },
  },
  functions: {
    convert: unsupportedFn('string.templatelib.convert', REASON),
  },
});
