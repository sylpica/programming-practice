/* 高度モード B7 G12：unittest のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "unittest.FunctionTestCase",
  "category": "標準ライブラリ",
  "syntax": "unittest.FunctionTestCase(...)",
  "description": "FunctionTestCase は unittest のクラス。",
  "example": "import unittest\n# unittest.FunctionTestCase の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.FunctionTestCase"
 },
 {
  "name": "unittest.IsolatedAsyncioTestCase",
  "category": "標準ライブラリ",
  "syntax": "unittest.IsolatedAsyncioTestCase(...)",
  "description": "IsolatedAsyncioTestCase は unittest のクラス。",
  "example": "import unittest\n# unittest.IsolatedAsyncioTestCase の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.IsolatedAsyncioTestCase"
 },
 {
  "name": "unittest.IsolatedAsyncioTestCase.addAsyncCleanup",
  "category": "標準ライブラリ",
  "syntax": "unittest.IsolatedAsyncioTestCase.addAsyncCleanup(...)",
  "description": "IsolatedAsyncioTestCase.addAsyncCleanup は unittest のメソッド。",
  "example": "import unittest\n# unittest.IsolatedAsyncioTestCase.addAsyncCleanup の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.IsolatedAsyncioTestCase.addAsyncCleanup"
 },
 {
  "name": "unittest.IsolatedAsyncioTestCase.asyncSetUp",
  "category": "標準ライブラリ",
  "syntax": "unittest.IsolatedAsyncioTestCase.asyncSetUp(...)",
  "description": "IsolatedAsyncioTestCase.asyncSetUp は unittest のメソッド。",
  "example": "import unittest\n# unittest.IsolatedAsyncioTestCase.asyncSetUp の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.IsolatedAsyncioTestCase.asyncSetUp"
 },
 {
  "name": "unittest.IsolatedAsyncioTestCase.asyncTearDown",
  "category": "標準ライブラリ",
  "syntax": "unittest.IsolatedAsyncioTestCase.asyncTearDown(...)",
  "description": "IsolatedAsyncioTestCase.asyncTearDown は unittest のメソッド。",
  "example": "import unittest\n# unittest.IsolatedAsyncioTestCase.asyncTearDown の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.IsolatedAsyncioTestCase.asyncTearDown"
 },
 {
  "name": "unittest.IsolatedAsyncioTestCase.enterAsyncContext",
  "category": "標準ライブラリ",
  "syntax": "unittest.IsolatedAsyncioTestCase.enterAsyncContext(...)",
  "description": "IsolatedAsyncioTestCase.enterAsyncContext は unittest のメソッド。",
  "example": "import unittest\n# unittest.IsolatedAsyncioTestCase.enterAsyncContext の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.IsolatedAsyncioTestCase.enterAsyncContext"
 },
 {
  "name": "unittest.IsolatedAsyncioTestCase.loop_factory",
  "category": "標準ライブラリ",
  "syntax": "unittest.IsolatedAsyncioTestCase.loop_factory",
  "description": "IsolatedAsyncioTestCase.loop_factory は unittest の属性。",
  "example": "import unittest\n# unittest.IsolatedAsyncioTestCase.loop_factory の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.IsolatedAsyncioTestCase.loop_factory"
 },
 {
  "name": "unittest.IsolatedAsyncioTestCase.run",
  "category": "標準ライブラリ",
  "syntax": "unittest.IsolatedAsyncioTestCase.run(...)",
  "description": "IsolatedAsyncioTestCase.run は unittest のメソッド。",
  "example": "import unittest\n# unittest.IsolatedAsyncioTestCase.run の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.IsolatedAsyncioTestCase.run"
 },
 {
  "name": "unittest.SkipTest",
  "category": "標準ライブラリ",
  "syntax": "unittest.SkipTest(msg)",
  "description": "SkipTest は unittest の例外クラス。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.SkipTest"
 },
 {
  "name": "unittest.TestCase",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase(...)",
  "description": "テストケース基底クラス。assert 系メソッドを提供する。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase"
 },
 {
  "name": "unittest.TestCase.addClassCleanup",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.addClassCleanup(...)",
  "description": "TestCase.addClassCleanup は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.addClassCleanup の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.addClassCleanup"
 },
 {
  "name": "unittest.TestCase.addCleanup",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.addCleanup(...)",
  "description": "TestCase.addCleanup は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.addCleanup"
 },
 {
  "name": "unittest.TestCase.addTypeEqualityFunc",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.addTypeEqualityFunc(...)",
  "description": "TestCase.addTypeEqualityFunc は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.addTypeEqualityFunc"
 },
 {
  "name": "unittest.TestCase.assertAlmostEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertAlmostEqual(...)",
  "description": "TestCase.assertAlmostEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertAlmostEqual"
 },
 {
  "name": "unittest.TestCase.assertCountEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertCountEqual(...)",
  "description": "TestCase.assertCountEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertCountEqual"
 },
 {
  "name": "unittest.TestCase.assertDictEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertDictEqual(...)",
  "description": "TestCase.assertDictEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertDictEqual"
 },
 {
  "name": "unittest.TestCase.assertEndsWith",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertEndsWith(...)",
  "description": "TestCase.assertEndsWith は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertEndsWith"
 },
 {
  "name": "unittest.TestCase.assertEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertEqual(...)",
  "description": "TestCase.assertEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertEqual"
 },
 {
  "name": "unittest.TestCase.assertFalse",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertFalse(...)",
  "description": "TestCase.assertFalse は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertFalse"
 },
 {
  "name": "unittest.TestCase.assertGreater",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertGreater(...)",
  "description": "TestCase.assertGreater は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertGreater"
 },
 {
  "name": "unittest.TestCase.assertGreaterEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertGreaterEqual(...)",
  "description": "TestCase.assertGreaterEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertGreaterEqual"
 },
 {
  "name": "unittest.TestCase.assertHasAttr",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertHasAttr(...)",
  "description": "TestCase.assertHasAttr は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertHasAttr の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertHasAttr"
 },
 {
  "name": "unittest.TestCase.assertIn",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertIn(...)",
  "description": "TestCase.assertIn は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertIn"
 },
 {
  "name": "unittest.TestCase.assertIs",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertIs(...)",
  "description": "TestCase.assertIs は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertIs"
 },
 {
  "name": "unittest.TestCase.assertIsInstance",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertIsInstance(...)",
  "description": "TestCase.assertIsInstance は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertIsInstance"
 },
 {
  "name": "unittest.TestCase.assertIsNone",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertIsNone(...)",
  "description": "TestCase.assertIsNone は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertIsNone"
 },
 {
  "name": "unittest.TestCase.assertIsNot",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertIsNot(...)",
  "description": "TestCase.assertIsNot は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertIsNot"
 },
 {
  "name": "unittest.TestCase.assertIsNotNone",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertIsNotNone(...)",
  "description": "TestCase.assertIsNotNone は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertIsNotNone"
 },
 {
  "name": "unittest.TestCase.assertIsSubclass",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertIsSubclass(...)",
  "description": "TestCase.assertIsSubclass は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertIsSubclass の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertIsSubclass"
 },
 {
  "name": "unittest.TestCase.assertLess",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertLess(...)",
  "description": "TestCase.assertLess は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertLess"
 },
 {
  "name": "unittest.TestCase.assertLessEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertLessEqual(...)",
  "description": "TestCase.assertLessEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertLessEqual"
 },
 {
  "name": "unittest.TestCase.assertListEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertListEqual(...)",
  "description": "TestCase.assertListEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertListEqual"
 },
 {
  "name": "unittest.TestCase.assertLogs",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertLogs(...)",
  "description": "TestCase.assertLogs は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertLogs の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertLogs"
 },
 {
  "name": "unittest.TestCase.assertMultiLineEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertMultiLineEqual(...)",
  "description": "TestCase.assertMultiLineEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertMultiLineEqual"
 },
 {
  "name": "unittest.TestCase.assertNoLogs",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNoLogs(...)",
  "description": "TestCase.assertNoLogs は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertNoLogs の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNoLogs"
 },
 {
  "name": "unittest.TestCase.assertNotAlmostEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotAlmostEqual(...)",
  "description": "TestCase.assertNotAlmostEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotAlmostEqual"
 },
 {
  "name": "unittest.TestCase.assertNotEndsWith",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotEndsWith(...)",
  "description": "TestCase.assertNotEndsWith は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotEndsWith"
 },
 {
  "name": "unittest.TestCase.assertNotEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotEqual(...)",
  "description": "TestCase.assertNotEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotEqual"
 },
 {
  "name": "unittest.TestCase.assertNotHasAttr",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotHasAttr(...)",
  "description": "TestCase.assertNotHasAttr は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertNotHasAttr の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotHasAttr"
 },
 {
  "name": "unittest.TestCase.assertNotIn",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotIn(...)",
  "description": "TestCase.assertNotIn は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotIn"
 },
 {
  "name": "unittest.TestCase.assertNotIsInstance",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotIsInstance(...)",
  "description": "TestCase.assertNotIsInstance は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotIsInstance"
 },
 {
  "name": "unittest.TestCase.assertNotIsSubclass",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotIsSubclass(...)",
  "description": "TestCase.assertNotIsSubclass は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertNotIsSubclass の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotIsSubclass"
 },
 {
  "name": "unittest.TestCase.assertNotRegex",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotRegex(...)",
  "description": "TestCase.assertNotRegex は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotRegex"
 },
 {
  "name": "unittest.TestCase.assertNotStartsWith",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertNotStartsWith(...)",
  "description": "TestCase.assertNotStartsWith は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertNotStartsWith"
 },
 {
  "name": "unittest.TestCase.assertRaises",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertRaises(...)",
  "description": "TestCase.assertRaises は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertRaises の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertRaises"
 },
 {
  "name": "unittest.TestCase.assertRaisesRegex",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertRaisesRegex(...)",
  "description": "TestCase.assertRaisesRegex は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertRaisesRegex の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertRaisesRegex"
 },
 {
  "name": "unittest.TestCase.assertRegex",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertRegex(...)",
  "description": "TestCase.assertRegex は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertRegex"
 },
 {
  "name": "unittest.TestCase.assertSequenceEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertSequenceEqual(...)",
  "description": "TestCase.assertSequenceEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertSequenceEqual"
 },
 {
  "name": "unittest.TestCase.assertSetEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertSetEqual(...)",
  "description": "TestCase.assertSetEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertSetEqual"
 },
 {
  "name": "unittest.TestCase.assertStartsWith",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertStartsWith(...)",
  "description": "TestCase.assertStartsWith は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertStartsWith"
 },
 {
  "name": "unittest.TestCase.assertTrue",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertTrue(...)",
  "description": "TestCase.assertTrue は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertTrue"
 },
 {
  "name": "unittest.TestCase.assertTupleEqual",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertTupleEqual(...)",
  "description": "TestCase.assertTupleEqual は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertTupleEqual"
 },
 {
  "name": "unittest.TestCase.assertWarns",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertWarns(...)",
  "description": "TestCase.assertWarns は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertWarns の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertWarns"
 },
 {
  "name": "unittest.TestCase.assertWarnsRegex",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.assertWarnsRegex(...)",
  "description": "TestCase.assertWarnsRegex は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.assertWarnsRegex の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.assertWarnsRegex"
 },
 {
  "name": "unittest.TestCase.countTestCases",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.countTestCases(...)",
  "description": "TestCase.countTestCases は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.countTestCases"
 },
 {
  "name": "unittest.TestCase.debug",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.debug(...)",
  "description": "TestCase.debug は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.debug の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.debug"
 },
 {
  "name": "unittest.TestCase.defaultTestResult",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.defaultTestResult(...)",
  "description": "TestCase.defaultTestResult は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.defaultTestResult"
 },
 {
  "name": "unittest.TestCase.doClassCleanups",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.doClassCleanups(...)",
  "description": "TestCase.doClassCleanups は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.doClassCleanups の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.doClassCleanups"
 },
 {
  "name": "unittest.TestCase.doCleanups",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.doCleanups(...)",
  "description": "TestCase.doCleanups は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.doCleanups"
 },
 {
  "name": "unittest.TestCase.enterClassContext",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.enterClassContext(...)",
  "description": "TestCase.enterClassContext は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.enterClassContext の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.enterClassContext"
 },
 {
  "name": "unittest.TestCase.enterContext",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.enterContext(...)",
  "description": "TestCase.enterContext は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.enterContext の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.enterContext"
 },
 {
  "name": "unittest.TestCase.fail",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.fail(...)",
  "description": "TestCase.fail は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.fail"
 },
 {
  "name": "unittest.TestCase.failureException",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.failureException",
  "description": "TestCase.failureException は unittest の属性。",
  "example": "import unittest\n# unittest.TestCase.failureException の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.failureException"
 },
 {
  "name": "unittest.TestCase.id",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.id(...)",
  "description": "TestCase.id は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.id"
 },
 {
  "name": "unittest.TestCase.longMessage",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.longMessage",
  "description": "TestCase.longMessage は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.longMessage"
 },
 {
  "name": "unittest.TestCase.maxDiff",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.maxDiff",
  "description": "TestCase.maxDiff は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.maxDiff"
 },
 {
  "name": "unittest.TestCase.output",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.output",
  "description": "TestCase.output は unittest の属性。",
  "example": "import unittest\n# unittest.TestCase.output の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.output"
 },
 {
  "name": "unittest.TestCase.records",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.records",
  "description": "TestCase.records は unittest の属性。",
  "example": "import unittest\n# unittest.TestCase.records の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.records"
 },
 {
  "name": "unittest.TestCase.run",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.run(...)",
  "description": "TestCase.run は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.run の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.run"
 },
 {
  "name": "unittest.TestCase.setUp",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.setUp(...)",
  "description": "TestCase.setUp は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.setUp"
 },
 {
  "name": "unittest.TestCase.setUpClass",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.setUpClass(...)",
  "description": "TestCase.setUpClass は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.setUpClass"
 },
 {
  "name": "unittest.TestCase.shortDescription",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.shortDescription(...)",
  "description": "TestCase.shortDescription は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.shortDescription"
 },
 {
  "name": "unittest.TestCase.skipTest",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.skipTest(...)",
  "description": "TestCase.skipTest は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.skipTest"
 },
 {
  "name": "unittest.TestCase.subTest",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.subTest(...)",
  "description": "TestCase.subTest は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestCase.subTest の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.subTest"
 },
 {
  "name": "unittest.TestCase.tearDown",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.tearDown(...)",
  "description": "TestCase.tearDown は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.tearDown"
 },
 {
  "name": "unittest.TestCase.tearDownClass",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestCase.tearDownClass(...)",
  "description": "TestCase.tearDownClass は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestCase.tearDownClass"
 },
 {
  "name": "unittest.TestLoader",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader(...)",
  "description": "TestLoader は unittest のクラス。",
  "example": "import unittest\n# unittest.TestLoader の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader"
 },
 {
  "name": "unittest.TestLoader.discover",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.discover(...)",
  "description": "TestLoader.discover は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestLoader.discover の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。コマンドライン引数とファイルシステム探索前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.discover"
 },
 {
  "name": "unittest.TestLoader.errors",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.errors",
  "description": "TestLoader.errors は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.errors"
 },
 {
  "name": "unittest.TestLoader.getTestCaseNames",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.getTestCaseNames(...)",
  "description": "TestLoader.getTestCaseNames は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestLoader.getTestCaseNames の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.getTestCaseNames"
 },
 {
  "name": "unittest.TestLoader.loadTestsFromModule",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.loadTestsFromModule(...)",
  "description": "TestLoader.loadTestsFromModule は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestLoader.loadTestsFromModule の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.loadTestsFromModule"
 },
 {
  "name": "unittest.TestLoader.loadTestsFromName",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.loadTestsFromName(...)",
  "description": "TestLoader.loadTestsFromName は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestLoader.loadTestsFromName の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.loadTestsFromName"
 },
 {
  "name": "unittest.TestLoader.loadTestsFromNames",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.loadTestsFromNames(...)",
  "description": "TestLoader.loadTestsFromNames は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestLoader.loadTestsFromNames の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.loadTestsFromNames"
 },
 {
  "name": "unittest.TestLoader.loadTestsFromTestCase",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.loadTestsFromTestCase(...)",
  "description": "TestLoader.loadTestsFromTestCase は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestLoader.loadTestsFromTestCase の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.loadTestsFromTestCase"
 },
 {
  "name": "unittest.TestLoader.sortTestMethodsUsing",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.sortTestMethodsUsing",
  "description": "TestLoader.sortTestMethodsUsing は unittest の属性。",
  "example": "import unittest\n# unittest.TestLoader.sortTestMethodsUsing の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.sortTestMethodsUsing"
 },
 {
  "name": "unittest.TestLoader.suiteClass",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.suiteClass",
  "description": "TestLoader.suiteClass は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.suiteClass"
 },
 {
  "name": "unittest.TestLoader.testMethodPrefix",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.testMethodPrefix",
  "description": "TestLoader.testMethodPrefix は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.testMethodPrefix"
 },
 {
  "name": "unittest.TestLoader.testNamePatterns",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestLoader.testNamePatterns",
  "description": "TestLoader.testNamePatterns は unittest の属性。",
  "example": "import unittest\n# unittest.TestLoader.testNamePatterns の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestLoader.testNamePatterns"
 },
 {
  "name": "unittest.TestResult",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult(...)",
  "description": "TestResult は unittest のクラス。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult"
 },
 {
  "name": "unittest.TestResult.addDuration",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addDuration(...)",
  "description": "TestResult.addDuration は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addDuration"
 },
 {
  "name": "unittest.TestResult.addError",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addError(...)",
  "description": "TestResult.addError は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addError"
 },
 {
  "name": "unittest.TestResult.addExpectedFailure",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addExpectedFailure(...)",
  "description": "TestResult.addExpectedFailure は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addExpectedFailure"
 },
 {
  "name": "unittest.TestResult.addFailure",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addFailure(...)",
  "description": "TestResult.addFailure は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addFailure"
 },
 {
  "name": "unittest.TestResult.addSkip",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addSkip(...)",
  "description": "TestResult.addSkip は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addSkip"
 },
 {
  "name": "unittest.TestResult.addSubTest",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addSubTest(...)",
  "description": "TestResult.addSubTest は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addSubTest"
 },
 {
  "name": "unittest.TestResult.addSuccess",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addSuccess(...)",
  "description": "TestResult.addSuccess は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addSuccess"
 },
 {
  "name": "unittest.TestResult.addUnexpectedSuccess",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.addUnexpectedSuccess(...)",
  "description": "TestResult.addUnexpectedSuccess は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.addUnexpectedSuccess"
 },
 {
  "name": "unittest.TestResult.buffer",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.buffer",
  "description": "TestResult.buffer は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.buffer"
 },
 {
  "name": "unittest.TestResult.collectedDurations",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.collectedDurations",
  "description": "TestResult.collectedDurations は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.collectedDurations"
 },
 {
  "name": "unittest.TestResult.errors",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.errors",
  "description": "TestResult.errors は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.errors"
 },
 {
  "name": "unittest.TestResult.expectedFailures",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.expectedFailures",
  "description": "TestResult.expectedFailures は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.expectedFailures"
 },
 {
  "name": "unittest.TestResult.failfast",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.failfast",
  "description": "TestResult.failfast は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.failfast"
 },
 {
  "name": "unittest.TestResult.failures",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.failures",
  "description": "TestResult.failures は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.failures"
 },
 {
  "name": "unittest.TestResult.shouldStop",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.shouldStop",
  "description": "TestResult.shouldStop は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.shouldStop"
 },
 {
  "name": "unittest.TestResult.skipped",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.skipped",
  "description": "TestResult.skipped は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.skipped"
 },
 {
  "name": "unittest.TestResult.startTest",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.startTest(...)",
  "description": "TestResult.startTest は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.startTest"
 },
 {
  "name": "unittest.TestResult.startTestRun",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.startTestRun(...)",
  "description": "TestResult.startTestRun は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.startTestRun"
 },
 {
  "name": "unittest.TestResult.stop",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.stop(...)",
  "description": "TestResult.stop は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.stop"
 },
 {
  "name": "unittest.TestResult.stopTest",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.stopTest(...)",
  "description": "TestResult.stopTest は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.stopTest"
 },
 {
  "name": "unittest.TestResult.stopTestRun",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.stopTestRun(...)",
  "description": "TestResult.stopTestRun は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.stopTestRun"
 },
 {
  "name": "unittest.TestResult.tb_locals",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.tb_locals",
  "description": "TestResult.tb_locals は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.tb_locals"
 },
 {
  "name": "unittest.TestResult.testsRun",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.testsRun",
  "description": "TestResult.testsRun は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.testsRun"
 },
 {
  "name": "unittest.TestResult.unexpectedSuccesses",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.unexpectedSuccesses",
  "description": "TestResult.unexpectedSuccesses は unittest の属性。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.unexpectedSuccesses"
 },
 {
  "name": "unittest.TestResult.wasSuccessful",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestResult.wasSuccessful(...)",
  "description": "TestResult.wasSuccessful は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestResult.wasSuccessful"
 },
 {
  "name": "unittest.TestSuite",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestSuite(...)",
  "description": "TestSuite は unittest のクラス。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestSuite"
 },
 {
  "name": "unittest.TestSuite.__iter__",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestSuite.__iter__(...)",
  "description": "TestSuite.__iter__ は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestSuite.__iter__"
 },
 {
  "name": "unittest.TestSuite.addTest",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestSuite.addTest(...)",
  "description": "TestSuite.addTest は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestSuite.addTest"
 },
 {
  "name": "unittest.TestSuite.addTests",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestSuite.addTests(...)",
  "description": "TestSuite.addTests は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestSuite.addTests"
 },
 {
  "name": "unittest.TestSuite.countTestCases",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestSuite.countTestCases(...)",
  "description": "TestSuite.countTestCases は unittest のメソッド。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestSuite.countTestCases"
 },
 {
  "name": "unittest.TestSuite.debug",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestSuite.debug(...)",
  "description": "TestSuite.debug は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestSuite.debug の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestSuite.debug"
 },
 {
  "name": "unittest.TestSuite.run",
  "category": "標準ライブラリ",
  "syntax": "unittest.TestSuite.run(...)",
  "description": "TestSuite.run は unittest のメソッド。",
  "example": "import unittest\n# unittest.TestSuite.run の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TestSuite.run"
 },
 {
  "name": "unittest.TextTestResult",
  "category": "標準ライブラリ",
  "syntax": "unittest.TextTestResult(...)",
  "description": "TextTestResult は unittest のクラス。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TextTestResult"
 },
 {
  "name": "unittest.TextTestRunner",
  "category": "標準ライブラリ",
  "syntax": "unittest.TextTestRunner(...)",
  "description": "TextTestRunner は unittest のクラス。",
  "example": "import unittest\n# unittest.TextTestRunner の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TextTestRunner"
 },
 {
  "name": "unittest.TextTestRunner._makeResult",
  "category": "標準ライブラリ",
  "syntax": "unittest.TextTestRunner._makeResult(...)",
  "description": "TextTestRunner._makeResult は unittest のメソッド。",
  "example": "import unittest\n# unittest.TextTestRunner._makeResult の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TextTestRunner._makeResult"
 },
 {
  "name": "unittest.TextTestRunner.run",
  "category": "標準ライブラリ",
  "syntax": "unittest.TextTestRunner.run(...)",
  "description": "TextTestRunner.run は unittest のメソッド。",
  "example": "import unittest\n# unittest.TextTestRunner.run の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.TextTestRunner.run"
 },
 {
  "name": "unittest.addModuleCleanup",
  "category": "標準ライブラリ",
  "syntax": "unittest.addModuleCleanup(...)",
  "description": "addModuleCleanup は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.addModuleCleanup"
 },
 {
  "name": "unittest.defaultTestLoader",
  "category": "標準ライブラリ",
  "syntax": "unittest.defaultTestLoader",
  "description": "defaultTestLoader は unittest のデータ。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.defaultTestLoader"
 },
 {
  "name": "unittest.doModuleCleanups",
  "category": "標準ライブラリ",
  "syntax": "unittest.doModuleCleanups(...)",
  "description": "doModuleCleanups は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.doModuleCleanups"
 },
 {
  "name": "unittest.enterModuleContext",
  "category": "標準ライブラリ",
  "syntax": "unittest.enterModuleContext(...)",
  "description": "enterModuleContext は unittest の関数。",
  "example": "import unittest\n# unittest.enterModuleContext の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.enterModuleContext"
 },
 {
  "name": "unittest.expectedFailure",
  "category": "標準ライブラリ",
  "syntax": "unittest.expectedFailure(...)",
  "description": "expectedFailure は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.expectedFailure"
 },
 {
  "name": "unittest.installHandler",
  "category": "標準ライブラリ",
  "syntax": "unittest.installHandler(...)",
  "description": "installHandler は unittest の関数。",
  "example": "import unittest\n# unittest.installHandler の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.installHandler"
 },
 {
  "name": "unittest.main",
  "category": "標準ライブラリ",
  "syntax": "unittest.main(...)",
  "description": "main は unittest の関数。",
  "example": "import unittest\n# unittest.main の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。コマンドライン引数とファイルシステム探索前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.main"
 },
 {
  "name": "unittest.registerResult",
  "category": "標準ライブラリ",
  "syntax": "unittest.registerResult(...)",
  "description": "registerResult は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.registerResult"
 },
 {
  "name": "unittest.removeHandler",
  "category": "標準ライブラリ",
  "syntax": "unittest.removeHandler(...)",
  "description": "removeHandler は unittest の関数。",
  "example": "import unittest\n# unittest.removeHandler の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.removeHandler"
 },
 {
  "name": "unittest.removeResult",
  "category": "標準ライブラリ",
  "syntax": "unittest.removeResult(...)",
  "description": "removeResult は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.removeResult"
 },
 {
  "name": "unittest.setUpModule",
  "category": "標準ライブラリ",
  "syntax": "unittest.setUpModule(...)",
  "description": "setUpModule は unittest の関数。",
  "example": "import unittest\n# unittest.setUpModule の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.setUpModule"
 },
 {
  "name": "unittest.skip",
  "category": "標準ライブラリ",
  "syntax": "unittest.skip(...)",
  "description": "skip は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.skip"
 },
 {
  "name": "unittest.skipIf",
  "category": "標準ライブラリ",
  "syntax": "unittest.skipIf(...)",
  "description": "skipIf は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.skipIf"
 },
 {
  "name": "unittest.skipUnless",
  "category": "標準ライブラリ",
  "syntax": "unittest.skipUnless(...)",
  "description": "skipUnless は unittest の関数。",
  "example": "import unittest\ntc = unittest.TestCase()\ntc.assertEqual(1, 1)\nprint('ok')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.skipUnless"
 },
 {
  "name": "unittest.tearDownModule",
  "category": "標準ライブラリ",
  "syntax": "unittest.tearDownModule(...)",
  "description": "tearDownModule は unittest の関数。",
  "example": "import unittest\n# unittest.tearDownModule の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.html#unittest.tearDownModule"
 }
];
