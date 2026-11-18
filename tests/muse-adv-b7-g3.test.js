/* 高度モード B7 G3（テキスト処理系）：全207件のテスト。
 * F-04：リファレンス例題（status=supported の189件）を実行し、
 * tests/muse-adv-b7-g3-expected.js の期待値（CPython 3.12.3 実走、
 * 3.13 以降の項目は公式ドキュメント 3.15 と個別検証）と照合する。
 * F-01：典型・境界・異常ケース91件（バッテリーから抽出、期待値は
 * CPython 3.12.3 実走）。
 * 未対応14件は「未対応」エラーで停止すること、未検証4件は収載のみ確認。
 * （B7 R2：re.PatternError の属性5件を unverified から supported へ変更。） */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';
import { REF_G3 } from '../js/types/python/group-advanced-g3.js';
import { G3_EXPECTED } from './muse-adv-b7-g3-expected.js';

const py = getDefinition('python');
const run = async (code) => py.simulate(code, structuredClone(py.model.defaults));
const outs = (r) => (r.paths[0]?.outputs || []).map((o) => o.text);
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean).map((e) => e.message);

test('B7 G3: リファレンス収載は全207件・正規形・区分件数が一致', () => {
  assert.equal(REF_G3.length, 207);
  const names = new Set(REF_G3.map((i) => i.name));
  assert.equal(names.size, 207);
  const counts = { supported: 0, unsupported: 0, unverified: 0 };
  for (const item of REF_G3) {
    for (const k of ['name', 'category', 'syntax', 'description', 'example', 'status', 'source']) {
      assert.ok(item[k], item.name + ' に ' + k + ' が無い');
    }
    assert.ok('caution' in item, item.name + ' に caution キーが無い');
    counts[item.status] += 1;
  }
  assert.deepEqual(counts, { supported: 189, unsupported: 14, unverified: 4 });
});

for (const item of REF_G3) {
  if (item.status === 'supported') {
    test('B7 G3 F-04: ' + item.name, async () => {
      const r = await run(item.example);
      assert.deepEqual(errs(r), [], item.name + ' の例題でエラー');
      assert.equal(outs(r).join('\n'), G3_EXPECTED[item.name], item.name + ' の例題出力が期待値と不一致');
    });
  } else if (item.status === 'unsupported') {
    test('B7 G3 未対応: ' + item.name, async () => {
      const r = await run(item.example);
      assert.ok(errs(r).some((e) => e.includes('未対応')), item.name + ' は未対応エラーで停止すべき: ' + errs(r).join(' | '));
    });
  }
}

