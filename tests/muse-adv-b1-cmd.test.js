import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/cmd/index.js";
import {
  advancedCommandHandlers,
  advancedStops,
  advancedAliasStops,
  advancedCommandNames,
} from "../js/types/cmd/advanced-engine.js";
import { referenceAdvanced as cmdRefAdv } from "../js/types/cmd/reference-advanced.js";

const refItem = (name) => cmdRefAdv.find((r) => r.name === name);

const run = (code, extra = {}, limits) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra }, limits);
const errors = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean),
  out = (r) => r.paths.map((p) => p.outputs.map((o) => o.text)),
  flat = (r) => out(r).flat(2),
  err = (r) => errors(r)[0],
  files = (r, i = 0) => r.paths[i].model.files,
  file = (r, path, i = 0) =>
    files(r, i).find((e) => e.path.toLowerCase() === path.toLowerCase());

// ---------------------------------------------------------- 棚卸しとの整合
test("adv cmd handlers cover the 29 new commands and stops cover 269", () => {
  assert.equal(Object.keys(advancedCommandHandlers).length, 29);
  assert.equal(advancedStops.length, 269);
  assert.ok(advancedStops.every((s) => s.status === "unsupported" && s.reason));
  // 複合名が含まれていること
  for (const n of ["sc config", "net user", "add volume", "winsat mem"])
    assert.ok(advancedStops.some((s) => s.name === n), n);
  // 実装済み・基礎コマンドが停止一覧に混ざっていないこと
  for (const n of ["attrib", "echo", "copy", "pushd", "xcopy", "setx"])
    assert.equal(
      advancedStops.some((s) => s.name === n),
      n === "setx",
      n,
    );
  assert.ok(advancedCommandNames.includes("chdir"));
  assert.ok(advancedCommandNames.includes("sc config"));
});

// ---------------------------------------------------------- attrib
test("adv attrib sets, clears and displays attributes on the virtual FS", () => {
  let r = run("attrib +r notes.txt\nattrib notes.txt");
  assert.deepEqual(errors(r), []);
  assert.match(flat(r)[0], /^R\s/);
  assert.deepEqual(file(r, "C:\\Practice\\notes.txt").attributes, ["R"]);
  r = run("attrib +r +h notes.txt\nattrib -r notes.txt\nattrib notes.txt");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(file(r, "C:\\Practice\\notes.txt").attributes, ["H"]);
  // 基礎データ（sampleFiles）には属性が付いていないこと
  r = run("attrib notes.txt");
  assert.deepEqual(file(r, "C:\\Practice\\notes.txt").attributes, undefined);
});
test("adv attrib rejects unknown attributes and missing targets", () => {
  assert.match(err(run("attrib +z notes.txt")).message, /未対応：attribの属性/);
  assert.equal(err(run("attrib missing.txt")).category, "実行エラー");
  assert.match(err(run("attrib +r")).message, /未対応：attrib/);
});

// ---------------------------------------------------------- break / ver / vol / date / time
test("adv break is a no-op and ver/vol/date/time output unknown values", () => {
  let r = run("break\necho ok");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["ok"]]);
  for (const code of ["ver", "vol", "date", "date /t", "time", "time /t"]) {
    r = run(code);
    assert.deepEqual(errors(r), [], code);
    assert.ok(r.paths[0].outputs.every((o) => o.uncertain), code);
  }
  assert.match(err(run("date 2027-01-01")).message, /未対応：dateによる日付の設定/);
  assert.match(err(run("time 12:00")).message, /未対応：timeによる時刻の設定/);
});

// ---------------------------------------------------------- choice
test("adv choice maps a specified input to its 1-based ERRORLEVEL index", () => {
  let r = run("choice /c YN\nif errorlevel 2 echo NO", {
    inputs: { choice: "N" },
  });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["[Y,N]?", "NO"]]);
  assert.equal(r.paths[0].cmd.errorlevel, 2);
  r = run("choice /c ABC", { inputs: { choice: ["A", "C"] } });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(
    r.paths.map((p) => p.cmd.errorlevel),
    [1, 3],
  );
});
test("adv choice invalid input becomes ERRORLEVEL 255 and unspecified branches by unknown ERRORLEVEL", () => {
  let r = run("choice /c YN", { inputs: { choice: "X" } });
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.errorlevel, 255);
  r = run("choice /c YN\nif errorlevel 2 echo NO\nif errorlevel 1 echo SOME");
  assert.deepEqual(errors(r), []);
  // ERRORLEVEL が 0 / 1 / 2 の場合分けがパスとして現れる
  assert.equal(r.paths.length, 3);
  assert.ok(out(r).some((o) => o.includes("NO") && o.includes("SOME")));
  assert.ok(out(r).some((o) => !o.includes("NO") && o.includes("SOME")));
  assert.ok(out(r).some((o) => !o.includes("NO") && !o.includes("SOME")));
});

