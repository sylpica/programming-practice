/* 高度モード B7 G10：email.utils（CPython 3.12.3 実走照合）。
 * parsedate/formatdate/parseaddr 等の純粋関数を実装。
 * parsedate_to_datetime／format_datetime は datetime 型（別ブロック所管）との
 * 受け渡し API が基盤に無いため未検証、localtime／make_msgid は時刻・乱数
 * 依存のため未検証（リファレンス側裁定・報告書の基盤要請参照）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, TUPLE } = PyAPI;
const I = (v) => NUM(v, false);
function S(ctx, v, fn) { const s = ctx.str(v); if (s === null) ctx.err('TypeError', fn + ' の引数には文字列を使ってください', ''); return s; }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function parseDateStr(data) {
  // CPython _parsedate_tz の簡略版（RFC 2822 形式）
  let s = String(data).trim();
  const comma = s.indexOf(',');
  if (comma >= 0) s = s.slice(comma + 1).trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 4) return null;
  // [dd, Mon, yyyy, hh:mm:ss, zone] / [dd, Mon, yy, ...] 等
  let i = 0;
  const day = parseInt(parts[i++], 10);
  const monStr = String(parts[i++] || '').slice(0, 3).toLowerCase();
  const mon = MONTHS.findIndex((m) => m.toLowerCase() === monStr) + 1;
  let year = parseInt(parts[i++], 10);
  if (Number.isNaN(day) || mon === 0 || Number.isNaN(year)) return null;
  if (year < 100) year += year < 70 ? 2000 : 1900;
  const tm = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/.exec(parts[i++] || '');
  if (!tm) return null;
  const hh = +tm[1], mm = +tm[2], ss = tm[3] ? +tm[3] : 0;
  let tz = 0; // 秒。None 相当は呼び出し側で扱う
  let tzPresent = false;
  const zone = parts[i] || '';
  if (zone) {
    tzPresent = true;
    if (/^[+-]\d{4}$/.test(zone)) { const sign = zone[0] === '-' ? -1 : 1; tz = sign * (parseInt(zone.slice(1, 3), 10) * 3600 + parseInt(zone.slice(3, 5), 10) * 60); }
    else { const Z = { UT: 0, GMT: 0, UTC: 0, Z: 0, EST: -5 * 3600, EDT: -4 * 3600, CST: -6 * 3600, CDT: -5 * 3600, MST: -7 * 3600, MDT: -6 * 3600, PST: -8 * 3600, PDT: -7 * 3600 }; const z = zone.toUpperCase(); tz = z in Z ? Z[z] : 0; if (!(z in Z)) tzPresent = true; }
  }
  // 曜日・day-of-year は CPython が再計算する（parsedate では 0,1 固定ではない：
  // parsedate は tm_wday=0, tm_yday=1 を返す）
  return { y: year, mo: mon, d: day, h: hh, mi: mm, s: ss, tz, tzPresent };
}
function formatDateTimeTuple(y, mo, d, h, mi, s, tzSeconds, usegmt) {
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  const dow = DAYS[(dt.getUTCDay() + 6) % 7];
  let zone;
  if (usegmt) zone = 'GMT';
  else if (tzSeconds === null || tzSeconds === undefined) zone = '-0000';
  else { const sign = tzSeconds < 0 ? '-' : '+'; const a = Math.abs(tzSeconds); zone = sign + String(Math.floor(a / 3600)).padStart(2, '0') + String(Math.floor((a % 3600) / 60)).padStart(2, '0'); }
  return dow + ', ' + String(d).padStart(2, '0') + ' ' + MONTHS[mo - 1] + ' ' + y + ' ' + String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ' ' + zone;
}
function splitAddr(s) {
  // "Name <addr>" / "addr" の分解（簡略版）
  const t = String(s).trim();
  const lt = t.lastIndexOf('<'), gt = t.lastIndexOf('>');
  if (lt >= 0 && gt > lt) {
    let name = t.slice(0, lt).trim();
    if (name.length >= 2 && name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1).replace(/\\(.)/g, '$1');
    return [name, t.slice(lt + 1, gt).trim()];
  }
  return ['', t];
}
function formatAddrPair(name, addr) {
  if (!name) return addr;
  let n = name;
  if (/[^\x00-\x7f]/.test(n)) { /* 非 ASCII は RFC2047 が必要だが、ここではそのまま（CPython も Header 経由でない限り素通しに近い） */ }
  else if (/["<>@,;:\\\[\]]/.test(n) || n.includes(' ')) { if (n.includes(' ') && !/[<>@,;:\\\[\]]/.test(n)) { /* スペースのみなら引用しないのが CPython */ } else n = '"' + n.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
  return n + ' <' + addr + '>';
}
registerStdlibModule('email.utils', {
  functions: {
    parsedate: (ctx, args) => { const r = parseDateStr(S(ctx, args[0], 'parsedate')); if (!r) return NONE; return TUPLE([I(r.y), I(r.mo), I(r.d), I(r.h), I(r.mi), I(r.s), I(0), I(1), I(-1)]); },
    parsedate_tz: (ctx, args) => { const r = parseDateStr(S(ctx, args[0], 'parsedate_tz')); if (!r) return NONE; return TUPLE([I(r.y), I(r.mo), I(r.d), I(r.h), I(r.mi), I(r.s), I(0), I(1), I(-1), r.tzPresent ? I(r.tz) : NONE]); },
    mktime_tz: (ctx, args) => { const t = ctx.listOf(args[0]) || ctx.iterable(args[0]); if (!t) ctx.err('TypeError', 'mktime_tz() の引数にはタプルを使ってください', ''); const n = (v) => ctx.num(v) ?? 0; const tz = t.length > 9 && !ctx.isNone(t[9]) ? n(t[9]) : 0; const epoch = Date.UTC(n(t[0]), n(t[1]) - 1, n(t[2]), n(t[3]), n(t[4]), n(t[5])) / 1000; return I(epoch - tz); },
    formatdate: (ctx, args, kwargs) => {
      let timeval = args.length && !ctx.isNone(args[0]) ? ctx.num(args[0]) : null;
      const usegmt = (kwargs && kwargs.usegmt !== undefined) ? !!ctx.truthy(kwargs.usegmt) : (args.length > 1 ? !!ctx.truthy(args[1]) : false);
      if (timeval === null) { ctx.diag('formatdate: 現在時刻は実行環境に依存するため未確定値として扱います'); return ctx.unk('現在時刻から作られる日付文字列'); }
      const dt = new Date(timeval * 1000);
      // usegmt でない場合は地方時。エンジンでは UTC 地方時（オフセット 0）として扱う
      return formatDateTimeTuple(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds(), usegmt ? 0 : 0, usegmt);
    },
    parseaddr: (ctx, args) => { const [n, a] = splitAddr(S(ctx, args[0], 'parseaddr')); return TUPLE([n, a]); },
    formataddr: (ctx, args) => { const p = ctx.listOf(args[0]) || ctx.iterable(args[0]); if (!p || p.length !== 2) ctx.err('TypeError', 'formataddr() の引数には (名前, アドレス) のペアを使ってください', ''); return formatAddrPair(ctx.str(p[0]) ?? '', ctx.str(p[1]) ?? ''); },
    getaddresses: (ctx, args) => {
      const list = ctx.iterable(args[0]); if (!list) ctx.err('TypeError', 'getaddresses() の引数には文字列の並びを使ってください', '');
      const out = [];
      for (const v of list) {
        const s = ctx.str(v) ?? '';
        // カンマ区切り（引用符・括弧内は除く簡略版）
        let depth = 0, inQ = false, cur = '';
        const parts = [];
        for (const ch of s) { if (ch === '"') inQ = !inQ; if (!inQ) { if (ch === '<') depth++; if (ch === '>') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; } } cur += ch; }
        if (cur.trim() || parts.length) parts.push(cur);
        for (const p of parts) { if (!p.trim()) continue; const [n, a] = splitAddr(p); out.push(TUPLE([n, a])); }
      }
      return LIST(out);
    },
    quote: (ctx, args) => { const s = S(ctx, args[0], 'quote'); return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; },
    unquote: (ctx, args) => { let s = S(ctx, args[0], 'unquote'); if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/\\(.)/g, '$1'); return s; },
    decode_rfc2231: (ctx, args) => { const s = S(ctx, args[0], 'decode_rfc2231'); const parts = s.split("'"); if (parts.length === 3) { let val = parts[2]; try { val = decodeURIComponent(val.replace(/%/g, '%')); } catch { /* % 復号は decodeURIComponent 流用 */ val = val.replace(/%([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); } return TUPLE([parts[0] || NONE, parts[1] || NONE, val]); } return TUPLE([NONE, NONE, s]); },
    encode_rfc2231: (ctx, args, kwargs) => {
      const s = S(ctx, args[0], 'encode_rfc2231'); const charset = args.length > 1 && !ctx.isNone(args[1]) ? ctx.str(args[1]) : null; const lang = args.length > 2 && !ctx.isNone(args[2]) ? ctx.str(args[2]) : null;
      if (!charset && !lang && !/[^\x00-\x7f]/.test(s) && !s.includes("'")) return s;
      const cs = charset || 'utf-8';
      let enc = ''; for (const ch of s) { if (/[A-Za-z0-9!#$&+.^_`|~-]/.test(ch)) enc += ch; else { for (const b of new TextEncoder().encode(ch)) enc += '%' + b.toString(16).toUpperCase().padStart(2, '0'); } }
      return cs + "'" + (lang || '') + "'" + enc;
    },
    collapse_rfc2231_value: (ctx, args) => {
      const v = args[0];
      if (typeof v === 'string') return v;
      const t = ctx.listOf(v); if (!t || t.length !== 3) return ctx.strOf(v);
      return ctx.str(t[2]) ?? '';
    },
    decode_params: (ctx, args) => {
      const list = ctx.iterable(args[0]); if (!list) ctx.err('TypeError', 'decode_params() の引数には並びを使ってください', '');
      return LIST(list.map((p) => {
        const pair = ctx.listOf(p); if (!pair) return p;
        const k = ctx.str(pair[0]) ?? '', v = pair[1];
        if (typeof v === 'string' && v.includes("'")) { const parts = v.split("'"); if (parts.length === 3) return TUPLE([k, TUPLE([parts[0] || NONE, parts[1] || NONE, (() => { try { return decodeURIComponent(parts[2]); } catch { return parts[2]; } })()])]); }
        return p;
      }));
    },
  },
});
export const __g10ParseDate = parseDateStr;
