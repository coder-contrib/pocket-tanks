# Pocket Tanks - Turn System Documentation

## Turn Cycling

Turns cycle based on **player join order** using player IDs:

### Join Order = Turn Order

Players are assigned sequential IDs when they connect:
- First player: ID 1
- Second player: ID 2  
- Third player: ID 3
- And so on...

Turns cycle through players in this order using modulo arithmetic:
```
nextPlayer = (currentPlayerIndex + 1) % totalPlayers
```

### Examples

**1 Player (Solo Mode)**
```
Player 1 joins
Turn: 1 → 1 → 1 → 1...
(Cycles back to self each turn)
```

**2 Players**
```
Player 1 joins
Player 2 joins
Turn: 1 → 2 → 1 → 2 → 1...
```

**3 Players**
```
Player 1 joins
Player 2 joins
Player 3 joins
Turn: 1 → 2 → 3 → 1 → 2 → 3...
```

**4+ Players**
```
Players join in sequence
Turn: 1 → 2 → 3 → 4 → 5 → 1 → 2...
```

### Dynamic Join/Leave

**Player Joins Mid-Game**
```
Game starts: Player 1 solo
Turn: 1 → 1 → 1

Player 2 joins
Turn: 1 → 2 → 1 → 2

Player 3 joins  
Turn: 1 → 2 → 3 → 1 → 2 → 3
```

**Player Leaves**
```
Playing: 1 → 2 → 3
Player 2 leaves (during any turn)
Turn: 1 → 3 → 1 → 3
(Player 2 removed, cycle adjusts)
```

**Active Player Leaves**
```
Player 2's turn
Player 2 disconnects
→ Turn immediately switches to Player 3
(No stuck turns)
```

## Resource Reset

Every turn, the active player gets **fresh resources**:
- **5 bullets** (can fire 5 times)
- **4 moves** (can move 4 times)

This happens automatically when their turn starts, regardless of what they had left from their previous turn.

### Example
```
Turn 1: Player 1
  Start: 5 bullets, 4 moves
  Uses: 2 bullets, 3 moves
  Ends: 3 bullets, 1 move remaining

Turn 2: Player 2
  Start: 5 bullets, 4 moves (RESET!)

Turn 3: Player 1  
  Start: 5 bullets, 4 moves (RESET! Not 3, 1)
```

## Turn End Conditions

A turn can end in three ways:

### 1. Manual End (U key)
Press **U** to end your turn at any time.

### 2. Auto-End (Resources Depleted)
Turn automatically ends when:
- Bullets = 0 **AND**
- Moves = 0

### 3. Disconnect
If the active player disconnects, turn immediately switches to the next player.

## Turn Indicators

### Visual Feedback

**Top Banner (Pulsing)**
- "YOUR TURN - Press U to end turn" (when active)
- "No bullets/moves left - Press U to end turn" (when depleted)

**Current Turn Display**
- "Current Turn: YOU" (your turn, bold)
- "Current Turn: [Player Name]" (other player's turn)

**Player Panels**
- Active player panel glows (bright border + glow effect)
- Inactive players are dimmed (50% opacity)

**On Canvas**
- Active tank: single dashed border (5px spacing)
- Your tank: double dashed border (3px spacing)
- Player names shown above tanks

### Notifications

```
"Your turn! (5 bullets, 4 moves)"
"Tank Commander's turn"
"Artillery Ace ran out of resources"
"Out of bullets and moves! Turn ended."
```

## Solo Play

The game fully supports **single-player mode**:
- Open one browser tab
- You get a turn
- Press U or use all resources
- Turn cycles back to you with fresh resources
- Practice and test weapons!

## Multiplayer

- **2+ players**: Turns rotate in join order
- **Real-time**: New players join the cycle immediately
- **Dynamic**: Players leaving are removed from cycle
- **Fair**: Everyone gets equal turn order position

## Testing

Test the turn system:

```bash
npm run test:cycling   # Test turn cycling logic
npm run test:turn      # Test manual turn switching
npm run test:resources # Test resource reset
```

All turn mechanics are fully tested and working!