// ---------------------------------------------------------- cmd
test("adv cmd /c restores environment and carries ERRORLEVEL", () => {
  let r = run('set X=outer\ncmd /c "set X=inner"\necho %X%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["outer"]]);
  r = run('cmd /c "exit /b 5"\necho %ERRORLEVEL%');
  assert.deepEqual(out(r), [["5"]]);
  r = run('cmd /c "cd logs"\necho %CD%');
  assert.deepEqual(out(r), [["C:\\Practice"]]);
  r = run('cmd /q /c "echo hi"');
  assert.deepEqual(out(r), [["hi"]]);
});
test("adv cmd interactive and /k forms stop by name", () => {
  assert.match(err(run("cmd /k echo hi")).message, /未対応：cmdのこの形式/);
  assert.match(err(run("cmd")).message, /未対応：cmdのこの形式/);
});

// ---------------------------------------------------------- color / verify / title / prompt / path
test("adv color stores state and same fore/back gives ERRORLEVEL 1", () => {
  let r = run("color 1f");
  assert.equal(r.paths[0].cmd.colorValue, "1F");
  assert.equal(r.paths[0].cmd.errorlevel, 0);
  r = run("color 11\necho %ERRORLEVEL%");
  assert.deepEqual(out(r), [["1"]]);
  r = run("color 1f\ncolor");
  assert.equal(r.paths[0].cmd.colorValue, undefined);
  assert.match(err(run("color xyz")).message, /未対応：colorの引数/);
});
test("adv verify, title and prompt keep visible state in s.cmd", () => {
  let r = run("verify");
  assert.deepEqual(out(r), [["VERIFY is off."]]);
  r = run("verify on\nverify");
  assert.deepEqual(out(r), [["VERIFY is on."]]);
  assert.equal(r.paths[0].cmd.verifyState, true);
  r = run("title My Window");
  assert.equal(r.paths[0].cmd.windowTitle, "My Window");
  r = run("prompt ABC\necho %PROMPT%");
  assert.deepEqual(out(r), [["ABC"]]);
  assert.equal(r.paths[0].cmd.promptText, "ABC");
  r = run("prompt ABC\nprompt\necho %PROMPT%");
  assert.deepEqual(out(r), [["$P$G"]]);
});
test("adv path displays, sets and clears the PATH variable", () => {
  let r = run("path C:\\Tools\npath");
  assert.deepEqual(out(r), [["PATH=C:\\Tools"]]);
  r = run("path C:\\Tools\npath ;\npath");
  assert.deepEqual(out(r), [[""]]);
  assert.equal(r.paths[0].vars.PATH, undefined);
});

// ---------------------------------------------------------- pushd / popd / shift
test("adv pushd and popd use the directory stack in s.cmd", () => {
  const r = run("pushd logs\necho %CD%\npopd\necho %CD%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\logs", "C:\\Practice"]]);
  assert.deepEqual(r.paths[0].cmd.dirStack, []);
  const r2 = run("popd\necho ok");
  assert.deepEqual(errors(r2), []);
  assert.deepEqual(out(r2), [["ok"]]);
  assert.equal(err(run("pushd nodir")).category, "実行エラー");
});
test("adv shift moves batch arguments including /n form", () => {
  let r = run("call :s a b c\ngoto :eof\n:s\nshift\necho %1 %2");
  assert.deepEqual(out(r), [["b c"]]);
  r = run("call :s a b c\ngoto :eof\n:s\nshift /2\necho %1 %2");
  assert.deepEqual(out(r), [["a c"]]);
  assert.match(err(run("call :s a\ngoto :eof\n:s\nshift /0")).message, /未対応：shift \/0/);
});

// ---------------------------------------------------------- timeout / doskey / help / more
test("adv timeout does not wait and -1 stops by name", () => {
  const r = run("timeout /t 3 /nobreak\necho done");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["done"]]);
  assert.equal(r.paths[0].cmd.errorlevel, 0);
  assert.match(err(run("timeout /t -1")).message, /未対応：timeout \/t -1/);
  assert.match(err(run("timeout")).message, /timeoutには \/t/);
});
test("adv doskey definition is note-only in batch and queries stop by name", () => {
  const r = run("doskey hi=echo hello\necho done");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["done"]]);
  assert.equal(r.paths[0].cmd.doskeyMacros.hi, "echo hello");
  assert.match(err(run("doskey /macros")).message, /未対応：doskeyの照会・管理形式/);
  assert.match(err(run("doskey /history")).message, /未対応：doskeyの照会・管理形式/);
});
test("adv help lists model commands and stopped names stop honestly", () => {
  const r = run("help");
  assert.deepEqual(errors(r), []);
  for (const n of ["attrib", "pushd", "xcopy", "echo"])
    assert.ok(flat(r).includes(n), n);
  assert.deepEqual(out(run("help attrib")), [["attrib はこのモデルで対応しています"]]);
  assert.match(err(run("help hostname")).message, /未対応：hostname/);
});
test("adv more outputs file content and pipe input unchanged", () => {
  assert.deepEqual(out(run("more notes.txt")), [["学習メモ\r\n"]]);
  assert.deepEqual(out(run("echo abc|more")), [["abc\r\n"]]);
  assert.match(err(run("more")).message, /未対応：moreのコンソール入力/);
});

// ---------------------------------------------------------- sort / findstr
test("adv sort sorts lines from files, stdin and /o output", () => {
  assert.deepEqual(out(run("sort data.csv")), [["Alice,80", "Name,Score"]]);
  assert.deepEqual(out(run("sort /r data.csv")), [["Name,Score", "Alice,80"]]);
  const r = run("sort /o sorted.txt data.csv\ntype sorted.txt");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Alice,80\r\nName,Score\r\n"]]);
  assert.match(err(run("sort /m 10 data.csv")).message, /未対応：sortのオプション/);
});
test("adv findstr searches files and stdin with ERRORLEVEL 0/1", () => {
  let r = run('findstr "学習" notes.txt\necho %ERRORLEVEL%');
  assert.deepEqual(out(r), [["学習メモ", "0"]]);
  r = run('findstr "zzz" notes.txt\necho %ERRORLEVEL%');
  assert.deepEqual(out(r), [["1"]]);
  r = run('findstr /i /n "alice" data.csv');
  assert.deepEqual(out(r), [["2:Alice,80"]]);
  r = run('findstr "^Name" data.csv');
  assert.deepEqual(out(r), [["Name,Score"]]);
  r = run('echo hello|findstr "ell"');
  assert.deepEqual(out(r), [["hello"]]);
  assert.match(err(run('findstr /g:defs.txt "x" notes.txt')).message, /未対応：findstrのオプション/);
});

