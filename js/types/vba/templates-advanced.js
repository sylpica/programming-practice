// 高度モード B4：VBA 高度テンプレート（高度差分）。基礎層と同形式。
// コードは基礎＋高度の supported 項目だけで構成する（未対応項目は使わない）。
export const templatesAdvanced = [
  {
    id: "vba-adv-deadline",
    title: "期限計算 · 30日後の日付と日数",
    code: `Sub 期限計算()
    Dim startDate
    Dim dueDate
    startDate = DateSerial(2026, 1, 15)
    dueDate = DateAdd("d", 30, startDate)
    Debug.Print dueDate
    Debug.Print DateDiff("d", startDate, dueDate)
End Sub`,
    intro:
      "DateSerialで開始日を作り、DateAddで30日後の期限を求めます。DateDiffで2つの日付の間にある日の区切りの数（30）を確認します。",
    refs: ["DateSerial", "DateAdd", "DateDiff", "Debug.Print"],
  },
  {
    id: "vba-adv-format",
    title: "表示整形 · 数値と日付の書式",
    code: `Sub 表示整形()
    Dim price As Long
    price = 1234567
    Debug.Print Format(price, "#,##0")
    Debug.Print FormatNumber(1234.567, 2)
    Debug.Print FormatDateTime(DateSerial(2026, 1, 15), vbShortDate)
End Sub`,
    intro:
      "Formatのユーザー定義書式で桁区切りを付け、FormatNumberで小数2桁に整え、FormatDateTimeで日付を短い書式の文字列にします。",
    refs: ["Format", "FormatNumber", "FormatDateTime", "DateSerial", "Debug.Print"],
  },
  {
    id: "vba-adv-split-join",
    title: "文字列処理 · 分割と結合",
    code: `Sub 単語処理()
    Dim parts As Variant
    Dim i As Long
    parts = Split("りんご,みかん,ぶどう", ",")
    For i = LBound(parts) To UBound(parts)
        Debug.Print parts(i)
    Next i
    Debug.Print Join(parts, " / ")
End Sub`,
    intro:
      "Splitでカンマ区切りの文字列を配列に分け、要素を順に表示したあと、Joinで別の区切り文字でつなぎ直します。",
    refs: ["Split", "Join", "LBound", "UBound", "For", "Next", "Debug.Print"],
  },
  {
    id: "vba-adv-loan",
    title: "ローン計算 · 毎月の返済額",
    code: `Sub ローン計算()
    Dim monthly As Double
    monthly = Pmt(0.005, 12, 100000)
    Debug.Print monthly
    Debug.Print IPmt(0.005, 1, 12, 100000)
    Debug.Print PPmt(0.005, 1, 12, 100000)
End Sub`,
    intro:
      "Pmtで月利率0.5%・12回払い・借入100,000の毎月の返済額を求め、IPmtとPPmtで1回目の利息部分と元金部分に分けます。支払額は負の数で返ります。",
    refs: ["Pmt", "IPmt", "PPmt", "Debug.Print"],
  },
  {
    id: "vba-adv-branch",
    title: "分岐 · ChooseとSwitch",
    code: `Sub 評価判定()
    Dim score As Long
    score = 85
    Debug.Print Choose(3, "C", "B", "A", "S")
    Debug.Print Switch(score >= 80, "合格", score >= 60, "再挑戦", True, "復習しよう")
End Sub`,
    intro:
      "Chooseは番号で選択肢を選び、Switchは条件と値の組から最初に当てはまるものを選びます。最後の条件にTrueを置くと、どれにも当てはまらない場合の値として使えます。",
    refs: ["Choose", "Switch", "Debug.Print"],
  },
];
