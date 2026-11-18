/* 高度モード B7 G4：enum モジュール（61件）。
 * 関数型 API（Enum('Color', 'RED GREEN') 等）を動的クラス登録で再現する。
 * メンバーは動的クラスのインスタンスで、name/value 属性・逆引き（値→メンバー）・
 * エイリアス・auto()・Flag のビット演算と分解表示・IntEnum/StrEnum/IntFlag の
 * 値としての振る舞いまで覆う。クラス定義構文（class X(Enum)）は基盤に
 * メタクラスフックがないため再現できず、その経路に属する項目は未検証に倒す。
 * enum.bin は CPython 3.12 の実装をそのまま移植（符号付き2進表記）。 */
import { registerStdlibModule, registerStdlibClass, nativeClassDef } from './stdlib-registry.js';
import {
  NUM, BOOL, NONE, LIST, TUPLE, DICT, I, isNum, isBool, isNone, isList, isTuple, isDict, isUnk,
  arity, intVal, dictSet, toArray, isCallableVal,
} from './impl-advanced-g4-common.js';

/* ---------- enum.bin（CPython 3.12 のアルゴリズム移植） ---------- */
function enumBin(ctx, args, kwargs) {
  arity(ctx, args, 1, 1, 'bin');
  const n = intVal(ctx, args[0]);
  if (n === null) ctx.err('TypeError', 'bin() の引数には整数を使ってください', '');
  let maxBits = null;
  if (args.length >= 2) { /* 位置引数は取らない（キーワードのみ） */ }
  if (kwargs && 'max_bits' in kwargs && !isNone(kwargs.max_bits)) { maxBits = intVal(ctx, kwargs.max_bits); if (maxBits === null) ctx.err('TypeError', 'max_bits には整数を使ってください', ''); }
  const bitLen = n === 0 ? 0 : (n < 0 ? (~n).toString(2).length : n.toString(2).length);
  const ceiling = Math.pow(2, bitLen);
  let s;
  if (n >= 0) {
    /* bin(num + ceiling) の最初の '1' を '0' に置き換える（CPython の実装どおり） */
    s = ('0b' + (n + ceiling).toString(2)).replace('1', '0');
  } else {
    /* ~num ^ ((ceiling - 1) + ceiling)（Python では + が ^ より先に評価される） */
    const v = (~n) ^ (2 * ceiling - 1);
    s = '0b' + v.toString(2);
  }
  const sign = s.slice(0, 3);
  let digits = s.slice(3);
  if (maxBits !== null) {
    if (digits.length > maxBits) digits = digits.slice(digits.length - maxBits);
    else if (digits.length < maxBits) digits = sign[2].repeat(maxBits - digits.length) + digits;
  }
  return sign + ' ' + digits;
}

/* ---------- メンバー生成の中核 ---------- */
const BOUNDARY = { STRICT: 'strict', CONFORM: 'conform', EJECT: 'eject', KEEP: 'keep' };
let enumSeq = 0;

