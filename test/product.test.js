// @scanfood/logic product test — รัน: node test/product.test.js
// (1) PARITY: discountedPrice/productPriceForChannel === logic เดิมที่ก๊อปอยู่ (oracle = ProductScreen/ordering inline)
// (2) edge: promotion ปิด · value '' · id number↔string drift · validate · hydrate (channel fill + category prune)
const assert = require("assert");
const { productPriceForChannel, discountedPrice, validateProductCore, hydrateProductCore } = require("../src/index");

let pass = 0, fail = 0;
const t = (n, fn) => { try { fn(); pass++; console.log("  ✓", n); } catch (e) { fail++; console.log("  ✗", n, "\n     →", e.message); } };

// ── ORACLE: logic เดิมที่ฝังใน ProductScreen.js:127-129 / ordering function.js:234-238 (ก๊อปกัน) ──
function legacyChannelPrice(price, channelId) {
  return price.find((a) => a.id === channelId)?.price || 0;
}
function legacyDiscount(base, promotion) {
  return promotion.status
    ? promotion.type === "bath"
      ? base - Number(promotion.value)
      : (base * (100 - Number(promotion.value))) / 100
    : base;
}

console.log("productPriceForChannel:");
t("ตรง id → ราคาที่เก็บ", () => {
  const price = [{ id: "1", price: 60, status: true }, { id: "qr", price: 65, status: true }];
  assert.strictEqual(productPriceForChannel(price, "qr"), 65);
});
t("ไม่เจอ → 0", () => assert.strictEqual(productPriceForChannel([{ id: "1", price: 60 }], "delivery"), 0));
t("price ไม่ใช่ array → 0", () => assert.strictEqual(productPriceForChannel(undefined, "1"), 0));
t("id drift: เก็บ '1' หา 1 (number) → เจอ (loose ==)", () => {
  assert.strictEqual(productPriceForChannel([{ id: "1", price: 60 }], 1), 60);
});
t("PARITY vs legacy (id===1 number)", () => {
  const price = [{ id: 1, price: 50, status: true }];
  assert.strictEqual(productPriceForChannel(price, 1), legacyChannelPrice(price, 1));
});

console.log("discountedPrice:");
t("bath = base - value", () => assert.strictEqual(discountedPrice(60, { type: "bath", value: 10, status: true }), 50));
t("percent = base*(100-value)/100", () => assert.strictEqual(discountedPrice(100, { type: "percent", value: 20, status: true }), 80));
t("status false → base", () => assert.strictEqual(discountedPrice(60, { type: "bath", value: 10, status: false }), 60));
t("value '' (default) → ไม่เปลี่ยน", () => assert.strictEqual(discountedPrice(60, { type: "bath", value: "", status: true }), 60));
t("price string '60' → 50 (Number coerce ตรง legacy)", () => assert.strictEqual(discountedPrice("60", { type: "bath", value: 10, status: true }), 50));
t("PARITY bath vs legacy", () => {
  const p = { type: "bath", value: 15, status: true };
  assert.strictEqual(discountedPrice(80, p), legacyDiscount(80, p));
});
t("PARITY percent vs legacy", () => {
  const p = { type: "percent", value: 30, status: true };
  assert.strictEqual(discountedPrice(120, p), legacyDiscount(120, p));
});

console.log("validateProductCore:");
t("name+price ครบ → valid", () => {
  const r = validateProductCore({ name: "ผัดไทย", price: [{ id: "1", price: 60, status: true }] });
  assert.deepStrictEqual(r, { valid: true, errors: [] });
});
t("name ว่าง → error name", () => {
  const r = validateProductCore({ name: "  ", price: [{ id: "1", price: 60 }] });
  assert.deepStrictEqual(r, { valid: false, errors: ["name"] });
});
t("price ว่าง → error price", () => {
  const r = validateProductCore({ name: "x", price: [] });
  assert.deepStrictEqual(r, { valid: false, errors: ["price"] });
});
t("ขาดทั้งคู่ → 2 error", () => {
  assert.deepStrictEqual(validateProductCore({}).errors, ["name", "price"]);
});

console.log("hydrateProductCore:");
t("price: เติมแถวที่ขาดต่อช่องทาง (default status:false)", () => {
  const p = { price: [{ id: "1", price: 60, status: true }] };
  const out = hydrateProductCore(p, { channels: [{ id: "1" }, { id: "qr" }] });
  assert.deepStrictEqual(out.price, [{ id: "1", price: 60, status: true }, { id: "qr", price: 0, status: false }]);
});
t("price: dedupe POS ชนะ pseudo (id ชนกัน)", () => {
  const p = { price: [{ id: "delivery", price: 99, status: true }] };
  const out = hydrateProductCore(p, { channels: [{ id: "delivery" }, { id: "delivery" }] });
  assert.strictEqual(out.price.length, 1);
  assert.strictEqual(out.price[0].price, 99);
});
t("category: ทิ้ง id ที่ไม่อยู่ใน tree", () => {
  const out = hydrateProductCore({ category: ["a", "ghost", "b"] }, { categoryIds: ["a", "b", "c"] });
  assert.deepStrictEqual(out.category, ["a", "b"]);
});
t("ไม่ส่ง ctx → ไม่แตะ (pure passthrough)", () => {
  const p = { price: [{ id: "1", price: 5 }], category: ["x"] };
  const out = hydrateProductCore(p, {});
  assert.deepStrictEqual(out.price, p.price);
  assert.deepStrictEqual(out.category, p.category);
});
t("ไม่ mutate ของเดิม", () => {
  const p = { price: [{ id: "1", price: 5, status: true }], category: ["x", "ghost"] };
  hydrateProductCore(p, { channels: [{ id: "1" }, { id: "qr" }], categoryIds: ["x"] });
  assert.strictEqual(p.price.length, 1);
  assert.deepStrictEqual(p.category, ["x", "ghost"]);
});

console.log(`\nproduct: ${pass} pass · ${fail} fail`);
if (fail) process.exit(1);