const CASES = {
 "re.span-basic": {
  "code": "import re\nprint(re.search(r'\\d+', 'ab123cd').span())",
  "expected": "(2, 5)"
 },
 "re.groups-multi": {
  "code": "import re\nm = re.match(r'(\\d+)-(\\d+)?', '12-')\nprint(m.groups(), m.group(1, 2), m.span(2))",
  "expected": "('12', None) ('12', None) (-1, -1)"
 },
 "re.named": {
  "code": "import re\nm = re.search(r'(?P<word>\\w+)@(?P<host>\\w+)', 'x user@host y')\nprint(m.groupdict(), m.group('host'), m.lastgroup, m.lastindex)",
  "expected": "{'word': 'user', 'host': 'host'} host host 2"
 },
 "re.backref": {
  "code": "import re\nprint(re.search(r'(\\w+) \\1', 'hello hello world').group())",
  "expected": "hello hello"
 },
 "re.findall-groups": {
  "code": "import re\nprint(re.findall(r'(\\d+)([a-z])', '1a22b'))",
  "expected": "[('1', 'a'), ('22', 'b')]"
 },
 "re.split-cap": {
  "code": "import re\nprint(re.split(r'(\\W+)', 'Words, words, words.'))",
  "expected": "['Words', ', ', 'words', ', ', 'words', '.', '']"
 },
 "re.sub-count": {
  "code": "import re\nprint(re.sub(r'\\d', '#', 'a1b2c3', count=2))",
  "expected": "a#b#c3"
 },
 "re.subn-basic": {
  "code": "import re\nprint(re.subn(r'\\d+', '#', 'a1b22'))",
  "expected": "('a#b#', 2)"
 },
 "re.sub-empty": {
  "code": "import re\nprint(re.sub('x*', '-', 'abxd'))",
  "expected": "-a-b--d-"
 },
 "re.finditer-empty": {
  "code": "import re\nprint([m.span() for m in re.finditer('a*', 'aab')])",
  "expected": "[(0, 2), (2, 2), (3, 3)]"
 },
 "re.icase": {
  "code": "import re\nprint(re.search(r'abc', 'xAbCy', re.I).group())",
  "expected": "AbC"
 },
 "re.multiline": {
  "code": "import re\nprint(re.findall(r'^\\w+', 'ab\\ncd', re.M))",
  "expected": "['ab', 'cd']"
 },
 "re.dotall": {
  "code": "import re\nprint(re.search(r'a.b', 'a\\nb', re.S) is not None, re.search(r'a.b', 'a\\nb') is not None)",
  "expected": "True False"
 },
 "re.verbose": {
  "code": "import re\nprint(re.search(r'a b  # comment\\n c', 'abc', re.X))",
  "expected": "<re.Match object; span=(0, 2), match='ab'>"
 },
 "re.dollar-end": {
  "code": "import re\nprint([m.span() for m in re.finditer('foo$', 'foo\\nfoo\\n')])",
  "expected": "[(4, 7)]"
 },
 "re.word-boundary": {
  "code": "import re\nprint([m.span() for m in re.finditer(r'\\bfoo\\b', 'a foo bar foo.')])",
  "expected": "[(2, 5), (10, 13)]"
 },
 "re.greedy-lazy": {
  "code": "import re\nprint(re.search(r'<.+>', '<a><b>').group(), re.search(r'<.+?>', '<a><b>').group())",
  "expected": "<a><b> <a>"
 },
 "re.quant-brace": {
  "code": "import re\nprint(re.search(r'a{2,3}', 'aaaa').group(), re.search(r'a{2,}', 'aaaa').group())",
  "expected": "aaa aaaa"
 },
 "re.fullmatch-alt": {
  "code": "import re\nprint(re.fullmatch(r'a|ab', 'ab').group())",
  "expected": "ab"
 },
 "re.escape": {
  "code": "import re\nprint(re.escape('a.b*c (x)'))",
  "expected": "a\\.b\\*c\\ \\(x\\)"
 },
 "re.flags-attr": {
  "code": "import re\nprint(re.compile(r'a', re.I | re.M).flags)",
  "expected": "42"
 },
 "re.pattern-attrs": {
  "code": "import re\np = re.compile(r'(?P<x>a)(b)')\nprint(p.groups, p.groupindex, p.pattern)",
  "expected": "2 {'x': 1} (?P<x>a)(b)"
 },
 "re.ascii-flag": {
  "code": "import re\nprint(re.findall(r'\\w+', 'héllo world', re.A))",
  "expected": "['h', 'llo', 'world']"
 },
 "re.unicode-digit": {
  "code": "import re\nprint(re.findall(r'\\d+', 'a١٢٣b'))",
  "expected": "['١٢٣']"
 },
 "re.expand-full": {
  "code": "import re\nm = re.match(r'(?P<x>\\d+)-(\\d+)?', '12-')\nprint(repr(m.expand(r'\\2/\\g<x>/\\g<0>')))",
  "expected": "'/12/12-'"
 },
 "re.lastindex-none": {
  "code": "import re\nprint(re.match(r'(a)?', '').lastindex, re.match(r'(a)?', '').lastgroup)",
  "expected": "None None"
 },
 "re.inline-flag-scoped": {
  "code": "import re\nprint(re.search(r'(?i:abc)d', 'ABCd').group())",
  "expected": "ABCd"
 },
 "re.lookahead": {
  "code": "import re\nprint(re.search(r'\\d+(?= yen)', '100 yen').group())",
  "expected": "100"
 },
 "re.lookbehind": {
  "code": "import re\nprint(re.search(r'(?<=\\$)\\d+', 'a $42').group())",
  "expected": "42"
 },
 "re.octal-esc": {
  "code": "import re\nprint(re.search(r'\\101', 'xAy').group())",
  "expected": "A"
 },
 "difflib.ratio-str": {
  "code": "import difflib\nprint(difflib.SequenceMatcher(None, 'abcd', 'abce').ratio())",
  "expected": "0.75"
 },
 "difflib.opcodes": {
  "code": "import difflib\nprint(difflib.SequenceMatcher(None, 'qabxcd', 'abycdf').get_opcodes())",
  "expected": "[('delete', 0, 1, 0, 0), ('equal', 1, 3, 0, 2), ('replace', 3, 4, 2, 3), ('equal', 4, 6, 3, 5), ('insert', 6, 6, 5, 6)]"
 },
 "difflib.grouped": {
  "code": "import difflib\na = ['a','b','c','d','e','f','g','h']\nb = ['a','b','X','d','e','f','Y','h']\nprint(list(difflib.SequenceMatcher(None, a, b).get_grouped_opcodes(1)))",
  "expected": "[[('equal', 1, 2, 1, 2), ('replace', 2, 3, 2, 3), ('equal', 3, 4, 3, 4)], [('equal', 5, 6, 5, 6), ('replace', 6, 7, 6, 7), ('equal', 7, 8, 7, 8)]]"
 },
 "difflib.close-matches": {
  "code": "import difflib\nprint(difflib.get_close_matches('appel', ['ape', 'apple', 'peach', 'puppy']))",
  "expected": "['apple', 'ape']"
 },
 "difflib.unified": {
  "code": "import difflib\nprint(''.join(difflib.unified_diff(['a\\n','b\\n','c\\n'], ['a\\n','x\\n','c\\n'], fromfile='f1', tofile='f2')))",
  "expected": "--- f1\n+++ f2\n@@ -1,3 +1,3 @@\n a\n-b\n+x\n c\n"
 },
 "difflib.context": {
  "code": "import difflib\nprint(''.join(difflib.context_diff(['a\\n','b\\n'], ['a\\n','c\\n'], fromfile='f1', tofile='f2')))",
  "expected": "*** f1\n--- f2\n***************\n*** 1,2 ****\n  a\n! b\n--- 1,2 ----\n  a\n! c\n"
 },
 "difflib.ndiff-basic": {
  "code": "import difflib\nprint(list(difflib.ndiff(['one', 'two', 'three'], ['one', 'too', 'three'])))",
  "expected": "['  one', '- two', '+ too', '  three']"
 },
 "difflib.restore1": {
  "code": "import difflib\nd = list(difflib.ndiff(['a', 'b'], ['a', 'c']))\nprint(list(difflib.restore(d, 1)), list(difflib.restore(d, 2)))",
  "expected": "['a', 'b'] ['a', 'c']"
 },
 "difflib.quick-ratios": {
  "code": "import difflib\nm = difflib.SequenceMatcher(None, 'abcd', 'abce')\nprint(m.quick_ratio(), m.real_quick_ratio())",
  "expected": "0.75 1.0"
 },
 "difflib.autojunk": {
  "code": "import difflib\na = 'x' * 250 + 'abc'\nb = 'x' * 250 + 'abd'\nprint(difflib.SequenceMatcher(None, a, b).ratio(), difflib.SequenceMatcher(None, a, b, autojunk=False).ratio())",
  "expected": "0.9960474308300395 0.9960474308300395"
 },
 "difflib.empty-ratio": {
  "code": "import difflib\nprint(difflib.SequenceMatcher(None, '', '').ratio(), difflib.SequenceMatcher(None, '', 'a').ratio())",
  "expected": "1.0 0.0"
 },
 "difflib.set-seqs-flow": {
  "code": "import difflib\nm = difflib.SequenceMatcher()\nm.set_seqs('abcd', 'abce')\nprint(m.ratio())\nm.set_seq1('abxd')\nprint(m.ratio())\nm.set_seq2('abyd')\nprint(m.ratio())",
  "expected": "0.75\n0.5\n0.75"
 },
 "difflib.html-table": {
  "code": "import difflib\nprint(difflib.HtmlDiff().make_table(['a\\n', 'b\\n'], ['a\\n', 'c\\n']))",
  "expected": "\n    <table class=\"diff\" id=\"difflib_chg_to0__top\"\n           cellspacing=\"0\" cellpadding=\"0\" rules=\"groups\" >\n        <colgroup></colgroup> <colgroup></colgroup> <colgroup></colgroup>\n        <colgroup></colgroup> <colgroup></colgroup> <colgroup></colgroup>\n        \n        <tbody>\n            <tr><td class=\"diff_next\" id=\"difflib_chg_to0__0\"><a href=\"#difflib_chg_to0__0\">f</a></td><td class=\"diff_header\" id=\"from0_1\">1</td><td nowrap=\"nowrap\">a</td><td class=\"diff_next\"><a href=\"#difflib_chg_to0__0\">f</a></td><td class=\"diff_header\" id=\"to0_1\">1</td><td nowrap=\"nowrap\">a</td></tr>\n            <tr><td class=\"diff_next\"><a href=\"#difflib_chg_to0__top\">t</a></td><td class=\"diff_header\" id=\"from0_2\">2</td><td nowrap=\"nowrap\"><span class=\"diff_sub\">b</span></td><td class=\"diff_next\"><a href=\"#difflib_chg_to0__top\">t</a></td><td class=\"diff_header\" id=\"to0_2\">2</td><td nowrap=\"nowrap\"><span class=\"diff_add\">c</span></td></tr>\n        </tbody>\n    </table>"
 },
 "textwrap.wrap-basic": {
  "code": "import textwrap\nprint(textwrap.wrap('The quick brown fox jumps over the lazy dog', width=15))",
  "expected": "['The quick brown', 'fox jumps over', 'the lazy dog']"
 },
 "textwrap.wrap-long": {
  "code": "import textwrap\nprint(textwrap.wrap('a supercalifragilistic word', width=8))",
  "expected": "['a superc', 'alifragi', 'listic', 'word']"
 },
 "textwrap.wrap-maxlines": {
  "code": "import textwrap\nprint(textwrap.wrap('one two three four five', width=8, max_lines=2))",
  "expected": "['one two', '[...]']"
 },
 "textwrap.shorten-basic": {
  "code": "import textwrap\nprint(textwrap.shorten('Hello world, how are you today?', width=15))",
  "expected": "Hello [...]"
 },
 "textwrap.dedent-basic": {
  "code": "import textwrap\nprint(repr(textwrap.dedent('  a\\n    b\\n  c')))",
  "expected": "'a\\n  b\\nc'"
 },
 "textwrap.indent-basic": {
  "code": "import textwrap\nprint(repr(textwrap.indent('a\\n\\nb\\n', '> ')))",
  "expected": "'> a\\n\\n> b\\n'"
 },
 "textwrap.fill-basic": {
  "code": "import textwrap\nprint(repr(textwrap.fill('hello world foo', width=10)))",
  "expected": "'hello\\nworld foo'"
 },
 "textwrap.sentence-endings": {
  "code": "import textwrap\nprint(textwrap.wrap('Hello world. This is it.', width=12, fix_sentence_endings=True))",
  "expected": "['Hello world.', 'This is it.']"
 },
 "shlex.split-basic": {
  "code": "import shlex\nprint(shlex.split('a b c'))",
  "expected": "['a', 'b', 'c']"
 },
 "shlex.split-quotes": {
  "code": "import shlex\nprint(shlex.split('a \"b c\" \\'d e\\''))",
  "expected": "['a', 'b c', 'd e']"
 },
 "shlex.split-comment": {
  "code": "import shlex\nprint(shlex.split('a b # comment', comments=True))",
  "expected": "['a', 'b']"
 },
 "shlex.split-nonposix": {
  "code": "import shlex\nprint(shlex.split('a \"b c\"', posix=False))",
  "expected": "['a', '\"b c\"']"
 },
 "shlex.quote-cases": {
  "code": "import shlex\nprint(shlex.quote(''), shlex.quote('a b'), shlex.quote(\"a'b\"), shlex.quote('abc'))",
  "expected": "'' 'a b' 'a'\"'\"'b' abc"
 },
 "shlex.join-cases": {
  "code": "import shlex\nprint(shlex.join(['a', 'b c', \"d'e\", '']))",
  "expected": "a 'b c' 'd'\"'\"'e' ''"
 },
 "shlex.lexer-flow": {
  "code": "import shlex\nlx = shlex.shlex('one two three', posix=True)\nprint(lx.get_token(), lx.get_token(), lx.get_token(), repr(lx.get_token()))",
  "expected": "one two three None"
 },
 "shlex.lexer-punct": {
  "code": "import shlex\nlx = shlex.shlex('a;b|c', posix=True, punctuation_chars=True)\nprint(list(lx))",
  "expected": "['a', ';', 'b', '|', 'c']"
 },
 "shlex.lexer-lineno": {
  "code": "import shlex\nlx = shlex.shlex('a\\nb\\nc', posix=True)\nprint(list(lx), lx.lineno)",
  "expected": "['a', 'b', 'c'] 3"
 },
 "shlex.error-leader": {
  "code": "import shlex\nlx = shlex.shlex('a', infile='x.py', posix=True)\nprint(repr(lx.error_leader()))",
  "expected": "'\"x.py\", line 1: '"
 },
 "fnmatch.translate-star": {
  "code": "import fnmatch\nprint(fnmatch.translate('*.py'))",
  "expected": "(?s:.*\\.py)\\Z"
 },
 "fnmatch.translate-class": {
  "code": "import fnmatch\nprint(fnmatch.translate('[a-c]x'))",
  "expected": "(?s:[a-c]x)\\Z"
 },
 "fnmatch.translate-mixed": {
  "code": "import fnmatch\nprint(fnmatch.translate('foo.*'))",
  "expected": "(?s:foo\\..*)\\Z"
 },
 "fnmatch.match-cases": {
  "code": "import fnmatch\nprint(fnmatch.fnmatch('Foo.PY', '*.py'), fnmatch.fnmatchcase('Foo.PY', '*.py'), fnmatch.fnmatchcase('foo.py', '*.py'))",
  "expected": "False False True"
 },
 "fnmatch.filter-mix": {
  "code": "import fnmatch\nprint(fnmatch.filter(['a.py', 'B.TXT', 'c.py', 'd.md'], '*.py'), fnmatch.filter(['a.py', 'B.TXT'], '*.txt'))",
  "expected": "['a.py', 'c.py'] []"
 },
 "fnmatch.class-close-first": {
  "code": "import fnmatch\nprint(fnmatch.fnmatchcase(']', '[]]'), fnmatch.fnmatchcase('a', '[]]'))",
  "expected": "True False"
 },
 "string.capwords-sep": {
  "code": "import string\nprint(string.capwords('a,b,c', ','))",
  "expected": "A,B,C"
 },
 "string.template-braced": {
  "code": "import string\nprint(string.Template('${x}y').substitute(x='ab'))",
  "expected": "aby"
 },
 "string.template-dollar": {
  "code": "import string\nprint(string.Template('$$x $x').substitute(x='v'))",
  "expected": "$x v"
 },
 "string.formatter-basic": {
  "code": "import string\nprint(string.Formatter().format('{:>6}', 'ab'))",
  "expected": "    ab"
 },
 "string.formatter-spec-nested": {
  "code": "import string\nprint(string.Formatter().format('{:{w}}', 'ab', w=5))",
  "expected": "ab   "
 },
 "string.formatter-attr": {
  "code": "import string\nclass P:\n    pass\np = P()\np.x = 9\nprint(string.Formatter().format('{0.x}', p))",
  "expected": "9"
 },
 "string.formatter-parse": {
  "code": "import string\nprint(list(string.Formatter().parse('x{a!r:>5}y')))",
  "expected": "[('x', 'a', '>5', 'r'), ('y', None, None, None)]"
 },
 "string.formatter-format-field": {
  "code": "import string\nprint(string.Formatter().format_field(255, '#x'))",
  "expected": "0xff"
 },
 "string.formatter-percent-f": {
  "code": "import string\nprint(string.Formatter().format('{:.2%}', 0.125))",
  "expected": "12.50%"
 },
 "string.formatter-grouping": {
  "code": "import string\nprint(string.Formatter().format('{:,}', 1234567))",
  "expected": "1,234,567"
 },
 "unicodedata.normalize-forms": {
  "code": "import unicodedata\nprint(unicodedata.normalize('NFKD', 'ﬁ'), unicodedata.normalize('NFD', 'é'))",
  "expected": "fi é"
 },
 "unicodedata.category-mix": {
  "code": "import unicodedata\nprint([unicodedata.category(c) for c in 'A5 \\n\\u0301あ\\U0001F600'])",
  "expected": "['Lu', 'Nd', 'Zs', 'Cc', 'Mn', 'Lo', 'So']"
 },
 "unicodedata.combining-mix": {
  "code": "import unicodedata\nprint([unicodedata.combining(c) for c in ['a', '\\u0301', '\\u093C', '\\u20D0']])",
  "expected": "[0, 230, 7, 230]"
 },
 "unicodedata.eaw-mix": {
  "code": "import unicodedata\nprint([unicodedata.east_asian_width(c) for c in ['a', 'あ', 'ｱ', '\\u1100', '\\u00AD']])",
  "expected": "['Na', 'W', 'H', 'W', 'A']"
 },
 "unicodedata.decimal-mix": {
  "code": "import unicodedata\nprint([unicodedata.decimal(c) for c in ['0', '٩', '๙', '０']])",
  "expected": "[0, 9, 9, 0]"
 },
 "unicodedata.digit-mix": {
  "code": "import unicodedata\nprint([unicodedata.digit(c) for c in ['²', '³', '৫']])",
  "expected": "[2, 3, 5]"
 },
 "unicodedata.numeric-mix": {
  "code": "import unicodedata\nprint([unicodedata.numeric(c) for c in ['五', 'Ⅷ', '½', '⑩']])",
  "expected": "[5.0, 8.0, 0.5, 10.0]"
 },
 "unicodedata.decimal-err": {
  "code": "import unicodedata\ntry:\n    unicodedata.decimal('a')\nexcept ValueError:\n    print('ValueError')",
  "expected": "ValueError"
 },
 "stringprep.b1-checks": {
  "code": "import stringprep\nprint([stringprep.in_table_b1(c) for c in ['\\u00ad', '\\u1806', '\\ufeff', 'a']])",
  "expected": "[True, True, True, False]"
 },
 "stringprep.b3-cases": {
  "code": "import stringprep\nprint(stringprep.map_table_b3('İ'), stringprep.map_table_b3('Σ'), stringprep.map_table_b3('ß'))",
  "expected": "i̇ σ ss"
 },
 "stringprep.b2-cases": {
  "code": "import stringprep\nprint(stringprep.map_table_b2('İ'), stringprep.map_table_b2('Ａ'), stringprep.map_table_b2('Σ'))",
  "expected": "i̇ ａ σ"
 },
 "stringprep.c-tables": {
  "code": "import stringprep\nprint(stringprep.in_table_c11(' '), stringprep.in_table_c12('\\u2000'), stringprep.in_table_c21('\\x1f'), stringprep.in_table_c22('\\x83'))",
  "expected": "True True True True"
 },
 "stringprep.c345": {
  "code": "import stringprep\nprint(stringprep.in_table_c3('\\ue001'), stringprep.in_table_c4('\\ufdd0'), stringprep.in_table_c4('\\U0001fffe'), stringprep.in_table_c5('\\ud83d'))",
  "expected": "True True True True"
 },
 "stringprep.c6789": {
  "code": "import stringprep\nprint(stringprep.in_table_c6('\\u2028'), stringprep.in_table_c7('\\u0340'), stringprep.in_table_c8('\\u0341'), stringprep.in_table_c9('\\U000e0040'))",
  "expected": "False False True True"
 }
};
for (const [name, c] of Object.entries(CASES)) {
  test('B7 G3 F-01: ' + name, async () => {
    const r = await run(c.code);
    assert.deepEqual(errs(r), [], name + ' でエラー');
    let actual = outs(r).join('\n');
    let expected = c.expected;
    if (name.startsWith('difflib.html')) {
      // HtmlDiff の id 接頭辞はプロセス-global なカウンタ（CPython でも
      // 呼び出し回数で増える）なので、番号を正規化してから比較する
      const norm = (s) => s.replace(/difflib_chg_(from|to)\d+_/g, 'difflib_chg_$1N_').replace(/ id="(from|to)\d+_/g, ' id="$1N_');
      actual = norm(actual);
      expected = norm(expected);
    }
    assert.equal(actual, expected, name + ' の出力が CPython と不一致');
  });
}

const ERROR_CASES = [
  ['re 不正パターン', "import re\ntry:\n    re.compile('(')\nexcept ValueError:\n    print('caught')", 'caught'],
  ['re PatternError を名前で捕捉', "import re\ntry:\n    re.compile('a**')\nexcept re.PatternError:\n    print('caught')", 'caught'],
  ['re 条件パターンは未対応', "import re\nre.compile(r'(a)(?(1)b|c)')", null],
  ['re possessive は未対応', "import re\nre.compile(r'a*+')", null],
  ['textwrap.shorten placeholder 過大', "import textwrap\ntextwrap.shorten('hello world', width=3)", null],
  ['shlex 引用符未閉', "import shlex\nshlex.split('a \"b')", null],
  ['unicodedata.decimal 未定義', "import unicodedata\nunicodedata.decimal('a')", null],
  ['string.Template キー無し', "import string\nstring.Template('$x').substitute({})", null],
];
for (const [name, code, expected] of ERROR_CASES) {
  test('B7 G3 異常系: ' + name, async () => {
    const r = await run(code);
    if (expected === null) {
      assert.ok(errs(r).length > 0, name + ' はエラーで停止すべき');
    } else {
      assert.deepEqual(errs(r), []);
      assert.equal(outs(r).join('\n'), expected);
    }
  });
}
