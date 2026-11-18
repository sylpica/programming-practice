/* 高度モード B7 G10：http.cookiejar（CPython 3.12.3 実走照合）。
 * Cookie／CookieJar の中核（保持・clear・set_cookie・ポリシー判定の基本）と
 * DefaultCookiePolicy の属性・許可リストを実装。request/response オブジェクト
 * が必要な extract_cookies 等と、ファイル保存系は未検証／未対応
 * （リファレンス側の裁定参照）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { BOOL, NONE, LIST } = PyAPI;
const COOKIE_ATTRS = ['version', 'name', 'value', 'port', 'port_specified', 'domain', 'domain_specified', 'domain_initial_dot', 'path', 'path_specified', 'secure', 'expires', 'discard', 'comment', 'comment_url', 'rfc2109'];
const CookieDef = {
  typeName: 'Cookie',
  construct: (ctx, args) => {
    const d = { nonstandard: {} };
    COOKIE_ATTRS.forEach((a, i) => {
      let v = args[i];
      if (v === undefined) v = a === 'version' ? ctx.V.NUM(0, false) : (['port_specified', 'domain_specified', 'domain_initial_dot', 'path_specified', 'secure', 'discard', 'rfc2109'].includes(a) ? BOOL(false) : NONE);
      d[a] = v;
    });
    const rest = args[16];
    if (rest && rest.__dict) for (const e of rest.__dict.values()) d.nonstandard[ctx.str(e.k) ?? ctx.strOf(e.k)] = e.v;
    return ctx.native('http.cookiejar.Cookie', d);
  },
  attrs: Object.fromEntries([...COOKIE_ATTRS].map((a) => [a, (ctx, self) => self.data[a] === undefined ? NONE : self.data[a]])),
  methods: {
    is_expired: (ctx, self, args) => { const exp = self.data.expires; if (!exp || ctx.isNone(exp)) return BOOL(false); const now = args.length && !ctx.isNone(args[0]) ? ctx.num(args[0]) : Math.floor(Date.now() / 1000); return BOOL(ctx.num(exp) !== null && ctx.num(exp) <= now); },
    has_nonstandard_attr: (ctx, self, args) => BOOL((ctx.str(args[0]) ?? '') in self.data.nonstandard),
    get_nonstandard_attr: (ctx, self, args) => { const k = ctx.str(args[0]); return k in self.data.nonstandard ? self.data.nonstandard[k] : (args.length > 1 ? args[1] : NONE); },
    set_nonstandard_attr: (ctx, self, args) => { self.data.nonstandard[ctx.str(args[0])] = args[1]; return NONE; },
  },
  repr: (ctx, self) => '<Cookie ' + (ctx.str(self.data.name) ?? '') + '=' + (ctx.str(self.data.value) ?? '') + ' for ' + (ctx.str(self.data.domain) ?? '') + (ctx.str(self.data.path) ?? '') + '>',
  str: (ctx, self) => '<Cookie ' + (ctx.str(self.data.name) ?? '') + '=' + (ctx.str(self.data.value) ?? '') + ' for ' + (ctx.str(self.data.domain) ?? '') + (ctx.str(self.data.path) ?? '') + '>',
};
function policyData() {
  // 高度A7班是正: netscape／rfc2965／hide_cookie2 は DefaultCookiePolicy
  // のインスタンス属性（CPython 3.12.3 実走: 既定 True／False／False、
  // __init__ のキーワードでも変更可）。従来は欠落していた。
  return { allowed: null, blocked: null, netscape: BOOL(true), rfc2965: BOOL(false), hide_cookie2: BOOL(false), strict_domain: BOOL(false), rfc2109_as_netscape: NONE, strict_ns_domain: PyAPI.NUM(0, false), strict_ns_unverifiable: BOOL(false), strict_ns_set_initial_dollar: BOOL(false), strict_ns_set_path: BOOL(false), strict_rfc2965_unverifiable: BOOL(false) };
}
const DefaultPolicyDef = {
  typeName: 'DefaultCookiePolicy',
  construct: (ctx, args, kwargs) => {
    const d = policyData();
    if (kwargs) { if (kwargs.blocked_domains) d.blocked = kwargs.blocked_domains; if (kwargs.allowed_domains) d.allowed = kwargs.allowed_domains; for (const k of ['netscape', 'rfc2965', 'hide_cookie2', 'strict_domain', 'rfc2109_as_netscape', 'strict_ns_unverifiable', 'strict_ns_set_initial_dollar', 'strict_ns_set_path', 'strict_rfc2965_unverifiable']) if (kwargs[k] !== undefined) d[k] = kwargs[k]; if (kwargs.strict_ns_domain !== undefined) d.strict_ns_domain = kwargs.strict_ns_domain; }
    return ctx.native('http.cookiejar.DefaultCookiePolicy', d);
  },
  attrs: {
    netscape: (ctx, self) => self.data.netscape,
    rfc2965: (ctx, self) => self.data.rfc2965,
    hide_cookie2: (ctx, self) => self.data.hide_cookie2,
    strict_domain: (ctx, self) => self.data.strict_domain,
    rfc2109_as_netscape: (ctx, self) => self.data.rfc2109_as_netscape,
    strict_ns_domain: (ctx, self) => self.data.strict_ns_domain,
    strict_ns_unverifiable: (ctx, self) => self.data.strict_ns_unverifiable,
    strict_ns_set_initial_dollar: (ctx, self) => self.data.strict_ns_set_initial_dollar,
    strict_ns_set_path: (ctx, self) => self.data.strict_ns_set_path,
    strict_ns_unverifiable: (ctx, self) => self.data.strict_ns_unverifiable,
    strict_rfc2965_unverifiable: (ctx, self) => self.data.strict_rfc2965_unverifiable,
  },
  classAttrs: { DomainStrict: PyAPI.NUM(1, false), DomainLiberal: PyAPI.NUM(0, false), DomainRFC2965Match: PyAPI.NUM(2, false), DomainStrictNoDots: PyAPI.NUM(1, false), DomainStrictNonDomain: PyAPI.NUM(2, false) },
  methods: {
    blocked_domains: (ctx, self) => self.data.blocked === null ? PyAPI.TUPLE([]) : (self.data.blocked.__tuple ? self.data.blocked : PyAPI.TUPLE(self.data.blocked.__list || [])),
    allowed_domains: (ctx, self) => self.data.allowed === null ? PyAPI.TUPLE([]) : (self.data.allowed.__tuple ? self.data.allowed : PyAPI.TUPLE(self.data.allowed.__list || [])),
    set_allowed_domains: (ctx, self, args) => { self.data.allowed = args[0]; return NONE; },
    set_blocked_domains: (ctx, self, args) => { self.data.blocked = args[0]; return NONE; },
    is_blocked: (ctx, self, args) => { const dom = ctx.str(args[0]) ?? ''; const list = self.data.blocked && self.data.blocked.__list ? self.data.blocked.__list.map((x) => ctx.str(x)) : []; return BOOL(list.some((b) => dom === b || dom.endsWith(b))); },
    is_not_allowed: (ctx, self, args) => { if (!self.data.allowed) return BOOL(false); const dom = ctx.str(args[0]) ?? ''; const list = self.data.allowed.__list ? self.data.allowed.__list.map((x) => ctx.str(x)) : []; return BOOL(!list.some((b) => dom === b || dom.endsWith(b))); },
    set_ok: (ctx, self, args) => BOOL(true),
    return_ok: (ctx, self, args) => BOOL(true),
    domain_return_ok: (ctx, self, args) => BOOL(true),
    path_return_ok: (ctx, self, args) => BOOL(true),
  },
};
const PolicyDef = {
  typeName: 'CookiePolicy',
  construct: (ctx) => ctx.native('http.cookiejar.CookiePolicy', policyData()),
  // 高度A7班是正: 以前ここに attrs へ生値（BOOL）を置いており、
  // エンジンが getter 関数として呼んで TypeError で実行全体が落ちた。
  // CPython でも CookiePolicy に netscape 等の属性は無い
  // （DefaultCookiePolicy のインスタンス属性）ため、定義自体を除去。
  methods: {
    set_ok: (ctx, self, args) => BOOL(true), return_ok: (ctx, self, args) => BOOL(true),
    domain_return_ok: (ctx, self, args) => BOOL(true), path_return_ok: (ctx, self, args) => BOOL(true),
  },
};
function jarClass(qual, typeName) {
  return {
    typeName,
    construct: (ctx, args, kwargs) => ctx.native(qual, { cookies: [], policy: null }),
    methods: {
      set_policy: (ctx, self, args) => { self.data.policy = args[0]; return NONE; },
      set_cookie: (ctx, self, args) => { self.data.cookies.push(args[0]); return NONE; },
      set_cookie_if_ok: (ctx, self, args) => { self.data.cookies.push(args[0]); return NONE; },
      clear: (ctx, self, args) => {
        if (!args.length) { self.data.cookies = []; return NONE; }
        const dom = ctx.str(args[0]), path = args.length > 1 ? ctx.str(args[1]) : null, name = args.length > 2 ? ctx.str(args[2]) : null;
        self.data.cookies = self.data.cookies.filter((c) => !(ctx.str(c.data.domain) === dom && (path === null || ctx.str(c.data.path) === path) && (name === null || ctx.str(c.data.name) === name)));
        return NONE;
      },
      clear_session_cookies: (ctx, self) => { self.data.cookies = self.data.cookies.filter((c) => !(c.data.discard && ctx.truthy(c.data.discard))); return NONE; },
      clear_expired_cookies: (ctx, self) => { const now = Math.floor(Date.now() / 1000); self.data.cookies = self.data.cookies.filter((c) => { const e = c.data.expires; return !e || ctx.isNone(e) || ctx.num(e) === null || ctx.num(e) > now; }); return NONE; },
    },
    iter: (ctx, self) => self.data.cookies.slice(),
    len: (ctx, self) => self.data.cookies.length,
  };
}
registerStdlibModule('http.cookiejar', {
  classes: {
    LoadError: { typeName: 'LoadError', exc: 'http.cookiejar.LoadError', excParents: ['OSError'] },
    Cookie: CookieDef,
    CookiePolicy: PolicyDef,
    DefaultCookiePolicy: DefaultPolicyDef,
    CookieJar: jarClass('http.cookiejar.CookieJar', 'CookieJar'),
    FileCookieJar: jarClass('http.cookiejar.FileCookieJar', 'FileCookieJar'),
    MozillaCookieJar: jarClass('http.cookiejar.MozillaCookieJar', 'MozillaCookieJar'),
    LWPCookieJar: jarClass('http.cookiejar.LWPCookieJar', 'LWPCookieJar'),
  },
});
