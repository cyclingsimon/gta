// Vor-Ort-Aufgaben als HTML-Overlay. Kein Scheitern: Jeder Fehlversuch ist ein neuer Versuch.
import { sfxPlay } from './audio';
import { hit, pollInput, endFrame } from './input';

type Done = () => void;

function shell(title: string, hint: string) {
  const ov = document.createElement('div');
  ov.className = 'mg';
  ov.innerHTML = `<div class="mg-card"><h2>${title}</h2><p class="mg-hint">${hint}</p><div class="mg-body"></div><p class="mg-msg"></p></div>`;
  document.getElementById('ui')!.appendChild(ov);
  return { ov, body: ov.querySelector('.mg-body') as HTMLElement, msg: ov.querySelector('.mg-msg') as HTMLElement };
}

/** Eigene kleine Eingabeschleife für Gamepad/Tastatur innerhalb der Mini-Spiele */
function loop(fn: () => boolean) {
  const step = () => {
    pollInput();
    const stop = fn();
    endFrame();
    if (!stop) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function finish(ov: HTMLElement, msgEl: HTMLElement, text: string, done: Done) {
  msgEl.textContent = text;
  msgEl.classList.add('ok');
  sfxPlay.good();
  setTimeout(() => { ov.remove(); done(); }, 1500);
}

// ---------- 1: Wärmeflasche-Memory ----------
export function memoryGame(done: Done) {
  const { ov, body, msg } = shell('Bauchweh-Memory', 'Finde die Paare – dann geht es dem Kind gleich besser!');
  const icons = ['🧸', '🍵', '💧', '🛏️'];
  const cards = [...icons, ...icons].sort(() => Math.random() - 0.5);
  body.classList.add('memory');
  const els: HTMLButtonElement[] = [];
  let open: number[] = [];
  let solved = 0, focus = 0, busy = false, finished = false;
  cards.forEach((ic, i) => {
    const b = document.createElement('button');
    b.className = 'card'; b.dataset.i = String(i); b.dataset.k = String(icons.indexOf(ic)); b.textContent = '?';
    b.onclick = () => flip(i);
    body.appendChild(b); els.push(b);
  });
  const flip = (i: number) => {
    if (busy || finished || els[i].classList.contains('done') || open.includes(i)) return;
    sfxPlay.click();
    els[i].textContent = cards[i]; els[i].classList.add('open');
    open.push(i);
    if (open.length === 2) {
      busy = true;
      const [a, b] = open;
      setTimeout(() => {
        if (cards[a] === cards[b]) {
          els[a].classList.add('done'); els[b].classList.add('done'); solved++; sfxPlay.star(0);
          if (solved === icons.length) { finished = true; finish(ov, msg, 'Super! Das Bauchweh ist schon viel besser.', done); }
        } else {
          for (const k of [a, b]) { els[k].textContent = '?'; els[k].classList.remove('open'); }
          msg.textContent = 'Fast! Probier nochmal.';
        }
        open = []; busy = false;
      }, 750);
    }
  };
  const paint = () => els.forEach((e, i) => e.classList.toggle('focus', i === focus));
  paint();
  loop(() => {
    if (hit('left')) focus = (focus + 7) % 8;
    if (hit('right')) focus = (focus + 1) % 8;
    if (hit('up')) focus = (focus + 4) % 8;
    if (hit('down')) focus = (focus + 4) % 8;
    if (hit('confirm')) flip(focus);
    paint();
    return finished;
  });
}

// ---------- 2: Pflaster kleben ----------
export function plasterGame(done: Done) {
  const { ov, body, msg } = shell('Pflaster kleben', 'Klebe ein Pflaster auf jede leuchtende Aua-Stelle.');
  const spots = [[95, 120], [160, 95], [130, 165]];
  body.innerHTML = `<svg viewBox="0 0 300 260" class="knee">
    <path d="M60 20 C40 90 60 150 90 200 L120 250 L190 250 L170 190 C150 140 160 80 150 20 Z" fill="#F2C7A5" stroke="#3b302b" stroke-width="5"/>
    <path d="M60 20 L150 20 L148 60 L62 60 Z" fill="#0E73BA" stroke="#3b302b" stroke-width="5"/>
    <ellipse cx="128" cy="135" rx="38" ry="28" fill="#EDB894" opacity=".6"/>
    ${spots.map(([x, y], i) => `<g class="spot" data-i="${i}" transform="translate(${x} ${y})"><circle r="17" fill="#FFB347" opacity=".85"/><circle r="9" fill="#FFE08A"/></g>`).join('')}
  </svg>`;
  const svg = body.querySelector('svg')!;
  const placed = new Set<number>();
  let focus = 0, finished = false;
  const place = (i: number) => {
    if (placed.has(i) || finished) return;
    placed.add(i); sfxPlay.pop();
    const [x, y] = spots[i];
    svg.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y}) rotate(${-20 + i * 25})"><rect x="-26" y="-10" width="52" height="20" rx="9" fill="#F3D9B1" stroke="#3b302b" stroke-width="3"/><rect x="-9" y="-7" width="18" height="14" rx="3" fill="#FFF6DE"/></g>`);
    (svg.querySelector(`.spot[data-i="${i}"]`) as SVGElement).style.display = 'none';
    if (placed.size === spots.length) { finished = true; finish(ov, msg, 'Perfekt verarztet! Jetzt sanft ins Kinderspital.', done); }
  };
  svg.querySelectorAll('.spot').forEach((s) => s.addEventListener('click', () => place(Number((s as SVGElement).dataset.i))));
  const paint = () => svg.querySelectorAll('.spot').forEach((s, i) => (s as SVGElement).classList.toggle('focus', i === focus));
  paint();
  loop(() => {
    if (hit('left') || hit('up')) focus = (focus + spots.length - 1) % spots.length;
    if (hit('right') || hit('down')) focus = (focus + 1) % spots.length;
    if (hit('confirm')) place(focus);
    while (placed.has(focus) && placed.size < spots.length) focus = (focus + 1) % spots.length;
    paint();
    return finished;
  });
}

