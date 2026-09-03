package com.morgana.share

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Build
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import android.util.Log
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.File

/**
 * El puente de **compartir un comprobante a Morgana**
 * (`docs/compartir_comprobante.md`).
 *
 * Hace dos cosas, y las dos tienen que pasar del lado nativo:
 *
 * 1. **Recibe el `ACTION_SEND`** que despacha la hoja de compartir de Android.
 *    React Native no trae nada para esto: sin este módulo la app aparece en la
 *    hoja —el `intent-filter` alcanza para eso— pero se abre en el inicio como
 *    si nada hubiera pasado.
 *
 * 2. **Copia la imagen a un archivo nuestro apenas llega** (§2.3). Lo que
 *    entrega Android es un `content://`, no una ruta: el permiso de lectura dura
 *    lo que dura el intent, y entre que la imagen llega y el cliente termina de
 *    loguearse y de elegir la factura puede pasar un rato largo. Copiarlo acá y
 *    no en JS es lo único que garantiza que la copia salga mientras el permiso
 *    todavía vale.
 *
 * ⚠️ **La cola es estática a propósito.** Con la app cerrada el intent llega en
 * `onCreate`, mucho antes de que exista un contexto de React o de que JS esté
 * cargado. Guardarlo en una instancia del módulo sería perderlo: la instancia
 * todavía no existe.
 *
 * ⚠️ **`tomar` entrega y borra en el mismo paso.** Es lo que hace que el mismo
 * comprobante no se procese dos veces cuando JS pregunta al montar y otra vez al
 * volver a primer plano — que es exactamente lo que pasa al compartir con la app
 * en segundo plano.
 */
class ShareIntentModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NOMBRE

  /**
   * Devuelve el comprobante que esté esperando —y lo saca de la cola—, o `null`.
   *
   * Nunca rechaza: "no había nada compartido" es la respuesta normal, no un
   * error. Del lado de JS un `reject` acá obligaría a envolver en `try/catch`
   * el arranque de la app para el caso más común de todos.
   */
  @ReactMethod
  fun tomarComprobante(promise: Promise) {
    promise.resolve(tomar()?.aMapa())
  }

  companion object {
    const val NOMBRE = "ShareIntent"

    private const val TAG = "ShareIntent"

    /** Subcarpeta propia dentro de la caché: así se puede limpiar sin tocar nada más. */
    private const val CARPETA = "comprobantes"

    /**
     * Cuánto sobrevive una copia en disco.
     *
     * Es el mismo vencimiento que el doc le pone al pendiente de JS (§5.1): un
     * comprobante que aparece tres días después confunde más de lo que ayuda, y
     * dejar las imágenes acumuladas para siempre es ocupar el teléfono con
     * capturas que ya nadie va a mandar.
     */
    private const val VENCIMIENTO_MS = 24L * 60 * 60 * 1000

    /** Lo compartido y todavía no entregado a JS. Uno solo: el backend acepta uno. */
    @Volatile
    private var pendiente: ComprobanteCompartido? = null

    /**
     * Entra un intent. Lo llama `MainActivity` en `onCreate` (app cerrada) y en
     * `onNewIntent` (app en segundo plano): **los dos casos hacen falta**. Con
     * solo uno, la mitad de las veces compartir no hace nada y parece que la app
     * se rompió.
     *
     * Lo que no es un `ACTION_SEND` de imagen se ignora en silencio: por acá
     * pasa también el arranque normal desde el launcher.
     */
    @JvmStatic
    fun recibir(context: Context, intent: Intent?) {
      if (intent == null || intent.action != Intent.ACTION_SEND) {
        return
      }
      val uri = extraStream(intent)

      val resolver = context.contentResolver
      // El tipo del proveedor manda sobre el `intent.type`: el que comparte
      // declara lo que quiere, y quien tiene el archivo sabe qué es.
      val mimeType = uri?.let { resolver.getType(it) } ?: intent.type ?: MIME_POR_DEFECTO

      // Qué llegó, ANTES de descartar nada.
      //
      // No es ruido de desarrollo: Android NO deja ver el tipo del intent que
      // viaja adentro de un `ChooserActivity`, así que cuando una billetera no
      // nos ofrece en su hoja de compartir, esta es la única forma de saber por
      // qué. Poniendole al manifest un `intent-filter` que acepte cualquier
      // tipo se comparte desde la app que sea y acá queda escrito qué mandó de
      // verdad — asi se descubrio que Mercado Pago manda PDF:
      //
      //     adb logcat -s ShareIntent
      Log.i(TAG, "Llegó un SEND: declarado=${intent.type} real=$mimeType uri=$uri")

      // Sin `EXTRA_STREAM` no hay archivo: es un `SEND` de texto —un link, el
      // caso típico de "compartir el comprobante" que en realidad comparte una
      // página—, y de ahí no sale ninguna imagen.
      if (uri == null) {
        Log.w(TAG, "El SEND vino sin archivo (texto: ${intent.getStringExtra(Intent.EXTRA_TEXT)})")
        return
      }

      // Las dos formas en que llega un comprobante, y las dos entran: una captura
      // de pantalla o la foto del ticket vienen como imagen; Mercado Pago manda
      // un PDF. Un video o un audio no son un comprobante y se descartan acá, en
      // vez de subirlos para que el backend los rechace.
      //
      // El manifest ya declara solo imagen y PDF, así que en teoria no llega
      // otra cosa. Se revisa igual: un intent lo puede armar cualquiera a mano,
      // y el filtro del manifest es una sugerencia para la hoja de compartir,
      // no una garantia.
      val esPdf = mimeType == MIME_PDF
      val esImagen = mimeType.startsWith("image/")
      if (!esImagen && !esPdf) {
        Log.w(TAG, "Lo compartido no es ni imagen ni PDF ($mimeType); se descarta")
        return
      }

      // Cuanto pesa, ANTES de copiar nada.
      //
      // Es lo que evita escribir 300 MB en la cache del telefono para despues
      // descubrir que no se pueden subir. El proveedor no siempre lo informa
      // —de ahi el `null`—, asi que abajo se vuelve a medir el archivo ya
      // copiado, que es el dato que no puede mentir.
      val declarado = tamanoDe(context, uri)
      if (declarado != null && declarado > MAX_ORIGEN_BYTES) {
        Log.w(TAG, "Lo compartido pesa $declarado bytes, demasiado; se descarta sin copiar")
        return
      }

      try {
        limpiarVencidos(context)

        val ahora = System.currentTimeMillis()
        val copia = File(carpeta(context), "comprobante-$ahora.${extensionDe(mimeType)}")

        resolver.openInputStream(uri).use { entrada ->
          if (entrada == null) {
            Log.w(TAG, "El proveedor no devolvió nada para $uri")
            return
          }
          copia.outputStream().use { salida -> entrada.copyTo(salida) }
        }

        // Un archivo de cero bytes es el `400` de "vacío o cortado" del backend
        // esperando a pasar. Se corta acá: mejor no ofrecer nada que ofrecer
        // algo que no se va a poder subir.
        if (copia.length() == 0L) {
          copia.delete()
          Log.w(TAG, "Lo compartido llegó vacío; se descarta")
          return
        }

        // La misma medida, ahora sobre el archivo real. Cubre al proveedor que
        // no informo el tamano y al que informo cualquier cosa.
        if (copia.length() > MAX_ORIGEN_BYTES) {
          Log.w(TAG, "Lo compartido pesa ${copia.length()} bytes, demasiado; se descarta")
          copia.delete()
          return
        }

        /*
          Que se hace con lo que llego. Son tres caminos y ninguno confia en lo
          que dijo el proveedor:

          - Un PDF se convierte a JPEG, porque el backend solo guarda imagenes.
          - Una imagen que NO es de las cuatro que el backend acepta, o que se
            pasa del tope, se vuelve a codificar a JPEG. Es lo mismo que hace el
            picker al elegir de la galeria, y deja las dos entradas parejas: por
            cualquiera de las dos sale un archivo que sabemos subir.
          - Una imagen que ya cumple pasa tal cual. Recomprimirla seria perder
            calidad sin ganar nada.

          El efecto de fondo: lo unico que llega a subirse es una imagen que
          Android supo decodificar. Un archivo con la extension cambiada no
          decodifica y se descarta acá, no en el servidor.
        */
        val hayQueNormalizar = esImagen &&
          (!MIMES_ACEPTADOS.contains(mimeType) || copia.length() > MAX_SUBIDA_BYTES)

        val destino = when {
          esPdf -> aImagen(copia, ahora)
          hayQueNormalizar -> aJpeg(copia, ahora)
          else -> copia
        }
        if (destino == null) {
          copia.delete()
          return
        }
        val convertido = destino !== copia
        if (convertido) {
          // El original ya no sirve para nada: lo que se va a subir es el JPEG.
          copia.delete()
        }

        // La ultima red. Con 2000 px y calidad 85 un JPEG no llega ni cerca de
        // los 8 MB, asi que esto no deberia saltar nunca — y por eso mismo, si
        // salta, lo que sigue es no ofrecer nada.
        if (destino.length() > MAX_SUBIDA_BYTES) {
          Log.w(TAG, "Ni convertido entra en el tope (${destino.length()} bytes); se descarta")
          destino.delete()
          return
        }

        pendiente = ComprobanteCompartido(
          // Con esquema `file://` y no la ruta pelada: es la forma que entienden
          // igual el `<Image>` que lo muestra y el `FormData` que lo sube.
          archivo = Uri.fromFile(destino).toString(),
          // Lo que se manda es lo que quedó en disco, no lo que llegó: de un PDF
          // convertido sale un JPEG, y decirle al backend otra cosa sería
          // mentirle sobre lo que está por recibir.
          mimeType = if (convertido) MIME_POR_DEFECTO else mimeType,
          // Para lo convertido el nombre del proveedor termina en `.pdf` —o en
          // la extension que fuera— y ya no describe lo que se sube, así que se
          // usa el del archivo nuevo.
          nombre = if (convertido) destino.name else nombreDe(context, uri) ?: destino.name,
          bytes = destino.length(),
          recibidoEn = ahora,
        )
      } catch (e: Exception) {
        // Que falle una copia no puede tumbar el arranque de la app: quien
        // compartió ve la app abrirse en el inicio, que es raro pero se entiende.
        Log.e(TAG, "No se pudo copiar lo compartido", e)
      }
    }

    /** Entrega lo que haya y lo saca de la cola, en un solo paso. */
    @JvmStatic
    @Synchronized
    fun tomar(): ComprobanteCompartido? {
      val actual = pendiente
      pendiente = null
      return actual
    }

    private const val MIME_POR_DEFECTO = "image/jpeg"

    private const val MIME_PDF = "application/pdf"

    /**
     * Los formatos que el backend guarda (`README_FRONT_COMPROBANTES` seccion 1).
     *
     * Es la misma lista que aplica el picker del lado de JS
     * (`TIPOS_DE_COMPROBANTE` en `features/mi/types.ts`), repetida acá porque
     * Kotlin no puede leer aquello. Estan los dos nombres del JPEG —hay
     * proveedores de Android que declaran `image/jpg`, que no es un mime real— y
     * los dos del HEIC del iPhone.
     *
     * Lo que NO esta en la lista no se rechaza: se recodifica a JPEG. Ver el
     * comentario de los tres caminos en `recibir`.
     */
    private val MIMES_ACEPTADOS = setOf(
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    )

    /**
     * El tope del backend: 8 MB. Es lo que puede pesar lo que se ofrece a subir.
     *
     * Tiene que coincidir con `MAX_COMPROBANTE_BYTES` del lado de JS. Si alguna
     * vez dejan de coincidir, el que manda es el mas chico: el otro deja pasar
     * algo que el siguiente rechaza.
     */
    private const val MAX_SUBIDA_BYTES = 8L * 1024 * 1024

    /**
     * Lo mas grande que estamos dispuestos a **leer**, aunque no se suba asi.
     *
     * Es mas alto que el tope de subida a proposito, y la diferencia es todo el
     * punto: una foto de 12 MP o un PDF de banco pasan holgados los 8 MB y sin
     * embargo son comprobantes perfectamente validos — lo que se sube de ellos
     * es la version reescalada, que pesa cientos de kB. Cortar en 8 MB acá seria
     * rechazar el caso normal.
     *
     * Lo que este numero corta es otra cosa: el video de 400 MB que alguien
     * comparte por error, que no tiene sentido ni copiar a la cache del
     * telefono.
     */
    private const val MAX_ORIGEN_BYTES = 25L * 1024 * 1024

    /**
     * El lado largo, en pixeles, de cualquier JPEG que salga de acá: el de un
     * PDF renderizado y el de una imagen recodificada.
     *
     * Con 2000 el numero de operacion se lee sin agrandar y el archivo queda muy
     * por debajo de los 8 MB que acepta el backend. Es el mismo valor que usa el
     * picker del lado de JS, y no es casualidad: por las dos entradas tiene que
     * salir un comprobante que se lea igual.
     */
    private const val LADO_MAXIMO = 2000

    /** Suficiente para leer un comprobante; de más solo agrega megas. */
    private const val CALIDAD_JPEG = 85

    /**
     * Convierte la **primera página** de un PDF a un JPEG.
     *
     * Existe por un motivo muy concreto: **Mercado Pago comparte el comprobante
     * como PDF**, no como imagen (verificado en el log del teléfono, el intent
     * llega con `application/pdf`), y el backend solo guarda imágenes. Sin esto
     * el caso de uso que pidió el negocio —pagar en la billetera y compartir a
     * Morgana— no funciona.
     *
     * Usa `PdfRenderer`, que viene **en el propio Android** desde la API 21: no
     * hace falta ninguna dependencia, y una menos que mantener.
     *
     * **Solo la página 1.** Un comprobante de pago es de una página; si alguna
     * vez llega uno de varias, la primera es la que tiene los datos.
     *
     * Devuelve `null` si no se pudo: un PDF con contraseña, uno corrupto, o uno
     * que Android no sabe abrir. Quien llama descarta y no ofrece nada, que es
     * mejor que ofrecer un archivo que después no se va a poder subir.
     */
    private fun aImagen(pdf: File, ahora: Long): File? {
      var descriptor: ParcelFileDescriptor? = null
      var renderer: PdfRenderer? = null

      return try {
        descriptor = ParcelFileDescriptor.open(pdf, ParcelFileDescriptor.MODE_READ_ONLY)
        renderer = PdfRenderer(descriptor)

        if (renderer.pageCount == 0) {
          Log.w(TAG, "El PDF no tiene páginas; se descarta")
          return null
        }
        if (renderer.pageCount > 1) {
          Log.i(TAG, "El PDF tiene ${renderer.pageCount} páginas; se usa la primera")
        }

        renderer.openPage(0).use { pagina ->
          // El alto y el ancho vienen en puntos (1/72"). La escala la elegimos
          // por el lado largo para que una página apaisada no salga diminuta.
          val escala = LADO_MAXIMO.toFloat() / maxOf(pagina.width, pagina.height)
          val ancho = (pagina.width * escala).toInt().coerceAtLeast(1)
          val alto = (pagina.height * escala).toInt().coerceAtLeast(1)

          val bitmap = Bitmap.createBitmap(ancho, alto, Bitmap.Config.ARGB_8888)
          // ⚠️ **Fondo blanco primero.** Un PDF se dibuja sobre transparente y
          // el JPEG no tiene canal alfa: sin esto el comprobante sale negro
          // entero, con el texto invisible.
          Canvas(bitmap).drawColor(Color.WHITE)
          pagina.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

          val destino = File(pdf.parentFile, "comprobante-$ahora.jpg")
          destino.outputStream().use { salida ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, CALIDAD_JPEG, salida)
          }
          bitmap.recycle()

          Log.i(TAG, "PDF convertido a ${destino.name} (${destino.length()} bytes)")
          destino
        }
      } catch (e: Exception) {
        // Con contraseña tira SecurityException; corrupto, IOException. En los
        // dos casos lo que sigue es pedir otra cosa, no reintentar.
        Log.e(TAG, "No se pudo convertir el PDF a imagen", e)
        null
      } finally {
        renderer?.close()
        descriptor?.close()
      }
    }

    /**
     * Vuelve a codificar una imagen **a un JPEG nuestro**, reescalada.
     *
     * Es la misma normalizacion que hace el picker al elegir de la galeria
     * (2000 px de lado largo, calidad 85), aplicada a lo que llega por la hoja
     * de compartir. Sirve para dos cosas a la vez:
     *
     * - **Bajar de peso** lo que se paso del tope, que es lo comun: una foto de
     *   la camara del telefono pasa los 8 MB sin esfuerzo y despues del pase
     *   queda en menos de un mega.
     * - **Sacarle el formato raro** a lo que no es de los cuatro que el backend
     *   guarda: un GIF, un BMP, un TIFF. Sale un JPEG y entra igual.
     *
     * Y de yapa, la parte que mas seguridad da: **lo que Android no puede
     * decodificar como imagen devuelve `null` y se descarta acá**. Un archivo al
     * que le cambiaron la extension no sobrevive a este paso.
     *
     * ⚠️ Decodifica en dos pasos, con `inJustDecodeBounds` primero. No es un
     * adorno: una foto de 12000x9000 son 432 MB en memoria como ARGB_8888 y
     * tumba la app antes de llegar a comprimir nada. `inSampleSize` la trae ya
     * achicada desde el decodificador.
     */
    private fun aJpeg(origen: File, ahora: Long): File? =
      try {
        val medida = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(origen.path, medida)

        val ladoOriginal = maxOf(medida.outWidth, medida.outHeight)
        if (ladoOriginal <= 0) {
          Log.w(TAG, "Lo compartido no se pudo decodificar como imagen; se descarta")
          null
        } else {
          // Potencia de 2 mas grande que deje el lado largo por encima del
          // objetivo: de ahi al tamano exacto lo lleva el escalado de abajo, que
          // filtra mejor que el decodificador.
          var muestreo = 1
          while (ladoOriginal / (muestreo * 2) >= LADO_MAXIMO) {
            muestreo *= 2
          }

          val opciones = BitmapFactory.Options().apply { inSampleSize = muestreo }
          val decodificado = BitmapFactory.decodeFile(origen.path, opciones)

          if (decodificado == null) {
            Log.w(TAG, "Lo compartido no se pudo decodificar como imagen; se descarta")
            null
          } else {
            val lado = maxOf(decodificado.width, decodificado.height)
            // Solo se achica, nunca se agranda: estirar una captura chica no
            // agrega un pixel de informacion y multiplica el peso.
            val escala = if (lado > LADO_MAXIMO) LADO_MAXIMO.toFloat() / lado else 1f
            val ancho = (decodificado.width * escala).toInt().coerceAtLeast(1)
            val alto = (decodificado.height * escala).toInt().coerceAtLeast(1)

            val listo =
              if (escala < 1f) {
                Bitmap.createScaledBitmap(decodificado, ancho, alto, true)
              } else {
                decodificado
              }

            val destino = File(origen.parentFile, "comprobante-$ahora.jpg")
            destino.outputStream().use { salida ->
              listo.compress(Bitmap.CompressFormat.JPEG, CALIDAD_JPEG, salida)
            }
            if (listo !== decodificado) {
              listo.recycle()
            }
            decodificado.recycle()

            Log.i(TAG, "Imagen normalizada a ${destino.name} (${destino.length()} bytes)")
            destino
          }
        }
      } catch (e: Exception) {
        // `OutOfMemoryError` no entra acá y es a proposito: es un `Error`, no una
        // `Exception`, y taparlo dejaria la app en un estado del que no se vuelve.
        Log.e(TAG, "No se pudo normalizar la imagen", e)
        null
      }

    /**
     * Lo que dice pesar el archivo del otro lado del `content://`, o `null`.
     *
     * Se pregunta antes de copiar, que es cuando todavia sirve de algo. `null`
     * es una respuesta normal: hay proveedores que no completan la columna, y
     * por eso el tamano se vuelve a medir sobre la copia.
     */
    private fun tamanoDe(context: Context, uri: Uri): Long? =
      try {
        context.contentResolver
          .query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)
          ?.use { cursor ->
            val columna = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (columna >= 0 && cursor.moveToFirst() && !cursor.isNull(columna)) {
              cursor.getLong(columna)
            } else {
              null
            }
          }
      } catch (e: Exception) {
        Log.w(TAG, "No se pudo leer el tamaño de $uri", e)
        null
      }

    private fun carpeta(context: Context): File =
      File(context.cacheDir, CARPETA).apply { mkdirs() }

    /**
     * Borra las copias de más de 24 h.
     *
     * Corre al recibir y no en un job aparte: es el único momento en que hace
     * falta, y es cuando ya sabemos que estamos por escribir una nueva.
     */
    private fun limpiarVencidos(context: Context) {
      val limite = System.currentTimeMillis() - VENCIMIENTO_MS
      carpeta(context).listFiles()?.forEach { archivo ->
        if (archivo.lastModified() < limite) {
          archivo.delete()
        }
      }
    }

    /**
     * La extensión que le corresponde al tipo real. **No es un detalle
     * cosmético**: sin extensión algunos servidores no adivinan el tipo (§4,
     * trampa 3), y el `name` del `FormData` sale de acá.
     */
    private fun extensionDe(mimeType: String): String =
      MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "jpg"

    /** El nombre que le muestra el proveedor a la persona, si lo tiene. */
    private fun nombreDe(context: Context, uri: Uri): String? =
      try {
        context.contentResolver
          .query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
          ?.use { cursor ->
            val columna = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (columna >= 0 && cursor.moveToFirst()) cursor.getString(columna) else null
          }
      } catch (e: Exception) {
        // Un proveedor puede no soportar la consulta. El nombre es lo menos
        // importante de todo esto: se sigue con el que inventamos.
        Log.w(TAG, "No se pudo leer el nombre de $uri", e)
        null
      }

    @Suppress("DEPRECATION")
    private fun extraStream(intent: Intent): Uri? =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
      } else {
        intent.getParcelableExtra(Intent.EXTRA_STREAM)
      }

    /**
     * El mapa que cruza a JS. Se arma acá y no al recibir: un `WritableMap` se
     * consume una sola vez al pasar el puente, así que guardarlo en la cola
     * sería entregar un objeto ya vaciado.
     */
    private fun ComprobanteCompartido.aMapa(): WritableMap =
      Arguments.createMap().apply {
        putString("archivo", archivo)
        putString("mimeType", mimeType)
        putString("nombre", nombre)
        // `Double` y no `Int`: el puente de RN no tiene enteros de 64 bits, y
        // un `Double` representa exacto cualquier tamaño de archivo real.
        putDouble("bytes", bytes.toDouble())
        putDouble("recibidoEn", recibidoEn.toDouble())
      }
  }
}
