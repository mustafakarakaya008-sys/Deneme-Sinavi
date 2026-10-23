// Öğrenci dağıtımı ve oturma düzeni için otomatik testler. Çalıştırma: tests/calistir.sh
load('src/ogrenci.js');
var veri = JSON.parse(readFile('veriler/hazir_veri.json'));
var zincir = JSON.parse(readFile('veriler/oturma_zinciri.json'));
var O = Ogrenci;

var gecen = 0, kalan = 0;
function test(adi, fn) {
  try {
    var hata = fn();
    if (hata && hata.length) { kalan++; print('KALDI  ' + adi); hata.slice(0, 5).forEach(function (h) { print('         - ' + h); }); }
    else { gecen++; print('geçti  ' + adi); }
  } catch (e) { kalan++; print('HATA   ' + adi + ': ' + e); }
}
function dagit(tohum, giren) {
  return O.dagit(veri.ogrenci_listesi_ham, veri.subeler, { tohum: tohum, zincir: zincir, sinavaGiren: giren });
}
// Bir salondaki her komşu çifti (sağdaki ve arkadaki) için fn(öğrenci, komşu, yön)
function komsuCiftleri(salon, fn) {
  salon.ogrenciler.forEach(function (o) {
    var k = O.komsular(o.koltuk);
    if (k.sag && salon.koltuk[k.sag]) fn(o, salon.koltuk[k.sag], 'yan');
    if (k.arka && salon.koltuk[k.arka]) fn(o, salon.koltuk[k.arka], 'arka');
  });
}

// ---- Geometri ve e-Okul listesi
test('Koltuk geometrisi: 1 numaranın sağı 2, arkası 3; 2 numaranın sağı 11 (öbür dik sıra)', function () {
  var h = [], a = O.komsular(1), b = O.komsular(2), c = O.komsular(40), d = O.komsular(41);
  if (a.sag !== 2 || a.arka !== 3) h.push('1: ' + JSON.stringify(a));
  if (b.sag !== 11 || b.arka !== 4) h.push('2: ' + JSON.stringify(b));
  if (c.sag !== 0 || c.arka !== 0) h.push('40: ' + JSON.stringify(c));
  if (d.sag !== 0 || d.arka !== 0) h.push('41 (ek sıra): ' + JSON.stringify(d));
  return h;
});

test('Oturma zinciri 1-40 arası her koltuğu bir kez içerir', function () {
  var z = zincir['452'].Z.slice().sort(function (a, b) { return a - b; });
  for (var i = 0; i < 40; i++) if (z[i] !== i + 1) return ['zincir eksik ya da tekrarlı'];
  return [];
});

test('e-Okul listesi: 46 şube bloğu bulunur, 1865 öğrenci okunur, her şube 1-42 kişi', function () {
  var r = dagit(2026), h = [];
  if (r.blokSayisi !== 46) h.push('blok ' + r.blokSayisi);
  if (r.okunanSatir !== 1865 || r.ogrenciler.length !== 1865) h.push('okunan ' + r.okunanSatir + ', yerleşen ' + r.ogrenciler.length);
  var say = {};
  r.ogrenciler.forEach(function (o) { say[o.sinif] = (say[o.sinif] || 0) + 1; });
  veri.subeler.forEach(function (s) { if (!(say[s] >= 1 && say[s] <= 42)) h.push(s + ': ' + say[s]); });
  return h;
});

test('Şube listesindeki sıra no e-Okul sırasıdır (1, 2, 3 ...)', function () {
  var r = dagit(2026), h = [], son = {};
  r.ogrenciler.slice().sort(function (a, b) { return a.sira - b.sira; }).forEach(function (o) {
    if (o.sinifNo !== (son[o.sinif] || 0) + 1) h.push(o.sinif + ' satır ' + o.sira);
    son[o.sinif] = o.sinifNo;
  });
  return h;
});

test('Aynı karıştırma anahtarı her seferinde aynı düzeni verir', function () {
  var a = dagit(2026), b = dagit(2026);
  return JSON.stringify(a.ogrenciler) === JSON.stringify(b.ogrenciler) ? [] : ['iki çalıştırma farklı'];
});

