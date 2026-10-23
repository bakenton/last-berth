# LAST BERTH — intro frames (Blender 4.4, Cycles/HIP). Run:
#   blender -b --factory-startup --python design/blender/intro.py -- <out.png> --frame=pult|window|port [--preview]
# Three frames of the opening after the start-up terminal (design/INTRO-DRAFT.md): the Pult room, the window over a lifeless planet,
# the hangar where Alexandra shows the ships to the people. Drafts: everything is built from primitives, people are backlit silhouettes.
import bpy, math, random, sys
from mathutils import Vector, Matrix, Euler

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'C:/Temp/intro.png'
FRAME = 'pult'
for a in argv:
    if a.startswith('--frame='): FRAME = a.split('=', 1)[1]
PREVIEW = '--preview' in argv
RES = (1280, 545) if PREVIEW else (2560, 1090)
SAMPLES = 40 if PREVIEW else 192
random.seed(5)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
cp = bpy.context.preferences.addons['cycles'].preferences
cp.compute_device_type = 'HIP'; cp.get_devices()
for d in cp.devices: d.use = (d.type == 'HIP')
sc.cycles.device = 'GPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.cycles.volume_bounces = 1
sc.cycles.volume_step_rate = 2.0 if PREVIEW else 1.0
sc.render.resolution_x, sc.render.resolution_y = RES
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.view_settings.view_transform = 'Filmic' if 'Filmic' in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items.keys() else 'AgX'
sc.view_settings.look = 'None'

# ======================== helpers ========================
def new_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    for n in list(m.node_tree.nodes): m.node_tree.nodes.remove(n)
    return m
def out_node(m, shader):
    o = m.node_tree.nodes.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(shader.outputs[0], o.inputs['Surface']); return o
def pbr(name, col, metal=0.0, rough=0.5, emit=None, emit_s=0.0):
    m = new_mat(name); b = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Base Color'].default_value = col
    b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = emit; b.inputs['Emission Strength'].default_value = emit_s
    out_node(m, b); return m
def glow(name, col, s):
    m = new_mat(name); e = m.node_tree.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = s
    out_node(m, e); return m
def link(obj, mat):
    obj.data.materials.clear(); obj.data.materials.append(mat); return obj
def box(loc, size, mat, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size; o.rotation_euler = rot
    if bevel > 0:
        bpy.ops.object.transform_apply(scale=True)
        md = o.modifiers.new('Bv', 'BEVEL'); md.width = bevel; md.segments = 3
    return link(o, mat)
def sphere(loc, r, mat, scale=(1, 1, 1), seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.scale = scale
    bpy.ops.object.shade_smooth(); return link(o, mat)
def cyl(p0, p1, r, mat, seg=16):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=L, location=(p0 + p1) / 2, vertices=seg); o = bpy.context.object
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); bpy.ops.object.shade_smooth(); return link(o, mat)
def area(loc, size, energy, col=(1, 1, 1), target=None, shape='RECTANGLE'):
    l = bpy.data.lights.new('A', 'AREA'); l.energy = energy; l.size = size[0]; l.shape = shape
    if shape == 'RECTANGLE': l.size_y = size[1]
    l.color = col; o = bpy.data.objects.new('A', l); bpy.context.collection.objects.link(o); o.location = loc
    if target: o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
def sun(direction, energy, col=(1, 1, 1), ang=0.6):
    l = bpy.data.lights.new('S', 'SUN'); l.energy = energy; l.color = col; l.angle = math.radians(ang)
    o = bpy.data.objects.new('S', l); bpy.context.collection.objects.link(o)
    o.rotation_euler = (-Vector(direction)).to_track_quat('-Z', 'Y').to_euler(); return o
def spot(loc, target, energy, col, size=60, blend=.5, radius=.1):
    l = bpy.data.lights.new('P', 'SPOT'); l.energy = energy; l.color = col; l.spot_size = math.radians(size); l.spot_blend = blend; l.shadow_soft_size = radius
    o = bpy.data.objects.new('P', l); bpy.context.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
