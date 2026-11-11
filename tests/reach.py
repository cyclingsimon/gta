import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':640,'height':360}); pg.set_default_timeout(900000)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        print('Routen (hin, zurück):', await pg.evaluate('window.__dbg.reach()'))
        await pg.click('#start-btn'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(3000); await pg.keyboard.press('KeyE')
        await pg.evaluate('window.__dbg.drive(true)')
        for i in range(8):
            await pg.wait_for_timeout(2500)
            print(await pg.evaluate("[window.__luksi.car.speed.toFixed(1), window.__luksi.phase]"))
        await pg.screenshot(path='shots/arrow.png')
        print('Fehler', errs)
        await b.close()
asyncio.run(main())
