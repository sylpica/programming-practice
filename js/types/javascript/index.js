import {
  simulateScript,
  scanScript,
  baseBinary,
  callName,
} from "../../core/script.js";
import { rows } from "../../core/data.js";
import { formatValue, unknown, isUnknown } from "../../core/contract.js";
const reference = rows([
  [
    "console.log",
    "出力",
    "console.log(value, ...)",
    "コンソールへの出力を説明します。",
    'console.log("合計", total)',
  ],
  [
    "document.getElementById",
    "DOM",
    'document.getElementById("id")',
    "モデルDOMからIDの一致する要素を返します。存在しなければnullです。",
    'const input = document.getElementById("name");',
  ],
  [
    "document.querySelector",
    "DOM",
    'document.querySelector("#id")',
    "モデルに明示したセレクターに対応する最初の要素を返します。",
    'document.querySelector("#result").textContent = "完了";',
    "一般のCSS探索は未対応。model.selectorsで対応を指定できます。",
  ],
  [
    "document.createElement",
    "DOM",
    'document.createElement("tag")',
    "モデル内に未接続の要素を作ります。",
    'const p = document.createElement("p");',
  ],
  [
    "appendChild",
    "DOM",
    "parent.appendChild(node)",
    "モデルの子要素一覧へ追加します。",
    "document.body.appendChild(p);",
  ],
  [
    "textContent",
    "DOM",
    "node.textContent = text",
    "モデル要素のテキストを更新します。",
    'document.getElementById("result").textContent = "完了";',
  ],
  [
    "value",
    "DOM",
    "input.value",
    "入力欄の値を読み書きします。",
    'const name = document.getElementById("name").value;',
  ],
  [
    "push",
    "配列",
    "array.push(value)",
    "配列の末尾に値を追加し、新しい長さを返します。",
    "values.push(4);",
  ],
  [
    "pop",
    "配列",
    "array.pop()",
    "末尾の値を取り除いて返します。",
    "last = values.pop();",
  ],
  [
    "Number",
    "型変換",
    "Number(value)",
    "ECMAScriptの数値変換を行います。",
    'const score = Number("12");',
  ],
  ["String", "型変換", "String(value)", "文字列に変換します。", "String(123)"],
  ["Boolean", "型変換", "Boolean(value)", "真偽値に変換します。", "Boolean(0)"],
  [
    "parseInt",
    "型変換",
    "parseInt(text, radix)",
    "先頭から整数として読める部分を変換します。",
    'parseInt("12px", 10)',
  ],
  ["Math.abs", "数値", "Math.abs(value)", "絶対値を返します。", "Math.abs(-3)"],
  [
    "Math.floor",
    "数値",
    "Math.floor(value)",
    "負の無限大方向へ丸めます。",
    "Math.floor(-1.2)",
  ],
  [
    "Math.round",
    "数値",
    "Math.round(value)",
    "近い整数へ丸めます。同点では正の無限大側です。",
    "Math.round(-1.5)",
  ],
  [
    "JSON.stringify",
    "オブジェクト",
    "JSON.stringify(value)",
    "JSON文字列へ変換します。",
    "JSON.stringify({a:1})",
  ],
  [
    "prompt",
    "入出力",
    'prompt("質問")',
    "結果は実行時の入力またはキャンセルで決まります。",
    'const answer = prompt("名前");',
  ],
  [
    "alert",
    "入出力",
    'alert("メッセージ")',
    "メッセージを出力欄に記録します。",
    'alert("完了");',
  ],
  [
    "if",
    "制御",
    "if (条件) { … } else { … }",
    "ToBooleanにより条件を判定します。",
    "if (score > 0) { console.log(score); }",
  ],
  [
    "for",
    "制御",
    "for (let i=0; i<3; i++) { … }",
    "初期化・条件・更新を順に評価します。",
    "for (let i=0; i<3; i++) { total += i; }",
  ],
  [
    "addEventListener",
    "DOM",
    'node.addEventListener("click", handler)',
    "イベントにハンドラを登録するAPIです。",
    'button.addEventListener("click", handler);',
    "イベント・コールバック実行はこの初版では未対応です。",
    false,
  ],
]);
export const definition = {
  id: "javascript",
  name: "JavaScript",
  extensions: [".js", ".txt"],
  syntax: {
    name: "ブラウザJavaScript 部分集合",
    caseSensitive: true,
    lineComment: "//",
  },
  reference,
  templates: [
    {
      id: "js-dom",
      title: "モデルDOMの入力と表示",
      code: 'const input = document.getElementById("name");\nconst result = document.getElementById("result");\nresult.textContent = "こんにちは、" + input.value;\nconsole.log(result.textContent);',
      intro:
        "getElementByIdでモデルの入力値を読み、textContentを書き換えます。実際の画面要素には触れません。",
      refs: ["document.getElementById", "value", "textContent", "console.log"],
    },
    {
      id: "js-array",
      title: "配列とオブジェクトの参照共有",
      code: "const values = [1, 2, 3];\nconst same = values;\nsame.push(4);\nlet total = 0;\nfor (let i = 0; i < values.length; i++) {\n    total += values[i];\n}\nconsole.log(total);\nconsole.log(values);",
      intro:
        "配列を代入すると同じオブジェクトへの参照が共有されます。constでも要素は変更できます。",
      refs: ["push", "for", "console.log"],
    },
    {
      id: "js-runtime",
      title: "入力が未確定の条件分岐",
      code: 'const answer = prompt("続けますか");\nif (answer === "はい") {\n    document.getElementById("result").textContent = "開始";\n} else {\n    alert("終了");\n}',
      intro:
        "promptの入力値は捏造しません。選択中のパスでDOMの変化と出力を比較できます。",
      refs: ["prompt", "if", "document.getElementById", "textContent", "alert"],
    },
  ],
  glossary: [
    ["DOM", "文書を要素ノードの構造として扱う仕組みです。"],
    ["参照", "同じオブジェクトを指す値です。"],
    ["const", "変数への再代入を禁止します。オブジェクトの内容は変更できます。"],
  ],
  model: {
    kind: "json",
    title: "モデルDOM",
    hint: "elements、selectors、bodyを編集できます。実DOMやネットワークを操作せず、このモデルだけを更新します。",
    defaults: {
      variables: {},
      dom: {
        elements: {
          name: {
            id: "name",
            tagName: "INPUT",
            value: "学習者",
            textContent: "",
          },
          result: { id: "result", tagName: "P", textContent: "未実行" },
        },
        selectors: { "#name": "name", "#result": "result" },
        body: { tagName: "BODY", children: [] },
      },
    },
  },
  semantics: {
    description:
      "ブラウザJavaScriptの変数・配列・オブジェクト参照・型変換と、明示したDOMモデルを追跡します。",
    support:
      "let / const / var、代入、If / For / While、掲載APIに対応。関数定義・コールバック・イベント・非同期処理・fetch・任意のDOM APIは未対応です。モデルにないサイトの挙動は推測しません。",
    sources: [
      { title: "ECMAScript公式仕様", url: "https://tc39.es/ecma262/" },
      { title: "WHATWG DOM Standard", url: "https://dom.spec.whatwg.org/" },
    ],
  },
  scan: (code) => scanScript(code, reference),
  async simulate(code, model, limits) {
    return simulateScript(
      code,
      model,
      {
        dialect: "js",
        blockScopes: true,
        initialize(s) {
          s.vars.document = { body: s.model.dom.body };
        },
        read(a, s, api) {
          if (a.k === "var" && a.name === "undefined")
            return { handled: true, value: undefined };
          if (a.k === "var" && a.name === "NaN")
            return { handled: true, value: NaN };
          if (a.k === "var" && a.name === "Infinity")
            return { handled: true, value: Infinity };
          if (a.k === "member") {
            let value = api.read(a.target, s);
            if (value == null)
              api.fail(
                "null / undefined のプロパティは参照できません",
                a,
                "TypeError",
              );
            if (isUnknown(value))
              return {
                handled: true,
                value: unknown("実行時のオブジェクトプロパティ"),
              };
            return { handled: true, value: value[a.name] };
          }
          if (a.k === "index") {
            let value = api.read(a.target, s),
              index = api.read(a.indexes[0], s);
            if (value == null)
              api.fail("null / undefined の添字参照です", a, "TypeError");
            if (isUnknown(value) || isUnknown(index))
              return { handled: true, value: unknown("実行時の添字参照") };
            return { handled: true, value: value[index] };
          }
          return null;
        },
        write(a, v, s, api, node) {
          if (a.k === "var" && s.types[a.name] === "const")
            api.fail("Assignment to constant variable", node, "TypeError");
          if (a.k === "member" || a.k === "index") {
            let obj = api.read(a.target, s);
            if (obj == null)
              api.fail("null / undefined へ書き込めません", node, "TypeError");
            if (typeof obj !== "object")
              api.fail("プリミティブ値へは書き込めません", node, "TypeError");
            let key = a.k === "member" ? a.name : api.read(a.indexes[0], s);
            if (["__proto__", "constructor", "prototype"].includes(key))
              api.fail("このプロパティはモデルでは未対応です", node);
            obj[key] = v;
            return true;
          }
          return false;
        },
        call(name, args, s, api, node) {
          const values = () => args.map((a) => api.read(a, s));
          switch (name) {
            case "console.log": {
              let v = values();
              s.outputs.push({
                channel: "console.log",
                text: v
                  .map((x) =>
                    typeof x === "object" ? formatValue(x) : String(x),
                  )
                  .join(" "),
                line: node.line,
              });
              return undefined;
            }
            case "alert":
              s.outputs.push({
                channel: "alert",
                text: formatValue(api.read(args[0], s)),
                line: node.line,
              });
              return undefined;
            case "prompt":
              return api.freshUnknown("promptの入力またはキャンセル", s);
            case "document.getElementById":
              return s.model.dom.elements[api.read(args[0], s)] ?? null;
            case "document.querySelector": {
              let selector = api.read(args[0], s),
                id = s.model.dom.selectors?.[selector];
              if (id) return s.model.dom.elements[id] ?? null;
              if (typeof selector === "string" && selector.startsWith("#"))
                return s.model.dom.elements[selector.slice(1)] ?? null;
              api.fail("モデルに未定義のCSSセレクターです", node);
            }
            case "document.createElement":
              return {
                tagName: String(api.read(args[0], s)).toUpperCase(),
                textContent: "",
                children: [],
              };
            case "Number": {
              let v = api.read(args[0], s);
              return isUnknown(v)
                ? unknown("Numberの入力による", v.id)
                : Number(v);
            }
            case "String": {
              let v = api.read(args[0], s);
              return isUnknown(v) ? v : String(v);
            }
            case "Boolean": {
              let v = api.read(args[0], s);
              return isUnknown(v) ? v : Boolean(v);
            }
            case "parseInt": {
              let [v, radix] = values();
              return isUnknown(v)
                ? unknown("parseIntの入力による")
                : parseInt(v, radix);
            }
            case "Math.abs":
            case "Math.floor":
            case "Math.round": {
              let v = api.read(args[0], s);
              return isUnknown(v)
                ? unknown(name + "の引数による")
                : Math[name.split(".")[1]](v);
            }
            case "JSON.stringify": {
              let v = api.read(args[0], s);
              if (isUnknown(v)) return v;
              try {
                return JSON.stringify(v);
              } catch {
                api.fail("循環参照はJSONへ変換できません", node, "TypeError");
              }
            }
          }
          if (node.target.k === "member") {
            let object = api.read(node.target.target, s),
              method = node.target.name;
            if (Array.isArray(object)) {
              if (method === "push") return object.push(...values());
              if (method === "pop") return object.pop();
              if (method === "join") return object.join(values()[0]);
            }
            if (method === "appendChild") {
              let child = api.read(args[0], s);
              if (!child || typeof child !== "object")
                api.fail("ノードが必要です", node, "TypeError");
              object.children ??= [];
              object.children.push(child);
              if (child.id) s.model.dom.elements[child.id] = child;
              api.note(s, node, "モデルDOMの子要素に追加します");
              return child;
            }
          }
          api.fail("このJavaScript関数は説明に対応していません：" + name, node);
        },
        groups: (p) => [
          {
            title: "変数・オブジェクト",
            entries: Object.entries(p.vars)
              .filter(([k]) => k !== "document")
              .map(([k, v]) => [k, formatValue(v)]),
          },
          {
            title: "モデルDOM",
            entries: [
              ["要素", formatValue(p.model.dom.elements)],
              ["body", formatValue(p.model.dom.body)],
            ],
          },
        ],
      },
      limits,
    );
  },
};
