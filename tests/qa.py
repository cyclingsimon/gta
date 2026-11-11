"""Realismus-Testkit Stufe 1+2: Geometrie-Prüfungen + Bilder-Rundgang (Kontaktbogen).
Aufruf: python3 tests/qa.py [url]"""
import asyncio, json, sys, time
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/?test'
# Feste Kamerapunkte: (Name, x, z, Kamera 0=hinten 1=oben)
TOUR = [('Kapellbrücke Ost', 60, -20, 0), ('Schwanenplatz', 86, -151, 0), ('Seebrücke', 97, -116, 0), ('Bahnhof/KKL', 250, 60, 0),
        ('Inseli', 418, 206, 0), ('Jesuitenkirche', -190, 170, 0), ('Spreuerbrücke', -470, 10, 0), ('Altstadt Weinmarkt', -150, -60, 0),
        ('Musegg', -250, -257, 0), ('Gütsch', -651, 254, 0), ('Kinderspital', -560, -771, 0), ('Reuss von oben', -230, 0, 2)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        t = time.time(); await pg.goto(URL); await pg.wait_for_selector('#start-btn', state='visible')
        load = round(time.time() - t)
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000); await pg.wait_for_timeout(1500)
        rep = await pg.evaluate('window.__dbg.qa()'); await pg.evaluate('window.__dbg.quiet()'); rep['ladezeit_s_software'] = load; rep['voll_geladen_s'] = round(time.time() - t); rep['fehler'] = errs
        shots = []
        for name, x, z, cam in TOUR:
            await pg.evaluate(f'window.__dbg.tp({x},{z})')
            if cam == 1: await pg.keyboard.press('KeyC')
            if cam == 2: await pg.evaluate(f'window.__dbg.cam([{x},300,{z}+170,{x},0,{z}])')
            await pg.wait_for_timeout(5000)
            f = f'shots/qa/{len(shots):02d}.png'; await pg.screenshot(path=f); shots.append((name, f))
            if cam == 1: await pg.keyboard.press('KeyC'); await pg.keyboard.press('KeyC')
            if cam == 2: await pg.evaluate('window.__dbg.cam(null)')
        await b.close()
    # Kontaktbogen 4×3
    W, H = 400, 225; sheet = Image.new('RGB', (W * 4, (H + 22) * 3), '#FFF6DE'); d = ImageDraw.Draw(sheet)
    for i, (name, f) in enumerate(shots):
        im = Image.open(f).resize((W, H)); x, y = (i % 4) * W, (i // 4) * (H + 22)
        sheet.paste(im, (x, y + 22)); d.text((x + 6, y + 4), name, fill='#3b302b')
    sheet.save('shots/qa/kontaktbogen.png')
    json.dump(rep, open('shots/qa/report.json', 'w'), ensure_ascii=False, indent=1)
    for c in rep['checks']: print(('OK  ' if c['ok'] else 'FAIL'), c['id'], c['name'], c['value'], '/', c['limit'], {k: v for k, v in c.items() if k in ('beispiele', 'fehlend', 'drawCalls', 'schwebend')})
    print('Gesamt', 'OK' if rep['ok'] else 'NICHT OK', '· Ladezeit (Software)', load, 's · Fehler', errs)
asyncio.run(main())
