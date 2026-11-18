/* stdlib レジストリ（高度モード B7：Python 標準ライブラリ差分の受け皿）
 *
 * 設計（advanced-mode-plan.md 第1章・監査要件 F-16）：
 * - エンジン本体（engine.js）はこのレジストリを参照するだけであり、
 *   登録が無い状態では従来（簡易モード）と完全に同じ挙動になる。
 * - 高度モードの差分ファイル（js/types/python/advanced/）が、読み込まれた
 *   時点で registerStdlibModule を呼んでモジュールを登録する。機構側の
 *   ローダが高度モード選択時に advanced/index.js を動的 import する想定で、
 *   本ファイル自体は機構に依存しない。
 * - 値の表現は engine.js の値モデル（構造タグ）に従う。ネイティブ値
 *   （標準ライブラリのクラスインスタンス）は { __native: 限定名, mod, data }、
 *   ネイティブクラス値は { __ncls: 限定名, mod } で表す。
 */

export const NOT_HANDLED = Symbol("stdlib-not-handled");

/** モジュール定義の登録表：完全なモジュール名 -> moduleDef
 * moduleDef = {
 *   constants: { 名前: エンジン値 },        // モジュール定数・データ（束ね値）
 *   data:      { 名前: エンジン値 },        // constants と同義（属性として公開）
 *   functions: { 名前: (ctx, args, kwargs) => エンジン値 },
 *   classes:   { 名前: classDef },          // キーはモジュール内の単純名
 * }
 */
export const STDLIB_MODULES = new Map();

/** クラス定義の登録表：限定名（例 "datetime.date"） -> classDef
 * classDef = {
 *   typeName: 'date',                        // typeName() の表示名
 *   construct(ctx, args, kwargs) => 値,      // コンストラクタ
 *   methods:     { 名前: (ctx, self, args, kwargs) => 値 },
 *   classMethods:{ 名前: (ctx, args, kwargs) => 値 },
 *   attrs:       { 名前: (ctx, self) => 値 }, // インスタンスのデータ属性
 *   classAttrs:  { 名前: 値 | ((ctx) => 値) },
 *   repr(ctx, self) => string,
 *   str(ctx, self) => string,                // 省略時は repr
 *   truthy(ctx, self) => boolean,            // 省略時は true
 *   eq(ctx, self, other) => boolean | null,  // null は同一性に委ねる
 *   hash(ctx, self) => string | null,        // 辞書キー用の値ハッシュ
 *   call(ctx, self, args, kwargs) => 値（インスタンス自体の呼び出し。
 *     functools.partial のような呼び出し可能オブジェクト用）,
 *   binop(ctx, self, op, other, reflected) => 値 | NOT_HANDLED,
 *   compare(ctx, self, op, other) => boolean | null,
 *   len(ctx, self) => number | null,
 *   iter(ctx, self) => 値の配列 | null,
 *   getitem(ctx, self, key) => 値 | NOT_HANDLED,
 *   setitem(ctx, self, key, value) => boolean,
 *   contains(ctx, self, item) => boolean | null,
 *   exc: '例外の種別名',                      // 例外クラスの場合のみ
 *   parents: ['限定名', ...],                 // isinstance 用の親クラス
 * }
 */
export const STDLIB_CLASSES = new Map();

/** 例外の親子関係：種別名（限定名または組み込み名） -> 親の種別名の配列。
 * 組み込み例外同士の階層は engine.js 側の表が正本であり、ここには標準
 * ライブラリ例外から組み込み例外へつながる辺だけを登録する。 */
export const STDLIB_EXCEPTIONS = new Map();

/* 実行時の属性代入の保存先（B7 統合時の基盤修正 F-D）。
 * クラス属性への代入（Class.x = v）とモジュール属性への代入（mod.x = v）は、
 * 値オブジェクト自体が評価のたびに作り直されるため、レジストリ側に
 * 限定名キーで保持する。読み取り側（stdlibClassAttr／stdlibModuleMember）が
 * 定義側の値より先に参照する。 */
export const STDLIB_CLASS_ATTR_OVERRIDES = new Map();
export const STDLIB_MODULE_ATTR_OVERRIDES = new Map();
export function setClassAttrOverride(qualname, name, value) {
  if (!STDLIB_CLASS_ATTR_OVERRIDES.has(qualname)) STDLIB_CLASS_ATTR_OVERRIDES.set(qualname, new Map());
  STDLIB_CLASS_ATTR_OVERRIDES.get(qualname).set(name, value);
}
export function getClassAttrOverride(qualname, name) {
  const m = STDLIB_CLASS_ATTR_OVERRIDES.get(qualname);
  return m && m.has(name) ? m.get(name) : undefined;
}
export function deleteClassAttrOverride(qualname, name) {
  const m = STDLIB_CLASS_ATTR_OVERRIDES.get(qualname);
  if (m) m.delete(name);
}
export function setModuleAttrOverride(mod, name, value) {
  if (!STDLIB_MODULE_ATTR_OVERRIDES.has(mod)) STDLIB_MODULE_ATTR_OVERRIDES.set(mod, new Map());
  STDLIB_MODULE_ATTR_OVERRIDES.get(mod).set(name, value);
}
export function getModuleAttrOverride(mod, name) {
  const m = STDLIB_MODULE_ATTR_OVERRIDES.get(mod);
  return m && m.has(name) ? m.get(name) : undefined;
}
export function deleteModuleAttrOverride(mod, name) {
  const m = STDLIB_MODULE_ATTR_OVERRIDES.get(mod);
  if (m) m.delete(name);
}

export function moduleOf(qualname) {
  const i = qualname.lastIndexOf(".");
  return i < 0 ? "" : qualname.slice(0, i);
}

export function makeNative(qualname, data) {
  return { __native: qualname, mod: moduleOf(qualname), data };
}

export function makeNativeClass(qualname) {
  return { __ncls: qualname, mod: moduleOf(qualname) };
}

export function nativeClassDef(qualname) {
  return STDLIB_CLASSES.get(qualname) || null;
}

export function registerStdlibClass(qualname, def) {
  STDLIB_CLASSES.set(qualname, def);
  if (def && def.exc) registerStdlibException(def.exc, def.excParents || []);
  return def;
}

export function registerStdlibException(kind, parents) {
  STDLIB_EXCEPTIONS.set(kind, { parents: parents || [] });
}

export function registerStdlibModule(name, def) {
  STDLIB_MODULES.set(name, def || {});
  const classes = (def && def.classes) || {};
  for (const simpleName of Object.keys(classes)) {
    registerStdlibClass(name + "." + simpleName, classes[simpleName]);
  }
}

/** 登録済みモジュールか、そのパッケージ（登録済みモジュールの接頭辞）か。 */
export function isStdlibModule(name) {
  if (STDLIB_MODULES.has(name)) return true;
  for (const key of STDLIB_MODULES.keys()) if (key.startsWith(name + ".")) return true;
  return false;
}

/** 例外の祖先集合（自分自身を含む）。組み込み階層は含まない
 * （組み込み側の照合は engine.js の excMatches が担う）。 */
export function stdlibExceptionAncestors(kind) {
  const out = new Set([kind]);
  const queue = [kind];
  while (queue.length) {
    const cur = queue.pop();
    const rec = STDLIB_EXCEPTIONS.get(cur);
    if (!rec) continue;
    for (const p of rec.parents) {
      if (!out.has(p)) { out.add(p); queue.push(p); }
    }
  }
  return out;
}
