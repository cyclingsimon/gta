import asyncio, json
from playwright.async_api import async_playwright
JS = """() => { const out=[]; window.__dbgWorld.traverse(o=>{ if(!o.isLineSegments) return; const p=o.geometry.getAttribute('position'); let mx=0, at=null, nan=0;
 for(let i=0;i<p.count;i+=2){ const dx=p.getX(i)-p.getX(i+1), dy=p.getY(i)-p.getY(i+1), dz=p.getZ(i)-p.getZ(i+1); const L=Math.hypot(dx,dy,dz); if(!isFinite(L)) nan++; else if(L>mx){mx=L; at=[p.getX(i),p.getY(i),p.getZ(i),p.getX(i+1),p.getY(i+1),p.getZ(i+1)].map(v=>Math.round(v));} }
 out.push({name:o.name||o.parent?.name||'?', count:p.count, odd:p.count%2, maxLen:Math.round(mx), at, nan}); }); return out.filter(x=>x.maxLen>60||x.odd||x.nan); }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':400,'height':225}); pg.set_default_timeout(900000)
        await pg.goto('http://localhost:8765/?test'); await pg.wait_for_selector('#start-btn', state='visible')
        print(json.dumps(await pg.evaluate(JS), indent=0)[:3000])
        await b.close()
asyncio.run(main())
