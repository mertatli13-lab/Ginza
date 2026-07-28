import { useNetworkStore } from '../../net/networkStore'
import { useFlowStore } from '../flow/flowStore'
import { leaveOnlineRace, requestStart } from '../../net/networkClient'

const CHARACTER_LABEL: Record<string, string> = { ginza: 'Ginza', strawberry: 'Strawberry' }

/** Waiting room for online mode: shows who's connected to the relay server
 * (server/index.mjs, run separately via `npm run server`) and lets anyone
 * present start the race for the whole group — there's no host/authority,
 * "Start Race" just asks the server to tell every connected client to go. */
export function OnlineLobby() {
  const status = useNetworkStore((s) => s.status)
  const peers = useNetworkStore((s) => s.peers)
  const selectedCharacter = useFlowStore((s) => s.selectedCharacter)
  const returnToCharacterSelect = useFlowStore((s) => s.returnToCharacterSelect)

  const handleBack = () => {
    leaveOnlineRace()
    returnToCharacterSelect()
  }

  const handleStart = () => {
    // Broadcasting 'start' is enough — every connected client (including
    // this one, via the server echoing it back) resets and transitions to
    // racing symmetrically; see networkClient.ts's 'start' handler.
    requestStart()
  }

  return (
    <div className="menu-overlay">
      <div className="menu-card">
        <h2 className="menu-heading">Online Lobby</h2>
        <p className="lobby-status">
          {status === 'connecting' && 'Connecting to the relay server...'}
          {status === 'connected' &&
            `${peers.length + 1} racer${peers.length === 0 ? '' : 's'} ready`}
          {status === 'error' && "Couldn't reach the relay server — is it running? (npm run server)"}
        </p>
        <ul className="lobby-roster">
          <li>You — {CHARACTER_LABEL[selectedCharacter]}</li>
          {peers.map((peer) => (
            <li key={peer.racerId}>{CHARACTER_LABEL[peer.characterId]}</li>
          ))}
        </ul>
        <div className="podium-actions">
          <button type="button" className="podium-btn" onClick={handleBack}>
            Back
          </button>
          <button
            type="button"
            className="podium-btn podium-btn-primary"
            onClick={handleStart}
            disabled={status !== 'connected'}
          >
            Start Race
          </button>
        </div>
      </div>
    </div>
  )
}
