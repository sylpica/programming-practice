/* 高度モード B7 G3：difflib モジュール（全26件）の意味論実装。
 * 一次情報：CPython 3.12.3 の difflib.py の移植と公式ドキュメント 3.15。
 * SequenceMatcher（Ratcliff–Obershelp、autojunk 含む）、Differ、各種
 * diff 関数、HtmlDiff（_mdiff 含む）を CPython のアルゴリズムどおりに
 * 再現した。要素の等価はエンジンの eq（ctx.eq）で判定する。文字列の
 * シーケンスは文字単位に分解して扱う（CPython と同じ）。
 * diff_bytes は bytes 型をエンジンが扱わないため未対応。
 * 戻り値の Match は CPython では namedtuple（Match(a=…, b=…, size=…)）
 * だが、本実装では通常のタプル (a, b, size) で返す（表示形の差異）。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule } from './stdlib-registry.js';

const { NUM, BOOL, NONE, LIST, TUPLE } = PyAPI;
const I = (v) => NUM(v, false);
const F = (v) => NUM(v, true);

/* ---------- 要素列の取り出し ---------- */
function seqOf(ctx, v, fname) {
  if (typeof v === 'string') return [...v];
  const items = ctx.iterable(v);
  if (items === null) {
    if (ctx.isUnk(v)) return null;
    ctx.err('TypeError', fname + ' の引数には文字列・リストなどの「並び」を使ってください（' + ctx.typeName(v) + ' が渡されました）', '');
  }
  return items;
}
function linesOf(ctx, v, fname) {
  const items = ctx.iterable(v);
  if (items === null) {
    if (ctx.isUnk(v)) return null;
    ctx.err('TypeError', fname + ' の引数には行のリストを使ってください', '');
  }
  const out = [];
  for (const it of items) {
    const s = ctx.str(it);
    if (s === null) { if (ctx.isUnk(it)) return null; ctx.err('TypeError', fname + ' の要素には文字列を使ってください', ''); }
    out.push(it);
  }
  return out;
}
function strLines(ctx, v, fname) {
  const items = linesOf(ctx, v, fname);
  if (items === null) return null;
  return items.map((it) => ctx.str(it));
}
function eqEl(ctx, a, b) { const r = ctx.eq(a, b); return r === true; }
function keyOf(ctx, v) {
  // b2j の辞書キー：エンジン値の識別子。文字列・数値・真偽・None・タプル等に対応
  if (typeof v === 'string') return 's:' + v;
  if (ctx.isNum(v)) return 'n:' + v.v;
  if (ctx.isBool(v)) return 'b:' + (v.v ? 1 : 0);
  if (ctx.isNone(v)) return 'z:';
  return 'r:' + ctx.repr(v);
}

