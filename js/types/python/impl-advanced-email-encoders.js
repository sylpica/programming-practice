/* 高度モード B7 G10：email.encoders（文字列ペイロードの Message に対する
 * 符号化。CPython 3.12.3 の振る舞いに合わせる）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NONE } = PyAPI;
function setCTE(msg, v) {
  msg.data.headers = msg.data.headers.filter(([k]) => k.toLowerCase() !== 'content-transfer-encoding');
  msg.data.headers.push(['Content-Transfer-Encoding', v]);
}
function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  const out = btoa(bin);
  return out.replace(/(.{76})/g, '$1\n') + (out.length % 76 ? '\n' : '');
}
function qp(s) {
  const bytes = new TextEncoder().encode(s);
  let out = '';
  for (const b of bytes) {
    if (b === 61 || b < 32 || b > 126) out += '=' + b.toString(16).toUpperCase().padStart(2, '0');
    else out += String.fromCharCode(b);
  }
  return out;
}
registerStdlibModule('email.encoders', {
  functions: {
    encode_base64: (ctx, args) => { const msg = args[0]; if (typeof msg.data.payload === 'string') msg.data.payload = b64(msg.data.payload); setCTE(msg, 'base64'); return NONE; },
    encode_quopri: (ctx, args) => { const msg = args[0]; if (typeof msg.data.payload === 'string') msg.data.payload = qp(msg.data.payload); setCTE(msg, 'quoted-printable'); return NONE; },
    encode_7or8bit: (ctx, args) => { const msg = args[0]; const s = typeof msg.data.payload === 'string' ? msg.data.payload : ''; setCTE(msg, /[^\x00-\x7f]/.test(s) ? '8bit' : '7bit'); return NONE; },
    encode_noop: (ctx, args) => NONE,
  },
});
