"""P-A Testszene fotografieren: python3 tests/par/real_shots.py [ansicht,...]
Erwartet Server auf Port 8771 mit dist_pa_szene/. Schreibt shots/pa_<ansicht>.png und gibt Dreieckszahlen + Fehler aus."""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
VIEWS = (sys.argv[1] if len(sys.argv) > 1 else 'amb,amb2,amb3,bus,bus2,bus3,baum,moebel,autos,total').split(',')
async def main():
    os.makedirs('shots', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        W, H = (int(v) for v in os.environ.get('SIZE', '960x540').split('x'))
        pg = await b.new_page(viewport={'width': W, 'height': H}); pg.set_default_timeout(180000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text[:300]))
        for i, v in enumerate(VIEWS):
            q = v.split('+'); await pg.goto(f'http://localhost:8771/real_szene.html?v={q[0]}' + ('&nacht=1' if 'nacht' in q else '')); await pg.wait_for_function('window.__ready')
            await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f"shots/pa_{v.replace('+', '_')}" + (f'_{W}x{H}' if (W, H) != (960, 540) else '') + '.png')
            if i == 0:
                st = await pg.evaluate('window.__stats'); print(json.dumps(st, indent=0))
                LIM = {'spar_leuchte_modern': 28, 'spar_leuchte': 28, 'spar_kandelaber': 48, 'spar_wartehalle': 120, 'spar_bank': 60,
                       'spar_auto_kombi': 180, 'spar_auto_kleinwagen': 180, 'spar_auto_suv': 180, 'spar_auto_lieferwagen': 180,
                       'hochrechnung_3500_min': 180000, 'klein_kuebel': 32, 'klein_robidog': 32, 'klein_briefkasten': 32, 'klein_hydrant': 32, 'klein_deckel_25000': 25000, 'klein_deckel_5000': 5000, 'zug_flirt_mitte': 120, 'zug_flirt_ende': 120, 'zug_dosto_mitte': 120, 'zug_dosto_ende': 120, 'zug_zb_mitte': 120, 'zug_zb_ende': 120, 'zug_traverso_mitte': 120, 'zug_traverso_ende': 120,
                       'schiff_dampfer': 400, 'schiff_motorschiff': 300, 'schiff_ruderboot': 60, 'schiff_segelboot': 60, 'schiff_pedalo': 60, 'stadt_delta_dreiecke': 30000, 'stadt_delta_netze': 25}
                bad = {k: (st.get(k), v) for k, v in LIM.items() if st.get(k) is None or st[k] > v}
                if not st.get('hochrechnung_3500_min'): bad['hochrechnung_3500_min'] = (st.get('hochrechnung_3500_min'), '> 0 erwartet')
                print('BUDGET je Baustein:', 'OK' if not bad else 'FEHLER ' + str(bad))
                print('Stadt alt/neu Dreiecke', st.get('stadt_alt_dreiecke'), st.get('stadt_neu_dreiecke'), 'Netze', st.get('stadt_alt_netze'), st.get('stadt_neu_netze'))
                print('Stadt-Netze neu:', await pg.evaluate('window.__stadt.neu.join(" ")'))
            print(v, await pg.evaluate("document.getElementById('info').textContent"))
        echte = [e for e in errs if '404' not in e]
        print('Fehler (ohne 404 Busheck-Bilder)', echte); await b.close()
asyncio.run(main())
