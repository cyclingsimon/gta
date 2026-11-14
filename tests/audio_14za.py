"""14za: Konzertmusik Schüür/KKL (nur in der Nähe) und Musikwahl Spitalradio LuZ (ohne Internet → Rückfall auf Spielmusik)."""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
V = "JSON.stringify((window.__venues||[]).map(v=>({u:v.url,k:+v.near.toFixed(2),play:v.el?!v.el.paused:null,t:v.el?+v.el.currentTime.toFixed(1):null})))"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(900000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht'); await pg.evaluate('localStorage.clear()'); await pg.reload()
        await pg.wait_for_selector('#start-btn', state='visible'); await pg.click('#start-btn'); await pg.wait_for_function('window.__luksiReady')
        for name, x, z in [('Schüür 30 m', 270, 815), ('Schüür 120 m', 270, 905), ('weit weg', 0, 0), ('KKL 40 m', 327, 170)]:
            await pg.evaluate(f'window.__dbg.tp({x},{z},0)'); await pg.wait_for_timeout(2500)
            c = json.loads(await pg.evaluate('JSON.stringify(window.__dbg.car())'))
            print(name, '| Auto', round(c['x']), round(c['z']), '|', await pg.evaluate(V))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        await pg.click('text=Spitalradio LuZ'); await pg.wait_for_timeout(6000)
        t = await pg.evaluate("[...document.querySelectorAll('.toast,#toast')].map(e=>e.innerText).join(' | ')")
        s = json.loads(await pg.evaluate("localStorage.getItem('luksiRescue.v1')"))
        on = await pg.evaluate("[...document.querySelectorAll('#pause button.on')].map(b=>b.innerText).join(', ')")
        print('Radio: Toast:', t[:120], '| save.music', s.get('music'), '| aktiv:', on)
        print('Fehler', errs); await b.close()
asyncio.run(main())
