# VBA練習アプリ

Excelを開かずに、VBAで「何が起きるか」を学ぶ静的Webアプリです。HTML / CSS / JavaScriptのみ。ビルド・ログイン・外部CDNは不要です。

公開先（Pages設定後）：https://sylpica.github.io/VBA/

## 使い方

```sh
python3 -m http.server 4173
# http://localhost:4173 を開く
```

JavaScriptのモジュールとWorkerを使うため、ファイルを直接ダブルクリックする方法ではなく、HTTP(S)で開いてください。初回オンライン表示後はService Workerでオフライン再読み込み・解析が可能です。iOS用180×180 PNGと192 / 512 PNGを含みます。

- コード練習：エディタ、実行 / 自動実行、編集できるA1:C5のモデルシート。
- シミュレーション：行別の手順、分岐パスの移動・ソート、Debug.Print / MsgBoxの出力、下側の変数・セル変更。
- リファレンス：66項目。コード全体または表示パスで使用する項目はエディタ右側へ出現順に表示。
- テンプレート：8本。選択時に読み込み・実行し、説明と関連項目を展開表示。
- 用語集：関数の書式と分けた基本用語。
- .bas / .txt取り込み：ボタンとドロップで同じ処理を使用。ファイル名・文字コード・上書きの確認、バイナリ除外。UTF-8、BOM付きUTF-16LE / BE、Shift_JISに対応。

コードとモデル値はブラウザのlocalStorageに保存します。入力を外部へ送信する処理はありません。

## 説明エンジン

`js/engine.js` は字句解析 → 式の優先順位解析 → ブロックAST → 経路探索で説明します。利用者のコードをJavaScriptへ変換して実行することはありません。

確定している条件は片側だけ、未確定条件は制約が矛盾しない側だけを探索します。数値の上下限・整数領域・一致 / 不一致、And / Or / Not、単一の未確定値の線形式に対応します。入力値は捏造しません。判定できない構文は停止して未対応と表示します。

上限：2,000パス、100,000探索操作、1.2秒、各パス600手順、確定ループ100回。解析は専用Worker内で行い、UI側にも2.5秒の終了処理があります。未確定ループは0 / 1 / 2回で終わる到達可能な経路と継続可能性を表示し、継続側の後続結果を捏造しません。

### 対応範囲

単一の引数なしSubまたは文だけのコード、Dim、Option Explicit / Base、代入 / Set、1次元固定配列 / Array、複数行If / ElseIf / Else、Select Case（Is / To / 複数Case値）、For / Step / For Each、Do While / Until（前・後判定）、Exit For / Do / Sub、On Error Resume Next / GoTo 0、Err.Number。Range / CellsはA1:C5の単一シートです。

代表的な型変換・文字列・数値関数はリファレンスの「シミュレーション対応」表示を参照してください。型はVariant / String / Boolean / Integer / Long / Single / Doubleと限定したオブジェクト宣言に対応します。

### 明示して停止する範囲

複数Sub・引数付きSub・ユーザー定義関数、With、GoTo、On Error GoToラベル、動的 / 多次元配列、1行If、行継続、型接尾辞、日付リテラル、外部ブック / 実ファイル / 複数シート、複数セルのValue読み取り等。Workbook / Worksheet / Offsetなどは参照用項目を含みます。

未確定Step、複数の未確定値同士・非線形式の比較、String型と数値型の直接比較も停止します。比較はCStr / CDbl等で型を明示できます。地域依存の数値・日付書式、Excelのセル型・書式・数式・エラー値の完全な再現は対象外です。VBA処理系全体の互換実装ではありません。

## 検証

```sh
npm test
# Python Playwright + Chromiumを利用できる環境では:
python tests/browser.py
# 別URLを対象にする場合:
VBA_TEST_URL=http://localhost:4173 python tests/browser.py
```

Node標準テストランナーのため `npm install` は不要です。ブラウザ試験のみPython PlaywrightとChromiumを別途必要とします。ブラウザ試験は、本体と別の使い捨てコンテキストを使用します。

[監査記録](docs/AUDIT.md)に観点・修正・検証の限界をまとめています。

## GitHub Pages

`.github/workflows/pages.yml` はmainへのpushと手動実行に対応します。テスト後、Pagesが有効なら必要な静的ファイルだけをデプロイします。Pagesが無効なら検証は行い、公開処理をスキップして警告します。

初回はリポジトリの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選び、Actionsの **Validate and deploy GitHub Pages → Run workflow** を実行してください。以降のmainへのpushは検証と公開をまとめて行います。

Service Workerを更新するリリースでは `sw.js` のCACHE名を更新してください。旧キャッシュはアプリに固有の接頭辞に限定して削除します。

## 参照

- [Python練習アプリ](https://github.com/sylpica/Python)
- [ImageJ学習アプリ](https://github.com/sylpica/imageJ)
- [Microsoft VBA 比較演算子](https://learn.microsoft.com/office/vba/language/reference/user-interface-help/comparison-operators)
- [Microsoft VBA + 演算子](https://learn.microsoft.com/office/vba/language/reference/user-interface-help/plus-operator)
- [Microsoft VBA Dim](https://learn.microsoft.com/office/vba/language/reference/user-interface-help/dim-statement)
