"""P-B Lauf 4: Schwierigkeitswahl (Touch 800×380/390×844, PC 1280×720), Funk-Pause-Schild am Abend (Handy quer/hoch, PC 960×540).
Zwei Seitenaufrufe (Leicht). Aufruf: nice -n 10 python3 tests/par/ui_pb4.py [PORT] [Ordner]"""
import asyncio, sys, os
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8772'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'shots/pb5'
os.makedirs(OUT, exist_ok=True)
URL = f'http://localhost:{PORT}/?test&diffwahl&funkhalt&q=leicht&noshadow&notraffic'
DIFF = """JSON.stringify((() => { const w = document.getElementById('diff-wahl'); if (!w) return null; const bs = [...w.querySelectorAll('button')]; const a = document.activeElement, cs = getComputedStyle(a);
  return {btn: bs.map(b => { const r = b.getBoundingClientRect(); return [b.dataset.diff, Math.round(r.width), Math.round(r.height), r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight]; }),
    focus: a?.dataset?.diff, outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor}; })())"""
SIGN = """JSON.stringify((() => { const r = document.getElementById('radio'); if (!r || !r.classList.contains('show')) return null; const s = getComputedStyle(r, '::after'), rr = r.getBoundingClientRect();
  return {text: s.content, font: s.fontSize, color: s.color, bg: s.backgroundColor, radioTop: Math.round(rr.top), radioRight: Math.round(rr.right), vw: innerWidth}; })())"""
async def load(b, touch, w, h):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=touch)
    pg = await ctx.new_page(); pg.set_default_timeout(1200000)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload()
    await pg.wait_for_selector('#diff-wahl', state='attached'); await pg.wait_for_timeout(500)
    return ctx, pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx, pg, e1 = await load(b, False, 1280, 720)
        print('diff pc1280 (Start)', await pg.evaluate(DIFF))
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(200); print('diff pc1280 (→)', await pg.evaluate(DIFF)); await pg.screenshot(path=f'{OUT}/diff_pc1280.png')
        await ctx.close()
        ctx, pg, e2 = await load(b, True, 800, 380)
        for n, (w, h) in [('h800', (800, 380)), ('h390', (390, 844))]:
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(400)
            await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(150)
            print('diff', n, await pg.evaluate(DIFF)); await pg.screenshot(path=f'{OUT}/diff_{n}.png')
        await pg.set_viewport_size({'width': 800, 'height': 380})
        await pg.click('#diff-wahl [data-diff="rettung"]'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(2000)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(800)
        await pg.click('#pause button:has-text("Abend")'); await pg.wait_for_timeout(500); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1500)
        for n, (w, h) in [('h800', (800, 380)), ('h390', (390, 844)), ('pc960', (960, 540))]:
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(600)
            await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1500)
            print('funk abend', n, await pg.evaluate(SIGN)); await pg.screenshot(path=f'{OUT}/funk_abend_{n}.png')
            await pg.evaluate("document.querySelector('#dec')?.click()"); await pg.wait_for_timeout(500)
        print('Fehler', e1 + e2); await b.close()
asyncio.run(main())