// ---------------------------------------------------------- comp / fc
test("adv comp compares byte-by-byte with OK and size-mismatch results", () => {
  let r = run("comp notes.txt notes.txt");
  assert.deepEqual(out(r), [["Files compare OK"]]);
  assert.equal(r.paths[0].cmd.errorlevel, 0);
  r = run("comp notes.txt readme.txt");
  assert.ok(flat(r).includes("Files are different sizes"));
  assert.equal(r.paths[0].cmd.errorlevel, 1);
  r = run("copy notes.txt a.txt\ncomp a.txt notes.txt");
  assert.ok(flat(r).includes("Files compare OK"));
});
test("adv fc reports identical, different and missing with exit codes 0/1/2", () => {
  let r = run("fc notes.txt notes.txt\necho %ERRORLEVEL%");
  assert.deepEqual(out(r), [["FC: no differences encountered", "0"]]);
  r = run("fc notes.txt readme.txt\necho %ERRORLEVEL%");
  assert.equal(r.paths[0].cmd.errorlevel, 1);
  assert.ok(flat(r).some((x) => x.includes("*****")));
  r = run("fc missing.txt notes.txt\necho %ERRORLEVEL%");
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.errorlevel, 2);
  r = run("fc /b notes.txt notes.txt");
  assert.deepEqual(out(r), [["FC: no differences encountered"]]);
});

// ---------------------------------------------------------- tree / where
test("adv tree lists directories and files only with /f", () => {
  let r = run("tree");
  assert.deepEqual(errors(r), []);
  assert.ok(flat(r).includes("C:\\Practice"));
  assert.ok(flat(r).some((x) => x.includes("logs")));
  assert.ok(!flat(r).some((x) => x.includes("notes.txt")));
  r = run("tree /f");
  assert.ok(flat(r).some((x) => x.includes("notes.txt")));
  assert.equal(err(run("tree nodir")).category, "実行エラー");
});
test("adv where finds files in cwd and reports ERRORLEVEL", () => {
  let r = run("where notes.txt");
  assert.deepEqual(out(r), [["C:\\Practice\\notes.txt"]]);
  r = run("where *.txt");
  assert.equal(r.paths[0].cmd.errorlevel, 0);
  assert.ok(flat(r).includes("C:\\Practice\\readme.txt"));
  r = run("where nothing.xyz\necho %ERRORLEVEL%");
  assert.deepEqual(out(r), [
    ["INFO: Could not find files for the given pattern(s).", "1"],
  ]);
});

// ---------------------------------------------------------- xcopy / robocopy / replace
test("adv xcopy copies single files and wildcard sets with summaries", () => {
  let r = run("xcopy notes.txt backup.txt\ntype backup.txt");
  assert.deepEqual(errors(r), []);
  assert.ok(flat(r).includes("1 File(s) copied"));
  assert.equal(file(r, "C:\\Practice\\backup.txt").content, "学習メモ\r\n");
  r = run("xcopy *.txt copies\\\ntype copies\\readme.txt");
  assert.deepEqual(errors(r), []);
  assert.ok(flat(r).includes("2 File(s) copied"));
  r = run("xcopy nothing*.txt out\\");
  assert.equal(r.paths[0].cmd.errorlevel, 1);
  assert.match(
    err(run("copy notes.txt dup.txt\nxcopy readme.txt dup.txt")).message,
    /未確認：既存ファイルへの上書きには \/y/,
  );
  r = run("copy notes.txt dup.txt\nxcopy /y readme.txt dup.txt\ntype dup.txt");
  assert.deepEqual(errors(r), []);
  assert.equal(file(r, "C:\\Practice\\dup.txt").content, "Practice\r\n");
  assert.match(err(run("xcopy /d notes.txt x.txt")).message, /未対応：xcopyのオプション/);
});
test("adv robocopy copies a folder tree and uses bitmask exit codes", () => {
  let r = run("robocopy . backup\necho %ERRORLEVEL%");
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.errorlevel, 1);
  assert.equal(file(r, "C:\\Practice\\backup\\notes.txt").content, "学習メモ\r\n");
  r = run("robocopy . backup\nrobocopy . backup\necho %ERRORLEVEL%");
  // 2回目はコピー先に余分なファイルはなく、内容も一致するため 0
  assert.equal(r.paths[0].cmd.errorlevel, 0);
  r = run("robocopy nodir backup\necho %ERRORLEVEL%");
  assert.equal(r.paths[0].cmd.errorlevel, 16);
  assert.match(err(run("robocopy /mir . backup")).message, /未対応：robocopyのオプション/);
});
test("adv replace replaces same-name files and /a adds new ones", () => {
  let r = run("echo old>logs\\readme.txt\nreplace readme.txt logs\ntype logs\\readme.txt");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [
    ["Replacing C:\\Practice\\logs\\readme.txt", "1 file(s) replaced", "Practice\r\n"],
  ]);
  r = run("replace notes.txt logs");
  assert.ok(flat(r).includes("0 file(s) replaced"));
  r = run("replace notes.txt logs /a");
  assert.ok(flat(r).includes("1 file(s) added"));
  assert.equal(file(r, "C:\\Practice\\logs\\notes.txt").content, "学習メモ\r\n");
  assert.match(err(run("replace /u notes.txt logs")).message, /未対応：replaceのオプション \/u/);
});