/* ---------- SequenceMatcher 本体（JS 配列上の移植） ---------- */
function makeMatcher(ctx, isjunkFn, a, b, autojunk) {
  const M = {
    isjunk: isjunkFn || null, a: a || [], b: b || [], autojunk: autojunk !== false,
    b2j: new Map(), bjunk: new Set(), bpopular: new Set(),
    matchingBlocks: null, opcodes: null, fullbcount: null,
  };
  chainB(ctx, M);
  return M;
}
function seqKey(ctx, arr) {
  return arr.map((elt) => keyOf(ctx, elt)).join('\u0001');
}
function chainB(ctx, M) {
  const b = M.b;
  const b2j = new Map();
  b.forEach((elt, i) => {
    const k = keyOf(ctx, elt);
    if (!b2j.has(k)) b2j.set(k, []);
    b2j.get(k).push(i);
  });
  M.bjunk = new Set();
  if (M.isjunk) {
    for (const k of [...b2j.keys()]) {
      const elt = b[b2j.get(k)[0]];
      // isjunk はエンジン値（ctx.call）か、内部用の JS 関数 (ctx, elt) => 値
      const r = typeof M.isjunk === 'function' ? M.isjunk(ctx, elt) : ctx.call(M.isjunk, [elt]);
      if (ctx.truthy(r) === true) M.bjunk.add(k);
    }
    for (const k of M.bjunk) b2j.delete(k);
  }
  M.bpopular = new Set();
  const n = b.length;
  if (M.autojunk && n >= 200) {
    const ntest = Math.floor(n / 100) + 1;
    for (const [k, idxs] of b2j) if (idxs.length > ntest) M.bpopular.add(k);
    for (const k of M.bpopular) b2j.delete(k);
  }
  M.b2j = b2j;
}
function findLongestMatch(ctx, M, alo, ahi, blo, bhi) {
  const a = M.a, b = M.b;
  if (ahi === undefined || ahi === null) ahi = a.length;
  if (bhi === undefined || bhi === null) bhi = b.length;
  let besti = alo, bestj = blo, bestsize = 0;
  let j2len = new Map();
  for (let i = alo; i < ahi; i++) {
    const newj2len = new Map();
    const js = M.b2j.get(keyOf(ctx, a[i])) || [];
    for (const j of js) {
      if (j < blo) continue;
      if (j >= bhi) break;
      const k = (j2len.get(j - 1) || 0) + 1;
      newj2len.set(j, k);
      if (k > bestsize) { besti = i - k + 1; bestj = j - k + 1; bestsize = k; }
    }
    j2len = newj2len;
  }
  const isbjunk = (elt) => M.bjunk.has(keyOf(ctx, elt));
  while (besti > alo && bestj > blo && !isbjunk(b[bestj - 1]) && eqEl(ctx, a[besti - 1], b[bestj - 1])) { besti--; bestj--; bestsize++; }
  while (besti + bestsize < ahi && bestj + bestsize < bhi && !isbjunk(b[bestj + bestsize]) && eqEl(ctx, a[besti + bestsize], b[bestj + bestsize])) bestsize++;
  while (besti > alo && bestj > blo && isbjunk(b[bestj - 1]) && eqEl(ctx, a[besti - 1], b[bestj - 1])) { besti--; bestj--; bestsize++; }
  while (besti + bestsize < ahi && bestj + bestsize < bhi && isbjunk(b[bestj + bestsize]) && eqEl(ctx, a[besti + bestsize], b[bestj + bestsize])) bestsize++;
  return [besti, bestj, bestsize];
}
function getMatchingBlocks(ctx, M) {
  if (M.matchingBlocks !== null) return M.matchingBlocks;
  const la = M.a.length, lb = M.b.length;
  const queue = [[0, la, 0, lb]];
  const blocks = [];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop();
    const [i, j, k] = findLongestMatch(ctx, M, alo, ahi, blo, bhi);
    if (k) {
      blocks.push([i, j, k]);
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  blocks.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
  let i1 = 0, j1 = 0, k1 = 0;
  const nonAdj = [];
  for (const [i2, j2, k2] of blocks) {
    if (i1 + k1 === i2 && j1 + k1 === j2) k1 += k2;
    else {
      if (k1) nonAdj.push([i1, j1, k1]);
      i1 = i2; j1 = j2; k1 = k2;
    }
  }
  if (k1) nonAdj.push([i1, j1, k1]);
  nonAdj.push([la, lb, 0]);
  M.matchingBlocks = nonAdj;
  return nonAdj;
}
function getOpcodes(ctx, M) {
  if (M.opcodes !== null) return M.opcodes;
  let i = 0, j = 0;
  const answer = [];
  for (const [ai, bj, size] of getMatchingBlocks(ctx, M)) {
    let tag = '';
    if (i < ai && j < bj) tag = 'replace';
    else if (i < ai) tag = 'delete';
    else if (j < bj) tag = 'insert';
    if (tag) answer.push([tag, i, ai, j, bj]);
    i = ai + size; j = bj + size;
    if (size) answer.push(['equal', ai, i, bj, j]);
  }
  M.opcodes = answer;
  return answer;
}
function getGroupedOpcodes(ctx, M, n) {
  let codes = getOpcodes(ctx, M).map((c) => c.slice());
  if (!codes.length) codes = [['equal', 0, 1, 0, 1]];
  if (codes[0][0] === 'equal') {
    const c = codes[0];
    codes[0] = [c[0], Math.max(c[1], c[2] - n), c[2], Math.max(c[3], c[4] - n), c[4]];
  }
  if (codes[codes.length - 1][0] === 'equal') {
    const c = codes[codes.length - 1];
    codes[codes.length - 1] = [c[0], c[1], Math.min(c[2], c[1] + n), c[3], Math.min(c[4], c[3] + n)];
  }
  const nn = n + n;
  const groups = [];
  let group = [];
  for (const [tag, i1, i2, j1, j2] of codes) {
    if (tag === 'equal' && i2 - i1 > nn) {
      group.push([tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)]);
      groups.push(group);
      group = [];
      group.push([tag, Math.max(i1, i2 - n), i2, Math.max(j1, j2 - n), j2]);
      continue;
    }
    group.push([tag, i1, i2, j1, j2]);
  }
  if (group.length && !(group.length === 1 && group[0][0] === 'equal')) groups.push(group);
  return groups;
}
function calcRatio(matches, length) {
  if (length) return 2.0 * matches / length;
  return 1.0;
}
function smRatio(ctx, M) {
  const matches = getMatchingBlocks(ctx, M).reduce((a, t) => a + t[2], 0);
  return calcRatio(matches, M.a.length + M.b.length);
}
function smQuickRatio(ctx, M) {
  if (M.fullbcount === null) {
    const counts = new Map();
    for (const elt of M.b) { const k = keyOf(ctx, elt); counts.set(k, (counts.get(k) || 0) + 1); }
    M.fullbcount = counts;
  }
  const avail = new Map();
  let matches = 0;
  for (const elt of M.a) {
    const k = keyOf(ctx, elt);
    const numb = avail.has(k) ? avail.get(k) : (M.fullbcount.get(k) || 0);
    avail.set(k, numb - 1);
    if (numb > 0) matches += 1;
  }
  return calcRatio(matches, M.a.length + M.b.length);
}
function smRealQuickRatio(ctx, M) {
  return calcRatio(Math.min(M.a.length, M.b.length), M.a.length + M.b.length);
}
function opcodeTuple(c) { return TUPLE([c[0], I(c[1]), I(c[2]), I(c[3]), I(c[4])]); }
function matchTuple(t) { return TUPLE([I(t[0]), I(t[1]), I(t[2])]); }

