/* 高度モード B7 G7: html モジュール（escape/unescape）。
* unescape は CPython Lib/html/__init__.py の意味論（数値参照の不正値置換表、
* html5 実体表の前方一致）どおりに実装し、実走照合済み。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { unkRet, kwBool } from './impl-advanced-g7-common.js';
import { HTML5_ENTITIES } from './impl-advanced-html-entities.js';

export function htmlEscape(s, quote = true) {
  let out = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (quote) out = out.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return out;
}
/* 数値文字参照の不正値置換（HTML 仕様の表。CPython html._invalid_charrefs 相当） */
const INVALID_CHARREFS = {
  0x00: '�', 0x0d: '\r',
  0x80: '€', 0x81: '\x81', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8d: '\x8d', 0x8e: 'Ž', 0x8f: '\x8f',
  0x90: '\x90', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9d: '\x9d', 0x9e: 'ž', 0x9f: 'Ÿ',
};
const CHARREF_RE = /&(#[0-9]+;?|#[xX][0-9a-fA-F]+;?|[^\t\n\f <&#;]{1,32};?)/g;
export function htmlUnescape(s) {
  if (!s.includes('&')) return s;
  return s.replace(CHARREF_RE, (whole, body) => {
    if (body[0] === '#') {
      let num;
      if (body[1] === 'x' || body[1] === 'X') num = parseInt(body.slice(2).replace(/;$/, ''), 16);
      else num = parseInt(body.slice(1).replace(/;$/, ''), 10);
      if (num in INVALID_CHARREFS) return INVALID_CHARREFS[num];
      if ((num >= 0xd800 && num <= 0xdfff) || num > 0x10ffff) return '�';
      return String.fromCodePoint(num);
    }
    if (body in HTML5_ENTITIES) return HTML5_ENTITIES[body];
    for (let i = body.length - 1; i >= 1; i--) {
      const prefix = body.slice(0, i);
      if (prefix in HTML5_ENTITIES) return HTML5_ENTITIES[prefix] + body.slice(i);
    }
    return whole;
  });
}

registerStdlibModule('html', {
  functions: {
    escape: (ctx, args, kwargs) => {
      const s = args[0];
      if (typeof s !== 'string') { if (ctx.isUnk(s)) return unkRet(ctx, 'html.escape の引数'); ctx.err('TypeError', 'escape() argument must be str', ''); return s; }
      return htmlEscape(s, kwBool(ctx, kwargs, 'quote', args[1], true));
    },
    unescape: (ctx, args, kwargs) => {
      const s = args[0];
      if (typeof s !== 'string') { if (ctx.isUnk(s)) return unkRet(ctx, 'html.unescape の引数'); ctx.err('TypeError', 'unescape() argument must be str', ''); return s; }
      return htmlUnescape(s);
    },
  },
});
export {};
