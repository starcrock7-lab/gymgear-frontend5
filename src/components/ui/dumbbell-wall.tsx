/* Hero wallpaper v6: a drifting wall of glass dumbbells that costs almost
   nothing to run. The last version moved about 2,100 SVG shapes every frame on
   the main thread (98% busy on a throttled phone). Here one dumbbell is drawn
   once as a tile, the tile repeats as a background image, and two layers slide
   by transform only, so the browser's compositor does all the moving. */

/* The tile is public/dumbbell-tile.svg: two rows tall with the dumbbell in the
   top row. One layer shows the odd rows and the other the even rows, shifted
   down one cell, so neighboring rows can drift in opposite directions. */
const CELL = 78;
const TILE = "url(/dumbbell-tile.svg)";

const BACKDROP =
  "radial-gradient(ellipse 85% 78% at 50% 38%, #17294f 0%, #0d1b35 46%, #060c1b 100%)";

/* The backdrop again, solid in the middle, laid over the dumbbells so they
   frame the headline. It never changes, so it paints once. Masking the moving
   layers instead would re-composite the mask on every frame. */
const CLEAR_CENTER =
  "radial-gradient(ellipse 56% 60% at 50% 46%, #000 44%, transparent 82%)";

export default function DumbbellWall() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes db-drift-a { from { transform: translate3d(-${CELL}px,0,0); } to { transform: translate3d(0,0,0); } }
        @keyframes db-drift-b { from { transform: translate3d(0,0,0); } to { transform: translate3d(-${CELL}px,0,0); } }
        .db-layer { position: absolute; inset: 0 -${CELL}px 0 0; will-change: transform; }
        .db-layer-a { animation: db-drift-a 26s linear infinite; }
        .db-layer-b { animation: db-drift-b 26s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .db-layer-a, .db-layer-b { animation: none; }
        }
      `}</style>

      <div className="absolute inset-0" style={{ background: BACKDROP }} />
      <div className="db-layer db-layer-a" style={{ backgroundImage: TILE }} />
      <div
        className="db-layer db-layer-b"
        style={{ backgroundImage: TILE, backgroundPosition: `0 ${CELL}px` }}
      />
      <div
        className="absolute inset-0"
        style={{ background: BACKDROP, maskImage: CLEAR_CENTER, WebkitMaskImage: CLEAR_CENTER }}
      />
      <div className="starfield absolute inset-0 opacity-50" />

      {/* Soft floor fade into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy to-transparent" />
    </div>
  );
}