function isAutoMarker(v) { return v && v.__native === 'enum.auto'; }
function createEnumClass(ctx, opts) {
  /* opts: {name, pairs:[[memberName, rawValue]...], base, boundary, startForAuto} */
  const { name, pairs, base } = opts;
  const boundary = opts.boundary || (base === 'IntFlag' ? 'keep' : base === 'Flag' ? 'strict' : null);
  const isFlag = base === 'Flag' || base === 'IntFlag';
  const qualname = 'enum.dynamic.' + name + '#' + (enumSeq++);
  const members = [];       /* 正規メンバーのみ */
  const aliases = [];       /* [name, member] */
  const byValue = new Map();/* valueKey -> member（最初に定義されたもの） */
  const membersDict = DICT();
  let lastValue = null;
  let autoCounter = opts.start !== undefined ? opts.start : 1;
  const valueKey = (v) => {
    if (isNum(v)) return 'n:' + v.v;
    if (typeof v === 'string') return 's:' + v;
    if (isBool(v)) return 'b:' + v.v;
    if (isNone(v)) return 'z:';
    return null;
  };
  const nextAuto = () => {
    if (base === 'StrEnum') return null; /* 名前の小文字化は呼び出し側で処理 */
    if (isFlag) {
      /* 次の2の冪 */
      let p = 1;
      const used = new Set(members.map((m) => (isNum(m.data.value) ? m.data.value.v : 0)));
      while (used.has(p)) p *= 2;
      return I(p);
    }
    if (base === 'IntEnum' || base === 'IntFlag' || base === 'Enum' || base === 'ReprEnum') {
      /* 3.13+：これまでの最大値+1 */
      let mx = null;
      for (const m of members) if (isNum(m.data.value)) mx = mx === null ? m.data.value.v : Math.max(mx, m.data.value.v);
      return I(mx === null ? autoCounter : mx + 1);
    }
    return I(autoCounter);
  };
  const def = {
    typeName: name,
    construct: (c2, a2, kw2) => {
      /* 値からメンバーを引く（EnumClass(value)） */
      arity(c2, a2, 1, 1, name);
      const v = a2[0];
      if (v && v.__native === qualname) return v;
      const k = valueKey(v);
      if (k !== null && byValue.has(k)) return byValue.get(k);
      if (isFlag && isNum(v)) return flagFromValue(c2, v.v);
      c2.err('ValueError', c2.repr(v) + ' is not a valid ' + name, 'その値を持つメンバーはありません');
    },
    methods: {},
    classMethods: {},
    attrs: {},
    classAttrs: {
      __members__: () => membersDict,
    },
    repr: (c2, self) => '<' + name + '.' + self.data.mname + ': ' + c2.repr(self.data.value) + '>',
    str: (c2, self) => {
      if (base === 'IntEnum' || base === 'IntFlag') return c2.strOf(self.data.value);
      if (base === 'StrEnum') return typeof self.data.value === 'string' ? self.data.value : c2.strOf(self.data.value);
      if (isFlag) return flagStr(c2, self);
      return name + '.' + self.data.mname;
    },
    eq: (c2, self, other) => {
      if (other && other.__native === qualname) return self === other || self.data.mname === other.data.mname;
      if (base === 'IntEnum' || base === 'IntFlag') return c2.eq(self.data.value, other);
      if (base === 'StrEnum') return c2.eq(self.data.value, other);
      return false;
    },
    hash: (c2, self) => {
      if (base === 'IntEnum' || base === 'IntFlag') return 'i:' + (isNum(self.data.value) ? self.data.value.v : 0);
      if (base === 'StrEnum') return 's:' + self.data.value;
      return 'o:enum:' + qualname + ':' + self.data.mname;
    },
    truthy: (c2, self) => {
      if (isFlag) return isNum(self.data.value) ? self.data.value.v !== 0 : true;
      return true;
    },
    len: (c2, self) => {
      if (!isFlag) return null;
      return decomposeFlag(self).length;
    },
    iter: (c2, self) => {
      if (!isFlag) return null;
      return decomposeFlag(self);
    },
    contains: (c2, self, item) => {
      if (!isFlag) return null;
      if (item && item.__native === qualname) {
        if (!isNum(self.data.value) || !isNum(item.data.value)) return false;
        return (self.data.value.v & item.data.value.v) === item.data.value.v;
      }
      return false;
    },
    binop: (c2, self, op, other, reflected) => {
      if (isFlag && ['&', '|', '^'].includes(op)) {
        const ov = other && other.__native === qualname ? (isNum(other.data.value) ? other.data.value.v : null) : null;
        const sv = isNum(self.data.value) ? self.data.value.v : null;
        if (ov === null || sv === null) return c2.NOT_HANDLED;
        const r = op === '&' ? sv & ov : op === '|' ? sv | ov : sv ^ ov;
        return flagFromValue(c2, r);
      }
      /* ctx.binop は (op, 左, 右) の3引数しか受けず reflected を伝えないため、
       * reflected のときは被演算子を入れ替えて委譲する */
      if ((base === 'IntEnum' || base === 'IntFlag') && isNum(self.data.value)) {
        return reflected ? c2.binop(op, other, self.data.value) : c2.binop(op, self.data.value, other);
      }
      if (base === 'StrEnum' && typeof self.data.value === 'string') {
        return reflected ? c2.binop(op, other, self.data.value) : c2.binop(op, self.data.value, other);
      }
      return c2.NOT_HANDLED;
    },
    compare: (c2, self, op, other) => {
      if ((base === 'IntEnum' || base === 'IntFlag') && isNum(self.data.value)) return c2.compare(op, self.data.value, other);
      if (base === 'StrEnum' && typeof self.data.value === 'string') return c2.compare(op, self.data.value, other);
      return null;
    },
    unary: (c2, self, op) => {
      /* 単項 ~ は Flag 系のみ CPython の Flag.__invert__ に従う（invertFlag）。
       * '-'／'+'／abs は通常の Flag では TypeError が正しいので NOT_HANDLED を
       * 返し、エンジン側の TypeError に委ねる（IntEnum 等も従来どおり委譲）。 */
      if (op === '~' && isFlag && isNum(self.data.value)) return invertFlag(c2, self);
      return c2.NOT_HANDLED;
    },
  };
  function decomposeFlag(member) {
    if (!isNum(member.data.value)) return [];
    const v = member.data.value.v;
    return members.filter((m) => isNum(m.data.value) && m.data.value.v !== 0 && (v & m.data.value.v) === m.data.value.v);
  }
  function flagLabel(parts) {
    /* CPython の Flag 表示：最初だけ完全名、以降は短縮名（例 Perm.R|W） */
    if (!parts.length) return null;
    return name + '.' + parts[0].data.mname + parts.slice(1).map((m) => '|' + m.data.mname).join('');
  }
  function flagStr(c2, member) {
    if (base === 'IntFlag') return c2.strOf(member.data.value);
    const parts = decomposeFlag(member);
    if (!parts.length) return name + '.' + member.data.mname;
    return flagLabel(parts);
  }
  function flagFromValue(c2, num) {
    const k = 'n:' + num;
    if (byValue.has(k)) return byValue.get(k);
    /* 分解できるか検証 */
    let rest = num;
    const parts = [];
    for (const m of members) {
      const mv = isNum(m.data.value) ? m.data.value.v : 0;
      if (mv !== 0 && (num & mv) === mv) { parts.push(m); rest &= ~mv; }
    }
    if (rest !== 0) {
      if (boundary === 'strict') {
        c2.err('ValueError', "<flag '" + name + "'> invalid value " + num + '\n given ' + enumBin(c2, [I(num)], {}) + '\n allowed ' + enumBin(c2, [I(allBits())], {}), 'そのビットの組み合わせはこの Flag では使えません');
      }
      if (boundary === 'eject') return I(num);
      if (boundary === 'conform') { num = num & allBits(); return flagFromValue(c2, num); }
      /* keep：名前なしビットを含む疑似メンバー */
    }
    const pseudo = c2.native(qualname, { mname: null, value: I(num), pseudo: true, parts });
    pseudo.__flagParts = parts;
    /* 疑似メンバーの表示は def の repr/str が data.parts を見る */
    return pseudo;
  }
  function allBits() { return members.reduce((a, m) => a | (isNum(m.data.value) ? m.data.value.v : 0), 0); }
  function bitLen(n) { return n <= 0 ? 0 : n.toString(2).length; }
  /* CPython Flag.__invert__ の意味論（3.12 実走＋enum.py 原文で照合）：
   * STRICT/CONFORM は定義済みビット（singles mask）内での補集合。
   * KEEP/EJECT（IntFlag の既定は KEEP）は cls(~v) の正規化で、名前なしビットも
   * 「定義済みビットと値のうち広い方の幅」の内側で反転する
   * （例：IntFlag A=1,B=2 で F(9) の ~ は B|4=6、IPerm.R=4 の ~ は W|X=3）。 */
  function invertFlag(c2, self) {
    const v = self.data.value.v;
    if (boundary === 'keep' || boundary === 'eject') {
      const mask = Math.pow(2, Math.max(bitLen(allBits()), bitLen(v))) - 1;
      return flagFromValue(c2, (~v) & mask);
    }
    return flagFromValue(c2, allBits() & ~v);
  }
  /* repr/str を疑似メンバー対応にする */
  const origRepr = def.repr, origStr = def.str;
  def.repr = (c2, self) => {
    if (self.data.pseudo) {
      const parts = (self.__flagParts || decomposeFlag(self));
      const v = self.data.value.v;
      let rest = v;
      for (const m of parts) rest &= ~(isNum(m.data.value) ? m.data.value.v : 0);
      let label = flagLabel(parts);
      if (rest !== 0) label = (label ? label + '|' : name + '.') + rest;
      if (!label) label = name;
      return '<' + label + ': ' + v + '>';
    }
    if (isFlag && self.data.mname === null) return '<' + name + ': ' + self.data.value.v + '>';
    return origRepr(c2, self);
  };
  def.str = (c2, self) => {
    if (self.data.pseudo) {
      if (base === 'IntFlag') return String(self.data.value.v);
      const parts = (self.__flagParts || decomposeFlag(self));
      if (!parts.length) return name + '.0';
      return flagLabel(parts);
    }
    if (isFlag && isNum(self.data.value) && self.data.value.v === 0 && self.data.mname) return name + '.' + self.data.mname;
    return origStr(c2, self);
  };
  /* ~演算子（単項）は基盤の unary フック（def.unary）で処理する。
   * __invert__ メソッドも同じ invertFlag を使い、結果を一致させる */
  def.methods.__invert__ = (c2, self) => {
    if (!isFlag || !isNum(self.data.value)) return c2.unk('反転結果');
    return invertFlag(c2, self);
  };
  def.methods.__iter__ = (c2, self) => {
    if (!isFlag) { c2.diag('このメンバーは反復できません'); return c2.unk('反復結果'); }
    return { __iter: decomposeFlag(self), __kind: 'iterator' };
  };
  def.methods.__len__ = (c2, self) => I(isFlag ? decomposeFlag(self).length : 0);
  def.methods.__contains__ = (c2, self, a2) => BOOL(isFlag && a2[0] && a2[0].__native === qualname && isNum(self.data.value) && isNum(a2[0].data.value) && (self.data.value.v & a2[0].data.value.v) === a2[0].data.value.v);
  def.methods.__bool__ = (c2, self) => BOOL(isFlag ? (isNum(self.data.value) ? self.data.value.v !== 0 : true) : true);
  for (const op of ['__and__', '__or__', '__xor__']) {
    def.methods[op] = (c2, self, a2) => def.binop(c2, self, op.slice(2, -2) === 'and' ? '&' : op === '__or__' ? '|' : '^', a2[0], false);
  }
  registerStdlibClass(qualname, def);
  /* メンバー生成 */
  for (const [mname, raw] of pairs) {
    let value = raw;
    if (isAutoMarker(raw)) value = base === 'StrEnum' ? mname.toLowerCase() : nextAuto();
    const k = valueKey(value);
    if (k !== null && byValue.has(k)) {
      const target = byValue.get(k);
      aliases.push([mname, target]);
      def.classAttrs[mname] = () => target;
      dictSet(membersDict, mname, target);
      continue;
    }
    const inst = { __native: qualname, mod: 'enum', data: { mname, value } };
    if (k !== null) byValue.set(k, inst);
    members.push(inst);
    dictSet(membersDict, mname, inst);
    def.classAttrs[mname] = () => inst;
    lastValue = value;
  }
  /* name/value 属性 */
  def.attrs.name = (c2, self) => (self.data.pseudo ? NONE : self.data.mname);
  def.attrs.value = (c2, self) => self.data.value;
  def.attrs._name_ = def.attrs.name;
  def.attrs._value_ = def.attrs.value;
  const cls = { __ncls: qualname, mod: 'enum' };
  cls.__enumInfo = { members, aliases, qualname, name, base, byValue, flagFromValue, allBits, decomposeFlag };
  def.__enumInfoRef = cls.__enumInfo;
  return cls;
}

