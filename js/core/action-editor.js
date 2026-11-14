// Shared action-sequence editor. Tool definitions supply the schema, labels and commands.
export function createActionEditor({
  key = "actions",
  palette,
  columns = ["action", "value", "target"],
}) {
  return {
    mount({ root, getCode, setCode, onError }) {
      let selected = null;
      const el = (tag, text) => {
        let n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        return n;
      };
      function parse() {
        let data = JSON.parse(getCode());
        if (!Array.isArray(data[key])) throw Error(`${key} 配列が必要です`);
        return data;
      }
      function commit(data) {
        setCode(JSON.stringify(data, null, 2));
      }
      function render() {
        root.replaceChildren();
        let toolbar = el("div");
        toolbar.className = "flow-toolbar";
        let select = el("select");
        select.setAttribute("aria-label", "追加するアクション");
        for (let entry of palette) {
          let o = el("option", entry.label || entry.name);
          o.value = entry.name;
          select.append(o);
        }
        let add = el("button", "＋ 追加");
        add.onclick = () => {
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
            b.disabled =
              (offset < 0 && i === 0) ||
              (offset > 0 && i === data[key].length - 1);
            b.onclick = () => {
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
            input.value =
              typeof item[field] === "object"
                ? JSON.stringify(item[field])
                : (item[field] ?? "");
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
                commit(d);
              } catch (e) {
                onError(e.message);
              }
            };
            label.append(input);
            card.append(label);
          }
          list.append(card);
        }
        root.append(list);
      }
      render();
      return {
        refresh: render,
        highlight(id) {
          let index = Number(String(id).replace("action-", ""));
          selected = index;
          render();
          let card = root.querySelector(`[data-action-index="${index}"]`);
          card?.focus({ preventScroll: true });
          card?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
        destroy() {
          root.replaceChildren();
        },
      };
    },
  };
}
