/* 高度モード B7 G7：hashlib / ハッシュコア。
 * アルゴリズムは公開仕様（FIPS 180-4、FIPS 202、RFC 7693、RFC 7914）どおりの
 * 純 JS 実装。検証は CPython 3.12.3 実走のテストベクタ（空・"abc"・長文・
 * 複数回 update・各種パラメータ）との照合（tests/muse-adv-b7-g7.test.js）。
 * 入力バイト列は G7 共通の内部 bytes 値（g7.bytes）で受ける。bytes リテラル
 * 由来の UNK が渡された場合は結果を確定せず ctx.unk を返す。 */
import { PyAPI } from './engine.js';
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import { NUM, BOOL, NONE, LIST, TUPLE, SET, UNK, F, I, makeBytesVal, isBytesVal, bytesArr, strToUtf8, unkRet, unsupportedFn, onlyKw, kwVal } from './impl-advanced-g7-common.js';

/* ============ 32bit 系ユーティリティ ============ */
const rotr32 = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
const rotl32 = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
function bytesToWordsBE(arr, off, count) { const w = []; for (let i = 0; i < count; i++) { const o = off + i * 4; w.push(((arr[o] << 24) | (arr[o + 1] << 16) | (arr[o + 2] << 8) | arr[o + 3]) >>> 0); } return w; }
function wordsToBytesBE(words) { const out = []; for (const w of words) out.push((w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255); return out; }
function padMdStyle(arr, littleEndianLen) {
  // MD5/SHA 系の Merkle–Damgård パディング（0x80 + 0詰め + 64bit 長）
  const bitLenLo = (arr.length * 8) >>> 0, bitLenHi = Math.floor(arr.length / 0x20000000) >>> 0;
  const out = [...arr, 0x80];
  while (out.length % 64 !== 56) out.push(0);
  if (littleEndianLen) { for (let i = 0; i < 4; i++) out.push((bitLenLo >>> (8 * i)) & 255); for (let i = 0; i < 4; i++) out.push((bitLenHi >>> (8 * i)) & 255); }
  else { for (let i = 0; i < 4; i++) out.push((bitLenHi >>> (8 * (3 - i))) & 255); for (let i = 0; i < 4; i++) out.push((bitLenLo >>> (8 * (3 - i))) & 255); }
  return out;
}

/* ============ MD5 (RFC 1321) ============ */
const MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const MD5_K = []; for (let i = 0; i < 64; i++) MD5_K.push(Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
export function md5Bytes(data) {
  const msg = padMdStyle(data, true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < msg.length; off += 64) {
    const M = []; for (let i = 0; i < 16; i++) { const o = off + i * 4; M.push((msg[o] | (msg[o + 1] << 8) | (msg[o + 2] << 16) | (msg[o + 3] << 24)) >>> 0); }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (B & C) | (~B & D); g = i; }
      else if (i < 32) { f = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { f = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = (A + f + MD5_K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl32(tmp, MD5_S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = [];
  for (const w of [a0, b0, c0, d0]) for (let i = 0; i < 4; i++) out.push((w >>> (8 * i)) & 255);
  return out;
}

/* ============ SHA-1 / SHA-224 / SHA-256 (FIPS 180-4) ============ */
export function sha1Bytes(data) {
  const msg = padMdStyle(data, false);
  let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const w = new Array(80);
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = bytesToWordsBE(msg, off, 16)[i];
    for (let i = 16; i < 80; i++) w[i] = rotl32(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl32(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl32(b, 30); b = a; a = t;
    }
    h = [(h[0] + a) >>> 0, (h[1] + b) >>> 0, (h[2] + c) >>> 0, (h[3] + d) >>> 0, (h[4] + e) >>> 0];
  }
  return wordsToBytesBE(h);
}
const SHA256_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
function sha256Core(data, H0, outWords) {
  const msg = padMdStyle(data, false);
  const h = [...H0];
  const w = new Array(64);
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) { const o = off + i * 4; w[i] = ((msg[o] << 24) | (msg[o + 1] << 16) | (msg[o + 2] << 8) | msg[o + 3]) >>> 0; }
    for (let i = 16; i < 64; i++) { const s0 = rotr32(w[i - 15], 7) ^ rotr32(w[i - 15], 18) ^ (w[i - 15] >>> 3); const s1 = rotr32(w[i - 2], 17) ^ rotr32(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    const add = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i] + add[i]) >>> 0;
  }
  return wordsToBytesBE(h.slice(0, outWords));
}
export function sha256Bytes(data) { return sha256Core(data, [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], 8); }
export function sha224Bytes(data) { return sha256Core(data, [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4], 7); }

/* ============ SHA-512 系（BigInt） ============ */
const M64 = (1n << 64n) - 1n;
const rotr64 = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & M64;
const SHA512_K = ['428a2f98d728ae22', '7137449123ef65cd', 'b5c0fbcfec4d3b2f', 'e9b5dba58189dbbc', '3956c25bf348b538', '59f111f1b605d019', '923f82a4af194f9b', 'ab1c5ed5da6d8118', 'd807aa98a3030242', '12835b0145706fbe', '243185be4ee4b28c', '550c7dc3d5ffb4e2', '72be5d74f27b896f', '80deb1fe3b1696b1', '9bdc06a725c71235', 'c19bf174cf692694', 'e49b69c19ef14ad2', 'efbe4786384f25e3', '0fc19dc68b8cd5b5', '240ca1cc77ac9c65', '2de92c6f592b0275', '4a7484aa6ea6e483', '5cb0a9dcbd41fbd4', '76f988da831153b5', '983e5152ee66dfab', 'a831c66d2db43210', 'b00327c898fb213f', 'bf597fc7beef0ee4', 'c6e00bf33da88fc2', 'd5a79147930aa725', '06ca6351e003826f', '142929670a0e6e70', '27b70a8546d22ffc', '2e1b21385c26c926', '4d2c6dfc5ac42aed', '53380d139d95b3df', '650a73548baf63de', '766a0abb3c77b2a8', '81c2c92e47edaee6', '92722c851482353b', 'a2bfe8a14cf10364', 'a81a664bbc423001', 'c24b8b70d0f89791', 'c76c51a30654be30', 'd192e819d6ef5218', 'd69906245565a910', 'f40e35855771202a', '106aa07032bbd1b8', '19a4c116b8d2d0c8', '1e376c085141ab53', '2748774cdf8eeb99', '34b0bcb5e19b48a8', '391c0cb3c5c95a63', '4ed8aa4ae3418acb', '5b9cca4f7763e373', '682e6ff3d6b2b8a3', '748f82ee5defb2fc', '78a5636f43172f60', '84c87814a1f0ab72', '8cc702081a6439ec', '90befffa23631e28', 'a4506cebde82bde9', 'bef9a3f7b2c67915', 'c67178f2e372532b', 'ca273eceea26619c', 'd186b8c721c0c207', 'eada7dd6cde0eb1e', 'f57d4f7fee6ed178', '06f067aa72176fba', '0a637dc5a2c898a6', '113f9804bef90dae', '1b710b35131c471b', '28db77f523047d84', '32caab7b40c72493', '3c9ebe0a15c9bebc', '431d67c49c100d4c', '4cc5d4becb3e42b6', '597f299cfc657e2a', '5fcb6fab3ad6faec', '6c44198c4a475817'].map((s) => BigInt('0x' + s));
function sha512Core(data, H0, outBytes) {
  const bitLen = BigInt(data.length) * 8n;
  const msg = [...data, 0x80];
  while (msg.length % 128 !== 112) msg.push(0);
  for (let i = 15; i >= 0; i--) msg.push(Number((bitLen >> BigInt(8 * i)) & 0xffn));
  const h = H0.map((x) => BigInt('0x' + x));
  const w = new Array(80);
  for (let off = 0; off < msg.length; off += 128) {
    for (let i = 0; i < 16; i++) { let v = 0n; for (let j = 0; j < 8; j++) v = (v << 8n) | BigInt(msg[off + i * 8 + j]); w[i] = v; }
    for (let i = 16; i < 80; i++) { const s0 = rotr64(w[i - 15], 1) ^ rotr64(w[i - 15], 8) ^ (w[i - 15] >> 7n); const s1 = rotr64(w[i - 2], 19) ^ rotr64(w[i - 2], 61) ^ (w[i - 2] >> 6n); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & M64; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 80; i++) {
      const S1 = rotr64(e, 14) ^ rotr64(e, 18) ^ rotr64(e, 41);
      const ch = (e & f) ^ (~e & M64 & g);
      const t1 = (hh + S1 + ch + SHA512_K[i] + w[i]) & M64;
      const S0 = rotr64(a, 28) ^ rotr64(a, 34) ^ rotr64(a, 39);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) & M64;
      hh = g; g = f; f = e; e = (d + t1) & M64; d = c; c = b; b = a; a = (t1 + t2) & M64;
    }
    const add = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i] + add[i]) & M64;
  }
  const out = [];
  for (const x of h) for (let i = 7; i >= 0; i--) out.push(Number((x >> BigInt(8 * i)) & 0xffn));
  return out.slice(0, outBytes);
}
const SHA512_H = ['6a09e667f3bcc908', 'bb67ae8584caa73b', '3c6ef372fe94f82b', 'a54ff53a5f1d36f1', '510e527fade682d1', '9b05688c2b3e6c1f', '1f83d9abfb41bd6b', '5be0cd19137e2179'];
const SHA384_H = ['cbbb9d5dc1059ed8', '629a292a367cd507', '9159015a3070dd17', '152fecd8f70e5939', '67332667ffc00b31', '8eb44a8768581511', 'db0c2e0d64f98fa7', '47b5481dbefa4fa4'];
const SHA512_224_H = ['8c3d37c819544da2', '73e1996689dcd4d6', '1dfab7ae32ff9c82', '679dd514582f9fcf', '0f6d2b697bd44da8', '77e36f7304c48942', '3f9d85a86a1d36c8', '1112e6ad91d692a1'];
const SHA512_256_H = ['22312194fc2bf72c', '9f555fa3c84c64c2', '2393b86b6f53b151', '963877195940eabd', '96283ee2a88effe3', 'be5e1e2553863992', '2b0199fc2c85b8aa', '0eb72ddc81c52ca2'];
export function sha512Bytes(data) { return sha512Core(data, SHA512_H, 64); }
export function sha384Bytes(data) { return sha512Core(data, SHA384_H, 48); }
export function sha512_224Bytes(data) { return sha512Core(data, SHA512_224_H, 28); }
export function sha512_256Bytes(data) { return sha512Core(data, SHA512_256_H, 32); }

/* ============ SHA-3 / SHAKE（Keccak-f[1600]、BigInt レーン） ============ */
const KECCAK_RC = ['0000000000000001', '0000000000008082', '800000000000808a', '8000000080008000', '000000000000808b', '0000000080000001', '8000000080008081', '8000000000008009', '000000000000008a', '0000000000000088', '0000000080008009', '000000008000000a', '000000008000808b', '800000000000008b', '8000000000008089', '8000000000008003', '8000000000008002', '8000000000000080', '000000000000800a', '800000008000000a', '8000000080008081', '8000000000008080', '0000000080000001', '8000000080008008'].map((s) => BigInt('0x' + s));
const KECCAK_RHO = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61], [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]];
const rotl64 = (x, n) => n === 0 ? x : ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M64;
function keccakF(state) {
  for (let round = 0; round < 24; round++) {
    const C = [], D = [];
    for (let x = 0; x < 5; x++) C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) state[x + 5 * y] ^= D[x];
    const B = new Array(25).fill(0n);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(state[x + 5 * y], KECCAK_RHO[x][y]);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) state[x + 5 * y] = B[x + 5 * y] ^ (~B[(x + 1) % 5 + 5 * y] & B[(x + 2) % 5 + 5 * y]);
    state[0] ^= KECCAK_RC[round];
  }
}
function keccak(data, rate, suffix, outLen) {
  const state = new Array(25).fill(0n);
  const padded = [...data];
  const q = rate - (padded.length % rate);
  if (q === 1) padded.push(suffix | 0x80);
  else { padded.push(suffix); while (padded.length % rate !== rate - 1) padded.push(0); padded.push(0x80); }
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) { let lane = 0n; for (let j = 7; j >= 0; j--) lane = (lane << 8n) | BigInt(padded[off + i * 8 + j]); state[i] ^= lane; }
    keccakF(state);
  }
  const out = [];
  while (out.length < outLen) {
    for (let i = 0; i < rate / 8 && out.length < outLen; i++) { let lane = state[i]; for (let j = 0; j < 8 && out.length < outLen; j++) { out.push(Number(lane & 0xffn)); lane >>= 8n; } }
    if (out.length < outLen) keccakF(state);
  }
  return out;
}
export function sha3Bytes(data, bits) { const rate = 200 - 2 * (bits / 8); return keccak(data, rate, 0x06, bits / 8); }
export function shakeBytes(data, bits, outLen) { const rate = bits === 128 ? 168 : 136; return keccak(data, rate, 0x1f, outLen); }