/* ---------- Differ ---------- */
const IS_LINE_JUNK_RE = /^\s*(?:#\s*)?$/;
function isLineJunk(line) { return IS_LINE_JUNK_RE.test(line); }
function isCharJunk(ch) { return ch === ' ' || ch === '\t'; }
function dumpLines(tag, x, lo, hi) {
  const out = [];
  for (let i = lo; i < hi; i++) out.push(tag + ' ' + x[i]);
  return out;
}
function plainReplace(a, alo, ahi, b, blo, bhi) {
  if (bhi - blo < ahi - alo) return [...dumpLines('+', b, blo, bhi), ...dumpLines('-', a, alo, ahi)];
  return [...dumpLines('-', a, alo, ahi), ...dumpLines('+', b, blo, bhi)];
}
function keepOriginalWs(s, tagS) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const tagC = i < tagS.length ? tagS[i] : ' ';
    out += (tagC === ' ' && /\s/.test(s[i])) ? s[i] : tagC;
  }
  return out;
}
function qformat(aline, bline, atags, btags) {
  const at = keepOriginalWs(aline, atags).replace(/\s+$/, '');
  const bt = keepOriginalWs(bline, btags).replace(/\s+$/, '');
  const out = ['- ' + aline];
  if (at) out.push('? ' + at + '\n');
  out.push('+ ' + bline);
  if (bt) out.push('? ' + bt + '\n');
  return out;
}
function fancyReplace(ctx, linejunk, charjunk, a, alo, ahi, b, blo, bhi) {
  let bestRatio = 0.74; const cutoff = 0.75;
  const cruncher = makeMatcher(ctx, charjunk, [], [], true);
  let eqi = null, eqj = null;
  let bestI = null, bestJ = null;
  for (let j = blo; j < bhi; j++) {
    const bj = b[j];
    cruncher.b = [...bj]; cruncher.matchingBlocks = null; cruncher.opcodes = null; cruncher.fullbcount = null; chainB(ctx, cruncher);
    for (let i = alo; i < ahi; i++) {
      const ai = a[i];
      if (ai === bj) { if (eqi === null) { eqi = i; eqj = j; } continue; }
      cruncher.a = [...ai];
      cruncher.matchingBlocks = null; cruncher.opcodes = null;
      if (smRealQuickRatio(ctx, cruncher) > bestRatio && smQuickRatio(ctx, cruncher) > bestRatio && smRatio(ctx, cruncher) > bestRatio) {
        bestRatio = smRatio(ctx, cruncher); bestI = i; bestJ = j;
      }
    }
  }
  const out = [];
  if (bestRatio < cutoff) {
    if (eqi === null) return plainReplace(a, alo, ahi, b, blo, bhi);
    bestI = eqi; bestJ = eqj; bestRatio = 1.0;
  } else {
    eqi = null;
  }
  out.push(...fancyHelper(ctx, linejunk, charjunk, a, alo, bestI, b, blo, bestJ));
  const aelt = a[bestI], belt = b[bestJ];
  if (eqi === null) {
    let atags = '', btags = '';
    cruncher.a = [...aelt]; cruncher.b = [...belt];
    cruncher.matchingBlocks = null; cruncher.opcodes = null; cruncher.fullbcount = null; chainB(ctx, cruncher);
    for (const [tag, ai1, ai2, bj1, bj2] of getOpcodes(ctx, cruncher)) {
      const la = ai2 - ai1, lb = bj2 - bj1;
      if (tag === 'replace') { atags += '^'.repeat(la); btags += '^'.repeat(lb); }
      else if (tag === 'delete') atags += '-'.repeat(la);
      else if (tag === 'insert') btags += '+'.repeat(lb);
      else if (tag === 'equal') { atags += ' '.repeat(la); btags += ' '.repeat(lb); }
    }
    out.push(...qformat(aelt, belt, atags, btags));
  } else {
    out.push('  ' + aelt);
  }
  out.push(...fancyHelper(ctx, linejunk, charjunk, a, bestI + 1, ahi, b, bestJ + 1, bhi));
  return out;
}
function fancyHelper(ctx, linejunk, charjunk, a, alo, ahi, b, blo, bhi) {
  if (alo < ahi) {
    if (blo < bhi) return fancyReplace(ctx, linejunk, charjunk, a, alo, ahi, b, blo, bhi);
    return dumpLines('-', a, alo, ahi);
  }
  if (blo < bhi) return dumpLines('+', b, blo, bhi);
  return [];
}
function differCompare(ctx, linejunk, charjunk, a, b) {
  const cruncher = makeMatcher(ctx, linejunk, a.map((s) => s), b.map((s) => s), true);
  // a／b は文字列の配列。要素は文字列そのものとして比較する
  cruncher.a = a; cruncher.b = b; chainB(ctx, cruncher);
  const out = [];
  for (const [tag, alo, ahi, blo, bhi] of getOpcodes(ctx, cruncher)) {
    if (tag === 'replace') out.push(...fancyReplace(ctx, linejunk, charjunk, a, alo, ahi, b, blo, bhi));
    else if (tag === 'delete') out.push(...dumpLines('-', a, alo, ahi));
    else if (tag === 'insert') out.push(...dumpLines('+', b, blo, bhi));
    else if (tag === 'equal') out.push(...dumpLines(' ', a, alo, ahi));
  }
  return out;
}

/* ---------- diff 関数群 ---------- */
function formatRangeUnified(start, stop) {
  let beginning = start + 1;
  const length = stop - start;
  if (length === 1) return String(beginning);
  if (!length) beginning -= 1;
  return beginning + ',' + length;
}
function formatRangeContext(start, stop) {
  let beginning = start + 1;
  const length = stop - start;
  if (!length) beginning -= 1;
  if (length <= 1) return String(beginning);
  return beginning + ',' + (beginning + length - 1);
}
function unifiedDiff(ctx, a, b, opt) {
  const M = makeMatcher(ctx, null, a, b, true);
  M.a = a; M.b = b; chainB(ctx, M);
  const out = [];
  let started = false;
  for (const group of getGroupedOpcodes(ctx, M, opt.n)) {
    if (!started) {
      started = true;
      const fromdate = opt.fromfiledate ? '\t' + opt.fromfiledate : '';
      const todate = opt.tofiledate ? '\t' + opt.tofiledate : '';
      out.push('--- ' + opt.fromfile + fromdate + opt.lineterm);
      out.push('+++ ' + opt.tofile + todate + opt.lineterm);
    }
    const first = group[0], last = group[group.length - 1];
    out.push('@@ -' + formatRangeUnified(first[1], last[2]) + ' +' + formatRangeUnified(first[3], last[4]) + ' @@' + opt.lineterm);
    for (const [tag, i1, i2, j1, j2] of group) {
      if (tag === 'equal') { for (let i = i1; i < i2; i++) out.push(' ' + a[i]); continue; }
      if (tag === 'replace' || tag === 'delete') for (let i = i1; i < i2; i++) out.push('-' + a[i]);
      if (tag === 'replace' || tag === 'insert') for (let j = j1; j < j2; j++) out.push('+' + b[j]);
    }
  }
  return out;
}
function contextDiff(ctx, a, b, opt) {
  const M = makeMatcher(ctx, null, a, b, true);
  M.a = a; M.b = b; chainB(ctx, M);
  const prefix = { insert: '+ ', delete: '- ', replace: '! ', equal: '  ' };
  const out = [];
  let started = false;
  for (const group of getGroupedOpcodes(ctx, M, opt.n)) {
    if (!started) {
      started = true;
      const fromdate = opt.fromfiledate ? '\t' + opt.fromfiledate : '';
      const todate = opt.tofiledate ? '\t' + opt.tofiledate : '';
      out.push('*** ' + opt.fromfile + fromdate + opt.lineterm);
      out.push('--- ' + opt.tofile + todate + opt.lineterm);
    }
    const first = group[0], last = group[group.length - 1];
    out.push('***************' + opt.lineterm);
    out.push('*** ' + formatRangeContext(first[1], last[2]) + ' ****' + opt.lineterm);
    if (group.some((g) => g[0] === 'replace' || g[0] === 'delete')) {
      for (const [tag, i1, i2] of group) {
        if (tag !== 'insert') for (let i = i1; i < i2; i++) out.push(prefix[tag] + a[i]);
      }
    }
    out.push('--- ' + formatRangeContext(first[3], last[4]) + ' ----' + opt.lineterm);
    if (group.some((g) => g[0] === 'replace' || g[0] === 'insert')) {
      for (const [tag, , , j1, j2] of group) {
        if (tag !== 'delete') for (let j = j1; j < j2; j++) out.push(prefix[tag] + b[j]);
      }
    }
  }
  return out;
}

