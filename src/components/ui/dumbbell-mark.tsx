/* Custom dumbbell glyph for the "award" emblem on product cards. Solid-filled
   weights (outer collar + tall inner plate on each side of a central bar) so it
   reads clearly as a dumbbell at badge size — the thin lucide stroke did not.
   Colour comes from `currentColor` / the .gg-dumbbell svg rule. */
export function DumbbellMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* left: outer collar + tall plate */}
      <rect x="1.4" y="10" width="2.9" height="8" rx="1.2" />
      <rect x="4.9" y="6.6" width="3.6" height="14.8" rx="1.6" />
      {/* handle bar */}
      <rect x="8.5" y="11.7" width="11" height="4.6" rx="2.3" />
      {/* right: tall plate + outer collar */}
      <rect x="19.5" y="6.6" width="3.6" height="14.8" rx="1.6" />
      <rect x="23.7" y="10" width="2.9" height="8" rx="1.2" />
    </svg>
  );
}
