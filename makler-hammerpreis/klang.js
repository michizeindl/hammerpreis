// „Hammerpreis“ – Ton (Phase 4, 27.10.2026). Klang-Konzept MZ (27.10.2026): Musik der Sammlung im Startbild (und im Endbild
// nach dem Hammer-Klang), im Spiel keine Dauermusik, sondern leise Atmosphäre je Ort, Spannungsmusik nur in der Bieterrunde,
// kurze Effekte und Jingles. Eigene Ton-Steuerung neben dem Rahmen (rahmen.js bleibt unverändert, Muster wie „Rohrbruch“
// shk-adventure/klang.js), weil das Spiel mehr braucht als Rahmen.ton: Musik auch im Endbild, Raumgeräusche mit Kreuzblende,
// Spannung, die mit den Geboten steigt und beim Zögern stockt, Klänge erst bei Bedarf laden.
// Rahmen.ton wird umgeleitet: Namen aus FX spielt diese Datei (z. B. „klick“ des Rahmens), alle anderen weiter der Rahmen.
// Ton an/aus: Rahmen-Knopf (#tonKnopf, Speicher mg:ton). Ton erst nach dem ersten Tippen (Browser-Regel).
// Klänge: klaenge/*.mp3 (Mono 22,05 kHz, lameenc), Musik = ../klaenge/musik.mp3 (dieselbe Datei wie die Startseite).
// Bau-Skript und Pegel: Material/Skripte/hammerpreis-ton.py (Ziel-Lautheit je Klang), Quellen: Mini-Games/Material/Sounds/quellen.txt.
// Testhilfen: HN_KLANG.zustand(), HN_KLANG.protokoll (zuletzt gespielte Klänge), #tonprotokoll (Konsole).
(function () {
  'use strict';
  const R_ = window.Rahmen;
  const PROTO_KONSOLE = /(^|[#&])tonprotokoll\b/.test(location.hash);

  // Name: [Proben (echte Länge, MP3-Stille wird weggeschnitten), Pegel] – Werte aus hammerpreis-ton.py („liste“).
  // Ziel-Lautheit (lauteste 50 ms): Zuschlag −14, Hämmer −15…−18, Preis festlegen/Stempel −16, Fund −17, Kasse/Ladenhüter −17,
  // Käufer/Bonus −18, Fanfaren −19, Ereignis −20, Hinweis/Pop −21, Fehltipp/Gebot/Abheben −22, Telefon −23, Klick −25,
  // Straße (Katze, Hund, Klingel) −27, Regler-Tick −30, Knarren −30 dBFS.
  const FX = {
    'telefon': [41454, 0.232], 'abheben': [14333, 0.529],
    'klick': [3684, 0.708], 'fund': [5953, 0.428], 'fehltipp': [10143, 0.136], 'hinweis': [3675, 0.457], 'tick': [512, 0.163],
    'festlegen': [4630, 0.619], 'kaeufer': [15656, 0.466], 'gebot': [7717, 0.239], 'herz': [49392, 0.194],
    'zuschlag': [23373, 0.571], 'stempel': [3748, 0.662], 'kasse': [21388, 0.454], 'ladenhueter': [29547, 0.403],
    'ereignis': [5072, 0.304], 'auftrag': [30429, 0.413], 'bonus': [21168, 0.688], 'pop': [3528, 0.341],
    'hammer-1': [28665, 0.832], 'hammer-2': [44100, 0.58], 'hammer-3': [17419, 0.486], 'hammer-4': [21609, 0.544],
    'hammer-5': [8820, 0.507], 'fanfare': [73867, 0.525],
    'katze': [17199, 0.144], 'hund': [22491, 0.118], 'klingel': [12568, 0.516], 'knarren': [70340, 0.106],
  };
  // Schleifen: Raumgeräusche −38…−40 dBFS RMS (deutlich unter den Effekten), Spannung −27 dBFS RMS (wie die Musik)
  const SCHLEIFEN = {
    'atmo-strasse': [529200, 0.156], 'atmo-hof': [441000, 0.075], 'atmo-garten': [441000, 0.103], 'atmo-innen': [530302, 0.334],
    'atmo-keller': [441000, 0.331], 'atmo-dach': [441000, 0.137], 'spannung': [431968, 0.191],
  };
  const MUSIK = { datei: '../klaenge/musik.mp3', proben: 1411200, pegel: 0.22 };
  // erst bei Bedarf laden (größer oder selten): Raumgeräusche, Spannung, Herz, Endbild-Klänge, Straße, Knarren
  const SPAETER = ['herz', 'hammer-1', 'hammer-2', 'hammer-3', 'hammer-4', 'hammer-5', 'fanfare', 'katze', 'hund', 'klingel', 'knarren'];
  // leichte Tonhöhen-Variation (±), damit Wiederholungen nicht nerven
  const VARI = { klick: 0.06, tick: 0.08, fund: 0.03, fehltipp: 0.02, hinweis: 0.06, gebot: 0.02, stempel: 0.05, pop: 0.04, katze: 0.06, hund: 0.04 };
  // Seltenheit: [Mindestabstand in s, Chance] – Straßen-Geräusche nur ab und zu, wenn die Figur durchs Bild läuft
  const SELTEN = { katze: [60, 0.4], hund: [60, 0.4], klingel: [60, 0.4] };
  const STRASSE_ABSTAND = 25;   // zwischen zwei Straßen-Geräuschen (gleich welches) mindestens so viele Sekunden
  // Räume der Besichtigung → Raumgeräusch; Dachboden mit gelegentlichem Knarren
  const RAUM = { strasse: 'atmo-strasse', fassade: 'atmo-strasse', grundstueck: 'atmo-garten', garten: 'atmo-garten', hof: 'atmo-hof',
    flur: 'atmo-innen', wohnzimmer: 'atmo-innen', kueche: 'atmo-innen', bad: 'atmo-innen', schlafzimmer: 'atmo-innen',
    keller: 'atmo-keller', dach: 'atmo-dach' };
  const KNARREN = [9, 22];   // Abstand in s (zufällig dazwischen)
  // Szenen: start (Musik) – buero (Anruf, Schätzen, Käufer, Exposé, Einblendungen: leise Innen-Atmosphäre) – raum (Besichtigung)
  // – bieter (Spannung, Innen-Atmosphäre sehr leise) – ende (Endbild: Hammer, Fanfare, dann Musik)
  const ATMO_FAKTOR = { buero: 0.7, raum: 1, bieter: 0.4 };

  const info = n => n === 'musik' ? [MUSIK.proben, MUSIK.pegel] : FX[n] || SCHLEIFEN[n];
  const url = n => n === 'musik' ? MUSIK.datei : 'klaenge/' + n + '.mp3';

  // ---------- Grundlagen ----------
  let ac = null, haupt = null, busFx = null, busAtmo = null, busMusik = null;
  let speicherGeht = true;
  const tonGespeichert = () => { try { return localStorage.getItem('mg:ton') !== 'aus'; } catch (e) { speicherGeht = false; return true; } };
  let tonAn = tonGespeichert();
  const bytes = {}, puffer = {}, laedt = {}, zuletzt = {};
  const protokoll = [];
  function merken(name, art) {
    const e = { t: +(performance.now() / 1000).toFixed(2), name, art };
    protokoll.push(e); if (protokoll.length > 400) protokoll.shift();
    if (PROTO_KONSOLE) console.debug('[Ton]', art, name);   // eslint-disable-line no-console
  }
  function holen(n) {
    // fehlgeschlagen (z. B. Verbindung abgebrochen): nicht merken, beim nächsten Anlass neu versuchen
    if (!bytes[n]) bytes[n] = fetch(url(n)).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null).then(b => { if (!b) delete bytes[n]; return b; });
    return bytes[n];
  }
  // MP3 bringt vorn 1105 Proben Stille (22,05 kHz) und hinten Füllstille mit – wie im Rahmen genau auf die echte Länge schneiden
  function zuschneiden(b, proben) {
    const RATE = 22050, VORLAUF = 1105, ueber = b.duration * RATE - proben;
    if (ueber < 2) return b;
    const ab = Math.round((ueber >= VORLAUF - 4 ? VORLAUF : 0) / RATE * b.sampleRate);
    const laenge = Math.min(b.length - ab, Math.round(proben / RATE * b.sampleRate));
    const neu = ac.createBuffer(b.numberOfChannels, laenge, b.sampleRate);
    for (let k = 0; k < b.numberOfChannels; k++) neu.getChannelData(k).set(b.getChannelData(k).subarray(ab, ab + laenge));
    return neu;
  }
  function laden(n) {
    if (puffer[n]) return Promise.resolve(puffer[n]);
    if (!ac) return Promise.resolve(null);
    if (!laedt[n]) {
      laedt[n] = holen(n)
        .then(b => b ? new Promise(ok => ac.decodeAudioData(b.slice(0), ok, () => ok(null))) : null)
        .then(b => { b = b ? zuschneiden(b, info(n)[0]) : null; puffer[n] = b; if (!b) delete laedt[n]; return b; })
        .catch(() => { delete laedt[n]; return null; });
    }
    return laedt[n];
  }
  function aufbauen() {
    haupt = ac.createGain(); haupt.gain.value = tonAn ? 1 : 0.0001;
    // sanfter Begrenzer, falls einmal mehrere Klänge zusammenfallen
    const grenze = ac.createDynamicsCompressor();
    grenze.threshold.value = -6; grenze.knee.value = 6; grenze.ratio.value = 12; grenze.attack.value = 0.003; grenze.release.value = 0.25;
    haupt.connect(grenze).connect(ac.destination);
    busFx = ac.createGain(); busAtmo = ac.createGain(); busMusik = ac.createGain();
    [busFx, busAtmo, busMusik].forEach(b => b.connect(haupt));
  }
  // Browser geben Ton erst nach einem Tippen frei: dann Ton-Umgebung anlegen und die Effekte dekodieren.
  // Kommt man per „Spielen!“ von der Startseite, erlaubt der Browser den Ton oft schon (Tippen vor dem Seitenwechsel).
  function wecken() {
    if (!tonAn) return;
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC(); } catch (e) { return; }
      aufbauen();
      Object.keys(FX).filter(n => !SPAETER.includes(n)).forEach(laden);
      ac.onstatechange = () => { if (ac.state === 'running') anwenden(); };
    }
    if (ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {});
    anwenden();
  }
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(e => addEventListener(e, wecken, { passive: true, capture: true }));
  // Tab im Hintergrund: Ton anhalten (Musik soll nicht weiterlaufen)
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {});
    else if (tonAn) ac.resume().catch(() => {});
  });
  // Ton-Knopf des Rahmens: sein Klick-Handler läuft zuerst und schreibt mg:ton – danach hier lesen
  const knopf = document.querySelector('#tonKnopf');
  if (knopf) knopf.addEventListener('click', () => {
    tonAn = speicherGeht ? tonGespeichert() : !tonAn;
    merken(tonAn ? 'an' : 'aus', 'schalter');
    if (!ac) { wecken(); return; }
    const t = ac.currentTime;
    haupt.gain.cancelScheduledValues(t); haupt.gain.setValueAtTime(Math.max(0.0001, haupt.gain.value), t);
    if (tonAn) { haupt.gain.linearRampToValueAtTime(1, t + 0.3); ac.resume().catch(() => {}); anwenden(); }
    else { haupt.gain.linearRampToValueAtTime(0.0001, t + 0.25); setTimeout(() => { if (!tonAn) { allesAus(); ac.suspend().catch(() => {}); } }, 350); }
  });
  const laeuft = () => tonAn && ac && ac.state === 'running';

  // ---------- Effekte ----------
  // o: { faktor (Pegel ×), rate, vari, verzoegerung (s), schleife, ein (Einblenden s) }
  function spielen(name, o) {
    o = o || {};
    const f = FX[name];
    if (!f) return null;
    if (!laeuft()) { merken(name, 'still'); return null; }
    const b = puffer[name];
    if (!b) { laden(name); merken(name, 'laedt'); return null; }
    const jetzt = ac.currentTime, vorher = zuletzt[name] != null ? jetzt - zuletzt[name] : 1e9;
    const s = SELTEN[name];
    if (s && (vorher < s[0] || Math.random() > s[1])) { merken(name, 'selten'); return null; }
    if (vorher < 0.035 && !o.verzoegerung) return null;   // gleicher Klang doppelt im selben Augenblick
    zuletzt[name] = jetzt;
    const q = ac.createBufferSource(), v = ac.createGain();
    q.buffer = b; q.loop = !!o.schleife;
    const vari = o.vari != null ? o.vari : (VARI[name] || 0);
    q.playbackRate.value = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * vari);
    const pegel = f[1] * (o.faktor != null ? o.faktor : 1), t = jetzt + (o.verzoegerung || 0);
    if (o.ein) { v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(pegel, t + o.ein); } else v.gain.value = pegel;
    q.connect(v).connect(busFx);
    q.start(t);
    merken(name, o.verzoegerung ? 'spielt+' + o.verzoegerung : 'spielt');
    let weg = false;
    return {
      aus(dauer) {
        if (weg) return; weg = true;
        const d = dauer != null ? dauer : 0.12, a = ac.currentTime;
        try { v.gain.cancelScheduledValues(a); v.gain.setValueAtTime(Math.max(0.0001, v.gain.value), a); v.gain.linearRampToValueAtTime(0.0001, a + d); q.stop(a + d + 0.03); } catch (e) { /* schon zu Ende */ }
      },
      pegel(p, d) { try { const a = ac.currentTime; v.gain.cancelScheduledValues(a); v.gain.setValueAtTime(Math.max(0.0001, v.gain.value), a); v.gain.linearRampToValueAtTime(Math.max(0.0001, f[1] * p), a + (d || 0.05)); } catch (e) { /* egal */ } },
      rate(r) { try { q.playbackRate.setTargetAtTime(r, ac.currentTime, 0.05); } catch (e) { /* egal */ } },
    };
  }

  // ---------- Szenen: Musik, Raumgeräusche, Spannung ----------
  let szene = 'start', ort = null, musikAb = 0;
  let musik = null, musikWartet = false;
  const atmo = {};   // Name → { q, v, ziel } bzw. 'laedt'
  let knarrUhr = null, musikUhr = null;
  let spannung = null, spannungWartet = false, spannungStufe = 0, herz = null, spannungFertig = false, strasseZuletzt = -1e9;

  function rampe(p, ziel, d) { const t = ac.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(Math.max(0.0001, p.value), t); p.linearRampToValueAtTime(Math.max(0.0001, ziel), t + d); }
  function stoppen(o, d) { if (!o) return; try { rampe(o.v.gain, 0.0001, d); o.q.stop(ac.currentTime + d + 0.05); } catch (e) { /* egal */ } }

  function musikSoll() { return szene === 'start' || (szene === 'ende' && performance.now() >= musikAb); }
  function musikSetzen() {
    if (!musikSoll()) { if (musik) { stoppen(musik, 1.0); musik = null; merken('musik', 'aus'); } return; }
    if (musik || musikWartet) return;
    musikWartet = true;
    laden('musik').then(b => {
      musikWartet = false;
      if (!b || !laeuft() || musik || !musikSoll()) return;
      const q = ac.createBufferSource(), v = ac.createGain(), t = ac.currentTime;
      q.buffer = b; q.loop = true;   // Datei ist als Schleife geschnitten (Schlussakkord in den Anfang geblendet)
      v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(MUSIK.pegel, t + (szene === 'ende' ? 2.0 : 1.2));
      q.connect(v).connect(busMusik); q.start();
      musik = { q, v };
      merken('musik', 'an');
    });
  }
  function atmoSoll() {
    if (szene === 'raum') return RAUM[ort] || 'atmo-innen';
    if (szene === 'buero' || szene === 'bieter') return 'atmo-innen';
    return null;
  }
  function atmoSetzen() {
    const soll = atmoSoll(), faktor = ATMO_FAKTOR[szene] || 1;
    Object.keys(atmo).forEach(n => {
      if (n === soll || atmo[n] === 'laedt') return;
      const a = atmo[n]; delete atmo[n];
      stoppen(a, 1.0);   // Kreuzblende beim Raumwechsel: altes Geräusch 1s aus, neues 1,2s ein
      merken(n, 'aus');
    });
    if (!soll) return;
    if (atmo[soll] && atmo[soll] !== 'laedt') {   // gleiches Geräusch, andere Szene: nur Lautstärke
      const z = SCHLEIFEN[soll][1] * faktor;
      if (Math.abs(atmo[soll].ziel - z) > 1e-4) { rampe(atmo[soll].v.gain, z, 0.8); atmo[soll].ziel = z; }
      return;
    }
    if (atmo[soll]) return;
    atmo[soll] = 'laedt';
    laden(soll).then(b => {
      const noch = atmoSoll() === soll;
      if (!b || !laeuft() || !noch) { delete atmo[soll]; if (noch && laeuft()) setTimeout(atmoSetzen, 0); return; }
      const q = ac.createBufferSource(), v = ac.createGain(), t = ac.currentTime, z = SCHLEIFEN[soll][1] * (ATMO_FAKTOR[szene] || 1);
      q.buffer = b; q.loop = true;
      v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(z, t + 1.2);
      q.connect(v).connect(busAtmo); q.start(t, Math.random() * b.duration);
      atmo[soll] = { q, v, ziel: z };
      merken(soll, 'an');
    });
  }
  // Dachboden: gelegentliches Knarren
  function knarrenPlanen(weiter) {
    clearTimeout(knarrUhr); knarrUhr = null;
    if (!(szene === 'raum' && ort === 'dach')) return;
    laden('knarren');
    // das erste Knarren kommt bald nach dem Betreten (3–7s), danach alle 9–22s
    const s = weiter ? KNARREN[0] + Math.random() * (KNARREN[1] - KNARREN[0]) : 3 + Math.random() * 4;
    knarrUhr = setTimeout(() => {
      if (szene !== 'raum' || ort !== 'dach') return;
      if (!document.hidden) spielen('knarren');
      knarrenPlanen(true);
    }, s * 1000);
  }
  // Spannung der Bieterrunde: Schleife, die mit den Geboten lauter und etwas schneller wird; beim Zögern stockt sie
  // (fast still, Herzschlag), nach dem Zuschlag aus
  const SP_PEGEL = st => 0.75 + 0.25 * st, SP_TEMPO = st => 1 + 0.06 * st;
  function spannungSetzen() {
    const soll = szene === 'bieter' && !spannungFertig;   // nach dem Zuschlag nicht wieder anfangen (Tippen weckt anwenden)
    if (!soll) { if (spannung) { stoppen(spannung, 0.25); spannung = null; merken('spannung', 'aus'); } herzAus(); return; }
    if (spannung || spannungWartet) return;
    spannungWartet = true;
    laden('spannung').then(b => {
      spannungWartet = false;
      if (!b || !laeuft() || spannung || szene !== 'bieter' || spannungFertig) return;
      const q = ac.createBufferSource(), v = ac.createGain(), t = ac.currentTime, f = SCHLEIFEN.spannung[1];
      q.buffer = b; q.loop = true; q.playbackRate.value = SP_TEMPO(spannungStufe);
      v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(f * SP_PEGEL(spannungStufe), t + 0.6);
      q.connect(v).connect(busMusik); q.start();
      spannung = { q, v, stockt: false };
      merken('spannung', 'an');
    });
  }
  function herzAus() { if (herz) { herz.aus(0.15); herz = null; merken('herz', 'aus'); } }

  function anwenden() {
    if (!laeuft()) return;
    musikSetzen();
    atmoSetzen();
    spannungSetzen();
  }
  function allesAus() {
    if (!ac) return;
    const t = ac.currentTime;
    if (musik) { try { musik.q.stop(t + 0.05); } catch (e) { /* egal */ } musik = null; }
    if (spannung) { try { spannung.q.stop(t + 0.05); } catch (e) { /* egal */ } spannung = null; }
    if (herz) { herz.aus(0.02); herz = null; }
    Object.keys(atmo).forEach(n => { const a = atmo[n]; delete atmo[n]; if (a !== 'laedt') try { a.q.stop(t + 0.05); } catch (e) { /* egal */ } });
  }
  function szeneSetzen(name, o) {
    if (name === szene && (o || null) === ort && name !== 'ende') return;
    szene = name; ort = name === 'raum' ? (o || null) : null;
    merken(name + (ort ? ' ' + ort : ''), 'szene');
    if (name !== 'bieter') spannungStufe = 0;
    spannungFertig = false;
    clearTimeout(musikUhr);
    knarrenPlanen();
    if (ac) anwenden();
  }

  // ---------- Endbild: Knall-Stern ploppt, Hammer je Stufe haut hinein (Stufe 5 fällt daneben), Fanfare, dann Musik ----------
  // Zeiten passend zur Animation in hammerpreis.css: Hammer trifft nach ca. 0,93s, Stufe 5 landet nach ca. 1,7s.
  function ende(stufe, abbruch, ruhig) {
    szeneSetzen('ende');
    const treffer = ruhig ? 0.35 : 0.93;
    let musikNach = 1.6;
    spielen('pop', { verzoegerung: 0.04 });
    if (!abbruch && stufe != null) {
      const nr = stufe + 1;
      laden('hammer-' + nr); laden('fanfare');
      const hammerZeit = nr === 5 ? (ruhig ? 0.35 : 1.5) : treffer;
      setTimeout(() => { if (szene === 'ende') spielen('hammer-' + nr); }, hammerZeit * 1000);
      if (nr <= 4) {
        const fz = hammerZeit + (nr === 1 ? 1.25 : nr === 2 ? 1.0 : 0.75);
        setTimeout(() => { if (szene === 'ende') spielen('fanfare'); }, fz * 1000);
        musikNach = fz + 3.0;
      } else musikNach = hammerZeit + 1.3;
    }
    musikAb = performance.now() + musikNach * 1000;
    musikUhr = setTimeout(() => { if (szene === 'ende' && ac) anwenden(); }, musikNach * 1000 + 20);
    merken('ende s' + (abbruch ? '-' : stufe + 1), 'plan');
  }

  window.HN_KLANG = {
    // Szene wechseln: 'start' | 'buero' | 'raum' (mit Raum-ID) | 'bieter' | 'ende'
    szene: szeneSetzen,
    ton: spielen,
    ende,
    // Bieterrunde: Gebot (Stufe 0–1 = Fortschritt zum Höchstgebot), Zögern (Stocken + Herzschlag), Schluss (Zuschlag)
    gebot(stufe) {
      spielen('gebot');
      spannungStufe = Math.max(0, Math.min(1, stufe || 0));
      if (spannung && !spannung.stockt) {
        rampe(spannung.v.gain, SCHLEIFEN.spannung[1] * SP_PEGEL(spannungStufe), 0.3);
        spannung.q.playbackRate.setTargetAtTime(SP_TEMPO(spannungStufe), ac.currentTime, 0.2);
      }
    },
    zoegern() {
      if (spannung) { spannung.stockt = true; rampe(spannung.v.gain, SCHLEIFEN.spannung[1] * 0.12, 0.05); merken('spannung', 'stockt'); }
      if (laeuft() && !herz) { laden('herz'); herz = spielen('herz', { schleife: true, ein: 0.05 }); }
    },
    schluss() {
      spannungFertig = true;
      herzAus();
      if (spannung) { stoppen(spannung, 0.12); spannung = null; merken('spannung', 'aus'); }
    },
    // Straßenfigur läuft ins Bild (szene.js): selten und leise, nur im Spiel
    strasse(name) {
      if (!(szene === 'buero' || szene === 'raum') || !laeuft()) return;
      if (ac.currentTime - strasseZuletzt < STRASSE_ABSTAND) { merken(name, 'selten'); return; }
      if (spielen(name)) strasseZuletzt = ac.currentTime;
    },
    // Klänge schon laden (Bytes; mit Ton-Umgebung gleich dekodieren), z. B. Raumgeräusche der Räume des nächsten Objekts
    vorladen(namen) { namen.forEach(n => { if (info(n)) { if (ac) laden(n); else holen(n); } }); },
    raumKlang: id => RAUM[id] || 'atmo-innen',
    get an() { return !!laeuft(); },
    protokoll,
    zustand() {
      return { szene, ort, ton: tonAn, kontext: ac ? ac.state : 'keiner',
        musik: musik ? +musik.v.gain.value.toFixed(4) : 0,
        spannung: spannung ? { pegel: +spannung.v.gain.value.toFixed(4), tempo: +spannung.q.playbackRate.value.toFixed(3), stockt: spannung.stockt } : null,
        herz: !!herz,
        atmo: Object.keys(atmo).map(n => atmo[n] === 'laedt' ? n + ' (lädt)' : n + ' ' + atmo[n].v.gain.value.toFixed(3)),
        dekodiert: Object.keys(puffer).filter(n => puffer[n]).length };
    },
  };
  // Effekte und Musik schon laden (Bytes), dekodiert wird nach dem ersten Tippen (bzw. sofort, wenn der Browser Ton erlaubt).
  // Korrekturrunde 1: erst NACH den Skripten (DOMContentLoaded) bzw. die Musik nach dem Laden der Seite – vorher belegten die
  // rund 20 Klang-Anfragen die Verbindungen, die Skripte warteten, und das Startbild blieb beim ersten Laden 2–3s leer.
  function vorab() {
    Object.keys(FX).filter(n => !SPAETER.includes(n)).forEach(holen);
    holen('atmo-innen');
    wecken();
  }
  const musikVorab = () => setTimeout(() => holen('musik'), 200);
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => setTimeout(vorab, 100), { once: true });
  else setTimeout(vorab, 100);
  if (document.readyState === 'complete') musikVorab(); else addEventListener('load', musikVorab, { once: true });

  // Rahmen.ton umleiten: eigene Aufnahmen hier, erzeugte Töne (dreh, wisch …) weiter im Rahmen
  if (R_ && R_.ton) {
    const rahmenTon = R_.ton;
    R_.ton = function (name, ab) {
      if (FX[name]) { const h = spielen(name); return { aus() { if (h) h.aus(); } }; }
      if (name === 'bestwert') return { aus() {} };   // Endbild hat eigene Klänge (Hammer, Fanfare)
      return rahmenTon(name, ab);
    };
  }
})();
