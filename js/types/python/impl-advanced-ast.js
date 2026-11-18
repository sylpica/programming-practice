/* 高度モード B7 G8：ast モジュール（全147件）。
 * 一次情報：公式ドキュメント 3.15（library/ast）と CPython 3.12.3 実走
 * （_fields／_attributes は 3.12.3 の ast クラス群から採取。TemplateStr／
 * Interpolation は 3.14 で追加されたため ASDL／ドキュメント由来で、
 * ローカル実走照合ができないことから未検証に倒した）。
 * エンジンのパーサは独自形式で AST を公開しないため parse／unparse は
 * 未検証。ノードクラスは手で組み立てる範囲（生成・フィールド・dump・
 * walk 等の木操作）を忠実に実装する。literal_eval はリテラル文字列の
 * 評価として独立に実装する（bytes／複素数／Ellipsis はエンジンに値型が
 * 無いため、その入力では未確定として正直に返す）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { I, BOOL, NONE, LIST, TUPLE, UNK, cleandocImpl, unverifiedFn } from './impl-advanced-g8-common.js';

/* ノードクラスのフィールド表：{クラス名: [fields, attrs有無]}
 * attrs は位置属性（lineno, col_offset, end_lineno, end_col_offset）の有無。 */
const NODE_TABLE = {
  "AST": [[], false],
  "Add": [[], false],
  "And": [[], false],
  "AnnAssign": [["target", "annotation", "value", "simple"], true],
  "Assert": [["test", "msg"], true],
  "Assign": [["targets", "value", "type_comment"], true],
  "AsyncFor": [["target", "iter", "body", "orelse", "type_comment"], true],
  "AsyncFunctionDef": [["name", "args", "body", "decorator_list", "returns", "type_comment", "type_params"], true],
  "AsyncWith": [["items", "body", "type_comment"], true],
  "Attribute": [["value", "attr", "ctx"], true],
  "AugAssign": [["target", "op", "value"], true],
  "Await": [["value"], true],
  "BinOp": [["left", "op", "right"], true],
  "BitAnd": [[], false],
  "BitOr": [[], false],
  "BitXor": [[], false],
  "BoolOp": [["op", "values"], true],
  "Break": [[], true],
  "Call": [["func", "args", "keywords"], true],
  "ClassDef": [["name", "bases", "keywords", "body", "decorator_list", "type_params"], true],
  "Compare": [["left", "ops", "comparators"], true],
  "Constant": [["value", "kind"], true],
  "Continue": [[], true],
  "Del": [[], false],
  "Delete": [["targets"], true],
  "Dict": [["keys", "values"], true],
  "DictComp": [["key", "value", "generators"], true],
  "Div": [[], false],
  "Eq": [[], false],
  "ExceptHandler": [["type", "name", "body"], true],
  "Expr": [["value"], true],
  "Expression": [["body"], false],
  "FloorDiv": [[], false],
  "For": [["target", "iter", "body", "orelse", "type_comment"], true],
  "FormattedValue": [["value", "conversion", "format_spec"], true],
  "FunctionDef": [["name", "args", "body", "decorator_list", "returns", "type_comment", "type_params"], true],
  "FunctionType": [["argtypes", "returns"], false],
  "GeneratorExp": [["elt", "generators"], true],
  "Global": [["names"], true],
  "Gt": [[], false],
  "GtE": [[], false],
  "If": [["test", "body", "orelse"], true],
  "IfExp": [["test", "body", "orelse"], true],
  "Import": [["names", "is_lazy"], true],
  "ImportFrom": [["module", "names", "level", "is_lazy"], true],
  "In": [[], false],
  "Interactive": [["body"], false],
  "Invert": [[], false],
  "Is": [[], false],
  "IsNot": [[], false],
  "JoinedStr": [["values"], true],
  "LShift": [[], false],
  "Lambda": [["args", "body"], true],
  "List": [["elts", "ctx"], true],
  "ListComp": [["elt", "generators"], true],
  "Load": [[], false],
  "Lt": [[], false],
  "LtE": [[], false],
  "MatMult": [[], false],
  "Match": [["subject", "cases"], true],
  "MatchAs": [["pattern", "name"], true],
  "MatchClass": [["cls", "patterns", "kwd_attrs", "kwd_patterns"], true],
  "MatchMapping": [["keys", "patterns", "rest"], true],
  "MatchOr": [["patterns"], true],
  "MatchSequence": [["patterns"], true],
  "MatchSingleton": [["value"], true],
  "MatchStar": [["name"], true],
  "MatchValue": [["value"], true],
  "Mod": [[], false],
  "Module": [["body", "type_ignores"], false],
  "Mult": [[], false],
  "Name": [["id", "ctx"], true],
  "NamedExpr": [["target", "value"], true],
  "Nonlocal": [["names"], true],
  "Not": [[], false],
  "NotEq": [[], false],
  "NotIn": [[], false],
  "Or": [[], false],
  "ParamSpec": [["name"], true],
  "Pass": [[], true],
  "Pow": [[], false],
  "RShift": [[], false],
  "Raise": [["exc", "cause"], true],
  "Return": [["value"], true],
  "Set": [["elts"], true],
  "SetComp": [["elt", "generators"], true],
  "Slice": [["lower", "upper", "step"], true],
  "Starred": [["value", "ctx"], true],
  "Store": [[], false],
  "Sub": [[], false],
  "Subscript": [["value", "slice", "ctx"], true],
  "Try": [["body", "handlers", "orelse", "finalbody"], true],
  "TryStar": [["body", "handlers", "orelse", "finalbody"], true],
  "Tuple": [["elts", "ctx"], true],
  "TypeAlias": [["name", "type_params", "value"], true],
  "TypeIgnore": [["lineno", "tag"], false],
  "TypeVar": [["name", "bound"], true],
  "TypeVarTuple": [["name"], true],
  "UAdd": [[], false],
  "USub": [[], false],
  "UnaryOp": [["op", "operand"], true],
  "While": [["test", "body", "orelse"], true],
  "With": [["items", "body", "type_comment"], true],
  "Yield": [["value"], true],
  "YieldFrom": [["value"], true],
  "alias": [["name", "asname"], true],
  "arg": [["arg", "annotation", "type_comment"], true],
  "arguments": [["posonlyargs", "args", "vararg", "kwonlyargs", "kw_defaults", "kwarg", "defaults"], false],
  "comprehension": [["target", "iter", "ifs", "is_async"], false],
  "keyword": [["arg", "value"], true],
  "match_case": [["pattern", "guard", "body"], false],
  "withitem": [["context_expr", "optional_vars"], false],
  "TemplateStr": [["values"], true],
  "Interpolation": [["value", "str", "conversion", "format_spec"], true],
};
const POS_ATTRS = ['lineno', 'col_offset', 'end_lineno', 'end_col_offset'];

