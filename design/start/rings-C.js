// C: today's ring is the floor; from ring 2 on, 0..4 extra worlds of random trades (30%: all extras of one trade).
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
const A="  if(rnd()<0.62) kinds.push(rnd()<0.62?'mine':'farm');";
if(!src.includes(A)){ console.log('ANCHOR NOT FOUND'); process.exit(1) }
const add=A+"\n  if(i>0){ var rr=mulberry32(((rnd()*1e9)|0)+i*31), n=Math.floor(rr()*5), mono=rr()<0.30, pick=function(){ var x=rr(); return x<0.4?'mine':(x<0.7?'farm':'well') }, one=pick(), q; for(q=0;q<n;q++) kinds.push(mono?one:pick()) }";
fs.writeFileSync(process.argv[3],src.replace(A,add),{encoding:'utf8'});
console.log('ok');