/* ============ BLAKE2 (RFC 7693) ============ */
const BLAKE_IV = SHA512_H.map((s) => BigInt('0x' + s));
const BLAKE_SIGMA = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3], [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4], [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8], [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13], [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9], [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11], [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10], [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5], [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]];
const rotr64b = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & M64;
export function blake2bBytes(data, outLen = 64, key = [], salt = null, person = null) {
  const h = [...BLAKE_IV];
  const param = new Array(64).fill(0);
  param[0] = outLen; param[1] = key.length; param[2] = 1; param[3] = 1;
  if (salt) for (let i = 0; i < 16; i++) param[32 + i] = salt[i] || 0;
  if (person) for (let i = 0; i < 16; i++) param[48 + i] = person[i] || 0;
  for (let i = 0; i < 8; i++) { let w = 0n; for (let j = 7; j >= 0; j--) w = (w << 8n) | BigInt(param[i * 8 + j]); h[i] ^= w; }
  const input = key.length ? [...key, ...new Array(128 - key.length).fill(0), ...data] : [...data];
  const blocks = Math.max(1, Math.ceil(input.length / 128));
  for (let b = 0; b < blocks; b++) {
    const block = new Array(128).fill(0);
    const slice = input.slice(b * 128, (b + 1) * 128);
    block.splice(0, slice.length, ...slice);
    const m = []; for (let i = 0; i < 16; i++) { let w = 0n; for (let j = 7; j >= 0; j--) w = (w << 8n) | BigInt(block[i * 8 + j]); m.push(w); }
    const v = [...h, ...BLAKE_IV];
    const count = b === blocks - 1 ? input.length : (b + 1) * 128;
    v[12] ^= BigInt(count & 0xffffffff); v[13] ^= BigInt(Math.floor(count / 4294967296));
    if (b === blocks - 1) v[14] ^= M64;
    const G = (a2, b2, c2, d2, x, y) => { v[a2] = (v[a2] + v[b2] + x) & M64; v[d2] = rotr64b(v[d2] ^ v[a2], 32); v[c2] = (v[c2] + v[d2]) & M64; v[b2] = rotr64b(v[b2] ^ v[c2], 24); v[a2] = (v[a2] + v[b2] + y) & M64; v[d2] = rotr64b(v[d2] ^ v[a2], 16); v[c2] = (v[c2] + v[d2]) & M64; v[b2] = rotr64b(v[b2] ^ v[c2], 63); };
    for (let r = 0; r < 12; r++) { const s = BLAKE_SIGMA[r % 10]; G(0, 4, 8, 12, m[s[0]], m[s[1]]); G(1, 5, 9, 13, m[s[2]], m[s[3]]); G(2, 6, 10, 14, m[s[4]], m[s[5]]); G(3, 7, 11, 15, m[s[6]], m[s[7]]); G(0, 5, 10, 15, m[s[8]], m[s[9]]); G(1, 6, 11, 12, m[s[10]], m[s[11]]); G(2, 7, 8, 13, m[s[12]], m[s[13]]); G(3, 4, 9, 14, m[s[14]], m[s[15]]); }
    for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
  }
  const out = [];
  for (const x of h) for (let i = 0; i < 8; i++) out.push(Number((x >> BigInt(8 * i)) & 0xffn));
  return out.slice(0, outLen);
}
const B2S_IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
export function blake2sBytes(data, outLen = 32, key = [], salt = null, person = null) {
  const h = [...B2S_IV];
  const param = new Array(32).fill(0);
  param[0] = outLen; param[1] = key.length; param[2] = 1; param[3] = 1;
  if (salt) for (let i = 0; i < 8; i++) param[16 + i] = salt[i] || 0;
  if (person) for (let i = 0; i < 8; i++) param[24 + i] = person[i] || 0;
  for (let i = 0; i < 8; i++) { let w = 0; for (let j = 3; j >= 0; j--) w = ((w << 8) | param[i * 4 + j]) >>> 0; h[i] = (h[i] ^ w) >>> 0; }
  const input = key.length ? [...key, ...new Array(64 - key.length).fill(0), ...data] : [...data];
  const blocks = Math.max(1, Math.ceil(input.length / 64));
  for (let b = 0; b < blocks; b++) {
    const block = new Array(64).fill(0);
    const slice = input.slice(b * 64, (b + 1) * 64);
    block.splice(0, slice.length, ...slice);
    const m = []; for (let i = 0; i < 16; i++) { let w = 0; for (let j = 3; j >= 0; j--) w = ((w << 8) | block[i * 4 + j]) >>> 0; m.push(w); }
    const v = [...h, ...B2S_IV];
    const count = b === blocks - 1 ? input.length : (b + 1) * 64;
    v[12] = (v[12] ^ (count >>> 0)) >>> 0; v[13] = (v[13] ^ Math.floor(count / 4294967296)) >>> 0;
    if (b === blocks - 1) v[14] = (v[14] ^ 0xffffffff) >>> 0;
    const G = (a2, b2, c2, d2, x, y) => { v[a2] = (v[a2] + v[b2] + x) >>> 0; v[d2] = rotr32(v[d2] ^ v[a2], 16); v[c2] = (v[c2] + v[d2]) >>> 0; v[b2] = rotr32(v[b2] ^ v[c2], 12); v[a2] = (v[a2] + v[b2] + y) >>> 0; v[d2] = rotr32(v[d2] ^ v[a2], 8); v[c2] = (v[c2] + v[d2]) >>> 0; v[b2] = rotr32(v[b2] ^ v[c2], 7); };
    for (let r = 0; r < 10; r++) { const s = BLAKE_SIGMA[r]; G(0, 4, 8, 12, m[s[0]], m[s[1]]); G(1, 5, 9, 13, m[s[2]], m[s[3]]); G(2, 6, 10, 14, m[s[4]], m[s[5]]); G(3, 7, 11, 15, m[s[6]], m[s[7]]); G(0, 5, 10, 15, m[s[8]], m[s[9]]); G(1, 6, 11, 12, m[s[10]], m[s[11]]); G(2, 7, 8, 13, m[s[12]], m[s[13]]); G(3, 4, 9, 14, m[s[14]], m[s[15]]); }
    for (let i = 0; i < 8; i++) h[i] = (h[i] ^ v[i] ^ v[i + 8]) >>> 0;
  }
  const out = [];
  for (const x of h) for (let i = 0; i < 4; i++) out.push((x >>> (8 * i)) & 255);
  return out.slice(0, outLen);
}

