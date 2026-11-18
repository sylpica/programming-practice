import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { pySpecialItems as items, pyAdvancedTemplates as ADVANCED_TEMPLATES, pyAdvancedGlossaryRaw as ADVANCED_GLOSSARY } from "./helpers-b6.mjs";
import { GLOSSARY } from "../js/types/python/glossary.js";

// 高度モード ブロックB6 Python班3（特殊メソッド・クラス機構）。
// クラス機構（classmethod／staticmethod／property／super／MRO／
// ディスクリプタ）の意味論実装と、特殊メソッドの構文形発火を検証する。
// 期待値はすべて実 CPython 3.12.3 の実走で裏付けた（例外として
// property.__name__ は 3.15 ドキュメントに基づく。項目の pitfalls 参照）。

const py = getDefinition("python");
const run = async (code) =>
  py.simulate(code, structuredClone(py.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const HOST_LEAK =
  /Maximum call stack|Cannot read properties|is not a function|undefined is not/;
const out1 = async (code) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], code);
  assert.equal(r.paths.length, 1, code);
  return outputs(r)[0].join("\n");
};
const errKind = async (code, kind) => {
  const r = await run(code);
  const es = errors(r);
  assert.ok(es.length > 0, "must stop: " + code);
  assert.match(es[0].message, new RegExp("^" + kind + "："), es[0].message);
  assert.doesNotMatch(es[0].message, HOST_LEAK);
  return es[0].message;
};

/* ---------- F-01：classmethod ---------- */

test("B6P3 classmethod typical: class and instance access bind cls", async () => {
  const code = `class F:
    kind = "F"
    @classmethod
    def make(cls, n):
        return cls.kind + ":" + n
print(F.make("a"))
print(F().make("b"))`;
  assert.equal(await out1(code), "F:a\nF:b");
});

test("B6P3 classmethod boundary: subclass call passes the subclass as cls", async () => {
  const code = `class A:
    @classmethod
    def who(cls):
        return cls.__name__
class B(A):
    pass
print(B.who())`;
  assert.equal(await out1(code), "B");
});

test("B6P3 classmethod combination: alternative constructor via cls()", async () => {
  const code = `class P:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    @classmethod
    def from_str(cls, s):
        a, b = s.split(",")
        return cls(int(a), int(b))
    def __repr__(self):
        return f"P({self.x}, {self.y})"
print(P.from_str("3,4"))`;
  assert.equal(await out1(code), "P(3, 4)");
});

test("B6P3 classmethod error: non-callable argument raises TypeError", async () => {
  await errKind("print(classmethod(5))", "TypeError");
});

/* ---------- F-01：staticmethod ---------- */

test("B6P3 staticmethod typical: no implicit first argument", async () => {
  const code = `class F:
    @staticmethod
    def util(x):
        return x * 3
print(F.util(5))
print(F().util(2))`;
  assert.equal(await out1(code), "15\n6");
});

test("B6P3 staticmethod boundary: inherited by subclass unchanged", async () => {
  const code = `class A:
    @staticmethod
    def s(x):
        return x + 1
class B(A):
    pass
print(B.s(1))
print(B().s(2))`;
  assert.equal(await out1(code), "2\n3");
});

test("B6P3 staticmethod error: missing argument is TypeError (nothing auto-passed)", async () => {
  const code = `class F:
    @staticmethod
    def util(x):
        return x
F.util()`;
  await errKind(code, "TypeError");
});

/* ---------- F-01：property ---------- */

test("B6P3 property typical: getter and setter fire on attribute access", async () => {
  const code = `class T:
    def __init__(self):
        self._c = 0
    @property
    def c(self):
        return self._c
    @c.setter
    def c(self, v):
        self._c = v * 2
t = T()
t.c = 21
print(t.c)`;
  assert.equal(await out1(code), "42");
});

test("B6P3 property boundary: class access returns the property object itself", async () => {
  const code = `class T:
    @property
    def c(self):
        return 1
print(type(T.c).__name__)
print(T.c.__name__)`;
  assert.equal(await out1(code), "property\nc");
});

