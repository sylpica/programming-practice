# 一次資料の取得記録（Codex第1ラウンド）

公式Webホストの多くと公開サイトは、実行環境のHTTP許可先制限によりCONNECT 403。許可されているGitHub上の公式リポジトリ・一次資料のソースを確認した。Rはミラーであることを区別する。取得したことをもって、全項目を照合したとは扱わない。

本節目の取得本文はGit管理外のwork/audit/source-*.txt。後から同一本文か確かめられるようSHA-256を記載する。自動更新されるブランチURLなので、将来同じURLの内容が変わる可能性がある。

| 種類 | 取得元 | SHA-256 | 確認範囲・制限 |
| --- | --- | --- | --- |
| Excel VBA | https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/plus-operator.md | `2f29badf72cc0430e6931c898921980d74ff11cd293f50610a656e080760bb4a` | Variantと+演算子。VBA全66説明文の全件照合は未完。 |
| ImageJ | https://raw.githubusercontent.com/imagej/ImageJ/master/ij/macro/Functions.java | `b8e62f4fe54e2ea5de437a9be7e6073f3c60a883370a43216d7cd16cb9f531f9` | 組み込み関数の公式実装。log、外部ファイル一覧、run等を照合。全141説明の全件照合は未完。 |
| CloudFormation | https://raw.githubusercontent.com/awsdocs/aws-cloudformation-user-guide/main/doc_source/template-macros.md | `10a9eb4773078a527e80c4fd4d850a679dabaead9e8ccb6720999d0c4c2e7dd9` | 公式リポジトリのマクロ仕様。公開Web版との差分は未確認。 |
| CloudFormation | https://raw.githubusercontent.com/awsdocs/aws-cloudformation-user-guide/main/doc_source/intrinsic-function-reference-transform.md | `a44d54cd6863d3a6a0e6c5320a63a9c844d43a1148f6497d141a9fb8e7339b74` | Fn::Transformの兄弟スコープ。 |
| Power Automate | https://raw.githubusercontent.com/MicrosoftDocs/power-automate-docs/main/articles/desktop-flows/actions-reference/loops.md | `d8fe1fe475c5db7d788c19a62cf8bb99d1d4684bd7e5618afbb8d2b28d387ef8` | Loop / For each / 条件ループ。全アクション資料の確認は未完。 |
| AutoHotkey | https://raw.githubusercontent.com/AutoHotkey/AutoHotkeyDocs/v2/docs/Variables.htm | `77a6aa2088437e377772018af9a25af33636d672ab6b37456f660bfef7a3e9ca` | v2のA_Index・AND/OR・変数。 |
| AutoHotkey | https://raw.githubusercontent.com/AutoHotkey/AutoHotkeyDocs/v2/docs/lib/Loop.htm | `3200b3cb703a9a352afb2a1aa7797b174f5189deb366a905a5b8bd850ab3e34b` | A_Indexの開始・ネスト・変更の仕様。A_Indexへの代入はアプリでは明示停止。 |
| UI.Vision | https://raw.githubusercontent.com/A9T9/RPA/master/src/common/command.ts | `12ae864d662a35f73a14722a0cd17e0fd8bac04960a85f97e60426da27ba89bc` | 公式ソースのコマンド名と分類。Webマニュアルの全文照合は未完。 |
| Power Apps | https://raw.githubusercontent.com/MicrosoftDocs/power-platform/main/power-platform/power-fx/reference/function-forall.md | `d22b649cf23d76b508a72706264cbc0eeb163208562697ded0238504ad6e7b6e` | ForAllの評価順序・結果表順序。全Power Fx項目の文面照合は未完。 |
| Python | https://raw.githubusercontent.com/python/cpython/main/Doc/tutorial/classes.rst | `e322d827e7778530afb1fe832eace5588d8025e12315f2be7e7228a04c85ac41` | 単純インスタンス、クラス属性とメソッド、別名。CPython実行も併用。 |
| Python | https://raw.githubusercontent.com/python/cpython/main/Doc/reference/expressions.rst | `183b7b2f852d718a5c98751686e71d18b62d7d8ad6ad16901da6e1638dceed6b` | 式・属性・呼出し。組込み関数等は実物CPythonの実行を併用。 |
| R | https://raw.githubusercontent.com/wch/r-source/trunk/doc/manual/R-lang.texi | `8af09489987c96729d8216094d6ab9dc81a4f0d50b57d6a27ef57f2a4918c220` | Rソースの公式マニュアルのミラー。長いlogical添字・NULL添字。CRAN Web現行版の直接確認は未実施。 |
| C++ | https://raw.githubusercontent.com/cplusplus/draft/master/source/expressions.tex | `e657439ca868861d1c84864472ad865330be09e7efb15380e91cb6855cd8686c` | 標準ドラフトの整数・ポインタ・式。C11 N1570の直接取得は通信制限で未実施。 |
| C# | https://raw.githubusercontent.com/dotnet/docs/main/docs/csharp/language-reference/operators/arithmetic-operators.md | `168d744abe0d5a56f0c15b0acd77de955b2dc7788814af0250cadbc4464d7dfe` | 算術、整数除算、checked/unchecked。 |
| C# | https://raw.githubusercontent.com/dotnet/docs/main/docs/csharp/language-reference/builtin-types/arrays.md | `85873e8a29fe99fe2176507c780760ce17b24760ee875b820f3e937a4584b899` | 配列は参照型・要素型・初期値。 |
| C# | https://raw.githubusercontent.com/dotnet/csharpstandard/draft-v8/standard/expressions.md | `aab35e64e80f5f3e3240c4c7b92f09395d76708e5a53a73937436f406a7cc0c5` | 除算・剰余の最小整数/-1の実装依存性。0と決め打ちする変更は採用せず。 |
| JavaScript | https://raw.githubusercontent.com/tc39/ecma262/main/spec.html | `794b36e5b78cad1642ea8ceecb21b798225c853b4e3d7e7c96eb2581b24c23c0` | 論理演算の返却オペランド、ToNumeric、ビット演算、宣言・TDZ・構文。Node VMの独立オラクルを併用。 |
| JavaScript DOM | https://raw.githubusercontent.com/whatwg/dom/main/dom.bs | `b9b6e7cd0e1fb1606ae674e236aec727c4b2b82dba905ce1981d5efe48fe56b1` | IDによる要素取得、モデルにない要素をnullとすること。 |

Cの有効なサンプル4件・C++4件はGCC/G++による別実行でも一致した。これはC規格文書の全件照合や、未定義動作の実行値の保証を意味しない。Pythonの全10テンプレートの期待出力は、アプリの結果を見る前に実物CPythonでも導出した。

外部のAWS、Windows、メール、実DOMに接続・操作していない。PWAのiOS実機インストールは未実施。
