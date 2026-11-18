/* 高度モード B7 G12：unittest.mock のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "unittest.mock.ANY",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.ANY",
  "description": "ANY は unittest.mock のデータ。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.ANY"
 },
 {
  "name": "unittest.mock.AsyncMock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock(...)",
  "description": "AsyncMock は unittest.mock のクラス。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock"
 },
 {
  "name": "unittest.mock.AsyncMock.assert_any_await",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.assert_any_await(...)",
  "description": "AsyncMock.assert_any_await は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.assert_any_await の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.assert_any_await"
 },
 {
  "name": "unittest.mock.AsyncMock.assert_awaited",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.assert_awaited(...)",
  "description": "AsyncMock.assert_awaited は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.assert_awaited の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.assert_awaited"
 },
 {
  "name": "unittest.mock.AsyncMock.assert_awaited_once",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.assert_awaited_once(...)",
  "description": "AsyncMock.assert_awaited_once は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.assert_awaited_once の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.assert_awaited_once"
 },
 {
  "name": "unittest.mock.AsyncMock.assert_awaited_once_with",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.assert_awaited_once_with(...)",
  "description": "AsyncMock.assert_awaited_once_with は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.assert_awaited_once_with の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.assert_awaited_once_with"
 },
 {
  "name": "unittest.mock.AsyncMock.assert_awaited_with",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.assert_awaited_with(...)",
  "description": "AsyncMock.assert_awaited_with は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.assert_awaited_with の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.assert_awaited_with"
 },
 {
  "name": "unittest.mock.AsyncMock.assert_has_awaits",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.assert_has_awaits(...)",
  "description": "AsyncMock.assert_has_awaits は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.assert_has_awaits の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.assert_has_awaits"
 },
 {
  "name": "unittest.mock.AsyncMock.assert_not_awaited",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.assert_not_awaited(...)",
  "description": "AsyncMock.assert_not_awaited は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.assert_not_awaited の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.assert_not_awaited"
 },
 {
  "name": "unittest.mock.AsyncMock.await_args",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.await_args",
  "description": "AsyncMock.await_args は unittest.mock の属性。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.await_args の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.await_args"
 },
 {
  "name": "unittest.mock.AsyncMock.await_args_list",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.await_args_list",
  "description": "AsyncMock.await_args_list は unittest.mock の属性。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.await_args_list の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.await_args_list"
 },
 {
  "name": "unittest.mock.AsyncMock.await_count",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.await_count",
  "description": "AsyncMock.await_count は unittest.mock の属性。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.await_count の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.await_count"
 },
 {
  "name": "unittest.mock.AsyncMock.reset_mock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.AsyncMock.reset_mock(...)",
  "description": "AsyncMock.reset_mock は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.AsyncMock.reset_mock の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.AsyncMock.reset_mock"
 },
 {
  "name": "unittest.mock.DEFAULT",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.DEFAULT",
  "description": "DEFAULT は unittest.mock のデータ。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.DEFAULT"
 },
 {
  "name": "unittest.mock.FILTER_DIR",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.FILTER_DIR",
  "description": "FILTER_DIR は unittest.mock のデータ。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.FILTER_DIR"
 },
 {
  "name": "unittest.mock.MagicMock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.MagicMock(...)",
  "description": "マジックメソッドにも対応するモック。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.MagicMock"
 },
 {
  "name": "unittest.mock.Mock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock(...)",
  "description": "呼び出しを記録するモックオブジェクト。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock"
 },
 {
  "name": "unittest.mock.Mock.__class__",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.__class__",
  "description": "Mock.__class__ は unittest.mock の属性。",
  "example": "import unittest.mock\n# unittest.mock.Mock.__class__ の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.__class__"
 },
 {
  "name": "unittest.mock.Mock.__dir__",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.__dir__(...)",
  "description": "Mock.__dir__ は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.Mock.__dir__ の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.__dir__"
 },
 {
  "name": "unittest.mock.Mock._get_child_mock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock._get_child_mock(...)",
  "description": "Mock._get_child_mock は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.Mock._get_child_mock の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock._get_child_mock"
 },
 {
  "name": "unittest.mock.Mock.assert_any_call",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.assert_any_call(...)",
  "description": "Mock.assert_any_call は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.assert_any_call"
 },
 {
  "name": "unittest.mock.Mock.assert_called",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.assert_called(...)",
  "description": "Mock.assert_called は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.assert_called"
 },
 {
  "name": "unittest.mock.Mock.assert_called_once",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.assert_called_once(...)",
  "description": "Mock.assert_called_once は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.assert_called_once"
 },
 {
  "name": "unittest.mock.Mock.assert_called_once_with",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.assert_called_once_with(...)",
  "description": "Mock.assert_called_once_with は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.assert_called_once_with"
 },
 {
  "name": "unittest.mock.Mock.assert_called_with",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.assert_called_with(...)",
  "description": "Mock.assert_called_with は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.assert_called_with"
 },
 {
  "name": "unittest.mock.Mock.assert_has_calls",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.assert_has_calls(...)",
  "description": "Mock.assert_has_calls は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.assert_has_calls"
 },
 {
  "name": "unittest.mock.Mock.assert_not_called",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.assert_not_called(...)",
  "description": "Mock.assert_not_called は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.assert_not_called"
 },
 {
  "name": "unittest.mock.Mock.attach_mock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.attach_mock(...)",
  "description": "Mock.attach_mock は unittest.mock のメソッド。既存のモックを子モックとして取り付け、その呼び出しが親の method_calls／mock_calls に現れるようにする（R6 で子モック配線とあわせて実装・実走照合済み）。",
  "example": "from unittest.mock import Mock\nm = Mock()\nother = Mock()\nm.attach_mock(other, 'kid')\nother(9)\nprint(m.method_calls)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.attach_mock"
 },
 {
  "name": "unittest.mock.Mock.call_args",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.call_args",
  "description": "Mock.call_args は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.call_args"
 },
 {
  "name": "unittest.mock.Mock.call_args_list",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.call_args_list",
  "description": "Mock.call_args_list は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.call_args_list"
 },
 {
  "name": "unittest.mock.Mock.call_count",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.call_count",
  "description": "Mock.call_count は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.call_count"
 },
 {
  "name": "unittest.mock.Mock.called",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.called",
  "description": "Mock.called は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.called"
 },
 {
  "name": "unittest.mock.Mock.configure_mock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.configure_mock(...)",
  "description": "Mock.configure_mock は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.configure_mock"
 },
 {
  "name": "unittest.mock.Mock.method_calls",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.method_calls",
  "description": "Mock.method_calls は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.method_calls"
 },
 {
  "name": "unittest.mock.Mock.mock_add_spec",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.mock_add_spec(...)",
  "description": "Mock.mock_add_spec は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.Mock.mock_add_spec の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.mock_add_spec"
 },
 {
  "name": "unittest.mock.Mock.mock_calls",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.mock_calls",
  "description": "Mock.mock_calls は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.mock_calls"
 },
 {
  "name": "unittest.mock.Mock.reset_mock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.reset_mock(...)",
  "description": "Mock.reset_mock は unittest.mock のメソッド。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.reset_mock"
 },
 {
  "name": "unittest.mock.Mock.return_value",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.return_value",
  "description": "Mock.return_value は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.return_value"
 },
 {
  "name": "unittest.mock.Mock.side_effect",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.Mock.side_effect",
  "description": "Mock.side_effect は unittest.mock の属性。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.Mock.side_effect"
 },
 {
  "name": "unittest.mock.NonCallableMagicMock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.NonCallableMagicMock(...)",
  "description": "NonCallableMagicMock は unittest.mock のクラス。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.NonCallableMagicMock"
 },
 {
  "name": "unittest.mock.NonCallableMock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.NonCallableMock(...)",
  "description": "NonCallableMock は unittest.mock のクラス。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.NonCallableMock"
 },
 {
  "name": "unittest.mock.PropertyMock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.PropertyMock(...)",
  "description": "PropertyMock は unittest.mock のクラス。",
  "example": "import unittest.mock\n# unittest.mock.PropertyMock の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.PropertyMock"
 },
 {
  "name": "unittest.mock.ThreadingMock",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.ThreadingMock(...)",
  "description": "ThreadingMock は unittest.mock のクラス。",
  "example": "import unittest.mock\n# unittest.mock.ThreadingMock の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.ThreadingMock"
 },
 {
  "name": "unittest.mock.ThreadingMock.DEFAULT_TIMEOUT",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.ThreadingMock.DEFAULT_TIMEOUT",
  "description": "ThreadingMock.DEFAULT_TIMEOUT は unittest.mock の属性。",
  "example": "import unittest.mock\n# unittest.mock.ThreadingMock.DEFAULT_TIMEOUT の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.ThreadingMock.DEFAULT_TIMEOUT"
 },
 {
  "name": "unittest.mock.ThreadingMock.wait_until_any_call_with",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.ThreadingMock.wait_until_any_call_with(...)",
  "description": "ThreadingMock.wait_until_any_call_with は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.ThreadingMock.wait_until_any_call_with の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.ThreadingMock.wait_until_any_call_with"
 },
 {
  "name": "unittest.mock.ThreadingMock.wait_until_called",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.ThreadingMock.wait_until_called(...)",
  "description": "ThreadingMock.wait_until_called は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.ThreadingMock.wait_until_called の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.ThreadingMock.wait_until_called"
 },
 {
  "name": "unittest.mock.call",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.call(...)",
  "description": "call は unittest.mock の関数。",
  "example": "from unittest.mock import MagicMock\nm = MagicMock()\nm(1)\nprint(m.call_count)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.call"
 },
 {
  "name": "unittest.mock.call.call_list",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.call.call_list(...)",
  "description": "call.call_list は unittest.mock のメソッド。",
  "example": "import unittest.mock\n# unittest.mock.call.call_list の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.call.call_list"
 },
 {
  "name": "unittest.mock.create_autospec",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.create_autospec(...)",
  "description": "create_autospec は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.create_autospec の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.create_autospec"
 },
 {
  "name": "unittest.mock.mock_open",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.mock_open(...)",
  "description": "mock_open は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.mock_open の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.mock_open"
 },
 {
  "name": "unittest.mock.patch",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.patch(...)",
  "description": "patch は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.patch の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.patch"
 },
 {
  "name": "unittest.mock.patch.dict",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.patch.dict(...)",
  "description": "patch.dict は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.patch.dict の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.patch.dict"
 },
 {
  "name": "unittest.mock.patch.multiple",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.patch.multiple(...)",
  "description": "patch.multiple は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.patch.multiple の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.patch.multiple"
 },
 {
  "name": "unittest.mock.patch.object",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.patch.object(...)",
  "description": "patch.object は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.patch.object の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.patch.object"
 },
 {
  "name": "unittest.mock.patch.stopall",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.patch.stopall(...)",
  "description": "patch.stopall は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.patch.stopall の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.patch.stopall"
 },
 {
  "name": "unittest.mock.seal",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.seal(...)",
  "description": "seal は unittest.mock の関数。",
  "example": "import unittest.mock\n# unittest.mock.seal の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.seal"
 },
 {
  "name": "unittest.mock.sentinel",
  "category": "標準ライブラリ",
  "syntax": "unittest.mock.sentinel",
  "description": "sentinel は unittest.mock のデータ。属性にアクセスすると一意なセンチネルオブジェクトが生成され、同じ属性は同じオブジェクトを返す（R6 で attrFallback 配線により実装・実走照合済み）。",
  "example": "from unittest.mock import sentinel\nprint(sentinel.DEFAULT)\nprint(sentinel.DEFAULT is sentinel.DEFAULT)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/unittest.mock.html#unittest.mock.sentinel"
 }
];
