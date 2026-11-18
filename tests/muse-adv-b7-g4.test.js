/* 高度モード B7 G4 テスト：コレクション・データ構造系16モジュール（346件）。
 * - 完全性：REF_G4 の件数・一意性・正規形（status 必須、旧形式フィールド禁止）
 * - F-04 照合：supported 項目のリファレンス例を全件実行し、ケース表と比べる。
 *   ケース表の期待値は CPython 3.12.3 実走で採取したもの（採取できない
 *   3.13+ の2件と heapq *_max 5件は公式ドキュメント／否定ミラーで独立検証）。
 * - モジュール別の典型・境界・異常系テスト。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { REF_G4 } from '../js/types/python/group-advanced-g4.js';

const py = getDefinition('python');
async function run(code) {
  const r = await py.simulate(code, structuredClone(py.model.defaults));
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);
  return { out: (r.paths[0]?.outputs || []).map((o) => o.text).join('\n'), errs };
}
async function eq(code, expected) {
  const { out, errs } = await run(code);
  assert.deepEqual(errs, [], 'errors for: ' + code);
  assert.equal(out, expected, 'for: ' + code);
}
/* 例外の型だけを確かめる（メッセージはアドレス等を含む場合があるため型で照合） */
async function raises(code, excName) {
  const probe = 'try:\n' + code.split('\n').map((l) => '    ' + l).join('\n') + '\nexcept ' + excName + ':\n    print(\'raised:' + excName + '\')\nexcept Exception:\n    print(\'raised:other\')';
  const { out, errs } = await run(probe);
  assert.deepEqual(errs, [], 'errors for probe: ' + code);
  assert.equal(out, 'raised:' + excName, 'for: ' + code);
}

