# Troubleshooting Keyboard Input

If keyboard controls aren't working, follow these steps:

## 1. Open Browser Console

**Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
**Firefox:** Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
**Safari:** Enable Developer menu in Preferences, then press `Cmd+Option+I`

## 2. Check for Debug Messages

When you press a key, you should see in the console:

**If input is working:**
```
[DEBUG] It's my turn! myPlayerId: 1 isActive: true
```

**If input is blocked:**
```
[INPUT] Blocked - myPlayer: {id: 1, ...} isActive: false myPlayerId: 1
```

## 3. Common Issues

### Issue: "Waiting..." stuck
**Symptoms:** Game shows "Current Turn: Waiting..." even in solo play
**Fix:** This was fixed - refresh the page

### Issue: Input blocked with `isActive: false`
**Symptoms:** Console shows player exists but `isActive: false`
**Cause:** Turn change message not processed correctly
**Fix:** 
1. Press U to manually end turn (if it was your turn before)
2. Refresh the page
3. Check server logs for errors

### Issue: `myPlayer: undefined`
**Symptoms:** Console shows `myPlayer: undefined`
**Cause:** Player not in `gameState.players` array
**Fix:**
1. Wait for connection to establish
2. Check Network tab for WebSocket connection
3. Refresh the page

### Issue: `myPlayerId: null`
**Symptoms:** Console shows `myPlayerId: null`
**Cause:** Init message not received
**Fix:**
1. Check WebSocket connection in Network tab
2. Ensure server is running
3. Refresh the page

### Issue: Keys not registering at all
**Symptoms:** No console messages when pressing keys
**Cause:** Browser focus not on game window
**Fix:**
1. Click somewhere on the game canvas
2. Make sure browser window is focused
3. Check if another application is capturing keyboard

## 4. Verify Server Connection

In the console, check for:
```
Connected to server
You are [Player Name]!
```

If you see:
```
Disconnected from server
```
Then the WebSocket connection failed.

## 5. Manual Test

Open: `http://localhost:5173/input-test.html`

This simple page will show every keypress. If keys show up here but not in the game, the issue is with the game logic. If keys don't show up, it's a browser/focus issue.

## 6. Force Debug Mode

In browser console, type:
```javascript
console.log('myPlayerId:', myPlayerId);
console.log('gameState:', gameState);
console.log('players:', gameState.players);
```

This will show current game state.

## 7. Still Not Working?

Check:
1. Server is running: `npm start`
2. Browser at correct URL: `http://localhost:5173`
3. WebSocket connection shows in Network tab (WS filter)
4. No browser extensions blocking input
5. Game window has focus (click on it)

If all else fails, restart everything:
```bash
# Kill server
pkill -f "node server.js"

# Restart
npm start

# Refresh browser (Ctrl+R or Cmd+R)
```