function parseNamesArg(ctx, namesArg) {
  if (typeof namesArg === 'string') {
    return namesArg.split(/[\s,]+/).filter(Boolean).map((n) => [n, null]);
  }
  const arr = toArray(ctx, namesArg, 'Enum');
  if (arr === null) return null;
  return arr.map((el) => {
    if (typeof el === 'string') return [el, null];
    const pair = toArray(ctx, el, 'Enum');
    if (pair && pair.length === 2 && typeof pair[0] === 'string') return [pair[0], pair[1]];
    ctx.err('TypeError', 'メンバー名には文字列を使ってください', '');
  });
}
function enumFactory(base) {
  return (ctx, args, kwargs) => {
    /* 関数型 API: Enum(value, names=None, *, module, qualname, type, start, boundary) */
    if (args.length >= 2 || (kwargs && 'names' in kwargs)) {
      const value = args[0];
      const namesArg = args.length >= 2 ? args[1] : kwargs.names;
      const parsed = parseNamesArg(ctx, namesArg);
      if (!parsed) return ctx.unk('Enum の型');
      const start = kwargs && 'start' in kwargs ? (intVal(ctx, kwargs.start) ?? 1) : 1;
      const boundaryName = kwargs && kwargs.boundary && kwargs.boundary.__native === 'enum.FlagBoundary'
        ? kwargs.boundary.data.mode : null;
      let counter = start;
      const pairs = parsed.map(([n, v]) => [n, v === null ? { __native: 'enum.auto' } : v]);
      /* auto の連番は createEnumClass の nextAuto が最大値規則で処理する。
       * 値なしメンバーの開始値を効かせるため start を渡す */
      const clsName = typeof value === 'string' ? value : 'NewEnum';
      return createEnumClass(ctx, { name: clsName, pairs, base, boundary: boundaryName, start });
    }
    /* Enum(value) 単独：基底クラス値としての呼び出しは値変換に相当し再現しない */
    ctx.diag('Enum のクラス定義（class 構文）はこのエンジンでは再現できません');
    return ctx.unk('Enum の値');
  };
}

