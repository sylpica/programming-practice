// 高度モード（ブロックB6）: ワイド文字・マルチバイト変換のうち
// 値渡しで完結する関数の意味論ハンドラ。担当班 C4（ワイド／変換系）。
// ハンドラ署名: (args, values, s, api, node, H) => 値。
//
// 前提（コーディネーター裁定）:
// - ロケールは "C" 固定（setlocale は未対応）。"C" ロケールでは
//   マルチバイト文字は 1 バイト文字だけであり、有効な文字は
//   0..127（ASCII）の範囲だけである。128..255 のバイト／値は
//   無効（EILSEQ）として扱う。
// - wchar_t／char16_t／char32_t 型の宣言はモデル未対応のため、
//   ワイド文字列そのものを要する関数は実装しない（リファレンスで
//   未対応として収載）。ここで扱うのは、ワイド文字「値」（整数値）
//   と char 配列への書き込みで完結する関数だけである。
// - 変換状態（mbstate_t*）引数は NULL のみ対応する。非 NULL は
//   「未対応」として停止する。
// - 意味論は gcc 13 系を LC_ALL=C で実走して裏付けた（テスト
//   tests/muse-adv-b6-wide.test.js の期待値と同じ実測に基づく）。
//   実測要点: btowc は 0..127 をそのまま返し、それ以外（EOF・
//   128..255・範囲外）は WEOF(-1)。wctob は 0..127 をそのまま返し、
//   それ以外は EOF(-1)。wctomb(NULL, wc) は 0（状態依存でない）。
//   wcrtomb(NULL, 'A', NULL) は 1。mblen は先頭バイトが NUL なら 0、
//   1..127 なら 1、128..255 なら -1、n=0 で非 NUL なら -1。
//   mbrlen は n=0 のとき (size_t)-2、128..255 のとき (size_t)-1。
//   c16rtomb/c32rtomb は ASCII のみ成功し、それ以外は (size_t)-1
//   （errno=EILSEQ）。ただし c16rtomb のサロゲート（0xD800 等）に
//   ついて glibc は内部状態で 0 を返すことがあるが、課題裁定の
//   モデル規則（ASCII のみ成功、それ以外は (size_t)-1）を優先する。
// - (size_t)-1／(size_t)-2 は、モデルの数値が JS の安全整数範囲で
//   表される都合上、符号付きの -1／-2 として返す（戻り型の宣言は
//   規格どおり size_t 相当＝"unsigned long"）。int 変数への代入や
//   (int) キャストで実物と同じ -1／-2 として観測できる。

function need(name, args, count, api, node) {
  if (args.length !== count)
    api.fail(
      `${name} は引数を${count}つだけ取ります（${args.length}個は渡せません）`,
      node,
      "CompileError",
    );
}
function firstUnknown(values, H) {
  for (const v of values) if (H.isUnknown(v)) return v;
  return undefined;
}
// 整数引数（wint_t／wchar_t 値相当）。呼び出し側で unknown を先に
// 処理する前提で、ここでは数値でないものをコンパイルエラーにする。
function intValue(name, v, api, node) {
  if (typeof v === "boolean") return Number(v);
  if (typeof v !== "number")
    api.fail(`${name} の引数は整数でなければなりません`, node, "CompileError");
  if (!Number.isFinite(v))
    api.fail(`${name} の引数が有限の数ではありません`, node, "未定義動作");
  const t = Math.trunc(v);
  if (!Number.isSafeInteger(t))
    api.fail(`${name} の引数が安全に計算できる整数範囲外です`, node, "未確認");
  return t;
}
// size_t 引数。負値は size_t への変換で巨大な値になるため実質
// 無制限として扱う（string 班の sizeValue と同じ規則）。
function sizeValue(name, v, api, node) {
  const t = intValue(name, v, api, node);
  return t < 0 ? Number.MAX_SAFE_INTEGER : t;
}
// 変換状態引数（mbstate_t*）は NULL のみ対応する。
function needNullState(name, v, api, node, H) {
  if (H.isUnknown(v))
    api.fail(`${name} の変換状態が確定できません`, node, "未確認");
  if (v !== null)
    api.fail(
      `${name} の変換状態引数は NULL のみ対応します（mbstate_t オブジェクトはモデル未対応です）`,
      node,
      "未対応",
    );
}
// 書き込み先の char 配列。NULL の場合は呼び出し側で先に処理する。
function destChar(name, v, s, api, node, H) {
  if (typeof v === "string")
    api.fail("文字列リテラルへの書き込みは未定義動作です", node, "未定義動作");
  if (!H.isPtr(v))
    api.fail(`${name} の第1引数は char 配列へのポインタが必要です`, node, "CompileError");
  const mem = H.deref(v, s, api, node);
  if (mem.type !== "char")
    api.fail(`${name} の書き込み先は char 配列でなければなりません`, node, "CompileError");
  return { mem, offset: v.offset };
}
// char 配列の先頭バイトを読む（mblen／mbrlen 用）。文字列リテラル
// 値（JS 文字列）が直接渡された場合も先頭コードで判定する。
function firstByte(name, v, s, api, node, H) {
  if (typeof v === "string") {
    if (v.length === 0) return 0;
    return ((v.charCodeAt(0) % 256) + 256) % 256;
  }
  if (!H.isPtr(v))
    api.fail(`${name} の第1引数は文字列へのポインタが必要です`, node, "CompileError");
  const mem = H.deref(v, s, api, node);
  if (!["char", "unsigned char", "signed char"].includes(mem.type))
    api.fail(`${name} の第1引数は char 配列でなければなりません`, node, "CompileError");
  const c = mem.values[v.offset];
  if (H.isUnknown(c))
    api.fail("確定できない文字が含まれています", node, "未確認");
  if (typeof c !== "number")
    api.fail("未初期化の文字です", node, "未定義動作");
  return ((Math.trunc(c) % 256) + 256) % 256;
}
// 1 バイト書き込み系の共通核（wcrtomb／c16rtomb／c32rtomb）。
// wc が ASCII（0..127）なら宛先へ 1 バイト書いて 1 を返し、
// それ以外は -1（(size_t)-1、EILSEQ）を返す。宛先 NULL は
// 書き込まずに長さだけを返す（wcrtomb の規格どおり）。
function convertOne(name, dest, wc, s, api, node, H) {
  if (wc < 0 || wc > 127) return -1;
  if (dest === null) return 1;
  const { mem, offset } = destChar(name, dest, s, api, node, H);
  mem.values[offset] = wc;
  return 1;
}

