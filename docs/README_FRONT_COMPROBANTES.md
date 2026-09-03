# README — Comprobantes en el front (React Native)

Guía para implementar en la app lo que el backend ya expone: **adjuntar el
comprobante de pago** y **recibirlo desde la hoja de compartir de Android**.

---

## 0. Antes que nada: qué está hecho y qué no

| | Estado |
|---|---|
| Backend: endpoint que recibe la imagen | ✅ **hecho y probado** |
| Backend: guardado en Cloudinary, URLs firmadas, borrado | ✅ **hecho, probado contra la cuenta real** |
| Backend: panel del administrador para limpiar el store | ✅ **hecho y probado** |
| **Front: input para adjuntar** | ✅ **hecho** — `SelectorDeComprobante`, en el formulario de "Avisar que pagué" |
| **Front: recibir el share de Android** | ✅ **hecho** — módulo nativo propio en `android/…/share/` |

**Nada del código de este documento fue ejecutado.** Es una guía escrita contra
el contrato real del backend (que sí está verificado), pero las piezas de React
Native las tenés que probar vos en tu proyecto. Donde hay una decisión que
depende de tu app —el navegador, el store de sesión— está marcada.

> ⚠️ **Este proyecto es bare React Native, no Expo**, así que los `npx expo
> install` del §2 y el `app.json` del §5.1 no aplican. Lo que se usó acá:
>
> | Del README | Lo que hay en el repo |
> |---|---|
> | `expo-image-picker` | **`react-native-image-picker`**, detrás de `@/services/imagenes` |
> | `expo-file-system` (copiar el `content://`) | el **módulo nativo en Kotlin** lo copia en `onCreate`/`onNewIntent`, que es cuando el permiso todavía vale |
> | `expo-share-intent` | `android/app/src/main/java/com/morgana/share/`, detrás de `@/services/share` |
> | `AsyncStorage` para el pendiente | **MMKV** vía `storageService` + un slice de Redux |
>
> Y una corrección al §5.2: acá la copia se hace **del lado nativo**, no en JS.
> Copiando desde JS el intent ya pasó, y el `content://` puede haber dejado de
> servir — que es exactamente el bug de *"a veces funciona y a veces dice que el
> archivo llegó vacío"* que el doc advierte.

El contrato del backend, con los errores textuales, está en
[`flujo_comprobantes.md`](./flujo_comprobantes.md).

---

## 1. El contrato, en una pantalla

```http
POST /api/mi/facturas/:facturaId/informar-pago
Authorization: Bearer <token>
Content-Type: multipart/form-data     ← lo escribe el runtime, NO vos
```

| Campo | | |
|---|---|---|
| `monto` | obligatorio | número crudo: `8810.50`. **Sin separador de miles** |
| `medio` | obligatorio | `transferencia` · `efectivo` · `mercado_pago` · `deposito` · `otro` |
| `fecha` | opcional | `AAAA-MM-DD`. Sin esto, hoy |
| `referencia` | opcional | hasta 120 caracteres |
| `nota` | opcional | hasta 500 caracteres |
| `comprobante` | **según el medio** | el archivo |

**Cuándo es obligatorio el comprobante:**

```
transferencia · mercado_pago · deposito  →  OBLIGATORIO
efectivo · otro                          →  opcional
```

**Qué se acepta:** JPG, PNG, WebP o HEIC. Hasta **8 MB**. **Una** por aviso.
PDF no.

**Sigue aceptando JSON.** Si no hay archivo, mandá el body de siempre y funciona
igual. El multipart es el camino nuevo, no el único.

---

## 2. Dependencias

```bash
# Elegir la imagen desde la galería o la cámara
npx expo install expo-image-picker

# Copiar el archivo compartido a un lugar propio (§5.2)
npx expo install expo-file-system

# Recibir la hoja de compartir de Android
npx expo install expo-share-intent
```

> **Bare React Native** (sin Expo): `react-native-image-picker`,
> `react-native-fs` y `react-native-receive-sharing-intent`. La lógica es la
> misma; cambian los nombres de las funciones.

> ⚠️ **El share intent no funciona en Expo Go.** Necesita un *development
> build* (`npx expo prebuild` + `npx expo run:android`). Si probás en Expo Go, la
> app no va a aparecer en la hoja de compartir y vas a pensar que está mal el
> código.

---

## 3. La función que sube — empezá por acá

