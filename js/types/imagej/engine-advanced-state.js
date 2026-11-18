/* 高度モード差分（ブロックB3）: ImageJ 状態関数の高度ハンドラ。
 * 画像・ROI・結果表・プロット・オーバーレイ等のモデル状態に触れる関数群。
 * 書式は engine-advanced.js のコメントを参照。一次情報は
 * engine-advanced-pure.js のコメントと同じ。
 *
 * 本ファイルの裁定メモ（正本は一次情報: 公式 Built-in Macro Functions と
 * 本体 Functions.java）:
 * - 意味論が一次情報で確定できないものは {unverified}、モデルに保持できない
 *   ものは {unsupported} に倒し、近似値は返さない。
 * - 変数へ書き戻す形式の関数は、基礎エンジンの REF_FNS に含まれる名前
 *   （getPixelSize, getCursorLoc, getLine, getSelectionCoordinates, getLut,
 *   getDateAndTime, getLocationAndSize, getDisplayedArea, Roi.getBounds,
 *   Roi.getCoordinates, Roi.getPosition）は refs 経由で実装できる。
 *   FIX-IJB で、高度有効時にだけ効く REF 拡張（engine-advanced.js の
 *   advancedRefMaps を engine.js の evCall が参照する形）により、次も
 *   書き戻し実装に格上げした: Plot.getLimits（明示設定時のみ）、
 *   Roi.getFloatBounds, Roi.getContainedPoints, Roi.getFeretPoints,
 *   Roi.getSplineAnchors, Overlay.getBounds, Fit.getEquation,
 *   Stack.getUnits, Stack.getDisplayMode, Stack.getActiveChannels,
 *   Stack.getOrthoViews, Stack.getOrthoViewsIDs, toScaled, toUnscaled,
 *   Table.showArrays。Plot.getFrameBounds は描画メトリクス依存のため
 *   REF 拡張でも確定せず未検証のまま（理由は当該エントリ参照）。
 * - プロパティ形式（File.name, Image.title 等）は基礎のパーサがパス式として
 *   評価し SIM_UNK を返すため到達しない。呼び出し形式で登録したものは、
 *   File.open 等で本ファイルが記録した直近ファイルに対してのみ働く。
 */

/* ---------- 共通ヘルパー ---------- */

/* 引数個数の検証（基礎の文面慣行: 「X の引数の数が違います」＋書式） */
function arity(H, e, name, args, min, max, form) {
  if (args.length >= min && args.length <= max) return;
  throw H.err(name + " の引数の数が違います",
    "書式は " + form + " で、引数は " + (min === max ? min + " 個" : min + "〜" + max + " 個") + "ですが、" + args.length + " 個渡しています。");
}
/* simStrArg 相当: 文字列はそのまま、数値は ImageJ の数値表記へ。それ以外は null */
function strA(H, v) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return H.fmt(v);
  return null;
}
function needStr(H, e, name, v, what) {
  const s = strA(H, v);
  if (s === null) throw H.err("未確認：" + name + " の" + what + "が未確定です",
    "文字列として確定できない値が渡されたため、状態を推測して後続を実行しません。");
  return s;
}
function intA(H, v) { const n = H.numArg(v); return typeof n === "number" ? H.int(n) : n; }
/* 状態変更系で未確定引数を止める（基礎のトップガードと同じ文面） */
function guardUnk(H, name, args) {
  for (const a of args) if (H.isUnk(a)) throw H.err("未確認：" + name + " の状態変更引数が未確定です",
    "変更箇所や結果を推測して後続を実行しません。");
}
function clone(v) { return structuredClone(v); }
/* スタック次元: 基礎慣行どおり zdim 未保持なら slices を z 数とみなす */
function zdimOf(im) { return typeof im.zdim === "number" ? im.zdim : im.slices; }
function stackSizeOf(im) {
  return (typeof im.channels === "number" ? im.channels : 1) * zdimOf(im) *
    (typeof im.frames === "number" ? im.frames : 1);
}
function chanOf(im) { return typeof im.channel === "number" ? im.channel : 1; }
function frameOf(im) { return typeof im.frame === "number" ? im.frame : 1; }

/* ---------- 結果表（Results＋名前つき表）の解決 ---------- */

function resultsTitle(S) { return S.__resultsTitle || "Results"; }
function tmeta(S, title) {
  if (!S.__tmeta) S.__tmeta = {};
  if (!S.__tmeta[title]) S.__tmeta[title] = { cols: [], selStart: -1, selEnd: -1 };
  return S.__tmeta[title];
}
/* title 省略時は「現在の表」（Table.create 等で切り替わる）。create=true のとき
 * 存在しない名前つき表を空で作る。見つからなければ基礎慣行の文面で止める */
function resolveTable(S, e, H, name, title, create) {
  let t = title;
  if (t === null || t === undefined) t = S.__currentTable || resultsTitle(S);
  if (t === resultsTitle(S)) return { title: t, rows: S.results };
  if (!S.__tables) S.__tables = {};
  if (!Object.prototype.hasOwnProperty.call(S.__tables, t)) {
    if (create) { S.__tables[t] = []; return { title: t, rows: S.__tables[t] }; }
    throw H.err(name + " で指定された結果表「" + t + "」が見つかりません",
      "ImageJ では \"" + t + "\" table not found エラーになり止まります。Table.create で表を作ってから使ってください。");
  }
  return { title: t, rows: S.__tables[t] };
}
function headingsOf(S, title, rows) {
  // 結果表の第1列は常に行ラベル（Label）。行が Label キーを持たない場合
  // （setColumn で作った行など）でも、見出しとしては先頭に置く。
  const hs = ["Label"];
  const meta = S.__tmeta && S.__tmeta[title];
  if (meta) for (const c of meta.cols) if (!hs.includes(c)) hs.push(c);
  for (const r of rows) if (r) for (const k of Object.keys(r)) if (!hs.includes(k)) hs.push(k);
  return hs;
}
function noteCol(S, title, col) { const m = tmeta(S, title); if (!m.cols.includes(col)) m.cols.push(col); }
/* getResult／getResultString と同じ読み取り（Table.get／Table.getString 共用）。
 * 列が無い: 数値読みは NaN、文字列読みは "null"（Label 列だけは行ラベル）。 */
function cellGet(S, e, H, name, args, asString) {
  const col = needStr(H, e, name, args[0], "列名");
  let title = null;
  if (args.length > 2) {
    title = strA(H, args[2]);
    if (title === null) { H.step(e.line, name + "：表のタイトルが未確定のため、値は省略します"); return H.unk; }
  }
  const t = resolveTable(S, e, H, name, title, false);
  let row = args.length > 1 ? intA(H, args[1]) : t.rows.length - 1;
  if (typeof row !== "number" || H.isUnk(row)) { H.step(e.line, name + "：行が実行時に決まるため、値は省略します"); return H.unk; }
  if (row < 0 || row >= t.rows.length)
    throw H.err(name + " の行（" + row + "）が結果表の範囲外です",
      "結果表「" + t.title + "」は現在 " + t.rows.length + " 行です。ImageJ では \"Row (" + row + ") out of range\" エラーになり止まります。");
  const r = t.rows[row] || {};
  if (asString) {
    if (col === "Label") { const s = strA(H, r.Label); return s === null ? "" : s; }
    if (r[col] === undefined) return "null";
    const s = strA(H, r[col]);
    return s === null ? H.unk : s;
  }
  if (r[col] === undefined) { H.step(e.line, "結果表「" + t.title + "」に列「" + col + "」がないため、値は NaN になります"); return NaN; }
  if (typeof r[col] === "string") return H.numArg(r[col]);
  return r[col];
}
function cellSet(S, e, H, name, args) {
  guardUnk(H, name, [args[0], args[1], args[2]]);
  const col = needStr(H, e, name, args[0], "列名");
  let title = null;
  if (args.length > 3) title = needStr(H, e, name, args[3], "表のタイトル");
  const t = resolveTable(S, e, H, name, title, false);
  const row = intA(H, args[1]);
  if (typeof row !== "number") { H.step(e.line, name + "：行が実行時に決まるため、記録先の行は特定できません（書き込み自体は行われます）"); return H.unk; }
  if (row < 0) throw H.err(name + " の行（" + row + "）が不正です", "行番号は 0 以上で指定してください。ImageJ ではここでエラーになり止まります。");
  if (row > t.rows.length)
    throw H.err(name + " の行（" + row + "）が結果表の範囲外です",
      "結果表「" + t.title + "」は現在 " + t.rows.length + " 行です。新しい行を作れるのは末尾（行番号 " + t.rows.length + "）だけです。ImageJ では \"Row out of range\" エラーになり止まります。");
  if (row === t.rows.length) { const im = H.img(); t.rows.push({ Label: im ? im.title : "" }); }
  t.rows[row][col] = args[2];
  noteCol(S, t.title, col);
  H.step(e.line, "結果表「" + t.title + "」の " + row + " 行目に「" + col + "」= " + H.fmt(args[2]) + " を書き込みます");
  return H.unk;
}
function deleteRowsImpl(S, e, H, name, r1v, r2v, title) {
  const t = resolveTable(S, e, H, name, title, false);
  const r1 = intA(H, r1v), r2 = intA(H, r2v);
  if (typeof r1 !== "number" || typeof r2 !== "number" || H.isUnk(r1) || H.isUnk(r2)) {
    H.step(e.line, name + "：行範囲が実行時に決まるため、削除する行は特定できません"); return H.unk;
  }
  if (r1 < 0 || r2 < r1 || r2 >= t.rows.length)
    throw H.err(name + " の行範囲（" + r1 + "〜" + r2 + "）が結果表の範囲外です",
      "結果表「" + t.title + "」は現在 " + t.rows.length + " 行です。ImageJ ではここでエラーになり止まります。");
  t.rows.splice(r1, r2 - r1 + 1);
  H.step(e.line, "結果表「" + t.title + "」の " + r1 + "〜" + r2 + " 行目を削除します（残り " + t.rows.length + " 行）");
  return H.unk;
}
/* java.util.Properties の load 形式（List.setList／Property.setList 共用）:
 * key=value または key:value、# と ! はコメント、\n \t \\ \= \: のエスケープのみ解釈 */
function parseProperties(text) {
  const out = [];
  for (let line of String(text).split(/\r\n|\r|\n/)) {
    line = line.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("!")) continue;
    let i = 0, key = "";
    while (i < line.length) {
      const c = line[i];
      if (c === "\\" && i + 1 < line.length) { key += unescProp(line[i + 1]); i += 2; continue; }
      if (c === "=" || c === ":" || c === " " || c === "\t") break;
      key += c; i++;
    }
    while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
    if (i < line.length && (line[i] === "=" || line[i] === ":")) i++;
    while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
    let val = "";
    for (; i < line.length; i++) {
      if (line[i] === "\\" && i + 1 < line.length) { val += unescProp(line[i + 1]); i++; continue; }
      val += line[i];
    }
    out.push([key, val]);
  }
  return out;
}
function unescProp(c) {
  if (c === "n") return "\n";
  if (c === "t") return "\t";
  if (c === "r") return "\r";
  return c;
}
function propsToString(obj) {
  return Object.keys(obj).sort().map((k) => k + "=" + obj[k] + "\n").join("");
}

/* ---------- 色の状態（setColor／Color.* 共用） ---------- */

const COLOR_NAMES = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 255, 0],
  blue: [0, 0, 255], cyan: [0, 255, 255], darkgray: [64, 64, 64], gray: [128, 128, 128],
  lightgray: [192, 192, 192], magenta: [255, 0, 255], orange: [255, 200, 0],
  yellow: [255, 255, 0], pink: [255, 175, 175],
};
/* Functions.java の getColor(): 13色名（java.awt.Color 定数）と #16進のみ受理 */
function parseColor13(H, e, name, spec) {
  const s = spec.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(COLOR_NAMES, s)) return COLOR_NAMES[s].slice();
  if (s.startsWith("#")) { const rgb = parseHexColor(s); if (rgb) return rgb; }
  throw H.err(name + " の色指定「" + spec + "」が解釈できません",
    "ImageJ では 'red', 'green', or '#0000ff' etc. expected エラーになり止まります。");
}
function parseHexColor(s) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s) || /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(s);
  if (!m) return null;
  if (m.length === 2) { const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
/* Colors.decode 相当（Color.setForeground 等）: 確定できる形式だけ RGB を返す */
function decodeColorLoose(spec) {
  if (typeof spec !== "string") return null;
  const s = spec.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(COLOR_NAMES, s)) return COLOR_NAMES[s].slice();
  return parseHexColor(s);
}
function colorState(S) {
  if (!S.__colors) S.__colors = { fg: [0, 0, 0], bg: [255, 255, 255], fgValue: null, bgValue: null };
  return S.__colors;
}
/* toScaled／toUnscaled（Functions の in-place 変換、FIX-IJB で格上げ）:
 * 変数を直接書き換える文専用関数で、値を返す形は実 ImageJ に無い。
 * Calibration の換算式（原点0・invertY=false がモデルの既定。画像に
 * プロットが付随する場合はそちらで換算するが、モデルでは画像にプロットを
 * 付随させないため校正換算だけを行う）:
 *   toScaled:   x·pixelWidth、y·pixelHeight、z·pixelDepth
 *   toUnscaled: x÷pixelWidth、y÷pixelHeight、z÷pixelDepth
 * スカラー1引数形は水平方向の長さ換算（原点なし）。配列形は2つの配列
 * 変数を要素ごとに換算する。現値が読めない変数は未確定値を書き戻す */
function scaledImpl(S, e, H, name, args, refs, toScaledFlag) {
  arity(H, e, name, args, 1, 3, name + "(x[, y[, z]]) または " + name + "(xArray, yArray)");
  const im = H.needImg(e.line, name);
  const vx = Array.isArray(im.voxel) ? im.voxel : [];
  const sizes = [typeof vx[0] === "number" ? vx[0] : 1, typeof vx[1] === "number" ? vx[1] : 1, typeof vx[2] === "number" ? vx[2] : 1];
  const conv = (v, size) => toScaledFlag ? v * size : v / size;
  const v0 = refs[0] ? H.readRef(refs[0]) : undefined;
  const v1 = args.length >= 2 && refs[1] ? H.readRef(refs[1]) : undefined;
  if (args.length === 2 && Array.isArray(v0) && Array.isArray(v1)) {
    H.writeRef(refs[0], v0.map((v) => typeof v === "number" ? conv(v, sizes[0]) : v));
    H.writeRef(refs[1], v1.map((v) => typeof v === "number" ? conv(v, sizes[1]) : v));
    H.step(e.line, "座標配列を" + (toScaledFlag ? "校正済み座標" : "画素座標") + "へ変換して変数へ書き戻します");
    return H.unk;
  }
  for (let i = 0; i < args.length; i++) {
    if (!refs[i]) continue;
    const v = H.readRef(refs[i]);
    if (typeof v === "number") H.writeRef(refs[i], conv(v, sizes[i]));
    else {
      H.writeRef(refs[i], H.unk);
      H.step(e.line, name + "：変数 " + refs[i] + " の現在の値が数値でないため、変換結果は省略します");
    }
  }
  H.step(e.line, "座標を" + (toScaledFlag ? "校正済み座標" : "画素座標") + "へ変換して変数へ書き戻します");
  return H.unk;
}
/* 色→描画値（getValue("color.foreground") 用）: グレースケール色だけ確定できる */
function colorToGrayValue(rgb) {
  if (!rgb) return null;
  if (rgb[0] === rgb[1] && rgb[1] === rgb[2]) return rgb[0];
  return null;
}
/* Colors.colorToString（FIX-IJB で格上げ）: null→"none"、13色名（名前表は
 * Colors.java のとおり。出力名は lightGray／darkGray の表記）に一致すれば
 * 名前、無ければ "#"+%06x（モデル色は常に不透明）。成分は 0〜255 にクランプ */
