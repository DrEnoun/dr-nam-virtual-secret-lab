// Every activity is listed here. Add a new entry and it appears on the landing page.
// status: 'ready' (playable) | 'soon' (shown with "Coming in Phase n", or "Coming soon" without a phase) | 'locked'
// load(): returns the module; its default export is mount(container, context) → cleanup()
// duo: true → in 2-player mode the activity runs inside the split-screen wrapper (js/duo.js)
//
// Topic groups
//   bonding  — Chemical Bonding core (IC1/IC2 in the PHD115 class study)
//   stem     — STEM Tour: enrichment and outreach (hybridization, crystal lattice, organic). Not tested in the study.
//   pharmacy — future pharmacy applications
export const topics = ['bonding', 'stem', 'pharmacy'];

// Molecule Shooter reuses one module for any question pack in data/shooter/<pack>.json
const shooter = pack => () => import('./shooter/index.js')
  .then(m => ({ default: (host, ctx) => m.default(host, { ...ctx, pack }) }));

export const activities = [
  // ---- Chemical Bonding (IC1 & IC2)
  {
    id: 'shooter',
    topic: 'bonding',
    doodle: 'aim',
    status: 'ready',
    load: shooter('ic'),
  },
  {
    id: 'blaster',
    topic: 'bonding',
    doodle: 'target',
    status: 'ready',
    load: () => import('./blaster/index.js'),
  },
  {
    id: 'lewis',
    duo: true,
    topic: 'bonding',
    doodle: 'atom',
    status: 'ready',
    load: () => import('./lewis/index.js'),
  },
  {
    id: 'shapes',
    topic: 'bonding',
    doodle: 'molecule',
    status: 'soon',
  },
  {
    id: 'forces',
    topic: 'bonding',
    doodle: 'forces',
    status: 'soon',
  },
  // ---- STEM Tour (enrichment, not part of the study)
  {
    id: 'hybrid',
    duo: true,
    topic: 'stem',
    doodle: 'sparkle',
    status: 'ready',
    load: () => import('./hybrid/index.js'),
  },
  {
    id: 'crystal',
    duo: true,
    topic: 'stem',
    doodle: 'lattice',
    status: 'ready',
    load: () => import('./crystal/index.js'),
  },
  {
    id: 'organic',
    topic: 'stem',
    doodle: 'flask',
    status: 'locked',
  },
  // ---- Pharmacy applications (future)
  {
    id: 'pharmacy',
    topic: 'pharmacy',
    doodle: 'capsule',
    status: 'locked',
  },
];

export const byId = id => activities.find(a => a.id === id);
