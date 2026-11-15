"""P-B Lauf 5: Schnellreise-Karte in der Testszene (ohne Welt). Aufruf: nice -n 10 python3 tests/par/pb_reise.py [PORT] [Ordner]
Server: python3 -m http.server PORT --directory dist_pb_reise"""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8772'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'shots/pb6'
os.makedirs(OUT, exist_ok=True)
M = """JSON.stringify((() => { const s = document.querySelector('.tr-map'), c = document.querySelector('.tr-card'); if (!s) return null; const sr = s.getBoundingClientRect(), cr = c.getBoundingClientRect();
  const hits = [...s.querySelectorAll('.tr-hit')].map(e => e.getBoundingClientRect().width);
  const ratio = sr.width / sr.height, vb = s.viewBox.baseVal; return {img: s.classList.contains('img'), map: [Math.round(sr.width), Math.round(sr.height)], vbRatio: +(vb.width / vb.height).toFixed(3), shownRatio: +ratio.toFixed(3),
   cardInView: cr.left >= -1 && cr.top >= -1 && cr.right <= innerWidth + 1 && cr.bottom <= innerHeight + 1, hitPx: {min: Math.round(Math.min(...hits)), median: Math.round(hits.sort((a, b) => a - b)[hits.length >> 1]), ge44: hits.filter(h => h >= 44).length, n: hits.length},
   here: !!s.querySelector('.tr-here'), me: s.querySelector('.tr-me text')?.textContent || null}; })())"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for n, w, h, touch in [('h390', 390, 844, True), ('h800', 800, 380, True), ('pc1280', 1280, 720, False), ('pc1920', 1920, 1080, False)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=touch); pg = await ctx.new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            await pg.goto(f'http://localhost:{PORT}/pb_reise.html?{"touch&" if touch else ""}region=luzern&x=300&z=400'); await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(600)
            print(n, await pg.evaluate(M)); await pg.screenshot(path=f'{OUT}/reise_{n}.png')
            # Antippen: Pin «Spital Nidwalden» (stans) an seiner Mitte
            box = await pg.evaluate("""(() => { const i = [...document.querySelectorAll('.tr-pin')].findIndex(g => g.querySelector('text').textContent.includes('Spital Nidwalden')); const r = document.querySelectorAll('.tr-pin')[i].querySelector('circle.tr-hit').getBoundingClientRect(); return [r.x + r.width / 2 + r.width * 0.3, r.y + r.height / 2]; })()""")
            if touch: await pg.touchscreen.tap(box[0], box[1])
            else: await pg.mouse.click(box[0], box[1])
            await pg.wait_for_timeout(2600); print(n, 'Antippen neben Pin Stans →', await pg.evaluate('window.__went || document.querySelector(".tr-msg")?.textContent'), '| Fehler', errs)
            await ctx.close()
        # Fallback: Karte fehlt (404)
        ctx = await b.new_context(viewport={'width': 800, 'height': 380}, has_touch=True); pg = await ctx.new_page()
        await pg.route('**/karte.json', lambda r: r.fulfill(status=404, body='nein'))
        await pg.goto(f'http://localhost:{PORT}/pb_reise.html?touch'); await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(400)
        print('fallback 404', await pg.evaluate(M)); await pg.screenshot(path=f'{OUT}/reise_fallback.png'); await ctx.close()
        await b.close()
asyncio.run(main())
