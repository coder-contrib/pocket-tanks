# Pocket Tanks - Multiplayer Edition

A minimalist black and white web-based multiplayer version of Pocket Tanks.

## 🚀 One Command Start

```bash
npm install
npm start
```

Then open **http://localhost:5173** in multiple browser tabs!

## Features

- 🎮 **Real-time multiplayer** - each browser tab = new player
- 🎯 **Friendly player names** - 20 unique names like "Tank Commander", "Artillery Ace"
- ⚡ **Vite with HMR** - instant code updates
- 🎯 **Server-authoritative** - no cheating possible
- ⏱️ **Auto-disconnect** - removes idle players after 60s
- 🧹 **Clean player removal** - proper WebSocket cleanup and name recycling
- 🏔️ **Destructible terrain** - explosions crater the ground
- 🎨 **Black/white line art** - minimalist aesthetic

## How It Works

When you run `npm start`:
1. **Vite starts** on port 5173 (serves the game UI with HMR)
2. **WebSocket server starts** on port 3000 (handles multiplayer logic)
3. Open multiple tabs → each becomes a new player
4. Players take turns automatically

## Controls

| Key | Action |
|-----|--------|
| **A/D** | Move tank left/right |
| **W/S** | Adjust turret angle |
| **Q/E** | Adjust shot power |
| **SPACE** | Fire missile |
| **U** | End turn manually |

## Game Rules

- Each player: **5 bullets**, **4 moves**, **100 health**
- Only the **active player** can control their tank
- Physics-based projectiles with gravity
- Direct hits deal more damage
- Terrain is destructible
- Idle 60s = auto-disconnect

## Environment Config

Optional `.env` file:

```env
PORT=3000              # WebSocket server port
IDLE_TIMEOUT=60000     # Idle timeout in milliseconds
```

## Commands

```bash
npm start           # Start Vite + WebSocket server
npm test            # Test WebSocket connections
npm run test:cleanup # Test cleanup & name recycling
```

## Architecture

```
┌──────────────────┐         ┌───────────────────┐
│  Browser Tab 1   │         │                   │
│  localhost:5173  │◄───WS───►│  WebSocket Server │
├──────────────────┤         │  localhost:3000   │
│  Browser Tab 2   │◄───WS───►│                   │
│  localhost:5173  │         │  • Game logic     │
├──────────────────┤         │  • Physics (60fps)│
│  Browser Tab N   │◄───WS───►│  • Idle tracking  │
└──────────────────┘         └───────────────────┘
```

**Vite Plugin:** Automatically starts the WebSocket server when Vite starts, so you only need one command!

## Files

| File | Purpose |
|------|---------|
| `server.js` | WebSocket server + game logic |
| `game.js` | Client rendering + WebSocket |
| `index.html` | Game UI |
| `style.css` | Styling |
| `vite.config.js` | Vite config + server plugin |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Set `PORT=8080` in `.env` |
| Port 5173 in use | Change in `vite.config.js` |
| Disconnected | Server might not be running - check console |
| Auto-disconnect | 60s idle - stay active! |

---

Built with Node.js + WebSockets + Vite
