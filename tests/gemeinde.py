"""15b: Gemeindegrenzen im Spiel – in Schritten Luzern → Kriens → Luzern (Allmend) → Horw, Willkommens-Meldungen mitlesen. Aufruf: gemeinde.py [port]"""
import asyncio, json, sys, math
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
WEG = [(-800, 600), (-2600, 1800), (-300, 2600), (-300, 4400)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic&nostream'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        await pg.evaluate("window.__dbg.quiet(); window.__toasts = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent); }).observe(document.body, { childList: true, subtree: true })")
        folge = []; shot = 0
        x, z = WEG[0]; await pg.evaluate(f'window.__dbg.warp({x},{z},0)'); await pg.wait_for_timeout(4000)
        for (tx, tz) in WEG[1:]:
            n = int(math.hypot(tx - x, tz - z) // 70) + 1; sx, sz = (tx - x) / n, (tz - z) / n; h = math.atan2(sx, sz)
            for i in range(n):
                x += sx; z += sz; await pg.evaluate(f'window.__dbg.warp({x},{z},{h})'); await pg.wait_for_timeout(900)
                g = await pg.evaluate(f'window.__gem({x},{z})')
                if not folge or folge[-1][0] != g: folge.append([g, round(x), round(z)])
                t = await pg.evaluate('window.__toasts.length')
                if t > shot: shot = t; await pg.screenshot(path=f'shots/gem_{t}.png')
            await pg.wait_for_timeout(5000)
        toasts = await pg.evaluate('window.__toasts')
        erw = [f[0] for f in folge[1:]]
        print(json.dumps({'gemeinden_am_weg': folge, 'toasts': toasts, 'fehler': errs, 'ok': not errs and all(any(e in t for t in toasts) for e in ('Kriens', 'Horw'))}, ensure_ascii=False)); await b.close()
asyncio.run(main())
