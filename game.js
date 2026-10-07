// WebSocket connection
let ws;
let myPlayerId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const TANK_WIDTH = 40;
const TANK_HEIGHT = 20;
const TURRET_LENGTH = 30;
const MISSILE_RADIUS = 3;

// Game state
let gameState = {
    players: [],
    terrain: [],
    missiles: [],
    myPlayer: null
};

// Connect to WebSocket server
function connect() {
    // Determine WebSocket URL based on environment
    // In Vite dev mode, connect directly to backend server
    // In production, use the same host
    const isDev = window.location.port === '5173'; // Vite dev server port
    let wsUrl;

    if (isDev) {
        wsUrl = 'ws://localhost:3000';
    } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}`;
    }

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        reconnectAttempts = 0;
        showMessage('Connected! Waiting for your turn...');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        showMessage('Disconnected from server');

        // Attempt reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(() => {
                console.log(`Reconnect attempt ${reconnectAttempts}...`);
                connect();
            }, 2000);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Handle server messages
function handleServerMessage(data) {
    switch (data.type) {
        case 'init':
            myPlayerId = data.playerId;
            gameState.terrain = data.terrain;
            gameState.players = data.players;
            gameState.myPlayer = data.player;
            updateUI();
            showMessage(`You are ${data.player.name}!`);
            break;

        case 'gameState':
            gameState.players = data.players;
            gameState.terrain = data.terrain;
            gameState.missiles = data.missiles || [];
            updateUI();
            break;

        case 'update':
            gameState.players = data.players;
            updateUI();
            break;

        case 'missiles':
            gameState.missiles = data.missiles;
            break;

        case 'explosion':
            gameState.terrain = data.terrain;
            gameState.players = data.players;
            drawExplosion(data.x, data.y, data.radius);
            updateUI();
            break;

        case 'playerJoined':
            gameState.players = data.players;
            showMessage(`${data.playerName} joined`);
            updateUI();
            break;

        case 'playerLeft':
            gameState.players = data.players;
            showMessage(`${data.playerName} left`);
            updateUI();
            break;

        case 'turnChange':
            // Update player data if included (contains reset resources)
            if (data.players) {
                gameState.players = data.players;
            } else {
                // Fallback: just update active state
                gameState.players.forEach(p => {
                    p.isActive = p.id === data.activePlayerId;
                });
            }

            if (data.activePlayerId === myPlayerId) {
                showMessage('Your turn! (5 bullets, 4 moves)');
            } else {
                const activePlayer = gameState.players.find(p => p.id === data.activePlayerId);
                if (activePlayer) {
                    showMessage(`${activePlayer.name}'s turn`);
                }
            }
            updateUI();
            break;

        case 'autoTurnEnd':
            if (data.playerId === myPlayerId) {
                showMessage('Out of bullets and moves! Turn ended.');
            } else {
                showMessage(`${data.playerName} ran out of resources`);
            }
            break;

        case 'gameOver':
            const winner = data.winnerId === myPlayerId ? 'You Win!' :
                          gameState.players.find(p => p.id === data.winnerId)?.name + ' Wins!' ||
                          `Player ${data.winnerId} Wins!`;
            showMessage(winner);
            break;

        case 'idle':
            showMessage(data.message);
            break;
    }
};

// Send action to server
function sendAction(action) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            playerId: myPlayerId,
            ...action
        }));
    }
}

// Draw functions
function drawTerrain() {
    if (!gameState.terrain.length) return;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gameState.terrain[0]);
    for (let x = 0; x < gameState.terrain.length; x++) {
        ctx.lineTo(x, gameState.terrain[x]);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.stroke();
}

