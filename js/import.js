// R7-130: 保存と取込みの上限の整合。アプリの保存（js/app.js の download）は
// BOM付きUTF-8で書き出し、コードの上限は MAX_CODE_LENGTH 文字。UTF-8では
// 1文字（UTF-16の1単位）あたり最大3バイト（BMP）＋BOM 3バイトが上限値の
// 根拠で、保存可能な最大のコードは 3 + 100000×3 = 300003 バイトになる。
// 取込みのバイト上限をこの導出値に合わせることで、アプリ自身が保存した
// 上限内のコードは必ず再取込みできることを保証する（場当たり的な緩和では
// なく、保存形式から導いた上限）。文字数上限は従来どおり別途検査する。
export const MAX_CODE_LENGTH = 100000;
export const MAX_FILE_BYTES = 3 + MAX_CODE_LENGTH * 3;
// CP932 と WHATWG 'shift_jis' デコーダの差異（Chromium 系ブラウザと
// Python cp932 で単独バイト全域＋2バイト組全域を照合した実測、
// docs/audit/MUSE-CP932-DRAG.md）：写像が食い違う組は無く、NEC拡張・
// IBM拡張・ユーザー定義文字（外字）も含めて一致する。ブラウザが受理
// しないのは、CP932 で私用領域に写る単独バイト 0xA0→U+F8F0、
// 0xFD→U+F8F1、0xFE→U+F8F2、0xFF→U+F8F3 の4つだけである。
// fatal デコードが失敗した場合に限り、CP932 のバイト構造で走査して
// この4バイトだけを私用領域へ写し、残りを fatal でデコードする。
const CP932_ONLY_SINGLES = { 0xa0: 0xf8f0, 0xfd: 0xf8f1, 0xfe: 0xf8f2, 0xff: 0xf8f3 };
function decodeShiftJIS(bytes) {
  try {
    return new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
  } catch {
    let out = "",
      run = [];
    const flush = () => {
      if (run.length) {
        out += new TextDecoder("shift_jis", { fatal: true }).decode(
          new Uint8Array(run),
        );
        run = [];
      }
    };
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (CP932_ONLY_SINGLES[b] !== undefined) {
        flush();
        out += String.fromCodePoint(CP932_ONLY_SINGLES[b]);
      } else if ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc)) {
        const t = bytes[i + 1];
        if (
          t === undefined ||
          !((t >= 0x40 && t <= 0x7e) || (t >= 0x80 && t <= 0xfc))
        )
          throw Error("INVALID_SHIFT_JIS");
        run.push(b, t);
        i++;
      } else if (b <= 0x7f || b === 0x80 || (b >= 0xa1 && b <= 0xdf)) {
        run.push(b);
      } else {
        throw Error("INVALID_SHIFT_JIS");
      }
    }
    flush();
    return out;
  }
}
export function decodeFile(buffer, name, extensions = [".bas", ".txt"]) {
  if (!extensions.some((ext) => name.toLowerCase().endsWith(ext.toLowerCase())))
    throw Error(extensions.join(" / ") + " ファイルを選んでください。");
  if (buffer.byteLength > MAX_FILE_BYTES)
    throw Error("ファイルは300KB以内にしてください。");
  let bytes = new Uint8Array(buffer),
    encoding = "UTF-8",
    text;
  let utf16 =
    bytes[0] === 255 && bytes[1] === 254
      ? "utf-16le"
      : bytes[0] === 254 && bytes[1] === 255
        ? "utf-16be"
        : null;
  try {
    if (utf16) {
      encoding = utf16.toUpperCase();
      text = new TextDecoder(utf16, { fatal: true }).decode(bytes);
    } else {
      if (bytes.includes(0)) throw Error("BINARY");
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch (e) {
        encoding = "CP932（Shift_JIS）";
        text = decodeShiftJIS(bytes);
      }
    }
  } catch {
    throw Error(
      "文字コードを判定できないか、バイナリファイルです。UTF-8、BOM付きUTF-16、CP932（Shift_JIS）を使用してください。",
    );
  }
  // R7-131: VT（\x0B）と FF（\x0C）は実CPython（行頭のフォームフィード）や
  // 実GCC（空白類）で正当なソースに現れるため、バイナリ判定から外す。
  // NULは上の bytes.includes(0) と併せて引き続き拒否する。
  if (/[\x00-\x08\x0E-\x1F\x7F]/.test(text))
    throw Error("バイナリファイルの可能性があるため取り込めません。");
  if (text.length > MAX_CODE_LENGTH)
    throw Error("コードは100000文字以内にしてください。");
  return {
    text: text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"),
    encoding,
  };
}
