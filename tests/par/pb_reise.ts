// P-B Lauf 5: Testszene Schnellreise ohne Weltaufbau. ?touch → body.touch; ?region=…&x=…&z=… = Standort.
import '../../src/style.css';
import { openTravel } from '../../src/travel';
const q = new URLSearchParams(location.search);
if (q.has('touch')) document.body.classList.add('touch');
document.body.style.background = '#4a6';
const x = +(q.get('x') ?? 300), z = +(q.get('z') ?? 400), region = q.get('region') || 'luzern';
const open = () => openTravel(document.getElementById('ui')!, {
  region, carX: () => x, carZ: () => z, hosp: [-547, -840], canGo: () => null,
  teleport: () => { (window as any).__went = 'teleport'; }, switchTo: (r) => { (window as any).__went = r; }, onClose: () => {},
});
// Karte wird beim Import vorgeladen – kurz warten, dann öffnen (wie im Spiel, wo zwischen Start und «T» Zeit vergeht)
setTimeout(() => { open(); (window as any).__ready = true; }, +(q.get('wait') ?? 800));
