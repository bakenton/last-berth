// round I (24.10): Nikita: round H all missed. Two references from him:
// 1) the NieR: Automata black box — a matte black solid with crisp thin stepped circuit lines; make it hexagonal, lines in the brand yellow (#FFD23F in the menu);
// 2) a Genshin Impact cavern — warm golden light pillar, stepped prism blocks hanging from above and rising from below (close to our 3D hex menu), but with hexagons.
// 12 concepts x 2 seeds -> intro1_I01a..I12b (node run50.js with ROUND=pultI). Same hall and people as R7.
const PEOPLE = 'Rows of dark consoles with thin amber light lines; the operators in matching grey-olive coveralls with a yellow stripe on the shoulders are dark silhouettes seen from behind. In the central aisle, seen from behind and small against the Helm, stand a slender woman with short slicked-back blonde hair in a light grey uniform with yellow stripes on the shoulders and a tall man in a long dark coat, both looking at the Helm, the ship\'s supercomputer. ';
const HALL = 'Wide cinematic film still, ultra-wide 2.4:1, dark circular command hall of a vast starship seen from the back of the room. A giant curved wall of tall screens with amber and blue columns of data surrounds the room. ' + PEOPLE;
const COOL = 'Volumetric haze, glossy dark floor reflecting the light, dark teal shadows with warm yellow highlights, anamorphic lens, shallow depth of field, photorealistic 3D render, strictly no visible faces, no text, no logos.';
const WARM = 'Golden volumetric haze and light shafts, glossy dark floor reflecting warm gold light, warm golden amber colour grade with deep black shadows, anamorphic lens, shallow depth of field, photorealistic 3D render, strictly no visible faces, no text, no logos.';
const BOX = 'perfectly matte black, sharp clean edges, its faces engraved with crisp thin glowing lines in bright warm sunflower yellow, the lines run in parallel and step up and down in angular trapezoid bends with small dashes and capsule shapes, like a minimal circuit pattern, elegant and mysterious, no other details';
const I = [
 ['Чёрный гекс-ящик', 'NieR: чёрный ящик', COOL, 'In the middle of the hall stands the Helm: a tall solid hexagonal prism three times human height, ' + BOX + '.'],
 ['Гекс-ящик в воздухе', 'NieR: чёрный ящик', COOL, 'In the middle of the hall the Helm hovers a little above the floor, slowly turning: a large solid hexagonal prism, ' + BOX + ', a soft yellow glow on the floor beneath it.'],
 ['Куб на вершине', 'NieR: чёрный ящик; силуэт куба на вершине — гексагон', COOL, 'In the middle of the hall the Helm balances on one corner just above the floor: a huge solid black cube standing on its vertex so that its silhouette is a hexagon, ' + BOX + '.'],
 ['Пучок гекс-столбов', 'NieR + базальтовые столбы', COOL, 'In the middle of the hall stands the Helm: a tight cluster of solid hexagonal black columns of different heights packed together like basalt columns, the tallest in the centre, each column ' + BOX + '.'],
 ['Ящик приоткрыт', 'NieR: чёрный ящик', COOL, 'In the middle of the hall stands the Helm: a huge solid hexagonal black prism whose six side panels have slid slightly apart along vertical seams, warm yellow light shining out through the gaps, ' + BOX + '.'],
 ['Дорожки на весь зал', 'NieR: чёрный ящик', COOL, 'In the middle of the hall stands the Helm: a wide low solid hexagonal black block, ' + BOX + '; the yellow lines continue off the block across the black floor in long angular traces and run to every console in the room.'],
 ['Гекс-сталактиты и столбы', 'Genshin: пещера с золотым столбом', WARM, 'At the centre of the hall the floor rises into a stepped relief of hexagonal stone prisms of many heights, and above it hexagonal prisms of different lengths hang down from the ceiling like stalactites; between them a tall pillar of golden light with faint floating rings rises from the floor to the ceiling. This is the Helm.'],
 ['Висящие гекс-призмы', 'Genshin: пещера с золотым столбом', WARM, 'The whole ceiling above the centre of the hall is the Helm: a dense mass of dark hexagonal prisms of different lengths hanging down at different heights, their lower ends glowing warm gold, light spilling down between them onto the crowd.'],
 ['Призмы вокруг столба света', 'Genshin: пещера с золотым столбом', WARM, 'In the middle of the hall stands the Helm: a column of warm golden light from the floor to the ceiling, and around it dozens of dark hexagonal stone prisms float in mid-air at different heights, slowly circling, their faces lit gold on one side.'],
 ['Ящик в золотом столбе', 'NieR + Genshin', WARM, 'In the middle of the hall, between hexagonal prisms rising from the floor and hanging from the ceiling, floats the Helm inside a pillar of golden light: a solid hexagonal prism, ' + BOX + '.'],
 ['Амфитеатр из гекс-столбов', 'NieR + Genshin; гекс-рельеф меню', WARM, 'The floor of the hall rises in steps of hexagonal columns towards the centre like an amphitheatre, and on top in the middle stands the Helm: a tall solid hexagonal prism, ' + BOX + ', warm golden light rising around it.'],
 ['Ящик в кольцах света', 'NieR + Genshin', WARM, 'In the middle of the hall stands the Helm: a tall solid hexagonal prism, ' + BOX + ', with several thin flat hexagonal rings of golden light floating horizontally around it at different heights.']
];
I.forEach(([ru, ref, grade, c], i) => ['a', 'b'].forEach((v, j) => {
  const id = 'I' + String(i + 1).padStart(2, '0') + v;
  module.exports[77 + i * 2 + j] = { name: 'intro1_' + id, id, ref, ru: ru + (j ? ' (2)' : ''), seed: 13000 + i * 11 + j * 3, prompt: HALL + c + ' ' + grade };
}));

