/* 高度モード B7 G7: hmac のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "hmac.HMAC",
  "category": "HMAC",
  "syntax": "class HMAC(key, msg=None, digestmod=None)",
  "description": "HMAC を逐次計算するクラス。.name は 'hmac-<アルゴリズム名>' 形式。",
  "example": "import hmac\nimport codecs\nh = hmac.HMAC(codecs.encode('key', 'utf-8')[0], digestmod='sha256')\nprint(h.name)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "クラス"
 },
 {
  "name": "hmac.HMAC.block_size",
  "category": "HMAC",
  "syntax": "HMAC.block_size",
  "description": "内部ブロックのバイト数。",
  "example": "import hmac\nimport codecs\nprint(hmac.new(codecs.encode('k', 'utf-8')[0], digestmod='sha256').block_size)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "int"
 },
 {
  "name": "hmac.HMAC.copy",
  "category": "HMAC",
  "syntax": "HMAC.copy()",
  "description": "現在の状態の複製を返す。",
  "example": "import hmac\nimport codecs\nh = hmac.new(codecs.encode('k', 'utf-8')[0], digestmod='md5')\nprint(h.copy().hexdigest() == h.hexdigest())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "HMAC オブジェクト"
 },
 {
  "name": "hmac.HMAC.digest",
  "category": "HMAC",
  "syntax": "HMAC.digest()",
  "description": "現在の HMAC 値を bytes で返す。",
  "example": "import hmac\nimport codecs\nprint(hmac.new(codecs.encode('k', 'utf-8')[0], digestmod='md5').digest())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "bytes"
 },
 {
  "name": "hmac.HMAC.digest_size",
  "category": "HMAC",
  "syntax": "HMAC.digest_size",
  "description": "ダイジェストのバイト数。",
  "example": "import hmac\nimport codecs\nprint(hmac.new(codecs.encode('k', 'utf-8')[0], digestmod='sha256').digest_size)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "int"
 },
 {
  "name": "hmac.HMAC.hexdigest",
  "category": "HMAC",
  "syntax": "HMAC.hexdigest()",
  "description": "現在の HMAC 値を16進文字列で返す。",
  "example": "import hmac\nimport codecs\nprint(hmac.new(codecs.encode('k', 'utf-8')[0], digestmod='md5').hexdigest())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "str"
 },
 {
  "name": "hmac.HMAC.name",
  "category": "HMAC",
  "syntax": "HMAC.name",
  "description": "'hmac-sha256' のような名前。",
  "example": "import hmac\nimport codecs\nprint(hmac.new(codecs.encode('k', 'utf-8')[0], digestmod='sha256').name)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "str"
 },
 {
  "name": "hmac.HMAC.update",
  "category": "HMAC",
  "syntax": "HMAC.update(msg)",
  "description": "認証対象のデータを追加する。",
  "example": "import hmac\nimport codecs\nh = hmac.new(codecs.encode('k', 'utf-8')[0], digestmod='sha256')\nh.update(codecs.encode('data', 'utf-8')[0])\nprint(h.hexdigest())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "None"
 },
 {
  "name": "hmac.compare_digest",
  "category": "HMAC",
  "syntax": "compare_digest(a, b)",
  "description": "タイミング攻撃に強い比較で2つの値を比べる。str 同士は ASCII のみ（非 ASCII は TypeError）、bytes 同士も可。",
  "example": "import hmac\nprint(hmac.compare_digest('abc', 'abc'), hmac.compare_digest('abc', 'abd'))",
  "caution": "長さが異なる場合の比較時間は長さに依存する（内容は漏れない）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "bool"
 },
 {
  "name": "hmac.digest",
  "category": "HMAC",
  "syntax": "digest(key, msg, digest)",
  "description": "HMAC を一括計算して bytes で返す高速関数。",
  "example": "import hmac\nimport codecs\nprint(hmac.digest(codecs.encode('key', 'utf-8')[0], codecs.encode('msg', 'utf-8')[0], 'sha256').hex())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "bytes"
 },
 {
  "name": "hmac.new",
  "category": "HMAC",
  "syntax": "new(key, msg=None, digestmod=None)",
  "description": "HMAC オブジェクトを作る。digestmod には hashlib のアルゴリズム名やコンストラクタを指定する。",
  "example": "import hmac\nimport codecs\nh = hmac.new(codecs.encode('key', 'utf-8')[0], codecs.encode('msg', 'utf-8')[0], 'sha256')\nprint(h.hexdigest())",
  "caution": "RFC 4231 のテストベクタで照合済み。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/hmac.html",
  "returns": "HMAC オブジェクト"
 }
];
