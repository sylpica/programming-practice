// 高度モード（ブロックB6）: <string.h> と <ctype.h> の意味論
// ハンドラ。担当班が実装する。handlers は名前→関数
// (args, values, s, api, node, H) => 値 | LIBRARY_UNHANDLED。
//
// 実装方針（裁定メモ準拠）:
// - 文字列の読み取りは H.cString（ポインタ→文字列）。書き込みは
//   H.deref でメモリオブジェクトを得て values を直接書き換える。
//   配列の範囲を超える書き込みは「未定義動作」で停止する。
// - ポインタを返す関数は {kind:"pointer", object, offset} を返し、
//   見つからなければ null を返す。
// - strcmp/strncmp/memcmp の戻り値は glibc 方式＝最初に異なる
//   バイト同士の符号なし差（gcc 13.3.0 実走で裏付け）。
// - memcpy/memmove は同一要素型オブジェクト間で、n バイトを
//   n/要素幅 個の要素コピーとして実装する。割り切れない n や
//   型の異なるオブジェクト間は「未対応」として停止する。
// - memset は char 型は直接、それ以外はバイト値 0 のみ対応。
//   memchr/memcmp は char／unsigned char オブジェクトに限る。

const ERRNO_MESSAGES = {
  0: "Success",
  1: "Operation not permitted",
  2: "No such file or directory",
  3: "No such process",
  4: "Interrupted system call",
  5: "Input/output error",
  6: "No such device or address",
  7: "Argument list too long",
  8: "Exec format error",
  9: "Bad file descriptor",
  10: "No child processes",
  11: "Resource temporarily unavailable",
  12: "Cannot allocate memory",
  13: "Permission denied",
  14: "Bad address",
  15: "Block device required",
  16: "Device or resource busy",
  17: "File exists",
  18: "Invalid cross-device link",
  19: "No such device",
  20: "Not a directory",
  21: "Is a directory",
  22: "Invalid argument",
  23: "Too many open files in system",
  24: "Too many open files",
  25: "Inappropriate ioctl for device",
  26: "Text file busy",
  27: "File too large",
  28: "No space left on device",
  29: "Illegal seek",
  30: "Read-only file system",
  31: "Too many links",
  32: "Broken pipe",
  33: "Numerical argument out of domain",
  34: "Numerical result out of range",
  35: "Resource deadlock avoided",
  36: "File name too long",
  37: "No locks available",
  38: "Function not implemented",
  39: "Directory not empty",
  40: "Too many levels of symbolic links",
  42: "No message of desired type",
  43: "Identifier removed",
  44: "Channel number out of range",
  45: "Level 2 not synchronized",
  46: "Level 3 halted",
  47: "Level 3 reset",
  48: "Link number out of range",
  49: "Protocol driver not attached",
  50: "No CSI structure available",
  51: "Level 2 halted",
  52: "Invalid exchange",
  53: "Invalid request descriptor",
  54: "Exchange full",
  55: "No anode",
  56: "Invalid request code",
  57: "Invalid slot",
  59: "Bad font file format",
  60: "Device not a stream",
  61: "No data available",
  62: "Timer expired",
  63: "Out of streams resources",
  64: "Machine is not on the network",
  65: "Package not installed",
  66: "Object is remote",
  67: "Link has been severed",
  68: "Advertise error",
  69: "Srmount error",
  70: "Communication error on send",
  71: "Protocol error",
  72: "Multihop attempted",
  73: "RFS specific error",
  74: "Bad message",
  75: "Value too large for defined data type",
  76: "Name not unique on network",
  77: "File descriptor in bad state",
  78: "Remote address changed",
  79: "Can not access a needed shared library",
  80: "Accessing a corrupted shared library",
  81: ".lib section in a.out corrupted",
  82: "Attempting to link in too many shared libraries",
  83: "Cannot exec a shared library directly",
  84: "Invalid or incomplete multibyte or wide character",
  85: "Interrupted system call should be restarted",
  86: "Streams pipe error",
  87: "Too many users",
  88: "Socket operation on non-socket",
  89: "Destination address required",
  90: "Message too long",
  91: "Protocol wrong type for socket",
  92: "Protocol not available",
  93: "Protocol not supported",
  94: "Socket type not supported",
  95: "Operation not supported",
  96: "Protocol family not supported",
  97: "Address family not supported by protocol",
  98: "Address already in use",
  99: "Cannot assign requested address",
  100: "Network is down",
  101: "Network is unreachable",
  102: "Network dropped connection on reset",
  103: "Software caused connection abort",
  104: "Connection reset by peer",
  105: "No buffer space available",
  106: "Transport endpoint is already connected",
  107: "Transport endpoint is not connected",
  108: "Cannot send after transport endpoint shutdown",
  109: "Too many references: cannot splice",
  110: "Connection timed out",
  111: "Connection refused",
  112: "Host is down",
  113: "No route to host",
  114: "Operation already in progress",
  115: "Operation now in progress",
  116: "Stale file handle",
  117: "Structure needs cleaning",
  118: "Not a XENIX named type file",
  119: "No XENIX semaphores available",
  120: "Is a named type file",
  121: "Remote I/O error",
  122: "Disk quota exceeded",
  123: "No medium found",
  124: "Wrong medium type",
  125: "Operation canceled",
  126: "Required key not available",
  127: "Key has expired",
  128: "Key has been revoked",
  129: "Key was rejected by service",
  130: "Owner died",
  131: "State not recoverable",
  132: "Operation not possible due to RF-kill",
  133: "Memory page has hardware error",
};

