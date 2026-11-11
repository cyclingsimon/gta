import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':640,'height':360}); pg.set_default_timeout(900000)
        pg.set_default_timeout(600000)
        logs=[]; pg.on('console', lambda m: print(round(time.time()-t), m.text[:160]) if '[bau]' in m.text or m.type=='error' else None); pg.on('pageerror', lambda e: print('ERR', str(e)[:300]))
        t=time.time(); await pg.goto('http://localhost:8765/?test')
        await pg.wait_for_selector('#start-btn', state='visible', timeout=600000)
        print('fertig', round(time.time()-t))
        await b.close()
asyncio.run(main())
