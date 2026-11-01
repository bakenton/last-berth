// ship ICONS for the map (29.10, Nikita on the 3D ships of shipsA: "это какие-то модели, а не иконки").
// Each frame is a set of three icons in one style, so the set is consistent; six styles to point at.
// On black, light marks only: the page shows them with mix-blend-mode screen, no cut-out needed.
//   ROUND=shipsI node design/comfy/run50.js   → design/intro/raw/Y/
const SET = 'A set of three game map icons for three classes of spaceship, placed side by side in a row with wide even gaps, all three exactly the same style, line weight and size, each facing right, on a pure flat black background. '
  + 'Left: the courier — a slim pointed dart with two swept-back wings and a small round capsule in the middle. '
  + 'Middle: the hauler — one big hexagon with a small blocky rocket engine stuck to its back, the engine much smaller than the hexagon. '
  + 'Right: the freighter — a long thin rocket body with three hexagon blocks sitting on top of it, a rocket nozzle at the rear. '
  + 'All three are spaceships flying in space: no wheels, no cars, no trucks, no boats, nothing touching the ground. ';
const STYLE = {
  1: 'Flat solid silhouette pictograms, one flat colour each, no shading, no detail inside, like unit icons on a real-time strategy minimap: courier in cyan #45D4E8, hauler in pink #FF6FB5, freighter in off-white #F2F1EC. ',
  2: 'Minimal line icons, a single thin uniform stroke, outlines only, no fill, rounded joins, like a clean user-interface icon set, off-white lines #F2F1EC with one small yellow #FFD23F accent each. ',
  3: 'Flat vector icons, two tones: a solid off-white #F2F1EC body and a few yellow #FFD23F accents, cut with thin black gaps between parts, crisp geometric shapes, sharp corners. ',
  4: 'Each icon sits inside a thin hexagonal frame like a badge: a small flat yellow #FFD23F ship glyph inside a thin off-white hexagon outline, minimal, geometric. ',
  5: 'Seen from directly above, top-down, flat solid pictograms with a tiny yellow #FFD23F engine glow at the rear, like ship markers on a sci-fi star map, off-white #F2F1EC, no shading. ',
  6: 'Geometric glyph icons built only from straight lines, triangles and hexagons, like symbols of an alien alphabet, bold strokes of glowing yellow #FFD23F, flat, no shading. ',
};
const TAIL = 'Flat 2D graphic design, vector style, crisp, no 3D, no gradients, no realistic render, no text, no letters, no numbers, no frame around the whole image, not a sea boat.';
let n = 0;
Object.keys(STYLE).forEach(s => [1, 2, 3].forEach(v => {
  const id = 'Y' + s + v;
  module.exports[++n] = { name: 'ship_' + id, id, ru: 'стиль ' + s + ' · ' + v, seed: 41000 + n * 43, w: 1536, h: 512, prompt: SET + STYLE[s] + TAIL };
}));
