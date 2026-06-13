// @scanfood/logic optionSelect test — รัน: node test/optionSelect.test.js
// (1) PARITY: qty ปิด → output === logic เดิม (oracle = inline updateOption ที่ก๊อปอยู่ cartSlice/orderSlice)
// (2) df-s28 qty: กดซ้ำ=+1 · − =−1→0=chose:false · Σqty≤maxChose (block) · 2-ชั้น gate
const assert = require("assert");
const { chooseChoice, countChosen, chosenQty, isMainChose, isQtyChoice } = require("../src/index");

let pass = 0, fail = 0;
const t = (n, fn) => { try { fn(); pass++; console.log("  ✓", n); } catch (e) { fail++; console.log("  ✗", n, "\n     →", e.message); } };

// ── ORACLE: logic เดิมที่ฝังใน cartSlice.js:238-272 / orderSlice.js (ก๊อปกัน) ──
function legacyUpdate(option, choiceId) {
  const sel = option;
  let newChoice = [];
  if (sel.maxChose === 1) {
    if (sel.minChose === 0) {
      newChoice = sel.choice.map((item) => (item.choiceId == choiceId ? { ...item, chose: !item.chose } : { ...item, chose: false }));
    } else {
      newChoice = sel.choice.map((item) => (item.choiceId == choiceId ? { ...item, chose: true } : { ...item, chose: false }));
    }
  } else {
    const before = sel.choice.map((item) => (item.choiceId == choiceId ? { ...item, chose: !item.chose } : item));
    const checkMax = before.filter((item) => item.chose == true);
    if (checkMax.length === sel.maxChose) {
      newChoice = before.map((item) => (item.chose === false ? { ...item, chose: "block" } : item));
    } else {
      newChoice = before.map((item) => (item.chose === "block" ? { ...item, chose: false } : item));
    }
  }
  return newChoice;
}

const C = (id, extra = {}) => ({ choiceId: id, choiceName: id, chose: false, status: "available", BOM: [], ...extra });

// ── (1) PARITY — qty ปิด ต้องตรง oracle เป๊ะ ──

t("radio (max1·min0): กดเลือก → toggle · ตัวอื่น false (=oracle)", () => {
  const opt = { maxChose: 1, minChose: 0, choice: [C("a"), C("b"), C("c")] };
  assert.deepEqual(chooseChoice(opt, "a"), legacyUpdate(opt, "a"));
});

t("radio (max1·min1): บังคับเลือก 1 → กดได้ chose:true · ตัวอื่น false (=oracle)", () => {
  const opt = { maxChose: 1, minChose: 1, choice: [C("a", { chose: true }), C("b")] };
  assert.deepEqual(chooseChoice(opt, "b"), legacyUpdate(opt, "b"));
});

t("multi (max2): เลือกตัวแรก ยังไม่เต็ม → ไม่ block (=oracle)", () => {
  const opt = { maxChose: 2, minChose: 0, choice: [C("a"), C("b"), C("c")] };
  assert.deepEqual(chooseChoice(opt, "a"), legacyUpdate(opt, "a"));
});

t("multi (max2): เลือกครบ 2 → ตัวที่เหลือ block (=oracle)", () => {
  const opt = { maxChose: 2, minChose: 0, choice: [C("a", { chose: true }), C("b"), C("c")] };
  assert.deepEqual(chooseChoice(opt, "b"), legacyUpdate(opt, "b"));
  const r = chooseChoice(opt, "b");
  assert.equal(r.find((x) => x.choiceId === "c").chose, "block");
});

t("multi (max2): เต็มแล้วเอาออก 1 → ปลด block (=oracle)", () => {
  const opt = { maxChose: 2, minChose: 0, choice: [C("a", { chose: true }), C("b", { chose: true }), C("c", { chose: "block" })] };
  assert.deepEqual(chooseChoice(opt, "a"), legacyUpdate(opt, "a"));
  const r = chooseChoice(opt, "a");
  assert.equal(r.find((x) => x.choiceId === "c").chose, false);
});

t("qty ปิดแต่ allowChoiceQty=true (choice.allowQty ไม่ติ๊ก) → ยังเป็น legacy (2 ชั้น)", () => {
  const opt = { maxChose: 3, minChose: 0, allowChoiceQty: true, choice: [C("a"), C("b")] };
  assert.deepEqual(chooseChoice(opt, "a"), legacyUpdate(opt, "a"));
});

// ── (2) df-s28 QTY — เปิดสองชั้น ──

const Q = (id, extra = {}) => C(id, { allowQty: true, ...extra });

