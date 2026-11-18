/* 高度モード B7 G8（言語ランタイム系15モジュール・全730件）のテスト。
 * 期待値は CPython 3.12.3 実走との全件照合で検証済み。3.13 以降の項目は
 * 公式ドキュメント 3.15 と CPython 本体ソースで裏付けた（報告書参照）。
 * 実行方法：node --test tests/muse-adv-b7-g8.test.js（自群ファイルのみ import） */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { G8_EXPECTED } from './muse-adv-b7-g8-expected.js';

const MODS = ['ast', 'dis', 'inspect', 'typing', 'annotationlib', 'token', 'symtable',
  'traceback', 'tokenize', 'codeop', 'code', 'pyclbr', 'modulefinder', 'tabnanny', 'linecache'];
for (const m of MODS) await import('../js/types/python/impl-advanced-' + m + '.js');
const REFS = {};
for (const m of MODS) REFS[m] = (await import('../js/types/python/reference-advanced-' + m + '.js')).referenceAdvanced;

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

/* ---------- 構造照合：全730件・正規形・状態別件数 ---------- */
const COUNTS = { ast: 147, dis: 53, inspect: 127, typing: 151, annotationlib: 14, token: 75,
  symtable: 50, traceback: 50, tokenize: 13, codeop: 3, code: 13, pyclbr: 19,
  modulefinder: 6, tabnanny: 5, linecache: 4 };
test('B7 G8: リファレンス構造（全730件・正規形）', () => {
  const allowed = new Set(['name', 'category', 'syntax', 'description', 'example', 'caution', 'status', 'returns', 'source']);
  let total = 0;
  const byStatus = { supported: 0, unsupported: 0, unverified: 0 };
  for (const m of MODS) {
    const items = REFS[m];
    assert.equal(items.length, COUNTS[m], m);
    const names = new Set(items.map((i) => i.name));
    assert.equal(names.size, items.length, m + ' の名前一意性');
    for (const item of items) {
      total++;
      byStatus[item.status]++;
      for (const k of Object.keys(item)) assert.ok(allowed.has(k), item.name + ' の追加フィールド ' + k);
      assert.ok(['supported', 'unsupported', 'unverified'].includes(item.status), item.name);
      assert.equal(item.category, '標準ライブラリ', item.name);
      assert.ok(item.source.startsWith('https://docs.python.org/ja/3.15/library/' + m + '.html#'), item.name);
      if (item.status === 'unsupported') assert.ok(item.caution.includes('本アプリの高度モードでは未対応です'), item.name);
      if (item.status === 'unverified') assert.ok(item.caution.includes('未検証'), item.name);
    }
  }
  assert.equal(total, 730);
  assert.deepEqual(byStatus, { supported: 483, unsupported: 103, unverified: 144 });
});

/* ---------- F-04：supported 全483件の例題が期待出力と一致 ---------- */
test('B7 G8: supported 例題の全件実行照合（F-04）', async () => {
  let n = 0;
  for (const m of MODS) {
    for (const item of REFS[m]) {
      if (item.status !== 'supported') continue;
      n++;
      const r = await run(item.example);
      assert.deepEqual(errs(r), [], item.name);
      assert.deepEqual(outs(r), G8_EXPECTED[item.name], item.name);
    }
  }
  assert.equal(n, 483);
});

