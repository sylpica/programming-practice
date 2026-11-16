import { splitLines, parseProgram, collectUsed } from "./engine.js";
import { REFERENCE } from "./reference.js";
import { TEMPLATES } from "./templates.js";
import { GLOSSARY } from "./glossary.js";
import { LIMITS } from "../../core/contract.js";
import { toLearnerError } from "../../core/script.js";
import { sourceFailure } from "../../core/data.js";
const reference = REFERENCE.map((r) => ({
  ...r,
  name: r.id,
  description: r.summary,
  syntax: r.syntax,
  example: r.example,
  caution: r.pitfalls || "",
  supported: true,
  source: r.doc,
}));
for (const r of reference) {
  if (["open","str.format","random","json","os","datetime","numpy.array","pandas.DataFrame"].includes(r.name)) {
    r.supported = false;
    r.caution += "このアプリのシミュレーションでは未対応として停止する。";
  }
  if (r.name === "with") {
    // RA-20：with は本文を実行する部分対応であり、「未対応として停止する」参照専用分類
    // （supported=false）とは実挙動が一致しない。分類を実挙動に合わせ supported=true とし、
    // 部分対応の範囲は項目文面（reference.js の pitfalls）に一本化して開示する
    // （従来は同じ注意書きが pitfalls とここの追記で二重になっていた）。
    r.supported = true;
  }
  if (r.name === "filter") r.example = 'def even(x):\n    return x % 2 == 0\nprint(list(filter(even, range(6))))';
}
export const definition = {
  id: "python",
  name: "Python",
  extensions: [".py", ".txt"],
  syntax: {
    name: "Python 3",
    caseSensitive: true,
    lineComment: "#",
    indentation: true,
  },
  reference,
  templates: TEMPLATES.map((t) => ({
    ...t,
    intro: t.explain,
    // refs は定義の確定後に scan で解決して差し込む（R7-151：部分文字列の
    // 一致では "print(" に 'int' が誤検出され、メソッド項目が落ちていた）。
    refs: [],
  })),
  glossary: GLOSSARY.map((g) => [g.ja, g.def]),
  model: {
    kind: "json",
    title: "モデル入力・変数",
    hint: "globalsに初期変数を設定できます。input()やファイルの実際の値は未確定のまま扱います。",
    defaults: { globals: {} },
  },
  semantics: {
    description:
      "Python学習アプリの構文解析・部分評価エンジンを移植。int / float / bool、リスト・辞書・関数・例外などを区別します。",
    support:
      "外部ライブラリ、実ファイル、ネットワーク等は実行しません。対応外の構文は明示して停止します。",
    sources: [
      {
        title: "Python公式言語リファレンス",
        url: "https://docs.python.org/3/reference/",
      },
    ],
  },
  scan(code) {
    try {
      let used = collectUsed(parseProgram(splitLines(code).lines)).usedCalls;
      let names = used
        .map((x) => x.name)
        .filter((name) => reference.some((r) => r.name === name));
      // R7-151：メソッド呼び出しと属性参照は、レシーバの型ヒントで修飾名
      // （str.split 等）へ解決して併せる。collectUsed はメソッドの短い名前
      // しか返さないため、従来は参照リンクが付かなかった。
      let analyzed = analyzeCode(code);
      for (let list of analyzed.byLine.values())
        names.push(...list.calls, ...list.attrs);
      return [...new Set(names)];
    } catch {
      return [];
    }
  },
  async simulate(code, model, limits) {
    try {
      // R31-N13（script系モデル分）：モデル形状の入口検証。モデルが
      // null／undefined の場合（従来は「null / undefined のプロパティ
      // は参照できません」という汎用文言になっていた）と、globals の
      // 型違いは、モデル／項目名を名指して停止する。検証は try の中で
      // 行い、getter が例外を投げる敵対的モデルでもホスト文言を漏ら
      // さず従来の変換層（R25-N5）へ委ねる。非 null のプリミティブ等
      // の形状は R25-N5 の裁定どおり従来の受理（globals のフォール
      // バックで空の初期変数として扱う）を維持し、globals の欠落も
      // 同じ意味になるため受理する。
      const isModelObject = (v) =>
        !!v && typeof v === "object" && !Array.isArray(v);
      const modelFailure = (message) => ({
        paths: [],
        error: { line: 1, message, category: "モデルエラー" },
        truncated: false,
        limits: LIMITS,
      });
      if (model === null || model === undefined)
        return modelFailure("モデルはオブジェクト（JSON）で指定してください");
      if (
        isModelObject(model) &&
        model.globals !== undefined &&
        !isModelObject(model.globals)
      )
        return modelFailure("モデルglobalsはオブジェクトで指定してください");
      let engine = await import("./engine.js");
      if (code.length > LIMITS.source)
        return {
          paths: [],
          error: { line: 1, message: "コードは100000文字以内にしてください" },
        };
      let raw = engine.simulatePythonPaths(code, {
        initial: model.globals || {},
      });
      return normalize(raw, code, definition);
    } catch (e) {
      // R25-N5（RG-173 の確立パターン）：変換層を持たない独自ラッパーだったため、
      // モデル全体が null のとき等にホスト例外が呼び出し側へ投げ返され、Worker 経由で
      // 生文言が表示されていた。著作者エラー（PracticeError）は素通しし、それ以外は
      // toLearnerError で学習者向け日本語文言へ変換して結果として返す。
      return sourceFailure(toLearnerError(e));
    }
  },
};
// 属性参照で解決される項目は実行時の dynCalls には現れないため、
// normalize の動的フィルタを素通りさせる（R7-59／R7-151）。
const ATTRIBUTE_REF_NAMES = new Set(["数値の属性", "rangeの属性", "__annotations__"]);
// コードを静的に解析し、行ごとに「解決できた参照項目名」を集める。
// メソッドはレシーバの型ヒント（リテラル・コンストラクタ・単純代入から
// 推定）で修飾名へ解決し、候補が一意な場合だけ採用する（誤リンク防止）。
// 属性は 数値の属性／rangeの属性／__annotations__ を対象に同じ方針で解決する。
function analyzeCode(code) {
  let byLine = new Map();
  try {
    let nodes = parseProgram(splitLines(code).lines);
    let hints = new Map();
    let funcNames = new Set();
    let ctorHint = (fname) =>
      fname === "range"
        ? "range"
        : fname === "str" || fname === "list" || fname === "tuple" || fname === "dict" || fname === "set"
          ? fname
          : fname === "int" || fname === "float" || fname === "bool"
            ? "num"
            : null;
    let exprHint = (n) => {
      if (!n || typeof n !== "object") return null;
      if (n.k === "str") return "str";
      if (n.k === "list") return "list";
      if (n.k === "tuple") return "tuple";
      if (n.k === "dict") return "dict";
      if (n.k === "set") return "set";
      if (n.k === "num") return "num";
      if (n.k === "call" && n.fn && n.fn.k === "name") return ctorHint(n.fn.name);
      if (n.k === "name") return hints.get(n.name) || null;
      return null;
    };
    let push = (line, kind, name) => {
      if (!line || !name) return;
      let entry = byLine.get(line) || { calls: [], attrs: [] };
      if (!entry[kind].includes(name)) entry[kind].push(name);
      byLine.set(line, entry);
    };
    let resolveMethod = (recv, short) => {
      let candidates = reference.filter(
        (r) => r.name === short || r.name.endsWith("." + short),
      );
      if (!candidates.length) return null;
      let hint = exprHint(recv);
      if (hint) {
        let narrowed = candidates.filter(
          (r) => r.name.split(".").slice(0, -1).join(".") === hint,
        );
        if (narrowed.length === 1) return narrowed[0].name;
        if (narrowed.length > 1) return null;
      }
      return candidates.length === 1 ? candidates[0].name : null;
    };
    let resolveAttr = (recv, attr) => {
      if (["real", "imag", "numerator", "denominator"].includes(attr)) {
        let hint = exprHint(recv);
        // 数値リテラル・数値と分かる変数・型が不明なレシーバは数値の属性へ。
        // 別種と確定しているレシーバ（文字列・リスト等）には付けない。
        if (hint === null || hint === "num") return "数値の属性";
        return null;
      }
      if (["start", "stop", "step"].includes(attr)) {
        if (exprHint(recv) === "range") return "rangeの属性";
        return null;
      }
      if (attr === "__annotations__") {
        if (recv && recv.k === "name" && funcNames.has(recv.name))
          return "__annotations__";
        if (exprHint(recv) === "func") return "__annotations__";
        return null;
      }
      return null;
    };
    function walk(n) {
      if (!n || typeof n !== "object") return;
      if (n.k === "def" && n.name) funcNames.add(n.name);
      if (
        (n.k === "assign" || n.k === "annassign") &&
        n.target &&
        n.target.k === "name"
      ) {
        let hint = exprHint(n.expr);
        if (hint) hints.set(n.target.name, hint);
      }
      if (n.k === "assignmulti" && Array.isArray(n.targets)) {
        let hint = exprHint(n.expr);
        if (hint)
          for (let t of n.targets)
            if (t && t.k === "name") hints.set(t.name, hint);
      }
      if (n.k === "call") {
        if (n.fn && n.fn.k === "name") {
          if (reference.some((r) => r.name === n.fn.name))
            push(n.line, "calls", n.fn.name);
        } else if (n.fn && n.fn.k === "attr" && n.fn.obj && n.fn.obj.k === "attr") {
          // os.path.join のような多段の属性チェーンは、完全名が参照項目と
          // 一致するときだけ採用する（末尾の名前だけで誤解決しない）。
          let build = (x) =>
            x.k === "name"
              ? x.name
              : x.k === "attr"
                ? build(x.obj) + "." + x.name
                : null;
          let chain = build(n.fn);
          if (chain && reference.some((r) => r.name === chain))
            push(n.line, "calls", chain);
        } else if (n.fn && n.fn.k === "attr") {
          let resolved = resolveMethod(n.fn.obj, n.fn.name);
          if (resolved) push(n.line, "calls", resolved);
        }
      }
      if (n.k === "attr") {
        let resolved = resolveAttr(n.obj, n.name);
        if (resolved) push(n.line, "attrs", resolved);
      }
      for (let value of Object.values(n))
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === "object") walk(value);
    }
    walk(nodes);
  } catch {}
  return { byLine };
}
function callsByLine(code) {
  let map = new Map();
  for (let [line, entry] of analyzeCode(code).byLine)
    map.set(line, [...entry.calls, ...entry.attrs]);
  return map;
}
export function normalize(raw, code, def = definition) {
  let refsByLine = callsByLine(code);
  if (raw.fatalResult) {
    let e = raw.fatalResult.diags.find((d) => d.level === "error");
    return {
      paths: [],
      error: e
        ? { line: e.line || 1, message: e.kind + "：" + e.msg }
        : undefined,
      truncated: false,
      limits: LIMITS,
    };
  }
  let paths = raw.paths.map((entry, id) => {
    let r = entry.result,
      error = r.diags.find((d) => d.level === "error");
    let trace = r.steps.map((s) => ({
      line: s.line || 1,
      text: s.text,
      kind: "step",
      refs: [],
    }));
    let actual = (r.dynCalls || []).map((x) => x.name.replace(/\(\)$/, ""));
    for (let t of trace) {
      let line = (code.split("\n")[t.line - 1] || "").trim();
      t.refs = [
        ...new Set([...(refsByLine.get(t.line) || []), ...def.scan(line)]),
      ].filter(
        (n) =>
          def.dynamicFilter === false ||
          ATTRIBUTE_REF_NAMES.has(n) ||
          actual.includes(n) ||
          actual.some((x) => x.endsWith("." + n)),
      );
    }
    for (let d of r.diags) {
      trace.push({
        line: d.line || 1,
        text: d.kind + "：" + d.msg,
        kind:
          d.level === "error"
            ? "error"
            : d.kind === "説明の上限"
              ? "limit"
              : "step",
        refs: [],
      });
    }
    return {
      id,
      trace,
      outputs: r.output.map((text, i) => ({
        channel: "print",
        text,
        line: r.outputLines?.[i],
      })),
      vars: Object.fromEntries(r.vars.map((v) => [v.name, v.value])),
      groups: [
        {
          title: "変数・オブジェクト",
          entries: r.vars
            .filter((v) => !v.name.startsWith("__macro_"))
            .map((v) => [v.name, `${v.value} (${v.type})`]),
        },
      ],
      error: error
        ? { line: error.line || 1, message: error.kind + "：" + error.msg }
        : undefined,
      captures: r.captures,
    };
  });
  return {
    paths,
    truncated: raw.truncated,
    limits: LIMITS,
    reasons: raw.truncated ? ["探索またはループの上限"] : [],
  };
}

// 教材の refs は scan（静的解析＋型ヒント解決）で差し込む（R7-151）。
for (const t of definition.templates) t.refs = definition.scan(t.code);

["基礎", "基礎", "基礎", "実践", "実践", "基礎", "実践", "応用", "応用", "応用"].forEach((level, i) => { definition.templates[i].level = level; });
