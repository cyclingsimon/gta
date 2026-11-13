"""13h GTA-Look: Screenshots Ladebild, Startbild, HUD, Funk, Pause, Einsatz erfüllt (1280×720) und Handy-Querformat (800×380, Touch). Aufruf: gta_ui.py"""
import asyncio
from playwright.async_api import async_playwright
A = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
async def run(b, vp, tag, touch):
    ctx = await b.new_context(viewport=vp, has_touch=touch, is_mobile=touch)
    pg = await ctx.new_page(); pg.set_default_timeout(900000)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await pg.goto('http://localhost:8765/?test&noshadow&q=leicht'); await pg.wait_for_timeout(2500)
    await pg.screenshot(path=f'shots/gta_{tag}_laden.png')
    await pg.wait_for_selector('#start-btn', state='visible'); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'shots/gta_{tag}_start.png')
    print(tag, 'Fonts:', await pg.evaluate("[...document.fonts].filter(f=>f.status=='loaded').map(f=>f.family+' '+f.weight).join(', ')"))
    await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
    await pg.wait_for_timeout(2500); await pg.screenshot(path=f'shots/gta_{tag}_hud.png')
    await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'shots/gta_{tag}_funk.png')
    await pg.evaluate('window.__dbg.accept()'); await pg.wait_for_timeout(600); await pg.screenshot(path=f'shots/gta_{tag}_angenommen.png')
    await pg.evaluate('window.__dbg.handover()'); await pg.wait_for_timeout(1800); await pg.screenshot(path=f'shots/gta_{tag}_erfuellt.png')
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1000); await pg.screenshot(path=f'shots/gta_{tag}_pause.png')
    print(tag, 'Fehler', errs); await ctx.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=A)
        await run(b, {'width': 1280, 'height': 720}, 'pc', False)
        await run(b, {'width': 800, 'height': 380}, 'handy', True)
        await b.close()
asyncio.run(main())
