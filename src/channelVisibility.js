// @scanfood/logic — channel visibility (canonical · pure)
// Spec: agents/channel-visibility-redesign.md (✅ BLESSED Pack@sess227 · shapes Pack@sess228)
// channelKey = String(shop.channel[].id) | 'qr' | 'pickup' | 'delivery'
// 🔑 semantics (single source — consumer ทุกตัว import ห้ามเขียนเอง):
//   hiddenChannels absent/[] = แสดงทุกช่องทาง · enable=false (eye) = ปิดทุกช่องทาง (แรงกว่า)
//   hideEmptyCategories default false (Pack เคาะ @sess227 — ร้านเปิดเอง)

/**
 * channelKey อยู่ใน hiddenChannels ไหม — normalize เป็น string สองฝั่ง (POS id เป็นเลขใน shop.channel[])
 * @param {Array<string>|undefined} hiddenChannels field บน category item / option หัวข้อ
 * @param {string|number} channelKey
 * @returns {boolean}
 */
function isChannelHidden(hiddenChannels, channelKey) {
  if (!Array.isArray(hiddenChannels) || hiddenChannels.length === 0) return false;
  const key = String(channelKey);
  return hiddenChannels.some((c) => String(c) === key);
}

/**
 * หมวดนี้แสดงบนช่องทางนี้ไหม (Layer A + B รวมจุดตัดสินเดียว)
 * @param {object} categoryItem item ใน smartCategory[].value[] (มี enable, hiddenChannels)
 * @param {string|number} channelKey
 * @param {number} sellableCountInSubtree จำนวนสินค้า status==='available' ที่ขายบน channel นี้ ทั้ง subtree (caller นับ)
 * @param {boolean} [hideEmptyCategories=false] shop.hideEmptyCategories (Layer A · default false = โชว์หมวดว่างตามเดิม)
 * @returns {boolean}
 */
function isCategoryVisible(categoryItem, channelKey, sellableCountInSubtree, hideEmptyCategories) {
  const item = categoryItem || {};
  if (item.enable === false) return false; // eye ปิด = ปิดทุกช่องทาง (absent = เปิด — BOM category ไม่มี field นี้)
  if (isChannelHidden(item.hiddenChannels, channelKey)) return false;
  if (hideEmptyCategories === true && !(Number(sellableCountInSubtree) > 0)) return false;
  return true;
}

/**
 * หัวข้อ option นี้แสดงบนช่องทางนี้ไหม (ระดับหัวข้ออย่างเดียว — Pack เคาะ #3 ไม่ลง choice รายตัว)
 * @param {object} option row ใน shop.smartOption[]
 * @param {string|number} channelKey
 * @returns {boolean}
 */
function isOptionVisible(option, channelKey) {
  return !isChannelHidden((option || {}).hiddenChannels, channelKey);
}

/**
 * รวม packaging ที่ต้องตัดเพิ่มของช่องทางนี้ — คืน rows shape เดียวกับ product.BOM (`{id, qty}` · id = unitId)
 * พร้อม concat เข้า allBom ของจุดตัด stock ได้เลย (bomManager resolve rawMatId จาก units master เอง)
 * @param {object|undefined} channelBOM product.channelBOM — { [channelKey]: [{id, qty}] }
 * @param {string|number} channelKey
 * @param {number} itemCount จำนวนชิ้นที่ขาย (qty ใน row = ต่อชิ้น)
 * @returns {Array<{id:string, qty:number}>} [] เมื่อไม่มี config/ช่องนี้ไม่มี packaging/itemCount ไม่บวก
 */
function resolveChannelPackaging(channelBOM, channelKey, itemCount) {
  const count = Number(itemCount);
  if (!channelBOM || typeof channelBOM !== "object" || !(count > 0)) return [];
  const rows = channelBOM[String(channelKey)];
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && r.id && Number(r.qty) > 0) // qty string '' / 0 / ติดลบ = ข้าม (form เดิมเก็บ string ได้)
    .map(({ id, qty }) => ({ id, qty: Number(qty) * count }));
}

module.exports = { isChannelHidden, isCategoryVisible, isOptionVisible, resolveChannelPackaging };