function nodeClassOf(v) {
  if (!v || !v.__native || !v.__native.startsWith('ast.')) return null;
  const name = v.__native.slice(4);
  return Object.prototype.hasOwnProperty.call(NODE_TABLE, name) ? name : null;
}
function isNode(v) { return nodeClassOf(v) !== null; }

function makeNodeDef(clsName) {
  const [fields, hasAttrs] = NODE_TABLE[clsName];
  const attrs = {};
  const getStored = (store) => (ctx, self) => {
    if (Object.prototype.hasOwnProperty.call(self.data[store], currentName)) return self.data[store][currentName];
    ctx.err('AttributeError', "'" + clsName + "' object has no attribute '" + currentName + "'", '');
    return UNK();
  };
  let currentName = '';
  for (const f of fields) {
    currentName = f;
    attrs[f] = ((store, name) => (ctx, self) => {
      if (Object.prototype.hasOwnProperty.call(self.data[store], name)) return self.data[store][name];
      ctx.err('AttributeError', "'" + clsName + "' object has no attribute '" + name + "'", '');
      return UNK();
    })('fields', f);
  }
  if (hasAttrs) {
    for (const a of POS_ATTRS) {
      attrs[a] = ((name) => (ctx, self) => {
        if (Object.prototype.hasOwnProperty.call(self.data.attrs, name)) return self.data.attrs[name];
        ctx.err('AttributeError', "'" + clsName + "' object has no attribute '" + name + "'", '');
        return UNK();
      })(a);
    }
  }
  return {
    typeName: clsName,
    construct: (ctx, args, kwargs) => {
      if (args.length > fields.length) ctx.err('TypeError', clsName + ' constructor takes at most ' + fields.length + ' positional arguments', '');
      const data = { fields: {}, attrs: {}, extra: {} };
      args.forEach((v, i) => { data.fields[fields[i]] = v; });
      for (const [k, v] of Object.entries(kwargs || {})) {
        if (fields.includes(k)) data.fields[k] = v;
        else if (hasAttrs && POS_ATTRS.includes(k)) data.attrs[k] = v;
        else data.extra[k] = v;
      }
      /* Constant.kind は CPython では既定で None が入る（他の未設定フィールドと異なる） */
      if (clsName === 'Constant' && !('kind' in data.fields)) data.fields.kind = NONE;
      return ctx.native('ast.' + clsName, data);
    },
    attrs,
    /* 属性代入の配線（R3 是正）：エンジンは def.setattr が無い場合に代入を
     * 属性バッグへ保存するが、読み取りは def.attrs のゲッタが先に解決され
     * バッグが見えないため、代入した位置属性が読み戻せなかった。
     * CPython の AST ノードは任意の属性代入を __dict__ に保持するので、
     * フィールド／位置属性／その他の属性をそれぞれの保存先へ書き分ける。 */
    setattr: (ctx, self, name, v) => {
      if (fields.includes(name)) self.data.fields[name] = v;
      else if (hasAttrs && POS_ATTRS.includes(name)) self.data.attrs[name] = v;
      else self.data.extra[name] = v;
    },
    delattr: (ctx, self, name) => {
      if (Object.prototype.hasOwnProperty.call(self.data.fields, name)) delete self.data.fields[name];
      else if (Object.prototype.hasOwnProperty.call(self.data.attrs, name)) delete self.data.attrs[name];
      else if (Object.prototype.hasOwnProperty.call(self.data.extra, name)) delete self.data.extra[name];
      else ctx.err('AttributeError', "'" + clsName + "' object has no attribute '" + name + "'", '');
    },
    attrFallback: (ctx, self, name) => {
      if (Object.prototype.hasOwnProperty.call(self.data.extra, name)) return self.data.extra[name];
      return undefined;
    },
    classAttrs: {
      _fields: () => TUPLE(fields.slice()),
      _attributes: () => TUPLE(hasAttrs ? POS_ATTRS.slice() : []),
    },
    repr: () => '<ast.' + clsName + ' object>',
  };
}

