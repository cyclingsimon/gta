import asyncio
from playwright.async_api import async_playwright
SPOTS = [('Kriens Hang', -2600, 3200), ('Sonnenberg', -2252, -870), ('Bireggwald', 600, 2400), ('Horw', 216, 3668), ('Altstadt', -150, -60)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(1500000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.evaluate('window.__dbg.quiet()')
        for n, x, z in SPOTS:
            await pg.evaluate(f'window.__dbg.tp({x},{z})'); await pg.wait_for_timeout(3000)
            for h in range(4):
                await pg.evaluate(f'(()=>{{const c=window.__dbg; return 0}})()')
            r = await pg.evaluate("(()=>{const p=window.__dbg.perf(); return {total:p.total_k, forest:p.forest, ground:p['ground-lod']}})()")
            print(n, r, flush=True)
        await b.close()
asyncio.run(main())
