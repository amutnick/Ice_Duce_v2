# Ice_Duce_v2
A tribute to the incredible Ice Dice game by Loony Labs

## Current Status

This build is a playable browser adaptation with the following pieces in place:

- Local hot-seat play for 2 or 3 players
- LAN host-and-join rooms with invite links, room codes, and QR sharing
- Responsive table layout with compact-screen breakpoints
- Turn banners, bust/win feedback, and turn log messaging
- Per-seat lobby naming in LAN mode
- Mac launcher scripts for starting and stopping the LAN server
- Manual background music controls in the header, plus separate sound-effect toggles
- A bank model that now reflects the physical set: 2 copies of each pyramid piece, 30 total
- A Roll Dice modal with an icy presentation that returns to the playfield after the roll resolves
- A dedicated pyramid playfield experiment page for the bank / counter / vault layout

Audio note:
- Background music now starts only when the player explicitly clicks `Play Music`
- That manual control is intentional so the browser does not block playback behind autoplay rules

## Prototype Pages

Use the local Vite server to open the standalone experiment pages:

- `http://127.0.0.1:4173/dice-prototype.html`
- `http://127.0.0.1:4173/pyramid-playfield.html`

These pages are meant for layout and presentation experiments while we keep the main game playable.

## Mac Launcher

Double-click `Launch Ice Dice.command` to start the LAN server and open the game in your browser.

Use `Stop Ice Dice.command` if you want to shut the server down cleanly later.
