// Message shapes for the relay server (server/index.mjs). The server is
// plain JS and doesn't import these — kept in sync by convention, since it
// only ever reads/forwards a few known field names.

export interface JoinMessage {
  type: 'join'
  characterId: string
}

export interface InputMessage {
  type: 'input'
  moveX: number
  moveY: number
  jump: boolean
  dash: boolean
}

export interface StateMessage {
  type: 'state'
  // Authoritative position/facing (for drift correction) + race progress.
  // Speed/grounded aren't included — a NetworkRacer resimulates physics
  // locally from relayed input, so its own animation-facing telemetry
  // already has those, and echoing the sender's copy back would be redundant.
  position: [number, number, number]
  facingAngle: number
  checkpointIndex: number
  buttons: number
  finished: boolean
  finishOrder: number | null
}

export interface CharacterIdMessage {
  type: 'characterId'
  characterId: string
}

export interface StartMessage {
  type: 'start'
}

export type ClientMessage = JoinMessage | InputMessage | StateMessage | CharacterIdMessage | StartMessage

export interface WelcomeMessage {
  type: 'welcome'
  racerId: string
  peers: Array<{ racerId: string; characterId: string }>
}

export interface PeerJoinedMessage {
  type: 'peer-joined'
  racerId: string
  characterId: string
}

export interface PeerLeftMessage {
  type: 'peer-left'
  racerId: string
}

export interface PeerCharacterMessage {
  type: 'peer-character'
  racerId: string
  characterId: string
}

export interface RelayedInputMessage extends InputMessage {
  racerId: string
}

export interface RelayedStateMessage extends StateMessage {
  racerId: string
}

export type ServerMessage =
  | WelcomeMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | PeerCharacterMessage
  | RelayedInputMessage
  | RelayedStateMessage
  | StartMessage
