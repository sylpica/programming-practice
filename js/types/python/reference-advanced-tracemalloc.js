/* 高度モード B7 G12：tracemalloc のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "tracemalloc.DomainFilter",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.DomainFilter(...)",
  "description": "DomainFilter は tracemalloc のクラス。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.DomainFilter"
 },
 {
  "name": "tracemalloc.DomainFilter.domain",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.DomainFilter.domain",
  "description": "DomainFilter.domain は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.DomainFilter.domain"
 },
 {
  "name": "tracemalloc.DomainFilter.inclusive",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.DomainFilter.inclusive",
  "description": "DomainFilter.inclusive は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.DomainFilter.inclusive"
 },
 {
  "name": "tracemalloc.Filter",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Filter(...)",
  "description": "Filter は tracemalloc のクラス。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Filter"
 },
 {
  "name": "tracemalloc.Filter.all_frames",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Filter.all_frames",
  "description": "Filter.all_frames は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Filter.all_frames"
 },
 {
  "name": "tracemalloc.Filter.domain",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Filter.domain",
  "description": "Filter.domain は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Filter.domain"
 },
 {
  "name": "tracemalloc.Filter.filename_pattern",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Filter.filename_pattern",
  "description": "Filter.filename_pattern は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Filter.filename_pattern"
 },
 {
  "name": "tracemalloc.Filter.inclusive",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Filter.inclusive",
  "description": "Filter.inclusive は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Filter.inclusive"
 },
 {
  "name": "tracemalloc.Filter.lineno",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Filter.lineno",
  "description": "Filter.lineno は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Filter.lineno"
 },
 {
  "name": "tracemalloc.Frame",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Frame(...)",
  "description": "Frame は tracemalloc のクラス。",
  "example": "import tracemalloc\n# tracemalloc.Frame の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Frame"
 },
 {
  "name": "tracemalloc.Frame.filename",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Frame.filename",
  "description": "Frame.filename は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Frame.filename"
 },
 {
  "name": "tracemalloc.Frame.lineno",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Frame.lineno",
  "description": "Frame.lineno は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Frame.lineno"
 },
 {
  "name": "tracemalloc.Snapshot",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot(...)",
  "description": "Snapshot は tracemalloc のクラス。",
  "example": "import tracemalloc\n# tracemalloc.Snapshot の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot"
 },
 {
  "name": "tracemalloc.Snapshot.compare_to",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot.compare_to(...)",
  "description": "Snapshot.compare_to は tracemalloc のメソッド。",
  "example": "import tracemalloc\n# tracemalloc.Snapshot.compare_to の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot.compare_to"
 },
 {
  "name": "tracemalloc.Snapshot.dump",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot.dump(...)",
  "description": "Snapshot.dump は tracemalloc のメソッド。",
  "example": "import tracemalloc\n# tracemalloc.Snapshot.dump の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot.dump"
 },
 {
  "name": "tracemalloc.Snapshot.filter_traces",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot.filter_traces(...)",
  "description": "Snapshot.filter_traces は tracemalloc のメソッド。",
  "example": "import tracemalloc\n# tracemalloc.Snapshot.filter_traces の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot.filter_traces"
 },
 {
  "name": "tracemalloc.Snapshot.load",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot.load(...)",
  "description": "Snapshot.load は tracemalloc のメソッド。",
  "example": "import tracemalloc\n# tracemalloc.Snapshot.load の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot.load"
 },
 {
  "name": "tracemalloc.Snapshot.statistics",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot.statistics(...)",
  "description": "Snapshot.statistics は tracemalloc のメソッド。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot.statistics"
 },
 {
  "name": "tracemalloc.Snapshot.traceback_limit",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot.traceback_limit",
  "description": "Snapshot.traceback_limit は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot.traceback_limit"
 },
 {
  "name": "tracemalloc.Snapshot.traces",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Snapshot.traces",
  "description": "Snapshot.traces は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Snapshot.traces"
 },
 {
  "name": "tracemalloc.Statistic",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Statistic(...)",
  "description": "Statistic は tracemalloc のクラス。",
  "example": "import tracemalloc\n# tracemalloc.Statistic の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Statistic"
 },
 {
  "name": "tracemalloc.Statistic.count",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Statistic.count",
  "description": "Statistic.count は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Statistic.count"
 },
 {
  "name": "tracemalloc.Statistic.size",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Statistic.size",
  "description": "Statistic.size は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Statistic.size"
 },
 {
  "name": "tracemalloc.Statistic.traceback",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Statistic.traceback",
  "description": "Statistic.traceback は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Statistic.traceback"
 },
 {
  "name": "tracemalloc.StatisticDiff",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.StatisticDiff(...)",
  "description": "StatisticDiff は tracemalloc のクラス。",
  "example": "import tracemalloc\n# tracemalloc.StatisticDiff の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.StatisticDiff"
 },
 {
  "name": "tracemalloc.StatisticDiff.count",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.StatisticDiff.count",
  "description": "StatisticDiff.count は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.StatisticDiff.count"
 },
 {
  "name": "tracemalloc.StatisticDiff.count_diff",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.StatisticDiff.count_diff",
  "description": "StatisticDiff.count_diff は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.StatisticDiff.count_diff"
 },
 {
  "name": "tracemalloc.StatisticDiff.size",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.StatisticDiff.size",
  "description": "StatisticDiff.size は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.StatisticDiff.size"
 },
 {
  "name": "tracemalloc.StatisticDiff.size_diff",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.StatisticDiff.size_diff",
  "description": "StatisticDiff.size_diff は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.StatisticDiff.size_diff"
 },
 {
  "name": "tracemalloc.StatisticDiff.traceback",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.StatisticDiff.traceback",
  "description": "StatisticDiff.traceback は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.StatisticDiff.traceback"
 },
 {
  "name": "tracemalloc.Trace",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Trace(...)",
  "description": "Trace は tracemalloc のクラス。",
  "example": "import tracemalloc\n# tracemalloc.Trace の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Trace"
 },
 {
  "name": "tracemalloc.Trace.domain",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Trace.domain",
  "description": "Trace.domain は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Trace.domain"
 },
 {
  "name": "tracemalloc.Trace.size",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Trace.size",
  "description": "Trace.size は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Trace.size"
 },
 {
  "name": "tracemalloc.Trace.traceback",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Trace.traceback",
  "description": "Trace.traceback は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Trace.traceback"
 },
 {
  "name": "tracemalloc.Traceback",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Traceback(...)",
  "description": "Traceback は tracemalloc のクラス。",
  "example": "import tracemalloc\n# tracemalloc.Traceback の代表的な使い方（公式ドキュメント参照）",
  "caution": "意味論を一次情報で確定できなかったため未検証です。詳細は報告書（docs/audit/b7-g12-report.md）を参照。",
  "status": "unverified",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Traceback"
 },
 {
  "name": "tracemalloc.Traceback.format",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Traceback.format(...)",
  "description": "Traceback.format は tracemalloc のメソッド。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Traceback.format"
 },
 {
  "name": "tracemalloc.Traceback.total_nframe",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.Traceback.total_nframe",
  "description": "Traceback.total_nframe は tracemalloc の属性。",
  "example": "import tracemalloc\nf = tracemalloc.Filter(True, 'x.py')\nprint(f.filename_pattern)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.Traceback.total_nframe"
 },
 {
  "name": "tracemalloc.clear_traces",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.clear_traces(...)",
  "description": "clear_traces は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.clear_traces の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.clear_traces"
 },
 {
  "name": "tracemalloc.get_object_traceback",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.get_object_traceback(...)",
  "description": "get_object_traceback は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.get_object_traceback の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.get_object_traceback"
 },
 {
  "name": "tracemalloc.get_traceback_limit",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.get_traceback_limit(...)",
  "description": "get_traceback_limit は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.get_traceback_limit の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.get_traceback_limit"
 },
 {
  "name": "tracemalloc.get_traced_memory",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.get_traced_memory(...)",
  "description": "get_traced_memory は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.get_traced_memory の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.get_traced_memory"
 },
 {
  "name": "tracemalloc.get_tracemalloc_memory",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.get_tracemalloc_memory(...)",
  "description": "get_tracemalloc_memory は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.get_tracemalloc_memory の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.get_tracemalloc_memory"
 },
 {
  "name": "tracemalloc.is_tracing",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.is_tracing(...)",
  "description": "is_tracing は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.is_tracing の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.is_tracing"
 },
 {
  "name": "tracemalloc.reset_peak",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.reset_peak(...)",
  "description": "reset_peak は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.reset_peak の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.reset_peak"
 },
 {
  "name": "tracemalloc.start",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.start(...)",
  "description": "start は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.start の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.start"
 },
 {
  "name": "tracemalloc.stop",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.stop(...)",
  "description": "stop は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.stop の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.stop"
 },
 {
  "name": "tracemalloc.take_snapshot",
  "category": "標準ライブラリ",
  "syntax": "tracemalloc.take_snapshot(...)",
  "description": "take_snapshot は tracemalloc の関数。",
  "example": "import tracemalloc\n# tracemalloc.take_snapshot の代表的な使い方（公式ドキュメント参照）",
  "caution": "本アプリの高度モードでは未対応です。メモリ割り当ての追跡前提のため。",
  "status": "unsupported",
  "source": "https://docs.python.org/ja/3.15/library/tracemalloc.html#tracemalloc.take_snapshot"
 }
];
