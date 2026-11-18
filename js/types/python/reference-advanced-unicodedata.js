/* 高度モード B7 G3：unicodedata モジュールのリファレンス差分（全22件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成表は CPython 3.12.3（Unicode 15.0.0）の全コードポイント走査による転記。JS 側 Unicode 版との差は報告書に明記。
 */
export const referenceAdvanced = [
 {
  "name": "unicodedata.unidata_version",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.unidata_version",
  "description": "このモジュールが使う Unicode データベースのバージョン文字列。",
  "example": "import unicodedata\nprint(unicodedata.unidata_version)",
  "caution": "実行環境（ブラウザ）の Unicode バージョンに依存するため、本アプリでは値を確定できず未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.unidata_version"
 },
 {
  "name": "unicodedata.ucd_3_2_0",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.ucd_3_2_0",
  "description": "Unicode 3.2.0 のデータベースオブジェクト。プログラム ID の正規化など互換目的で使われる。",
  "example": "import unicodedata\nprint(type(unicodedata.ucd_3_2_0))",
  "caution": "3.2.0 のデータベース自体を保持していないため未検証。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.ucd_3_2_0"
 },
 {
  "name": "unicodedata.normalize",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.normalize(form, unistr)",
  "description": "文字列を正規化形式（NFC/NFD/NFKC/NFKD）に変換する。JS の String.normalize で正確に再現する。",
  "example": "import unicodedata\nprint(unicodedata.normalize('NFC', 'e\\u0301'))",
  "caution": "form が不正なら ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.normalize"
 },
 {
  "name": "unicodedata.is_normalized",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.is_normalized(form, unistr)",
  "description": "文字列が正規化形式 form になっているか返す。",
  "example": "import unicodedata\nprint(unicodedata.is_normalized('NFC', 'é'), unicodedata.is_normalized('NFC', 'e\\u0301'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.is_normalized"
 },
 {
  "name": "unicodedata.category",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.category(chr)",
  "description": "文字の一般カテゴリ（Lu、Nd など2文字）を返す。JS の Unicode プロパティエスケープから導出する。",
  "example": "import unicodedata\nprint(unicodedata.category('A'), unicodedata.category('5'), unicodedata.category(' '))",
  "caution": "未割り当てコードポイントは Cn を返す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.category"
 },
 {
  "name": "unicodedata.combining",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.combining(chr)",
  "description": "文字の結合クラス（0–255）を返す。結合文字でなければ 0。",
  "example": "import unicodedata\nprint(unicodedata.combining('\\u0301'), unicodedata.combining('a'))",
  "caution": "表は CPython 3.12.3 の全コードポイント走査で生成した転記。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.combining"
 },
 {
  "name": "unicodedata.east_asian_width",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.east_asian_width(chr)",
  "description": "文字の東アジアの幅分類（W、F、Na、H、N、A のいずれか）を返す。",
  "example": "import unicodedata\nprint(unicodedata.east_asian_width('あ'), unicodedata.east_asian_width('a'))",
  "caution": "表は CPython 3.12.3 の全コードポイント走査で生成した転記。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.east_asian_width"
 },
 {
  "name": "unicodedata.mirrored",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.mirrored(chr)",
  "description": "文字が双方向テキストで鏡像化されるなら 1、そうでなければ 0 を返す。",
  "example": "import unicodedata\nprint(unicodedata.mirrored('('), unicodedata.mirrored('a'))",
  "caution": "表は CPython 3.12.3 の全コードポイント走査で生成した転記。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.mirrored"
 },
 {
  "name": "unicodedata.decimal",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.decimal(chr[, default])",
  "description": "文字に定義された10進数値（0–9）を返す。定義がなければ default、default も無ければ ValueError。",
  "example": "import unicodedata\nprint(unicodedata.decimal('5'), unicodedata.decimal('٥'))",
  "caution": "Nd カテゴリの各ブロック先頭からの位置で値を導出する（全 Nd 文字で CPython と照合済み）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.decimal"
 },
 {
  "name": "unicodedata.digit",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.digit(chr[, default])",
  "description": "文字に定義された数字値を返す。上付き数字など decimal の無い文字にも値がある。定義がなければ default、無ければ ValueError。",
  "example": "import unicodedata\nprint(unicodedata.digit('²'), unicodedata.digit('5'))",
  "caution": "例外表は CPython 3.12.3 の全コードポイント走査で生成した転記。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.digit"
 },
 {
  "name": "unicodedata.numeric",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.numeric(chr[, default])",
  "description": "文字に定義された数値を float で返す。漢数字や分数にも値がある。定義がなければ default、無ければ ValueError。",
  "example": "import unicodedata\nprint(unicodedata.numeric('五'), unicodedata.numeric('½'))",
  "caution": "例外表は CPython 3.12.3 の全コードポイント走査で生成した転記。分数は float の近似になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.numeric"
 },
 {
  "name": "unicodedata.isxidstart",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.isxidstart(chr)",
  "description": "文字が XID_Start（識別子の先頭に使える文字）なら True を返す。",
  "example": "import unicodedata\nprint(unicodedata.isxidstart('a'), unicodedata.isxidstart('5'), unicodedata.isxidstart('_'))",
  "caution": "表は CPython 3.12.3 の str.isidentifier の性質から全コードポイント走査で生成した転記。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.isxidstart"
 },
 {
  "name": "unicodedata.isxidcontinue",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.isxidcontinue(chr)",
  "description": "文字が XID_Continue（識別子の2文字目以降に使える文字）なら True を返す。",
  "example": "import unicodedata\nprint(unicodedata.isxidcontinue('5'), unicodedata.isxidcontinue(' '))",
  "caution": "表は CPython 3.12.3 の str.isidentifier の性質から全コードポイント走査で生成した転記。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.isxidcontinue"
 },
 {
  "name": "unicodedata.name",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.name(chr[, default])",
  "description": "文字の Unicode 名を返す。",
  "example": "import unicodedata\nprint(unicodedata.name('A'))",
  "caution": "Unicode 名データベースを保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.name"
 },
 {
  "name": "unicodedata.lookup",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.lookup(name)",
  "description": "Unicode 名から文字を引く。",
  "example": "import unicodedata\nprint(unicodedata.lookup('LATIN CAPITAL LETTER A'))",
  "caution": "Unicode 名データベースを保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.lookup"
 },
 {
  "name": "unicodedata.decomposition",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.decomposition(chr)",
  "description": "文字の分解マッピングを文字列で返す。",
  "example": "import unicodedata\nprint(repr(unicodedata.decomposition('é')))",
  "caution": "分解マッピング表を保持していないため未対応（normalize 自体は JS の実装で正確）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.decomposition"
 },
 {
  "name": "unicodedata.bidirectional",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.bidirectional(chr)",
  "description": "文字の双方向クラスを返す。",
  "example": "import unicodedata\nprint(unicodedata.bidirectional('A'))",
  "caution": "双方向クラスの表を保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.bidirectional"
 },
 {
  "name": "unicodedata.block",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.block(chr)",
  "description": "文字が属する Unicode ブロック名を返す（3.15 で追加）。",
  "example": "import unicodedata\nprint(unicodedata.block('A'))",
  "caution": "ブロック表を保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.block"
 },
 {
  "name": "unicodedata.extended_pictographic",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.extended_pictographic(chr)",
  "description": "文字が Extended_Pictographic 性質を持つか返す（3.15 で追加）。",
  "example": "import unicodedata\nprint(unicodedata.extended_pictographic('A'))",
  "caution": "性質表を保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.extended_pictographic"
 },
 {
  "name": "unicodedata.grapheme_cluster_break",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.grapheme_cluster_break(chr)",
  "description": "文字の書記素クラスタ分割性質を返す（3.15 で追加）。",
  "example": "import unicodedata\nprint(unicodedata.grapheme_cluster_break('A'))",
  "caution": "性質表を保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.grapheme_cluster_break"
 },
 {
  "name": "unicodedata.indic_conjunct_break",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.indic_conjunct_break(chr)",
  "description": "文字の Indic 連結分割性質を返す（3.15 で追加）。",
  "example": "import unicodedata\nprint(unicodedata.indic_conjunct_break('A'))",
  "caution": "性質表を保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.indic_conjunct_break"
 },
 {
  "name": "unicodedata.iter_graphemes",
  "category": "標準ライブラリ",
  "syntax": "unicodedata.iter_graphemes(unistr)",
  "description": "文字列を書記素クラスタごとに反復する（3.15 で追加）。",
  "example": "import unicodedata\nprint(list(unicodedata.iter_graphemes('abc')))",
  "caution": "書記素クラスタ分割の表を保持していないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unicodedata.html#unicodedata.iter_graphemes"
 },
];
