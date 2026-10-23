// Öğrenci salon dağıtımı ve oturma düzeni — Excel v8 (Hesap sayfası) ile birebir aynı hesap.
// Tarayıcıda ve testlerde (jsc) çalışır; hiçbir veriyi dışarı göndermez.
// Hazırlayan: Matematik Öğretmeni Mustafa Karakaya
(function (kok) {
  'use strict';

  // e-Okul "Sınıf Listesi" sütunları (Duzen sayfası: cS, cNo, cAd, cSoyad, cCins; 1 = A sütunu)
  var SUTUN = { sno: 1, no: 3, ad: 5, soyad: 10, cinsiyet: 14 };
  var SALON = { sira: 4, masa: 5, masaBasi: 2 }; // 4 dik sıra × 5 masa × 2 kişi
  var EK_SIRA = 2;                               // 41-42. öğrenci "Ek sıra"
  var EN_COK_SALON = 50;

  function yazi(v) { return v === null || v === undefined ? '' : String(v).trim(); }

  // Excel'in metin karşılaştırması (büyük/küçük harf ayırmaz, Türkçe harf sırası)
  var ABECE = ' /-.0123456789AÂBCÇDEFGĞHIİÎJKLMNOÖPQRSŞTUÛÜVWXYZ';
  function harfSira(c) {
    var i = ABECE.indexOf(c);
    return i >= 0 ? i : 1000 + c.charCodeAt(0);
  }
  function metinKarsilastir(a, b) {
    a = a.toLocaleUpperCase('tr'); b = b.toLocaleUpperCase('tr');
    for (var i = 0; i < Math.min(a.length, b.length); i++) {
      var d = harfSira(a[i]) - harfSira(b[i]);
      if (d) return d;
    }
    return a.length - b.length;
  }

  function seviyeBul(sinif) {
    var m = /(\d{1,2})/.exec(sinif);
    return m ? Number(m[1]) : null;
  }

  // Oturma zinciri: Excel Duzen!A3:AN3 ve "A koltuk" sayısı (B2). Kişisel veri değildir.
  var VARSAYILAN_ZINCIR = {
    Z: [18, 31, 5, 28, 15, 34, 1, 25, 19, 35, 4, 29, 14, 38, 8, 24, 11, 39, 9, 21,
        17, 33, 3, 27, 13, 37, 10, 22, 16, 32, 6, 30, 12, 40, 2, 26, 20, 36, 7, 23],
    capA: 20
  };
  function zincirAl(zincir) {
    if (!zincir) return VARSAYILAN_ZINCIR;
    var z = zincir['452'] || zincir;
    return { Z: z.Z, capA: z.capA };
  }

  // ayar: { tohum, sinavaGiren: [şube], grup: function(şube) -> 1|2, zincir }
  function dagit(hamListe, subeler, ayar) {
    ayar = ayar || {};
    var zc = zincirAl(ayar.zincir);
    var pCap = SALON.sira * SALON.masa * SALON.masaBasi;
    var pRpc = SALON.masa * SALON.masaBasi;
    var pCapA = zc.capA, pCapB = pCap - pCapA;
    var koltukSayisi = pCap + EK_SIRA;
    var tohum = Math.abs(Math.trunc(Number(ayar.tohum) || 0)) % 1000000;
    var grupBul = ayar.grup || function (s) { return /^6\//.test(s) ? 2 : 1; };
    var giren = {};
    (ayar.sinavaGiren || subeler).forEach(function (s) { giren[yazi(s)] = true; });
    var sinavListesi = subeler.filter(function (s) { return giren[yazi(s)]; });

    // 1) Listeyi oku: öğrenci satırları ve şube blokları (S.No 1'den yeniden başlar)
    var satirlar = [], blok = 0;
    hamListe.forEach(function (r, i) {
      var hucre = function (k) { return yazi(r[k - 1]); };
      var no = hucre(SUTUN.no);
      var ad = (hucre(SUTUN.ad) + ' ' + hucre(SUTUN.soyad)).trim();
      var ogrenci = ad !== '' && no !== '' && !isNaN(Number(no));
      if (ogrenci && hucre(SUTUN.sno) === '1') blok++;
      satirlar.push({ sira: i + 1, no: no, ad: ad, cinsiyet: hucre(SUTUN.cinsiyet), ogrenci: ogrenci, blok: blok });
    });
    var blokSayisi = blok;
    // Bloklar bütün şubelerle mi, yalnız sınava girenlerle mi eşleşiyor (Hesap pBlkAll)
    var blokListesi = blokSayisi === subeler.length ? subeler : (blokSayisi === sinavListesi.length ? sinavListesi : subeler);

    var gecerli = [];
    satirlar.forEach(function (s) {
      if (!s.ogrenci || !s.blok) return;
      s.sinif = yazi(blokListesi[s.blok - 1]);
      if (!s.sinif || !giren[s.sinif]) return;
      s.seviye = seviyeBul(s.sinif);
      if (!s.seviye || s.seviye > 12) return;
      s.grup = grupBul(s.sinif);
      s.anahtar = 'K' + s.sinif;
      s.rnd = ((s.sira * 7919 + tohum * 104723) % 1000003 * 48271 % 1000003) * 10000 + s.sira;
      gecerli.push(s);
    });

    // 2) Seviye, şube ve karıştırma anahtarına göre genel sıra; salonlara sırayla dağıt
    var sinifSayisi = { 1: {}, 2: {} }, ogrSayisi = { 1: 0, 2: 0 };
    gecerli.forEach(function (s) { sinifSayisi[s.grup][s.anahtar] = 1; ogrSayisi[s.grup]++; });
    function salonSayisi(g) {
      return ogrSayisi[g] ? Math.max(Object.keys(sinifSayisi[g]).length, Math.ceil(ogrSayisi[g] / koltukSayisi)) : 0;
    }
    var rSab = salonSayisi(1), rOgl = salonSayisi(2);
    var R = Math.min(rSab + rOgl, EN_COK_SALON);

    [1, 2].forEach(function (g) {
      var grup = gecerli.filter(function (s) { return s.grup === g; });
      grup.sort(function (a, b) {
        return a.seviye - b.seviye || metinKarsilastir(a.anahtar, b.anahtar) || a.rnd - b.rnd;
      });
      // U: seviye içi sıra, W: grup içi genel sıra
      var seviyeBasi = 0;
      grup.forEach(function (s, i) {
        if (i > 0 && grup[i - 1].seviye !== s.seviye) seviyeBasi = i;
        s.U = i - seviyeBasi;
        s.W = i;
        s.salon = g === 1 ? (s.W % Math.max(rSab, 1)) + 1 : rSab + (s.W % Math.max(rOgl, 1)) + 1;
      });
    });

    // 3) Salon içi sıra: seviyeye göre; aynı seviyede şubesi az olan önce, şubeler salona göre döndürülür
    var sinavSira = {};
    sinavListesi.forEach(function (s, i) { sinavSira[yazi(s)] = i + 1; });
    var salonOgr = [];
    for (var k = 1; k <= R; k++) salonOgr[k] = [];
    gecerli.forEach(function (s) { if (s.salon <= R) salonOgr[s.salon].push(s); });

    var salonlar = [];
    for (k = 1; k <= R; k++) {
      var liste = salonOgr[k], n = liste.length;
      var sinifAdet = {};
      liste.forEach(function (s) { sinifAdet[s.anahtar] = (sinifAdet[s.anahtar] || 0) + 1; });
      liste.forEach(function (s) {
        s.Y = sinifAdet[s.anahtar];
        s.Z = (100 - s.Y) * 100000000 + ((sinavSira[s.sinif] || 0) + k * 7) % Math.max(sinavListesi.length, 1) * 10000 + s.U;
      });
      liste.sort(function (a, b) { return a.seviye - b.seviye || a.Z - b.Z; });
      var ilkSeviye = {}, ilkSinif = {}, seviyeSay = 0;
      liste.forEach(function (s, i) {
        s.AD = i;
        s.seviyeBasi = !ilkSeviye[s.seviye]; ilkSeviye[s.seviye] = 1;
        s.sinifBasi = !ilkSinif[s.anahtar]; ilkSinif[s.anahtar] = 1;
        if (s.seviyeBasi) seviyeSay++;
      });
      // Bölme noktası: ortaya en yakın seviye (tek seviyede şube) başlangıcı
      var enIyi = n * 1001;
      liste.forEach(function (s) {
        var aday = (seviyeSay >= 2 ? s.seviyeBasi : s.sinifBasi) ? Math.abs(2 * s.AD - n) * 1000 + s.AD : 1e9;
        if (aday < enIyi) enIyi = aday;
      });
      var bolme = n ? enIyi % 1000 : 0;
      var ekBir = Math.max(0, bolme - pCapA - Math.max(0, pCapB - (n - bolme)));
      var harita = [];
      liste.forEach(function (s) {
        var AD = s.AD, koltuk;
        var zincirYeri = AD < bolme ? AD : pCap - 1 - (AD - bolme);
        var tasma1 = AD < bolme && AD >= pCapA ? AD - pCapA - Math.max(0, pCapB - (n - bolme)) : -1;
        var tasma2 = AD >= bolme && AD - bolme >= pCapB ? AD - bolme - pCapB - Math.max(0, pCapA - bolme) : -1;
        if (tasma1 >= 0) koltuk = pCap + 1 + tasma1;
        else if (tasma2 >= 0) koltuk = pCap + 1 + ekBir + tasma2;
        else koltuk = zc.Z[zincirYeri];
        s.koltuk = koltuk;
        s.yari = AD < bolme ? 1 : 2; // oturma planında renk: listenin ilk yarısı mavi, ikinci yarısı turuncu
        if (koltuk > pCap) {
          s.sutun = 0; s.masa = 0; s.taraf = (koltuk - pCap - 1) % 2;
          s.yer = 'Ek sıra, ' + (s.taraf === 0 ? 'sol' : 'sağ') + ' taraf';
        } else {
          s.sutun = Math.floor((koltuk - 1) / pRpc) + 1;
          s.masa = Math.floor(((koltuk - 1) % pRpc) / SALON.masaBasi) + 1;
          s.taraf = (koltuk - 1) % SALON.masaBasi;
          s.yer = 'Önden ' + s.masa + '. sıra, soldan ' + s.sutun + '. sütun, ' + (s.taraf === 0 ? 'sol' : 'sağ') + ' taraf';
        }
        harita[koltuk] = s;
      });
      var g = k <= rSab ? 1 : 2;
      var listeAdi = g === 1 ? sinavListesi.filter(function (s) { return grupBul(s) === 1; })[k - 1]
                             : sinavListesi.filter(function (s) { return grupBul(s) === 2; })[k - rSab - 1];
      salonlar.push({ no: k, ad: listeAdi || 'Ek Salon ' + k, grup: g, ogrenciler: liste.slice(), koltuk: harita });
    }

    // 4) Şube listesi sırası: her şubede e-Okul sırası
    var sinifIci = {};
    gecerli.forEach(function (s) { sinifIci[s.anahtar] = (sinifIci[s.anahtar] || 0) + 1; s.sinifNo = sinifIci[s.anahtar]; });
    gecerli.forEach(function (s) { s.salonAdi = s.salon <= R ? salonlar[s.salon - 1].ad : ''; });

    var temiz = gecerli.map(function (s) {
      return {
        sira: s.sira, no: s.no, ad: s.ad, cinsiyet: s.cinsiyet, sinif: s.sinif, seviye: s.seviye, grup: s.grup,
        sinifNo: s.sinifNo, salon: s.salon, salonAdi: s.salonAdi, koltuk: s.koltuk,
        sutun: s.sutun, masa: s.masa, taraf: s.taraf, yer: s.yer, yari: s.yari
      };
    });
    var bul = {};
    temiz.forEach(function (s) { bul[s.sira] = s; });
    salonlar.forEach(function (sl) {
      sl.ogrenciler = sl.ogrenciler.map(function (s) { return bul[s.sira]; });
      var h = [];
      sl.koltuk.forEach(function (s, i) { if (s) h[i] = bul[s.sira]; });
      sl.koltuk = h;
    });
    return {
      ogrenciler: temiz,
      salonlar: salonlar,
      salonSayisi: { sabahci: rSab, oglenci: rOgl },
      okunanSatir: satirlar.filter(function (s) { return s.ogrenci; }).length,
      blokSayisi: blokSayisi
    };
  }

  // Koltuğun sağındaki ve arkasındaki koltuk (Hesap AP, AR); yoksa 0
  function komsular(koltuk) {
    var pCap = SALON.sira * SALON.masa * SALON.masaBasi, pRpc = SALON.masa * SALON.masaBasi;
    if (koltuk > pCap) return { sag: 0, arka: 0 };
    var sutun = Math.floor((koltuk - 1) / pRpc) + 1, masa = Math.floor(((koltuk - 1) % pRpc) / 2) + 1, taraf = (koltuk - 1) % 2;
    var ao = (sutun - 1) * 2 + taraf;
    var sag = ao + 1 >= SALON.sira * 2 ? 0 : Math.floor((ao + 1) / 2) * pRpc + (masa - 1) * 2 + (ao + 1) % 2 + 1;
    var arka = masa + 1 > SALON.masa ? 0 : Math.floor(ao / 2) * pRpc + masa * 2 + ao % 2 + 1;
    return { sag: sag, arka: arka };
  }

  var api = { dagit: dagit, komsular: komsular, metinKarsilastir: metinKarsilastir, SALON: SALON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else kok.Ogrenci = api;
})(this);