/* ============ ハッシュオブジェクト ============ */
export const HASH_INFO = {
  md5: { digestSize: 16, blockSize: 64, fn: (d) => md5Bytes(d) },
  sha1: { digestSize: 20, blockSize: 64, fn: (d) => sha1Bytes(d) },
  sha224: { digestSize: 28, blockSize: 64, fn: (d) => sha224Bytes(d) },
  sha256: { digestSize: 32, blockSize: 64, fn: (d) => sha256Bytes(d) },
  sha384: { digestSize: 48, blockSize: 128, fn: (d) => sha384Bytes(d) },
  sha512: { digestSize: 64, blockSize: 128, fn: (d) => sha512Bytes(d) },
  sha512_224: { digestSize: 28, blockSize: 128, fn: (d) => sha512_224Bytes(d) },
  sha512_256: { digestSize: 32, blockSize: 128, fn: (d) => sha512_256Bytes(d) },
  sha3_224: { digestSize: 28, blockSize: 144, fn: (d) => sha3Bytes(d, 224) },
  sha3_256: { digestSize: 32, blockSize: 136, fn: (d) => sha3Bytes(d, 256) },
  sha3_384: { digestSize: 48, blockSize: 104, fn: (d) => sha3Bytes(d, 384) },
  sha3_512: { digestSize: 64, blockSize: 72, fn: (d) => sha3Bytes(d, 512) },
  shake_128: { digestSize: 0, blockSize: 168, shake: 128 },
  shake_256: { digestSize: 0, blockSize: 136, shake: 256 },
  blake2b: { digestSize: 64, blockSize: 128, blake: 'b' },
  blake2s: { digestSize: 32, blockSize: 64, blake: 's' },
  'md5-sha1': { digestSize: 36, blockSize: 64, fn: (d) => [...md5Bytes(d), ...sha1Bytes(d)] },
};
export function hashDigestArr(name, data, opt = {}) {
  const info = HASH_INFO[name];
  if (!info) return null;
  if (info.fn) return info.fn(data);
  if (info.shake) return shakeBytes(data, info.shake, opt.length !== undefined ? opt.length : 0);
  if (info.blake === 'b') return blake2bBytes(data, opt.digestSize || 64, opt.key || [], opt.salt || null, opt.person || null);
  if (info.blake === 's') return blake2sBytes(data, opt.digestSize || 32, opt.key || [], opt.salt || null, opt.person || null);
  return null;
}
export function hexOf(arr) { return arr.map((b) => b.toString(16).padStart(2, '0')).join(''); }

