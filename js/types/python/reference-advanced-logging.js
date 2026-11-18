/* 高度モード B7 G12：logging のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "logging.BufferingFormatter",
  "category": "標準ライブラリ",
  "syntax": "logging.BufferingFormatter(...)",
  "description": "BufferingFormatter は logging のクラス。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.BufferingFormatter"
 },
 {
  "name": "logging.BufferingFormatter.format",
  "category": "標準ライブラリ",
  "syntax": "logging.BufferingFormatter.format(...)",
  "description": "BufferingFormatter.format は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.BufferingFormatter.format"
 },
 {
  "name": "logging.BufferingFormatter.formatFooter",
  "category": "標準ライブラリ",
  "syntax": "logging.BufferingFormatter.formatFooter(...)",
  "description": "BufferingFormatter.formatFooter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.BufferingFormatter.formatFooter"
 },
 {
  "name": "logging.BufferingFormatter.formatHeader",
  "category": "標準ライブラリ",
  "syntax": "logging.BufferingFormatter.formatHeader(...)",
  "description": "BufferingFormatter.formatHeader は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.BufferingFormatter.formatHeader"
 },
 {
  "name": "logging.CRITICAL",
  "category": "標準ライブラリ",
  "syntax": "logging.CRITICAL",
  "description": "CRITICAL は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.CRITICAL"
 },
 {
  "name": "logging.DEBUG",
  "category": "標準ライブラリ",
  "syntax": "logging.DEBUG",
  "description": "DEBUG は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.DEBUG"
 },
 {
  "name": "logging.ERROR",
  "category": "標準ライブラリ",
  "syntax": "logging.ERROR",
  "description": "ERROR は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.ERROR"
 },
 {
  "name": "logging.FileHandler",
  "category": "標準ライブラリ",
  "syntax": "logging.FileHandler(...)",
  "description": "FileHandler は logging のクラス。",
  "example": "import logging\n# logging.FileHandler の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実ファイルやネットワークへの出力前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.FileHandler"
 },
 {
  "name": "logging.FileHandler.close",
  "category": "標準ライブラリ",
  "syntax": "logging.FileHandler.close(...)",
  "description": "FileHandler.close は logging のメソッド。",
  "example": "import logging\n# logging.FileHandler.close の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実ファイルやネットワークへの出力前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.FileHandler.close"
 },
 {
  "name": "logging.FileHandler.emit",
  "category": "標準ライブラリ",
  "syntax": "logging.FileHandler.emit(...)",
  "description": "FileHandler.emit は logging のメソッド。",
  "example": "import logging\n# logging.FileHandler.emit の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実ファイルやネットワークへの出力前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.FileHandler.emit"
 },
 {
  "name": "logging.Filter",
  "category": "標準ライブラリ",
  "syntax": "logging.Filter(...)",
  "description": "Filter は logging のクラス。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Filter"
 },
 {
  "name": "logging.Filter.filter",
  "category": "標準ライブラリ",
  "syntax": "logging.Filter.filter(...)",
  "description": "Filter.filter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Filter.filter"
 },
 {
  "name": "logging.Formatter",
  "category": "標準ライブラリ",
  "syntax": "logging.Formatter(...)",
  "description": "LogRecord を書式文字列で整形する。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Formatter"
 },
 {
  "name": "logging.Formatter.format",
  "category": "標準ライブラリ",
  "syntax": "logging.Formatter.format(...)",
  "description": "Formatter.format は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Formatter.format"
 },
 {
  "name": "logging.Formatter.formatException",
  "category": "標準ライブラリ",
  "syntax": "logging.Formatter.formatException(...)",
  "description": "Formatter.formatException は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Formatter.formatException"
 },
 {
  "name": "logging.Formatter.formatStack",
  "category": "標準ライブラリ",
  "syntax": "logging.Formatter.formatStack(...)",
  "description": "Formatter.formatStack は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Formatter.formatStack"
 },
 {
  "name": "logging.Formatter.formatTime",
  "category": "標準ライブラリ",
  "syntax": "logging.Formatter.formatTime(...)",
  "description": "Formatter.formatTime は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Formatter.formatTime"
 },
 {
  "name": "logging.Handler",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler(...)",
  "description": "Handler は logging のクラス。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler"
 },
 {
  "name": "logging.Handler.__init__",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.__init__(...)",
  "description": "Handler.__init__ は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.__init__"
 },
 {
  "name": "logging.Handler.acquire",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.acquire(...)",
  "description": "Handler.acquire は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.acquire"
 },
 {
  "name": "logging.Handler.addFilter",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.addFilter(...)",
  "description": "Handler.addFilter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.addFilter"
 },
 {
  "name": "logging.Handler.close",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.close(...)",
  "description": "Handler.close は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.close"
 },
 {
  "name": "logging.Handler.createLock",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.createLock(...)",
  "description": "Handler.createLock は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.createLock"
 },
 {
  "name": "logging.Handler.emit",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.emit(...)",
  "description": "Handler.emit は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.emit"
 },
 {
  "name": "logging.Handler.filter",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.filter(...)",
  "description": "Handler.filter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.filter"
 },
 {
  "name": "logging.Handler.flush",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.flush(...)",
  "description": "Handler.flush は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.flush"
 },
 {
  "name": "logging.Handler.format",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.format(...)",
  "description": "Handler.format は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.format"
 },
 {
  "name": "logging.Handler.handle",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.handle(...)",
  "description": "Handler.handle は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.handle"
 },
 {
  "name": "logging.Handler.handleError",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.handleError(...)",
  "description": "Handler.handleError は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.handleError"
 },
 {
  "name": "logging.Handler.release",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.release(...)",
  "description": "Handler.release は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.release"
 },
 {
  "name": "logging.Handler.removeFilter",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.removeFilter(...)",
  "description": "Handler.removeFilter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.removeFilter"
 },
 {
  "name": "logging.Handler.setFormatter",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.setFormatter(...)",
  "description": "Handler.setFormatter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.setFormatter"
 },
 {
  "name": "logging.Handler.setLevel",
  "category": "標準ライブラリ",
  "syntax": "logging.Handler.setLevel(...)",
  "description": "Handler.setLevel は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Handler.setLevel"
 },
 {
  "name": "logging.INFO",
  "category": "標準ライブラリ",
  "syntax": "logging.INFO",
  "description": "INFO は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.INFO"
 },
 {
  "name": "logging.LogRecord",
  "category": "標準ライブラリ",
  "syntax": "logging.LogRecord(...)",
  "description": "1件のログイベントの情報を保持する。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.LogRecord"
 },
 {
  "name": "logging.LogRecord.getMessage",
  "category": "標準ライブラリ",
  "syntax": "logging.LogRecord.getMessage(...)",
  "description": "LogRecord.getMessage は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.LogRecord.getMessage"
 },
 {
  "name": "logging.Logger",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger(...)",
  "description": "Logger は logging のクラス。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger"
 },
 {
  "name": "logging.Logger.addFilter",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.addFilter(...)",
  "description": "Logger.addFilter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.addFilter"
 },
 {
  "name": "logging.Logger.addHandler",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.addHandler(...)",
  "description": "Logger.addHandler は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.addHandler"
 },
 {
  "name": "logging.Logger.critical",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.critical(...)",
  "description": "Logger.critical は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.critical"
 },
 {
  "name": "logging.Logger.debug",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.debug(...)",
  "description": "Logger.debug は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.debug"
 },
 {
  "name": "logging.Logger.disabled",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.disabled",
  "description": "Logger.disabled は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.disabled"
 },
 {
  "name": "logging.Logger.error",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.error(...)",
  "description": "Logger.error は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.error"
 },
 {
  "name": "logging.Logger.exception",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.exception(...)",
  "description": "Logger.exception は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.exception"
 },
 {
  "name": "logging.Logger.filter",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.filter(...)",
  "description": "Logger.filter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.filter"
 },
 {
  "name": "logging.Logger.findCaller",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.findCaller(...)",
  "description": "Logger.findCaller は logging のメソッド。",
  "example": "import logging\n# logging.Logger.findCaller の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.findCaller"
 },
 {
  "name": "logging.Logger.getChild",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.getChild(...)",
  "description": "Logger.getChild は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.getChild"
 },
 {
  "name": "logging.Logger.getChildren",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.getChildren(...)",
  "description": "Logger.getChildren は logging のメソッド。",
  "example": "import logging\n# logging.Logger.getChildren の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.getChildren"
 },
 {
  "name": "logging.Logger.getEffectiveLevel",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.getEffectiveLevel(...)",
  "description": "Logger.getEffectiveLevel は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.getEffectiveLevel"
 },
 {
  "name": "logging.Logger.handle",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.handle(...)",
  "description": "Logger.handle は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.handle"
 },
 {
  "name": "logging.Logger.handlers",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.handlers",
  "description": "Logger.handlers は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.handlers"
 },
 {
  "name": "logging.Logger.hasHandlers",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.hasHandlers(...)",
  "description": "Logger.hasHandlers は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.hasHandlers"
 },
 {
  "name": "logging.Logger.info",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.info(...)",
  "description": "Logger.info は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.info"
 },
 {
  "name": "logging.Logger.isEnabledFor",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.isEnabledFor(...)",
  "description": "Logger.isEnabledFor は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.isEnabledFor"
 },
 {
  "name": "logging.Logger.level",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.level",
  "description": "Logger.level は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.level"
 },
 {
  "name": "logging.Logger.log",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.log(...)",
  "description": "Logger.log は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.log"
 },
 {
  "name": "logging.Logger.makeRecord",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.makeRecord(...)",
  "description": "Logger.makeRecord は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.makeRecord"
 },
 {
  "name": "logging.Logger.name",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.name",
  "description": "Logger.name は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.name"
 },
 {
  "name": "logging.Logger.parent",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.parent",
  "description": "Logger.parent は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.parent"
 },
 {
  "name": "logging.Logger.propagate",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.propagate",
  "description": "Logger.propagate は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.propagate"
 },
 {
  "name": "logging.Logger.removeFilter",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.removeFilter(...)",
  "description": "Logger.removeFilter は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.removeFilter"
 },
 {
  "name": "logging.Logger.removeHandler",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.removeHandler(...)",
  "description": "Logger.removeHandler は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.removeHandler"
 },
 {
  "name": "logging.Logger.setLevel",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.setLevel(...)",
  "description": "Logger.setLevel は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.setLevel"
 },
 {
  "name": "logging.Logger.warning",
  "category": "標準ライブラリ",
  "syntax": "logging.Logger.warning(...)",
  "description": "Logger.warning は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.Logger.warning"
 },
 {
  "name": "logging.LoggerAdapter",
  "category": "標準ライブラリ",
  "syntax": "logging.LoggerAdapter(...)",
  "description": "LoggerAdapter は logging のクラス。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.LoggerAdapter"
 },
 {
  "name": "logging.LoggerAdapter._log",
  "category": "標準ライブラリ",
  "syntax": "logging.LoggerAdapter._log",
  "description": "LoggerAdapter._log は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.LoggerAdapter._log"
 },
 {
  "name": "logging.LoggerAdapter.manager",
  "category": "標準ライブラリ",
  "syntax": "logging.LoggerAdapter.manager",
  "description": "LoggerAdapter.manager は logging の属性。",
  "example": "import logging\n# logging.LoggerAdapter.manager の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.LoggerAdapter.manager"
 },
 {
  "name": "logging.LoggerAdapter.process",
  "category": "標準ライブラリ",
  "syntax": "logging.LoggerAdapter.process(...)",
  "description": "LoggerAdapter.process は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.LoggerAdapter.process"
 },
 {
  "name": "logging.NOTSET",
  "category": "標準ライブラリ",
  "syntax": "logging.NOTSET",
  "description": "NOTSET は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.NOTSET"
 },
 {
  "name": "logging.NullHandler",
  "category": "標準ライブラリ",
  "syntax": "logging.NullHandler(...)",
  "description": "NullHandler は logging のクラス。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.NullHandler"
 },
 {
  "name": "logging.NullHandler.createLock",
  "category": "標準ライブラリ",
  "syntax": "logging.NullHandler.createLock(...)",
  "description": "NullHandler.createLock は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.NullHandler.createLock"
 },
 {
  "name": "logging.NullHandler.emit",
  "category": "標準ライブラリ",
  "syntax": "logging.NullHandler.emit(...)",
  "description": "NullHandler.emit は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.NullHandler.emit"
 },
 {
  "name": "logging.NullHandler.handle",
  "category": "標準ライブラリ",
  "syntax": "logging.NullHandler.handle(...)",
  "description": "NullHandler.handle は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.NullHandler.handle"
 },
 {
  "name": "logging.StreamHandler",
  "category": "標準ライブラリ",
  "syntax": "logging.StreamHandler(...)",
  "description": "StreamHandler は logging のクラス。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.StreamHandler"
 },
 {
  "name": "logging.StreamHandler.emit",
  "category": "標準ライブラリ",
  "syntax": "logging.StreamHandler.emit(...)",
  "description": "StreamHandler.emit は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.StreamHandler.emit"
 },
 {
  "name": "logging.StreamHandler.flush",
  "category": "標準ライブラリ",
  "syntax": "logging.StreamHandler.flush(...)",
  "description": "StreamHandler.flush は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.StreamHandler.flush"
 },
 {
  "name": "logging.StreamHandler.setStream",
  "category": "標準ライブラリ",
  "syntax": "logging.StreamHandler.setStream(...)",
  "description": "StreamHandler.setStream は logging のメソッド。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.StreamHandler.setStream"
 },
 {
  "name": "logging.StreamHandler.terminator",
  "category": "標準ライブラリ",
  "syntax": "logging.StreamHandler.terminator",
  "description": "StreamHandler.terminator は logging の属性。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.handlers.html#logging.StreamHandler.terminator"
 },
 {
  "name": "logging.WARNING",
  "category": "標準ライブラリ",
  "syntax": "logging.WARNING",
  "description": "WARNING は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.WARNING"
 },
 {
  "name": "logging.addLevelName",
  "category": "標準ライブラリ",
  "syntax": "logging.addLevelName(...)",
  "description": "addLevelName は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.addLevelName"
 },
 {
  "name": "logging.basicConfig",
  "category": "標準ライブラリ",
  "syntax": "logging.basicConfig(...)",
  "description": "basicConfig は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.basicConfig"
 },
 {
  "name": "logging.captureWarnings",
  "category": "標準ライブラリ",
  "syntax": "logging.captureWarnings(...)",
  "description": "captureWarnings は logging の関数。",
  "example": "import logging\n# logging.captureWarnings の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.captureWarnings"
 },
 {
  "name": "logging.critical",
  "category": "標準ライブラリ",
  "syntax": "logging.critical(...)",
  "description": "critical は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.critical"
 },
 {
  "name": "logging.debug",
  "category": "標準ライブラリ",
  "syntax": "logging.debug(...)",
  "description": "debug は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.debug"
 },
 {
  "name": "logging.disable",
  "category": "標準ライブラリ",
  "syntax": "logging.disable(...)",
  "description": "disable は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.disable"
 },
 {
  "name": "logging.error",
  "category": "標準ライブラリ",
  "syntax": "logging.error(...)",
  "description": "error は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.error"
 },
 {
  "name": "logging.exception",
  "category": "標準ライブラリ",
  "syntax": "logging.exception(...)",
  "description": "exception は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.exception"
 },
 {
  "name": "logging.getHandlerByName",
  "category": "標準ライブラリ",
  "syntax": "logging.getHandlerByName(...)",
  "description": "getHandlerByName は logging の関数。",
  "example": "import logging\n# logging.getHandlerByName の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.getHandlerByName"
 },
 {
  "name": "logging.getHandlerNames",
  "category": "標準ライブラリ",
  "syntax": "logging.getHandlerNames(...)",
  "description": "getHandlerNames は logging の関数。",
  "example": "import logging\n# logging.getHandlerNames の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.getHandlerNames"
 },
 {
  "name": "logging.getLevelName",
  "category": "標準ライブラリ",
  "syntax": "logging.getLevelName(...)",
  "description": "getLevelName は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.getLevelName"
 },
 {
  "name": "logging.getLevelNamesMapping",
  "category": "標準ライブラリ",
  "syntax": "logging.getLevelNamesMapping(...)",
  "description": "getLevelNamesMapping は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.getLevelNamesMapping"
 },
 {
  "name": "logging.getLogRecordFactory",
  "category": "標準ライブラリ",
  "syntax": "logging.getLogRecordFactory(...)",
  "description": "getLogRecordFactory は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.getLogRecordFactory"
 },
 {
  "name": "logging.getLogger",
  "category": "標準ライブラリ",
  "syntax": "logging.getLogger(...)",
  "description": "名前付き Logger を返す（同名は同一オブジェクト）。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.getLogger"
 },
 {
  "name": "logging.getLoggerClass",
  "category": "標準ライブラリ",
  "syntax": "logging.getLoggerClass(...)",
  "description": "getLoggerClass は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.getLoggerClass"
 },
 {
  "name": "logging.info",
  "category": "標準ライブラリ",
  "syntax": "logging.info(...)",
  "description": "info は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.info"
 },
 {
  "name": "logging.lastResort",
  "category": "標準ライブラリ",
  "syntax": "logging.lastResort",
  "description": "lastResort は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.lastResort"
 },
 {
  "name": "logging.log",
  "category": "標準ライブラリ",
  "syntax": "logging.log(...)",
  "description": "log は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.log"
 },
 {
  "name": "logging.makeLogRecord",
  "category": "標準ライブラリ",
  "syntax": "logging.makeLogRecord(...)",
  "description": "makeLogRecord は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.makeLogRecord"
 },
 {
  "name": "logging.raiseExceptions",
  "category": "標準ライブラリ",
  "syntax": "logging.raiseExceptions",
  "description": "raiseExceptions は logging のデータ。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.raiseExceptions"
 },
 {
  "name": "logging.setLogRecordFactory",
  "category": "標準ライブラリ",
  "syntax": "logging.setLogRecordFactory(...)",
  "description": "setLogRecordFactory は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.setLogRecordFactory"
 },
 {
  "name": "logging.setLoggerClass",
  "category": "標準ライブラリ",
  "syntax": "logging.setLoggerClass(...)",
  "description": "setLoggerClass は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.setLoggerClass"
 },
 {
  "name": "logging.shutdown",
  "category": "標準ライブラリ",
  "syntax": "logging.shutdown(...)",
  "description": "shutdown は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.shutdown"
 },
 {
  "name": "logging.warning",
  "category": "標準ライブラリ",
  "syntax": "logging.warning(...)",
  "description": "warning は logging の関数。",
  "example": "import logging\nf = logging.Formatter('%(levelname)s:%(message)s')\nr = logging.LogRecord('n', logging.INFO, 'x.py', 1, 'hello', (), None)\nprint(f.format(r))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/logging.html#logging.warning"
 }
];
