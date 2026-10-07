import express from 'express';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = parseInt(process.env.PORT) || 3000;
const IDLE_TIMEOUT = parseInt(process.env.IDLE_TIMEOUT) || 60000; // 1 minute in milliseconds

const app = express();
// Serve the client from this same port so a single-port reverse proxy (such as a
// Coder workspace app) can reach both the UI and the WebSocket on one origin.
app.use(express.static(fileURLToPath(new URL('.', import.meta.url))));
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Friendly names pool
const PLAYER_NAMES = [
    'Tank Commander', 'Artillery Ace', 'Cannon King', 'Blast Master',
    'Heavy Gunner', 'Bombardier', 'Siege Captain', 'Thunder Chief',
    'Shell Shooter', 'Mortar Man', 'Big Gun', 'Fire Marshal',
    'Rocket Boss', 'Battle Tank', 'War Machine', 'Steel Baron',
    'Powder Keg', 'Iron Duke', 'Boom Operator', 'Shot Caller'
];

// Game state
const gameState = {
    players: new Map(), // playerId -> player data
    nextPlayerId: 1,
    terrain: [],
    missiles: [],
    usedNames: new Set() // Track which names are in use
};

// Initialize terrain
function initTerrain() {
    gameState.terrain = [];
    const width = 1200;
    const groundHeight = 500;

    for (let x = 0; x < width; x++) {
        let y = groundHeight;
        // Create some hills
        if (x > 300 && x < 500) {
            y = groundHeight - 100 - Math.sin((x - 300) / 200 * Math.PI) * 50;
        } else if (x > 700 && x < 900) {
            y = groundHeight - 80 - Math.sin((x - 700) / 200 * Math.PI) * 40;
        }
        gameState.terrain.push(y);
    }
}

// Initialize terrain on server start
initTerrain();

// Find spawn position for new player
function findSpawnPosition() {
    const positions = [150, 350, 550, 750, 950, 1050];
    const occupiedPositions = Array.from(gameState.players.values()).map(p => p.x);

    for (const pos of positions) {
        const tooClose = occupiedPositions.some(occupied => Math.abs(occupied - pos) < 100);
        if (!tooClose) {
            return pos;
        }
    }

    // Fallback: random position
    return 150 + Math.random() * 900;
}

// Get available player name
function getPlayerName() {
    const availableNames = PLAYER_NAMES.filter(name => !gameState.usedNames.has(name));

    if (availableNames.length > 0) {
        // Pick a random name from available ones
        const name = availableNames[Math.floor(Math.random() * availableNames.length)];
        gameState.usedNames.add(name);
        return name;
    }

    // Fallback if all names are taken
    const num = gameState.usedNames.size + 1;
    const name = `Player ${num}`;
    gameState.usedNames.add(name);
    return name;
}

// Release player name back to pool
function releasePlayerName(name) {
    gameState.usedNames.delete(name);
}

// Create new player
function createPlayer(playerId, ws) {
    const x = findSpawnPosition();
    const y = gameState.terrain[Math.floor(x)] - 20;

    return {
        id: playerId,
        name: getPlayerName(),
        ws,
        x,
        y,
        angle: playerId % 2 === 0 ? 135 : 45,
        power: 50,
        bullets: 999,
        moves: 999,
        health: 100,
        lastActivity: Date.now()
    };
}

// Broadcast to all connected clients
function broadcast(data, excludeWs = null) {
    const message = JSON.stringify(data);
    gameState.players.forEach(player => {
        if (player.ws && player.ws !== excludeWs && player.ws.readyState === 1) { // 1 = OPEN
            player.ws.send(message);
        }
    });
}

// Send game state to a specific client
function sendGameState(ws) {
    const players = Array.from(gameState.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        angle: p.angle,
        power: p.power,
        bullets: p.bullets,
        moves: p.moves,
        health: p.health,
        isActive: p.isActive
    }));

    ws.send(JSON.stringify({
        type: 'gameState',
        players,
        terrain: gameState.terrain,
        missiles: gameState.missiles
    }));
}

