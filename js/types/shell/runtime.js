import { executeProgram } from "../../core/script.js";
import { LIMITS, unknown } from "../../core/contract.js";
// Shell control stacks stay in each state; only the existing interpreter owns budgets,
// constraint refinement, error traces, and the common result contract.
export function shellRuntime(
  nodes,
  model,
  initialize,
  dispatch,
  groups,
  custom = {},
) {
  const limits = {
      ...LIMITS,
      ...custom,
      paths: Math.min(LIMITS.paths, custom.paths || LIMITS.paths),
    },
    reasons = new Set();
  const root = { k: "shell-program", line: 1, refs: [] };
  const result = executeProgram(
    [root],
    model,
    {
      initialize,
      step(n, initial, api) {
        if (n.k !== "shell-program") return;
        const pending = [initial],
          done = [];
        initial.tasks = [...nodes].reverse();
        const stop = (s, node, reason) => {
          reasons.add(reason);
          api.note(s, node, reason + "で説明を停止しました", "limit");
          s.halt = true;
        };
        while (pending.length) {
          const s = pending.pop();
          let suspended = false;
          try {
            while (s.tasks.length && !s.halt) {
              api.check();
              const node = s.tasks.pop();
              const branched = dispatch(node, s, { ...api, limits, stop });
              if (branched) {
                suspended = true;
                for (const next of [...branched].reverse()) {
                  if (done.length + pending.length >= limits.paths) {
                    stop(next, node, `パス数の上限（${limits.paths}件）`);
                    if (!done.length) done.push(next);
                    break;
                  }
                  pending.push(next);
                }
                break;
              }
            }
            if (!suspended && (!s.tasks.length || s.halt)) done.push(s);
          } catch (e) {
            if (s.cmd && e.category === "実行エラー")
              s.cmd.errorlevel = unknown(
                "失敗したコマンドの終了コード（未確認）",
              );
            s.error = {
              line: e.line || 1,
              message: e.message,
              category: e.category || "エラー",
            };
            api.note(s, { line: e.line || 1, refs: [] }, e.message, "error");
            s.halt = true;
            done.push(s);
          }
        }
        for (const s of done) delete s.tasks;
        return done;
      },
      groups,
    },
    limits,
  );
  if (reasons.size) {
    result.truncated = true;
    result.reasons = [...new Set([...(result.reasons || []), ...reasons])];
  }
  if (result.truncated && !result.reasons?.length)
    result.reasons = [result.error?.message || "実行予算の上限"];
  return result;
}
export const pushNodes = (s, nodes) => s.tasks.push(...[...nodes].reverse());
