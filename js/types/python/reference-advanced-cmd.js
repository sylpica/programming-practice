/* 高度モード B7 G12：cmd のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "cmd.Cmd",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd(...)",
  "description": "Cmd は cmd のクラス。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd"
 },
 {
  "name": "cmd.Cmd.cmdloop",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.cmdloop(...)",
  "description": "Cmd.cmdloop は cmd のメソッド。",
  "example": "import cmd\n# cmd.Cmd.cmdloop の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。対話的な標準入出力ループのため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.cmdloop"
 },
 {
  "name": "cmd.Cmd.cmdqueue",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.cmdqueue",
  "description": "Cmd.cmdqueue は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.cmdqueue"
 },
 {
  "name": "cmd.Cmd.columnize",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.columnize(...)",
  "description": "Cmd.columnize は cmd のメソッド。",
  "example": "import cmd\n# cmd.Cmd.columnize の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.columnize"
 },
 {
  "name": "cmd.Cmd.completedefault",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.completedefault(...)",
  "description": "Cmd.completedefault は cmd のメソッド。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.completedefault"
 },
 {
  "name": "cmd.Cmd.default",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.default(...)",
  "description": "Cmd.default は cmd のメソッド。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.default"
 },
 {
  "name": "cmd.Cmd.do_help",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.do_help(...)",
  "description": "Cmd.do_help は cmd のメソッド。",
  "example": "import cmd\n# cmd.Cmd.do_help の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.do_help"
 },
 {
  "name": "cmd.Cmd.doc_header",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.doc_header",
  "description": "Cmd.doc_header は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.doc_header"
 },
 {
  "name": "cmd.Cmd.emptyline",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.emptyline(...)",
  "description": "Cmd.emptyline は cmd のメソッド。",
  "example": "import cmd\n# cmd.Cmd.emptyline の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.emptyline"
 },
 {
  "name": "cmd.Cmd.identchars",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.identchars",
  "description": "Cmd.identchars は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.identchars"
 },
 {
  "name": "cmd.Cmd.intro",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.intro",
  "description": "Cmd.intro は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.intro"
 },
 {
  "name": "cmd.Cmd.lastcmd",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.lastcmd",
  "description": "Cmd.lastcmd は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.lastcmd"
 },
 {
  "name": "cmd.Cmd.misc_header",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.misc_header",
  "description": "Cmd.misc_header は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.misc_header"
 },
 {
  "name": "cmd.Cmd.onecmd",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.onecmd(...)",
  "description": "Cmd.onecmd は cmd のメソッド。",
  "example": "import cmd\n# cmd.Cmd.onecmd の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.onecmd"
 },
 {
  "name": "cmd.Cmd.postcmd",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.postcmd(...)",
  "description": "Cmd.postcmd は cmd のメソッド。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.postcmd"
 },
 {
  "name": "cmd.Cmd.postloop",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.postloop(...)",
  "description": "Cmd.postloop は cmd のメソッド。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.postloop"
 },
 {
  "name": "cmd.Cmd.precmd",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.precmd(...)",
  "description": "Cmd.precmd は cmd のメソッド。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.precmd"
 },
 {
  "name": "cmd.Cmd.preloop",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.preloop(...)",
  "description": "Cmd.preloop は cmd のメソッド。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.preloop"
 },
 {
  "name": "cmd.Cmd.prompt",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.prompt",
  "description": "Cmd.prompt は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.prompt"
 },
 {
  "name": "cmd.Cmd.ruler",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.ruler",
  "description": "Cmd.ruler は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.ruler"
 },
 {
  "name": "cmd.Cmd.undoc_header",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.undoc_header",
  "description": "Cmd.undoc_header は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.undoc_header"
 },
 {
  "name": "cmd.Cmd.use_rawinput",
  "category": "標準ライブラリ",
  "syntax": "cmd.Cmd.use_rawinput",
  "description": "Cmd.use_rawinput は cmd の属性。",
  "example": "import cmd\nc = cmd.Cmd()\nprint(c.parseline('help foo'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/cmd.html#cmd.Cmd.use_rawinput"
 }
];
