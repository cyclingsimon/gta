// P-B Oberfläche: kleine Zusätze ohne Eingriff in main.ts. Wird (vorläufig) aus src/travel.ts importiert,
// damit es ohne Einbau läuft; Einbau-Hinweis in docs/par/oberflaeche.md (Import nach main.ts verschieben).
import { setupLoadSteps } from './loadSteps';

let done = false;
export function setupUi() {
  if (done) return; done = true;
  setupLoadSteps();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupUi, { once: true }); else setupUi();
