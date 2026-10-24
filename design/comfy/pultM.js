// round M (24.10): Nikita: L03a is closest; a capsule with something energetic inside looks stylish — "isn't it too obvious a lift?"
// Answer: the capsule is a genre staple; the tell is a humanoid energy figure in a rib cage (C'tan in a tesseract vault), green, Necron script,
// Egyptian motifs, crescent fins. So: inside goes our stuff (a stream of our glyphs in the energy, or a slowly turning lattice of light hexagons),
// from his pylon sheet — a glyph plate lighting up column by column and ribbed hoses with flowing light. No crescents, no figure.
// Two references: L03a + our glyph sheet. 8 concepts x 2 seeds -> intro1_M01a..M08b.
const PEOPLE = 'Rows of dark consoles with thin amber light lines; the operators in matching grey-olive coveralls with a yellow stripe on the shoulders are dark silhouettes seen from behind. In the central aisle, seen from behind and small against the Helm, stand a slender woman with short slicked-back blonde hair in a light grey uniform with yellow stripes on the shoulders and a tall man in a long dark coat, both looking up at the Helm, the ship\'s supercomputer. ';
const HALL = 'Wide cinematic film still, ultra-wide 2.4:1, the same dark circular command hall and the same tall black computer column as in the first reference image, seen from the back of the room. ' + PEOPLE;
const COL = 'The Helm is a tall black alien computer column of dark gunmetal and obsidian-black metal with clean straight bevelled edges, deep recessed grooves and engraved columns of glowing yellow glyphs exactly like the hexagonal glyphs in the second reference image; ';
const GLY = 'inside the capsule a stream of bright sunflower yellow energy flows upward, and the energy itself is made of thousands of small glowing yellow glyphs like those in the second reference image, rising, swirling and crackling';
const HEX = 'inside the capsule a lattice of glowing sunflower yellow hexagons made of light slowly turns in the energy, cells of the lattice brightening and dimming, thin yellow lightning between them';
const PLATE = 'a tall black glyph plate set into the column beside the capsule carries six vertical columns of our glyphs, the left three columns already lit bright yellow and the other three still dark, as if systems were coming online one by one';
const HOSES = 'thick ribbed black hoses with transparent sections run into the base of the capsule, yellow light flowing through them in pulses';
const GRADE = ' The interfaces are alien and not made for human hands, nothing like a keyboard or a flat monitor. No curved crescent blades or fins, no pyramid, no human figure inside the capsule. Yellow light in volumetric haze, glossy black floor reflecting the yellow glow, deep black shadows, the only strong colour is yellow, anamorphic lens, photorealistic 3D render, strictly no visible faces, all people turned away from the camera, no letters, no logos, no skulls, no robots.';
const M = [
 ['Поток глифов, плита, шланги', COL + 'in its front, behind thick glass, sits a tall rounded capsule; ' + GLY + '; ' + PLATE + '; ' + HOSES + '.'],
 ['Гекс-решётка, плита, шланги', COL + 'in its front, behind thick glass, sits a tall rounded capsule; ' + HEX + '; ' + PLATE + '; ' + HOSES + '.'],
 ['Колонна раскрыта, поток глифов', COL + 'its front is split open in two heavy halves, exposing a tall glass capsule held in place by heavy black clamping collars at the top and bottom, as if it could be lifted out; ' + GLY + '; ' + HOSES + '.'],
 ['Колонна раскрыта, гекс-решётка', COL + 'its front is split open in two heavy halves, exposing a tall glass capsule held in place by heavy black clamping collars at the top and bottom, as if it could be lifted out; ' + HEX + '; ' + HOSES + '.'],
 ['Большая плита глифов', COL + 'in its front a tall hexagonal window shows a capsule of yellow energy; ' + HEX + '; the whole lower half of the column is ' + PLATE.replace('a tall black glyph plate set into the column beside the capsule carries', 'one wide black glyph plate that carries') + '.'],
 ['Капсулу поднимают', COL + 'its top has opened and the tall glass capsule is rising slowly out of the column on four thin black rails, half of it already above the top of the column; ' + GLY + '; ' + HOSES + ', stretched up after it.'],
 ['Капсула в кольцах глифов', COL + 'in its front, behind thick glass, sits a tall rounded capsule; ' + GLY + '; three large concentric metal rings engraved with glowing glyphs turn slowly around the middle of the capsule like the dials of a combination lock.'],
 ['Лесенка малых капсул', COL + 'down its front runs a vertical row of five small hexagonal windows, each holding a small glass capsule; in each capsule glowing yellow glyphs swirl in energy, the lower capsules bright, the upper ones still dim; ' + HOSES + ' linking them.']
];
M.forEach(([ru, c], i) => ['a', 'b'].forEach((v, j) => {
  const id = 'M' + String(i + 1).padStart(2, '0') + v;
  module.exports[163 + i * 2 + j] = { name: 'intro1_' + id, id, ref: 'на основе L03a', ru: ru + (j ? ' (2)' : ''), seed: 18000 + i * 29 + j * 7, refImg: ['lb_L03a.png', 'lb_glyphs-hex.png'], prompt: HALL + c + GRADE };
}));
