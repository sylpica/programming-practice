import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ10（VBA／ImageJ班）: R31-N9（VBA IsNumeric の Boolean）、
// ImageJ changeValues の putPixel 変換（f01a §3-2 一次確定）、
// R31-N13 の ImageJ 分（images 形状検証＋ truncated 契約）の回帰テスト。
const vba = getDefinition("vba");
const ij = getDefinition("imagej");

const vbaRun = async (code, model) =>
  vba.simulate(code, model ?? structuredClone(vba.model.defaults));
const vbaOut = async (code) => {
  const r = await vbaRun(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0].outputs.map((o) => o.text);
};
const ijRun = async (code, model) =>
  ij.simulate(code, model ?? structuredClone(ij.model.defaults));
const ijOut = async (code, model) => {
  const r = await ijRun(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0].outputs.map((o) => o.text);
};
const ijImage = (bit, pix) => {
  const m = structuredClone(ij.model.defaults);
  m.images = [
    {
      title: "t.tif", w: 4, h: 4, bit, channels: 1, slices: 1, frames: 1,
      slice: 1, buckets: null, thr: null, pix, spatial: false,
      kind: "グレースケール",
    },
  ];
  return m;
};

/* --- R31-N9: IsNumeric の Boolean --- */
test("batch10-vba R31-N9 IsNumeric(True) is True", async () => {
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(True)"), ["True"]);
});
test("batch10-vba R31-N9 IsNumeric(False) is True", async () => {
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(False)"), ["True"]);
});
test("batch10-vba R31-N9 IsNumeric of Boolean variable and Variant holding Boolean", async () => {
  assert.deepEqual(
    await vbaOut("Dim b As Boolean\nb = True\nDebug.Print IsNumeric(b)"),
    ["True"],
  );
  assert.deepEqual(
    await vbaOut("Dim v As Variant\nv = False\nDebug.Print IsNumeric(v)"),
    ["True"],
  );
});
test("batch10-vba R31-N9 IsNumeric neighbours unchanged (numbers, strings, Empty, Null)", async () => {
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(123)"), ["True"]);
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(\"123\")"), ["True"]);
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(\"&H10\")"), ["True"]);
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(\"0x10\")"), ["False"]);
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(\"abc\")"), ["False"]);
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(Empty)"), ["True"]);
  assert.deepEqual(await vbaOut("Debug.Print IsNumeric(Null)"), ["False"]);
});

/* --- 横断スイープ(a): Boolean の変換・算術・比較は実 VBA どおり --- */
test("batch10-vba sweep-a Boolean conversions CDbl/CInt/CLng and Single assignment", async () => {
  assert.deepEqual(await vbaOut("Debug.Print CDbl(True)"), ["-1"]);
  assert.deepEqual(await vbaOut("Debug.Print CDbl(False)"), ["0"]);
  assert.deepEqual(await vbaOut("Debug.Print CInt(True)"), ["-1"]);
  assert.deepEqual(await vbaOut("Debug.Print CLng(True)"), ["-1"]);
  assert.deepEqual(
    await vbaOut("Dim s As Single\ns = True\nDebug.Print s"),
    ["-1"],
  );
});
test("batch10-vba sweep-a Boolean arithmetic and comparison use True = -1", async () => {
  assert.deepEqual(await vbaOut("Debug.Print True + 1"), ["0"]);
  assert.deepEqual(await vbaOut("Debug.Print False + 1"), ["1"]);
  assert.deepEqual(await vbaOut("Debug.Print True * 2"), ["-2"]);
  assert.deepEqual(await vbaOut("Debug.Print True = -1"), ["True"]);
  assert.deepEqual(await vbaOut("Debug.Print Abs(True)"), ["1"]);
});
test("batch10-vba sweep-a CCur/CSng/CBool stay named unsupported stops (no reference items)", async () => {
  for (const fn of ["CCur", "CSng", "CBool"]) {
    const r = await vbaRun(`Debug.Print ${fn}(True)`);
    const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
    assert.ok(errs.length, fn);
    assert.match(errs.map((e) => e.message).join(" "), new RegExp(fn, "i"));
  }
});
test("batch10-vba sweep-c degenerate models and truncated expressions leak no internal tokens", async () => {
  for (const model of [null, 123, "x", [], {}]) {
    const r = await vba.simulate("Debug.Print Range(\"A1\").Value", model);
    assert.ok("truncated" in r, JSON.stringify(model));
    assert.ok(!JSON.stringify(r).includes("<eof>"), JSON.stringify(model));
  }
  for (const code of ["Debug.Print 1 +", "Debug.Print (", "x = "]) {
    const r = await vbaRun(code);
    assert.ok(r.error, code);
    assert.ok(!r.error.message.includes("<eof>"), code);
    assert.equal(r.truncated, false);
  }
});