// ---------- 3: Katze vom Baum ----------
export function catGame(done: Done) {
  const { ov, body, msg } = shell('Katze vom Baum holen', 'Stelle die Leiter an den Ast (← →), dann bestätige. Danach die Katze locken!');
  body.innerHTML = `<svg viewBox="0 -14 320 274" class="tree">
    <rect x="200" y="60" width="26" height="200" fill="#7A5638" stroke="#3b302b" stroke-width="4"/>
    <circle cx="213" cy="60" r="62" fill="#6FA95C" stroke="#3b302b" stroke-width="4"/>
    <path d="M200 120 L150 108" stroke="#7A5638" stroke-width="10" stroke-linecap="round"/>
    <rect x="128" y="96" width="34" height="10" fill="#9BE07A" opacity=".55" class="zone"/>
    <g class="cat" transform="translate(150 96)"><ellipse rx="13" ry="9" fill="#F39204" stroke="#3b302b" stroke-width="3"/><circle cx="-10" cy="-9" r="8" fill="#F39204" stroke="#3b302b" stroke-width="3"/><path d="M-16 -15 L-14 -23 L-9 -16 M-6 -16 L-3 -23 L-1 -14" fill="#F39204" stroke="#3b302b" stroke-width="2"/></g>
    <g class="ladder" transform="translate(60 250) rotate(4)"><rect x="-4" y="-170" width="6" height="170" fill="#BFC5CB" stroke="#3b302b" stroke-width="2"/><rect x="22" y="-170" width="6" height="170" fill="#BFC5CB" stroke="#3b302b" stroke-width="2"/>${Array.from({ length: 8 }, (_, i) => `<rect x="0" y="${-160 + i * 20}" width="24" height="4" fill="#BFC5CB"/>`).join('')}</g>
  </svg>
  <div class="mg-buttons"><button class="b-left">◀</button><button class="b-ok">Passt!</button><button class="b-right">▶</button></div>`;
  const ladder = body.querySelector('.ladder') as SVGGElement;
  const cat = body.querySelector('.cat') as SVGGElement;
  let angle = 4, phase = 0, calls = 0, finished = false;
  const target = 32; // Grad: Leiterspitze am Ast
  const setA = () => ladder.setAttribute('transform', `translate(60 250) rotate(${angle})`);
  const ok = () => {
    if (finished) return;
    if (phase === 0) {
      if (Math.abs(angle - target) <= 6) { phase = 1; sfxPlay.good(); msg.textContent = 'Die Leiter steht! Jetzt die Katze locken (Passt!-Knopf / A).'; (body.querySelector('.b-ok') as HTMLButtonElement).textContent = 'Miau!'; }
      else msg.textContent = angle > target ? 'Noch etwas steiler (◀)!' : 'Etwas flacher (▶)!';
    } else {
      calls++; sfxPlay.pop();
      const t = calls / 3;
      cat.setAttribute('transform', `translate(${150 - t * 70} ${96 + t * 140})`);
      if (calls >= 3) { finished = true; finish(ov, msg, 'Gerettet! Die Katze schnurrt.', done); }
      else msg.textContent = ['Miau? Sie kommt!', 'Noch einmal locken!'][calls - 1];
    }
  };
  (body.querySelector('.b-left') as HTMLButtonElement).onclick = () => { angle = Math.max(-10, angle - 3); setA(); sfxPlay.click(); };
  (body.querySelector('.b-right') as HTMLButtonElement).onclick = () => { angle = Math.min(45, angle + 3); setA(); sfxPlay.click(); };
  (body.querySelector('.b-ok') as HTMLButtonElement).onclick = ok;
  loop(() => {
    if (phase === 0 && hit('left')) { angle = Math.max(-10, angle - 3); setA(); }
    if (phase === 0 && hit('right')) { angle = Math.min(45, angle + 3); setA(); }
    if (hit('confirm')) ok();
    return finished;
  });
}

