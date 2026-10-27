// App-Icon „Hammerpreis“, Variante 2a „Knall“ (MZ, 26.10.2026): gelbe Fläche mit hellen Strahlen und Rasterpunkten in
// Kundenfarbe, weißer Knall-Stern mit schwarzer Kontur und hartem Schatten, das Firmenzeichen („M“) in Kundenfarbe mit
// kleinem hartem Schatten. Maße wie in der Skizze Material/Vorschau/app-icon/icons-farben.html (Symbol „va“, Raster 100).
// Eine Stelle für beide: Material/Skripte/icons-bauen.js (Icons) und start/intro.js (Intro A beginnt mit diesem Icon).
(function (wurzel) {
  'use strict';
  const I = {
    N: 100,
    gelb: '#ffd84a',
    tinte: '#16181d',
    stern: 'M50 2l9 22 22-12-6 24 23 4-19 15 15 19-24-2 1 24-17-17-14 20-4-24-23 7 12-21L2 50l23-8L14 21l24 5z',
    // Stern: Mitte (50|52), Maßstab 0,8, um (−0,5|−1) versetzt; harter Schatten = halb so großer schwarzer Stern dahinter
    sternLage: { x: 49.5, y: 51, s: 0.8, kontur: 3.2 },
    schattenLage: { x: 50, y: 52, s: 0.4 },
    // Zeichen: links oben (26,5|36), Maßstab 0,293 bezogen auf die viewBox des Zeichens (160,7 × 100), Schatten 5 Einheiten
    zeichenLage: { x: 26.5, y: 36, s: 0.293, schatten: 5, kontur: 5 },
    strahlen: ['M50 50L40 -10H60Z', 'M50 50L110 40V60Z', 'M50 50L60 110H40Z', 'M50 50L-10 60V40Z',
      'M50 50L95 -5L105 5Z', 'M50 50L105 95L95 105Z', 'M50 50L5 105L-5 95Z', 'M50 50L-5 5L5 -5Z'],
  };
  function rgba(hex, a) {
    const h = String(hex).replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16) || 0;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  // Teile als SVG-Text (Raster 100). zeichen = { d, vb: [x, y, w, h] } – Pfad des Firmenzeichens.
  I.flaeche = farbe => `<rect width="100" height="100" fill="${I.gelb}"/>` +
    `<g fill="rgba(255,255,255,.45)">${I.strahlen.map(d => `<path d="${d}"/>`).join('')}</g>` +
    `<defs><pattern id="hnRaster" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".9" fill="${rgba(farbe, 0.18)}"/></pattern></defs>` +
    `<rect width="100" height="100" fill="url(#hnRaster)"/>`;
  I.sternSvg = (fuellung, mitSchatten) => {
    const s = I.sternLage, t = I.schattenLage;
    return (mitSchatten === false ? '' : `<path transform="translate(${t.x} ${t.y}) scale(${t.s}) translate(-50 -50)" d="${I.stern}" fill="${I.tinte}"/>`) +
      `<path transform="translate(${s.x} ${s.y}) scale(${s.s}) translate(-50 -50)" d="${I.stern}" fill="${fuellung || '#fff'}" stroke="${I.tinte}" stroke-width="${s.kontur}" stroke-linejoin="round"/>`;
  };
  I.zeichenSvg = (farbe, zeichen) => {
    const z = I.zeichenLage;
    return `<g transform="translate(${z.x} ${z.y}) scale(${z.s}) translate(${-zeichen.vb[0]} ${-zeichen.vb[1]})">` +
      `<path d="${zeichen.d}" fill-rule="evenodd" transform="translate(${z.schatten} ${z.schatten})" fill="${I.tinte}"/>` +
      `<path d="${zeichen.d}" fill-rule="evenodd" fill="${farbe}" stroke="${I.tinte}" stroke-width="${z.kontur}" stroke-linejoin="round"/></g>`;
  };
  I.iconSvg = (farbe, zeichen, ecken) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    (ecken ? `<clipPath id="hnEcke"><rect width="100" height="100" rx="${ecken}"/></clipPath><g clip-path="url(#hnEcke)">` : '') +
    I.flaeche(farbe) + I.sternSvg('#fff') + I.zeichenSvg(farbe, zeichen) + (ecken ? '</g>' : '') + '</svg>';
  // Zeichen aus dem SVG-Text der Datei kunde/zeichen.svg lesen (erster Pfad, viewBox)
  I.zeichenLesen = text => {
    const vb = (/viewBox="([^"]+)"/.exec(text) || [])[1], d = (/<path[^>]*\sd="([^"]+)"/.exec(text) || [])[1];
    return vb && d ? { d, vb: vb.trim().split(/[\s,]+/).map(Number) } : null;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = I;
  else wurzel.HN_ICON = I;
})(typeof window !== 'undefined' ? window : this);
