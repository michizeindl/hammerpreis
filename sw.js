// Service Worker der Sammlung „Hammerpreis“: macht die Sammlung auf Android als App installierbar (ohne Chrome-Zeichen) und
// hält die Dateien für den Fall ohne Netz bereit. Strategie „zuerst Netz“: jede Anfrage geht ans Netz (Neues kommt sofort
// an); nur wenn das Netz fehlt, antwortet die Kopie aus dem Zwischenspeicher. Nur eigene Dateien, keine fremden Server.
// Beim ersten Besuch wird das Gerüst (Startseite + Spiel) vorab abgelegt, damit das Spiel auch offline startet.
// Bei Änderungen an dieser Datei VERSION erhöhen – alte Zwischenspeicher dieser Sammlung (Präfix „hammerpreis-“) werden gelöscht.
const PREFIX = 'hammerpreis-';
const VERSION = PREFIX + 'v13';  // v13: Zwischenscreens bei jedem neuen Start von der Startseite/Neuladen, nicht nach „Nochmal“ (statt je Gerät).
                                 // v12: Startbild nur noch eine Frage auf allen Geräten („Bekommst du den Zuschlag?“).
                                 // v11: Hüpfer/Ring nur so groß, wie um den Knopf Platz ist (knopfPlatz), mehr Luft über roten Knöpfen,
                                 //      Hover nur mit Maus, Sprechblasen nach Textlänge, Benno stellt sich vor, Besichtigung ohne Auto-Wechsel/-Ende.
                                 // v10: Knall-Stern „DEAL?“ als <div> mit ruhendem SVG + HTML-Schrift (Schrift pulsiert am Handy mit),
                                 //      rote Knöpfe „Gummi-Hüpfer“ (Erscheinen, Hüpfer alle 2,2s, Ring; Tipp in der Ruhelage zählt),
                                 //      Startseiten-Statistik vor dem ersten Durchgang „–“ statt „0“/„0 €“.
                                 // v9: Bieterrunde ohne Erklärsatz nach dem Zuschlag (nur Ergebniszeile), mehr Platz für Kurve und Bieter.
                                 // v8: Verkauft-Stempel in der Gebotskurve an freier Stelle (nie über den Schildern).
                                 // v7: Zwischenscreens nur beim allerersten Spiel auf dem Gerät (mg:hammerpreis:infos:<firma>, MZ 27.10.2026).
                                 // v6: Balancing-Runde 1 (27.10.2026) – Bieterrunde in beide Richtungen ab der Schätzung (verdeckte Limits,
                                 //     Gebotskurve), Zwischenscreens vor jedem Schritt, Hinweis-Screens unter Wert/Ladenhüter, Exposé-Kopf,
                                 //     Titel ohne Artikel, „Zur Schätzung“ immer, Anruf gefüllt, Startanleitung neu, Intro abgesichert.
                                 // v5: Korrekturrunde 2 (27.10.2026) – Preis/Regler im Fuß, Sprüche nach Richtung, Antippen am Knopfrand, Rückfrage
                                 //     beim Haus-Knopf, Bieter-Fenster 1,6 → 1,0s, halbe Provision unter Wert, Ladenhüter-Warnung, Knopf an fester Stelle.
                                 // v4: Nachbesserung (27.10.2026) – große Zahlen (Endbild-Punkte, Gebot, Baujahr, Statistik der Startseite) in Figtree Black, Text BIETER_ERKLAERUNG.
                                 // v3: Korrekturrunde 1 (27.10.2026) – Verkauf unter Wert, Erklärung Bieterrunde, Sprechblasen, Käufer,
                                 //     Musik 64s, Bilder neu komprimiert, Klänge erst nach den Skripten.
                                 // v2: Phase 4 (27.10.2026) – Klänge (Musik, Raumgeräusche, Spannung, Effekte; makler-hammerpreis/klang.js),
                                 //     Hammer im Endbild ganz sichtbar, Bad P01 deckt das alte Waschbecken ab, zwei neue Käufer-Figuren.
                                 //     Klänge stehen nicht im Gerüst (1,7 MB): sie werden beim ersten Abspielen geladen und dabei abgelegt.
                                 // v1: neuer Name „Hammerpreis“ (MZ, 27.10.2026; Zählung neu) – Stand Phase 3: gestaltete Bilder (Figuren,
                                 //     Häuser, 12 Räume, 60 Merkmale, Straße, Hämmer), Anruf ohne Mängel, Bonus für verschwiegene Mängel,
                                 //     Tessa/Toni, Sprüche je Figur, Bewertungen Presslufthammer … Nicht hammermäßig

const GERUEST = [
  './', 'index.html', 'hammerpreis.webmanifest',
  'start/start.css', 'start/start.js', 'start/intro.js', 'start/hn-basis.js', 'start/hn-icon.js', 'start/hn-figuren.js',
  'kunde/kunde.js', 'kunde/logo-quer.svg', 'kunde/logo-hoch.svg', 'kunde/zeichen.svg',
  'schrift/schrift.css', 'schrift/bangers.woff2', 'schrift/figtree.woff2',
  'icons/icon.svg', 'icons/favicon.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-maskable-192.png',
  'makler-hammerpreis/', 'makler-hammerpreis/index.html', 'makler-hammerpreis/rahmen.css', 'makler-hammerpreis/rahmen.js',
  'makler-hammerpreis/hammerpreis.css', 'makler-hammerpreis/texte.js', 'makler-hammerpreis/bilder.js', 'makler-hammerpreis/daten.js', 'makler-hammerpreis/szene.js',
  'makler-hammerpreis/schirme.js', 'makler-hammerpreis/schritte.js', 'makler-hammerpreis/spiel.js', 'makler-hammerpreis/klang.js',
  // Figuren der Startseite (Figurenwahl); alle anderen Bilder legt der Service Worker beim ersten Laden ab
  'makler-hammerpreis/bilder/figuren/maklerin-neutral.webp', 'makler-hammerpreis/bilder/figuren/maklerin-freut.webp',
  'makler-hammerpreis/bilder/figuren/makler-neutral.webp', 'makler-hammerpreis/bilder/figuren/makler-freut.webp',
];

// einzeln ablegen: fehlt eine Datei (z. B. anderes Kundenlogo), bricht nicht alles ab
function ablegen(adressen) {
  return caches.open(VERSION).then(c => Promise.all(adressen.map(a => {
    const url = new URL(a, self.location.href).href;
    return fetch(url).then(r => (r.status === 200 && r.type === 'basic') ? c.put(url, r) : null).catch(() => null);
  })));
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(ablegen(GERUEST).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => n.startsWith(PREFIX) && n !== VERSION).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const anfrage = e.request, adresse = new URL(anfrage.url);
  if (anfrage.method !== 'GET' || adresse.origin !== self.location.origin) return;
  e.respondWith(fetch(anfrage).then(antwort => {
    // nur vollständige eigene Antworten merken (keine Teilantworten, keine Fehlerseiten)
    if (antwort.status === 200 && antwort.type === 'basic' && !anfrage.headers.has('range')) {
      const kopie = antwort.clone();
      e.waitUntil(caches.open(VERSION).then(c => c.put(anfrage, kopie)).catch(() => {}));
    }
    return antwort;
  }).catch(() => caches.open(VERSION).then(c => c.match(anfrage, { ignoreSearch: true })).then(t => t || Response.error())));
});