// ---------- 4: Wasser bringen (Schwindel) ----------
export function waterGame(done: Done) {
  const { ov, body, msg } = shell('Schattenplatz finden', 'Wähle den kühlen Schattenplatz und gib einen Becher Wasser.');
  const opts = [['☀️', 'In der Sonne', false], ['🌳', 'Unter dem Baum', true], ['🔥', 'Neben dem Grill', false]] as const;
  body.classList.add('choice');
  let focus = 0, finished = false;
  const els = opts.map(([ic, t, good], i) => {
    const b = document.createElement('button'); b.className = 'card wide'; b.innerHTML = `<span>${ic}</span><small>${t}</small>`;
    b.onclick = () => choose(i); body.appendChild(b); return b;
  });
  const choose = (i: number) => {
    if (finished) return;
    if (opts[i][2]) { finished = true; finish(ov, msg, 'Schön kühl hier – und ein Becher Wasser dazu!', done); }
    else { msg.textContent = 'Hmm, da ist es zu heiss. Wo ist es kühler?'; sfxPlay.click(); }
  };
  loop(() => {
    if (hit('left')) focus = (focus + 2) % 3;
    if (hit('right')) focus = (focus + 1) % 3;
    if (hit('confirm')) choose(focus);
    els.forEach((e, i) => e.classList.toggle('focus', i === focus));
    return finished;
  });
}

// ---------- 5: Fieber messen ----------
export function thermoGame(done: Done) {
  const { ov, body, msg } = shell('Fieber messen', 'Das Thermometer steigt und sinkt. Drück «Jetzt!» (A), wenn die Anzeige im grünen Bereich ist.');
  body.innerHTML = `<svg viewBox="0 0 120 260" class="thermo">
    <rect x="45" y="10" width="30" height="200" rx="15" fill="#fff" stroke="#3b302b" stroke-width="5"/>
    <rect x="47" y="70" width="26" height="36" fill="#9BE07A" opacity=".8" class="zone"/>
    <rect x="52" y="200" width="16" height="10" fill="#E94B3C" class="level"/>
    <circle cx="60" cy="225" r="25" fill="#E94B3C" stroke="#3b302b" stroke-width="5"/>
  </svg><div class="mg-buttons"><button class="b-ok">Jetzt!</button></div>`;
  const level = body.querySelector('.level') as SVGRectElement;
  let v = 0.1, dir = 1, hits = 0, finished = false, last = performance.now();
  const zoneLo = 0.55, zoneHi = 0.73; // Anteil der Säulenhöhe (grüner Bereich)
  const ok = () => {
    if (finished) return;
    if (v >= zoneLo - 0.05 && v <= zoneHi + 0.05) {
      hits++; sfxPlay.star(0);
      if (hits >= 2) { finished = true; finish(ov, msg, 'Gemessen! Etwas Fieber – Luksi weiss, was zu tun ist.', done); }
      else msg.textContent = 'Gut! Zur Sicherheit noch einmal messen.';
    } else { msg.textContent = v < zoneLo ? 'Etwas zu früh – warte, bis es im Grünen ist.' : 'Etwas zu spät – gleich kommt es wieder.'; sfxPlay.click(); }
  };
  (body.querySelector('.b-ok') as HTMLButtonElement).onclick = ok;
  loop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    v += dir * dt * 0.32; // gemächlich, damit auch kleine Kinder treffen if (v > 0.95) { v = 0.95; dir = -1; } if (v < 0.05) { v = 0.05; dir = 1; }
    const h = v * 190; level.setAttribute('y', String(205 - h)); level.setAttribute('height', String(h + 5));
    if (hit('confirm')) ok();
    return finished;
  });
}

