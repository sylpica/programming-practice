/* 高度モード B7 G10：email パッケージの便利関数（文字列版のみ実装。
 * bytes／ファイル版はリファレンス側で未検証／未対応に裁定）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { parseMessageText } from './impl-advanced-email-message.js';
registerStdlibModule('email', {
  functions: {
    message_from_string: (ctx, args) => parseMessageText(ctx, ctx.str(args[0]) ?? '', 'email.message.Message'),
  },
});
