import { useMemo, useRef, useLayoutEffect } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'

const KEY_SIZE = 0.42
const KEY_GAP = 0.1
const STEP = KEY_SIZE + KEY_GAP
const KEY_HEIGHT = 0.12
// Cream/grey/darker-grey — reads as an ordinary keyboard rather than any
// one section's original palette, since this replaces that palette outright.
const KEY_COLORS = ['#f4f1ea', '#e3ded0', '#d3cdbc']

const dummy = new Object3D()

/** A tiled grid of keycaps sitting on top of a floor/ramp platform — purely
 * decorative (the platform's own collider underneath is unchanged, so
 * physics never sees individual keys), one InstancedMesh per platform piece
 * so even a long floor is a single draw call. `size` is the platform's own
 * local [width, thickness, length]; keys are laid out across width x length
 * and sit just above its top face, inheriting whatever position/rotation
 * the parent group already applies (so a keyboard floor on a ramp tilts
 * with it for free). */
export function KeyboardKeys({ size }: { size: [number, number, number] }) {
  const meshRef = useRef<InstancedMesh>(null)
  const { cols, rows, count } = useMemo(() => {
    const cols = Math.max(1, Math.floor(size[0] / STEP))
    const rows = Math.max(1, Math.floor(size[2] / STEP))
    return { cols, rows, count: cols * rows }
  }, [size])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -size[0] / 2 + STEP / 2 + c * STEP
        const z = -size[2] / 2 + STEP / 2 + r * STEP
        dummy.position.set(x, size[1] / 2 + KEY_HEIGHT / 2, z)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        mesh.setColorAt(i, new Color(KEY_COLORS[(r * cols + c + r) % KEY_COLORS.length]))
        i++
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [cols, rows, size])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <boxGeometry args={[KEY_SIZE, KEY_HEIGHT, KEY_SIZE]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}
