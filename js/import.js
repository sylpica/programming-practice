export function decodeFile(buffer, name) {
  if (!/\.(bas|txt)$/i.test(name))
    throw Error(".bas または .txt ファイルを選んでください。");
  if (buffer.byteLength > 300000)
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
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text))
    throw Error("バイナリファイルの可能性があるため取り込めません。");
  if (text.length > 100000)
    throw Error("コードは100000文字以内にしてください。");
  return {
    text: text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"),
    encoding,
  };
}
