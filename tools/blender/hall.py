"""============ Stora hallen i Blender ============
Bygger stora hallen (väggar, golv, dekor, socklar), renderar förhandsbilder eller bakar ljuset och
exporterar en GLB till appen.

  Blender -b -P tools/blender/hall.py -- render <mapp>   förhandsbilder (PNG) i <mapp>
  Blender -b -P tools/blender/hall.py -- bake [mapp]     bakar ljuset och skriver webb/assets/museum/hall.glb
  Blender -b -P tools/blender/hall.py -- blend <fil>     sparar scenen som .blend för att titta i Blender

Koordinater som i appen: x åt höger, y uppåt, z mot entrén i söder (meter). P() gör om till Blender.
Mått och dörrar följer ROOMS och DOORS i webb/js/museum/catalog.js. Varje vägg blir en egen nod
(wall_N, wall_S, wall_W, wall_E) med allt som sitter på den, så att appen kan sänka väggarna. Det som
lyser (lampskärmar) ligger i egna noder (<nod>__glow) som appen ritar utan bakat ljus."""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = ARGS[0] if ARGS else 'render'
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))

WALL_H, T = 7.5, 0.6
X0, X1, Z0, Z1 = -14, 14, -10, 10

def P(x, y, z): return Vector((x, -z, y))

bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
COL = SC.collection
rnd = random.Random(7)

# ---------- material ----------
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def new_mat(name):
    m = bpy.data.materials.new(name); nt = m.node_tree
    return m, nt, nt.nodes['Principled BSDF']

def node(nt, kind, *inputs, ins=None, **props):
    """Ny nod. inputs sätts i ordning (None hoppar över), ins efter namn. Ett värde kan vara en utgång (länkas)."""
    n = nt.nodes.new(kind)
    for k, v in props.items(): setattr(n, k, v)
    for key, v in list(enumerate(inputs)) + list((ins or {}).items()):
        if v is None: continue
        if hasattr(v, 'is_output'): nt.links.new(v, n.inputs[key])
        else: n.inputs[key].default_value = v
    return n

def math_(nt, op, a, b=None):
    return node(nt, 'ShaderNodeMath', a, b, operation=op).outputs[0]

def plain(name, color, rough=0.7, metal=0.0, spec=0.3):
    m, nt, b = new_mat(name)
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    return m

def glow(name, color, strength):
    m, nt, b = new_mat(name)
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Emission Color'].default_value = (*lin(color), 1)
    b.inputs['Emission Strength'].default_value = strength
    m['glow'] = color
    return m

def wall_uv(nt):
    """Världskoordinater i väggens plan: (längs väggen, höjd). Väggar längs x och z får var sitt plan."""
    geo = node(nt, 'ShaderNodeNewGeometry')
    p = node(nt, 'ShaderNodeSeparateXYZ', geo.outputs['Position'])
    n = node(nt, 'ShaderNodeSeparateXYZ', geo.outputs['Normal'])
    side = math_(nt, 'GREATER_THAN', math_(nt, 'ABSOLUTE', n.outputs[0]), math_(nt, 'ABSOLUTE', n.outputs[1]))
    u = math_(nt, 'ADD', p.outputs[0], math_(nt, 'MULTIPLY', math_(nt, 'SUBTRACT', p.outputs[1], p.outputs[0]), side))
    return node(nt, 'ShaderNodeCombineXYZ', u, p.outputs[2], 0).outputs[0], p

