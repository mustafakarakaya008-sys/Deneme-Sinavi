#!/bin/sh
# Testleri Mac'te hazır gelen JavaScript motoruyla (jsc) çalıştırır.
# Kullanım: sh tests/calistir.sh   (ayrıntılı fark listesi için: sh tests/calistir.sh --ayrinti)
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
echo "== Gözetmen kural testleri"
"$JSC" tests/gozetmen.test.js
echo ""
echo "== Öğrenci dağıtımı kural testleri"
"$JSC" tests/ogrenci.test.js
echo ""
echo "== Excel v8 karşılaştırması: gözetmen"
"$JSC" tests/karsilastir.js -- "$@"
echo ""
echo "== Excel v8 karşılaştırması: öğrenci"
"$JSC" tests/karsilastir_ogrenci.js -- "$@"
