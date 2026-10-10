// Every activity is listed here. Add a new entry and it appears on the landing page.
// status: 'ready' (playable) | 'soon' (shown with "Coming in Phase n") | 'locked' (future idea)
// load(): returns the module; its default export is mount(container, context) → cleanup()
//
// Topic groups
//   bonding  — PHD115 IC1/IC2 (tested in the class study)
//   stem     — STEM Tour: enrichment and outreach (hybridization, crystal lattice, organic). Not tested.
//   pharmacy — future pharmacy applications
export const topics = ['bonding', 'stem', 'pharmacy'];

// Molecule Shooter reuses one module for any question pack in data/shooter/<pack>.json
const shooter = pack => () => import('./shooter/index.js')
  .then(m => ({ default: (host, ctx) => m.default(host, { ...ctx, pack }) }));

export const activities = [
  // ---- PHD115 Chemical Bonding (IC1 & IC2)
  {
    id: 'shooter',
    topic: 'bonding',
    doodle: 'target',
    status: 'ready',
    load: shooter('ic'),
  },
  {
    id: 'lewis',
    topic: 'bonding',
    doodle: 'atom',
    status: 'soon',
    phase: 2,
    // load: () => import('./lewis/index.js'),
  },
  {
    id: 'shapes',
    topic: 'bonding',
    doodle: 'molecule',
    status: 'soon',
    phase: 3,
  },
  {
    id: 'forces',
    topic: 'bonding',
    doodle: 'forces',
    status: 'soon',
    phase: 4,
  },
  // ---- STEM Tour (enrichment, not part of the study)
  {
    id: 'hybrid',
    topic: 'stem',
    doodle: 'sparkle',
    status: 'soon',
    phase: 7,
  },
  {
    id: 'crystal',
    topic: 'stem',
    doodle: 'lattice',
    status: 'soon',
    phase: 7,
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
