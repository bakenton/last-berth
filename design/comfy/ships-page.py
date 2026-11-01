# Build a ships mockup page from its template: the images and the map backdrop go in as data URIs.
#   py -3 -I design/comfy/ships-page.py <map backdrop .webp> [page] — page: ships-g1 (3D ships, design/ships)
#   ship-icons (icons, design/ship-icons) or ship-coffins (black coffins, design/ship-coffins); design/<page>.tpl.html → design/<page>.html
import sys, os, re, json, base64
from PIL import Image

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
page = sys.argv[2] if len(sys.argv) > 2 else 'ships-g1'
uri = lambda p: 'data:image/webp;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
d = os.path.join(root, {'ships-g1': 'ships', 'ship-icons': 'ship-icons', 'ship-coffins': 'ship-coffins', 'ship-hex': 'ship-icons', 'ship-rhomb': 'ship-icons', 'ship-facets': 'ship-icons'}[page])
# the 3D ships worth showing (29.10): the first haulers came out as wheeled trucks, the truss freighters show the backdrop through
KEEP = 'SAc1 SAc2 SAc3 SBc1 SBc2 SBc3 SAh4 SAh5 SBh4 SBh5 SBh6 SAf1 SAf4 SAf5 SBf2 SBf3 SBf5'.split() if page == 'ships-g1' else None
img = {}
for f in sorted(os.listdir(d)):
    if page not in ('ship-hex', 'ship-rhomb', 'ship-facets') and f.endswith('.webp') and (KEEP is None or f[:-5] in KEEP):   # these are drawn, not images
        w, h = Image.open(os.path.join(d, f)).size
        img[f[:-5]] = {'src': uri(os.path.join(d, f)), 'w': w, 'h': h}
val = {'bg': uri(sys.argv[1]), 'IMG': json.dumps(img)}
tpl = open(os.path.join(root, page + '.tpl.html'), encoding='utf-8', newline='').read()
out = re.sub(r'%%(\w+)%%', lambda m: val[m.group(1)], tpl)
open(os.path.join(root, page + '.html'), 'w', encoding='utf-8', newline='').write(out)
print(len(img), 'images,', len(out) // 1024, 'KB')