const hashObjDef = (displayName) => ({
  typeName: displayName,
  methods: {
    update: (ctx, self, args) => {
      if (args.length !== 1) ctx.err('TypeError', 'update() takes exactly one argument (' + args.length + ' given)', '');
      const a = bytesArr(args[0]);
      if (a === null) { if (ctx.isUnk(args[0])) return NONE; ctx.err('TypeError', 'object supporting the buffer API required', ''); }
      self.data.buf.push(...a);
      return NONE;
    },
    digest: (ctx, self, args) => {
      const info = HASH_INFO[self.data.algo];
      if (info.shake) {
        if (args.length !== 1) ctx.err('TypeError', 'digest() requires the output length for shake algorithms', '');
        const n = ctx.int(args[0]); if (n === null) { return ctx.unk('shake digest'); }
        return makeBytesVal(shakeBytes(self.data.buf, info.shake, n));
      }
      if (args.length) ctx.err('TypeError', 'digest() takes no arguments for this algorithm', '');
      return makeBytesVal(hashDigestArr(self.data.algo, self.data.buf, self.data.opt));
    },
    hexdigest: (ctx, self, args) => {
      const info = HASH_INFO[self.data.algo];
      if (info.shake) {
        if (args.length !== 1) ctx.err('TypeError', 'hexdigest() requires the output length for shake algorithms', '');
        const n = ctx.int(args[0]); if (n === null) return ctx.unk('shake hexdigest');
        return hexOf(shakeBytes(self.data.buf, info.shake, n));
      }
      if (args.length) ctx.err('TypeError', 'hexdigest() takes no arguments for this algorithm', '');
      return hexOf(hashDigestArr(self.data.algo, self.data.buf, self.data.opt));
    },
    copy: (ctx, self) => ctx.native(self.__native || self.data.qual, { algo: self.data.algo, buf: [...self.data.buf], opt: self.data.opt, qual: self.data.qual }),
  },
  attrs: {
    name: (ctx, self) => self.data.algo,
    digest_size: (ctx, self) => I(self.data.opt && self.data.opt.digestSize ? self.data.opt.digestSize : HASH_INFO[self.data.algo].digestSize),
    block_size: (ctx, self) => I(HASH_INFO[self.data.algo].blockSize),
  },
});
const HASH_QUALS = {};
for (const name of Object.keys(HASH_INFO)) {
  const qual = 'hashlib.obj.' + name;
  HASH_QUALS[name] = qual;
  registerStdlibClass(qual, hashObjDef(name === 'md5-sha1' ? 'md5-sha1' : name));
}
export function makeHashObj(ctx, algo, initial, opt = {}) {
  const buf = initial ? [...initial] : [];
  return ctx.native(HASH_QUALS[algo], { algo, buf, opt, qual: HASH_QUALS[algo] });
}
export function isHashObj(v) { return !!v && typeof v.__native === 'string' && v.__native.startsWith('hashlib.obj.'); }
export function hashObjDigest(ctx, v) { return hashDigestArr(v.data.algo, v.data.buf, v.data.opt); }

