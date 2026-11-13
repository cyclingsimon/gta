"""UI-Prüfung: Pause-Menü mit Spielumfang (960×540) und Funkmeldung/Toasts in kleinem Querformat (800×380, wie Handy). Aufruf: ui_check.py"""
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 380}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://localhost:8765/?test&noshadow&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1500); await pg.screenshot(path='shots/ui_offer.png')
        await pg.click('#acc'); await pg.wait_for_timeout(300); await pg.screenshot(path='shots/ui_accept.png')
        print('Toasts nach Annahme:', await pg.evaluate("[...document.querySelectorAll('.toast')].map(t=>{const r=t.getBoundingClientRect();return [t.textContent.slice(0,40),Math.round(r.top),Math.round(r.height),getComputedStyle(t).fontSize]})"))
        await pg.set_viewport_size({'width': 960, 'height': 540}); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='shots/ui_pause.png')
        print('Umfang:', await pg.evaluate("document.querySelector('.umfang')?.textContent"))
        print('Fehler', errs); await b.close()
asyncio.run(main())
