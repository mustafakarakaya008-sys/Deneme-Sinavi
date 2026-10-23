// Gözetmen kuralları için otomatik testler. Çalıştırma: tests/calistir.sh
load('src/gozetmen.js');
var veri = JSON.parse(readFile('veriler/hazir_veri.json'));
var G = Gozetmen;

var gecen = 0, kalan = 0;
function test(adi, fn) {
  try {
    var hata = fn();
    if (hata && hata.length) { kalan++; print('KALDI  ' + adi); hata.slice(0, 5).forEach(function (h) { print('         - ' + h); }); }
    else { gecen++; print('geçti  ' + adi); }
  } catch (e) { kalan++; print('HATA   ' + adi + ': ' + e); }
}

var ogrBul = {};
veri.ogretmenler.forEach(function (t) { ogrBul[t.name.trim()] = t; });
var programBul = {};
veri.program.forEach(function (r) { programBul[r.cls + '|' + r.day] = r; });
function dersVar(sube, gunAdi, h, ad) {
  var r = programBul[sube + '|' + gunAdi];
  return !!r && (r.t1[h - 1].trim() === ad || r.t2[h - 1].trim() === ad);
}
function anaSaatler(sonuc, o, g) {
  var l = [];
  for (var h = 1; h <= 16; h++) if (sonuc.ana[o][g][h]) l.push(h);
  return l;
}
function herAtama(sonuc, fn) {
  sonuc.salonlar.forEach(function (s) {
    s.oturum.forEach(function (a, o) { if (a) fn(s, o, a); });
  });
}

// ---- Macar yöntemi: küçük matrislerde bütün olasılıklarla aynı en iyi toplamı bulmalı
test('Macar yöntemi en iyi atamayı bulur (300 rastgele matris)', function () {
  var tohum = 7, hatalar = [];
  function rnd() { tohum = (tohum * 16807) % 2147483647; return tohum / 2147483647; }
  for (var k = 0; k < 300; k++) {
    var n = 1 + Math.floor(rnd() * 5), m = n + Math.floor(rnd() * 3);
    var a = [null];
    for (var i = 1; i <= n; i++) { var s = [0]; for (var j = 1; j <= m; j++) s.push(Math.floor(rnd() * 20)); a.push(s); }
    var ans = G.macar(a, n, m), top = 0, kul = {};
    for (i = 1; i <= n; i++) { if (kul[ans[i]]) hatalar.push('aynı sütun iki kez'); kul[ans[i]] = 1; top += a[i][ans[i]]; }
    var enIyi = Infinity;
    (function ara(i, kullanilan, t) {
      if (i > n) { enIyi = Math.min(enIyi, t); return; }
      for (var j = 1; j <= m; j++) if (!kullanilan[j]) { kullanilan[j] = 1; ara(i + 1, kullanilan, t + a[i][j]); kullanilan[j] = 0; }
    })(1, {}, 0);
    if (top !== enIyi) hatalar.push('matris ' + k + ': ' + top + ' yerine ' + enIyi);
  }
  return hatalar;
});

// ---- Sınav akışı ve ana saatler
test('Ana saatler: sabah 3-4 / 6-7, öğle 11-12 / 14-15; öğle kayması 5 sa 50 dk', function () {
  var zm = G.zamanlama(veri), h = [];
  var bek = { '0-1': '3,4', '0-2': '11,12', '1-1': '6,7', '1-2': '14,15' };
  Object.keys(bek).forEach(function (k) {
    var p = k.split('-'), l = [];
    for (var s = 1; s <= 16; s++) if (zm.ana[+p[0]][+p[1]][s]) l.push(s);
    if (l.join(',') !== bek[k]) h.push(k + ': ' + l.join(','));
  });
  if (zm.kayma !== 350) h.push('kayma ' + zm.kayma);
  return h;
});

