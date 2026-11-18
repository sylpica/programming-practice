/* 高度モード B7（G13）：filecmp のリファレンス（全22件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "filecmp.DEFAULT_IGNORES",
  "category": "標準ライブラリ",
  "syntax": "filecmp.DEFAULT_IGNORES",
  "description": "dircmp が既定で無視するファイル名のリスト（RCS, CVS, tags, .git, .hg, .bzr, _darcs, __pycache__）。",
  "example": "import filecmp\nprint(filecmp.DEFAULT_IGNORES)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.DEFAULT_IGNORES"
 },
 {
  "name": "filecmp.clear_cache",
  "category": "標準ライブラリ",
  "syntax": "filecmp.clear_cache()",
  "description": "cmp のキャッシュをクリアする。本アプリではファイル比較のキャッシュ自体を持たないため、常に何もせず None を返す。",
  "example": "import filecmp\nprint(filecmp.clear_cache())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.clear_cache"
 },
 {
  "name": "filecmp.cmp",
  "category": "標準ライブラリ",
  "syntax": "filecmp.cmp(f1, f2, shallow=True)",
  "description": "2 つのファイルを比較し、同じなら True。shallow=True では stat の署名だけで判定する。",
  "example": "import filecmp\nprint(filecmp.cmp('a.txt', 'b.txt'))",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.cmp"
 },
 {
  "name": "filecmp.cmpfiles",
  "category": "標準ライブラリ",
  "syntax": "filecmp.cmpfiles(dir1, dir2, common, shallow=True)",
  "description": "共通ファイル群を比較し (一致, 不一致, エラー) の3つ組を返す。",
  "example": "import filecmp\nprint(filecmp.cmpfiles('d1', 'd2', ['a.txt']))",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.cmpfiles"
 },
 {
  "name": "filecmp.dircmp",
  "category": "標準ライブラリ",
  "syntax": "dircmp(a, b, ignore=None, hide=None)",
  "description": "2 つのディレクトリを比較するクラス。構築自体がディレクトリの読み取りを前提とする。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（ディレクトリの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp"
 },
 {
  "name": "filecmp.dircmp.common",
  "category": "標準ライブラリ",
  "syntax": "dc.common",
  "description": "両方に存在する名前のリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.common"
 },
 {
  "name": "filecmp.dircmp.common_dirs",
  "category": "標準ライブラリ",
  "syntax": "dc.common_dirs",
  "description": "両方に存在するサブディレクトリのリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.common_dirs"
 },
 {
  "name": "filecmp.dircmp.common_files",
  "category": "標準ライブラリ",
  "syntax": "dc.common_files",
  "description": "両方に存在するファイルのリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.common_files"
 },
 {
  "name": "filecmp.dircmp.common_funny",
  "category": "標準ライブラリ",
  "syntax": "dc.common_funny",
  "description": "型が異なるなど比較できない共通名のリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.common_funny"
 },
 {
  "name": "filecmp.dircmp.diff_files",
  "category": "標準ライブラリ",
  "syntax": "dc.diff_files",
  "description": "内容が異なる共通ファイルのリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.diff_files"
 },
 {
  "name": "filecmp.dircmp.funny_files",
  "category": "標準ライブラリ",
  "syntax": "dc.funny_files",
  "description": "比較できなかった共通ファイルのリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.funny_files"
 },
 {
  "name": "filecmp.dircmp.left",
  "category": "標準ライブラリ",
  "syntax": "dc.left",
  "description": "左ディレクトリのパス。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.left"
 },
 {
  "name": "filecmp.dircmp.left_list",
  "category": "標準ライブラリ",
  "syntax": "dc.left_list",
  "description": "左ディレクトリのフィルタ済みリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.left_list"
 },
 {
  "name": "filecmp.dircmp.left_only",
  "category": "標準ライブラリ",
  "syntax": "dc.left_only",
  "description": "左にだけ存在する名前のリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.left_only"
 },
 {
  "name": "filecmp.dircmp.report",
  "category": "標準ライブラリ",
  "syntax": "dc.report()",
  "description": "比較結果を出力する。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.report"
 },
 {
  "name": "filecmp.dircmp.report_full_closure",
  "category": "標準ライブラリ",
  "syntax": "dc.report_full_closure()",
  "description": "サブディレクトリを含む比較結果を出力する。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.report_full_closure"
 },
 {
  "name": "filecmp.dircmp.report_partial_closure",
  "category": "標準ライブラリ",
  "syntax": "dc.report_partial_closure()",
  "description": "直下のサブディレクトリまでの比較結果を出力する。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.report_partial_closure"
 },
 {
  "name": "filecmp.dircmp.right",
  "category": "標準ライブラリ",
  "syntax": "dc.right",
  "description": "右ディレクトリのパス。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.right"
 },
 {
  "name": "filecmp.dircmp.right_list",
  "category": "標準ライブラリ",
  "syntax": "dc.right_list",
  "description": "右ディレクトリのフィルタ済みリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.right_list"
 },
 {
  "name": "filecmp.dircmp.right_only",
  "category": "標準ライブラリ",
  "syntax": "dc.right_only",
  "description": "右にだけ存在する名前のリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.right_only"
 },
 {
  "name": "filecmp.dircmp.same_files",
  "category": "標準ライブラリ",
  "syntax": "dc.same_files",
  "description": "内容が同じ共通ファイルのリスト。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.same_files"
 },
 {
  "name": "filecmp.dircmp.subdirs",
  "category": "標準ライブラリ",
  "syntax": "dc.subdirs",
  "description": "共通サブディレクトリ名 → dircmp の辞書。",
  "example": "import filecmp\ndc = filecmp.dircmp('d1', 'd2')",
  "caution": "本アプリの高度モードでは未対応です（実ファイルの読み取りが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/filecmp.html#filecmp.dircmp.subdirs"
 },
];
