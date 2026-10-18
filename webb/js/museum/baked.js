/* ============ Salar byggda i Blender ============
   En sal i BAKED är byggd i Blender (tools/blender/) med ljuset bakat i texturer. Den ersätter salens golv,
   salens halva av väggarna, dekoren och socklarna som finns i filen; koden bygger resten (den andra halvan
   av väggarna, byggplatser, skyltar och föremål). Se docs/museum.md.
   Noder i filen: floor, wall_N/S/W/E (+ wall_X__glow för lampskärmar), decor och stand_<föremål>. */
import { THREE } from '../three/scene.js';
import { GLTFLoader } from '../../assets/lib/jsm/loaders/GLTFLoader.js';

export const BAKED = { hall: new URL('../../assets/museum/hall.glb', import.meta.url).href };

// Laddar alla bakade salar. En sal som inte går att ladda byggs i kod som förut.
export async function loadBaked() {
  const loader = new GLTFLoader(), out = {};
  await Promise.all(Object.entries(BAKED).map(async ([id, url]) => {
    try { out[id] = prepare((await loader.loadAsync(url)).scene); }
    catch (e) { console.warn('Kunde inte ladda', url, e); }
  }));
  return out;
}

// Ljuset är redan bakat och tonmappat i Blender: ritas utan ljus och utan tonmappning. Väggarna får ett
// klipplan var, så att de kan sänkas som kodens väggar (se setWallHeight i build.js).
function prepare(root) {
  const nodes = {};
  root.traverse(o => {
    if (!o.isMesh) return;
    nodes[o.name] = o;
    const m = o.material, wall = o.name.startsWith('wall_');
    const opts = { toneMapped: false, side: o.name === 'decor' ? THREE.DoubleSide : THREE.FrontSide };
    o.material = o.name.endsWith('__glow')
      ? new THREE.MeshBasicMaterial({ ...opts, color: m.emissive.clone() })
      : new THREE.MeshBasicMaterial({ ...opts, map: m.map });
    if (wall) o.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 100)];
  });
  return { root, nodes };
}

// Väggnoden för en vägg i koden (samma linje och samma sal).
export function bakedWall(baked, R, W) {
  const key = W.axis === 'z' ? (W.at === R.z[0] ? 'N' : W.at === R.z[1] ? 'S' : null) : (W.at === R.x[0] ? 'W' : W.at === R.x[1] ? 'E' : null);
  return key && baked.nodes['wall_' + key] ? ['wall_' + key, 'wall_' + key + '__glow'].map(n => baked.nodes[n]).filter(Boolean) : null;
}
