// R7-130: 保存と取込みの上限の整合。アプリの保存（js/app.js の download）は
// BOM付きUTF-8で書き出し、コードの上限は MAX_CODE_LENGTH 文字。UTF-8では
// 1文字（UTF-16の1単位）あたり最大3バイト（BMP）＋BOM 3バイトが上限値の
// 根拠で、保存可能な最大のコードは 3 + 100000×3 = 300003 バイトになる。
// 取込みのバイト上限をこの導出値に合わせることで、アプリ自身が保存した
// 上限内のコードは必ず再取込みできることを保証する（場当たり的な緩和では
// なく、保存形式から導いた上限）。文字数上限は従来どおり別途検査する。
export const MAX_CODE_LENGTH = 100000;
export const MAX_FILE_BYTES = 3 + MAX_CODE_LENGTH * 3;
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
        encoding = "Shift_JIS";
        text = new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
      }
    }
  } catch {
    throw Error(
      "文字コードを判定できないか、バイナリファイルです。UTF-8、BOM付きUTF-16、Shift_JISを使用してください。",
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
