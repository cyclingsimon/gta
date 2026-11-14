"""P-B Oberfläche + Geräuschkulisse in EINEM Seitenaufruf (Leicht-Stufe, Software-Rendering).
Aufruf: nice -n 10 python3 tests/par/ui_pb.py [PORT] [Ausgabeordner]
- Ladebild: alle ~15 s Status, Balkenbreite (ehrlich?) + Screenshots bei 1280×720/1920×1080/800×380/390×844
- Handy (Touch-Emulation): 800×380 und 390×844 – freie Fahrt, Funk, Pause; misst Überdeckung der Fahrbahn und Touch-Ziele < 48 px
- PC (Touch aus): 1280×720 und 1920×1080 – freie Fahrt, Funk, Pause
- Ton: kein Lautsprecher am Testrechner → nur Zustände (window.__amb.state()) an Bahnhof, Seeufer, Land, Tunnel-Ersatz, Ton aus."""
import asyncio, json, sys, time, os
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8772'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'shots/pb'
os.makedirs(OUT, exist_ok=True)
VIEWS = {'h800': (800, 380), 'h390': (390, 844), 'pc1280': (1280, 720), 'pc1920': (1920, 1080)}
# Fahrbahn-Korridor: Bereich vor/um das Auto (Verfolgerkamera: Auto unten Mitte, Strasse läuft zur Bildmitte)
MEASURE = """(() => {
  const W = innerWidth, H = innerHeight, port = H > W;
  const C = port ? {x0: W*.18, x1: W*.82, y0: H*.36, y1: H*.72} : {x0: W*.30, x1: W*.70, y0: H*.38, y1: H*.80};
  const out = {vp: [W, H], corridor: Object.values(C).map(Math.round), cover: [], small: []};
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; let p = e.parentElement; while (p) { const ps = getComputedStyle(p); if (ps.display === 'none' || ps.visibility === 'hidden' || +ps.opacity < 0.05) return false; p = p.parentElement; } return true; };
  const sel = '#hud-top > *, #mission, #navbox, #dist, #minimap, #speed, #keys, #radio, .toast, #t-steer #t-knob, #t-pedals button, #t-btns button, #join-hint, #lazy-ind';
  for (const e of document.querySelectorAll(sel)) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const ix = Math.max(0, Math.min(r.right, C.x1) - Math.max(r.left, C.x0)), iy = Math.max(0, Math.min(r.bottom, C.y1) - Math.max(r.top, C.y0));
    const id = e.id || e.className || e.tagName; const a = ix * iy;
    if (a > 0) out.cover.push([id, Math.round(a / ((C.x1 - C.x0) * (C.y1 - C.y0)) * 1000) / 10 + '%', [r.left, r.top, r.width, r.height].map(Math.round)]);
  }
  for (const e of document.querySelectorAll('#touch button, #radio button, #pause button, .mg button')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.width < 1) continue;
    if (r.width < 48 || r.height < 48) out.small.push([(e.id || e.textContent || '').trim().slice(0, 18), Math.round(r.width), Math.round(r.height)]);
  }
  out.touch = document.body.classList.contains('touch'); out.coarse = matchMedia('(pointer: coarse)').matches;
  return JSON.stringify(out);
})()"""
async def shot(pg, name):
    await pg.screenshot(path=f'{OUT}/{name}.png')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
        pg = await ctx.new_page(); pg.set_default_timeout(1200000)
        cdp = await ctx.new_cdp_session(pg)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic')
        await pg.evaluate('localStorage.clear()'); await pg.reload()
        t0 = time.time(); k = 0; order = list(VIEWS.items())
        print('--- Ladebild ---')
        while True:
            ready = await pg.evaluate("getComputedStyle(document.querySelector('#start-btn')).display !== 'none'")
            st = await pg.evaluate("""JSON.stringify({s: document.querySelector('#load-status')?.textContent, bar: document.querySelector('.ld-fill')?.style.width,
              fillW: (() => { const f = document.querySelector('.ld-fill'), t = document.querySelector('.ld-track'); return f && t ? Math.round(f.getBoundingClientRect().width / t.getBoundingClientRect().width * 100) : null; })(),
              honest: document.querySelector('#ld-step')?.textContent || null})""")
            print(f'{time.time()-t0:6.0f}s', st, flush=True)
            if k < 8:
                n, (w, h) = order[k % 4]; await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(400); await shot(pg, f'load_{k}_{n}')
            k += 1
            if ready: break
            await pg.wait_for_timeout(15000)
        print('Ladezeit', round(time.time() - t0), 's')
        for n, (w, h) in VIEWS.items():
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(300); await shot(pg, f'ready_{n}')
        await pg.set_viewport_size({'width': 800, 'height': 380})
        await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.wait_for_timeout(4000)
        print('--- Handy (Touch) ---')
        for n in ('h800', 'h390'):
            w, h = VIEWS[n]; await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(1500)
            await shot(pg, f'{n}_frei'); print(n, 'frei', await pg.evaluate(MEASURE))
            await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1800)
            await shot(pg, f'{n}_funk'); print(n, 'funk', await pg.evaluate(MEASURE))
            await pg.evaluate("document.querySelector('#dec')?.click()"); await pg.wait_for_timeout(600)
            await pg.evaluate("document.querySelector('[data-a=pause]')?.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))"); await pg.wait_for_timeout(1200)
            await shot(pg, f'{n}_pause'); print(n, 'pause', await pg.evaluate(MEASURE))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(800)
        if os.environ.get('PB_ONLY') == 'handy':
            print('Fehler', errs); await b.close(); return
        print('--- PC (Touch aus) ---')
        await cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': False})
        await pg.evaluate("document.body.classList.remove('touch'); const t = document.getElementById('touch'); if (t) t.style.display = 'none'")
        for n in ('pc1280', 'pc1920'):
            w, h = VIEWS[n]; await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(1500)
            await shot(pg, f'{n}_frei'); print(n, 'frei', await pg.evaluate(MEASURE))
            await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_timeout(1800)
            await shot(pg, f'{n}_funk'); print(n, 'funk', await pg.evaluate(MEASURE))
            await pg.evaluate("document.querySelector('#dec')?.click()"); await pg.wait_for_timeout(600)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1200)
            await shot(pg, f'{n}_pause'); print(n, 'pause', await pg.evaluate(MEASURE))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(800)
        print('--- Ton (nur Zustände, keine Tonausgabe am Testrechner) ---')
        has = await pg.evaluate('!!window.__amb')
        print('__amb vorhanden:', has)
        if has:
            for name, x, z in [('Bahnhof Luzern', 203, 214), ('KKL-Quai', 330, 60), ('Horw Land', 1200, 3000), ('Kriens Zentrum', -2040, 1941), ('Gütsch', -954, 65)]:
                await pg.evaluate(f'window.__dbg.tp({x},{z},0)'); await pg.wait_for_timeout(3500)
                print(name, await pg.evaluate('JSON.stringify(window.__amb.state())'))
            await pg.evaluate("window.__amb.force('tunnel')"); await pg.wait_for_timeout(2500); print('Tunnel (erzwungen)', await pg.evaluate('JSON.stringify(window.__amb.state())'))
            await pg.evaluate("window.__amb.force(null)")
            # Probe-Logik mit künstlicher Welt: Wasser westlich x<0, Häuser bei z<0, Wald bei z>500
            await pg.evaluate("window.__amb.bind({mask: (x, z) => x < 0 ? 1 : z < 0 ? 2 : 0, forest: (x, z) => z > 500 && x > 0})")
            for name, x, z in [('Probe: Ufer', 10, 200), ('Probe: Häuser', 300, -300), ('Probe: Wald', 400, 900), ('Probe: Wiese', 400, 250)]:
                await pg.evaluate(f'window.__dbg.tp({x},{z},0)'); await pg.wait_for_timeout(2500)
                print(name, await pg.evaluate("JSON.stringify(window.__amb.state().w)"))
            await pg.evaluate("window.__amb.unbind()")
            await pg.evaluate("window.__amb.chime(2)"); await pg.evaluate("window.__amb.gong()"); await pg.wait_for_timeout(800)
            await pg.keyboard.press('m'); await pg.wait_for_timeout(2000); print('Ton aus', await pg.evaluate('JSON.stringify(window.__amb.state())'))
            await pg.keyboard.press('m'); await pg.wait_for_timeout(500)
        print('Fehler', errs); await b.close()
asyncio.run(main())
