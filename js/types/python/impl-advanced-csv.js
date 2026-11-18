/* 高度モード B7 G7: csv モジュール。
* reader は文字列のイテラブル、writer/DictWriter は書き込み先としてリストを
* 代用する（行文字列がリストへ追加される。本来はファイルオブジェクト前提の
* ところを、本アプリの値モデルに合わせて置き換えた裁定。リファレンス caution
* にも明記）。パース・書式規則は CPython 3.12.3 実走どおり。
* Sniffer の判定ヒューリスティクスは再現範囲を確定できないため未検証。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, F, BOOL, NONE, LIST, TUPLE, ITER, UNK, unkRet, unverifiedFn, onlyKw, kwBool, kwVal,
  floatReprOf, makeDictFrom,
} from './impl-advanced-g7-common.js';

export const QUOTE_MINIMAL = 0, QUOTE_ALL = 1, QUOTE_NONNUMERIC = 2, QUOTE_NONE = 3, QUOTE_STRINGS = 4, QUOTE_NOTNULL = 5;
const EXCEL = { delimiter: ',', doublequote: true, escapechar: null, quotechar: '"', quoting: 0, skipinitialspace: false, lineterminator: '\r\n', strict: false };
const EXCEL_TAB = { ...EXCEL, delimiter: '\t' };
const UNIX = { ...EXCEL, quoting: 1, lineterminator: '\n' };
const PARAM_KEYS = ['delimiter', 'doublequote', 'escapechar', 'quotechar', 'quoting', 'skipinitialspace', 'lineterminator', 'strict'];

const DIALECT_Q = 'csv.Dialect';
export function makeDialectVal(params, name) {
  return { __native: DIALECT_Q, mod: 'csv', data: { params: { ...params }, name: name || '' } };
}
const CLASS_PARAMS = { 'csv.excel': EXCEL, 'csv.excel_tab': EXCEL_TAB, 'csv.unix_dialect': UNIX };
const dialectRegistry = new Map([
  ['excel', makeDialectVal(EXCEL, 'excel')],
  ['excel-tab', makeDialectVal(EXCEL_TAB, 'excel-tab')],
  ['unix', makeDialectVal(UNIX, 'unix')],
]);
let fieldSizeLimit = 131072;

function charOrNone(ctx, v, name) {
  if (ctx.isNone(v)) return null;
  if (typeof v === 'string' && [...v].length === 1) return v;
  if (ctx.isUnk(v)) return undefined;
  ctx.err('TypeError', '"' + name + '" must be a 1-character string', '');
  return null;
}
export function resolveDialect(ctx, dialectV, kwargs, fname) {
  let params = { ...EXCEL };
  if (dialectV !== undefined && !ctx.isNone(dialectV)) {
    if (typeof dialectV === 'string') {
      const d = dialectRegistry.get(dialectV);
      if (!d) { ctx.err('csv.Error', 'unknown dialect', ''); return null; }
      params = { ...d.data.params };
    } else if (dialectV.__native === DIALECT_Q) {
      params = { ...dialectV.data.params };
    } else if (dialectV.__ncls && CLASS_PARAMS[dialectV.__ncls]) {
      params = { ...CLASS_PARAMS[dialectV.__ncls] };
    } else if (ctx.isUnk(dialectV)) {
      return null;
    } else {
      ctx.err('TypeError', 'dialect must be a string, a Dialect class or a Dialect instance', '');
      return null;
    }
  }
  for (const k of Object.keys(kwargs || {})) {
    if (k === 'dialect') continue;
    if (!PARAM_KEYS.includes(k)) { ctx.err('TypeError', fname + "() got an unexpected keyword argument '" + k + "'", ''); return null; }
    const v = kwargs[k];
    if (ctx.isUnk(v)) return null;
    if (k === 'delimiter' || k === 'escapechar' || k === 'quotechar') {
      const c = charOrNone(ctx, v, k);
      if (c === undefined) return null;
      params[k] = c;
    } else if (k === 'quoting') {
      const n = ctx.int(v);
      if (n === null) return null;
      if (![0, 1, 2, 3, 4, 5].includes(n)) { ctx.err('csv.Error', '"quoting" must be one of the QUOTE_* constants', ''); return null; }
      params.quoting = n;
    } else if (k === 'lineterminator') {
      if (typeof v !== 'string') { ctx.err('TypeError', 'lineterminator must be a string', ''); return null; }
      params.lineterminator = v;
    } else {
      params[k] = !!ctx.truthy(v);
    }
  }
  if (params.delimiter === null || params.delimiter === undefined) { ctx.err('TypeError', 'delimiter must be a 1-character string', ''); return null; }
  return params;
}
function dialectKwarg(ctx, args, kwargs, idx) {
  if ('dialect' in (kwargs || {})) return kwargs.dialect;
  return args.length > idx ? args[idx] : undefined;
}


function paramKwargs(kwargs) {
  const out = {};
  for (const k of Object.keys(kwargs || {})) if (PARAM_KEYS.includes(k) || k === 'dialect') out[k] = kwargs[k];
  return out;
}
/* ---- リーダーのパーサ ---- */
const errCsv = (ctx, msg) => ctx.err('csv.Error', msg, '');
export function parseCsvText(ctx, text, params) {
  return parseCsvDetailed(ctx, text, params).rows;
}
/* rows に加え、各行を読み終えた時点までに消費した入力行数（line_num の
 * 累計値）を rowLines として返す詳細版。引用フィールド内の改行（継続行）
 * も1行として数える（CPython 3.12.3 実走で照合）。 */