/* ---------- ケース表（典型・境界・異常） ---------- */
const CASES = [
  // token
  ["import token\nprint(token.tok_name[0], token.tok_name[256], token.tok_name[69])", ['ENDMARKER NT_OFFSET N_TOKENS']],
  ["import token\nprint(token.EXACT_TOKEN_TYPES['**'], token.EXACT_TOKEN_TYPES['->'])", ['35 51']],
  ["import token\nprint(token.ISEOF(0), token.ISNONTERMINAL(256), token.ISTERMINAL(255), token.ISTERMINAL(256))", ['True True True False']],
  // ast: literal_eval
  ["import ast\nprint(ast.literal_eval('0x10'), ast.literal_eval('1_000'), ast.literal_eval('-3'))", ['16 1000 -3']],
  ["import ast\nprint(ast.literal_eval(\"'a' 'b'\"))", ['ab']],
  ["import ast\nprint(ast.literal_eval('{1, 2}'), ast.literal_eval('(1, (2, 3))'))", ['{1, 2} (1, (2, 3))']],
  ["import ast\nprint(ast.literal_eval('True'), ast.literal_eval('None'))", ['True None']],
  // ast: ノード操作
  ["import ast\nprint(ast.dump(ast.BinOp(ast.Constant(1), ast.Add(), ast.Constant(2))))", ['BinOp(left=Constant(value=1), op=Add(), right=Constant(value=2))']],
  ["import ast\nprint(ast.dump(ast.Expression(ast.Constant(1)), indent=2))", ['Expression(', '  body=Constant(value=1))']],
  ["import ast\nc = ast.Constant(3)\nprint(c.kind)", ['None']],
  ["import ast\nprint(ast.compare(ast.Constant(1), ast.Constant(1)), ast.compare(ast.Constant(1), ast.Constant(2)))", ['True False']],
  ["import ast\nprint([ast.dump(n) for n in ast.walk(ast.Expression(ast.Constant(1)))])", ["['Expression(body=Constant(value=1))', 'Constant(value=1)']"]],
  // inspect
  ["import inspect\nprint(repr(inspect.cleandoc('  a\\n    b\\n  c')))", ["'a\\n  b\\nc'"]],
  ["import inspect\nprint(inspect.CO_GENERATOR | inspect.CO_OPTIMIZED)", ['33']],
  ["import inspect\nprint(inspect.BufferFlags.READ | inspect.BufferFlags.WRITE)", ['768']],
  ["import inspect\nprint(inspect.BufferFlags(9))", ['9']],
  ["import inspect\ndef f(a, b=2):\n    return a + b\nprint(inspect.isfunction(f), inspect.isfunction(len))", ['True False']],
  ["import inspect\nclass A:\n    pass\nprint(inspect.isclass(A), inspect.isclass(A()))", ['True False']],
  ["import inspect\ns = inspect.Signature([inspect.Parameter('a', inspect.Parameter.POSITIONAL_ONLY), inspect.Parameter('b', inspect.Parameter.POSITIONAL_OR_KEYWORD), inspect.Parameter('args', inspect.Parameter.VAR_POSITIONAL), inspect.Parameter('c', inspect.Parameter.KEYWORD_ONLY, ), inspect.Parameter('kw', inspect.Parameter.VAR_KEYWORD)])\nprint(str(s))", ['(a, /, b, *args, c, **kw)']],
  ["import inspect\ns = inspect.Signature([inspect.Parameter('a', inspect.Parameter.POSITIONAL_OR_KEYWORD), inspect.Parameter('b', inspect.Parameter.POSITIONAL_OR_KEYWORD)])\nba = s.bind(1, b=2)\nprint(ba.args, ba.kwargs)", ['(1, 2) {}']],
  ["import inspect\ns = inspect.Signature([inspect.Parameter('a', inspect.Parameter.POSITIONAL_OR_KEYWORD), inspect.Parameter('args', inspect.Parameter.VAR_POSITIONAL), inspect.Parameter('kw', inspect.Parameter.VAR_KEYWORD)])\nba = s.bind(1, 2, 3, z=9)\nprint(ba.args, ba.kwargs)", ["(1, 2, 3) {'z': 9}"]],
  // typing
  ["import typing\nprint(typing.Union[int, typing.Union[str, bytes]])", ['typing.Union[int, str, bytes]']],
  ["import typing\nprint(typing.Union[int, int, str])", ['typing.Union[int, str]']],
  ["import typing\nprint(typing.Optional[typing.Optional[int]])", ['typing.Optional[int]']],
  ["import typing\nprint(typing.get_origin(typing.Union[int, str]) == typing.Union)", ['True']],
  ["import typing\nprint(typing.get_args(typing.Annotated[int, 5])[0] == int, typing.get_args(typing.Annotated[int, 5])[1])", ['True 5']],
  ["import typing\nprint(typing.get_args(typing.Optional[int])[0] == int, typing.get_args(typing.Optional[int])[1] == type(None))", ['True True']],
  ["import typing\nprint(typing.Literal['a', 1, 'a'])", ["typing.Literal['a', 1]"]],
  ["import typing\nprint(typing.Callable[..., int])", ['typing.Callable[..., int]']],
  ["import typing\nT = typing.TypeVar('T', int, str)\nprint(T.__constraints__[0] == int, T.__constraints__[1] == str)", ['True True']],
  ["import typing\nNT = typing.NamedTuple('NT', [('x', int), ('y', str)])\nn = NT(1, 'a')\nprint(n.x, n._asdict(), n == (1, 'a'), n[1])", ["1 {'x': 1, 'y': 'a'} True a"]],
  ["import typing\nNT = typing.NamedTuple('NT', [('x', int)])\nprint(NT(1)._replace(x=2))", ['NT(x=2)']],
  ["import typing\nTD = typing.TypedDict('TD', {'x': int, 'y': str}, total=False)\nprint(TD.__total__, sorted(TD.__optional_keys__))", ["False ['x', 'y']"]],
  ["import typing\nprint(typing.is_typeddict(int), typing.cast(str, 5), typing.assert_type(3, int))", ['False 5 3']],
  ["import typing\nU = typing.NewType('U', int)\nprint(repr(U), U.__name__, U.__module__)", ['__main__.U U __main__']],
  ["import typing\nprint(typing.ForwardRef('int').__forward_arg__)", ['int']],
  // annotationlib
  ["import annotationlib\nprint(annotationlib.Format.STRING.name, annotationlib.Format.STRING.value)", ['STRING 4']],
  ["import annotationlib\nprint(annotationlib.ForwardRef('int'))", ["ForwardRef('int')"]],
  // traceback
  ["import traceback\nf = traceback.FrameSummary('f.py', 3, 'func', 'x = 1')\nprint(repr(f), len(f), f[1])", ['<FrameSummary file f.py, line 3 in func> 4 3']],
  ["import traceback\nprint(traceback.format_list([('f.py', 3, 'func', 'x = 1')]))", ["['  File \"f.py\", line 3, in func\\n    x = 1\\n']"]],
  // tokenize
  ["import tokenize\nt = tokenize.TokenInfo(55, '=', (1, 2), (1, 3), 'x = 1')\nprint(t.exact_type, t == (55, '=', (1, 2), (1, 3), 'x = 1'))", ['22 True']],
  ["import tokenize\nprint(repr(tokenize.untokenize([(1, 'x'), (55, '='), (2, '1')])))", ["'x =1 '"]],
  ["import tokenize\nprint(repr(tokenize.untokenize([(3, \"'a'\"), (3, \"'b'\")])))", ['"\'a\'  \'b\'"']],
  // pyclbr
  ["import pyclbr\nc = pyclbr.Class('m', 'C', None, 'f.py', 3)\nprint(c.super, c.methods, c.children)", ['[] {} {}']],
  // tabnanny（正常系）
  ["import tabnanny\nprint(tabnanny.process_tokens([(1, 'if', (1, 0), (1, 2), 'if x:\\n'), (4, '\\n', (1, 5), (1, 6), 'if x:\\n'), (5, '    ', (2, 0), (2, 4), '    pass\\n'), (1, 'pass', (2, 4), (2, 8), '    pass\\n'), (4, '\\n', (2, 8), (2, 9), '    pass\\n'), (6, '', (3, 0), (3, 0), ''), (0, '', (3, 0), (3, 0), '')]))", ['None']],
];
for (const [code, expected] of CASES) {
  test('B7 G8 case: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.deepEqual(outs(r), expected, code);
  });
}

