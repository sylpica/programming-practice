/* 高度モード差分（ブロックB3）: PowerShell コマンドレットの高度ハンドラ。
 * 登録形式は engine-advanced.js のコメントを参照。一次情報は Microsoft Learn
 * の各コマンドレットヘルプ（PowerShell 7.4）と about_* 言語仕様。
 * 実 pwsh で測れない意味論は実装せず unverified に倒す。
 *
 * 裁定方針（PS-ENG）:
 * - 対応: 仮想FS・モデル値の範囲で Learn の意味論を厳密に定義できるもの。
 *   実行時に決まる値（乱数・GUID・現在日時）は基礎の未確定値の慣行に従い
 *   unknown を返す（値を捏造しない）。
 * - 未対応: 実プロセス／サービス／レジストリ／ネットワーク／ジョブ／
 *   イベント／runspace／デバッガ／表示ホストの整形エンジンなど、モデルに
 *   無い実行環境が本質のもの。
 * - 未検証: 意味論自体は存在するが、実 pwsh で測れないため一次情報だけ
 *   では出力の細部を確定できないもの。
 * なお基礎パーサのスイッチ表は基礎コマンドレット分のみのため、高度側の
 * スイッチ型パラメータ（-Compress 等）は単独では書けず、値を伴う形
 * （-Compress $true）でのみ束縛される。これは基礎側の制約として報告済み。
 *
 * FIX-PS-B（高度A3監査是正。根拠: lane-a3-t2-w2-ps.md §3／§4、Learn
 * PowerShell 7.4 ビューを 2026-11-18 に取得）:
 * - 格上げ（未検証→対応）: ConvertTo-Html、Get-MarkdownOption、
 *   Set-MarkdownOption、Import-PowerShellDataFile、Update-List、
 *   Measure-Command（ブロック実行は engine.js が ctx.execBlock で提供）。
 * - 再分類（未検証→未対応）: ConvertTo-CliXml／ConvertFrom-CliXml
 *   （PowerShell 7.5-preview.4 導入で 7.4 には存在しないため）。
 * - 理由是正（未検証のまま）: ConvertFrom-Markdown、ConvertTo-Xml、
 *   Get-Culture、Get-UICulture、Get-Member、Get-PSCallStack、Get-Verb。
 * - Join-Path を純粋な文字列結合へ是正し、余分な位置引数をエラーにした。
 * - Set-MarkdownOption のパラメータ名を Learn の実名へ是正した。
 */
const isObj = (v) => !!v && typeof v === "object" && v.kind === "ps-object";
const isHash = (v) => isObj(v) && v.psType === "Hashtable";

function txt(ctx, v, what = "値") {
  const t = ctx.text(v, ctx.c);
  if (ctx.isUnknown(t))
    ctx.fail("未確認：" + what + "の文字列化が確定していません", ctx.c.line);
  return t;
}
function truthy(v) {
  if (Array.isArray(v))
    return v.length === 0 ? false : v.length === 1 ? truthy(v[0]) : true;
  return v !== null && v !== undefined && v !== false && v !== 0 && v !== "";
}
function asNum(ctx, v, what = "値") {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === undefined) return 0;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
    return Number(v);
  ctx.fail(what + "を数値へ変換できません：" + txt(ctx, v), ctx.c.line);
}
function propOf(v, key) {
  const lower = String(key).toLowerCase();
  if (v === null || v === undefined) return { found: false, value: null };
  if (isHash(v)) {
    const k = [...v.entries.keys()].find(
      (x) => typeof x === "string" && x.toLowerCase() === lower,
    );
    if (k !== undefined) return { found: true, value: v.entries.get(k) };
    if (lower === "count") return { found: true, value: v.entries.size };
    if (lower === "keys") return { found: true, value: [...v.entries.keys()] };
    if (lower === "values")
      return { found: true, value: [...v.entries.values()] };
    return { found: false, value: null };
  }
  if (isObj(v)) {
    const k = Object.keys(v.properties).find((x) => x.toLowerCase() === lower);
    if (k !== undefined) return { found: true, value: v.properties[k] };
    if (lower === "count") return { found: true, value: 1 };
    return { found: false, value: null };
  }
  if (Array.isArray(v)) {
    if (lower === "count" || lower === "length")
      return { found: true, value: v.length };
    // メンバー列挙（基礎 property() と同じ規則）
    const vals = v
      .flatMap((x) => {
        const p = propOf(x, key);
        return p.found ? ctxEnumerate(p.value) : [];
      })
      .filter((x) => x !== null && x !== undefined);
    return { found: vals.length > 0, value: vals };
  }
  if (typeof v === "string" && lower === "length")
    return { found: true, value: v.length };
  return { found: false, value: null };
}
const ctxEnumerate = (v) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];
function canonical(ctx, v) {
  if (v === null || v === undefined) return "null:";
  if (typeof v === "number") return "num:" + v;
  if (typeof v === "boolean") return "bool:" + v;
  if (typeof v === "string") return "str:" + v;
  if (Array.isArray(v))
    return "arr:[" + v.map((x) => canonical(ctx, x)).join(",") + "]";
  if (isHash(v))
    return (
      "hash:{" +
      [...v.entries]
        .map(([k, x]) => String(k) + "=" + canonical(ctx, x))
        .sort()
        .join(",") +
      "}"
    );
  if (isObj(v))
    return (
      "obj:" +
      v.psType +
      ":{" +
      Object.entries(v.properties)
        .map(([k, x]) => k + "=" + canonical(ctx, x))
        .sort()
        .join(",") +
      "}"
    );
  return "other:" + String(v);
}
function valueEq(ctx, a, b, sensitive = false) {
  if (ctx.isUnknown(a) || ctx.isUnknown(b))
    ctx.fail("未確認：未確定値の比較", ctx.c.line);
  if (a === null || a === undefined || b === null || b === undefined)
    return (a ?? null) === (b ?? null);
  if (typeof a === "boolean" || typeof b === "boolean")
    return truthy(a) === truthy(b);
  if (typeof a === "number" || typeof b === "number") {
    const na = Number(a),
      nb = Number(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) return false;
    return na === nb;
  }
  if (typeof a === "string" && typeof b === "string")
    return sensitive ? a === b : a.toLowerCase() === b.toLowerCase();
  return canonical(ctx, a) === canonical(ctx, b);
}
/* ---- 変数表（大文字小文字を区別しない）へのアクセス ---- */
const varKey = (s, name) =>
  Object.keys(s.vars).find(
    (k) => k.toLowerCase() === String(name).toLowerCase(),
  );
function setVar(s, name, v) {
  const k = varKey(s, name) || String(name);
  Object.defineProperty(s.vars, k, {
    value: v,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
/* ---- 仮想FS ---- */
function fileInfo(ctx, e) {
  const name = e.path.split("\\").at(-1),
    dot = name.lastIndexOf(".");
  const props = {
    Name: name,
    FullName: e.path,
    PSIsContainer: e.type === "directory",
  };
  if (e.type === "file")
    props.Length =
      e.length ??
      (typeof e.content === "string"
        ? new TextEncoder().encode(e.content).length
        : ctx.unknown("モデルに未指定のサイズ", e.path + ":length"));
  props.Extension = dot >= 0 ? name.slice(dot) : "";
  return ctx.object(props, e.type === "directory" ? "DirectoryInfo" : "FileInfo");
}
function pathInfoObj(ctx, full) {
  return {
    ...ctx.object({ Path: full, ProviderPath: full }, "PathInfo"),
    displayText: full,
  };
}
function entriesFor(ctx, rawPath, what = "パス") {
  if (ctx.isUnknown(rawPath))
    ctx.fail("未確認：" + what + "が確定していません", ctx.c.line);
  const str = txt(ctx, rawPath, what);
  if (/[*?[]/.test(str)) {
    const matched = ctx.listFiles(ctx.s, str, ctx.c.line);
    if (ctx.isUnknown(matched))
      ctx.fail("未確認：" + what + "が確定していません", ctx.c.line);
    return matched;
  }
  const e = ctx.fsEntry(ctx.s, str, ctx.c.line);
  if (ctx.isUnknown(e))
    ctx.fail("未確認：" + what + "が確定していません", ctx.c.line);
  return e ? [e] : [];
}
function fileEntriesFor(ctx, rawPath, what = "パス") {
  const entries = entriesFor(ctx, rawPath, what);
  if (!entries.length)
    ctx.fail(
      "モデルにパスがありません：" + txt(ctx, rawPath, what),
      ctx.c.line,
    );
  for (const e of entries)
    if (e.type !== "file")
      ctx.fail("モデルにファイルがありません：" + e.path, ctx.c.line);
  return entries;
}
function fileContent(ctx, e) {
  if (e.content === undefined || ctx.isUnknown(e.content))
    ctx.fail("未確認：ファイル内容がモデルにありません", ctx.c.line);
  return e.content;
}
const splitLines = (content) => {
  const lines = content.split(/\r\n|\r|\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines;
};
/* ---- SHA-1 / SHA-256（モデルファイルの内容文字列の UTF-8 バイト列に対する
 * ハッシュ。基礎の Length が UTF-8 バイト長であることと揃える） ---- */
function sha256Hex(bytes) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  const bitLen = bytes.length * 8;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  const hi = Math.floor(bitLen / 0x100000000),
    lo = bitLen >>> 0;
  for (const v of [hi, lo]) {
    padded.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  }
  const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
  const w = new Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++)
      w[i] =
        ((padded[off + i * 4] << 24) |
          (padded[off + i * 4 + 1] << 16) |
          (padded[off + i * 4 + 2] << 8) |
          padded[off + i * 4 + 3]) >>>
        0;
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3),
        s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25),
        ch = (e & f) ^ (~e & g),
        t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0,
        S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22),
        maj = (a & b) ^ (a & c) ^ (b & c),
        t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    h = h.map((x, i) => (x + [a, b, c, d, e, f, g, hh][i]) >>> 0);
  }
  return h.map((x) => x.toString(16).padStart(8, "0")).join("").toUpperCase();
}
function sha1Hex(bytes) {
  let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const bitLen = bytes.length * 8;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  const hi = Math.floor(bitLen / 0x100000000),
    lo = bitLen >>> 0;
  for (const v of [hi, lo])
    padded.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
  const w = new Array(80);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++)
      w[i] =
        ((padded[off + i * 4] << 24) |
          (padded[off + i * 4 + 1] << 16) |
          (padded[off + i * 4 + 2] << 8) |
          padded[off + i * 4 + 3]) >>>
        0;
    for (let i = 16; i < 80; i++)
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      let f, k;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    h = h.map((x, i) => (x + [a, b, c, d, e][i]) >>> 0);
  }
  return h.map((x) => x.toString(16).padStart(8, "0")).join("").toUpperCase();
}
/* ---- 日時（DateTime／TimeSpan） ---- */
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function daysInMonth(y, mo) {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}
function makeDateTime(ctx, c, kind = "Unspecified") {
  const { y, mo, d, h = 0, mi = 0, se = 0, ms = 0 } = c;
  if (
    !Number.isInteger(y) || y < 1 || y > 9999 ||
    !Number.isInteger(mo) || mo < 1 || mo > 12 ||
    !Number.isInteger(d) || d < 1 || d > daysInMonth(y, mo) ||
    !Number.isInteger(h) || h < 0 || h > 23 ||
    !Number.isInteger(mi) || mi < 0 || mi > 59 ||
    !Number.isInteger(se) || se < 0 || se > 59 ||
    !Number.isInteger(ms) || ms < 0 || ms > 999
  )
    ctx.fail(
      "日時コンポーネントが範囲外です：" +
        [y, mo, d, h, mi, se, ms].join("/"),
      ctx.c.line,
    );
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi, se, ms));
  const startOfYear = Date.UTC(y, 0, 1);
  const p2 = (n) => String(n).padStart(2, "0");
  return {
    ...ctx.object(
      {
        Year: y, Month: mo, Day: d, Hour: h, Minute: mi, Second: se,
        Millisecond: ms, Kind: kind,
        DayOfWeek: DOW_NAMES[dt.getUTCDay()],
        DayOfYear: Math.floor((Date.UTC(y, mo - 1, d) - startOfYear) / 86400000) + 1,
      },
      "DateTime",
    ),
    displayText:
      y + "-" + p2(mo) + "-" + p2(d) + " " + p2(h) + ":" + p2(mi) + ":" + p2(se),
  };
}
const isDateTime = (v) => isObj(v) && v.psType === "DateTime";
function dateComps(v) {
  const p = v.properties;
  return { y: p.Year, mo: p.Month, d: p.Day, h: p.Hour, mi: p.Minute, se: p.Second, ms: p.Millisecond };
}
function parseISODate(ctx, str) {
  const m = String(str).match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/,
  );
  if (!m) return null;
  return {
    y: +m[1], mo: +m[2], d: +m[3],
    h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0,
    se: m[6] ? +m[6] : 0, ms: m[7] ? +m[7].padEnd(3, "0") : 0,
  };
}
function makeTimeSpan(ctx, totalMs) {
  if (!Number.isFinite(totalMs))
    ctx.fail("TimeSpanの範囲外です", ctx.c.line);
  totalMs = Math.round(totalMs);
  const sign = totalMs < 0 ? -1 : 1,
    abs = Math.abs(totalMs),
    days = Math.floor(abs / 86400000),
    hours = Math.floor(abs / 3600000) % 24,
    minutes = Math.floor(abs / 60000) % 60,
    seconds = Math.floor(abs / 1000) % 60,
    ms = abs % 1000;
  const p2 = (n) => String(n).padStart(2, "0");
  return {
    ...ctx.object(
      {
        Days: sign * days, Hours: sign * hours, Minutes: sign * minutes,
        Seconds: sign * seconds, Milliseconds: sign * ms,
        Ticks: totalMs * 10000,
        TotalDays: totalMs / 86400000, TotalHours: totalMs / 3600000,
        TotalMinutes: totalMs / 60000, TotalSeconds: totalMs / 1000,
        TotalMilliseconds: totalMs,
      },
      "TimeSpan",
    ),
    displayText:
      (sign < 0 ? "-" : "") +
      (days ? days + "." : "") +
      p2(hours) + ":" + p2(minutes) + ":" + p2(seconds) +
      (ms ? "." + String(ms * 10000).padStart(7, "0") : ""),
  };
}

