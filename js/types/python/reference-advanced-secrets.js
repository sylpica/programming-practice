/* 高度モード B7（G13）：secrets のリファレンス（全9件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "secrets.DEFAULT_ENTROPY",
  "category": "標準ライブラリ",
  "syntax": "secrets.DEFAULT_ENTROPY",
  "description": "token_bytes などが既定で使うエントロピー量（32 バイト）。",
  "example": "import secrets\nprint(secrets.DEFAULT_ENTROPY)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.DEFAULT_ENTROPY"
 },
 {
  "name": "secrets.SystemRandom",
  "category": "標準ライブラリ",
  "syntax": "secrets.SystemRandom()",
  "description": "OS の乱数源を使う乱数クラス（random.SystemRandom の別名）。生成値は再現・検証できない。",
  "example": "import secrets\nr = secrets.SystemRandom()\nprint(type(r).__name__)",
  "caution": "生成される値そのものは OS の乱数源に依存し再現・検証できないため未検証。引数エラーや空シーケンスなど、値に依らない決定論的な振る舞いだけを再現する。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.SystemRandom"
 },
 {
  "name": "secrets.choice",
  "category": "標準ライブラリ",
  "syntax": "secrets.choice(sequence)",
  "description": "シーケンスから要素を 1 つ無作為に選ぶ。空シーケンスでは IndexError。単一要素ならその要素が決定的に返る。",
  "example": "import secrets\nprint(secrets.choice(['a', 'b', 'c']))",
  "caution": "生成される値そのものは OS の乱数源に依存し再現・検証できないため未検証。引数エラーや空シーケンスなど、値に依らない決定論的な振る舞いだけを再現する。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.choice"
 },
 {
  "name": "secrets.compare_digest",
  "category": "標準ライブラリ",
  "syntax": "secrets.compare_digest(a, b)",
  "description": "タイミング攻撃に強い等価比較。str 同士（ASCII のみ）か bytes 同士で比較する。",
  "example": "import secrets\nprint(secrets.compare_digest('abc', 'abc'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.compare_digest"
 },
 {
  "name": "secrets.randbelow",
  "category": "標準ライブラリ",
  "syntax": "secrets.randbelow(n)",
  "description": "0 <= x < n のランダムな整数を返す。n <= 0 では ValueError。n == 1 では決定的に 0。",
  "example": "import secrets\nprint(secrets.randbelow(10))",
  "caution": "生成される値そのものは OS の乱数源に依存し再現・検証できないため未検証。引数エラーや空シーケンスなど、値に依らない決定論的な振る舞いだけを再現する。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.randbelow"
 },
 {
  "name": "secrets.randbits",
  "category": "標準ライブラリ",
  "syntax": "secrets.randbits(k)",
  "description": "k ビットのランダムな整数を返す。k == 0 では決定的に 0、負数では ValueError。",
  "example": "import secrets\nprint(secrets.randbits(8))",
  "caution": "生成される値そのものは OS の乱数源に依存し再現・検証できないため未検証。引数エラーや空シーケンスなど、値に依らない決定論的な振る舞いだけを再現する。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.randbits"
 },
 {
  "name": "secrets.token_bytes",
  "category": "標準ライブラリ",
  "syntax": "secrets.token_bytes(nbytes=None)",
  "description": "ランダムなバイト列を返す。nbytes=0 では空の bytes が決定的に返る。",
  "example": "import secrets\nprint(len(secrets.token_bytes(16)))",
  "caution": "生成される値そのものは OS の乱数源に依存し再現・検証できないため未検証。引数エラーや空シーケンスなど、値に依らない決定論的な振る舞いだけを再現する。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.token_bytes"
 },
 {
  "name": "secrets.token_hex",
  "category": "標準ライブラリ",
  "syntax": "secrets.token_hex(nbytes=None)",
  "description": "ランダムなバイト列を16進文字列で返す（長さは nbytes の2倍）。",
  "example": "import secrets\nprint(len(secrets.token_hex(16)))",
  "caution": "生成される値そのものは OS の乱数源に依存し再現・検証できないため未検証。引数エラーや空シーケンスなど、値に依らない決定論的な振る舞いだけを再現する。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.token_hex"
 },
 {
  "name": "secrets.token_urlsafe",
  "category": "標準ライブラリ",
  "syntax": "secrets.token_urlsafe(nbytes=None)",
  "description": "ランダムなバイト列を URL-safe な Base64 テキストで返す。",
  "example": "import secrets\nprint(len(secrets.token_urlsafe(16)))",
  "caution": "生成される値そのものは OS の乱数源に依存し再現・検証できないため未検証。引数エラーや空シーケンスなど、値に依らない決定論的な振る舞いだけを再現する。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/secrets.html#secrets.token_urlsafe"
 },
];
