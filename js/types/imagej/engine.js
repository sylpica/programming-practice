import{refineCondition}from'../../core/conditions.js';
import{functions as FUNCTIONS}from './reference-data.js';
function funcByName(name){return FUNCTIONS.find(x=>x.name===name);}
function pracCheck(code){
  var OPEN = { "(": 1, "{": 1, "[": 1 }, CLOSE = { ")": "(", "}": "{", "]": "[" };
  var stack = [], q = null, strAt = -1, inCom = false, inBlock = false, blockAt = -1, bs = false;
  for (var i = 0; i < code.length; i++){
    var c = code[i], n = code[i + 1];
    if (inBlock){ if (c === "*" && n === "/"){ inBlock = false; i++; } continue; }
    if (inCom){ if (c === "\n") inCom = false; continue; }
    if (q){
      if (c === "\n" || c === "\r") return { kind: "str", at: strAt };
      if (bs) bs = false; else if (c === "\\") bs = true; else if (c === q) q = null;
      continue;
    }
    if (c === "/" && n === "*"){ inBlock = true; blockAt = i; i++; continue; }
    if (c === "/" && n === "/"){ inCom = true; i++; continue; }
    if (c === "\"" || c === "'"){ q = c; strAt = i; continue; }
    if (OPEN[c]) stack.push({ ch: c, at: i });
    else if (CLOSE[c]){
      var top = stack.pop();
      if (!top) return { kind: "extra", ch: c, at: i };
      if (top.ch !== CLOSE[c]) return { kind: "mismatch", ch: c, at: i, open: top.ch, openAt: top.at };
    }
  }
  if (q) return { kind: "str", at: strAt };
  if (inBlock) return { kind: "block", at: blockAt };
  if (stack.length){ var t = stack[stack.length - 1]; return { kind: "open", ch: t.ch, at: t.at, more: stack.length - 1 }; }
  return null;
}
function pracLine(code, at){ return code.slice(0, at).split("\n").length; }
function pracIssueText(code, r){
  var L = pracLine(code, r.at);
  if (r.kind === "extra") return L + "行目の " + r.ch + " に対応する開き括弧がありません";
  if (r.kind === "mismatch") return L + "行目の " + r.ch + " が " + pracLine(code, r.openAt) + "行目の " + r.open + " と対応していません";
  if (r.kind === "open") return L + "行目の " + r.ch + " が閉じていません" + (r.more ? "（ほかに " + r.more + " 個）" : "");
  if (r.kind === "str") return L + "行目の文字列が閉じていません";
  return L + "行目の /* が閉じていません";
}
// 書式から挿入用の文を作る：省略可能部 [ ] と可変長の「, ...」を落とし、末尾に ; を付ける
function simErr(line, text, cause){ return { __simErr: 1, line: line, text: text, cause: cause || "" }; }
var SIM_UNK = { __unk: 1 };let imageUnknownId=0;function ijSymbol(v){if(simIsUnk(v))return v.symbolic||{kind:'unknown',source:'ImageJの実行時の値',id:v.__id||('ij-'+(++imageUnknownId))};return v;}
/* P-N1: 値の大きさの上限（他系統と同じ 200,000）。文字列連結・置換・
   join・配列生成などで結果がこれを超える場合は、実体を作らず未確定値
   （SIM_UNK）へ倒す。P-N2: 表示専用文字列の切り詰め（省略を明示する）。 */
var SIM_VALUE_LIMIT = 200000;
function simTrunc(s){ if (typeof s !== "string" || s.length <= 2000) return s; return s.slice(0, 1000) + "…（全" + s.length + "文字のうち先頭1000文字のみ表示し、残りは省略しました）"; }
function simIsUnk(v){ return v === SIM_UNK || (v && typeof v === "object" && v.__unk === 1); }
/* Java DecimalFormat 相当の固定小数整形：0桁は HALF_UP、それ以外は HALF_EVEN（IJ の DecimalFormat 配列の初期化どおり） */
function simFmtFixed(x, d, halfUp){
  var neg = x < 0, ax = Math.abs(x), p = Math.pow(10, d), y = ax * p;
  var fl = Math.floor(y), frac = y - fl;
  if (frac > 0.5 + 1e-9) fl++;
  else if (frac >= 0.5 - 1e-9 && (halfUp || fl % 2 === 1)) fl++;
  var s = String(fl);
  if (d > 0){ while (s.length <= d) s = "0" + s; s = s.slice(0, s.length - d) + "." + s.slice(s.length - d); }
  return (neg ? "-" : "") + s;
}
/* DecimalFormat("0.000…E0") 相当（d2s で負の桁数を指定したときの指数表記）。
   IJ.d2s は sf[k]（小数部 k 桁、k=|decimalPlaces|、上限9）を使うため、桁数は指定に従う。 */
function simSci2(x, digits){
  var k = typeof digits === "number" ? digits : 2;
  if (x === 0) return "0." + "000000000".slice(0, k) + "E0";
  var ex = Math.floor(Math.log10(Math.abs(x)));
  var ms = simFmtFixed(x / Math.pow(10, ex), k, false);
  var ten = "10." + "000000000".slice(0, k);
  if (ms === ten || ms === "-" + ten){ ms = (x < 0 ? "-1." : "1.") + "000000000".slice(0, k); ex++; }
  return ms + "E" + ex;
}
/* ImageJ の数値表示（Interpreter.toString → IJ.d2s(x, 4, 9)）に合わせた整形 */
function simFmtNum(x){
  if (x !== x) return "NaN";
  if (!isFinite(x)) return x > 0 ? "Infinity" : "-Infinity";
  if (x === 0) return "0";
  if (Number.isInteger(x) && x >= -2147483648 && x < 2147483648) return String(x);
  var magnitude = Math.ceil(Math.log10(Math.abs(x)) + 0.223e-9);
  var decimals = 9 - magnitude, str;
  if (decimals < 0 || magnitude < -4){
    str = x.toExponential(4).replace(/e([+-])/, "E$1").replace(/e/, "E").replace(/E\+/, "E");
  } else {
    if (decimals > 4) decimals = Math.max(4, decimals - 5);
    str = simFmtFixed(x, decimals, decimals === 0);
  }
  if (str.indexOf("E") < 0 && str.indexOf(".") >= 0) str = str.replace(/0+$/, "").replace(/\.$/, "");
  return str;
}
function simFmt(v){
  if (simIsUnk(v)) return "（実行時に決まる値）";
  if (typeof v === "number") return simFmtNum(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)){
    var s = v.slice(0, 6).map(simFmt).join(", ");
    return "[" + s + (v.length > 6 ? ", …（全" + v.length + "件）" : "") + "]";
  }
  return String(v);
}
function simLex(code){
  var toks = [], i = 0, line = 1, n = code.length;
  function push(k, v, at){ toks.push({ k: k, v: v, line: line, at: at }); }
  while (i < n){
    var c = code[i], c2 = code[i + 1];
    if (c === "\n"){ line++; i++; continue; }
    if (c === " " || c === "\t" || c === "\r"){ i++; continue; }
    if (c === "/" && c2 === "/"){ while (i < n && code[i] !== "\n") i++; continue; }
    if (c === "/" && c2 === "*"){
      var bl = line; i += 2;
      while (i < n && !(code[i] === "*" && code[i + 1] === "/")){ if (code[i] === "\n") line++; i++; }
      if (i >= n) throw simErr(bl, "ブロックコメント /* が閉じていません", "コメントの終わりの */ が必要です。");
      i += 2; continue;
    }
    if (c === "\"" || c === "'"){
      var q = c, s = "", sl = line, closed = false; i++;
      while (i < n){
        var ch = code[i];
        if (ch === "\n") break;
        if (ch === "\\" && i + 1 < n){
          var e = code[i + 1];
          if (e >= "0" && e <= "7"){
            /* 8進数エスケープ（R23-N12）。実 ImageJ の字句解析（ij.macro.Tokenizer が
               java.io.StreamTokenizer に委譲）の規則どおり：最大3桁で、3桁目は
               先頭の数字が 0〜3 のときだけ取り込む（\101="A"、\040=空白、\377 まで） */
            var firstOct = e, octVal = e.charCodeAt(0) - 48, octUsed = 1;
            if (i + 2 < n && code[i + 2] >= "0" && code[i + 2] <= "7"){
              octVal = octVal * 8 + (code[i + 2].charCodeAt(0) - 48); octUsed = 2;
              if (firstOct <= "3" && i + 3 < n && code[i + 3] >= "0" && code[i + 3] <= "7"){ octVal = octVal * 8 + (code[i + 3].charCodeAt(0) - 48); octUsed = 3; }
            }
            s += String.fromCharCode(octVal); i += 1 + octUsed; continue;
          }
          /* StreamTokenizer の変換表どおり \a \b \f \r \v も変換する。
             それ以外の文字（\" \' \\ や \d など）はバックスラッシュを落として
             その文字自体になるのが実 ImageJ の挙動（同 Tokenizer の既定動作） */
          s += e === "n" ? "\n" : e === "t" ? "\t" : e === "r" ? "\r" : e === "b" ? "\b" : e === "f" ? "\f" : e === "v" ? "\v" : e === "a" ? "\x07" : e;
          i += 2; continue;
        }
        if (ch === q){ closed = true; i++; break; }
        s += ch; i++;
      }
      if (!closed) throw simErr(sl, "文字列が閉じていません", "文字列は行の中で " + q + " で閉じる必要があります。");
      push("str", s, i); continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(c2 || ""))){
      var hx = /^0[xX][0-9a-fA-F]+/.exec(code.slice(i));
      if (hx){ push("num", parseInt(hx[0].slice(2), 16), i); i += hx[0].length; continue; }
      var m = /^\d+\.?\d*(?:[eE][+-]?\d+)?|^\.\d+(?:[eE][+-]?\d+)?/.exec(code.slice(i));
      push("num", parseFloat(m[0]), i); i += m[0].length; continue;
    }
    if (/[A-Za-z_$]/.test(c)){
      var w = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(code.slice(i))[0];
      push("id", w, i); i += w.length; continue;
    }
    var three = code.substr(i, 3), two = code.substr(i, 2);
    if (["++", "--", "+=", "-=", "*=", "/=", "==", "!=", "<=", ">=", "&&", "||", "<<", ">>"].indexOf(two) >= 0){ push("op", two, i); i += 2; continue; }
    if ("+-*/%=<>!?:(){}[];,.&|^~".indexOf(c) >= 0){ push("op", c, i); i++; continue; }
    throw simErr(line, "解釈できない文字「" + c + "」があります", "マクロの文法で使えない文字です。全角文字の混入も確認してください。");
  }
  toks.push({ k: "eof", v: "", line: line, at: n });
  return toks;
}
function simParse(code){
  var toks = simLex(code), pos = 0;
  function peek(){ return toks[pos]; }
  function next(){ return toks[pos++]; }
  function isOp(v){ var t = toks[pos]; return t.k === "op" && t.v === v; }
  function expect(v){
    var t = next();
    if (t.k !== "op" || t.v !== v) throw simErr(t.line, "文法エラー：「" + v + "」が必要な位置に「" + (t.v || "文末") + "」があります", "括弧や区切りの対応を確認してください。");
    return t;
  }
  function optSemi(){ if (isOp(";")) next(); }
  var KW = { "if": 1, "else": 1, "for": 1, "while": 1, "do": 1, "function": 1, "return": 1, "break": 1, "continue": 1, "var": 1 };
  function parseProgram(endBrace){
    var out = [];
    while (peek().k !== "eof" && !(endBrace && isOp("}"))){
      var st = parseStmt();
      if (st) out.push(st);
    }
    return out;
  }
  function parseBlockOrStmt(){
    if (isOp("{")){ next(); var b = parseProgram(true); expect("}"); return { t: "block", body: b, line: toks[pos - 1].line }; }
    return parseStmt();
  }
  function parseStmt(){
    var t = peek();
    if (isOp(";")){ next(); return null; }
    if (isOp("{")) return parseBlockOrStmt();
    if (t.k === "id" && t.v === "function"){
      next(); var nm = next(); if (nm.k !== "id") throw simErr(t.line, "function の後に関数名が必要です", "");
      expect("("); var ps = [];
      if (!isOp(")")){ for (;;){ var p = next(); if (p.k !== "id") throw simErr(p.line, "引数名が不正です", ""); ps.push(p.v); if (isOp(",")){ next(); continue; } break; } }
      expect(")"); var body = parseBlockOrStmt();
      return { t: "funcdef", name: nm.v, params: ps, body: body.t === "block" ? body.body : [body], line: t.line };
    }
    if (t.k === "id" && t.v === "if"){
      next(); expect("("); var c1 = parseExpr(); expect(")");
      var then = parseBlockOrStmt(), els = null;
      if (peek().k === "id" && peek().v === "else"){ next(); els = parseBlockOrStmt(); }
      return { t: "if", cond: c1, then: then, els: els, line: t.line };
    }
    if (t.k === "id" && t.v === "var" && toks[pos + 1] && toks[pos + 1].k === "id"){
      next();
      var vds = [];
      for (;;){
        var vn = next();
        var vi = null;
        if (isOp("=")){ next(); vi = parseAssign(); }
        vds.push({ name: vn.v, init: vi, line: vn.line });
        if (isOp(",")){ next(); continue; }
        break;
      }
      optSemi();
      return { t: "vardecl", decls: vds, line: t.line };
    }
    if (t.k === "id" && t.v === "for"){
      next(); expect("(");
      var init = null;
      if (!isOp(";")){
        if (peek().k === "id" && peek().v === "var"){
          var savePos = pos;
          var vd = parseStmt();
          if (vd && vd.t === "vardecl") init = vd; else { pos = savePos; init = parseExpr(); }
        } else init = parseExpr();
      }
      if (!init || init.t !== "vardecl") expect(";");
      var cond = isOp(";") ? null : parseExpr(); expect(";");
      var inc = isOp(")") ? null : parseExpr(); expect(")");
      return { t: "for", init: init, cond: cond, inc: inc, body: parseBlockOrStmt(), line: t.line };
    }
    if (t.k === "id" && t.v === "while"){
      next(); expect("("); var cw = parseExpr(); expect(")");
      return { t: "while", cond: cw, body: parseBlockOrStmt(), line: t.line };
    }
    if (t.k === "id" && t.v === "do"){
      next(); var bd = parseBlockOrStmt();
      var w = next(); if (!(w.k === "id" && w.v === "while")) throw simErr(w.line, "do の後には while が必要です", "");
      expect("("); var cd = parseExpr(); expect(")"); optSemi();
      return { t: "do", cond: cd, body: bd, line: t.line };
    }
    if (t.k === "id" && t.v === "return"){
      next(); var v = null;
      if (!isOp(";") && !isOp("}") && peek().k !== "eof") v = parseExpr();
      optSemi(); return { t: "return", v: v, line: t.line };
    }
    if (t.k === "id" && (t.v === "break" || t.v === "continue")){ next(); optSemi(); return { t: t.v, line: t.line }; }
    if (t.k === "id" && t.v === "macro" && toks[pos + 1] && (toks[pos + 1].k === "str" || (toks[pos + 1].k === "op" && toks[pos + 1].v === "{"))){
      next();
      var mname = null;
      if (peek().k === "str") mname = next().v;
      var mbody = parseBlockOrStmt();
      return { t: "macroblock", name: mname, body: mbody.t === "block" ? mbody.body : [mbody], line: t.line };
    }
    var e = parseExpr(); optSemi();
    return { t: "expr", e: e, line: t.line };
  }
  var exprDepth = 0;
  function parseExpr(){
    exprDepth++;
    if (exprDepth > 300) throw simErr(peek().line, "式や括弧が深すぎて読み切れませんでした", "式が長すぎるか、括弧の入れ子が深すぎます。式を短い文に分けてください。");
    try { return parseAssign(); } finally { exprDepth--; }
  }
  function parseAssign(){
    var l = parseTernary();
    var t = peek();
    if (t.k === "op" && ["=", "+=", "-=", "*=", "/="].indexOf(t.v) >= 0){
      next(); var r = parseAssign();
      if (l.t !== "var" && l.t !== "index") throw simErr(t.line, "代入の左側は変数か配列要素にしてください", "計算結果などには代入できません。");
      return { t: "assign", op: t.v, target: l, v: r, line: t.line };
    }
    return l;
  }
  function parseTernary(){
    var c = parseLogical();
    if (isOp("?")){ next(); var a = parseExpr(); expect(":"); var b = parseTernary(); return { t: "tern", c: c, a: a, b: b, line: c.line }; }
    return c;
  }
  /* ImageJ の演算子階層（ij.macro.Interpreter）: && と || は同じ階層で右結合。
     比較はその内側、+ - はさらに内側、* / % とビット演算 & | ^ << >> は同じ階層（getTerm） */
  function parseLogical(){
    var l = parseComparison();
    var t = peek();
    if (t.k === "op" && (t.v === "&&" || t.v === "||")){
      next();
      var r = parseLogical();
      return { t: "logic", op: t.v, l: l, r: r, line: t.line };
    }
    return l;
  }
  function parseComparison(){
    var l = parseAdditive();
    for (;;){
      var t = peek();
      if (t.k === "op" && ["==", "!=", "<", "<=", ">", ">="].indexOf(t.v) >= 0){ next(); var r = parseAdditive(); l = { t: "bin", op: t.v, l: l, r: r, line: t.line }; }
      else break;
    }
    return l;
  }
  function parseAdditive(){
    var l = parseTerm();
    for (;;){
      var t = peek();
      if (t.k === "op" && (t.v === "+" || t.v === "-")){ next(); var r = parseTerm(); l = { t: "bin", op: t.v, l: l, r: r, line: t.line }; }
      else break;
    }
    return l;
  }
  function parseTerm(){
    var l = parseUnary();
    for (;;){
      var t = peek();
      if (t.k === "op" && ["*", "/", "%", "&", "|", "^", "<<", ">>"].indexOf(t.v) >= 0){ next(); var r = parseUnary(); l = { t: "bin", op: t.v, l: l, r: r, line: t.line }; }
      else break;
    }
    return l;
  }
  function parseUnary(){
    var t = peek();
    if (t.k === "op" && (t.v === "!" || t.v === "-" || t.v === "+" || t.v === "~")){ next(); return { t: "un", op: t.v, e: parseUnary(), line: t.line }; }
    if (t.k === "op" && (t.v === "++" || t.v === "--")){ next(); return { t: "pre", op: t.v, e: parseUnary(), line: t.line }; }
    return parsePostfix();
  }
  function parsePostfix(){
    var e = parsePrimary();
    /* 括弧を省略した組み込み関数呼び出し（resetThreshold; や x = getTitle; など。ImageJ では組み込み関数の括弧は省略できる） */
    if (e.t === "var" && (funcByName(e.name) || Object.prototype.hasOwnProperty.call(SIM_OFFICIAL, e.name) || Object.prototype.hasOwnProperty.call(SIM_EXTRA, e.name))){
      var nt = peek();
      var blocked = nt.k === "op" && (nt.v === "(" || nt.v === "." || nt.v === "[" || nt.v === "++" || nt.v === "--" || nt.v === "=" || nt.v === "+=" || nt.v === "-=" || nt.v === "*=" || nt.v === "/=");
      if (!blocked) e = { t: "call", name: e.name, args: [], line: e.line, bare: 1 };
    }
    for (;;){
      var t = peek();
      if (t.k === "op" && t.v === "["){ next(); var ix = parseExpr(); expect("]"); e = { t: "index", obj: e, ix: ix, line: t.line }; continue; }
      if (t.k === "op" && t.v === "."){
        next(); var m = next(); if (m.k !== "id") throw simErr(m.line, "「.」の後に名前が必要です", "");
        if (m.v === "length" && !isOp("(")){ e = { t: "length", obj: e, line: t.line }; continue; }
        if (e.t === "var" && Object.prototype.hasOwnProperty.call(SIM_NS, e.name)){ e = { t: "path", parts: [e.name, m.v], line: t.line }; continue; }
        if (e.t === "path"){ e.parts.push(m.v); continue; }
        if (isOp("(")){
          next(); var margs = [];
          if (!isOp(")")){ for (;;){ margs.push(parseExpr()); if (isOp(",")){ next(); continue; } break; } }
          expect(")");
          e = { t: "mcall", obj: e, method: m.v, args: margs, line: t.line }; continue;
        }
        e = { t: "prop", obj: e, name: m.v, line: t.line }; continue;
      }
      if (t.k === "op" && t.v === "("){
        next(); var args = [];
        if (!isOp(")")){ for (;;){ args.push(parseExpr()); if (isOp(",")){ next(); continue; } break; } }
        expect(")");
        var name = null;
        if (e.t === "var") name = e.name; else if (e.t === "path") name = e.parts.join(".");
        if (name == null) throw simErr(t.line, "この呼び出しは解釈できませんでした", "関数名の後の引数リストにしてください。");
        e = { t: "call", name: name, args: args, line: t.line }; continue;
      }
      if (t.k === "op" && (t.v === "++" || t.v === "--")){ next(); e = { t: "post", op: t.v, e: e, line: t.line }; continue; }
      break;
    }
    return e;
  }
  function parsePrimary(){
    var t = next();
    if (t.k === "num") return { t: "num", v: t.v, line: t.line };
    if (t.k === "str") return { t: "str", v: t.v, line: t.line };
    if (t.k === "id"){
      if (t.v === "true") return { t: "num", v: 1, line: t.line };
      if (t.v === "false") return { t: "num", v: 0, line: t.line };
      if (Object.prototype.hasOwnProperty.call(KW, t.v)) throw simErr(t.line, "キーワード「" + t.v + "」の位置が不正です", "文の構造を確認してください。");
      return { t: "var", name: t.v, line: t.line };
    }
    if (t.k === "op" && t.v === "("){ var e = parseExpr(); expect(")"); return e; }
    throw simErr(t.line, "解釈できない式です（「" + (t.v || "文末") + "」の付近）", "式の書き方を確認してください。");
  }
  var prog = parseProgram(false);
  return prog;
}


/* --- モデル画像 --- */
function simDemoImage(){
  return { title: "demo.tif", w: 512, h: 512, bit: 8, channels: 1, slices: 1, frames: 1,
    slice: 1, buckets: [[0, 29, 52], [30, 99, 13], [100, 149, 9], [150, 199, 11], [200, 255, 15]],
    thr: null, mapOps: [], spatial: false, pix: {}, writtenPix: {}, kind: "グレースケール",
    /* 空間校正（D1）: [幅, 高さ, 奥行, 単位]。setVoxelSize で画像ごとに変わる */
    voxel: [1, 1, 1, "pixels"] };
}
function simImgMean(img){
  if (!img.buckets) return SIM_UNK;
  var m = 0; img.buckets.forEach(function(b){ m += (b[0] + b[1]) / 2 * b[2] / 100; });
  return m;
}
function simImgStd(img){
  if (!img.buckets) return SIM_UNK;
  var mean = simImgMean(img), v = 0;
  img.buckets.forEach(function(b){ var mid = (b[0] + b[1]) / 2; v += (mid - mean) * (mid - mean) * b[2] / 100 + (b[1] - b[0]) * (b[1] - b[0]) / 12 * b[2] / 100; });
  return Math.sqrt(v);
}
function simImgRange(img){
  if (!img.buckets) return null;
  return [img.buckets[0][0], img.buckets[img.buckets.length - 1][1]];
}
function simApplyOps(img, v){
  for (var i = 0; i < img.mapOps.length; i++){
    v = img.mapOps[i].f(v);
    if (img.bit === 8 || img.bit === 16){
      var mxv = Math.pow(2, img.bit) - 1;
      v = Math.round(v);
      if (v < 0) v = 0;
      if (v > mxv) v = mxv;
    }
  }
  return v;
}
function simImgRangeNow(img){ return simImgRange(img); }
/* 値変換を1つ適用：変化表用の合成列へ積み、分布（buckets）にも畳み込む */
function simPushOp(img, f){
  img.mapOps.push({ f: f });
  if (!img.buckets) return;
  img.buckets = img.buckets.map(function(b){
    var a = f(b[0]), c = f(b[1]);
    return [Math.min(a, c), Math.max(a, c), b[2]];
  }).sort(function(x, y){ return x[0] - y[0]; });
}
/* 画素値 lo..hi が全体に占める割合（%）。現在の値変換をサンプル点で近似する */
function simImgPct(img, lo, hi){
  if (!img.buckets) return SIM_UNK;
  var inside = 0, steps = 24;
  img.buckets.forEach(function(b){
    var hit = 0;
    for (var i = 0; i < steps; i++){
      var v = b[0] + (b[1] - b[0]) * (i + 0.5) / steps;
      if (v >= lo && v <= hi) hit++;
    }
    inside += b[2] * hit / steps;
  });
  return inside;
}
/* IJ_IsoData（ImageProcessor.getAutoThreshold と同一の反復法）。256 階調ヒストグラムに対する実装 */
function ijIsoDataHist(h0){
  var h = h0.slice();
  h[0] = 0; h[255] = 0;
  var min = 0; while (min < 255 && h[min] === 0) min++;
  var max = 255; while (max > 0 && h[max] === 0) max--;
  if (min >= max) return 128;
  var movingIndex = min, result = 0, guard = 0;
  do {
    var s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    for (var a = min; a <= movingIndex; a++){ s1 += a * h[a]; s2 += h[a]; }
    for (var b = movingIndex + 1; b <= max; b++){ s3 += b * h[b]; s4 += h[b]; }
    result = (s1 / s2 + s3 / s4) / 2;
    movingIndex++;
  } while ((movingIndex + 1) <= result && movingIndex < max - 1 && ++guard < 300);
  return Math.round(result);
}
/* Default 法：最頻値のピークをクリップしてから IJ_IsoData（AutoThresholder.defaultIsoData） */
function ijDefaultHist(h0){
  var h = h0.slice();
  var mode = 0;
  for (var i = 1; i < 256; i++) if (h[i] > h[mode]) mode = i;
  var maxCount2 = 0;
  for (var j = 0; j < 256; j++) if (j !== mode && h[j] > maxCount2) maxCount2 = h[j];
  if (h[mode] > maxCount2 * 2 && maxCount2 !== 0) h[mode] = Math.floor(maxCount2 * 1.5);
  return ijIsoDataHist(h);
}
/* IsoData 法（Ridler–Calvard の反復選択法、AutoThresholder.IsoData） */
function ijRidlerHist(h0){
  var h = h0, g = 0, i;
  for (i = 1; i < 256; i++){ if (h[i] > 0){ g = i + 1; break; } }
  for (;;){
    var l = 0, totl = 0, hh = 0, toth = 0;
    for (i = 0; i < g; i++){ totl += h[i]; l += h[i] * i; }
    for (i = g + 1; i < 256; i++){ toth += h[i]; hh += h[i] * i; }
    if (totl > 0 && toth > 0){
      l = Math.floor(l / totl); hh = Math.floor(hh / toth);
      if (g === Math.round((l + hh) / 2)) return g;
    }
    g++; if (g > 254) return -1; /* 片側が空でも続行し、上限では「閾値なし」になる（AutoThresholder.IsoData） */
  }
}
/* 画像の分布を 256 階調ヒストグラムにする（16/32bit は実際の値域を表示範囲として換算） */
function simHistNorm(img){
  if (!img.buckets) return null;
  if (img.bit === 8) return simHist256(img);
  var rg = simImgRange(img); if (!rg || rg[1] <= rg[0]) return null;
  var hist = new Array(256).fill(0), span = rg[1] - rg[0] + 1;
  img.buckets.forEach(function(b){
    var steps = Math.min(256, Math.max(1, b[1] - b[0] + 1));
    for (var i = 0; i < steps; i++){
      var v = b[0] + (b[1] - b[0]) * (steps === 1 ? 0 : i / (steps - 1));
      var bin = Math.max(0, Math.min(255, Math.floor((v - rg[0]) / span * 256)));
      hist[bin] += b[2] / steps;
    }
  });
  return hist;
}
function simGaussBlur1d(h, sigma){
  var r = Math.ceil(sigma * 3), kern = [], sum = 0, i, k;
  for (k = -r; k <= r; k++){ var w = Math.exp(-(k * k) / (2 * sigma * sigma)); kern.push(w); sum += w; }
  kern = kern.map(function(w){ return w / sum; });
  var out = new Array(h.length).fill(0);
  for (i = 0; i < h.length; i++){
    var acc = 0;
    for (k = -r; k <= r; k++){ var j = Math.max(0, Math.min(h.length - 1, i + k)); acc += h[j] * kern[k + r]; }
    out[i] = acc;
  }
  return out;
}
/* 引数なし setAutoThreshold / 閾値未設定の Convert to Mask が使う旧方式（ISODATA2）。
   ピークのクリップ＋IJ_IsoData で閾値を決め、平滑化したヒストグラムの最頻値の位置で前景の側を選ぶ */
