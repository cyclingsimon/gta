(() => {
  const W = innerWidth, H = innerHeight, port = H > W;
  const C = port ? {x0: W*.18, x1: W*.82, y0: H*.36, y1: H*.72} : {x0: W*.30, x1: W*.70, y0: H*.38, y1: H*.80};
  const out = {vp: [W, H], cover: [], small: [], hits: []};
  const vis = (e) => { let p = e; while (p && p !== document.documentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; p = p.parentElement; } return true; };
  const R = (e) => e.getBoundingClientRect();
  const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const overlay = !!document.querySelector('.mg') || document.querySelector('#pause.show');
  if (!overlay) for (const e of document.querySelectorAll('#hud-top > *, #mission, #navbox, #dist, #minimap, #speed, #keys, #radio, .toast, #t-knob, #t-pedals button, #t-btns button, #join-hint, #lazy-ind')) {
    if (!vis(e)) continue; const r = R(e); if (r.width < 2) continue;
    const a = ov(r, {left: C.x0, right: C.x1, top: C.y0, bottom: C.y1});
    if (a > 0) out.cover.push([e.id || e.className, Math.round(a / ((C.x1 - C.x0) * (C.y1 - C.y0)) * 1000) / 10 + '%']);
  }
  // Meldungen über Knöpfen/Minimap?
  const ctrls = [...document.querySelectorAll('#t-btns button, #t-pedals button, #t-knob, #minimap, #radio.show button')].filter(vis);
  for (const m of document.querySelectorAll('.toast, #lazy-ind')) { if (!vis(m)) continue; for (const c of ctrls) if (ov(R(m), R(c)) > 4) out.hits.push([m.id || m.className, c.id || c.dataset.a || c.textContent.trim().slice(0, 10)]); }
  for (const e of document.querySelectorAll('#touch button, #radio button, #pause button, .mg button')) {
    if (!vis(e)) continue; const r = R(e); if (r.width < 1) continue;
    if (r.width < 48 || r.height < 48) out.small.push([(e.id || e.textContent || '').trim().slice(0, 16), Math.round(r.width), Math.round(r.height)]);
  }
  out.small = out.small.slice(0, 8); out.nsmall = out.small.length;
  return JSON.stringify(out);
})()
