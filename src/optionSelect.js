// @scanfood/logic · optionSelect — เลือก choice ใน smartOption (radio / block / maxChose + df-s28 qty)
// Canonical: ยุบ `updateOption` ที่เคยก๊อปข้าม repo (scanfood cartSlice ↔ scanFood_ordering orderSlice)
//   → import จากที่นี่เท่านั้น · ห้าม redefine (anti-dup · กัน drift · CONTRACT_LAYER §3.1)
// behavior เดิมคง 100% เมื่อ qty ปิด (option.allowChoiceQty !== true หรือ choice นั้น allowQty !== true)
// df-s28 (BLESSED Pack@sess228): กดซ้ำ choice = qty+1 · ปุ่ม − = qty−1 → 0 = chose:false · maxChose นับรวม qty (Σqty ≤ maxChose)
// state ของ chose: false = กดได้ยังไม่กด · true = เลือกแล้ว · 'block' = เต็มโควตา กดไม่ได้
"use strict";

/** choice นี้เปิด qty ไหม — ต้องเปิดสองชั้น (master ระดับหัวข้อ + ติ๊กรายตัว · Pack@sess228) */
function isQtyChoice(option, choice) {
  return !!option && option.allowChoiceQty === true && !!choice && choice.allowQty === true;
}

/** qty ที่นับของ choice เดียว — นับเฉพาะ chose===true · qty absent = 1 (backward compat ทุก consumer) */
function chosenQty(choice) {
  if (!choice || choice.chose !== true) return 0;
  return typeof choice.qty === "number" ? choice.qty : 1;
}

/** จำนวนที่เลือกรวมทั้งหัวข้อ (df-s28 = Σqty · qty absent ทุกตัว → เท่ากับ count(chose===true) เดิม) */
function countChosen(option) {
  if (!option || !Array.isArray(option.choice)) return 0;
  return option.choice.reduce(function (sum, c) {
    return sum + chosenQty(c);
  }, 0);
}

/** block/unblock ตัวที่ยังไม่เลือกเมื่อเต็มโควตา (multi only · ยึด logic เดิม — เต็ม → chose:false กลายเป็น 'block') */
function reblock(option, choices) {
  var total = choices.reduce(function (s, c) {
    return s + chosenQty(c);
  }, 0);
  if (total >= option.maxChose) {
    return choices.map(function (c) {
      return c.chose === false ? Object.assign({}, c, { chose: "block" }) : c;
    });
  }
  return choices.map(function (c) {
    return c.chose === "block" ? Object.assign({}, c, { chose: false }) : c;
  });
}

/**
 * เลือก/กดซ้ำ choice → คืน choice[] ใหม่ (pure · ไม่ mutate ของเดิม)
 * @param option   smartOption row (ต้องมี choice[], maxChose, minChose, allowChoiceQty?)
 * @param choiceId id ตัวเลือกที่กด
 * @param decrement true = ปุ่ม − (ลด qty ลง 1 · ใช้กับ qty choice เท่านั้น)
 */
function chooseChoice(option, choiceId, decrement) {
  var choices = (option && option.choice) || [];
  var tapped = choices.find(function (c) {
    return c.choiceId == choiceId; // eslint-disable-line eqeqeq — id เทียบหลวมตามโค้ดเดิม
  });
  if (!tapped) return choices;

  // ── df-s28 qty path — เฉพาะ choice ที่เปิด qty + หัวข้อ multi (maxChose===1 = radio · Σqty≤1 ไม่มีความหมาย → ใช้ legacy) ──
  if (isQtyChoice(option, tapped) && option.maxChose !== 1) {
    var total = countChosen(option);

    if (decrement) {
      var next = chosenQty(tapped) - 1;
      return reblock(
        option,
        choices.map(function (c) {
          if (c.choiceId != choiceId) return c; // eslint-disable-line eqeqeq
          return next <= 0
            ? Object.assign({}, c, { chose: false, qty: 0 })
            : Object.assign({}, c, { chose: true, qty: next });
        })
      );
    }

    // กด (เพิ่ม) — เต็มโควตาแล้วไม่ทำอะไร (กันเกิน maxChose)
    if (total >= option.maxChose && tapped.chose === true) return reblock(option, choices);
    if (total >= option.maxChose && tapped.chose !== true) return reblock(option, choices);

    if (tapped.chose === true) {
      return reblock(
        option,
        choices.map(function (c) {
          return c.choiceId == choiceId // eslint-disable-line eqeqeq
            ? Object.assign({}, c, { qty: chosenQty(c) + 1 })
            : c;
        })
      );
    }
    // ยังไม่เลือก → เริ่มเลือก qty:1
    return reblock(
      option,
      choices.map(function (c) {
        return c.choiceId == choiceId // eslint-disable-line eqeqeq
          ? Object.assign({}, c, { chose: true, qty: 1 })
          : c;
      })
    );
  }

  // ── legacy path (qty ปิด หรือ choice นี้ไม่เปิด qty) — คง behavior เดิม 100% ──
  if (option.maxChose === 1) {
    if (option.minChose === 0) {
      return choices.map(function (c) {
        return c.choiceId == choiceId // eslint-disable-line eqeqeq
          ? Object.assign({}, c, { chose: !c.chose })
          : Object.assign({}, c, { chose: false });
      });
    }
    return choices.map(function (c) {
      return c.choiceId == choiceId // eslint-disable-line eqeqeq
        ? Object.assign({}, c, { chose: true })
        : Object.assign({}, c, { chose: false });
    });
  }
  // multi: toggle ตัวที่กด แล้ว block/unblock
  var before = choices.map(function (c) {
    return c.choiceId == choiceId // eslint-disable-line eqeqeq
      ? Object.assign({}, c, { chose: !c.chose })
      : c;
  });
  return reblock(option, before);
}

/** minChose ครบไหม (mainChose) — นับ distinct choice ที่ chose===true (ยึด logic เดิม · ไม่ใช่ Σqty) */
function isMainChose(option, choices) {
  var list = choices || (option && option.choice) || [];
  var chosenCount = list.filter(function (c) {
    return c.chose === true;
  }).length;
  return chosenCount >= ((option && option.minChose) || 0);
}

module.exports = { chooseChoice, countChosen, chosenQty, isMainChose, isQtyChoice };