export function parseCsvDetailed(ctx, text, params) {
  const rows = [];
  const rowLines = [];
  let linesRead = 0;
  const { delimiter, quotechar, escapechar, doublequote, skipinitialspace, quoting, strict } = params;
  let row = [], field = '', fieldQuoted = false, fieldStarted = false, rowActive = false;
  let state = 'start'; // start | in | quoted | quoteInQuoted
  const endField = () => {
    let v = field;
    if (quoting === QUOTE_NONNUMERIC && !fieldQuoted && field !== '') {
      const num = pyFloat(field);
      if (num === null) ctx.err('ValueError', "could not convert string to float: '" + field + "'", '');
      v = F(num);
    }
    row.push(typeof v === 'string' ? v : v);
    field = ''; fieldQuoted = false; fieldStarted = false;
  };
  const endRow = () => {
    if (!rowActive && row.length === 0 && !fieldStarted) { rows.push(LIST([])); rowLines.push(linesRead); return; }
    endField();
    rows.push(LIST(row));
    rowLines.push(linesRead);
    row = []; rowActive = false;
  };
  const n = text.length;
  let i = 0;
  const checkSize = () => {
    if (field.length > fieldSizeLimit) errCsv(ctx, 'field larger than field limit (' + fieldSizeLimit + ')');
  };
  while (i < n) {
    const ch = text[i];
    if (state === 'start') {
      if (skipinitialspace && ch === ' ') { i++; continue; }
      if (quotechar !== null && ch === quotechar) { state = 'quoted'; fieldQuoted = true; fieldStarted = true; rowActive = true; i++; continue; }
      if (escapechar !== null && ch === escapechar && i + 1 < n) { field += text[i + 1]; fieldStarted = true; rowActive = true; state = 'in'; i += 2; continue; }
      if (ch === delimiter) { endField(); rowActive = true; i++; continue; }
      if (ch === '\n') { linesRead++; endRow(); i++; continue; }
      if (ch === '\r') {
        if (text[i + 1] === '\n') { linesRead++; endRow(); i += 2; continue; }
        if (i + 1 >= n) { linesRead++; endRow(); i++; continue; }
        errCsv(ctx, "new-line character seen in unquoted field - do you need to open the file with newline=''?");
      }
      field += ch; fieldStarted = true; rowActive = true; state = 'in'; i++; checkSize(); continue;
    }
    if (state === 'in') {
      if (escapechar !== null && ch === escapechar && i + 1 < n) { field += text[i + 1]; i += 2; continue; }
      if (ch === delimiter) { endField(); state = 'start'; i++; continue; }
      if (ch === '\n') { linesRead++; endRow(); state = 'start'; i++; continue; }
      if (ch === '\r') {
        if (text[i + 1] === '\n') { linesRead++; endRow(); state = 'start'; i += 2; continue; }
        if (i + 1 >= n) { linesRead++; endRow(); state = 'start'; i++; continue; }
        errCsv(ctx, "new-line character seen in unquoted field - do you need to open the file with newline=''?");
      }
      field += ch; i++; checkSize(); continue;
    }
    if (state === 'quoted') {
      if (escapechar !== null && ch === escapechar && i + 1 < n) { field += text[i + 1]; i += 2; continue; }
      if (quotechar !== null && ch === quotechar) { state = 'quoteInQuoted'; i++; continue; }
      if (ch === '\n') linesRead++;
      field += ch; i++; checkSize(); continue;
    }
    // quoteInQuoted
    if (quotechar !== null && ch === quotechar && doublequote) { field += quotechar; state = 'quoted'; i++; continue; }
    if (escapechar !== null && ch === escapechar && i + 1 < n) { field += text[i + 1]; state = 'in'; i += 2; continue; }
    if (ch === delimiter) { endField(); state = 'start'; i++; continue; }
    if (ch === '\n') { linesRead++; endRow(); state = 'start'; i++; continue; }
    if (ch === '\r') {
      if (text[i + 1] === '\n') { linesRead++; endRow(); state = 'start'; i += 2; continue; }
      if (i + 1 >= n) { linesRead++; endRow(); state = 'start'; i++; continue; }
      errCsv(ctx, "new-line character seen in unquoted field - do you need to open the file with newline=''?");
    }
    field += ch; state = 'in'; i++; checkSize(); continue;
  }
  if (state === 'quoted') {
    if (strict) errCsv(ctx, 'unexpected end of data');
    endRow();
  } else if (rowActive || fieldStarted || row.length) {
    endRow();
  }
  return { rows, rowLines };
}
function pyFloat(s) {
  const t = s.replace(/_/g, '');
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number(t);
  if (/^[+-]?(inf(inity)?|nan)$/i.test(t)) {
    if (/nan/i.test(t)) return NaN;
    return t.startsWith('-') ? -Infinity : Infinity;
  }
  return null;
}
function linesFromIterable(ctx, v, fname) {
  if (ctx.isUnk(v)) return null;
  const items = ctx.iterable(v);
  if (items === null) { ctx.err('TypeError', fname + '() argument must be an iterable of strings', ''); return null; }
  const lines = [];
  for (const it of items) {
    if (typeof it !== 'string') { if (ctx.isUnk(it)) return null; ctx.err('TypeError', 'iterator should return strings, not ' + ctx.typeName(it), ''); return null; }
    lines.push(it);
  }
  return lines;
}
function streamOf(lines) {
  return lines.map((l) => (l.endsWith('\n') || l.endsWith('\r') ? l : l + '\n')).join('');
}