const COLOR_TOSTRING_NAMES = [
  ["red", [255, 0, 0]], ["green", [0, 255, 0]], ["blue", [0, 0, 255]],
  ["magenta", [255, 0, 255]], ["cyan", [0, 255, 255]], ["yellow", [255, 255, 0]],
  ["orange", [255, 200, 0]], ["black", [0, 0, 0]], ["white", [255, 255, 255]],
  ["gray", [128, 128, 128]], ["lightGray", [192, 192, 192]], ["darkGray", [64, 64, 64]],
  ["pink", [255, 175, 175]],
];
function colorToString(rgb) {
  if (!rgb) return "none";
  const c = [0, 1, 2].map((i) => Math.min(255, Math.max(0, Math.round(rgb[i]))));
  for (const [nm, v] of COLOR_TOSTRING_NAMES)
    if (c[0] === v[0] && c[1] === v[1] && c[2] === v[2]) return nm;
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
/* ROI の線色・塗り色を RGB として解決する。rgb フィールド優先、次に spec の
 * 解釈。spec が解釈できない場合は known:false（呼び出し側が未確定値に倒す） */
function roiColorOf(roi, which) {
  const rgbF = which === "stroke" ? roi.strokeColorRgb : roi.fillColorRgb;
  if (Array.isArray(rgbF)) return { known: true, rgb: rgbF };
  const spec = which === "stroke" ? roi.strokeColorSpec : roi.fillColorSpec;
  if (spec != null) {
    const rgb = decodeColorLoose(spec);
    return rgb ? { known: true, rgb } : { known: false, rgb: null };
  }
  return { known: true, rgb: null };
}

/* ---------- ROI の幾何（基礎 simRoiArea の慣行に合わせる） ---------- */

function roiAreaOf(roi) {
  if (!roi || typeof roi.w !== "number" || typeof roi.h !== "number") return null;
  if (roi.type === "rectangle") return roi.w * roi.h;
  if (roi.type === "oval") return Math.round(Math.PI * roi.w * roi.h / 4);
  return null;
}
function needRoi(S, e, H, name) {
  H.needImg(e.line, name);
  if (!S.roi) throw H.err(name + " には選択（ROI）が必要です",
    "ImageJ では \"No selection\" エラーになり止まります。先に makeRectangle などで選択を作ってください。");
  return S.roi;
}
function roiContainsPoint(roi, px, py) {
  if (roi.type === "rectangle" && typeof roi.x === "number")
    return px >= roi.x && px < roi.x + roi.w && py >= roi.y && py < roi.y + roi.h;
  if (roi.type === "oval" && typeof roi.x === "number" && roi.w > 0 && roi.h > 0) {
    const cx = roi.x + roi.w / 2, cy = roi.y + roi.h / 2;
    const dx = (px - cx) / (roi.w / 2), dy = (py - cy) / (roi.h / 2);
    return dx * dx + dy * dy <= 1;
  }
  if (Array.isArray(roi.points) && roi.points.length >= 3) {
    // 多角形はレイキャスティングで内包判定する（PolygonRoi.contains と同じ原理）
    let inside = false;
    const pts = roi.points;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  return null;
}
function roiSizeOf(roi) {
  if (!roi) return 0;
  if (roi.type === "point") return typeof roi.npoints === "number" ? roi.npoints : 1;
  if (roi.type === "line") return 2;
  if (roi.type === "rectangle") return 4;
  return null;
}
function moveRoiTo(roi, x, y) {
  const dx = x - roi.x, dy = y - roi.y;
  roi.x = x; roi.y = y;
  if (typeof roi.x2 === "number") roi.x2 += dx;
  if (typeof roi.y2 === "number") roi.y2 += dy;
  if (Array.isArray(roi.points)) roi.points = roi.points.map((p) => [p[0] + dx, p[1] + dy]);
}
function roiCoords(roi) {
  if (!roi) return null;
  if (roi.type === "line") {
    const x1 = typeof roi.ex1 === "number" ? roi.ex1 : roi.x, y1 = typeof roi.ey1 === "number" ? roi.ey1 : roi.y;
    const x2 = typeof roi.ex2 === "number" ? roi.ex2 : roi.x2, y2 = typeof roi.ey2 === "number" ? roi.ey2 : roi.y2;
    if ([x1, y1, x2, y2].every((v) => typeof v === "number")) return [[x1, x2], [y1, y2]];
    return null;
  }
  if (roi.type === "point") {
    if (Array.isArray(roi.points) && roi.points.length)
      return [roi.points.map((p) => p[0]), roi.points.map((p) => p[1])];
    if (typeof roi.x === "number") return [[roi.x], [roi.y]];
    return null;
  }
  return null;
}
/* FloatPolygon の凸包（Roi.getFloatConvexHull の gift wrapping 相当）。
 * 開始点は最小 y（同点なら最小 x）。候補は cross 積（determinate）が正の
 * 点へ、共線なら厳密により遠い点へ差し替える（共線点は包に残らない） */
function floatConvexHull(points) {
  if (!points.length) return [];
  let start = 0;
  for (let i = 1; i < points.length; i++)
    if (points[i][1] < points[start][1] || (points[i][1] === points[start][1] && points[i][0] < points[start][0])) start = i;
  const det = (x1, y1, x2, y2, x3, y3) => x1 * (y2 - y3) - y1 * (x2 - x3) + (y3 * x2 - y2 * x3);
  const hull = [];
  let current = start;
  do {
    hull.push(points[current]);
    let next = current === 0 ? 1 : 0;
    if (next >= points.length) next = 0;
    for (let i = 0; i < points.length; i++) {
      if (i === current || i === next) continue;
      const d = det(points[current][0], points[current][1], points[next][0], points[next][1], points[i][0], points[i][1]);
      const dn = (points[next][0] - points[current][0]) ** 2 + (points[next][1] - points[current][1]) ** 2;
      const di = (points[i][0] - points[current][0]) ** 2 + (points[i][1] - points[current][1]) ** 2;
      if (d > 0 || (d === 0 && di > dn)) next = i;
    }
    current = next;
  } while (current !== start && hull.length <= points.length);
  return hull;
}
/* Roi.getFeretValues の [8..15] 相当: 凸包の最大点対（p1.x<=p2.x に整える）と
 * 最小キャリパの端点列 [farX, farY, endX, endY] を返す。距離は画素サイズ
 * pw/ph で校正した座標で測る（端点自体は未校正の画素座標） */
function feretPointsOf(points, pw, ph) {
  const hull = floatConvexHull(points);
  if (!hull.length) return null;
  let p1 = hull[0], p2 = hull[0], best = -1;
  for (let i = 0; i < hull.length; i++) for (let j = i + 1; j < hull.length; j++) {
    const dx = (hull[j][0] - hull[i][0]) * pw, dy = (hull[j][1] - hull[i][1]) * ph;
    const d = dx * dx + dy * dy;
    if (d > best) { best = d; p1 = hull[i]; p2 = hull[j]; }
  }
  if (p1[0] > p2[0]) { const t = p1; p1 = p2; p2 = t; }
  let minEnd = null, minDist = Infinity;
  const n = hull.length;
  for (let i = 0; i < n; i++) {
    const prev = hull[(i + n - 1) % n], cur = hull[i];
    let xnorm = (cur[1] - prev[1]) * ph, ynorm = (prev[0] - cur[0]) * pw;
    const len = Math.sqrt(xnorm * xnorm + ynorm * ynorm);
    if (len === 0) continue;
    xnorm = xnorm / len * pw; ynorm = ynorm / len * ph;
    let far = null, farDist = -Infinity;
    for (const q of hull) {
      const dist = (q[0] - cur[0]) * pw * xnorm + (q[1] - cur[1]) * ph * ynorm;
      if (dist > farDist) { farDist = dist; far = q; }
    }
    if (far && farDist < minDist) {
      minDist = farDist;
      minEnd = [far[0], far[1], far[0] - (xnorm / pw * farDist) / pw, far[1] - (ynorm / ph * farDist) / ph];
    }
  }
  if (!minEnd) minEnd = [p1[0], p1[1], p1[0], p1[1]];
  return { maxPair: [p1, p2], minEnd };
}

export const STATE = {};

/* ================= 結果表の残り・IJ.*・基本の状態関数 ================= */
Object.assign(STATE, {
  /* Functions.java getResultString: 列が無ければ "null"、Label 列は行ラベル */
  "getResultString": (S, e, args, refs, H) => {
    arity(H, e, "getResultString", args, 1, 3, "getResultString(column[, row[, title]])");
    return cellGet(S, e, H, "getResultString", args, true);
  },
  "IJ.log": (S, e, args, refs, H) => {
    arity(H, e, "IJ.log", args, 1, 1, "IJ.log(string)");
    const s = strA(H, args[0]);
    if (s === null) { H.step(e.line, "IJ.log：出力する文字列が未確定のため、Log への出力は省略します"); return H.unk; }
    if (S.log.length < 200) { S.log.push(s); S.logLines.push(e.line); }
    else if (S.log.length === 200) { S.log.push("（Log 出力が200行を超えたため、以降は省略します）"); S.logLines.push(0); }
    H.step(e.line, "Log に「" + s + "」と出力します");
    return H.unk;
  },
  "IJ.deleteRows": (S, e, args, refs, H) => {
    arity(H, e, "IJ.deleteRows", args, 2, 2, "IJ.deleteRows(row1, row2)");
    return deleteRowsImpl(S, e, H, "IJ.deleteRows", args[0], args[1], resultsTitle(S));
  },
  /* renameResults: 1引数＝現在の結果表、2引数＝(旧名, 新名) */
  "IJ.renameResults": (S, e, args, refs, H) => {
    arity(H, e, "IJ.renameResults", args, 1, 2, "IJ.renameResults(name) または IJ.renameResults(oldName, newName)");
    guardUnk(H, "IJ.renameResults", args);
    if (args.length === 1) {
      const nn = needStr(H, e, "IJ.renameResults", args[0], "新しいタイトル");
      const old = resultsTitle(S);
      S.__resultsTitle = nn;
      if (S.__currentTable === old) S.__currentTable = nn;
      H.step(e.line, "結果表のタイトルを「" + old + "」から「" + nn + "」に変更します");
      return H.unk;
    }
    const old = needStr(H, e, "IJ.renameResults", args[0], "元のタイトル");
    const nn = needStr(H, e, "IJ.renameResults", args[1], "新しいタイトル");
    if (old === resultsTitle(S)) {
      S.__resultsTitle = nn;
      if (S.__currentTable === old) S.__currentTable = nn;
    } else {
      if (!S.__tables || !Object.prototype.hasOwnProperty.call(S.__tables, old))
        throw H.err("IJ.renameResults で指定された結果表「" + old + "」が見つかりません", "ImageJ では存在しない表の名前は変更できません。");
      S.__tables[nn] = S.__tables[old]; delete S.__tables[old];
      if (S.__tmeta && S.__tmeta[old]) { S.__tmeta[nn] = S.__tmeta[old]; delete S.__tmeta[old]; }
      if (S.__currentTable === old) S.__currentTable = nn;
    }
    H.step(e.line, "結果表「" + old + "」のタイトルを「" + nn + "」に変更します");
    return H.unk;
  },
  "IJ.redirectErrorMessages": (S, e, args, refs, H) => {
    arity(H, e, "IJ.redirectErrorMessages", args, 0, 0, "IJ.redirectErrorMessages()");
    S.__redirectErrors = true;
    H.step(e.line, "次の画像オープンのエラーを Log に出すよう設定します（このシミュレーションの停止挙動は変わりません）");
    return H.unk;
  },
  /* アクティブ画像のタイトル変更（基礎のトップガードが未確定引数を止める） */
  "rename": (S, e, args, refs, H) => {
    arity(H, e, "rename", args, 1, 1, "rename(newTitle)");
    const im = H.needImg(e.line, "rename");
    const t = needStr(H, e, "rename", args[0], "新しいタイトル");
    H.step(e.line, "画像のタイトルを「" + im.title + "」から「" + t + "」に変更します");
    im.title = t;
    return H.unk;
  },
  /* Calibration.getCValue: 濃度校正関数が無い画像では引数がそのまま返る。
   * モデルの画像は濃度校正関数を保持しないため、常に恒等変換になる */
  "calibrate": (S, e, args, refs, H) => {
    arity(H, e, "calibrate", args, 1, 1, "calibrate(value)");
    const im = H.needImg(e.line, "calibrate");
    if (im.calFunc) { H.step(e.line, "calibrate：この画像には濃度校正関数が設定されていますが、その内容はモデルで保持していないため値は省略します"); return H.unk; }
    const v = H.numArg(args[0]);
    H.step(e.line, "calibrate：この画像には濃度校正関数がないため、値 " + H.fmt(v) + " がそのまま返ります");
    return v;
  },
  /* メタデータ: "Info" は画像プロパティ "Info" と同じ保存先（Property.getInfo と共有）、
   * "Label" は現在スライスのラベル（Property.getSliceLabel と共有） */
  "getMetadata": (S, e, args, refs, H) => {
    arity(H, e, "getMetadata", args, 1, 1, "getMetadata(\"Info\") または getMetadata(\"Label\")");
    const im = H.needImg(e.line, "getMetadata");
    const key = strA(H, args[0]);
    if (key === "Info") { const v = im.props && typeof im.props.Info === "string" ? im.props.Info : ""; H.step(e.line, "画像の Info メタデータを取得します"); return v; }
    if (key === "Label") { const v = im.sliceLabels && typeof im.sliceLabels[im.slice] === "string" ? im.sliceLabels[im.slice].split("\n")[0] : ""; H.step(e.line, "現在スライスのラベル（1行目）を取得します"); return v; }
    H.step(e.line, "getMetadata：キー「" + H.fmt(args[0]) + "」のメタデータはモデルで保持していないため、値は省略します");
    return H.unk;
  },
  "setMetadata": (S, e, args, refs, H) => {
    arity(H, e, "setMetadata", args, 2, 2, "setMetadata(\"Info\"|\"Label\", string)");
    guardUnk(H, "setMetadata", args);
    const im = H.needImg(e.line, "setMetadata");
    const key = needStr(H, e, "setMetadata", args[0], "キー");
    const val = needStr(H, e, "setMetadata", args[1], "値");
    if (key === "Info") {
      if (!im.props) im.props = {};
      im.props.Info = val;
      H.step(e.line, "画像の Info メタデータを設定します");
      return H.unk;
    }
    if (key === "Label") {
      if (!im.sliceLabels) im.sliceLabels = {};
      im.sliceLabels[im.slice] = val;
      H.step(e.line, "現在スライス（" + im.slice + "）のラベルを設定します");
      return H.unk;
    }
    throw H.err("setMetadata のキー「" + key + "」は使えません", "setMetadata で設定できるのは \"Info\" と \"Label\" だけです。ImageJ ではここでエラーになり止まります。");
  },
  "getImageInfo": { unverified: "Show Info が生成するテキストの正確な構成（ImagePlus の Info プラグイン側の整形規則）が、提供された一次情報（Functions.java／functions.html）からは確定できないため。" },
  /* ダイアログ入力: 基礎の getNumber／getString／Dialog.getNumber と同じく
   * 「ユーザー入力依存＝未確定値」の慣行に従う（Cancel での終了も基礎は扱わない） */
  "getBoolean": (S, e, args, refs, H) => {
    arity(H, e, "getBoolean", args, 1, 3, "getBoolean(message[, yesLabel, noLabel])");
    H.step(e.line, "「はい／いいえ」ダイアログを表示します（答えはユーザの入力依存です）");
    return H.unk;
  },
  "showMessageWithCancel": (S, e, args, refs, H) => {
    arity(H, e, "showMessageWithCancel", args, 1, 2, "showMessageWithCancel(title[, message])");
    H.step(e.line, "キャンセル付きのメッセージを表示します（押されたボタンはユーザの操作依存です）");
    return H.unk;
  },
  "showText": (S, e, args, refs, H) => {
    arity(H, e, "showText", args, 1, 2, "showText(string) または showText(title, string)");
    H.step(e.line, "テキストウィンドウに文字列を表示します（表示のみで、モデル状態は変わりません）");
    return H.unk;
  },
  "beep": (S, e, args, refs, H) => {
    arity(H, e, "beep", args, 0, 0, "beep()");
    H.step(e.line, "ビープ音を鳴らします（モデル状態は変わりません）");
    return H.unk;
  },
  "getList": (S, e, args, refs, H) => {
    arity(H, e, "getList", args, 1, 1, "getList(\"image.titles\") など");
    const key = strA(H, args[0]);
    if (key !== null && key.toLowerCase() === "image.titles") {
      const titles = S.images.map((im) => im.title);
      H.step(e.line, "開いている画像のタイトル一覧（" + titles.length + " 件）を取得します");
      return titles;
    }
    H.step(e.line, "getList：キー「" + H.fmt(args[0]) + "」の一覧はモデルで保持していないため、値は省略します");
    return H.unk;
  },
  /* getDirectory の別名（基礎 getDirectory と同じ解決） */
  "getDir": (S, e, args, refs, H) => {
    arity(H, e, "getDir", args, 1, 1, "getDir(key)");
    const gk = typeof args[0] === "string" ? args[0] : "";
    H.step(e.line, "フォルダのパスを取得します。モデルに明示していない選択結果は未確定です");
    return Object.prototype.hasOwnProperty.call(S.directories, gk) ? S.directories[gk] : H.unk;
  },
  "getZoom": (S, e, args, refs, H) => {
    arity(H, e, "getZoom", args, 0, 0, "getZoom()");
    H.step(e.line, "getZoom：ウィンドウの表示倍率はモデルで保持していないため、値は省略します");
    return H.unk;
  },
  /* Functions.java の is(): キーは部分一致で判定される。モデルで確定できる
   * 範囲だけ返し、該当しないキーは実機どおりエラーにする */
  "is": (S, e, args, refs, H) => {
    arity(H, e, "is", args, 1, 1, "is(\"key\")");
    const raw = strA(H, args[0]);
    if (raw === null) { H.step(e.line, "is：キーが未確定のため、判定は省略します"); return H.unk; }
    const arg = raw.toLowerCase();
    const im = H.img();
    const needIm = () => { if (!im) throw H.err("is には画像が必要です", "ImageJ では画像が無いとエラーになり止まります。"); return im; };
    if (arg.indexOf("batch") !== -1) { H.step(e.line, "バッチモードかどうかを判定します"); return S.batch ? 1 : 0; }
    if (arg.indexOf("applet") !== -1) return 0;
    if (arg.indexOf("caps") !== -1) { H.step(e.line, "is：Caps Lock の状態はモデルで保持していないため、判定は省略します"); return H.unk; }
    if (arg === "locked" || arg.indexOf("change") !== -1 || (arg.indexOf("invert") !== -1 && arg.indexOf("lut") !== -1) || arg.startsWith("global") || arg === "inverty") {
      H.step(e.line, "is：キー「" + raw + "」の状態はモデルで保持していないため、判定は省略します");
      return H.unk;
    }
    if (arg.indexOf("hyper") !== -1) { const m = needIm(); const d = [m.channels, zdimOf(m), m.frames].filter((v) => typeof v === "number" && v > 1).length; return d >= 2 ? 1 : 0; }
    if (arg.indexOf("virtual") !== -1) { needIm(); return 0; }
    if (arg.indexOf("composite") !== -1) { const m = needIm(); return (typeof m.channels === "number" ? m.channels : 1) > 1 ? 1 : 0; }
    if (arg.indexOf("binary") !== -1) { const m = needIm(); return m.kind === "2値（マスク）" ? 1 : 0; }
    if (arg.indexOf("grayscale") !== -1) {
      const m = needIm();
      if (m.kind === "RGB") { H.step(e.line, "is：RGB 画像がグレースケールかどうかは画素内容依存のため、判定は省略します"); return H.unk; }
      return 1;
    }
    if (arg.indexOf("animated") !== -1) { needIm(); return 0; }
    if (arg.startsWith("area")) { needIm(); return S.roi && ["line", "point", "text"].indexOf(S.roi.type) < 0 ? 1 : 0; }
    if (arg.startsWith("line")) { needIm(); return S.roi && S.roi.type === "line" ? 1 : 0; }
    if (arg.startsWith("fft")) { const m = needIm(); return m.props && m.props.FHT !== undefined ? 1 : 0; }
    throw H.err("is の引数「" + raw + "」は不正です", "ImageJ では \"Invalid argument\" エラーになり止まります。");
  },
  "isActive": (S, e, args, refs, H) => {
    arity(H, e, "isActive", args, 1, 1, "isActive(idOrTitle)");
    let idx = -1;
    if (typeof args[0] === "number" || (typeof args[0] === "string" && args[0].trim() !== "" && !isNaN(H.numArg(args[0])) && typeof H.numArg(args[0]) === "number")) {
      const id = typeof args[0] === "number" ? args[0] : H.numArg(args[0]);
      idx = S.imgIndexById(id);
      if (idx < 0 && typeof args[0] === "string") idx = S.images.findIndex((im) => im.title === args[0]);
    } else if (typeof args[0] === "string") idx = S.images.findIndex((im) => im.title === args[0]);
    if (H.isUnk(args[0])) { H.step(e.line, "isActive：対象が未確定のため、判定は省略します"); return H.unk; }
    H.step(e.line, "指定した画像がアクティブかどうかを判定します");
    return idx >= 0 && idx === S.active ? 1 : 0;
  },
  /* getValue: 数値2引数＝校正済み画素値（範囲外は NaN、getPixel の 0 とは違う）、
   * 文字列1引数＝キー参照。キーごとの根拠は Functions.java の getValue() */
  "getValue": (S, e, args, refs, H) => {
    if (args.length === 2 && typeof args[0] !== "string") {
      const im = H.needImg(e.line, "getValue");
      const x = H.numArg(args[0]), y = H.numArg(args[1]);
      if (typeof x !== "number" || typeof y !== "number" || H.isUnk(x) || H.isUnk(y)) { H.step(e.line, "getValue：座標が未確定のため、値は省略します"); return H.unk; }
      if (!Number.isInteger(x) || !Number.isInteger(y)) { H.step(e.line, "getValue：小数座標では双線形補間が必要ですが、近傍の画素値がモデルで確定しないため値は省略します"); return H.unk; }
      if (x < 0 || y < 0 || x >= im.w || y >= im.h) return NaN;
      const key = x + "," + y;
      if (Object.prototype.hasOwnProperty.call(im.pix, key)) { H.step(e.line, "(" + x + ", " + y + ") の校正済み画素値 " + H.fmt(im.pix[key]) + " を取得します（濃度校正が無いため生値と同じです）"); return im.pix[key]; }
      H.step(e.line, "getValue：(" + x + ", " + y + ") の画素値はモデルで与えられていないため、値は省略します");
      return H.unk;
    }
    arity(H, e, "getValue", args, 1, 1, "getValue(\"key\") または getValue(x, y)");
    const key = strA(H, args[0]);
    if (key === null) { H.step(e.line, "getValue：キーが未確定のため、値は省略します"); return H.unk; }
    const cs = colorState(S);
    if (key === "rgb.foreground") { if (!cs.fg) { H.step(e.line, "getValue：前景色が値で設定されているため、RGB 値は省略します"); return H.unk; } return (cs.fg[0] << 16) | (cs.fg[1] << 8) | cs.fg[2]; }
    if (key === "rgb.background") { if (!cs.bg) { H.step(e.line, "getValue：背景色が値で設定されているため、RGB 値は省略します"); return H.unk; } return (cs.bg[0] << 16) | (cs.bg[1] << 8) | cs.bg[2]; }
    if (key.indexOf("foreground") !== -1) {
      if (typeof cs.fgValue === "number") return cs.fgValue;
      const g = colorToGrayValue(cs.fg);
      if (g !== null) return g;
      H.step(e.line, "getValue：前景色の描画値への変換（色→グレースケール）はモデルで確定しないため、値は省略します"); return H.unk;
    }
    if (key.indexOf("background") !== -1) {
      if (typeof cs.bgValue === "number") return cs.bgValue;
      const g = colorToGrayValue(cs.bg);
      if (g !== null) return g;
      H.step(e.line, "getValue：背景色の描画値への変換（色→グレースケール）はモデルで確定しないため、値は省略します"); return H.unk;
    }
    if (key === "font.size") { if (S.__font && typeof S.__font.size === "number") return S.__font.size; H.step(e.line, "getValue：フォントサイズはこの実行で設定されていないため、値は省略します"); return H.unk; }
    if (key === "selection.size") { H.needImg(e.line, "getValue"); const sz = roiSizeOf(S.roi); return sz === null ? H.unk : sz; }
    if (key === "selection.width") {
      const roi = needRoi(S, e, H, "getValue");
      if (typeof roi.strokeWidth === "number") return roi.strokeWidth;
      H.step(e.line, "getValue：選択の線幅はこの実行で設定されていないため、値は省略します"); return H.unk;
    }
    if (key === "results.count") { const t = resolveTable(S, e, H, "getValue", null, false); return t.rows.length; }
    H.step(e.line, "getValue：キー「" + key + "」の値はモデルで確定しないため、値は省略します（測定名キーは画像統計、image.size はバイト数計算式が一次情報にありません）");
    return H.unk;
  },
  /* ---- REF_FNS に含まれる引数書き戻し読み取り ---- */
  "getPixelSize": (S, e, args, refs, H) => {
    arity(H, e, "getPixelSize", args, 3, 4, "getPixelSize(unit, pixelWidth, pixelHeight[, pixelDepth])");
    const im = H.needImg(e.line, "getPixelSize");
    const vx = Array.isArray(im.voxel) ? im.voxel : [1, 1, 1, "pixels"];
    if (refs[0]) H.writeRef(refs[0], vx[3]);
    if (refs[1]) H.writeRef(refs[1], vx[0]);
    if (refs[2]) H.writeRef(refs[2], vx[1]);
    if (refs[3]) H.writeRef(refs[3], vx[2]);
    H.step(e.line, "画素サイズ " + H.fmt(vx[0]) + "×" + H.fmt(vx[1]) + "×" + H.fmt(vx[2]) + " " + vx[3] + " を変数に入れます");
    return H.unk;
  },
  "getCursorLoc": (S, e, args, refs, H) => {
    arity(H, e, "getCursorLoc", args, 4, 4, "getCursorLoc(x, y, z, flags)");
    for (let i = 0; i < 4; i++) if (refs[i]) H.writeRef(refs[i], H.unk);
    H.step(e.line, "getCursorLoc：マウスカーソルの位置は実行時の操作依存のため、値は省略します");
    return H.unk;
  },
  "getDateAndTime": (S, e, args, refs, H) => {
    arity(H, e, "getDateAndTime", args, 8, 8, "getDateAndTime(year, month, dayOfWeek, dayOfMonth, hour, minute, second, msec)");
    for (let i = 0; i < 8; i++) if (refs[i]) H.writeRef(refs[i], H.unk);
    H.step(e.line, "getDateAndTime：現在日時は実行時の時計依存のため、値は省略します");
    return H.unk;
  },
  "getDisplayedArea": (S, e, args, refs, H) => {
    arity(H, e, "getDisplayedArea", args, 4, 4, "getDisplayedArea(x, y, width, height)");
    for (let i = 0; i < 4; i++) if (refs[i]) H.writeRef(refs[i], H.unk);
    H.step(e.line, "getDisplayedArea：ウィンドウの表示領域はモデルで保持していないため、値は省略します");
    return H.unk;
  },
  "getLocationAndSize": (S, e, args, refs, H) => {
    arity(H, e, "getLocationAndSize", args, 4, 4, "getLocationAndSize(x, y, width, height)");
    const loc = S.__winLoc;
    const vals = loc ? [loc.x, loc.y, typeof loc.w === "number" ? loc.w : H.unk, typeof loc.h === "number" ? loc.h : H.unk] : [H.unk, H.unk, H.unk, H.unk];
    for (let i = 0; i < 4; i++) if (refs[i]) H.writeRef(refs[i], vals[i]);
    H.step(e.line, loc ? "setLocation で設定したウィンドウ位置・サイズを変数に入れます" : "getLocationAndSize：ウィンドウの位置・サイズはモデルで保持していないため、値は省略します");
    return H.unk;
  },
  "setLocation": (S, e, args, refs, H) => {
    arity(H, e, "setLocation", args, 2, 4, "setLocation(x, y[, width, height])");
    guardUnk(H, "setLocation", args.slice(0, 2));
    S.__winLoc = { x: H.numArg(args[0]), y: H.numArg(args[1]), w: args.length > 2 ? H.numArg(args[2]) : undefined, h: args.length > 3 ? H.numArg(args[3]) : undefined };
    H.step(e.line, "アクティブ画像のウィンドウ位置を設定します");
    return H.unk;
  },
  /* setLut で保持した LUT があればそれを、無ければ基礎 Color.getLut と同じ恒等 LUT */
  "getLut": (S, e, args, refs, H) => {
    arity(H, e, "getLut", args, 3, 3, "getLut(reds, greens, blues)");
    const im = H.needImg(e.line, "getLut");
    for (let c = 0; c < 3; c++) if (refs[c]) H.writeRef(refs[c], im.lut ? im.lut[c].slice() : new Array(256).fill(0).map((_, i) => i));
    H.step(e.line, im.lut ? "setLut で設定した LUT を変数に入れます" : "現在の表示 LUT（色の対応表）を変数に入れます");
    return H.unk;
  },
  "getLine": (S, e, args, refs, H) => {
    arity(H, e, "getLine", args, 5, 5, "getLine(x1, y1, x2, y2, lineWidth)");
    H.needImg(e.line, "getLine");
    if (S.roi && S.roi.type === "line") {
      const co = roiCoords(S.roi);
      if (co) {
        if (refs[0]) H.writeRef(refs[0], co[0][0]);
        if (refs[1]) H.writeRef(refs[1], co[1][0]);
        if (refs[2]) H.writeRef(refs[2], co[0][1]);
        if (refs[3]) H.writeRef(refs[3], co[1][1]);
        if (refs[4]) H.writeRef(refs[4], typeof S.roi.strokeWidth === "number" ? S.roi.strokeWidth : H.unk);
        H.step(e.line, "直線選択の端点と線幅を変数に入れます");
        return H.unk;
      }
    }
    if (refs[0]) H.writeRef(refs[0], -1);
    for (let i = 1; i < 5; i++) if (refs[i]) H.writeRef(refs[i], H.unk);
    H.step(e.line, "直線選択がないため、x1 に -1 を入れます（他の値は省略します）");
    return H.unk;
  },
  "getSelectionCoordinates": (S, e, args, refs, H) => {
    arity(H, e, "getSelectionCoordinates", args, 2, 2, "getSelectionCoordinates(xpoints, ypoints)");
    H.needImg(e.line, "getSelectionCoordinates");
    const co = roiCoords(S.roi);
    if (co) {
      if (refs[0]) H.writeRef(refs[0], co[0]);
      if (refs[1]) H.writeRef(refs[1], co[1]);
      H.step(e.line, "選択の座標点を変数に入れます");
    } else {
      if (refs[0]) H.writeRef(refs[0], H.unk);
      if (refs[1]) H.writeRef(refs[1], H.unk);
      H.step(e.line, "getSelectionCoordinates：この選択の頂点はモデルで保持していないため、値は省略します");
    }
    return H.unk;
  },
  "toScaled": (S, e, args, refs, H) => scaledImpl(S, e, H, "toScaled", args, refs, true),
  "toUnscaled": (S, e, args, refs, H) => scaledImpl(S, e, H, "toUnscaled", args, refs, false),
  /* ---- 画像スナップショット系 ---- */
  "snapshot": (S, e, args, refs, H) => {
    arity(H, e, "snapshot", args, 0, 0, "snapshot()");
    const im = H.needImg(e.line, "snapshot");
    im.__snapshot = clone({ pix: im.pix, writtenPix: im.writtenPix, buckets: im.buckets, thr: im.thr, dispMin: im.dispMin, dispMax: im.dispMax });
    H.step(e.line, "現在の画像の状態をスナップショットとして保存します（reset で戻せます）");
    return H.unk;
  },
  "reset": (S, e, args, refs, H) => {
    arity(H, e, "reset", args, 0, 0, "reset()");
    const im = H.needImg(e.line, "reset");
    if (im.__snapshot) {
      const sn = im.__snapshot;
      im.pix = clone(sn.pix); im.writtenPix = clone(sn.writtenPix); im.buckets = clone(sn.buckets);
      im.thr = sn.thr; im.dispMin = sn.dispMin; im.dispMax = sn.dispMax; im.mapOps = [];
      H.step(e.line, "画像を snapshot で保存した状態に戻します");
    } else {
      H.step(e.line, "reset：この実行では snapshot が保存されていないため、画像は変わりません");
    }
    return H.unk;
  },
  "resetMinAndMax": (S, e, args, refs, H) => {
    arity(H, e, "resetMinAndMax", args, 0, 0, "resetMinAndMax()");
    const im = H.needImg(e.line, "resetMinAndMax");
    if (im.bit === 24) { H.step(e.line, "resetMinAndMax：RGB 画像では表示範囲は変わりません"); return H.unk; }
    if (im.bit === 8) { im.dispMin = 0; im.dispMax = 255; H.step(e.line, "表示範囲を 0〜255 に戻します（画素値は変わりません）"); return H.unk; }
    if (im.buckets && im.buckets.length) {
      im.dispMin = im.buckets[0][0]; im.dispMax = im.buckets[im.buckets.length - 1][1];
      H.step(e.line, "表示範囲を画像の最小〜最大（" + im.dispMin + "〜" + im.dispMax + "）に戻します（画素値は変わりません）");
    } else {
      delete im.dispMin; delete im.dispMax;
      H.step(e.line, "表示範囲を画像の最小〜最大に戻します（分布が不明なため、具体的な範囲は省略します）");
    }
    return H.unk;
  },
  "setupUndo": (S, e, args, refs, H) => {
    arity(H, e, "setupUndo", args, 0, 0, "setupUndo()");
    H.needImg(e.line, "setupUndo");
    H.step(e.line, "取り消し（Undo）用の画像コピーを用意します（このモデルでは Undo 自体は扱いません）");
    return H.unk;
  },
  "autoUpdate": (S, e, args, refs, H) => {
    arity(H, e, "autoUpdate", args, 1, 1, "autoUpdate(boolean)");
    S.__autoUpdate = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "画像の自動再描画のオン／オフを設定します（描画タイミングだけの設定で、モデル状態は変わりません）");
    return H.unk;
  },
  "updateDisplay": (S, e, args, refs, H) => {
    arity(H, e, "updateDisplay", args, 0, 0, "updateDisplay()");
    H.step(e.line, "アクティブ画像の表示を更新します（モデル状態は変わりません）");
    return H.unk;
  },
  "save": (S, e, args, refs, H) => {
    arity(H, e, "save", args, 1, 1, "save(path)");
    if (H.isUnk(args[0]) || typeof args[0] !== "string") throw H.err("未確認：保存先のパスが未確定です", "モデルに保存先を明示してください。");
    const im = H.needImg(e.line, "save");
    H.step(e.line, "画像を「" + args[0] + "」に保存します（元の画像データは変わりません）");
    S.files[args[0]] = { ...im, mapOps: [] };
    return H.unk;
  },
  /* ---- モデル外の実行・設定系 ---- */
  "exec": { unsupported: "OS コマンドの実行はモデルの外側の副作用であり、標準出力もモデルに保持できないため。" },
  "runMacro": { unsupported: "外部マクロの動的実行は、基礎エンジンの eval／call と同じくモデルで扱わないため。" },
  "doCommand": { unsupported: "任意のメニューコマンド／プラグインを別スレッドで実行するもので、基礎の run() 相当の委譲経路が高度ハンドラには公開されていないため。" },
  "debug": { unsupported: "マクロデバッガの起動と debug(\"dump\") のシンボル表出力は、インタプリタ内部状態の表示でありモデルに保持できないため。" },
  "dump": { unsupported: "シンボル表・トークン化コード・変数スタックの Log 出力はインタプリタ内部状態の表示であり、モデルに保持できないため。" },
  "saveSettings": { unsupported: "基礎エンジンは ImageJ のオプション／設定状態を保持しておらず、保存すべき設定がモデルに無いため。" },
  "restoreSettings": { unsupported: "基礎エンジンは ImageJ のオプション／設定状態を保持しておらず、復元すべき設定がモデルに無いため。" },
  "newMenu": { unsupported: "カスタムメニューの作成はウィンドウ／メニュー状態の変更であり、モデルに保持できないため。" },
  "doWand": { unverified: "輪郭トレースで得られる選択の形状は、実際の画素の近傍値の分布に依存し、モデルの分布情報（buckets／標本画素）からは確定できないため。" },
  "floodFill": { unverified: "塗りつぶし範囲は連結した実際の画素値に依存し、モデルの分布情報からは確定できないため。" },
  "imageCalculator": { unverified: "2画像間の画素演算の結果は全画素の値に依存し、モデルの分布情報（buckets／標本画素）からは確定できないため。" },
});

/* ================= Table.* ================= */
/* 表のタイトル引数は末尾の文字列。省略時は「現在の表」
 * （Table.create／reset／open で切り替わり、初期値は結果表） */
function optTitle(H, v) { const s = strA(H, v); return s; }
function renameTableImpl(S, e, H, name, oldT, newT) {
  if (oldT === resultsTitle(S)) {
    S.__resultsTitle = newT;
    if (S.__currentTable === oldT) S.__currentTable = newT;
    return;
  }
  if (!S.__tables || !Object.prototype.hasOwnProperty.call(S.__tables, oldT))
    throw H.err(name + " で指定された結果表「" + oldT + "」が見つかりません", "ImageJ では存在しない表の名前は変更できません。");
  S.__tables[newT] = S.__tables[oldT]; delete S.__tables[oldT];
  if (S.__tmeta && S.__tmeta[oldT]) { S.__tmeta[newT] = S.__tmeta[oldT]; delete S.__tmeta[oldT]; }
  if (S.__currentTable === oldT) S.__currentTable = newT;
}
Object.assign(STATE, {
  "Table.create": (S, e, args, refs, H) => {
    arity(H, e, "Table.create", args, 0, 1, "Table.create([title])");
    const title = args.length ? needStr(H, e, "Table.create", args[0], "タイトル") : resultsTitle(S);
    const t = resolveTable(S, e, H, "Table.create", title, true);
    if (t.title === resultsTitle(S)) S.results.length = 0; else S.__tables[t.title] = [];
    const m = tmeta(S, t.title); m.cols = []; m.selStart = -1; m.selEnd = -1;
    S.__currentTable = t.title;
    H.step(e.line, "結果表「" + t.title + "」を作成（初期化）し、現在の表にします");
    return H.unk;
  },
  "Table.reset": (S, e, args, refs, H) => {
    arity(H, e, "Table.reset", args, 0, 1, "Table.reset([title])");
    const title = args.length ? needStr(H, e, "Table.reset", args[0], "タイトル") : (S.__currentTable || resultsTitle(S));
    const t = resolveTable(S, e, H, "Table.reset", title, true);
    if (t.title === resultsTitle(S)) S.results.length = 0; else S.__tables[t.title] = [];
    const m = tmeta(S, t.title); m.cols = []; m.selStart = -1; m.selEnd = -1;
    S.__currentTable = t.title;
    H.step(e.line, "結果表「" + t.title + "」を空にし、現在の表にします");
    return H.unk;
  },
  "Table.size": (S, e, args, refs, H) => {
    arity(H, e, "Table.size", args, 0, 1, "Table.size([title])");
    const t = resolveTable(S, e, H, "Table.size", args.length ? optTitle(H, args[0]) : null, false);
    H.step(e.line, "結果表「" + t.title + "」の行数 " + t.rows.length + " を取得します");
    return t.rows.length;
  },
  "Table.title": (S, e, args, refs, H) => {
    arity(H, e, "Table.title", args, 0, 1, "Table.title([title])");
    const t = resolveTable(S, e, H, "Table.title", args.length ? optTitle(H, args[0]) : null, false);
    return t.title;
  },
  "Table.headings": (S, e, args, refs, H) => {
    arity(H, e, "Table.headings", args, 0, 1, "Table.headings([title])");
    const t = resolveTable(S, e, H, "Table.headings", args.length ? optTitle(H, args[0]) : null, false);
    return headingsOf(S, t.title, t.rows).join("\t");
  },
  /* ResultsTable.getDefaultHeadings() の38件をタブ区切りで連結する
   * （Functions.getAllHeadings の実形式。末尾にタブは付かない） */
  "Table.allHeadings": (S, e, args, refs, H) => {
    arity(H, e, "Table.allHeadings", args, 0, 0, "Table.allHeadings()");
    return "Area\tMean\tStdDev\tMode\tMin\tMax\tX\tY\tXM\tYM\tPerim.\tBX\tBY\tWidth\tHeight\tMajor\tMinor\tAngle\tCirc.\tFeret\tIntDen\tMedian\tSkew\tKurt\t%Area\tRawIntDen\tCh\tSlice\tFrame\tFeretX\tFeretY\tFeretAngle\tMinFeret\tAR\tRound\tSolidity\tMinThr\tMaxThr";
  },
  "Table.get": (S, e, args, refs, H) => {
    arity(H, e, "Table.get", args, 1, 3, "Table.get(column[, row[, title]])");
    return cellGet(S, e, H, "Table.get", args, false);
  },
  "Table.getString": (S, e, args, refs, H) => {
    arity(H, e, "Table.getString", args, 1, 3, "Table.getString(column[, row[, title]])");
    return cellGet(S, e, H, "Table.getString", args, true);
  },
  "Table.set": (S, e, args, refs, H) => {
    arity(H, e, "Table.set", args, 3, 4, "Table.set(column, row, value[, title])");
    return cellSet(S, e, H, "Table.set", args);
  },
  "Table.getColumn": (S, e, args, refs, H) => {
    arity(H, e, "Table.getColumn", args, 1, 2, "Table.getColumn(column[, title])");
    const col = needStr(H, e, "Table.getColumn", args[0], "列名");
    const t = resolveTable(S, e, H, "Table.getColumn", args.length > 1 ? optTitle(H, args[1]) : null, false);
    if (!headingsOf(S, t.title, t.rows).includes(col))
      throw H.err("Table.getColumn の列「" + col + "」が結果表「" + t.title + "」にありません", "ImageJ では存在しない列を指定するとエラーになり止まります。");
    H.step(e.line, "結果表「" + t.title + "」の列「" + col + "」を配列で取得します");
    return t.rows.map((r) => (r && r[col] !== undefined ? r[col] : NaN));
  },
  "Table.setColumn": (S, e, args, refs, H) => {
    arity(H, e, "Table.setColumn", args, 1, 3, "Table.setColumn(column[, array[, title]])");
    const col = needStr(H, e, "Table.setColumn", args[0], "列名");
    let arr = null, title = null;
    if (args.length > 1) {
      if (!Array.isArray(args[1])) throw H.err("Table.setColumn の第2引数は配列が必要です", "書式は Table.setColumn(column, array[, title]) です。ImageJ では配列でないとエラーになり止まります。");
      arr = args[1];
    }
    if (args.length > 2) title = needStr(H, e, "Table.setColumn", args[2], "表のタイトル");
    const t = resolveTable(S, e, H, "Table.setColumn", title, false);
    noteCol(S, t.title, col);
    if (arr) for (let i = 0; i < arr.length; i++) {
      if (i >= t.rows.length) t.rows.push({ Label: "" });
      t.rows[i][col] = arr[i];
    }
    H.step(e.line, "結果表「" + t.title + "」の列「" + col + "」に " + (arr ? arr.length + " 件の値" : "空の列") + "を設定します");
    return H.unk;
  },
  "Table.deleteRows": (S, e, args, refs, H) => {
    arity(H, e, "Table.deleteRows", args, 2, 3, "Table.deleteRows(row1, row2[, title])");
    return deleteRowsImpl(S, e, H, "Table.deleteRows", args[0], args[1], args.length > 2 ? optTitle(H, args[2]) : null);
  },
  "Table.deleteColumn": (S, e, args, refs, H) => {
    arity(H, e, "Table.deleteColumn", args, 1, 2, "Table.deleteColumn(column[, title])");
    guardUnk(H, "Table.deleteColumn", [args[0]]);
    const col = needStr(H, e, "Table.deleteColumn", args[0], "列名");
    const t = resolveTable(S, e, H, "Table.deleteColumn", args.length > 1 ? optTitle(H, args[1]) : null, false);
    if (!headingsOf(S, t.title, t.rows).includes(col))
      throw H.err("Table.deleteColumn の列「" + col + "」が結果表「" + t.title + "」にありません", "ImageJ では存在しない列を指定するとエラーになり止まります。");
    for (const r of t.rows) if (r) delete r[col];
    const m = tmeta(S, t.title); m.cols = m.cols.filter((c) => c !== col);
    H.step(e.line, "結果表「" + t.title + "」から列「" + col + "」を削除します");
    return H.unk;
  },
  "Table.renameColumn": (S, e, args, refs, H) => {
    arity(H, e, "Table.renameColumn", args, 2, 3, "Table.renameColumn(oldName, newName[, title])");
    guardUnk(H, "Table.renameColumn", [args[0], args[1]]);
    const oldC = needStr(H, e, "Table.renameColumn", args[0], "元の列名");
    const newC = needStr(H, e, "Table.renameColumn", args[1], "新しい列名");
    const t = resolveTable(S, e, H, "Table.renameColumn", args.length > 2 ? optTitle(H, args[2]) : null, false);
    if (!headingsOf(S, t.title, t.rows).includes(oldC))
      throw H.err("Table.renameColumn の列「" + oldC + "」が結果表「" + t.title + "」にありません", "ImageJ では存在しない列を指定するとエラーになり止まります。");
    for (let i = 0; i < t.rows.length; i++) {
      const r = t.rows[i];
      if (r && Object.prototype.hasOwnProperty.call(r, oldC)) {
        const nr = {};
        for (const k of Object.keys(r)) nr[k === oldC ? newC : k] = r[k];
        t.rows[i] = nr;
      }
    }
    const m = tmeta(S, t.title); m.cols = m.cols.map((c) => (c === oldC ? newC : c));
    H.step(e.line, "結果表「" + t.title + "」の列「" + oldC + "」を「" + newC + "」に変更します");
    return H.unk;
  },
  "Table.columnExists": (S, e, args, refs, H) => {
    arity(H, e, "Table.columnExists", args, 1, 2, "Table.columnExists(column[, title])");
    const col = strA(H, args[0]);
    if (col === null) return H.unk;
    const t = resolveTable(S, e, H, "Table.columnExists", args.length > 1 ? optTitle(H, args[1]) : null, false);
    return headingsOf(S, t.title, t.rows).includes(col) ? 1 : 0;
  },
  "Table.update": (S, e, args, refs, H) => {
    arity(H, e, "Table.update", args, 0, 1, "Table.update([title])");
    const t = resolveTable(S, e, H, "Table.update", args.length ? optTitle(H, args[0]) : null, false);
    S.__currentTable = t.title;
    H.step(e.line, "結果表「" + t.title + "」の表示を更新し、現在の表にします");
    return H.unk;
  },
  "Table.rename": (S, e, args, refs, H) => {
    arity(H, e, "Table.rename", args, 1, 2, "Table.rename(newTitle) または Table.rename(oldTitle, newTitle)");
    guardUnk(H, "Table.rename", args);
    if (args.length === 1) {
      const nn = needStr(H, e, "Table.rename", args[0], "新しいタイトル");
      const cur = S.__currentTable || resultsTitle(S);
      renameTableImpl(S, e, H, "Table.rename", cur, nn);
      H.step(e.line, "結果表「" + cur + "」のタイトルを「" + nn + "」に変更します");
    } else {
      const oldT = needStr(H, e, "Table.rename", args[0], "元のタイトル");
      const nn = needStr(H, e, "Table.rename", args[1], "新しいタイトル");
      renameTableImpl(S, e, H, "Table.rename", oldT, nn);
      H.step(e.line, "結果表「" + oldT + "」のタイトルを「" + nn + "」に変更します");
    }
    return H.unk;
  },
  "Table.setSelection": (S, e, args, refs, H) => {
    arity(H, e, "Table.setSelection", args, 2, 3, "Table.setSelection(from, to[, title])");
    const t = resolveTable(S, e, H, "Table.setSelection", args.length > 2 ? optTitle(H, args[2]) : null, false);
    const m = tmeta(S, t.title);
    const from = intA(H, args[0]), to = intA(H, args[1]);
    m.selStart = typeof from === "number" ? from : -1;
    m.selEnd = typeof to === "number" ? to : -1;
    H.step(e.line, "結果表「" + t.title + "」の選択範囲を " + m.selStart + "〜" + m.selEnd + " に設定します");
    return H.unk;
  },
  "Table.getSelectionStart": (S, e, args, refs, H) => {
    arity(H, e, "Table.getSelectionStart", args, 0, 1, "Table.getSelectionStart([title])");
    const t = resolveTable(S, e, H, "Table.getSelectionStart", args.length ? optTitle(H, args[0]) : null, false);
    return tmeta(S, t.title).selStart;
  },
  "Table.getSelectionEnd": (S, e, args, refs, H) => {
    arity(H, e, "Table.getSelectionEnd", args, 0, 1, "Table.getSelectionEnd([title])");
    const t = resolveTable(S, e, H, "Table.getSelectionEnd", args.length ? optTitle(H, args[0]) : null, false);
    return tmeta(S, t.title).selEnd;
  },
  /* 保存形式の整形は基礎 saveAs("Results") と同じく未確認として記録する */
  "Table.save": (S, e, args, refs, H) => {
    arity(H, e, "Table.save", args, 1, 2, "Table.save(path[, title])");
    if (H.isUnk(args[0]) || typeof args[0] !== "string") throw H.err("未確認：保存先のパスが未確定です", "モデルに保存先を明示してください。");
    const t = resolveTable(S, e, H, "Table.save", args.length > 1 ? optTitle(H, args[1]) : null, false);
    H.step(e.line, "結果表「" + t.title + "」（" + t.rows.length + " 行）を「" + args[0] + "」に保存します");
    S.files[args[0]] = { kind: "unknown", source: "測定表の保存内容（整形は未確認）" };
    return H.unk;
  },
  /* モデルファイルのテキストをタブ区切り表として読み込む（結果表の保存形式）。
   * 先頭列の見出しが空の行は行番号列として読み飛ばす */
  "Table.open": (S, e, args, refs, H) => {
    arity(H, e, "Table.open", args, 1, 2, "Table.open(path[, title])");
    const path = strA(H, args[0]);
    if (path === null) { H.step(e.line, "Table.open：パスが未確定のため、表は開きません"); return H.unk; }
    let title = args.length > 1 ? strA(H, args[1]) : null;
    if (title === null) title = path.split("/").pop();
    const entry = Object.prototype.hasOwnProperty.call(S.files, path) ? S.files[path] : undefined;
    if (!entry) {
      if (Object.values(S.directories).some((d) => path.startsWith(d)))
        throw H.err("Table.open のファイル「" + path + "」が見つかりません", "モデルに無いファイルは開けません。ImageJ でも存在しないファイルではエラーになり止まります。");
      H.step(e.line, "Table.open：ファイル「" + path + "」はモデルの範囲外のため、表の内容は省略します");
      return H.unk;
    }
    if (typeof entry.text !== "string") { H.step(e.line, "Table.open：ファイル「" + path + "」の内容がテキストとしてモデルに無いため、表の内容は省略します"); return H.unk; }
    const lines = entry.text.split(/\r\n|\r|\n/).filter((l) => l.length > 0);
    if (!lines.length) { H.step(e.line, "Table.open：ファイルが空のため、空の表「" + title + "」を開きます"); }
    let heads = lines.length ? lines[0].split("\t") : [];
    const dropFirst = heads.length > 0 && heads[0] === "";
    if (dropFirst) heads = heads.slice(1);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      let cells = lines[i].split("\t");
      if (dropFirst) cells = cells.slice(1);
      const row = {};
      heads.forEach((h, j) => {
        const c = j < cells.length ? cells[j] : "";
        if (h === "Label") row[h] = c;
        else if (c === "") row[h] = NaN;
        else { const n = H.numArg(c); row[h] = typeof n === "number" ? n : c; }
      });
      rows.push(row);
    }
    if (title === resultsTitle(S)) { S.results.length = 0; for (const r of rows) S.results.push(r); }
    else { if (!S.__tables) S.__tables = {}; S.__tables[title] = rows; }
    const m = tmeta(S, title); m.cols = heads.slice(); m.selStart = -1; m.selEnd = -1;
    S.__currentTable = title;
    H.step(e.line, "ファイル「" + path + "」を結果表「" + title + "」（" + rows.length + " 行）として開き、現在の表にします");
    return H.unk;
  },
  /* ResultsTable.sort: 指定列の昇順（数値は数値として、欠けは末尾） */
  "Table.sort": (S, e, args, refs, H) => {
    arity(H, e, "Table.sort", args, 1, 2, "Table.sort(column[, title])");
    guardUnk(H, "Table.sort", [args[0]]);
    const col = needStr(H, e, "Table.sort", args[0], "列名");
    const t = resolveTable(S, e, H, "Table.sort", args.length > 1 ? optTitle(H, args[1]) : null, false);
    if (!headingsOf(S, t.title, t.rows).includes(col))
      throw H.err("Table.sort の列「" + col + "」が結果表「" + t.title + "」にありません", "ImageJ では存在しない列を指定するとエラーになり止まります。");
    const keyOf = (r) => {
      const v = r ? r[col] : undefined;
      if (v === undefined || (typeof v === "number" && isNaN(v))) return { rank: 2, n: 0, s: "" };
      const n = typeof v === "number" ? v : H.numArg(v);
      if (typeof n === "number" && !isNaN(n)) return { rank: 0, n, s: "" };
      return { rank: 1, n: 0, s: String(v) };
    };
    t.rows.sort((a, b) => {
      const ka = keyOf(a), kb = keyOf(b);
      if (ka.rank !== kb.rank) return ka.rank - kb.rank;
      if (ka.rank === 0) return ka.n - kb.n;
      return ka.s < kb.s ? -1 : ka.s > kb.s ? 1 : 0;
    });
    H.step(e.line, "結果表「" + t.title + "」を列「" + col + "」の昇順に並べ替えます");
    return H.unk;
  },
  "Table.showRowNumbers": (S, e, args, refs, H) => {
    arity(H, e, "Table.showRowNumbers", args, 1, 2, "Table.showRowNumbers(boolean[, title])");
    const t = resolveTable(S, e, H, "Table.showRowNumbers", args.length > 1 ? optTitle(H, args[1]) : null, false);
    tmeta(S, t.title).showRowNumbers = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "結果表「" + t.title + "」の行番号表示を設定します（表示だけの設定です）");
    return H.unk;
  },
  "Table.showRowIndexes": (S, e, args, refs, H) => {
    arity(H, e, "Table.showRowIndexes", args, 1, 2, "Table.showRowIndexes(boolean[, title])");
    const t = resolveTable(S, e, H, "Table.showRowIndexes", args.length > 1 ? optTitle(H, args[1]) : null, false);
    tmeta(S, t.title).showRowIndexes = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "結果表「" + t.title + "」の行インデックス表示を設定します（表示だけの設定です）");
    return H.unk;
  },
  "Table.saveColumnHeader": (S, e, args, refs, H) => {
    arity(H, e, "Table.saveColumnHeader", args, 1, 2, "Table.saveColumnHeader(boolean[, title])");
    const t = resolveTable(S, e, H, "Table.saveColumnHeader", args.length > 1 ? optTitle(H, args[1]) : null, false);
    tmeta(S, t.title).saveColumnHeader = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "結果表「" + t.title + "」の保存時に列見出しを含めるかを設定します");
    return H.unk;
  },
  "Table.setLocationAndSize": (S, e, args, refs, H) => {
    arity(H, e, "Table.setLocationAndSize", args, 4, 5, "Table.setLocationAndSize(x, y, width, height[, title])");
    const t = resolveTable(S, e, H, "Table.setLocationAndSize", args.length > 4 ? optTitle(H, args[4]) : null, false);
    const m = tmeta(S, t.title);
    m.winLoc = [H.numArg(args[0]), H.numArg(args[1]), H.numArg(args[2]), H.numArg(args[3])];
    H.step(e.line, "結果表「" + t.title + "」のウィンドウ位置・サイズを設定します（表示だけの設定です）");
    return H.unk;
  },
  /* Functions.showArray: 文字列引数はタイトル、配列引数はその変数名が
   * 見出しになる。配列1つでタイトルが既定（"Arrays"）ならタイトル=変数名
   * で見出しは "Value"。タイトル末尾の "(...)" がオプション（"row" か "1"
   * を含めば行番号、"index" を含めば 0 始まり Index 列）。文字列要素は
   * 文字列のまま、他は数値、短い配列は "" で埋める */
  "Table.showArrays": (S, e, args, refs, H) => {
    arity(H, e, "Table.showArrays", args, 1, 99, "Table.showArrays([title,] array1[, array2, ...])");
    let title = "Arrays";
    const arrCols = [];
    let maxLen = 0;
    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] === "string") { title = args[i]; continue; }
      if (!refs[i]) continue;
      const v = H.readRef(refs[i]);
      if (Array.isArray(v)) { arrCols.push({ name: refs[i], values: v }); if (v.length > maxLen) maxLen = v.length; }
    }
    if (!arrCols.length) throw H.err("Table.showArrays には配列引数が必要です", "表示する配列は変数で渡してください。ImageJ ではここでエラーになり止まります。");
    let headings = arrCols.map((c) => c.name);
    if (arrCols.length === 1 && title === "Arrays") { title = arrCols[0].name; headings = ["Value"]; }
    let showRow = false, showIndex = false;
    const paren = title.indexOf("(");
    if (paren >= 0) {
      const opts = title.slice(paren);
      title = title.slice(0, paren).trim();
      if (opts.includes("row") || opts.includes("1")) showRow = true;
      else if (opts.includes("index")) showIndex = true;
    }
    const cols = [];
    if (showIndex) cols.push({ heading: "Index", values: Array.from({ length: maxLen }, (_, i) => "" + i) });
    arrCols.forEach((c, ci) => cols.push({ heading: headings[ci], values: c.values }));
    const t = resolveTable(S, e, H, "Table.showArrays", title, true);
    t.rows.length = 0;
    tmeta(S, t.title).cols = cols.map((c) => c.heading);
    for (let r = 0; r < maxLen; r++) {
      const row = { Label: showRow ? "" + (r + 1) : "" };
      for (const c of cols) {
        const v = r < c.values.length ? c.values[r] : "";
        row[c.heading] = (typeof v === "string" || typeof v === "number") ? v : H.unk;
      }
      t.rows.push(row);
    }
    S.__currentTable = t.title;
    H.step(e.line, "配列を結果表「" + t.title + "」に表示します（" + cols.length + " 列 × " + maxLen + " 行）");
    return H.unk;
  },
  "Table.applyMacro": { unsupported: "表の各行へのマクロの動的適用は、基礎エンジンの eval と同じくモデルで扱わないため。" },
  "Table.showHistogramTable": { unsupported: "ヒストグラムウィンドウの内容表示であり、モデルにヒストグラムウィンドウが無いため（Functions.java でも \"No histogram window\" エラーになる経路）。" },
  /* 結果表の見出し（タブ区切り）。String.getResultsHeadings と同じ導出 */
  "String.getResultsHeadings": (S, e, args, refs, H) => {
    arity(H, e, "String.getResultsHeadings", args, 0, 0, "String.getResultsHeadings()");
    const t = resolveTable(S, e, H, "String.getResultsHeadings", null, false);
    return headingsOf(S, t.title, t.rows).join("\t");
  },
});

