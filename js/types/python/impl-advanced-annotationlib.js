/* 高度モード B7 G8：annotationlib モジュール（全14件）。
 * 一次情報：公式ドキュメント 3.15（library/annotationlib）と CPython
 * 本体 Lib/annotationlib.py。3.14 で追加されたモジュールのため、
 * ローカル 3.12.3 では実走照合できない（報告書に明記）。
 * 方針：Format 列挙と ForwardRef の値オブジェクトはドキュメントと
 * 本体ソースで裏付けが取れる範囲で実装し、注釈の評価・取得に関わる
 * 関数は未検証に倒す。 */
import { BOOL, NONE, unverifiedFn, makeEnum } from './impl-advanced-g8-common.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';

const formatEnum = makeEnum('annotationlib.Format', 'Format', [
  ['VALUE', 1], ['VALUE_WITH_FAKE_GLOBALS', 2], ['FORWARDREF', 3], ['STRING', 4],
], 'intenum', 'Format');
registerStdlibClass('annotationlib.Format', formatEnum.def);

const forwardRefDef = {
  typeName: 'ForwardRef',
  construct: (ctx, args, kwargs) => {
    const arg = args[0];
    if (typeof arg !== 'string') ctx.err('TypeError', 'Forward reference must be a string -- got ' + ctx.repr(arg), '');
    return ctx.native('annotationlib.ForwardRef', { arg });
  },
  attrs: {
    __forward_arg__: (ctx, self) => self.data.arg,
    __forward_evaluated__: () => BOOL(false),
    __forward_module__: () => NONE,
    __forward_is_argument__: () => BOOL(false),
    __forward_is_class__: () => BOOL(false),
  },
  methods: {
    evaluate: unverifiedFn('annotationlib.ForwardRef.evaluate', '前方参照の評価には評価コンテキストが必要で、エンジンでは再現できない'),
  },
  repr: (ctx, self) => 'ForwardRef(' + ctx.repr(self.data.arg) + ')',
  eq: (ctx, self, other) => (other && other.__native === 'annotationlib.ForwardRef') ? self.data.arg === other.data.arg : null,
  hash: (ctx, self) => 's:' + self.data.arg,
};
registerStdlibModule('annotationlib', {
  data: { ...formatEnum.instances },
  functions: {
    annotations_to_string: unverifiedFn('annotationlib.annotations_to_string', '注釈オブジェクトから文字列への変換は、対象の注釈表現をエンジンが保持していないため確定できない'),
    call_annotate_function: unverifiedFn('annotationlib.call_annotate_function', '__annotate__ 関数の呼び出しには対象オブジェクトの注釈機構が必要で、エンジンでは再現できない'),
    call_evaluate_function: unverifiedFn('annotationlib.call_evaluate_function', '評価関数の呼び出しには評価コンテキストが必要で、エンジンでは再現できない'),
    get_annotate_from_class_namespace: unverifiedFn('annotationlib.get_annotate_from_class_namespace', 'クラス名前空間の注釈情報はエンジンが保持していない'),
    get_annotations: unverifiedFn('annotationlib.get_annotations', '対象の __annotate__／__annotations__ をエンジンは保持していないため確定できない'),
    type_repr: unverifiedFn('annotationlib.type_repr', '型オブジェクトの文字列表現は対象の内部表現に依存し、エンジンでは確定できない'),
  },
  classes: {
    Format: formatEnum.def,
    ForwardRef: forwardRefDef,
  },
});