const classes = {};
for (const clsName of Object.keys(NODE_TABLE)) classes[clsName] = makeNodeDef(clsName);
/* NodeVisitor／NodeTransformer は利用者サブクラスでのメソッドディスパッチが
 * 必要で、エンジンのクラス機構では忠実に再現できないため未検証。 */
const visitorReason = 'visit のディスパッチは利用者が定義したサブクラスのメソッド解決に依存し、エンジンのクラス機構では忠実に再現できない';
classes.NodeVisitor = {
  typeName: 'NodeVisitor',
  construct: (ctx) => { ctx.diag('ast.NodeVisitor：' + visitorReason + 'ため未検証です'); return ctx.unk('ast.NodeVisitor のインスタンス（未検証）'); },
  methods: {
    visit: unverifiedFn('ast.NodeVisitor.visit', visitorReason),
    generic_visit: unverifiedFn('ast.NodeVisitor.generic_visit', visitorReason),
    visit_Constant: unverifiedFn('ast.NodeVisitor.visit_Constant', visitorReason),
  },
};
classes.NodeTransformer = {
  typeName: 'NodeTransformer',
  construct: (ctx) => { ctx.diag('ast.NodeTransformer：' + visitorReason + 'ため未検証です'); return ctx.unk('ast.NodeTransformer のインスタンス（未検証）'); },
  methods: {
    visit: unverifiedFn('ast.NodeTransformer.visit', visitorReason),
    generic_visit: unverifiedFn('ast.NodeTransformer.generic_visit', visitorReason),
  },
};
/* AST 基底クラス固有：_field_types は 3.13 以降の属性で、クラスごとの
 * フィールド型対応表はローカル 3.12 では採取できないため未検証として倒す。 */
classes.AST.classAttrs._field_types = (ctx) => {
  ctx.diag('ast.AST._field_types：3.13 以降で追加された属性で、フィールド型の対応表は一次情報で確定できないため未検証です');
  return ctx.unk('ast.AST._field_types（未検証）');
};

/* ---------- 木操作（CPython の Lib/ast.py の移植） ---------- */
function fieldsOf(node) { return NODE_TABLE[nodeClassOf(node)][0]; }
function hasPosAttrs(node) { return NODE_TABLE[nodeClassOf(node)][1]; }
function getField(node, name) {
  return Object.prototype.hasOwnProperty.call(node.data.fields, name) ? node.data.fields[name] : undefined;
}
function iterFieldsList(node) {
  const out = [];
  for (const f of fieldsOf(node)) {
    const v = getField(node, f);
    if (v !== undefined) out.push([f, v]);
  }
  return out;
}
function childNodes(node) {
  const out = [];
  for (const [, v] of iterFieldsList(node)) {
    if (isNode(v)) out.push(v);
    else if (PyAPI.isList(v)) for (const item of v.__list) if (isNode(item)) out.push(item);
  }
  return out;
}
function walkList(root) {
  const out = [];
  const queue = [root];
  while (queue.length) {
    const n = queue.shift();
    out.push(n);
    queue.push(...childNodes(n));
  }
  return out;
}
function requireNode(ctx, v, fname) {
  if (ctx.isUnk(v)) return false;
  if (!isNode(v)) ctx.err('TypeError', 'expected AST, got \'' + ctx.typeName(v) + '\'', '');
  return true;
}

