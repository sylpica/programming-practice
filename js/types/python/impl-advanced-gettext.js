/* 高度モード B7 G7: gettext モジュール。
* 翻訳カタログはファイル前提のため、translation/install/find は未対応または
* 未検証。カタログ未設定の状態で文字列だけで完結する意味論（NullTranslations
* の恒等変換、ngettext の単複規則、モジュール関数の恒等変換、textdomain の
* ドメイン名管理）は実装する。GNUTranslations はファイル前提のためインスタンス
* を作れず、メソッドは未検証。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, BOOL, NONE, UNK, unkRet, unsupportedFn, unverifiedFn, makeDictFrom, kwBool,
} from './impl-advanced-g7-common.js';

let currentDomain = 'messages';
const domainLocaledirs = new Map();

const NULL_Q = 'gettext.NullTranslations';
function nullTranslationsInstance(fallback) {
  return { __native: NULL_Q, mod: 'gettext', data: { fallback: fallback || null } };
}
function pluralOf(self, singular, plural, n) {
  return n === 1 ? singular : plural;
}
const NULL_DEF = {
  typeName: 'NullTranslations',
  construct: (ctx, args) => nullTranslationsInstance(null),
  methods: {
    gettext: (ctx, self, args) => {
      if (typeof args[0] === 'string') return args[0];
      if (self.data.fallback) return ctx.callMethod ? args[0] : args[0];
      return args[0];
    },
    ngettext: (ctx, self, args) => pluralOf(self, args[0], args[1], ctx.isNum(args[2]) ? ctx.num(args[2]) : 0),
    pgettext: (ctx, self, args) => args[1],
    npgettext: (ctx, self, args) => pluralOf(self, args[1], args[2], ctx.isNum(args[3]) ? ctx.num(args[3]) : 0),
    info: (ctx, self) => makeDictFrom([]),
    charset: (ctx, self) => NONE,
    output_charset: (ctx, self) => NONE,
    set_output_charset: (ctx, self) => NONE,
    add_fallback: (ctx, self, args) => { self.data.fallback = args[0]; return NONE; },
    install: unverifiedFn('gettext.NullTranslations.install', 'builtins への組み込みはエンジンで再現できないため'),
    _parse: (ctx, self) => NONE,
  },
};
const GNU_METHODS = {
  gettext: unverifiedFn('gettext.GNUTranslations.gettext', 'カタログファイル前提のため'),
  ngettext: unverifiedFn('gettext.GNUTranslations.ngettext', 'カタログファイル前提のため'),
  pgettext: unverifiedFn('gettext.GNUTranslations.pgettext', 'カタログファイル前提のため'),
  npgettext: unverifiedFn('gettext.GNUTranslations.npgettext', 'カタログファイル前提のため'),
};

registerStdlibModule('gettext', {
  functions: {
    gettext: (ctx, args) => args[0],
    dgettext: (ctx, args) => args[1],
    ngettext: (ctx, args) => pluralOf(null, args[0], args[1], ctx.isNum(args[2]) ? ctx.num(args[2]) : 0),
    dngettext: (ctx, args) => pluralOf(null, args[1], args[2], ctx.isNum(args[3]) ? ctx.num(args[3]) : 0),
    pgettext: (ctx, args) => args[1],
    dpgettext: (ctx, args) => args[2],
    npgettext: (ctx, args) => pluralOf(null, args[1], args[2], ctx.isNum(args[3]) ? ctx.num(args[3]) : 0),
    dnpgettext: (ctx, args) => pluralOf(null, args[2], args[3], ctx.isNum(args[4]) ? ctx.num(args[4]) : 0),
    textdomain: (ctx, args) => {
      if (args[0] !== undefined && typeof args[0] === 'string') currentDomain = args[0];
      return currentDomain;
    },
    bindtextdomain: (ctx, args) => {
      const domain = args[0];
      if (typeof args[1] === 'string') { domainLocaledirs.set(domain, args[1]); return args[1]; }
      if (domainLocaledirs.has(domain)) return domainLocaledirs.get(domain);
      ctx.diag('gettext.bindtextdomain：既定の localedir はプラットフォーム依存のため未確定値として扱います');
      return UNK('既定の localedir（未検証）');
    },
    bind_textdomain_codeset: (ctx, args) => (typeof args[1] === 'string' ? args[1] : NONE),
    find: unverifiedFn('gettext.find', 'ファイルシステム上のカタログ探索に依存するため'),
    translation: (ctx, args, kwargs) => {
      if (kwBool(ctx, kwargs, 'fallback', undefined, false)) return nullTranslationsInstance(null);
      ctx.err('未対応', 'gettext.translation はカタログファイルの読み込みを前提とするため、この環境では再現できません', 'fallback=True を指定すると NullTranslations が得られます');
      return UNK('');
    },
    install: unverifiedFn('gettext.install', 'builtins への組み込みはエンジンで再現できないため'),
  },
  classes: {
    NullTranslations: NULL_DEF,
    GNUTranslations: {
      typeName: 'GNUTranslations',
      construct: (ctx) => { ctx.err('未対応', 'gettext.GNUTranslations はカタログファイル（.mo）を前提とするため、この環境では再現できません', ''); return nullTranslationsInstance(null); },
      methods: GNU_METHODS,
    },
  },
});
export {};
