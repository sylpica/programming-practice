// 高度モード（ブロックB6）: <stdio.h> バッファ系の高度差分
// リファレンス項目（C班3）。全項目 status "supported"
// （意味論は lib-stdio-advanced.js）。
const S = (name, category, syntax, description, example, caution, returns, source) => ({
  name, category, syntax, description, example, caution,
  status: "supported", returns, source,
});

export const referenceAdvanced = [
  S("sprintf", "書式付き入出力", "int sprintf(char *str, const char *format, ...);",
    "書式に従って整形した文字列を、宛先の char 配列へ書き込みます（末尾にヌル文字が付きます）。書式の受理範囲は printf と同じ（%d %i %s %f %c %u %%）です。",
    'char buf[16];\nint r = sprintf(buf, "%d-%s", 42, "hi");\nprintf("%d %s", r, buf);',
    "整形結果＋ヌル文字が宛先の配列の残り要素数を超える場合は未定義動作として停止します（実環境でもバッファオーバーフローは未定義動作です）。宛先が配列の途中を指す場合は、残り要素数が基準になります。",
    "int（書き込んだ文字数。ヌル文字は含みません）",
    "https://en.cppreference.com/w/c/io/fprintf"),
  S("snprintf", "書式付き入出力", "int snprintf(char *str, size_t size, const char *format, ...);",
    "最大で size バイト（ヌル文字を含む）までを宛先へ書き込み、入り切らない分は切り捨てます。末尾のヌル文字は常に書かれます（size が 0 のときは何も書きません）。書式の受理範囲は printf と同じ（%d %i %s %f %c %u %%）です。",
    'char buf[8];\nint r = snprintf(buf, 8, "%s", "abcdefghij");\nprintf("%d %s", r, buf);',
    "戻り値は切り捨てがなければ書き込まれたはずの文字数で、宛先に入った文字数とは異なります。size が宛先の配列の残り要素数を超えていて、実際に書き込む量が残りを超える場合は未定義動作として停止します。",
    "int（切り捨てがなければ必要だった文字数。ヌル文字は含みません）",
    "https://en.cppreference.com/w/c/io/fprintf"),
  S("sscanf", "書式付き入出力", "int sscanf(const char *str, const char *format, ...);",
    "文字列から書式に従って値を読み取り、指定した代入先へ書き込みます。書式中の空白は入力の空白（0文字以上）を読み飛ばし、通常文字は入力との一致を要求します。",
    'int x;\nchar w[8];\nint r = sscanf("123 abc", "%d %s", &x, w);\nprintf("%d %d %s", r, x, w);',
    "モデルの対応範囲は変換 %d %i %f %s %c %u %%、抑止（*）、%s／%c への幅指定のみです。長さ修飾子（%ld 等）や %n などは未対応として停止します。%s の書き込みが代入先の配列を超える場合は未定義動作として停止します。",
    "int（代入した項目数。最初の変換前に入力が尽きた場合は -1（EOF））",
    "https://en.cppreference.com/w/c/io/fscanf"),
];

// 基礎に同名の項目は無いため上書き定義は空（契約第5章(b)）。
export const referenceOverrides = [];
