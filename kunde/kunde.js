// Kundendaten der Sammlung „Hammerpreis“ (Baukasten A2 Immobilienmakler) – nur diese Datei und die Logos in diesem Ordner
// ändern sich pro Kunde. Startseite und Spiel laden beide genau diese Datei (keine Kopie im Spielordner).
// Musterfirma „Musterkamm Immobilien“, Musterstadt (alles erfunden, MZ 24./26.10.2026).
(function () {
  'use strict';
  // Adressen der Logos gelten ab diesem Ordner – egal, ob die Startseite oder das Spiel (eine Ebene tiefer) lädt
  var basis = 'kunde/';
  try { if (document.currentScript && document.currentScript.src) basis = new URL('.', document.currentScript.src).href; } catch (e) { /* alter Browser */ }

  window.KUNDE = {
    firma: 'Musterkamm Immobilien',
    // Kurzname für Seitentitel im Browser-Tab („Hammerpreis – Musterkamm Immobilien“)
    kurzname: 'Musterkamm Immobilien',

    // Logos (SVG, unverändert aus Material/Bilder/Musterfirmen/a2-makler). Das Logo steht überall LINKS (MZ, 26.10.2026),
    // immer allein auf weißem Grund (Kopfbalken der Startseite, weißes Schild im Start-/Endbild und im Spiel).
    // Ein SVG mit den Gruppen id="zeichen" und id="schriftzug" nutzt das Intro: das Zeichen („M“) springt an seinen Platz.
    logo: basis + 'logo-quer.svg',
    logoAufHell: basis + 'logo-quer.svg',
    logoHoch: basis + 'logo-hoch.svg',
    zeichen: basis + 'zeichen.svg',

    // Farben: haupt = Kundenfarbe (Emaille-Schild, Schrift, „M“ im App-Icon, Kundenknopf). Gelb und Rot sind feste
    // Comic-Farben der Sammlung (MZ, 26.10.2026) und stehen NICHT hier, sondern in start/hn-basis.js.
    farben: { haupt: '#1F2F4F', hauptText: '#ffffff' },

    // Kontaktdaten im Footer der Startseite (MZ, 26.10.2026). Nichts davon ist verlinkt oder anklickbar.
    // Telefon: Film-Rufnummer der Bundesnetzagentur (klingelt bei niemandem); Internetadresse ohne „www.“ (MZ).
    kontakt: ['Musterkamm Immobilien', 'Schlossgasse 5', '94999 Musterstadt'],
    telefon: 'Tel. 089 99998 140',
    web: 'musterkamm.de',
    // Datenschutz/Impressum: nur unterstrichen (Musterfirma). Ein echter Kunde trägt hier später seine Adressen ein.
    rechtliches: [{ text: 'Datenschutz', link: '' }, { text: 'Impressum', link: '' }],

    // Kundenknopf im Endbild „Was ist dein Haus wert?“ – bei der Musterfirma nur Optik (link leer = nicht anklickbar).
    // Ein echter Kunde trägt hier z. B. die Seite seiner Wertermittlungs-Anfrage ein: { text: '…', link: 'https://…' }.
    knopf: { text: 'Was ist <u>dein</u> Haus wert?', link: '' },

    // Vornamen der beiden Spielfiguren (Startseite: Name groß, darunter die Rolle). MZ, 27.10.2026: Tessa und Toni.
    figuren: { maklerin: { name: 'Tessa' }, makler: { name: 'Toni' } },

    // Ort der Spielwelt (Stadtplan, Texte). Viertel und Preise stehen in makler-hammerpreis/daten.js.
    ort: 'Musterstadt',

    // Texte überschreiben (optional): { titel, frage, anleitung }
    texte: {},
  };
})();
