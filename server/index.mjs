import { WebSocketServer } from 'ws'

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787

// One global room — this game ships with exactly one course, so there's
// nothing to matchmake into yet. Every connected client races together.
// Purely a relay: no server-side physics or race logic, no persistence.
// Each client resimulates every racer's physics locally from relayed input,
// matching the design doc's swappable {moveX, moveY, jump, dash} input
// interface — the server only needs to know who's connected and forward
// messages, never touch game state itself.
const clients = new Map() // ws -> { racerId, characterId }

function shortId() {
  return `net-${Math.random().toString(36).slice(2, 8)}`
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message))
}

function broadcast(message, exclude) {
  const payload = JSON.stringify(message)
  for (const ws of clients.keys()) {
    if (ws === exclude) continue
    if (ws.readyState === ws.OPEN) ws.send(payload)
  }
}

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    if (msg.type === 'join') {
      const racerId = shortId()
      const characterId = msg.characterId === 'strawberry' ? 'strawberry' : 'ginza'
      clients.set(ws, { racerId, characterId })
      send(ws, {
        type: 'welcome',
        racerId,
        peers: [...clients.values()]
          .filter((c) => c.racerId !== racerId)
          .map((c) => ({ racerId: c.racerId, characterId: c.characterId })),
      })
      broadcast({ type: 'peer-joined', racerId, characterId }, ws)
      return
    }

    // Everything below requires having joined first, so the server always
    // knows which racerId to tag relayed messages with.
    const self = clients.get(ws)
    if (!self) return

    if (msg.type === 'input') {
      broadcast(
        { type: 'input', racerId: self.racerId, moveX: msg.moveX, moveY: msg.moveY, jump: msg.jump, dash: msg.dash },
        ws,
      )
    } else if (msg.type === 'state') {
      broadcast({ ...msg, racerId: self.racerId }, ws)
    } else if (msg.type === 'characterId') {
      self.characterId = msg.characterId === 'strawberry' ? 'strawberry' : 'ginza'
      broadcast({ type: 'peer-character', racerId: self.racerId, characterId: self.characterId }, ws)
    } else if (msg.type === 'start') {
      // No host/authority — whoever clicks Start tells everyone (including
      // themselves, via this same broadcast) to begin.
      broadcast({ type: 'start' })
    }
  })

  ws.on('close', () => {
    const self = clients.get(ws)
    clients.delete(ws)
    if (self) broadcast({ type: 'peer-left', racerId: self.racerId })
  })
})

console.log(`Plushopolis relay server listening on ws://localhost:${PORT}`)