const CHAR_TYPES = ["char", "unsigned char", "signed char"];

function makeHelpers(H, s, api, node) {
  const fail = (message, category) => api.fail(message, node, category);
  const X = {
    fail,
    need(name, args, count) {
      if (args.length !== count)
        fail(
          `${name} は引数を${count}つ取ります（${args.length}個は渡せません）`,
          "CompileError",
        );
    },
    // 整数引数（int／char への変換相当）。unknown はそのまま返す
    // （呼び出し側が伝播させる）。
    intValue(name, v) {
      if (H.isUnknown(v)) return v;
      if (typeof v === "boolean") return Number(v);
      if (typeof v !== "number")
        fail(`${name} の引数は整数でなければなりません`, "CompileError");
      if (!Number.isFinite(v))
        fail(`${name} の引数が有限の数ではありません`, "未定義動作");
      const t = Math.trunc(v);
      if (!Number.isSafeInteger(t))
        fail(`${name} の引数が安全に計算できる整数範囲外です`, "未確認");
      return t;
    },
    // size_t 引数。負値は size_t への変換で巨大な値になるため、
    // 実質無制限として扱い、各関数の範囲検査で未定義動作に帰着させる。
    sizeValue(name, v) {
      const t = X.intValue(name, v);
      if (H.isUnknown(t)) return t;
      return t < 0 ? Number.MAX_SAFE_INTEGER : t;
    },
    // ポインタからメモリオブジェクトを得る。allowEnd のときは
    // 「末尾の1つ先」（offset === 要素数）でもオブジェクト自体は
    // 返し、要素アクセスの可否は呼び出し側の範囲検査に委ねる。
    memOf(name, v, allowEnd = false) {
      if (H.isUnknown(v)) fail("確定できないポインタです", "未確認");
      if (v === null) fail("NULLポインタが指す先はありません", "未定義動作");
      if (!H.isPtr(v)) fail(`${name} の引数はポインタが必要です`, "CompileError");
      if (allowEnd) {
        const m = s.model?.memory?.[v.object];
        if (m && m.alive && v.offset === m.values.length) return m;
      }
      return H.deref(v, s, api, node);
    },
    // 文字列として読む（文字列リテラル値／char ポインタ）。
    textOf(name, v) {
      if (typeof v === "string") {
        const z = v.indexOf("\0");
        return z < 0 ? v : v.slice(0, z);
      }
      if (H.isUnknown(v)) fail("確定できない文字列です", "未確認");
      if (v === null) fail("NULLポインタの文字列は読めません", "未定義動作");
      if (typeof v === "number" || typeof v === "boolean")
        fail(`${name} の引数は文字列へのポインタが必要です`, "CompileError");
      return H.cString(v, s, api, node);
    },
    elemByte(mem, idx) {
      const v = mem.values[idx];
      if (H.isUnknown(v)) fail("確定できない文字が含まれています", "未確認");
      if (typeof v !== "number") fail("未初期化の要素です", "未定義動作");
      return ((Math.trunc(v) % 256) + 256) % 256;
    },
    // 上限つきバイト読み取り用のソース（ポインタ／文字列リテラル）。
    // 終端ヌルまでに止まる呼び出しでは、文字列全体のヌル終端を
    // 要求せずに先頭から読める。
    byteSource(name, v, allowedTypes, wrongTypeCategory, wrongTypeMessage) {
      if (typeof v === "string") return { lit: v, mem: null, offset: 0 };
      if (H.isUnknown(v)) fail("確定できない文字列です", "未確認");
      if (v === null) fail("NULLポインタが指す先はありません", "未定義動作");
      if (!H.isPtr(v))
        fail(`${name} の引数はポインタが必要です`, "CompileError");
      const mem = X.memOf(name, v, true);
      if (!allowedTypes.includes(mem.type))
        fail(wrongTypeMessage || "char配列が必要です", wrongTypeCategory);
      return { lit: null, mem, offset: v.offset };
    },
    byteAt(src, i) {
      if (src.lit !== null && src.lit !== undefined) {
        if (i < src.lit.length)
          return ((src.lit.charCodeAt(i) % 256) + 256) % 256;
        if (i === src.lit.length) return 0;
        fail("文字列の範囲外の読み取りです", "未定義動作");
      }
      const idx = src.offset + i;
      if (idx >= src.mem.values.length)
        fail("配列の範囲外の読み取りです", "未定義動作");
      return X.elemByte(src.mem, idx);
    },
    // 書き込み先の char 配列。
    destChar(name, v) {
      if (H.isUnknown(v)) fail("確定できないポインタです", "未確認");
      if (typeof v === "string")
        fail("文字列リテラルへの書き込みは未定義動作です", "未定義動作");
      if (v === null) fail("NULLポインタが指す先はありません", "未定義動作");
      if (!H.isPtr(v)) fail(`${name} の引数はポインタが必要です`, "CompileError");
      const mem = X.memOf(name, v, true);
      if (mem.type !== "char") fail("char配列が必要です", "CompileError");
      return { mem, ptr: v };
    },
    writeCheck(mem, ptr, count) {
      if (ptr.offset < 0 || ptr.offset + count > mem.values.length)
        fail("配列の範囲を超える書き込みです", "未定義動作");
    },
    writeCodes(mem, ptr, codes) {
      for (let i = 0; i < codes.length; i++) mem.values[ptr.offset + i] = codes[i];
    },
    // dest 文字列の終端ヌルの位置（絶対添字）。無ければ未定義動作。
    findEnd(name, mem, ptr) {
      for (let i = ptr.offset; i < mem.values.length; i++) {
        if (X.elemByte(mem, i) === 0) return i;
      }
      fail(`${name} の宛先に終端のヌル文字がありません`, "未定義動作");
    },
    // ポインタを返す関数用。入力がポインタなら同じオブジェクトの
    // ポインタを返し、文字列リテラルならリテラルの格納域に相当する
    // モデルオブジェクトを確保してそのポインタを返す。
    pointerResult(v, pos) {
      if (H.isPtr(v)) return { kind: "pointer", object: v.object, offset: v.offset + pos };
      if (typeof v === "string") {
        const codes = [];
        for (let i = 0; i < v.length; i++) codes.push(v.charCodeAt(i));
        codes.push(0);
        const seq = (s.__clibLiteralSeq = (s.__clibLiteralSeq || 0) + 1);
        const id = H.allocate(s, `__clib_literal_${seq}`, codes, "char");
        return { kind: "pointer", object: id, offset: pos };
      }
      fail("ポインタを返せない引数です", "CompileError");
    },
    byteWidth(type) {
      if (type === "double") return 8;
      const bits = H.width(type, s);
      return Math.max(1, Math.round(bits / 8));
    },
  };
  return X;
}

