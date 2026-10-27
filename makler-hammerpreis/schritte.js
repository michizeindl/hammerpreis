// „Hammerpreis“ – die fünf Schritte je Objekt als Comic-Tafeln (DOM über der lebenden Straße):
// (1) Anruf des Eigentümers mit Wunschpreis (Text aus dem Pool, {preis} ersetzt). Mängel nennt der Anruf nicht (MZ, 26.10.2026) –
//     die findet man bei der Besichtigung; wer den verschwiegenen Mangel findet, bekommt einen Bonus (Provision).
// (2) Besichtigung: Rundgang durch die Räume der Mängel/Pluspunkte (Reiter je Raum), antippen, solange die Zeit läuft
// (3) Schätzen per Regler, vorher optional Hinweise aufdecken (je −3 Punkte) – Lage deckt Mängel der Straße/des Grundstücks auf
// (4) passenden Käufer aus drei Profilen wählen (Art, Viertel, Wünsche, NoGo, Budget) → (5) Bieterrunde: im richtigen Moment
// zuschlagen. Dazu das Exposé nach jedem Objekt. Jeder Schritt bekommt das Objekt `ob` (spiel.js) und ruft `fertig(ergebnis)`.
(function () {
  'use strict';
  const HB = window.HNB, D = window.HN, T = D.texte, F = window.HN_FIGUREN, SZ = window.HN_SZENE, SCH = window.HN_SCHIRME;
  const KL = window.HN_KLANG;   // Ton (klang.js): Szenen, Effekte, Spannung der Bieterrunde
  const esc = SCH.esc, el = SCH.el;
  const R = D.regeln, M = D.merkmale;
  const ICON = {
    tel: '<path d="M6 3h3l1.5 4-2 1.5a10 10 0 0 0 5 5L15 11.5l4 1.5v3a2 2 0 0 1-2 2A14 14 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
    lupe: '<circle cx="10" cy="10" r="5.5"/><path d="M14.5 14.5 20 20"/>',
    regler: '<path d="M4 12h16"/><circle cx="14" cy="12" r="3"/><path d="M4 7h4M16 7h4M4 17h7"/>',
    leute: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 19c0-4 2.5-6 5-6s5 2 5 6M13 19c.4-3 1.8-4.6 3.5-4.6S20 16 20.5 19"/>',
    hammer: '<path d="M13 4l7 7-3 3-7-7z"/><path d="M11.5 9.5 4 17l3 3 7.5-7.5"/>',
  };
  const ikone = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
  const SCHRITT_ICON = ['tel', 'lupe', 'regler', 'leute', 'hammer'];
  const zufall = a => a[Math.floor(Math.random() * a.length)];

  let aktiv = null;   // { schritt(dt), groesse(), test(), setzen() } des laufenden Schritts
  let tempo = 1;

  // ---------- Tafel ----------
  function tafel(nr, titel, klasse) {
    SCH.stumm();   // neue Tafel: Sprechblasen weg, damit sie nichts verdecken
    const alt = SCH.buehne.querySelector('.hn-panel:not(.weg)');
    if (alt) { alt.classList.add('weg'); setTimeout(() => alt.remove(), 420); }
    const p = el('section', 'hn-panel ' + (klasse || ''));
    p.dataset.schritt = nr;
    const punkte = nr >= 1 && nr <= 5 ? `<ol class="hn-schritte" aria-label="Schritt ${nr} von 5">` + T.schrittKurz.map((s, i) =>
      `<li class="${i + 1 < nr ? 'durch' : i + 1 === nr ? 'jetzt' : ''}" title="${esc(s)}">${ikone(SCHRITT_ICON[i])}</li>`).join('') + '</ol>' : '';
    p.innerHTML = `<header class="hn-pkopf"><h2 class="hn-tag${titel.length > 11 ? ' lang' : ''}">${esc(titel)}</h2>${punkte}</header><div class="hn-pinhalt"></div>` +
      `<div class="hn-mehr" aria-hidden="true"><span>${nr === 4 ? 'Weitere Käufer' : 'Weiter unten'}</span></div><footer class="hn-pfuss"></footer>`;
    SCH.buehne.append(p);
    mehrBeobachten(p);
    return { p, inhalt: p.querySelector('.hn-pinhalt'), fuss: p.querySelector('.hn-pfuss'), kopf: p.querySelector('.hn-pkopf') };
  }
  // Scroll-Hinweis (Korrekturrunde 1): geht der Inhalt unten weiter, zeigt die Tafel einen Verlauf und „Weitere Käufer“ bzw.
  // „Weiter unten“; verschwindet, sobald man bis unten gescrollt hat
  function mehrBeobachten(p) {
    const i = p.querySelector('.hn-pinhalt');
    let geplant = false;
    const pruefen = () => { geplant = false; if (p.isConnected) p.classList.toggle('mehr', i.scrollHeight - i.clientHeight - i.scrollTop > 8); };
    const bald = () => { if (!geplant) { geplant = true; requestAnimationFrame(pruefen); } };
    i.addEventListener('scroll', bald, { passive: true });
    i.addEventListener('load', bald, true);   // Figurenbilder laden nach
    if (window.ResizeObserver) new ResizeObserver(bald).observe(i);
    if (window.MutationObserver) new MutationObserver(bald).observe(i, { childList: true, subtree: true });
    [300, 800].forEach(ms => setTimeout(bald, ms));
  }
  function knopf(text, klasse, klick, klang) {
    const b = el('button', 'hn-kn ' + (klasse || 'haupt'));
    b.type = 'button'; b.innerHTML = text;
    // Knopf sperrt sich beim ersten Klick (kein Doppelklick); scheitert der nächste Schritt, wird er wieder frei, statt stumm
    // gesperrt zu bleiben (Korrekturrunde 1, Fund „Klicks ohne Wirkung“)
    SCH.tippen(b, () => {
      if (b.disabled) return;
      b.disabled = true; KL.ton(klang || 'klick');
      try { klick(); } catch (err) { b.disabled = false; console.error(err); }   // eslint-disable-line no-console
    });
    return b;
  }
  const flaecheText = (ob, genau) => {
    const g = ob.art.jeGrund, wert = genau ? (g ? ob.daten.grundstueck : ob.daten.flaeche) : ob.flaecheCa;
    return (genau ? '' : 'ca. ') + HB.zahl(wert) + ' m²';
  };
  const chip = (id, extra) => `<span class="hn-mchip ${M[id].typ === 'plus' ? 'plus' : 'minus'}${extra ? ' ' + extra : ''}">${M[id].typ === 'plus' ? '+' : '−'} ${esc(M[id].name)}</span>`;

  // ---------- (1) Anruf ----------
  // Weißraum gefüllt (Balancing-Runde 1, Skizze weissraum-neu): Eigentümer als großes Porträt mit Sprechblase, großes Hausbild
  // mit Namensschild (wächst mit der Tafel), Daten als vier Kacheln. opt.leise: noch nicht klingeln (Zwischenscreen liegt
  // darüber) – das Klingeln startet dann über die zurückgegebene Funktion.
  function anruf(ob, fertig, opt) {
    const t = tafel(1, T.schrittTitel[0], 'hn-s-anruf');
    const o = ob.daten, e = ob.eigentuemer;
    const satz = e.anruf.replace('{preis}', HB.euro(ob.wunsch));
    t.inhalt.innerHTML = `
      <div class="hn-klingel"><span class="hn-tel">${ikone('tel')}</span><span>Objekt ${ob.nr} von ${R.objekte}</span></div>
      <div class="hn-eig gross"><span class="fig hn-portrait">${F.svg(e.figur, 'neutral')}</span>
        <div class="hn-blase links"><b>${esc(e.name)}:</b> ${esc(satz)}</div></div>
      <div class="hn-an-haus"><span class="bild">${SZ.hausSvg(o.art)}</span><span class="hn-schild">${esc(o.titel)}</span></div>
      <div class="hn-kacheln">
        <div><span>Art</span><b>${esc(ob.art.name)}</b></div><div><span>Viertel</span><b>${esc(ob.viertel.name)}</b></div>
        <div><span>${ob.art.jeGrund ? 'Grund' : 'Fläche'}</span><b>${flaecheText(ob, false)}</b></div>
        <div class="w"><span>Wunschpreis</span><b>${HB.euro(ob.wunsch)}</b></div></div>
      <p class="hn-anleitung">${esc(T.schrittText[0])}</p>`;
    // Telefon klingelt kurz (ein Klingeln), dann hebt der Eigentümer ab – endet sofort, wenn man vorher weitertippt
    KL.szene('buero');
    let ring = null, abheben = null, weg = false;
    const klingeln = () => { if (weg || ring) return; ring = KL.ton('telefon'); abheben = setTimeout(() => KL.ton('abheben'), 2050); };
    if (!(opt && opt.leise)) klingeln();
    t.fuss.append(knopf('Zur Besichtigung', 'haupt', () => { weg = true; clearTimeout(abheben); if (ring) ring.aus(0.08); fertig(); }));
    aktiv = null;
    return klingeln;
  }

  // ---------- (2) Besichtigung: Rundgang durch die Räume ----------
  function besichtigung(ob, fertig) {
    const t = tafel(2, T.schrittTitel[1], 'hn-s-besichtigung');
    const alle = ob.daten.merkmale.slice(), raeume = ob.raeume;
    t.inhalt.innerHTML = `<div class="hn-bes-kopf"><span class="hn-bes-text">${esc(T.schrittText[1])}</span><span class="hn-zaehler"><b>0</b>/${alle.length}</span></div>
      <div class="hn-uhr"><i></i></div>
      ${raeume.length > 1 ? `<div class="hn-reiter-reihe" role="tablist">${raeume.map((r, i) => `<button type="button" role="tab" class="hn-rr${i ? '' : ' an'}" data-i="${i}">${esc(D.raumNamen[r.id])}</button>`).join('')}</div>` : `<div class="hn-reiter-reihe eins"><span class="hn-rr an">${esc(D.raumNamen[raeume[0].id])}</span></div>`}
      <div class="hn-raum"><canvas></canvas></div>
      <p class="hn-rueck" aria-live="polite"></p>`;
    const leinwand = t.inhalt.querySelector('canvas'), g = leinwand.getContext('2d'), uhr = t.inhalt.querySelector('.hn-uhr i');
    const zaehler = t.inhalt.querySelector('.hn-zaehler b'), rueck = t.inhalt.querySelector('.hn-rueck');
    const reiter = [...t.inhalt.querySelectorAll('button.hn-rr')];
    const zeit = ob.schwer.besichtigungZeit + ob.schwer.raumZeit * raeume.length;
    const st = { rest: zeit, raum: 0, gefunden: [], fehl: 0, tipps: [], vorbei: false, alter: {}, flaechen: [], B: 0, H: 0, wechsel: null };
    function groesse() {
      const par = leinwand.parentNode, dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      st.B = par.clientWidth; st.H = par.clientHeight;
      leinwand.width = Math.round(st.B * dpr); leinwand.height = Math.round(st.H * dpr);
      leinwand.style.width = st.B + 'px'; leinwand.style.height = st.H + 'px';
      st.dpr = dpr;
    }
    function raumZeigen(i, still) {
      st.raum = i;
      reiter.forEach((b, j) => { b.classList.toggle('an', j === i); b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      // Rückmeldung unter dem Bild gehört zum vorigen Raum – bei jedem Raumwechsel leeren (Fund Claude Player, Keller)
      rueck.innerHTML = ''; rueck.classList.remove('neu');
      if (!still) KL.ton('ereignis', { faktor: 0.5 });   // Raumwechsel: leiser Wisch
      KL.szene('raum', raeume[i].id);                    // Raumgeräusch überblendet
    }
    reiter.forEach(b => SCH.tippen(b, () => { clearTimeout(st.wechsel); if (+b.dataset.i !== st.raum) raumZeigen(+b.dataset.i); }));
    function raumFertig(i) { return raeume[i].merkmale.every(id => st.gefunden.includes(id)); }
    function malen() {
      if (!st.B) return;
      g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      g.clearRect(0, 0, st.B, st.H);
      const ids = raeume[st.raum].merkmale;
      const r = SZ.raum(g, st.B, st.H, raeume[st.raum].id, ids);
      st.flaechen = r.flaechen.map(f => Object.assign(f, { r: f.r * ob.schwer.trefferRadius, k: ob.schwer.trefferRadius }));
      const belegt = [];
      ids.forEach(id => { if (st.gefunden.includes(id)) { const f = st.flaechen.find(x => x.id === id); SZ.markierung(g, f, M[id], 'gefunden', (performance.now() - st.alter[id]) / 1000, belegt, st.B, st.H); } });
      if (st.vorbei) st.flaechen.forEach(f => { if (!st.gefunden.includes(f.id)) SZ.markierung(g, f, M[f.id], 'verpasst', (performance.now() - st.vorbeiSeit) / 1000, belegt, st.B, st.H); });
      st.tipps = st.tipps.filter(x => performance.now() - x.t < 600);
      st.tipps.forEach(x => {
        const a = 1 - (performance.now() - x.t) / 600;
        g.save(); g.globalAlpha = a; g.strokeStyle = '#e8453c'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x.x - 9, x.y - 9); g.lineTo(x.x + 9, x.y + 9); g.moveTo(x.x + 9, x.y - 9); g.lineTo(x.x - 9, x.y + 9); g.stroke(); g.restore();
      });
    }
    function tipp(ev) {
      if (st.vorbei) return;
      const r = leinwand.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      let best = null, bd = Infinity;
      // Treffer im Bild-Rechteck (Zeichnungen ohne Bild: Kreis); bei Überschneidung zählt das nähere Merkmal
      st.flaechen.forEach(f => { const d = f.w ? SZ.trifft(f, x, y, f.k) : Math.hypot(f.x - x, f.y - y) / f.r; if (d < 1 && d < bd) { bd = d; best = f; } });
      if (best && !st.gefunden.includes(best.id)) {
        st.gefunden.push(best.id); st.alter[best.id] = performance.now();
        zaehler.textContent = st.gefunden.length;
        rueck.innerHTML = `<b>${esc(M[best.id].name)}:</b> ${esc(M[best.id].text)}`;
        rueck.classList.remove('neu'); void rueck.offsetWidth; rueck.classList.add('neu');
        KL.ton('fund');
        if (best.id === ob.verschwiegen) bonusZeigen(window.HN_SPIEL.verschwiegenGefunden(ob));
        if (raumFertig(st.raum) && reiter[st.raum]) reiter[st.raum].classList.add('fertig');
        if (st.gefunden.length === alle.length) { beenden(); return; }
        if (raumFertig(st.raum)) {   // nächster offener Raum
          const n = raeume.findIndex((rr, i) => i !== st.raum && !raumFertig(i));
          if (n >= 0) { clearTimeout(st.wechsel); st.wechsel = setTimeout(() => { if (!st.vorbei) raumZeigen(n); }, 1000); }
        }
      } else if (!best) {
        st.fehl++; st.tipps.push({ x, y, t: performance.now() });
        KL.ton('fehltipp'); window.Rahmen.vibrieren(40);
      }
    }
    leinwand.addEventListener('pointerdown', ev => { ev.preventDefault(); tipp(ev); });
    // Einblendung im Raum (hält die Zeit nicht an): verschwiegener Mangel gefunden, Bonus als Provision
    function bonusZeigen(betrag) {
      if (!betrag) return;
      const b = el('div', 'hn-bonus');
      b.setAttribute('role', 'status');
      b.innerHTML = `<span>${esc(T.ui.verschwiegen)}</span><b>${SCH.SCHEIN}+${HB.euro(betrag)} Provision</b>`;
      leinwand.parentNode.append(b);
      KL.ton('bonus', { verzoegerung: 0.12 });   // Bonus-Glocke kurz nach dem Fund-Klang
      setTimeout(() => b.classList.add('weg'), 2600);
      setTimeout(() => b.remove(), 3100);
    }
    // „Zur Schätzung“ steht während der ganzen Besichtigung bereit (MZ, Balancing-Runde 1): früh tippen beendet die Besichtigung,
    // Nichtgefundenes zählt als verpasst und wird kurz gezeigt (gestrichelt im aktuellen Raum, Reiter gestrichelt), dann geht es
    // von selbst weiter. Nach Ablauf der Zeit bzw. wenn alles gefunden ist, bleibt der Knopf stehen (wie bisher).
    let ergebnis = null;
    const ergZeile = el('p', 'hn-erg leer');
    t.fuss.append(ergZeile);
    t.fuss.append(knopf('Zur Schätzung', 'haupt', () => {
      if (st.vorbei) { fertig(ergebnis); return; }
      beenden(true);
      setTimeout(() => { if (t.p.isConnected) fertig(ergebnis); }, 1800);
    }));
    function beenden(frueh) {
      if (st.vorbei) return;
      st.vorbei = true; st.vorbeiSeit = performance.now(); st.frueh = !!frueh;
      clearTimeout(st.wechsel);
      const n = st.gefunden.length;
      ergebnis = { gefunden: st.gefunden.slice(), gesamt: alle.length, fehltipps: st.fehl, frueh: !!frueh };
      const punkte = window.HN_SPIEL.punkteBesichtigung(ergebnis);
      reiter.forEach((b, i) => { if (!raumFertig(i)) b.classList.add('offen'); });
      // früh beendet und im aktuellen Raum ist alles gefunden: zum ersten Raum mit Verpasstem wechseln, damit man es sieht
      if (frueh && raumFertig(st.raum)) { const v = raeume.findIndex((rr, i) => !raumFertig(i)); if (v >= 0) raumZeigen(v, true); }
      t.p.classList.add('vorbei');   // Anleitung und Uhr weg: Platz für Rückmeldung und Knopf (kleine Bildschirme)
      requestAnimationFrame(groesse);   // Raum kann dabei kleiner werden (quer flach)
      ergZeile.classList.remove('leer');
      ergZeile.innerHTML = `${n === alle.length ? 'Alles gefunden' : `${n} von ${alle.length} gefunden`}${st.fehl ? ` – ${st.fehl} Fehltipp${st.fehl > 1 ? 's' : ''}` : ''} <b>+${punkte}</b>`;
    }
    groesse();
    raumZeigen(0, true);
    aktiv = {
      schritt(dt) {
        if (!st.vorbei) {
          st.rest -= dt * tempo;
          uhr.style.transform = `scaleX(${Math.max(0, st.rest / zeit)})`;
          uhr.parentNode.classList.toggle('knapp', st.rest < 3);
          if (st.rest <= 0) beenden();
        }
        malen();
      },
      groesse,
      test: () => {
        const r = leinwand.getBoundingClientRect();
        return {
          flaechen: st.flaechen.map(f => ({ id: f.id, x: r.left + f.x, y: r.top + f.y, r: f.r, w: f.w, h: f.h, gefunden: st.gefunden.includes(f.id) })),
          raeume: raeume.map((rr, i) => { const b = reiter[i] && reiter[i].getBoundingClientRect(); return { id: rr.id, merkmale: rr.merkmale, fertig: raumFertig(i), x: b ? b.left + b.width / 2 : null, y: b ? b.top + b.height / 2 : null }; }),
          raum: st.raum, rest: st.rest, vorbei: st.vorbei,
        };
      },
    };
  }

  // ---------- (3) Schätzen ----------
  function schaetzen(ob, fertig) {
    const t = tafel(3, T.schrittTitel[2], 'hn-s-schaetzen');
    const o = ob.daten, grund = ob.art.jeGrund;
    const hinweise = grund ? ['grundriss', 'stadtplan'] : ['grundriss', 'energie', 'stadtplan', 'baujahr'];
    const NAMEN = { grundriss: grund ? 'Lageplan' : (T.hinweise.grundriss.name || 'Grundriss'), energie: T.hinweise.energie.name || 'Energieausweis', stadtplan: T.hinweise.stadtplan.name || 'Lage', baujahr: T.hinweise.baujahr.name || 'Baujahr' };
    const IKON = {
      grundriss: '<path d="M4 4h16v16H4zM4 11h7v9M11 4v4M14 11h6"/>', energie: '<path d="M4 6h9M4 10h11M4 14h13M4 18h15"/>',
      stadtplan: '<path d="M12 21c-4-5-6-8-6-11a6 6 0 0 1 12 0c0 3-2 6-6 11z"/><circle cx="12" cy="10" r="2"/>',
      baujahr: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    };
    const lageIds = o.merkmale.filter(id => D.lageRaeume.includes(M[id].raum));
    const chipsZeigen = () => {
      const bekannt = ob.gefunden.concat(ob.aufgedeckt.filter(id => !ob.gefunden.includes(id)));
      const c = bekannt.map(id => chip(id, ob.gefunden.includes(id) ? '' : 'neu'))
        .concat(ob.markt.map(e => `<span class="hn-mchip markt">${esc(e.titel)} ${HB.vorzeichen(e.wert * 100)}</span>`)).join('');
      const z = t.inhalt.querySelector('.hn-mchips');
      z.className = 'hn-mchips' + (c ? '' : ' leer');
      z.innerHTML = c || 'Keine Mängel oder Pluspunkte gefunden';
    };
    t.inhalt.innerHTML = `
      <p class="hn-steckkopf"><b>${esc(ob.art.name)}</b> – ${esc(ob.viertel.name)}</p>
      <div class="hn-steck${grund ? ' grund' : ''}${ob.rechnung.hof ? ' mithof' : ''}">
        <div data-h="grundriss"><span>${grund ? 'Grund' : 'Fläche'}</span><b>${flaecheText(ob, false)}</b></div>
        ${grund ? '' : `<div><span>Zimmer</span><b>${o.zimmer}</b></div><div class="zustand"><span>Zustand</span><b>${esc(o.zustand).replace('ungsbed', 'ungs\u00adbed')}</b></div>`}
        ${ob.rechnung.hof ? `<div class="hof"><span>Hofgrund</span><b>${HB.zahl(o.grundstueck)} m²</b></div>` : ''}
        ${grund ? '' : '<div data-h="baujahr"><span>Baujahr</span><b class="frage">?</b></div><div data-h="energie"><span>Energie</span><b class="frage">?</b></div>'}
        <div data-h="stadtplan" class="breit"><span>Lage</span><b class="frage">?</b></div>
      </div>
      <div class="hn-mchips"></div>
      <div class="hn-hinweise">${hinweise.map(h => `<button type="button" class="hn-hw" data-h="${h}" title="${esc(T.hinweise[h].text || '')}"><svg viewBox="0 0 24 24" aria-hidden="true">${IKON[h]}</svg><span>${esc(NAMEN[h])}</span><em>−${R.hinweisKosten}</em></button>`).join('')}</div>
      <div class="hn-hinweisbild" hidden></div>
      <p class="hn-anleitung klein">${esc(T.schrittText[2])}</p>
      <p class="hn-hinweistext">${esc(T.hinweisSpiel)}</p>`;
    // Preiszahl und Regler stehen im Fuß der Tafel über „Preis festlegen“ (Korrekturrunde 2): immer sichtbar, nie unter dem
    // Scroll-Hinweis „Weiter unten“ (320×640). Gescrollt wird nur der Steckbrief mit den Hinweisen darüber.
    t.fuss.insertAdjacentHTML('beforeend', `<div class="hn-regler">
        <div class="hn-preiszeile"><button type="button" class="hn-pm" data-d="-1" aria-label="weniger">−</button><output class="hn-preis">0 €</output><button type="button" class="hn-pm" data-d="1" aria-label="mehr">+</button></div>
        <div class="hn-schiene"><input type="range" aria-label="Preis"><span class="hn-wunschmarke" title="Wunschpreis"></span></div>
        <div class="hn-skala"><span class="min"></span><span class="w">Wunsch</span><span class="max"></span></div>
      </div>`);
    chipsZeigen();
    t.kopf.insertAdjacentHTML('beforeend', '<button type="button" class="hn-spiegel" aria-label="Preisspiegel ansehen">Preisspiegel</button>');
    const regler = t.fuss.querySelector('input'), ausgabe = t.fuss.querySelector('.hn-preis');
    const min = D.rund(ob.wunsch * R.reglerVon, 5000), max = D.rund(ob.wunsch * R.reglerBis, 5000), schritt = ob.wunsch > 150000 ? 1000 : 500;
    regler.min = min; regler.max = max; regler.step = schritt; regler.value = ob.wunsch;
    t.fuss.querySelector('.hn-skala .min').textContent = HB.euro(min);
    t.fuss.querySelector('.hn-skala .max').textContent = HB.euro(max);
    const wPos = (ob.wunsch - min) / (max - min);
    t.fuss.querySelector('.hn-wunschmarke').style.left = (wPos * 100) + '%';
    t.fuss.querySelector('.hn-skala .w').style.left = (wPos * 100) + '%';
    KL.szene('buero');
    let tickZeit = 0, tickWert = +regler.value;
    const tick = () => {   // Regler-Ticks: je geänderter Stufe, höchstens etwa 25 je Sekunde
      const j = performance.now();
      if (+regler.value === tickWert || j - tickZeit < 40) return;
      tickWert = +regler.value; tickZeit = j; KL.ton('tick');
    };
    const zeigen = () => { ausgabe.textContent = HB.euro(+regler.value); regler.style.setProperty('--p', ((regler.value - min) / (max - min) * 100) + '%'); tick(); };
    regler.addEventListener('input', zeigen);
    t.fuss.querySelectorAll('.hn-pm').forEach(b => {
      let wdh = null;
      const tun = () => { regler.value = Math.max(min, Math.min(max, +regler.value + (+b.dataset.d) * schritt)); zeigen(); };
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); tun(); wdh = setTimeout(function lauf() { tun(); wdh = setTimeout(lauf, 60); }, 380); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, () => clearTimeout(wdh)));
    });
    zeigen();
    const offen = [];
    const bild = t.inhalt.querySelector('.hn-hinweisbild');
    let fest = false;
    t.inhalt.querySelectorAll('.hn-hw').forEach(b => SCH.tippen(b, () => {
      const h = b.dataset.h;
      if (offen.includes(h) || fest) return;
      offen.push(h); b.classList.add('offen'); b.disabled = true;
      KL.ton('hinweis');
      const zeile = t.inhalt.querySelector(`.hn-steck [data-h="${h}"] b`);
      let svg = '', text = '', erkl = T.hinweise[h].text || '';
      if (h === 'grundriss') { text = flaecheText(ob, true); svg = SZ.grundrissSvg(o); }
      if (h === 'energie') { text = 'Klasse ' + o.energie; svg = SZ.energieSvg(o.energie); }
      if (h === 'stadtplan') {
        text = lageIds.length ? lageIds.map(id => M[id].name).join(', ') : 'ohne Besonderheiten';
        svg = SZ.stadtplanSvg(o.viertel);
        erkl = ob.viertel.text || erkl;
        lageIds.forEach(id => { if (!ob.aufgedeckt.includes(id)) ob.aufgedeckt.push(id); });
        chipsZeigen();
      }
      if (h === 'baujahr') { text = String(o.baujahr); svg = `<div class="hn-jahr">${o.baujahr}</div>`; }
      if (zeile) { zeile.textContent = text; zeile.classList.remove('frage'); zeile.classList.add('neu'); zeile.parentNode.classList.add('aufgedeckt'); }
      bild.hidden = false;
      bild.innerHTML = `<div class="hn-hb" data-h="${h}">${svg}<span><b>${esc(NAMEN[h])}: ${esc(text)}</b>${erkl ? `<i>${esc(erkl)}</i>` : ''}</span></div>`;
    }));
    SCH.tippen(t.kopf.querySelector('.hn-spiegel'), () => preisspiegel(ob));
    t.fuss.append(knopf('Preis festlegen', 'haupt', () => {
      fest = true;
      const wert = +regler.value;
      aktiv = null;
      fertig({ schaetzung: wert, hinweise: offen.slice() }, erg => aufloesung(t, ob, erg));
    }, 'festlegen'));
    aktiv = { test: () => ({ min, max, schritt, wunsch: ob.wunsch, wert: ob.wert, regler: +regler.value }), setzen(v) { regler.value = v; zeigen(); } };
  }
  // Stufe der Schätzung aus den Rahmentexten (Volltreffer bis 3 %, …, darüber Ladenhüter)
  function stufe(abw) {
    const s = T.schaetzung;
    return s.find(x => x.bis != null && abw <= x.bis) || s[s.length - 1] || { stufe: '', texte: [''] };
  }
  function aufloesung(t, ob, erg) {
    const r = t.fuss.querySelector('.hn-regler'), hw = t.inhalt.querySelector('.hn-hinweise');
    if (hw) hw.querySelectorAll('button').forEach(b => { b.disabled = true; });
    // zu niedrig (mehr als 35 %): „Unter Wert verkauft“ statt Ladenhüter (MZ, 27.10.2026)
    const s = ob.unterWert ? { stufe: T.unterWert, texte: T.unterWertTexte } : stufe(ob.abw);
    const block = el('div', 'hn-aufloesung' + (ob.ladenhueter ? ' laden' : ob.unterWert ? ' unterwert' : ''));
    block.innerHTML = `<div class="hn-vergleich"><div><span>Deine Schätzung</span><b>${HB.euro(ob.schaetzung)}</b></div>
      <div><span>Marktwert</span><b>${HB.euro(ob.wert)}</b></div></div>
      <p class="hn-abw">${HB.prozent(ob.abw, 1)} daneben${ob.hinweise.length ? ` – ${ob.hinweise.length} Hinweis${ob.hinweise.length > 1 ? 'e' : ''} (−${ob.hinweise.length * R.hinweisKosten})` : ''} <b>+${ob.punkte.schaetzung}</b></p>
      ${ob.ladenhueter ? `<div class="hn-stempel gross">${esc(s.stufe || T.ladenhueter)}</div>` : ob.unterWert ? `<div class="hn-stempel gross unterwert">${esc(s.stufe)}</div>` : `<span class="hn-stufe">${esc(s.stufe)}</span>`}
      <p class="hn-stufentext">${esc(zufall(s.texte))}</p>`;
    t.p.classList.add('aufgeloest');
    if (r) r.remove();   // Regler (im Fuß) weg, Ergebnis kommt in den Inhalt – vor den Hinweis „Spielpreise“
    const ht = t.inhalt.querySelector('.hn-hinweistext');
    if (ht) ht.before(block); else t.inhalt.append(block);
    // Ergebnis ganz zeigen: Inhalt bis unten scrollen (auf kleinen Bildschirmen lag es sonst unter dem Rand)
    requestAnimationFrame(() => block.scrollIntoView({ block: 'nearest', behavior: HB.ruhig() ? 'auto' : 'smooth' }));
    const fuss = t.fuss; fuss.innerHTML = '';
    if (ob.ladenhueter || ob.unterWert) {
      // Hinweis-Screen auf den Fehler (MZ: Variante b) – erscheint kurz nach dem Stempel von selbst (oder beim Tippen auf
      // „Weiter“); sein „Weiter“ führt direkt zum nächsten Schritt (kein zweites Tippen auf der Tafel)
      let gezeigt = false;
      const zeigen = () => { if (gezeigt || !t.p.isConnected) return; gezeigt = true; fehlerHinweis(ob, () => erg.weiter()); };
      fuss.append(knopf('Weiter', 'haupt', zeigen));
      setTimeout(zeigen, HB.ruhig() ? 500 : 1100);
    } else fuss.append(knopf('Zum Käufer', 'haupt', () => erg.weiter()));
  }

  // ---------- Kopf „Ergebnis beim Eigentümer“ (Hinweis-Screens und Exposé, einheitlicher Aufbau) ----------
  // Eigentümer des Objekts mit Sprechblase, Schätzung gegen Marktwert (bei Verkauf dazu der Verkaufspreis), Skala
  // „viel zu günstig – passt – viel zu teuer“ mit dem Strich an der Stelle der Schätzung (±50 % = Rand).
  function eigentuemerSatz(ob) {
    if (ob.eigentuemerSatz) return ob.eigentuemerSatz;
    const liste = ob.unterWert ? T.fehler.unterwert.blasen : ob.ladenhueter ? T.fehler.laden.blasen
      : T.verkauftBlasen[ob.abw <= 8 ? 'sehrgut' : ob.abw <= 15 ? 'gut' : 'knapp'];
    ob.eigentuemerSatz = zufall(liste).replace('{preis}', HB.euro(ob.schaetzung));
    return ob.eigentuemerSatz;
  }
  function skalaPos(ob) {
    const abw = (ob.schaetzung - ob.wert) / ob.wert * 100;
    return 50 + Math.max(-1, Math.min(1, abw / 50)) * 46;
  }
  function bilanzKopf(ob) {
    const fall = ob.unterWert ? 'unterwert' : ob.ladenhueter ? 'laden' : 'verkauft';
    const S = T.skala;
    return `<div class="hn-bk ${fall}">
      <div class="hn-bk-eig"><span class="fig hn-portrait">${F.svg(ob.eigentuemer.figur, fall === 'verkauft' ? 'freut' : 'neutral')}</span>
        <div class="hn-blase links">„${esc(eigentuemerSatz(ob))}“</div></div>
      <div class="hn-bk-vgl"><div><span>Deine Schätzung</span><b>${HB.euro(ob.schaetzung)}</b></div><div class="m"><span>Marktwert</span><b>${HB.euro(ob.wert)}</b></div>
        ${fall === 'verkauft' ? `<div class="v"><span>Verkauft für</span><b>${HB.euro(ob.verkauf.preis)}</b></div>` : ''}</div>
      <div class="hn-skala-leiste" role="img" aria-label="Deine Schätzung auf der Skala ${esc(S.links)} bis ${esc(S.rechts)}"><i class="mitte"></i><i class="marke" style="left:${skalaPos(ob).toFixed(1)}%"></i></div>
      <div class="hn-skala-lt"><span>${esc(S.links)}</span><span>${esc(S.mitte)}</span><span>${esc(S.rechts)}</span></div></div>`;
  }
  function fehlerHinweis(ob, weiter) {
    const fall = ob.unterWert ? 'unterwert' : 'laden', X = T.fehler[fall];
    const verlust = X.verlust.replace('{betrag}', HB.euro(Math.max(0, ob.wert - ob.schaetzung)));
    KL.ton('klick');
    SCH.einblendung(`<div class="hn-tag">${esc(X.band)}</div>${bilanzKopf(ob)}
      ${X.text ? `<p class="hn-fh-text">${esc(X.text)}</p>` : ''}<p class="hn-fh-verlust">${esc(verlust)}</p>
      ${T.fehler.tipp ? `<p class="hn-fh-tipp">${esc(T.fehler.tipp)}</p>` : ''}`, { knopf: 'Weiter', klasse: 'fehler ' + fall, weiter });
  }
  function preisspiegel(ob) {
    const a = ob.art;
    const zeilen = D.viertel.map(v => `<tr${v.id === ob.viertel.id ? ' class="hier"' : ''}><td>${esc(v.name)}</td><td>${HB.euro(D.qmPreis(a.id, v.id))}</td></tr>`).join('');
    SCH.einblendung(`<h3 class="hn-tag">Preisspiegel ${esc(window.KUNDE.ort || '')}</h3>
      <p class="hn-klein">${esc(a.name)} – Preis je m² ${a.jeGrund ? 'Grund' : 'Wohnfläche'}${a.hofGrund ? ` (dazu Hofgrund ${HB.euro(a.hofGrund)} je m²)` : ''}</p>
      <table class="hn-tabelle">${zeilen}</table>
      ${ob.viertel.text ? `<p class="hn-klein"><b>${esc(ob.viertel.name)}:</b> ${esc(ob.viertel.text)}</p>` : ''}
      <p class="hn-klein">Baujahr, Zustand, Energie, Mängel, Pluspunkte und der Markt verschieben den Preis – das lernst du mit jedem Objekt.<br>${esc(T.hinweisSpielLang || T.hinweisSpiel)}</p>`,
      { knopf: 'Schließen', tippZu: true });
  }

  // ---------- (4) Käufer ----------
  // Karte: Name, Zitat, „Sucht“ (Arten, Viertel, Wünsche) und „Nie“ (NoGo-Mängel), Budget. ob.ignoriere blendet ein Kriterium aus,
  // wenn für dieses Objekt kein Profil alle Kriterien erfüllt (spiel.js).
  function kaeuferKarte(k, i, ob) {
    // Korrekturrunde 1: Kriterien als kurze, fette Textzeilen statt vieler kleiner Chips – kompakter (drei Karten passen eher
    // auf den Bildschirm) und besser lesbar; data-k bleibt für die Markierung „woran es scheitert“
    const ig = ob.ignoriere;
    const arten = `<span data-k="art">${esc(k.arten.map(a => D.art(a).name).join(', '))}</span>`;
    const viertel = ig === 'viertel' ? '' : k.viertel ? ` in <span data-k="viertel">${esc(k.viertel.map(v => D.viertelVon(v).name).join(', '))}</span>` : ` – <span data-k="viertel">egal wo</span>`;
    const wuensche = ig === 'wunsch' || !k.wuensche.length ? '' : `<span class="hn-kz"><i>Wunsch:</i> <span data-k="wunsch">${esc(k.wuensche.join(', '))}</span></span>`;
    const nogo = ig === 'nogo' || !k.nogo.length ? '' : `<span class="hn-kz nie" data-k="nogo"><i>Nie:</i> <span>${esc(k.nogo.map(id => M[id].name).join(', '))}</span></span>`;
    return `<button type="button" class="hn-kk" data-i="${i}" style="--i:${i}">
      <span class="fig">${F.svg(k.figur, 'neutral')}</span><span class="txt"><b>${esc(k.name)}</b>
      <span class="zitat">„${esc(k.zitat)}“</span>
      <span class="hn-kz"><i>Sucht:</i> ${arten}${viertel}</span>${wuensche}${nogo}
      <span class="budget">Budget bis ${HB.euro(k.budget)}</span></span></button>`;
  }
  function kaeufer(ob, fertig) {
    const t = tafel(4, T.schrittTitel[3], 'hn-s-kaeufer');
    const bekannt = ob.gefunden.concat(ob.aufgedeckt.filter(id => !ob.gefunden.includes(id)), ob.erwaehnt.filter(id => !ob.gefunden.includes(id) && !ob.aufgedeckt.includes(id)));
    const extras = (ob.daten.extras || []).map(x => `<span class="hn-tchip">${esc(x)}</span>`).join('');
    const maengel = bekannt.filter(id => M[id].typ === 'mangel').map(id => chip(id)).join('');
    KL.szene('buero');
    KL.vorladen(['spannung', 'herz']);
    t.inhalt.innerHTML = `<div class="hn-objzeile"><span class="bild">${SZ.hausSvg(ob.daten.art)}</span>
        <div><b>${esc(ob.art.name)} – ${esc(ob.viertel.name)}</b><div class="hn-tchips">${extras || '<span class="hn-tchip leer">keine Extras</span>'}${maengel}</div>
        <span class="hn-klein">Deine Schätzung ${HB.euro(ob.schaetzung)}</span></div></div>
      <p class="hn-frage-zeile">${esc(T.schrittText[3])}</p>
      <div class="hn-kaeufer">${ob.kaeufer.map((k, i) => kaeuferKarte(k, i, ob)).join('')}</div>`;
    let gewaehlt = false;
    t.inhalt.querySelectorAll('.hn-kk').forEach(b => SCH.tippen(b, () => {
      if (gewaehlt) return;
      gewaehlt = true;
      const i = +b.dataset.i, k = ob.kaeufer[i];
      t.inhalt.querySelectorAll('.hn-kk').forEach((c, j) => {
        c.disabled = true;
        const kk = ob.kaeufer[j];
        if (j === i) c.classList.add('gewaehlt');
        if (kk.art === 'passt') c.classList.add('passt');
        else if (j === i) c.classList.add('falsch');
        // woran es scheitert: Kriterium bzw. Budget markieren
        if (kk.art === 'budget') c.querySelector('.budget').classList.add('zuwenig');
        if (kk.art === 'wunsch' && kk.scheitert) c.querySelectorAll(`[data-k="${kk.scheitert}"]`).forEach(x => x.classList.add('scheitert'));
        c.querySelector('.fig').innerHTML = F.svg(kk.figur, j === i ? (k.art === 'passt' ? 'freut' : 'zweifelt') : 'neutral');
      });
      KL.ton(k.art === 'passt' ? 'kaeufer' : 'fehltipp');
      const satz = k.art === 'passt' ? 'Passt perfekt.' : k.art === 'budget' ? 'Das Budget reicht nicht ganz.' : 'Das Objekt passt nicht zu den Wünschen.';
      const pk = window.HN_SPIEL.punkteKaeufer(k.art);
      t.fuss.innerHTML = `<p class="hn-erg">${satz} <b>+${pk}</b></p>`;
      t.fuss.append(knopf(ob.mitBieter ? 'Zur Bieterrunde' : 'Verkaufen', 'haupt', () => fertig({ wahl: i })));
      window.HN_SPIEL.kaeuferGewaehlt(ob, k);
      // gewählte Karte ganz zeigen (nicht unter dem Scroll-Hinweis oder dem Rand)
      requestAnimationFrame(() => b.scrollIntoView({ block: 'nearest', behavior: HB.ruhig() ? 'auto' : 'smooth' }));
    }));
    aktiv = { test: () => ({ kaeufer: ob.kaeufer.map(k => ({ id: k.id, name: k.name, art: k.art, budget: k.budget, scheitert: k.scheitert || null })) }) };
  }

  // ---------- (5) Bieterrunde in beide Richtungen (Idee MZ, Balancing-Runde 1, 27.10.2026) ----------
  // Die Auktion startet bei der Schätzung des Spielers. Jeder Bieter hat ein verdecktes Limit (spiel.js bieterVorbereiten).
  //  - Schätzung unter dem höchsten Limit → Gebote STEIGEN: wessen Limit unter dem Preis liegt, steigt sichtbar aus („Zu teuer“),
  //    die anderen bieten in kleiner werdenden Schritten bis zum höchsten Limit; dort zögern alle („Hm…“) = Fenster.
  //    Zuschlag im Fenster = bester Moment; vorher = zu früh (weniger, wie bisher); Fenster verpasst = der Höchstbietende steigt
  //    aus, Verkauf an den mit dem zweithöchsten Limit (zum Startpreis, wenn dessen Limit darunter liegt).
  //  - Schätzung über dem höchsten Limit → Gebote SINKEN in Schritten; erreicht der Preis das höchste Limit, ruft dieser Bieter
  //    „Ich nehme es!“ = Fenster. Zuschlag vorher: niemand will – Knopf kurz gesperrt (regeln.bieterSperre, verhindert Dauertippen).
  //    Fenster verpasst = er springt ab, der Preis sinkt weiter bis zum nächsten Limit, Verkauf dort („zu spät“).
  //  - fast exakt (Start nahe am höchsten Limit): kurzes Hin und Her, dann gleich das Fenster.
  // Gebotskurve: von „Deine Schätzung“ (gestrichelt) zum aktuellen Gebot; die Marktwert-Linie erst nach dem Zuschlag (sonst
  // verrät sie das Ziel). Maßstab nur aus den gezeigten Preisen.
  function bieter(ob, fertig) {
    const t = tafel(5, T.schrittTitel[4], 'hn-s-bieter');
    const k = ob.kaeufer[ob.wahl], b = ob.bieter, w = ob.wert, S = T.bieterStatus;
    const leute = [{ name: k.name, figur: k.figur, deiner: true }].concat(ob.mitbieter.map(a => ({ name: a.name, figur: a.figur })))
      .map((l, i) => Object.assign(l, { limit: b.limits[i], raus: false }));
    const rang = leute.map((l, i) => i).sort((x, y) => leute[y].limit - leute[x].limit);
    const iTop = rang[0], top = leute[iTop].limit, iZweit = rang.length > 1 ? rang[1] : -1, zweit = iZweit >= 0 ? leute[iZweit].limit : 0;
    const nah = Math.max(1000, w * R.bieterExakt);
    const richtung = Math.abs(b.start - top) <= nah ? 'exakt' : b.start < top ? 'steigen' : 'sinken';
    t.inhalt.innerHTML = `<div class="hn-gebot"><span class="k">Aktuelles Gebot</span><output class="hn-betrag">${HB.euro(b.start)}</output></div>
      <div class="hn-kurve"><div class="flaeche"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line class="start" x1="0" x2="100" vector-effect="non-scaling-stroke"/><line class="markt" x1="0" x2="100" vector-effect="non-scaling-stroke"/>
          <polyline class="linie" vector-effect="non-scaling-stroke"/></svg>
        <span class="lab start">Deine Schätzung ${HB.euro(b.start)}</span><span class="lab markt">Marktwert ${HB.euro(w)}</span><i class="punkt"></i></div></div>
      <div class="hn-bieterreihe">${leute.map((l, i) => `<div class="hn-bp${l.deiner ? ' deiner' : ''}" data-i="${i}"><span class="blase"></span><span class="fig">${F.svg(l.figur, 'neutral')}</span><b>${esc(l.name)}</b><small>${l.deiner ? 'dein Käufer' : 'bietet mit'}</small></div>`).join('')}</div>
      <p class="hn-klein hn-bieterhinweis">${esc(T.schrittText[4])}</p>`;
    const betrag = t.inhalt.querySelector('.hn-betrag'), personen = t.inhalt.querySelectorAll('.hn-bp'), hinweis = t.inhalt.querySelector('.hn-bieterhinweis');
    const kurve = t.inhalt.querySelector('.hn-kurve');
    const zuschlag = el('button', 'hn-zuschlag'); zuschlag.type = 'button';
    zuschlag.innerHTML = `${ikone('hammer')}<span>${esc(T.ui.zuschlag)}</span>`;
    t.fuss.append(zuschlag);
    const st = { phase: 'warten', uhr: 0.9, preis: b.start, wer: -1, sperre: 0, verlauf: [b.start], hin: 0, aussteiger: [], sieger: -1, markt: false };

    // ---------- Gebotskurve ----------
    function kurveZeichnen() {
      const werte = st.verlauf.concat(st.markt ? [w] : []);
      let lo = Math.min(...werte), hi = Math.max(...werte);
      const pad = Math.max((hi - lo) * 0.18, w * 0.03);
      lo -= pad; hi += pad;
      const y = p => (hi - p) / (hi - lo) * 100;
      const n = Math.max(st.verlauf.length - 1, 7);
      const x = i => 4 + i / n * 88;
      kurve.querySelector('.linie').setAttribute('points', st.verlauf.map((p, i) => x(i).toFixed(2) + ',' + y(p).toFixed(2)).join(' '));
      const ls = kurve.querySelector('line.start'), ys = y(b.start);
      ls.setAttribute('y1', ys); ls.setAttribute('y2', ys);
      const lm = kurve.querySelector('line.markt'), ym = y(w);
      lm.setAttribute('y1', ym); lm.setAttribute('y2', ym);
      const labS = kurve.querySelector('.lab.start'), labM = kurve.querySelector('.lab.markt');
      // Beschriftung neben die Linie, auf der Seite, wo die Kurve nicht verläuft
      const ende = st.verlauf[st.verlauf.length - 1];
      // über bzw. unter der Linie – dort, wo die Kurve nicht verläuft, am Rand immer nach innen
      labS.style.top = ys + '%'; labM.style.top = ym + '%';
      if (!st.markt) labS.classList.toggle('drueber', ys > 72 || (ys > 28 && ende < b.start));
      else {   // nach dem Zuschlag: beide Schilder links, jedes auf der Seite seiner Linie, die von der anderen weg zeigt
        labS.classList.toggle('drueber', ys > 72 || (ys > 28 && ym > ys));
        labM.classList.toggle('drunter', ym < 28 || (ym <= 72 && ym > ys));
      }
      const pk = kurve.querySelector('.punkt');
      pk.style.left = x(st.verlauf.length - 1) + '%'; pk.style.top = y(ende) + '%';
    }
    function preisSetzen(p, wer) {
      st.preis = p; st.verlauf.push(p);
      betrag.textContent = HB.euro(p);
      betrag.classList.remove('tick'); void betrag.offsetWidth; betrag.classList.add('tick');
      if (wer != null && wer >= 0) blase(wer, HB.euro(p));
      kurveZeichnen();
    }
    function blase(i, text, art) {
      const p = personen[i]; if (!p) return;
      const bl = p.querySelector('.blase');
      bl.textContent = text; bl.className = 'blase an ' + (art || '');
      p.classList.remove('hebt'); void p.offsetWidth; p.classList.add('hebt');
    }
    function aussteigen(i, text) {
      if (leute[i].raus) return;
      leute[i].raus = true;
      blase(i, text || 'Zu teuer', 'raus');
      personen[i].classList.add('raus');
      personen[i].querySelector('small').textContent = leute[i].deiner ? 'dein Käufer – raus' : 'ausgestiegen';
    }
    const aktive = () => leute.map((l, i) => i).filter(i => !leute[i].raus);
    const status = text => { hinweis.textContent = text; };

    function fenster(i) {
      st.phase = 'fenster'; st.uhr = b.fenster; st.wer = i;
      if (richtung === 'sinken') {
        blase(i, 'Ich nehme es!', 'zugriff');
        personen[i].classList.add('zugriff');
        status(S.zugriff);
      } else {
        aktive().forEach((j, n) => blase(j, ['Hm…', 'Puh…', 'Na ja…'][n % 3], 'zoegern'));
        status(S.zoegern);
      }
      t.p.classList.add('zoegern');
      KL.gebot(1);    // Höchstgebot bzw. Zugriff …
      KL.zoegern();   // … dann stockt die Musik, Herzschlag
    }
    function beenden(art) {
      if (st.phase === 'fertig') return;
      st.phase = 'fertig';
      zuschlag.disabled = true;
      t.p.classList.remove('zoegern');
      let preis = st.preis, q = 0, sieger = st.wer >= 0 ? st.wer : iTop;
      if (art === 'fenster') { preis = st.preis; q = 1; sieger = st.wer; }
      else if (art === 'frueh') q = richtung === 'exakt' ? (st.verlauf.length > 1 ? 0.5 : 0) : (st.preis - b.start) / Math.max(1, top - b.start);
      else if (art === 'spaet') { preis = st.preis; sieger = st.sieger; }
      st.sieger = sieger;
      const erg = { preis, art, q: Math.max(0, Math.min(1, q)), richtung, an: sieger >= 0 ? leute[sieger].name : '' };
      const pk = window.HN_SPIEL.punkteBieter(erg);
      // Zuschlag = Auktionshammer (zwei Schläge), dann Verkauft-Stempel und Kasse; zu spät: Fehltipp-Klang, verkauft wird trotzdem
      KL.schluss();
      KL.ton(art === 'spaet' ? 'fehltipp' : 'zuschlag');
      const stempelNach = art === 'spaet' ? 0.6 : 0.75;
      KL.ton('stempel', { verzoegerung: stempelNach });
      KL.ton('kasse', { verzoegerung: stempelNach + 0.5 });
      t.p.classList.add('zuschlag-' + art);
      if (sieger >= 0) { personen[sieger].classList.add('sieger'); if (art !== 'spaet') blase(sieger, 'Meins!', 'zugriff'); }
      betrag.textContent = HB.euro(preis);
      if (st.verlauf[st.verlauf.length - 1] !== preis) st.verlauf.push(preis);
      st.markt = true; kurve.classList.add('aufgedeckt'); kurveZeichnen();   // jetzt erst die Marktwert-Linie
      const satz = art === 'fenster' ? (richtung === 'sinken' ? T.bieterSatz.fensterSinkend : T.bieterSatz.fenster)
        : art === 'spaet' ? (richtung === 'sinken' ? T.bieterSatz.spaetSinkend : T.bieterSatz.spaet) : T.bieterSatz.frueh;
      status('');
      t.fuss.innerHTML = `<p class="hn-erg">${art === 'fenster' ? 'Bester Moment' : art === 'spaet' ? 'Zu lange gewartet' : 'Etwas zu früh'} – verkauft für ${HB.euro(preis)} <b>+${pk}</b></p>` +
        (satz ? `<p class="hn-erg-satz ${art}">${esc(satz)}</p>` : '');
      t.fuss.append(knopf('Zum Exposé', 'haupt', () => fertig(erg)));
      // Stempel mit seinem Klang (nach dem zweiten Hammerschlag) – in der Gebotskurve, verdeckt weder Namen noch Hinweistext
      setTimeout(() => { if (t.p.isConnected) kurve.insertAdjacentHTML('beforeend', '<div class="hn-stempel verkauft">Verkauft</div>'); }, stempelNach * 1000);
    }
    // Zuschlag zählt schon beim Aufsetzen des Fingers (Reaktionsknopf) und ist von Anfang an aktiv (Korrekturrunde 2).
    const hauen = () => {
      if (st.phase === 'fertig' || st.sperre > 0) return;
      if (st.phase === 'fenster') { beenden('fenster'); return; }
      if (st.phase === 'zweiter') { beenden('spaet'); return; }
      if (richtung === 'sinken') {
        // noch greift keiner zu: kurz gesperrt statt verkauft (wer dauernd tippt, verpasst so leicht das Fenster)
        st.sperre = R.bieterSperre;
        zuschlag.classList.add('gesperrt');
        status(T.bieterSatz.nochKeiner);
        KL.ton('fehltipp'); window.Rahmen.vibrieren(30);
        return;
      }
      beenden('frueh');
    };
    zuschlag.addEventListener('pointerdown', ev => { if (ev.pointerType === 'mouse' && ev.button !== 0) return; ev.preventDefault(); hauen(); });
    zuschlag.addEventListener('click', hauen);
    personen.forEach((p, i) => blase(i, richtung === 'sinken' ? 'Zu teuer' : i === 0 ? 'Ich biete mit.' : 'Ich auch.', 'leise'));
    kurveZeichnen();
    KL.szene('bieter');
    // Schritte werden kleiner (40 % des Rests), ab 1,2 % des Marktwerts Abstand ist das Limit erreicht (sonst lange Schlange
    // von 1.000-€-Schritten am Ende)
    const schrittweite = rest => Math.max(1000, D.rund(rest * 0.4, 1000));
    const ziel = Math.max(2000, w * 0.012);
    aktiv = {
      schritt(dt) {
        if (st.phase === 'fertig') return;
        if (st.sperre > 0) { st.sperre -= dt * tempo; if (st.sperre <= 0) { zuschlag.classList.remove('gesperrt'); status(richtung === 'sinken' && st.phase !== 'fenster' ? S.sinken : hinweis.textContent); } }
        st.uhr -= dt * tempo;
        if (st.uhr > 0) return;
        switch (st.phase) {
          case 'warten':
            if (richtung === 'sinken') { st.phase = 'sinken'; status(S.sinken); st.uhr = 0; return; }
            // wessen Limit schon unter dem Startpreis liegt, steigt nacheinander aus („Zu teuer“)
            st.aussteiger = leute.map((l, i) => i).filter(i => i !== iTop && leute[i].limit < b.start);
            st.phase = 'aussteigen'; st.uhr = 0; status(S.steigen);
            return;
          case 'aussteigen':
            if (st.aussteiger.length) { aussteigen(st.aussteiger.shift()); st.uhr = 0.45; return; }
            st.phase = richtung === 'exakt' ? 'hin' : 'steigen'; st.uhr = b.takt * 0.6;
            return;
          case 'hin': {   // fast exakt: ein Gebot dazwischen, dann gleich das Fenster
            if (st.hin++ === 0 && Math.abs(top - b.start) >= 1000) {
              const andere = aktive().filter(i => i !== iTop), wer = andere.length ? andere[0] : iTop;
              preisSetzen(D.rund((b.start + top) / 2, 1000), wer); KL.gebot(0.5); st.uhr = b.takt; return;
            }
            preisSetzen(top, iTop); fenster(iTop);
            return;
          }
          case 'steigen': {
            const rest = top - st.preis;
            if (rest <= ziel) { preisSetzen(top, iTop); fenster(iTop); return; }
            const neu = Math.min(top, st.preis + schrittweite(rest));
            // Limit überschritten: diese Bieter steigen erst aus, geboten wird im nächsten Takt
            const zuTeuer = aktive().filter(i => i !== iTop && leute[i].limit < neu);
            if (zuTeuer.length) { zuTeuer.forEach(i => aussteigen(i)); st.uhr = b.takt; return; }
            if (neu >= top) { preisSetzen(top, iTop); fenster(iTop); return; }
            const a = aktive(), wer = a.length > 1 ? a.filter(i => i !== st.wer)[Math.floor(Math.random() * (a.length - 1))] : a[0];
            st.wer = wer;
            preisSetzen(neu, wer);
            KL.gebot((neu - b.start) / Math.max(1, top - b.start));   // Gebot; Spannung steigt
            st.uhr = b.takt;
            return;
          }
          case 'sinken': case 'nachrutschen': {
            const zielP = st.phase === 'sinken' ? top : zweit, zielI = st.phase === 'sinken' ? iTop : iZweit;
            const rest = st.preis - zielP;
            if (rest <= ziel) {
              preisSetzen(zielP);
              if (st.phase === 'sinken') { fenster(zielI); return; }
              // zu spät: der Nächste greift zu, verkauft wird dort (kurz zu sehen, dann von selbst)
              st.phase = 'zweiter'; st.wer = zielI; st.sieger = zielI; st.uhr = 0.7;
              blase(zielI, 'Ich nehme es!', 'zugriff');
              return;
            }
            preisSetzen(Math.max(zielP, st.preis - schrittweite(rest)));
            const a = aktive().filter(i => i !== zielI), wer = a.length ? a[Math.floor(Math.random() * a.length)] : zielI;
            blase(wer, ['Zu teuer', 'Noch zu viel', 'Nein…'][st.verlauf.length % 3], 'leise');
            KL.gebot((b.start - st.preis) / Math.max(1, b.start - top));
            st.uhr = b.takt;
            return;
          }
          case 'fenster':
            t.p.classList.remove('zoegern');
            if (richtung === 'sinken' && iZweit >= 0) {
              // zu spät: er springt ab, der Preis sinkt weiter bis zum nächsten Limit
              aussteigen(st.wer, 'Doch nicht…');
              personen[st.wer].classList.remove('zugriff');
              st.phase = 'nachrutschen'; st.uhr = b.takt * 0.6; status(S.sinken);
              return;
            }
            // steigend: der Höchstbietende steigt aus, Verkauf an den mit dem zweithöchsten Limit (sonst zum Startpreis)
            aussteigen(iTop, 'Ich bin raus.');
            st.sieger = iZweit >= 0 && zweit >= b.start ? iZweit : -1;
            st.preis = Math.max(zweit, b.start);
            beenden('spaet');
            return;
          case 'zweiter':
            beenden('spaet');
            return;
          default:
        }
      },
      test: () => ({ phase: st.phase, richtung, preis: st.preis, start: b.start, spitze: top, top, zweit, limits: leute.map(l => l.limit), raus: leute.map(l => l.raus), rest: st.uhr, sperre: st.sperre, verlauf: st.verlauf.slice(), sieger: st.sieger }),
    };
  }

  // ---------- Zwischenscreens vor jedem Schritt (nur beim ersten Objekt, MZ 27.10.2026, Skizze zwischenscreen.png) ----------
  // Tafel mit Band (Titel ohne Artikel), „Schritt X von 5“, kleines Bild, Text (MZ), fünf Fortschrittspunkte, „Verstanden“.
  // Schritt 5 enthält die frühere Bieter-Erklärung (Signale „Hm…“ und „Ich nehme es!“, Knopf leuchtet).
  function infoBild(nr, ob) {
    const bild = p => D.bild(p);
    if (nr === 1) {
      return `<div class="hn-ib hn-ib-anruf"><span class="fig hn-portrait">${F.svg(ob.eigentuemer.figur, 'neutral')}</span>
        <span class="haus">${SZ.hausSvg(ob.daten.art)}<span class="hn-schild">Wunschpreis ${HB.euro(ob.wunsch)}</span></span></div>`;
    }
    if (nr === 2) {
      // Wohnzimmer mit einem Mangel (Einfachverglasung) und einem Pluspunkt (Kachelofen), Lage wie im Spiel (szene.js ORTE)
      const raum = bild('raeume/wohnzimmer'), m = bild('merkmale/M08'), p = bild('merkmale/P07');
      const stueck = (src, x, y, bw, bh, art) => src ? `<img src="${src}" alt="" style="left:${(x - bw / 2) / 4}%;top:${(y - bh / 2) / 3}%;width:${bw / 4}%;height:${bh / 3}%">` +
        `<i class="ring ${art}" style="left:${(x - bw / 2) / 4 - 1}%;top:${(y - bh / 2) / 3 - 1.5}%;width:${bw / 4 + 2}%;height:${bh / 3 + 3}%"></i>` : '';
      return `<div class="hn-ib hn-ib-raum">${raum ? `<img class="hg" src="${raum}" alt="">` : SZ.hausSvg(ob.daten.art)}${stueck(m, 85, 100, 110, 120, 'minus')}${stueck(p, 359, 164, 76, 130, 'plus')}</div>`;
    }
    if (nr === 3) {
      return `<div class="hn-ib hn-ib-preis"><div class="hn-ib-regler"><b>${HB.euro(ob.wunsch)}</b><span class="schiene"><i></i></span></div>
        <div class="hn-ib-chips">${['grundriss', 'stadtplan', 'baujahr'].map(h => `<span>${esc(T.hinweise[h].name || h)}<em>−${R.hinweisKosten}</em></span>`).join('')}</div></div>`;
    }
    if (nr === 4) {
      // Muster mit fremden Profilen (nicht die echten Karten – sonst verrät das Bild die Lösung)
      const fremd = D.kaeufer.filter(x => !(ob.kaeufer || []).some(y => y.id === x.id)).slice(0, 40);
      const drei = [0, 1, 2].map(i => fremd[(ob.nr * 7 + i * 11) % fremd.length]).filter(Boolean);
      return `<div class="hn-ib hn-ib-kaeufer">${drei.map((x, i) => `<span class="k${i === 1 ? ' passt' : ''}"><span class="fig hn-portrait">${F.svg(F.kaeufer(x), 'neutral')}</span></span>`).join('')}</div>`;
    }
    const k = ob.kaeufer && ob.kaeufer[ob.wahl], leute = (k ? [k] : []).concat(ob.mitbieter || []).slice(0, 3);
    return `<div class="hn-ib hn-ib-bieter zoegern"><div class="hn-bieterreihe">${leute.map((l, i) => `<div class="hn-bp${i === 0 ? ' deiner' : ''}"><span class="blase an ${i === leute.length - 1 && leute.length > 1 ? 'zugriff' : 'zoegern'}">${i === leute.length - 1 && leute.length > 1 ? 'Ich nehme es!' : ['Hm…', 'Puh…'][i % 2]}</span><span class="fig">${F.svg(l.figur, 'zweifelt')}</span></div>`).join('')}</div>
      <div class="hn-zuschlag hn-zuschlag-muster">${ikone('hammer')}<span>${esc(T.ui.zuschlag)}</span></div></div>`;
  }
  function info(nr, ob, weiter) {
    const E = T.bieterErklaerung;
    const punkte = [1, 2, 3, 4, 5].map(i => `<i class="${i === nr ? 'an' : i < nr ? 'durch' : ''}"></i>`).join('');
    const extra = nr === 5 && (E.text || E.tipp) ? `<p class="hn-info-tipp">${esc(E.text)}${E.tipp ? ' ' + esc(E.tipp) : ''}</p>` : '';
    SCH.einblendung(`<div class="hn-tag">${esc(T.schrittTitel[nr - 1])}</div><div class="hn-info-nr">Schritt ${nr} von 5</div>
      ${infoBild(nr, ob)}<p class="hn-info-text">${esc(T.info[nr - 1])}</p>${extra}<div class="hn-info-punkte" aria-hidden="true">${punkte}</div>`,
    { knopf: T.infoKnopf || 'Verstanden', klasse: 'info info-' + nr, weiter });
  }

  // ---------- Exposé nach jedem Objekt ----------
  function expose(ob, fertig, letzter) {
    const t = tafel(0, ob.ladenhueter ? T.ladenhueter : ob.unterWert ? T.unterWert : 'Verkauft', 'hn-s-expose' + (ob.ladenhueter ? ' laden' : ob.unterWert ? ' unterwert' : ''));
    const p = ob.punkte, summe = p.schaetzung + p.besichtigung + p.kaeufer + p.bieter;
    const rech = ob.rechnung, o = ob.daten;
    const posten = rech.posten.map(x => `<li><span>${esc(x.name)}</span><b class="${x.wert > 0 ? 'plus' : x.wert < 0 ? 'minus' : ''}">${HB.vorzeichen(x.wert * 100)}</b></li>`).join('');
    const basis = `<li><span>${HB.zahl(rech.flaeche)} m² × ${HB.euro(rech.qm)}</span><b>${HB.euro(rech.flaeche * rech.qm)}</b></li>` +
      (rech.hof ? `<li><span>Hofgrund ${HB.zahl(rech.grundstueck)} m² × ${HB.euro(rech.hofGrund)}</span><b>${HB.euro(rech.hof)}</b></li>` : '');
    const versteckt = ob.verschwiegen ? `<p class="hn-verschwiegen${ob.gefunden.includes(ob.verschwiegen) ? ' ja' : ''}"><b>Verschwiegen:</b> ${esc(M[ob.verschwiegen].name)} – ${ob.gefunden.includes(ob.verschwiegen) ? 'entdeckt' + (ob.bonus ? ` <b>+${HB.euro(ob.bonus)}</b>` : '') : 'übersehen'}</p>` : '';
    // Kopf wie die Hinweis-Screens (MZ, Variante a): Eigentümer mit Sprechblase, Schätzung/Marktwert(/Verkaufspreis), Skala –
    // einheitlich für Verkauft, Unter Wert und Ladenhüter; darunter wie bisher Objekt, Rechnung, Punkte, Provision
    t.inhalt.innerHTML = `${bilanzKopf(ob)}
      <div class="hn-expo-gross"><div class="bild">${SZ.hausSvg(o.art)}<span class="hn-stempel${ob.ladenhueter ? ' grau' : ob.unterWert ? ' unterwert' : ''}">${ob.ladenhueter ? esc(T.ladenhueter) : ob.unterWert ? esc(T.unterWertKurz) : 'Verkauft'}</span></div>
        <div class="daten"><b>${esc(o.titel)}</b><span class="art">${esc(ob.art.name)} – ${esc(ob.viertel.name)}</span>
        ${ob.ladenhueter ? '<span>nicht verkauft</span>' : ob.unterWert ? `<span>Verkauft für <b>${HB.euro(ob.verkauf.preis)}</b> – unter Wert</span>` : ob.verkauf.an ? `<span>an ${esc(ob.verkauf.an)}</span>` : ''}</div></div>
      <p class="hn-beschreibung">${esc(o.beschreibung)}</p>
      ${versteckt}
      <details class="hn-rechnung"${window.innerHeight >= 800 ? ' open' : ''}><summary>So kommt der Preis zustande</summary>
        <ul>${basis}${posten}
        <li class="summe"><span>Marktwert (gerundet)</span><b>${HB.euro(rech.preis)}</b></li></ul></details>
      <ul class="hn-punktliste">
        <li><span>Schätzung</span><b>${p.schaetzung}</b><i>/${R.punkte.schaetzung}</i></li>
        <li><span>Besichtigung</span><b>${p.besichtigung}</b><i>/${R.punkte.besichtigung}</i></li>
        <li><span>Käufer${ob.unterWert ? ' (entfällt)' : ''}</span><b>${p.kaeufer}</b><i>/${R.punkte.kaeufer}</i></li>
        <li><span>${ob.mitBieter || ob.ladenhueter ? 'Bieterrunde' : 'Verkauf'}${ob.unterWert ? ' (unter Wert)' : ''}</span><b>${p.bieter}</b><i>/${R.punkte.bieter}</i></li>
        <li class="summe"><span>Objekt ${ob.nr}</span><b>${summe}</b><i>/100</i></li></ul>
      ${ob.ladenhueter ? '' : `<p class="hn-provzeile${ob.unterWert ? ' halb' : ''}">${SCH.SCHEIN} Provision <b>+${HB.euro(ob.provision)}</b></p>`}
      ${ob.unterWert ? `<p class="hn-provhalb">${esc(T.unterWertProvision)}</p>` : ''}`;
    t.fuss.append(knopf(letzter ? 'Zum Ergebnis' : 'Nächstes Objekt', 'haupt', () => fertig()));
    KL.szene('buero');
    // ohne Bieterrunde verkauft: Stempel und Kasse hier (nach einer Bieterrunde kamen sie schon beim Zuschlag)
    if (!ob.ladenhueter && !ob.mitBieter) { KL.ton('stempel', { verzoegerung: 0.15 }); KL.ton('kasse', { verzoegerung: 0.65 }); }
    aktiv = null;
  }

  window.HN_SCHRITTE = {
    anruf, besichtigung, schaetzen, kaeufer, bieter, info, expose, stufe, bilanzKopf,
    schritt(dt) { if (aktiv && aktiv.schritt) aktiv.schritt(dt); },
    groesse() { if (aktiv && aktiv.groesse) aktiv.groesse(); },
    test() { return aktiv && aktiv.test ? aktiv.test() : null; },
    setzen(v) { if (aktiv && aktiv.setzen) aktiv.setzen(v); },
    leeren() { aktiv = null; SCH.buehne.querySelectorAll('.hn-panel').forEach(p => p.remove()); },
    set tempo(v) { tempo = v > 0 ? v : 1; },
  };
})();