function simIsodata2(img){
  var h0 = simHistNorm(img);
  if (!h0) return null;
  var t = ijDefaultHist(h0);
  var sm = simGaussBlur1d(h0, 2.0);
  var mode = 0, total = 0, i;
  for (i = 0; i < 256; i++){ total += sm[i]; if (sm[i] > sm[mode]) mode = i; }
  var avg = total / 256, min = 0, max = 255;
  while (min < 255 && h0[min] === 0) min++;
  while (max > 0 && h0[max] === 0) max--;
  var lo, hi;
  if (sm[mode] / avg > 1.5){
    if ((max - mode) > (mode - min)){ lo = t; hi = 255; } else { lo = 0; hi = t; }
  } else { lo = 0; hi = t; }
  if (img.bit === 8) return { lo: lo, hi: hi, t: t };
  var rg = simImgRange(img), span = rg[1] - rg[0] + 1;
  return { lo: Math.round(rg[0] + lo / 256 * span), hi: Math.round(rg[0] + hi / 256 * span), t: Math.round(rg[0] + t / 256 * span) };
}
function simIsoData(img){
  var h = simHistNorm(img);
  return h ? ijDefaultHist(h) : SIM_UNK;
}
function simOtsu(img){
  if (!img.buckets) return SIM_UNK;
  var hist = new Array(256).fill(0), total = 0;
  img.buckets.forEach(function(b){
    var per = b[2] / (b[1] - b[0] + 1);
    for (var v = b[0]; v <= b[1]; v++){ hist[v] += per; total += per; }
  });
  var sum = 0; for (var i = 0; i < 256; i++) sum += i * hist[i];
  var sumB = 0, wB = 0, best = -1, thr = 0;
  for (var t = 0; t < 256; t++){
    wB += hist[t]; if (!wB) continue;
    var wF = total - wB; if (!wF) break;
    sumB += t * hist[t];
    var mF = (sum - sumB) / wF, mB = sumB / wB;
    var between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best){ best = between; thr = t; }
  }
  return thr;
}
/* --- 静的チェック（未知の関数・引数の数・関数の重複など） --- */
var SIM_ARITY_OVERRIDE = { run: { min: 1, max: 2 }, print: { min: 0, max: Infinity }, log: { min: 0, max: Infinity }, newArray: { min: 0, max: Infinity }, exit: { min: 0, max: 1 }, getStatistics: { min: 1, max: 6 }, showMessage: { min: 1, max: 2 }, waitForUser: { min: 0, max: 2 }, call: { min: 1, max: Infinity },
  close: { min: 0, max: 2 }, open: { min: 0, max: 2 }, split: { min: 1, max: 2 }, parseInt: { min: 1, max: 2 }, getResult: { min: 1, max: 3 }, setThreshold: { min: 2, max: 3 }, setMinAndMax: { min: 2, max: 3 }, makeRectangle: { min: 4, max: 5 }, "Array.sort": { min: 1, max: 2 }, random: { min: 0, max: 2 }, indexOf: { min: 2, max: 3 }, substring: { min: 2, max: 3 }, setAutoThreshold: { min: 0, max: 1 }, saveAs: { min: 1, max: 2 }, makeLine: { min: 4, max: Infinity }, showProgress: { min: 1, max: 2 }, runMacro: { min: 1, max: 2 }, newImage: { min: 5, max: 7 }, setColor: { min: 1, max: 3 }, "Dialog.addNumber": { min: 2, max: 5 }, "Dialog.addString": { min: 2, max: 3 }, "Dialog.addChoice": { min: 2, max: 3 }, "Array.getStatistics": { min: 1, max: 5 }, getValue: { min: 1, max: 2 }, setForegroundColor: { min: 1, max: 3 }, "Roi.setStrokeColor": { min: 1, max: 3 }, "Roi.setFillColor": { min: 1, max: 3 }, "Roi.setPosition": { min: 1, max: 3 }, "Roi.setProperty": { min: 1, max: 2 }, getRawStatistics: { min: 1, max: 6 }, "Stack.getStatistics": { min: 1, max: 6 }, getPixelSize: { min: 3, max: 4 } };
function simArity(sig){
  var m = /\(([\s\S]*)\)/.exec(sig); if (!m) return null;
  var inner = m[1].trim(); if (!inner) return { min: 0, max: 0 };
  var variadic = /\.\.\./.test(inner);
  var reqPart = inner.replace(/\[[^\]]*\]/g, "");
  function cnt(s){
    if (!s.trim()) return 0;
    var d = 0, c = 1;
    for (var i = 0; i < s.length; i++){ var ch = s[i]; if (ch === "(" || ch === "[") d++; else if (ch === ")" || ch === "]") d--; else if (ch === "," && d === 0) c++; }
    return c;
  }
  return { min: cnt(reqPart.replace(/,\s*\.\.\./, "")), max: variadic ? Infinity : cnt(inner.replace(/\[|\]/g, "")) };
}
function simStaticChecks(prog, funcs){
  var diags = [];
  function walkExpr(e, line){
    if (!e) return;
    switch (e.t){
      case "call": {
        var name = e.name;
        var f = funcByName(name);
        if (name === "charAt" || name === "contains"){
          /* R23-N13: 関数形式は存在しない。引数個数ではなく真の原因を示す（実行時と同一文面） */
          diags.push({ sev: "err", line: e.line, text: name + " は関数形式では使えません", cause: "ImageJ に " + name + "(...) という関数はありません。文字列メソッド s." + name + "(...) の形式で使います。" });
        } else if (Object.prototype.hasOwnProperty.call(funcs, name)){
          if (e.args.length !== funcs[name].params.length)
            diags.push({ sev: "err", line: e.line, text: "関数 " + name + " の引数の数が違います", cause: "定義は " + funcs[name].params.length + " 個の引数ですが、" + e.args.length + " 個渡しています。" });
        } else if (!f && !Object.prototype.hasOwnProperty.call(SIM_EXTRA, name) && !Object.prototype.hasOwnProperty.call(SIM_OFFICIAL, name)){
          diags.push({ sev: "err", line: e.line, text: "「" + name + "」は定義されていない関数です", cause: "関数リファレンスにも、このコード内の function 定義にもありません。綴り違いか、定義のし忘れの可能性があります。ImageJ ではここでエラーになり止まります。" });
        } else if (f){
          var ar = SIM_ARITY_OVERRIDE[name] || simArity(f.sig);
          if (ar && (e.args.length < ar.min || e.args.length > ar.max))
            diags.push({ sev: "err", line: e.line, text: name + " の引数の数が違います", cause: "書式は " + f.sig + " で、引数は " + (ar.max === Infinity ? ar.min + " 個以上" : ar.min === ar.max ? ar.min + " 個" : ar.min + "〜" + ar.max + " 個") + "ですが、" + e.args.length + " 個渡しています。" });
        }
        e.args.forEach(function(a){ walkExpr(a, line); });
        break;
      }
      case "bin": case "logic": walkExpr(e.l, line); walkExpr(e.r, line); break;
      case "un": case "pre": case "post": walkExpr(e.e, line); break;
      case "assign": walkExpr(e.target, line); walkExpr(e.v, line); break;
      case "index": walkExpr(e.obj, line); walkExpr(e.ix, line); break;
      case "length": case "prop": walkExpr(e.obj, line); break;
      case "mcall": {
        var STR_METHODS = { length: 1, contains: 1, startsWith: 1, endsWith: 1, charAt: 1, indexOf: 1, lastIndexOf: 1, matches: 1, toUpperCase: 1, toLowerCase: 1, trim: 1, toString: 1, substring: 1, replace: 1, split: 1 };
        if (!STR_METHODS[e.method] && !funcByName(e.method) && !Object.prototype.hasOwnProperty.call(SIM_OFFICIAL, e.method) && !Object.prototype.hasOwnProperty.call(SIM_OFFICIAL, "Array." + e.method))
          diags.push({ sev: "err", line: e.line, text: "「" + e.method + "」は定義されていないメソッドです", cause: "ImageJ の文字列・配列メソッドにも存在しない名前です。綴り違いの可能性があります。ImageJ ではここでエラーになり止まります。" });
        walkExpr(e.obj, line);
        e.args.forEach(function(a){ walkExpr(a, line); });
        break;
      }
      case "tern": walkExpr(e.c, line); walkExpr(e.a, line); walkExpr(e.b, line); break;
    }
  }
  function walkStmt(st, inFunc, inLoop){
    switch (st.t){
      case "funcdef": break; /* 本体は呼び出し時に動的に見る */
      case "macroblock": break; /* 定義のみで本文は実行されないため、静的チェックも本体には踏み込まない（funcdef と同じ扱い） */
      case "expr": walkExpr(st.e, st.line); break;
      case "vardecl": st.decls.forEach(function(d){ walkExpr(d.init, st.line); }); break;
      case "block": st.body.forEach(function(s){ walkStmt(s, inFunc, inLoop); }); break;
      case "if": walkExpr(st.cond, st.line); walkStmt(st.then, inFunc, inLoop); if (st.els) walkStmt(st.els, inFunc, inLoop); break;
      case "for": walkExpr(st.init, st.line); walkExpr(st.cond, st.line); walkExpr(st.inc, st.line); walkStmt(st.body, inFunc, true); break;
      case "while": case "do": walkExpr(st.cond, st.line); walkStmt(st.body, inFunc, true); break;
      case "return": if (!inFunc) diags.push({ sev: "err", line: st.line, text: "return が関数の外にあります", cause: "return は function の中でのみ使えます。" }); walkExpr(st.v, st.line); break;
      case "break": case "continue": if (!inLoop) diags.push({ sev: "err", line: st.line, text: st.t + " が繰り返しの外にあります", cause: st.t + " は for / while の中でのみ使えます。" }); break;
    }
  }
  var fnNames = Object.create(null);
  prog.forEach(function(st){
    if (st.t === "funcdef"){
      if (fnNames[st.name]) diags.push({ sev: "warn", line: st.line, text: "関数 " + st.name + " が2回定義されています", cause: "ImageJ では後に定義した方で上書きされます。意図しない上書きに注意してください。" });
      fnNames[st.name] = 1;
    }
  });
  prog.forEach(function(st){ walkStmt(st, false, false); });
  return diags;
}


