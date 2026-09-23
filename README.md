# Stella Nova

Upper-body rehab class prototype: create an alien, explore a solar-system home, then slash **stars** on the TV with PoseNet (30 seconds).

## Fair / user testing
- Accounts are local only (`localStorage`) — no backend
- After a round: **Continue (same tester)** or **Reset for next tester**
- Settings also has **Clear all demo data**

## Progression
- Only the **Sun** starts unlocked
- Score **12+ stars** in a finished round to unlock the next world (Mercury → … → Neptune)
- Picking a world still uses the room-code → TV play flow

## Run
```bash
python3 -m http.server 8080
```
- Landing: http://localhost:8080/
- Tablet: http://localhost:8080/tablet.html
- TV: http://localhost:8080/game.html
