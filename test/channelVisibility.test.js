// @scanfood/logic channel-visibility test — คุมทุก branch ทั้ง 4 ฟังก์ชัน · รัน: node test/channelVisibility.test.js
// + parity case ท้ายไฟล์: channelKey ที่ logic รับ = ชุดเดียวกับ @scanfood/schema ChannelKey (single source สองชั้นไม่ drift)
const assert = require("assert");
const {
  isChannelHidden,
  isCategoryVisible,
  isOptionVisible,
  resolveChannelPackaging,
} = require("../src/index");

let pass = 0, fail = 0;
const t = (n, fn) => { try { fn(); pass++; console.log("  ✓", n); } catch (e) { fail++; console.log("  ✗", n, "\n     →", e.message); } };

// ── isChannelHidden ──

t("hiddenChannels absent/[]/ไม่ใช่ array → ไม่ซ่อน (default เปิดหมด)", () => {
  assert.equal(isChannelHidden(undefined, "1"), false);
  assert.equal(isChannelHidden([], "delivery"), false);
  assert.equal(isChannelHidden("delivery", "delivery"), false);
});
t("match ตรง string → ซ่อน · ไม่ match → ไม่ซ่อน", () => {
  assert.equal(isChannelHidden(["delivery", "qr"], "delivery"), true);
  assert.equal(isChannelHidden(["delivery"], "pickup"), false);
});
t("normalize เลข ↔ string สองฝั่ง (POS id เป็นเลขใน shop.channel[])", () => {
  assert.equal(isChannelHidden(["1"], 1), true);
  assert.equal(isChannelHidden([1], "1"), true);
});

// ── isCategoryVisible ──

const cat = { id: "u1", level: 1, name: "เครื่องดื่ม", aboveId: [], enable: true };

t("item ปกติ ไม่มี hiddenChannels → แสดงทุกช่อง", () => {
  assert.equal(isCategoryVisible(cat, "1", 0, false), true);
  assert.equal(isCategoryVisible(cat, "delivery", 5, false), true);
});
t("enable=false (eye) → ปิดทุกช่องทาง แรงกว่า hiddenChannels", () => {
  assert.equal(isCategoryVisible({ ...cat, enable: false }, "1", 9, false), false);
  assert.equal(isCategoryVisible({ ...cat, enable: false, hiddenChannels: [] }, "qr", 9, false), false);
});
t("enable absent (BOM category ไม่มี field) → ถือว่าเปิด", () => {
  const { enable, ...bomCat } = cat;
  assert.equal(isCategoryVisible(bomCat, "1", 0, false), true);
});
t("hiddenChannels มีช่องนี้ → ซ่อนเฉพาะช่องนั้น", () => {
  const c = { ...cat, hiddenChannels: ["delivery"] };
  assert.equal(isCategoryVisible(c, "delivery", 5, false), false);
  assert.equal(isCategoryVisible(c, "1", 5, false), true);
});
t("Layer A: hideEmpty=true + ไม่มีของขาย → ซ่อน · มีของ → แสดง", () => {
  assert.equal(isCategoryVisible(cat, "1", 0, true), false);
  assert.equal(isCategoryVisible(cat, "1", undefined, true), false);
  assert.equal(isCategoryVisible(cat, "1", 3, true), true);
});
t("Layer A: hideEmpty=false/absent → หมวดว่างยังแสดง (พฤติกรรมเดิม · default false Pack@sess227)", () => {
  assert.equal(isCategoryVisible(cat, "1", 0, false), true);
  assert.equal(isCategoryVisible(cat, "1", 0, undefined), true);
});
t("item null/undefined → ถือว่าแสดง (fail-soft ไม่ล้ม render)", () => {
  assert.equal(isCategoryVisible(null, "1", 1, false), true);
});

// ── isOptionVisible ──

const opt = { optionId: "op1", optionTopic: "ความหวาน", choice: [] };

t("option ไม่มี hiddenChannels → แสดงทุกช่อง · null fail-soft", () => {
  assert.equal(isOptionVisible(opt, "qr"), true);
  assert.equal(isOptionVisible(null, "qr"), true);
});
t("option ซ่อนช่องนี้ → false เฉพาะช่องนั้น", () => {
  const o = { ...opt, hiddenChannels: ["qr", "2"] };
  assert.equal(isOptionVisible(o, "qr"), false);
  assert.equal(isOptionVisible(o, 2), false);
  assert.equal(isOptionVisible(o, "1"), true);
});

// ── resolveChannelPackaging ──

const cbom = {
  delivery: [{ id: "unit-box", qty: 1 }, { id: "unit-spoon", qty: "2" }],
  "2": [{ id: "unit-bag", qty: 1 }],
};

t("ช่องมี packaging → คืน rows คูณ itemCount (shape {id, qty} ต่อเข้า cut ได้เลย)", () => {
  assert.deepEqual(resolveChannelPackaging(cbom, "delivery", 3), [
    { id: "unit-box", qty: 3 },
    { id: "unit-spoon", qty: 6 },
  ]);
});
t("qty string จาก form เดิม → Number ให้ · POS channel id เลข → normalize key", () => {
  assert.deepEqual(resolveChannelPackaging(cbom, 2, 1), [{ id: "unit-bag", qty: 1 }]);
});
t("channelBOM absent / ช่องนี้ไม่มี config → []", () => {
  assert.deepEqual(resolveChannelPackaging(undefined, "delivery", 1), []);
  assert.deepEqual(resolveChannelPackaging(null, "delivery", 1), []);
  assert.deepEqual(resolveChannelPackaging(cbom, "pickup", 1), []);
});
t("itemCount 0/ลบ/ไม่ใช่เลข → [] (ไม่ตัดเพิ่ม)", () => {
  assert.deepEqual(resolveChannelPackaging(cbom, "delivery", 0), []);
  assert.deepEqual(resolveChannelPackaging(cbom, "delivery", -2), []);
  assert.deepEqual(resolveChannelPackaging(cbom, "delivery", "x"), []);
});
t("row เสีย (ไม่มี id / qty ว่าง / qty 0 / null) → ข้ามเฉพาะแถวนั้น", () => {
  const dirty = { qr: [{ id: "", qty: 1 }, { id: "u1", qty: "" }, { id: "u2", qty: 0 }, null, { id: "u3", qty: 2 }] };
  assert.deepEqual(resolveChannelPackaging(dirty, "qr", 1), [{ id: "u3", qty: 2 }]);
});

// ── parity: channelKey ชุดเดียวกับ @scanfood/schema ChannelKey (กัน 2 ชั้น drift) ──

t("parity schema↔logic: key ที่ ChannelKey schema รับ ต้องทำงานใน logic ทุกฟังก์ชัน", () => {
  const keys = ["1", "37", "qr", "pickup", "delivery"]; // ชุดตัวแทนจาก ChannelKey (POS numeric-string + self-order 3)
  for (const k of keys) {
    assert.equal(isCategoryVisible({ ...cat, hiddenChannels: [k] }, k, 1, false), false, k);
    assert.equal(isOptionVisible({ ...opt, hiddenChannels: [k] }, k), false, k);
    assert.deepEqual(resolveChannelPackaging({ [k]: [{ id: "u", qty: 1 }] }, k, 2), [{ id: "u", qty: 2 }], k);
  }
});

console.log(`\n${pass}/${pass + fail} passed${fail ? " · " + fail + " FAILED" : ""}`);
process.exit(fail ? 1 : 0);
