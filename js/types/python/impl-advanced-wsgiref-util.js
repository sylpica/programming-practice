/* 高度モード B7 G13：wsgiref.util（7件）。
 * 一次情報：CPython 3.12.3 の Lib/wsgiref/util.py（実走照合）。
 * environ 辞書に対する純粋処理を実装する。FileWrapper はストリーム
 * 前提のため未対応。setup_testing_defaults は wsgi.input／wsgi.errors
 * （ストリーム）だけを未確定値として設定し、それ以外のキーは正確に
 * 再現する（status は supported、caution に明記）。 */
import { registerStdlibModule } from './stdlib-registry.js';
import {
  BOOL, NONE, TUPLE, UNK, I, isNone, isDict, isUnk, noKw, arity, dictGet, dictSet,
  unsupportedCtor,
} from './impl-advanced-g13-common.js';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade']);
/* urllib.parse.quote（encoding='latin1'、errors='strict'）の移植 */
function quoteLatin1(ctx, s, safe) {
  const safeSet = new Set(Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~" + safe));
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code > 0xff) ctx.err('UnicodeEncodeError', "'latin-1' codec can't encode character '" + ch + "' in position 0: ordinal not in range(256)", '');
    out += safeSet.has(ch) ? ch : '%' + code.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}
function envGet(ctx, env, key) {
  const v = dictGet(env, key);
  return v === undefined ? null : v;
}
function envStr(ctx, env, key) {
  const v = envGet(ctx, env, key);
  if (v === null) return null;
  return typeof v === 'string' ? v : ctx.strOf(v);
}
function guessSchemeFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'guess_scheme'); arity(ctx, args, 1, 1, 'guess_scheme');
  const env = args[0];
  if (isUnk(env)) return UNK('guess_scheme');
  if (!isDict(env)) ctx.err('AttributeError', "'" + ctx.typeName(env) + "' object has no attribute 'get'", '');
  const v = envStr(ctx, env, 'HTTPS');
  return (v === 'yes' || v === 'on' || v === '1') ? 'https' : 'http';
}
function isHopByHopFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'is_hop_by_hop'); arity(ctx, args, 1, 1, 'is_hop_by_hop');
  const name = args[0];
  if (isUnk(name)) return UNK('is_hop_by_hop');
  if (typeof name !== 'string') ctx.err('AttributeError', "'" + ctx.typeName(name) + "' object has no attribute 'lower'", '');
  return BOOL(HOP_BY_HOP.has(name.toLowerCase()));
}
function applicationUriFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'application_uri'); arity(ctx, args, 1, 1, 'application_uri');
  const env = args[0];
  if (isUnk(env)) return UNK('application_uri');
  if (!isDict(env)) ctx.err('TypeError', 'argument must be a dict', '');
  const scheme = envGet(ctx, env, 'wsgi.url_scheme');
  if (scheme === null) ctx.err('KeyError', "'wsgi.url_scheme'", '');
  let url = ctx.strOf(scheme) + '://';
  const host = envStr(ctx, env, 'HTTP_HOST');
  if (host !== null) url += host;
  else {
    const name = envGet(ctx, env, 'SERVER_NAME');
    if (name === null) ctx.err('KeyError', "'SERVER_NAME'", '');
    url += ctx.strOf(name);
    const port = envGet(ctx, env, 'SERVER_PORT');
    if (port === null) ctx.err('KeyError', "'SERVER_PORT'", '');
    const portStr = ctx.strOf(port);
    if (!((ctx.strOf(scheme) === 'https' && portStr === '443') || (ctx.strOf(scheme) === 'http' && portStr === '80'))) url += ':' + portStr;
  }
  const script = envStr(ctx, env, 'SCRIPT_NAME');
  url += quoteLatin1(ctx, script === null || script === '' ? '/' : script, '/');
  return url;
}
function requestUriFn(ctx, args, kwargs) {
  let includeQuery = true;
  if (args.length > 1) includeQuery = ctx.truthy(args[1]);
  for (const k of Object.keys(kwargs || {})) {
    if (k !== 'include_query') ctx.err('TypeError', "request_uri() got an unexpected keyword argument '" + k + "'", '');
    includeQuery = ctx.truthy(kwargs[k]);
  }
  if (args.length < 1) ctx.err('TypeError', "request_uri() missing 1 required positional argument: 'environ'", '');
  const env = args[0];
  if (isUnk(env)) return UNK('request_uri');
  let url = applicationUriFn(ctx, [env], {});
  if (typeof url !== 'string') return UNK('request_uri');
  const pathInfo = envStr(ctx, env, 'PATH_INFO') || '';
  const quoted = quoteLatin1(ctx, pathInfo, '/;=,');
  const script = envStr(ctx, env, 'SCRIPT_NAME');
  url += (script === null || script === '') ? quoted.slice(1) : quoted;
  if (includeQuery) {
    const qs = envStr(ctx, env, 'QUERY_STRING');
    if (qs) url += '?' + qs;
  }
  return url;
}
/* posixpath.normpath の移植（shift_path_info が使う） */
function posixNormpath(p) {
  if (p === '') return '.';
  const initialSlashes = p.startsWith('/');
  const specialPrefix = initialSlashes && p.startsWith('//') && !p.startsWith('///') ? 2 : (initialSlashes ? 1 : 0);
  const comps = [];
  for (const comp of p.split('/')) {
    if (comp === '' || comp === '.') continue;
    if (comp !== '..' || (!initialSlashes && !comps.length) || (comps.length && comps[comps.length - 1] === '..')) comps.push(comp);
    else if (comps.length) comps.pop();
  }
  let result = '/'.repeat(specialPrefix) + comps.join('/');
  if (result === '') result = '.';
  return result;
}
function shiftPathInfoFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'shift_path_info'); arity(ctx, args, 1, 1, 'shift_path_info');
  const env = args[0];
  if (isUnk(env)) return UNK('shift_path_info');
  if (!isDict(env)) ctx.err('TypeError', 'argument must be a dict', '');
  const pathInfo = envStr(ctx, env, 'PATH_INFO');
  if (pathInfo === null || pathInfo === '') return NONE;
  // CPython 3.12.3 の wsgiref.util.shift_path_info の移植
  let parts = pathInfo.split('/');
  const mid = parts.slice(1, -1).filter((p) => p && p !== '.');
  parts = parts.length > 1 ? [parts[0], ...mid, parts[parts.length - 1]] : [...parts];
  if (parts.length < 2) ctx.err('IndexError', 'list index out of range', '');
  const name = parts[1];
  parts.splice(1, 1);
  let scriptName = posixNormpath((envStr(ctx, env, 'SCRIPT_NAME') || '') + '/' + name);
  if (scriptName.endsWith('/')) scriptName = scriptName.slice(0, -1);
  if (!name && !scriptName.endsWith('/')) scriptName += '/';
  dictSet(env, 'SCRIPT_NAME', scriptName);
  dictSet(env, 'PATH_INFO', parts.join('/'));
  if (name === '.') return NONE;
  return name;
}
function setupTestingDefaultsFn(ctx, args, kwargs) {
  noKw(ctx, kwargs, 'setup_testing_defaults'); arity(ctx, args, 1, 1, 'setup_testing_defaults');
  const env = args[0];
  if (isUnk(env)) return UNK('setup_testing_defaults');
  if (!isDict(env)) ctx.err('TypeError', 'argument must be a dict', '');
  const setdef = (k, v) => { if (envGet(ctx, env, k) === null) dictSet(env, k, v); };
  setdef('SERVER_NAME', '127.0.0.1');
  setdef('SERVER_PROTOCOL', 'HTTP/1.0');
  setdef('HTTP_HOST', envStr(ctx, env, 'SERVER_NAME'));
  setdef('REQUEST_METHOD', 'GET');
  if (envGet(ctx, env, 'SCRIPT_NAME') === null && envGet(ctx, env, 'PATH_INFO') === null) {
    dictSet(env, 'SCRIPT_NAME', '');
    dictSet(env, 'PATH_INFO', '/');
  }
  setdef('wsgi.version', TUPLE([I(1), I(0)]));
  setdef('wsgi.run_once', I(0));
  setdef('wsgi.multithread', I(0));
  setdef('wsgi.multiprocess', I(0));
  if (envGet(ctx, env, 'wsgi.input') === null) dictSet(env, 'wsgi.input', ctx.unk('BytesIO ストリーム'));
  if (envGet(ctx, env, 'wsgi.errors') === null) dictSet(env, 'wsgi.errors', ctx.unk('StringIO ストリーム'));
  setdef('wsgi.url_scheme', guessSchemeFn(ctx, [env], {}));
  const scheme = envStr(ctx, env, 'wsgi.url_scheme');
  setdef('SERVER_PORT', scheme === 'https' ? '443' : '80');
  return NONE;
}

registerStdlibModule('wsgiref.util', {
  classes: {
    FileWrapper: {
      typeName: 'FileWrapper',
      construct: unsupportedCtor('wsgiref.util.FileWrapper', 'ファイルオブジェクト（ストリーム）を前提とするため'),
    },
  },
  functions: {
    application_uri: applicationUriFn,
    guess_scheme: guessSchemeFn,
    is_hop_by_hop: isHopByHopFn,
    request_uri: requestUriFn,
    setup_testing_defaults: setupTestingDefaultsFn,
    shift_path_info: shiftPathInfoFn,
  },
});
