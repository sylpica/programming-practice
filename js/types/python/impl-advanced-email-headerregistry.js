/* 高度モード B7 G10：email.headerregistry（Address／Group の値オブジェクトと
 * HeaderRegistry の基本。CPython 3.12.3 実走照合）。
 * 各ヘッダ型クラス（AddressHeader 等）は policy 経由のヘッダ解析結果として
 * 生成されるもので、単独生成の意味論を確定できないため未検証。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { BOOL, NONE, LIST, TUPLE } = PyAPI;
function splitAddr(s) {
  const t = String(s).trim();
  const lt = t.lastIndexOf('<'), gt = t.lastIndexOf('>');
  if (lt >= 0 && gt > lt) { let name = t.slice(0, lt).trim(); if (name.length >= 2 && name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1); return [name, t.slice(lt + 1, gt).trim()]; }
  return ['', t];
}
const AddressDef = {
  typeName: 'Address',
  construct: (ctx, args, kwargs) => {
    let display = '', username = '', domain = '';
    if (kwargs && (kwargs.username !== undefined || kwargs.domain !== undefined)) { display = kwargs.display_name ? ctx.str(kwargs.display_name) ?? '' : ''; username = kwargs.username ? ctx.str(kwargs.username) ?? '' : ''; domain = kwargs.domain ? ctx.str(kwargs.domain) ?? '' : ''; }
    else if (args.length === 1) { const [n, a] = splitAddr(ctx.str(args[0]) ?? ''); display = n; const at = a.lastIndexOf('@'); if (at >= 0) { username = a.slice(0, at); domain = a.slice(at + 1); } else username = a; }
    else if (args.length >= 3) { display = ctx.str(args[0]) ?? ''; username = ctx.str(args[1]) ?? ''; domain = ctx.str(args[2]) ?? ''; }
    return ctx.native('email.headerregistry.Address', { display, username, domain });
  },
  attrs: {
    display_name: (ctx, self) => self.data.display,
    username: (ctx, self) => self.data.username,
    domain: (ctx, self) => self.data.domain,
    addr_spec: (ctx, self) => self.data.username + (self.data.domain ? '@' + self.data.domain : ''),
  },
  str: (ctx, self) => { const spec = self.data.username + (self.data.domain ? '@' + self.data.domain : ''); return self.data.display ? self.data.display + ' <' + spec + '>' : spec; },
  repr: (ctx, self) => 'Address(display_name=' + ctx.repr(self.data.display) + ', username=' + ctx.repr(self.data.username) + ', domain=' + ctx.repr(self.data.domain) + ')',
  eq: (ctx, self, other) => (other && other.__native === 'email.headerregistry.Address') ? (self.data.display === other.data.display && self.data.username === other.data.username && self.data.domain === other.data.domain) : false,
  hash: (ctx, self) => 'a:' + self.data.display + '|' + self.data.username + '@' + self.data.domain,
};
const GroupDef = {
  typeName: 'Group',
  construct: (ctx, args, kwargs) => {
    let display = '', addresses = [];
    if (kwargs) { display = kwargs.display_name ? ctx.str(kwargs.display_name) ?? '' : ''; addresses = kwargs.addresses ? (ctx.listOf(kwargs.addresses) || []) : []; }
    else if (args.length) { display = ctx.str(args[0]) ?? ''; if (args.length > 1) addresses = ctx.listOf(args[1]) || []; }
    return ctx.native('email.headerregistry.Group', { display, addresses });
  },
  attrs: {
    display_name: (ctx, self) => self.data.display,
    addresses: (ctx, self) => TUPLE(self.data.addresses.slice()),
  },
  str: (ctx, self) => self.data.display + ': ' + self.data.addresses.map((a) => ctx.strOf(a)).join(', ') + ';',
  repr: (ctx, self) => 'Group(display_name=' + ctx.repr(self.data.display) + ', addresses=[' + self.data.addresses.map((a) => ctx.repr(a)).join(', ') + '])',
  eq: (ctx, self, other) => (other && other.__native === 'email.headerregistry.Group') ? self.data.display === other.data.display : false,
  hash: () => null,
};
registerStdlibModule('email.headerregistry', {
  classes: {
    Address: AddressDef,
    Group: GroupDef,
    HeaderRegistry: {
      typeName: 'HeaderRegistry',
      construct: (ctx, args, kwargs) => ctx.native('email.headerregistry.HeaderRegistry', { base: null, registry: {} }),
      methods: {
        map_to_type: (ctx, self, args) => { self.data.registry[String(ctx.str(args[0])).toLowerCase()] = args[1]; return NONE; },
      },
      getitem: (ctx, self, key) => {
        const name = String(ctx.str(key)).toLowerCase();
        if (name in self.data.registry) return self.data.registry[name];
        // 既定の対応（主要ヘッダのみ。他は UnstructuredHeader 相当だが未登録のため ncls を返す）
        return ctx.ncls('email.headerregistry.UnstructuredHeader');
      },
    },
  },
});
