# LAST BERTH — main menu planet (Blender 4.4, Cycles/HIP). Run:
#   blender -b --factory-startup --python design/blender/planet.py -- <out.png> [--preview]
# A lifeless stone planet seen from low orbit, the vessel-base on the horizon, transparent background
# (the page draws the stars and the orbit itself). Draft: lives in design/, the game is not touched.
import bpy, math, sys
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'C:/Temp/planet.png'
PREVIEW = '--preview' in argv
RES = (1280, 760) if PREVIEW else (2560, 1520)
SAMPLES = 40 if PREVIEW else 200

RP = 1000.0          # planet radius
H = 70.0             # camera altitude
HORIZON = 0.37       # horizon height from the bottom of the frame (fraction)
FOV = 38.0           # vertical field of view, degrees

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
cp = bpy.context.preferences.addons['cycles'].preferences
cp.compute_device_type = 'HIP'
cp.get_devices()
for d in cp.devices:
    d.use = (d.type == 'HIP')
sc.cycles.device = 'GPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = RES
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.image_settings.color_depth = '8'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0.0

# ---------- node helpers ----------
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
        else: s.t.links.new(v, sock)
    def math(s, op, a, b=None, clamp=False):
        n = s.node('ShaderNodeMath', operation=op, use_clamp=clamp)
        s.put(n.inputs[0], a)
        if b is not None: s.put(n.inputs[1], b)
        return n.outputs[0]
    def vadd(s, a, vec):
        n = s.node('ShaderNodeVectorMath', operation='ADD'); s.put(n.inputs[0], a); n.inputs[1].default_value = vec
        return n.outputs[0]
    def mrange(s, v, a, b, c, d, smooth=True, clamp=True):
        n = s.node('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP' if smooth else 'LINEAR', clamp=clamp)
        s.put(n.inputs['Value'], v); s.put(n.inputs['From Min'], a); s.put(n.inputs['From Max'], b); s.put(n.inputs['To Min'], c); s.put(n.inputs['To Max'], d)
        return n.outputs['Result']

