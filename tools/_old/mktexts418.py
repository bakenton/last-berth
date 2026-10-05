import re, json
def rows_of(path):
    s=open(path,encoding='utf-8').read()
    m=re.search(r'<script type="application/json" id="lb-texts"[^>]*>(.*?)</script>',s,re.S)
    return json.loads(m.group(1).replace('<\\/','</'))
live=rows_of('live.html')
cur={(r[0],r[1]):[r[2],r[3]] for r in rows_of('page-v417.html')}
def setrow(t,k,en,ru):
    assert (t,k) in cur,(t,k); cur[(t,k)]=[en,ru]
def newrow(t,k,en,ru):
    assert (t,k) not in cur,(t,k); cur[(t,k)]=[en,ru]
setrow('UI','pileAll','On the surface {s} · one hold {c}: a single trip takes it all. Grey — the pile; white frame — one hull\'s hold.','На поверхности {s} · трюм одного корпуса {c}: одна ходка заберёт всё. Серое — куча, белая рамка — трюм одного корпуса.')
setrow('UI','pileShare','On the surface {s} · one hold {c} takes {n} per trip — {p}% of the pile. Grey — the pile; white frame — one hull\'s hold.','На поверхности {s} · трюм одного корпуса {c} увозит за ходку {n} — {p}% кучи. Серое — куча, белая рамка — трюм одного корпуса.')
setrow('UI','depletedNone','The stockyard is empty — nothing left to collect. Bring the people home.','Склад пуст — забирать нечего. Верни людей домой.')
setrow('UI','depletedLead','The seam is exhausted and the surface is empty.','Залежь выработана, и на поверхности ничего не осталось.')
N=[('UI','dryTitle','Seam exhausted','Залежь выработана'),
 ('UI','dryLead','Nothing more to dig, but {n} {r} still lies on the surface. Hulls can still be sent to collect it; once the surface is empty, only evacuation remains.','Добывать больше нечего, но на поверхности ещё лежит {n} ({r}). Сюда ещё можно отправлять корпуса, чтобы дособрать; когда поверхность опустеет, останется только эвакуация.'),
 ('UI','rateLine','World makes {m}/yr · line hauls {h}/yr','Мир даёт {m}/год · линия вывозит {h}/год'),
 ('UI','evacWho','Courier {n} ({h}) goes: hold {c}, people {k} — everyone fits; {y} years out.','Пойдёт курьер {n} ({h}): трюм {c}, людей {k} — помещаются все; лететь {y} лет.'),
 ('UI','evacShort','Courier {n} ({h}) holds {c} of {k} people — {l} will stay behind. A bigger courier (newer generation) lifts everyone.','Курьер {n} ({h}) берёт {c} из {k} человек — {l} останутся. Курьер побольше (нового поколения) снимет всех.'),
 ('UI','evacNoCourierHint','Only a courier lifts a settlement, and none is free at Earth. {w}','Снимать поселение может только курьер, а свободных у Земли нет. {w}'),
 ('UI','evacW_orderC','Build a courier in the dock, or take one off a standing order.','Заложи курьер в доке или сними один с постоянного приказа.'),
 ('MSG','evacNoCourier','No free courier at Earth can reach {p}. {w}','У Земли нет свободного курьера, который долетит до {p}. {w}'),
 ('MSG','evacCourier','Only a courier can lift a settlement.','Снимать поселение может только курьер.'),
 ('MSG','ok_evac_short','Courier {n} is on its way to lift {p} — it holds {c}; {l} people will stay behind.','Курьер {n} пошёл снимать {p} — трюм {c}; {l} человек останутся.'),
]
for t,k,en,ru in N: newrow(t,k,en,ru)
ph=lambda x:sorted(re.findall(r'\{\w+\}',x))
for (t,k),(en,ru) in cur.items(): assert ph(en)==ph(ru),(t,k,ph(en),ph(ru))
base={(r[0],r[1]):[r[2],r[3]] for r in live}
new=[(t,k,v[0],v[1]) for (t,k),v in cur.items() if (t,k) not in base]
chg=[(t,k,v[0],v[1]) for (t,k),v in cur.items() if (t,k) in base and base[(t,k)]!=v]
open('new-texts.tsv','w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in new))
open('changed-texts.tsv','w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in chg))
print("new:",len(new),"changed:",len(chg))
