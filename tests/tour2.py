"""Rundgang Agglomeration (Echt): Kontaktbogen shots/tour2/kontaktbogen.png"""
import asyncio, os
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
TOUR = [('Kriens Zentrum', -2130, 2001), ('Pilatus-Bahnen', -2304, 2338), ('Schappe-Center', -2600, 1950), ('Allmend', -371, 1840),
        ('Horw Zentrum', 216, 3668), ('Horw Bahnhof', -6, 3690), ('Badi Horw', 409, 6257), ('Littau Gasshof', -3544, 288),
        ('Obernau', -3600, 1850), ('Hubelmatt', 34, 1682), ('Sonnenberg', -2252, -870), ('Tribschen', 890, 1562)]
async def main():
    os.makedirs('shots/tour2', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(1500000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.evaluate('window.__dbg.quiet()')
        shots = []
        for name, x, z in TOUR:
            await pg.evaluate(f'window.__dbg.tp({x},{z})'); await pg.wait_for_timeout(5000)
            f = f'shots/tour2/{len(shots):02d}.png'; await pg.screenshot(path=f); shots.append((name, f))
        await b.close()
    W, H = 400, 225; sheet = Image.new('RGB', (W * 4, (H + 22) * 3), '#FFF6DE'); d = ImageDraw.Draw(sheet)
    for i, (name, f) in enumerate(shots):
        im = Image.open(f).resize((W, H)); x, y = (i % 4) * W, (i // 4) * (H + 22)
        sheet.paste(im, (x, y + 22)); d.text((x + 6, y + 4), name, fill='#3b302b')
    sheet.save('shots/tour2/kontaktbogen.png'); print('Fehler', errs)
asyncio.run(main())