/* ---------- _mdiff と HtmlDiff ---------- */
function mdiff(ctx, fromlines, tolines, context, linejunkFn, charjunkFn) {
  const diffLines = differCompare(ctx, linejunkFn, charjunkFn, fromlines, tolines);
  // ndiff の出力をイテレータとして消費する（配列＋位置で再現）
  let diffPos = 0;
  const nextDiff = () => diffPos < diffLines.length ? diffLines[diffPos++] : 'X';
  const numLines = [0, 0];
  function makeLine(linesArr, formatKey, side) {
    numLines[side] += 1;
    if (formatKey === null) {
      const line = linesArr.shift();
      return [numLines[side], line.slice(2)];
    }
    if (formatKey === '?') {
      const text0 = linesArr.shift(); const markers = linesArr.shift();
      const text = text0;
      const subInfo = [];
      const re = /(\++|\-+|\^+)/g;
      let mm;
      const markerText = markers.slice(2);
      while ((mm = re.exec(markerText)) !== null) subInfo.push([mm[1][0], [mm.index + 2, mm.index + 2 + mm[1].length]]);
      let t = text;
      for (let k = subInfo.length - 1; k >= 0; k--) {
        const [key, [begin, end]] = subInfo[k];
        t = t.slice(0, begin) + '\u0000' + key + t.slice(begin, end) + '\u0001' + t.slice(end);
      }
      return [numLines[side], t.slice(2)];
    }
    let text = linesArr.shift().slice(2);
    if (!text) text = ' ';
    return [numLines[side], '\u0000' + formatKey + text + '\u0001'];
  }
  function* lineIterator() {
    const lines = [];
    let numBlanksPending = 0, numBlanksToYield = 0;
    for (;;) {
      while (lines.length < 4) lines.push(nextDiff());
      const s = lines.map((l) => (typeof l === 'string' && l.length ? l[0] : 'X')).join('');
      let fromLine, toLine;
      if (s.startsWith('X')) {
        numBlanksToYield = numBlanksPending;
      } else if (s.startsWith('-?+?')) {
        yield [makeLine(lines, '?', 0), makeLine(lines, '?', 1), true];
        continue;
      } else if (s.startsWith('--++')) {
        numBlanksPending -= 1;
        yield [makeLine(lines, '-', 0), null, true];
        continue;
      } else if (s.startsWith('--?+') || s.startsWith('--+') || s.startsWith('- ')) {
        fromLine = makeLine(lines, '-', 0); toLine = null;
        numBlanksToYield = numBlanksPending - 1; numBlanksPending = 0;
      } else if (s.startsWith('-+?')) {
        yield [makeLine(lines, null, 0), makeLine(lines, '?', 1), true];
        continue;
      } else if (s.startsWith('-?+')) {
        yield [makeLine(lines, '?', 0), makeLine(lines, null, 1), true];
        continue;
      } else if (s.startsWith('-')) {
        numBlanksPending -= 1;
        yield [makeLine(lines, '-', 0), null, true];
        continue;
      } else if (s.startsWith('+--')) {
        numBlanksPending += 1;
        yield [null, makeLine(lines, '+', 1), true];
        continue;
      } else if (s.startsWith('+ ') || s.startsWith('+-')) {
        fromLine = null; toLine = makeLine(lines, '+', 1);
        numBlanksToYield = numBlanksPending + 1; numBlanksPending = 0;
      } else if (s.startsWith('+')) {
        numBlanksPending += 1;
        yield [null, makeLine(lines, '+', 1), true];
        continue;
      } else if (s.startsWith(' ')) {
        const copy = lines.slice();
        const fl = makeLine(copy, null, 0);
        const tl = makeLine(lines, null, 1);
        yield [fl, tl, false];
        continue;
      }
      while (numBlanksToYield < 0) { numBlanksToYield += 1; yield [null, ['', '\n'], true]; }
      while (numBlanksToYield > 0) { numBlanksToYield -= 1; yield [['', '\n'], null, true]; }
      if (s.startsWith('X')) return;
      yield [fromLine, toLine, true];
    }
  }
  function* linePairIterator() {
    const it = lineIterator();
    const fromlinesQ = [], tolinesQ = [];
    for (;;) {
      while (fromlinesQ.length === 0 || tolinesQ.length === 0) {
        const nxt = it.next();
        if (nxt.done) return;
        const [fl, tl, fd] = nxt.value;
        if (fl !== null && fl !== undefined) fromlinesQ.push([fl, fd]);
        if (tl !== null && tl !== undefined) tolinesQ.push([tl, fd]);
      }
      const [fl, fDiff] = fromlinesQ.shift();
      const [tl, tDiff] = tolinesQ.shift();
      yield [fl, tl, fDiff || tDiff];
    }
  }
  if (context === null || context === undefined) {
    return [...linePairIterator()];
  }
  const ctxN = context + 1;
  const out = [];
  const pairIt = linePairIterator();
  for (;;) {
    let index = 0;
    const contextLines = new Array(ctxN).fill(null);
    let foundDiff = false;
    let exhausted = false;
    while (!foundDiff) {
      const nxt = pairIt.next();
      if (nxt.done) { exhausted = true; break; }
      const [fl, tl, fd] = nxt.value;
      contextLines[index % ctxN] = [fl, tl, fd];
      index += 1;
      foundDiff = fd;
    }
    if (exhausted) return out;
    let linesToWrite;
    if (index > ctxN) { out.push([null, null, null]); linesToWrite = ctxN; }
    else { linesToWrite = index; index = 0; }
    while (linesToWrite) {
      const i = index % ctxN; index += 1;
      out.push(contextLines[i]);
      linesToWrite -= 1;
    }
    linesToWrite = ctxN - 1;
    try {
      while (linesToWrite) {
        const nxt = pairIt.next();
        if (nxt.done) return out;
        const [fl, tl, fd] = nxt.value;
        if (fd) linesToWrite = ctxN - 1;
        else linesToWrite -= 1;
        out.push([fl, tl, fd]);
      }
    } catch (e) { return out; }
  }
}

/* ---------- HtmlDiff ---------- */
const FILE_TEMPLATE = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
          "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html>

