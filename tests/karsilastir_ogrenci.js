// Öğrenci dağıtımını Excel v8 sonuçlarıyla karşılaştırır. Çalıştırma: tests/calistir.sh
// veriler/excel_v8_ogrenci.json yerel dosyadır, GitHub'a gitmez.
load('src/ogrenci.js');
var veri = JSON.parse(readFile('veriler/hazir_veri.json'));
var zincir = JSON.parse(readFile('veriler/oturma_zinciri.json'));
var ayrinti = typeof arguments !== 'undefined' && arguments.indexOf('--ayrinti') >= 0;
var durumlar = JSON.parse(readFile('veriler/excel_v8_ogrenci.json'));

var toplam = { ogr: 0, salon: 0, koltuk: 0, yer: 0 };
durumlar.forEach(function (d) {
  var ex = d.ogrenciler;
  var giren = veri.subeler.filter(function (s) { return d.girmeyen.indexOf(s) < 0; });
  var biz = Ogrenci.dagit(veri.ogrenci_listesi_ham, veri.subeler, { tohum: d.tohum, zincir: zincir, sinavaGiren: giren });
  var bul = {};
  biz.ogrenciler.forEach(function (s) { bul[s.sira] = s; });
  var say = { ogr: 0, salon: 0, koltuk: 0, yer: 0 }, farklar = [];
  ex.forEach(function (e) {
    var b = bul[e.sira] || {};
    say.ogr++;
    var salonAyni = b.salonAdi === e.salonAdi;
    if (salonAyni) say.salon++;
    if (salonAyni && b.koltuk === e.koltuk) say.koltuk++;
    if (salonAyni && b.yer === e.yer) say.yer++;
    if (!salonAyni || b.koltuk !== e.koltuk || b.yer !== e.yer) {
      farklar.push('satır ' + e.sira + ' (' + e.sinif + '): Excel ' + e.salonAdi + ' / ' + e.koltuk + ' / ' + e.yer + '  web ' + b.salonAdi + ' / ' + b.koltuk + ' / ' + b.yer);
    }
  });
  var adi = 'Karıştırma anahtarı ' + d.tohum + (d.girmeyen.length ? ', sınava girmeyen ' + d.girmeyen.join(' ve ') : '');
  print(adi + ': ' + say.salon + '/' + say.ogr + ' salon, ' + say.koltuk + '/' + say.ogr + ' sıra no, ' + say.yer + '/' + say.ogr + ' yer tarifi aynı' +
    (biz.ogrenciler.length !== ex.length ? ' (öğrenci sayısı farklı: web ' + biz.ogrenciler.length + ')' : ''));
  if (d.subeMevcut) {
    var mevcut = {}, tutan = 0, subeSay = 0;
    biz.ogrenciler.forEach(function (o) { mevcut[o.sinif] = (mevcut[o.sinif] || 0) + 1; });
    Object.keys(d.subeMevcut).forEach(function (s) { subeSay++; if (mevcut[s] === d.subeMevcut[s]) tutan++; else farklar.push(s + ' mevcudu: Excel ' + d.subeMevcut[s] + ', web ' + mevcut[s]); });
    print('   Şube mevcutları (Excel Şubeler sayfası): ' + tutan + '/' + subeSay + ' şube aynı');
  }
  if (ayrinti) farklar.slice(0, 30).forEach(function (f) { print('   ' + f); });
  toplam.ogr += say.ogr; toplam.salon += say.salon; toplam.koltuk += say.koltuk; toplam.yer += say.yer;
});
print('TOPLAM: ' + toplam.salon + '/' + toplam.ogr + ' salon, ' + toplam.koltuk + '/' + toplam.ogr + ' sıra no, ' + toplam.yer + '/' + toplam.ogr + ' yer aynı');