// ---------------------------------------------------------- 名指し停止（複合名含む）
for (const [code, pattern] of [
  ["sc config foo", /未対応：sc config（/],
  ["sc query", /未対応：sc query（/],
  ["net user bob", /未対応：net user（/],
  ["net print", /未対応：net print（/],
  ["add volume", /未対応：add volume（/],
  ["begin backup", /未対応：begin backup（/],
  ["winsat mem", /未対応：winsat mem（/],
  ["winsat mfmedia", /未対応：winsat mfmedia（/],
  ["powershell ise", /未対応：powershell ise（/],
  ["hostname", /未対応：hostname（/],
  ["ping example", /未対応：ping（/],
  ["expand a.cab", /未対応：expand（キャビネット/],
  ["extract a.cab", /未対応：extract（キャビネット/],
  ["makecab notes.txt", /未対応：makecab（キャビネット/],
  ["diskpart", /未対応：diskpart（/],
  ["attach-vdisk x", /未対応：attach-vdisk（DiskPart/],
  ["setx X 1", /未対応：setx（/],
])
  test("adv stop by name: " + code, () => {
    const e = err(run(code));
    assert.ok(e, code);
    assert.match(e.message, pattern);
    assert.equal(e.category, "未対応");
  });
test("adv unknown commands keep the legacy message", () => {
  assert.match(err(run("foobar123 abc")).message, /未対応のcmdコマンド：foobar123/);
});

// ---------------------------------------------------------- 別名と scan
test("adv aliases execute through the base engine and resolve in scan", () => {
  const r = run("mkdir extra2\nchdir extra2\necho %CD%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\extra2"]]);
  const r2 = run("copy notes.txt t.txt\nerase t.txt");
  assert.deepEqual(errors(r2), []);
  assert.equal(file(r2, "C:\\Practice\\t.txt"), undefined);
  const scanned = d.scan(
    "attrib +r a.txt\nchdir logs\nmkdir x\nerase y\nrename a b\nrmdir x\nsc config z\npushd logs\nnet user bob",
  );
  for (const n of [
    "attrib", "chdir", "mkdir", "erase", "rename", "rmdir",
    "sc config", "pushd", "net user",
  ])
    assert.ok(scanned.includes(n), n + " in " + JSON.stringify(scanned));
});

