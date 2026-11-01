// ships as flying coffins (31.10, Nikita, refs: necron ships, Thunderhawk, more stylized): black, cubic, no windows at all,
// only a ramp and a hold, yellow glyphs and glow on the hull. They fly themselves; the crew only maintains them.
// Few big masses so the shape holds at map size. Two views: S — from the side, a little from above; T — straight from above,
// where the outline is the long hexagon of a coffin (the game's hex motif) and the icon can turn along its route.
//   ROUND=shipsC node design/comfy/run50.js   → design/intro/raw/Z/
const LOOK = 'Stylized dark 3D render of a single autonomous space vessel, a flying coffin: an abstract heavy block of black obsidian metal, one solid hull, not a box or a shipping container: a coffin profile with chamfered sloping shoulders, tapering towards the front and the rear, a wedge-shaped armoured prow and a heavy engine block at the rear, hovering in space, angular faceted armour planes, razor-sharp edges, absolutely no windows, no cockpit, no canopy, no portholes, no wings, no fins. Columns of small glowing yellow #FFD23F hexagon-based alien glyphs engraved in the hull, thin glowing yellow seams along the edges, a soft yellow glow from the engine slits at the rear. Monolithic, silent, ominous, machine-made, like a dropship with nobody at the controls. Very few big shapes, a bold clean silhouette that still reads when shrunk to a tiny map icon, little surface noise. ';
const VIEW = {
  S: 'Seen from the side and slightly from above, three-quarter view showing the top and the side, the front pointing to the right. ',
  T: 'Seen straight from directly above, top-down plan view, perfectly symmetrical, the front pointing to the right; one single body with nothing sticking out at the sides, its outline a simple elongated hexagon, the classic coffin shape, wider at the shoulder and narrowing to both ends. ',
};
const SHIP = {
  c: ['курьер', 'The smallest class: one narrow slim coffin, sealed, with a single small boarding ramp and one engine slit. Light and quick. '],
  h: ['тягач', 'The medium class: a short thick cube-like coffin, almost as tall as it is long, a huge rear cargo ramp hinged open a little showing a yellow glow from the hold, two engine slits. Blunt and heavy. '],
  f: ['грузовоз', 'The largest class: a very long low slab-like coffin, three times longer than it is tall, its hull divided into three big cargo hold sections by deep grooves, each section with its own column of glyphs, three engine slits. Enormous. '],
};
const BACK = 'Centred, the whole vessel in frame with wide empty margin, isolated on a plain flat light grey studio backdrop, floating, no ground, no cast shadow, no stars, no planet. ';
const TAIL = 'Not green, no skulls, no ankh, no crescent, no pyramid, no brass, no gothic ornament, no text, no letters, no people, no flames, not a sea boat, not a car, not a cartoon, not pixel art.';
let n = 0;
['S', 'T'].forEach(view => Object.keys(SHIP).forEach(k => [1, 2, 3].forEach(v => {
  const id = 'Z' + view + k + v;
  module.exports[++n] = { name: 'ship_' + id, id, ru: SHIP[k][0] + ' · ' + view + v, seed: 51000 + n * 47, w: 1024, h: 640, prompt: LOOK + SHIP[k][1] + VIEW[view] + BACK + TAIL };
})));