const CASES = {
 "collections.ChainMap": "2 ['b', 'a']",
 "collections.ChainMap.maps": "2",
 "collections.ChainMap.new_child": "['a', 'b'] ['a']",
 "collections.ChainMap.parents": "['b']",
 "collections.Counter": "Counter({'b': 2, 'a': 1, 'c': 1})",
 "collections.Counter.elements": "['a', 'b', 'b', 'c']",
 "collections.Counter.fromkeys": "NotImplementedError",
 "collections.Counter.most_common": "[('b', 2), ('a', 1)]",
 "collections.Counter.subtract": "Counter({'a': 1, 'b': 1})",
 "collections.Counter.total": "4",
 "collections.Counter.update": "Counter({'b': 2, 'a': 1, 'c': 1})",
 "collections.OrderedDict": "OrderedDict({'a': 1, 'b': 2})",
 "collections.OrderedDict.move_to_end": "['b', 'a']",
 "collections.OrderedDict.popitem": "('b', 2)",
 "collections.UserDict": "1 {'a': 1}",
 "collections.UserDict.data": "{'a': 1}",
 "collections.UserDict.popitem": "('a', 1)",
 "collections.UserList": "[1, 2, 3]",
 "collections.UserList.data": "[1, 2]",
 "collections.UserString": "AB",
 "collections.UserString.data": "ab",
 "collections.defaultdict": "[1] True",
 "collections.defaultdict.__missing__": "0",
 "collections.defaultdict.default_factory": "True",
 "collections.deque": "deque([1, 2, 3])",
 "collections.deque.append": "[1, 2, 3]",
 "collections.deque.appendleft": "[0, 1, 2]",
 "collections.deque.clear": "0",
 "collections.deque.copy": "[1, 2] [1, 2, 3]",
 "collections.deque.count": "2",
 "collections.deque.extend": "[1, 2, 3]",
 "collections.deque.extendleft": "[2, 1, 3]",
 "collections.deque.index": "2",
 "collections.deque.insert": "[1, 2, 3]",
 "collections.deque.maxlen": "5",
 "collections.deque.pop": "2 [1]",
 "collections.deque.popleft": "1 [2]",
 "collections.deque.remove": "[1, 3]",
 "collections.deque.reverse": "[3, 2, 1]",
 "collections.deque.rotate": "[2, 3, 1]",
 "collections.namedtuple": "1 2",
 "collections.somenamedtuple._asdict": "{'x': 1, 'y': 2}",
 "collections.somenamedtuple._field_defaults": "{'y': 9}",
 "collections.somenamedtuple._fields": "('x', 'y')",
 "collections.somenamedtuple._make": "Point(x=3, y=4)",
 "collections.somenamedtuple._replace": "Point(x=1, y=5)",
 "collections.abc.AsyncGenerator": "TypeError",
 "collections.abc.AsyncIterable": "TypeError",
 "collections.abc.AsyncIterator": "TypeError",
 "collections.abc.Awaitable": "TypeError",
 "collections.abc.Buffer": "TypeError",
 "collections.abc.ByteString": "TypeError",
 "collections.abc.Callable": "TypeError",
 "collections.abc.Collection": "TypeError",
 "collections.abc.Container": "TypeError",
 "collections.abc.Coroutine": "TypeError",
 "collections.abc.Generator": "TypeError",
 "collections.abc.Hashable": "TypeError",
 "collections.abc.ItemsView": "1 [('a', 1)]",
 "collections.abc.Iterable": "TypeError",
 "collections.abc.Iterator": "TypeError",
 "collections.abc.KeysView": "2 ['a', 'b']",
 "collections.abc.Mapping": "True",
 "collections.abc.MappingView": "TypeError",
 "collections.abc.MutableMapping": "True",
 "collections.abc.MutableSequence": "True",
 "collections.abc.MutableSet": "TypeError",
 "collections.abc.Reversible": "TypeError",
 "collections.abc.Sequence": "True",
 "collections.abc.Set": "TypeError",
 "collections.abc.Sized": "TypeError",
 "collections.abc.ValuesView": "2 [1, 2]",
 "heapq.heapify": "[1, 3, 2]",
 "heapq.heappop": "1 [2, 3]",
 "heapq.heappush": "[0, 1, 2, 3]",
 "heapq.heappushpop": "0 [1, 3, 2]",
 "heapq.heapreplace": "1 [2, 3, 5]",
 "heapq.merge": "[1, 2, 3, 4]",
 "heapq.nlargest": "[5, 4]",
 "heapq.nsmallest": "[1, 4]",
 "bisect.bisect": "3",
 "bisect.bisect_left": "1",
 "bisect.bisect_right": "3",
 "bisect.insort": "[1, 2, 2, 3]",
 "bisect.insort_left": "[1, 2, 2, 3]",
 "bisect.insort_right": "[0, 1, 2, 3]",
 "array.array": "array('i', [1, 2])",
 "array.array.append": "[1, 2]",
 "array.array.byteswap": "[1, 2]",
 "array.array.clear": "0",
 "array.array.count": "2",
 "array.array.extend": "[1, 2, 3]",
 "array.array.fromlist": "[1, 2, 3]",
 "array.array.fromunicode": "['a', 'b']",
 "array.array.index": "2",
 "array.array.insert": "[1, 2, 3]",
 "array.array.itemsize": "4",
 "array.array.pop": "2 [1]",
 "array.array.remove": "[1, 3]",
 "array.array.reverse": "[3, 2, 1]",
 "array.array.tolist": "[1, 2]",
 "array.array.tounicode": "ab",
 "array.array.typecode": "i",
 "copy.Error": "caught",
 "copy.copy": "[[1, 9], 2] 2",
 "copy.deepcopy": "True 1",
 "pprint.PrettyPrinter": "[1, 2, 3]",
 "pprint.PrettyPrinter.format": "('[1, 2]', True, False)",
 "pprint.PrettyPrinter.isreadable": "False True",
 "pprint.PrettyPrinter.isrecursive": "True False",
 "pprint.PrettyPrinter.pformat": "{'a': 1, 'b': 2}",
 "pprint.isreadable": "False",
 "pprint.isrecursive": "False",
 "pprint.pformat": "{'a': 1, 'b': 2}",
 "pprint.saferepr": "[1, 'a']",
 "reprlib.Repr": "[0, 1, 2, 3, 4, 5, ...]",
 "reprlib.Repr.fillvalue": "...",
 "reprlib.Repr.indent": "None",
 "reprlib.Repr.maxarray": "5",
 "reprlib.Repr.maxdeque": "6",
 "reprlib.Repr.maxdict": "4",
 "reprlib.Repr.maxfrozenset": "6",
 "reprlib.Repr.maxlevel": "6",
 "reprlib.Repr.maxlist": "6",
 "reprlib.Repr.maxlong": "40",
 "reprlib.Repr.maxother": "30",
 "reprlib.Repr.maxset": "6",
 "reprlib.Repr.maxstring": "30",
 "reprlib.Repr.maxtuple": "6",
 "reprlib.Repr.repr": "'abcdefghijkl...xyz0123456789'",
 "reprlib.Repr.repr1": "[1, [...]]",
 "reprlib.aRepr": "6",
 "reprlib.recursive_repr": "done 2",
 "reprlib.repr": "[0, 1, 2, 3, 4, 5, ...]",
 "enum.Enum": "Color.RED Color.GREEN",
 "enum.Enum.__repr__": "<Color.RED: 1>",
 "enum.Enum.__str__": "Color.RED",
 "enum.Enum._name_": "RED",
 "enum.Enum._value_": "1",
 "enum.Enum.name": "RED",
 "enum.Enum.value": "2",
 "enum.EnumCheck": "one name per value",
 "enum.EnumCheck.CONTINUOUS": "no skipped integer values",
 "enum.EnumCheck.NAMED_FLAGS": "multi-flag aliases may not contain unnamed flags",
 "enum.EnumCheck.UNIQUE": "one name per value",
 "enum.EnumType.__call__": "GREEN",
 "enum.EnumType.__members__": "['RED', 'GREEN']",
 "enum.Flag": "Perm.R|W",
 "enum.Flag.__and__": "Perm.W",
 "enum.Flag.__bool__": "True False",
 "enum.Flag.__contains__": "True",
 "enum.Flag.__invert__": "Perm.W|X",
 "enum.Flag.__iter__": "[<Perm.R: 1>, <Perm.X: 4>]",
 "enum.Flag.__len__": "2",
 "enum.Flag.__or__": "<Perm.R|W: 3>",
 "enum.Flag.__xor__": "<Perm.R: 1>",
 "enum.IntEnum": "2 2",
 "enum.IntFlag": "<IP.A|B: 3> 3",
 "enum.StrEnum": "a ax",
 "enum.auto": "1 2",
 "enum.bin": "0b0 1010 0b1 0101",
 "enum.show_flag_values": "[1, 2]",
 "enum.unique": "C.A",
 "enum.verify": "C.B",
 "graphlib.CycleError": "CycleError",
 "graphlib.TopologicalSorter": "('a', 'b')",
 "graphlib.TopologicalSorter.add": "('a', 'b')",
 "graphlib.TopologicalSorter.done": "('b',)",
 "graphlib.TopologicalSorter.get_ready": "('a',)",
 "graphlib.TopologicalSorter.is_active": "True",
 "graphlib.TopologicalSorter.prepare": "('a',)",
 "graphlib.TopologicalSorter.static_order": "('a', 'b')",
 "weakref.ProxyTypes": "2",
 "contextlib.AbstractContextManager": "TypeError",
 "contextlib.ExitStack": "['b', 'a']",
 "contextlib.ExitStack.callback": "['x']",
 "contextlib.ExitStack.close": "[2, 1]",
 "contextlib.ExitStack.pop_all": "[1]",
 "contextlib.ExitStack.push": "1",
 "contextvars.Context": "0",
 "contextvars.Context.copy": "1",
 "contextvars.Context.get": "None fb",
 "contextvars.Context.items": "1",
 "contextvars.Context.keys": "1",
 "contextvars.Context.run": "d",
 "contextvars.Context.values": "[7]",
 "contextvars.ContextVar": "d",
 "contextvars.ContextVar.get": "d",
 "contextvars.ContextVar.name": "myvar",
 "contextvars.ContextVar.reset": "d",
 "contextvars.ContextVar.set": "x",
 "contextvars.Token": "True",
 "contextvars.Token.MISSING": "True",
 "contextvars.Token.old_value": "<Token.MISSING>",
 "contextvars.Token.var": "v",
 "contextvars.copy_context": "x",
 "dataclasses.Field": "x",
 "dataclasses.FrozenInstanceError": "caught",
 "dataclasses.KW_ONLY": "2",
 "dataclasses.MISSING": "True",
 "dataclasses.asdict": "{'x': 1, 'y': 2}",
 "dataclasses.astuple": "(1, 2)",
 "dataclasses.field": "5",
 "dataclasses.fields": "['x', 'y']",
 "dataclasses.is_dataclass": "True False",
 "dataclasses.make_dataclass": "P(x=1, y=2)",
 "dataclasses.replace": "P(x=1, y=9)",
 "abc.ABC": "True",
 "abc.ABCMeta.register": "True",
 "abc.abstractclassmethod": "abstractclassmethod を適用",
 "abc.abstractmethod": "True",
 "abc.abstractproperty": "abstractproperty はパススルー",
 "abc.abstractstaticmethod": "abstractstaticmethod を適用",
 "abc.get_cache_token": "True",
 "types.CellType": "5",
 "types.GenericAlias": "list[int]",
 "types.MappingProxyType": "{'a': 1, 'b': 2}",
 "types.MappingProxyType.copy": "{'a': 1}",
 "types.MappingProxyType.get": "9",
 "types.MappingProxyType.items": "[('a', 1)]",
 "types.MappingProxyType.keys": "['a']",
 "types.MappingProxyType.values": "[1]",
 "types.MethodType": "15",
 "types.NoneType": "True",
 "types.SimpleNamespace": "namespace(x=1, y='a')",
 "types.UnionType": "TypeError",
 "heapq.heapify_max": "[3, 1, 2]",
 "heapq.heappop_max": "3 [2, 1]",
 "heapq.heappush_max": "[5, 3, 2, 1]",
 "heapq.heappushpop_max": "9 [3, 1, 2]",
 "heapq.heapreplace_max": "3 [2, 1, 0]"
};