def camera(loc, target, lens=24, roll=0.0):
    c = bpy.data.cameras.new('C'); c.lens = lens; c.sensor_width = 36; c.clip_end = 100000
    o = bpy.data.objects.new('C', c); bpy.context.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.rotation_euler.rotate_axis('Z', roll); sc.camera = o; return o
def world(color=(0, 0, 0, 1), strength=0.0):
    w = bpy.data.worlds.new('W'); w.use_nodes = True; sc.world = w
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = color; bg.inputs['Strength'].default_value = strength; return w
def haze(w, density, anis=0.4, col=(1, 1, 1, 1)):
    s = w.node_tree.nodes.new('ShaderNodeVolumeScatter'); s.inputs['Density'].default_value = density; s.inputs['Anisotropy'].default_value = anis; s.inputs['Color'].default_value = col
    o = w.node_tree.nodes['World Output']; w.node_tree.links.new(s.outputs[0], o.inputs['Volume'])

# a person built from primitives: smooth limbs and joints, backlit it reads as a silhouette
def person(x, y, rot, h=1.75, pose='stand', mat=None, head_mat=None, arm_up=0.0, name='P'):
    s = h / 1.77; parts = []
    c = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(rot, 4, 'Z')
    def P(px, py, pz): return c @ Vector((px * s, py * s, pz * s))
    def add(o): parts.append(o); return o
    def limb(a, b, r0, r1=None): add(cyl(P(*a), P(*b), r0 * s, mat, 12)); add(sphere(P(*b), r0 * 1.0 * s, mat, seg=12))
    hm = head_mat or mat
    if pose == 'sit':
        add(sphere(P(0, 0.02, 0.52), 1, mat, (0.16 * s, 0.11 * s, 0.1 * s)))
        for sx in (-1, 1):
            limb((sx * 0.1, 0.05, 0.54), (sx * 0.1, 0.5, 0.5), 0.062); limb((sx * 0.1, 0.5, 0.5), (sx * 0.1, 0.55, 0.06), 0.045)
        add(sphere(P(0, 0.0, 0.8), 1, mat, (0.18 * s, 0.1 * s, 0.24 * s))); add(sphere(P(0, 0.0, 0.63), 1, mat, (0.15 * s, 0.095 * s, 0.13 * s)))
        add(cyl(P(0, 0, 1.0), P(0, 0.01, 1.08), 0.035 * s, mat, 12)); add(sphere(P(0, 0.01, 1.17), 1, hm, (0.075 * s, 0.088 * s, 0.1 * s)))
        for sx in (-1, 1): limb((sx * 0.2, 0.0, 0.98), (sx * 0.25, 0.22, 0.78), 0.042); limb((sx * 0.25, 0.22, 0.78), (sx * 0.2, 0.46, 0.8), 0.034)
    else:
        add(sphere(P(0, 0, 0.95), 1, mat, (0.14 * s, 0.09 * s, 0.11 * s)))
        for sx in (-1, 1):
            limb((sx * 0.095, 0, 0.94), (sx * 0.1, 0.01, 0.5), 0.065); limb((sx * 0.1, 0.01, 0.5), (sx * 0.1, 0.0, 0.06), 0.047)
            add(sphere(P(sx * 0.1, 0.06, 0.035), 1, mat, (0.05 * s, 0.1 * s, 0.035 * s)))
        add(sphere(P(0, 0, 1.2), 1, mat, (0.175 * s, 0.092 * s, 0.25 * s))); add(sphere(P(0, 0, 1.04), 1, mat, (0.13 * s, 0.085 * s, 0.14 * s)))
        for sx in (-1, 1): add(sphere(P(sx * 0.2, 0, 1.44), 0.06 * s, mat, seg=12))
        add(cyl(P(0, 0, 1.5), P(0, 0, 1.6), 0.036 * s, mat, 12)); add(sphere(P(0, 0.005, 1.68), 1, hm, (0.074 * s, 0.087 * s, 0.1 * s)))
        if pose == 'point':       # the right arm out and slightly up: the leader showing the ships
            limb((-0.2, 0, 1.44), (-0.5, 0.1, 1.5 + arm_up * .6), 0.044); limb((-0.5, 0.1, 1.5 + arm_up * .6), (-0.88, 0.2, 1.64 + arm_up), 0.036); add(sphere(P(-0.97, 0.22, 1.66 + arm_up), 1, mat, (0.07 * s, 0.035 * s, 0.025 * s)))
        else:
            limb((-0.2, 0, 1.44), (-0.27, 0.0, 1.17), 0.044); limb((-0.27, 0.0, 1.17), (-0.25, 0.08, 0.93), 0.034)
        limb((0.2, 0, 1.44), (0.27, 0.0, 1.17), 0.044); limb((0.27, 0.0, 1.17), (0.25, 0.08, 0.93), 0.034)
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); o = bpy.context.object; o.name = name; return o

