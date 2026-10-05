import re, json
def rows_of(path):
    s=open(path,encoding='utf-8').read()
    m=re.search(r'<script type="application/json" id="lb-texts"[^>]*>(.*?)</script>',s,re.S)
    return json.loads(m.group(1).replace('<\\/','</'))
live=rows_of('live.html')
cur={(r[0],r[1]):[r[2],r[3]] for r in rows_of('page-v415.html')}
def setrow(t,k,en,ru):
    assert (t,k) in cur,(t,k); cur[(t,k)]=[en,ru]
def newrow(t,k,en,ru):
    assert (t,k) not in cur,(t,k); cur[(t,k)]=[en,ru]
setrow('UI','hSectors','Rings','Колец')
setrow('UI','a_survey','You can chart ring {n}.','Можно нанести на карту кольцо {n}.')
setrow('UI','surveyTitle','Chart the next ring','Нанести следующее кольцо')
setrow('UI','sectorsOpen','Rings charted','Колец на карте')
setrow('UI','ringCourier','COURIERS → RING {n}','КУРЬЕРЫ → КОЛЬЦО {n}')
setrow('UI','ringFleet','GENERATION {g} · FREIGHTERS → RING {n}','ПОКОЛЕНИЕ {g} · ГРУЗОВОЗЫ → КОЛЬЦО {n}')
setrow('UI','hullReach','reaches ring {n}','долетает до кольца {n}')
setrow('UI','genReach','freighters reach ring {n}','грузовозы долетают до кольца {n}')
setrow('UI','driveUnlocks','When it completes: Generation {g} hulls, rings up to {s}, every crossing ×{x}.','По завершении: корпуса поколения {g}, кольца до {s}, все перелёты ×{x}.')
setrow('UI','outOfRange','cannot reach — rated to ring {n}','не долетит — рассчитан до кольца {n}')
setrow('UI','statSec','Rings charted','Колец нанесено')
setrow('UI','unsurveyed','Beyond signal range. Chart this ring (Survey, Earth tab) to open it.','За пределами связи. Нанеси кольцо на карту (Разведка, вкладка Земля), чтобы открыть его.')
setrow('UI','sector','Ring','Кольцо')
setrow('LOG','drive_mark','GENERATION {n} DRIVE COMMISSIONED AT {p}. New hulls in the yards; rings up to {s} within reach.','ДВИГАТЕЛЬ ПОКОЛЕНИЯ {n} ВВЕДЁН НА {p}. Новые корпуса на верфях; кольца до {s} в досягаемости.')
setrow('LOG','old_night','The charts call the new ring OLD NIGHT. Nobody at the desk remembers who named it.','На картах новое кольцо зовётся OLD NIGHT. На пульте никто не помнит, кто его так назвал.')
setrow('MSG','sector',"That ring is beyond your hulls' range.",'Это кольцо вне досягаемости твоих корпусов.')
setrow('MSG','range','That hull is short-legged for a ring that far out. A bigger class, or a newer generation, can make it.','Этому корпусу не хватает дальности до этого кольца. Нужен класс побольше или новое поколение.')
setrow('GUIDE','p4.b2','Range is <b>class plus generation</b>. At generation 0 a courier reaches ring 2, a hauler ring 3, a freighter ring 4. Every drive mark pushes all three out by one ring.','Дальность = <b>класс плюс поколение</b>. На поколении 0 курьер достаёт до кольца 2, тягач до 3, грузовоз до 4. Каждая отметка двигателя двигает все три на одно кольцо дальше.')
setrow('GUIDE','p4.b4','A hull rated too short simply refuses the order. The chart marks every ring with the class it needs.','Корпус, которому не хватает дальности, просто не примет приказ. На карте у каждого кольца написано, какой класс нужен.')
setrow('GUIDE','p5.kicker','Further out means richer, more dangerous and dearer. There is no last ring.','Дальше — значит богаче, опаснее и дороже. Последнего кольца не существует.')
setrow('GUIDE','p5.b2','<b>Survey</b> (Earth tab) charts the next ring. It costs rations, fuel, metal and parts, and needs enough <b>settled worlds</b> — every world you have ever settled counts, even a spent one.','<b>Разведка</b> (вкладка Земля) наносит следующее кольцо. Стоит провизии, топлива, металла и деталей, и требует достаточно <b>заселённых миров</b> — считаются все, что ты когда-либо заселял, даже выработанные.')
setrow('GUIDE','p5.b3','You may chart a ring no hull of yours can reach yet. You will see it and not be able to touch it.','Нанести на карту кольцо, куда твои корпуса ещё не долетают, теперь можно. Ты будешь его видеть и не сможешь тронуть.')
setrow('UI','cSurvey','Charting the next ring needs enough settled worlds — every world you have ever settled counts, even a spent one. Settle more, then survey.','Нанести следующее кольцо можно, когда заселено достаточно миров — считаются все, что ты когда-либо заселял, даже выработанные. Засели больше, потом разведывай.')
setrow('UI','shSectorsN','{n} new ring(s)','новых колец: {n}')
setrow('UI','bigSurvey','Open the {s} ring','Открыть кольцо {s}')
setrow('UI','alertFoodBody','Earth has {n} years of rations and no farm on a line. Chart a ring and settle a farm.','У Земли провизии на {n} лет и ни одной фермы на линии. Нанеси новое кольцо и засели ферму.')
setrow('MSG','ok_survey','Ring {s} charted. New worlds are on the map.','Кольцо {s} нанесено. На карте новые миры.')
setrow('UI','surveyWhat','Worlds sit on rings around Earth. Charting opens ring {s}: new worlds appear on the map, farther out. It costs the resources below and needs the number of settled worlds shown — every world you have ever settled counts.','Миры стоят на кольцах вокруг Земли. Разведка открывает кольцо {s}: на карте появляются новые миры дальше от Земли. Стоит ресурсов ниже и требует показанного числа заселённых миров — считаются все миры, которые ты когда-либо заселял.')
def sub(t,k,en_pairs,ru_pairs):
    en,ru=cur[(t,k)]
    for a,b in en_pairs:
        assert a in en,(k,a); en=en.replace(a,b)
    for a,b in ru_pairs:
        assert a in ru,(k,a); ru=ru.replace(a,b)
    cur[(t,k)]=[en,ru]
