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
    // str.format はブロックB6で単一エンジンに実装され、簡易モードでも実行時の
    // 「未対応：」停止は起きない（修正バッチ8の裁定どおり、参照専用分類自体は
    // 簡易モード表示用に残す）。そのため停止を主張する追記は付けず、実行できる
    // 旨と分類の残置を併記する（収束ラウンドA6班 CONV-A6-01。他7件は実際に
    // 停止するため従来の追記を維持。R29-N4 の在庫不変条件＝参照専用項目の
    // caution は「未対応」を含み「未確認」を含まない、にも適合させる）。
    if (r.name === "str.format") {
      r.caution += "str.format 自体は本アプリでも実行できる（この項目は未対応分類の参照専用として残している）。";
    } else if (["random", "json", "datetime"].includes(r.name)) {
      // 同根スイープ（修正バッチ18、A6班の申し送り裁定）：この3項目はモジュール
      // 概説項目で、簡易モードでは読み込み自体が未対応として停止するが、高度
      // モードでは標準ライブラリ実装（ブロックB7）により読み込み・主な機能が
      // 実行できる（実測：random は seed 固定で例が期待値どおり、json.dumps／
      // loads、datetime.date／timedelta が動作）。無条件の停止を主張する追記は
      // 高度モードの実挙動と矛盾するため、モード別の実態を併記する。分類
      // （supported=false・参照専用）は CONV-A6-01 と同じく残置する。
      // open／os／numpy.array／pandas.DataFrame は両モードとも実際に停止する
      // ため従来の追記を維持する。
      r.caution += "この項目は未対応分類の参照専用として残している。簡易モードではモジュールの読み込み自体が未対応として停止するが、高度モードでは読み込みや主な機能を実行できる。";
    } else {
      r.caution += "このアプリのシミュレーションでは未対応として停止する。";
    }
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
  extensions: [".py", ".pyw", ".txt"],
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
      // 統合第1弾（B6 申し送り A-X(d) の是正）: 名前解決は「いま有効な
      // カタログ」に対して行う。機構（app.js／worker.js）が合成カタログ
      // を definition.__catalogReference へ差し込んだ場合はそれを使い、
      // 未設定の環境では基礎カタログ（従来どおり）。
      let catalog = definition.__catalogReference || reference;
      let names = used
        .map((x) => x.name)
        .filter((name) => catalog.some((r) => r.name === name));
      // R7-151：メソッド呼び出しと属性参照は、レシーバの型ヒントで修飾名
      // （str.split 等）へ解決して併せる。collectUsed はメソッドの短い名前
      // しか返さないため、従来は参照リンクが付かなかった。
      let analyzed = analyzeCode(code, catalog);
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
// 統合第1弾（A-X(d) 是正）: 組み込み関数・演算子が暗黙に呼ぶ特殊
// メソッド（object.__*__）の対応表。項目が有効カタログに存在する
// 場合だけ属性参照として併記する（基礎カタログには object.__*__ が
// 無いため、簡易モードでは一切発火しない）。
const IMPLICIT_CALL_DUNDER = {
  len: "__len__",
  str: "__str__",
  repr: "__repr__",
  hash: "__hash__",
  bool: "__bool__",
  iter: "__iter__",
  abs: "__abs__",
  round: "__round__",
  bytes: "__bytes__",
  reversed: "__reversed__",
  format: "__format__",
};
const BINOP_DUNDER = {
  "+": "__add__",
  "-": "__sub__",
  "*": "__mul__",
  "/": "__truediv__",
  "//": "__floordiv__",
  "%": "__mod__",
  "**": "__pow__",
  "<<": "__lshift__",
  ">>": "__rshift__",
  "&": "__and__",
  "|": "__or__",
  "^": "__xor__",
  "@": "__matmul__",
};
const CMP_DUNDER = {
  "==": "__eq__",
  "!=": "__ne__",
  "<": "__lt__",
  "<=": "__le__",
  ">": "__gt__",
  ">=": "__ge__",
  in: "__contains__",
  "not in": "__contains__",
};
const UNOP_DUNDER = { "-": "__neg__", "+": "__pos__", "~": "__invert__", not: "__bool__" };
// 統合是正（第2段）: 累積代入（x += 1 等）が暗黙に呼ぶ特殊メソッド。
const AUG_DUNDER = {
  "+": "__iadd__",
  "-": "__isub__",
  "*": "__imul__",
  "/": "__itruediv__",
  "//": "__ifloordiv__",
  "%": "__imod__",
  "**": "__ipow__",
  "<<": "__ilshift__",
  ">>": "__irshift__",
  "&": "__iand__",
  "|": "__ior__",
  "^": "__ixor__",
  "@": "__imatmul__",
};
// 統合是正（第2段）: 型そのものをレシーバとする呼び出し（dict.fromkeys
// 等）で型名をヒントとして使う名前の集合。
const TYPE_NAME_HINTS = new Set([
  "str", "list", "tuple", "dict", "set", "frozenset", "frozendict", "bytes",
  "bytearray", "memoryview", "int", "float", "complex", "range", "slice",
  "type",
]);
// コードを静的に解析し、行ごとに「解決できた参照項目名」を集める。
// メソッドはレシーバの型ヒント（リテラル・コンストラクタ・単純代入から
// 推定）で修飾名へ解決し、候補が一意な場合だけ採用する（誤リンク防止）。
// 属性は 数値の属性／rangeの属性／__annotations__ を対象に同じ方針で解決する。
// catalog は名前解決の対象カタログ（既定は基礎カタログ）。
function analyzeCode(code, catalog = reference) {
  let byLine = new Map();
  try {
    let nodes = parseProgram(splitLines(code).lines);
    let hints = new Map();
    let funcNames = new Set();
    let classNames = new Set();
    // 統合是正（第3段・誤リンク M1 の是正）: 代入・削除の対象になった
    // 添字ノードは、読み取り（__getitem__）ではなく書き込み
    // （__setitem__）／削除（__delitem__）として扱う。対象ノードを
    // 記録し、汎用の添字分岐では読み取りとして付け直さない。
    let handledSubs = new Set();
    // 高度A7班是正（到達性の根本原因）: import の追跡。従来は import を
    // 一切記録せず、モジュール関数の解決は「短い名前が有効カタログ全体
    // で一意」な場合に限られていた。基礎カタログでは偶然一意になる名前
    // が多く成立していたが、標準ライブラリ 10,572 件を合成すると短名が
    // 大量に衝突し、math.gcd のような通常のモジュール関数まで「実行は
    // 正しいのにコードからリンクが付かない」状態になっていた（横断班
    // §5-3／§5-6、A7 機械照合で scan 自己到達 870/5,664 件を実測）。
    // import 文（k:'import'。text はパーサが正規化した文字列）から
    // 別名表を作り、レシーバがモジュール別名の場合は完全名で解決する。
    let moduleAliases = new Map(); // ローカル名 -> モジュールパス
    let fromImports = new Map(); // ローカル名 -> 完全名（モジュール.名前）
    let starModules = []; // from X import * の X
    let noteImport = (text) => {
      let t = String(text || "").trim();
      let m = /^from\s+(\S+)\s+import\s+(.+)$/.exec(t);
      if (m) {
        let mod = m[1];
        if (mod.startsWith(".")) return; // 相対 import は静的に解決しない
        let names = m[2]
          .replace(/[()]/g, " ")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        for (let part of names) {
          if (part === "*") {
            if (!starModules.includes(mod)) starModules.push(mod);
            continue;
          }
          let seg = part.split(/\s+as\s+/);
          let orig = seg[0].trim();
          let local = (seg[1] || seg[0]).trim();
          if (/^\w+$/.test(orig) && /^\w+$/.test(local))
            fromImports.set(local, mod + "." + orig);
        }
        return;
      }
      m = /^import\s+(.+)$/.exec(t);
      if (m) {
        for (let part of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
          let seg = part.split(/\s+as\s+/);
          let path = seg[0].trim();
          if (!/^[\w.]+$/.test(path)) continue;
          if (seg[1]) {
            let local = seg[1].trim();
            if (/^\w+$/.test(local)) moduleAliases.set(local, path);
          } else {
            // import a.b は根の名前 a を a 自身へ束縛する（a.b.c は
            // 属性チェーンとして辿る）。
            let root = path.split(".")[0];
            if (!moduleAliases.has(root)) moduleAliases.set(root, root);
          }
        }
      }
    };
    // 属性チェーン（name/attr の連鎖）を完全名へ組み立てる。根の名前が
    // モジュール別名・from import で束縛された名前の場合は実パスへ置換
    // する（import numpy as np の np.array を numpy.array として引く）。
    let chainName = (x) => {
      if (!x || typeof x !== "object") return null;
      if (x.k === "name") {
        if (moduleAliases.has(x.name)) return moduleAliases.get(x.name);
        if (fromImports.has(x.name)) return fromImports.get(x.name);
        return x.name;
      }
      if (x.k === "attr") {
        let base = chainName(x.obj);
        return base ? base + "." + x.name : null;
      }
      return null;
    };
    let ctorHint = (fname) => {
      if (fname === "range") return "range";
      // 統合是正: bytes／bytearray／frozenset／memoryview のコンストラクタも
      // レシーバ型として追跡する（従来はヒントが無く、メソッド候補が
      // 複数型に同名で存在すると解決できなかった）。
      if (
        ["str", "list", "tuple", "dict", "set", "bytes", "bytearray", "frozenset", "frozendict", "memoryview", "slice"].includes(fname)
      )
        return fname;
      // 統合是正（第2段）: 数値コンストラクタは型を分けて追跡する
      // （int／float を "num" に潰すと、属性解決で float の属性を int の
      // 項目へ誤リンクする。bool は int のサブクラスとして int 扱い）。
      if (fname === "int" || fname === "bool") return "int";
      if (fname === "float") return "float";
      if (fname === "complex") return "complex";
      return null;
    };
    let exprHint = (n) => {
      if (!n || typeof n !== "object") return null;
      if (n.k === "str") return "str";
      if (n.k === "byteslit") return "bytes";
      if (n.k === "list") return "list";
      if (n.k === "tuple") return "tuple";
      if (n.k === "dict") return "dict";
      if (n.k === "set") return "set";
      // 統合是正（第2段）: 数値リテラルは構文上の型を分ける（パーサが
      // float リテラルに f フラグ、複素数リテラルに cxlit を付ける）。
      if (n.k === "num") return n.f ? "float" : "int";
      if (n.k === "cxlit") return "complex";
      // 統合第4弾是正（横断班 §5-5 の後退の根本修正）: 二項・単項演算の
      // 結果型も推論する。従来は演算式がレシーバになると型ヒントが無く、
      // 短名の一意性だけが頼りだったため、B7 統合で numbers.Complex.
      // conjugate が増えた時点で (3+4j).conjugate() の解決が候補2件に
      // なり失われた（49034f2 では候補1件で偶然解決していた）。数値の
      // 型昇格（complex > float > int、真除算は int 同士でも float）と
      // 列の連結・反復だけを対象とし、決め打ちにならない範囲に限る。
      if (n.k === "un") {
        if (n.op === "not") return "int"; // bool は int 扱いの既存規約
        let inner = exprHint(n.e);
        return ["int", "float", "complex"].includes(inner) ? inner : null;
      }
      if (n.k === "bin") {
        if (
          ["==", "!=", "<", "<=", ">", ">=", "in", "not in", "is", "is not"].includes(n.op)
        )
          return "int"; // 比較・所属・同一性は bool（int 扱いの既存規約）
        let lh = exprHint(n.l),
          rh = exprHint(n.r);
        let nums = ["int", "float", "complex"];
        if (nums.includes(lh) && nums.includes(rh)) {
          if (lh === "complex" || rh === "complex") return "complex";
          if (lh === "float" || rh === "float") return "float";
          return n.op === "/" ? "float" : "int";
        }
        let seqs = ["str", "list", "tuple", "bytes", "bytearray"];
        if (n.op === "+" && lh && lh === rh && seqs.includes(lh)) return lh;
        if (n.op === "*") {
          if (lh === "int" && seqs.includes(rh)) return rh;
          if (rh === "int" && seqs.includes(lh)) return lh;
        }
        return null;
      }
      if (n.k === "call" && n.fn && n.fn.k === "name") {
        // 高度A7班是正: from import で束縛されたクラス名（Counter 等）と
        // クラス別名（代入ヒント経由）は、その完全名をレシーバ型ヒント
        // とする。これが無いと c.most_common() の候補を接頭辞で絞れない。
        if (fromImports.has(n.fn.name)) return fromImports.get(n.fn.name);
        if (hints.has(n.fn.name)) return hints.get(n.fn.name);
        return ctorHint(n.fn.name);
      }
      if (n.k === "call" && n.fn && n.fn.k === "attr") {
        // 高度A7班是正: collections.Counter(...) のようなモジュール経由
        // のコンストラクタ呼び出しは、解決できる完全名をヒントとする。
        // 工場関数の戻り値では近似になるが、その場合の絞り込み失敗は
        // 従来動作（一意性のみ）へ劣化するだけで誤リンクにはならない。
        let chain = chainName(n.fn);
        if (chain && catalog.some((r) => r.name === chain)) return chain;
        // 統合第4弾是正（横断班 §5-6 の残存）: メソッド呼び出しの結果型は、
        // 解決できた項目の returns 宣言（「list: ...」の型接頭辞）から
        // 得る。これが無いと ys = xs.copy() の結果型が伝播せず、高度
        // カタログで同名メソッドの候補が増えた呼び出し（append 等）が
        // 一意性で解決できなくなる（簡易では偶然解決していた）。
        // 接頭辞が既知の型名でない場合は従来どおり null へ劣化する。
        let resolved = resolveMethod(n.fn.obj, n.fn.name);
        if (resolved) {
          let item = catalog.find((r) => r.name === resolved);
          let ret =
            item && typeof item.returns === "string"
              ? item.returns.split(":")[0].trim()
              : "";
          if (ret === "bool") return "int"; // bool は int 扱いの既存規約
          if (
            ["int", "float", "complex", "str", "bytes", "bytearray", "list", "dict", "set", "frozenset", "tuple", "range", "slice", "memoryview"].includes(ret)
          )
            return ret;
        }
        return null;
      }
      if (n.k === "attr") {
        // 高度A7班是正: datetime.timezone.utc のようなモジュール属性の
        // 連鎖も、完全名がカタログにあればヒントとする。
        let chain = chainName(n);
        if (chain && catalog.some((r) => r.name === chain)) return chain;
        return null;
      }
      if (n.k === "name") {
        if (hints.has(n.name)) return hints.get(n.name);
        // 高度A7班是正: モジュール別名そのもの（m = math のような代入
        // 先を含む）はモジュールパスをヒントとし、後続のメソッド解決
        // で接頭辞として使えるようにする。
        if (moduleAliases.has(n.name)) return moduleAliases.get(n.name);
        if (fromImports.has(n.name)) return fromImports.get(n.name);
        // 統合是正（第2段）: dict.fromkeys のように型そのものがレシーバの
        // 場合は型名をヒントとする（変数の代入ヒントが優先）。
        if (TYPE_NAME_HINTS.has(n.name)) return n.name;
        return null;
      }
      return null;
    };
    let push = (line, kind, name) => {
      if (!line || !name) return;
      let entry = byLine.get(line) || { calls: [], attrs: [], shorts: new Map() };
      if (!entry[kind].includes(name)) entry[kind].push(name);
      byLine.set(line, entry);
    };
    // 統合是正（第2段）: メソッド呼び出しで解決した修飾名について、
    // 呼び出しの短い名前も記録する。エンジンの dynCalls は型によって
    // 短い名前だけを記録するため、normalize のトレースフィルタが
    // 「その行で実際に呼ばれた短い名前」との突合せで修飾名を通せる
    // ようにする（実行されていない呼び出しの誤リンクは防いだまま）。
    let pushShort = (line, qualified, short) => {
      if (!line || !qualified || !short) return;
      let entry = byLine.get(line) || { calls: [], attrs: [], shorts: new Map() };
      if (!entry.shorts.has(qualified)) entry.shorts.set(qualified, short);
      byLine.set(line, entry);
    };
    // 統合是正（第3段）: 代入・削除の対象式から、直接の対象になってい
    // る添字ノードを集める（タプル／リスト対象は要素をたどる。入れ子
    // の添字の内側は読み取りなので、対象そのものの添字だけを返す）。
    let targetSubs = (t, acc = []) => {
      if (!t || typeof t !== "object") return acc;
      if (t.k === "sub") {
        acc.push(t);
        return acc;
      }
      if (t.k === "tuple" || t.k === "list")
        for (let it of t.items || t.elts || []) targetSubs(it, acc);
      return acc;
    };
    let resolveMethod = (recv, short) => {
      let candidates = catalog.filter(
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
        // 統合是正: 数値ヒント "num" は int／float／complex の総称で、
        // 接頭辞一致では絞れない。数値3型の候補がちょうど1件のとき
        // だけ採用する（複数型にあるメソッドは決め打ちしない）。
        if (hint === "num") {
          let numeric = candidates.filter((r) =>
            ["int", "float", "complex"].includes(r.name.split(".")[0]),
          );
          if (numeric.length === 1) return numeric[0].name;
          if (numeric.length > 1) return null;
        }
      }
      return candidates.length === 1 ? candidates[0].name : null;
    };
    let resolveAttr = (recv, attr) => {
      // 高度A7班是正: レシーバがモジュール別名・from import 名・属性
      // チェーンの場合は完全名で直接引く（math.pi のようなモジュール
      // 定数、os.path.join のような多段名、datetime.timezone.utc の
      // ような連鎖属性）。短名の一意性には依存しない。
      {
        let base = chainName(recv);
        if (base && base !== attr) {
          let q = base + "." + attr;
          // 根が素の変数名のときは、変数名を接頭辞とする項目が偶然
          // 存在しても採用しない（chainName が置換した場合だけ有効）。
          let substituted =
            recv.k !== "name" ||
            moduleAliases.has(recv.name) ||
            fromImports.has(recv.name) ||
            (recv.k === "name" && base !== recv.name);
          if (substituted && catalog.some((r) => r.name === q)) return q;
        }
      }
      if (["real", "imag", "numerator", "denominator"].includes(attr)) {
        let hint = exprHint(recv);
        // 統合是正（第2段）: レシーバの型が int／float／complex と分かる
        // 場合はその型の個別項目へ。型が特定できない場合は型を決め打ち
        // せず束ね項目「数値の属性」へ倒す（float の属性を int の項目へ
        // 誤リンクする決め打ちはしない）。別種と確定しているレシーバ
        // （文字列・リスト等）には付けない。
        if (hint === "int" || hint === "float" || hint === "complex") {
          if (catalog.some((r) => r.name === `${hint}.${attr}`))
            return `${hint}.${attr}`;
          return "数値の属性";
        }
        if (hint === null || hint === "num") return "数値の属性";
        return null;
      }
      if (["start", "stop", "step"].includes(attr)) {
        let hint = exprHint(recv);
        if (hint === "range") {
          // 統合是正: range.start 等の個別項目があれば優先する。
          if (catalog.some((r) => r.name === `range.${attr}`))
            return `range.${attr}`;
          return "rangeの属性";
        }
        // 統合是正（第2段）: slice の属性は slice の個別項目へ。
        if (hint === "slice" && catalog.some((r) => r.name === `slice.${attr}`))
          return `slice.${attr}`;
        return null;
      }
      if (attr === "__annotations__") {
        if (recv && recv.k === "name" && funcNames.has(recv.name))
          return "__annotations__";
        if (exprHint(recv) === "func") return "__annotations__";
        return null;
      }
      // 統合是正（第2段）: レシーバ型が分かる属性参照は、その型の個別
      // 項目がカタログにあればそれへ（memoryview.obj 等）。
      let hint = exprHint(recv);
      if (hint && catalog.some((r) => r.name === `${hint}.${attr}`))
        return `${hint}.${attr}`;
      // 特殊メソッド属性（x.__class__ 等）は object の項目へ。
      if (
        attr.startsWith("__") &&
        attr.endsWith("__") &&
        catalog.some((r) => r.name === `object.${attr}`)
      )
        return `object.${attr}`;
      return null;
    };
    function walk(n) {
      if (!n || typeof n !== "object") return;
      if (n.k === "import" && n.text) noteImport(n.text);
      // 高度A7班是正: from import で束縛された名前の裸参照
      // （isinstance(x, Mapping) の第2引数など、呼び出しでも属性でも
      // ない位置での使用）も、その項目への参照として記録する。
      if (n.k === "name" && fromImports.has(n.name)) {
        let q = fromImports.get(n.name);
        if (q !== n.name && catalog.some((r) => r.name === q))
          push(n.line, "attrs", q);
      }
      if (n.k === "def" && n.name) funcNames.add(n.name);
      if (n.k === "class" && n.name) classNames.add(n.name);
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
          if (catalog.some((r) => r.name === n.fn.name))
            push(n.line, "calls", n.fn.name);
          // 高度A7班是正: from import で束縛された名前の呼び出し
          // （Counter(...)／gcd(...) 等）は完全名の項目へ解決する。
          if (fromImports.has(n.fn.name)) {
            let q = fromImports.get(n.fn.name);
            if (q !== n.fn.name && catalog.some((r) => r.name === q))
              push(n.line, "calls", q);
          } else if (
            !catalog.some((r) => r.name === n.fn.name) &&
            starModules.length
          ) {
            // 高度A7班是正: from X import * で取り込まれた名前は、
            // 候補がちょうど1件のときだけ採用する（誤リンク防止）。
            let cands = starModules
              .map((mod) => mod + "." + n.fn.name)
              .filter((q) => catalog.some((r) => r.name === q));
            if (cands.length === 1) push(n.line, "calls", cands[0]);
          }
          // 統合是正（A-X(d)）: len(x) のような組み込み呼び出しは型の
          // 特殊メソッドを暗黙に呼ぶ。対応する object.__*__ 項目が
          // 有効カタログにあり、引数が1つ以上ある場合だけ属性参照
          // として併記する（基礎カタログでは発火しない）。
          let dunder = IMPLICIT_CALL_DUNDER[n.fn.name];
          if (dunder && Array.isArray(n.args) && n.args.length) {
            let item = "object." + dunder;
            if (catalog.some((r) => r.name === item))
              push(n.line, "attrs", item);
          }
        } else if (n.fn && n.fn.k === "attr" && n.fn.obj && n.fn.obj.k === "attr") {
          // os.path.join のような多段の属性チェーンは、完全名が参照項目と
          // 一致するときだけ採用する（末尾の名前だけで誤解決しない）。
          // 高度A7班是正: 根の別名置換を含む chainName を使う
          // （import numpy as np の np.linalg.norm 等も辿れる）。
          let chain = chainName(n.fn);
          if (chain && catalog.some((r) => r.name === chain))
            push(n.line, "calls", chain);
        } else if (n.fn && n.fn.k === "attr") {
          // 高度A7班是正: レシーバがモジュール別名・from import 名の
          // 場合は完全名を直接引く（math.gcd(...) 等）。短名の一意性に
          // 依存する resolveMethod より先に、import の事実で解決する。
          let direct = null;
          if (n.fn.obj && n.fn.obj.k === "name") {
            let base =
              moduleAliases.get(n.fn.obj.name) ??
              fromImports.get(n.fn.obj.name);
            if (base) {
              let q = base + "." + n.fn.name;
              if (catalog.some((r) => r.name === q)) direct = q;
            }
          }
          if (direct) {
            push(n.line, "calls", direct);
            pushShort(n.line, direct, n.fn.name);
          } else {
            let resolved = resolveMethod(n.fn.obj, n.fn.name);
            if (resolved) {
              push(n.line, "calls", resolved);
              pushShort(n.line, resolved, n.fn.name);
            }
          }
        }
        // 統合是正（第2段）: ユーザー定義クラスのインスタンス化は
        // object.__init__ の暗黙呼び出しとして併記する。
        if (
          n.fn &&
          n.fn.k === "name" &&
          classNames.has(n.fn.name) &&
          catalog.some((r) => r.name === "object.__init__")
        )
          push(n.line, "attrs", "object.__init__");
      }
      // 統合是正（第3段）: 代入・注釈付き代入・複合代入の対象の添字は
      // __setitem__、del の対象は __delitem__ として併記し、読み取りの
      // __getitem__ は付けない（誤リンク M1 の是正）。
      if (n.k === "assign" || n.k === "annassign") {
        for (let s of targetSubs(n.target)) {
          handledSubs.add(s);
          if (catalog.some((r) => r.name === "object.__setitem__"))
            push(n.line, "attrs", "object.__setitem__");
        }
      }
      if (n.k === "assignmulti" && Array.isArray(n.targets)) {
        for (let t of n.targets)
          for (let s of targetSubs(t)) {
            handledSubs.add(s);
            if (catalog.some((r) => r.name === "object.__setitem__"))
              push(n.line, "attrs", "object.__setitem__");
          }
      }
      if (n.k === "del" && Array.isArray(n.targets)) {
        for (let t of n.targets)
          for (let s of targetSubs(t)) {
            handledSubs.add(s);
            if (catalog.some((r) => r.name === "object.__delitem__"))
              push(n.line, "attrs", "object.__delitem__");
          }
      }
      // 統合是正（第2段）: 添字・繰り返し・with・累積代入も特殊メソッド
      // の暗黙呼び出しである。項目が有効カタログにある場合だけ併記する。
      // 代入・削除の対象として処理済みの添字は読み取りにしない。
      if (
        n.k === "sub" &&
        !handledSubs.has(n) &&
        catalog.some((r) => r.name === "object.__getitem__")
      )
        push(n.line, "attrs", "object.__getitem__");
      if (n.k === "for" && catalog.some((r) => r.name === "object.__iter__"))
        push(n.line, "attrs", "object.__iter__");
      if (n.k === "with") {
        if (catalog.some((r) => r.name === "object.__enter__"))
          push(n.line, "attrs", "object.__enter__");
        if (catalog.some((r) => r.name === "object.__exit__"))
          push(n.line, "attrs", "object.__exit__");
      }
      if (n.k === "aug" && AUG_DUNDER[n.op]) {
        let item = "object." + AUG_DUNDER[n.op];
        if (catalog.some((r) => r.name === item)) push(n.line, "attrs", item);
        // 統合是正（第3段）: 添字への累積代入は読み取り（__getitem__、
        // 対象ノードの汎用分岐が付ける）に加えて書き込みも行う。
        if (
          n.target &&
          n.target.k === "sub" &&
          catalog.some((r) => r.name === "object.__setitem__")
        )
          push(n.line, "attrs", "object.__setitem__");
      }
      // 統合是正（A-X(d)）: 演算子・比較・単項演算も特殊メソッドの
      // 暗黙呼び出しである。項目が有効カタログにある場合だけ併記する。
      if (n.k === "bin" && BINOP_DUNDER[n.op]) {
        let item = "object." + BINOP_DUNDER[n.op];
        if (catalog.some((r) => r.name === item)) push(n.line, "attrs", item);
      }
      if (n.k === "cmp" && Array.isArray(n.pairs)) {
        for (let pair of n.pairs) {
          let d = CMP_DUNDER[pair.op];
          if (!d) continue;
          let item = "object." + d;
          if (catalog.some((r) => r.name === item))
            push(n.line, "attrs", item);
        }
      }
      if (n.k === "un" && UNOP_DUNDER[n.op]) {
        let item = "object." + UNOP_DUNDER[n.op];
        if (catalog.some((r) => r.name === item)) push(n.line, "attrs", item);
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
// 行ごとの解決名と、そのうち属性参照として解決された名前（行別）を返す。
// 属性参照は実行時の dynCalls に現れないため、normalize のフィルタでは
// 「その行で属性として解決された名前」を素通りさせる必要がある
// （統合第1弾で個別属性項目 int.real 等へ広げたことに伴う拡張。
// 従来の ATTRIBUTE_REF_NAMES は基礎の束ね項目用の固定集合だった）。
function callsByLine(code, catalog) {
  let map = new Map();
  let attrsByLine = new Map();
  let shortsByLine = new Map();
  for (let [line, entry] of analyzeCode(code, catalog).byLine) {
    map.set(line, [...entry.calls, ...entry.attrs]);
    attrsByLine.set(line, new Set(entry.attrs));
    shortsByLine.set(line, entry.shorts || new Map());
  }
  return { map, attrsByLine, shortsByLine };
}
export function normalize(raw, code, def = definition) {
  let catalog = def.__catalogReference || reference;
  let {
    map: refsByLine,
    attrsByLine,
    shortsByLine,
  } = callsByLine(code, catalog);
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
          // 統合第1弾: その行で属性として静的解決された名前（個別属性
          // 項目・暗黙の特殊メソッドを含む）も、属性参照の性質上
          // dynCalls に現れないため素通りさせる。
          (attrsByLine.get(t.line)?.has(n) ?? false) ||
          actual.includes(n) ||
          actual.some((x) => x.endsWith("." + n)) ||
          // 統合是正（第2段）: メソッド呼び出しで静的解決した修飾名は、
          // エンジンが短い名前だけを dynCalls に記録する型（int／
          // bytes 等）では上の突合せで落ちる。その行で実際に呼ばれた
          // 短い名前が dynCalls にある場合に限り通す（解決した呼び出し
          // がその行で実行されたことの証跡として）。
          ((short) =>
            !!short &&
            actual.some((x) => x === short || x.endsWith("." + short)))(
            shortsByLine.get(t.line)?.get(n),
          ),
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

// 高度モード（ブロックB6）：高度差分は本ファイルへ静的に取り込まない。
// 差分ファイル（ref-*-advanced.js／templates-advanced.js／
// glossary-advanced.js）は advanced-manifest.js の宣言に従い、モード
// 機構のローダーが遅延読み込みして基礎カタログと合成する（契約
// advanced-interface.md 第5章・第7章）。基礎カタログは不変。
