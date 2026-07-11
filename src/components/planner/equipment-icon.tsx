/* Small top-down machine icons for pieces on the floor plan. Chosen by
   product id first (so a treadmill, rower and bike read differently), then by
   category. Solid/line SVGs on currentColor so they inherit the tile colour.
   Drawn as if viewed from above — the way you'd see them on a floor plan. */

type Props = { id: string; category: string; className?: string };

const svg = (children: React.ReactNode, vb = "0 0 24 24") => (
  <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/* id → icon overrides (cardio subtypes, all-in-ones, etc.). */
const BY_ID: Record<string, React.ReactNode> = {
  // rowers — long rail with a seat
  "concept2-rower": svg(<><line x1="3" y1="12" x2="21" y2="12" /><rect x="9" y="9" width="5" height="6" rx="1" fill="currentColor" stroke="none" /><circle cx="20" cy="12" r="1.4" /></>),
  "sunny-rower": svg(<><line x1="3" y1="12" x2="21" y2="12" /><rect x="9" y="9" width="5" height="6" rx="1" fill="currentColor" stroke="none" /><circle cx="20" cy="12" r="1.4" /></>),
  "waterrower-oak": svg(<><line x1="3" y1="12" x2="21" y2="12" /><rect x="9" y="9" width="5" height="6" rx="1" fill="currentColor" stroke="none" /><circle cx="20" cy="12" r="1.4" /></>),
  "concept2-ski": svg(<><line x1="6" y1="3" x2="6" y2="21" /><line x1="18" y1="3" x2="18" y2="21" /><path d="M6 8h12" /></>),
  // bikes — two wheels + frame
  "rogue-echo-bike": svg(<><circle cx="6" cy="15" r="4" /><circle cx="18" cy="15" r="4" /><path d="M6 15l4-6h5l3 6" /><path d="M10 9h4" /></>),
  "schwinn-ic4": svg(<><circle cx="6" cy="15" r="4" /><circle cx="18" cy="15" r="4" /><path d="M6 15l4-6h5l3 6" /><path d="M10 9h4" /></>),
  "assault-bike": svg(<><circle cx="6" cy="15" r="4" /><circle cx="18" cy="15" r="4" /><path d="M6 15l4-6h5l3 6" /><path d="M10 9h4" /></>),
  "concept2-bikeerg": svg(<><circle cx="6" cy="15" r="4" /><circle cx="18" cy="15" r="4" /><path d="M6 15l4-6h5l3 6" /><path d="M10 9h4" /></>),
  "peloton-bike": svg(<><circle cx="6" cy="15" r="4" /><circle cx="18" cy="15" r="4" /><path d="M6 15l4-6h5l3 6" /><path d="M10 9h4" /></>),
};

/* Category → icon fallback. */
function categoryIcon(category: string): React.ReactNode {
  switch (category) {
    case "racks": // power rack, viewed top-down: four posts + a bar
      return svg(<><rect x="5" y="4" width="14" height="16" rx="1" /><circle cx="8" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="17" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="17" r="1" fill="currentColor" stroke="none" /><line x1="5" y1="12" x2="19" y2="12" /></>);
    case "machines": // functional trainer / cable stack
      return svg(<><rect x="4" y="4" width="4" height="16" rx="1" /><rect x="16" y="4" width="4" height="16" rx="1" /><path d="M8 8h8M8 16h8" /></>);
    case "cardio": // treadmill deck (generic) — belt + console
      return svg(<><rect x="5" y="4" width="14" height="16" rx="2" /><line x1="5" y1="8" x2="19" y2="8" /><path d="M9 12h6M9 15h6" /></>);
    case "benches": // bench pad from above
      return svg(<><rect x="6" y="7" width="12" height="10" rx="2" fill="currentColor" stroke="none" opacity="0.85" /><line x1="6" y1="12" x2="18" y2="12" opacity="0.4" /></>);
    case "dumbbells": // a dumbbell
      return svg(<><circle cx="6" cy="12" r="3" /><circle cx="18" cy="12" r="3" /><line x1="9" y1="12" x2="15" y2="12" strokeWidth={2.4} /></>);
    default:
      return svg(<rect x="6" y="6" width="12" height="12" rx="2" />);
  }
}

export function EquipmentIcon({ id, category, className }: Props) {
  const node = BY_ID[id] ?? categoryIcon(category);
  return <span className={className}>{node}</span>;
}