function codesOf(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
  return out;
}

function compareTexts(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ca = i < a.length ? ((a.charCodeAt(i) % 256) + 256) % 256 : 0;
    const cb = i < b.length ? ((b.charCodeAt(i) % 256) + 256) % 256 : 0;
    if (ca !== cb) return ca - cb;
  }
  return 0;
}

function memCopy(name, allowOverlap) {
  return (args, values, s, api, node, H) => {
    const X = makeHelpers(H, s, api, node);
    X.need(name, args, 3);
    const [dest, src, nRaw] = values;
    if (H.isUnknown(dest)) return dest;
    if (H.isUnknown(src)) return src;
    const n = X.sizeValue(name, nRaw);
    if (H.isUnknown(n)) return nRaw;
    if (dest === null || src === null) {
      if (n === 0) return dest;
      X.fail("NULLポインタが指す先はありません", "未定義動作");
    }
    if (!H.isPtr(dest) || !H.isPtr(src))
      X.fail(`${name} の引数はポインタが必要です`, "CompileError");
    const destMem = X.memOf(name, dest, true);
    const srcMem = X.memOf(name, src, true);
    if (destMem.type !== srcMem.type)
      X.fail(
        `${name} は要素型の異なるオブジェクト間では未対応です（${srcMem.type} から ${destMem.type}）`,
        "未対応",
      );
    const w = X.byteWidth(destMem.type);
    const destBytes = (destMem.values.length - dest.offset) * w;
    const srcBytes = (srcMem.values.length - src.offset) * w;
    if (n > destBytes || n > srcBytes)
      X.fail("配列の範囲を超えるコピーです", "未定義動作");
    if (n % w !== 0)
      X.fail(
        `${name} のバイト数 ${n} が要素幅 ${w} バイトで割り切れないため未対応です`,
        "未対応",
      );
    const count = n / w;
    if (
      !allowOverlap &&
      dest.object === src.object &&
      count > 0 &&
      dest.offset < src.offset + count &&
      src.offset < dest.offset + count
    )
      X.fail("memcpy で重なる領域をコピーするのは未定義動作です", "未定義動作");
    const copied = srcMem.values.slice(src.offset, src.offset + count);
    for (let i = 0; i < count; i++) destMem.values[dest.offset + i] = copied[i];
    return dest;
  };
}

