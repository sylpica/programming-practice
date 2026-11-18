import { readFileSync, writeFileSync } from "node:fs";

const CAUTION =
  "このシミュレータではイテレータの無効化を再現しません。変更前に得たイテレータは位置で要素を指し続けるため、実物（無効化されたイテレータの使用は未定義動作）とは動きが異なる場合があります";
const targets = [
  "std::string::append", "std::string::assign", "std::string::clear",
  "std::string::erase", "std::string::insert", "std::string::operator+=",
  "std::string::operator=", "std::string::pop_back", "std::string::push_back",
  "std::string::replace", "std::string::resize", "std::string::swap",
  "std::vector::assign", "std::vector::clear", "std::vector::emplace",
  "std::vector::emplace_back", "std::vector::erase", "std::vector::insert",
  "std::vector::operator=", "std::vector::pop_back", "std::vector::push_back",
  "std::vector::resize", "std::vector::swap",
];
const files = [1, 2, 3, 4, 5, 6, 7, 8].map(
  (n) => `js/types/cpp/reference-advanced-part${n}.js`,
);
let done = 0;
const missing = [];
for (const name of targets) {
  let applied = false;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const nameIdx = text.indexOf(`"name": "${name}"`);
    if (nameIdx < 0) continue;
    const nextName = text.indexOf('"name":', nameIdx + 1);
    const blockEnd = nextName < 0 ? text.length : nextName;
    const cautionIdx = text.indexOf('"caution": ""', nameIdx);
    if (cautionIdx < 0 || cautionIdx > blockEnd) continue;
    const updated =
      text.slice(0, cautionIdx) +
      `"caution": "${CAUTION}"` +
      text.slice(cautionIdx + '"caution": ""'.length);
    writeFileSync(f, updated);
    applied = true;
    done++;
    break;
  }
  if (!applied) missing.push(name);
}
console.log("applied:", done, "missing:", JSON.stringify(missing));
