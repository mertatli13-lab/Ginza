import type { ClientMessage, ServerMessage } from './protocol'

// Local-testable relay only in this phase — not deployed anywhere, so this
// just points at the same machine the page was loaded from. Run it with
// `npm run server` alongside `npm run dev`. See README for the two-terminal
// setup and what a real deployment would need to change.
export const RELAY_URL = `ws://${typeof location !== 'undefined' ? location.hostname : 'localhost'}:8787`

type Listener = (msg: ServerMessage) => void

let socket: WebSocket | null = null
let listeners: Listener[] = []

export function openSocket(): WebSocket {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }
  const ws = new WebSocket(RELAY_URL)
  ws.onmessage = (event) => {
    let msg: ServerMessage
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }
    for (const listener of listeners) listener(msg)
  }
  socket = ws
  return ws
}

export function closeSocket() {
  socket?.close()
  socket = null
  listeners = []
}

export function onServerMessage(listener: Listener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function sendToServer(message: ClientMessage) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}
