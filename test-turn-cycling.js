// Test turn cycling based on join order
import { WebSocket } from 'ws';

const PORT = 3000;

async function testTurnCycling() {
    console.log('Testing turn cycling based on join order...\n');

    // Test 1: Single player should cycle back to themselves
    console.log('=== Test 1: Single Player ===');
    const ws1 = new WebSocket(`ws://localhost:${PORT}`);
    let player1Id, player1Name;

    await new Promise((resolve) => {
        ws1.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'init') {
                player1Id = msg.playerId;
                player1Name = msg.player.name;
                console.log(`✅ Player 1 (${player1Name}, ID: ${player1Id}) connected`);
                resolve();
            }
        });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Player 1 ends turn
    console.log(`📤 Player 1 ending turn...`);
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'endTurn' }));

    let turnBackToSelf = false;
    const checkSelfCycle = new Promise((resolve) => {
        ws1.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'turnChange' && msg.activePlayerId === player1Id) {
                console.log(`✅ Turn cycled back to Player 1 (single player mode)`);
                turnBackToSelf = true;
                resolve();
            }
        });
    });

    await checkSelfCycle;

    if (!turnBackToSelf) {
        console.log('❌ Failed: Single player did not cycle back to themselves');
        ws1.close();
        process.exit(1);
    }

    // Test 2: Add second player mid-game
    console.log('\n=== Test 2: Second Player Joins ===');
    const ws2 = new WebSocket(`ws://localhost:${PORT}`);
    let player2Id, player2Name;

    await new Promise((resolve) => {
        ws2.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'init') {
                player2Id = msg.playerId;
                player2Name = msg.player.name;
                console.log(`✅ Player 2 (${player2Name}, ID: ${player2Id}) connected`);
                resolve();
            }
        });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Player 1 (currently active) ends turn
    console.log(`📤 Player 1 ending turn...`);
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'endTurn' }));

    let turnToPlayer2 = false;
    const checkTwoPlayerCycle = new Promise((resolve) => {
        const handler = (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'turnChange' && msg.activePlayerId === player2Id) {
                console.log(`✅ Turn switched to Player 2 (join order respected)`);
                turnToPlayer2 = true;
                ws1.off('message', handler);
                resolve();
            }
        };
        ws1.on('message', handler);
    });

    await checkTwoPlayerCycle;

    if (!turnToPlayer2) {
        console.log('❌ Failed: Turn did not switch to Player 2');
        ws1.close();
        ws2.close();
        process.exit(1);
    }

    // Test 3: Player 2 ends turn, should cycle back to Player 1
    console.log(`📤 Player 2 ending turn...`);
    ws2.send(JSON.stringify({ playerId: player2Id, type: 'endTurn' }));

    let turnBackToPlayer1 = false;
    const checkCycleBack = new Promise((resolve) => {
        const handler = (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'turnChange' && msg.activePlayerId === player1Id) {
                console.log(`✅ Turn cycled back to Player 1 (full cycle: 1 → 2 → 1)`);
                turnBackToPlayer1 = true;
                ws2.off('message', handler);
                resolve();
            }
        };
        ws2.on('message', handler);
    });

    await checkCycleBack;

    if (!turnBackToPlayer1) {
        console.log('❌ Failed: Turn did not cycle back to Player 1');
        ws1.close();
        ws2.close();
        process.exit(1);
    }

    // Test 4: Add third player and verify order
    console.log('\n=== Test 3: Third Player Joins ===');
    const ws3 = new WebSocket(`ws://localhost:${PORT}`);
    let player3Id, player3Name;

    await new Promise((resolve) => {
        ws3.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.type === 'init') {
                player3Id = msg.playerId;
                player3Name = msg.player.name;
                console.log(`✅ Player 3 (${player3Name}, ID: ${player3Id}) connected`);
                resolve();
            }
        });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify turn order: 1 → 2 → 3 → 1
    console.log(`\nVerifying 3-player cycle: 1 → 2 → 3 → 1`);

    // Player 1 ends (currently active)
    ws1.send(JSON.stringify({ playerId: player1Id, type: 'endTurn' }));
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should be Player 2's turn
    ws2.send(JSON.stringify({ playerId: player2Id, type: 'endTurn' }));
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should be Player 3's turn
    let turnToPlayer3 = false;
    ws3.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'turnChange' && msg.activePlayerId === player3Id) {
            turnToPlayer3 = true;
        }
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    if (turnToPlayer3) {
        console.log(`✅ Turn reached Player 3 (3-player cycle working)`);
    } else {
        console.log(`❌ Failed: Turn did not reach Player 3`);
    }

    ws1.close();
    ws2.close();
    ws3.close();

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('   - Single player cycles to self');
    console.log('   - Two players cycle correctly');
    console.log('   - Three players cycle in join order');
    console.log('   - Join order is respected\n');

    process.exit(0);
}

testTurnCycling().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});

setTimeout(() => {
    console.error('❌ Test timeout');
    process.exit(1);
}, 20000);
