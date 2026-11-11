import asyncio, sys, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        await pg.evaluate('localStorage.clear()')
        await pg.click('#start-btn'); await pg.wait_for_timeout(500); await pg.evaluate('window.__dbg.quiet()')
        await pg.evaluate('window.__dbg.tp(86,-151)'); await pg.wait_for_timeout(4000)
        await pg.screenshot(path='shots/tr_start.png')
        await pg.evaluate('window.__dbg.goHospital(); window.__dbg.drive(true)')
        res=[]
        for k in range(6):
            await pg.wait_for_timeout(10000)
            st=await pg.evaluate('window.__dbg.traffic()'); inf=await pg.evaluate('window.__dbg.info()')
            res.append(st); print(k, json.dumps(st), inf['phase'], inf['routeLen'], flush=True)
            if k in (1,4): await pg.screenshot(path=f'shots/tr_{k}.png')
        await b.close()
asyncio.run(main())