const MODULE_COUNTS = { collections: 46, 'collections.abc': 27, heapq: 13, bisect: 6, array: 23, copy: 4, pprint: 12, reprlib: 19, enum: 61, graphlib: 8, weakref: 21, contextlib: 24, contextvars: 17, dataclasses: 14, abc: 10, types: 41 };
function moduleOf(name) {
  if (name.startsWith('collections.abc.')) return 'collections.abc';
  return name.split('.')[0] === 'collections' && name.startsWith('collections.') ? 'collections' : name.split('.')[0];
}

test('G4 完全性：346件・一意・正規形・status', () => {
  assert.equal(REF_G4.length, 346);
  const names = new Set(REF_G4.map((i) => i.name));
  assert.equal(names.size, 346);
  const counts = {};
  for (const item of REF_G4) {
    for (const f of ['name', 'category', 'syntax', 'description', 'example', 'status']) {
      assert.ok(item[f] !== undefined && item[f] !== '', item.name + ' missing ' + f);
    }
    assert.ok(['supported', 'unsupported', 'unverified'].includes(item.status), item.name);
    for (const bad of ['id', 'expected', 'summary', 'pitfalls', 'doc', 'args', 'related', 'lesson', 'importance', 'level']) {
      assert.ok(!(bad in item), item.name + ' has forbidden field ' + bad);
    }
    const m = moduleOf(item.name);
    counts[m] = (counts[m] || 0) + 1;
  }
  assert.deepEqual(counts, MODULE_COUNTS);
  const supported = REF_G4.filter((i) => i.status === 'supported').map((i) => i.name).sort();
  assert.deepEqual(Object.keys(CASES).sort(), supported, 'ケース表は supported 全件を覆うこと');
});

