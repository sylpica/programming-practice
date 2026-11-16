import { LIMITS } from "../../core/contract.js";
import { toLearnerError } from "../../core/script.js";
import { sourceFailure } from "../../core/data.js";
import { REFERENCE } from "./reference.js";
import { TEMPLATES } from "./templates.js";
import { GLOSSARY } from "./glossary.js";
import { simulatePseudo, parseProgram, collectUsedNames } from "./engine.js";

const referenceNames = new Set(REFERENCE.map((item) => item.name));

// エンジンの生の結果を、画面が使う共通の形へ整える。
function normalize(raw) {
  if (raw.fatal) {
    return { paths: [], truncated: false, limits: LIMITS, error: { line: raw.fatal.line, message: raw.fatal.message, category: raw.fatal.category } };
  }
  const paths = raw.paths.map((path, index) => ({
    id: index + 1,
    trace: path.trace.map((step) => ({ line: step.line, text: step.text, kind: step.kind, refs: (step.refs || []).filter((name) => referenceNames.has(name)) })),
    outputs: path.outputs,
    vars: path.vars,
    groups: path.groups,
    ...(path.error ? { error: path.error } : {}),
  }));
  const result = { paths, truncated: raw.truncated, limits: LIMITS };
  if (raw.reasons && raw.reasons.length) result.reasons = raw.reasons;
  return result;
}

export const pseudoDefinition = {
  id: "pseudo",
  name: "IPA擬似言語",
  extensions: [".txt"],
  syntax: { name: "IPA擬似言語（記述形式 Ver.5.1 別紙2）", lineComment: "//" },
  reference: REFERENCE.map((item) => ({ ...item })),
  templates: TEMPLATES.map((template) => ({ ...template })),
  glossary: GLOSSARY.map(([term, definition]) => [term, definition]),
  semantics: {
    sources: [
      { title: "IPA 試験で使用する情報技術に関する用語・プログラム言語など Ver.5.1 別紙2「擬似言語の記述形式（基本情報技術者試験，応用情報技術者試験用）」", locator: "https://www.ipa.go.jp/shiken/syllabus/doe3um0000002djj-att/shiken_yougo_ver5_1.pdf" },
      { title: "IPA 基本情報技術者試験 科目B サンプル問題（擬似言語の問題 問1〜問6）", locator: "https://www.ipa.go.jp/shiken/syllabus/ps6vr7000000oett-att/fe_kamoku_b_sample.pdf" },
    ],
    paragraphs: [
      "仕様の正本は、IPA『試験で使用する情報技術に関する用語・プログラム言語など』Ver.5.1 の別紙2「擬似言語の記述形式」です。宣言（型名: 変数名、大域:、○ による手続き・関数の宣言）、代入（←）、条件分岐（if／elseif／else／endif）、繰返し（while／do／for と endfor・endwhile）、配列（{ } と添字）、属性句（要素数・行数・列数・文字数・文字目の文字・要素の和・行番号／列番号の要素の和）、クラス参照（メンバアクセスとコンストラクタ呼出し）、日本語の条件句や文（末尾に追加する、値を増やす、出力する等）を実装しています。簡易・高度の区別なく、最初から全部を対象にしています。試験問題の実例で確認できていない形は、未対応として名指しで止まります（詳細は docs/audit/MUSE-ADD-PSEUDO.md）。",
      "記述形式だけでは決まらない点は、試験問題の実例に合わせて次のとおり裁定しています（根拠は docs/audit/MUSE-ADD-PSEUDO.md）。÷ は、両辺が整数のとき商、実数を含むとき実数除算。文字列との + は連結。要素番号は1始まり。プログラム中で定義されていない関数・メソッドの呼出しは、問題文で定義される前提として、戻り値を「実行時に決まる値」にします。コンストラクタで生成したオブジェクトのメンバ初期値は、問題文の定義を再現できないため未定義として扱います。and／or は短絡評価します。",
      "未対応は名指しで止めます。「ずつ減らす」「の値を〜減らす」は確認した試験問題の範囲で実例が無く未対応です。文字列への添字、記述形式に無い演算子（*、/、==、!=、&&、||、べき乗）も未対応で、使うと理由を表示して止まります。for の制御記述と日本語の条件句は、実例で確認した形だけを受け付けます。条件に実行時に決まる値が含まれると、真・偽の両方の道筋をたどり、分岐パスの上限は2,000です。",
    ],
  },
  model: { globals: {}, args: [] },
  scan(code) {
    try {
      const used = collectUsedNames(parseProgram(code));
      return [...used].filter((name) => referenceNames.has(name));
    } catch {
      return [];
    }
  },
  simulate(code, model) {
    try {
      return normalize(simulatePseudo(code, model || {}));
    } catch (error) {
      return sourceFailure("IPA擬似言語", toLearnerError(error, "擬似言語の実行に失敗しました"));
    }
  },
};
