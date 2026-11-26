export const STONE_STATS = Object.freeze({
  'ginger-dash-stone': { startTime: .25, horizontalScale: { C: 1.12, B: 1.18, A: 1.24 } },
  'strawberry-lollipop-stone': { radiusScale: { C: 1.25, B: 1.35, A: 1.45 } },
  'chili-slash-stone': { kind: 'slash', maxDistance: { C: 180, B: 240, A: 300 } },
  'sea-wave-stone': { kind: 'ground-wave', maxDistance: { C: 420, B: 560, A: 700 } },
  'frost-stone': { kind: 'freeze', radius: { C: 0, B: 180, A: 240 }, extraTargets: { C: 0, B: 1, A: 2 } },
  'cherry-bomb-stone': { manual: 'cherry-bomb', delay: .35, radius: { C: 150, B: 180, A: 210 }, targets: 2 },
  'espresso-vortex-stone': { manual: 'vortex', duration: .7, radius: { C: 170, B: 210, A: 250 },
    maxDisplacement: { C: 60, B: 80, A: 100 }, targets: { C: 2, B: 2, A: 3 } }
});