function dumpFormat(ctx, node, annotate, incAttr, indentStr, level) {
  const prefix = indentStr !== null ? '\n' + indentStr.repeat(level + 1) : '';
  const sep = indentStr !== null ? ',\n' + indentStr.repeat(level + 1) : ', ';
  const clsName = nodeClassOf(node);
  const args = [];
  let allsimple = true;
  let keywords = annotate;
  for (const f of fieldsOf(node)) {
    const v = getField(node, f);
    if (v === undefined) { keywords = true; continue; }
    if (ctx.isNone(v)) { keywords = true; continue; }
    const [text, simple] = dumpValue(ctx, v, annotate, incAttr, indentStr, level + (indentStr !== null ? 1 : 0));
    allsimple = allsimple && simple;
    args.push(keywords ? f + '=' + text : text);
  }
  if (incAttr && hasPosAttrs(node)) {
    for (const a of POS_ATTRS) {
      if (!Object.prototype.hasOwnProperty.call(node.data.attrs, a)) continue;
      const v = node.data.attrs[a];
      if (ctx.isNone(v)) continue;
      const [text, simple] = dumpValue(ctx, v, annotate, incAttr, indentStr, level + (indentStr !== null ? 1 : 0));
      allsimple = allsimple && simple;
      args.push(a + '=' + text);
    }
  }
  if (allsimple && args.length <= 3) return [clsName + '(' + args.join(', ') + ')', args.length === 0];
  return [clsName + '(' + prefix + args.join(sep) + ')', false];
}
function dumpValue(ctx, v, annotate, incAttr, indentStr, level) {
  if (isNode(v)) return dumpFormat(ctx, v, annotate, incAttr, indentStr, level);
  if (PyAPI.isList(v)) {
    if (!v.__list.length) return ['[]', true];
    const prefix = indentStr !== null ? '\n' + indentStr.repeat(level + 1) : '';
    const sep = indentStr !== null ? ',\n' + indentStr.repeat(level + 1) : ', ';
    const parts = v.__list.map((x) => dumpValue(ctx, x, annotate, incAttr, indentStr, level + (indentStr !== null ? 1 : 0))[0]);
    return ['[' + prefix + parts.join(sep) + ']', false];
  }
  return [ctx.repr(v), true];
}