test("B6P3 property error: assigning to a read-only property raises AttributeError", async () => {
  const code = `class T:
    @property
    def c(self):
        return 1
t = T()
t.c = 5`;
  await errKind(code, "AttributeError");
});

test("B6P3 property combination: deleter fires and constructor form works", async () => {
  const code = `class T:
    def __init__(self):
        self._v = 1
    @property
    def v(self):
        return self._v
    @v.deleter
    def v(self):
        self._v = 0
t = T()
del t.v
print(t.v)
class U:
    def get_v(self):
        return 7
    v = property(get_v)
print(U().v)`;
  assert.equal(await out1(code), "0\n7");
});

test("B6P3 property.getter/setter rebuild the accessor set", async () => {
  const code = `class T:
    def __init__(self):
        self._v = 5
    def get_v(self):
        return self._v
    v = property(get_v)
    @v.getter
    def v(self):
        return self._v * 10
    @v.setter
    def v(self, value):
        self._v = value
t = T()
print(t.v)
t.v = 3
print(t._v)`;
  assert.equal(await out1(code), "50\n3");
});

/* ---------- F-01：super／継承／MRO ---------- */

test("B6P3 inheritance typical: base attributes and methods resolve", async () => {
  const code = `class A:
    x = 10
    def hi(self):
        return "hi"
class B(A):
    pass
b = B()
print(b.x)
print(b.hi())
print(isinstance(b, A))`;
  assert.equal(await out1(code), "10\nhi\nTrue");
});

test("B6P3 super typical: zero-arg super in method and __init__ chain", async () => {
  const code = `class A:
    def __init__(self):
        self.a = 1
    def greet(self):
        return "A"
class B(A):
    def __init__(self):
        super().__init__()
        self.b = 2
    def greet(self):
        return "B+" + super().greet()
b = B()
print(b.greet())
print(b.a + b.b)`;
  assert.equal(await out1(code), "B+A\n3");
});

test("B6P3 super boundary: two-argument form and classmethod through super", async () => {
  const code = `class A:
    def hi(self):
        return "A-hi"
    @classmethod
    def make(cls):
        return "A.make:" + cls.__name__
class B(A):
    def hi(self):
        return "B>" + super(B, self).hi()
    @classmethod
    def make(cls):
        return "B>" + super().make()
print(B().hi())
print(B.make())`;
  assert.equal(await out1(code), "B>A-hi\nB>A.make:B");
});

test("B6P3 super combination: multiple inheritance follows C3 MRO", async () => {
  const code = `class A:
    def who(self):
        return "A"
class B(A):
    def who(self):
        return "B"
class C(A):
    def who(self):
        return "C"
class D(B, C):
    pass
print(D().who())
print([c.__name__ for c in D.mro()])`;
  assert.equal(await out1(code), "B\n['D', 'B', 'C', 'A', 'object']");
});

test("B6P3 super error: zero-arg super outside a method raises RuntimeError", async () => {
  await errKind("print(super())", "RuntimeError");
});

test("B6P3 super error: two-arg super with unrelated object raises TypeError", async () => {
  const code = `class A:
    pass
class B:
    pass
print(super(A, B()))`;
  await errKind(code, "TypeError");
});

test("B6P3 MRO error: inconsistent hierarchy raises TypeError at class definition", async () => {
  const code = `class A:
    pass
class B(A):
    pass
class C(A, B):
    pass`;
  await errKind(code, "TypeError");
});

test("B6P3 type.mro returns the linearization ending at object", async () => {
  const code = `class A:
    pass
class B(A):
    pass
class C(B):
    pass
print([c.__name__ for c in C.mro()])
print([c.__name__ for c in A.mro()])`;
  assert.equal(await out1(code), "['C', 'B', 'A', 'object']\n['A', 'object']");
});

/* ---------- F-01：ディスクリプタ・属性プロトコル ---------- */