sub('UI','nightB',[('Past the last charted sector','Past the last charted ring')],[('За последним нанесённым сектором','За последним нанесённым кольцом')])
sub('VOICE','night_dated.1',[('Past the last charted sector','Past the last charted ring')],[('За последним нанесённым сектором','За последним нанесённым кольцом')])
sub('GUIDE','p5.b4',[('by one sector','by one ring')],[('на сектор дальше','на кольцо дальше')])
setrow('UI','reach','Live worlds','Живых миров')
setrow('UI','needR','needs {n} live worlds','нужно живых миров: {n}')
setrow('MSG','needreach','Needs {n} live worlds — you have {r}. A world is live while a colony still stands on it.','Нужно живых миров: {n} — у тебя {r}. Мир живой, пока на нём стоит колония.')
setrow('MSG','reach','Not enough live worlds.','Живых миров слишком мало.')
setrow('UI','lineT','Hulls for this world — standing order','Суда для этого мира — постоянный приказ')
setrow('UI','awaiting','Free hulls — send them out','Свободные суда — отправь их')
setrow('UI','giveOrders','Pick a world below to send this hull there, or scrap it.','Выбери мир ниже — корпус пойдёт туда. Или спиши.')
N=[('UI','assignTo','Send to:','Отправить на:'),
 ('UI','assignHere','Send here','Отправить сюда'),
 ('UI','freeHulls','Free hulls at Earth','Свободные суда у Земли'),
 ('UI','freeNone','No free hull at Earth can reach this world. The standing order below builds new ones.','Ни один свободный корпус у Земли сюда не долетает. Постоянный приказ ниже построит новые.'),
 ('UI','yardsBlock','In the yards','На верфях'),
 ('UI','ringSignTitle','NEW RING · {s}','НОВОЕ КОЛЬЦО · {s}'),
 ('UI','ringSignGo','Ready to chart — click','Можно наносить — нажми'),
 ('UI','ringSignSettled','Settled worlds: {r} of {n} needed','Заселено миров: {r} из {n} нужных'),
 ('UI','noFreeTitle','NO FREE WORLDS LEFT','СВОБОДНЫХ МИРОВ БОЛЬШЕ НЕТ'),
 ('UI','noFreeBody','Every world on the charted rings is settled or spent. Chart a new ring — it is the only way to find more worlds. Without them the colonies run dry and Earth starves.','Все миры на нанесённых кольцах заселены или выработаны. Нанеси новое кольцо — другого способа найти новые миры нет. Без них колонии иссякнут, и Земля умрёт с голоду.'),
 ('UI','noFreeGo','Go to survey','К разведке'),
 ('UI','noFreeLater','Later','Позже'),
 ('UI','rangeWarn','Generation {g} hulls reach ring {n}. Free worlds farther out: {k} — they need the drive programme.','Корпуса поколения {g} долетают до кольца {n}. Свободных миров дальше: {k} — нужна программа двигателя.'),
 ('UI','newGenTitle','GENERATION {g} HULLS ARE READY','КОРПУСА ПОКОЛЕНИЯ {g} ГОТОВЫ'),
 ('UI','newGenBody','Build them in the yards (dock below).','Строй их на верфях (док внизу).'),
 ('UI','speedUnit','yr/s','лет/с'),
 ('UI','speedTip','Years of route covered per second at 1× game speed.','Лет пути в секунду при скорости игры 1×.'),
 ('MSG','ok_want_free','{p}: {n} × {c} wanted. A free hull at Earth goes first — no new build.','{p}: нужно {n} × {c}. Первым пойдёт свободный корпус у Земли — строить новый не придётся.'),
 ('MSG','ok_want_build','{p}: {n} × {c} wanted. No free hull of that class at Earth — the yards are building {k} new one(s) for {p}, ready in about {y} years.','{p}: нужно {n} × {c}. Свободного корпуса этого класса у Земли нет — верфи строят новых: {k} для {p}, готовы примерно через {y} лет.'),
 ('MSG','want_wait','{p}: {n} × {c} wanted. No free hull at Earth, and the yards cannot start a new one: {w}.','{p}: нужно {n} × {c}. Свободных корпусов у Земли нет, и верфи не могут начать новый: {w}.'),
 ('MSG','ok_assign','Hull {n} sent to {p}.','Корпус {n} отправлен на {p}.'),
]
for t,k,en,ru in N: newrow(t,k,en,ru)
ph=lambda x:sorted(re.findall(r'\{\w+\}',x))
for (t,k),(en,ru) in cur.items(): assert ph(en)==ph(ru),(t,k,ph(en),ph(ru))
left=[(t,k) for (t,k),(en,ru) in cur.items() if re.search(r'sector',en,re.I) or re.search(r'сектор|охват',ru,re.I)]
print("leftover sector/охват rows:",left)
base={(r[0],r[1]):[r[2],r[3]] for r in live}
new=[(t,k,v[0],v[1]) for (t,k),v in cur.items() if (t,k) not in base]
chg=[(t,k,v[0],v[1]) for (t,k),v in cur.items() if (t,k) in base and base[(t,k)]!=v]
open('new-texts.tsv','w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in new))
open('changed-texts.tsv','w',encoding='utf-8').write(''.join('\t'.join(r)+'\n' for r in chg))
print("new:",len(new),"changed:",len(chg))
