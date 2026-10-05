# v4.11 handoff: the tools ride inside the published page, so a new chat needs only Artifact read.
# Usage: python3 pack-tools.py  → rewrites artifact.html (and page.html) with <script id="lb-tools"> = base64 zip of TOOLS
# Unpack in a new chat: python3 pack-tools.py --unpack live.html  → writes the tools next to it. fonts-local.css (232 KB) is not packed: take it from the artifact's own tools/ folder (Artifact read copies it)
import sys, os, re, io, zipfile, base64
# v4.14 pipeline: sources may live apart from the page files — `cd work && TOOLS_DIR=../tools python3 ../tools/pack-tools.py`
SRC=os.environ.get('TOOLS_DIR','.')
TOOLS=['build.py','pack-tools.py','sim.js','mut.js','fc.js','texts-pull.js','sheet-merge.py','README.md','shots2.js','shots3.js',
       'regress.sh','regress-expect.tsv','sim-baseline.tsv','smoke.js','map.py']+sorted(f for f in os.listdir(SRC) if re.match(r'pw\d+\.js$',f))
if len(sys.argv)>2 and sys.argv[1]=='--unpack':
    s=open(sys.argv[2],encoding='utf-8').read(); m=re.search(r'<script type="application/octet-stream" id="lb-tools"[^>]*>(.*?)</script>',s,re.S)
    if not m: sys.exit('no lb-tools block')
    z=zipfile.ZipFile(io.BytesIO(base64.b64decode(m.group(1)))); z.extractall('.'); print('unpacked',len(z.namelist()),'files:',' '.join(z.namelist())); sys.exit()
buf=io.BytesIO(); z=zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED)
n=0
for f in TOOLS:
    if os.path.exists(os.path.join(SRC,f)): z.write(os.path.join(SRC,f),arcname=f); n+=1
z.close(); b64=base64.b64encode(buf.getvalue()).decode()
blk='<script type="application/octet-stream" id="lb-tools" data-files="%d">%s</script>'%(n,b64)
for fn in ('artifact.html','page.html'):
    if not os.path.exists(fn): continue
    s=open(fn,encoding='utf-8').read()
    s=re.sub(r'\n?<script type="application/octet-stream" id="lb-tools"[^>]*>.*?</script>','',s,flags=re.S)
    i=s.rfind('</body>'); s=(s[:i]+blk+'\n'+s[i:]) if i>=0 else s+blk
    open(fn,'w',encoding='utf-8').write(s)
print('packed',n,'files,',len(b64),'b64 chars')
