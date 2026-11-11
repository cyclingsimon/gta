import asyncio, json, math
from playwright.async_api import async_playwright
from PIL import Image
LAT0,LON0=47.0517,8.3077; KX=math.cos(math.radians(LAT0))*111320; KZ=110574
meta=json.load(open('shots/ref/quellen.json'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':540}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test&notraffic'); await pg.wait_for_selector('#start-btn', state='visible', timeout=300000)
        await pg.evaluate('localStorage.clear()'); await pg.click('#start-btn'); await pg.wait_for_timeout(500); await pg.evaluate('window.__dbg.quiet()'); await pg.set_viewport_size({'width':480,'height':320})
        await pg.evaluate("document.querySelectorAll('canvas').forEach(c=>{})")
        for k,m in meta.items():
            la,lo=m['coord']; x=(lo-LON0)*KX; z=-(la-LAT0)*KZ
            tiles=[]
            for i,h in enumerate([0,math.pi/2,math.pi,3*math.pi/2]):
                await pg.evaluate(f'window.__dbg.camAt({x},{z},{h})'); await pg.wait_for_timeout(3500)
                f=f'shots/ref/g_{k}_{i}.png'; await pg.screenshot(path=f); tiles.append(f)
            ims=[Image.open(f) for f in tiles]; sh=Image.new('RGB',(480*4,320))
            for i,im in enumerate(ims): sh.paste(im,(480*i,0))
            sh.save(f'shots/ref/g_{k}.jpg'); print(k, round(x), round(z), flush=True)
        await b.close()
asyncio.run(main())
