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

**Which path do you need?**

| You want to | Go to |
|---|---|
| Build the image and publish it to Docker Hub | [Quick path](#quick-path) / [Manual path](#manual-path) below |
| Run the app on a server, pulling a published image | [Running from Docker Hub only](#running-from-docker-hub-only), or [with Docker Compose](#using-docker-compose-instead) |
| Set up a fresh Ubuntu box, or build on the server itself | [Setting up an Ubuntu host](#setting-up-an-ubuntu-host) |

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

### Deploying what you pushed

Once the image is on Docker Hub, the target machine needs nothing from this repository — see [Running from Docker Hub only](#running-from-docker-hub-only).

On a host without Docker installed yet, start with [Setting up an Ubuntu host](#setting-up-an-ubuntu-host).

---

## Setting up an Ubuntu host

On an x86 Ubuntu server you do **not** need buildx, QEMU, or cross-compilation. The host is already `linux/amd64`, so a plain `docker build` produces the right image. All the `--platform` machinery above exists solely so an Apple Silicon Mac can emit an amd64 image.

### 1. Install Docker

Ubuntu's own `docker.io` package lags well behind. Use Docker's official repository.

Remove conflicting packages:

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y $pkg
done
```

Add Docker's GPG key and repository:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
```

Install the engine, CLI, and plugins:

```bash
sudo apt-get install -y \
  docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

`docker-buildx-plugin` is what provides the `docker buildx` subcommand — it is a plugin to the Docker CLI, not a separate product.

### 2. Post-install

Run Docker without `sudo`:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

`newgrp` applies the group to the current shell. Over SSH, log out and back in — otherwise every command fails with `permission denied on /var/run/docker.sock`.

Start Docker on boot:

```bash
sudo systemctl enable --now docker
```

Verify:

```bash
docker run --rm hello-world
docker buildx version
docker --version
```

### 3. Clone and build

```bash
git clone https://github.com/Gualix/SpheroTournamet.git
cd SpheroTournamet

docker build -t sphero-tournament:latest .
```

No `--platform` flag and no builder setup. BuildKit is the default in current Docker releases, so `$BUILDPLATFORM` in the Dockerfile resolves to the host's own architecture. First build takes a few minutes, most of it `bun install`.

Confirm the result:

```bash
docker image inspect sphero-tournament:latest --format '{{.Os}}/{{.Architecture}}'   # linux/amd64
docker images sphero-tournament                                                      # ~74MB
```

### 4. Run it

```bash
docker run -d \
  --name sphero-tournament \
  --restart unless-stopped \
  -p 8080:80 \
  sphero-tournament:latest

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/
```

Open the firewall if the app needs to be reachable from other machines:

```bash
sudo ufw allow 8080/tcp        # only if ufw is active
```

Then browse to `http://<server-ip>:8080`.

### Ports

`EXPOSE 80` in the Dockerfile is **documentation only** — it does not publish anything. The port reaches the host only via `-p` at run time, read as `host:container`. A container started without `-p` runs perfectly well and is simply unreachable, showing an empty `PORTS` column in `docker ps`.

Port mappings are fixed when a container is created and cannot be changed afterwards. To add or change one, remove and recreate the container:

```bash
docker rm -f sphero-tournament
docker run -d --name sphero-tournament --restart unless-stopped -p 8080:80 sphero-tournament:latest
```

Nothing is lost — tournament state lives in the browser's `localStorage`, not in the container.

If `curl` on the host returns 200 but a browser elsewhere cannot connect, Docker is fine and the block is the firewall or cloud security group.

### Build on the host, or pull from Docker Hub?

Building on the host means you never push or pull — clone, build, run. Pulling a prebuilt image is the better choice when you want the identical verified artifact across several machines, or when the server is too small to run `bun install` comfortably.

---

## Running from Docker Hub only

The simplest deployment. The machine never sees this repository — no `git clone`, no `Dockerfile`, no Node or Bun, no build. It pulls a finished image and runs it.

Everything the app needs is already inside the image: the compiled bundle and the nginx that serves it.

### Requirements

Docker, and nothing else. If the host does not have it, follow [Install Docker](#1-install-docker) and [Post-install](#2-post-install) above, then stop — skip the clone and build steps entirely.

### 1. Pull the image

```bash
docker pull yourname/sphero-tournament:latest
```

If the Docker Hub repository is private, authenticate first:

```bash
docker login -u yourname
```

Public repositories need no login at all.

### 2. Run it

```bash
docker run -d \
  --name sphero-tournament \
  --restart unless-stopped \
  -p 8080:80 \
  yourname/sphero-tournament:latest
```

`--restart unless-stopped` brings the app back automatically after a reboot or a crash.

### 3. Verify

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

The `PORTS` column should read `0.0.0.0:8080->80/tcp`. An empty column means the container is running but unreachable — see [Ports](#ports).

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/    # expect 200
```

Then open `http://<server-ip>:8080` from any machine on the network. Allow the port if a firewall is active:

```bash
sudo ufw allow 8080/tcp
```

### Pin a version in production

`:latest` is a moving target — whatever was pushed most recently. For anything you care about keeping stable, pull a specific tag instead:

```bash
docker pull yourname/sphero-tournament:v1.0.0
docker run -d --name sphero-tournament --restart unless-stopped -p 8080:80 \
  yourname/sphero-tournament:v1.0.0
```

Every push from `scripts/docker-build-push.sh` publishes an immutable tag alongside `:latest` — either the short git SHA or the version you passed. That tag is the one to deploy, because it always names the same image.

### Updating

Docker will not replace a running container on its own. Pull the new image, then recreate:

```bash
docker pull yourname/sphero-tournament:latest
docker rm -f sphero-tournament
docker run -d \
  --name sphero-tournament \
  --restart unless-stopped \
  -p 8080:80 \
  yourname/sphero-tournament:latest
```

Nothing is lost in the swap. The container is stateless — tournaments live in the browser's `localStorage` on whichever machine runs the event, not on the server. The people using the app keep their in-progress bracket across a redeploy.

Reclaim the disk the old image was using:

```bash
docker image prune -f
```

### Rolling back

Because old tags stay on Docker Hub, reverting is the same command with an earlier tag:

```bash
docker rm -f sphero-tournament
docker run -d --name sphero-tournament --restart unless-stopped -p 8080:80 \
  yourname/sphero-tournament:<previous-tag>
```

### Using Docker Compose instead

[`docker-compose.yml`](docker-compose.yml) wraps the same image, keeping the port and restart policy in a file rather than in shell history. It is the more convenient option for a machine you will come back to.

The file is self-contained — on a pull-only host it is the **only** thing you need from this repository:

```bash
curl -O https://raw.githubusercontent.com/Gualix/SpheroTournamet/main/docker-compose.yml
```

Point it at your image and start it:

```bash
IMAGE=yourname/sphero-tournament docker compose up -d
```

Or write the settings once into a `.env` file beside it, which Compose reads automatically:

```bash
cat > .env <<'EOF'
IMAGE=yourname/sphero-tournament
TAG=v1.0.0
HOST_PORT=8080
EOF

docker compose up -d
```

| Variable | Default | Meaning |
|---|---|---|
| `IMAGE` | `yourname/sphero-tournament` | Docker Hub repository |
| `TAG` | `latest` | Image tag; pin a real version in production |
| `HOST_PORT` | `8080` | Port on the host |

### Compose commands

```bash
docker compose up -d          # start
docker compose ps             # status, including the image's healthcheck
docker compose logs -f        # follow nginx logs
docker compose pull           # fetch a newer image
docker compose up -d          # recreate with whatever was just pulled
docker compose down           # stop and remove
```

Updating is the two-step `pull` then `up -d`. Compose notices the image changed and recreates the container; without the `pull` it will happily keep running the old one.

To build from source rather than pull, uncomment `build: .` in the file and run `docker compose up -d --build`. That needs the full repository checked out, not just the Compose file.

### Useful commands

```bash
docker logs -f sphero-tournament          # nginx access and error logs
docker restart sphero-tournament          # restart without recreating
docker stop sphero-tournament             # stop, keep the container
docker rm -f sphero-tournament            # remove entirely
docker exec -it sphero-tournament sh      # shell inside the container
```

---

## A note on `GEMINI_API_KEY`

`.env.example` carries `GEMINI_API_KEY` and `APP_URL`, inherited from the AI Studio scaffold. Nothing under `src/` currently reads either one — the app builds and runs as a fully static SPA with no API calls.

If Gemini features get added later, note that a `VITE_`-prefixed variable is inlined into the client bundle at build time and is therefore **public**. A key that must stay secret needs a small backend proxy rather than a build-time variable.

---

## License

Internal project — STEM Pillar, Akamai Costa Rica.
