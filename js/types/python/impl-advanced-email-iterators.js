/* 高度モード B7 G10：email.iterators（Message 上の反復。CPython 実走照合）。
 * _structure はファイル出力前提のため未対応（未登録）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { walkMsgs, contentTypeOf } from './impl-advanced-email-message.js';
registerStdlibModule('email.iterators', {
  functions: {
    body_line_iterator: (ctx, args) => {
      const msg = args[0]; const out = [];
      for (const d of walkMsgs(msg.data)) {
        if (Array.isArray(d.payload)) continue;
        const ct = contentTypeOf(d);
        if (ct.startsWith('text/') && typeof d.payload === 'string') out.push(...d.payload.split('\n').slice(0, -1).map((l) => l + '\n').length ? d.payload.match(/[^\n]*\n|[^\n]+$/g) || [] : []);
      }
      return PyAPI.ITER(out, 'iterator');
    },
    typed_subpart_iterator: (ctx, args) => {
      const msg = args[0]; const maintype = args.length > 1 ? ctx.str(args[1]) ?? 'text' : 'text'; const subtype = args.length > 2 ? ctx.str(args[2]) ?? null : null;
      const out = [];
      for (const d of walkMsgs(msg.data)) {
        if (Array.isArray(d.payload)) continue;
        const ct = contentTypeOf(d); const [mt, st] = ct.split('/');
        if (mt === maintype && (subtype === null || st === subtype)) out.push(d.__selfRef);
      }
      return PyAPI.ITER(out, 'iterator');
    },
  },
});
