"""P-B Lauf 3: Pegeltest der Geräuschkulisse (OfflineAudioContext, keine Tonausgabe nötig).
Bau + Server selbst: npx vite build -c tests/par/amb_vite.config.mjs; python3 -m http.server 8773 --directory dist_pb_amb
Aufruf: python3 tests/par/amb_offline.py [PORT]"""
import asyncio, sys, json
from playwright.async_api import async_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8773'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(); pg.set_default_timeout(600000)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(f'http://localhost:{PORT}/amb.html')
        await pg.wait_for_function('window.__ambResult')
        r = await pg.evaluate('window.__ambResult')
        for k in ('bausteine', 'mischung'):
            for x in r.get(k, []): print(f"{k:9} {x['name']:28} Spitze {x['peakDb']:7} dBFS  RMS {x['rmsDb']:7} dBFS  Klicks {x['nClicks']} {x['clicks'][:4]}  kürzester Übergang {x.get('kuerzesterUebergangMs')} ms ({x.get('nUebergaenge')})")
        if r.get('ok'):
            for x in r['sirene']['segs'] + [r['lautester']]: print(f"{'sirene':9} {x['name']:28} Spitze {x['peakDb']:7} dBFS  RMS {x['rmsDb']:7} dBFS  Klicks {x['nClicks']} {x['clicks'][:4]}")
            print('Sirene Hz', r['sirene']['sireneHz'])
        else: print(r); print('Seitenfehler', errs)
        bad = []
        if r.get('ok'):
            for s in r['bausteine'] + r['sirene']['segs'] + r['mischung'] + [r['lautester']]:
                if s['name'] == 'alt_blip_positivkontrolle':
                    if not s['nClicks']: bad.append(('Positivkontrolle NICHT erkannt',))
                    continue
                if s['clip']: bad.append(('Clipping', s['name']))
                if s['nClicks']: bad.append(('Klick-Verdacht', s['name'], s['clicks'][:5]))
        print('BEFUNDE', bad if bad else 'keine')
        await b.close()
asyncio.run(main())