Es la pieza central y la comparten las dos pantallas. Ponela en
`src/api/comprobantes.js`.

```js
const API = process.env.EXPO_PUBLIC_API_URL; // https://tu-back/api

/**
 * Avisa que se pagó una factura, con o sin comprobante.
 *
 * `comprobante` es { uri, name, type } o null.
 */
export async function informarPago({ token, facturaId, datos, comprobante }) {
  const cuerpo = new FormData();

  // ⚠️ Todo va como string: es multipart. El backend lo convierte.
  cuerpo.append('monto', String(datos.monto));
  cuerpo.append('medio', datos.medio);

  if (datos.fecha) cuerpo.append('fecha', datos.fecha);
  if (datos.referencia) cuerpo.append('referencia', datos.referencia);
  if (datos.nota) cuerpo.append('nota', datos.nota);

  if (comprobante) {
    // ⚠️ En React Native el archivo NO es un Blob: es este objeto.
    cuerpo.append('comprobante', {
      uri: comprobante.uri,
      name: comprobante.name ?? 'comprobante.jpg',
      type: comprobante.type ?? 'image/jpeg',
    });
  }

  const respuesta = await fetch(
    `${API}/mi/facturas/${facturaId}/informar-pago`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // ⚠️ NO pongas Content-Type. El runtime tiene que escribirlo él para
        // incluir el `boundary`; forzado, el backend no encuentra el archivo.
      },
      body: cuerpo,
    },
  );

  const json = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    // El backend siempre devuelve { message } y el texto ya está escrito para
    // mostrarse tal cual. No lo reescribas.
    const error = new Error(json.message ?? 'No pudimos enviar el aviso.');
    error.status = respuesta.status;
    throw error;
  }

  return json;
}
```

### Las cuatro trampas de `FormData` en React Native

1. **El archivo es `{ uri, name, type }`**, no un `Blob` ni un `File`.
2. **No seteés `Content-Type`.** Es el error más común y el síntoma confunde: el
   backend contesta *"Adjuntá la captura del comprobante"* como si no hubieras
   mandado nada.
3. **`name` con extensión.** Cuesta cero y evita rarezas.
4. **El `type` que mandes no decide nada.** El backend verifica el formato real
   por los primeros bytes. No hace falta que aciertes el mime.

---

## 4. Pantalla A — el input de adjuntar (lo que no ves hoy)

Va en el formulario que ya tenés de "Avisar que pagué".

```jsx
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Button, Image, Text, View } from 'react-native';

const MEDIOS_CON_COMPROBANTE = ['transferencia', 'mercado_pago', 'deposito'];
const OCHO_MB = 8 * 1024 * 1024;

export function AdjuntarComprobante({ medio, valor, onCambio }) {
  const obligatorio = MEDIOS_CON_COMPROBANTE.includes(medio);

  async function elegir(desdeCamara) {
    const permiso = desdeCamara
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert('Necesitamos permiso para acceder a las fotos.');
      return;
    }

    const opciones = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // Comprimir acá ahorra datos del cliente y evita el 413. El backend
      // igual la vuelve a achicar al guardarla.
      quality: 0.7,
      allowsEditing: false,
    };

    const resultado = desdeCamara
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);

    if (resultado.canceled) return;

    const imagen = resultado.assets[0];

    if (imagen.fileSize > OCHO_MB) {
      Alert.alert('La imagen es muy pesada', 'El máximo son 8 MB.');
      return;
    }

    onCambio({
      uri: imagen.uri,
      name: imagen.fileName ?? 'comprobante.jpg',
      type: imagen.mimeType ?? 'image/jpeg',
    });
  }

  return (
    <View>
      <Text>Comprobante {obligatorio ? '(obligatorio)' : '(opcional)'}</Text>

      {valor ? (
        <View>
          <Image
            source={{ uri: valor.uri }}
            style={{ width: 120, height: 160, borderRadius: 8 }}
          />
          <Button title="Quitar" onPress={() => onCambio(null)} />
        </View>
      ) : (
        <View>
          <Button title="Elegir de la galería" onPress={() => elegir(false)} />
          <Button title="Sacar una foto" onPress={() => elegir(true)} />
        </View>
      )}

      {obligatorio && !valor && (
        <Text style={{ color: '#b00' }}>
          En {medio} necesitamos la captura del comprobante.
        </Text>
      )}
    </View>
  );
}
```

