// Gemeinsame Helfer der Sammlung „Hammerpreis“ für Startseite und Spiel: Farben als CSS-Variablen (Kundenfarbe aus kunde.js,
// Gelb/Rot als feste Comic-Farben), Logo einbetten, Bestwert, Statistik, Figurenwahl, Zahlen-Schreibweise.
// Braucht kunde/kunde.js (window.KUNDE), optional start/hn-figuren.js.
(function () {
  'use strict';
  const K = window.KUNDE || {};
  const F = Object.assign({ haupt: '#1F2F4F', hauptText: '#ffffff' }, K.farben);
  // Feste Comic-Farben (MZ, 26.10.2026: Gelb und Rot bleiben, nur Schild/Schrift in Kundenfarbe)
  const COMIC = { gelb: '#ffd84a', gelbHell: '#ffe27a', rot: '#e8453c', tinte: '#16181d' };

  function rgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const abstufung = (h, f) => hex(rgb(h).map(v => v * f));
  const mischen = (h, w) => hex(rgb(h).map(v => v + (255 - v) * w));
  const mitAlpha = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

  const wurzel = document.documentElement.style;
  wurzel.setProperty('--haupt', F.haupt);
  wurzel.setProperty('--haupt-hell', mischen(F.haupt, 0.25));
  wurzel.setProperty('--haupt-dunkel', abstufung(F.haupt, 0.75));
  wurzel.setProperty('--haupt-blass', mischen(F.haupt, 0.86));
  wurzel.setProperty('--haupt-raster', mitAlpha(F.haupt, 0.2));
  wurzel.setProperty('--haupt-text', F.hauptText || '#fff');
  wurzel.setProperty('--gelb', COMIC.gelb);
  wurzel.setProperty('--gelb-hell', COMIC.gelbHell);
  wurzel.setProperty('--rot', COMIC.rot);
  wurzel.setProperty('--tinte', COMIC.tinte);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', F.haupt);
  if (window.HN_FIGUREN) window.HN_FIGUREN.setzeKundenfarbe(F.haupt);

  // Logo als eingebettetes SVG (Farben per --mf-zeichen/--mf-schrift, Gruppen #zeichen/#schriftzug fürs Intro).
  // Nur echtes SVG ohne Skript; über file:// oder bei Fehlern als <img>. ids: true = ids behalten (nur einmal je Seite).
  const svgTexte = {};
  function logoText(adresse) {
    if (!svgTexte[adresse]) {
      svgTexte[adresse] = location.protocol === 'file:' ? Promise.resolve(null)
        : fetch(adresse).then(r => r.ok ? r.text() : null).catch(() => null);
    }
    return svgTexte[adresse];
  }
  function logoEinbetten(platz, adresse, opt) {
    opt = opt || {};
    return logoText(adresse).then(t => {
      const sauber = t && /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(t) && !/<script|on\w+\s*=|javascript:/i.test(t);
      platz.textContent = '';
      if (sauber) {
        platz.innerHTML = t.replace(/^\s*<\?xml[^>]*>\s*/, '').replace(/<title>[\s\S]*?<\/title>/, '');
        const svg = platz.querySelector('svg');
        if (!opt.ids) platz.querySelectorAll('[id]').forEach(e => { e.setAttribute('data-teil', e.id); e.removeAttribute('id'); });
        if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.removeAttribute('width'); svg.removeAttribute('height'); }
        return svg;
      }
      const img = document.createElement('img');
      img.src = adresse; img.alt = '';
      platz.append(img);
      return img;
    });
  }

  // ---------- Speicher (localStorage, Präfix mg:) ----------
  const firma = K.firma || '';
  const lesen = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const schreiben = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privat */ } };
  // Bestwert wie der Rahmen ihn speichert (mg:best:<id>:<firma>); 0 Punkte zählen nie
  const ID = 'hammerpreis';
  function best() { const v = lesen('mg:best:' + ID + ':' + firma); return v == null ? null : +v; }
  // Figurenwahl Maklerin/Makler
  const FIGUR = 'mg:hammerpreis:figur:' + firma;
  function figur() { const f = lesen(FIGUR); return f === 'makler' ? 'makler' : 'maklerin'; }
  function figurSetzen(f) { schreiben(FIGUR, f === 'makler' ? 'makler' : 'maklerin'); }
  // Statistik nur aus echten, abgeschlossenen Durchgängen (kein Abbruch, keine Testhilfe):
  // { durchgaenge, verkauft, provision, besteAbw (%), viertel: { <Name>: { verkauft, provision } } }
  const STAT = 'mg:hammerpreis:statistik:' + firma;
  function statistik() {
    let s = null;
    try { s = JSON.parse(lesen(STAT) || 'null'); } catch (e) { s = null; }
    return Object.assign({ durchgaenge: 0, verkauft: 0, provision: 0, besteAbw: null, viertel: {} }, s || {});
  }
  // durchgang = { verkauft: [{ viertel, provision, abw }], provision }
  function statistikAddieren(d) {
    const s = statistik();
    s.durchgaenge++;
    d.verkauft.forEach(v => {
      s.verkauft++;
      s.provision += v.provision;
      if (s.besteAbw == null || v.abw < s.besteAbw) s.besteAbw = v.abw;
      const q = s.viertel[v.viertel] || (s.viertel[v.viertel] = { verkauft: 0, provision: 0 });
      q.verkauft++; q.provision += v.provision;
    });
    s.provision += d.bonus || 0;
    schreiben(STAT, JSON.stringify(s));
    return s;
  }
  // bestes Viertel = Viertel mit der höchsten Provision insgesamt (Vorschlag Developer)
  function bestesViertel(s) {
    let b = null;
    Object.keys(s.viertel || {}).forEach(n => { if (!b || s.viertel[n].provision > s.viertel[b].provision) b = n; });
    return b;
  }

  // ---------- Schreibweise ----------
  const NB = ' ';
  const zahl = n => Math.round(n).toLocaleString('de-DE');
  const euro = n => zahl(n) + NB + '€';
  const prozent = (p, stellen) => (stellen == null ? 1 : stellen) === 0 ? zahl(p) + NB + '%'
    : p.toFixed(stellen == null ? 1 : stellen).replace('.', ',') + NB + '%';
  const vorzeichen = p => (p > 0 ? '+' : p < 0 ? '−' : '±') + prozent(Math.abs(p), 0);

  window.HNB = { K, farben: F, COMIC, rgb, abstufung, mischen, mitAlpha, logoEinbetten, best, figur, figurSetzen,
    statistik, statistikAddieren, bestesViertel, zahl, euro, prozent, vorzeichen, NB, ID,
    ruhig: () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[#&]ruhig\b/.test(location.hash) };
})();
