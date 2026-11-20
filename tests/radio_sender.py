"""20a: eigene Radiosender. Erwartet Testsender in dist/audio/radio (tools/radio_build.py mit Testtönen). Prüft: Liste geladen, Taste Q schaltet weiter,
Jingle → Song → nächster Song, Meldung «Sender – Titel», Menüzeile Musik, Speichern der Wahl über Neuladen, Sender ohne Songs unsichtbar."""
import asyncio, json, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 620}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); res = {}
        async def start(clear):
            await pg.goto('http://localhost:8765/?test&noshadow&notraffic&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible')
            if clear: await pg.evaluate('localStorage.clear()')
            await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(2500)
        await start(True)
        res['start'] = await pg.evaluate('window.__sender()')
        seq = []
        await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(1500); res['q1'] = await pg.evaluate('window.__sender()'); res['toast1'] = await pg.evaluate("[...document.querySelectorAll('.toast,#toast')].map(e=>e.textContent).join('|')")
        for _ in range(26):
            await pg.wait_for_timeout(2000); s = await pg.evaluate('window.__sender()')
            if not seq or seq[-1] != s['file']: seq.append(s['file'])
        res['folge'] = seq
        await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(1500); res['q2'] = await pg.evaluate('window.__sender()')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1200); await pg.screenshot(path='shots/radio_menu.png')
        res['menue'] = await pg.evaluate("[...document.querySelectorAll('button')].map(b=>b.textContent).filter(t=>/Spielmusik|📻|Keine/.test(t))")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(800)
        await start(False); await pg.wait_for_timeout(2500); res['nach_neuladen'] = await pg.evaluate('window.__sender()')
        res['fehler'] = errs; print(json.dumps(res, ensure_ascii=False)); await b.close()
asyncio.run(main())
