// „Hammerpreis“ – eigene Schirme über dem Rahmen: Start- und Endbild Stil 1 „Knall-Karte“ (MZ, 26.10.2026), Logo-Schild
// oben links, Kopfzeile im Spiel (Objekt, Provision heute, Ladenhüter, Tagesauftrag), Sprechblasen der Makler-Figur und der
// Konkurrenz, Einblendungen (Tagesauftrag, Markt-Ereignis), Exposé-Mappe. Die Schirme des Rahmens sind per CSS aus; der
// Rahmen speichert weiter den Bestwert (Rahmen.ende). Texte aus daten.js (HN.texte), Kundendaten aus kunde.js.
(function () {
  'use strict';
  const HB = window.HNB, D = window.HN, T = D.texte, F = window.HN_FIGUREN, SZ = window.HN_SZENE;
  const $ = s => document.querySelector(s);
  const el = (tag, klasse, html) => { const e = document.createElement(tag); if (klasse) e.className = klasse; if (html != null) e.innerHTML = html; return e; };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const STERN = 'M50 2l9 22 22-12-6 24 23 4-19 15 15 19-24-2 1 24-17-17-14 20-4-24-23 7 12-21L2 50l23-8L14 21l24 5z';
  const SCHEIN = '<svg class="hn-schein" viewBox="0 0 24 16" aria-hidden="true"><rect x="1" y="1" width="22" height="14" rx="2" fill="#7fc98a" stroke="#16181d" stroke-width="1.6"/><circle cx="12" cy="8" r="3.4" fill="#fff" stroke="#16181d" stroke-width="1.2"/><path d="M4 4h2M18 12h2" stroke="#16181d" stroke-width="1.4"/></svg>';
  const HAUS = '<svg viewBox="0 0 20 18" aria-hidden="true"><path d="M2 9 10 2l8 7v8H2z"/></svg>';
  const K = HB.K;

  // ---------- Grundgerüst ----------
  const logo = el('div', 'hn-logo'); logo.setAttribute('aria-hidden', 'true');
  HB.logoEinbetten(logo, K.logoAufHell || K.logo);
  const hud = el('div', 'hn-hud');
  hud.innerHTML = `<span class="hn-chip hn-objekt"><span class="wort">Objekt</span> <b>1/10</b></span>` +
    `<span class="hn-chip hn-prov" title="${esc(T.ui.provision)}" aria-label="${esc(T.ui.provision)}">${SCHEIN}<b>0&nbsp;€</b></span>` +
    `<span class="hn-chip hn-laden" title="Ladenhüter">${HAUS}${HAUS}${HAUS}</span>` +
    `<span class="hn-chip hn-auftrag" hidden></span>`;
  hud.hidden = true;
  const buehne = el('main', 'hn-buehne');
  const sprecher = { ich: el('div', 'hn-sprecher ich'), konkurrenz: el('div', 'hn-sprecher konkurrenz') };
  Object.values(sprecher).forEach(s => { s.innerHTML = '<span class="fig"></span><span class="blase"></span>'; s.setAttribute('aria-live', 'polite'); });
  const start = el('section', 'hn-schirm hn-start'), ende = el('section', 'hn-schirm hn-ende');
  const einbl = el('section', 'hn-einblendung');
  start.hidden = ende.hidden = einbl.hidden = true;
  document.body.append(buehne, hud, sprecher.ich, sprecher.konkurrenz, start, ende, einbl, logo);
  const hintergrund = '<div class="hn-strahlen" aria-hidden="true"></div>';

  // ---------- Antippen, das nie verloren geht (Korrekturrunde 2, Fund „Weiter reagiert nicht“) ----------
  // Ursache (nachgestellt 27.10.2026): Knöpfe verschieben sich beim Darüberfahren (translate/rotate) und beim Drücken
  // (:active, 3 px nach rechts unten). Lag der Klick am Rand, landete das Loslassen neben dem Knopf – der Browser schickt den
  // „click“ dann an das gemeinsame Elternelement, der Knopf merkt nichts. tippen() löst deshalb schon beim Loslassen aus,
  // wenn Finger/Maus auf dem Knopf aufgesetzt hat und nahe bei ihm losgelassen wird (Wischen/Scrollen = pointercancel =
  // nichts). „click“ zählt nur ohne Zeiger (Tastatur, el.click(): detail 0) – sonst käme beim Antippen am Handy der späte
  // „click“ des Fingers beim NÄCHSTEN Knopf an derselben Stelle an (z. B. Zuschlag → sofort „Zum Exposé“, nachgestellt
  // 27.10.2026). Doppeltes Auslösen verhindert zusätzlich eine Sperre von 400 ms.
  function tippen(el, fn) {
    let zuletzt = -1e9;
    const los = ev => { const j = performance.now(); if (j - zuletzt < 400 || el.disabled) return; zuletzt = j; fn(ev); };
    el.addEventListener('pointerdown', ev => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      const id = ev.pointerId;
      const weg = () => { removeEventListener('pointerup', auf, true); removeEventListener('pointercancel', auf, true); };
      function auf(e) {
        if (e.pointerId !== id) return;
        weg();
        if (e.type !== 'pointerup' || !el.isConnected) return;
        const r = el.getBoundingClientRect(), RAND = 14;
        if (e.clientX >= r.left - RAND && e.clientX <= r.right + RAND && e.clientY >= r.top - RAND && e.clientY <= r.bottom + RAND) los(e);
      }
      addEventListener('pointerup', auf, true); addEventListener('pointercancel', auf, true);
    });
    el.addEventListener('click', ev => { if (ev.detail === 0) los(ev); });
  }

  let knoepfe = {};
  function knopfBinden(wurzel) {
    wurzel.querySelectorAll('[data-aktion]').forEach(b => tippen(b, () => {
      const a = b.dataset.aktion;
      if (a === 'menue') { location.href = K.startseite || '../'; return; }
      if (knoepfe[a]) knoepfe[a]();
    }));
  }

  // ---------- Startbild ----------
  function startZeigen(o) {
    const fig = HB.figur();
    start.innerHTML = hintergrund + `<div class="hn-mitte">
      <div class="hn-figur-oben">${F.svg(fig, 'freut')}</div>
      <div class="hn-karte">
        <h1 class="hn-band">${esc(K.texte && K.texte.titel || T.titel)}</h1>
        <div class="hn-frage"><span class="hn-blase">${esc(K.texte && K.texte.frage || o.frage || T.fragen[0])}</span></div>
        <p class="hn-anl">${esc(K.texte && K.texte.anleitung || T.anleitung)}</p>
        <div class="hn-best">${esc(T.ui.score)} <b>${HB.zahl(o.best || 0)}/1.000</b> Punkte</div>
        <button class="hn-kn haupt" type="button" data-aktion="los">Los geht’s</button>
        <button class="hn-kn neben" type="button" data-aktion="menue">Zum Menü</button>
        <p class="hn-klein">${esc(T.hinweisSpiel)}</p>
      </div></div>`;
    knopfBinden(start);
    ende.hidden = true; start.hidden = false;
    frageEinpassen();
    if (window.HN_KLANG) window.HN_KLANG.szene('start');   // Musik der Sammlung im Startbild
  }
  // Startbild-Frage immer einzeilig (QA S3): Schrift so weit verkleinern, dass sie in die Karte passt (bis 12,5 px). Passt die
  // gewählte Frage selbst dann nicht (z. B. 320 px), nimmt das Startbild eine kürzere der Varianten; zur Not 11 px.
  let frageWahl = null;
  function frageEinpassen() {
    const b = start.querySelector('.hn-frage .hn-blase');
    if (!b || start.hidden) return;
    const eigene = K.texte && K.texte.frage;
    if (frageWahl == null) frageWahl = b.textContent;
    const kandidaten = eigene ? [eigene] : [frageWahl].concat(T.fragen.filter(f => f !== frageWahl).sort((x, y) => x.length - y.length));
    const passend = text => {
      b.textContent = text; b.style.fontSize = '';
      const cs = getComputedStyle(b), rand = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const platz = b.parentNode.clientWidth - rand - 8, breite = b.scrollWidth - rand;
      return breite <= platz ? parseFloat(cs.fontSize) : parseFloat(cs.fontSize) * platz / breite - 0.2;
    };
    for (const text of kandidaten) {
      const gr = passend(text);
      if (gr >= 12.5) { b.style.fontSize = gr.toFixed(1) + 'px'; return; }
    }
    const kurz = kandidaten.slice().sort((x, y) => x.length - y.length)[0];
    b.style.fontSize = Math.max(11, passend(kurz)).toFixed(1) + 'px';
  }
  addEventListener('resize', frageEinpassen);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(frageEinpassen);

  // ---------- Endbild ----------
  // e = { punkte, stufe (0–4, Abbruch null), bewertung, abbruch, provision, bilanz, mappe: [{ art, name, verkauft, preis }], bestText, neu, text }
  function endeZeigen(e) {
    const kn = Object.assign({ text: esc(T.kundenknopf).replace(/\*([^*]+)\*/g, '<u>$1</u>') }, K.knopf || {});
    const kunde = kn.text ? (kn.link ? `<a class="hn-kn kunde" href="${esc(kn.link)}" target="_blank" rel="noopener">${kn.text}</a>`
      : `<div class="hn-kn kunde" aria-disabled="true">${kn.text}</div>`) : '';
    // Häuserleiste: verkauft = Haken-Plakette in der Ecke (kein Querbalken mehr, der wirkte wie Durchstreichen – QA S3),
    // unter Wert = Plakette mit Pfeil nach unten, Ladenhüter = grau und durchgestrichen
    const mappe = (e.mappe || []).map((m, i) => `<span class="hn-mini${m.unterWert ? ' u' : m.verkauft ? ' v' : m.verkauft === false ? ' l' : ''}" style="--i:${i}" title="${esc(m.name || '')}">${m.art ? SZ.hausSvg(m.art) : ''}</span>`).join('');
    // Comic-Hammer je Bewertungsstufe haut in den Punkte-Stern (MZ, 27.10.2026); Stufe 5 fällt daneben, Abbruch ohne Hammer
    const hb = !e.abbruch && e.stufe != null ? D.bild('hammer/stufe-' + (e.stufe + 1)) : null;
    const hammer = hb ? `<img class="hn-hammer" src="${hb}" alt="" draggable="false">` : '';
    ende.innerHTML = hintergrund + `<div class="hn-mitte">
      <div class="hn-knallpunkte${e.abbruch ? ' null' : ''}${hammer ? ' mit-hammer s' + (e.stufe + 1) : ''}"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="${STERN}"/></svg>${hammer}
        <div class="hn-pz"><div class="hn-punkte${e.punkte >= 1000 ? ' lang' : ''}">${HB.zahl(e.punkte)}</div><div class="hn-von">/1.000 Punkte</div></div></div>
      <div class="hn-karte">
        <h1 class="hn-band${String(e.bewertung).length > 15 ? ' lang' : ''}">${esc(e.bewertung)}</h1>
        ${e.provision ? `<div class="hn-plakettenreihe"><span class="hn-plakette">${SCHEIN}${HB.euro(e.provision)} Provision</span></div>` : ''}
        <p class="hn-bilanz">${esc(e.bilanz)}</p>
        ${e.text ? `<p class="hn-klein hn-abschluss">${esc(e.text)}</p>` : ''}
        ${e.auftrag ? `<p class="hn-auftragzeile${e.auftrag.erfuellt ? ' ja' : ''}">${esc(e.auftrag.text)}</p>` : ''}
        ${mappe ? `<button class="hn-mappe-reihe" type="button" data-aktion="mappe" aria-label="Exposé-Mappe ansehen">${mappe}</button>` : ''}
        <div class="hn-best${e.neu ? ' neu' : ''}">${e.bestText}</div>
        ${kunde && e.einladung && !e.abbruch ? `<p class="hn-einladung">${esc(e.einladung)}</p>` : ''}
        ${kunde}
        <div class="hn-reihe2">
          <button class="hn-kn ${e.abbruch ? 'haupt' : 'neben'}" type="button" data-aktion="nochmal">Nochmal</button>
          <button class="hn-kn neben" type="button" data-aktion="menue">Zum Menü</button>
        </div>
      </div></div>`;
    knopfBinden(ende);
    start.hidden = true; ende.hidden = false;
    hammerPlatz();
    // Ton: Knall-Stern ploppt, Hammer der Stufe haut hinein (Stufe 5 fällt daneben), Fanfare, danach wieder die Musik
    if (window.HN_KLANG) window.HN_KLANG.ende(e.abbruch ? null : e.stufe, !!e.abbruch, HB.ruhig());
  }

  // Hammer im Endbild ganz sichtbar halten (Phase 4): Stufe 1–4 ragen links über den Stern hinaus – reicht der Platz bis zum
  // Bildschirmrand nicht, rückt der Hammer nach rechts. Stufe 5 fällt daneben: Endlage links neben dem Stern, über dem Band,
  // im Bild (CSS-Variablen --fx/--fy/--fr der Animation hnHammerFaellt). Lage ohne Animations-Versatz aus offset* gerechnet.
  function hammerPlatz() {
    const kp = ende.querySelector('.hn-knallpunkte.mit-hammer'), img = kp && kp.querySelector('.hn-hammer');
    if (!img || ende.hidden) return;
    if (!img.complete || !img.naturalWidth) { img.addEventListener('load', hammerPlatz, { once: true }); return; }
    const pos = e => { let x = 0, y = 0; while (e && e !== ende) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y }; };
    const RAND = 6, W = kp.offsetWidth, k = pos(kp);
    img.style.left = '';
    const st = getComputedStyle(img), links = parseFloat(st.left), oben = parseFloat(st.top), w = img.offsetWidth, h = img.offsetHeight;
    if (!kp.classList.contains('s5')) {
      if (k.x + links < RAND) img.style.left = (RAND - k.x).toFixed(1) + 'px';
      return;
    }
    const fr = -20, a = fr * Math.PI / 180;
    const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)), bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
    // links neben dem Stern (rechte Kante bei ca. 18 % der Sternbreite), aber nicht über den Bildschirmrand
    const cx = Math.max(0.18 * W - bw / 2, RAND - k.x + bw / 2);
    // unten: über dem Band, wenn es unter dem Stern liegt (Hochformat), sonst an der Unterkante des Sterns (Querformat)
    const band = ende.querySelector('.hn-band'), bp = band ? pos(band) : null;
    const bandDrunter = bp && bp.x < k.x + W * 0.3 && bp.y > k.y + W * 0.5;
    const unten = bandDrunter ? bp.y - k.y - 6 : W * 0.96;
    const cy = Math.max(h * 0.3, unten - bh / 2);
    img.style.setProperty('--fx', (cx - (links + w / 2)).toFixed(1) + 'px');
    img.style.setProperty('--fy', (cy - (oben + h / 2)).toFixed(1) + 'px');
    img.style.setProperty('--fr', fr + 'deg');
    // „Bewegung reduzieren“: gleich in der Endlage (die verkürzte Animation übernimmt die Variablen nicht zuverlässig)
    if (HB.ruhig()) { img.style.animation = 'none'; img.style.opacity = '1'; img.style.transform = 'translate(' + (cx - (links + w / 2)).toFixed(1) + 'px, ' + (cy - (oben + h / 2)).toFixed(1) + 'px) rotate(' + fr + 'deg)'; }
  }
  addEventListener('resize', () => { if (!ende.hidden) hammerPlatz(); });

  // ---------- Kopfzeile ----------
  const hudApi = {
    zeigen(an) { hud.hidden = !an; document.documentElement.classList.toggle('hn-imspiel', !!an); },
    objekt(n, gesamt) { hud.querySelector('.hn-objekt').innerHTML = `<span class="wort">Objekt</span> <b>${n}/${gesamt || 10}</b>`; },
    provision(betrag, animiert) {
      const b = hud.querySelector('.hn-prov b'), chip = hud.querySelector('.hn-prov');
      const von = +(b.dataset.wert || 0), bis = Math.round(betrag);
      b.dataset.wert = bis;
      if (!animiert || HB.ruhig()) { b.textContent = HB.euro(bis); return; }
      const t0 = performance.now(), dauer = 900;
      chip.classList.remove('plus'); void chip.offsetWidth; chip.classList.add('plus');
      (function lauf(j) { const p = Math.min(1, (j - t0) / dauer); b.textContent = HB.euro(von + (bis - von) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(lauf); })(t0);
    },
    ladenhueter(n, warnung) {
      hud.querySelectorAll('.hn-laden svg').forEach((s, i) => s.classList.toggle('an', i < n));
      const c = hud.querySelector('.hn-laden');
      // nach dem vorletzten Ladenhüter pulsiert die Anzeige bis zum Ende des Durchgangs (Korrekturrunde 2)
      c.classList.toggle('warnung', !!warnung);
      if (n) { c.classList.remove('wackeln'); void c.offsetWidth; c.classList.add('wackeln'); }
    },
    auftrag(text, erfuellt, verfehlt) {
      const a = hud.querySelector('.hn-auftrag');
      a.hidden = !text; a.textContent = text || ''; a.classList.toggle('ja', !!erfuellt); a.classList.toggle('nein', !erfuellt && !!verfehlt);
    },
    unterkante() { return hud.hidden ? 0 : hud.getBoundingClientRect().bottom; },
  };

  // ---------- Sprechblasen (Makler-Figur unten links, Konkurrenz unten rechts) ----------
  // Sprechblasen verdecken nie Knöpfe oder Rückmeldungen (Korrekturrunde 1). Drei Lagen, gewählt in spiel.js formate():
  //  - html.seitlich (breite Bildschirme): unten links/rechts NEBEN der Tafel (genug Platz neben ihr),
  //  - Hochformat: unten links/rechts in einem freigehaltenen Streifen unter der Tafel (.hn-buehne endet darüber, CSS),
  //  - html.flach (Handy quer, kein Platz unten oder daneben): klein in der Kopfzeile der Tafel zwischen Titel und Schritten.
  // Auf schmalen Bildschirmen spricht immer nur eine Figur (die andere Blase geht weg, sonst überlappen sie).
  const zeiten = {};
  const html = document.documentElement;
  function kopfWeg(wer) { buehne.querySelectorAll('.hn-kopfsprecher' + (wer ? '.' + wer : '')).forEach(k => k.remove()); }
  function sprich(wer, text, mimik, dauer) {
    const s = sprecher[wer];
    if (!s || !text) return;
    const fig = wer === 'ich' ? HB.figur() : 'konkurrenz';
    const inhalt = (wer === 'konkurrenz' ? `<b class="name">${esc(D.konkurrenz.name)}</b>` : '') + esc(text);
    const ms = (dauer || 2.8) * 1000;
    if (html.classList.contains('flach') && !html.classList.contains('seitlich') && html.classList.contains('hn-imspiel')) {
      // Kopfzeile der aktuellen Tafel; ohne Tafel (Einblendung, Endbild) bleibt die Figur still
      const kopf = buehne.querySelector('.hn-panel:not(.weg) .hn-pkopf');
      if (!kopf) return;
      kopfWeg();
      Object.keys(sprecher).forEach(w => { clearTimeout(zeiten[w]); sprecher[w].classList.remove('an'); });
      const k = el('div', 'hn-kopfsprecher ' + wer, `<span class="fig">${F.svg(fig, mimik || 'neutral')}</span><span class="blase">${inhalt}</span>`);
      k.setAttribute('aria-live', 'polite');
      const tag = kopf.querySelector('.hn-tag');
      if (tag && tag.nextSibling) kopf.insertBefore(k, tag.nextSibling); else kopf.append(k);
      clearTimeout(zeiten[wer]);
      zeiten[wer] = setTimeout(() => { k.classList.add('weg'); setTimeout(() => k.remove(), 300); }, ms);
      return;
    }
    if (innerWidth < 700 && !html.classList.contains('seitlich')) Object.keys(sprecher).forEach(w => { if (w !== wer) { clearTimeout(zeiten[w]); sprecher[w].classList.remove('an'); } });
    s.querySelector('.fig').innerHTML = F.svg(fig, mimik || 'neutral');
    s.querySelector('.blase').innerHTML = inhalt;
    s.classList.remove('an'); void s.offsetWidth; s.classList.add('an');
    clearTimeout(zeiten[wer]);
    zeiten[wer] = setTimeout(() => s.classList.remove('an'), ms);
  }
  function stumm() { Object.keys(sprecher).forEach(w => { clearTimeout(zeiten[w]); sprecher[w].classList.remove('an'); }); kopfWeg(); }

  // ---------- Einblendung (Tagesauftrag, Markt-Ereignis, Mappe) ----------
  let einblWeiter = null, einblTipp = null;
  // Die Tafel darunter ist gesperrt, solange eine Einblendung offen ist (inert: nicht antippbar, nicht fokussierbar, für
  // Bildschirmleser und Testwerkzeuge unsichtbar – vorher fanden Skripte dort den gesperrten „Nächstes Objekt“-Knopf)
  // (aria-hidden zusätzlich: Playwright-Rollenabfragen beachten inert nicht – „Weiter“ war sonst doppelt, z. B. Ladenhüter)
  const sperren = an => [buehne, hud].forEach(e => { e.inert = !!an; if (an) e.setAttribute('aria-hidden', 'true'); else e.removeAttribute('aria-hidden'); });
  function einblendung(html, o) {
    o = o || {};
    if (einblTipp) { einbl.removeEventListener('pointerdown', einblTipp); einblTipp = null; }
    einbl.innerHTML = `<div class="hn-einbl-karte ${o.klasse || ''}">${html}${o.knopf ? `<button class="hn-kn haupt" type="button">${esc(o.knopf)}</button>` : ''}</div>`;
    einbl.hidden = false;
    sperren(true);
    einblWeiter = o.weiter || null;
    const zu = () => { if (einbl.hidden) return; einbl.hidden = true; einbl.innerHTML = ''; sperren(false); const w = einblWeiter; einblWeiter = null; if (w) w(); };
    const k = einbl.querySelector('.hn-kn');
    if (k) tippen(k, zu);
    if (o.tippZu) {
      // erst nach der Knall-Animation (0,35s) zu schließen, damit ein Doppeltipp die Einblendung nicht sofort wieder schließt
      const ab = performance.now() + 350;
      einblTipp = ev => { if (ev.target.closest('.hn-kn') || performance.now() < ab) return; einbl.removeEventListener('pointerdown', einblTipp); einblTipp = null; zu(); };
      einbl.addEventListener('pointerdown', einblTipp);
    }
    if (o.dauer) setTimeout(zu, o.dauer * 1000);
    return zu;
  }
  function mappeZeigen(liste) {
    const html = `<div class="hn-mappe"><div class="hn-reiter">Exposé-Mappe</div><div class="hn-mappe-inhalt">` + liste.map(m => `
      <div class="hn-expo${m.verkauft ? (m.unterWert ? ' unterwert' : '') : ' laden'}"><div class="bild">${SZ.hausSvg(m.art)}${m.unterWert ? `<span class="hn-stempel unterwert">${esc(T.unterWertKurz)}</span>` : m.verkauft ? '<span class="hn-stempel">Verkauft</span>' : `<span class="hn-stempel grau">${esc(T.ladenhueter)}</span>`}</div>
        <b>${esc(m.name)}</b><span>${esc(m.viertel)}</span><span>${m.verkauft ? HB.euro(m.preis) + (m.unterWert ? ' – unter Wert' : '') : 'nicht verkauft'}</span>
        <span class="abw">${m.abw != null ? HB.prozent(m.abw, 1) + ' daneben' : ''}</span></div>`).join('') + `</div></div>`;
    einblendung(html, { knopf: 'Schließen', klasse: 'breit' });
  }

  function alleVerbergen() { start.hidden = true; ende.hidden = true; }

  // ---------- Rückfrage beim Haus-Knopf während eines Durchgangs (MZ, Korrekturrunde 2) ----------
  // Eigene Ebene über allem (auch über einer offenen Einblendung), damit darunter nichts verloren geht.
  // „Weiterspielen“ ist der Hauptknopf (ebenso Esc und Tippen neben die Tafel), „Beenden“ geht zur Startseite.
  const frage = el('section', 'hn-rueckfrage'); frage.hidden = true; frage.setAttribute('role', 'alertdialog');
  document.body.append(frage);
  function rueckfrage(o) {
    if (!frage.hidden) return;
    const RF = Object.assign({ titel: 'Spiel wirklich beenden?', text: 'Dein Fortschritt geht verloren.', weiter: 'Weiterspielen', beenden: 'Beenden' }, T.beenden || {});
    frage.innerHTML = `<div class="hn-einbl-karte hn-rf-karte"><h2 class="hn-tag">${esc(RF.titel)}</h2><p class="hn-rf-text">${esc(RF.text)}</p>
      <button class="hn-kn haupt" type="button" data-rf="weiter">${esc(RF.weiter)}</button>
      <button class="hn-kn neben" type="button" data-rf="beenden">${esc(RF.beenden)}</button></div>`;
    frage.hidden = false;
    const ab = performance.now() + 350;
    const taste = ev => { if (ev.key === 'Escape') { ev.preventDefault(); schliessen(false); } };
    function schliessen(ja) {
      if (frage.hidden) return;
      frage.hidden = true; frage.innerHTML = '';
      removeEventListener('keydown', taste, true);
      if (ja) o.beenden(); else if (o.weiter) o.weiter();
    }
    addEventListener('keydown', taste, true);
    tippen(frage.querySelector('[data-rf="weiter"]'), () => schliessen(false));
    tippen(frage.querySelector('[data-rf="beenden"]'), () => schliessen(true));
    frage.onpointerdown = ev => { if (!ev.target.closest('.hn-rf-karte') && performance.now() > ab) schliessen(false); };
    requestAnimationFrame(() => { const w = frage.querySelector('[data-rf="weiter"]'); if (w) w.focus({ preventScroll: true }); });
  }

  window.HN_SCHIRME = {
    buehne, hud: hudApi, start: startZeigen, ende: endeZeigen, sprich, stumm, einblendung, mappe: mappeZeigen, alleVerbergen,
    rueckfrage, tippen, get rueckfrageOffen() { return !frage.hidden; },
    knoepfe(k) { knoepfe = k; },
    SCHEIN, esc, el,
  };
})();
