/* 高度モード B7（G13）：glob のリファレンス（全4件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "glob.escape",
  "category": "標準ライブラリ",
  "syntax": "glob.escape(pathname)",
  "description": "特殊文字 (* ? [) をすべてエスケープし、リテラルにマッチするパターンを返す。POSIX では各特殊文字を [x] の形にする。",
  "example": "import glob\nprint(glob.escape('a*b?[x]'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/glob.html#glob.escape"
 },
 {
  "name": "glob.glob",
  "category": "標準ライブラリ",
  "syntax": "glob.glob(pathname, *, root_dir=None, dir_fd=None, recursive=False, include_hidden=False)",
  "description": "パターンにマッチするパス名のリストを返す。",
  "example": "import glob\nprint(glob.glob('*.txt'))",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムの走査が必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/glob.html#glob.glob"
 },
 {
  "name": "glob.iglob",
  "category": "標準ライブラリ",
  "syntax": "glob.iglob(pathname, *, ...)",
  "description": "glob と同じ結果をイテレータで返す。",
  "example": "import glob\nprint(list(glob.iglob('*.txt')))",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムの走査が必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/glob.html#glob.iglob"
 },
 {
  "name": "glob.translate",
  "category": "標準ライブラリ",
  "syntax": "glob.translate(pat, *, recursive=False, include_hidden=False, seps=None)",
  "description": "glob パターンを正規表現に変換する（3.13 追加）。変換自体は純粋な文字列処理。",
  "example": "import glob\nprint(glob.translate('**/*.txt', recursive=True, include_hidden=True, seps='/'))",
  "caution": "seps を省略すると実行 OS の区切り文字を使うため、本アプリでは POSIX の / として扱う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/glob.html#glob.translate"
 },
];
