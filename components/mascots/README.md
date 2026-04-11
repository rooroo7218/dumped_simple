# DUMPED Mascots & Mood Chips

## Files

### Screen mascots (88×88px)
| File | Mascot | Screen | Animation |
|------|--------|--------|-----------|
| `dumpy.svg` | Dumpy | Dump | squish |
| `prio.svg` | Prio | Priorities | jelly |
| `foco.svg` | Foco | Focus | wiggle |
| `moji.svg` | Moji | Journal | bounce |
| `goalie.svg` | Goalie | About Me | spin-pop |

### Mood chips (56×56px)
| File | Mood | Animation |
|------|------|-----------|
| `mood-joyful.svg` | Joyful | heartbeat |
| `mood-peaceful.svg` | Peaceful | heartbeat |
| `mood-tired.svg` | Tired | squish |
| `mood-anxious.svg` | Anxious | wiggle |
| `mood-frustrated.svg` | Frustrated | jelly |
| `mood-elated.svg` | Elated | pop |

### Code
| File | Purpose |
|------|---------|
| `mascot-animations.css` | All keyframes + animation classes + particle styles |
| `mascot-animations.js` | Click handler wiring + particle burst logic + public API |

---

## Quick start

```html
<!-- 1. Load the CSS -->
<link rel="stylesheet" href="mascot-animations.css">

<!-- 2. Inline the SVG with the correct id and data-anim -->
<svg id="dumpy" class="dumped-mascot" data-anim="squish" ...>
  <!-- SVG content from dumpy.svg -->
</svg>

<!-- 3. Load the JS — clicks are wired automatically -->
<script src="mascot-animations.js"></script>
```

---

## React / Next.js

```jsx
import { useEffect, useRef } from 'react';
import { ReactComponent as Dumpy } from './dumpy.svg';

export function DumpyMascot() {
  const ref = useRef(null);

  useEffect(() => {
    // Wire after mount
    if (ref.current && window.MascotAnimations) {
      window.MascotAnimations.wire(ref.current);
    }
  }, []);

  return (
    <Dumpy
      ref={ref}
      id="dumpy"
      className="dumped-mascot"
      data-anim="squish"
    />
  );
}
```

Or trigger programmatically:
```js
import { MascotAnimations } from './mascot-animations.js';

// Play default animation (from data-anim)
MascotAnimations.play(document.getElementById('dumpy'));

// Play specific animation
MascotAnimations.play(document.getElementById('dumpy'), 'wiggle');
```

---

## Animation reference

| Name | Feel | Duration |
|------|------|----------|
| `squish` | Chunky, weighty, satisfying | 500ms |
| `jelly` | Elastic, chaotic, energetic | 520ms |
| `wiggle` | Nervous, playful, restless | 420ms |
| `bounce` | Happy, light, springy | 500ms |
| `spin-pop` | Dramatic, confident | 520ms |
| `heartbeat` | Warm, calm, alive | 550ms |
| `pop` | Explosive joy, surprise | 480ms |

---

## Customising particle burst colours

Edit the `PALETTES` object in `mascot-animations.js`. Each key is the SVG's `id` attribute. Values are arrays of hex colours — the burst cycles through them.

```js
const PALETTES = {
  'dumpy': ['#A8E6CF', '#7EE8A2', '#C8F4DC'],
  // add your own...
};
```

---

## Colour tokens

| Mascot | Primary | Light | Usage |
|--------|---------|-------|-------|
| Dumpy | `#7EE8A2` | `#A8E6CF` | Dump screen — sage green |
| Prio | `#9B7FE8` | `#C4B0F8` | Priorities — lavender |
| Foco | `#4A9FD4` | `#88C8F0` | Focus — sky blue |
| Moji | `#F0A868` | `#F9C8A0` | Journal — warm orange |
| Goalie | `#E8829A` | `#F4C0D0` | About Me — rose |

| Mood | Primary | Feel |
|------|---------|------|
| Joyful | `#F5C830` | Bright yellow |
| Peaceful | `#52C49A` | Sage green |
| Tired | `#8890B8` | Slate blue |
| Anxious | `#F08830` | Warm orange |
| Frustrated | `#D83838` | Red |
| Elated | `#C060D8` | Purple |
