// Intro der Startseite „Hammerpreis“ – Ablauf A „Knall wird zur Startseite“ (MZ, 26.10.2026: „jo“), ca. 3s, ohne Ton.
// 0–0,6s   gelbe Fläche, App-Icon mittig: weißer Stern zieht sich zusammen und knallt auf
// 0,6–1,4s das „M“ springt heraus und hüpft mit Comic-Federung (Stauchen/Strecken) oben links an seinen Platz im Logo,
//          der weiße Kopfbalken schiebt sich darunter, der Schriftzug blendet ein (Logo am Ende vollständig/unverändert)
// 1,4–2,2s Strahlen wachsen zu den Strahlen der Startseite, der weiße Stern schrumpft zum roten Knall-Stern „DEAL?“ (MZ, 26.10.2026; vorher „WERT?“)
// 2,2–3,0s „HAMMERPREIS“ knallt schräg herein, das Schild fällt an seinen Platz und federt nach, vier Schrauben ploppen,
//          die Zahl zählt von 0 auf den Bestwert, Figuren, „Spielen!“ und Bilanz-Karten gleiten gestaffelt herein.
// Nur beim ersten Öffnen je Sitzung (Kopf-Skript in index.html setzt html.intro), Tippen/Taste überspringt,
// „Bewegung reduzieren“ = Icon kurz still, dann weiche Überblendung. Maße des Icons: start/hn-icon.js.
// Testhilfen: #intro (immer), #intro=1.4 (Standbild bei 1,4s), #ruhig (wie „Bewegung reduzieren“).
(function () {
  'use strict';
  const html = document.documentElement;
  if (!html.classList.contains('intro')) { html.classList.add('fertig'); return; }
  const B = window.HNB, K = B.K, I = window.HN_ICON, $ = s => document.querySelector(s);
  const SCHLUESSEL = 'mg:intro:hammerpreis:' + (K.firma || '');
  const m = /^#intro=([\d.]+)/.exec(location.hash), STAND = m ? +m[1] : null;
  const RUHIG = B.ruhig(), DAUER = 3.05;
  const bestwert = (window.HN_START && window.HN_START.bestwert) || 0;
  const farbe = B.farben.haupt, T = B.COMIC.tinte, ROT = B.COMIC.rot;

  // ---------- Hilfen ----------
  const klemm = (x, a, b) => Math.max(a, Math.min(b, x));
  const ab = (t, a, b) => klemm((t - a) / (b - a), 0, 1);           // Fortschritt 0–1 zwischen a und b
  const lerp = (a, b, p) => a + (b - a) * p;
  const aus = p => 1 - Math.pow(1 - p, 3);                            // weich auslaufend
  const ein = p => p * p * p;
  const feder = p => { const c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };   // mit Überschwingen
  const mix = (a, b, p) => { const x = B.rgb(a), y = B.rgb(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], p))).join(',')})`; };
  const W = () => document.documentElement.clientWidth || innerWidth, H = () => document.documentElement.clientHeight || innerHeight;

  // ---------- Bühne ----------
  const buehne = document.createElement('div');
  buehne.className = 'intro-buehne';
  buehne.setAttribute('aria-hidden', 'true');
  const kopfBalken = document.createElement('div');
  kopfBalken.className = 'intro-kopf';
  const NS = 'http://www.w3.org/2000/svg';
  const stern = document.createElementNS(NS, 'svg');
  stern.setAttribute('viewBox', '0 0 100 100');
  stern.innerHTML = `<path d="${I.stern}" stroke="${T}" stroke-linejoin="round"/><text x="50" y="58" text-anchor="middle" font-family="Bangers, sans-serif" font-size="26" fill="#fff" stroke="${T}" stroke-width="1" opacity="0">DEAL?</text>`;
  const sternPfad = stern.querySelector('path'), sternText = stern.querySelector('text');
  // Zeichen aus kunde/zeichen.svg (Fallback: „M“ der Musterfirma)
  let Z = { d: 'M0 43.6l45.9-43.6 34.4 32.7 34.5-32.7 45.9 43.6h-11v56.4h-30.6v-70.7l-38.8 36.8-38.8-36.8v70.7h-30.6v-56.4z', vb: [0, 0, 160.7, 100] };
  const zeichen = document.createElementNS(NS, 'svg');
  function zeichenBauen() {
    zeichen.setAttribute('viewBox', Z.vb.join(' '));
    zeichen.innerHTML = `<path class="sch" d="${Z.d}" fill-rule="evenodd" fill="${T}"/><path class="fl" d="${Z.d}" fill-rule="evenodd" fill="${farbe}" stroke="${T}" stroke-linejoin="round"/>`;
  }
  zeichenBauen();
  // Bewegung reduziert: das fertige Icon als Ganzes, dann Überblendung
  const ruhigIcon = document.createElement('div');
  if (RUHIG) {
    buehne.style.background = getComputedStyle(document.body).background;
    ruhigIcon.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(56vw,40vh,280px);aspect-ratio:1';
    buehne.append(ruhigIcon);
  } else { buehne.append(stern, zeichen); document.body.append(kopfBalken); }   // Balken unter dem Kopf (Logo bleibt sichtbar)
  document.body.append(buehne);

  // Elemente der Seite
  const E = {
    kopf: $('#kopf'), logo: $('#logo'), ton: $('#tonKnopf'), strahlen: $('#strahlen'), name: $('#name'), schild: $('#schild'),
    knall: $('#knall'), zahl: $('#bestZahl'), wahl: $('#wahl'), spielen: $('#spielen'), fuss: $('#fuss'),
    karten: Array.from(document.querySelectorAll('.karte')), schrauben: Array.from(document.querySelectorAll('.schraube')),
  };
  const gleiter = [E.wahl, E.spielen].concat(E.karten, [E.fuss]);
  let logoZeichen = null, logoSchrift = null;

  // ---------- Icon-Lage (Mitte des Bildschirms) ----------
  function icon() {
    const S = Math.min(W() * 0.7, H() * 0.45, 340);
    return { S, x: W() / 2 - S / 2, y: H() / 2 - S / 2 };
  }
  const rechteck = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  function setze(el, x, y, w, sx, sy, dreh) {   // SVG mit viewBox: Lage über transform (Ursprung oben links)
    const vb = el.viewBox.baseVal, br = w, hh = w * vb.height / vb.width;
    el.style.width = br + 'px'; el.style.height = hh + 'px';
    el.style.transform = `translate(${x + br / 2}px, ${y + hh / 2}px) rotate(${dreh || 0}deg) scale(${sx || 1}, ${sy || 1}) translate(${-br / 2}px, ${-hh / 2}px)`;
  }

  // ---------- ein Bild zur Zeit t ----------
  function bild(t) {
    if (RUHIG) return bildRuhig(t);
    const ic = icon(), u = ic.S / 100;
    // Strahlen: erst so groß wie im Icon (um die Icon-Mitte), 1,4–2,2s wachsen sie zur Startseite (Schildmitte)
    const cs = getComputedStyle(html), sx = parseFloat(cs.getPropertyValue('--sx')) || W() / 2, sy = parseFloat(cs.getPropertyValue('--sy')) || 250;
    const pS = aus(ab(t, 1.4, 2.2)), k0 = (ic.S * 0.8) / 560;
    const cx = lerp(ic.x + 50 * u, sx, pS), cy = lerp(ic.y + 50 * u, sy, pS);
    E.strahlen.style.transform = `translate(${cx - sx}px, ${cy - sy}px) scale(${lerp(k0, 1, pS)}) rotate(${lerp(-20, 0, pS)}deg)`;

    // Stern: 0–0,3 zusammenziehen, 0,3–0,6 aufknallen; 1,4–2,2 zum Knall-Stern (Lage, Größe, Farbe, Drehung)
    let sk = 1;
    if (t < 0.3) sk = lerp(1, 0.72, ein(ab(t, 0, 0.3)));
    else if (t < 0.45) sk = lerp(0.72, 1.2, aus(ab(t, 0.3, 0.45)));
    else sk = lerp(1.2, 1, aus(ab(t, 0.45, 0.62)));
    const ziel = rechteck(E.knall), pK = aus(ab(t, 1.4, 2.15));
    const sW = lerp(0.8 * ic.S * sk, ziel.w, pK);
    const sCx = lerp(ic.x + 49.5 * u, ziel.x + ziel.w / 2, pK), sCy = lerp(ic.y + 51 * u, ziel.y + ziel.h / 2, pK);
    setze(stern, sCx - sW / 2, sCy - sW / 2, sW, 1, 1, lerp(0, 360, pK) + (t < 0.6 ? Math.sin(t * 30) * 3 * (1 - ab(t, 0, 0.6)) : 0));
    sternPfad.setAttribute('fill', mix('#ffffff', ROT, ab(t, 1.55, 2.0)));
    sternPfad.setAttribute('stroke-width', lerp(4, 3.5, pK));
    sternText.setAttribute('opacity', ab(t, 1.85, 2.15));
    stern.style.opacity = t < 2.2 ? 1 : 0;
    E.knall.style.opacity = t < 2.2 ? 0 : 1;

    // Zeichen: Start im Icon, zwei Hüpfer zum Logo-Zeichen, Landung staucht, Kontur/Schatten verschwinden
    const start = { x: ic.x + 26.5 * u, y: ic.y + 36 * u, w: 0.471 * ic.S };
    const lz = logoZeichen ? rechteck(logoZeichen) : null;
    const zielZ = lz && lz.w > 2 ? lz : { x: 16, y: 15, w: 45, h: 28 };
    const mitte = { x: lerp(start.x, zielZ.x, 0.45), y: lerp(start.y, zielZ.y, 0.38) - 10, w: lerp(start.w, zielZ.w, 0.4) };
    let p, zx, zy, zw, ssx = 1, ssy = 1;
    if (t < 0.6) { zx = start.x; zy = start.y; zw = start.w; }
    else if (t < 0.68) { p = ab(t, 0.6, 0.68); zx = start.x; zy = start.y + start.w * 0.06 * Math.sin(p * Math.PI); zw = start.w; ssx = 1 + 0.18 * Math.sin(p * Math.PI); ssy = 1 - 0.2 * Math.sin(p * Math.PI); }
    else if (t < 1.0) {   // Hüpfer 1
      p = ab(t, 0.68, 1.0); const q = aus(p);
      zx = lerp(start.x, mitte.x, q); zw = lerp(start.w, mitte.w, q);
      zy = lerp(start.y, mitte.y, q) - Math.min(H() * 0.16, 130) * 4 * p * (1 - p);
      ssx = 1 - 0.12 * Math.sin(p * Math.PI); ssy = 1 + 0.16 * Math.sin(p * Math.PI);
    } else if (t < 1.07) { p = ab(t, 1.0, 1.07); zx = mitte.x; zy = mitte.y; zw = mitte.w; ssx = 1 + 0.22 * Math.sin(p * Math.PI); ssy = 1 - 0.24 * Math.sin(p * Math.PI); }
    else if (t < 1.32) {   // Hüpfer 2
      p = ab(t, 1.07, 1.32); const q = aus(p);
      zx = lerp(mitte.x, zielZ.x, q); zw = lerp(mitte.w, zielZ.w, q);
      zy = lerp(mitte.y, zielZ.y, q) - Math.min(H() * 0.08, 60) * 4 * p * (1 - p);
      ssx = 1 - 0.1 * Math.sin(p * Math.PI); ssy = 1 + 0.14 * Math.sin(p * Math.PI);
    } else { p = ab(t, 1.32, 1.42); zx = zielZ.x; zy = zielZ.y; zw = zielZ.w; ssx = 1 + 0.2 * Math.sin(p * Math.PI); ssy = 1 - 0.22 * Math.sin(p * Math.PI); }
    // Stauchen am Boden: Unterkante bleibt stehen
    const zh = zw * Z.vb[3] / Z.vb[2];
    setze(zeichen, zx, zy + zh * (1 - ssy), zw, ssx, ssy, 0);
    const kontur = 1 - ab(t, 1.28, 1.42);
    zeichen.querySelector('.fl').setAttribute('stroke-width', 5 * kontur);
    const sch = zeichen.querySelector('.sch');
    sch.setAttribute('transform', `translate(${5 * kontur} ${5 * kontur})`);
    sch.style.opacity = kontur;
    zeichen.style.opacity = t < 1.42 ? 1 : 0;

    // Kopfbalken schiebt sich herein, Logo erscheint (Zeichen ab Landung, Schriftzug blendet ein), Ton-Knopf
    kopfBalken.style.height = E.kopf.offsetHeight + 'px';
    kopfBalken.style.transform = `translateY(${lerp(-100, 0, aus(ab(t, 0.85, 1.2)))}%)`;
    E.logo.style.opacity = t >= 1.0 ? 1 : 0;
    if (logoZeichen) logoZeichen.style.opacity = t >= 1.42 ? 1 : 0;
    if (logoSchrift) logoSchrift.style.opacity = ab(t, 1.15, 1.45);
    else E.logo.style.opacity = ab(t, 1.15, 1.45);
    E.ton.style.opacity = ab(t, 1.3, 1.6);

    // HAMMERPREIS knallt herein (schräg bleibt –4°)
    const pN = ab(t, 2.2, 2.5);
    E.name.style.opacity = ab(t, 2.2, 2.28);
    E.name.style.transform = `rotate(-4deg) scale(${t < 2.2 ? 2.4 : pN < 0.6 ? lerp(2.4, 0.9, ein(pN / 0.6)) : lerp(0.9, 1, aus((pN - 0.6) / 0.4))})`;
    // Schild fällt und federt nach
    const pF = ab(t, 2.3, 2.52), pB = ab(t, 2.52, 2.85);
    let oben = 0;
    for (let e = E.schild; e; e = e.offsetParent) oben += e.offsetTop;   // Lage ohne transform
    const fall = -(oben + E.schild.offsetHeight + 40);
    const y = t < 2.52 ? lerp(fall, 0, ein(pF)) : -14 * Math.sin(pB * Math.PI * 2) * (1 - pB) * (pB < 0.5 ? 1 : 0.6);
    E.schild.style.opacity = t >= 2.3 ? 1 : 0;
    E.schild.style.transform = `translateY(${y}px) rotate(${t < 2.52 ? lerp(-6, 0, pF) : 0}deg)`;
    E.schrauben.forEach((s, i) => {
      const q = ab(t, 2.58 + i * 0.05, 2.7 + i * 0.05);
      s.style.transform = `scale(${q < 0.6 ? lerp(0, 1.45, q / 0.6) : lerp(1.45, 1, (q - 0.6) / 0.4)})`;
    });
    E.zahl.textContent = B.zahl(Math.round(bestwert * aus(ab(t, 2.55, 2.95))));
    // Figuren, Spielen, Karten, Footer gestaffelt
    gleiter.forEach((el, i) => {
      const q = aus(ab(t, 2.55 + i * 0.05, 2.85 + i * 0.05));
      el.style.opacity = q;
      el.style.transform = `translateY(${lerp(16, 0, q)}px)`;
    });
  }
  function bildRuhig(t) {
    const p = ab(t, 0.5, 1.5);
    buehne.style.opacity = 1 - p;
    [E.logo, E.ton, E.name, E.schild, E.knall].concat(gleiter).forEach(el => { el.style.opacity = p; });
    E.zahl.textContent = B.zahl(bestwert);
  }

  // ---------- Ablauf ----------
  let t0 = null, fertig = false;
  function schleife(jetzt) {
    if (fertig) return;
    if (t0 == null) t0 = jetzt;
    const t = STAND != null ? STAND : (jetzt - t0) / 1000;
    bild(t);
    if (STAND == null && t >= (RUHIG ? 1.55 : DAUER)) { ende(false); return; }
    requestAnimationFrame(schleife);
  }
  function ende(gesprungen) {
    if (fertig) return;
    fertig = true;
    try { sessionStorage.setItem(SCHLUESSEL, '1'); } catch (e) { /* privat */ }
    const alle = [E.logo, E.ton, E.name, E.schild, E.knall, E.strahlen, logoZeichen, logoSchrift].concat(gleiter, E.schrauben).filter(Boolean);
    if (gesprungen) {
      // Überspringen ohne Sprung: alles noch nicht Gezeigte weich einblenden
      html.classList.add('nach-intro');
      alle.forEach(el => { el.style.transform = ''; });
      requestAnimationFrame(() => {
        html.classList.remove('intro');
        alle.forEach(el => { el.style.opacity = ''; });
        E.zahl.textContent = B.zahl(bestwert);
      });
      buehne.style.transition = 'opacity .3s'; buehne.style.opacity = '0';
      setTimeout(() => { buehne.remove(); kopfBalken.remove(); html.classList.remove('nach-intro'); html.classList.add('fertig'); }, 400);
      html.classList.add('ohne-einflug');
    } else {
      alle.forEach(el => { el.style.transform = ''; el.style.opacity = ''; });
      html.classList.add('ohne-einflug');
      html.classList.remove('intro');
      html.classList.add('fertig');
      E.zahl.textContent = B.zahl(bestwert);
      buehne.remove(); kopfBalken.remove();
    }
  }
  if (STAND == null) {
    buehne.addEventListener('pointerdown', () => ende(true));
    addEventListener('keydown', function weg() { removeEventListener('keydown', weg); ende(true); });
  }

  // Logo abwarten (höchstens 0,6s), dann starten
  let gestartet = false;
  function los() {
    if (gestartet) return;
    gestartet = true;
    logoZeichen = E.logo.querySelector('#zeichen');
    logoSchrift = E.logo.querySelector('#schriftzug');
    if (window.HN_START && window.HN_START.strahlenSetzen) window.HN_START.strahlenSetzen();
    requestAnimationFrame(schleife);
  }
  // Zeichen fürs Icon aus kunde/zeichen.svg (gleich wie das App-Icon)
  const zeichenLaden = location.protocol === 'file:' ? Promise.resolve() : fetch(K.zeichen).then(r => r.ok ? r.text() : '').then(txt => {
    const z = txt && !/<script/i.test(txt) ? I.zeichenLesen(txt) : null;
    if (z) { Z = z; zeichenBauen(); }
  }).catch(() => {});
  if (RUHIG) ruhigIcon.innerHTML = I.iconSvg(farbe, Z).replace('<svg ', '<svg style="width:100%;height:100%;display:block;filter:drop-shadow(0 6px 14px rgba(0,0,0,.2))" ');
  Promise.all([window.HN_LOGO || Promise.resolve(), zeichenLaden]).then(() => {
    if (RUHIG) ruhigIcon.innerHTML = I.iconSvg(farbe, Z).replace('<svg ', '<svg style="width:100%;height:100%;display:block;filter:drop-shadow(0 6px 14px rgba(0,0,0,.2))" ');
    los();
  });
  setTimeout(los, 600);
  bild(0);   // erstes Bild sofort (Icon steht, bevor das Logo da ist)
})();