/* ================= List.*（実行ごとに1つのキー＝値マップ） ================= */
function listObj(S) { if (!S.__list) S.__list = {}; return S.__list; }
Object.assign(STATE, {
  "List.set": (S, e, args, refs, H) => {
    arity(H, e, "List.set", args, 2, 2, "List.set(key, value)");
    guardUnk(H, "List.set", args);
    const k = needStr(H, e, "List.set", args[0], "キー");
    const v = needStr(H, e, "List.set", args[1], "値");
    listObj(S)[k] = v;
    H.step(e.line, "リストに " + k + " = " + v + " を設定します");
    return H.unk;
  },
  "List.get": (S, e, args, refs, H) => {
    arity(H, e, "List.get", args, 1, 1, "List.get(key)");
    const k = strA(H, args[0]);
    if (k === null) { H.step(e.line, "List.get：キーが未確定のため、値は省略します"); return H.unk; }
    const o = listObj(S);
    return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : "";
  },
  /* キーが無いと実機は "Value not found" で止まる。値は文字列で返り、
   * 数値への変換は代入・演算の文脈に任せる（functions.html の注記どおり） */
  "List.getValue": (S, e, args, refs, H) => {
    arity(H, e, "List.getValue", args, 1, 1, "List.getValue(key)");
    const k = needStr(H, e, "List.getValue", args[0], "キー");
    const o = listObj(S);
    if (!Object.prototype.hasOwnProperty.call(o, k))
      throw H.err("List.getValue のキー「" + k + "」が見つかりません", "ImageJ では \"Value not found\" エラーになり止まります。List.set で設定したキーを使ってください。");
    return o[k];
  },
  /* doList は件数を文字列で返す */
  "List.size": (S, e, args, refs, H) => {
    arity(H, e, "List.size", args, 0, 0, "List.size()");
    return String(Object.keys(listObj(S)).length);
  },
  "List.clear": (S, e, args, refs, H) => {
    arity(H, e, "List.clear", args, 0, 0, "List.clear()");
    S.__list = {};
    H.step(e.line, "リストを空にします");
    return H.unk;
  },
  "List.setList": (S, e, args, refs, H) => {
    arity(H, e, "List.setList", args, 1, 1, "List.setList(string)");
    guardUnk(H, "List.setList", args);
    const text = needStr(H, e, "List.setList", args[0], "文字列");
    const o = {};
    for (const [k, v] of parseProperties(text)) o[k] = v;
    S.__list = o;
    H.step(e.line, "文字列からリストを設定します（" + Object.keys(o).length + " 件）");
    return H.unk;
  },
  "List.getList": (S, e, args, refs, H) => {
    arity(H, e, "List.getList", args, 0, 0, "List.getList()");
    return propsToString(listObj(S));
  },
  /* キーを辞書順に並べたときの位置（文字列で返る）。無ければ "-1" */
  "List.indexOf": (S, e, args, refs, H) => {
    arity(H, e, "List.indexOf", args, 1, 1, "List.indexOf(key)");
    const k = strA(H, args[0]);
    if (k === null) return H.unk;
    return String(Object.keys(listObj(S)).sort().indexOf(k));
  },
  "List.fromArrays": (S, e, args, refs, H) => {
    arity(H, e, "List.fromArrays", args, 2, 2, "List.fromArrays(keysArray, valuesArray)");
    if (!Array.isArray(args[0]) || !Array.isArray(args[1])) throw H.err("List.fromArrays の引数は2つの配列が必要です", "書式は List.fromArrays(keys, values) です。");
    if (args[0].length !== args[1].length) throw H.err("List.fromArrays の配列の長さが違います", "ImageJ では \"Arrays must have same length\" エラーになり止まります。");
    const o = {};
    for (let i = 0; i < args[0].length; i++) {
      const k = strA(H, args[0][i]);
      if (k === null || k === "") throw H.err("List.fromArrays のキーが空、または未確定です", "ImageJ では \"Key cannot be an empty string\" エラーになり止まります。");
      const v = strA(H, args[1][i]);
      if (v === null) throw H.err("未確認：List.fromArrays の値が未確定です", "リストの内容を推測して後続を実行しません。");
      o[k] = v;
    }
    S.__list = o;
    H.step(e.line, "2つの配列からリストを設定します（" + Object.keys(o).length + " 件）");
    return H.unk;
  },
  "List.toArrays": (S, e, args, refs, H) => {
    arity(H, e, "List.toArrays", args, 2, 2, "List.toArrays(keysArray, valuesArray)");
    if (!Array.isArray(args[0]) || !Array.isArray(args[1])) throw H.err("List.toArrays の引数は2つの配列が必要です", "書式は List.toArrays(keys, values) です。");
    const o = listObj(S);
    const keys = Object.keys(o).sort();
    args[0].length = 0; args[1].length = 0;
    for (const k of keys) { args[0].push(k); args[1].push(o[k]); }
    H.step(e.line, "リストのキーと値を辞書順に配列へ書き出します（" + keys.length + " 件）");
    return H.unk;
  },
  "List.setMeasurements": { unverified: "列集合は ALL_STATS+SLICE に固定され確定するが、重心・楕円フィット・Feret 等の空間モーメント系の値はモデルの画素分布表現からは導出できないため。" },
  "List.setCommands": { unverified: "メニューコマンドとプラグインの対応表は実行環境（インストール済みプラグイン）に依存し、モデルでは確定できないため。" },
});

/* ================= Property.*（画像ごとのプロパティ） ================= */
function propsOf(im) { if (!im.props) im.props = {}; return im.props; }
Object.assign(STATE, {
  /* 空文字列の値はキーの削除になる（doProperty の実装どおり） */
  "Property.set": (S, e, args, refs, H) => {
    arity(H, e, "Property.set", args, 2, 2, "Property.set(key, value)");
    guardUnk(H, "Property.set", args);
    const im = H.needImg(e.line, "Property.set");
    const k = needStr(H, e, "Property.set", args[0], "キー");
    const v = needStr(H, e, "Property.set", args[1], "値");
    const p = propsOf(im);
    if (v === "") { delete p[k]; H.step(e.line, "画像プロパティ「" + k + "」を削除します（空文字列の設定は削除になります）"); }
    else { p[k] = v; H.step(e.line, "画像プロパティ " + k + " = " + v + " を設定します"); }
    return H.unk;
  },
  "Property.get": (S, e, args, refs, H) => {
    arity(H, e, "Property.get", args, 1, 1, "Property.get(key)");
    const im = H.needImg(e.line, "Property.get");
    const k = strA(H, args[0]);
    if (k === null) return H.unk;
    const p = im.props || {};
    return Object.prototype.hasOwnProperty.call(p, k) ? p[k] : "";
  },
  "Property.getValue": (S, e, args, refs, H) => {
    arity(H, e, "Property.getValue", args, 1, 1, "Property.getValue(key)");
    const im = H.needImg(e.line, "Property.getValue");
    const k = strA(H, args[0]);
    if (k === null) return NaN;
    const p = im.props || {};
    if (!Object.prototype.hasOwnProperty.call(p, k)) return NaN;
    const n = H.numArg(p[k]);
    return typeof n === "number" ? n : NaN;
  },
  "Property.getNumber": (S, e, args, refs, H) => {
    arity(H, e, "Property.getNumber", args, 1, 1, "Property.getNumber(key)");
    const im = H.needImg(e.line, "Property.getNumber");
    const k = strA(H, args[0]);
    if (k === null) return NaN;
    const p = im.props || {};
    if (!Object.prototype.hasOwnProperty.call(p, k)) return NaN;
    const n = H.numArg(p[k]);
    return typeof n === "number" ? n : NaN;
  },
  "Property.getInfo": (S, e, args, refs, H) => {
    arity(H, e, "Property.getInfo", args, 0, 0, "Property.getInfo()");
    const im = H.needImg(e.line, "Property.getInfo");
    return im.props && typeof im.props.Info === "string" ? im.props.Info : "";
  },
  "Property.getSliceLabel": (S, e, args, refs, H) => {
    arity(H, e, "Property.getSliceLabel", args, 0, 1, "Property.getSliceLabel([slice])");
    const im = H.needImg(e.line, "Property.getSliceLabel");
    const sl = args.length ? intA(H, args[0]) : im.slice;
    if (typeof sl !== "number" || H.isUnk(sl)) return H.unk;
    return im.sliceLabels && typeof im.sliceLabels[sl] === "string" ? im.sliceLabels[sl] : "";
  },
  "Property.setSliceLabel": (S, e, args, refs, H) => {
    arity(H, e, "Property.setSliceLabel", args, 1, 2, "Property.setSliceLabel(label[, slice])");
    guardUnk(H, "Property.setSliceLabel", [args[0]]);
    const im = H.needImg(e.line, "Property.setSliceLabel");
    const label = needStr(H, e, "Property.setSliceLabel", args[0], "ラベル");
    const sl = args.length > 1 ? intA(H, args[1]) : im.slice;
    const max = stackSizeOf(im);
    if (typeof sl !== "number" || sl < 1 || sl > max)
      throw H.err("Property.setSliceLabel のスライス（" + H.fmt(sl) + "）が範囲外です", "スライスは 1〜" + max + " で指定してください。ImageJ ではここでエラーになり止まります。");
    if (!im.sliceLabels) im.sliceLabels = {};
    im.sliceLabels[sl] = label;
    H.step(e.line, "スライス " + sl + " のラベルを「" + label + "」に設定します");
    return H.unk;
  },
  "Property.getList": (S, e, args, refs, H) => {
    arity(H, e, "Property.getList", args, 0, 0, "Property.getList()");
    const im = H.needImg(e.line, "Property.getList");
    return propsToString(im.props || {});
  },
  "Property.setList": (S, e, args, refs, H) => {
    arity(H, e, "Property.setList", args, 1, 1, "Property.setList(string)");
    guardUnk(H, "Property.setList", args);
    const im = H.needImg(e.line, "Property.setList");
    const text = needStr(H, e, "Property.setList", args[0], "文字列");
    const p = {};
    for (const [k, v] of parseProperties(text)) p[k] = v;
    im.props = p;
    H.step(e.line, "文字列から画像プロパティを設定します（" + Object.keys(p).length + " 件）");
    return H.unk;
  },
});