def blocks(name, c1, c2, mortar, bw, rh, offset=0.5, rough=0.85, bump=0.3, floor=False, border=None):
    """Sten i block (väggar) eller plattor (golv), med lite brus i färgen och fogar som bump."""
    m, nt, b = new_mat(name)
    if floor:
        geo = node(nt, 'ShaderNodeNewGeometry'); p = node(nt, 'ShaderNodeSeparateXYZ', geo.outputs['Position'])
        vec = node(nt, 'ShaderNodeCombineXYZ', p.outputs[0], p.outputs[1], 0).outputs[0]
    else:
        vec, p = wall_uv(nt)
    br = node(nt, 'ShaderNodeTexBrick', vec, ins={'Color1': (*lin(c1), 1), 'Color2': (*lin(c2), 1), 'Mortar': (*lin(mortar), 1), 'Scale': 1.0,
              'Mortar Size': 0.012, 'Mortar Smooth': 0.15, 'Bias': 0.0, 'Brick Width': bw, 'Row Height': rh},
              offset=offset, offset_frequency=2, squash=1.0, squash_frequency=2)
    noise = node(nt, 'ShaderNodeTexNoise', vec, None, 3.0, 4.0, 0.6, noise_dimensions='2D')
    col = node(nt, 'ShaderNodeMix', 0.18, None, None, None, None, None, br.outputs['Color'], noise.outputs['Color'], data_type='RGBA', blend_type='OVERLAY').outputs[2]
    if border:  # mörkare kant längs väggarna
        bx = math_(nt, 'GREATER_THAN', math_(nt, 'ABSOLUTE', p.outputs[0]), border[0])
        by = math_(nt, 'GREATER_THAN', math_(nt, 'ABSOLUTE', p.outputs[1]), border[1])
        f = math_(nt, 'MAXIMUM', bx, by)
        col = node(nt, 'ShaderNodeMix', f, None, None, None, None, None, col, (*lin(border[2]), 1), data_type='RGBA', blend_type='MULTIPLY').outputs[2]
    nt.links.new(col, b.inputs['Base Color'])
    bm = node(nt, 'ShaderNodeBump', ins={'Strength': bump, 'Distance': 0.01, 'Height': math_(nt, 'SUBTRACT', 1.0, br.outputs['Fac'])})
    nt.links.new(bm.outputs[0], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.25
    return m

def gradient(name, stops, axis=2):
    """Färg efter höjd i objektets Generated-koordinater (för väggmålningen)."""
    m, nt, b = new_mat(name)
    tc = node(nt, 'ShaderNodeTexCoord'); s = node(nt, 'ShaderNodeSeparateXYZ', tc.outputs['Generated'])
    ramp = node(nt, 'ShaderNodeValToRGB', s.outputs[axis])
    els = ramp.color_ramp.elements
    for i, (pos, c) in enumerate(stops):
        e = els[i] if i < len(els) else els.new(pos)
        e.position = pos; e.color = (*lin(c), 1)
    noise = node(nt, 'ShaderNodeTexNoise', tc.outputs['Object'], None, 6.0, 6.0, 0.6)
    col = node(nt, 'ShaderNodeMix', 0.12, None, None, None, None, None, ramp.outputs[0], noise.outputs['Color'], data_type='RGBA', blend_type='OVERLAY').outputs[2]
    nt.links.new(col, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.9
    b.inputs['Specular IOR Level'].default_value = 0.1
    return m

M = dict(
    wall=blocks('wall', '#e6d3ad', '#dcc69c', '#c4ab82', 1.6, 0.8),
    plinth=blocks('plinth', '#c9ae84', '#bfa279', '#a58c66', 1.2, 0.4),
    trim=plain('trim', '#efe4ca', 0.75),
    floor=blocks('floor', '#ebdfc6', '#e0d2b4', '#b8a383', 1.4, 1.4, offset=0.0, rough=0.5, bump=0.5, floor=True,
                 border=(12.9, 8.9, '#c8b089')),
    prints=plain('prints', '#6f6658', 0.8),
    slate=plain('slate', '#3b3e44', 0.55),
    dwood=plain('dwood', '#5c3220', 0.55),
    wood=plain('wood', '#6e3c22', 0.6),
    marble=plain('marble', '#ece5d6', 0.35, spec=0.5),
    brass=plain('brass', '#d1a14e', 0.35, 1.0),
    rope=plain('rope', '#4a1f22', 0.8),
    teal=plain('teal', '#1f6d66', 0.85, spec=0.2),
    navy=plain('navy', '#243c6e', 0.85, spec=0.2),
    gold=plain('gold', '#d6a842', 0.5, 0.6),
    cream=plain('cream', '#f1e6c9', 0.8),
    green_sign=plain('green_sign', '#1e5a47', 0.6),
    leaf=plain('leaf', '#3d8a3b', 0.55, spec=0.4),
    leaf2=plain('leaf2', '#2c6b34', 0.55, spec=0.4),
    stem=plain('stem', '#5a7f37', 0.7),
    soil=plain('soil', '#3a2a1d', 0.95),
    cushion=plain('cushion', '#2f5b48', 0.85),
    canvas=gradient('canvas', [(0.0, '#a9a27a'), (0.18, '#c9b98c'), (0.45, '#e2cf9f'), (1.0, '#f0e2b8')]),
    hills=plain('hills', '#c2b98e', 0.9, spec=0.1),
    paint=plain('paint', '#6c7b60', 0.9, spec=0.1),
    paint_dark=plain('paint_dark', '#55654f', 0.9, spec=0.1),
    lamp=glow('lamp', '#ffd59a', 9.0),
)

# ---------- byggstenar ----------
def mk(name, bm, mat, grp, bevel=0.0, segs=2, smooth=None, face=None):
    """Objekt av en bmesh. face = riktning (appens koordinater) som platta ytor ska vända sig mot: bakningen
    ljussätter bara framsidan."""
    bm.normal_update()
    if face is not None:
        d = P(*face)
        for f in bm.faces:
            if f.normal.dot(d) < 0: f.normal_flip()
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in (mat if isinstance(mat, list) else [mat]): me.materials.append(m)
    ob = bpy.data.objects.new(name, me); COL.objects.link(ob); ob['grp'] = grp
    if smooth if smooth is not None else bevel > 0: me.shade_smooth()
    if bevel > 0:
        b = ob.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = segs
        b.limit_method = 'ANGLE'; b.angle_limit = math.radians(30); b.harden_normals = True
    return ob

def xform(bm, M4): bmesh.ops.transform(bm, matrix=M4, verts=bm.verts)

def bm_box(c, s, rot=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    xform(bm, Matrix.Translation(P(*c)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal((s[0], s[2], s[1], 1)))
    return bm

def box(name, c, s, mat, grp, bevel=0.025, rot=0.0, segs=2):
    return mk(name, bm_box(c, s, rot), mat, grp, bevel, segs)

def bm_cyl(c, r0, r1, h, seg=16, rot=None):
    """Cylinder/kon som står upp (c = mitten av botten), eller längs rot (Matrix) om den anges."""
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=h)
    xform(bm, Matrix.Translation((0, 0, h / 2)))
    if rot: xform(bm, rot)
    xform(bm, Matrix.Translation(P(*c)))
    return bm

def bm_sphere(c, r, seg=12):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 2, radius=r)
    xform(bm, Matrix.Translation(P(*c))); return bm

def dedupe(pts, eps=1e-4):
    out = []
    for p in pts:
        if not out or (abs(p[0] - out[-1][0]) > eps or abs(p[1] - out[-1][1]) > eps): out.append(p)
    if len(out) > 2 and abs(out[0][0] - out[-1][0]) < eps and abs(out[0][1] - out[-1][1]) < eps: out.pop()
    return out

def bm_prism(outline, w0, w1, to3):
    """Platt form (outline i planet (a, b)) som dras ut längs w från w0 till w1. to3(a, b, w) -> appens (x, y, z)."""
    outline = dedupe(outline)
    bm = bmesh.new()
    A = [bm.verts.new(P(*to3(a, b, w0))) for a, b in outline]
    B = [bm.verts.new(P(*to3(a, b, w1))) for a, b in outline]
    bm.faces.new(A); bm.faces.new(B[::-1])
    for i in range(len(A)):
        j = (i + 1) % len(A); bm.faces.new((A[i], A[j], B[j], B[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_flat(outline, to3):
    """En enda platt yta (för målning, fotspår och emblem)."""
    outline = dedupe(outline)
    bm = bmesh.new(); bm.faces.new([bm.verts.new(P(*to3(a, b))) for a, b in outline]); return bm

def bm_tube(pts, r0, r1, sides=6):
    """Rör längs punkter (appens koordinater) som smalnar av från r0 till r1."""
    bm = bmesh.new(); V = [P(*p) for p in pts]; rings = []
    for i, p in enumerate(V):
        d = (V[min(i + 1, len(V) - 1)] - V[max(i - 1, 0)]).normalized()
        q = d.to_track_quat('Z', 'Y'); r = r0 + (r1 - r0) * i / (len(V) - 1)
        rings.append([bm.verts.new(p + q @ Vector((math.cos(a) * r, math.sin(a) * r, 0))) for a in (k * 2 * math.pi / sides for k in range(sides))])
    for a, b in zip(rings, rings[1:]):
        for k in range(sides): bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))
    return bm

def join_bm(items):
    """Slår ihop flera bmesh till en (för små delar som får samma material)."""
    me = bpy.data.meshes.new('tmp'); out = bmesh.new()
    for bm in items:
        bm.to_mesh(me); out.from_mesh(me); bm.free()
    bpy.data.meshes.remove(me); return out

def arc(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

def smooth_closed(pts, k=5):
    """Catmull-Rom genom punkterna (sluten kurva), för mjuka siluetter."""
    out = []; n = len(pts)
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        for s in range(k):
            t = s / k; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    return out

def light(name, kind, pos, power, color=(1, 1, 1), radius=0.1, target=None, size=None, spot=None):
    L = bpy.data.lights.new(name, kind); L.energy = power; L.color = color
    if kind in ('POINT', 'SPOT'): L.shadow_soft_size = radius
    if kind == 'AREA': L.shape = 'RECTANGLE'; L.size, L.size_y = size
    if kind == 'SPOT': L.spot_size, L.spot_blend = spot
    ob = bpy.data.objects.new(name, L); COL.objects.link(ob); ob.location = P(*pos)
    if target: ob.rotation_euler = (P(*target) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    return ob

LAMP = (1.0, 0.72, 0.45)

# ---------- väggarna ----------
class Wall:
    """En vägg på linjen x = at eller z = at. u = läge längs väggen, v = höjd, w = ut från mittlinjen in mot salen."""
    def __init__(self, key, axis, at, n, s0, s1, doors):
        self.key, self.axis, self.at, self.n, self.s0, self.s1, self.doors = key, axis, at, n, s0, s1, doors
        self.grp = 'wall_' + key
    def to3(self, u, v, w):
        return (u, v, self.at + self.n * w) if self.axis == 'z' else (self.at + self.n * w, v, u)
    def inward(self):
        return (0, 0, self.n) if self.axis == 'z' else (self.n, 0, 0)
    def rot(self):  # vridning så att +z i en lokal låda pekar in i salen
        if self.axis == 'z': return 0.0 if self.n > 0 else math.pi
        return math.pi / 2 if self.n > 0 else -math.pi / 2
    def box(self, name, u, v, w, su, sv, sw, mat, bevel=0.02, segs=2):
        c = self.to3(u, v, w); s = (su, sv, sw) if self.axis == 'z' else (sw, sv, su)
        return box(f'{self.grp}_{name}', c, s, mat, self.grp, bevel, segs=segs)
    def prism_uv(self, name, outline, w0, w1, mat, bevel=0.02, grp=None):  # form i (u, v), tjocklek längs w
        return mk(f'{self.grp}_{name}', bm_prism(outline, w0, w1, lambda a, b, w: self.to3(a, b, w)), mat, grp or self.grp, bevel)
    def prism_wv(self, name, outline, u0, u1, mat, bevel=0.015):  # profil i (w, v), dras ut längs väggen
        return mk(f'{self.grp}_{name}', bm_prism(outline, u0, u1, lambda a, b, u: self.to3(u, b, a)), mat, self.grp, bevel)
    def flat(self, name, outline, w, mat, grp=None):
        return mk(f'{self.grp}_{name}', bm_flat(outline, lambda a, b: self.to3(a, b, w)), mat, grp or self.grp, face=self.inward())

FACE = T / 2  # väggens insida, räknat från mittlinjen

def door_outline(f, t, spring):
    r, c = (t - f) / 2, (f + t) / 2
    return [(f, 0), (f, spring)] + arc(c, spring, r, math.pi, 0, 24)[1:-1] + [(t, spring), (t, 0)]

def build_wall(W):
    # själva väggen med valvöppningar
    pts = [(W.s0, 0)]
    for f, t, sp in W.doors: pts += door_outline(f, t, sp)
    pts += [(W.s1, 0), (W.s1, WALL_H), (W.s0, WALL_H)]
    W.prism_uv('body', pts, -FACE, FACE, M['wall'], bevel=0.03)
    # sockel och taklist (väggar längs z slutar vid de andra väggarnas insida, så att inget överlappar)
    inset = 0 if W.axis == 'z' else 0.3
    edges = [W.s0 + inset]
    for f, t, sp in W.doors: edges += [f - 0.45, t + 0.45]
    edges.append(W.s1 - inset)
    for i in range(0, len(edges), 2):
        a, b = edges[i] + (0.12 if W.axis == 'x' else 0), edges[i + 1] - (0.12 if W.axis == 'x' else 0)
        W.box(f'plinth{i}', (a + b) / 2, 0.2, FACE + 0.06, b - a, 0.4, 0.12, M['plinth'], 0.02)
    prof = [(FACE - 0.01, 6.75), (FACE + 0.08, 6.75), (FACE + 0.08, 6.92), (FACE + 0.2, 7.02), (FACE + 0.2, 7.22), (FACE + 0.3, 7.28), (FACE + 0.3, WALL_H), (FACE - 0.01, WALL_H)]
    W.prism_wv('cornice', prof, W.s0 + 2 * inset, W.s1 - 2 * inset, M['trim'])
    # valvbågar runt öppningarna
    for k, (f, t, sp) in enumerate(W.doors):
        r, c, b = (t - f) / 2, (f + t) / 2, 0.45
        frame = [(f - b, 0), (f - b, sp)] + arc(c, sp, r + b, math.pi, 0, 24)[1:-1] + [(t + b, sp), (t + b, 0), (t, 0), (t, sp)] + arc(c, sp, r, 0, math.pi, 24)[1:-1] + [(f, sp)]
        W.prism_uv(f'arch{k}', frame, -FACE - 0.1, FACE + 0.1, M['trim'], bevel=0.03)
        W.box(f'key{k}', c, sp + r + 0.25, 0, 0.55, 0.75, T + 0.32, M['trim'], 0.03)
        for e in (f - b / 2, t + b / 2):
            W.box(f'impost{k}_{e:.1f}', e, sp + 0.08, 0, b + 0.2, 0.18, T + 0.34, M['trim'], 0.02)
            W.box(f'jbase{k}_{e:.1f}', e, 0.25, 0, b + 0.16, 0.5, T + 0.3, M['plinth'], 0.02)

def pilaster(W, u):
    W.box(f'pil{u:.1f}', u, 3.55, FACE + 0.08, 0.7, 6.4, 0.16, M['trim'], 0.02)
    W.box(f'pilb{u:.1f}', u, 0.3, FACE + 0.12, 0.86, 0.6, 0.24, M['plinth'], 0.02)
    W.box(f'pilc{u:.1f}', u, 6.6, FACE + 0.13, 0.9, 0.3, 0.26, M['trim'], 0.02)

def sconce(W, u, v=3.7):
    sh = [(-0.13, -0.22), (0.13, -0.22), (0.16, 0.05), (0.0, 0.26), (-0.16, 0.05)]
    W.prism_uv(f'sconce{u:.1f}', [(u + a, v - 0.25 + b) for a, b in sh], FACE, FACE + 0.04, M['brass'], 0.01)
    W.box(f'arm{u:.1f}', u, v - 0.3, FACE + 0.15, 0.06, 0.06, 0.24, M['brass'], 0.01)
    W_c = W.to3(u, v - 0.34, FACE + 0.26)
    mk(f'{W.grp}_cup{u:.1f}', bm_cyl(W_c, 0.07, 0.08, 0.06, 12), M['brass'], W.grp)
    mk(f'{W.grp}_shade{u:.1f}', bm_cyl((W_c[0], W_c[1] + 0.06, W_c[2]), 0.08, 0.15, 0.3, 16), M['lamp'], W.grp + '__glow', smooth=True)
    light(f'L_{W.grp}_{u:.1f}', 'POINT', W.to3(u, v - 0.05, FACE + 0.45), 170, LAMP, 0.15)

# ---------- emblem och bilder ----------
def ammonite(cx, cy, s):
    """Spiralsnäcka som en bred spiral (outline i 2D)."""
    outer, inner = [], []
    for i in range(80):
        th = i / 79 * 3.3 * math.pi; r = s * 0.5 * math.exp(-0.16 * th)
        w = r * 0.42
        outer.append((cx + r * math.cos(-th + 1.2), cy + r * math.sin(-th + 1.2)))
        inner.append((cx + (r - w) * math.cos(-th + 1.2), cy + (r - w) * math.sin(-th + 1.2)))
    return outer + inner[::-1]

def footprint(cx, cy, s, ang=0.0):
    """Fotspår med tre tår. Returnerar flera former (trampdyna och tår), riktade längs ang (0 = uppåt)."""
    ca, sa = math.cos(ang), math.sin(ang)
    R = lambda x, y: (cx + (x * ca - y * sa) * s, cy + (x * sa + y * ca) * s)
    shapes = [[R(0.2 * math.cos(a), 0.22 * math.sin(a) - 0.12) for a in (i / 20 * 2 * math.pi for i in range(20))]]
    for t in (-0.55, 0.0, 0.55):
        ct, st = math.cos(t), math.sin(t); bx, by = -0.3 * st, 0.0 + 0.3 * ct
        toe = []
        for a in (i / 16 * 2 * math.pi for i in range(16)):
            x, y = 0.09 * math.cos(a), 0.28 * math.sin(a)
            if y > 0: x *= 1 - 0.6 * (y / 0.28) ** 2  # spetsig klo
            toe.append(R(bx + x * ct - y * st, by + x * st + y * ct))
        shapes.append(toe)
    return shapes

def wave(u, v):  # banderollens veck: djup ut från väggen
    return 0.035 * math.sin(u * 2 * math.pi * 1.5 + 0.6) * (0.3 + v)

def banner(W, u, top, color, emblem):
    wdt, hgt, tip = 1.6, 3.0, 0.35
    rodv = top + 0.12
    W.box(f'rod{u:.1f}', u, rodv, FACE + 0.16, wdt + 0.5, 0.06, 0.06, M['brass'], 0.02)
    for e in (-1, 1):
        mk(f'{W.grp}_fin{u:.1f}_{e}', bm_sphere(W.to3(u + e * (wdt / 2 + 0.28), rodv, FACE + 0.16), 0.07), M['brass'], W.grp, smooth=True)
        W.box(f'bracket{u:.1f}_{e}', u + e * (wdt / 2 + 0.1), rodv, FACE + 0.08, 0.05, 0.05, 0.16, M['brass'], 0.0)
    def cloth(name, mat, wd, extra, w_off):
        nu, nv = 10, 14; bm = bmesh.new(); grid = []
        for j in range(nv + 1):
            v = j / nv; row = []
            for i in range(nu + 1):
                uu = i / nu; x = u + (uu - 0.5) * wd
                y = top - v * (hgt + extra + tip * (1 - abs(2 * uu - 1)))
                row.append(bm.verts.new(P(*W.to3(x, y, FACE + 0.16 + w_off + wave(uu, v)))))
            grid.append(row)
        for j in range(nv):
            for i in range(nu): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
        return mk(f'{W.grp}_{name}{u:.1f}', bm, mat, W.grp, smooth=True, face=W.inward())
    cloth('gold', M['gold'], wdt + 0.12, 0.1, 0.0)
    cloth('cloth', color, wdt, 0.0, 0.012)
    cy = top - 1.25
    shapes = [ammonite(u, cy, 1.25)] if emblem == 'ammonite' else footprint(u, cy - 0.05, 1.05)
    for k, sh in enumerate(shapes):
        bm = bmesh.new()
        bm.faces.new([bm.verts.new(P(*W.to3(a, b, FACE + 0.16 + 0.03 + wave((a - u) / wdt + 0.5, (top - b) / hgt)))) for a, b in dedupe(sh)])
        mk(f'{W.grp}_emb{u:.1f}_{k}', bm, M['cream'], W.grp, face=W.inward())

# siluetter till väggmålningen (x åt höger, y uppåt, meter), vända åt vänster
BRACHIO = [(-0.05, 2.85), (0.05, 3.0), (0.3, 3.05), (0.42, 2.95), (0.55, 2.5), (0.8, 1.9), (1.1, 1.58), (1.6, 1.47), (2.2, 1.3), (2.7, 1.13),
           (3.3, 0.92), (3.9, 0.72), (3.3, 0.8), (2.75, 0.88), (2.5, 0.82), (2.47, 0.0), (2.27, 0.0), (2.25, 0.68), (2.05, 0.7), (2.0, 0.0),
           (1.82, 0.0), (1.8, 0.7), (1.3, 0.75), (1.25, 0.0), (1.05, 0.0), (1.0, 0.78), (0.9, 0.8), (0.86, 0.0), (0.68, 0.0), (0.64, 1.0),
           (0.55, 1.4), (0.32, 2.3), (0.17, 2.72), (0.08, 2.79)]
TREX = [(0.0, 1.55), (0.1, 1.7), (0.45, 1.79), (0.6, 1.71), (0.76, 1.63), (1.0, 1.6), (1.5, 1.56), (2.0, 1.42), (2.65, 1.2), (2.0, 1.27),
        (1.62, 1.2), (1.47, 0.78), (1.52, 0.36), (1.58, 0.04), (1.42, 0.0), (1.2, 0.0), (1.25, 0.1), (1.3, 0.36), (1.15, 0.76),
        (1.05, 0.96), (0.85, 1.05), (0.8, 1.15), (0.93, 0.98), (0.86, 0.95), (0.72, 1.15), (0.6, 1.3), (0.45, 1.35), (0.12, 1.42), (0.33, 1.5)]
TREX_LEG = [(1.25, 1.05), (1.06, 0.62), (1.0, 0.06), (0.83, 0.0), (0.84, 0.08), (0.93, 0.6), (1.08, 1.08)]
TRIKE = [(0.0, 0.55), (0.12, 0.75), (0.15, 0.82), (0.1, 0.98), (0.24, 0.84), (0.36, 0.95), (0.25, 1.38), (0.48, 1.02), (0.56, 1.15),
         (0.7, 1.45), (0.9, 1.4), (0.96, 1.05), (1.3, 1.1), (1.7, 1.04), (2.2, 0.7), (1.75, 0.76), (1.7, 0.5), (1.72, 0.0), (1.52, 0.0),
         (1.5, 0.4), (1.3, 0.45), (1.28, 0.0), (1.1, 0.0), (1.05, 0.45), (0.8, 0.45), (0.78, 0.0), (0.6, 0.0), (0.58, 0.4), (0.45, 0.38),
         (0.2, 0.45), (0.05, 0.48)]

def place(shape, x, y, s, flip=False):
    return [(x + (-a if flip else a) * s, y + b * s) for a, b in shape]

def palm(x, y, h, lean, s=1.0):
    top = (x + lean, y + h)
    trunk = [(x - 0.09 * s, y), (x + 0.09 * s, y), (top[0] + 0.05 * s, top[1]), (top[0] - 0.05 * s, top[1])]
    fronds = []
    for k in range(7):
        a = math.pi * (0.08 + 0.84 * k / 6); L = 0.95 * s * (0.85 + 0.3 * math.sin(k * 1.7))
        cl = [(top[0] + math.cos(a) * L * t, top[1] + math.sin(a) * L * t * 0.7 - 0.55 * (L * t) ** 2) for t in (i / 10 for i in range(11))]
        up, dn = [], []
        for i, (px, py) in enumerate(cl):
            t = i / 10; wd = 0.13 * s * math.sin(math.pi * t) ** 0.8
            q = cl[min(i + 1, 10)]; p0 = cl[max(i - 1, 0)]; dx, dy = q[0] - p0[0], q[1] - p0[1]; ln = math.hypot(dx, dy) or 1
            up.append((px - dy / ln * wd, py + dx / ln * wd)); dn.append((px + dy / ln * wd, py - dx / ln * wd))
        fronds.append(up + dn[::-1][1:-1])
    return [trunk] + fronds

def mural(W, u0, v0, wd, ht):
    W.box('mural_canvas', u0 + wd / 2, v0 + ht / 2, FACE + 0.03, wd, ht, 0.06, M['canvas'], 0.0)
    for side, (cu, cv, su, sv) in enumerate([(u0 + wd / 2, v0 - 0.08, wd + 0.42, 0.16), (u0 + wd / 2, v0 + ht + 0.08, wd + 0.42, 0.16),
                                              (u0 - 0.13, v0 + ht / 2, 0.26, ht), (u0 + wd + 0.13, v0 + ht / 2, 0.26, ht)]):
        W.box(f'mframe{side}', cu, cv, FACE + 0.06, su, sv, 0.12, M['dwood'], 0.025)
    for side, (cu, cv, su, sv) in enumerate([(u0 + wd / 2, v0 + 0.02, wd, 0.04), (u0 + wd / 2, v0 + ht - 0.02, wd, 0.04),
                                              (u0 + 0.02, v0 + ht / 2, 0.04, ht), (u0 + wd - 0.02, v0 + ht / 2, 0.04, ht)]):
        W.box(f'mlip{side}', cu, cv, FACE + 0.075, su, sv, 0.03, M['gold'], 0.0)
    layer = [0]
    def paint(name, outline, mat):
        layer[0] += 1
        W.flat(f'paint_{name}', [(u0 + a, v0 + b) for a, b in outline], FACE + 0.061 + layer[0] * 0.0012, mat)
    paint('hill1', [(0, 0.4)] + [(x, 0.9 + 0.35 * math.sin(x * 0.9 + 0.4) + 0.15 * math.sin(x * 2.3)) for x in (i * wd / 30 for i in range(31))] + [(wd, 0.4)], M['hills'])
    for i, part in enumerate(palm(0.75, 0.55, 2.55, 0.25)): paint(f'palmL{i}', part, M['paint_dark'])
    for i, part in enumerate(palm(wd - 0.6, 0.55, 2.3, -0.2, 0.9)): paint(f'palmR{i}', part, M['paint_dark'])
    for i, part in enumerate(palm(2.6, 0.6, 1.6, 0.1, 0.7)): paint(f'palmM{i}', part, M['paint'])
    paint('brachio', smooth_closed(place(BRACHIO, 1.1, 0.55, 0.78), 4), M['paint'])
    paint('trike', smooth_closed(place(TRIKE, 3.15, 0.5, 0.62), 4), M['paint_dark'])
    paint('trexleg', smooth_closed(place(TREX_LEG, 4.4, 0.55, 1.12), 4), M['paint_dark'])
    paint('trex', smooth_closed(place(TREX, 4.4, 0.55, 1.12), 4), M['paint_dark'])
    paint('ground', [(0, 0)] + [(x, 0.5 + 0.08 * math.sin(x * 3.1) + 0.05 * math.sin(x * 7.7)) for x in (i * wd / 40 for i in range(41))] + [(wd, 0)], M['paint_dark'])

# ---------- dekor på golvet ----------
def planter(name, x, z, kind, s=1.0, seed=0):
    r = random.Random(seed); g = 'decor'
    box(f'{name}_box', (x, 0.3 * s, z), (0.8 * s, 0.6 * s, 0.8 * s), M['wood'], g, 0.03)
    for k, (dx, dz, sx, sz) in enumerate([(0, -0.41, 0.86, 0.06), (0, 0.41, 0.86, 0.06), (-0.41, 0, 0.06, 0.86), (0.41, 0, 0.06, 0.86)]):
        box(f'{name}_rim{k}', (x + dx * s, 0.61 * s, z + dz * s), (sx * s, 0.05 * s, sz * s), M['brass'], g, 0.01)
    box(f'{name}_soil', (x, 0.585 * s, z), (0.74 * s, 0.03 * s, 0.74 * s), M['soil'], g, 0.0)
    base = Vector((x, 0.6 * s, z))
    leaves, stems = [], []
    if kind == 'monstera':
        n = 15
        for i in range(n):
            yaw = i * 2.4 + r.uniform(-0.3, 0.3); pitch = r.uniform(0.3, 0.9); sl = r.uniform(0.5, 1.5) * s
            d = Vector((math.cos(yaw), 0, math.sin(yaw)))
            lb = base + d * (sl * 0.35) + Vector((0, sl, 0))
            mid = base + d * (sl * 0.1) + Vector((0, sl * 0.6, 0))
            stems.append(bm_tube([tuple(base + d * 0.03), tuple(mid), tuple(lb)], 0.018 * s, 0.012 * s, 5))
            leaves.append((leaf_bm(lb, yaw, pitch, r.uniform(0.55, 0.75) * s, r.uniform(0.3, 0.38) * s, 0.7, 0.18), i % 2))
    else:  # höga smala blad
        n = 22
        for i in range(n):
            yaw = i * 2.4 + r.uniform(-0.2, 0.2); pitch = r.uniform(1.0, 1.4)
            leaves.append((leaf_bm(base + Vector((0, 0.02, 0)), yaw, pitch, r.uniform(1.2, 1.9) * s, r.uniform(0.08, 0.12) * s, 0.6, 0.25, pointy=True), i % 2))
    for mi in (0, 1):
        items = [b for b, k in leaves if k == mi]
        if items: mk(f'{name}_leaves{mi}', join_bm(items), M['leaf' if mi == 0 else 'leaf2'], g, smooth=True, face=(0, 1, 0))
    if stems: mk(f'{name}_stems', join_bm(stems), M['stem'], g, smooth=True)

def leaf_bm(base, yaw, pitch, L, wd, droop, fold, pointy=False):
    d = Vector((math.cos(yaw), 0, math.sin(yaw))); side = Vector((-math.sin(yaw), 0, math.cos(yaw))); up = Vector((0, 1, 0))
    nu, nv = 8, 4; bm = bmesh.new(); grid = []
    for i in range(nu + 1):
        t = i / nu; along = L * t
        c = base + d * (along * math.cos(pitch)) + up * (along * math.sin(pitch) - droop * along * along / L * (0.6 if pointy else 1.0))
        wp = wd * (math.sin(math.pi * min(1, t)) ** (0.5 if not pointy else 0.9)) * (1 - 0.25 * t)
        row = []
        for j in range(nv + 1):
            v = j / nv * 2 - 1
            p = c + side * (v * wp) + up * (fold * abs(v) * wp)
            row.append(bm.verts.new(P(*p)))
        grid.append(row)
    for i in range(nu):
        for j in range(nv): bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    return bm

def bench(name, x, z, rot):
    ca, sa = math.cos(rot), math.sin(rot)
    at = lambda lx, lz: (x + lx * ca + lz * sa, z - lx * sa + lz * ca)
    for e in (-1, 1):
        px, pz = at(e * 0.95, 0)
        box(f'{name}_leg{e}', (px, 0.22, pz), (0.12, 0.44, 0.56), M['dwood'], 'decor', 0.02, rot)
    box(f'{name}_rail', (x, 0.36, z), (1.9, 0.08, 0.48), M['dwood'], 'decor', 0.015, rot)
    box(f'{name}_seat', (x, 0.5, z), (2.1, 0.16, 0.62), M['cushion'], 'decor', 0.06, rot, segs=3)
    for i in range(3):
        px, pz = at(-0.7 + i * 0.7, 0)
        mk(f'{name}_btn{i}', bm_sphere((px, 0.58, pz), 0.025, 8), M['cushion'], 'decor', smooth=True)

# ---------- socklar till föremålen (samma mått som buildStand i build.js) ----------
def stanchions(grp, cx, cz, rot, w, d):
    ca, sa = math.cos(rot), math.sin(rot)
    at = lambda lx, lz: (cx + lx * ca + lz * sa, cz - lx * sa + lz * ca)
    nx, nz = max(2, round(w / 2.4)), max(2, round(d / 2.4)); pts = []
    for i in range(nx + 1): pts.append((-w / 2 + i * w / nx, -d / 2))
    for i in range(1, nz + 1): pts.append((w / 2, -d / 2 + i * d / nz))
    for i in range(nx - 1, -1, -1): pts.append((-w / 2 + i * w / nx, d / 2))
    for i in range(nz - 1, 0, -1): pts.append((-w / 2, -d / 2 + i * d / nz))
    brass, ropes = [], []
    for i, (lx, lz) in enumerate(pts):
        x, z = at(lx, lz)
        brass += [bm_cyl((x, 0, z), 0.17, 0.15, 0.05, 16), bm_cyl((x, 0.05, z), 0.045, 0.04, 0.88, 10), bm_sphere((x, 0.97, z), 0.075, 10)]
        x2, z2 = at(*pts[(i + 1) % len(pts)])
        ropes.append(bm_tube([((1 - t) * x + t * x2, 0.9 - 0.22 * 4 * t * (1 - t), (1 - t) * z + t * z2) for t in (k / 10 for k in range(11))], 0.028, 0.028, 6))
    mk(f'{grp}_posts', join_bm(brass), M['brass'], grp, smooth=True)
    mk(f'{grp}_ropes', join_bm(ropes), M['rope'], grp, smooth=True)

def platform(grp, x, z, rot, w, d):
    box(f'{grp}_skirt', (x, 0.06, z), (w + 0.24, 0.12, d + 0.24), M['dwood'], grp, 0.03, rot)
    box(f'{grp}_body', (x, 0.24, z), (w, 0.32, d), M['slate'], grp, 0.04, rot)
    ca, sa = math.cos(rot), math.sin(rot)
    for k, (lx, lz, sx, sz) in enumerate([(0, -d / 2, w + 0.04, 0.04), (0, d / 2, w + 0.04, 0.04), (-w / 2, 0, 0.04, d), (w / 2, 0, 0.04, d)]):
        box(f'{grp}_trim{k}', (x + lx * ca + lz * sa, 0.385, z - lx * sa + lz * ca), (sx, 0.04, sz), M['brass'], grp, 0.008, rot)
    if w * d > 6: stanchions(grp, x, z, rot, w + 1.6, d + 1.6)

def pedestal(grp, x, z, rot, w, d, top=0.85):
    pw, pd = min(w, 3.4), min(d, 1.6)
    box(f'{grp}_body', (x, (top - 0.1) / 2, z), (pw * 0.86, top - 0.1, pd * 0.86), M['dwood'], grp, 0.02, rot)
    box(f'{grp}_cap', (x, top - 0.05, z), (pw, 0.1, pd), M['marble'], grp, 0.02, rot)
    box(f'{grp}_base', (x, 0.06, z), (pw, 0.12, pd), M['marble'], grp, 0.02, rot)

# ---------- golv ----------
def floor():
    box('floor', (0, -0.05, 0), (28.0, 0.1, 20.0), M['floor'], 'floor', 0.0)
    prints = []
    def trail(pts, step=1.1, s=0.55):
        # fotspår längs en bruten linje, vänster och höger om vartannat
        segs = list(zip(pts, pts[1:])); k = 0
        for (ax, az), (bx, bz) in segs:
            L = math.hypot(bx - ax, bz - az); n = max(1, int(L / step))
            for i in range(n):
                t = (i + 0.5) / n; x, z = ax + (bx - ax) * t, az + (bz - az) * t
                dx, dz = (bx - ax) / L, (bz - az) / L; side = 0.28 if k % 2 else -0.28
                ang = math.atan2(-dx, -dz)  # vrider fotens "uppåt" (lokalt +y = -z i appen) mot gångriktningen
                for sh in footprint(x - dz * side, -(z + dx * side), s, ang):
                    prints.append(bm_flat(sh, lambda a, b: (a, 0.004, -b)))
                k += 1
    trail([(0.3, 9.4), (0.0, 6.0), (-0.4, 3.4)])
    trail([(13.4, 0.6), (10.5, 2.4), (7.5, 3.6), (5.5, 4.6)])
    trail([(-13.4, -0.8), (-10.8, -2.6), (-8.5, -3.6)])
    mk('floor_prints', join_bm(prints), M['prints'], 'floor', face=(0, 1, 0))

# ---------- hela salen ----------
WALLS = [
    Wall('N', 'z', -10, +1, -14.3, 14.3, [(-9.5, -4.5, 2.7), (4.5, 9.5, 2.7)]),
    Wall('S', 'z', 10, -1, -14.3, 14.3, [(-2.2, 2.2, 2.6)]),
    Wall('W', 'x', -14, +1, -10.3, 10.3, [(-2.5, 2.5, 2.7)]),
    Wall('E', 'x', 14, -1, -10.3, 10.3, [(-2.5, 2.5, 2.7)]),
]

def build():
    for W in WALLS: build_wall(W)
    N, S, Wst, E = WALLS
    # norra väggen: väggmålning mellan dörrarna, banderoller och lampetter
    mural(N, -3.65, 1.45, 7.3, 4.0)
    for u in (-13.35, 13.35): pilaster(N, u)
    banner(N, -11.95, 6.3, M['teal'], 'ammonite'); banner(N, 11.95, 6.3, M['navy'], 'foot')
    for u in (-10.6, 10.6): sconce(N, u)
    # västra och östra väggen (u = z, söderut)
    banner(Wst, -6.3, 6.3, M['navy'], 'foot'); banner(Wst, 6.3, 6.3, M['teal'], 'ammonite')
    banner(E, -6.3, 6.3, M['teal'], 'ammonite'); banner(E, 6.3, 6.3, M['navy'], 'foot')
    for W in (Wst, E):
        for u in (-8.6, -4.0, 4.0, 8.6): sconce(W, u)
    # södra väggen: entrén med dörrar och skylt
    for u in (-13.35, -7.2, 7.2, 13.35): pilaster(S, u)
    for u in (-10.3, -4.2, 4.2, 10.3): sconce(S, u)
    leaf_out = door_outline(-2.2, 2.2, 2.6)
    S.prism_uv('door', leaf_out, -0.08, 0.08, M['dwood'], 0.02)
    for e in (-1, 1):
        for k, (v, h) in enumerate([(0.9, 1.3), (2.45, 1.4)]):
            S.box(f'dpanel{e}{k}', e * 1.1, v, 0.1, 1.5, h, 0.05, M['wood'], 0.02)
        S.box(f'handle{e}', e * 0.18, 1.6, 0.16, 0.08, 0.5, 0.06, M['brass'], 0.015)
    S.box('dgap', 0, 2.2, 0.085, 0.04, 4.4, 0.02, M['soil'], 0.0)
    S.box('sign', 0, 5.75, FACE + 0.04, 2.7, 1.05, 0.08, M['green_sign'], 0.02)
    for k, (cu, cv, su, sv) in enumerate([(0, 5.25, 2.9, 0.08), (0, 6.25, 2.9, 0.08), (-1.4, 5.75, 0.08, 1.05), (1.4, 5.75, 0.08, 1.05)]):
        S.box(f'signf{k}', cu, cv, FACE + 0.06, su, sv, 0.1, M['gold'], 0.01)
    w = FACE + 0.09
    S.prism_uv('temple_roof', [(-0.42, 5.98), (0.42, 5.98), (0, 6.16)], w - 0.01, w + 0.02, M['cream'], 0.0)
    S.box('temple_beam', 0, 5.94, w, 0.84, 0.07, 0.03, M['cream'], 0.0)
    for k in range(4): S.box(f'temple_col{k}', -0.27 + k * 0.18, 5.69, w, 0.08, 0.42, 0.03, M['cream'], 0.0)
    S.box('temple_step', 0, 5.45, w, 0.9, 0.07, 0.03, M['cream'], 0.0)
    floor()
    # socklar
    platform('stand_trex', 0, -1, -0.35, 14, 6)
    platform('stand_moai', -10, -6, math.pi / 4, 3, 3)
    pedestal('stand_globe', 10, -6, -math.pi / 4, 2.4, 2.4)
    # växter och bänkar (inget i avdelningen Nya fynd, x -14..-5, z 4..10)
    for i, (x, z, kind, s) in enumerate([(-12.9, -8.9, 'tall', 1.1), (12.9, -8.9, 'tall', 1.1), (-3.25, -9.0, 'monstera', 1.1), (3.25, -9.0, 'monstera', 1.1),
                                          (-13.0, -3.6, 'monstera', 1.25), (13.0, -3.6, 'monstera', 1.25), (-13.0, 3.5, 'tall', 1.0), (13.0, 3.5, 'tall', 1.0),
                                          (-3.3, 9.0, 'monstera', 1.25), (3.3, 9.0, 'monstera', 1.25), (12.9, 8.9, 'tall', 1.1)]):
        planter(f'plant{i}', x, z, kind, s, seed=i)
    bench('bench0', 11.4, 1.3, math.pi / 2)
    bench('bench1', 5.6, 7.6, 0.25)
    # ljus: mjukt ljus ovanifrån, spotar på T. rex och lampetterna (se sconce)
    light('L_sky', 'AREA', (0, 16, 0), 900, (1.0, 0.82, 0.62), size=(30, 22), target=(0, 0, 0))
    for k, (x, z) in enumerate([(-4.5, 0.5), (0.5, -1.5), (5.0, -3.0)]):
        light(f'L_spot{k}', 'SPOT', (x * 0.6, 11, z + 5), 3500, (1.0, 0.86, 0.68), 0.4, target=(x, 1.5, z), spot=(math.radians(42), 0.7))
    for k, (x, z) in enumerate([(-10, -6), (10, -6)]):
        light(f'L_spotb{k}', 'SPOT', (x * 0.8, 10, z + 4), 1500, (1.0, 0.86, 0.68), 0.4, target=(x, 1, z), spot=(math.radians(35), 0.7))
    world = bpy.data.worlds.new('world'); SC.world = world
    world.color = lin('#2a2018')
    if world.node_tree is None: world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*lin('#3a2c20'), 1); bg.inputs['Strength'].default_value = 0.45

def setup_render(samples=64, res=(1280, 800)):
    SC.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    SC.cycles.device = 'GPU'
    SC.cycles.samples = samples; SC.cycles.use_denoising = True
    SC.render.resolution_x, SC.render.resolution_y = res
    SC.view_settings.view_transform = 'AgX'; SC.view_settings.look = 'AgX - Punchy'
    SC.view_settings.exposure = 0.4

def camera(name, pos, target, lens=32):
    cam = bpy.data.cameras.new(name); cam.lens = lens; cam.clip_end = 400
    ob = bpy.data.objects.new(name, cam); COL.objects.link(ob)
    ob.location = P(*pos); ob.rotation_euler = (P(*target) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    return ob

def render(outdir):
    os.makedirs(outdir, exist_ok=True); setup_render()
    shots = [('concept', (7, 17, 22), (0, 1, -2), 30, True), ('overview', (0, 42, 22), (0, 0, -1), 32, True),
             ('close', (-6.5, 4.0, 7.5), (0, 2.5, -2), 26, False), ('north', (0, 3.6, 5.5), (0, 3.4, -10), 22, False),
             ('west', (6, 3.6, 2), (-14, 3.2, 0), 22, False)]
    only = ARGS[2:] if len(ARGS) > 2 else None
    for name, pos, tgt, lens, hide_s in shots:
        if only and name not in only: continue
        for ob in bpy.data.objects:
            if ob.get('grp', '').startswith('wall_S'): ob.hide_render = hide_s
        SC.camera = camera('cam_' + name, pos, tgt, lens)
        SC.render.filepath = os.path.join(outdir, name + '.png')
        bpy.ops.render.render(write_still=True)

build()
if MODE == 'render': render(ARGS[1] if len(ARGS) > 1 else os.path.join(HERE, 'out'))
elif MODE == 'blend': bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(ARGS[1]))
elif MODE == 'bake':
    sys.path.insert(0, HERE)
    from bake import bake_and_export  # tools/blender/bake.py
    setup_render(samples=int(os.environ.get('BAKE_SAMPLES', 64)))
    bake_and_export(SC, WALLS, os.path.join(REPO, 'webb', 'assets', 'museum', 'hall.glb'), ARGS[1] if len(ARGS) > 1 else None)
