INK="#F2F1EC";RED="#FF2A1A"
DEFS='''<defs>
<linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#D9D8D2"/><stop offset=".55" stop-color="#8E8D88"/><stop offset="1" stop-color="#E9E8E2"/></linearGradient>
<linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5A44"/><stop offset=".55" stop-color="#FF2A1A"/><stop offset="1" stop-color="#B80F05"/></linearGradient>
<linearGradient id="gk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D1D21"/><stop offset="1" stop-color="#0B0B0C"/></linearGradient>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.5" dy="3" stdDeviation="2.2" flood-color="#000" flood-opacity=".7"/></filter>
<filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>'''
RING='<circle cx="60" cy="60" r="40" fill="none" stroke="{s}" stroke-width="{w}" stroke-dasharray="214 38" stroke-dashoffset="-32" transform="rotate(-70 60 60)"/>'
CHV='<g transform="translate(86 34) rotate(45) scale({k})"><polygon points="0,-16 14,14 0,6 -14,14" fill="{f}"/></g>'
mark=('<ellipse cx="60" cy="108" rx="34" ry="4.5" fill="#000" opacity=".55" filter="url(#bl)"/>'
 '<g filter="url(#sh)">'+RING.format(s="url(#gr)",w=8)+CHV.format(f="url(#gv)",k=1.5)+'</g>'
 '<g transform="translate(86 34) rotate(45) scale(1.5)"><polygon points="0,-16 14,14 0,6" fill="#fff" opacity=".28"/></g>')
small=RING.format(s=INK,w=10)+CHV.format(f=RED,k=1.75)
S='M28 14H92V60Q92 92 60 110Q28 92 28 60Z'
crest=(f'<g filter="url(#sh)"><path d="{S}" fill="url(#gk)" stroke="url(#gr)" stroke-width="4"/></g>'
 f'<clipPath id="cp"><path d="{S}"/></clipPath><g clip-path="url(#cp)"><rect x="26" y="12" width="68" height="10" fill="url(#gv)"/></g>'
 f'<g transform="translate(60 62) scale(.5) translate(-60 -62)"><g filter="url(#sh)">'+RING.format(s="url(#gr)",w=9)+CHV.format(f="url(#gv)",k=1.5)+'</g>'
 '<g transform="translate(86 34) rotate(45) scale(1.5)"><polygon points="0,-16 14,14 0,6" fill="#fff" opacity=".28"/></g></g>')
def svg(body,defs=True,name=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">{DEFS if defs else ""}{body}</svg>\n'
for n,b,d in [('mark-m7',mark,True),('mark-m7-small',small,False),('crest-m7',crest,True)]:
    open(n+'.svg','w',encoding='utf-8',newline='').write(svg(b,d))
h=open('marks-v1.html',encoding='utf-8').read();head=h[:h.index('<h1>')]
sz=''.join(f'<img src="mark-m7{"" if s>=32 else "-small"}.svg" width="{s}" height="{s}">' for s in (16,24,32,48,64))
szs=''.join(f'<img src="mark-m7-small.svg" width="{s}" height="{s}">' for s in (16,20,24,28,32))
body=f'''<h1>M7 — ИТОГ: ЗНАК, МАЛЫЙ ЗНАК, ГЕРБ</h1><p>Три файла: mark-m7.svg, mark-m7-small.svg, crest-m7.svg.</p>
<style>.hero{{display:flex;gap:24px;flex-wrap:wrap;align-items:center;margin-bottom:16px}}.hero img{{width:240px;height:240px;background:#0B0B0C;border:1px solid #2E2E33;padding:16px}}
.strip{{display:flex;align-items:center;gap:14px;margin:10px 0;background:#0B0B0C;border:1px solid #2E2E33;padding:10px 14px;max-width:700px}}.strip span{{font-weight:700;letter-spacing:.22em;font-size:14px}}.strip small{{color:#9C9B95;margin-left:auto}}</style>
<div class="hero"><img src="mark-m7.svg"><img src="mark-m7-small.svg"><img src="crest-m7.svg"></div>
<div class="strip"><img src="mark-m7-small.svg" width="22" height="22"><span>LAST BERTH</span><small>шапка игры, малый знак</small></div>
<div class="strip"><img src="mark-m7.svg" width="72" height="72"><span style="font-size:30px">LAST BERTH</span><small>экран запуска</small></div>
<div class="strip">{szs}<small>малый знак 16–32 px</small></div>
<div class="strip">{sz}<small>полный знак (до 32 px — малый)</small></div>
<div class="strip"><img src="crest-m7.svg" width="40" height="40"><img src="crest-m7.svg" width="64" height="64"><img src="crest-m7.svg" width="96" height="96"><small>герб 40/64/96</small></div></html>'''
open('marks-final.html','w',encoding='utf-8',newline='').write(head+body)
