// 高度モード B8：CloudFormation 高度差分（公式ドキュメント掲載 1,798 種別、
// 主要プロパティは公式 Resource Specification JSON 272.0.0 で照合）。
import { referenceAdvanced as part1 } from "./reference-advanced-part1.js";
import { referenceAdvanced as part2 } from "./reference-advanced-part2.js";
import { referenceAdvanced as part3 } from "./reference-advanced-part3.js";

export const referenceAdvanced = [
  ...part1,
  ...part2,
  ...part3
];
