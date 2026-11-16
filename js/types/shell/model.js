import { isUnknown, unknown, formatValue } from "../../core/contract.js";
import { PracticeError } from "../../core/script.js";
export const fail = (text, line = 1, category = "未対応") => {
  throw new PracticeError(text, line, category);
};
export const ciKey = (o, k) =>
  Object.keys(o).find((x) => x.toLowerCase() === String(k).toLowerCase());
export const ciGet = (o, k) => {
  const key = ciKey(o, k);
  return key === undefined ? undefined : o[key];
};
export function ciSet(o, k, v) {
  const key = ciKey(o, k) || k;
  if (v === undefined) delete o[key];
  else
    Object.defineProperty(o, key, {
      value: v,
      writable: true,
      enumerable: true,
      configurable: true,
    });
}
export function unquote(s) {
  return s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}
export function words(text, line = 1) {
  const out = [];
  let part = "",
    quote = false,
    started = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      quote = !quote;
      part += c;
      started = true;
    } else if (/\s/.test(c) && !quote) {
      if (started) {
        out.push(part);
        part = "";
        started = false;
      }
    } else {
      part += c;
      started = true;
    }
  }
  if (quote) fail("引用符が閉じられていません", line, "SyntaxError");
  if (started) out.push(part);
  return out;
}
// SH-C1: Windows の予約デバイス名（Microsoft Learn「Naming Files, Paths,
// and Namespaces」）。拡張子を付けても（nul.txt 等）、どのフォルダでも
// デバイスとして扱われるため、通常ファイルとして作ってはならない。
export function reservedDeviceName(path) {
  const base = String(path).split("\\").at(-1),
    stem = base.split(".")[0].toUpperCase();
  if (["CON", "PRN", "AUX", "NUL", "CONIN$", "CONOUT$"].includes(stem))
    return stem;
  if (/^(?:COM|LPT)[1-9]$/.test(stem)) return stem;
  return null;
}
export function windowsPath(path, cwd = "C:\\Practice", line = 1) {
  if (isUnknown(path)) return path;
  // R7-72: 現在フォルダ自体が未確定値（$HOME へ移動したモデル等）の
  // ときは、相対パスを捏造せず未確定値として返す。
  if (isUnknown(cwd))
    return unknown("現在フォルダを基準にしたパス", cwd.id + ":relpath");
  path = unquote(String(path)).replaceAll("/", "\\");
  if (/^\\\\|^[a-z]:[^\\]/i.test(path))
    fail("未対応：UNC・ドライブ相対パス", line);
  let full = /^[a-z]:\\/i.test(path)
    ? path
    : path.startsWith("\\")
      ? cwd.slice(0, 2) + path
      : cwd + "\\" + path;
  const drive = full.slice(0, 2).toUpperCase(),
    parts = [];
  for (const p of full.slice(2).split("\\")) {
    if (!p || p === ".") continue;
    if (p === "..") {
      parts.pop();
      continue;
    }
    parts.push(p);
  }
  return drive + "\\" + parts.join("\\");
}
export function fsEntry(state, path, line = 1) {
  path = windowsPath(path, state.model.cwd, line);
  if (isUnknown(path)) return path;
  return state.model.files.find(
    (e) => e.path.toLowerCase() === path.toLowerCase(),
  );
}
export function listFiles(state, pattern = "*", line = 1) {
  const full = windowsPath(pattern, state.model.cwd, line);
  if (isUnknown(full)) return full;
  const slash = full.lastIndexOf("\\"),
    parent = full.slice(0, slash).toLowerCase(),
    mask = full.slice(slash + 1);
  const regex = new RegExp(
    "^" +
      (mask === "*.*" ? "*" : mask)
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
    "i",
  );
  return state.model.files.filter(
    (e) =>
      e.path.slice(0, e.path.lastIndexOf("\\")).toLowerCase() === parent &&
      regex.test(e.path.slice(e.path.lastIndexOf("\\") + 1)),
  );
}
// R31-N13（修正バッチ10・シェル班）: モデル自体の形状検証。モデルが
// オブジェクトでない（null／数値／文字列／配列／真偽値等）と、従来は
// 実行基盤がモデル項目へ触れた時点でホスト例外になり、「処理中に
// 予期しないエラーが発生しました」「null / undefined のプロパティは
// 参照できません」というモデル側を指さない汎用文言に落ちていた。
// 既存の項目別検証（files は配列・各要素に path／type が必要等）と
// 同じ水準・カテゴリ（モデルエラー）で、モデル自体を名指して止める。
// variables もオブジェクトでない場合は同じく名指す（cmd では文字列の
// variables が汎用文言に落ち、PS では添字として黙って取り込まれて
// いたため、入口で揃える）。この検証は initFiles（初期化経路）からも、
// 実行基盤が model.variables へ触れる前の simulate 入口からも呼ぶ
// （null／undefined は基盤側の structuredClone 前段で落ちるため、
// 入口側の事前検証が無いと名指しに到達しない）。
export function assertModelShape(model) {
  if (!model || typeof model !== "object" || Array.isArray(model))
    fail("モデルはオブジェクトで指定してください", 1, "モデルエラー");
  // variables の null は、基盤側の `model.variables || {}` と同じく
  // 「未指定」として扱い、対象にしない（files の null が ??= で
  // 既定値になる扱いとも揃える）。
  if (
    model.variables !== undefined &&
    model.variables !== null &&
    (typeof model.variables !== "object" || Array.isArray(model.variables))
  )
    fail(
      "モデルvariablesはオブジェクトで指定してください",
      1,
      "モデルエラー",
    );
}
export function initFiles(state) {
  assertModelShape(state.model);
  const m = state.model;
  m.cwd = windowsPath(m.cwd || "C:\\Practice");
  m.files ??= [];
  if (!Array.isArray(m.files))
    fail("モデルfilesは配列で指定してください", 1, "モデルエラー");
  const seen = new Set();
  m.files = m.files.map((e) => {
    if (
      !e ||
      typeof e.path !== "string" ||
      !["file", "directory"].includes(e.type)
    )
      fail(
        "モデルfilesにはpathとtype(file/directory)が必要です",
        1,
        "モデルエラー",
      );
    if (
      e.content !== undefined &&
      typeof e.content !== "string" &&
      !isUnknown(e.content)
    )
      fail(
        "モデルのファイル内容は文字列または未確定値で指定してください",
        1,
        "モデルエラー",
      );
    const path = windowsPath(e.path, m.cwd),
      key = path.toLowerCase();
    if (seen.has(key))
      fail("モデルのパスが重複しています：" + path, 1, "モデルエラー");
    seen.add(key);
    return { ...e, path };
  });
  if (!fsEntry(state, m.cwd))
    m.files.unshift({ path: m.cwd, type: "directory" });
}
export const sampleFiles = () => [
  { path: "C:\\Practice", type: "directory" },
  {
    path: "C:\\Practice\\notes.txt",
    type: "file",
    content: "学習メモ\r\n",
    length: 14,
  },
  {
    path: "C:\\Practice\\data.csv",
    type: "file",
    content: "Name,Score\r\nAlice,80\r\n",
    length: 22,
  },
  {
    path: "C:\\Practice\\readme.txt",
    type: "file",
    content: "Practice\r\n",
    length: 10,
  },
  { path: "C:\\Practice\\logs", type: "directory" },
];
export function fileDisplay(files) {
  return (
    files
      .map(
        (e) =>
          `${e.type === "directory" ? "[フォルダ]" : "[ファイル]"} ${e.path}`,
      )
      .join("\n") || "（なし）"
  );
}
export function inputValue(s, key, api, node, source) {
  const inputs = s.model.inputs || {};
  let value = inputs[key];
  if (value === undefined) return [api.freshUnknown(source, s)];
  if (Array.isArray(value)) return value;
  return [value];
}
export function sourceError(e) {
  return {
    paths: [],
    error: {
      line: e.line || 1,
      message: e.message,
      category: e.category || "SyntaxError",
    },
    truncated: false,
  };
}
export function shellValue(v) {
  return isUnknown(v)
    ? formatValue(v)
    : v === undefined
      ? "（未設定）"
      : Array.isArray(v)
        ? v.map(shellValue).join("\n")
        : v && typeof v === "object"
          ? Object.entries(v)
              .map(([k, x]) => `${k}: ${shellValue(x)}`)
              .join("\n")
          : String(v);
}
export function parentDirectory(state, path, line = 1) {
  const at = path.lastIndexOf("\\"),
    parent = at === 2 ? path.slice(0, 3) : path.slice(0, at),
    entry = fsEntry(state, parent, line);
  if (!entry || entry.type !== "directory")
    fail("モデルに親フォルダがありません：" + parent, line, "実行エラー");
  return parent;
}
export function writeFile(state, path, content, line = 1, append = false) {
  path = windowsPath(path, state.model.cwd, line);
  if (isUnknown(path)) fail("未確認：書き込み先パス", line, "未確認");
  parentDirectory(state, path, line);
  let e = fsEntry(state, path, line);
  if (e?.type === "directory")
    fail(
      "フォルダにはファイル内容を書き込めません：" + path,
      line,
      "実行エラー",
    );
  if (!e) {
    e = { path, type: "file", content: "" };
    state.model.files.push(e);
  }
  if (
    append &&
    (e.content === undefined || isUnknown(e.content) || isUnknown(content))
  )
    e.content = unknown("追記後のモデルファイル内容", path + ":append");
  else e.content = (append ? e.content : "") + content;
  // P-N1（蓄積の成長経路）: 追記の繰り返しでファイル内容が値サイズ上限を
  // 超えたら、実体を保持せず未確定値へ倒す（値の大きさの上限の対象にする）。
  if (typeof e.content === "string" && e.content.length > 200000)
    e.content = unknown("とても長いファイル内容", path + ":toolong");
  if (typeof e.content === "string")
    e.length = new TextEncoder().encode(e.content).length;
  else delete e.length;
  return e;
}
export function makeDirectory(state, path, line = 1) {
  path = windowsPath(path, state.model.cwd, line);
  if (isUnknown(path)) fail("未確認：新しいフォルダのパス", line, "未確認");
  if (fsEntry(state, path, line))
    fail("モデルに同じパスが既に存在します：" + path, line, "実行エラー");
  const parts = path.slice(3).split("\\");
  let base = path.slice(0, 3);
  for (const p of parts) {
    base = base.endsWith("\\") ? base + p : base + "\\" + p;
    let e = fsEntry(state, base, line);
    if (e?.type === "file")
      fail("ファイルをフォルダとして使用できません", line, "実行エラー");
    if (!e) state.model.files.push({ path: base, type: "directory" });
  }
  return path;
}
export function removeEntry(state, path, line = 1, recurse = false) {
  path = windowsPath(path, state.model.cwd, line);
  if (isUnknown(path)) fail("未確認：削除先パス", line, "未確認");
  const entry = fsEntry(state, path, line);
  if (!entry) fail("モデルに削除対象がありません：" + path, line, "実行エラー");
  const prefix = path.toLowerCase() + "\\";
  if (
    state.model.cwd.toLowerCase() === path.toLowerCase() ||
    state.model.cwd.toLowerCase().startsWith(prefix)
  )
    fail("現在フォルダまたはその親は削除できません", line, "実行エラー");
  if (
    entry.type === "directory" &&
    !recurse &&
    state.model.files.some((e) => e.path.toLowerCase().startsWith(prefix))
  )
    fail("フォルダが空ではありません", line, "実行エラー");
  state.model.files = state.model.files.filter(
    (e) => e !== entry && !(recurse && e.path.toLowerCase().startsWith(prefix)),
  );
}
export function copyEntry(
  state,
  from,
  to,
  line = 1,
  move = false,
  overwrite = false,
) {
  const source = fsEntry(state, from, line);
  if (isUnknown(source)) fail("未確認：コピー／移動の対象", line, "未確認");
  if (!source) fail("モデルにコピー／移動元がありません", line, "実行エラー");
  let path = windowsPath(to, state.model.cwd, line);
  if (isUnknown(path)) fail("未確認：コピー／移動先", line, "未確認");
  let dest = fsEntry(state, path, line);
  if (dest?.type === "directory")
    path = path.replace(/\\$/, "") + "\\" + source.path.split("\\").at(-1);
  dest = fsEntry(state, path, line);
  if (path.toLowerCase() === source.path.toLowerCase())
    fail("同一パスへコピー／移動できません", line, "実行エラー");
  if (source.type === "directory" && !move)
    fail("未対応：フォルダのコピー", line);
  if (
    source.type === "directory" &&
    path.toLowerCase().startsWith(source.path.toLowerCase() + "\\")
  )
    fail("フォルダを自分の配下へ移動できません", line, "実行エラー");
  if (dest && !overwrite)
    fail(
      "未確認：既存ファイルへの上書きには明示した強制オプションが必要です",
      line,
      "未確認",
    );
  if (dest?.type === "directory")
    fail("既存フォルダへの上書きは未対応です", line);
  parentDirectory(state, path, line);
  if (dest) state.model.files = state.model.files.filter((e) => e !== dest);
  if (move) {
    const old = source.path;
    for (const e of state.model.files)
      if (
        e === source ||
        e.path.toLowerCase().startsWith(old.toLowerCase() + "\\")
      )
        e.path = path + e.path.slice(old.length);
  } else state.model.files.push({ ...structuredClone(source), path });
  return path;
}
