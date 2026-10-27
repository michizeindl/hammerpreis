// „Hammerpreis“ – Grafik im Pop-Comic-Stil (schwarze Konturen, flache Farben). Platzhalter aus Code, bis die gestalteten
// Bilder des Graphic Artists in makler-hammerpreis/bilder/ liegen (Namen, Maße, Anker: Material/Uebergabe-Developer.md).
// Liegt ein Bild vor (bilder.js, erzeugt), wird es gezeichnet, sonst die Zeichnung aus Code (Rückfall):
//  - strasse(): lebende Straße als Hintergrund (Tageszeit, Wolken, Sonne, Jahreszeit, Katze, Postbote, Nachbarin mit Hund).
//    Bilder: bilder/strasse/haeuser (Häuserzeile), bilder/strasse/katze|postbote|nachbarin (Figuren, Anker unten Mitte).
//  - raum(): ein Raum der Besichtigung (zwölf Räume laut Texten), virtuell 400 × 300, mit den Mängeln/Pluspunkten an festen
//    Plätzen (ORTE). Liefert die Trefferflächen. Bilder: bilder/raeume/<raum>, bilder/merkmale/<ID> (freigestellt, Mitte = Platz).
//  - hausSvg(): kleines Bild je Art (Anruf, Käufer, Exposé, Mappe). Bild: bilder/haeuser/<art> (3:2).
//  - grundrissSvg(), energieSvg(), stadtplanSvg(): Hinweise beim Schätzen.
(function () {
  'use strict';
  const T = '#16181d';
  const B_ = () => window.HNB;
  const D_ = () => window.HN;
  const rnd = s => { let x = s; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; };

  // ---------- Bilder laden (nur was in bilder.js steht) ----------
  const bilder = {};
  function bild(pfad) {
    const adresse = D_().bild(pfad);
    if (!adresse) return null;
    if (!bilder[adresse]) { const i = new Image(); i.decoding = 'async'; i.src = adresse; bilder[adresse] = i; }
    const i = bilder[adresse];
    return i.complete && i.naturalWidth ? i : null;
  }

  // ---------- Grundformen ----------
  function form(g, pfad, fuell, lw) {
    g.beginPath(); pfad(g);
    if (fuell) { g.fillStyle = fuell; g.fill(); }
    if (lw !== 0) { g.lineWidth = lw || 2.5; g.strokeStyle = T; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  }
  const rect = (x, y, w, h) => g => g.rect(x, y, w, h);
  const rrect = (x, y, w, h, r) => g => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const kreis = (x, y, r) => g => g.arc(x, y, r, 0, Math.PI * 2);
  const ellipse = (x, y, rx, ry) => g => g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  const poly = pts => g => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); };
  function linie(g, pts, farbe, lw) {
    g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.strokeStyle = farbe || T; g.lineWidth = lw || 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  }
  function punkte(g, liste, farbe, r) { g.fillStyle = farbe; liste.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, r || 1.6, 0, Math.PI * 2); g.fill(); }); }
  function funkeln(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s || 1, s || 1);
    form(g, poly([0, -9, 2.5, -2.5, 9, 0, 2.5, 2.5, 0, 9, -2.5, 2.5, -9, 0, -2.5, -2.5]), '#fff6a8', 1.5);
    g.restore();
  }
  function mischFarbe(a, b, p) {
    const x = B_().rgb(a), y = B_().rgb(b);
    return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * p)).join(',') + ')';
  }
  function farbVerlauf(stops, p) {
    for (let i = 1; i < stops.length; i++) if (p <= stops[i][0]) return mischFarbe(stops[i - 1][1], stops[i][1], (p - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
    return stops[stops.length - 1][1];
  }
  let rasterMuster = null;
  function raster(g, w, h, farbe) {
    if (!rasterMuster || rasterMuster.f !== farbe) {
      const c = document.createElement('canvas'); c.width = c.height = 9;
      const x = c.getContext('2d'); x.fillStyle = farbe; x.beginPath(); x.arc(4.5, 4.5, 1.3, 0, Math.PI * 2); x.fill();
      rasterMuster = { f: farbe, m: g.createPattern(c, 'repeat') };
    }
    g.fillStyle = rasterMuster.m; g.fillRect(0, 0, w, h);
  }

  // ---------- Lebende Straße ----------
  const jahreszeit = (() => { const m = new Date().getMonth(); return m < 2 || m === 11 ? 'winter' : m < 5 ? 'fruehling' : m < 8 ? 'sommer' : 'herbst'; })();
  const LAUB = { herbst: ['#e8823a', '#d4562e', '#f2b33d'], sommer: ['#5aa84a', '#4a9440'], fruehling: ['#7cc464', '#f2a7c8'], winter: ['#ffffff'] };
  let statisch = null;
  function haeuserBauen(B, H, dpr) {
    const c = document.createElement('canvas');
    c.width = Math.round(B * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const boden = H * (B > H ? 0.82 : 0.8), r = rnd(7);
    const masz = Math.max(0.75, Math.min(1.4, H / 700));
    const zeile = bild('strasse/haeuser');
    if (zeile) {
      // Bild der Häuserzeile: Unterkante auf der Gehwegkante, Höhe 62 % bis zur Kante, waagrecht wiederholt
      const h = boden * 0.62, w = zeile.naturalWidth * h / zeile.naturalHeight;
      for (let x = 0; x < B; x += w) g.drawImage(zeile, x, boden - h, w, h);
    } else {
      const farben = ['#f6e6c2', '#f4b8a8', '#bfe3f5', '#cdb8f0', '#bfe6a8', '#f0dc9a', '#ffffff', '#f2c9a0'];
      let x = -20, n = 0;
      while (x < B + 20) {
        const w = (88 + r() * 60) * masz, h = (90 + r() * 80) * masz, f = farben[n % farben.length];
        const dach = r() < 0.75;
        form(g, rect(x, boden - h, w, h), f, 2.5);
        if (dach) form(g, poly([x - 8, boden - h, x + w / 2, boden - h - w * 0.42, x + w + 8, boden - h]), ['#d4562e', '#8a4a3a', '#5a6a7a', '#b0503a'][n % 4], 2.5);
        else form(g, rect(x - 4, boden - h - 8, w + 8, 10), '#9aa3ad', 2.5);
        const reihen = Math.max(1, Math.floor(h / (46 * masz))), spalten = Math.max(1, Math.floor(w / (38 * masz)));
        for (let a = 0; a < reihen; a++) for (let b = 0; b < spalten; b++) {
          const fw = 18 * masz, fh = 22 * masz;
          const fx = x + (b + 0.5) * w / spalten - fw / 2, fy = boden - h + 14 * masz + a * 44 * masz;
          if (fy + fh > boden - 30 * masz && b === Math.floor(spalten / 2)) continue;
          form(g, rect(fx, fy, fw, fh), '#cfe9f7', 2);
          g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(fx + 3, fy + 3, fw * 0.3, fh * 0.35);
        }
        const tw = 20 * masz, th = 32 * masz;
        form(g, rect(x + w / 2 - tw / 2, boden - th, tw, th), ['#1F2F4F', '#8a4a3a', '#3d7a4a', '#d4562e'][n % 4], 2);
        if (n % 3 === 1) {   // Schild „Zu verkaufen“ (Kundenfarbe)
          const sx = x + w - 14 * masz, sy = boden - 40 * masz;
          form(g, rect(sx - 1.5, sy, 3, 40 * masz), '#ffffff', 1.8);
          form(g, rect(sx - 15 * masz, sy - 4, 30 * masz, 18 * masz), B_().farben.haupt, 2);
          g.fillStyle = '#fff'; g.fillRect(sx - 10 * masz, sy + 1, 20 * masz, 2.5); g.fillRect(sx - 10 * masz, sy + 6, 14 * masz, 2.5);
        }
        if (n % 2 === 0) {
          const bx = x + w + 6 * masz;
          form(g, rect(bx - 3, boden - 46 * masz, 6, 46 * masz), '#8a5a3a', 2);
          const lf = LAUB[jahreszeit];
          form(g, kreis(bx, boden - 58 * masz, 20 * masz), lf[0], 2.5);
          form(g, kreis(bx - 12 * masz, boden - 48 * masz, 13 * masz), lf[1 % lf.length], 2.5);
          form(g, kreis(bx + 12 * masz, boden - 50 * masz, 14 * masz), lf[2 % lf.length], 2.5);
        }
        x += w + 18 * masz; n++;
      }
    }
    form(g, rect(-5, boden, B + 10, H * 0.05), '#d8d4cc', 2.5);
    g.fillStyle = '#5a5f68'; g.fillRect(0, boden + H * 0.05, B, H);
    g.fillStyle = '#f4f1e8';
    for (let s = 10; s < B; s += 60) g.fillRect(s, boden + H * 0.05 + (H - boden) * 0.45, 32, 4);
    if (jahreszeit === 'winter') { g.fillStyle = '#fff'; g.fillRect(-5, boden - 4, B + 10, 6); }
    statisch = { c, B, H, dpr, boden, masz, mitBild: !!zeile };
  }
  function sprite(g, name, x, y, h, richtung) {   // Figur als Bild (Anker unten Mitte), true wenn gezeichnet
    const i = bild('strasse/' + name);
    if (!i) return false;
    const w = i.naturalWidth * h / i.naturalHeight;
    g.save(); g.translate(x, y); g.scale(richtung, 1); g.drawImage(i, -w / 2, -h, w, h); g.restore();
    return true;
  }
  function katze(g, x, y, s, t, richtung) {
    if (sprite(g, 'katze', x, y, 30 * s, richtung)) return;
    g.save(); g.translate(x, y); g.scale(s * richtung, s);
    const bein = Math.sin(t * 10) * 3;
    form(g, g2 => { g2.moveTo(-10, -2); g2.quadraticCurveTo(-22, -16, -18, -26); }, null, 3);
    form(g, rrect(-12, -12, 22, 10, 5), '#2a2a2a', 2);
    form(g, kreis(12, -14, 6), '#2a2a2a', 2);
    form(g, poly([8, -18, 9, -25, 13, -19]), '#2a2a2a', 1.5); form(g, poly([13, -19, 16, -25, 17, -17]), '#2a2a2a', 1.5);
    g.strokeStyle = T; g.lineWidth = 3;
    [[-8, bein], [-4, -bein], [4, bein], [8, -bein]].forEach(([bx, d]) => { g.beginPath(); g.moveTo(bx, -3); g.lineTo(bx + d, 3); g.stroke(); });
    g.fillStyle = '#e8c23a'; g.fillRect(12, -16, 2, 2);
    g.restore();
  }
  function person(g, x, y, s, t, kleid, haar, richtung, extra) {
    if (sprite(g, extra === 'hund' ? 'nachbarin' : 'postbote', x, y, 64 * s, richtung)) return;
    g.save(); g.translate(x, y); g.scale(s * richtung, s);
    const b = Math.sin(t * 7) * 6;
    g.strokeStyle = T; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-3, -18); g.lineTo(-3 + b, 0); g.moveTo(3, -18); g.lineTo(3 - b, 0); g.stroke();
    form(g, rrect(-9, -46, 18, 30, 6), kleid, 2.2);
    form(g, kreis(0, -54, 8), '#f6cfaa', 2.2);
    form(g, g2 => { g2.arc(0, -56, 8.5, Math.PI, 0); g2.closePath(); }, haar, 2);
    if (extra === 'tasche') { form(g, rrect(6, -36, 12, 12, 2), '#c0902a', 2); g.beginPath(); g.moveTo(-6, -46); g.lineTo(12, -36); g.stroke(); }
    if (extra === 'hund') {
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(8, -30); g.lineTo(24, -10); g.stroke();
      form(g, rrect(18, -14, 18, 9, 4), '#c08a4a', 2); form(g, kreis(37, -15, 5), '#c08a4a', 2);
      g.lineWidth = 3; g.beginPath(); g.moveTo(21, -6); g.lineTo(21 + b * 0.5, 0); g.moveTo(33, -6); g.lineTo(33 - b * 0.5, 0); g.stroke();
    }
    g.restore();
  }
  let figurX = {};   // letzte Lage der Straßenfiguren (Ton beim Hereinlaufen)
  // tageszeit 0 (8 Uhr) … 1 (18 Uhr)
  function strasse(g, B, H, t, tageszeit, dpr) {
    if (!statisch || statisch.B !== B || statisch.H !== H || statisch.dpr !== dpr || (!statisch.mitBild && bild('strasse/haeuser'))) haeuserBauen(B, H, dpr || 1);
    const tz = Math.max(0, Math.min(1, tageszeit || 0));
    const oben = farbVerlauf([[0, '#9fd2f0'], [0.5, '#6fbdec'], [0.85, '#8aa8d8'], [1, '#e9866a']], tz);
    const unten = farbVerlauf([[0, '#fde3c0'], [0.5, '#cdeaf7'], [0.85, '#f6c98e'], [1, '#fbc26e']], tz);
    const v = g.createLinearGradient(0, 0, 0, statisch.boden); v.addColorStop(0, oben); v.addColorStop(1, unten);
    g.fillStyle = v; g.fillRect(0, 0, B, H);
    raster(g, B, statisch.boden, 'rgba(255,255,255,.22)');
    const m = statisch.masz, sr = 26 * m, sx = B * (0.08 + 0.84 * tz), sy = statisch.boden * (0.62 - 0.45 * Math.sin(Math.PI * tz));
    g.save(); g.translate(sx, sy); g.rotate(t * 0.15);
    g.fillStyle = 'rgba(255,240,170,.55)';
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(sr * 1.15, -5); g.lineTo(sr * 1.9, 0); g.lineTo(sr * 1.15, 5); g.fill(); }
    g.restore();
    form(g, kreis(sx, sy, sr), tz > 0.85 ? '#ffb347' : '#ffd84a', 2.5);
    for (let i = 0; i < 4; i++) {
      const w = (70 + i * 14) * m, x = ((t * (8 + i * 3) + i * 260) % (B + w * 2)) - w, y = statisch.boden * (0.12 + i * 0.13);
      form(g, g2 => { g2.arc(x, y, w * 0.22, Math.PI * 0.5, Math.PI * 1.5); g2.arc(x + w * 0.3, y - w * 0.12, w * 0.26, Math.PI, Math.PI * 1.9); g2.arc(x + w * 0.62, y - w * 0.02, w * 0.22, Math.PI * 1.3, Math.PI * 0.5); g2.closePath(); }, '#ffffff', 2.2);
    }
    g.drawImage(statisch.c, 0, 0, B, H);
    const lf = LAUB[jahreszeit];
    for (let i = 0; i < 9; i++) {
      const per = 9 + i, p = ((t + i * 3.1) % per) / per;
      const x = ((i * 137) % B) + Math.sin(t * 1.3 + i) * 20, y = p * statisch.boden * 1.05;
      g.save(); g.translate(x, y); g.rotate(t * 2 + i);
      form(g, g2 => g2.ellipse(0, 0, 4 * m, 2.2 * m, 0, 0, Math.PI * 2), lf[i % lf.length], 1.2);
      g.restore();
    }
    const gy = statisch.boden + H * 0.035, sp = B + 160;
    const xk = ((t * 26) % sp) - 60, xp = sp - ((t * 30 + 300) % sp) - 60, xn = ((t * 20 + 500) % sp) - 80;
    katze(g, xk, gy, 0.9 * m, t, 1);
    person(g, xp, gy + 2, 0.85 * m, t, '#e8c23a', '#3a2a1a', -1, 'tasche');
    person(g, xn, gy + 2, 0.85 * m, t, '#d0544a', '#c98a3a', 1, 'hund');
    // Ton (klang.js, selten und leise): Figur läuft ins Bild – Katze miaut, Postbote klingelt, Hund der Nachbarin bellt
    const kl = window.HN_KLANG, vx = figurX;
    if (kl && vx.B === B) {
      if (vx.k < 10 && xk >= 10) kl.strasse('katze');
      if (vx.p > B - 10 && xp <= B - 10) kl.strasse('klingel');
      if (vx.n < 10 && xn >= 10) kl.strasse('hund');
    }
    figurX = { k: xk, p: xp, n: xn, B };
    if (tz > 0.85) { g.fillStyle = `rgba(60,40,90,${(tz - 0.85) * 0.9})`; g.fillRect(0, 0, B, H); }
  }

  // ---------- Räume der Besichtigung (virtuell 400 × 300) ----------
  function innen(g, wand, boden, opt) {
    opt = opt || {};
    form(g, rect(0, 0, 400, 228), wand, 0);
    if (opt.streifen) { g.fillStyle = 'rgba(22,24,29,.06)'; for (let x = 10; x < 400; x += 28) g.fillRect(x, 24, 2, 204); }
    form(g, rect(0, 0, 400, 24), '#fbf6ea', 2.5);
    form(g, poly([0, 228, 400, 228, 400, 300, 0, 300]), boden, 2.5);
    g.strokeStyle = 'rgba(80,40,10,.22)'; g.lineWidth = 1.5;
    for (let y = 240; y < 300; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(400, y); g.stroke(); }
    linie(g, [0, 228, 400, 228], T, 2.5);
  }
  function fenster(g, x, y, w, h, blick) {
    form(g, rect(x - 5, y - 5, w + 10, h + 10), '#ffffff', 2.5);
    form(g, rect(x, y, w, h), blick || '#bfe3f5', 2);
    linie(g, [x + w / 2, y, x + w / 2, y + h], T, 2);
    form(g, rect(x - 10, y + h + 4, w + 20, 7), '#ffffff', 2);
  }
  function lampe(g, x) {
    linie(g, [x, 0, x, 34], T, 2);
    form(g, poly([x - 12, 34, x + 12, 34, x + 18, 48, x - 18, 48]), '#e8453c', 2.2);
  }
  function pflanze(g, x, y) {
    form(g, poly([x - 9, y, x + 9, y, x + 13, y - 24, x - 13, y - 24]), '#d4562e', 2.2);
    [[-12, -28], [0, -38], [12, -26], [-4, -20]].forEach(([dx, dy]) => form(g, g2 => g2.ellipse(x + dx * 0.6, y - 28 + dy * 0.6, 5, 12, dx / 20, 0, Math.PI * 2), '#5aa84a', 1.8));
  }
  function himmel(g, h) {
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, '#8fcdf0'); v.addColorStop(1, '#dff1fb');
    g.fillStyle = v; g.fillRect(0, 0, 400, h);
  }
  function wiese(g, y) {
    form(g, poly([0, y, 400, y, 400, 300, 0, 300]), '#9fd07a', 2.5);
    g.strokeStyle = 'rgba(60,110,40,.5)'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { const x = (i * 53) % 400, yy = y + 12 + (i * 29) % (290 - y); g.beginPath(); g.moveTo(x, yy); g.lineTo(x - 2, yy - 7); g.moveTo(x + 3, yy); g.lineTo(x + 5, yy - 6); g.stroke(); }
  }
  function nachbarhaus(g, x, y, w, h, wand, dach) {
    form(g, rect(x, y, w, h), wand, 2.5); form(g, poly([x - 8, y, x + w / 2, y - w * 0.45, x + w + 8, y]), dach, 2.5);
    form(g, rect(x + w * 0.2, y + h * 0.25, w * 0.22, h * 0.26), '#cfe9f7', 2); form(g, rect(x + w * 0.58, y + h * 0.25, w * 0.22, h * 0.26), '#cfe9f7', 2);
  }
  const RAUM = {
    wohnzimmer(g) {
      innen(g, '#f2e3c4', '#d9b48a', { streifen: true });
      lampe(g, 290); fenster(g, 40, 50, 90, 100);
      form(g, rrect(52, 172, 66, 26, 3), '#ffffff', 2.2);
      form(g, rrect(162, 150, 128, 52, 10), '#3d7a9a', 2.5); form(g, rrect(170, 130, 112, 34, 8), '#4a8aaa', 2.5);
      form(g, rrect(154, 160, 18, 48, 6), '#3d7a9a', 2.5); form(g, rrect(280, 160, 18, 48, 6), '#3d7a9a', 2.5);
      form(g, rrect(186, 140, 26, 20, 6), '#f2c14e', 2); form(g, rrect(242, 140, 26, 20, 6), '#e8453c', 2);
      form(g, rect(196, 56, 60, 44), '#fffaf0', 2.5); form(g, poly([202, 94, 220, 70, 232, 84, 240, 76, 250, 94]), '#5aa84a', 1.8);
      pflanze(g, 309, 228);
      form(g, rect(330, 96, 58, 132), '#c9884a', 2.5);
      for (let y = 128; y < 228; y += 32) linie(g, [330, y, 388, y], T, 2.5);
      [['#e8453c', 0], ['#3d7a9a', 9], ['#f2c14e', 18], ['#5aa84a', 27]].forEach(([f, d]) => form(g, rect(336 + d, 104, 8, 24), f, 1.5));
    },
    kueche(g) {
      innen(g, '#f3ecd8', '#e8e2d4');
      g.strokeStyle = 'rgba(22,24,29,.18)'; g.lineWidth = 1.5;
      for (let x = 0; x < 400; x += 40) { g.beginPath(); g.moveTo(x, 228); g.lineTo(x - 20, 300); g.stroke(); }
      lampe(g, 200); fenster(g, 30, 50, 80, 90);
      form(g, rect(140, 188, 100, 8), '#c9884a', 2.2);
      [[146, 196], [228, 196]].forEach(([x, y]) => form(g, rect(x, y, 6, 32), '#a0703a', 2));
      form(g, rrect(124, 168, 16, 60, 4), '#e8453c', 2); form(g, rrect(240, 168, 16, 60, 4), '#e8453c', 2);
      form(g, kreis(176, 182, 7), '#ffffff', 2);
      form(g, rect(270, 150, 130, 78), '#ffffff', 2.5); form(g, rect(266, 142, 134, 10), '#5a5f68', 2.5);
      form(g, rect(280, 162, 40, 50), '#2a2a2a', 2); form(g, rect(330, 160, 34, 60), '#e8e8e8', 2);
      form(g, rect(276, 60, 124, 46), '#ffffff', 2.5); linie(g, [338, 60, 338, 106], T, 2);
    },
    bad(g) {
      form(g, rect(0, 0, 400, 228), '#d8eef4', 0);
      g.strokeStyle = 'rgba(22,24,29,.16)'; g.lineWidth = 1.2;
      for (let y = 24; y < 228; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(400, y); g.stroke(); }
      for (let x = 0; x < 400; x += 20) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, 228); g.stroke(); }
      form(g, rect(0, 0, 400, 24), '#fbf6ea', 2.5);
      form(g, poly([0, 228, 400, 228, 400, 300, 0, 300]), '#c9ccd3', 2.5);
      g.strokeStyle = 'rgba(22,24,29,.2)'; for (let x = 0; x < 400; x += 32) { g.beginPath(); g.moveTo(x, 228); g.lineTo(x - 16, 300); g.stroke(); }
      linie(g, [0, 228, 400, 228], T, 2.5);
      form(g, rect(30, 36, 50, 40), '#bfe3f5', 2.5);
      form(g, rrect(16, 176, 154, 56, 14), '#ffffff', 2.5); form(g, rrect(26, 182, 134, 18, 8), '#bfe3f5', 1.5);
      form(g, rect(202, 60, 50, 56), '#cfe9f7', 2.5); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(208, 66, 12, 26);
      form(g, rrect(196, 136, 62, 20, 8), '#ffffff', 2.5); form(g, rect(219, 156, 16, 72), '#ffffff', 2.2);
      form(g, rrect(222, 122, 8, 14, 2), '#c9ccd3', 1.8);
      form(g, rrect(300, 180, 46, 48, 10), '#ffffff', 2.5); form(g, rrect(296, 150, 54, 30, 6), '#ffffff', 2.5);
      form(g, rect(366, 110, 26, 54), '#f2c14e', 2);
    },
    schlafzimmer(g) {
      innen(g, '#e6dcf2', '#c9a27a', { streifen: true });
      lampe(g, 230); fenster(g, 40, 50, 90, 100);
      form(g, rect(170, 120, 150, 60), '#a0703a', 2.5);
      form(g, rrect(160, 168, 170, 50, 6), '#ffffff', 2.5); form(g, rrect(160, 176, 170, 42, 6), '#7a9ad8', 2.5);
      form(g, rrect(176, 150, 44, 22, 8), '#ffffff', 2); form(g, rrect(266, 150, 44, 22, 8), '#ffffff', 2);
      form(g, rect(330, 70, 62, 158), '#c9884a', 2.5); linie(g, [361, 70, 361, 228], T, 2);
      form(g, rect(134, 186, 22, 42), '#c9884a', 2);
    },
    flur(g) {
      innen(g, '#f4ead8', '#b07a50');
      lampe(g, 140);
      form(g, rect(150, 70, 70, 158), '#8a4a3a', 2.5); form(g, kreis(206, 152, 4), '#f2c14e', 1.5);
      form(g, rect(162, 82, 46, 40), '#cfe9f7', 2);
      linie(g, [20, 140, 110, 140], T, 3);
      [[34, '#e8453c'], [62, '#3d7a9a'], [90, '#f2c14e']].forEach(([x, f]) => form(g, rrect(x - 9, 144, 18, 44, 6), f, 2));
      form(g, rect(240, 210, 50, 18), '#7a5aa6', 2);
      for (let i = 0; i < 6; i++) form(g, rect(300 + i * 16, 220 - i * 30, 100 - i * 16, 8), '#c9884a', 2);
      linie(g, [296, 190, 396, 30], T, 2.5);
    },
    keller(g) {
      form(g, rect(0, 0, 400, 228), '#c9ccc8', 0);
      g.strokeStyle = 'rgba(22,24,29,.15)'; g.lineWidth = 1.5;
      for (let y = 40; y < 228; y += 26) for (let x = (y / 26) % 2 ? 0 : 24; x < 400; x += 48) g.strokeRect(x, y, 48, 26);
      form(g, rect(0, 0, 400, 24), '#a0a4a8', 2.5);
      form(g, poly([0, 228, 400, 228, 400, 300, 0, 300]), '#9a9e9a', 2.5);
      linie(g, [0, 228, 400, 228], T, 2.5);
      form(g, rect(0, 18, 400, 14), '#a0703a', 2.5);
      form(g, rect(160, 92, 120, 136), '#b8875a', 2.5);
      for (let y = 124; y < 228; y += 34) linie(g, [160, y, 280, y], T, 2.5);
      [[174, 106, '#e8453c'], [198, 108, '#f2c14e'], [226, 104, '#5aa84a'], [252, 106, '#e8453c'], [180, 140, '#f2c14e'], [240, 138, '#e8823a']]
        .forEach(([x, y, f]) => form(g, rrect(x, y, 16, 18, 3), f, 1.8));
      form(g, rrect(310, 150, 58, 78, 4), '#ffffff', 2.5); form(g, kreis(339, 192, 18), '#bfe3f5', 2.5);
      form(g, rect(40, 40, 60, 24), '#bfe3f5', 2.5);
    },
    dach(g) {
      himmel(g, 160);
      form(g, poly([-10, 150, 80, 20, 320, 20, 410, 150]), '#c4523a', 2.5);
      g.strokeStyle = 'rgba(22,24,29,.35)'; g.lineWidth = 1.5;
      for (let y = 36; y < 150; y += 14) { const k = (y - 20) / 130; g.beginPath(); g.moveTo(80 - 90 * k, y); g.lineTo(320 + 90 * k, y); g.stroke(); }
      form(g, rect(330, 0, 24, 40), '#8a4a3a', 2.5);
      // Querschnitt Dachboden darunter
      form(g, rect(0, 150, 400, 150), '#e9d6b0', 2.5);
      form(g, poly([0, 150, 400, 150, 400, 160, 0, 160]), '#a0703a', 2);
      [60, 140, 220, 300, 380].forEach(x => form(g, rect(x - 5, 160, 10, 112), '#b98a4a', 2));
      form(g, rect(0, 272, 400, 28), '#c9884a', 2.5);
      form(g, rrect(150, 236, 44, 36, 3), '#d8b070', 2); form(g, rrect(200, 246, 30, 26, 3), '#d8b070', 2);
    },
    fassade(g) {
      himmel(g, 60);
      form(g, poly([-10, 56, 410, 56, 410, 40, -10, 40]), '#8a4a3a', 2.5);
      form(g, rect(0, 56, 400, 216), '#f6e6c2', 2.5);
      [[60, 90], [260, 90], [60, 180]].forEach(([x, y]) => { form(g, rect(x, y, 70, 60), '#cfe9f7', 2.5); linie(g, [x + 35, y, x + 35, y + 60], T, 2); form(g, rect(x - 6, y + 60, 82, 6), '#ffffff', 2); });
      form(g, rect(250, 170, 60, 102), '#1F2F4F', 2.5); form(g, kreis(298, 224, 3.5), '#f2c14e', 1.5);
      form(g, rect(0, 272, 400, 28), '#d8d4cc', 2.5);
      form(g, rect(0, 56, 400, 8), '#9aa3ad', 2);
      form(g, rect(380, 64, 8, 208), '#9aa3ad', 2);
    },
    garten(g) {
      himmel(g, 150);
      nachbarhaus(g, 270, 80, 80, 64, '#f4b8a8', '#d4562e');
      wiese(g, 150);
      for (let x = 4; x < 400; x += 16) form(g, rect(x, 130, 8, 26), '#ffffff', 2);
      linie(g, [0, 140, 400, 140], T, 2);
      form(g, kreis(330, 280, 12), '#5aa84a', 2); form(g, kreis(344, 276, 10), '#5aa84a', 2);
      form(g, g2 => g2.ellipse(200, 282, 16, 8, 0, 0, Math.PI * 2), '#a0a4a8', 2);
    },
    strasse(g) {
      himmel(g, 200);
      form(g, rect(10, 70, 120, 150), '#f6e6c2', 2.5); form(g, poly([0, 70, 70, 26, 140, 70]), '#d4562e', 2.5);
      form(g, rect(30, 96, 30, 30), '#cfe9f7', 2); form(g, rect(80, 96, 30, 30), '#cfe9f7', 2); form(g, rect(56, 160, 28, 60), B_().farben.haupt, 2);
      nachbarhaus(g, 170, 120, 80, 100, '#bfe3f5', '#5a6a7a');
      form(g, rect(0, 220, 400, 18), '#d8d4cc', 2.5);
      form(g, rect(0, 238, 400, 62), '#5a5f68', 2.5);
      g.fillStyle = '#f4f1e8'; for (let x = 10; x < 400; x += 60) g.fillRect(x, 266, 32, 4);
      linie(g, [150, 220, 150, 120], T, 3); form(g, rrect(140, 108, 20, 14, 4), '#ffd84a', 2);
    },
    hof(g) {
      himmel(g, 150);
      form(g, rect(0, 150, 400, 150), '#d8c49a', 2.5);
      g.fillStyle = 'rgba(120,90,50,.25)'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc((i * 67) % 400, 160 + (i * 37) % 140, 2, 0, Math.PI * 2); g.fill(); }
      form(g, rect(20, 96, 150, 90), '#ffffff', 2.5); form(g, poly([10, 96, 95, 50, 180, 96]), '#8a4a3a', 2.5);
      form(g, rect(80, 140, 34, 46), '#8a5a3a', 2);
      form(g, rect(232, 70, 160, 120), '#b0503a', 2.5); form(g, poly([222, 70, 312, 24, 402, 70]), '#6a4a3a', 2.5);
      form(g, rect(280, 120, 64, 70), '#8a4a2a', 2.5); linie(g, [312, 120, 312, 190], T, 2);
      form(g, kreis(200, 270, 10), '#5aa84a', 2);
    },
    grundstueck(g) {
      himmel(g, 168);
      form(g, kreis(70, 50, 16), '#ffd84a', 2.2);
      nachbarhaus(g, 240, 104, 70, 64, '#f4b8a8', '#d4562e');
      nachbarhaus(g, 320, 116, 60, 52, '#bfe3f5', '#5a6a7a');
      wiese(g, 168);
      for (let x = 4; x < 236; x += 16) form(g, rect(x, 150, 8, 24), '#ffffff', 2);
      linie(g, [0, 160, 236, 160], T, 2);
      form(g, rect(198, 196, 4, 44), '#ffffff', 2); form(g, rect(178, 178, 44, 26), B_().farben.haupt, 2.5);
      g.fillStyle = '#fff'; g.fillRect(184, 185, 32, 3); g.fillRect(184, 192, 22, 3);
    },
  };

  // Plätze der Merkmale (virtuell 400 × 300; Raumbild 1200 × 900 = × 3), eingemessen an den gestalteten Raumbildern
  // (Material/Bilder/raum-*.png, Maße dort ÷ 3,62). p = mögliche Plätze [x, y] (der erste freie gilt; Merkmale mit weniger
  // Plätzen werden zuerst gesetzt), b = Rahmen [Breite, Höhe] – das Bild wird mit seinem Seitenverhältnis hineingesetzt,
  // u = y ist die Unterkante (steht auf dem Boden), f = genau auf den Rahmen gedehnt (ersetzt Fenster, Wanne, Regal …),
  // d = Flicken [x, y, w, h, dx, dy]: Stück des Raumbilds von (x+dx, y+dy) über (x, y) legen, bevor das Merkmal kommt,
  // k = waagrecht über die ganze Breite gekachelt (Stuckleiste). Die Trefferfläche ist das gezeichnete Bild.
  const ORTE = {
    // Bad: Fliesen ab y 23, Boden ab 233; Wanne x 9–190, Waschbecken/Spiegel x 196–273, WC x 299–355
    M01: { p: [[338, 64], [108, 130]], b: [60, 60] }, M02: { p: [[235, 151]], b: [50, 40], u: 1 },
    // P01 neues Bad: d = Flicken aus dem Raumbild selbst (Fliesen, um genau fünf Fliesen = 97,67 versetzt, damit das Raster
    // passt) über das gemalte Waschbecken mit Spiegel, das sonst über bzw. neben dem neuen Waschtisch zu sehen ist (Phase 4)
    M03: { p: [[99, 245]], b: [186, 92], u: 1 }, P01: { p: [[236, 243]], b: [116, 116], u: 1, d: [[191, 56, 90, 121, -97.67, 0], [191, 177, 90, 27, -97.67, -39.07]] },
    P02: { p: [[333, 245]], b: [104, 120], u: 1 },
    // Küche: Fenster x 23–131, Wandschrank rechts y 55–105, Tisch mit Stühlen x 114–282, Boden ab 226
    M04: { p: [[341, 229]], b: [118, 92], u: 1 }, P03: { p: [[341, 229]], b: [118, 92], u: 1 },
    P04: { p: [[198, 239]], b: [172, 118], u: 1 }, M05: { p: [[205, 40], [328, 30]], b: [96, 62] },
    // Wohnzimmer: Fenster x 25–144 / y 46–160, Bild x 192–257, Sofa x 134–291, Regal x 320–392 / y 75–222, Boden ab 221
    M06: { p: [[290, 100], [168, 100], [75, 193]], b: [50, 74] }, M09: { p: [[290, 100], [168, 100], [75, 193]], b: [50, 74] },
    M10: { p: [[290, 100], [168, 100], [75, 193]], b: [50, 74] },
    M07: { p: [[80, 262], [215, 262], [345, 262]], b: [72, 64] }, P05: { p: [[215, 262], [80, 262], [345, 262]], b: [72, 64] },
    M08: { p: [[85, 103]], b: [126, 122], f: 1 }, P08: { p: [[85, 223]], b: [126, 180], u: 1, f: 1 },
    P09: { p: [[85, 223], [356, 223]], b: [126, 180], u: 1, f: 1 }, P07: { p: [[356, 223]], b: [80, 152], u: 1, f: 1 },
    P06: { p: [[200, 21]], b: [400, 22], k: 1 },
    // Schlafzimmer: Fenster x 19–112 / y 55–164, Lampe x 192–230, Bett x 110–315 ab y 140, Schrank x 316–392
    M11: { p: [[152, 86], [276, 86]], b: [72, 60] }, M12: { p: [[66, 110]], b: [97, 113], f: 1 },
    P10: { p: [[276, 84], [66, 110]], b: [84, 70] },
    // Flur: Garderobe x 6–110, Tür x 137–229, Truhe x 240–307 / y 197–229, Treppe rechts ab x 311, Boden ab 225
    M13: { p: [[284, 110], [58, 52]], b: [70, 62] }, M14: { p: [[355, 242], [272, 136]], b: [94, 116], u: 1 },
    P11: { p: [[272, 230]], b: [88, 76], u: 1 },
    // Keller: Fenster x 22–86 / y 32–59, Regal x 128–239 / y 77–217, Boden ab 210
    M15: { p: [[66, 215], [325, 215]], b: [112, 98], u: 1 }, M16: { p: [[322, 108], [62, 112]], b: [90, 76] },
    M17: { p: [[330, 215]], b: [100, 126], u: 1 }, P12: { p: [[183, 218]], b: [116, 144], u: 1, f: 1 },
    P13: { p: [[330, 215]], b: [72, 106], u: 1 }, P14: { p: [[68, 215], [322, 215]], b: [126, 90], u: 1 },
    // Dach: Dachfläche y 18–128 (oben x 75–313, unten ganze Breite), Dachboden y 141–247, Pfosten x 48–60 / 211–225 / 382–395
    M18: { p: [[150, 82], [272, 62]], b: [90, 58] }, P15: { p: [[230, 74], [140, 82]], b: [122, 88] },
    P16: { p: [[128, 86], [300, 90]], b: [80, 52] }, P17: { p: [[272, 70], [130, 84]], b: [100, 64] },
    M19: { p: [[300, 193], [135, 180]], b: [140, 94] }, M20: { p: [[140, 168], [300, 168]], b: [104, 40] },
    // Fassade: Dachrinne y 39–48, Fenster links x 37–124 (y 74–144 und 182–252), rechts x 275–362, Tür x 272–340, Fallrohr x 380
    M21: { p: [[196, 118], [200, 225]], b: [70, 88] }, M22: { p: [[200, 215], [198, 110]], b: [110, 70] },
    M23: { p: [[200, 61], [80, 61]], b: [104, 60] }, P18: { p: [[200, 130], [200, 228]], b: [64, 100] },
    P19: { p: [[80.5, 109], [80.5, 217]], b: [88, 71], f: 1 },
    // Garten: Zaun y 133–156, Nachbarhaus x 282–370, Wiese ab 156
    M24: { p: [[90, 252], [300, 256]], b: [100, 108], u: 1 }, M25: { p: [[110, 168], [300, 168]], b: [120, 96], u: 1 },
    M26: { p: [[190, 240]], b: [130, 74] }, P20: { p: [[320, 264], [92, 264]], b: [112, 112], u: 1 },
    P21: { p: [[70, 252], [330, 252]], b: [110, 130], u: 1 },
    // Straße: gelbes Haus x 0–126, Laterne x 123–143, blaues Haus x 142–231, Gehweg y 218–235, Fahrbahn ab 235
    M27: { p: [[310, 292], [100, 292]], b: [112, 98], u: 1 }, M28: { p: [[300, 233]], b: [132, 124], u: 1 },
    M29: { p: [[330, 223]], b: [100, 196], u: 1 }, P22: { p: [[382, 233], [252, 233]], b: [36, 86], u: 1 },
    // Hof: Stall (weiß) x 4–195 / Dach y 66–106, Scheune x 210–396 / y 22–178, Hofboden ab 160
    M30: { p: [[303, 181]], b: [192, 172], u: 1 }, M31: { p: [[100, 270], [220, 270]], b: [100, 104], u: 1 },
    M32: { p: [[100, 87]], b: [198, 46], f: 1 }, P23: { p: [[300, 270], [110, 270]], b: [120, 100], u: 1 },
    // Grundstück: Zaun x 0–240 / y 134–156, Häuser x 232–390, Schild x 204–243 / y 165–213, Wiese ab 156
    M33: { p: [[110, 248], [320, 255]], b: [120, 70] }, M34: { p: [[140, 255], [300, 255]], b: [170, 86] },
    M35: { p: [[130, 255], [310, 262]], b: [140, 80] }, P24: { p: [[345, 264], [75, 264]], b: [100, 74], u: 1 },
    P25: { p: [[224, 215], [90, 252]], b: [90, 72], u: 1 },
  };
  // Größe im Rahmen: mit dem Seitenverhältnis des Bildes (solange es lädt bzw. bei f/k: der Rahmen selbst)
  function rahmenVon(o, img) {
    const [bw, bh] = o.b;
    if (o.f || o.k || !img) return [bw, bh];
    const q = img.naturalWidth / img.naturalHeight;
    return q > bw / bh ? [bw, bw / q] : [bh * q, bh];
  }

  // Zeichnungen der Merkmale (Platzhalter). Jede bekommt den Mittelpunkt (x, y).
  const MOTIV = {
    M01(g, x, y) { const r = rnd(3); for (let i = 0; i < 16; i++) { g.fillStyle = i % 3 ? 'rgba(40,60,40,.8)' : 'rgba(70,90,50,.7)'; g.beginPath(); g.arc(x + (r() - 0.5) * 40, y + (r() - 0.5) * 44, 2 + r() * 5, 0, Math.PI * 2); g.fill(); } },
    M02(g, x, y) { form(g, rrect(x - 10, y - 8, 22, 10, 3), '#c9ccd3', 2); form(g, rect(x + 6, y + 2, 6, 10), '#c9ccd3', 2); const t = performance.now() / 1000; g.fillStyle = '#5ab0e0'; for (let i = 0; i < 2; i++) { const p = (t * 1.2 + i / 2) % 1; g.beginPath(); g.ellipse(x + 9, y + 14 + p * 22, 2.5, 4, 0, 0, Math.PI * 2); g.fill(); } },
    M03(g, x, y) { form(g, rrect(x - 77, y - 28, 154, 56, 14), '#efe8d6', 2.5); [[-40, -6, 10], [10, 4, 8], [44, -10, 7], [-10, 14, 6]].forEach(([dx, dy, r]) => form(g, ellipse(x + dx, y + dy, r, r * 0.7), '#4a4a4a', 1.5)); linie(g, [x - 60, y + 10, x - 30, y + 18], '#a07a40', 2); },
    M04(g, x, y) { form(g, rect(x - 60, y - 36, 120, 78), '#d8c8a0', 2.5); linie(g, [x, y - 36, x, y + 42], T, 2); form(g, rect(x + 4, y - 30, 50, 64), '#c8b890', 2); g.save(); g.translate(x - 30, y); g.rotate(0.15); form(g, rect(-26, -30, 52, 62), '#d8c8a0', 2); g.restore(); [[-50, -20, -20, -10], [10, 10, 40, 0], [-40, 20, -10, 28]].forEach(([a, b, c, d]) => linie(g, [x + a, y + b, x + c, y + d], '#7a6a4a', 1.5)); },
    M05(g, x, y) { g.fillStyle = 'rgba(150,110,50,.35)'; g.beginPath(); g.ellipse(x, y, 34, 13, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(120,80,30,.75)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 34, 13, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(x, y, 20, 7, 0, 0, Math.PI * 2); g.stroke(); },
    M06(g, x, y) { linie(g, [x - 4, y - 32, x + 4, y - 18, x - 3, y - 6, x + 6, y + 8, x, y + 20, x + 5, y + 34], T, 2.2); linie(g, [x + 6, y + 8, x + 16, y + 12], T, 2); linie(g, [x - 3, y - 6, x - 13, y - 2], T, 1.6); },
    M07(g, x, y) { form(g, rect(x - 60, y - 22, 120, 44), '#b98a5a', 2); for (let i = -40; i < 60; i += 24) linie(g, [x + i, y - 22, x + i, y + 22], 'rgba(60,30,10,.6)', 1.5); g.save(); g.translate(x + 8, y - 4); g.rotate(-0.08); form(g, rect(-12, -18, 24, 36), '#a87a4a', 1.8); g.restore(); [-18, 0, 18].forEach(d => linie(g, [x - 30 + d, y - 26, x - 26 + d, y - 34, x - 22 + d, y - 26], T, 1.6)); },
    M08(g, x, y) { form(g, rect(x - 51, y - 56, 102, 112), '#a0703a', 2.5); form(g, rect(x - 45, y - 50, 90, 100), '#bfe3f5', 2); linie(g, [x, y - 50, x, y + 50], '#7a4a1a', 3); linie(g, [x - 25, y - 40, x - 7, y - 16, x - 15, y + 2], T, 1.5); linie(g, [x - 7, y - 16, x - 1, y - 10], T, 1.5); g.strokeStyle = 'rgba(80,120,160,.7)'; g.lineWidth = 1.4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + 56, y - 20 + i * 14); g.quadraticCurveTo(x + 64, y - 14 + i * 14, x + 72, y - 20 + i * 14); g.stroke(); } },
    M09(g, x, y) { form(g, rect(x - 28, y - 38, 56, 76), '#e8d68a', 1.5); g.fillStyle = 'rgba(160,130,40,.4)'; for (let i = -24; i < 28; i += 10) g.fillRect(x + i, y - 38, 4, 76); form(g, poly([x + 28, y - 38, x + 10, y - 38, x + 28, y - 14]), '#fbf6ea', 1.6); form(g, poly([x + 10, y - 38, x + 28, y - 14, x + 14, y - 22]), '#d8c470', 1.6); },
    M10(g, x, y) { form(g, g2 => { g2.moveTo(x - 6, y - 16); g2.bezierCurveTo(x + 16, y - 22, x + 16, y + 10, x + 2, y + 14); g2.bezierCurveTo(x - 4, y + 16, x - 8, y + 8, x - 4, y + 4); }, '#f6cfaa', 2); g.strokeStyle = T; g.lineWidth = 1.8; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x - 10, y, i * 7, Math.PI * 0.7, Math.PI * 1.3); g.stroke(); } g.font = '800 10px Figtree, sans-serif'; g.fillStyle = T; g.textAlign = 'center'; g.fillText('bla', x - 22, y - 18); },
    M11(g, x, y) { const r = rnd(9); g.fillStyle = 'rgba(70,80,60,.55)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(x + (r() - 0.5) * 30, y + r() * 50 - 14, 4 + r() * 8, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#5ab0e0'; g.beginPath(); g.ellipse(x - 4, y + 34, 2.5, 4, 0, 0, Math.PI * 2); g.fill(); },
    M12(g, x, y) { form(g, rect(x - 50, y - 55, 100, 110), '#ffffff', 2.5); form(g, rect(x - 45, y - 50, 45, 100), '#bfe3f5', 2); g.save(); g.translate(x, y - 50); g.rotate(0.12); form(g, rect(0, 0, 45, 100), '#d8eef8', 2.2); g.restore(); linie(g, [x + 30, y + 64, x + 52, y + 64], '#e8453c', 3); form(g, poly([x + 52, y + 58, x + 62, y + 64, x + 52, y + 70]), '#e8453c', 1.5); },
    M13(g, x, y) { form(g, rect(x - 20, y - 26, 40, 52), '#c9b98a', 2.5); [[-10, -12], [4, -12], [-10, 4], [4, 4]].forEach(([dx, dy]) => form(g, kreis(x + dx + 3, y + dy + 3, 5), '#e8e2d4', 1.5)); linie(g, [x + 22, y - 18, x + 30, y - 10, x + 25, y - 8, x + 33, y], '#ffd84a', 2.4); linie(g, [x - 6, y + 26, x - 10, y + 40], T, 2); linie(g, [x + 6, y + 26, x + 12, y + 40], '#e8453c', 2); },
    M14(g, x, y) { for (let i = 0; i < 9; i++) form(g, rect(x - 54 + i * 8, y + 80 - i * 20, 108 - i * 8, 8), '#c9884a', 1.8); form(g, rrect(x - 56, y - 96, 34, 34, 4), '#ffffff', 2); g.font = '900 9px Figtree, sans-serif'; g.fillStyle = T; g.textAlign = 'center'; g.fillText('LIFT', x - 39, y - 76); linie(g, [x - 54, y - 64, x - 24, y - 94], '#e8453c', 3); },
    M15(g, x, y) { form(g, ellipse(x, y + 18, 60, 12), '#7ab8d8', 2); g.fillStyle = 'rgba(60,80,60,.35)'; for (let i = -50; i < 60; i += 16) { g.beginPath(); g.ellipse(x + i, y - 20 + (i % 3) * 6, 8, 18, 0, 0, Math.PI * 2); g.fill(); } },
    M16(g, x, y) { const r = rnd(5); g.fillStyle = '#ffffff'; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(x + (r() - 0.5) * 50, y + (r() - 0.5) * 50, 2 + r() * 5, 0, Math.PI * 2); g.fill(); } g.strokeStyle = 'rgba(22,24,29,.4)'; g.lineWidth = 1; g.strokeRect(x - 30, y - 30, 60, 60); },
    M17(g, x, y) { form(g, rrect(x - 36, y - 50, 72, 96, 10), '#b07a50', 2.5); form(g, rect(x - 20, y - 30, 40, 20), '#5a5f68', 2); form(g, kreis(x + 18, y + 20, 7), '#ffffff', 1.8); linie(g, [x + 18, y + 20, x + 22, y + 15], T, 1.5); g.fillStyle = '#7a3a1a'; [[x - 24, y + 10], [x - 10, y + 30], [x + 26, y - 10]].forEach(([a, b]) => { g.beginPath(); g.ellipse(a, b, 4, 7, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = 'rgba(40,30,20,.6)'; g.beginPath(); g.ellipse(x, y + 52, 30, 5, 0, 0, Math.PI * 2); g.fill(); },
    M18(g, x, y) { form(g, poly([x - 30, y - 16, x + 24, y - 20, x + 32, y + 14, x - 26, y + 18]), '#8fcdf0', 2.2); linie(g, [x - 28, y, x + 28, y - 4], '#a0703a', 3); g.fillStyle = '#5ab0e0'; const t = performance.now() / 1000; for (let i = 0; i < 3; i++) { const p = (t + i / 3) % 1; g.beginPath(); g.ellipse(x - 10 + i * 12, y + 20 + p * 30, 2, 3.5, 0, 0, Math.PI * 2); g.fill(); } },
    M19(g, x, y) { for (let i = -2; i <= 2; i++) form(g, rect(x + i * 18 - 4, y - 44, 8, 88), '#b98a4a', 1.8); g.strokeStyle = '#7ab8d8'; g.lineWidth = 2.2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - 44, y - 20 + i * 18); g.bezierCurveTo(x - 20, y - 30 + i * 18, x + 10, y - 10 + i * 18, x + 44, y - 20 + i * 18); g.stroke(); } form(g, poly([x - 6, y - 50, x + 6, y - 50, x, y - 40]), '#ffffff', 1.2); },
    M20(g, x, y) { form(g, rect(x - 9, y - 46, 18, 92), '#b98a4a', 2); punkte(g, [[x - 4, y - 30], [x + 3, y - 18], [x - 2, y - 6], [x + 4, y + 6], [x - 3, y + 18], [x + 2, y + 30], [x - 5, y + 2]], T, 2); g.fillStyle = '#e8c890'; g.beginPath(); g.ellipse(x, y + 50, 16, 4, 0, 0, Math.PI * 2); g.fill(); },
    M21(g, x, y) { form(g, poly([x - 36, y - 22, x + 10, y - 32, x + 38, y - 4, x + 20, y + 30, x - 30, y + 24]), '#c9785a', 2); g.strokeStyle = 'rgba(22,24,29,.4)'; g.lineWidth = 1.2; for (let i = -20; i < 30; i += 12) { g.beginPath(); g.moveTo(x - 30, y + i); g.lineTo(x + 30, y + i); g.stroke(); } form(g, poly([x + 30, y + 34, x + 40, y + 30, x + 38, y + 40]), '#f6e6c2', 1.2); },
    M22(g, x, y) { linie(g, [x - 6, y - 52, x + 6, y - 34, x - 4, y - 16, x + 8, y + 2, x - 2, y + 22, x + 6, y + 40, x, y + 54], T, 2.6); linie(g, [x + 8, y + 2, x + 22, y + 8], T, 2); },
    M23(g, x, y) { form(g, rrect(x - 70, y - 10, 140, 18, 8), '#a8582a', 2.5); g.fillStyle = '#6a3a1a'; [[-40, 0], [-6, 2], [30, -2], [56, 2]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx, y + dy, 4, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#8a5a2a'; g.beginPath(); g.ellipse(x + 10, y + 18, 2.5, 4, 0, 0, Math.PI * 2); g.fill(); },
    M24(g, x, y) { g.strokeStyle = '#4a7a2a'; g.lineWidth = 3; for (let i = -50; i <= 50; i += 8) { g.beginPath(); g.moveTo(x + i, y + 40); g.quadraticCurveTo(x + i + 6, y, x + i - 4, y - 40 + Math.abs(i) * 0.3); g.stroke(); } [[-30, -30], [10, -36], [36, -20]].forEach(([dx, dy]) => form(g, kreis(x + dx, y + dy, 5), '#c8a03a', 1.5)); },
    M25(g, x, y) { for (let i = -48; i <= 48; i += 16) { const schief = (i === -16 ? 0.4 : i === 32 ? -0.3 : 0); g.save(); g.translate(x + i, y + 26); g.rotate(schief); form(g, rect(-4, -48, 8, 48), '#a08a6a', 1.8); g.restore(); } linie(g, [x - 56, y, x - 20, y + 4], T, 2); linie(g, [x + 4, y, x + 56, y - 4], T, 2); punkte(g, [[x - 40, y - 10], [x + 18, y - 4], [x + 46, y + 8]], '#5a3a1a', 2.5); },
    M26(g, x, y) { form(g, ellipse(x, y, 70, 28), '#8a6a4a', 2.2); punkte(g, [[x - 30, y - 6], [x + 10, y + 8], [x + 40, y - 4], [x - 10, y + 12]], '#6a4a2a', 3); linie(g, [x + 20, y, x + 22, y - 30], '#6a4a2a', 2.5); linie(g, [x + 22, y - 22, x + 30, y - 28], '#6a4a2a', 2); },
    M27(g, x, y) { form(g, rrect(x - 60, y - 26, 84, 40, 6), '#e8823a', 2.5); form(g, rrect(x + 22, y - 18, 32, 32, 5), '#e8823a', 2.5); form(g, rect(x + 28, y - 12, 18, 12), '#cfe9f7', 1.5); form(g, kreis(x - 40, y + 16, 9), '#2a2a2a', 2); form(g, kreis(x + 30, y + 16, 9), '#2a2a2a', 2); g.strokeStyle = T; g.lineWidth = 2; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x - 64, y - 6, i * 8, Math.PI * 0.75, Math.PI * 1.25); g.stroke(); } },
    M28(g, x, y) { linie(g, [x - 30, y + 70, x - 30, y - 70], T, 4); linie(g, [x - 30, y - 70, x + 50, y - 70], T, 3); linie(g, [x + 40, y - 70, x + 40, y - 30], T, 1.5); form(g, rect(x + 32, y - 30, 16, 12), '#9aa3ad', 1.5); for (let i = -70; i < 70; i += 14) linie(g, [x - 34, i + y, x - 26, i + y + 14], T, 1.5); form(g, rect(x - 10, y + 40, 70, 16), '#ffffff', 2); [0, 20, 40].forEach(d => form(g, poly([x - 6 + d, y + 40, x + 6 + d, y + 40, x + 2 + d, y + 56, x - 10 + d, y + 56]), '#e8453c', 0)); g.strokeStyle = T; g.lineWidth = 2; g.strokeRect(x - 10, y + 40, 70, 16); },
    M29(g, x, y) { g.strokeStyle = T; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 16, y + 100); g.lineTo(x, y - 100); g.lineTo(x + 16, y + 100); g.stroke(); g.lineWidth = 1.8; for (let k = 0; k < 7; k++) { const yy = y + 90 - k * 28; g.beginPath(); g.moveTo(x - 14 + k * 2, yy); g.lineTo(x + 14 - k * 2, yy - 26); g.stroke(); } g.lineWidth = 3; g.beginPath(); g.moveTo(x - 34, y - 70); g.lineTo(x + 34, y - 70); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-10, y - 40); g.quadraticCurveTo(x / 2, y - 30, x - 34, y - 70); g.moveTo(x + 34, y - 70); g.quadraticCurveTo((x + 400) / 2, y - 40, 410, y - 56); g.stroke(); },
    M30(g, x, y) { form(g, rect(x - 80, y - 30, 160, 92), '#9a7a5a', 2.5); g.save(); g.translate(x, y - 30); g.rotate(-0.05); form(g, poly([-90, 0, 0, -40, 90, 0]), '#6a5a4a', 2.5); g.restore(); for (let i = -70; i < 80; i += 14) linie(g, [x + i, y - 26, x + i + (i % 28 ? 2 : -3), y + 60], 'rgba(22,24,29,.45)', 1.5); form(g, rect(x - 30, y + 2, 26, 30), '#2a2a2a', 1.8); form(g, rect(x + 30, y - 14, 18, 14), '#2a2a2a', 1.8); },
    M31(g, x, y) { form(g, rrect(x - 40, y - 16, 70, 46, 10), '#6a7a4a', 2.5); form(g, kreis(x - 22, y + 34, 9), '#2a2a2a', 2); form(g, kreis(x + 14, y + 34, 9), '#2a2a2a', 2); g.strokeStyle = '#8a9a3a'; g.lineWidth = 2.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - 16 + i * 16, y - 22); g.bezierCurveTo(x - 26 + i * 16, y - 36, x - 6 + i * 16, y - 44, x - 16 + i * 16, y - 58); g.stroke(); } },
    M32(g, x, y) { form(g, poly([x - 90, y + 26, x - 76, y - 24, x + 76, y - 24, x + 90, y + 26]), '#a8aeb4', 2.5); g.strokeStyle = 'rgba(22,24,29,.4)'; g.lineWidth = 1.5; for (let i = -80; i < 90; i += 10) { g.beginPath(); g.moveTo(x + i * 0.85, y - 24); g.lineTo(x + i, y + 26); g.stroke(); } form(g, poly([x + 40, y - 4, x + 56, y + 22, x + 24, y + 22]), '#ffd84a', 2); g.fillStyle = T; g.font = '900 13px Figtree, sans-serif'; g.textAlign = 'center'; g.fillText('!', x + 40, y + 19); },
    M33(g, x, y) { form(g, rect(x - 40, y - 6, 56, 16), '#9aa3ad', 2.2); form(g, ellipse(x + 18, y + 2, 5, 10), '#5a5f68', 2); linie(g, [x + 26, y - 14, x + 44, y + 18], '#e8453c', 4); linie(g, [x + 44, y - 14, x + 26, y + 18], '#e8453c', 4); },
    M34(g, x, y) { form(g, g2 => { g2.moveTo(x - 90, y + 30); g2.quadraticCurveTo(x - 40, y - 10, x, y + 8); g2.quadraticCurveTo(x + 40, y + 24, x + 90, y - 6); g2.lineTo(x + 90, y + 36); g2.lineTo(x - 90, y + 36); g2.closePath(); }, '#6ab0e0', 2.2); form(g, ellipse(x - 30, y - 16, 30, 7), '#9ad0f0', 1.5); g.strokeStyle = '#ffffff'; g.lineWidth = 2; for (let i = -60; i < 80; i += 30) { g.beginPath(); g.moveTo(x + i, y + 20); g.quadraticCurveTo(x + i + 8, y + 14, x + i + 16, y + 20); g.stroke(); } },
    M35(g, x, y) { form(g, ellipse(x, y + 6, 46, 12), '#7ab8d8', 2); g.strokeStyle = '#3d7a4a'; g.lineWidth = 2.2; [[-36, 0], [-28, 4], [34, 0], [40, 6]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(x + dx, y + dy + 4); g.lineTo(x + dx + 2, y + dy - 18); g.stroke(); }); punkte(g, [[x - 34, y - 18], [x + 38, y - 16]], '#6a4a2a', 3); },
    P01(g, x, y) { form(g, rrect(x - 30, y - 40, 60, 46, 6), '#e8f6fb', 2.5); form(g, rrect(x - 36, y + 14, 72, 22, 9), '#ffffff', 2.5); form(g, rrect(x - 4, y, 8, 14, 2), '#c9ccd3', 1.8); funkeln(g, x - 18, y - 26, 1); funkeln(g, x + 20, y - 12, 0.8); funkeln(g, x + 26, y + 22, 0.7); },
    P02(g, x, y) { form(g, rect(x - 40, y - 52, 80, 104), 'rgba(191,227,245,.55)', 2.5); linie(g, [x - 40, y - 52, x - 40, y + 52], T, 3); form(g, rect(x + 20, y - 48, 14, 8), '#c9ccd3', 1.5); g.fillStyle = '#5ab0e0'; for (let i = 0; i < 6; i++) g.fillRect(x + 18 + i * 3, y - 34 + (i % 2) * 6, 1.8, 10); form(g, rect(x - 40, y + 46, 80, 6), '#c9ccd3', 1.5); funkeln(g, x - 22, y - 30, 0.8); },
    P03(g, x, y) { form(g, rect(x - 66, y - 40, 132, 82), '#ffffff', 2.5); form(g, rect(x - 70, y - 48, 140, 10), '#2a2a2a', 2.5); for (let i = -66; i < 66; i += 33) linie(g, [x + i, y - 38, x + i, y + 42], T, 2); g.fillStyle = 'rgba(31,47,79,.18)'; g.fillRect(x - 64, y - 36, 128, 30); funkeln(g, x - 40, y - 20, 1); funkeln(g, x + 30, y + 10, 0.9); },
    P04(g, x, y) { form(g, rect(x - 64, y - 22, 128, 40), '#ffffff', 2.5); form(g, rect(x - 68, y - 28, 136, 8), '#c9884a', 2.2); [[-40], [0], [40]].forEach(([d]) => { linie(g, [x + d, y + 18, x + d, y + 42], T, 2.2); form(g, ellipse(x + d, y + 16, 12, 4), '#e8453c', 1.8); }); form(g, kreis(x - 30, y - 34, 6), '#f2c14e', 1.5); form(g, rect(x + 16, y - 40, 10, 12), '#ffffff', 1.5); },
    P05(g, x, y) { form(g, rect(x - 70, y - 24, 140, 48), '#c9884a', 2); g.save(); g.beginPath(); g.rect(x - 70, y - 24, 140, 48); g.clip(); g.strokeStyle = 'rgba(80,40,10,.5)'; g.lineWidth = 1.5; for (let yy = y - 24; yy < y + 24; yy += 12) for (let xx = x - 80; xx < x + 80; xx += 24) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 12, yy + 12); g.lineTo(xx + 24, yy); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x, y, 50, 8, 0, 0, Math.PI * 2); g.fill(); g.restore(); },
    P06(g, x, y) { form(g, rect(0, y - 14, 400, 28), '#fffaf0', 2.5); g.strokeStyle = T; g.lineWidth = 1.5; for (let xx = 8; xx < 400; xx += 16) { g.beginPath(); g.arc(xx, y + 14, 5, Math.PI, 0); g.stroke(); } form(g, ellipse(x, y, 30, 9), '#fffaf0', 2); form(g, ellipse(x, y, 16, 4), '#f2e3c4', 1.5); },
    P07(g, x, y) { form(g, rrect(x - 32, y - 64, 64, 128, 8), '#3d8a7a', 2.5); g.strokeStyle = 'rgba(22,24,29,.5)'; g.lineWidth = 1.5; for (let yy = y - 48; yy < y + 64; yy += 16) { g.beginPath(); g.moveTo(x - 32, yy); g.lineTo(x + 32, yy); g.stroke(); } for (let xx = x - 16; xx < x + 32; xx += 16) { g.beginPath(); g.moveTo(xx, y - 64); g.lineTo(xx, y + 64); g.stroke(); } form(g, rect(x - 13, y + 10, 26, 20), T, 2); form(g, rect(x - 9, y + 16, 18, 10), '#ff8a2a', 0); form(g, rect(x - 40, y + 40, 80, 8), '#a0703a', 2); },
    P08(g, x, y) { form(g, rect(x - 52, y - 100, 104, 200), '#ffffff', 2.5); form(g, rect(x - 46, y - 94, 92, 190), '#bfe3f5', 2); linie(g, [x, y - 94, x, y + 96], T, 2.5); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(x - 40, y + 20); g.lineTo(x - 14, y - 80); g.lineTo(x - 6, y - 80); g.lineTo(x - 32, y + 20); g.fill(); form(g, poly([x - 46, y + 96, x + 46, y + 96, x + 30, y + 70, x - 30, y + 70]), 'rgba(255,240,170,.6)', 0); },
    P09(g, x, y) { form(g, rect(x - 34, y - 80, 68, 158), '#ffffff', 2.5); form(g, rect(x - 26, y - 72, 52, 142), '#ffe9a0', 2); form(g, kreis(x + 6, y - 46, 12), '#ffd84a', 2); linie(g, [x - 26, y + 20, x + 26, y + 20], T, 2); for (let xx = x - 22; xx < x + 26; xx += 8) linie(g, [xx, y + 20, xx, y + 68], T, 2); form(g, kreis(x - 12, y + 10, 6), '#e8453c', 1.5); form(g, kreis(x + 2, y + 6, 6), '#f2a7c8', 1.5); },
    P10(g, x, y) { form(g, rect(x - 50, y - 55, 100, 110), '#ffffff', 2.5); form(g, rect(x - 45, y - 50, 90, 100), '#bfe3f5', 2); form(g, rect(x - 45, y + 14, 90, 36), '#9fd07a', 1.5); [[-24, 4, 16], [6, -6, 20], [30, 8, 13]].forEach(([dx, dy, r]) => { form(g, rect(x + dx - 2, y + dy, 4, 20), '#8a5a3a', 1.2); form(g, kreis(x + dx, y + dy, r), '#5aa84a', 1.8); }); linie(g, [x, y - 50, x, y + 50], T, 2); },
    P11(g, x, y) { form(g, rect(x - 36, y - 76, 72, 152), '#4a3a2a', 2.5); for (let yy = y - 52; yy < y + 70; yy += 30) linie(g, [x - 32, yy, x + 32, yy], '#c9884a', 4); [[-20, -64, '#e8453c'], [4, -64, '#f2c14e'], [-14, -34, '#3d7a9a'], [10, -4, '#5aa84a'], [-18, 26, '#d8b070']].forEach(([dx, dy, f]) => form(g, rect(x + dx, y + dy, 18, 12), f, 1.5)); g.save(); g.translate(x + 36, y - 76); g.rotate(0.5); form(g, rect(0, 0, 10, 152), '#8a4a3a', 2); g.restore(); },
    P12(g, x, y) { form(g, rect(x - 60, y - 64, 120, 128), '#c9a27a', 2.5); [y - 22, y + 20].forEach(yy => linie(g, [x - 60, yy, x + 60, yy], T, 2.5)); [[-50, -56], [-14, -56], [22, -56], [-40, -14], [6, -14], [-30, 28], [14, 28]].forEach(([dx, dy]) => form(g, rect(x + dx, y + dy, 30, 30), '#e8d4a0', 1.8)); form(g, kreis(x + 44, y - 80, 14), '#ffffff', 2.2); linie(g, [x + 44, y - 80, x + 36, y - 86], '#2f9a4a', 2.5); },
    P13(g, x, y) { form(g, rrect(x - 38, y - 40, 76, 84, 8), '#f4f6f8', 2.5); form(g, kreis(x, y - 2, 26), '#d8dde2', 2.2); g.save(); g.translate(x, y - 2); g.rotate(performance.now() / 300); for (let i = 0; i < 3; i++) { g.rotate(Math.PI * 2 / 3); form(g, g2 => g2.ellipse(0, -12, 6, 12, 0, 0, Math.PI * 2), '#9aa3ad', 1.5); } g.restore(); form(g, rect(x + 20, y + 32, 12, 6), '#5aa84a', 1.5); },
    P14(g, x, y) { form(g, g2 => { g2.moveTo(x - 92, y + 40); g2.lineTo(x - 92, y + 6); g2.quadraticCurveTo(x, y - 70, x + 92, y + 6); g2.lineTo(x + 92, y + 40); g2.lineTo(x + 76, y + 40); g2.lineTo(x + 76, y + 10); g2.quadraticCurveTo(x, y - 50, x - 76, y + 10); g2.lineTo(x - 76, y + 40); g2.closePath(); }, '#c4785a', 2.5); g.strokeStyle = 'rgba(22,24,29,.4)'; g.lineWidth = 1.2; for (let a = 0.15; a < 1; a += 0.12) { const xx = x - 84 + 168 * a; g.beginPath(); g.moveTo(xx, y - 30 + Math.abs(a - 0.5) * 70); g.lineTo(xx + (a - 0.5) * 10, y - 16 + Math.abs(a - 0.5) * 70); g.stroke(); } },
    P15(g, x, y) { g.save(); g.translate(x, y); g.transform(1, 0, -0.25, 1, 0, 0); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) form(g, rect(-56 + c * 28, -30 + r * 30, 26, 28), '#28406a', 1.8); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (let c = 0; c < 4; c++) { g.beginPath(); g.moveTo(-56 + c * 28 + 13, -30); g.lineTo(-56 + c * 28 + 13, 28); g.stroke(); } g.restore(); funkeln(g, x + 30, y - 26, 0.8); },
    P16(g, x, y) { form(g, poly([x - 22, y - 20, x + 22, y - 20, x + 26, y + 20, x - 26, y + 20]), '#ffffff', 2.5); form(g, poly([x - 16, y - 14, x + 16, y - 14, x + 19, y + 14, x - 19, y + 14]), '#bfe3f5', 2); funkeln(g, x + 10, y - 6, 0.6); },
    P17(g, x, y) { form(g, poly([x - 54, y + 22, x - 44, y - 22, x + 44, y - 22, x + 54, y + 22]), '#e0603a', 2.2); g.strokeStyle = 'rgba(22,24,29,.35)'; g.lineWidth = 1.2; for (let yy = y - 12; yy < y + 22; yy += 10) { g.beginPath(); g.moveTo(x - 50, yy); g.lineTo(x + 50, yy); g.stroke(); } funkeln(g, x - 26, y - 6, 0.9); funkeln(g, x + 30, y + 6, 0.7); },
    P18(g, x, y) { form(g, poly([x - 40, y - 44, x + 40, y - 44, x + 40, y + 44, x - 40, y + 44]), '#f6e6c2', 2.2); form(g, rect(x - 10, y - 44, 22, 88), '#f2d24a', 1.8); g.strokeStyle = 'rgba(22,24,29,.35)'; g.lineWidth = 1; for (let yy = y - 36; yy < y + 44; yy += 10) { g.beginPath(); g.moveTo(x - 10, yy); g.lineTo(x + 12, yy + 5); g.stroke(); } form(g, rect(x + 12, y - 44, 28, 88), '#c9785a', 1.8); },
    P19(g, x, y) { form(g, rect(x - 40, y - 34, 80, 68), '#ffffff', 3); form(g, rect(x - 34, y - 28, 68, 56), '#bfe3f5', 2); linie(g, [x, y - 28, x, y + 28], T, 3); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(x - 30, y + 18); g.lineTo(x - 16, y - 24); g.lineTo(x - 10, y - 24); g.lineTo(x - 24, y + 18); g.fill(); form(g, kreis(x + 22, y + 16, 9), '#5aa84a', 1.8); g.fillStyle = '#fff'; g.font = 'bold 8px Figtree, sans-serif'; g.textAlign = 'center'; g.fillText('3x', x + 22, y + 19); },
    P20(g, x, y) { form(g, rect(x - 56, y + 4, 112, 36), '#c9a27a', 2.2); for (let xx = x - 56; xx < x + 56; xx += 18) linie(g, [xx, y + 4, xx, y + 40], 'rgba(22,24,29,.35)', 1.2); linie(g, [x + 30, y + 10, x + 30, y - 40], T, 2.5); form(g, g2 => { g2.moveTo(x - 6, y - 36); g2.quadraticCurveTo(x + 30, y - 64, x + 66, y - 36); g2.closePath(); }, '#e8453c', 2.2); form(g, poly([x - 40, y + 8, x - 4, y + 8, x - 14, y - 16, x - 46, y - 12]), '#3d7a9a', 2); form(g, kreis(x - 40, y - 36, 9), '#ffd84a', 1.8); },
    P21(g, x, y) { form(g, g2 => { g2.moveTo(x - 7, y + 56); g2.lineTo(x - 5, y + 6); g2.lineTo(x + 5, y + 6); g2.lineTo(x + 8, y + 56); g2.closePath(); }, '#8a5a3a', 2.2); form(g, kreis(x, y - 14, 30), '#5aa84a', 2.5); form(g, kreis(x - 22, y + 4, 18), '#5aa84a', 2.5); form(g, kreis(x + 22, y + 2, 18), '#5aa84a', 2.5); [[-10, -24], [12, -14], [-20, 4], [16, 6], [2, -34], [-4, -6]].forEach(([dx, dy]) => form(g, kreis(x + dx, y + dy, 4.5), '#e8453c', 1.5)); },
    P22(g, x, y) { linie(g, [x, y + 44, x, y - 10], '#9aa3ad', 4); form(g, rrect(x - 20, y - 44, 40, 40, 4), '#2a6ac0', 2.5); form(g, rect(x - 4, y - 32, 8, 22), '#ffffff', 0); form(g, rect(x - 12, y - 36, 24, 7), '#e8453c', 0); },
    P23(g, x, y) { form(g, rect(x - 50, y - 36, 100, 72), '#e8e8e8', 2.5); for (let yy = y - 26; yy < y + 36; yy += 10) linie(g, [x - 44, yy, x + 44, yy], 'rgba(22,24,29,.35)', 1.2); form(g, rrect(x + 56, y - 22, 18, 26, 4), '#2f9a4a', 2); form(g, poly([x + 63, y - 18, x + 68, y - 18, x + 64, y - 10, x + 69, y - 10, x + 61, y + 0, x + 64, y - 8, x + 60, y - 8]), '#ffd84a', 1); linie(g, [x + 65, y + 4, x + 70, y + 30, x + 50, y + 34], T, 2); },
    P24(g, x, y) { form(g, rrect(x - 16, y - 28, 32, 40, 3), '#c9ccd3', 2.5); form(g, poly([x - 4, y - 20, x + 4, y - 20, x, y - 12, x + 6, y - 12, x - 4, y, x - 1, y - 8, x - 6, y - 8]), '#ffd84a', 1.5); form(g, rect(x + 18, y + 2, 18, 8), '#3d7a9a', 2); form(g, rect(x + 34, y - 2, 6, 16), '#3d7a9a', 2); },
    P25(g, x, y) { linie(g, [x - 30, y + 46, x - 30, y - 10], T, 3); linie(g, [x + 30, y + 46, x + 30, y - 10], T, 3); form(g, rect(x - 38, y - 44, 76, 50), '#ffffff', 2.5); linie(g, [x - 30, y - 30, x + 30, y - 30], '#7a8aa0', 2); linie(g, [x - 30, y - 20, x + 10, y - 20], '#7a8aa0', 2); form(g, poly([x - 26, y - 4, x - 14, y - 16, x - 2, y - 4]), '#cfe9f7', 1.5); form(g, kreis(x + 20, y - 8, 11), '#2f9a4a', 2); linie(g, [x + 14, y - 8, x + 19, y - 3, x + 27, y - 13], '#ffffff', 2.5); },
  };

  // Plätze vergeben: Merkmale mit wenigen möglichen Plätzen zuerst; je Merkmal der erste Platz, dessen Rechteck sich nicht
  // (deutlich) mit einem schon vergebenen Merkmal desselben Raums überschneidet. Ergebnis: Mitte (x, y) und Größe (w, h).
  function plaetze(ids) {
    const fest = {};
    const anzahl = id => ((ORTE[id] || {}).p || [0]).length;
    ids.slice().sort((a, b) => anzahl(a) - anzahl(b)).forEach(id => {
      const o = ORTE[id] || { p: [[200, 150]], b: [64, 64] };
      const [w, h] = rahmenVon(o, bild('merkmale/' + id));
      const rechteck = p => ({ x: o.k ? 200 : p[0], y: o.u ? p[1] - h / 2 : p[1], w: o.k ? 400 : w, h });
      const stoesst = r => Object.values(fest).some(a => Math.abs(a.x - r.x) < (a.w + r.w) / 2 * 0.85 && Math.abs(a.y - r.y) < (a.h + r.h) / 2 * 0.85);
      const frei = o.p.map(rechteck).find(r => !stoesst(r));
      fest[id] = Object.assign(frei || rechteck(o.p[0]), { k: !!o.k });
    });
    return fest;
  }
  // Raum zeichnen (w × h = Größe in CSS-Pixeln) und Trefferflächen in Leinwand-Koordinaten zurückgeben
  function raum(g, w, h, typ, ids) {
    const s = Math.min(w / 400, h / 300), ox = (w - 400 * s) / 2, oy = (h - 300 * s) / 2;
    const lage = plaetze(ids);
    g.save(); g.translate(ox, oy); g.scale(s, s);
    g.beginPath(); g.rect(0, 0, 400, 300); g.clip();
    const hg = bild('raeume/' + typ);
    if (hg) g.drawImage(hg, 0, 0, 400, 300); else (RAUM[typ] || RAUM.wohnzimmer)(g);
    if (hg) ids.forEach(id => {   // Flicken (d) nur mit gestaltetem Raum- und Merkmalbild
      const d = (ORTE[id] || {}).d, f = hg.naturalWidth / 400;
      if (d && bild('merkmale/' + id)) d.forEach(([x, y, w, h, dx, dy]) => g.drawImage(hg, (x + dx) * f, (y + dy) * f, w * f, h * f, x, y, w, h));
    });
    ids.forEach(id => {
      const L = lage[id], b = bild('merkmale/' + id);
      if (L.k && b) {   // Stuckleiste: Band über die ganze Breite (Kachel bilder/merkmale/<ID>-leiste)
        const t = bild('merkmale/' + id + '-leiste') || b, tw = t.naturalWidth * L.h / t.naturalHeight;
        for (let x = 0; x < 400; x += tw) g.drawImage(t, x, L.y - L.h / 2, tw, L.h);
      } else if (b) g.drawImage(b, L.x - L.w / 2, L.y - L.h / 2, L.w, L.h);
      else if (MOTIV[id]) MOTIV[id](g, L.x, L.y);
    });
    g.restore();
    return { flaechen: ids.map(id => { const L = lage[id];
      return { id, x: ox + L.x * s, y: oy + L.y * s, w: L.w * s, h: L.h * s, r: Math.max(20, Math.max(L.w, L.h) * s / 2) }; }), s, ox, oy };
  }
  // Treffer im gezeichneten Rechteck (mit Faktor k der Schwierigkeit verkleinert, mindestens 36 × 36 px). Ergebnis:
  // Abstand relativ zur Größe (0 = Mitte, unter 1 = getroffen)
  function trifft(f, x, y, k) {
    const hw = Math.max(18, f.w / 2 * (k || 1)), hh = Math.max(18, f.h / 2 * (k || 1));
    return Math.max(Math.abs(x - f.x) / hw, Math.abs(y - f.y) / hh);
  }

  // Markierung eines Merkmals (gefunden oder verpasst) mit Beschriftung
  function markierung(g, f, merkmal, art, alter, belegt, B, H) {
    const plus = merkmal.wert > 0, farbe = plus ? '#2f9a4a' : '#e8453c';
    const a = Math.min(1, alter * 5), r = f.r * (art === 'gefunden' ? (1 + 0.25 * Math.max(0, 1 - alter * 4)) : 1);
    g.save(); g.globalAlpha = a;
    g.lineWidth = 3.5; g.strokeStyle = farbe;
    if (art === 'verpasst') g.setLineDash([6, 5]);
    let ry = r;
    if (f.w) {   // gestaltetes Bild: Rahmen um das Bild (Puls beim Finden)
      const z = r / f.r, rw = f.w / 2 * z + 4, rh = f.h / 2 * z + 4;
      ry = rh;
      g.beginPath(); rrect(f.x - rw, f.y - rh, rw * 2, rh * 2, 10)(g); g.stroke();
    } else { g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.stroke(); }
    g.setLineDash([]);
    const text = merkmal.name + (plus ? ' +' : ' −');
    g.font = '800 ' + (B < 300 ? 11.5 : 13) + 'px Figtree, sans-serif';
    const tw = Math.min(B - 8, g.measureText(text).width + 14), bx0 = Math.max(4, Math.min(B - tw - 4, f.x - tw / 2));
    const versuche = [[bx0, f.y - ry - 26], [bx0, f.y + ry + 4], [Math.max(4, Math.min(B - tw - 4, f.x + r * 0.4)), f.y - 11], [Math.max(4, Math.min(B - tw - 4, f.x - r * 0.4 - tw)), f.y - 11]];
    const frei = ([x, y]) => y >= 2 && y + 22 <= H - 2 && !(belegt || []).some(b => x < b[0] + b[2] && x + tw > b[0] && y < b[1] + 22 && y + 22 > b[1]);
    const [bx, by] = versuche.find(frei) || versuche.find(([, y]) => y >= 2 && y + 22 <= H - 2) || versuche[0];
    if (belegt) belegt.push([bx, by, tw]);
    form(g, rrect(bx, by, tw, 22, 6), art === 'verpasst' ? '#ffffff' : farbe, 2);
    g.fillStyle = art === 'verpasst' ? farbe : '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(text, bx + 7, by + 11.5, tw - 12);
    g.restore();
  }

  // ---------- Kleine Bilder je Art (SVG, viewBox 0 0 60 40; Bild bilder/haeuser/<art> geht vor) ----------
  const himmelSvg = '<rect width="60" height="40" fill="#bfe3f5"/><path d="M0 32h60v8H0z" fill="#9fd07a"/>';
  function hausSvg(art, farbe) {
    const b = D_().bild('haeuser/' + art);
    if (b) return `<img src="${b}" alt="" draggable="false">`;
    const k = farbe || (window.HNB ? window.HNB.farben.haupt : '#1F2F4F');
    const s = 'stroke="#16181d" stroke-width="2" stroke-linejoin="round"';
    const tuer = (x, y, h) => `<rect x="${x}" y="${y}" width="6" height="${h}" fill="${k}"/>`;
    const fen = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w || 5}" height="${h || 5}" fill="#cfe9f7"/>`;
    let innen;
    switch (art) {
      case 'stadtwohnung': innen = `<rect x="14" y="5" width="32" height="29" fill="#f4b8a8"/><path d="M12 5h36" fill="none"/>` + [9, 16, 23].map(y => fen(18, y) + fen(27.5, y) + fen(37, y)).join('') + `<path d="M35 22h8v3h-8z" fill="#fff"/>` + tuer(27, 28, 6); break;
      case 'dachwohnung': innen = `<path d="M10 34V20L30 6l20 14v14z" fill="#f6e6c2"/><path d="M6 21 30 3l24 18" fill="#c4523a"/><path d="M25 12h10v7H25z" fill="#cfe9f7" stroke="${k}"/>` + fen(15, 24) + fen(40, 24) + tuer(27, 27, 7); break;
      case 'reihenhaus': innen = [6, 22, 38].map((x, i) => `<path d="M${x} 18l8-8 8 8v16H${x}z" fill="${['#f6e6c2', '#cdb8f0', '#bfe6a8'][i]}"/>` + fen(x + 3, 20, 4, 4)).join('') + tuer(27, 27, 7); break;
      case 'efh': innen = `<path d="M14 18 30 6 46 18v16H14z" fill="#f6e6c2"/><path d="M10 19 30 3 50 19" fill="none"/>` + fen(18, 21, 7, 6) + tuer(33, 24, 10); break;
      case 'altbau': innen = `<path d="M16 4h28v30H16z" fill="#cdb8f0"/><path d="M14 4l3-3h26l3 3z" fill="#8a4a3a"/><path d="M36 10h9v12h-9z" fill="#e6dcf2"/>` + [8, 16, 24].map(y => fen(20, y) + fen(28, y)).join('') + tuer(27, 28, 6); break;
      case 'neubau': innen = `<path d="M10 12h40v22H10z" fill="#ffffff"/><path d="M8 12 52 8v4H8z" fill="#3a3f48"/><path d="M14 16h14v10H14z" fill="#cfe9f7"/><path d="M32 16h14v6H32z" fill="#cfe9f7"/>` + tuer(36, 25, 9); break;
      case 'bauernhof': innen = `<path d="M6 20 20 9l14 11v14H6z" fill="#ffffff"/><path d="M34 16h20v18H34z" fill="#c9884a"/><path d="M32 16l12-8 12 8" fill="#8a4a3a"/>` + fen(10, 22) + tuer(19, 26, 8) + `<path d="M40 22h8v12h-8z" fill="#8a5a3a"/>`; break;
      default: innen = `<path d="M4 32h52" fill="none"/><path d="M22 22h3v12h-3z" fill="#ffffff"/><rect x="14" y="14" width="20" height="10" fill="${k}"/><path d="M42 30q4-10 8 0z" fill="#5aa84a"/>`;
    }
    return `<svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g ${s}>${himmelSvg}${innen}</g></svg>`;
  }

  // ---------- Hinweise ----------
  function grundrissSvg(o) {
    const n = Math.max(2, Math.min(8, o.zimmer || 3)), r = rnd(o.flaeche || 99);
    const teile = [];
    let felder = [[4, 4, 112, 72]];
    if (o.art !== 'bauplatz') while (felder.length < n + 1) {
      felder.sort((a, b) => b[2] * b[3] - a[2] * a[3]);
      const [x, y, w, h] = felder.shift(), q = 0.38 + r() * 0.24;
      if (w > h) felder.push([x, y, w * q, h], [x + w * q, y, w * (1 - q), h]);
      else felder.push([x, y, w, h * q], [x, y + h * q, w, h * (1 - q)]);
    }
    felder.forEach(([x, y, w, h]) => teile.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`));
    const wert = o.art === 'bauplatz' ? o.grundstueck : o.flaeche;
    return `<svg viewBox="0 0 120 80" aria-hidden="true"><rect x="4" y="4" width="112" height="72" fill="${o.art === 'bauplatz' ? '#dff0c8' : '#fffaf0'}"/><g fill="none" stroke="#16181d" stroke-width="1.6">${teile.join('')}</g>` +
      `<rect x="4" y="4" width="112" height="72" fill="none" stroke="#16181d" stroke-width="3"/><text x="60" y="44" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="900" font-size="15" fill="#1F2F4F" stroke="#fffaf0" stroke-width="4" paint-order="stroke">${B_().zahl(wert)} m²</text></svg>`;
  }
  function energieSvg(klasse) {
    const K = D_().energieKlassen, farben = ['#1a9a4a', '#3db24a', '#8cc63f', '#d7df23', '#fff200', '#fdb913', '#f7941d', '#ef4136', '#be1e2d'];
    const i = Math.max(0, K.indexOf(klasse)), w = 112 / K.length;
    return `<svg viewBox="0 0 120 50" aria-hidden="true">` + K.map((k, j) => `<rect x="${4 + j * w}" y="18" width="${w}" height="16" fill="${farben[j]}" stroke="#16181d" stroke-width="1"/><text x="${4 + j * w + w / 2}" y="30" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="800" font-size="${k.length > 1 ? 7 : 9}" fill="#16181d">${k}</text>`).join('') +
      `<path d="M${4 + i * w + w / 2 - 7} 2h14v8l-7 7-7-7z" fill="#16181d"/><rect x="3" y="17" width="114" height="18" fill="none" stroke="#16181d" stroke-width="2"/></svg>`;
  }
  function stadtplanSvg(viertelId) {
    const V = D_().viertel;
    const blasen = V.map(v => { const [x, y] = v.karte; return `<ellipse cx="${x * 140}" cy="${y * 90}" rx="26" ry="17" fill="${v.farbe}" stroke="#16181d" stroke-width="1.5"/>`; }).join('');
    const namen = V.map(v => { const [x, y] = v.karte; return `<text x="${x * 140}" y="${y * 90 + 3}" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="700" font-size="7" fill="#16181d">${v.name}</text>`; }).join('');
    const z = (V.find(v => v.id === viertelId) || V[0]).karte, px = z[0] * 140 + 8, py = z[1] * 90 - 8;
    return `<svg viewBox="0 0 140 90" aria-hidden="true"><rect width="140" height="90" fill="#eef3e4"/>` +
      `<path d="M-5 70 Q40 58 70 72 T145 60" fill="none" stroke="#7ab8d8" stroke-width="5"/>` +
      `<path d="M0 82 L140 50" stroke="#16181d" stroke-width="1.5" stroke-dasharray="4 3"/>` +
      blasen + namen +
      `<path d="M${px} ${py + 12}c-5-6-7-9-7-12a7 7 0 0 1 14 0c0 3-2 6-7 12z" fill="#e8453c" stroke="#16181d" stroke-width="1.6"/><circle cx="${px}" cy="${py}" r="2.4" fill="#fff"/>` +
      `<rect x="1" y="1" width="138" height="88" fill="none" stroke="#16181d" stroke-width="2"/></svg>`;
  }

  window.HN_SZENE = { strasse, raum, trifft, markierung, hausSvg, grundrissSvg, energieSvg, stadtplanSvg, form, rrect, jahreszeit, ORTE, RAEUME: Object.keys(RAUM) };
})();
