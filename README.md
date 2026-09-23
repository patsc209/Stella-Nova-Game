# Planet Hockey

High-fidelity class prototype for an upper-body rehab game: slash floating solar-system planets with your arms (PoseNet wrist tracking). Sessions last **30 seconds**.

## Screens

1. **TV / Game** (`game.html`) — webcam + PoseNet slash gameplay, room code lobby, countdown, score HUD, results.
2. **Tablet** (`tablet.html`) — Home → connect with room code → live/pause → end-game stats.

Both tabs sync on the **same computer** via `BroadcastChannel` + `localStorage` and a shared 4-character room code.

## Run locally

Serve the folder over HTTP (camera + module-free static files):

```bash
python3 -m http.server 8080
```

Then open:

- Landing: http://localhost:8080/
- TV: http://localhost:8080/game.html
- Tablet: http://localhost:8080/tablet.html

Allow camera access on the TV tab. Enter the on-screen room code on the tablet and press **Join & start**.

### Demo keys (TV tab)

- `P` — start match  
- `Space` — pause / resume  
- `R` — restart  

## Stack

- p5.js + ml5.js PoseNet (adapted from the slash-circles sketch)
- Vanilla HTML/CSS/JS companion UI
