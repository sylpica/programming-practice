/* 高度モード B7 G12：sched（7件）。
 * scheduler は timefunc/delayfunc を注入できるため、フェイククロックで
 * 検証できる範囲（enter/enterabs/cancel/empty/queue、run(blocking=False)、
 * run のフェイク delayfunc 経由の実行）を実装する。実時間での待機は
 * シミュレーションでは再現しない。
 * Event は (time, priority, sequence, action, argument, kwargs) のタプル互換
 * 値として扱う（属性 time 等は固定名なので attrs で提供できる）。
 * 一次情報：公式ドキュメント 3.15 library/sched、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE, TUPLE, LIST, DICT } = PyAPI;

let SEQ = 0;
function eventTuple(ctx, ev) {
  return TUPLE([NUM(ev.time, true), NUM(ev.priority, false), NUM(ev.seq, false), ev.action, TUPLE(ev.argument), ev.kwargs]);
}
function sortQueue(ctx, data) {
  data.queue.sort((a, b) => (a.time - b.time) || (a.priority - b.priority) || (a.seq - b.seq));
}
const EventDef = {
  typeName: 'Event',
  construct(ctx, args) {
    // Event(time, priority, sequence, action, argument, kwargs)
    return ctx.native('sched.Event', {
      time: ctx.num(args[0]) ?? 0, priority: ctx.int(args[1]) ?? 0, seq: ctx.int(args[2]) ?? 0,
      action: args[3], argument: args[4], kwargs: args[5],
    });
  },
  attrs: {
    time: (ctx, self) => NUM(self.data.time, true),
    priority: (ctx, self) => NUM(self.data.priority, false),
    sequence: (ctx, self) => NUM(self.data.seq, false),
    action: (ctx, self) => self.data.action,
    argument: (ctx, self) => self.data.argument,
    kwargs: (ctx, self) => self.data.kwargs,
  },
  eq(ctx, self, other) {
    if (!other || other.__native !== 'sched.Event') return false;
    return self.data.time === other.data.time && self.data.priority === other.data.priority && self.data.seq === other.data.seq;
  },
  hash: () => null,
  compare(ctx, self, op, other) {
    if (!other || other.__native !== 'sched.Event') return null;
    const a = [self.data.time, self.data.priority, self.data.seq], b = [other.data.time, other.data.priority, other.data.seq];
    for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return op === '<' ? a[i] < b[i] : op === '<=' ? a[i] < b[i] : op === '>' ? a[i] > b[i] : a[i] > b[i] || a[i] === b[i]; }
    return op === '<=' || op === '>=' || op === '==';
  },
  repr(ctx, self) {
    return 'Event(time=' + self.data.time + ', priority=' + self.data.priority + ', sequence=' + self.data.seq + ', action=' + ctx.repr(self.data.action) + ', argument=' + ctx.repr(self.data.argument) + ', kwargs=' + ctx.repr(self.data.kwargs) + ')';
  },
};
const SchedulerDef = {
  typeName: 'scheduler',
  construct(ctx, args) {
    // scheduler(timefunc, delayfunc)。どちらも呼び出し可能値
    return ctx.native('sched.scheduler', { timefunc: args[0], delayfunc: args[1], queue: [] });
  },
  methods: {
    enterabs(ctx, self, args, kwargs) {
      const time = ctx.num(args[0]); const priority = args.length > 1 ? ctx.int(args[1]) ?? 0 : 0;
      const action = args[2]; const argument = args.length > 3 ? args[3] : TUPLE([]);
      const kw = args.length > 4 ? args[4] : (kwargs && Object.keys(kwargs).length ? null : DICT());
      const ev = { time, priority, seq: SEQ++, action, argument: ctx.listOf(argument) ? argument : TUPLE([]), kwargs: kw || DICT() };
      self.data.queue.push(ev); sortQueue(ctx, self.data);
      return ctx.native('sched.Event', ev);
    },
    enter(ctx, self, args, kwargs) {
      const delay = ctx.num(args[0]) ?? 0;
      const nowV = ctx.call(self.data.timefunc, []);
      const now = ctx.num(nowV) ?? 0;
      const evArgs = [NUM(now + delay, true), args[1], args[2], args[3], args[4]];
      return SchedulerDef.methods.enterabs(ctx, self, evArgs, kwargs);
    },
    cancel(ctx, self, args) {
      const target = args[0];
      const idx = self.data.queue.findIndex((ev) => target && target.__native === 'sched.Event' && ev.time === target.data.time && ev.priority === target.data.priority && ev.seq === target.data.seq && ev.action === target.data.action);
      if (idx < 0) ctx.err('ValueError', 'list.remove(x): x not in list', '');
      self.data.queue.splice(idx, 1);
      return NONE;
    },
    empty(ctx, self) { return BOOL(self.data.queue.length === 0); },
    run(ctx, self, args, kwargs) {
      let blocking = true;
      if (args.length && ctx.isBool(args[0])) blocking = args[0].v;
      if (kwargs && 'blocking' in kwargs && ctx.isBool(kwargs.blocking)) blocking = kwargs.blocking.v;
      if (!blocking) {
        if (!self.data.queue.length) return NONE;
        const now = ctx.num(ctx.call(self.data.timefunc, [])) ?? 0;
        const next = self.data.queue[0].time;
        return NUM(Math.max(0, next - now), true);
      }
      // blocking: フェイク/実 delayfunc を呼びながら順に実行する。
      // delayfunc が Python 関数（フェイククロック）の場合のみ意味を持つ。
      let guard = 0;
      while (self.data.queue.length) {
        if (++guard > 10000) ctx.err('RuntimeError', 'sched.scheduler.run(): イベント数が上限を超えました', '');
        const ev = self.data.queue[0];
        const now = ctx.num(ctx.call(self.data.timefunc, [])) ?? 0;
        const delay = ev.time - now;
        if (delay > 0) ctx.call(self.data.delayfunc, [NUM(delay, true)]);
        self.data.queue.shift();
        const argList = ctx.listOf(ev.argument) || [];
        ctx.call(ev.action, argList);
      }
      return NONE;
    },
  },
  attrs: {
    queue: (ctx, self) => LIST(self.data.queue.map((ev) => eventTuple(ctx, ev))),
    timefunc: (ctx, self) => self.data.timefunc,
    delayfunc: (ctx, self) => self.data.delayfunc,
  },
};
registerStdlibModule('sched', { classes: { scheduler: SchedulerDef, Event: EventDef } });
