/* 高度モード B7 G7: tomllib モジュール。
* loads を TOML 1.0 のパーサとして実装（文字列／数値／真偽値／配列／テーブル／
* インラインテーブル／複数行文字列）。エラーは TOMLDecodeError（ValueError 子）
* で CPython 3.12.3 実走の文面・位置形式に合わせる。日時値は対応する datetime
* 実装が自群に無いため UNK 値にする（パース検証自体は行う）。load はバイナリ
* ファイル前提のため未対応。TOMLDecodeError の属性は例外値の制約で未検証。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  I, F, BOOL, NONE, LIST, UNK, makeBytesVal, bytesArr, unkRet, unsupportedFn, makeDictFrom,
} from './impl-advanced-g7-common.js';

class TomlErr extends Error {
  constructor(msg, pos) { super(msg); this.msg = msg; this.pos = pos; }
}
function parseToml(ctx, text) {
  let pos = 0;
  const n = text.length;
  const fail = (msg, at) => { throw new TomlErr(msg, at === undefined ? pos : at); };
  // 作業ツリー：{kind:'table', map:Map, defined, immutable} / {kind:'arrtab', list} / {kind:'val', v}
  const root = { kind: 'table', map: new Map(), defined: true, immutable: false };
  let current = root;

  const isWs = (c) => c === ' ' || c === '\t';
  function skipWs() { while (pos < n && isWs(text[pos])) pos++; }
  function skipWsCommentNewline() {
    while (pos < n) {
      const c = text[pos];
      if (c === ' ' || c === '\t' || c === '\n') { pos++; continue; }
      if (c === '\r' && text[pos + 1] === '\n') { pos += 2; continue; }
      if (c === '#') { while (pos < n && text[pos] !== '\n') pos++; continue; }
      break;
    }
  }
  function expectEndOfStatement() {
    skipWs();
    if (pos < n && text[pos] === '#') { while (pos < n && text[pos] !== '\n') pos++; }
    if (pos >= n) return;
    if (text[pos] === '\n') { pos++; return; }
    if (text[pos] === '\r' && text[pos + 1] === '\n') { pos += 2; return; }
    fail('Expected newline or end of document after a statement');
  }
  function parseKeyPart() {
    skipWs();
    if (pos >= n) fail('Invalid statement');
    const c = text[pos];
    if (c === '"' || c === "'") {
      const [s, end] = parseStringBasicOrLiteral(true);
      pos = end;
      return s;
    }
    const m = /^[A-Za-z0-9_-]+/.exec(text.slice(pos));
    if (!m) fail('Invalid statement');
    pos += m[0].length;
    return m[0];
  }
  function parseKey() {
    const parts = [parseKeyPart()];
    while (true) {
      skipWs();
      if (text[pos] === '.') { pos++; parts.push(parseKeyPart()); continue; }
      break;
    }
    return parts;
  }
  function parseStringBasicOrLiteral(singleLineOnly) {
    const start = pos;
    const quote = text[pos];
    const isBasic = quote === '"';
    const triple = text.startsWith(quote.repeat(3), pos);
    if (triple) {
      let i = pos + 3;
      if (text[i] === '\n') i++;
      else if (text[i] === '\r' && text[i + 1] === '\n') i += 2;
      let out = '';
      while (i < n) {
        if (text.startsWith(quote.repeat(3), i)) {
          // 追加の引用符（最大2つまで本文として許容）
          let extra = 0;
          while (text[i + 3 + extra] === quote && extra < 2) extra++;
          out += quote.repeat(extra);
          return [out, i + 3 + extra];
        }
        const ch = text[i];
        if (isBasic && ch === '\\') {
          // 行末バックスラッシュ: 後続の空白と改行を除去
          let j = i + 1;
          let k = j;
          while (k < n && (text[k] === ' ' || text[k] === '\t')) k++;
          if (text[k] === '\n' || (text[k] === '\r' && text[k + 1] === '\n')) {
            k = text[k] === '\r' ? k + 2 : k + 1;
            while (k < n && (text[k] === ' ' || text[k] === '\t' || text[k] === '\n' || text[k] === '\r')) k++;
            i = k;
            continue;
          }
          const [rep, adv] = escapeAt(i);
          out += rep; i += adv; continue;
        }
        out += ch;
        i++;
      }
      fail('Unterminated string', n);
    }
    // 単一行
    let i = pos + 1;
    let out = '';
    while (i < n) {
      const ch = text[i];
      if (ch === quote) return [out, i + 1];
      if (ch === '\n') fail('Unterminated string', i);
      if (isBasic && ch === '\\') {
        const [rep, adv] = escapeAt(i);
        out += rep; i += adv; continue;
      }
      if (isBasic && ch < ' ' && ch !== '\t') fail('Illegal character in string', i);
      out += ch;
      i++;
    }
    fail('Unterminated string', n);
  }
  function escapeAt(i) {
    const e = text[i + 1];
    const simple = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' };
    if (e in simple) return [simple[e], 2];
    if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) return [String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16)), 6];
    if (e === 'U' && /^[0-9a-fA-F]{8}$/.test(text.slice(i + 2, i + 10))) return [String.fromCodePoint(parseInt(text.slice(i + 2, i + 10), 16)), 10];
    fail('Invalid escape sequence', i);
    return ['', 2];
  }
  const RE_DATETIME = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})?/;
  const RE_DATE = /^\d{4}-\d{2}-\d{2}/;
  const RE_TIME = /^\d{2}:\d{2}:\d{2}(\.\d+)?/;
  function parseValue() {
    skipWs();
    if (pos >= n) fail('Invalid value', n);
    const c = text[pos];
    if (c === '"' || c === "'") {
      const [s, end] = parseStringBasicOrLiteral(false);
      pos = end;
      return { kind: 'val', v: s };
    }
    if (c === '[') return parseArray();
    if (c === '{') return parseInlineTable();
    // 日時
    const rest = text.slice(pos);
    let m = RE_DATETIME.exec(rest) || RE_DATE.exec(rest) || RE_TIME.exec(rest);
    if (m) {
      pos += m[0].length;
      ctx.diag('tomllib：日時値は対応する datetime 実装が自群に無いため未確定値として扱います');
      return { kind: 'val', v: UNK('TOML の日時値（未検証）') };
    }
    // 真偽値
    if (rest.startsWith('true') && !/[A-Za-z0-9_-]/.test(rest[4] || '')) { pos += 4; return { kind: 'val', v: BOOL(true) }; }
    if (rest.startsWith('false') && !/[A-Za-z0-9_-]/.test(rest[5] || '')) { pos += 5; return { kind: 'val', v: BOOL(false) }; }
    // 数値
    m = /^[+-]?(inf|nan)/.exec(rest);
    if (m) {
      pos += m[0].length;
      const val = m[1] === 'nan' ? NaN : (m[0].startsWith('-') ? -Infinity : Infinity);
      return { kind: 'val', v: F(val) };
    }
    m = /^[+-]?0x[0-9a-fA-F](_?[0-9a-fA-F])*/.exec(rest);
    if (m) { pos += m[0].length; return intVal(parseInt(m[0].replace(/^[+-]?0x/, '').replace(/_/g, ''), 16) * (m[0].startsWith('-') ? -1 : 1)); }
    m = /^[+-]?0o[0-7](_?[0-7])*/.exec(rest);
    if (m) { pos += m[0].length; return intVal(parseInt(m[0].replace(/^[+-]?0o/, '').replace(/_/g, ''), 8) * (m[0].startsWith('-') ? -1 : 1)); }
    m = /^[+-]?0b[01](_?[01])*/.exec(rest);
    if (m) { pos += m[0].length; return intVal(parseInt(m[0].replace(/^[+-]?0b/, '').replace(/_/g, ''), 2) * (m[0].startsWith('-') ? -1 : 1)); }
    m = /^[+-]?(0|[1-9](_?\d)*)(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?/.exec(rest);
    if (m) {
      const tok = m[0];
      pos += tok.length;
      if (/[.eE]/.test(tok)) return { kind: 'val', v: F(Number(tok.replace(/_/g, ''))) };
      return intVal(Number(tok.replace(/_/g, '')));
    }
    fail('Invalid value');
    return null;
  }
  function intVal(v) {
    if (Number.isSafeInteger(v)) return { kind: 'val', v: I(v) };
    ctx.diag('tomllib：安全整数を超える整数は未確定値として扱います');
    return { kind: 'val', v: UNK('大きな整数（未検証）') };
  }
  function parseArray() {
    pos++; // [
    const items = [];
    while (true) {
      skipWsCommentNewline();
      if (pos >= n) fail('Invalid value', n);
      if (text[pos] === ']') { pos++; return { kind: 'val', v: LIST(items.map((it) => it.v !== undefined ? it.v : treeToValue(it))) }; }
      const val = parseValue();
      items.push(val.kind === 'val' ? val : { v: treeToValue(val) });
      skipWsCommentNewline();
      if (text[pos] === ',') { pos++; continue; }
      if (text[pos] === ']') { pos++; return { kind: 'val', v: LIST(items.map((it) => it.v)) }; }
      fail("Expected ']' at the end of an array");
    }
  }
  function parseInlineTable() {
    pos++; // {
    const table = { kind: 'table', map: new Map(), defined: true, immutable: false };
    skipWs();
    if (text[pos] === '}') { pos++; table.immutable = true; return table; }
    while (true) {
      const key = parseKey();
      skipWs();
      if (text[pos] !== '=') fail("Expected '=' after a key");
      pos++;
      const val = parseValue();
      assignKey(table, key, val, true);
      skipWs();
      if (text[pos] === ',') {
        pos++;
        skipWs();
        if (text[pos] === '}') fail('Invalid statement');
        continue;
      }
      if (text[pos] === '}') { pos++; table.immutable = true; return table; }
      fail("Expected '}' at the end of an inline table");
    }
  }
  function descend(container, keyParts, createTables, forHeader) {
    let node = container;
    for (let i = 0; i < keyParts.length; i++) {
      const part = keyParts[i];
      if (node.kind === 'arrtab') node = node.list[node.list.length - 1];
      if (node.kind !== 'table') fail('Cannot overwrite a value');
      if (node.immutable) fail('Cannot mutate an immutable value');
      let child = node.map.get(part);
      if (child === undefined) {
        if (!createTables) fail('Cannot overwrite a value');
        child = { kind: 'table', map: new Map(), defined: false, immutable: false };
        node.map.set(part, child);
      }
      node = child;
    }
    return node;
  }
  function assignKey(container, keyParts, val, inInline) {
    const parent = keyParts.length > 1 ? descend(container, keyParts.slice(0, -1), true, false) : container;
    if (parent.kind === 'arrtab') fail('Cannot overwrite a value');
    const last = keyParts[keyParts.length - 1];
    if (parent.immutable) fail('Cannot mutate an immutable value');
    const existing = parent.map.get(last);
    if (existing !== undefined) {
      // 未定義の中間テーブルへ値テーブルを割り当てる場合のみ許可
      if (!(existing.kind === 'table' && !existing.defined && val.kind === 'table')) fail('Cannot overwrite a value');
    }
    parent.map.set(last, val);
  }
  function treeToValue(node) {
    if (node.kind === 'val') return node.v;
    if (node.kind === 'arrtab') return LIST(node.list.map(treeToValue));
    const entries = [];
    for (const [k, child] of node.map.entries()) entries.push([k, treeToValue(child)]);
    return makeDictFrom(entries);
  }

  skipWsCommentNewline();
  while (pos < n) {
    if (text[pos] === '[') {
      const isArray = text[pos + 1] === '[';
      pos += isArray ? 2 : 1;
      const key = parseKey();
      skipWs();
      if (isArray) {
        if (!(text[pos] === ']' && text[pos + 1] === ']')) fail("Expected ']]' at the end of an array table declaration");
        pos += 2;
        const parent = key.length > 1 ? descend(root, key.slice(0, -1), true, true) : root;
        const last = key[key.length - 1];
        let arr = parent.map.get(last);
        if (arr === undefined) { arr = { kind: 'arrtab', list: [] }; parent.map.set(last, arr); }
        if (arr.kind !== 'arrtab') fail('Cannot overwrite a value');
        const elem = { kind: 'table', map: new Map(), defined: true, immutable: false };
        arr.list.push(elem);
        current = elem;
      } else {
        if (text[pos] !== ']') fail("Expected ']' at the end of a table declaration");
        pos++;
        const parent = key.length > 1 ? descend(root, key.slice(0, -1), true, true) : root;
        const last = key[key.length - 1];
        let tbl = parent.map.get(last);
        if (tbl === undefined) { tbl = { kind: 'table', map: new Map(), defined: false, immutable: false }; parent.map.set(last, tbl); }
        if (tbl.kind === 'arrtab') { current = tbl.list[tbl.list.length - 1]; }
        else if (tbl.kind === 'table') {
          if (tbl.defined) fail("Cannot declare '" + key.join('.') + "' twice");
          tbl.defined = true;
          current = tbl;
        } else fail('Cannot overwrite a value');
      }
      expectEndOfStatement();
    } else {
      const key = parseKey();
      skipWs();
      if (text[pos] !== '=') fail("Expected '=' after a key");
      pos++;
      const val = parseValue();
      assignKey(current, key, val, false);
      expectEndOfStatement();
    }
    skipWsCommentNewline();
  }
  return treeToValue(root);
}

