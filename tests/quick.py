"""Schnelltest v-j: Ladebildschirm, Ladezeiten, Pfeiltasten, Boing, Ausweichen bei Sirene, Busabstand.
Aufruf: python3 tests/quick.py [url]"""
import asyncio, json, sys, time
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/?test'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        t = time.time(); await pg.goto(URL)
        await pg.wait_for_timeout(2500); await pg.screenshot(path='shots/quick_loader.png')
        await pg.wait_for_selector('#start-btn', state='visible'); tA = round(time.time() - t)
        await pg.screenshot(path='shots/quick_ready.png')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_timeout(1500)
        # Pfeiltasten
        await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(2500)
        v_up = await pg.evaluate('window.__dbg.players()[0].v')
        await pg.keyboard.up('ArrowUp')
        await pg.wait_for_function('window.__luksiReady', timeout=900000); tB = round(time.time() - t)
        await pg.evaluate('window.__dbg.quiet()'); res = {}
        res['ohne'] = await pg.evaluate('window.__dbg.quick()')
        await pg.evaluate('window.__dbg.boing(18, 0)'); await pg.evaluate('window.__dbg.siren(true)'); await pg.wait_for_timeout(2500)
        res['sirene'] = await pg.evaluate('window.__dbg.quick()'); await pg.evaluate('window.__dbg.siren(false)')
        res['boing_dist'] = await pg.evaluate('window.__dbg.boing()'); await pg.wait_for_timeout(350)
        res['boing'] = await pg.evaluate('window.__dbg.quick()'); await pg.screenshot(path='shots/quick_boing.png')
        await pg.wait_for_timeout(20000); res['spaeter'] = await pg.evaluate('window.__dbg.quick()')
        await pg.screenshot(path='shots/quick_game.png')
        for k in range(4):
            r = await pg.evaluate(f'window.__dbg.busCam({k})')
            if r is None: continue
            await pg.wait_for_timeout(3000); await pg.screenshot(path=f'shots/quick_bus{k}.png')
        await b.close()
    print(json.dumps({'stufeA_s': tA, 'voll_s': tB, 'pfeil_hoch_speed': v_up, 'quick': res, 'fehler': errs}, ensure_ascii=False, indent=1))
asyncio.run(main())
