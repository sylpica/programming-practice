# B7 追補 R6 報告書（G10 属性代入・G12 mock 配線）

担当：G10 の impl ファイル（xml.etree.ElementTree／email.message）と
G12 の impl ファイル（unittest.mock）への、基盤追加フック
（setattr／attrFallback）の配線。エンジン本体・manifest は未編集。
GitHub 書き込みなし（ローカルコミットのみ）。

## 1. 実施内容と区分別件数

### 属性代入（setattr フック配線）— 3クラス群

| 対象 | 配線した属性 | 根拠（CPython 3.12.3 実走） |
|---|---|---|
| `xml.etree.ElementTree.Element` | text／tail／tag／attrib（未知属性名は AttributeError） | 代入が読み戻しと `tostring(encoding="unicode")` に反映されることを実走で確認。未知属性への代入も CPython では AttributeError |
| `xml.etree.ElementTree.QName` | text（その他は属性バッグ） | `q.text = ...` が読み戻し・str に反映されることを実走で確認 |
| `email.message` の Message／EmailMessage／MIMEPart（共通 makeDef） | preamble／epilogue／defects（その他は属性バッグ） | EmailMessage の preamble／epilogue 代入の読み戻しを実走で確認 |

- attrs ゲッターが属性バッグより優先される基盤仕様のため、代入は
  データ本体へ書き戻す形にした。Element は生成・パース・SubElement・
  TreeBuilder の全経路が同一の ElementDef を共有するため一括で効く。

### 代入不可として配線しなかったもの（CPython 自体が代入不可）

実走で次を確認したため、配線対象外とした（現行の属性バッグ保持は
基盤の既定挙動として残存し、CPython の AttributeError とは差異が
あるが、基盤側の全クラス共通挙動のため R6 では変更しない）：

- `http.cookies.Morsel` の value／coded_value：プロパティに setter が
  無く `AttributeError: property 'value' of 'Morsel' object has no setter`。
- `email.policy` の Policy 属性（例 max_line_length）：read-only で
  AttributeError。
- `email.headerregistry.Address`／Group の属性：setter 無しプロパティで
  AttributeError。

### unittest.mock 子モック配線 — impl-advanced-unittest-mock.js

- 子モック自動生成：未知属性の読み取りで子モックを生成し、同じ属性は
  同じ子を返す（キャッシュ）。子の限定名は親と同じ（Mock→Mock、
  MagicMock→MagicMock、NonCallableMock→NonCallableMock）。
- 解決経路が2つあるための二重配線：
  - 属性読み取り経路：基盤の `attrFallback` フック。
  - メソッド呼び出し構文（`m.foo(...)`）の経路：基盤の
    stdlibNativeCall は attrFallback を経由せず def.attrs を引くため、
    attrs を Proxy（dynAttrs）化し、未知 名のゲッターが
    「属性バッグ（代入値）→子モック生成」の順で解決するようにした。
    メソッド名・実在属性名・ダンダー名は対象外とし従来経路に委ねる。
    _Call の属性連鎖（`call.foo.bar(1)`）にも同じ仕組みを適用。
- 呼び出しの伝播：子の呼び出しが祖先の method_calls／mock_calls に
  ドットパス付き _Call として伝播する。`assert_has_calls` は
  CPython と同様 mock_calls を照合対象に変更。`_Call` の等価比較に
  パスと kwargs を追加。
- 属性代入：setattr フックで return_value／side_effect はデータ本体へ、
  それ以外は属性バッグへ（代入値が子モック生成より優先される）。
- 併せて実装：`attach_mock`（既存モックの取り付けと伝播）、
  `configure_mock` のドット記法キー（`'foo.return_value'` 等）と
  dict 形式、`reset_mock` の子・return_value への再帰リセット、
  `sentinel` の子センチネル生成（attrFallback、同一属性は同一物）。

### リファレンス status の引き上げ（テストで裏付けできた範囲のみ）

- `unittest.mock.Mock.attach_mock`：unverified → supported
- `unittest.mock.sentinel`：unverified → supported

いずれも example を実行可能な形に差し替え、G12 の F-04（supported
全件の例実行）で検証済み。その他の unverified 項目（patch 群、
create_autospec、mock_open、seal、AsyncMock 群、
`Mock._get_child_mock` 等）は据え置き。

## 2. 照合方法

- CPython 3.12.3 実走：Element の text／tail／tag／attrib 代入と
  tostring 出力、未知属性代入の AttributeError、QName.text 代入、
  EmailMessage の preamble／epilogue 代入、Morsel／Policy／Address の
  代入不可、Mock の子生成・同一性・return_value 連鎖・method_calls／
  mock_calls の内容、attach_mock、configure_mock のドット記法、
  reset_mock の子リセット。
- 既存の既知差異（tostring の属性順など）は対象外とし、text／tail
  代入の反映のみを照合した（自己終了タグは本実装・CPython とも
  `<b />` 形式で一致）。

## 3. テスト結果

- 新規：`tests/muse-adv-b7-r6.test.js` 12件（Element 代入4件＋
  QName・email 各1件、mock 6件）— 全合格。
- 既存：基盤テスト＋G10＋G12＋R6 で 104件 全合格。
- 全スイート（tests/*.test.js）：5990／5992 合格。失敗2件は
  B7-U の u-runtime 件数不整合で、変更前のツリーでも同一に失敗する
  既存不整合（R6 の対象外、統合コーディネーターへ申し送る）。

## 4. 残存・既知の差異

- return_value 経由の呼び出し（`m()()` 形式）の親 mock_calls への
  伝播は未実装。return_value 自体の記録（call_count 等）は従来どおり。
- `call(1).foo(2)` 形式の連鎖は中間の引数を repr／等価比較に保持
  できない（パスのみ引き継ぐ簡略形）。`call.foo.bar(1)` 形式は完全対応。
- Element の text／tail へ非文字列を代入した場合、CPython では
  シリアライズ時に初めて TypeError になるが、本実装は代入時に
  str 化して保持する。
- 基盤要請：stdlibNativeCall が attrFallback（と属性バッグ）を
  経由するようになれば、mock／_Call の dynAttrs 併用は不要になる。
  現状は impl 側の併用で到達性を確保した。
- Morsel／Policy／Address の代入は基盤既定の属性バッグ保持のため
  CPython（AttributeError）とは異なる読み戻しになる。setattr フックで
  例外化するかは全クラス共通の基盤方針に関わるため、コーディネーター
  の裁定を仰ぐ。
