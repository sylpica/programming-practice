/* 高度モード B7 G7：colorsys。CPython の Lib/colorsys.py の式そのまま。
 * 浮動小数演算は IEEE754 double で CPython と同一手順のため一致する。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { TUPLE, F, onlyKw } from './impl-advanced-g7-common.js';

function num(ctx, v, fname) {
  const n = ctx.num(v);
  if (n === null) { if (ctx.isUnk(v)) return null; ctx.err('TypeError', fname + '() argument must be a number', ''); }
  return n;
}
function three(fname, fn) {
  return (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, [], 'colorsys.' + fname);
    if (args.length !== 3) ctx.err('TypeError', fname + '() takes exactly 3 arguments', '');
    const vals = args.map((a) => num(ctx, a, fname));
    if (vals.some((v) => v === null)) return ctx.unk('colorsys.' + fname + ' の結果');
    return fn(...vals);
  };
}
const M = (v) => F(v);
registerStdlibModule('colorsys', {
  functions: {
    rgb_to_hsv: three('rgb_to_hsv', (r, g, b) => {
      const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
      const v = maxc;
      if (minc === maxc) return TUPLE([M(0.0), M(0.0), M(v)]);
      const s = (maxc - minc) / maxc;
      const rc = (maxc - r) / (maxc - minc), gc = (maxc - g) / (maxc - minc), bc = (maxc - b) / (maxc - minc);
      let h;
      if (r === maxc) h = bc - gc;
      else if (g === maxc) h = 2.0 + rc - bc;
      else h = 4.0 + gc - rc;
      h = (h / 6.0) % 1.0;
      if (h < 0) h += 1.0; // CPython の % 1.0 は Python 剰余（符号は除数側）
      return TUPLE([M(h), M(s), M(v)]);
    }),
    hsv_to_rgb: three('hsv_to_rgb', (h, s, v) => {
      if (s === 0.0) return TUPLE([M(v), M(v), M(v)]);
      const i = Math.trunc(h * 6.0); // CPython の int() は0方向への切り捨て
      const f = h * 6.0 - i;
      const p = v * (1.0 - s), q = v * (1.0 - s * f), t = v * (1.0 - s * (1.0 - f));
      const ii = ((i % 6) + 6) % 6;
      const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]];
      const [r, g, b] = table[ii];
      return TUPLE([M(r), M(g), M(b)]);
    }),
    rgb_to_hls: three('rgb_to_hls', (r, g, b) => {
      const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
      const sumc = maxc + minc;
      const l = sumc / 2.0;
      if (minc === maxc) return TUPLE([M(0.0), M(l), M(0.0)]);
      const s = l <= 0.5 ? (maxc - minc) / sumc : (maxc - minc) / (2.0 - sumc);
      const rc = (maxc - r) / (maxc - minc), gc = (maxc - g) / (maxc - minc), bc = (maxc - b) / (maxc - minc);
      let h;
      if (r === maxc) h = bc - gc;
      else if (g === maxc) h = 2.0 + rc - bc;
      else h = 4.0 + gc - rc;
      h = (h / 6.0) % 1.0;
      if (h < 0) h += 1.0;
      return TUPLE([M(h), M(l), M(s)]);
    }),
    hls_to_rgb: three('hls_to_rgb', (h, l, s) => {
      const m2 = l <= 0.5 ? l * (1.0 + s) : l + s - (l * s);
      const m1 = 2.0 * l - m2;
      if (s === 0.0) return TUPLE([M(l), M(l), M(l)]);
      const val = (hh) => {
        let hue = hh % 1.0;
        if (hue < 0) hue += 1.0;
        if (hue < 1.0 / 6.0) return m1 + (m2 - m1) * hue * 6.0;
        if (hue < 0.5) return m2;
        if (hue < 2.0 / 3.0) return m1 + (m2 - m1) * (2.0 / 3.0 - hue) * 6.0;
        return m1;
      };
      return TUPLE([M(val(h + 1.0 / 3.0)), M(val(h)), M(val(h - 1.0 / 3.0))]);
    }),
    rgb_to_yiq: three('rgb_to_yiq', (r, g, b) => {
      const y = 0.30 * r + 0.59 * g + 0.11 * b;
      return TUPLE([M(y), M(0.74 * (r - y) - 0.27 * (b - y)), M(0.48 * (r - y) + 0.41 * (b - y))]);
    }),
    yiq_to_rgb: three('yiq_to_rgb', (y, i, q) => TUPLE([
      M(Math.min(1.0, Math.max(0.0, y + 0.9468822170900693 * i + 0.6235565819861433 * q))),
      M(Math.min(1.0, Math.max(0.0, y - 0.27478764629897834 * i - 0.6356910791873801 * q))),
      M(Math.min(1.0, Math.max(0.0, y - 1.1085450346420322 * i + 1.7090069284064666 * q))),
    ])),
  },
});
