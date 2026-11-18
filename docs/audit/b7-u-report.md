# B7 Uチーム報告書（未対応モジュールのリファレンス収載）

## 担当範囲の確定

- 範囲の正本：`work/adv-b7-tools/uncovered-modules.json`（115 モジュール／5,177 件）。
- 除外（G13 担当、11 モジュール／261 件）：ipaddress（115）、pathlib（76）、
  pathlib.types（5）、filecmp（22）、glob（4）、copyreg（2）、secrets（9）、
  math.integer（6）、string.templatelib（12）、wsgiref.headers（3）、
  wsgiref.util（7）。
- **Uチーム担当：104 モジュール／4,916 件**。uncovered の全項目名が
  backlog.json（10,572 件）に存在し、module 欄と一致することを生成前に
  機械照合済み（欠落 0 件・不一致 0 件）。

## 生成結果（確定件数＝生成件数＝4,916 件、一致を確認）

生成器 `work/adv-b7-tools/gen-ref-unsupported.py` が backlog の行を正として
生成し、生成時に「理由表・ファイル分割が担当モジュールを漏れなく覆う」
「名前集合が担当範囲と一致する」ことを assert で検証する。再生成すると
バイト単位で同一出力になることを md5 で確認済み。

| ファイル | 件数 | 主なモジュール |
|---|---|---|
| reference-advanced-u-tkinter.js | 710 | tkinter |
| reference-advanced-u-tkinter-sub.js | 329 | tkinter.* 10件＋turtle |
| reference-advanced-u-os.js | 596 | os、os.path、posix、pwd、grp、fcntl |
| reference-advanced-u-asyncio.js | 512 | asyncio、concurrent.*、threading、_thread、select、selectors |
| reference-advanced-u-net.js | 389 | socket、ssl、socketserver |
| reference-advanced-u-net-services.js | 456 | http.*、urllib.*、ftplib、imaplib、poplib、smtplib、xmlrpc.*、wsgiref（G13分を除く） |
| reference-advanced-u-proc.js | 361 | subprocess、multiprocessing.*、signal、resource、syslog |
| reference-advanced-u-term.js | 478 | curses.*、readline、rlcompleter、tty、termios |
| reference-advanced-u-win.js | 397 | ctypes、ctypes.wintypes、msvcrt、winreg、winsound |
| reference-advanced-u-data-files.js | 389 | sqlite3、dbm.*、shelve、mailbox、mmap、tempfile、shutil、fileinput |
| reference-advanced-u-runtime.js | 299 | test.support.*、__future__、atexit、compileall、py_compile、pickletools、runpy、profiling.tracing、sys.monitoring、importlib.resources.abc、encodings.*、ensurepip、getpass、pty、venv、webbrowser、zipapp |
| 合計 | **4,916** | 104 モジュール |

- 区分別件数：個別実装 0／束ね値 0／例外対応付け 0（対応付け自体は行わない。
  例外ロール 118 件は caution に「例外クラスです。」を追記したのみ）／
  **未対応（リファレンス収載のみ）4,916**／未検証 0。
- role 内訳：method 1,727／function 1,059／data 1,091／attribute 392／
  class 529／exception 118。

## 文面規則の適用

- 項目形状は正規形のうち `{name, category, syntax, description, caution,
  status, source}` の7フィールドのみ（下記「留保」参照）。
  category は全件「標準ライブラリ」、status は全件 `unsupported`、
  source は backlog の doc（公式ドキュメント URL）をそのまま使用。
- description は定型文『<限定名> は <モジュール> の<種別>です。』のみで、
  項目ごとの機能説明は一切創作していない。種別は backlog の role を日本語化。
  test.support 一族（192 件）のみ指定どおり
  「CPython 自身のテスト支援用モジュールです。」を追記。
- syntax はシグネチャを捏造しない形：function／method は `<限定名>(...)`、
  それ以外は `<限定名>`。
- caution は「本アプリの高度モードでは未対応です。<理由>。」の形。
  理由表は生成器内の明示的辞書で **104 モジュール全件**を定義した。
  `__future__`（13 件）には「言語機能の有効化フラグであり、関数では
  ありません。」を追記。例外ロールには「例外クラスです。」を追記。

## 検証（tests/muse-adv-b7-u.test.js、5 件全合格）

1. ファイル別件数と総数（4,916）が期待件数と一致。
2. name の重複なし（全 4,916 件で一意）。
3. 全項目の正規形チェック：必須7フィールドのみ存在（正規形以外の
   フィールドなし）、全件 status==='unsupported'、category・caution 頭文・
   source の URL 形式・syntax の形を全件検査。
4. 特記チェック：例外 118 件の caution、__future__ のフラグ文、
   test.support の明記を全件検査。
5. backlog／uncovered との全件照合：名前集合の完全一致（漏れ・過剰なし）、
   source === backlog.doc、description が role から機械生成した期待文と
   全件一致、syntax が role と整合。

実行：`node --test tests/muse-adv-b7-u.test.js` → pass 5 / fail 0。

## 残存・留保

- **理由が一般文になったモジュール：完全な一般文（「実行環境に依存する
  ため」のみ）のモジュールは 0 件。** 全 104 モジュールにモジュールの性質に
  基づく理由を付けた。ただし次はファミリ単位の理由であり、項目単位の
  精密化はしていない：curses.ascii（curses の補助モジュールとしての理由）、
  dbm 系（ファイル上のデータベースとしての共通理由に固有ライブラリ名を
  添えた形）、test.support.*（8 モジュール共通の指定理由）。
- **example の省略（コーディネーター確認事項）**：契約
  （advanced-interface.md 第4章）は example を「必須」とするが、本チームの
  作業指示は「example は入れない（キーを省略する）か、公式ドキュメントの
  代表例をそのまま使う場合のみ。原則は省略」であり、指示に従って全件で
  キー自体を省略した。統合時にローダー／合成側が example 欠落を許容するか
  の確認をお願いしたい（群チーム規約 §3 は unsupported 項目の example を
  必須とはしていない）。
- source は作業指示どおり backlog の doc をそのまま使ったため、
  `https://docs.python.org/3/library/...` 形式（モジュールページ単位、
  アンカーなし）。math 見本の ja/3.15 アンカー形式への変換はしていない。
- 例外クラス（118 件）のエンジンエラー表示への対応付けは行っていない
  （候補側モジュールの群と監査工程の担当という指示どおり）。
- 共有ファイル（advanced-manifest.js、advanced-engine.js 等）には触れて
  いない。統合時に referenceParts へ本 11 ファイルの追加が必要。

## 作成ファイル

- 生成器：`work/adv-b7-tools/gen-ref-unsupported.py`（作業ツリー外の
  tools 置き場のため、本ツリーのコミットには含まれない）
- 生成物：`js/types/python/reference-advanced-u-*.js`（11 ファイル）
- テスト：`tests/muse-adv-b7-u.test.js`
- 本報告書：`docs/audit/b7-u-report.md`
