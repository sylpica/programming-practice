// Shared action-sequence editor. Tool definitions supply the schema, labels and commands.
export function createActionEditor({
  key = "actions",
  palette,
  columns = ["action", "value", "target"],
}) {
  return {
    mount({ root, getCode, setCode, onError }) {
      let selected = null;
      // R7-128: JSONとして解釈できない入力は、古い値のまま正常実行されて
      // しまわないよう「未反映の入力」として保持する。入力欄の原文と
      // エラーを記録し、再描画でも原文と不正表示を復元する。未反映の
      // 入力がある間は app.js 側が実行を抑止する（hasPendingError）。
      const pendingEdits = new Map();
      // R7-129: Tab押下時点の移動意図。change 発火の瞬間は移動先がまだ
      // document.activeElement になっていない（BODYへ一時的に落ちる）ため、
      // keydown で「どの入力から・どちらへ」を記録し、再描画後に移動先の
      // 入力へフォーカスを渡す。
      let pendingTab = null;
      const pendingKey = (i, field) => i + "\n" + field;
      const pendingMessage = () => {
        for (const entry of pendingEdits.values()) return entry.message;
        return null;
      };
      const el = (tag, text) => {
        let n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        return n;
      };
      function parse() {
        let data = JSON.parse(getCode());
        if (!Array.isArray(data[key])) throw Error(`${key} 配列が必要です`);
        if (data[key].some((item) => !item || typeof item !== "object" || Array.isArray(item)))
          throw Error("アクションはオブジェクトで指定してください");
        return data;
      }
      function commit(data) {
        setCode(JSON.stringify(data, null, 2));
      }
      function render() {
        // R7-129: 再描画（replaceChildren）でフォーカスが本文へ落ちないよう、
        // 描画前にルート内のフォーカス先を安定キーで記録し、描画後に復元する。
        // Tab移動直後の change → commit → render の経路では、この時点で
        // 移動先の入力がフォーカスを持つため、その入力へ戻すことで
        // キーボードでの連続編集が途切れない。
        let focusKey = null,
          selStart = null,
          selEnd = null;
        try {
          const ae = document.activeElement;
          if (ae && root.contains(ae) && ae.dataset?.focusKey) {
            focusKey = ae.dataset.focusKey;
            try {
              selStart = ae.selectionStart;
              selEnd = ae.selectionEnd;
            } catch {}
          }
        } catch {}
        // R7-129: 今回の描画で生成するフォーカス可能要素のキー列（DOM順）。
        const focusOrder = [];
        root.replaceChildren();
        let toolbar = el("div");
        toolbar.className = "flow-toolbar";
        let select = el("select");
        select.setAttribute("aria-label", "追加するアクション");
        select.dataset.focusKey = "palette-select";
        focusOrder.push("palette-select");
        for (let entry of palette) {
          let o = el("option", entry.label || entry.name);
          o.value = entry.name;
          select.append(o);
        }
        let add = el("button", "＋ 追加");
        add.dataset.focusKey = "palette-add";
        focusOrder.push("palette-add");
        add.onclick = () => {
          // R7-128: 未反映の入力がある間は構造操作も行わない（古い値に
          // 基づく書換えで未反映状態が痕跡なく消えるのを防ぐ）。
          if (pendingEdits.size) {
            onError(pendingMessage());
            return;
          }
          try {
            let data = parse(),
              entry = palette.find((x) => x.name === select.value);
            data[key].push(structuredClone(entry.sample));
            commit(data);
          } catch (e) {
            onError(e.message);
          }
        };
        toolbar.append(select, add);
        root.append(toolbar);
        let data;
        try {
          data = parse();
        } catch {
          root.append(
            el("p", "JSONを修正するとアクション一覧を編集できます。"),
          );
          restoreFocus();
          return;
        }
        let list = el("ol");
        list.className = "action-list";
        for (let [i, item] of data[key].entries()) {
          let card = el("li");
          card.dataset.actionIndex = i;
          card.tabIndex = -1;
          if (selected === i) card.classList.add("selected");
          let head = el("div");
          head.className = "action-row-head";
          head.append(
            el("strong", `${i + 1}. ${item[columns[0]] || "アクション"}`),
          );
          for (let [text, offset] of [
            ["↑", -1],
            ["↓", 1],
            ["削除", 0],
          ]) {
            let b = el("button", text);
            b.setAttribute("aria-label", `${i + 1}番のアクションを${text}`);
            b.dataset.focusKey = `btn:${i}:${offset}`;
            focusOrder.push(b.dataset.focusKey);
            b.disabled =
              (offset < 0 && i === 0) ||
              (offset > 0 && i === data[key].length - 1);
            b.onclick = () => {
              if (pendingEdits.size) {
                onError(pendingMessage());
                return;
              }
              let d = parse();
              if (!offset) d[key].splice(i, 1);
              else
                [d[key][i], d[key][i + offset]] = [
                  d[key][i + offset],
                  d[key][i],
                ];
              commit(d);
            };
            head.append(b);
          }
          card.append(head);
          for (let field of [...new Set([...columns, ...Object.keys(item)])]) {
            let label = el("label", field),
              input = el("input");
            input.setAttribute("aria-label", `${i + 1} ${field}`);
            input.dataset.focusKey = `input:${i}:${field}`;
            focusOrder.push(input.dataset.focusKey);
            input.addEventListener("keydown", (e) => {
              if (e.key === "Tab")
                pendingTab = {
                  key: input.dataset.focusKey,
                  dir: e.shiftKey ? -1 : 1,
                };
            });
            const pending = pendingEdits.get(pendingKey(i, field));
            if (pending) {
              // R7-128: 未反映の原文と不正表示を再描画後も保持する。
              input.value = pending.raw;
              input.setAttribute("aria-invalid", "true");
              input.dataset.pending = "true";
            } else {
              input.value =
                typeof item[field] === "object"
                  ? JSON.stringify(item[field])
                  : (item[field] ?? "");
            }
            input.onchange = () => {
              try {
                let d = parse(),
                  v = input.value;
                if (
                  typeof item[field] === "object" ||
                  typeof item[field] === "number" ||
                  typeof item[field] === "boolean"
                ) {
                  v = JSON.parse(v);
                }
                d[key][i][field] = v;
                pendingEdits.delete(pendingKey(i, field));
                commit(d);
              } catch (e) {
                // R7-128: 失敗した入力は巻き戻さず未反映として保持し、
                // 不正表示を付ける。解消するまで実行は抑止される。
                pendingEdits.set(pendingKey(i, field), {
                  raw: input.value,
                  message: e.message,
                });
                input.setAttribute("aria-invalid", "true");
                input.dataset.pending = "true";
                onError(e.message);
              }
            };
            label.append(input);
            card.append(label);
          }
          list.append(card);
        }
        root.append(list);
        restoreFocus();
        function restoreFocus() {
          // R7-129: Tab移動の途中なら、記録した移動先へフォーカスを渡す
          // （再描画で移動先要素が破棄され、フォーカスが本文へ落ちるため）。
          if (pendingTab) {
            const { key: fromKey, dir } = pendingTab;
            pendingTab = null;
            const idx = focusOrder.indexOf(fromKey);
            if (idx >= 0) {
              // 無効化されたボタンは Tab 移動の対象外なので読み飛ばす。
              for (let j = idx + dir; j >= 0 && j < focusOrder.length; j += dir) {
                const node = [...root.querySelectorAll("[data-focus-key]")].find(
                  (n) => n.dataset.focusKey === focusOrder[j],
                );
                if (node && !node.disabled) {
                  node.focus({ preventScroll: true });
                  return;
                }
              }
            }
          }
          if (!focusKey) return;
          for (const node of root.querySelectorAll("[data-focus-key]")) {
            if (node.dataset.focusKey !== focusKey) continue;
            node.focus({ preventScroll: true });
            if (selStart !== null && selEnd !== null) {
              try {
                node.setSelectionRange(selStart, selEnd);
              } catch {}
            }
            break;
          }
        }
      }
      render();
      return {
        refresh: render,
        // R7-128: app.js の run() が未反映エラーの有無と文言を引くための窓口。
        hasPendingError: () => pendingEdits.size > 0,
        getPendingError: () => pendingMessage(),
        highlight(id) {
          let index = Number(String(id).replace("action-", ""));
          selected = index;
          render();
          let card = root.querySelector(`[data-action-index="${index}"]`);
          card?.focus({ preventScroll: true });
          // A-N7: prefers-reduced-motion が有効な場合は即時スクロールにする
          // (js/app.js の preferredScrollBehavior と同じ判定)。
          let reducedMotion = false;
          try {
            reducedMotion = !!globalThis.matchMedia?.(
              "(prefers-reduced-motion: reduce)",
            ).matches;
          } catch {}
          card?.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "start",
          });
        },
        destroy() {
          root.replaceChildren();
        },
      };
    },
  };
}
