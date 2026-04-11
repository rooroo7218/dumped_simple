/**
 * DUMPED Mascot & Mood Chip Animations
 *
 * Drop this file in your project and import it once.
 * It auto-wires click handlers to every .dumped-mascot
 * and .dumped-mood element on the page.
 *
 * Each SVG uses a data-anim attribute to declare which
 * animation it plays. Colour palette for the particle
 * burst is declared in PALETTES below.
 *
 * Usage:
 *   import './mascot-animations.js';
 *   // or: <script src="mascot-animations.js"></script>
 *
 * Programmatic trigger:
 *   MascotAnimations.play(element);    // uses data-anim
 *   MascotAnimations.play(element, 'wiggle'); // override
 */

const MascotAnimations = (() => {

  // ── Animation name → CSS class map ──────────────────────
  const ANIM_MAP = {
    'squish':    'dumped-anim-squish',
    'jelly':     'dumped-anim-jelly',
    'wiggle':    'dumped-anim-wiggle',
    'bounce':    'dumped-anim-bounce',
    'spin-pop':  'dumped-anim-spin-pop',
    'heartbeat': 'dumped-anim-heartbeat',
    'pop':       'dumped-anim-pop',
  };

  // ── Particle burst colours per mascot/mood id ───────────
  // Keys match the SVG's id attribute.
  // Values are arrays of hex colours used for burst dots.
  const PALETTES = {
    // Screen mascots
    'dumpy':  ['#A8E6CF', '#7EE8A2', '#C8F4DC'],
    'prio':   ['#C4B0F8', '#9B7FE8', '#F0C674'],
    'foco':   ['#88C8F0', '#4A9FD4', '#BEE2F7'],
    'moji':   ['#F9C8A0', '#F0A868', '#F4A8C0'],
    'goalie': ['#F4C0D0', '#E8829A', '#F9DDE4'],
    // Mood chips
    'mood-joyful':     ['#FFF4A0', '#F5C830', '#F4A8C0'],
    'mood-peaceful':   ['#A8E8D0', '#52C49A', '#D0F5E8'],
    'mood-tired':      ['#C8CCE0', '#8890B8', '#B0B4C8'],
    'mood-anxious':    ['#FFD8A8', '#F08830', '#88C8F0'],
    'mood-frustrated': ['#F8A8A8', '#D83838', '#FF8080'],
    'mood-elated':     ['#F0C0FC', '#C060D8', '#F0C674'],
  };

  // Default palette if no id match
  const DEFAULT_PALETTE = ['#7EE8A2', '#C4B0F8', '#88C8F0'];

  // ── Core: play an animation on an element ───────────────
  function play(el, animOverride) {
    if (!el) return;

    // Determine which animation to run
    const animName = animOverride || el.dataset.anim || 'squish';
    const animClass = ANIM_MAP[animName];
    if (!animClass) {
      console.warn(`DUMPED mascots: unknown animation "${animName}"`);
      return;
    }

    // Remove all anim classes, force reflow, re-add
    Object.values(ANIM_MAP).forEach(cls => el.classList.remove(cls));
    void el.offsetWidth; // force reflow so animation restarts cleanly
    el.classList.add(animClass);

    // Fire particle burst
    spawnBurst(el);

    // Clean up class when animation ends
    el.addEventListener('animationend', () => {
      el.classList.remove(animClass);
    }, { once: true });
  }

  // ── Particle burst ───────────────────────────────────────
  function spawnBurst(el) {
    // Find the nearest positioned ancestor to contain particles.
    // Falls back to document.body if none found.
    let container = el.parentElement;
    while (container && getComputedStyle(container).position === 'static') {
      container = container.parentElement;
    }
    if (!container) container = document.body;

    // Get element centre relative to the container
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const cx = elRect.left - containerRect.left + elRect.width / 2;
    const cy = elRect.top  - containerRect.top  + elRect.height / 2;

    // Pick palette
    const id = el.id || el.dataset.mascot || el.dataset.mood || '';
    const palette = PALETTES[id] || DEFAULT_PALETTE;

    // Spawn 9 particles
    const COUNT = 9;
    for (let i = 0; i < COUNT; i++) {
      const dot = document.createElement('div');
      dot.className = 'dumped-particle';

      const size = 4 + Math.random() * 5;
      const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const dist  = 28 + Math.random() * 22;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const colour = palette[i % palette.length];

      dot.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size}px;
        background: ${colour};
        --tx: ${tx}px;
        --ty: ${ty}px;
      `;

      container.appendChild(dot);
      // Remove after animation completes (480ms matches CSS duration)
      setTimeout(() => dot.remove(), 480);
    }
  }

  // ── Auto-wire click handlers ─────────────────────────────
  // Runs once on DOMContentLoaded. Handles elements present
  // at load time. For dynamically added elements, call
  // MascotAnimations.wire(element) manually.
  function wireAll() {
    document.querySelectorAll('.dumped-mascot, .dumped-mood').forEach(wire);
  }

  function wire(el) {
    // Avoid double-wiring
    if (el.dataset.mascotWired) return;
    el.dataset.mascotWired = 'true';
    el.addEventListener('click', () => play(el));
  }

  // ── Init ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAll);
  } else {
    wireAll();
  }

  // ── Public API ───────────────────────────────────────────
  return { play, wire, wireAll, spawnBurst };

})();

// Make available globally if not using modules
if (typeof window !== 'undefined') {
  window.MascotAnimations = MascotAnimations;
}