def stars_world(density=1.0, strength=1.0):
    w = bpy.data.worlds.new('W'); w.use_nodes = True; sc.world = w; nt = w.node_tree; bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord'); vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'F1'; vor.inputs['Scale'].default_value = 260 * density
    nt.links.new(tc.outputs['Generated'], vor.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeMapRange'); rp.inputs['From Min'].default_value = 0.0; rp.inputs['From Max'].default_value = 0.045 * 1.0; rp.inputs['To Min'].default_value = 1.0; rp.inputs['To Max'].default_value = 0.0; rp.clamp = True
    nt.links.new(vor.outputs['Distance'], rp.inputs['Value'])
    cr = nt.nodes.new('ShaderNodeMath'); cr.operation = 'POWER'; cr.inputs[1].default_value = 3.0; nt.links.new(rp.outputs['Result'], cr.inputs[0])
    wn = nt.nodes.new('ShaderNodeTexWhiteNoise'); nt.links.new(vor.outputs['Position'], wn.inputs['Vector'])
    gate = nt.nodes.new('ShaderNodeMath'); gate.operation = 'GREATER_THAN'; gate.inputs[1].default_value = 0.55; nt.links.new(wn.outputs['Value'], gate.inputs[0])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; nt.links.new(cr.outputs[0], mul.inputs[0]); nt.links.new(gate.outputs[0], mul.inputs[1])
    ms = nt.nodes.new('ShaderNodeMath'); ms.operation = 'MULTIPLY'; ms.inputs[1].default_value = 60.0 * strength; nt.links.new(mul.outputs[0], ms.inputs[0])
    tint = nt.nodes.new('ShaderNodeMixRGB'); tint.inputs['Color1'].default_value = (0.75, 0.85, 1, 1); tint.inputs['Color2'].default_value = (1, 0.88, 0.7, 1); nt.links.new(wn.outputs['Value'], tint.inputs['Fac'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(tint.outputs[0], em.inputs['Color']); nt.links.new(ms.outputs[0], em.inputs['Strength'])
    base = nt.nodes.new('ShaderNodeBackground'); base.inputs['Color'].default_value = (0.012, 0.014, 0.02, 1); base.inputs['Strength'].default_value = 1.0
    add = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(base.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], nt.nodes['World Output'].inputs['Surface']); return w

DARK = lambda: pbr('Dark', (0.012, 0.012, 0.014, 1), 0.0, 0.8)
HULL = lambda: pbr('Hull', (0.05, 0.052, 0.06, 1), 0.6, 0.38)
FLOOR = lambda: pbr('Floor', (0.02, 0.022, 0.026, 1), 0.2, 0.18)
ALEX = lambda: pbr('Alexandra', (0.22, 0.23, 0.26, 1), 0.85, 0.28)
AMBER = (1.0, 0.7, 0.22, 1); BLUE = (0.3, 0.6, 1.0, 1)

def screen_mat(name, col, scale_y=70.0, strength=2.5, thresh=0.5):
    m = new_mat(name); nt = m.node_tree; tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale_y * 0.35, 3.0, 1.0)
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 1.0; nt.links.new(mp.outputs[0], nz.inputs['Vector'])
    cr = nt.nodes.new('ShaderNodeMath'); cr.operation = 'GREATER_THAN'; cr.inputs[1].default_value = thresh; nt.links.new(nz.outputs['Fac'], cr.inputs[0])
    ln = nt.nodes.new('ShaderNodeTexWave'); ln.wave_type = 'BANDS'; ln.bands_direction = 'X'; ln.inputs['Scale'].default_value = scale_y * .5; nt.links.new(tc.outputs['UV'], ln.inputs['Vector'])
    lm = nt.nodes.new('ShaderNodeMath'); lm.operation = 'GREATER_THAN'; lm.inputs[1].default_value = 0.4; nt.links.new(ln.outputs['Fac'], lm.inputs[0])
    both = nt.nodes.new('ShaderNodeMath'); both.operation = 'MULTIPLY'; nt.links.new(cr.outputs[0], both.inputs[0]); nt.links.new(lm.outputs[0], both.inputs[1])
    s = nt.nodes.new('ShaderNodeMath'); s.operation = 'MULTIPLY'; s.inputs[1].default_value = strength; nt.links.new(both.outputs[0], s.inputs[0])
    base = nt.nodes.new('ShaderNodeMath'); base.operation = 'ADD'; base.inputs[1].default_value = 0.08; nt.links.new(s.outputs[0], base.inputs[0])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; nt.links.new(base.outputs[0], e.inputs['Strength']); out_node(m, e); return m

def globe(loc, r, col):
    m = glow('GlobeLine', col, 6.0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=36, ring_count=18); o = bpy.context.object
    wf = o.modifiers.new('W', 'WIREFRAME'); wf.thickness = r * 0.012; link(o, m)
    inner = sphere(loc, r * 0.985, pbr('GlobeCore', (0.005, 0.01, 0.02, 1), 0, 0.5, BLUE, 0.15)); return o

# ======================== frame 1: the Pult room ========================
def frame_pult():
    world((0.002, 0.003, 0.005, 1), 1.0); haze(sc.world, 0.0055)
    box((0, 6, -0.05), (40, 40, 0.1), FLOOR())
    box((0, 17, 4.5), (30, 0.4, 9), pbr('Wall', (0.004, 0.004, 0.005, 1), 0, 0.9))
    # the great curved screen: a ring of panels facing the room
    n = 15; Rb = 12.5
    for i in range(n):
        a = math.radians(-52 + i * 104 / (n - 1)); x = math.sin(a) * Rb; y = 6 + math.cos(a) * Rb * 0.9
        p = box((x, y, 4.3), (2.2, 0.15, 3.0), screen_mat('Scr%d' % i, AMBER if i % 3 else BLUE, 60 + (i % 4) * 15, 2.2 + (i % 3) * .6, 0.45 + (i % 5) * .03), rot=(0, 0, -a + math.pi))
    globe((0, 13.6, 4.4), 2.0, BLUE)
    for k in range(3): bpy.ops.mesh.primitive_torus_add(major_radius=2.4 + k * .45, minor_radius=0.012, location=(0, 13.6, 4.4), rotation=(math.radians(76 - k * 6), 0, math.radians(k * 25))); link(bpy.context.object, glow('Ring', (0.35, 0.65, 1.0, 1), 4.0))
    # rows of consoles with amber edges, operators seated at them
    for r in range(3):
        rad = 6.0 + r * 2.6
        for i in range(-6, 7):
            a = math.radians(i * (11 - r * 1.3)); x = math.sin(a) * rad; y = 6 - 1.0 + math.cos(a) * rad * 0.55 + 0
            ca = -a
            box((x, y, 0.55), (1.5, 0.7, 0.9), DARK(), rot=(0, 0, ca), bevel=0.04)
            box((x, y + 0.02, 1.02), (1.35, 0.55, 0.03), screen_mat('Con%d_%d' % (r, i), AMBER, 40, 1.6, 0.5), rot=(0, 0, ca))
            if random.random() < 0.55: person(x, y - 0.75, ca + math.pi, h=1.7, pose='sit', mat=DARK(), name='Op%d_%d' % (r, i))
    # the two who stand in the aisle: Alexandra (pale) and the elder of the shift (dark, taller)
    person(-0.55, 1.4, math.pi, h=1.72, pose='stand', mat=ALEX(), head_mat=ALEX(), name='Alexandra')
    person(0.65, 1.2, math.pi, h=1.84, pose='stand', mat=DARK(), name='Elder')
    # light: screens do most, a soft cool rim from above, a warm lamp on the aisle
    area((0, 6, 8), (12, 5), 260, (0.5, 0.65, 1.0), target=(0, 4, 0.5)); area((-3.5, -3, 2.6), (2, 2), 50, (1, 0.72, 0.4), target=(-0.5, 1.4, 1.3))
    camera((2.6, -9.5, 1.5), (0.2, 12, 3.7), lens=30)

# ======================== frame 2: the window over a lifeless planet ========================
def frame_window():
    stars_world(1.0, 1.0)
    # the planet: a huge sphere seen over the lower edge; barren stone with craters, lit by a low star
    RPl = 4000.0
    bpy.ops.mesh.primitive_uv_sphere_add(radius=RPl, segments=256, ring_count=128, location=(0, 3200, -3660)); pl = bpy.context.object; bpy.ops.object.shade_smooth()
    m = new_mat('Stone'); nt = m.node_tree; P = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    def noise(scale, detail=6, rough=.55, off=(0, 0, 0)):
        v = nt.nodes.new('ShaderNodeVectorMath'); v.operation = 'ADD'; nt.links.new(P, v.inputs[0]); v.inputs[1].default_value = off
        n_ = nt.nodes.new('ShaderNodeTexNoise'); n_.inputs['Scale'].default_value = scale; n_.inputs['Detail'].default_value = detail; n_.inputs['Roughness'].default_value = rough; nt.links.new(v.outputs[0], n_.inputs['Vector']); return n_.outputs['Fac']
    big = noise(0.0012, 7); fine = noise(0.02, 8)
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.4; mr.inputs['From Max'].default_value = 0.62; mr.inputs['To Min'].default_value = 0; mr.inputs['To Max'].default_value = 1; nt.links.new(big, mr.inputs['Value'])
    cl = nt.nodes.new('ShaderNodeMixRGB'); cl.inputs['Color1'].default_value = (0.32, 0.29, 0.25, 1); cl.inputs['Color2'].default_value = (0.1, 0.095, 0.09, 1); nt.links.new(mr.outputs[0], cl.inputs['Fac'])
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 0.0035; nt.links.new(P, vor.inputs['Vector'])
    cb = nt.nodes.new('ShaderNodeMapRange'); cb.inputs['From Min'].default_value = 0.0; cb.inputs['From Max'].default_value = 0.35; cb.inputs['To Min'].default_value = 0; cb.inputs['To Max'].default_value = 1; nt.links.new(vor.outputs['Distance'], cb.inputs['Value'])
    hsum = nt.nodes.new('ShaderNodeMath'); hsum.operation = 'ADD'; nt.links.new(cb.outputs[0], hsum.inputs[0]); nt.links.new(fine, hsum.inputs[1])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 1.2; bp.inputs['Distance'].default_value = 8.0; nt.links.new(hsum.outputs[0], bp.inputs['Height'])
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = 0.95; nt.links.new(cl.outputs[0], b.inputs['Base Color']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal']); out_node(m, b); link(pl, m)
    sun((-0.55, -0.35, 0.12), 6.5, (1.0, 0.9, 0.78), ang=0.5)
    # a thin atmosphere-less glow at the limb is not needed: the sun itself, just above the rim, far right
    bpy.ops.mesh.primitive_uv_sphere_add(radius=260, location=(20200, 38000, 2400)); sn = bpy.context.object; link(sn, glow('Star', (1, 0.88, 0.7, 1), 4000))
    # the window: a long opening, mullions are black beams, a low sill
    W, Hh, Y = 13.0, 5.2, 4.0
    for i in range(-2, 3): box((i * W / 4.0 * 1.0, Y, Hh / 2), (0.28, 0.5, Hh + 1), DARK(), bevel=0.02)
    box((0, Y, Hh + 0.6), (W * 1.5, 0.9, 1.2), DARK()); box((0, Y, 0.35), (W * 1.5, 1.1, 0.7), DARK());     box((-W * 0.68, Y, Hh / 2), (4.0, 1.0, Hh + 2), DARK()); box((W * 0.68, Y, Hh / 2), (4.0, 1.0, Hh + 2), DARK())
    # the room: a floor catching the reflected light, consoles at the sides with amber lines
    box((0, -4, -0.05), (30, 18, 0.1), FLOOR())
    for sx in (-1, 1):
        for k in range(3):
            xx = sx * (5.5 + k * 1.9); box((xx, 1.2 - k * 0.3, 0.5), (1.3, 0.8, 0.9), DARK(), bevel=0.04); box((xx, 1.18 - k * .3, 0.97), (1.15, 0.6, 0.03), screen_mat('wc%d_%d' % (sx, k), AMBER, 45, 1.4, 0.5))
    person(-0.3, 0.8, math.pi, h=1.72, pose='stand', mat=ALEX(), head_mat=ALEX(), name='Alexandra')
    person(0.9, 0.5, math.pi, h=1.84, pose='stand', mat=DARK(), name='Elder')
    area((0, -3, 3.5), (6, 4), 30, (0.6, 0.7, 1.0), target=(0, 1, 1));
    camera((0.3, -10.5, 1.5), (0.3, 20, 3.4), lens=24)

# ======================== frame 3: the hangar, Alexandra shows the ships ========================
def ship(x, y, rot, scale=1.0, hull_mat=None, name='Ship'):
    objs = []
    def add(o): objs.append(o); return o
    c = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Scale(scale, 4)
    def P(*v): return c @ Vector(v)
    h_ = hull_mat or HULL()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=P(0, 0, 9), segments=48, ring_count=24); o = bpy.context.object; o.scale = (6 * scale, 22 * scale, 6 * scale); o.rotation_euler = (0, 0, rot); bpy.ops.object.shade_smooth(); add(link(o, h_))
    for k in range(5):
        bpy.ops.mesh.primitive_cube_add(size=1, location=P(0, -14 + k * 6.5, 14.5)); o = bpy.context.object; o.scale = (6.2 * scale, 4.6 * scale, 3.4 * scale); o.rotation_euler = (0, 0, rot); add(link(o, pbr('Cont%d' % k, (0.09, 0.07, 0.05, 1), 0.3, 0.55)))
    for k in range(9):
        bpy.ops.mesh.primitive_torus_add(major_radius=6.05 * scale, minor_radius=0.18 * scale, location=P(0, -17 + k * 4.2, 9), rotation=(math.pi / 2, 0, rot)); o = bpy.context.object; o.scale = (1, 1, 1); add(link(o, h_))
    for k in range(16):
        bpy.ops.mesh.primitive_cube_add(size=1, location=P(5.95 * scale * (-1 if k % 2 else 1), -14 + (k // 2) * 3.8, 10.2)); o = bpy.context.object; o.scale = (0.1 * scale, 1.2 * scale, 0.5 * scale); o.rotation_euler = (0, 0, rot); add(link(o, glow('Port', (1.0, 0.72, 0.35, 1), 14)))
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(radius=2.0 * scale, depth=4 * scale, location=P(sx * 5.2, -21, 8), rotation=(math.pi / 2, 0, rot)); o = bpy.context.object; o.rotation_euler = (math.pi / 2, 0, rot); add(link(o, HULL()))
        bpy.ops.mesh.primitive_cylinder_add(radius=1.5 * scale, depth=0.3 * scale, location=P(sx * 5.2, -23.2, 8), rotation=(math.pi / 2, 0, rot)); o = bpy.context.object; o.rotation_euler = (math.pi / 2, 0, rot); add(link(o, glow('Eng', (1.0, 0.55, 0.2, 1), 25)))
        for ly in (-6, 6):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.6 * scale, depth=9 * scale, location=P(sx * 3.2, ly, 3)); o = bpy.context.object; o.rotation_euler = (0, 0, rot); add(link(o, HULL()))
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); return bpy.context.object

def frame_port():
    world((0.002, 0.003, 0.005, 1), 1.0); haze(sc.world, 0.0042, 0.55)
    box((0, 40, -0.05), (110, 140, 0.1), FLOOR())
    # the hangar: ribs and ceiling beams, a vast open gate at the far end with stars and a pale planet horizon
    for i in range(9):
        y = -8 + i * 14
        for sx in (-1, 1): box((sx * 34, y, 14), (1.4, 1.4, 28), DARK(), bevel=0.1)
        box((0, y, 28), (70, 1.4, 1.4), DARK())
        for k in (-1, 0, 1): box((k * 12, y, 27.4), (3.0, 0.4, 0.4), glow('Lamp', (1.0, 0.92, 0.8, 1), 40))
    box((0, 108, 15), (70, 0.6, 30), DARK())
    box((0, 107.6, 14), (44, 0.2, 24), glow('Gate', (0.55, 0.7, 1.0, 1), 3.0))
    # ships docked on both sides, big and dark with amber engines
    for k, (x, y, rot, sc_) in enumerate([(-21, 52, math.radians(1.5), 1.0), (21, 56, math.radians(-1.5), 1.0), (-23, 98, 0.0, 1.1), (23, 94, 0.0, 1.1)]): ship(x, y, rot, sc_, name='Ship%d' % k)
    # the crowd: ~46 silhouettes loosely gathered, all facing the ships; Alexandra stands ahead of them on a low step
    rng = random.Random(3)
    for i in range(52):
        gx = -7 + rng.random() * 14; gy = 2.0 + rng.random() * 8.0
        person(gx, gy, (rng.random() - .5) * 0.5 - (gx * 0.02), h=1.62 + rng.random() * .26, pose='stand', mat=DARK(), name='C%d' % i)
    box((0, 17.5, 0.3), (4.4, 3.0, 0.6), pbr('Step', (0.03, 0.03, 0.035, 1), 0.4, 0.4), bevel=0.04)
    person(0.0, 17.5, math.pi + math.radians(10), h=1.74, pose='point', mat=ALEX(), head_mat=ALEX(), arm_up=0.1, name='Alexandra').location.z = 0.6
    # light: the gate behind the ships, cold; floodlights in the roof; a warm rim on Alexandra
    spot((0, 30, 27), (0, 8, 0), 38000, (1.0, 0.92, 0.8), size=70, blend=0.7, radius=1.0); area((0, 50, 26), (60, 4), 4000, (0.9, 0.95, 1.0), target=(0, 52, 2)); area((0, 100, 12), (40, 20), 6000, (0.55, 0.7, 1.0), target=(0, 20, 1))
    spot((4, 4, 9), (0.2, 17.5, 2.2), 5200, (1.0, 0.78, 0.5), size=22, blend=0.6, radius=0.4)
    camera((0.3, -17, 2.3), (0.4, 40, 4.6), lens=26)

{'pult': frame_pult, 'window': frame_window, 'port': frame_port}[FRAME]()

# glow around bright sources
sc.use_nodes = True; ct = sc.node_tree
for n_ in list(ct.nodes): ct.nodes.remove(n_)
rl = ct.nodes.new('CompositorNodeRLayers'); gl_ = ct.nodes.new('CompositorNodeGlare'); gl_.glare_type = 'FOG_GLOW'; gl_.quality = 'HIGH'; gl_.threshold = 1.2; gl_.size = 7; gl_.mix = -0.3
cmp_ = ct.nodes.new('CompositorNodeComposite'); ct.links.new(rl.outputs['Image'], gl_.inputs['Image']); ct.links.new(gl_.outputs['Image'], cmp_.inputs['Image'])
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('RENDERED', FRAME, OUT, RES, 'samples', SAMPLES)
