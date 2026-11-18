/* 高度モード B7 G4 リファレンス：bisect（正規形）
 * 出典は各項目の source（公式ドキュメント 3.15）。status は実装の裏付け状態。
 * expected（期待出力）はここには置かず、テストファイルのケース表で保持する。 */
export const referenceAdvanced = [
  {
   "name": "bisect.bisect",
   "category": "標準ライブラリ",
   "syntax": "bisect(a, x, lo=0, hi=len(a), *, key=None)",
   "description": "bisect_right の別名。ソート済みリスト a に x を挿入しても順序が保たれる位置（x と等しい要素の右側）を返す。key は 3.10+。",
   "example": "import bisect\nprint(bisect.bisect([1, 2, 2, 3], 2))",
   "status": "supported",
   "caution": "",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/bisect.html#bisect.bisect"
  },
  {
   "name": "bisect.bisect_left",
   "category": "標準ライブラリ",
   "syntax": "bisect_left(a, x, lo=0, hi=len(a), *, key=None)",
   "description": "x を挿入しても順序が保たれる最も左の位置を返す。key は 3.10+。",
   "example": "import bisect\nprint(bisect.bisect_left([1, 2, 2, 3], 2))",
   "status": "supported",
   "caution": "",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/bisect.html#bisect.bisect_left"
  },
  {
   "name": "bisect.bisect_right",
   "category": "標準ライブラリ",
   "syntax": "bisect_right(a, x, lo=0, hi=len(a), *, key=None)",
   "description": "x を挿入しても順序が保たれる最も右の位置を返す。key は 3.10+。",
   "example": "import bisect\nprint(bisect.bisect_right([1, 2, 2, 3], 2))",
   "status": "supported",
   "caution": "",
   "returns": "int",
   "source": "https://docs.python.org/ja/3.15/library/bisect.html#bisect.bisect_right"
  },
  {
   "name": "bisect.insort",
   "category": "標準ライブラリ",
   "syntax": "insort(a, x, lo=0, hi=len(a), *, key=None)",
   "description": "bisect_right の位置に x を実際に挿入する。リスト以外（タプルなど）では AttributeError。",
   "example": "import bisect\na = [1, 2, 3]\nbisect.insort(a, 2)\nprint(a)",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/bisect.html#bisect.insort"
  },
  {
   "name": "bisect.insort_left",
   "category": "標準ライブラリ",
   "syntax": "insort_left(a, x, lo=0, hi=len(a), *, key=None)",
   "description": "bisect_left の位置に x を挿入する。",
   "example": "import bisect\na = [1, 2, 3]\nbisect.insort_left(a, 2)\nprint(a)",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/bisect.html#bisect.insort_left"
  },
  {
   "name": "bisect.insort_right",
   "category": "標準ライブラリ",
   "syntax": "insort_right(a, x, lo=0, hi=len(a), *, key=None)",
   "description": "bisect_right の位置に x を挿入する（insort と同じ）。",
   "example": "import bisect\na = [1, 2, 3]\nbisect.insort_right(a, 0)\nprint(a)",
   "status": "supported",
   "caution": "",
   "returns": "None",
   "source": "https://docs.python.org/ja/3.15/library/bisect.html#bisect.insort_right"
  }
];
