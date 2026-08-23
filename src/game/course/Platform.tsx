import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { FloorSurface, PlatformSpec } from './courseTypes'
import { KeyboardKeys } from './KeyboardKeys'
import { JellySheen } from './JellySheen'

/** One static greybox piece: a colored box, with an explicit collider synced to it
 * (see the Ground fall-through fix in Phase 1 — auto-detected colliders can lag a
 * physics step behind the mesh, so every solid piece here declares its own).
 * `floorSurface` is only ever passed for entries in `course.platforms` (the
 * actual floor/ramp pieces) — rails and decor render the plain box below,
 * same as always. */
export function Platform({
  position,
  size,
  rotation,
  color,
  collide = true,
  floorSurface,
}: PlatformSpec & { floorSurface?: FloorSurface }) {
  const mesh = (
    <>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
      {floorSurface === 'keyboard' && <KeyboardKeys size={size} />}
      {floorSurface === 'jelly' && <JellySheen size={size} color={color} />}
    </>
  )

  if (!collide) {
    return (
      <group position={position} rotation={rotation}>
        {mesh}
      </group>
    )
  }

  const halfExtents: [number, number, number] = [size[0] / 2, size[1] / 2, size[2] / 2]
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false} friction={0.8}>
      <CuboidCollider args={halfExtents} />
      {mesh}
    </RigidBody>
  )
}
