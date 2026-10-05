import re, json
def rows_of(path):
    s=open(path,encoding='utf-8').read()
    m=re.search(r'<script type="application/json" id="lb-texts"[^>]*>(.*?)</script>',s,re.S)
    return json.loads(m.group(1).replace('<\\/','</'))
live=rows_of('live.html')                                   # v4.14 — what the sheet holds today (plus whatever Nikita imported)
cur={(r[0],r[1]):[r[2],r[3]] for r in rows_of('page-v416.html')}   # v4.16 text state
def newrow(t,k,en,ru):
    assert (t,k) not in cur,(t,k); cur[(t,k)]=[en,ru]
cur.pop(('UI','yardsBlock'),None)                          # the Earth-tab yards block is gone (the fleet panel owns it)
N=[('UI','flTab','Fleet','Флот'),
 ('UI','flBuilding','{n} building','строится: {n}'),
 ('UI','flYards','{y} yrs left','ещё {y} лет'),
 ('UI','flFree','free at Earth','свободен у Земли'),
 ('UI','flEmpty','No hulls yet. Lay one down in the dock below.','Корпусов пока нет. Заложи первый в доке внизу.'),
 ('UI','flGrpYards','In the yards','На верфях'),
 ('UI','flGrpFree','Free at Earth','Свободны у Земли'),
 ('UI','flGrpWork','On the lines and in flight','На линиях и в полёте'),
 ('UI','flGrpOther','Lost or refusing orders','Потеряны или отказались'),
 ('UI','depletedTitle','Spent world','Выработанный мир'),
 ('UI','depletedLead','The seam is exhausted. Nothing more to dig here.','Залежь выработана. Здесь больше нечего добывать.'),
 ('UI','depletedLeft','{n} {r} still sits on the surface. The evacuation takes it home as far as the hold allows.','На поверхности осталось: {n} ({r}). Эвакуация заберёт столько, сколько влезет в трюм.'),
 ('UI','depletedNone','The stockyard is empty. Bring the people home.','Склад пуст. Верни людей домой.'),
 ('UI','lineGen','Hull generation','Поколение корпуса'),
 ('UI','lineGenNewest','newest','новейшее'),
 ('UI','lineGenRetired','The yards no longer lay this generation down. A free hull of it can still be sent.','Верфи это поколение больше не строят. Свободный корпус такого поколения всё ещё можно отправить.'),
 ('UI','lineGens','on line: {g}','на линии: {g}'),
 ('MSG','gen_retired','The yards no longer build this generation, and none is free at Earth.','Верфи это поколение больше не строят, и свободных у Земли нет.'),
]
for t,k,en,ru in N: newrow(t,k,en,ru)
ph=lambda x:sorted(re.findall(r'\{\w+\}',x))
for (t,k),(en,ru) in cur.items(): assert ph(en)==ph(ru),(t,k,ph(en),ph(ru))
base={(r[0],r[1]):[r[2],r[3]] for r in live}
new=[(t,k,v[0],v[1]) for (t,k),v in cur.items() if (t,k) not in base]
chg=[(t,k,v[0],v[1]) for (t,k),v in cur.items() if (t,k) in base and base[(t,k)]!=v]
open('new-texts.tsv','w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in new))
open('changed-texts.tsv','w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in chg))
print("new:",len(new),"changed:",len(chg),"| total rows:",len(base)+len(new))