/* ---------- literal_eval（リテラル文字列のパーサ） ---------- */
function lexLiteral(ctx, src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
    if (ch === '#') { while (i < n && src[i] !== '\n') i++; continue; }
    if (ch === '\\' && src[i + 1] === '\n') { i += 2; continue; }
    if ('()[]{},:+-'.includes(ch)) { toks.push({ t: ch }); i++; continue; }
    if (ch === '.' && src.startsWith('...', i)) { toks.push({ t: '...' }); i += 3; continue; }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|[0-9][0-9_]*(?:\.[0-9_]*)?(?:[eE][+-]?[0-9_]+)?[jJ]?|\.[0-9_]+(?:[eE][+-]?[0-9_]+)?[jJ]?)/.exec(src.slice(i));
      if (!m) { toks.push({ t: 'bad' }); i++; continue; }
      toks.push({ t: 'num', raw: m[0] }); i += m[0].length; continue;
    }
    if (ch === "'" || ch === '"' || /[rRbBuU]/.test(ch)) {
      const pm = /^[rRbBuU]{0,2}/.exec(src.slice(i));
      const prefix = pm[0].toLowerCase();
      let j = i + pm[0].length;
      if (src[j] === "'" || src[j] === '"') {
        const quote = src[j];
        const triple = src.startsWith(quote.repeat(3), j);
        let k = j + (triple ? 3 : 1);
        let body = '';
        let closed = false;
        while (k < n) {
          if (triple && src.startsWith(quote.repeat(3), k)) { closed = true; k += 3; break; }
          if (!triple && src[k] === quote) { closed = true; k += 1; break; }
          if (!triple && src[k] === '\n') break;
          if (src[k] === '\\' && k + 1 < n) { body += src[k] + src[k + 1]; k += 2; continue; }
          body += src[k]; k++;
        }
        if (!closed) { toks.push({ t: 'bad' }); i = n; continue; }
        toks.push({ t: 'str', prefix, body, raw: !prefix.includes('r') });
        i = k; continue;
      }
      toks.push({ t: 'bad' }); i++; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      toks.push({ t: 'name', name: m[0] }); i += m[0].length; continue;
    }
    toks.push({ t: 'bad' }); i++;
  }
  return toks;
}
function decodeStringBody(ctx, tok) {
  if (tok.prefix.includes('b')) return { bytes: true };
  if (!tok.raw) return { value: tok.body };
  const body = tok.body;
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== '\\') { out += ch; continue; }
    const c = body[++i];
    if (c === undefined) { out += '\\'; break; }
    const simple = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', v: '\v', '\n': '' };
    if (c in simple) { out += simple[c]; continue; }
    if (c === 'x') { out += String.fromCharCode(parseInt(body.substr(i + 1, 2), 16)); i += 2; continue; }
    if (c === 'u') { out += String.fromCharCode(parseInt(body.substr(i + 1, 4), 16)); i += 4; continue; }
    if (c === 'U') { out += String.fromCodePoint(parseInt(body.substr(i + 1, 8), 16)); i += 8; continue; }
    if (c >= '0' && c <= '7') { let oct = c; while (i + 1 < body.length && /[0-7]/.test(body[i + 1]) && oct.length < 3) oct += body[++i]; out += String.fromCharCode(parseInt(oct, 8)); continue; }
    if (c === 'N') return { unverifiable: '名前付きエスケープ \\N{...}' };
    out += '\\' + c;
  }
  return { value: out };
}
function parseNumberToken(raw) {
  const clean = raw.replace(/_/g, '');
  if (/[jJ]$/.test(clean)) return { complex: true };
  if (/^0[xX]/.test(clean)) return { value: parseInt(clean, 16), isFloat: false };
  if (/^0[oO]/.test(clean)) return { value: parseInt(clean.slice(2), 8), isFloat: false };
  if (/^0[bB]/.test(clean)) return { value: parseInt(clean.slice(2), 2), isFloat: false };
  if (/[.eE]/.test(clean)) return { value: parseFloat(clean), isFloat: true };
  return { value: parseInt(clean, 10), isFloat: false };
}
function literalEvalImpl(ctx, src) {
  const toks = lexLiteral(ctx, src);
  let pos = 0;
  const peek = () => toks[pos];
  const malformed = () => ctx.err('ValueError', 'malformed node or string on line 1: <ast.Expression object>', '');
  /* BinOp（+／-）は複素数を構成する場合だけ CPython でも受理される。
   * 実数同士の BinOp は ValueError。複素数はエンジンに値が無いため
   * {complex} として呼び出し側で未確定に倒す。 */
  function parseValue() {
    const left = parsePrimary();
    if (left.unrepresentable) return left;
    if (left.complex) {
      if (peek() && (peek().t === '+' || peek().t === '-')) { pos++; parsePrimary(); }
      return { complex: true };
    }
    if (peek() && (peek().t === '+' || peek().t === '-')) {
      pos++;
      const right = parsePrimary();
      if (right.unrepresentable) return right;
      if (right.complex) return { complex: true };
      return malformed();
    }
    return left;
  }
  function parsePrimary() {
    const tok = peek();
    if (!tok) malformed();
    if (tok.t === 'num') {
      pos++;
      const p = parseNumberToken(tok.raw);
      if (p.complex) return { complex: true };
      return { value: PyAPI.NUM(p.value, p.isFloat) };
    }
    if (tok.t === 'str') {
      let combined = '';
      let anyBytes = false;
      let unv = null;
      while (peek() && peek().t === 'str') {
        const d = decodeStringBody(ctx, toks[pos]); pos++;
        if (d.bytes) anyBytes = true;
        else if (d.unverifiable) unv = d.unverifiable;
        else combined += d.value;
      }
      if (anyBytes) return { unrepresentable: 'bytes リテラル' };
      if (unv) return { unrepresentable: unv };
      return { value: combined };
    }
    if (tok.t === 'name') {
      pos++;
      if (tok.name === 'True') return { value: BOOL(true) };
      if (tok.name === 'False') return { value: BOOL(false) };
      if (tok.name === 'None') return { value: NONE };
      return malformed();
    }
    if (tok.t === '...') { pos++; return { unrepresentable: 'Ellipsis' }; }
    if (tok.t === '+' || tok.t === '-') {
      const sign = tok.t === '-' ? -1 : 1;
      pos++;
      const inner = peek();
      if (inner && inner.t === 'num') {
        pos++;
        const p = parseNumberToken(inner.raw);
        if (p.complex) return { complex: true };
        return { value: PyAPI.NUM(sign * p.value, p.isFloat) };
      }
      return malformed();
    }
    if (tok.t === '(') {
      pos++;
      if (peek() && peek().t === ')') { pos++; return { value: TUPLE([]) }; }
      const first = parseValue();
      if (first.unrepresentable || first.complex) return first;
      if (peek() && peek().t === ',') {
        const items = [first.value];
        while (peek() && peek().t === ',') {
          pos++;
          if (peek() && peek().t === ')') break;
          const it = parseValue();
          if (it.unrepresentable || it.complex) return it;
          items.push(it.value);
        }
        if (!peek() || peek().t !== ')') malformed();
        pos++;
        return { value: TUPLE(items) };
      }
      if (!peek() || peek().t !== ')') malformed();
      pos++;
      return first;
    }
    if (tok.t === '[') {
      pos++;
      const items = [];
      if (peek() && peek().t === ']') { pos++; return { value: LIST([]) }; }
      for (;;) {
        const it = parseValue();
        if (it.unrepresentable || it.complex) return it;
        items.push(it.value);
        if (peek() && peek().t === ',') { pos++; if (peek() && peek().t === ']') { pos++; break; } continue; }
        if (peek() && peek().t === ']') { pos++; break; }
        return malformed();
      }
      return { value: LIST(items) };
    }
    if (tok.t === '{') {
      pos++;
      if (peek() && peek().t === '}') { pos++; return { value: PyAPI.DICT() }; }
      const first = parseValue();
      if (first.unrepresentable || first.complex) return first;
      if (peek() && peek().t === ':') {
        const d = PyAPI.DICT();
        let key = first;
        for (;;) {
          pos++;
          const val = parseValue();
          if (val.unrepresentable || val.complex) return val;
          if (!PyAPI.dictSet(d, key.value, val.value)) ctx.err('TypeError', "unhashable type: '" + ctx.typeName(key.value) + "'", '');
          if (peek() && peek().t === ',') {
            pos++;
            if (peek() && peek().t === '}') { pos++; break; }
            key = parseValue();
            if (key.unrepresentable || key.complex) return key;
            if (!peek() || peek().t !== ':') return malformed();
            continue;
          }
          if (peek() && peek().t === '}') { pos++; break; }
          return malformed();
        }
        return { value: d };
      }
      const items = [first.value];
      for (;;) {
        if (peek() && peek().t === ',') {
          pos++;
          if (peek() && peek().t === '}') { pos++; break; }
          const it = parseValue();
          if (it.unrepresentable || it.complex) return it;
          items.push(it.value);
          continue;
        }
        if (peek() && peek().t === '}') { pos++; break; }
        return malformed();
      }
      const s = PyAPI.SET([]);
      for (const it of items) {
        if (PyAPI.dictKeyId(it) === null) ctx.err('TypeError', "unhashable type: '" + ctx.typeName(it) + "'", '');
        if (!s.__set.some((x) => ctx.eq(x, it))) s.__set.push(it);
      }
      return { value: s };
    }
    return malformed();
  }
  let result = parseValue();
  /* 末尾のカンマによるトップレベルタプル（"1, 2" 形式） */
  if (peek() && peek().t === ',') {
    if (result.unrepresentable || result.complex) return result;
    const items = [result.value];
    while (peek() && peek().t === ',') {
      pos++;
      if (pos >= toks.length) break;
      const it = parseValue();
      if (it.unrepresentable || it.complex) return it;
      items.push(it.value);
    }
    result = { value: TUPLE(items) };
  }
  if (pos < toks.length) malformed();
  return result;
}