def crater_layer(b, pos, cell, seed, depth, p_exist):
    """One layer of craters: returns (height in units, normalised profile for the albedo)."""
    vor = b.node('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='F1', distance='EUCLIDEAN')
    vor.inputs['Scale'].default_value = 1.0 / cell
    vor.inputs['Randomness'].default_value = 1.0
    b.put(vor.inputs['Vector'], pos)
    w1 = b.node('ShaderNodeTexWhiteNoise', noise_dimensions='3D'); b.put(w1.inputs['Vector'], vor.outputs['Position'])
    w2 = b.node('ShaderNodeTexWhiteNoise', noise_dimensions='3D'); b.put(w2.inputs['Vector'], b.vadd(vor.outputs['Position'], (seed, seed * 1.7, seed * 2.3)))
    exist = b.math('GREATER_THAN', w1.outputs['Value'], 1.0 - p_exist)
    rr = b.math('ADD', b.math('MULTIPLY', w2.outputs['Value'], 0.30), 0.16)          # radius in cell units
    d = b.math('DIVIDE', vor.outputs['Distance'], rr)
    bowl = b.math('MAXIMUM', b.math('SUBTRACT', 1.0, b.math('MULTIPLY', d, d)), 0.0)
    rim = b.math('MULTIPLY', b.mrange(d, .75, 1.0, 0, 1), b.math('SUBTRACT', 1.0, b.mrange(d, 1.0, 1.3, 0, 1)))
    prof = b.math('SUBTRACT', b.math('MULTIPLY', rim, 0.45), bowl)
    prof = b.math('MULTIPLY', prof, exist)
    h = b.math('MULTIPLY', prof, b.math('MULTIPLY', rr, cell * depth))
    return h, prof

# ---------- the planet ----------
bpy.ops.mesh.primitive_uv_sphere_add(radius=RP, segments=512, ring_count=256, location=(0, 0, 0))
planet = bpy.context.object; planet.name = 'Planet'
bpy.ops.object.shade_smooth()
mat = new_mat('Stone'); planet.data.materials.append(mat)
nt = mat.node_tree; b = B(nt)
tc = b.node('ShaderNodeTexCoord'); pos = tc.outputs['Object']
layers = [(420, 1.0, 11.0, .75, 1.0), (120, 0.4, 23.0, .8, .9), (34, 0.25, 31.0, .8, .75), (9.5, 0.2, 47.0, .85, .6), (2.6, 0.18, 61.0, .85, .45)]
H_sum = None; T_sum = None
for cell, depth, seed, pe, w in layers:
    h, prof = crater_layer(b, pos, cell, seed, depth, pe)
    H_sum = h if H_sum is None else b.math('ADD', H_sum, h)
    pw = b.math('MULTIPLY', prof, w)
    T_sum = pw if T_sum is None else b.math('ADD', T_sum, pw)
# rolling terrain and fine grain
nz = b.node('ShaderNodeTexNoise', noise_dimensions='3D', noise_type='FBM'); nz.inputs['Scale'].default_value = 0.004; nz.inputs['Detail'].default_value = 8; nz.inputs['Roughness'].default_value = 0.55; b.put(nz.inputs['Vector'], pos)
nz2 = b.node('ShaderNodeTexNoise', noise_dimensions='3D', noise_type='FBM'); nz2.inputs['Scale'].default_value = 0.9; nz2.inputs['Detail'].default_value = 7; nz2.inputs['Roughness'].default_value = 0.6; b.put(nz2.inputs['Vector'], pos)
H_sum = b.math('ADD', H_sum, b.math('MULTIPLY', b.math('SUBTRACT', nz.outputs['Fac'], .5), 90.0))
H_sum = b.math('ADD', H_sum, b.math('MULTIPLY', b.math('SUBTRACT', nz2.outputs['Fac'], .5), 0.5))
# albedo: dark maria and light highlands, crater floors darker, rims lighter
mare = b.node('ShaderNodeTexNoise', noise_dimensions='3D', noise_type='FBM'); mare.inputs['Scale'].default_value = 0.0022; mare.inputs['Detail'].default_value = 5; b.put(mare.inputs['Vector'], b.vadd(pos, (400, 120, 60)))
mfac = b.mrange(mare.outputs['Fac'], .44, .6, 0, 1)
tint = b.node('ShaderNodeTexNoise', noise_dimensions='3D', noise_type='FBM'); tint.inputs['Scale'].default_value = 0.02; tint.inputs['Detail'].default_value = 4; b.put(tint.inputs['Vector'], pos)
hi = b.node('ShaderNodeMixRGB', blend_type='MIX'); hi.inputs['Color1'].default_value = (.42, .395, .36, 1); hi.inputs['Color2'].default_value = (.30, .285, .27, 1); b.put(hi.inputs['Fac'], tint.outputs['Fac'])
lo = b.node('ShaderNodeMixRGB', blend_type='MIX'); lo.inputs['Color1'].default_value = (.20, .195, .19, 1); lo.inputs['Color2'].default_value = (.13, .125, .12, 1); b.put(lo.inputs['Fac'], tint.outputs['Fac'])
base = b.node('ShaderNodeMixRGB', blend_type='MIX'); b.put(base.inputs['Fac'], mfac); b.t.links.new(hi.outputs[0], base.inputs['Color1']); b.t.links.new(lo.outputs[0], base.inputs['Color2'])
crat = b.mrange(T_sum, -1.3, .7, .62, 1.3)
mul = b.node('ShaderNodeMixRGB', blend_type='MULTIPLY'); mul.inputs['Fac'].default_value = 1.0; b.t.links.new(base.outputs[0], mul.inputs['Color1'])
grey = b.node('ShaderNodeCombineColor'); [b.put(grey.inputs[i], crat) for i in range(3)]; b.t.links.new(grey.outputs[0], mul.inputs['Color2'])
bump = b.node('ShaderNodeBump'); bump.inputs['Strength'].default_value = 1.0; bump.inputs['Distance'].default_value = 1.0; b.put(bump.inputs['Height'], H_sum)
bsdf = b.node('ShaderNodeBsdfPrincipled'); bsdf.inputs['Roughness'].default_value = 0.93
b.t.links.new(mul.outputs[0], bsdf.inputs['Base Color']); b.t.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
try: bsdf.inputs['Specular IOR Level'].default_value = 0.15
except KeyError: pass
out = b.node('ShaderNodeOutputMaterial'); b.t.links.new(bsdf.outputs[0], out.inputs['Surface'])

# ---------- the vessel-base on the horizon ----------
def metal(name, col=(.12, .125, .14, 1), metallic=.35, rough=.55):
    m = new_mat(name); bb = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled'); bb.inputs['Base Color'].default_value = col; bb.inputs['Metallic'].default_value = metallic; bb.inputs['Roughness'].default_value = rough
    o = m.node_tree.nodes.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(bb.outputs[0], o.inputs['Surface']); return m
def glow(name, col=(1.0, .72, .25, 1), s=40.0):
    m = new_mat(name); e = m.node_tree.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = s
    o = m.node_tree.nodes.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(e.outputs[0], o.inputs['Surface']); return m
dark = metal('BaseMetal'); lamp = glow('Windows')
PHI, XOFF = 0.335, 150.0
P = Vector((XOFF / RP, math.sin(PHI), math.cos(PHI))).normalized() * (RP - 0.6)
root = bpy.data.objects.new('Base', None); bpy.context.collection.objects.link(root)
_up = P.normalized(); _x = (Vector((1, 0, 0)) - _up * _up.x).normalized(); _y = _up.cross(_x)
from mathutils import Matrix
root.location = P; root.rotation_euler = Matrix((_x, _y, _up)).transposed().to_euler()
def cube(name, loc, size, mat, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.name = name; o.parent = root
    o.location = loc; o.scale = size; o.rotation_euler = (0, 0, rot); o.data.materials.append(mat); return o
S = 1.0
cube('hull', (0, 0, 3.0), (34, 9, 6), dark)
cube('tower', (-8, 0, 13.0), (5, 5, 17), dark)
cube('module', (9, -1, 8.5), (12, 7, 11), dark)
cube('mast', (-8, 0, 28), (.7, .7, 14), dark)
cube('arm', (-27, 0, 5.5), (22, 1.4, 1.4), dark)
cube('stack', (14, 3, 16.5), (3, 3, 9), dark)
import random
random.seed(7)
k = 0
for z in (21.0, 17.5, 14.0, 10.5, 7.0):            # the tower
    for x in (-9.4, -8.0, -6.6):
        if random.random() < .6: cube('tw%d' % k, (x, -2.58, z), (.8, .12, .55), lamp); k += 1
for z in (11.5, 8.5, 5.5):                           # the module
    for x in (4.5, 7.0, 9.5, 12.0, 14.0):
        if random.random() < .55: cube('md%d' % k, (x, -4.55, z), (1.1, .12, .6), lamp); k += 1
for x in range(-14, 15, 4):                          # the hull
    if random.random() < .7: cube('hl%d' % k, (x, -4.55, 2.6), (1.4, .12, .5), lamp); k += 1
# a work light: the flank facing the camera glows a little
wl = bpy.data.lights.new('Work', 'AREA'); wl.energy = 3200; wl.size = 8; wl.color = (1.0, .78, .5)
wo = bpy.data.objects.new('Work', wl); bpy.context.collection.objects.link(wo); wo.parent = root; wo.location = (-2, -26, 12); wo.rotation_euler = (math.radians(90), 0, 0)

# ---------- light, world, camera ----------
sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = 5.2; sun.angle = math.radians(.6); sun.color = (1.0, .97, .93)
so = bpy.data.objects.new('Sun', sun); bpy.context.collection.objects.link(so)
Ldir = Vector((.62, -.12, .5)).normalized()
so.rotation_euler = (-Ldir).to_track_quat('-Z', 'Y').to_euler()
wd = bpy.data.worlds.new('W'); wd.use_nodes = True; sc.world = wd
bg = wd.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (.45, .55, .9, 1); bg.inputs['Strength'].default_value = .012

cam = bpy.data.cameras.new('Cam'); cam.sensor_fit = 'VERTICAL'; cam.angle = math.radians(FOV); cam.clip_end = 20000
co = bpy.data.objects.new('Cam', cam); bpy.context.collection.objects.link(co); sc.camera = co
dip = math.acos(RP / (RP + H))
off = math.atan((1 - 2 * HORIZON) * math.tan(math.radians(FOV) / 2))   # the horizon sits `off` below the axis
pitch = dip - off
co.location = (0, 0, RP + H)
co.rotation_euler = (math.radians(90) - pitch, 0, 0)

sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT, RES, 'samples', SAMPLES)


