/* 高度モード B7 G12：queue（23件中、非ブロッキング意味論を実装）。
 * 裁定（報告書に明記）：エンジンは単一スレッドのシミュレーションであり、
 * 実スレッドの待機は再現できない。put/get は block=False 相当を基本とし、
 * timeout が指定されても待たずに、空なら Empty・満杯なら Full を直ちに
 * 送出する（CPython との差異）。timeout<0 は ValueError（CPython どおり）。
 * ShutDown（3.13+）は shutdown() 後の put/get の例外として実装する。
 * 一次情報：公式ドキュメント 3.15 library/queue、CPython 3.12.3 実走
 * （ShutDown は 3.13 以降のためドキュメントで裏付け）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { NUM, BOOL, NONE } = PyAPI;

function cmpVals(ctx, a, b) {
  const r = ctx.compare('<', a, b);
  if (r && r.__bool !== undefined) return r;
  return r;
}
function less(ctx, a, b) {
  const v = ctx.compare('<', a, b);
  return v === true || (v && v.v === true);
}
function makeQueueClass(qual, kind) {
  function checkTimeout(ctx, kwargs, args) {
    // timeout は位置・キーワードどちらでも来うる。値だけ検証する
    let t = null;
    if (kwargs && 'timeout' in kwargs) t = ctx.num(kwargs.timeout);
    if (t !== null && t < 0) ctx.err('ValueError', "'timeout' must be a non-negative number", '');
  }
  return {
    typeName: qual.split('.').pop(),
    construct(ctx, args, kwargs) {
      let maxsize = 0;
      if (args.length >= 1) maxsize = ctx.int(args[0]) ?? 0;
      if (kwargs && 'maxsize' in kwargs) maxsize = ctx.int(kwargs.maxsize) ?? 0;
      return ctx.native(qual, { items: [], maxsize, unfinished: 0, shutdown: false, kind });
    },
    methods: {
      qsize(ctx, self) { return NUM(self.data.items.length, false); },
      empty(ctx, self) { return BOOL(self.data.items.length === 0); },
      full(ctx, self) { return BOOL(self.data.maxsize > 0 && self.data.items.length >= self.data.maxsize); },
      put(ctx, self, args, kwargs) {
        checkTimeout(ctx, kwargs, args);
        if (self.data.shutdown) ctx.err('queue.ShutDown', '', '');
        if (self.data.maxsize > 0 && self.data.items.length >= self.data.maxsize) ctx.err('queue.Full', '', '');
        const item = args.length ? args[0] : NONE;
        if (self.data.kind === 'lifo') self.data.items.push(item);
        else if (self.data.kind === 'priority') {
          self.data.items.push(item);
          // 安定ソートに近い挿入：小さい順。比較できない要素は CPython でも TypeError
          self.data.items.sort((x, y) => (less(ctx, x, y) ? -1 : less(ctx, y, x) ? 1 : 0));
        } else self.data.items.push(item);
        self.data.unfinished++;
        return NONE;
      },
      put_nowait(ctx, self, args, kwargs) { return this.put(ctx, self, args, kwargs); },
      get(ctx, self, args, kwargs) {
        checkTimeout(ctx, kwargs, args);
        if (!self.data.items.length) {
          if (self.data.shutdown) ctx.err('queue.ShutDown', '', '');
          ctx.err('queue.Empty', '', '');
        }
        let item;
        if (self.data.kind === 'lifo') item = self.data.items.pop();
        else item = self.data.items.shift();
        return item;
      },
      get_nowait(ctx, self, args, kwargs) { return this.get(ctx, self, args, kwargs); },
      task_done(ctx, self) {
        if (self.data.unfinished <= 0) ctx.err('ValueError', 'task_done() called too many times', '');
        self.data.unfinished--;
        return NONE;
      },
      join(ctx, self) {
        if (self.data.unfinished > 0) {
          ctx.diag('queue.join(): 未完了タスクが ' + self.data.unfinished + ' 件あります。単一スレッドのシミュレーションでは待機を再現できないため、ここでは完了を待たずに進みます（CPython では全タスク完了までブロックします）');
        }
        return NONE;
      },
      shutdown(ctx, self, args, kwargs) { self.data.shutdown = true; return NONE; },
    },
    attrs: {
      maxsize: (ctx, self) => NUM(self.data.maxsize, false),
      unfinished_tasks: (ctx, self) => NUM(self.data.unfinished, false),
      is_shutdown: (ctx, self) => BOOL(self.data.shutdown),
    },
    repr: (ctx, self) => '<' + qual + ' at ' + '0x0' + '>',
  };
}
const QueueDef = makeQueueClass('queue.Queue', 'fifo');
const LifoDef = makeQueueClass('queue.LifoQueue', 'lifo');
const PriorityDef = makeQueueClass('queue.PriorityQueue', 'priority');
const SimpleDef = makeQueueClass('queue.SimpleQueue', 'fifo');
// SimpleQueue には task_done/join/qsize 等が無い（put/get/empty のみ＋qsize はある）
delete SimpleDef.methods.task_done; delete SimpleDef.methods.join; delete SimpleDef.methods.shutdown;
registerStdlibModule('queue', {
  classes: {
    Queue: QueueDef, LifoQueue: LifoDef, PriorityQueue: PriorityDef, SimpleQueue: SimpleDef,
    Empty: { typeName: 'Empty', exc: 'queue.Empty', excParents: ['Exception'] },
    Full: { typeName: 'Full', exc: 'queue.Full', excParents: ['Exception'] },
    ShutDown: { typeName: 'ShutDown', exc: 'queue.ShutDown', excParents: ['Exception'] },
  },
});