// ---------------------------------------------------------- B1監査修正の回帰
test("B1A-02 findstr /c quoted form matches and /c is literal", () => {
  let r = run('findstr /c:"Name,Score" data.csv\necho %ERRORLEVEL%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Name,Score", "0"]]);
  // /c の文字列はリテラル: "." は任意の1文字として働かない
  r = run('findstr /c:N.me data.csv\necho %ERRORLEVEL%');
  assert.deepEqual(out(r), [["1"]]);
  // 引用符なしの /c 形と通常形の既存の正しい挙動は壊さない
  r = run("findstr /c:Name data.csv");
  assert.deepEqual(out(r), [["Name,Score"]]);
  r = run('findstr "^Name" data.csv');
  assert.deepEqual(out(r), [["Name,Score"]]);
});
test("B1A-07 findstr positional rule names missing files and treats first token as the string", () => {
  const e = err(run('findstr "x" missing.txt'));
  assert.equal(e.category, "実行エラー");
  assert.match(e.message, /モデルにファイルがありません：missing\.txt/);
  // ファイル名と同名の検索文字列も、最初のトークンは文字列として扱う
  const r = run("findstr data.csv readme.txt\necho %ERRORLEVEL%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1"]]);
  // パイプ入力・コンソール入力の既存の扱いは維持
  assert.deepEqual(out(run('echo hello|findstr "ell"')), [["hello"]]);
  assert.match(err(run('findstr "x"')).message, /未対応：findstrのコンソール入力/);
});
test("B1A-06 choice /cs is not consumed as /c and makes matching case-sensitive", () => {
  let r = run("choice /cs", { inputs: { choice: "Y" } });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["[Y,N]?"]]);
  assert.equal(r.paths[0].cmd.errorlevel, 1);
  r = run("choice /cs", { inputs: { choice: "S" } });
  assert.equal(r.paths[0].cmd.errorlevel, 255);
  r = run("choice /cs /c ABC", { inputs: { choice: "b" } });
  assert.equal(r.paths[0].cmd.errorlevel, 255);
  r = run("choice /cs /c ABC", { inputs: { choice: "B" } });
  assert.equal(r.paths[0].cmd.errorlevel, 2);
  // /cs なしでは従来どおり大小を区別しない
  r = run("choice /c ABC", { inputs: { choice: "b" } });
  assert.equal(r.paths[0].cmd.errorlevel, 2);
});
test("B1A-04 cmd /c restores dirStack, verify, doskey macros and batch args", () => {
  let r = run('cmd /c "pushd logs"\necho %CD%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice"]]);
  assert.deepEqual(r.paths[0].cmd.dirStack ?? [], []);
  r = run('pushd logs\ncmd /c "popd"\necho %CD%\npopd\necho %CD%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice\\logs", "C:\\Practice"]]);
  r = run('cmd /c "verify on"\nverify');
  assert.deepEqual(out(r), [["VERIFY is off."]]);
  r = run('verify on\ncmd /c "verify off"\nverify');
  assert.deepEqual(out(r), [["VERIFY is on."]]);
  r = run('cmd /c "doskey hi=echo x"');
  assert.equal(r.paths[0].cmd.doskeyMacros?.hi, undefined);
  r = run('doskey keep=echo k\ncmd /c "doskey hi=echo x"');
  assert.deepEqual(r.paths[0].cmd.doskeyMacros, { keep: "echo k" });
  r = run('call :s a b c\ngoto :eof\n:s\ncmd /c "shift"\necho %1 %2');
  assert.deepEqual(out(r), [["a b"]]);
});
test("B1A-08 pushd with no argument lists the directory stack", () => {
  let r = run("pushd");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [[]]);
  r = run("pushd logs\npushd\npopd\necho %CD%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["C:\\Practice", "C:\\Practice"]]);
});
test("B1A-10 attrib treats an explicitly named folder without /d", () => {
  let r = run("attrib logs");
  assert.deepEqual(errors(r), []);
  assert.ok(flat(r).some((x) => x.includes("C:\\Practice\\logs")));
  r = run("attrib +r logs\nattrib logs");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(file(r, "C:\\Practice\\logs").attributes, ["R"]);
  // ワイルドカード収集では /d なしでフォルダを含めない（従来どおり）
  r = run("attrib *");
  assert.deepEqual(errors(r), []);
  assert.ok(!flat(r).some((x) => x.includes("C:\\Practice\\logs")));
});
test("B1A-11 sort compares case-insensitively and keeps original order on ties", () => {
  const withFile = (name, content) => {
    const m = structuredClone(d.model.defaults);
    m.files.push({ path: "C:\\Practice\\" + name, type: "file", content });
    return d.simulate("sort " + name, m);
  };
  assert.deepEqual(out(withFile("ba.txt", "B\r\na\r\n")), [["a", "B"]]);
  assert.deepEqual(out(withFile("tie.txt", "b\r\nA\r\na\r\nB\r\n")), [
    ["A", "a", "b", "B"],
  ]);
});
test("B1A-19 alias stops for import and route reach their named stops", () => {
  assert.equal(advancedStops.length, 269);
  assert.deepEqual(
    advancedAliasStops.map((s) => s.name),
    ["import", "route"],
  );
  assert.match(err(run("import")).message, /未対応：import（DiskPart／DiskShadow の内部コマンドで、専用セッションの外では使えません）/);
  assert.match(err(run("route print")).message, /未対応：route（ネットワーク経路の操作はモデル化していません）/);
  // リファレンス例が自項目の停止に届くこと
  assert.match(err(run(refItem("import (diskpart)").example)).message, /未対応：import（/);
  assert.match(err(run(refItem("import (shadowdisk)").example)).message, /未対応：import（/);
  assert.match(err(run(refItem("route ws2008").example)).message, /未対応：route（/);
  assert.match(err(run(refItem("typeperf").example)).message, /未対応：typeperf（/);
  assert.match(err(run(refItem("clip").example)).message, /未対応：clip（/);
});
test("B1A-19 doskey reference example is a defining form that runs", () => {
  const r = run(refItem("doskey").example);
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.doskeyMacros.hi, "echo こんにちは");
});
test("B1A-05/09/12/20/21 reference wording matches the model", () => {
  assert.match(refItem("cmd").caution, /cmd \/c の中で \/b のない exit を使うとバッチ全体が終了します（実物では子プロセスだけが終了します）/);
  assert.match(refItem("popd").description, /保存したフォルダがなければ、現在フォルダを変えずにそのまま進みます/);
  assert.ok(!refItem("robocopy").description.includes("/mir"));
  assert.match(refItem("robocopy").caution, /\/mir/);
  assert.match(refItem("robocopy").caution, /\/purge も未対応/);
  assert.match(refItem("choice").caution, /\/t（タイムアウト）と \/d（既定の選択肢）は結果を決めません。タイムアウトはモデル化していません/);
  assert.match(refItem("help").description, /指定しなければ、このモデルで使えるコマンド名の一覧を表示します（説明文は付きません）/);
  assert.match(refItem("sort").caution, /実物のロケール照合そのものではなく/);
});

test("B1B-02 cmd /c restores color, prompt and window title", () => {
  let r = run('color 2a\ncmd /c "color 1f"');
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.colorValue, "2A");
  // 既定状態で子が設定しても親へ残らない
  r = run('cmd /c "color 1f"');
  assert.equal(r.paths[0].cmd.colorValue, undefined);
  // 子での既定へのリセット（引数なし color）も親へ漏れない
  r = run('color 2a\ncmd /c "color"');
  assert.equal(r.paths[0].cmd.colorValue, "2A");
  r = run('prompt ABC\ncmd /c "prompt XYZ"');
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.promptText, "ABC");
  r = run('cmd /c "prompt XYZ"');
  assert.equal(r.paths[0].cmd.promptText, undefined);
  // prompt の環境変数 %PROMPT% も従来どおり復元される
  r = run('prompt ABC\ncmd /c "prompt XYZ"\necho %PROMPT%');
  assert.deepEqual(out(r), [["ABC"]]);
  r = run('title Parent\ncmd /c "title Child"');
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.windowTitle, "Parent");
  r = run('cmd /c "title Child"');
  assert.equal(r.paths[0].cmd.windowTitle, undefined);
  // 入れ子でも各階層へ復元され、ERRORLEVEL の引き継ぎは維持される
  r = run('color 2a\ncmd /c "cmd /c color 1f"');
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.colorValue, "2A");
  r = run('cmd /c "exit /b 5"\necho %ERRORLEVEL%');
  assert.deepEqual(out(r), [["5"]]);
});
test("B1B-03 findstr quoted space-separated strings search as OR", () => {
  const r = run('findstr "Name Alice" data.csv\necho %ERRORLEVEL%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Name,Score", "Alice,80", "0"]]);
});
test("B1B-03 findstr multiple /c strings are all literal OR terms", () => {
  let r = run('findstr /c:"Alice,80" /c:"ZZZ" data.csv\necho %ERRORLEVEL%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Alice,80", "0"]]);
  // 順序を入れ替えても最後の /c だけが効くようなことはない
  r = run('findstr /c:"ZZZ" /c:"Alice,80" data.csv\necho %ERRORLEVEL%');
  assert.deepEqual(out(r), [["Alice,80", "0"]]);
  // /c のリテラル性（B1A-02）は複数形でも維持される
  r = run('findstr /c:N.me /c:Score data.csv');
  assert.deepEqual(out(r), [["Name,Score"]]);
});
test("B1B-03 findstr multiple string tokens before the file are not mistaken for files", () => {
  let r = run('findstr "Name" "Alice" data.csv\necho %ERRORLEVEL%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Name,Score", "Alice,80", "0"]]);
  r = run("findstr Name Alice data.csv\necho %ERRORLEVEL%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Name,Score", "Alice,80", "0"]]);
  r = run('findstr /c:"Name,Score" Alice data.csv\necho %ERRORLEVEL%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Name,Score", "Alice,80", "0"]]);
  // 第1ラウンドの判別（B1A-07）は壊さない: 存在しないファイルは
  // 名指しし、ファイル名と同名の最初のトークンは文字列として扱う
  const e = err(run('findstr "x" missing.txt'));
  assert.equal(e.category, "実行エラー");
  assert.match(e.message, /モデルにファイルがありません：missing\.txt/);
  r = run("findstr data.csv readme.txt\necho %ERRORLEVEL%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1"]]);
});
test("B1B-03 findstr multiple strings also work on pipe input", () => {
  let r = run('echo hello|findstr "hell zzz"\necho %ERRORLEVEL%');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["hello", "0"]]);
  r = run("echo hello|findstr zzz hello");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["hello"]]);
});
test("B1B-04 attrib with an explicit folder and /s includes the folder and its subtree", () => {
  const withLogs = () => {
    const m = structuredClone(d.model.defaults);
    m.files.push(
      { path: "C:\\Practice\\logs\\a.txt", type: "file", content: "a\r\n" },
      { path: "C:\\Practice\\logs\\sub", type: "directory" },
      { path: "C:\\Practice\\logs\\sub\\b.txt", type: "file", content: "b\r\n" },
    );
    return m;
  };
  let r = d.simulate("attrib logs /s", withLogs());
  assert.deepEqual(errors(r), []);
  assert.ok(flat(r).some((x) => x.endsWith("C:\\Practice\\logs")));
  assert.ok(flat(r).some((x) => x.endsWith("C:\\Practice\\logs\\a.txt")));
  assert.ok(flat(r).some((x) => x.endsWith("C:\\Practice\\logs\\sub\\b.txt")));
  // /d なしでは配下のフォルダ自体は対象に含めない（従来の /d 規則）
  assert.ok(!flat(r).some((x) => x.endsWith("C:\\Practice\\logs\\sub")));
  r = d.simulate("attrib +r logs /s", withLogs());
  assert.deepEqual(errors(r), []);
  assert.deepEqual(file(r, "C:\\Practice\\logs").attributes, ["R"]);
  assert.deepEqual(file(r, "C:\\Practice\\logs\\a.txt").attributes, ["R"]);
  assert.deepEqual(file(r, "C:\\Practice\\logs\\sub\\b.txt").attributes, ["R"]);
  r = d.simulate("attrib logs /s /d", withLogs());
  assert.deepEqual(errors(r), []);
  assert.ok(flat(r).some((x) => x.endsWith("C:\\Practice\\logs\\sub")));
});
test("B1B-05 doskey reference wording matches the unsupported query forms", () => {
  const item = refItem("doskey");
  assert.match(
    item.caution,
    /\/macros・\/history 等の照会形式は未対応で、指定すると未対応として名指しで停止します/,
  );
  assert.ok(!item.description.includes("/macrosでマクロの一覧"));
  assert.ok(!item.description.includes("/historyで履歴を表示"));
  assert.ok(!item.syntax.includes("/macros"));
  assert.ok(!item.syntax.includes("/history"));
  // 実体: 照会形式は名前つきで止まり、定義形は従来どおり動く
  assert.match(err(run("doskey /macros")).message, /未対応：doskeyの照会・管理形式/);
  assert.match(err(run("doskey /history")).message, /未対応：doskeyの照会・管理形式/);
  const r = run(item.example);
  assert.deepEqual(errors(r), []);
});