registerStdlibModule('tomllib', {
  functions: {
    loads: (ctx, args, kwargs) => {
      let text = args[0];
      if (typeof text !== 'string') {
        const a = bytesArr(text);
        if (a !== null) text = new TextDecoder('utf-8').decode(new Uint8Array(a));
        else if (ctx.isUnk(text)) return unkRet(ctx, 'tomllib.loads の入力');
        else { ctx.err('TypeError', 'loads() argument must be str', ''); return UNK(''); }
      }
      try {
        return parseToml(ctx, text);
      } catch (e) {
        if (e instanceof TomlErr) {
          let line = 1, lastNl = -1;
          for (let i = 0; i < e.pos && i < text.length; i++) if (text[i] === '\n') { line++; lastNl = i; }
          const col = e.pos - lastNl;
          const where = e.pos >= text.length ? ' (at end of document)' : ' (at line ' + line + ', column ' + col + ')';
          ctx.err('tomllib.TOMLDecodeError', e.msg + where, '');
          return UNK('');
        }
        throw e;
      }
    },
    load: unsupportedFn('tomllib.load', 'バイナリファイルからの読み込みを前提とするため'),
  },
  classes: {
    TOMLDecodeError: { typeName: 'TOMLDecodeError', exc: 'tomllib.TOMLDecodeError', excParents: ['ValueError'] },
  },
});
export {};
