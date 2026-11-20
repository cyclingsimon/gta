"""20e: Wohin geht der Speicher im iPhone-Modus (UA iPhone, Leicht, eine Gegend)? JS-Heap je Ladeschritt (__mem), Geometrie-/Textur-Bytes der Szene.
Aufruf: mem_ios.py [qs]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else '&q=leicht'
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'
JS = """(() => { const sc = window.__dbg.scene ? window.__dbg.scene() : null; if (!sc) return {err:'keine scene'};
 const seenG = new Set(), seenT = new Set(), seenB = new Set(); let geo = 0, tex = 0, nMesh = 0; const top = {};
 sc.traverse(o => { if (!o.geometry) return; nMesh++; const g = o.geometry; if (seenG.has(g)) return; seenG.add(g); let b = 0;
   for (const k in g.attributes) { const a = g.attributes[k]; const arr = a.array || (a.data && a.data.array); if (arr && !seenB.has(arr.buffer)) { seenB.add(arr.buffer); b += arr.byteLength; } }
   if (g.index && g.index.array && !seenB.has(g.index.array.buffer)) { seenB.add(g.index.array.buffer); b += g.index.array.byteLength; }
   geo += b; let n = o.name || (o.parent && o.parent.name) || '?'; n = n.replace(/[-_ ]?\\d+.*$/, ''); top[n] = (top[n] || 0) + b;
   const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) for (const k in m) { const t = m[k]; if (t && t.isTexture && !seenT.has(t)) { seenT.add(t); const im = t.image; if (im && im.width) tex += im.width * im.height * 4 * (t.generateMipmaps ? 1.33 : 1); } } });
 const tops = Object.entries(top).sort((a,b) => b[1]-a[1]).slice(0, 14).map(([k,v]) => k + ' ' + (v/1e6).toFixed(1));
 return { meshes: nMesh, geoMB: +(geo/1e6).toFixed(1), texMB: +(tex/1e6).toFixed(1), tops, heapMB: Math.round(performance.memory.usedJSHeapSize/1e6), mem: window.__mem }; })()"""

JS2 = """(() => { const R = window.__dbg.roots(); const seen = new Set(); const out = {};
 const size = (v0) => { let obj = 0, ta = 0, n = 0; const st = [v0];
  while (st.length) { const v = st.pop(); if (v === null || v === undefined) continue; const t = typeof v;
   if (t === 'number') { continue; } if (t === 'string') { obj += 16 + v.length; continue; } if (t !== 'object' && t !== 'function') continue;
   if (seen.has(v)) continue; seen.add(v); n++;
   if (ArrayBuffer.isView(v)) { if (!seen.has(v.buffer)) { seen.add(v.buffer); ta += v.buffer.byteLength; } obj += 64; continue; }
   if (v instanceof ArrayBuffer) { ta += v.byteLength; continue; }
   if (typeof HTMLElement !== 'undefined' && (v instanceof HTMLElement || v instanceof ImageBitmap)) continue;
   if (Array.isArray(v)) { obj += 16 + v.length * 8; for (let i = 0; i < v.length; i++) { const e = v[i]; if (typeof e === 'object' || typeof e === 'string') st.push(e); } continue; }
   if (v instanceof Map) { obj += 48 + v.size * 32; for (const [k, e] of v) { st.push(k); st.push(e); } continue; }
   if (v instanceof Set) { obj += 48 + v.size * 16; for (const e of v) st.push(e); continue; }
   const ks = Object.keys(v); obj += 24 + ks.length * 8; for (const k of ks) { let e; try { e = v[k]; } catch (x) { continue; } if (typeof e === 'object' || typeof e === 'string' || typeof e === 'function') st.push(e); } }
  return [Math.round(obj/1e5)/10, Math.round(ta/1e5)/10, n]; };
 for (const k of ['scene','world','terrain','cityData','propsData','nav','traffic','velos','buses','trains','missions','forestMask']) out[k] = size(R[k]);
 return out; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'])
        ctx = await b.new_context(user_agent=UA, viewport={'width': 414, 'height': 896}, is_mobile=True, has_touch=True, device_scale_factor=1)
        pg = await ctx.new_page(); pg.set_default_timeout(900000); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:8765/?test&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(5000)
        await pg.evaluate('window.gc && window.gc()'); print(json.dumps(await pg.evaluate(JS), ensure_ascii=False, indent=1)); print('Wurzeln [JS-Objekte MB, TypedArray MB, Anzahl]:'); r = await pg.evaluate(JS2); [print(' ', k, v) for k, v in r.items()]; print('Fehler', errs); await b.close()
asyncio.run(main())
