/* 高度モード B7 G12：queue のリファレンス差分（生成器 gen は報告書参照）。
 * 形式は高度モード契約の正規形。 */
export const referenceAdvanced = [
 {
  "name": "queue.Empty",
  "category": "標準ライブラリ",
  "syntax": "queue.Empty(msg)",
  "description": "Empty は queue の例外クラス。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Empty"
 },
 {
  "name": "queue.Full",
  "category": "標準ライブラリ",
  "syntax": "queue.Full(msg)",
  "description": "Full は queue の例外クラス。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Full"
 },
 {
  "name": "queue.LifoQueue",
  "category": "標準ライブラリ",
  "syntax": "queue.LifoQueue(...)",
  "description": "LifoQueue は queue のクラス。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.LifoQueue"
 },
 {
  "name": "queue.PriorityQueue",
  "category": "標準ライブラリ",
  "syntax": "queue.PriorityQueue(...)",
  "description": "PriorityQueue は queue のクラス。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.PriorityQueue"
 },
 {
  "name": "queue.Queue",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue(...)",
  "description": "スレッド安全な FIFO キュー（本実装は非ブロッキング意味論）。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue"
 },
 {
  "name": "queue.Queue.empty",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.empty(...)",
  "description": "Queue.empty は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.empty"
 },
 {
  "name": "queue.Queue.full",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.full(...)",
  "description": "Queue.full は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.full"
 },
 {
  "name": "queue.Queue.get",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.get(...)",
  "description": "Queue.get は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.get"
 },
 {
  "name": "queue.Queue.get_nowait",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.get_nowait(...)",
  "description": "Queue.get_nowait は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.get_nowait"
 },
 {
  "name": "queue.Queue.join",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.join(...)",
  "description": "Queue.join は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.join"
 },
 {
  "name": "queue.Queue.put",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.put(...)",
  "description": "Queue.put は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.put"
 },
 {
  "name": "queue.Queue.put_nowait",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.put_nowait(...)",
  "description": "Queue.put_nowait は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.put_nowait"
 },
 {
  "name": "queue.Queue.qsize",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.qsize(...)",
  "description": "Queue.qsize は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.qsize"
 },
 {
  "name": "queue.Queue.shutdown",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.shutdown(...)",
  "description": "Queue.shutdown は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.shutdown"
 },
 {
  "name": "queue.Queue.task_done",
  "category": "標準ライブラリ",
  "syntax": "queue.Queue.task_done(...)",
  "description": "Queue.task_done は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.Queue.task_done"
 },
 {
  "name": "queue.ShutDown",
  "category": "標準ライブラリ",
  "syntax": "queue.ShutDown(msg)",
  "description": "ShutDown は queue の例外クラス。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.ShutDown"
 },
 {
  "name": "queue.SimpleQueue",
  "category": "標準ライブラリ",
  "syntax": "queue.SimpleQueue(...)",
  "description": "SimpleQueue は queue のクラス。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.SimpleQueue"
 },
 {
  "name": "queue.SimpleQueue.empty",
  "category": "標準ライブラリ",
  "syntax": "queue.SimpleQueue.empty(...)",
  "description": "SimpleQueue.empty は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.SimpleQueue.empty"
 },
 {
  "name": "queue.SimpleQueue.get",
  "category": "標準ライブラリ",
  "syntax": "queue.SimpleQueue.get(...)",
  "description": "SimpleQueue.get は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.SimpleQueue.get"
 },
 {
  "name": "queue.SimpleQueue.get_nowait",
  "category": "標準ライブラリ",
  "syntax": "queue.SimpleQueue.get_nowait(...)",
  "description": "SimpleQueue.get_nowait は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.SimpleQueue.get_nowait"
 },
 {
  "name": "queue.SimpleQueue.put",
  "category": "標準ライブラリ",
  "syntax": "queue.SimpleQueue.put(...)",
  "description": "SimpleQueue.put は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.SimpleQueue.put"
 },
 {
  "name": "queue.SimpleQueue.put_nowait",
  "category": "標準ライブラリ",
  "syntax": "queue.SimpleQueue.put_nowait(...)",
  "description": "SimpleQueue.put_nowait は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.SimpleQueue.put_nowait"
 },
 {
  "name": "queue.SimpleQueue.qsize",
  "category": "標準ライブラリ",
  "syntax": "queue.SimpleQueue.qsize(...)",
  "description": "SimpleQueue.qsize は queue のメソッド。",
  "example": "import queue\nq = queue.Queue()\nq.put(1)\nprint(q.get())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/queue.html#queue.SimpleQueue.qsize"
 }
];