// ---------------------------------------------------------- 既存挙動の不変確認
test("adv existing base behaviour is unchanged", () => {
  let r = run('set X=hello\necho %X%');
  assert.deepEqual(out(r), [["hello"]]);
  r = run("for /L %%i in (1,1,3) do echo %%i");
  assert.deepEqual(out(r), [["1", "2", "3"]]);
  r = run("echo apple | find \"app\"");
  assert.deepEqual(out(r), [["apple "]]);
  r = run("unknowncommand abc");
  assert.match(err(r).message, /unknowncommand/);
  r = run("dir /b *.txt");
  assert.deepEqual(out(r), [["notes.txt", "readme.txt"]]);
});

/* ---------- B1C-02: findstr の空文字列は全行に一致する ---------- */

test("B1C-02 findstr with an explicit empty string matches every line", () => {
  const r = run('findstr "" notes.txt');
  assert.equal(err(r), undefined, JSON.stringify(r.paths?.[0]?.error ?? r.error));
  // notes.txt の全行（1行）が出力され、ERRORLEVEL は 0
  assert.deepEqual(out(r), [["学習メモ"]]);
  assert.equal(r.paths[0].model.errorlevel, 0);
  // /c:"" とも一致する（形で食い違わない）
  const r2 = run('findstr /c:"" notes.txt');
  assert.deepEqual(out(r2), out(r));
  // 複数行ファイルでも全行に一致する
  const r3 = run('findstr "" data.csv');
  assert.deepEqual(out(r3), [["Name,Score", "Alice,80"]]);
});

