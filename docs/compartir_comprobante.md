# Compartir el comprobante desde la billetera — guía para React Native

El flujo que pidió el negocio: el cliente paga en Mercado Pago, toca **Compartir
comprobante**, elige **Morgana** en la hoja de compartir de Android, y adentro de
la app elige a qué factura corresponde. El mismo gesto que compartir algo por
WhatsApp.

Esta guía es del **front en React Native**. El backend ya está hecho y probado:
el endpoint, los formatos y los errores están en
[`flujo_comprobantes.md`](./flujo_comprobantes.md); acá va solo lo que cambia por
entrar desde la hoja de compartir.

---

## 1. El flujo, de punta a punta

```
Mercado Pago                Android                    Morgana
─────────────               ───────                    ───────
[Compartir]  ──────────►  hoja de compartir
                          [WhatsApp][Gmail][Morgana]
                                        │
                                        └──────────►  llega la imagen
                                                      │
                                                      ├─ ¿hay sesión?
                                                      │    no → login, y la
                                                      │         imagen espera
                                                      │
                                                      ├─ ¿a qué factura?
                                                      │    (solo las impagas)
                                                      │
                                                      ├─ monto, medio, fecha
                                                      │
                                                      └─ POST informar-pago
                                                         (multipart)
```

**Es el mismo endpoint de siempre.** Desde la hoja de compartir o desde el
formulario de adentro de la app, lo que sale es un
`POST /api/mi/facturas/:id/informar-pago` con `multipart/form-data`. Al backend
le da igual de dónde salió la imagen.

Lo único que cambia es **el orden en que el cliente arma los datos**: entrando
por el formulario elige la factura y después adjunta; entrando por el share llega
con la imagen en la mano y **le falta todo lo demás**.

---

## 2. Recibir el share en Android

### 2.1 El `intent-filter`

Sin esto la app **no aparece** en la hoja de compartir. Va en el `<activity>`
principal de `android/app/src/main/AndroidManifest.xml`:

```xml
<activity android:name=".MainActivity" ...>

  <!-- El launcher de siempre, no lo toques -->
  <intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LAUNCHER" />
  </intent-filter>

  <!-- Una imagen -->
  <intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="image/*" />
  </intent-filter>

</activity>
```

⚠️ **No agregues `SEND_MULTIPLE`.** El backend acepta **un** comprobante por
aviso, así que aparecer en el share de varias imágenes es prometer algo que
después hay que rechazar.

> Si tu app es **Expo**, esto no se escribe a mano: se declara en `app.json` con
> un config plugin (`expo-share-intent` trae el suyo) y aparece al correr
> `expo prebuild`. En Expo Go **no funciona** — el share intent necesita un
> development build.

### 2.2 Leer lo que llegó

Con `expo-share-intent` (Expo) o `react-native-receive-sharing-intent` (bare):

```js
useEffect(() => {
  const sub = onShareIntent(({ files }) => {
    const imagen = files?.[0];
    if (!imagen) return;

    // { path/uri, mimeType, fileName }
    guardarComprobantePendiente(imagen);
  });

  return () => sub.remove();
}, []);
```

**Hay que manejar los dos casos**: la app **cerrada** (el intent viene en el
arranque) y la app **abierta en segundo plano** (llega por el listener). Las dos
librerías dan las dos vías; si solo enganchás el listener, compartir con la app
cerrada no hace nada y parece que se rompió.

### 2.3 ⚠️ El `content://` no es un archivo

Lo que entrega Android es un **URI de content provider**
(`content://media/external/images/...`), no una ruta del disco. Sirve para leerlo
y para armar el `FormData`, pero:

- **es temporal**: el permiso de lectura dura lo que dura el intent. Si el
  cliente tiene que loguearse antes de subir, para cuando vuelva el URI puede ya
  no servir;
- **puede no tener extensión ni nombre**.

Por eso, **lo primero que hay que hacer al recibir el share es copiar la imagen a
un archivo propio** de la app:

```js
import * as FileSystem from 'expo-file-system';

const destino = `${FileSystem.cacheDirectory}comprobante-${Date.now()}.jpg`;
await FileSystem.copyAsync({ from: imagen.path, to: destino });
```

Desde ahí en adelante se trabaja con `destino`, que sobrevive al login, a que la
app pase a segundo plano y a que el cliente tarde en elegir la factura.

---

## 3. La pantalla que aparece después del share

Entrando por acá, el cliente llega **con la imagen y sin nada más**. La pantalla
tiene que pedirle lo que falta, y en este orden:

```
┌──────────────────────────────────────┐
│  [miniatura del comprobante]         │  ← lo primero: que vea que llegó bien
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

**Cuatro decisiones de diseño que importan:**

1. **La miniatura va arriba de todo.** El cliente viene de otra app y necesita
   ver que se compartió lo que quería, antes de ponerse a completar campos.
2. **La lista trae solo facturas impagas**, y las vencidas primero. Una factura
   ya paga no puede ser la de este comprobante.
3. **El monto viene precargado con el saldo** de la factura que elija, que es el
   caso normal. Editable, porque puede haber pagado una parte.
4. **`medio` no viene en el share.** Android manda la imagen, no de dónde salió.
   Hay que preguntarlo — pero se puede dejar `transferencia` como default, que es
   el 90% de los casos, y recordar el último que usó.

### La lista de facturas

```http
GET /api/mi/facturas?soloImpagas=true&limite=50
```

`soloImpagas=true` es un filtro **agregado para esta pantalla**: deja afuera las
pagadas y las anuladas, que no son candidatas posibles. Sin él habría que pedir
las tres listas de estados por separado (`pendiente`, `proxima_a_vencer`,
`vencida`) o traer todo y filtrar a mano.

Cada renglón trae `numero`, `fechaFin`, `total`, `saldo` y `estado`. Ordenalas
por `fechaFin` ascendente: lo que vence primero es lo que probablemente pagó.

**Si el cliente tiene una sola factura impaga, salteá el selector** y mostrala ya
elegida, con la opción de cambiarla. Es el caso más común y ahorra un paso.

---

## 4. Subir

Ya con la factura elegida, es el mismo request de siempre:

```js
const cuerpo = new FormData();

cuerpo.append('monto', String(monto));        // ⚠️ el número crudo: 8810.50
cuerpo.append('medio', medio);                // transferencia | mercado_pago | ...
cuerpo.append('fecha', fecha);                // opcional, AAAA-MM-DD
cuerpo.append('referencia', referencia);      // opcional

// ⚠️ En React Native el archivo NO es un Blob: es este objeto de tres campos.
cuerpo.append('comprobante', {
  uri: destino,               // el archivo que copiaste en el paso 2.3
  type: 'image/jpeg',
  name: 'comprobante.jpg',
});

const respuesta = await fetch(
  `${API}/mi/facturas/${facturaId}/informar-pago`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },  // ⚠️ SIN Content-Type
    body: cuerpo,
  },
);
```

### Las cuatro trampas de `FormData` en React Native

1. **El archivo es `{ uri, type, name }`**, no un `Blob` ni un `File`. Eso es de
   React Native, no del backend; el polyfill de `FormData` lo entiende así.
2. **No pongas `Content-Type` a mano.** El runtime tiene que escribirlo él para
   incluir el `boundary`. Si lo forzás a `multipart/form-data`, el backend no
   encuentra el archivo y contesta que falta el comprobante.
3. **`name` tiene que traer extensión.** Sin ella, algunos servidores no
   adivinan el tipo. El backend igual mira los bytes, pero cuesta cero ponerla.
4. **El `type` que mandes no decide nada.** El backend verifica el formato real
   por los primeros bytes del archivo: si mandás un PNG diciendo `image/jpeg`,
   entra igual (es un PNG válido); si mandás cualquier otra cosa diciendo
   `image/jpeg`, se rechaza. **No hace falta que aciertes el mime.**

### El HEIC de iPhone

En iOS la foto puede venir en HEIC. El backend lo acepta y lo convierte al
guardar, así que **no hace falta convertirlo en el teléfono**. Si igual lo
convertís a JPEG antes de subir, tampoco molesta.

---

## 5. Los casos que hay que resolver sí o sí

### 5.1 Comparte sin estar logueado

Es el más común de todos: el cliente instaló la app hace un mes y la sesión
venció.

**Guardá el comprobante pendiente, mandá al login, y volvé.** Nunca descartes la
imagen: si al volver del login no está, el cliente tiene que ir a Mercado Pago y
compartir de nuevo, y ahí ya perdiste el flujo entero.

```js
// al recibir el share, ANTES de mirar la sesión
await AsyncStorage.setItem('comprobantePendiente', JSON.stringify({
  archivo: destino,          // el copiado, no el content://
  recibidoEn: Date.now(),
}));

