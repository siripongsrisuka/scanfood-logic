// @scanfood/logic — rank resolve (canonical · pure)
// 🔑 member เก็บแค่ rank(name) + rankLevel(index) — rankLevelId เป็น DERIVED value
const RANK_CONVERTOR = { BRONZE: 0, SILVER: 1, GOLD: 2 };

/**
 * @param {object} member member data (มี rank, rankLevel)
 * @param {Array} providerLevels ระดับสมาชิก[] (แต่ละ entry มี id)
 * @returns {string} rankLevelId · "" ถ้าไม่มี level
 */
function resolveRankLevelId(member, providerLevels) {
  const levels = Array.isArray(providerLevels) ? providerLevels : [];
  if (!levels.length) return "";
  const m = member || {};
  const newRankLevel = m.rankLevel ? m.rankLevel : RANK_CONVERTOR[m.rank]; // 0/undefined falsy → fallback ชื่อ rank
  const byIndex = levels[newRankLevel] && levels[newRankLevel].id;
  return byIndex || (levels[levels.length - 1] && levels[levels.length - 1].id) || "";
}

module.exports = { resolveRankLevelId, RANK_CONVERTOR };
