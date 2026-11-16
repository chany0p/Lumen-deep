// Lumen Deep — make.fun best-game-01 entrypoint (Node 22, standard
// library only). The game is plain static files under game/ plus 3 or 4
// screenshots; this program hands them in by copying both into /output
// and writing /output/dossier.json with the vendored make.fun library.
// The grader runs it twice and both runs must write the same bytes, so
// there is no clock, no randomness and no network here — only copies.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The gate's caps, as the competition's RULES.txt states them: game/ is
// at most 993 files and 48 MiB, index.html at most 1 MiB, screenshots at
// most 4 files of 256 KiB each, and the dossier's source text at most
// 160 KiB. Refusing early here keeps a bad entry from ever being built.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  throw new Error(`lumen-deep main.ts: ${message}`);
}

function checkGameTree(gameDir) {
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  const indexStat = statSync(join(gameDir, 'index.html'));
  if (!indexStat.isFile() || indexStat.size > 1024 * 1024) {
    fail('game/index.html must be a regular file of at most 1 MiB');
  }
  let files = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isSymbolicLink()) fail(`game/ must not hold symlinks: ${path}`);
      if (st.isDirectory()) walk(path);
      else {
        files += 1;
        bytes += st.size;
        if (Buffer.byteLength(path, 'utf8') > CAPS.game_path_max_bytes) fail(`path over 1000 bytes: ${path}`);
      }
    }
  };
  walk(gameDir);
  if (files > CAPS.game_max_files) fail(`game/ holds ${files} files, over the 993 cap`);
  if (bytes > CAPS.game_max_bytes) fail(`game/ is ${bytes} bytes, over the 48 MiB cap`);
}

function checkShots(shotsDir) {
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const names = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
  if (names.length < 3 || names.length > CAPS.screenshots.max) {
    fail(`screenshots/ must hold 3 or 4 images, found ${names.length}`);
  }
  for (const name of names) {
    const st = statSync(join(shotsDir, name));
    if (!st.isFile() || st.size > CAPS.screenshots.max_bytes) {
      fail(`screenshot ${name} must be a regular file of at most 256 KiB`);
    }
  }
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

checkGameTree(gameDir);
checkShots(shotsDir);

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
