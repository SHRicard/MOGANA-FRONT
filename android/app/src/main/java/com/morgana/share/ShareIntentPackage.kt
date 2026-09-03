package com.morgana.share

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registra el `ShareIntentModule`. Se agrega a mano en `MainApplication`: el
 * autolinking descubre paquetes de npm, y este vive dentro de la app.
 */
class ShareIntentPackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(ShareIntentModule(reactContext))

  /** No aporta ninguna vista: esto es solo un puente de datos. */
  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