test('G4 F-04：supported のリファレンス例を全件実行して照合', async () => {
  for (const item of REF_G4) {
    if (item.status !== 'supported') continue;
    const { out, errs } = await run(item.example);
    assert.deepEqual(errs, [], item.name + ' errors');
    assert.equal(out, CASES[item.name], item.name);
  }
});

test('G4 collections：演算と境界', async () => {
  await eq("from collections import Counter\na = Counter('aab')\nb = Counter('abb')\nprint(a + b, a - b, a & b, a | b)", "Counter({'a': 3, 'b': 3}) Counter({'a': 1}) Counter({'a': 1, 'b': 1}) Counter({'a': 2, 'b': 2})");
  await eq("from collections import Counter\nc = Counter('ab')\nc['z'] = 5\nprint(c.most_common(1))", "[('z', 5)]");
  await raises("from collections import Counter\nCounter.fromkeys('ab')", 'NotImplementedError');
  await eq("from collections import OrderedDict\na = OrderedDict([('x', 1), ('y', 2)])\nb = OrderedDict([('y', 2), ('x', 1)])\nprint(a == b, a == {'x': 1, 'y': 2})", 'False True');
  await eq("from collections import OrderedDict\no = OrderedDict([('a', 1), ('b', 2)])\nprint(o.popitem(last=False))", "('a', 1)");
  await raises("from collections import OrderedDict\nOrderedDict().popitem()", 'KeyError');
  await eq("from collections import defaultdict\nd = defaultdict(None)\ntry:\n    d['x']\nexcept KeyError:\n    print('KeyError')", 'KeyError');
  await eq("from collections import deque\nd = deque([1, 2], maxlen=2)\nd.appendleft(0)\nprint(list(d))", '[0, 1]');
  await raises("from collections import deque\ndeque().pop()", 'IndexError');
  await raises("from collections import deque\nd = deque([1], maxlen=1)\nd.insert(0, 9)", 'IndexError');
  await eq("from collections import deque\nd = deque([1, 2, 3])\nprint(d[0], d[-1], d == [1, 2, 3])", '1 3 False');
  await eq("from collections import ChainMap\nc = ChainMap({'a': 1}, {'a': 9, 'b': 2})\nc['c'] = 3\nprint(c['a'], c.maps[0])", "1 {'a': 1, 'c': 3}");
  await eq("from collections import UserList\nu = UserList([3, 1, 2])\nu.sort()\nprint(u, u.data)", '[1, 2, 3] [1, 2, 3]');
  await eq("from collections import UserString\nu = UserString('hello')\nprint(u[1:3], u + '!', u * 2)", 'el hello! hellohello');
  await eq("from collections import namedtuple\nP = namedtuple('P', 'x y', defaults=[9])\nprint(P(1), P._fields, P._field_defaults)", "P(x=1, y=9) ('x', 'y') {'y': 9}");
  await eq("from collections import namedtuple\nP = namedtuple('P', 'a a class', rename=True)\nprint(P._fields)", "('a', '_1', '_2')");
  await raises("from collections import namedtuple\nnamedtuple('P', ['class'])", 'ValueError');
  await raises("from collections import namedtuple\nP = namedtuple('P', ['x', 'y'])\nP._make([1])", 'TypeError');
  await raises("from collections import namedtuple\nP = namedtuple('P', ['x', 'y'])\nP(1, 2)._replace(z=3)", 'ValueError');
  await eq("from collections import namedtuple\nP = namedtuple('P', ['x', 'y'])\nprint(P(1, 2) == (1, 2), P(1, 2)._asdict())", "True {'x': 1, 'y': 2}");
});

