/* 高度モード B7 G12：argparse のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "argparse.Action",
  "category": "標準ライブラリ",
  "syntax": "argparse.Action(...)",
  "description": "Action は argparse のクラス。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.Action"
 },
 {
  "name": "argparse.Action.__call__",
  "category": "標準ライブラリ",
  "syntax": "argparse.Action.__call__(...)",
  "description": "Action.__call__ は argparse のメソッド。",
  "example": "import argparse\n# argparse.Action.__call__ の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.Action.__call__"
 },
 {
  "name": "argparse.Action.format_usage",
  "category": "標準ライブラリ",
  "syntax": "argparse.Action.format_usage(...)",
  "description": "Action.format_usage は argparse のメソッド。",
  "example": "import argparse\n# argparse.Action.format_usage の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.Action.format_usage"
 },
 {
  "name": "argparse.ArgumentDefaultsHelpFormatter",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentDefaultsHelpFormatter(...)",
  "description": "ArgumentDefaultsHelpFormatter は argparse のクラス。",
  "example": "import argparse\n# argparse.ArgumentDefaultsHelpFormatter の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentDefaultsHelpFormatter"
 },
 {
  "name": "argparse.ArgumentError",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentError(msg)",
  "description": "ArgumentError は argparse の例外クラス。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentError"
 },
 {
  "name": "argparse.ArgumentParser",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser(...)",
  "description": "コマンドライン引数パーサ。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser"
 },
 {
  "name": "argparse.ArgumentParser.add_argument",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.add_argument(...)",
  "description": "ArgumentParser.add_argument は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.add_argument"
 },
 {
  "name": "argparse.ArgumentParser.add_argument_group",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.add_argument_group(...)",
  "description": "ArgumentParser.add_argument_group は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.add_argument_group"
 },
 {
  "name": "argparse.ArgumentParser.add_mutually_exclusive_group",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.add_mutually_exclusive_group(...)",
  "description": "ArgumentParser.add_mutually_exclusive_group は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.add_mutually_exclusive_group"
 },
 {
  "name": "argparse.ArgumentParser.add_subparsers",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.add_subparsers(...)",
  "description": "ArgumentParser.add_subparsers は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.add_subparsers"
 },
 {
  "name": "argparse.ArgumentParser.convert_arg_line_to_args",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.convert_arg_line_to_args(...)",
  "description": "ArgumentParser.convert_arg_line_to_args は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.convert_arg_line_to_args"
 },
 {
  "name": "argparse.ArgumentParser.error",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.error(...)",
  "description": "ArgumentParser.error は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.error"
 },
 {
  "name": "argparse.ArgumentParser.exit",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.exit(...)",
  "description": "ArgumentParser.exit は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.exit"
 },
 {
  "name": "argparse.ArgumentParser.format_help",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.format_help(...)",
  "description": "ArgumentParser.format_help は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.format_help"
 },
 {
  "name": "argparse.ArgumentParser.format_usage",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.format_usage(...)",
  "description": "ArgumentParser.format_usage は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.format_usage"
 },
 {
  "name": "argparse.ArgumentParser.get_default",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.get_default(...)",
  "description": "ArgumentParser.get_default は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.get_default"
 },
 {
  "name": "argparse.ArgumentParser.parse_args",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.parse_args(...)",
  "description": "ArgumentParser.parse_args は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.parse_args"
 },
 {
  "name": "argparse.ArgumentParser.parse_intermixed_args",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.parse_intermixed_args(...)",
  "description": "ArgumentParser.parse_intermixed_args は argparse のメソッド。",
  "example": "import argparse\n# argparse.ArgumentParser.parse_intermixed_args の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.parse_intermixed_args"
 },
 {
  "name": "argparse.ArgumentParser.parse_known_args",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.parse_known_args(...)",
  "description": "ArgumentParser.parse_known_args は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.parse_known_args"
 },
 {
  "name": "argparse.ArgumentParser.parse_known_intermixed_args",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.parse_known_intermixed_args(...)",
  "description": "ArgumentParser.parse_known_intermixed_args は argparse のメソッド。",
  "example": "import argparse\n# argparse.ArgumentParser.parse_known_intermixed_args の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.parse_known_intermixed_args"
 },
 {
  "name": "argparse.ArgumentParser.print_help",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.print_help(...)",
  "description": "ArgumentParser.print_help は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.print_help"
 },
 {
  "name": "argparse.ArgumentParser.print_usage",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.print_usage(...)",
  "description": "ArgumentParser.print_usage は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.print_usage"
 },
 {
  "name": "argparse.ArgumentParser.register",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.register(...)",
  "description": "ArgumentParser.register は argparse のメソッド。",
  "example": "import argparse\n# argparse.ArgumentParser.register の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.register"
 },
 {
  "name": "argparse.ArgumentParser.set_defaults",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentParser.set_defaults(...)",
  "description": "ArgumentParser.set_defaults は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentParser.set_defaults"
 },
 {
  "name": "argparse.ArgumentTypeError",
  "category": "標準ライブラリ",
  "syntax": "argparse.ArgumentTypeError(msg)",
  "description": "ArgumentTypeError は argparse の例外クラス。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.ArgumentTypeError"
 },
 {
  "name": "argparse.BooleanOptionalAction",
  "category": "標準ライブラリ",
  "syntax": "argparse.BooleanOptionalAction(...)",
  "description": "BooleanOptionalAction は argparse のクラス。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.BooleanOptionalAction"
 },
 {
  "name": "argparse.FileType",
  "category": "標準ライブラリ",
  "syntax": "argparse.FileType(...)",
  "description": "FileType は argparse のクラス。",
  "example": "import argparse\n# argparse.FileType の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実ファイルを開くため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.FileType"
 },
 {
  "name": "argparse.MetavarTypeHelpFormatter",
  "category": "標準ライブラリ",
  "syntax": "argparse.MetavarTypeHelpFormatter(...)",
  "description": "MetavarTypeHelpFormatter は argparse のクラス。",
  "example": "import argparse\n# argparse.MetavarTypeHelpFormatter の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.MetavarTypeHelpFormatter"
 },
 {
  "name": "argparse.Namespace",
  "category": "標準ライブラリ",
  "syntax": "argparse.Namespace(...)",
  "description": "解析結果を属性として保持する単純なクラス。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.Namespace"
 },
 {
  "name": "argparse.RawDescriptionHelpFormatter",
  "category": "標準ライブラリ",
  "syntax": "argparse.RawDescriptionHelpFormatter(...)",
  "description": "RawDescriptionHelpFormatter は argparse のクラス。",
  "example": "import argparse\n# argparse.RawDescriptionHelpFormatter の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.RawDescriptionHelpFormatter"
 },
 {
  "name": "argparse.RawTextHelpFormatter",
  "category": "標準ライブラリ",
  "syntax": "argparse.RawTextHelpFormatter(...)",
  "description": "RawTextHelpFormatter は argparse のクラス。",
  "example": "import argparse\n# argparse.RawTextHelpFormatter の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse.RawTextHelpFormatter"
 },
 {
  "name": "argparse._SubParsersAction.add_parser",
  "category": "標準ライブラリ",
  "syntax": "argparse._SubParsersAction.add_parser(...)",
  "description": "_SubParsersAction.add_parser は argparse のメソッド。",
  "example": "import argparse\np = argparse.ArgumentParser(prog='prog')\np.add_argument('--foo', type=int, default=3)\nprint(p.parse_args(['--foo', '5']).foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/argparse.html#argparse._SubParsersAction.add_parser"
 }
];