function drawTank(player) {
    const isMyTank = player.id === myPlayerId;

    // Draw tank body
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x - TANK_WIDTH/2, player.y, TANK_WIDTH, TANK_HEIGHT);

    // Draw turret
    const angleRad = (player.angle * Math.PI) / 180;
    const turretEndX = player.x + Math.cos(angleRad) * TURRET_LENGTH;
    const turretEndY = player.y + TANK_HEIGHT/2 - Math.sin(angleRad) * TURRET_LENGTH;

    ctx.beginPath();
    ctx.moveTo(player.x, player.y + TANK_HEIGHT/2);
    ctx.lineTo(turretEndX, turretEndY);
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw wheels
    const wheelRadius = 5;
    const wheelY = player.y + TANK_HEIGHT;
    ctx.beginPath();
    ctx.arc(player.x - TANK_WIDTH/4, wheelY, wheelRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(player.x + TANK_WIDTH/4, wheelY, wheelRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw health bar
    const healthBarWidth = 40;
    const healthBarHeight = 4;
    ctx.strokeRect(player.x - healthBarWidth/2, player.y - 15, healthBarWidth, healthBarHeight);
    const healthWidth = (player.health / 100) * healthBarWidth;
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x - healthBarWidth/2, player.y - 15, healthWidth, healthBarHeight);

    // Draw player name
    ctx.font = '10px Courier New';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const displayName = player.name || `Player ${player.id}`;
    ctx.fillText(displayName, player.x, player.y - 22);

    // Highlight my tank
    if (isMyTank) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(player.x - TANK_WIDTH/2 - 8, player.y - 33, TANK_WIDTH + 16, TANK_HEIGHT + 46);
        ctx.setLineDash([]);
    }
}

function drawMissiles() {
    gameState.missiles.forEach(missile => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(missile.x, missile.y, MISSILE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Draw trail
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(missile.x, missile.y);
        ctx.lineTo(missile.x - missile.vx * 2, missile.y - missile.vy * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
}

function drawExplosion(x, y, radius) {
    // Draw explosion circles (they'll fade quickly)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y, radius - i * 10, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function clearCanvas() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
    clearCanvas();
    drawTerrain();
    gameState.players.forEach(player => drawTank(player));
    drawMissiles();
}

// UI updates
function updateUI() {
    const myPlayer = gameState.players.find(p => p.id === myPlayerId);

    if (myPlayer) {
        const panel1 = document.getElementById('player1-info');
        panel1.querySelector('h3').textContent = `You (${myPlayer.name})`;
        document.getElementById('p1-bullets').textContent = myPlayer.bullets;
        document.getElementById('p1-moves').textContent = myPlayer.moves;
        document.getElementById('p1-angle').textContent = Math.round(myPlayer.angle);
        document.getElementById('p1-power').textContent = Math.round(myPlayer.power);
    }

    // Hide turn indicators
    document.getElementById('turn-indicator').style.display = 'none';
    document.getElementById('current-turn').style.display = 'none';

    // Show other players in second panel
    const otherPlayers = gameState.players.filter(p => p.id !== myPlayerId);
    const player2Info = document.getElementById('player2-info');

    if (otherPlayers.length > 0) {
        const otherPlayer = otherPlayers[0];
        player2Info.querySelector('h3').textContent = otherPlayer.name || `Player ${otherPlayer.id}`;
        document.getElementById('p2-bullets').textContent = otherPlayer.bullets;
        document.getElementById('p2-moves').textContent = otherPlayer.moves;
        document.getElementById('p2-angle').textContent = Math.round(otherPlayer.angle);
        document.getElementById('p2-power').textContent = Math.round(otherPlayer.power);
        player2Info.style.display = 'block';
    } else {
        player2Info.style.display = 'none';
    }
}

function showMessage(text) {
    const messageEl = document.getElementById('game-message');
    messageEl.textContent = text;
    messageEl.classList.add('show');

    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (!myPlayerId) return;

    switch(e.key.toLowerCase()) {
        case 'a':
            sendAction({ type: 'move', direction: -1 });
            break;
        case 'd':
            sendAction({ type: 'move', direction: 1 });
            break;
        case 'w':
            sendAction({ type: 'adjustAngle', delta: 5 });
            break;
        case 's':
            sendAction({ type: 'adjustAngle', delta: -5 });
            break;
        case 'q':
            sendAction({ type: 'adjustPower', delta: -5 });
            break;
        case 'e':
            sendAction({ type: 'adjustPower', delta: 5 });
            break;
        case ' ':
            e.preventDefault();
            sendAction({ type: 'fire' });
            break;
    }
});

// Render loop
function gameLoop() {
    render();
    requestAnimationFrame(gameLoop);
}

// Initialize
connect();
gameLoop();
