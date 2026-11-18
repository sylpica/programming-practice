// 高度モード（ブロックB6・Python班3）：高度差分テンプレート（追加分のみ）。
// 契約形式（advanced-interface.md 第4章 4.2）。全て高度項目＋基礎機能だけで
// 実行が完結し、エンジンと実 CPython 3.12.3 の双方で期待出力と一致確認済み。
// refs は各テンプレートの主題となる項目をコーディネーターが実コードで確認して選んだ。

export const templatesAdvanced = [
 {
  "id": "tpl-adv-property",
  "title": "クラスとプロパティ",
  "code": "class Temp:\n    def __init__(self, c):\n        self._c = c\n    @property\n    def celsius(self):\n        return self._c\n    @celsius.setter\n    def celsius(self, v):\n        if v < -273:\n            raise ValueError(\"too cold\")\n        self._c = v\n    @property\n    def fahrenheit(self):\n        return self._c * 9 / 5 + 32\nt = Temp(25)\nprint(t.fahrenheit)\nt.celsius = 30\nprint(t.celsius, t.fahrenheit)",
  "intro": "property を使うと、属性の読み取り・書き込みに処理を挟めます。celsius は読み書きできる property（setter で絶対零度未満を弾く検証つき）、fahrenheit は計算で求める読み取り専用の property です。内部の実データは _c に持ち、外部からは通常の属性のように見せている点がポイントです。setter の検証条件や換算式を変えて実験してください。",
  "refs": [
   "property",
   "property.setter",
   "ValueError",
   "print"
  ],
  "level": "中級"
 },
 {
  "id": "tpl-adv-vector",
  "title": "特殊メソッドで演算子を定義する",
  "code": "class Vec:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n    def __add__(self, o):\n        return Vec(self.x + o.x, self.y + o.y)\n    def __eq__(self, o):\n        return self.x == o.x and self.y == o.y\n    def __repr__(self):\n        return f\"Vec({self.x}, {self.y})\"\na = Vec(1, 2)\nb = Vec(3, 4)\nprint(a + b)\nprint(a + b == Vec(4, 6))",
  "intro": "__add__ を定義すると自作クラスでも + が使え、__eq__ で == の意味を、__repr__ で表示の形を決められます。これら __（ダンダー）で囲まれた特殊メソッドが、演算子や組み込み関数の裏側の仕組みです。__sub__ や __mul__（スカラー倍）を追加して、ベクトルの演算を増やしてみてください。",
  "refs": [
   "object.__add__",
   "object.__eq__",
   "object.__repr__",
   "print"
  ],
  "level": "中級"
 },
 {
  "id": "tpl-adv-classmethod",
  "title": "classmethod の代替コンストラクタ",
  "code": "class Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n    @classmethod\n    def from_str(cls, s):\n        x, y = s.split(\",\")\n        return cls(int(x), int(y))\n    def __repr__(self):\n        return f\"Point({self.x}, {self.y})\"\np = Point.from_str(\"3,4\")\nprint(p)",
  "intro": "classmethod の代表的な用途が「代替コンストラクタ」です。from_str は文字列 \"3,4\" を分解してから cls(...) でインスタンスを作ります。cls を使うので、サブクラスから呼ぶとサブクラスのインスタンスができます。from_list など別の作り方を追加して、生成の入り口を増やしてみてください。",
  "refs": [
   "classmethod",
   "object.__repr__",
   "int",
   "print"
  ],
  "level": "中級"
 },
 {
  "id": "tpl-adv-super",
  "title": "継承と super()",
  "code": "class Shape:\n    def __init__(self, name):\n        self.name = name\n    def describe(self):\n        return \"shape:\" + self.name\nclass Circle(Shape):\n    def __init__(self, r):\n        super().__init__(\"circle\")\n        self.r = r\n    def describe(self):\n        return super().describe() + f\" r={self.r}\"\nprint(Circle(2).describe())",
  "intro": "super() は MRO（メソッド解決順序）で次のクラスのメソッドを呼びます。__init__ の共通部分を親に任せ、describe は親の結果に自分の情報を足しています。親クラス名を直接書かず super() を使うと、継承関係を変えてもコードが壊れにくくなります。Square クラスを足して同じ形で拡張してみてください。",
  "refs": [
   "super",
   "object.__init__",
   "print"
  ],
  "level": "中級"
 },
 {
  "id": "tpl-adv-bag",
  "title": "自作コレクション（__len__ / __getitem__ / __contains__）",
  "code": "class Bag:\n    def __init__(self):\n        self.items = []\n    def add(self, x):\n        self.items.append(x)\n    def __len__(self):\n        return len(self.items)\n    def __getitem__(self, i):\n        return self.items[i]\n    def __contains__(self, x):\n        return x in self.items\nbag = Bag()\nbag.add(\"tea\")\nbag.add(\"coffee\")\nprint(len(bag))\nprint(bag[0])\nprint(\"tea\" in bag)\nfor x in bag:\n    print(x)",
  "intro": "__len__・__getitem__・__contains__ を定義すると、自作クラスが組み込みの集まりのように振る舞い、len()・添字・in が使えます。for は __iter__ が無くても __getitem__ を 0, 1, 2… と順に呼ぶ方式（整数添字プロトコル）で回ります。__iter__ を追加して iter(self.items) を返す形との違いも試してみてください。",
  "refs": [
   "object.__len__",
   "object.__getitem__",
   "object.__contains__",
   "len",
   "print"
  ],
  "level": "中級"
 },
 {
  "id": "tpl-adv-with",
  "title": "with 文と __enter__ / __exit__",
  "code": "class Trace:\n    def __init__(self, name):\n        self.name = name\n    def __enter__(self):\n        print(\"start\", self.name)\n        return self\n    def __exit__(self, t, v, tb):\n        print(\"end\", self.name)\n        return False\nwith Trace(\"job\"):\n    print(\"working\")",
  "intro": "with 文は、入るときに __enter__、出るときに __exit__ を必ず呼ぶ仕組みです。__exit__ は例外が起きても呼ばれるため、ファイルの close やロック解除のような「確実な後片付け」に使われます。__exit__ の引数（t, v, tb）には例外の情報が入り、True を返すと例外を抑制できます。本体で raise してみて、end が出たあとに例外がどう伝わるか確認してください。",
  "refs": [
   "object.__enter__",
   "object.__exit__",
   "with",
   "print"
  ],
  "level": "中級"
 }
];
