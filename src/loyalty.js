// @scanfood/logic — loyalty calc (canonical · pure · loyalty-data ต้องไม่เพี้ยน)
// แก้ที่นี่ที่เดียว ทุก app import ตัวนี้ (กัน drift)
const { numberYMD, minusYears, plusMonths, toDate } = require("./date");

// summary — reduce Number(arr[key])
function summary(arr, key) {
  return (arr || []).reduce((a, b) => Number(a) + (Number(b[key]) || 0), 0);
}

/**
 * calcMemberPoints — "แต้มคงเหลือ" + "แต้มใกล้หมดอายุ"
 * @param {Array} point member point:[] (entry { point, timestamp })
 * @param {number} expirePoint อายุแต้ม (ปี)
 * @param {Date} now inject ได้เพื่อ test deterministic
 * @returns {{ normalPoint:number, nearExpirePoint:number }}
 */
function calcMemberPoints(point, expirePoint, now = new Date()) {
  const expireDueDate = numberYMD(minusYears(now, expirePoint));
  const nearExpireDueDate = numberYMD(plusMonths(minusYears(now, expirePoint), 6));
  const normalArr = (point || []).filter((a) => numberYMD(toDate(a.timestamp)) >= expireDueDate);
  const nearArr = normalArr.filter((a) => numberYMD(toDate(a.timestamp)) <= nearExpireDueDate);
  return {
    normalPoint: summary(normalArr, "point"),
    nearExpirePoint: summary(nearArr, "point"),
  };
}

/**
 * inWindow — startDate–endDate ใช้ได้ ณ today ไหม
 * @param {*} startDate Firestore Timestamp / Date / ms / ISO (ว่าง = ไม่จำกัดต้น)
 * @param {*} endDate เช่นเดียวกัน (ว่าง = ไม่จำกัดปลาย)
 * @param {number} today numberYMD(now)
 * @returns {boolean}
 */
function inWindow(startDate, endDate, today) {
  const s = startDate ? numberYMD(toDate(startDate)) : 0;
  const e = endDate ? numberYMD(toDate(endDate)) : 0;
  return (!s || s <= today) && (!e || e >= today);
}

// buildVoucherMap — voucher[] → Map(id→doc) สำหรับ lookup อายุต่อ voucher
function buildVoucherMap(vouchers = []) {
  return new Map((vouchers || []).map((v) => [v.id, v]));
}

/**
 * computeCreditExpiry — วันหมดอายุของ credit 1 entry
 * ลำดับ: entry.expiryDate (snapshot) → voucher config (creditExpireType/Value) → expireCredit (ปี)
 * @returns {Date|null} null = ไม่มีวันหมดอายุ
 */
function computeCreditExpiry(baseDate, voucherId, voucherMap, expireCredit, entry) {
  if (entry && entry.expiryDate) {
    const e = toDate(entry.expiryDate);
    if (!isNaN(e.getTime())) return e;
  }
  if (!baseDate) return null;
  const base = toDate(baseDate);
  if (isNaN(base.getTime())) return null;

  const v = voucherId && voucherMap ? voucherMap.get(voucherId) : null;
  if (v && v.creditExpireType && v.creditExpireType !== "provider" && Number(v.creditExpireValue) > 0) {
    const val = Number(v.creditExpireValue);
    const r = new Date(base);
    if (v.creditExpireType === "days") r.setDate(r.getDate() + val);
    else if (v.creditExpireType === "months") r.setMonth(r.getMonth() + val);
    else if (v.creditExpireType === "years") r.setFullYear(r.getFullYear() + val);
    return r;
  }

  const years = Number(expireCredit) || 0;
  if (!years) return null;
  const r = new Date(base);
  r.setFullYear(r.getFullYear() + years);
  return r;
}

/**
 * calcMemberCredit — "เครดิตคงเหลือ" + "เครดิตใกล้หมดอายุ"
 * @param {Array} credit member credit:[] (entry { amount, timestamp, voucherId?, expiryDate? })
 * @param {Map} voucherMap จาก buildVoucherMap (อายุต่อ voucher)
 * @param {number} expireCredit อายุเครดิต (ปี · default fallback)
 * @param {Date} now inject ได้เพื่อ test deterministic
 * @returns {{ normalCredit:number, nearExpireCredit:number }}
 */
function calcMemberCredit(credit, voucherMap, expireCredit, now = new Date()) {
  const credit3mo = plusMonths(now, 3);
  let normalCredit = 0;
  let nearExpireCredit = 0;
  for (const a of credit || []) {
    const amt = Number(a.amount) || 0;
    if (amt <= 0) continue;
    const exp = computeCreditExpiry(a.timestamp, a.voucherId, voucherMap, expireCredit, a);
    if (exp && exp <= now) continue; // หมดอายุแล้ว → ไม่นับ
    normalCredit += amt;
    if (exp && exp <= credit3mo) nearExpireCredit += amt; // ใกล้หมดใน 3 เดือน
  }
  return { normalCredit, nearExpireCredit };
}

module.exports = {
  summary,
  calcMemberPoints,
  inWindow,
  buildVoucherMap,
  computeCreditExpiry,
  calcMemberCredit,
};
