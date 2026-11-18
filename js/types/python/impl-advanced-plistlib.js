/* 高度モード B7 G7: plistlib モジュール。
* loads/dumps は XML 形式を実装。バイナリ形式（bplist00）は未検証に倒す
* （loads は UNK、dumps(fmt=FMT_BINARY) は UNK）。日付値は対応する datetime
* 実装が自群に無いため UNK。dump/load はファイル前提のため未対応。
* FMT_XML/FMT_BINARY は通常の Enum（int とは等しくならない）として表現する。 */
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';

registerStdlibClass('plistlib.PlistFormat', {
  typeName: 'PlistFormat',
  repr: (ctx, self) => '<PlistFormat.' + self.data.name + ': ' + self.data.value + '>',
  str: (ctx, self) => 'PlistFormat.' + self.data.name,
  eq: (ctx, self, other) => !!(other && other.__native === 'plistlib.PlistFormat' && other.data.name === self.data.name),
  hash: (ctx, self) => self.data.value + 7919,
});
import {
  I, F, BOOL, UNK, LIST, makeBytesVal, isBytesVal, bytesArr, unkRet, unsupportedFn, unverifiedFn,
  makeDictFrom, kwBool, kwVal, encodeStrToBytes,
} from './impl-advanced-g7-common.js';
import { b64EncodeArr, b64DecodeStr } from './impl-advanced-binascii.js';

const UID_Q = 'plistlib.UID';
const FMT_Q = 'plistlib.PlistFormat';
function fmtVal(name, value) {
  return {
    __native: FMT_Q, mod: 'plistlib', typeName: 'PlistFormat',
    data: { name, value },
    reprStr: '<PlistFormat.' + name + ': ' + value + '>',
  };
}
const FMT_XML = fmtVal('FMT_XML', 1);
const FMT_BINARY = fmtVal('FMT_BINARY', 2);

function xmlEscapeText(s) {
  let out = '';
  for (const ch of s) {
    if (ch === '&') out += '&amp;';
    else if (ch === '<') out += '&lt;';
    else if (ch === '>') out += '&gt;';
    else {
      const cp = ch.codePointAt(0);
      if (cp < 0x20 && ch !== '\t' && ch !== '\n' && ch !== '\r') out += '&#' + cp + ';';
      else out += ch;
    }
  }
  return out;
}
function writeValue(ctx, v, indent, sortKeys, skipkeys, lines) {
  const pad = '\t'.repeat(indent);
  if (typeof v === 'string') { lines.push(pad + '<string>' + xmlEscapeText(v) + '</string>'); return; }
  if (ctx.isBool(v)) { lines.push(pad + (v.v ? '<true/>' : '<false/>')); return; }
  if (ctx.isNum(v)) {
    if (!v.f) lines.push(pad + '<integer>' + String(v.v) + '</integer>');
    else lines.push(pad + '<real>' + ctx.repr(v) + '</real>');
    return;
  }
  if (bytesArr(v) !== null) {
    const b64 = b64EncodeArr(bytesArr(v));
    lines.push(pad + '<data>');
    for (let i = 0; i < b64.length; i += 76) lines.push(pad + '\t' + b64.slice(i, i + 76));
    lines.push(pad + '</data>');
    return;
  }
  if (v && v.__native === UID_Q) { ctx.err('TypeError', "unsupported type: <class 'plistlib.UID'>", ''); return; }
  if (ctx.isDict(v)) {
    const entries = [...v.__dict.values()].map((e) => [e.k, e.v]);
    let keys = entries.map(([k]) => k);
    for (const k of keys) {
      if (typeof k !== 'string') {
        if (skipkeys) continue;
        ctx.err('TypeError', 'keys must be strings', ''); return;
      }
    }
    if (sortKeys) keys = [...keys].sort();
    if (entries.length === 0) { lines.push(pad + '<dict/>'); return; }
    lines.push(pad + '<dict>');
    const map = new Map(entries);
    for (const k of keys) {
      lines.push(pad + '\t<key>' + xmlEscapeText(k) + '</key>');
      writeValue(ctx, map.get(k), indent + 1, sortKeys, skipkeys, lines);
    }
    lines.push(pad + '</dict>');
    return;
  }
  if (ctx.isList(v) || ctx.isTuple(v)) {
    const items = ctx.listOf(v);
    if (items.length === 0) { lines.push(pad + '<array/>'); return; }
    lines.push(pad + '<array>');
    for (const it of items) writeValue(ctx, it, indent + 1, sortKeys, skipkeys, lines);
    lines.push(pad + '</array>');
    return;
  }
  if (ctx.isUnk(v)) { ctx.diag('plistlib.dumps：未確定値を含むため全体を未確定値として扱います'); throw { __g7unk: true }; }
  ctx.err('TypeError', 'unsupported type: ' + ctx.typeName(v), '');
}
function xmlUnescape(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (w, body) => {
    if (body === 'amp') return '&';
    if (body === 'lt') return '<';
    if (body === 'gt') return '>';
    if (body === 'quot') return '"';
    if (body === 'apos') return "'";
    if (body[1] === 'x') return String.fromCodePoint(parseInt(body.slice(2), 16));
    return String.fromCodePoint(parseInt(body.slice(1), 10));
  });
}
function parseXmlTree(text) {
  const tokens = text.match(/<[^>]*>|[^<]+/g) || [];
  let i = 0;
  function parseElement() {
    while (i < tokens.length && !tokens[i].startsWith('<')) i++;
    // tokens[i] は開始タグ
    const tagToken = tokens[i++];
    const m = /^<\s*([A-Za-z0-9_.-]+)/.exec(tagToken);
    if (!m) return null;
    const tag = m[1];
    if (tagToken.endsWith('/>')) return { tag, children: [], text: '' };
    let textContent = '';
    const children = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.startsWith('</')) { i++; return { tag, children, text: textContent }; }
      if (t.startsWith('<')) { const child = parseElement(); if (child) children.push(child); continue; }
      textContent += t;
      i++;
    }
    return { tag, children, text: textContent };
  }
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.startsWith('<plist')) { i++; break; }
    i++;
  }
  if (i >= tokens.length) return null;
  return parseElement();
}
function elementToValue(ctx, el) {
  switch (el.tag) {
    case 'dict': {
      const entries = [];
      for (let j = 0; j + 1 < el.children.length; j += 2) {
        const keyEl = el.children[j];
        if (keyEl.tag !== 'key') continue;
        entries.push([xmlUnescape(keyEl.text), elementToValue(ctx, el.children[j + 1])]);
      }
      return makeDictFrom(entries);
    }
    case 'array': return LIST(el.children.map((c) => elementToValue(ctx, c)));
    case 'string': return xmlUnescape(el.text);
    case 'integer': {
      const v = Number(el.text.trim());
      if (Number.isSafeInteger(v)) return I(v);
      ctx.diag('plistlib.loads：安全整数を超える整数は未確定値として扱います');
      return UNK('大きな整数（未検証）');
    }
    case 'real': {
      const t = el.text.trim().toLowerCase();
      if (t === 'nan') return F(NaN);
      if (t === 'inf' || t === '+inf' || t === 'infinity' || t === '+infinity') return F(Infinity);
      if (t === '-inf' || t === '-infinity') return F(-Infinity);
      return F(Number(t));
    }
    case 'true': return BOOL(true);
    case 'false': return BOOL(false);
    case 'data': return makeBytesVal(b64DecodeStr(el.text.replace(/\s+/g, ''), false, (m) => ctx.err('plistlib.InvalidFileException', m, '')));
    case 'date':
      ctx.diag('plistlib.loads：日付値は対応する datetime 実装が自群に無いため未確定値として扱います');
      return UNK('plist の日付値（未検証）');
    default:
      ctx.err('plistlib.InvalidFileException', 'Invalid file', '');
      return UNK('');
  }
}

