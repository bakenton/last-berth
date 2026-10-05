import re,sys
for n in sys.argv[1:]:
    s=open(n+'.js',encoding='utf-8').read()
    s=re.sub(r"await (p\.(?:locator\([^;]*?\)\.first\(\)|screenshot))(\.screenshot)?\((\{[^;]*?\})\);", lambda m: "try{ await "+m.group(1)+(m.group(2) or '')+"("+m.group(3)+") }catch(e){}", s)
    open(n+'x.js','w',encoding='utf-8').write(s)
