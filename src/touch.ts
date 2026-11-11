// Touch-Steuerung für Smartphone/Tablet: links lenken (Daumen ziehen), rechts Gas/Bremse, Knöpfe für Blaulicht & Co.
import { touch, touchPress, type Action } from './input';

export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export function setupTouch() {
  if (!isTouchDevice()) return;
  touch.active = true;
  document.body.classList.add('touch');
  const el = document.createElement('div'); el.id = 'touch';
  el.innerHTML = `
    <div id="t-steer"><div id="t-knob"></div><span>lenken</span></div>
    <div id="t-pedals"><button id="t-brake">◀︎ Bremse</button><button id="t-gas">Gas ▲</button></div>
    <div id="t-btns">
      <button data-a="siren" title="Blaulicht">🚨</button><button data-a="horn" title="Hupe">📯</button>
      <button data-a="accept" title="Einsatz annehmen">✅</button><button data-a="camera" title="Kamera">🎥</button>
      <button data-a="map" title="Karte">🗺️</button><button data-a="reset" title="Zurück auf die Strasse">↩️</button>
      <button data-a="pause" title="Pause">⏸</button>
    </div>`;
  document.getElementById('ui')!.appendChild(el);
  const steer = el.querySelector('#t-steer') as HTMLElement, knob = el.querySelector('#t-knob') as HTMLElement;
  let sid = -1, x0 = 0;
  steer.addEventListener('pointerdown', (e) => { sid = e.pointerId; x0 = e.clientX; try { steer.setPointerCapture(sid); } catch { /* synthetisch */ } e.preventDefault(); });
  steer.addEventListener('pointermove', (e) => {
    if (e.pointerId !== sid) return;
    const d = Math.max(-1, Math.min(1, (e.clientX - x0) / 70));
    touch.steer = d; knob.style.transform = `translateX(${d * 55}px)`;
  });
  const endSteer = (e: PointerEvent) => { if (e.pointerId !== sid) return; sid = -1; touch.steer = 0; knob.style.transform = ''; };
  steer.addEventListener('pointerup', endSteer); steer.addEventListener('pointercancel', endSteer);
  const hold = (id: string, k: 'throttle' | 'brake') => {
    const b = el.querySelector(id) as HTMLElement;
    b.addEventListener('pointerdown', (e) => { touch[k] = 1; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch { /* synthetisch */ } e.preventDefault(); });
    const up = () => { touch[k] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };
  hold('#t-gas', 'throttle'); hold('#t-brake', 'brake');
  el.querySelectorAll('#t-btns button').forEach((b) => b.addEventListener('pointerdown', (e) => { touchPress((b as HTMLElement).dataset.a as Action); e.preventDefault(); }));
}

/** Vollbild + Querformat (nur nach Nutzergeste möglich) */
export async function goFullscreen() {
  if (!isTouchDevice()) return;
  try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' } as any); } catch { /* nicht erlaubt */ }
  try { await (screen.orientation as any)?.lock?.('landscape'); } catch { /* nicht unterstützt */ }
}
