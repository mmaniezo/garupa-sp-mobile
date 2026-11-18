package br.com.garupasp.sensorqueda

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.PowerManager
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val EVENTO = "onLeitura"

/** Teto de segurança do wake lock, caso o turno nunca peça para desligar. */
private const val LIMITE_WAKE_LOCK_MS = 12L * 60 * 60 * 1000

/**
 * Acelerômetro do detector de queda que segue funcionando com a tela bloqueada.
 *
 * O expo-sensors desliga o sensor sempre que o app vai para o segundo plano (é o padrão dele),
 * e é com a tela bloqueada que a queda importa. Aqui o sensor só desliga quando o turno pede:
 * o processo segue vivo pelo serviço em primeiro plano da localização (que também libera o
 * acesso ao sensor no Android 9+), e um wake lock parcial mantém o processador acordado para as
 * leituras chegarem uma a uma (20 por segundo), não em rajadas.
 */
class SensorQuedaModule : Module() {
  private var linha: HandlerThread? = null
  private var wakeLock: PowerManager.WakeLock? = null

  private val gerenciador: SensorManager?
    get() = appContext.reactContext?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  private val ouvinte = object : SensorEventListener {
    override fun onSensorChanged(event: SensorEvent) {
      val g = SensorManager.GRAVITY_EARTH
      // Hora em que o sensor leu (não a da entrega), no relógio de parede, em ms.
      val atrasoMs = (SystemClock.elapsedRealtimeNanos() - event.timestamp) / 1_000_000.0
      sendEvent(
        EVENTO,
        Bundle().apply {
          putDouble("x", (event.values[0] / g).toDouble())
          putDouble("y", (event.values[1] / g).toDouble())
          putDouble("z", (event.values[2] / g).toDouble())
          putDouble("em", System.currentTimeMillis() - atrasoMs)
        }
      )
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  }

  override fun definition() = ModuleDefinition {
    Name("GarupaSensorQueda")

    Events(EVENTO)

    Function("disponivel") {
      gerenciador?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null
    }

    Function("ligar") { intervaloMs: Int ->
      ligar(intervaloMs)
    }

    Function("desligar") {
      desligar()
    }

    OnDestroy {
      desligar()
    }
  }

  @Synchronized
  private fun ligar(intervaloMs: Int): Boolean {
    if (linha != null) return true
    val contexto = appContext.reactContext ?: return false
    val sensores = gerenciador ?: return false
    val acelerometro = sensores.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return false

    // Leituras numa linha própria: nada de disputar a linha principal (a da tela).
    val novaLinha = HandlerThread("garupa-sensor-queda").also { it.start() }
    val registrado = sensores.registerListener(ouvinte, acelerometro, intervaloMs * 1_000, 0, Handler(novaLinha.looper))
    if (!registrado) {
      novaLinha.quitSafely()
      return false
    }
    linha = novaLinha

    val energia = contexto.getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = energia.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "garupa:sensor-queda").apply {
      setReferenceCounted(false)
      acquire(LIMITE_WAKE_LOCK_MS)
    }
    return true
  }

  @Synchronized
  private fun desligar() {
    gerenciador?.unregisterListener(ouvinte)
    linha?.quitSafely()
    linha = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
  }
}
