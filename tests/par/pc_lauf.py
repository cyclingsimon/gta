"""P-C Prüflauf 15.11.: EIN Seitenaufruf (Leicht-Stufe) prüft Schwierigkeitswahl (Tastatur, Doppel-Enter), Ladeschritte,
Dreiecke/Aufrufe der Startansicht je Gruppe und Funkspruch-Halt (Pause, Schnellreise-Karte). Aufruf: pc_lauf.py [port]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8773'
TRIS = """() => { const s = window.__dbgWorld; const by = {}; let tot = 0;
  const wg = s.children.find((c) => c.type === 'Group' && c.children.length > 20) || s;
  for (const top of wg.children) { let t = 0, n = 0; top.traverse((o) => { if (!o.isMesh || !o.geometry) return; const g = o.geometry; const c = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
    const k = o.isInstancedMesh ? o.count : 1; t += c / 3 * k; n++; }); const key = top.name || top.type; by[key] = by[key] || [0, 0]; by[key][0] += t; by[key][1] += n; tot += t; }
  return { gesamt_geometrie: Math.round(tot), gruppen: Object.entries(by).sort((a, b) => b[1][0] - a[1][0]).slice(0, 18).map(([k, v]) => [k, Math.round(v[0]), v[1]]) }; }"""
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540}); pg.set_default_timeout(1200000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.on('console', lambda m: errs.append('console:' + m.text[:200]) if m.type == 'error' else None)
        await pg.goto(f'http://localhost:{PORT}/?test&noshadow&q=leicht&notraffic&diffwahl&funkhalt')
        await pg.wait_for_selector('#diff-wahl', state='attached')
        out['startknopf'] = await pg.evaluate("(() => { const s = document.getElementById('start-btn'); const cs = getComputedStyle(s); return { display: cs.display, opacity: cs.opacity, pe: cs.pointerEvents, fokus: document.activeElement && document.activeElement.dataset.diff, ld: window.__ldSteps && window.__ldSteps() }; })()")
        await pg.keyboard.press('ArrowRight'); out['fokus_nach_rechts'] = await pg.evaluate('document.activeElement.dataset.diff')
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(120); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
        out['willkommen_toasts'] = await pg.evaluate("[...document.querySelectorAll('.toast')].filter((t) => /Willkommen/.test(t.textContent)).length")
        out['save'] = await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('luksiRescue.v1') || '{}'); return { diff: s.diff, diffChosen: s.diffChosen }; })()")
        await pg.wait_for_function('window.__luksiReady'); await pg.wait_for_timeout(4000)
        out['dreiecke'] = await pg.evaluate(TRIS)
        out['fps_zeile'] = await pg.evaluate("document.getElementById('fps').textContent")
        car = lambda: pg.evaluate('JSON.stringify(window.__dbg.car())')
        await pg.evaluate('window.__dbg.speed(15)'); await pg.wait_for_timeout(1000)
        await pg.evaluate('window.__dbg.offer()'); await pg.wait_for_selector('#radio.show'); await pg.wait_for_timeout(600)
        a = json.loads(await car()); await pg.wait_for_timeout(1500); a2 = json.loads(await car())
        out['halt'] = {'steht': abs(a2['x'] - a['x']) + abs(a2['z'] - a['z']) < 0.01, 'tempo_waehrend_halt': a2['speed'], 'tacho': await pg.evaluate("document.getElementById('speed').textContent")}
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        out['pause_bei_funk'] = await pg.evaluate("({ pause: document.getElementById('pause').classList.contains('show'), radio: document.getElementById('radio').classList.contains('show'), phase: window.__luksi.phase })")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        await pg.keyboard.press('KeyT'); await pg.wait_for_timeout(800)
        out['karte_bei_funk'] = await pg.evaluate("({ karte: !!document.querySelector('.mg'), radio: document.getElementById('radio').classList.contains('show'), phase: window.__luksi.phase })")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(800)
        out['nach_karte_zu'] = await pg.evaluate("({ karte: !!document.querySelector('.mg'), radio: document.getElementById('radio').classList.contains('show'), phase: window.__luksi.phase })")
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(1500)
        out['nach_E'] = await pg.evaluate('window.__luksi.phase'); c = json.loads(await car())
        out['faehrt_weiter'] = abs(c['x'] - a2['x']) + abs(c['z'] - a2['z']) > 0.5
        out['fehler'] = errs[:20]
        await b.close()
    print(json.dumps(out, ensure_ascii=False, indent=1))
asyncio.run(main())
