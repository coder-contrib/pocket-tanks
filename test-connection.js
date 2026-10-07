// Simple WebSocket test client
import { WebSocket } from 'ws';

const PORT = process.env.PORT || 3000;
const ws1 = new WebSocket(`ws://localhost:${PORT}`);
let player1Id = null;

ws1.on('open', () => {
    console.log('Player 1 connected');
});

ws1.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Player 1 received:', message.type);

    if (message.type === 'init') {
        player1Id = message.playerId;
        console.log(`  Player 1 ID: ${player1Id}`);

        // Connect second player after first is initialized
        setTimeout(() => {
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);

            ws2.on('open', () => {
                console.log('Player 2 connected');
            });

            ws2.on('message', (data) => {
                const message = JSON.parse(data);
                console.log('Player 2 received:', message.type);

                if (message.type === 'init') {
                    console.log(`  Player 2 ID: ${message.playerId}`);
                    console.log('\n✅ WebSocket multiplayer test PASSED!');
                    console.log('   - Both players connected successfully');
                    console.log('   - Received initial game state');
                    console.log('   - Server is ready for gameplay\n');

                    // Clean up
                    setTimeout(() => {
                        ws1.close();
                        ws2.close();
                        process.exit(0);
                    }, 500);
                }
            });
        }, 500);
    }
});

ws1.on('error', (error) => {
    console.error('WebSocket error:', error);
    process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.error('❌ Test timeout - server may not be running');
    process.exit(1);
}, 5000);