/* ---------------- <wchar.h>: btowc / wctob ---------------- */

const handlers = {};

handlers.btowc = (args, values, s, api, node, H) => {
  need("btowc", args, 1, api, node);
  const unk = firstUnknown(values, H);
  if (unk !== undefined) return unk;
  const c = intValue("btowc", values[0], api, node);
  // "C" ロケール: EOF(-1) は WEOF(-1)、0..127 はそのまま、
  // それ以外（128..255 を含む）は WEOF(-1)。
  if (c === -1) return -1;
  return c >= 0 && c <= 127 ? c : -1;
};
handlers.wctob = (args, values, s, api, node, H) => {
  need("wctob", args, 1, api, node);
  const unk = firstUnknown(values, H);
  if (unk !== undefined) return unk;
  const c = intValue("wctob", values[0], api, node);
  // "C" ロケール: 1 バイトで表せる 0..127 はそのまま、それ以外
  // （WEOF(-1) を含む）は EOF(-1)。
  return c >= 0 && c <= 127 ? c : -1;
};

/* ---------------- <wctype.h>: 分類と変換 ---------------- */

// "C" ロケール（ASCII）の分類述語。引数が 0..127 の範囲外のときは
// 呼び出し側で一律 0 を返すため、述語は ASCII 範囲だけを見る。
const ISW_PREDICATES = {
  iswalnum: (c) =>
    (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122),
  iswalpha: (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122),
  iswblank: (c) => c === 32 || c === 9,
  iswcntrl: (c) => (c >= 0 && c <= 31) || c === 127,
  iswdigit: (c) => c >= 48 && c <= 57,
  iswgraph: (c) => c >= 33 && c <= 126,
  iswlower: (c) => c >= 97 && c <= 122,
  iswprint: (c) => c >= 32 && c <= 126,
  iswpunct: (c) =>
    (c >= 33 && c <= 47) ||
    (c >= 58 && c <= 64) ||
    (c >= 91 && c <= 96) ||
    (c >= 123 && c <= 126),
  iswspace: (c) => c === 32 || (c >= 9 && c <= 13),
  iswupper: (c) => c >= 65 && c <= 90,
  iswxdigit: (c) =>
    (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102),
};
for (const [name, pred] of Object.entries(ISW_PREDICATES)) {
  handlers[name] = (args, values, s, api, node, H) => {
    need(name, args, 1, api, node);
    const unk = firstUnknown(values, H);
    if (unk !== undefined) return unk;
    const c = intValue(name, values[0], api, node);
    if (c < 0 || c > 127) return 0;
    return pred(c) ? 1 : 0;
  };
}
handlers.towlower = (args, values, s, api, node, H) => {
  need("towlower", args, 1, api, node);
  const unk = firstUnknown(values, H);
  if (unk !== undefined) return unk;
  const c = intValue("towlower", values[0], api, node);
  return c >= 65 && c <= 90 ? c + 32 : c;
};
handlers.towupper = (args, values, s, api, node, H) => {
  need("towupper", args, 1, api, node);
  const unk = firstUnknown(values, H);
  if (unk !== undefined) return unk;
  const c = intValue("towupper", values[0], api, node);
  return c >= 97 && c <= 122 ? c - 32 : c;
};

/* ---------------- 変換系: wctomb / wcrtomb / mblen / mbrlen /
   c16rtomb / c32rtomb ---------------- */

