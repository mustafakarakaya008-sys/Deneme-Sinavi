// PDF çıktıları (pdfmake ile, yalnız tarayıcıda): gözetmen görevlendirmesi, salon oturma planı,
// salon yoklama listesi, şube listeleri. Biçim Excel v8'in çıktı sayfalarını izler.
// Hazırlayan: Matematik Öğretmeni Mustafa Karakaya
(function (kok) {
  'use strict';

  var KURUM = 'T.C.  KOCASİNAN KAYMAKAMLIĞI   •   KADİR HAS ORTAOKULU MÜDÜRLÜĞÜ';
  var HAZIRLAYAN_SATIRI = 'Hazırlayan: Matematik Öğretmeni Mustafa Karakaya';
  var R = {
    lacivert: '#1F3864', altin: '#C9A227', bilgi: '#DDEBF7', yesil: '#375623', gri: '#404040', cizgi: '#9AA5B8',
    sari: '#FFF2A8', kirmizi: '#C00000', kirmiziZemin: '#FDE2E2', turuncu: '#9C5700', satir: '#F2F5FA',
    mavi: '#DCE8FA', maviYazi: '#1F3864', turuncuKoltuk: '#FCE4CC', turuncuKoltukYazi: '#7A3E00'
  };

  function tarihYazi(b) { return b.tarihMetni + ' ' + b.gunAdi; }

  function ust(b, baslik) {
    return [
      { text: KURUM, alignment: 'center', fontSize: 9, bold: true, color: R.lacivert },
      { text: b.sinavAdi, alignment: 'center', fontSize: 10, bold: true, color: R.lacivert, margin: [0, 2, 0, 4] },
      { text: baslik, alignment: 'center', fontSize: 14, bold: true, color: R.lacivert, margin: [0, 0, 0, 4] }
    ];
  }

  // Salonun başına yazılan iki oturumun gözetmeni ve notu
  function gozetmenSatirlari(b, salon) {
    var g = b.gozetmen[salon.ad] || [null, null];
    return g.map(function (a, i) {
      var saat = b.oturumSaati[i] ? b.oturumSaati[i][salon.grup] : '';
      return {
        text: [
          { text: (i + 1) + '. OTURUM (' + saat + ') GÖZETMENİ:   ', bold: true },
          { text: a ? a.yazi : '..............................', bold: true },
          a && a.not ? { text: '    (Not: ' + a.not + ')', color: R.turuncu, bold: false, fontSize: 9 } : ''
        ],
        fontSize: 11, color: R.yesil
      };
    });
  }

  function seviyeOzeti(liste) {
    var say = {};
    liste.forEach(function (o) { say[o.seviye] = (say[o.seviye] || 0) + 1; });
    return Object.keys(say).sort(function (a, b) { return a - b; }).map(function (v) { return v + '. sınıf: ' + say[v]; }).join('  ');
  }
  function cinsiyetOzeti(liste) {
    var k = 0, e = 0;
    liste.forEach(function (o) { var c = (o.cinsiyet || '').toLocaleUpperCase('tr'); if (c[0] === 'K') k++; else if (c[0] === 'E') e++; });
    return k + e ? '   •   Kız: ' + k + '  Erkek: ' + e : '';
  }
  function cinsiyetYazi(c) {
    var u = (c || '').toLocaleUpperCase('tr');
    return u[0] === 'K' ? 'Kız' : u[0] === 'E' ? 'Erkek' : c || '';
  }
  function salonBilgisi(b, salon) {
    var b2 = bant('Tarih: ' + tarihYazi(b) + '   •   Sınav saati: ' + b.sinavSaati[salon.grup] + '   •   Öğrenci: ' + salon.ogrenciler.length +
      '   (' + seviyeOzeti(salon.ogrenciler) + ')' + cinsiyetOzeti(salon.ogrenciler), { fontSize: 9, fillColor: R.altin, color: R.lacivert });
    b2.margin = [0, 0, 0, 4];
    return b2;
  }
  function bant(metin, ek) {
    var t = { table: { widths: ['*'], body: [[Object.assign({ text: metin, alignment: 'center', bold: true, margin: [0, 3, 0, 3] }, ek || {})]] }, layout: 'noBorders' };
    return t;
  }

  var izgara = {
    hLineColor: function () { return R.cizgi; }, vLineColor: function () { return R.cizgi; },
    hLineWidth: function () { return 0.5; }, vLineWidth: function () { return 0.5; },
    paddingTop: function () { return 2; }, paddingBottom: function () { return 2; }
  };
  function cizgiliIzgara(satirRengi) {
    return Object.assign({}, izgara, {
      fillColor: function (i) { return satirRengi && i > 0 && i % 2 === 0 ? R.satir : null; }
    });
  }

  // ---- 1) Gözetmen görevlendirmesi (sabahçı ve öğlenci ayrı sayfa, dikey)
  function gozetmenBelgesi(b) {
    var icerik = [];
    [[1, 'SABAHÇI'], [2, 'ÖĞLENCİ']].forEach(function (gr) {
      var salonlar = b.salonlar.filter(function (s) { return s.grup === gr[0]; });
      if (!salonlar.length) return;
      if (icerik.length) icerik.push({ text: '', pageBreak: 'before' });
      icerik.push(
        { text: 'T.C.', alignment: 'center', bold: true, fontSize: 11, color: R.lacivert },
        { text: 'KOCASİNAN KAYMAKAMLIĞI', alignment: 'center', bold: true, fontSize: 11, color: R.lacivert },
        { text: 'KADİR HAS ORTAOKULU MÜDÜRLÜĞÜ', alignment: 'center', bold: true, fontSize: 11, color: R.lacivert, margin: [0, 0, 0, 6] },
        bant(b.sinavAdi + '  —  ' + gr[1] + ' GRUP GÖZETMEN GÖREVLENDİRMESİ', { fillColor: R.lacivert, color: '#FFFFFF', fontSize: 11 }),
        bant('Sınav günü:  ' + tarihYazi(b) + '      Sınav saati:  ' + b.sinavSaati[gr[0]], { fillColor: R.altin, color: R.lacivert, fontSize: 11 }),
        Object.assign(bant('Her oturumda salona tek gözetmen yazılır: o oturumda o şubede dersi olan öğretmen. Dersin öğretmeni gelemiyorsa (raporlu, idareci) yerine o günün boştaki nöbetçisi (N) yazılır. Boş saatine denk gelen kısım Açıklama sütunundadır.',
          { fontSize: 8, color: R.gri, fillColor: R.bilgi, bold: false, alignment: 'left' }), { margin: [0, 2, 0, 6] })
      );
      var s1 = b.oturumSaati[0] ? b.oturumSaati[0][gr[0]] : '', s2 = b.oturumSaati[1] ? b.oturumSaati[1][gr[0]] : '';
      var bas = { bold: true, color: '#FFFFFF', fillColor: R.lacivert, fontSize: 9, alignment: 'center' };
      var govde = [
        [Object.assign({ text: 'SALON', rowSpan: 2 }, bas), Object.assign({ text: '1. OTURUM   (' + s1 + ')', colSpan: 2 }, bas), {},
         Object.assign({ text: '2. OTURUM   (' + s2 + ')', colSpan: 2 }, bas), {}],
        [{}, Object.assign({}, bas, { text: 'Gözetmen', fontSize: 8 }), Object.assign({}, bas, { text: 'Açıklama', fontSize: 8 }),
         Object.assign({}, bas, { text: 'Gözetmen', fontSize: 8 }), Object.assign({}, bas, { text: 'Açıklama', fontSize: 8 })]
      ];
      salonlar.forEach(function (s) {
        var g = b.gozetmen[s.ad] || [null, null];
        var satir = [{ text: s.ad, bold: true, fontSize: 10, color: R.lacivert, alignment: 'center' }];
        g.forEach(function (a) {
          if (!a) {
            satir.push({ text: '', fillColor: R.kirmiziZemin }, { text: 'Gözetmen bulunamadı, elle yazın', fontSize: 8, color: R.kirmizi });
          } else {
            satir.push({ text: a.yazi, bold: true, fontSize: 9.5, color: R.lacivert, fillColor: a.nobetciYedek ? R.sari : null },
                       { text: a.not, fontSize: 8, color: R.turuncu });
          }
        });
        govde.push(satir);
      });
      icerik.push({ table: { headerRows: 2, widths: [40, 85, '*', 85, '*'], body: govde, dontBreakRows: true },
        layout: Object.assign({}, izgara, { paddingTop: function () { return 1.2; }, paddingBottom: function () { return 1.2; } }) });
      icerik.push({ text: [
        '(N): o günün nöbetçisi       ', { text: '  Sarı  ', background: R.sari }, ' nöbetçi       ',
        { text: '  Kırmızı  ', background: R.kirmiziZemin }, ' gözetmen bulunamadı, elle yazın       ',
        { text: 'Turuncu açıklama', color: R.turuncu }, ': öğretmenin boş saatine denk geliyor'
      ], fontSize: 7.5, color: R.gri, margin: [0, 5, 0, 10] });
      icerik.push({
        unbreakable: true,
        columns: [
          { width: '*', stack: [{ text: 'Hazırlayan', bold: true }, { text: ' ' }, { text: ' ' }, { text: b.imza.hazirlayan || 'Mustafa KARAKAYA' }, { text: b.imza.hazirlayanUnvan || 'Matematik Öğretmeni' }], alignment: 'center' },
          { width: '*', stack: [{ text: 'UYGUNDUR', bold: true }, { text: b.tarihMetni }, { text: ' ' }, { text: b.imza.onaylayan || '..............................' }, { text: b.imza.onaylayanUnvan || 'Okul Müdürü' }], alignment: 'center' }
        ],
        fontSize: 10, color: R.lacivert
      });
    });
    return { pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [28, 24, 28, 24], content: icerik, defaultStyle: { font: 'Roboto' },
      info: { title: 'Gözetmen görevlendirmesi ' + b.tarihMetni } };
  }

  // ---- 2) Salon oturma planı (her salon bir sayfa, yatay)
  function koltukHucresi(o, no) {
    if (!o) return { text: '[' + no + ']', fontSize: 8, color: '#8A93A3', margin: [2, 6, 2, 6] };
    var mavi = o.yari === 1;
    return {
      stack: [
        { text: [{ text: '[' + no + ']  ', bold: true }, { text: o.ad, bold: true }], fontSize: 9 },
        { text: o.sinif + '   •   No: ' + o.no, fontSize: 8, margin: [0, 2, 0, 0] }
      ],
      fillColor: mavi ? R.mavi : R.turuncuKoltuk, color: mavi ? R.maviYazi : R.turuncuKoltukYazi, margin: [2, 6, 2, 6]
    };
  }

  function oturmaPlaniBelgesi(b) {
    var icerik = [];
    b.salonlar.forEach(function (s, i) {
      var sayfa = ust(b, s.ad + ' SINAV SALONU  —  OTURMA PLANI');
      if (i > 0) sayfa[0].pageBreak = 'before';
      sayfa.push(salonBilgisi(b, s));
      gozetmenSatirlari(b, s).forEach(function (x) { sayfa.push(x); });
      sayfa.push({ columns: [{ width: '*', text: '' }, Object.assign(bant('YAZI TAHTASI   •   ÖĞRETMEN MASASI', { fillColor: R.lacivert, color: '#FFFFFF', fontSize: 9 }), { width: 360 }), { width: '*', text: '' }],
        margin: [0, 6, 0, 4] });

      var widths = [40], basSatir = [{ text: '' }];
      for (var sutun = 1; sutun <= 4; sutun++) {
        widths.push('*', '*');
        basSatir.push({ text: 'SOLDAN ' + sutun + '. SÜTUN', colSpan: 2, alignment: 'center', bold: true, fontSize: 8, color: R.lacivert }, {});
        if (sutun < 4) { widths.push(8); basSatir.push({ text: '' }); }
      }
      var govde = [basSatir];
      for (var masa = 1; masa <= 5; masa++) {
        var satir = [{ text: masa + '. SIRA', bold: true, fontSize: 9, color: R.lacivert, margin: [0, 14, 0, 0] }];
        for (sutun = 1; sutun <= 4; sutun++) {
          var k = (sutun - 1) * 10 + (masa - 1) * 2 + 1;
          satir.push(koltukHucresi(s.koltuk[k], k), koltukHucresi(s.koltuk[k + 1], k + 1));
          if (sutun < 4) satir.push({ text: '' });
        }
        govde.push(satir);
      }
      sayfa.push({
        table: { widths: widths, body: govde },
        layout: {
          hLineWidth: function (r) { return r === 0 ? 0 : 0.5; },
          vLineWidth: function (c) { return c === 0 || c === widths.length || c % 3 === 0 && c > 1 ? 0 : 0.5; },
          hLineColor: function () { return '#FFFFFF'; }, vLineColor: function () { return '#FFFFFF'; }
        }
      });
      if (s.koltuk[41] || s.koltuk[42]) {
        sayfa.push({ margin: [0, 6, 0, 0], table: { widths: [40, 140, 140, '*'], body: [[
          { text: 'EK SIRA', bold: true, fontSize: 8, color: R.lacivert, margin: [0, 8, 0, 0] },
          koltukHucresi(s.koltuk[41], 41), koltukHucresi(s.koltuk[42], 42), { text: '' }]] }, layout: 'noBorders' });
      }
      // Renk açıklaması: listenin iki yarısındaki seviyeler
      var yarilar = { 1: [], 2: [] };
      s.ogrenciler.forEach(function (o) { yarilar[o.yari].push(o); });
      sayfa.push({ margin: [0, 6, 0, 0], columns: [
        { text: [{ text: '  Mavi  ', background: R.mavi, color: R.maviYazi, bold: true }, '  ' + seviyeOzetiParantez(yarilar[1])], fontSize: 8.5, color: R.lacivert },
        { text: [{ text: '  Turuncu  ', background: R.turuncuKoltuk, color: R.turuncuKoltukYazi, bold: true }, '  ' + seviyeOzetiParantez(yarilar[2])], fontSize: 8.5, color: R.lacivert }
      ] });
      sayfa.push({ text: '1. Oturum Gözetmeni İmza: ....................................               2. Oturum Gözetmeni İmza: ....................................',
        fontSize: 9, margin: [0, 10, 0, 4] });
      sayfa.push({ text: HAZIRLAYAN_SATIRI, fontSize: 7.5, color: R.gri });
      icerik = icerik.concat(sayfa);
    });
    return { pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [24, 18, 24, 18], content: icerik, defaultStyle: { font: 'Roboto' },
      info: { title: 'Salon oturma planları ' + b.tarihMetni } };
  }
  function seviyeOzetiParantez(liste) {
    var say = {};
    liste.forEach(function (o) { say[o.seviye] = (say[o.seviye] || 0) + 1; });
    return Object.keys(say).sort(function (a, b) { return a - b; }).map(function (v) { return v + '. sınıf (' + say[v] + ')'; }).join(' ') || '—';
  }

  // ---- 3) Salon yoklama ve imza listesi (her salon bir sayfa, dikey)
  function yoklamaBelgesi(b) {
    var icerik = [];
    b.salonlar.forEach(function (s, i) {
      var sayfa = ust(b, s.ad + ' SALONU  —  YOKLAMA VE İMZA LİSTESİ');
      if (i > 0) sayfa[0].pageBreak = 'before';
      sayfa.push(salonBilgisi(b, s));
      gozetmenSatirlari(b, s).forEach(function (x) { x.fontSize = 10; sayfa.push(x); });
      var bas = ['Sıra No', 'Öğrenci No', 'Adı Soyadı', 'Şubesi', 'Cinsiyet', 'Oturacağı yer', 'İmza'].map(function (t) {
        return { text: t, bold: true, color: '#FFFFFF', fillColor: R.lacivert, fontSize: 8.5, alignment: 'center' };
      });
      var govde = [bas];
      s.ogrenciler.slice().sort(function (a, b2) { return a.koltuk - b2.koltuk; }).forEach(function (o) {
        govde.push([
          { text: String(o.koltuk), alignment: 'center', bold: true }, { text: o.no, alignment: 'center' }, { text: o.ad },
          { text: o.sinif, alignment: 'center' }, { text: cinsiyetYazi(o.cinsiyet), alignment: 'center' }, { text: o.yer, fontSize: 8 }, { text: '' }
        ]);
      });
      sayfa.push({ margin: [0, 6, 0, 0], table: { headerRows: 1, widths: [30, 44, '*', 34, 38, 150, 62], body: govde, dontBreakRows: true },
        layout: cizgiliIzgara(true), fontSize: 9 });
      sayfa.push({ text: 'Sınava giren: ..........     Girmeyen: ..........     Girmeyenlerin sıra no: ..........................................', fontSize: 9, margin: [0, 10, 0, 6] });
      sayfa.push({ text: '1. Oturum Gözetmeni İmza: ...............................          2. Oturum Gözetmeni İmza: ...............................', fontSize: 9, margin: [0, 0, 0, 6] });
      sayfa.push({ text: HAZIRLAYAN_SATIRI, fontSize: 7.5, color: R.gri });
      icerik = icerik.concat(sayfa);
    });
    return { pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [24, 20, 24, 20], content: icerik, defaultStyle: { font: 'Roboto' },
      info: { title: 'Salon yoklama listeleri ' + b.tarihMetni } };
  }

  // ---- 4) Şube listeleri (her şube bir sayfa, dikey)
  function subeBelgesi(b) {
    var icerik = [];
    b.subeler.forEach(function (sube, i) {
      var liste = b.ogrenciler.filter(function (o) { return o.sinif === sube; }).sort(function (a, c) { return a.sinifNo - c.sinifNo; });
      if (!liste.length) return;
      var sayfa = ust(b, sube + ' SINIFI  —  SINAV SALONU VE SIRA LİSTESİ');
      if (icerik.length) sayfa[0].pageBreak = 'before';
      var g = b.gozetmen[sube];
      sayfa.push(bant('Tarih: ' + tarihYazi(b) + '   •   Öğrenci sayısı: ' + liste.length + '   •   Yerler tahtaya bakarken soldan sağa sayılır.',
        { fontSize: 9, fillColor: R.altin, color: R.lacivert }));
      if (g) {
        sayfa.push({ text: sube + ' dersliğinin gözetmenleri:   1. Oturum: ' + (g[0] ? g[0].yazi : '……') + '     •     2. Oturum: ' + (g[1] ? g[1].yazi : '……'),
          fontSize: 9, alignment: 'center', color: R.yesil, bold: true, margin: [0, 3, 0, 0] });
      }
      var bas = ['Sıra', 'Öğrenci No', 'Adı Soyadı', 'Sınav Salonu', 'Sıra No', 'Oturacağı yer'].map(function (t) {
        return { text: t, bold: true, color: '#FFFFFF', fillColor: R.lacivert, fontSize: 8.5, alignment: 'center' };
      });
      var govde = [bas];
      liste.forEach(function (o) {
        govde.push([
          { text: String(o.sinifNo), alignment: 'center' }, { text: o.no, alignment: 'center' }, { text: o.ad },
          { text: o.salonAdi + ' salonu', alignment: 'center', bold: true }, { text: String(o.koltuk), alignment: 'center', bold: true }, { text: o.yer, fontSize: 8.5 }
        ]);
      });
      sayfa.push({ margin: [0, 6, 0, 0], table: { headerRows: 1, widths: [26, 48, '*', 70, 38, 175], body: govde, dontBreakRows: true },
        layout: cizgiliIzgara(true), fontSize: 9.5 });
      sayfa.push({ text: HAZIRLAYAN_SATIRI, fontSize: 7.5, color: R.gri, margin: [0, 10, 0, 0] });
      icerik = icerik.concat(sayfa);
    });
    return { pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [28, 24, 28, 24], content: icerik, defaultStyle: { font: 'Roboto' },
      info: { title: 'Şube listeleri ' + b.tarihMetni } };
  }

  var api = {
    gozetmen: gozetmenBelgesi, oturmaPlani: oturmaPlaniBelgesi, yoklama: yoklamaBelgesi, subeListesi: subeBelgesi
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else kok.PdfBelge = api;
})(this);
