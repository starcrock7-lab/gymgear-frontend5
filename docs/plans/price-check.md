# Price check: "the same gym for less"

The selling point: GymGear makes a home gym easier to plan and, where it can, cheaper. We show it by putting each plan's price next to what the same gear typically costs, and by making the builder pick the better-value product when one exists.

This file holds the rules. Any change to the price check, its wording, or the compare classes must keep every rule below. `npm run check:price` enforces the ones a script can.

## How other sites do it (researched 2026-11-07)

- **Google Shopping price insights:** shows whether a price is low, typical or high. It places the price on a low-to-high range bar built from sellers across the web, using roughly 90 days of history. We borrow the range ("$174 to $335") and the word "typical".
- **PCPartPicker:** shows a running build total, picks the lowest-priced store for each part, and keeps price history per part. We borrow the per-piece breakdown that adds up to the total.
- **FTC Guides Against Deceptive Pricing (16 CFR 233.2):** the rules for any "compared to" price in the US.
  - A comparison price must not be "fictitious or misleading".
  - It must not "appreciably exceed" what substantial sales happen at.
  - A comparison against *different* products is allowed only when they are of "essentially similar" quality, the buyer is told a comparison is being made, and the price reflects what representative sellers charge, not a few outliers.
  - Our rules below follow this.

