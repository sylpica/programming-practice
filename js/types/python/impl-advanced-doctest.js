/* 高度モード B7 G12：doctest（71件）。
 * 裁定：DocTestParser（parse/get_examples）と Example/DocTest のデータ形は
 * 文字列解析として実装する。DocTestRunner/testmod/testfile は対象コードの
 * 実行を伴い、エンジンの simulate へ委ねられないため未対応／未検証に倒す
 * （実行系は unverified、ファイル読み込み前提の testfile は unsupported）。
 * OutputChecker.check_output は <BLANKLINE> と ELLIPSIS の基本形のみ実装。
 * 一次情報：公式ドキュメント 3.15 library/doctest、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, LIST, DICT, TUPLE } = PyAPI;

// オプションフラグ定数（CPython の値）
export const FLAGS = {
  DONT_ACCEPT_TRUE_FOR_1: 1 << 1, DONT_ACCEPT_BLANKLINE: 1 << 2, NORMALIZE_WHITESPACE: 1 << 3,
  ELLIPSIS: 1 << 4, SKIP: 1 << 5, IGNORE_EXCEPTION_DETAIL: 1 << 6,
  REPORT_UDIFF: 1 << 7, REPORT_CDIFF: 1 << 8, REPORT_NDIFF: 1 << 9,
  REPORT_ONLY_FIRST_FAILURE: 1 << 10, FAIL_FAST: 1 << 11,
};
const PS1 = '>>> ';
const PS2 = '... ';
function parseExamples(text) {
  const lines = String(text).split('\n');
  const examples = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith(PS1) && !(line.startsWith(' ') || line.startsWith('\t')) && !line.includes(PS1)) { i++; continue; }
    // 行頭（インデント許容）の >>> を探す
    const m = /^(\s*)>>> ?/.exec(line);
    if (!m) { i++; continue; }
    const indent = m[1].length;
    const startLine = i;
    const srcLines = [line.slice(m[0].length)];
    i++;
    while (i < lines.length) {
      const l2 = lines[i];
      const stripped = l2.slice(indent);
      if (stripped.startsWith(PS2)) { srcLines.push(stripped.slice(PS2.length)); i++; }
      else break;
    }
    const wantLines = [];
    while (i < lines.length) {
      const l2 = lines[i];
      if (/^\s*>>> /.test(l2) || l2.startsWith(PS1)) break;
      if (l2.trim() === '') break;
      wantLines.push(l2.slice(indent));
      i++;
    }
    // 例外形式の want は exc_msg として分離する
    let excMsg = null; let want = wantLines.join('\n');
    if (wantLines.length && wantLines[0].startsWith('Traceback (most recent call last):')) {
      excMsg = wantLines[wantLines.length - 1];
      want = '';
    }
    if (want) want += '\n';
    examples.push({
      source: srcLines.join('\n') + '\n', want, exc_msg: excMsg, lineno: startLine, indent, options: {},
    });
  }
  return examples;
}
const ExampleDef = {
  typeName: 'Example',
  construct(ctx, args, kwargs) {
    return ctx.native('doctest.Example', {
      source: args[0], want: args.length > 1 ? args[1] : '', exc_msg: args.length > 2 ? args[2] : NONE,
      lineno: args.length > 3 ? ctx.int(args[3]) ?? 0 : 0, indent: args.length > 4 ? ctx.int(args[4]) ?? 0 : 0,
      options: args.length > 5 ? args[5] : DICT(),
    });
  },
  attrs: {
    source: (ctx, self) => self.data.source, want: (ctx, self) => self.data.want,
    exc_msg: (ctx, self) => self.data.exc_msg, lineno: (ctx, self) => NUM(self.data.lineno, false),
    indent: (ctx, self) => NUM(self.data.indent, false), options: (ctx, self) => self.data.options,
  },
  repr(ctx, self) { return 'Example(source=' + ctx.repr(self.data.source) + ', want=' + ctx.repr(self.data.want) + ', exc_msg=' + ctx.repr(self.data.exc_msg) + ', lineno=' + self.data.lineno + ', indent=' + self.data.indent + ', options=' + ctx.repr(self.data.options) + ')'; },
  eq(ctx, self, other) {
    if (!other || other.__native !== 'doctest.Example') return false;
    return self.data.source === other.data.source && self.data.want === other.data.want;
  },
  hash: () => null,
};
const DocTestDef = {
  typeName: 'DocTest',
  construct(ctx, args) {
    return ctx.native('doctest.DocTest', { examples: args[0], globs: args[1], name: args.length > 2 ? args[2] : '', filename: NONE, lineno: 0, docstring: NONE });
  },
  attrs: {
    examples: (ctx, self) => self.data.examples, globs: (ctx, self) => self.data.globs,
    name: (ctx, self) => self.data.name, filename: (ctx, self) => self.data.filename,
    lineno: (ctx, self) => NUM(self.data.lineno, false), docstring: (ctx, self) => self.data.docstring,
  },
};
const ParserDef = {
  typeName: 'DocTestParser',
  construct(ctx) { return ctx.native('doctest.DocTestParser', {}); },
  methods: {
    get_examples(ctx, self, args, kwargs) {
      const text = typeof args[0] === 'string' ? args[0] : ctx.strOf(args[0]);
      return LIST(parseExamples(text).map((e) => ctx.native('doctest.Example', e)));
    },
    parse(ctx, self, args) {
      const text = typeof args[0] === 'string' ? args[0] : ctx.strOf(args[0]);
      // parse は文字列と Example の交互リストを返す（簡略：例の前後の文字列を保持する）
      const exs = parseExamples(text);
      const out = [];
      let cursor = 0;
      // 元テキストを例の開始位置で分割する簡易再構成
      const lines = text.split('\n');
      let li = 0; let buf = [];
      const flush = () => { if (buf.length) { out.push(buf.join('\n') + (buf.length ? '\n' : '')); buf = []; } };
      const exByLine = new Map(exs.map((e) => [e.lineno, e]));
      while (li < lines.length) {
        if (exByLine.has(li)) {
          flush();
          const e = exByLine.get(li);
          out.push(ctx.native('doctest.Example', e));
          // source+want の行数を進める
          const srcLines = e.source.split('\n').length - 1;
          const wantLines = e.want ? e.want.split('\n').length - 1 : 0;
          li += srcLines + wantLines;
          continue;
        }
        buf.push(lines[li]); li++;
      }
      flush();
      return LIST(out);
    },
    get_doctest(ctx, self, args) {
      const text = typeof args[0] === 'string' ? args[0] : ctx.strOf(args[0]);
      const exs = LIST(parseExamples(text).map((e) => ctx.native('doctest.Example', e)));
      return ctx.native('doctest.DocTest', { examples: exs, globs: args.length > 2 ? args[2] : DICT(), name: args.length > 1 ? args[1] : '', filename: NONE, lineno: 0, docstring: args[0] });
    },
  },
};
const CheckerDef = {
  typeName: 'OutputChecker',
  construct(ctx) { return ctx.native('doctest.OutputChecker', {}); },
  methods: {
    check_output(ctx, self, args) {
      let want = ctx.strOf(args[0]); let got = ctx.strOf(args[1]);
      const flags = args.length > 2 ? ctx.int(args[2]) ?? 0 : 0;
      const w = want.replace(/<BLANKLINE>/g, '');
      if (flags & FLAGS.NORMALIZE_WHITESPACE) {
        return BOOL(w.split(/\s+/).join(' ') === got.split(/\s+/).join(' '));
      }
      if (flags & FLAGS.ELLIPSIS) {
        const parts = w.split('...');
        let idx = 0; let ok = true;
        for (let pi = 0; pi < parts.length; pi++) {
          const part = parts[pi];
          if (part === '') continue;
          const found = got.indexOf(part, idx);
          if (found < 0) { ok = false; break; }
          if (pi === 0 && found !== 0) { ok = false; break; }
          idx = found + part.length;
        }
        if (ok && parts.length && parts[parts.length - 1] !== '' && !got.endsWith(parts[parts.length - 1])) ok = false;
        return BOOL(ok);
      }
      return BOOL(w === got);
    },
    output_difference(ctx, self, args) {
      return 'Expected:\n' + ctx.strOf(args[0]) + 'Got:\n' + ctx.strOf(args[1]);
    },
  },
};
function unverifiedFn(name) {
  return (ctx) => { ctx.diag('doctest.' + name + ' は対象コードの実行を伴うため、エンジンでは意味論を確定できません（未検証）'); return ctx.unk('doctest.' + name + ' の結果'); };
}
registerStdlibModule('doctest', {
  constants: {
    ...Object.fromEntries(Object.entries(FLAGS).map(([k, v]) => [k, NUM(v, false)])),
    COMPARISON_FLAGS: NUM(FLAGS.DONT_ACCEPT_TRUE_FOR_1 | FLAGS.DONT_ACCEPT_BLANKLINE | FLAGS.NORMALIZE_WHITESPACE | FLAGS.ELLIPSIS | FLAGS.IGNORE_EXCEPTION_DETAIL, false),
    REPORTING_FLAGS: NUM(FLAGS.REPORT_UDIFF | FLAGS.REPORT_CDIFF | FLAGS.REPORT_NDIFF | FLAGS.REPORT_ONLY_FIRST_FAILURE | FLAGS.FAIL_FAST, false),
  },
  functions: {
    testmod: unverifiedFn('testmod'), testfile: (ctx) => ctx.err('未対応', 'doctest.testfile はファイル読み込み前提のため本アプリの高度モードでは未対応です', ''),
    run_docstring_examples: unverifiedFn('run_docstring_examples'),
    script_from_examples: (ctx, args) => {
      const text = typeof args[0] === 'string' ? args[0] : ctx.strOf(args[0]);
      const exs = parseExamples(text);
      return exs.map((e) => '# line ' + (e.lineno + 1) + '\n' + e.source).join('');
    },
    debug_src: unverifiedFn('debug_src'), debug: unverifiedFn('debug'),
    DocTestSuite: unverifiedFn('DocTestSuite'), DocFileSuite: unverifiedFn('DocFileSuite'),
    set_unittest_reportflags: (ctx, args) => NUM(0, false),
    register_optionflag: (ctx, args) => { ctx.diag('doctest.register_optionflag は新規フラグの登録で、エンジンでは未検証です'); return NUM(1 << 12, false); },
    testsource: unverifiedFn('testsource'),
  },
  classes: {
    DocTestParser: ParserDef, Example: ExampleDef, DocTest: DocTestDef, OutputChecker: CheckerDef,
    DocTestFinder: { typeName: 'DocTestFinder', construct(ctx) { return ctx.native('doctest.DocTestFinder', {}); }, methods: { find: unverifiedFn('DocTestFinder.find') } },
    DocTestRunner: { typeName: 'DocTestRunner', construct(ctx) { return ctx.native('doctest.DocTestRunner', {}); }, methods: { run: unverifiedFn('DocTestRunner.run'), summarize: unverifiedFn('DocTestRunner.summarize'), report_start: unverifiedFn('x'), report_success: unverifiedFn('x'), report_failure: unverifiedFn('x'), report_unexpected_exception: unverifiedFn('x') } },
    DocTestCase: { typeName: 'DocTestCase' }, DocFileCase: { typeName: 'DocFileCase' },
    DocTestFailure: { typeName: 'DocTestFailure', exc: 'doctest.DocTestFailure', excParents: ['AssertionError'] },
    UnexpectedException: { typeName: 'UnexpectedException', exc: 'doctest.UnexpectedException', excParents: ['Exception'] },
    DebugRunner: { typeName: 'DebugRunner' },
    TestResults: {
      typeName: 'TestResults',
      construct(ctx, args, kwargs) {
        const failed = kwargs.failed !== undefined ? ctx.int(kwargs.failed) : (args.length ? ctx.int(args[0]) ?? 0 : 0);
        const attempted = kwargs.attempted !== undefined ? ctx.int(kwargs.attempted) : (args.length > 1 ? ctx.int(args[1]) ?? 0 : 0);
        const skipped = kwargs.skipped !== undefined ? ctx.int(kwargs.skipped) : (args.length > 2 ? ctx.int(args[2]) ?? 0 : 0);
        return ctx.native('doctest.TestResults', { failed, attempted, skipped });
      },
      attrs: {
        failed: (ctx, self) => NUM(self.data.failed, false), attempted: (ctx, self) => NUM(self.data.attempted, false), skipped: (ctx, self) => NUM(self.data.skipped, false),
      },
      repr(ctx, self) { return 'TestResults(failed=' + self.data.failed + ', attempted=' + self.data.attempted + ', skipped=' + self.data.skipped + ')'; },
      eq(ctx, self, other) { return !!(other && other.__native === 'doctest.TestResults' && other.data.failed === self.data.failed && other.data.attempted === self.data.attempted && other.data.skipped === self.data.skipped); },
      hash(ctx, self) { return 'testresults:' + self.data.failed + ',' + self.data.attempted + ',' + self.data.skipped; },
    },
  },
});