/* HMAC（RFC 2104）コア：hmac モジュールと pbkdf2/scrypt から使う */
export function hmacBytes(algo, key, msg) {
  const info = HASH_INFO[algo];
  if (!info || info.shake || info.blake) return null;
  const bs = info.blockSize;
  let k = [...key];
  if (k.length > bs) k = info.fn(k);
  while (k.length < bs) k.push(0);
  const ipad = k.map((b) => b ^ 0x36), opad = k.map((b) => b ^ 0x5c);
  return info.fn([...opad, ...info.fn([...ipad, ...msg])]);
}
export function pbkdf2Bytes(algo, password, salt, iterations, dklen) {
  const info = HASH_INFO[algo];
  const hlen = info.digestSize;
  const out = [];
  for (let block = 1; out.length < dklen; block++) {
    let u = hmacBytes(algo, password, [...salt, (block >>> 24) & 255, (block >>> 16) & 255, (block >>> 8) & 255, block & 255]);
    const t = [...u];
    for (let i = 1; i < iterations; i++) { u = hmacBytes(algo, password, u); for (let j = 0; j < hlen; j++) t[j] ^= u[j]; }
    out.push(...t);
  }
  return out.slice(0, dklen);
}

/* scrypt (RFC 7914) */
function salsa208(B) {
  const x = [...B];
  const R = (a, b) => rotl32(a, b);
  for (let r = 0; r < 8; r += 2) {
    x[4] ^= R(x[0] + x[12], 7); x[8] ^= R(x[4] + x[0], 9); x[12] ^= R(x[8] + x[4], 13); x[0] ^= R(x[12] + x[8], 18);
    x[9] ^= R(x[5] + x[1], 7); x[13] ^= R(x[9] + x[5], 9); x[1] ^= R(x[13] + x[9], 13); x[5] ^= R(x[1] + x[13], 18);
    x[14] ^= R(x[10] + x[6], 7); x[2] ^= R(x[14] + x[10], 9); x[6] ^= R(x[2] + x[14], 13); x[10] ^= R(x[6] + x[2], 18);
    x[3] ^= R(x[15] + x[11], 7); x[7] ^= R(x[3] + x[15], 9); x[11] ^= R(x[7] + x[3], 13); x[15] ^= R(x[11] + x[7], 18);
    x[1] ^= R(x[0] + x[3], 7); x[2] ^= R(x[1] + x[0], 9); x[3] ^= R(x[2] + x[1], 13); x[0] ^= R(x[3] + x[2], 18);
    x[6] ^= R(x[5] + x[4], 7); x[7] ^= R(x[6] + x[5], 9); x[4] ^= R(x[7] + x[6], 13); x[5] ^= R(x[4] + x[7], 18);
    x[11] ^= R(x[10] + x[9], 7); x[8] ^= R(x[11] + x[10], 9); x[9] ^= R(x[8] + x[11], 13); x[10] ^= R(x[9] + x[8], 18);
    x[12] ^= R(x[15] + x[14], 7); x[13] ^= R(x[12] + x[15], 9); x[14] ^= R(x[13] + x[12], 13); x[15] ^= R(x[14] + x[13], 18);
  }
  return x.map((v, i) => (v + B[i]) >>> 0);
}
function blockMix(B, r) {
  let X = B.slice(16 * (2 * r - 1), 16 * 2 * r);
  const Y = new Array(32 * r);
  for (let i = 0; i < 2 * r; i++) {
    const bi = B.slice(16 * i, 16 * i + 16);
    const t = X.map((v, j) => v ^ bi[j]);
    X = salsa208(t);
    for (let j = 0; j < 16; j++) Y[16 * i + j] = X[j];
  }
  const out = new Array(32 * r);
  for (let i = 0; i < r; i++) { for (let j = 0; j < 16; j++) { out[16 * i + j] = Y[32 * i + j]; out[16 * (i + r) + j] = Y[32 * i + 16 + j]; } }
  return out;
}
function roMix(B, N, r) {
  let X = [...B];
  const V = [];
  for (let i = 0; i < N; i++) { V.push(X); X = blockMix(X, r); }
  for (let i = 0; i < N; i++) {
    const j = X[16 * (2 * r - 1)] % N;
    const t = X.map((v, k) => v ^ V[j][k]);
    X = blockMix(t, r);
  }
  return X;
}
export function scryptBytes(password, salt, n, r, p, dklen) {
  const B = pbkdf2Bytes('sha256', password, salt, 1, p * 128 * r);
  const words = [];
  for (let i = 0; i < B.length; i += 4) words.push((B[i] | (B[i + 1] << 8) | (B[i + 2] << 16) | (B[i + 3] << 24)) >>> 0);
  for (let i = 0; i < p; i++) {
    const mixed = roMix(words.slice(i * 32 * r, (i + 1) * 32 * r), n, r);
    words.splice(i * 32 * r, 32 * r, ...mixed);
  }
  const Bout = [];
  for (const w of words) for (let i = 0; i < 4; i++) Bout.push((w >>> (8 * i)) & 255);
  return pbkdf2Bytes('sha256', password, Bout, 1, dklen);
}

