"""Höhenprofil entlang von Brückenstücken: brprofil.py 'x,z;x,z' – je Stück (Start nahe x,z) Deckhöhe/Boden alle ~8 m, davor und danach 30 m der Anschlussstrasse."""
import asyncio, sys, json, math
from playwright.async_api import async_playwright
want = [tuple(float(v) for v in s.split(',')) for s in sys.argv[1].split(';')]
roads = json.load(open('public/data/city.json'))['roads']
def pick(x, z):
    return min((r for r in roads if r.get('b')), key=lambda r: min(math.hypot(r['p'][0][0]-x, r['p'][0][1]-z), math.hypot(r['p'][-1][0]-x, r['p'][-1][1]-z)))
def samp(p, step=8):
    out = [p[0]]
    for a, b in zip(p, p[1:]):
        L = math.dist(a, b); n = max(1, int(L / step))
        out += [[a[0]+(b[0]-a[0])*k/n, a[1]+(b[1]-a[1])*k/n] for k in range(1, n+1)]
    return out
def ext(a, b, d):
    L = math.dist(a, b) or 1; return [[a[0]+(a[0]-b[0])/L*k, a[1]+(a[1]-b[1])/L*k] for k in (d, d*2/3, d/3)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test&noshadow&notraffic&q=leicht'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000)
        for x, z in want:
            r = pick(x, z); P = r['p']; pts = ext(P[0], P[1], 30) + samp(P) + ext(P[-1], P[-2], 30)[::-1]
            H = await pg.evaluate('(pts)=>pts.map(q=>window.__dbg.hg(q[0],q[1]))', pts)
            print(r.get('n'), r.get('c'), [round(v) for v in P[0]], '→', [round(v) for v in P[-1]]); print('  Deck ', [h[0] for h in H]); print('  Boden', [h[1] for h in H])
        await b.close()
asyncio.run(main())
