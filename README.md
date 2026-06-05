# @scanfood/logic

Canonical **business logic** shared across Scanfood apps — pairs with `@scanfood/schema`:

| package | role |
|---|---|
| `@scanfood/schema` | data **shape** (Zod) |
| `@scanfood/logic` | **behavior** / business rules (pure fn) ← this repo |

> Rule: business rules (calc / filter / window / money-math) live here only — import, never re-implement per app (prevents drift).

## Install

```jsonc
// consumer package.json
"@scanfood/logic": "github:siripongsrisuka/scanfood-logic#v0.1.0"
```

```js
const { calcMemberPoints, calcMemberCredit, inWindow, resolveRankLevelId } = require("@scanfood/logic");
// ESM: import { inWindow } from "@scanfood/logic";
```

dependency-free pure JS → Node (CJS) · webpack · Metro

## Domains

- **loyalty** — `calcMemberPoints` · `calcMemberCredit` · `computeCreditExpiry` · `buildVoucherMap` · `inWindow` · date-math (`numberYMD`/`minusYears`/`plusMonths`/`toDate`)
- **rank** — `resolveRankLevelId` · `RANK_CONVERTOR`
- backlog: VAT · BOM cost/yield

## Test

```bash
npm test    # 23/23
```