/* ================= Stack.* の残り ================= */
function setDimPos(S, e, H, name, args, dim, max, label) {
  arity(H, e, name, args, 1, 1, name + "(n)");
  const im = H.needImg(e.line, name);
  const n = intA(H, args[0]);
  if (typeof n === "number" && n >= 1 && n <= max) im[dim] = n;
  H.step(e.line, "スタックの" + label + "を " + (typeof im[dim] === "number" ? im[dim] : 1) + " に切り替えます（範囲外の指定では位置は変わりません）");
  return H.unk;
}
function needStack(S, e, H, name) {
  const im = H.needImg(e.line, name);
  if (stackSizeOf(im) <= 1) throw H.err(name + " にはスタックが必要です", "ImageJ では \"Stack required\" エラーになり止まります。");
  return im;
}
function needComposite(S, e, H, name) {
  const im = H.needImg(e.line, name);
  if ((typeof im.channels === "number" ? im.channels : 1) <= 1)
    throw H.err(name + " にはコンポジット画像が必要です", "ImageJ では \"Composite image required\" エラーになり止まります。");
  return im;
}
function unitsArr(im) {
  if (!im.units) { const u = Array.isArray(im.voxel) ? im.voxel[3] : "pixels"; im.units = [u, u, "", "", ""]; }
  return im.units;
}
Object.assign(STATE, {
  /* ハイパースタック = c／z／t のうち2つ以上の次元が2以上 */
  "Stack.isHyperstack": (S, e, args, refs, H) => {
    arity(H, e, "Stack.isHyperstack", args, 0, 0, "Stack.isHyperstack()");
    const im = H.needImg(e.line, "Stack.isHyperstack");
    const d = [im.channels, zdimOf(im), im.frames].filter((v) => typeof v === "number" && v > 1).length;
    return d >= 2 ? 1 : 0;
  },
  "Stack.setDimensions": (S, e, args, refs, H) => {
    arity(H, e, "Stack.setDimensions", args, 3, 3, "Stack.setDimensions(channels, slices, frames)");
    guardUnk(H, "Stack.setDimensions", args);
    const im = needStack(S, e, H, "Stack.setDimensions");
    im.channels = intA(H, args[0]); im.zdim = intA(H, args[1]); im.frames = intA(H, args[2]);
    H.step(e.line, "スタックの次元をチャンネル " + im.channels + "、スライス " + im.zdim + "、フレーム " + im.frames + " に設定します");
    return H.unk;
  },
  "Stack.setChannel": (S, e, args, refs, H) => { const im = H.needImg(e.line, "Stack.setChannel"); return setDimPos(S, e, H, "Stack.setChannel", args, "channel", typeof im.channels === "number" ? im.channels : 1, "チャンネル"); },
  "Stack.setSlice": (S, e, args, refs, H) => { const im = H.needImg(e.line, "Stack.setSlice"); return setDimPos(S, e, H, "Stack.setSlice", args, "slice", zdimOf(im), "スライス"); },
  "Stack.setFrame": (S, e, args, refs, H) => { const im = H.needImg(e.line, "Stack.setFrame"); return setDimPos(S, e, H, "Stack.setFrame", args, "frame", typeof im.frames === "number" ? im.frames : 1, "フレーム"); },
  "Stack.getFrameRate": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getFrameRate", args, 0, 0, "Stack.getFrameRate()");
    const im = H.needImg(e.line, "Stack.getFrameRate");
    if (typeof im.fps === "number") return im.fps;
    H.step(e.line, "Stack.getFrameRate：フレームレートはこのモデル／実行では設定されていないため、値は省略します");
    return H.unk;
  },
  "Stack.setFrameRate": (S, e, args, refs, H) => {
    arity(H, e, "Stack.setFrameRate", args, 1, 1, "Stack.setFrameRate(fps)");
    guardUnk(H, "Stack.setFrameRate", args);
    const im = H.needImg(e.line, "Stack.setFrameRate");
    im.fps = H.numArg(args[0]);
    H.step(e.line, "フレームレートを " + H.fmt(im.fps) + " fps に設定します");
    return H.unk;
  },
  "Stack.getFrameInterval": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getFrameInterval", args, 0, 0, "Stack.getFrameInterval()");
    const im = H.needImg(e.line, "Stack.getFrameInterval");
    if (typeof im.frameInterval === "number") return im.frameInterval;
    H.step(e.line, "Stack.getFrameInterval：フレーム間隔はこのモデル／実行では設定されていないため、値は省略します");
    return H.unk;
  },
  "Stack.setFrameInterval": (S, e, args, refs, H) => {
    arity(H, e, "Stack.setFrameInterval", args, 1, 1, "Stack.setFrameInterval(seconds)");
    guardUnk(H, "Stack.setFrameInterval", args);
    const im = H.needImg(e.line, "Stack.setFrameInterval");
    im.frameInterval = H.numArg(args[0]);
    H.step(e.line, "フレーム間隔を " + H.fmt(im.frameInterval) + " 秒に設定します");
    return H.unk;
  },
  /* Functions.getStackUnits: Calibration の X／Y／Z／時間／値の単位を書き戻す。
   * 未設定時の既定は実 Calibration に揃える（Z の "" は unit、T の "" は
   * "sec"、V の "" は "Gray Value"）。unitsArr の既定自体は変えず、
   * 読み取り経路でのみ補完する（他の既存挙動へ影響させないため） */
  "Stack.getUnits": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getUnits", args, 5, 5, "Stack.getUnits(xUnit, yUnit, zUnit, tUnit, vUnit)");
    const im = H.needImg(e.line, "Stack.getUnits");
    const u = unitsArr(im);
    const vals = [u[0], u[1], u[2] === "" ? u[0] : u[2], u[3] === "" ? "sec" : u[3], u[4] === "" ? "Gray Value" : u[4]];
    for (let i = 0; i < 5; i++) if (refs[i]) H.writeRef(refs[i], vals[i]);
    H.step(e.line, "スタックの単位（x／y／z／時間／値）を変数に入れます");
    return H.unk;
  },
  "Stack.setUnits": (S, e, args, refs, H) => {
    arity(H, e, "Stack.setUnits", args, 5, 5, "Stack.setUnits(xUnit, yUnit, zUnit, tUnit, valueUnit)");
    guardUnk(H, "Stack.setUnits", args);
    const im = H.needImg(e.line, "Stack.setUnits");
    im.units = args.map((a) => needStr(H, e, "Stack.setUnits", a, "単位"));
    H.step(e.line, "スタックの単位（x／y／z／t／値）を設定します");
    return H.unk;
  },
  "Stack.setXUnit": (S, e, args, refs, H) => { arity(H, e, "Stack.setXUnit", args, 1, 1, "Stack.setXUnit(unit)"); const im = H.needImg(e.line, "Stack.setXUnit"); unitsArr(im)[0] = needStr(H, e, "Stack.setXUnit", args[0], "単位"); H.step(e.line, "x 方向の単位を設定します"); return H.unk; },
  "Stack.setYUnit": (S, e, args, refs, H) => { arity(H, e, "Stack.setYUnit", args, 1, 1, "Stack.setYUnit(unit)"); const im = H.needImg(e.line, "Stack.setYUnit"); unitsArr(im)[1] = needStr(H, e, "Stack.setYUnit", args[0], "単位"); H.step(e.line, "y 方向の単位を設定します"); return H.unk; },
  "Stack.setZUnit": (S, e, args, refs, H) => { arity(H, e, "Stack.setZUnit", args, 1, 1, "Stack.setZUnit(unit)"); const im = H.needImg(e.line, "Stack.setZUnit"); unitsArr(im)[2] = needStr(H, e, "Stack.setZUnit", args[0], "単位"); H.step(e.line, "z 方向の単位を設定します"); return H.unk; },
  "Stack.setTUnit": (S, e, args, refs, H) => { arity(H, e, "Stack.setTUnit", args, 1, 1, "Stack.setTUnit(unit)"); const im = H.needImg(e.line, "Stack.setTUnit"); unitsArr(im)[3] = needStr(H, e, "Stack.setTUnit", args[0], "単位"); H.step(e.line, "時間方向の単位を設定します"); return H.unk; },
  "Stack.setDisplayMode": (S, e, args, refs, H) => {
    arity(H, e, "Stack.setDisplayMode", args, 1, 1, "Stack.setDisplayMode(mode)");
    guardUnk(H, "Stack.setDisplayMode", args);
    const im = needComposite(S, e, H, "Stack.setDisplayMode");
    const mode = needStr(H, e, "Stack.setDisplayMode", args[0], "モード").toLowerCase();
    let norm = null;
    if (mode === "composite") norm = "composite";
    else if (mode === "color") norm = "color";
    else if (mode.startsWith("gray")) norm = "grayscale";
    if (norm === null) throw H.err("Stack.setDisplayMode のモード「" + mode + "」は不正です", "ImageJ では \"Invalid mode\" エラーになり止まります。\"composite\"、\"color\"、\"grayscale\" のいずれかを指定してください。");
    im.displayMode = norm;
    H.step(e.line, "コンポジット画像の表示モードを " + norm + " に設定します");
    return H.unk;
  },
  /* Functions.getDisplayMode: コンポジット画像でなければ "" を書き戻す。
   * コンポジットで未設定なら実 CompositeImage の既定 "composite" */
  "Stack.getDisplayMode": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getDisplayMode", args, 1, 1, "Stack.getDisplayMode(string)");
    const im = H.needImg(e.line, "Stack.getDisplayMode");
    const nc = typeof im.channels === "number" ? im.channels : 1;
    const mode = nc > 1 ? (typeof im.displayMode === "string" ? im.displayMode : "composite") : "";
    if (refs[0]) H.writeRef(refs[0], mode);
    H.step(e.line, "表示モード（" + (mode === "" ? "非コンポジットのため空" : mode) + "）を変数に入れます");
    return H.unk;
  },
  "Stack.setActiveChannels": (S, e, args, refs, H) => {
    arity(H, e, "Stack.setActiveChannels", args, 1, 1, "Stack.setActiveChannels(string)");
    guardUnk(H, "Stack.setActiveChannels", args);
    const im = H.needImg(e.line, "Stack.setActiveChannels");
    im.activeChannels = needStr(H, e, "Stack.setActiveChannels", args[0], "チャンネル指定");
    H.step(e.line, "表示チャンネルを「" + im.activeChannels + "」に設定します（1=表示、0=非表示）");
    return H.unk;
  },
  /* Functions.getActiveChannels: 非コンポジットでは実機どおりエラー。
   * 未設定時の既定は全チャンネル表示（toggleChannel の初期化と同じ "1" の列） */
  "Stack.getActiveChannels": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getActiveChannels", args, 1, 1, "Stack.getActiveChannels(string)");
    const im = needComposite(S, e, H, "Stack.getActiveChannels");
    const nc = typeof im.channels === "number" ? im.channels : 1;
    const s = typeof im.activeChannels === "string" && im.activeChannels.length === nc ? im.activeChannels : "1".repeat(nc);
    if (refs[0]) H.writeRef(refs[0], s);
    H.step(e.line, "表示チャンネルの文字列（" + s + "）を変数に入れます");
    return H.unk;
  },
  "Stack.toggleChannel": (S, e, args, refs, H) => {
    arity(H, e, "Stack.toggleChannel", args, 1, 1, "Stack.toggleChannel(channel)");
    guardUnk(H, "Stack.toggleChannel", args);
    const im = needComposite(S, e, H, "Stack.toggleChannel");
    const n = intA(H, args[0]);
    const nc = typeof im.channels === "number" ? im.channels : 1;
    if (typeof n !== "number" || n < 1 || n > nc) throw H.err("Stack.toggleChannel のチャンネル（" + H.fmt(n) + "）が不正です", "ImageJ では \"Invalid channel: " + H.fmt(n) + "\" エラーになり止まります。");
    if (typeof im.activeChannels !== "string" || im.activeChannels.length !== nc) im.activeChannels = "1".repeat(nc);
    const arr = im.activeChannels.split("");
    arr[n - 1] = arr[n - 1] === "1" ? "0" : "1";
    im.activeChannels = arr.join("");
    H.step(e.line, "チャンネル " + n + " の表示を切り替えます（現在の表示チャンネル: " + im.activeChannels + "）");
    return H.unk;
  },
  /* スライスの画素自体はモデルに無いため、入れ替えが観測できるのはスライスラベルだけ */
  "Stack.swap": (S, e, args, refs, H) => {
    arity(H, e, "Stack.swap", args, 2, 2, "Stack.swap(n1, n2)");
    guardUnk(H, "Stack.swap", args);
    const im = needStack(S, e, H, "Stack.swap");
    const n1 = intA(H, args[0]), n2 = intA(H, args[1]);
    const size = stackSizeOf(im);
    if (typeof n1 !== "number" || typeof n2 !== "number" || n1 < 1 || n1 > size || n2 < 1 || n2 > size)
      throw H.err("Stack.swap の引数が範囲外です", "スライス番号は 1〜" + size + " で指定してください。ImageJ では \"Argument out of range\" エラーになり止まります。");
    if (im.sliceLabels) { const tmp = im.sliceLabels[n1]; im.sliceLabels[n1] = im.sliceLabels[n2]; im.sliceLabels[n2] = tmp; }
    H.step(e.line, "スライス " + n1 + " と " + n2 + " を入れ替えます（モデルではスライスラベルの入れ替えとして保持します）");
    return H.unk;
  },
  "Stack.setOrthoViews": { unsupported: "Orthogonal Views プラグインのウィンドウ状態はモデルに無いため。" },
  "Stack.startOrthoViews": { unsupported: "Orthogonal Views プラグインのウィンドウ生成はモデルに無いため。" },
  "Stack.stopOrthoViews": { unsupported: "Orthogonal Views プラグインのウィンドウ状態はモデルに無いため。" },
  /* Orthogonal_Views はモデルで起動できない（getInstance()==null）。
   * その分岐では getImageIDs() が {0,0,0} を返すことが一次情報
   * （Orthogonal_Views.java）で確認できたため、常に 0 を書き戻す */
  "Stack.getOrthoViews": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getOrthoViews", args, 3, 3, "Stack.getOrthoViews(xy, xz, yz)");
    for (let i = 0; i < 3; i++) if (refs[i]) H.writeRef(refs[i], 0);
    H.step(e.line, "直交ビューは起動していないため、3つの変数にはすべて 0 が入ります");
    return H.unk;
  },
  "Stack.getOrthoViewsIDs": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getOrthoViewsIDs", args, 3, 3, "Stack.getOrthoViewsIDs(xyID, xzID, yzID)");
    for (let i = 0; i < 3; i++) if (refs[i]) H.writeRef(refs[i], 0);
    H.step(e.line, "直交ビューは起動していないため、3つの ID にはすべて 0 が入ります");
    return H.unk;
  },
  /* ビューが起動していない（このモデルでは起動できない）ため 0 が確定する */
  "Stack.getOrthoViewsID": (S, e, args, refs, H) => {
    arity(H, e, "Stack.getOrthoViewsID", args, 0, 0, "Stack.getOrthoViewsID()");
    H.step(e.line, "Orthogonal Views は起動していないため、ID は 0 です");
    return 0;
  },
});

/* ================= Roi.* ================= */
const ROI_TYPE_NAMES = { rectangle: "rectangle", oval: "oval", polygon: "polygon", freehand: "freehand", traced: "traced", line: "line", angle: "angle", composite: "composite", point: "point", text: "text", selection: "selection" };
Object.assign(STATE, {
  "Roi.size": (S, e, args, refs, H) => {
    arity(H, e, "Roi.size", args, 0, 0, "Roi.size()");
    H.needImg(e.line, "Roi.size");
    const sz = roiSizeOf(S.roi);
    if (sz === null) { H.step(e.line, "Roi.size：この選択を定義する点の数はモデルで保持していないため、値は省略します"); return H.unk; }
    return sz;
  },
  "Roi.contains": (S, e, args, refs, H) => {
    arity(H, e, "Roi.contains", args, 2, 2, "Roi.contains(x, y)");
    const roi = needRoi(S, e, H, "Roi.contains");
    const px = Math.round(H.numArg(args[0])), py = Math.round(H.numArg(args[1]));
    const c = roiContainsPoint(roi, px, py);
    if (c === null) { H.step(e.line, "Roi.contains：この選択形状では内包判定をモデルで確定できないため、値は省略します"); return H.unk; }
    return c ? 1 : 0;
  },
  "Roi.getBounds": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getBounds", args, 4, 4, "Roi.getBounds(x, y, width, height)");
    const im = H.needImg(e.line, "Roi.getBounds");
    let vals;
    if (!S.roi) vals = [0, 0, im.w, im.h];
    else { const b = H.roiBounds(S.roi); vals = b || [H.unk, H.unk, H.unk, H.unk]; }
    for (let i = 0; i < 4; i++) if (refs[i]) H.writeRef(refs[i], vals[i]);
    H.step(e.line, S.roi ? "選択の外接矩形を変数に入れます" : "選択がないため、画像全体の矩形を変数に入れます");
    return H.unk;
  },
  /* Roi.getFloatBounds: 整数 bounds をそのまま数値として書き戻す
   * （Roi.getBounds と同じ値。選択が無ければ画像全体の矩形） */
  "Roi.getFloatBounds": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getFloatBounds", args, 4, 4, "Roi.getFloatBounds(x, y, width, height)");
    const im = H.needImg(e.line, "Roi.getFloatBounds");
    let vals;
    if (!S.roi) vals = [0, 0, im.w, im.h];
    else { const b = H.roiBounds(S.roi); vals = b || [H.unk, H.unk, H.unk, H.unk]; }
    for (let i = 0; i < 4; i++) if (refs[i]) H.writeRef(refs[i], vals[i]);
    H.step(e.line, S.roi ? "選択の外接矩形を変数に入れます" : "選択がないため、画像全体の矩形を変数に入れます");
    return H.unk;
  },
  "Roi.getCoordinates": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getCoordinates", args, 2, 2, "Roi.getCoordinates(xpoints, ypoints)");
    const roi = needRoi(S, e, H, "Roi.getCoordinates");
    const co = roiCoords(roi);
    if (co) { if (refs[0]) H.writeRef(refs[0], co[0]); if (refs[1]) H.writeRef(refs[1], co[1]); H.step(e.line, "選択の座標点を変数に入れます"); }
    else {
      if (refs[0]) H.writeRef(refs[0], H.unk); if (refs[1]) H.writeRef(refs[1], H.unk);
      H.step(e.line, "Roi.getCoordinates：この選択の頂点はモデルで保持していないため、値は省略します");
    }
    return H.unk;
  },
  /* getContainedFloatPoints の規則: 外接矩形内を行優先に走査し、
   * roiContainsPoint が真の画素を集める。対応範囲は rectangle／oval／polygon */
  "Roi.getContainedPoints": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getContainedPoints", args, 2, 2, "Roi.getContainedPoints(xpoints, ypoints)");
    const roi = needRoi(S, e, H, "Roi.getContainedPoints");
    if (!["rectangle", "oval", "polygon"].includes(roi.type))
      throw H.err("未検証：Roi.getContainedPoints は意味論を一次情報で確定できていないため停止します",
        "形状 " + roi.type + " の内包点列挙はマスク走査の規則が一次情報から確定できないため。対応範囲は rectangle／oval／polygon です。");
    const b = H.roiBounds(roi);
    const xs = [], ys = [];
    if (b) for (let y = b[1]; y < b[1] + b[3]; y++) for (let x = b[0]; x < b[0] + b[2]; x++)
      if (roiContainsPoint(roi, x, y) === true) { xs.push(x); ys.push(y); }
    if (refs[0]) H.writeRef(refs[0], xs);
    if (refs[1]) H.writeRef(refs[1], ys);
    H.step(e.line, "選択に含まれる画素点 " + xs.length + " 件を変数に入れます");
    return H.unk;
  },
  /* Roi.getFeretValues の [8..15] を2つの配列変数へ書き戻す
   * （Functions.getFeretPoints の並び: xs={a8,a10,a12,a14}、ys={a9,a11,a13,a15}）。
   * 対応範囲は polygon／rectangle */
  "Roi.getFeretPoints": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getFeretPoints", args, 2, 2, "Roi.getFeretPoints(xpoints, ypoints)");
    const roi = needRoi(S, e, H, "Roi.getFeretPoints");
    let pts = null;
    if (roi.type === "polygon" && Array.isArray(roi.points) && roi.points.length) pts = roi.points;
    else if (roi.type === "rectangle") pts = [[roi.x, roi.y], [roi.x + roi.w, roi.y], [roi.x + roi.w, roi.y + roi.h], [roi.x, roi.y + roi.h]];
    if (!pts || pts.length < 2)
      throw H.err("未検証：Roi.getFeretPoints は意味論を一次情報で確定できていないため停止します",
        "形状 " + roi.type + " の Feret 点列は凸包の規則が一次情報から確定できないため。対応範囲は polygon／rectangle です。");
    const im = H.img();
    const pw = im && Array.isArray(im.voxel) && typeof im.voxel[0] === "number" ? im.voxel[0] : 1;
    const ph = im && Array.isArray(im.voxel) && typeof im.voxel[1] === "number" ? im.voxel[1] : 1;
    const f = feretPointsOf(pts, pw, ph);
    if (refs[0]) H.writeRef(refs[0], [f.maxPair[0][0], f.maxPair[1][0], f.minEnd[0], f.minEnd[2]]);
    if (refs[1]) H.writeRef(refs[1], [f.maxPair[0][1], f.maxPair[1][1], f.minEnd[1], f.minEnd[3]]);
    H.step(e.line, "選択の Feret 点列（最大点対と最小キャリパの端点）を変数に入れます");
    return H.unk;
  },
  /* PolygonRoi は非スプライン頂点、それ以外は float polygon を書き戻す。
   * モデルで頂点を保持する形状（頂点保持型と rectangle、line）だけが対象 */
  "Roi.getSplineAnchors": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getSplineAnchors", args, 2, 2, "Roi.getSplineAnchors(xpoints, ypoints)");
    const roi = needRoi(S, e, H, "Roi.getSplineAnchors");
    let xs = null, ys = null;
    if (Array.isArray(roi.points) && roi.points.length) { xs = roi.points.map((p) => p[0]); ys = roi.points.map((p) => p[1]); }
    else if (roi.type === "rectangle") { xs = [roi.x, roi.x + roi.w, roi.x + roi.w, roi.x]; ys = [roi.y, roi.y, roi.y + roi.h, roi.y + roi.h]; }
    else if (roi.type === "line") { const c = roiCoords(roi); if (c) { xs = c[0]; ys = c[1]; } }
    if (!xs)
      throw H.err("未検証：Roi.getSplineAnchors は意味論を一次情報で確定できていないため停止します",
        "形状 " + roi.type + " は頂点を保持しないため、アンカー点列がモデルで確定できないため。対応範囲は頂点保持型／rectangle／line です。");
    if (refs[0]) H.writeRef(refs[0], xs);
    if (refs[1]) H.writeRef(refs[1], ys);
    H.step(e.line, "選択のアンカー点 " + xs.length + " 件を変数に入れます");
    return H.unk;
  },
  "Roi.setPolygonSplineAnchors": { unverified: "スプライン補間式は決定的だが、生成頂点数がキャンバス表示倍率に依存し、モデルに表示倍率の状態が無いため、結果の頂点列が確定しない。" },
  "Roi.setPolylineSplineAnchors": { unverified: "スプライン補間式は決定的だが、生成頂点数がキャンバス表示倍率に依存し、モデルに表示倍率の状態が無いため、結果の頂点列が確定しない。" },
  /* Roi の既定色はモデル内に変更経路が無いため、Roi.java の既定 "yellow" で確定 */
  "Roi.getDefaultColor": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getDefaultColor", args, 0, 0, "Roi.getDefaultColor()");
    return "yellow";
  },
  "Roi.getStrokeColor": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getStrokeColor", args, 0, 0, "Roi.getStrokeColor()");
    const roi = needRoi(S, e, H, "Roi.getStrokeColor");
    const c = roiColorOf(roi, "stroke");
    if (!c.known) { H.step(e.line, "Roi.getStrokeColor：線色の指定「" + roi.strokeColorSpec + "」の解釈がモデルで確定しないため、値は省略します"); return H.unk; }
    return colorToString(c.rgb);
  },
  "Roi.getFillColor": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getFillColor", args, 0, 0, "Roi.getFillColor()");
    const roi = needRoi(S, e, H, "Roi.getFillColor");
    const c = roiColorOf(roi, "fill");
    if (!c.known) { H.step(e.line, "Roi.getFillColor：塗り色の指定「" + roi.fillColorSpec + "」の解釈がモデルで確定しないため、値は省略します"); return H.unk; }
    return colorToString(c.rgb);
  },
  /* Roi.getProperties: キーをソートし、各行 "key: value\n" を連結する。
   * プロパティが無ければ ""（Functions 側で null→"" に変換される） */
  "Roi.getProperties": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getProperties", args, 0, 0, "Roi.getProperties()");
    const roi = needRoi(S, e, H, "Roi.getProperties");
    if (!roi.props || !Object.keys(roi.props).length) return "";
    return Object.keys(roi.props).sort().map((k) => k + ": " + roi.props[k] + "\n").join("");
  },
  "Roi.getName": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getName", args, 0, 0, "Roi.getName()");
    const roi = needRoi(S, e, H, "Roi.getName");
    return typeof roi.name === "string" ? roi.name : "";
  },
  "Roi.setName": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setName", args, 1, 1, "Roi.setName(name)");
    guardUnk(H, "Roi.setName", args);
    const roi = needRoi(S, e, H, "Roi.setName");
    roi.name = needStr(H, e, "Roi.setName", args[0], "名前");
    H.step(e.line, "選択の名前を「" + roi.name + "」に設定します");
    return H.unk;
  },
  "Roi.getProperty": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getProperty", args, 1, 1, "Roi.getProperty(key)");
    const roi = needRoi(S, e, H, "Roi.getProperty");
    const k = strA(H, args[0]);
    if (k === null) return H.unk;
    return roi.props && Object.prototype.hasOwnProperty.call(roi.props, k) ? roi.props[k] : "";
  },
  "Roi.setProperty": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setProperty", args, 1, 2, "Roi.setProperty(key[, value])");
    guardUnk(H, "Roi.setProperty", [args[0]]);
    const roi = needRoi(S, e, H, "Roi.setProperty");
    const k = needStr(H, e, "Roi.setProperty", args[0], "キー");
    if (k.indexOf(" ") !== -1) throw H.err("Roi.setProperty のキーに空白が含まれています", "ImageJ では \"Keys contain a space\" エラーになり止まります。");
    const v = args.length > 1 ? needStr(H, e, "Roi.setProperty", args[1], "値") : "1";
    if (!roi.props) roi.props = {};
    roi.props[k] = v;
    H.step(e.line, "選択のプロパティ " + k + " = " + v + " を設定します");
    return H.unk;
  },
  "Roi.getType": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getType", args, 0, 0, "Roi.getType()");
    const roi = needRoi(S, e, H, "Roi.getType");
    if (roi.type === "polyline" || roi.type === "freeline") {
      H.step(e.line, "Roi.getType：折れ線系の種別名は Roi.java の型名表記が一次情報で確定しないため、値は省略します");
      return H.unk;
    }
    return ROI_TYPE_NAMES[roi.type] || H.unk;
  },
  "Roi.move": (S, e, args, refs, H) => {
    arity(H, e, "Roi.move", args, 2, 2, "Roi.move(x, y)");
    guardUnk(H, "Roi.move", args);
    const roi = needRoi(S, e, H, "Roi.move");
    moveRoiTo(roi, Math.round(H.numArg(args[0])), Math.round(H.numArg(args[1])));
    H.step(e.line, "選択を (" + roi.x + ", " + roi.y + ") へ移動します");
    return H.unk;
  },
  "Roi.translate": (S, e, args, refs, H) => {
    arity(H, e, "Roi.translate", args, 2, 2, "Roi.translate(dx, dy)");
    guardUnk(H, "Roi.translate", args);
    const roi = needRoi(S, e, H, "Roi.translate");
    moveRoiTo(roi, roi.x + H.numArg(args[0]), roi.y + H.numArg(args[1]));
    H.step(e.line, "選択を (" + H.fmt(args[0]) + ", " + H.fmt(args[1]) + ") だけ平行移動します");
    return H.unk;
  },
  "Roi.setStrokeColor": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setStrokeColor", args, 1, 3, "Roi.setStrokeColor(color) または Roi.setStrokeColor(r, g, b)");
    guardUnk(H, "Roi.setStrokeColor", args);
    const roi = needRoi(S, e, H, "Roi.setStrokeColor");
    /* 文字列形と RGB 形は排他（後から設定した形が残る） */
    if (args.length === 1) { roi.strokeColorSpec = needStr(H, e, "Roi.setStrokeColor", args[0], "色"); delete roi.strokeColorRgb; }
    else { roi.strokeColorRgb = [intA(H, args[0]), intA(H, args[1]), intA(H, args[2])]; delete roi.strokeColorSpec; }
    H.step(e.line, "選択の輪郭色を設定します");
    return H.unk;
  },
  "Roi.setFillColor": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setFillColor", args, 1, 3, "Roi.setFillColor(color) または Roi.setFillColor(r, g, b)");
    guardUnk(H, "Roi.setFillColor", args);
    const roi = needRoi(S, e, H, "Roi.setFillColor");
    if (args.length === 1) { roi.fillColorSpec = needStr(H, e, "Roi.setFillColor", args[0], "色"); delete roi.fillColorRgb; }
    else { roi.fillColorRgb = [intA(H, args[0]), intA(H, args[1]), intA(H, args[2])]; delete roi.fillColorSpec; }
    /* Roi.setFillColor の実副作用: 面 ROI に塗り色を設定すると線色は null に戻る */
    if (["rectangle", "oval", "polygon", "freehand", "traced", "composite"].includes(roi.type)) {
      delete roi.strokeColorSpec; delete roi.strokeColorRgb;
    }
    H.step(e.line, "選択の塗り色を設定します");
    return H.unk;
  },
  "Roi.setAntiAlias": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setAntiAlias", args, 1, 1, "Roi.setAntiAlias(boolean)");
    const roi = needRoi(S, e, H, "Roi.setAntiAlias");
    roi.antialias = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "選択のアンチエイリアス設定を変更します（描画だけの設定です）");
    return H.unk;
  },
  "Roi.setStrokeWidth": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setStrokeWidth", args, 1, 1, "Roi.setStrokeWidth(width)");
    guardUnk(H, "Roi.setStrokeWidth", args);
    const roi = needRoi(S, e, H, "Roi.setStrokeWidth");
    roi.strokeWidth = H.numArg(args[0]);
    H.step(e.line, "選択の線幅を " + H.fmt(roi.strokeWidth) + " に設定します");
    return H.unk;
  },
  "Roi.getStrokeWidth": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getStrokeWidth", args, 0, 0, "Roi.getStrokeWidth()");
    const roi = needRoi(S, e, H, "Roi.getStrokeWidth");
    if (typeof roi.strokeWidth === "number") return roi.strokeWidth;
    H.step(e.line, "Roi.getStrokeWidth：線幅はこの実行で設定されていないため、値は省略します");
    return H.unk;
  },
  "Roi.setMinStrokeWidth": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setMinStrokeWidth", args, 1, 1, "Roi.setMinStrokeWidth(width)");
    guardUnk(H, "Roi.setMinStrokeWidth", args);
    const roi = needRoi(S, e, H, "Roi.setMinStrokeWidth");
    roi.minStrokeWidth = H.numArg(args[0]);
    H.step(e.line, "選択の最小線幅を設定します（描画だけの設定です）");
    return H.unk;
  },
  "Roi.setUnscalableStrokeWidth": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setUnscalableStrokeWidth", args, 1, 1, "Roi.setUnscalableStrokeWidth(boolean)");
    const roi = needRoi(S, e, H, "Roi.setUnscalableStrokeWidth");
    roi.unscalableStroke = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "選択の線幅を拡縮に追従させない設定にします（描画だけの設定です）");
    return H.unk;
  },
  "Roi.setGroup": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setGroup", args, 1, 1, "Roi.setGroup(group)");
    guardUnk(H, "Roi.setGroup", args);
    const roi = needRoi(S, e, H, "Roi.setGroup");
    roi.group = intA(H, args[0]);
    H.step(e.line, "選択のグループを " + roi.group + " に設定します");
    return H.unk;
  },
  "Roi.getGroup": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getGroup", args, 0, 0, "Roi.getGroup()");
    const roi = needRoi(S, e, H, "Roi.getGroup");
    return typeof roi.group === "number" ? roi.group : 0;
  },
  "Roi.setDefaultGroup": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setDefaultGroup", args, 1, 1, "Roi.setDefaultGroup(group)");
    guardUnk(H, "Roi.setDefaultGroup", args);
    H.needImg(e.line, "Roi.setDefaultGroup");
    S.__roiDefGroup = intA(H, args[0]);
    H.step(e.line, "ROI の既定グループを " + S.__roiDefGroup + " に設定します");
    return H.unk;
  },
  "Roi.getDefaultGroup": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getDefaultGroup", args, 0, 0, "Roi.getDefaultGroup()");
    H.needImg(e.line, "Roi.getDefaultGroup");
    return typeof S.__roiDefGroup === "number" ? S.__roiDefGroup : 0;
  },
  "Roi.setPosition": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setPosition", args, 1, 3, "Roi.setPosition(slice) または Roi.setPosition(channel, slice, frame)");
    guardUnk(H, "Roi.setPosition", args);
    const roi = needRoi(S, e, H, "Roi.setPosition");
    if (args.length === 1) roi.zpos = intA(H, args[0]);
    else { roi.cpos = intA(H, args[0]); roi.zpos = intA(H, args[1]); roi.tpos = intA(H, args[2]); }
    H.step(e.line, "選択のスタック位置を設定します");
    return H.unk;
  },
  "Roi.getPosition": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getPosition", args, 3, 3, "Roi.getPosition(channel, slice, frame)");
    const roi = needRoi(S, e, H, "Roi.getPosition");
    const vals = [typeof roi.cpos === "number" ? roi.cpos : 0, typeof roi.zpos === "number" ? roi.zpos : 0, typeof roi.tpos === "number" ? roi.tpos : 0];
    for (let i = 0; i < 3; i++) if (refs[i]) H.writeRef(refs[i], vals[i]);
    H.step(e.line, "選択のスタック位置（チャンネル " + vals[0] + "、スライス " + vals[1] + "、フレーム " + vals[2] + "）を変数に入れます（0 は全位置共通）");
    return H.unk;
  },
  "Roi.getPointPosition": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getPointPosition", args, 1, 1, "Roi.getPointPosition(index)");
    const roi = needRoi(S, e, H, "Roi.getPointPosition");
    if (roi.type !== "point") throw H.err("Roi.getPointPosition には点の選択が必要です", "ImageJ では \"Point selection required\" エラーになり止まります。");
    const i = intA(H, args[0]);
    const n = typeof roi.npoints === "number" ? roi.npoints : 1;
    if (typeof i !== "number" || i < 0 || i >= n) throw H.err("Roi.getPointPosition の番号（" + H.fmt(i) + "）が範囲外です", "点の数は " + n + " 個です。ImageJ ではここでエラーになり止まります。");
    if (i === 0) return typeof roi.zpos === "number" ? roi.zpos : 0;
    H.step(e.line, "Roi.getPointPosition：2点目以降の各点の位置はモデルで保持していないため、値は省略します");
    return H.unk;
  },
  "Roi.setJustification": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setJustification", args, 1, 1, "Roi.setJustification(\"left\"|\"center\"|\"right\")");
    const roi = needRoi(S, e, H, "Roi.setJustification");
    if (roi.type === "text") {
      const j = strA(H, args[0]);
      roi.justification = j === "center" ? 1 : j === "right" ? 2 : 0;
      H.step(e.line, "テキスト選択の行揃えを設定します");
    } else H.step(e.line, "Roi.setJustification：テキスト選択以外では何もしません");
    return H.unk;
  },
  "Roi.setFontSize": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setFontSize", args, 1, 1, "Roi.setFontSize(size)");
    const roi = needRoi(S, e, H, "Roi.setFontSize");
    if (roi.type === "text") { roi.fontSize = H.numArg(args[0]); H.step(e.line, "テキスト選択のフォントサイズを設定します"); }
    else H.step(e.line, "Roi.setFontSize：テキスト選択以外では何もしません");
    return H.unk;
  },
  "Roi.getGroupNames": (S, e, args, refs, H) => {
    arity(H, e, "Roi.getGroupNames", args, 0, 0, "Roi.getGroupNames()");
    H.needImg(e.line, "Roi.getGroupNames");
    return typeof S.__roiGroupNames === "string" ? S.__roiGroupNames : "";
  },
  "Roi.setGroupNames": (S, e, args, refs, H) => {
    arity(H, e, "Roi.setGroupNames", args, 1, 1, "Roi.setGroupNames(string)");
    guardUnk(H, "Roi.setGroupNames", args);
    H.needImg(e.line, "Roi.setGroupNames");
    S.__roiGroupNames = needStr(H, e, "Roi.setGroupNames", args[0], "グループ名");
    H.step(e.line, "ROI グループ名の一覧を設定します");
    return H.unk;
  },
  "Roi.remove": (S, e, args, refs, H) => {
    arity(H, e, "Roi.remove", args, 0, 0, "Roi.remove()");
    H.needImg(e.line, "Roi.remove");
    S.roi = null;
    H.step(e.line, "現在の選択を解除します");
    return H.unk;
  },
  "Roi.selectNone": (S, e, args, refs, H) => {
    arity(H, e, "Roi.selectNone", args, 0, 0, "Roi.selectNone()");
    H.needImg(e.line, "Roi.selectNone");
    S.roi = null;
    H.step(e.line, "選択を解除します");
    return H.unk;
  },
  "Roi.copy": (S, e, args, refs, H) => {
    arity(H, e, "Roi.copy", args, 0, 0, "Roi.copy()");
    const roi = needRoi(S, e, H, "Roi.copy");
    S.__roiClip = clone(roi);
    H.step(e.line, "現在の選択を ROI クリップボードにコピーします");
    return H.unk;
  },
  "Roi.paste": (S, e, args, refs, H) => {
    arity(H, e, "Roi.paste", args, 0, 0, "Roi.paste()");
    H.needImg(e.line, "Roi.paste");
    if (S.__roiClip) { S.roi = clone(S.__roiClip); H.step(e.line, "ROI クリップボードの選択を貼り付けます"); }
    else H.step(e.line, "Roi.paste：ROI クリップボードが空のため、何もしません");
    return H.unk;
  },
});