const ERROR_CASES = [
  ["import ast\nprint(ast.literal_eval('1 + 2'))", /ValueError/],
  ["import ast\nprint(ast.literal_eval('{[1]}'))", /TypeError/],
  ["import ast\nprint(ast.literal_eval('foo'))", /ValueError/],
  ["import ast\nc = ast.Constant(1)\nprint(c.nonexistent)", /AttributeError/],
  ["import ast\nprint(ast.BinOp(ast.Constant(1)).op)", /AttributeError/],
  ["import ast\nprint(ast.Constant(1, None, 3))", /TypeError/],
  ["import inspect\nprint(inspect.Parameter('1x', inspect.Parameter.POSITIONAL_OR_KEYWORD))", /ValueError/],
  ["import inspect\nprint(inspect.Parameter('x', inspect.Parameter.VAR_POSITIONAL, default=1))", /ValueError/],
  ["import inspect\ns = inspect.Signature([inspect.Parameter('a', inspect.Parameter.POSITIONAL_OR_KEYWORD)])\nprint(s.bind(1, 2))", /TypeError/],
  ["import inspect\ns = inspect.Signature([inspect.Parameter('a', inspect.Parameter.POSITIONAL_OR_KEYWORD)])\nprint(s.bind())", /TypeError/],
  ["import inspect\ns = inspect.Signature([inspect.Parameter('a', inspect.Parameter.POSITIONAL_OR_KEYWORD)])\nprint(s.bind(a=1, b=2))", /TypeError/],
  ["import inspect\ns = inspect.Signature([inspect.Parameter('a', inspect.Parameter.POSITIONAL_OR_KEYWORD)])\nprint(s.bind(1, a=2))", /TypeError/],
  ["import typing\nprint(typing.Hashable[int])", /TypeError/],
  ["import typing\nprint(typing.assert_never(5))", /AssertionError/],
  ["import typing\nprint(typing.ForwardRef(5))", /TypeError/],
  ["import annotationlib\nprint(annotationlib.ForwardRef(5))", /TypeError/],
  ["import tabnanny\ntabnanny.process_tokens([(4, '\\n', (1, 0), (1, 1), '\\n'), (1, 'x', (2, 1), (2, 2), ' x = 1')])", /NannyNag/],
  ["import dis\nprint(dis.dis())", /未対応/],
  ["import symtable\nprint(symtable.symtable('x = 1', 'f.py', 'exec'))", /未対応/],
  ["import linecache\nprint(linecache.getline('f.py', 1))", /未対応/],
  ["import tokenize\nprint(tokenize.open('f.py'))", /未対応/],
  ["import inspect\nprint(inspect.getsource(len))", /未対応/],
  ["import modulefinder\nprint(modulefinder.ModuleFinder())", /未対応/],
  ["import pyclbr\nprint(pyclbr.readmodule('os'))", /未対応/],
];
for (const [code, pattern] of ERROR_CASES) {
  test('B7 G8 error: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.ok(errs(r).length > 0, 'エラーで停止すること: ' + code);
    assert.match(errs(r)[0], pattern, code);
  });
}

