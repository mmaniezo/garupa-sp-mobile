package br.com.garupasp.smssocorro

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.react.androidContext

/**
 * SMS de socorro: com o SOS disparado (queda sem resposta, pulseira ou SOS manual), avisa os
 * contatos de emergência com a localização, sem depender de internet nem de tocar em "enviar".
 * Só funciona com a permissão SEND_SMS concedida; sem ela, o app abre o SMS pronto para enviar.
 */
@ExpoModule("GarupaSmsSocorro")
class SmsSocorroModule : Module() {
  @JS
  fun podeEnviar(): Boolean =
    androidContext.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

  @JS
  fun enviar(numero: String, texto: String): Boolean {
    if (!podeEnviar() || numero.isBlank() || texto.isBlank()) return false
    return try {
      val sms: SmsManager =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          androidContext.getSystemService(SmsManager::class.java)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }
      val partes = sms.divideMessage(texto)
      if (partes.size > 1) {
        sms.sendMultipartTextMessage(numero, null, partes, null, null)
      } else {
        sms.sendTextMessage(numero, null, texto, null, null)
      }
      true
    } catch (e: Exception) {
      false
    }
  }
}
