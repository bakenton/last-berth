# our hex script (menu-v1.html, variants 22-24: hglyph) rendered as a reference sheet for FLUX.2 klein:
# vertical columns of glyphs in the brand yellow on black, like engraved tomb script. -> design/intro/ref/glyphs-hex.png
import math, os
from PIL import Image, ImageDraw, ImageFilter
def rng(s):
    st = [s]
    def f():
        st[0] = (st[0] * 1664525 + 1013904223) % 4294967296; return st[0] / 4294967296
    return f
HN = [(0, 0)] + [(math.cos(math.radians(30 + 60 * k)) * .78, math.sin(math.radians(30 + 60 * k)) * .78) for k in range(6)]
def hglyph(ch):
    rg = rng(ord(ch.lower()) * 97 + 13); out = []; ns = 1 + (1 if rg() < .55 else 0)
    for _ in range(ns):
        n = 2 + int(rg() * 3); cur = int(rg() * 7); pts = [HN[cur]]
        for _ in range(1, n):
            nx = cur; g = 0
            while nx == cur and g < 9: nx = int(rg() * 7); g += 1
            pts.append(HN[nx]); cur = nx
        out.append(pts)
    return out
W = H = 1024; YEL = (255, 210, 63)
words = ['helm', 'alexandra', 'lastberth', 'ark', 'worlds', 'night', 'people', 'shift']
img = Image.new('RGB', (W, H), (6, 6, 8)); d = ImageDraw.Draw(img)
cols = len(words); cw = W / cols; r = cw * .32
for ci, w in enumerate(words):
    cx = cw * (ci + .5)
    for li, ch in enumerate((w * 3)[:9]):
        cy = 70 + li * (r * 2.55)
        for pts in hglyph(ch):
            d.line([(cx + x * r, cy + y * r) for x, y in pts], fill=YEL, width=max(3, int(r * .16)), joint='curve')
glow = img.filter(ImageFilter.GaussianBlur(9))
out = Image.blend(img, glow, .35); out = Image.composite(img, out, img.convert('L').point(lambda v: 255 if v > 40 else 0))
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'intro', 'ref', 'glyphs-hex.png'); out.save(dst); print(dst)
