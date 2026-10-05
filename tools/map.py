# LAST BERTH — оглавление кода. Генерируется, руками не править.
#   python3 tools/map.py [work_dir] > MAP.md        (по умолчанию work/ рядом с tools/)
# Берёт верхний уровень core.js и ui.js: разделы (/* ---------- … ---------- */), function, var.
# Назначение — первая строка комментария над объявлением, иначе комментарий в первых строках тела,
# иначе хвостовой комментарий строки, иначе «≈ <начало кода>» (комментария нет — дописывать его в коде, не в MAP).
import re, sys, os
W = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'work')
SEC = re.compile(r'^/\* -{3,}\s*(.*?)\s*-{3,}')
FN = re.compile(r'^function\s+(\w+)\s*\(([^)]*)\)')
VAR = re.compile(r'^var\s+(\w+)\s*=')
def clean(t):
    t = re.sub(r'^\s*(/\*+|//+|\*)\s?', '', t); t = re.sub(r'\s*\*/\s*$', '', t)
    return re.sub(r'\s+', ' ', t).strip()
def tail_comment(line):
    m = re.search(r'(//|/\*)\s*(.+?)(\*/)?\s*$', line[60:]) if len(line) > 60 else None
    return clean(m.group(2)) if m else ''
def purpose(L, i, is_fn):
    j = i - 1
    while j >= 0 and not L[j].strip(): j -= 1
    if j >= 0 and (L[j].rstrip().endswith('*/') or L[j].lstrip().startswith('//')) and not SEC.match(L[j]):
        k = j                                   # walk up to the start of that comment block
        if L[j].rstrip().endswith('*/') and '/*' not in L[j]:
            while k > 0 and '/*' not in L[k]: k -= 1
        while L[k].lstrip().startswith('//') and k > 0 and L[k-1].lstrip().startswith('//'): k -= 1
        c = clean(L[k])
        if c and not SEC.match(L[k]): return c
    if is_fn:
        for k in range(i, min(i + min(3, span(L, i)), len(L))):
            if SEC.match(L[k]): break
            m = re.search(r'/\*\s*(.+?)(\*/|$)|//\s*(.+)$', L[k])
            if m: return clean(m.group(1) or m.group(3))
    return tail_comment(L[i]) or ('≈ ' + guess(L, i, is_fn))
def guess(L, i, is_fn):
    # no comment: show the code itself, shortest useful slice — the body of a one-liner, the value of a var,
    # or the first statement of a longer function
    l = L[i]
    if not is_fn: v = l.split('=', 1)[1].strip(); return re.sub(r'\s+', ' ', v)[:90]
    b = l[l.index('{') + 1:] if '{' in l else ''
    b = b.strip() or (L[i + 1].strip() if i + 1 < len(L) else '')
    return re.sub(r'\s+', ' ', b)[:90] or '—'
def span(L, i):
    d = 0; started = False
    for k in range(i, len(L)):
        for ch in re.sub(r"'(\\.|[^'\\])*'|\"(\\.|[^\"\\])*\"", '', L[k]):
            if ch == '{': d += 1; started = True
            elif ch == '}': d -= 1
        if started and d <= 0: return k - i + 1
        if not started and k > i + 2: return 1
    return len(L) - i
print('# MAP — оглавление core.js / ui.js\n')
print('Сгенерировано `python3 tools/map.py > MAP.md` после каждой правки кода. Не править руками.')
print('Навигация: `grep -n <имя> MAP.md` → `sed -n "<строка-40>,<строка+40>p" work/<файл>`. Код целиком не открывать.')
print('Формат: `строка  имя(аргументы) [длина]  назначение`. «≈ …» = комментария нет, показано начало кода.\n')
for fn in ('core.js', 'ui.js'):
    p = os.path.join(W, fn); L = open(p, encoding='utf-8').read().split('\n')
    print('## %s (%d строк)\n' % (fn, len(L))); print('```')
    for i, l in enumerate(L):
        m = SEC.match(l)
        if m: print('\n%5d  ## %s' % (i + 1, clean(m.group(1)).upper())); continue
        m = FN.match(l)
        if m:
            args = m.group(2).replace(' ', '')
            print('%5d  %s(%s) [%d]  %s' % (i + 1, m.group(1), args[:28], span(L, i), purpose(L, i, True)[:110])); continue
        m = VAR.match(l)
        if m: print('%5d  var %s  %s' % (i + 1, m.group(1), purpose(L, i, False)[:110]))
    print('```\n')