/* ================= 対応（実装あり） ================= */
const SUPPORTED = {
  /* ---- 仮想FS・パス ---- */
  "clear-content": {
    params: ["path", "literalpath", "filter", "include", "exclude", "force", "stream", "confirm", "whatif"],
    run(ctx) {
      if (ctx.params.stream !== undefined)
        ctx.fail("未対応：Clear-Content -Stream（代替データストリームはモデルにありません）", ctx.c.line);
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Clear-Contentには-Pathが必要です", ctx.c.line);
      if (truthy(ctx.params.whatif)) return [{ s: ctx.s, values: [] }];
      for (const single of ctx.enumerate(raw))
        for (const e of fileEntriesFor(ctx, single))
          ctx.writeFile(ctx.s, e.path, "", ctx.c.line);
      return [{ s: ctx.s, values: [] }];
    },
  },
  "clear-item": {
    params: ["path", "literalpath", "filter", "include", "exclude", "force", "confirm", "whatif"],
    run(ctx) {
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Clear-Itemには-Pathが必要です", ctx.c.line);
      if (truthy(ctx.params.whatif)) return [{ s: ctx.s, values: [] }];
      for (const single of ctx.enumerate(raw)) {
        const entries = entriesFor(ctx, single);
        if (!entries.length)
          ctx.fail("モデルにパスがありません：" + txt(ctx, single), ctx.c.line);
        for (const e of entries) {
          if (e.type !== "file")
            ctx.fail("未対応：フォルダに対するClear-Item", ctx.c.line);
          ctx.writeFile(ctx.s, e.path, "", ctx.c.line);
        }
      }
      return [{ s: ctx.s, values: [] }];
    },
  },
  "convert-path": {
    params: ["path", "literalpath"],
    run(ctx) {
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Convert-Pathには-Pathが必要です", ctx.c.line);
      const values = ctx.enumerate(raw).map((single) => {
        const entries = entriesFor(ctx, single);
        if (!entries.length)
          ctx.fail("モデルにパスがありません：" + txt(ctx, single), ctx.c.line);
        return ctx.windowsPath(txt(ctx, single), ctx.s.model.cwd, ctx.c.line);
      });
      return [{ s: ctx.s, values }];
    },
  },
  "get-item": {
    params: ["path", "literalpath", "filter", "include", "exclude", "force", "credential"],
    run(ctx) {
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Get-Itemには-Pathが必要です", ctx.c.line);
      let values = [];
      for (const single of ctx.enumerate(raw)) {
        const entries = entriesFor(ctx, single);
        if (!entries.length)
          ctx.fail("モデルにパスがありません：" + txt(ctx, single), ctx.c.line);
        values.push(...entries.map((e) => fileInfo(ctx, e)));
      }
      if (ctx.params.filter !== undefined) {
        const mask = txt(ctx, ctx.params.filter),
          re = new RegExp(
            "^" + mask.split("").map((c) => (c === "*" ? ".*" : c === "?" ? "." : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("") + "$",
            "i",
          );
        values = values.filter((v) => re.test(v.properties.Name));
      }
      return [{ s: ctx.s, values }];
    },
  },
  "get-psdrive": {
    params: ["name", "psprovider", "scope", "credential"],
    run(ctx) {
      const cwd = ctx.s.model.cwd,
        driveName = /^[a-z]:/i.test(cwd) ? cwd[0].toUpperCase() : "",
        provider = ctx.object({ Name: "FileSystem" }, "ProviderInfo"),
        drive = ctx.object(
          {
            Name: driveName,
            Root: driveName + ":\\",
            CurrentLocation: cwd.length > 3 ? cwd.slice(3) : "",
            Provider: provider,
          },
          "PSDriveInfo",
        );
      if (ctx.params.psprovider !== undefined &&
          txt(ctx, ctx.params.psprovider).toLowerCase() !== "filesystem")
        return [{ s: ctx.s, values: [] }];
      const name = ctx.p("name", 0, null);
      if (name !== null && name !== undefined) {
        const wanted = txt(ctx, name);
        if (wanted !== "*" && wanted.toLowerCase() !== driveName.toLowerCase())
          ctx.fail("モデルにドライブがありません：" + wanted, ctx.c.line);
      }
      return [{ s: ctx.s, values: [drive] }];
    },
  },
  "get-psprovider": {
    params: ["psprovider", "drive"],
    run(ctx) {
      const name = ctx.p("psprovider", 0, null);
      if (name !== null && name !== undefined &&
          txt(ctx, name).toLowerCase() !== "filesystem")
        ctx.fail("モデルにプロバイダーがありません：" + txt(ctx, name), ctx.c.line);
      const cwd = ctx.s.model.cwd,
        driveName = /^[a-z]:/i.test(cwd) ? cwd[0].toUpperCase() : "";
      return [{
        s: ctx.s,
        values: [ctx.object({ Name: "FileSystem", Drives: [driveName] }, "ProviderInfo")],
      }];
    },
  },
  "join-path": {
    params: ["path", "childpath", "additionalchildpath", "resolve", "credential"],
    run(ctx) {
      // FIX-PS-B（コーディネーター実測の新規欠陥）: 実 PowerShell の
      // Join-Path はパスを解決（絶対化）せず、区切り記号で単に結合する。
      // 従来実装は windowsPath() で現在フォルダ基準に絶対化していたため
      // 純粋な文字列結合へ是正した。余分な位置引数は実 PS どおり
      // パラメータバインドエラーにする（基礎エンジンの「追加の位置引数」
      // の慣行に合わせる）。
      const namedSlots =
        (ctx.params.path !== undefined ? 1 : 0) +
        (ctx.params.childpath !== undefined ? 1 : 0);
      if (ctx.args.length > 2 - namedSlots)
        ctx.fail("未対応：Join-Pathの追加の位置引数", ctx.c.line);
      const parent = ctx.p("path", 0, null),
        child = ctx.p("childpath", 1, null);
      if (parent === null || parent === undefined || child === null || child === undefined)
        ctx.fail("Join-Pathには-Pathと-ChildPathが必要です", ctx.c.line);
      const joinPure = (a, b) => {
        const left = String(a),
          right = String(b).replace(/^[\\/]+/, "");
        const trimmed = left.replace(/[\\/]+$/, "");
        const base = trimmed === "" ? left : trimmed;
        return base.endsWith("\\") || base.endsWith("/") || base.endsWith(":")
          ? base + right
          : base + "\\" + right;
      };
      let full = txt(ctx, parent);
      const parts = [child, ...ctx.enumerate(ctx.params.additionalchildpath)];
      for (const part of parts) {
        if (part === null || part === undefined) continue;
        full = joinPure(full, txt(ctx, part));
      }
      if (truthy(ctx.params.resolve) && !ctx.fsEntry(ctx.s, full, ctx.c.line))
        ctx.fail("モデルにパスがありません：" + full, ctx.c.line);
      return [{ s: ctx.s, values: [full] }];
    },
  },
  "split-path": {
    params: ["path", "literalpath", "qualifier", "parent", "leaf", "leafbase", "extension", "isabsolute", "resolve", "credential"],
    run(ctx) {
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Split-Pathには-Pathが必要です", ctx.c.line);
      const modes = ["qualifier", "parent", "leaf", "leafbase", "extension", "isabsolute"]
        .filter((k) => truthy(ctx.params[k]));
      if (modes.length > 1)
        ctx.fail("Split-Pathの要素指定は1つだけです", ctx.c.line);
      const mode = modes[0] || "parent";
      const values = ctx.enumerate(raw).map((single) => {
        let str = txt(ctx, single).replaceAll("/", "\\");
        if (truthy(ctx.params.resolve)) {
          const entries = entriesFor(ctx, single);
          if (!entries.length)
            ctx.fail("モデルにパスがありません：" + str, ctx.c.line);
          str = entries[0].path;
        }
        const drive = /^[a-z]:/i.test(str) ? str.slice(0, 2) : "",
          rest = drive ? str.slice(2) : str,
          rooted = rest.startsWith("\\"),
          at = str.lastIndexOf("\\"),
          leaf = at >= 0 ? str.slice(at + 1) : str,
          parentPart = at > 2 ? str.slice(0, at) : at === 2 ? str.slice(0, 3) : "";
        if (mode === "qualifier") return drive;
        if (mode === "isabsolute") return !!drive && rooted;
        if (mode === "leaf") return leaf;
        const dot = leaf.lastIndexOf(".");
        if (mode === "leafbase") return dot >= 0 ? leaf.slice(0, dot) : leaf;
        if (mode === "extension") return dot >= 0 ? leaf.slice(dot) : "";
        return parentPart;
      });
      return [{ s: ctx.s, values }];
    },
  },
  "resolve-path": {
    params: ["path", "literalpath", "relative", "credential", "nofollow"],
    run(ctx) {
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Resolve-Pathには-Pathが必要です", ctx.c.line);
      const relative = truthy(ctx.params.relative),
        cwd = ctx.s.model.cwd;
      const values = [];
      for (const single of ctx.enumerate(raw)) {
        const entries = entriesFor(ctx, single);
        if (!entries.length)
          ctx.fail("モデルにパスがありません：" + txt(ctx, single), ctx.c.line);
        for (const e of entries) {
          if (!relative) {
            values.push(pathInfoObj(ctx, e.path));
            continue;
          }
          const from = cwd.split("\\"),
            to = e.path.split("\\");
          let i = 0;
          while (i < from.length && i < to.length && from[i].toLowerCase() === to[i].toLowerCase()) i++;
          const rel = [
            ...Array.from({ length: from.length - i }, () => ".."),
            ...to.slice(i),
          ].join("\\");
          values.push(rel === "" ? "." : rel);
        }
      }
      return [{ s: ctx.s, values }];
    },
  },
  "push-location": {
    params: ["path", "literalpath", "stackname", "passthru"],
    run(ctx) {
      if (ctx.params.stackname !== undefined)
        ctx.fail("未対応：Push-Location -StackName（名前付きスタックはモデルにありません）", ctx.c.line);
      const s = ctx.s;
      (s.ps.locationStack ??= []).push(s.model.cwd);
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw !== null && raw !== undefined) {
        const target = ctx.windowsPath(txt(ctx, raw), s.model.cwd, ctx.c.line);
        if (ctx.isUnknown(target)) ctx.fail("未確認：移動先", ctx.c.line);
        const entry = ctx.fsEntry(s, target, ctx.c.line);
        if (!entry || entry.type !== "directory")
          ctx.fail("モデルに移動先フォルダがありません：" + target, ctx.c.line);
        s.model.cwd = target;
      }
      return [{
        s,
        values: truthy(ctx.params.passthru) ? [pathInfoObj(ctx, s.model.cwd)] : [],
      }];
    },
  },
  "pop-location": {
    params: ["stackname", "passthru"],
    run(ctx) {
      if (ctx.params.stackname !== undefined)
        ctx.fail("未対応：Pop-Location -StackName（名前付きスタックはモデルにありません）", ctx.c.line);
      const s = ctx.s,
        stack = s.ps.locationStack ?? [];
      if (!stack.length)
        ctx.fail("モデルに保存された場所がありません（場所スタックが空です）", ctx.c.line);
      s.model.cwd = stack.pop();
      return [{
        s,
        values: truthy(ctx.params.passthru) ? [pathInfoObj(ctx, s.model.cwd)] : [],
      }];
    },
  },
  "get-filehash": {
    params: ["path", "literalpath", "algorithm", "inputstream"],
    run(ctx) {
      if (ctx.params.inputstream !== undefined)
        ctx.fail("未対応：Get-FileHash -InputStream（ストリーム入力はモデルにありません）", ctx.c.line);
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Get-FileHashには-Pathが必要です", ctx.c.line);
      const algorithm = String(ctx.p("algorithm", 100, "SHA256")).toUpperCase();
      if (!["SHA256", "SHA1"].includes(algorithm))
        ctx.fail("未対応：Get-FileHash -Algorithm " + algorithm + "（モデルで対応するのはSHA256とSHA1です）", ctx.c.line);
      const values = [];
      for (const single of ctx.enumerate(raw))
        for (const e of fileEntriesFor(ctx, single)) {
          const bytes = new TextEncoder().encode(fileContent(ctx, e));
          values.push(ctx.object(
            {
              Algorithm: algorithm,
              Hash: algorithm === "SHA256" ? sha256Hex(bytes) : sha1Hex(bytes),
              Path: e.path,
            },
            "FileHashInfo",
          ));
        }
      return [{ s: ctx.s, values }];
    },
  },
  /* ---- JSON / CSV / 文字列データ ---- */
  "convertto-json": {
    params: ["inputobject", "depth", "compress", "enumasstrings", "asarray", "escapehandling"],
    run(ctx) {
      if (ctx.params.escapehandling !== undefined &&
          txt(ctx, ctx.params.escapehandling).toLowerCase() !== "default")
        ctx.fail("未検証：ConvertTo-Json -EscapeHandling の非既定値は出力の細部を確定できないため停止します", ctx.c.line);
      const depth = ctx.params.depth !== undefined ? asNum(ctx, ctx.params.depth, "-Depth") : 2;
      const conv = (v, level) => {
        if (ctx.isUnknown(v)) ctx.fail("未確認：未確定値のJSON変換", ctx.c.line);
        if (v === null || v === undefined) return null;
        if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
        if (level > depth)
          ctx.fail("未検証：ConvertTo-Json の -Depth（" + depth + "）を超える入れ子の文字列化は確定できないため停止します", ctx.c.line);
        if (Array.isArray(v)) return v.map((x) => conv(x, level + 1));
        if (isHash(v))
          return Object.fromEntries([...v.entries].map(([k, x]) => [String(k), conv(x, level + 1)]));
        if (isObj(v))
          return Object.fromEntries(Object.entries(v.properties).map(([k, x]) => [k, conv(x, level + 1)]));
        ctx.fail("未対応：JSONへ変換できない値です", ctx.c.line);
      };
      let source;
      if (ctx.params.inputobject !== undefined || ctx.args.length)
        source = ctx.p("inputobject", 0, null);
      else if (ctx.hasInput)
        source = truthy(ctx.params.asarray) || ctx.input.length !== 1 ? ctx.input : ctx.input[0];
      else ctx.fail("ConvertTo-JsonにはInputObjectが必要です", ctx.c.line);
      if (truthy(ctx.params.asarray) && !Array.isArray(source)) source = [source];
      const data = conv(source, 1);
      return [{
        s: ctx.s,
        values: [truthy(ctx.params.compress) ? JSON.stringify(data) : JSON.stringify(data, null, 2)],
      }];
    },
  },
  "convertfrom-json": {
    params: ["inputobject", "ashashtable", "depth", "noduplicates", "noenumerate", "datekind"],
    run(ctx) {
      if (ctx.params.datekind !== undefined &&
          txt(ctx, ctx.params.datekind).toLowerCase() !== "string")
        ctx.fail("未検証：ConvertFrom-Json -DateKind の非既定値（日付への変換）は確定できないため停止します", ctx.c.line);
      let textIn;
      if (ctx.hasInput) textIn = ctx.input.map((v) => txt(ctx, v, "JSON文字列")).join("\n");
      else {
        const raw = ctx.p("inputobject", 0, null);
        if (raw === null || raw === undefined)
          ctx.fail("ConvertFrom-JsonにはInputObjectが必要です", ctx.c.line);
        textIn = txt(ctx, raw, "JSON文字列");
      }
      let parsed;
      try {
        parsed = JSON.parse(textIn);
      } catch {
        ctx.fail("JSONの解析に失敗しました", ctx.c.line);
      }
      const asHash = truthy(ctx.params.ashashtable);
      const conv = (v) => {
        if (Array.isArray(v)) return v.map(conv);
        if (v && typeof v === "object" && !isObj(v)) {
          const entries = Object.entries(v).map(([k, x]) => [k, conv(x)]);
          return asHash ? ctx.hash(entries) : ctx.object(Object.fromEntries(entries));
        }
        return v;
      };
      const value = conv(parsed);
      return [{
        s: ctx.s,
        values: truthy(ctx.params.noenumerate) ? [value] : ctx.enumerate(value),
      }];
    },
  },
  "test-json": {
    params: ["json", "schema", "depth"],
    run(ctx) {
      if (ctx.params.schema !== undefined)
        ctx.fail("未検証：Test-Json -Schema（JSONスキーマ検証）の意味論を確定できないため停止します", ctx.c.line);
      let textIn;
      if (ctx.hasInput) textIn = ctx.input.map((v) => txt(ctx, v, "JSON文字列")).join("\n");
      else {
        const raw = ctx.p("json", 0, null);
        if (raw === null || raw === undefined)
          ctx.fail("Test-Jsonには-Jsonが必要です", ctx.c.line);
        textIn = txt(ctx, raw, "JSON文字列");
      }
      let ok = true;
      try {
        JSON.parse(textIn);
      } catch {
        ok = false;
      }
      return [{ s: ctx.s, values: [ok] }];
    },
  },
  "convertfrom-stringdata": {
    params: ["stringdata", "delimiter"],
    run(ctx) {
      let textIn;
      if (ctx.hasInput) textIn = ctx.input.map((v) => txt(ctx, v, "文字列データ")).join("\n");
      else {
        const raw = ctx.p("stringdata", 0, null);
        if (raw === null || raw === undefined)
          ctx.fail("ConvertFrom-StringDataには-StringDataが必要です", ctx.c.line);
        textIn = txt(ctx, raw, "文字列データ");
      }
      const delim = ctx.params.delimiter !== undefined ? txt(ctx, ctx.params.delimiter) : "=";
      const entries = [],
        seen = new Set();
      for (const line of textIn.split(/\r\n|\r|\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const at = t.indexOf(delim);
        if (at < 0)
          ctx.fail("文字列データの行に区切りがありません：" + t, ctx.c.line);
        const key = t.slice(0, at).trim();
        if (seen.has(key.toLowerCase()))
          ctx.fail("文字列データのキーが重複しています：" + key, ctx.c.line);
        seen.add(key.toLowerCase());
        let value = "",
          rawVal = t.slice(at + delim.length).trim();
        for (let i = 0; i < rawVal.length; i++) {
          if (rawVal[i] === "\\" && i + 1 < rawVal.length) {
            const n = rawVal[++i];
            value += n === "n" ? "\n" : n === "r" ? "\r" : n === "\\" ? "\\" : "\\" + n;
          } else value += rawVal[i];
        }
        entries.push([key, value]);
      }
      return [{ s: ctx.s, values: [ctx.hash(entries)] }];
    },
  },
};

/* ---- CSV ヘルパー ---- */
function csvField(ctx, v, delim, mode) {
  const s = v === null || v === undefined ? "" : txt(ctx, v, "CSVの値");
  if (
    mode === "always" ||
    (mode !== "never" &&
      (s.includes(delim) || s.includes('"') || s.includes("\n") || s.includes("\r")))
  )
    return '"' + s.replaceAll('"', '""') + '"';
  return s;
}
function objectKeys(v) {
  if (isHash(v)) return [...v.entries.keys()].map(String);
  if (isObj(v)) return Object.keys(v.properties);
  return null;
}
function csvLines(ctx, values, opt) {
  const rows = values.filter((v) => v !== null && v !== undefined);
  if (!rows.length) return [];
  const header = objectKeys(rows[0]);
  if (!header)
    ctx.fail("未対応：CSV変換はプロパティを持つオブジェクトのみ対応します（スカラー値の変換は未対応）", ctx.c.line);
  const delim = opt.delimiter ?? ",",
    mode = (opt.usequotes ?? "asneeded").toLowerCase();
  const lines = [];
  if (opt.includetype)
    lines.push("#TYPE " + (isHash(rows[0]) ? "System.Collections.Hashtable" : rows[0].psType === "PSCustomObject" ? "System.Management.Automation.PSCustomObject" : rows[0].psType));
  lines.push(header.map((h) => csvField(ctx, h, delim, mode)).join(delim));
  for (const row of rows) {
    if (!objectKeys(row))
      ctx.fail("未対応：CSV変換はプロパティを持つオブジェクトのみ対応します", ctx.c.line);
    lines.push(
      header.map((h) => {
        const p = propOf(row, h);
        const v = p.found ? p.value : null;
        if (isObj(v) || Array.isArray(v))
          ctx.fail("未検証：CSVのセルに入れ子の値を含める変換は確定できないため停止します", ctx.c.line);
        return csvField(ctx, v, delim, mode);
      }).join(delim),
    );
  }
  return lines;
}
function parseCsv(text, delim) {
  const rows = [];
  let row = [], field = "", inQ = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") { inQ = true; continue; }
    if (ch === delim) { pushField(); continue; }
    if (ch === "\r") { if (text[i + 1] === "\n") i++; pushRow(); continue; }
    if (ch === "\n") { pushRow(); continue; }
    field += ch;
  }
  if (field !== "" || row.length) pushRow();
  return rows;
}
function csvToObjects(ctx, textIn, opt) {
  const delim = opt.delimiter ?? ",";
  const all = parseCsv(textIn, delim).filter(
    (r) => !(r.length === 1 && r[0] === ""),
  );
  if (!all.length) return [];
  let header, body;
  if (opt.header) {
    header = opt.header;
    body = all;
  } else {
    header = all[0];
    body = all.slice(1);
  }
  return body.map((r) => {
    if (r.length > header.length)
      ctx.fail("CSVの列数がヘッダーより多い行があります", ctx.c.line);
    const props = {};
    header.forEach((h, i) => { props[h] = r[i] ?? ""; });
    return ctx.object(props);
  });
}
function checkEncoding(ctx, enc) {
  if (enc === undefined) return;
  const e = txt(ctx, enc).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!["utf8", "utf8bom", "utf8nobom", "default", "string", "oem"].includes(e))
    ctx.fail("未検証：エンコーディング " + txt(ctx, enc) + " での読み書きは確定できないため停止します", ctx.c.line);
}

