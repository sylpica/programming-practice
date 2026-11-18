/* 高度モード B7 G8：traceback モジュール（全50件）。
 * 一次情報：公式ドキュメント 3.15（library/traceback）と CPython
 * 3.12.3 実走（FrameSummary／StackSummary／TracebackException の
 * 書式を照合。exc_type_str と msg は 3.13 以降の属性で、ドキュメント
 * で裏付けた）。
 * 方針：フレーム要約と例外の書式化は文字列生成として再現できる範囲
 * を実装する。エンジンの例外値は発生位置（ファイル名・行番号）を
 * 保持しないため、位置に依存する属性は未検証に倒す。print 系は
 * 標準エラー出力への書き込みで、エンジンにその出力路が無いため
 * 未検証に倒す。 */
import { PyAPI } from './engine.js';
import { I, BOOL, NONE, LIST, DICT, unverifiedFn, unverifiedMethod } from './impl-advanced-g8-common.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';

const { dictSet } = PyAPI;
const REASON_POS = 'エンジンの例外値は発生位置を保持していない';
/* エンジンの数値（{__num, v} 形状）を表示用文字列にする */
const numStr = (v) => (v && v.__num === true ? String(v.v) : String(v));
function frameRepr(f) {
  return '<FrameSummary file ' + String(f.data.filename) + ', line ' + numStr(f.data.lineno) + ' in ' + String(f.data.name) + '>';
}

/* ---------- FrameSummary ---------- */
function makeFrameSummary(ctx, filename, lineno, name, line, colno, endLineno, endColno) {
  return ctx.native('traceback.FrameSummary', {
    filename, lineno, name, line: line === undefined ? NONE : line,
    colno: colno === undefined ? NONE : colno,
    endLineno: endLineno === undefined ? NONE : endLineno,
    endColno: endColno === undefined ? NONE : endColno,
  });
}
function frameFromValue(ctx, v) {
  if (v && v.__native === 'traceback.FrameSummary') return v;
  const items = ctx.iterable(v);
  if (items && items.length >= 3) {
    return makeFrameSummary(ctx, items[0], items[1], items[2], items.length > 3 ? items[3] : NONE);
  }
  return null;
}
const frameSummaryDef = {
  typeName: 'FrameSummary',
  construct: (ctx, args, kwargs) => {
    if (args.length < 3) ctx.err('TypeError', 'FrameSummary() の引数が不足しています', '');
    return makeFrameSummary(ctx, args[0], args[1], args[2], args.length > 3 ? args[3] : NONE,
      'colno' in kwargs ? kwargs.colno : NONE, 'end_lineno' in kwargs ? kwargs.end_lineno : NONE,
      'end_colno' in kwargs ? kwargs.end_colno : NONE);
  },
  attrs: {
    filename: (ctx, self) => self.data.filename,
    lineno: (ctx, self) => self.data.lineno,
    name: (ctx, self) => self.data.name,
    line: (ctx, self) => self.data.line,
    colno: (ctx, self) => self.data.colno,
    end_lineno: (ctx, self) => self.data.endLineno,
    end_colno: (ctx, self) => self.data.endColno,
  },
  repr: (ctx, self) => frameRepr(self),
  eq: (ctx, self, other) => {
    const o = frameFromValue(ctx, other);
    if (!o) return null;
    return ['filename', 'lineno', 'name', 'line'].every((k) => ctx.eq(self.data[k], o.data[k]) === true);
  },
  len: () => 4,
  iter: (ctx, self) => [self.data.filename, self.data.lineno, self.data.name, PyAPI.isNone(self.data.line) ? '' : self.data.line],
  getitem: (ctx, self, key) => {
    if (ctx.isNum(key)) {
      const vals = [self.data.filename, self.data.lineno, self.data.name, PyAPI.isNone(self.data.line) ? '' : self.data.line];
      let idx = ctx.int(key);
      if (idx < 0) idx += 4;
      if (idx < 0 || idx >= 4) ctx.err('IndexError', 'tuple index out of range', '');
      return vals[idx];
    }
    return ctx.NOT_HANDLED;
  },
};
registerStdlibClass('traceback.FrameSummary', frameSummaryDef);

function formatFrameLine(ctx, f) {
  let s = '  File "' + String(f.data.filename) + '", line ' + numStr(f.data.lineno) + ', in ' + String(f.data.name) + '\n';
  if (!PyAPI.isNone(f.data.line) && String(f.data.line) !== '') s += '    ' + String(f.data.line).trim() + '\n';
  return s;
}

