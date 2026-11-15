import {
  LIMITS,
  isUnknown,
  unknown,
  formatValue,
} from "../../core/contract.js";
import { shellRuntime } from "../shell/runtime.js";
import {
  fail,
  ciGet,
  ciKey,
  ciSet,
  windowsPath,
  initFiles,
  fsEntry,
  listFiles,
  fileDisplay,
  writeFile,
  makeDirectory,
  removeEntry,
  copyEntry,
  sourceError,
  inputValue,
  reservedDeviceName,
} from "../shell/model.js";
import { parsePS, PSParser } from "./parser.js";
import { toLearnerError } from "../../core/script.js";
import {
  VALUE_LENGTH_LIMIT,
  truncateDisplayText,
} from "../../core/presentation.js";
const object = (properties, type = "PSCustomObject") =>
  type === "Hashtable"
    ? hash(Object.entries(properties))
    : { kind: "ps-object", psType: type, properties };
const modelValue = (v) =>
  isUnknown(v)
    ? v
    : Array.isArray(v)
      ? v.map(modelValue)
      : v && typeof v === "object"
        ? hash(Object.entries(v).map(([k, x]) => [k, modelValue(x)]))
        : v;
const hash = (entries) => ({
  kind: "ps-object",
  psType: "Hashtable",
  entries: new Map(entries),
});
const hashKey = (v, k) =>
  typeof k === "string"
    ? [...v.entries.keys()].find(
        (x) => typeof x === "string" && x.toLowerCase() === k.toLowerCase(),
      )
    : v.entries.has(k)
      ? k
      : undefined;
const isObject = (v) => v?.kind === "ps-object";
const enumerate = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const scalar = (values) =>
  values.length === 0 ? null : values.length === 1 ? values[0] : values;
