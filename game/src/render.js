// Lumen Deep — every pixel the player sees. The scene is drawn in layers:
// water and rock, then a darkness mask with the lamp cut out of it, then
// the things that glow in the dark, then the sub, then the HUD. The HUD
// and the screens are always drawn bright, so a screenshot reads at a
// glance even when the trench itself is nearly black.
import { CONFIG } from './config.js';
import { clamp } from './random.js';

const TAU = Math.PI * 2;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dark = document.createElement('canvas');
    this.dark.width = CONFIG.width;
    this.dark.height = CONFIG.height;
    this.dctx = this.dark.getContext('2d');
  }

  draw(game) {
    const { ctx } = this;
    const { world, sub } = game;
    const pal = CONFIG.palette;
    ctx.save();
    if (game.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }

    // Water.
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    g.addColorStop(0, pal.abyssTop);
    g.addColorStop(0.55, pal.abyssMid);
    g.addColorStop(1, pal.abyssDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-12, -12, CONFIG.width + 24, CONFIG.height + 24);

    // Marine snow and rising bubbles, far and faint.
    ctx.fillStyle = 'rgba(180, 220, 240, 0.35)';
    for (const s of world.snow) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(160, 210, 240, 0.35)';
    ctx.lineWidth = 1;
    for (const b of world.bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
    }

    // Trench walls: far silhouettes, then near rock.
    for (const r of world.rocks) {
      ctx.fillStyle = r.far ? pal.rockFar : pal.rock;
      ctx.beginPath();
      ctx.moveTo(r.x - r.w / 2, CONFIG.height);
      ctx.quadraticCurveTo(r.x, CONFIG.height - r.h * 1.7, r.x + r.w / 2, CONFIG.height);
      ctx.closePath();
      ctx.fill();
    }

    // The darkness mask, with the lamp cut out of it.
    const d = this.dctx;
    d.clearRect(0, 0, CONFIG.width, CONFIG.height);
    d.globalCompositeOperation = 'source-over';
    d.fillStyle = `rgba(1, 7, 16, ${world.darkness})`;
    d.fillRect(0, 0, CONFIG.width, CONFIG.height);
    d.globalCompositeOperation = 'destination-out';
    const lampAngle = sub.lampAngle;
    const lamp = ctx.createRadialGradient(sub.x, sub.y, 10, sub.x, sub.y, CONFIG.sub.lampRange);
    // The cone itself.
    d.save();
    d.beginPath();
    d.moveTo(sub.x, sub.y);
    d.arc(sub.x, sub.y, CONFIG.sub.lampRange, lampAngle - CONFIG.sub.lampAngle, lampAngle + CONFIG.sub.lampAngle);
    d.closePath();
    d.clip();
    d.fillStyle = lamp;
    d.fillRect(sub.x - CONFIG.sub.lampRange, sub.y - CONFIG.sub.lampRange, CONFIG.sub.lampRange * 2, CONFIG.sub.lampRange * 2);
    d.restore();
    // A soft pool of light right around the sub.
    const pool = d.createRadialGradient(sub.x, sub.y, 4, sub.x, sub.y, 110);
    pool.addColorStop(0, 'rgba(255,255,255,0.95)');
    pool.addColorStop(1, 'rgba(255,255,255,0)');
    d.fillStyle = pool;
    d.beginPath();
    d.arc(sub.x, sub.y, 110, 0, TAU);
    d.fill();
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.dark, 0, 0);

    // A faint warm wash along the lamp cone, so the beam reads even
    // where the trench is darkest.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cone = ctx.createLinearGradient(
      sub.x,
      sub.y,
      sub.x + Math.cos(lampAngle) * CONFIG.sub.lampRange,
      sub.y + Math.sin(lampAngle) * CONFIG.sub.lampRange,
    );
    cone.addColorStop(0, 'rgba(255, 240, 190, 0.10)');
    cone.addColorStop(1, 'rgba(255, 240, 190, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(sub.x, sub.y);
    ctx.arc(sub.x, sub.y, CONFIG.sub.lampRange, lampAngle - CONFIG.sub.lampAngle, lampAngle + CONFIG.sub.lampAngle);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Things that glow in the dark: orbs first, so the eye finds them.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of world.orbs) {
      const pulse = 0.75 + 0.25 * Math.sin(o.phase);
      const halo = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, 26 * pulse);
      halo.addColorStop(0, 'rgba(125, 252, 214, 0.55)');
      halo.addColorStop(1, 'rgba(125, 252, 214, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 26 * pulse, 0, TAU);
      ctx.fill();
    }
    for (const p of world.pockets) {
      const halo = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 22);
      halo.addColorStop(0, 'rgba(159, 220, 255, 0.4)');
      halo.addColorStop(1, 'rgba(159, 220, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, 0, TAU);
      ctx.fill();
    }
    for (const f of world.fish) {
      const lx = f.x + Math.cos(f.angle) * (f.r + 8);
      const ly = f.y + Math.sin(f.angle) * (f.r + 8);
      const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, 12);
      halo.addColorStop(0, 'rgba(230, 200, 255, 0.8)');
      halo.addColorStop(1, 'rgba(230, 200, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, ly, 12, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Orbs, pockets, mines and fish themselves.
    for (const o of world.orbs) {
      const pulse = 0.85 + 0.15 * Math.sin(o.phase);
      ctx.fillStyle = pal.orb;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * pulse, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pal.orbCore;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * 0.45 * pulse, 0, TAU);
      ctx.fill();
    }
    for (const p of world.pockets) {
      ctx.strokeStyle = pal.pocket;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + Math.sin(p.phase) * 1.5, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(159, 220, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.55, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pal.text;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('O₂', p.x, p.y + 0.5);
    }
    for (const m of world.mines) {
      const blink = 0.5 + 0.5 * Math.sin(m.blink);
      ctx.fillStyle = '#3a1518';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#7c2b2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, TAU);
      ctx.stroke();
      // Spikes.
      ctx.strokeStyle = '#5c2226';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.4;
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r);
        ctx.lineTo(m.x + Math.cos(a) * (m.r + 6), m.y + Math.sin(a) * (m.r + 6));
        ctx.stroke();
      }
      // Its warning blink: the only thing that gives it away in the dark.
      ctx.fillStyle = `rgba(255, 93, 93, ${0.25 + blink * 0.65})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3.5, 0, TAU);
      ctx.fill();
    }
    for (const f of world.fish) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillStyle = '#2a1b3d';
      ctx.beginPath();
      ctx.ellipse(0, 0, f.r + 6, f.r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pal.fish;
      ctx.beginPath();
      ctx.moveTo(-f.r - 2, 0);
      ctx.lineTo(-f.r - 14, -8);
      ctx.lineTo(-f.r - 14, 8);
      ctx.closePath();
      ctx.fill();
      // Jaw and eye.
      ctx.strokeStyle = '#e8d5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(6, 3, 7, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(10, -4, 2.4, 0, TAU);
      ctx.fill();
      // Lure stalk with its glow-bulb.
      ctx.strokeStyle = '#8f7bd8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, -8);
      ctx.quadraticCurveTo(16, -16, f.r + 8, -10);
      ctx.stroke();
      ctx.fillStyle = '#f2e7ff';
      ctx.beginPath();
      ctx.arc(f.r + 8, -10, 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // The submersible, always lit: it carries the lamp.
    this._drawSub(ctx, sub, game.time);

    // Particles and floating score text.
    for (const p of world.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of world.floaters) {
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // HUD and screens sit above the world, bright and readable.
    if (game.state === 'title') this._drawTitle(ctx, game);
    else if (game.state === 'gameover') this._drawGameOver(ctx, game);
    else if (game.state === 'win') this._drawWin(ctx, game);
    else {
      this._drawHud(ctx, game);
      if (game.state === 'paused') this._drawPaused(ctx, game);
    }
  }

  _drawSub(ctx, sub, time) {
    const pal = CONFIG.palette;
    ctx.save();
    ctx.translate(sub.x, sub.y);
    if (sub.invulnerable && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.rotate(sub.facing);
    // Hull: a little rounded sub.
    ctx.fillStyle = '#e8b34b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 11, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c98f2e';
    ctx.beginPath();
    ctx.ellipse(-4, 4, 14, 6, 0, 0, TAU);
    ctx.fill();
    // Dome.
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath();
    ctx.arc(4, -6, 6, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // Lamp housing at the nose.
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(18, 0, 4.5, 0, TAU);
    ctx.fill();
    // Propeller wash.
    ctx.strokeStyle = 'rgba(190, 230, 255, 0.7)';
    ctx.lineWidth = 2;
    const wob = Math.sin(time * 22) * 3;
    ctx.beginPath();
    ctx.moveTo(-20, -3 + wob);
    ctx.lineTo(-27, -3 + wob);
    ctx.moveTo(-20, 3 - wob);
    ctx.lineTo(-27, 3 - wob);
    ctx.stroke();
    ctx.restore();
    void pal;
  }

  _drawHud(ctx, game) {
    const pal = CONFIG.palette;
    const { width } = CONFIG;
    ctx.textBaseline = 'alphabetic';
    // Top bar.
    ctx.fillStyle = 'rgba(2, 12, 22, 0.55)';
    ctx.fillRect(0, 0, width, 44);
    ctx.fillStyle = pal.text;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${game.score}`, 16, 29);
    if (game.combo > 1) {
      ctx.fillStyle = pal.gold;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`COMBO x${game.combo}`, 190, 28);
    }
    ctx.fillStyle = pal.textDim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`DEPTH ${game.world.depthMetres + game.depthInLevel} m  ·  LEVEL ${game.world.level}`, width / 2, 28);
    // Hull hearts, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < CONFIG.sub.hull; i++) {
      ctx.fillStyle = i < game.hull ? pal.hull : 'rgba(255,143,107,0.25)';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('♥', width - 16 - i * 26, 30);
    }
    // Oxygen bar, bottom left.
    const ox = clamp(game.oxygen / CONFIG.oxygen.max, 0, 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.textDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('OXYGEN', 16, CONFIG.height - 34);
    ctx.fillStyle = 'rgba(2, 12, 22, 0.6)';
    ctx.fillRect(16, CONFIG.height - 28, 170, 12);
    ctx.fillStyle = ox > 0.3 ? '#7fd4ff' : '#ff7d6b';
    ctx.fillRect(16, CONFIG.height - 28, 170 * ox, 12);
    // Descent progress, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = pal.textDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(
      `ORBS TO DESCEND  ${game.world.orbsBanked}/${CONFIG.depth.orbsToDescend}`,
      width - 16,
      CONFIG.height - 34,
    );
    ctx.fillStyle = 'rgba(2, 12, 22, 0.6)';
    ctx.fillRect(width - 186, CONFIG.height - 28, 170, 12);
    ctx.fillStyle = pal.orb;
    ctx.fillRect(
      width - 186,
      CONFIG.height - 28,
      170 * clamp(game.world.orbsBanked / CONFIG.depth.orbsToDescend, 0, 1),
      12,
    );
    // Mute hint.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(143, 184, 204, 0.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(game.sfx.muted ? 'M — sound off · P — pause' : 'M — mute · P — pause', width / 2, CONFIG.height - 16);
  }

  _panel(ctx, title, lines, accent) {
    const pal = CONFIG.palette;
    const { width, height } = CONFIG;
    ctx.fillStyle = 'rgba(2, 10, 20, 0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, width / 2, height / 2 - 96);
    ctx.fillStyle = pal.text;
    ctx.font = '17px system-ui, sans-serif';
    let y = height / 2 - 52;
    for (const line of lines) {
      ctx.fillText(line, width / 2, y);
      y += 28;
    }
    return y;
  }

  _drawTitle(ctx, game) {
    const y = this._panel(
      ctx,
      'LUMEN DEEP',
      [
        'Pilot your submersible down a dark trench. Gather lumen-orbs,',
        'dodge the mines the dark hides, and mind your oxygen.',
        '',
        'Move — WASD or arrow keys      Aim the lamp — mouse',
        'Pause — P      Mute — M',
        '',
        'Bank 12 orbs to descend. Reach the trench floor at 1000 m to win.',
      ],
      CONFIG.palette.orb,
    );
    ctx.fillStyle = CONFIG.palette.gold;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('Press ENTER or click to dive', CONFIG.width / 2, y + 18);
    if (game.best > 0) {
      ctx.fillStyle = CONFIG.palette.textDim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Best dive: ${game.best} points`, CONFIG.width / 2, y + 48);
    }
  }

  _drawPaused(ctx, game) {
    const pal = CONFIG.palette;
    ctx.fillStyle = 'rgba(2, 10, 20, 0.6)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = pal.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText('PAUSED', CONFIG.width / 2, CONFIG.height / 2 - 8);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press P to keep diving', CONFIG.width / 2, CONFIG.height / 2 + 26);
    void game;
  }

  _drawGameOver(ctx, game) {
    const y = this._panel(
      ctx,
      'THE LIGHT WENT OUT',
      [
        `Your sub went dark at ${game.world.depthMetres + game.depthInLevel} m.`,
        `Final score: ${game.score} points  ·  Best: ${game.best}`,
      ],
      CONFIG.palette.mine,
    );
    ctx.fillStyle = CONFIG.palette.gold;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('Press R or ENTER to dive again', CONFIG.width / 2, y + 18);
  }

  _drawWin(ctx, game) {
    const y = this._panel(
      ctx,
      'TRENCH FLOOR REACHED',
      [
        '1000 metres down — you found the heart of the trench.',
        `Final score: ${game.score} points  ·  Best: ${game.best}`,
      ],
      CONFIG.palette.gold,
    );
    ctx.fillStyle = CONFIG.palette.orb;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('Press R or ENTER to dive again', CONFIG.width / 2, y + 18);
  }
}
