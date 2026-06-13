// @scanfood/logic — canonical business logic shared across Scanfood apps
// import from here only · never copy/redefine (anti-dup · prevents drift)
//   loyalty · rank · channelVisibility · optionSelect · product · 🔜 backlog: VAT · BOM cost/yield
module.exports = {
  ...require("./date"),    // numberYMD, minusYears, plusMonths, toDate
  ...require("./loyalty"), // summary, calcMemberPoints, inWindow, buildVoucherMap, computeCreditExpiry, calcMemberCredit
  ...require("./rank"),    // resolveRankLevelId, RANK_CONVERTOR
  ...require("./channelVisibility"), // isChannelHidden, isCategoryVisible, isOptionVisible, resolveChannelPackaging
  ...require("./optionSelect"), // chooseChoice, countChosen, chosenQty, isMainChose, isQtyChoice (df-s28)
  ...require("./product"), // productPriceForChannel, discountedPrice, validateProductCore, hydrateProductCore (sess237 slice ①)
};