test('Karıştırma anahtarı değişince öğrencilerin yeri değişir', function () {
  var a = dagit(2026), b = dagit(2027), ayni = 0;
  a.ogrenciler.forEach(function (o, i) { if (o.salon === b.ogrenciler[i].salon && o.koltuk === b.ogrenciler[i].koltuk) ayni++; });
  return ayni < 200 ? [] : [ayni + ' öğrenci aynı yerde kaldı'];
});

// ---- Her karıştırma anahtarında geçmesi gereken kurallar
var TOHUMLAR = [2026, 0, 1, 7, 12345, 999999];
for (var k = 0; k < 14; k++) TOHUMLAR.push((k * 73129 + 17) % 1000000);

function kurallar(adi, r, beklenen) {
  test(adi + ': salon sayısı = sınava giren şube sayısı, salonlar şube adlarıyla', function () {
    var h = [];
    if (r.salonSayisi.sabahci !== beklenen.sab || r.salonSayisi.oglenci !== beklenen.ogl) h.push(JSON.stringify(r.salonSayisi));
    r.salonlar.forEach(function (s) { if (beklenen.subeler.indexOf(s.ad) < 0) h.push('salon adı ' + s.ad); });
    return h;
  });
  test(adi + ': her öğrenci tek koltukta, koltuklar 1-42, kimse açıkta değil', function () {
    var h = [], gor = {};
    r.ogrenciler.forEach(function (o) {
      if (!(o.koltuk >= 1 && o.koltuk <= 42)) h.push('satır ' + o.sira + ' koltuk ' + o.koltuk);
      var key = o.salon + '-' + o.koltuk;
      if (gor[key]) h.push('çift oturan ' + key);
      gor[key] = 1;
    });
    return h;
  });
  test(adi + ': salon 40 kişilik; 41-42. öğrenci "Ek sıra"da', function () {
    var h = [];
    r.salonlar.forEach(function (s) {
      var n = s.ogrenciler.length, ek = s.ogrenciler.filter(function (o) { return o.koltuk > 40; }).length;
      if (n > 42) h.push(s.ad + ': ' + n + ' kişi');
      if (ek !== Math.max(0, n - 40)) h.push(s.ad + ': ' + n + ' kişi, ek sırada ' + ek);
      s.ogrenciler.forEach(function (o) { if (o.koltuk > 40 && o.yer.indexOf('Ek sıra') !== 0) h.push(s.ad + ' yer tarifi ' + o.yer); });
    });
    return h;
  });
  test(adi + ': sabahçı ve öğlenci karışmaz (sabah: 5, 7, 8; öğle: 6)', function () {
    var h = [];
    r.salonlar.forEach(function (s) {
      s.ogrenciler.forEach(function (o) { if ((o.seviye === 6) !== (s.grup === 2)) h.push(s.ad + ' salonunda ' + o.sinif); });
    });
    return h;
  });
  test(adi + ': her şube kendi grubundaki salonlara eşit dağılır (fark en çok 1)', function () {
    var h = [], say = {};
    r.ogrenciler.forEach(function (o) { say[o.sinif] = say[o.sinif] || {}; say[o.sinif][o.salon] = (say[o.sinif][o.salon] || 0) + 1; });
    Object.keys(say).forEach(function (c) {
      var g = r.ogrenciler.filter(function (o) { return o.sinif === c; })[0].grup;
      var adet = r.salonlar.filter(function (s) { return s.grup === g; }).map(function (s) { return say[c][s.no] || 0; });
      if (Math.max.apply(null, adet) - Math.min.apply(null, adet) > 1) h.push(c + ': ' + adet.join(','));
    });
    return h;
  });
  test(adi + ': aynı şubeden yan yana ya da önlü-arkalı oturan yok', function () {
    var h = [];
    r.salonlar.forEach(function (s) { komsuCiftleri(s, function (a, b, yon) { if (a.sinif === b.sinif) h.push(s.ad + ': ' + a.koltuk + ' ve ' + b.koltuk + ' (' + yon + ')'); }); });
    return h;
  });
  test(adi + ': aynı şubeden iki öğrenci aynı dik sırada (sütunda) oturmaz', function () {
    var h = [];
    r.salonlar.forEach(function (s) {
      var gor = {};
      s.ogrenciler.forEach(function (o) {
        if (o.koltuk > 40) return;
        var key = o.sinif + '-' + o.sutun;
        if (gor[key]) h.push(s.ad + ': ' + o.sinif + ' ' + o.sutun + '. sütunda iki kişi');
        gor[key] = 1;
      });
    });
    return h;
  });
  test(adi + ': seviyeler karışık: çok seviyeli salonda her seviye iki yarıdan birinde toplanmaz, masa arkadaşlarının çoğu farklı seviye', function () {
    var h = [];
    r.salonlar.forEach(function (s) {
      var sev = {};
      s.ogrenciler.forEach(function (o) { sev[o.seviye] = 1; });
      if (Object.keys(sev).length < 2) return;
      var ayni = 0, cift = 0;
      komsuCiftleri(s, function (a, b, yon) { if (yon === 'yan' && a.taraf === 0) { cift++; if (a.seviye === b.seviye) ayni++; } });
      if (ayni * 2 > cift) h.push(s.ad + ': ' + cift + ' masanın ' + ayni + ' tanesinde aynı seviye');
    });
    return h;
  });
  test(adi + ': yer tarifi koltukla tutarlı ("Önden m. sıra, soldan c. sütun, taraf")', function () {
    var h = [];
    r.ogrenciler.forEach(function (o) {
      if (o.koltuk > 40) return;
      var bek = 'Önden ' + o.masa + '. sıra, soldan ' + o.sutun + '. sütun, ' + (o.taraf ? 'sağ' : 'sol') + ' taraf';
      var hesap = (o.sutun - 1) * 10 + (o.masa - 1) * 2 + o.taraf + 1;
      if (o.yer !== bek || hesap !== o.koltuk) h.push('satır ' + o.sira + ': ' + o.koltuk + ' ' + o.yer);
    });
    return h;
  });
}

