// P-A Lauf 2: Leuchtende Teile (Kandelaber-Laternen, Wartehallen-Licht) – Leuchtkraft folgt NIGHT.value (0 Tag … 1 Abend)
// aus src/world.ts (nur importiert). Keine Lichtquellen (zu teuer), nur Eigenleuchten im Shader.
import * as THREE from 'three';
import { toon, NIGHT } from '../world';
import { REAL } from './config';

const CACHE = new Map<string, THREE.MeshToonMaterial>();
/** Toon-Material mit Vertex-Farben, das abends in «glow» leuchtet (Tag: schwaches Grundleuchten wie bisherige Laternen) */
export function glowMaterial(glow = '#FFD27A', day = '#5A4E20') {
  const key = glow + day; const c = CACHE.get(key); if (c) return c;
  const m = toon('#ffffff', { vertexColors: true, emissive: new THREE.Color(day) });
  const uGlow = { value: new THREE.Color(glow) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = NIGHT; sh.uniforms.uGlow = uGlow;
    sh.fragmentShader = 'uniform float uNight;\nuniform vec3 uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n  totalEmissiveRadiance = mix(totalEmissiveRadiance, uGlow, clamp(uNight, 0.0, 1.0));');
  };
  m.customProgramCacheKey = () => 'realGlow';
  m.name = 'realGlow';
  if (!REAL.night) { m.onBeforeCompile = () => { /* aus */ }; m.customProgramCacheKey = () => 'realGlowOff'; }
  CACHE.set(key, m); return m;
}
