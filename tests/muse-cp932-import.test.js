// CP932（Shift_JIS）取り込みの単体テスト。
// バイト列フィクスチャは Python の cp932 コーデック（Windows CP932 と同一の
// 写像）で生成した実バイト列。ブラウザ側 TextDecoder('shift_jis') との
// 全域照合結果は docs/audit/MUSE-CP932-DRAG.md に記録した。
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFile, MAX_CODE_LENGTH } from "../js/import.js";
import { getDefinition } from "../js/types/registry.js";

const fromHex = (hex) =>
  new Uint8Array(Buffer.from(hex.replace(/\s/g, ""), "hex")).buffer;
const ascii = (s) => new TextEncoder().encode(s).buffer;

test("CP932: standard Japanese comment decodes exactly, labelled CP932", () => {
  // '# 日本語のコメントです\nprint("テスト")\n' を CP932 で保存したバイト列
  const r = decodeFile(
    fromHex("232093fa967b8cea82cc835283818393836782c582b70a7072696e74282283658358836722290a"),
    "sample.py",
    [".py"],
  );
  assert.equal(r.text, '# 日本語のコメントです\nprint("テスト")\n');
  assert.equal(r.encoding, "CP932（Shift_JIS）");
});

test("CP932: CRLF is normalised on the Shift_JIS path", () => {
  // あ(CRLF)い
  const r = decodeFile(fromHex("82a00d0a82a2"), "a.txt", [".txt"]);
  assert.equal(r.text, "あ\nい");
});

test("CP932: NEC special characters and NEC/IBM extensions decode", () => {
  // ①②㈱⑳
  assert.equal(
    decodeFile(fromHex("87408741878a87530a"), "a.txt", [".txt"]).text,
    "①②㈱⑳\n",
  );
  // ⅰ は NEC拡張のリードバイト 0xFA 形でも JIS 形でも同じ字に写る
  assert.equal(decodeFile(fromHex("fa40"), "a.txt", [".txt"]).text, "ⅰ");
  assert.equal(decodeFile(fromHex("fa5c"), "a.txt", [".txt"]).text, "纊");
});

test("CP932: user-defined characters (外字) decode to the private use area", () => {
  // 外字:<U+E000>:（コロンは半角 0x3A）
  const r = decodeFile(fromHex("8a4f8e9a3af0403a0a"), "a.txt", [".txt"]);
  assert.equal(r.text, "外字:\uE000:\n");
});

test("CP932: wave dash and dashes use the CP932 mapping", () => {
  // 〜(8160) ～(8160) ―(815C)
  const r = decodeFile(fromHex("81608160815c0a"), "a.txt", [".txt"]);
  assert.equal(r.text, "\uFF5E\uFF5E\u2015\n");
});

test("CP932: backslash byte 0x5C stays U+005C inside paths", () => {
  // パスは C:\作業\ です
  const r = decodeFile(
    fromHex("8370835882cd20433a5c8dec8bc65c2082c582b70a"),
    "a.txt",
    [".txt"],
  );
  assert.equal(r.text, "パスは C:\\作業\\ です\n");
});

test("CP932: halfwidth katakana decode", () => {
  assert.equal(
    decodeFile(fromHex("b1b2b3b6de0a"), "a.txt", [".txt"]).text,
    "ｱｲｳｶﾞ\n",
  );
});

test("CP932: browser-unmapped singles are rescued to CP932 private use code points", () => {
  // WHATWG デコーダが受理しない単独バイト 0xA0/0xFD/0xFE/0xFF を含む CP932
  assert.equal(
    decodeFile(fromHex("41a042"), "a.txt", [".txt"]).text,
    "A\uF8F0B",
  );
  assert.equal(decodeFile(fromHex("fd"), "a.txt", [".txt"]).text, "\uF8F1");
  // 0xFE 0xFF の並びは先頭だと UTF-16BE の BOM と解釈されるため、文中形で確認する
  assert.equal(
    decodeFile(fromHex("41feff42"), "a.txt", [".txt"]).text,
    "A\uF8F2\uF8F3B",
  );
  // 2バイト文字の第2バイトとしての 0xA0 は通常の文字として扱われる
  assert.equal(
    decodeFile(fromHex("82a0a0"), "a.txt", [".txt"]).text,
    "あ\uF8F0",
  );
});

test("CP932: genuinely undecodable byte sequences are still rejected", () => {
  const msg = /文字コードを判定できない/;
  assert.throws(() => decodeFile(fromHex("82"), "a.txt", [".txt"]), msg); // 末尾のリードバイト単独
  assert.throws(() => decodeFile(fromHex("8220"), "a.txt", [".txt"]), msg); // 不正な第2バイト
  assert.throws(() => decodeFile(fromHex("fc50"), "a.txt", [".txt"]), msg); // 構造は正しいが未割当の組
});

test("CP932: VT and FF stay accepted on the Shift_JIS path (R7-131)", () => {
  const r = decodeFile(fromHex("82a00c0b"), "a.txt", [".txt"]);
  assert.equal(r.text, "あ\x0C\x0B");
});

test("CP932: the 100000 character limit applies after decoding", () => {
  const one = [0x82, 0xa0]; // あ
  const ok = new Uint8Array(one.length * MAX_CODE_LENGTH);
  for (let i = 0; i < MAX_CODE_LENGTH; i++) ok.set(one, i * 2);
  assert.equal(decodeFile(ok.buffer, "a.txt", [".txt"]).text.length, MAX_CODE_LENGTH);
  const over = new Uint8Array(one.length * (MAX_CODE_LENGTH + 1));
  for (let i = 0; i <= MAX_CODE_LENGTH; i++) over.set(one, i * 2);
  assert.throws(() => decodeFile(over.buffer, "a.txt", [".txt"]), /100000文字以内/);
});

test("encodings: ASCII stays UTF-8, empty file imports as empty, UTF-8 BOM is stripped", () => {
  assert.equal(decodeFile(ascii("test"), "a.txt", [".txt"]).encoding, "UTF-8");
  assert.equal(decodeFile(new ArrayBuffer(0), "a.txt", [".txt"]).text, "");
  const bom = new TextEncoder().encode("\uFEFFあ\n");
  const r = decodeFile(bom.buffer, "a.txt", [".txt"]);
  assert.equal(r.text, "あ\n");
  assert.equal(r.encoding, "UTF-8");
});

test("extensions: reality-based additions are accepted per type", () => {
  const b = ascii("test");
  const cases = [
    ["vba", ".cls"], ["vba", ".frm"], ["vba", ".vba"],
    ["cpp", ".h"],
    ["powershell", ".psm1"],
    ["javascript", ".mjs"], ["javascript", ".cjs"],
    ["python", ".pyw"],
  ];
  for (const [id, ext] of cases) {
    const d = getDefinition(id);
    assert.equal(decodeFile(b, "sample" + ext, d.extensions).text, "test", `${id} ${ext}`);
  }
  // 保存時の既定拡張子（extensions[0]）は従来どおり
  assert.equal(getDefinition("vba").extensions[0], ".bas");
  assert.equal(getDefinition("cpp").extensions[0], ".cpp");
  assert.equal(getDefinition("powershell").extensions[0], ".ps1");
  assert.equal(getDefinition("javascript").extensions[0], ".js");
  assert.equal(getDefinition("python").extensions[0], ".py");
  // 他種別の拡張子は引き続き明示的に拒否される
  assert.throws(
    () => decodeFile(b, "sample.py", getDefinition("vba").extensions),
    /ファイルを選んでください/,
  );
});