test('G4 heapq/bisect：境界と異常系', async () => {
  await raises("import heapq\nheapq.heapify((1, 2))", 'TypeError');
  await raises("import heapq\nheapq.heappop([])", 'IndexError');
  await eq("import heapq\nh = []\nprint(heapq.heappushpop(h, 7), h)", '7 []');
  await eq("import heapq\nprint(heapq.nlargest(2, ['bb', 'a', 'ccc'], key=len))", "['ccc', 'bb']");
  await eq("import heapq\nprint(list(heapq.merge([4, 1], [3, 2], reverse=True)))", '[4, 3, 2, 1]');
  await raises("import bisect\nbisect.insort((1, 2), 3)", 'AttributeError');
  await raises("import bisect\nbisect.bisect_left([1, 2], 1, lo=-1)", 'ValueError');
  await eq("import bisect\na = [1, 3, 5]\nbisect.insort(a, 4)\nprint(a)", '[1, 3, 4, 5]');
});

test('G4 array：型コードと範囲', async () => {
  await raises("from array import array\narray('z')", 'ValueError');
  await raises("from array import array\narray('b', [1000])", 'OverflowError');
  await raises("from array import array\narray('B', [-1])", 'OverflowError');
  await raises("from array import array\na = array('i')\na.fromlist((1, 2))", 'TypeError');
  await eq("from array import array\na = array('d', [1.5])\nb = a + array('d', [2.5])\nprint(b.tolist(), a.typecode, a.itemsize)", "[1.5, 2.5] d 8");
  await eq("from array import array\na = array('u', 'xy')\nprint(a.tounicode(), a[0])", 'xy x');
  await raises("from array import array\narray('i', [1]).tounicode()", 'ValueError');
});

