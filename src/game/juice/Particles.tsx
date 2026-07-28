import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import { getPool, POOL_SIZE } from './particles'

const GRAVITY = 9
const dummy = new Object3D()
const tmpColor = new Color()
const HIDDEN_Y = -9999

/** Renders the shared particle pool as one InstancedMesh — a single draw
 * call regardless of how many bursts are active, updated imperatively every
 * frame (matching this codebase's registry pattern) instead of one React
 * element per particle. */
export function Particles() {
  const meshRef = useRef<InstancedMesh>(null)

  useFrame((_state, rawDelta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const delta = Math.min(rawDelta, 1 / 30)
    const pool = getPool()

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i]
      if (p.active) {
        p.vy -= GRAVITY * delta
        p.x += p.vx * delta
        p.y += p.vy * delta
        p.z += p.vz * delta
        p.life -= delta
        if (p.life <= 0) p.active = false
      }

      if (p.active) {
        const t = p.life / p.maxLife
        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(0.06 + 0.05 * t)
        tmpColor.copy(p.color)
      } else {
        dummy.position.set(0, HIDDEN_Y, 0)
        dummy.scale.setScalar(0)
        tmpColor.setRGB(0, 0, 0)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, tmpColor)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, POOL_SIZE]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