/* ---- ライターのフォーマッタ ---- */
export function formatCsvRow(ctx, values, params) {
  const { delimiter, quotechar, escapechar, doublequote, quoting, lineterminator } = params;
  const single = values.length === 1;
  const parts = values.map((v) => {
    let s, isStr = false, isNum = false, isNone = false;
    if (ctx.isNone(v)) { s = ''; isNone = true; }
    else if (typeof v === 'string') { s = v; isStr = true; }
    else if (ctx.isBool(v)) { s = v.v ? 'True' : 'False'; isNum = true; }
    else if (ctx.isNum(v)) { s = v.f ? floatReprOf(ctx, v.v) : String(v.v); isNum = true; }
    else if (ctx.isUnk(v)) return null;
    else { s = ctx.strOf(v); if (typeof s !== 'string') return null; }
    let quote = false;
    if (quoting === QUOTE_ALL) quote = true;
    else if (quoting === QUOTE_NONNUMERIC) quote = !isNum;
    else if (quoting === QUOTE_STRINGS) quote = isStr;
    else if (quoting === QUOTE_NOTNULL) quote = !isNone;
    else if (quoting === QUOTE_MINIMAL) {
      quote = (quotechar !== null && s.includes(quotechar)) || s.includes(delimiter) ||
        s.includes('\r') || s.includes('\n') || (single && s === '');
    }
    if (quoting === QUOTE_NONE) {
      let out = '';
      for (const ch of s) {
        if (ch === delimiter || (quotechar !== null && ch === quotechar) || ch === '\r' || ch === '\n' ||
            (escapechar !== null && ch === escapechar)) {
          if (escapechar === null) errCsv(ctx, 'need to escape, but no escapechar set');
          out += escapechar + ch;
        } else out += ch;
      }
      return out;
    }
    if (quote) {
      if (quotechar === null) { errCsv(ctx, 'quotechar must be set when quoting'); return null; }
      let body = '';
      for (const ch of s) {
        if (ch === quotechar) {
          if (doublequote) body += quotechar + quotechar;
          else if (escapechar !== null) body += escapechar + ch;
          else errCsv(ctx, 'need to escape, but no escapechar set');
        } else body += ch;
      }
      return quotechar + body + quotechar;
    }
    return s;
  });
  if (parts.some((p) => p === null)) return null;
  return parts.join(delimiter) + lineterminator;
}

