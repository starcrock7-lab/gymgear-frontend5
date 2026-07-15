/* Equipment icons for the gym area — the /gym plan listings and the /planner
   floor map + palette. Every icon is a top-down silhouette (the way you'd see
   the piece on a floor plan) drawn on currentColor so it inherits the tile
   colour. Resolution order: product id → equipment TYPE → category fallback,
   so a power rack, squat stand and wall-fold rack all read differently, and
   five spin bikes deliberately share one honest spin-bike glyph. */

type Props = { id: string; category: string; className?: string; style?: React.CSSProperties };

/* One family colour per category — the single source of truth shared by the
   2D map tiles, the palette icons and the 3D models, so a category reads as
   the same hue everywhere. Orange (the GymGear accent) stays on racks, the
   hero category; every un-mapped category also falls back to the brand
   orange. Keep these in step with the CSS tokens in globals.css. */
export const FAMILY_COLORS: Record<string, string> = {
  racks: "#f0531e", // brand accent
  machines: "#a78bfa", // violet
  cardio: "#38bdf8", // sky
  benches: "#f43f5e", // rose
  dumbbells: "#2fbf62", // win green
};
export const familyColor = (category: string) => FAMILY_COLORS[category] ?? "#f0531e";

const svg = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/* One glyph per real equipment type. Convention: the user-approach side faces
   down; wall-mounted pieces draw the wall as a thick line at the top. */