function numberText(v, n = { line: 1 }, display = false) {
  // R28-N3: 非有限数が値として現れるのは、IEEE 754 の浮動小数点演算
  // （小数形の 0 除算・0 剰余）の確定結果に限る（binary 参照。それ以外
  // の非有限化は従来どおり演算側で未確認として止める）。実 PowerShell
  // の文字列表記は "Infinity"／"-Infinity"／"NaN" であり、出力・
  // 最終状態の表示もそれに合わせる（RG-223 の JSON 往復規則と一致）。
  if (!Number.isFinite(v)) return String(v);
  if (Math.abs(v) >= 1e15) {
    if (display) return String(v);
    fail("未確認：大きな整数と浮動小数点の文字列化", n.line, "未確認");
  }
  const rounded = Number(v.toPrecision(15));
  if (rounded !== 0 && Math.abs(rounded) < 1e-4) {
    const [mantissa, exponent] = rounded.toExponential(14).split("e");
    return (
      mantissa.replace(/\.?0+$/, "") +
      "E" +
      (Number(exponent) < 0 ? "-" : "+") +
      String(Math.abs(Number(exponent))).padStart(2, "0")
    );
  }
  return String(rounded);
}
// R28-N3（RG-223 と同型の処置）：実行完了後の最終状態スナップショット
// に限り、非有限数を実 PowerShell の文字列表現（"Infinity" 等）へ
// 置き換える。vars の JSON 往復が出力・groups の表示と一致することが
// 判定基準。ハッシュテーブル（Map）と PSCustomObject の構造は保ち、
// 未確定値はそのまま返す。
function psFiniteSafe(v, seen = new Map()) {
  if (typeof v === "number") return Number.isFinite(v) ? v : String(v);
  if (!v || typeof v !== "object" || isUnknown(v)) return v;
  if (seen.has(v)) return seen.get(v);
  if (Array.isArray(v)) {
    const out = [];
    seen.set(v, out);
    for (const x of v) out.push(psFiniteSafe(x, seen));
    return out;
  }
  if (v.kind === "ps-object" && v.psType === "Hashtable") {
    const out = { kind: "ps-object", psType: "Hashtable", entries: new Map() };
    seen.set(v, out);
    for (const [k, x] of v.entries) out.entries.set(k, psFiniteSafe(x, seen));
    return out;
  }
  if (v.kind === "ps-object") {
    const out = { ...v, properties: {} };
    seen.set(v, out);
    for (const [k, x] of Object.entries(v.properties ?? {}))
      out.properties[k] = psFiniteSafe(x, seen);
    return out;
  }
  // vars コンテナ等の素のオブジェクトは、値側だけを変換して複製する。
  const out = {};
  seen.set(v, out);
  for (const [k, x] of Object.entries(v)) out[k] = psFiniteSafe(x, seen);
  return out;
}
export function psFormat(v) {
  if (isUnknown(v)) return formatValue(v);
  if (v == null) return "$null";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return numberText(v, { line: 1 }, true);
  // R24-N14: バージョンオブジェクトは、その文字列表記（"7.4"）で表示する。
  if (isObject(v) && v.displayText !== undefined)
    return truncateDisplayText(String(v.displayText));
  if (isObject(v)) {
    // R25-N16: 入れ子オブジェクトを平らに展開すると、入れ子側の
    // プロパティ行と親自身の同名プロパティ行が同一文字列で二重に並ぶ
    // ことがある（PathInfo では Drive.Provider の展開行と PathInfo 自身の
    // Provider 行がどちらも「Provider : Name : FileSystem」になる）。
    // 表示合成の段階で、同一の「名前 : 値」行は後の（親自身の）出現を
    // 残して1回だけにし、各プロパティが1回だけ並ぶ形にする。保持する
    // 値そのものは変更しない。区切り「 : 」を含まない行（複数行文字列の
    // 継続行等）は重複判定の対象にしない。
    const lines = (
      v.psType === "Hashtable" ? [...v.entries] : Object.entries(v.properties)
    ).flatMap(([k, x]) => `${k} : ${psFormat(x)}`.split("\n"));
    return truncateDisplayText(
      lines
        .filter(
          (line, idx) =>
            !line.includes(" : ") || lines.lastIndexOf(line) === idx,
        )
        .join("\n"),
    );
  }
  // P-N2: 表示専用の整形では、長い文字列・大きな配列の表示を省略記法
  // つきで切り詰める（状態スナップショットの肥大防止。値は変えない）。
  if (Array.isArray(v))
    return truncateDisplayText("@(" + v.map(psFormat).join(", ") + ")");
  return truncateDisplayText(String(v));
}
function truth(v) {
  if (isUnknown(v)) return v;
  if (Array.isArray(v))
    return v.length === 0 ? false : v.length === 1 ? truth(v[0]) : true;
  return v !== null && v !== undefined && v !== false && v !== 0 && v !== "";
}
function numeric(v, node) {
  if (isUnknown(v)) return v;
  if (typeof v === "number") return v;
  if (v === null) return 0;
  if (typeof v === "boolean") return Number(v);
  if (
    typeof v === "string" &&
    /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim())
  )
    return Number(v);
  fail("数値へ変換できません：" + psFormat(v), node.line, "RuntimeException");
}
// P-N1: 値の「総内容量」の見積もり。状態スナップショットの転送
// （structuredClone）では、同じ文字列への参照でも要素ごとに複製される
// ため、要素数だけでは配列の実サイズを抑えられない。大きな文字列を
// 多数含む配列は内容量で見積もる（上限超過時点で打ち切る）。
function contentSize(v, budget = VALUE_LENGTH_LIMIT, depth = 0) {
  if (v == null || isUnknown(v) || depth > 8) return 0;
  if (typeof v === "string") return v.length;
  if (Array.isArray(v)) {
    let total = 0;
    for (const x of v) {
      total += contentSize(x, budget - total, depth + 1);
      if (total > budget) return total;
    }
    return total;
  }
  if (typeof v === "object") {
    let total = 0;
    for (const x of Object.values(v)) {
      total += contentSize(x, budget - total, depth + 1);
      if (total > budget) return total;
    }
    return total;
  }
  return String(v).length;
}
function text(v, node) {
  if (isUnknown(v)) return v;
  if (v == null) return "";
  if (typeof v === "number") return numberText(v, node);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (Array.isArray(v)) {
    if (v.some(isUnknown)) return unknown("配列を展開した文字列");
    // P-N1: 配列の文字列化も、連結前に累積長を見積もる（同じ大きな要素を
    // 多数含む配列で実体が爆発しないようにする）。
    let total = 0,
      parts = [];
    for (const x of v) {
      const part = text(x, node);
      if (isUnknown(part)) return part;
      total += part.length + 1;
      if (total > VALUE_LENGTH_LIMIT) return unknown("とても長い文字列");
      parts.push(part);
    }
    return parts.join(" ");
  }
  if (isObject(v)) {
    // R24-N14: バージョンオブジェクトの文字列化は文字列表記そのもの。
    if (v.psType === "Version") return String(v.displayText);
    if (v.psType === "Hashtable") return "System.Collections.Hashtable";
    fail(
      "未対応：オブジェクトの文字列化。プロパティを部分式で指定してください",
      node.line,
    );
  }
  return String(v);
}
function property(v, key, node) {
  if (isUnknown(v))
    return unknown("実行時に決まるプロパティ " + key, v.id + ":" + key);
  key = String(key);
  const lower = key.toLowerCase();
  if (isObject(v)) {
    if (v.psType === "Hashtable") {
      const k = hashKey(v, key);
      if (k !== undefined) return v.entries.get(k);
      if (lower === "count") return v.entries.size;
      if (lower === "keys") return [...v.entries.keys()];
      if (lower === "values") return [...v.entries.values()];
      // NX-N17: ハッシュテーブルに Length はない（実物では $null）。
      if (lower === "length") return null;
      return null;
    }
    const k = ciKey(v.properties, key);
    if (k !== undefined) return v.properties[k];
    if (lower === "count") return 1;
    // NX-N17: Length を持たないオブジェクト（フォルダ等）の Length は
    // 捏造せず $null。Count の 1 は実物と一致するため維持する。
    if (lower === "length") return null;
    // R22-N13: モデル化オブジェクト（FileInfo等）の存在しないプロパティは
    // 実物どおり決定的に $null。モデルに明示された値が未確定値の場合
    // （例：内容未指定ファイルの Length）は上の ciKey 経由で保持される。
    return null;
  }
  if (lower === "count") return v == null ? 0 : Array.isArray(v) ? v.length : 1;
  if (lower === "length")
    // NX-N17: Length があるのは文字列と配列だけ。それ以外のスカラー
    // （数値・真偽値・オブジェクト等）は $null。
    return v == null
      ? 0
      : typeof v === "string" || Array.isArray(v)
        ? v.length
        : null;
  if (Array.isArray(v))
    return v.flatMap((x) => enumerate(property(x, key, node)));
  return null;
}
function info(e) {
  const name = e.path.split("\\").at(-1),
    dot = name.lastIndexOf(".");
  return object(
    {
      Name: name,
      FullName: e.path,
      PSIsContainer: e.type === "directory",
      ...(e.type === "file"
        ? {
            Length:
              e.length ??
              (typeof e.content === "string"
                ? new TextEncoder().encode(e.content).length
                : unknown("モデルに未指定のサイズ", e.path + ":length")),
          }
        : {}),
      Extension: dot > 0 ? name.slice(dot) : "",
    },
    e.type === "directory" ? "DirectoryInfo" : "FileInfo",
  );
}
// R24-N14: $PSVersionTable.PSVersion は文字列ではなくバージョン
// オブジェクト（System.Version 相当）。モデルが保持する版文字列
// （"7.4"）から各成分を導出する：Major=7／Minor=4、指定のない
// Build／Revision は System.Version の規則どおり -1。
function versionObject(versionText) {
  const parts = String(versionText).split(".").map((x) => Number(x)),
    component = (i) => (Number.isInteger(parts[i]) ? parts[i] : -1);
  return {
    ...object(
      {
        Major: component(0),
        Minor: component(1),
        Build: component(2),
        Revision: component(3),
      },
      "Version",
    ),
    displayText: String(versionText),
  };
}
const isVersionValue = (v) => isObject(v) && v.psType === "Version";
// R24-N14: $PWD／Get-Location が返す PathInfo。実物の PathInfo が持つ
// プロパティ（Path／ProviderPath／Drive／Provider）を全て、モデルが
// 保持する現在フォルダから導出して返す（about_Automatic_Variables）。
// FileSystem プロバイダでは ProviderPath は Path と同じ値になり、
// Drive はドライブ名（例：C）・ルート・ドライブ相対の現在位置を持つ
// PSDriveInfo 相当オブジェクト。
function pathInfo(cwd) {
  const driveName = /^[a-z]:/i.test(cwd) ? cwd[0].toUpperCase() : "",
    root = driveName ? driveName + ":\\" : cwd,
    provider = object({ Name: "FileSystem" }, "ProviderInfo"),
    drive = object(
      {
        Name: driveName,
        Root: root,
        CurrentLocation: cwd.length > 3 ? cwd.slice(3) : "",
        Provider: provider,
      },
      "PSDriveInfo",
    );
  return object(
    { Path: cwd, ProviderPath: cwd, Drive: drive, Provider: provider },
    "PathInfo",
  );
}
const alias = {
  echo: "Write-Output",
  gci: "Get-ChildItem",
  ls: "Get-ChildItem",
  dir: "Get-ChildItem",
  where: "Where-Object",
  "?": "Where-Object",
  foreach: "ForEach-Object",
  "%": "ForEach-Object",
  select: "Select-Object",
  sort: "Sort-Object",
  measure: "Measure-Object",
  cd: "Set-Location",
  pwd: "Get-Location",
  cat: "Get-Content",
  gc: "Get-Content",
  sc: "Set-Content",
  ac: "Add-Content",
  ni: "New-Item",
  ri: "Remove-Item",
  rm: "Remove-Item",
  ren: "Rename-Item",
  cp: "Copy-Item",
  mv: "Move-Item",
};
export function simulatePowerShell(source, model, limits) {
  try {
    if (
      typeof source !== "string" ||
      source.length > Math.min(LIMITS.source, limits?.source || LIMITS.source)
    )
      fail("PowerShellコードは100000文字以内で指定してください", 1, "limit");
    const nodes = parsePS(source);
    function note(s, n, message, refs = []) {
      s._api.note(s, { ...n, refs }, message);
    }
    function emit(s, values, n, api) {
      s.ps.streams.at(-1).push(...values);
      if (s.ps.streams.length === 1)
        for (const v of values)
          if (v !== null && v !== undefined)
            s.outputs.push({
              channel: "pipeline",
              text: psFormat(v),
              line: n.line,
            });
    }
    function cap(states, n, api) {
      if (states.length > api.limits.paths) {
        api.stop(states[0], n, "パス数の上限");
        return states.slice(0, api.limits.paths);
      }
      return states;
    }
    // P-N1（識別子の成長経路）: 未確定値の id は被演算子の id を連結して
    // 合成されるため、同じ値同士の連結（$s + $s）を繰り返すと id 文字列
    // 自体が倍々で爆発する（実測で 6,700 万文字）。合成 id は長さ上限で
    // 切り、末尾に内容ハッシュを付けて別系統の id と衝突させない。
    function capUnknownId(id) {
      id = String(id);
      if (id.length <= 512) return id;
      let h = 5381;
      for (let i = 0; i < id.length; i++)
        h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
      return id.slice(0, 448) + ":h" + h.toString(16) + ":" + id.length;
    }
    function get(s, name) {
      const lower = name.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
      if (lower === "null") return null;
      if (["_", "psitem"].includes(lower)) return s.ps.items.at(-1) ?? null;
      if (lower === "?") return s.ps.success;
      if (lower === "lastexitcode") return s.model.lastExitCode ?? null;
      // R23-N1: 自動変数を未定義変数の「$null」規則に落とさない。
      // $PWD はモデルの現在フォルダを保持する PathInfo（Get-Location と同じ）。
      // R24-N14: Path だけでなく Drive／ProviderPath／Provider も返す。
      if (lower === "pwd") return pathInfo(s.model.cwd);
      // $PSVersionTable は常に値を持つ読み取り専用ハッシュテーブル。
      // バージョンはこのモデルの根拠（PowerShell 7.4／Core）だけを保持する。
      // R24-N14: PSVersion は文字列ではなく、その文字列から成分を導出した
      // バージョンオブジェクトとして保持する（.Major／.Minor が $null に
      // 落ちて誤分岐しないように）。
      if (lower === "psversiontable")
        return hash([
          ["PSVersion", versionObject("7.4")],
          ["PSEdition", "Core"],
        ]);
      // $HOME は実環境で決まるホームフォルダのパス。値を捏造せず
      // 未確定値として返す（利用者が代入した場合はその値を優先する）。
      if (lower === "home") {
        const assigned = ciGet(s.vars, name);
        if (assigned !== undefined) return assigned;
        return {
          ...unknown("$HOME（ホームフォルダ）の実行時の値", "ps:home"),
          valueType: "string",
        };
      }
      return ciGet(s.vars, name) ?? null;
    }
    // R28-N5: 実行時に決まるメンバー名（引用符の展開・変数・括弧式）を
    // 解決する。静的な名前（name）はそのまま返す。
    function memberKey(a, s, api) {
      if (!a.nameExpr) return a.name;
      const v = read(a.nameExpr, s, api);
      if (isUnknown(v))
        fail("未確認：プロパティ名が確定していません", a.line, "未確認");
      if (v === null || v === undefined)
        fail("プロパティ名が $null です", a.line, "RuntimeException");
      return v;
    }
    // R28-N3: 式が .NET の double（小数）由来かどうかを、リテラルの
    // 由来（parser の dbl フラグ）・[double] キャスト・変数の代入由来
    // （s.ps.dbl）・値そのものの形（非整数の数値、小数形の数値文字列）
    // から判定する。JS の数値は 1.0 と 1 を区別できないため、由来を
    // 辿れない場合は値の形で判定し、それでも整数形なら整数として扱う。
    function numericStringIsDouble(v) {
      const t = v.trim();
      return (
        /^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?$/i.test(t) &&
        /[.e]/i.test(t)
      );
    }
    function exprIsDouble(node, s) {
      if (!node || typeof node !== "object") return false;
      if (node.k === "literal") return node.dbl === true;
      if (node.k === "cast") {
        const t = String(node.type).toLowerCase().replace(/\s+/g, "");
        return t === "double" || t === "system.double";
      }
      if (node.k === "var") {
        const v = ciGet(s.vars, node.name);
        if (typeof v === "number")
          return (
            !Number.isInteger(v) || !!s.ps?.dbl?.[node.name.toLowerCase()]
          );
        if (typeof v === "string") return numericStringIsDouble(v);
        return false;
      }
      if (node.k === "binary")
        return (
          ["+", "-", "*", "/", "%"].includes(node.op) &&
          (exprIsDouble(node.a, s) || exprIsDouble(node.b, s))
        );
      if (node.k === "unary") return exprIsDouble(node.arg, s);
      if (node.k === "subexpression") {
        const stages = node.pipe?.stages;
        return stages?.length === 1 && stages[0].k === "expression"
          ? exprIsDouble(stages[0].value, s)
          : false;
      }
      if (node.k === "post" || node.k === "pre")
        return exprIsDouble(node.target, s);
      if (node.k === "ternary")
        return exprIsDouble(node.then, s) || exprIsDouble(node.else, s);
      return false;
    }
    // R28-N3: 非整数の数値を変数へ代入したら小数の由来を記録する
    // （整数値の代入での記録の付け替えは代入文側で行う）。
    function markDouble(s, name, v) {
      if (typeof v === "number" && !Number.isInteger(v))
        (s.ps.dbl ??= {})[name.toLowerCase()] = true;
    }
    function set(s, target, v, n, api) {
      (s.pendingRefs ??= []).push("変数");
      if (target.k === "var") {
        if (
          [
            "true",
            "false",
            "null",
            "?",
            "_",
            "psitem",
            "lastexitcode",
            "pwd",
            "psversiontable",
            "ofs",
            "erroractionpreference",
            "outputencoding",
            "psdefaultparametervalues",
          ].includes(target.name.toLowerCase())
        )
          fail("未対応：自動変数への代入", n.line);
        ciSet(s.vars, target.name, v);
        // R28-N3: 小数の由来（s.ps.dbl）を値の形に合わせて保つ。
        // 非整数の数値は確実に小数であり、数値でない値への代入では
        // 由来は消える。整数値の場合は由来が値から決まらないため、
        // 代入文側の由来判定に委ねる（ここでは付け替えない）。
        markDouble(s, target.name, v);
        if (typeof v !== "number" && s.ps.dbl)
          delete s.ps.dbl[target.name.toLowerCase()];
        return;
      }
      // R26-N2（防御層）: ++／--・代入の対象が変数・プロパティ・添字の
      // いずれでもない形（リテラルや式の結果への後置等）は、対象を
      // 名指して止める。従来は対象に .target が無いまま読み取り側へ
      // 進み、ホスト例外（Cannot read properties of undefined）の
      // 生文言が学習者に表示されていた。
      if (!["member", "index"].includes(target.k))
        fail(
          "代入先が不正です：++／--や代入の対象は変数・プロパティ・添字である必要があります",
          n.line,
          "RuntimeException",
        );
      const host = read(target.target, s, api),
        key =
          target.k === "member"
            ? memberKey(target, s, api)
            : read(target.index, s, api);
      if (isUnknown(host) || isUnknown(key))
        fail("未確認：代入先が確定していません", n.line, "未確認");
      if (isObject(host) && host.psType === "Hashtable") {
        const existing = hashKey(host, key);
        host.entries.set(existing === undefined ? key : existing, v);
        return;
      }
      if (isObject(host)) {
        if (host.psType !== "PSCustomObject")
          fail("未対応：" + host.psType + "のプロパティ書き込み", n.line);
        if (
          host.psType !== "Hashtable" &&
          ciKey(host.properties, key) === undefined
        )
          fail("プロパティがありません：" + key, n.line, "RuntimeException");
        ciSet(host.properties, String(key), v);
        return;
      }
      if (
        Array.isArray(host) &&
        Number.isInteger(key) &&
        key >= 0 &&
        key < host.length
      ) {
        host[key] = v;
        return;
      }
      fail("この添字・プロパティへ代入できません", n.line, "RuntimeException");
    }
    function binary(op, a, b, s, n, api, floatCtx = false) {
      // SH-P3: -f（書式演算子）は宣言どおり未対応だが、括弧不足など
      // 無関係な原因ではなく演算子を名指して止める。
      if (op === "-f") fail("未対応：書式演算子 -f", n.line);
      // SH-P3: 包含演算子 -contains／-notcontains／-in／-notin（-c／-i 変種を含む）。
      // 要素ごとの -eq（-c のとき -ceq）で判定する（about_Comparison_Operators）。
      const containsMatch = op.match(/^-(c|i)?(not)?(contains|in)$/);
      if (containsMatch) {
        const eqOp = containsMatch[1] === "c" ? "-ceq" : "-eq",
          collection = containsMatch[3] === "contains" ? a : b,
          needle = containsMatch[3] === "contains" ? b : a;
        if (isUnknown(collection) || isUnknown(needle))
          fail("未確認：未確定値に対する " + op + " の比較", n.line, "未確認");
        const items = Array.isArray(collection) ? collection : [collection];
        let found = false;
        for (const item of items) {
          const v = truth(binary(eqOp, item, needle, s, n, api));
          if (isUnknown(v))
            fail("未確認：要素の比較結果が確定していません", n.line, "未確認");
          if (v === true) {
            found = true;
            break;
          }
        }
        return containsMatch[2] ? !found : found;
      }
      if (["-and", "-or"].includes(op)) {
        const x = truth(a),
          y = truth(b);
        if (isUnknown(x) || isUnknown(y))
          return {
            ...unknown("論理条件"),
            op: op === "-and" ? "&&" : "||",
            a: x,
            b: y,
          };
        return op === "-and" ? x && y : x || y;
      }
      if (op === "..") {
        a = numeric(a, n);
        b = numeric(b, n);
        if (isUnknown(a) || isUnknown(b))
          fail("未確認：範囲の端点", n.line, "未確認");
        // R26-N21: 範囲の端点は言語仕様 §6.4（整数への変換規則）により
        // [int] へ変換してから範囲を作る。変換は .NET 準拠の丸めであり、
        // 五捨五入ではなく偶数丸め（端数がちょうど .5 のときは偶数側）：
        // [int]1.5=2、[int]2.5=2、[int]3.5=4、[int](-1.5)=-2。
        // 従来は非整数端点を「整数範囲のモデル上限」という虚偽の原因で
        // 止めていた。上限の名指しは、丸めた後の端点差が実際に上限を
        // 超える場合に限る（その場合は上限が真因として正しい）。
        if (!Number.isFinite(a) || !Number.isFinite(b))
          fail(
            "範囲の端点を整数へ変換できません：" +
              String(!Number.isFinite(a) ? a : b),
            n.line,
            "RuntimeException",
          );
        const toRangeInt = (v) => {
          const floor = Math.floor(v),
            frac = v - floor;
          if (frac < 0.5) return floor;
          if (frac > 0.5) return floor + 1;
          return floor % 2 === 0 ? floor : floor + 1;
        };
        // R27-N2: [int] 変換は System.Int32 への変換であり、変換後の値が
        // Int32 の範囲外であれば .NET の変換規則により Overflow で停止
        // する（実物は "Cannot convert value ... to type System.Int32"）。
        // 丸めで範囲外になる形（2147483647.5→2147483648）も含め、変換後の
        // 値で検査し、端点の元の値を名指す。範囲外の値を黙って範囲として
        // 生成してはならない（値の捏造）。
        const convA = toRangeInt(a),
          convB = toRangeInt(b);
        if (convA < -2147483648 || convA > 2147483647)
          fail(
            "範囲の端点を System.Int32 へ変換できません（Int32 の範囲外です）：" +
              String(a),
            n.line,
            "RuntimeException",
          );
        if (convB < -2147483648 || convB > 2147483647)
          fail(
            "範囲の端点を System.Int32 へ変換できません（Int32 の範囲外です）：" +
              String(b),
            n.line,
            "RuntimeException",
          );
        a = convA;
        b = convB;
        if (Math.abs(b - a) > 10000)
          fail("未対応：整数範囲のモデル上限", n.line);
        return Array.from(
          { length: Math.abs(b - a) + 1 },
          (_, i) => a + (b >= a ? i : -i),
        );
      }
      if (
        /^-(?:c|i)?(?:eq|ne|gt|ge|lt|le|like|notlike|match|notmatch)$/.test(op)
      ) {
        const sensitive = /^-c/.test(op),
          base = op.replace(/^-[ci]?/, "");
        if (Array.isArray(a)) {
          const filtered = a.filter((x) => {
            const v = truth(binary(op, x, b, s, n, api));
            if (isUnknown(v))
              fail(
                "未確認：配列要素の比較結果が確定していません",
                n.line,
                "未確認",
              );
            return v === true;
          });
          // SH-P2: 一致なしのフィルタ結果は「出力なし（AutomationNull）」で、
          // 代入先は $null になる。空配列を返すと代入経路だけが
          // $null との区別を崩すため、undefined（出力なし）で表す。
          return filtered.length ? filtered : undefined;
        }
        if (isUnknown(a) || isUnknown(b)) {
          if (a?.compound || b?.compound)
            fail("未確認：複合文字列の未確定比較", n.line, "未確認");
          if (["eq", "ne"].includes(base)) {
            if (
              isUnknown(a) &&
              a.valueType === "string" &&
              typeof b !== "string" &&
              b !== null
            )
              b = text(b, n);
            if (
              isUnknown(b) &&
              b.valueType === "string" &&
              typeof a !== "string" &&
              a !== null
            )
              a = text(a, n);
            for (const v of [a, b].filter(isUnknown)) {
              if (v.valueType === "string") {
                s.ps.comparisonModes ??= {};
                const root = v.rootId || v.id,
                  mode = sensitive ? "sensitive" : "folded";
                if (
                  s.ps.comparisonModes[root] &&
                  s.ps.comparisonModes[root] !== mode
                )
                  fail(
                    "未確認：大文字小文字を区別する比較と区別しない比較の組み合わせ",
                    n.line,
                    "未確認",
                  );
                s.ps.comparisonModes[root] = mode;
              }
            }
            if (!sensitive) {
              if (isUnknown(a) && a.valueType === "string")
                a = { ...a, id: a.id + ":folded" };
              else if (typeof a === "string") a = a.toLowerCase();
              if (isUnknown(b) && b.valueType === "string")
                b = { ...b, id: b.id + ":folded" };
              else if (typeof b === "string") b = b.toLowerCase();
            }
            return {
              ...unknown("実行時の値による比較"),
              op: base === "eq" ? "=" : "<>",
              a,
              b,
            };
          }
          if (
            ["gt", "ge", "lt", "le"].includes(base) &&
            !(
              (a?.valueType && a.valueType !== "number") ||
              (b?.valueType && b.valueType !== "number")
            )
          )
            return {
              ...unknown("実行時の数値比較"),
              op: { gt: ">", ge: ">=", lt: "<", le: "<=" }[base],
              a,
              b,
            };
          fail("未確認：未確定値に対する " + op + " の比較", n.line, "未確認");
        }
        if (["like", "notlike", "match", "notmatch"].includes(base)) {
          const input = text(a, n),
            pattern = text(b, n);
          let re;
          if (base.endsWith("like")) {
            if (/[\[\]`]/.test(pattern))
              fail("未対応：-likeの文字クラス／エスケープ", n.line);
            re = new RegExp(
              "^" +
                pattern
                  .split("")
                  .map((c) =>
                    c === "*"
                      ? ".*"
                      : c === "?"
                        ? "."
                        : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  )
                  .join("") +
                "$",
              sensitive ? "" : "i",
            );
          } else {
            if (
              /\(\?|\\[pPAZzGK]|[^\x00-\x7f]/.test(pattern) ||
              (/\\[dw]/.test(pattern) && /[^\x00-\x7f]/.test(input))
            )
              fail("未対応：.NET固有または非ASCIIの正規表現", n.line);
            try {
              re = new RegExp(pattern, sensitive ? "" : "i");
            } catch {
              fail("正規表現が不正です", n.line, "RuntimeException");
            }
          }
          const match = re.exec(input);
          if (base === "match" && match)
            ciSet(s.vars, "Matches", hash(match.map((v, i) => [i, v])));
          return base.startsWith("not") ? !match : !!match;
        }
        if (Array.isArray(b)) {
          // R22-N14: 右辺がコレクションでも左辺がスカラー／$null のときは
          // フィルタ意味論にならず通常のスカラー比較になる
          // （about_Comparison_Operators：右辺は常に単独の値として扱われる）。
          // $null -eq @() は False、$null -ne @() は True。
          if (base === "eq") return false;
          if (base === "ne") return true;
          if (a === null) return false;
          fail("未対応：右辺が配列の比較", n.line);
        }
        // R24-N14: バージョンオブジェクトとの比較は、相手（文字列・数値・
        // バージョンオブジェクト）を版として解釈し成分ごとに比べる
        // （System.Version の比較規則。未指定成分は -1）。
        if (isVersionValue(a) || isVersionValue(b)) {
          const tuple = (v) => {
            if (isVersionValue(v))
              return [
                v.properties.Major,
                v.properties.Minor,
                v.properties.Build,
                v.properties.Revision,
              ];
            if (typeof v === "string" && /^\d+(?:\.\d+){0,3}$/.test(v.trim())) {
              const parts = v.trim().split(".").map(Number);
              while (parts.length < 4) parts.push(-1);
              return parts;
            }
            if (typeof v === "number" && Number.isFinite(v))
              return [v, -1, -1, -1];
            return null;
          };
          const av = tuple(a),
            bv = tuple(b);
          if (av && bv) {
            let cmp = 0;
            for (let i = 0; i < 4; i++)
              if (av[i] !== bv[i]) {
                cmp = av[i] < bv[i] ? -1 : 1;
                break;
              }
            return base === "eq"
              ? cmp === 0
              : base === "ne"
                ? cmp !== 0
                : base === "gt"
                  ? cmp > 0
                  : base === "ge"
                    ? cmp >= 0
                    : base === "lt"
                      ? cmp < 0
                      : cmp <= 0;
          }
          if (base === "eq") return false;
          if (base === "ne") return true;
          fail("未対応：バージョン値との順序比較の相手", n.line);
        }
        let x = a,
          y = b;
        if (x === null || y === null)
          return base === "eq"
            ? x === y
            : base === "ne"
              ? x !== y
              : base === "ge" || base === "le"
                ? x === y
                : false;
        if (typeof x === "string") {
          y = text(y, n);
          if (!sensitive) {
            x = x.toLowerCase();
            y = y.toLowerCase();
          }
        } else if (typeof x === "number") {
          try {
            y = numeric(y, n);
          } catch (e) {
            if (base === "eq" || base === "ne") return base === "ne";
            throw e;
          }
        } else if (typeof x === "boolean") y = truth(y);
        return base === "eq"
          ? x === y
          : base === "ne"
            ? x !== y
            : base === "gt"
              ? x > y
              : base === "ge"
                ? x >= y
                : base === "lt"
                  ? x < y
                  : x <= y;
      }
      if (isUnknown(a) || isUnknown(b)) {
        if (op === "+" && a?.valueType === "string")
          return {
            ...unknown(
              "実行時の文字列連結",
              capUnknownId(a.id + ":concat:" + String(b?.id || b)),
            ),
            valueType: "string",
            compound: true,
          };
        if ([a, b].some((v) => isUnknown(v) && v.valueType !== "number"))
          fail("未確認：型変換を伴う未確定値の算術", n.line, "未確認");
        return {
          ...unknown("実行時の値による演算"),
          op,
          a,
          b,
          valueType: "number",
        };
      }
      // P-N1: 配列連結も値の大きさの上限の対象にする（倍々連結で実体を
      // 爆発させず、未確定値へ倒す）。要素数に加えて総内容量でも見積もる
      // （大きな文字列への参照を多数含む配列は、スナップショット転送で
      // 要素ごとに複製され実サイズが爆発するため）。
      if (op === "+" && Array.isArray(a)) {
        const total = a.length + (Array.isArray(b) ? b.length : 1);
        if (
          total > VALUE_LENGTH_LIMIT ||
          contentSize(a) + contentSize(b) > VALUE_LENGTH_LIMIT
        )
          return unknown("とても長い配列");
        return [...a, ...(Array.isArray(b) ? b : [b])];
      }
      if (op === "+" && typeof a === "string") {
        const tb = text(b, n);
        if (isUnknown(tb)) return tb;
        // P-N1: 文字列連結は実体を作る前に長さを見積もり、上限を超える
        // 結果は Python 系統と同じく未確定値へ倒す。
        if (a.length + tb.length > VALUE_LENGTH_LIMIT)
          return {
            ...unknown("とても長い文字列"),
            valueType: "string",
            compound: true,
          };
        return a + tb;
      }
      if (op === "*") {
        // R22-N12／R24-N3残り：文字列・配列の繰返し
        // （about_Arithmetic_Operators）。回数は整数へ変換される。
        // 順方向（文字列／配列×数値）と逆方向（数値×配列／文字列）で
        // 同じ変換・丸め・上限を使うため、繰返し本体は共有する。
        // 上限は P-N1 の値サイズガードの既存規律（文字列100000字・
        // 配列10000要素）そのもので、新しい上限は作らない。
        const replicate = (value, rawCount) => {
          const raw = numeric(rawCount, n);
          if (!Number.isFinite(raw))
            fail(
              "繰返し回数を整数へ変換できません",
              n.line,
              "RuntimeException",
            );
          // .NET の整数変換に合わせ、小数部は最近接へ丸める（.5 は偶数側）。
          let count = Math.floor(raw);
          const frac = raw - count;
          if (frac > 0.5 || (frac === 0.5 && count % 2 !== 0)) count++;
          else if (frac < -0.5 || (frac === -0.5 && count % 2 !== 0)) count--;
          if (count < 0)
            fail("繰返し回数は0以上が必要です", n.line, "RuntimeException");
          if (
            (typeof value === "string" && value.length * count > 100000) ||
            (Array.isArray(value) && value.length * count > 10000)
          )
            fail(
              "未確認：繰返し結果がモデルの上限を超えます",
              n.line,
              "未確認",
            );
          if (typeof value === "string") return value.repeat(count);
          const repeated = [];
          for (let i = 0; i < count; i++) repeated.push(...value);
          return repeated;
        };
        if (typeof a === "string" || Array.isArray(a)) return replicate(a, b);
        // R24-N3残り（統合時裁定）：逆方向（数値×配列／数値×非数値文字列）は
        // 繰返しにならない。about_Arithmetic_Operators は「評価方法は式の
        // 左端のオブジェクトの型で決まる」「右辺を左辺の型へ変換できなければ
        // 演算は失敗する」「乗算は厳密には交換可能でない（(ab) と (ba) は
        // 常には一致しない）」と定め、実例 16 + "file" は変換エラーになる。
        // 繰返しの実例はすべて文字列／配列が左辺の形のみ。したがって
        // 2 * @(1,2) や 3 * "ab" は後段の数値変換で正直に停止するのが
        // 実物の挙動であり、数値文字列（2 * "3" = 6）は従来どおり変換される。
        // 配列×配列も同様に数値変換の失敗で停止する（実物でもエラー）。
      }
      const rawA = a,
        rawB = b;
      a = numeric(a, n);
      b = numeric(b, n);
      // R28-N3: 0 除算・0 剰余の扱いは型で決まる（Microsoft Learn
      // DivideByZeroException：例外が発生するのは整数値または Decimal
      // 値を 0 で割った場合であり、浮動小数点値では IEEE 754 の規則で
      // ±Infinity／NaN になる）。被演算子のどちらかが小数（double）
      // 由来なら浮動小数点演算として非有限値を返し、整数同士の場合
      // だけ従来どおり「0による除算です」で止める。小数の判定は、
      // 呼び出し側が式の由来から求めた floatCtx、変換前の値の形
      // （非整数の数値・小数形の数値文字列）、変換後の非整数性による。
      let ieeeZero = false;
      if ((op === "/" || op === "%") && b === 0) {
        const floating =
          floatCtx ||
          (typeof rawA === "number" && !Number.isInteger(rawA)) ||
          (typeof rawB === "number" && !Number.isInteger(rawB)) ||
          (typeof rawA === "string" && numericStringIsDouble(rawA)) ||
          (typeof rawB === "string" && numericStringIsDouble(rawB)) ||
          !Number.isInteger(a) ||
          !Number.isInteger(b);
        if (!floating) fail("0による除算です", n.line, "RuntimeException");
        ieeeZero = true;
      }
      const v =
        op === "+"
          ? a + b
          : op === "-"
            ? a - b
            : op === "*"
              ? a * b
              : op === "/"
                ? a / b
                : op === "%"
                  ? a % b
                  : undefined;
      if (v === undefined) fail("未対応の演算子：" + op, n.line);
      if (
        (!Number.isFinite(v) && !ieeeZero) ||
        (Number.isInteger(v) && !Number.isSafeInteger(v))
      )
        fail("未確認：PowerShell演算のモデル数値範囲外", n.line, "未確認");
      return v;
    }
    function capture(body, s, api) {
      s.ps.streams.push([]);
      const out = exec(body, [s], api);
      return out.map((st) => ({ s: st, values: st.ps.streams.pop() }));
    }
    function only(pipe, s, api, n) {
      const values = pipeline(pipe, s, api);
      if (values.length !== 1 || values[0].s !== s)
        fail(
          "未対応：この式位置にある入力候補／分岐を含むパイプライン",
          n.line,
        );
      return Object.hasOwn(values[0], "expressionValue")
        ? values[0].expressionValue
        : values[0].values.length
          ? scalar(values[0].values)
          : undefined;
    }
    // R28-N4: ++／-- の評価。++ は about_Assignment_Operators のとおり
    // 「数値であるか、数値へ変換可能でなければならない」演算であり、
    // 文字列の代入先では数値へ変換してから増やす（'5'++ → 6）。
    // 通常の + 演算は文字列では連結になる（$s += 1 の '51' は実物
    // どおり）ため、文字列の場合だけ -- と同じ数値変換経路を通す。
    // 変換できない文字列（'abc'・''）は変換エラーで止まる。
    function incDec(v, op, s, n, api) {
      if (op === "++" && typeof v === "string") {
        const updated = numeric(v, n) + 1;
        if (
          !Number.isFinite(updated) ||
          (Number.isInteger(updated) && !Number.isSafeInteger(updated))
        )
          fail("未確認：PowerShell演算のモデル数値範囲外", n.line, "未確認");
        return updated;
      }
      return binary(op === "++" ? "+" : "-", v, 1, s, n, api);
    }
    function read(a, s, api) {
      api.check();
      const ref = {
        var: "変数",
        string: "文字列",
        array: "配列",
        "array-pipelines": "配列",
        hashtable: "ハッシュテーブル",
      }[a.k];
      if (ref) (s.pendingRefs ??= []).push(ref);
      if (a.k === "binary" && a.op.startsWith("-"))
        (s.pendingRefs ??= []).push("比較演算子");
      if (a.k === "literal") return a.value;
      if (a.k === "var") return get(s, a.name);
      if (a.k === "string") {
        if (a.quote === "'") return a.value;
        let result = "",
          i = 0,
          unknownParts = [];
        while (i < a.value.length) {
          // P-N1（連結以外の成長経路）: 展開文字列は変数値を繰り返し埋め
          // 込めるため、累積長が上限を超えたら実体を作らず未確定値へ倒す。
          if (result.length > VALUE_LENGTH_LIMIT)
            return {
              ...unknown("とても長い文字列"),
              valueType: "string",
              compound: true,
            };
          const c = a.value[i];
          if (c === "`") {
            const e = a.value[++i];
            result +=
              {
                n: "\n",
                r: "\r",
                t: "\t",
                0: "\0",
                a: "\x07",
                b: "\b",
                f: "\f",
                v: "\v",
              }[e] ??
              e ??
              "";
            i++;
            continue;
          }
          if (c === "$" && a.value[i + 1] === "(") {
            let end = i + 2,
              depth = 1,
              quote = null;
            for (; end < a.value.length && depth; end++) {
              const ch = a.value[end];
              if (ch === "`") {
                end++;
                continue;
              }
              if (quote) {
                if (ch === quote) quote = null;
              } else if (ch === '"' || ch === "'") quote = ch;
              else if (ch === "(") depth++;
              else if (ch === ")") depth--;
            }
            if (depth)
              fail("文字列の部分式が閉じられていません", a.line, "SyntaxError");
            const parts = capture(
              parsePS(a.value.slice(i + 2, end - 1), a.line),
              s,
              api,
            );
            if (parts.length !== 1 || parts[0].s !== s)
              fail("未対応：文字列部分式内の分岐", a.line);
            const v = text(scalar(parts[0].values), a);
            if (isUnknown(v)) {
              unknownParts.push(v);
              result += "?";
            } else result += v;
            i = end;
            continue;
          }
          if (c === "$") {
            const m = a.value
              .slice(i)
              .match(/^\$(?:\{([^}]+)\}|([\p{L}_][\p{L}\p{N}_]*|\?))/u);
            if (m) {
              const v = text(get(s, m[1] || m[2]), a);
              if (isUnknown(v)) {
                unknownParts.push(v);
                result += "?";
              } else result += v;
              i += m[0].length;
              continue;
            }
          }
          result += c;
          i++;
        }
        if (unknownParts.length) {
          if (
            unknownParts.length === 1 &&
            /^\$[\p{L}_][\p{L}\p{N}_]*$/u.test(a.value)
          )
            return unknownParts[0];
          return {
            ...unknown(
              "実行時に展開する文字列",
              capUnknownId(
                a.value + ":" + unknownParts.map((v) => v.id).join(":"),
              ),
            ),
            valueType: "string",
            compound: true,
          };
        }
        return result;
      }
      if (a.k === "array") return a.values.map((v) => read(v, s, api));
      if (a.k === "array-pipelines")
        return a.values.flatMap((p) => enumerate(only(p, s, api, a)));
      if (a.k === "subexpression") return only(a.pipe, s, api, a);
      if (a.k === "hashtable") {
        const h = hash([]),
          seen = new Set();
        for (const [key, p] of a.entries) {
          if (seen.has(String(key).toLowerCase()))
            fail(
              "ハッシュテーブルのキーが重複しています：" + key,
              a.line,
              "SyntaxError",
            );
          seen.add(String(key).toLowerCase());
          h.entries.set(key, only(p, s, api, a));
        }
        return h;
      }
      if (a.k === "cast") {
        const v = read(a.arg, s, api);
        // R27-N4: 完全修飾型名（System.String 等）と配列型（int[] 等）を
        // 解釈する。文法 B.1.11 の type-name はドット連結を許し、
        // type-spec には array-type-name／generic-type-name がある。
        // System. 接頭辞は外し、完全修飾の PSCustomObject も対応する。
        // 配列型は対応する要素型の変換を要素ごとに適用する（実物の
        // [int[]]／[string[]] の変換規則）。ジェネリック型・多次元配列型
        // などモデル化できない型は、型名そのものを名指して止める。
        let type = a.type.toLowerCase().replace(/\s+/g, "");
        if (type.startsWith("system.")) type = type.slice("system.".length);
        if (type === "management.automation.pscustomobject")
          type = "pscustomobject";
        if (type.endsWith("[]")) {
          const base = type.slice(0, -2);
          if (!["string", "int", "int32", "double", "bool", "boolean"].includes(base))
            fail("未対応の型変換：[" + a.type + "]", a.line);
          if (isUnknown(v))
            fail("未確認：型変換の入力が確定していません", a.line, "未確認");
          const items = Array.isArray(v) ? v : [v];
          return items.map((x) =>
            read(
              {
                k: "cast",
                type: base,
                arg: { k: "literal", value: x, line: a.line },
                line: a.line,
              },
              s,
              api,
            ),
          );
        }
        if (type === "pscustomobject" && isObject(v))
          return object(
            v.psType === "Hashtable"
              ? Object.fromEntries(v.entries)
              : { ...v.properties },
          );
        if (type === "string") return text(v, a);
        if (type === "bool" || type === "boolean") return truth(v);
        if (type === "int" || type === "int32") {
          if (isUnknown(v))
            fail("未確認：int変換の入力が確定していません", a.line, "未確認");
          const num = numeric(v, a),
            rounded = Math.round(num);
          if (
            rounded < -2147483648 ||
            rounded > 2147483647 ||
            !Number.isInteger(num)
          )
            fail("未対応：int変換の丸め／範囲外", a.line);
          return rounded;
        }
        if (type === "double") return numeric(v, a);
        fail("未対応の型変換：[" + a.type + "]", a.line);
      }
      if (a.k === "member")
        return property(read(a.target, s, api), memberKey(a, s, api), a);
      if (a.k === "ternary") {
        // R28-N7: 三項演算子。選ばれた側だけを評価する（実物どおりの
        // 短絡）。条件が未確定値の場合は捏造せず未確定値として返す。
        const tv = truth(read(a.test, s, api));
        if (isUnknown(tv)) return { ...unknown("三項演算子の条件") };
        return tv ? read(a.then, s, api) : read(a.else, s, api);
      }
      if (a.k === "index") {
        const v = read(a.target, s, api),
          i = read(a.index, s, api);
        if (isUnknown(v) || isUnknown(i))
          fail("未確認：添字が確定していません", a.line, "未確認");
        if (isObject(v) && v.psType === "Hashtable")
          return v.entries.get(hashKey(v, i)) ?? null;
        if (Array.isArray(v) || typeof v === "string") {
          // SH-P7: 範囲（1..2）など整数の配列による添字は正規の構文。
          // 要素ごとに取り出して配列で返す（範囲外は $null）。
          if (Array.isArray(i)) {
            if (!i.every((x) => Number.isInteger(x)))
              fail("整数の添字が必要です", a.line, "RuntimeException");
            return i.map((x) => v[x < 0 ? v.length + x : x] ?? null);
          }
          if (!Number.isInteger(i))
            fail("整数の添字が必要です", a.line, "RuntimeException");
          return v[i < 0 ? v.length + i : i] ?? null;
        }
        if (v === null)
          fail("null配列には添字を指定できません", a.line, "RuntimeException");
        fail("未対応の添字対象です", a.line);
      }
      if (a.k === "unary") {
        const v = read(a.arg, s, api);
        if (["!", "-not"].includes(a.op))
          return isUnknown(v)
            ? { ...unknown("条件の否定"), op: "!", a: truth(v) }
            : !truth(v);
        if (isUnknown(v)) return { ...unknown("単項演算"), op: a.op, a: v };
        return a.op === "-" ? -numeric(v, a) : numeric(v, a);
      }
      if (a.k === "post") {
        // R27-N3: 代入先の検証を数値変換より先に行う。-- の経路だけが
        // 先に binary（- 演算）の変換を試みたため、文字列リテラルへの
        // 後置 -- が変換エラーを名指していた（++・数値リテラル形は
        // set() の防御層で「代入先が不正です」になる非対称）。真因は
        // リテラルが代入先にならないこと（実物は InvalidLeftHandSide：
        // 代入演算子の入力は変数・プロパティ・添字でなければならない）。
        if (!["var", "member", "index"].includes(a.target.k))
          fail(
            "代入先が不正です：++／--や代入の対象は変数・プロパティ・添字である必要があります",
            a.line,
            "RuntimeException",
          );
        const v = read(a.target, s, api);
        if (isUnknown(v))
          fail("未確認：未確定値のインクリメント", a.line, "未確認");
        set(s, a.target, incDec(v, a.op, s, a, api), a, api);
        return v;
      }
      if (a.k === "pre") {
        // R22-N16: 前置 ++／-- は更新後の値を返す。
        // R27-N3: 後置と同じく、代入先の検証を変換より先に行う。
        if (!["var", "member", "index"].includes(a.target.k))
          fail(
            "代入先が不正です：++／--や代入の対象は変数・プロパティ・添字である必要があります",
            a.line,
            "RuntimeException",
          );
        const v = read(a.target, s, api);
        if (isUnknown(v))
          fail("未確認：未確定値のインクリメント", a.line, "未確認");
        const updated = incDec(v, a.op, s, a, api);
        set(s, a.target, updated, a, api);
        return updated;
      }
      if (a.k === "binary") {
        const x = read(a.a, s, api);
        if (["-and", "-or"].includes(a.op) && isUnknown(truth(x))) {
          const effects = (node) =>
            node &&
            typeof node === "object" &&
            (node.k === "post" ||
              node.k === "pre" ||
              node.k === "command" ||
              Object.values(node).some((v) =>
                Array.isArray(v) ? v.some(effects) : effects(v),
              ));
          if (effects(a.b))
            fail("未確認：未確定の短絡評価にある副作用", a.line, "未確認");
        }
        if (a.op === "-and" && truth(x) === false) return false;
        if (a.op === "-or" && truth(x) === true) return true;
        // R28-N3: 小数の由来は右辺の評価（副作用）より前に、現在の
        // 状態で判定する。
        const floatCtx = exprIsDouble(a.a, s) || exprIsDouble(a.b, s);
        return binary(a.op, x, read(a.b, s, api), s, a, api, floatCtx);
      }
      fail("未対応：PowerShell式 " + a.k, a.line);
    }
    // §3.3 再裁定（デバイス名）：Windows の予約デバイス名は、どの
    // フォルダでも・拡張子を付けても通常ファイルではない
    // （shell/model.js の reservedDeviceName、Microsoft Learn
    // 「Naming Files, Paths, and Namespaces」）。
    // 読み取り経路：NUL は即 EOF の空として扱い、それ以外のデバイスは
    // デバイス名を名指して停止する（CON は対話入力でモデル化できない）。
    // 書き込み経路：cmd 側の是正済み意味論に合わせ、NUL は内容を破棄
    // してファイルを作らず、CON／CONOUT$ は画面へ出力し、それ以外の
    // デバイスは名前を挙げて停止する。
    const deviceOf = (raw, s, line) => {
      if (typeof raw !== "string") return null;
      const full = windowsPath(raw, s.model.cwd, line);
      if (isUnknown(full)) return null;
      return reservedDeviceName(full);
    };
    const resolvedPath = (raw, s, line) => {
      if (typeof raw !== "string") return null;
      const full = windowsPath(raw, s.model.cwd, line);
      return isUnknown(full) ? null : full;
    };
    // コピー／移動の最終的な書き込み先（既存フォルダ宛はその中へ元名で）。
    const finalDestPath = (srcRaw, dstRaw, s, line) => {
      const full = resolvedPath(dstRaw, s, line);
      if (full === null) return null;
      const dest = fsEntry(s, full, line);
      if (dest?.type === "directory")
        return full.replace(/\\$/, "") + "\\" + String(srcRaw).replaceAll("/", "\\").split("\\").at(-1);
      return full;
    };
    function command(c, s, api, input, hasInput = false) {
      const canonical =
          alias[c.name.toLowerCase()] ||
          [
            "Write-Output",
            "Write-Host",
            "Read-Host",
            "Get-ChildItem",
            "Where-Object",
            "ForEach-Object",
            "Select-Object",
            "Sort-Object",
            "Measure-Object",
            "Get-Location",
            "Set-Location",
            "Test-Path",
            "Get-Content",
            "Set-Content",
            "Add-Content",
            "New-Item",
            "Remove-Item",
            "Rename-Item",
            "Copy-Item",
            "Move-Item",
          ].find((x) => x.toLowerCase() === c.name.toLowerCase()) ||
          c.name,
        name = canonical.toLowerCase(),
        args = c.args.map((a) => (a.k === "block" ? a : read(a, s, api))),
        params = Object.fromEntries(
          Object.entries(c.params).map(([k, v]) => [k, read(v, s, api)]),
        );
      const p = (name, pos, def) =>
        Object.hasOwn(params, name) ? params[name] : (args[pos] ?? def);
      const known = {
        "write-output": ["inputobject"],
        "write-host": ["object", "separator"],
        "read-host": ["prompt"],
        "get-childitem": ["path", "filter", "recurse", "file", "directory"],
        "where-object": ["filterscript"],
        "foreach-object": ["process"],
        "select-object": [
          "property",
          "first",
          "last",
          "skip",
          "expandproperty",
        ],
        "sort-object": ["property", "descending"],
        "measure-object": ["property", "sum", "average", "maximum", "minimum"],
        "get-location": [],
        "set-location": ["path"],
        "test-path": ["path", "pathtype"],
        "get-content": ["path", "raw"],
        "set-content": ["path", "value", "nonewline"],
        "add-content": ["path", "value", "nonewline"],
        "new-item": ["path", "name", "itemtype", "value", "force"],
        "remove-item": ["path", "recurse", "force"],
        "rename-item": ["path", "newname"],
        "copy-item": ["path", "destination", "force"],
        "move-item": ["path", "destination", "force"],
      };
      const fn = ciGet(s.ps.functions, canonical);
      if (!fn && !Object.hasOwn(known, name))
        fail("未対応のPowerShellコマンドレット／関数：" + c.name, c.line);
      if (!fn)
        for (const key of Object.keys(params))
          if (!known[name].includes(key))
            fail("未対応のパラメータ：" + canonical + " -" + key, c.line);
      const maxArgs = {
        "get-location": 0,
        "set-location": 1,
        "test-path": 1,
        "get-content": 1,
        "set-content": 2,
        "add-content": 2,
        "new-item": 1,
        "remove-item": 1,
        "rename-item": 2,
        "copy-item": 2,
        "move-item": 2,
        "get-childitem": 1,
        "where-object": 1,
        "foreach-object": 1,
        "select-object": 1,
        "sort-object": 1,
        "measure-object": 1,
        "read-host": 1,
      };
      if (!fn && maxArgs[name] !== undefined && args.length > maxArgs[name])
        fail("未対応：" + canonical + "の追加の位置引数", c.line);
      const refs = fn
        ? fn.params.length
          ? ["function", "param"]
          : ["function"]
        : [
            Object.keys(alias).includes(c.name.toLowerCase())
              ? alias[c.name.toLowerCase()]
              : canonical,
          ];
      api.note(s, { ...c, refs }, c.name + " を評価します");
      if (fn) {
        if (s.ps.calls.length >= api.limits.depth) {
          api.stop(s, c, "関数呼び出しの深さ上限");
          return [{ s, values: [] }];
        }
        s.ps.calls.push({
          vars: s.vars,
          signal: s.ps.signal,
          functions: s.ps.functions,
          // R28-N3: 小数の由来の記録も呼び出しフレームと一緒に保つ
          // （引数名と外側の変数名が重なっても由来が漏れないように）。
          dbl: s.ps.dbl,
        });
        s.ps.dbl = { ...(s.ps.dbl ?? {}) };
        s.vars = { ...s.vars };
        s.ps.functions = { ...s.ps.functions };
        for (let i = 0; i < fn.params.length; i++) {
          const param = fn.params[i];
          // R27-N4: Alias 属性の別名でも名前付き引数を受け付ける
          // （about_Functions_Advanced_Parameters）。
          const namedKey = Object.keys(params).find(
            (k) =>
              k === param.name.toLowerCase() ||
              (param.aliases ?? []).some((al) => al.toLowerCase() === k),
          );
          const supplied = namedKey !== undefined || Object.hasOwn(args, i);
          // R27-N4: Mandatory のパラメータが与えられない場合、実物は
          // 対話プロンプトで入力を求める。このモデルは対話入力を
          // 持ちないため、既定値で黙って埋めず真因を名指して止める。
          if (param.mandatory && !supplied)
            fail(
              "未対応：必須パラメータ（Mandatory）への対話入力はモデル化できません：$" +
                param.name,
              c.line,
              "ParameterBindingException",
            );
          let v =
            namedKey !== undefined
              ? params[namedKey]
              : Object.hasOwn(args, i)
                ? args[i]
                : param.value
                  ? read(param.value, s, api)
                  : null;
          if (param.type === "bool")
            fail("未対応：bool型の関数パラメータ変換", c.line);
          if (param.type)
            v = read(
              {
                k: "cast",
                type: param.type,
                arg: { k: "literal", value: v, line: c.line },
                line: c.line,
              },
              s,
              api,
            );
          // R27-N4: ValidateSet 属性は、束縛された値（引数または既定値）
          // が候補集合に含まれることを検証する（実物は
          // ParameterBindingValidationException で停止する）。
          if (param.validateSet && (supplied || param.value)) {
            const values = Array.isArray(v) ? v : [v];
            if (
              !values.every((x) =>
                param.validateSet.some(
                  (cand) => String(cand).toLowerCase() === String(x).toLowerCase(),
                ),
              )
            )
              fail(
                "パラメータの値が検証属性 ValidateSet に一致しません：" +
                  String(v) +
                  "（候補：" +
                  param.validateSet.join(", ") +
                  "）",
                c.line,
                "ParameterBindingValidationException",
              );
          }
          // R28-N6: ValidateNotNull 系の括弧なし属性は、束縛された値が
          // $null でないことを検証する（実物は
          // ParameterBindingValidationException で停止する）。
          if (param.validateNotNull && supplied && v === null)
            fail(
              "パラメータの値が検証属性 ValidateNotNull に一致しません：$" +
                param.name +
                " に $null は指定できません",
              c.line,
              "ParameterBindingValidationException",
            );
          ciSet(s.vars, param.name, v);
          markDouble(s, param.name, v);
        }
        for (const key of Object.keys(params))
          if (
            !fn.params.some(
              (x) =>
                x.name.toLowerCase() === key ||
                (x.aliases ?? []).some((al) => al.toLowerCase() === key),
            )
          )
            fail(
              "関数のパラメータがありません：" + key,
              c.line,
              "RuntimeException",
            );
        ciSet(s.vars, "args", args.slice(fn.params.length));
        return capture(fn.body, s, api).map((r) => {
          const frame = r.s.ps.calls.pop();
          r.s.vars = frame.vars;
          r.s.ps.signal = frame.signal;
          r.s.ps.functions = frame.functions;
          if (frame.dbl !== undefined) r.s.ps.dbl = frame.dbl;
          return r;
        });
      }
      if (name === "write-output") {
        if (!args.length && !Object.hasOwn(params, "inputobject")) {
          if (!hasInput)
            fail(
              "Write-OutputにはInputObjectが必要です",
              c.line,
              "ParameterBindingException",
            );
          return [{ s, values: input }];
        }
        return [
          {
            s,
            values: enumerate(p("inputobject", 0, null)).concat(
              args.slice(1).flatMap(enumerate),
            ),
          },
        ];
      }
      if (name === "write-host") {
        if (!args.length && !Object.hasOwn(params, "object") && hasInput) {
          for (const value of input)
            s.outputs.push({
              channel: "Write-Host",
              text: psFormat(value),
              line: c.line,
            });
          return [{ s, values: [] }];
        }
        const separator = p("separator", 100, " "),
          // NX-N27: 位置引数の配列形（"a","b"）も要素へ展開してから
          // separator で連結する。展開しないと配列の文字列化（空白区切り）
          // がそのまま画面出力になり -Separator が無視される。
          values = (
            Object.hasOwn(params, "object")
              ? enumerate(params.object)
              : args
          ).flatMap(enumerate);
        const parts = values.map((v) => text(v, c));
        s.outputs.push({
          channel: "Write-Host",
          text: parts.some(isUnknown)
            ? formatValue(unknown("実行時の画面出力"))
            : parts.join(separator),
          line: c.line,
        });
        return [{ s, values: [] }];
      }
      if (name === "read-host") {
        const prompt = p("prompt", 0, "Read-Host");
        if (isUnknown(prompt))
          fail("未確認：Read-Hostのプロンプト", c.line, "未確認");
        const candidates = inputValue(
          s,
          String(prompt),
          api,
          c,
          String(prompt) + " の入力",
        );
        if (!candidates.length)
          fail("入力候補は1つ以上必要です", c.line, "モデルエラー");
        if (candidates.length > api.limits.paths)
          api.stop(s, c, "入力候補のパス数上限");
        return candidates.slice(0, api.limits.paths).map((v) => ({
          s: structuredClone(s),
          values: [isUnknown(v) ? { ...v, valueType: "string" } : String(v)],
        }));
      }
      if (["where-object", "foreach-object"].includes(name)) {
        const block = p(
          name === "where-object" ? "filterscript" : "process",
          0,
        );
        if (block?.k !== "block")
          fail("未対応：" + canonical + "はスクリプトブロック形式のみ", c.line);
        let states = [s];
        s.ps.pipes.at(-1).result = [];
        for (let i = 0; i < input.length; i++) {
          const next = [];
          for (const st of states) {
            const f = st.ps.pipes.at(-1);
            st.ps.items.push(f.items[i]);
            for (const r of capture(block.body, st, api)) {
              r.s.ps.items.pop();
              if (name === "foreach-object") {
                r.s.ps.pipes.at(-1).result.push(...r.values);
                next.push(r.s);
              } else
                for (const branch of api.choose(
                  r.s,
                  truth(scalar(r.values)),
                  c,
                )) {
                  if (branch.yes) {
                    const frame = branch.s.ps.pipes.at(-1);
                    frame.result.push(frame.items[i]);
                  }
                  next.push(branch.s);
                }
            }
          }
          states = cap(next, c, api);
        }
        return states.map((st) => ({
          s: st,
          values: st.ps.pipes.at(-1).result,
        }));
      }
      if (name === "select-object") {
        let values = input.filter((v) => v !== null && v !== undefined);
        const skip = Number(p("skip", 100, 0)),
          first = p("first", 100, null),
          last = p("last", 100, null);
        for (const n of [skip, first, last].filter((v) => v !== null))
          if (!Number.isInteger(Number(n)) || Number(n) < 0)
            fail(
              "Select-Objectの件数は0以上の整数が必要です",
              c.line,
              "RuntimeException",
            );
        values = values.slice(skip);
        if (first !== null) values = values.slice(0, Number(first));
        if (last !== null)
          values = Number(last) === 0 ? [] : values.slice(-Number(last));
        const expand = p("expandproperty", 100, null);
        if (expand !== null)
          return [
            {
              s,
              values: values.flatMap((v) => enumerate(property(v, expand, c))),
            },
          ];
        const keys = p("property", 0, null);
        return [
          {
            s,
            values:
              keys === null
                ? values
                : values.map((v) =>
                    object(
                      Object.fromEntries(
                        enumerate(keys).map((key) => [
                          String(key),
                          property(v, key, c),
                        ]),
                      ),
                    ),
                  ),
          },
        ];
      }
      if (name === "sort-object") {
        const keys = enumerate(p("property", 0, null)),
          descending = !!p("descending", 100, false);
        const values = input.filter((v) => v !== null && v !== undefined);
        const collator = new Intl.Collator("en-US", { sensitivity: "base" });
        values.sort((a, b) => {
          for (const key of keys.length ? keys : [null]) {
            const x = key === null ? a : property(a, key, c),
              y = key === null ? b : property(b, key, c);
            if (isUnknown(x) || isUnknown(y))
              fail(
                "未確認：Sort-Objectの値が確定していません",
                c.line,
                "未確認",
              );
            const diff =
              typeof x === "number" && typeof y === "number"
                ? x - y
                : collator.compare(text(x, c), text(y, c));
            if (diff) return descending ? -diff : diff;
          }
          return 0;
        });
        return [{ s, values }];
      }
      if (name === "measure-object") {
        const key = p("property", 0, null),
          measured = input
            .map((v) => (key === null ? v : property(v, key, c)))
            .filter((v) => v !== null && v !== undefined),
          props = {
            Count: measured.length,
            Average: null,
            Sum: null,
            Maximum: null,
            Minimum: null,
            StandardDeviation: null,
            Property: key ?? null,
          };
        const active = ["sum", "average", "maximum", "minimum"].filter(
          (k) => params[k],
        );
        if (active.length) {
          const nums = measured.map((v) => numeric(v, c));
          if (nums.some(isUnknown))
            fail(
              "未確認：Measure-Objectの集計値が確定していません",
              c.line,
              "未確認",
            );
          if (params.sum) props.Sum = nums.reduce((a, b) => a + b, 0);
          if (params.average)
            props.Average = nums.length
              ? nums.reduce((a, b) => a + b, 0) / nums.length
              : null;
          if (params.maximum)
            props.Maximum = nums.length ? Math.max(...nums) : null;
          if (params.minimum)
            props.Minimum = nums.length ? Math.min(...nums) : null;
        }
        return [{ s, values: [object(props, "GenericMeasureInfo")] }];
      }
      if (name === "get-location")
        return [{ s, values: [pathInfo(s.model.cwd)] }];
      if (name === "set-location") {
        const target = windowsPath(
            p("path", 0, s.model.cwd),
            s.model.cwd,
            c.line,
          ),
          entry = fsEntry(s, target, c.line);
        if (isUnknown(entry)) fail("未確認：移動先", c.line, "未確認");
        if (!entry || entry.type !== "directory")
          fail(
            "モデルに移動先フォルダがありません：" + target,
            c.line,
            "ItemNotFoundException",
          );
        s.model.cwd = target;
        return [{ s, values: [] }];
      }
      if (name === "get-childitem") {
        const path = p("path", 0, s.model.cwd);
        if (isUnknown(path)) fail("未確認：列挙パス", c.line, "未確認");
        const entry = fsEntry(s, path, c.line),
          pattern = String(path),
          hasPattern = /[*?]/.test(pattern);
        let values;
        if (entry?.type === "file") values = [entry];
        else {
          if (!entry && !hasPattern)
            fail(
              "モデルにパスがありません：" + path,
              c.line,
              "ItemNotFoundException",
            );
          const folder = entry?.type === "directory" ? entry.path : s.model.cwd,
            filter = p("filter", 100, hasPattern ? pattern : "*");
          values = listFiles(
            { ...s, model: { ...s.model, cwd: folder } },
            filter,
            c.line,
          );
          if (p("recurse", 100, false) && entry?.type === "directory") {
            values = s.model.files.filter((e) =>
              e.path.toLowerCase().startsWith(folder.toLowerCase() + "\\"),
            );
            if (filter !== "*") {
              const re = new RegExp(
                "^" +
                  String(filter)
                    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                    .replaceAll("*", ".*")
                    .replaceAll("?", ".") +
                  "$",
                "i",
              );
              values = values.filter((e) => re.test(e.path.split("\\").at(-1)));
            }
          }
        }
        if (p("file", 100, false))
          values = values.filter((e) => e.type === "file");
        if (p("directory", 100, false))
          values = values.filter((e) => e.type === "directory");
        return [{ s, values: values.map(info) }];
      }
      if (name === "test-path") {
        const path = p("path", 0, null);
        if (isUnknown(path))
          return [
            { s, values: [unknown("実行時のパスの存在", path.id + ":exists")] },
          ];
        if (path === null || path === undefined)
          fail(
            "Test-Pathにはnull以外のパスが必要です",
            c.line,
            "ParameterBindingException",
          );
        if (String(path).trim() === "") return [{ s, values: [false] }];
        const e = /[*?]/.test(String(path))
            ? listFiles(s, path, c.line)[0]
            : fsEntry(s, path, c.line),
          kind = String(p("pathtype", 100, "any")).toLowerCase();
        if (!["any", "leaf", "container"].includes(kind))
          fail("未対応：Test-Path -PathType", c.line);
        return [
          {
            s,
            values: [
              !!e &&
                (kind === "any" ||
                  (kind === "leaf" && e.type === "file") ||
                  (kind === "container" && e.type === "directory")),
            ],
          },
        ];
      }
      if (name === "get-content") {
        // §3.3 再裁定：読み取り経路のデバイス名。NUL は即 EOF（空）として
        // 正直に扱い、CON 等はデバイス名を名指して停止する（従来の
        // 「モデルにファイルがありません」はデバイスを名指さない虚偽原因）。
        const readDevice = deviceOf(p("path", 0, null), s, c.line);
        if (readDevice === "NUL")
          return [{ s, values: !!p("raw", 100, false) ? [""] : [] }];
        if (readDevice)
          fail(
            "未対応：予約デバイス名 " +
              readDevice +
              " からの読み取り（デバイス入力はモデル化できません）",
            c.line,
          );
        const e = fsEntry(s, p("path", 0, null), c.line);
        if (!e || e.type !== "file")
          fail("モデルにファイルがありません", c.line, "ItemNotFoundException");
        if (e.content === undefined || isUnknown(e.content))
          fail("未確認：ファイル内容がモデルにありません", c.line, "未確認");
        const raw = !!p("raw", 100, false);
        return [
          {
            s,
            values: raw
              ? [e.content]
              : e.content
                  .replace(/\r\n/g, "\n")
                  .split("\n")
                  .filter((v, i, a) => i < a.length - 1 || v !== ""),
          },
        ];
      }
      if (name === "set-content" || name === "add-content") {
        const values = enumerate(p("value", 1, input));
        const strings = values.map((v) => text(v, c));
        if (strings.some(isUnknown))
          fail("未確認：書き込む文字列", c.line, "未確認");
        const noNewline = !!p("nonewline", 100, false),
          content = noNewline
            ? strings.join("")
            : strings.map((v) => v + "\r\n").join("");
        // §3.3 再裁定：書き込み先が予約デバイス名なら通常ファイルを作らない。
        const writeDevice = deviceOf(p("path", 0, null), s, c.line);
        if (writeDevice === "NUL") {
          api.note(
            s,
            { ...c, refs: [] },
            "予約デバイス NUL へ書き込みます（内容は破棄され、ファイルは作られません）",
          );
          return [{ s, values: [] }];
        }
        if (writeDevice === "CON" || writeDevice === "CONOUT$") {
          s.outputs.push({
            channel: "Write-Host",
            text: noNewline ? strings.join("") : strings.join("\n"),
            line: c.line,
          });
          api.note(s, { ...c, refs: [] }, "予約デバイス CON へ出力します（画面表示）");
          return [{ s, values: [] }];
        }
        if (writeDevice)
          fail(
            "未対応：予約デバイス名 " + writeDevice + " への書き込み",
            c.line,
          );
        writeFile(
          s,
          p("path", 0, null),
          content,
          c.line,
          name === "add-content",
        );
        return [{ s, values: [] }];
      }
      if (name === "new-item") {
        let path = p("path", 0, null);
        const type = String(p("itemtype", 100, "file")).toLowerCase(),
          force = !!p("force", 100, false);
        // R22-N15: -Name は -Path（省略時は現在フォルダ）を親とする名前。
        const itemName = p("name", 100, null);
        if (itemName !== null && itemName !== undefined) {
          if (isUnknown(itemName))
            fail("未確認：New-Item -Name の値", c.line, "未確認");
          const leaf = text(itemName, c);
          if (isUnknown(leaf))
            fail("未確認：New-Item -Name の値", c.line, "未確認");
          const base =
            path === null || path === undefined
              ? s.model.cwd
              : windowsPath(path, s.model.cwd, c.line);
          if (isUnknown(base))
            fail("未確認：New-Item -Path の値", c.line, "未確認");
          path = windowsPath(leaf, base, c.line);
        }
        if (path === null || path === undefined)
          fail(
            "New-Itemには-Pathまたは-Nameが必要です",
            c.line,
            "ParameterBindingException",
          );
        if (typeof path === "string")
          path = windowsPath(path, s.model.cwd, c.line);
        // §3.3 再裁定：デバイス名はファイル／フォルダ名として作らない。
        const itemDevice =
          typeof path === "string" ? reservedDeviceName(path) : null;
        if (itemDevice)
          fail(
            "未対応：予約デバイス名 " +
              itemDevice +
              " はファイル／フォルダ名として使えません",
            c.line,
          );
        let e = fsEntry(s, path, c.line);
        if (type === "directory") {
          if (e && !force)
            fail("モデルにパスが既に存在します：" + path, c.line, "IOException");
          if (!e) makeDirectory(s, path, c.line);
          e = fsEntry(s, path, c.line);
          if (e.type !== "directory")
            fail(
              "モデルの既存パスはフォルダではありません",
              c.line,
              "IOException",
            );
        } else if (type === "file") {
          if (e && !force)
            fail("モデルにパスが既に存在します：" + path, c.line, "IOException");
          // R24-N32: ファイル形でも、パス中の親フォルダがなければ自動で
          // 作成する（Microsoft Learn「New-Item」。Directory 形が中間
          // フォルダを作成するのと揃える。親が既存ファイルの場合は
          // writeFile 側の従来の停止に委ねる）。
          if (typeof path === "string") {
            const at = path.lastIndexOf("\\"),
              parent = at <= 2 ? path.slice(0, 3) : path.slice(0, at),
              parentEntry = fsEntry(s, parent, c.line);
            if (!parentEntry) makeDirectory(s, parent, c.line);
          }
          e = writeFile(s, path, text(p("value", 100, ""), c), c.line);
        } else fail("未対応のNew-Item -ItemType：" + type, c.line);
        return [{ s, values: [info(e)] }];
      }
      if (name === "remove-item") {
        const path = p("path", 0, null);
        if (typeof path === "string" && /[*?]/.test(path)) {
          for (const e of [...listFiles(s, path, c.line)])
            removeEntry(s, e.path, c.line, !!p("recurse", 100, false));
        } else removeEntry(s, path, c.line, !!p("recurse", 100, false));
        return [{ s, values: [] }];
      }
      if (name === "rename-item") {
        const from = windowsPath(p("path", 0, null), s.model.cwd, c.line),
          leaf = text(p("newname", 1, null), c);
        if (isUnknown(leaf) || /[\\/:*?]/.test(leaf))
          fail("未対応：Rename-Itemの新しい名前", c.line);
        // §3.3 再裁定：デバイス名への名前変更は名前を挙げて停止する。
        const renameDevice = reservedDeviceName(leaf);
        if (renameDevice)
          fail(
            "未対応：予約デバイス名 " +
              renameDevice +
              " への名前変更（デバイス名はファイル名として使えません）",
            c.line,
          );
        copyEntry(
          s,
          from,
          from.slice(0, from.lastIndexOf("\\") + 1) + leaf,
          c.line,
          true,
          false,
        );
        return [{ s, values: [] }];
      }
      if (name === "copy-item" || name === "move-item") {
        // §3.3 再裁定：コピー／移動先・元が予約デバイス名の場合に通常
        // ファイルを作らない（cmd 側の是正済み意味論に合わせる）。
        // 先デバイス：NUL は破棄（移動では元を削除）、CON／CONOUT$ は
        // 内容を画面へ、それ以外は名前を挙げて停止。元デバイス：
        // Copy-Item の NUL は空の読み取りとして扱い（読み取り経路の
        // 再裁定と同じ）、それ以外と Move-Item の元デバイスは名前を
        // 挙げて停止する。
        const srcRaw = p("path", 0, null),
          dstRaw = p("destination", 1, null),
          isMove = name === "move-item",
          verb = isMove ? "移動" : "コピー";
        if (typeof srcRaw === "string" && typeof dstRaw === "string") {
          const finalPath = finalDestPath(srcRaw, dstRaw, s, c.line),
            dstDevice = finalPath ? reservedDeviceName(finalPath) : null,
            srcDevice = deviceOf(srcRaw, s, c.line),
            source = fsEntry(s, srcRaw, c.line);
          if (dstDevice && srcDevice) {
            // 元も先もデバイス：先が NUL なら破棄、それ以外は先を名指す。
            if (dstDevice === "NUL") return [{ s, values: [] }];
            fail(
              "未対応：予約デバイス名 " + dstDevice + " への" + verb,
              c.line,
            );
          }
          if (dstDevice && source && !isUnknown(source)) {
            if (source.type === "directory")
              fail(
                "未対応：予約デバイス名 " +
                  dstDevice +
                  " へのフォルダの" +
                  verb,
                c.line,
              );
            if (dstDevice === "NUL") {
              if (isMove) removeEntry(s, source.path, c.line);
              api.note(
                s,
                { ...c, refs: [] },
                "予約デバイス NUL へ" +
                  verb +
                  "します（出力は破棄され、ファイルは作られません）",
              );
              return [{ s, values: [] }];
            }
            if (dstDevice === "CON" || dstDevice === "CONOUT$") {
              if (source.content === undefined || isUnknown(source.content))
                fail(
                  "未確認：" + verb + "元ファイルの内容がモデルにありません",
                  c.line,
                  "未確認",
                );
              s.outputs.push({
                channel: "Write-Host",
                text: source.content.replace(/\r\n/g, "\n").replace(/\n$/, ""),
                line: c.line,
              });
              if (isMove) removeEntry(s, source.path, c.line);
              api.note(
                s,
                { ...c, refs: [] },
                "予約デバイス CON へ出力します（画面表示）",
              );
              return [{ s, values: [] }];
            }
            fail(
              "未対応：予約デバイス名 " + dstDevice + " への" + verb,
              c.line,
            );
          }
          if (srcDevice) {
            if (!isMove && srcDevice === "NUL" && finalPath) {
              // 読み取り経路の再裁定：NUL の内容は空。空ファイルとして複写。
              const existing = fsEntry(s, finalPath, c.line);
              if (existing?.type === "directory")
                fail(
                  "フォルダにはファイル内容を書き込めません：" + finalPath,
                  c.line,
                  "実行エラー",
                );
              writeFile(s, finalPath, "", c.line);
              return [{ s, values: [] }];
            }
            fail(
              "未対応：予約デバイス名 " +
                srcDevice +
                " からの" +
                verb +
                "（デバイスからの読み取りはモデル化できません）",
              c.line,
            );
          }
          // 先がデバイスでも元が通常ファイルに無い場合は、従来どおり
          // copyEntry の「元がありません」エラーを優先する（cmd と同じ）。
        }
        copyEntry(
          s,
          srcRaw,
          dstRaw,
          c.line,
          isMove,
          name === "copy-item" || !!p("force", 100, false),
        );
        return [{ s, values: [] }];
      }
      fail("未対応のコマンド：" + c.name, c.line);
    }
    function pipeline(p, s, api) {
      api.check();
      const pure = new Set([
        "write-output",
        "get-childitem",
        "where-object",
        "foreach-object",
        "select-object",
        "sort-object",
        "measure-object",
        "get-location",
        "get-content",
        "test-path",
      ]);
      const effects = (n) =>
        n &&
        typeof n === "object" &&
        (n.k === "assign" ||
          n.k === "post" ||
          n.k === "pre" ||
          (n.k === "command" &&
            !pure.has((alias[n.name.toLowerCase()] || n.name).toLowerCase())) ||
          Object.values(n).some((v) =>
            Array.isArray(v) ? v.some(effects) : effects(v),
          ));
      for (let i = 1; i < p.stages.length; i++) {
        const stage = p.stages[i];
        if (
          stage.k === "command" &&
          (alias[stage.name.toLowerCase()] || stage.name).toLowerCase() ===
            "select-object" &&
          Object.hasOwn(stage.params, "first") &&
          p.stages.slice(0, i).some(effects)
        )
          fail(
            "未対応：Select-Object -Firstによる上流の副作用の途中停止",
            stage.line,
          );
      }

      if (p.stages.length > 1)
        api.note(
          s,
          { line: p.line, refs: ["パイプライン"] },
          "オブジェクトをパイプラインで渡します",
        );
      let states = [{ s, values: [] }];
      for (let i = 0; i < p.stages.length; i++) {
        const stage = p.stages[i],
          next = [];
        for (const r of states) {
          r.s.ps.pipes.push({ items: r.values, result: [] });
          let values;
          if (stage.k === "expression") {
            if (i)
              fail(
                "式はパイプラインの先頭にだけ指定できます",
                stage.line,
                "SyntaxError",
              );
            const expressionValue = read(stage.value, r.s, api);
            values = [
              { s: r.s, values: enumerate(expressionValue), expressionValue },
            ];
          } else
            values = command(stage, r.s, api, r.s.ps.pipes.at(-1).items, i > 0);
          for (const v of values) {
            v.s.ps.pipes.pop();
            v.s.ps.lastPipeline = v.values;
            v.s.ps.success = true;
            next.push(v);
          }
        }
        states = cap(next, p, api);
      }
      return states;
    }
    function loop(n, s, api) {
      let active = [s],
        done = [],
        iterations = 0;
      if (n.init) active = exec([n.init], active, api);
      if (n.k === "foreach") {
        const evaluated = [];
        for (const st of active)
          for (const r of pipeline(n.collection, st, api)) {
            // RG-164（SH-P6 の裁定を是正）: foreach 文が指定するコレクションが
            // $null のときは 0 要素として扱い、本体を1回も実行しない
            // （PowerShell 言語仕様 §8.4.4「$null は 0 要素のコレクション
            // として扱われる」）。$null 以外のスカラーは1要素、配列は要素
            // ごと（$null 要素を含む）。式の値そのもの（expressionValue）で
            // 判定するのは、@($null) のような明示的な配列と素の $null を
            // 区別するため。出力なし（AutomationNull）も $null と同じ0回。
            // コマンドの収集結果が単一の $null の場合も、パイプラインが
            // 指定する値は $null なので0回にする。パイプライン側
            // （ForEach-Object への入力列挙）は非対称で、$null は
            // 1オブジェクトとして渡る（そちらは変更しない）。
            let items;
            if (Object.hasOwn(r, "expressionValue")) {
              const ev = r.expressionValue;
              items = Array.isArray(ev)
                ? r.values
                : ev === null || ev === undefined
                  ? []
                  : [ev];
            } else
              items =
                r.values.length === 1 &&
                (r.values[0] === null || r.values[0] === undefined)
                  ? []
                  : r.values;
            r.s.ps.loops.push({ items, index: 0 });
            evaluated.push(r.s);
          }
        active = evaluated;
      } else for (const st of active) st.ps.loops.push({ index: 0 });
      while (active.length) {
        const next = [];
        for (const st of active) {
          if (st.halt || st.ps.signal) {
            done.push(st);
            continue;
          }
          const f = st.ps.loops.at(-1);
          let choices;
          if (n.k === "foreach")
            choices = [{ s: st, yes: f.index < f.items.length }];
          else if (n.k === "do" && f.index === 0)
            choices = [{ s: st, yes: true }];
          else {
            const result = pipeline(n.test, st, api);
            choices = result.flatMap((r) =>
              api.choose(r.s, truth(scalar(r.values)), n),
            );
          }
          for (const branch of choices) {
            const current = branch.s,
              frame = current.ps.loops.at(-1);
            if (!branch.yes) {
              done.push(current);
              continue;
            }
            if (frame.index >= api.limits.iterations) {
              api.stop(current, n, "ループ回数の上限");
              done.push(current);
              continue;
            }
            if (n.k === "foreach") {
              ciSet(current.vars, n.name, frame.items[frame.index]);
              // R28-N3: ループ変数も小数の由来の対象にする。
              markDouble(current, n.name, frame.items[frame.index]);
              if (
                typeof frame.items[frame.index] !== "number" &&
                current.ps.dbl
              )
                delete current.ps.dbl[n.name.toLowerCase()];
            }
            frame.index++;
            api.note(
              current,
              { ...n, refs: [n.k === "do" ? "do-while" : n.k] },
              "繰り返し " + frame.index + " 回目",
            );
            for (const out of exec(n.body, [current], api)) {
              if (out.ps.signal === "break") {
                out.ps.signal = null;
                done.push(out);
              } else if (out.halt || out.ps.signal === "return") done.push(out);
              else {
                out.ps.signal = null;
                next.push(...(n.update ? exec([n.update], [out], api) : [out]));
              }
            }
          }
        }
        active = cap(next, n, api);
        done = cap(done, n, api);
        if (++iterations > api.limits.iterations + 1) break;
      }
      for (const st of done) st.ps.loops.pop();
      return done;
    }
    function statement(n, s, api) {
      api.check();
      if (n.k === "function") {
        ciSet(s.ps.functions, n.name, n);
        api.note(
          s,
          { ...n, refs: ["function"] },
          "関数 " + n.name + " を定義します",
        );
        return [s];
      }
      if (n.k === "param") fail("paramは関数の先頭でだけ対応します", n.line);
      if (n.k === "pipeline") {
        // SH-P5（同根）：++／-- の単独文はパイプラインへ出力しないため、
        // 「最後に評価したパイプライン」を書き換えない。
        const prevPipeline = s.ps.lastPipeline;
        return pipeline(n.pipe, s, api).map((r) => {
          if (n.suppress) r.s.ps.lastPipeline = prevPipeline;
          if (!n.suppress) emit(r.s, r.values, n, api);
          api.note(
            r.s,
            n,
            n.suppress
              ? "変数を増減します"
              : "パイプラインの値：" +
                  (r.values.length
                    ? r.values.map(psFormat).join(" / ")
                    : "（出力なし）"),
          );
          return r.s;
        });
      }
      if (n.k === "assign") {
        // SH-P5: 代入はパイプラインへ何も出力しないため、右辺の評価が
        // 「最後に評価したパイプライン」を書き換えないよう戻す。
        const prevPipeline = s.ps.lastPipeline;
        return pipeline(n.value, s, api).map((r) => {
          r.s.ps.lastPipeline = prevPipeline;
          let v = Object.hasOwn(r, "expressionValue")
            ? r.expressionValue
            : scalar(r.values);
          if (v === undefined) v = null;
          if (n.op !== "=")
            v = binary(
              n.op[0],
              read(n.target, r.s, api),
              v,
              r.s,
              n,
              api,
              exprIsDouble(n.target, r.s) ||
                exprIsDouble(
                  n.value.stages?.length === 1 &&
                    n.value.stages[0].k === "expression"
                    ? n.value.stages[0].value
                    : null,
                  r.s,
                ),
            );
          set(r.s, n.target, v, n, api);
          // R28-N3: 整数値の代入では、右辺（複合代入では対象と右辺）の
          // 由来で小数の記録を付け替える（$x = 1.0 の後に $x = 1 と
          // 代入し直したら、以降の $x/0 は整数の 0 除算に戻る）。
          if (
            n.target.k === "var" &&
            typeof v === "number" &&
            Number.isInteger(v)
          ) {
            const valueNode =
              n.value.stages?.length === 1 &&
              n.value.stages[0].k === "expression"
                ? n.value.stages[0].value
                : null;
            const isDbl =
              n.op === "="
                ? exprIsDouble(valueNode, r.s)
                : exprIsDouble(n.target, r.s) || exprIsDouble(valueNode, r.s);
            if (isDbl) (r.s.ps.dbl ??= {})[n.target.name.toLowerCase()] = true;
            else if (r.s.ps.dbl) delete r.s.ps.dbl[n.target.name.toLowerCase()];
          }
          api.note(r.s, n, "代入します：" + psFormat(v));
          return r.s;
        });
      }
      if (n.k === "if") {
        n = { ...n, refs: ["if"] };
        const out = [];
        for (const r of pipeline(n.test, s, api))
          for (const branch of api.choose(r.s, truth(scalar(r.values)), n))
            out.push(...exec(branch.yes ? n.body : n.other, [branch.s], api));
        return cap(out, n, api);
      }
      if (["for", "foreach", "while", "do"].includes(n.k))
        return loop(n, s, api);
      if (n.k === "switch") {
        n = { ...n, refs: ["switch"] };
        api.note(s, n, "switchの条件を順に判定します");
        const output = [];
        for (const r of pipeline(n.test, s, api)) {
          r.s.ps.switches.push({ items: r.values });
          let active = [r.s],
            finished = [];
          for (let index = 0; index < r.values.length; index++) {
            for (const st of active) {
              const frame = st.ps.switches.at(-1);
              frame.matched = false;
              st.ps.items.push(frame.items[index]);
            }
            for (const cs of n.cases.filter((x) => !x.isDefault)) {
              const next = [];
              for (const st of active) {
                if (st.halt || st.ps.signal) {
                  next.push(st);
                  continue;
                }
                const item = st.ps.switches.at(-1).items[index],
                  // R24-N30：switch オプションの照合配線（about_Switch）。
                  // 照合方式は既存の比較演算子の意味論を再利用する：
                  // -Wildcard→-like／-Regex→-match／-Exact・既定→-eq、
                  // -CaseSensitive はそれぞれの -c 変種（-clike／-cmatch／
                  // -ceq）にする。競合する照合方式（Regex／Wildcard／
                  // Exact）が複数指定された場合は、最後に指定されたものが
                  // 優先する（about_Switch の Note）。照合節が文字列でない
                  // 場合、各オプションは無視され従来の -eq 照合になる
                  // （about_Switch の各パラメータの説明）。
                  switchOp = (() => {
                    if (typeof cs.value !== "string") return "-eq";
                    let mode = "eq",
                      sensitive = false;
                    for (const opt of n.options ?? []) {
                      if (opt === "wildcard") mode = "like";
                      else if (opt === "regex") mode = "match";
                      else if (opt === "exact") mode = "eq";
                      else if (opt === "casesensitive") sensitive = true;
                    }
                    return (sensitive ? "-c" : "-") + mode;
                  })(),
                  test = binary(
                    switchOp,
                    isUnknown(item) ? item : text(item, n),
                    text(cs.value, n),
                    st,
                    n,
                    api,
                  );
                for (const branch of api.choose(st, test, n)) {
                  if (branch.yes) {
                    branch.s.ps.switches.at(-1).matched = true;
                    next.push(...exec(cs.body, [branch.s], api));
                  } else next.push(branch.s);
                }
              }
              active = cap(next, n, api);
            }
            const next = [];
            for (const st of active) {
              const frame = st.ps.switches.at(-1),
                def = n.cases.find((x) => x.isDefault),
                results =
                  !frame.matched && !st.ps.signal && def
                    ? exec(def.body, [st], api)
                    : [st];
              for (const v of results) {
                v.ps.items.pop();
                if (v.ps.signal === "break") {
                  v.ps.signal = null;
                  finished.push(v);
                } else if (v.halt || v.ps.signal === "return") finished.push(v);
                else {
                  v.ps.signal = null;
                  next.push(v);
                }
              }
            }
            active = next;
          }
          for (const st of [...finished, ...active]) {
            st.ps.switches.pop();
            output.push(st);
          }
        }
        return cap(output, n, api);
      }
      if (n.k === "return") {
        if (n.value)
          return pipeline(n.value, s, api).map((r) => {
            emit(r.s, r.values, n, api);
            api.note(
              r.s,
              { ...n, refs: ["return"] },
              "値を出力して現在の処理から戻ります",
            );
            r.s.ps.signal = "return";
            return r.s;
          });
        api.note(s, { ...n, refs: ["return"] }, "現在の処理から戻ります");
        s.ps.signal = "return";
        return [s];
      }
      if (n.k === "break" || n.k === "continue") {
        if (!s.ps.loops.length && !s.ps.switches.length)
          fail(
            n.k + "はループまたはswitchの中で使用してください",
            n.line,
            "RuntimeException",
          );
        api.note(s, { ...n, refs: [n.k] }, n.k + "で制御を移します");
        s.ps.signal = n.k;
        return [s];
      }
      fail("未対応のPowerShell文：" + n.k, n.line);
    }
    function exec(list, states, api) {
      if (++sDepth > api.limits.depth) {
        for (const s of states)
          api.stop(s, list[0] || { line: 1 }, "制御構造の深さ上限");
        sDepth--;
        return states;
      }
      for (const n of list) {
        const next = [];
        for (const s of states) {
          if (s.halt || s.ps.signal) {
            next.push(s);
            continue;
          }
          try {
            next.push(...statement(n, s, api));
          } catch (e) {
            // R26-N2（防御層）: パス内エラーの出口でもホスト例外を変換する。
            // 外側 catch（R25-N3）は実行開始前の例外しか変換しておらず、
            // 文の実行中に発生したホスト例外（代入先の未定義参照等）は
            // 生文言のまま s.error に入っていた。著作者エラー
            // （PracticeError）は toLearnerError がそのまま通す。
            const learner = toLearnerError(e);
            s.error = {
              line: learner.line || e.line || n.line,
              message: learner.message,
              category: learner.category || "RuntimeException",
            };
            s.ps.success = false;
            s.halt = true;
            api.note(s, { ...n, refs: [] }, learner.message, "error");
            next.push(s);
          }
        }
        states = cap(next, n, api);
      }
      sDepth--;
      return states;
    }
    let sDepth = 0;
    const result = shellRuntime(
      [{ k: "ps-program", body: nodes, line: 1 }],
      model,
      (s) => {
        initFiles(s);
        s.vars = Object.fromEntries(
          Object.entries(s.vars).map(([k, v]) => [k, modelValue(v)]),
        );
        s.ps = {
          functions: {},
          calls: [],
          // R28-N3: 小数（double）由来の変数名の記録（小文字名→true）。
          dbl: {},
          streams: [[]],
          items: [],
          loops: [],
          switches: [],
          pipes: [],
          lastPipeline: [],
          success: true,
          signal: null,
        };
      },
      (n, s, api) => exec(n.body, [s], api),
      (s) => [
        {
          title: "変数",
          entries: Object.entries(s.vars).map(([k, v]) => [
            "$" + k,
            psFormat(v),
          ]),
        },
        {
          title: "最後に評価したパイプライン",
          entries: [
            [
              "値",
              s.ps.lastPipeline.length
                ? s.ps.lastPipeline.map(psFormat).join("\n\n")
                : "（出力なし）",
            ],
          ],
        },
        {
          title: "モデルの終了状態",
          entries: [
            ["現在フォルダ", s.model.cwd],
            ["$?", psFormat(s.ps.success)],
            ["$LASTEXITCODE", psFormat(s.model.lastExitCode ?? null)],
            ["仮想ファイル一覧", fileDisplay(s.model.files)],
          ],
        },
      ],
      limits,
    );
    // R28-N3: 最終状態の vars は、非有限数を文字列表現へ置き換えた
    // スナップショットにする（psFiniteSafe。出力・groups と一致させる）。
    for (const p of result.paths || []) p.vars = psFiniteSafe(p.vars);
    return result;
  } catch (e) {
    // R25-N3: 外側 catch の無変換素通しを是正する（cmd の RG-173 と同形）。
    // PS の著作者エラーは全て shell/model.js の fail() 経由の PracticeError
    // （日本語文面＋カテゴリ）であり、toLearnerError は PracticeError を
    // そのまま通すため著作者エラーは素通しになる。一方、循環ハッシュ
    // テーブルによる RangeError、モデル null の TypeError、関数値・
    // Symbol 値の DataCloneError 等のホスト例外は、学習者向け日本語文言と
    // 真実のカテゴリへ変換してから返す（従来は生文言＋虚偽の既定カテゴリ
    // SyntaxError で漏出していた）。
    return sourceError(toLearnerError(e));
  }
}
