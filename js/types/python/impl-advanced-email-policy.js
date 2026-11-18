/* 高度モード B7 G10：email.policy（ポリシーオブジェクトのデータ面。
 * CPython 3.12.3 実走照合：Policy 既定 linesep='\n', cte_type='8bit',
 * max_line_length=78, mangle_from_=False, message_factory=EmailMessage、
 * EmailPolicy は utf8=False, refold_source='long', header_factory 有り）。
 * fold／header_*_parse 等のヘッダ処理メソッドは headerregistry との
 * 相互作用が大きく未検証（リファレンス側裁定）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, makeNative } from './stdlib-registry.js';
const { BOOL, NONE } = PyAPI;
function policyDef(qual, typeName, defaults, parents, abstract, attrNames) {
  return {
    typeName, parents: parents || [],
    construct: (ctx, args, kwargs) => {
      if (abstract) ctx.err('TypeError', "Can't instantiate abstract class Policy without an implementation for abstract methods 'fold', 'fold_binary', 'header_fetch_parse', 'header_source_parse', 'header_store_parse'", '');
      const d = { ...defaults };
      if (kwargs) for (const [k, v] of Object.entries(kwargs)) d[k] = v;
      return ctx.native(qual, d);
    },
    // 高度A7班是正: CPython ではこれらの既定値はクラス属性であり、
    // クラス自体からも読める（Policy.max_line_length == 78 等）。
    // classAttrs として実値を置き、クラス経由の読みを一致させる。
    classAttrs: { ...defaults },
    attrs: Object.fromEntries(attrNames.map((a) => [a, (ctx, self) => self.data[a] === undefined ? NONE : self.data[a]])),
    methods: {
      clone: (ctx, self, args, kwargs) => { const n = ctx.native(qual, { ...self.data }); if (kwargs) for (const [k, v] of Object.entries(kwargs)) n.data[k] = v; return n; },
      handle_defect: (ctx, self, args) => { ctx.err('email.errors.MessageDefect', ctx.strOf(args[1] ?? args[0] ?? ''), ''); return NONE; },
      register_defect: (ctx, self, args) => { ctx.err('email.errors.MessageDefect', ctx.strOf(args[1] ?? args[0] ?? ''), ''); return NONE; },
    },
  };
}
// 高度A7班是正（CPython 3.12.3 実走で再確定）:
// - raise_on_defect の既定 False が欠けており None を返していた。
// - Compat32 の mangle_from_ は True（compat32 の存在意義そのもの）。
// - strict は raise_on_defect=True、HTTP は max_line_length=None。
// - utf8／refold_source／verify_generated_headers は EmailPolicy 専用
//   （Policy／Compat32 には存在せず、読みは AttributeError が正）。
const baseDefaults = { linesep: '\n', cte_type: '8bit', mangle_from_: BOOL(false), max_line_length: PyAPI.NUM(78, false), raise_on_defect: BOOL(false) };
const emailDefaults = { ...baseDefaults, utf8: BOOL(false), refold_source: 'long', verify_generated_headers: BOOL(true) };
const compatDefaults = { ...baseDefaults, mangle_from_: BOOL(true) };
const baseAttrNames = ['linesep', 'cte_type', 'mangle_from_', 'max_line_length', 'raise_on_defect'];
const emailAttrNames = [...baseAttrNames, 'utf8', 'refold_source', 'verify_generated_headers'];
registerStdlibModule('email.policy', {
  constants: {
    default: makeNative('email.policy.EmailPolicy', { ...emailDefaults }),
    strict: makeNative('email.policy.EmailPolicy', { ...emailDefaults, raise_on_defect: BOOL(true) }),
    compat32: makeNative('email.policy.Compat32', { ...compatDefaults }),
    HTTP: makeNative('email.policy.EmailPolicy', { ...emailDefaults, linesep: '\r\n', max_line_length: NONE }),
    SMTP: makeNative('email.policy.EmailPolicy', { ...emailDefaults, linesep: '\r\n' }),
    SMTPUTF8: makeNative('email.policy.EmailPolicy', { ...emailDefaults, linesep: '\r\n', utf8: BOOL(true) }),
  },
  classes: {
    Policy: policyDef('email.policy.Policy', 'Policy', baseDefaults, [], true, baseAttrNames),
    EmailPolicy: policyDef('email.policy.EmailPolicy', 'EmailPolicy', emailDefaults, ['email.policy.Policy'], false, emailAttrNames),
    Compat32: policyDef('email.policy.Compat32', 'Compat32', compatDefaults, ['email.policy.Policy'], false, baseAttrNames),
  },
  // 既定インスタンス群はデータとして束ねる（生成はモジュール読込時ではなく
  // 属性アクセス時にエンジンが値を返す。ここでは registry の data に
  // 直接は置けないため、constants として関数経由の値は置かない）。
});