test("B1D-01 findstr empty string token is never mistaken for a file at any position", () => {
  // 先頭以外の位置の空文字列も検索文字列として扱う
  const r = run('findstr "Name" "" data.csv');
  assert.equal(err(r), undefined, JSON.stringify(r.paths?.[0]?.error ?? r.error));
  assert.deepEqual(out(r), [["Name,Score", "Alice,80"]]);
  // /c 併用時も同様
  const r2 = run('findstr "" /c:"Name" data.csv');
  assert.equal(err(r2), undefined, JSON.stringify(r2.paths?.[0]?.error ?? r2.error));
  assert.deepEqual(out(r2), [["Name,Score", "Alice,80"]]);
  const r3 = run('findstr /c:"" "" data.csv');
  assert.equal(err(r3), undefined, JSON.stringify(r3.paths?.[0]?.error ?? r3.error));
  assert.deepEqual(out(r3), [["Name,Score", "Alice,80"]]);
});

test("B1E-01 findstr empty string token with unknown-value tokens present", () => {
  // 未確定値トークンが混ざっても、空文字列はファイルと誤認されない。
  // 未確定トークンはファイル位置で「確定していません」と正直に止まる。
  const r = run('findstr "Name" "" "%RANDOM%"');
  assert.match(err(r).message, /確定していません/);
  assert.doesNotMatch(err(r).message, /ファイルがありません：\s*$/);
  const r2 = run('findstr /c:"Name" "" "%RANDOM%"');
  assert.match(err(r2).message, /確定していません/);
  assert.doesNotMatch(err(r2).message, /ファイルがありません：\s*$/);
  // パイプ入力＋未確定なしでは、空文字列が検索文字列として完走する
  const r3 = run('echo Name | findstr "Name" ""');
  assert.equal(err(r3), undefined, JSON.stringify(r3.paths?.[0]?.error ?? r3.error));
});

test("B1G-01 choice /c choices and /m message with unknown values stop as unconfirmed", () => {
  // 選択肢が未確定なら、プレースホルダの文字集合を選択肢として
  // 提示せず未確認で止まる。入力候補を与えても ERRORLEVEL が
  // プレースホルダ内の位置で確定してはならない。
  for (const extra of [{}, { inputs: { choice: "C" } }, { inputs: { choice: 3 } }]) {
    const e = err(run("choice /c %RANDOM%", extra));
    assert.equal(e.category, "未確認");
    assert.match(e.message, /未確認：choiceの選択肢が確定していません/);
    assert.doesNotMatch(e.message, /__CMD_VALUE/);
  }
  for (const code of [
    "choice /c Y%RANDOM%",
    "setlocal EnableDelayedExpansion\nchoice /c !RANDOM!",
  ]) {
    const e = err(run(code));
    assert.equal(e.category, "未確認", code);
    assert.match(e.message, /choiceの選択肢が確定していません/, code);
  }
  // メッセージは選択肢とは別に名指す
  for (const code of [
    "choice /m %RANDOM%",
    "set X=%RANDOM%\nchoice /m %X%",
  ]) {
    const e = err(run(code));
    assert.equal(e.category, "未確認", code);
    assert.match(e.message, /未確認：choiceのメッセージが確定していません/, code);
    assert.doesNotMatch(e.message, /__CMD_VALUE/, code);
  }
  // /d の既定値も未確定なら未確認で止まる
  const ed = err(run("choice /c YN /d %RANDOM%"));
  assert.equal(ed.category, "未確認");
  assert.match(ed.message, /choiceの既定値が確定していません/);
  // 確定値の経路は従来どおり解決される
  let r = run("set V=YN\nchoice /c %V%", { inputs: { choice: "N" } });
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.errorlevel, 2);
  r = run("set M=Sure?\nchoice /m %M% /c YN", { inputs: { choice: "Y" } });
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["Sure? [Y,N]?"]]);
});

test("B1G-02 robocopy file pattern with an unknown value stops as unconfirmed and never copies [object Object]", () => {
  for (const code of [
    "robocopy . dest2 %RANDOM%",
    "robocopy . dest4 x%RANDOM%.txt",
  ]) {
    const e = err(run(code));
    assert.equal(e.category, "未確認", code);
    assert.match(e.message, /未確認：robocopyの対象が確定していません/, code);
  }
  // カスタムモデル: "[object Object]" という名前の実ファイルが
  // あっても、未確定パターンで誤ってコピーしない
  const withObj = () => {
    const m = structuredClone(d.model.defaults);
    m.files.push(
      { path: "C:\\Practice\\[object Object]", type: "file", content: "obj\r\n" },
      { path: "C:\\Practice\\normal.txt", type: "file", content: "n\r\n" },
    );
    return m;
  };
  const r = d.simulate("robocopy . dest %RANDOM%", withObj());
  assert.equal(err(r).category, "未確認");
  assert.equal(file(r, "C:\\Practice\\dest\\[object Object]"), undefined);
  assert.equal(file(r, "C:\\Practice\\dest\\normal.txt"), undefined);
  // 対照: 確定パターン *.txt は normal.txt 等だけをコピーする
  const ok = d.simulate("robocopy . dest *.txt", withObj());
  assert.deepEqual(errors(ok), []);
  assert.equal(file(ok, "C:\\Practice\\dest\\normal.txt").content, "n\r\n");
  assert.equal(file(ok, "C:\\Practice\\dest\\[object Object]"), undefined);
});

