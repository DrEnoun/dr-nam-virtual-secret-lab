// Overworld progress rules: pure functions (no DOM) so unlocking and badges can be tested in Node.
// Stars are saved per world and level, e.g. stars["6.2"] = 3 for World 6, shift 2.
export const starKey = (worldId, levelId) => `${worldId}.${levelId}`;

// A world is cleared when every one of its levels has 1+ stars.
export function worldProgress(world, stars = {}) {
  const ids = world.levelIds || [];
  const star = id => stars[starKey(world.id, id)] || 0;
  const got = ids.filter(id => star(id) > 0).length;
  return {
    total: ids.length, got,
    starSum: ids.reduce((a, id) => a + star(id), 0),
    cleared: ids.length > 0 && got === ids.length,
  };
}

// World n opens when world n-1 is cleared. World 1 is always open; `previewOpen` lets a finished
// prototype world (Ion Diner) be played before the worlds ahead of it exist.
export function worldStates(worlds, stars = {}) {
  return worlds.map((w, i) => {
    const prog = worldProgress(w, stars);
    const prevCleared = i === 0 || worldProgress(worlds[i - 1], stars).cleared;
    return { ...prog, id: w.id, unlocked: i === 0 || prevCleared || !!w.previewOpen, earned: prog.cleared };
  });
}

// Path of world ids to walk from one world to another along the map.
export function walkPath(fromId, toId) {
  const step = toId > fromId ? 1 : -1, path = [];
  for (let id = fromId; id !== toId + step; id += step) path.push(id);
  return path;
}