// Öğretmen adları KVKK gereği koda yazılmaz; görev verilmeyenler yerel verideki "E" işaretinden okunur
test('Verideki "Görev verilmesin = E" işaretli 6 kişi (Hazırlayan dahil) hiçbir gün görev almaz', function () {
  var h = [], muaf = veri.ogretmenler.filter(function (t) { return t.exempt === 'E'; });
  if (muaf.length !== 6) h.push('E işaretli ' + muaf.length + ' kişi var, 6 bekleniyordu');
  if (!muaf.some(function (t) { return t.name.trim() === G.HAZIRLAYAN; })) h.push('Hazırlayan E işaretli değil');
  for (var gun = 1; gun <= 5; gun++) {
    herAtama(G.dagit(veri, { gunNo: gun }), function (s, o, a) {
      if (muaf.some(function (t) { return t.name.trim() === a.ogretmen; })) h.push(G.GUNLER[gun - 1] + ' ' + s.salon + ': muaf kişi görev almış');
    });
  }
  return h;
});

// ---- 5 iş gününün her biri için kurallar
for (var gun = 1; gun <= 5; gun++) (function (gun) {
  var sonuc = G.dagit(veri, { gunNo: gun });
  var gunAdi = G.GUNLER[gun - 1];
  var on = gunAdi + ': ';

  test(on + 'salon sayısı = sınava giren şube sayısı (33 sabahçı + 13 öğlenci)', function () {
    var s1 = sonuc.salonlar.filter(function (s) { return s.grup === 1; }).length;
    var s2 = sonuc.salonlar.filter(function (s) { return s.grup === 2; }).length;
    return s1 === 33 && s2 === 13 ? [] : ['sabahçı ' + s1 + ', öğlenci ' + s2];
  });

  test(on + 'çift görev yok (aynı oturumda bir öğretmen tek salonda)', function () {
    var h = [];
    [0, 1].forEach(function (o) {
      [1, 2].forEach(function (g) {
        var gor = {};
        sonuc.salonlar.forEach(function (s) {
          var a = s.oturum[o];
          if (s.grup !== g || !a) return;
          if (gor[a.ogretmen]) h.push((o + 1) + '. oturum: ' + gor[a.ogretmen] + ' ve ' + s.salon);
          gor[a.ogretmen] = s.salon;
        });
      });
    });
    return h;
  });

  test(on + 'yasaklı kişi yok (Hazırlayan ve "Görev verilmesin = E")', function () {
    var h = [];
    herAtama(sonuc, function (s, o, a) {
      if (a.ogretmen === G.HAZIRLAYAN || ogrBul[a.ogretmen].exempt === 'E') h.push(s.salon + ' ' + (o + 1) + '. oturum');
    });
    return h;
  });

  test(on + '"(N)" yalnız o günün o vardiyadaki nöbetçisinde', function () {
    var h = [];
    herAtama(sonuc, function (s, o, a) {
      if (a.yazi.indexOf('(N)') < 0) return;
      var t = ogrBul[a.ogretmen];
      var vardiyaUygun = s.grup === 1 ? t.shift !== 'Öğle' : t.shift !== 'Sabah';
      if (t.day !== gunAdi || !vardiyaUygun) h.push(s.salon + ' ' + (o + 1) + '. oturum: nöbet günü/vardiyası tutmuyor');
    });
    return h;
  });

  test(on + 'dersine girmediği salona yalnız nöbetçi "(N)" ile gider', function () {
    var h = [];
    herAtama(sonuc, function (s, o, a) {
      var ders = anaSaatler(sonuc, o, s.grup).some(function (x) { return dersVar(s.salon, gunAdi, x, a.ogretmen); });
      if (!ders && a.yazi.indexOf('(N)') < 0) h.push(s.salon + ' ' + (o + 1) + '. oturum: dersi yok, (N) da yok');
      if (ders && a.yazi.indexOf('(N)') >= 0) h.push(s.salon + ' ' + (o + 1) + '. oturum: kendi dersi var ama (N) yazılmış');
    });
    return h;
  });

  test(on + 'boş saate denk gelen her öğretmenin notu var', function () {
    var h = [];
    herAtama(sonuc, function (s, o, a) {
      var t = sonuc.ogretmenler.filter(function (x) { return x.ad === a.ogretmen; })[0];
      if (t.nobetci[s.grup]) return;
      var taban = s.grup === 2 ? 9 : 1;
      anaSaatler(sonuc, o, s.grup).forEach(function (x) {
        if (t.lb[x] === 0 && a.not.indexOf((x - taban + 1) + '. ders') < 0) h.push(s.salon + ' ' + (o + 1) + '. oturum: ' + (x - taban + 1) + '. ders notu eksik');
      });
    });
    return h;
  });

  test(on + 'kendi dersi olan öğretmen boştayken salona nöbetçi yedek yazılmamış', function () {
    var h = [];
    [0, 1].forEach(function (o) {
      [1, 2].forEach(function (g) {
        var atanan = {};
        sonuc.salonlar.forEach(function (s) { if (s.grup === g && s.oturum[o]) atanan[s.oturum[o].ogretmen] = 1; });
        var ana = anaSaatler(sonuc, o, g);
        sonuc.salonlar.forEach(function (s) {
          var a = s.oturum[o];
          if (s.grup !== g || !a || !a.nobetciYedek) return;
          sonuc.ogretmenler.forEach(function (t) {
            if (atanan[t.ad] || t.gorevYok) return;
            var tamDers = ana.every(function (x) { return dersVar(s.salon, gunAdi, x, t.ad); });
            if (tamDers) h.push(s.salon + ' ' + (o + 1) + '. oturum: dersin öğretmeni boşta, nöbetçi yazılmış');
          });
        });
      });
    });
    return h;
  });

  test(on + 'bir oturum hiçbir salonda iki kişiye bölünmemiş, boş salon yok', function () {
    var h = [];
    sonuc.salonlar.forEach(function (s) {
      if (s.oturum.length !== 2) h.push(s.salon + ' oturum sayısı ' + s.oturum.length);
      s.oturum.forEach(function (a, o) { if (!a) h.push(s.salon + ' ' + (o + 1) + '. oturum boş'); });
    });
    return h;
  });
})(gun);