// ---------- 6: Verband wickeln ----------
export function bandageGame(done: Done) {
  const { ov, body, msg } = shell('Verband wickeln', 'Wickle den Verband von oben nach unten: tippe auf die leuchtende Stelle (oder A).');
  const n = 5;
  body.innerHTML = `<svg viewBox="30 25 240 125" class="arm">
    <path d="M40 60 L250 40 L262 110 L52 140 Z" fill="#F2C7A5" stroke="#3b302b" stroke-width="5"/>
    ${Array.from({ length: n }, (_, i) => { const x = 80 + i * 32; return `<g class="seg" data-i="${i}"><rect x="${x}" y="${50 - i * 3}" width="30" height="${88 - i * 2}" rx="6" fill="#FFB347" opacity=".55"/></g>`; }).join('')}
  </svg>`;
  const svg = body.querySelector('svg')!;
  let next = 0, finished = false;
  const segs = Array.from(svg.querySelectorAll('.seg')) as SVGGElement[];
  const paint = () => segs.forEach((s, i) => s.classList.toggle('focus', i === next));
  const wrap = (i: number) => {
    if (finished) return;
    if (i !== next) { msg.textContent = 'Schön der Reihe nach – die leuchtende Stelle zuerst.'; sfxPlay.click(); return; }
    const r = segs[i].querySelector('rect')!; r.setAttribute('fill', '#FFFFFF'); r.setAttribute('opacity', '1'); r.setAttribute('stroke', '#3b302b'); r.setAttribute('stroke-width', '3');
    sfxPlay.pop(); next++; paint();
    if (next >= n) { finished = true; finish(ov, msg, 'Der Verband sitzt perfekt!', done); }
  };
  segs.forEach((s, i) => s.addEventListener('click', () => wrap(i)));
  paint();
  loop(() => { if (hit('confirm')) wrap(next); return finished; });
}

// ---------- 7: Trösten ----------
export function comfortGame(done: Done) {
  const { ov, body, msg } = shell('Trösten', 'Das Kind hat sich erschreckt. Wähle zwei Dinge, die trösten.');
  const opts = [['🧸', 'Teddybär', true], ['🌶️', 'Scharfe Chili', false], ['⭐', 'Mut-Kleber', true], ['📖', 'Geschichte', true]] as const;
  body.classList.add('choice');
  let focus = 0, got = 0, finished = false; const used = new Set<number>();
  const els = opts.map(([ic, t], i) => { const b = document.createElement('button'); b.className = 'card wide'; b.innerHTML = `<span>${ic}</span><small>${t}</small>`; b.onclick = () => choose(i); body.appendChild(b); return b; });
  const choose = (i: number) => {
    if (finished || used.has(i)) return;
    if (!opts[i][2]) { msg.textContent = 'Hihi, das ist zu scharf! Was tröstet besser?'; sfxPlay.click(); return; }
    used.add(i); els[i].classList.add('done'); got++; sfxPlay.star(0);
    if (got >= 2) { finished = true; finish(ov, msg, 'Das Kind lächelt wieder!', done); } else msg.textContent = 'Schön! Noch etwas?';
  };
  loop(() => {
    if (hit('left')) focus = (focus + 3) % 4;
    if (hit('right')) focus = (focus + 1) % 4;
    if (hit('confirm')) choose(focus);
    els.forEach((e, i) => e.classList.toggle('focus', i === focus));
    return finished;
  });
}
