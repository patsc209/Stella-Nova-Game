# ReGrade · Planet Hockey

Class prototype for upper-body rehab play.

## Screens

### Tablet (`tablet.html`)
1. Welcome / Log in / Create account (localStorage auth)
2. Profile (“Make it yours”)
3. Alien avatar creator
4. Solar-system home + bottom nav (Home · Explore · Stats · Settings)
5. Planet select → room code connect → live / pause → results

### TV (`game.html`)
Webcam PoseNet **Star Slash** — slash solar-system planets for 30 seconds. Syncs with the tablet via room code on the same computer.

## Run locally

```bash
python3 -m http.server 8080
```

- Landing: http://localhost:8080/
- Tablet: http://localhost:8080/tablet.html
- TV: http://localhost:8080/game.html

Demo keys on TV: `P` start · `Space` pause · `R` restart · click-drag to slash without PoseNet.
