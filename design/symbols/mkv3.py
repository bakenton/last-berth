INK="#F2F1EC";RED="#FF2A1A";BG="#0B0B0C";CY="#45D4E8";PK="#FF6FB5";DIM="#5E5D58"
CH='<polygon points="0,-16 14,14 0,6 -14,14"'
def chev(x,y,rot,fill,sc=1):
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({sc})">{CH} fill="{fill}"/></g>'
S='M28 18H92V62Q92 92 60 108Q28 92 28 62Z'
shield=f'<path d="{S}" fill="none" stroke="{INK}" stroke-width="3"/>'
def ring(r,len_,rest,start,color,w=14):
    return f'<circle cx="60" cy="60" r="{r}" fill="none" stroke="{color}" stroke-width="{w}" stroke-dasharray="{len_} {rest}" transform="rotate({start} 60 60)"/>'
C=2*3.14159*38
segs=[(90,RED),(55,INK),(80,DIM)];gap=(C-225)/3
tri='';pos=-90
for L,col in segs:
    tri+=ring(38,L,C-L,pos,col);pos+=(L+gap)/C*360
ticks=''.join(f'<rect x="58.5" y="18" width="3" height="8" fill="{INK}" transform="rotate({i*30} 60 60)"/>' for i in range(1,12))
M=[
("M1 · ОТХОД","Земля с трещиной (выработана) остаётся, ковчег уходит по пунктиру. Вся история в одном кадре.",
 f'<circle cx="42" cy="80" r="24" fill="{INK}"/><path d="M24 68L40 78L35 90L52 100" fill="none" stroke="{RED}" stroke-width="3.5"/><path d="M62 62L76 48" stroke="{INK}" stroke-width="2.5" stroke-dasharray="2 5" stroke-linecap="round"/>{chev(88,34,45,RED,1.1)}'),
("M2 · ТРИ ДОЛИ","Кольцо делится на тех, кто улетает (красное), спит (белое) и остаётся (серое). Внутри — ковчег. Это ровно строка «500 sail · 300 wake · 2316 stay».",
 f'{tri}{chev(60,60,0,INK,1.1)}'),
("M3 · НОЧЬ","Ночь (красное кольцо) накрывает Землю, ковчег уходит из тени.",
 f'<circle cx="46" cy="64" r="30" fill="{INK}"/><circle cx="70" cy="64" r="30" fill="{BG}" stroke="{RED}" stroke-width="3.5"/>{chev(98,24,35,INK,.95)}'),
("M4 · ЯКОРЬ","Якорь = причал. Кольцо — красная Земля, лапы — наконечники ковчегов.",
 f'<circle cx="60" cy="22" r="9" fill="none" stroke="{RED}" stroke-width="4.5"/><rect x="57" y="32" width="6" height="60" fill="{INK}"/><rect x="44" y="40" width="32" height="5" fill="{INK}"/><path d="M30 70Q60 112 90 70" fill="none" stroke="{INK}" stroke-width="6"/><polygon points="30,58 22,76 38,76" fill="{INK}"/><polygon points="90,58 82,76 98,76" fill="{INK}"/>'),
("M5 · ЧАСЫ","Двенадцать делений до Ночи, последнее красное; в центре ковчег ждёт отхода.",
 f'<circle cx="60" cy="60" r="48" fill="none" stroke="{INK}" stroke-width="3"/>{ticks}<rect x="57.5" y="16" width="5" height="14" fill="{RED}"/>{chev(60,62,0,INK,1.5)}'),
("M6 · ПОСЛЕДНИЙ ПРИЧАЛ","Курьер, тягач, грузовоз у пирса, а четвёртое место пусто. Это и есть название.",
 f'<rect x="14" y="86" width="92" height="4" fill="{INK}"/><polygon points="20,86 20,64 36,64 42,75 42,86" fill="{CY}"/><polygon points="46,86 46,56 66,56 66,86" fill="{PK}"/><polygon points="70,86 70,44 78,40 86,44 86,86" fill="{INK}"/><rect x="90" y="40" width="16" height="46" fill="none" stroke="{RED}" stroke-width="3" stroke-dasharray="5 4"/>'),
("M7 · РАЗРЫВ","Кольцо Земли разомкнуто, из разрыва выходит ковчег.",
 f'<circle cx="60" cy="60" r="40" fill="none" stroke="{INK}" stroke-width="7" stroke-dasharray="214 38" stroke-dashoffset="-32" transform="rotate(-70 60 60)"/>{chev(86,34,45,RED,1.5)}'),
("M8 · ЩИТ: ФЛОТ — КОВЧЕГ — ЗЕМЛЯ","Сверху три класса судов, в середине ковчег, внизу Земля с трещиной.",
 f'{shield}<rect x="42" y="30" width="9" height="9" fill="{CY}"/><rect x="55.5" y="30" width="9" height="9" fill="{PK}"/><rect x="69" y="30" width="9" height="9" fill="{INK}"/>{chev(60,58,0,RED,1)}<circle cx="60" cy="86" r="11" fill="{INK}"/><path d="M52 82L60 86L57 92" fill="none" stroke="{BG}" stroke-width="2"/>'),
("M9 · ЩИТ: ТРИ ДОЛИ","Герб из знака M2.",
 f'{shield}<g transform="translate(60 56) scale(.5) translate(-60 -60)">{tri}{chev(60,60,0,INK,1.1)}</g>'),
("M10 · ЩИТ: НОЧЬ","Герб из знака M3: красная перевязь, как у прошлых щитов.",
 f'{shield}<rect x="28" y="18" width="64" height="9" fill="{RED}"/><g transform="translate(60 62) scale(.55) translate(-60 -60)"><circle cx="46" cy="64" r="30" fill="{INK}"/><circle cx="70" cy="64" r="30" fill="{BG}" stroke="{RED}" stroke-width="4"/>{chev(98,24,35,INK,.95)}</g>'),
]
def card(i,t,d,g):
    return f'<div class="c"><svg viewBox="0 0 120 120"><g id="{i}">{g}</g></svg><b>{t}</b><small>{d}</small><div class="row"><svg viewBox="0 0 120 120"><use href="#{i}"/></svg><span>LAST BERTH</span></div></div>'
h=open('marks-v1.html',encoding='utf-8').read()
head=h[:h.index('<h1>')]
out=head+'<h1>ЗНАКИ v3 — СМЫСЛ ВСЕЙ ИГРЫ</h1><p>Земля выработана, ковчег уходит в Ночь, кто не на причале — остаётся. Каждый знак пересказывает это по-своему.</p><div class="g">'+''.join(card(f'm{i}',*x) for i,x in enumerate(M,1))+'</div></html>'
open('marks-v3.html','w',encoding='utf-8',newline='').write(out)
