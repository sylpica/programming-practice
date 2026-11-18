/* 高度モード B7（G13）：pathlib.types のリファレンス（全5件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "pathlib.types.PathInfo",
  "category": "標準ライブラリ",
  "syntax": "PathInfo()",
  "description": "パスのメタ情報へのプロトコル（3.14 追加）。pathlib の Path.info が返す型で、実ファイルの状態を問い合わせる。",
  "example": "from pathlib.types import PathInfo\ninfo = PathInfo()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへの問い合わせが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.types.PathInfo"
 },
 {
  "name": "pathlib.types.PathInfo.exists",
  "category": "標準ライブラリ",
  "syntax": "info.exists(*, follow_symlinks=True)",
  "description": "パスが存在すれば True。",
  "example": "from pathlib.types import PathInfo\ninfo = PathInfo()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへの問い合わせが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.types.PathInfo.exists"
 },
 {
  "name": "pathlib.types.PathInfo.is_dir",
  "category": "標準ライブラリ",
  "syntax": "info.is_dir(*, follow_symlinks=True)",
  "description": "ディレクトリなら True。",
  "example": "from pathlib.types import PathInfo\ninfo = PathInfo()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへの問い合わせが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.types.PathInfo.is_dir"
 },
 {
  "name": "pathlib.types.PathInfo.is_file",
  "category": "標準ライブラリ",
  "syntax": "info.is_file(*, follow_symlinks=True)",
  "description": "通常ファイルなら True。",
  "example": "from pathlib.types import PathInfo\ninfo = PathInfo()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへの問い合わせが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.types.PathInfo.is_file"
 },
 {
  "name": "pathlib.types.PathInfo.is_symlink",
  "category": "標準ライブラリ",
  "syntax": "info.is_symlink()",
  "description": "シンボリックリンクなら True。",
  "example": "from pathlib.types import PathInfo\ninfo = PathInfo()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへの問い合わせが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.types.PathInfo.is_symlink"
 },
];
