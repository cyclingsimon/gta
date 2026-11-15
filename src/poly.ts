// P-C D1: Safari < 16 kennt roundRect nicht – ohne Rückfall startet das Spiel dort nicht. Rückfall: einfaches Rechteck.
const P: any = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype : null;
if (P && !P.roundRect) P.roundRect = function (x: number, y: number, w: number, h: number) { this.rect(x, y, w, h); };
export {};
