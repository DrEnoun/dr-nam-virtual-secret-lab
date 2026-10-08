// Original outline doodles for the Playful style. They use currentColor.
const svg = body => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const doodles = {
  atom: svg(`<circle cx="24" cy="24" r="3.5" fill="currentColor"/>
    <ellipse cx="24" cy="24" rx="19" ry="7.5"/>
    <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)"/>
    <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(-60 24 24)"/>`),
  molecule: svg(`<circle cx="12" cy="31" r="6"/><circle cx="34" cy="14" r="7"/><circle cx="36" cy="37" r="5"/>
    <path d="M17 27.5 28 18.5M34.5 21v11"/>`),
  lattice: svg(`<path d="M10 16 24 9l14 7-14 7z"/><path d="M10 16v16l14 7V23M38 16v16l-14 7"/>
    <circle cx="10" cy="16" r="2.5" fill="currentColor"/><circle cx="24" cy="9" r="2.5" fill="currentColor"/>
    <circle cx="38" cy="16" r="2.5" fill="currentColor"/><circle cx="24" cy="23" r="2.5" fill="currentColor"/>
    <circle cx="10" cy="32" r="2.5" fill="currentColor"/><circle cx="38" cy="32" r="2.5" fill="currentColor"/>
    <circle cx="24" cy="39" r="2.5" fill="currentColor"/>`),
  flask: svg(`<path d="M19 6h10M21 6v12L10 38a3 3 0 0 0 2.7 4h22.6A3 3 0 0 0 38 38L27 18V6"/>
    <path d="M15 30h18"/><circle cx="21" cy="35" r="1.6" fill="currentColor"/><circle cx="28" cy="33" r="1.2" fill="currentColor"/>`),
  capsule: svg(`<rect x="7" y="17" width="34" height="14" rx="7" transform="rotate(-35 24 24)"/>
    <path d="M18.5 32.5 29.5 15.5" />`),
  testtube: svg(`<path d="M30 5 40 15M33 8 13 28a6.4 6.4 0 0 0 9 9l20-20"/><path d="M18 23h10"/>`),
  sparkle: svg(`<path d="M24 6v10M24 32v10M6 24h10M32 24h10M12 12l5 5M31 31l5 5M36 12l-5 5M17 31l-5 5"/>`),
  electron: svg(`<circle cx="24" cy="24" r="9" fill="currentColor"/><path d="M20 24h8"/>`),
};
