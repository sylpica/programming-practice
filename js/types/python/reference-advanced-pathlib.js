/* 高度モード B7（G13）：pathlib のリファレンス（全76件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "pathlib.Path",
  "category": "標準ライブラリ",
  "syntax": "Path('a', 'b')",
  "description": "具体パス（このプラットフォームでは PosixPath）のクラス。生成と純粋なパス操作は PurePath と同じ。ファイルシステム操作は未対応。",
  "example": "from pathlib import Path\nprint(Path('a/b/c.txt'))",
  "caution": "実在のファイルには一切アクセスしない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path"
 },
 {
  "name": "pathlib.Path.absolute",
  "category": "標準ライブラリ",
  "syntax": "path.absolute()",
  "description": "現在の作業ディレクトリ基準で絶対パス化する（正規化はしない）。",
  "example": "from pathlib import Path\nprint(Path('a.txt').absolute())",
  "caution": "本アプリの高度モードでは未対応です（現在の作業ディレクトリに依存するため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.absolute"
 },
 {
  "name": "pathlib.Path.as_uri",
  "category": "標準ライブラリ",
  "syntax": "path.as_uri()",
  "description": "絶対パスを file URI として表す。相対パスでは ValueError。",
  "example": "from pathlib import Path\nprint(Path('/etc/hosts').as_uri())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.as_uri"
 },
 {
  "name": "pathlib.Path.chmod",
  "category": "標準ライブラリ",
  "syntax": "path.chmod(mode)",
  "description": "ファイルのモードを変更する。",
  "example": "from pathlib import Path\nPath('a.txt').chmod(0o644)",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.chmod"
 },
 {
  "name": "pathlib.Path.copy",
  "category": "標準ライブラリ",
  "syntax": "path.copy(target)",
  "description": "ファイルをコピーし、コピー先の Path を返す（3.14 追加）。",
  "example": "from pathlib import Path\nPath('a.txt').copy('b.txt')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.copy"
 },
 {
  "name": "pathlib.Path.copy_into",
  "category": "標準ライブラリ",
  "syntax": "path.copy_into(target_dir)",
  "description": "ファイルをディレクトリ内へコピーする（3.14 追加）。",
  "example": "from pathlib import Path\nPath('a.txt').copy_into('dir')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.copy_into"
 },
 {
  "name": "pathlib.Path.cwd",
  "category": "標準ライブラリ",
  "syntax": "Path.cwd()",
  "description": "現在の作業ディレクトリを返すクラスメソッド。",
  "example": "from pathlib import Path\nprint(Path.cwd())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.cwd"
 },
 {
  "name": "pathlib.Path.exists",
  "category": "標準ライブラリ",
  "syntax": "path.exists(follow_symlinks=True)",
  "description": "パスが存在すれば True。",
  "example": "from pathlib import Path\nprint(Path('a.txt').exists())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.exists"
 },
 {
  "name": "pathlib.Path.expanduser",
  "category": "標準ライブラリ",
  "syntax": "path.expanduser()",
  "description": "先頭の ~ をホームディレクトリに展開する。",
  "example": "from pathlib import Path\nprint(Path('~/a.txt').expanduser())",
  "caution": "本アプリの高度モードでは未対応です（ホームディレクトリ（環境）に依存するため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.expanduser"
 },
 {
  "name": "pathlib.Path.from_uri",
  "category": "標準ライブラリ",
  "syntax": "Path.from_uri(uri)",
  "description": "file URI から Path を生成するクラスメソッド（3.14 追加）。file スキーム以外や localhost 以外のホストは ValueError。",
  "example": "from pathlib import Path\nprint(Path.from_uri('file:///etc/hosts'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.from_uri"
 },
 {
  "name": "pathlib.Path.glob",
  "category": "標準ライブラリ",
  "syntax": "path.glob(pattern)",
  "description": "このディレクトリ直下でパターンにマッチするパスを生成する。",
  "example": "from pathlib import Path\nprint(list(Path('.').glob('*.txt')))",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.glob"
 },
 {
  "name": "pathlib.Path.group",
  "category": "標準ライブラリ",
  "syntax": "path.group()",
  "description": "ファイルの所有グループ名を返す。",
  "example": "from pathlib import Path\nprint(Path('a.txt').group())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.group"
 },
 {
  "name": "pathlib.Path.hardlink_to",
  "category": "標準ライブラリ",
  "syntax": "path.hardlink_to(target)",
  "description": "このパスへのハードリンクを作成する。",
  "example": "from pathlib import Path\nPath('link').hardlink_to('a.txt')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.hardlink_to"
 },
 {
  "name": "pathlib.Path.home",
  "category": "標準ライブラリ",
  "syntax": "Path.home()",
  "description": "ホームディレクトリを返すクラスメソッド。",
  "example": "from pathlib import Path\nprint(Path.home())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.home"
 },
 {
  "name": "pathlib.Path.info",
  "category": "標準ライブラリ",
  "syntax": "path.info",
  "description": "パスのメタ情報（PathInfo）。3.14 追加。",
  "example": "from pathlib import Path\nprint(Path('a.txt').info.exists())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.info"
 },
 {
  "name": "pathlib.Path.is_block_device",
  "category": "標準ライブラリ",
  "syntax": "path.is_block_device()",
  "description": "ブロックデバイスなら True。",
  "example": "from pathlib import Path\nprint(Path('/dev/sda').is_block_device())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_block_device"
 },
 {
  "name": "pathlib.Path.is_char_device",
  "category": "標準ライブラリ",
  "syntax": "path.is_char_device()",
  "description": "キャラクターデバイスなら True。",
  "example": "from pathlib import Path\nprint(Path('/dev/null').is_char_device())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_char_device"
 },
 {
  "name": "pathlib.Path.is_dir",
  "category": "標準ライブラリ",
  "syntax": "path.is_dir(follow_symlinks=True)",
  "description": "ディレクトリなら True。",
  "example": "from pathlib import Path\nprint(Path('dir').is_dir())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_dir"
 },
 {
  "name": "pathlib.Path.is_fifo",
  "category": "標準ライブラリ",
  "syntax": "path.is_fifo()",
  "description": "FIFO（名前付きパイプ）なら True。",
  "example": "from pathlib import Path\nprint(Path('pipe').is_fifo())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_fifo"
 },
 {
  "name": "pathlib.Path.is_file",
  "category": "標準ライブラリ",
  "syntax": "path.is_file(follow_symlinks=True)",
  "description": "通常ファイルなら True。",
  "example": "from pathlib import Path\nprint(Path('a.txt').is_file())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_file"
 },
 {
  "name": "pathlib.Path.is_junction",
  "category": "標準ライブラリ",
  "syntax": "path.is_junction()",
  "description": "ジャンクション（Windows）なら True。",
  "example": "from pathlib import Path\nprint(Path('a').is_junction())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_junction"
 },
 {
  "name": "pathlib.Path.is_mount",
  "category": "標準ライブラリ",
  "syntax": "path.is_mount()",
  "description": "マウントポイントなら True。",
  "example": "from pathlib import Path\nprint(Path('/').is_mount())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_mount"
 },
 {
  "name": "pathlib.Path.is_socket",
  "category": "標準ライブラリ",
  "syntax": "path.is_socket()",
  "description": "ソケットなら True。",
  "example": "from pathlib import Path\nprint(Path('sock').is_socket())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_socket"
 },
 {
  "name": "pathlib.Path.is_symlink",
  "category": "標準ライブラリ",
  "syntax": "path.is_symlink()",
  "description": "シンボリックリンクなら True。",
  "example": "from pathlib import Path\nprint(Path('link').is_symlink())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.is_symlink"
 },
 {
  "name": "pathlib.Path.iterdir",
  "category": "標準ライブラリ",
  "syntax": "path.iterdir()",
  "description": "ディレクトリ直下のエントリを生成する。",
  "example": "from pathlib import Path\nprint(list(Path('.').iterdir()))",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.iterdir"
 },
 {
  "name": "pathlib.Path.lchmod",
  "category": "標準ライブラリ",
  "syntax": "path.lchmod(mode)",
  "description": "シンボリックリンク自体のモードを変更する。",
  "example": "from pathlib import Path\nPath('link').lchmod(0o644)",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.lchmod"
 },
 {
  "name": "pathlib.Path.lstat",
  "category": "標準ライブラリ",
  "syntax": "path.lstat()",
  "description": "リンクをたどらない stat 結果を返す。",
  "example": "from pathlib import Path\nprint(Path('a.txt').lstat())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.lstat"
 },
 {
  "name": "pathlib.Path.mkdir",
  "category": "標準ライブラリ",
  "syntax": "path.mkdir(mode=0o777, parents=False, exist_ok=False)",
  "description": "ディレクトリを作成する。",
  "example": "from pathlib import Path\nPath('newdir').mkdir()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.mkdir"
 },
 {
  "name": "pathlib.Path.move",
  "category": "標準ライブラリ",
  "syntax": "path.move(target)",
  "description": "ファイル／ディレクトリを移動し、移動先の Path を返す（3.14 追加）。",
  "example": "from pathlib import Path\nPath('a.txt').move('b.txt')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.move"
 },
 {
  "name": "pathlib.Path.move_into",
  "category": "標準ライブラリ",
  "syntax": "path.move_into(target_dir)",
  "description": "ファイルをディレクトリ内へ移動する（3.14 追加）。",
  "example": "from pathlib import Path\nPath('a.txt').move_into('dir')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.move_into"
 },
 {
  "name": "pathlib.Path.open",
  "category": "標準ライブラリ",
  "syntax": "path.open(mode='r', ...)",
  "description": "ファイルを開いてファイルオブジェクトを返す。",
  "example": "from pathlib import Path\nprint(Path('a.txt').open().read())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.open"
 },
 {
  "name": "pathlib.Path.owner",
  "category": "標準ライブラリ",
  "syntax": "path.owner()",
  "description": "ファイルの所有ユーザー名を返す。",
  "example": "from pathlib import Path\nprint(Path('a.txt').owner())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.owner"
 },
 {
  "name": "pathlib.Path.read_bytes",
  "category": "標準ライブラリ",
  "syntax": "path.read_bytes()",
  "description": "ファイルの内容を bytes で返す。",
  "example": "from pathlib import Path\nprint(Path('a.bin').read_bytes())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.read_bytes"
 },
 {
  "name": "pathlib.Path.read_text",
  "category": "標準ライブラリ",
  "syntax": "path.read_text(encoding=None, errors=None)",
  "description": "ファイルの内容を文字列で返す。",
  "example": "from pathlib import Path\nprint(Path('a.txt').read_text())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.read_text"
 },
 {
  "name": "pathlib.Path.readlink",
  "category": "標準ライブラリ",
  "syntax": "path.readlink()",
  "description": "シンボリックリンクのリンク先を Path で返す。",
  "example": "from pathlib import Path\nprint(Path('link').readlink())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.readlink"
 },
 {
  "name": "pathlib.Path.rename",
  "category": "標準ライブラリ",
  "syntax": "path.rename(target)",
  "description": "名前を変更し、新しい Path を返す。",
  "example": "from pathlib import Path\nPath('a.txt').rename('b.txt')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.rename"
 },
 {
  "name": "pathlib.Path.replace",
  "category": "標準ライブラリ",
  "syntax": "path.replace(target)",
  "description": "名前を変更する（移動先が存在しても置き換える）。",
  "example": "from pathlib import Path\nPath('a.txt').replace('b.txt')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.replace"
 },
 {
  "name": "pathlib.Path.resolve",
  "category": "標準ライブラリ",
  "syntax": "path.resolve(strict=False)",
  "description": "絶対パス化し、シンボリックリンクを解決する。",
  "example": "from pathlib import Path\nprint(Path('a.txt').resolve())",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.resolve"
 },
 {
  "name": "pathlib.Path.rglob",
  "category": "標準ライブラリ",
  "syntax": "path.rglob(pattern)",
  "description": "再帰的にパターンにマッチするパスを生成する。",
  "example": "from pathlib import Path\nprint(list(Path('.').rglob('*.txt')))",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.rglob"
 },
 {
  "name": "pathlib.Path.rmdir",
  "category": "標準ライブラリ",
  "syntax": "path.rmdir()",
  "description": "空のディレクトリを削除する。",
  "example": "from pathlib import Path\nPath('emptydir').rmdir()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.rmdir"
 },
 {
  "name": "pathlib.Path.samefile",
  "category": "標準ライブラリ",
  "syntax": "path.samefile(other_path)",
  "description": "同じファイルを指していれば True。",
  "example": "from pathlib import Path\nprint(Path('a.txt').samefile('a.txt'))",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.samefile"
 },
 {
  "name": "pathlib.Path.stat",
  "category": "標準ライブラリ",
  "syntax": "path.stat(follow_symlinks=True)",
  "description": "stat 結果を返す。",
  "example": "from pathlib import Path\nprint(Path('a.txt').stat().st_size)",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.stat"
 },
 {
  "name": "pathlib.Path.symlink_to",
  "category": "標準ライブラリ",
  "syntax": "path.symlink_to(target)",
  "description": "このパスを指すシンボリックリンクを作成する。",
  "example": "from pathlib import Path\nPath('link').symlink_to('a.txt')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.symlink_to"
 },
 {
  "name": "pathlib.Path.touch",
  "category": "標準ライブラリ",
  "syntax": "path.touch(mode=0o666, exist_ok=True)",
  "description": "ファイルを作成／タイムスタンプを更新する。",
  "example": "from pathlib import Path\nPath('a.txt').touch()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.touch"
 },
 {
  "name": "pathlib.Path.unlink",
  "category": "標準ライブラリ",
  "syntax": "path.unlink(missing_ok=False)",
  "description": "ファイルを削除する。",
  "example": "from pathlib import Path\nPath('a.txt').unlink()",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.unlink"
 },
 {
  "name": "pathlib.Path.walk",
  "category": "標準ライブラリ",
  "syntax": "path.walk(top_down=True, ...)",
  "description": "ディレクトリツリーを走査する（os.walk と同様）。",
  "example": "from pathlib import Path\nprint(list(Path('.').walk()))",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.walk"
 },
 {
  "name": "pathlib.Path.write_bytes",
  "category": "標準ライブラリ",
  "syntax": "path.write_bytes(data)",
  "description": "bytes をファイルに書き込む。",
  "example": "from pathlib import Path\nPath('a.bin').write_bytes(b'x')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.write_bytes"
 },
 {
  "name": "pathlib.Path.write_text",
  "category": "標準ライブラリ",
  "syntax": "path.write_text(data, encoding=None, errors=None)",
  "description": "文字列をファイルに書き込む。",
  "example": "from pathlib import Path\nPath('a.txt').write_text('hello')",
  "caution": "本アプリの高度モードでは未対応です（ファイルシステムへのアクセスが必要なため）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.Path.write_text"
 },
 {
  "name": "pathlib.PosixPath",
  "category": "標準ライブラリ",
  "syntax": "PosixPath('/a/b')",
  "description": "POSIX 具体パス。PurePosixPath のサブクラスで、このプラットフォームでの Path と同じ。",
  "example": "from pathlib import PosixPath\nprint(PosixPath('/a/b'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PosixPath"
 },
 {
  "name": "pathlib.PurePath",
  "category": "標準ライブラリ",
  "syntax": "PurePath('a', 'b')",
  "description": "純粋パスの基底クラス。生成するとプラットフォームに応じたサブクラス（ここでは PurePosixPath）になる。ファイルシステムにはアクセスしない。",
  "example": "from pathlib import PurePath\nprint(PurePath('a/b'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath"
 },
 {
  "name": "pathlib.PurePath.anchor",
  "category": "標準ライブラリ",
  "syntax": "path.anchor",
  "description": "ドライブとルートを合わせたアンカー部分。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b').anchor)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.anchor"
 },
 {
  "name": "pathlib.PurePath.as_posix",
  "category": "標準ライブラリ",
  "syntax": "path.as_posix()",
  "description": "区切りを / にした文字列を返す。",
  "example": "from pathlib import PureWindowsPath\nprint(PureWindowsPath('C:/a/b').as_posix())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.as_posix"
 },
 {
  "name": "pathlib.PurePath.drive",
  "category": "標準ライブラリ",
  "syntax": "path.drive",
  "description": "ドライブ名（Windows のドライブ文字や UNC 共有名）。POSIX では空文字列。",
  "example": "from pathlib import PureWindowsPath\nprint(PureWindowsPath('C:/a/b').drive)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.drive"
 },
 {
  "name": "pathlib.PurePath.full_match",
  "category": "標準ライブラリ",
  "syntax": "path.full_match(pattern)",
  "description": "パス全体を glob パターンと照合する（3.13 追加）。** はパス区切りをまたぐ。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('a/b.py').full_match('a/*.py'))",
  "caution": "大文字小文字の区別は flavor に従う（POSIX は区別する、Windows はしない）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.full_match"
 },
 {
  "name": "pathlib.PurePath.is_absolute",
  "category": "標準ライブラリ",
  "syntax": "path.is_absolute()",
  "description": "絶対パス（ルートと、Windows ではドライブも）を持てば True。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b').is_absolute())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.is_absolute"
 },
 {
  "name": "pathlib.PurePath.is_relative_to",
  "category": "標準ライブラリ",
  "syntax": "path.is_relative_to(other)",
  "description": "このパスが other の配下にあれば True。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b').is_relative_to('/a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.is_relative_to"
 },
 {
  "name": "pathlib.PurePath.joinpath",
  "category": "標準ライブラリ",
  "syntax": "path.joinpath(*others)",
  "description": "パス要素を結合する。/ 演算子と同じ。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a').joinpath('b', 'c'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.joinpath"
 },
 {
  "name": "pathlib.PurePath.match",
  "category": "標準ライブラリ",
  "syntax": "path.match(pattern)",
  "description": "右寄せで glob パターンと照合する。パターンが要素より多ければアンカー付きで全体照合になる。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('a/b.py').match('*.py'))",
  "caution": "大文字小文字の区別は flavor に従う（POSIX は区別する、Windows はしない）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.match"
 },
 {
  "name": "pathlib.PurePath.name",
  "category": "標準ライブラリ",
  "syntax": "path.name",
  "description": "最終要素の名前。空のパスでは空文字列。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b/c.txt').name)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.name"
 },
 {
  "name": "pathlib.PurePath.parent",
  "category": "標準ライブラリ",
  "syntax": "path.parent",
  "description": "1 つ上のパス。ルートや単独要素では自分自身。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b/c.txt').parent)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.parent"
 },
 {
  "name": "pathlib.PurePath.parents",
  "category": "標準ライブラリ",
  "syntax": "path.parents",
  "description": "上位パス群へのシーケンスアクセス（parents[0] が直上の親）。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b').parents[0])",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.parents"
 },
 {
  "name": "pathlib.PurePath.parser",
  "category": "標準ライブラリ",
  "syntax": "path.parser",
  "description": "パス文字列の解析に使う os.path モジュール相当（posixpath / ntpath）。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('a').parser)",
  "caution": "モジュールオブジェクト自体は他群の担当範囲のため、本群では未検証（値の同一性は確定しない）。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.parser"
 },
 {
  "name": "pathlib.PurePath.parts",
  "category": "標準ライブラリ",
  "syntax": "path.parts",
  "description": "パス要素のタプル。アンカーがあれば先頭要素になる。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b').parts)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.parts"
 },
 {
  "name": "pathlib.PurePath.relative_to",
  "category": "標準ライブラリ",
  "syntax": "path.relative_to(other, *, walk_up=False)",
  "description": "other からの相対パスを返す。相対化できない場合は ValueError。walk_up=True では .. を使った相対化を許可する（3.12 追加）。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b/c').relative_to('/a'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.relative_to"
 },
 {
  "name": "pathlib.PurePath.root",
  "category": "標準ライブラリ",
  "syntax": "path.root",
  "description": "ルート部分（POSIX では /、Windows では \\ など）。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b').root)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.root"
 },
 {
  "name": "pathlib.PurePath.stem",
  "category": "標準ライブラリ",
  "syntax": "path.stem",
  "description": "最終要素から最後のサフィックスを取り除いたもの。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b/c.txt').stem)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.stem"
 },
 {
  "name": "pathlib.PurePath.suffix",
  "category": "標準ライブラリ",
  "syntax": "path.suffix",
  "description": "最終要素の最後のサフィックス（ドット含む）。無ければ空文字列。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b/c.txt').suffix)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.suffix"
 },
 {
  "name": "pathlib.PurePath.suffixes",
  "category": "標準ライブラリ",
  "syntax": "path.suffixes",
  "description": "最終要素の全サフィックスのリスト。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b.tar.gz').suffixes)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.suffixes"
 },
 {
  "name": "pathlib.PurePath.with_name",
  "category": "標準ライブラリ",
  "syntax": "path.with_name(name)",
  "description": "名前（最終要素）だけを置き換えたパスを返す。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b.txt').with_name('x.py'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.with_name"
 },
 {
  "name": "pathlib.PurePath.with_segments",
  "category": "標準ライブラリ",
  "syntax": "path.with_segments(*pathsegments)",
  "description": "同じ型のパスを新しい要素から作り直す（サブクラスの生成に使う）。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b').with_segments('x', 'y'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.with_segments"
 },
 {
  "name": "pathlib.PurePath.with_stem",
  "category": "標準ライブラリ",
  "syntax": "path.with_stem(stem)",
  "description": "幹（stem）だけを置き換えたパスを返す（3.9 追加）。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b.txt').with_stem('z'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.with_stem"
 },
 {
  "name": "pathlib.PurePath.with_suffix",
  "category": "標準ライブラリ",
  "syntax": "path.with_suffix(suffix)",
  "description": "サフィックスを置き換えたパスを返す。空文字列で除去。ドット1つだけのサフィックスも指定できる。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/a/b.txt').with_suffix('.md'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePath.with_suffix"
 },
 {
  "name": "pathlib.PurePosixPath",
  "category": "標準ライブラリ",
  "syntax": "PurePosixPath('/a/b')",
  "description": "POSIX 風の純粋パス（区切りは /、大文字小文字を区別）。",
  "example": "from pathlib import PurePosixPath\nprint(PurePosixPath('/usr/bin'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PurePosixPath"
 },
 {
  "name": "pathlib.PureWindowsPath",
  "category": "標準ライブラリ",
  "syntax": "PureWindowsPath('C:/a/b')",
  "description": "Windows 風の純粋パス（ドライブ・UNC・大文字小文字を区別しない照合）。実行環境が POSIX でも生成できる。",
  "example": "from pathlib import PureWindowsPath\nprint(PureWindowsPath('C:/a/b'))",
  "caution": "文字列表記では区切りが \\ になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.PureWindowsPath"
 },
 {
  "name": "pathlib.UnsupportedOperation",
  "category": "標準ライブラリ",
  "syntax": "pathlib.UnsupportedOperation",
  "description": "このプラットフォームでサポートされない操作を行ったときに送出される例外（NotImplementedError のサブクラス）。",
  "example": "from pathlib import WindowsPath, UnsupportedOperation\ntry:\n    WindowsPath('C:/a')\nexcept UnsupportedOperation:\n    print('UnsupportedOperation')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.UnsupportedOperation"
 },
 {
  "name": "pathlib.WindowsPath",
  "category": "標準ライブラリ",
  "syntax": "WindowsPath('C:/a')",
  "description": "Windows 具体パス。POSIX 環境で生成すると UnsupportedOperation が送出される（CPython の POSIX での動作そのもの）。",
  "example": "from pathlib import WindowsPath, UnsupportedOperation\ntry:\n    WindowsPath('C:/a')\nexcept UnsupportedOperation:\n    print('cannot instantiate')",
  "caution": "本アプリの実行環境は POSIX 相当のため、生成は常に UnsupportedOperation になる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/pathlib.html#pathlib.WindowsPath"
 },
];