/* ================= RoiManager.* ================= */
function rmSel(S) { if (!S.__rmSel) S.__rmSel = []; return S.__rmSel; }
function rmTargets(S) {
  const sel = rmSel(S);
  return sel.length ? sel.slice() : S.roiList.map((_, i) => i);
}
/* RoiRotator.rotate（FIX-IJB で格上げ）: theta=−angle·π/180 とし、各点を
 * 中心のまわりに極座標で回転して float にキャストする（y は中心から上向きに
 * 測ることで画像座標の y 下向きを吸収する）。型変換は実規則どおり
 * LINE→LINE、POINT→POINT、RECTANGLE→POLYGON、POLYGON→POLYGON */
function rotateRoiPoints(roi, theta, cx, cy) {
  const rot = (x, y) => {
    const dx = x - cx, dy = cy - y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    return [Math.fround(cx + r * Math.cos(a + theta)), Math.fround(cy - r * Math.sin(a + theta))];
  };
  const out = clone(roi);
  if (roi.type === "line") {
    const c = roiCoords(roi);
    if (c) {
      const p1 = rot(c[0][0], c[1][0]), p2 = rot(c[0][1], c[1][1]);
      out.x = p1[0]; out.y = p1[1]; out.x2 = p2[0]; out.y2 = p2[1];
      out.ex1 = p1[0]; out.ey1 = p1[1]; out.ex2 = p2[0]; out.ey2 = p2[1];
      out.w = Math.abs(p2[0] - p1[0]); out.h = Math.abs(p2[1] - p1[1]);
    }
    return out;
  }
  let pts = null;
  if (Array.isArray(roi.points) && roi.points.length) pts = roi.points.map((p) => [p[0], p[1]]);
  else if (roi.type === "rectangle") pts = [[roi.x, roi.y], [roi.x + roi.w, roi.y], [roi.x + roi.w, roi.y + roi.h], [roi.x, roi.y + roi.h]];
  else if (roi.type === "point") pts = [[roi.x, roi.y]];
  if (pts) {
    const rp = pts.map((p) => rot(p[0], p[1]));
    out.points = rp;
    const xs = rp.map((p) => p[0]), ys = rp.map((p) => p[1]);
    out.x = Math.min.apply(null, xs); out.y = Math.min.apply(null, ys);
    out.w = Math.max.apply(null, xs) - out.x; out.h = Math.max.apply(null, ys) - out.y;
    if (roi.type === "rectangle") out.type = "polygon";
    if (roi.type === "point" && !Array.isArray(roi.points)) { out.x = rp[0][0]; out.y = rp[0][1]; out.w = 0; out.h = 0; }
  }
  return out;
}
Object.assign(STATE, {
  "RoiManager.size": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.size", args, 0, 0, "RoiManager.size()");
    return S.roiList.length;
  },
  /* 選択中の ROI の「件数」（html の定義どおり。番号ではない） */
  "RoiManager.selected": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.selected", args, 0, 0, "RoiManager.selected()");
    return rmSel(S).length;
  },
  "RoiManager.select": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.select", args, 1, 1, "RoiManager.select(index)");
    const ix = intA(H, args[0]);
    if (typeof ix !== "number" || ix < 0 || ix >= S.roiList.length) {
      H.warn(e.line, "RoiManager.select(" + H.fmt(ix) + ") の番号が登録数 " + S.roiList.length + " の範囲外です", "ImageJ では選択が変わらないか、エラーになります。ループの上限と登録数を確認してください。");
      return H.unk;
    }
    S.roi = S.roiList[ix];
    S.__rmSel = [ix];
    H.step(e.line, "ROI Manager の " + ix + " 番目の ROI を選択します");
    return H.unk;
  },
  "RoiManager.selectByName": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.selectByName", args, 1, 1, "RoiManager.selectByName(name)");
    const nm = strA(H, args[0]);
    if (nm === null) { H.step(e.line, "RoiManager.selectByName：名前が未確定のため、選択は変わりません"); return H.unk; }
    const ix = nm === "" ? -1 : S.roiList.findIndex((r) => r && r.name === nm);
    S.__rmSel = ix >= 0 ? [ix] : [];
    if (ix >= 0) { S.roi = S.roiList[ix]; H.step(e.line, "ROI Manager の「" + nm + "」を選択します"); }
    else H.step(e.line, "ROI Manager に「" + nm + "」が無いため、選択を解除します");
    return H.unk;
  },
  "RoiManager.getName": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.getName", args, 1, 1, "RoiManager.getName(index)");
    const ix = intA(H, args[0]);
    if (typeof ix !== "number" || ix < 0 || ix >= S.roiList.length) return "";
    const r = S.roiList[ix];
    return r && typeof r.name === "string" ? r.name : "";
  },
  "RoiManager.getIndex": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.getIndex", args, 1, 1, "RoiManager.getIndex(name)");
    const nm = strA(H, args[0]);
    if (nm === null || nm === "") return -1;
    return S.roiList.findIndex((r) => r && r.name === nm);
  },
  "RoiManager.delete": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.delete", args, 1, 1, "RoiManager.delete(index)");
    const ix = intA(H, args[0]);
    if (typeof ix !== "number" || ix < 0 || ix >= S.roiList.length) {
      H.warn(e.line, "RoiManager.delete(" + H.fmt(ix) + ") の番号が登録数 " + S.roiList.length + " の範囲外です", "削除する ROI の番号を確認してください。");
      return H.unk;
    }
    const removed = S.roiList.splice(ix, 1)[0];
    if (S.roi === removed) S.roi = null;
    S.__rmSel = rmSel(S).filter((i) => i !== ix).map((i) => (i > ix ? i - 1 : i));
    H.step(e.line, "ROI Manager の " + ix + " 番目の ROI を削除します（登録数は " + S.roiList.length + " 件になります）");
    return H.unk;
  },
  "RoiManager.setGroup": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.setGroup", args, 1, 1, "RoiManager.setGroup(group)");
    guardUnk(H, "RoiManager.setGroup", args);
    const g = intA(H, args[0]);
    if (typeof g === "number" && g < 0) throw H.err("RoiManager.setGroup のグループ（" + g + "）が範囲外です", "ImageJ では \"Group out of range\" エラーになり止まります。");
    for (const i of rmTargets(S)) if (S.roiList[i]) S.roiList[i].group = g;
    H.step(e.line, "ROI Manager の対象 ROI のグループを " + H.fmt(g) + " に設定します（選択が無ければ全件）");
    return H.unk;
  },
  "RoiManager.selectGroup": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.selectGroup", args, 1, 1, "RoiManager.selectGroup(group)");
    const g = intA(H, args[0]);
    S.__rmSel = S.roiList.map((r, i) => ((r && typeof r.group === "number" ? r.group : 0) === g ? i : -1)).filter((i) => i >= 0);
    H.step(e.line, "グループ " + H.fmt(g) + " の ROI を " + S.__rmSel.length + " 件選択します");
    return H.unk;
  },
  "RoiManager.selectPosition": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.selectPosition", args, 3, 3, "RoiManager.selectPosition(channel, slice, frame)");
    const c = intA(H, args[0]), z = intA(H, args[1]), t = intA(H, args[2]);
    S.__rmSel = S.roiList.map((r, i) => (r && (typeof r.cpos === "number" ? r.cpos : 0) === c && (typeof r.zpos === "number" ? r.zpos : 0) === z && (typeof r.tpos === "number" ? r.tpos : 0) === t ? i : -1)).filter((i) => i >= 0);
    H.step(e.line, "位置（チャンネル " + H.fmt(c) + "、スライス " + H.fmt(z) + "、フレーム " + H.fmt(t) + "）の ROI を " + S.__rmSel.length + " 件選択します");
    return H.unk;
  },
  "RoiManager.setPosition": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.setPosition", args, 1, 3, "RoiManager.setPosition(slice) または RoiManager.setPosition(channel, slice, frame)");
    guardUnk(H, "RoiManager.setPosition", args);
    for (const i of rmTargets(S)) {
      const r = S.roiList[i]; if (!r) continue;
      if (args.length === 1) r.zpos = intA(H, args[0]);
      else { r.cpos = intA(H, args[0]); r.zpos = intA(H, args[1]); r.tpos = intA(H, args[2]); }
    }
    H.step(e.line, "ROI Manager の対象 ROI のスタック位置を設定します（選択が無ければ全件）");
    return H.unk;
  },
  "RoiManager.translate": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.translate", args, 2, 2, "RoiManager.translate(dx, dy)");
    guardUnk(H, "RoiManager.translate", args);
    const sel = rmSel(S);
    if (!sel.length) { H.step(e.line, "RoiManager.translate：選択中の ROI が無いため、何もしません"); return H.unk; }
    const dx = H.numArg(args[0]), dy = H.numArg(args[1]);
    for (const i of sel) { const r = S.roiList[i]; if (r) moveRoiTo(r, r.x + dx, r.y + dy); }
    H.step(e.line, "選択中の ROI（" + sel.length + " 件）を (" + H.fmt(dx) + ", " + H.fmt(dy) + ") だけ平行移動します");
    return H.unk;
  },
  "RoiManager.scale": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.scale", args, 3, 3, "RoiManager.scale(xScale, yScale, centered)");
    guardUnk(H, "RoiManager.scale", [args[0], args[1]]);
    const sel = rmSel(S);
    if (!sel.length) { H.step(e.line, "RoiManager.scale：選択中の ROI が無いため、何もしません"); return H.unk; }
    const xs = H.numArg(args[0]), ys = H.numArg(args[1]);
    let ox = 0, oy = 0;
    if (!H.isUnk(args[2]) && H.truthy(args[2])) { const im = H.img(); if (im) { ox = im.w / 2; oy = im.h / 2; } }
    for (const i of sel) {
      const r = S.roiList[i]; if (!r || typeof r.x !== "number") continue;
      const nx = ox + (r.x - ox) * xs, ny = oy + (r.y - oy) * ys;
      if (typeof r.x2 === "number") r.x2 = ox + (r.x2 - ox) * xs;
      if (typeof r.y2 === "number") r.y2 = oy + (r.y2 - oy) * ys;
      if (Array.isArray(r.points)) r.points = r.points.map((p) => [ox + (p[0] - ox) * xs, oy + (p[1] - oy) * ys]);
      r.x = nx; r.y = ny;
      if (typeof r.w === "number") r.w = r.w * xs;
      if (typeof r.h === "number") r.h = r.h * ys;
    }
    H.step(e.line, "選択中の ROI（" + sel.length + " 件）を x " + H.fmt(xs) + " 倍、y " + H.fmt(ys) + " 倍に拡縮します");
    return H.unk;
  },
  /* RoiManager.rotate: 対象は選択中（無ければ全件）。中心未指定時は
   * 各 ROI の float bounds 中心（モデルでは x/y/w/h から取る）。
   * 対応範囲は line／point／polygon／rectangle。それ以外は形状を挙げて停止 */
  "RoiManager.rotate": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.rotate", args, 1, 3, "RoiManager.rotate(angle[, xcenter, ycenter])");
    guardUnk(H, "RoiManager.rotate", args);
    const angle = H.numArg(args[0]);
    const hasCenter = args.length === 3;
    const targets = rmTargets(S);
    for (const ix of targets) {
      const t = S.roiList[ix] && S.roiList[ix].type;
      if (!["line", "point", "polygon", "rectangle"].includes(t))
        throw H.err("未検証：RoiManager.rotate は意味論を一次情報で確定できていないため停止します",
          "対象の ROI（" + ix + " 番目、形状 " + t + "）の回転は、弧サンプリング／Shape 平坦化の規則が一次情報から確定できないため。対応範囲は line／point／polygon／rectangle です。");
    }
    const theta = -angle * Math.PI / 180;
    for (const ix of targets) {
      const roi = S.roiList[ix];
      const cx = hasCenter ? H.numArg(args[1]) : roi.x + roi.w / 2;
      const cy = hasCenter ? H.numArg(args[2]) : roi.y + roi.h / 2;
      S.roiList[ix] = rotateRoiPoints(roi, theta, cx, cy);
    }
    H.step(e.line, "ROI Manager の対象 " + targets.length + " 件を " + H.fmt(angle) + " 度回転します");
    return H.unk;
  },
  "RoiManager.multiCrop": { unsupported: "各 ROI の切り抜き画像を実ファイルへ書き出す操作であり、モデルファイル系では扱わないため。" },
  "RoiManager.associateROIsWithSlices": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.associateROIsWithSlices", args, 1, 1, "RoiManager.associateROIsWithSlices(boolean)");
    if (!S.__rmPrefs) S.__rmPrefs = {};
    S.__rmPrefs.associate = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "ROI Manager の「スライスと関連付け」設定を変更します（表示だけの設定です）");
    return H.unk;
  },
  "RoiManager.restoreCentered": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.restoreCentered", args, 1, 1, "RoiManager.restoreCentered(boolean)");
    if (!S.__rmPrefs) S.__rmPrefs = {};
    S.__rmPrefs.restoreCentered = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "ROI Manager の「中央に戻す」設定を変更します（表示だけの設定です）");
    return H.unk;
  },
  "RoiManager.useNamesAsLabels": (S, e, args, refs, H) => {
    arity(H, e, "RoiManager.useNamesAsLabels", args, 1, 1, "RoiManager.useNamesAsLabels(boolean)");
    if (!S.__rmPrefs) S.__rmPrefs = {};
    S.__rmPrefs.useNames = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "ROI Manager の「名前をラベルに使う」設定を変更します（表示だけの設定です）");
    return H.unk;
  },
  /* ---- 名前空間なしの選択関数 ---- */
  "selectionName": (S, e, args, refs, H) => {
    arity(H, e, "selectionName", args, 0, 0, "selectionName()");
    const roi = needRoi(S, e, H, "selectionName");
    return typeof roi.name === "string" ? roi.name : "";
  },
  "setSelectionName": (S, e, args, refs, H) => {
    arity(H, e, "setSelectionName", args, 1, 1, "setSelectionName(name)");
    guardUnk(H, "setSelectionName", args);
    const roi = needRoi(S, e, H, "setSelectionName");
    roi.name = needStr(H, e, "setSelectionName", args[0], "名前");
    H.step(e.line, "選択の名前を「" + roi.name + "」に設定します");
    return H.unk;
  },
  "selectionContains": (S, e, args, refs, H) => {
    arity(H, e, "selectionContains", args, 2, 2, "selectionContains(x, y)");
    const roi = needRoi(S, e, H, "selectionContains");
    const px = Math.round(H.numArg(args[0])), py = Math.round(H.numArg(args[1]));
    const c = roiContainsPoint(roi, px, py);
    if (c === null) { H.step(e.line, "selectionContains：この選択形状では内包判定をモデルで確定できないため、値は省略します"); return H.unk; }
    return c ? 1 : 0;
  },
  "setSelectionLocation": (S, e, args, refs, H) => {
    arity(H, e, "setSelectionLocation", args, 2, 2, "setSelectionLocation(x, y)");
    guardUnk(H, "setSelectionLocation", args);
    H.needImg(e.line, "setSelectionLocation");
    if (!S.roi) throw H.err("setSelectionLocation には選択（ROI）が必要です", "ImageJ では \"Selection required\" エラーになり止まります。");
    moveRoiTo(S.roi, Math.round(H.numArg(args[0])), Math.round(H.numArg(args[1])));
    H.step(e.line, "選択を (" + S.roi.x + ", " + S.roi.y + ") へ移動します");
    return H.unk;
  },
});

/* ================= Overlay.* ================= */
/* モデル化範囲: 画像ごとに保持する ROI の列（件数・内包・位置・名前）と
 * 表示設定だけ。描画・焼き込みの画素結果は観測対象にしない */
function needOverlay(S, e, H, name) {
  const im = H.needImg(e.line, name);
  if (!im.__overlay) throw H.err(name + " にはオーバーレイが必要です",
    "ImageJ では \"No overlay\" エラーになり止まります。Overlay.addSelection などでオーバーレイを作ってください。");
  return im;
}
function checkOverlayIndex(H, e, name, im, ix) {
  const n = im.__overlay.length;
  if (typeof ix !== "number" || ix < 0 || ix >= n)
    throw H.err(name + " の番号（" + H.fmt(ix) + "）がオーバーレイの範囲外です",
      "オーバーレイには現在 " + n + " 件の ROI があります。ImageJ では \"Index (" + H.fmt(ix) + ") is outside of the 0-" + (n - 1) + " range\" エラーになり止まります。");
}
function ensureOverlay(im) { if (!im.__overlay) im.__overlay = []; return im.__overlay; }
function overlayStyle(im) { if (!im.__overlayStyle) im.__overlayStyle = {}; return im.__overlayStyle; }
function activateOverlayItem(S, e, H, name, args, wait) {
  arity(H, e, name, args, 1, 1, name + "(index)");
  const im = needOverlay(S, e, H, name);
  const ix = intA(H, args[0]);
  checkOverlayIndex(H, e, name, im, ix);
  const item = im.__overlay[ix];
  S.roi = clone(item);
  if (typeof item.zpos === "number" && item.zpos >= 1 && item.zpos <= zdimOf(im)) im.slice = item.zpos;
  if (typeof item.cpos === "number" && item.cpos >= 1 && item.cpos <= (typeof im.channels === "number" ? im.channels : 1)) im.channel = item.cpos;
  if (typeof item.tpos === "number" && item.tpos >= 1 && item.tpos <= (typeof im.frames === "number" ? im.frames : 1)) im.frame = item.tpos;
  H.step(e.line, "オーバーレイの " + ix + " 番目の ROI を現在の選択にします" + (wait ? "（表示の更新完了を待ちます）" : ""));
  return H.unk;
}
Object.assign(STATE, {
  "Overlay.moveTo": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.moveTo", args, 2, 2, "Overlay.moveTo(x, y)");
    H.needImg(e.line, "Overlay.moveTo");
    if (!S.__ovPath) S.__ovPath = [];
    S.__ovPath.push([H.numArg(args[0]), H.numArg(args[1])]);
    H.step(e.line, "オーバーレイ描画パスの始点を (" + H.fmt(args[0]) + ", " + H.fmt(args[1]) + ") に置きます（Overlay.add で確定します）");
    return H.unk;
  },
  "Overlay.lineTo": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.lineTo", args, 2, 2, "Overlay.lineTo(x, y)");
    H.needImg(e.line, "Overlay.lineTo");
    if (!S.__ovPath) S.__ovPath = [];
    S.__ovPath.push([H.numArg(args[0]), H.numArg(args[1])]);
    H.step(e.line, "オーバーレイ描画パスに (" + H.fmt(args[0]) + ", " + H.fmt(args[1]) + ") への線分を足します（Overlay.add で確定します）");
    return H.unk;
  },
  "Overlay.add": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.add", args, 0, 0, "Overlay.add()");
    const im = H.needImg(e.line, "Overlay.add");
    if (S.__ovPath && S.__ovPath.length) {
      const pts = S.__ovPath;
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const item = { type: "polygon", points: clone(pts), x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      ensureOverlay(im).push(item);
      S.__ovPath = null;
      H.step(e.line, "描画パスを1件の ROI としてオーバーレイに追加します（現在 " + im.__overlay.length + " 件）");
    } else H.step(e.line, "Overlay.add：確定する描画パスが無いため、何もしません");
    return H.unk;
  },
  "Overlay.drawLine": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.drawLine", args, 4, 4, "Overlay.drawLine(x1, y1, x2, y2)");
    guardUnk(H, "Overlay.drawLine", args);
    const im = H.needImg(e.line, "Overlay.drawLine");
    const x1 = H.numArg(args[0]), y1 = H.numArg(args[1]), x2 = H.numArg(args[2]), y2 = H.numArg(args[3]);
    ensureOverlay(im).push({ type: "line", x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), x2: Math.max(x1, x2), y2: Math.max(y1, y2), ex1: x1, ey1: y1, ex2: x2, ey2: y2 });
    H.step(e.line, "直線をオーバーレイに追加します（現在 " + im.__overlay.length + " 件）");
    return H.unk;
  },
  "Overlay.drawRect": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.drawRect", args, 4, 4, "Overlay.drawRect(x, y, width, height)");
    guardUnk(H, "Overlay.drawRect", args);
    const im = H.needImg(e.line, "Overlay.drawRect");
    ensureOverlay(im).push({ type: "rectangle", x: Math.round(H.numArg(args[0])), y: Math.round(H.numArg(args[1])), w: Math.round(H.numArg(args[2])), h: Math.round(H.numArg(args[3])) });
    H.step(e.line, "矩形をオーバーレイに追加します（現在 " + im.__overlay.length + " 件）");
    return H.unk;
  },
  "Overlay.drawEllipse": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.drawEllipse", args, 4, 4, "Overlay.drawEllipse(x, y, width, height)");
    guardUnk(H, "Overlay.drawEllipse", args);
    const im = H.needImg(e.line, "Overlay.drawEllipse");
    ensureOverlay(im).push({ type: "oval", x: Math.round(H.numArg(args[0])), y: Math.round(H.numArg(args[1])), w: Math.round(H.numArg(args[2])), h: Math.round(H.numArg(args[3])) });
    H.step(e.line, "楕円をオーバーレイに追加します（現在 " + im.__overlay.length + " 件）");
    return H.unk;
  },
  "Overlay.drawString": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.drawString", args, 3, 4, "Overlay.drawString(string, x, y[, angle])");
    const im = H.needImg(e.line, "Overlay.drawString");
    const item = { type: "text", text: strA(H, args[0]), x: H.numArg(args[1]), y: H.numArg(args[2]) };
    if (args.length > 3) item.angle = H.numArg(args[3]);
    ensureOverlay(im).push(item);
    H.step(e.line, "文字列をオーバーレイに追加します（現在 " + im.__overlay.length + " 件）");
    return H.unk;
  },
  "Overlay.addSelection": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.addSelection", args, 0, 3, "Overlay.addSelection([strokeColor[, strokeWidth[, fillColor]]])");
    const im = H.needImg(e.line, "Overlay.addSelection");
    if (!S.roi) throw H.err("Overlay.addSelection には選択（ROI）が必要です", "ImageJ では \"No selection\" エラーになり止まります。");
    const item = clone(S.roi);
    if (args.length > 0 && !H.isUnk(args[0])) item.strokeColorSpec = strA(H, args[0]);
    if (args.length > 1 && !H.isUnk(args[1])) item.strokeWidth = H.numArg(args[1]);
    if (args.length > 2 && !H.isUnk(args[2])) item.fillColorSpec = strA(H, args[2]);
    ensureOverlay(im).push(item);
    H.step(e.line, "現在の選択をオーバーレイに追加します（現在 " + im.__overlay.length + " 件）");
    return H.unk;
  },
  "Overlay.setPosition": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.setPosition", args, 1, 3, "Overlay.setPosition(slice) または Overlay.setPosition(channel, slice, frame)");
    guardUnk(H, "Overlay.setPosition", args);
    const im = needOverlay(S, e, H, "Overlay.setPosition");
    const item = im.__overlay[im.__overlay.length - 1];
    if (args.length === 1) item.zpos = intA(H, args[0]);
    else { item.cpos = intA(H, args[0]); item.zpos = intA(H, args[1]); item.tpos = intA(H, args[2]); }
    H.step(e.line, "最後に追加したオーバーレイ ROI のスタック位置を設定します");
    return H.unk;
  },
  "Overlay.size": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.size", args, 0, 0, "Overlay.size()");
    const im = H.needImg(e.line, "Overlay.size");
    return im.__overlay ? im.__overlay.length : 0;
  },
  "Overlay.hidden": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.hidden", args, 0, 0, "Overlay.hidden()");
    const im = H.needImg(e.line, "Overlay.hidden");
    return im.__overlayHidden ? 1 : 0;
  },
  "Overlay.show": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.show", args, 0, 0, "Overlay.show()");
    const im = H.needImg(e.line, "Overlay.show");
    im.__overlayHidden = false;
    H.step(e.line, "オーバーレイを表示します");
    return H.unk;
  },
  "Overlay.hide": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.hide", args, 0, 0, "Overlay.hide()");
    const im = H.needImg(e.line, "Overlay.hide");
    im.__overlayHidden = true;
    H.step(e.line, "オーバーレイを隠します（中身は保持されます）");
    return H.unk;
  },
  /* remove はオーバーレイ自体の解除、clear は中身だけを空にする（実機の区別どおり） */
  "Overlay.remove": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.remove", args, 0, 0, "Overlay.remove()");
    const im = H.needImg(e.line, "Overlay.remove");
    im.__overlay = null; im.__overlayHidden = false;
    H.step(e.line, "オーバーレイ全体を取り除きます");
    return H.unk;
  },
  "Overlay.clear": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.clear", args, 0, 0, "Overlay.clear()");
    const im = H.needImg(e.line, "Overlay.clear");
    if (im.__overlay) { im.__overlay = []; H.step(e.line, "オーバーレイの中身を空にします"); }
    else H.step(e.line, "Overlay.clear：オーバーレイが無いため、何もしません");
    return H.unk;
  },
  "Overlay.activateSelection": (S, e, args, refs, H) => activateOverlayItem(S, e, H, "Overlay.activateSelection", args, false),
  "Overlay.activateSelectionAndWait": (S, e, args, refs, H) => activateOverlayItem(S, e, H, "Overlay.activateSelectionAndWait", args, true),
  "Overlay.removeSelection": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.removeSelection", args, 1, 1, "Overlay.removeSelection(index)");
    const im = needOverlay(S, e, H, "Overlay.removeSelection");
    const ix = intA(H, args[0]);
    checkOverlayIndex(H, e, "Overlay.removeSelection", im, ix);
    im.__overlay.splice(ix, 1);
    H.step(e.line, "オーバーレイの " + ix + " 番目の ROI を削除します（残り " + im.__overlay.length + " 件）");
    return H.unk;
  },
  "Overlay.update": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.update", args, 1, 1, "Overlay.update(index)");
    const im = needOverlay(S, e, H, "Overlay.update");
    const ix = intA(H, args[0]);
    checkOverlayIndex(H, e, "Overlay.update", im, ix);
    if (!S.roi) throw H.err("Overlay.update には選択（ROI）が必要です", "ImageJ では \"No selection\" エラーになり止まります。");
    im.__overlay[ix] = clone(S.roi);
    H.step(e.line, "オーバーレイの " + ix + " 番目の ROI を現在の選択で置き換えます");
    return H.unk;
  },
  "Overlay.moveSelection": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.moveSelection", args, 3, 3, "Overlay.moveSelection(index, x, y)");
    guardUnk(H, "Overlay.moveSelection", [args[1], args[2]]);
    const im = needOverlay(S, e, H, "Overlay.moveSelection");
    const ix = intA(H, args[0]);
    checkOverlayIndex(H, e, "Overlay.moveSelection", im, ix);
    moveRoiTo(im.__overlay[ix], H.numArg(args[1]), H.numArg(args[2]));
    H.step(e.line, "オーバーレイの " + ix + " 番目の ROI を (" + H.fmt(args[1]) + ", " + H.fmt(args[2]) + ") へ移動します");
    return H.unk;
  },
  "Overlay.indexAt": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.indexAt", args, 2, 2, "Overlay.indexAt(x, y)");
    const im = H.needImg(e.line, "Overlay.indexAt");
    if (!im.__overlay) return -1;
    const px = intA(H, args[0]), py = intA(H, args[1]);
    if (typeof px !== "number" || typeof py !== "number") return H.unk;
    for (let i = 0; i < im.__overlay.length; i++) if (roiContainsPoint(im.__overlay[i], px, py) === true) return i;
    return -1;
  },
  "Overlay.removeRois": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.removeRois", args, 1, 1, "Overlay.removeRois(name)");
    guardUnk(H, "Overlay.removeRois", args);
    const im = needOverlay(S, e, H, "Overlay.removeRois");
    const nm = needStr(H, e, "Overlay.removeRois", args[0], "名前");
    const before = im.__overlay.length;
    im.__overlay = im.__overlay.filter((it) => it.name !== nm);
    H.step(e.line, "名前が「" + nm + "」のオーバーレイ ROI を " + (before - im.__overlay.length) + " 件削除します");
    return H.unk;
  },
  "Overlay.copy": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.copy", args, 0, 0, "Overlay.copy()");
    const im = H.needImg(e.line, "Overlay.copy");
    S.__overlayClip = im.__overlay ? clone(im.__overlay) : null;
    H.step(e.line, "オーバーレイをクリップボードにコピーします");
    return H.unk;
  },
  "Overlay.paste": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.paste", args, 0, 0, "Overlay.paste()");
    const im = H.needImg(e.line, "Overlay.paste");
    if (!S.__overlayClip) throw H.err("Overlay.paste にはコピー済みのオーバーレイが必要です", "ImageJ では \"Overlay clipboard empty\" エラーになり止まります。先に Overlay.copy を実行してください。");
    im.__overlay = clone(S.__overlayClip);
    H.step(e.line, "クリップボードのオーバーレイを現在の画像に貼り付けます（" + im.__overlay.length + " 件）");
    return H.unk;
  },
  /* Overlay.measure: 基礎の roiManager("measure") と同じ行形（Label＋面積のみ
   * 形状から確定し、平均等は分布が分からないため未確定） */
  "Overlay.measure": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.measure", args, 0, 0, "Overlay.measure()");
    const im = needOverlay(S, e, H, "Overlay.measure");
    for (const item of im.__overlay) {
      const area = roiAreaOf(item);
      S.results.push({ Label: im.title, Area: area === null ? H.unk : area, Mean: H.unk, Min: H.unk, Max: H.unk });
    }
    H.step(e.line, "オーバーレイの全 ROI（" + im.__overlay.length + " 件）を測定し、結果表に行を追加します（面積以外は分布が分からないため未確定です）");
    return H.unk;
  },
  "Overlay.fill": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.fill", args, 0, 2, "Overlay.fill([foreground[, background]])");
    const im = needOverlay(S, e, H, "Overlay.fill");
    H.step(e.line, "オーバーレイを画像へ焼き込みます（焼き込み後の個別画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "Overlay.setStrokeColor": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.setStrokeColor", args, 1, 1, "Overlay.setStrokeColor(color)");
    const im = needOverlay(S, e, H, "Overlay.setStrokeColor");
    overlayStyle(im).strokeColorSpec = strA(H, args[0]);
    H.step(e.line, "オーバーレイの輪郭色を設定します");
    return H.unk;
  },
  "Overlay.setStrokeWidth": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.setStrokeWidth", args, 1, 1, "Overlay.setStrokeWidth(width)");
    guardUnk(H, "Overlay.setStrokeWidth", args);
    const im = needOverlay(S, e, H, "Overlay.setStrokeWidth");
    overlayStyle(im).strokeWidth = H.numArg(args[0]);
    H.step(e.line, "オーバーレイの線幅を設定します");
    return H.unk;
  },
  "Overlay.setLabelColor": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.setLabelColor", args, 1, 1, "Overlay.setLabelColor(color)");
    const im = needOverlay(S, e, H, "Overlay.setLabelColor");
    overlayStyle(im).labelColorSpec = strA(H, args[0]);
    H.step(e.line, "オーバーレイのラベル色を設定します");
    return H.unk;
  },
  /* 公式 syntax は (size, options)。options の意味論は Functions／Overlay:
   * "scale" を含めば scalable、"bold" を含めば BOLD、"back" を含めば
   * ラベル背景を描く。いずれの場合もラベル描画は有効になる */
  "Overlay.setLabelFontSize": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.setLabelFontSize", args, 1, 2, "Overlay.setLabelFontSize(size[, options])");
    guardUnk(H, "Overlay.setLabelFontSize", args);
    const im = needOverlay(S, e, H, "Overlay.setLabelFontSize");
    const st = overlayStyle(im);
    st.labelFontSize = H.numArg(args[0]);
    if (args.length === 2) {
      const opts = strA(H, args[1]) || "";
      st.labelScalable = opts.includes("scale") ? 1 : 0;
      st.labelBold = opts.includes("bold") ? 1 : 0;
      st.labelBackground = opts.includes("back") ? 1 : 0;
      st.drawLabels = 1;
    }
    H.step(e.line, "オーバーレイのラベル文字サイズを設定します");
    return H.unk;
  },
  "Overlay.drawLabels": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.drawLabels", args, 1, 1, "Overlay.drawLabels(boolean)");
    const im = needOverlay(S, e, H, "Overlay.drawLabels");
    overlayStyle(im).drawLabels = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "オーバーレイのラベル描画を設定します（表示だけの設定です）");
    return H.unk;
  },
  "Overlay.useNamesAsLabels": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.useNamesAsLabels", args, 1, 1, "Overlay.useNamesAsLabels(boolean)");
    const im = needOverlay(S, e, H, "Overlay.useNamesAsLabels");
    overlayStyle(im).useNames = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "オーバーレイのラベルに名前を使う設定にします（表示だけの設定です）");
    return H.unk;
  },
  "Overlay.selectable": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.selectable", args, 1, 1, "Overlay.selectable(boolean)");
    const im = needOverlay(S, e, H, "Overlay.selectable");
    overlayStyle(im).selectable = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "オーバーレイの選択可否を設定します（表示だけの設定です）");
    return H.unk;
  },
  /* Functions.getOverlayElementBounds: 要素の外接矩形を書き戻す。
   * 要素が無い（番号が範囲外）場合は何も書かず NaN を返す実分岐どおり */
  "Overlay.getBounds": (S, e, args, refs, H) => {
    arity(H, e, "Overlay.getBounds", args, 5, 5, "Overlay.getBounds(index, x, y, width, height)");
    const im = needOverlay(S, e, H, "Overlay.getBounds");
    const ix = intA(H, args[0]);
    const item = typeof ix === "number" && ix >= 0 && ix < im.__overlay.length ? im.__overlay[ix] : undefined;
    if (!item) return NaN;
    const b = H.roiBounds(item) || [H.unk, H.unk, H.unk, H.unk];
    for (let i = 0; i < 4; i++) if (refs[i + 1]) H.writeRef(refs[i + 1], b[i]);
    H.step(e.line, "オーバーレイ要素 " + ix + " の外接矩形を変数に入れます");
    return H.unk;
  },
  "Overlay.xor": { unverified: "複数 ROI の XOR 形状の幾何計算は Roi.java 側にあり、提供された一次情報からは確定できないため。" },
  "Overlay.flatten": { unsupported: "オーバーレイを焼き込んだ新しい画像を生成する操作であり、その画素内容をモデルでは保持できないため。" },
  "Overlay.cropAndSave": { unsupported: "各 ROI の切り抜きを実ファイルへ書き出す操作であり、モデルファイル系では扱わないため。" },
});