Sources: [16 CFR 233.2](https://www.law.cornell.edu/cfr/text/16/233.2), [Google price insights](https://support.google.com/faqs/answer/10675605), [PCPartPicker overview](https://windowsreport.com/pc-part-picker).

## The rules (never break these)

1. **No typed-in numbers.** Every price, total and difference is arithmetic on catalog prices at the moment the kit is built (`lib/price-check.ts`). No hand-written amounts, no model-written copy, no figures in JSON files that nothing recomputes.
2. **Compare like with like.** A piece is only compared against products that do the same job at a similar grade, judged by what each listing itself states. When a listing doesn't say enough to place it, it stays out. Different grades are different classes: competition plates, smart rowers, folding racks and short racks are not mixed into the plain classes they resemble.
3. **Three or more, or nothing.** A class needs at least `MIN_COMPARABLES` (3) products published today. With fewer, that piece isn't compared, and the page says "Compared on N of M pieces".
4. **Typical means the median.** Never the highest price, never a list price when a sale is live, never an average that one $10,000 machine can drag up. Both sides use the buyer's price today (`salePrice || price`).
5. **Only products someone can buy now.** Shelved, sold-out and unpublished rows never enter the typical. Products priced at their lightest size (`PRICED_BY_SIZE`) are never in a class.
6. **Show it either way.** When a plan costs more than typical, the page says so ("$135 more than the typical price for the same gear"). Hiding unfavourable comparisons turns a fact into an ad.
7. **Say what was compared.** The scope is "comparable products on our list", never "the market", "elsewhere" or "other stores". Every comparison links to `/methodology#price-check`.
8. **Banned words** (the gate greps for them): retail value, worth, MSRP, elsewhere, market price, save up to, guarantee, lowest price, best price. Also never write "you save" for the typical comparison. That phrase is for live sales (`deals.ts`), which have their own verified compare-at price.
9. **"Better" only from the score.** A piece is called higher-scoring only when its GymGear Score is above its class median score. No "better", "premium" or "pro-grade" claims from anywhere else.
10. **No dates we don't have.** Products carry no per-row price-check date, so the page doesn't print one. Add a date only after the price job stores one per row (phase 3).
11. **Sales and typical stay separate.** Live-sale savings (compare-at minus sale) and the typical comparison are never added together into one "total savings" number. That would count one discount twice.
12. **No gym-membership comparison** until it rests on a sourced, dated figure, cited on the page.
13. **A crossed-out price says what it is, right above the number.** Either "Typical price for the same gear" or "List price". The typical one is a comparison across products, never presented as a former price of this gear (`/methodology#price-check` and the Details panel both say so). Pieces we can't compare count at their own price on both sides, so the new price is always the real plan total (`planTypical`, `planYours`; `check:price` checks both). When the plan isn't cheaper and nothing is on sale, nothing is crossed out.

## Results page panel (2026-11-08)

`PriceCheck.tsx` is the first thing on the results page: the crossed-out price, the plan total running down to its exact value, and the saving in a glowing pill. The bigger of the two true savings leads: typical price ("$145 less than typical") or live sale ("You save $60"). The other is listed underneath, and they are never added together (rule 11). The Details panel keeps every line, range and score.

## How it works now (phase 1, done)

- **Compare classes:** `COMPARE_CLASSES` in `src/lib/price-check.ts` is a hand-made list of product ids in 10 classes: power racks, squat stands, folding half racks, 20 kg barbells, 160 lb bumper sets, flat benches, adjustable benches, weight-stack functional trainers, rowers, and 4 to 6 mm yoga mats. Mats were first one class, which set a $25 mat against $250 ones and made up most of some plans' saving. Now only mats whose listing states 4 to 6 mm are compared. Two 8 mm mats are too few for a class, and the Gaiam listing states no thickness, so those are not compared.
- **Server side:** `classStats(catalog)` computes each class's median, low, high, count and median score. `/api/kit` sends this as `priceClasses`, keyed by product id.
- **Results page:** `PriceCheck.tsx` re-runs `priceCheck(products, priceClasses)` on the kit as it stands, so swaps and removals stay correct. It shows one line, for example "$135 more than the typical price for the same gear · Compared on 2 of 5 pieces". A Details panel lists each piece: your price, the typical price, the range, the number of products compared, and the score against typical.
- **Methodology page:** `/methodology#price-check` explains the method in plain words.
- **Gate:** `npm run check:price`. It fails when:
  - an id sits in two classes;
  - a class mixes categories;
  - a class includes a range-priced listing;
  - a banned phrase appears on the page or the methodology page;
  - a typical price falls outside its own range;
  - a line's price differs from the kit's;
  - the totals are not the sum of the lines;
  - a kit keeps a piece that a same-class product beats on price and score (added in phase 2).

  Across 1,728 kits it also prints how often each tier comes out cheaper or dearer than typical.

Measured at launch (1,728 kits):

| Tier | Cheaper than typical | More than typical | Median difference |
|---|---|---|---|
| Best Value | 481 | 39 | $97 less |
| Best Match | 258 | 203 | $43 less |
| Best Quality | 286 | 207 | $43 less |

Honest reading at launch: the recommended plan was only modestly cheaper than typical. Phase 2 below changed that.

## Phase 2: the builder finds the better value (done 2026-11-07)

The price check had found **208 Best Match picks and 232 Best Quality picks where a comparable product was both cheaper and higher-scoring**. Examples: the Monster Utility Bench ($335, score 78) when the Utility Bench 2.0 is $174 and scores 86; HG 2.0 plates over Echo; the Ohio Power Bar over the Ohio Bar. The cause was the match score's budget-fit term, which rewards spending up to a category's share of the budget.

What changed:

- **Last builder pass:** `beats()` in `lib/price-check.ts` is now the final pass of `buildKit`, in both copies (`kit-builder.ts`, and `server.js` with its own copy of `COMPARE_CLASSES`, lockstep). No piece stays when a product in the same class costs less and has a higher GymGear Score.
  - The replacement must pass `eligible()`, keep plate-loaded and rack-like the same, fit the room, and keep every movement level.
  - The best-scoring beater is taken, so nothing can beat it in turn.
- **One rule for all tiers.** A Best Quality exception (keep the better-built piece) was tried and dropped. Labels are re-sorted by price after building, so quality-built kits showed up as "Best Match" with a lower-scoring piece. The page shows the Score, so the Score decides.
- **Hard failure:** `check:price` now fails on any beaten pick.
- **Reach audit:** `audit:personalization` no longer counts beaten products when it measures catalog reach. They are never picked by design: 23 products, reach 65/111 = 59%.

Measured after phase 2 (1,728 kits):

| Tier | Cheaper than typical | More than typical | Median difference |
|---|---|---|---|
| Best Value | 490 | 30 | $97 less |
| Best Match | 430 | 33 | $48 less |
| Best Quality | 452 | 49 | $130 less |

`score:kits` (3,024 kits), before and after phase 2:
- Average share of the budget used by the recommended plan: 108.6% → 104.8%.
- Average GymGear Score of the recommended plan: 82.2 → 82.6.
- Strength kits with no barbell: 2 → 0.
- Identical tiers: 138 → 140.
- **Recommended plan missing a muscle group: 124 → 144.** Every added case is strength or full-home-gym at $300-$2,000 and misses only conditioning, which those goals don't require. No kit lost gear: cheaper benches lowered the other plans, so after the price sort the barbell plan is labelled Best Match instead of Best Value. Known, accepted.

## Phase 3: wider and dated (later)

- **Per-row price date:** have the daily price job store a checked-at date per row. Then show "Prices checked {date}" and drop any class member not checked in the last 14 days.
- **More classes, as the catalog grows:** adjustable dumbbells, air bikes, ski ergs and single kettlebells by weight. Each needs 3 or more products whose listings state the attribute the class is defined by.
- **Product pages:** a Google-style range bar on product and compare pages ("Typical for 20 kg barbells we list: $315, range $241 to $339").
- **Homepage line:** phase 2 has landed, so this is next. One sentence computed by a script over every quiz kit, such as the median difference for Best Match. The script writes it to a generated file, the build fails when the file is older than the catalog, and the sentence names its scope ("than the typical price of the same gear on our list").

## Adding or changing a compare class

1. All members are in the same category and do the same job at the same grade, according to their own listing (name or specs). If unsure, leave the product out.
2. At least 3 members are published.
3. None of them is in `PRICED_BY_SIZE`.
4. Run `npm run check:price` and read the notes: unpublished members and classes too small to use are listed.
5. A new product in a classed category but in no class is simply not compared. That is the safe default, not a bug.
