package br.com.garupasp.telabloqueio

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.view.WindowManager
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.react.androidContext
import io.github.expo.modules.v2.react.currentActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * RF22: a testemunha precisa ver a ficha médica sem desbloquear o celular.
 * Enquanto houver SOS ativo, a tela do app pode aparecer por cima da tela de bloqueio.
 * Fora do SOS, o app volta ao normal (só abre depois de desbloquear).
 */
@ExpoModule("GarupaTelaBloqueio")
class TelaBloqueioModule : Module() {
  @JS
  suspend fun definirSobreBloqueioAsync(ativo: Boolean): Boolean = withContext(Dispatchers.Main) {
    val activity = currentActivity ?: return@withContext false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(ativo)
      activity.setTurnScreenOn(ativo)
    } else {
      @Suppress("DEPRECATION")
      val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      if (ativo) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
    }
    true
  }

  @JS
  fun estaBloqueado(): Boolean {
    val keyguard = androidContext.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    return keyguard.isKeyguardLocked
  }
}
