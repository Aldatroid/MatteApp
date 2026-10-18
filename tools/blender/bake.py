"""============ Baka ljuset och exportera GLB ============
Används av hall.py (läget bake). Steg:
1. Slår ihop alla objekt med samma grupp (ob['grp']) till ett objekt per grupp, med modifierare tillämpade.
2. Tar bort ytor som aldrig syns: väggarnas utsida (den hör till salen bredvid) och undersidor.
3. Packar UV per atlas och bakar allt ljus (utom reflexer, som beror på kameran) till en textur per atlas.
4. Brusreducerar texturen, sparar den med samma färghantering som förhandsbilderna (AgX) och
   byter materialen mot en enda textur per atlas.
Lampskärmarna (<grupp>__glow) bakas inte. De behåller sitt lysande material och ritas utan ljus i appen."""
import bpy, bmesh, math, os, time

ATLASES = [  # namn, grupper, storlek
    ('floor', ['floor'], 2048),
    ('walls_ns', ['wall_N', 'wall_S'], 2048),
    ('walls_we', ['wall_W', 'wall_E'], 2048),
    ('decor', ['decor', 'stand_trex', 'stand_moai', 'stand_globe'], 2048),
]

def log(*a): print('[bake]', *a, flush=True)

def select(objs):
    vl = bpy.context.view_layer
    for o in vl.objects: o.select_set(o in objs)
    vl.objects.active = objs[0]

def join_groups():
    dg = bpy.context.evaluated_depsgraph_get()
    groups = {}
    for ob in [o for o in bpy.data.objects if o.type == 'MESH' and 'grp' in o]:
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        ob.modifiers.clear(); ob.data = me
        groups.setdefault(ob['grp'], []).append(ob)
    out = {}
    for g, objs in groups.items():
        for i, o in enumerate(objs): o.name = f'{g}__part{i}'  # så att namnet g är ledigt efter join
        select(objs)
        with bpy.context.temp_override(active_object=objs[0], selected_objects=objs, selected_editable_objects=objs):
            bpy.ops.object.join()
        ob = objs[0]; ob.name = ob.data.name = g; out[g] = ob
    return out

def strip_hidden(ob, wall=None, up_only=False):
    """Tar bort väggens utsida, undersidor och (för golvet) allt utom ovansidan."""
    bm = bmesh.new(); bm.from_mesh(ob.data); dead = []
    for f in bm.faces:
        c, n = f.calc_center_median(), f.normal
        if up_only and n.z < 0.9: dead.append(f); continue
        if n.z < -0.9: dead.append(f); continue
        if wall:
            x, z, nx, nz = c.x, -c.y, n.x, -n.y  # appens koordinater
            w = ((z if wall.axis == 'z' else x) - wall.at) * wall.n
            along = (nz if wall.axis == 'z' else nx) * wall.n
            if w < 0.05 and along < -0.5: dead.append(f)
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(ob.data); bm.free()
    log(ob.name, 'tog bort', len(dead), 'ytor')

def unwrap(objs):
    for o in objs:
        while o.data.uv_layers: o.data.uv_layers.remove(o.data.uv_layers[0])
        o.data.uv_layers.new(name='UVMap')
    select(objs)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')

def floor_target(mat):
    """Golvet bakas till en enda platt yta med rak projektion uppifrån (hela atlasen används), från det
    detaljerade golvet med fotspår (selected to active)."""
    me = bpy.data.meshes.new('floor'); bm = bmesh.new()
    vs = [bm.verts.new((x, -z, -0.001)) for x, z in ((-14, 10), (14, 10), (14, -10), (-14, -10))]
    bm.faces.new(vs); bm.to_mesh(me); bm.free()
    uv = me.uv_layers.new(name='UVMap')
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((co.x + 14) / 28, (co.y + 10) / 20)
    me.materials.append(mat)
    ob = bpy.data.objects.new('floor', me); bpy.context.scene.collection.objects.link(ob)
    return ob