// ---- Hafta sonu
test('Hafta sonu seçilince hesap çökmez, hiçbir salona gözetmen yazılmaz', function () {
  var h = [];
  [{ gunNo: 0 }, { tarih: '24.10.2026' }, { tarih: new Date(2026, 9, 25) }].forEach(function (ayar) {
    var s = G.dagit(veri, ayar);
    if (s.gun !== 0) h.push(JSON.stringify(ayar) + ': gün ' + s.gun);
    herAtama(s, function (sl) { h.push(JSON.stringify(ayar) + ': ' + sl.salon + ' salonuna gözetmen yazılmış'); });
    if (s.salonlar.length !== 46) h.push(JSON.stringify(ayar) + ': salon sayısı ' + s.salonlar.length);
  });
  return h;
});

// ---- Raporlu öğretmen senaryosu
test('Raporlu seçilen öğretmen hiçbir güne yazılmaz; yerine başka dersin öğretmeni ya da "(N)" gelir', function () {
  var h = [];
  for (var gun = 1; gun <= 5; gun++) {
    var once = G.dagit(veri, { gunNo: gun });
    var hedef = once.salonlar[0].oturum[0];
    var sonra = G.dagit(veri, { gunNo: gun, raporlu: [hedef.ogretmen] });
    herAtama(sonra, function (s, o, a) {
      if (a.ogretmen === hedef.ogretmen) h.push(G.GUNLER[gun - 1] + ': raporlu öğretmen ' + s.salon + ' salonunda');
    });
    if (!sonra.salonlar[0].oturum[0]) h.push(G.GUNLER[gun - 1] + ': salon boş kaldı');
  }
  return h;
});

// ---- Sınava girmeyen şube senaryosu
test('Sınava girmeyen şubede o saatte dersi olan öğretmene görev verilmez', function () {
  var h = [];
  var giren = veri.subeler.filter(function (s) { return s !== '5/A' && s !== '6/A'; });
  for (var gun = 1; gun <= 5; gun++) {
    var gunAdi = G.GUNLER[gun - 1];
    var sonuc = G.dagit(veri, { gunNo: gun, sinavaGiren: giren });
    if (sonuc.salonlar.length !== 44) h.push(gunAdi + ': salon sayısı ' + sonuc.salonlar.length);
    var tum = G.zamanlama(veri).tum;
    herAtama(sonuc, function (s, o, a) {
      for (var x = 1; x <= 16; x++) {
        if (!tum[o][s.grup][x]) continue;
        if (dersVar('5/A', gunAdi, x, a.ogretmen) || dersVar('6/A', gunAdi, x, a.ogretmen)) h.push(gunAdi + ' ' + s.salon + ': ' + x + '. derste sınava girmeyen şubede dersi var');
      }
    });
  }
  return h;
});

print('');
print(gecen + ' test geçti, ' + kalan + ' test kaldı.');