/* 未検証はハードエラーにせず、診断つき UNK として返ること */
const UNVERIFIED_CASES = [
  "import ast\nprint(ast.parse('x = 1'))",
  "import inspect\nprint(inspect.signature(len))",
  "import typing\nprint(typing.get_type_hints(len))",
  "import traceback\nprint(traceback.print_exc())",
  "import codeop\nprint(codeop.compile_command('1 +'))",
  "import dis\nprint(dis.opmap)",
  "import tokenize\nprint(tokenize.generate_tokens)",
];
for (const code of UNVERIFIED_CASES) {
  test('B7 G8 unverified: ' + code.split('\n').pop().slice(0, 60), async () => {
    const r = await run(code);
    assert.deepEqual(errs(r), [], code);
    assert.ok(outs(r).join(' ').includes('実行時に決まる') || outs(r).join(' ').includes('組み込みメソッド'), code + ' => ' + JSON.stringify(outs(r)));
  });
}

/* 例外対応付け：送出と捕捉ができること */
test('B7 G8: 例外対応付け（TokenError／NannyNag）', async () => {
  const r1 = await run("import tokenize\nE = tokenize.TokenError\ntry:\n    raise E('bad token')\nexcept Exception as e:\n    print('caught', e)");
  assert.deepEqual(errs(r1), []);
  assert.deepEqual(outs(r1), ['caught bad token']);
  const r2 = await run("import tabnanny\ntry:\n    tabnanny.process_tokens([(5, '', (1, 0), (1, 0), 'x')])\nexcept tabnanny.NannyNag as e:\n    print('nag', e)");
  assert.deepEqual(errs(r2), []);
  assert.deepEqual(outs(r2), ['nag indent not greater e.g. at tab size 1']);
});
