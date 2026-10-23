# round 8: raw/H/*.png -> intro/cand/f1_H##.webp (1536x640) + sheets f1_H_sheet1..5.png (10 frames each, 2 columns, labelled)
import os, glob
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
raw = os.path.join(here, '..', 'intro', 'raw', 'H'); cand = os.path.join(here, '..', 'intro', 'cand')
files = sorted(glob.glob(os.path.join(raw, 'H*.png')))
for f in files:
    Image.open(f).convert('RGB').save(os.path.join(cand, 'f1_' + os.path.basename(f)[:-4] + '.webp'), quality=82, method=6)
try: font = ImageFont.truetype('arialbd.ttf', 22)
except OSError: font = ImageFont.load_default()
tw, th, g = 768, 320, 6
for s in range(0, len(files), 10):
    part = files[s:s + 10]; rows = (len(part) + 1) // 2
    sheet = Image.new('RGB', (tw * 2 + g, rows * th + (rows - 1) * g), (24, 24, 28))
    for i, f in enumerate(part):
        im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
        x, y = (i % 2) * (tw + g), (i // 2) * (th + g); sheet.paste(im, (x, y))
        d = ImageDraw.Draw(sheet); d.rectangle([x, y, x + 54, y + 30], fill=(0, 0, 0)); d.text((x + 6, y + 3), os.path.basename(f)[:-4], fill=(255, 200, 90), font=font)
    sheet.save(os.path.join(cand, 'f1_H_sheet%d.png' % (s // 10 + 1)))
print(len(files), 'frames')
