"""============ Konvertera PNG till WebP ============
Körs av tools/webp.ps1: Blender -b --factory-startup -P tools/blender/webp.py -- <kvalitet> <fil.png> ...
Sparar <fil>.webp bredvid varje PNG med genomskinligheten kvar. Kvalitet 100 ger förlustfri WebP.
Bilderna läses som rådata (Non-Color) så att Blenders färghantering inte ändrar färgerna."""
import bpy, sys, os

args = sys.argv[sys.argv.index('--') + 1:]
quality, files = int(args[0]), args[1:]
settings = bpy.context.scene.render.image_settings
settings.file_format = 'WEBP'
settings.color_mode = 'RGBA'
settings.quality = quality
settings.color_management = 'OVERRIDE'
settings.view_settings.view_transform = 'Standard'

for src in files:
    dst = os.path.splitext(src)[0] + '.webp'
    try:
        img = bpy.data.images.load(src)
        img.colorspace_settings.name = 'Non-Color'
        settings.linear_colorspace_settings.name = 'Non-Color'
        img.save_render(dst, scene=bpy.context.scene)
        bpy.data.images.remove(img)
        print('[webp] OK', src, flush=True)
    except Exception as e:
        print('[webp] FEL', src, e, flush=True)
