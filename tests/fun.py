import asyncio, time, sys
from playwright.async_api import async_playwright
Q = sys.argv[1] if len(sys.argv) > 1 else 'leicht'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(1500000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        t = time.time(); await pg.goto(f'http://localhost:8765/?test&q={Q}'); await pg.wait_for_selector('#start-btn', state='visible')
        print('start', round(time.time() - t), flush=True)
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.evaluate('window.__dbg.quiet()')
        print('ready', round(time.time() - t), await pg.evaluate('window.__dbg.fun()'), flush=True)
        print('hit', await pg.evaluate('window.__dbg.funHit()'), flush=True); await pg.wait_for_timeout(700); await pg.screenshot(path='shots/fun_cone.png')
        await pg.wait_for_timeout(1500); print('nach Kegel', await pg.evaluate('window.__dbg.fun()'), flush=True)
        print('herz', await pg.evaluate('window.__dbg.funHeart()')); await pg.wait_for_timeout(1500)
        print('nach Herz', await pg.evaluate('window.__dbg.fun()'), await pg.evaluate("localStorage.getItem('luksi-rescue-save') || Object.keys(localStorage)"), flush=True)
        for name, cam in [('wald_birregg', '[300,520,1500,700,420,2400]'), ('wald_sonnenberg', '[-1500,560,300,-2400,480,-600]')]:
            await pg.evaluate(f'window.__dbg.cam({cam})'); await pg.wait_for_timeout(4000); await pg.screenshot(path=f'shots/{name}_{Q}.png')
        await pg.evaluate('window.__dbg.cam(null)')
        print('tiere', await pg.evaluate('window.__dbg.animals()'), flush=True)
        print(await pg.evaluate('window.__dbg.swanCam()')); await pg.wait_for_timeout(3000); await pg.screenshot(path=f'shots/schwan_{Q}.png')
        print(await pg.evaluate('window.__dbg.cowCam()')); await pg.wait_for_timeout(3000); await pg.screenshot(path=f'shots/kuh_{Q}.png')
        print(await pg.evaluate('window.__dbg.shipCam()')); await pg.wait_for_timeout(3000); await pg.screenshot(path=f'shots/schiff_{Q}.png')
        await pg.evaluate('window.__dbg.gondolaCam()'); await pg.wait_for_timeout(3000); await pg.screenshot(path=f'shots/gondel_{Q}.png')
        for k in range(5):
            r = await pg.evaluate(f'window.__dbg.trainCam({k})'); print('zug', k, r)
            if r[2]: await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/zug_{k}.png')
        await pg.evaluate('window.__dbg.cam(null)'); await pg.evaluate('window.__dbg.tp(86,-151)')
        for sk in ['regenbogen', 'luksi', 'gold']:
            await pg.evaluate(f"window.__dbg.skin('{sk}')"); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'shots/skin_{sk}.png')
        await pg.evaluate('window.__dbg.cam(null)'); await pg.evaluate("document.getElementById('ui').style.display=''"); await pg.keyboard.press('Tab'); await pg.wait_for_timeout(1200); await pg.screenshot(path='shots/bigmap.png'); await pg.keyboard.press('Tab')
        print('fehler', errs, flush=True)
        await b.close()
asyncio.run(main())