/* ================= Plot.* ================= */
/* モデル化範囲: 作成中のプロットと表示済みプロットの「データ列」だけ。
 * 軸・凡例・色などの表示設定は保持するが観測対象にしない。
 * Plot.getValues は実機どおり表示済みプロット（ウィンドウ）だけが対象 */
function needPlotAny(S, e, H, name) {
  const p = S.__plot || S.__plotShown;
  if (!p) throw H.err(name + " にはプロットが必要です",
    "ImageJ では \"No plot window and no plot under construction\" エラーになり止まります。先に Plot.create でプロットを作ってください。");
  return p;
}
function needPlotUC(S, e, H, name) {
  if (!S.__plot) throw H.err(name + " には作成中のプロットが必要です",
    "ImageJ では \"No plot defined\" エラーになり止まります。Plot.create の後、Plot.show の前だけ使えます。");
  return S.__plot;
}
function plotNumArr(H, e, name, v, what) {
  if (!Array.isArray(v)) throw H.err(name + " の" + what + "は配列が必要です", "プロットのデータは配列で渡してください。ImageJ ではここでエラーになり止まります。");
  return v.map((x) => H.numArg(x));
}
/* Plot.getResultsTable の列構築（FIX-IJB で格上げ）: 表示済みプロットの
 * データセットから結果表を作る。列見出しは X, Y, X1, Y1, ...（複数列の
 * とき後続に番号）。全データセット同長かつ最初の X と完全一致する X 列は
 * 最初の列を共有し、XY とも一致する列は Y 列も共有する。Y エラー列は ERR。
 * WithLabels ではデータセットラベル／軸ラベルを replaceSpacesEtc
 * （trim→空白・カンマを "_"、引用符を "''"、空は null）で変換して使う。
 * 小数桁メタデータは再現しない（reference の caution に開示） */
