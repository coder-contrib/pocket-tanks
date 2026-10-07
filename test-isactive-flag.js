// Test that player receives isActive: true in turnChange
import { WebSocket } from 'ws';

const PORT = 3000;

async function testIsActiveFlag() {
    console.log('Testing isActive flag in player data...\n');

    const ws = new WebSocket(`ws://localhost:${PORT}`);
    let playerId, playerName;
    let receivedActiveTrue = false;

    const promise = new Promise((resolve, reject) => {
        ws.on('message', (data) => {
            const msg = JSON.parse(data);

            if (msg.type === 'init') {
                playerId = msg.playerId;
                playerName = msg.player.name;
                console.log(`✅ Player connected: ${playerName} (ID: ${playerId})`);
                console.log(`   isActive in init: ${msg.player.isActive}`);
            }

            if (msg.type === 'turnChange') {
                console.log(`\n🔄 Received turnChange:`);
                console.log(`   activePlayerId: ${msg.activePlayerId}`);
                console.log(`   players array included: ${!!msg.players}`);

                if (msg.players) {
                    const myPlayer = msg.players.find(p => p.id === playerId);
                    console.log(`   My player in array: ${!!myPlayer}`);
                    if (myPlayer) {
                        console.log(`   myPlayer.isActive: ${myPlayer.isActive}`);
                        if (myPlayer.isActive === true) {
                            receivedActiveTrue = true;
                            console.log(`\n✅ SUCCESS! Received isActive: true in player data`);
                            resolve();
                        } else {
                            console.log(`\n❌ FAILED! Received isActive: ${myPlayer.isActive}`);
                            reject(new Error('isActive is not true'));
                        }
                    }
                } else {
                    console.log(`   WARNING: No players array in turnChange message`);
                }
            }
        });

        ws.on('error', (err) => {
            reject(err);
        });

        setTimeout(() => {
            if (!receivedActiveTrue) {
                console.log('\n❌ TIMEOUT: Never received isActive: true');
                reject(new Error('Timeout'));
            }
        }, 3000);
    });

    try {
        await promise;
        ws.close();
        console.log('\nPlayer should now be able to use keyboard controls!');
        process.exit(0);
    } catch (err) {
        ws.close();
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    }
}

testIsActiveFlag();
