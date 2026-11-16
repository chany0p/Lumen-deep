// Lumen Deep — the trench itself: everything that drifts, glows, hunts or
// hides in the dark, plus the spawn rules that make deeper water harder.
// The world knows nothing about score or screens; it reports events and
// the game loop decides what they mean.
import { CONFIG } from './config.js';
import { clamp, makeRng, range } from './random.js';

const TAU = Math.PI * 2;

export class World {
  constructor(seed) {
    this.rng = makeRng(seed);
    this.level = 1;
    this.depthMetres = 0;
    this.orbsBanked = 0;
    this.orbs = [];
    this.mines = [];
    this.fish = [];
    this.pockets = [];
    this.particles = [];
    this.floaters = [];
    this.snow = [];
    this.bubbles = [];
    this.rocks = [];
    this.timers = { orb: 0, mine: 2, fish: 4, pocket: 5 };
    this.time = 0;
    this._seedAmbient();
    this._seedRocks();
  }

  // Deterministic silhouettes for the trench walls, re-rolled per level.
  _seedRocks() {
    const rng = this.rng;
    this.rocks = [];
    for (let i = 0; i < 7; i++) {
      this.rocks.push({
        x: rng() * CONFIG.width,
        w: range(rng, 90, 260),
        h: range(rng, 26, 90),
        far: rng() < 0.5,
      });
    }
  }

  _seedAmbient() {
    const rng = this.rng;
    this.snow = [];
    for (let i = 0; i < 60; i++) {
      this.snow.push({
        x: rng() * CONFIG.width,
        y: rng() * CONFIG.height,
        r: range(rng, 0.6, 2.2),
        speed: range(rng, 4, 14),
        sway: range(rng, 0, TAU),
      });
    }
    this.bubbles = [];
    for (let i = 0; i < 14; i++) {
      this.bubbles.push({
        x: rng() * CONFIG.width,
        y: rng() * CONFIG.height,
        r: range(rng, 2, 6),
        speed: range(rng, 18, 42),
      });
    }
  }

  _spawnPoint(minSubDistance) {
    for (let tries = 0; tries < 12; tries++) {
      const x = range(this.rng, 30, CONFIG.width - 30);
      const y = range(this.rng, 60, CONFIG.height - 30);
      if (!this.subPos) return { x, y };
      const d = Math.hypot(x - this.subPos.x, y - this.subPos.y);
      if (d >= minSubDistance) return { x, y };
    }
    return { x: range(this.rng, 30, CONFIG.width - 30), y: range(this.rng, 60, CONFIG.height - 30) };
  }

  _spawnOrb() {
    const p = this._spawnPoint(90);
    this.orbs.push({
      kind: 'orb',
      x: p.x,
      y: p.y,
      r: 9,
      phase: this.rng() * TAU,
      drift: range(this.rng, -8, 8),
      driftPhase: this.rng() * TAU,
    });
  }

  _spawnMine() {
    const p = this._spawnPoint(150);
    this.mines.push({ kind: 'mine', x: p.x, y: p.y, r: CONFIG.mine.radius, blink: this.rng() * TAU });
  }