/* --- 式の短い表記（ステップ説明用） --- */
function simExprStr(e){
  if (!e) return "";
  switch (e.t){
    case "num": return simFmt(e.v);
    case "str": return "\"" + e.v + "\"";
    case "var": return e.name;
    case "path": return e.parts.join(".");
    case "length": return simExprStr(e.obj) + ".length";
    case "index": return simExprStr(e.obj) + "[" + simExprStr(e.ix) + "]";
    case "bin": case "logic": return simExprStr(e.l) + " " + e.op + " " + simExprStr(e.r);
    case "mcall": return simExprStr(e.obj) + "." + e.method + "(" + e.args.map(simExprStr).join(", ") + ")";
    case "prop": return simExprStr(e.obj) + "." + e.name;
    case "un": return e.op + simExprStr(e.e);
    case "pre": case "post": return e.op + simExprStr(e.e);
    case "assign": return simExprStr(e.target) + " " + e.op + " " + simExprStr(e.v);
    case "vardecl": return e.decls.map(function(d){ return "var " + d.name + (d.init ? " = " + simExprStr(d.init) : ""); }).join(", ");
    case "call": return e.bare && !e.args.length ? e.name : e.name + "(" + e.args.map(simExprStr).join(", ") + ")";
    case "tern": return simExprStr(e.c) + " ? … : …";
  }
  return "…";
}
/* --- 実行シミュレーション本体 --- */
function simRunProgram(code, forkCtl, model){
  var out = { diags: [], steps: [], log: [], logLines: [], vars: [], img: null, mapping: null, halted: false, premise: "" };
  var bc = pracCheck(code);
  if (bc){
    out.diags.push({ sev: "err", line: pracLine(code, bc.at), text: pracIssueText(code, bc), cause: "括弧や文字列が閉じていないと、ImageJ でも読み込めずエラーになります。まずここを直してください。" });
    return out;
  }
  var prog;
  try { prog = simParse(code); }
  catch (e){
    if (e && e.__simErr){ out.diags.push({ sev: "err", line: e.line, text: e.text, cause: e.cause }); return out; }
    throw e;
  }
  var funcs = Object.create(null);
  prog.forEach(function(st){ if (st.t === "funcdef") funcs[st.name] = st; });
  out.diags = simStaticChecks(prog, funcs);
  var S = {
    files: structuredClone(model?.files || {}), directories: structuredClone(model?.directories || {}), runtime: structuredClone(model?.runtime || {}),
    funcs: funcs, steps: out.steps, diags: out.diags, log: out.log, logLines: out.logLines,
    images: model?.images ? model.images.map(x=>({...simDemoImage(),...structuredClone(x),buckets:x.buckets??null,pix:x.pix??{},writtenPix:{},mapOps:[]})) : [simDemoImage()], active: 0, results: [], roi: null, roiList: [],
    batch: false, scopes: [Object.create(null)], globals: Object.create(null), suppress: 0, depth: 0,
    halt: false, divWarned: false, stepCap: false, budget: 300000,
    fork: forkCtl || null, forkIdx: 0, forkLabels: [], forkFilled: false,
    used: [], usedSet: Object.create(null)
  };
  /* その実行で実際に呼ばれた関数を出現順に記録する（「使用中の関数」表示の材料）。
     値メソッド（s.contains 等）は従来の静的抽出と同じく対象外。名前空間つき呼び出しは Array.sort の形で記録する */
  function noteUsed(name){ if (name && !S.usedSet[name]){ S.usedSet[name] = 1; S.used.push(name); } }
  function step(line, text){
    if (S.suppress > 0 || S.stepCap) return;
    if (S.steps.length >= 300){ S.stepCap = true; S.steps.push({ line: line, text: "（ステップが多いため、以降の説明は省略します）" }); return; }
    /* P-N2: 手順テキストは表示専用なので、長い値は省略記法つきで切り詰める */
    S.steps.push({ line: line, text: simTrunc(text), used:S.used.slice() });
  }
  function rwarn(line, text, cause){
    var d = { sev: "warn", line: line, text: text, cause: cause || "" };
    if (S.fork) d.rt = 1; /* パス列挙時は実行時診断として静的診断と分ける */
    S.diags.push(d);
  }
  /* 分岐パスの列挙：条件が実行時の値で決まる地点で、仮定の選び方を返す。
     forkCtl が無い通常実行では呼ばれない。ステップを抑制中（繰り返しの2回目以降など）は
     列挙対象にせず、従来どおり既定側（真）を返す。テープが尽きたら __needFork を投げて
     列挙側に分岐を要求する */
  function simFork(line, kind, condStr, trueText, falseText,value){
    if (!S.fork || S.suppress > 0) return true;
    var idx = S.forkIdx;
    if (idx < S.fork.tape.length){
      var ch = !!S.fork.tape[idx];
      S.forkIdx++;
      if(value){let domains=refineCondition(ijSymbol(value),ch,S.domains||[{}],()=>spendBudget(line));if(!domains.length)throw{__infeasible:1};S.domains=domains;}
      S.forkLabels.push({ line: line, kind: kind, cond: condStr, choice: ch, text: ch ? trueText : falseText });
      return ch;
    }
    if (S.fork.fill){
      S.forkIdx++; S.forkFilled = true;
      S.forkLabels.push({ line: line, kind: kind, cond: condStr, choice: true, text: trueText, filled: 1 });
      return true;
    }
    throw { __needFork: 1 };
  }
  function img(){ return S.active >= 0 ? S.images[S.active] : null; }
  function needImg(line, what){
    var im = img();
    if (!im) throw simErr(line, what + " には画像が必要ですが、開かれている画像がありません", "open で画像を開くか、画像を開いた状態で実行する前提にしてください。ImageJ ではここでエラーになり止まります。");
    return im;
  }
  function readVar(node){
    var name = node.name;
    if (name === "PI") return Math.PI;
    if (name === "nImages") return S.images.length;
    if (name === "nSlices"){ var im = img(); return im ? im.slices : 0; }
    if (name === "nResults") return S.results.length;
    var frame = S.scopes[S.scopes.length - 1];
    if (Object.prototype.hasOwnProperty.call(frame, name)) return frame[name];
    if (Object.prototype.hasOwnProperty.call(S.globals, name)) return S.globals[name];
    throw simErr(node.line, "変数 " + name + " は、まだ値が代入されていません", "ImageJ では「Undefined variable」というエラーで止まります。関数の中からは、引数・その関数の中で作った変数・var で宣言した全体変数だけが見えます。");
  }
  function writeVar(name, v){
    if (name === "PI" || name === "nImages" || name === "nSlices" || name === "nResults")
      throw simErr(0, name + " は組み込みの名前で、代入できません", "別の変数名を使ってください。");
    var frame = S.scopes[S.scopes.length - 1];
    if (Object.prototype.hasOwnProperty.call(frame, name)){ frame[name] = v; return; }
    if (Object.prototype.hasOwnProperty.call(S.globals, name)){ S.globals[name] = v; return; }
    frame[name] = v; /* 新しい変数は今の範囲（関数の中ならその関数の中だけ）に作られる（ImageJ の仕様） */
  }
  S.writeVar = writeVar;
  function spendBudget(line){
    if (--S.budget < 0) throw simErr(line || 0, "処理の回数が多すぎるため、途中で止めました", "無限ループか、大きすぎる二重の繰り返しの可能性があります。ImageJ でも同じように長時間止まらなくなります。");
  }
  S.spend = spendBudget;
  function truthy(v){
    if (simIsUnk(v)) return null;
    if (typeof v === "string") return v.length > 0;
    return !!v && v !== 0;
  }
  function num(v, line){
    if (simIsUnk(v)) return SIM_UNK;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "string"){ var x = parseFloat(v); if (!isNaN(x) && v.trim() !== "") return x; }
    throw simErr(line || 0, "数値が必要な場所で、数値でない値が使われています", "文字列の連結には + を、計算には数値を使ってください。");
  }
  function ev(e){ return evExpr(e); }
  /* 代入の右辺の型は、ImageJ では右辺の先頭で決まる（Interpreter.getExpressionType）。
     先頭が文字列なら文字列文脈（+ は連結）、数値なら数値文脈（文字列は数値として解釈され、できなければ NaN）。
     mode: undefined=従来（関数引数など。+ は連結）, 0=数値文脈, 1=文字列文脈 */
  var SIM_STRFNS = { getString: 1, getTitle: 1, getInfo: 1, getArgument: 1, getVersion: 1, substring: 1, replace: 1, d2s: 1, toString: 1, fromCharCode: 1, "String.join": 1, "String.trim": 1, "Dialog.getString": 1, "List.get": 1, toLowerCase: 1, toUpperCase: 1, trim: 1 };
  var SIM_STR_METHODS = { substring: 1, replace: 1, replaceAll: 1, toUpperCase: 1, toLowerCase: 1, trim: 1, toString: 1 };
  /* 文字列文脈かどうかの推測評価（添字式の実評価）で、副作用のある形を実行しないための検査。
     関数呼び出し・増減・代入を含む式を判定のためだけに実行すると、本来1回だけの実行が
     二重になり、ステップ・出力・状態変化が余分に現れる（NX-N7 と同根）。その場合は
     評価せず、従来の例外時と同じく「文字列ではない」側に倒す */
  function simProbeSafe(node){
    if (!node || typeof node !== "object") return true;
    if (node.t === "call" || node.t === "pre" || node.t === "post" || node.t === "assign") return false;
    var keys = ["l", "r", "e", "obj", "ix", "c", "a", "b", "v", "target"];
    for (var i = 0; i < keys.length; i++){ if (!simProbeSafe(node[keys[i]])) return false; }
    if (Array.isArray(node.args) && !node.args.every(simProbeSafe)) return false;
    return true;
  }
  function simStartsStringy(node){
    var n = node;
    for (;;){
      if (!n) return false;
      if (n.t === "str") return true;
      if (n.t === "bin" && n.op === "+"){ n = n.l; continue; }
      if (n.t === "tern") return simStartsStringy(n.a) || simStartsStringy(n.b);
      if (n.t === "var"){ try { return typeof readVar(n) === "string"; } catch (err) { return false; } }
      if (n.t === "call") return !!SIM_STRFNS[n.name];
      if (n.t === "mcall") return !!SIM_STR_METHODS[n.method]; /* 文字列を返すメソッドだけが文字列代入になる（contains 等は数値代入で 1/0） */
      if (n.t === "path") return n.parts.join(".") === "File.separator";
      if (n.t === "index"){ if (!simProbeSafe(n)) return false; try { return typeof evExpr(n, 0) === "string"; } catch (err) { return false; } }
      return false;
    }
  }
  function simTreeStringy(node){
    var found = false;
    (function walk(x){
      if (!x || found || typeof x !== "object") return;
      if (x.t === "str" || x.t === "mcall"){ found = true; return; }
      if (x.t === "call" && SIM_STRFNS[x.name]){ found = true; return; }
      ["l", "r", "e", "obj", "ix", "c", "a", "b", "v", "target"].forEach(function(k){ walk(x[k]); });
      if (Array.isArray(x.args)) x.args.forEach(walk);
    })(node);
    return found;
  }
  /* Java のユーザー関数戻り値の文字列化（getStringTerm の USER_FUNCTION 分岐）：
     整数値は IJ.d2s(value, 0)、それ以外は "" + value（全桁） */
  function simJavaDoubleStr(v){
    if (typeof v !== "number") return simFmt(v);
    if (v !== v) return "NaN";
    if (!isFinite(v)) return v > 0 ? "Infinity" : "-Infinity";
    if (Number.isInteger(v)) return Math.abs(v) < 1e15 ? String(v) : simFmtNum(v);
    var s = String(v), ei = s.indexOf("e");
    if (ei >= 0){ var mant = s.slice(0, ei), ex = s.slice(ei + 1).replace(/^\+/, ""); if (mant.indexOf(".") < 0) mant += ".0"; return mant + "E" + ex; }
    return s;
  }
  /* 文字列文脈で「文字列の項」になるかどうか（getStringTerm が文字列として扱う形か。ユーザー関数も含む） */
  function simTermStringy(t){
    if (!t) return false;
    if (t.t === "str" || t.t === "mcall") return true;
    if (t.t === "var"){ try { return typeof readVar(t) === "string"; } catch (err) { return false; } }
    if (t.t === "call") return !!SIM_STRFNS[t.name] || Object.prototype.hasOwnProperty.call(S.funcs, t.name);
    if (t.t === "path") return t.parts.join(".") === "File.separator";
    if (t.t === "index"){ if (!simProbeSafe(t)) return false; try { return typeof evExpr(t, 0) === "string"; } catch (err) { return false; } }
    return simTreeStringy(t);
  }
  /* 数値ラン（getStringExpression）を止める形か。文字列リテラル・文字列関数・文字列変数の手前でランは止まる。
     ユーザー関数はランを止めない（数値として取り込まれる） */
  function simStringForm(t){
    if (!t) return false;
    if (t.t === "str" || t.t === "mcall") return true;
    if (t.t === "var"){ try { return typeof readVar(t) === "string"; } catch (err) { return false; } }
    if (t.t === "call") return !!SIM_STRFNS[t.name];
    if (t.t === "path") return t.parts.join(".") === "File.separator";
    if (t.t === "index"){ if (!simProbeSafe(t)) return false; try { return typeof evExpr(t, 0) === "string"; } catch (err) { return false; } }
    return simTreeStringy(t);
  }
  /* 文字列文脈の + 連結（getString / getStringTerm / getStringExpression 相当）：
     文字列の項の位置では文字列として取り、間の数値の項はランとして合計してから文字列化する */
  function evConcat(e){
    var terms = [], node = e;
    while (node.t === "bin" && node.op === "+"){ terms.unshift(node.r); node = node.l; }
    terms.unshift(node);
    var out = "", i = 0;
    while (i < terms.length){
      var t = terms[i];
      if (simTermStringy(t)){
        var sv = evExpr(t, 1);
        if (simIsUnk(sv)) return SIM_UNK;
        var termText = (t.t === "call" && Object.prototype.hasOwnProperty.call(S.funcs, t.name) && typeof sv === "number") ? simJavaDoubleStr(sv) : simFmt(sv);
        /* P-N1: 文字列文脈の連結も、項を足す前に累積長を検査する */
        if (out.length + termText.length > SIM_VALUE_LIMIT) return SIM_UNK;
        out += termText;
        i++;
      } else {
        var run = null;
        while (i < terms.length && !simStringForm(terms[i])){
          var nv = evExpr(terms[i], 0);
          if (simIsUnk(nv)) return SIM_UNK;
          if (typeof nv === "string") nv = simParseDouble(nv);
          if (typeof nv !== "number") return SIM_UNK;
          run = run === null ? nv : run + nv;
          i++;
        }
        out += simFmtNum(run);
      }
    }
    return out;
  }
  function evExpr(e, mode){
    switch (e.t){
      case "num": return e.v;
      case "str": return e.v;
      case "var": return readVar(e);
      case "length": {
        var o = evExpr(e.obj);
        if (simIsUnk(o)) return SIM_UNK;
        if (Array.isArray(o) || typeof o === "string") return o.length;
        throw simErr(e.line, ".length は配列か文字列にだけ使えます", "");
      }
      case "index": {
        var ob = evExpr(e.obj), ix = evExpr(e.ix, 0);
        if (simIsUnk(ob) || simIsUnk(ix)) return SIM_UNK;
        ix = simInt(num(ix, e.line)); /* 添字は (int) 切捨て変換される。小数の添字で undefined を読んだり負方向へずれたりしない */
        if (Array.isArray(ob)){
          if (ix < 0 || ix >= ob.length) throw simErr(e.line, "配列の範囲外（" + ix + "）を読もうとしています", "配列の要素数は " + ob.length + " で、番号は 0〜" + (ob.length - 1) + " です。ImageJ ではここでエラーになり止まります。");
          return ob[ix];
        }
        return SIM_UNK;
      }
      case "un": {
        var u = evExpr(e.e, 0);
        if (e.op === "!"){
          if (simIsUnk(u)) return SIM_UNK;
          if (u === 0 || u === 1) return u === 0 ? 1 : 0;
          throw simErr(e.line, "「!」の相手が 0 か 1 になっていません（値：" + simFmt(u) + "）", "ImageJ では「!」は真偽値にだけ使え、0 か 1 でない値では \"Boolean expected\" エラーになります。");
        }
        var un = num(u, e.line); return simIsUnk(un) ? SIM_UNK : (e.op === "-" ? -un : e.op === "~" ? ~un : un);
      }
      case "logic": {
        /* ImageJ の && / || : 短絡評価せず両辺を必ず評価し、両辺とも 0 か 1 でなければエラー */
        var ll = evExpr(e.l, 0), lr = evExpr(e.r, 0);
        if (simIsUnk(ll) || simIsUnk(lr)) return SIM_UNK;
        if (ll !== 0 && ll !== 1) throw simErr(e.line, "「" + e.op + "」の左辺が 0 か 1 になっていません（値：" + simFmt(ll) + "）", "ImageJ では && / || の両辺は真偽値（0 か 1）でなければエラーになります。短絡評価もしないため、右辺は左辺の結果にかかわらず必ず評価されます。");
        if (lr !== 0 && lr !== 1) throw simErr(e.line, "「" + e.op + "」の右辺が 0 か 1 になっていません（値：" + simFmt(lr) + "）", "ImageJ では && / || の両辺は真偽値（0 か 1）でなければエラーになります。短絡評価もしないため、右辺は左辺の結果にかかわらず必ず評価されます。");
        return e.op === "&&" ? (ll & lr) : (ll | lr);
      }
      case "path": {
        if (e.parts.join(".") === "File.separator") return "/";
        return SIM_UNK;
      }
      case "prop": return SIM_UNK;
      case "mcall": return evMethod(e, mode);
      case "pre": case "post": {
        var tgt = e.e, cur = evExpr(tgt), nn = num(cur, e.line);
        if (simIsUnk(nn)) return SIM_UNK;
        var nv = nn + (e.op === "++" ? 1 : -1);
        setTarget(tgt, nv, e.line);
        return e.t === "pre" ? nv : nn;
      }
      case "bin": {
        if (mode === 1 && e.op === "+") return evConcat(e);
        return evBin(e, mode);
      }
      case "tern": {
        if (e.a.t === "str" || e.b.t === "str"){
          /* 文字列の三項演算子は代入文の中でのみ可（1.54u9 以降、doTernaryStringAssignment） */
          if (mode !== 1) throw simErr(e.line, "文字列を返す三項演算子は、代入文の中でのみ使えます", "ImageJ 1.54u9 以降、文字列の三項演算子は代入文に限り使えます。式の中では \"String operands not supported\" エラーになります。");
          var cs = truthy(evExpr(e.c, 0));
          if (cs === null) return SIM_UNK;
          return evExpr(cs ? e.a : e.b, 1);
        }
        var c = truthy(evExpr(e.c, 0));
        if (c === null) return SIM_UNK;
        /* 三項演算子は選ばれた側だけを評価する（実 ImageJ の意味論）。
           選ばれなかった側の関数実行・出力・副作用・エラーは一切現れない */
        var sel = evExpr(c ? e.a : e.b, 0);
        return typeof sel === "string" ? SIM_UNK : sel;
      }
      case "assign": {
        var isComp = e.op !== "=";
        var curFirst = null;
        if (isComp && e.target.t === "index"){
          /* 複合代入でも要素代入と同じく、範囲外なら先に配列が拡張されてから読み取る（doArrayElementAssignment） */
          var ob0 = evExpr(e.target.obj), ix0 = simInt(num(evExpr(e.target.ix), e.line));
          if (Array.isArray(ob0) && ix0 >= 0 && ix0 >= ob0.length){ expandArr(ob0, ix0, e.line); curFirst = ob0[ix0]; }
          else curFirst = evExpr(e.target);
        } else if (isComp) curFirst = evExpr(e.target); /* 複合代入は右辺の評価より前に左辺の値を読む（getAssignmentExpression） */
        var rv = evExpr(e.v, isComp ? 0 : (simStartsStringy(e.v) ? 1 : 0));
        if (isComp) rv = evBin({ t: "bin", op: e.op.charAt(0), l: { t: "lit", v: curFirst }, r: { t: "lit", v: rv }, line: e.line }, 0);
        setTarget(e.target, rv, e.line);
        return rv;
      }
      case "call": return evCall(e);
    }
    if (e.t === "lit") return e.v;
    throw simErr(e.line || 0, "この式は解釈できませんでした", "対応していない構文のため、説明を省略します。");
  }
  /* 範囲外の要素代入では配列が自動拡張される（Interpreter.doArrayElementAssignment、expandableArrays の既定は有効）。
     拡張された要素は、数値配列では NaN、文字列配列（先頭要素が文字列）では文字列 "undefined" で埋まる。 */
  function expandArr(ob, ix, line){
    /* P-N1: 範囲外代入による自動拡張も値の大きさの上限の対象にする。
       巨大な添字で配列実体を爆発させず、理由を明示して停止する。 */
    if (ix >= SIM_VALUE_LIMIT)
      throw simErr(line || 0, "配列の要素数が上限（" + SIM_VALUE_LIMIT + "）を超えます", "添字 " + ix + " への代入で配列を拡張すると要素数が上限を超えるため、ここで停止します。");
    var fill = (ob.length > 0 && typeof ob[0] === "string") ? "undefined" : NaN;
    for (var k = ob.length; k <= ix; k++) ob[k] = fill;
  }
  function setTarget(tgt, v, line){if(simIsUnk(v)&&!v.__id&&!v.symbolic)v={__unk:1,__id:'ij-'+(++imageUnknownId)};
    if (tgt.t === "var"){ writeVar(tgt.name, v); return; }
    if (tgt.t === "index"){
      var ob = evExpr(tgt.obj), ix = simInt(num(evExpr(tgt.ix), line)); /* 代入先の添字も (int) 切捨て変換される。小数の添字へ書いて要素が消えることはない */
      if (!Array.isArray(ob)) throw simErr(line, "配列でないものに要素代入はできません", "");
      if (ix < 0) throw simErr(line, "配列へ負の番号（" + ix + "）で代入しようとしています", "ImageJ ではここでエラーになり止まります。");
      if (ix >= ob.length) expandArr(ob, ix, line);
      ob[ix] = v; return;
    }
    throw simErr(line, "代入先が不正です", "");
  }
  function evBin(e, mode){
    /* 左に深い木（長い演算子の連鎖）を反復で畳み、再帰が溢れないようにする */
    var spine = [], node = e;
    while (node.t === "bin"){ spine.push(node); node = node.l; }
    var acc = evExpr(node, mode);
    for (var si = spine.length - 1; si >= 0; si--) acc = evBinOp(spine[si], acc, evExpr(spine[si].r, mode), mode);
    return acc;
  }
  function evBinOp(e, l, r, mode){if(simIsUnk(l)||simIsUnk(r))return{__unk:1,symbolic:{kind:'unknown',op:e.op,a:ijSymbol(l),b:ijSymbol(r)}};
    if (e.op === "+"){
      if (mode === 0){
        /* 数値文脈の + ：文字列は数値として解釈され、解釈できなければ NaN（Interpreter の getFactor） */
        if (simIsUnk(l) || simIsUnk(r)) return SIM_UNK;
        var q1 = typeof l === "string" ? simParseDouble(l) : l, q2 = typeof r === "string" ? simParseDouble(r) : r;
        if (typeof q1 !== "number" || typeof q2 !== "number") return SIM_UNK;
        return q1 + q2;
      }
      if (typeof l === "string" || typeof r === "string"){
        if (simIsUnk(l) || simIsUnk(r)) return SIM_UNK;
        /* P-N1: 連結結果が上限を超える場合は実体を作らず未確定値へ倒す */
        var ls = simFmt(l), rs = simFmt(r);
        if (ls.length + rs.length > SIM_VALUE_LIMIT) return SIM_UNK;
        return ls + rs;
      }
      var a1 = num(l, e.line), a2 = num(r, e.line);
      return (simIsUnk(a1) || simIsUnk(a2)) ? SIM_UNK : a1 + a2;
    }
    if (typeof l === "string" && typeof r === "string" && ["==", "!=", "<", "<=", ">", ">="].indexOf(e.op) >= 0){
      var cl = l.toLowerCase(), cr = r.toLowerCase();
      var cmp = cl < cr ? -1 : cl > cr ? 1 : 0;
      switch (e.op){
        case "==": return cmp === 0 ? 1 : 0;
        case "!=": return cmp !== 0 ? 1 : 0;
        case "<": return cmp < 0 ? 1 : 0;
        case "<=": return cmp <= 0 ? 1 : 0;
        case ">": return cmp > 0 ? 1 : 0;
        case ">=": return cmp >= 0 ? 1 : 0;
      }
    }
    if (e.op === "==" || e.op === "!="){
      if (simIsUnk(l) || simIsUnk(r)) return SIM_UNK;
      var eq = (typeof l === "string" || typeof r === "string") ? String(l) === String(r) : num(l, e.line) === num(r, e.line);
      return (e.op === "==") === eq ? 1 : 0;
    }
    var x = num(l, e.line), y = num(r, e.line);
    if (simIsUnk(x) || simIsUnk(y)) return SIM_UNK;
    switch (e.op){
      case "&": return x & y;
      case "|": return x | y;
      case "^": return x ^ y;
      case "<<": return x << y;
      case ">>": return x >> y;
      case "-": return x - y;
      case "*": return x * y;
      case "/":
        if (y === 0 && !S.divWarned){ S.divWarned = true; rwarn(e.line, "0 で割り算しています", "ImageJ では結果が Infinity（または NaN）になり、そのまま計算が進みます。意図した割り算か確認してください。"); }
        return x / y;
      case "%": return x % y;
      case "<": return x < y ? 1 : 0;
      case "<=": return x <= y ? 1 : 0;
      case ">": return x > y ? 1 : 0;
      case ">=": return x >= y ? 1 : 0;
    }
    return SIM_UNK;
  }
  /* 文字列メソッド呼び出し（s.contains(...) など。ImageJ では文字列関数の第1引数にレシーバが入る）。
     文字列文脈（mode=1、print の引数や文字列代入）では runStringFunction の形（contains→"true"、charAt→その文字）を返す */
  function evMethod(e, mode){
    var o = evExpr(e.obj);
    if (simIsUnk(o)) return SIM_UNK;
    var m = e.method;
    var av = e.args.map(function(a){ return evExpr(a); });
    if (typeof o === "string"){
      /* D3 の兄弟表面: 文字列メソッドの引数個数の誤りも、黙って読み飛ばさず止める */
      var M_ARITY = { contains: [1, 1], startsWith: [1, 1], endsWith: [1, 1], charAt: [1, 1], indexOf: [1, 2], lastIndexOf: [1, 1], matches: [1, 1], toUpperCase: [0, 0], toLowerCase: [0, 0], trim: [0, 0], toString: [0, 0], substring: [1, 2], replace: [2, 2], split: [0, 1] };
      if (M_ARITY[m] && (av.length < M_ARITY[m][0] || av.length > M_ARITY[m][1]))
        throw simErr(e.line, "メソッド " + m + " の引数の数が違います", "文字列メソッド s." + m + "(...) の引数は " + (M_ARITY[m][0] === M_ARITY[m][1] ? M_ARITY[m][0] + " 個" : M_ARITY[m][0] + "〜" + M_ARITY[m][1] + " 個") + "ですが、" + av.length + " 個渡しています。");
      switch (m){
        case "length": return o.length;
        case "contains": { var has = o.indexOf(String(av[0])) >= 0; return mode === 1 ? (has ? "true" : "false") : (has ? 1 : 0); }
        case "startsWith": { var sw = o.indexOf(String(av[0])) === 0; return mode === 1 ? (sw ? "true" : "false") : (sw ? 1 : 0); }
        case "endsWith": { var suf = String(av[0]); var ew = suf === "" ? true : o.slice(-suf.length) === suf; return mode === 1 ? (ew ? "true" : "false") : (ew ? 1 : 0); }
        case "charAt": { var ci = simInt(num(av[0], e.line)); if (simIsUnk(ci)) return SIM_UNK; if (ci < 0 || ci >= o.length) throw simErr(e.line, "charAt の位置（" + ci + "）が文字列の長さ（" + o.length + "）を超えています", "ImageJ ではここでエラーになり止まります。"); return mode === 1 ? o.charAt(ci) : o.charCodeAt(ci); }
        case "indexOf": return o.indexOf(String(av[0]), typeof simNumArg(av[1]) === "number" ? simInt(simNumArg(av[1])) : 0);
        case "lastIndexOf": return o.lastIndexOf(String(av[0]));
        case "matches": { try { var mt = new RegExp("^(?:" + String(av[0]) + ")$").test(o); return mode === 1 ? (mt ? "true" : "false") : (mt ? 1 : 0); } catch (ex2) { return SIM_UNK; } }
        case "toUpperCase": return o.toUpperCase();
        case "toLowerCase": return o.toLowerCase();
        case "trim": return o.trim();
        case "toString": return o;
        case "substring": {
          /* R25-N22: メソッド形も関数形と同じく、位置の文字列数値を数値として解釈する */
          var bi = typeof simNumArg(av[0]) === "number" ? simInt(simNumArg(av[0])) : av[0], bj = av.length > 1 ? (typeof simNumArg(av[1]) === "number" ? simInt(simNumArg(av[1])) : av[1]) : o.length;
          if (typeof bi !== "number" || typeof bj !== "number" || bi < 0 || bj < bi || bj > o.length)
            throw simErr(e.line, "substring の範囲（" + bi + "〜" + bj + "）が文字列の長さ（" + o.length + "）を超えています", "ImageJ ではここでエラーになり止まります。lengthOf で長さを確認してください。");
          return o.substring(bi, bj);
        }
        case "replace": return simReplaceStr(o, av[0], av[1]);
        case "split": return simSplitStr(o, av.length ? av[0] : undefined, e.line);
      }
      if (Object.prototype.hasOwnProperty.call(SIM_OFFICIAL, m) || funcByName(m)) throw simErr(e.line, "未確認：文字列メソッド " + m + " はモデルで未対応です", "後続結果は生成しません。");
      throw simErr(e.line, "「" + m + "」は文字列に使えないメソッドです", "ImageJ にも存在しない名前です。綴り違いの可能性があります。");
    }
    if (Array.isArray(o)){
      if (m === "length") return o.length;
      if (Object.prototype.hasOwnProperty.call(SIM_OFFICIAL, "Array." + m)) throw simErr(e.line, "未確認：配列メソッド Array." + m + " はモデルで未対応です", "変更後の配列を推測しません。");
      throw simErr(e.line, "「" + m + "」は配列に使えないメソッドです", "ImageJ にも存在しない名前です。綴り違いの可能性があります。");
    }
    return SIM_UNK;
  }
  /* 変数名で値を受け取る組み込み関数 */
  var REF_FNS = { getThreshold: 99, getMinAndMax: 99, getStatistics: 99, getHistogram: 2, getDimensions: 99, getVoxelSize: 99, getSelectionBounds: 99, getBoundingRect: 99, "Stack.getDimensions": 99, "Stack.getPosition": 99, "Color.getLut": 99, getRawStatistics: 99, getPixelSize: 99, getCursorLoc: 99, getLine: 99, getSelectionCoordinates: 99, getLut: 99, getDateAndTime: 99, getLocationAndSize: 99, getDisplayedArea: 99, "Roi.getBounds": 99, "Roi.getCoordinates": 99, "Roi.getPosition": 99, "Stack.getStatistics": 99 };
  var REF_FNS_SKIP = { "Array.getStatistics": 1 };
  function evCall(e){
    var name = e.name;
    noteUsed(name);
    /* R23-N13: 関数形式が存在しない名前は、引数個数ではなく「真の原因」で止める。
       静的診断と同一文面にし、到達した場合は実行時エラーが優先される（重複排除） */
    if (name === "charAt" || name === "contains")
      throw simErr(e.line, name + " は関数形式では使えません", "ImageJ に " + name + "(...) という関数はありません。文字列メソッド s." + name + "(...) の形式で使います。");
    /* D3: 引数の数の誤りは、その呼び出しの実行時点でエラーとして止める。
       静的診断だけではエラー表示後も実行が続き、誤った結果が表示されてしまうため */
    if (Object.prototype.hasOwnProperty.call(S.funcs, name)){
      var ufn = S.funcs[name];
      if (e.args.length !== ufn.params.length)
        throw simErr(e.line, "関数 " + name + " の引数の数が違います", "定義は " + ufn.params.length + " 個の引数ですが、" + e.args.length + " 個渡しています。");
    } else {
      var fAr = funcByName(name);
      if (fAr){
        var arR = SIM_ARITY_OVERRIDE[name] || simArity(fAr.sig);
        if (arR && (e.args.length < arR.min || e.args.length > arR.max))
          throw simErr(e.line, name + " の引数の数が違います", "書式は " + fAr.sig + " で、引数は " + (arR.max === Infinity ? arR.min + " 個以上" : arR.min === arR.max ? arR.min + " 個" : arR.min + "〜" + arR.max + " 個") + "ですが、" + e.args.length + " 個渡しています。");
      }
    }
    if (Object.prototype.hasOwnProperty.call(S.funcs, name)){
      var fn = S.funcs[name];
      var vals = e.args.map(function(a){ return evExpr(a); });
      if (S.depth >= 50) throw simErr(e.line, "関数 " + name + " の呼び出しが深すぎます", "自分自身を呼び続ける無限再帰の可能性があります。");
      step(e.line, "関数 " + name + "(" + vals.map(simFmt).join(", ") + ") を実行します");
      spendBudget(e.line);
      var scope = Object.create(null);
      fn.params.forEach(function(p, i){ scope[p] = i < vals.length ? vals[i] : SIM_UNK; });
      S.scopes.push(scope); S.depth++;
      var ret = SIM_UNK;
      try { execBlock(fn.body); }
      catch (ex){ if (ex && ex.__ret){ ret = ex.v; } else throw ex; }
      S.scopes.pop(); S.depth--;
      step(e.line, name + " の結果：" + simFmt(ret) + " が返ります");
      return ret;
    }
    var argVals = [], argRefs = [];
    e.args.forEach(function(a, i){
      var isRef = (Object.prototype.hasOwnProperty.call(REF_FNS, name) && i < REF_FNS[name]) ||
        (Object.prototype.hasOwnProperty.call(REF_FNS_SKIP, name) && i >= REF_FNS_SKIP[name]);
      if (isRef && a.t === "var"){ argRefs[i] = a.name; argVals[i] = null; }
      else if (name === "print"){
        /* print の引数は文字列文脈（getStringExpression）。ユーザー関数の戻り値は Java の "" + value の全桁表示になる */
        var pv = evExpr(a, 1);
        if (a.t === "call" && Object.prototype.hasOwnProperty.call(S.funcs, a.name) && typeof pv === "number") pv = simJavaDoubleStr(pv);
        argRefs[i] = null; argVals[i] = pv;
      }
      else { argRefs[i] = null; argVals[i] = evExpr(a); }
    });
    return simBuiltin(S, e, argVals, argRefs, { step: step, warn: rwarn, img: img, needImg: needImg, num: num, truthy: truthy });
  }
  function execVarDecl(st){
    var top = S.scopes.length === 1;
    st.decls.forEach(function(d){
      var v = d.init ? evExpr(d.init, simStartsStringy(d.init) ? 1 : 0) : 0;
      if (top) S.globals[d.name] = v;
      else S.scopes[S.scopes.length - 1][d.name] = v;
      step(st.line, "変数 " + d.name + " を宣言して " + simFmt(v) + " を入れます" + (top ? "（var で宣言した変数は全体変数として、関数の中からも見えます）" : "（この関数の中だけの変数です）"));
    });
  }
  function execBlock(stmts){ for (var i = 0; i < stmts.length; i++) execStmt(stmts[i]); }
  function execStmt(st){
    if (S.halt) return;
    switch (st.t){
      case "funcdef": return;
      case "macroblock": step(st.line, "マクロ「" + (st.name || "（名前なし）") + "」を定義として登録します（本文は実行されません。メニュー等から選ばれたときに実行されます）"); return;
      case "vardecl": execVarDecl(st); return;
      case "block": execBlock(st.body); return;
      case "expr": {
        var v = evExpr(st.e);
        if (st.e.t === "assign" && st.e.target.t === "var")
          step(st.line, st.e.target.name + " に " + simFmt(v) + " を代入します");
        else if (st.e.t === "assign" && st.e.target.t === "index")
          step(st.line, simExprStr(st.e.target) + " に " + simFmt(v) + " を代入します");
        return;
      }
      case "if": {
        var conditionValue=evExpr(st.cond),c = condBool(conditionValue, st.line);
        if (c === null){
          if (!S.fork){
            step(st.line, "条件（" + simExprStr(st.cond) + "）は実行時の値で決まります。ここでは「真」の側で説明します");
            execStmt(st.then);
          } else {
            var ich = simFork(st.line, "if", simExprStr(st.cond), "真", "偽",conditionValue);
            if (ich){ step(st.line, "条件（" + simExprStr(st.cond) + "）は実行時の値で決まります。このパスでは「真」と仮定して、中身を実行します"); execStmt(st.then); }
            else if (st.els){ step(st.line, "条件（" + simExprStr(st.cond) + "）は実行時の値で決まります。このパスでは「偽」と仮定して、else 側を実行します"); execStmt(st.els); }
            else step(st.line, "条件（" + simExprStr(st.cond) + "）は実行時の値で決まります。このパスでは「偽」と仮定して、中身は実行されません");
          }
        } else {
          step(st.line, "条件（" + simExprStr(st.cond) + "）は" + (c ? "真" : "偽") + " → " + (c ? "中身を実行します" : st.els ? "else 側を実行します" : "中身は実行されません"));
          if (c) execStmt(st.then); else if (st.els) execStmt(st.els);
        }
        return;
      }
      case "for": case "while": case "do": execLoop(st); return;
      case "return": throw { __ret: 1, v: st.v ? evExpr(st.v, simStartsStringy(st.v) ? 1 : 0) : SIM_UNK };
      case "break": throw { __brk: 1 };
      case "continue": throw { __cnt: 1 };
    }
  }
  function execLoop(st){
    var isDo = st.t === "do", count = 0, unkUsed = false, unfinished = false;
    S.suppress++;
    try { if (st.init){ if (st.init.t === "vardecl") execVarDecl(st.init); else evExpr(st.init); } } finally { S.suppress--; }
    step(st.line, (st.t === "for" ? "for" : st.t) + " の繰り返しに入ります" + (st.init ? "（" + simExprStr(st.init) + "）" : ""));
    for (;;){
      var go = true;
      if (!isDo || count > 0){
        if (st.cond){ var conditionValue=evExpr(st.cond),c = condBool(conditionValue, st.line);
          if (c === null){
            if (!S.fork){
              if (count === 0){ step(st.line, "繰り返しの条件は実行時の値で決まるため、1回分だけ説明します"); } else { unfinished = true; break; }
            } else {
              if(count>=2){step(st.line,"2回より多く続く可能性があります。以降の状態は確定できません");out.incomplete=true;S.halt=true;unfinished=true;break;}
              var lch=simFork(st.line,'loop',simExprStr(st.cond),'実行する','終了する',conditionValue);
              step(st.line,'未確定のループ条件：このパスでは'+(lch?'実行する':'終了する'));
              if(!lch)break;
            }
          } else if (!c) break;
        }
      }
      if(count>=100){step(st.line,"100回で説明を打ち切りました。ループは続く可能性があります");out.incomplete=true;S.halt=true;unfinished=true;break;}
      count++;
      spendBudget(st.line);
      var record = true;
      if (!record) S.suppress++;
      try { execStmt(st.body); }
      catch (ex){
        if (ex && ex.__brk){ if (!record) S.suppress--; break; }
        if (ex && ex.__cnt){ /* 次の周回へ（suppress の戻しは下で1回だけ） */ }
        else { if (!record) S.suppress--; throw ex; }
      }
      if (!record) S.suppress--;

      S.suppress++;
      try { if (st.inc) evExpr(st.inc); } finally { S.suppress--; }
      if (S.halt) break;
    }
    /* 打ち切った場合（回数上限・未確定条件・内側の打ち切りによる停止）はループが
       終了していないため、「終了します」のステップは出さない（NX-N11） */
    if (!unfinished && !S.halt && !out.incomplete) step(st.line, "繰り返しは全 " + count + " 回で終了します");
  }
  /* if / for / while の条件：ImageJ では 0 か 1 でなければエラー（checkBoolean）。不明なら null */
  function condBool(v, line){
    if (simIsUnk(v)) return null;
    if (v === 0) return false;
    if (v === 1) return true;
    throw simErr(line, "条件が 0 か 1 になっていません（値：" + simFmt(v) + "）", "ImageJ では if / while / for の条件は真偽値（0 か 1）でなければ \"Boolean expression expected\" エラーになります。== や < などの比較で条件を書いてください。");
  }
  (function preGlobals(stmts){
    function hasCall(e){
      if (!e || typeof e !== "object") return false;
      if (e.t === "call" || e.t === "mcall") return true;
      return Object.keys(e).some(function(k){ var v = e[k]; return Array.isArray(v) ? v.some(hasCall) : hasCall(v); });
    }
    stmts.forEach(function(st){
      if (!st || st.t === "funcdef" || st.t === "macroblock") return;
      if (st.t === "vardecl") st.decls.forEach(function(d){
        if (!Object.prototype.hasOwnProperty.call(S.globals, d.name)){
          /* ImageJ は var の初期化式を本体の実行前に評価する（saveGlobals2）。呼び出しを含まない式はここで先に評価する */
          if (d.init && !hasCall(d.init)){
            try { S.globals[d.name] = evExpr(d.init); return; } catch (ex) { /* 評価できない初期化式は従来どおり 0 扱い */ }
          }
          S.globals[d.name] = d.init && (d.init.t === "num" || d.init.t === "str") ? d.init.v : 0;
        }
      });
      ["body", "then", "els"].forEach(function(k){
        var v = st[k];
        if (Array.isArray(v)) preGlobals(v);
        else if (v && typeof v === "object" && v.t) preGlobals([v]);
      });
    });
  })(prog);
  try { execBlock(prog); }
  catch (ex){
    if(ex&&ex.__infeasible){out.infeasible=true;}else if (ex && ex.__halt){ out.exited = true; }
    else if (ex && ex.__simErr){
      out.diags.push({ sev: "err", line: ex.line, text: ex.text, cause: ex.cause, runtime: 1 });
      out.halted = true;
      step(ex.line, "ここで止まります：" + ex.text);
    } else if (ex && (ex.__ret || ex.__brk || ex.__cnt)){
      out.diags.push({ sev: "err", line: 0, text: "return / break / continue の位置が不正です", cause: "対応する関数や繰り返しの外で使われています。" });
    } else if (ex instanceof RangeError){
      out.diags.push({ sev: "err", line: 0, text: "式や呼び出しが深すぎて読み切れませんでした", cause: "式が長すぎるか、括弧・関数呼び出しの入れ子が深すぎます。式を短い文に分けてください。" });
      out.halted = true;
    } else if(ex?.category){out.diags.push({sev:'err',line:ex.line||1,text:ex.message,cause:'未対応の条件です。'});out.halted=true;}else throw ex;
  }
  /* 静的診断と実行時エラーが同じ内容なら、静的側を落とす */
  var rtLines = {};
  out.diags.forEach(function(d){ if (d.runtime) rtLines[d.line + "|" + d.text] = 1; });
  out.diags = out.diags.filter(function(d){ return d.runtime || !rtLines[d.line + "|" + d.text]; });
  out.modelState={images:S.images.map(x=>({...x,mapOps:undefined})),results:S.results,roi:S.roi,files:S.files};
  out.log = S.log;
  out.usedFns = S.used.slice();
  var g = {};
  Object.keys(S.globals).forEach(function(k){ g[k] = S.globals[k]; });
  Object.keys(S.scopes[0]).forEach(function(k){ g[k] = S.scopes[0][k]; });
  /* P-N2: 最終状態のスナップショット表示も省略記法つきで切り詰める */
  Object.keys(g).forEach(function(k){ out.vars.push({ name: k, value: simTrunc(simFmt(g[k])) }); });
  var im = S.active >= 0 ? S.images[S.active] : null;
  if (im){
    var rng = simImgRangeNow(im), mn = simImgMean(im);
    out.img = { title: im.title, w: im.w, h: im.h, bit: im.bit, channels: im.channels, slices: im.slices,
      thr: im.thr, mean: simIsUnk(mn) ? null : Math.round(mn * 10) / 10, range: rng, count: S.images.length, results: S.results.length };
    if (im.bit === 8 && im.mapOps.length && !im.spatial){
      out.mapping = [0, 32, 64, 96, 128, 160, 192, 224, 255].map(function(v){ return [v, Math.round(Math.max(0, Math.min(255, simApplyOps(im, v))))]; });
    }
  } else out.img = { none: 1, results: S.results.length };
  out.premise="画面のモデル画像に基づく説明です。";
  if (S.fork){
    out.forkLabels = S.forkLabels;
    out.forkFilled = !!S.forkFilled;
    out.rtDiags = out.diags.filter(function(d){ return d.runtime || d.rt; });
    var rtKeys = {};
    out.rtDiags.forEach(function(d){ rtKeys[d.line + "|" + d.text] = 1; });
    out.staticDiags = out.diags.filter(function(d){ return !d.runtime && !d.rt && !rtKeys[d.line + "|" + d.text]; });
  }
  return out;
}
/* 分岐パスの列挙：条件が実行時の値で決まる分岐（if／繰り返し）について、仮定の組み合わせを
   深さ優先でたどり、結果が異なるパスを集める。値が確定している分岐は実際の1通りだけをたどる
   （取りえないパスは作らない）。上限に達したら truncated に理由を入れて正直に知らせる */
