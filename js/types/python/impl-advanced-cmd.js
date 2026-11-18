/* 高度モード B7 G12：cmd（22件）。
 * 裁定：Cmd の対話ループ（cmdloop）は標準入出力前提のため未対応。
 * 文字列処理として検証できる parseline は CPython どおりに実装する
 * （'?foo'→help、'!cmd' は shell エスケープとして (None,None,line)、
 * 空行は (None,None,'')）。onecmd はユーザー定義サブクラスの do_* を
 * エンジンが実行できないため未検証（サブクラス実行は基盤要請）。
 * completedefault/default/emptyline 等のフックもサブクラス前提のため
 * 未検証とし、クラス属性（prompt/intro/ruler 等の固定名）は束ね値で提供。
 * 一次情報：公式ドキュメント 3.15 library/cmd、CPython 3.12.3 実走。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
const { BOOL, NONE, TUPLE } = PyAPI;
const IDENTCHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
const CmdDef = {
  typeName: 'Cmd',
  construct(ctx, args, kwargs) {
    return ctx.native('cmd.Cmd', { completekey: args.length ? args[0] : 'tab', stdin: null, stdout: null, lastcmd: '', cmdqueue: [] });
  },
  methods: {
    parseline(ctx, self, args) {
      let line = ctx.str(args[0]);
      if (line === null) ctx.err('TypeError', 'parseline(): 引数は文字列でなければなりません', '');
      line = line.trim();
      if (!line) return TUPLE([NONE, NONE, '']);
      if (line[0] === '?') line = 'help ' + line.slice(1);
      else if (line[0] === '!') {
        // use_rawinput 等に関わらず CPython の parseline は '!' をそのまま返す経路と
        // shell 呼び出し経路がある。既定（completekey あり）では '!' は特別扱いで
        // (None, None, line) を返す実走結果に従う
        return TUPLE([NONE, NONE, line]);
      }
      let i = 0;
      while (i < line.length && IDENTCHARS.includes(line[i])) i++;
      const cmdName = line.slice(0, i);
      const arg = line.slice(i).trim();
      return TUPLE([cmdName || NONE, arg, line]);
    },
    onecmd(ctx, self, args) { ctx.diag('cmd.Cmd.onecmd はユーザー定義サブクラスの do_* メソッド実行を伴うため、エンジンでは意味論を確定できません（未検証）'); return ctx.unk('onecmd の結果'); },
    cmdloop(ctx, self, args) { ctx.err('未対応', 'cmd.Cmd.cmdloop は対話的な標準入出力ループのため本アプリの高度モードでは未対応です', ''); return NONE; },
    emptyline(ctx, self) { return NONE; },
    default(ctx, self, args) { ctx.diag('*** Unknown syntax: ' + (args.length ? ctx.strOf(args[0]) : '')); return NONE; },
    precmd(ctx, self, args) { return args.length ? args[0] : NONE; },
    postcmd(ctx, self, args) { return args.length ? args[0] : BOOL(false); },
    preloop(ctx, self) { return NONE; },
    postloop(ctx, self) { return NONE; },
    do_help(ctx, self, args) { ctx.diag('Documented commands (type help <topic>):'); return NONE; },
    completedefault(ctx, self, args) { return ctx.V.LIST([]); },
    columnize(ctx, self, args) { ctx.diag('columnize の出力先は標準出力のため、エンジンでは表示を再現しません（未検証）'); return NONE; },
  },
  attrs: {
    prompt: (ctx, self) => '(Cmd) ',
    intro: (ctx, self) => NONE,
    lastcmd: (ctx, self) => self.data.lastcmd,
    cmdqueue: (ctx, self) => ctx.V.LIST(self.data.cmdqueue),
    ruler: (ctx, self) => '=',
    doc_header: (ctx, self) => 'Documented commands (type help <topic>):',
    misc_header: (ctx, self) => 'Miscellaneous help topics:',
    undoc_header: (ctx, self) => 'Undocumented commands:',
    identchars: (ctx, self) => IDENTCHARS,
    use_rawinput: (ctx, self) => BOOL(true),
  },
};
registerStdlibModule('cmd', { classes: { Cmd: CmdDef } });