  _spawnFish() {
    // Anglerfish slip in from a screen edge, already hunting.
    const edge = Math.floor(this.rng() * 4);
    const m = 24;
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = range(this.rng, 0, CONFIG.width);
      y = m;
    } else if (edge === 1) {
      x = range(this.rng, 0, CONFIG.width);
      y = CONFIG.height - m;
    } else if (edge === 2) {
      x = m;
      y = range(this.rng, 0, CONFIG.height);
    } else {
      x = CONFIG.width - m;
      y = range(this.rng, 0, CONFIG.height);
    }
    this.fish.push({
      kind: 'fish',
      x,
      y,
      r: CONFIG.fish.radius,
      angle: this.rng() * TAU,
      speed: CONFIG.fish.speed * (1 + (this.level - 1) * 0.08),
      wobble: this.rng() * TAU,
    });
  }

  _spawnPocket() {
    const p = this._spawnPoint(110);
    this.pockets.push({ kind: 'pocket', x: p.x, y: p.y, r: 12, phase: this.rng() * TAU });
  }

  burst(x, y, color, count, speed = 120) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= CONFIG.particles.max) return;
      const a = this.rng() * TAU;
      const v = range(this.rng, speed * 0.3, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: range(this.rng, 0.35, 0.8),
        maxLife: 0.8,
        color,
        size: range(this.rng, 1.5, 3.5),
      });
    }
  }

  floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  }

  descend() {
    this.level += 1;
    this.depthMetres = (this.level - 1) * CONFIG.depth.metresPerLevel;
    this.orbsBanked = 0;
    this._seedRocks();
    // Deeper water starts a little emptier, then fills back in.
    this.mines = this.mines.slice(0, 2);
    this.fish = this.fish.slice(0, 1);
  }

  get darkness() {
    return clamp(
      CONFIG.depth.baseDarkness + (this.level - 1) * CONFIG.depth.darknessPerLevel,
      0,
      0.93,
    );
  }

  update(dt, sub) {
    this.time += dt;
    this.subPos = { x: sub.x, y: sub.y };
    const events = [];
    const spawn = CONFIG.spawn;
    const levelBoost = 1 + (this.level - 1) * 0.12;

    // Spawning.
    this.timers.orb -= dt;
    if (this.timers.orb <= 0 && this.orbs.length < spawn.orbMax) {
      this._spawnOrb();
      this.timers.orb = spawn.orbInterval / levelBoost;
    }
    this.timers.mine -= dt;
    if (this.timers.mine <= 0 && this.mines.length < Math.min(spawn.mineMax, 2 + this.level)) {
      this._spawnMine();
      this.timers.mine = spawn.mineInterval;
    }
    this.timers.fish -= dt;
    if (this.timers.fish <= 0 && this.fish.length < Math.min(spawn.fishMax, 1 + Math.floor(this.level / 2))) {
      this._spawnFish();
      this.timers.fish = spawn.fishInterval;
    }
    this.timers.pocket -= dt;
    if (this.timers.pocket <= 0 && this.pockets.length < spawn.pocketMax) {
      this._spawnPocket();
      this.timers.pocket = spawn.pocketInterval;
    }

    // Orbs drift gently and pulse.
    for (const o of this.orbs) {
      o.phase += dt * 2.2;
      o.driftPhase += dt;
      o.x += Math.sin(o.driftPhase) * o.drift * dt;
      o.y += Math.cos(o.driftPhase * 0.7) * 4 * dt;
    }
    for (const m of this.mines) {
      m.blink += dt * 3;
      m.y += Math.sin(m.blink * 0.4) * CONFIG.mine.drift * dt;
    }
    for (const p of this.pockets) {
      p.phase += dt * 1.6;
      p.y -= 12 * dt; // air pockets rise slowly
      if (p.y < 40) p.y = CONFIG.height - 40;
    }

    // Anglerfish hunt: steer toward the sub, with a wobble.
    for (const f of this.fish) {
      f.wobble += dt * 2;
      const want = Math.atan2(sub.y - f.y, sub.x - f.x);
      let diff = want - f.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      f.angle += clamp(diff, -CONFIG.fish.turnRate * dt, CONFIG.fish.turnRate * dt);
      f.angle += Math.sin(f.wobble) * CONFIG.fish.wander * dt;
      f.x += Math.cos(f.angle) * f.speed * dt;
      f.y += Math.sin(f.angle) * f.speed * dt;
      f.x = clamp(f.x, 10, CONFIG.width - 10);
      f.y = clamp(f.y, 40, CONFIG.height - 10);
    }

    // Ambient snow and bubbles.
    for (const s of this.snow) {
      s.y += s.speed * dt;
      s.sway += dt;
      s.x += Math.sin(s.sway) * 6 * dt;
      if (s.y > CONFIG.height + 4) {
        s.y = -4;
        s.x = this.rng() * CONFIG.width;
      }
    }
    for (const b of this.bubbles) {
      b.y -= b.speed * dt;
      if (b.y < -8) {
        b.y = CONFIG.height + 8;
        b.x = this.rng() * CONFIG.width;
      }
    }

    // Particles and floaters decay.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.y -= 26 * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }

    // Collisions with the sub (only when it can be hurt).
    const rr = CONFIG.sub.radius;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      if (Math.hypot(o.x - sub.x, o.y - sub.y) < o.r + rr) {
        this.orbs.splice(i, 1);
        events.push({ type: 'orb', x: o.x, y: o.y });
      }
    }
    for (let i = this.pockets.length - 1; i >= 0; i--) {
      const p = this.pockets[i];
      if (Math.hypot(p.x - sub.x, p.y - sub.y) < p.r + rr) {
        this.pockets.splice(i, 1);
        events.push({ type: 'pocket', x: p.x, y: p.y });
      }
    }
    if (!sub.invulnerable) {
      for (let i = this.mines.length - 1; i >= 0; i--) {
        const m = this.mines[i];
        if (Math.hypot(m.x - sub.x, m.y - sub.y) < m.r + rr - 2) {
          this.mines.splice(i, 1);
          events.push({ type: 'mine', x: m.x, y: m.y });
          break;
        }
      }
      for (let i = this.fish.length - 1; i >= 0; i--) {
        const f = this.fish[i];
        if (Math.hypot(f.x - sub.x, f.y - sub.y) < f.r + rr - 4) {
          this.fish.splice(i, 1);
          events.push({ type: 'fish', x: f.x, y: f.y });
          break;
        }
      }
    }
    return events;
  }
}
