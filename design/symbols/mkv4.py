INK="#F2F1EC";RED="#FF2A1A"
RING='<circle cx="60" cy="60" r="40" fill="none" stroke="{s}" stroke-width="{w}" stroke-dasharray="214 38" stroke-dashoffset="-32" transform="rotate(-70 60 60)"/>'
CHV='<g transform="translate(86 34) rotate(45) scale(1.5)"><polygon points="0,-16 14,14 0,6 -14,14" fill="{f}" stroke="{st}" stroke-width="{sw}" stroke-linejoin="round"/></g>'
def flat(ring=INK,chev=RED,w=7): return RING.format(s=ring,w=w)+CHV.format(f=chev,st="none",sw=0)
defs='''<defs>
<linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#D9D8D2"/><stop offset=".55" stop-color="#8E8D88"/><stop offset="1" stop-color="#E9E8E2"/></linearGradient>
<linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5A44"/><stop offset=".55" stop-color="#FF2A1A"/><stop offset="1" stop-color="#B80F05"/></linearGradient>
<radialGradient id="gd" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1b1b1f"/><stop offset="1" stop-color="#0B0B0C"/></radialGradient>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.5" dy="3" stdDeviation="2.2" flood-color="#000" flood-opacity=".7"/></filter>
<filter id="gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>'''
# V1 layers
lay=''
for k in range(9,0,-1):
    f=f"hsl(0 0% {max(18,92-k*8)}%)"; r=f"hsl(5 85% {max(14,50-k*4)}%)"
    lay+=f'<g transform="translate({k*0.55} {k*0.9})">{flat(f,r)}</g>'
lay+=flat()
# V2 bevel
v2=f'<g filter="url(#sh)">{RING.format(s="url(#gr)",w=7)}{CHV.format(f="url(#gv)",st="#FF8A78",sw=0.5)}</g>'
v2+=RING.format(s="#fff",w=1.2).replace('r="40"','r="42.2"').replace('<circle','<circle opacity=".55"')
# V3 glow
v3=f'<circle cx="60" cy="60" r="56" fill="url(#gd)"/><g filter="url(#gl)" opacity=".85">{CHV.format(f=RED,st="none",sw=0)}</g>{RING.format(s=INK,w=7)}{CHV.format(f=RED,st="none",sw=0)}'+RING.format(s="#fff",w=1).replace('r="40"','r="42"').replace('<circle','<circle opacity=".35"')
# V4 metal + enamel
v4=f'<ellipse cx="60" cy="108" rx="34" ry="4.5" fill="#000" opacity=".55" filter="url(#gl)"/><g filter="url(#sh)">{RING.format(s="url(#gr)",w=8)}{CHV.format(f="url(#gv)",st="none",sw=0)}</g><g transform="translate(86 34) rotate(45) scale(1.5)"><polygon points="0,-16 14,14 0,6" fill="#fff" opacity=".28"/></g>'
V=[("0 · ЭТАЛОН: плоский M7","Для сравнения.",flat()),
("1 · СЛОИ","Вырезанные слои бумаги: плоская графика, но с глубиной. Остаётся в языке игры.",lay),
("2 · ФАСКА","Градиент по краю, тонкий блик, мягкая тень. Самый сдержанный.",v2),
("3 · СВЕЧЕНИЕ","Тёмная подложка, красное свечение у ковчега. Для экрана запуска.",v3),
("4 · МЕТАЛЛ + ЭМАЛЬ","Стальное кольцо, красная эмаль с бликом, тень на «полу».",v4)]
def card(i,t,d,g):
    return f'<div class="c"><svg viewBox="0 0 120 120">{defs if i==0 else ""}<g id="v{i}">{g}</g></svg><b>{t}</b><small>{d}</small><div class="row"><svg viewBox="0 0 120 120"><use href="#v{i}"/></svg><span>LAST BERTH</span></div></div>'
h=open('marks-v1.html',encoding='utf-8').read();head=h[:h.index('<h1>')]
out=head+'<h1>M7 — ОБЪЁМ В 2D</h1><p>Форма та же, меняется только подача объёма.</p><div class="g">'+''.join(card(i,*x) for i,x in enumerate(V))+'</div></html>'
open('marks-v4.html','w',encoding='utf-8',newline='').write(out)
