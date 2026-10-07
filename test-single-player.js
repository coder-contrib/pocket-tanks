// Test single player activation
import { WebSocket } from 'ws';

const PORT = 3000;

async function testSinglePlayer() {
    console.log('Testing single player activation...\n');

    const ws = new WebSocket(`ws://localhost:${PORT}`);
    let playerId, playerName;
    let isActive = false;

    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        if (msg.type === 'init') {
            playerId = msg.playerId;
            playerName = msg.player.name;
            console.log(`✅ Player connected: ${playerName} (ID: ${playerId})`);
            console.log(`   Initial isActive: ${msg.player.isActive}`);

            if (msg.player.isActive) {
                isActive = true;
                console.log(`✅ Player is ACTIVE immediately on init`);
            }
        }

        if (msg.type === 'turnChange') {
            console.log(`🔄 Received turnChange: activePlayerId = ${msg.activePlayerId}`);
            if (msg.players) {
                const me = msg.players.find(p => p.id === playerId);
                if (me && me.isActive) {
                    isActive = true;
                    console.log(`✅ Player is ACTIVE from turnChange`);
                }
            } else if (msg.activePlayerId === playerId) {
                isActive = true;
                console.log(`✅ Player is ACTIVE (from activePlayerId)`);
            }
        }
    });

    // Wait for connection and activation
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (isActive) {
        console.log(`\n✅ SUCCESS! Single player was activated`);
        console.log(`   Player can see "Current Turn: YOU" instead of "Waiting..."`);
    } else {
        console.log(`\n❌ FAILED! Single player was NOT activated`);
        console.log(`   Player will be stuck on "Current Turn: Waiting..."`);
    }

    ws.close();
    process.exit(isActive ? 0 : 1);
}

testSinglePlayer().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});

setTimeout(() => {
    console.error('❌ Test timeout');
    process.exit(1);
}, 5000);