<head>
    <meta http-equiv="Content-Type"
          content="text/html; charset=%(charset)s" />
    <title></title>
    <style type="text/css">%(styles)s
    </style>
</head>

<body>
    %(table)s%(legend)s
</body>

</html>`;
const STYLES = `
        table.diff {font-family:Courier; border:medium;}
        .diff_header {background-color:#e0e0e0}
        td.diff_header {text-align:right}
        .diff_next {background-color:#c0c0c0}
        .diff_add {background-color:#aaffaa}
        .diff_chg {background-color:#ffff77}
        .diff_sub {background-color:#ffaaaa}`;
const TABLE_TEMPLATE = `
    <table class="diff" id="difflib_chg_%(prefix)s_top"
           cellspacing="0" cellpadding="0" rules="groups" >
        <colgroup></colgroup> <colgroup></colgroup> <colgroup></colgroup>
        <colgroup></colgroup> <colgroup></colgroup> <colgroup></colgroup>
        %(header_row)s
        <tbody>
%(data_rows)s        </tbody>
    </table>`;
const LEGEND = `
    <table class="diff" summary="Legends">
        <tr> <th colspan="2"> Legends </th> </tr>
        <tr> <td> <table border="" summary="Colors">
                      <tr><th> Colors </th> </tr>
                      <tr><td class="diff_add">&nbsp;Added&nbsp;</td></tr>
                      <tr><td class="diff_chg">Changed</td> </tr>
                      <tr><td class="diff_sub">Deleted</td> </tr>
                  </table></td>
             <td> <table border="" summary="Links">
                      <tr><th colspan="2"> Links </th> </tr>
                      <tr><td>(f)irst change</td> </tr>
                      <tr><td>(n)ext change</td> </tr>
                      <tr><td>(t)op</td> </tr>
                  </table></td> </tr>
    </table>`;
let htmlDefaultPrefix = 0;
function tabNewlineReplace(tabsize, fromlines, tolines) {
  const expandTabs = (line) => {
    let s = line.replace(/ /g, '\u0000');
    // expandtabs：タブを次のタブストップまでの空白に展開
    let out = ''; let col = 0;
    for (const ch of s) {
      if (ch === '\t') { const n = tabsize - (col % tabsize); out += ' '.repeat(n); col += n; }
      else { out += ch; col += 1; }
    }
    s = out.replace(/ /g, '\t');
    return s.replace(/\0/g, ' ').replace(/\n$/, '');
  };
  return [fromlines.map(expandTabs), tolines.map(expandTabs)];
}
function splitLineHtml(hd, dataList, lineNum, text) {
  if (!lineNum) { dataList.push([lineNum, text]); return; }
  const size = [...text].length;
  const max = hd.wrapcolumn;
  if (size <= max || (size - (text.split('\u0000').length - 1) * 3) <= max) { dataList.push([lineNum, text]); return; }
  let i = 0, n = 0, mark = '';
  const chars = [...text];
  while (n < max && i < chars.length) {
    if (chars[i] === '\u0000') { i += 1; mark = chars[i]; i += 1; }
    else if (chars[i] === '\u0001') { i += 1; mark = ''; }
    else { i += 1; n += 1; }
  }
  let line1 = chars.slice(0, i).join('');
  let line2 = chars.slice(i).join('');
  if (mark) { line1 += '\u0001'; line2 = '\u0000' + mark + line2; }
  dataList.push([lineNum, line1]);
  splitLineHtml(hd, dataList, '>', line2);
}
function formatLineHtml(hd, side, flag, linenum, text) {
  let id = '';
  let linenumStr;
  if (typeof linenum === 'number') {
    linenumStr = String(linenum);
    id = ' id="' + hd.prefix[side] + linenumStr + '"';
  } else {
    linenumStr = String(linenum);
    id = '';
  }
  let t = text.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
  t = t.replace(/ /g, '&nbsp;').replace(/\s+$/, '');
  return '<td class="diff_header"' + id + '>' + linenumStr + '</td><td nowrap="nowrap">' + t + '</td>';
}
function htmlMakeTable(ctx, hd, fromlinesIn, tolinesIn, fromdesc, todesc, context, numlines) {
  hd.prefix = ['from' + htmlDefaultPrefix + '_', 'to' + htmlDefaultPrefix + '_'];
  htmlDefaultPrefix += 1;
  const [fromlines, tolines] = tabNewlineReplace(hd.tabsize, fromlinesIn, tolinesIn);
  const contextLines = context ? numlines : null;
  let diffs = mdiff(ctx, fromlines, tolines, contextLines, hd.linejunkFn, hd.charjunkFn);
  if (hd.wrapcolumn) {
    const wrapped = [];
    for (const [fromdata, todata, flag] of diffs) {
      if (flag === null) { wrapped.push([fromdata, todata, flag]); continue; }
      const fromlist = [], tolist = [];
      splitLineHtml(hd, fromlist, fromdata[0], fromdata[1]);
      splitLineHtml(hd, tolist, todata[0], todata[1]);
      while (fromlist.length || tolist.length) {
        const fd = fromlist.length ? fromlist.shift() : ['', ' '];
        const td = tolist.length ? tolist.shift() : ['', ' '];
        wrapped.push([fd, td, flag]);
      }
    }
    diffs = wrapped;
  }
  let fromlist = [], tolist = [], flaglist = [];
  for (const [fromdata, todata, flag] of diffs) {
    try {
      fromlist.push(formatLineHtml(hd, 0, flag, fromdata[0], fromdata[1]));
      tolist.push(formatLineHtml(hd, 1, flag, todata[0], todata[1]));
    } catch (e) {
      fromlist.push(null); tolist.push(null);
    }
    flaglist.push(flag);
  }
  // _convert_flags
  const toprefix = hd.prefix[1];
  let nextId = flaglist.map(() => '');
  let nextHref = flaglist.map(() => '');
  let numChg = 0, inChange = false, last = 0;
  for (let i = 0; i < flaglist.length; i++) {
    const flag = flaglist[i];
    if (flag) {
      if (!inChange) {
        inChange = true;
        last = i;
        const ii = Math.max(0, i - numlines);
        nextId[ii] = ' id="difflib_chg_' + toprefix + '_' + numChg + '"';
        numChg += 1;
        nextHref[last] = '<a href="#difflib_chg_' + toprefix + '_' + numChg + '">n</a>';
      }
    } else inChange = false;
  }
  if (!flaglist.length) {
    flaglist = [false]; nextId = ['']; nextHref = ['']; last = 0;
    if (context) { fromlist = ['<td></td><td>&nbsp;No Differences Found&nbsp;</td>']; tolist = fromlist; }
    else fromlist = tolist = ['<td></td><td>&nbsp;Empty File&nbsp;</td>'];
  }
  if (!flaglist[0]) nextHref[0] = '<a href="#difflib_chg_' + toprefix + '_0">f</a>';
  nextHref[last] = '<a href="#difflib_chg_' + toprefix + '_top">t</a>';
  const s = [];
  const fmt = '            <tr><td class="diff_next"%s>%s</td>%s<td class="diff_next">%s</td>%s</tr>\n';
  for (let i = 0; i < flaglist.length; i++) {
    if (flaglist[i] === null) {
      if (i > 0) s.push('        </tbody>        \n        <tbody>\n');
    } else {
      s.push(fmt.replace('%s', nextId[i]).replace('%s', nextHref[i]).replace('%s', fromlist[i]).replace('%s', nextHref[i]).replace('%s', tolist[i]));
    }
  }
  let headerRow = '';
  if (fromdesc || todesc) {
    headerRow = '<thead><tr>' + '<th class="diff_next"><br /></th>' +
      '<th colspan="2" class="diff_header">' + fromdesc + '</th>' +
      '<th class="diff_next"><br /></th>' +
      '<th colspan="2" class="diff_header">' + todesc + '</th></tr></thead>';
  }
  let table = TABLE_TEMPLATE.replace('%(prefix)s', hd.prefix[1]).replace('%(header_row)s', headerRow).replace('%(data_rows)s', s.join(''));
  return table.replace(/\u0000\+/g, '<span class="diff_add">').replace(/\u0000-/g, '<span class="diff_sub">')
    .replace(/\u0000\^/g, '<span class="diff_chg">').replace(/\u0001/g, '</span>').replace(/\t/g, '&nbsp;');
}

/* ---------- クラス定義 ---------- */
function junkFnFrom(ctx, v) {
  if (v === undefined || v === null || ctx.isNone(v)) return null;
  if (ctx.isUnk(v)) return 'unk';
  return v;
}
const SequenceMatcherDef = {
  typeName: 'SequenceMatcher',
  construct: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const isjunk = args.length > 0 ? args[0] : kw.isjunk;
    const aV = args.length > 1 ? args[1] : kw.a;
    const bV = args.length > 2 ? args[2] : kw.b;
    const autojunkV = args.length > 3 ? args[3] : kw.autojunk;
    const a = aV === undefined ? [] : seqOf(ctx, aV, 'SequenceMatcher()');
    const b = bV === undefined ? [] : seqOf(ctx, bV, 'SequenceMatcher()');
    if (a === null || b === null) return ctx.unk('シーケンスが実行時に決まる値');
    const jf = junkFnFrom(ctx, isjunk);
    if (jf === 'unk') return ctx.unk('isjunk が実行時に決まる値');
    const autojunk = autojunkV === undefined ? true : ctx.truthy(autojunkV);
    if (autojunk === null) return ctx.unk('autojunk が実行時に決まる値');
    const M = makeMatcher(ctx, jf, a, b, autojunk);
    return ctx.native('difflib.SequenceMatcher', { M });
  },
  methods: {
    set_seqs: (ctx, self, args, kwargs) => {
      const a = seqOf(ctx, args[0], 'set_seqs()'); const b = seqOf(ctx, args[1], 'set_seqs()');
      if (a === null || b === null) return ctx.unk('シーケンスが実行時に決まる値');
      self.data.M.a = a; self.data.M.b = b;
      self.data.M.matchingBlocks = null; self.data.M.opcodes = null; self.data.M.fullbcount = null;
      chainB(ctx, self.data.M);
      return NONE;
    },
    set_seq1: (ctx, self, args, kwargs) => {
      const a = seqOf(ctx, args[0], 'set_seq1()');
      if (a === null) return ctx.unk('シーケンスが実行時に決まる値');
      if (seqKey(ctx, a) !== seqKey(ctx, self.data.M.a)) { self.data.M.matchingBlocks = null; self.data.M.opcodes = null; }
      self.data.M.a = a;
      return NONE;
    },
    set_seq2: (ctx, self, args, kwargs) => {
      const b = seqOf(ctx, args[0], 'set_seq2()');
      if (b === null) return ctx.unk('シーケンスが実行時に決まる値');
      if (seqKey(ctx, b) !== seqKey(ctx, self.data.M.b)) {
        self.data.M.matchingBlocks = null; self.data.M.opcodes = null; self.data.M.fullbcount = null;
        self.data.M.b = b; chainB(ctx, self.data.M);
      }
      return NONE;
    },
    find_longest_match: (ctx, self, args, kwargs) => {
      const kw = kwargs || {};
      const g = (idx, name, dflt) => {
        const v = args.length > idx ? args[idx] : kw[name];
        if (v === undefined) return dflt;
        const n = ctx.int(v);
        if (n === null) ctx.err('TypeError', 'find_longest_match() の引数には整数を使ってください', '');
        return n;
      };
      const alo = g(0, 'alo', 0), ahi = g(1, 'ahi', null), blo = g(2, 'blo', 0), bhi = g(3, 'bhi', null);
      return matchTuple(findLongestMatch(ctx, self.data.M, alo, ahi, blo, bhi));
    },
    get_matching_blocks: (ctx, self) => LIST(getMatchingBlocks(ctx, self.data.M).map(matchTuple)),
    get_opcodes: (ctx, self) => LIST(getOpcodes(ctx, self.data.M).map(opcodeTuple)),
    get_grouped_opcodes: (ctx, self, args, kwargs) => {
      const n = args.length ? ctx.int(args[0]) : (kwargs && kwargs.n !== undefined ? ctx.int(kwargs.n) : 3);
      if (n === null) ctx.err('TypeError', 'get_grouped_opcodes() の引数には整数を使ってください', '');
      return LIST(getGroupedOpcodes(ctx, self.data.M, n).map((grp) => LIST(grp.map(opcodeTuple))));
    },
    ratio: (ctx, self) => F(smRatio(ctx, self.data.M)),
    quick_ratio: (ctx, self) => F(smQuickRatio(ctx, self.data.M)),
    real_quick_ratio: (ctx, self) => F(smRealQuickRatio(ctx, self.data.M)),
  },
  repr: () => '<difflib.SequenceMatcher object>',
};
const DifferDef = {
  typeName: 'Differ',
  construct: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const lj = args.length > 0 ? args[0] : kw.linejunk;
    const cj = args.length > 1 ? args[1] : kw.charjunk;
    const ljF = junkFnFrom(ctx, lj);
    const cjF = junkFnFrom(ctx, cj);
    if (ljF === 'unk' || cjF === 'unk') return ctx.unk('junk 関数が実行時に決まる値');
    return ctx.native('difflib.Differ', { linejunk: ljF, charjunk: cjF });
  },
  methods: {
    compare: (ctx, self, args, kwargs) => {
      const a = strLines(ctx, args[0], 'Differ.compare()');
      const b = strLines(ctx, args[1], 'Differ.compare()');
      if (a === null || b === null) return ctx.unk('行が実行時に決まる値');
      return LIST(differCompare(ctx, self.data.linejunk, self.data.charjunk, a, b));
    },
  },
  repr: () => '<difflib.Differ object>',
};
const HtmlDiffDef = {
  typeName: 'HtmlDiff',
  construct: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const tabsize = args.length > 0 ? ctx.int(args[0]) : (kw.tabsize !== undefined ? ctx.int(kw.tabsize) : 8);
    let wrapcolumn = null;
    const wcV = args.length > 1 ? args[1] : kw.wrapcolumn;
    if (wcV !== undefined && !ctx.isNone(wcV)) wrapcolumn = ctx.int(wcV);
    const lj = junkFnFrom(ctx, args.length > 2 ? args[2] : kw.linejunk);
    const cjV = args.length > 3 ? args[3] : kw.charjunk;
    const cj = cjV === undefined ? ((c, ch) => BOOL(isCharJunk(c.str(ch) || ''))) : junkFnFrom(ctx, cjV);
    return ctx.native('difflib.HtmlDiff', {
      tabsize, wrapcolumn, linejunkFn: lj === null ? null : lj,
      charjunkFn: cj,
      prefix: ['from0_', 'to0_'],
    });
  },
  methods: {
    make_table: (ctx, self, args, kwargs) => {
      const kw = kwargs || {};
      const fromlines = strLines(ctx, args[0], 'HtmlDiff.make_table()');
      const tolines = strLines(ctx, args[1], 'HtmlDiff.make_table()');
      if (fromlines === null || tolines === null) return ctx.unk('行が実行時に決まる値');
      const fromdesc = args.length > 2 ? ctx.str(args[2]) : (kw.fromdesc !== undefined ? ctx.str(kw.fromdesc) : '');
      const todesc = args.length > 3 ? ctx.str(args[3]) : (kw.todesc !== undefined ? ctx.str(kw.todesc) : '');
      const contextV = args.length > 4 ? args[4] : kw.context;
      const context = contextV === undefined ? false : !!ctx.truthy(contextV);
      const numlinesV = args.length > 5 ? args[5] : kw.numlines;
      const numlines = numlinesV === undefined ? 5 : ctx.int(numlinesV);
      const hd = self.data;
      const charjunkFn = hd.charjunkFn;
      return htmlMakeTable(ctx, { ...hd, charjunkFn }, fromlines, tolines, fromdesc || '', todesc || '', context, numlines);
    },
    make_file: (ctx, self, args, kwargs) => {
      const kw = kwargs || {};
      const fromlines = strLines(ctx, args[0], 'HtmlDiff.make_file()');
      const tolines = strLines(ctx, args[1], 'HtmlDiff.make_file()');
      if (fromlines === null || tolines === null) return ctx.unk('行が実行時に決まる値');
      const fromdesc = args.length > 2 ? ctx.str(args[2]) : (kw.fromdesc !== undefined ? ctx.str(kw.fromdesc) : '');
      const todesc = args.length > 3 ? ctx.str(args[3]) : (kw.todesc !== undefined ? ctx.str(kw.todesc) : '');
      const contextV = args.length > 4 ? args[4] : kw.context;
      const context = contextV === undefined ? false : !!ctx.truthy(contextV);
      const numlinesV = args.length > 5 ? args[5] : kw.numlines;
      const numlines = numlinesV === undefined ? 5 : ctx.int(numlinesV);
      const charset = kw.charset !== undefined ? ctx.str(kw.charset) : 'utf-8';
      const table = htmlMakeTable(ctx, self.data, fromlines, tolines, fromdesc || '', todesc || '', context, numlines);
      return FILE_TEMPLATE.replace('%(charset)s', charset).replace('%(styles)s', STYLES).replace('%(table)s', table).replace('%(legend)s', LEGEND);
    },
  },
  repr: () => '<difflib.HtmlDiff object>',
};

/* ---------- モジュール関数 ---------- */
function callableOrNull(ctx, v, fname) {
  if (v === undefined || ctx.isNone(v)) return null;
  if (ctx.isUnk(v)) return 'unk';
  return v;
}
const FUNCTIONS = {
  /* クラス名と同名の関数シャドウ：module.Class(kw=...) の呼び出し経路では
   * エンジンが kwargs を二重評価して UNK 化する基盤不具合があるため、
   * 関数として登録して construct を直接呼ぶことで kwargs を正しく受ける
   * （基盤要請として報告書に記載。クラス登録自体はメソッド・属性解決用に残す）。 */
  SequenceMatcher: (ctx, args, kwargs) => SequenceMatcherDef.construct(ctx, args, kwargs),
  Differ: (ctx, args, kwargs) => DifferDef.construct(ctx, args, kwargs),
  HtmlDiff: (ctx, args, kwargs) => HtmlDiffDef.construct(ctx, args, kwargs),
  get_close_matches: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const word = args[0];
    const poss = ctx.iterable(args[1]);
    if (poss === null) ctx.err('TypeError', 'get_close_matches() の第2引数には「並び」を使ってください', '');
    const nV = args.length > 2 ? args[2] : kw.n;
    const n = nV === undefined ? 3 : ctx.int(nV);
    const cutoffV = args.length > 3 ? args[3] : kw.cutoff;
    const cutoff = cutoffV === undefined ? 0.6 : ctx.num(cutoffV);
    if (n === null || !(n > 0)) ctx.err('ValueError', 'n must be > 0: ' + ctx.repr(args[2] || I(0)), '');
    if (cutoff === null || !(0.0 <= cutoff && cutoff <= 1.0)) ctx.err('ValueError', 'cutoff must be in [0.0, 1.0]: ' + ctx.repr(args[3] || F(0)), '');
    const wordSeq = seqOf(ctx, word, 'get_close_matches()');
    if (wordSeq === null) return ctx.unk('単語が実行時に決まる値');
    const s = makeMatcher(ctx, null, [], wordSeq, true);
    const result = [];
    for (const x of poss) {
      const xs = seqOf(ctx, x, 'get_close_matches()');
      if (xs === null) return ctx.unk('候補が実行時に決まる値');
      s.a = xs; s.matchingBlocks = null; s.opcodes = null;
      if (smRealQuickRatio(ctx, s) >= cutoff && smQuickRatio(ctx, s) >= cutoff && smRatio(ctx, s) >= cutoff) {
        result.push([smRatio(ctx, s), x]);
      }
    }
    // heapq.nlargest 相当：同点は元の順序を保つ（安定ソートで近似）
    const sorted = result.map((r, idx) => [r[0], idx, r[1]]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    return LIST(sorted.slice(0, n).map((r) => r[2]));
  },
  unified_diff: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const a = strLines(ctx, args[0], 'unified_diff()');
    const b = strLines(ctx, args[1], 'unified_diff()');
    if (a === null || b === null) return ctx.unk('行が実行時に決まる値');
    const gs = (idx, name, dflt) => {
      const v = args.length > idx ? args[idx] : kw[name];
      if (v === undefined) return dflt;
      const s = ctx.str(v);
      if (s === null) ctx.err('TypeError', 'all arguments must be str', '');
      return s;
    };
    const opt = {
      fromfile: gs(2, 'fromfile', ''), tofile: gs(3, 'tofile', ''),
      fromfiledate: gs(4, 'fromfiledate', ''), tofiledate: gs(5, 'tofiledate', ''),
      lineterm: gs(7, 'lineterm', '\n'),
      n: 3,
    };
    const nV = args.length > 6 ? args[6] : kw.n;
    if (nV !== undefined) { const nn = ctx.int(nV); if (nn === null) ctx.err('TypeError', 'n には整数を使ってください', ''); opt.n = nn; }
    return LIST(unifiedDiff(ctx, a, b, opt));
  },
  context_diff: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const a = strLines(ctx, args[0], 'context_diff()');
    const b = strLines(ctx, args[1], 'context_diff()');
    if (a === null || b === null) return ctx.unk('行が実行時に決まる値');
    const gs = (idx, name, dflt) => {
      const v = args.length > idx ? args[idx] : kw[name];
      if (v === undefined) return dflt;
      const s = ctx.str(v);
      if (s === null) ctx.err('TypeError', 'all arguments must be str', '');
      return s;
    };
    const opt = {
      fromfile: gs(2, 'fromfile', ''), tofile: gs(3, 'tofile', ''),
      fromfiledate: gs(4, 'fromfiledate', ''), tofiledate: gs(5, 'tofiledate', ''),
      lineterm: gs(7, 'lineterm', '\n'),
      n: 3,
    };
    const nV = args.length > 6 ? args[6] : kw.n;
    if (nV !== undefined) { const nn = ctx.int(nV); if (nn === null) ctx.err('TypeError', 'n には整数を使ってください', ''); opt.n = nn; }
    return LIST(contextDiff(ctx, a, b, opt));
  },
  ndiff: (ctx, args, kwargs) => {
    const kw = kwargs || {};
    const a = strLines(ctx, args[0], 'ndiff()');
    const b = strLines(ctx, args[1], 'ndiff()');
    if (a === null || b === null) return ctx.unk('行が実行時に決まる値');
    let lj = callableOrNull(ctx, args.length > 2 ? args[2] : kw.linejunk, 'ndiff()');
    let cj = args.length > 3 ? args[3] : kw.charjunk;
    let cjF;
    if (cj === undefined) cjF = (c, ch) => BOOL(isCharJunk(c.str(ch) || ''));
    else { const f = callableOrNull(ctx, cj, 'ndiff()'); cjF = f === 'unk' ? 'unk' : f; }
    if (cjF === null) cjF = null;
    if (lj === 'unk' || cjF === 'unk') return ctx.unk('junk 関数が実行時に決まる値');
    return LIST(differCompare(ctx, lj, cjF, a, b));
  },
  restore: (ctx, args, kwargs) => {
    const delta = strLines(ctx, args[0], 'restore()');
    if (delta === null) return ctx.unk('行が実行時に決まる値');
    const whichV = args.length > 1 ? ctx.int(args[1]) : null;
    if (whichV === null) ctx.err('TypeError', 'restore() の第2引数には整数を使ってください', '');
    let tag;
    if (whichV === 1) tag = '- ';
    else if (whichV === 2) tag = '+ ';
    else ctx.err('ValueError', 'unknown delta choice (must be 1 or 2): ' + ctx.repr(args[1]), '');
    const prefixes = ['  ', tag];
    return LIST(delta.filter((l) => prefixes.includes(l.slice(0, 2))).map((l) => l.slice(2)));
  },
  IS_LINE_JUNK: (ctx, args, kwargs) => {
    const s = ctx.str(args[0]);
    if (s === null) { if (ctx.isUnk(args[0])) return ctx.unk('行が実行時に決まる値'); ctx.err('TypeError', 'IS_LINE_JUNK() の引数には文字列を使ってください', ''); }
    return BOOL(isLineJunk(s));
  },
  IS_CHARACTER_JUNK: (ctx, args, kwargs) => {
    const s = ctx.str(args[0]);
    if (s === null) { if (ctx.isUnk(args[0])) return ctx.unk('文字が実行時に決まる値'); ctx.err('TypeError', 'IS_CHARACTER_JUNK() の引数には文字列を使ってください', ''); }
    return BOOL(isCharJunk(s));
  },
  diff_bytes: (ctx) => ctx.err('未対応', 'difflib.diff_bytes は本アプリの高度モードでは未対応です（bytes 型を扱わないため）', ''),
};

registerStdlibModule('difflib', {
  functions: FUNCTIONS,
  classes: { SequenceMatcher: SequenceMatcherDef, Differ: DifferDef, HtmlDiff: HtmlDiffDef },
});
