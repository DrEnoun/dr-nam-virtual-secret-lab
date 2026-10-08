// Every activity is listed here. Add a new entry and it appears on the landing page.
// status: 'ready' (playable) | 'soon' (shown with "Coming in Phase n")
// load(): returns the module; its default export is mount(container, context) → cleanup()
export const topics = ['bonding', 'solid', 'organic', 'pharmacy'];

export const activities = [
  {
    id: 'lewis',
    topic: 'bonding',
    doodle: 'atom',
    status: 'ready',
    load: () => import('./lewis/index.js'),
  },
  {
    id: 'hybrid',
    topic: 'bonding',
    doodle: 'molecule',
    status: 'soon',
    phase: 3,
  },
  {
    id: 'crystal',
    topic: 'solid',
    doodle: 'lattice',
    status: 'soon',
    phase: 4,
  },
  {
    id: 'organic',
    topic: 'organic',
    doodle: 'flask',
    status: 'locked',
  },
  {
    id: 'pharmacy',
    topic: 'pharmacy',
    doodle: 'capsule',
    status: 'locked',
  },
];

export const byId = id => activities.find(a => a.id === id);
