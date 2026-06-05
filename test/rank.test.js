// @scanfood/logic rank test — คุมทุก branch ของ resolveRankLevelId · รัน: node test/rank.test.js
const assert = require("assert");
const { resolveRankLevelId, RANK_CONVERTOR } = require("../src/index");

const LEVELS = [{ id: "BRONZE" }, { id: "SILVER" }, { id: "GOLD" }, { id: "uuid-plat" }];
let pass = 0, fail = 0;
const t = (n, fn) => { try { fn(); pass++; console.log("  ✓", n); } catch (e) { fail++; console.log("  ✗", n, "\n     →", e.message); } };

t("rankLevel=2 (truthy) → index ตรง → GOLD", () => {
  assert.equal(resolveRankLevelId({ rank: "GOLD", rankLevel: 2 }, LEVELS), "GOLD");
});
t("rankLevel=0 (falsy) → fallback convertor[rank] → BRONZE", () => {
  assert.equal(resolveRankLevelId({ rank: "BRONZE", rankLevel: 0 }, LEVELS), "BRONZE");
});
t("rankLevel undefined → fallback convertor[rank]=SILVER → index 1", () => {
  assert.equal(resolveRankLevelId({ rank: "SILVER" }, LEVELS), "SILVER");
});
t("rankLevel=3 → uuid tier (index ตรง)", () => {
  assert.equal(resolveRankLevelId({ rank: "x", rankLevel: 3 }, LEVELS), "uuid-plat");
});
t("rank ไม่อยู่ใน convertor + ไม่มี rankLevel → ตกระดับสูงสุด (last)", () => {
  assert.equal(resolveRankLevelId({ rank: "PLATINUM" }, LEVELS), "uuid-plat");
});
t("index เกินช่วง (rankLevel=9) → ตกระดับสูงสุด (last)", () => {
  assert.equal(resolveRankLevelId({ rank: "x", rankLevel: 9 }, LEVELS), "uuid-plat");
});
t("provider ไม่มี rankLevel (empty) → '' (ไม่มี level ให้เทียบ)", () => {
  assert.equal(resolveRankLevelId({ rank: "BRONZE", rankLevel: 0 }, []), "");
  assert.equal(resolveRankLevelId({ rank: "BRONZE" }, undefined), "");
});
t("member ว่าง → ตกระดับสูงสุด (last) ถ้ามี level", () => {
  assert.equal(resolveRankLevelId({}, LEVELS), "uuid-plat");
  assert.equal(resolveRankLevelId(null, LEVELS), "uuid-plat");
});
t("convertor mapping = BRONZE:0 SILVER:1 GOLD:2 (lock)", () => {
  assert.deepEqual(RANK_CONVERTOR, { BRONZE: 0, SILVER: 1, GOLD: 2 });
});

console.log(`\n${pass}/${pass + fail} passed${fail ? " · " + fail + " FAILED" : ""}`);
process.exit(fail ? 1 : 0);
