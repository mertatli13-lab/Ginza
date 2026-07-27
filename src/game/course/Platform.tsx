import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { PlatformSpec } from './courseData'

/** One static greybox piece: a colored box, with an explicit collider synced to it
 * (see the Ground fall-through fix in Phase 1 — auto-detected colliders can lag a
 * physics step behind the mesh, so every solid piece here declares its own). */
export function Platform({ position, size, rotation, color, collide = true }: PlatformSpec) {
  const mesh = (
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
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