test("B6P3 descriptor: __get__/__set__/__delete__ fire; data descriptor wins over instance dict", async () => {
  const code = `class Desc:
    def __get__(self, obj, objtype=None):
        return obj.stored
    def __set__(self, obj, value):
        obj.stored = value * 2
    def __delete__(self, obj):
        obj.stored = "deleted"
class H:
    d = Desc()
    def __init__(self):
        self.stored = 0
h = H()
h.d = 21
print(h.d)
del h.d
print(h.stored)`;
  assert.equal(await out1(code), "42\ndeleted");
});

test("B6P3 descriptor boundary: non-data descriptor loses to instance attribute", async () => {
  const code = `class Desc:
    def __get__(self, obj, objtype=None):
        return "from-desc"
class H:
    d = Desc()
h = H()
print(h.d)
h.d = "own"
print(h.d)`;
  assert.equal(await out1(code), "from-desc\nown");
});

test("B6P3 attribute protocol: __getattr__ only for missing, __setattr__ intercepts all", async () => {
  const code = `class D:
    def __getattr__(self, name):
        return "dyn:" + name
    def __setattr__(self, name, value):
        object.__setattr__(self, name, value * 2)
d = D()
d.x = 5
print(d.x)
print(d.missing)`;
  assert.equal(await out1(code), "10\ndyn:missing");
});

test("B6P3 attribute protocol: __getattribute__ with object.__getattribute__ fallback", async () => {
  const code = `class G:
    def __getattribute__(self, name):
        if name == "special":
            return "SP"
        return object.__getattribute__(self, name)
    def __init__(self):
        self.x = 1
g = G()
print(g.special)
print(g.x)`;
  assert.equal(await out1(code), "SP\n1");
});

test("B6P3 attribute protocol: __delattr__ fires and plain del removes the attribute", async () => {
  const code = `class D:
    def __delattr__(self, name):
        self.deleted = name
d = D()
d.x = 1
del d.x
print(d.deleted)`;
  assert.equal(await out1(code), "x");
  const code2 = `class C:
    pass
c = C()
c.a = 1
del c.a
print(c.a)`;
  await errKind(code2, "AttributeError");
});

test("B6P3 dunder attributes: __class__, __dict__, __annotations__, __slots__, __match_args__", async () => {
  const code = `class C:
    __slots__ = ("x",)
    __match_args__ = ("x", "y")
    x: int
    y: str = "a"
c = C()
c.a = 1
print(c.__class__.__name__)
print(c.__dict__)
print(C.__annotations__)
print(C.__slots__)
print(C.__match_args__)`;
  assert.equal(
    await out1(code),
    "C\n{'a': 1}\n{'x': <class 'int'>, 'y': <class 'str'>}\n('x',)\n('x', 'y')"
  );
});

test("B6P3 __new__ creates the instance before __init__ runs", async () => {
  const code = `class W:
    def __new__(cls, x):
        obj = object.__new__(cls)
        obj.x = x
        return obj
    def __init__(self, x):
        self.y = x * 2
w = W(3)
print(w.x + w.y)`;
  assert.equal(await out1(code), "9");
});

/* ---------- F-01：特殊メソッドの発火（代表ケース） ---------- */

test("B6P3 operators: NotImplemented falls back to the reflected method, then TypeError", async () => {
  const code = `class L:
    def __add__(self, o):
        return NotImplemented
class R:
    def __radd__(self, o):
        return 55
print(L() + R())`;
  assert.equal(await out1(code), "55");
  const code2 = `class L:
    def __add__(self, o):
        return NotImplemented
print(L() + 1)`;
  await errKind(code2, "TypeError");
});

test("B6P3 comparison: __ne__ is derived from __eq__ when not defined", async () => {
  const code = `class N:
    def __init__(self, v):
        self.v = v
    def __eq__(self, o):
        return self.v == o.v
print(N(1) != N(2))
print(N(1) in [N(1), N(2)])`;
  assert.equal(await out1(code), "True\nTrue");
});