/* ============ hashlib モジュール ============ */
function dataArg(ctx, args, kwargs, fname) {
  let v = null;
  if (args.length > 1) ctx.err('TypeError', fname + '() takes at most 1 argument', '');
  if (args.length === 1) v = args[0];
  if ('data' in kwargs) { if (v !== null) ctx.err('TypeError', fname + "() got multiple values for argument 'data'", ''); v = kwargs.data; }
  if ('string' in kwargs) { if (v !== null) ctx.err('TypeError', fname + "() got multiple values for argument 'data'", ''); v = kwargs.string; }
  if (v === null) return [];
  const a = bytesArr(v);
  if (a !== null) return a;
  if (ctx.isUnk(v)) return null;
  if (isHashObj(v)) return null;
  ctx.err('TypeError', 'object supporting the buffer API required', '');
  return [];
}
function ctorFor(algo) {
  return (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, ['data', 'string', 'usedforsecurity'], 'hashlib.' + algo);
    const d = dataArg(ctx, args, kwargs, 'hashlib.' + algo);
    if (d === null) return unkRet(ctx, 'hashlib.' + algo + ' の初期データ');
    return makeHashObj(ctx, algo, d);
  };
}
function blakeCtor(kind) {
  const algo = kind === 'b' ? 'blake2b' : 'blake2s';
  const maxDigest = kind === 'b' ? 64 : 32, maxKey = kind === 'b' ? 64 : 32, saltLen = kind === 'b' ? 16 : 8, personLen = kind === 'b' ? 16 : 8;
  return (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, ['data', 'string', 'digest_size', 'key', 'salt', 'person', 'fanout', 'depth', 'leaf_size', 'node_offset', 'node_depth', 'inner_size', 'last_node', 'usedforsecurity'], 'hashlib.' + algo);
    const d = dataArg(ctx, args, kwargs, 'hashlib.' + algo);
    if (d === null) return unkRet(ctx, 'hashlib.' + algo + ' の初期データ');
    const opt = {};
    if ('digest_size' in kwargs) { const n = ctx.int(kwargs.digest_size); if (n === null) return unkRet(ctx, 'digest_size'); if (n < 1 || n > maxDigest) ctx.err('ValueError', 'digest_size must be between 1 and ' + maxDigest, ''); opt.digestSize = n; }
    for (const [kname, maxl, label] of [['key', maxKey, 'key'], ['salt', saltLen, 'salt'], ['person', personLen, 'person']]) {
      if (kname in kwargs) { const a = bytesArr(kwargs[kname]); if (a === null) { if (ctx.isUnk(kwargs[kname])) return unkRet(ctx, kname); ctx.err('TypeError', 'object supporting the buffer API required', ''); } if (a.length > maxl) ctx.err('ValueError', label + ' is too long', ''); opt[kname] = a; }
    }
    if (('fanout' in kwargs && ctx.int(kwargs.fanout) !== 1) || ('depth' in kwargs && ctx.int(kwargs.depth) !== 1)) { ctx.diag('hashlib.' + algo + ': fanout/depth 以外のツリーパラメータは本実装では未検証です'); return ctx.unk('blake2 ツリー結果'); }
    return makeHashObj(ctx, algo, d, opt);
  };
}

