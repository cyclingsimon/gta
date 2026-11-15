"""P-B Lauf 3: Tempo/Auftrag 800–1280 px (ohne und mit Touch), Schwierigkeitswahl, Funkhalt-Anzeige, lange Willkommens-Toasts.
Zwei Seitenaufrufe (Leicht). Aufruf: nice -n 10 python3 tests/par/ui_pb3.py [PORT] [Ordner]"""
import asyncio, json, sys, os
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8772'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'shots/pb4'
os.makedirs(OUT, exist_ok=True)
URL = f'http://localhost:{PORT}/?test&diffwahl&funkhalt&q=leicht&noshadow&notraffic'
OVL = """JSON.stringify((() => { const vis = e => { let p = e; while (p && p !== document.documentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; p = p.parentElement; } return true; };
  const ids = ['#speed', '#mission', '#minimap', '#keys', '#navbox #dist', '#hud-top'], els = ids.map(s => document.querySelector(s)).filter(e => e && vis(e)), o = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 1 && y > 1) o.push([els[i].id, els[j].id, Math.round(x), Math.round(y)]); }
  const off = els.filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1; }).map(e => e.id);
  return {vp: [innerWidth, innerHeight], overlap: o, offscreen: off}; })())"""
DIFF = """JSON.stringify((() => { const w = document.getElementById('diff-wahl'); if (!w) return null; const bs = [...w.querySelectorAll('button')];
  return {btn: bs.map(b => { const r = b.getBoundingClientRect(); return [b.dataset.diff, Math.round(r.left), Math.round(r.right), Math.round(r.height), r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight]; }),
    focus: document.activeElement?.dataset?.diff, outline: getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth}; })())"""
TOAST = """((txt) => { document.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = txt; document.getElementById('ui').appendChild(t);
  const r = t.getBoundingClientRect(); return JSON.stringify([Math.round(r.left), Math.round(r.right), Math.round(r.height), r.left >= 0 && r.right <= innerWidth, t.scrollWidth <= t.clientWidth + 1]); })"""
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
        # Aufruf 1: Desktop 1280×720 – nur Schwierigkeitswahl, Tastatur-Fokus
        ctx, pg, errs1 = await load(b, False, 1280, 720)
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(200)
        print('diff pc1280', await pg.evaluate(DIFF)); await pg.screenshot(path=f'{OUT}/diff_pc1280.png')
        await ctx.close()
        # Aufruf 2: Touch, Start bei 800×380
        ctx, pg, errs = await load(b, True, 800, 380)
        cdp = await ctx.new_cdp_session(pg)
        for n, (w, h) in [('h800', (800, 380)), ('h390', (390, 844))]:
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(500)
            print('diff', n, await pg.evaluate(DIFF)); await pg.screenshot(path=f'{OUT}/diff_{n}.png')
        await pg.set_viewport_size({'width': 800, 'height': 380})
        await pg.click('#diff-wahl [data-diff="rettung"]'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(2500)
        print('--- Touch 800–1280 ---')
        for w in range(800, 1281, 80):
            await pg.set_viewport_size({'width': w, 'height': 540 if w < 1100 else 720}); await pg.wait_for_timeout(500)
            print('touch', w, await pg.evaluate(OVL))
        for n, (w, h) in [('h390', (390, 844)), ('h800', (800, 380))]:
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(400)
            for txt in ['👋 Willkommen in Küssnacht am Rigi!', '👋 Willkommen in Finsterwald b. Entlebuch!', 'Willkommen in Emmenbrücke, Ebikon und Adligenswil! Das Kinderspital ist ganz im Süden.']:
                print('toast', n, txt[:30], await pg.evaluate(TOAST, txt))
            await pg.screenshot(path=f'{OUT}/toast_{n}.png')
            await pg.evaluate("document.querySelectorAll('.toast').forEach(t => t.remove())")
            await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'{OUT}/funk_{n}.png')
            await pg.evaluate("document.querySelector('#dec')?.click()"); await pg.wait_for_timeout(500)
        print('--- ohne Touch 800–1280 ---')
        await cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': False})
        await pg.evaluate("document.body.classList.remove('touch'); const t = document.getElementById('touch'); if (t) t.style.display = 'none'; const k = document.getElementById('keys'); if (k) { k.style.display = ''; k.classList.remove('hide'); }")
        for w in range(800, 1281, 40):
            for h in (540, 720):
                await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(300)
                r = await pg.evaluate(OVL); print('pc', w, h, r)
                if w in (960, 1040, 1240) and h == 540: await pg.screenshot(path=f'{OUT}/pc{w}x{h}.png')
        await pg.set_viewport_size({'width': 960, 'height': 540}); await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}/funk_pc960.png')
        print('Fehler', errs1 + errs); await b.close()
asyncio.run(main())