const READER_Q = 'csv.csvreader';
const WRITER_Q = 'csv.csvwriter';
const DREADER_Q = 'csv.DictReader';
const DWRITER_Q = 'csv.DictWriter';

function dialectAttrs(paramsFn) {
  return {
    delimiter: (ctx, self) => paramsFn(self).delimiter,
    doublequote: (ctx, self) => BOOL(paramsFn(self).doublequote),
    escapechar: (ctx, self) => paramsFn(self).escapechar === null ? NONE : paramsFn(self).escapechar,
    quotechar: (ctx, self) => paramsFn(self).quotechar === null ? NONE : paramsFn(self).quotechar,
    quoting: (ctx, self) => I(paramsFn(self).quoting),
    skipinitialspace: (ctx, self) => BOOL(paramsFn(self).skipinitialspace),
    lineterminator: (ctx, self) => paramsFn(self).lineterminator,
    strict: (ctx, self) => BOOL(paramsFn(self).strict),
  };
}
const DIALECT_DEF = {
  typeName: 'Dialect',
  construct: (ctx, args, kwargs) => {
    const params = resolveDialect(ctx, dialectKwarg(ctx, args, kwargs, 0), kwargs, 'csv.Dialect');
    if (params === null) return unkRet(ctx, 'csv.Dialect の引数');
    return makeDialectVal(params);
  },
  repr: (ctx, self) => "<class 'csv.Dialect'>",
  attrs: dialectAttrs((self) => self.data.params),
};
function presetDialectDef(params, qualname) {
  return {
    typeName: qualname.split('.')[1],
    construct: (ctx, args, kwargs) => {
      const p = resolveDialect(ctx, makeDialectVal(params), kwargs, qualname);
      if (p === null) return unkRet(ctx, qualname + ' の引数');
      return makeDialectVal(p, qualname.split('.')[1]);
    },
    classAttrs: {
      delimiter: params.delimiter,
      doublequote: BOOL(params.doublequote),
      escapechar: params.escapechar === null ? NONE : params.escapechar,
      quotechar: params.quotechar === null ? NONE : params.quotechar,
      quoting: I(params.quoting),
      skipinitialspace: BOOL(params.skipinitialspace),
      lineterminator: params.lineterminator,
      strict: BOOL(params.strict),
    },
    attrs: dialectAttrs((self) => self.data.params),
  };
}

