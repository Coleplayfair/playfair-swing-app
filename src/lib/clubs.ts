export type Club = { n: string; t: string; d: number };

export const CLUBS: Club[] = [
  { n: "Driver", t: "Wood", d: 230 },
  { n: "3 Wood", t: "Wood", d: 210 },
  { n: "5 Wood", t: "Wood", d: 195 },
  { n: "3 Hybrid", t: "Hybrid", d: 185 },
  { n: "4 Iron", t: "Iron", d: 175 },
  { n: "5 Iron", t: "Iron", d: 165 },
  { n: "6 Iron", t: "Iron", d: 155 },
  { n: "7 Iron", t: "Iron", d: 145 },
  { n: "8 Iron", t: "Iron", d: 135 },
  { n: "9 Iron", t: "Iron", d: 125 },
  { n: "PW", t: "Wedge", d: 115 },
  { n: "GW", t: "Wedge", d: 105 },
  { n: "SW", t: "Wedge", d: 90 },
  { n: "LW", t: "Wedge", d: 75 },
  { n: "Putter", t: "Putter", d: 0 },
];

export const DEFAULT_SELECTED = new Set<number>([0, 4, 5, 6, 7, 8, 9, 10, 13, 14]);

// Realistic side-profile club silhouettes inspired by TrackMan "Map My Bag"
// Each SVG is 64x80 with a vertical shaft and a distinct head shape per club type.
const grip = `<rect x="30.5" y="2" width="3" height="10" rx="1.2" fill="#1a1a1a"/>`;
const shaft = `<line x1="32" y1="12" x2="32" y2="62" stroke="#5a5a5a" stroke-width="1.4" stroke-linecap="round"/>`;
const ferrule = `<rect x="30.8" y="60" width="2.4" height="3" fill="#1a1a1a"/>`;
const base = grip + shaft + ferrule;

const driver = `<svg viewBox="0 0 64 80" width="40" height="50">${base}<path d="M32 63 Q12 64 8 72 Q6 77 14 77 L52 77 Q58 77 56 72 Q52 64 32 63 Z" fill="#094811"/><ellipse cx="22" cy="72" rx="2.5" ry="1.2" fill="#EDE9DF" opacity="0.4"/></svg>`;
const fairway = (w: number) => `<svg viewBox="0 0 64 80" width="40" height="50">${base}<path d="M32 63 Q${20 - w} 64 ${18 - w} 72 Q${17 - w} 76 ${24 - w} 76 L${44 + w} 76 Q${50 + w} 76 ${48 + w} 72 Q${44 + w} 64 32 63 Z" fill="#094811"/></svg>`;
const hybrid = `<svg viewBox="0 0 64 80" width="40" height="50">${base}<path d="M32 63 Q22 64 20 71 Q19 75 24 75 L42 75 Q47 75 46 71 Q44 64 32 63 Z" fill="#094811"/></svg>`;
const iron = (lean: number) => `<svg viewBox="0 0 64 80" width="40" height="50">${base}<path d="M32 63 L${26 - lean} 75 L${46 - lean} 77 L40 65 Z" fill="#094811"/><line x1="${30 - lean / 2}" y1="69" x2="${42 - lean / 2}" y2="71" stroke="#EDE9DF" stroke-width="0.4" opacity="0.7"/><line x1="${30 - lean / 2}" y1="71" x2="${42 - lean / 2}" y2="73" stroke="#EDE9DF" stroke-width="0.4" opacity="0.7"/><line x1="${30 - lean / 2}" y1="73" x2="${42 - lean / 2}" y2="75" stroke="#EDE9DF" stroke-width="0.4" opacity="0.7"/></svg>`;
const wedge = (loft: number) => `<svg viewBox="0 0 64 80" width="40" height="50">${base}<path d="M32 63 L${24 - loft} ${72 + loft / 2} L${44 - loft} ${78} L40 64 Z" fill="#094811"/><line x1="${28 - loft / 2}" y1="${68 + loft / 3}" x2="${40 - loft / 2}" y2="${70 + loft / 3}" stroke="#EDE9DF" stroke-width="0.4" opacity="0.7"/><line x1="${28 - loft / 2}" y1="${71 + loft / 3}" x2="${40 - loft / 2}" y2="${73 + loft / 3}" stroke="#EDE9DF" stroke-width="0.4" opacity="0.7"/></svg>`;
const putter = `<svg viewBox="0 0 64 80" width="40" height="50">${base}<rect x="14" y="70" width="36" height="6" rx="1" fill="#094811"/><rect x="30" y="63" width="4" height="7" fill="#094811"/><line x1="18" y1="73" x2="46" y2="73" stroke="#EDE9DF" stroke-width="0.6" opacity="0.6"/></svg>`;

export const CLUB_SVGS: string[] = [
  driver,
  fairway(2),
  fairway(0),
  hybrid,
  iron(0),
  iron(1),
  iron(2),
  iron(3),
  iron(4),
  iron(5),
  wedge(1),
  wedge(3),
  wedge(5),
  wedge(7),
  putter,
];
