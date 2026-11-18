/* 高度モード B7 G12：sched のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "sched.scheduler",
  "category": "標準ライブラリ",
  "syntax": "sched.scheduler(...)",
  "description": "時刻関数と遅延関数を注入してイベントを実行するスケジューラ。",
  "example": "def tick():\n    return 0.0\ndef nap(d):\n    pass\nimport sched\ns = sched.scheduler(tick, nap)\nprint(s.empty())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sched.html#sched.scheduler"
 },
 {
  "name": "sched.scheduler.cancel",
  "category": "標準ライブラリ",
  "syntax": "sched.scheduler.cancel(...)",
  "description": "scheduler.cancel は sched のメソッド。",
  "example": "def tick():\n    return 0.0\ndef nap(d):\n    pass\nimport sched\ns = sched.scheduler(tick, nap)\nprint(s.empty())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sched.html#sched.scheduler.cancel"
 },
 {
  "name": "sched.scheduler.empty",
  "category": "標準ライブラリ",
  "syntax": "sched.scheduler.empty(...)",
  "description": "scheduler.empty は sched のメソッド。",
  "example": "def tick():\n    return 0.0\ndef nap(d):\n    pass\nimport sched\ns = sched.scheduler(tick, nap)\nprint(s.empty())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sched.html#sched.scheduler.empty"
 },
 {
  "name": "sched.scheduler.enter",
  "category": "標準ライブラリ",
  "syntax": "sched.scheduler.enter(...)",
  "description": "scheduler.enter は sched のメソッド。",
  "example": "def tick():\n    return 0.0\ndef nap(d):\n    pass\nimport sched\ns = sched.scheduler(tick, nap)\nprint(s.empty())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sched.html#sched.scheduler.enter"
 },
 {
  "name": "sched.scheduler.enterabs",
  "category": "標準ライブラリ",
  "syntax": "sched.scheduler.enterabs(...)",
  "description": "scheduler.enterabs は sched のメソッド。",
  "example": "def tick():\n    return 0.0\ndef nap(d):\n    pass\nimport sched\ns = sched.scheduler(tick, nap)\nprint(s.empty())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sched.html#sched.scheduler.enterabs"
 },
 {
  "name": "sched.scheduler.queue",
  "category": "標準ライブラリ",
  "syntax": "sched.scheduler.queue",
  "description": "scheduler.queue は sched の属性。",
  "example": "def tick():\n    return 0.0\ndef nap(d):\n    pass\nimport sched\ns = sched.scheduler(tick, nap)\nprint(s.empty())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sched.html#sched.scheduler.queue"
 },
 {
  "name": "sched.scheduler.run",
  "category": "標準ライブラリ",
  "syntax": "sched.scheduler.run(...)",
  "description": "scheduler.run は sched のメソッド。",
  "example": "def tick():\n    return 0.0\ndef nap(d):\n    pass\nimport sched\ns = sched.scheduler(tick, nap)\nprint(s.empty())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/sched.html#sched.scheduler.run"
 }
];
