# Mehrspieler-Test: 4 simulierte Gamepads, Beitritt per A, Split Screen, Fahren
import asyncio, json, time
from playwright.async_api import async_playwright
FAKE = """
window.__pads = [0,1,2,3].map(i => ({ id: 'Test-Pad ' + (i+1), index: i, connected: true, mapping: 'standard', timestamp: 0,
  axes: [0,0,0,0], buttons: Array.from({length: 17}, () => ({ pressed: false, touched: false, value: 0 })) }));
navigator.getGamepads = () => window.__pads;
window.__press = (i, b, on) => { const x = window.__pads[i].buttons[b]; x.pressed = on; x.value = on ? 1 : 0; };
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.add_init_script(FAKE)
        await pg.goto('http://localhost:8765/?test&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(1500)
        await pg.evaluate('window.__dbg.quiet()')
        for k in (1,2,3):
            await pg.evaluate(f'window.__press({k},0,true)'); await pg.wait_for_timeout(600); await pg.evaluate(f'window.__press({k},0,false)'); await pg.wait_for_timeout(600)
        print('Spieler nach Beitritt:', await pg.evaluate('window.__dbg.players()'))
        # alle geben Gas (RT=7), Spieler 3 lenkt
        for k in range(4): await pg.evaluate(f'window.__press({k},7,true)')
        await pg.evaluate('window.__pads[2].axes[0]=0.6')
        await pg.wait_for_timeout(6000)
        print('nach Fahrt:', await pg.evaluate('window.__dbg.players()'))
        await pg.screenshot(path='shots/multi_4.png')
        print('Verkehr:', await pg.evaluate('window.__dbg.traffic()'))
        print('Fehler:', errs)
        await b.close()
asyncio.run(main())
