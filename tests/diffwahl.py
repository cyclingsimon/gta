"""15a: Schwierigkeitswahl beim allerersten Start (Simon 14.11.). Aufruf: diffwahl.py [port]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
URL = f'http://localhost:{PORT}/?test&diffwahl&noshadow&q=leicht&notraffic'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        res = {}; errs = []
        for name, vp in [('pc', {'width': 1280, 'height': 720}), ('handy', {'width': 800, 'height': 380})]:
            pg = await b.new_page(viewport=vp); pg.set_default_timeout(900000); pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
            await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload()
            await pg.wait_for_selector('#diff-wahl button'); await pg.wait_for_timeout(600); await pg.screenshot(path=f'shots/diffwahl_{name}.png')
            n = await pg.locator('#diff-wahl button').count()
            box = await pg.evaluate("[...document.querySelectorAll('#diff-wahl button')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), r.bottom <= innerHeight && r.right <= innerWidth && r.left >= 0 && r.top >= 0] })")
            st = await pg.evaluate("document.getElementById('load-status').textContent")
            await pg.click('#diff-wahl button[data-diff="entdecken"]'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(800)
            sv = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')"))
            # zweiter Start: keine Wahl mehr, normaler Startknopf
            await pg.reload(); await pg.wait_for_selector('#start-btn', state='visible'); await pg.wait_for_timeout(400)
            again = await pg.locator('#diff-wahl').count(); op = await pg.evaluate("getComputedStyle(document.getElementById('start-btn')).opacity")
            res[name] = {'knoepfe': n, 'masse_im_bild': box, 'status': st, 'gespeichert': [sv.get('diff'), sv.get('diffChosen')], 'zweiter_start_wahl': again, 'startknopf_opacity': op}
            await pg.close()
        ok = all(r['knoepfe'] == 3 and all(m[2] and m[1] >= 48 for m in r['masse_im_bild']) and r['gespeichert'] == ['entdecken', True] and r['zweiter_start_wahl'] == 0 and r['startknopf_opacity'] == '1' for r in res.values()) and not errs
        print(json.dumps({**res, 'fehler': errs, 'ok': ok}, ensure_ascii=False)); await b.close()
asyncio.run(main())
