// Gözetmen dağıtımı — Excel v8 (GHesap sayfası + DagitModul/MacarModul) ile birebir aynı hesap.
// Tarayıcıda ve testlerde (jsc) çalışır; hiçbir veriyi dışarı göndermez.
// Hazırlayan: Matematik Öğretmeni Mustafa Karakaya
(function (kok) {
  'use strict';

  var GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  var SAAT_SAYISI = 16;
  var OGLE_ILK_DERS = 9;     // Saatler!J26: öğlenci grubun ilk dersi
  var SABAH_ILK_DERS = 1;    // Saatler!J29
  var YASAK = 99999;         // Excel'de "atanamaz"
  var MACAR_YASAK = 1000000; // makroda yasak hücre
  var BOS_BIRAKMA = 5000;    // makroda "boş" sütunu
  var EXCEL_SUTUN = 150;     // makrodaki NT: öğretmen sütunu sayısı
  var HAZIRLAYAN = 'MUSTAFA KARAKAYA';

  function dakika(s) {
    var p = String(s).split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function ad(s) { return String(s || '').trim(); }

  // Tarih (Date ya da "gg.aa.yyyy") -> 1..5 (Pazartesi..Cuma), hafta sonu 0
  function gunNo(tarih) {
    var d = tarih;
    if (typeof tarih === 'string') {
      var p = tarih.split('.');
      d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    }
    var g = d.getDay();
    return g >= 1 && g <= 5 ? g : 0;
  }

  // Sınav akışından oturum pencereleri ve ana saatler (Saatler + GHesap DO:EW)
  function zamanlama(veri) {
    var saatler = veri.saatler.map(function (s) { return [dakika(s[0]), dakika(s[1])]; });
    var akis = veri.akis.map(function (a) {
      return { bas: dakika(a[0]), bit: dakika(a[1]), tur: a[3] };
    });
    // Saatler!J23:J24: görevin başladığı / bittiği saat (ders dışı satırlar)
    var gBas = Infinity, gBit = 0;
    akis.forEach(function (a) {
      if (a.tur !== 'Ders') gBas = Math.min(gBas, a.bas);
      gBit = Math.max(gBit, a.bit);
    });
    // Saatler!K25: sabah ilk sınav dersi
    var ilkSinavDersi = 0;
    for (var h = 1; h <= SAAT_SAYISI; h++) {
      var s = saatler[h - 1];
      if (h < OGLE_ILK_DERS && s[0] < gBit && s[1] > gBas) { ilkSinavDersi = h; break; }
    }
    // Saatler!J27: öğlenci kaydırması (öğlenci 3. ders – sabah 3. ders)
    var kayma = ilkSinavDersi ? saatler[OGLE_ILK_DERS + ilkSinavDersi - 2][0] - saatler[ilkSinavDersi - 1][0] : 0;

    var oturumlar = [];
    akis.forEach(function (a, i) {
      if (a.tur !== 'Oturum') return;
      var pencere = i > 0 && akis[i - 1].tur === 'Hazırlık' ? akis[i - 1].bas : a.bas;
      oturumlar.push({ bas: a.bas, bit: a.bit, pencere: pencere });
    });

    // ana[o][g][h]: oturum o, grup g (1 sabah, 2 öğle), ders h ile >= 15 dk örtüşme
    // tum[o][g][h]: herhangi bir örtüşme (sınava girmeyen şube kontrolü)
    var ana = [], tum = [];
    oturumlar.forEach(function (o, oi) {
      ana[oi] = {}; tum[oi] = {};
      [1, 2].forEach(function (g) {
        var off = g === 2 ? kayma : 0;
        ana[oi][g] = []; tum[oi][g] = [];
        for (var h = 1; h <= SAAT_SAYISI; h++) {
          var uygun = g === 1 ? (h >= SABAH_ILK_DERS && h < OGLE_ILK_DERS) : h >= OGLE_ILK_DERS;
          var s = saatler[h - 1];
          var ortusme = Math.min(s[1], o.bit + off) - Math.max(s[0], o.pencere + off);
          ana[oi][g][h] = uygun && ortusme >= 14.99 ? 1 : 0;
          tum[oi][g][h] = uygun && ortusme > 0.01 ? 1 : 0;
        }
      });
    });

    function saatYazi(dk) {
      var s = Math.floor(dk / 60), d = dk % 60;
      return (s < 10 ? '0' : '') + s + ':' + (d < 10 ? '0' : '') + d;
    }
    oturumlar.forEach(function (o) {
      o.yazi = { 1: saatYazi(o.bas) + '–' + saatYazi(o.bit), 2: saatYazi(o.bas + kayma) + '–' + saatYazi(o.bit + kayma) };
    });
    return { oturumlar: oturumlar, ana: ana, tum: tum, kayma: kayma };
  }

  // Excel MacarModul.Macar ile aynı algoritma (aynı eşitlik bozma sırası)
  function macar(a, n, m) {
    var u = [], v = [], p = [], w = [], i, j;
    for (i = 0; i <= n; i++) u[i] = 0;
    for (j = 0; j <= m; j++) { v[j] = 0; p[j] = 0; w[j] = 0; }
    for (i = 1; i <= n; i++) {
      p[0] = i;
      var j0 = 0, mv = [], us = [];
      for (j = 0; j <= m; j++) { mv[j] = 1e30; us[j] = false; }
      do {
        us[j0] = true;
        var i0 = p[j0], d = 1e30, j1 = 0;
        for (j = 1; j <= m; j++) {
          if (!us[j]) {
            var c = a[i0][j] - u[i0] - v[j];
            if (c < mv[j]) { mv[j] = c; w[j] = j0; }
            if (mv[j] < d) { d = mv[j]; j1 = j; }
          }
        }
        for (j = 0; j <= m; j++) {
          if (us[j]) { u[p[j]] += d; v[j] -= d; } else { mv[j] -= d; }
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do { j1 = w[j0]; p[j0] = p[j1]; j0 = j1; } while (j0 !== 0);
    }
    var ans = [];
    for (j = 1; j <= m; j++) if (p[j] !== 0) ans[p[j]] = j;
    return ans;
  }

  // ayar: { tarih, raporlu: [ad], sinavaGiren: [şube] (boşsa hepsi), grup: function(şube) -> 1|2 }
  function dagit(veri, ayar) {
    ayar = ayar || {};
    // gunNo 0 (hafta sonu) da geçerli bir değerdir: o zaman kimseye görev yazılmaz
    var gun = ayar.gunNo !== undefined ? ayar.gunNo : (ayar.tarih ? gunNo(ayar.tarih) : 0);
    var gunAdi = GUNLER[gun - 1] || '';
    var zm = zamanlama(veri);
    var raporlu = {};
    (ayar.raporlu || []).forEach(function (r) { raporlu[ad(r)] = true; });
    var grupBul = ayar.grup || function (sube) { return /^6\//.test(sube) ? 2 : 1; };
    var giren = {};
    (ayar.sinavaGiren || veri.subeler).forEach(function (s) { giren[ad(s)] = true; });

    // Salonlar: önce sabahçı, sonra öğlenci; grup içinde Şubeler sırası (Hesap!BW, CJ)
    var salonlar = [];
    [1, 2].forEach(function (g) {
      veri.subeler.forEach(function (s) {
        if (giren[ad(s)] && grupBul(s) === g) salonlar.push({ ad: s, grup: g });
      });
    });

    var gunProgrami = veri.program.filter(function (r) { return r.day === gunAdi; });
    var programSatiri = {};
    gunProgrami.forEach(function (r) { programSatiri[ad(r.cls)] = r; });

    // Öğretmen satırları (GHesap G:BH)
    var ogretmenler = veri.ogretmenler.map(function (t) {
      var isim = ad(t.name);
      var lb = [], ne = [];
      for (var h = 1; h <= SAAT_SAYISI; h++) {
        var say = 0, girmeyen = 0;
        gunProgrami.forEach(function (r) {
          var k = (ad(r.t1[h - 1]) === isim ? 1 : 0) + (ad(r.t2[h - 1]) === isim ? 1 : 0);
          say += k;
          if (!giren[ad(r.cls)]) girmeyen += k;
        });
        lb[h] = say; ne[h] = girmeyen;
      }
      var vardiya = {};
      [1, 2].forEach(function (g) {
        var ilk = 99, son = 0;
        for (var h = 1; h <= SAAT_SAYISI; h++) {
          var bu = g === 1 ? h < OGLE_ILK_DERS : h >= OGLE_ILK_DERS;
          if (bu && lb[h] > 0) { if (h < ilk) ilk = h; if (h > son) son = h; }
        }
        var bosluk = 0;
        for (h = ilk; h <= son && h <= SAAT_SAYISI; h++) if (lb[h] === 0) bosluk++;
        vardiya[g] = { ilk: ilk, son: son, bosluk: bosluk };
      });
      var nobetGunu = ad(t.day) === gunAdi && gun > 0;
      return {
        ad: isim,
        kisa: ad(t.short) || isim,
        gorevYok: isim === HAZIRLAYAN || !!raporlu[isim] || ad(t.exempt).toUpperCase() === 'E',
        nobetci: { 1: nobetGunu && ad(t.shift) !== 'Öğle', 2: nobetGunu && ad(t.shift) !== 'Sabah' },
        lb: lb, ne: ne, vardiya: vardiya
      };
    });

    function dersSayisi(salon, t, o) {
      var r = programSatiri[ad(salon.ad)];
      if (!r) return 0;
      var ana = zm.ana[o][salon.grup], L = 0;
      for (var h = 1; h <= SAAT_SAYISI; h++) {
        if (!ana[h]) continue;
        L += (ad(r.t1[h - 1]) === t.ad ? 1 : 0) + (ad(r.t2[h - 1]) === t.ad ? 1 : 0);
      }
      return L;
    }

    // GHesap AW:BP — oturum o, grup g için öğretmenin maliyeti ve yedek maliyeti
    function maliyetler(t, o, g, onceki) {
      var ana = zm.ana[o][g], tum = zm.tum[o][g], v = t.vardiya[g];
      var EU = 0, ders = 0, bos = 0, girmeyen = 0;
      for (var h = 1; h <= SAAT_SAYISI; h++) {
        if (tum[h] && t.ne[h] > 0) girmeyen++;
        if (!ana[h]) continue;
        EU++;
        if (t.lb[h] > 0) ders++;
        else if (h >= v.ilk && h <= v.son) bos++;
      }
      var nb = t.nobetci[g];
      if (t.gorevYok || gun === 0 || EU === 0 || (v.ilk === 99 && !nb) || girmeyen > 0) {
        return { maliyet: YASAK, yedek: YASAK };
      }
      var maliyet;
      if (nb) {
        maliyet = EU;
      } else {
        // 2. oturum: 1. oturumda (bu grupta) görev aldıysa o oturumda kullandığı boş saatler
        var oncekiBos = o === 1 && onceki && onceki[t.ad] ? onceki[t.ad] : 0;
        maliyet = ders + bos * 3 + (EU - ders - bos) * 300 +
          (bos > 0 && bos + oncekiBos >= v.bosluk ? 2 : 0) +
          (bos > 0 && oncekiBos > 0 ? 3 : 0);
      }
      return { maliyet: maliyet, yedek: nb ? 100 + ders * 10 : YASAK, bos: bos };
    }

    // GHesap EY:IT — salon x öğretmen maliyeti
    function hucre(salon, t, m, o) {
      if (m.maliyet >= YASAK) return YASAK;
      var L = Math.min(dersSayisi(salon, t, o), 6);
      return L === 0 ? m.yedek : m.maliyet - L;
    }

    var sonuc = salonlar.map(function (s) { return { salon: s.ad, grup: s.grup, oturum: [null, null] }; });
    var oncekiBosKullanim = { 1: {}, 2: {} };
    var NT = Math.max(EXCEL_SUTUN, ogretmenler.length);

    for (var o = 0; o < zm.oturumlar.length && o < 2; o++) {
      [1, 2].forEach(function (g) {
        var odalar = [];
        salonlar.forEach(function (s, k) { if (s.grup === g) odalar.push(k); });
        var n = odalar.length;
        if (!n || gun === 0) return;
        var mal = ogretmenler.map(function (t) {
          return maliyetler(t, o, g, o === 1 ? oncekiBosKullanim[g] : null);
        });
        var m = NT + n, a = [null];
        for (var i = 1; i <= n; i++) {
          var satir = [0];
          for (var j = 1; j <= NT; j++) {
            var t = ogretmenler[j - 1];
            var c = t ? hucre(salonlar[odalar[i - 1]], t, mal[j - 1], o) : YASAK;
            satir[j] = c < YASAK ? c : MACAR_YASAK;
          }
          for (j = NT + 1; j <= m; j++) satir[j] = BOS_BIRAKMA;
          a.push(satir);
        }
        var ans = macar(a, n, m);
        for (i = 1; i <= n; i++) {
          var k = odalar[i - 1], jj = ans[i];
          var atama = null;
          if (jj >= 1 && jj <= NT && a[i][jj] < MACAR_YASAK) {
            var ogr = ogretmenler[jj - 1];
            atama = gorevBilgisi(salonlar[k], ogr, o, a[i][jj]);
            if (o === 0 && !ogr.nobetci[g]) oncekiBosKullanim[g][ogr.ad] = mal[jj - 1].bos;
          }
          sonuc[k].oturum[o] = atama;
        }
      });
    }

    // GHesap CS:CV — ekranda görünen ad ve not
    function gorevBilgisi(salon, t, o, maliyet) {
      var g = salon.grup, ana = zm.ana[o][g], L = dersSayisi(salon, t, o);
      var ilkAna = 0, sonAna = 0;
      for (var h = 1; h <= SAAT_SAYISI; h++) if (ana[h]) { if (!ilkAna) ilkAna = h; sonAna = h; }
      var r = programSatiri[ad(salon.ad)];
      var notlar = [], v = t.vardiya[g], taban = g === 2 ? OGLE_ILK_DERS : SABAH_ILK_DERS;
      for (var i = 0; i < 4 && ilkAna; i++) {
        h = ilkAna + i;
        if (h > sonAna || h > SAAT_SAYISI) continue;
        var buSubede = r && (ad(r.t1[h - 1]) === t.ad || ad(r.t2[h - 1]) === t.ad);
        if (t.lb[h] > 0 || t.nobetci[g] || buSubede) continue;
        var x = h - taban + 1;
        if (h >= v.ilk && h <= v.son) notlar.push(x + '. ders boş saati: oturumda kalır');
        else if (h > v.son) notlar.push(x + '. ders (dersi bitti): oturum sonuna kadar kalır');
        else notlar.push(x + '. ders: okula erken gelir');
      }
      var nobetciYedek = t.nobetci[g] && L === 0;
      return {
        ogretmen: t.ad,
        yazi: t.kisa + (nobetciYedek ? ' (N)' : ''),
        nobetciYedek: nobetciYedek,
        not: notlar.join(', '),
        maliyet: maliyet
      };
    }

    return {
      gun: gun,
      gunAdi: gunAdi,
      saat: zm.oturumlar.slice(0, 2).map(function (o) { return o.yazi; }),
      ana: zm.ana,
      salonlar: sonuc,
      ogretmenler: ogretmenler
    };
  }

  var api = { dagit: dagit, macar: macar, zamanlama: zamanlama, gunNo: gunNo, GUNLER: GUNLER, HAZIRLAYAN: HAZIRLAYAN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else kok.Gozetmen = api;
})(this);
