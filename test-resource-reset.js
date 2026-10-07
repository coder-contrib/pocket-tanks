// Test resource reset on turn change
import { WebSocket } from 'ws';

const PORT = 3000;

async function testResourceReset() {
    console.log('Testing resource reset on turn change...\n');

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
                console.log(`✅ Player 1 (${player1Name}) connected`);
                console.log(`   Initial: ${msg.player.bullets} bullets, ${msg.player.moves} moves`);
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
                console.log(`✅ Player 2 (${player2Name}) connected`);
                resolve();
            }
        });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Player 1 uses some resources
    console.log(`\n📤 Player 1 using resources...`);
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'fire' }));
    await new Promise(resolve => setTimeout(resolve, 200));
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'move', direction: 1 }));
    await new Promise(resolve => setTimeout(resolve, 200));
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'move', direction: 1 }));

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check resources before ending turn
    let player1ResourcesBefore = { bullets: 0, moves: 0 };
    ws1.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'update') {
            const p1 = msg.players.find(p => p.id === player1Id);
            if (p1) {
                player1ResourcesBefore = { bullets: p1.bullets, moves: p1.moves };
            }
        }
    });

    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`   After using: ${player1ResourcesBefore.bullets} bullets, ${player1ResourcesBefore.moves} moves`);

    // End turn
    console.log(`\n📤 Player 1 ending turn...`);
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'endTurn' }));

    // Wait for turn change and resource reset
    let resourcesReset = false;
    const checkReset = new Promise((resolve) => {
        ws2.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'turnChange' && msg.players) {
                const p2 = msg.players.find(p => p.id === player2Id);
                if (p2 && p2.isActive) {
                    console.log(`🔄 Turn changed to Player 2`);
                    console.log(`   Player 2 resources: ${p2.bullets} bullets, ${p2.moves} moves`);
                    if (p2.bullets === 5 && p2.moves === 4) {
                        resourcesReset = true;
                    }
                }

                // Also check that player 1's resources haven't been touched
                const p1 = msg.players.find(p => p.id === player1Id);
                if (p1) {
                    console.log(`   Player 1 still has: ${p1.bullets} bullets, ${p1.moves} moves`);
                }
                resolve();
            }
        });
    });

    await checkReset;
    await new Promise(resolve => setTimeout(resolve, 500));

    if (resourcesReset) {
        console.log(`\n✅ SUCCESS! Player 2's resources were reset to 5 bullets, 4 moves`);
    } else {
        console.log(`\n❌ FAILED! Player 2's resources were not reset properly`);
    }

    // Now end Player 2's turn and check Player 1's resources get reset
    console.log(`\n📤 Player 2 ending turn...`);
    ws2.send(JSON.stringify({ playerId: player2Id, type: 'endTurn' }));

    const checkP1Reset = new Promise((resolve) => {
        ws1.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'turnChange' && msg.players) {
                const p1 = msg.players.find(p => p.id === player1Id);
                if (p1 && p1.isActive) {
                    console.log(`🔄 Turn changed back to Player 1`);
                    console.log(`   Player 1 resources: ${p1.bullets} bullets, ${p1.moves} moves`);
                    if (p1.bullets === 5 && p1.moves === 4) {
                        console.log(`\n✅ SUCCESS! Player 1's resources were reset from (${player1ResourcesBefore.bullets}, ${player1ResourcesBefore.moves}) to (5, 4)`);
                    } else {
                        console.log(`\n❌ FAILED! Player 1's resources not reset properly`);
                    }
                    resolve();
                }
            }
        });
    });

    await checkP1Reset;

    ws1.close();
    ws2.close();
    process.exit(0);
}

testResourceReset().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});

setTimeout(() => {
    console.error('❌ Test timeout');
    process.exit(1);
}, 15000);
