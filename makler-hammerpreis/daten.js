// „Hammerpreis“ – Regeln, Preisformel und Zuordnungen des Spiels „Objekt-Lauf“ (Phase 2, 26.10.2026).
// Die TEXTE (100 Objekte, 60 Mängel/Pluspunkte, 40 Käufer, 30 Eigentümer, 20 Ereignisse, 20 Tagesaufträge, 70 Sprüche,
// Rahmentexte) kommen aus texte.js – erzeugt von Material/Skripte/daten-bauen.py aus Material/Texte/hausnummer-*-entwurf.md.
// Texte nie in texte.js ändern, sondern im Entwurf und dann das Skript laufen lassen. Hier stehen nur Zahlen und Regeln.
// Preise: „Preisspiegel Musterstadt“ (fiktiv, Kleinstadt im flachen Niederbayern) – Spielpreise, keine Wertermittlung.
// Bilder: bilder.js (erzeugt) listet, was in makler-hammerpreis/bilder/ liegt; fehlt ein Bild, zeichnet der Code (Rückfall).
(function () {
  'use strict';
  const TX = window.HN_TEXTE || {}, RT = TX.rahmen || {};

  // ---------- Regeln ----------
  const regeln = {
    objekte: 10,                  // Objekte je Durchgang
    stufenFolge: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],   // Schwierigkeit der Objekte 1–10 (Text Writer: 1–3 leicht, 4–7 mittel, 8–10 schwer)
    jeArtHoechstens: 3,           // höchstens drei Objekte derselben Art je Durchgang (Ausnahme: Tagesauftrag braucht mehr)
    hoechst: 1000,                // höchstens 1.000 Punkte
    stufen: [900, 800, 700, 550], // gemeinsame Stufengrenzen
    // Punkte je Objekt (Summe 100): Schätzung 50, Besichtigung 15, Käufer 15, Bieterrunde 20
    punkte: { schaetzung: 50, besichtigung: 15, kaeufer: 15, bieter: 20 },
    // Schätzung nach den Stufen der Rahmentexte (Volltreffer bis 3 %, Sehr nah bis 8 %, Knapp bis 15 %, Daneben bis 35 %,
    // darüber Ladenhüter): Punkte an den Grenzen, dazwischen gleichmäßig
    schaetzungPunkte: [[3, 50], [8, 40], [15, 25], [35, 5]],
    hinweisKosten: 3,             // je aufgedecktem Hinweis −3 Punkte (von der Schätzung, nicht unter 0)
    fehltippKosten: 2,            // Besichtigung: je Fehltipp −2 (nicht unter 0)
    fundGewicht: { klein: 1, mittel: 2, 'groß': 3 },   // Besichtigung: Gewicht je Merkmal nach Wirkung (Text Writer)
    kaeuferPunkte: { passt: 15, budget: 5, wunsch: 3 },   // passt / Budget zu klein / Wünsche passen nicht
    bieterSpaet: 4,               // zu lange gewartet: Bestbieter steigt aus, Verkauf an den Zweiten
    // Bieterrunde in beide Richtungen (Idee MZ, Balancing-Runde 1, 27.10.2026): Start = Schätzung des Spielers, jeder Bieter
    // hat ein verdecktes Limit (Anteil des Marktwerts). Dein Käufer nach Rolle: passt ≈ 105 %, Budget zu klein = sein Budget
    // (höchstens 97 %), passt nicht ≈ 93 %; Mitbieter zufällig zwischen mitVon und mitBis.
    bieterLimit: { passt: 1.05, wunsch: 0.93, budgetMax: 0.97, mitVon: 0.88, mitBis: 1.12 },
    bieterExakt: 0.015,           // Start näher als 1,5 % des Marktwerts am höchsten Limit = „fast exakt“: kurzes Hin und Her, dann das Fenster
    bieterSperre: 0.8,            // sinkende Gebote: Zuschlag, bevor jemand zugreift = Knopf 0,8s gesperrt („Noch greift keiner zu“)
    ladenhueterAb: 35,            // Schätzung mehr als 35 % ZU HOCH → nicht verkauft („Ladenhüter“)
    // Schätzung mehr als 35 % ZU NIEDRIG → „Verkauf unter Wert“ (MZ, 27.10.2026): verkauft zum geschätzten Preis, 0 Schätzpunkte,
    // Käufer und Bieterrunde entfallen (bei dem Preis greift der erste Interessent zu; 0 Käufer- und 0 Bieterpunkte),
    // Provision vom niedrigen Preis. Zählt als verkauft (Tagesauftrag, Statistik), nie als Ladenhüter.
    unterWertAb: 35,
    // Korrekturrunde 2 (27.10.2026): unter Wert soll sich nicht belohnend anfühlen – nur die halbe Provisionsquote
    // („Rabatt-Ärger mit dem Eigentümer“, Zeile im Exposé). 1 = volle Provision.
    unterWertProvision: 0.5,
    ladenhueterMax: 3,            // drei Ladenhüter = Abbruch (0 Punkte, nie Bestwert)
    provision: 0.0357,            // Käuferprovision 3,57 % (inkl. MwSt.) vom Verkaufspreis
    auftragBonus: 5000,           // Tagesauftrag erfüllt: +5.000 € Provision (zählt nicht in die Punkte; Feld „Bonus“ der Texte ungenutzt)
    verschweigenBonus: 2000,      // verschwiegenen Mangel bei der Besichtigung gefunden: +2.000 € Provision (MZ, 26.10.2026; keine Punkte)
    ereignisseNach: [[3, 4], [6, 7]],   // Markt-Ereignis nach Objekt 3 oder 4 und nach 6 oder 7
    // SCHALTER Spieldauer (MZ: „notfalls kürzen wir später Bieterrunden“) – NICHT eingeschaltet:
    // bieterrundeJedes: 1 = bei jedem Objekt, 2 = nur bei jedem zweiten Objekt (2, 4, 6 …), 3 = jedem dritten.
    // bieterrundeBegehrt: true = zusätzlich immer, wenn mindestens zwei Käufer aus dem Pool perfekt passen würden.
    // Ohne Bieterrunde: Verkauf zum Höchstgebot des gewählten Käufers, Bieter-Punkte = 20 × Käufer-Punkte / 15.
    bieterrundeJedes: 1,
    bieterrundeBegehrt: false,
    // Regler beim Schätzen: Bereich um den Wunschpreis des Eigentümers
    reglerVon: 0.5, reglerBis: 1.5,
    // Eigentümer: in den ersten drei Objekten nur mit Faktor in diesem Bereich (leichter), danach alle
    leichtFaktor: [0.88, 1.16],
  };

  // Schwierigkeit steigt über die zehn Objekte gleichmäßig (Objekt 1 → Objekt 10)
  const schwer = {
    besichtigungZeit: [10, 7],    // Sekunden Grundzeit …
    raumZeit: [2.5, 2],           // … plus je Raum der Besichtigung
    trefferRadius: [1.0, 0.75],   // Anteil der Grundgröße
    flaecheUngenau: [0.05, 0.15], // „ca.“-Fläche des Eigentümers weicht so weit ab
    budgetLuecke: [0.78, 0.93],   // Käufer mit zu kleinem Budget: Anteil des Marktwerts (nur wenn das Profil-Budget nicht passt)
    bieterTakt: [0.56, 0.38],     // Sekunden zwischen zwei Geboten
    bieterFenster: [1.6, 1.0],    // so lange zögern die Bieter am Höchstgebot (Korrekturrunde 2: vorher 1,4 → 0,6s, zu knapp)
  };

  // ---------- Preisspiegel Musterstadt ----------
  // Grundpreis je m² Wohnfläche (Bauplatz: je m² Grundstück) = Grundwert der Art × Faktor des Viertels, auf 50 € (Bauplatz 5 €) gerundet
  const viertel = [
    { id: 'altstadt', name: 'Altstadt', schluessel: 'VIERTEL_ALTSTADT', faktor: 1.15, farbe: '#f4b8a8', karte: [0.40, 0.42] },
    { id: 'schloss', name: 'Schlossviertel', schluessel: 'VIERTEL_SCHLOSSVIERTEL', faktor: 1.2, farbe: '#cdb8f0', karte: [0.62, 0.24] },
    { id: 'bahnhof', name: 'Bahnhof', schluessel: 'VIERTEL_BAHNHOF', faktor: 0.85, farbe: '#c9ccd3', karte: [0.24, 0.66] },
    { id: 'bach', name: 'Am Bach', schluessel: 'VIERTEL_AM_BACH', faktor: 1.0, farbe: '#a8d8f0', karte: [0.66, 0.62] },
    { id: 'neubau', name: 'Neubaugebiet', schluessel: 'VIERTEL_NEUBAUGEBIET', faktor: 1.1, farbe: '#bfe6a8', karte: [0.85, 0.40] },
    { id: 'ortsrand', name: 'Ortsrand', schluessel: 'VIERTEL_ORTSRAND', faktor: 0.8, farbe: '#f0dc9a', karte: [0.16, 0.24] },
  ];
  // Acht Arten laut Konzept/Text Writer. grund = €/m² bei Viertel-Faktor 1,0. hofGrund: Bauernhof zusätzlich je m² Grundstück.
  // raeume = Räume, die es in der Art gibt (Prüfung der Texte, Bilder). mehr = Mehrzahl (Ereignisse).
  const arten = [
    { id: 'stadtwohnung', name: 'Stadtwohnung', mehr: 'Stadtwohnungen', grund: 2900 },
    { id: 'dachwohnung', name: 'Dachwohnung', mehr: 'Dachwohnungen', grund: 2800 },
    { id: 'reihenhaus', name: 'Reihenhaus', mehr: 'Reihenhäuser', grund: 2600 },
    { id: 'efh', name: 'Einfamilienhaus', mehr: 'Einfamilienhäuser', grund: 2800 },
    { id: 'altbau', name: 'Altbau', mehr: 'Altbauten', grund: 2500 },
    { id: 'neubau', name: 'Neubau', mehr: 'Neubauten', grund: 2900 },
    { id: 'bauernhof', name: 'Bauernhof', mehr: 'Bauernhöfe', grund: 1800, hofGrund: 15 },
    { id: 'bauplatz', name: 'Bauplatz', mehr: 'Bauplätze', grund: 200, jeGrund: true },
  ];
  const rund = (x, n) => Math.round(x / n) * n;
  const art = id => arten.find(a => a.id === id);
  const viertelVon = id => viertel.find(v => v.id === id);
  const qmPreis = (a, v) => rund(art(a).grund * viertelVon(v).faktor, a === 'bauplatz' ? 5 : 50);

  // Zu- und Abschläge (Anteile, 0.08 = +8 %)
  const baujahre = [
    { bis: 1949, name: 'vor 1950', wert: -0.08 },
    { bis: 1979, name: '1950–1979', wert: -0.12 },
    { bis: 1999, name: '1980–1999', wert: -0.05 },
    { bis: 2014, name: '2000–2014', wert: 0 },
    { bis: 9999, name: 'ab 2015', wert: 0.08 },
  ];
  const zustaende = { neuwertig: 0.05, gepflegt: 0, 'renovierungsbedürftig': -0.10, 'sanierungsbedürftig': -0.20 };
  const energie = { 'A+': 0.06, A: 0.04, B: 0.02, C: 0, D: -0.02, E: -0.04, F: -0.06, G: -0.08, H: -0.10 };
  const energieKlassen = Object.keys(energie);
  // Wirkung der Mängel (−) und Pluspunkte (+) nach dem Feld „Wirkung“ der Texte (Vorschlag Text Writer 1/3/6 %)
  const wirkung = { klein: 0.01, mittel: 0.03, 'groß': 0.06 };
  const raumNamen = { bad: 'Bad', kueche: 'Küche', wohnzimmer: 'Wohnzimmer', schlafzimmer: 'Schlafzimmer', flur: 'Flur', keller: 'Keller',
    dach: 'Dach', fassade: 'Fassade', garten: 'Garten', strasse: 'Straße', hof: 'Hof', grundstueck: 'Grundstück' };
  // Reihenfolge des Rundgangs: von draußen nach drinnen
  const raumFolge = ['strasse', 'grundstueck', 'fassade', 'garten', 'hof', 'flur', 'wohnzimmer', 'kueche', 'bad', 'schlafzimmer', 'dach', 'keller'];
  // Räume, die zur Lage gehören (Hinweis „Lage“ deckt sie auf)
  const lageRaeume = ['strasse', 'grundstueck'];

  // Mängel/Pluspunkte aus den Texten mit Preiswirkung
  const merkmale = {};
  Object.values(TX.merkmale || {}).forEach(m => {
    merkmale[m.id] = Object.assign({}, m, { wert: (m.typ === 'plus' ? 1 : -1) * (wirkung[m.wirkung] || 0.03) });
  });

  // Marktwert eines Objekts (Spielpreis) mit allen Posten. markt = Liste aktiver Markt-Ereignisse.
  function betrifft(e, o) { return (!e.viertel || e.viertel.includes(o.viertel)) && (!e.arten || e.arten.includes(o.art)); }
  function preis(o, markt) {
    const a = art(o.art), v = viertelVon(o.viertel), flaeche = a.jeGrund ? o.grundstueck : o.flaeche;
    const qm = qmPreis(o.art, o.viertel), posten = [];
    let basis = flaeche * qm, hof = 0;
    if (a.hofGrund && o.grundstueck) { hof = o.grundstueck * a.hofGrund; basis += hof; }
    if (!a.jeGrund) {
      const bj = baujahre.find(b => o.baujahr <= b.bis);
      posten.push({ name: 'Baujahr ' + o.baujahr, wert: bj.wert, art: 'baujahr' });
      posten.push({ name: 'Zustand ' + o.zustand, wert: zustaende[o.zustand] || 0, art: 'zustand' });
      if (o.energie) posten.push({ name: 'Energie ' + o.energie, wert: energie[o.energie] || 0, art: 'energie' });
    }
    (o.merkmale || []).forEach(id => { const m = merkmale[id]; if (m) posten.push({ name: m.name, wert: m.wert, art: 'merkmal', id }); });
    (markt || []).forEach(e => { if (betrifft(e, o)) posten.push({ name: e.titel, wert: e.wert, art: 'markt' }); });
    let wert = basis;
    posten.forEach(p => { wert *= 1 + p.wert; });
    return { flaeche, qm, basis, hof, hofGrund: a.hofGrund || 0, grundstueck: o.grundstueck, posten, preis: rund(wert, 1000), viertel: v.name, art: a.name };
  }

  // ---------- Käufer passend? ----------
  // Prüfung nach dem Vorschlag des Text Writers: Art in „Arten“, Viertel passt (oder egal), mindestens ein Wunsch in den
  // Extras (Objekt ohne Extras wie Bauplatz: Wünsche zählen nicht), kein NoGo-Mangel im Objekt. Das Budget prüft spiel.js gegen den Marktwert.
  function passung(k, o) {
    return {
      art: k.arten.includes(o.art),
      viertel: !k.viertel || k.viertel.includes(o.viertel),
      // Objekte ohne Extras (Bauplatz, „keine“): Wünsche zählen nicht
      wunsch: !k.wuensche.length || !(o.extras || []).length || k.wuensche.some(w => o.extras.includes(w)),
      nogo: !k.nogo.some(m => (o.merkmale || []).includes(m)),
    };
  }
  const passtGanz = p => p.art && p.viertel && p.wunsch && p.nogo;

  // ---------- Pools aus texte.js ----------
  const objekte = (TX.objekte || []).slice();
  const kaeufer = (TX.kaeufer || []).slice();
  const eigentuemer = (TX.eigentuemer || []).slice();
  const ereignisse = (TX.ereignisse || []).slice();
  // Ereignisse, die sich widersprechen, nie im selben Durchgang
  const ereignisNichtZusammen = [['EVT-01', 'EVT-02'], ['EVT-10', 'EVT-11'], ['EVT-08', 'EVT-09']];
  const auftraege = (TX.auftraege || []).slice();
  const sp = TX.sprueche || {};
  // Sprüche je Figur (Feld „Figur“ der Texte): beide Spielfiguren, nur Maklerin, nur Makler, Konkurrenz
  const sprueche = { beide: sp.beide || {}, maklerin: sp.maklerin || {}, makler: sp.makler || {}, konkurrenz: sp.konkurrenz || {} };
  const konkurrenz = { name: 'Benno Prunk', firma: 'Prunk & Partner' };   // MZ, 26.10.2026

  // ---------- Rahmentexte ----------
  const r = (k, ersatz) => RT[k] != null ? RT[k] : ersatz;
  const variante = (k, ersatz) => { const v = RT[k]; return Array.isArray(v) && v.length ? v : [ersatz]; };
  const schritte = r('SCHRITT', []);
  const hinweisText = k => r(k, { name: '', text: '' });
  const texte = {
    titel: 'Hammerpreis',
    fragen: variante('START_FRAGE', 'Was ist das Haus wert?'),
    anleitung: r('START_ANLEITUNG', ''),
    hinweisSpiel: (r('HINWEIS_SPIELPREISE', {}).kurz) || 'Spielpreise – keine Wertermittlung',
    hinweisSpielLang: (r('HINWEIS_SPIELPREISE', {}).lang) || '',
    // Abschlusstexte je Stufe (900/800/700/550/darunter)
    abschluss: r('ABSCHLUSS', []),
    // Bewertungen (MZ, 27.10.2026): Presslufthammer – Vorschlaghammer – Gummihammer – Nothammer – Nicht hammermäßig
    // (900/800/700/550/darunter); Quelle: Titel von ABSCHLUSS_1…5 in den Rahmentexten, sonst diese Reihe
    bewertungen: [0, 1, 2, 3, 4].map(i => { const a = r('ABSCHLUSS', [])[i]; return (a && a.titel) || ['Presslufthammer', 'Vorschlaghammer', 'Gummihammer', 'Nothammer', 'Nicht hammermäßig'][i]; }),
    abbruch: r('ABBRUCH_BAND', 'Zu viele Ladenhüter'),
    abbruchTexte: variante('ABBRUCH_TEXT', ''),
    einladung: variante('EINLADUNG', ''),
    kundenknopf: (r('KUNDENKNOPF', {}).knopf) || 'Was ist *dein* Haus wert?',
    schaetzung: r('SCHAETZUNG', []),
    // Schritt-Titel ohne Artikel (MZ, 27.10.2026, Platz): Anruf – Besichtigung – Preis – Käufer – Bieterrunde
    schrittTitel: [0, 1, 2, 3, 4].map(i => (schritte[i] && schritte[i].titel) || ['Anruf', 'Besichtigung', 'Preis', 'Käufer', 'Bieterrunde'][i]),
    schrittText: [0, 1, 2, 3, 4].map(i => (schritte[i] && schritte[i].text) || ''),
    schrittKurz: [0, 1, 2, 3, 4].map(i => (schritte[i] && schritte[i].titel) || ['Anruf', 'Besichtigung', 'Preis', 'Käufer', 'Bieterrunde'][i]),
    // Balancing-Runde 1 (27.10.2026): Zwischenscreens vor jedem Schritt (nur beim ersten Objekt), Texte von MZ
    info: [0, 1, 2, 3, 4].map(i => (r('INFO_SCHRITT', [])[i]) || ''),
    infoKnopf: r('INFO_KNOPF', 'Verstanden'),
    hinweise: {
      grundriss: hinweisText('HINWEIS_GRUNDRISS'), energie: hinweisText('HINWEIS_ENERGIEAUSWEIS'),
      stadtplan: hinweisText('HINWEIS_LAGE'), baujahr: hinweisText('HINWEIS_BAUJAHR'),
    },
    ui: {
      provision: r('UI_PROVISION', 'Provision heute'), auftrag: r('UI_TAGESAUFTRAG', 'Tagesauftrag'),
      erfuellt: r('UI_TAGESAUFTRAG_ERFUELLT', 'Tagesauftrag erfüllt'), verfehlt: r('UI_TAGESAUFTRAG_VERFEHLT', 'Tagesauftrag verfehlt'),
      markt: r('UI_MARKTMELDUNG', 'Marktmeldung'), zuschlag: r('UI_ZUSCHLAG', 'Zuschlag'),
      // „Score“ statt „Dein Bestwert“ (MZ, 26.10.2026)
      score: r('UI_SCORE', 'Score'), scoreNeu: r('UI_SCORE_NEU', 'Neuer Score'), scoreErster: r('UI_SCORE_ERSTER', 'Erster Score'),
      verschwiegen: r('UI_VERSCHWIEGEN', 'Verschwiegenen Mangel entdeckt'),
    },
    bilanz: '{v} von 10 Objekten verkauft – Ø {a} daneben',
    bilanzAbbruch: '{l} Ladenhüter – Schluss nach Objekt {k}',
    ladenhueter: 'Ladenhüter',
    // Korrekturrunde 1 (27.10.2026): Verkauf unter Wert, Erklärung und Rückmeldung der Bieterrunde
    unterWert: r('UNTERWERT_STUFE', 'Unter Wert verkauft'),
    unterWertKurz: 'Unter Wert',
    unterWertTexte: variante('UNTERWERT_TEXT', 'Viel zu günstig angesetzt.'),
    bieterErklaerung: Object.assign({ titel: 'So gewinnst du die Bieterrunde', text: '', tipp: '', knopf: 'Verstanden' }, r('BIETER_ERKLAERUNG', {})),
    bieterSatz: { fenster: r('BIETER_TREFFER', ''), frueh: r('BIETER_FRUEH', ''), spaet: r('BIETER_SPAET', ''),
      fensterSinkend: r('BIETER_TREFFER_SINKEND', r('BIETER_TREFFER', '')), spaetSinkend: r('BIETER_SPAET_SINKEND', r('BIETER_SPAET', '')),
      nochKeiner: r('BIETER_NOCH_KEINER', 'Noch greift keiner zu.') },
    bieterStatus: Object.assign({ steigen: 'Die Gebote steigen.', sinken: 'Der Preis sinkt.', zoegern: 'Alle zögern – jetzt zuschlagen.', zugriff: 'Einer greift zu – jetzt zuschlagen.' }, r('BIETER_STATUS', {})),
    // Hinweis-Screens bei „Unter Wert“ und „Ladenhüter“ (MZ: Variante b) und Exposé-Kopf bei normalem Verkauf (MZ: Variante a)
    skala: Object.assign({ links: 'viel zu günstig', mitte: 'passt', rechts: 'viel zu teuer' }, r('SKALA', {})),
    fehler: {
      unterwert: { band: r('UNTERWERT_STUFE', 'Unter Wert verkauft'), blasen: variante('UNTERWERT_EIGENTUEMER', 'Für {preis}? Viel zu billig.'),
        text: r('UNTERWERT_HINWEIS', ''), verlust: r('UNTERWERT_VERLUST', 'Verschenkt: {betrag}') },
      laden: { band: 'Ladenhüter', blasen: variante('LADENHUETER_EIGENTUEMER', 'Für {preis} will es keiner.'),
        text: r('LADENHUETER_HINWEIS', ''), verlust: r('LADENHUETER_VERLUST', 'Kein Verkauf – keine Provision') },
      tipp: r('FEHLER_TIPP', ''),
    },
    verkauftBlasen: { sehrgut: variante('VERKAUFT_EIGENTUEMER_SEHRGUT', 'Sehr gut verkauft.'), gut: variante('VERKAUFT_EIGENTUEMER_GUT', 'Gut verkauft.'),
      knapp: variante('VERKAUFT_EIGENTUEMER_KNAPP', 'Verkauft ist verkauft.') },
    // Korrekturrunde 2 (27.10.2026): Warnung nach dem vorletzten Ladenhüter, halbe Provision unter Wert, Rückfrage beim Haus-Knopf
    ladenWarnung: Object.assign({ titel: 'Achtung', text: 'Noch ein Ladenhüter und der Tag ist vorbei.', knopf: 'Weiter' }, r('LADENHUETER_WARNUNG', {})),
    unterWertProvision: r('UNTERWERT_PROVISION', 'Halbe Provision – Rabatt-Ärger mit dem Eigentümer'),
    beenden: Object.assign({ titel: 'Spiel wirklich beenden?', text: 'Dein Fortschritt geht verloren.', weiter: 'Weiterspielen', beenden: 'Beenden' }, r('BEENDEN_RUECKFRAGE', {})),
  };
  viertel.forEach(v => { const t = RT[v.schluessel]; v.text = t ? t.text : ''; });

  // ---------- Bilder (Anschlüsse für den Graphic Artist) ----------
  // Ein Bild gilt nur, wenn es in bilder.js steht (daten-bauen.py nach dem Ablegen laufen lassen). Namen und Maße:
  // Material/Uebergabe-Developer.md, Abschnitt „Bilder“.
  const vorhanden = new Set(window.HN_BILDER || []);
  function bild(pfad) {
    for (const endung of ['.webp', '.png']) { const p = 'bilder/' + pfad + endung; if (vorhanden.has(p)) return p; }
    return null;
  }

  window.HN = { regeln, schwer, viertel, arten, art, viertelVon, qmPreis, baujahre, zustaende, energie, energieKlassen, wirkung,
    merkmale, raumNamen, raumFolge, lageRaeume, preis, betrifft, passung, passtGanz, objekte, kaeufer, eigentuemer, ereignisse,
    ereignisNichtZusammen, auftraege, sprueche, konkurrenz, texte, rund, bild };
})();
