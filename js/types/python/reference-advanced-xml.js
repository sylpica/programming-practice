/* 高度モード B7 R3 追補：xml パッケージ本体のリファレンス差分（2件）。
 * Python 3.15 で追加された is_valid_name／is_valid_text。棚卸しにあり
 * 未収載だったものを新規収載する。形式は高度モード契約の正規形。
 * 実装は CPython 3.15 の Lib/xml/utils.py の正規表現の移植で、
 * CPython 本体ソースから採取した関数をローカル実走させたケース表と
 * 全件照合済み（tests/muse-adv-b7-r3.test.js）。 */
export const referenceAdvanced = [
 {
  "name": "xml.is_valid_name",
  "category": "標準ライブラリ",
  "syntax": "xml.is_valid_name(name)",
  "description": "文字列が XML の要素名・属性名として有効なら True、そうでなければ False を返します（Python 3.15 で追加）。ほぼ全ての文字が使えますが、制御文字と区切りとして使われる（または使われうる）文字は使えず、「:」「-」「.」「_」「·」は許可、「<」「/」「!」「?」「=」は禁止です。数字や「-」「.」「·」のような文字で始めることはできません。判定は W3C XML 仕様の Name 生成規則（NameStartChar／NameChar）に従います。引数が文字列でない場合は TypeError です。",
  "example": "import xml\nprint(xml.is_valid_name('my-element'), xml.is_valid_name('1st'))",
  "caution": "",
  "status": "supported",
  "returns": "bool",
  "source": "https://docs.python.org/ja/3.15/library/xml.html#xml.is_valid_name"
 },
 {
  "name": "xml.is_valid_text",
  "category": "標準ライブラリ",
  "syntax": "xml.is_valid_text(data)",
  "description": "文字列が XML 1.0 で許される文字だけの並びなら True、そうでなければ False を返します（Python 3.15 で追加）。ほぼ全ての文字が使えますが、C0 制御文字（TAB・CR・LF を除く）、サロゲート文字、U+FFFE と U+FFFF は使えません。空文字列は True です。引数が文字列でない場合は TypeError です。",
  "example": "import xml\nprint(xml.is_valid_text('hello'), xml.is_valid_text('a\\x00b'))",
  "caution": "",
  "status": "supported",
  "returns": "bool",
  "source": "https://docs.python.org/ja/3.15/library/xml.html#xml.is_valid_text"
 }
];
