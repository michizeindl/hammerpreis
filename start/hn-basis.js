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

  // ---------- Rote Knöpfe „Gummi-Hüpfer“: Ruhelage und Platz (v10/v11) ----------
  // ruhelage(el): wo der Knopf ohne seine Animation steht – aus der aktuellen Lage, der Transform-Matrix und transform-origin
  // zurückgerechnet (nur Verschieben/Strecken; bei Drehung die aktuelle Lage).
  function ruhelage(el) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!cs.transform || cs.transform === 'none') return r;
    const m = new DOMMatrixReadOnly(cs.transform);
    if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || !(m.a > 0) || !(m.d > 0)) return r;
    const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
    const L = r.left - ox + m.a * ox - m.e, T = r.top - oy + m.d * oy - m.f;
    return { left: L, top: T, right: L + el.offsetWidth, bottom: T + el.offsetHeight };
  }
  // knopfPlatz(b) (v11, Supervisor: „kein roter Knopf darf beim Hüpfen etwas überdecken“): misst den freien Raum um den Knopf
  // in seiner Ruhelage – bis zu den Nachbarn (Geschwister auf jeder Ebene bis zur Karte, samt Inhalt; Inhalt von Rollbereichen
  // auf deren sichtbaren Ausschnitt beschnitten) und bis zum Innenrand der Karte (Startseite: Fensterrand) – und stellt danach
  // die Größen der Animation ein (CSS-Variablen am Knopf, ohne Messung gelten die vollen Werte der Vorlage):
  //   --kh  Hüpfhöhe (voll 14px), --ky  Strecken nach oben (0–1), --kx  Breitziehen (0–1, voll 1,14-fach; --kxe beim Erscheinen 1,25-fach),
  //   --rt/--rr/--rb/--rl  Ring je Seite (voll 18px).
  // Vorrang hat der Hüpfer; der Ring nimmt, was danach übrig ist. Gemessen bei Beginn jeder Knopf-Animation, jedem Takt
  // (2,2s) und bei Größenänderung – so passt es auch, wenn sich der Inhalt darüber ändert.
  const KARTE = '.hn-karte, .hn-einbl-karte, .hn-rf-karte, .hn-panel';
  const H_VOLL = 14, RING = 18, RING_RAND = 4, RING_SICHTBAR = 0.85, RING_IM_SPRUNG = 0.6, STRECK_X = 0.07, STRECK_Y = 0.12;
  const klemm01 = x => Math.max(0, Math.min(1, x));
  const sichtbarFarbe = c => !!c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);
  function zeichnet(el, cs) {   // malt das Element selbst etwas? (Fläche, Rahmen, Schatten, eigener Text, Bild/Grafik)
    if (el instanceof SVGElement || /^(IMG|CANVAS|VIDEO|INPUT|SELECT|TEXTAREA|PROGRESS)$/.test(el.tagName)) return true;
    if (sichtbarFarbe(cs.backgroundColor) || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none') return true;
    if (['Top', 'Right', 'Bottom', 'Left'].some(s => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && sichtbarFarbe(cs['border' + s + 'Color']))) return true;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }
  function knopfPlatz(b) {
    if (!b || !b.isConnected || !b.getClientRects().length) return;
    const R = ruhelage(b), w = R.right - R.left, h = R.bottom - R.top;
    if (!(w > 0 && h > 0)) return;
    const karte = b.closest(KARTE);
    let C;
    if (karte) {
      const k = karte.getBoundingClientRect();
      C = { left: k.left + karte.clientLeft, top: k.top + karte.clientTop };
      C.right = C.left + karte.clientWidth; C.bottom = C.top + karte.clientHeight;
    } else C = { left: 0, top: 0, right: document.documentElement.clientWidth, bottom: document.documentElement.clientHeight };
    const wurzel = karte || document.body;
    // zwei Sätze Abstände: gerade (Hüpfer geht nur nach oben in Knopfbreite, Breitziehen nur in Knopfhöhe) und für den Ring
    // (wächst rundum, auch schräg)
    const gerade = { oben: R.top - C.top, links: R.left - C.left, rechts: C.right - R.right };
    let oben = R.top - C.top, unten = C.bottom - R.bottom, links = R.left - C.left, rechts = C.right - R.right;
    const reich = RING_RAND + RING;
    function pruefe(o) {
      if (!(o.right > o.left && o.bottom > o.top)) return;
      const ueberX = o.right > R.left && o.left < R.right, ueberY = o.bottom > R.top && o.top < R.bottom;
      const nahX = o.right > R.left - reich && o.left < R.right + reich, nahY = o.bottom > R.top - reich && o.top < R.bottom + reich;
      if (o.bottom <= R.top) { if (ueberX) gerade.oben = Math.min(gerade.oben, R.top - o.bottom); if (nahX) oben = Math.min(oben, R.top - o.bottom); }
      else if (o.top >= R.bottom) { if (nahX) unten = Math.min(unten, o.top - R.bottom); }
      else if (o.right <= R.left) { if (ueberY) gerade.links = Math.min(gerade.links, R.left - o.right); if (nahY) links = Math.min(links, R.left - o.right); }
      else if (o.left >= R.right) { if (ueberY) gerade.rechts = Math.min(gerade.rechts, o.left - R.right); if (nahY) rechts = Math.min(rechts, o.left - R.right); }
      // überlappt die Ruhelage (Hintergrund o. Ä.): zählt nicht
    }
    function sammeln(el, clip) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.position === 'fixed') return;
      let r = el.getBoundingClientRect();
      if (clip) r = { left: Math.max(r.left, clip.left), top: Math.max(r.top, clip.top), right: Math.min(r.right, clip.right), bottom: Math.min(r.bottom, clip.bottom) };
      if (!(r.right > r.left && r.bottom > r.top)) return;
      if (cs.visibility !== 'hidden' && zeichnet(el, cs)) pruefe(r);   // leere Hüllen (Rollbereich, Spalten) zählen nicht, ihr Inhalt schon
      if (el instanceof SVGElement) return;   // Grafik als Ganzes
      const neuClip = cs.overflow !== 'visible' ? r : clip;
      for (const c of el.children) sammeln(c, neuClip);
    }
    for (let n = b; n && n !== wurzel && n.parentElement; n = n.parentElement) {
      for (const s of n.parentElement.children) if (s !== n) sammeln(s, null);
    }
    // Hüpfer zuerst (Oberkante steigt um --kh + Strecken), dann der Ring mit dem Rest (im Sprung ist er erst teilweise sichtbar)
    const hVoll = H_VOLL + STRECK_Y * h;
    const f = klemm01((gerade.oben - 1) / hVoll);
    const seite = Math.min(gerade.links, gerade.rechts) - 1;
    const kx = klemm01(seite / (STRECK_X * w)), kxe = klemm01(seite / (0.125 * w));   // Erscheinen: 1,25-fach
    const ring = platz => Math.max(0, Math.min(RING, (platz - RING_RAND) / RING_SICHTBAR));
    // Ring oben: im Sprung über dem gehobenen Knopf erst teilweise sichtbar
    const rt = Math.min(ring(oben), Math.max(0, Math.min(RING, (gerade.oben - f * hVoll - RING_RAND) / RING_IM_SPRUNG)));
    const st = b.style;
    st.setProperty('--kh', (H_VOLL * f).toFixed(1) + 'px'); st.setProperty('--ky', f.toFixed(3)); st.setProperty('--kx', kx.toFixed(3)); st.setProperty('--kxe', kxe.toFixed(3));
    st.setProperty('--rt', rt.toFixed(1) + 'px'); st.setProperty('--rb', ring(unten).toFixed(1) + 'px');
    st.setProperty('--rl', ring(links).toFixed(1) + 'px'); st.setProperty('--rr', ring(rechts).toFixed(1) + 'px');
    return { oben: gerade.oben, unten, links: gerade.links, rechts: gerade.rechts, ringOben: oben, ringLinks: links, ringRechts: rechts, f, kx, kxe, rt };
  }
  const KNOPF_ANIM = /^(hnKnopfRein|hnKnopfHuepf|hnKnopfRing|knopfRein|knopfHuepf|knopfRing)$/;
  const knopfAnim = ev => { if (KNOPF_ANIM.test(ev.animationName)) knopfPlatz(ev.target); };
  document.addEventListener('animationstart', knopfAnim, true);
  document.addEventListener('animationiteration', knopfAnim, true);
  addEventListener('resize', () => document.querySelectorAll('.hn-kn.haupt, .hn-zuschlag, .spielen').forEach(b => knopfPlatz(b)));

  window.HNB = { K, farben: F, COMIC, rgb, abstufung, mischen, mitAlpha, logoEinbetten, best, figur, figurSetzen,
    statistik, statistikAddieren, bestesViertel, zahl, euro, prozent, vorzeichen, NB, ID, ruhelage, knopfPlatz,
    ruhig: () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[#&]ruhig\b/.test(location.hash) };
})();
