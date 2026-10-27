// „Hammerpreis“ – Ablauf „Objekt-Lauf“ (MZ, 26.10.2026): Startbild → Tagesauftrag → 10 Objekte (je Anruf, Besichtigung,
// Schätzen, Käufer, Bieterrunde, Exposé), dazwischen zwei Markt-Ereignisse → Endbild mit Exposé-Mappe.
// Punkte je Objekt höchstens 100 (Werte in daten.js regeln.punkte), Summe höchstens 1.000, wer durchspielt mind. 1 Punkt.
// Drei Ladenhüter (Schätzung mehr als 35 % zu hoch) = Abbruch, 0 Punkte, zählt nie als Bestwert. Mehr als 35 % zu niedrig = „Verkauf unter Wert“
// Bestwert speichert der Rahmen (mg:best:hammerpreis:<firma>); Statistik der Startseite nur nach echten Durchgängen.
// Zusammenstellung: zuerst der Tagesauftrag, dann zehn Objekte nach Schwierigkeit (3 leicht, 4 mittel, 3 schwer), so gewählt,
// dass der Auftrag erfüllbar ist. Eigentümer passend zur Art, Käufer nach Art/Viertel/Wünschen/NoGo/Budget.
//
// Testhilfen (Adresse):  #los  sofort starten   #objekt=N  ab Objekt N (vorige gelten als verkauft, keine Statistik)
//   #schritt=besichtigung|schaetzen|kaeufer|bieter  (mit #objekt bzw. #los: direkt in diesen Schritt)
//   #tempo=0.5  Uhren langsamer   #ende=854  Beispiel-Endbild (nichts gespeichert)   #abbruch  Beispiel-Abbruch
//   #figur=makler|maklerin   #auftrag=N (Tagesauftrag TAG-N)   #ereignis=N (erstes Ereignis EVT-N)   #obj=12 (OBJ-012 als Objekt 1)
//   #bieter=2  Schalter bieterrundeJedes zum Ausprobieren   #ohneinfo  ohne Zwischenscreens
//   #infos  Zwischenscreens zurücksetzen (erscheinen wieder wie beim allerersten Spiel)
//   #schaetzung=0.9  mit #schritt=bieter: Startpreis = 90 % des Marktwerts (sonst 100 %; Auktion steigend/sinkend ausprobieren)
//   window.HN_TEST: zustand(), schritt() (Trefferflächen, Räume, Regler, Käufer, Gebote), setzen(wert) (Regler)
(function () {
  'use strict';
  const R_ = window.Rahmen, D = window.HN, R = D.regeln, T = D.texte, HB = window.HNB, SCH = window.HN_SCHIRME, ST = window.HN_SCHRITTE;
  const F = window.HN_FIGUREN, M = D.merkmale, KL = window.HN_KLANG;
  const hash = location.hash;
  const wert = (name, art) => { const m = new RegExp('[#&]' + name + '(?:=([^&]*))?(?:&|$)').exec(hash); return m ? (art === 'zahl' ? (m[1] != null ? +m[1] : null) : (m[1] != null ? decodeURIComponent(m[1]) : true)) : undefined; };
  const OPT = { los: !!wert('los'), objekt: wert('objekt', 'zahl'), schritt: wert('schritt'), tempo: wert('tempo', 'zahl'),
    ende: wert('ende', 'zahl'), abbruch: wert('abbruch') !== undefined, auftrag: wert('auftrag', 'zahl'), ereignis: wert('ereignis', 'zahl'),
    figur: wert('figur'), obj: wert('obj', 'zahl'), bieter: wert('bieter', 'zahl'), ohneinfo: wert('ohneinfo') !== undefined,
    schaetzung: wert('schaetzung', 'zahl'), infos: wert('infos') !== undefined };
  if (OPT.figur === 'makler' || OPT.figur === 'maklerin') HB.figurSetzen(OPT.figur);
  if (OPT.bieter > 0) R.bieterrundeJedes = OPT.bieter;
  const testlauf = OPT.objekt != null || !!OPT.schritt || OPT.tempo != null || OPT.obj != null;
  ST.tempo = OPT.tempo > 0 ? OPT.tempo : 1;
  const zufall = a => a[Math.floor(Math.random() * a.length)];
  const mischen = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const lerp = (a, b, p) => a + (b - a) * p;
  const r5 = x => D.rund(x, x > 200000 ? 5000 : 1000);
  const html = document.documentElement;
  const nr2 = (pre, n) => pre + String(n).padStart(pre === 'OBJ-' ? 3 : 2, '0');

  let lauf = null, phase = 'start', B = innerWidth, H = innerHeight, zeit = 0;
  // Zwischenscreens schon gesehen? (je Gerät, Korrektur MZ 27.10.2026)
  const INFO_KEY = 'mg:hammerpreis:infos:' + (HB.K.firma || '');
  const infoSpeicher = (() => {
    try {
      if (OPT.infos) localStorage.removeItem(INFO_KEY);
      const roh = JSON.parse(localStorage.getItem(INFO_KEY) || '[]');
      localStorage.setItem(INFO_KEY, JSON.stringify(Array.isArray(roh) ? roh : []));   // Probe: Speicher beschreibbar?
      return { ok: true, liste: Array.isArray(roh) ? roh.filter(n => n >= 1 && n <= 5) : [] };
    } catch (e) { return { ok: false, liste: [] }; }
  })();
  // Benno stellt sich vor (MZ, v11): sein allererster Spruch auf dem Gerät ist die Vorstellung (Situation VORSTELLUNG),
  // gemerkt in mg:hammerpreis:benno:<firma> (sobald die Blase wirklich erscheint); ohne Speicher einmal je Durchgang.
  // Testhilfe #infos setzt auch das zurück.
  const BENNO_KEY = 'mg:hammerpreis:benno:' + (HB.K.firma || '');
  const benno = (() => {
    try { if (OPT.infos) localStorage.removeItem(BENNO_KEY); return { ok: true, vorgestellt: localStorage.getItem(BENNO_KEY) === '1' }; }
    catch (e) { return { ok: false, vorgestellt: false }; }
  })();

  // ---------- Punkte ----------
  const punkte = {
    schaetzung(abw, hinweise) {
      const st = R.schaetzungPunkte, p = R.punkte.schaetzung;
      let roh = 0;
      if (abw <= st[0][0]) roh = p;
      else for (let i = 1; i < st.length; i++) if (abw <= st[i][0]) { const [a, pa] = st[i - 1], [b, pb] = st[i]; roh = pa + (pb - pa) * (abw - a) / (b - a); break; }
      return Math.max(0, Math.round(roh) - hinweise * R.hinweisKosten);
    },
    besichtigung(e) {
      const gew = id => R.fundGewicht[M[id].wirkung] || 1;
      const ges = (lauf && lauf.aktuell ? lauf.aktuell.daten.merkmale : e.gefunden).reduce((s, id) => s + gew(id), 0);
      const gef = e.gefunden.reduce((s, id) => s + gew(id), 0);
      return Math.max(0, Math.round(R.punkte.besichtigung * gef / Math.max(1, ges)) - e.fehltipps * R.fehltippKosten);
    },
    kaeufer(art) { return R.kaeuferPunkte[art] || 0; },
    bieter(e) {
      if (e.art === 'unterwert') return 0;
      if (e.art === 'direkt') return Math.round(R.punkte.bieter * (e.kaeuferPunkte || 0) / R.kaeuferPunkte.passt);
      return e.art === 'fenster' ? R.punkte.bieter : e.art === 'spaet' ? R.bieterSpaet : Math.round(R.punkte.bieter * Math.max(0, Math.min(1, e.q)) ** 2);
    },
  };
  window.HN_SPIEL = {
    punkteBesichtigung: punkte.besichtigung, punkteKaeufer: punkte.kaeufer, punkteBieter: e => punkte.bieter(e),
    // verschwiegener Mangel gefunden (Besichtigung): Bonus als Provision, nicht als Punkte (höchstens 1.000)
    verschwiegenGefunden(ob) {
      if (!lauf || ob.bonus) return 0;
      ob.bonus = R.verschweigenBonus;
      lauf.provision += ob.bonus; lauf.bonusVerschwiegen = (lauf.bonusVerschwiegen || 0) + ob.bonus;
      SCH.hud.provision(lauf.provision, true);
      return ob.bonus;
    },
    kaeuferGewaehlt(ob, k) { if (k.art !== 'passt' && Math.random() < 0.6) spaeter(700, () => sag('konkurrenz', 'KAEUFER', 'freut')); },
  };

  // gewählte Figur gleich vorladen und umfärben (Blazer in Kundenfarbe), damit Start-/Endbild und Sprechblasen sie sofort zeigen
  F.vorladen([HB.figur()]);

  // ---------- Sprüche (Situationen aus den Texten) ----------
  // verzögerter Spruch nur, wenn der Spieler noch im selben Schritt ist (sonst verdeckt er die nächste Tafel)
  function spaeter(ms, fn) { const p0 = phase, o0 = lauf && lauf.i; setTimeout(() => { if (phase === p0 && (!lauf || lauf.i === o0)) fn(); }, ms); }
  function sag(wer, situation, mimik, dauer) {
    // eigene Figur: Sprüche für beide plus die der gewählten Figur (Tessa bzw. Toni); Konkurrenz: Benno Prunk.
    // situation darf eine Liste sein (Korrekturrunde 2: z. B. ['DANEBEN', 'DANEBEN_TIEF'] = Richtung egal + zu niedrig)
    // Gibt die Dauer der Blase in Sekunden zurück (0 = nichts gesagt).
    const S = D.sprueche;
    const vorstellen = wer === 'konkurrenz' && !benno.vorgestellt && (S.konkurrenz.VORSTELLUNG || []).length;
    if (vorstellen) { situation = 'VORSTELLUNG'; mimik = 'freut'; }
    const liste = [].concat(situation).reduce((l, s) => l.concat(wer === 'ich' ? (S.beide[s] || []).concat(S[HB.figur()][s] || []) : (S.konkurrenz[s] || [])), []);
    if (!liste.length) return 0;
    // verzögert (eine Blase zur Zeit auf schmalen Handys) nur, solange der Spieler im selben Schritt ist
    const p0 = phase, o0 = lauf && lauf.i;
    return SCH.sprich(wer, zufall(liste), mimik, dauer, () => phase === p0 && (!lauf || lauf.i === o0), vorstellen ? () => {
      benno.vorgestellt = true; try { localStorage.setItem(BENNO_KEY, '1'); } catch (e) { /* privat */ }
    } : null);
  }

  // ---------- Tagesauftrag: Regel-Sprache (aus texte.js schon zerlegt) ----------
  function filterPasst(filter, o) {
    if (!filter || !filter.length) return true;
    return filter.some(f => {
      if (f.feld === 'art') return o.art === f.wert;
      if (f.feld === 'viertel') return o.viertel === f.wert;
      if (f.feld === 'baujahr') return o.baujahr > 0 && (f.op === '<=' ? o.baujahr <= f.wert : f.op === '>=' ? o.baujahr >= f.wert : o.baujahr === f.wert);
      return false;
    });
  }
  const JE_OBJEKT = ['VERKAUFT', 'HINWEIS', 'GENAU', 'BESICHTIGUNG_VOLL', 'KAEUFER_RICHTIG', 'BIETERRUNDE_TREFFER'];
  const STEIGEND = JE_OBJEKT.concat(['LADENHUETER', 'HINWEISE_GESAMT', 'ABWEICHUNG_MAX', 'PROVISION']);
  function groesse(b, E) {
    switch (b.groesse) {
      case 'VERKAUFT': return E.filter(o => !o.ladenhueter && filterPasst(b.filter, o.daten)).length;
      case 'LADENHUETER': return E.filter(o => o.ladenhueter).length;
      case 'ABWEICHUNG_MAX': return E.length ? Math.max(...E.map(o => o.abw)) : 0;
      case 'ABWEICHUNG_SCHNITT': return E.length ? E.reduce((s, o) => s + o.abw, 0) / E.length : 0;
      case 'HINWEISE_GESAMT': return E.reduce((s, o) => s + (o.hinweise || []).length, 0);
      case 'HINWEIS': return E.filter(o => (o.hinweise || []).includes(b.hinweis)).length;
      case 'GENAU': return E.filter(o => o.abw <= b.prozent).length;
      case 'BESICHTIGUNG_VOLL': return E.filter(o => o.besichtigung && o.besichtigung.gefunden.length === o.besichtigung.gesamt).length;
      case 'KAEUFER_RICHTIG': return E.filter(o => o.kaeuferArt === 'passt').length;
      case 'BIETERRUNDE_TREFFER': return E.filter(o => o.verkauf && o.verkauf.art === 'fenster').length;
      case 'PROVISION': return lauf ? lauf.provision : 0;
      default: return 0;
    }
  }
  // Stand einer Bedingung: ok (jetzt erfüllt), sicher (bleibt so), verfehlt (nicht mehr erreichbar)
  function bedingung(b, amEnde) {
    const E = lauf.ergebnisse.filter(o => !o.uebersprungen), ist = groesse(b, E);
    const rest = lauf.objekte.slice(lauf.ergebnisse.length).filter(o => b.groesse !== 'VERKAUFT' || filterPasst(b.filter, o)).length;
    let ok, sicher, verfehlt = false;
    if (b.vgl === '>=') {
      ok = ist >= b.wert; sicher = ok;
      if (!ok && JE_OBJEKT.includes(b.groesse) && ist + rest < b.wert) verfehlt = true;
    } else {
      ok = b.vgl === '==' ? ist === b.wert : ist <= b.wert;
      sicher = amEnde && ok;
      if (!ok && STEIGEND.includes(b.groesse)) verfehlt = true;
    }
    if (amEnde && !ok) verfehlt = true;
    return { ist, soll: b.wert, ok, sicher, verfehlt };
  }
  function auftragStand(amEnde) {
    const a = lauf.auftrag, s = a.regel.map(b => bedingung(b, amEnde));
    return { teile: s, erfuellt: s.every(x => x.sicher || (amEnde && x.ok)), verfehlt: s.some(x => x.verfehlt) };
  }
  // Kurzer Stand für die Kopfzeile (Platz für ca. 14 Zeichen); der volle Text steht in der Einblendung zu Beginn
  function auftragText() {
    const a = lauf.auftrag, st = auftragStand(false), b = a.regel[0], s = st.teile[0];
    if (st.erfuellt) return 'Auftrag ✓';
    if (st.verfehlt) return 'Auftrag ✗';
    if (a.regel.length > 1) return `Auftrag ${st.teile.filter(x => x.ok).length}/${a.regel.length}`;
    switch (b.groesse) {
      case 'PROVISION': return `Auftrag ${Math.min(99, Math.floor(s.ist / b.wert * 100))} %`;
      case 'HINWEISE_GESAMT': return `Hinweise ${s.ist}/${b.wert}`;
      case 'ABWEICHUNG_MAX': return `Auftrag ≤ ${b.wert} %`;
      case 'ABWEICHUNG_SCHNITT': return `Auftrag Ø ${lauf.ergebnisse.length ? HB.prozent(s.ist, 1) : '–'}`;
      default: return b.vgl === '>=' ? `Auftrag ${Math.min(s.ist, b.wert)}/${b.wert}` : 'Auftrag ✓';
    }
  }
  function hudAuftrag() {
    if (!lauf || !lauf.auftrag) { SCH.hud.auftrag('', false); return; }
    const st = auftragStand(false);
    SCH.hud.auftrag(auftragText(), st.erfuellt, st.verfehlt);
    // Tagesauftrag gerade erfüllt: kurze Fanfare (nach Stempel und Kasse des Exposés)
    if (st.erfuellt && !lauf.auftragGemeldet) { lauf.auftragGemeldet = true; if (lauf.ergebnisse.some(o => !o.uebersprungen)) KL.ton('auftrag', { verzoegerung: 1.3 }); }
  }

  // ---------- Durchgang zusammenstellen ----------
  // Bedarf des Auftrags an Objekten im Durchgang (VERKAUFT mit Filter): je Bedingung Filter + Anzahl
  function bedarf(a) { return (a ? a.regel : []).filter(b => b.groesse === 'VERKAUFT' && b.vgl === '>=').map(b => ({ filter: b.filter || [], n: b.wert })); }
  function ziehen(bed, start) {
    const gewaehlt = start ? [start] : [], artMax = {};
    bed.forEach(b => (b.filter || []).forEach(f => { if (f.feld === 'art') artMax[f.wert] = Math.max(R.jeArtHoechstens, b.n + 1); }));
    const frei = o => !gewaehlt.includes(o) && gewaehlt.filter(g => g.art === o.art).length < (artMax[o.art] || R.jeArtHoechstens);
    for (let i = gewaehlt.length; i < R.objekte; i++) {
      const s = R.stufenFolge[i] || 3;
      let k = D.objekte.filter(o => o.stufe === s && frei(o));
      const offen = bed.filter(b => gewaehlt.filter(o => filterPasst(b.filter, o)).length < b.n + 1);
      if (offen.length && Math.random() < 0.6) { const kk = k.filter(o => offen.some(b => filterPasst(b.filter, o))); if (kk.length) k = kk; }
      if (!k.length) k = D.objekte.filter(frei);
      gewaehlt.push(zufall(k));
    }
    return gewaehlt;
  }
  const potenzial = liste => liste.reduce((s, o) => s + D.preis(o, []).preis * R.provision, 0);
  function objekteFuer(a, start) {
    const bed = bedarf(a), prov = a ? a.regel.find(b => b.groesse === 'PROVISION') : null;
    for (let v = 0; v < 400; v++) {
      const liste = ziehen(bed, start), rand = v < 250 ? 1 : 0;
      if (!bed.every(b => liste.filter(o => filterPasst(b.filter, o)).length >= b.n + rand)) continue;
      if (prov && potenzial(liste) < prov.wert * 1.12) continue;
      return liste;
    }
    return null;
  }
  function ereignisseWaehlen(objekte) {
    const nach = R.ereignisseNach.map(r => zufall(r)), gew = [];
    const vertraegt = e => !gew.some(g => D.ereignisNichtZusammen.some(p => p.includes(g.id) && p.includes(e.id)));
    nach.forEach((n, i) => {
      let k = D.ereignisse.filter(e => !gew.includes(e) && vertraegt(e));
      const wirkt = k.filter(e => objekte.slice(n).some(o => D.betrifft(e, o)));
      if (wirkt.length) k = wirkt;
      let e = zufall(k);
      if (i === 0 && OPT.ereignis) e = D.ereignisse.find(x => x.id === nr2('EVT-', OPT.ereignis)) || e;
      gew.push(e);
    });
    return nach.map((n, i) => ({ nach: n, e: gew[i] }));
  }
  function neuerLauf() {
    const start = OPT.obj ? D.objekte.find(o => o.id === nr2('OBJ-', OPT.obj)) : null;
    const wahl = OPT.auftrag ? D.auftraege.filter(a => a.id === nr2('TAG-', OPT.auftrag)) : mischen(D.auftraege);
    let auftrag = null, objekte = null;
    for (const a of wahl) { objekte = objekteFuer(a, start); if (objekte) { auftrag = a; break; } }
    if (!objekte) { auftrag = null; objekte = objekteFuer(null, start); }
    // Eigentümer: passend zur Art, im Durchgang nicht doppelt; in den ersten drei Objekten nur „leichte“ Wunschpreise
    const benutzt = [];
    const eigentuemer = objekte.map((o, i) => {
      const passt = D.eigentuemer.filter(e => !e.arten || e.arten.includes(o.art));
      let k = passt.filter(e => !benutzt.includes(e));
      if (i < 3) { const l = k.filter(e => e.faktor >= R.leichtFaktor[0] && e.faktor <= R.leichtFaktor[1]); if (l.length) k = l; }
      const e = zufall(k.length ? k : passt);
      benutzt.push(e);
      return e;
    });
    return { objekte, eigentuemer, ereignisse: ereignisseWaehlen(objekte), markt: [], auftrag, i: 0, laeden: 0, provision: 0, ergebnisse: [], info: {}, start: performance.now() };
  }
  function objektVorbereiten(nr) {
    const o = lauf.objekte[nr - 1], d = (nr - 1) / Math.max(1, R.objekte - 1);
    const rechnung = D.preis(o, lauf.markt), w = rechnung.preis;
    const sw = {}; Object.keys(D.schwer).forEach(k => { sw[k] = lerp(D.schwer[k][0], D.schwer[k][1], d); });
    const a = D.art(o.art), v = D.viertelVon(o.viertel);
    const echt = a.jeGrund ? o.grundstueck : o.flaeche;
    const ab = (Math.random() < 0.5 ? -1 : 1) * sw.flaecheUngenau * (0.6 + Math.random() * 0.4);
    const flaecheCa = Math.round(echt * (1 + ab) / (a.jeGrund ? 10 : 5)) * (a.jeGrund ? 10 : 5);
    const e = lauf.eigentuemer[nr - 1];
    // Der Anruf nennt keine Mängel mehr (MZ, 26.10.2026). „Verschweigen: ja“: der schwerste Mangel gilt als verschwiegen –
    // wer ihn bei der Besichtigung findet, bekommt +2.000 € Provision (verschwiegenGefunden)
    const maengel = o.merkmale.filter(id => M[id].typ === 'mangel');
    const rang = { 'groß': 3, mittel: 2, klein: 1 };
    const verschwiegen = e.verschweigen && maengel.length ? maengel.slice().sort((x, y) => (rang[M[y].wirkung] || 0) - (rang[M[x].wirkung] || 0))[0] : null;
    // Rundgang: Räume der Mängel/Pluspunkte, von draußen nach drinnen
    const raeume = D.raumFolge.filter(r => o.merkmale.some(id => M[id].raum === r)).map(r => ({ id: r, merkmale: o.merkmale.filter(id => M[id].raum === r) }));
    const ob = { nr, daten: o, art: a, viertel: v, rechnung, wert: w, d, schwer: sw, markt: lauf.markt.filter(x => D.betrifft(x, o)),
      eigentuemer: Object.assign({}, e, { figur: F.eigentuemer(e) }), wunsch: r5(w * e.faktor), flaecheCa,
      erwaehnt: [], verschwiegen, raeume, gefunden: [], aufgedeckt: [], hinweise: [],
      punkte: { schaetzung: 0, besichtigung: 0, kaeufer: 0, bieter: 0 } };
    const begehrt = D.kaeufer.filter(k => D.passtGanz(D.passung(k, o)) && k.budget >= w).length >= 2;
    ob.mitBieter = R.bieterrundeJedes <= 1 || nr % R.bieterrundeJedes === 0 || (R.bieterrundeBegehrt && begehrt);
    return ob;
  }
  // Drei Käufer: einer passt (alle Kriterien, Budget ≥ Marktwert), einer mit passenden Kriterien aber zu kleinem Budget, einer,
  // der an genau einem sichtbaren Kriterium scheitert. Budget aus dem Profil, wenn es zur Rolle passt, sonst aus dem Marktwert.
  function kaeuferWaehlen(ob) {
    const o = ob.daten, w = ob.wert;
    const bekannt = ob.gefunden.concat(ob.aufgedeckt, ob.erwaehnt);
    const pruef = (k, ig) => { const p = D.passung(k, o); if (ig) p[ig] = true; return p; };
    // Seit den ergänzten Profilen (KAE-41…46, 27.10.2026) passt zu jedem der 100 Objekte mindestens ein Profil in allen
    // Kriterien – die frühere Ausnahme (ein Kriterium ausblenden, OBJ-025/026/088/090) ist entfallen. Die Karten können
    // weiter ein Kriterium ausblenden (ob.ignoriere), falls ein Kunde Profile streicht.
    const ig = D.kaeufer.some(k => D.passtGanz(pruef(k))) ? null
      : ['wunsch', 'viertel', 'nogo'].find(c => D.kaeufer.some(k => D.passtGanz(pruef(k, c)))) || null;
    ob.ignoriere = ig;
    const ganz = D.kaeufer.filter(k => D.passtGanz(pruef(k, ig)));
    const reich = ganz.filter(k => k.budget >= w);
    const p = zufall(reich.length ? reich : ganz.length ? ganz : D.kaeufer.filter(k => k.arten.includes(o.art)).concat(D.kaeufer).slice(0, 1));
    const arm = ganz.filter(k => k !== p && k.budget < w && k.budget >= w * 0.6);
    const b = arm.length ? zufall(arm) : (ganz.filter(k => k !== p).length ? zufall(ganz.filter(k => k !== p)) : null);
    // scheitert an genau einem sichtbaren Kriterium (NoGo nur, wenn der Mangel bekannt ist)
    const sichtbar = c => c !== ig;
    const falsch = D.kaeufer.filter(k => k !== p && k !== b).map(k => {
      const s = pruef(k, ig), fehlt = Object.keys(s).filter(c => !s[c]);
      if (fehlt.length !== 1 || !sichtbar(fehlt[0])) return null;
      if (fehlt[0] === 'nogo' && !k.nogo.some(id => o.merkmale.includes(id) && bekannt.includes(id))) return null;
      return { k, c: fehlt[0] };
    }).filter(Boolean);
    const fw = falsch.length ? zufall(falsch) : null;
    const u = fw ? fw.k : zufall(D.kaeufer.filter(k => k !== p && k !== b && !D.passtGanz(pruef(k, ig))));
    const mit = (k, art, budget, extra) => Object.assign({}, k, { art, budget, figur: F.kaeufer(k) }, extra || {});
    const liste = [mit(p, 'passt', p.budget >= w * 1.02 && p.budget <= w * 1.6 ? p.budget : r5(w * (1.04 + Math.random() * 0.08)))];
    if (b) liste.push(mit(b, 'budget', b.budget < w * 0.96 && b.budget >= w * 0.7 ? b.budget : r5(w * (ob.schwer.budgetLuecke - 0.03 + Math.random() * 0.06))));
    else { const u2 = falsch.filter(x => x.k !== u)[0]; if (u2) liste.push(mit(u2.k, 'wunsch', budgetFalsch(u2.k, w), { scheitert: u2.c })); }
    liste.push(mit(u, 'wunsch', budgetFalsch(u, w), { scheitert: fw ? fw.c : null }));
    ob.kaeufer = mischen(liste);
    // Mitbieter der Bieterrunde: weitere Käufer, die die Art suchen
    const andere = mischen(D.kaeufer.filter(k => !liste.some(l => l.id === k.id) && k.arten.includes(o.art)).concat(mischen(D.kaeufer.filter(k => !liste.some(l => l.id === k.id)))));
    const namen = [];
    ob.mitbieter = andere.filter(k => { if (namen.includes(k.id)) return false; namen.push(k.id); return true; }).slice(0, ob.d > 0.5 ? 2 : 1).map(k => Object.assign({}, k, { figur: F.kaeufer(k) }));
  }
  function budgetFalsch(k, w) { return k.budget >= w && k.budget <= w * 1.6 ? k.budget : r5(w * (1.05 + Math.random() * 0.15)); }

  // ---------- Ablauf ----------
  function laufBeginnen() {
    lauf = neuerLauf();
    if (!benno.ok) benno.vorgestellt = false;   // ohne Speicher: Vorstellung einmal je Durchgang
    phase = 'tagesauftrag';
    ST.leeren();
    SCH.alleVerbergen();
    SCH.hud.zeigen(true);
    SCH.hud.objekt(1, R.objekte); SCH.hud.provision(0); SCH.hud.ladenhueter(0);
    hudAuftrag();
    let start = 1;
    if (OPT.objekt > 1) {   // Testhilfe: vorige Objekte als verkauft ohne Punkte überspringen
      start = Math.min(R.objekte, OPT.objekt);
      for (let n = 1; n < start; n++) {
        const ob = objektVorbereiten(n);
        Object.assign(ob, { schaetzung: ob.wert, abw: 0, ladenhueter: false, verkauf: { preis: ob.wert }, provision: Math.round(ob.wert * R.provision), uebersprungen: true });
        lauf.ergebnisse.push(ob); lauf.provision += ob.provision;
      }
      lauf.ereignisse.forEach(e => { if (e.nach < start) lauf.markt.push(Object.assign({}, e.e)); });
      SCH.hud.provision(lauf.provision);
      hudAuftrag();
    }
    lauf.i = start;
    if (OPT.objekt != null || OPT.schritt) {
      objektBeginnen(start);
      OPT.objekt = null; OPT.schritt = null;
      return;
    }
    KL.szene('buero');
    KL.ton('auftrag', { verzoegerung: 0.15 });   // Tagesauftrag wird angesagt
    SCH.einblendung(`<div class="hn-tag">${SCH.esc(T.ui.auftrag)}</div><p class="hn-auftragstext">${SCH.esc(lauf.auftrag ? lauf.auftrag.text : '')}</p>
      <p class="hn-klein">Erfüllt: +${HB.euro(R.auftragBonus)} Provision</p>`, { knopf: 'Los geht’s', klasse: 'auftrag', tippZu: true, weiter: () => objektBeginnen(start) });
    spaeter(400, () => sag('ich', 'START', 'freut'));
  }
  function objektBeginnen(nr) {
    if (!lauf) return;
    lauf.i = nr;
    const ob = objektVorbereiten(nr);
    lauf.aktuell = ob;
    SCH.hud.objekt(nr, R.objekte);
    KL.vorladen([...new Set(ob.raeume.map(r => KL.raumKlang(r.id)))]);   // Raumgeräusche der Besichtigung schon laden
    phase = 'anruf';
    const ziel = OPT.schritt && nr === (OPT.objekt || 1) ? OPT.schritt : null;
    if (ziel) {   // Testhilfe: Vorstufen sinnvoll füllen
      if (['schaetzen', 'kaeufer', 'bieter'].includes(ziel)) ob.gefunden = ob.daten.merkmale.slice(0, 2);
      if (['kaeufer', 'bieter'].includes(ziel)) { ob.schaetzung = D.rund(ob.wert * (OPT.schaetzung > 0 ? OPT.schaetzung : 1), 1000); ob.abw = Math.abs(ob.schaetzung - ob.wert) / ob.wert * 100; }
      if (ziel === 'kaeufer' || ziel === 'bieter') kaeuferWaehlen(ob);
      if (ziel === 'bieter') { ob.wahl = ob.kaeufer.findIndex(k => k.art === 'passt'); ob.kaeuferArt = 'passt'; bieterVorbereiten(ob); }
      ({ besichtigung: schrittBesichtigung, schaetzen: schrittSchaetzen, kaeufer: schrittKaeufer, bieter: schrittBieter }[ziel] || schrittAnruf)(ob);
      return;
    }
    schrittAnruf(ob);
  }
  // Zwischenscreens (Balancing-Runde 1): vor jedem der fünf Schritte einmal je Durchgang – normal beim ersten Objekt; Käufer und
  // Bieterrunde beim ersten Objekt, in dem sie vorkommen (z. B. wenn Objekt 1 unter Wert verkauft wurde). Die Tafel des
  // Schritts steht schon dahinter; Uhr und Bieterrunde laufen erst nach „Verstanden“ (def.schritt hält an, solange eine
  // Einblendung offen ist). Testhilfe #ohneinfo schaltet sie ab.
  // Korrektur MZ (27.10.2026): nur beim allerersten Spiel auf dem Gerät – je Schritt gemerkt (mg:hammerpreis:infos:<firma>,
  // Liste der gesehenen Schritte; gemerkt bei „Verstanden“). Ein Schritt, der im ersten Spiel nicht vorkam (Käufer/Bieterrunde
  // nach Unter Wert/Ladenhüter), zeigt seinen Screen beim ersten späteren Vorkommen. Ohne Speicher (privat, gesperrt):
  // wie bisher einmal je Durchgang. Testhilfe #infos setzt zurück.
  function infoGesehen(nr) { return infoSpeicher.ok ? infoSpeicher.liste.includes(nr) : !!(lauf && lauf.info[nr]); }
  function infoMerken(nr) {
    if (!infoSpeicher.ok || infoSpeicher.liste.includes(nr)) return;
    infoSpeicher.liste.push(nr);
    try { localStorage.setItem(INFO_KEY, JSON.stringify(infoSpeicher.liste.sort())); } catch (e) { /* privat */ }
  }
  function infoOffen(nr) { return !OPT.ohneinfo && !!lauf && !lauf.info[nr] && !infoGesehen(nr); }
  function mitInfo(nr, ob, danach) {
    if (!infoOffen(nr)) { if (danach) danach(); return false; }
    lauf.info[nr] = true;
    SCH.stumm();
    ST.info(nr, ob, () => { infoMerken(nr); if (danach) danach(); });
    return true;
  }
  function schrittAnruf(ob) {
    phase = 'anruf';
    const zeigen = infoOffen(1);
    const klingeln = ST.anruf(ob, () => schrittBesichtigung(ob), { leise: zeigen });
    mitInfo(1, ob, () => {
      if (zeigen) klingeln();
      if (ob.nr === 1) spaeter(1400, () => sag('konkurrenz', 'START', 'freut'));
      else if (Math.random() < 0.25) spaeter(700, () => sag('ich', 'START', 'neutral'));
    });
  }
  function schrittBesichtigung(ob) {
    phase = 'besichtigung';
    ST.besichtigung(ob, e => {
      ob.gefunden = e.gefunden; ob.besichtigung = e;
      ob.punkte.besichtigung = punkte.besichtigung(e);
      schrittSchaetzen(ob);
    });
    mitInfo(2, ob);
  }
  function schrittSchaetzen(ob) {
    phase = 'schaetzen';
    mitInfo(3, ob);
    ST.schaetzen(ob, (e, aufloesen) => {
      ob.schaetzung = e.schaetzung; ob.hinweise = e.hinweise;
      ob.abw = Math.abs(e.schaetzung - ob.wert) / ob.wert * 100;
      // MZ (27.10.2026): mehr als 35 % zu hoch = Ladenhüter, mehr als 35 % zu niedrig = Verkauf unter Wert
      const zuHoch = e.schaetzung > ob.wert;
      ob.ladenhueter = zuHoch && ob.abw > R.ladenhueterAb;
      ob.unterWert = !zuHoch && ob.abw > R.unterWertAb;
      if (ob.unterWert) ob.mitBieter = false;   // Käufer und Bieterrunde entfallen
      ob.punkte.schaetzung = ob.ladenhueter || ob.unterWert ? 0 : punkte.schaetzung(ob.abw, e.hinweise.length);
      // Ergebnis der Schätzung: Ladenhüter/unter Wert = Posaune, gut geschätzt (bis 8 %) = Fund-Klang, sonst nur „Preis festlegen“
      if (ob.ladenhueter || ob.unterWert) KL.ton('ladenhueter', { verzoegerung: 0.25 });
      else if (ob.abw <= 8) KL.ton('fund', { verzoegerung: 0.25 });
      const st = R.schaetzungPunkte;
      if (ob.unterWert) {
        sag('ich', 'UNTERWERT', 'zweifelt');
        R_.vibrieren([60, 40, 60]);
        if (Math.random() < 0.6) spaeter(1300, () => sag('konkurrenz', 'UNTERWERT', 'freut'));
      } else if (ob.ladenhueter) {
        sag('ich', 'LADENHUETER', 'zweifelt');
        lauf.laeden++;
        SCH.hud.ladenhueter(lauf.laeden, lauf.laeden === R.ladenhueterMax - 1);
        R_.vibrieren([60, 40, 60]);
        if (Math.random() < 0.6) spaeter(1300, () => sag('konkurrenz', ['LADENHUETER', 'DANEBEN_HOCH', 'DANEBEN'], 'freut'));
      } else if (ob.abw <= st[0][0]) {
        sag('ich', 'TREFFER', 'freut');
        if (Math.random() < 0.45) spaeter(1300, () => sag('konkurrenz', 'GUT', 'aergert'));
      } else if (ob.abw <= st[2][0]) sag('ich', 'KNAPP', 'neutral');
      else {
        // Sprüche nach Richtung (Korrekturrunde 2: „Optimismus… teuer“ kam auch bei zu niedriger Schätzung)
        const richtung = ['DANEBEN', zuHoch ? 'DANEBEN_HOCH' : 'DANEBEN_TIEF'];
        sag('ich', richtung, 'zweifelt');
        if (Math.random() < 0.5) spaeter(1300, () => sag('konkurrenz', richtung, 'freut'));
      }
      aufloesen({
        weiter() {
          if (ob.ladenhueter) {
            ob.provision = 0;
            if (lauf.laeden >= R.ladenhueterMax) { abschliessen(ob); endbild(true); return; }
            // Abbruch ankündigen (Korrekturrunde 2): nach dem vorletzten Ladenhüter eine deutliche Warnung, dann das Exposé
            if (lauf.laeden === R.ladenhueterMax - 1) { ladenWarnung(() => schrittExpose(ob)); return; }
            schrittExpose(ob);
          } else if (ob.unterWert) {
            // Verkauf unter Wert: der erste Interessent unterschreibt zum (zu niedrigen) geschätzten Preis
            verkaufen(ob, { preis: ob.schaetzung, art: 'unterwert', q: 0 });
          } else schrittKaeufer(ob);
        },
      });
    });
  }
  function schrittKaeufer(ob) {
    phase = 'kaeufer';
    if (!ob.kaeufer) kaeuferWaehlen(ob);
    mitInfo(4, ob);
    ST.kaeufer(ob, e => {
      ob.wahl = e.wahl;
      ob.kaeuferArt = ob.kaeufer[e.wahl].art;
      ob.punkte.kaeufer = punkte.kaeufer(ob.kaeuferArt);
      bieterVorbereiten(ob);
      if (ob.mitBieter) schrittBieter(ob);
      else verkaufen(ob, { preis: ob.bieter.spitze, art: 'direkt', q: 1, kaeuferPunkte: ob.punkte.kaeufer, an: ob.kaeufer[e.wahl].name });
    });
  }
  // Bieterrunde in beide Richtungen (Balancing-Runde 1): Startpreis = Schätzung, verdeckte Limits je Bieter (daten.js
  // regeln.bieterLimit). limits[0] = dein Käufer, dann die Mitbieter. spitze = Limit deines Käufers (Verkauf ohne Bieterrunde).
  function bieterVorbereiten(ob) {
    const k = ob.kaeufer[ob.wahl], w = ob.wert, L = R.bieterLimit;
    const eigen = D.rund(k.art === 'passt' ? w * L.passt : k.art === 'budget' ? Math.min(k.budget, w * L.budgetMax) : w * L.wunsch, 1000);
    const limits = [eigen].concat((ob.mitbieter || []).map(() => D.rund(w * (L.mitVon + Math.random() * (L.mitBis - L.mitVon)), 1000)));
    // keine zwei gleichen Limits (sonst wäre „der Zweite“ gleich teuer)
    for (let i = 1; i < limits.length; i++) while (limits.slice(0, i).includes(limits[i])) limits[i] -= 1000;
    const start = ob.schaetzung != null ? ob.schaetzung : D.rund(eigen * 0.86, 1000);
    ob.bieter = { start, limits, spitze: eigen, takt: ob.schwer.bieterTakt, fenster: ob.schwer.bieterFenster };
  }
  function schrittBieter(ob) {
    phase = 'bieter';
    // Zwischenscreen 5 (enthält die frühere Bieter-Erklärung): vor der ersten Bieterrunde des Durchgangs
    ST.bieter(ob, e => verkaufen(ob, e));
    mitInfo(5, ob, () => { if (Math.random() < 0.35) spaeter(500, () => sag('konkurrenz', 'BIETEN', 'neutral')); });
  }
  function ladenWarnung(weiter) {
    const W = T.ladenWarnung;
    phase = 'warnung';
    KL.ton('fehltipp');
    R_.vibrieren([80, 60, 80]);
    const haeuser = Array.from({ length: R.ladenhueterMax }, (x, i) => `<svg viewBox="0 0 20 18" class="${i < lauf.laeden ? 'an' : 'frei'}" aria-hidden="true"><path d="M2 9 10 2l8 7v8H2z"/></svg>`).join('');
    SCH.einblendung(`<div class="hn-tag">${SCH.esc(W.titel)}</div><div class="hn-warnhaeuser">${haeuser}</div>
      <p class="hn-auftragstext">${SCH.esc(W.text)}</p>`, { knopf: W.knopf || 'Weiter', klasse: 'warnung', weiter });
  }
  function verkaufen(ob, e) {
    ob.verkauf = e;
    ob.punkte.bieter = punkte.bieter(e);
    // unter Wert: nur ein Teil der Provision (regeln.unterWertProvision, Korrekturrunde 2)
    ob.provision = Math.round(e.preis * R.provision * (e.art === 'unterwert' ? R.unterWertProvision : 1));
    lauf.provision += ob.provision;
    SCH.hud.provision(lauf.provision, true);
    schrittExpose(ob);
  }
  function schrittExpose(ob) {
    phase = 'expose';
    abschliessen(ob);
    const letzter = ob.nr >= R.objekte;
    ST.expose(ob, () => {
      if (letzter) { endbild(false); return; }
      const ev = lauf.ereignisse.find(x => x.nach === ob.nr);
      if (ev) ereignisZeigen(ev.e, () => objektBeginnen(ob.nr + 1));
      else objektBeginnen(ob.nr + 1);
    }, letzter);
    if (!ob.unterWert) spaeter(500, () => sag('ich', ob.ladenhueter ? 'LADENHUETER' : 'VERKAUF', ob.ladenhueter ? 'zweifelt' : 'freut'));
  }
  function abschliessen(ob) {
    if (!lauf.ergebnisse.includes(ob)) lauf.ergebnisse.push(ob);
    hudAuftrag();
  }
  function ereignisZeigen(e, weiter) {
    phase = 'ereignis';
    lauf.markt.push(Object.assign({}, e));
    const ort = window.KUNDE.ort || 'Musterstadt';
    const wo = e.viertel ? e.viertel.map(v => D.viertelVon(v).name).join(', ') : 'ganz ' + ort;
    const was = e.arten ? e.arten.map(a => D.art(a).mehr).join(', ') : 'Alle Objekte';
    KL.szene('buero');
    KL.ton('ereignis');
    SCH.einblendung(`<div class="hn-zeitung"><div class="kopf">${SCH.esc(ort)}er Anzeiger</div><span class="hn-meldung">${SCH.esc(T.ui.markt)}</span>
      <h3>${SCH.esc(e.titel)}</h3><p>${SCH.esc(e.text)}</p>
      <p class="wirkung">${SCH.esc(was)} – ${SCH.esc(wo)}: <b>${HB.vorzeichen(e.wert * 100)}</b></p></div>`, { knopf: 'Weiter', klasse: 'ereignis', weiter });
  }

  // ---------- Endbild ----------
  function stufeNr(p) { const i = R.stufen.findIndex(g => p >= g); return i < 0 ? 4 : i; }
  function endbild(abbruch) {
    if (phase === 'ende') return;
    const E = lauf.ergebnisse;
    const summe = E.reduce((s, o) => s + o.punkte.schaetzung + o.punkte.besichtigung + o.punkte.kaeufer + o.punkte.bieter, 0);
    const p = abbruch ? 0 : Math.max(1, Math.min(R.hoechst, Math.round(summe)));
    const alt = HB.best();
    const st = lauf.auftrag && !abbruch ? auftragStand(true) : null;
    const erfuellt = !!(st && st.erfuellt);
    const bonus = erfuellt ? R.auftragBonus : 0;
    const provision = lauf.provision + bonus;
    ST.leeren(); SCH.stumm();
    R_.ende(p, { verzoegerung: 0 });   // Rahmen speichert den Bestwert (0 nie)
    phase = 'ende';
    SCH.hud.zeigen(false);
    const verkauft = E.filter(o => !o.ladenhueter);
    const echt = E.filter(o => !o.uebersprungen);
    const mittel = echt.length ? echt.reduce((s, o) => s + o.abw, 0) / echt.length : 0;
    if (!abbruch && !testlauf) {
      HB.statistikAddieren({ verkauft: verkauft.filter(o => !o.uebersprungen).map(o => ({ viertel: o.viertel.name, provision: o.provision, abw: Math.round(o.abw * 10) / 10 })), bonus: bonus + (lauf.bonusVerschwiegen || 0) });
    }
    const neu = !abbruch && (alt == null || p > alt);
    lauf.dauer = (performance.now() - lauf.start) / 1000;
    const i = stufeNr(p);
    SCH.ende({
      punkte: p, abbruch, stufe: abbruch ? null : i, bewertung: abbruch ? T.abbruch : T.bewertungen[i], provision: abbruch ? 0 : provision,
      bilanz: abbruch ? T.bilanzAbbruch.replace('{l}', lauf.laeden).replace('{k}', E.length)
        : T.bilanz.replace('{v}', verkauft.length).replace('{a}', HB.prozent(mittel, 1)) + bilanzZusatz(E),
      text: abbruch ? zufall(T.abbruchTexte) : (T.abschluss[i] && T.abschluss[i].text) || '',
      auftrag: abbruch || !lauf.auftrag ? null : { text: erfuellt ? T.ui.erfuellt + ': +' + HB.euro(bonus) : T.ui.verfehlt, erfuellt },
      mappe: mappeDaten(),
      bestText: neu ? SCH.esc(alt == null ? T.ui.scoreErster : T.ui.scoreNeu) : `${SCH.esc(T.ui.score)} <b>${HB.zahl(alt || 0)}/1.000</b>`,
      neu, einladung: zufall(T.einladung),
    });
    // Sprüche zum Feierabend nur, wenn unter der Karte Platz ist (sonst verdecken sie die Knöpfe)
    const platz = () => { const k = document.querySelector('.hn-ende .hn-karte'); return k && k.getBoundingClientRect().bottom < innerHeight - 96; };
    if (!abbruch) {
      const mimik = p >= 800 ? 'freut' : p >= 550 ? 'neutral' : 'zweifelt';
      // Dauer nach Textlänge (+0,3s im Endbild); Benno antwortet erst, wenn die eigene Blase weg ist (MZ, v11)
      setTimeout(() => {
        const d = platz() ? sag('ich', 'ENDE', mimik, 0.3) : 0;
        setTimeout(() => { if (platz()) sag('konkurrenz', 'ENDE', p >= 700 ? 'aergert' : 'freut', 0.3); }, (d ? d + 0.5 : 0.5) * 1000);
      }, 900);
    }
  }
  // Bilanz-Zusatz: Verkäufe unter Wert und Ladenhüter getrennt nennen (MZ-Regel 27.10.2026)
  function bilanzZusatz(E) {
    const u = E.filter(o => o.unterWert).length, l = E.filter(o => o.ladenhueter).length;
    return (u ? ` – ${u} unter Wert` : '') + (l ? ` – ${l} ${T.ladenhueter}` : '');   // geschützte Leerzeichen: Zahl und Wort bleiben zusammen
  }
  function mappeDaten() {
    const liste = [];
    for (let i = 0; i < R.objekte; i++) {
      const o = lauf && lauf.ergebnisse[i];
      if (o) liste.push({ art: o.daten.art, name: o.daten.titel, viertel: o.art.name + ' – ' + o.viertel.name, verkauft: !o.ladenhueter, unterWert: !!o.unterWert, preis: o.verkauf ? o.verkauf.preis : 0, abw: o.abw });
      else liste.push({ art: null, name: '', verkauft: null });
    }
    return liste;
  }

  SCH.knoepfe({
    los() { document.getElementById(R_.zustand === 'start' ? 'losKnopf' : 'nochmalKnopf').click(); },
    nochmal() { document.getElementById('nochmalKnopf').click(); },
    mappe() { SCH.mappe(mappeDaten().filter(m => m.art)); },
  });

  // ---------- Größe, Formate ----------
  function formate() {
    B = innerWidth; H = innerHeight;
    html.classList.toggle('kompakt', H < 700 || B < 360);
    html.classList.toggle('flach', H < 520 && B > H);
    html.classList.toggle('breit', B >= 760 && B > H);
    // Platz für Sprechblasen neben der Tafel? (Tafel 460 px, quer flach 760 px breit; Blase mit Figur braucht ca. 260 px)
    const tafelB = Math.min(B - 20, html.classList.contains('flach') ? 760 : 460), seite = (B - tafelB) / 2;
    html.classList.toggle('seitlich', seite >= 260);
    html.style.setProperty('--seite', Math.floor(seite - 16) + 'px');
    ST.groesse();
  }
  addEventListener('resize', formate);
  formate();

  // ---------- Anmeldung beim Rahmen ----------
  const def = {
    id: HB.ID, wertung: 'hoch', hoechst: R.hoechst,
    format: p => HB.zahl(p) + ' Punkte',
    texte: { titel: T.titel, untertitel: T.fragen[0], anleitung: T.anleitung },
    neu() { if (R_.zustand === 'spiel') laufBeginnen(); },
    // während der Rückfrage „Spiel wirklich beenden?“ steht alles still (Uhr der Besichtigung, Bieterrunde)
    // ebenso, solange eine Einblendung offen ist (Zwischenscreen vor der Besichtigung bzw. Bieterrunde: Uhr startet erst danach)
    schritt(dt) { zeit += dt; if (!SCH.rueckfrageOffen && !SCH.einblendungOffen) ST.schritt(dt); },
    zeichne(g, b, h, zustand, dt) {
      if (zustand !== 'spiel') zeit += dt || 0;
      const tz = lauf ? Math.min(1, ((lauf.i || 1) - 1 + (phase === 'ende' ? 1 : 0.5)) / R.objekte) : 0.05;
      window.HN_SZENE.strasse(g, b, h, zeit, phase === 'ende' ? 1 : tz, Math.min(window.devicePixelRatio || 1, 2.5));
    },
    groesse(b, h) { B = b; H = h; formate(); },
  };
  R_.spiel(def);

  // Rückfrage beim Haus-Knopf (MZ, Korrekturrunde 2): während eines laufenden Durchgangs erst fragen, auf Start-/Endbild
  // (und im Beispiel-Endbild) ohne Rückfrage. Der Knopf ist ein Link des Rahmens – Klick wird vorher abgefangen.
  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('#heimKnopf');
    if (!a || !lauf || R_.zustand !== 'spiel' || phase === 'ende') return;
    ev.preventDefault(); ev.stopPropagation();
    KL.ton('klick');
    SCH.rueckfrage({ beenden: () => { location.href = a.getAttribute('href') || HB.K.startseite || '../'; } });
  }, true);
  document.title = 'Hammerpreis – ' + (HB.K.kurzname || HB.K.firma || '');

  // ---------- Erster Bildschirm ----------
  if (OPT.ende != null || OPT.abbruch) {
    // Beispiel-Endbild: nichts wird gespeichert (Rahmen.ende wird nicht aufgerufen)
    const p = OPT.abbruch ? 0 : Math.max(1, Math.min(1000, OPT.ende));
    phase = 'ende';
    const muster = D.objekte.filter((o, i) => i % 10 === 3).slice(0, 10).map((o, i) => ({ art: o.art, name: o.titel, viertel: D.art(o.art).name + ' – ' + D.viertelVon(o.viertel).name, verkauft: i !== 6, unterWert: i === 2, preis: D.preis(o, []).preis, abw: i === 2 ? 38.5 : 1.2 + i * 0.7 }));
    if (OPT.abbruch) muster.forEach((m, i) => { if (i >= 6) { m.art = null; m.verkauft = null; } else m.verkauft = ![1, 3, 5].includes(i); });
    const i = stufeNr(p);
    SCH.ende({ punkte: p, abbruch: OPT.abbruch, stufe: OPT.abbruch ? null : i, bewertung: OPT.abbruch ? T.abbruch : T.bewertungen[i], provision: OPT.abbruch ? 0 : 98400,
      bilanz: OPT.abbruch ? T.bilanzAbbruch.replace('{l}', 3).replace('{k}', 6) : T.bilanz.replace('{v}', 9).replace('{a}', HB.prozent(3.8, 1)) + bilanzZusatz([{ unterWert: true }, { ladenhueter: true }]),
      text: OPT.abbruch ? T.abbruchTexte[0] : (T.abschluss[i] && T.abschluss[i].text) || '',
      auftrag: OPT.abbruch ? null : { text: T.ui.erfuellt + ': +' + HB.euro(R.auftragBonus), erfuellt: true },
      mappe: muster, bestText: `${SCH.esc(T.ui.score)} <b>${HB.zahl(OPT.abbruch ? 854 : p)}/1.000</b>`, neu: false, einladung: T.einladung[0] });
    window.HN_MUSTER_MAPPE = muster;
    SCH.knoepfe({ los() {}, nochmal() { location.hash = ''; location.reload(); }, mappe() { SCH.mappe(muster.filter(m => m.art)); } });
  } else {
    SCH.start({ best: HB.best() || 0 });   // Frage: immer START_FRAGE_1 bzw. kunde.js texte.frage (schirme.js startFrage)
    if (OPT.los || OPT.objekt != null || OPT.schritt || OPT.obj != null) setTimeout(() => document.getElementById('losKnopf').click(), 60);
  }

  // ---------- Testhilfe für QA/Bots ----------
  window.HN_TEST = {
    zustand() {
      const ob = lauf && lauf.aktuell;
      return { phase, rahmen: R_.zustand, bennoVorgestellt: benno.vorgestellt, infos: infoSpeicher.ok ? infoSpeicher.liste.slice() : 'ohne Speicher', objekt: lauf ? lauf.i : 0, laeden: lauf ? lauf.laeden : 0, provision: lauf ? lauf.provision : 0,
        punkte: lauf ? lauf.ergebnisse.reduce((s, o) => s + o.punkte.schaetzung + o.punkte.besichtigung + o.punkte.kaeufer + o.punkte.bieter, 0) : 0,
        auftrag: lauf && lauf.auftrag ? lauf.auftrag.id + ' ' + lauf.auftrag.text : '', auftragStand: lauf && lauf.auftrag ? auftragText() : '',
        dauer: lauf ? (lauf.dauer || (performance.now() - lauf.start) / 1000) : 0,
        ereignisse: lauf ? lauf.ereignisse.map(e => e.nach + ':' + e.e.id) : [],
        objektDaten: ob ? { id: ob.daten.id, titel: ob.daten.titel, art: ob.art.name, viertel: ob.viertel.name, wert: ob.wert, wunsch: ob.wunsch,
          eigentuemer: ob.eigentuemer.id, verschwiegen: ob.verschwiegen, raeume: ob.raeume.map(r => r.id), mitBieter: ob.mitBieter,
          punkte: ob.punkte, abw: ob.abw, kaeufer: ob.kaeufer ? ob.kaeufer.map(k => k.art) : null } : null,
        ergebnisse: lauf ? lauf.ergebnisse.map(o => ({ nr: o.nr, id: o.daten.id, wert: o.wert, schaetzung: o.schaetzung, abw: o.abw && +o.abw.toFixed(2), laden: o.ladenhueter, unterWert: !!o.unterWert, preis: o.verkauf ? o.verkauf.preis : 0, provision: o.provision || 0, punkte: o.punkte, verkauf: o.verkauf && o.verkauf.art })) : [] };
    },
    schritt: () => ST.test(),
    setzen: v => ST.setzen(v),
  };
})();
