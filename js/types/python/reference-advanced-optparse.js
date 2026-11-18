/* 高度モード B7 G12：optparse のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "optparse.AmbiguousOptionError",
  "category": "標準ライブラリ",
  "syntax": "optparse.AmbiguousOptionError(msg)",
  "description": "AmbiguousOptionError は optparse の例外クラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.AmbiguousOptionError"
 },
 {
  "name": "optparse.BadOptionError",
  "category": "標準ライブラリ",
  "syntax": "optparse.BadOptionError(msg)",
  "description": "BadOptionError は optparse の例外クラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.BadOptionError"
 },
 {
  "name": "optparse.Option",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option(...)",
  "description": "Option は optparse のクラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option"
 },
 {
  "name": "optparse.Option.ACTIONS",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.ACTIONS",
  "description": "Option.ACTIONS は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.ACTIONS"
 },
 {
  "name": "optparse.Option.ALWAYS_TYPED_ACTIONS",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.ALWAYS_TYPED_ACTIONS",
  "description": "Option.ALWAYS_TYPED_ACTIONS は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.ALWAYS_TYPED_ACTIONS"
 },
 {
  "name": "optparse.Option.STORE_ACTIONS",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.STORE_ACTIONS",
  "description": "Option.STORE_ACTIONS は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.STORE_ACTIONS"
 },
 {
  "name": "optparse.Option.TYPED_ACTIONS",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.TYPED_ACTIONS",
  "description": "Option.TYPED_ACTIONS は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.TYPED_ACTIONS"
 },
 {
  "name": "optparse.Option.TYPES",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.TYPES",
  "description": "Option.TYPES は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.TYPES"
 },
 {
  "name": "optparse.Option.TYPE_CHECKER",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.TYPE_CHECKER",
  "description": "Option.TYPE_CHECKER は optparse の属性。",
  "example": "import optparse\n# optparse.Option.TYPE_CHECKER の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.TYPE_CHECKER"
 },
 {
  "name": "optparse.Option.action",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.action",
  "description": "Option.action は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.action"
 },
 {
  "name": "optparse.Option.callback",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.callback",
  "description": "Option.callback は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.callback"
 },
 {
  "name": "optparse.Option.callback_args",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.callback_args",
  "description": "Option.callback_args は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.callback_args"
 },
 {
  "name": "optparse.Option.callback_kwargs",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.callback_kwargs",
  "description": "Option.callback_kwargs は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.callback_kwargs"
 },
 {
  "name": "optparse.Option.choices",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.choices",
  "description": "Option.choices は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.choices"
 },
 {
  "name": "optparse.Option.const",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.const",
  "description": "Option.const は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.const"
 },
 {
  "name": "optparse.Option.default",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.default",
  "description": "Option.default は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.default"
 },
 {
  "name": "optparse.Option.dest",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.dest",
  "description": "Option.dest は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.dest"
 },
 {
  "name": "optparse.Option.help",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.help",
  "description": "Option.help は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.help"
 },
 {
  "name": "optparse.Option.metavar",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.metavar",
  "description": "Option.metavar は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.metavar"
 },
 {
  "name": "optparse.Option.nargs",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.nargs",
  "description": "Option.nargs は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.nargs"
 },
 {
  "name": "optparse.Option.type",
  "category": "標準ライブラリ",
  "syntax": "optparse.Option.type",
  "description": "Option.type は optparse の属性。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Option.type"
 },
 {
  "name": "optparse.OptionConflictError",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionConflictError(msg)",
  "description": "OptionConflictError は optparse の例外クラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionConflictError"
 },
 {
  "name": "optparse.OptionError",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionError(msg)",
  "description": "OptionError は optparse の例外クラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionError"
 },
 {
  "name": "optparse.OptionGroup",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionGroup(...)",
  "description": "OptionGroup は optparse のクラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionGroup"
 },
 {
  "name": "optparse.OptionParser",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser(...)",
  "description": "コマンドラインオプションパーサ（旧式）。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser"
 },
 {
  "name": "optparse.OptionParser.add_option",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.add_option(...)",
  "description": "OptionParser.add_option は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.add_option"
 },
 {
  "name": "optparse.OptionParser.disable_interspersed_args",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.disable_interspersed_args(...)",
  "description": "OptionParser.disable_interspersed_args は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.disable_interspersed_args"
 },
 {
  "name": "optparse.OptionParser.enable_interspersed_args",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.enable_interspersed_args(...)",
  "description": "OptionParser.enable_interspersed_args は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.enable_interspersed_args"
 },
 {
  "name": "optparse.OptionParser.get_option",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.get_option(...)",
  "description": "OptionParser.get_option は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.get_option"
 },
 {
  "name": "optparse.OptionParser.get_option_group",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.get_option_group(...)",
  "description": "OptionParser.get_option_group は optparse のメソッド。",
  "example": "import optparse\n# optparse.OptionParser.get_option_group の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.get_option_group"
 },
 {
  "name": "optparse.OptionParser.get_usage",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.get_usage(...)",
  "description": "OptionParser.get_usage は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.get_usage"
 },
 {
  "name": "optparse.OptionParser.get_version",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.get_version(...)",
  "description": "OptionParser.get_version は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.get_version"
 },
 {
  "name": "optparse.OptionParser.has_option",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.has_option(...)",
  "description": "OptionParser.has_option は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.has_option"
 },
 {
  "name": "optparse.OptionParser.parse_args",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.parse_args(...)",
  "description": "OptionParser.parse_args は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.parse_args"
 },
 {
  "name": "optparse.OptionParser.print_usage",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.print_usage(...)",
  "description": "OptionParser.print_usage は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.print_usage"
 },
 {
  "name": "optparse.OptionParser.print_version",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.print_version(...)",
  "description": "OptionParser.print_version は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.print_version"
 },
 {
  "name": "optparse.OptionParser.remove_option",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.remove_option(...)",
  "description": "OptionParser.remove_option は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.remove_option"
 },
 {
  "name": "optparse.OptionParser.set_defaults",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.set_defaults(...)",
  "description": "OptionParser.set_defaults は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.set_defaults"
 },
 {
  "name": "optparse.OptionParser.set_usage",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionParser.set_usage(...)",
  "description": "OptionParser.set_usage は optparse のメソッド。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionParser.set_usage"
 },
 {
  "name": "optparse.OptionValueError",
  "category": "標準ライブラリ",
  "syntax": "optparse.OptionValueError(msg)",
  "description": "OptionValueError は optparse の例外クラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.OptionValueError"
 },
 {
  "name": "optparse.Values",
  "category": "標準ライブラリ",
  "syntax": "optparse.Values(...)",
  "description": "Values は optparse のクラス。",
  "example": "import optparse\np = optparse.OptionParser()\np.add_option('--foo', type='int', default=3)\nvalues, args = p.parse_args(['--foo', '5'])\nprint(values.foo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/optparse.html#optparse.Values"
 }
];
