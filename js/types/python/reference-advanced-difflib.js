/* 高度モード B7 G3：difflib モジュールのリファレンス差分（全26件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * SequenceMatcher／Differ／diff 生成は CPython 3.12 の difflib.py を移植。
 */
export const referenceAdvanced = [
 {
  "name": "difflib.SequenceMatcher",
  "category": "標準ライブラリ",
  "syntax": "difflib.SequenceMatcher(isjunk=None, a='', b='', autojunk=True)",
  "description": "2つのシーケンスの類似を調べるクラス。Ratcliff–Obershelp 法で最長一致ブロックを再帰的に見つける。",
  "example": "import difflib\nprint(difflib.SequenceMatcher(None, 'abcd', 'abce').ratio())",
  "caution": "要素はハッシュ可能でなければならない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher"
 },
 {
  "name": "difflib.SequenceMatcher.set_seqs",
  "category": "標準ライブラリ",
  "syntax": "matcher.set_seqs(a, b)",
  "description": "比較する2つのシーケンスをまとめて設定する。",
  "example": "import difflib\nm = difflib.SequenceMatcher()\nm.set_seqs('abcd', 'abce')\nprint(m.ratio())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.set_seqs"
 },
 {
  "name": "difflib.SequenceMatcher.set_seq1",
  "category": "標準ライブラリ",
  "syntax": "matcher.set_seq1(a)",
  "description": "1番目のシーケンスだけを設定する。b 側の索引は作り直されない。",
  "example": "import difflib\nm = difflib.SequenceMatcher(None, '', 'abce')\nm.set_seq1('abcd')\nprint(m.ratio())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.set_seq1"
 },
 {
  "name": "difflib.SequenceMatcher.set_seq2",
  "category": "標準ライブラリ",
  "syntax": "matcher.set_seq2(b)",
  "description": "2番目のシーケンスだけを設定する。b 側の索引を作り直す。",
  "example": "import difflib\nm = difflib.SequenceMatcher(None, 'abcd', '')\nm.set_seq2('abce')\nprint(m.ratio())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.set_seq2"
 },
 {
  "name": "difflib.SequenceMatcher.find_longest_match",
  "category": "標準ライブラリ",
  "syntax": "matcher.find_longest_match(alo=0, ahi=None, blo=0, bhi=None)",
  "description": "a[alo:ahi] と b[blo:bhi] の最長一致ブロックを Match(a, b, size) タプルで返す。",
  "example": "import difflib\nprint(tuple(difflib.SequenceMatcher(None, 'abxcd', 'abycd').find_longest_match()))",
  "caution": "一致が無ければ (alo, blo, 0)。本アプリでは Match は通常のタプルとして返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.find_longest_match"
 },
 {
  "name": "difflib.SequenceMatcher.get_matching_blocks",
  "category": "標準ライブラリ",
  "syntax": "matcher.get_matching_blocks()",
  "description": "重ならない一致ブロックのリストを返す。末尾に (len(a), len(b), 0) の番兵が付く。",
  "example": "import difflib\nprint([tuple(m) for m in difflib.SequenceMatcher(None, 'abxcd', 'abycd').get_matching_blocks()])",
  "caution": "本アプリでは Match は通常のタプルとして返る。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.get_matching_blocks"
 },
 {
  "name": "difflib.SequenceMatcher.get_opcodes",
  "category": "標準ライブラリ",
  "syntax": "matcher.get_opcodes()",
  "description": "a を b に変える操作のリストを (tag, i1, i2, j1, j2) タプルで返す。tag は replace/delete/insert/equal。",
  "example": "import difflib\nprint(difflib.SequenceMatcher(None, 'abxcd', 'abycd').get_opcodes())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.get_opcodes"
 },
 {
  "name": "difflib.SequenceMatcher.get_grouped_opcodes",
  "category": "標準ライブラリ",
  "syntax": "matcher.get_grouped_opcodes(n=3)",
  "description": "get_opcodes の結果を、前後 n 行の文脈でグループに分けたリストを返す。",
  "example": "import difflib\nprint(list(difflib.SequenceMatcher(None, 'abcd', 'abce').get_grouped_opcodes()))",
  "caution": "グループ間が 2n 行を超える equal は分割され、端は n 行に切り詰められる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.get_grouped_opcodes"
 },
 {
  "name": "difflib.SequenceMatcher.ratio",
  "category": "標準ライブラリ",
  "syntax": "matcher.ratio()",
  "description": "類似度を 0.0–1.0 で返す。2*M/T（M は一致要素数、T は両シーケンスの要素数合計）。",
  "example": "import difflib\nprint(difflib.SequenceMatcher(None, 'abcd', 'abce').ratio())",
  "caution": "両方とも空なら 1.0。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.ratio"
 },
 {
  "name": "difflib.SequenceMatcher.quick_ratio",
  "category": "標準ライブラリ",
  "syntax": "matcher.quick_ratio()",
  "description": "ratio の上限の近似を速く返す。要素の出現回数だけを見る。",
  "example": "import difflib\nprint(difflib.SequenceMatcher(None, 'abcd', 'abce').quick_ratio())",
  "caution": "ratio 以上の値になることがある。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.quick_ratio"
 },
 {
  "name": "difflib.SequenceMatcher.real_quick_ratio",
  "category": "標準ライブラリ",
  "syntax": "matcher.real_quick_ratio()",
  "description": "ratio の上限の最も粗い近似を返す。長さだけを見る。",
  "example": "import difflib\nprint(difflib.SequenceMatcher(None, 'abcd', 'abce').real_quick_ratio())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.SequenceMatcher.real_quick_ratio"
 },
 {
  "name": "difflib.get_close_matches",
  "category": "標準ライブラリ",
  "syntax": "difflib.get_close_matches(word, possibilities, n=3, cutoff=0.6)",
  "description": "候補リストの中から word に近いものを類似度の高い順に最大 n 件返す。",
  "example": "import difflib\nprint(difflib.get_close_matches('appel', ['ape', 'apple', 'peach', 'puppy']))",
  "caution": "cutoff 未満の候補は含めない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.get_close_matches"
 },
 {
  "name": "difflib.unified_diff",
  "category": "標準ライブラリ",
  "syntax": "difflib.unified_diff(a, b, fromfile='', tofile='', fromfiledate='', tofiledate='', n=3, lineterm='\\n')",
  "description": "行のリスト同士を比較し、unified 形式の差分行を反復する。",
  "example": "import difflib\nprint(list(difflib.unified_diff(['a\\n', 'b\\n'], ['a\\n', 'c\\n'], lineterm='')))",
  "caution": "行に改行が含まれている前提の形式。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.unified_diff"
 },
 {
  "name": "difflib.context_diff",
  "category": "標準ライブラリ",
  "syntax": "difflib.context_diff(a, b, fromfile='', tofile='', fromfiledate='', tofiledate='', n=3, lineterm='\\n')",
  "description": "行のリスト同士を比較し、context 形式の差分行を反復する。",
  "example": "import difflib\nprint(list(difflib.context_diff(['a\\n', 'b\\n'], ['a\\n', 'c\\n'], lineterm='')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.context_diff"
 },
 {
  "name": "difflib.ndiff",
  "category": "標準ライブラリ",
  "syntax": "difflib.ndiff(a, b, linejunk=None, charjunk=IS_CHARACTER_JUNK)",
  "description": "行のリスト同士を比較し、Differ.compare と同じ形式（- / + / ? / 空白）の差分行を反復する。",
  "example": "import difflib\nprint(list(difflib.ndiff(['a', 'b'], ['a', 'c'])))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.ndiff"
 },
 {
  "name": "difflib.restore",
  "category": "標準ライブラリ",
  "syntax": "difflib.restore(delta, which)",
  "description": "ndiff の出力から元のリストを復元する。which=1 で元の1番目、2 で2番目。",
  "example": "import difflib\nd = list(difflib.ndiff(['a', 'b'], ['a', 'c']))\nprint(list(difflib.restore(d, 2)))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.restore"
 },
 {
  "name": "difflib.IS_LINE_JUNK",
  "category": "標準ライブラリ",
  "syntax": "difflib.IS_LINE_JUNK(line)",
  "description": "行が「ジャンク」（空白だけ、または # で始まるコメント）なら True を返す既定の判定関数。",
  "example": "import difflib\nprint(difflib.IS_LINE_JUNK('  '), difflib.IS_LINE_JUNK('# c'), difflib.IS_LINE_JUNK('x'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.IS_LINE_JUNK"
 },
 {
  "name": "difflib.IS_CHARACTER_JUNK",
  "category": "標準ライブラリ",
  "syntax": "difflib.IS_CHARACTER_JUNK(chr)",
  "description": "文字が「ジャンク」（空白またはタブ）なら True を返す既定の判定関数。",
  "example": "import difflib\nprint(difflib.IS_CHARACTER_JUNK(' '), difflib.IS_CHARACTER_JUNK('x'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.IS_CHARACTER_JUNK"
 },
 {
  "name": "difflib.Differ",
  "category": "標準ライブラリ",
  "syntax": "difflib.Differ(linejunk=None, charjunk=None)",
  "description": "行のリスト同士を比較して、人間向けの差分（ndiff 形式）を作るクラス。",
  "example": "import difflib\nprint(list(difflib.Differ().compare(['a', 'b'], ['a', 'c'])))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.Differ"
 },
 {
  "name": "difflib.Differ.__init__",
  "category": "標準ライブラリ",
  "syntax": "Differ(linejunk=None, charjunk=None)",
  "description": "Differ のコンストラクタ。行・文字のジャンク判定関数を受け取る。",
  "example": "import difflib\nd = difflib.Differ()\nprint(list(d.compare(['x'], ['x'])))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.Differ.__init__"
 },
 {
  "name": "difflib.Differ.compare",
  "category": "標準ライブラリ",
  "syntax": "differ.compare(a, b)",
  "description": "2つの行リストを比較し、- / + / ? / 空白 で始まる差分行を反復する。",
  "example": "import difflib\nprint(list(difflib.Differ().compare(['one', 'two'], ['one', 'three'])))",
  "caution": "? 行は文字単位の違いの位置を示す。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.Differ.compare"
 },
 {
  "name": "difflib.HtmlDiff",
  "category": "標準ライブラリ",
  "syntax": "difflib.HtmlDiff(tabsize=8, wrapcolumn=None, linejunk=None, charjunk=IS_CHARACTER_JUNK)",
  "description": "差分を HTML の表として生成するクラス。make_table で表、make_file で完全な HTML 文書を返す。",
  "example": "import difflib\nh = difflib.HtmlDiff()\nprint('table' in h.make_table(['a'], ['b']))",
  "caution": "生成 HTML は CPython のテンプレート文字列をそのまま使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.HtmlDiff"
 },
 {
  "name": "difflib.HtmlDiff.__init__",
  "category": "標準ライブラリ",
  "syntax": "HtmlDiff(tabsize=8, wrapcolumn=None, linejunk=None, charjunk=IS_CHARACTER_JUNK)",
  "description": "HtmlDiff のコンストラクタ。タブ幅や折り返し幅を受け取る。",
  "example": "import difflib\nh = difflib.HtmlDiff(tabsize=4)\nprint('table' in h.make_table(['a'], ['a']))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.HtmlDiff.__init__"
 },
 {
  "name": "difflib.HtmlDiff.make_table",
  "category": "標準ライブラリ",
  "syntax": "htmldiff.make_table(fromlines, tolines, fromdesc='', todesc='', context=False, numlines=5)",
  "description": "差分の HTML 表（table 要素）を文字列で返す。",
  "example": "import difflib\nh = difflib.HtmlDiff()\nprint(h.make_table([], []).count('Empty File'))",
  "caution": "context=True では変更箇所の前後 numlines 行だけを表示する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.HtmlDiff.make_table"
 },
 {
  "name": "difflib.HtmlDiff.make_file",
  "category": "標準ライブラリ",
  "syntax": "htmldiff.make_file(fromlines, tolines, fromdesc='', todesc='', context=False, numlines=5, *, charset='utf-8')",
  "description": "スタイルと凡例を含む完全な HTML 文書を文字列で返す。",
  "example": "import difflib\nh = difflib.HtmlDiff()\nprint(h.make_file(['a'], ['b']).startswith('\\n<!DOCTYPE html'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.HtmlDiff.make_file"
 },
 {
  "name": "difflib.diff_bytes",
  "category": "標準ライブラリ",
  "syntax": "difflib.diff_bytes(dformat, a, b, fromfile=b'', tofile=b'', fromfiledate=b'', tofiledate=b'', n=3, lineterm=b'\\n')",
  "description": "bytes の行リスト同士を比較する差分関数。",
  "example": "import difflib\nprint(difflib.diff_bytes(difflib.unified_diff, [b'a'], [b'b']))",
  "caution": "本アプリは bytes 型を扱わないため未対応。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/difflib.html#difflib.diff_bytes"
 },
];