// Handle player action
function handlePlayerAction(playerId, action) {
    console.log(`[ACTION] Player ${playerId} action type: ${action.type}`);

    const player = gameState.players.get(playerId);
    if (!player) {
        console.log(`[ACTION] REJECTED - Player ${playerId} not found`);
        return;
    }

    player.lastActivity = Date.now();

    switch (action.type) {
        case 'move':
            const newX = player.x + action.direction * 10;
            // Check bounds and collisions
            const canMove = newX >= 50 && newX <= 1150 &&
                !Array.from(gameState.players.values()).some(p =>
                    p.id !== playerId && Math.abs(newX - p.x) < 40
                );

            if (canMove) {
                player.x = newX;
                player.y = gameState.terrain[Math.floor(player.x)] - 20;
            }
            break;

        case 'adjustAngle':
            player.angle = Math.max(0, Math.min(180, player.angle + action.delta));
            break;

        case 'adjustPower':
            player.power = Math.max(10, Math.min(100, player.power + action.delta));
            break;

        case 'fire':
            player.bullets--;
            const angleRad = (player.angle * Math.PI) / 180;
            const speed = player.power / 10;
            const turretLength = 30;

            const missile = {
                id: Date.now() + Math.random(),
                playerId: player.id,
                x: player.x + Math.cos(angleRad) * turretLength,
                y: player.y + 10 - Math.sin(angleRad) * turretLength,
                vx: Math.cos(angleRad) * speed,
                vy: -Math.sin(angleRad) * speed
            };

            gameState.missiles.push(missile);
            break;
    }

    broadcast({ type: 'update', players: getPlayersData() });
}

// Get players data for broadcast
function getPlayersData() {
    return Array.from(gameState.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        angle: p.angle,
        power: p.power,
        bullets: p.bullets,
        moves: p.moves,
        health: p.health
    }));
}

// Activate next player
function activateNextPlayer(currentPlayerId = null) {
    console.log(`[TURN SWITCH] Starting activateNextPlayer, currentPlayerId=${currentPlayerId}`);

    const playerIds = Array.from(gameState.players.keys()).sort();
    if (playerIds.length === 0) {
        console.log(`[TURN SWITCH] No players, aborting`);
        return;
    }

    // If currentPlayerId is passed, use that, otherwise find the active one
    const currentActiveId = currentPlayerId || playerIds.find(id => gameState.players.get(id).isActive);
    let nextIndex = 0;

    if (currentActiveId) {
        const currentIndex = playerIds.indexOf(currentActiveId);
        nextIndex = (currentIndex + 1) % playerIds.length;
        console.log(`[TURN SWITCH] Current player: ${currentActiveId} (index ${currentIndex}), next index: ${nextIndex}`);
    }

    // Deactivate all
    gameState.players.forEach(p => {
        p.isActive = false;
    });

    // Activate next and reset their resources
    const nextPlayer = gameState.players.get(playerIds[nextIndex]);
    if (nextPlayer) {
        nextPlayer.isActive = true;
        // Reset bullets and moves for the new turn
        nextPlayer.bullets = 5;
        nextPlayer.moves = 4;

        console.log(`[TURN SWITCH] ✅ Activated ${nextPlayer.name} (ID: ${nextPlayer.id}) - bullets:${nextPlayer.bullets}, moves:${nextPlayer.moves}`);

        const turnData = {
            type: 'turnChange',
            activePlayerId: nextPlayer.id,
            players: getPlayersData() // Include updated player data with reset resources
        };

        // Send to the activated player directly first
        if (nextPlayer.ws && nextPlayer.ws.readyState === 1) {
            nextPlayer.ws.send(JSON.stringify(turnData));
            console.log(`[TURN SWITCH] Sent turnChange directly to player ${nextPlayer.id}`);
        }

        // Then broadcast to everyone else
        broadcast(turnData, nextPlayer.ws);
        console.log(`[TURN SWITCH] Broadcasted turnChange to other players`);
    } else {
        console.log(`[TURN SWITCH] ERROR - Could not find next player at index ${nextIndex}`);
    }
}

// Remove player
function removePlayer(playerId) {
    const player = gameState.players.get(playerId);
    if (!player) return;

    const playerName = player.name;

    // Close WebSocket if still open
    if (player.ws && player.ws.readyState === 1) { // 1 = OPEN
        try {
            player.ws.close();
        } catch (err) {
            console.error(`Error closing WebSocket for player ${playerId}:`, err);
        }
    }

    // Release the player's name back to the pool
    releasePlayerName(playerName);

    // Remove from players map
    gameState.players.delete(playerId);

    console.log(`Player ${playerId} (${playerName}) removed. ${gameState.players.size} players remaining.`);

    broadcast({
        type: 'playerLeft',
        playerId,
        playerName,
        players: getPlayersData()
    });
}

// Check idle players
function checkIdlePlayers() {
    const now = Date.now();
    const toRemove = [];

    gameState.players.forEach((player, playerId) => {
        if (now - player.lastActivity > IDLE_TIMEOUT) {
            toRemove.push(playerId);
        }
    });

    toRemove.forEach(playerId => {
        const player = gameState.players.get(playerId);
        if (player && player.ws) {
            player.ws.send(JSON.stringify({
                type: 'idle',
                message: 'Disconnected due to inactivity'
            }));
            player.ws.close();
        }
        removePlayer(playerId);
    });
}

