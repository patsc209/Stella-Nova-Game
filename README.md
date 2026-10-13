# Genesis

Two prototypes live in this repo.

## Stella Nova

Upper-body rehab class prototype for a user-testing fair. App files are at the repo root.

### Two devices (iPad + computer)

1. Start the server: `npm start` (serves files + WebSocket sync)
2. Open the **same HTTPS URL** on both devices (live tunnel or local network)
3. **Computer:** `/game.html` (TV)
4. **iPad:** `/tablet.html`
5. Enter the TV room code on the iPad

Room sync works across devices over WebSocket (`/sync`).

### One TV link

`game.html` auto-switches Star Slash (Sun) ↔ Orbit Rally (Mercury+).

### Run locally

```bash
npm install
npm start
```

Then open http://localhost:8080/

### Fair testing

Local accounts only. Continue or Reset for next tester after a round.

## Elqo — Learner Home Dashboard

Static mockup of the Elqo learner home. The Vite app is in [`elqo/`](elqo/). See [elqo/README.md](elqo/README.md).

```bash
cd elqo
npm install
npm run dev
```

Dev server binds to `0.0.0.0:43141` → [http://127.0.0.1:43141](http://127.0.0.1:43141)
