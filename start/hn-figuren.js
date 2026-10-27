// Comic-Figuren: gestaltete Bilder (Phase 3) mit Zeichnung aus Code als Rückfall – Maklerin, Makler, Konkurrenz (Benno Prunk),
// Eigentümer und Käufer, gleich auf der Startseite, im Start-/Endbild und im Spiel. Mimik: neutral, freut, zweifelt, aergert,
// staunt (fehlt eine, gilt neutral). Bilder: bilder/figuren/<bild>-<mimik>.webp, <bild> = maklerin, makler, konkurrenz,
// eigentuemerin-1…5, eigentuemer-1…5, kaeufer-<typ>-1|2 (zwei Besetzungen je Typ). Ausschnitt: Material/Skripte/bilder-schneiden.py.
// Maklerin/Makler: Blazer im Bild reines Grün #00FF00, wird zur Kundenfarbe umgefärbt (einmal, dann zwischengespeichert).
(function () {
  'use strict';
  const T = '#16181d';
  const vorlagen = {
    maklerin: { haar: '#8a5a3a', frisur: 'lang', haut: '#f6cfaa', kleid: 'kunde', kragen: 'bluse' },
    makler: { haar: '#4a3426', frisur: 'kurz', haut: '#f6cfaa', kleid: 'kunde', kragen: 'krawatte' },
    // Benno Prunk (Prunk & Partner, MZ 26.10.2026): zurückgegelte graue Haare, senfgelbes Sakko (wie im Auftrag an den Graphic Artist)
    konkurrenz: { haar: '#b9b9b9', frisur: 'gel', haut: '#efc29a', kleid: '#d4a020', kragen: 'krawatte', krawatte: '#8a2f6a' },
  };
  let kundenFarbe = '#1F2F4F';

  function mund(m) {
    switch (m) {
      case 'freut': return `<path d="M24.6 32.2q5.4 6.8 10.8 0z" fill="#7a2b2b" stroke="${T}" stroke-width="1.8" stroke-linejoin="round"/><path d="M26.6 33.4q3.4 1.2 6.8 0" stroke="#fff" stroke-width="1.4" fill="none"/>`;
      case 'zweifelt': return `<path d="M26 34.4q2-1.4 4 0t4.2-.8" stroke="${T}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'aergert': return `<path d="M26 35.4q4-3.2 8 0" stroke="${T}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      case 'staunt': return `<ellipse cx="30" cy="34.2" rx="1.9" ry="2.3" fill="#7a2b2b" stroke="${T}" stroke-width="1.6"/>`;
      default: return `<path d="M26.4 33.2q3.6 2.6 7.2 0" stroke="${T}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
  }
  function augen(m, f) {
    if (f.sonnenbrille) return `<path d="M21.5 26h17v1.6q-.4 3.4-3.6 3.4h-2.4q-2.5 0-3-2.6-.5 2.6-3 2.6h-2.4q-3.2 0-3.6-3.4z" fill="${T}"/><path d="M23 27.2l2.2 0" stroke="#fff" stroke-width=".9" opacity=".7"/>`;
    let a;
    if (m === 'freut') a = `<path d="M24.2 28.6q1.8-2.2 3.6 0M32.2 28.6q1.8-2.2 3.6 0" stroke="${T}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
    else if (m === 'staunt') a = `<circle cx="26" cy="28" r="2.1" fill="#fff" stroke="${T}" stroke-width="1.2"/><circle cx="34" cy="28" r="2.1" fill="#fff" stroke="${T}" stroke-width="1.2"/><circle cx="26" cy="28" r="1" fill="${T}"/><circle cx="34" cy="28" r="1" fill="${T}"/>`;
    else a = `<circle cx="26" cy="28" r="1.6" fill="${T}"/><circle cx="34" cy="28" r="1.6" fill="${T}"/>`;
    // Brauen je Mimik
    const b = m === 'zweifelt' ? 'M23.6 24.8l4-.9M32.4 22.6l4 1.8' : m === 'aergert' ? 'M23.6 23.6l4 1.6M36.4 23.6l-4 1.6'
      : m === 'staunt' ? 'M23.8 23.2q2-1.4 4 0M32.2 23.2q2-1.4 4 0' : 'M24 24.4q2-1 4 0M32 24.4q2-1 4 0';
    a += `<path d="${b}" stroke="${T}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    if (f.brille) a += `<g fill="none" stroke="${T}" stroke-width="1.3"><circle cx="26" cy="28" r="3.6"/><circle cx="34" cy="28" r="3.6"/><path d="M29.6 28h.8M22.4 27.4l-2.6-.8M37.6 27.4l2.6-.8"/></g>`;
    if (m === 'freut') a += `<circle cx="22.8" cy="31.4" r="1.7" fill="#f29b9b" opacity=".7"/><circle cx="37.2" cy="31.4" r="1.7" fill="#f29b9b" opacity=".7"/>`;
    return a;
  }
  function haarHinten(f) {
    if (f.frisur === 'lang') return `<path d="M15 34c-3-15 4-25 15-25s18 10 15 25c-1 5-4 9-4 9H19s-3-4-4-9z" fill="${f.haar}"/>`;
    if (f.frisur === 'zopf') return `<path d="M39 18c7 2 9 10 6 18-1 3-3 4-4 4 1-6 0-12-4-16z" fill="${f.haar}"/>`;
    if (f.frisur === 'dutt') return `<circle cx="30" cy="13.5" r="5.2" fill="${f.haar}"/>`;
    if (f.frisur === 'locken') return `<g fill="${f.haar}"><circle cx="19.5" cy="22" r="5"/><circle cx="40.5" cy="22" r="5"/><circle cx="19" cy="30" r="4.4"/><circle cx="41" cy="30" r="4.4"/></g>`;
    return '';
  }
  function haarVorn(f) {
    switch (f.frisur) {
      case 'lang': return `<path d="M20 24c3-7 13-9 20-2-6 0-13-1-20 2z" fill="${f.haar}"/>`;
      case 'zopf': case 'dutt': return `<path d="M19.6 25c0-8 5-12 10.4-12s10.6 4 10.4 12c-4-5-8-6-10.4-6s-6.6 1-10.4 6z" fill="${f.haar}"/>`;
      case 'locken': return `<g fill="${f.haar}"><circle cx="23" cy="17.5" r="4.6"/><circle cx="30" cy="15.6" r="4.8"/><circle cx="37" cy="17.5" r="4.6"/></g>`;
      case 'glatze': return `<path d="M19.6 27.5c-.6-3 .4-5.6 2.2-7M40.4 27.5c.6-3-.4-5.6-2.2-7" stroke="${f.haar}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
      case 'gel': return `<path d="M19 24c-1-9 5-14 12-14 5 0 11 3 10 12-3-3-7-6-12-6-4 0-7 3-10 8z" fill="${f.haar}"/><path d="M27 13.6q5-1.2 9 1.8" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/>`;
      default: return `<path d="M19 24c-1-9 5-14 11-14s13 4 11 14c-3-5-6-7-11-7s-8 2-11 7z" fill="${f.haar}"/>`;
    }
  }
  function bart(f) {
    if (f.bart === 'voll') return `<path d="M20.6 30q.4 11 9.4 11t9.4-11q-2.4 4.4-5 4.4-1.8-2.4-4.4-2.4t-4.4 2.4q-2.6 0-5-4.4z" fill="${f.haar}"/>`;
    if (f.bart === 'schnurr') return `<path d="M24.8 32.6q5.2-3.4 10.4 0-2.6 1.4-5.2-.4-2.6 1.8-5.2.4z" fill="${f.haar}"/>`;
    return '';
  }
  function kragen(f, kleid) {
    if (f.kragen === 'krawatte') return `<path d="M25 43l5 6 5-6z" fill="#fff"/><path d="M28.6 47.6h2.8l1.6 10.4h-6z" fill="${f.krawatte || '#e8453c'}"/>`;
    if (f.kragen === 'pulli') return `<path d="M23.4 44.2q6.6 4.6 13.2 0" fill="none"/>`;
    return `<path d="M25 43l5 7 5-7z" fill="#fff"/>`;
  }
  function hut(f) {
    return f.hut ? `<path d="M15.5 18.5q14.5-4 29 0-2 2.2-14.5 2.2t-14.5-2.2z" fill="#4a6a3a"/><path d="M21 18q0-8 9-8t9 8q-9 1.6-18 0z" fill="#4a6a3a"/><path d="M21.2 16.6q8.8 1.4 17.6 0" stroke="#d8c060" stroke-width="1.2" fill="none"/>` : '';
  }

  // ---------- Bilder statt Zeichnung ----------
  // Im Spiel: nur Bilder, die in bilder.js stehen (HN.bild). Auf der Startseite (ohne bilder.js): Maklerin und Makler direkt
  // aus makler-hammerpreis/bilder/figuren/ – fehlt die Datei, bleibt die Zeichnung.
  const START_PFAD = 'makler-hammerpreis/bilder/figuren/';
  const umgefaerbt = {};   // Adresse → null (lädt), false (fehlt), Daten-Adresse (fertig umgefärbt)
  function adresse(name, mimik) {
    const H = window.HN;
    if (H && H.bild) return H.bild('figuren/' + name + '-' + mimik) || H.bild('figuren/' + name + '-neutral');
    return (name === 'maklerin' || name === 'makler') ? START_PFAD + name + '-' + mimik + '.webp' : null;
  }
  // Kundenfarbe: reines Grün (#00FF00, Blazer) → Kundenfarbe, Licht und Schatten bleiben (wie Rahmen.umfaerben)
  function umfaerben(img, farbe) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const bildDaten = g.getImageData(0, 0, c.width, c.height), d = bildDaten.data;
    const h = String(farbe).replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16) || 0;
    const ziel = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    for (let i = 0; i < d.length; i += 4) {
      const gruen = d[i + 1] - Math.max(d[i], d[i + 2]);
      if (gruen < 16) continue;
      const t = Math.min(1, (gruen - 16) / 36), hell = Math.min(1.3, d[i + 1] / 210);
      for (let k = 0; k < 3; k++) d[i + k] += (Math.min(255, ziel[k] * hell) - d[i + k]) * t;
    }
    g.putImageData(bildDaten, 0, 0);
    return c.toDataURL('image/png');
  }
  function laden(a) {
    umgefaerbt[a] = null;
    const i = new Image();
    i.onload = () => {
      try { umgefaerbt[a] = umfaerben(i, kundenFarbe); } catch (e) { umgefaerbt[a] = a; }
      document.dispatchEvent(new CustomEvent('hn-figur-bereit'));   // Startseite zeichnet die Figurenwahl neu
    };
    i.onerror = () => { umgefaerbt[a] = false; document.dispatchEvent(new CustomEvent('hn-figur-bereit')); };
    i.src = a;
  }
  // Bild einer Figur: Adresse, '' (lädt noch) oder null (kein Bild → Zeichnung)
  function bild(name, mimik) {
    if (!name) return null;
    const a = adresse(name, mimik || 'neutral');
    if (!a) return null;
    if (name !== 'maklerin' && name !== 'makler') return a;
    if (umgefaerbt[a] === undefined) laden(a);
    return umgefaerbt[a] === false ? null : (umgefaerbt[a] || '');
  }
  document.addEventListener('hn-figur-bereit', () => {
    document.querySelectorAll('.hn-fig-warte').forEach(w => {
      if (bild(w.dataset.name, w.dataset.mimik) === '') return;
      w.outerHTML = svg(w.dataset.name, w.dataset.mimik, { klasse: w.dataset.klasse });
    });
  });
  function vorladen(namen, mimiken) {
    namen.forEach(n => (mimiken || ['neutral', 'freut', 'zweifelt', 'aergert', 'staunt']).forEach(m => bild(n, m)));
  }
  // Platzhalter-Figuren für Eigentümer (aus Name und ID) und Käufer (aus dem Typ), immer gleich je Eintrag
  const zufall = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return () => { h = (h * 1103515245 + 12345) >>> 0; return (h >>> 8) / 16777216; }; };
  const wahl = (r, a) => a[Math.floor(r() * a.length)];
  function eigentuemer(e) {
    const r = zufall(e.id || e.name), frau = /^Frau\b/.test(e.name || '');
    const haar = wahl(r, ['#dcdcdc', '#b8b8b8', '#6b4a2e', '#3a2a1a', '#8a6a4a', '#c98a3a']);
    const f = frau ? { frisur: wahl(r, ['dutt', 'lang', 'locken', 'zopf']), haar, kleid: wahl(r, ['#7a5aa6', '#d0544a', '#3a8a8a', '#9a3a5a', '#2a6a5a']), brille: r() < 0.4 }
      : { frisur: wahl(r, ['kurz', 'glatze', 'kurz']), haar, kleid: wahl(r, ['#3d7a4a', '#8a6a3a', '#2f5d8a', '#5a4a3a', '#6a6a7a']), brille: r() < 0.35, bart: wahl(r, [null, null, 'schnurr', 'voll']), kragen: 'pulli' };
    f.haut = wahl(r, ['#f6cfaa', '#efc29a', '#f3c9a3', '#e9b98f', '#d9a77c']);
    // Bild: fünf Frauen (eigentuemerin-1…5) und fünf Männer (eigentuemer-1…5); fest nach der Reihenfolge der IDs je Geschlecht
    const pool = ((window.HN_TEXTE || {}).eigentuemer || []).filter(x => /^Frau\b/.test(x.name || '') === frau).map(x => x.id).sort();
    const nr = pool.indexOf(e.id);
    f.bild = (frau ? 'eigentuemerin-' : 'eigentuemer-') + (1 + (nr >= 0 ? nr : Math.floor(r() * 5)) % 5);
    return f;
  }
  const TYPEN = {
    'Junges Paar': { bild: 'kaeufer-junges-paar', haar: '#c98a3a', frisur: 'zopf', kleid: '#3a7ad0' },
    'Familie mit Kindern': { bild: 'kaeufer-familie', haar: '#8a5a3a', frisur: 'locken', kleid: '#3a8a5a' },
    'Senioren': { bild: 'kaeufer-senioren', haar: '#dcdcdc', frisur: 'dutt', kleid: '#7a6a5a', brille: true },
    'Single': { bild: 'kaeufer-single', haar: '#2a2a2a', frisur: 'kurz', kleid: '#d05a7a' },
    'Wochenendpendler': { bild: 'kaeufer-pendler', haar: '#4a3a2a', frisur: 'kurz', kleid: '#4a4a5a', kragen: 'krawatte', krawatte: '#3a7ad0' },
    'Investor': { bild: 'kaeufer-investor', haar: '#6a6a6a', frisur: 'kurz', kleid: '#2a2a3a', kragen: 'krawatte', brille: true },
    'Landwirt': { bild: 'kaeufer-landwirt', haar: '#5a3a2a', frisur: 'kurz', kleid: '#5a7a3a', bart: 'voll', hut: true, kragen: 'pulli' },
    'Handwerker': { bild: 'kaeufer-handwerker', haar: '#b0703a', frisur: 'kurz', kleid: '#e8823a', bart: 'schnurr', kragen: 'pulli' },
    'WG': { bild: 'kaeufer-wg', haar: '#7a3a8a', frisur: 'lang', kleid: '#e8c23a' },
    'Rückkehrer': { bild: 'kaeufer-rueckkehrer', haar: '#3a2a1a', frisur: 'lang', kleid: '#2a6a5a' },
  };
  // Käufer-Bild: zwei (Single, Wochenendpendler: drei) Besetzungen je Typ (…-1, …-2, …-3), fest nach ID. Passt das Geschlecht
  // der Besetzung nicht zum Namen (Frau/Herr, Vorname), nimmt der Code die passende Besetzung; gibt es im Typ keine, eine
  // passende Figur eines anderen Typs. Mehrere Profile gleichen Geschlechts wechseln sich ab. Phase 4 (27.10.2026): Single-Mann
  // (single-2) und Pendlerin (pendler-2) neu, die bisherigen zweiten Besetzungen heißen jetzt …-3.
  const BESETZUNG = { 'kaeufer-junges-paar': ['paar', 'paar'], 'kaeufer-familie': ['paar', 'paar'], 'kaeufer-senioren': ['paar', 'w'],
    'kaeufer-single': ['w', 'm', 'w'], 'kaeufer-pendler': ['m', 'w', 'm'], 'kaeufer-investor': ['w', 'm'], 'kaeufer-landwirt': ['m', 'w'],
    'kaeufer-handwerker': ['w', 'm'], 'kaeufer-wg': ['paar', 'paar'], 'kaeufer-rueckkehrer': ['m', 'w'] };
  const ERSATZ = { m: ['kaeufer-rueckkehrer-1', 'kaeufer-pendler-1', 'kaeufer-handwerker-2'], w: ['kaeufer-single-1', 'kaeufer-rueckkehrer-2', 'kaeufer-handwerker-1'] };
  const FRAUEN = /^(Anna|Annika|Clara|Corinna|Elisabeth|Eva|Gerda|Juliane|Katharina|Lena|Marlene|Mia|Miriam|Nora|Resi|Rosa|Sabine|Sophie|Maria|Julia|Laura|Lisa|Sarah|Hannah|Petra|Monika|Andrea|Claudia|Christina|Theresa|Johanna|Magdalena|Veronika)$/;
  const MAENNER = /^(Anton|Daniel|Felix|Ferdinand|Florian|Georg|Hans|Jonas|Josef|Kevin|Lukas|Martin|Max|Moritz|Patrick|Paul|Stefan|Tobias|Tom|Michael|Thomas|Andreas|Markus|Christian|Alexander|Sebastian|Johannes|Franz|Peter|Simon|David|Leon|Ben)$/;
  function geschlecht(name) {
    const n = String(name || '').trim();
    if (/\bund\b|^Familie\b|^WG\b/.test(n)) return 'paar';
    if (/^Frau\b/.test(n)) return 'w';
    if (/^Herr\b/.test(n)) return 'm';
    const v = n.split(/\s+/)[0];
    return FRAUEN.test(v) ? 'w' : MAENNER.test(v) ? 'm' : '';
  }
  function kaeuferBild(k, basis) {
    const liste = ((window.HN_TEXTE || {}).kaeufer || []).slice().sort((a, b) => a.id < b.id ? -1 : 1);
    const g = geschlecht(k.name), art = BESETZUNG[basis] || ['', ''];
    const gleich = liste.filter(x => x.typ === k.typ && geschlecht(x.name) === g);
    const nr = Math.max(0, gleich.findIndex(x => x.id === k.id));
    const nrn = art.map((x, i) => i + 1);
    const passend = nrn.filter(i => !g || g === 'paar' || art[i - 1] === g || art[i - 1] === '');
    if (g === 'paar' && art.includes('paar')) return basis + '-' + nrn.filter(i => art[i - 1] === 'paar')[nr % art.filter(a => a === 'paar').length];
    if (passend.length) return basis + '-' + passend[nr % passend.length];
    return ERSATZ[g] ? ERSATZ[g][nr % ERSATZ[g].length] : basis + '-1';
  }
  function kaeufer(k) {
    const r = zufall(k.id || k.name), f = Object.assign({}, TYPEN[k.typ] || {});
    f.haut = wahl(r, ['#f6cfaa', '#efc29a', '#f3c9a3', '#e9b98f', '#d9a77c', '#c99a6c']);
    if (f.bild) f.bild = kaeuferBild(k, f.bild);
    return f;
  }

  // SVG-Text einer Figur (viewBox 0 0 60 60). name = Vorlage oder Angaben-Objekt; mimik = neutral | freut | zweifelt | aergert | staunt
  // Liegt ein gestaltetes Bild vor, kommt stattdessen ein <img>.
  function svg(name, mimik, opt) {
    const b = bild(typeof name === 'string' ? name : name && name.bild, mimik);
    // Bild lädt bzw. wird umgefärbt (kurz): Platzhalter, der nach dem Laden ersetzt wird (nicht Zeichnung, nicht grüner Blazer)
    if (b === '') return `<span class="hn-fig-warte" data-name="${name}" data-mimik="${mimik || 'neutral'}" data-klasse="${(opt && opt.klasse) || ''}"></span>`;
    if (b) return `<img${(opt && opt.klasse) ? ` class="${opt.klasse}"` : ''} src="${b}" alt="" draggable="false">`;
    const f = Object.assign({ haar: '#6b4a2e', frisur: 'kurz', haut: '#f6cfaa', kleid: '#5a6a8a', kragen: 'bluse' },
      typeof name === 'string' ? vorlagen[name] || {} : name || {});
    const kleid = f.kleid === 'kunde' ? kundenFarbe : f.kleid;
    const kl = (opt && opt.klasse) ? ` class="${opt.klasse}"` : '';
    return `<svg${kl} viewBox="0 0 60 60" aria-hidden="true"><g stroke="${T}" stroke-width="2.4" stroke-linejoin="round">` +
      haarHinten(f) +
      `<path d="M10 59c1-10 8-16 20-16s19 6 20 16z" fill="${kleid}"/>` + kragen(f, kleid) +
      `<ellipse cx="19.6" cy="29" rx="2.2" ry="3" fill="${f.haut}"/><ellipse cx="40.4" cy="29" rx="2.2" ry="3" fill="${f.haut}"/>` +
      `<ellipse cx="30" cy="28" rx="10.5" ry="11.5" fill="${f.haut}"/>` + bart(f) + haarVorn(f) + hut(f) + `</g>` +
      augen(mimik || 'neutral', f) + mund(mimik || 'neutral') + `</svg>`;
  }

  window.HN_FIGUREN = {
    svg,
    vorlagen,
    setzeKundenfarbe(hex) { if (hex) kundenFarbe = hex; },
    // Rolle und Vorname der Spielfiguren (Vornamen aus kunde.js: figuren.maklerin.name, MZ 27.10.2026: Tessa und Toni)
    namen: { maklerin: 'Maklerin', makler: 'Makler' },
    vorname(f) { const k = ((window.KUNDE || {}).figuren || {})[f]; return (k && k.name) || ''; },
    bild, vorladen, eigentuemer, kaeufer, typen: TYPEN,
  };
})();