export const handlers = {
  memcpy: memCopy("memcpy", false),
  memmove: memCopy("memmove", true),

  strcpy(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strcpy", args, 2);
    const srcText = X.textOf("strcpy", values[1]);
    const { mem, ptr } = X.destChar("strcpy", values[0]);
    const codes = codesOf(srcText);
    X.writeCheck(mem, ptr, codes.length + 1);
    X.writeCodes(mem, ptr, [...codes, 0]);
    return values[0];
  },

  strncpy(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strncpy", args, 3);
    const n = X.sizeValue("strncpy", values[2]);
    if (H.isUnknown(n)) return values[2];
    const { mem, ptr } = X.destChar("strncpy", values[0]);
    if (n > mem.values.length - ptr.offset)
      X.fail("配列の範囲を超える書き込みです", "未定義動作");
    const src = X.byteSource("strncpy", values[1], ["char"], "未定義動作");
    const out = [];
    for (let i = 0; i < n; i++) {
      const b = X.byteAt(src, i);
      if (b === 0) break;
      out.push(b);
    }
    for (let i = 0; i < n; i++) mem.values[ptr.offset + i] = i < out.length ? out[i] : 0;
    return values[0];
  },

  strcat(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strcat", args, 2);
    const srcText = X.textOf("strcat", values[1]);
    const { mem, ptr } = X.destChar("strcat", values[0]);
    const end = X.findEnd("strcat", mem, ptr);
    const codes = codesOf(srcText);
    if (end + codes.length + 1 > mem.values.length)
      X.fail("配列の範囲を超える書き込みです", "未定義動作");
    for (let i = 0; i < codes.length; i++) mem.values[end + i] = codes[i];
    mem.values[end + codes.length] = 0;
    return values[0];
  },

  strncat(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strncat", args, 3);
    const n = X.sizeValue("strncat", values[2]);
    if (H.isUnknown(n)) return values[2];
    const { mem, ptr } = X.destChar("strncat", values[0]);
    const end = X.findEnd("strncat", mem, ptr);
    const src = X.byteSource("strncat", values[1], ["char"], "未定義動作");
    const out = [];
    for (let i = 0; i < n; i++) {
      const b = X.byteAt(src, i);
      if (b === 0) break;
      out.push(b);
    }
    if (end + out.length + 1 > mem.values.length)
      X.fail("配列の範囲を超える書き込みです", "未定義動作");
    for (let i = 0; i < out.length; i++) mem.values[end + i] = out[i];
    mem.values[end + out.length] = 0;
    return values[0];
  },

  memcmp(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("memcmp", args, 3);
    const n = X.sizeValue("memcmp", values[2]);
    if (H.isUnknown(n)) return values[2];
    const a = X.byteSource("memcmp", values[0], CHAR_TYPES, "未対応",
      "memcmp は char／unsigned char のオブジェクトのみ対応しています");
    const b = X.byteSource("memcmp", values[1], CHAR_TYPES, "未対応",
      "memcmp は char／unsigned char のオブジェクトのみ対応しています");
    for (let i = 0; i < n; i++) {
      const ba = X.byteAt(a, i);
      const bb = X.byteAt(b, i);
      if (ba !== bb) return ba - bb;
    }
    return 0;
  },

  strcmp(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strcmp", args, 2);
    return compareTexts(X.textOf("strcmp", values[0]), X.textOf("strcmp", values[1]));
  },

  strcoll(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strcoll", args, 2);
    // "C" ロケールでは strcoll は strcmp と同じ比較になる。
    return compareTexts(X.textOf("strcoll", values[0]), X.textOf("strcoll", values[1]));
  },

  strncmp(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strncmp", args, 3);
    const n = X.sizeValue("strncmp", values[2]);
    if (H.isUnknown(n)) return values[2];
    if (n === 0) return 0;
    const a = X.byteSource("strncmp", values[0], ["char"], "未定義動作");
    const b = X.byteSource("strncmp", values[1], ["char"], "未定義動作");
    for (let i = 0; i < n; i++) {
      const ba = X.byteAt(a, i);
      const bb = X.byteAt(b, i);
      if (ba !== bb) return ba - bb;
      if (ba === 0) return 0;
    }
    return 0;
  },

  strxfrm(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strxfrm", args, 3);
    const n = X.sizeValue("strxfrm", values[2]);
    if (H.isUnknown(n)) return values[2];
    const srcText = X.textOf("strxfrm", values[1]);
    const len = srcText.length;
    if (values[0] === null) {
      if (n === 0) return len;
      X.fail("NULLポインタが指す先はありません", "未定義動作");
    }
    if (n === 0) return len;
    const { mem, ptr } = X.destChar("strxfrm", values[0]);
    // "C" ロケールでは変換は恒等。glibc 実走に合わせ、書き込みは
    // min(長さ, n) 文字で、長さ < n のときだけ終端ヌルを付ける。
    const k = Math.min(len, n);
    const total = k + (len < n ? 1 : 0);
    X.writeCheck(mem, ptr, total);
    X.writeCodes(mem, ptr, codesOf(srcText).slice(0, k));
    if (len < n) mem.values[ptr.offset + k] = 0;
    return len;
  },

  memchr(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("memchr", args, 3);
    const c = X.intValue("memchr", values[1]);
    if (H.isUnknown(c)) return values[1];
    const n = X.sizeValue("memchr", values[2]);
    if (H.isUnknown(n)) return values[2];
    const src = X.byteSource("memchr", values[0], CHAR_TYPES, "未対応",
      "memchr は char／unsigned char のオブジェクトのみ対応しています");
    const byte = ((c % 256) + 256) % 256;
    for (let i = 0; i < n; i++) {
      if (X.byteAt(src, i) === byte) return X.pointerResult(values[0], i);
    }
    return null;
  },

  strchr(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strchr", args, 2);
    const c = X.intValue("strchr", values[1]);
    if (H.isUnknown(c)) return values[1];
    const text = X.textOf("strchr", values[0]);
    const target = ((c % 256) + 256) % 256;
    for (let pos = 0; pos <= text.length; pos++) {
      const code = pos < text.length ? ((text.charCodeAt(pos) % 256) + 256) % 256 : 0;
      if (code === target) return X.pointerResult(values[0], pos);
    }
    return null;
  },

  strrchr(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strrchr", args, 2);
    const c = X.intValue("strrchr", values[1]);
    if (H.isUnknown(c)) return values[1];
    const text = X.textOf("strrchr", values[0]);
    const target = ((c % 256) + 256) % 256;
    for (let pos = text.length; pos >= 0; pos--) {
      const code = pos < text.length ? ((text.charCodeAt(pos) % 256) + 256) % 256 : 0;
      if (code === target) return X.pointerResult(values[0], pos);
    }
    return null;
  },

  strcspn(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strcspn", args, 2);
    const text = X.textOf("strcspn", values[0]);
    const reject = new Set(codesOf(X.textOf("strcspn", values[1])));
    let i = 0;
    while (i < text.length && !reject.has(text.charCodeAt(i))) i++;
    return i;
  },

  strspn(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strspn", args, 2);
    const text = X.textOf("strspn", values[0]);
    const accept = new Set(codesOf(X.textOf("strspn", values[1])));
    let i = 0;
    while (i < text.length && accept.has(text.charCodeAt(i))) i++;
    return i;
  },

  strpbrk(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strpbrk", args, 2);
    const text = X.textOf("strpbrk", values[0]);
    const accept = new Set(codesOf(X.textOf("strpbrk", values[1])));
    for (let pos = 0; pos < text.length; pos++) {
      if (accept.has(text.charCodeAt(pos))) return X.pointerResult(values[0], pos);
    }
    return null;
  },

  strstr(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strstr", args, 2);
    const haystack = X.textOf("strstr", values[0]);
    const needle = X.textOf("strstr", values[1]);
    if (needle === "") return X.pointerResult(values[0], 0);
    const idx = haystack.indexOf(needle);
    if (idx < 0) return null;
    return X.pointerResult(values[0], idx);
  },

  strtok(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strtok", args, 2);
    const delimText = X.textOf("strtok", values[1]);
    const delims = new Set(codesOf(delimText));
    let startPtr;
    if (values[0] !== null && values[0] !== undefined) {
      if (H.isUnknown(values[0])) X.fail("確定できない文字列です", "未確認");
      if (typeof values[0] === "string")
        X.fail("文字列リテラルを書き換える strtok は未定義動作です", "未定義動作");
      if (!H.isPtr(values[0]))
        X.fail("strtok の引数は文字列へのポインタが必要です", "CompileError");
      startPtr = values[0];
    } else {
      if (!s.__clibStrtok) return null;
      startPtr = s.__clibStrtok;
    }
    const mem = X.memOf("strtok", startPtr, true);
    if (mem.type !== "char") X.fail("char配列が必要です", "CompileError");
    if (startPtr.offset >= mem.values.length) {
      s.__clibStrtok = null;
      return null;
    }
    let pos = startPtr.offset;
    // 区切り文字を読み飛ばす。終端ヌルが無いまま末尾に達したら
    // 未定義動作として停止する。
    while (true) {
      if (pos >= mem.values.length)
        X.fail("終端のヌル文字がない文字列の読み取り", "未定義動作");
      const b = X.elemByte(mem, pos);
      if (b === 0) {
        s.__clibStrtok = null;
        return null;
      }
      if (!delims.has(b)) break;
      pos++;
    }
    const tokenStart = pos;
    while (true) {
      if (pos >= mem.values.length)
        X.fail("終端のヌル文字がない文字列の読み取り", "未定義動作");
      const b = X.elemByte(mem, pos);
      if (b === 0) {
        s.__clibStrtok = { kind: "pointer", object: startPtr.object, offset: pos };
        return { kind: "pointer", object: startPtr.object, offset: tokenStart };
      }
      if (delims.has(b)) {
        mem.values[pos] = 0;
        s.__clibStrtok = { kind: "pointer", object: startPtr.object, offset: pos + 1 };
        return { kind: "pointer", object: startPtr.object, offset: tokenStart };
      }
      pos++;
    }
  },

  memset(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("memset", args, 3);
    const [ptr, cRaw, nRaw] = values;
    if (H.isUnknown(ptr)) return ptr;
    const c = X.intValue("memset", cRaw);
    if (H.isUnknown(c)) return cRaw;
    const n = X.sizeValue("memset", nRaw);
    if (H.isUnknown(n)) return nRaw;
    if (ptr === null) {
      if (n === 0) return ptr;
      X.fail("NULLポインタが指す先はありません", "未定義動作");
    }
    if (!H.isPtr(ptr)) X.fail("memset の引数はポインタが必要です", "CompileError");
    const mem = X.memOf("memset", ptr, true);
    const byte = ((c % 256) + 256) % 256;
    if (CHAR_TYPES.includes(mem.type)) {
      if (n > mem.values.length - ptr.offset)
        X.fail("配列の範囲を超える書き込みです", "未定義動作");
      for (let i = 0; i < n; i++) mem.values[ptr.offset + i] = byte;
      return ptr;
    }
    if (byte !== 0)
      X.fail(
        "char型以外への memset はバイト値 0 のみ対応しています（非0バイトは未対応）",
        "未対応",
      );
    const w = X.byteWidth(mem.type);
    if (n > (mem.values.length - ptr.offset) * w)
      X.fail("配列の範囲を超える書き込みです", "未定義動作");
    if (n % w !== 0)
      X.fail(
        `memset のバイト数 ${n} が要素幅 ${w} バイトで割り切れないため未対応です`,
        "未対応",
      );
    const count = n / w;
    for (let i = 0; i < count; i++) mem.values[ptr.offset + i] = 0;
    return ptr;
  },

  strerror(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strerror", args, 1);
    const n = X.intValue("strerror", values[0]);
    if (H.isUnknown(n)) return values[0];
    return ERRNO_MESSAGES[n] ?? `Unknown error ${n}`;
  },

  strlen(args, values, s, api, node, H) {
    const X = makeHelpers(H, s, api, node);
    X.need("strlen", args, 1);
    return X.textOf("strlen", values[0]).length;
  },
};

