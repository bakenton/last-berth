// Makes two copies of work/core.js with a random ring composition from ring 2 on (ring 1 stays as it is).
// A: pure random (count 2..7 besides the works, kinds by weight, 25% chance all of one kind).
// B: same, plus a floor: a ring gets a well / a farm if neither it nor the ring before has one.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];
const A = "  var kinds = ['mine','mine','farm','well','works'];\n  if(rnd()<0.62) kinds.push(rnd()<0.62?'mine':'farm');";
if (!src.includes(A)) { console.log('ANCHOR A NOT FOUND'); process.exit(1); }
const B = "  var ws=genSector(rnd,i);";
if (!src.includes(B)) { console.log('ANCHOR B NOT FOUND'); process.exit(1); }
function variant(floor) {
  const gen = A + "\n  if(i>0){ var rr=mulberry32(((rnd()*1e9)|0)+i*31), n=2+Math.floor(rr()*6), mono=rr()<0.25, pick=function(){ var x=rr(); return x<0.45?'mine':(x<0.75?'farm':'well') }, one=pick(), q;\n" +
    "    kinds=['works']; for(q=0;q<n;q++) kinds.push(mono?one:pick());\n" +
    (floor ? "    if(prev){ if(kinds.indexOf('well')<0&&prev.indexOf('well')<0) kinds.push('well'); if(kinds.indexOf('farm')<0&&prev.indexOf('farm')<0) kinds.push('farm') }\n" : "") +
    "  }";
  let s = src.replace(A, gen).replace("function genSector(rnd, i){", "function genSector(rnd, i, prev){");
  s = s.replace(B, "  var prevK=PLANETS.filter(function(p){ return p.sec===i-1 }).map(function(p){ return p.kind });\n  var ws=genSector(rnd,i,prevK);");
  return s;
}
fs.writeFileSync(path.join(out, 'core-ringsA.js'), variant(false), { encoding: 'utf8' });
fs.writeFileSync(path.join(out, 'core-ringsB.js'), variant(true), { encoding: 'utf8' });
console.log('ok');
