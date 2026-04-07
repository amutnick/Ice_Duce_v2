# Ice_Duce_v2
A tribute to the incredible Ice Dice game by Loony Labs

## Current Status

This build is now locked to the Pyramid Playfield as the default web UI.

Core behavior currently in place:

- Default entry (`src/main.tsx`) mounts the Pyramid Playfield prototype
- Light icy visual direction using art assets from `art/SVG`
- Bank/Playfield split layout with tighter rack spacing and expanded vault/counter area
- Increased UI text contrast and sizing for readability over ice textures
- Asset-backed row labels and `xN` counters in the bank rack
- Bank model reflects physical set counts: 2 copies per color-size piece (30 total)
- Rolling + selection flow is wired into game rules (`applyAction`)
- Bank counts decrement live when a piece is taken
- Counter renders the exact pyramid image that was rolled/selected
- Vaults render exact pyramid images banked from the counter
- Turn status and last-roll strips update from live game state

Notes:
- The previous full React screen (`src/App.tsx`) remains in the repo, but it is no longer the default mounted experience.
- Mac launcher scripts (`Launch Ice Dice.command` / `Stop Ice Dice.command`) still work for local server start/stop.

## Prototype Pages

Use the local Vite server to open the standalone experiment pages:

- `http://127.0.0.1:4173/dice-prototype.html`
- `http://127.0.0.1:4173/pyramid-playfield.html`

`pyramid-playfield.html` mirrors the same Pyramid Playfield direction now used by default.

## Mechanics Mapping (Current)

- `Roll Dice` triggers rules action `roll`.
- Player confirms one allowed color/size option in the roll modal.
- Confirm triggers `choosePiece`:
  - Matching bank slot decrements (`x2 -> x1 -> x0`).
  - Matching pyramid image appears in Counter.
- `End Turn` triggers `stopTurn`:
  - Counter pieces bank into the active player Vault.
  - Vault shows the same pyramid images moved from Counter.

## Mac Launcher

Double-click `Launch Ice Dice.command` to start the LAN server and open the game in your browser.

Use `Stop Ice Dice.command` if you want to shut the server down cleanly later.
