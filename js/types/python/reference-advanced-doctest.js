/* 高度モード B7 G12：doctest のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "doctest.COMPARISON_FLAGS",
  "category": "標準ライブラリ",
  "syntax": "doctest.COMPARISON_FLAGS",
  "description": "COMPARISON_FLAGS は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.COMPARISON_FLAGS"
 },
 {
  "name": "doctest.DONT_ACCEPT_BLANKLINE",
  "category": "標準ライブラリ",
  "syntax": "doctest.DONT_ACCEPT_BLANKLINE",
  "description": "DONT_ACCEPT_BLANKLINE は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DONT_ACCEPT_BLANKLINE"
 },
 {
  "name": "doctest.DONT_ACCEPT_TRUE_FOR_1",
  "category": "標準ライブラリ",
  "syntax": "doctest.DONT_ACCEPT_TRUE_FOR_1",
  "description": "DONT_ACCEPT_TRUE_FOR_1 は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DONT_ACCEPT_TRUE_FOR_1"
 },
 {
  "name": "doctest.DebugRunner",
  "category": "標準ライブラリ",
  "syntax": "doctest.DebugRunner(...)",
  "description": "DebugRunner は doctest のクラス。",
  "example": "import doctest\n# doctest.DebugRunner の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DebugRunner"
 },
 {
  "name": "doctest.DocFileSuite",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocFileSuite(...)",
  "description": "DocFileSuite は doctest の関数。",
  "example": "import doctest\n# doctest.DocFileSuite の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocFileSuite"
 },
 {
  "name": "doctest.DocTest",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTest(...)",
  "description": "DocTest は doctest のクラス。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTest"
 },
 {
  "name": "doctest.DocTest.docstring",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTest.docstring",
  "description": "DocTest.docstring は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTest.docstring"
 },
 {
  "name": "doctest.DocTest.examples",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTest.examples",
  "description": "DocTest.examples は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTest.examples"
 },
 {
  "name": "doctest.DocTest.filename",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTest.filename",
  "description": "DocTest.filename は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTest.filename"
 },
 {
  "name": "doctest.DocTest.globs",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTest.globs",
  "description": "DocTest.globs は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTest.globs"
 },
 {
  "name": "doctest.DocTest.lineno",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTest.lineno",
  "description": "DocTest.lineno は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTest.lineno"
 },
 {
  "name": "doctest.DocTest.name",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTest.name",
  "description": "DocTest.name は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTest.name"
 },
 {
  "name": "doctest.DocTestFailure",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestFailure(msg)",
  "description": "DocTestFailure は doctest の例外クラス。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestFailure"
 },
 {
  "name": "doctest.DocTestFailure.example",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestFailure.example",
  "description": "DocTestFailure.example は doctest の属性。",
  "example": "import doctest\n# doctest.DocTestFailure.example の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestFailure.example"
 },
 {
  "name": "doctest.DocTestFailure.got",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestFailure.got",
  "description": "DocTestFailure.got は doctest の属性。",
  "example": "import doctest\n# doctest.DocTestFailure.got の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestFailure.got"
 },
 {
  "name": "doctest.DocTestFailure.test",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestFailure.test",
  "description": "DocTestFailure.test は doctest の属性。",
  "example": "import doctest\n# doctest.DocTestFailure.test の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestFailure.test"
 },
 {
  "name": "doctest.DocTestFinder",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestFinder(...)",
  "description": "DocTestFinder は doctest のクラス。",
  "example": "import doctest\n# doctest.DocTestFinder の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestFinder"
 },
 {
  "name": "doctest.DocTestFinder.find",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestFinder.find(...)",
  "description": "DocTestFinder.find は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestFinder.find の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestFinder.find"
 },
 {
  "name": "doctest.DocTestParser",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestParser(...)",
  "description": "DocTestParser は doctest のクラス。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestParser"
 },
 {
  "name": "doctest.DocTestParser.get_doctest",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestParser.get_doctest(...)",
  "description": "DocTestParser.get_doctest は doctest のメソッド。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestParser.get_doctest"
 },
 {
  "name": "doctest.DocTestParser.get_examples",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestParser.get_examples(...)",
  "description": "DocTestParser.get_examples は doctest のメソッド。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestParser.get_examples"
 },
 {
  "name": "doctest.DocTestParser.parse",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestParser.parse(...)",
  "description": "DocTestParser.parse は doctest のメソッド。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestParser.parse"
 },
 {
  "name": "doctest.DocTestRunner",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner(...)",
  "description": "DocTestRunner は doctest のクラス。",
  "example": "import doctest\n# doctest.DocTestRunner の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner"
 },
 {
  "name": "doctest.DocTestRunner.failures",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.failures",
  "description": "DocTestRunner.failures は doctest の属性。",
  "example": "import doctest\n# doctest.DocTestRunner.failures の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.failures"
 },
 {
  "name": "doctest.DocTestRunner.report_failure",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.report_failure(...)",
  "description": "DocTestRunner.report_failure は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestRunner.report_failure の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.report_failure"
 },
 {
  "name": "doctest.DocTestRunner.report_skip",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.report_skip(...)",
  "description": "DocTestRunner.report_skip は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestRunner.report_skip の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.report_skip"
 },
 {
  "name": "doctest.DocTestRunner.report_start",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.report_start(...)",
  "description": "DocTestRunner.report_start は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestRunner.report_start の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.report_start"
 },
 {
  "name": "doctest.DocTestRunner.report_success",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.report_success(...)",
  "description": "DocTestRunner.report_success は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestRunner.report_success の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.report_success"
 },
 {
  "name": "doctest.DocTestRunner.report_unexpected_exception",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.report_unexpected_exception(...)",
  "description": "DocTestRunner.report_unexpected_exception は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestRunner.report_unexpected_exception の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.report_unexpected_exception"
 },
 {
  "name": "doctest.DocTestRunner.run",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.run(...)",
  "description": "DocTestRunner.run は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestRunner.run の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.run"
 },
 {
  "name": "doctest.DocTestRunner.skips",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.skips",
  "description": "DocTestRunner.skips は doctest の属性。",
  "example": "import doctest\n# doctest.DocTestRunner.skips の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.skips"
 },
 {
  "name": "doctest.DocTestRunner.summarize",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.summarize(...)",
  "description": "DocTestRunner.summarize は doctest のメソッド。",
  "example": "import doctest\n# doctest.DocTestRunner.summarize の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.summarize"
 },
 {
  "name": "doctest.DocTestRunner.tries",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestRunner.tries",
  "description": "DocTestRunner.tries は doctest の属性。",
  "example": "import doctest\n# doctest.DocTestRunner.tries の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestRunner.tries"
 },
 {
  "name": "doctest.DocTestSuite",
  "category": "標準ライブラリ",
  "syntax": "doctest.DocTestSuite(...)",
  "description": "DocTestSuite は doctest の関数。",
  "example": "import doctest\n# doctest.DocTestSuite の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.DocTestSuite"
 },
 {
  "name": "doctest.ELLIPSIS",
  "category": "標準ライブラリ",
  "syntax": "doctest.ELLIPSIS",
  "description": "ELLIPSIS は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.ELLIPSIS"
 },
 {
  "name": "doctest.Example",
  "category": "標準ライブラリ",
  "syntax": "doctest.Example(...)",
  "description": "Example は doctest のクラス。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.Example"
 },
 {
  "name": "doctest.Example.exc_msg",
  "category": "標準ライブラリ",
  "syntax": "doctest.Example.exc_msg",
  "description": "Example.exc_msg は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.Example.exc_msg"
 },
 {
  "name": "doctest.Example.indent",
  "category": "標準ライブラリ",
  "syntax": "doctest.Example.indent",
  "description": "Example.indent は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.Example.indent"
 },
 {
  "name": "doctest.Example.lineno",
  "category": "標準ライブラリ",
  "syntax": "doctest.Example.lineno",
  "description": "Example.lineno は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.Example.lineno"
 },
 {
  "name": "doctest.Example.options",
  "category": "標準ライブラリ",
  "syntax": "doctest.Example.options",
  "description": "Example.options は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.Example.options"
 },
 {
  "name": "doctest.Example.source",
  "category": "標準ライブラリ",
  "syntax": "doctest.Example.source",
  "description": "Example.source は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.Example.source"
 },
 {
  "name": "doctest.Example.want",
  "category": "標準ライブラリ",
  "syntax": "doctest.Example.want",
  "description": "Example.want は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.Example.want"
 },
 {
  "name": "doctest.FAIL_FAST",
  "category": "標準ライブラリ",
  "syntax": "doctest.FAIL_FAST",
  "description": "FAIL_FAST は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.FAIL_FAST"
 },
 {
  "name": "doctest.IGNORE_EXCEPTION_DETAIL",
  "category": "標準ライブラリ",
  "syntax": "doctest.IGNORE_EXCEPTION_DETAIL",
  "description": "IGNORE_EXCEPTION_DETAIL は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.IGNORE_EXCEPTION_DETAIL"
 },
 {
  "name": "doctest.NORMALIZE_WHITESPACE",
  "category": "標準ライブラリ",
  "syntax": "doctest.NORMALIZE_WHITESPACE",
  "description": "NORMALIZE_WHITESPACE は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.NORMALIZE_WHITESPACE"
 },
 {
  "name": "doctest.OutputChecker",
  "category": "標準ライブラリ",
  "syntax": "doctest.OutputChecker(...)",
  "description": "OutputChecker は doctest のクラス。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.OutputChecker"
 },
 {
  "name": "doctest.OutputChecker.check_output",
  "category": "標準ライブラリ",
  "syntax": "doctest.OutputChecker.check_output(...)",
  "description": "OutputChecker.check_output は doctest のメソッド。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.OutputChecker.check_output"
 },
 {
  "name": "doctest.OutputChecker.output_difference",
  "category": "標準ライブラリ",
  "syntax": "doctest.OutputChecker.output_difference(...)",
  "description": "OutputChecker.output_difference は doctest のメソッド。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.OutputChecker.output_difference"
 },
 {
  "name": "doctest.REPORTING_FLAGS",
  "category": "標準ライブラリ",
  "syntax": "doctest.REPORTING_FLAGS",
  "description": "REPORTING_FLAGS は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.REPORTING_FLAGS"
 },
 {
  "name": "doctest.REPORT_CDIFF",
  "category": "標準ライブラリ",
  "syntax": "doctest.REPORT_CDIFF",
  "description": "REPORT_CDIFF は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.REPORT_CDIFF"
 },
 {
  "name": "doctest.REPORT_NDIFF",
  "category": "標準ライブラリ",
  "syntax": "doctest.REPORT_NDIFF",
  "description": "REPORT_NDIFF は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.REPORT_NDIFF"
 },
 {
  "name": "doctest.REPORT_ONLY_FIRST_FAILURE",
  "category": "標準ライブラリ",
  "syntax": "doctest.REPORT_ONLY_FIRST_FAILURE",
  "description": "REPORT_ONLY_FIRST_FAILURE は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.REPORT_ONLY_FIRST_FAILURE"
 },
 {
  "name": "doctest.REPORT_UDIFF",
  "category": "標準ライブラリ",
  "syntax": "doctest.REPORT_UDIFF",
  "description": "REPORT_UDIFF は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.REPORT_UDIFF"
 },
 {
  "name": "doctest.SKIP",
  "category": "標準ライブラリ",
  "syntax": "doctest.SKIP",
  "description": "SKIP は doctest のデータ。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.SKIP"
 },
 {
  "name": "doctest.TestResults",
  "category": "標準ライブラリ",
  "syntax": "doctest.TestResults(...)",
  "description": "TestResults は doctest のクラス。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.TestResults"
 },
 {
  "name": "doctest.TestResults.attempted",
  "category": "標準ライブラリ",
  "syntax": "doctest.TestResults.attempted",
  "description": "TestResults.attempted は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.TestResults.attempted"
 },
 {
  "name": "doctest.TestResults.failed",
  "category": "標準ライブラリ",
  "syntax": "doctest.TestResults.failed",
  "description": "TestResults.failed は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.TestResults.failed"
 },
 {
  "name": "doctest.TestResults.skipped",
  "category": "標準ライブラリ",
  "syntax": "doctest.TestResults.skipped",
  "description": "TestResults.skipped は doctest の属性。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.TestResults.skipped"
 },
 {
  "name": "doctest.UnexpectedException",
  "category": "標準ライブラリ",
  "syntax": "doctest.UnexpectedException(msg)",
  "description": "UnexpectedException は doctest の例外クラス。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.UnexpectedException"
 },
 {
  "name": "doctest.UnexpectedException.example",
  "category": "標準ライブラリ",
  "syntax": "doctest.UnexpectedException.example",
  "description": "UnexpectedException.example は doctest の属性。",
  "example": "import doctest\n# doctest.UnexpectedException.example の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.UnexpectedException.example"
 },
 {
  "name": "doctest.UnexpectedException.exc_info",
  "category": "標準ライブラリ",
  "syntax": "doctest.UnexpectedException.exc_info",
  "description": "UnexpectedException.exc_info は doctest の属性。",
  "example": "import doctest\n# doctest.UnexpectedException.exc_info の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.UnexpectedException.exc_info"
 },
 {
  "name": "doctest.UnexpectedException.test",
  "category": "標準ライブラリ",
  "syntax": "doctest.UnexpectedException.test",
  "description": "UnexpectedException.test は doctest の属性。",
  "example": "import doctest\n# doctest.UnexpectedException.test の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.UnexpectedException.test"
 },
 {
  "name": "doctest.debug",
  "category": "標準ライブラリ",
  "syntax": "doctest.debug(...)",
  "description": "debug は doctest の関数。",
  "example": "import doctest\n# doctest.debug の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.debug"
 },
 {
  "name": "doctest.debug_src",
  "category": "標準ライブラリ",
  "syntax": "doctest.debug_src(...)",
  "description": "debug_src は doctest の関数。",
  "example": "import doctest\n# doctest.debug_src の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.debug_src"
 },
 {
  "name": "doctest.register_optionflag",
  "category": "標準ライブラリ",
  "syntax": "doctest.register_optionflag(...)",
  "description": "register_optionflag は doctest の関数。",
  "example": "import doctest\n# doctest.register_optionflag の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.register_optionflag"
 },
 {
  "name": "doctest.run_docstring_examples",
  "category": "標準ライブラリ",
  "syntax": "doctest.run_docstring_examples(...)",
  "description": "run_docstring_examples は doctest の関数。",
  "example": "import doctest\n# doctest.run_docstring_examples の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.run_docstring_examples"
 },
 {
  "name": "doctest.script_from_examples",
  "category": "標準ライブラリ",
  "syntax": "doctest.script_from_examples(...)",
  "description": "script_from_examples は doctest の関数。",
  "example": "import doctest\nprint(len(doctest.DocTestParser().get_examples('>>> 1 + 1\\n2\\n')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.script_from_examples"
 },
 {
  "name": "doctest.set_unittest_reportflags",
  "category": "標準ライブラリ",
  "syntax": "doctest.set_unittest_reportflags(...)",
  "description": "set_unittest_reportflags は doctest の関数。",
  "example": "import doctest\n# doctest.set_unittest_reportflags の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.set_unittest_reportflags"
 },
 {
  "name": "doctest.testfile",
  "category": "標準ライブラリ",
  "syntax": "doctest.testfile(...)",
  "description": "testfile は doctest の関数。",
  "example": "import doctest\n# doctest.testfile の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。ファイル読み込み前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.testfile"
 },
 {
  "name": "doctest.testmod",
  "category": "標準ライブラリ",
  "syntax": "doctest.testmod(...)",
  "description": "testmod は doctest の関数。",
  "example": "import doctest\n# doctest.testmod の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.testmod"
 },
 {
  "name": "doctest.testsource",
  "category": "標準ライブラリ",
  "syntax": "doctest.testsource(...)",
  "description": "testsource は doctest の関数。",
  "example": "import doctest\n# doctest.testsource の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/doctest.html#doctest.testsource"
 }
];
