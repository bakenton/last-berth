# Ship icons: cut the flat light backdrop off the ComfyUI side views and crop each ship tight.
#   py -3 -I design/comfy/ships-cut.py design/intro/raw/S design/ships
# Background = the pixels close to the border colour that touch the border; a soft edge from the distance to it.
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd

W = 480   # stored width; the map shows them at 28–56 px, the cards bigger

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.endswith('.png'): continue
    im = np.asarray(Image.open(os.path.join(src, f)).convert('RGB')).astype(np.float32)
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    d = np.abs(im - np.median(border, 0)).max(2)
    lab, _ = nd.label(d < 14)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    bg = nd.binary_opening(bg, iterations=1)
    a = np.where(bg, 0, 1).astype(np.float32)
    ring = nd.binary_dilation(bg, iterations=2) & ~bg   # anti-aliased rim: alpha from how far it is from the backdrop
    a[ring] = np.clip((d[ring] - 6) / 30, 0, 1)
    ys, xs = np.nonzero(a > .5)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = Image.fromarray(np.dstack([im, a * 255])[y0:y1, x0:x1].clip(0, 255).astype(np.uint8), 'RGBA')
    out = out.resize((W, round(out.height * W / out.width)), Image.LANCZOS)
    out.save(os.path.join(dst, f[:-4] + '.webp'), quality=85, method=6)
    print(f[:-4], out.size, os.path.getsize(os.path.join(dst, f[:-4] + '.webp')) // 1024, 'KB')
