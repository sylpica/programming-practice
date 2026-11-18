/* 高度モード B7 G10：email.parser（文字列解析。CPython 3.12.3 実走照合）。
 * Bytes 系は bytes 表現が UNK のため未検証（未登録）。Parser.parse は
 * ファイルオブジェクト前提のため未検証。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';
import { parseMessageText } from './impl-advanced-email-message.js';
const { NONE } = PyAPI;
function parserClass(qual, typeName, headOnly) {
  return {
    typeName,
    construct: (ctx, args, kwargs) => ctx.native(qual, { headOnly: !!headOnly }),
    methods: {
      parsestr: (ctx, self, args) => {
        let text = ctx.str(args[0]) ?? '';
        if (self.data.headOnly) { const sep = text.indexOf('\n\n'); text = (sep >= 0 ? text.slice(0, sep) : text) + '\n\n'; }
        return parseMessageText(ctx, text, 'email.message.Message');
      },
    },
  };
}
function feedParserClass(qual, typeName) {
  return {
    typeName,
    construct: (ctx) => ctx.native(qual, { buf: '' }),
    methods: {
      feed: (ctx, self, args) => { self.data.buf += ctx.str(args[0]) ?? ''; return NONE; },
      close: (ctx, self) => parseMessageText(ctx, self.data.buf, 'email.message.Message'),
    },
  };
}
registerStdlibModule('email.parser', {
  classes: {
    Parser: parserClass('email.parser.Parser', 'Parser', false),
    HeaderParser: parserClass('email.parser.HeaderParser', 'HeaderParser', true),
    FeedParser: feedParserClass('email.parser.FeedParser', 'FeedParser'),
  },
});