/* ---------- モジュール関数 ---------- */
/* compare（3.14+）：2つの AST を再帰的に比較する。属性（位置情報）は
 * compare_attributes=True のときだけ比較対象になる。 */
function compareValues(ctx, a, b, withAttrs) {
  const aNode = a && a.__native && String(a.__native).startsWith('ast.');
  const bNode = b && b.__native && String(b.__native).startsWith('ast.');
  if (aNode || bNode) {
    if (!aNode || !bNode || a.__native !== b.__native) return false;
    const fields = fieldsOf(a);
    for (const f of fields) {
      const pa = f in a.data.fields, pb = f in b.data.fields;
      if (pa !== pb) return false;
      if (pa && !compareValues(ctx, a.data.fields[f], b.data.fields[f], withAttrs)) return false;
    }
    if (withAttrs) {
      for (const at of ['lineno', 'col_offset', 'end_lineno', 'end_col_offset']) {
        const pa = at in a.data.attrs, pb = at in b.data.attrs;
        const va = pa ? a.data.attrs[at] : NONE_SENTINEL;
        const vb = pb ? b.data.attrs[at] : NONE_SENTINEL;
        if (!compareValues(ctx, va, vb, withAttrs)) return false;
      }
    }
    return true;
  }
  if (PyAPI.isList(a) || PyAPI.isList(b)) {
    if (!PyAPI.isList(a) || !PyAPI.isList(b) || a.__list.length !== b.__list.length) return false;
    return a.__list.every((x, i) => compareValues(ctx, x, b.__list[i], withAttrs));
  }
  if (a === b) return true;
  return ctx.eq(a, b) === true;
}
const NONE_SENTINEL = { __g8missing: true };
function compareImpl(ctx, args, kwargs) {
  if (args.length !== 2) ctx.err('TypeError', 'compare() の引数の数が合いません', '');
  for (const k of Object.keys(kwargs || {})) {
    if (k !== 'compare_attributes') ctx.err('TypeError', "compare() got an unexpected keyword argument '" + k + "'", '');
  }
  const withAttrs = ('compare_attributes' in (kwargs || {})) && ctx.truthy(kwargs.compare_attributes) === true;
  return BOOL(compareValues(ctx, args[0], args[1], withAttrs));
}