**Reglas de la pantalla:**

- el campo cambia entre obligatorio y opcional **según el `<select>` de medio**;
- el botón de enviar se deshabilita si es obligatorio y no hay imagen — no dejes
  que el 400 sea el que enseñe la regla;
- mostrá **siempre la miniatura** de lo que eligió, antes de mandar.

---

## 5. Pantalla B — recibir el share de Android

Este es el flujo que pediste: el cliente paga en Mercado Pago, toca
**Compartir**, elige Morgana, y adentro elige la factura.

```
Mercado Pago              Android                 Morgana
[Compartir] ──────────►  [WhatsApp][Morgana] ──►  llega la imagen
                                                  ├─ ¿hay sesión?
                                                  ├─ ¿a qué factura?
                                                  ├─ monto / medio / fecha
                                                  └─ POST informar-pago
```

### 5.1 El `intent-filter`

Sin esto **la app no aparece** en la hoja de compartir.

Con Expo, en `app.json`:

```json
{
  "expo": {
    "plugins": [
      ["expo-share-intent", { "androidIntentFilters": ["image/*"] }]
    ]
  }
}
```

Y después `npx expo prebuild`.

En bare RN, en `android/app/src/main/AndroidManifest.xml`, dentro del
`<activity>` principal:

```xml
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="image/*" />
</intent-filter>
```

> ⚠️ **No agregues `SEND_MULTIPLE`.** El backend acepta un comprobante por
> aviso: aparecer en el share de varias imágenes es prometer algo que después
> hay que rechazar.

### 5.2 ⚠️ Lo que Android te da NO es un archivo

Android entrega un URI de content provider
(`content://media/external/images/...`). Sirve para leerlo, pero:

- **el permiso muere con el intent.** Si el cliente tiene que loguearse antes de
  subir, para cuando vuelva ese URI puede ya no servir;
- puede no tener nombre ni extensión.

**Por eso lo primero es copiarlo a un archivo propio.** Es el paso que más se
olvida y el que produce el bug más difícil de entender: *"a veces funciona y a
veces dice que el archivo llegó vacío"*.

```js
import * as FileSystem from 'expo-file-system';

async function guardarCopia(uriCompartida) {
  const destino = `${FileSystem.cacheDirectory}comprobante-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uriCompartida, to: destino });
  return destino;
}
```

### 5.3 Recibir el intent

```js
import { useShareIntent } from 'expo-share-intent';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useComprobanteCompartido() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;

    (async () => {
      const archivo = shareIntent.files?.[0];
      if (!archivo) return;

      // 1. copiar YA, antes de cualquier otra cosa (§5.2)
      const copia = await guardarCopia(archivo.path);

      // 2. guardarlo como pendiente: puede que haya que loguearse antes
      await AsyncStorage.setItem(
        'comprobantePendiente',
        JSON.stringify({
          uri: copia,
          name: archivo.fileName ?? 'comprobante.jpg',
          type: archivo.mimeType ?? 'image/jpeg',
          recibidoEn: Date.now(),
        }),
      );

      resetShareIntent();

      // 3. y recién ahora decidir a dónde mandarlo
      navegarSegunSesion();
    })();
  }, [hasShareIntent]);
}
```

⚠️ **Tenés que manejar los dos casos**: la app **cerrada** (el intent llega en el
arranque) y la app **abierta en segundo plano** (llega por el hook). Si solo
enganchás el segundo, compartir con la app cerrada no hace nada.

### 5.4 La pantalla de elegir factura

```
┌──────────────────────────────────────┐
│  [miniatura del comprobante]         │  ← primero: que vea que llegó bien
│                                      │
│  ¿A qué factura corresponde?         │
│  ┌────────────────────────────────┐  │
│  │ #1070  vence 04/07  debe $8.810│  │  ← vencidas arriba
│  │ #1074  vence 23/09  debe $30.000│ │
│  └────────────────────────────────┘  │
│                                      │
│  Monto        [ 8.810,50        ]    │  ← precargado con el saldo
│  Medio        [ Transferencia ▾ ]    │
│  Fecha        [ hoy             ]    │
│  Referencia   [ ej. OP-88213345 ]    │
│                                      │
│         [ Avisar que pagué ]         │
└──────────────────────────────────────┘
```

La lista sale de un endpoint que agregué para esto:

```http
GET /api/mi/facturas?soloImpagas=true&limite=50
```

`soloImpagas=true` deja **solo las que deben algo**: ni pagadas ni anuladas, que
no son candidatas posibles para un comprobante.

```js
const { facturas } = await pedir('/mi/facturas?soloImpagas=true&limite=50');