// round I, refinement (24.10): in I01–I12 the model drew boxes as cubes and the lines as PCB traces. Spell out the hexagonal prism and the NieR band pattern.
const HEX = 'a regular hexagonal prism with six vertical faces and a flat regular hexagon on top, seen at an angle so that three of its faces are visible';
const BANDS = 'perfectly matte black and smooth, sharp clean edges; around it run two wide horizontal bands of crisp thin glowing lines in bright warm sunflower yellow, one band near the top and one near the bottom; in each band two parallel lines wrap around all faces and step up and down together in wide angular trapezoid bumps, with small capsule shapes, short dashes and tiny gaps along them; between the bands the black surface is empty; no circuit-board traces, no other details';
const J = [
 ['Гекс-ящик в воздухе', 'доводка I02', COOL, 'In the middle of the hall the Helm hovers a little above the floor, slowly turning: ' + HEX + ', twice human height, ' + BANDS + ', a soft yellow glow on the floor beneath it.'],
 ['Куб на вершине', 'доводка I03', COOL, 'In the middle of the hall the Helm balances on one corner just above the floor: a huge black cube standing on its vertex so that its outline is a hexagon, ' + BANDS + '.'],
 ['Гекс-столбы и золотой столб', 'доводка I07', WARM, 'At the centre of the hall the floor rises into a stepped relief of regular hexagonal stone columns of many heights like basalt columns, flat hexagonal tops, and above it regular hexagonal columns of different lengths hang down from the ceiling with flat hexagonal ends; between them a tall pillar of golden light with faint floating rings rises from the floor to the ceiling. This is the Helm.'],
 ['Гекс-призмы вокруг света', 'доводка I09', WARM, 'In the middle of the hall stands the Helm: a column of warm golden light from the floor to the ceiling, and around it dozens of dark regular hexagonal prisms with flat hexagonal ends float in mid-air at different heights and angles, slowly circling, their faces lit gold on one side.'],
 ['Гекс-ящик в золотом столбе', 'доводка I10', WARM, 'In the middle of the hall, between regular hexagonal columns rising from the floor and hanging from the ceiling, floats the Helm inside a pillar of golden light: ' + HEX + ', ' + BANDS + '.']
];
J.forEach(([ru, ref, grade, c], i) => ['a', 'b'].forEach((v, j) => {
  const id = 'I' + String(13 + i) + v;
  module.exports[101 + i * 2 + j] = { name: 'intro1_' + id, id, ref, ru: ru + ' · доводка' + (j ? ' (2)' : ''), seed: 14000 + i * 13 + j * 5, prompt: HALL + c + ' ' + grade };
}));
