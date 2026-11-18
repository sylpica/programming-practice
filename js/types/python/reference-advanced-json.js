/* 高度モード B7 G7: json のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "json.JSONDecodeError",
  "category": "JSON形式",
  "syntax": "JSONDecodeError(msg, doc, pos)",
  "description": "JSON の解析失敗を表す例外（ValueError のサブクラス）。loads/decode が不正な入力で送出する。str(exc) は「msg: line L column C (char P)」形式になる。",
  "example": "import json\ntry:\n    json.loads('{')\nexcept json.JSONDecodeError as e:\n    print('error')",
  "caution": "msg/doc/pos/lineno/colno 属性を持つ。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "例外クラス"
 },
 {
  "name": "json.JSONDecodeError.colno",
  "category": "JSON形式",
  "syntax": "JSONDecodeError.colno",
  "description": "エラー位置の列番号（1始まり）。pos から算出される。",
  "example": "import json\ntry:\n    json.loads('{bad')\nexcept json.JSONDecodeError as e:\n    print(e.colno)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "int"
 },
 {
  "name": "json.JSONDecodeError.doc",
  "category": "JSON形式",
  "syntax": "JSONDecodeError.doc",
  "description": "解析対象だった文字列全体。",
  "example": "import json\ntry:\n    json.loads('{bad')\nexcept json.JSONDecodeError as e:\n    print(e.doc)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "str"
 },
 {
  "name": "json.JSONDecodeError.lineno",
  "category": "JSON形式",
  "syntax": "JSONDecodeError.lineno",
  "description": "エラー位置の行番号（1始まり）。pos から算出される。",
  "example": "import json\ntry:\n    json.loads('{bad')\nexcept json.JSONDecodeError as e:\n    print(e.lineno)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "int"
 },
 {
  "name": "json.JSONDecodeError.msg",
  "category": "JSON形式",
  "syntax": "JSONDecodeError.msg",
  "description": "エラーメッセージ本体（位置情報を除いた文面）。",
  "example": "import json\ntry:\n    json.loads('{bad')\nexcept json.JSONDecodeError as e:\n    print(e.msg)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "str"
 },
 {
  "name": "json.JSONDecodeError.pos",
  "category": "JSON形式",
  "syntax": "JSONDecodeError.pos",
  "description": "エラー位置の文字インデックス（0始まり）。",
  "example": "import json\ntry:\n    json.loads('{bad')\nexcept json.JSONDecodeError as e:\n    print(e.pos)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "int"
 },
 {
  "name": "json.JSONDecoder",
  "category": "JSON形式",
  "syntax": "JSONDecoder(*, object_hook=None, parse_float=None, parse_int=None, parse_constant=None, strict=True)",
  "description": "JSON 文字列の解析を行うデコーダクラス。decode/raw_decode で loads と同じ変換ができる。",
  "example": "import json\nprint(json.JSONDecoder().decode('[1, 2]'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "JSONDecoder インスタンス"
 },
 {
  "name": "json.JSONDecoder.decode",
  "category": "JSON形式",
  "syntax": "decode(s, _w=None)",
  "description": "JSON 文字列をオブジェクトに変換する（loads 相当）。前後の空白は許容される。",
  "example": "import json\nprint(json.JSONDecoder().decode(' {\"a\": 1} '))",
  "caution": "末尾に余分な文字があると JSONDecodeError（Extra data）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "オブジェクト"
 },
 {
  "name": "json.JSONDecoder.raw_decode",
  "category": "JSON形式",
  "syntax": "raw_decode(s, idx=0)",
  "description": "idx の位置から JSON を1つ読み取り、(値, 読み終わった位置) を返す。",
  "example": "import json\nprint(json.JSONDecoder().raw_decode('[1] x', 0))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "tuple: (変換した値, 終了インデックス)"
 },
 {
  "name": "json.JSONEncoder",
  "category": "JSON形式",
  "syntax": "JSONEncoder(*, skipkeys=False, ensure_ascii=True, check_circular=True, allow_nan=True, sort_keys=False, indent=None, separators=None, default=None)",
  "description": "JSON への変換を行うエンコーダクラス。インスタンスの encode/iterencode で dumps と同じ変換ができる。default をサブクラスで上書きして独自型を扱うのが本来の使い方だが、この環境では直接インスタンスの範囲で動作する。",
  "example": "import json\nprint(json.JSONEncoder().encode({'a': 1}))",
  "caution": "サブクラス化による default の上書きはこの環境では再現できない。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "JSONEncoder インスタンス"
 },
 {
  "name": "json.JSONEncoder.default",
  "category": "JSON形式",
  "syntax": "default(o)",
  "description": "変換できないオブジェクトに対する既定の処理。基底クラスでは TypeError を送出する。",
  "example": "import json\njson.JSONEncoder().default(object())",
  "caution": "基底の default は常に TypeError。独自変換には dumps の default 引数を使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "変換結果（基底では送出のみ）"
 },
 {
  "name": "json.JSONEncoder.encode",
  "category": "JSON形式",
  "syntax": "encode(o)",
  "description": "オブジェクトを JSON 文字列に変換する（dumps 相当）。",
  "example": "import json\nprint(json.JSONEncoder(ensure_ascii=False).encode({'x': 'あ'}))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "str: JSON 文字列"
 },
 {
  "name": "json.JSONEncoder.iterencode",
  "category": "JSON形式",
  "syntax": "iterencode(o, _one_shot=False)",
  "description": "JSON 文字列の断片を順に生成するイテレータを返す。この環境では全体を1つの断片として返す。",
  "example": "import json\nprint(list(json.JSONEncoder().iterencode({'a': 1})))",
  "caution": "断片の分割単位は CPython と異なる（全体で1断片）。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "イテレータ（str の断片）"
 },
 {
  "name": "json.dump",
  "category": "JSON形式",
  "syntax": "dump(obj, fp, **kwargs)",
  "description": "オブジェクトを JSON 形式でファイルオブジェクト fp へ書き出す。",
  "example": "import json\njson.dump({'a': 1}, open('x.json', 'w'))",
  "caution": "ファイルオブジェクトを前提とするため、この環境では未対応（文字列で完結する dumps を使う）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "None"
 },
 {
  "name": "json.dumps",
  "category": "JSON形式",
  "syntax": "dumps(obj, *, ensure_ascii=True, indent=None, separators=None, sort_keys=False, default=None, allow_nan=True)",
  "description": "Python オブジェクトを JSON 文字列に変換する。ensure_ascii=False で非 ASCII 文字をそのまま出力し、indent で整形、sort_keys でキー順を整列する。default には変換できないオブジェクトを文字列化する関数を渡せる。",
  "example": "import json\nprint(json.dumps({'b': 1, 'a': [1, 2]}, sort_keys=True))",
  "caution": "NaN/Infinity は既定で JSON 仕様外の NaN/Infinity として出力される（allow_nan=False で ValueError）。辞書のキーは文字列・数値・真偽値・None のみ自動変換される。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "str: JSON 文字列"
 },
 {
  "name": "json.load",
  "category": "JSON形式",
  "syntax": "load(fp, **kwargs)",
  "description": "ファイルオブジェクト fp から JSON を読み込んでオブジェクトに変換する。",
  "example": "import json\njson.load(open('x.json'))",
  "caution": "ファイルオブジェクトを前提とするため、この環境では未対応（文字列で完結する loads を使う）。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "オブジェクト"
 },
 {
  "name": "json.loads",
  "category": "JSON形式",
  "syntax": "loads(s, *, parse_float=None, parse_int=None, parse_constant=None, object_hook=None, object_pairs_hook=None)",
  "description": "JSON 文字列を Python オブジェクトに変換する。parse_float/parse_int/parse_constant で数値や定数の変換方法を指定でき、object_hook で辞書生成を差し替えられる。",
  "example": "import json\nprint(json.loads('{\"a\": [1, 2.5]}'))",
  "caution": "不正な JSON は JSONDecodeError。重複したキーは後の値が勝つ。制御文字を含む文字列は strict 既定でエラーになる。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/json.html",
  "returns": "オブジェクト（dict/list/str/数値/bool/None）"
 }
];