const FUNCTIONS = {
  compare: compareImpl,
  literal_eval: (ctx, args, kwargs) => {
    if (Object.keys(kwargs || {}).length) ctx.err('TypeError', 'ast.literal_eval() にキーワード引数はありません', '');
    if (args.length !== 1) ctx.err('TypeError', 'ast.literal_eval() の引数の数が合いません', '');
    const a = args[0];
    if (ctx.isUnk(a)) return ctx.unk('ast.literal_eval の結果');
    if (typeof a !== 'string') {
      if (isNode(a)) { ctx.diag('ast.literal_eval：AST ノード入力の評価は、エンジンが CPython の AST を保持していないため未検証です'); return ctx.unk('ast.literal_eval の結果（未検証）'); }
      ctx.err('ValueError', 'malformed node or string on line 1: <ast.Expression object>', '');
    }
    const r = literalEvalImpl(ctx, a);
    if (r.unrepresentable) { ctx.diag('ast.literal_eval：' + r.unrepresentable + ' はエンジンに値型がないため、この説明では値を確定できません'); return ctx.unk('ast.literal_eval の結果'); }
    if (r.complex) { ctx.diag('ast.literal_eval：複素数はエンジンに値型がないため、この説明では値を確定できません'); return ctx.unk('ast.literal_eval の結果'); }
    return r.value;
  },
  parse: unverifiedFn('ast.parse', 'エンジンのパーサは独自形式で CPython の AST を公開しない'),
  unparse: unverifiedFn('ast.unparse', 'CPython の AST からソースへの変換は、エンジンが CPython の AST を保持していない'),
  dump: (ctx, args, kwargs) => {
    if (args.length !== 1) ctx.err('TypeError', 'ast.dump() の引数の数が合いません', '');
    if (!requireNode(ctx, args[0], 'ast.dump')) return ctx.unk('ast.dump の結果');
    const annotate = !('annotate_fields' in (kwargs || {})) || ctx.truthy(kwargs.annotate_fields) !== false;
    const incAttr = ('include_attributes' in (kwargs || {})) && ctx.truthy(kwargs.include_attributes) === true;
    let indentStr = null;
    if ('indent' in (kwargs || {}) && !ctx.isNone(kwargs.indent)) {
      const iv = kwargs.indent;
      if (typeof iv === 'string') indentStr = iv;
      else if (ctx.isNum(iv)) indentStr = ' '.repeat(Math.max(0, ctx.int(iv)));
      else ctx.err('TypeError', 'ast.dump() の indent には整数か文字列を使ってください', '');
    }
    return dumpFormat(ctx, args[0], annotate, incAttr, indentStr, 0)[0];
  },
  iter_fields: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', 'ast.iter_fields() の引数の数が合いません', '');
    if (!requireNode(ctx, args[0], 'ast.iter_fields')) return ctx.unk('ast.iter_fields の結果');
    return LIST(iterFieldsList(args[0]).map(([f, v]) => TUPLE([f, v])));
  },
  iter_child_nodes: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', 'ast.iter_child_nodes() の引数の数が合いません', '');
    if (!requireNode(ctx, args[0], 'ast.iter_child_nodes')) return ctx.unk('ast.iter_child_nodes の結果');
    return LIST(childNodes(args[0]));
  },
  walk: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', 'ast.walk() の引数の数が合いません', '');
    if (!requireNode(ctx, args[0], 'ast.walk')) return ctx.unk('ast.walk の結果');
    return LIST(walkList(args[0]));
  },
  copy_location: (ctx, args) => {
    if (args.length !== 2) ctx.err('TypeError', 'ast.copy_location() の引数の数が合いません', '');
    const [nn, oo] = args;
    if (!isNode(nn) || !isNode(oo)) { if (ctx.isUnk(nn) || ctx.isUnk(oo)) return ctx.unk('ast.copy_location の結果'); ctx.err('TypeError', 'expected AST, got \'' + ctx.typeName(isNode(nn) ? oo : nn) + '\'', ''); }
    if (hasPosAttrs(oo)) {
      for (const a of POS_ATTRS) if (Object.prototype.hasOwnProperty.call(oo.data.attrs, a)) nn.data.attrs[a] = oo.data.attrs[a];
    }
    return nn;
  },
  fix_missing_locations: (ctx, args) => {
    if (args.length !== 1) ctx.err('TypeError', 'ast.fix_missing_locations() の引数の数が合いません', '');
    if (!requireNode(ctx, args[0], 'ast.fix_missing_locations')) return ctx.unk('ast.fix_missing_locations の結果');
    const fix = (node, lineno, col, endL, endC) => {
      if (hasPosAttrs(node)) {
        const at = node.data.attrs;
        if (!Object.prototype.hasOwnProperty.call(at, 'lineno')) at.lineno = I(lineno); else lineno = ctx.int(at.lineno);
        if (at.end_lineno === undefined || ctx.isNone(at.end_lineno)) at.end_lineno = I(endL); else endL = ctx.int(at.end_lineno);
        if (!Object.prototype.hasOwnProperty.call(at, 'col_offset')) at.col_offset = I(col); else col = ctx.int(at.col_offset);
        if (at.end_col_offset === undefined || ctx.isNone(at.end_col_offset)) at.end_col_offset = I(endC); else endC = ctx.int(at.end_col_offset);
      }
      for (const ch of childNodes(node)) fix(ch, lineno, col, endL, endC);
    };
    fix(args[0], 1, 0, 1, 0);
    return args[0];
  },
  increment_lineno: (ctx, args, kwargs) => {
    if (args.length < 1 || args.length > 2) ctx.err('TypeError', 'ast.increment_lineno() の引数の数が合いません', '');
    if (!requireNode(ctx, args[0], 'ast.increment_lineno')) return ctx.unk('ast.increment_lineno の結果');
    const n = args.length === 2 ? ctx.int(args[1]) : ('n' in (kwargs || {}) ? ctx.int(kwargs.n) : 1);
    if (n === null) ctx.err('TypeError', 'ast.increment_lineno() の n には整数を使ってください', '');
    for (const node of walkList(args[0])) {
      const clsName = nodeClassOf(node);
      if (clsName === 'TypeIgnore') {
        const cur = getField(node, 'lineno');
        node.data.fields.lineno = I((cur === undefined || ctx.isNone(cur) ? 0 : ctx.int(cur)) + n);
        continue;
      }
      if (hasPosAttrs(node)) {
        const at = node.data.attrs;
        const cur = Object.prototype.hasOwnProperty.call(at, 'lineno') ? ctx.int(at.lineno) : 0;
        at.lineno = I((cur === null ? 0 : cur) + n);
        if (Object.prototype.hasOwnProperty.call(at, 'end_lineno')) {
          if (!ctx.isNone(at.end_lineno)) at.end_lineno = I(ctx.int(at.end_lineno) + n);
        } else at.end_lineno = I(n);
      }
    }
    return args[0];
  },
  get_docstring: (ctx, args, kwargs) => {
    if (args.length !== 1) ctx.err('TypeError', 'ast.get_docstring() の引数の数が合いません', '');
    const node = args[0];
    if (ctx.isUnk(node)) return ctx.unk('ast.get_docstring の結果');
    const clsName = nodeClassOf(node);
    if (!['Module', 'FunctionDef', 'AsyncFunctionDef', 'ClassDef'].includes(clsName)) {
      ctx.err('TypeError', "'" + (clsName || ctx.typeName(node)) + "' can't have docstrings", '');
    }
    const body = getField(node, 'body');
    if (!body || !PyAPI.isList(body) || !body.__list.length) return NONE;
    const first = body.__list[0];
    if (!isNode(first) || nodeClassOf(first) !== 'Expr') return NONE;
    const val = getField(first, 'value');
    if (!isNode(val) || nodeClassOf(val) !== 'Constant') return NONE;
    const text = getField(val, 'value');
    if (typeof text !== 'string') return NONE;
    const clean = !('clean' in (kwargs || {})) || ctx.truthy(kwargs.clean) !== false;
    return clean ? cleandocImpl(text) : text;
  },
  get_source_segment: (ctx, args, kwargs) => {
    if (args.length !== 2) ctx.err('TypeError', 'ast.get_source_segment() の引数の数が合いません', '');
    const [source, node] = args;
    if (typeof source !== 'string' || !isNode(node)) {
      if (ctx.isUnk(source) || ctx.isUnk(node)) return ctx.unk('ast.get_source_segment の結果');
      return NONE;
    }
    const at = node.data.attrs;
    const vals = {};
    for (const a of POS_ATTRS) {
      if (!Object.prototype.hasOwnProperty.call(at, a) || ctx.isNone(at[a])) return NONE;
      vals[a] = ctx.int(at[a]);
    }
    const padded = ('padded' in (kwargs || {})) && ctx.truthy(kwargs.padded) === true;
    const lines = source.split(/(?<=\n)|(?<=\r)(?!\n)|(?<=\r\n)/);
    const enc = new TextEncoder(), dec = new TextDecoder();
    const byteSlice = (s, from, to) => dec.decode(enc.encode(s).slice(from, to));
    const lineno = vals.lineno - 1, endL = vals.end_lineno - 1;
    if (lineno < 0 || endL >= lines.length) return NONE;
    if (endL === lineno) return byteSlice(lines[lineno], vals.col_offset, vals.end_col_offset);
    let padding = '';
    if (padded) padding = byteSlice(lines[lineno], 0, vals.col_offset).replace(/[^\t]/g, ' ').replace(/\t/g, '\t');
    const first = padding + byteSlice(lines[lineno], vals.col_offset, undefined);
    const last = byteSlice(lines[endL], 0, vals.end_col_offset);
    return [first, ...lines.slice(lineno + 1, endL), last].join('');
  },
};

registerStdlibModule('ast', {
  constants: {
    PyCF_ONLY_AST: I(1024),
    PyCF_ALLOW_TOP_LEVEL_AWAIT: I(8192),
    PyCF_TYPE_COMMENTS: I(4096),
    PyCF_OPTIMIZED_AST: I(33792),
  },
  functions: FUNCTIONS,
  classes,
});
