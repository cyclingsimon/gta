import asyncio, sys, json, time
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(900000)
        errs=[]
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        t0=time.time()
        await pg.goto(URL)
        await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        print('geladen in', round(time.time()-t0,1),'s')
        await pg.click('#start-btn')
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path='shots/01_start.png')
        st = await pg.evaluate('window.__luksi'); print('start', st)
        await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(2500); await pg.keyboard.up('KeyW')
        await pg.screenshot(path='shots/02_drive.png')
        st = await pg.evaluate('window.__luksi'); print('nach Fahrt', st)
        await pg.wait_for_timeout(5000)
        st = await pg.evaluate('window.__luksi'); print('Funk?', st['phase'])
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/03_mission.png')
        st = await pg.evaluate('window.__luksi'); print('Einsatz', st['phase'], st['target'])
        await pg.keyboard.press('KeyC'); await pg.wait_for_timeout(800); await pg.screenshot(path='shots/04_top.png')
        await pg.keyboard.press('KeyC'); await pg.keyboard.press('KeyC')
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(800); await pg.screenshot(path='shots/05_map.png'); await pg.keyboard.press('Tab')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500); await pg.screenshot(path='shots/06_pause.png'); await pg.keyboard.press('Escape')
        print('Fehler/Warnungen:', errs[:15])
        await b.close()
asyncio.run(main())
