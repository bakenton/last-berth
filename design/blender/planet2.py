# LAST BERTH — main menu, planet v2 (Blender 4.4, Cycles/HIP). Run:
#   blender -b --factory-startup --python design/blender/planet2.py -- <out.png> [--preview]
# A dead water world: dark glossy ocean, arid continents with mountain ranges, a thin haze at the limb, and the vessel-base
# on a rocky pad at the horizon: tiers, hangars, towers, landed ships, floodlights, beacons, thousands of lit windows.
# Transparent background; the page draws the stars and the orbit. Draft: lives in design/, the game is not touched.
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'C:/Temp/planet2.png'
PREVIEW = '--preview' in argv
WITH_BASE = '--base' in argv
RES = (1280, 760) if PREVIEW else (2560, 1520)
SAMPLES = 48 if PREVIEW else 256

RP, H, HORIZON, FOV = 1000.0, 70.0, 0.37, 38.0
PHI, XOFF = 0.34, 125.0             # where the base stands
def _arg(name, default):
    for a in argv:
        if a.startswith('--' + name + '='): return a.split('=', 1)[1]
    return default
OFFS = tuple(float(v) for v in _arg('off', '210,40,90').split(','))      # which part of the noise is in view
LAND_T = float(_arg('land', '0.49'))                                        # sea level in the continent noise
MODE = _arg('mode', 'day')                                                  # day | dawn | night
SUN_YAW, SUN_DELTA = {'day': (35.0, 12.0), 'dawn': (17.0, -0.75), 'night': (24.0, -9.0)}[MODE]
LIGHTS = {'day': 0.0, 'dawn': 1.2, 'night': 3.6}[MODE]                    # strength of the city lights
_dip = math.acos(RP / (RP + H)); _off = math.atan((1 - 2 * HORIZON) * math.tan(math.radians(FOV) / 2)); _pitch = _dip - _off
_fwd = Vector((0, math.cos(_pitch), -math.sin(_pitch))); _rgt = Vector((1, 0, 0)); _upc = Vector((0, math.sin(_pitch), math.cos(_pitch)))
_e = -_off + math.radians(SUN_DELTA); _y = math.radians(SUN_YAW)
SUN_DIR = (_fwd * math.cos(_e) * math.cos(_y) + _rgt * math.cos(_e) * math.sin(_y) + _upc * math.sin(_e)).normalized()

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
cp = bpy.context.preferences.addons['cycles'].preferences
cp.compute_device_type = 'HIP'; cp.get_devices()
for d in cp.devices: d.use = (d.type == 'HIP')
sc.cycles.device = 'GPU'
sc.cycles.feature_set = 'EXPERIMENTAL'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.cycles.dicing_rate = 4.0 if PREVIEW else 1.6
sc.render.resolution_x, sc.render.resolution_y = RES
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'

# ======================= node helpers =======================
def new_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    for n in list(m.node_tree.nodes): m.node_tree.nodes.remove(n)
    return m
class B:
    def __init__(s, tree): s.t = tree
    def node(s, typ, **kw):
        n = s.t.nodes.new(typ)
        for k, v in kw.items(): setattr(n, k, v)
        return n
    def put(s, sock, v):
        if isinstance(v, (int, float)): sock.default_value = v
        elif isinstance(v, (tuple, list)): sock.default_value = v
        else: s.t.links.new(v, sock)
    def math(s, op, a, b=None, clamp=False):
        n = s.node('ShaderNodeMath', operation=op, use_clamp=clamp); s.put(n.inputs[0], a)
        if b is not None: s.put(n.inputs[1], b)
        return n.outputs[0]
    def mrange(s, v, a, b, c, d, smooth=True):
        n = s.node('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP' if smooth else 'LINEAR', clamp=True)
        s.put(n.inputs['Value'], v); s.put(n.inputs['From Min'], a); s.put(n.inputs['From Max'], b); s.put(n.inputs['To Min'], c); s.put(n.inputs['To Max'], d)
        return n.outputs['Result']
    def noise(s, vec, scale, detail=6, rough=.55, typ='FBM', lac=2.0):
        n = s.node('ShaderNodeTexNoise', noise_dimensions='3D', noise_type=typ)
        n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
        try: n.inputs['Lacunarity'].default_value = lac
        except KeyError: pass
        s.put(n.inputs['Vector'], vec); return n.outputs['Fac']
    def mix_rgb(s, fac, c1, c2):
        n = s.node('ShaderNodeMixRGB', blend_type='MIX'); s.put(n.inputs['Fac'], fac); s.put(n.inputs['Color1'], c1); s.put(n.inputs['Color2'], c2); return n.outputs[0]
    def vadd(s, a, vec):
        n = s.node('ShaderNodeVectorMath', operation='ADD'); s.put(n.inputs[0], a); n.inputs[1].default_value = vec; return n.outputs[0]