function makeReader(ctx, args, kwargs, fname) {
  const lines = linesFromIterable(ctx, args[0], fname);
  if (lines === null) return unkRet(ctx, fname + ' の入力');
  const params = resolveDialect(ctx, dialectKwarg(ctx, args, kwargs, 1), kwargs, fname);
  if (params === null) return unkRet(ctx, fname + ' の dialect');
  const { rows, rowLines } = parseCsvDetailed(ctx, streamOf(lines), params);
  /* reader は CPython どおりイテレータ自身である：エンジンのイテレータ値
   * （__iter／pos）としても振る舞うハイブリッド値にし、next()／iter()／
   * for／list() がすべて同じ消費位置（pos）を共有する。iter フックは
   * 残りの行を返して消費位置を末尾へ進める（list() 等の一括展開用で、
   * for／next はエンジンがイテレータ値として直接 pos を進める）。
   * kind は typeName() が isIter を先に見るため 'reader' に揃える。 */
  return {
    __native: READER_Q, mod: 'csv',
    data: { rows, rowLines, params },
    __iter: rows, kind: 'reader', pos: 0,
  };
}
function readerLineNum(self) {
  const pos = self.pos || 0;
  if (pos <= 0) return 0;
  const rl = self.data.rowLines;
  return rl[Math.min(pos, rl.length) - 1] || 0;
}
const READER_DEF = {
  typeName: 'reader',
  iter: (ctx, self) => {
    const rest = self.data.rows.slice(self.pos || 0);
    self.pos = self.data.rows.length;
    return rest;
  },
  methods: {
    __iter__: (ctx, self) => self,
    __next__: (ctx, self) => {
      const pos = self.pos || 0;
      if (pos >= self.data.rows.length) { ctx.err('StopIteration', '', ''); return UNK(''); }
      self.pos = pos + 1;
      return self.data.rows[pos];
    },
  },
  attrs: {
    dialect: (ctx, self) => makeDialectVal(self.data.params),
    line_num: (ctx, self) => I(readerLineNum(self)),
  },
};
function sinkList(ctx, v, fname) {
  if (ctx.isList(v)) return v;
  if (ctx.isUnk(v)) return null;
  ctx.err('TypeError', fname + ' の書き込み先にはリストを渡してください（本アプリでの代用。行文字列が追加されます）', '');
  return null;
}
function makeWriter(ctx, args, kwargs, fname) {
  const sink = sinkList(ctx, args[0], fname);
  if (sink === null) return unkRet(ctx, fname + ' の書き込み先');
  const params = resolveDialect(ctx, dialectKwarg(ctx, args, kwargs, 1), kwargs, fname);
  if (params === null) return unkRet(ctx, fname + ' の dialect');
  return { sink, params };
}
const WRITER_DEF = {
  typeName: 'writer',
  attrs: { dialect: (ctx, self) => makeDialectVal(self.data.params) },
  methods: {
    writerow: (ctx, self, args) => {
      const rowV = args[0];
      const items = ctx.iterable(rowV);
      if (items === null) { if (ctx.isUnk(rowV)) return unkRet(ctx, 'writerow の行'); ctx.err('TypeError', 'writerow() argument must be an iterable', ''); return UNK(''); }
      const line = formatCsvRow(ctx, items, self.data.params);
      if (line === null) return unkRet(ctx, 'writerow の値');
      self.data.sink.__list.push(line);
      return I([...line].length);
    },
    writerows: (ctx, self, args) => {
      const rows = ctx.iterable(args[0]);
      if (rows === null) return unkRet(ctx, 'writerows の入力');
      for (const r of rows) {
        const items = ctx.iterable(r);
        if (items === null) return unkRet(ctx, 'writerows の行');
        const line = formatCsvRow(ctx, items, self.data.params);
        if (line === null) return unkRet(ctx, 'writerows の値');
        self.data.sink.__list.push(line);
      }
      return NONE;
    },
  },
};
function writerVal(sink, params) {
  return { __native: WRITER_Q, mod: 'csv', data: { sink, params } };
}
const DREADER_DEF = {
  typeName: 'DictReader',
  construct: (ctx, args, kwargs) => {
    const lines = linesFromIterable(ctx, args[0], 'csv.DictReader');
    if (lines === null) return unkRet(ctx, 'DictReader の入力');
    const params = resolveDialect(ctx, dialectKwarg(ctx, args, kwargs, 1), paramKwargs(kwargs), 'csv.DictReader');
    if (params === null) return unkRet(ctx, 'DictReader の dialect');
    const rows = parseCsvText(ctx, streamOf(lines), params);
    let fieldnames = null;
    const fnV = args.length > 1 ? args[1] : kwargs.fieldnames;
    if (fnV !== undefined && !ctx.isNone(fnV)) {
      if (ctx.isUnk(fnV)) return unkRet(ctx, 'fieldnames');
      const f = ctx.iterable(fnV);
      if (f === null) return unkRet(ctx, 'fieldnames');
      fieldnames = f;
    }
    let dataRows = rows;
    if (fieldnames === null) {
      if (rows.length) { fieldnames = rows[0].__list; dataRows = rows.slice(1); }
      else fieldnames = null;
    }
    const restkey = args.length > 2 ? args[2] : ('restkey' in kwargs ? kwargs.restkey : NONE);
    const restval = args.length > 3 ? args[3] : ('restval' in kwargs ? kwargs.restval : NONE);
    const dicts = [];
    if (fieldnames !== null) {
      for (const rowV of dataRows) {
        const row = rowV.__list;
        if (row.length === 0) continue; // DictReader は空行を飛ばす
        const entries = [];
        for (let k = 0; k < fieldnames.length; k++) {
          entries.push([fieldnames[k], k < row.length ? row[k] : restval]);
        }
        if (row.length > fieldnames.length) entries.push([restkey, LIST(row.slice(fieldnames.length))]);
        dicts.push(makeDictFrom(entries));
      }
    }
    return { __native: DREADER_Q, mod: 'csv', data: { dicts, fieldnames, params } };
  },
  iter: (ctx, self) => self.data.dicts,
  attrs: {
    fieldnames: (ctx, self) => self.data.fieldnames === null ? NONE : LIST(self.data.fieldnames),
    dialect: (ctx, self) => makeDialectVal(self.data.params),
  },
};
const DWRITER_DEF = {
  typeName: 'DictWriter',
  construct: (ctx, args, kwargs) => {
    const sink = sinkList(ctx, args[0], 'csv.DictWriter');
    if (sink === null) return unkRet(ctx, 'DictWriter の書き込み先');
    const fnV = args.length > 1 ? args[1] : kwargs.fieldnames;
    const fieldnames = fnV !== undefined && !ctx.isNone(fnV) ? ctx.iterable(fnV) : null;
    if (fieldnames === null) { if (ctx.isUnk(fnV)) return unkRet(ctx, 'fieldnames'); ctx.err('TypeError', 'DictWriter() requires the fieldnames argument', ''); return UNK(''); }
    const params = resolveDialect(ctx, dialectKwarg(ctx, args, kwargs, 2), paramKwargs(kwargs), 'csv.DictWriter');
    if (params === null) return unkRet(ctx, 'DictWriter の dialect');
    const restval = 'restval' in kwargs ? kwargs.restval : '';
    const extrasaction = 'extrasaction' in kwargs && typeof kwargs.extrasaction === 'string' ? kwargs.extrasaction : 'raise';
    return { __native: DWRITER_Q, mod: 'csv', data: { sink, params, fieldnames, restval, extrasaction } };
  },
  attrs: { dialect: (ctx, self) => makeDialectVal(self.data.params) },
  methods: {
    writeheader: (ctx, self, args) => {
      const line = formatCsvRow(ctx, self.data.fieldnames, self.data.params);
      if (line === null) return unkRet(ctx, 'writeheader');
      self.data.sink.__list.push(line);
      return I([...line].length);
    },
    writerow: (ctx, self, args) => {
      const d = args[0];
      if (!ctx.isDict(d)) { if (ctx.isUnk(d)) return unkRet(ctx, 'writerow の辞書'); ctx.err('TypeError', 'writerow() argument must be a dict', ''); return UNK(''); }
      const values = self.data.fieldnames.map((name) => {
        const v = ctx.isDict(d) ? (PyDictLookup(ctx, d, name)) : undefined;
        return v === undefined ? self.data.restval : v;
      });
      // extrasaction チェック
      if (self.data.extrasaction === 'raise') {
        for (const e of d.__dict.values()) {
          if (!self.data.fieldnames.some((f) => ctx.eq(f, e.k) === true || f === e.k)) {
            ctx.err('ValueError', "dict contains fields not in fieldnames: '" + (typeof e.k === 'string' ? e.k : ctx.strOf(e.k)) + "'", '');
          }
        }
      }
      const line = formatCsvRow(ctx, values, self.data.params);
      if (line === null) return unkRet(ctx, 'writerow の値');
      self.data.sink.__list.push(line);
      return I([...line].length);
    },
    writerows: (ctx, self, args) => {
      const rows = ctx.iterable(args[0]);
      if (rows === null) return unkRet(ctx, 'writerows の入力');
      for (const r of rows) {
        const m = DWRITER_DEF.methods.writerow(ctx, self, [r]);
        if (ctx.isUnk(m)) return m;
      }
      return NONE;
    },
  },
};
function PyDictLookup(ctx, d, key) {
  for (const e of d.__dict.values()) if (e.k === key || (typeof key === 'string' && e.k === key)) return e.v;
  return undefined;
}
const SNIFFER_DEF = {
  typeName: 'Sniffer',
  construct: (ctx, args, kwargs) => ({ __native: 'csv.Sniffer', mod: 'csv', data: {} }),
  attrs: {
    preferred: (ctx, self) => LIST([',', '\t', ';', ' ', ':']),
  },
  methods: {
    sniff: unverifiedFn('csv.Sniffer.sniff', '区切り文字の判定ヒューリスティクスの再現範囲を確定できない'),
    has_header: unverifiedFn('csv.Sniffer.has_header', 'ヘッダー判定ヒューリスティクスの再現範囲を確定できない'),
  },
};