// <ctype.h>（"C" ロケール＝ASCII）。引数の有効域は EOF(-1) と
// 0..255。それ以外は未定義動作として停止する（裁定メモ）。
function ctypeHandler(name, fn) {
  return (args, values, s, api, node, H) => {
    const X = makeHelpers(H, s, api, node);
    X.need(name, args, 1);
    const c = X.intValue(name, values[0]);
    if (H.isUnknown(c)) return values[0];
    if (!(c === -1 || (c >= 0 && c <= 255)))
      X.fail(
        `${name} の引数が有効範囲（EOF または 0〜255）外です`,
        "未定義動作",
      );
    return fn(c);
  };
}

const isUpperCode = (c) => c >= 65 && c <= 90;
const isLowerCode = (c) => c >= 97 && c <= 122;
const isDigitCode = (c) => c >= 48 && c <= 57;
const isAlphaCode = (c) => isUpperCode(c) || isLowerCode(c);
const isAlnumCode = (c) => isAlphaCode(c) || isDigitCode(c);
const isGraphCode = (c) => c >= 33 && c <= 126;

Object.assign(handlers, {
  isalnum: ctypeHandler("isalnum", (c) => (isAlnumCode(c) ? 1 : 0)),
  isalpha: ctypeHandler("isalpha", (c) => (isAlphaCode(c) ? 1 : 0)),
  isblank: ctypeHandler("isblank", (c) => (c === 32 || c === 9 ? 1 : 0)),
  iscntrl: ctypeHandler("iscntrl", (c) => ((c >= 0 && c <= 31) || c === 127 ? 1 : 0)),
  isdigit: ctypeHandler("isdigit", (c) => (isDigitCode(c) ? 1 : 0)),
  isgraph: ctypeHandler("isgraph", (c) => (isGraphCode(c) ? 1 : 0)),
  islower: ctypeHandler("islower", (c) => (isLowerCode(c) ? 1 : 0)),
  isprint: ctypeHandler("isprint", (c) => (c >= 32 && c <= 126 ? 1 : 0)),
  ispunct: ctypeHandler("ispunct", (c) => (isGraphCode(c) && !isAlnumCode(c) ? 1 : 0)),
  isspace: ctypeHandler("isspace", (c) => (c === 32 || (c >= 9 && c <= 13) ? 1 : 0)),
  isupper: ctypeHandler("isupper", (c) => (isUpperCode(c) ? 1 : 0)),
  isxdigit: ctypeHandler("isxdigit", (c) =>
    isDigitCode(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102) ? 1 : 0,
  ),
  tolower: ctypeHandler("tolower", (c) => (isUpperCode(c) ? c + 32 : c)),
  toupper: ctypeHandler("toupper", (c) => (isLowerCode(c) ? c - 32 : c)),
});

// 戻り型の宣言（名前→型文字列、または引数型配列→型文字列）。
export const returnTypes = {
  memcpy: "void*",
  memmove: "void*",
  strcpy: "char*",
  strncpy: "char*",
  strcat: "char*",
  strncat: "char*",
  memcmp: "int",
  strcmp: "int",
  strcoll: "int",
  strncmp: "int",
  strxfrm: "unsigned long",
  memchr: "void*",
  strchr: "char*",
  strcspn: "unsigned long",
  strpbrk: "char*",
  strrchr: "char*",
  strspn: "unsigned long",
  strstr: "char*",
  strtok: "char*",
  memset: "void*",
  strerror: "char*",
  strlen: "unsigned long",
  isalnum: "int",
  isalpha: "int",
  isblank: "int",
  iscntrl: "int",
  isdigit: "int",
  isgraph: "int",
  islower: "int",
  isprint: "int",
  ispunct: "int",
  isspace: "int",
  isupper: "int",
  isxdigit: "int",
  tolower: "int",
  toupper: "int",
};
