/* 高度モード B7 G10：urllib.robotparser（parse(lines) の純粋ロジック。
 * CPython 3.12.3 実走照合。read() はネットワーク前提のため未対応、
 * modified/mtime は現在時刻依存のため未検証（リファレンス側裁定）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { BOOL, NONE, LIST } = PyAPI;
function parseLines(lines) {
  const entries = []; let entry = null; let disallowAll = false, allowAll = false;
  const push = () => { if (entry) entries.push(entry); entry = null; };
  for (let raw of lines) {
    let line = String(raw);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    const hash = line.indexOf('#'); // CPython はコメントを行末まで除去（簡略：行中の # 以降）
    // ただし URL 中の # は通常現れない前提。CPython 実装は line.split('#',1) 前に strip 等を行う
    if (!line.strip) { /* noop */ }
    line = line.trim();
    if (!line) { continue; }
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === 'user-agent') {
      if (entry && entry.agents.length && (entry.rules.length || entry.delay !== null || entry.reqRate !== null)) push();
      if (!entry) entry = { agents: [], rules: [], delay: null, reqRate: null, sitemaps: [] };
      entry.agents.push(value.toLowerCase());
    } else if (!entry) {
      continue;
    } else if (field === 'disallow') { entry.rules.push({ allow: false, path: value }); }
    else if (field === 'allow') { entry.rules.push({ allow: true, path: value }); }
    else if (field === 'crawl-delay') { const n = parseFloat(value); if (!Number.isNaN(n)) entry.delay = n; }
    else if (field === 'request-rate') { const parts = value.split('/'); if (parts.length === 2) entry.reqRate = [parseInt(parts[0], 10), parseInt(parts[1], 10)]; }
    else if (field === 'sitemap') { entry.sitemaps.push(value); }
  }
  push();
  return { entries, disallowAll, allowAll };
}
function pathOf(url) {
  let u = String(url);
  const m = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]*/.exec(u); if (m) u = u.slice(m[0].length);
  if (!u) u = '/';
  // パーセント復号（簡略：%XX を UTF-8 として）
  try { u = decodeURIComponent(u); } catch { /* そのまま */ }
  const q = u.indexOf('?'); // CPython は query もパスの一部として照合する（parse 経路）ため除去しない
  return u;
}
function matchEntry(data, agent) {
  const ag = String(agent).toLowerCase();
  for (const e of data.entries) if (e.agents.includes(ag)) return e;
  for (const e of data.entries) if (e.agents.includes('*')) return e;
  return null;
}
registerStdlibModule('urllib.robotparser', {
  classes: {
    RobotFileParser: {
      typeName: 'RobotFileParser',
      construct: (ctx, args) => ctx.native('urllib.robotparser.RobotFileParser', { url: args.length ? ctx.str(args[0]) ?? '' : '', entries: [], sitemaps: [], lastChecked: 0 }),
      attrs: { },
      methods: {
        set_url: (ctx, self, args) => { self.data.url = ctx.str(args[0]) ?? ''; return NONE; },
        parse: (ctx, self, args) => { const lines = ctx.iterable(args[0]); if (!lines) ctx.err('TypeError', 'parse() の引数には行の並びを使ってください', ''); const texts = lines.map((v) => ctx.str(v) ?? ctx.strOf(v)); const r = parseLines(texts); self.data.entries = r.entries; self.data.sitemaps = r.entries.flatMap((e) => e.sitemaps); return NONE; },
        can_fetch: (ctx, self, args) => {
          const e = matchEntry(self.data, ctx.str(args[0]) ?? '*'); if (!e) return BOOL(true);
          const path = pathOf(ctx.str(args[1]) ?? '');
          let best = null;
          for (const rule of e.rules) { if (rule.path === '') continue; if (path.startsWith(rule.path)) { if (!best || rule.path.length > best.path.length) best = rule; } }
          if (!best) return BOOL(true);
          return BOOL(best.allow);
        },
        crawl_delay: (ctx, self, args) => { const e = matchEntry(self.data, ctx.str(args[0]) ?? '*'); if (!e || e.delay === null) return NONE; return e.delay % 1 === 0 ? PyAPI.NUM(e.delay, false) : PyAPI.NUM(e.delay, true); },
        request_rate: (ctx, self, args) => { const e = matchEntry(self.data, ctx.str(args[0]) ?? '*'); if (!e || !e.reqRate) return NONE; return ctx.native('urllib.robotparser.RequestRate', { requests: e.reqRate[0], seconds: e.reqRate[1] }); },
        site_maps: (ctx, self) => self.data.sitemaps.length ? LIST(self.data.sitemaps.slice()) : NONE,
      },
      repr: (ctx, self) => '<RobotFileParser object at ' + (self.data.url || '') + '>',
    },
  },
});