const ICONS = {
  /* 4-post cage: corner posts, pull-up bar, loaded barbell wider than the frame */
  powerRack: svg(<>
    <rect x="5.5" y="4.5" width="13" height="15" rx="1" />
    <rect x="4.4" y="3.4" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="17.2" y="3.4" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="4.4" y="18.2" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="17.2" y="18.2" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <line x1="5.5" y1="8" x2="18.5" y2="8" />
    <line x1="2" y1="14" x2="22" y2="14" />
    <line x1="3.6" y1="11.9" x2="3.6" y2="16.1" strokeWidth={2.4} />
    <line x1="20.4" y1="11.9" x2="20.4" y2="16.1" strokeWidth={2.4} />
  </>),
  /* 2 posts + open rails — no rear frame */
  halfRack: svg(<>
    <rect x="4.8" y="3.6" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="16.8" y="3.6" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <line x1="6" y1="4.8" x2="18" y2="4.8" />
    <line x1="6" y1="6" x2="6" y2="19" />
    <line x1="18" y1="6" x2="18" y2="19" />
    <line x1="3.8" y1="19" x2="8.2" y2="19" />
    <line x1="15.8" y1="19" x2="20.2" y2="19" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="3.6" y1="9.9" x2="3.6" y2="14.1" strokeWidth={2.4} />
    <line x1="20.4" y1="9.9" x2="20.4" y2="14.1" strokeWidth={2.4} />
  </>),
  /* two independent uprights with cross feet, bar resting across */
  squatStand: svg(<>
    <path d="M2.8 10h6.4M6 6.8v6.4" />
    <path d="M14.8 10h6.4M18 6.8v6.4" />
    <circle cx="6" cy="10" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="10" r="1.5" fill="currentColor" stroke="none" />
    <line x1="2" y1="16.5" x2="22" y2="16.5" />
    <line x1="4.2" y1="14.6" x2="4.2" y2="18.4" strokeWidth={2.4} />
    <line x1="19.8" y1="14.6" x2="19.8" y2="18.4" strokeWidth={2.4} />
  </>),
  /* folds off a wall: thick wall line, two swing arms, bar across the ends */
  wallRack: svg(<>
    <line x1="3.5" y1="3.6" x2="20.5" y2="3.6" strokeWidth={2.6} />
    <line x1="7" y1="4.8" x2="7" y2="13" />
    <line x1="17" y1="4.8" x2="17" y2="13" />
    <rect x="5.8" y="12.4" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="15.8" y="12.4" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    <line x1="4" y1="18.5" x2="20" y2="18.5" />
    <line x1="5.6" y1="16.7" x2="5.6" y2="20.3" strokeWidth={2.2} />
    <line x1="18.4" y1="16.7" x2="18.4" y2="20.3" strokeWidth={2.2} />
  </>),
  /* two weight-stack towers, crossbeam, cables down to handles */
  functionalTrainer: svg(<>
    <rect x="3.5" y="4" width="4.6" height="8" rx="0.8" />
    <rect x="15.9" y="4" width="4.6" height="8" rx="0.8" />
    <rect x="4.7" y="5.6" width="2.2" height="5" fill="currentColor" stroke="none" opacity="0.75" />
    <rect x="17.1" y="5.6" width="2.2" height="5" fill="currentColor" stroke="none" opacity="0.75" />
    <line x1="8.1" y1="5.4" x2="15.9" y2="5.4" />
    <line x1="5.8" y1="12" x2="5.8" y2="16.4" />
    <line x1="18.2" y1="12" x2="18.2" y2="16.4" />
    <circle cx="5.8" cy="18" r="1.5" />
    <circle cx="18.2" cy="18" r="1.5" />
  </>),
  /* all-in-one: full frame, twin stacks, smith bar, pull-up bar */
  allInOne: svg(<>
    <rect x="3.5" y="3.5" width="17" height="14" rx="1" />
    <rect x="5.2" y="5.2" width="2.6" height="6" fill="currentColor" stroke="none" opacity="0.75" />
    <rect x="16.2" y="5.2" width="2.6" height="6" fill="currentColor" stroke="none" opacity="0.75" />
    <line x1="9.5" y1="6" x2="14.5" y2="6" />
    <line x1="2" y1="14.5" x2="22" y2="14.5" />
    <line x1="3.4" y1="12.8" x2="3.4" y2="16.2" strokeWidth={2.2} />
    <line x1="20.6" y1="12.8" x2="20.6" y2="16.2" strokeWidth={2.2} />
    <line x1="7" y1="20.4" x2="17" y2="20.4" />
  </>),
  /* single stack tower, cable to a handle */
  cableTower: svg(<>
    <rect x="9" y="3.5" width="6" height="9.5" rx="0.8" />
    <rect x="10.5" y="5.2" width="3" height="6.2" fill="currentColor" stroke="none" opacity="0.75" />
    <line x1="12" y1="13" x2="12" y2="16.8" />
    <circle cx="12" cy="18.4" r="1.6" />
    <line x1="7.5" y1="20.8" x2="16.5" y2="20.8" />
  </>),
  /* stack tower beside a seat with a press arm */
  homeGym: svg(<>
    <rect x="14.2" y="3.8" width="5.6" height="9.5" rx="0.8" />
    <rect x="15.6" y="5.5" width="2.8" height="6.2" fill="currentColor" stroke="none" opacity="0.75" />
    <rect x="4.5" y="8.5" width="5" height="8.5" rx="2" fill="currentColor" stroke="none" opacity="0.85" />
    <line x1="9.5" y1="11" x2="14.2" y2="11" />
    <line x1="9.5" y1="15" x2="14.2" y2="15" />
  </>),
  /* Tonal-style wall unit: slim panel on the wall, two arms swung out */
  wallUnit: svg(<>
    <line x1="3.5" y1="3.6" x2="20.5" y2="3.6" strokeWidth={2.6} />
    <rect x="8.2" y="4.8" width="7.6" height="3.6" rx="0.8" fill="currentColor" stroke="none" opacity="0.85" />
    <path d="M8.2 7.2 4.8 12.6" />
    <path d="M15.8 7.2 19.2 12.6" />
    <circle cx="4.8" cy="14.2" r="1.5" />
    <circle cx="19.2" cy="14.2" r="1.5" />
  </>),
  /* plate-loaded row: chest pad + seat between two plate horns */
  plateRow: svg(<>
    <circle cx="5" cy="9" r="3" />
    <circle cx="5" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="9" r="3" />
    <circle cx="19" cy="9" r="1" fill="currentColor" stroke="none" />
    <rect x="9.2" y="6.2" width="5.6" height="3.2" rx="1.6" fill="currentColor" stroke="none" opacity="0.85" />
    <line x1="12" y1="9.4" x2="12" y2="13.5" />
    <rect x="9.8" y="13.5" width="4.4" height="5.5" rx="1.6" fill="currentColor" stroke="none" opacity="0.85" />
  </>),
  /* 45° leg press: wide foot plate, rails converging to the seat */
  legPress: svg(<>
    <rect x="4.5" y="3.5" width="15" height="4" rx="1" />
    <rect x="6" y="4.6" width="12" height="1.8" fill="currentColor" stroke="none" opacity="0.5" />
    <line x1="8" y1="7.5" x2="10" y2="15.5" />
    <line x1="16" y1="7.5" x2="14" y2="15.5" />
    <rect x="8.3" y="15.5" width="7.4" height="5" rx="1.8" fill="currentColor" stroke="none" opacity="0.85" />
  </>),
  /* GHD: round hip pad, spine rail, foot plate with roller dots */
  ghd: svg(<>
    <circle cx="12" cy="6.8" r="3.4" fill="currentColor" stroke="none" opacity="0.85" />
    <line x1="12" y1="10.2" x2="12" y2="15.5" />
    <rect x="8" y="15.5" width="8" height="4" rx="1" />
    <circle cx="10.2" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="13.8" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
  </>),
  /* treadmill: console bar with rails, long deck, moving belt */
  treadmill: svg(<>
    <line x1="6.5" y1="4" x2="17.5" y2="4" strokeWidth={2.4} />
    <line x1="7.5" y1="5.2" x2="7.5" y2="8" />
    <line x1="16.5" y1="5.2" x2="16.5" y2="8" />
    <rect x="8" y="6.5" width="8" height="14" rx="2" />
    <path d="M10.2 10.2h3.6M10.2 13.2h3.6M10.2 16.2h3.6" opacity="0.8" />
  </>),
  /* rower: flywheel, footplates, monorail, sliding seat */
  rower: svg(<>
    <circle cx="5" cy="12" r="3.1" />
    <circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <path d="M8.4 8.6l2.4-1.6" strokeWidth={2.2} />
    <path d="M8.4 15.4l2.4 1.6" strokeWidth={2.2} />
    <line x1="8.1" y1="12" x2="21" y2="12" />
    <rect x="13" y="9.9" width="4.2" height="4.2" rx="1.3" fill="currentColor" stroke="none" opacity="0.9" />
    <line x1="21" y1="10.4" x2="21" y2="13.6" />
  </>),
  /* ski erg: fan head on a mast, two cables pulled down to handles */
  skiErg: svg(<>
    <rect x="8.8" y="3.5" width="6.4" height="4.6" rx="1" />
    <circle cx="12" cy="5.8" r="1.1" fill="currentColor" stroke="none" />
    <line x1="12" y1="8.1" x2="12" y2="19" />
    <line x1="7.2" y1="20.5" x2="16.8" y2="20.5" />
    <path d="M10 8.1 8.3 14.2" />
    <path d="M14 8.1 15.7 14.2" />
    <circle cx="8" cy="15.8" r="1.3" />
    <circle cx="16" cy="15.8" r="1.3" />
  </>),
  /* air bike: fan wheel with X spokes up front, arms out, seat behind */
  airBike: svg(<>
    <circle cx="12" cy="7.8" r="4.3" />
    <path d="M9 4.8l6 6M15 4.8l-6 6" opacity="0.8" />
    <circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" />
    <path d="M7.7 7.8 3.8 5.6" />
    <path d="M16.3 7.8 20.2 5.6" />
    <line x1="12" y1="12.1" x2="12" y2="16.5" />
    <rect x="9.8" y="16.5" width="4.4" height="4.2" rx="1.5" fill="currentColor" stroke="none" opacity="0.9" />
  </>),
  /* spin bike: bullhorn bars, stem, flywheel, saddle */
  spinBike: svg(<>
    <path d="M7 5h10M7 5v3.2M17 5v3.2" strokeWidth={1.8} />
    <line x1="12" y1="5" x2="12" y2="16.5" />
    <circle cx="12" cy="10.8" r="2.2" fill="currentColor" stroke="none" opacity="0.45" />
    <circle cx="12" cy="10.8" r="2.2" />
    <rect x="10" y="16.5" width="4" height="4.2" rx="1.5" fill="currentColor" stroke="none" opacity="0.9" />
  </>),
  /* elliptical: console, center rail, two long pedals, rear flywheel */
  elliptical: svg(<>
    <line x1="8" y1="3.8" x2="16" y2="3.8" strokeWidth={2.4} />
    <line x1="12" y1="5" x2="12" y2="16" />
    <rect x="5.6" y="8" width="3.2" height="7" rx="1.2" fill="currentColor" stroke="none" opacity="0.85" />
    <rect x="15.2" y="8" width="3.2" height="7" rx="1.2" fill="currentColor" stroke="none" opacity="0.85" />
    <circle cx="12" cy="18.3" r="2.1" />
  </>),
  /* bench pad from above with head-pad seam and feet */
  bench: svg(<>
    <rect x="8" y="3.8" width="8" height="16.4" rx="2.6" fill="currentColor" stroke="none" opacity="0.85" />
    <line x1="8.6" y1="8.6" x2="15.4" y2="8.6" opacity="0.4" />
    <path d="M5.8 6.2h1.6M16.6 6.2h1.6M5.8 17.8h1.6M16.6 17.8h1.6" />
  </>),
  /* dumbbell rack: frame with three loaded pairs */
  dumbbellRack: svg(<>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    {[8, 12, 16].map((y) => (
      <g key={y}>
        <circle cx="8" cy={y} r="1.25" fill="currentColor" stroke="none" />
        <circle cx="16" cy={y} r="1.25" fill="currentColor" stroke="none" />
        <line x1="9.4" y1={y} x2="14.6" y2={y} />
      </g>
    ))}
  </>),
  /* barbell: bar, thick sleeves, collar ticks */
  barbell: svg(<>
    <line x1="2.5" y1="12" x2="21.5" y2="12" />
    <line x1="3.6" y1="12" x2="6.8" y2="12" strokeWidth={3.6} />
    <line x1="17.2" y1="12" x2="20.4" y2="12" strokeWidth={3.6} />
    <line x1="8" y1="10.3" x2="8" y2="13.7" />
    <line x1="16" y1="10.3" x2="16" y2="13.7" />
  </>),
  /* plate pair: front plate with hub over a second behind */
  plates: svg(<>
    <circle cx="14.5" cy="9.5" r="5.4" opacity="0.55" />
    <circle cx="9.5" cy="13.5" r="5.8" fill="currentColor" stroke="none" opacity="0.18" />
    <circle cx="9.5" cy="13.5" r="5.8" />
    <circle cx="9.5" cy="13.5" r="1.6" fill="currentColor" stroke="none" />
  </>),
  kettlebell: svg(<>
    <path d="M8.6 9.6a3.4 3.4 0 0 1 6.8 0" />
    <circle cx="12" cy="14.6" r="4.6" fill="currentColor" stroke="none" opacity="0.2" />
    <circle cx="12" cy="14.6" r="4.6" />
  </>),
  /* resistance band: flat loop */
  band: svg(<>
    <ellipse cx="12" cy="10.8" rx="8" ry="3.1" />
    <ellipse cx="12" cy="13.2" rx="8" ry="3.1" />
  </>),
  /* flooring: rubber tiles */
  flooring: svg(<>
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M12 4v16M4 12h16" />
    <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" opacity="0.6" />
    <circle cx="16" cy="16" r="0.8" fill="currentColor" stroke="none" opacity="0.6" />
  </>),
  box: svg(<rect x="6" y="6" width="12" height="12" rx="2" />),
} as const;