// después del login, en el arranque de la app
const pendiente = await AsyncStorage.getItem('comprobantePendiente');
if (pendiente) navegarA('ElegirFactura', JSON.parse(pendiente));
```

Poneles vencimiento a esos pendientes (24 horas alcanza) y borralos al subirlos:
un comprobante viejo apareciendo tres días después confunde más de lo que ayuda.

### 5.2 Tiene el perfil incompleto

`/mi` está detrás de `PerfilCompletoGuard`: **sin DNI cargado, todo `/mi`
contesta 403** con `Tenés que completar tu perfil`. Mismo tratamiento que el
login: guardar el pendiente, mandar a completar el DNI, y volver.

### 5.3 No tiene ninguna factura impaga

Puede pasar: pagó, el administrador ya lo confirmó, y comparte igual. La pantalla
tiene que decirlo con todas las letras —*"no tenés facturas pendientes"*— y
ofrecer ver la cuenta. **No la dejes vacía con un selector sin opciones.**

### 5.4 Ya avisó un pago de esa factura

El backend cuenta los avisos pendientes contra el saldo. Si ya avisó, contesta:

```
Ya avisaste $8.810,50 sin confirmar de esta factura, así que queda $0,00 por informar.
```

Es un **400** y hay que mostrarlo tal cual: explica exactamente lo que pasó. En
el selector de facturas conviene marcar las que ya tienen un aviso esperando,
para que ni llegue a intentarlo.

### 5.5 Comparte algo que no es un comprobante

Una foto del gato, una captura de otra cosa. El backend no puede saberlo —una
imagen es una imagen— así que **entra igual** y lo resuelve el administrador
rechazando el aviso, con su motivo. No intentes adivinarlo en el front.

---

## 6. Los errores, y qué hacer con cada uno

Todos vienen como `{ "message": "<texto>" }`. El texto **ya está escrito para
mostrarse tal cual**: no lo reescribas.

| | Qué pasó | Qué hacer |
|---|---|---|
| **400** falta el comprobante | el archivo no viajó | casi siempre es el `Content-Type` forzado (trampa 2) |
| **400** no es una imagen | compartió un PDF o algo raro | pedirle una captura |
| **400** vacío o cortado | el `content://` ya no servía | volver a copiar el archivo (§2.3) |
| **400** supera el saldo / ya avisaste | reglas de negocio | mostrar el mensaje, dejar corregir el monto |
| **403** | perfil sin DNI | §5.2 |
| **401** | sesión vencida | §5.1 |
| **413** | más de 8 MB | comprimir y reintentar, o pedir otra captura |
| **503** | el store no responde | **reintentar**: no quedó nada escrito |

⚠️ **El 503 es el único que se reintenta solo.** Si la imagen no se pudo guardar,
el backend borra el aviso antes de contestar, así que mandarlo de nuevo no
duplica nada. Los demás son de corregir, no de reintentar.

---

## 7. Después de subir

El `201` devuelve el aviso creado, con el comprobante adentro:

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

Informar no es pagar: la deuda baja recién cuando un administrador confirma el
aviso contra el resumen del banco. Si la pantalla muestra la deuda en cero
después de avisar, el cliente va a creer que ya está.

Y **borrá el pendiente de `AsyncStorage`** en este punto, no antes.

### ⚠️ Las URLs del comprobante se vencen

`url` y `miniatura` vienen firmadas y **caducan en una hora**. Es a propósito: un
comprobante muestra el alias, el banco y a veces el nombre completo de una
persona, así que el link que se filtre tiene que morirse solo.

En el front eso significa:

- **no las guardes** en estado persistido, ni en `AsyncStorage`, ni en una caché
  de imágenes en disco;
- usalas al renderizar, y si la pantalla estuvo abierta mucho rato, **volvé a
  pedir el aviso** (`GET /mi/pagos-informados`) para tener links nuevos;
- si una imagen no carga, casi siempre es eso: recargá la lista antes de mostrar
  un error.

---

## 8. Probarlo sin billetera de verdad

No hace falta Mercado Pago para probar el share: cualquier app que comparta
imágenes sirve. Desde la galería de Android, abrí una foto y tocá compartir.

Y desde la terminal, con la app instalada:

```bash
adb shell am start -a android.intent.action.SEND -t image/jpeg \
  --eu android.intent.extra.STREAM file:///sdcard/Download/comprobante.jpg \
  -n <tu.package>/.MainActivity
```

Para probar el endpoint solo, sin app:

```bash
curl -X POST $API/mi/facturas/<facturaId>/informar-pago \
  -H "Authorization: Bearer <token de cliente>" \
  -F monto=8810.50 \
  -F medio=transferencia \
  -F referencia=OP-88213345 \
  -F comprobante=@captura.jpg
```

---

## 9. Checklist

- [ ] `intent-filter` de `SEND` + `image/*` (y **no** `SEND_MULTIPLE`)
- [ ] Recibe el share con la app **cerrada** y con la app **en segundo plano**
- [ ] Copia el `content://` a un archivo propio **apenas llega**
- [ ] Guarda el pendiente si no hay sesión o falta el DNI, y lo retoma al volver
- [ ] Selector con `?soloImpagas=true`, vencidas primero, y salteado si hay una sola
- [ ] Monto precargado con el saldo, editable
- [ ] `FormData` con `{ uri, type, name }` y **sin** `Content-Type` a mano
- [ ] Muestra el `message` del backend tal cual
- [ ] Reintenta solo en 503
- [ ] Dice "esperando confirmación" y **no** baja la deuda
- [ ] No cachea las URLs del comprobante
- [ ] Borra el pendiente recién después del `201`
