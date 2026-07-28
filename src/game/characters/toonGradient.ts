import { DataTexture, RedFormat } from 'three'

let cached: DataTexture | null = null

/**
 * A small step ramp for MeshToonMaterial's `gradientMap` — without one, toon
 * material falls back to a smooth, standard-material-like shade (that's what
 * Phase 1's placeholder capsule used). This is what actually produces the
 * "Pixar-lite" cel-shaded banding the design doc asks for on the characters.
 * One shared texture, reused by every toon material in the scene.
 */
export function getToonGradientMap(): DataTexture {
  if (cached) return cached
  const bands = new Uint8Array([70, 130, 190, 255])
  const texture = new DataTexture(bands, bands.length, 1, RedFormat)
  texture.needsUpdate = true
  cached = texture
  return texture
}