function plotShowValues(S, e, H, name, args, useLabels) {
  arity(H, e, name, args, 0, 1, name + "([title])");
  const p = S.__plotShown;
  if (!p) throw H.err(name + " には表示済みのプロットが必要です",
    "ImageJ では \"No plot window\" エラーになり止まります。Plot.show で表示したプロットだけが対象です。");
  let title = "Results";
  if (args.length === 1) { const t = strA(H, args[0]); if (t !== null) title = t; }
  const dss = p.datasets;
  const multiple = dss.length > 1;
  const tableLength = dss.reduce((m, ds) => Math.max(m, ds.x.length), 0);
  const allSameLength = dss.every((ds) => ds.x.length === tableLength);
  const first = dss.length ? dss[0] : null;
  const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const replaceSpacesEtc = (s) => {
    if (s === null || s === undefined) return null;
    const t = String(s).trim().replace(/[\s,]/g, "_").replace(/"/g, "''");
    return t === "" ? null : t;
  };
  const cols = [];
  const used = new Set();
  dss.forEach((ds, di) => {
    const suffix = multiple && di > 0 ? String(di) : "";
    const sameX = !!(first && allSameLength && sameArr(first.x, ds.x));
    const sameXY = di > 0 && sameX && sameArr(first.y, ds.y);
    const writeX = di === 0 ? true : !sameX;
    const writeY = !sameXY;
    if (writeX) {
      let heading = "X" + suffix;
      if (useLabels) {
        let cand = null;
        if (di === 0) cand = replaceSpacesEtc(p.xLabel);
        else if (ds.label) { const lt = replaceSpacesEtc(ds.label); if (lt) cand = "X_" + lt; }
        if (cand && !used.has(cand)) heading = cand;
      }
      if (used.has(heading)) heading = "X" + suffix;
      used.add(heading);
      cols.push({ heading, values: ds.x });
    }
    if (writeY) {
      let heading = "Y" + suffix;
      if (useLabels) {
        let cand = null;
        if (ds.label) cand = replaceSpacesEtc(ds.label);
        else if (di === 0) cand = replaceSpacesEtc(p.yLabel);
        if (cand && !used.has(cand)) heading = cand;
      }
      if (used.has(heading)) heading = "Y" + suffix;
      used.add(heading);
      cols.push({ heading, values: ds.y });
      if (Array.isArray(ds.err)) {
        let eheading = "ERR" + suffix;
        if (used.has(eheading)) eheading = "ERR" + suffix + "_" + di;
        used.add(eheading);
        cols.push({ heading: eheading, values: ds.err });
      }
    }
  });
  const t = resolveTable(S, e, H, name, title, true);
  t.rows.length = 0;
  tmeta(S, t.title).cols = cols.map((c) => c.heading);
  for (let r = 0; r < tableLength; r++) {
    const row = { Label: "" };
    for (const c of cols) row[c.heading] = r < c.values.length ? c.values[r] : "";
    t.rows.push(row);
  }
  S.__currentTable = t.title;
  H.step(e.line, "表示済みプロットの値を結果表「" + t.title + "」に出力します（" + cols.length + " 列 × " + tableLength + " 行）");
  return H.unk;
}
Object.assign(STATE, {
  "Plot.create": (S, e, args, refs, H) => {
    arity(H, e, "Plot.create", args, 3, 5, "Plot.create(title, xLabel, yLabel[, yArray | xArray, yArray])");
    guardUnk(H, "Plot.create", args.slice(0, 3));
    const p = {
      title: needStr(H, e, "Plot.create", args[0], "タイトル"),
      xLabel: needStr(H, e, "Plot.create", args[1], "x軸ラベル"),
      yLabel: needStr(H, e, "Plot.create", args[2], "y軸ラベル"),
      datasets: [], texts: [], limits: null, logX: 0, logY: 0, frozen: 0,
    };
    if (args.length === 4) {
      const y = plotNumArr(H, e, "Plot.create", args[3], "y配列");
      p.datasets.push({ shape: "line", x: y.map((_, i) => i), y });
    } else if (args.length === 5) {
      const x = plotNumArr(H, e, "Plot.create", args[3], "x配列");
      const y = plotNumArr(H, e, "Plot.create", args[4], "y配列");
      if (x.length !== y.length) throw H.err("Plot.create の x 配列と y 配列の長さが違います", "データ点の数が揃っていないプロットは作れません。");
      p.datasets.push({ shape: "line", x, y });
    }
    S.__plot = p;
    H.step(e.line, "プロット「" + p.title + "」を作成します" + (p.datasets.length ? "（データ " + p.datasets[0].y.length + " 点）" : ""));
    return H.unk;
  },
  "Plot.add": (S, e, args, refs, H) => {
    arity(H, e, "Plot.add", args, 2, 4, "Plot.add(type, yArray) または Plot.add(type, xArray, yArray[, errorBars | label])");
    const p = needPlotAny(S, e, H, "Plot.add");
    const shape = needStr(H, e, "Plot.add", args[0], "種別");
    let x, y, errBars = null, label = null;
    if (args.length === 2) { y = plotNumArr(H, e, "Plot.add", args[1], "y配列"); x = y.map((_, i) => i); }
    else {
      x = plotNumArr(H, e, "Plot.add", args[1], "x配列");
      y = plotNumArr(H, e, "Plot.add", args[2], "y配列");
      if (args.length === 4) {
        if (Array.isArray(args[3])) errBars = plotNumArr(H, e, "Plot.add", args[3], "エラーバー配列");
        else label = strA(H, args[3]);
      }
    }
    if (x.length !== y.length) throw H.err("Plot.add の x 配列と y 配列の長さが違います", "データ点の数が揃っていないデータ列は追加できません。");
    p.datasets.push({ shape, x, y, err: errBars, label });
    H.step(e.line, "プロットにデータ列（" + y.length + " 点）を追加します（現在 " + p.datasets.length + " 列）");
    return H.unk;
  },
  "Plot.replace": (S, e, args, refs, H) => {
    arity(H, e, "Plot.replace", args, 4, 4, "Plot.replace(index, type, xArray, yArray)");
    guardUnk(H, "Plot.replace", [args[0]]);
    const p = needPlotAny(S, e, H, "Plot.replace");
    const ix = intA(H, args[0]);
    if (typeof ix !== "number" || ix < 0 || ix >= p.datasets.length)
      throw H.err("Plot.replace の番号（" + H.fmt(ix) + "）が範囲外です", "プロットには現在 " + p.datasets.length + " 列のデータがあります。ImageJ ではここでエラーになり止まります。");
    const x = plotNumArr(H, e, "Plot.replace", args[2], "x配列");
    const y = plotNumArr(H, e, "Plot.replace", args[3], "y配列");
    if (x.length !== y.length) throw H.err("Plot.replace の x 配列と y 配列の長さが違います", "データ点の数が揃っていないデータ列には置き換えできません。");
    p.datasets[ix] = { shape: needStr(H, e, "Plot.replace", args[1], "種別"), x, y, err: null, label: null };
    H.step(e.line, "プロットの " + ix + " 番目のデータ列を置き換えます");
    return H.unk;
  },
  "Plot.getValues": (S, e, args, refs, H) => {
    arity(H, e, "Plot.getValues", args, 2, 2, "Plot.getValues(xArray, yArray)");
    if (!Array.isArray(args[0]) || !Array.isArray(args[1])) throw H.err("Plot.getValues の引数は2つの配列が必要です", "書式は Plot.getValues(xvalues, yvalues) です。");
    const p = S.__plotShown;
    if (!p) throw H.err("Plot.getValues には表示済みのプロットが必要です",
      "ImageJ では \"No plot or histogram window\" エラーになり止まります。Plot.show で表示したプロットのデータだけが対象です。");
    const ds = p.datasets[0];
    args[0].length = 0; args[1].length = 0;
    if (ds) { for (const v of ds.x) args[0].push(v); for (const v of ds.y) args[1].push(v); }
    H.step(e.line, "表示済みプロットの最初のデータ列（" + (ds ? ds.y.length : 0) + " 点）を配列に入れます");
    return H.unk;
  },
  "Plot.show": (S, e, args, refs, H) => {
    arity(H, e, "Plot.show", args, 0, 0, "Plot.show()");
    const p = needPlotUC(S, e, H, "Plot.show");
    S.__plotShown = p;
    S.__plot = null;
    H.step(e.line, "プロット「" + p.title + "」をウィンドウに表示します（作成中のプロットはここで確定します）");
    return H.unk;
  },
  "Plot.update": (S, e, args, refs, H) => {
    arity(H, e, "Plot.update", args, 0, 0, "Plot.update()");
    needPlotAny(S, e, H, "Plot.update");
    H.step(e.line, "プロットの表示を更新します（データは変わりません）");
    return H.unk;
  },
  "Plot.setLimits": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setLimits", args, 4, 4, "Plot.setLimits(xMin, xMax, yMin, yMax)");
    const p = needPlotAny(S, e, H, "Plot.setLimits");
    p.limits = [H.numArg(args[0]), H.numArg(args[1]), H.numArg(args[2]), H.numArg(args[3])];
    p.limitsAuto = false;
    H.step(e.line, "プロットの軸範囲を設定します（NaN の軸はデータから自動計算されます）");
    return H.unk;
  },
  "Plot.setLimitsToFit": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setLimitsToFit", args, 0, 0, "Plot.setLimitsToFit()");
    const p = needPlotAny(S, e, H, "Plot.setLimitsToFit");
    p.limits = null; p.limitsAuto = true;
    H.step(e.line, "プロットの軸範囲をデータに合わせて自動設定します");
    return H.unk;
  },
  "Plot.setLogScaleX": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setLogScaleX", args, 0, 1, "Plot.setLogScaleX([boolean])");
    const p = needPlotAny(S, e, H, "Plot.setLogScaleX");
    p.logX = args.length && !H.isUnk(args[0]) ? (H.truthy(args[0]) ? 1 : 0) : 1;
    H.step(e.line, "x軸の対数スケールを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setLogScaleY": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setLogScaleY", args, 0, 1, "Plot.setLogScaleY([boolean])");
    const p = needPlotAny(S, e, H, "Plot.setLogScaleY");
    p.logY = args.length && !H.isUnk(args[0]) ? (H.truthy(args[0]) ? 1 : 0) : 1;
    H.step(e.line, "y軸の対数スケールを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.freeze": (S, e, args, refs, H) => {
    arity(H, e, "Plot.freeze", args, 1, 1, "Plot.freeze(boolean)");
    const p = needPlotAny(S, e, H, "Plot.freeze");
    p.frozen = H.isUnk(args[0]) ? H.unk : (H.truthy(args[0]) ? 1 : 0);
    H.step(e.line, "プロットの凍結（再描画の抑制）を設定します");
    return H.unk;
  },
  /* NaN のデータ点を取り除く（x／y の組で判定する） */
  "Plot.removeNaNs": (S, e, args, refs, H) => {
    arity(H, e, "Plot.removeNaNs", args, 0, 0, "Plot.removeNaNs()");
    const p = needPlotAny(S, e, H, "Plot.removeNaNs");
    for (const ds of p.datasets) {
      const nx = [], ny = [], ne = ds.err ? [] : null;
      for (let i = 0; i < ds.y.length; i++) {
        if (typeof ds.x[i] === "number" && typeof ds.y[i] === "number" && !isNaN(ds.x[i]) && !isNaN(ds.y[i])) {
          nx.push(ds.x[i]); ny.push(ds.y[i]); if (ne) ne.push(ds.err[i]);
        }
      }
      ds.x = nx; ds.y = ny; if (ne) ds.err = ne;
    }
    H.step(e.line, "プロットのデータ列から NaN の点を取り除きます");
    return H.unk;
  },
  "Plot.setFrameSize": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setFrameSize", args, 2, 2, "Plot.setFrameSize(width, height)");
    const p = needPlotAny(S, e, H, "Plot.setFrameSize");
    p.frameSize = [intA(H, args[0]), intA(H, args[1])];
    H.step(e.line, "プロットの枠サイズを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setColor": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setColor", args, 1, 3, "Plot.setColor(color) または Plot.setColor(r, g, b)");
    const p = needPlotAny(S, e, H, "Plot.setColor");
    p.nextColor = args.length === 1 ? strA(H, args[0]) : [intA(H, args[0]), intA(H, args[1]), intA(H, args[2])];
    H.step(e.line, "次に追加するデータ列の色を設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setBackgroundColor": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setBackgroundColor", args, 1, 3, "Plot.setBackgroundColor(color) または Plot.setBackgroundColor(r, g, b)");
    const p = needPlotAny(S, e, H, "Plot.setBackgroundColor");
    p.bgColor = args.length === 1 ? strA(H, args[0]) : [intA(H, args[0]), intA(H, args[1]), intA(H, args[2])];
    H.step(e.line, "プロットの背景色を設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setLineWidth": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setLineWidth", args, 1, 1, "Plot.setLineWidth(width)");
    const p = needPlotUC(S, e, H, "Plot.setLineWidth");
    p.lineWidth = H.numArg(args[0]);
    H.step(e.line, "プロットの線幅を設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setJustification": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setJustification", args, 1, 1, "Plot.setJustification(justification)");
    const p = needPlotUC(S, e, H, "Plot.setJustification");
    p.justification = strA(H, args[0]);
    H.step(e.line, "プロット内テキストの行揃えを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.addText": (S, e, args, refs, H) => {
    arity(H, e, "Plot.addText", args, 3, 3, "Plot.addText(string, x, y)");
    const p = needPlotAny(S, e, H, "Plot.addText");
    p.texts.push({ text: strA(H, args[0]), x: H.numArg(args[1]), y: H.numArg(args[2]) });
    H.step(e.line, "プロットにテキストを追加します（表示だけの要素です）");
    return H.unk;
  },
  "Plot.setLegend": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setLegend", args, 1, 2, "Plot.setLegend(labels[, options])");
    const p = needPlotAny(S, e, H, "Plot.setLegend");
    p.legend = [strA(H, args[0]), args.length > 1 ? strA(H, args[1]) : null];
    H.step(e.line, "プロットの凡例を設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setXYLabels": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setXYLabels", args, 2, 2, "Plot.setXYLabels(xLabel, yLabel)");
    const p = needPlotAny(S, e, H, "Plot.setXYLabels");
    p.xLabel = strA(H, args[0]); p.yLabel = strA(H, args[1]);
    H.step(e.line, "プロットの軸ラベルを変更します");
    return H.unk;
  },
  "Plot.setFontSize": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setFontSize", args, 1, 1, "Plot.setFontSize(size)");
    const p = needPlotAny(S, e, H, "Plot.setFontSize");
    p.fontSize = H.numArg(args[0]);
    H.step(e.line, "プロットのフォントサイズを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setAxisLabelSize": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setAxisLabelSize", args, 1, 1, "Plot.setAxisLabelSize(size)");
    const p = needPlotAny(S, e, H, "Plot.setAxisLabelSize");
    p.axisLabelSize = H.numArg(args[0]);
    H.step(e.line, "プロットの軸ラベルのフォントサイズを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setFormatFlags": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setFormatFlags", args, 1, 1, "Plot.setFormatFlags(flags)");
    const p = needPlotAny(S, e, H, "Plot.setFormatFlags");
    p.formatFlags = strA(H, args[0]);
    H.step(e.line, "プロットの軸の書式フラグを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setStyle": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setStyle", args, 2, 2, "Plot.setStyle(index, style)");
    guardUnk(H, "Plot.setStyle", [args[0]]);
    const p = needPlotAny(S, e, H, "Plot.setStyle");
    const ix = intA(H, args[0]);
    const nObj = p.datasets.length + p.texts.length;
    if (typeof ix !== "number" || ix < 0 || ix >= nObj)
      throw H.err("Plot.setStyle の番号（" + H.fmt(ix) + "）が範囲外です", "ImageJ では \"Index out of bounds\" エラーになり止まります。");
    if (!p.styles) p.styles = {};
    p.styles[ix] = strA(H, args[1]);
    H.step(e.line, "プロットの " + ix + " 番目の要素のスタイルを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.setOptions": (S, e, args, refs, H) => {
    arity(H, e, "Plot.setOptions", args, 1, 1, "Plot.setOptions(string)");
    const p = needPlotAny(S, e, H, "Plot.setOptions");
    p.options = strA(H, args[0]);
    H.step(e.line, "プロットのオプションを設定します（表示だけの設定です）");
    return H.unk;
  },
  "Plot.useTemplate": (S, e, args, refs, H) => {
    arity(H, e, "Plot.useTemplate", args, 0, 0, "Plot.useTemplate()");
    needPlotAny(S, e, H, "Plot.useTemplate");
    H.step(e.line, "現在のプロットの設定をテンプレートとして保存します（表示設定の保存のみで、データは変わりません）");
    return H.unk;
  },
  "Plot.drawLine": (S, e, args, refs, H) => {
    arity(H, e, "Plot.drawLine", args, 4, 4, "Plot.drawLine(x1, y1, x2, y2)");
    needPlotUC(S, e, H, "Plot.drawLine");
    H.step(e.line, "プロットに直線を描きます（描画だけの要素で、データ列にはなりません）");
    return H.unk;
  },
  "Plot.drawNormalizedLine": (S, e, args, refs, H) => {
    arity(H, e, "Plot.drawNormalizedLine", args, 4, 4, "Plot.drawNormalizedLine(x1, y1, x2, y2)");
    needPlotUC(S, e, H, "Plot.drawNormalizedLine");
    H.step(e.line, "プロットに正規化座標の直線を描きます（描画だけの要素で、データ列にはなりません）");
    return H.unk;
  },
  "Plot.drawVectors": (S, e, args, refs, H) => {
    arity(H, e, "Plot.drawVectors", args, 4, 4, "Plot.drawVectors(xArray, yArray, xHeadArray, yHeadArray)");
    needPlotUC(S, e, H, "Plot.drawVectors");
    for (let i = 0; i < 4; i++) if (!Array.isArray(args[i])) throw H.err("Plot.drawVectors の引数は4つの配列が必要です", "書式は Plot.drawVectors(x, y, xHead, yHead) です。");
    H.step(e.line, "プロットにベクトルを描きます（描画だけの要素で、データ列にはなりません）");
    return H.unk;
  },
  "Plot.drawShapes": (S, e, args, refs, H) => {
    arity(H, e, "Plot.drawShapes", args, 2, 7, "Plot.drawShapes(type, ...)");
    needPlotUC(S, e, H, "Plot.drawShapes");
    const type = strA(H, args[0]);
    if (type === null || (type.toLowerCase().indexOf("rectangles") === -1 && type.toLowerCase().indexOf("boxes") === -1))
      throw H.err("Plot.drawShapes の種別には 'rectangles' または 'boxes' を含む文字列が必要です", "ImageJ では \"Must contain 'rectangles' or 'boxes'\" エラーになり止まります。");
    H.step(e.line, "プロットに図形を描きます（描画だけの要素で、データ列にはなりません）");
    return H.unk;
  },
  "Plot.drawGrid": (S, e, args, refs, H) => {
    arity(H, e, "Plot.drawGrid", args, 0, 0, "Plot.drawGrid()");
    needPlotUC(S, e, H, "Plot.drawGrid");
    H.step(e.line, "プロットのグリッドを描き直します（表示だけの操作です）");
    return H.unk;
  },
  /* Plot.getLimits: Plot.setLimits で明示設定された範囲だけを書き戻す。
   * 自動範囲（limits 未設定）は軸スケーリング計算に依存するため、
   * その理由を挙げて未検証停止する（未初期化変数を渡してもこの停止に届く） */
  "Plot.getLimits": (S, e, args, refs, H) => {
    arity(H, e, "Plot.getLimits", args, 4, 4, "Plot.getLimits(xMin, xMax, yMin, yMax)");
    const p = needPlotAny(S, e, H, "Plot.getLimits");
    if (!p.limits)
      throw H.err("未検証：Plot.getLimits は意味論を一次情報で確定できていないため停止します",
        "自動範囲は軸スケーリング計算に依存するため。Plot.setLimits で明示設定した場合のみ書き戻せます。");
    for (let i = 0; i < 4; i++) if (refs[i]) H.writeRef(refs[i], p.limits[i]);
    H.step(e.line, "プロットの軸範囲（明示設定値）を変数に入れます");
    return H.unk;
  },
  "Plot.getFrameBounds": { unverified: "描画枠はフォントメトリクス等に依存するレイアウト計算で決まり、モデルに描画メトリクスが無いため。REF_FNS の拡張だけでは確定しない。" },
  /* Plot.addHistogram: Plot.java の手順そのまま（NaN 除去→binWidth<=0 なら
   * 母標準偏差から Scott の式→modCenter で firstBin を決め 0.499 条件で
   * 両端を広げ、各値を round((val−firstBin)/binWidth) のビンへ）。
   * 結果は add("bar", xValues, histo) としてデータセットに追加される */
  "Plot.addHistogram": (S, e, args, refs, H) => {
    arity(H, e, "Plot.addHistogram", args, 1, 3, "Plot.addHistogram(values[, binWidth[, binCenter]])");
    const p = needPlotAny(S, e, H, "Plot.addHistogram");
    if (!Array.isArray(args[0])) throw H.err("Plot.addHistogram の values は配列が必要です", "ヒストグラムにする値の配列を渡してください。ImageJ ではここでエラーになり止まります。");
    const vals = [];
    let min = Infinity, max = -Infinity, sum = 0, sum2 = 0;
    for (const v0 of args[0]) {
      const v = H.numArg(v0);
      if (typeof v !== "number" || Number.isNaN(v)) continue;
      vals.push(v);
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v; sum2 += v * v;
    }
    if (!vals.length) { H.step(e.line, "Plot.addHistogram：有効な値が無いため、データ列は追加しません"); return H.unk; }
    let binWidth = args.length >= 2 ? H.numArg(args[1]) : 0;
    const binCenter = args.length >= 3 ? H.numArg(args[2]) : 0;
    if (!(binWidth > 0)) {
      const count = vals.length;
      const sd = Math.sqrt(((count * sum2 - sum * sum) / count) / count);
      binWidth = 3.49 * sd * Math.pow(count, -1 / 3);
    }
    if (!(binWidth > 0)) { H.step(e.line, "Plot.addHistogram：ビン幅が決まらないため（値が全て同じ等）、データ列は追加しません"); return H.unk; }
    const modCenter = binCenter % binWidth;
    let firstBin = min - (min % binWidth - modCenter);
    while (firstBin - binWidth * 0.499 > min) firstBin -= binWidth;
    const nBins0 = Math.trunc((max - firstBin) / binWidth);
    let lastBin = firstBin + nBins0 * binWidth;
    while (lastBin + binWidth * 0.499 < max) lastBin += binWidth;
    let nBins = Math.round((lastBin - firstBin) / binWidth) + 1;
    if (nBins === 1) nBins = 2;
    if (nBins > 9999) throw H.err("Plot.addHistogram：ビン数が上限（9999）を超えます", "ImageJ では \"max bins > 9999\" エラーになり止まります。");
    const histo = new Array(nBins).fill(0);
    const xValues = new Array(nBins);
    for (let i = 0; i < nBins; i++) xValues[i] = firstBin + i * binWidth;
    for (const v of vals) {
      const ix = Math.round((v - firstBin) / binWidth);
      if (ix < 0 || ix >= nBins) throw H.err("Plot.addHistogram：値がビンの範囲の外に出ました", "ImageJ ではここでエラーになり止まります。");
      histo[ix]++;
    }
    p.datasets.push({ shape: "bar", x: xValues, y: histo, err: null, label: null });
    H.step(e.line, "ヒストグラム（" + nBins + " ビン）をプロットのデータ列として追加します");
    return H.unk;
  },
  "Plot.showValues": (S, e, args, refs, H) => plotShowValues(S, e, H, "Plot.showValues", args, false),
  "Plot.showValuesWithLabels": (S, e, args, refs, H) => plotShowValues(S, e, H, "Plot.showValuesWithLabels", args, true),
  "Plot.makeHighResolution": { unsupported: "プロットから高解像度の新しい画像を生成する操作であり、その画素内容をモデルでは保持できないため。" },
  "Plot.appendToStack": { unsupported: "プロットをスタックウィンドウへ追加する操作であり、そのウィンドウ状態をモデルでは保持できないため。" },
  "Plot.drawBoxes": { unsupported: "本体 Functions.java の doPlot に drawBoxes の分岐が無く、実機でも \"Unrecognized plot function\" になる（公式HTMLの記載は drawShapes の種別 'boxes' の説明）。箱ひげ図は Plot.drawShapes(\"boxes…\") で描く。" },
  "Plot.eneableLive": { unsupported: "公式HTMLの綴り誤り。本体 Functions.java が受理するのは Plot.enableLive で、eneableLive は \"Unrecognized plot function\" になるため。" },
});

/* ================= File.*（モデルFS上で定義できるものだけ） ================= */
function fileEntry(S, path) { return Object.prototype.hasOwnProperty.call(S.files, path) ? S.files[path] : undefined; }
function knownPlace(S, path) { return Object.values(S.directories).some((d) => typeof d === "string" && path.startsWith(d)); }
function isDirPath(S, path) {
  const nd = path.endsWith("/") ? path : path + "/";
  return Object.values(S.directories).includes(nd) || Object.keys(S.files).some((p) => p.startsWith(nd));
}
/* java.util.Date.toString() 形式（"Tue Nov 17 08:33:53 JST 2026"）。
 * 実行環境のタイムゾーンはユーザの Asia/Tokyo として整形する */
function javaDateString(ms) {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", weekday: "short", month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const parts = {};
  for (const p of dtf.formatToParts(new Date(ms))) parts[p.type] = p.value;
  return parts.weekday + " " + parts.month + " " + parts.day + " " + parts.hour + ":" + parts.minute + ":" + parts.second + " JST " + parts.year;
}
const TEXT_SUFFIXES = [".txt", ".java", ".xls", ".csv", ".tsv", ".ijm", ".html", ".htm"];
Object.assign(STATE, {
  /* File.open: テキストファイルを新規作成（切り捨て）し、ハンドル "~0~" を返す。
   * 開けるのは同時に1つだけ。print(f, ...) での書き込みは基礎 print が Log へ
   * 出すためモデル化されない（内容は File.append／saveString で変わる） */
  "File.open": (S, e, args, refs, H) => {
    arity(H, e, "File.open", args, 1, 2, "File.open(path[, defaultName])");
    if (S.__fileWriter) throw H.err("File.open は同時に1つまでです", "ImageJ では \"Currently, only one file can be open at a time\" エラーになり止まります。先に File.close で閉じてください。");
    const path = strA(H, args[0]);
    if (path === null) { H.step(e.line, "File.open：パスが未確定のため、ファイルは開きません"); return H.unk; }
    if (path === "" || args.length > 1) { H.step(e.line, "File.open：保存ダイアログで決まるパスはモデルで確定しないため、値は省略します"); return H.unk; }
    const existing = fileEntry(S, path);
    if (existing && !TEXT_SUFFIXES.some((s) => path.toLowerCase().endsWith(s)))
      throw H.err("File.open：ファイル「" + path + "」は既にあり、テキスト系の拡張子ではありません",
        "ImageJ では \"File exists and suffix is not '.txt', '.java', etc.\" エラーになり止まります。");
    S.files[path] = { text: "" };
    S.__fileWriter = { path };
    S.__lastFile = path;
    H.step(e.line, "テキストファイル「" + path + "」を新規作成して開きます（ハンドルは ~0~）");
    return "~0~";
  },
  "File.close": (S, e, args, refs, H) => {
    arity(H, e, "File.close", args, 1, 1, "File.close(fileVariable)");
    const f = strA(H, args[0]);
    if (f !== "~0~") throw H.err("File.close のファイル変数が不正です", "ImageJ では \"Invalid file variable\" エラーになり止まります。File.open の戻り値を渡してください。");
    S.__fileWriter = null;
    H.step(e.line, "開いているファイルを閉じます");
    return H.unk;
  },
  "File.append": (S, e, args, refs, H) => {
    arity(H, e, "File.append", args, 2, 2, "File.append(string, path)");
    const str = strA(H, args[0]);
    const path = strA(H, args[1]);
    if (str === null || path === null) { H.step(e.line, "File.append：文字列またはパスが未確定のため、追記は省略します"); return H.unk; }
    const entry = fileEntry(S, path);
    if (entry && typeof entry.text === "string") entry.text += str;
    else if (!entry) S.files[path] = { text: str };
    else { H.step(e.line, "File.append：ファイル「" + path + "」はテキストとしてモデルに無いため、追記結果は省略します"); return H.unk; }
    S.__lastFile = path;
    H.step(e.line, "ファイル「" + path + "」に文字列を追記します");
    return H.unk;
  },
  "File.saveString": (S, e, args, refs, H) => {
    arity(H, e, "File.saveString", args, 2, 2, "File.saveString(string, path)");
    const str = strA(H, args[0]);
    const path = strA(H, args[1]);
    if (str === null || path === null) throw H.err("未確認：File.saveString の文字列またはパスが未確定です", "書き込む内容や保存先を推測しません。");
    S.files[path] = { text: str };
    S.__lastFile = path;
    H.step(e.line, "文字列をファイル「" + path + "」に保存します");
    return H.unk;
  },
  "File.copy": (S, e, args, refs, H) => {
    arity(H, e, "File.copy", args, 2, 2, "File.copy(sourcePath, destinationPath)");
    guardUnk(H, "File.copy", args);
    const src = needStr(H, e, "File.copy", args[0], "コピー元パス");
    const dst = needStr(H, e, "File.copy", args[1], "コピー先パス");
    const entry = fileEntry(S, src);
    if (!entry) {
      if (knownPlace(S, src) || isDirPath(S, src)) throw H.err("File.copy のコピー元「" + src + "」が見つかりません", "モデルに無いファイルはコピーできません。ImageJ でもここでエラーになり止まります。");
      H.step(e.line, "File.copy：コピー元「" + src + "」はモデルの範囲外のため、コピーは省略します");
      return H.unk;
    }
    S.files[dst] = clone(entry);
    H.step(e.line, "ファイル「" + src + "」を「" + dst + "」にコピーします");
    return H.unk;
  },
  /* 戻り値は実機どおり文字列の "1"／"0" */
  "File.delete": (S, e, args, refs, H) => {
    arity(H, e, "File.delete", args, 1, 1, "File.delete(path)");
    const path = strA(H, args[0]);
    if (path === null) return H.unk;
    if (fileEntry(S, path)) { delete S.files[path]; H.step(e.line, "ファイル「" + path + "」を削除します"); return "1"; }
    if (isDirPath(S, path)) {
      const nd = path.endsWith("/") ? path : path + "/";
      if (Object.keys(S.files).some((p) => p.startsWith(nd))) { H.step(e.line, "File.delete：フォルダ「" + path + "」は空でないため削除できません"); return "0"; }
      for (const k of Object.keys(S.directories)) if (S.directories[k] === nd || S.directories[k] === path) delete S.directories[k];
      H.step(e.line, "空のフォルダ「" + path + "」を削除します");
      return "1";
    }
    if (knownPlace(S, path)) return "0";
    H.step(e.line, "File.delete：パス「" + path + "」はモデルの範囲外のため、成否は省略します");
    return H.unk;
  },
  "File.rename": (S, e, args, refs, H) => {
    arity(H, e, "File.rename", args, 2, 2, "File.rename(oldPath, newPath)");
    const p1 = strA(H, args[0]), p2 = strA(H, args[1]);
    if (p1 === null || p2 === null) return H.unk;
    if (p1 === "0" || p1 === "NaN" || p2 === "0" || p2 === "NaN") throw H.err("File.rename のパスが不正です", "ImageJ では \"Invalid path\" エラーになり止まります。");
    const entry = fileEntry(S, p1);
    if (entry) {
      if (fileEntry(S, p2)) { H.step(e.line, "File.rename：移動先が既にある場合の成否はプラットフォーム依存のため、値は省略します"); return H.unk; }
      S.files[p2] = entry; delete S.files[p1];
      if (S.__lastFile === p1) S.__lastFile = p2;
      H.step(e.line, "ファイル「" + p1 + "」を「" + p2 + "」に移動／改名します");
      return "1";
    }
    if (isDirPath(S, p1)) {
      const nd1 = p1.endsWith("/") ? p1 : p1 + "/", nd2 = p2.endsWith("/") ? p2 : p2 + "/";
      if (isDirPath(S, p2)) { H.step(e.line, "File.rename：移動先が既にある場合の成否はプラットフォーム依存のため、値は省略します"); return H.unk; }
      for (const k of Object.keys(S.files)) if (k.startsWith(nd1)) { S.files[nd2 + k.slice(nd1.length)] = S.files[k]; delete S.files[k]; }
      for (const k of Object.keys(S.directories)) if (S.directories[k] === nd1) S.directories[k] = nd2;
      H.step(e.line, "フォルダ「" + p1 + "」を「" + p2 + "」に移動／改名します");
      return "1";
    }
    if (knownPlace(S, p1)) return "0";
    H.step(e.line, "File.rename：パス「" + p1 + "」はモデルの範囲外のため、成否は省略します");
    return H.unk;
  },
  /* バイト数を文字列で返す（実機どおり）。テキストは UTF-8 バイト数
   * （ASCII では文字数と一致する） */
  "File.length": (S, e, args, refs, H) => {
    arity(H, e, "File.length", args, 1, 1, "File.length(path)");
    const path = strA(H, args[0]);
    if (path === null) return H.unk;
    const entry = fileEntry(S, path);
    if (entry) {
      if (typeof entry.text === "string") return String(new TextEncoder().encode(entry.text).length);
      H.step(e.line, "File.length：ファイル「" + path + "」のバイト数はモデルで確定しないため、値は省略します");
      return H.unk;
    }
    if (knownPlace(S, path)) return "0";
    H.step(e.line, "File.length：パス「" + path + "」はモデルの範囲外のため、値は省略します");
    return H.unk;
  },
  "File.lastModified": (S, e, args, refs, H) => {
    arity(H, e, "File.lastModified", args, 1, 1, "File.lastModified(path)");
    const path = strA(H, args[0]);
    if (path === null) return H.unk;
    const entry = fileEntry(S, path);
    if (entry && typeof entry.lastModified === "number") return String(entry.lastModified);
    if (entry || knownPlace(S, path)) {
      if (entry) { H.step(e.line, "File.lastModified：更新時刻はモデルで与えられていないため、値は省略します"); return H.unk; }
      return "0";
    }
    H.step(e.line, "File.lastModified：パス「" + path + "」はモデルの範囲外のため、値は省略します");
    return H.unk;
  },
  "File.dateLastModified": (S, e, args, refs, H) => {
    arity(H, e, "File.dateLastModified", args, 1, 1, "File.dateLastModified(path)");
    const path = strA(H, args[0]);
    if (path === null) return H.unk;
    const entry = fileEntry(S, path);
    if (entry && typeof entry.lastModified === "number") return javaDateString(entry.lastModified);
    if (entry) { H.step(e.line, "File.dateLastModified：更新時刻はモデルで与えられていないため、値は省略します"); return H.unk; }
    if (knownPlace(S, path)) return javaDateString(0);
    H.step(e.line, "File.dateLastModified：パス「" + path + "」はモデルの範囲外のため、値は省略します");
    return H.unk;
  },
  "File.isFile": (S, e, args, refs, H) => {
    arity(H, e, "File.isFile", args, 1, 1, "File.isFile(path)");
    const path = strA(H, args[0]);
    if (path === null) return H.unk;
    if (fileEntry(S, path)) return "1";
    if (isDirPath(S, path) || knownPlace(S, path)) return "0";
    H.step(e.line, "File.isFile：パス「" + path + "」はモデルの範囲外のため、判定は省略します");
    return H.unk;
  },
  "File.isDirectory": (S, e, args, refs, H) => {
    arity(H, e, "File.isDirectory", args, 1, 1, "File.isDirectory(path)");
    const path = strA(H, args[0]);
    if (path === null) return H.unk;
    if (isDirPath(S, path)) return "1";
    if (fileEntry(S, path) || knownPlace(S, path)) return "0";
    H.step(e.line, "File.isDirectory：パス「" + path + "」はモデルの範囲外のため、判定は省略します");
    return H.unk;
  },
  "File.makeDirectory": (S, e, args, refs, H) => {
    arity(H, e, "File.makeDirectory", args, 1, 1, "File.makeDirectory(path)");
    guardUnk(H, "File.makeDirectory", args);
    const path = needStr(H, e, "File.makeDirectory", args[0], "パス");
    const nd = path.endsWith("/") ? path : path + "/";
    S.directories[path] = nd;
    H.step(e.line, "フォルダ「" + nd + "」を作成します");
    return H.unk;
  },
  "File.setDefaultDir": (S, e, args, refs, H) => {
    arity(H, e, "File.setDefaultDir", args, 1, 1, "File.setDefaultDir(path)");
    guardUnk(H, "File.setDefaultDir", args);
    S.__defaultDir = needStr(H, e, "File.setDefaultDir", args[0], "パス");
    H.step(e.line, "ファイルダイアログの既定フォルダを設定します");
    return H.unk;
  },
  /* File.directory／name／nameWithoutExtension: 本ファイルの File.open 等が
   * 記録した直近ファイルに対してのみ確定する（基礎の open() は記録しない） */
  "File.directory": (S, e, args, refs, H) => {
    arity(H, e, "File.directory", args, 0, 0, "File.directory()");
    if (!S.__lastFile) { H.step(e.line, "File.directory：最後に開いたファイルがこの実行で記録されていないため、値は省略します"); return H.unk; }
    const i = S.__lastFile.lastIndexOf("/");
    return i >= 0 ? S.__lastFile.slice(0, i + 1) : "";
  },
  "File.name": (S, e, args, refs, H) => {
    arity(H, e, "File.name", args, 0, 0, "File.name()");
    if (!S.__lastFile) { H.step(e.line, "File.name：最後に開いたファイルがこの実行で記録されていないため、値は省略します"); return H.unk; }
    return S.__lastFile.split("/").pop();
  },
  "File.nameWithoutExtension": (S, e, args, refs, H) => {
    arity(H, e, "File.nameWithoutExtension", args, 0, 0, "File.nameWithoutExtension()");
    if (!S.__lastFile) { H.step(e.line, "File.nameWithoutExtension：最後に開いたファイルがこの実行で記録されていないため、値は省略します"); return H.unk; }
    let nm = S.__lastFile.split("/").pop();
    const dot = nm.lastIndexOf(".");
    if (dot >= 0 && nm.length - dot <= 5) nm = nm.slice(0, dot);
    return nm;
  },
  "File.openAsString": (S, e, args, refs, H) => {
    arity(H, e, "File.openAsString", args, 1, 1, "File.openAsString(path)");
    const path = strA(H, args[0]);
    if (path === null || path === "") { H.step(e.line, "File.openAsString：パスが未確定（またはダイアログ依存）のため、値は省略します"); return H.unk; }
    const entry = fileEntry(S, path);
    if (entry) {
      S.__lastFile = path;
      if (typeof entry.text === "string") return entry.text;
      H.step(e.line, "File.openAsString：ファイル「" + path + "」の内容はテキストとしてモデルに無いため、値は省略します");
      return H.unk;
    }
    if (knownPlace(S, path)) {
      /* 実機では読み込み失敗でマクロが静かに終了する（interp.done） */
      S.halt = true;
      H.step(e.line, "File.openAsString：ファイル「" + path + "」が無いため、マクロはここで終了します");
      throw { __halt: 1 };
    }
    H.step(e.line, "File.openAsString：パス「" + path + "」はモデルの範囲外のため、値は省略します");
    return H.unk;
  },
  /* 先頭 max バイト（既定5000、.txt は全量）を文字列として読む。
   * モデルでは文字数で近似せず、テキストをそのまま切り取る（ASCII では一致） */
  "File.openAsRawString": (S, e, args, refs, H) => {
    arity(H, e, "File.openAsRawString", args, 1, 2, "File.openAsRawString(path[, maxBytes])");
    const path = strA(H, args[0]);
    if (path === null || path === "") { H.step(e.line, "File.openAsRawString：パスが未確定のため、値は省略します"); return H.unk; }
    const entry = fileEntry(S, path);
    if (entry) {
      S.__lastFile = path;
      if (typeof entry.text === "string") {
        if (path.toLowerCase().endsWith(".txt")) return entry.text;
        const max = args.length > 1 ? intA(H, args[1]) : 5000;
        return typeof max === "number" ? entry.text.slice(0, Math.max(0, max)) : entry.text;
      }
      H.step(e.line, "File.openAsRawString：ファイル「" + path + "」の内容はテキストとしてモデルに無いため、値は省略します");
      return H.unk;
    }
    if (knownPlace(S, path)) {
      S.halt = true;
      H.step(e.line, "File.openAsRawString：ファイル「" + path + "」が無いため、マクロはここで終了します");
      throw { __halt: 1 };
    }
    H.step(e.line, "File.openAsRawString：パス「" + path + "」はモデルの範囲外のため、値は省略します");
    return H.unk;
  },
  "File.openDialog": { unsupported: "OS のファイル選択ダイアログはモデルに無く、ユーザの選択を推測しないため。" },
  "File.openUrlAsString": { unsupported: "ネットワーク取得はモデルの前提（オフライン）外であり、取得内容を推測しないため。" },
  "File.openSequence": { unsupported: "フォルダ内の実ファイル列からスタックを構築する操作であり、各ファイルの画素内容をモデルでは保持できないため。" },
});

/* ================= Image.* ================= */
Object.assign(STATE, {
  /* 本来はプロパティ形式（Image.title 等）で、基礎のパーサでは到達しない。
   * 呼び出し形式で書かれた場合にアクティブ画像の値を返す */
  "Image.title": (S, e, args, refs, H) => { const im = H.needImg(e.line, "Image.title"); return im.title; },
  "Image.width": (S, e, args, refs, H) => { const im = H.needImg(e.line, "Image.width"); return im.w; },
  "Image.height": (S, e, args, refs, H) => { const im = H.needImg(e.line, "Image.height"); return im.h; },
  "Image.copy": (S, e, args, refs, H) => {
    arity(H, e, "Image.copy", args, 0, 0, "Image.copy()");
    const im = H.needImg(e.line, "Image.copy");
    S.__imgClip = { pix: clone(im.pix), roi: S.roi ? clone(S.roi) : null, w: im.w, h: im.h };
    H.step(e.line, "選択範囲（なければ画像全体）を内部クリップボードにコピーします");
    return H.unk;
  },
  "Image.paste": { unverified: "貼り付け位置の画素合成（貼り付けモードによる混合を含む）は、全画素の値がモデルで確定しないため。" },
});

/* ================= Fit.* ================= */
/* 静的表（fitList／fList／fMacro／パラメータ数）は CurveFitter.java から
 * 正確に転記した（取得は監査ツリーの fetch.sh、sha256 一致を確認済み）。
 * 対応範囲は閉形式で厳密解が得られる式種のみ:
 *   0 Straight Line（重み付き含む。加重最小二乗の閉形式）
 *   1,2,3,17,18,19,20 多項式（正規方程式による厳密な最小二乗解。
 *     重み付きは加重正規方程式で同様に閉形式）
 *   15 Exponential (linear regression)／16 Power (linear regression)
 *     （CurveFitter の modified fit types: 対数変換して直線回帰する）
 * それ以外の組み込み式とカスタム式は Nelder-Mead simplex 法の反復過程に
 * 依存し厳密に再現できないため、式名を挙げて未検証停止する。
 * フィット状態は S.__fit に実行単位で保持する（再実行で漏れない）。 */
const FIT_LIST = [
  "Straight Line", "2nd Degree Polynomial", "3rd Degree Polynomial", "4th Degree Polynomial",
  "Exponential", "Power", "Log", "Rodbard", "Gamma Variate", "y = a+b*ln(x-c)",
  "Rodbard (NIH Image)", "Exponential with Offset", "Gaussian", "Exponential Recovery",
  "Inverse Rodbard", "Exponential (linear regression)", "Power (linear regression)",
  "5th Degree Polynomial", "6th Degree Polynomial", "7th Degree Polynomial", "8th Degree Polynomial",
  "Gaussian (no offset)", "Exponential Recovery (no offset)", "Chapman-Richards", "Error Function",
];
const FIT_FORMULA = [
  "y = a+bx", "y = a+bx+cx^2", "y = a+bx+cx^2+dx^3", "y = a+bx+cx^2+dx^3+ex^4",
  "y = a*exp(bx)", "y = a*x^b", "y = a*ln(bx)", "y = d+(a-d)/(1+(x/c)^b)",
  "y = b*(x-a)^c*exp(-(x-a)/d)", "y = a+b*ln(x-c)",
  "x = d+(a-d)/(1+(y/c)^b) [y = c*((x-a)/(d-x))^(1/b)]",
  "y = a*exp(-bx) + c", "y = a + (b-a)*exp(-(x-c)*(x-c)/(2*d*d))", "y = a*(1-exp(-b*x)) + c",
  "y = c*((x-a)/(d-x))^(1/b)", "y = a*exp(bx)", "y = a*x^b",
  "y = a+bx+cx^2+dx^3+ex^4+fx^5", "y = a+bx+cx^2+dx^3+ex^4+fx^5+gx^6",
  "y = a+bx+cx^2+dx^3+ex^4+fx^5+gx^6+hx^7", "y = a+bx+cx^2+dx^3+ex^4+fx^5+gx^6+hx^7+ix^8",
  "y = a*exp(-(x-b)*(x-b)/(2*c*c))", "y = a*(1-exp(-b*x))", "y = a*(1-exp(-b*x))^c",
  "y = a+b*erf((x-c)/d)",
];
const FIT_MACRO = [
  "y = a+x*b", "y = a+x*(b+x*c)", "y = a+x*(b+x*(c+x*d))", "y = a+x*(b+x*(c+x*(d+x*e)))",
  "y = a*Math.exp(b*x)", "y = a*Math.pow(x,b)", "y = a*Math.log(b*x)",
  "y = d+(a-d)/(1+Math.pow(x/c,b))", "y = b*Math.pow(x-a,c)*Math.exp(-(x-a)/d)",
  "y = a+b*Math.log(x-c)", "y = c*Math.pow((x-a)/(d-x),1/b)", "y = a*Math.exp(-b*x)+c",
  "y = a+(b-a)*Math.exp(-(x-c)*(x-c)/(2*d*d))", "y = a*(1-Math.exp(-b*x))+c",
  "y = c*Math.pow((x-a)/(d-x),1/b)", "y = a*Math.exp(b*x)", "y = a*Math.pow(x,b)",
  "y = a+x*(b+x*(c+x*(d+x*f)))", "y = a+x*(b+x*(c+x*(d+x*(e+x*(f+x*g)))))",
  "y = a+x*(b+x*(c+x*(d+x*(e+x*(f+x*(g+x*h))))))",
  "y = a+x*(b+x*(c+x*(d+x*(e+x*(f+x*(g+x*(h+x*i)))))))",
  "y = a*Math.exp(-(x-b)*(x-b)/(2*c*c))", "y = a*(1-Math.exp(-b*x))",
  "y = a*Math.pow(1-Math.exp(-b*x),c)", "y = a+b*Math.erf((x-c)/d)",
];
const FIT_NPARAMS = [2, 3, 4, 5, 2, 2, 2, 4, 4, 3, 4, 3, 4, 3, 4, 2, 2, 6, 7, 8, 9, 3, 2, 3, 4];
const FIT_SUPPORTED = { 0: 1, 1: 1, 2: 1, 3: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1 };
function fitNumArr(H, e, name, v, what) {
  if (!Array.isArray(v)) throw H.err(name + " の" + what + "は配列が必要です", "カーブフィットのデータは配列で渡してください。ImageJ ではここでエラーになり止まります。");
  return v.map((x) => H.numArg(x));
}
/* ガウス消去（部分ピボット選択）で A p = b を解く。特異なら null */
function fitSolve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => row.concat(b[i]));
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (!(Math.abs(M[piv][col]) > 0)) return null;
    if (piv !== col) { const t = M[piv]; M[piv] = M[col]; M[col] = t; }
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const p = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * p[c];
    p[r] = s / M[r][r];
  }
  return p;
}
/* 多項式の最小二乗解（正規方程式）。次数 = パラメータ数−1。
 * ws があれば加重正規方程式（重み付きでも閉形式で厳密解が得られる） */
function fitPolyParams(xs, ys, degree, ws) {
  const m = degree + 1;
  const A = Array.from({ length: m }, () => new Array(m).fill(0));
  const b = new Array(m).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const w = ws ? ws[i] : 1;
    const pw = [1];
    for (let k = 1; k <= 2 * degree; k++) pw.push(pw[k - 1] * xs[i]);
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < m; c++) A[r][c] += w * pw[r + c];
      b[r] += w * pw[r] * ys[i];
    }
  }
  return fitSolve(A, b);
}
/* fList の式にパラメータを代入する決定的計算（対応範囲の式種のみ） */
function fitEval(index, params, x) {
  if (index === 0) return params[0] + params[1] * x;
  if (index === 15) return params[0] * Math.exp(params[1] * x);
  if (index === 16) return params[0] * Math.pow(x, params[1]);
  let v = 0;
  for (let k = params.length - 1; k >= 0; k--) v = v * x + params[k];
  return v;
}
function fitRSquared(fit) {
  const den = fit.sumY2 - fit.sumY * fit.sumY / fit.sumW;
  return den <= 0 ? 0 : 1 - fit.sse / den;
}
function fitNeedFitter(S, e, H, name) {
  if (!S.__fit) throw H.err("No fit", "ImageJ では \"No fit\" エラーになり止まります。先に Fit.doFit で当てはめを行ってください。");
  return S.__fit;
}
function fitStopUnsupported(H, name, dispName) {
  throw H.err("未検証：" + name + " は意味論を一次情報で確定できていないため停止します",
    "当てはめ式「" + dispName + "」の数値結果は Nelder-Mead simplex 法の反復過程に依存し、一次情報だけでは厳密に再現できないため（近似値は返しません）。対応範囲は Straight Line、多項式（2〜8次）、Exponential／Power (linear regression) です。");
}
function fitDoFit(S, e, H, name, args, weighted) {
  arity(H, e, name, args, 3, 4, name + (weighted ? "(equation, xpoints, ypoints, weights)" : "(equation, xpoints, ypoints[, initialValues])"));
  let index = -1, custom = null, dispName = "";
  const a0 = args[0];
  if (typeof a0 === "number") {
    index = H.int(a0);
    if (index < 0 || index >= FIT_LIST.length)
      throw H.err(name + " の式番号（" + H.fmt(args[0]) + "）が範囲外です", "組み込み式の番号は 0〜" + (FIT_LIST.length - 1) + " です。");
    dispName = FIT_LIST[index];
  } else {
    const raw = needStr(H, e, name, a0, "式");
    const isMath = raw.includes("Math.");
    const key = isMath ? raw : raw.toLowerCase();
    for (let i = 0; i < FIT_LIST.length; i++) if (FIT_LIST[i].toLowerCase() === key) { index = i; break; }
    if (index >= 0) dispName = FIT_LIST[index];
    else if (isMath || raw.includes("y=") || raw.includes("y =")) { custom = raw; dispName = raw; }
    else throw H.err(name + "：当てはめ式「" + raw + "」が分かりません", "ImageJ では \"Unrecognized fit\" エラーになり止まります。組み込み式の名前（例 \"Straight Line\"）か、y= を含むカスタム式を指定してください。");
  }
  const xs = fitNumArr(H, e, name, args[1], "x配列");
  const ys = fitNumArr(H, e, name, args[2], "y配列");
  if (xs.length !== ys.length) throw H.err(name + "：x 配列と y 配列の長さが違います", "ImageJ では \"Arrays not same length\" エラーになり止まります。");
  if (xs.length === 0) throw H.err(name + "：データ点がありません", "ImageJ では \"Zero length array\" エラーになり止まります。");
  let weights = null;
  if (args.length === 4) {
    const a3 = fitNumArr(H, e, name, args[3], weighted ? "重み配列" : "初期値配列");
    if (weighted) {
      if (a3.length !== xs.length) throw H.err(name + "：重み配列の長さがデータと違います", "ImageJ では \"Arrays not same length\" エラーになり止まります。");
      weights = a3;
    }
    /* doFit の初期値配列は閉形式の式種では解に影響しないため使わない */
  }
  if (custom !== null || !FIT_SUPPORTED[index]) fitStopUnsupported(H, name, dispName);
  let params = null, sumW = 0, sumY = 0, sumY2 = 0, sse = 0;
  if (index === 0) {
    /* Straight Line: 加重最小二乗の閉形式（CurveFitter.doRegression） */
    const w = weights || xs.map(() => 1);
    let sx = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < xs.length; i++) {
      sumW += w[i]; sx += w[i] * xs[i]; sumY += w[i] * ys[i];
      sxx += w[i] * xs[i] * xs[i]; sxy += w[i] * xs[i] * ys[i]; sumY2 += w[i] * ys[i] * ys[i];
    }
    const slope = (sxy - sx * sumY / sumW) / (sxx - sx * sx / sumW);
    const offset = (sumY - slope * sx) / sumW;
    params = [offset, slope];
    for (let i = 0; i < xs.length; i++) { const r = ys[i] - (offset + slope * xs[i]); sse += w[i] * r * r; }
  } else if (index === 15 || index === 16) {
    /* modified fit types: 対数変換して直線回帰し、切片を元へ戻す。
     * rSquared 用の合計は変換後データで取る（CurveFitter の実挙動） */
    const tx = [], ty = [];
    let ySign = 0;
    for (let i = 0; i < xs.length; i++) {
      let x = xs[i];
      const y = ys[i];
      if (index === 16) {
        if (x === 0 && y === 0) continue; /* restrictPower: (0,0) は読み飛ばす */
        if (x <= 0) throw H.err(name + "：Power 回帰では x が 0 以下の点は扱えません", "CurveFitter では対数が取れない点があると当てはめがエラーになります。");
        x = Math.log(x);
      }
      const sgn = Math.sign(y);
      if (ySign === 0) ySign = sgn;
      if (sgn !== ySign || sgn === 0)
        throw H.err(name + "：y の符号が揃っていません", "対数線形回帰では y の符号が全て同じでなければならず、CurveFitter では当てはめがエラーになります。");
      tx.push(x); ty.push(Math.log(Math.abs(y)));
    }
    if (tx.length === 0) throw H.err(name + "：使えるデータ点がありません", "ImageJ ではここでエラーになり止まります。");
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < tx.length; i++) {
      sx += tx[i]; sy += ty[i]; sxx += tx[i] * tx[i]; sxy += tx[i] * ty[i]; sumY2 += ty[i] * ty[i];
    }
    sumW = tx.length; sumY = sy;
    const slope = (sxy - sx * sy / sumW) / (sxx - sx * sx / sumW);
    const offset = (sy - slope * sx) / sumW;
    params = [ySign * Math.exp(offset), slope];
    for (let i = 0; i < tx.length; i++) { const r = ty[i] - (offset + slope * tx[i]); sse += r * r; }
  } else {
    /* 多項式: 正規方程式による厳密な最小二乗解（重み付きも閉形式） */
    const degree = FIT_NPARAMS[index] - 1;
    if (xs.length < degree + 1)
      throw H.err(name + "：データ点（" + xs.length + "）がパラメータ数（" + (degree + 1) + "）より少ないため当てはめできません", "点の数以上の係数は決まりません。");
    params = fitPolyParams(xs, ys, degree, weights);
    if (!params) throw H.err(name + "：正規方程式が特異で解が決まりません", "x の値が重複している等、係数を一意に決められないデータです。");
    for (let i = 0; i < xs.length; i++) {
      const w = weights ? weights[i] : 1;
      sumW += w; sumY += w * ys[i]; sumY2 += w * ys[i] * ys[i];
      const r = ys[i] - fitEval(index, params, xs[i]); sse += w * r * r;
    }
  }
  const fit = { index, params, sumW, sumY, sumY2, sse };
  S.__fit = fit;
  H.step(e.line, "「" + dispName + "」でカーブフィットを行います（a=" + H.fmt(params[0]) + (params.length > 1 ? ", b=" + H.fmt(params[1]) : "") + (params.length > 2 ? " ほか " + (params.length - 2) + " 個" : "") + "）");
  if (S.__fitLog) {
    /* Fit.logResults の後続 doFit: 導出できる行だけを実書式で Log へ出す。
     * Status／反復回数／所要時間／標準偏差の行は反復過程依存で再現しない */
    S.__fitLog = false;
    const letters = "abcdefghi";
    const lines = [
      "",
      "Formula: " + FIT_FORMULA[index],
      "Macro code: " + FIT_MACRO[index],
      "R^2: " + H.fmt(fitRSquared(fit)),
      "Parameters:",
    ].concat(params.map((v, i) => "\t" + letters[i] + " = " + H.fmt(v)));
    for (const ln of lines) {
      if (S.log.length < 200) { S.log.push(ln); S.logLines.push(e.line); }
    }
    H.step(e.line, "Fit.logResults の指定により、当てはめ結果を Log に出力します（Status・反復回数・標準偏差の行は反復過程依存のため出力しません）");
  }
  return NaN;
}
Object.assign(STATE, {
  "Fit.doFit": (S, e, args, refs, H) => fitDoFit(S, e, H, "Fit.doFit", args, false),
  "Fit.doWeightedFit": (S, e, args, refs, H) => fitDoFit(S, e, H, "Fit.doWeightedFit", args, true),
  "Fit.rSquared": (S, e, args, refs, H) => {
    arity(H, e, "Fit.rSquared", args, 0, 0, "Fit.rSquared");
    return fitRSquared(fitNeedFitter(S, e, H, "Fit.rSquared"));
  },
  "Fit.p": (S, e, args, refs, H) => {
    arity(H, e, "Fit.p", args, 1, 1, "Fit.p(index)");
    const fit = fitNeedFitter(S, e, H, "Fit.p");
    const ix = intA(H, args[0]);
    const np = FIT_NPARAMS[fit.index];
    if (typeof ix !== "number" || ix < 0 || ix >= np)
      throw H.err("Fit.p の番号（" + H.fmt(args[0]) + "）が範囲外です", "現在の式（" + FIT_LIST[fit.index] + "）のパラメータは 0〜" + (np - 1) + " です。ImageJ ではここでエラーになり止まります。");
    return fit.params[ix];
  },
  "Fit.nParams": (S, e, args, refs, H) => {
    arity(H, e, "Fit.nParams", args, 0, 0, "Fit.nParams");
    const fit = fitNeedFitter(S, e, H, "Fit.nParams");
    return FIT_NPARAMS[fit.index];
  },
  "Fit.f": (S, e, args, refs, H) => {
    arity(H, e, "Fit.f", args, 1, 1, "Fit.f(x)");
    const fit = fitNeedFitter(S, e, H, "Fit.f");
    const x = H.numArg(args[0]);
    if (typeof x !== "number") return H.unk;
    return fitEval(fit.index, fit.params, x);
  },
  "Fit.nEquations": (S, e, args, refs, H) => {
    arity(H, e, "Fit.nEquations", args, 0, 0, "Fit.nEquations");
    return FIT_LIST.length;
  },
  "Fit.getEquation": (S, e, args, refs, H) => {
    arity(H, e, "Fit.getEquation", args, 3, 4, "Fit.getEquation(index, name, formula[, macro])");
    const ix = intA(H, args[0]);
    if (typeof ix !== "number" || ix < 0 || ix >= FIT_LIST.length)
      throw H.err("Fit.getEquation の番号（" + H.fmt(args[0]) + "）が範囲外です", "組み込み式の番号は 0〜" + (FIT_LIST.length - 1) + " です。ImageJ ではここでエラーになり止まります。");
    for (let i = 1; i < args.length; i++)
      if (!refs[i]) throw H.err("Fit.getEquation の " + (i + 1) + " 番目の引数は変数が必要です", "式の名前・式文字列・マクロコードは変数へ書き戻されます。変数を渡してください。");
    H.writeRef(refs[1], FIT_LIST[ix]);
    H.writeRef(refs[2], FIT_FORMULA[ix]);
    if (args.length === 4) H.writeRef(refs[3], FIT_MACRO[ix]);
    H.step(e.line, "組み込み式 " + ix + " 番（" + FIT_LIST[ix] + "）の名前・式を変数に入れます");
    return NaN;
  },
  "Fit.plot": (S, e, args, refs, H) => {
    arity(H, e, "Fit.plot", args, 0, 0, "Fit.plot");
    fitNeedFitter(S, e, H, "Fit.plot");
    throw H.err("未検証：Fit.plot は意味論を一次情報で確定できていないため停止します",
      "Fit.plot は Fitter.plot が新規プロットウィンドウを構築する処理であり、その構築仕様（Fitter.java）が未取得のため、表示内容を確定できない。");
  },
  "Fit.logResults": (S, e, args, refs, H) => {
    arity(H, e, "Fit.logResults", args, 0, 0, "Fit.logResults");
    S.__fitLog = true;
    H.step(e.line, "次の Fit.doFit の結果を Log に出力する指定にします");
    return NaN;
  },
  "Fit.showDialog": { unsupported: "対話的なフィット設定ダイアログはモデルに無く、ユーザの選択を推測しないため。" },
});

/* ================= 色・描画・フォントの状態 ================= */
function setColorImpl(S, e, H, name, args) {
  if (args.length === 1 && typeof args[0] === "string") {
    const rgb = parseColor13(H, e, name, args[0]);
    const cs = colorState(S);
    cs.fg = rgb; cs.fgValue = null;
    H.step(e.line, "描画色を「" + args[0] + "」に設定します");
    return H.unk;
  }
  if (args.length === 1) {
    const im = H.needImg(e.line, name);
    const v = H.numArg(args[0]);
    if (typeof v === "number") {
      if (im.bit === 8 && (v < 0 || v > 255)) throw H.err(name + " の値（" + H.fmt(v) + "）が8ビット範囲（0〜255）の外です", "ImageJ では \"Argument out of 8-bit range (0-255)\" エラーになり止まります。");
      if (im.bit === 16 && (v < 0 || v > 65535)) throw H.err(name + " の値（" + H.fmt(v) + "）が16ビット範囲（0〜65535）の外です", "ImageJ では \"Argument out of 16-bit range (0-65535)\" エラーになり止まります。");
    }
    const cs = colorState(S);
    cs.fgValue = v; cs.fg = null;
    H.step(e.line, "描画色を値 " + H.fmt(v) + " に設定します");
    return H.unk;
  }
  if (args.length === 3) {
    const cs = colorState(S);
    cs.fg = [0, 1, 2].map((i) => Math.min(255, Math.max(0, intA(H, args[i]))));
    cs.fgValue = null;
    H.step(e.line, "描画色を RGB(" + cs.fg.join(", ") + ") に設定します");
    return H.unk;
  }
  throw H.err(name + " の引数の数が違います", "書式は " + name + "(color)、" + name + "(value)、" + name + "(r, g, b) のいずれかですが、" + args.length + " 個渡しています。");
}
function setFgBgImpl(S, e, H, name, args, isFg) {
  const cs = colorState(S);
  if (args.length === 3) {
    const rgb = [0, 1, 2].map((i) => Math.min(255, Math.max(0, intA(H, args[i]))));
    if (isFg) { cs.fg = rgb; cs.fgValue = null; } else { cs.bg = rgb; cs.bgValue = null; }
    H.step(e.line, (isFg ? "前景色" : "背景色") + "を RGB(" + rgb.join(", ") + ") に設定します");
    return H.unk;
  }
  if (args.length === 1 && typeof args[0] === "string") {
    const rgb = parseColor13(H, e, name, args[0]);
    if (isFg) { cs.fg = rgb; cs.fgValue = null; } else { cs.bg = rgb; cs.bgValue = null; }
    H.step(e.line, (isFg ? "前景色" : "背景色") + "を「" + args[0] + "」に設定します");
    return H.unk;
  }
  if (args.length === 1) {
    const v = H.numArg(args[0]);
    if (isFg) { cs.fgValue = v; cs.fg = typeof v === "number" && v >= 0 && v <= 255 ? [v, v, v] : null; }
    else { cs.bgValue = v; cs.bg = typeof v === "number" && v >= 0 && v <= 255 ? [v, v, v] : null; }
    H.step(e.line, (isFg ? "前景色" : "背景色") + "を値 " + H.fmt(v) + " に設定します");
    return H.unk;
  }
  throw H.err(name + " の引数の数が違います", "書式は " + name + "(r, g, b) などですが、" + args.length + " 個渡しています。");
}
function setLutImpl(S, e, H, name, args) {
  arity(H, e, name, args, 3, 3, name + "(reds, greens, blues)");
  const im = H.needImg(e.line, name);
  if (im.bit === 24) throw H.err(name + " は RGB 画像には使えません", "ImageJ では \"Non-RGB image expected\" エラーになり止まります。");
  for (let i = 0; i < 3; i++) if (!Array.isArray(args[i])) throw H.err(name + " の引数は3つの配列が必要です", "書式は " + name + "(reds, greens, blues) です。");
  if (args[0].length !== args[1].length || args[0].length !== args[2].length)
    throw H.err(name + " の配列の長さが揃っていません", "ImageJ では \"Arrays are not the same length\" エラーになり止まります。");
  im.lut = args.map((a) => a.map((v) => { const n = intA(H, v); return typeof n === "number" ? (n & 0xff) : 0; }));
  H.step(e.line, "画像に LUT（色の対応表、" + args[0].length + " 段階）を設定します");
  return H.unk;
}
Object.assign(STATE, {
  "setColor": (S, e, args, refs, H) => setColorImpl(S, e, H, "setColor", args),
  "Color.set": (S, e, args, refs, H) => setColorImpl(S, e, H, "Color.set", args),
  "setForegroundColor": (S, e, args, refs, H) => setFgBgImpl(S, e, H, "setForegroundColor", args, true),
  "setBackgroundColor": (S, e, args, refs, H) => setFgBgImpl(S, e, H, "setBackgroundColor", args, false),
  "Color.setForeground": (S, e, args, refs, H) => {
    const cs = colorState(S);
    if (args.length === 1) {
      const spec = strA(H, args[0]);
      const rgb = decodeColorLoose(args[0]);
      cs.fg = rgb; cs.fgSpec = spec; cs.fgValue = null;
      H.step(e.line, "前景色を「" + H.fmt(args[0]) + "」に設定します" + (rgb ? "" : "（色の解釈はモデルで確定しないため、RGB 値としての読み取りは省略されます）"));
      return H.unk;
    }
    if (args.length === 3) { cs.fg = [intA(H, args[0]), intA(H, args[1]), intA(H, args[2])]; cs.fgValue = null; H.step(e.line, "前景色を設定します"); return H.unk; }
    throw H.err("Color.setForeground の引数の数が違います", "書式は Color.setForeground(color) または Color.setForeground(r, g, b) ですが、" + args.length + " 個渡しています。");
  },
  "Color.setBackground": (S, e, args, refs, H) => {
    const cs = colorState(S);
    if (args.length === 1) {
      const spec = strA(H, args[0]);
      const rgb = decodeColorLoose(args[0]);
      cs.bg = rgb; cs.bgSpec = spec; cs.bgValue = null;
      H.step(e.line, "背景色を「" + H.fmt(args[0]) + "」に設定します" + (rgb ? "" : "（色の解釈はモデルで確定しないため、RGB 値としての読み取りは省略されます）"));
      return H.unk;
    }
    if (args.length === 3) { cs.bg = [intA(H, args[0]), intA(H, args[1]), intA(H, args[2])]; cs.bgValue = null; H.step(e.line, "背景色を設定します"); return H.unk; }
    throw H.err("Color.setBackground の引数の数が違います", "書式は Color.setBackground(color) または Color.setBackground(r, g, b) ですが、" + args.length + " 個渡しています。");
  },
  "Color.setForegroundValue": (S, e, args, refs, H) => {
    arity(H, e, "Color.setForegroundValue", args, 1, 1, "Color.setForegroundValue(value)");
    colorState(S).fgValue = H.numArg(args[0]);
    H.step(e.line, "前景の描画値を " + H.fmt(args[0]) + " に設定します");
    return H.unk;
  },
  "Color.setBackgroundValue": (S, e, args, refs, H) => {
    arity(H, e, "Color.setBackgroundValue", args, 1, 1, "Color.setBackgroundValue(value)");
    colorState(S).bgValue = H.numArg(args[0]);
    H.step(e.line, "背景の描画値を " + H.fmt(args[0]) + " に設定します");
    return H.unk;
  },
  /* Colors.colorToString は Colors.java で確定（FIX-IJB 格上げ）。
   * fg/bg が値のみで設定され RGB が無い経路は、getValue("rgb.foreground")
   * の先例どおり未確定値に倒す */
  "Color.foreground": (S, e, args, refs, H) => {
    arity(H, e, "Color.foreground", args, 0, 0, "Color.foreground");
    const cs = colorState(S);
    if (!cs.fg) { H.step(e.line, "Color.foreground：前景色が値のみで設定されているため、色文字列は省略します"); return H.unk; }
    return colorToString(cs.fg);
  },
  "Color.background": (S, e, args, refs, H) => {
    arity(H, e, "Color.background", args, 0, 0, "Color.background");
    const cs = colorState(S);
    if (!cs.bg) { H.step(e.line, "Color.background：背景色が値のみで設定されているため、色文字列は省略します"); return H.unk; }
    return colorToString(cs.bg);
  },
  "Color.toString": (S, e, args, refs, H) => {
    arity(H, e, "Color.toString", args, 3, 3, "Color.toString(r, g, b)");
    if (args.some((a) => H.isUnk(a))) { H.step(e.line, "Color.toString：成分が未確定のため、色文字列は省略します"); return H.unk; }
    return colorToString([intA(H, args[0]), intA(H, args[1]), intA(H, args[2])]);
  },
  /* Colors.decode で確定できる形式（13色名と16進）だけ RGB 配列を返す */
  "Color.toArray": (S, e, args, refs, H) => {
    arity(H, e, "Color.toArray", args, 1, 1, "Color.toArray(colorString)");
    const rgb = decodeColorLoose(args[0]);
    if (rgb) return rgb;
    H.step(e.line, "Color.toArray：色「" + H.fmt(args[0]) + "」の解釈はモデルで確定しないため、値は省略します");
    return H.unk;
  },
  "setLut": (S, e, args, refs, H) => setLutImpl(S, e, H, "setLut", args),
  "Color.setLut": (S, e, args, refs, H) => setLutImpl(S, e, H, "Color.setLut", args),
  "setFont": (S, e, args, refs, H) => {
    arity(H, e, "setFont", args, 2, 3, "setFont(name, size[, style])");
    S.__font = { name: strA(H, args[0]), size: H.numArg(args[1]), style: args.length > 2 ? strA(H, args[2]) : "" };
    H.step(e.line, "描画用フォントを " + H.fmt(args[0]) + " " + H.fmt(args[1]) + " に設定します");
    return H.unk;
  },
  "setJustification": (S, e, args, refs, H) => {
    arity(H, e, "setJustification", args, 1, 1, "setJustification(\"left\"|\"center\"|\"right\")");
    H.needImg(e.line, "setJustification");
    S.__justification = strA(H, args[0]);
    H.step(e.line, "drawString の行揃えを「" + H.fmt(args[0]) + "」に設定します");
    return H.unk;
  },
  "setLineWidth": (S, e, args, refs, H) => {
    arity(H, e, "setLineWidth", args, 1, 1, "setLineWidth(width)");
    guardUnk(H, "setLineWidth", args);
    H.needImg(e.line, "setLineWidth");
    S.__lineWidth = H.numArg(args[0]);
    H.step(e.line, "描画の線幅を " + H.fmt(args[0]) + " に設定します");
    return H.unk;
  },
  /* 描画系: 基礎の run("Draw")／run("Fill") と同じく、画素へは反映せず
   * 手順としてだけ記録する（画素値は分布モデルで確定しないため） */
  "drawLine": (S, e, args, refs, H) => {
    arity(H, e, "drawLine", args, 4, 4, "drawLine(x1, y1, x2, y2)");
    H.needImg(e.line, "drawLine");
    H.step(e.line, "(" + H.fmt(args[0]) + ", " + H.fmt(args[1]) + ") から (" + H.fmt(args[2]) + ", " + H.fmt(args[3]) + ") へ線を描きます（描画後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "drawOval": (S, e, args, refs, H) => {
    arity(H, e, "drawOval", args, 4, 4, "drawOval(x, y, width, height)");
    H.needImg(e.line, "drawOval");
    H.step(e.line, "楕円の輪郭を描きます（描画後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "drawRect": (S, e, args, refs, H) => {
    arity(H, e, "drawRect", args, 4, 4, "drawRect(x, y, width, height)");
    H.needImg(e.line, "drawRect");
    H.step(e.line, "矩形の輪郭を描きます（描画後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "drawString": (S, e, args, refs, H) => {
    arity(H, e, "drawString", args, 3, 4, "drawString(string, x, y[, angle])");
    H.needImg(e.line, "drawString");
    H.step(e.line, "文字列「" + H.fmt(args[0]) + "」を描きます（描画後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "fill": (S, e, args, refs, H) => {
    arity(H, e, "fill", args, 0, 0, "fill()");
    H.needImg(e.line, "fill");
    H.step(e.line, "選択範囲（なければ画像全体）を前景色で塗ります（塗り後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "fillOval": (S, e, args, refs, H) => {
    arity(H, e, "fillOval", args, 4, 4, "fillOval(x, y, width, height)");
    H.needImg(e.line, "fillOval");
    H.step(e.line, "楕円を前景色で塗ります（塗り後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "fillRect": (S, e, args, refs, H) => {
    arity(H, e, "fillRect", args, 4, 4, "fillRect(x, y, width, height)");
    H.needImg(e.line, "fillRect");
    H.step(e.line, "矩形を前景色で塗ります（塗り後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    return H.unk;
  },
  "moveTo": (S, e, args, refs, H) => {
    arity(H, e, "moveTo", args, 2, 2, "moveTo(x, y)");
    H.needImg(e.line, "moveTo");
    S.__drawPos = [H.numArg(args[0]), H.numArg(args[1])];
    H.step(e.line, "描画ペンを (" + H.fmt(args[0]) + ", " + H.fmt(args[1]) + ") へ移動します");
    return H.unk;
  },
  "lineTo": (S, e, args, refs, H) => {
    arity(H, e, "lineTo", args, 2, 2, "lineTo(x, y)");
    H.needImg(e.line, "lineTo");
    H.step(e.line, "現在のペン位置から (" + H.fmt(args[0]) + ", " + H.fmt(args[1]) + ") へ線を描きます（描画後の画素値はモデルで確定しないため、画素の読み取りには反映しません）");
    S.__drawPos = [H.numArg(args[0]), H.numArg(args[1])];
    return H.unk;
  },
  "makeArrow": (S, e, args, refs, H) => {
    arity(H, e, "makeArrow", args, 4, 5, "makeArrow(x1, y1, x2, y2[, style])");
    guardUnk(H, "makeArrow", args.slice(0, 4));
    H.needImg(e.line, "makeArrow");
    const x1 = H.numArg(args[0]), y1 = H.numArg(args[1]), x2 = H.numArg(args[2]), y2 = H.numArg(args[3]);
    S.roi = { type: "line", x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), x2: Math.max(x1, x2), y2: Math.max(y1, y2), ex1: x1, ey1: y1, ex2: x2, ey2: y2, arrow: true, arrowStyle: args.length > 4 ? strA(H, args[4]) : "" };
    H.step(e.line, "(" + H.fmt(x1) + ", " + H.fmt(y1) + ") から (" + H.fmt(x2) + ", " + H.fmt(y2) + ") へ矢印の選択を作成します");
    return H.unk;
  },
  /* 主軸が (x1,y1)-(x2,y2) の楕円。外接矩形は回転楕円の軸平行外接で決まる */
  "makeEllipse": (S, e, args, refs, H) => {
    arity(H, e, "makeEllipse", args, 5, 5, "makeEllipse(x1, y1, x2, y2, aspectRatio)");
    guardUnk(H, "makeEllipse", args);
    H.needImg(e.line, "makeEllipse");
    const x1 = H.numArg(args[0]), y1 = H.numArg(args[1]), x2 = H.numArg(args[2]), y2 = H.numArg(args[3]);
    const aspect = H.numArg(args[4]);
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    const a = L / 2, b = (L * aspect) / 2;
    const cos = L === 0 ? 1 : dx / L, sin = L === 0 ? 0 : dy / L;
    const hx = Math.sqrt((a * cos) * (a * cos) + (b * sin) * (b * sin));
    const hy = Math.sqrt((a * sin) * (a * sin) + (b * cos) * (b * cos));
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    S.roi = { type: "oval", x: cx - hx, y: cy - hy, w: 2 * hx, h: 2 * hy };
    H.step(e.line, "(" + H.fmt(x1) + ", " + H.fmt(y1) + ") から (" + H.fmt(x2) + ", " + H.fmt(y2) + ") を主軸とする楕円の選択を作成します");
    return H.unk;
  },
  "makePoint": (S, e, args, refs, H) => {
    arity(H, e, "makePoint", args, 2, 3, "makePoint(x, y[, options])");
    guardUnk(H, "makePoint", args.slice(0, 2));
    H.needImg(e.line, "makePoint");
    const x = H.numArg(args[0]), y = H.numArg(args[1]);
    const opts = args.length > 2 ? strA(H, args[2]) : null;
    if (opts !== null && opts.indexOf("add") !== -1 && S.roi && S.roi.type === "point" && Array.isArray(S.roi.points)) {
      S.roi.points.push([x, y]);
      S.roi.npoints = S.roi.points.length;
      H.step(e.line, "点の選択に (" + H.fmt(x) + ", " + H.fmt(y) + ") を追加します（" + S.roi.npoints + " 点）");
    } else {
      S.roi = { type: "point", x, y, w: 0, h: 0, npoints: 1, points: [[x, y]] };
      H.step(e.line, "(" + H.fmt(x) + ", " + H.fmt(y) + ") に点の選択を作成します");
    }
    return H.unk;
  },
  "makeRotatedRectangle": (S, e, args, refs, H) => {
    arity(H, e, "makeRotatedRectangle", args, 5, 5, "makeRotatedRectangle(x1, y1, x2, y2, width)");
    guardUnk(H, "makeRotatedRectangle", args);
    H.needImg(e.line, "makeRotatedRectangle");
    const x1 = H.numArg(args[0]), y1 = H.numArg(args[1]), x2 = H.numArg(args[2]), y2 = H.numArg(args[3]);
    const width = H.numArg(args[4]);
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * (width / 2), ny = (dx / L) * (width / 2);
    const xs = [x1 + nx, x1 - nx, x2 + nx, x2 - nx], ys = [y1 + ny, y1 - ny, y2 + ny, y2 - ny];
    const minX = Math.min(...xs), minY = Math.min(...ys);
    S.roi = { type: "line", x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY, x2: Math.max(...xs), y2: Math.max(...ys), ex1: x1, ey1: y1, ex2: x2, ey2: y2, strokeWidth: width, rotRect: true };
    H.step(e.line, "(" + H.fmt(x1) + ", " + H.fmt(y1) + ") から (" + H.fmt(x2) + ", " + H.fmt(y2) + ") へ幅 " + H.fmt(width) + " の回転矩形の選択を作成します");
    return H.unk;
  },
  "makeText": (S, e, args, refs, H) => {
    arity(H, e, "makeText", args, 3, 3, "makeText(string, x, y)");
    guardUnk(H, "makeText", [args[1], args[2]]);
    H.needImg(e.line, "makeText");
    S.roi = { type: "text", text: strA(H, args[0]), x: H.numArg(args[1]), y: H.numArg(args[2]), w: H.unk, h: H.unk, fontSize: S.__font && typeof S.__font.size === "number" ? S.__font.size : H.unk };
    H.step(e.line, "(" + H.fmt(args[1]) + ", " + H.fmt(args[2]) + ") にテキストの選択を作成します（文字の大きさはフォント計測依存のため、外接矩形は省略します）");
    return H.unk;
  },
  "setKeyDown": (S, e, args, refs, H) => {
    arity(H, e, "setKeyDown", args, 1, 1, "setKeyDown(keys)");
    const keys = needStr(H, e, "setKeyDown", args[0], "キー");
    S.__keys = new Set(keys.toLowerCase().split(/\s+/).filter((k) => k.length));
    H.step(e.line, "押されているキーの状態を「" + keys + "」として設定します（isKeyDown の判定に使います）");
    return H.unk;
  },
  "isKeyDown": (S, e, args, refs, H) => {
    arity(H, e, "isKeyDown", args, 1, 1, "isKeyDown(key)");
    const k = strA(H, args[0]);
    if (k === null) return H.unk;
    if (S.__keys) return S.__keys.has(k.toLowerCase()) ? 1 : 0;
    H.step(e.line, "isKeyDown：キーの状態はこの実行で設定されていないため、判定は省略します（実際のキーボード状態はモデルにありません）");
    return H.unk;
  },
  "setPasteMode": (S, e, args, refs, H) => {
    arity(H, e, "setPasteMode", args, 1, 1, "setPasteMode(mode)");
    S.__pasteMode = strA(H, args[0]);
    H.step(e.line, "貼り付けモードを「" + H.fmt(args[0]) + "」に設定します");
    return H.unk;
  },
  "setRGBWeights": (S, e, args, refs, H) => {
    arity(H, e, "setRGBWeights", args, 3, 3, "setRGBWeights(rWeight, gWeight, bWeight)");
    guardUnk(H, "setRGBWeights", args);
    S.__rgbWeights = [H.numArg(args[0]), H.numArg(args[1]), H.numArg(args[2])];
    H.step(e.line, "RGB→グレースケール変換の重みを設定します");
    return H.unk;
  },
  "setTool": (S, e, args, refs, H) => {
    arity(H, e, "setTool", args, 1, 1, "setTool(idOrName)");
    S.__tool = args[0];
    H.step(e.line, "ツールを「" + H.fmt(args[0]) + "」に切り替えます");
    return H.unk;
  },
  "setZCoordinate": (S, e, args, refs, H) => {
    arity(H, e, "setZCoordinate", args, 1, 1, "setZCoordinate(z)");
    guardUnk(H, "setZCoordinate", args);
    const im = H.needImg(e.line, "setZCoordinate");
    im.zcoord = intA(H, args[0]);
    H.step(e.line, "getPixel／setPixel の対象 z 位置（0始まり）を " + im.zcoord + " に設定します（モデルでは画素の読み書き先は変わりません）");
    return H.unk;
  },
});
