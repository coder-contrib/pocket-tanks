// Test turn switching with U key
import { WebSocket } from 'ws';

const PORT = 3000;

async function testTurnSwitch() {
    console.log('Testing turn switching with U key...\n');

    const ws1 = new WebSocket(`ws://localhost:${PORT}`);
    const ws2 = new WebSocket(`ws://localhost:${PORT}`);

    let player1Id, player2Id;
    let player1Name, player2Name;

    // Player 1 connects
    await new Promise((resolve) => {
        ws1.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'init') {
                player1Id = msg.playerId;
                player1Name = msg.player.name;
                console.log(`✅ Player 1 (${player1Name}) connected - ID: ${player1Id}`);
                resolve();
            }
        });
    });

    // Player 2 connects
    await new Promise((resolve) => {
        ws2.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'init') {
                player2Id = msg.playerId;
                player2Name = msg.player.name;
                console.log(`✅ Player 2 (${player2Name}) connected - ID: ${player2Id}`);
                resolve();
            }
        });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check who's active first
    let activePlayerId = null;
    ws1.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'turnChange') {
            console.log(`🔄 Turn changed to player ${msg.activePlayerId}`);
            activePlayerId = msg.activePlayerId;
        }
        if (msg.type === 'update') {
            const active = msg.players.find(p => p.isActive);
            if (active) {
                console.log(`   Active player: ${active.name} (ID: ${active.id})`);
            }
        }
    });

    ws2.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'turnChange') {
            console.log(`🔄 Turn changed to player ${msg.activePlayerId}`);
            activePlayerId = msg.activePlayerId;
        }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Now send endTurn from player 1 (who should be active)
    console.log(`\n📤 Player 1 sending endTurn...`);
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'endTurn' }));

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (activePlayerId === player2Id) {
        console.log(`\n✅ SUCCESS! Turn switched from Player 1 to Player 2`);
    } else {
        console.log(`\n❌ FAILED! Active player is still: ${activePlayerId}`);
    }

    ws1.close();
    ws2.close();
    process.exit(0);
}

testTurnSwitch().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});

setTimeout(() => {
    console.error('❌ Test timeout');
    process.exit(1);
}, 10000);
