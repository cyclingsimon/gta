"""19a: iPhone-Modus (UA iPhone 11, Touch, 414×896). Prüft: kein Hintergrund-Nachladen (höchstens 1 Gegend), Fahren 60 s,
Randwechsel Luzern → West per Neuladen (Dialog), Schnellreise (Neuladen), JS-Heap nach Start. Aufruf: ios_phone.py [port] [qs]"""
import asyncio, json, sys, math, time
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
QS = sys.argv[2] if len(sys.argv) > 2 else '&q=leicht'
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'])
        ctx = await b.new_context(user_agent=UA, viewport={'width': 414, 'height': 896}, is_mobile=True, has_touch=True, device_scale_factor=1)
        pg = await ctx.new_page(); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        welt = []; pg.on('console', lambda m: welt.append(m.text[:120]) if m.text.startswith('[welt]') else None)
        nav = []; pg.on('framenavigated', lambda f: nav.append(f.url) if f == pg.main_frame else None)
        res = {}
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&edge&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady')
        res['ua_iphone'] = await pg.evaluate("/iPhone/.test(navigator.userAgent)")
        res['touch'] = await pg.evaluate("document.body.classList.contains('touch')")
        await pg.wait_for_timeout(3000)
        res['heap_start_mb'] = await pg.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null")
        # 1) 60 s fahren (Autopilot) und am Westrand entlang bis kurz vor die Grenze – dort würde Streaming West laden
        await pg.evaluate('window.__dbg.drive(true)'); t0 = time.time(); maxs = 0
        while time.time() - t0 < 60:
            await pg.wait_for_timeout(2000); w = await pg.evaluate('window.__welt()'); maxs = max(maxs, len(w['geladen']))
        await pg.evaluate('window.__dbg.drive(false)')
        x = -3000; H = -math.pi / 2
        while x > -3680:
            await pg.evaluate(f'window.__dbg.warp({x},1200,{H}); window.__dbg.speed(20)'); await pg.wait_for_timeout(700)
            w = await pg.evaluate('window.__welt()'); maxs = max(maxs, len(w['geladen'])); x -= 40
        await pg.wait_for_timeout(4000); w = await pg.evaluate('window.__welt()'); maxs = max(maxs, len(w['geladen']))
        res['fahrt'] = {'max_gegenden': maxs, 'welt': w, 'geladen_meldungen': [l for l in welt if 'geladen' in l]}
        res['heap_nach_fahrt_mb'] = await pg.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null")
        print('schritt1', json.dumps(res, ensure_ascii=False), flush=True)
        # 2) Randwechsel Luzern → West (frisch geladen, kein Einsatz): über den Rand, Dialog, «Ja» → Neuladen mit region=west
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&edge&region=luzern{QS}'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("localStorage.clear(); document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady')
        await pg.evaluate('window.__dbg.quiet && 0'); n0 = len(nav)
        for x in (-3700, -3730, -3760):
            await pg.evaluate(f'window.__dbg.warp({x},1200,{H}); window.__dbg.speed(8)'); await pg.wait_for_timeout(1500)
            if await pg.evaluate("!!document.querySelector('.mg-card.ask')"): break
        res['dialog'] = await pg.evaluate("document.querySelector('.mg-card.ask') ? document.querySelector('.mg-card.ask').innerText.slice(0, 80) : null")
        print('dialog', res['dialog'], (await pg.evaluate('window.__dbg.info()'))['phase'], await pg.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.innerText).join(' | ')"), flush=True)
        await pg.evaluate("document.querySelector('#rg-ja') && document.querySelector('#rg-ja').click()")
        await pg.wait_for_url('**region=west**', timeout=120000, wait_until='commit'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady')
        await pg.wait_for_timeout(2000)
        res['wechsel'] = {'url': pg.url.split('/')[-1], 'neu_geladen': len(nav) > n0, 'welt': await pg.evaluate('window.__welt()'), 'auto': await pg.evaluate('window.__dbg.car()')}
        res['heap_west_mb'] = await pg.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null")
        # 3) Schnellreise in eine andere Gegend (Spital Nidwalden) → Neuladen mit region=sued
        await pg.keyboard.press('KeyT'); await pg.wait_for_selector('.mg.tr'); await pg.wait_for_timeout(800)
        await pg.evaluate("[...document.querySelectorAll('.tr-list button')].find((b) => b.textContent.includes('Spital Nidwalden')).click()")
        await pg.wait_for_url('**region=sued**', timeout=120000, wait_until='commit'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate("document.querySelector('#start-btn').click()"); await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(2000)
        res['reise'] = {'url': pg.url.split('/')[-1], 'welt': await pg.evaluate('window.__welt()'), 'auto': await pg.evaluate('window.__dbg.car()')}
        res['fehler'] = errs
        res['ok'] = res['ua_iphone'] and maxs <= 1 and not res['fahrt']['geladen_meldungen'] and res['wechsel']['welt']['aktiv'] == 'west' and res['reise']['welt']['aktiv'] == 'sued' and res['reise']['welt']['drin'] and not errs
        print(json.dumps(res, ensure_ascii=False)); await b.close()
asyncio.run(main())
