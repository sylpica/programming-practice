/* 高度モード B7 G10：email.mime.text（email.message の中核を流用）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { messageDef, createMsg } from './impl-advanced-email-message.js';
registerStdlibModule('email.mime.text', { classes: { MIMEText: { ...messageDef, typeName: 'MIMEText', construct: (ctx,args)=>{ const self=createMsg(ctx,'email.mime.text.MIMEText'); self.data.payload = ctx.str(args[0]) ?? ''; const cs = args.length>2? ctx.str(args[2]) : null; self.data.headers.push(['Content-Type','text/'+(args.length>1?ctx.str(args[1])??'plain':'plain')+'; charset="'+(cs||'us-ascii')+'"'],['Content-Transfer-Encoding','7bit'],['MIME-Version','1.0']); return self; } } } });