# ======================= the planet =======================
bpy.ops.mesh.primitive_uv_sphere_add(radius=RP, segments=384, ring_count=192, location=(0, 0, 0))
planet = bpy.context.object; planet.name = 'Planet'
bpy.ops.object.shade_smooth()
sub = planet.modifiers.new('Sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = 1; sub.render_levels = 1
planet.cycles.use_adaptive_subdivision = True
mat = new_mat('World'); planet.data.materials.append(mat); mat.displacement_method = 'BOTH'
b = B(mat.node_tree)
P = b.node('ShaderNodeTexCoord').outputs['Object']
big = b.noise(b.vadd(P, OFFS), 0.0016, 7, .55)                       # continents
land = b.mrange(big, LAND_T, LAND_T + .01, 0, 1)                                          # 0 = water, 1 = land
inland = b.mrange(big, LAND_T + .005, LAND_T + .16, 0, 1)
ridges = b.noise(P, 0.0065, 8, .62, 'RIDGED_MULTIFRACTAL', 2.2)                # mountain ranges
hills = b.noise(P, 0.02, 6, .5)
micro = b.noise(P, 0.35, 5, .55)
elev = b.math('MULTIPLY', b.math('MAXIMUM', b.math('SUBTRACT', big, LAND_T), 0.0), 120.0)
elev = b.math('ADD', elev, b.math('MULTIPLY', b.math('MULTIPLY', b.math('POWER', b.mrange(ridges, .15, .75, 0, 1), 1.6), inland), 230.0))
elev = b.math('ADD', elev, b.math('MULTIPLY', b.math('MULTIPLY', hills, inland), 7.0))
elev = b.math('ADD', elev, b.math('MULTIPLY', micro, 1.2))
height = b.math('MULTIPLY', elev, land)
disp = b.node('ShaderNodeDisplacement'); disp.inputs['Midlevel'].default_value = 0.0; disp.inputs['Scale'].default_value = 1.0; b.put(disp.inputs['Height'], height)
# colours: shallow-to-deep water, shore sand, arid plains, rock, pale snow on the peaks
depth_c = b.mrange(big, LAND_T - .1, LAND_T, 0, 1)
water_col = b.mix_rgb(depth_c, (.004, .016, .03, 1), (.03, .15, .19, 1))
wat = b.node('ShaderNodeBsdfPrincipled'); wat.inputs['Roughness'].default_value = .05; wat.inputs['Metallic'].default_value = 0.0
try: wat.inputs['Specular IOR Level'].default_value = 0.6
except KeyError: pass
b.t.links.new(water_col, wat.inputs['Base Color'])
tint = b.noise(P, 0.012, 5, .55)
plain = b.mix_rgb(tint, (.27, .19, .13, 1), (.15, .115, .09, 1))
sand = b.mix_rgb(tint, (.42, .36, .26, 1), (.3, .25, .18, 1))
rock = b.mix_rgb(tint, (.30, .28, .26, 1), (.17, .16, .15, 1))
c_land = b.mix_rgb(b.mrange(big, LAND_T + .01, LAND_T + .04, 0, 1), sand, plain)
c_land = b.mix_rgb(b.mrange(elev, 20.0, 80.0, 0, 1), c_land, rock)
c_land = b.mix_rgb(b.mrange(elev, 105.0, 150.0, 0, 1), c_land, (.8, .83, .88, 1))
dry = b.node('ShaderNodeBsdfPrincipled'); dry.inputs['Roughness'].default_value = .88
b.t.links.new(c_land, dry.inputs['Base Color'])
bumpn = b.node('ShaderNodeBump'); bumpn.inputs['Strength'].default_value = 1.0; b.put(bumpn.inputs['Height'], b.math('ADD', elev, b.math('MULTIPLY', micro, 3.0)))
b.t.links.new(bumpn.outputs['Normal'], dry.inputs['Normal'])
mixs = b.node('ShaderNodeMixShader'); b.put(mixs.inputs['Fac'], b.mrange(big, LAND_T - .005, LAND_T + .007, 0, 1))
b.t.links.new(wat.outputs[0], mixs.inputs[1]); b.t.links.new(dry.outputs[0], mixs.inputs[2])
out = b.node('ShaderNodeOutputMaterial'); b.t.links.new(disp.outputs[0], out.inputs['Displacement'])
if LIGHTS > 0:
    pop = b.mrange(b.noise(b.vadd(P, (90, -40, 310)), 0.004, 6, .6), .22, .42, 0, 1)
    coast = b.math('SUBTRACT', 1.0, b.mrange(big, LAND_T, LAND_T + .06, 0, 1))
    wide = b.math('ADD', .5, b.math('MULTIPLY', coast, 1.1))
    def dots(cell, r, prob, seed):
        v = b.node('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='F1'); v.inputs['Scale'].default_value = 1.0 / cell; b.put(v.inputs['Vector'], b.vadd(P, (seed, seed * .7, -seed * 1.3)))
        w = b.node('ShaderNodeTexWhiteNoise', noise_dimensions='3D'); b.put(w.inputs['Vector'], v.outputs['Position'])
        return b.math('MULTIPLY', b.math('POWER', b.mrange(v.outputs['Distance'], 0.0, r, 1, 0), 1.6), b.math('GREATER_THAN', w.outputs['Value'], 1.0 - prob))
    rv = b.node('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='DISTANCE_TO_EDGE'); rv.inputs['Scale'].default_value = 1.0 / 46.0; b.put(rv.inputs['Vector'], P)
    roads = b.mrange(rv.outputs['Distance'], .022, .003, 0, 1)
    towns = b.math('ADD', b.math('ADD', b.math('MULTIPLY', dots(3.4, .2, .7, 5.0), .8), b.math('MULTIPLY', dots(8.0, .17, .8, 11.0), 1.3)), b.math('MULTIPLY', dots(26.0, .14, .75, 37.0), 3.0))
    glow_m = b.math('MULTIPLY', b.math('MULTIPLY', land, pop), b.math('MULTIPLY', wide, b.math('ADD', b.math('MULTIPLY', roads, .28), towns)))
    warm = b.mix_rgb(b.noise(P, 0.05, 3, .5), (1.0, .66, .28, 1), (1.0, .85, .6, 1))
    em = b.node('ShaderNodeEmission'); b.t.links.new(warm, em.inputs['Color']); b.put(em.inputs['Strength'], b.math('MULTIPLY', glow_m, LIGHTS))
    ad = b.node('ShaderNodeAddShader'); b.t.links.new(mixs.outputs[0], ad.inputs[0]); b.t.links.new(em.outputs[0], ad.inputs[1])
    b.t.links.new(ad.outputs[0], out.inputs['Surface'])
else:
    b.t.links.new(mixs.outputs[0], out.inputs['Surface'])

# thin clouds and the haze of the limb
bpy.ops.mesh.primitive_uv_sphere_add(radius=RP + 5, segments=128, ring_count=64); cl = bpy.context.object; cl.name = 'Clouds'; bpy.ops.object.shade_smooth()
cm = new_mat('Clouds'); cl.data.materials.append(cm); bc = B(cm.node_tree)
cn = bc.noise(bc.node('ShaderNodeTexCoord').outputs['Object'], 0.007, 9, .6)
ca = bc.mrange(cn, .58, .72, 0, .85)
tr = bc.node('ShaderNodeBsdfTransparent'); df = bc.node('ShaderNodeBsdfDiffuse'); df.inputs['Color'].default_value = (.9, .92, .95, 1)
mx = bc.node('ShaderNodeMixShader'); bc.put(mx.inputs['Fac'], ca); bc.t.links.new(tr.outputs[0], mx.inputs[1]); bc.t.links.new(df.outputs[0], mx.inputs[2])
bc.t.links.new(mx.outputs[0], bc.node('ShaderNodeOutputMaterial').inputs['Surface'])
bpy.ops.mesh.primitive_uv_sphere_add(radius=RP + 14, segments=128, ring_count=64); at = bpy.context.object; at.name = 'Haze'; bpy.ops.object.shade_smooth()
at.visible_shadow = False
am = new_mat('Haze'); at.data.materials.append(am); ba = B(am.node_tree)
lw = ba.node('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = .5
rim = ba.math('POWER', lw.outputs['Facing'], 5.0)         # Facing: 1 at the limb of the shell
geo = ba.node('ShaderNodeNewGeometry'); sd = ba.node('ShaderNodeVectorMath', operation='DOT_PRODUCT'); ba.t.links.new(geo.outputs['Position'], sd.inputs[0])
nrm_s = ba.node('ShaderNodeVectorMath', operation='NORMALIZE'); ba.t.links.new(geo.outputs['Position'], nrm_s.inputs[0]); ba.t.links.new(nrm_s.outputs[0], sd.inputs[0]); sd.inputs[1].default_value = tuple(SUN_DIR)
gold = ba.mrange(sd.outputs['Value'], .25, .97, 0, 1)
em = ba.node('ShaderNodeEmission'); ba.t.links.new(ba.mix_rgb(gold, (.35, .6, 1.0, 1), (1.0, .62, .22, 1)), em.inputs['Color'])
ba.put(em.inputs['Strength'], ba.math('MULTIPLY', rim, ba.math('ADD', .8, ba.math('MULTIPLY', gold, 4.5 if MODE != 'day' else 0.0))))
tr2 = ba.node('ShaderNodeBsdfTransparent'); mx2 = ba.node('ShaderNodeMixShader'); ba.put(mx2.inputs['Fac'], ba.math('MULTIPLY', rim, .6, True))
ba.t.links.new(tr2.outputs[0], mx2.inputs[1]); ba.t.links.new(em.outputs[0], mx2.inputs[2]); ba.t.links.new(mx2.outputs[0], ba.node('ShaderNodeOutputMaterial').inputs['Surface'])

# ======================= the vessel-base =======================
random.seed(11)
class M:
    """one mesh per material, assembled from pydata (thousands of parts without thousands of operators)"""
    def __init__(s): s.v = []; s.f = []
    def _quad(s, a, b_, c, d): i = len(s.v); s.v += [a, b_, c, d]; s.f.append((i, i + 1, i + 2, i + 3))
    def box(s, c, sz, rz=0.0):
        cx, cy, cz = c; hx, hy, hz = sz[0] / 2, sz[1] / 2, sz[2] / 2; ca, sa = math.cos(rz), math.sin(rz)
        P8 = []
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz_ in (-1, 1):
                    x, y = sx * hx, sy * hy; P8.append((cx + x * ca - y * sa, cy + x * sa + y * ca, cz + sz_ * hz))
        def q(a, b_, c_, d): s._quad(P8[a], P8[b_], P8[c_], P8[d])
        q(0, 1, 3, 2); q(4, 6, 7, 5); q(0, 4, 5, 1); q(2, 3, 7, 6); q(0, 2, 6, 4); q(1, 5, 7, 3)
    def cyl(s, c, r, h, seg=14):
        cx, cy, cz = c; top = []; bot = []
        for i in range(seg):
            a = 2 * math.pi * i / seg; top.append((cx + r * math.cos(a), cy + r * math.sin(a), cz + h / 2)); bot.append((cx + r * math.cos(a), cy + r * math.sin(a), cz - h / 2))
        for i in range(seg):
            j = (i + 1) % seg; s._quad(bot[i], bot[j], top[j], top[i])
        i0 = len(s.v); s.v += top; s.f.append(tuple(range(i0, i0 + seg)))
        i1 = len(s.v); s.v += bot[::-1]; s.f.append(tuple(range(i1, i1 + seg)))
    def build(s, name, mat, parent):
        me = bpy.data.meshes.new(name); me.from_pydata(s.v, [], s.f); me.update(); me.validate()
        ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); ob.parent = parent; ob.data.materials.append(mat); return ob

def mat_metal(name, col, metallic=.4, rough=.55):
    m = new_mat(name); bb = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled'); bb.inputs['Base Color'].default_value = col; bb.inputs['Metallic'].default_value = metallic; bb.inputs['Roughness'].default_value = rough
    m.node_tree.links.new(bb.outputs[0], m.node_tree.nodes.new('ShaderNodeOutputMaterial').inputs['Surface']); return m
def mat_glow(name, col, s):
    m = new_mat(name); e = m.node_tree.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = s
    m.node_tree.links.new(e.outputs[0], m.node_tree.nodes.new('ShaderNodeOutputMaterial').inputs['Surface']); return m
def mat_beam(name):
    m = new_mat(name); bm = B(m.node_tree); tc = bm.node('ShaderNodeTexCoord'); sp = bm.node('ShaderNodeSeparateXYZ'); bm.t.links.new(tc.outputs['Generated'], sp.inputs['Vector'])
    z = sp.outputs['Z']        # 0 at the ground, 1 at the lamp
    e = bm.node('ShaderNodeEmission'); e.inputs['Color'].default_value = (1.0, .9, .7, 1); bm.put(e.inputs['Strength'], bm.math('MULTIPLY', z, 1.4))
    tr = bm.node('ShaderNodeBsdfTransparent'); mx = bm.node('ShaderNodeMixShader'); bm.put(mx.inputs['Fac'], bm.math('MULTIPLY', z, .5))
    bm.t.links.new(tr.outputs[0], mx.inputs[1]); bm.t.links.new(e.outputs[0], mx.inputs[2]); bm.t.links.new(mx.outputs[0], bm.node('ShaderNodeOutputMaterial').inputs['Surface']); return m

dark = mat_metal('Hull', (.10, .105, .12, 1), .45, .5)
conc = mat_metal('Concrete', (.16, .155, .15, 1), .0, .9)
rust = mat_metal('Panels', (.2, .13, .09, 1), .3, .6)
win_w = mat_glow('WinWarm', (1.0, .76, .4, 1), 6.0); win_c = mat_glow('WinCool', (.7, .85, 1.0, 1), 4.5); door = mat_glow('Door', (1.0, .85, .6, 1), 5.0)
lamp = mat_glow('Lamp', (1.0, .95, .85, 1), 90.0); red = mat_glow('Beacon', (1.0, .08, .04, 1), 120.0); amber = mat_glow('Amber', (1.0, .55, .12, 1), 22.0)
beam = mat_beam('Beam')

# the frame of the base: Z up from the surface, Y ahead (away from the camera), X to the right
Pw = Vector((XOFF / RP, math.sin(PHI), math.cos(PHI))).normalized() * (RP + 0.5)
root = bpy.data.objects.new('Base', None); bpy.context.collection.objects.link(root)
_up = Pw.normalized(); _x = (Vector((1, 0, 0)) - _up * _up.x).normalized(); _y = _up.cross(_x)
root.location = Pw; root.rotation_euler = Matrix((_x, _y, _up)).transposed().to_euler()

hull, conc_m, panels, ww, wc, lamps, reds, ambers, doors = M(), M(), M(), M(), M(), M(), M(), M(), M()
GRID_X, GRID_Z = 3.0, 3.4
def windows(c, sz, faces=('-y', '+x', '-x'), p=.62, z0=None):
    """lit windows on the walls of the box c/sz"""
    cx, cy, cz = c; sx, sy, sz_ = sz
    zs = [cz - sz_ / 2 + 2.6 + k * GRID_Z for k in range(int((sz_ - 3.6) / GRID_Z) + 1)]
    for f in faces:
        if f in ('-y', '+y'):
            y = cy + (-1 if f == '-y' else 1) * (sy / 2 + .06)
            for i in range(int((sx - 2.0) / GRID_X) + 1):
                x = cx - sx / 2 + 1.5 + i * GRID_X
                for z in zs:
                    if random.random() < p: (wc if random.random() < .14 else ww).box((x, y, z), (1.7, .06, 1.35))
        else:
            x = cx + (-1 if f == '-x' else 1) * (sx / 2 + .06)
            for i in range(int((sy - 2.0) / GRID_X) + 1):
                y = cy - sy / 2 + 1.5 + i * GRID_X
                for z in zs:
                    if random.random() < p: (wc if random.random() < .14 else ww).box((x, y, z), (.06, 1.7, 1.35))
def greeble_top(c, sz, n, hmax=3.0):
    cx, cy, cz = c; sx, sy, sz_ = sz
    for _ in range(n):
        w = random.uniform(1.2, 5.5); d = random.uniform(1.2, 4.5); h = random.uniform(.7, hmax)
        x = cx + random.uniform(-sx / 2 + w, sx / 2 - w); y = cy + random.uniform(-sy / 2 + d, sy / 2 - d)
        (panels if random.random() < .25 else hull).box((x, y, cz + sz_ / 2 + h / 2), (w, d, h), random.choice((0, 0, math.pi / 2)))
        if random.random() < .2: ambers.box((x, y - d / 2 - .05, cz + sz_ / 2 + h / 2), (w * .6, .08, .35))
def ribs(c, sz, step=7.0):
    cx, cy, cz = c; sx, sy, sz_ = sz
    for i in range(int(sx / step) + 1):
        x = cx - sx / 2 + i * step; hull.box((x, cy - sy / 2 - .35, cz), (.9, .7, sz_ + .2))
def strip(c, length, along='x', mat=None, w=.35):
    (mat or ambers).box(c, (length, w, w) if along == 'x' else (w, length, w))
def tier(c, sz, win=True, rib=True, greeble=8):
    hull.box(c, sz); ww and None
    if rib: ribs(c, sz)
    if win: windows(c, sz)
    if greeble: greeble_top(c, sz, greeble)
    # a lit band under the roofline and a base skirt
    ambers.box((c[0], c[1] - sz[1] / 2 - .07, c[2] + sz[2] / 2 - .9), (sz[0] - 1.0, .08, .45))

# the pad: a rocky plateau with a ring of lights
conc_m.cyl((0, 0, 1.5), 86, 3.0, 64)
for k in range(72):
    a = 2 * math.pi * k / 72; lamps.box((84 * math.cos(a), 84 * math.sin(a), 3.15), (.7, .7, .3)) if k % 3 == 0 else ambers.box((84 * math.cos(a), 84 * math.sin(a), 3.1), (.5, .5, .2))
# the stepped superstructure
tier((0, 14, 3 + 5), (78, 32, 10), greeble=26)
tier((0, 16, 13 + 5), (60, 26, 10), greeble=20)
tier((0, 17, 23 + 5), (42, 20, 10), greeble=14)
tier((0, 18, 33 + 4), (26, 13, 8), greeble=8)
tier((6, 18, 41 + 13), (9, 9, 26), rib=False, greeble=0)          # command tower
hull.box((6, 18, 41 + 27), (11, 11, 3.2)); windows((6, 18, 41 + 27), (11, 11, 3.2), p=1.0)   # the glazed crown
hull.cyl((6, 18, 41 + 38), .45, 22, 8); reds.box((6, 18, 41 + 50), (1.0, 1.0, 1.0)); reds.box((6, 18, 41 + 45), (.6, .6, .6))
hull.cyl((-6, 16, 41 + 8), 1.6, 16, 10)
for k in range(3): hull.cyl((-10 + k * 2.6, 22, 41 + 7 + k * 2), .35, 14 + k * 3, 6); reds.box((-10 + k * 2.6, 22, 41 + 14.5 + k * 2 + (k * 1.5)), (.5, .5, .5))
# the hangar wing on the left, the works on the right
tier((-58, 4, 3 + 9), (30, 26, 18), greeble=10)
hull.box((-58, 4 - 13.1, 3 + 7), (20, .5, 13)); doors.box((-58, 4 - 13.5, 3 + 7), (19, .12, 11.5))                 # the lit hangar door
for k in range(-2, 3): panels.box((-58 + k * 4, 4 - 13.7, 3 + 7), (.3, .3, 12))
tier((60, 2, 3 + 11), (28, 22, 22), greeble=10)
for k in range(3):
    hull.cyl((50 + k * 9, -2, 3 + 22 + 6), 3.4, 14, 14)
    for r_ in range(4): ambers.cyl((50 + k * 9, -2, 3 + 22 + 1.5 + r_ * 3.2), 3.55, .35, 14)
    reds.box((50 + k * 9, -2, 3 + 22 + 13.5), (.7, .7, .7))
# a gantry and a crane
for k in range(7): hull.box((-30 + k * 9, -14, 3 + 17.5), (.5, .5, 14)); hull.box((-30 + k * 9, -14, 3 + 24.6), (9, .5, .5))
hull.box((-2, -14, 3 + 25), (64, 1.4, 1.4)); lamps.box((-2, -15, 3 + 24.3), (60, .12, .12))
hull.box((78, -6, 3 + 20), (1.8, 1.8, 40)); hull.box((70, -6, 3 + 40), (28, 1.2, 1.2)); reds.box((84, -6, 3 + 41), (.8, .8, .8)); hull.box((58, -6, 3 + 38), (.3, .3, 6))
# pipes and containers on the front apron
for k in range(5): hull.cyl((-70 + k * 36, -34, 3 + 1.6), 1.1, 22, 10); hull.box((-70 + k * 36, -34, 3 + .6), (1.2, 1.2, 1.2))
for k in range(26):
    x = random.uniform(-78, 78); y = random.uniform(-62, -44); w = random.choice((6, 6, 12)); (panels if random.random() < .5 else hull).box((x, y, 3 + 1.4), (w, 2.5, 2.8), random.uniform(-.1, .1))
    if random.random() < .5: (ww if random.random() < .7 else wc).box((x, y - 1.3, 3 + 1.4), (w * .6, .06, .3))
# floodlight poles with beams on the apron
beams = M()
for k in range(9):
    x = -72 + k * 18; y = -50 + (k % 2) * 6
    hull.cyl((x, y, 3 + 7), .35, 14, 6); lamps.box((x, y, 3 + 14.4), (2.4, 1.0, .5))
    i0 = len(beams.v); r_ = 9.0; ring = [(x + r_ * math.cos(2 * math.pi * j / 10), y + r_ * math.sin(2 * math.pi * j / 10) - 5, 3.2) for j in range(10)]
    # a cone as a fan of triangles from the lamp to the ground, built as quads
    for j in range(10):
        a_ = ring[j]; b_ = ring[(j + 1) % 10]; top = (x, y, 3 + 14.0); beams._quad(top, top, b_, a_)
# landed ships on the pad: a hauler and a courier
def ship_hauler(cx, cy):
    hull.box((cx, cy, 3 + 7), (34, 11, 8)); hull.box((cx + 14, cy, 3 + 12), (8, 9, 7)); windows((cx + 14, cy, 3 + 12), (8, 9, 7), faces=('-y',), p=1.0)
    for k in (-12, -4, 4, 12): hull.cyl((cx + k, cy, 3 + 1.5), .6, 3.2, 8)
    hull.box((cx - 6, cy, 3 + 15), (20, 1.2, 1.2)); hull.box((cx - 16, cy, 3 + 11), (1.2, 1.2, 9)); ambers.box((cx, cy - 5.6, 3 + 8.5), (30, .08, .35)); reds.box((cx - 16, cy, 3 + 16), (.6, .6, .6))
    for k in range(5): wc.box((cx - 12 + k * 6, cy - 5.55, 3 + 5), (1.8, .06, 1.2))
def ship_courier(cx, cy):
    hull.box((cx, cy, 3 + 4.5), (24, 8, 5)); hull.box((cx + 8, cy, 3 + 5.5), (12, 6, 4)); hull.box((cx - 12, cy, 3 + 4.5), (4, 11, 2)); windows((cx, cy, 3 + 4.5), (24, 8, 5), faces=('-y',), p=.8)
    for k in (-8, 8): hull.cyl((cx + k, cy, 3 + 1.2), .5, 2.4, 8)
    lamps.box((cx + 14.2, cy, 3 + 5.3), (.2, 2, 1.2)); reds.box((cx - 12, cy - 5, 3 + 4.5), (.5, .5, .5))
ship_hauler(-24, -26); ship_courier(30, -26)

hull.build('Hull', dark, root); conc_m.build('Pad', conc, root); panels.build('Panels', rust, root)
ww.build('WinWarm', win_w, root); wc.build('WinCool', win_c, root); lamps.build('Lamps', lamp, root); reds.build('Beacons', red, root); ambers.build('Amber', amber, root); doors.build('Doors', door, root)
bo = beams.build('Beams', beam, root); bo.visible_shadow = False

if not WITH_BASE:                       # the page shows only the planet and the stars
    for ob in [o for o in bpy.data.objects if o.parent == root]: bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.objects.remove(root, do_unlink=True)

# ======================= light, camera =======================
sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = 5.5; sun.angle = math.radians(.5); sun.color = (1.0, .96, .9)
so = bpy.data.objects.new('Sun', sun); bpy.context.collection.objects.link(so)
Ld = Vector((-.42, .5, .56)).normalized() if MODE == 'day' else SUN_DIR
so.rotation_euler = (-Ld).to_track_quat('-Z', 'Y').to_euler()
if MODE == 'night': sun.energy = 1.4
if MODE == 'dawn': sun.energy = 7.0
fill = bpy.data.lights.new('Fill', 'SUN'); fill.energy = {'day': 2.2, 'dawn': .5, 'night': .09}[MODE]; fill.angle = math.radians(20); fill.color = (.7, .8, 1.0)
fo = bpy.data.objects.new('Fill', fill); bpy.context.collection.objects.link(fo)
Fd = Vector((.5, -.7, .5)).normalized(); fo.rotation_euler = (-Fd).to_track_quat('-Z', 'Y').to_euler()
wd = bpy.data.worlds.new('W'); wd.use_nodes = True; sc.world = wd
bg = wd.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (.45, .55, .9, 1); bg.inputs['Strength'].default_value = {'day': .01, 'dawn': .012, 'night': .03}[MODE]
cam = bpy.data.cameras.new('Cam'); cam.sensor_fit = 'VERTICAL'; cam.angle = math.radians(FOV); cam.clip_end = 30000
co = bpy.data.objects.new('Cam', cam); bpy.context.collection.objects.link(co); sc.camera = co
dip = math.acos(RP / (RP + H)); off = math.atan((1 - 2 * HORIZON) * math.tan(math.radians(FOV) / 2)); pitch = dip - off
co.location = (0, 0, RP + H); co.rotation_euler = (math.radians(90) - pitch, 0, 0)

if MODE == 'dawn':                       # the star itself, just above the limb
    bpy.ops.mesh.primitive_uv_sphere_add(radius=140, segments=48, ring_count=24, location=Vector((0, 0, RP + H)) + SUN_DIR * 22000)
    star = bpy.context.object; star.name = 'Star'; star.visible_shadow = False
    sm = mat_glow('Star', (1.0, .8, .5, 1), 700.0); star.data.materials.append(sm)
# ======================= glow: lights bloom into the transparent sky =======================
sc.use_nodes = True; ct = sc.node_tree
for n_ in list(ct.nodes): ct.nodes.remove(n_)
rl = ct.nodes.new('CompositorNodeRLayers'); gl_ = ct.nodes.new('CompositorNodeGlare'); gl_.glare_type = 'FOG_GLOW'; gl_.quality = 'HIGH'; gl_.threshold = 1.0 if MODE == 'dawn' else 2.5; gl_.size = 8 if MODE == 'dawn' else 6; gl_.mix = 0.0
bw = ct.nodes.new('CompositorNodeRGBToBW'); mul = ct.nodes.new('CompositorNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 1.2
add = ct.nodes.new('CompositorNodeMath'); add.operation = 'ADD'; add.use_clamp = True
sa = ct.nodes.new('CompositorNodeSetAlpha'); cmp_ = ct.nodes.new('CompositorNodeComposite')
ct.links.new(rl.outputs['Image'], gl_.inputs['Image']); ct.links.new(gl_.outputs['Image'], bw.inputs['Image']); ct.links.new(bw.outputs['Val'], mul.inputs[0])
ct.links.new(rl.outputs['Alpha'], add.inputs[0]); ct.links.new(mul.outputs['Value'], add.inputs[1])
ct.links.new(gl_.outputs['Image'], sa.inputs['Image']); ct.links.new(add.outputs['Value'], sa.inputs['Alpha']); ct.links.new(sa.outputs['Image'], cmp_.inputs['Image'])

sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT, RES, 'samples', SAMPLES)