/* 基底クラスとしての登録（関数型 API のファクトリを construct に持つ） */
function baseClassDef(typeName, base) {
  return {
    typeName,
    construct: (ctx, args, kwargs) => enumFactory(base)(ctx, args, kwargs),
    repr: (ctx, self) => '<' + typeName + '.' + (self.data && self.data.mname) + ': ' + ctx.repr(self.data && self.data.value) + '>',
    truthy: () => true,
  };
}

/* auto クラス（マーカー） */
const AutoDef = {
  typeName: 'auto',
  construct: (ctx) => ctx.native('enum.auto', {}),
  repr: () => '<auto>',
  truthy: () => true,
};

/* EnumCheck：StrEnum 的な定義済みクラス（専用 def で再現する） */
const ENUMCHECK_MEMBERS = [
  ['CONTINUOUS', 'no skipped integer values'],
  ['NAMED_FLAGS', 'multi-flag aliases may not contain unnamed flags'],
  ['UNIQUE', 'one name per value'],
];
const EnumCheckDef = {
  typeName: 'EnumCheck',
  construct: (ctx, args) => {
    arity(ctx, args, 1, 1, 'EnumCheck');
    const v = args[0];
    for (const [mn, mv] of ENUMCHECK_MEMBERS) if (mv === v) return enumCheckMember(mn, mv);
    ctx.err('ValueError', ctx.repr(v) + ' is not a valid EnumCheck', '');
  },
  classAttrs: {},
  attrs: {
    name: (ctx, self) => self.data.mname,
    value: (ctx, self) => self.data.value,
    _name_: (ctx, self) => self.data.mname,
    _value_: (ctx, self) => self.data.value,
  },
  repr: (ctx, self) => '<EnumCheck.' + self.data.mname + ': ' + ctx.repr(self.data.value) + '>',
  str: (ctx, self) => self.data.value,
  eq: (ctx, self, other) => {
    if (other && other.__native === 'enum.EnumCheck') return self.data.mname === other.data.mname;
    return ctx.eq(self.data.value, other);
  },
  hash: (ctx, self) => 's:' + self.data.value,
  compare: (ctx, self, op, other) => ctx.compare(op, self.data.value, other),
  truthy: () => true,
};
function enumCheckMember(mname, value) {
  return { __native: 'enum.EnumCheck', mod: 'enum', data: { mname, value } };
}
for (const [mn, mv] of ENUMCHECK_MEMBERS) EnumCheckDef.classAttrs[mn] = () => enumCheckMember(mn, mv);

