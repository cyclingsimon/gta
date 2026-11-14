"""14zl: Einsatz über die Gegendgrenze (Leicht): Einsatz in Luzern annehmen, nach West wechseln, Navi zurück;
Patient einladen, Spitalziel beim Wechsel prüfen, beim Spital abgeben."""
import asyncio, json, math, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(600000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic&nobus&region=luzern'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        info = lambda: pg.evaluate('JSON.stringify(window.__dbg.info())')
        welt = lambda: pg.evaluate('JSON.stringify(window.__welt())')
        ok = True
        def chk(name, cond, extra=''):
            nonlocal ok; ok &= bool(cond); print(('OK    ' if cond else 'FEHLER'), name, extra, flush=True)
        await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(2500); await pg.evaluate('window.__dbg.accept()'); await pg.wait_for_timeout(1500)
        i = json.loads(await info()); t0 = i['target']; chk('Einsatz angenommen', i['phase'] == 'toScene' and t0, str(t0))
        await pg.evaluate('window.__weltLoad("west")')
        await pg.evaluate('window.__dbg.warp(-4817,1131,1.5)'); await pg.wait_for_timeout(15000)
        w = json.loads(await welt()); i = json.loads(await info())
        pts = i['routePts'] or []; last = pts[-2] if len(pts) > 1 else None
        chk('in West aktiv', w['aktiv'] == 'west', str(w))
        chk('Ziel bleibt', i['target'] == t0 and i['phase'] == 'toScene')
        chk('Navi zurück nach Luzern', len(pts) > 5 and last and math.dist(last, t0) < 120, f"Punkte {len(pts)} Länge {i['routeLen']}")
        await pg.evaluate('window.__dbg.goHospital()'); await pg.wait_for_timeout(2500)
        i = json.loads(await info()); chk('Patient an Bord, Spitalziel = Spitalplatz', i['phase'] == 'toHospital' and i['target'] == i['bay'], f"Ziel {i['target']}")
        await pg.evaluate('window.__dbg.warp(-2604,1862,1.5)'); await pg.wait_for_timeout(15000)
        w = json.loads(await welt()); i = json.loads(await info())
        chk('zurück in Luzern', w['aktiv'] == 'luzern')
        chk('Spitalziel nachgeführt', i['target'] == i['bay'], f"Ziel {i['target']} Platz {i['bay']}")
        bx, bz = i['bay']; await pg.evaluate(f'window.__dbg.warp({bx},{bz},0)'); await pg.wait_for_timeout(6000)
        i = json.loads(await info()); chk('beim Spital abgegeben', i['phase'] in ('handover', 'free'), i['phase'])
        chk('keine Fehler', not errs, str(errs[:2]))
        print('ALLES OK' if ok else 'NICHT OK'); await b.close()
asyncio.run(main())
