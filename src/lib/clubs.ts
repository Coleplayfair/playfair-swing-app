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

export const CLUB_SVGS: string[] = [
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="4" y="2" width="24" height="16" rx="4" fill="#094811" opacity="0.9"/><line x1="16" y1="18" x2="16" y2="42" stroke="#094811" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="6" y="3" width="20" height="14" rx="3.5" fill="#094811" opacity="0.85"/><line x1="16" y1="17" x2="16" y2="42" stroke="#094811" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="7" y="4" width="18" height="12" rx="3" fill="#094811" opacity="0.8"/><line x1="16" y1="16" x2="16" y2="42" stroke="#094811" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="7" y="5" width="18" height="11" rx="3" fill="#094811" opacity="0.8"/><line x1="16" y1="16" x2="14" y2="42" stroke="#094811" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="11" y="6" width="10" height="7" rx="1.5" fill="#094811" opacity="0.9"/><line x1="14" y1="13" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="11" y="7" width="10" height="7" rx="1.5" fill="#094811" opacity="0.9"/><line x1="14" y1="14" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="11" y="8" width="10" height="7" rx="1.5" fill="#094811" opacity="0.9"/><line x1="14" y1="15" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="11" y="9" width="10" height="7" rx="1.5" fill="#094811" opacity="0.9"/><line x1="14" y1="16" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="11" y="10" width="10" height="7" rx="1.5" fill="#094811" opacity="0.9"/><line x1="14" y1="17" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="11" y="11" width="10" height="7" rx="1.5" fill="#094811" opacity="0.9"/><line x1="14" y1="18" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><path d="M11 13 Q11 6 20 7 L21 13 Z" fill="#094811" opacity="0.9"/><line x1="14" y1="13" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><path d="M11 13 Q10 6 21 7 L22 13 Z" fill="#094811" opacity="0.9"/><line x1="14" y1="13" x2="12" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><path d="M10 13 Q9 5 22 7 L23 13 Z" fill="#094811" opacity="0.9"/><line x1="14" y1="13" x2="11" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><path d="M9 13 Q8 4 23 6 L24 13 Z" fill="#094811" opacity="0.9"/><line x1="13" y1="13" x2="10" y2="42" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
  `<svg width="28" height="40" viewBox="0 0 32 44"><rect x="10" y="34" width="12" height="6" rx="1" fill="#094811" opacity="0.9"/><line x1="16" y1="34" x2="16" y2="8" stroke="#094811" stroke-width="2" stroke-linecap="round"/></svg>`,
];
