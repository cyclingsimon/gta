# Smartphone-Test: Android-Emulation (Touch, kleiner Bildschirm), Leicht-Modus, Startzeit, Touch-Gas
import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':800,'height':380}, device_scale_factor=2, is_mobile=True, has_touch=True,
            user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36')
        pg = await ctx.new_page(); pg.set_default_timeout(900000)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        t=time.time(); await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        print('Startknopf nach', round(time.time()-t), 's (Software-Rendering)')
        await pg.screenshot(path='shots/mobile_start.png')
        await pg.evaluate('localStorage.clear()'); await pg.tap('#start-btn'); await pg.wait_for_timeout(2000); await pg.evaluate('window.__dbg.quiet()'); await pg.evaluate("document.getElementById('ui').style.display=''")
        print('Touch aktiv:', await pg.evaluate("!!document.getElementById('touch')"), 'Qualität-Text:', await pg.evaluate("document.body.className"))
        box = await pg.locator('#t-gas').bounding_box()
        await pg.mouse.move(box['x']+20, box['y']+20)
        # Gas per Pointer halten
        await pg.dispatch_event('#t-gas', 'pointerdown', {'pointerId': 5, 'pointerType': 'touch', 'isPrimary': True})
        await pg.wait_for_timeout(5000)
        v = await pg.evaluate('window.__luksi.car')
        await pg.dispatch_event('#t-gas', 'pointerup', {'pointerId': 5, 'pointerType': 'touch'})
        print('nach 5 s Gas:', v)
        await pg.screenshot(path='shots/mobile_play.png')
        print('Fehler:', errs)
        await b.close()
asyncio.run(main())
