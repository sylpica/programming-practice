/* 高度モード B7 G10：email.header（Header の基本と decode_header の
 * 文字列入力。decode_header の戻り値は (bytes, charset) で bytes 表現が
 * UNK のため、復号済み文字列として返す範囲のみ実装し、戻り値の型が
 * 異なる点は未検証扱いとしてリファレンスに明記する）。
 * ここでは Header（ASCII 範囲）と decode_header の =?utf-8?...?= 復号を実装。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { BOOL, NONE, LIST, TUPLE } = PyAPI;
function encodeWord(s) {
  if (!/[^\x00-\x7f]/.test(s)) return s;
  const bytes = new TextEncoder().encode(s); let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return '=?utf-8?b?' + btoa(bin) + '?=';
}
function decodeWords(s) {
  return String(s).replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (m, cs, enc, text) => {
    try {
      if (enc.toLowerCase() === 'b') { const bin = atob(text); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0)); return new TextDecoder(cs.toLowerCase() === 'unknown-8bit' ? 'utf-8' : cs).decode(bytes); }
      const q = text.replace(/_/g, ' ').replace(/=([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      const bytes = Uint8Array.from(q, (c) => c.charCodeAt(0)); return new TextDecoder(cs).decode(bytes);
    } catch { return m; }
  });
}
const HeaderDef = {
  typeName: 'Header',
  construct: (ctx, args, kwargs) => {
    let s = args.length ? ctx.str(args[0]) ?? '' : '';
    return ctx.native('email.header.Header', { s, charset: (kwargs && kwargs.charset) || null });
  },
  methods: {
    append: (ctx, self, args) => { const s = ctx.str(args[0]) ?? ''; self.data.s += (self.data.s ? ' ' : '') + s; return NONE; },
    encode: (ctx, self, args) => encodeWord(self.data.s),
    __str__: (ctx, self) => self.data.s,
  },
  str: (ctx, self) => self.data.s,
  repr: (ctx, self) => 'Header(' + ctx.repr(self.data.s) + ')',
  eq: (ctx, self, other) => (other && other.__native === 'email.header.Header') ? self.data.s === other.data.s : (typeof other === 'string' ? self.data.s === other : false),
  hash: (ctx, self) => 's:' + self.data.s,
};
registerStdlibModule('email.header', {
  functions: {
    decode_header: (ctx, args) => {
      // 本来は [(bytes, charset|None), ...]。bytes を表せないため未検証経路：
      ctx.diag('decode_header: 戻り値の bytes はこのエンジンでは表せないため未検証として扱います');
      return ctx.unk('decode_header の結果（bytes を含む）');
    },
    make_header: (ctx, args) => { ctx.diag('make_header: decode_header の bytes 結果に依存するため未検証として扱います'); return ctx.unk('make_header の結果'); },
  },
  classes: { Header: HeaderDef },
});
export const __g10DecodeWords = decodeWords;
