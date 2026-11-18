/* 高度モード B7 G10：netrc（例外対応付けのみ。netrc クラスはファイル前提で未対応）。 */
import { registerStdlibModule } from './stdlib-registry.js';
registerStdlibModule('netrc', { classes: { NetrcParseError: { typeName: 'NetrcParseError', exc: 'netrc.NetrcParseError', excParents: ['Exception'] } } });
