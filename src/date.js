// @scanfood/logic — date math (canonical · pure · dependency-free)
// numberYMD / minusYears / plusMonths / toDate — ใช้ใน loyalty calc + window check

// NumberYMD — Number("YYYYMMDD") เช่น 20260601
function numberYMD(time) {
  const d = new Date(time);
  const s =
    d.getFullYear().toString().padStart(4, "0") +
    (d.getMonth() + 1).toString().padStart(2, "0") +
    d.getDate().toString().padStart(2, "0");
  return Number(s);
}

function minusYears(date, years) {
  const r = new Date(date);
  r.setFullYear(r.getFullYear() - years);
  return r;
}

function plusMonths(date, months) {
  const r = new Date(date);
  r.setMonth(r.getMonth() + months);
  return r;
}

// normalize timestamp → Date (Firestore Timestamp admin/serialized · Date · ISO · millis)
function toDate(t) {
  if (!t) return new Date(NaN);
  if (typeof t.toDate === "function") return t.toDate();              // Firestore Timestamp (admin SDK)
  if (typeof t._seconds === "number") return new Date(t._seconds * 1000); // serialized Timestamp
  if (typeof t.seconds === "number") return new Date(t.seconds * 1000);
  return new Date(t);                                                 // Date / ISO string / millis
}

module.exports = { numberYMD, minusYears, plusMonths, toDate };