test('G4 enum：エイリアス・境界・検証', async () => {
  await raises("from enum import Enum\nColor = Enum('Color', 'RED GREEN')\nColor(9)", 'ValueError');
  await raises("from enum import Enum, unique\nunique(Enum('U', [('A', 1), ('B', 1)]))", 'ValueError');
  await eq("from enum import Flag, auto\nPerm = Flag('Perm', [('R', auto()), ('W', auto()), ('X', auto())])\nprint(len(Perm.R | Perm.W | Perm.X), list(Perm.W | Perm.R))", '3 [<Perm.R: 1>, <Perm.W: 2>]');
  await raises("from enum import Flag, auto\nPerm = Flag('Perm', [('R', auto())])\nPerm(2)", 'ValueError');
  await eq("from enum import IntFlag, auto\nIP = IntFlag('IP', [('A', auto()), ('B', auto())])\nprint(repr(IP(7)), str(IP(7)))", '<IP.A|B|4: 7> 7');
  await eq("from enum import IntEnum\nP = IntEnum('P', [('LOW', 1), ('HIGH', 5)])\nQ = IntEnum('Q', [('A', 1)])\nprint(P.HIGH - P.LOW, P.LOW == 1)", '4 True');
  await eq("import enum\nprint(enum.bin(5, max_bits=6))", '0b0 000101');
  await eq("from enum import EnumCheck, verify, Enum\ntry:\n    verify(EnumCheck.CONTINUOUS)(Enum('C', [('A', 1), ('B', 3)]))\nexcept ValueError:\n    print('ValueError')", 'ValueError');
});

test('G4 graphlib：状態機械と循環', async () => {
  await raises("from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.get_ready()", 'ValueError');
  await raises("from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.prepare()\nts.prepare()", 'ValueError');
  await raises("from graphlib import TopologicalSorter, CycleError\nts = TopologicalSorter()\nts.add('a', 'b')\nts.add('b', 'a')\nts.prepare()", 'CycleError');
  await eq("from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('c', 'b')\nts.add('b', 'a')\nts.prepare()\nprint(ts.get_ready())\nts.done('a')\nprint(ts.get_ready(), ts.is_active())", "('a',)\n('b',) True");
  await raises("from graphlib import TopologicalSorter\nts = TopologicalSorter()\nts.add('a')\nts.prepare()\nts.done('zzz')", 'ValueError');
});

test('G4 contextvars：トークンの規則', async () => {
  await raises("from contextvars import ContextVar\nContextVar(123)", 'TypeError');
  await raises("from contextvars import ContextVar\nv = ContextVar('v')\nv.get()", 'LookupError');
  await raises("from contextvars import ContextVar\na = ContextVar('a')\nb = ContextVar('b')\nt = a.set(1)\nb.reset(t)", 'ValueError');
  await raises("from contextvars import ContextVar\nv = ContextVar('v')\nt = v.set(1)\nv.reset(t)\nv.reset(t)", 'RuntimeError');
  await eq("from contextvars import ContextVar, Context\nv = ContextVar('v', default='d')\nctx = Context()\ndef f():\n    v.set('in')\n    return v.get()\nprint(ctx.run(f), v.get())", 'in d');
});

