// Makes a copy of work/core.js in which a world pays out when it is first settled (design/START.md, «Плюшки»).
// The game is not touched. Usage:
//   node design/start/gifts.js <core.js> <out.js> <share> [dock] [people]
//   share  — the gift in parts and fuel, as a share of what charting the NEXT ring costs in each (surveyCost: parts 40·1.5^n, fuel 210·1.48^n)
//   dock   — 1: one world a ring (its second) comes with a hull on its line, free
//   people — 1: the founding party wakes on the spot — the hands go back to Earth's count
// Then, from work/:  node ../tools/sim.js <out.js> 4500 <seeds>
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8'), out=process.argv[3];
const share=+process.argv[4]||0, dock=process.argv[5]==='1', people=process.argv[6]==='1';
const A="      G.stats.founded++; (G.settled=G.settled||{})[node]=G.day;";
if(!src.includes(A)){ console.log('ANCHOR NOT FOUND'); process.exit(1) }
let add="      if(!(G.settled&&G.settled[node])){ var gN=p.sec+1;\n"+
  "        G.earth.parts+=Math.round("+share+"*40*Math.pow(1.5,gN)); G.earth.fuel+=Math.round("+share+"*210*Math.pow(1.48,gN));\n"+
  (people?"        G.earth.people+=Math.round(s.cargo.people);\n":"")+
  (dock?"        var gW=PLANETS.filter(function(q){ return q.sec===p.sec }); if(gW[1]&&gW[1].id===node){ G.giftDock=node } \n":"")+
  "      }\n";
let s=src.replace(A,add+A);
if(dock){
  // the hull is ordered once the colony stands (orderFor wants the colony), and what it cost is handed back
  const B="      log(G,'colony_founded',{p:node,pop:Math.round(s.cargo.people)});";
  if(!s.includes(B)){ console.log('ANCHOR B NOT FOUND'); process.exit(1) }
  s=s.replace(B,B+"\n      if(G.giftDock===node){ G.giftDock=null; var gE=G.earth, g0={metal:gE.metal,fuel:gE.fuel,parts:gE.parts,food:gE.food}, gC=classFor(p.sec,G.gen||0);\n"+
    "        gE.metal+=1e6; gE.fuel+=1e6; gE.parts+=1e6; var gR=gC?orderFor(G,node,gC):'noclass'; gE.metal=g0.metal; gE.fuel=g0.fuel; gE.parts=g0.parts; gE.food=g0.food;\n"+
    "        G.giftDocks=(G.giftDocks||0)+(gR==='ok'?1:0) }");
}
fs.writeFileSync(out,s,{encoding:'utf8'});
console.log('ok share='+share+' dock='+dock+' people='+people);
