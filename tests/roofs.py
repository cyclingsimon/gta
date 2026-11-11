import asyncio, sys
from playwright.async_api import async_playwright
views=[('altstadt_luft',[-150,380,250,-150,0,-60]),('neustadt_luft',[150,380,700,150,0,350]),('see_luft',[500,300,-300,300,0,-50])]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        await pg.evaluate('localStorage.clear()')
        await pg.click('#start-btn'); await pg.wait_for_timeout(500); await pg.evaluate('window.__dbg.quiet()')
        for n,c in views:
            await pg.evaluate(f'window.__dbg.cam({c})'); await pg.wait_for_timeout(8000)
            await pg.screenshot(path=f'shots/{sys.argv[1] if len(sys.argv)>1 else "r"}_{n}.png')
        await b.close()
asyncio.run(main())