function simRunPaths(code,model){
  var first = null;
  try { first = simRunProgram(code, { tape: [] },model); }
  catch (e){ if (!(e && e.__needFork)) throw e; }
  if (first) return { single: first };
  var MAXP = 2000, MAXFORK = 24, TLIMIT = 1200, T0 = Date.now();
  var paths = [], trunc = "";
  /* パスは「仮定の組み合わせ」そのものなので、結果が同じでも統合しない（全部表示する） */
  function addPath(r){ if (r&&!r.infeasible) paths.push(r); }
  function dfs(tape){
    if (paths.length >= MAXP){ trunc = trunc || "paths"; return; }
    if (Date.now() - T0 > TLIMIT){ trunc = trunc || "time"; return; }
    var r = null;
    try { r = simRunProgram(code, { tape: tape },model); }
    catch (e){ if (!(e && e.__needFork)) throw e; }
    if (r){ addPath(r); return; }
    if (tape.length >= MAXFORK){
      trunc = trunc || "forks";
      var r2 = null;
      try { r2 = simRunProgram(code, { tape: tape, fill: true },model); }
      catch (e2){ if (!(e2 && e2.__needFork)) throw e2; }
      addPath(r2);
      return;
    }
    dfs(tape.concat([true]));  /* 既定側（従来の説明と同じ側）を先に */
    dfs(tape.concat([false]));
  }
  dfs([]);
  return { paths: paths, truncated: trunc, cap: MAXP,
    statics: paths.length ? (paths[0].staticDiags || []) : [],
    premise: paths.length ? paths[0].premise : "" };
}


var SIM_NS = { Array: 1, Math: 1, String: 1, Dialog: 1, File: 1, IJ: 1, List: 1, Table: 1, Stack: 1, Roi: 1, Plot: 1, Overlay: 1, Color: 1, Fit: 1, Image: 1, Property: 1, RoiManager: 1 };
/* リファレンス97件に無いが ImageJ マクロに実在する組み込み（誤検出防止） */
var SIM_EXTRA = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, minOf: 1, maxOf: 1, toString: 1, getInfo: 1, isNaN: 1, selectWindow: 1, getMetadata: 1, setMetadata: 1, getCursorLoc: 1, isKeyDown: 1, screenWidth: 1, screenHeight: 1, getBoolean: 1, getNumber: 1, getString: 1, runMacro: 1,
  "Math.abs": 1, "Math.sqrt": 1, "Math.pow": 1, "Math.exp": 1, "Math.log": 1, "Math.log10": 1, "Math.floor": 1, "Math.ceil": 1, "Math.round": 1, "Math.sin": 1, "Math.cos": 1, "Math.tan": 1, "Math.asin": 1, "Math.acos": 1, "Math.atan": 1, "Math.atan2": 1,
  "String.join": 1, "String.pad": 1, "String.trim": 1, "String.format": 1 };
/* 公式 functions.html スナップショット（tests/official-functions.txt、552 書式）に載っている関数名。
   リファレンス未収録でも ImageJ に実在するので、未定義エラーにせず実行時の説明省略で扱う */
var SIM_OFFICIAL = { "Array.concat": 1, "Array.copy": 1, "Array.deleteIndex": 1, "Array.deleteValue": 1, "Array.fill": 1, "Array.filter": 1, "Array.findMaxima": 1, "Array.findMinima": 1, "Array.fourier": 1, "Array.getSequence": 1, "Array.getStatistics": 1, "Array.getVertexAngles": 1, "Array.print": 1, "Array.rankPositions": 1, "Array.resample": 1, "Array.reverse": 1, "Array.rotate": 1, "Array.show": 1, "Array.slice": 1, "Array.sort": 1, "Array.trim": 1, "Color.getLut": 1, "Color.set": 1, "Color.setBackground": 1, "Color.setBackgroundValue": 1, "Color.setForeground": 1, "Color.setForegroundValue": 1, "Color.setLut": 1, "Color.toArray": 1, "Color.toString": 1, "Color.wavelengthToColor": 1, "Dialog.addCheckbox": 1, "Dialog.addCheckboxGroup": 1, "Dialog.addChoice": 1, "Dialog.addDirectory": 1, "Dialog.addFile": 1, "Dialog.addHelp": 1, "Dialog.addImage": 1, "Dialog.addImageChoice": 1, "Dialog.addMessage": 1, "Dialog.addNumber": 1, "Dialog.addRadioButtonGroup": 1, "Dialog.addSlider": 1, "Dialog.addString": 1, "Dialog.addToSameRow": 1, "Dialog.create": 1, "Dialog.createNonBlocking": 1, "Dialog.getCheckbox": 1, "Dialog.getChoice": 1, "Dialog.getImageChoice": 1, "Dialog.getLocation": 1, "Dialog.getNumber": 1, "Dialog.getRadioButton": 1, "Dialog.getString": 1, "Dialog.setInsets": 1, "Dialog.setLocation": 1, "Dialog.show": 1, "File.append": 1, "File.close": 1, "File.copy": 1, "File.dateLastModified": 1, "File.delete": 1, "File.exists": 1, "File.getDirectory": 1, "File.getName": 1, "File.getNameWithoutExtension": 1, "File.getParent": 1, "File.isDirectory": 1, "File.isFile": 1, "File.lastModified": 1, "File.length": 1, "File.makeDirectory": 1, "File.open": 1, "File.openAsRawString": 1, "File.openAsString": 1, "File.openDialog": 1, "File.openSequence": 1, "File.openUrlAsString": 1, "File.rename": 1, "File.saveString": 1, "File.setDefaultDir": 1, "Fit.doFit": 1, "Fit.doWeightedFit": 1, "Fit.f": 1, "Fit.getEquation": 1, "Fit.p": 1, "IJ.checksum": 1, "IJ.currentMemory": 1, "IJ.deleteRows": 1, "IJ.freeMemory": 1, "IJ.getToolName": 1, "IJ.log": 1, "IJ.maxMemory": 1, "IJ.pad": 1, "IJ.redirectErrorMessages": 1, "IJ.renameResults": 1, "Image.paste": 1, "List.clear": 1, "List.fromArrays": 1, "List.get": 1, "List.getValue": 1, "List.indexOf": 1, "List.set": 1, "List.setList": 1, "List.setMeasurements": 1, "List.toArrays": 1, "Math.abs": 1, "Math.acos": 1, "Math.asin": 1, "Math.atan": 1, "Math.atan2": 1, "Math.ceil": 1, "Math.constrain": 1, "Math.cos": 1, "Math.erf": 1, "Math.exp": 1, "Math.floor": 1, "Math.log": 1, "Math.log10": 1, "Math.map": 1, "Math.max": 1, "Math.min": 1, "Math.pow": 1, "Math.round": 1, "Math.sin": 1, "Math.sqr": 1, "Math.sqrt": 1, "Math.tan": 1, "Math.toDegrees": 1, "Math.toRadians": 1, "Overlay.activateSelection": 1, "Overlay.activateSelectionAndWait": 1, "Overlay.addSelection": 1, "Overlay.cropAndSave": 1, "Overlay.drawEllipse": 1, "Overlay.drawLabels": 1, "Overlay.drawLine": 1, "Overlay.drawRect": 1, "Overlay.drawString": 1, "Overlay.fill": 1, "Overlay.getBounds": 1, "Overlay.indexAt": 1, "Overlay.lineTo": 1, "Overlay.moveSelection": 1, "Overlay.moveTo": 1, "Overlay.removeRois": 1, "Overlay.removeSelection": 1, "Overlay.selectable": 1, "Overlay.setLabelColor": 1, "Overlay.setLabelFontSize": 1, "Overlay.setPosition": 1, "Overlay.setStrokeColor": 1, "Overlay.setStrokeWidth": 1, "Overlay.update": 1, "Overlay.useNamesAsLabels": 1, "Overlay.xor": 1, "Plot.add": 1, "Plot.addHistogram": 1, "Plot.addText": 1, "Plot.create": 1, "Plot.drawBoxes": 1, "Plot.drawGrid": 1, "Plot.drawLine": 1, "Plot.drawNormalizedLine": 1, "Plot.drawShapes": 1, "Plot.drawVectors": 1, "Plot.eneableLive": 1, "Plot.freeze": 1, "Plot.getFrameBounds": 1, "Plot.getLimits": 1, "Plot.getValues": 1, "Plot.makeHighResolution": 1, "Plot.removeNaNs": 1, "Plot.replace": 1, "Plot.setAxisLabelSize": 1, "Plot.setBackgroundColor": 1, "Plot.setColor": 1, "Plot.setFontSize": 1, "Plot.setFormatFlags": 1, "Plot.setFrameSize": 1, "Plot.setJustification": 1, "Plot.setLegend": 1, "Plot.setLimits": 1, "Plot.setLimitsToFit": 1, "Plot.setLineWidth": 1, "Plot.setLogScaleX": 1, "Plot.setLogScaleY": 1, "Plot.setOptions": 1, "Plot.setStyle": 1, "Plot.setXYLabels": 1, "Plot.show": 1, "Plot.showValues": 1, "Plot.showValuesWithLabels": 1, "Plot.update": 1, "Plot.useTemplate": 1, "Property.get": 1, "Property.getInfo": 1, "Property.getNumber": 1, "Property.getValue": 1, "Property.set": 1, "Property.setList": 1, "Property.setSliceLabel": 1, "Roi.contains": 1, "Roi.getBounds": 1, "Roi.getContainedPoints": 1, "Roi.getCoordinates": 1, "Roi.getFeretPoints": 1, "Roi.getFloatBounds": 1, "Roi.getPointPosition": 1, "Roi.getPosition": 1, "Roi.getProperty": 1, "Roi.getSplineAnchors": 1, "Roi.move": 1, "Roi.setAntiAlias": 1, "Roi.setDefaultGroup": 1, "Roi.setFillColor": 1, "Roi.setFontSize": 1, "Roi.setGroup": 1, "Roi.setGroupNames": 1, "Roi.setJustification": 1, "Roi.setMinStrokeWidth": 1, "Roi.setName": 1, "Roi.setPolygonSplineAnchors": 1, "Roi.setPolylineSplineAnchors": 1, "Roi.setPosition": 1, "Roi.setProperty": 1, "Roi.setStrokeColor": 1, "Roi.setStrokeWidth": 1, "Roi.setUnscalableStrokeWidth": 1, "Roi.translate": 1, "RoiManager.associateROIsWithSlices": 1, "RoiManager.delete": 1, "RoiManager.getIndex": 1, "RoiManager.getName": 1, "RoiManager.multiCrop": 1, "RoiManager.restoreCentered": 1, "RoiManager.rotate": 1, "RoiManager.scale": 1, "RoiManager.select": 1, "RoiManager.selectByName": 1, "RoiManager.selectGroup": 1, "RoiManager.selectPosition": 1, "RoiManager.setGroup": 1, "RoiManager.setPosition": 1, "RoiManager.translate": 1, "RoiManager.useNamesAsLabels": 1, "Stack.getActiveChannels": 1, "Stack.getDimensions": 1, "Stack.getDisplayMode": 1, "Stack.getFrameInterval": 1, "Stack.getFrameRate": 1, "Stack.getOrthoViews": 1, "Stack.getOrthoViewsIDs": 1, "Stack.getPosition": 1, "Stack.getStatistics": 1, "Stack.getUnits": 1, "Stack.setActiveChannels": 1, "Stack.setChannel": 1, "Stack.setDimensions": 1, "Stack.setDisplayMode": 1, "Stack.setFrame": 1, "Stack.setFrameInterval": 1, "Stack.setFrameRate": 1, "Stack.setOrthoViews": 1, "Stack.setPosition": 1, "Stack.setSlice": 1, "Stack.setTUnit": 1, "Stack.setUnits": 1, "Stack.setXUnit": 1, "Stack.setYUnit": 1, "Stack.setZUnit": 1, "Stack.swap": 1, "Stack.toggleChannel": 1, "String.append": 1, "String.copy": 1, "String.format": 1, "String.join": 1, "String.pad": 1, "String.setFontSize": 1, "String.show": 1, "String.trim": 1, "Table.applyMacro": 1, "Table.columnExists": 1, "Table.create": 1, "Table.deleteColumn": 1, "Table.deleteRows": 1, "Table.get": 1, "Table.getColumn": 1, "Table.getString": 1, "Table.open": 1, "Table.rename": 1, "Table.renameColumn": 1, "Table.reset": 1, "Table.save": 1, "Table.saveColumnHeader": 1, "Table.set": 1, "Table.setColumn": 1, "Table.setLocationAndSize": 1, "Table.setSelection": 1, "Table.showArrays": 1, "Table.showRowIndexes": 1, "Table.showRowNumbers": 1, "Table.sort": 1, "abs": 1, "acos": 1, "asin": 1, "atan": 1, "atan2": 1, "autoUpdate": 1, "beep": 1, "bitDepth": 1, "calibrate": 1, "call": 1, "changeValues": 1, "charCodeAt": 1, "close": 1, "contains": 1, "cos": 1, "d2s": 1, "debug": 1, "doCommand": 1, "doWand": 1, "drawLine": 1, "drawOval": 1, "drawRect": 1, "drawString": 1, "dump": 1, "endsWith": 1, "eval": 1, "exec": 1, "exit": 1, "exp": 1, "fill": 1, "fillOval": 1, "fillRect": 1, "floodFill": 1, "floor": 1, "fromCharCode": 1, "getArgument": 1, "getBoolean": 1, "getBoundingRect": 1, "getCursorLoc": 1, "getDateAndTime": 1, "getDimensions": 1, "getDir": 1, "getDirectory": 1, "getDisplayedArea": 1, "getFileList": 1, "getFontList": 1, "getHeight": 1, "getHistogram": 1, "getImageID": 1, "getImageInfo": 1, "getInfo": 1, "getLine": 1, "getList": 1, "getLocationAndSize": 1, "getLut": 1, "getMetadata": 1, "getMinAndMax": 1, "getNumber": 1, "getPixel": 1, "getPixelSize": 1, "getProfile": 1, "getRawStatistics": 1, "getResult": 1, "getResultLabel": 1, "getResultString": 1, "getSelectionBounds": 1, "getSelectionCoordinates": 1, "getSliceNumber": 1, "getStatistics": 1, "getString": 1, "getStringWidth": 1, "getThreshold": 1, "getTime": 1, "getTitle": 1, "getValue": 1, "getVersion": 1, "getVoxelSize": 1, "getWidth": 1, "getZoom": 1, "imageCalculator": 1, "indexOf": 1, "is": 1, "isActive": 1, "isKeyDown": 1, "isNaN": 1, "isOpen": 1, "lastIndexOf": 1, "lengthOf": 1, "lineTo": 1, "log": 1, "makeArrow": 1, "makeEllipse": 1, "makeLine": 1, "makeOval": 1, "makePoint": 1, "makePolygon": 1, "makeRectangle": 1, "makeRotatedRectangle": 1, "makeSelection": 1, "makeText": 1, "matches": 1, "maxOf": 1, "minOf": 1, "moveTo": 1, "newArray": 1, "newImage": 1, "newMenu": 1, "open": 1, "parseFloat": 1, "parseInt": 1, "pow": 1, "print": 1, "random": 1, "rename": 1, "replace": 1, "requires": 1, "roiManager": 1, "round": 1, "run": 1, "runMacro": 1, "save": 1, "saveAs": 1, "saveSettings": 1, "selectImage": 1, "selectWindow": 1, "selectionContains": 1, "setAutoThreshold": 1, "setBackgroundColor": 1, "setBatchMode": 1, "setColor": 1, "setFont": 1, "setForegroundColor": 1, "setJustification": 1, "setKeyDown": 1, "setLineWidth": 1, "setLocation": 1, "setLut": 1, "setMetadata": 1, "setMinAndMax": 1, "setOption": 1, "setPasteMode": 1, "setPixel": 1, "setRGBWeights": 1, "setResult": 1, "setSelectionLocation": 1, "setSelectionName": 1, "setSlice": 1, "setThreshold": 1, "setTool": 1, "setVoxelSize": 1, "setZCoordinate": 1, "setupUndo": 1, "showMessage": 1, "showMessageWithCancel": 1, "showProgress": 1, "showStatus": 1, "showText": 1, "sin": 1, "snapshot": 1, "split": 1, "sqrt": 1, "startsWith": 1, "substring": 1, "tan": 1, "toBinary": 1, "toHex": 1, "toLowerCase": 1, "toScaled": 1, "toString": 1, "toUnscaled": 1, "toUpperCase": 1, "updateDisplay": 1, "updateResults": 1, "wait": 1, "waitForUser": 1, "trim": 1, "resetMinAndMax": 1, "restoreSettings": 1, "IJ.getFullVersion": 1, "File.getDefaultDir": 1, "Image.copy": 1, "List.getList": 1, "List.setCommands": 1, "Fit.plot": 1, "Fit.logResults": 1, "Fit.showDialog": 1, "Overlay.add": 1, "Overlay.show": 1, "Overlay.hide": 1, "Overlay.remove": 1, "Overlay.clear": 1, "Overlay.measure": 1, "Overlay.flatten": 1, "Overlay.copy": 1, "Overlay.paste": 1, "Property.getSliceLabel": 1, "Roi.getName": 1, "Roi.getDefaultColor": 1, "Roi.getStrokeColor": 1, "Roi.getFillColor": 1, "Roi.getProperties": 1, "Roi.getType": 1, "Roi.getStrokeWidth": 1, "Roi.getGroup": 1, "Roi.getDefaultGroup": 1, "Roi.getGroupNames": 1, "Roi.remove": 1, "Roi.selectNone": 1, "Roi.copy": 1, "Roi.paste": 1, "RoiManager.selected": 1, "Stack.isHyperstack": 1, "Stack.getOrthoViewsID": 1, "Stack.startOrthoViews": 1, "Stack.stopOrthoViews": 1, "String.resetBuffer": 1, "String.copyResults": 1, "String.getResultsHeadings": 1, "Table.allHeadings": 1, "Table.update": 1, "Table.getSelectionStart": 1, "Table.getSelectionEnd": 1, "Table.showHistogramTable": 1 };

/* replace: 1文字なら文字どおり、2文字以上なら正規表現（ij.macro.Functions.replace） */
function simReplaceStr(s, oldS, newS){
  if (typeof s !== "string") return SIM_UNK;
  var o = String(oldS), n = String(newS);
  /* P-N1（連結以外の成長経路）: 置換は置換文字列を出現回数だけ繰り返す
     ため結果が爆発しうる。出現回数の上限から結果長を見積もり、上限を
     超える場合は実体を作らず未確定値へ倒す。 */
  if (o.length === 1){
    var hits = s.split(o).length - 1;
    if (s.length + hits * (n.length - 1) > SIM_VALUE_LIMIT) return SIM_UNK;
    return s.split(o).join(n);
  }
  if (o.length === 0) return s;
  /* 正規表現経路は、空マッチで各位置に挿入されうることと、置換文字列中の
     $& 等がマッチ全体（最大で対象文字列長）へ展開されうることまで含めた
     上限で見積もる（$ を含まない通常の置換では締まった見積もりになる）。 */
  var dollarCount = (n.match(/\$/g) || []).length;
  if (n.length > 0 && s.length + (s.length + 1) * (n.length + dollarCount * s.length) > SIM_VALUE_LIMIT)
    return SIM_UNK;
  try { var replaced = s.replace(new RegExp(o, "g"), n); return replaced.length > SIM_VALUE_LIMIT ? SIM_UNK : replaced; }
  catch (ex) { return SIM_UNK; }
}
/* ImageJ の数値文字列パース（Tools.parseDouble）: 全体が数値でなければ NaN */
/* ImageJ のバージョン比較（D2）。"1.54p" のように 数値部＋1文字のサフィックスで比べる */
function simVersionCmp(a, b){
  var pa = /^(\d+)\.(\d+)(.*)$/.exec(String(a)), pb = /^(\d+)\.(\d+)(.*)$/.exec(String(b));
  if (!pa || !pb) return null;
  if (+pa[1] !== +pb[1]) return +pa[1] < +pb[1] ? -1 : 1;
  if (+pa[2] !== +pb[2]) return +pa[2] < +pb[2] ? -1 : 1;
  if (pa[3] === pb[3]) return 0;
  return pa[3] < pb[3] ? -1 : 1;
}

/* 画像の空間校正（D1）。setVoxelSize で設定したボクセルサイズを画像ごとに保持する */
function simVoxel(im){ return (im && im.voxel) || [1, 1, 1, "pixels"]; }
function simVoxelAreaScale(im){
  var vx = simVoxel(im);
  if (typeof vx[0] === "number" && typeof vx[1] === "number") return vx[0] * vx[1];
  return SIM_UNK;
}

function simParseDouble(v){
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  var s = v.trim();
  if (s === "NaN") return NaN;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return NaN;
  return Number(s);
}
/* split: ","/";" は空要素を残す正規表現分割、それ以外は区切り文字集合で空要素を捨てる（Functions.split / Tools.split） */
function simSplitStr(s, delim, line){
  if (typeof s !== "string") return SIM_UNK;
  if (typeof delim === "string" && (delim === "," || delim === ";")) return s.split(delim);
  if (typeof delim === "string" && delim.length >= 3 && delim.charAt(0) === "(" && delim.charAt(delim.length - 1) === ")"){
    try { return s.split(new RegExp(delim.slice(1, -1))); } catch (ex) { return SIM_UNK; }
  }
  if (delim === "\n"){ var parts = s.split("\n"); if (parts.length && parts[parts.length - 1] === "") parts.pop(); return parts; }
  var set = (typeof delim === "string" && delim !== "") ? delim : " \t\n\r";
  return s.split("").reduce(function(acc, ch){
    if (set.indexOf(ch) >= 0){ acc.push(""); } else { acc[acc.length - 1] += ch; }
    return acc;
  }, [""]).filter(function(x){ return x !== ""; });
}
function simHist256(img){
  var hist = new Array(256).fill(0);
  if (!img.buckets) return null;
  img.buckets.forEach(function(b){
    var per = b[2] / (b[1] - b[0] + 1);
    for (var v = b[0]; v <= b[1]; v++) hist[v] += per;
  });
  return hist;
}
function simStats(img){
  var hist = simHist256(img);
  if (!hist) return null;
  var total = 0, sum = 0, min = null, max = null, i;
  for (i = 0; i < 256; i++){ if (hist[i] > 0){ if (min === null) min = i; max = i; } total += hist[i]; sum += i * hist[i]; }
  if (!total) return null;
  var mean = sum / total, v = 0;
  for (i = 0; i < 256; i++) v += (i - mean) * (i - mean) * hist[i];
  return { area: (typeof img.w === "number" && typeof img.h === "number") ? img.w * img.h : SIM_UNK, mean: mean, std: Math.sqrt(v / total), min: min, max: max };
}
/* R24 共通根是正（バッチ3）: Java の (int) キャスト相当の整数化。
   実 ImageJ（ij.macro.Functions）は寸法・位置・個数・添字などの数値引数を
   (int) へ変換してから使う。(int) は小数部を 0 方向へ切り捨て、NaN は 0、
   ±Infinity は int の最大・最小値になる。切り上げ（Math.ceil 的な要素数化）や
   小数のままの保持、Math.floor（負数で (int) と食い違う）はこの規律に反する。
   対象は実 ImageJ が (int) 変換する引数だけであり、double のまま扱う引数
   （makeRectangle の座標、setThreshold の値、getPixel の補間座標など）は対象外。 */
function simInt(v){
  if (typeof v !== "number") return v;
  if (v !== v) return 0;
  if (v > 2147483647) return 2147483647;
  if (v < -2147483648) return -2147483648;
  return Math.trunc(v);
}
/* R25-N22: ImageJ マクロの数値引数は Variable の数値変換を経て渡されるため、
   数値として読める文字列（"1" や "2" など）も数値として解釈される。配列添字・
   getPixel／setPixel の文字列座標で既に採っている解釈（num() と同じ parseFloat
   方式）に、substring／charCodeAt／indexOf／roiManager("select")／setSlice／
   Stack.setPosition／getHistogram の範囲引数を統一する。数値として読めない
   文字列はそのまま返し、呼び出し側の従来の型判定に委ねる。 */
