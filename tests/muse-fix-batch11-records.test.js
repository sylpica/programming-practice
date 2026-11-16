// 修正バッチ11（記録）回帰テスト：R32-N17（RG-363）。
//
// [DEV-H] DEVELOPMENT.md 冒頭の現在形主張（独立監査の実施ラウンドと
//   適用済み修正バッチの RG 範囲）が、台帳（正本）の最大 RG・最新
//   ラウンドと一致する。バッチ10の機械照合（PRG-H 等）は PROGRESS.md
//   冒頭と件数文が対象で、DEVELOPMENT.md 冒頭のラウンド／RG 範囲は
//   対象外だったため、バッチ10追随の陳腐化が素通りした（R32-N17）。
//   本テストで冒頭ブロックを照合対象に追加し、再発を防ぐ。
// [REG-H] 台帳の最新バッチ節の内部整合（RG の連番・累計行）と、
//   PROGRESS.md の最新の状態 bullet の累計表記が台帳と一致すること。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const register = read("docs/audit/muse/consolidated-residual-register.md");
const development = read("docs/DEVELOPMENT.md");
const progress = read("PROGRESS.md");

// 台帳の最新バッチ節（見出し）を機械抽出する。
function latestRegisterSection() {
  const re = /修正バッチ(\d+)（[^）]*）で新設された群（RG-(\d+)〜RG-(\d+)）/g;
  let m;
  let last = null;
  while ((m = re.exec(register)) !== null) last = m;
  assert.ok(last, "台帳に修正バッチの節見出しがあること");
  return {
    batch: Number(last[1]),
    start: Number(last[2]),
    end: Number(last[3]),
    index: last.index,
  };
}

test("DEV-H1: DEVELOPMENT.md 冒頭のラウンド数と RG 範囲が台帳の最新状態と一致する", () => {
  const sec = latestRegisterSection();
  const header = development.split("\n").slice(0, 5).join("\n");
  const round = header.match(/第(\d+)ラウンド/);
  assert.ok(round, "冒頭に実施ラウンドの記載があること");
  const range = header.match(/RG-(\d+)〜RG-(\d+)/);
  assert.ok(range, "冒頭に適用済み RG 範囲の記載があること");
  // ラウンドの正本：台帳に現れる監査ラウンド参照 R<round>-N* の最大値。
  const rounds = [...register.matchAll(/R(\d+)-N\d+/g)].map((x) => Number(x[1]));
  const latestRound = Math.max(...rounds);
  assert.equal(
    Number(round[1]),
    latestRound,
    `冒頭の「第${round[1]}ラウンド」が台帳の最新ラウンド第${latestRound}ラウンドと一致すること`,
  );
  // RG 範囲の終端の正本：台帳の最大 RG 番号。
  const rgs = [...register.matchAll(/RG-(\d+)/g)].map((x) => Number(x[1]));
  const maxRg = Math.max(...rgs);
  assert.equal(
    Number(range[2]),
    maxRg,
    `冒頭の RG 範囲の終端 RG-${range[2]} が台帳の最大 RG-${maxRg} と一致すること`,
  );
  assert.equal(
    Number(range[2]),
    sec.end,
    "冒頭の RG 範囲の終端が台帳の最新バッチ節の終端と一致すること",
  );
});

test("DEV-H2: DEVELOPMENT.md に台帳の最新バッチの段落があり RG 範囲が一致する", () => {
  const sec = latestRegisterSection();
  assert.ok(
    development.includes(`修正バッチ${sec.batch}`),
    `DEVELOPMENT.md に修正バッチ${sec.batch}の段落があること`,
  );
  assert.ok(
    development.includes(`RG-${sec.start}〜RG-${sec.end}`),
    `DEVELOPMENT.md に最新の RG 範囲 RG-${sec.start}〜RG-${sec.end} の記載があること`,
  );
});

test("REG-H: 台帳の最新バッチ節が連番で、累計表記が PROGRESS.md の最新状態と一致する", () => {
  const sec = latestRegisterSection();
  const tail = register.slice(sec.index);
  const bullets = [...tail.matchAll(/^- \*\*RG-(\d+) /gm)].map((x) => Number(x[1]));
  const expected = [];
  for (let n = sec.start; n <= sec.end; n++) expected.push(n);
  assert.deepEqual(
    bullets,
    expected,
    `最新バッチ節の RG が RG-${sec.start}〜RG-${sec.end} の連番であること`,
  );
  const cumulative = tail.match(
    /元項目 \*\*([\d,]+)件\*\*、統合 \*\*(\d+)グループ\*\*（RG-01〜RG-(\d+)）/,
  );
  assert.ok(cumulative, "台帳の最新バッチ節に累計行があること");
  assert.equal(Number(cumulative[2]), sec.end, "累計グループ数が最新 RG 番号と一致すること");
  assert.equal(Number(cumulative[3]), sec.end, "累計行の RG 終端が最新 RG 番号と一致すること");
  assert.ok(
    progress.includes(
      `累計 **${cumulative[1]}件／${cumulative[2]}グループ（RG-01〜RG-${cumulative[3]}）**`,
    ),
    "PROGRESS.md の累計表記が台帳の累計行と一致すること",
  );
});