test('G4 dataclasses：生成クラスと異常系', async () => {
  await raises("from dataclasses import field\nfield(default=1, default_factory=list)", 'ValueError');
  await raises("from dataclasses import fields\nfields(3)", 'TypeError');
  await eq("from dataclasses import make_dataclass, astuple, replace, is_dataclass\nP = make_dataclass('P', ['x', 'y'])\np = P(1, 2)\nprint(astuple(p), replace(p, x=9), is_dataclass(p))", '(1, 2) P(x=9, y=2) True');
  await eq("from dataclasses import make_dataclass\nP = make_dataclass('P', ['x', 'y'], )\nprint(P(1, 2) == P(1, 2), P(1, 2) == P(1, 3))", 'True False');
  await raises("from dataclasses import make_dataclass\nP = make_dataclass('P', ['x'])\nP()", 'TypeError');
  await eq("from dataclasses import make_dataclass, KW_ONLY\nP = make_dataclass('P', ['x', KW_ONLY, 'y'])\nprint(P(1, y=2))", 'P(x=1, y=2)');
});

test('G4 pprint/reprlib：深さ・再帰・切り詰め', async () => {
  await eq("import pprint\nprint(pprint.pformat([1, [2, [3]]], depth=1))", '[1, [...]]');
  await eq("import pprint\nprint(pprint.pformat({1: 'a', 'b': 2, 2.5: 'c'}))", "{1: 'a', 2.5: 'c', 'b': 2}");
  await eq("import pprint\nprint(pprint.pformat([1000000], underscore_numbers=True))", '[1_000_000]');
  await eq("import pprint\npp = pprint.PrettyPrinter()\na = [1]\na.append(a)\nprint(pp.isrecursive(a), pp.format(a, {}, 0, 0)[1:])", 'True (False, True)');
  await eq("import reprlib\nprint(reprlib.repr('abcdefghijklmnopqrstuvwxyz0123456789'))", "'abcdefghijkl...xyz0123456789'");
  await eq("import reprlib\nr = reprlib.Repr()\nprint(r.repr1([1, [2]], 1))", '[1, [...]]');
  await eq("import reprlib\nprint(reprlib.repr({1: 1, 2: 2, 3: 3, 4: 4, 5: 5}))", '{1: 1, 2: 2, 3: 3, 4: 4, ...}');
});

test('G4 copy/abc/types/contextlib：横断', async () => {
  await eq("import copy\na = [[1]]\nb = copy.copy(a)\nb[0].append(2)\nprint(a)\nc = copy.deepcopy(a)\nc[0].append(3)\nprint(a)", '[[1, 2]]\n[[1, 2]]');
  await eq("from abc import get_cache_token\nprint(get_cache_token() == get_cache_token())", 'True');
  await eq("from types import MappingProxyType\np = MappingProxyType({'a': 1})\ntry:\n    p['b'] = 2\nexcept TypeError:\n    print('TypeError')", 'TypeError');
  await eq("from types import SimpleNamespace\na = SimpleNamespace(x=1)\nb = SimpleNamespace(x=1)\nprint(a == b, a != SimpleNamespace(x=2))", 'True True');
  await eq("from types import CellType\ntry:\n    CellType().cell_contents\nexcept ValueError:\n    print('ValueError')", 'ValueError');
  await eq("from contextlib import ExitStack\norder = []\ns = ExitStack()\ns.callback(order.append, 1)\ns.callback(order.append, 2)\ns.close()\nprint(order)", '[2, 1]');
  await raises("from collections.abc import Mapping\nMapping()", 'TypeError');
  await eq("from collections import UserString\nfrom collections.abc import Sequence, Iterable\nprint(isinstance(UserString('a'), Sequence), isinstance(UserString('a'), Iterable))", 'True True');
});
