#!/usr/bin/env bash
# Instala o APK no emulador, abre o app e confere se ele continua aberto.
# Se fechar, o trecho do log com o erro vira uma anotação do run (visível na página do Actions).
set -u
PACOTE=br.com.garupasp.app
ESPERA=${ESPERA:-30}

anotar() { # $1 = error|notice, $2 = título, $3 = arquivo com o texto
  local msg
  msg=$(head -c 60000 "$3" | sed 's/%/%25/g; s/\r//g' | sed ':a;N;$!ba;s/\n/%0A/g')
  echo "::$1 title=$2::$msg"
}

adb devices
if ! adb install -r -g app.apk > instalar.txt 2>&1; then
  cat instalar.txt
  anotar error "Não instalou" instalar.txt
  exit 1
fi

adb logcat -c
adb shell monkey -p "$PACOTE" -c android.intent.category.LAUNCHER 1
sleep "$ESPERA"
adb logcat -d -v brief > logcat.txt

# Erro nativo, de Java/Kotlin ou de JavaScript que fecha o app.
grep -n -E "FATAL EXCEPTION|AndroidRuntime|E/ReactNativeJS|ReactNativeJS.*(Error|Exception)|Fatal signal|F/DEBUG|F/libc|Abort message|E/unknown:ReactNative|expo.modules|SoLoader|UnsatisfiedLink|ClassNotFound|NoSuchMethod" logcat.txt \
  | head -150 > erro.txt

if adb shell pidof "$PACOTE" > /dev/null; then
  echo "O app continua aberto depois de ${ESPERA} s."
  adb exec-out screencap -p > tela.png || true
  [ -s erro.txt ] && anotar notice "Avisos no log" erro.txt
  exit 0
fi

echo "O app fechou."
cat erro.txt
[ -s erro.txt ] || tail -150 logcat.txt > erro.txt
anotar error "O app fechou" erro.txt
exit 1