type IconType = keyof typeof ICONS;

/* Product id → equipment type. Every placeable catalog id gets a row; new
   products: add here AND in FOOTPRINTS (see gymgear-catalog skill). */
const TYPE_OF: Record<string, IconType> = {
  // racks & stands
  "rogue-rm6": "powerRack", "rogue-r3": "powerRack", "rogue-rml390f": "powerRack",
  "rep-pr5000": "powerRack", "rep-pr4000": "powerRack", "titan-x3": "powerRack",
  "rep-hr100": "halfRack",
  "bells-squat": "squatStand", "rogue-squat": "squatStand", "titan-t2": "squatStand", "rogue-sml2": "squatStand",
  "prx-profile-pro": "wallRack",
  // machines & functional
  "rep-arcadia": "functionalTrainer", "bells-ft": "functionalTrainer",
  "titan-ft": "functionalTrainer", "lifefitness-g7": "functionalTrainer",
  "force-usa-g3": "allInOne", "force-usa-g6": "allInOne", "force-usa-g20": "allInOne",
  "bells-cable-tower": "cableTower",
  "bodysolid-exm2500": "homeGym", "bowflex-x2se": "homeGym", "marcy-mwm990": "homeGym",
  "tonal-2": "wallUnit",
  "hs-iso-row": "plateRow",
  "hs-leg-press": "legPress", "bodysolid-slp500": "legPress",
  "rogue-ghd": "ghd",
  // cardio
  "nordictrack-1750": "treadmill", "assault-runner": "treadmill",
  "lifefitness-t3": "treadmill", "lf-club-treadmill": "treadmill",
  "concept2-rower": "rower", "sunny-rower": "rower", "waterrower-oak": "rower", "hydrow-wave": "rower",
  "concept2-ski": "skiErg",
  "assault-bike": "airBike", "rogue-echo-bike": "airBike",
  "peloton-bike": "spinBike", "schwinn-ic4": "spinBike", "concept2-bikeerg": "spinBike",
  "lf-club-elliptical": "elliptical",
};

const CATEGORY_TYPE: Record<string, IconType> = {
  racks: "powerRack",
  machines: "functionalTrainer",
  cardio: "treadmill",
  benches: "bench",
  dumbbells: "dumbbellRack",
  barbells: "barbell",
  plates: "plates",
  kettlebells: "kettlebell",
  bands: "band",
  flooring: "flooring",
};

export type EquipmentType = IconType;

/* Shared resolver: the 3D scene uses the same id → type map as the icons,
   so the glyph on the 2D map and the model in the 3D view always agree. */
export function equipmentTypeOf(id: string, category: string): EquipmentType {
  return TYPE_OF[id] ?? CATEGORY_TYPE[category] ?? "box";
}

export function EquipmentIcon({ id, category, className, style }: Props) {
  const type = equipmentTypeOf(id, category);
  return <span className={className} style={style}>{ICONS[type]}</span>;
}
