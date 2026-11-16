"""17b: Velofahrer ansehen. Setzt die Ambulanz an x,z, wartet, sucht den nächsten Velofahrer und schaut ihn mit der freien Kamera an (nah + etwas weiter)."""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
X, Z = float(sys.argv[1]), float(sys.argv[2])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test' + os.environ.get('QS', '')); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate(f'window.__dbg.tp({X},{Z},0)'); await pg.wait_for_timeout(9000)
        L = await pg.evaluate('window.__velos.list.map(v=>[v.on,Math.round(v.x),Math.round(v.z),+v.v.toFixed(1)])'); print('Velos', json.dumps(L))
        on = [v for v in L if v[0]]
        if on:
            v = min(on, key=lambda v: (v[1]-X)**2 + (v[2]-Z)**2)
            for i, (d, up) in enumerate([(7, 3.5), (16, 8)]):
                q = await pg.evaluate('(a)=>{const v=window.__velos.list.filter(v=>v.on).sort((p,q)=>Math.hypot(p.x-a[0],p.z-a[1])-Math.hypot(q.x-a[0],q.z-a[1]))[0];const g=window.__dbg.hg(v.x,v.z)[0];window.__cam=[v.x+a[2]*Math.sin(v.h+0.9),g+a[3],v.z+a[2]*Math.cos(v.h+0.9),v.x,g+1,v.z];return [v.x,v.z,g]}', [X, Z, d, up])
                await pg.wait_for_timeout(1500); await pg.screenshot(path=f'shots/velo_{i}.png')
        print('Fehler', errs); await b.close()
asyncio.run(main())