t("isQtyChoice: ต้องเปิดทั้ง option.allowChoiceQty + choice.allowQty", () => {
  assert.equal(isQtyChoice({ allowChoiceQty: true }, { allowQty: true }), true);
  assert.equal(isQtyChoice({ allowChoiceQty: true }, { allowQty: false }), false);
  assert.equal(isQtyChoice({ allowChoiceQty: false }, { allowQty: true }), false);
});

t("qty: กดครั้งแรก → chose:true qty:1", () => {
  const opt = { maxChose: 5, minChose: 0, allowChoiceQty: true, choice: [Q("a"), Q("b")] };
  const r = chooseChoice(opt, "a");
  assert.equal(r.find((x) => x.choiceId === "a").chose, true);
  assert.equal(r.find((x) => x.choiceId === "a").qty, 1);
});

t("qty: กดซ้ำ → qty+1 (กุ้ง×2)", () => {
  const opt = { maxChose: 5, minChose: 0, allowChoiceQty: true, choice: [Q("a", { chose: true, qty: 1 }), Q("b")] };
  const r = chooseChoice(opt, "a");
  assert.equal(r.find((x) => x.choiceId === "a").qty, 2);
});

t("qty: ปุ่ม − ลด qty · ถึง 0 = chose:false", () => {
  const opt = { maxChose: 5, minChose: 0, allowChoiceQty: true, choice: [Q("a", { chose: true, qty: 2 })] };
  const r1 = chooseChoice(opt, "a", true);
  assert.equal(r1.find((x) => x.choiceId === "a").qty, 1);
  const opt2 = { ...opt, choice: r1 };
  const r2 = chooseChoice(opt2, "a", true);
  assert.equal(r2.find((x) => x.choiceId === "a").chose, false);
  assert.equal(r2.find((x) => x.choiceId === "a").qty, 0);
});

t("maxChose นับรวม qty: กุ้ง×2 + พริก×1 = 3 (Σqty)", () => {
  const opt = { maxChose: 3, minChose: 0, allowChoiceQty: true, choice: [Q("a", { chose: true, qty: 2 }), Q("b", { chose: true, qty: 1 }), Q("c")] };
  assert.equal(countChosen(opt), 3);
});

t("qty: เต็มโควตา (Σqty===maxChose) → เพิ่มไม่ได้ + ตัวที่ยังไม่เลือก block", () => {
  const opt = { maxChose: 3, minChose: 0, allowChoiceQty: true, choice: [Q("a", { chose: true, qty: 2 }), Q("b", { chose: true, qty: 1 }), Q("c")] };
  const r = chooseChoice(opt, "a"); // เพิ่ม a ขณะเต็ม
  assert.equal(r.find((x) => x.choiceId === "a").qty, 2, "qty ต้องไม่เพิ่มเกิน");
  assert.equal(r.find((x) => x.choiceId === "c").chose, "block", "ตัวว่างต้อง block");
});

t("qty: เริ่มเลือกตัวใหม่ขณะเต็ม → ไม่เริ่ม (block)", () => {
  const opt = { maxChose: 2, minChose: 0, allowChoiceQty: true, choice: [Q("a", { chose: true, qty: 2 }), Q("c")] };
  const r = chooseChoice(opt, "c");
  assert.notEqual(r.find((x) => x.choiceId === "c").chose, true);
});

t("chosenQty: qty absent → 1 ถ้า chose · 0 ถ้าไม่ chose", () => {
  assert.equal(chosenQty({ chose: true }), 1);
  assert.equal(chosenQty({ chose: true, qty: 4 }), 4);
  assert.equal(chosenQty({ chose: false, qty: 4 }), 0);
});

t("isMainChose: นับ distinct chose===true ≥ minChose (ไม่ใช่ Σqty)", () => {
  const opt = { minChose: 2, choice: [Q("a", { chose: true, qty: 5 }), Q("b")] };
  assert.equal(isMainChose(opt), false, "1 distinct < min 2 แม้ qty=5");
  const opt2 = { minChose: 2, choice: [C("a", { chose: true }), C("b", { chose: true })] };
  assert.equal(isMainChose(opt2), true);
});

t("pure: ไม่ mutate option/choice เดิม", () => {
  const opt = { maxChose: 5, minChose: 0, allowChoiceQty: true, choice: [Q("a", { chose: true, qty: 1 })] };
  const snap = JSON.stringify(opt);
  chooseChoice(opt, "a");
  assert.equal(JSON.stringify(opt), snap);
});

console.log(`\noptionSelect: ${pass} pass · ${fail} fail`);
if (fail) process.exit(1);
