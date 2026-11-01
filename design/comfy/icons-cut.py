# Ship icon sets (shipsI.js): each frame holds three icons on black — split it at the two widest empty column gaps,
# crop each icon tight, alpha from brightness (light marks on black), save as design/ship-icons/<id>_<c|h|f>.webp.
#   py -3 -I design/comfy/icons-cut.py design/intro/raw/Y design/ship-icons
import sys, os, numpy as np
from PIL import Image

H = 96   # stored height; the map shows them at 20–40 px

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.endswith('.png'): continue
    im = np.asarray(Image.open(os.path.join(src, f)).convert('RGB')).astype(np.float32)
    a = np.clip((im.max(2) - 18) / 60, 0, 1)
    cols = np.nonzero(a.max(0) > .5)[0]
    gaps = sorted(range(len(cols) - 1), key=lambda i: cols[i + 1] - cols[i])[-2:]
    cuts = sorted(gaps)
    spans = [(cols[0], cols[cuts[0]]), (cols[cuts[0] + 1], cols[cuts[1]]), (cols[cuts[1] + 1], cols[-1])]
    for k, (x0, x1) in zip('chf', spans):
        sub = a[:, x0:x1 + 1]
        rows = np.nonzero(sub.max(1) > .5)[0]
        y0, y1 = rows[0], rows[-1] + 1
        rgb = im[y0:y1, x0:x1 + 1] / np.maximum(a[y0:y1, x0:x1 + 1, None], 1e-3)   # un-premultiply the dark edge
        out = Image.fromarray(np.dstack([rgb.clip(0, 255), sub[y0:y1] * 255]).astype(np.uint8), 'RGBA')
        s = H / max(out.width, out.height)
        out = out.resize((max(1, round(out.width * s)), max(1, round(out.height * s))), Image.LANCZOS)
        out.save(os.path.join(dst, f[:-4] + '_' + k + '.webp'), quality=90, method=6)
print(len(os.listdir(dst)), 'icons')
