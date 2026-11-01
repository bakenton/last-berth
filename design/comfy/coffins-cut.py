# Black coffin ships (shipsC.js) off the light backdrop: the soft shadow under them defeats a border flood, so the mask is
# "dark or yellow", the biggest blob with its holes filled; crop tight; the top-down ones came out vertical, so turn them nose to the right (the ramp or the engines are the rear).
#   py -3 -I design/comfy/coffins-cut.py design/intro/raw/Z design/ship-coffins
import sys, os, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

SIDE = 240   # the longest side stored; the map shows them at 24–60 px
TURN = {'ZTc3': -90, 'ZTh1': -90, 'ZTh2': -90, 'ZTh3': -90}
SKIP = {'ZTc1'}   # the backdrop shows through its ramp

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.endswith('.png') or f[:-4] in SKIP: continue
    im = np.asarray(Image.open(os.path.join(src, f)).convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    m = (im.max(2) < 92) | ((r - b > 110) & (r > 150))
    lab, n = nd.label(m)
    m = nd.binary_fill_holes(lab == 1 + np.argmax(nd.sum(m, lab, range(1, n + 1))))
    a = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)))
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = Image.fromarray(np.dstack([im, a])[y0:y1, x0:x1].astype(np.uint8), 'RGBA')
    if f[:-4] in TURN: out = out.rotate(TURN[f[:-4]], expand=True)
    s = SIDE / max(out.size)
    out = out.resize((round(out.width * s), round(out.height * s)), Image.LANCZOS)
    out.save(os.path.join(dst, f[:-4] + '.webp'), quality=88, method=6)
print(len(os.listdir(dst)), 'ships')