function simNumArg(v){
  if (typeof v !== "string") return v;
  if (v.trim() === "") return v;
  var x = parseFloat(v);
  return isNaN(x) ? v : x;
}
function simBuiltin(S, e, args, refs, H){
  var name = e.name, line = e.line, step = H.step, warn = H.warn;
  if (["setPixel","setResult","setThreshold","setAutoThreshold","setSlice","Stack.setPosition","rename","makeRectangle","makeOval","makeLine","makePolygon","makeSelection","setMinAndMax","newImage","changeValues"].includes(name) && args.some(simIsUnk))
    throw simErr(line, "未確認：" + name + " の状態変更引数が未確定です", "変更箇所や結果を推測して後続を実行しません。");
  var img = function(){ return H.img(); };
  var needImg = function(what){ return H.needImg(line, what); };
  var f0 = funcByName(name);
  function descStep(extra){
    step(line, name + "：" + (f0 ? f0.desc.split("。")[0] + "。" : "組み込みの処理を実行します。") + (extra || ""));
  }
  switch (name){
    case "print": {
      /* P-N2: Log 出力も表示専用なので、長い値は省略記法つきで切り詰める */
      var txt = simTrunc(args.map(function(a){ return simFmt(a); }).join(" "));
      if (S.log.length < 200){ S.log.push(txt); S.logLines.push(line); }
      else if (S.log.length === 200){ S.log.push("（Log 出力が200行を超えたため、以降は省略します）"); S.logLines.push(0); }
      step(line, "Log に「" + txt + "」と出力します");
      return SIM_UNK;
    }
    case "run": return simRunCmd(S, args.length ? args[0] : "", args.length > 1 ? args[1] : "", line, H);
    case "getTitle": { var im = needImg("getTitle()"); step(line, "画像のタイトル「" + im.title + "」を取得します"); return im.title; }
    case "nSlices": { if (e.args.length) throw simErr(line, "nSlices の引数の数が違います", "nSlices は定義済み変数で、引数は取りません（括弧も省略できます）。ImageJ では引数つきの呼び出しはエラーになり止まります。"); var imN = img(); return imN ? imN.slices : 0; }
    /* R25-N20: nImages／nSlices／nResults は引数を取らない定義済み変数（括弧の
       有無だけが任意）。引数つき呼び出しは実 ImageJ ではエラーになるため、
       黙って受理して値を返さない。 */
    case "nImages": if (e.args.length) throw simErr(line, "nImages の引数の数が違います", "nImages は定義済み変数で、引数は取りません（括弧も省略できます）。ImageJ では引数つきの呼び出しはエラーになり止まります。"); return S.images.length;
    case "nResults": if (e.args.length) throw simErr(line, "nResults の引数の数が違います", "nResults は定義済み変数で、引数は取りません（括弧も省略できます）。ImageJ では引数つきの呼び出しはエラーになり止まります。"); return S.results.length;
    case "PI": return Math.PI;
    case "Array.copy": return Array.isArray(args[0]) ? args[0].slice() : SIM_UNK;
    case "getWidth": { var im2 = needImg("getWidth()"); step(line, "画像の幅 " + (typeof im2.w === "number" ? im2.w + " px" : "（不明）") + " を取得します"); return typeof im2.w === "number" ? im2.w : SIM_UNK; }
    case "getHeight": { var im3 = needImg("getHeight()"); step(line, "画像の高さ " + (typeof im3.h === "number" ? im3.h + " px" : "（不明）") + " を取得します"); return typeof im3.h === "number" ? im3.h : SIM_UNK; }
    case "getImageID": { needImg("getImageID()"); step(line, "画像ID " + (-(S.active + 1)) + " を取得します（モデル上の番号）"); return -(S.active + 1); }
    case "bitDepth": { var im4 = needImg("bitDepth()"); step(line, "ビット深度 " + im4.bit + " を取得します"); return im4.bit; }
    case "isOpen": {
      var found = false;
      /* R25-N15: 数値引数は simInt 切捨て後の ID で照合されるため、説明も変換前の
         生引数ではなく、照合に使われた変換後の ID（解決できればタイトルも）で
         引用する（setSlice／setPixel／selectImage の説明と揃える）。 */
      var openDesc = "画像「" + simFmt(args[0]) + "」";
      if (typeof args[0] === "string") found = S.images.some(function(x){ return x.title === args[0]; });
      else if (typeof args[0] === "number"){
        var iid = simInt(args[0]);
        found = iid < 0 ? (-iid - 1) < S.images.length : (iid - 1) < S.images.length && iid > 0;
        var oidx = iid > 0 ? iid - 1 : -iid - 1;
        openDesc = "画像 ID " + iid + (found && S.images[oidx] ? "（「" + S.images[oidx].title + "」）" : "");
      }
      step(line, openDesc + "が開かれているか → " + (found ? "開かれています" : "開かれていません"));
      return found ? 1 : 0;
    }
    case "selectImage": {
      var a = args[0], idx = -1;
      /* R24-N5: Functions.java は id = (int)getExpression() と切捨て変換してから
         画像を探す。小数・NaN のまま添字にすると S.images[1.5] のような
         undefined アクセスになり、ホスト例外（Cannot read properties of
         undefined）が学習者へ漏れて全パスが失われていた。変換後の ID で
         存在しない場合は、従来どおり「存在しない画像」のマクロエラーで止める
         （NaN は (int) 変換で 0 になり、ID 0 の画像はないためエラーになる）。
         変換後に実在する ID（例: 1.5→1）は実 ImageJ どおりその画像を選ぶ。 */
      if (typeof a === "number"){ var aid = simInt(a); idx = aid > 0 ? aid - 1 : -aid - 1; }
      else if (typeof a === "string"){ idx = S.images.findIndex(function(x){ return x.title === a; }); }
      if (idx < 0 || idx >= S.images.length) throw simErr(line, "selectImage で、存在しない画像が指定されています", "開いている画像は " + S.images.length + " 枚です。番号（1始まり）か画像ID（負数）を確認してください。");
      S.active = idx;
      step(line, "画像「" + S.images[idx].title + "」をアクティブにします");
      return SIM_UNK;
    }
    case "selectWindow": {
      var ix = S.images.findIndex(function(x){ return x.title === args[0]; });
      if (ix < 0){ warn(line, "ウィンドウ「" + simFmt(args[0]) + "」が見つかりません", "結果表や Log など画像以外のウィンドウの可能性もあります。モデルでは画像だけを対象にしています。"); return SIM_UNK; }
      S.active = ix; step(line, "ウィンドウ「" + args[0] + "」を前に出します"); return SIM_UNK;
    }
    case "open": {
      if (simIsUnk(args[0]) || !Object.prototype.hasOwnProperty.call(S.files, args[0])) throw simErr(line, "未確認：モデルに画像ファイルがありません", "存在・寸法・ビット深度は推測しません。");
      var path = String(args[0]), base = path.split(/[\\/]/).pop(), file = S.files[path];
      if (!file || ![file.w,file.h,file.bit,file.channels,file.slices,file.frames].every(Number.isFinite)) throw simErr(line, "未確認：モデル画像のメタデータが不足しています", "w / h / bit / channels / slices / frames を指定してください。");
      var nim = { ...structuredClone(file), title:file.title || base, slice:1, buckets:file.buckets || null, thr:null, mapOps:[], spatial:false, pix:structuredClone(file.pix || {}), writtenPix:file.writtenPix ? structuredClone(file.writtenPix) : {}, kind:"モデルファイルから開いた画像" };
      S.images.push(nim); S.active = S.images.length - 1;
      step(line, "明示したモデルファイル「" + base + "」を開きます。実ファイルは操作しません");
      return SIM_UNK;
    }
    case "close": {
      var im5 = img();
      if (!im5){ warn(line, "close() ですが、開いている画像がありません", ""); return SIM_UNK; }
      step(line, "画像「" + im5.title + "」を閉じます（保存の確認は出ない前提です）");
      S.images.splice(S.active, 1);
      if (S.active >= S.images.length) S.active = S.images.length - 1;
      return SIM_UNK;
    }
    case "saveAs": {
      /* 保存先の確定チェックと画像の存在確認を、「保存します」と断定するステップより
         先に行う。未確定なら未確認の停止ステップだけが出る（NX-N13） */
      if (simIsUnk(args[1]) || typeof args[1] !== "string") throw simErr(line, "未確認：保存先のパスが未確定です", "モデルに保存先を明示してください。");
      var isResultsSave = String(args[0]).toLowerCase() === "results";
      var saveImg = isResultsSave ? null : needImg("saveAs");
      if (isResultsSave) step(line, "結果表（" + S.results.length + " 行）を「" + simFmt(args[1]) + "」に保存します");
      else step(line, "画像を " + simFmt(args[0]) + " 形式で「" + simFmt(args[1]) + "」に保存します（元の画像データは変わりません）");
      if (isResultsSave) S.files[args[1]] = {kind:"unknown",source:"測定表の保存内容（整形は未確認）"};
      else { S.files[args[1]]={...saveImg,mapOps:[]}; }
      return SIM_UNK;
    }
    case "getDirectory": {
      var gk = typeof args[0] === "string" ? args[0] : "";
      step(line, "フォルダのパスを取得します。モデルに明示していない選択結果は未確定です");
      return Object.prototype.hasOwnProperty.call(S.directories,gk) ? S.directories[gk] : SIM_UNK;
    }
    case "getFileList": {
      step(line, "明示したモデルフォルダの一覧を取得します。モデルにない実一覧は未確定です");
      if (simIsUnk(args[0]) || !Object.values(S.directories).includes(args[0])) return SIM_UNK;
      return Object.keys(S.files).filter(p=>p.startsWith(args[0])).map(p=>p.slice(args[0].length)).filter(p=>p&&!p.includes("/"));
    }
    case "getVersion": step(line, "モデルで指定したバージョンを読みます。未指定なら未確定です"); return S.runtime.version ?? SIM_UNK;
    case "getArgument": step(line, "モデルで指定したマクロ引数を読みます。未指定なら未確定です"); return S.runtime.argument ?? SIM_UNK;
    case "requires": {
      /* D2: 実行時バージョンと要件を比較し、不足すればマクロを中止する（実 ImageJ の挙動） */
      var reqV = args[0], curV = S.runtime.version;
      if (typeof reqV === "string" && typeof curV === "string"){
        var cmpV = simVersionCmp(curV, reqV);
        if (cmpV !== null && cmpV < 0)
          throw simErr(line, "ImageJ のバージョンが不足しています（必要: " + reqV + "、現在: " + curV + "）", "requires は、現在のバージョンが必要なバージョンより古い場合、メッセージを表示してマクロを中止します。");
      }
      step(line, "ImageJ のバージョン要件 " + simFmt(args[0]) + " を確認します" + (typeof curV === "string" ? "（現在のバージョン " + curV + " で要件を満たします）" : ""));
      return SIM_UNK;
    }
    case "exit": step(line, "マクロはここで終了します" + (args[0] ? "（メッセージ：" + simFmt(args[0]) + "）" : "")); S.halt = true; throw { __halt: 1 };
    case "eval": step(line, "渡された文字列をマクロとして実行します（中身の説明は省略します）"); return SIM_UNK;
    case "call": step(line, "Java の機能を呼び出します（内容の説明は省略します）"); return SIM_UNK;
    case "waitForUser": step(line, "ダイアログでユーザの操作を待ち、一時停止します"); return SIM_UNK;
    case "showMessage": step(line, "メッセージ「" + simFmt(args[args.length - 1]) + "」を表示して止まります"); return SIM_UNK;
    case "showStatus": step(line, "ステータスバーに「" + simFmt(args[0]) + "」と表示します"); return SIM_UNK;
    case "showProgress": step(line, "進捗バーを " + simFmt(args[0]) + " の割合で表示します"); return SIM_UNK;
    case "setBatchMode": {
      /* RA-10: 文字列形式（"show" / "hide" / "exit and display"）も実 ImageJ の仕様どおり扱う */
      var bm = args[0];
      if (typeof bm === "string"){
        var bml = bm.toLowerCase();
        if (bml === "hide"){ S.batch = true; step(line, "画像を表示せずに処理します（setBatchMode(\"hide\")）"); return SIM_UNK; }
        if (bml === "show"){ S.batch = false; step(line, "隠れていた画像を表示します（setBatchMode(\"show\")）"); return SIM_UNK; }
        if (bml === "exit and display"){ S.batch = false; step(line, "隠れていた画像を表示してバッチモードを抜けます（setBatchMode(\"exit and display\")）"); return SIM_UNK; }
        step(line, "setBatchMode の引数「" + bm + "」は既知の形式（true / false / \"show\" / \"hide\" / \"exit and display\"）ではありません");
        return SIM_UNK;
      }
      S.batch = !!H.truthy(bm);
      step(line, "バッチモードを " + (S.batch ? "オン（画面を描かず高速に処理）" : "オフ（通常表示）") + " にします");
      return SIM_UNK;
    }
    case "setOption": step(line, "オプション「" + simFmt(args[0]) + "」を設定します"); return SIM_UNK;
    case "updateResults": step(line, "結果表の表示を更新します"); return SIM_UNK;
    case "newArray": {
      /* R24-N19: Functions.java の newArray() は単一数値引数を
         size = (int)array[0].getValue() と切捨て変換し、size<0 では
         interp.error("Negative array size") で止める。切り上げて要素を
         捏造したり、負サイズを黙って空配列にしたりしない。 */
      if (args.length === 1 && typeof args[0] === "number"){
        var sz = simInt(args[0]);
        if (sz < 0) throw simErr(line, "newArray のサイズ（" + sz + "）が負です", "ImageJ では \"Negative array size\" エラーになり止まります。要素数は 0 以上で指定してください。");
        /* P-N1: 要素数が上限を超える配列は実体を作らず未確定値へ倒す */
        if (sz > SIM_VALUE_LIMIT){ step(line, "要素数 " + sz + " の配列は大きすぎるため、内容は未確定として扱います"); return SIM_UNK; }
        var arr = []; for (var i = 0; i < sz; i++) arr.push(0); step(line, "要素数 " + sz + " の配列（中身はすべて 0）を作ります"); return arr;
      }
      step(line, "配列 " + simFmt(args) + " を作ります"); return args.slice();
    }
    case "Array.sort": {
      var ar = args[0];
      /* R25-N21: 実 ImageJ の Array.sort（Functions.java の sortArray）は配列変数を
         要求し（getArray）、非配列ではエラーで止まる。Array.getStatistics と同じく
         原因を名指して止め、入力を「ソート結果」としてそのまま返さない。
         値が未確定のときは従来どおり未確定として扱う。 */
      if (simIsUnk(ar)) return SIM_UNK;
      if (!Array.isArray(ar))
        throw simErr(line, "Array.sort の引数が配列ではありません", "Array.sort は配列変数を並べ替える関数です。数値や文字列そのものは並べ替えられません。ImageJ ではここでエラーになり止まります。");
      if (args.length > 1 && !simIsUnk(args[1])){
        if (!Array.isArray(args[1]))
          throw simErr(line, "Array.sort の第2引数が配列ではありません", "同時に並べ替える2つ目の配列も、配列変数でなければなりません。ImageJ ではここでエラーになり止まります。");
        if (args[1].length !== ar.length)
          throw simErr(line, "Array.sort の2つの配列の長さが違います", "同時に並べ替える配列同士は同じ長さでなければなりません（Functions.java の \"Arrays must have same length\"）。");
      }
      /* 文字列は大文字小文字を区別しない順序（String.CASE_INSENSITIVE_ORDER） */
      function cmpIJ(x, y){
        if (typeof x === "string" && typeof y === "string"){ var a = x.toLowerCase(), b = y.toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; }
        return x < y ? -1 : x > y ? 1 : 0;
      }
      if (Array.isArray(ar)){
        if (Array.isArray(args[1]) && args[1].length === ar.length){
          var pairs = ar.map(function(v, i){ return [v, args[1][i]]; });
          pairs.sort(function(p, q){ return cmpIJ(p[0], q[0]); });
          pairs.forEach(function(p, i){ ar[i] = p[0]; args[1][i] = p[1]; });
          step(line, "配列を小さい順に並べ替え、2つ目の配列も同じ順序で並べ替えます");
        } else { ar.sort(cmpIJ); step(line, "配列を小さい順に並べ替えます"); }
      }
      return ar;
    }
    case "Array.getStatistics": {
      var ga = args[0];
      /* D13: 空配列では公式どおり min=+∞ / max=-∞ / 平均・標準偏差=NaN を変数へ書き込む。
         数値でない要素を含む配列は「真の原因」を示して止める */
      if (simIsUnk(ga)){ step(line, "Array.getStatistics：配列が実行時に決まるため、統計は計算できません"); return SIM_UNK; }
      if (Array.isArray(ga) && ga.length === 0){
        if (refs[1]) writeRef(S, refs[1], Infinity);
        if (refs[2]) writeRef(S, refs[2], -Infinity);
        if (refs[3]) writeRef(S, refs[3], NaN);
        if (refs[4]) writeRef(S, refs[4], NaN);
        step(line, "配列が空のため、最小は Infinity、最大は -Infinity、平均と標準偏差は NaN が変数に入ります（ImageJ の配列統計の定義どおり）");
        return SIM_UNK;
      }
      if (!Array.isArray(ga) || ga.some(function(x){ return typeof x !== "number"; }))
        throw simErr(line, "Array.getStatistics の引数が数値の配列ではありません", "統計を計算するには、すべての要素が数値の配列が必要です。文字列などを含む配列では計算できません。");
      var gmn = Math.min.apply(null, ga), gmx = Math.max.apply(null, ga);
      var gsum = ga.reduce(function(a, b){ return a + b; }, 0), gmean = gsum / ga.length;
      var gsum2 = ga.reduce(function(a, b){ return a + b * b; }, 0);
      var gsd = Math.sqrt(((ga.length * gsum2 - gsum * gsum) / ga.length) / (ga.length - 1.0));
      if (refs[1]) writeRef(S, refs[1], gmn);
      if (refs[2]) writeRef(S, refs[2], gmx);
      if (refs[3]) writeRef(S, refs[3], gmean);
      if (refs[4]) writeRef(S, refs[4], gsd);
      step(line, "配列の統計（最小 " + simFmt(gmn) + "、最大 " + simFmt(gmx) + "、平均 " + simFmt(gmean) + "、標準偏差 " + simFmt(gsd) + "）を変数に入れます");
      return SIM_UNK;
    }
    case "lengthOf": return typeof args[0] === "string" || Array.isArray(args[0]) ? args[0].length : (typeof args[0] === "number" ? simFmtNum(args[0]).length : SIM_UNK);
    case "lastIndexOf": return typeof args[0] === "string" ? args[0].lastIndexOf(String(args[1])) : SIM_UNK;
    case "trim": return typeof args[0] === "string" ? args[0].replace(/^[\x00-\x20]+/, "").replace(/[\x00-\x20]+$/, "") : SIM_UNK; /* Java の String.trim（U+0020 以下を除去） */
    case "toLowerCase": return typeof args[0] === "string" ? args[0].toLowerCase() : SIM_UNK;
    case "toUpperCase": return typeof args[0] === "string" ? args[0].toUpperCase() : SIM_UNK;
    case "charCodeAt": {
      /* D7: 位置が範囲外なら NaN を返さずエラーで止める（実 ImageJ の checkIndex の挙動） */
      /* R25-N22: 位置の文字列数値（"1" など）は simNumArg で数値として解釈する */
      if (typeof args[0] !== "string" || typeof simNumArg(args[1]) !== "number") return SIM_UNK;
      var cix = simInt(simNumArg(args[1]));
      if (cix < 0 || cix >= args[0].length)
        throw simErr(line, "charCodeAt の位置（" + cix + "）が文字列の長さ（" + args[0].length + "）の範囲外です", "位置は 0〜" + (args[0].length - 1) + " で指定します。ImageJ ではここでエラーになり止まります。");
      return args[0].charCodeAt(cix);
    }
    case "fromCharCode": {
      /* R24-N21: Functions.java の fromCharCode() は引数をすべてループ処理し、
         各値を (int) 切捨て変換したうえで、0〜65535 の範囲外では
         interp.error("Value (...) out of 0-65535 range") で止める。
         2つ目以降を捨てたり、範囲外を黙ってラップしたりしない。 */
      if (args.some(function(x){ return typeof x !== "number"; })) return SIM_UNK;
      var fcc = "";
      for (var fi = 0; fi < args.length; fi++){
        var fv = simInt(args[fi]);
        if (fv < 0 || fv > 65535) throw simErr(line, "fromCharCode の値（" + fv + "）が 0〜65535 の範囲外です", "Unicode 値は 0〜65535 で指定します。ImageJ ではここでエラーになり止まります。");
        fcc += String.fromCharCode(fv);
      }
      return fcc;
    }
    case "indexOf": return typeof args[0] === "string" ? args[0].indexOf(String(args[1]), typeof simNumArg(args[2]) === "number" ? simInt(simNumArg(args[2])) : 0) : SIM_UNK;
    case "substring": {
      if (typeof args[0] !== "string") return SIM_UNK;
      /* R25-N22: 開始・終了位置の文字列数値（"1" など）は simNumArg で数値として
         解釈する。型で弾いて「範囲超過」という虚偽の原因を表示しない。 */
      var sb = args[0], bi = typeof simNumArg(args[1]) === "number" ? simInt(simNumArg(args[1])) : args[1], bj = args.length > 2 ? (typeof simNumArg(args[2]) === "number" ? simInt(simNumArg(args[2])) : args[2]) : sb.length;
      if (typeof bi !== "number" || typeof bj !== "number" || bi < 0 || bj < bi || bj > sb.length)
        throw simErr(line, "substring の範囲（" + bi + "〜" + bj + "）が文字列の長さ（" + sb.length + "）を超えています", "ImageJ ではここでエラーになり止まります。lengthOf で長さを確認してください。");
      return sb.substring(bi, bj);
    }
    case "startsWith": return typeof args[0] === "string" && args[0].indexOf(String(args[1])) === 0 ? 1 : 0;
    case "endsWith": return typeof args[0] === "string" && (String(args[1]) === "" || args[0].slice(-String(args[1]).length) === String(args[1])) ? 1 : 0;
    case "replace": return simReplaceStr(args[0], args[1], args[2]);
    case "split": return simSplitStr(args[0], args.length > 1 ? args[1] : undefined, line);
    case "parseInt": {
      /* D12: 基数指定時は Java の Integer.parseInt と同じ厳密な変換（全体が数字でなければ NaN）。
         基数が 2〜36 の範囲外なら ImageJ は 10 として扱う */
      if (typeof args[0] !== "string" && typeof args[0] !== "number") return SIM_UNK;
      var ps = String(args[0]), radix = typeof args[1] === "number" ? simInt(args[1]) : 10;
      if (radix !== 10){
        if (radix < 2 || radix > 36) radix = 10;
        else {
          var pm = /^([+-]?)([0-9a-zA-Z]+)$/.exec(ps);
          if (!pm) return NaN;
          var pval = 0, pdigits = pm[2].toLowerCase();
          for (var pi = 0; pi < pdigits.length; pi++){
            var pdv = parseInt(pdigits[pi], 36);
            if (pdv >= radix) return NaN;
            pval = pval * radix + pdv;
          }
          return pm[1] === "-" ? -pval : pval;
        }
      }
      var pd = simParseDouble(ps);
      return isNaN(pd) ? NaN : Math.round(pd);
    }
    case "parseFloat": return simParseDouble(args[0]);
    case "d2s": {
      if (typeof args[0] !== "number") return SIM_UNK;
      if (args[0] !== args[0]) return "NaN";
      if (!isFinite(args[0])) return args[0] > 0 ? "Infinity" : "-Infinity";
      var dpc = typeof args[1] === "number" ? simInt(args[1]) : 0;
      if (dpc < 0) return simSci2(args[0], Math.min(9, -dpc)); /* 負の桁数は指数表記（sf[|dpc|]、上限9桁）になる（IJ.d2s） */
      dpc = Math.min(9, dpc); /* 小数部の上限は9桁 */
      return simFmtFixed(args[0], dpc, dpc === 0);
    }
    case "abs": return typeof args[0] === "number" ? Math.abs(args[0]) : SIM_UNK;
    case "floor": return typeof args[0] === "number" ? Math.floor(args[0]) : SIM_UNK;
    case "round": return typeof args[0] === "number" ? Math.round(args[0]) : SIM_UNK;
    case "sqrt": return typeof args[0] === "number" ? Math.sqrt(args[0]) : SIM_UNK;
    case "pow": return typeof args[0] === "number" && typeof args[1] === "number" ? Math.pow(args[0], args[1]) : SIM_UNK;
    case "exp": return typeof args[0] === "number" ? Math.exp(args[0]) : SIM_UNK;
    case "log": return typeof args[0] === "number" ? Math.log(args[0]) : SIM_UNK;
    case "atan2": return typeof args[0] === "number" && typeof args[1] === "number" ? Math.atan2(args[0], args[1]) : SIM_UNK;
    case "Math.min": case "Math.max": case "minOf": case "maxOf": {
      /* R24-N22: 公式ドキュメントの Math.min／Math.max は2引数形式のみで、
         minOf／maxOf と同じく個数違いはマクロエラーで止める。JS の Math の
         ように1引数・3引数を黙って計算しない（静的チェックと同じ文面で、
         実行時にも二重に止める）。 */
      if (args.length !== 2) throw simErr(line, name + " の引数の数が違います", "書式は " + name + "(n1, n2) で、引数は 2 個ですが、" + args.length + " 個渡しています。");
      var ns = args.filter(function(x){ return typeof x === "number"; });
      if (ns.length !== args.length) return SIM_UNK;
      return (name === "Math.min" || name === "minOf") ? Math.min.apply(null, ns) : Math.max.apply(null, ns);
    }
    case "random": {
      if (typeof args[0] === "string"){
        if (args[0] === "seed"){
          if (args.length < 2 || typeof args[1] !== "number" || !Number.isInteger(args[1]))
            throw simErr(line, "random(\"seed\", n) の seed の値が整数ではありません", "ImageJ では \"Seed not integer\" エラーになります。seed の後にはカンマと整数が必要です。");
          step(line, "乱数の seed（種）を " + args[1] + " に設定します。同じ seed からは同じ系列が再現されますが、このシミュレーションでは個々の乱数値は実行時に決まるものとして扱います");
          return SIM_UNK;
        }
        if (args[0] === "gaussian"){ /* Functions.random は "gaussian" も受け付ける（正規分布の乱数を返す） */
          step(line, "正規分布に従う乱数を使うため、この値は実行のたびに変わります"); return SIM_UNK;
        }
        throw simErr(line, "random の文字列引数が不正です", "ImageJ では 'seed' か 'gaussian' が必要です。乱数を得るには random()、正規分布は random(\"gaussian\")、seed の設定には random(\"seed\", 整数) と書きます。");
      }
      step(line, "乱数を使うため、この値は実行のたびに変わります"); return SIM_UNK;
    }
    case "sin": case "cos": case "tan": case "asin": case "acos": case "atan":
      return typeof args[0] === "number" ? Math[name](args[0]) : SIM_UNK;
    case "toString": return simFmt(args[0]);
    case "String.trim": return typeof args[0] === "string" ? args[0].trim() : SIM_UNK;
    case "selectWindow": {
      var tgt = null;
      S.images.forEach(function(m, i){ if (m.title === String(args[0])) tgt = i; });
      if (tgt === null) throw simErr(line, "ウィンドウ「" + args[0] + "」が見つかりません", "開かれている画像のタイトルと一致する必要があります。ImageJ ではここでエラーになり止まります。");
      S.active = tgt;
      step(line, "アクティブな画像を「" + args[0] + "」に切り替えます");
      return SIM_UNK;
    }
    case "getNumber": step(line, "数値の入力ダイアログが出ます。入力された値は実行時に決まります"); return SIM_UNK;
    case "getString": step(line, "文字列の入力ダイアログが出ます。入力された値は実行時に決まります"); return SIM_UNK;
    case "newImage": {
      /* R25-N20: Functions.java の newImage() は5引数（depth まで）か7引数
         （channels／slices／frames）のどちらかで、6引数の形式はない。6個目は
         黙って破棄せず、引数個数のエラーで止める（静的チェックの {min:5,max:7}
         をすり抜ける形のため、Math.min と同じく実行時にも検証する）。 */
      if (args.length === 6)
        throw simErr(line, "newImage の引数の数が違います", "書式は newImage(title, type, width, height, depth) の5個か、チャンネル・スライス・フレームを指定する7個で、6個の形式はありません。ImageJ ではここでエラーになり止まります。");
      /* R24-N6（D11 の残存表面）: Functions.java の newImage() は width／height／
         depth（7引数形式では channels／slices／frames）をすべて (int) 切捨て
         変換し、width<1 || height<1 で interp.error("Width or height < 1") と
         して止める。小数寸法の画像や 0 寸法の画像は存在しないため、小数の
         まま保持したり 0 を受理したりしない。寸法が <1 になる指定（負値・
         0・1未満の小数・NaN）は全寸法についてエラーで止める。 */
      var ndims = [];
      for (var ndi = 2; ndi < args.length; ndi++) ndims[ndi] = typeof args[ndi] === "number" ? simInt(args[ndi]) : args[ndi];
      for (var ndj = 2; ndj < args.length; ndj++)
        if (typeof ndims[ndj] === "number" && ndims[ndj] < 1)
          throw simErr(line, "newImage の寸法（" + simFmt(args[ndj]) + "）が 1 未満です", "幅・高さ・チャンネル数・スライス数・フレーム数は、(int) 切捨て変換後に 1 以上でなければなりません。ImageJ では \"Width or height < 1\" 相当のエラーになり止まります。");
      var ntl = String(args[0] || "Untitled"), nty = String(args[1] || "8-bit"), nw = ndims[2], nh = ndims[3];
      var nbit = /16/.test(nty) ? 16 : /32/.test(nty) ? 32 : /RGB/i.test(nty) ? 24 : 8;
      var nc2 = 1, nz2 = 1, nt2 = 1, nsl;
      if (args.length >= 7){ nc2 = ndims[4] || 1; nz2 = ndims[5] || 1; nt2 = ndims[6] || 1; nsl = nc2 * nz2 * nt2; }
      else nsl = ndims[4] || 1;
      /* 塗りの既定は白。ただし 16/32-bit は黒。type に white / black / ramp / noise を含めるとその指定が優先（IJ.createImage） */
      var mxv = nbit === 32 ? 1 : (Math.pow(2, nbit === 24 ? 8 : nbit) - 1);
      var nlow = nty.toLowerCase(), fillDesc, nbuckets;
      if (nlow.indexOf("ramp") >= 0){ nbuckets = [[0, mxv, 100]]; fillDesc = "左から右へ 0 から最大値まで増えるランプ（勾配）"; }
      else if (nlow.indexOf("noise") >= 0 || nlow.indexOf("random") >= 0){ nbuckets = null; fillDesc = "ランダムなノイズ（値は実行ごとに変わります）"; }
      else if (nlow.indexOf("black") >= 0 || ((nbit === 16 || nbit === 32) && nlow.indexOf("white") < 0)){ nbuckets = [[0, 0, 100]]; fillDesc = "真っ黒（すべて 0）"; }
      else { nbuckets = [[mxv, mxv, 100]]; fillDesc = "真っ白（すべて " + mxv + "）"; }
      var nim = { title: ntl, w: typeof nw === "number" ? nw : 512, h: typeof nh === "number" ? nh : 512, bit: nbit, channels: nc2, slices: nsl, zdim: args.length >= 7 ? nz2 : nsl, frames: nt2, slice: 1, buckets: nbit === 24 ? null : nbuckets, thr: null, mapOps: [], spatial: false, pix: {}, writtenPix: {}, kind: /RGB/i.test(nty) ? "RGB" : "グレースケール" };
      S.images.push(nim); S.active = S.images.length - 1;
      step(line, "新しい画像「" + ntl + "」（" + nty + "、" + nim.w + "×" + nim.h + (args.length >= 7 ? "、チャンネル " + nc2 + "・スライス " + nz2 + "・フレーム " + nt2 : (nsl > 1 ? "、スライス " + nsl : "")) + "）を作って開きます。中身は" + fillDesc + "です");
      return SIM_UNK;
    }
    case "Math.abs": case "Math.sqrt": case "Math.exp": case "Math.log": case "Math.log10": case "Math.floor": case "Math.ceil": case "Math.sin": case "Math.cos": case "Math.tan": case "Math.asin": case "Math.acos": case "Math.atan": {
      /* RA-5〜7: Math.sinh / Math.cosh / Math.tanh は実 ImageJ に存在しないため計算しない
         （リファレンス側で未対応として停止する） */
      if (typeof args[0] !== "number") return SIM_UNK;
      var mf = name.slice(5);
      return mf === "log10" ? Math.log10(args[0]) : Math[mf](args[0]);
    }
    case "Math.pow": case "Math.atan2": return typeof args[0] === "number" && typeof args[1] === "number" ? Math[name.slice(5)](args[0], args[1]) : SIM_UNK;
    case "Math.sqr": return typeof args[0] === "number" ? args[0] * args[0] : SIM_UNK;
    case "Math.round": return typeof args[0] === "number" ? Math.round(args[0]) : SIM_UNK;
    case "isNaN": return typeof args[0] === "number" ? (isNaN(args[0]) ? 1 : 0) : SIM_UNK;
    case "String.join": {
      if (!Array.isArray(args[0])) return SIM_UNK;
      var dl2 = typeof args[1] === "string" ? args[1] : ", ";
      /* P-N1: join の結果長を要素ごとに見積もる（巨大な実体を作らない） */
      var jparts = [], jtotal = 0;
      for (var ji = 0; ji < args[0].length; ji++){
        var jpart = simFmt(args[0][ji]);
        jtotal += jpart.length + (ji ? dl2.length : 0);
        if (jtotal > SIM_VALUE_LIMIT) return SIM_UNK;
        jparts.push(jpart);
      }
      return jparts.join(dl2);
    }
    case "String.pad": {
      if (args.length < 2 || typeof args[1] !== "number") return SIM_UNK;
      /* R24-N20: Functions.java の pad() は digits = (int)getLastArg()、
         数値の第1引数も intArg = (int)getExpression() と切捨て変換する。
         切り上げ／四捨五入で長さや値がずれることはない。 */
      var pdigits = simInt(args[1]);
      /* P-N1: 埋め草の目標長が上限を超える場合は実体を作らない */
      if (pdigits > SIM_VALUE_LIMIT) return SIM_UNK;
      var pv = String(typeof args[0] === "number" ? simInt(args[0]) : args[0]);
      while (pv.length < pdigits) pv = "0" + pv;
      return pv;
    }
    case "isNaN": return typeof args[0] === "number" && isNaN(args[0]) ? 1 : 0;
    case "getInfo": {
      /* D4: モデルで確定しているキーだけ実値を返し、それ以外のキーは従来どおり未確認 */
      if (args[0] === "image.title"){
        var imInf = img();
        if (imInf){ step(line, "画像のタイトル「" + imInf.title + "」を取得します（getTitle と同じ値です）"); return imInf.title; }
        return SIM_UNK;
      }
      if (args[0] === "log"){ step(line, "Log ウィンドウの現在の内容を取得します"); return S.log.join("\n"); }
      return SIM_UNK;
    }
    case "setThreshold": {
      var im6 = needImg("setThreshold"); var lo = args[0], hi = args[1];
      im6.thr = [lo, hi];
      var pct = simImgPct(im6, lo, hi);
      step(line, "閾値を " + simFmt(lo) + "〜" + simFmt(hi) + " に設定します。この範囲の画素が「対象（前景）」として選ばれます" + (simIsUnk(pct) ? "" : "（モデル画像では全体の約 " + Math.round(pct) + "%）") + "。この時点では画素値そのものは変わりません");
      return SIM_UNK;
    }
    case "setAutoThreshold": {
      var im7 = needImg("setAutoThreshold");
      if (!args.length || args[0] === undefined || simIsUnk(args[0])){
        /* 引数なしは旧方式 ISODATA2：閾値だけでなく前景の側も自動で選ばれる */
        var r02 = simIsodata2(im7);
        if (!r02){ step(line, "自動閾値（引数なし＝旧方式）で閾値を決めます（値は画像依存です）"); im7.thr = null; return SIM_UNK; }
        im7.thr = [r02.lo, r02.hi];
        var pct0 = simImgPct(im7, r02.lo, r02.hi);
        step(line, "引数なしの自動閾値（旧方式）で " + r02.lo + "〜" + r02.hi + " が前景に選ばれます" + (r02.lo === r02.t ? "（暗い背景に明るい対象がある画像として、閾値より明るい側が前景です）" : "（明るい背景に暗い対象がある画像として、閾値以下の側が前景です）") + (simIsUnk(pct0) ? "" : "。モデルでは前景は全体の約 " + Math.round(pct0) + "%") + "。実際の画像では値は前後します");
        return SIM_UNK;
      }
      var method = String(args[0]), dark = /dark/i.test(method) || args.some(function(x){ return typeof x === "string" && /dark/i.test(x); });
      var mName = method.trim().split(/\s+/)[0];
      if (mName === "MinError(I)") mName = "MinError";
      var METHODS = ["Default", "Huang", "Intermodes", "IsoData", "IJ_IsoData", "Li", "MaxEntropy", "Mean", "MinError", "Minimum", "Moments", "Otsu", "Percentile", "RenyiEntropy", "Shanbhag", "Triangle", "Yen"];
      if (METHODS.indexOf(mName) < 0) throw simErr(line, "しきい値の手法「" + mName + "」は存在しません", "使える手法は Default / Otsu / IsoData / IJ_IsoData / Huang / Triangle など17種類です。ImageJ ではここでエラーになり止まります。");
      var h7 = simHistNorm(im7);
      var t = mName === "Default" ? (h7 ? ijDefaultHist(h7) : SIM_UNK)
        : mName === "IJ_IsoData" ? (h7 ? ijIsoDataHist(h7) : SIM_UNK)
        : mName === "IsoData" ? (h7 ? ijRidlerHist(h7) : SIM_UNK)
        : simOtsu(im7);
      if (simIsUnk(t)){ step(line, "自動閾値（" + method + "）で閾値を決めます（値は画像依存です）"); im7.thr = null; return SIM_UNK; }
      if (typeof t === "number" && t < 0){ step(line, "自動閾値（" + method + "）では閾値が見つかりませんでした（分布が片側に寄っているためです）"); im7.thr = null; return SIM_UNK; }
      /* ヒストグラム法（Default / IJ_IsoData / IsoData）の t は 256 階調の単位なので、16/32bit では実値域へ戻す */
      if (im7.bit !== 8 && h7 && ["Default", "IJ_IsoData", "IsoData"].indexOf(mName) >= 0){ var rg7 = simImgRange(im7); if (rg7) t = Math.round(rg7[0] + t / 256 * (rg7[1] - rg7[0] + 1)); }
      var topV = Math.pow(2, im7.bit) - 1;
      im7.thr = dark ? [t + 1, topV] : [0, t];
      var pct2 = simImgPct(im7, im7.thr[0], im7.thr[1]);
      var exact = mName === "Default" || mName === "IJ_IsoData" || mName === "IsoData" || mName === "Otsu";
      step(line, "自動閾値（" + method + "）で閾値 " + (dark ? (t + 1) + "〜" + topV : "0〜" + t) + " が選ばれます" + (simIsUnk(pct2) ? "" : "（モデルでは前景は全体の約 " + Math.round(pct2) + "%）") + (!exact ? "。この手法の厳密な計算はモデルでは Otsu 法で近似しているため、実際の値とはずれます" : "。実際の画像では値は前後します"));
      return SIM_UNK;
    }
    case "getThreshold": {
      var im8 = needImg("getThreshold");
      if (refs[0]) writeRef(S, refs[0], im8.thr ? im8.thr[0] : -1);
      if (refs[1]) writeRef(S, refs[1], im8.thr ? im8.thr[1] : -1);
      step(line, im8.thr ? "現在の閾値 " + im8.thr[0] + "〜" + im8.thr[1] + " を変数に入れます" : "閾値は設定されていないため、変数には -1 が入ります");
      return SIM_UNK;
    }
    case "resetThreshold": { var im9 = needImg("resetThreshold"); im9.thr = null; step(line, "閾値の設定を解除します"); return SIM_UNK; }
    case "setMinAndMax": { var imSM = needImg("setMinAndMax"); imSM.dispMin = args[0]; imSM.dispMax = args[1]; step(line, "表示の明るさ範囲を " + simFmt(args[0]) + "〜" + simFmt(args[1]) + " にします（見た目だけの変更で、画素値は変わりません）"); return SIM_UNK; }
    case "getMinAndMax": {
      var imA = needImg("getMinAndMax");
      var hasDisp = typeof imA.dispMin === "number" && typeof imA.dispMax === "number";
      var rg = hasDisp ? [imA.dispMin, imA.dispMax] : simImgRangeNow(imA);
      if (refs[0]) writeRef(S, refs[0], rg ? rg[0] : SIM_UNK);
      if (refs[1]) writeRef(S, refs[1], rg ? rg[1] : SIM_UNK);
      step(line, "現在の表示範囲 " + (rg ? rg[0] + "〜" + rg[1] : "（不明）") + " を変数に入れます（画素値そのものの最小・最大ではありません）"); return SIM_UNK;
    }
    case "getStatistics": {
      var imB = needImg("getStatistics"); var st = simStats(imB);
      var names = ["面積", "平均", "最小値", "最大値", "標準偏差"];
      var roiFull = !S.roi || (S.roi.type === "rectangle" && S.roi.x === 0 && S.roi.y === 0 && S.roi.w === imB.w && S.roi.h === imB.h);
      var vals;
      /* D1: 面積は空間校正（ボクセルサイズ）で換算する。画素数のままなのは getRawStatistics 側 */
      var vscale = simVoxelAreaScale(imB);
      var calArea = function(px){ return (typeof px === "number" && typeof vscale === "number") ? px * vscale : SIM_UNK; };
      if (S.roi && !roiFull) vals = [calArea(simRoiArea(S.roi)), SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK]; /* ROI の面積は形から決まるが、内部の分布は分からない */
      else vals = st ? [calArea(st.area), Math.round(st.mean * 100) / 100, st.min, st.max, Math.round(st.std * 100) / 100] : [SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK];
      for (var gi = 0; gi < 5; gi++) if (refs[gi]) writeRef(S, refs[gi], vals[gi]);
      if (refs[5]){ if (S.roi && !roiFull) writeRef(S, refs[5], SIM_UNK); else { var h256 = simHist256(imB); writeRef(S, refs[5], h256 ? h256.map(function(p){ return Math.round(p / 100 * (st ? st.area : 0)); }) : SIM_UNK); } }
      step(line, (S.roi && !roiFull ? "選択中の ROI の統計" : "画像全体の統計") + "（" + names.map(function(nm, i){ return nm + " " + simFmt(vals[i]); }).join("、") + "）を変数に入れます" + (S.roi && !roiFull ? "（平均などは ROI 内の分布が分からないため、実行時に決まる値です）" : (imB.buckets ? "" : "（分布が不明な画像のため、値は目安です）")));
      return SIM_UNK;
    }
    case "getRawStatistics": {
      var imR = needImg("getRawStatistics"); var stR2 = simStats(imR);
      var roiFullR = !S.roi || (S.roi.type === "rectangle" && S.roi.x === 0 && S.roi.y === 0 && S.roi.w === imR.w && S.roi.h === imR.h);
      var valsR;
      if (S.roi && !roiFullR) valsR = [simRoiArea(S.roi), SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK];
      else valsR = stR2 ? [stR2.area, Math.round(stR2.mean * 100) / 100, stR2.min, stR2.max, Math.round(stR2.std * 100) / 100] : [SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK];
      for (var ri = 0; ri < 5; ri++) if (refs[ri]) writeRef(S, refs[ri], valsR[ri]);
      if (refs[5]){ if (S.roi && !roiFullR) writeRef(S, refs[5], SIM_UNK); else { var hR = simHist256(imR); writeRef(S, refs[5], hR ? hR.map(function(p){ return Math.round(p / 100 * (stR2 ? stR2.area : 0)); }) : SIM_UNK); } }
      step(line, "校正されていない統計（画素数 " + simFmt(valsR[0]) + "、平均 " + simFmt(valsR[1]) + "、最小値 " + simFmt(valsR[2]) + "、最大値 " + simFmt(valsR[3]) + "、標準偏差 " + simFmt(valsR[4]) + "）を変数に入れます" + (S.roi && !roiFullR ? "（平均などは ROI 内の分布が分からないため、実行時に決まる値です）" : ""));
      return SIM_UNK;
    }
    case "Stack.getStatistics": {
      var imS2 = needImg("Stack.getStatistics"); var stS = simStats(imS2);
      var roiFullS = !S.roi || (S.roi.type === "rectangle" && S.roi.x === 0 && S.roi.y === 0 && S.roi.w === imS2.w && S.roi.h === imS2.h);
      var valsS;
      if (S.roi && !roiFullS) valsS = [simRoiArea(S.roi), SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK];
      else valsS = stS ? [stS.area, Math.round(stS.mean * 100) / 100, stS.min, stS.max, Math.round(stS.std * 100) / 100] : [SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK, SIM_UNK];
      for (var si2 = 0; si2 < 5; si2++) if (refs[si2]) writeRef(S, refs[si2], valsS[si2]);
      if (refs[5]){ if (S.roi && !roiFullS) writeRef(S, refs[5], SIM_UNK); else { var hS = simHist256(imS2); writeRef(S, refs[5], hS ? hS.map(function(p){ return Math.round(p / 100 * (stS ? stS.area : 0)); }) : SIM_UNK); } }
      step(line, "スタック全体の統計（ボクセル数 " + simFmt(valsS[0]) + "、平均 " + simFmt(valsS[1]) + "、最小値 " + simFmt(valsS[2]) + "、最大値 " + simFmt(valsS[3]) + "、標準偏差 " + simFmt(valsS[4]) + "）を変数に入れます" + (S.roi && !roiFullS ? "（平均などは ROI 内の分布が分からないため、実行時に決まる値です）" : "（モデル画像は1枚のため、1枚分の統計と同じです）"));
      return SIM_UNK;
    }
    case "getHistogram": {
      var imC = needImg("getHistogram");
      /* R25-N20: 任意引数 histMin／histMax は組でのみ現れる（Functions.java は
         片方だけの4引数形では引数読み取りが破綻しエラーになる）。第4引数を
         黙って破棄せず、引数個数のエラーで止める。 */
      if (args.length === 4)
        throw simErr(line, "getHistogram の引数の数が違います", "任意引数の histMin と histMax は組で指定します。引数は 3 個（範囲指定なし）か 5 個（範囲指定あり）で、4 個の形式はありません。ImageJ ではここでエラーになり止まります。");
      /* R25-N20 併記: 5引数形の histMin／histMax は Functions.java では実際に
         使われる（getStatistics に範囲を渡して階級を切る）。8bit・RGB 画像では
         範囲指定自体がエラー（"16 or 32-bit image required to set histMin and
         histMax"）。16bit・32bit では下の専用経路で範囲どおりに集計する。 */
      var hMin = args.length >= 5 ? simNumArg(args[3]) : null, hMax = args.length >= 5 ? simNumArg(args[4]) : null;
      var hRangeOk = args.length >= 5 && typeof hMin === "number" && typeof hMax === "number" && hMax > hMin;
      if (args.length >= 5 && !simIsUnk(args[3]) && !simIsUnk(args[4]) && (imC.bit === 8 || imC.bit === 24))
        throw simErr(line, "getHistogram の histMin／histMax は 16bit・32bit 画像でのみ指定できます", "8bit・RGB 画像で階級範囲を指定すると、ImageJ では \"16 or 32-bit image required to set histMin and histMax\" エラーになり止まります。");
      if (simIsUnk(args[2])){
        if (refs[0]) writeRef(S, refs[0], SIM_UNK);
        if (refs[1]) writeRef(S, refs[1], SIM_UNK);
        step(line, "ヒストグラムを取得します（区間の数が実行時に決まるため、値は実行時に決まります）");
        return SIM_UNK;
      }
      var nBins = typeof args[2] === "number" ? simInt(args[2]) : 256;
      /* D6: nBins の検証。0以下を空配列でごまかさずエラーで止め、8bit・RGB では
         公式ドキュメントとリファレンスの注意どおり 256 を必須とする */
      if (typeof args[2] === "number"){
        if (nBins <= 0) throw simErr(line, "getHistogram の nBins（" + simFmt(args[2]) + "）が不正です", "nBins は正の整数でなければなりません。ImageJ ではここでエラーになり止まります。");
        if ((imC.bit === 8 || imC.bit === 24) && nBins !== 256) throw simErr(line, "getHistogram の nBins は、8bit・RGB画像では 256 でなければなりません（指定: " + nBins + "）", "公式ドキュメントの規定です。16bit・32bit画像では正の整数を指定できます。");
      }
      var hist = simHist256(imC), total = (typeof imC.w === "number" && typeof imC.h === "number") ? imC.w * imC.h : 262144;
      if (!hist){
        if (refs[0]) writeRef(S, refs[0], SIM_UNK);
        if (refs[1]) writeRef(S, refs[1], SIM_UNK);
        step(line, "ヒストグラムを取得します（この画像は分布が不明なため、値は実行時に決まります）");
        return SIM_UNK;
      }
      if (args.length >= 5){
        if (!hRangeOk){
          if (refs[0]) writeRef(S, refs[0], SIM_UNK);
          if (refs[1]) writeRef(S, refs[1], SIM_UNK);
          step(line, "ヒストグラムを取得します（階級範囲 histMin／histMax が確定できないため、値は実行時に決まります）");
          return SIM_UNK;
        }
        /* 範囲指定時は buckets（値域ごとの割合）を [histMin, histMax] の階級へ
           重なり割合で配分する。範囲外の画素は実 ImageJ でも数えられないため、
           合計を総画素数へ寄せる調整はしない。values は階級の開始値。 */
        var inc = (hMax - hMin) / nBins, countsR = [], valuesR = [];
        for (var bk = 0; bk < nBins; bk++){ countsR.push(0); valuesR.push(hMin + bk * inc); }
        imC.buckets.forEach(function(b){
          var bw = b[1] - b[0] + 1;
          for (var bk2 = 0; bk2 < nBins; bk2++){
            var ov = Math.min(b[1] + 1, hMin + (bk2 + 1) * inc) - Math.max(b[0], hMin + bk2 * inc);
            if (ov > 0) countsR[bk2] += b[2] / 100 * total * (ov / bw);
          }
        });
        countsR = countsR.map(function(cv){ return Math.round(cv); });
        if (refs[0]) writeRef(S, refs[0], valuesR);
        if (refs[1]) writeRef(S, refs[1], countsR);
        step(line, "ヒストグラム（" + nBins + " 区間、範囲 " + simFmt(hMin) + "〜" + simFmt(hMax) + "）を取得します。範囲外の画素は数えられません");
        return SIM_UNK;
      }
      var counts = [], values = [], per = 256 / nBins;
      for (var bi = 0; bi < nBins; bi++){
        var acc = 0; for (var bj = 0; bj < per; bj++) acc += hist ? hist[Math.floor(bi * per + bj)] || 0 : 0;
        counts.push(Math.round(acc / 100 * total)); values.push(Math.round(bi * per));
      }
      var csum = counts.reduce(function(a, b){ return a + b; }, 0);
      if (csum !== total && counts.length){ var mi = 0; counts.forEach(function(cv, i2){ if (cv > counts[mi]) mi = i2; }); counts[mi] += total - csum; }
      if (refs[0]) writeRef(S, refs[0], values);
      if (refs[1]) writeRef(S, refs[1], counts);
      step(line, "ヒストグラム（" + nBins + " 区間）を取得します。画素値ごとの画素数が分かります");
      return SIM_UNK;
    }
    case "getDimensions": case "Stack.getDimensions": {
      var imD = needImg(name);
      var dv = [imD.w, imD.h, imD.channels, (typeof imD.zdim === "number" ? imD.zdim : imD.slices), imD.frames];
      for (var di = 0; di < 5; di++) if (refs[di]) writeRef(S, refs[di], typeof dv[di] === "number" ? dv[di] : SIM_UNK);
      step(line, "画像の寸法（幅 " + simFmt(dv[0]) + "、高さ " + simFmt(dv[1]) + "、チャンネル " + dv[2] + "、スライス " + dv[3] + "、フレーム " + dv[4] + "）を変数に入れます");
      return SIM_UNK;
    }
    case "getVoxelSize": {
      var imVx = needImg(name);
      var vx = simVoxel(imVx);
      for (var vxi = 0; vxi < 3; vxi++) if (refs[vxi]) writeRef(S, refs[vxi], vx[vxi]);
      if (refs[3]) writeRef(S, refs[3], vx[3]);
      step(line, "ボクセルサイズ " + simFmt(vx[0]) + "×" + simFmt(vx[1]) + "×" + simFmt(vx[2]) + " " + vx[3] + " を取得します"); return SIM_UNK;
    }
    case "setVoxelSize": {
      var imVs = needImg(name);
      var vunit = typeof args[3] === "string" ? (args[3] === "um" ? "µm" : args[3]) : "pixels";
      imVs.voxel = [args[0], args[1], args[2], vunit];
      step(line, "ボクセルサイズを " + simFmt(args[0]) + "×" + simFmt(args[1]) + "×" + simFmt(args[2]) + " " + vunit + " に設定します。以後の測定はこの校正で換算されます"); return SIM_UNK;
    }
    case "makeRectangle": case "makeOval": {
      var imE = needImg(name);
      S.roi = { type: name === "makeRectangle" ? "rectangle" : "oval", x: args[0], y: args[1], w: args[2], h: args[3] };
      step(line, "位置 (" + simFmt(args[0]) + ", " + simFmt(args[1]) + ") に " + simFmt(args[2]) + "×" + simFmt(args[3]) + " の" + (name === "makeRectangle" ? "矩形" : "楕円") + " ROI を作成します");
      return SIM_UNK;
    }
    case "makeLine": {
      needImg(name);
      /* R25-N20（一次情報で裁定）: Functions.java の makeLine は3形式のみ。
         4引数＝直線、5引数＝第5引数が線幅の直線（公式ドキュメントにも
         makeLine(x1, y1, x2, y2, lineWidth) と明記）、6引数以上の偶数個＝
         折れ線の座標対。7個・9個のような奇数個（5を除く）は、余った座標の
         読み取りでカンマ期待エラーになるため、黙って直線にしない。 */
      if (args.length === 5){
        S.roi = { type: "line", x: args[0], y: args[1], w: Math.abs(args[2] - args[0]), h: Math.abs(args[3] - args[1]) };
        step(line, "(" + simFmt(args[0]) + ", " + simFmt(args[1]) + ") から (" + simFmt(args[2]) + ", " + simFmt(args[3]) + ") へ線幅 " + simFmt(typeof args[4] === "number" ? Math.round(args[4]) : args[4]) + " の直線 ROI を作成します");
        return SIM_UNK;
      }
      if (args.length % 2 !== 0)
        throw simErr(line, "makeLine の引数の数が違います", "makeLine は座標の組（偶数個）か、座標4個＋線幅1個（計5個）で指定します。" + args.length + " 個では最後の座標の組が揃いません。ImageJ ではここでエラーになり止まります。");
      if (args.length >= 6 && args.length % 2 === 0){
        /* 折れ線の頂点は Functions.java の makeLine が (int)Math.round で
           整数化する（4引数の直線形の座標は double のままなので対象外）。
           makePolygon の頂点も同じく (int)Math.round。 */
        var xsL = [], ysL = [];
        for (var li = 0; li < args.length; li += 2){ xsL.push(typeof args[li] === "number" ? Math.round(args[li]) : args[li]); ysL.push(typeof args[li + 1] === "number" ? Math.round(args[li + 1]) : args[li + 1]); }
        if (xsL.every(function(v){ return typeof v === "number"; }) && ysL.every(function(v){ return typeof v === "number"; })){
          S.roi = { type: "polyline", x: Math.min.apply(null, xsL), y: Math.min.apply(null, ysL), w: Math.max.apply(null, xsL) - Math.min.apply(null, xsL), h: Math.max.apply(null, ysL) - Math.min.apply(null, ysL) };
          step(line, "頂点 " + xsL.length + " 個の折れ線 ROI を作成します");
          return SIM_UNK;
        }
      }
      S.roi = { type: "line", x: args[0], y: args[1], w: Math.abs(args[2] - args[0]), h: Math.abs(args[3] - args[1]) };
      step(line, "(" + simFmt(args[0]) + ", " + simFmt(args[1]) + ") から (" + simFmt(args[2]) + ", " + simFmt(args[3]) + ") へ直線 ROI を作成します");
      return SIM_UNK;
    }
    /* makePolygon の頂点は (int)Math.round で整数化される（Functions.java） */
    case "makePolygon": {
      needImg(name);
      /* R25-N19: Functions.java の makePolygon は全頂点を PolygonRoi に保持し、
         外接矩形は全頂点から決まる。第1頂点だけを保持して残りを破棄せず、
         makeSelection("polygon")／makeLine 折れ線形と同じく、全頂点の
         最小・範囲で外接矩形を計算する。座標の組が揃わない奇数個は、実物では
         引数読み取りが破綻してエラーになるため、余りを黙って捨てない。 */
      if (args.length % 2 !== 0)
        throw simErr(line, "makePolygon の引数の数が違います", "makePolygon は x, y の組で頂点を指定します。" + args.length + " 個では最後の頂点の組が揃いません。ImageJ ではここでエラーになり止まります。");
      var xsP = [], ysP = [];
      for (var ppi = 0; ppi + 1 < args.length; ppi += 2){
        xsP.push(typeof args[ppi] === "number" ? Math.round(args[ppi]) : args[ppi]);
        ysP.push(typeof args[ppi + 1] === "number" ? Math.round(args[ppi + 1]) : args[ppi + 1]);
      }
      if (xsP.length && xsP.every(function(v){ return typeof v === "number"; }) && ysP.every(function(v){ return typeof v === "number"; }))
        S.roi = { type: "polygon", x: Math.min.apply(null, xsP), y: Math.min.apply(null, ysP), w: Math.max.apply(null, xsP) - Math.min.apply(null, xsP), h: Math.max.apply(null, ysP) - Math.min.apply(null, ysP) };
      else
        S.roi = { type: "polygon", x: xsP[0], y: ysP[0], w: SIM_UNK, h: SIM_UNK };
      step(line, "頂点 " + xsP.length + " 個の多角形 ROI を作成します");
      return SIM_UNK;
    }
    case "makeSelection": {
      needImg(name);
      var selKind = typeof args[0] === "string" ? args[0].trim().toLowerCase() : "";
      var selMap = { rectangle: "rectangle", rect: "rectangle", oval: "oval", ellipse: "oval", polygon: "polygon", freehand: "freehand", traced: "traced", line: "line", polyline: "polyline", freeline: "freeline", angle: "angle", composite: "composite", point: "point" };
      var selTypeName = selMap[selKind];
      if (!selTypeName){ S.roi = { type: "selection", x: 0, y: 0, w: SIM_UNK, h: SIM_UNK }; step(line, "点の集まりから ROI を作成します（種類「" + simFmt(args[0]) + "」の種別コードはモデルでは確定できません）"); return SIM_UNK; }
      var bx = 0, by = 0, bw = SIM_UNK, bh = SIM_UNK;
      if (Array.isArray(args[1]) && Array.isArray(args[2]) && args[1].length && args[1].every(function(v){ return typeof v === "number"; }) && args[2].every(function(v){ return typeof v === "number"; })){
        bx = Math.min.apply(null, args[1]); by = Math.min.apply(null, args[2]);
        bw = Math.max.apply(null, args[1]) - bx; bh = Math.max.apply(null, args[2]) - by;
      }
      S.roi = { type: selTypeName, x: bx, y: by, w: bw, h: bh };
      step(line, "種類「" + args[0] + "」の ROI を点の集まりから作成します");
      return SIM_UNK;
    }
    case "selectionType": {
      if (!S.roi){ step(line, "ROI は選択されていません（-1 が返ります）"); return -1; }
      var codes = { rectangle: 0, oval: 1, polygon: 2, freehand: 3, traced: 4, line: 5, polyline: 6, freeline: 7, angle: 8, composite: 9, point: 10 };
      if (codes[S.roi.type] === undefined){ step(line, "選択中の ROI の種類コードを取得します"); return SIM_UNK; }
      step(line, "選択中の ROI は " + S.roi.type + "（コード " + codes[S.roi.type] + "）です"); return codes[S.roi.type];
    }
    case "getBoundingRect": {
      var imBR = needImg(name);
      var br = S.roi ? [S.roi.x, S.roi.y, S.roi.w, S.roi.h] : [0, 0, imBR.w, imBR.h];
      for (var bri = 0; bri < 4; bri++) if (refs[bri]) writeRef(S, refs[bri], br[bri]);
      step(line, S.roi ? "選択の外接矩形（x " + simFmt(br[0]) + "、y " + simFmt(br[1]) + "、幅 " + simFmt(br[2]) + "、高さ " + simFmt(br[3]) + "）を変数に入れます" : "選択がないため、画像全体の範囲（x 0、y 0、幅 " + simFmt(br[2]) + "、高さ " + simFmt(br[3]) + "）を変数に入れます");
      return SIM_UNK;
    }
    case "getSelectionBounds": {
      var imF = needImg(name);
      var b = S.roi ? [S.roi.x, S.roi.y, S.roi.w, S.roi.h] : [0, 0, imF.w, imF.h];
      for (var si = 0; si < 4; si++) if (refs[si]) writeRef(S, refs[si], b[si]);
      step(line, S.roi ? "ROI の外接矩形（x " + simFmt(b[0]) + "、y " + simFmt(b[1]) + "、幅 " + simFmt(b[2]) + "、高さ " + simFmt(b[3]) + "）を変数に入れます" : "ROI がないため、画像全体の範囲を変数に入れます");
      return SIM_UNK;
    }
    case "roiManager": return simRoiManager(S, e, args, H);
    case "setSlice": {
      /* R24-N18: Functions.java の setSlice() は n = (int)getArg() と切捨て
         変換する。小数のスライス番号という状態は存在しないため、変換後の
         整数で範囲判定と保持を行う（範囲外の扱いは従来どおり警告して保持）。 */
      var imG = needImg("setSlice"); var nn = typeof simNumArg(args[0]) === "number" ? simInt(simNumArg(args[0])) : args[0]; /* R25-N22: 文字列数値も数値として解釈する */
      if (typeof nn === "number" && (nn < 1 || nn > imG.slices)) warn(line, "setSlice(" + nn + ") はスライス数 " + imG.slices + " の範囲外です", "ImageJ では範囲外の指定は無視されるか、端に寄せられます。");
      else { imG.slice = nn; step(line, "表示スライスを " + nn + " 枚目に切り替えます"); }
      return SIM_UNK;
    }
    case "getSliceNumber": { var imH = needImg("getSliceNumber"); step(line, "現在のスライス番号 " + imH.slice + " を取得します"); return imH.slice; }
    case "Stack.getPosition": {
      var imI = needImg(name);
      /* R25-N18: 保持している実位置（チャンネル／スライス／フレーム）を返す。
         チャンネル・フレームに常時 1 を書き込むことはしない。 */
      var gpc = typeof imI.channel === "number" ? imI.channel : 1, gpf = typeof imI.frame === "number" ? imI.frame : 1;
      if (refs[0]) writeRef(S, refs[0], gpc); if (refs[1]) writeRef(S, refs[1], imI.slice); if (refs[2]) writeRef(S, refs[2], gpf);
      step(line, "スタック内の現在位置（チャンネル " + gpc + "、スライス " + imI.slice + "、フレーム " + gpf + "）を変数に入れます"); return SIM_UNK;
    }
    case "Stack.setPosition": {
      var imJ = needImg(name);
      /* R25-N18: Functions.java の setPosition は3引数すべてを (int) 変換して
         img.setPosition(channel, slice, frame) に渡す。チャンネル／フレームを
         黙って破棄せず、スライスと同じ規律（simInt 切捨て＋次元の範囲内なら
         保持、範囲外はその次元だけ現位置を保つ）で3次元すべてを保持する。
         R25-N22: 文字列数値の引数も simNumArg で数値として解釈する。 */
      var spc = typeof simNumArg(args[0]) === "number" ? simInt(simNumArg(args[0])) : args[0];
      var spos = typeof simNumArg(args[1]) === "number" ? simInt(simNumArg(args[1])) : args[1];
      var spf = typeof simNumArg(args[2]) === "number" ? simInt(simNumArg(args[2])) : args[2];
      var maxC = typeof imJ.channels === "number" ? imJ.channels : 1;
      var maxZ = typeof imJ.zdim === "number" ? imJ.zdim : imJ.slices;
      var maxF = typeof imJ.frames === "number" ? imJ.frames : 1;
      if (typeof spc === "number" && spc >= 1 && spc <= maxC) imJ.channel = spc;
      if (typeof spos === "number" && spos >= 1 && spos <= maxZ) imJ.slice = spos;
      if (typeof spf === "number" && spf >= 1 && spf <= maxF) imJ.frame = spf;
      step(line, "スタックの表示位置をチャンネル " + (typeof imJ.channel === "number" ? imJ.channel : 1) + "、スライス " + imJ.slice + "、フレーム " + (typeof imJ.frame === "number" ? imJ.frame : 1) + " に切り替えます");
      return SIM_UNK;
    }
    case "getPixel": {
      var imK = needImg("getPixel");
      if(args[0]<0||args[1]<0||args[0]>=imK.w||args[1]>=imK.h)return 0;
      var key = args[0] + "," + args[1];
      if (Object.prototype.hasOwnProperty.call(imK.pix, key)){
        /* pix にはモデルで予め与えられた値と、このコードの setPixel 等で書き込んだ値が
           混在するため、書き込みを追跡して由来を区別する（NX-N20） */
        var writtenByCode = !!(imK.writtenPix && imK.writtenPix[key]);
        step(line, "(" + args[0] + ", " + args[1] + ") の画素値 " + imK.pix[key] + (writtenByCode ? "（このコードで書き込んだ値）" : "（モデルで予め与えられた値）") + "を読みます");
        return imK.pix[key];
      }
      step(line, "(" + simFmt(args[0]) + ", " + simFmt(args[1]) + ") の画素値を読みます（値は画像依存です）");
      return SIM_UNK;
    }
    case "setPixel": {
      /* 兄弟表面: Functions.java の setPixel() は x・y を (int) 切捨て変換し、
         整数画像では値も (int) 変換して putPixel する（32-bit 浮動小数画像
         だけ値を double のまま書く）。小数の座標のままキーにすると、実在
         しない画素位置へ書いたことになり、整数座標の読み取りと食い違う。
         なお getPixel は小座標では補間値を返す実仕様のため対象外。 */
      var imL = needImg("setPixel");
      var spx = typeof args[0] === "number" ? simInt(args[0]) : args[0], spy = typeof args[1] === "number" ? simInt(args[1]) : args[1];
      var spv = (imL.bit === 32 || typeof args[2] !== "number") ? args[2] : simInt(args[2]);
      if (typeof imL.w === "number" && (spx < 0 || spx >= imL.w || spy < 0 || spy >= imL.h)){ warn(line, "setPixel の座標が画像の範囲外です", "範囲外への書き込みは ImageJ では無視されます。"); return SIM_UNK; }
      imL.pix[spx + "," + spy] = spv;
      if (!imL.writtenPix) imL.writtenPix = {};
      imL.writtenPix[spx + "," + spy] = 1;
      step(line, "(" + simFmt(spx) + ", " + simFmt(spy) + ") の画素値を " + simFmt(spv) + " に書き換えます");
      return SIM_UNK;
    }
    case "changeValues": {
      var imM = needImg("changeValues");
      simPushOp(imM, function(v){ return v >= args[0] && v <= args[1] ? args[2] : v; });
      if (imM.pix) Object.keys(imM.pix).forEach(function(k){ var pv = imM.pix[k]; if (typeof pv === "number" && pv >= args[0] && pv <= args[1]){ imM.pix[k] = args[2]; if (!imM.writtenPix) imM.writtenPix = {}; imM.writtenPix[k] = 1; } });
      step(line, "画素値が " + simFmt(args[0]) + "〜" + simFmt(args[1]) + " の画素を、すべて " + simFmt(args[2]) + " に置き換えます");
      return SIM_UNK;
    }
    case "getResult": {
      /* R25-N20（一次情報で裁定）: Functions.java の getResult は第3引数に
         結果表のタイトル（文字列）を取る形が実在する（getResult(column, row,
         "Title")）。数値の第3引数はタイトルとして解釈され、該当する表が
         なければ "table not found" 相当のエラーになる。黙って破棄せず、
         このモデルにある唯一の結果表「Results」以外は名指しで止める。 */
      if (args.length > 2 && !simIsUnk(args[2])){
        var gtitle = typeof args[2] === "string" ? args[2] : simFmt(args[2]);
        if (gtitle !== "Results")
          throw simErr(line, "getResult で指定された結果表「" + gtitle + "」が見つかりません", "第3引数は結果表のタイトル（文字列）です。このモデルにある結果表は「Results」だけです。ImageJ でも、存在しないタイトルの表を指定するとエラーになり止まります。");
      }
      var gri = args.length > 1 ? args[1] : null;
      if (gri === null || gri === undefined) gri = S.results.length - 1;
      if (typeof gri !== "number" || simIsUnk(gri)){ step(line, "結果表の値を取得します（行が実行時に決まるため、値は省略します）"); return SIM_UNK; }
      gri = simInt(gri); /* 行は (int) 切捨て変換。Math.floor は負の小数で (int) と食い違う */
      if (gri < 0 || gri >= S.results.length) throw simErr(line, "getResult の行（" + gri + "）が結果表の範囲外です", "結果表は現在 " + S.results.length + " 行です。ImageJ では \"Row (" + gri + ") out of range\" エラーになり止まります。");
      var row = S.results[gri];
      if (!row || row[args[0]] === undefined){ step(line, "結果表に列「" + args[0] + "」がないため、値は NaN になります"); return NaN; }
      /* D8: 文字列のセルは数値として解釈し直す（数値化できない文字列は NaN。
         実 ImageJ の ResultsTable.getValue は Double.parseDouble で変換するため） */
      if (typeof row[args[0]] === "string"){
        var gnum = simParseDouble(row[args[0]]);
        step(line, "結果表の " + gri + " 行目「" + args[0] + "」は文字列 \"" + row[args[0]] + "\" のため、数値としては " + simFmt(gnum) + " が返ります");
        return gnum;
      }
      step(line, "結果表の " + gri + " 行目「" + args[0] + "」= " + simFmt(row[args[0]]) + " を取得します");
      return row[args[0]];
    }
    case "setResult": {
      var ri = args[1];
      if (typeof ri !== "number" || simIsUnk(ri)){ step(line, "結果表への書き込みですが、行番号が実行時に決まるため、記録先の行は特定できません（書き込み自体は行われます）"); return SIM_UNK; }
      ri = simInt(ri);
      if (ri < 0) throw simErr(line, "setResult の行（" + ri + "）が不正です", "行番号は 0 以上で指定してください。ImageJ ではここでエラーになり止まります。");
      /* D5: 行を追加できるのは末尾（現在の行数と一致）まで。それより先は捏造せずエラーで止める */
      if (ri > S.results.length) throw simErr(line, "setResult の行（" + ri + "）が結果表の範囲外です", "結果表は現在 " + S.results.length + " 行です。新しい行を作れるのは末尾（行番号 " + S.results.length + "）だけです。ImageJ では \"Row out of range\" エラーになり止まります。");
      if (ri === S.results.length) S.results.push({ Label: img() ? img().title : "" });
      S.results[ri][args[0]] = args[2];
      step(line, "結果表の " + ri + " 行目に「" + args[0] + "」= " + simFmt(args[2]) + " を書き込みます");
      return SIM_UNK;
    }
    case "getResultLabel": {
      /* D9: 範囲外の行は未確認でごまかさずエラーで止める */
      var lrow = args[0];
      if (typeof lrow !== "number" || simIsUnk(lrow)){ step(line, "結果表のラベルを取得します（行が実行時に決まるため、値は省略します）"); return SIM_UNK; }
      lrow = simInt(lrow);
      if (lrow < 0 || lrow >= S.results.length) throw simErr(line, "getResultLabel の行（" + lrow + "）が結果表の範囲外です", "結果表は現在 " + S.results.length + " 行です。ImageJ では \"Row out of range\" エラーになり止まります。");
      var rr = S.results[lrow];
      step(line, "結果表 " + lrow + " 行目のラベル「" + (rr ? rr.Label : "") + "」を取得します");
      return rr ? rr.Label : SIM_UNK;
    }
    case "getProfile": {
      /* D10: 選択が無い・直線系/矩形でない選択では、実 ImageJ どおりエラーで止める */
      needImg("getProfile");
      if (!S.roi) throw simErr(line, "getProfile には選択（ROI）が必要です", "直線・折れ線または矩形の選択がないと、ImageJ では \"Selection required\" エラーになり止まります。先に makeLine や makeRectangle で選択を作ってください。");
      if (["line", "polyline", "freeline", "rectangle"].indexOf(S.roi.type) < 0 && S.roi.type !== "selection")
        throw simErr(line, "getProfile は直線系または矩形の選択でのみ使えます（現在の選択: " + S.roi.type + "）", "ImageJ では直線・折れ線または矩形以外の選択ではエラーになります。");
      step(line, "選択中の直線や ROI に沿った画素値の並び（プロファイル）を取得します（値は画像依存です）");
      return SIM_UNK;
    }
    case "File.exists": {
      step(line, "明示したモデル内でファイルの有無を調べます。外部の存在は未確定です");
      if (typeof args[0] !== "string") return SIM_UNK;
      if (Object.prototype.hasOwnProperty.call(S.files,args[0])) return 1;
      return Object.values(S.directories).some(dir=>args[0].startsWith(dir)) ? 0 : SIM_UNK;
    }
    case "Color.getLut": { for (var ci = 0; ci < 3; ci++) if (refs[ci]) writeRef(S, refs[ci], new Array(256).fill(0).map(function(_, i){ return i; })); step(line, "現在の表示 LUT（色の対応表）を変数に入れます"); return SIM_UNK; }
  }
  if (name.indexOf("Dialog.") === 0){
    if (name === "Dialog.create") step(line, "入力ダイアログを作り始めます");
    else if (name === "Dialog.show") step(line, "ダイアログが表示され、ユーザの入力を待ちます（モデルでは既定値で進むものとして扱います）");
    else if (name === "Dialog.getNumber" || name === "Dialog.getString" || name === "Dialog.getChoice"){ step(line, "ダイアログの入力値を取得します（値は入力依存です）"); return SIM_UNK; }
    else step(line, "ダイアログに項目を追加します");
    return SIM_UNK;
  }
  if (name.indexOf("File.") === 0) throw simErr(line, "未確認：" + name + " はモデルで未対応です", "ファイル状態を推測して後続を実行しません。");
  if (!f0 && !Object.prototype.hasOwnProperty.call(SIM_EXTRA, name)){
    if (Object.prototype.hasOwnProperty.call(SIM_OFFICIAL, name)) throw simErr(line, "未確認：" + name + " はモデルで未対応です", "後続の状態・出力は生成しません。");
    throw simErr(line, "「" + name + "」は定義されていない関数です", "関数リファレンスにも、このコード内の function 定義にもありません。綴り違いか、定義のし忘れの可能性があります。");
  }
  throw simErr(line, "未確認：" + name + " はモデルで未対応です", "後続の状態・出力は生成しません。");
}
function writeRef(S, name, v){ if (S.writeVar) S.writeVar(name, v); else S.scopes[0][name] = v; }
function simRoiManager(S, e, args, H){
  var cmd = String(args[0] || "").toLowerCase(), line = e.line, step = H.step, warn = H.warn;
  if (cmd === "count"){ step(line, "ROI Manager の登録数は " + S.roiList.length + " 件です"); return S.roiList.length; }
  if (cmd === "select"){
    var ix = typeof simNumArg(args[1]) === "number" ? simInt(simNumArg(args[1])) : args[1]; /* 選択番号も (int) 切捨て変換。小数の番号で roiList[1.5] のような undefined を ROI にしない。R25-N22: 文字列数値（"0" など）も数値として解釈する */
    if (typeof ix !== "number" || ix < 0 || ix >= S.roiList.length){ warn(line, "roiManager(\"select\", " + simFmt(ix) + ") の番号が登録数 " + S.roiList.length + " の範囲外です", "ImageJ では選択が変わらないか、エラーになります。ループの上限と登録数を確認してください。"); return SIM_UNK; }
    S.roi = S.roiList[ix]; step(line, "ROI Manager の " + ix + " 番目の ROI を選択します"); return SIM_UNK;
  }
  if (cmd === "add"){
    if (!S.roi){ warn(line, "roiManager(\"add\") ですが、選択中の ROI がありません", "先に ROI を描くか makeRectangle などで作成してください。"); return SIM_UNK; }
    S.roiList.push(S.roi); step(line, "現在の ROI を ROI Manager に登録します（登録数は " + S.roiList.length + " 件になります）"); return SIM_UNK;
  }
  if (cmd === "reset"){ S.roiList = []; step(line, "ROI Manager の登録をすべて消します"); return SIM_UNK; }
  if (cmd === "deselect"){ S.roi = null; step(line, "ROI の選択を解除します"); return SIM_UNK; }
  if (cmd === "measure"){
    S.roiList.forEach(function(r){ S.results.push(simResultRow(S, r)); });
    step(line, "登録された全 ROI（" + S.roiList.length + " 件）を測定し、結果表に行を追加します"); return SIM_UNK;
  }
  throw simErr(line, "未確認：ROI Manager の操作「" + simFmt(args[0]) + "」はモデルで未対応です", "後続の状態・出力は生成しません。");
}
/* ROI の面積：矩形は幅×高さ、楕円は画素数の近似（π×幅×高さ/4）。直線・多角形は外接矩形の面積ではないため確定しない */
function simRoiArea(roi){
  if (!roi || typeof roi.w !== "number" || typeof roi.h !== "number") return SIM_UNK;
  if (roi.type === "rectangle") return roi.w * roi.h;
  if (roi.type === "oval") return Math.round(Math.PI * roi.w * roi.h / 4);
  return SIM_UNK;
}
function simResultRow(S, roi){
  var im = S.images[S.active];
  var st = im ? simStats(im) : null;
  var roiFull = !roi || (im && roi.type === "rectangle" && roi.x === 0 && roi.y === 0 && roi.w === im.w && roi.h === im.h);
  var useImg = !roi || roiFull;
  /* D1 の兄弟表面: 測定結果の Area も空間校正で換算する */
  var vscale2 = im ? simVoxelAreaScale(im) : SIM_UNK;
  var calArea2 = function(px){ return (typeof px === "number" && typeof vscale2 === "number") ? px * vscale2 : SIM_UNK; };
  return { Label: im ? im.title : "", Area: roi ? calArea2(simRoiArea(roi)) : (st ? calArea2(st.area) : SIM_UNK), Mean: useImg && st ? Math.round(st.mean * 100) / 100 : SIM_UNK, Min: useImg && st ? st.min : SIM_UNK, Max: useImg && st ? st.max : SIM_UNK };
}


