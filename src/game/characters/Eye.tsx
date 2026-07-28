/** Big glossy eye: white sclera + dark pupil + a small offset highlight dot —
 * the "big expressive eyes" / "wide sparkly eyes" both characters call for. */
export function Eye({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.13 * size, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.08 * size]}>
        <sphereGeometry args={[0.075 * size, 14, 14]} />
        <meshStandardMaterial color="#241033" roughness={0.4} />
      </mesh>
      <mesh position={[0.035 * size, 0.045 * size, 0.135 * size]}>
        <sphereGeometry args={[0.028 * size, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}
