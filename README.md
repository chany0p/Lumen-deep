# Lumen Deep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01)](https://make.fun/bounty/best-game-01)

A 2D arcade game: pilot a submersible down a dark trench, gather
glowing lumen-orbs, dodge the mines the dark hides, and mind your oxygen.
Bank 12 orbs to descend a level; reach the trench floor at 1000 m to win.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome (or run `node serve.ts` and open http://localhost:8080). No network
requests, no build step, no assets — all art is drawn on canvas and all
sound is synthesized with the Web Audio API.

- **Move** — WASD or arrow keys
- **Aim the lamp** — mouse (the light cone reveals what the dark hides)
- **Pause** — P · **Mute** — M
- **Start / restart** — Enter, or click

The trench gets darker and busier as you descend. Orbs glow in the dark;
mines give themselves away only by a faint red blink; anglerfish hunt by
their lure-light. Pickups in quick succession build a combo multiplier
(up to x8). Air pockets refill your oxygen — an empty tank costs a hull
after a short grace. Three hulls, then the light goes out.

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — seeded RNG (deterministic screenshots)
- `game/src/audio.js` — synthesized sound effects, no audio files
- `game/src/input.js` — keyboard and mouse state
- `game/src/world.js` — entities, spawning, collisions, depth
- `game/src/render.js` — all drawing: water, darkness, lamp, HUD, screens
- `game/src/main.js` — the loop, the state machine, the shot presets
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `screenshots/` — three real renders of the game (title, play, game over)

## Screenshots

The three screenshots are deterministic renders of the game itself, taken
in a browser from `?shot=start|play|end&seed=1` (see `shots.json`).
