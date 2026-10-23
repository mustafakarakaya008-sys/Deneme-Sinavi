// Excel v8 dosyasından ve e-Okul sınıf listesinden veri okuma (SheetJS ile, yalnız tarayıcıda).
// Hazırlayan: Matematik Öğretmeni Mustafa Karakaya
(function (kok) {
  'use strict';

  function deger(ws, adres) {
    var h = ws && ws[adres];
    return h ? h.v : null;
  }
  function yazi(v) { return v === null || v === undefined ? '' : String(v).trim(); }

  // Excel saat değeri (gün kesri) ya da "08:45" -> "08:45"
  function saat(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') {
      var dk = Math.round(v * 1440);
      var s = Math.floor(dk / 60), d = dk % 60;
      return (s < 10 ? '0' : '') + s + ':' + (d < 10 ? '0' : '') + d;
    }
    return yazi(v);
  }

  function sutunAdi(n) {
    var s = '';
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }

  function sayfa(wb, ad) {
    var ws = wb.Sheets[ad];
    if (!ws) throw new Error('"' + ad + '" sayfası bulunamadı. Excel v8 dosyasını seçtiğinizden emin olun.');
    return ws;
  }

  // Excel v8 (.xlsm) -> { ogretmenler, subeler, subeBilgi, program, saatler, akis, ogrenciListesi, ayarlar }
  function excelV8Oku(XLSX, veri) {
    var wb = XLSX.read(veri, { type: 'array', cellFormula: false, cellHTML: false, cellStyles: false });

    var ws = sayfa(wb, 'Öğretmenler'), ogretmenler = [];
    for (var r = 5; r <= 154; r++) {
      var ad = yazi(deger(ws, 'B' + r));
      if (!ad) continue;
      ogretmenler.push({
        name: ad, short: yazi(deger(ws, 'C' + r)), day: yazi(deger(ws, 'D' + r)),
        shift: yazi(deger(ws, 'E' + r)), place: yazi(deger(ws, 'F' + r)), exempt: yazi(deger(ws, 'G' + r)).toUpperCase()
      });
    }

    ws = sayfa(wb, 'Şubeler');
    var subeler = [], subeBilgi = {};
    for (r = 5; r <= 104; r++) {
      var sb = yazi(deger(ws, 'B' + r));
      if (!sb) continue;
      subeler.push(sb);
      subeBilgi[sb] = { grup: yazi(deger(ws, 'D' + r)) === 'Öğlenci' ? 2 : 1, girer: yazi(deger(ws, 'E' + r)).toUpperCase() !== 'H' };
    }

    ws = sayfa(wb, 'Ders Programı');
    var program = [];
    for (r = 5; r <= 304; r++) {
      var cls = yazi(deger(ws, 'A' + r)), gun = yazi(deger(ws, 'B' + r));
      if (!cls || !gun) continue;
      var t1 = [], t2 = [];
      for (var h = 0; h < 16; h++) {
        t1.push(yazi(deger(ws, sutunAdi(3 + h) + r)));
        t2.push(yazi(deger(ws, sutunAdi(19 + h) + r)));
      }
      program.push({ cls: cls, day: gun, t1: t1, t2: t2 });
    }

    ws = sayfa(wb, 'Saatler');
    var saatler = [], akis = [];
    for (r = 6; r <= 21; r++) saatler.push([saat(deger(ws, 'C' + r)), saat(deger(ws, 'D' + r))]);
    for (r = 6; r <= 15; r++) {
      var bas = saat(deger(ws, 'G' + r));
      if (!bas) continue;
      akis.push([bas, saat(deger(ws, 'H' + r)), yazi(deger(ws, 'I' + r)), yazi(deger(ws, 'J' + r))]);
    }

    ws = sayfa(wb, 'Öğrenci Listesi');
    var ogrenciListesi = [];
    for (r = 6; r <= 2505; r++) {
      var satir = [];
      for (var c = 1; c <= 26; c++) satir.push(deger(ws, sutunAdi(c) + r));
      ogrenciListesi.push(satir);
    }
    while (ogrenciListesi.length && ogrenciListesi[ogrenciListesi.length - 1].every(function (x) { return x === null || x === ''; })) ogrenciListesi.pop();

    // İmza satırları: adlar koda yazılmaz, Excel v8'in görevlendirme sayfasından okunur
    var imza = { hazirlayan: '', hazirlayanUnvan: '', onaylayan: '', onaylayanUnvan: '' };
    ws = wb.Sheets['Gözetmen (Sabahçı)'];
    if (ws) {
      imza = {
        hazirlayan: yazi(deger(ws, 'B50')), hazirlayanUnvan: yazi(deger(ws, 'B51')),
        onaylayan: yazi(deger(ws, 'E50')), onaylayanUnvan: yazi(deger(ws, 'E51'))
      };
    }

    ws = sayfa(wb, 'Ayarlar');
    var tarih = deger(ws, 'C7'), raporlu = [];
    for (r = 19; r <= 30; r++) { var rp = yazi(deger(ws, 'C' + r)); if (rp) raporlu.push(rp); }

    return {
      ogretmenler: ogretmenler, subeler: subeler, subeBilgi: subeBilgi, program: program,
      saatler: saatler, akis: akis, ogrenciListesi: ogrenciListesi, imza: imza,
      ayarlar: {
        sinavAdi: yazi(deger(ws, 'C6')),
        tarih: typeof tarih === 'number' ? excelTarih(tarih) : null,
        tohum: Number(deger(ws, 'C9')) || 0,
        raporlu: raporlu
      }
    };
  }

  // Excel gün sayısı -> "yyyy-aa-gg"
  function excelTarih(n) {
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // e-Okul "Sınıf Listesi" (.xls): Excel'de A6'ya yapıştırılmış gibi satır satır (ilk sayfadan başlayarak bütün sayfalar)
  function eokulOku(XLSX, veri) {
    var wb = XLSX.read(veri, { type: 'array', cellStyles: false });
    var satirlar = [];
    wb.SheetNames.forEach(function (ad) {
      var ws = wb.Sheets[ad];
      if (!ws['!ref']) return;
      var alan = XLSX.utils.decode_range(ws['!ref']);
      for (var r = 0; r <= alan.e.r; r++) {
        var satir = [];
        for (var c = 0; c < 26; c++) {
          var h = ws[XLSX.utils.encode_cell({ r: r, c: c })];
          satir.push(h ? h.v : null);
        }
        satirlar.push(satir);
      }
    });
    return satirlar;
  }

  var api = { excelV8Oku: excelV8Oku, eokulOku: eokulOku, saat: saat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else kok.ExcelOku = api;
})(this);
