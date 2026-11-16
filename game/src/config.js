// Lumen Deep — tuning constants. One place for every number that shapes
// how the game feels, so balancing is editing data, not logic.
export const CONFIG = {
  // Canvas (fixed internal resolution; CSS scales it to the window).
  width: 960,
  height: 540,

  // The submersible.
  sub: {
    radius: 16,
    accel: 1500, // px/s^2
    maxSpeed: 260, // px/s
    drag: 0.92, // velocity kept per frame at 60fps (applied as pow(drag, dt*60))
    hull: 3, // hits the sub can take
    invulnSeconds: 1.6, // brief mercy window after a hit
    lampAngle: 0.62, // half-angle of the light cone, radians
    lampRange: 340, // px the lamp reaches
  },

  // Oxygen: drains always, refills at air pockets. Empty tank costs a hull.
  oxygen: {
    max: 100,
    drainPerSecond: 2.2,
    pocketRefill: 45,
    emptyDamageSeconds: 4, // grace period once the tank hits 0
  },

  // Scoring.
  score: {
    orbBase: 10,
    comboWindowSeconds: 4, // pickups inside this window raise the combo
    comboCap: 8, // combo multiplier caps at x8
    depthBonusPerMetre: 1, // +1 per metre when a level is cleared
    winBonus: 500, // reaching the trench floor
  },

  // Depth / levels. The trench floor is the win: 1000 m over 10 levels.
  depth: {
    metresPerLevel: 100,
    maxLevel: 10,
    orbsToDescend: 12, // orbs banked to open the next level
    darknessPerLevel: 0.055, // ambient light lost per level (0..1)
    baseDarkness: 0.62, // how dark level 1 already is
  },

  // Spawning (per level; values grow with depth).
  spawn: {
    orbInterval: 1.15, // seconds between orb spawns
    orbMax: 14,
    mineInterval: 6.5,
    mineMax: 6,
    fishInterval: 9,
    fishMax: 4,
    pocketInterval: 11,
    pocketMax: 2,
  },

  // Hazards.
  mine: { radius: 13, drift: 6 },
  fish: { radius: 18, speed: 55, turnRate: 1.4, wander: 0.9 },

  // Presentation.
  particles: { pickupBurst: 14, damageBurst: 22, max: 400 },
  shake: { damage: 9, decay: 26 },
  palette: {
    abyssTop: '#06283d',
    abyssMid: '#041a2c',
    abyssDeep: '#020a14',
    rock: '#0a2e44',
    rockFar: '#071f30',
    orb: '#7dfcd6',
    orbCore: '#eafff6',
    mine: '#ff5d5d',
    fish: '#c9a7ff',
    pocket: '#9fdcff',
    hull: '#ff8f6b',
    text: '#dff6ff',
    textDim: '#8fb8cc',
    gold: '#ffd76a',
  },
};
