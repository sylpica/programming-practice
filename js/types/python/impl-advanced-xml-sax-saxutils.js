/* 高度モード B7 G10：xml.sax.saxutils（escape／unescape／quoteattr の
 * 純粋関数。CPython 3.12.3 実走照合）。XMLGenerator／XMLFilterBase／
 * prepare_input_source はストリーム・パーサ前提のため未検証。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
function esc(s, entities) {
  let out = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (entities && entities.__dict) for (const e of entities.__dict.values()) { const k = PyAPI.strVal ? null : null; }
  return out;
}
registerStdlibModule('xml.sax.saxutils', {
  functions: {
    escape: (ctx, args) => {
      let out = esc(ctx.str(args[0]) ?? '');
      if (args.length > 1 && ctx.isDict(args[1])) for (const e of args[1].__dict.values()) { const k = ctx.str(e.k); const v = ctx.str(e.v); if (k && v !== null) out = out.split(k).join(v); }
      return out;
    },
    unescape: (ctx, args) => {
      let out = String(ctx.str(args[0]) ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      if (args.length > 1 && ctx.isDict(args[1])) for (const e of args[1].__dict.values()) { const k = ctx.str(e.k); const v = ctx.str(e.v); if (k && v !== null) out = out.split(k).join(v); }
      return out;
    },
    quoteattr: (ctx, args) => {
      const s = ctx.str(args[0]) ?? '';
      const hasDQ = s.includes('"'), hasSQ = s.includes("'");
      if (hasDQ && !hasSQ) return "'" + s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + "'";
      return '"' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '"';
    },
  },
});