handlers.wctomb = (args, values, s, api, node, H) => {
  need("wctomb", args, 2, api, node);
  if (H.isUnknown(values[1])) return values[1];
  if (H.isUnknown(values[0]))
    api.fail("wctomb の書き込み先が確定できません", node, "未確認");
  const wc = intValue("wctomb", values[1], api, node);
  // s が NULL のときは変換状態の問い合わせであり、"C" ロケールは
  // 状態依存でないため 0 を返す（変換自体は行わない）。
  if (values[0] === null) return 0;
  return convertOne("wctomb", values[0], wc, s, api, node, H);
};
handlers.wcrtomb = (args, values, s, api, node, H) => {
  need("wcrtomb", args, 3, api, node);
  needNullState("wcrtomb", values[2], api, node, H);
  if (H.isUnknown(values[1])) return values[1];
  if (H.isUnknown(values[0]))
    api.fail("wcrtomb の書き込み先が確定できません", node, "未確認");
  const wc = intValue("wcrtomb", values[1], api, node);
  return convertOne("wcrtomb", values[0], wc, s, api, node, H);
};
handlers.c16rtomb = (args, values, s, api, node, H) => {
  need("c16rtomb", args, 3, api, node);
  needNullState("c16rtomb", values[2], api, node, H);
  if (H.isUnknown(values[1])) return values[1];
  if (H.isUnknown(values[0]))
    api.fail("c16rtomb の書き込み先が確定できません", node, "未確認");
  const c16 = intValue("c16rtomb", values[1], api, node);
  return convertOne("c16rtomb", values[0], c16, s, api, node, H);
};
handlers.c32rtomb = (args, values, s, api, node, H) => {
  need("c32rtomb", args, 3, api, node);
  needNullState("c32rtomb", values[2], api, node, H);
  if (H.isUnknown(values[1])) return values[1];
  if (H.isUnknown(values[0]))
    api.fail("c32rtomb の書き込み先が確定できません", node, "未確認");
  const c32 = intValue("c32rtomb", values[1], api, node);
  return convertOne("c32rtomb", values[0], c32, s, api, node, H);
};
handlers.mblen = (args, values, s, api, node, H) => {
  need("mblen", args, 2, api, node);
  if (H.isUnknown(values[0]))
    api.fail("mblen の文字列が確定できません", node, "未確認");
  // s が NULL のときは変換状態の問い合わせであり、"C" ロケールは
  // 状態依存でないため 0 を返す。
  if (values[0] === null) return 0;
  const n = sizeValue("mblen", values[1], api, node);
  const b = firstByte("mblen", values[0], s, api, node, H);
  if (b === 0) return 0;
  // gcc 実測（LC_ALL=C）: 読めるバイト数が 0 のときは不完全として
  // -1、128..255 のバイトは無効文字として -1。
  if (n === 0) return -1;
  return b <= 127 ? 1 : -1;
};
handlers.mbrlen = (args, values, s, api, node, H) => {
  need("mbrlen", args, 3, api, node);
  needNullState("mbrlen", values[2], api, node, H);
  if (H.isUnknown(values[0]))
    api.fail("mbrlen の文字列が確定できません", node, "未確認");
  // s が NULL のときは内部の変換状態を使う形であり、"C" ロケール
  // では状態を持たないため 0 を返す（課題裁定）。
  if (values[0] === null) return 0;
  const n = sizeValue("mbrlen", values[1], api, node);
  // gcc 実測（LC_ALL=C）: n=0 のときは文字が完結しているか判定
  // できないため (size_t)-2（不完全）。
  if (n === 0) return -2;
  const b = firstByte("mbrlen", values[0], s, api, node, H);
  if (b === 0) return 0;
  return b <= 127 ? 1 : -1;
};

export { handlers };

// 戻り型の宣言（課題指定）: btowc／towlower／towupper／isw*／
// wctob／mblen／mbrlen は "int"、wctomb／wcrtomb／c16rtomb／
// c32rtomb は "unsigned long"（size_t 相当）。
export const returnTypes = {
  btowc: "int",
  wctob: "int",
  iswalnum: "int",
  iswalpha: "int",
  iswblank: "int",
  iswcntrl: "int",
  iswdigit: "int",
  iswgraph: "int",
  iswlower: "int",
  iswprint: "int",
  iswpunct: "int",
  iswspace: "int",
  iswupper: "int",
  iswxdigit: "int",
  towlower: "int",
  towupper: "int",
  // 統合時是正（コーディネーター）: wctomb の戻り型は cppreference
  // どおり int（wcrtomb は size_t＝unsigned long）。班は課題指定に
  // 従って実装し、この相違を報告で指摘した。
  wctomb: "int",
  wcrtomb: "unsigned long",
  c16rtomb: "unsigned long",
  c32rtomb: "unsigned long",
  mblen: "int",
  mbrlen: "int",
};
