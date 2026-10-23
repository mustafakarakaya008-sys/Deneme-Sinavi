// Sayfa arayüzü: dosya yükleme, ayarlar ve sonuç ekranları. Veriler yalnız tarayıcı belleğinde tutulur.
// Hazırlayan: Matematik Öğretmeni Mustafa Karakaya
(function () {
  'use strict';

  var durum = { okul: null, eokulListe: null, raporlu: {}, giren: {}, sonuc: null };
  var $ = function (id) { return document.getElementById(id); };

  function kacis(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ikiHane(n) { return (n < 10 ? '0' : '') + n; }
  function bugun() { var d = new Date(); return d.getFullYear() + '-' + ikiHane(d.getMonth() + 1) + '-' + ikiHane(d.getDate()); }
  function tarihNesne(s) { var p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }

  function dosyaOku(dosya) {
    return new Promise(function (tamam, hata) {
      var r = new FileReader();
      r.onload = function () { tamam(new Uint8Array(r.result)); };
      r.onerror = function () { hata(r.error); };
      r.readAsArrayBuffer(dosya);
    });
  }
  function durumYaz(id, metin, tur) { var e = $(id); e.textContent = metin; e.className = 'durum ' + (tur || ''); }

  // ---- Dosya yükleme
  function excelYukle(veri) {
    var okul = ExcelOku.excelV8Oku(XLSX, veri);
    durum.okul = okul;
    durum.raporlu = {};
    okul.ayarlar.raporlu.forEach(function (a) { durum.raporlu[a] = true; });
    durum.giren = {};
    okul.subeler.forEach(function (s) { durum.giren[s] = okul.subeBilgi[s].girer; });
    $('tarih').value = okul.ayarlar.tarih || bugun();
    $('tohum').value = okul.ayarlar.tohum || 2026;
    durumYaz('excelDurum', okul.ogretmenler.length + ' öğretmen, ' + okul.subeler.length + ' şube, ' +
      okul.program.length + ' ders programı satırı okundu.', 'tamam');
    raporListesiCiz();
    subeListesiCiz();
    $('ayarKart').hidden = false;
    hesapla();
  }

  function eokulYukle(veri) {
    durum.eokulListe = ExcelOku.eokulOku(XLSX, veri);
    hesapla();
    var n = durum.sonuc ? durum.sonuc.ogr.okunanSatir : 0;
    durumYaz('eokulDurum', n + ' öğrenci satırı okundu' + (durum.sonuc ? ', ' + durum.sonuc.ogr.blokSayisi + ' şube bloğu.' : '.'), 'tamam');
  }

  $('excelDosya').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    durumYaz('excelDurum', 'Okunuyor…');
    dosyaOku(f).then(excelYukle).catch(function (h) { durumYaz('excelDurum', 'Okunamadı: ' + h.message, 'hata'); });
  });
  $('eokulDosya').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    if (!durum.okul) { durumYaz('eokulDurum', 'Önce Excel v8 dosyasını yükleyin.', 'hata'); e.target.value = ''; return; }
    durumYaz('eokulDurum', 'Okunuyor…');
    dosyaOku(f).then(eokulYukle).catch(function (h) { durumYaz('eokulDurum', 'Okunamadı: ' + h.message, 'hata'); });
  });

  // ---- Ayarlar
  function raporListesiCiz() {
    var ara = $('raporAra').value.trim().toLocaleUpperCase('tr');
    var html = durum.okul.ogretmenler.filter(function (t) {
      return t.exempt !== 'E' && (!ara || t.name.toLocaleUpperCase('tr').indexOf(ara) >= 0 || durum.raporlu[t.name]);
    }).map(function (t) {
      return '<label><input type="checkbox" data-ad="' + kacis(t.name) + '"' + (durum.raporlu[t.name] ? ' checked' : '') + '> ' + kacis(t.name) + '</label>';
    }).join('');
    $('raporListe').innerHTML = html || '<span class="ipucu">Eşleşen öğretmen yok.</span>';
  }
  $('raporAra').addEventListener('input', raporListesiCiz);
  $('raporListe').addEventListener('change', function (e) {
    var ad = e.target.getAttribute('data-ad');
    if (!ad) return;
    if (e.target.checked) durum.raporlu[ad] = true; else delete durum.raporlu[ad];
    hesapla();
  });

  function subeListesiCiz() {
    $('subeListe').innerHTML = durum.okul.subeler.map(function (s) {
      return '<label><input type="checkbox" data-sube="' + kacis(s) + '"' + (durum.giren[s] ? ' checked' : '') + '> ' + kacis(s) + '</label>';
    }).join('');
  }
  $('subeListe').addEventListener('change', function (e) {
    var s = e.target.getAttribute('data-sube');
    if (!s) return;
    durum.giren[s] = e.target.checked;
    hesapla();
  });
  $('tarih').addEventListener('change', hesapla);
  $('tohum').addEventListener('change', hesapla);

  // ---- Hesap
  function hesapla() {
    var okul = durum.okul;
    if (!okul) return;
    var giren = okul.subeler.filter(function (s) { return durum.giren[s]; });
    var grup = function (s) { return okul.subeBilgi[s] ? okul.subeBilgi[s].grup : (/^6\//.test(s) ? 2 : 1); };
    var tarih = $('tarih').value;
    var gNo = tarih ? Gozetmen.gunNo(tarihNesne(tarih)) : 0;
    $('gunAdi').textContent = tarih ? (gNo ? Gozetmen.GUNLER[gNo - 1] : 'Hafta sonu: gözetmen dağıtımı için hafta içi bir gün seçin.') : '';
    $('gunAdi').className = 'durum ' + (gNo ? 'tamam' : 'hata');

    var goz = Gozetmen.dagit(okul, { gunNo: gNo, raporlu: Object.keys(durum.raporlu), sinavaGiren: giren, grup: grup });
    var ogr = Ogrenci.dagit(durum.eokulListe || okul.ogrenciListesi, okul.subeler,
      { tohum: Number($('tohum').value) || 0, sinavaGiren: giren, grup: grup });
    durum.sonuc = { goz: goz, ogr: ogr, gNo: gNo };
    ozetCiz();
    gozetmenCiz();
    seciciDoldur();
    salonCiz();
    subeCiz();
    $('sonucKart').hidden = false;
    $('sekmeKart').hidden = false;
  }

  function gozetmenBul(salonAdi) {
    var s = durum.sonuc.goz.salonlar.filter(function (x) { return x.salon === salonAdi; })[0];
    return s ? s.oturum : [null, null];
  }

  function ozetCiz() {
    var o = durum.sonuc.ogr, g = durum.sonuc.goz;
    var say = function (grp) { return o.ogrenciler.filter(function (x) { return x.grup === grp; }).length; };
    var bos = 0;
    if (durum.sonuc.gNo) g.salonlar.forEach(function (s) { s.oturum.forEach(function (a) { if (!a) bos++; }); });
    $('ozet').innerHTML =
      '<div>Sabahçı: <b>' + say(1) + '</b> öğrenci, <b>' + o.salonSayisi.sabahci + '</b> salon</div>' +
      '<div>Öğlenci: <b>' + say(2) + '</b> öğrenci, <b>' + o.salonSayisi.oglenci + '</b> salon</div>' +
      '<div>Ek sıra kullanan salon: <b>' + o.salonlar.filter(function (s) { return s.ogrenciler.length > 40; }).length + '</b></div>';
    var u = [];
    if (o.okunanSatir !== o.ogrenciler.length) u.push((o.okunanSatir - o.ogrenciler.length) + ' öğrenci satırı yerleşmedi (sınava girmeyen şube ya da şubesi bulunamayan satır).');
    if (o.blokSayisi !== durum.okul.subeler.length) u.push('Listede ' + o.blokSayisi + ' şube bloğu var, Şubeler sayfasında ' + durum.okul.subeler.length + ' şube var. Şube adları sırayla eşlendi; kontrol edin.');
    if (bos) u.push(bos + ' oturumda gözetmen bulunamadı; çıktıya elle yazın.');
    $('uyarilar').innerHTML = u.map(function (x) { return '<div class="uyari">' + kacis(x) + '</div>'; }).join('');
  }

  function gozetmenCiz() {
    var g = durum.sonuc.goz, panel = document.querySelector('[data-panel=gozetmen]');
    if (!durum.sonuc.gNo) { panel.innerHTML = '<p class="ipucu">Gözetmen dağıtımı için hafta içi bir sınav tarihi seçin.</p>'; return; }
    var html = '';
    [[1, 'Sabahçı'], [2, 'Öğlenci']].forEach(function (gr) {
      var salonlar = g.salonlar.filter(function (s) { return s.grup === gr[0]; });
      if (!salonlar.length) return;
      var s1 = g.saat[0] ? g.saat[0][gr[0]] : '', s2 = g.saat[1] ? g.saat[1][gr[0]] : '';
      html += '<h3>' + gr[1] + ' grup — ' + kacis(g.gunAdi) + '</h3><div class="tablo-kap"><table><thead><tr><th>Salon</th><th>1. oturum (' + kacis(s1) +
        ')</th><th>Açıklama</th><th>2. oturum (' + kacis(s2) + ')</th><th>Açıklama</th></tr></thead><tbody>';
      salonlar.forEach(function (s) {
        html += '<tr><td>' + kacis(s.salon) + ' salonu</td>';
        s.oturum.forEach(function (a) {
          html += a ? '<td>' + kacis(a.yazi) + '</td><td class="not">' + kacis(a.not) + '</td>'
                    : '<td class="bos">Bulunamadı (elle yazın)</td><td></td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    });
    panel.innerHTML = html;
  }

  function seciciDoldur() {
    var o = durum.sonuc.ogr;
    var sSec = $('salonSec'), onceki = sSec.value;
    sSec.innerHTML = o.salonlar.map(function (s, i) {
      return '<option value="' + i + '">' + kacis(s.ad) + ' salonu (' + s.ogrenciler.length + ' öğrenci)</option>';
    }).join('');
    if (onceki && onceki < o.salonlar.length) sSec.value = onceki;
    var bSec = $('subeSec'), oncekiSube = bSec.value;
    var subeler = durum.okul.subeler.filter(function (s) { return durum.giren[s]; });
    bSec.innerHTML = subeler.map(function (s) { return '<option>' + kacis(s) + '</option>'; }).join('');
    if (subeler.indexOf(oncekiSube) >= 0) bSec.value = oncekiSube;
  }
  $('salonSec').addEventListener('change', salonCiz);
  $('subeSec').addEventListener('change', subeCiz);

  function koltukHtml(o, no) {
    if (!o) return '<div class="koltuk bos"><span class="no">' + no + '</span></div>';
    return '<div class="koltuk s' + o.seviye + '" title="' + kacis(o.ad + ' — ' + o.sinif + ' — ' + o.yer) + '"><span class="no">' + no +
      '</span> <span class="sb">' + kacis(o.sinif) + '</span><div class="ad">' + kacis(o.ad) + '</div></div>';
  }

  function salonCiz() {
    var o = durum.sonuc.ogr, s = o.salonlar[Number($('salonSec').value) || 0];
    if (!s) { $('salonPlan').innerHTML = ''; return; }
    var oturum = gozetmenBul(s.ad), g = durum.sonuc.goz;
    var html = '<div class="gozetmen-baslik">';
    if (durum.sonuc.gNo) {
      oturum.forEach(function (a, i) {
        var saat = g.saat[i] ? g.saat[i][s.grup] : '';
        html += '<div><b>' + (i + 1) + '. oturum (' + kacis(saat) + ') gözetmeni:</b> ' + (a ? kacis(a.yazi) + (a.not ? ' <span class="not">(Not: ' + kacis(a.not) + ')</span>' : '') : '……………………') + '</div>';
      });
    }
    html += '</div><div class="tahta">TAHTA</div><div class="sinif">';
    for (var sutun = 1; sutun <= 4; sutun++) {
      html += '<div class="dik">';
      for (var masa = 1; masa <= 5; masa++) {
        var k = (sutun - 1) * 10 + (masa - 1) * 2 + 1;
        html += '<div class="masa">' + koltukHtml(s.koltuk[k], k) + koltukHtml(s.koltuk[k + 1], k + 1) + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    if (s.koltuk[41] || s.koltuk[42]) html += '<h3>Ek sıra</h3><div class="ek">' + koltukHtml(s.koltuk[41], 41) + koltukHtml(s.koltuk[42], 42) + '</div>';
    var seviyeler = {};
    s.ogrenciler.forEach(function (x) { seviyeler[x.seviye] = (seviyeler[x.seviye] || 0) + 1; });
    html += '<div class="renkler">' + Object.keys(seviyeler).sort().map(function (v) {
      return '<span class="s' + v + '">' + v + '. sınıf: ' + seviyeler[v] + '</span>';
    }).join('') + '</div>';
    $('salonPlan').innerHTML = html;
  }

  function subeCiz() {
    var sube = $('subeSec').value;
    var liste = durum.sonuc.ogr.ogrenciler.filter(function (x) { return x.sinif === sube; })
      .sort(function (a, b) { return a.sinifNo - b.sinifNo; });
    $('subeTablo').innerHTML = '<table><thead><tr><th>S.No</th><th>Öğrenci No</th><th>Adı Soyadı</th><th>Salon</th><th>Sıra No</th><th>Yeri</th></tr></thead><tbody>' +
      liste.map(function (x) {
        return '<tr><td>' + x.sinifNo + '</td><td>' + kacis(x.no) + '</td><td>' + kacis(x.ad) + '</td><td>' + kacis(x.salonAdi) +
          ' salonu</td><td>' + x.koltuk + '</td><td>' + kacis(x.yer) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  // ---- Sekmeler
  document.querySelector('.sekmeler').addEventListener('click', function (e) {
    var ad = e.target.getAttribute('data-sekme');
    if (!ad) return;
    document.querySelectorAll('.sekmeler button').forEach(function (b) { b.setAttribute('aria-selected', String(b === e.target)); });
    document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== ad; });
  });

  // Testlerde ve geliştirmede dosya seçmeden yükleyebilmek için
  window.Uygulama = { excelYukle: excelYukle, eokulYukle: eokulYukle, durum: durum };
})();
