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
    refs: reference
      .filter((r) => t.code.includes(r.name + "("))
      .map((r) => r.name),
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
      return [
        ...new Set(
          used
            .map((x) => x.name)
            .filter((name) => reference.some((r) => r.name === name)),
        ),
      ];
    } catch {
      return [];
    }
  },
  async simulate(code, model, limits) {
    try {
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
function callsByLine(code) {
  let map = new Map();
  try {
    let nodes = parseProgram(splitLines(code).lines);
    function name(n) {
      return n?.k === "name"
        ? n.name
        : n?.k === "attr"
          ? name(n.obj) + "." + n.name
          : "";
    }
    function walk(n) {
      if (!n || typeof n !== "object") return;
      if (n.k === "call") {
        let call = name(n.fn);
        let short = call.split(".").at(-1);
        let found = reference.find((r) => r.name === call || r.name === short);
        if (found) {
          let list = map.get(n.line) || [];
          if (!list.includes(found.name)) list.push(found.name);
          map.set(n.line, list);
        }
      }
      for (let value of Object.values(n))
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === "object") walk(value);
    }
    walk(nodes);
  } catch {}
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

["基礎", "基礎", "基礎", "実践", "実践", "基礎", "実践", "応用", "応用", "応用"].forEach((level, i) => { definition.templates[i].level = level; });