def bake(name, objs, size, target=None):
    img = bpy.data.images.new('bake_' + name, size, size, alpha=False, float_buffer=True)
    for m in {m for o in objs + ([target] if target else []) for m in o.data.materials if m}:
        nt = m.node_tree
        n = nt.nodes.get('BAKE') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'BAKE'
        n.image = img; nt.nodes.active = n
    sel = objs + [target] if target else objs; active = target or objs[0]
    select(sel); bpy.context.view_layer.objects.active = active
    t = time.time()
    with bpy.context.temp_override(active_object=active, selected_objects=sel, selected_editable_objects=sel):
        bpy.ops.object.bake(type='COMBINED', pass_filter={'EMIT', 'DIRECT', 'INDIRECT', 'DIFFUSE', 'TRANSMISSION'},
                            margin=12, margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES',
                            use_selected_to_active=bool(target), cage_extrusion=0.03, max_ray_distance=0.1)
    log(name, f'bakad på {time.time() - t:.0f} s')
    return img

def denoise_save(SC, img, path):
    """Brusreducerar i kompositorn (egen tom scen) och sparar med scenens färghantering."""
    s2 = bpy.data.scenes.get('denoise') or bpy.data.scenes.new('denoise')
    ng = bpy.data.node_groups.new('dn_' + img.name, 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    i = ng.nodes.new('CompositorNodeImage'); i.image = img
    d = ng.nodes.new('CompositorNodeDenoise'); d.inputs['HDR'].default_value = True
    o = ng.nodes.new('NodeGroupOutput')
    ng.links.new(i.outputs['Image'], d.inputs['Image']); ng.links.new(d.outputs['Image'], o.inputs[0])
    s2.compositing_node_group = ng; s2.render.use_compositing = True
    s2.render.resolution_x, s2.render.resolution_y = img.size; s2.render.resolution_percentage = 100
    for k in ('view_transform', 'look', 'exposure', 'gamma'): setattr(s2.view_settings, k, getattr(SC.view_settings, k))
    st = s2.render.image_settings; st.file_format = 'PNG'; st.color_mode = 'RGB'; st.color_depth = '8'
    s2.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=s2.name)
    return bpy.data.images.load(path)

def baked_material(name, img):
    m = bpy.data.materials.new('baked_' + name); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 1.0
    return m

def bake_and_export(SC, walls, glb_path, png_dir=None):
    png_dir = png_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'bake')
    os.makedirs(png_dir, exist_ok=True); os.makedirs(os.path.dirname(glb_path), exist_ok=True)
    for o in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o)
    # Metall har nästan ingen diffus färg, och reflexer bakas inte. Mässing och guld bakas därför som matt färg.
    for m in bpy.data.materials:
        b = m.node_tree.nodes.get('Principled BSDF') if m.node_tree else None
        if b and b.inputs['Metallic'].default_value > 0.3: b.inputs['Metallic'].default_value = 0.0
    obs = join_groups()
    wall_by = {'wall_' + W.key: W for W in walls}
    for g, ob in obs.items():
        if g in wall_by: strip_hidden(ob, wall=wall_by[g])
        elif g == 'floor': strip_hidden(ob, up_only=True)
        elif g.startswith('stand_'): strip_hidden(ob)
    src = obs.pop('floor'); src.name = 'floor_src'
    obs['floor'] = floor_target(src.data.materials[0])
    for name, groups, size in ATLASES:
        objs = [obs[g] for g in groups if g in obs]
        if name == 'floor': img = bake(name, [src], size, target=objs[0])
        else: unwrap(objs); img = bake(name, objs, size)
        png = denoise_save(SC, img, os.path.join(png_dir, name + '.png'))
        m = baked_material(name, png)
        for o in objs:
            o.data.materials.clear(); o.data.materials.append(m)
            for p in o.data.polygons: p.material_index = 0
    bpy.data.objects.remove(src)
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=90,
                              export_normals=False, export_lights=False, export_cameras=False, export_apply=True,
                              export_extras=True, export_animations=False, use_selection=False)
    log('skrev', glb_path, f'{os.path.getsize(glb_path) / 1e6:.1f} MB')