const UID_DEF = {
  typeName: 'UID',
  construct: (ctx, args) => {
    const v = args[0];
    if (!ctx.isNum(v) || v.f) { ctx.err('TypeError', 'UID argument must be int', ''); return { __native: UID_Q, mod: 'plistlib', data: { data: 0 } }; }
    if (v.v < 0) { ctx.err('ValueError', 'UIDs cannot be negative', ''); }
    return { __native: UID_Q, mod: 'plistlib', data: { data: v.v } };
  },
  attrs: { data: (ctx, self) => I(self.data.data) },
  repr: (ctx, self) => 'UID(' + String(self.data.data) + ')',
  eq: (ctx, self, other) => !!(other && other.__native === UID_Q && other.data.data === self.data.data),
  hash: (ctx, self) => self.data.data,
};

registerStdlibModule('plistlib', {
  data: { FMT_XML, FMT_BINARY },
  functions: {
    loads: (ctx, args) => {
      const a = bytesArr(args[0]);
      if (a === null) {
        if (ctx.isUnk(args[0])) return unkRet(ctx, 'plistlib.loads の入力');
        ctx.err('TypeError', "a bytes-like object is required, not '" + ctx.typeName(args[0]) + "'", '');
        return UNK('');
      }
      if (a.length >= 8 && String.fromCharCode(...a.slice(0, 8)) === 'bplist00') {
        ctx.diag('plistlib.loads：バイナリ形式（bplist00）の解析は未検証のため未確定値として扱います');
        return UNK('バイナリ plist（未検証）');
      }
      const text = new TextDecoder('utf-8').decode(new Uint8Array(a));
      const rootEl = parseXmlTree(text);
      if (!rootEl) { ctx.err('plistlib.InvalidFileException', 'Invalid file', ''); return UNK(''); }
      return elementToValue(ctx, rootEl);
    },
    dumps: (ctx, args, kwargs) => {
      const fmt = kwVal(kwargs, 'fmt') !== undefined ? kwVal(kwargs, 'fmt') : (args[1] !== undefined ? args[1] : FMT_XML);
      if (fmt && fmt.__native === FMT_Q && fmt.data.name === 'FMT_BINARY') {
        ctx.diag('plistlib.dumps：バイナリ形式の生成は未検証のため未確定値として扱います');
        return UNK('バイナリ plist（未検証）');
      }
      if (!(fmt && fmt.__native === FMT_Q)) {
        ctx.err('ValueError', 'Unsupported format: ' + ctx.repr(fmt), '');
        return UNK('');
      }
      const sortKeys = kwBool(ctx, kwargs, 'sort_keys', args[2], true);
      const skipkeys = kwBool(ctx, kwargs, 'skipkeys', undefined, false);
      const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0">',
      ];
      try {
        writeValue(ctx, args[0], 0, sortKeys, skipkeys, lines);
      } catch (e) {
        if (e && e.__g7unk) return UNK('plistlib.dumps の結果（未検証）');
        throw e;
      }
      lines.push('</plist>');
      return makeBytesVal(encodeStrToBytes(lines.join('\n') + '\n', 'utf-8', 'strict').arr);
    },
    load: unsupportedFn('plistlib.load', 'ファイルオブジェクトからの読み込みを前提とするため'),
    dump: unsupportedFn('plistlib.dump', 'ファイルオブジェクトへの書き込みを前提とするため'),
  },
  classes: {
    UID: UID_DEF,
    InvalidFileException: { typeName: 'InvalidFileException', exc: 'plistlib.InvalidFileException', excParents: ['ValueError'] },
  },
});
export { FMT_XML, FMT_BINARY };
