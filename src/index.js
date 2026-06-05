// @scanfood/logic — canonical business logic shared across Scanfood apps
// import from here only · never copy/redefine (anti-dup · prevents drift)
//   loyalty · rank · 🔜 backlog: VAT · BOM cost/yield
module.exports = {
  ...require("./date"),    // numberYMD, minusYears, plusMonths, toDate
  ...require("./loyalty"), // summary, calcMemberPoints, inWindow, buildVoucherMap, computeCreditExpiry, calcMemberCredit
  ...require("./rank"),    // resolveRankLevelId, RANK_CONVERTOR
};