const GUARANTEED = ['blake2b', 'blake2s', 'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha3_224', 'sha3_256', 'sha3_384', 'sha3_512', 'sha512', 'shake_128', 'shake_256'];
const AVAILABLE = ['blake2b', 'blake2s', 'md5', 'md5-sha1', 'ripemd160', 'sha1', 'sha224', 'sha256', 'sha384', 'sha3_224', 'sha3_256', 'sha3_384', 'sha3_512', 'sha512', 'sha512_224', 'sha512_256', 'shake_128', 'shake_256', 'sm3'];

const functions = {
  md5: ctorFor('md5'), sha1: ctorFor('sha1'), sha224: ctorFor('sha224'), sha256: ctorFor('sha256'),
  sha384: ctorFor('sha384'), sha512: ctorFor('sha512'),
  sha3_224: ctorFor('sha3_224'), sha3_256: ctorFor('sha3_256'), sha3_384: ctorFor('sha3_384'), sha3_512: ctorFor('sha3_512'),
  shake_128: ctorFor('shake_128'), shake_256: ctorFor('shake_256'),
  blake2b: blakeCtor('b'), blake2s: blakeCtor('s'),
  new: (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, ['data', 'string', 'usedforsecurity'], 'hashlib.new');
    if (args.length < 1) ctx.err('TypeError', 'new() missing required argument: name', '');
    const nameV = args[0];
    if (typeof nameV !== 'string') { if (ctx.isUnk(nameV)) return unkRet(ctx, 'hashlib.new の名前'); ctx.err('TypeError', 'name must be a string', ''); }
    const norm = nameV.toLowerCase().replace(/-/g, '_').replace(/^sha3_/ , 'sha3_');
    const alias = { sha3_224: 'sha3_224', 'sha_256': 'sha256', sha_224: 'sha224', sha_384: 'sha384', sha_512: 'sha512', sha_1: 'sha1' }[norm] || norm;
    const rest = args.slice(1);
    if (alias === 'blake2b') return functions.blake2b(ctx, rest, kwargs);
    if (alias === 'blake2s') return functions.blake2s(ctx, rest, kwargs);
    if (HASH_INFO[alias]) return ctorFor(alias)(ctx, rest, kwargs);
    if (['ripemd160', 'sm3'].includes(alias)) { ctx.diag('hashlib.new: ' + alias + ' は OpenSSL 依存アルゴリズムのため本アプリでは未検証です'); return ctx.unk('hashlib.new の結果（未検証）'); }
    ctx.err('ValueError', 'unsupported hash type ' + nameV, '');
    return UNK('');
  },
  pbkdf2_hmac: (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, ['dklen'], 'hashlib.pbkdf2_hmac');
    if (args.length !== 4 && args.length !== 5) ctx.err('TypeError', 'pbkdf2_hmac() takes 4 or 5 positional arguments', '');
    const hashName = args[0];
    if (typeof hashName !== 'string') ctx.err('TypeError', 'hash_name must be a string', '');
    const algo = hashName.toLowerCase();
    if (!HASH_INFO[algo] || HASH_INFO[algo].shake || HASH_INFO[algo].blake) ctx.err('ValueError', 'unsupported hash type', '');
    const pw = bytesArr(args[1]), salt = bytesArr(args[2]);
    if (pw === null || salt === null) { if (ctx.isUnk(args[1]) || ctx.isUnk(args[2])) return unkRet(ctx, 'pbkdf2_hmac の入力'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
    const iters = ctx.int(args[3]);
    if (iters === null) return unkRet(ctx, 'iterations');
    if (iters < 1) ctx.err('ValueError', 'iteration value must be greater than 0.', '');
    let dklen = args.length === 5 ? args[4] : kwVal(kwargs, 'dklen', NONE);
    let dk = null;
    if (dklen !== undefined && dklen !== null && !ctx.isNone(dklen)) { dk = ctx.int(dklen); if (dk === null) return unkRet(ctx, 'dklen'); }
    if (dk === null) dk = HASH_INFO[algo].digestSize;
    return makeBytesVal(pbkdf2Bytes(algo, pw, salt, iters, dk));
  },
  scrypt: (ctx, args, kwargs) => {
    onlyKw(ctx, kwargs, ['salt', 'n', 'r', 'p', 'maxmem', 'dklen'], 'hashlib.scrypt');
    if (args.length !== 1) ctx.err('TypeError', 'scrypt() takes exactly one positional argument', '');
    const pw = bytesArr(args[0]);
    if (pw === null) { if (ctx.isUnk(args[0])) return unkRet(ctx, 'scrypt のパスワード'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
    if (!('salt' in kwargs)) ctx.err('TypeError', "scrypt() missing required keyword argument: 'salt'", '');
    const salt = bytesArr(kwargs.salt);
    if (salt === null) { if (ctx.isUnk(kwargs.salt)) return unkRet(ctx, 'scrypt の salt'); ctx.err('TypeError', 'object supporting the buffer API required', ''); }
    const n = 'n' in kwargs ? ctx.int(kwargs.n) : 16384;
    const r = 'r' in kwargs ? ctx.int(kwargs.r) : 8;
    const p = 'p' in kwargs ? ctx.int(kwargs.p) : 1;
    const dklen = 'dklen' in kwargs && !ctx.isNone(kwargs.dklen) ? ctx.int(kwargs.dklen) : 64;
    if (n === null || r === null || p === null || dklen === null) return unkRet(ctx, 'scrypt のパラメータ');
    if (n <= 1 || (n & (n - 1)) !== 0) ctx.err('ValueError', 'n must be a power of 2 greater than 1', '');
    if (r < 1 || p < 1) ctx.err('ValueError', 'r and p must be positive', '');
    const maxmem = 'maxmem' in kwargs ? ctx.int(kwargs.maxmem) : 0;
    const need = 128 * n * r * p;
    const limit = maxmem && maxmem > 0 ? maxmem : 33554432;
    if (need > limit) ctx.err('ValueError', '[digital envelope routines] memory limit exceeded', '');
    if (n > 1048576) { ctx.diag('hashlib.scrypt: 大きな n の計算は本アプリでは未検証です'); return ctx.unk('scrypt の結果'); }
    return makeBytesVal(scryptBytes(pw, salt, n, r, p, dklen));
  },
  file_digest: unsupportedFn('hashlib.file_digest', 'ファイルオブジェクトを前提とするため'),
};

registerStdlibModule('hashlib', {
  data: {
    algorithms_guaranteed: SET(GUARANTEED),
    algorithms_available: SET(AVAILABLE),
  },
  functions,
  classes: {},
});
/* blake2 の定数属性（関数オブジェクトの属性として公開されるもの。
 * エンジンでは関数値に属性を持たせられないため、モジュールの data として
 * 「hashlib.blake2b.MAX_DIGEST_SIZE」のような限定名では公開できない。
 * ここではモジュール属性としての代替は置かず、リファレンス側で
 * 束ね値として説明する（報告書に基盤要請として記録）。 */
export const BLAKE_CONSTS = {
  blake2b: { MAX_DIGEST_SIZE: 64, MAX_KEY_SIZE: 64, SALT_SIZE: 16, PERSON_SIZE: 16 },
  blake2s: { MAX_DIGEST_SIZE: 32, MAX_KEY_SIZE: 32, SALT_SIZE: 8, PERSON_SIZE: 8 },
};
