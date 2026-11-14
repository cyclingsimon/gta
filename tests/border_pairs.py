"""14zl: Übergang zwischen zwei Gegenden ohne Neuladen – Stichprobe je Paar (Leicht-Modus).
Ablauf: in Gegend A vor der Grenze Richtung B fahren, bis B im Hintergrund geladen ist; dann über die Grenze setzen und prüfen,
dass B aktiv wird, die Ambulanz auf der Strasse steht und keine Fehler auftreten."""
import asyncio, json, math, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1]; PAIRS = [p.split(':') for p in sys.argv[2].split(',')]
B0 = {'luzern': [-3800, -1100, 2700, 6300], 'nord': [-3800, -3900, 4600, -550], 'ost': [2500, -2000, 7500, 2500], 'west': [-8500, -1300, -3600, 3000], 'sued': [-3000, 6100, 4600, 11000]}
def bnd(r): return B0[r] if r in B0 else json.load(open(f'public/data/{r}/city.json'))['meta']['bounds']
def inside(p, b): return b[0] < p[0] < b[2] and b[1] < p[1] < b[3]
async def one(pw, A, Bn):
    R = json.load(open(f'/tmp/x_{A}_{Bn}.json')); ba = bnd(A)
    k = next(i for i, p in enumerate(R) if not inside(p, ba))
    i0 = max(k - 12, 0); i1 = min(k + 6, len(R) - 2)
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = await b.new_page(viewport={'width': 800, 'height': 450}); pg.set_default_timeout(600000)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    logs = []; pg.on('console', lambda m: logs.append(m.text) if '[welt]' in m.text else None)
    await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic&nobus&region={A}'); await pg.wait_for_selector('#start-btn', state='visible')
    await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
    (x, z), (x1, z1) = R[i0], R[i0 + 1]
    h = math.atan2(x1 - x, z1 - z)
    await pg.evaluate(f'window.__dbg.warp({x},{z},{h})')
    loaded = False
    for t in range(90):  # bis 3 min: langsam vorrollen, damit das Nachladen anspringt
        await pg.evaluate(f'window.__dbg.head({h}); window.__dbg.speed(4)')
        w = json.loads(await pg.evaluate('JSON.stringify(window.__welt())'))
        if Bn in w['geladen']: loaded = True; break
        await pg.wait_for_timeout(2000)
        if t % 5 == 4: await pg.evaluate(f'window.__dbg.warp({x},{z},{h})')
    (x, z), (x1, z1) = R[i1], R[i1 + 1]
    await pg.evaluate(f'window.__dbg.warp({x},{z},{math.atan2(x1 - x, z1 - z)})'); await pg.wait_for_timeout(5000)
    w = json.loads(await pg.evaluate('JSON.stringify(window.__welt())')); c = json.loads(await pg.evaluate('JSON.stringify(window.__dbg.car())'))
    await pg.screenshot(path=f'shots/bp_{A}_{Bn}.png')
    ok = loaded and w['aktiv'] == Bn and not errs
    print(A, '→', Bn, 'nachgeladen' if loaded else 'NICHT nachgeladen', 'aktiv', w['aktiv'], 'Auto', {k: round(v, 1) for k, v in c.items() if isinstance(v, (int, float))}, 'OK' if ok else 'FEHLER', flush=True)
    print('   ', [l for l in logs if 'geladen' in l or 'aktiv' in l][-3:], errs[:2], flush=True)
    await b.close(); return ok
async def main():
    async with async_playwright() as pw:
        res = [await one(pw, A, Bn) for A, Bn in PAIRS]
    print('ALLES OK' if all(res) else 'NICHT OK')
asyncio.run(main())
