INK="#F2F1EC";RED="#FF2A1A";BG="#0B0B0C"
S='M28 18H92V62Q92 92 60 108Q28 92 28 62Z'
shield=f'<path d="{S}" fill="none" stroke="{INK}" stroke-width="3"/>'
A=[
("A1 · ГОРИЗОНТ","Красное солнце садится за горизонт, шпиль впереди. Уже не «i».",
 f'<path d="M32 88A28 28 0 0 1 88 88Z" fill="{RED}"/><polygon points="60,16 66,88 54,88" fill="{INK}"/><rect x="22" y="88" width="76" height="4" fill="{INK}"/>'),
("A2 · МАЯК","Солнце на острие, как огонь маяка.",
 f'<circle cx="60" cy="30" r="12" fill="{RED}"/><polygon points="60,42 67,100 53,100" fill="{INK}"/><rect x="38" y="100" width="44" height="5" fill="{INK}"/>'),
("A3 · ПЕЧАТЬ","Исходный знак в круге. Для нашивок миров и штампов.",
 f'<circle cx="60" cy="60" r="48" fill="none" stroke="{INK}" stroke-width="3"/><g transform="translate(60 61) scale(.62) translate(-60 -68)"><circle cx="60" cy="32" r="13" fill="{RED}"/><polygon points="60,52 66,100 54,100" fill="{INK}"/><rect x="40" y="100" width="40" height="5" fill="{INK}"/></g>'),
("A4 · ДВЕ МАЧТЫ","Два причала разной высоты, солнце между ними.",
 f'<circle cx="60" cy="34" r="10" fill="{RED}"/><polygon points="38,46 44,100 32,100" fill="{INK}"/><polygon points="82,62 88,100 76,100" fill="{INK}"/><rect x="24" y="100" width="72" height="4" fill="{INK}"/>'),
("A5 · ВЗЛЁТ","Красная Земля внизу, шпиль уходит вверх. «Last» читается как уход.",
 f'<circle cx="60" cy="92" r="16" fill="{RED}"/><polygon points="60,10 67,70 53,70" fill="{INK}"/>'),
("A6 · ПУСТОЕ СОЛНЦЕ","Солнце — красное кольцо, внутри пусто. Пирс с тремя зубцами.",
 f'<circle cx="60" cy="34" r="15" fill="none" stroke="{RED}" stroke-width="5"/><polygon points="60,54 66,100 54,100" fill="{INK}"/><rect x="24" y="100" width="72" height="4" fill="{INK}"/><rect x="30" y="94" width="4" height="6" fill="{INK}"/><rect x="86" y="94" width="4" height="6" fill="{INK}"/>'),
]
E=[
("E1 · ШЕВРОН","Чистый щит: красная перевязь и шеврон-ковчег.",
 f'{shield}<rect x="28" y="18" width="64" height="9" fill="{RED}"/><polygon points="60,38 84,86 60,74 36,86" fill="{INK}"/>'),
("E2 · ТРИ КЛАССА","Курьер, тягач, грузовоз — три столбца разной высоты.",
 f'{shield}<rect x="28" y="18" width="64" height="9" fill="{RED}"/><rect x="40" y="56" width="11" height="32" fill="#45D4E8"/><rect x="54.5" y="44" width="11" height="44" fill="#FF6FB5"/><rect x="69" y="36" width="11" height="52" fill="{INK}"/>'),
("E3 · ПРИЧАЛЫ","Знак F внутри щита.",
 f'{shield}<rect x="42" y="34" width="36" height="8" fill="{INK}"/><rect x="42" y="48" width="26" height="8" fill="{INK}"/><rect x="42" y="62" width="16" height="8" fill="{INK}"/><rect x="42" y="76" width="8" height="8" fill="{RED}"/>'),
("E4 · ИГЛА В ЩИТЕ","A и E вместе: солнце, шпиль, пирс.",
 f'{shield}<circle cx="60" cy="42" r="10" fill="{RED}"/><polygon points="60,56 66,90 54,90" fill="{INK}"/><rect x="44" y="90" width="32" height="3" fill="{INK}"/>'),
("E5 · ПОЛОВИНА","Щит делён пополам: красная сторона — Земля, тёмная — путь.",
 f'<clipPath id="cl"><path d="{S}"/></clipPath><g clip-path="url(#cl)"><rect x="28" y="18" width="32" height="92" fill="{RED}"/></g>{shield}<circle cx="60" cy="44" r="9" fill="{INK}"/><polygon points="60,58 66,92 54,92" fill="{INK}"/>'),
("E6 · РУНДО","Круглая печать: игла, три класса дугой снизу.",
 f'<circle cx="60" cy="60" r="48" fill="none" stroke="{INK}" stroke-width="3"/><circle cx="60" cy="40" r="9" fill="{RED}"/><polygon points="60,52 66,82 54,82" fill="{INK}"/><rect x="38" y="82" width="44" height="3" fill="{INK}"/><rect x="43" y="92" width="8" height="8" fill="#45D4E8"/><rect x="56" y="92" width="8" height="8" fill="#FF6FB5"/><rect x="69" y="92" width="8" height="8" fill="{INK}"/>'),
]
def card(i,t,d,g):
    return f'<div class="c"><svg viewBox="0 0 120 120"><g id="{i}">{g}</g></svg><b>{t}</b><small>{d}</small><div class="row"><svg viewBox="0 0 120 120"><use href="#{i}"/></svg><span>LAST BERTH</span></div></div>'
h=open('marks-v1.html',encoding='utf-8').read()
head=h[:h.index('<h1>')]
out=head+'<h1>ЗНАКИ v2 — РАЗВИТИЕ A И E</h1><p>Верхний ряд — шпиль (A), нижний — щит (E). Внизу карточки — вид в шапке игры.</p>'
out+='<div class="g">'+''.join(card(f'a{i}',*x) for i,x in enumerate(A,1))+'</div><div style="height:12px"></div><div class="g">'+''.join(card(f'e{i}',*x) for i,x in enumerate(E,1))+'</div></html>'
open('marks-v2.html','w',encoding='utf-8',newline='').write(out)
