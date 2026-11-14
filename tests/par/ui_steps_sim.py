"""P-B Lauf 2: Ladeschritt-Logik (src/ui/loadSteps.ts) mit nachgestellten Statusfolgen aus main.ts/world.ts – ohne Weltaufbau.
Vorher: npx esbuild src/ui/loadSteps.ts --bundle --format=iife --global-name=LS --outfile=/tmp/pbsim/ls.js
Prüft: Echt-Modus Luzern, Echt-Modus A-Gegend, Leicht; Balken nie rückwärts, < 100 % vor dem Start-Knopf, 100 % danach."""
import asyncio, json
from playwright.async_api import async_playwright
W = ['Karte wird gezeichnet …', 'Strassen werden gebaut …', 'Häuser werden gebaut …', 'Materialien …', 'Konturen …', 'Wahrzeichen …', 'Bäume …', 'Wald …', 'Stege und Laternen …']
def seq(region, echt):
    s = [f'Lade {region} …', 'Lade Gelände …'] + W + ['Navi wird eingerichtet …']
    if echt:
        b = ['Echte Häuser: ' + x for x in W]
        s += b[:2] + ['Gelände wird verfeinert …' if region == 'Sursee' else 'Echte Häuser werden gebaut …'] + b[2:]
    return s + ['']
CASES = [('Luzern', 'q=echt', True), ('Sursee', 'q=echt&region=a1', True), ('Luzern', 'q=leicht', False), ('Luzern', '', True)]
async def main():
    js = open('/tmp/pbsim/ls.js').read()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await b.new_page()
        for region, q, echt in CASES:
            await pg.route('http://sim.local/**', lambda r: r.fulfill(body='<div id="loader"><div class="ld-track"><div class="ld-fill"></div></div></div><p id="load-status">Lade …</p><button id="start-btn" style="display:none">Los</button>', content_type='text/html'))
            await pg.goto(f'http://sim.local/?{q}'); await pg.evaluate('localStorage.clear()')
            await pg.add_script_tag(content=js); await pg.evaluate('LS.setupLoadSteps()')
            fr = []; last = None
            for m in seq(region, echt):
                await pg.evaluate(f"document.getElementById('load-status').textContent = {json.dumps(m)}"); await pg.wait_for_timeout(20)
                st = json.loads(await pg.evaluate('JSON.stringify(window.__ldSteps())')); fr.append(float(st['frac'].rstrip('%'))); last = st
            pre = fr[-1]; txt_pre = await pg.evaluate("document.getElementById('ld-step').textContent")
            await pg.evaluate("document.getElementById('start-btn').style.display = ''"); await pg.wait_for_timeout(50)
            post = json.loads(await pg.evaluate('JSON.stringify(window.__ldSteps())'))
            mono = all(b >= a for a, b in zip(fr, fr[1:]))
            print(f'{region} {q or "(Standard, Desktop → echt)"}: N={last["N"]} echt={last["echt"]} | monoton={mono} | vor Knopf {pre}% «{txt_pre}» | nach Knopf {post["frac"]} | Verlauf {fr}')
        await b.close()
asyncio.run(main())
