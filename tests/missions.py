import asyncio, sys, time, math
from playwright.async_api import async_playwright
URL = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8765/?test'
async def wait_phase(pg, phases, timeout=240):
    t=time.time()
    while time.time()-t < timeout:
        st = await pg.evaluate('window.__dbg.info()')
        if st['phase'] in phases: return st
        await pg.wait_for_timeout(500)
    raise Exception(f'Timeout warte auf {phases}, Stand {st["phase"]}, Auto {await pg.evaluate("window.__luksi.car")}')
async def jump_near(pg, remain=110):
    await pg.wait_for_timeout(1500)
    st = await pg.evaluate('window.__dbg.info()')
    pts = st['routePts']; acc=0; idx=0
    for i in range(len(pts)-1,0,-1):
        acc += math.dist(pts[i],pts[i-1])
        if acc > remain: idx=i; break
    if idx:
        nx, nz = pts[min(idx + 1, len(pts) - 1)]; h = math.atan2(nx - pts[idx][0], nz - pts[idx][1])  # Blick in Fahrtrichtung
        await pg.evaluate(f'window.__dbg.tp({pts[idx][0]},{pts[idx][1]},{h})')
    return st['routeLen']
async def solve(pg):
    await pg.wait_for_selector('.mg-card', timeout=120000)
    title = await pg.eval_on_selector('.mg-card h2', 'e => e.textContent')  # textContent: unabhängig von CSS text-transform
    if 'Memory' in title:
        for k in range(4):
            cs = await pg.query_selector_all(f'.card[data-k="{k}"]')
            await cs[0].click(); await cs[1].click(); await pg.wait_for_timeout(1000)
    elif 'Pflaster' in title:
        for i in range(3): await pg.click(f'.spot[data-i="{i}"]', force=True); await pg.wait_for_timeout(200)
    elif 'Katze' in title:
        await pg.click('.b-ok'); print('   Hinweis:', await pg.inner_text('.mg-msg'))
        for i in range(9): await pg.click('.b-right')
        await pg.click('.b-ok')
        for i in range(3): await pg.click('.b-ok'); await pg.wait_for_timeout(200)
    elif 'Fieber' in title:
        for k in range(1500):  # warten, bis die Anzeige im grünen Bereich ist (Spiel liefert Rückmeldung); bei langsamer Software-Grafik viele Versuche
            await pg.evaluate("(() => { const l = document.querySelector('.thermo .level'); if (!l) return; const y = +l.getAttribute('y'); if (y >= 205 - 0.71 * 190 && y <= 205 - 0.57 * 190) document.querySelector('.b-ok').click(); })()")
            if await pg.query_selector('.mg-msg.ok'): break
            await pg.wait_for_timeout(10)
    elif 'Verband' in title:
        for i in range(5): await pg.click(f'.seg[data-i="{i}"]', force=True); await pg.wait_for_timeout(150)
    elif 'Trösten' in title:
        cs = await pg.query_selector_all('.card.wide'); await cs[0].click(); await cs[2].click()
    elif 'Schatten' in title:
        cs = await pg.query_selector_all('.card.wide'); await cs[0].click(); await cs[1].click()
    await pg.wait_for_timeout(2200)
    return title
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':800,'height':450}); pg.set_default_timeout(900000)
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(URL); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000); await pg.wait_for_timeout(1500)
        await pg.keyboard.press('F3'); await pg.wait_for_timeout(1500)
        print('Leistung (Software-Rendering):', (await pg.evaluate('window.__dbg.info()'))['fps'])
        print('Missionen:', (await pg.evaluate('window.__dbg.info()'))['missions'])
        await pg.evaluate('window.__dbg.drive(true)'); await pg.evaluate('window.__dbg.render(false)')
        for n in range(int(sys.argv[1]) if len(sys.argv)>1 else 4):
            await pg.evaluate('window.__dbg.offer()')
            st = await wait_phase(pg, ['offer'], 120)
            await pg.screenshot(path=f'shots/m{n+1}_a_funk.png')
            await pg.keyboard.press('KeyE')
            st = await wait_phase(pg, ['toScene'], 60)
            L = await jump_near(pg)
            print(f'M{n+1}: Route zum Einsatzort {L} m')
            t=time.time()
            st = await wait_phase(pg, ['onsite'], 900)
            print(f'   angekommen nach {round(time.time()-t)} s (echt)')
            await pg.wait_for_timeout(600); await pg.screenshot(path=f'shots/m{n+1}_b_vorort.png')
            title = await solve(pg); print('   Mini-Spiel gelöst:', title)
            st = await wait_phase(pg, ['toHospital','handover'], 60)
            if st['phase']=='toHospital':
                L = await jump_near(pg, 90); print(f'   Route ins Kinderspital {L} m')
                await pg.wait_for_timeout(1500); await pg.screenshot(path=f'shots/m{n+1}_c_fahrt.png')
                st = await wait_phase(pg, ['handover'], 900)
            await pg.wait_for_timeout(1800); await pg.screenshot(path=f'shots/m{n+1}_d_sterne.png')
            print('   Sterne total:', await pg.evaluate('window.__luksi.stars'))
            await pg.keyboard.press('Enter'); await wait_phase(pg, ['free'], 60)
        # Speichern: Neu laden behält Sterne
        await pg.reload(); await pg.wait_for_selector('#start-btn', state='visible', timeout=120000)
        await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady', timeout=900000); await pg.wait_for_timeout(1000)
        print('Nach Neuladen Sterne:', await pg.evaluate('window.__luksi.stars'))
        print('Fehler:', errs[:10])
        await b.close()
asyncio.run(main())
