# 하이포스 방학 트레저헌터 — notes for Claude

Owner: 하이포스학원 부원장 (수학 강사). All UI copy is Korean, warm and short, written for elementary/middle-school kids and teachers.
The owner dislikes "AI-looking" design: no emoji section markers, no template icons, no English headings. Keep the nautical palette and the Jua + IBM Plex Sans KR pairing.

## Architecture
- Cloudflare Worker (`src/worker.js`) + D1 (`DB`) + static assets (`public/`, binding `ASSETS`, `/api/*` runs the worker first).
- No build step, no framework. `public/app.js` renders with template strings and event delegation (`data-act`, `data-form`).
- `public/voyage.js` exposes `window.Voyage`: route geometry (`stopPts`), `mapHTML`, `placeShips`, `runVoyage` (ship sailing + chest + arrival effects), `stageChests` (full-screen chest opening on phones).
- Sessions: random token in `th_session` HttpOnly cookie; PBKDF2 for teacher passwords and student 4-digit PINs; 5 failures lock for 10 minutes.
- First run: `/api/setup` with `SETUP_CODE` secret creates the teacher and seeds season, treasure pool and shop.

## Game rules (server is the source of truth)
- A season (`settings.season`) has `routeLen` stops, a treasure island every `treasureEvery` stops, `arrivalPoints` at the port.
- Ship position = SUM(logs.moves WHERE season = current). `dpos(t)` = ((t-1) % L) + 1, voyage = floor((t-1)/L)+1; after the port the ship starts the next voyage.
- Granting/approving a quest (`advance`) writes a quest log, one `chests` row (status closed) per treasure island passed, and an `arrive` log with points at the port — all sharing a `grp` id so undo can remove them.
- The prize is drawn only when a chest is opened (`openChest`, weighted by `pool.weight`). Pool items with `points` credit a `bonus` log and are marked delivered immediately.
- Points = SUM(logs.points) across all seasons. Shop purchase writes a negative `buy` log + an `orders` row the teacher marks delivered or cancels (refund).
- Daily quests once per KST day, weekly once per KST week (Mon–Sun), challenge unlimited.

## Testing without wrangler
A plain Node harness can stand in for `wrangler dev`: import the worker, back `env.DB` with `node:sqlite` (prepare/bind/first/all/run/batch) and serve `public/` as `env.ASSETS`. Drive it with Playwright (teacher at 1200×860, student at 390×844 touch).
