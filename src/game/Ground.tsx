import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Grid } from '@react-three/drei'

/** Bare grey plane for Phase 1 — real course geometry arrives in Phase 2. */
export function Ground() {
  return (
    <RigidBody type="fixed" friction={1} colliders={false}>
      {/* Explicit collider (not auto-detected from the mesh) so it exists on
          the very first physics step — mesh-derived auto colliders can lag
          a frame behind, letting a fast-falling body tunnel through first. */}
      <CuboidCollider args={[100, 0.5, 100]} position={[0, -0.5, 0]} />
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[200, 1, 200]} />
        <meshStandardMaterial color="#3a3d46" />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#5a5f6b"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#7d8494"
        fadeDistance={80}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
    </RigidBody>
  )
}
