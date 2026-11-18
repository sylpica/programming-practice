/* 高度モード B7 G12：bdb のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "bdb.Bdb",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb(...)",
  "description": "Bdb は bdb のクラス。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb"
 },
 {
  "name": "bdb.Bdb.break_anywhere",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.break_anywhere(...)",
  "description": "Bdb.break_anywhere は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.break_anywhere の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.break_anywhere"
 },
 {
  "name": "bdb.Bdb.break_here",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.break_here(...)",
  "description": "Bdb.break_here は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.break_here の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.break_here"
 },
 {
  "name": "bdb.Bdb.canonic",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.canonic(...)",
  "description": "Bdb.canonic は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.canonic"
 },
 {
  "name": "bdb.Bdb.clear_all_breaks",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.clear_all_breaks(...)",
  "description": "Bdb.clear_all_breaks は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.clear_all_breaks"
 },
 {
  "name": "bdb.Bdb.clear_all_file_breaks",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.clear_all_file_breaks(...)",
  "description": "Bdb.clear_all_file_breaks は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.clear_all_file_breaks"
 },
 {
  "name": "bdb.Bdb.clear_bpbynumber",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.clear_bpbynumber(...)",
  "description": "Bdb.clear_bpbynumber は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.clear_bpbynumber"
 },
 {
  "name": "bdb.Bdb.clear_break",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.clear_break(...)",
  "description": "Bdb.clear_break は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.clear_break"
 },
 {
  "name": "bdb.Bdb.disable_current_event",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.disable_current_event(...)",
  "description": "Bdb.disable_current_event は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.disable_current_event の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.disable_current_event"
 },
 {
  "name": "bdb.Bdb.dispatch_call",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.dispatch_call(...)",
  "description": "Bdb.dispatch_call は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.dispatch_call の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.dispatch_call"
 },
 {
  "name": "bdb.Bdb.dispatch_exception",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.dispatch_exception(...)",
  "description": "Bdb.dispatch_exception は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.dispatch_exception の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.dispatch_exception"
 },
 {
  "name": "bdb.Bdb.dispatch_line",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.dispatch_line(...)",
  "description": "Bdb.dispatch_line は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.dispatch_line の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.dispatch_line"
 },
 {
  "name": "bdb.Bdb.dispatch_return",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.dispatch_return(...)",
  "description": "Bdb.dispatch_return は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.dispatch_return の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.dispatch_return"
 },
 {
  "name": "bdb.Bdb.do_clear",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.do_clear(...)",
  "description": "Bdb.do_clear は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.do_clear の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.do_clear"
 },
 {
  "name": "bdb.Bdb.format_stack_entry",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.format_stack_entry(...)",
  "description": "Bdb.format_stack_entry は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.format_stack_entry の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.format_stack_entry"
 },
 {
  "name": "bdb.Bdb.get_all_breaks",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.get_all_breaks(...)",
  "description": "Bdb.get_all_breaks は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.get_all_breaks"
 },
 {
  "name": "bdb.Bdb.get_bpbynumber",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.get_bpbynumber(...)",
  "description": "Bdb.get_bpbynumber は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.get_bpbynumber"
 },
 {
  "name": "bdb.Bdb.get_break",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.get_break(...)",
  "description": "Bdb.get_break は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.get_break"
 },
 {
  "name": "bdb.Bdb.get_breaks",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.get_breaks(...)",
  "description": "Bdb.get_breaks は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.get_breaks"
 },
 {
  "name": "bdb.Bdb.get_file_breaks",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.get_file_breaks(...)",
  "description": "Bdb.get_file_breaks は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.get_file_breaks"
 },
 {
  "name": "bdb.Bdb.get_stack",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.get_stack(...)",
  "description": "Bdb.get_stack は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.get_stack の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.get_stack"
 },
 {
  "name": "bdb.Bdb.is_skipped_module",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.is_skipped_module(...)",
  "description": "Bdb.is_skipped_module は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.is_skipped_module の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.is_skipped_module"
 },
 {
  "name": "bdb.Bdb.reset",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.reset(...)",
  "description": "Bdb.reset は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.reset"
 },
 {
  "name": "bdb.Bdb.restart_events",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.restart_events(...)",
  "description": "Bdb.restart_events は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.restart_events の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.restart_events"
 },
 {
  "name": "bdb.Bdb.run",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.run(...)",
  "description": "Bdb.run は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.run の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.run"
 },
 {
  "name": "bdb.Bdb.runcall",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.runcall(...)",
  "description": "Bdb.runcall は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.runcall の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.runcall"
 },
 {
  "name": "bdb.Bdb.runctx",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.runctx(...)",
  "description": "Bdb.runctx は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.runctx の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.runctx"
 },
 {
  "name": "bdb.Bdb.runeval",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.runeval(...)",
  "description": "Bdb.runeval は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.runeval の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.runeval"
 },
 {
  "name": "bdb.Bdb.set_break",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_break(...)",
  "description": "Bdb.set_break は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_break"
 },
 {
  "name": "bdb.Bdb.set_continue",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_continue(...)",
  "description": "Bdb.set_continue は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.set_continue の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_continue"
 },
 {
  "name": "bdb.Bdb.set_next",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_next(...)",
  "description": "Bdb.set_next は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.set_next の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_next"
 },
 {
  "name": "bdb.Bdb.set_quit",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_quit(...)",
  "description": "Bdb.set_quit は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.set_quit の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_quit"
 },
 {
  "name": "bdb.Bdb.set_return",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_return(...)",
  "description": "Bdb.set_return は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.set_return の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_return"
 },
 {
  "name": "bdb.Bdb.set_step",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_step(...)",
  "description": "Bdb.set_step は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.set_step の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_step"
 },
 {
  "name": "bdb.Bdb.set_trace",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_trace(...)",
  "description": "Bdb.set_trace は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.set_trace の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_trace"
 },
 {
  "name": "bdb.Bdb.set_until",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.set_until(...)",
  "description": "Bdb.set_until は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.set_until の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.set_until"
 },
 {
  "name": "bdb.Bdb.start_trace",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.start_trace(...)",
  "description": "Bdb.start_trace は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.start_trace の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.start_trace"
 },
 {
  "name": "bdb.Bdb.stop_here",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.stop_here(...)",
  "description": "Bdb.stop_here は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.stop_here の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.stop_here"
 },
 {
  "name": "bdb.Bdb.stop_trace",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.stop_trace(...)",
  "description": "Bdb.stop_trace は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.stop_trace の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.stop_trace"
 },
 {
  "name": "bdb.Bdb.trace_dispatch",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.trace_dispatch(...)",
  "description": "Bdb.trace_dispatch は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.trace_dispatch の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.trace_dispatch"
 },
 {
  "name": "bdb.Bdb.user_call",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.user_call(...)",
  "description": "Bdb.user_call は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.user_call の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.user_call"
 },
 {
  "name": "bdb.Bdb.user_exception",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.user_exception(...)",
  "description": "Bdb.user_exception は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.user_exception の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.user_exception"
 },
 {
  "name": "bdb.Bdb.user_line",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.user_line(...)",
  "description": "Bdb.user_line は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.user_line の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.user_line"
 },
 {
  "name": "bdb.Bdb.user_return",
  "category": "標準ライブラリ",
  "syntax": "bdb.Bdb.user_return(...)",
  "description": "Bdb.user_return は bdb のメソッド。",
  "example": "import bdb\n# bdb.Bdb.user_return の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Bdb.user_return"
 },
 {
  "name": "bdb.BdbQuit",
  "category": "標準ライブラリ",
  "syntax": "bdb.BdbQuit(msg)",
  "description": "BdbQuit は bdb の例外クラス。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.BdbQuit"
 },
 {
  "name": "bdb.Breakpoint",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint(...)",
  "description": "Breakpoint は bdb のクラス。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint"
 },
 {
  "name": "bdb.Breakpoint.bpbynumber",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.bpbynumber",
  "description": "Breakpoint.bpbynumber は bdb の属性。",
  "example": "import bdb\n# bdb.Breakpoint.bpbynumber の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.bpbynumber"
 },
 {
  "name": "bdb.Breakpoint.bpformat",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.bpformat(...)",
  "description": "Breakpoint.bpformat は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.bpformat"
 },
 {
  "name": "bdb.Breakpoint.bplist",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.bplist",
  "description": "Breakpoint.bplist は bdb の属性。",
  "example": "import bdb\n# bdb.Breakpoint.bplist の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.bplist"
 },
 {
  "name": "bdb.Breakpoint.bpprint",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.bpprint(...)",
  "description": "Breakpoint.bpprint は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.bpprint"
 },
 {
  "name": "bdb.Breakpoint.cond",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.cond",
  "description": "Breakpoint.cond は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.cond"
 },
 {
  "name": "bdb.Breakpoint.deleteMe",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.deleteMe(...)",
  "description": "Breakpoint.deleteMe は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.deleteMe"
 },
 {
  "name": "bdb.Breakpoint.disable",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.disable(...)",
  "description": "Breakpoint.disable は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.disable"
 },
 {
  "name": "bdb.Breakpoint.enable",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.enable(...)",
  "description": "Breakpoint.enable は bdb のメソッド。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.enable"
 },
 {
  "name": "bdb.Breakpoint.enabled",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.enabled",
  "description": "Breakpoint.enabled は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.enabled"
 },
 {
  "name": "bdb.Breakpoint.file",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.file",
  "description": "Breakpoint.file は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.file"
 },
 {
  "name": "bdb.Breakpoint.funcname",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.funcname",
  "description": "Breakpoint.funcname は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.funcname"
 },
 {
  "name": "bdb.Breakpoint.hits",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.hits",
  "description": "Breakpoint.hits は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.hits"
 },
 {
  "name": "bdb.Breakpoint.ignore",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.ignore",
  "description": "Breakpoint.ignore は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.ignore"
 },
 {
  "name": "bdb.Breakpoint.line",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.line",
  "description": "Breakpoint.line は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.line"
 },
 {
  "name": "bdb.Breakpoint.temporary",
  "category": "標準ライブラリ",
  "syntax": "bdb.Breakpoint.temporary",
  "description": "Breakpoint.temporary は bdb の属性。",
  "example": "import bdb\nbp = bdb.Breakpoint('x.py', 10)\nprint(bp.line)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.Breakpoint.temporary"
 },
 {
  "name": "bdb.checkfuncname",
  "category": "標準ライブラリ",
  "syntax": "bdb.checkfuncname(...)",
  "description": "checkfuncname は bdb の関数。",
  "example": "import bdb\n# bdb.checkfuncname の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.checkfuncname"
 },
 {
  "name": "bdb.effective",
  "category": "標準ライブラリ",
  "syntax": "bdb.effective(...)",
  "description": "effective は bdb の関数。",
  "example": "import bdb\n# bdb.effective の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.effective"
 },
 {
  "name": "bdb.set_trace",
  "category": "標準ライブラリ",
  "syntax": "bdb.set_trace(...)",
  "description": "set_trace は bdb の関数。",
  "example": "import bdb\n# bdb.set_trace の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。実行トレース前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/bdb.html#bdb.set_trace"
 }
];
