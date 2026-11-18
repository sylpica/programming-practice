/* 高度モード B7 G10：email.mime.multipart（email.message の中核を流用）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import { messageDef, createMsg } from './impl-advanced-email-message.js';
registerStdlibModule('email.mime.multipart', { classes: { MIMEMultipart: { ...messageDef, typeName: 'MIMEMultipart', construct: (ctx,args)=>{ const self=createMsg(ctx,'email.mime.multipart.MIMEMultipart'); self.data.payload=[]; self.data.boundary='===============G10BOUNDARY=='; self.data.headers.push(['Content-Type','multipart/'+(args.length?ctx.str(args[0])??'mixed':'mixed')+'; boundary="===============G10BOUNDARY=="'],['MIME-Version','1.0']); return self; } } } });
