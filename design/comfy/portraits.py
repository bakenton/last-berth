# Alexandra's portraits for the game: cut the flat light backdrop off, then line every pose up by the eyes
# (the yellow irises), so the head stays the same size and in the same place when her face changes.
#   py -3 -I design/comfy/portraits.py <folder with android_<pose>.png> design/alexandra
# Poses: bust → the avatar (a passport photo, 160×200, for the small form and the icon slots); full — kept whole, for the
# launch screen; the rest — the emotions in the window, fading out at the foot. Her calm face is talk; grief has the eyes
# closed, so it takes talk's hair-to-eyes height (same framing) and finds the face by the hair around it.
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd

W, H = 360, 450            # the window is 4:5
EYE_Y, HAIR = 120, 80      # where the eyes sit, and how far below the top of the hair (the scale: eyes apart change
                           # with the turn of the head, the hair-to-eyes height does not)

def cut(im):
    # the black outlines are the wall; background = what is behind the wall and touches the top edge,
    # or a closed pocket that looks exactly like the backdrop (between an arm and the body)
    h, w, _ = im.shape
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    bgc = np.median(border, 0)
    lum = im.mean(2); d = np.abs(im - bgc).max(2)
    lab, n = nd.label(~(lum < 205))
    idx = np.arange(1, n + 1)
    md = nd.mean(d, lab, idx); sd = nd.standard_deviation(d, lab, idx)
    top = set(np.unique(lab[0])) - {0}
    bg = np.zeros(n + 1, bool)
    for i in idx:
        bg[i] = i in top or (md[i - 1] < 4.5 and sd[i - 1] < 2.5)
    m = bg[lab]
    ring = nd.binary_dilation(m, iterations=2) & ~m   # the outline next to the backdrop: alpha from its darkness
    a = np.ones((h, w), np.float32); a[m] = 0
    a[ring] = np.clip((1 - lum / bgc.mean()) * 1.6, 0, 1)[ring]
    rgb = im.copy(); rgb[ring] = 0
    return np.dstack([rgb, a * 255])

def eyes(im):
    # the irises are the only saturated yellow in the picture; two biggest blobs in the upper half
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    y = (r > 170) & (g > 140) & (b < 110) & (r - b > 90)
    y[im.shape[0] // 2:] = False
    lab, n = nd.label(nd.binary_closing(y, iterations=2))
    if n < 2: raise SystemExit('eyes not found')
    sizes = nd.sum(y, lab, range(1, n + 1))
    cm = nd.center_of_mass(y, lab, range(1, n + 1))
    order = list(np.argsort(sizes)[::-1])
    a = order[0]   # the biggest blob is one eye; the other is the biggest one at least an eye's width away and level with it
    b = next(i for i in order[1:] if abs(cm[i][1] - cm[a][1]) > im.shape[1] * .05 and abs(cm[i][0] - cm[a][0]) < im.shape[0] * .04)
    (y1, x1), (y2, x2) = sorted([cm[a], cm[b]], key=lambda p: p[1])
    return (x1 + x2) / 2, (y1 + y2) / 2, abs(x2 - x1)

def hair(rgba, ex, ed):
    # the first row with anything in it, over the face
    col = rgba[:, max(0, int(ex - ed)):int(ex + ed), 3].max(1)
    return int(np.argmax(col > 128))

def place(rgba, ex, ey, s, fade=None, W=W, H=H, EYE_Y=EYE_Y):
    img = Image.fromarray(rgba.clip(0, 255).astype(np.uint8), 'RGBA')
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(img, (round(W / 2 - ex * s), round(EYE_Y - ey * s)), img)
    if fade:   # let the body go into the dark before the edge of the picture or of the window shows
        a = np.asarray(out).astype(np.float32)
        y0, y1 = fade
        k = np.clip((y1 - np.arange(H)) / (y1 - y0), 0, 1)[:, None]
        a[..., 3] *= k
        out = Image.fromarray(a.astype(np.uint8), 'RGBA')
    return out

src, dst = sys.argv[1], sys.argv[2]
def closed(rgba, d):
    # no irises to find: the top of the hair over the middle, the eyes d below it, between the hair at that height
    w = rgba.shape[1]
    top = hair(rgba, w / 2, w * .05)
    row = np.nonzero(rgba[top + d, :, 3] > 128)[0]
    return (row[0] + row[-1]) / 2, top + d, top

talk = None
for pose in ['bust', 'talk', 'happy', 'smile', 'sad', 'grief', 'surprised', 'alarm', 'confused', 'eureka', 'resolve', 'crossed', 'full']:
    im = np.asarray(Image.open(os.path.join(src, 'android_' + pose + '.png')).convert('RGB')).astype(np.float32)
    rgba = cut(im)
    if pose == 'full':
        Image.fromarray(rgba.clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(dst, 'full.webp'), quality=82, method=6)
        continue
    if pose == 'grief':
        ex, ey, top = closed(rgba, talk)
    else:
        ex, ey, ed = eyes(im)
        top = hair(rgba, ex, ed)
    if pose == 'talk': talk = round(ey - top)
    if pose == 'bust':   # the avatar: head and shoulders fill the frame
        place(rgba, ex, ey, 62 / (ey - top), None, 160, 200, 92).save(os.path.join(dst, 'avatar.webp'), quality=82, method=6)
        continue
    s = HAIR / (ey - top)
    end = min(H, EYE_Y + (im.shape[0] - ey) * s)   # where the picture ends after scaling, or the window does
    print(pose, 'eyes', round(ex), round(ey), 'apart', round(ed), 'scale', round(s, 3))
    place(rgba, ex, ey, s, (end - 50, end - 1)).save(os.path.join(dst, pose + '.webp'), quality=82, method=6)