/* ---------- StackSummary ---------- */
function makeStackSummary(ctx, frames) {
  return ctx.native('traceback.StackSummary', { frames });
}
const stackSummaryDef = {
  typeName: 'StackSummary',
  construct: (ctx, args) => makeStackSummary(ctx, []),
  classMethods: {
    from_list: (ctx, args) => {
      const items = ctx.iterable(args[0]);
      if (items === null) ctx.err('TypeError', 'from_list() にはリストを使ってください', '');
      const frames = [];
      for (const it of items) {
        const f = frameFromValue(ctx, it);
        if (!f) ctx.err('TypeError', 'from_list() の要素は FrameSummary かタプルです', '');
        frames.push(f);
      }
      return makeStackSummary(ctx, frames);
    },
    extract: unverifiedMethod('traceback.StackSummary.extract', 'フレームオブジェクトはエンジンに存在しない'),
  },
  methods: {
    format: (ctx, self) => LIST(self.data.frames.map((f) => formatFrameLine(ctx, f))),
    format_frame_summary: (ctx, self, args) => {
      const f = frameFromValue(ctx, args[0]);
      if (!f) ctx.err('TypeError', 'format_frame_summary() には FrameSummary を使ってください', '');
      return formatFrameLine(ctx, f);
    },
  },
  len: (ctx, self) => self.data.frames.length,
  iter: (ctx, self) => self.data.frames.slice(),
  /* StackSummary は list のサブクラスなので、repr はフレームのリスト形式 */
  repr: (ctx, self) => '[' + self.data.frames.map((f) => frameRepr(f)).join(', ') + ']',
  str: (ctx, self) => '[' + self.data.frames.map((f) => frameRepr(f)).join(', ') + ']',
  getitem: (ctx, self, key) => {
    if (ctx.isNum(key)) {
      let idx = ctx.int(key);
      if (idx < 0) idx += self.data.frames.length;
      if (idx < 0 || idx >= self.data.frames.length) ctx.err('IndexError', 'list index out of range', '');
      return self.data.frames[idx];
    }
    return ctx.NOT_HANDLED;
  },
};
registerStdlibClass('traceback.StackSummary', stackSummaryDef);

/* ---------- TracebackException ---------- */
function excDisplayName(v) {
  if (v && v.__exc) {
    const kind = String(v.kind || '');
    const dot = kind.lastIndexOf('.');
    return dot >= 0 ? kind.slice(dot + 1) : kind;
  }
  return null;
}
function excMessageText(ctx, v) {
  if (v && v.__exc) return v.text || '';
  return ctx.strOf(v);
}
function formatExcLines(ctx, te) {
  const lines = [];
  const stack = te.data.stack;
  if (stack && stack.data && stack.data.frames && stack.data.frames.length) {
    lines.push('Traceback (most recent call last):\n');
    for (const f of stack.data.frames) lines.push(formatFrameLine(ctx, f));
  }
  if (te.data.cause) lines.push(...formatExcLines(ctx, te.data.cause));
  if (te.data.context && !te.data.suppressContext) lines.push(...formatExcLines(ctx, te.data.context));
  const name = te.data.excTypeStr || 'Error';
  const msg = te.data.excValue ? excMessageText(ctx, te.data.excValue) : '';
  lines.push(name + (msg ? ': ' + msg : '') + '\n');
  return lines;
}
function makeTE(ctx, excVal, cause, context, suppress) {
  const name = excDisplayName(excVal);
  const stack = makeStackSummary(ctx, []);
  return ctx.native('traceback.TracebackException', {
    excValue: excVal, excTypeStr: name, stack,
    cause: cause || null, context: context || null,
    suppressContext: !!suppress, notes: [],
  });
}
const tracebackExceptionDef = {
  typeName: 'TracebackException',
  construct: (ctx, args, kwargs) => {
    const excVal = args.length > 1 ? args[1] : NONE;
    if (PyAPI.isNone(excVal)) return makeTE(ctx, null, null, null, false);
    return makeTE(ctx, excVal, null, null, false);
  },
  classMethods: {
    from_exception: (ctx, args, kwargs) => {
      const excVal = args[0];
      if (PyAPI.isNone(excVal)) return makeTE(ctx, null, null, null, false);
      return makeTE(ctx, excVal, null, null, false);
    },
  },
  attrs: {
    exc_type: (ctx, self) => self.data.excValue && self.data.excValue.__exc ? ctx.ncls(self.data.excValue.kind) : NONE,
    exc_type_str: (ctx, self) => self.data.excTypeStr === null ? NONE : self.data.excTypeStr,
    stack: (ctx, self) => self.data.stack,
    __cause__: (ctx, self) => self.data.cause || NONE,
    __context__: (ctx, self) => self.data.context || NONE,
    __suppress_context__: (ctx, self) => BOOL(self.data.suppressContext),
    /* CPython ではノートが無い例外の __notes__ は None */
    __notes__: (ctx, self) => (self.data.notes.length ? LIST(self.data.notes.slice()) : NONE),
    exceptions: () => NONE,
    filename: unverifiedFn('traceback.TracebackException.filename', REASON_POS),
    lineno: unverifiedFn('traceback.TracebackException.lineno', REASON_POS),
    end_lineno: unverifiedFn('traceback.TracebackException.end_lineno', REASON_POS),
    offset: unverifiedFn('traceback.TracebackException.offset', REASON_POS),
    end_offset: unverifiedFn('traceback.TracebackException.end_offset', REASON_POS),
    text: unverifiedFn('traceback.TracebackException.text', REASON_POS),
    msg: unverifiedFn('traceback.TracebackException.msg', REASON_POS),
  },
  methods: {
    format: (ctx, self, args, kwargs) => LIST(formatExcLines(ctx, self)),
    format_exception_only: (ctx, self) => {
      const name = self.data.excTypeStr || 'Error';
      const msg = self.data.excValue ? excMessageText(ctx, self.data.excValue) : '';
      return LIST([name + (msg ? ': ' + msg : '') + '\n']);
    },
    print: unverifiedMethod('traceback.TracebackException.print', '標準エラー出力への書き込みはエンジンにその出力路が無い'),
  },
};
registerStdlibClass('traceback.TracebackException', tracebackExceptionDef);

