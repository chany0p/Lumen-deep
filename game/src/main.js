// Lumen Deep — the game loop and the state machine. Title, playing,
// paused, game over and win; the sub's physics, the lamp, oxygen, combo
// scoring, descending, and the deterministic ?shot= presets the
// screenshots are taken from. The world owns the entities; this file owns
// the rules.
import { CONFIG, UPGRADES } from './config.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { Sfx } from './audio.js';
import { World } from './world.js';
import { clamp, liveRng, makeRng } from './random.js';

const BEST_KEY = 'lumen-deep-best';

export class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.sfx = new Sfx();
    this.shot = options.shot || null;
    this.seed = options.seed || 1;
    this.rng = this.shot ? makeRng(this.seed) : liveRng();
    this.world = new World(this.shot ? this.seed : (Date.now() & 0xffff));
    this.state = 'title';
    this.time = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hull = CONFIG.sub.hull;
    this.oxygen = CONFIG.oxygen.max;
    this.oxygenGrace = 0;
    this.shake = 0;
    this.upgrades = { lamp: 0, speed: 0, hull: 0, tank: 0, magnet: 0, sonar: 0 };
    this.draft = null; // the three upgrade cards on offer, while choosing
    this.endless = false; // after the win, the dive can keep going down
    this.orbsCollected = 0;
    this.best = this._loadBest();
    this.sub = {
      x: CONFIG.width / 2,
      y: CONFIG.height / 2,
      vx: 0,
      vy: 0,
      facing: 0,
      lampAngle: -Math.PI / 2,
      invulnerable: 0,
    };
    this._raf = 0;
    this._last = 0;
    this._onClick = () => {
      this.sfx.ensure();
      if (this.state === 'title') this.start();
      else if (this.state === 'gameover' || this.state === 'win') this.restart();
      else if (this.state === 'upgrade') this._clickDraft();
    };
    if (this.shot) this._applyShot();
  }

  get depthInLevel() {
    return Math.floor((this.world.orbsBanked / CONFIG.depth.orbsToDescend) * CONFIG.depth.metresPerLevel);
  }

  // Upgrade-derived numbers: the draft's picks change these, so the
  // world and the renderer always read them from here, never from CONFIG.
  lampRange() {
    return CONFIG.sub.lampRange * (1 + 0.25 * this.upgrades.lamp);
  }

  lampHalfAngle() {
    return CONFIG.sub.lampAngle * (1 + 0.15 * this.upgrades.lamp);
  }

  maxSpeed() {
    return CONFIG.sub.maxSpeed * (1 + 0.18 * this.upgrades.speed);
  }

  oxygenMax() {
    return CONFIG.oxygen.max + 40 * this.upgrades.tank;
  }

  maxHull() {
    return CONFIG.sub.hull + Math.min(this.upgrades.hull, 2);
  }

  magnetRadius() {
    return this.upgrades.magnet > 0 ? 110 + 30 * (this.upgrades.magnet - 1) : 0;
  }

  sonarCooldownMax() {
    return CONFIG.sonar.cooldownSeconds * (this.upgrades.sonar > 0 ? 0.5 : 1);
  }

  sonarRevealSeconds() {
    return CONFIG.sonar.revealSeconds + (this.upgrades.sonar > 0 ? 2 : 0);
  }

  _loadBest() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  _saveBest() {
    if (this.score <= this.best) return;
    this.best = this.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(this.best));
    } catch {
      // Private mode or file:// — the best score just does not persist.
    }
  }

  // Deterministic setups for the screenshots: real states of the real
  // game, driven by a fixed seed, never a staged picture.
  _applyShot() {
    if (this.shot === 'start') {
      this.state = 'title';
      this._prewarm(12);
    } else if (this.shot === 'play') {
      this.state = 'playing';
      this.score = 240;
      this.combo = 3;
      this.comboTimer = 2.5;
      this.hull = 3;
      this.oxygen = 72;
      this.world.level = 3;
      this.world.depthMetres = 200;
      this.world.orbsBanked = 7;
      this.sub.x = CONFIG.width * 0.42;
      this.sub.y = CONFIG.height * 0.55;
      this.sub.lampAngle = -0.5;
      this.input.mouse = { x: CONFIG.width * 0.72, y: CONFIG.height * 0.3, inside: true, moved: true };
      this.sub.invulnerable = 999; // the shot holds still; nothing may hit it
      this._prewarm(14);
      // Level 3 is a boss level: the Ancient Angler guards the way down.
      this.world.spawnBoss();
      this.world.boss.x = CONFIG.width * 0.74;
      this.world.boss.y = CONFIG.height * 0.7;
    } else if (this.shot === 'boss') {
      this.state = 'playing';
      this.score = 520;
      this.combo = 4;
      this.comboTimer = 2.5;
      this.hull = 3;
      this.oxygen = 80;
      this.world.level = 3;
      this.world.depthMetres = 200;
      this.world.orbsBanked = 12;
      this.sub.x = CONFIG.width * 0.4;
      this.sub.y = CONFIG.height * 0.6;
      this.sub.lampAngle = 0.4;
      this.input.mouse = { x: CONFIG.width * 0.8, y: CONFIG.height * 0.75, inside: true, moved: true };
      this.sub.invulnerable = 999; // the shot holds still; nothing may hit it
      this._prewarm(6);
      this.world.spawnBoss();
      this.world.boss.x = CONFIG.width * 0.68;
      this.world.boss.y = CONFIG.height * 0.34;
    } else if (this.shot === 'end') {
      this.state = 'gameover';
      this.score = 480;
      this.best = Math.max(this.best, 480);
      this.hull = 0;
      this.oxygen = 0;
      this.world.level = 4;
      this.world.depthMetres = 300;
      this.world.orbsBanked = 5;
      this.orbsCollected = 24;
      this._prewarm(8);
    }
  }

  // Run the world forward so a screenshot opens on a lived-in trench,
  // with the sub held still in the middle of it.
  _prewarm(seconds) {
    const dt = 1 / 60;
    const ghost = { ...this.sub, invulnerable: 999 };
    for (let i = 0; i < Math.floor(seconds / dt); i++) {
      this.world.update(dt, ghost);
    }
  }

  start() {
    this.sfx.ensure();
    this.sfx.click();
    this._resetRun();
    this.state = 'playing';
  }

  restart() {
    this.sfx.ensure();
    this.sfx.click();
    this._resetRun();
    this.state = 'playing';
  }

  _resetRun() {
    this.world = new World(this.shot ? this.seed : (Date.now() & 0xffff));
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hull = CONFIG.sub.hull;
    this.oxygen = CONFIG.oxygen.max;
    this.oxygenGrace = 0;
    this.shake = 0;
    this.upgrades = { lamp: 0, speed: 0, hull: 0, tank: 0, magnet: 0, sonar: 0 };
    this.draft = null;
    this.endless = false;
    this.orbsCollected = 0;
    this.sub.x = CONFIG.width / 2;
    this.sub.y = CONFIG.height / 2;
    this.sub.vx = 0;
    this.sub.vy = 0;
    this.sub.facing = 0;
    this.sub.lampAngle = -Math.PI / 2;
    this.sub.invulnerable = 0;
  }

  run() {
    this.input.attach();
    this.canvas.addEventListener('click', this._onClick);
    this._last = performance.now();
    const step = (now) => {
      const dt = clamp((now - this._last) / 1000, 0, 1 / 30);
      this._last = now;
      this._frame(dt);
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this.input.detach();
    this.canvas.removeEventListener('click', this._onClick);
  }

  _frame(dt) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - CONFIG.shake.decay * dt);

    if (this.input.hit('m', 'M')) {
      const muted = this.sfx.toggleMute();
      this.world.floater(this.sub.x, this.sub.y - 30, muted ? 'SOUND OFF' : 'SOUND ON', '#dff6ff');
    }
    if (this.state === 'title') {
      if (this.input.hit('Enter', ' ')) this.start();
      this.world.update(dt, { ...this.sub, invulnerable: 999 });
    } else if (this.state === 'playing') {
      if (this.input.hit('p', 'P', 'Escape')) {
        this.state = 'paused';
        this.sfx.click();
      } else {
        this._updatePlaying(dt);
      }
    } else if (this.state === 'paused') {
      if (this.input.hit('p', 'P', 'Escape', 'Enter')) {
        this.state = 'playing';
        this.sfx.click();
      }
    } else if (this.state === 'upgrade') {
      // The world holds still while the diver chooses an upgrade.
      if (this.input.hit('1')) this._applyDraft(0);
      else if (this.input.hit('2')) this._applyDraft(1);
      else if (this.input.hit('3')) this._applyDraft(2);
    } else if (this.state === 'gameover' || this.state === 'win') {
      if (this.input.hit('r', 'R', 'Enter', ' ')) this.restart();
      else if (this.state === 'win' && this.input.hit('e', 'E')) {
        // The floor is reached — but the trench goes deeper forever.
        this.endless = true;
        this.state = 'playing';
        this.sfx.level();
      }
      this.world.update(dt, { ...this.sub, invulnerable: 999 });
    }

    this.renderer.draw(this);
    this.input.endFrame();
  }

  _updatePlaying(dt) {
    const sub = this.sub;
    const cfg = CONFIG.sub;

    // Steering.
    const mv = this.input.moveVector();
    sub.vx += mv.x * cfg.accel * dt;
    sub.vy += mv.y * cfg.accel * dt;
    const drag = Math.pow(cfg.drag, dt * 60);
    sub.vx *= drag;
    sub.vy *= drag;
    const speed = Math.hypot(sub.vx, sub.vy);
    const topSpeed = this.maxSpeed();
    if (speed > topSpeed) {
      sub.vx = (sub.vx / speed) * topSpeed;
      sub.vy = (sub.vy / speed) * topSpeed;
    }
    sub.x = clamp(sub.x + sub.vx * dt, 20, CONFIG.width - 20);
    sub.y = clamp(sub.y + sub.vy * dt, 52, CONFIG.height - 20);
    if (speed > 20) {
      const want = Math.atan2(sub.vy, sub.vx);
      let diff = want - sub.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      sub.facing += diff * Math.min(1, dt * 8);
    }

    // The lamp follows the mouse; without one it follows the nose.
    if (this.input.mouse.moved && this.input.mouse.inside) {
      sub.lampAngle = Math.atan2(this.input.mouse.y - sub.y, this.input.mouse.x - sub.x);
    } else {
      sub.lampAngle = sub.facing;
    }
    if (sub.invulnerable > 0) sub.invulnerable -= dt;

    // Sonar pulse: SPACE pings the dark and lights up every mine.
    if (this.input.hit(' ')) {
      if (this.world.fireSonar(this.sonarCooldownMax(), this.sonarRevealSeconds())) {
        this.sfx.blip({ from: 980, to: 320, dur: 0.5, type: 'sine', gain: 0.55 });
        this.world.floater(sub.x, sub.y - 30, 'SONAR', '#9fdcff');
      }
    }

    // Oxygen always drains; an empty tank gets a short grace, then a hull.
    this.oxygen = Math.max(0, this.oxygen - CONFIG.oxygen.drainPerSecond * dt);
    if (this.oxygen <= 0) {
      this.oxygenGrace += dt;
      if (this.oxygenGrace >= CONFIG.oxygen.emptyDamageSeconds) {
        this.oxygenGrace = 0;
        this.oxygen = 50;
        this._damage(sub.x, sub.y, 'NO OXYGEN');
      }
    } else {
      this.oxygenGrace = 0;
    }

    // Combo decays when the streak goes cold.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // The world moves; the events come back here.
    const fx = {
      magnetRadius: this.magnetRadius(),
      lampRange: this.lampRange(),
      lampHalfAngle: this.lampHalfAngle(),
    };
    for (const e of this.world.update(dt, sub, fx)) {
      if (e.type === 'orb') this._collectOrb(e);
      else if (e.type === 'pocket') this._collectPocket(e);
      else if (e.type === 'bossdown') this._bossDown(e);
      else if (e.type === 'mine' || e.type === 'fish') this._damage(e.x, e.y, 'HULL HIT');
    }

    // Descend when enough orbs are banked — unless the level's boss
    // still guards the way down. Clearing a level opens the Dive Shop
    // draft; the trench floor is the win, and after it the dive goes endless.
    if (this.world.orbsBanked >= CONFIG.depth.orbsToDescend && !this.world.bossAlive()) {
      this.world.descend();
      this.score += CONFIG.depth.metresPerLevel * CONFIG.score.depthBonusPerMetre;
      this.sfx.level();
      this.world.floater(sub.x, sub.y - 34, `LEVEL ${this.world.level} — ${this.world.depthMetres} m`, '#ffd76a');
      if (this.world.level > CONFIG.depth.maxLevel && !this.endless) {
        this.score += CONFIG.score.winBonus;
        this._saveBest();
        this.sfx.win();
        this.state = 'win';
      } else {
        this._openDraft();
      }
    }
  }

  _collectOrb(e) {
    this.combo = this.comboTimer > 0 ? Math.min(this.combo + 1, CONFIG.score.comboCap) : 1;
    this.comboTimer = CONFIG.score.comboWindowSeconds;
    const gained = CONFIG.score.orbBase * this.combo;
    this.score += gained;
    this.orbsCollected += 1;
    this.world.orbsBanked += 1;
    this.world.burst(e.x, e.y, '#7dfcd6', CONFIG.particles.pickupBurst);
    this.world.floater(e.x, e.y - 14, `+${gained}`, '#7dfcd6');
    this.sfx.pickup(this.combo);
  }

  _collectPocket(e) {
    this.oxygen = clamp(this.oxygen + CONFIG.oxygen.pocketRefill, 0, CONFIG.oxygen.max);
    this.world.burst(e.x, e.y, '#9fdcff', 10, 80);
    this.world.floater(e.x, e.y - 14, 'OXYGEN +', '#9fdcff');
    this.sfx.refill();
  }

  // The Dive Shop: three upgrades on offer, pick one. Hull caps at +2.
  _openDraft() {
    const pool = UPGRADES.filter((u) => u.id !== 'hull' || this.upgrades.hull < 2);
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.draft = shuffled.slice(0, 3);
    this.state = 'upgrade';
    this.sfx.level();
  }

  _applyDraft(index) {
    const pick = this.draft && this.draft[index];
    if (!pick) return;
    if (pick.id === 'hull') {
      this.upgrades.hull += 1;
      this.hull = Math.min(this.maxHull(), this.hull + 1);
    } else if (pick.id === 'tank') {
      this.upgrades.tank += 1;
      this.oxygen = this.oxygenMax();
    } else {
      this.upgrades[pick.id] += 1;
    }
    this.world.floater(this.sub.x, this.sub.y - 34, pick.name.toUpperCase(), '#ffd76a');
    this.draft = null;
    this.state = 'playing';
    this.sfx.click();
  }

  _clickDraft() {
    const rects = this.renderer.upgradeRects;
    if (!rects) return;
    const { x, y } = this.input.mouse;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this._applyDraft(i);
        return;
      }
    }
  }

  _bossDown(e) {
    this.score += CONFIG.boss.scoreReward;
    this.world.dropOrbs(e.x, e.y, 6);
    this.world.floater(e.x, e.y - 30, `ANCIENT ANGLER DOWN +${CONFIG.boss.scoreReward}`, '#ffd76a');
    this.sfx.level();
  }

  _damage(x, y, label) {
    if (this.sub.invulnerable > 0) return;
    this.hull -= 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.sub.invulnerable = CONFIG.sub.invulnSeconds;
    this.shake = CONFIG.shake.damage;
    this.world.burst(x, y, '#ff8f6b', CONFIG.particles.damageBurst, 170);
    this.world.floater(x, y - 18, label, '#ff8f6b');
    this.sfx.damage();
    if (this.hull <= 0) {
      this._saveBest();
      this.sfx.lose();
      this.state = 'gameover';
    }
  }
}

// Boot: read ?shot=start|play|end&seed=N for the deterministic screenshot
// presets; plain play has neither.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed')) || 1;
const canvas = document.getElementById('game');
const game = new Game(canvas, shot ? { shot, seed } : {});
window.__lumenDeep = game;
game.run();
