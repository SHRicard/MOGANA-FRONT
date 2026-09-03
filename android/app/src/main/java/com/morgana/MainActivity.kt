package com.morgana

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.morgana.share.ShareIntentModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Morgana"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Compartir un comprobante **con la app cerrada**
   * (`docs/compartir_comprobante.md` §2.2).
   *
   * El intent viene en el arranque, muchísimo antes de que JS esté cargado, así
   * que lo único que se puede hacer acá es copiar la imagen y dejarla esperando.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    ShareIntentModule.recibir(this, intent)
  }

  /**
   * Compartir **con la app abierta en segundo plano**, que es el otro caso que
   * hay que cubrir sí o sí (§2.2).
   *
   * Con `launchMode="singleTask"` Android no crea una Activity nueva: reusa la
   * que ya está y entrega el intent por acá. Sin esto, compartir con la app
   * abierta la trae al frente y no pasa nada más.
   *
   * El `setIntent` es lo que hace que `getIntent()` deje de devolver el del
   * arranque: si no, cualquier cosa que lo lea después sigue viendo el viejo.
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    ShareIntentModule.recibir(this, intent)
  }
}