var tumSubeler = { sab: 33, ogl: 13, subeler: veri.subeler };
TOHUMLAR.slice(0, 3).forEach(function (t) { kurallar('Anahtar ' + t, dagit(t), tumSubeler); });

// Kalan anahtarlar tek testte toplu denetlenir (çıktı kısa kalsın)
test('Toplu: ' + (TOHUMLAR.length - 3) + ' farklı anahtarda şube komşusu 0, aynı sütun 0, herkes yerleşti', function () {
  var h = [];
  TOHUMLAR.slice(3).forEach(function (t) {
    var r = dagit(t), komsu = 0, sutun = 0;
    r.salonlar.forEach(function (s) {
      komsuCiftleri(s, function (a, b) { if (a.sinif === b.sinif) komsu++; });
      var gor = {};
      s.ogrenciler.forEach(function (o) { if (o.koltuk <= 40) { var k = o.sinif + '-' + o.sutun; if (gor[k]) sutun++; gor[k] = 1; } });
    });
    if (komsu || sutun || r.ogrenciler.length !== 1865) h.push('anahtar ' + t + ': komşu ' + komsu + ', sütun ' + sutun + ', öğrenci ' + r.ogrenciler.length);
  });
  return h;
});

// ---- Sınava girmeyen şube senaryosu
var giren = veri.subeler.filter(function (s) { return s !== '5/A' && s !== '6/A'; });
kurallar('5/A ve 6/A girmiyor', dagit(2026, giren), { sab: 32, ogl: 12, subeler: giren });
test('Sınava girmeyen şubelerin öğrencisi hiçbir salona yazılmaz', function () {
  var r = dagit(2026, giren);
  return r.ogrenciler.filter(function (o) { return o.sinif === '5/A' || o.sinif === '6/A'; }).map(function (o) { return 'satır ' + o.sira; });
});

print('');
print(gecen + ' test geçti, ' + kalan + ' test kaldı.');