Object.assign(SUPPORTED, {
  "convertto-csv": {
    params: ["inputobject", "delimiter", "usequotes", "notypeinformation", "includetypeinformation", "quotefields"],
    run(ctx) {
      const values = ctx.params.inputobject !== undefined || ctx.args.length
        ? ctx.enumerate(ctx.p("inputobject", 0, null))
        : ctx.input;
      const opt = {
        delimiter: ctx.params.delimiter !== undefined ? txt(ctx, ctx.params.delimiter) : ",",
        usequotes: ctx.params.usequotes !== undefined ? txt(ctx, ctx.params.usequotes) : "asneeded",
      };
      if (ctx.params.quotefields !== undefined) opt.usequotes = "always";
      return [{
        s: ctx.s,
        values: csvLines(ctx, values, { ...opt, includetype: truthy(ctx.params.includetypeinformation) }),
      }];
    },
  },
  "convertfrom-csv": {
    params: ["inputobject", "delimiter", "header", "useculture"],
    run(ctx) {
      if (truthy(ctx.params.useculture))
        ctx.fail("未検証：ConvertFrom-Csv -UseCulture（カルチャの区切り文字）は確定できないため停止します", ctx.c.line);
      let textIn;
      if (ctx.hasInput) textIn = ctx.input.map((v) => txt(ctx, v, "CSV文字列")).join("\n");
      else {
        const raw = ctx.p("inputobject", 0, null);
        if (raw === null || raw === undefined)
          ctx.fail("ConvertFrom-CsvにはInputObjectが必要です", ctx.c.line);
        textIn = txt(ctx, raw, "CSV文字列");
      }
      return [{
        s: ctx.s,
        values: csvToObjects(ctx, textIn, {
          delimiter: ctx.params.delimiter !== undefined ? txt(ctx, ctx.params.delimiter) : ",",
          header: ctx.params.header !== undefined ? ctx.enumerate(ctx.params.header).map((v) => txt(ctx, v)) : null,
        }),
      }];
    },
  },
  "export-csv": {
    params: ["path", "literalpath", "inputobject", "delimiter", "usequotes", "quotefields", "notypeinformation", "includetypeinformation", "append", "noclobber", "force", "encoding", "confirm", "whatif"],
    run(ctx) {
      checkEncoding(ctx, ctx.params.encoding);
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Export-Csvには-Pathが必要です", ctx.c.line);
      const values = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      let lines = csvLines(ctx, values, {
        delimiter: ctx.params.delimiter !== undefined ? txt(ctx, ctx.params.delimiter) : ",",
        usequotes: ctx.params.quotefields !== undefined ? "always" : ctx.params.usequotes !== undefined ? txt(ctx, ctx.params.usequotes) : "asneeded",
        includetype: truthy(ctx.params.includetypeinformation),
      });
      if (truthy(ctx.params.whatif)) return [{ s: ctx.s, values: [] }];
      const pathStr = txt(ctx, raw),
        existing = ctx.fsEntry(ctx.s, pathStr, ctx.c.line),
        append = truthy(ctx.params.append);
      if (existing && truthy(ctx.params.noclobber) && !append)
        ctx.fail("モデルにファイルが既にあります（-NoClobber）：" + existing.path, ctx.c.line);
      if (append && existing?.type === "file" && typeof existing.content === "string" && existing.content !== "")
        lines = lines.slice(values.length && objectKeys(values.find((v) => v !== null && v !== undefined)) ? (truthy(ctx.params.includetypeinformation) ? 2 : 1) : 0);
      const content = lines.map((l) => l + "\r\n").join("");
      ctx.writeFile(ctx.s, pathStr, content, ctx.c.line, append);
      return [{ s: ctx.s, values: [] }];
    },
  },
  "import-csv": {
    params: ["path", "literalpath", "delimiter", "header", "encoding", "useculture"],
    run(ctx) {
      checkEncoding(ctx, ctx.params.encoding);
      if (truthy(ctx.params.useculture))
        ctx.fail("未検証：Import-Csv -UseCulture（カルチャの区切り文字）は確定できないため停止します", ctx.c.line);
      const raw = ctx.p("path", 0, ctx.params.literalpath);
      if (raw === null || raw === undefined)
        ctx.fail("Import-Csvには-Pathが必要です", ctx.c.line);
      const values = [];
      for (const single of ctx.enumerate(raw))
        for (const e of fileEntriesFor(ctx, single))
          values.push(...csvToObjects(ctx, fileContent(ctx, e), {
            delimiter: ctx.params.delimiter !== undefined ? txt(ctx, ctx.params.delimiter) : ",",
            header: ctx.params.header !== undefined ? ctx.enumerate(ctx.params.header).map((v) => txt(ctx, v)) : null,
          }));
      return [{ s: ctx.s, values }];
    },
  },
  /* ---- 値の比較・集計・文字列 ---- */
  "compare-object": {
    params: ["referenceobject", "differenceobject", "property", "syncwindow", "casesensitive", "excludedifferent", "includeequal", "passthru", "culture"],
    run(ctx) {
      if (ctx.params.culture !== undefined)
        ctx.fail("未検証：Compare-Object -Culture は確定できないため停止します", ctx.c.line);
      const ref = ctx.p("referenceobject", 0, null),
        diff = ctx.p("differenceobject", 1, null);
      if (ref === null || ref === undefined || diff === null || diff === undefined)
        ctx.fail("Compare-Objectには-ReferenceObjectと-DifferenceObjectが必要です", ctx.c.line);
      const sensitive = truthy(ctx.params.casesensitive),
        props = ctx.params.property !== undefined
          ? ctx.enumerate(ctx.params.property).map((v) => txt(ctx, v))
          : null;
      const eq = (a, b) =>
        props
          ? props.every((k) => valueEq(ctx, propOf(a, k).value, propOf(b, k).value, sensitive))
          : valueEq(ctx, a, b, sensitive);
      const refs = ctx.enumerate(ref),
        diffs = ctx.enumerate(diff),
        used = new Array(diffs.length).fill(false),
        out = [];
      const emit = (item, ind) => {
        if (truthy(ctx.params.passthru) && isObj(item) && !isHash(item)) {
          const clone = ctx.object({ ...item.properties, SideIndicator: ind }, item.psType);
          out.push(clone);
        } else if (truthy(ctx.params.passthru) && !isObj(item)) out.push(item);
        else out.push(ctx.object({ InputObject: item, SideIndicator: ind }));
      };
      for (const r of refs) {
        const at = diffs.findIndex((d, i) => !used[i] && eq(r, d));
        if (at >= 0) {
          used[at] = true;
          if (truthy(ctx.params.includeequal) || truthy(ctx.params.excludedifferent))
            emit(r, "==");
        } else if (!truthy(ctx.params.excludedifferent)) emit(r, "<=");
      }
      diffs.forEach((d, i) => {
        if (!used[i] && !truthy(ctx.params.excludedifferent)) emit(d, "=>");
      });
      return [{ s: ctx.s, values: out }];
    },
  },
  "group-object": {
    params: ["property", "inputobject", "noelement", "ashashtable", "asstring", "casesensitive", "culture"],
    run(ctx) {
      if (ctx.params.culture !== undefined)
        ctx.fail("未検証：Group-Object -Culture は確定できないため停止します", ctx.c.line);
      const values = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      const prop = ctx.p("property", 0, null);
      if (prop !== null && prop !== undefined && typeof prop === "object")
        ctx.fail("未対応：Group-Objectのスクリプトブロック形式の-Property", ctx.c.line);
      const sensitive = truthy(ctx.params.casesensitive),
        groups = new Map();
      for (const v of values) {
        if (v === null || v === undefined) continue;
        let keyVal = v;
        if (prop !== null && prop !== undefined) {
          const p = propOf(v, txt(ctx, prop));
          if (!p.found) continue;
          keyVal = p.value;
        }
        if (isObj(keyVal) || Array.isArray(keyVal))
          ctx.fail("未検証：Group-Objectのキーがオブジェクト／配列の場合は確定できないため停止します", ctx.c.line);
        const key = (sensitive ? "s:" : "i:") + canonical(ctx, keyVal);
        if (!groups.has(key)) groups.set(key, { name: keyVal, items: [] });
        groups.get(key).items.push(v);
      }
      if (truthy(ctx.params.ashashtable)) {
        const entries = [...groups.values()].map((g) => [
          truthy(ctx.params.asstring) ? txt(ctx, g.name, "グループ名") : g.name,
          g.items,
        ]);
        return [{ s: ctx.s, values: [ctx.hash(entries)] }];
      }
      const out = [...groups.values()].map((g) => {
        const props = { Name: g.name, Count: g.items.length };
        if (!truthy(ctx.params.noelement)) props.Group = g.items;
        return ctx.object(props, "GroupInfo");
      });
      return [{ s: ctx.s, values: out }];
    },
  },
  "get-unique": {
    params: ["inputobject", "casesensitive", "asstring"],
    run(ctx) {
      const values = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      const sensitive = truthy(ctx.params.casesensitive),
        asStr = truthy(ctx.params.asstring),
        out = [];
      for (const v of values) {
        if (!out.length) { out.push(v); continue; }
        const prev = out[out.length - 1],
          same = asStr
            ? (sensitive
                ? txt(ctx, prev) === txt(ctx, v)
                : txt(ctx, prev).toLowerCase() === txt(ctx, v).toLowerCase())
            : valueEq(ctx, prev, v, sensitive);
        if (!same) out.push(v);
      }
      return [{ s: ctx.s, values: out }];
    },
  },
  "join-string": {
    params: ["property", "separator", "inputobject", "singlequote", "doublequote", "outputprefix", "outputsuffix", "formatstring", "useculture"],
    run(ctx) {
      if (ctx.params.formatstring !== undefined)
        ctx.fail("未検証：Join-String -FormatString（-f書式演算子）は確定できないため停止します", ctx.c.line);
      if (truthy(ctx.params.useculture))
        ctx.fail("未検証：Join-String -UseCulture は確定できないため停止します", ctx.c.line);
      if (truthy(ctx.params.singlequote) && truthy(ctx.params.doublequote))
        ctx.fail("Join-Stringの-SingleQuoteと-DoubleQuoteは同時に指定できません", ctx.c.line);
      const values = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      const prop = ctx.params.property !== undefined ? txt(ctx, ctx.params.property) : null;
      const parts = values.map((v) => {
        let item = v;
        if (prop !== null) {
          const p = propOf(v, prop);
          item = p.found ? p.value : null;
        }
        let s = item === null || item === undefined ? "" : txt(ctx, item, "結合する値");
        if (truthy(ctx.params.singlequote)) s = "'" + s + "'";
        if (truthy(ctx.params.doublequote)) s = '"' + s + '"';
        return s;
      });
      // 既定の区切りは $OFS（既定値は空白1つ。Learn Join-String／
      // about_Preference_Variables）。
      const ofsKey = varKey(ctx.s, "OFS");
      const sep = ctx.params.separator !== undefined
        ? txt(ctx, ctx.params.separator)
        : ofsKey
          ? txt(ctx, ctx.s.vars[ofsKey], "$OFS")
          : " ";
      const joined =
        (ctx.params.outputprefix !== undefined ? txt(ctx, ctx.params.outputprefix) : "") +
        parts.join(sep) +
        (ctx.params.outputsuffix !== undefined ? txt(ctx, ctx.params.outputsuffix) : "");
      return [{ s: ctx.s, values: [joined] }];
    },
  },
  "select-string": {
    params: ["pattern", "inputobject", "path", "literalpath", "casesensitive", "quiet", "list", "allmatches", "notmatch", "simplematch", "context", "encoding", "culture", "raw"],
    run(ctx) {
      if (truthy(ctx.params.allmatches))
        ctx.fail("未検証：Select-String -AllMatches（Matchesコレクション）はモデル化されていないため停止します", ctx.c.line);
      if (ctx.params.context !== undefined)
        ctx.fail("未検証：Select-String -Context（前後の文脈行）は確定できないため停止します", ctx.c.line);
      if (ctx.params.culture !== undefined)
        ctx.fail("未検証：Select-String -Culture は確定できないため停止します", ctx.c.line);
      checkEncoding(ctx, ctx.params.encoding);
      const patterns = ctx.enumerate(ctx.p("pattern", 0, null)).map((v) => txt(ctx, v, "パターン"));
      if (!patterns.length || patterns.some((p) => p === ""))
        ctx.fail("Select-Stringには-Patternが必要です", ctx.c.line);
      const sensitive = truthy(ctx.params.casesensitive),
        simple = truthy(ctx.params.simplematch),
        notMatch = truthy(ctx.params.notmatch);
      const matchers = patterns.map((p) => {
        if (simple)
          return (line) => (sensitive ? line.includes(p) : line.toLowerCase().includes(p.toLowerCase()));
        if (/\(\?|\\[pP]/.test(p))
          ctx.fail("未対応：.NET固有の正規表現（Select-String -Pattern）", ctx.c.line);
        let re;
        try {
          re = new RegExp(p, sensitive ? "" : "i");
        } catch {
          ctx.fail("正規表現が不正です：" + p, ctx.c.line);
        }
        return (line) => re.test(line);
      });
      const targets = [];
      const pathRaw = ctx.params.path !== undefined ? ctx.params.path : ctx.params.literalpath;
      if (pathRaw !== undefined) {
        for (const single of ctx.enumerate(pathRaw))
          for (const e of fileEntriesFor(ctx, single))
            targets.push({
              path: e.path,
              filename: e.path.split("\\").at(-1),
              lines: splitLines(fileContent(ctx, e)),
            });
      } else {
        const inputs = ctx.params.inputobject !== undefined
          ? ctx.enumerate(ctx.params.inputobject)
          : ctx.input;
        for (const v of inputs)
          targets.push({ path: null, filename: null, lines: splitLines(txt(ctx, v, "入力文字列")) });
      }
      if (!targets.length)
        ctx.fail("Select-Stringには-PathまたはInputObjectが必要です", ctx.c.line);
      const quiet = truthy(ctx.params.quiet),
        list = truthy(ctx.params.list),
        out = [];
      let any = false;
      for (const t of targets) {
        let listed = false;
        t.lines.forEach((line, i) => {
          if (listed) return;
          const at = matchers.findIndex((m) => m(line));
          const hit = notMatch ? at < 0 : at >= 0;
          if (!hit) return;
          any = true;
          if (quiet) return;
          out.push(ctx.object(
            {
              LineNumber: i + 1,
              Line: line,
              Pattern: notMatch ? patterns[0] : patterns[at],
              Path: t.path,
              Filename: t.filename,
            },
            "MatchInfo",
          ));
          if (list) listed = true;
        });
      }
      return [{ s: ctx.s, values: quiet ? [any] : out }];
    },
  },
});

let runtimeCounter = 0;
const runtimeUnknown = (ctx, source, key, valueType) => {
  const u = { ...ctx.unknown(source, "ps:adv:" + key + ":" + ++runtimeCounter) };
  if (valueType) u.valueType = valueType;
  return u;
};
function randomRun(ctx) {
  const countRaw = ctx.params.count !== undefined ? asNum(ctx, ctx.params.count, "-Count") : 1;
  if (!Number.isInteger(countRaw) || countRaw < 1)
    ctx.fail("Get-Randomの-Countは1以上の整数が必要です", ctx.c.line);
  const collection = ctx.params.inputobject !== undefined
    ? ctx.enumerate(ctx.params.inputobject)
    : ctx.hasInput
      ? ctx.input
      : null;
  if (truthy(ctx.params.shuffle)) {
    if (!collection)
      ctx.fail("Get-Random -ShuffleにはInputObjectが必要です", ctx.c.line);
    return [{
      s: ctx.s,
      values: [collection.map(() => runtimeUnknown(ctx, "シャッフル後の要素", "random:shuffle"))],
    }];
  }
  const values = [];
  for (let i = 0; i < countRaw; i++)
    values.push(
      collection
        ? runtimeUnknown(ctx, "乱数で選ばれた要素", "random:item")
        : runtimeUnknown(ctx, "実行時に決まる乱数", "random:number", "number"),
    );
  return [{ s: ctx.s, values }];
}
Object.assign(SUPPORTED, {
  "get-random": {
    params: ["inputobject", "maximum", "minimum", "count", "setseed", "shuffle"],
    run: randomRun,
  },
  "get-securerandom": {
    params: ["inputobject", "maximum", "minimum", "count", "shuffle"],
    run: randomRun,
  },
  "new-guid": {
    params: [],
    run(ctx) {
      return [{ s: ctx.s, values: [runtimeUnknown(ctx, "実行時に生成されるGUID", "guid", "string")] }];
    },
  },
  "get-date": {
    params: ["date", "year", "month", "day", "hour", "minute", "second", "millisecond", "displayhint", "format", "uformat", "asutc", "unixtimeseconds"],
    run(ctx) {
      const hasFormat = ctx.params.format !== undefined,
        hasUFormat = ctx.params.uformat !== undefined;
      if (hasFormat && hasUFormat)
        ctx.fail("Get-Dateの-Formatと-UFormatは同時に指定できません", ctx.c.line);
      let comps = null,
        kind = "Unspecified";
      if (ctx.params.unixtimeseconds !== undefined) {
        const sec = asNum(ctx, ctx.params.unixtimeseconds, "-UnixTimeSeconds");
        const dt = new Date(sec * 1000);
        if (Number.isNaN(dt.getTime()))
          ctx.fail("Get-Dateの-UnixTimeSecondsが範囲外です", ctx.c.line);
        comps = {
          y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(),
          h: dt.getUTCHours(), mi: dt.getUTCMinutes(), se: dt.getUTCSeconds(),
          ms: dt.getUTCMilliseconds(),
        };
        kind = "Utc";
      } else if (ctx.params.date !== undefined || ctx.args.length) {
        const raw = ctx.p("date", 0, null);
        if (ctx.isUnknown(raw))
          return [{ s: ctx.s, values: [runtimeUnknown(ctx, "実行時に決まる日時", "get-date")] }];
        if (isDateTime(raw)) {
          comps = dateComps(raw);
          kind = raw.properties.Kind || "Unspecified";
        } else if (typeof raw === "string") {
          comps = parseISODate(ctx, raw);
          if (!comps)
            ctx.fail("未検証：Get-Date -Date の文字列解析はカルチャに依存するため、ISO形式（yyyy-MM-dd[THH:mm:ss]）以外は確定できません", ctx.c.line);
        } else
          ctx.fail("Get-Dateの-Dateへ変換できない値です", ctx.c.line);
      }
      if (!comps) {
        // モデルに現在時刻の慣行は無いため、現在日時は未確定値として返す。
        return [{
          s: ctx.s,
          values: [hasFormat || hasUFormat
            ? runtimeUnknown(ctx, "実行時に決まる現在日時の文字列", "get-date:format", "string")
            : runtimeUnknown(ctx, "実行時に決まる現在の日時", "get-date:now")],
        }];
      }
      const over = {
        year: "y", month: "mo", day: "d", hour: "h",
        minute: "mi", second: "se", millisecond: "ms",
      };
      for (const [param, key] of Object.entries(over))
        if (ctx.params[param] !== undefined)
          comps[key] = asNum(ctx, ctx.params[param], "-" + param);
      if (truthy(ctx.params.asutc) && kind !== "Utc")
        ctx.fail("未検証：Get-Date -AsUTC（ローカル時刻からの変換）はタイムゾーンに依存するため確定できません", ctx.c.line);
      if (ctx.params.displayhint !== undefined &&
          !["date", "time", "datetime"].includes(txt(ctx, ctx.params.displayhint).toLowerCase()))
        ctx.fail("Get-Dateの-DisplayHintの値が不正です", ctx.c.line);
      const value = makeDateTime(ctx, comps, kind);
      if (!hasFormat && !hasUFormat) return [{ s: ctx.s, values: [value] }];
      const p = value.properties,
        p2 = (n) => String(n).padStart(2, "0"),
        p4 = (n) => String(n).padStart(4, "0");
      if (hasUFormat) {
        const fmt = txt(ctx, ctx.params.uformat);
        let out = "";
        for (let i = 0; i < fmt.length; i++) {
          if (fmt[i] !== "%") { out += fmt[i]; continue; }
          const t = fmt[++i];
          if (t === undefined) ctx.fail("Get-Dateの-UFormatが%で終わっています", ctx.c.line);
          const table = {
            Y: p4(p.Year), y: p2(p.Year % 100), m: p2(p.Month), d: p2(p.Day),
            H: p2(p.Hour), M: p2(p.Minute), S: p2(p.Second),
            F: p4(p.Year) + "-" + p2(p.Month) + "-" + p2(p.Day),
            T: p2(p.Hour) + ":" + p2(p.Minute) + ":" + p2(p.Second),
            R: p2(p.Hour) + ":" + p2(p.Minute),
            D: p2(p.Month) + "/" + p2(p.Day) + "/" + p4(p.Year),
            j: String(p.DayOfYear), e: String(p.Day),
            "%": "%",
          };
          if (t === "s") {
            if (kind !== "Utc")
              ctx.fail("未検証：Get-Date -UFormat %s（エポック秒）はUTC基準の日時でのみ確定できます", ctx.c.line);
            out += String(Math.floor(Date.UTC(p.Year, p.Month - 1, p.Day, p.Hour, p.Minute, p.Second, p.Millisecond) / 1000));
          } else if (table[t] !== undefined) out += table[t];
          else
            ctx.fail("未検証：Get-Date -UFormat %" + t + "（名前・タイムゾーン等の指定子）は確定できないため停止します", ctx.c.line);
        }
        return [{ s: ctx.s, values: [out] }];
      }
      const fmt = txt(ctx, ctx.params.format);
      if (fmt.length === 1) {
        if (fmt === "s")
          return [{ s: ctx.s, values: [p4(p.Year) + "-" + p2(p.Month) + "-" + p2(p.Day) + "T" + p2(p.Hour) + ":" + p2(p.Minute) + ":" + p2(p.Second)] }];
        if (fmt === "u")
          return [{ s: ctx.s, values: [p4(p.Year) + "-" + p2(p.Month) + "-" + p2(p.Day) + " " + p2(p.Hour) + ":" + p2(p.Minute) + ":" + p2(p.Second) + "Z"] }];
        if (fmt === "o" || fmt === "O") {
          if (kind !== "Utc")
            ctx.fail("未検証：Get-Date -Format o のオフセット表記はタイムゾーンに依存するため確定できません", ctx.c.line);
          return [{ s: ctx.s, values: [p4(p.Year) + "-" + p2(p.Month) + "-" + p2(p.Day) + "T" + p2(p.Hour) + ":" + p2(p.Minute) + ":" + p2(p.Second) + "." + String(p.Millisecond * 10000).padStart(7, "0") + "Z"] }];
        }
        ctx.fail("未検証：Get-Date -Format " + fmt + "（カルチャ依存の標準書式）は確定できないため停止します", ctx.c.line);
      }
      let out = "";
      for (let i = 0; i < fmt.length; i++) {
        const ch = fmt[i];
        if (ch === "'") {
          const end = fmt.indexOf("'", i + 1);
          if (end < 0) ctx.fail("Get-Dateの-Formatの引用符が閉じられていません", ctx.c.line);
          out += fmt.slice(i + 1, end);
          i = end;
          continue;
        }
        if (!/[a-zA-Z]/.test(ch)) { out += ch; continue; }
        const rest = fmt.slice(i);
        const token = ["yyyy", "fff", "yy", "MM", "dd", "HH", "hh", "mm", "ss", "ff", "tt", "M", "d", "H", "h", "m", "s", "f"]
          .find((t) => rest.startsWith(t));
        if (!token)
          ctx.fail("未検証：Get-Date -Format の指定子 '" + ch + "' は確定できないため停止します", ctx.c.line);
        const h12 = p.Hour % 12 === 0 ? 12 : p.Hour % 12;
        out += {
          yyyy: p4(p.Year), yy: p2(p.Year % 100),
          MM: p2(p.Month), M: String(p.Month),
          dd: p2(p.Day), d: String(p.Day),
          HH: p2(p.Hour), H: String(p.Hour),
          hh: p2(h12), h: String(h12),
          mm: p2(p.Minute), m: String(p.Minute),
          ss: p2(p.Second), s: String(p.Second),
          fff: String(p.Millisecond).padStart(3, "0"),
          ff: String(Math.floor(p.Millisecond / 10)).padStart(2, "0"),
          f: String(Math.floor(p.Millisecond / 100)),
          tt: p.Hour < 12 ? "AM" : "PM",
        }[token];
        i += token.length - 1;
      }
      return [{ s: ctx.s, values: [out] }];
    },
  },
  "new-timespan": {
    params: ["start", "end", "days", "hours", "minutes", "seconds", "milliseconds"],
    run(ctx) {
      const toComps = (v, what) => {
        if (isDateTime(v)) return dateComps(v);
        if (typeof v === "string") {
          const c = parseISODate(ctx, v);
          if (c) return c;
        }
        ctx.fail("未検証：" + what + "はDateTimeオブジェクトまたはISO形式の文字列でのみ確定できます", ctx.c.line);
      };
      if (ctx.params.start !== undefined || ctx.args.length) {
        const start = toComps(ctx.p("start", 0, null), "New-TimeSpan -Start");
        if (ctx.params.end === undefined && ctx.args.length < 2)
          return [{ s: ctx.s, values: [runtimeUnknown(ctx, "現在時刻までの時間間隔", "new-timespan")] }];
        const end = toComps(ctx.p("end", 1, null), "New-TimeSpan -End");
        const ms = (c) => Date.UTC(c.y, c.mo - 1, c.d, c.h, c.mi, c.se, c.ms);
        return [{ s: ctx.s, values: [makeTimeSpan(ctx, ms(end) - ms(start))] }];
      }
      const total =
        asNum(ctx, ctx.params.days ?? 0, "-Days") * 86400000 +
        asNum(ctx, ctx.params.hours ?? 0, "-Hours") * 3600000 +
        asNum(ctx, ctx.params.minutes ?? 0, "-Minutes") * 60000 +
        asNum(ctx, ctx.params.seconds ?? 0, "-Seconds") * 1000 +
        asNum(ctx, ctx.params.milliseconds ?? 0, "-Milliseconds");
      return [{ s: ctx.s, values: [makeTimeSpan(ctx, total)] }];
    },
  },
  "new-object": {
    params: ["typename", "argumentlist", "property"],
    run(ctx) {
      const type = txt(ctx, ctx.p("typename", 0, ""), "-TypeName").toLowerCase();
      if (["pscustomobject", "system.management.automation.pscustomobject", "psobject", "system.management.automation.psobject"].includes(type)) {
        if (ctx.params.argumentlist !== undefined)
          ctx.fail("未対応：New-Object PSObjectへの-ArgumentList", ctx.c.line);
        const prop = ctx.params.property;
        if (prop === null || prop === undefined) return [{ s: ctx.s, values: [ctx.object({})] }];
        if (isHash(prop))
          return [{ s: ctx.s, values: [ctx.object(Object.fromEntries(prop.entries))] }];
        if (isObj(prop)) return [{ s: ctx.s, values: [ctx.object({ ...prop.properties })] }];
        ctx.fail("New-Objectの-Propertyはハッシュテーブルが必要です", ctx.c.line);
      }
      ctx.fail("未対応：New-Object -TypeName " + txt(ctx, ctx.p("typename", 0, "")) + "（.NET型の生成はモデル化されていません）", ctx.c.line);
    },
  },
  "add-member": {
    params: ["inputobject", "membertype", "name", "value", "secondvalue", "passthru", "force", "typename"],
    run(ctx) {
      const memberType = txt(ctx, ctx.p("membertype", 0, "NoteProperty"), "-MemberType");
      if (memberType.toLowerCase() !== "noteproperty")
        ctx.fail("未対応：Add-Member -MemberType " + memberType + "（モデルで対応するのはNotePropertyのみです）", ctx.c.line);
      const name = txt(ctx, ctx.p("name", 1, null), "-Name");
      if (name === null || name === undefined)
        ctx.fail("Add-Memberには-Nameが必要です", ctx.c.line);
      const value = ctx.p("value", 2, null);
      const targets = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      if (!targets.length)
        ctx.fail("Add-MemberにはInputObjectが必要です", ctx.c.line);
      for (const t of targets) {
        if (!isObj(t) || isHash(t) || t.psType !== "PSCustomObject")
          ctx.fail("未対応：Add-Memberの対象はPSCustomObjectのみです", ctx.c.line);
        const exists = Object.keys(t.properties).some((k) => k.toLowerCase() === name.toLowerCase());
        if (exists && !truthy(ctx.params.force))
          ctx.fail("メンバー " + name + " は既に存在します（Add-Member）", ctx.c.line);
        setVarLike(t.properties, name, value);
      }
      return [{ s: ctx.s, values: truthy(ctx.params.passthru) ? targets : [] }];
    },
  },
});
/* ================= FIX-PS-B: 格上げ実装 =================
 * 根拠は T2 報告書 §3 の導出と Learn（PowerShell 7.4、2026-11-18 取得）。
 * 確定できない形式は捏造せず、名指しで未検証停止に倒す。 */
/* ---- Markdown オプション（セッション状態は s.ps に保持する。実行ごとに
 * 状態オブジェクトが作り直されるため、再実行へは漏れない） ---- */
const MD_OPTION_KEYS = [
  "Header1", "Header2", "Header3", "Header4", "Header5", "Header6",
  "Code", "Link", "Image", "EmphasisBold", "EmphasisItalics",
];
const MD_DEFAULTS = {
  Header1: "[7m", Header2: "[4;93m", Header3: "[4;94m", Header4: "[4;95m",
  Header5: "[4;96m", Header6: "[4;97m",
  Code: "[48;2;155;155;155;38;2;30;30;30m",
  Link: "[4;38;5;117m", Image: "[33m",
  EmphasisBold: "[1m", EmphasisItalics: "[36m",
};
const MD_LIGHT = {
  ...MD_DEFAULTS,
  Header2: "[4;33m", Header3: "[4;34m", Header4: "[4;35m", Header6: "[4;30m",
};
const MD_PARAM_TO_KEY = {
  header1color: "Header1", header2color: "Header2", header3color: "Header3",
  header4color: "Header4", header5color: "Header5", header6color: "Header6",
  code: "Code", linkforegroundcolor: "Link",
  imagealttextforegroundcolor: "Image",
  boldforegroundcolor: "EmphasisBold",
  italicsforegroundcolor: "EmphasisItalics",
};
const MD_VALUE_RE = /^\[*[0-9;]*?m{1}/;
function mdState(ctx) {
  if (!ctx.s.ps.markdownOption)
    ctx.s.ps.markdownOption = { ...MD_DEFAULTS };
  return ctx.s.ps.markdownOption;
}
function mdObject(ctx) {
  const st = mdState(ctx),
    props = {};
  for (const k of MD_OPTION_KEYS) props[k] = st[k];
  return ctx.object(props, "PSMarkdownOptionInfo");
}
function mdValidate(ctx, value, paramName) {
  const v = txt(ctx, value, "MarkdownOptionの値");
  if (!MD_VALUE_RE.test(v))
    ctx.fail(
      "Set-MarkdownOption: " + paramName + " の値 '" + v +
        "' は検証パターン（^\\[*[0-9;]*?m{1}）に一致しません",
      ctx.c.line,
    );
  return v;
}
/* ---- Import-PowerShellDataFile 用の定数専用パーサ ----
 * about_Data_Files／Learn Import-PowerShellDataFile: .psd1 は定数値のみ。
 * 式・変数・コマンド等が現れたら実 PS どおりエラーにする。 */
function parsePsd1(ctx, source) {
  let pos = 0,
    nodes = 0,
    keys = 0;
  const skipTrivia = () => {
    for (;;) {
      while (pos < source.length && /[ \t\r]/.test(source[pos])) pos++;
      if (source[pos] === "#") {
        while (pos < source.length && source[pos] !== "\n") pos++;
        continue;
      }
      break;
    }
  };
  const failCode = () =>
    ctx.fail(
      "Import-PowerShellDataFile：データファイルに式またはコードが含まれています（.psd1 では定数値のみが許可されます）",
      ctx.c.line,
    );
  function parseString() {
    const q = source[pos];
    pos++;
    let out = "";
    if (q === "'") {
      for (;;) {
        if (pos >= source.length) failCode();
        if (source[pos] === "'") {
          if (source[pos + 1] === "'") { out += "'"; pos += 2; continue; }
          pos++;
          return out;
        }
        out += source[pos++];
      }
    }
    for (;;) {
      if (pos >= source.length) failCode();
      const ch = source[pos];
      // 変数展開・サブ式・バックスティックエスケープは式なので定数にしない
      if (ch === "$" || ch === "`") failCode();
      if (ch === '"') { pos++; return out; }
      out += source[pos++];
    }
  }
  function parseValue() {
    nodes++;
    skipTrivia();
    const ch = source[pos];
    if (ch === "@" && source[pos + 1] === "{") return parseHash();
    if (ch === "@" && source[pos + 1] === "(") return parseArray();
    if (ch === "'" || ch === '"') return parseString();
    if (ch === "$") {
      const m = source.slice(pos).match(/^\$(true|false|null)\b/i);
      if (!m) failCode();
      pos += m[0].length;
      return m[1].toLowerCase() === "null"
        ? null
        : m[1].toLowerCase() === "true";
    }
    const num = source
      .slice(pos)
      .match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (num) {
      pos += num[0].length;
      return Number(num[0]);
    }
    failCode();
  }
  function parseArray() {
    pos += 2;
    const items = [];
    skipTrivia();
    if (source[pos] === ")") { pos++; return items; }
    for (;;) {
      items.push(parseValue());
      skipTrivia();
      if (source[pos] === ",") { pos++; skipTrivia(); continue; }
      if (source[pos] === ")") { pos++; return items; }
      failCode();
    }
  }
  function parseHash() {
    pos += 2;
    const entries = new Map();
    for (;;) {
      skipTrivia();
      if (pos >= source.length) failCode();
      if (source[pos] === "}") { pos++; break; }
      let key;
      const ch = source[pos];
      if (ch === "'" || ch === '"') key = parseString();
      else {
        const m = source.slice(pos).match(/^[A-Za-z_][\w.-]*/);
        if (!m) failCode();
        key = m[0];
        pos += m[0].length;
      }
      keys++;
      nodes++;
      skipTrivia();
      if (source[pos] !== "=") failCode();
      pos++;
      entries.set(key, parseValue());
      skipTrivia();
      if (source[pos] === ";" || source[pos] === "\n") {
        while (pos < source.length && (source[pos] === ";" || source[pos] === "\n" || source[pos] === " " || source[pos] === "\t" || source[pos] === "\r")) {
          if (source[pos] === "#") {
            while (pos < source.length && source[pos] !== "\n") pos++;
          } else pos++;
        }
      }
    }
    return ctx.hash([...entries]);
  }
  skipTrivia();
  if (source[pos] === "\n") { pos++; skipTrivia(); }
  if (!(source[pos] === "@" && source[pos + 1] === "{")) failCode();
  const result = parseValue();
  skipTrivia();
  if (pos < source.length && source[pos] === "\n") { pos++; skipTrivia(); }
  if (pos < source.length) failCode();
  return { value: result, nodes, keys };
}
/* ---- ConvertTo-Html ---- */
const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function htmlCellText(ctx, v) {
  if (v === null || v === undefined) return "";
  if (isObj(v) || Array.isArray(v))
    ctx.fail(
      "未検証：ConvertTo-Html の入れ子オブジェクトの文字列表現は確定できないため停止します",
      ctx.c.line,
    );
  return escapeHtml(txt(ctx, v, "セルの値"));
}
Object.assign(SUPPORTED, {
  "convertto-html": {
    params: ["inputobject", "property", "body", "head", "title", "as", "cssuri", "fragment", "postcontent", "precontent", "charset", "meta", "transitional"],
    run(ctx) {
      if (ctx.params.meta !== undefined)
        ctx.fail("未検証：ConvertTo-Html -Meta（meta タグの生成形式）は Learn に示されていないため停止します", ctx.c.line);
      if (ctx.params.charset !== undefined)
        ctx.fail("未検証：ConvertTo-Html -Charset（meta charset の生成形式）は Learn に示されていないため停止します", ctx.c.line);
      const fragment = truthy(ctx.params.fragment);
      if (fragment) {
        for (const p of ["head", "title", "body", "cssuri"])
          if (ctx.params[p] !== undefined)
            ctx.fail("ConvertTo-Html の -Fragment は -Head／-Title／-Body／-CssUri と同時に指定できません（パラメータセットが異なります）", ctx.c.line);
      }
      const asRaw = ctx.params.as !== undefined
        ? txt(ctx, ctx.params.as, "-As").toLowerCase()
        : "table";
      if (!["table", "list"].includes(asRaw))
        ctx.fail("ConvertTo-Html -As には Table または List を指定してください", ctx.c.line);
      // 対象オブジェクトの収集
      let objects;
      if (ctx.params.inputobject !== undefined) {
        if (Array.isArray(ctx.params.inputobject))
          ctx.fail("未検証：ConvertTo-Html -InputObject への配列の指定（配列そのものを表にする形式）は確定できないため停止します", ctx.c.line);
        objects = [ctx.params.inputobject];
      } else objects = ctx.input;
      for (const o of objects)
        if (!isObj(o))
          ctx.fail("未検証：ConvertTo-Html のスカラー値の変換は確定できないため停止します", ctx.c.line);
      // 列の決定
      let columns = null;
      const propRaw = ctx.p("property", 0, null);
      if (propRaw !== null && propRaw !== undefined) {
        columns = [];
        for (const item of ctx.enumerate(propRaw)) {
          if (typeof item === "string") {
            columns.push({ name: item, label: item });
            continue;
          }
          if (isHash(item) || isObj(item)) {
            const get = (n) => {
              const got = propOf(item, n);
              return got.found ? got.value : undefined;
            };
            if (get("width") !== undefined || get("alignment") !== undefined || get("formatstring") !== undefined)
              ctx.fail("未検証：ConvertTo-Html の計算プロパティの Width／Alignment／FormatString は確定できないため停止します", ctx.c.line);
            const expr = get("expression");
            if (expr && typeof expr === "object")
              ctx.fail("未検証：ConvertTo-Html の計算プロパティ（スクリプトブロックの Expression）は確定できないため停止します", ctx.c.line);
            const name = get("name") ?? get("label") ?? (typeof expr === "string" ? expr : null);
            if (name === null || name === undefined)
              ctx.fail("ConvertTo-Html の計算プロパティには Name（または Label）が必要です", ctx.c.line);
            columns.push({
              name: typeof expr === "string" ? expr : name,
              label: get("label") ?? name,
            });
            continue;
          }
          ctx.fail("未対応：ConvertTo-Html -Property へのこの形式の指定", ctx.c.line);
        }
      } else if (objects.length) {
        const first = objects[0];
        const names = isHash(first)
          ? [...first.entries.keys()].map(String)
          : Object.keys(first.properties);
        columns = names.map((n) => ({ name: n, label: n }));
      }
      const cellOf = (o, name) => {
        const got = propOf(o, name);
        return got.found ? htmlCellText(ctx, got.value) : "";
      };
      // 表の行。文字列配列への分割は Learn の例示出力の構造要素単位に
      // 合わせる（行分割位置の細部は Learn からは確定できないため、
      // この慣行を reference の caution にも開示している）。
      const tableLines = [];
      if (asRaw === "table") {
        const cols = columns ?? [];
        tableLines.push("<table>");
        tableLines.push(
          "<colgroup>" + cols.map(() => "<col />").join("") + "</colgroup>",
        );
        if (objects.length) {
          tableLines.push(
            "<tr>" + cols.map((c) => "<th>" + escapeHtml(c.label) + "</th>").join("") + "</tr>",
          );
          for (const o of objects)
            tableLines.push(
              "<tr>" + cols.map((c) => "<td>" + cellOf(o, c.name) + "</td>").join("") + "</tr>",
            );
        }
        tableLines.push("</table>");
      } else {
        for (const o of objects) {
          const names = isHash(o)
            ? [...o.entries.keys()].map(String)
            : Object.keys(o.properties);
          tableLines.push("<table>");
          tableLines.push("<colgroup><col /><col /></colgroup>");
          for (const n of names)
            tableLines.push(
              "<tr><th>" + escapeHtml(n) + "</th><td>" + cellOf(o, n) + "</td></tr>",
            );
          tableLines.push("</table>");
        }
      }
      const contentLines = (v) =>
        v === undefined
          ? []
          : ctx.enumerate(v).map((x) => txt(ctx, x, "内容"));
      const pre = contentLines(ctx.params.precontent),
        post = contentLines(ctx.params.postcontent);
      if (fragment)
        return [{ s: ctx.s, values: [...pre, ...tableLines, ...post] }];
      const doctype = truthy(ctx.params.transitional)
        ? '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"  "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'
        : '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"  "https://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">';
      const headLines = [];
      if (ctx.params.head !== undefined)
        headLines.push(...contentLines(ctx.params.head));
      else
        headLines.push(
          "<title>" +
            (ctx.params.title !== undefined
              ? txt(ctx, ctx.params.title, "-Title")
              : "HTML TABLE") +
            "</title>",
        );
      if (ctx.params.cssuri !== undefined)
        headLines.push(
          '<link rel="stylesheet" type="text/css" href="' +
            txt(ctx, ctx.params.cssuri, "-CssUri") +
            '" />',
        );
      const lines = [
        doctype,
        "<html>",
        "<head>",
        ...headLines,
        "</head>",
        "<body>",
        ...contentLines(ctx.params.body),
        ...pre,
        ...tableLines,
        ...post,
        "</body>",
        "</html>",
      ];
      return [{ s: ctx.s, values: lines }];
    },
  },
  "get-markdownoption": {
    params: [],
    run(ctx) {
      return [{ s: ctx.s, values: [mdObject(ctx)] }];
    },
  },
  "set-markdownoption": {
    params: ["header1color", "header2color", "header3color", "header4color", "header5color", "header6color", "code", "imagealttextforegroundcolor", "linkforegroundcolor", "italicsforegroundcolor", "boldforegroundcolor", "theme", "inputobject", "passthru"],
    run(ctx) {
      const individual = Object.keys(MD_PARAM_TO_KEY).filter(
        (p) => ctx.params[p] !== undefined,
      );
      const hasTheme = ctx.params.theme !== undefined,
        hasInput = ctx.params.inputobject !== undefined;
      if ((hasTheme && (individual.length || hasInput)) ||
          (hasInput && individual.length))
        ctx.fail(
          "Set-MarkdownOption：パラメータセットが競合しています（個別設定／-Theme／-InputObject は同時に指定できません）",
          ctx.c.line,
        );
      const st = mdState(ctx);
      if (hasTheme) {
        const theme = txt(ctx, ctx.params.theme, "-Theme").toLowerCase();
        if (theme !== "dark" && theme !== "light")
          ctx.fail("Set-MarkdownOption -Theme には Dark または Light を指定してください", ctx.c.line);
        Object.assign(st, theme === "light" ? MD_LIGHT : MD_DEFAULTS);
      } else if (hasInput) {
        const input = ctx.params.inputobject;
        if (!isObj(input))
          ctx.fail("Set-MarkdownOption -InputObject には PSMarkdownOptionInfo オブジェクトが必要です", ctx.c.line);
        for (const key of MD_OPTION_KEYS) {
          const got = propOf(input, key);
          if (got.found && got.value !== null && got.value !== undefined)
            st[key] = mdValidate(ctx, got.value, "-" + key);
        }
      } else {
        for (const p of individual)
          st[MD_PARAM_TO_KEY[p]] = mdValidate(ctx, ctx.params[p], "-" + p);
      }
      return [{
        s: ctx.s,
        values: truthy(ctx.params.passthru) ? [mdObject(ctx)] : [],
      }];
    },
  },
  "import-powershelldatafile": {
    params: ["path", "literalpath", "skiplimitcheck"],
    run(ctx) {
      let entry;
      if (ctx.params.literalpath !== undefined) {
        const rawPath = txt(ctx, ctx.params.literalpath, "パス");
        entry = ctx.fsEntry(ctx.s, rawPath, ctx.c.line);
        if (!entry || entry.type !== "file")
          ctx.fail("モデルにファイルがありません：" + rawPath, ctx.c.line);
      } else {
        const raw = ctx.p("path", 0, null);
        if (raw === null || raw === undefined)
          ctx.fail("Import-PowerShellDataFileには-Pathが必要です", ctx.c.line);
        // Learn: 複数ファイルに一致しても最初のファイルだけを読み込む
        entry = fileEntriesFor(ctx, raw)[0];
      }
      const { value, nodes, keys } = parsePsd1(ctx, fileContent(ctx, entry));
      if (!truthy(ctx.params.skiplimitcheck)) {
        if (keys > 500)
          ctx.fail("Import-PowerShellDataFile：データファイルのキー数が制限（500）を超えています。制限を外すには -SkipLimitCheck を指定してください", ctx.c.line);
        if (nodes > 5000)
          ctx.fail("Import-PowerShellDataFile：データファイルの AST ノード数が制限（5000）を超えています。制限を外すには -SkipLimitCheck を指定してください", ctx.c.line);
      }
      return [{ s: ctx.s, values: [value] }];
    },
  },
  "update-list": {
    params: ["inputobject", "property", "add", "remove", "replace", "passthru"],
    run(ctx) {
      const hasAdd = ctx.params.add !== undefined,
        hasRemove = ctx.params.remove !== undefined,
        hasReplace = ctx.params.replace !== undefined;
      if (hasReplace && (hasAdd || hasRemove))
        ctx.fail("Update-List の -Replace は -Add／-Remove と同時に指定できません", ctx.c.line);
      if (!hasAdd && !hasRemove && !hasReplace)
        ctx.fail("Update-List には -Add／-Remove／-Replace のいずれかが必要です", ctx.c.line);
      const addVals = hasAdd ? ctx.enumerate(ctx.params.add) : [],
        removeVals = hasRemove ? ctx.enumerate(ctx.params.remove) : [],
        replaceVals = hasReplace ? ctx.enumerate(ctx.params.replace) : [];
      if (ctx.params.property === undefined) {
        // -Property 省略時は変更セットのハッシュテーブルを返す
        const entries = [];
        if (hasAdd) entries.push(["Add", addVals]);
        if (hasRemove) entries.push(["Remove", removeVals]);
        if (hasReplace) entries.push(["Replace", replaceVals]);
        return [{ s: ctx.s, values: [ctx.hash(entries)] }];
      }
      const propName = txt(ctx, ctx.params.property, "-Property"),
        targets = ctx.params.inputobject !== undefined
          ? ctx.enumerate(ctx.params.inputobject)
          : ctx.input;
      if (!targets.length)
        ctx.fail("Update-List には対象オブジェクトが必要です", ctx.c.line);
      for (const t of targets) {
        if (!isObj(t) || isHash(t))
          ctx.fail("Update-List の対象は PSCustomObject である必要があります", ctx.c.line);
        const actualKey = Object.keys(t.properties).find(
          (k) => k.toLowerCase() === propName.toLowerCase(),
        );
        if (actualKey === undefined)
          ctx.fail("Update-List：プロパティ '" + propName + "' が対象オブジェクトにありません", ctx.c.line);
        const current = t.properties[actualKey];
        if (!Array.isArray(current))
          ctx.fail("Update-List：プロパティ '" + propName + "' は IList を実装していないため更新できません", ctx.c.line);
        if (hasReplace) t.properties[actualKey] = [...replaceVals];
        else {
          if (hasRemove)
            for (let i = current.length - 1; i >= 0; i--)
              if (removeVals.some((r) => valueEq(ctx, current[i], r)))
                current.splice(i, 1);
          if (hasAdd) current.push(...addVals);
        }
      }
      return [{ s: ctx.s, values: targets }];
    },
  },
  "measure-command": {
    params: ["expression", "inputobject", "argumentlist"],
    run(ctx) {
      const block =
        (ctx.args[0] && ctx.args[0].k === "block" ? ctx.args[0] : null) ??
        (ctx.c.params?.expression?.k === "block" ? ctx.c.params.expression : null);
      if (!block)
        ctx.fail("Measure-Commandには-Expression（スクリプトブロック）が必要です", ctx.c.line);
      if (typeof ctx.execBlock !== "function")
        ctx.fail("未対応：Measure-Commandのスクリプトブロック実行基盤がモデルにありません", ctx.c.line);
      const argList = ctx.params.argumentlist !== undefined
        ? ctx.enumerate(ctx.params.argumentlist)
        : undefined;
      let inputs;
      if (ctx.hasInput) inputs = ctx.input.map((v) => ({ has: true, item: v }));
      else if (ctx.params.inputobject !== undefined)
        inputs = ctx.enumerate(ctx.params.inputobject).map((v) => ({ has: true, item: v }));
      else inputs = [{ has: false }];
      // ブロックの出力は表示しない（破棄する）。所要時間はモデルでは
      // 実測できないため、Get-Date／Get-Random と同じ「実行時に決まる値」
      // の機構で TimeSpan 型の未確定値を返す。入力がある場合は入力ごとに
      // $_ で実行し、状態は順に引き継ぐ。実物は合計の計測時間を1つの
      // TimeSpan として返すため、返す値も入力の個数によらず1つにする
      // （入力ごとに結果を返すと同一状態が複製され、後段が二重実行される）。
      let states = [ctx.s];
      for (const entry of inputs) {
        const next = [];
        for (const st of states)
          for (const r of ctx.execBlock(block, st, {
            ...(entry.has ? { item: entry.item } : {}),
            args: argList,
          }))
            next.push(r.s);
        if (next.length) states = next;
      }
      return states.map((st) => ({
        s: st,
        values: [runtimeUnknown(ctx, "実行時に決まる計測時間", "measure-command:elapsed", "TimeSpan")],
      }));
    },
  },
});
function setVarLike(obj, name, v) {
  const k = Object.keys(obj).find((x) => x.toLowerCase() === String(name).toLowerCase()) || String(name);
  Object.defineProperty(obj, k, { value: v, writable: true, enumerable: true, configurable: true });
}

const CANONICAL_NAMES = {"add-history": "Add-History","clear-history": "Clear-History","clear-host": "Clear-Host","connect-pssession": "Connect-PSSession","debug-job": "Debug-Job","disable-experimentalfeature": "Disable-ExperimentalFeature","disable-psremoting": "Disable-PSRemoting","disable-pssessionconfiguration": "Disable-PSSessionConfiguration","disconnect-pssession": "Disconnect-PSSession","enable-experimentalfeature": "Enable-ExperimentalFeature","enable-psremoting": "Enable-PSRemoting","enable-pssessionconfiguration": "Enable-PSSessionConfiguration","enter-pshostprocess": "Enter-PSHostProcess","enter-pssession": "Enter-PSSession","exit-pshostprocess": "Exit-PSHostProcess","exit-pssession": "Exit-PSSession","export-modulemember": "Export-ModuleMember","get-command": "Get-Command","get-experimentalfeature": "Get-ExperimentalFeature","get-help": "Get-Help","get-history": "Get-History","get-job": "Get-Job","get-module": "Get-Module","get-pshostprocessinfo": "Get-PSHostProcessInfo","get-pssession": "Get-PSSession","get-pssessioncapability": "Get-PSSessionCapability","get-pssessionconfiguration": "Get-PSSessionConfiguration","get-pssubsystem": "Get-PSSubsystem","import-module": "Import-Module","invoke-command": "Invoke-Command","invoke-history": "Invoke-History","new-module": "New-Module","new-modulemanifest": "New-ModuleManifest","new-psrolecapabilityfile": "New-PSRoleCapabilityFile","new-pssession": "New-PSSession","new-pssessionconfigurationfile": "New-PSSessionConfigurationFile","new-pssessionoption": "New-PSSessionOption","new-pstransportoption": "New-PSTransportOption","out-default": "Out-Default","out-host": "Out-Host","out-null": "Out-Null","receive-job": "Receive-Job","receive-pssession": "Receive-PSSession","register-argumentcompleter": "Register-ArgumentCompleter","register-pssessionconfiguration": "Register-PSSessionConfiguration","remove-job": "Remove-Job","remove-module": "Remove-Module","remove-pssession": "Remove-PSSession","save-help": "Save-Help","set-psdebug": "Set-PSDebug","set-pssessionconfiguration": "Set-PSSessionConfiguration","set-strictmode": "Set-StrictMode","start-job": "Start-Job","stop-job": "Stop-Job","switch-process": "Switch-Process","tabexpansion2": "TabExpansion2","test-modulemanifest": "Test-ModuleManifest","test-pssessionconfigurationfile": "Test-PSSessionConfigurationFile","unregister-pssessionconfiguration": "Unregister-PSSessionConfiguration","update-help": "Update-Help","wait-job": "Wait-Job","start-transcript": "Start-Transcript","stop-transcript": "Stop-Transcript","clear-content": "Clear-Content","clear-item": "Clear-Item","clear-itemproperty": "Clear-ItemProperty","clear-recyclebin": "Clear-RecycleBin","convert-path": "Convert-Path","copy-itemproperty": "Copy-ItemProperty","debug-process": "Debug-Process","get-clipboard": "Get-Clipboard","get-computerinfo": "Get-ComputerInfo","get-hotfix": "Get-HotFix","get-item": "Get-Item","get-itemproperty": "Get-ItemProperty","get-itempropertyvalue": "Get-ItemPropertyValue","get-process": "Get-Process","get-psdrive": "Get-PSDrive","get-psprovider": "Get-PSProvider","get-service": "Get-Service","get-timezone": "Get-TimeZone","invoke-item": "Invoke-Item","join-path": "Join-Path","move-itemproperty": "Move-ItemProperty","new-itemproperty": "New-ItemProperty","new-psdrive": "New-PSDrive","new-service": "New-Service","pop-location": "Pop-Location","push-location": "Push-Location","remove-itemproperty": "Remove-ItemProperty","remove-psdrive": "Remove-PSDrive","remove-service": "Remove-Service","rename-computer": "Rename-Computer","rename-itemproperty": "Rename-ItemProperty","resolve-path": "Resolve-Path","restart-computer": "Restart-Computer","restart-service": "Restart-Service","resume-service": "Resume-Service","set-clipboard": "Set-Clipboard","set-item": "Set-Item","set-itemproperty": "Set-ItemProperty","set-service": "Set-Service","set-timezone": "Set-TimeZone","split-path": "Split-Path","start-process": "Start-Process","start-service": "Start-Service","stop-computer": "Stop-Computer","stop-process": "Stop-Process","stop-service": "Stop-Service","suspend-service": "Suspend-Service","test-connection": "Test-Connection","wait-process": "Wait-Process","convertfrom-securestring": "ConvertFrom-SecureString","convertto-securestring": "ConvertTo-SecureString","get-acl": "Get-Acl","get-authenticodesignature": "Get-AuthenticodeSignature","get-cmsmessage": "Get-CmsMessage","get-credential": "Get-Credential","get-executionpolicy": "Get-ExecutionPolicy","get-pfxcertificate": "Get-PfxCertificate","new-filecatalog": "New-FileCatalog","protect-cmsmessage": "Protect-CmsMessage","set-acl": "Set-Acl","set-authenticodesignature": "Set-AuthenticodeSignature","set-executionpolicy": "Set-ExecutionPolicy","test-filecatalog": "Test-FileCatalog","unprotect-cmsmessage": "Unprotect-CmsMessage","add-member": "Add-Member","add-type": "Add-Type","clear-variable": "Clear-Variable","compare-object": "Compare-Object","convertfrom-clixml": "ConvertFrom-CliXml","convertfrom-csv": "ConvertFrom-Csv","convertfrom-json": "ConvertFrom-Json","convertfrom-markdown": "ConvertFrom-Markdown","convertfrom-sddlstring": "ConvertFrom-SddlString","convertfrom-stringdata": "ConvertFrom-StringData","convertto-clixml": "ConvertTo-CliXml","convertto-csv": "ConvertTo-Csv","convertto-html": "ConvertTo-Html","convertto-json": "ConvertTo-Json","convertto-xml": "ConvertTo-Xml","debug-runspace": "Debug-Runspace","disable-psbreakpoint": "Disable-PSBreakpoint","disable-runspacedebug": "Disable-RunspaceDebug","enable-psbreakpoint": "Enable-PSBreakpoint","enable-runspacedebug": "Enable-RunspaceDebug","export-alias": "Export-Alias","export-clixml": "Export-Clixml","export-csv": "Export-Csv","export-formatdata": "Export-FormatData","export-pssession": "Export-PSSession","format-custom": "Format-Custom","format-hex": "Format-Hex","format-list": "Format-List","format-table": "Format-Table","format-wide": "Format-Wide","get-alias": "Get-Alias","get-culture": "Get-Culture","get-date": "Get-Date","get-error": "Get-Error","get-event": "Get-Event","get-eventsubscriber": "Get-EventSubscriber","get-filehash": "Get-FileHash","get-formatdata": "Get-FormatData","get-host": "Get-Host","get-markdownoption": "Get-MarkdownOption","get-member": "Get-Member","get-psbreakpoint": "Get-PSBreakpoint","get-pscallstack": "Get-PSCallStack","get-random": "Get-Random","get-runspace": "Get-Runspace","get-runspacedebug": "Get-RunspaceDebug","get-securerandom": "Get-SecureRandom","get-tracesource": "Get-TraceSource","get-typedata": "Get-TypeData","get-uiculture": "Get-UICulture","get-unique": "Get-Unique","get-uptime": "Get-Uptime","get-variable": "Get-Variable","get-verb": "Get-Verb","group-object": "Group-Object","import-alias": "Import-Alias","import-clixml": "Import-Clixml","import-csv": "Import-Csv","import-localizeddata": "Import-LocalizedData","import-powershelldatafile": "Import-PowerShellDataFile","import-pssession": "Import-PSSession","invoke-expression": "Invoke-Expression","invoke-restmethod": "Invoke-RestMethod","invoke-webrequest": "Invoke-WebRequest","join-string": "Join-String","measure-command": "Measure-Command","new-alias": "New-Alias","new-event": "New-Event","new-guid": "New-Guid","new-object": "New-Object","new-temporaryfile": "New-TemporaryFile","new-timespan": "New-TimeSpan","new-variable": "New-Variable","out-file": "Out-File","out-gridview": "Out-GridView","out-printer": "Out-Printer","out-string": "Out-String","register-engineevent": "Register-EngineEvent","register-objectevent": "Register-ObjectEvent","remove-alias": "Remove-Alias","remove-event": "Remove-Event","remove-psbreakpoint": "Remove-PSBreakpoint","remove-typedata": "Remove-TypeData","remove-variable": "Remove-Variable","select-string": "Select-String","select-xml": "Select-Xml","send-mailmessage": "Send-MailMessage","set-alias": "Set-Alias","set-date": "Set-Date","set-markdownoption": "Set-MarkdownOption","set-psbreakpoint": "Set-PSBreakpoint","set-tracesource": "Set-TraceSource","set-variable": "Set-Variable","show-command": "Show-Command","show-markdown": "Show-Markdown","start-sleep": "Start-Sleep","tee-object": "Tee-Object","test-json": "Test-Json","trace-command": "Trace-Command","unblock-file": "Unblock-File","unregister-event": "Unregister-Event","update-formatdata": "Update-FormatData","update-list": "Update-List","update-typedata": "Update-TypeData","wait-debugger": "Wait-Debugger","wait-event": "Wait-Event","write-debug": "Write-Debug","write-error": "Write-Error","write-information": "Write-Information","write-progress": "Write-Progress","write-verbose": "Write-Verbose","write-warning": "Write-Warning","compress-archive": "Compress-Archive","expand-archive": "Expand-Archive","get-counter": "Get-Counter","get-winevent": "Get-WinEvent","new-winevent": "New-WinEvent","get-psreadlinekeyhandler": "Get-PSReadLineKeyHandler","get-psreadlineoption": "Get-PSReadLineOption","psconsolehostreadline": "PSConsoleHostReadLine","remove-psreadlinekeyhandler": "Remove-PSReadLineKeyHandler","set-psreadlinekeyhandler": "Set-PSReadLineKeyHandler","set-psreadlineoption": "Set-PSReadLineOption"};
const BASE_CMDLETS = [
  "Write-Output", "Write-Host", "Read-Host", "Get-ChildItem", "Where-Object",
  "ForEach-Object", "Select-Object", "Sort-Object", "Measure-Object",
  "Get-Location", "Set-Location", "Test-Path", "Get-Content", "Set-Content",
  "Add-Content", "New-Item", "Remove-Item", "Rename-Item", "Copy-Item",
  "Move-Item",
];
const STATIC_ALIASES = {
  echo: "Write-Output", gci: "Get-ChildItem", ls: "Get-ChildItem",
  dir: "Get-ChildItem", where: "Where-Object", "?": "Where-Object",
  foreach: "ForEach-Object", "%": "ForEach-Object", select: "Select-Object",
  sort: "Sort-Object", measure: "Measure-Object", cd: "Set-Location",
  pwd: "Get-Location", cat: "Get-Content", gc: "Get-Content",
  ac: "Add-Content", ni: "New-Item", ri: "Remove-Item", rm: "Remove-Item",
  ren: "Rename-Item", cp: "Copy-Item", mv: "Move-Item",
};
const wildcardRe = (mask) =>
  new RegExp(
    "^" + String(mask).split("").map((c) => (c === "*" ? ".*" : c === "?" ? "." : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("") + "$",
    "i",
  );
Object.assign(SUPPORTED, {
  "get-command": {
    params: ["name", "all", "commandtype", "module", "verb", "noun", "listimported", "syntax", "parametername", "parameterset", "showcommandinfo"],
    run(ctx) {
      if (truthy(ctx.params.syntax))
        ctx.fail("未検証：Get-Command -Syntax（構文文字列）はモデルに保持されていないため停止します", ctx.c.line);
      const entries = [];
      for (const n of BASE_CMDLETS) entries.push({ name: n, type: "Cmdlet" });
      for (const key of Object.keys(CMDLETS))
        if (!BASE_CMDLETS.some((b) => b.toLowerCase() === key))
          entries.push({ name: CANONICAL_NAMES[key] ?? key, type: "Cmdlet" });
      for (const [a, target] of Object.entries(STATIC_ALIASES))
        entries.push({ name: a, type: "Alias", definition: target });
      for (const fname of Object.keys(ctx.s.ps.functions ?? {}))
        entries.push({ name: fname, type: "Function" });
      let out = entries;
      const nameRaw = ctx.p("name", 0, null);
      if (nameRaw !== null && nameRaw !== undefined) {
        out = [];
        for (const single of ctx.enumerate(nameRaw)) {
          const wanted = txt(ctx, single);
          const matched = entries.filter((e) =>
            /[*?[]/.test(wanted)
              ? wildcardRe(wanted).test(e.name)
              : e.name.toLowerCase() === wanted.toLowerCase(),
          );
          if (!matched.length && !/[*?[]/.test(wanted))
            ctx.fail("モデルにコマンドが見つかりません：" + wanted, ctx.c.line);
          out.push(...matched);
        }
      }
      if (ctx.params.commandtype !== undefined) {
        const t = txt(ctx, ctx.params.commandtype).toLowerCase();
        out = out.filter((e) => e.type.toLowerCase() === t);
      }
      const values = out.map((e) => {
        const props = { Name: e.name, CommandType: e.type };
        if (e.definition) props.Definition = e.definition;
        return ctx.object(props, e.type === "Alias" ? "AliasInfo" : "CmdletInfo");
      });
      return [{ s: ctx.s, values }];
    },
  },
  "get-alias": {
    params: ["name", "definition", "scope", "exclude"],
    run(ctx) {
      let entries = Object.entries(STATIC_ALIASES).map(([name, definition]) => ({ name, definition }));
      const nameRaw = ctx.p("name", 0, null);
      if (nameRaw !== null && nameRaw !== undefined) {
        const out = [];
        for (const single of ctx.enumerate(nameRaw)) {
          const wanted = txt(ctx, single);
          const matched = entries.filter((e) =>
            /[*?[]/.test(wanted) ? wildcardRe(wanted).test(e.name) : e.name.toLowerCase() === wanted.toLowerCase(),
          );
          if (!matched.length && !/[*?[]/.test(wanted))
            ctx.fail("モデルに別名が見つかりません：" + wanted, ctx.c.line);
          out.push(...matched);
        }
        entries = out;
      }
      if (ctx.params.definition !== undefined) {
        const d = txt(ctx, ctx.params.definition).toLowerCase();
        entries = entries.filter((e) => e.definition.toLowerCase() === d);
      }
      if (ctx.params.exclude !== undefined) {
        const ex = ctx.enumerate(ctx.params.exclude).map((v) => txt(ctx, v).toLowerCase());
        entries = entries.filter((e) => !ex.includes(e.name.toLowerCase()));
      }
      return [{
        s: ctx.s,
        values: entries.map((e) => ctx.object({ Name: e.name, Definition: e.definition }, "AliasInfo")),
      }];
    },
  },
  "out-null": {
    params: ["inputobject"],
    run(ctx) {
      return [{ s: ctx.s, values: [] }];
    },
  },
  "out-file": {
    params: ["filepath", "inputobject", "append", "noclobber", "force", "width", "encoding", "confirm", "whatif"],
    run(ctx) {
      if (ctx.params.width !== undefined)
        ctx.fail("未検証：Out-File -Width（表示幅での折り返し）は確定できないため停止します", ctx.c.line);
      checkEncoding(ctx, ctx.params.encoding);
      const raw = ctx.p("filepath", 0, null);
      if (raw === null || raw === undefined)
        ctx.fail("Out-Fileには-FilePathが必要です", ctx.c.line);
      const values = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      const lines = values.map((v) => {
        if (v === null || v === undefined) return "";
        if (isObj(v) || Array.isArray(v))
          ctx.fail("未検証：Out-Fileのオブジェクト整形は表示ホストに依存するため停止します", ctx.c.line);
        return txt(ctx, v, "出力する値");
      });
      if (truthy(ctx.params.whatif)) return [{ s: ctx.s, values: [] }];
      const pathStr = txt(ctx, raw),
        existing = ctx.fsEntry(ctx.s, pathStr, ctx.c.line);
      if (existing && truthy(ctx.params.noclobber) && !truthy(ctx.params.append))
        ctx.fail("モデルにファイルが既にあります（-NoClobber）：" + existing.path, ctx.c.line);
      ctx.writeFile(ctx.s, pathStr, lines.map((l) => l + "\r\n").join(""), ctx.c.line, truthy(ctx.params.append));
      return [{ s: ctx.s, values: [] }];
    },
  },
  "out-string": {
    params: ["inputobject", "stream", "width"],
    run(ctx) {
      if (ctx.params.width !== undefined)
        ctx.fail("未検証：Out-String -Width（表示幅での折り返し）は確定できないため停止します", ctx.c.line);
      const values = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      const lines = values.map((v) => {
        if (v === null || v === undefined) return "";
        if (isObj(v) || Array.isArray(v))
          ctx.fail("未検証：Out-Stringのオブジェクト整形は表示ホストに依存するため停止します", ctx.c.line);
        return txt(ctx, v, "出力する値");
      });
      if (truthy(ctx.params.stream)) return [{ s: ctx.s, values: lines }];
      return [{ s: ctx.s, values: lines.length ? [lines.join("\r\n") + "\r\n"] : [] }];
    },
  },
  "tee-object": {
    params: ["inputobject", "filepath", "literalpath", "variable", "append", "encoding"],
    run(ctx) {
      checkEncoding(ctx, ctx.params.encoding);
      const values = ctx.params.inputobject !== undefined
        ? ctx.enumerate(ctx.params.inputobject)
        : ctx.input;
      if (ctx.params.variable !== undefined)
        setVar(ctx.s, txt(ctx, ctx.params.variable), ctx.scalar(values));
      const raw = ctx.params.filepath !== undefined ? ctx.params.filepath : ctx.params.literalpath;
      if (raw !== undefined && raw !== null) {
        const lines = values.map((v) => {
          if (v === null || v === undefined) return "";
          if (isObj(v) || Array.isArray(v))
            ctx.fail("未検証：Tee-Objectのオブジェクト整形は表示ホストに依存するため停止します", ctx.c.line);
          return txt(ctx, v, "出力する値");
        });
        ctx.writeFile(ctx.s, txt(ctx, raw), lines.map((l) => l + "\r\n").join(""), ctx.c.line, truthy(ctx.params.append));
      }
      return [{ s: ctx.s, values }];
    },
  },
  /* ---- ストリーム出力 ---- */
  "write-warning": {
    params: ["message"],
    run(ctx) {
      const msgs = ctx.args.length || ctx.params.message !== undefined
        ? ctx.enumerate(ctx.p("message", 0, null))
        : ctx.input;
      for (const m of msgs)
        ctx.s.outputs.push({ channel: "Write-Warning", text: txt(ctx, m, "警告メッセージ"), line: ctx.c.line });
      return [{ s: ctx.s, values: [] }];
    },
  },
  "write-verbose": {
    params: ["message"],
    // 既定の $VerbosePreference は SilentlyContinue のため、既定では何も表示されない。
    run(ctx) {
      return [{ s: ctx.s, values: [] }];
    },
  },
  "write-debug": {
    params: ["message"],
    // 既定の $DebugPreference は SilentlyContinue のため、既定では何も表示されない。
    run(ctx) {
      return [{ s: ctx.s, values: [] }];
    },
  },
  "write-information": {
    params: ["messagedata", "tags"],
    // 既定の $InformationPreference は SilentlyContinue のため、既定では何も表示されない。
    run(ctx) {
      return [{ s: ctx.s, values: [] }];
    },
  },
  "write-progress": {
    params: ["activity", "status", "currentoperation", "percentcomplete", "secondsremaining", "activityid", "parentid", "completed", "sourceid"],
    // 進行状況表示はホスト表示のみで、パイプラインへの効果は無い。
    run(ctx) {
      return [{ s: ctx.s, values: [] }];
    },
  },
  "write-error": {
    params: ["message", "exception", "category", "errorid", "targetobject", "recommendedaction", "activity", "erroraction"],
    run(ctx) {
      const raw = ctx.p("message", 0, ctx.params.exception ?? (ctx.hasInput ? ctx.input[0] : null));
      const msg = raw === null || raw === undefined ? "" : txt(ctx, raw, "エラーメッセージ");
      if (ctx.params.erroraction !== undefined &&
          txt(ctx, ctx.params.erroraction).toLowerCase() === "stop")
        ctx.fail(msg || "Write-Error", ctx.c.line);
      ctx.s.outputs.push({ channel: "Write-Error", text: msg, line: ctx.c.line });
      ctx.s.ps.success = false;
      return [{ s: ctx.s, values: [] }];
    },
  },
  "start-sleep": {
    params: ["seconds", "milliseconds", "duration"],
    // 時間の経過自体はモデル化しない（データフローへの効果は無い）。
    run(ctx) {
      if (ctx.params.seconds !== undefined) asNum(ctx, ctx.params.seconds, "-Seconds");
      if (ctx.params.milliseconds !== undefined) asNum(ctx, ctx.params.milliseconds, "-Milliseconds");
      return [{ s: ctx.s, values: [] }];
    },
  },
  /* ---- 変数コマンドレット ---- */
  "get-variable": {
    params: ["name", "scope", "valueonly", "include", "exclude"],
    run(ctx) {
      if (ctx.params.scope !== undefined) {
        const sc = txt(ctx, ctx.params.scope).toLowerCase();
        if (!["local", "global", "script", "0"].includes(sc))
          ctx.fail("未対応：Get-Variable -Scope " + txt(ctx, ctx.params.scope) + "（モデルのスコープは現在のスコープのみです）", ctx.c.line);
      }
      let keys = Object.keys(ctx.s.vars);
      const nameRaw = ctx.p("name", 0, null);
      if (nameRaw !== null && nameRaw !== undefined) {
        const out = [];
        for (const single of ctx.enumerate(nameRaw)) {
          const wanted = txt(ctx, single);
          const matched = keys.filter((k) =>
            /[*?[]/.test(wanted) ? wildcardRe(wanted).test(k) : k.toLowerCase() === wanted.toLowerCase(),
          );
          if (!matched.length && !/[*?[]/.test(wanted))
            ctx.fail("モデルに変数が見つかりません：" + wanted, ctx.c.line);
          out.push(...matched);
        }
        keys = out;
      }
      if (ctx.params.include !== undefined) {
        const inc = ctx.enumerate(ctx.params.include).map((v) => txt(ctx, v));
        keys = keys.filter((k) => inc.some((p) => wildcardRe(p).test(k)));
      }
      if (ctx.params.exclude !== undefined) {
        const ex = ctx.enumerate(ctx.params.exclude).map((v) => txt(ctx, v));
        keys = keys.filter((k) => !ex.some((p) => wildcardRe(p).test(k)));
      }
      const valueOnly = truthy(ctx.params.valueonly);
      return [{
        s: ctx.s,
        values: keys.map((k) =>
          valueOnly ? ctx.s.vars[k] : ctx.object({ Name: k, Value: ctx.s.vars[k] }, "PSVariable"),
        ),
      }];
    },
  },
  "set-variable": {
    params: ["name", "value", "scope", "option", "visibility", "passthru", "force", "description", "confirm", "whatif"],
    run(ctx) {
      return variableWrite(ctx, false);
    },
  },
  "new-variable": {
    params: ["name", "value", "scope", "option", "visibility", "passthru", "force", "description", "confirm", "whatif"],
    run(ctx) {
      return variableWrite(ctx, true);
    },
  },
  "remove-variable": {
    params: ["name", "scope", "force", "include", "exclude", "confirm", "whatif"],
    run(ctx) {
      const names = ctx.enumerate(ctx.p("name", 0, null));
      if (!names.length || names.some((n) => n === null || n === undefined))
        ctx.fail("Remove-Variableには-Nameが必要です", ctx.c.line);
      for (const n of names) {
        const key = varKey(ctx.s, txt(ctx, n));
        if (!key)
          ctx.fail("モデルに変数が見つかりません：" + txt(ctx, n), ctx.c.line);
        if (!truthy(ctx.params.whatif)) delete ctx.s.vars[key];
      }
      return [{ s: ctx.s, values: [] }];
    },
  },
  "clear-variable": {
    params: ["name", "scope", "passthru", "force", "confirm", "whatif"],
    run(ctx) {
      const names = ctx.enumerate(ctx.p("name", 0, null));
      if (!names.length || names.some((n) => n === null || n === undefined))
        ctx.fail("Clear-Variableには-Nameが必要です", ctx.c.line);
      const out = [];
      for (const n of names) {
        const key = varKey(ctx.s, txt(ctx, n));
        if (!key)
          ctx.fail("モデルに変数が見つかりません：" + txt(ctx, n), ctx.c.line);
        if (!truthy(ctx.params.whatif)) setVar(ctx.s, key, null);
        if (truthy(ctx.params.passthru))
          out.push(ctx.object({ Name: key, Value: null }, "PSVariable"));
      }
      return [{ s: ctx.s, values: out }];
    },
  },
});
function variableWrite(ctx, isNew) {
  if (ctx.params.option !== undefined) {
    const opt = ctx.params.option;
    const optStr = typeof opt === "string" ? opt.toLowerCase() : String(opt);
    if (!["none", "0"].includes(optStr))
      ctx.fail("未対応：変数の -Option " + optStr + "（ReadOnly／Constant等はモデル化されていません）", ctx.c.line);
  }
  if (ctx.params.visibility !== undefined &&
      txt(ctx, ctx.params.visibility).toLowerCase() !== "public")
    ctx.fail("未対応：変数の -Visibility " + txt(ctx, ctx.params.visibility), ctx.c.line);
  if (ctx.params.scope !== undefined) {
    const sc = txt(ctx, ctx.params.scope).toLowerCase();
    if (!["local", "global", "script", "0", "1"].includes(sc))
      ctx.fail("未対応：変数の -Scope " + txt(ctx, ctx.params.scope) + "（モデルのスコープは現在のスコープのみです）", ctx.c.line);
  }
  const name = ctx.p("name", 0, null);
  if (name === null || name === undefined)
    ctx.fail((isNew ? "New-Variable" : "Set-Variable") + "には-Nameが必要です", ctx.c.line);
  const nameStr = txt(ctx, name);
  if (isNew && varKey(ctx.s, nameStr) && !truthy(ctx.params.force))
    ctx.fail("モデルに同じ名前の変数が既にあります：" + nameStr, ctx.c.line);
  let value = ctx.p("value", 1, undefined);
  if (value === undefined && ctx.hasInput) value = ctx.scalar(ctx.input);
  if (value === undefined) value = null;
  if (!truthy(ctx.params.whatif)) setVar(ctx.s, nameStr, value);
  return [{
    s: ctx.s,
    values: truthy(ctx.params.passthru)
      ? [ctx.object({ Name: nameStr, Value: value }, "PSVariable")]
      : [],
  }];
}

/* ================= 未対応 ================= */
const REMOTE = "実コンピュータへのリモート接続・セッション管理が本質で、モデルにネットワーク／リモート実行環境が無いため";
const JOB = "バックグラウンドジョブ（別プロセス／runspace）の実行基盤がモデルに無いため";
const MODULE = "モジュールシステム（モジュールの読み込み・公開範囲・マニフェストの管理）がモデル化されていないため";
const FORMAT = "表示ホストの整形エンジン（書式データ）に依存し、モデルに表示ホストが無いため";
const EVENT = "イベントエンジン（イベントキュー・サブスクリプション）がモデルに無いため";
const RUNSPACE = "runspace／デバッガの実行基盤がモデルに無いため";
const SERVICE = "実OSのサービス管理が本質で、モデルにサービス基盤が無いため";
const PROCESS = "実OS上のプロセス操作が本質で、モデルに実プロセスが無いため";
const ALIAS_WRITE = "セッション別名表は基礎エンジンの静的表のみで、実行中の別名の登録・変更・解決がモデル化されていないため（読み取りはGet-Aliasで対応）";
const ITEMPROP = "プロバイダーの項目プロパティ（レジストリ・拡張属性等）のストアがモデルFSに無いため";
const SECURITY = "実OSのセキュリティ機構（証明書・ACL・署名・資格情報）が本質で、モデルに無いため";
const COMMON_REMOTE = ["computername", "credential", "session", "port", "usessl", "authentication", "sessionoption", "throttlemlimit"];
const UNSUPPORTED = [
  // Core: リモート処理・セッション構成
  ["connect-pssession", [...COMMON_REMOTE, "name", "id", "instanceid"], REMOTE],
  ["disconnect-pssession", [...COMMON_REMOTE, "name", "id", "instanceid", "outputbufferingmode"], REMOTE],
  ["enter-pssession", [...COMMON_REMOTE, "hostname", "sshconnection"], REMOTE],
  ["exit-pssession", [], REMOTE],
  ["new-pssession", [...COMMON_REMOTE, "name", "networkaccess"], REMOTE],
  ["get-pssession", [...COMMON_REMOTE, "name", "id", "instanceid", "state", "configurationname"], REMOTE],
  ["remove-pssession", [...COMMON_REMOTE, "name", "id", "instanceid"], REMOTE],
  ["receive-pssession", [...COMMON_REMOTE, "name", "id", "instanceid", "outtarget"], REMOTE],
  ["enter-pshostprocess", ["id", "name", "process", "custompipename"], "実OS上の他プロセス（ホストプロセス）へのアタッチが本質のため"],
  ["exit-pshostprocess", [], "実OS上のホストプロセスとの対話セッション終了が本質のため"],
  ["get-pshostprocessinfo", ["id", "name", "process"], "実OS上のホストプロセス情報の取得が本質のため"],
  ["disable-psremoting", ["force", "confirm", "whatif"], "実OSのリモート受信設定（WinRM等）の変更が本質のため"],
  ["enable-psremoting", ["force", "skipnetworkprofilecheck", "confirm", "whatif"], "実OSのリモート受信設定（WinRM等）の有効化が本質のため"],
  ["disable-pssessionconfiguration", ["name", "force", "confirm", "whatif"], "実OSに登録されたセッション構成の無効化が本質のため"],
  ["enable-pssessionconfiguration", ["name", "force", "confirm", "whatif"], "実OSに登録されたセッション構成の有効化が本質のため"],
  ["get-pssessionconfiguration", ["name"], "実OSに登録されたセッション構成の取得が本質のため"],
  ["get-pssessioncapability", ["configurationname", "username"], "実OSに登録された制約付きセッション構成の能力取得が本質のため"],
  ["register-pssessionconfiguration", ["name", "path", "force", "confirm", "whatif"], "実OSへのセッション構成の登録が本質のため"],
  ["unregister-pssessionconfiguration", ["name", "force", "confirm", "whatif"], "実OSに登録されたセッション構成の削除が本質のため"],
  ["set-pssessionconfiguration", ["name", "path", "force", "confirm", "whatif"], "実OSに登録されたセッション構成の変更が本質のため"],
  ["new-pssessionconfigurationfile", ["path", "sessiontype", "executionpolicy", "force", "confirm", "whatif"], "リモートセッション構成ファイルの作成はリモート処理基盤が前提のため"],
  ["new-psrolecapabilityfile", ["path", "companyname", "description", "visiblecmdlets", "confirm", "whatif"], "リモートセッションの役割機能ファイルはリモート処理基盤が前提のため"],
  ["new-pssessionoption", ["culture", "maximumreceiveddatasizepercommand", "maximumreceivedobjectsize", "idletimeout"], "リモートセッションのオプションはリモート処理基盤が前提のため"],
  ["new-pstransportoption", ["culture", "maxpacketbytes", "idletimeout"], "リモート転送オプションはリモート処理基盤が前提のため"],
  ["test-pssessionconfigurationfile", ["path"], "リモートセッション構成ファイルの検証はリモート処理基盤が前提のため"],
  ["switch-process", ["mitigationparameters"], "POSIXのexecv()による実プロセスイメージの置換が本質のため"],
  // Core: ジョブ
  ["start-job", ["scriptblock", "filepath", "name", "credential", "workingdirectory", "runas32", "psversion"], JOB],
  ["get-job", ["id", "name", "instanceid", "state", "command", "filter", "hasmoredata"], JOB],
  ["receive-job", ["id", "name", "instanceid", "keep", "wait", "autosize"], JOB],
  ["remove-job", ["id", "name", "instanceid", "state", "force"], JOB],
  ["stop-job", ["id", "name", "instanceid", "state", "passthru"], JOB],
  ["wait-job", ["id", "name", "instanceid", "state", "timeout", "force", "any"], JOB],
  ["debug-job", ["id", "name", "instanceid", "breakall"], JOB + "（デバッガも無い）"],
  // Core: モジュール・ヘルプ・その他
  ["import-module", ["name", "force", "global", "scope", "passthru", "prefix", "version", "minimumversion", "maximumversion", "requiredversion", "argumentlist", "disablenamechecking", "noclobber"], MODULE],
  ["remove-module", ["name", "force", "confirm", "whatif"], MODULE],
  ["new-module", ["name", "scriptblock", "returnresult", "asautomation", "argumentlist"], MODULE],
  ["export-modulemember", ["function", "cmdlet", "variable", "alias"], MODULE],
  ["new-modulemanifest", ["path", "rootmodule", "moduleversion", "guid", "author", "description", "confirm", "whatif"], MODULE],
  ["test-modulemanifest", ["path"], MODULE],
  ["save-help", ["destinationpath", "module", "UICulture", "force", "confirm", "whatif"], "インターネットからのヘルプファイルのダウンロードと実ファイルシステムへの保存が本質のため"],
  ["update-help", ["module", "sourcepath", "UICulture", "force", "scope", "confirm", "whatif"], "インターネットからのヘルプファイルのダウンロードと実OSへのインストールが本質のため"],
  ["enable-experimentalfeature", ["name", "scope", "confirm", "whatif"], "実験機能の有効化は構成ファイルの変更とセッション再起動を伴い、モデル化されていないため"],
  ["disable-experimentalfeature", ["name", "scope", "confirm", "whatif"], "実験機能の無効化は構成ファイルの変更とセッション再起動を伴い、モデル化されていないため"],
  ["set-psdebug", ["trace", "step", "strict", "off"], RUNSPACE],
  ["set-strictmode", ["version", "off"], "厳密モードの検査規則は基礎エンジンに実装されておらず、有効化しても検査が働かない（黙って無効になる）ため"],
  ["register-argumentcompleter", ["commandname", "parametername", "scriptblock", "native"], "引数補完は対話ホストの補完基盤が本質で、モデルに対話ホストが無いため"],
  ["tabexpansion2", ["inputscript", "cursorcolumn", "ast", "tokens", "positionofcursor"], "タブ補完用のヘルパー関数で、対話ホストの補完基盤が本質のため"],
  ["invoke-command", ["scriptblock", "computername", "session", "credential", "filepath", "argumentlist", "throttlemlimit", "asjob", "indisconnectedsession"], "スクリプトブロックの実行基盤（ローカル再入・リモート実行とも）が高度ハンドラの範囲に無いため"],
  ["invoke-expression", ["command"], "文字列をコードとして再解析・実行する基盤が高度ハンドラの範囲に無いため"],
  // Host
  ["start-transcript", ["path", "literalpath", "outputdirectory", "append", "force", "noclobber", "includeinvocationheader", "confirm", "whatif"], "セッション全体の入出力の記録は実行エンジン側の記録機構が必要で、コマンドレット単体では再現できないため"],
  ["stop-transcript", [], "セッション全体の入出力の記録は実行エンジン側の記録機構が必要で、コマンドレット単体では再現できないため"],
  ["clear-host", [], "ホスト画面の消去は表示ホストの操作であり、モデルに表示ホストが無いため"],
  // Management: OS・プロセス・サービス・クリップボード等
  ["clear-recyclebin", ["driveletter", "force", "confirm", "whatif"], "実OSのごみ箱の消去が本質のため"],
  ["debug-process", ["id", "name", "inputobject"], "実OS上のプロセスのデバッグが本質のため"],
  ["get-clipboard", ["format", "textformat", "raw"], "実OSのクリップボードの読み取りが本質のため"],
  ["set-clipboard", ["value", "append", "ashtml"], "実OSのクリップボードへの書き込みが本質のため"],
  ["get-computerinfo", ["property"], "実OS／ハードウェア情報の取得が本質のため"],
  ["get-hotfix", ["id", "description", "computername", "credential"], "実OSにインストールされた更新プログラムの取得が本質のため"],
  ["get-process", ["name", "id", "inputobject", "computername", "module", "fileversioninfo", "includesystemname"], "実OS上で実行中のプロセスの取得が本質のため"],
  ["start-process", ["filepath", "argumentlist", "workingdirectory", "wait", "passthru", "windowstyle", "verb", "credential"], "実OS上のプロセス起動が本質のため"],
  ["stop-process", ["id", "name", "inputobject", "force", "passthru", "confirm", "whatif"], "実OS上のプロセスの停止が本質のため"],
  ["wait-process", ["id", "name", "inputobject", "timeout"], "実OS上のプロセス終了の待機が本質のため"],
  ["get-service", ["name", "displayname", "inputobject", "computername", "dependentservices", "requiredservices", "includestatus"], SERVICE],
  ["new-service", ["name", "binarypathname", "displayname", "description", "startuptype", "credential", "confirm", "whatif"], SERVICE],
  ["remove-service", ["name", "inputobject", "confirm", "whatif"], SERVICE],
  ["set-service", ["name", "inputobject", "displayname", "description", "startuptype", "status", "securitydescriptorsddl", "confirm", "whatif"], SERVICE],
  ["start-service", ["name", "displayname", "inputobject", "passthru"], SERVICE],
  ["stop-service", ["name", "displayname", "inputobject", "force", "passthru", "confirm", "whatif"], SERVICE],
  ["restart-service", ["name", "displayname", "inputobject", "force", "passthru", "confirm", "whatif"], SERVICE],
  ["suspend-service", ["name", "displayname", "inputobject", "passthru", "confirm", "whatif"], SERVICE],
  ["resume-service", ["name", "displayname", "inputobject", "passthru", "confirm", "whatif"], SERVICE],
  ["get-timezone", ["id", "name", "listavailable"], "実OSのタイムゾーン情報の取得が本質のため"],
  ["set-timezone", ["id", "name", "inputobject", "passthru"], "実OSのタイムゾーン設定の変更が本質のため"],
  ["rename-computer", ["newname", "computername", "domaincredential", "localcredential", "force", "restart", "passthru", "confirm", "whatif"], "実コンピュータ名の変更（再起動を伴う）が本質のため"],
  ["restart-computer", ["computername", "credential", "force", "wait", "timeout", "confirm", "whatif"], "実OSの再起動が本質のため"],
  ["stop-computer", ["computername", "credential", "force", "confirm", "whatif"], "実OSのシャットダウンが本質のため"],
  ["invoke-item", ["path", "literalpath"], "実OSの既定アプリケーションによる項目の起動が本質のため"],
  ["test-connection", ["targetname", "computername", "ping", "count", "delay", "buffersize", "quiet", "repeat", "traceroute", "tcpport"], "実ネットワークへのICMPエコー（ping）送信が本質のため"],
  ["new-psdrive", ["name", "psprovider", "root", "description", "scope", "credential", "confirm", "whatif"], "ドライブのマッピングはパスの解決規則そのものを変えるが、基礎エンジンのパス解決はドライブ表を持たないため"],
  ["remove-psdrive", ["name", "psprovider", "scope", "force", "confirm", "whatif"], "ドライブのマッピングは基礎エンジンのパス解決に組み込まれていないため"],
  // Management: 項目プロパティ・Set-Item
  ["clear-itemproperty", ["path", "name", "literalpath", "force", "confirm", "whatif"], ITEMPROP],
  ["copy-itemproperty", ["path", "destination", "name", "literalpath", "force", "recurse", "confirm", "whatif"], ITEMPROP],
  ["get-itemproperty", ["path", "name", "literalpath", "filter", "include", "exclude"], ITEMPROP],
  ["get-itempropertyvalue", ["path", "name", "literalpath", "filter", "include", "exclude"], ITEMPROP],
  ["move-itemproperty", ["path", "destination", "name", "literalpath", "force", "confirm", "whatif"], ITEMPROP],
  ["new-itemproperty", ["path", "name", "propertytype", "value", "literalpath", "force", "confirm", "whatif"], ITEMPROP],
  ["remove-itemproperty", ["path", "name", "literalpath", "force", "confirm", "whatif"], ITEMPROP],
  ["rename-itemproperty", ["path", "name", "newname", "literalpath", "force", "confirm", "whatif"], ITEMPROP],
  ["set-itemproperty", ["path", "name", "value", "literalpath", "force", "confirm", "whatif"], ITEMPROP],
  ["set-item", ["path", "value", "literalpath", "force", "confirm", "whatif"], "プロバイダードライブ（変数・環境・別名等）の項目設定が本質で、モデルにプロバイダードライブが無いため"],
  // Security
  ["convertfrom-securestring", ["securestring", "asplaintext", "key", "securekey"], "SecureString型と暗号鍵による復号が本質で、モデルにSecureString型が無いため"],
  ["convertto-securestring", ["string", "asplaintext", "force", "key", "securekey"], "SecureString型がモデルに無いため"],
  ["get-acl", ["path", "literalpath", "audit", "filter", "include", "exclude"], SECURITY],
  ["set-acl", ["path", "literalpath", "aclobject", "filter", "include", "exclude", "passthru", "confirm", "whatif"], SECURITY],
  ["get-authenticodesignature", ["filepath", "literalpath"], "実ファイルのAuthenticode署名検証が本質のため"],
  ["set-authenticodesignature", ["filepath", "literalpath", "certificate", "includeschain", "timestampserver", "hashalgorithm", "force", "confirm", "whatif"], "実証明書による実ファイルへのAuthenticode署名が本質のため"],
  ["get-cmsmessage", ["path", "literalpath", "content"], "CMS暗号メッセージと証明書による復号が本質のため"],
  ["protect-cmsmessage", ["content", "path", "to", "outfilepath"], "CMS暗号メッセージと証明書による暗号化が本質のため"],
  ["unprotect-cmsmessage", ["path", "literalpath", "content", "outfilepath"], "CMS暗号メッセージと証明書による復号が本質のため"],
  ["get-credential", ["username", "message", "title"], "資格情報の対話入力とPSCredential型が本質で、モデルに対話入力・資格情報型が無いため"],
  ["get-pfxcertificate", ["filepath", "literalpath", "password", "loadcertificate"], "証明書ファイル（PFX）の解析と証明書オブジェクトが本質のため"],
  ["new-filecatalog", ["path", "catalogfilepath", "catalogversion", "confirm", "whatif"], "Windowsのカタログファイル（OSの署名機構）の作成が本質のため"],
  ["test-filecatalog", ["path", "catalogfilepath", "detailed"], "Windowsのカタログファイル（OSの署名機構）の検証が本質のため（Windowsのみ対応）"],
  ["set-executionpolicy", ["executionpolicy", "scope", "force", "confirm", "whatif"], "実OS／レジストリの実行ポリシー変更が本質のため"],
  // Utility: 型・整形・イベント・runspace・ネットワーク等
  ["add-type", ["typedefinition", "path", "literalpath", "assemblyname", "language", "passthru", "referencedassemblies", "outputassembly", "outputtype", "ignoreparseerrors"], ".NETコンパイラによる実コードのコンパイルとセッションへのロードが本質のため"],
  ["convertfrom-sddlstring", ["sddl", "type"], "セキュリティ記述子（SDDL）の解析が本質で、モデルにセキュリティ記述子が無いため"],
  ["debug-runspace", ["id", "name", "runspace", "breakall"], RUNSPACE],
  ["get-runspace", ["id", "name", "instanceid"], RUNSPACE],
  ["get-runspacedebug", ["runspace", "runspaceid", "runspacename"], RUNSPACE],
  ["enable-runspacedebug", ["runspace", "runspaceid", "runspacename", "breakall"], RUNSPACE],
  ["disable-runspacedebug", ["runspace", "runspaceid", "runspacename"], RUNSPACE],
  ["get-psbreakpoint", ["id", "script", "function", "command", "variable", "line", "action"], RUNSPACE + "（ブレークポイントはデバッガの管理対象のため）"],
  ["set-psbreakpoint", ["script", "line", "column", "function", "command", "variable", "mode", "action"], RUNSPACE + "（ブレークポイントはデバッガの管理対象のため）"],
  ["enable-psbreakpoint", ["id", "breakpoint", "passthru"], RUNSPACE + "（ブレークポイントはデバッガの管理対象のため）"],
  ["disable-psbreakpoint", ["id", "breakpoint", "passthru", "confirm", "whatif"], RUNSPACE + "（ブレークポイントはデバッガの管理対象のため）"],
  ["remove-psbreakpoint", ["id", "breakpoint", "confirm", "whatif"], RUNSPACE + "（ブレークポイントはデバッガの管理対象のため）"],
  ["wait-debugger", [], RUNSPACE],
  ["get-tracesource", ["name", "listavailable"], "トレース基盤（.NET TraceSource）の管理が本質で、モデルに無いため"],
  ["set-tracesource", ["name", "level", "listeneroption", "filelistener", "debugger", "pshost", "passthru"], "トレース基盤（.NET TraceSource）の管理が本質で、モデルに無いため"],
  ["trace-command", ["name", "expression", "option", "listeneroption", "file", "debugger", "pshost"], "トレース基盤と式の実行基盤がモデルに無いため"],
  ["export-formatdata", ["inputobject", "filepath", "literalpath", "includemoduleheaders", "force", "noclobber", "confirm", "whatif"], FORMAT],
  ["update-formatdata", ["appendpath", "prependpath"], FORMAT],
  ["format-custom", ["inputobject", "property", "depth", "groupby", "view", "showerror", "displayerror", "force", "expand"], FORMAT],
  ["format-hex", ["path", "literalpath", "inputobject", "encoding", "raw", "count", "offset"], FORMAT + "（16進ダンプのレイアウトも表示整形のため）"],
  ["format-list", ["inputobject", "property", "groupby", "view", "showerror", "displayerror", "force", "expand"], FORMAT],
  ["format-table", ["inputobject", "property", "autosize", "groupby", "view", "wrap", "hidetableheaders", "showerror", "displayerror", "force", "expand"], FORMAT],
  ["format-wide", ["inputobject", "property", "autosize", "groupby", "view", "column", "showerror", "displayerror", "force", "expand"], FORMAT],
  ["get-event", ["sourceidentifier", "subscriptionid"], EVENT],
  ["new-event", ["sourceidentifier", "sender", "eventarguments", "messagedata"], EVENT],
  ["remove-event", ["sourceidentifier", "subscriptionid"], EVENT],
  ["get-eventsubscriber", ["sourceidentifier", "subscriptionid", "force"], EVENT],
  ["register-engineevent", ["sourceidentifier", "action", "forward", "messagedata", "supportevent", "confirm", "whatif"], EVENT],
  ["register-objectevent", ["inputobject", "eventname", "sourceidentifier", "action", "messagedata", "supportevent", "forward", "confirm", "whatif"], EVENT],
  ["unregister-event", ["sourceidentifier", "subscriptionid", "force", "confirm", "whatif"], EVENT],
  ["wait-event", ["sourceidentifier", "timeout"], EVENT],
  ["get-uptime", ["since"], "実OSの最終起動時刻からの経過時間取得が本質のため"],
  ["export-pssession", ["session", "outputmodule", "allowclobber", "force", "confirm", "whatif"], "リモートセッション（実コンピュータ）からのコマンドのエクスポートが本質のため"],
  ["import-pssession", ["session", "prefix", "allowclobber", "disablenamechecking", "confirm", "whatif"], "リモートセッション（実コンピュータ）からのコマンドのインポートが本質のため"],
  ["invoke-restmethod", ["uri", "method", "body", "headers", "contenttype", "outfile", "credential", "authentication"], "実ネットワークへのHTTP/HTTPS通信が本質のため"],
  ["invoke-webrequest", ["uri", "method", "body", "headers", "contenttype", "outfile", "credential", "authentication", "sessionvariable", "websession"], "実ネットワークへのHTTP/HTTPS通信が本質のため"],
  ["send-mailmessage", ["from", "to", "subject", "body", "smtpserver", "port", "credential", "attachments", "priority", "encoding"], "実ネットワーク経由のSMTPメール送信が本質のため"],
  ["out-gridview", ["inputobject", "title", "outputmode", "passthru"], "実OSの独立したGUIウィンドウ表示が本質のため"],
  ["out-printer", ["name", "inputobject"], "実プリンターへの出力が本質のため"],
  ["show-command", ["name", "command", "height", "width", "nocommonparameter", "errorpopup"], "実OSのGUIウィンドウ表示が本質のため"],
  ["show-markdown", ["path", "literalpath", "inputobject", "ashtml", "confirm", "whatif"], "Markdownのホスト表示（VTシーケンス／ブラウザ表示）が本質のため"],
  ["set-date", ["date", "adjust", "displayhint", "confirm", "whatif"], "実OSのシステム時刻の変更が本質のため"],
  ["select-xml", ["xml", "content", "path", "literalpath", "xpath", "namespacemanager"], "XMLドキュメントとXPathの評価基盤がモデルに無いため"],
  ["unblock-file", ["path", "literalpath", "confirm", "whatif"], "実ファイルのゾーン情報（代替データストリーム）の削除が本質のため（Windows）"],
  ["remove-typedata", ["typename", "confirm", "whatif"], "型データ（ETS）の削除は型システムの変更であり、モデルに型データの登録機構が無いため"],
  ["update-typedata", ["typename", "membertype", "membername", "value", "secondvalue", "typeconverter", "typeadapter", "force", "confirm", "whatif"], "型データ（ETS）の更新は型システムの変更であり、モデルに型データの登録機構が無いため"],
  // Utility: 別名の書き込み系
  ["new-alias", ["name", "value", "description", "scope", "force", "passthru", "option", "confirm", "whatif"], ALIAS_WRITE],
  ["set-alias", ["name", "value", "description", "scope", "force", "passthru", "option", "confirm", "whatif"], ALIAS_WRITE],
  ["remove-alias", ["name", "scope", "force", "confirm", "whatif"], ALIAS_WRITE],
  ["export-alias", ["path", "literalpath", "name", "as", "append", "force", "noclobber", "passthru", "description", "confirm", "whatif"], ALIAS_WRITE + "（別名表の書き出しも同じ表が前提のため）"],
  ["import-alias", ["path", "literalpath", "scope", "force", "passthru", "confirm", "whatif"], ALIAS_WRITE],
  // Archive / Diagnostics / PSReadLine
  ["compress-archive", ["path", "literalpath", "destinationpath", "compressionlevel", "update", "force", "confirm", "whatif"], "ZIPバイナリの生成が必要で、テキスト中心のモデルFSではバイナリを保持できないため"],
  ["expand-archive", ["path", "literalpath", "destinationpath", "force", "confirm", "whatif"], "ZIPバイナリの展開が必要で、モデルFSにZIPの内容が保持できないため"],
  ["get-counter", ["counter", "listset", "sampleinterval", "maxsamples", "continuous", "computername"], "実OSのパフォーマンスカウンターの取得が本質のため（Windows）"],
  ["get-winevent", ["logname", "listlog", "listprovider", "providername", "path", "filterxpath", "filterhashtable", "maxevents", "oldest"], "実Windowsイベントログの取得が本質のため"],
  ["new-winevent", ["logname", "providername", "id", "level", "message", "data"], "実Windowsイベントログへのイベント作成が本質のため"],
  ["get-psreadlinekeyhandler", ["bound", "unbound"], "対話コンソール（PSReadLine）のキー処理が本質で、モデルに対話ホストが無いため"],
  ["get-psreadlineoption", [], "対話コンソール（PSReadLine）の表示・編集設定が本質で、モデルに対話ホストが無いため"],
  ["set-psreadlinekeyhandler", ["key", "scriptblock", "function", "briefdescription", "description", "confirm", "whatif"], "対話コンソール（PSReadLine）のキー処理が本質で、モデルに対話ホストが無いため"],
  ["remove-psreadlinekeyhandler", ["key", "confirm", "whatif"], "対話コンソール（PSReadLine）のキー処理が本質で、モデルに対話ホストが無いため"],
  ["set-psreadlineoption", ["editmode", "prompttext", "colors", "bellstyle", "historysavestyle", "maximumhistorycount", "confirm", "whatif"], "対話コンソール（PSReadLine）の表示・編集設定が本質で、モデルに対話ホストが無いため"],
  ["psconsolehostreadline", [], "実ホストプロセスのコンソール読み取りループ（エントリポイント）が本質のため"],
  // FIX-PS-B 再分類: ConvertTo-CliXml／ConvertFrom-CliXml は
  // PowerShell 7.5-preview.4 で導入され、本モデルが対象とする
  // PowerShell 7.4 には存在しない（コーディネーター裁定）。
  ["convertto-clixml", ["inputobject", "depth", "as", "noconsoleinput"], "PowerShell 7.5-preview.4 で導入されたコマンドレットであり、本モデルが対象とする PowerShell 7.4 には存在しないため"],
  ["convertfrom-clixml", ["inputobject"], "PowerShell 7.5-preview.4 で導入されたコマンドレットであり、本モデルが対象とする PowerShell 7.4 には存在しないため"],
];
/* ================= 未検証 =================
 * FIX-PS-B: 理由文を T2 報告書 §4 の修正案どおりに是正した項目＝
 * Get-Culture、Get-UICulture、Get-Member、Get-PSCallStack、Get-Verb、
 * ConvertFrom-Markdown、ConvertTo-Xml。格上げ6件と再分類2件は除去した。 */
const UNVERIFIED = [
  ["add-history", ["inputobject", "passthru"], "セッション履歴はモデルに保持されておらず、履歴への追加結果を確定できないため"],
  ["clear-history", ["id", "commandline", "count", "newest", "confirm", "whatif"], "セッション履歴はモデルに保持されておらず、消去対象を確定できないため"],
  ["get-history", ["id", "count"], "セッション履歴はモデルに保持されておらず、内容を確定できないため"],
  ["invoke-history", ["id", "confirm", "whatif"], "セッション履歴はモデルに保持されておらず、再実行対象を確定できないため"],
  ["get-experimentalfeature", ["name", "listavailable"], "実験機能の一覧はPowerShellのビルド・構成に依存し、モデル環境の値を確定できないため"],
  ["get-help", ["name", "path", "category", "component", "functionality", "role", "full", "detailed", "examples", "parameter", "online", "showwindow"], "ヘルプ本文はモデルに保持されておらず、表示内容を確定できないため"],
  ["get-module", ["name", "all", "listavailable", "refresh", "fullyqualifiedname", "cimmodule", "pssession", "pscimsession"], "読み込み済みモジュール一覧は実行環境に依存し、モデルでは確定できないため"],
  ["get-pssubsystem", ["kind"], "サブシステム情報はホスト実装（予測サジェスト等）に依存し、モデルでは確定できないため"],
  ["get-error", ["newest", "inputobject"], "エラー記録のコレクションはモデルに保持されておらず、内容を確定できないため"],
  ["get-host", [], "ホスト情報（UI・色設定・バッファ等）は実行ホストに依存するため"],
  ["get-culture", ["name", "listavailable", "nocache"], "引数なしでは現在のカルチャは実行環境（OSロケール）に依存しモデルでは確定できない。-Name で名前を指定した場合は.NET のカルチャデータから確定できる"],
  ["get-uiculture", ["name", "listavailable", "nocache"], "引数なしでは現在のカルチャは実行環境（OSロケール）に依存しモデルでは確定できない。-Name で名前を指定した場合は.NET のカルチャデータから確定できる"],
  ["get-executionpolicy", ["list", "scope"], "実行ポリシーの有効値はOS・スコープごとの設定に依存し、モデルでは確定できないため"],
  ["get-member", ["inputobject", "name", "membertype", "view", "static", "force"], "メンバー名と MemberType の列挙はモデル型から導ける範囲があるが、Definition 等の.NET 表記は型システムの実装詳細に依存し、モデル値では確定できないため"],
  ["get-pscallstack", [], "呼び出し中の関数名はモデルのフレームから確定できるが、フレームの Location（スクリプト位置）は実行形態に依存し、モデルでは確定できないため"],
  ["get-verb", ["verb", "group"], "Learn は承認済み動詞の完全な一覧を保証しておらず（Get-Verb ページ・Approved Verbs ページとも完全性を限定している）、完全な列挙は一次情報からは確定できないため"],
  ["new-temporaryfile", ["confirm", "whatif"], "一時ファイルのパス（OSの一時フォルダとランダムな名前）は実行環境で決まるため"],
  ["out-default", ["inputobject", "transcript"], "既定の表示整形はホストの書式エンジンに依存するため"],
  ["out-host", ["inputobject", "paging"], "ホストへの表示整形は表示ホストの書式エンジンに依存するため"],
  ["export-clixml", ["path", "literalpath", "inputobject", "depth", "encoding", "force", "noclobber", "confirm", "whatif"], "CliXMLのシリアル化形式（型情報の表現）とモデル値の対応を実測なしでは確定できないため"],
  ["import-clixml", ["path", "literalpath", "encoding"], "CliXMLのシリアル化形式（型情報の表現）とモデル値の対応を実測なしでは確定できないため"],
  ["convertfrom-markdown", ["path", "literalpath", "inputobject"], "MarkdownInfo の構成と入力規則は確定しているが、Tokens（AST）と Html の細部は Markdown パーサー（Markdig）実装に依存し、Learn の記述だけでは確定できない"],
  ["convertto-xml", ["inputobject", "depth", "as", "noconsoleinput"], "-As／-Depth／型属性の意味論は確定しているが、既定の Document 形は.NET XmlDocument のモデル表現が無く、文字列形のスキーマ細部も Learn に示されていないため"],
  ["import-localizeddata", ["bindingvariable", "UICulture", "baseDirectory", "filename", "supportedCommand", "confirm", "whatif"], "カルチャに応じたデータファイルの選択が本質で、モデルでは確定できないため"],
  ["get-typedata", ["typename", "confirm"], "型データの一覧は読み込まれた型定義に依存し、モデルでは確定できないため"],
  ["get-formatdata", ["typename", "powershellversion"], "書式データは読み込まれた書式ファイルに依存し、モデルでは確定できないため"],
];
export const CMDLETS = { ...SUPPORTED };
for (const [name, params, reason] of UNSUPPORTED)
  CMDLETS[name] = { params, unsupported: reason };
for (const [name, params, reason] of UNVERIFIED)
  CMDLETS[name] = { params, unverified: reason };

/* 高度モード差分（ブロックB3・統合）: 高度コマンドレットのスイッチ型
 * パラメータ名（小文字）。パーサは高度モード時のみこの集合を基礎の
 * スイッチ表へ統合し、裸のスイッチ（-Quiet 等）を受理する。
 * 対応コマンドレットの Learn 記載のスイッチから編纂した。
 * FIX-PS-B: ConvertTo-Html の -Fragment／-Transitional と
 * Import-PowerShellDataFile の -SkipLimitCheck を追加した。 */
export const ADVANCED_SWITCHES = [
  "all",
  "allmatches",
  "append",
  "asarray",
  "ashashtable",
  "asstring",
  "asutc",
  "casesensitive",
  "completed",
  "compress",
  "confirm",
  "enumasstrings",
  "excludedifferent",
  "extension",
  "fragment",
  "includeequal",
  "includetypeinformation",
  "isabsolute",
  "leaf",
  "leafbase",
  "list",
  "listimported",
  "noclobber",
  "noduplicates",
  "noelement",
  "noenumerate",
  "nofollow",
  "notmatch",
  "notypeinformation",
  "parent",
  "passthru",
  "quiet",
  "raw",
  "resolve",
  "showcommandinfo",
  "shuffle",
  "simplematch",
  "skiplimitcheck",
  "skipnetworkprofilecheck",
  "transitional",
  "useculture",
  "valueonly",
  "whatif",
];