/* --- changeValues: putPixel 変換（一次情報 Functions.java L1135／各 Processor.putPixel） --- */
test("batch10-imagej changeValues clamps replacement on 8-bit (300 -> 255, -5 -> 0)", async () => {
  assert.deepEqual(
    await ijOut("setPixel(0, 0, 100); changeValues(0, 255, 300); print(getPixel(0, 0));"),
    ["255"],
  );
  assert.deepEqual(
    await ijOut("setPixel(0, 0, 100); changeValues(0, 255, -5); print(getPixel(0, 0));"),
    ["0"],
  );
});
test("batch10-imagej changeValues truncates replacement on 8-bit (200.9 -> 200)", async () => {
  assert.deepEqual(
    await ijOut("setPixel(0, 0, 100); changeValues(0, 255, 200.9); print(getPixel(0, 0));"),
    ["200"],
  );
});
test("batch10-imagej changeValues converts preset model pixels too (90-110 range, 300 -> 255)", async () => {
  assert.deepEqual(await ijOut("changeValues(90, 110, 300); print(getPixel(0, 0));"), ["255"]);
});
test("batch10-imagej changeValues clamps on 16-bit (80000 -> 65535, -5 -> 0)", async () => {
  assert.deepEqual(
    await ijOut("changeValues(0, 65535, 80000); print(getPixel(0, 0));", ijImage(16, { "0,0": 100 })),
    ["65535"],
  );
  assert.deepEqual(
    await ijOut("changeValues(0, 65535, -5); print(getPixel(0, 0));", ijImage(16, { "0,0": 100 })),
    ["0"],
  );
});
test("batch10-imagej changeValues keeps float values on 32-bit (no clamp)", async () => {
  assert.deepEqual(
    await ijOut("changeValues(0, 65535, 300.5); print(getPixel(0, 0));", ijImage(32, { "0,0": 100 })),
    ["300.5"],
  );
  assert.deepEqual(
    await ijOut("changeValues(0, 65535, -5.25); print(getPixel(0, 0));", ijImage(32, { "0,0": 100 })),
    ["-5.25"],
  );
});
test("batch10-imagej changeValues range bounds stay double comparisons (no clamp of v1/v2)", async () => {
  // 範囲上限 300 はクランプされず、200 の画素は 100.5〜300 の範囲に入る。
  // 置換値 7 はそのまま書かれる。
  assert.deepEqual(
    await ijOut("setPixel(0, 0, 200); changeValues(100.5, 300, 7); print(getPixel(0, 0));"),
    ["7"],
  );
  // 範囲外の画素は変わらない
  assert.deepEqual(
    await ijOut("setPixel(0, 0, 50); changeValues(100.5, 300, 7); print(getPixel(0, 0));"),
    ["50"],
  );
});
test("batch10-imagej changeValues NaN range replaces NaN pixels on float images", async () => {
  assert.deepEqual(
    await ijOut("changeValues(0/0, 0/0, 42); print(getPixel(0, 0));", ijImage(32, { "0,0": NaN })),
    ["42"],
  );
});
test("batch10-imagej setPixel still uses the shared putPixel conversion", async () => {
  assert.deepEqual(await ijOut("setPixel(0, 0, 300); print(getPixel(0, 0));"), ["255"]);
  assert.deepEqual(await ijOut("setPixel(0, 0, 200.9); print(getPixel(0, 0));"), ["200"]);
});

