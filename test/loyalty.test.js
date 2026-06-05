// @scanfood/logic loyalty test — พิสูจน์ calc "แต้มคงเหลือ/เครดิต" (loyalty-data ต้องไม่เพี้ยน)
// รัน: node test/loyalty.test.js
const assert = require("assert");
const { calcMemberPoints, numberYMD, inWindow, calcMemberCredit, computeCreditExpiry, buildVoucherMap } = require("../src/index");

const now = new Date("2026-06-01T12:00:00+07:00");
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("✅ " + name); } catch (e) { fail++; console.log("❌ " + name + " — " + e.message); } }

t("ปกติ: normal=A+B, nearExpire=B", () => {
  const point = [
    { point: 100, timestamp: "2026-01-01" },
    { point: 50, timestamp: "2025-08-01" },
    { point: 999, timestamp: "2024-01-01" },
  ];
  const r = calcMemberPoints(point, 1, now);
  assert.strictEqual(r.normalPoint, 150, "normalPoint=150 got " + r.normalPoint);
  assert.strictEqual(r.nearExpirePoint, 50, "nearExpirePoint=50 got " + r.nearExpirePoint);
});

t("ว่าง: [] → 0/0", () => {
  const r = calcMemberPoints([], 1, now);
  assert.strictEqual(r.normalPoint, 0);
  assert.strictEqual(r.nearExpirePoint, 0);
  const r2 = calcMemberPoints(undefined, 1, now);
  assert.strictEqual(r2.normalPoint, 0);
});

t("หมดอายุหมด → 0/0", () => {
  const point = [{ point: 500, timestamp: "2023-01-01" }, { point: 300, timestamp: "2024-05-31" }];
  const r = calcMemberPoints(point, 1, now);
  assert.strictEqual(r.normalPoint, 0);
  assert.strictEqual(r.nearExpirePoint, 0);
});

t("boundary: =expireDueDate นับ · =nearExpireDueDate นับ near", () => {
  const point = [
    { point: 10, timestamp: "2025-06-01" },
    { point: 20, timestamp: "2025-12-01" },
    { point: 7, timestamp: "2025-05-31" },
  ];
  const r = calcMemberPoints(point, 1, now);
  assert.strictEqual(r.normalPoint, 30, "normal=30 got " + r.normalPoint);
  assert.strictEqual(r.nearExpirePoint, 30, "near=30 got " + r.nearExpirePoint);
});

t("Firestore Timestamp ({_seconds}) + point เป็น string", () => {
  const ts = Math.floor(new Date("2026-02-01").getTime() / 1000);
  const point = [{ point: "75", timestamp: { _seconds: ts } }];
  const r = calcMemberPoints(point, 1, now);
  assert.strictEqual(r.normalPoint, 75, "normal=75 got " + r.normalPoint);
});

t("numberYMD(2026-06-01)=20260601", () => {
  assert.strictEqual(numberYMD("2026-06-01"), 20260601);
});

t("inWindow: ในช่วง / ก่อน / หลัง / ปลายเปิด", () => {
  const today = 20260602;
  assert.strictEqual(inWindow("2026-06-01", "2026-06-30", today), true, "ในช่วง");
  assert.strictEqual(inWindow("2026-06-03", "2026-06-30", today), false, "ยังไม่เริ่ม");
  assert.strictEqual(inWindow("2026-05-01", "2026-06-01", today), false, "หมดอายุ (เลย endDate)");
  assert.strictEqual(inWindow("2026-06-02", "2026-06-02", today), true, "boundary = today");
  assert.strictEqual(inWindow("", "", today), true, "ไม่กำหนดช่วง = ใช้ได้");
  assert.strictEqual(inWindow("", "2026-06-30", today), true, "เปิดต้น");
  assert.strictEqual(inWindow("2026-06-01", "", today), true, "เปิดปลาย");
});

t("credit: provider.expireCredit — normal=A+B, near=B", () => {
  const credit = [
    { amount: 100, timestamp: "2025-12-01" },
    { amount: 50, timestamp: "2025-07-15" },
    { amount: 999, timestamp: "2024-01-01" },
  ];
  const r = calcMemberCredit(credit, new Map(), 1, now);
  assert.strictEqual(r.normalCredit, 150, "normalCredit=150 got " + r.normalCredit);
  assert.strictEqual(r.nearExpireCredit, 50, "nearExpireCredit=50 got " + r.nearExpireCredit);
});

t("credit: expireCredit=0 → ไม่หมดอายุ (นับทุก entry · near=0)", () => {
  const credit = [
    { amount: 100, timestamp: "2020-01-01" },
    { amount: 200, timestamp: "2026-05-01" },
  ];
  const r = calcMemberCredit(credit, new Map(), 0, now);
  assert.strictEqual(r.normalCredit, 300);
  assert.strictEqual(r.nearExpireCredit, 0);
});

t("credit: amount≤0 ข้าม · [] → 0/0", () => {
  const r = calcMemberCredit([{ amount: 0, timestamp: "2026-05-01" }, { amount: -5, timestamp: "2026-05-01" }], new Map(), 1, now);
  assert.strictEqual(r.normalCredit, 0);
  assert.strictEqual(r.nearExpireCredit, 0);
  assert.strictEqual(calcMemberCredit(undefined, new Map(), 1, now).normalCredit, 0);
});

t("credit: entry.expiryDate (snapshot) override provider.expireCredit", () => {
  const credit = [{ amount: 80, timestamp: "2020-01-01", expiryDate: "2027-01-01" }];
  const r = calcMemberCredit(credit, new Map(), 1, now);
  assert.strictEqual(r.normalCredit, 80, "expiryDate ต้องชนะ → ยังไม่หมด");
});

t("credit: voucher config months override + near detect", () => {
  const voucherMap = buildVoucherMap([{ id: "V1", creditExpireType: "months", creditExpireValue: 2 }]);
  const credit = [{ amount: 60, timestamp: "2026-05-15", voucherId: "V1" }];
  const r = calcMemberCredit(credit, voucherMap, 5, now);
  assert.strictEqual(r.normalCredit, 60);
  assert.strictEqual(r.nearExpireCredit, 60, "voucher exp 2 เดือน → near");
});

t("credit: Firestore Timestamp ({_seconds}) + amount string", () => {
  const ts = Math.floor(new Date("2026-05-01").getTime() / 1000);
  const r = calcMemberCredit([{ amount: "120", timestamp: { _seconds: ts } }], new Map(), 1, now);
  assert.strictEqual(r.normalCredit, 120, "normal=120 got " + r.normalCredit);
});

t("computeCreditExpiry: expireCredit=0 + ไม่มี voucher → null (ไม่หมดอายุ)", () => {
  assert.strictEqual(computeCreditExpiry("2026-01-01", "", new Map(), 0, {}), null);
});

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
