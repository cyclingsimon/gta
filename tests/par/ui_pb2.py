"""P-B Lauf 2: Tablets, Schnellreise am Handy, Pause-Fokus (Tastatur), Toast/#lazy-ind am Handy, Ladeschritte.
EIN Seitenaufruf, Leicht-Stufe, Touch-Emulation. Aufruf: nice -n 10 python3 tests/par/ui_pb2.py [PORT] [Ordner]
Hinweis: Toast und #lazy-ind werden für die Layout-Messung als DOM-Elemente eingesetzt (gleiche Klassen/IDs wie im Spiel)."""
import asyncio, json, sys, time, os
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8772'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'shots/pb3'
os.makedirs(OUT, exist_ok=True)
VIEWS = {'h800': (800, 380), 'h390': (390, 844), 'tab1024': (1024, 768), 'tab768': (768, 1024), 'tab1180': (1180, 820)}
MEASURE = open(os.path.join(os.path.dirname(__file__), 'ui_measure.js')).read()
async def shot(pg, name): await pg.screenshot(path=f'{OUT}/{name}.png')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 1024, 'height': 768}, has_touch=True)
        pg = await ctx.new_page(); pg.set_default_timeout(1200000)
        cdp = await ctx.new_cdp_session(pg)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic')
        await pg.evaluate('localStorage.clear()'); await pg.reload()
        t0 = time.time(); seen = []
        print('--- Ladeschritte ---')
        while True:
            s = await pg.evaluate("JSON.stringify([document.querySelector('#ld-step')?.textContent, window.__ldSteps && window.__ldSteps(), getComputedStyle(document.querySelector('#start-btn')).display])")
            if not seen or s != seen[-1]: seen.append(s); print(f'{time.time()-t0:5.1f}s', s, flush=True)
            if '"none"' not in s.split(',')[-1]: break
            await pg.wait_for_timeout(700)
        await shot(pg, 'ready_tab1024')
        await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(3000)
        inject = """(() => { const ui = document.getElementById('ui');
          const t = document.createElement('div'); t.className = 'toast'; t.textContent = '♥ Ein Luksi-Herz! 40 sind in Luzern, Kriens und Horw versteckt.'; ui.appendChild(t);
          if (!document.getElementById('lazy-ind')) { const l = document.createElement('div'); l.id = 'lazy-ind'; l.textContent = '🏗️ Echte Häuser: Häuser werden gebaut …'; ui.appendChild(l); } })()"""
        for n, (w, h) in VIEWS.items():
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(1200)
            await shot(pg, f'{n}_frei'); print(n, 'frei', await pg.evaluate(MEASURE))
            await pg.evaluate(inject); await pg.wait_for_timeout(300)
            await shot(pg, f'{n}_toast'); print(n, 'toast+lazy', await pg.evaluate(MEASURE))
            await pg.evaluate("document.querySelectorAll('.toast').forEach(t => t.remove()); document.getElementById('lazy-ind')?.remove()")
            await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1500)
            await shot(pg, f'{n}_funk'); print(n, 'funk', await pg.evaluate(MEASURE))
            await pg.evaluate("document.querySelector('#dec')?.click()"); await pg.wait_for_timeout(500)
            await pg.keyboard.press('t'); await pg.wait_for_timeout(1200)
            await shot(pg, f'{n}_reise'); print(n, 'reise', await pg.evaluate(MEASURE))
            print(n, 'reise-liste', await pg.evaluate("""JSON.stringify((() => { const l = document.querySelector('.tr-list'), c = document.querySelector('.tr-card'); if (!l) return null;
              const r = l.getBoundingClientRect(), cr = c.getBoundingClientRect(); return {scrollbar: l.scrollHeight > l.clientHeight, sh: l.scrollHeight, ch: l.clientHeight,
              listInView: r.top >= 0 && r.bottom <= innerHeight + 1, cardInView: cr.top >= -1 && cr.bottom <= innerHeight + 1 && cr.left >= -1 && cr.right <= innerWidth + 1,
              close: (() => { const b = document.querySelector('#tr-close').getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)]; })()}; })())"""))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
        # Pause-Fokus mit Tastatur (Handy quer + Tablet)
        print('--- Pause-Fokus (Tastatur) ---')
        FOC = """JSON.stringify((() => { const f = document.querySelector('#pause button.focus'), p = document.querySelector('#pause .panel'), h = document.querySelector('#pause h2'); if (!f) return null;
          const r = f.getBoundingClientRect(), pr = p.getBoundingClientRect(), hr = h.getBoundingClientRect();
          return [f.textContent.trim().slice(0, 18), r.top >= hr.bottom - 1 && r.bottom <= pr.bottom + 1]; })())"""
        for n in ('h800', 'tab768'):
            w, h = VIEWS[n]; await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(600)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1000)
            res = []
            for k in range(14): await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(120); res.append(json.loads(await pg.evaluate(FOC)))
            for k in range(14): await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(120); res.append(json.loads(await pg.evaluate(FOC)))
            bad = [r for r in res if r and not r[1]]
            print(n, 'Fokus sichtbar:', sum(1 for r in res if r and r[1]), 'von', len(res), '| verdeckt:', bad[:5])
            await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(200)
            await shot(pg, f'{n}_pausefokus')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
        print('Fehler', errs); await b.close()
asyncio.run(main())
