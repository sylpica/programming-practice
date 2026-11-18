/* 高度モード B7 G3：stringprep モジュールのリファレンス差分（全19件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 表データは CPython 3.12.3 実走の走査・抽出による転記（捏造ではない）。
 */
export const referenceAdvanced = [
 {
  "name": "stringprep.in_table_a1",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_a1(codepoint)",
  "description": "コードポイントが表 A.1（未割り当てコードポイント、Unicode 3.2）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_a1('\\u0378'))",
  "caution": "表 A.1 は Unicode 3.2.0 時点の未割り当て集合であり、現在の Unicode で再現できないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_a1"
 },
 {
  "name": "stringprep.in_table_b1",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_b1(codepoint)",
  "description": "コードポイントが表 B.1（通常はマッピングで除去される文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_b1('\\u00ad'), stringprep.in_table_b1('a'))",
  "caution": "B.1 は明示集合（27コードポイント）を CPython 実走で転記したもの。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_b1"
 },
 {
  "name": "stringprep.map_table_b2",
  "category": "標準ライブラリ",
  "syntax": "stringprep.map_table_b2(codepoint)",
  "description": "1文字に表 B.2 のマッピング（大文字小文字変換を含む）を適用した文字列を返す。内部では B.3 例外表→NFKC→各文字への B.3→NFKC の合成で再現している。",
  "example": "import stringprep\nprint(stringprep.map_table_b2('Ａ'))",
  "caution": "引数は1文字だけ。CPython は Unicode 3.2.0 の NFKC を使うが、本アプリは実行環境の NFKC を使うため、3.2.0 以後に追加された文字など184コードポイントで結果が異なる（全範囲照合で測定済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.map_table_b2"
 },
 {
  "name": "stringprep.map_table_b3",
  "category": "標準ライブラリ",
  "syntax": "stringprep.map_table_b3(codepoint)",
  "description": "1文字に表 B.3 のマッピング（大文字小文字変換のみ）を適用した文字列を返す。例外表に無い文字は lower() で変換する。",
  "example": "import stringprep\nprint(stringprep.map_table_b3('A'))",
  "caution": "引数は1文字だけ。B.3 例外表（650件）は CPython 実走で抽出した転記。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.map_table_b3"
 },
 {
  "name": "stringprep.in_table_c11",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c11(codepoint)",
  "description": "コードポイントが表 C.1.1（ASCII の制御文字以外の空白）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c11(' '), stringprep.in_table_c11('\\u00a0'))",
  "caution": "C.1.1 は U+0020 のみ。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c11"
 },
 {
  "name": "stringprep.in_table_c12",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c12(codepoint)",
  "description": "コードポイントが表 C.1.2（ASCII でない空白）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c12('\\u00a0'), stringprep.in_table_c12(' '))",
  "caution": "Unicode 3.2.0 の Zs 集合で判定する（U+205F は 3.2.0 では未割り当てのため含めない）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c12"
 },
 {
  "name": "stringprep.in_table_c11_c12",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c11_c12(codepoint)",
  "description": "コードポイントが表 C.1（空白文字、C.1.1 と C.1.2 の和集合）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c11_c12('\\u2003'), stringprep.in_table_c11_c12('x'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c11_c12"
 },
 {
  "name": "stringprep.in_table_c21",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c21(codepoint)",
  "description": "コードポイントが表 C.2.1（ASCII 制御文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c21('\\x00'), stringprep.in_table_c21('a'))",
  "caution": "Cc カテゴリのうち ASCII 範囲。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c21"
 },
 {
  "name": "stringprep.in_table_c22",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c22(codepoint)",
  "description": "コードポイントが表 C.2.2（ASCII でない制御文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c22('\\x85'), stringprep.in_table_c22('\\ufeff'))",
  "caution": "Cc 範囲と明示的な特殊文字集合の和集合で判定する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c22"
 },
 {
  "name": "stringprep.in_table_c21_c22",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c21_c22(codepoint)",
  "description": "コードポイントが表 C.2（制御文字、C.2.1 と C.2.2 の和集合）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c21_c22('\\x7f'), stringprep.in_table_c21_c22('a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c21_c22"
 },
 {
  "name": "stringprep.in_table_c3",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c3(codepoint)",
  "description": "コードポイントが表 C.3（私用領域）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c3('\\ue000'), stringprep.in_table_c3('a'))",
  "caution": "Co カテゴリの範囲で判定する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c3"
 },
 {
  "name": "stringprep.in_table_c4",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c4(codepoint)",
  "description": "コードポイントが表 C.4（非文字コードポイント）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c4('\\ufffe'), stringprep.in_table_c4('a'))",
  "caution": "各プレーン末尾の FFFE/FFFF と FDD0–FDEF の算術規則で判定する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c4"
 },
 {
  "name": "stringprep.in_table_c5",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c5(codepoint)",
  "description": "コードポイントが表 C.5（サロゲートコードポイント）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c5('\\ud800'))",
  "caution": "Cs カテゴリの範囲（U+D800–U+DFFF）で判定する。文字列に単独サロゲートを含められない環境では例が実行できないことがある。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c5"
 },
 {
  "name": "stringprep.in_table_c6",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c6(codepoint)",
  "description": "コードポイントが表 C.6（プレーンテキストに不適切な文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c6('\\ufff9'), stringprep.in_table_c6('a'))",
  "caution": "明示集合を CPython の定義から転記したもの。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c6"
 },
 {
  "name": "stringprep.in_table_c7",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c7(codepoint)",
  "description": "コードポイントが表 C.7（書式レイアウトテキストに不適切な文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c7('\\u0340'), stringprep.in_table_c7('a'))",
  "caution": "明示集合を CPython の定義から転記したもの。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c7"
 },
 {
  "name": "stringprep.in_table_c8",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c8(codepoint)",
  "description": "コードポイントが表 C.8（表示形式を変更する文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c8('\\u0341'), stringprep.in_table_c8('a'))",
  "caution": "C.7 の一部と追加文字の明示集合。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c8"
 },
 {
  "name": "stringprep.in_table_c9",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_c9(codepoint)",
  "description": "コードポイントが表 C.9（タグ付け文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_c9('\\U000e0001'), stringprep.in_table_c9('a'))",
  "caution": "U+E0001 と U+E0020–U+E007F の範囲。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_c9"
 },
 {
  "name": "stringprep.in_table_d1",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_d1(codepoint)",
  "description": "コードポイントが表 D.1（双方向クラス R または AL を持つ文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_d1('a'))",
  "caution": "双方向クラスは Unicode 3.2.0 基準の判定が必要で、現在の Unicode データでは再現できないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_d1"
 },
 {
  "name": "stringprep.in_table_d2",
  "category": "標準ライブラリ",
  "syntax": "stringprep.in_table_d2(codepoint)",
  "description": "コードポイントが表 D.2（双方向クラス L を持つ文字）に含まれるか返す。",
  "example": "import stringprep\nprint(stringprep.in_table_d2('a'))",
  "caution": "双方向クラスは Unicode 3.2.0 基準の判定が必要で、現在の Unicode データでは再現できないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/stringprep.html#stringprep.in_table_d2"
 },
];
