"""17b: Lieferwagen/Kleinwagen im Verkehr ansehen (Index % 6 == 3 bzw. 5)."""
import asyncio, sys, os, math
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test' + os.environ.get('QS', '')); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate('window.__dbg.tp(167,590,0)'); await pg.wait_for_timeout(12000)
        for n, k in enumerate([3, 5, 0]):
            r = await pg.evaluate('(k)=>{const T=window.__dbg.trafficRaw();const cs=T.cars.filter(c=>!c.bus);let best=null,bi=-1;cs.forEach((c,i)=>{if(c.alive&&i%6===k&&(!best||Math.hypot(c.x-167,c.z-590)<Math.hypot(best.x-167,best.z-590))){best=c;bi=i}});if(!best)return null;const g=window.__dbg.hg(best.x,best.z)[0];window.__cam=[best.x+7*Math.sin(best.h+2.4),g+3,best.z+7*Math.cos(best.h+2.4),best.x,g+1,best.z];return [bi,best.x,best.z]}', k)
            print(k, r); await pg.wait_for_timeout(1200); await pg.screenshot(path=f'shots/wagen_{n}.png')
        print('Fehler', errs); await b.close()
asyncio.run(main())
