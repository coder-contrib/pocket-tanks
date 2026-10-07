import { defineConfig } from 'vite'
import { spawn } from 'child_process'

// Plugin to start the WebSocket server
function startGameServer() {
  let serverProcess = null

  return {
    name: 'start-game-server',
    configureServer() {
      // Start the game server when Vite starts
      console.log('Starting WebSocket game server...')
      serverProcess = spawn('node', ['server.js'], {
        stdio: 'inherit',
        shell: true
      })

      serverProcess.on('error', (err) => {
        console.error('Failed to start game server:', err)
      })
    },
    closeBundle() {
      // Kill the server when Vite closes
      if (serverProcess) {
        serverProcess.kill()
      }
    }
  }
}

export default defineConfig({
  plugins: [startGameServer()],
  server: {
    port: 5173
  }
})
