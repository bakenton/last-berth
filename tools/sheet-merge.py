# LAST BERTH — make the full sheet CSV Nikita imports (Файл → Импортировать → Загрузка → «Заменить текущий лист»).
# python3 sheet-merge.py sheet.csv page.html out.csv
#   sheet.csv = the current Google Sheet (Drive download_file_content, exportMimeType text/csv, base64 → file)
#   page.html = the build whose texts must end up in the sheet
# Keeps every sheet row and its where/note columns; replaces en/ru/status with the build's value for rows the build
# has; appends build rows the sheet lacks. Then prove it: `node texts-pull.js out.csv copy-of-page.html` must report
# no changed / added / dropped.
import csv,io,json,re,sys
sheet,page,out=sys.argv[1:4]
rows=list(csv.reader(open(sheet,encoding='utf-8-sig')))
hdr=rows[0]; body=[r+['']*(len(hdr)-len(r)) for r in rows[1:] if any(x.strip() for x in r)]
col={h:i for i,h in enumerate(hdr)}
built=json.loads(re.search(r'id="lb-texts" data-url="[^"]*">(.*?)</script>',open(page).read(),re.S).group(1))
idx={(r[col['table']],r[col['key']]):r for r in body}
upd=add=0
for t,k,en,ru in built:
    r=idx.get((t,k))
    if r is None:
        r=['']*len(hdr); r[col['table']]=t; r[col['key']]=k; body.append(r); idx[(t,k)]=r; add+=1
    elif r[col['en']]==en and r[col['ru']]==ru and r[col['status']]=='live': continue
    else: upd+=1
    r[col['en']]=en; r[col['ru']]=ru; r[col['status']]='live'
w=csv.writer(open(out,'w',encoding='utf-8',newline='')); w.writerow(hdr); w.writerows(body)
print('sheet rows',len(body),'· updated',upd,'· appended',add)