/* --- run() コマンドの説明と効果 --- */
function simFoldOps(img){
  if (!img.buckets || !img.mapOps.length){ img.mapOps = []; return; }
  img.buckets = img.buckets.map(function(b){
    var a = simApplyOps(img, b[0]), c = simApplyOps(img, b[1]);
    return [Math.min(a, c), Math.max(a, c), b[2]];
  }).sort(function(x, y){ return x[0] - y[0]; });
  img.mapOps = [];
}
var SIM_CMD_KEYS = ["8-bit", "16-bit", "32-bit", "RGB Color", "Convert to Mask", "Make Binary", "Invert", "Measure", "Analyze Particles", "Watershed", "Gaussian Blur", "Median", "Mean", "Despeckle", "Sharpen", "Find Edges", "Remove Outliers", "Unsharp Mask", "Convolve", "Subtract Background", "Z Project", "Split Channels", "Merge Channels", "Duplicate", "Close All", "Close", "Crop", "Scale", "Rotate 90 Degrees Right", "Rotate 90 Degrees Left", "Flip Horizontally", "Flip Vertically", "Set Scale", "Set Measurements", "Scale Bar", "Enhance Contrast", "Apply LUT", "Threshold", "Erode", "Dilate", "Fill Holes", "Skeletonize", "Outline", "Distance Map", "Find Maxima", "Plot Profile", "Histogram", "FFT", "Bandpass Filter", "Select All", "Select None", "Restore Selection", "Create Selection", "Draw", "Fill", "Clear", "Grays", "Fire", "Ice", "Spectrum", "Add", "Subtract", "Multiply", "Divide", "Min", "Max", "AND", "OR", "XOR", "Gamma", "Log", "Exp", "Square", "Square Root", "Abs", "Stack to Images", "Images to Stack", "Line Width", "Properties", "Rotate", "Translate", "Canvas Size", "Enlarge", "Save", "Straighten", "Interpolate"];
function simLev(a, b){
  var d = [], i, j;
  for (i = 0; i <= b.length; i++) d.push([i]);
  for (j = 0; j <= a.length; j++) d[0][j] = j;
  for (i = 1; i <= b.length; i++) for (j = 1; j <= a.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1));
  return d[b.length][a.length];
}
function simRunCmd(S, cmdRaw, opt, line, H){
  var step = H.step, warn = H.warn;
  function img(){ return H.img(); }
  function needImg(what){ return H.needImg(line, what); }
  if (typeof cmdRaw !== "string") throw simErr(line, "未確認：run()のコマンドが未確定です", "後続の画像状態を確定できないため停止します。");
  if (simIsUnk(opt)) throw simErr(line, "未確認：run()のオプションが未確定です", "処理結果を推測しません。");
  var cmd = cmdRaw.trim(), base = cmd.replace(/\.\.\.$/, "").trim();
  // A command can change pixels even when its high-level description is known.
  // Never retain pre-command point samples as if they were its result.
  var nonPixel = ["Measure", "Set Scale", "Set Measurements", "Select All", "Select None", "Restore Selection", "Create Selection", "Grays", "Fire", "Ice", "Spectrum", "Threshold", "Plot Profile", "Histogram", "Save", "Line Width", "Properties", "Close", "Close All"];
  if (nonPixel.indexOf(base) < 0 && img()) {
    img().pix = {};
    img().writtenPix = {};
    step(line, "このコマンド後の個別画素値は未確認です。以前の画素値は引き継ぎません");
    var spatialCommands = ["Gaussian Blur", "Median", "Mean", "Despeckle", "Sharpen", "Find Edges", "Remove Outliers", "Unsharp Mask", "Convolve", "Subtract Background", "Watershed", "Erode", "Dilate", "Fill Holes", "Skeletonize", "Outline", "Distance Map", "Scale Bar", "Draw", "Fill", "Clear", "Rotate", "Translate", "Canvas Size"];
    if (spatialCommands.indexOf(base) >= 0) { img().buckets = null; img().mapOps = []; }
  }
  opt = typeof opt === "string" ? opt : "";
  function optNum(key){ var m = new RegExp(key + "=(-?[0-9.]+(?:e[+-]?[0-9]+)?)", "i").exec(opt); return m ? parseFloat(m[1]) : null; }
  function mathOp(label, f, desc){
    var im = needImg("run(\"" + cmd + "\")");
    simPushOp(im, function(v){
      var r = f(v);
      if (im.bit === 8 || im.bit === 16){
        var mxv = Math.pow(2, im.bit) - 1;
        r = Math.round(r);
        if (r < 0) r = 0;
        if (r > mxv) r = mxv;
      }
      return r;
    });
    step(line, desc);
    return SIM_UNK;
  }
  switch (base){
    case "8-bit": case "16-bit": case "32-bit": {
      var im = needImg("run(\"" + cmd + "\")"), target = parseInt(base, 10);
      if (im.bit === target){ step(line, "すでに " + target + " ビットなので、画素値は変わりません"); return SIM_UNK; }
      var oldBit = im.bit;
      if (target === 32){ im.bit = 32; step(line, "32 ビット（浮動小数）に変換します。画素値はそのまま（" + (oldBit === 8 ? "0〜255 のまま" : "値の範囲は変わらず") + "）実数として扱われます"); return SIM_UNK; }
      if (oldBit === 8 && target === 16){
        /* TypeConverter.convertByteToShort は値をそのまま保持する（拡大しない） */
        im.bit = 16;
        step(line, "16 ビットに変換します。画素値は 0〜255 のまま保持されます（257 倍に広がることはありません）。より細かい階調が使えるようになるのは、この後に計算や描画で新しい値が生まれてからです");
        return SIM_UNK;
      }
      /* 16→8 / 32→8 / 32→16 は、現在の実際の値域を新しい範囲へ換算する（doScaling）。
         分布（buckets）が無い画像では現在の値域をモデルが保持していないため、
         範囲の数値を引用せず未確定として述べる（NX-N12） */
      var to = Math.pow(2, target) - 1, cMin = 0, cMax = to, rangeKnown = false;
      if (im.buckets){
        var rgr = simImgRangeNow(im);
        if (rgr){ cMin = rgr[0]; cMax = rgr[1]; rangeKnown = true; }
        if (rgr && rgr[1] > rgr[0]){
          var scale = (to + 1) / (rgr[1] - rgr[0] + 1);
          im.buckets = im.buckets.map(function(b){
            return [Math.max(0, Math.min(to, Math.round((b[0] - rgr[0]) * scale))), Math.max(0, Math.min(to, Math.round((b[1] - rgr[0]) * scale))), b[2]];
          });
        } else {
          im.buckets = im.buckets.map(function(b){ return [0, 0, b[2]]; });
        }
      }
      im.mapOps = [];
      im.bit = target;
      if (rangeKnown) step(line, target + " ビットに変換します。現在の値の範囲（" + cMin + "〜" + cMax + "）が 0〜" + to + " に換算されます" + (target === 8 ? "。階調は粗くなり、元には戻せません" : ""));
      else step(line, target + " ビットに変換します。現在の値の範囲はモデルでは未確定です" + (target === 8 ? "。階調は粗くなり、元には戻せません" : ""));
      return SIM_UNK;
    }
    case "RGB Color": { var im2 = needImg("run"); step(line, "RGB カラーに変換します（表示・保存用）。解析の測定は通常、グレースケールのまま行います"); im2.kind = "RGB"; return SIM_UNK; }
    case "Convert to Mask": case "Make Binary": {
      var im3 = needImg("run(\"" + cmd + "\")");
      if (!im3.thr){
        var r03 = simIsodata2(im3);
        if (r03){ im3.thr = [r03.lo, r03.hi]; step(line, "閾値が未設定のため、ImageJ の自動閾値（旧方式）で決まります。モデル画像では " + r03.lo + "〜" + r03.hi + " を前景として計算します"); }
        else { im3.thr = [0, 127]; step(line, "閾値が未設定のため、ImageJ が自動で決めた閾値を使います（モデルでは簡易に 0〜127 を前景として計算）"); }
      }
      var fg = simImgPct(im3, im3.thr[0], im3.thr[1]);
      var lo = im3.thr[0], hi = im3.thr[1];
      if (im3.buckets && !simIsUnk(fg)) im3.buckets = [[0, 0, Math.round((100 - fg) * 10) / 10], [255, 255, Math.round(fg * 10) / 10]];
      im3.mapOps.push({ f: function(v){ return v >= lo && v <= hi ? 255 : 0; } });
      im3.kind = "2値（マスク）"; im3.thr = null; im3.bit = 8;
      step(line, "二値化します。閾値 " + lo + "〜" + hi + " の画素は 255（白）、それ以外はすべて 0（黒）になります" + (simIsUnk(fg) ? "" : "（モデルでは白が全体の約 " + Math.round(fg) + "%）") + "。中間の灰色は消えます");
      return SIM_UNK;
    }
    case "Invert": {
      var im4 = needImg("run(\"Invert\")"), mx = Math.pow(2, im4.bit) - 1;
      simPushOp(im4, function(v){ return mx - v; });
      step(line, "画素値を反転します（" + mx + " − 値）。たとえば暗い画素 30 は " + (mx - 30) + " に、明るい画素 200 は " + (mx - 200) + " になります");
      return SIM_UNK;
    }
    case "Measure": {
      var im5 = needImg("run(\"Measure\")");
      var row = simResultRow(S, S.roi);
      S.results.push(row);
      step(line, "測定を実行し、結果表に1行追加します" + (S.roi ? "（対象は選択中の ROI）" : "（対象は画像全体）") + "。モデルでは 面積 " + simFmt(row.Area) + "、平均 " + simFmt(row.Mean) + "、最小 " + simFmt(row.Min) + "、最大 " + simFmt(row.Max) + " です（測定項目は Set Measurements の設定に依存します）");
      return SIM_UNK;
    }
    case "Analyze Particles": {
      var im6 = needImg("run(\"Analyze Particles\")");
      var mSz = /size=([0-9.]+)-([0-9.]+|Infinity)/.exec(opt);
      if (im6.kind !== "2値（マスク）" && !im6.thr) warn(line, "Analyze Particles の前に閾値設定（または二値化）がありません", "閾値がないと対象を背景と区別できず、正しく数えられません。setAutoThreshold や setThreshold を前に置いてください。");
      step(line, "粒子解析を実行します。二値化された白い連結領域を1つずつ数え、大きさや形状を結果表に出します" + (mSz ? "（対象の大きさは " + mSz[1] + "〜" + mSz[2] + "）" : "") + (/summarize/.test(opt) ? "。summarize 指定のため、件数などの要約が Summary 表にも出ます" : "") + "。件数そのものは画像依存のため、モデルでは算出できません");
      return SIM_UNK;
    }
    case "Watershed": {
      var im7 = needImg("run(\"Watershed\")");
      if (im7.kind !== "2値（マスク）") warn(line, "Watershed は二値画像に使う処理です", "先に Convert to Mask などで二値化してください。");
      step(line, "くっついた粒子を、細いくびれの部分で切り離します（距離変換を使った分離処理）");
      return SIM_UNK;
    }
    case "Gaussian Blur": { var im8 = needImg("run"); im8.spatial = true; var sg = optNum("sigma"); step(line, "ガウスぼかしをかけます" + (sg ? "（sigma=" + sg + "）" : "") + "。画素が周囲となじみ、細かいノイズが減る一方、輪郭も少し甘くなります"); return SIM_UNK; }
    case "Median": case "Mean": { var im9 = needImg("run"); im9.spatial = true; var rd = optNum("radius"); step(line, (base === "Median" ? "メディアン" : "平均") + "フィルタをかけます" + (rd ? "（半径 " + rd + "）" : "") + "。ノイズが減ります"); return SIM_UNK; }
    case "Despeckle": { var imA = needImg("run"); imA.spatial = true; step(line, "孤立したノイズ画素を取り除きます（メディアンフィルタ相当）"); return SIM_UNK; }
    case "Sharpen": { var imB = needImg("run"); imB.spatial = true; step(line, "輪郭を強調します。ノイズも目立ちやすくなります"); return SIM_UNK; }
    case "Find Edges": { var imC = needImg("run"); imC.spatial = true; step(line, "明るさの変化が大きい場所（輪郭）だけを抽出します。平らな部分はほぼ黒になります"); return SIM_UNK; }
    case "Remove Outliers": { var imD = needImg("run"); imD.spatial = true; step(line, "周囲から極端に外れた画素（飛び値ノイズ）だけを周囲の値で置き換えます"); return SIM_UNK; }
    case "Unsharp Mask": { var imE = needImg("run"); imE.spatial = true; step(line, "アンシャープマスクで輪郭を強調します"); return SIM_UNK; }
    case "Convolve": { var imF = needImg("run"); imF.spatial = true; step(line, "指定したカーネルで畳み込み（フィルタ処理）をします"); return SIM_UNK; }
    case "Subtract Background": { var imG = needImg("run"); imG.spatial = true; var rb = optNum("rolling"); step(line, "背景のムラ（シェーディング）を推定して差し引きます" + (rb ? "（rolling ball 半径 " + rb + "）" : "") + "。対象の明るさが均一な背景の上にそろいます"); return SIM_UNK; }
    case "Z Project": {
      var imH = needImg("run(\"Z Project\")");
      var proj = /projection=\[([^\]]+)\]/.exec(opt), pn = proj ? proj[1] : "Max Intensity";
      if (imH.slices <= 1 && imH.frames <= 1){ warn(line, "Z Project はスタック（複数スライス）が必要です", "ImageJ では \"Stack required\" エラーになり、投影は行われません。今の画像はスライスが1枚だけです。"); step(line, "Z 投影（" + pn + "）は実行されません（スタックが必要です）"); return SIM_UNK; }
      imH.slices = 1;
      step(line, "スタックを Z 方向に投影して1枚にします（" + pn + "）" + (pn.indexOf("Max") >= 0 ? "。各画素で最も明るいスライスの値が残り、焦点の合った信号を拾いやすい反面、ノイズの最大値も拾います" : pn.indexOf("Sum") >= 0 ? "。各画素でスライスの合計になり、全体に明るくなります" : "。各画素でスライスの平均を取ります"));
      return SIM_UNK;
    }
    case "Split Channels": {
      var imI = needImg("run(\"Split Channels\")");
      if (imI.channels <= 1){ warn(line, "Split Channels は複合画像（複数チャンネル）が必要です", "ImageJ では \"Multichannel image required\" エラーになり、分割は行われません。今の画像はチャンネルが1つだけです。"); step(line, "チャンネル分割は実行されません（複合画像が必要です）"); return SIM_UNK; }
      var parts = [];
      for (var ci = 0; ci < imI.channels; ci++){ var cp = Object.assign({}, imI, { title: "C" + (ci + 1) + "-" + imI.title, channels: 1, pix: {}, writtenPix: {}, buckets: imI.buckets ? imI.buckets.slice() : null, mapOps: imI.mapOps.slice() }); parts.push(cp); }
      S.images.splice.apply(S.images, [S.active, 1].concat(parts)); S.active = S.active;
      step(line, "チャンネルごとに " + parts.length + " 枚の画像へ分割します");
      return SIM_UNK;
    }
    case "Merge Channels...": step(line, "複数チャンネルを1枚の複合画像に合成します"); return SIM_UNK;
    case "Duplicate": {
      var imJ = needImg("run(\"Duplicate\")");
      var tm = /title=([^\s]+)/.exec(opt);
      var dup = Object.assign({}, imJ, { title: tm ? tm[1] : imJ.title + "-1", pix: {}, writtenPix: {}, buckets: imJ.buckets ? imJ.buckets.slice() : null, mapOps: imJ.mapOps.slice() });
      S.images.push(dup);
      step(line, "画像のコピー「" + dup.title + "」を作ります（元画像は変わりません）");
      return SIM_UNK;
    }
    case "Close All": S.images = []; S.active = -1; step(line, "開いている画像をすべて閉じます"); return SIM_UNK;
    case "Close": {
      var imK = img();
      if (imK){ step(line, "画像「" + imK.title + "」を閉じます"); S.images.splice(S.active, 1); if (S.active >= S.images.length) S.active = S.images.length - 1; }
      return SIM_UNK;
    }
    case "Crop": {
      var imL = needImg("run(\"Crop\")");
      if (S.roi && typeof S.roi.w === "number"){ imL.w = S.roi.w; imL.h = S.roi.h; step(line, "ROI の範囲で切り抜きます（新しい大きさは " + imL.w + "×" + imL.h + "）"); S.roi = null; }
      else step(line, "切り抜きですが、ROI がないため変化はありません");
      return SIM_UNK;
    }
    case "Scale": { var imM = needImg("run"); var fx = optNum("x"); if (fx && typeof imM.w === "number"){ imM.w = Math.round(imM.w * fx); imM.h = Math.round(imM.h * fx); } step(line, "画像を拡大・縮小します" + (fx ? "（倍率 " + fx + "、新しい大きさ " + imM.w + "×" + imM.h + "）" : "")); imM.spatial = true; return SIM_UNK; }
    case "Rotate 90 Degrees Right": case "Rotate 90 Degrees Left": { var imN = needImg("run"); var tmp = imN.w; imN.w = imN.h; imN.h = tmp; step(line, "画像を90度回転します（幅と高さが入れ替わります）"); return SIM_UNK; }
    case "Flip Horizontally": case "Flip Vertically": needImg("run"); step(line, "画像を" + (base.indexOf("Horizontally") >= 0 ? "左右" : "上下") + "に反転します（画素値そのものは変わりません）"); return SIM_UNK;
    case "Set Scale": { var ds = optNum("distance"), kn = optNum("known");
      /* D1 の兄弟表面: Set Scale も同じ空間校正なので、ボクセルサイズへ反映する */
      var imSS = img();
      if (imSS && ds && kn){ var um = /unit=([^\s]+)/.exec(opt); var uSS = um ? (um[1] === "um" ? "µm" : um[1]) : simVoxel(imSS)[3]; imSS.voxel = [kn / ds, kn / ds, simVoxel(imSS)[2], uSS]; }
      step(line, "スケール校正を設定します" + (ds && kn ? "（" + ds + " px = " + kn + " 単位）" : "") + "。以後の測定結果は実寸で出ます"); return SIM_UNK; }
    case "Set Measurements": step(line, "測定する項目（面積・平均・重心など）を設定します。以後の Measure の結果表に反映されます"); return SIM_UNK;
    case "Scale Bar": { var bw = optNum("width"); step(line, "スケールバーを画像に焼き込みます" + (bw ? "（幅 " + bw + " 単位）" : "") + "。画素として描かれるため、後から消せません"); return SIM_UNK; }
    case "Enhance Contrast": {
      var imO = needImg("run(\"Enhance Contrast\")");
      var rg = simImgRange(imO);
      if (rg && rg[1] > rg[0]){ var mn2 = rg[0], sc = 255 / (rg[1] - rg[0]); simPushOp(imO, function(v){ return (v - mn2) * sc; }); }
      step(line, "コントラストを広げます。最も暗い画素が 0、最も明るい画素が 255 付近になるよう画素値を引き伸ばします");
      return SIM_UNK;
    }
    case "Apply LUT": step(line, "現在の表示 LUT（色の対応）を画素値に適用します。閾値が設定されている場合は、その見た目が画素値に焼き込まれます"); return SIM_UNK;
    case "Threshold": warn(line, "run(\"Threshold...\") はダイアログを開く操作です", "マクロでは通常、setThreshold や setAutoThreshold で数値を直接指定します。"); step(line, "Threshold ダイアログが開きます"); return SIM_UNK;
    case "Erode": case "Dilate": case "Fill Holes": case "Skeletonize": case "Outline": case "Distance Map": {
      var imP = needImg("run(\"" + cmd + "\")");
      if (imP.kind !== "2値（マスク）") warn(line, cmd + " は二値画像向けの処理です", "先に二値化してください。グレースケールでは意図しない結果になります。");
      var txts = { "Erode": "白い領域の輪郭を1画素ずつ削ります（細い部分は消えます）", "Dilate": "白い領域の輪郭を1画素ずつ広げます（近い粒子はくっつきます）", "Fill Holes": "白い領域の中の黒い穴を埋めます", "Skeletonize": "白い領域を1画素幅の骨格（中心線）まで細くします", "Outline": "白い領域の輪郭線だけを残します", "Distance Map": "各画素について、背景までの距離を明るさにした画像に変換します" };
      step(line, txts[base]); return SIM_UNK;
    }
    case "Find Maxima": needImg("run"); step(line, "局所的に最も明るい点（極大点）を検出します。件数は画像とノイズ許容値に依存するため、モデルでは算出できません"); return SIM_UNK;
    case "Plot Profile": needImg("run"); step(line, "プロファイルのグラフが新しいウィンドウに表示されます"); return SIM_UNK;
    case "Histogram": needImg("run"); step(line, "ヒストグラムのウィンドウが新しく開きます"); return SIM_UNK;
    case "FFT": case "Bandpass Filter": { var imQ = needImg("run"); imQ.spatial = true; step(line, "周波数領域での処理（" + base + "）を行います。周期的なノイズの除去などに使います"); return SIM_UNK; }
    case "Select All": { var imR = needImg("run"); S.roi = { type: "rectangle", x: 0, y: 0, w: imR.w, h: imR.h }; step(line, "画像全体を ROI として選択します"); return SIM_UNK; }
    case "Select None": S.roi = null; step(line, "ROI の選択を解除します"); return SIM_UNK;
    case "Restore Selection": step(line, "直前の ROI を復元します"); return SIM_UNK;
    case "Create Selection": step(line, "閾値の範囲から、輪郭に沿った ROI を作成します"); return SIM_UNK;
    case "Draw": step(line, "現在の ROI の輪郭を画像に描き込みます"); return SIM_UNK;
    case "Fill": step(line, "現在の ROI の中を前景色で塗りつぶします"); return SIM_UNK;
    case "Clear": step(line, "現在の ROI の中を背景色で消去します"); return SIM_UNK;
    case "Grays": case "Fire": case "Ice": case "Spectrum": step(line, "表示 LUT を「" + base + "」に変えます（見た目だけの変更で、画素値は変わりません）"); return SIM_UNK;
    case "Add": { var adv = Math.trunc(optNum("value") || 0); return mathOp(base, function(v){ return v + adv; }, "全画素に " + adv + " を足します。255 を超えた分は 255 で止まります（8ビットの場合）"); }
    case "Subtract": { var sbv = Math.trunc(optNum("value") || 0); return mathOp(base, function(v){ return v - sbv; }, "全画素から " + sbv + " を引きます。0 未満は 0 で止まります"); }
    case "Multiply": { var mlv = optNum("value"); if (mlv === null) mlv = 1; return mathOp(base, function(v){ return v * mlv; }, "全画素に " + mlv + " を掛けます。明るさ全体が比例して変わります"); }
    case "Divide": {
      var dvv = optNum("value"); if (dvv === null) dvv = 1;
      if (dvv === 0){
        var imdv = needImg("run(\"Divide\")");
        if (imdv.bit !== 32){ step(line, "0 で割る指定です。ImageJ では 8/16 ビット画像では何も実行されず、画素値は変わりません"); return SIM_UNK; }
        imdv.buckets = null; imdv.mapOps = [];
        step(line, "0 で割る指定です。32 ビットでは 0 でない画素は Infinity、0 の画素は NaN になります（以降の画素値の計算はモデルでは追えません）");
        return SIM_UNK;
      }
      return mathOp(base, function(v){ return v / dvv; }, "全画素を " + dvv + " で割ります");
    }
    case "Gamma": {
      var gv = optNum("value"); if (gv === null) gv = 1;
      if (gv < 0.05 || gv > 5){ step(line, "Gamma の値 " + gv + " は範囲（0.05〜5.0）外のため、ダイアログがキャンセルされ、画像は変わりません"); return SIM_UNK; }
      return mathOp(base, function(v){ return 255 * Math.pow(Math.max(0, v) / 255, gv); }, "ガンマ補正（値 " + gv + "）をかけます。中間の明るさが" + (gv < 1 ? "持ち上がり" : "沈み") + "、黒と白の端はほぼ変わりません");
    }
    case "Min": { var mnv = optNum("value"); if (mnv === null) mnv = 0; mnv = Math.trunc(mnv); return mathOp(base, function(v){ return Math.max(v, mnv); }, "画素値の下限を " + mnv + " にします。" + mnv + " より暗い画素はすべて " + mnv + " まで持ち上がります（Min は「最小値をこの値にする」という意味です）"); }
    case "Max": { var mxu = optNum("value"); if (mxu === null) mxu = 0; mxu = Math.trunc(mxu); return mathOp(base, function(v){ return Math.min(v, mxu); }, "画素値の上限を " + mxu + " にします。" + mxu + " より明るい画素はすべて " + mxu + " まで下がります（Max は「最大値をこの値にする」という意味です）"); }
    case "AND": case "OR": case "XOR": {
      /* 値は2進数文字列として解釈される（ImageMath: Integer.parseInt(value, 2)） */
      var bm = /value=([^\s]+)/i.exec(opt), braw = bm ? bm[1] : null;
      if (braw === null || !/^[01]+$/.test(braw)){ step(line, base + " の値" + (braw ? "「" + braw + "」" : "") + "は2進数として読めないため、ImageJ ではエラー（Binary number required）になり実行されません"); return SIM_UNK; }
      var bv2 = parseInt(braw, 2);
      var bf = base === "AND" ? function(v){ return v & bv2; } : base === "OR" ? function(v){ return v | bv2; } : function(v){ return v ^ bv2; };
      return mathOp(base, bf, "全画素にビット演算 " + base + "（2進数 " + braw + " ＝ 10進数 " + bv2 + "）を行います");
    }
    case "Set": { var stv = optNum("value"); if (stv === null) stv = 0; return mathOp(base, function(){ return stv; }, "全画素を " + stv + " に設定します"); }
    case "Reciprocal": {
      var imrc = needImg("run(\"Reciprocal\")");
      if (imrc.bit !== 32){ step(line, "Reciprocal は 32 ビット画像専用のため、この画像ではキャンセルされ、何も変わりません"); return SIM_UNK; }
      if (imrc.buckets && simImgPct(imrc, 0, 0) > 0){ imrc.buckets = null; imrc.mapOps = []; step(line, "逆数を取ります。0 の画素は NaN になります（以降の画素値の計算はモデルでは追えません）"); return SIM_UNK; }
      return mathOp(base, function(v){ return v === 0 ? NaN : 1 / v; }, "各画素の逆数（1÷値）を取ります");
    }
    case "Macro": step(line, "指定したマクロ式を全画素に適用します（式の内容はモデルでは追えません）"); return SIM_UNK;
    case "Log": return mathOp(base, function(v){ return v > 0 ? Math.log(v) * (255 / Math.log(255)) : 0; }, "画素値に対数変換をかけます。暗い部分の差が広がり、最大値は最大値のままです");
    case "Exp": return mathOp(base, function(v){ return Math.exp(v / (255 / Math.log(255))); }, "画素値に指数変換をかけます。明るい部分の差が広がります");
    case "Square": return mathOp(base, function(v){ return v * v; }, "画素値を2乗します（8ビットでは16以上の画素がすべて255になります）");
    case "Square Root": return mathOp(base, function(v){ return Math.sqrt(Math.max(0, v)); }, "画素値の平方根を取ります（8ビットでは全体に値が小さくなります。引き伸ばしたい場合は先に32ビット化します）");
    case "Abs": return mathOp(base, function(v){ return Math.abs(v); }, "画素値の絶対値を取ります");
    case "Stack to Images": step(line, "スタックをスライスごとの別画像にばらします"); return SIM_UNK;
    case "Images to Stack": step(line, "開いている画像を1つのスタックにまとめます"); return SIM_UNK;
    case "Line Width": step(line, "線の太さの初期設定を変えます"); return SIM_UNK;
    case "Properties": step(line, "画像のプロパティ（寸法・単位など）のダイアログが開きます"); return SIM_UNK;
    case "Rotate": { var imS = needImg("run"); imS.spatial = true; step(line, "画像を任意の角度で回転します。はみ出し部分は切り取られ、隅には背景が入ります"); return SIM_UNK; }
    case "Translate": step(line, "画像をずらします（ずれた分、反対側には背景が入ります）"); return SIM_UNK;
    case "Canvas Size": step(line, "キャンバス（画像の枠）の大きさを変えます"); return SIM_UNK;
    case "Enlarge": step(line, "ROI を指定量だけ拡大・縮小します"); return SIM_UNK;
    case "Save": step(line, "画像を現在のファイル名で上書き保存します"); return SIM_UNK;
    case "Straighten": step(line, "選択した直線が水平になるよう画像を回転・切り抜きします"); return SIM_UNK;
    case "Interpolate": step(line, "ROI の輪郭をなめらかに補間します"); return SIM_UNK;
  }
  var best = null, bestD = 3;
  SIM_CMD_KEYS.forEach(function(k){ var d = simLev(base.toLowerCase(), k.replace(/\.\.\.$/, "").toLowerCase()); if (d < bestD){ bestD = d; best = k; } });
  throw simErr(line, "未確認：メニューコマンド「" + cmd + "」はモデルで未対応です", best ? "もしかして「" + best + "」ですか。後続結果は生成しません。" : "実在・効果を確認できないため、後続結果は生成しません。");
}

/* ---------- terms ---------- */
var termFilter = { cat: "all", kw: "" };

export{simParse,simLex,simRunProgram,simRunPaths,simFmt,simIsUnk};
