/* 高度モード B7 G10：email.mime.base（email.message の中核を流用）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { messageDef, createMsg } from './impl-advanced-email-message.js';
registerStdlibModule('email.mime.base', { classes: { MIMEBase: { ...messageDef, typeName: 'MIMEBase', construct: (ctx,args)=>{ const self=createMsg(ctx,'email.mime.base.MIMEBase'); self.data.headers.push(['Content-Type',(ctx.str(args[0])??'')+'/'+(ctx.str(args[1])??'')],['MIME-Version','1.0']); return self; } } } });
