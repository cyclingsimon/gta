"""18a: Echt-Luzern – Häuser in der Hinderniskarte, KKL-Dach, Verkehr auf der Fahrbahn (Bilder shots/c18_*). Aufruf: check18a.py [qs]"""
import asyncio, json, sys, math
from playwright.async_api import async_playwright
QS = sys.argv[1] if len(sys.argv) > 1 else '&q=echt'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(1500000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:8765/?test&noshadow&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady')
        await pg.evaluate("document.querySelectorAll('.radio,#radio,#offer').forEach(e=>e.style.display='none')")
        print('maske', await pg.evaluate('window.__dbg.maskB3d()'))
        lm = await pg.evaluate('window.__dbg.lm()'); kkl = [l for l in lm if l[0].startswith('KKL')]; print('kkl', kkl)
        if kkl:
            x, z = kkl[0][1], kkl[0][2]
            for i, (dx, dz, h) in enumerate([(-150, -40, 30), (-60, 90, 8)]):
                g = (await pg.evaluate(f'window.__dbg.hg({x},{z})'))[1]
                await pg.evaluate(f'window.__cam=[{x+dx},{g+h},{z+dz},{x},{g+12},{z}]'); await pg.wait_for_timeout(4000); await pg.screenshot(path=f'shots/c18_kkl{i}.png')
        # Verkehr: Kamera neben einem fahrenden Auto
        c = await pg.evaluate('(() => { const T = window.__dbg.trafficRaw(); const c = T.cars.find((c) => c.alive && !c.bus); return c ? [c.x, c.z, c.h] : null; })()')
        if c:
            x, z, h = c; g = (await pg.evaluate(f'window.__dbg.hg({x},{z})'))[0]
            await pg.evaluate(f'window.__cam=[{x + math.cos(h)*9},{g+2.2},{z - math.sin(h)*9},{x},{g+0.8},{z}]'); await pg.wait_for_timeout(300); await pg.screenshot(path='shots/c18_auto.png')
        print('fehler', errs); await b.close()
asyncio.run(main())