function uniqueFn(ctx, args) {
  arity(ctx, args, 1, 1, 'unique');
  const cls = args[0];
  const info = cls && cls.__enumInfo;
  if (!info) { ctx.diag('unique() は関数型 API で作った Enum にだけ適用できます'); return cls; }
  if (info.aliases.length) {
    const [aliasName, target] = info.aliases[0];
    ctx.err('ValueError', 'duplicate values found in <enum \'' + info.name + '\'>: ' + aliasName + ' -> ' + target.data.mname, '');
  }
  return cls;
}
function verifyApply(ctx, check, a2) {
  const cls = a2[0];
  const info = cls && cls.__enumInfo;
  if (!info) return cls;
  const mode = check && check.data ? check.data.value : null;
  if (mode === 'one name per value' && info.aliases.length) {
    const [aliasName, target] = info.aliases[0];
    ctx.err('ValueError', 'aliases found in <enum \'' + info.name + '\'>: ' + aliasName + ' -> ' + target.data.mname, '');
  }
  if (mode === 'no skipped integer values') {
    const vals = info.members.map((m) => (isNum(m.data.value) ? m.data.value.v : null)).filter((v) => v !== null).sort((a, b) => a - b);
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] !== vals[i - 1] + 1) ctx.err('ValueError', 'invalid enum: missing values ' + (vals[i - 1] + 1) + '..' + (vals[i] - 1), '');
    }
  }
  return cls;
}
function showFlagValuesFn(ctx, args) {
  arity(ctx, args, 1, 1, 'show_flag_values');
  const v = args[0];
  if (v && v.__native) {
    const def = nativeClassDef(v.__native);
    const info = def && def.__enumInfoRef;
    if (info) {
      const parts = info.decomposeFlag(v);
      return LIST(parts.map((m) => m.data.value).sort((a, b) => a.v - b.v));
    }
  }
  ctx.diag('show_flag_values() は関数型 API で作った Flag のメンバーにだけ適用できます');
  return ctx.unk('show_flag_values() の結果');
}
function memberNonmember(ctx, args, mark) {
  arity(ctx, args, 1, 1, mark);
  ctx.diag('enum.' + mark + ' はクラス本体の定義時に使うマーカーで、このエンジンでは再現できません');
  return args[0];
}
function globalEnumFn(ctx, args) {
  arity(ctx, args, 1, 1, 'global_enum');
  ctx.diag('enum.global_enum はモジュール名前空間への登録を伴うため、このエンジンでは再現できません');
  return args[0];
}

