// ship icons for the map (29.10, Nikita: the vector mockup ships-v4 is "фигня", generate them in ComfyUI instead).
// Side view, nose to the right, on a flat light backdrop so the cut-out is easy; the game flips them and lays the cargo
// glow and the engine flame over them in code. Two looks: A — a worn human workhorse built at the Yard (the crew's yellow
// stripe as hazard marks), B — black obsidian metal with yellow energy, like the Pult. Three seeds per ship.
//   ROUND=shipsA node design/comfy/run50.js   → design/intro/raw/S/
const SHOT = 'Game asset, a single small spaceship seen exactly from the side, orthographic side elevation, nose pointing to the right, the whole ship in frame with empty margin around it, centred, isolated on a plain flat light grey studio backdrop, no ground, no shadow, no stars, no planet, no background scenery. Clean readable silhouette that still reads when shrunk to a tiny map icon: few big masses, bold shapes, crisp edges. Stylized 3D render, sleek dark science fiction, between realistic and stylized. ';
const LOOK = {
  A: 'Built by hand at a shipyard from salvaged older technology: matte dark gunmetal and charcoal hull plates, worn and patched, bolted panels, a few bold yellow #FFD23F hazard stripes, small warm running lights, one big dark engine nozzle at the rear. ',
  B: 'Black obsidian metal, glossy and matte black facets, sharp blade-like ribs, thin glowing yellow #FFD23F energy seams and a few small hexagonal glyph panels glowing yellow, one big dark engine nozzle at the rear. Not green, no brass, no gothic ornament. ',
};
const SHIP = {
  c: ['courier «Hermes»', 'The courier, the fastest and smallest ship: a slim pointed dart, two swept-back wings like the winged sandals of the messenger god, and a round sealed pressurised passenger capsule in the middle of the hull — the only ship that carries people. Light and quick. '],
  h: ['hauler «Sisyphus»', 'The hauler: a short stubby heavy tug at the rear pushing ahead of itself one huge hexagonal cargo block, the block much bigger than the tug, joined by a short thick push frame, like Sisyphus pushing his boulder. '],
  f: ['freighter «Atlas»', 'The freighter, the biggest ship: a long low flat spine with a small bridge at the front, and on top of the spine a row of three big hexagonal cargo containers carried on its back, the load higher than the ship itself, like Atlas holding up the sky. Long and heavy. '],
};
const TAIL = 'No text, no logos, no people, no flames from the engine, not a sea boat, not a cartoon, not pixel art.';
let n = 0;
['A', 'B'].forEach(look => Object.keys(SHIP).forEach(k => [1, 2, 3].forEach(v => {
  const id = 'S' + look + k + v;
  module.exports[++n] = { name: 'ship_' + id, id, ru: SHIP[k][0] + ' · ' + look + v, seed: 31000 + n * 37, prompt: SHOT + SHIP[k][1] + LOOK[look] + TAIL };
})));
// second try (19–30): the haulers came out as wheeled trucks and the freighters as river barges — say "spacecraft" harder
const SPACE = 'It is a spacecraft floating weightless in empty space: no wheels, no tracks, no legs, no landing gear, no keel, no waterline, nothing underneath it; small thruster pods instead. ';
const SHIP2 = {
  h: 'The hauler, a space tug: at the rear a compact armoured tug spacecraft with a big engine, and in front of it, held by a short thick docking clamp frame, one huge hexagonal cargo pod floating in space, the pod twice the size of the tug, like Sisyphus pushing his boulder. ',
  f: 'The freighter, the biggest spacecraft: a long thin truss spine like a space station girder with a small command module at the front and a big engine block at the rear, and three big hexagonal cargo containers clamped on top of the spine, the load taller than the ship, like Atlas holding up the sky. ',
};
['A', 'B'].forEach(look => ['h', 'f'].forEach(k => [4, 5, 6].forEach(v => {
  const id = 'S' + look + k + v;
  module.exports[++n] = { name: 'ship_' + id, id, ru: SHIP[k][0] + ' · ' + look + v, seed: 32000 + n * 41, prompt: SHOT + SHIP2[k] + SPACE + LOOK[look] + TAIL };
})));
