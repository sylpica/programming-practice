// 高度モード（ブロックB6）: C の高度差分テンプレート（追加分のみ）。
// 形は基礎テンプレートと同じ { id, title, code, refs, ... }。
// 担当班 C4（ワイド文字／変換系）。全 8 件とも基礎機能（printf）と
// 自班の実装（<wctype.h> の分類・変換、<wchar.h>／<uchar.h> の
// 変換系）だけで完結し、エンジンで最後まで実行できることを
// tests/muse-adv-b6-wide.test.js で確認済み。
export const templatesAdvanced = [
  {
    id: "c-adv-wide-classify",
    title: "ワイド文字分類で文字の種類を数える",
    level: "応用",
    code: "#include <stdio.h>\n#include <wctype.h>\nint main() {\n    int codes[6] = {72, 105, 51, 32, 33, 10};\n    int alpha = 0;\n    int digit = 0;\n    int space = 0;\n    int punct = 0;\n    for (int i = 0; i < 6; i++) {\n        if (iswalpha(codes[i])) { alpha++; }\n        if (iswdigit(codes[i])) { digit++; }\n        if (iswspace(codes[i])) { space++; }\n        if (iswpunct(codes[i])) { punct++; }\n    }\n    printf(\"%d %d %d %d\\n\", alpha, digit, space, punct);\n    return 0;\n}",
    intro: "文字コードの配列を iswalpha／iswdigit／iswspace／iswpunct で分類し、英字2・数字1・空白類2・記号1を数えます。ロケールは \"C\" 固定のため ASCII の範囲で判定されます。",
    refs: ["iswalpha", "iswdigit", "iswspace", "iswpunct", "printf"],
  },
  {
    id: "c-adv-wide-case",
    title: "towlower／towupper で大文字・小文字を変換する",
    level: "応用",
    code: "#include <stdio.h>\n#include <wctype.h>\nint main() {\n    char lower[4];\n    char upper[4];\n    lower[0] = towlower('A');\n    lower[1] = towlower('b');\n    lower[2] = towlower('C');\n    lower[3] = 0;\n    upper[0] = towupper('a');\n    upper[1] = towupper('B');\n    upper[2] = towupper('c');\n    upper[3] = 0;\n    printf(\"%s %s\\n\", lower, upper);\n    return 0;\n}",
    intro: "towlower で \"abc\"、towupper で \"ABC\" を組み立てます。変換対象でない文字はそのまま返ります。",
    refs: ["towlower", "towupper", "printf"],
  },
  {
    id: "c-adv-wide-btowc",
    title: "btowc と wctob で 1 バイト文字と往復変換する",
    level: "応用",
    code: "#include <stdio.h>\n#include <wchar.h>\nint main() {\n    int w = btowc('A');\n    int b = wctob(w);\n    printf(\"%d %c\\n\", w, b);\n    printf(\"%d %d\\n\", btowc(-1), wctob(12354));\n    return 0;\n}",
    intro: "btowc('A') は 65、wctob で戻すと 'A' です。EOF は WEOF(-1) になり、1 バイトで表せない文字（12354 は「あ」）は wctob が EOF(-1) を返します。",
    refs: ["btowc", "wctob", "printf"],
  },
  {
    id: "c-adv-wide-wcrtomb",
    title: "wcrtomb で char 配列に文字列を組み立てる",
    level: "応用",
    code: "#include <stdio.h>\n#include <wchar.h>\nint main() {\n    char buf[8];\n    buf[3] = 0;\n    int n = 0;\n    n += (int)wcrtomb(buf, 72, NULL);\n    n += (int)wcrtomb(buf + 1, 105, NULL);\n    n += (int)wcrtomb(buf + 2, 33, NULL);\n    printf(\"%s %d\\n\", buf, n);\n    return 0;\n}",
    intro: "ワイド文字の値 72・105・33 を wcrtomb で 1 バイトずつ変換し、\"Hi!\" と合計バイト数 3 を得ます。変換状態は NULL（内部状態なし）で使います。",
    refs: ["wcrtomb", "printf"],
  },
  {
    id: "c-adv-wide-mblen",
    title: "wctomb で書き、mblen／mbrlen で長さを調べる",
    level: "応用",
    code: "#include <stdio.h>\n#include <stdlib.h>\n#include <wchar.h>\nint main() {\n    char buf[8];\n    buf[1] = 0;\n    int w = wctomb(buf, 65);\n    int a = mblen(buf, 8);\n    int b = mbrlen(buf, 8, NULL);\n    printf(\"%d %d %d %s\\n\", w, a, b, buf);\n    return 0;\n}",
    intro: "wctomb で 'A' を書き（戻り値 1）、同じ先頭バイトの長さを mblen と mbrlen で調べます。\"C\" ロケールではどちらも 1 です。",
    refs: ["wctomb", "mblen", "mbrlen", "printf"],
  },
  {
    id: "c-adv-wide-uchar",
    title: "c16rtomb／c32rtomb で ASCII 文字を変換する",
    level: "応用",
    code: "#include <stdio.h>\n#include <uchar.h>\nint main() {\n    char a[4];\n    char b[4];\n    a[1] = 0;\n    b[1] = 0;\n    int x = (int)c16rtomb(a, 65, NULL);\n    int y = (int)c32rtomb(b, 66, NULL);\n    printf(\"%s %s %d %d\\n\", a, b, x, y);\n    return 0;\n}",
    intro: "char16_t の値 65 と char32_t の値 66 を、それぞれマルチバイト文字 'A'・'B' へ変換します。\"C\" ロケールでは ASCII の範囲だけ変換できます。",
    refs: ["c16rtomb", "c32rtomb", "printf"],
  },
  {
    id: "c-adv-wide-eilseq",
    title: "変換できないワイド文字を戻り値で判定する",
    level: "応用",
    code: "#include <stdio.h>\n#include <wchar.h>\nint main() {\n    char buf[8];\n    int r = (int)wcrtomb(buf, 12354, NULL);\n    if (r == -1) {\n        printf(\"cannot convert\\n\");\n    } else {\n        printf(\"converted\\n\");\n    }\n    return 0;\n}",
    intro: "「あ」（12354）は \"C\" ロケールではマルチバイト文字へ変換できないため、wcrtomb は (size_t)-1（モデルでは -1）を返し、cannot convert と表示されます（EILSEQ）。",
    refs: ["wcrtomb", "printf", "if"],
  },
  {
    id: "c-adv-wide-ident",
    title: "iswalpha／iswalnum で識別子の形を判定する",
    level: "応用",
    code: "#include <stdio.h>\n#include <wctype.h>\nint main() {\n    int name[4] = {97, 49, 95, 50};\n    int ok = iswalpha(name[0]) || name[0] == 95;\n    for (int i = 1; i < 4; i++) {\n        if (!iswalnum(name[i]) && name[i] != 95) { ok = 0; }\n    }\n    printf(\"%d\\n\", ok);\n    return 0;\n}",
    intro: "文字コード列 a・1・_・2 が「英字または _ で始まり、英数字と _ が続く」という識別子の形を満たすか判定し、1 と表示されます。",
    refs: ["iswalpha", "iswalnum", "printf"],
  },
];
