/* Art in public/gear-art. A category added later shows its photo until it has
   its own. */
const ART = new Set([
  "racks", "machines", "benches", "barbells", "dumbbells", "plates", "cardio", "kettlebells", "bands", "flooring",
  "preworkout", "protein", "creatine", "recovery", "vitamins", "fatburners",
  "belts", "straps", "wraps", "sleeves", "chalk", "yogamats", "foamrollers", "gymbags", "jumpropes",
]);

export const gearArt = (key: string, fallback?: string) => (ART.has(key) ? `/gear-art/${key}.webp` : fallback);
