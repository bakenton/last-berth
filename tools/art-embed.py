# LAST BERTH — портреты Александры для сборки (игра — один HTML-файл, build.py вшивает их base64 в <style>).
#   py -3 tools/art-embed.py   → work/web/alexandra/*.webp (файлы в git; build.py делает из них классы .ava, .fc-<поза>, .afull)
# Источник — design/alexandra/*.webp (ComfyUI, вырезка design/comfy/portraits.py). Решение Никиты 04.11: встроить.
# Размер под экран ×2 (ретина): аватарка 160×200 и позы 360×450 идут как есть (на экране до 80×100 и 180×225),
# в полный рост 768×1344 ужимается до высоты 720 (на экране до 360).
# До v4.50 здесь был плейсхолдер 15.10 (design/alexandra-placeholder.webp → work/web/art.css), он убран.
import os, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'design', 'alexandra')
OUT = os.path.join(ROOT, 'work', 'web', 'alexandra')
FULL_H = 720

os.makedirs(OUT, exist_ok=True)
total = 0
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.webp'):
        continue
    a, b = os.path.join(SRC, f), os.path.join(OUT, f)
    if f == 'full.webp':
        im = Image.open(a).convert('RGBA')
        w, h = im.size
        im = im.resize((round(w * FULL_H / h), FULL_H), Image.LANCZOS)
        im.save(b, 'WEBP', quality=84, method=6)
    else:
        shutil.copyfile(a, b)
    total += os.path.getsize(b)
    print(f, Image.open(b).size, round(os.path.getsize(b) / 1024), 'KB')
print('alexandra:', round(total / 1024), 'KB webp ->', round(total * 4 / 3 / 1024), 'KB base64')