/* FlagBoundary のメンバー（内部関数の値。再現できないため値は未確定値に近い扱いだが
 * boundary= 引数の解釈には data.mode を使う） */
function boundaryMember(mode) {
  return { __native: 'enum.FlagBoundary', mod: 'enum', data: { mode } };
}
const FlagBoundaryDef = {
  typeName: 'FlagBoundary',
  construct: (ctx) => ctx.err('TypeError', 'FlagBoundary は直接実体化できません', ''),
  attrs: {
    STRICT: () => boundaryMember('strict'),
    CONFORM: () => boundaryMember('conform'),
    EJECT: () => boundaryMember('eject'),
    KEEP: () => boundaryMember('keep'),
  },
  truthy: () => true,
};

const EnumTypeDef = {
  typeName: 'EnumType',
  construct: (ctx) => ctx.err('TypeError', 'EnumType はメタクラスであり、このエンジンでは直接使えません', ''),
  classMethods: {
    __call__: (ctx, args, kwargs) => {
      if (args.length >= 2) return enumFactory('Enum')(ctx, args, kwargs);
      ctx.diag('EnumType.__call__ の値変換は再現できません');
      return ctx.unk('EnumType.__call__ の結果');
    },
  },
  truthy: () => true,
};

registerStdlibModule('enum', {
  functions: {
    bin: enumBin,
    unique: uniqueFn,
    show_flag_values: showFlagValuesFn,
    member: (ctx, args) => memberNonmember(ctx, args, 'member'),
    nonmember: (ctx, args) => memberNonmember(ctx, args, 'nonmember'),
    global_enum: globalEnumFn,
    verify: (ctx, args, kwargs) => {
      /* verify(check) はデコレータを返す */
      arity(ctx, args, 1, 1, 'verify');
      const check = args[0];
      const deco = { __native: 'enum.verify.decorator', mod: 'enum', data: { check } };
      return deco;
    },
  },
  classes: {
    EnumCheck: EnumCheckDef,
    Enum: baseClassDef('Enum', 'Enum'),
    IntEnum: baseClassDef('IntEnum', 'IntEnum'),
    StrEnum: baseClassDef('StrEnum', 'StrEnum'),
    Flag: baseClassDef('Flag', 'Flag'),
    IntFlag: baseClassDef('IntFlag', 'IntFlag'),
    ReprEnum: baseClassDef('ReprEnum', 'ReprEnum'),
    auto: AutoDef,
    EnumType: EnumTypeDef,
    EnumMeta: EnumTypeDef,
    FlagBoundary: FlagBoundaryDef,
    EnumDict: {
      typeName: 'EnumDict',
      construct: (ctx) => { ctx.diag('EnumDict（3.13+）はクラス作成機構に依存するため、このエンジンでは再現できません'); return ctx.unk('EnumDict の値'); },
      truthy: () => true,
    },
    property: {
      typeName: 'property',
      construct: (ctx, args) => { ctx.diag('enum.property はクラス本体の定義時に使うため、このエンジンでは再現できません'); return ctx.unk('enum.property の値'); },
      truthy: () => true,
    },
  },
});
/* verify デコレータの呼び出し可能性 */
registerStdlibClass('enum.verify.decorator', {
  typeName: 'verify',
  call: (ctx, self, args) => verifyApply(ctx, self.data.check, args),
  truthy: () => true,
});