// Lo que vence primero es lo que probablemente pagó.
const ordenadas = facturas.sort((a, b) =>
  a.fechaFin.localeCompare(b.fechaFin),
);
```

**Cuatro decisiones de diseño que importan:**

1. **la miniatura va arriba de todo** — viene de otra app y necesita ver que se
   compartió lo que quería antes de completar campos;
2. **si tiene una sola factura impaga, salteá el selector** y mostrala ya
   elegida, con opción de cambiarla;
3. **el monto viene precargado con el `saldo`** de la factura elegida, editable;
4. **`medio` no viene en el share** — Android manda la imagen, no de dónde salió.
   Dejá `transferencia` como default y recordá el último que usó.

---

## 6. Los casos que rompen el flujo si no los resolvés

### 6.1 Comparte sin estar logueado

El más común: instaló la app hace un mes y la sesión venció.

**Nunca descartes la imagen.** Si al volver del login no está, tiene que ir a
Mercado Pago y compartir de nuevo — y ahí perdiste el flujo entero. Por eso el
§5.3 guarda el pendiente **antes** de mirar la sesión.

```js
// después del login, en el arranque
const crudo = await AsyncStorage.getItem('comprobantePendiente');
if (crudo) {
  const pendiente = JSON.parse(crudo);

  // Vencelos a las 24 h: uno de hace tres días confunde más de lo que ayuda.
  const vencido = Date.now() - pendiente.recibidoEn > 24 * 60 * 60 * 1000;

  if (vencido) await AsyncStorage.removeItem('comprobantePendiente');
  else navegarA('ElegirFactura', pendiente);
}
```

### 6.2 Tiene el perfil incompleto

`/mi` está detrás de un guard: **sin DNI cargado, todo `/mi` da 403** con
`Tenés que completar tu perfil`. Mismo tratamiento que el login: guardar el
pendiente, mandar a completar el DNI, volver.

### 6.3 No tiene ninguna factura impaga

Pagó, ya se lo confirmaron, y comparte igual. Decilo con todas las letras —*"no
tenés facturas pendientes"*— y ofrecé ver la cuenta. **No dejes un selector
vacío.**

### 6.4 Ya avisó un pago de esa factura

El backend cuenta los avisos pendientes contra el saldo:

```
Ya avisaste $8.810,50 sin confirmar de esta factura, así que queda $0,00 por informar.
```

Es un 400 y hay que mostrarlo tal cual. En el selector conviene marcar las
facturas que ya tienen un aviso esperando.

### 6.5 Comparte algo que no es un comprobante

Una foto del gato. El backend no puede saberlo —una imagen es una imagen— así que
entra igual y lo resuelve el administrador rechazando el aviso con su motivo.
**No intentes adivinarlo en el front.**

---

## 7. Errores: qué hacer con cada uno

Todos vienen como `{ "message": "<texto>" }`, ya escrito para mostrarse tal cual.

| Código | Qué pasó | Qué hacer |
|---|---|---|
| **400** falta el comprobante | el archivo no viajó | casi siempre es el `Content-Type` forzado (§3, trampa 2) |
| **400** no es una imagen | compartió un PDF o algo raro | pedirle una captura |
| **400** vacío o cortado | el `content://` ya no servía | copiar el archivo apenas llega (§5.2) |
| **400** supera el saldo / ya avisaste | regla de negocio | mostrar el mensaje, dejar corregir el monto |
| **401** | sesión vencida | §6.1 |
| **403** | perfil sin DNI | §6.2 |
| **413** | más de 8 MB | comprimir y reintentar |
| **503** | el store no responde | **reintentar** |

⚠️ **El 503 es el único que se reintenta solo.** Si la imagen no se pudo guardar,
el backend borra el aviso antes de contestar: mandarlo de nuevo no duplica nada.
Los demás son de corregir, no de reintentar.

---

## 8. Después de subir

El `201` devuelve el aviso con el comprobante adentro:

```json
{
  "id": "…", "estado": "pendiente", "monto": 8810.5,
  "comprobante": {
    "estado": "disponible",
    "url": "https://res.cloudinary.com/…",
    "miniatura": "https://res.cloudinary.com/…"
  }
}
```