test("B1G-03 help argument with an unknown value stops as unconfirmed", () => {
  for (const code of [
    "help %RANDOM%",
    "help x%RANDOM%",
    "setlocal EnableDelayedExpansion\nhelp !RANDOM!",
  ]) {
    const e = err(run(code));
    assert.equal(e.category, "未確認", code);
    assert.match(e.message, /未確認：helpのコマンド名が確定していません/, code);
    assert.doesNotMatch(e.message, /__cmd_value|__CMD_VALUE/i, code);
  }
  // 確定したコマンド名の照合は従来どおり
  assert.deepEqual(out(run("set C=copy\nhelp %C%")), [
    ["copy はこのモデルで対応しています"],
  ]);
  assert.deepEqual(out(run("help attrib")), [
    ["attrib はこのモデルで対応しています"],
  ]);
});

test("B1G-04 doskey macro name and definition with unknown values stop as unconfirmed", () => {
  for (const [code, pattern] of [
    ["doskey hi=echo %RANDOM%", /doskeyのマクロ定義が確定していません/],
    ["doskey %RANDOM%=echo hi", /doskeyのマクロ名が確定していません/],
    ["set X=%RANDOM%\ndoskey hi=echo %X%", /doskeyのマクロ定義が確定していません/],
    [
      "setlocal EnableDelayedExpansion\ndoskey hi=echo !RANDOM!",
      /doskeyのマクロ定義が確定していません/,
    ],
  ]) {
    const r = run(code);
    const e = err(r);
    assert.equal(e.category, "未確認", code);
    assert.match(e.message, pattern, code);
    // プレースホルダのままマクロとして保存されていないこと
    assert.equal(r.paths[0].cmd.doskeyMacros?.hi, undefined, code);
    assert.ok(
      !Object.keys(r.paths[0].cmd.doskeyMacros ?? {}).some((k) =>
        k.includes("__CMD_VALUE"),
      ),
      code,
    );
  }
  // 確定値の定義は従来どおり保存される
  const r = run("set X=hello\ndoskey hi=echo %X%");
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths[0].cmd.doskeyMacros.hi, "echo hello");
});

test("B1G-05 format-validated arguments with unknown values stop as unconfirmed, not with a false cause", () => {
  for (const [code, pattern] of [
    ["color %RANDOM%", /未確認：colorの引数が確定していません/],
    ["vol %RANDOM%", /未確認：volの引数が確定していません/],
    ["shift %RANDOM%", /未確認：shiftの引数が確定していません/],
    ["timeout %RANDOM%", /未確認：timeoutの引数が確定していません/],
    ["sort /+%RANDOM% data.csv", /未確認：sortの列番号が確定していません/],
    ["attrib +%RANDOM% data.csv", /未確認：attribの属性指定が確定していません/],
    ["cmd /c %RANDOM%", /未確認：cmd \/cで実行するコマンドが確定していません/],
  ]) {
    const e = err(run(code));
    assert.equal(e.category, "未確認", code);
    assert.match(e.message, pattern, code);
    // 内部プレースホルダを実引数として名指さない
    assert.doesNotMatch(e.message, /__CMD_VALUE|__cmd_value/, code);
  }
  // 確定値に対する従来の形式検証・未対応の名指しは維持される
  assert.match(err(run("color xyz")).message, /未対応：colorの引数 xyz/);
  assert.match(err(run("sort /+abc data.csv")).message, /未対応：sortのオプション \/\+abc/);
  assert.match(err(run("attrib +z notes.txt")).message, /未対応：attribの属性 z/);
  assert.deepEqual(errors(run("vol C:")), []);
  // cmd /c の引数位置の未確定値はサブ実行側で正直に表示される（従来どおり）
  const r = run("cmd /c echo %RANDOM%");
  assert.deepEqual(errors(r), []);
  assert.ok(r.paths[0].outputs.every((o) => o.uncertain));
});

test("B1G-05 sweep: option values and on/off-style arguments with unknown values also stop as unconfirmed", () => {
  for (const code of [
    "robocopy /%RANDOM% . dest",
    "xcopy /%RANDOM% notes.txt out.txt",
    "sort /%RANDOM% data.csv",
    "timeout /t %RANDOM%",
    "choice /t %RANDOM%",
    "comp /n=%RANDOM% notes.txt notes.txt",
    "verify %RANDOM%",
    "break %RANDOM%",
    "date %RANDOM%",
    "time %RANDOM%",
    "cmd %RANDOM%",
    "attrib /%RANDOM% notes.txt",
    "findstr /%RANDOM% data.csv",
    "more /%RANDOM%",
    "tree /%RANDOM%",
    "where /%RANDOM% notes.txt",
    "replace /%RANDOM% notes.txt logs",
    "fc /%RANDOM% notes.txt notes.txt",
    "choice /%RANDOM%",
    "doskey /%RANDOM%",
    "popd %RANDOM%",
  ]) {
    const e = err(run(code));
    assert.ok(e, code);
    assert.equal(e.category, "未確認", code + " -> " + e.message);
    assert.match(e.message, /が確定していません/, code);
    assert.doesNotMatch(e.message, /__CMD_VALUE|__cmd_value/, code);
  }
});

test("B1F-01 findstr /c value with an unknown value stops as unconfirmed", () => {
  // /c の値に未確定値が混ざると、プレースホルダを検索文字列にして
  // 黙って完走せず、未確認として正直に止まる
  for (const code of [
    'findstr /c:"%RANDOM%" data.csv',
    'findstr /c:"%DATE%" data.csv',
    'findstr /c:"a%RANDOM%b" data.csv',
  ]) {
    const r = run(code);
    assert.match(err(r).message, /未確認：findstrの検索文字列が確定していません/, code);
  }
  // 確定値の /c は従来どおり解決される
  const ok = run('set X=Name\nfindstr /c:"%X%" data.csv');
  assert.equal(err(ok), undefined, JSON.stringify(ok.paths?.[0]?.error ?? ok.error));
  assert.deepEqual(out(ok), [["Name,Score"]]);
});
