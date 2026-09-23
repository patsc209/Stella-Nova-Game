# Stella Nova

Upper-body rehab class prototype for a user-testing fair.

## Games
- **Star Slash** (`game.html`) — Sun world; slash rising stars (30s)
- **Orbit Rally** (`orbit.html`) — Mercury→Neptune once unlocked; arm air-hockey (solo AI or 2-player)

## Tablet flow
Login → profile (+ optional arm + pain 1–5) → alien → solar home → Explore → **Solo / Play with others** → room code → live/pause → results

## Progression
Only the **Sun** starts unlocked. Score **✦ 12+** in a finished round to unlock the next world (Orbit Rally).

## Fair testing
Local `localStorage` only. Results/Settings: **Continue** or **Reset for next tester**.

## Run
```bash
python3 -m http.server 8080
```