// Update missiles
function updateMissiles() {
    const GRAVITY = 0.3;
    const BLAST_RADIUS = 40;
    const toRemove = [];

    gameState.missiles.forEach((missile, index) => {
        missile.vy += GRAVITY;
        missile.x += missile.vx;
        missile.y += missile.vy;

        // Check ground collision
        const terrainY = gameState.terrain[Math.floor(missile.x)];
        if (missile.x >= 0 && missile.x < 1200 && missile.y >= terrainY) {
            handleExplosion(missile.x, missile.y, BLAST_RADIUS);
            toRemove.push(index);
            return;
        }

        // Check tank collisions
        let hit = false;
        gameState.players.forEach(player => {
            const dx = missile.x - player.x;
            const dy = missile.y - (player.y + 10);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 25) {
                const damage = Math.max(20, 50 - distance);
                player.health = Math.max(0, player.health - damage);

                if (player.health === 0) {
                    broadcast({
                        type: 'gameOver',
                        winnerId: missile.playerId,
                        loserId: player.id
                    });
                }

                handleExplosion(missile.x, missile.y, BLAST_RADIUS);
                toRemove.push(index);
                hit = true;
            }
        });

        if (hit) return;

        // Check out of bounds
        if (missile.x < 0 || missile.x > 1200 || missile.y > 600) {
            toRemove.push(index);
        }
    });

    // Remove exploded missiles
    toRemove.reverse().forEach(index => {
        gameState.missiles.splice(index, 1);
    });

    if (gameState.missiles.length > 0) {
        broadcast({
            type: 'missiles',
            missiles: gameState.missiles
        });
    }
}

// Handle explosion
function handleExplosion(x, y, blastRadius) {
    // Damage terrain
    for (let i = -blastRadius; i <= blastRadius; i++) {
        const terrainX = Math.floor(x + i);
        if (terrainX >= 0 && terrainX < gameState.terrain.length) {
            const dist = Math.abs(i);
            if (dist < blastRadius) {
                const damage = blastRadius - dist;
                gameState.terrain[terrainX] = Math.min(
                    gameState.terrain[terrainX] + damage,
                    600
                );
            }
        }
    }

    // Update player positions
    gameState.players.forEach(player => {
        player.y = gameState.terrain[Math.floor(player.x)] - 20;
    });

    broadcast({
        type: 'explosion',
        x,
        y,
        radius: blastRadius,
        terrain: gameState.terrain,
        players: getPlayersData()
    });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    const playerId = gameState.nextPlayerId++;
    const player = createPlayer(playerId, ws);
    gameState.players.set(playerId, player);

    console.log(`Player ${playerId} (${player.name}) connected. Total players: ${gameState.players.size}`);

    // Send initial game state
    ws.send(JSON.stringify({
        type: 'init',
        playerId,
        player: {
            id: player.id,
            name: player.name,
            x: player.x,
            y: player.y,
            angle: player.angle,
            power: player.power,
            bullets: player.bullets,
            moves: player.moves,
            health: player.health
        },
        players: getPlayersData(),
        terrain: gameState.terrain
    }));

    // Notify others
    broadcast({
        type: 'playerJoined',
        playerId,
        playerName: player.name,
        players: getPlayersData()
    }, ws);

    // Handle messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`[WS MESSAGE] Received from player ${data.playerId}: type=${data.type}`);

            if (data.playerId === playerId) {
                handlePlayerAction(playerId, data);
            } else {
                console.log(`[WS MESSAGE] REJECTED - playerId mismatch: received ${data.playerId}, expected ${playerId}`);
            }
        } catch (err) {
            console.error('Error parsing message:', err);
        }
    });

    // Handle disconnect - ensure cleanup
    ws.on('close', () => {
        console.log(`WebSocket closed for player ${playerId} (${player.name})`);
        removePlayer(playerId);
    });

    ws.on('error', (err) => {
        console.error(`WebSocket error for player ${playerId} (${player.name}):`, err);
        removePlayer(playerId);
    });
});

// Game loop for physics
setInterval(() => {
    if (gameState.missiles.length > 0) {
        updateMissiles();
    }
}, 1000 / 60); // 60 FPS

// Idle check interval
setInterval(checkIdlePlayers, 5000); // Check every 5 seconds

// Start server
server.listen(PORT, () => {
    console.log(`Pocket Tanks server running on port ${PORT}`);
    console.log(`Idle timeout: ${IDLE_TIMEOUT / 1000} seconds`);
});
