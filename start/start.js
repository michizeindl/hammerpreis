// Startseite „Hammerpreis“: Logo, Bestwert auf dem Schild, Figurenwahl (gemerkt), Statistik, Footer, Ton-Knopf, Größe.
// Testhilfen (Adresse): #best=854 (Bestwert nur anzeigen)  #stat=37,412300,0.8,Altstadt (Statistik nur anzeigen)
//   #intro (Intro immer)  #intro=1.4 (Standbild)  #ruhig (wie „Bewegung reduzieren“)
(function () {
  'use strict';
  const B = window.HNB, K = B.K, $ = s => document.querySelector(s);
  const hash = location.hash;
  const wert = name => { const m = new RegExp('[#&]' + name + '=([^&]*)').exec(hash); return m ? decodeURIComponent(m[1]) : null; };
  if (B.ruhig()) document.documentElement.classList.add('ruhig');

  // ---------- Logo (eingebettet, ids bleiben fürs Intro) ----------
  window.HN_LOGO = B.logoEinbetten($('#logo'), K.logoAufHell || K.logo, { ids: true });
  document.title = 'Hammerpreis – ' + (K.kurzname || K.firma || '');
  $('#logo').setAttribute('aria-label', K.firma || '');

  // ---------- Bestwert (Zahl auf dem Schild; beim ersten Spiel 0) ----------
  const testBest = wert('best');
  const bestwert = testBest != null ? Math.max(0, Math.min(1000, +testBest || 0)) : (B.best() || 0);
  $('#bestZahl').textContent = B.zahl(bestwert);
  window.HN_START = { bestwert };

  // ---------- Statistik ----------
  let s = B.statistik();
  const testStat = wert('stat');
  if (testStat) {
    const [v, p, a, q] = testStat.split(',');
    s = { durchgaenge: 1, verkauft: +v || 0, provision: +p || 0, besteAbw: a === '' || a == null ? null : +a, viertel: q ? { [q]: { provision: 1 } } : {} };
  }
  // Vor dem ersten Durchgang Strich statt „0“/„0 €“ (MZ, 27.10.2026) – wie bei Schätzung und Viertel
  const gespielt = s.durchgaenge > 0 || s.verkauft > 0 || s.provision > 0;
  $('#statVerkauft').textContent = gespielt ? B.zahl(s.verkauft) : '–';
  $('#statProvision').textContent = gespielt ? B.euro(s.provision) : '–';
  $('#statSchaetzung').textContent = s.besteAbw == null ? '–' : '±' + B.prozent(s.besteAbw, 1);
  $('#statViertel').textContent = B.bestesViertel(s) || '–';

  // ---------- Figurenwahl ----------
  let figur = wert('figur') === 'makler' ? 'makler' : wert('figur') === 'maklerin' ? 'maklerin' : B.figur();
  const knoepfe = document.querySelectorAll('.fig');
  window.HN_FIGUREN.vorladen(['maklerin', 'makler'], ['neutral', 'freut']);
  knoepfe.forEach(k => {
    // Vorname groß (aus kunde.js, z. B. „Tessa“/„Toni“, MZ 27.10.2026), darunter klein die Rolle; ohne Vorname nur die Rolle
    const rolle = window.HN_FIGUREN.namen[k.dataset.figur], vorname = window.HN_FIGUREN.vorname(k.dataset.figur);
    k.querySelector('.wort').innerHTML = vorname ? `<b class="vorname">${esc(vorname)}</b><span class="rolle">${esc(rolle)}</span>` : `<b class="vorname">${esc(rolle)}</b>`;
    k.setAttribute('aria-label', vorname ? vorname + ', ' + rolle : rolle);
    k.addEventListener('click', () => { figur = k.dataset.figur; B.figurSetzen(figur); zeigeWahl(); });
  });
  function zeigeWahl() {
    knoepfe.forEach(k => {
      const an = k.dataset.figur === figur;
      k.classList.toggle('an', an);
      k.setAttribute('aria-checked', an ? 'true' : 'false');
      // gewählte Figur freut sich, die andere schaut neutral
      k.querySelector('.bild').innerHTML = window.HN_FIGUREN.svg(k.dataset.figur, an ? 'freut' : 'neutral');
    });
  }
  zeigeWahl();
  // Spielen: Wahl ist schon gemerkt; Testhilfen der Startseite nicht ins Spiel mitnehmen
  $('#spielen').addEventListener('click', () => B.figurSetzen(figur));
  // Gummi-Hüpfer (v10): „Spielen!“ hüpft alle 2,2s bis 14 px hoch. Ein Tipp in seiner Ruhelage (Lage ohne Animation, aus
  // Transform-Matrix + Ursprung) zählt auch dann, wenn er gerade woanders ist und der Finger etwas darunter trifft.
  (function () {
    const k = $('#spielen'), html = document.documentElement;
    const drin = (r, x, y, rand) => x >= r.left - rand && x <= r.right + rand && y >= r.top - rand && y <= r.bottom + rand;
    const ruhelage = () => B.ruhelage(k);   // start/hn-basis.js
    let offen = null;
    addEventListener('pointerdown', ev => {
      offen = null;
      if ((ev.pointerType === 'mouse' && ev.button !== 0) || html.classList.contains('intro')) return;
      if (ev.target.closest && ev.target.closest('button, a, input, label, [role="radio"]')) return;   // traf etwas anderes Tippbares
      if (drin(ruhelage(), ev.clientX, ev.clientY, 0)) offen = ev.pointerId;
    }, true);
    addEventListener('pointerup', ev => {
      if (offen == null || ev.pointerId !== offen) return;
      offen = null;
      if (drin(ruhelage(), ev.clientX, ev.clientY, 14) || drin(k.getBoundingClientRect(), ev.clientX, ev.clientY, 14)) setTimeout(() => k.click(), 0);
    }, true);
    addEventListener('pointercancel', () => { offen = null; }, true);
  })();

  // ---------- Footer (nichts anklickbar) ----------
  const teile = [].concat(K.kontakt || [K.firma]).map(t => `<span class="teil">${esc(t)}</span>`).join(' – ');
  const zeile2 = [K.telefon, K.web].filter(Boolean).map(t => `<span class="teil">${esc(t)}</span>`);
  const recht = (K.rechtliches || []).map(r => `<u>${esc(r.text)}</u>`).join(' – ');
  if (recht) zeile2.push(`<span class="teil">${recht}</span>`);
  $('#fuss').innerHTML = teile + '<br>' + zeile2.join(' – ');
  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  // ---------- Ton-Knopf (gleiche Einstellung wie im Spiel: mg:ton) und Musik der Sammlung ----------
  // Musik (Phase 4, 27.10.2026): Pixabay „Jazzy Comedy Fun Music“ (331music, 600517), 120 BPM, Schleife 0,02–144,02s (72 Takte),
  // Schlussakkord 1,5s in den Anfang geblendet (Material/Skripte/hammerpreis-ton.py, Quellen Mini-Games/Material/Sounds/quellen.txt).
  // Dieselbe Datei spielt im Startbild und im Endbild des Spiels (makler-hammerpreis/klang.js). Läuft nach dem ersten Tippen
  // in Schleife (Web Audio, ohne Lücke); Ton an/aus gilt auch fürs Spiel (mg:ton). Geladen wird sie erst beim ersten Tippen.
  const MUSIK = { datei: 'klaenge/musik.mp3', proben: 1411200, pegel: 0.22 };
  const SYM = {
    an: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    aus: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  };
  const tk = $('#tonKnopf');
  let tonAn = (() => { try { return localStorage.getItem('mg:ton') !== 'aus'; } catch (e) { return true; } })();
  const tonZeigen = () => { tk.innerHTML = tonAn ? SYM.an : SYM.aus; tk.setAttribute('aria-pressed', tonAn ? 'true' : 'false'); };
  const AC = window.AudioContext || window.webkitAudioContext;
  let ac = null, puffer = null, laeuft = null, laedt = false;
  // MP3 bringt vorn 1105 Proben Stille mit (bei 22,05 kHz) – mit der echten Länge genau zuschneiden (wie rahmen.js)
  function zuschneiden(b) {
    const RATE = 22050, VORLAUF = 1105, ueber = b.duration * RATE - MUSIK.proben;
    if (ueber < 2) return b;
    const ab = Math.round((ueber >= VORLAUF - 4 ? VORLAUF : 0) / RATE * b.sampleRate);
    const laenge = Math.min(b.length - ab, Math.round(MUSIK.proben / RATE * b.sampleRate));
    const n = ac.createBuffer(b.numberOfChannels, laenge, b.sampleRate);
    for (let k = 0; k < b.numberOfChannels; k++) n.getChannelData(k).set(b.getChannelData(k).subarray(ab, ab + laenge));
    return n;
  }
  function musikAn() {
    if (!tonAn || laeuft || !AC) return;
    if (!ac) { try { ac = new AC(); } catch (e) { return; } }
    if (!puffer && !laedt) {
      laedt = true;
      fetch(MUSIK.datei).then(r => r.arrayBuffer()).then(b => new Promise((ok, nein) => ac.decodeAudioData(b, ok, nein)))
        .then(b => { puffer = zuschneiden(b); laedt = false; musikAn(); }).catch(() => { laedt = false; });
    }
    if (ac.state !== 'running') ac.resume().then(() => { if (ac.state === 'running') musikAn(); }).catch(() => {});
    if (!puffer || ac.state !== 'running') return;
    const q = ac.createBufferSource(), v = ac.createGain();
    q.buffer = puffer; q.loop = true;
    v.gain.setValueAtTime(0.0001, ac.currentTime);
    v.gain.exponentialRampToValueAtTime(MUSIK.pegel, ac.currentTime + 1.2);
    q.connect(v).connect(ac.destination);
    q.start();
    laeuft = { q, v };
  }
  function musikAus(dauer) {
    if (!laeuft) return;
    const { q, v } = laeuft;
    laeuft = null;
    try { v.gain.setTargetAtTime(0.0001, ac.currentTime, dauer || 0.15); q.stop(ac.currentTime + 1.2); } catch (e) { /* egal */ }
  }
  // Browser erlauben Ton erst nach dem ersten Tippen; der Ton-Knopf selbst schaltet nur um. „Spielen!“ blendet aus (Seitenwechsel).
  const ersterTipp = e => { if (e && e.target && e.target.closest && e.target.closest('#tonKnopf, #spielen')) return; musikAn(); };
  ['pointerup', 'touchend', 'keydown'].forEach(e => addEventListener(e, ersterTipp, { passive: true }));
  tk.addEventListener('click', () => {
    tonAn = !tonAn;
    try { localStorage.setItem('mg:ton', tonAn ? 'an' : 'aus'); } catch (e) { /* privat */ }
    tonZeigen();
    if (tonAn) musikAn(); else musikAus();
  });
  tonZeigen();
  $('#spielen').addEventListener('click', () => musikAus(0.12));
  // Seite verlassen: Musik aus; zurück aus dem Verlauf (Seite aus dem Zwischenspeicher des Browsers): wieder an
  addEventListener('pagehide', () => musikAus(0.1));
  addEventListener('pageshow', e => { if (e.persisted && ac && ac.state === 'running') musikAn(); });
  // Tab im Hintergrund: anhalten
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend().catch(() => {}); else if (tonAn) ac.resume().catch(() => {}); });
  window.HN_START.musik = () => ({ laeuft: !!laeuft, pegel: laeuft ? +laeuft.v.gain.value.toFixed(3) : 0, kontext: ac ? ac.state : 'keiner' });   // Testhilfe

  // ---------- Größe: Maßstab --s, Querformat, Strahlen auf die Schildmitte ----------
  const wurzel = document.documentElement;
  function groesse() {
    const W = innerWidth, H = innerHeight;
    const quer = W > H * 1.15 && W >= 560;
    wurzel.classList.toggle('quer', quer);
    // Höhe des Footers (weißer Balken, je nach Breite zwei bis vier Zeilen) wird abgezogen
    const fuss = $('#fuss') ? $('#fuss').offsetHeight : 0;
    let s;
    if (quer) s = Math.min((H - 48 - Math.max(30, fuss + 16)) / 330, W / 820);
    else s = Math.min((H - 58 - Math.max(44, fuss + 8)) / 640, W / 375);
    s = Math.max(0.62, Math.min(quer ? 1.5 : 1.2, s));
    wurzel.style.setProperty('--s', s.toFixed(3));
    strahlenSetzen();
  }
  function strahlenSetzen() {
    const sch = $('#schild');
    if (!sch) return;
    const r = sch.getBoundingClientRect();
    // getBoundingClientRect enthält Animations-Versatz – Lage aus offset* rechnen (ohne transform)
    let x = 0, y = 0, e = sch;
    while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    wurzel.style.setProperty('--sx', (x + sch.offsetWidth / 2).toFixed(1) + 'px');
    wurzel.style.setProperty('--sy', (y + sch.offsetHeight / 2).toFixed(1) + 'px');
    return r;
  }
  addEventListener('resize', groesse);
  groesse();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(strahlenSetzen);
  window.HN_START.strahlenSetzen = strahlenSetzen;
})();
