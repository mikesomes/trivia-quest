/**
 * Small color helpers for composing tints against the app's dark surfaces.
 *
 * Layering translucent color over `surface0` is unpredictable — the result
 * depends on whatever happens to be behind it, and stacked alphas go muddy
 * fast. These return opaque hex instead, so a tint reads the same wherever it
 * lands.
 */

/** `#rgb` or `#rrggbb` → `[r, g, b]`, each 0–255. */
function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
}

/** Blend two colors in sRGB. `t` of 0 returns `from`, 1 returns `to`. */
export function mix(from: string, to: string, t: number): string {
  const a = parse(from)
  const b = parse(to)
  const k = Math.max(0, Math.min(1, t))
  return `#${a.map((v, i) => toHex(v + (b[i] - v) * k)).join('')}`
}

/** The same color at a given opacity, as `rgba()`. */
export function withAlpha(hex: string, opacity: number): string {
  const [r, g, b] = parse(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, opacity))})`
}
