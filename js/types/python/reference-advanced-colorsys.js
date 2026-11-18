/* 高度モード B7 G7: colorsys のリファレンス（正規形）。
* 状態（status）は実装の裁定結果。出典は公式ドキュメント 3.15 と CPython 3.12.3 実走。 */
export const referenceAdvanced = [
 {
  "name": "colorsys.hls_to_rgb",
  "category": "色空間変換",
  "syntax": "hls_to_rgb(h, l, s)",
  "description": "HLS を RGB に変換する。",
  "example": "import colorsys\nprint(colorsys.hls_to_rgb(0.0, 0.5, 1.0))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/colorsys.html",
  "returns": "tuple: (r, g, b)"
 },
 {
  "name": "colorsys.hsv_to_rgb",
  "category": "色空間変換",
  "syntax": "hsv_to_rgb(h, s, v)",
  "description": "HSV を RGB に変換する。",
  "example": "import colorsys\nprint(colorsys.hsv_to_rgb(0.0, 1.0, 1.0))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/colorsys.html",
  "returns": "tuple: (r, g, b)"
 },
 {
  "name": "colorsys.rgb_to_hls",
  "category": "色空間変換",
  "syntax": "rgb_to_hls(r, g, b)",
  "description": "RGB を HLS（色相・輝度・彩度）に変換する。",
  "example": "import colorsys\nprint(colorsys.rgb_to_hls(1.0, 0.0, 0.0))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/colorsys.html",
  "returns": "tuple: (h, l, s)"
 },
 {
  "name": "colorsys.rgb_to_hsv",
  "category": "色空間変換",
  "syntax": "rgb_to_hsv(r, g, b)",
  "description": "RGB（各 0〜1）を HSV（色相・彩度・明度）に変換する。",
  "example": "import colorsys\nprint(colorsys.rgb_to_hsv(1.0, 0.0, 0.0))",
  "caution": "CPython の colorsys.py の式どおりに実装し、実走値と照合する。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/colorsys.html",
  "returns": "tuple: (h, s, v)"
 },
 {
  "name": "colorsys.rgb_to_yiq",
  "category": "色空間変換",
  "syntax": "rgb_to_yiq(r, g, b)",
  "description": "RGB を YIQ（NTSC の色空間）に変換する。係数は CPython の colorsys.py の値を使う。",
  "example": "import colorsys\nprint(colorsys.rgb_to_yiq(1.0, 0.0, 0.0))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/colorsys.html",
  "returns": "tuple: (y, i, q)"
 },
 {
  "name": "colorsys.yiq_to_rgb",
  "category": "色空間変換",
  "syntax": "yiq_to_rgb(y, i, q)",
  "description": "YIQ を RGB に変換する。結果は 0〜1 の範囲に切り取られる。",
  "example": "import colorsys\nprint(colorsys.yiq_to_rgb(0.299, 0.596, 0.211))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/colorsys.html",
  "returns": "tuple: (r, g, b)"
 }
];