registerStdlibModule('csv', {
  data: {
    QUOTE_MINIMAL: I(QUOTE_MINIMAL), QUOTE_ALL: I(QUOTE_ALL), QUOTE_NONNUMERIC: I(QUOTE_NONNUMERIC),
    QUOTE_NONE: I(QUOTE_NONE), QUOTE_STRINGS: I(QUOTE_STRINGS), QUOTE_NOTNULL: I(QUOTE_NOTNULL),
  },
  functions: {
    reader: (ctx, args, kwargs) => makeReader(ctx, args, kwargs, 'csv.reader'),
    writer: (ctx, args, kwargs) => {
      const w = makeWriter(ctx, args, kwargs, 'csv.writer');
      if (!w || !w.sink) return w;
      return writerVal(w.sink, w.params);
    },
    field_size_limit: (ctx, args, kwargs) => {
      const old = fieldSizeLimit;
      if (args.length >= 1 && !ctx.isNone(args[0])) {
        const n = ctx.int(args[0]);
        if (n === null) return unkRet(ctx, 'field_size_limit の引数');
        fieldSizeLimit = n;
      }
      return I(old);
    },
    register_dialect: (ctx, args, kwargs) => {
      const name = args[0];
      if (typeof name !== 'string') { ctx.err('TypeError', 'dialect name must be a string', ''); return UNK(''); }
      let val;
      const dv = args.length > 1 ? args[1] : ('dialect' in kwargs ? kwargs.dialect : undefined);
      if (dv !== undefined && !ctx.isNone(dv)) {
        if (dv.__native === DIALECT_Q) val = dv;
        else if (dv.__ncls && CLASS_PARAMS[dv.__ncls]) val = makeDialectVal(CLASS_PARAMS[dv.__ncls], name);
        else if (ctx.isUnk(dv)) return unkRet(ctx, 'register_dialect の dialect');
        else { ctx.err('TypeError', 'dialect must be a Dialect class or instance', ''); return UNK(''); }
        const params = resolveDialect(ctx, dv, kwargs, 'csv.register_dialect');
        if (params === null) return unkRet(ctx, 'register_dialect の引数');
        val = makeDialectVal(params, name);
      } else {
        const params = resolveDialect(ctx, undefined, kwargs, 'csv.register_dialect');
        if (params === null) return unkRet(ctx, 'register_dialect の引数');
        val = makeDialectVal(params, name);
      }
      dialectRegistry.set(name, val);
      return NONE;
    },
    unregister_dialect: (ctx, args, kwargs) => {
      const name = args[0];
      if (!dialectRegistry.has(name)) { ctx.err('csv.Error', 'unknown dialect', ''); return UNK(''); }
      dialectRegistry.delete(name);
      return NONE;
    },
    get_dialect: (ctx, args, kwargs) => {
      const name = args[0];
      const d = dialectRegistry.get(name);
      if (!d) { ctx.err('csv.Error', 'unknown dialect', ''); return UNK(''); }
      return d;
    },
    list_dialects: (ctx, args, kwargs) => LIST([...dialectRegistry.keys()]),
  },
  classes: {
    Dialect: DIALECT_DEF,
    excel: presetDialectDef(EXCEL, 'csv.excel'),
    excel_tab: presetDialectDef(EXCEL_TAB, 'csv.excel_tab'),
    unix_dialect: presetDialectDef(UNIX, 'csv.unix_dialect'),
    DictReader: DREADER_DEF,
    DictWriter: DWRITER_DEF,
    Sniffer: SNIFFER_DEF,
    Error: { typeName: 'Error', exc: 'csv.Error', excParents: ['Exception'] },
  },
});
export { READER_DEF, WRITER_DEF };
// reader/writer はクラスではなく関数が返すオブジェクトだが、反復・属性解決のために
// クラス定義として登録しておく（限定名は csv.csvreader / csv.csvwriter）
import { registerStdlibClass } from './stdlib-registry.js';
registerStdlibClass(READER_Q, READER_DEF);
registerStdlibClass(WRITER_Q, WRITER_DEF);