/* --- R31-N13 (ImageJ): images 形状検証＋ truncated 契約 --- */
test("batch10-imagej R31-N13 non-array images stops naming the model, with truncated key", async () => {
  for (const bad of [123, "x", {}]) {
    const r = await ijRun("print(1);", { images: bad });
    assert.equal(r.truncated, false, JSON.stringify(bad));
    assert.ok(r.error, JSON.stringify(bad));
    assert.match(r.error.message, /images/);
    assert.ok(!/予期しないエラー/.test(r.error.message));
    assert.deepEqual(r.paths, []);
  }
});
test("batch10-imagej R31-N13 non-object image elements stop naming the model", async () => {
  for (const bad of [[123], ["x"], [null], [[]], [true]]) {
    const r = await ijRun("print(1);", { images: bad });
    assert.equal(r.truncated, false, JSON.stringify(bad));
    assert.ok(r.error, JSON.stringify(bad));
    assert.match(r.error.message, /images\[0\]/);
  }
});
test("batch10-imagej R31-N13 bad pix / buckets shapes stop naming the model field", async () => {
  const r1 = await ijRun("print(1);", { images: [{ pix: 123 }] });
  assert.equal(r1.truncated, false);
  assert.match(r1.error.message, /images\[0\]\.pix/);
  const r2 = await ijRun("print(1);", { images: [{ buckets: "x" }] });
  assert.equal(r2.truncated, false);
  assert.match(r2.error.message, /images\[0\]\.buckets/);
  const r3 = await ijRun("run(\"Measure\");", { images: [{ buckets: 123 }] });
  assert.equal(r3.truncated, false);
  assert.match(r3.error.message, /images\[0\]\.buckets/);
});
test("batch10-imagej R31-N13 valid shapes still run (empty array, null = unspecified, defaults)", async () => {
  assert.deepEqual(await ijOut("print(1);", { images: [] }), ["1"]);
  assert.deepEqual(await ijOut("print(1);", { images: null }), ["1"]);
  assert.deepEqual(await ijOut("print(1);", {}), ["1"]);
  assert.deepEqual(await ijOut("print(getPixel(0, 0));", ijImage(8, { "0,0": 33 })), ["33"]);
});
test("batch10-imagej R31-N13 every return path carries truncated (overlong code, model error, success)", async () => {
  const long = await ijRun("x".repeat(100001), structuredClone(ij.model.defaults));
  assert.equal(long.truncated, false);
  assert.ok(long.error);
  const ok = await ijRun("print(1);");
  assert.equal(ok.truncated, false);
  assert.ok(!ok.error);
});
test("batch10-imagej sweep-c other model fields degrade honestly without generic wording", async () => {
  // files／directories／runtime の型違いは未確定値への正直な退化で、
  // 汎用文言にも契約キー欠落にもならない（処置前から維持されている挙動）。
  for (const model of [{ files: 123 }, { files: "x" }, { directories: 123 }, { runtime: "x" }]) {
    const r = await ijRun("print(1);", model);
    assert.equal(r.truncated, false, JSON.stringify(model));
    assert.ok(!r.error, JSON.stringify(model));
    assert.ok(!JSON.stringify(r).includes("予期しないエラー"), JSON.stringify(model));
  }
  const r = await ijRun("open(\"/model/input/image1.tif\");", { files: 123 });
  assert.equal(r.truncated, false);
  assert.ok(!JSON.stringify(r).includes("予期しないエラー"));
});
