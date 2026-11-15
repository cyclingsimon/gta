"""P-A Lauf 8: Wahrzeichen-Testszene fotografieren und Budget prüfen (Summe < 6000 Dreiecke). Server: Port 8771 auf dist_pa_lm/."""
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(180000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        st = None
        for v in ['ueber', 'torbogen', 'kkl', 'turm', 'bushof', 'bushof&nacht=1', 'kkl&nacht=1']:
            await pg.goto(f'http://localhost:8771/pa_landmarks.html?v={v}'); await pg.wait_for_function('window.__ready')
            st = await pg.evaluate('window.__stats'); await pg.screenshot(path=f"shots/pa_lm_{v.replace('&nacht=1', '_nacht')}.png")
        print(json.dumps(st, indent=0))
        print('LANDMARKS', 'OK' if st['summe'] < 6000 and not errs else 'FEHLER', st['summe'], errs); await b.close()
asyncio.run(main())