test("B6P3 hash contract: __eq__ without __hash__ and __hash__ = None are unhashable", async () => {
  const code = `class E:
    def __eq__(self, o):
        return True
d = {E(): 1}`;
  await errKind(code, "TypeError");
  const code2 = `class E:
    __hash__ = None
d = {E(): 1}`;
  await errKind(code2, "TypeError");
});

test("B6P3 with: __exit__ suppresses only when it returns true", async () => {
  const code = `class CM:
    def __enter__(self):
        return self
    def __exit__(self, t, v, tb):
        print(t.__name__)
        return True
with CM():
    raise ValueError("boom")
print("after")`;
  assert.equal(await out1(code), "ValueError\nafter");
  const code2 = `class CM:
    def __enter__(self):
        return self
    def __exit__(self, t, v, tb):
        return False
with CM():
    raise ValueError("boom")`;
  await errKind(code2, "ValueError");
});

test("B6P3 display: __str__ returning a non-string raises TypeError", async () => {
  const code = `class B:
    def __str__(self):
        return 5
print(B())`;
  await errKind(code, "TypeError");
});

test("B6P3 class_getitem fires on class subscript", async () => {
  const code = `class G:
    def __class_getitem__(cls, item):
        return "G-of"
print(G[int])`;
  assert.equal(await out1(code), "G-of");
});

/* ---------- リファレンス項目の網羅と example 実行確認 ---------- */

test("B6P3 reference covers the whole special-methods inventory (133 items)", () => {
  assert.equal(items.length, 133);
  const byStatus = {};
  for (const i of items) byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  assert.deepEqual(byStatus, { supported: 99, unsupported: 33, unverified: 1 });
  const ids = new Set(items.map((i) => i.id));
  assert.equal(ids.size, 133);
  for (const req of [
    "classmethod", "staticmethod", "property", "super",
    "property.getter", "property.setter", "property.deleter", "property.__name__",
    "type.mro", "sentinel.__name__", "sentinel.__module__",
    "generator", "coroutine", "agen",
    "generator.send", "generator.throw", "generator.close",
    "coroutine.send", "coroutine.throw", "coroutine.close",
    "agen.asend", "agen.athrow", "agen.aclose",
    "type.__instancecheck__", "type.__subclasscheck__",
    "module.__getattr__", "module.__dir__", "object.__annotate__",
  ]) assert.ok(ids.has(req), req);
  assert.equal(items.find((i) => i.id === "object.__annotate__").status, "unverified");
});

test("B6P3 every supported special-method example runs in syntax form", async () => {
  for (const item of items) {
    if (item.status !== "supported") continue;
    // sentinel 値は P1 班の実装前提のため、このスナップショットでは実行できない
    if (item.id.startsWith("sentinel.")) continue;
    const r = await run(item.example);
    assert.deepEqual(errors(r), [], item.id + ": " + item.example);
    assert.equal(r.paths.length, 1, item.id);
    assert.equal(outputs(r)[0].join("\n"), item.expected, item.id);
  }
});

/* ---------- テンプレート・用語集 ---------- */

test("B6P3 advanced templates all run to their expected output", async () => {
  assert.equal(ADVANCED_TEMPLATES.length, 6);
  for (const t of ADVANCED_TEMPLATES) {
    const r = await run(t.code);
    assert.deepEqual(errors(r), [], t.id);
    assert.equal(r.paths.length, 1, t.id);
    assert.equal(outputs(r)[0].join("\n"), t.expected, t.id);
  }
});

test("B6P3 advanced glossary has 8 entries not duplicating the base glossary", () => {
  assert.equal(ADVANCED_GLOSSARY.length, 8);
  const baseIds = new Set(GLOSSARY.map((g) => g.id));
  for (const g of ADVANCED_GLOSSARY) {
    assert.ok(!baseIds.has(g.id), g.id);
    assert.ok(g.ja && g.en && g.def, g.id);
  }
});
