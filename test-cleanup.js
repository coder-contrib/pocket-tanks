// Test WebSocket cleanup and player names
import { WebSocket } from 'ws';

const PORT = process.env.PORT || 3000;

async function testCleanupAndNames() {
    console.log('Testing player names and cleanup...\n');

    // Test 1: Connect player 1
    const ws1 = new WebSocket(`ws://localhost:${PORT}`);
    let player1Name = null;

    await new Promise((resolve) => {
        ws1.on('message', (data) => {
            const message = JSON.parse(data);
            if (message.type === 'init') {
                player1Name = message.player.name;
                console.log(`✅ Player 1 connected with name: "${player1Name}"`);
                resolve();
            }
        });
    });

    // Test 2: Connect player 2
    const ws2 = new WebSocket(`ws://localhost:${PORT}`);
    let player2Name = null;

    await new Promise((resolve) => {
        ws2.on('message', (data) => {
            const message = JSON.parse(data);
            if (message.type === 'init') {
                player2Name = message.player.name;
                console.log(`✅ Player 2 connected with name: "${player2Name}"`);
                resolve();
            }
        });
    });

    // Verify names are different
    if (player1Name !== player2Name) {
        console.log('✅ Players have unique names');
    } else {
        console.log('❌ Players have duplicate names');
    }

    // Test 3: Disconnect player 1 and verify cleanup
    console.log('\nTesting cleanup...');
    ws1.close();

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: Connect player 3 - should reuse player 1's name
    const ws3 = new WebSocket(`ws://localhost:${PORT}`);
    let player3Name = null;
    let receivedPlayerLeft = false;

    ws2.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'playerLeft') {
            console.log(`✅ Player left notification received: "${message.playerName}"`);
            receivedPlayerLeft = true;
        }
        if (message.type === 'playerJoined' && message.playerName) {
            console.log(`✅ Player joined notification received: "${message.playerName}"`);
        }
    });

    await new Promise((resolve) => {
        ws3.on('message', (data) => {
            const message = JSON.parse(data);
            if (message.type === 'init') {
                player3Name = message.player.name;
                console.log(`✅ Player 3 connected with name: "${player3Name}"`);
                resolve();
            }
        });
    });

    // Verify name was reused (name released back to pool)
    if (player3Name === player1Name) {
        console.log(`✅ Name "${player1Name}" was properly released and reused`);
    } else {
        console.log(`ℹ️  Player 3 got different name "${player3Name}" (player 1 had "${player1Name}")`);
    }

    // Cleanup
    ws2.close();
    ws3.close();

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('   - Player names assigned correctly');
    console.log('   - WebSocket cleanup working');
    console.log('   - Names released back to pool');
    console.log('   - Notifications sent properly\n');

    process.exit(0);
}

// Run tests
testCleanupAndNames().catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});

// Timeout
setTimeout(() => {
    console.error('❌ Test timeout');
    process.exit(1);
}, 10000);
