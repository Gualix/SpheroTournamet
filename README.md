# Sphero Tournament

Bracket and live duel manager for Sphero robot tournaments — built for the **STEM Pillar** program at **Akamai Costa Rica**.

Run a full event from one screen: register participants, generate the bracket, drive each duel or timed race live in front of an audience, and crown a champion.

---

## Features

**Tournament formats**
- Single elimination
- Round robin
- Double elimination
- Race series ("carreras") — multi-race points championships

**Bracket views**
- Radial bracket — circular layout, built for projecting to a room
- Horizontal and vertical tree brackets
- Round-robin standings table

**Running the event**
- Sequential duel HUD to walk match by match through the bracket
- Race timer with configurable duration and five difficulty tiers, from *Circuito Inicial* to *Gran Prix Master*
- Point schemes for race results: F1-style, proportional, exponential, STEM-linear, or fully custom
- Champion reveal with podium breakdown and confetti

**Participants**
- Presets for 8, 16, or 32 players, or bring your own roster
- 20 animal avatars, each with its own emoji, accent color, glow, and vector renderer
- Optional custom avatar images
- Per-participant stats: matches, points scored and conceded, podiums, victories

**Reliability**
- Autosaves to `localStorage` with a versioned schema and a backup slot
- Saved state is validated on load, so a corrupted entry won't take down a live event
- Sound effects, toggleable mid-event

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Animation | Motion, canvas-confetti |
| Icons | lucide-react |
| Package manager | Bun (`bun.lock`) |
| Container runtime | nginx on Alpine |

The app is a fully static single-page app. There is no backend and no runtime configuration — the built output is plain HTML, CSS, and JS that any static host can serve.

---

## Local development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Serves on `http://localhost:3000`, bound to `0.0.0.0` so other devices on the network can reach it — useful for testing on the tablet or laptop that will drive the event.

### Other scripts

```bash
bun run build      # production build to dist/
bun run preview    # serve the built output locally
bun run lint       # typecheck with tsc --noEmit
bun run clean      # remove dist/
```

---

## Project layout

```
src/
├── App.tsx                  # Root component and tournament state machine
├── main.tsx                 # Entry point
├── types.ts                 # Domain model: Tournament, Match, Participant, Race
├── components/
│   ├── RadialBracket.tsx        # Circular bracket, projector-friendly
│   ├── TreeBracket.tsx          # Horizontal / vertical tree layouts
│   ├── RoundRobinView.tsx       # Standings table
│   ├── SequentialDuelHUD.tsx    # Match-by-match live driver
│   ├── SpheroRaceTimerModal.tsx # Race countdown
│   ├── RaceResultsModal.tsx     # Top-5 entry and point calculation
│   ├── MatchModal.tsx           # Score entry for a single duel
│   ├── ChampionModal.tsx        # Podium and champion reveal
│   ├── ParticipantManagerModal.tsx
│   ├── TournamentSetupMenu.tsx
│   ├── AnimalAvatar.tsx         # Vector avatar renderer
│   └── AtmosphericBackground.tsx
├── utils/
│   ├── tournamentEngine.ts  # Bracket generation, winner advancement, scoring
│   ├── storage.ts           # Versioned localStorage autosave + validation
│   └── audio.ts             # Sound effects
└── data/
    └── animals.ts           # The 20 animal profiles
```

---

## Docker

The app ships as a `linux/amd64` image: Bun compiles the Vite bundle, nginx serves the static output. Final image is roughly **74 MB**, almost all of it the nginx Alpine base.

The build stage is pinned to `--platform=$BUILDPLATFORM`, so the bundle compiles natively on your machine rather than under QEMU emulation. On Apple Silicon this is the difference between seconds and twenty-plus minutes. Vite output is architecture-independent, so the resulting image is identical either way.

nginx is configured with SPA history fallback, gzip, and immutable caching on hashed `/assets` files.

### Quick path

```bash
export DOCKERHUB_USER=yourname
export DOCKERHUB_TOKEN=dckr_pat_xxxxx   # hub.docker.com → Account Settings → Personal access tokens
./scripts/docker-build-push.sh
```

Handles login, builder setup, both tags, registry build caching, and the push.

| Variable | Default | Meaning |
|---|---|---|
| `DOCKERHUB_USER` | *(required)* | Docker Hub account or org |
| `DOCKERHUB_TOKEN` | — | Access token; enables non-interactive login |
| `IMAGE_NAME` | `sphero-tournament` | Repository name |
| `PLATFORM` | `linux/amd64` | Target platform |
| `PUSH` | `1` | Set to `0` to build without pushing |

Pass a version to tag it explicitly instead of using the git SHA:

```bash
./scripts/docker-build-push.sh v1.0.0
```

### Manual path

**1. Log in**

```bash
export DOCKERHUB_USER=yourname
export DOCKERHUB_TOKEN=dckr_pat_xxxxx

printf '%s' "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
```

**2. Create a buildx builder** (one time)

```bash
docker buildx create --name sphero-builder --driver docker-container --use
docker buildx inspect --bootstrap
```

**3. Build for amd64 and load locally**

```bash
docker buildx build \
  --platform linux/amd64 \
  --tag "$DOCKERHUB_USER/sphero-tournament:latest" \
  --tag "$DOCKERHUB_USER/sphero-tournament:$(git rev-parse --short HEAD)" \
  --load \
  .
```

**4. Test before pushing**

```bash
docker run -d --name sphero-test -p 8099:80 "$DOCKERHUB_USER/sphero-tournament:latest"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/    # expect 200
docker rm -f sphero-test
```

**5. Push**

```bash
docker buildx build \
  --platform linux/amd64 \
  --tag "$DOCKERHUB_USER/sphero-tournament:latest" \
  --tag "$DOCKERHUB_USER/sphero-tournament:$(git rev-parse --short HEAD)" \
  --push \
  .
```

`--load` and `--push` cannot be combined in a single buildx invocation, which is why building and pushing are separate commands. Layers are cached from step 3, so the push is mostly upload time.

### Deploy on an x86 Linux host

```bash
docker pull yourname/sphero-tournament:latest

docker run -d \
  --name sphero-tournament \
  --restart unless-stopped \
  -p 8080:80 \
  yourname/sphero-tournament:latest
```

The app is then on port 8080. The image declares a healthcheck, so `docker ps` reports container health once the first probe completes.

---

## A note on `GEMINI_API_KEY`

`.env.example` carries `GEMINI_API_KEY` and `APP_URL`, inherited from the AI Studio scaffold. Nothing under `src/` currently reads either one — the app builds and runs as a fully static SPA with no API calls.

If Gemini features get added later, note that a `VITE_`-prefixed variable is inlined into the client bundle at build time and is therefore **public**. A key that must stay secret needs a small backend proxy rather than a build-time variable.

---

## License

Internal project — STEM Pillar, Akamai Costa Rica.
