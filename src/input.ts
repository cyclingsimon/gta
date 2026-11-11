// Tastatur + bis zu 4 Gamepads + Touch, je Spieler ein Steuerzustand.
// Spieler 1: Tastatur, Touch und Gamepad 1. Spieler 2–4: Gamepad 2–4.
export interface Controls {
  throttle: number; // 0..1
  brake: number;    // 0..1 (bremsen / rückwärts)
  steer: number;    // -1..1 (links negativ)
}

const keys = new Set<string>();
const pressed = new Set<string>(); // Flanken (einmalig pro Druck)

window.addEventListener('keydown', (e) => {
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// Gamepad-Knöpfe (Standard-Mapping)
const GP = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
interface PadState { id: string; now: boolean[]; prev: boolean[]; axes: number[]; trig: number[] }
let pads: PadState[] = [];
const prevById = new Map<string, boolean[]>();
export let gamepadName = '';

/** Anzahl verbundener Gamepads */
export function padCount() { return pads.length; }

export function pollInput() {
  const raw = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter((p): p is Gamepad => !!p && p.connected);
  pads = raw.slice(0, 4).map((p, i) => {
    const key = p.index + ':' + p.id;
    const now = p.buttons.map((b) => b.pressed);
    const prev = prevById.get(key) || [];
    prevById.set(key, now);
    void i;
    return { id: p.id, now, prev, axes: p.axes.slice(0, 4).map((a) => (Math.abs(a) < 0.15 ? 0 : a)), trig: [p.buttons[GP.LT]?.value || 0, p.buttons[GP.RT]?.value || 0] };
  });
  gamepadName = pads[0]?.id || '';
}

function gpEdge(p: PadState | undefined, i: number) { return !!p && !!p.now[i] && !p.prev[i]; }

export type Action = 'siren' | 'horn' | 'reset' | 'camera' | 'map' | 'pause' | 'mute' | 'accept' | 'photo' | 'fps' | 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'join';

const KEYMAP: Record<Action, string[]> = {
  siren: ['Space'], horn: ['KeyH'], reset: ['KeyR'], camera: ['KeyC'], map: ['Tab'],
  pause: ['Escape', 'KeyP'], mute: ['KeyM'], accept: ['KeyE', 'Enter'], photo: [], fps: ['F3'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space', 'KeyE'], back: ['Escape', 'Backspace'], join: [],
};
const PADMAP: Record<Action, number[]> = {
  siren: [GP.A], horn: [GP.B], reset: [GP.Y], camera: [GP.RS, GP.RB], map: [GP.BACK], pause: [GP.START],
  mute: [], accept: [GP.X], photo: [], fps: [],
  up: [GP.UP], down: [GP.DOWN], left: [GP.LEFT], right: [GP.RIGHT], confirm: [GP.A], back: [GP.B, GP.START], join: [GP.START, GP.A],
};

// Touch-Knöpfe (von touch.ts gesetzt)
const touchEdges = new Set<Action>();
export const touch = { active: false, steer: 0, throttle: 0, brake: 0 };
export function touchPress(a: Action) { touchEdges.add(a); }

/** true genau einmal pro Druck – irgendein Gerät (für Menüs) */
export function hit(a: Action): boolean {
  return KEYMAP[a].some((k) => pressed.has(k)) || pads.some((p) => PADMAP[a].some((b) => gpEdge(p, b))) || touchEdges.has(a);
}

/** true genau einmal pro Druck – nur Geräte von Spieler i */
export function hitP(i: number, a: Action): boolean {
  if (i === 0 && (KEYMAP[a].some((k) => pressed.has(k)) || touchEdges.has(a))) return true;
  return PADMAP[a].some((b) => gpEdge(pads[i], b));
}

/** Gamepad k hat einen Beitritts-Knopf gedrückt */
export function padJoin(k: number) { return PADMAP.join.some((b) => gpEdge(pads[k], b)); }

export function endFrame() {
  pressed.clear(); touchEdges.clear();
}

export function readControls(i = 0): Controls {
  let steer = 0, throttle = 0, brake = 0;
  if (i === 0) {
    const kUp = keys.has('KeyW') || keys.has('ArrowUp');
    const kDown = keys.has('KeyS') || keys.has('ArrowDown');
    const kL = keys.has('KeyA') || keys.has('ArrowLeft');
    const kR = keys.has('KeyD') || keys.has('ArrowRight');
    steer = (kR ? 1 : 0) - (kL ? 1 : 0);
    throttle = kUp ? 1 : 0; brake = kDown ? 1 : 0;
    if (touch.active) { if (touch.steer) steer = touch.steer; throttle = Math.max(throttle, touch.throttle); brake = Math.max(brake, touch.brake); }
  }
  const p = pads[i];
  if (p) {
    if (p.axes[0]) steer = p.axes[0];
    if (p.now[GP.LEFT]) steer = -1; if (p.now[GP.RIGHT]) steer = 1;
    throttle = Math.max(throttle, p.trig[1]);
    brake = Math.max(brake, p.trig[0]);
  }
  return { throttle, brake, steer };
}
