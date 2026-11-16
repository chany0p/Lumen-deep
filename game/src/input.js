// Lumen Deep — keyboard and mouse state. The game reads this, never the
// DOM events directly, so the loop and the screenshot presets share one
// input model.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered: cleared by the loop each frame
    this.mouse = { x: 0, y: 0, inside: false, moved: false };
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.keys.has(key)) this.pressed.add(key);
      this.keys.add(key);
    };
    this._onKeyUp = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(key);
    };
    this._onMouse = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouse.y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
      this.mouse.inside = true;
      this.mouse.moved = true;
    };
    this._onLeave = () => {
      this.mouse.inside = false;
    };
    this._onBlur = () => {
      this.keys.clear();
    };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('mousemove', this._onMouse);
    this.canvas.addEventListener('mouseleave', this._onLeave);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('mousemove', this._onMouse);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // True only on the frame the key went down.
  hit(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  // Movement vector from WASD or the arrow keys, normalized.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('a', 'ArrowLeft')) x -= 1;
    if (this.down('d', 'ArrowRight')) x += 1;
    if (this.down('w', 'ArrowUp')) y -= 1;
    if (this.down('s', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
  }
}
