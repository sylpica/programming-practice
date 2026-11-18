/* 高度モード B7（G13）：copyreg のリファレンス（全2件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "copyreg.constructor",
  "category": "標準ライブラリ",
  "syntax": "copyreg.constructor(object)",
  "description": "安全でないコンストラクタを登録する。callable でない場合は TypeError。",
  "example": "import copyreg\nprint(copyreg.constructor(len))",
  "caution": "登録先は copyreg の内部表で、pickle モジュール本体との連動は本アプリでは行わない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/copyreg.html#copyreg.constructor"
 },
 {
  "name": "copyreg.pickle",
  "category": "標準ライブラリ",
  "syntax": "copyreg.pickle(type, function, constructor_ob=None)",
  "description": "型に対する pickle 化（reduce）関数を登録する。function が callable でない場合は TypeError。",
  "example": "import copyreg\nprint(copyreg.pickle(int, str))",
  "caution": "登録先は copyreg の内部表で、pickle モジュール本体との連動は本アプリでは行わない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/copyreg.html#copyreg.pickle"
 },
];
