# Game mode artwork

Emblems for the four game-mode cards: `classic`, `blitz`, `survival`,
`odd_one_out`.

Modes can be filled in one at a time — anything still unregistered falls back to
its Phosphor mark on the same plate, so a half-finished set looks deliberate
rather than broken.

## SVG (preferred)

`react-native-svg` is already a dependency. A vector emblem stays crisp at every
size, tints to the mode's accent color, ships as one file instead of an
`@1x/@2x/@3x` set, and costs a few KB.

Author the emblem as a component taking `{ size, color }`:

```tsx
// assets/game-modes/ClassicEmblem.tsx
import Svg, { Path } from 'react-native-svg'
import type { ModeArtworkSvgProps } from '../../src/components/ui/GameModeArtwork'

export default function ClassicEmblem({ size, color }: ModeArtworkSvgProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="…" fill={color} />
    </Svg>
  )
}
```

Register it in `src/components/ui/GameModeArtwork.tsx`:

```tsx
import ClassicEmblem from '../../../assets/game-modes/ClassicEmblem'

const MODE_ARTWORK: Record<GameModeId, ModeArtwork | null> = {
  classic: svgArtwork(ClassicEmblem),
  blitz: null,
  survival: null,
  odd_one_out: null,
}
```

`.svg` files can't be imported directly — run them through
[SVGR](https://react-svgr.com) to get the component above.

## Raster

Where a vector is impractical. Square, transparent background; 1x at least
48×48, `@3x` at least 144×144.

```
classic.png  classic@2x.png  classic@3x.png
```

```tsx
classic: imageArtwork(require('../../../assets/game-modes/classic.png')),
```

Paths must be literal — a computed `require(...)` breaks Metro and web bundling.

## Drawing notes

- **Design at 48px first**, then scale up. The card renders at 48; `mode-intro`
  can host the same emblem around 120. Small-up catches mush that large-down
  hides.
- **Design on the plate**, not on white — `#1a1a2e` under the mode's accent
  gradient. These are judged in a dark UI.
- **Match Phosphor's optical weight**, or emblems look heavy beside every other
  icon on screen.
- Keep the mode's accent color dominant so art and plate gradient agree:
  classic `#6c63ff`, blitz `#FFD700`, survival `#F44336`, odd one out `#10B981`.
- Art fills the full plate; the plate supplies the border, gradient, and top
  highlight underneath.

## Licensing

Only original artwork, or assets whose license permits redistribution. If a set
requires attribution (OpenMoji, Twemoji, and similar), record the license and
the required credit here **before** adding it — the app currently ships no
third-party icon assets and therefore carries no attribution obligation.
