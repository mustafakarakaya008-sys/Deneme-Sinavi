// Excel v8 sonuçlarıyla karşılaştırma. Çalıştırma: tests/calistir.sh
// veriler/excel_v8_sonuclar.json yerel dosyadır, GitHub'a gitmez.
load('src/gozetmen.js');
var veri = JSON.parse(readFile('veriler/hazir_veri.json'));
var excel = JSON.parse(readFile('veriler/excel_v8_sonuclar.json'));
var ayrinti = typeof arguments !== 'undefined' && arguments.indexOf('--ayrinti') >= 0;

var toplam = { hucre: 0, ad: 0, not: 0 };
Object.keys(excel.gunler).sort().forEach(function (g) {
  var ex = excel.gunler[g];
  var biz = Gozetmen.dagit(veri, { gunNo: Number(g) });
  var bizSalon = {};
  biz.salonlar.forEach(function (s) { bizSalon[s.salon] = s; });
  var say = { hucre: 0, ad: 0, not: 0 }, farklar = [];
  ex.forEach(function (e) {
    var b = bizSalon[e.salon];
    [['o1', 'n1', 0], ['o2', 'n2', 1]].forEach(function (k) {
      var a = b && b.oturum[k[2]];
      var bAd = a ? a.yazi : '', bNot = a ? a.not : '';
      say.hucre++;
      if (bAd === e[k[0]]) say.ad++; else farklar.push(e.salon + ' ' + (k[2] + 1) + '. oturum ad: Excel="' + e[k[0]] + '" web="' + bAd + '"');
      if (bNot === e[k[1]]) say.not++; else farklar.push(e.salon + ' ' + (k[2] + 1) + '. oturum not: Excel="' + e[k[1]] + '" web="' + bNot + '"');
    });
  });
  print(Gozetmen.GUNLER[g - 1] + ': ' + say.ad + '/' + say.hucre + ' gözetmen aynı, ' + say.not + '/' + say.hucre + ' not aynı');
  if (ayrinti) farklar.forEach(function (f) { print('   ' + f); });
  toplam.hucre += say.hucre; toplam.ad += say.ad; toplam.not += say.not;
});
print('TOPLAM: ' + toplam.ad + '/' + toplam.hucre + ' gözetmen, ' + toplam.not + '/' + toplam.hucre + ' not aynı');