/* ---------- モジュール関数 ---------- */
function excOnlyLines(ctx, excVal) {
  if (PyAPI.isNone(excVal)) return ['NoneType: None\n'];
  const name = excDisplayName(excVal);
  if (name === null) return [ctx.typeName(excVal) + ': ' + ctx.strOf(excVal) + '\n'];
  const msg = excMessageText(ctx, excVal);
  return [name + (msg ? ': ' + msg : '') + '\n'];
}
const FUNCTIONS = {
  format_exception_only: (ctx, args) => {
    if (args.length === 1) return LIST(excOnlyLines(ctx, args[0]));
    if (args.length >= 2) return LIST(excOnlyLines(ctx, args[1]));
    ctx.err('TypeError', 'format_exception_only() の引数の数が合いません', '');
    return LIST([]);
  },
  format_exception: (ctx, args) => {
    if (!args.length) return LIST(excOnlyLines(ctx, ctx.lastExceptionValue ? ctx.lastExceptionValue() : NONE));
    if (args.length === 1) return LIST(excOnlyLines(ctx, args[0]));
    return LIST(excOnlyLines(ctx, args[1]));
  },
  format_list: (ctx, args) => {
    const items = ctx.iterable(args[0]);
    if (items === null) ctx.err('TypeError', 'format_list() にはリストを使ってください', '');
    const out = [];
    for (const it of items) {
      const f = frameFromValue(ctx, it);
      if (f) out.push(formatFrameLine(ctx, f));
    }
    return LIST(out);
  },
  print_exc: unverifiedFn('traceback.print_exc', '標準エラー出力への書き込みはエンジンにその出力路が無い'),
  print_exception: unverifiedFn('traceback.print_exception', '標準エラー出力への書き込みはエンジンにその出力路が無い'),
  print_last: unverifiedFn('traceback.print_last', '標準エラー出力への書き込みはエンジンにその出力路が無い'),
  print_list: unverifiedFn('traceback.print_list', '標準エラー出力への書き込みはエンジンにその出力路が無い'),
  print_stack: unverifiedFn('traceback.print_stack', '標準エラー出力への書き込みはエンジンにその出力路が無い'),
  print_tb: unverifiedFn('traceback.print_tb', '標準エラー出力への書き込みはエンジンにその出力路が無い'),
  extract_tb: unverifiedFn('traceback.extract_tb', 'トレースバックオブジェクトはエンジンに存在しない'),
  extract_stack: unverifiedFn('traceback.extract_stack', 'フレームオブジェクトはエンジンに存在しない'),
  format_tb: unverifiedFn('traceback.format_tb', 'トレースバックオブジェクトはエンジンに存在しない'),
  format_stack: unverifiedFn('traceback.format_stack', 'フレームオブジェクトはエンジンに存在しない'),
  format_exc: unverifiedFn('traceback.format_exc', 'エンジンは直近の例外のトレースバックを保持していない'),
  walk_stack: unverifiedFn('traceback.walk_stack', 'フレームオブジェクトはエンジンに存在しない'),
  walk_tb: unverifiedFn('traceback.walk_tb', 'トレースバックオブジェクトはエンジンに存在しない'),
  clear_frames: unverifiedFn('traceback.clear_frames', 'トレースバックオブジェクトはエンジンに存在しない'),
};

registerStdlibModule('traceback', {
  functions: FUNCTIONS,
  classes: {
    FrameSummary: frameSummaryDef,
    StackSummary: stackSummaryDef,
    TracebackException: tracebackExceptionDef,
  },
});
