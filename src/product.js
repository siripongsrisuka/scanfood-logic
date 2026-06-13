// @scanfood/logic · product — ราคา/โปรโมชัน/validate/hydrate ระดับเมนู (sess237 slice ① CORE)
// Canonical: ยุบ discounted-price + channel-price ที่เคยก๊อปข้ามจอ/ข้าม repo
//   (scanfood ProductScreen ↔ scanFood_ordering MenuBoard/ProductDisplay/orderSlice/function.js)
//   → import จากที่นี่เท่านั้น · ห้าม redefine (anti-dup · กัน drift · CONTRACT_LAYER)
// behavior เดิมคง 100% — เลขออกมาเท่าเดิมทุกเคสจริง (price '' หรือ number · promotion default {type:'bath',value:'',status:false})
// shape อ้าง @scanfood/schema Product (sess237): price[]={id:ChannelKey, price, status} · promotion={type:'bath'|'percent', value, status}
"use strict";

/**
 * ราคาฐานของเมนูบนช่องทางที่ระบุ — เทียบ id หลวม (legacy บางจอใช้เลข 1 · schema/EditProduct เขียน String(id))
 * คืน row.price ดิบ (อาจเป็น string จาก legacy doc) · ไม่เจอ → 0
 *   เดิม: ProductScreen.js:129 findInArray(price,'id',channelId)?.price||0 · ordering function.js:234 price.find(a=>a.id===1)?.price||0
 * @param {Array<{id,price,status}>} price  product.price[]
 * @param {string|number} channelKey        ช่องทาง (POS id เช่น '1'/1 · self-order 'qr'|'pickup'|'delivery')
 */
function productPriceForChannel(price, channelKey) {
  if (!Array.isArray(price)) return 0;
  const row = price.find(function (p) {
    return p && p.id == channelKey; // eslint-disable-line eqeqeq — legacy id: number 1 vs string '1'
  });
  return (row && row.price) || 0;
}

/**
 * ราคาหลังหักโปรโมชันระดับเมนู — bath = ลดเป็นบาท · percent = ลดเป็น %
 *   เดิม (เลขเดียวกันทุกจุด): ProductScreen.js:127-128 · ordering function.js:236-238 · orderSlice.js:554-556 · MenuBoard.js:588 · ProductDisplay.js:908
 * promotion.status !== true → คืน base เดิม (ไม่ลด) · value '' → Number('')=0 → ไม่เปลี่ยน (คง backward compat)
 * @param {number|string} price          ราคาฐาน (เช่นจาก productPriceForChannel)
 * @param {{type,value,status}} promotion product.promotion
 */
function discountedPrice(price, promotion) {
  const base = Number(price);
  if (!promotion || promotion.status !== true) return base;
  return promotion.type === "bath"
    ? base - Number(promotion.value)
    : (base * (100 - Number(promotion.value))) / 100;
}

/**
 * ตรวจ field จำเป็นขั้นต่ำของเมนูที่ขายได้ (ใช้ก่อน write · /claude/product create)
 *   name ต้องมี (ไม่ว่าง) · price ต้องมีอย่างน้อย 1 ช่องทาง
 * @param {object} product
 * @returns {{valid:boolean, errors:string[]}}  errors = ชื่อ field ที่ขาด
 */
function validateProductCore(product) {
  const errors = [];
  if (!product || !product.name || !String(product.name).trim()) errors.push("name");
  if (!product || !Array.isArray(product.price) || product.price.length === 0) errors.push("price");
  return { valid: errors.length === 0, errors };
}

/**
 * normalize เมนูให้สอดคล้องบริบทร้าน (pure · ไม่ mutate) — ใช้ฝั่ง consumer ตอนอ่าน/แสดง
 *   price : คืน 1 แถวต่อช่องทางของร้าน (shop.channel + pseudo qr/pickup/delivery ถ้าส่งมา) —
 *           ใช้แถวที่เก็บไว้ ถ้าไม่มี → default {id, price:0, status:false} (ตรง EditProduct ที่โชว์ครบทุกช่องทาง :655)
 *   category : ทิ้ง id ที่ไม่อยู่ใน tree (smartCategory) แล้ว — กัน dangling ref ตอนลบหมวด
 * dedupe ช่องทางตาม id (POS string ชนชื่อ pseudo ได้ · POS มาก่อนชนะ — ตรง sess229 packagingChannels :653)
 * @param {object} product
 * @param {{channels?:Array<{id,name}>, categoryIds?:string[]}} ctx  ช่องทาง+id หมวดที่ valid ของร้าน
 */
function hydrateProductCore(product, ctx) {
  if (!product) return product;
  const channels = (ctx && Array.isArray(ctx.channels)) ? ctx.channels : null;
  const validCats = (ctx && Array.isArray(ctx.categoryIds)) ? new Set(ctx.categoryIds) : null;
  const out = Object.assign({}, product);

  if (channels) {
    const stored = Array.isArray(product.price) ? product.price : [];
    const seen = new Set();
    const price = [];
    for (const ch of channels) {
      const id = String(ch.id);
      if (seen.has(id)) continue; // POS ชนะ pseudo (มาก่อน)
      seen.add(id);
      const row = stored.find(function (p) {
        return p && String(p.id) === id;
      });
      price.push(row || { id: id, price: 0, status: false });
    }
    out.price = price;
  }

  if (validCats) {
    const cats = Array.isArray(product.category) ? product.category : [];
    out.category = cats.filter(function (c) {
      return validCats.has(c);
    });
  }

  return out;
}

module.exports = { productPriceForChannel, discountedPrice, validateProductCore, hydrateProductCore };