**La pantalla de éxito tiene que decir que la deuda no bajó:**

> Avisado — esperando confirmación.
> La vamos a revisar y te avisamos. **La deuda se actualiza cuando la
> confirmemos.**

Informar no es pagar. Si mostrás la deuda en cero después de avisar, el cliente
va a creer que ya está.

Y **borrá el pendiente de `AsyncStorage` recién en este punto**, no antes.

### ⚠️ Las URLs del comprobante se vencen

`url` y `miniatura` vienen firmadas y **caducan en una hora**. Es a propósito: un
comprobante muestra el alias, el banco y a veces el nombre completo de una
persona, así que un link filtrado tiene que morirse solo.

- **no las guardes** en estado persistido, ni en `AsyncStorage`, ni en caché de
  imágenes en disco;
- usalas al renderizar; si la pantalla estuvo abierta mucho rato, **volvé a pedir
  el aviso** (`GET /mi/pagos-informados`);
- si una imagen no carga, casi siempre es eso: recargá antes de mostrar un error.

---

## 9. Probarlo

**Sin billetera de verdad:** cualquier app que comparta imágenes sirve. Desde la
galería de Android, abrí una foto y tocá compartir.

**Desde la terminal**, con la app instalada:

```bash
adb shell am start -a android.intent.action.SEND -t image/jpeg \
  --eu android.intent.extra.STREAM file:///sdcard/Download/comprobante.jpg \
  -n <tu.package>/.MainActivity
```

**El endpoint solo, sin app** — para separar si el problema es del front o del
back:

```bash
curl -X POST $API/mi/facturas/<facturaId>/informar-pago \
  -H "Authorization: Bearer <token de cliente>" \
  -F monto=8810.50 \
  -F medio=transferencia \
  -F referencia=OP-88213345 \
  -F comprobante=@captura.jpg
```

Si el `curl` anda y la app no, el problema está en el `FormData` (§3).

---

## 10. Orden sugerido

Cada paso deja algo probable antes de seguir:

1. **el `curl` del §9** — confirma que el backend te responde con tu token;
2. **`informarPago()` del §3** llamada a mano, sin UI, con una imagen fija;
3. **Pantalla A (§4)** — el input de adjuntar en el formulario que ya existe.
   Acá ya tenés la función completa y andando;
4. **`intent-filter` (§5.1)** — solo que la app aparezca en la hoja de compartir
   y loguee lo que llega;
5. **la copia del archivo (§5.2)** y el pendiente en `AsyncStorage`;
6. **Pantalla B (§5.4)** — el selector de factura;
7. **los casos del §6** — sin sesión, sin DNI, sin facturas.

No arranques por el share: es la parte con más piezas y la más difícil de
depurar. Con la Pantalla A funcionando, el share es solo otra forma de conseguir
la misma imagen.

---

## 11. Checklist

- [x] `informarPago()` sin `Content-Type` manual y con `{ uri, name, type }` — `aCuerpoConComprobante` en `features/mi/types.ts`
- [x] Input de adjuntar, obligatorio/opcional según el medio — `SelectorDeComprobante` + `comprobanteObligatorio`
- [x] Botón de enviar deshabilitado si falta el comprobante obligatorio — `InformarPagoForm`
- [x] Miniatura de lo elegido antes de enviar
- [x] `intent-filter` de `SEND` + `image/*` (y **no** `SEND_MULTIPLE`)
- [x] Funciona con la app **cerrada** (`onCreate`) y con la app en **segundo plano** (`onNewIntent`)
- [x] Copia el `content://` a un archivo propio **apenas llega** — en Kotlin, no en JS
- [x] Guarda el pendiente si no hay sesión o falta el DNI, y lo retoma — `comprobanteSlice` + MMKV
- [x] Selector con `?soloImpagas=true`, vencidas primero, salteado si hay una sola
- [x] Monto precargado con el saldo, editable
- [x] Muestra el `message` del backend tal cual — `getApiErrorMessage`
- [x] Reintenta solo en 503 — en los dos hooks, una sola vez y con cartel para la segunda
- [x] Dice "esperando confirmación" y **no** baja la deuda
- [x] No cachea las URLs del comprobante — `MiAvisoItem` las usa al renderizar y las tira
- [x] Borra el pendiente recién después del `201`
- [ ] **Probado en un teléfono** — nada de esto se corrió todavía en Android
