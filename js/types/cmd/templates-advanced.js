export const templatesAdvanced = [
  {
    id: "cmd-adv-pushd",
    title: "pushd/popdでフォルダを往復する",
    level: "応用",
    code: "@echo off\npushd logs\necho %CD%\npopd\necho %CD%",
    intro: "pushdで現在のフォルダを保存してlogsへ移り、popdで元のフォルダへ戻ります。%CD%で現在フォルダを確認します。",
    refs: ["pushd", "popd", "動的変数", "echo"],
  },
  {
    id: "cmd-adv-text",
    title: "sortとfindstrでテキストを処理する",
    level: "実践",
    code: "@echo off\nfindstr \"学習\" notes.txt\nsort data.csv",
    intro: "findstrでnotes.txtから「学習」を含む行を探し、sortでdata.csvの行を並べ替えます。どちらもモデルのファイルだけを対象にします。",
    refs: ["findstr", "sort"],
  },
  {
    id: "cmd-adv-attrib",
    title: "attribで属性を確認・変更する",
    level: "実践",
    code: "@echo off\nattrib notes.txt\nattrib +r notes.txt\nattrib notes.txt",
    intro: "notes.txtの属性を表示し、読み取り専用属性（+r）を付けてから、もう一度表示して変化を確認します。属性はモデルのファイルエントリに保持されます。",
    refs: ["attrib"],
  },
];
