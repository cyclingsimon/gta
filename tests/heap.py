import asyncio, time, json, collections
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(1500000)
        cdp = await pg.context.new_cdp_session(pg)
        await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', {'samplingInterval': 65536})
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        await pg.evaluate('gc()')
        prof = (await cdp.send('HeapProfiler.getSamplingProfile'))['profile']
        agg = collections.Counter()
        def walk(n, stack):
            cf = n['callFrame']; name = f"{cf['functionName'] or '(anon)'}:{cf['lineNumber']}"
            st = stack + [name]
            if n['selfSize']: agg[' < '.join(reversed(st[-3:]))] += n['selfSize']
            for c in n['children']: walk(c, st)
        walk(prof['head'], [])
        tot = sum(agg.values()); print('total MB', round(tot/1e6))
        for k, v in agg.most_common(25): print(round(v/1e6, 1), k)
        await b.close()
asyncio.run(main())
