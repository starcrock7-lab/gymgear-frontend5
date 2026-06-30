/* Editorial buying guides. Each is anchored to a real category in the catalog
   (so the picks are our GymGear Score data, not invented) and adds genuinely
   useful "how to choose" criteria — general, accurate buying knowledge, not a
   spec echo. That combination is the information gain. */

export type GuideCriterion = { h: string; body: string };

export type Guide = {
  slug: string;
  category: string; // backend category key
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lead: string; // intro after the top pick is named
  criteria: GuideCriterion[];
};

export const GUIDES: Guide[] = [
  {
    slug: "best-power-rack",
    category: "racks",
    metaTitle: "Best Power Rack for a Home Gym (2026) — ranked & tested criteria",
    metaDescription:
      "The best power racks for a home or garage gym, ranked by GymGear Score, plus exactly what to check before you buy: steel gauge, height, hole spacing, and safeties.",
    h1: "Best power rack for a home gym",
    lead: "A rack is the backbone of a home gym — it's what makes heavy squatting and pressing safe when you train alone. The picks below are ranked by our GymGear Score; under them is what actually separates a rack worth keeping for a decade from one you'll replace.",
    criteria: [
      {
        h: "Steel gauge",
        body: "11-gauge steel is the home-gym standard and barely flexes under heavy loads. 14-gauge is lighter and cheaper but noticeably less rigid — fine for moderate weight, worth upgrading past if you'll load it heavy.",
      },
      {
        h: "Height and footprint",
        body: "Measure your ceiling first. Most racks run 80–93 inches tall, and you need clearance to press overhead inside it. Then check the floor footprint against your actual space, not the space you wish you had.",
      },
      {
        h: "Hole spacing",
        body: "Westside spacing (tighter 1-inch holes through the bench-press zone) lets you set J-cups and safeties to the exact height you need. Standard spacing is fine for most lifters and costs less.",
      },
      {
        h: "Safeties",
        body: "Pin-and-pipe safeties or strap safeties catch a failed rep. If you train without a spotter, this is non-negotiable — it's the whole reason a rack beats a pair of stands.",
      },
      {
        h: "Attachments and uprights",
        body: "Check what bolts on — pull-up bar, dip handles, landmine, weight storage. A rack you can grow into beats a cheaper one you outgrow and replace.",
      },
    ],
  },
  {
    slug: "best-barbell",
    category: "barbells",
    metaTitle: "Best Barbell for a Home Gym (2026) — ranked + buying guide",
    metaDescription:
      "The best all-round barbells ranked by GymGear Score, and how to choose: knurling, whip, coating, tensile strength, and sleeve type explained simply.",
    h1: "Best barbell for a home gym",
    lead: "One good multipurpose bar handles squats, presses, deadlifts and rows for years. The ranking below is by GymGear Score; the criteria after it explain the few specs that genuinely change how a bar feels in your hands.",
    criteria: [
      {
        h: "Knurling",
        body: "Aggressive knurl grips hard for deadlifts but chews up your hands on high-rep sets. A moderate knurl is the right call for general training — grippy enough, not punishing.",
      },
      {
        h: "Whip and shaft diameter",
        body: "A 28mm shaft flexes (whip) for Olympic lifts; a 29mm bar is stiffer for powerlifting. If you do a bit of everything, a 28.5mm multipurpose bar is the safe middle.",
      },
      {
        h: "Coating",
        body: "Bare steel grips best but needs oiling or it rusts. Cerakote and stainless resist rust with a slight grip trade-off; zinc and black oxide are budget middle grounds.",
      },
      {
        h: "Tensile strength",
        body: "190,000 PSI and up is plenty for a home gym. The bigger numbers mostly matter if you regularly drop heavily loaded Olympic lifts.",
      },
      {
        h: "Sleeve type",
        body: "Bushing sleeves are durable and quieter; bearing sleeves spin faster for Olympic lifting and cost more. Pick bearings only if you're cleaning and snatching often.",
      },
    ],
  },
  {
    slug: "best-adjustable-dumbbells",
    category: "dumbbells",
    metaTitle: "Best Adjustable Dumbbells for a Small Space (2026) — ranked",
    metaDescription:
      "The best adjustable dumbbells ranked by GymGear Score, plus how to choose for a small apartment: adjustment mechanism, weight range, footprint, and durability.",
    h1: "Best adjustable dumbbells for a small space",
    lead: "Adjustable dumbbells replace a whole rack of fixed weights in one footprint — the reason they're the go-to for apartments and small rooms. Picks are ranked by GymGear Score; the buying notes below are where the cheap ones quietly fall down.",
    criteria: [
      {
        h: "Adjustment mechanism",
        body: "Dial and selector systems change weight in seconds but have more moving parts to fail. Plate-loaded adjustables are cheaper and tougher but slower to change between sets.",
      },
      {
        h: "Weight range",
        body: "A 5–50 lb pair covers most training. 5–90 lb sets cost more but save you buying a second set once your presses and rows climb.",
      },
      {
        h: "Footprint and stand",
        body: "The whole point is space. Confirm the pair (and an optional stand) fits where you'll actually keep it, and that you can pick them up off the floor comfortably.",
      },
      {
        h: "Long-term durability",
        body: "Cheaper selectorized dumbbells can rattle, jam, or drop a plate over time. Read the owner reviews for the year-two experience, not just the unboxing.",
      },
    ],
  },
  {
    slug: "best-weight-bench",
    category: "benches",
    metaTitle: "Best Weight Bench for a Home Gym (2026) — flat & adjustable, ranked",
    metaDescription:
      "The best weight benches ranked by GymGear Score, and how to choose between a flat and an adjustable FID bench: capacity, pad gap, stability, and pad dimensions.",
    h1: "Best weight bench for a home gym",
    lead: "A bench is the cheapest piece that unlocks the most exercises. The ranking is by GymGear Score; the notes below cover the difference between flat and adjustable and the small details that decide whether a bench feels solid or sketchy under a heavy press.",
    criteria: [
      {
        h: "Flat vs adjustable (FID)",
        body: "A flat utility bench is the sturdiest and cheapest option. An adjustable flat-incline-decline (FID) bench unlocks incline and decline pressing for far more exercises, at a higher price and slightly less rock-solid feel.",
      },
      {
        h: "Weight capacity and stability",
        body: "Look for a 1,000 lb rated capacity and a wide base. Any wobble under a heavy press is dangerous — stability matters more than a long spec sheet.",
      },
      {
        h: "Pad gap",
        body: "On adjustable benches, check the gap between the seat and back pad. A big gap digs into your back on incline; the best benches close it down.",
      },
      {
        h: "Pad height and width",
        body: "A lower pad keeps your feet planted for leg drive. Around 10–12 inches of pad width supports your back without pinching your shoulder blades.",
      },
    ],
  },
];

export const getGuide = (slug: string): Guide | undefined =>
  GUIDES.find((g) => g.slug === slug);
