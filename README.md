# Lumen Deep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/chany0p/Lumen-deep/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/chany0p/Lumen-deep/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A 2D arcade game: pilot a submersible down a dark trench, gather
glowing lumen-orbs, dodge the mines the dark hides, and mind your oxygen.
Bank 12 orbs to descend a level; reach the trench floor at 1000 m to win.
Bosses guard levels 3, 6 and 9 — burn the Ancient Angler with your lamp
or lure it into its own mines. After every level, the Dive Shop offers
three upgrades: a wider lamp, swift fins, a reinforced hull, a bigger
tank, an orb magnet, a sonar suite. Ping SPACE for sonar, and after the
win, keep diving in endless mode.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome (or run `node serve.ts` and open http://localhost:8080). No network
requests, no build step, no assets — all art is drawn on canvas and all
sound is synthesized with the Web Audio API.

- **Move** — WASD or arrow keys
- **Aim the lamp** — mouse (the light cone reveals what the dark hides)
- **Sonar** — SPACE pings the dark and lights up every mine for a while
- **Pick an upgrade** — keys 1 / 2 / 3, or click a card, in the Dive Shop
- **Pause** — P · **Mute** — M
- **Start / restart** — Enter, or click
- **After the win** — E keeps diving in endless mode

The trench gets darker and busier as you descend. Orbs glow in the dark;
mines give themselves away only by a faint red blink; anglerfish hunt by
their lure-light. Pickups in quick succession build a combo multiplier
(up to x8). Air pockets refill your oxygen — an empty tank costs a hull
after a short grace. Three hulls, then the light goes out. On boss
levels the way down stays shut until the Ancient Angler is beaten: hold
it in the lamp cone to burn it, or let it swallow a mine.

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — every tuning number in one place, plus the
  six-upgrade Dive Shop table and the boss / sonar tuning
- `game/src/random.js` — seeded RNG (deterministic screenshots)
- `game/src/audio.js` — synthesized sound effects, no audio files
- `game/src/input.js` — keyboard and mouse state
- `game/src/world.js` — entities, spawning, collisions, depth, the
  Ancient Angler boss (stalk / telegraph / charge), sonar pings
- `game/src/render.js` — all drawing: water, god rays, darkness, lamp,
  HUD, boss health bar, Dive Shop cards, screens
- `game/src/main.js` — the loop, the state machine, the upgrade draft,
  endless mode, and the shot presets
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `screenshots/` — four real renders of the game (title, play, game over,
  boss fight)

## Screenshots

The four screenshots are deterministic renders of the game itself, taken
in a browser from `?shot=start|play|end|boss&seed=N` (see `shots.json`).

---
<sub>Entered on [make.fun](https://make.fun/?ref=sd95y6wa&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
