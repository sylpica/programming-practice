/* 高度モード差分（ブロックB3）: ImageJ テンプレート追加分。
 * 契約（advanced-interface.md 第4章 4.2／第5章）に従い、正規形
 * { id, title, code, intro, refs, level } で templatesAdvanced として公開する。
 * id は "ij-adv-" 接頭辞で全種類を通して一意。refs は合成後カタログの名前。
 * 収載基準: 高度エンジン有効化後に definition.simulate で実行確認し、
 * エラーなく完走するものだけを収載した。
 * Overlay テンプレートの注意: 実 ImageJ でも、オーバーレイが無い画像への
 * Overlay.setStrokeColor はエラーになる（Functions.java の doOverlay が
 * overlay==null のまま呼ぶ）。先にパスを add してオーバーレイを作る順序にした。
 */
export const templatesAdvanced = [
 {
  "id": "ij-adv-1",
  "title": "【高度】配列の連結・切り出し",
  "code": "// 配列の高度操作\na = Array.getSequence(4);\nb = Array.concat(a, newArray(100, 200));\nc = Array.slice(b, 1, 4);\nprint(\"要素数=\" + b.length);\nprint(\"切り出し先頭=\" + c[0]);\nprint(\"末尾=\" + b[b.length - 1]);",
  "intro": "準備は不要。結果は Log ウィンドウに出ます。Array.getSequence で連番の配列を作り、Array.concat で別の配列と連結し、Array.slice で一部を切り出す、高度モードの配列関数の組み合わせです。Array.concat と Array.slice は新しい配列を返すので、元の配列は変わりません。要素は b[0] のように番号（0始まり）で取り出します。",
  "refs": [
   "newArray",
   "print",
   "Array.concat",
   "Array.getSequence",
   "Array.slice"
  ],
  "level": "高度"
 },
 {
  "id": "ij-adv-2",
  "title": "【高度】結果テーブルの作成と読み書き",
  "code": "// 結果テーブルの作成と読み書き\nTable.create(\"計測データ\");\nTable.set(\"番号\", 0, 1);\nTable.set(\"値\", 0, 42);\nTable.set(\"番号\", 1, 2);\nTable.set(\"値\", 1, 43);\nv = Table.get(\"値\", 1);\ncol = Table.getColumn(\"値\");\nprint(\"2行目の値=\" + v);\nprint(\"値列の要素数=\" + col.length);",
  "intro": "準備は不要。Table.create で名前付きの結果テーブルを作ります。Table.create でテーブルを用意し、Table.set（列名、行、値）でセルに書き込み、Table.get で読み戻します。列が無ければ書き込み時に作られます。Table.getColumn は列全体を配列として返すので、列の要素数や後続の集計にそのまま使えます。測定結果の表（Results）とは別の、名前付きテーブルを直接操作できるのが高度モードの Table 系関数の特徴です。",
  "refs": [
   "print",
   "Table.create",
   "Table.get",
   "Table.set",
   "Table.getColumn"
  ],
  "level": "高度"
 },
 {
  "id": "ij-adv-3",
  "title": "【高度】パス文字列の分解（File）",
  "code": "// パス文字列の分解\npath = \"/model/input/image1.tif\";\nname = File.getName(path);\nbase = File.getNameWithoutExtension(path);\ndir = File.getDirectory(path);\nparent = File.getParent(path);\nprint(\"名前=\" + name);\nprint(\"拡張子なし=\" + base);\nprint(\"ディレクトリ=\" + dir);\nprint(\"親=\" + parent);",
  "intro": "準備は不要。パスは文字列としてだけ扱い、実ファイルには触れません。File.getName、File.getNameWithoutExtension、File.getDirectory、File.getParent は、パス文字列を分解する純粋な文字列操作です。ファイル名の一括処理や保存先パスの組み立てでよく使う形です。実ファイルを読む・書く File.open や File.saveString などは高度モードでも未対応です。文字列としてのパス操作だけが対応範囲になります。",
  "refs": [
   "getDirectory",
   "print",
   "File.getName",
   "File.getNameWithoutExtension",
   "File.getDirectory",
   "File.getParent"
  ],
  "level": "高度"
 },
 {
  "id": "ij-adv-4",
  "title": "【高度】プロットの作成（Plot）",
  "code": "// プロットの作成\nxs = Array.getSequence(5);\nys = newArray(0, 1, 4, 9, 16);\nPlot.create(\"二乗\", \"x\", \"y\", xs, ys);\nPlot.setLimits(0, 4, 0, 16);\nPlot.show();\nprint(\"プロットを作成しました\");",
  "intro": "準備は不要。プロットはモデル上のプロット状態として作成されます。Plot.create（タイトル、x軸ラベル、y軸ラベル、x値、y値）でプロットを作り、Plot.setLimits で軸の範囲を決め、Plot.show で表示します。x 値の連番は Array.getSequence で作っています。データの追加は Plot.add、値の取り出しは Plot.getValues が使えます。",
  "refs": [
   "newArray",
   "print",
   "Array.getSequence",
   "Plot.create",
   "Plot.setLimits",
   "Plot.show"
  ],
  "level": "高度"
 },
 {
  "id": "ij-adv-5",
  "title": "【高度】オーバーレイへの描画（Overlay）",
  "code": "// オーバーレイへの描画\nnewImage(\"work\", \"8-bit black\", 64, 64, 1);\nOverlay.moveTo(5, 5);\nOverlay.lineTo(50, 5);\nOverlay.lineTo(50, 30);\nOverlay.add();\nOverlay.setStrokeColor(\"red\");\nOverlay.drawRect(10, 10, 20, 15);\nOverlay.show();\nprint(\"オーバーレイを作成しました\");",
  "intro": "新しいモデル画像（64×64、8-bit、黒）をコード内で作成します。オーバーレイは画像の画素を書き換えずに図形を重ねる層です。Overlay.moveTo／lineTo で折れ線を描き、Overlay.add でオーバーレイへ追加し、Overlay.drawRect で矩形も追加します（公式の書式では Overlay.add や Overlay.show の括弧は省略できますが、付けても同じです）。線の色は Overlay.setStrokeColor でまとめて変えられます。選択そのものを追加する場合は Overlay.addSelection、測定は Overlay.measure が使えます。",
  "refs": [
   "newImage",
   "print",
   "drawRect",
   "lineTo",
   "moveTo",
   "Overlay.moveTo",
   "Overlay.lineTo",
   "Overlay.add",
   "Overlay.drawRect",
   "Overlay.show",
   "Overlay.setStrokeColor"
  ],
  "level": "高度"
 }
];
