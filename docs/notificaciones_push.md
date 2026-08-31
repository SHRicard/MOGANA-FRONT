# Notificaciones push — cómo se implementa

Arrancó como un cuestionario del backend al front. **Ya está respondido de los dos
lados**, así que hoy es el acuerdo: cada pregunta con la respuesta del front
debajo (`➡️`), las dos que quedaron abiertas contestadas por el backend (`⬅️`), y
el [contrato ya acordado](#el-contrato-ya-acordado) más abajo.

Lo decidido, en cuatro renglones:

| | |
|---|---|
| **Plataforma** | React Native pelado, RN 0.86.2 con New Architecture → **FCM HTTP v1** con service account |
| **Arranca por** | **Android**. iOS cuando haya cuenta de Apple; el backend queda igual para las dos |
| **Los tokens** | uno por dispositivo, varios por persona, **clave única el token** |
| **Traba** | falta crear el proyecto de Firebase. **El backend ya está escrito y probado** |

> ✅ **El backend ya está hecho.** Los dos endpoints de dispositivos, el anuncio
> masivo y el emisor de FCM están escritos, testeados y andando. Sin credenciales
> de Firebase el push se saltea con un aviso en el log y **la campanita funciona
> igual** — cuando las credenciales existan, son tres variables en el `.env` y
> sale, sin tocar código.

---

## Qué se quiere hacer

Desde el panel, el administrador escribe un aviso y le llega a **todos los
clientes**:

> *El 23 de diciembre el local permanece cerrado.*
> *Los que liquiden el saldo de su factura participan del sorteo de fin de mes.*
> *Solo por esta semana, todas las zapatillas en oferta.*

Eso son **dos cosas distintas** y conviene no confundirlas:

| | Qué es | Cuándo se ve |
|---|---|---|
| **Aviso in-app** | la fila en la campanita | cuando la persona abre la app |
| **Push** | el cartel del sistema operativo | aunque la app esté cerrada |

El aviso in-app **ya está funcionando** (`GET /api/notificaciones`, ver
[`notificaciones.md`](./notificaciones.md)) y el anuncio masivo se apoya en eso
mismo. Lo que falta armar es el push, y para eso son estas preguntas.

> Los dos canales conviven a propósito: el push es el que avisa, pero **se puede
> perder** —permiso denegado, teléfono apagado, token vencido— y el in-app es la
> red que lo sostiene. Nada depende de que el push haya llegado.

---

## Bloque 1 — Cómo está armada la app

### 1. ¿Es Expo o React Native pelado?

**Es la pregunta que más cambia el trabajo**, así que si hay una sola que
contestes con cuidado, que sea esta.

| Respuesta | Qué implica |
|---|---|
| **Expo** | Se usa Expo Push Service: el backend le pega a un endpoint HTTP y él se encarga de Android y de iOS. Sin SDK de Firebase del lado del servidor |
| **React Native pelado** | Va `@react-native-firebase/messaging` en la app, y el backend habla FCM HTTP v1 con una service account. Para iOS hay que subir la key de APNs a Firebase aparte |

**Cómo saberlo:**

- Mirá el `package.json`: si está `expo` en `dependencies` y arrancás con
  `npx expo start`, es Expo.
- Si arrancás con `npx react-native run-android` y las carpetas `android/` e
  `ios/` están **versionadas en git**, es pelado.
- Cuidado con el caso del medio: se puede usar Expo *y* tener carpetas nativas
  (`expo prebuild`). Sigue siendo Expo. **Si tenés dudas, pegá el `package.json`
  entero** y lo miro yo.

**➡️ Respuesta del front**

**React Native pelado.** No hay Expo en ninguna de sus formas:

- en `package.json` no está `expo` ni ninguna dependencia suya; se arranca con
  `npx react-native start` + `npx react-native run-android`;
- `android/` e `ios/` están **versionadas en git**, y no son de un `expo prebuild`;
- React Native **0.86.2**, React 19.2.3, con la **New Architecture** activada.

O sea, tu segunda fila: `@react-native-firebase/messaging` en la app y FCM HTTP v1
con service account del lado del servidor.

Un dato que te sirve para el punto 4: la app **ya entra con Google**
(`@react-native-google-signin/google-signin`), así que un proyecto de Google
Cloud ya existe.

⚠️ Del lado de la app esto significa **instalar librerías nuevas**
(`@react-native-firebase/app` + `@react-native-firebase/messaging`, y
probablemente `@notifee/react-native` — ver el punto 7). Antes de sumarlas hay
que verificar que la versión sea compatible con RN 0.86 y New Architecture.

### 2. ¿Cómo instalás la app hoy para probarla?

Expo Go · development build · APK a mano · Play Store (prueba interna) ·
TestFlight

**Por qué importa:** si hoy probás con **Expo Go**, tené en cuenta que el push
remoto en Android dejó de funcionar ahí a partir del SDK 53 — hace falta un
*development build*. No es un problema, pero es un paso más que conviene saber
antes y no el día que probamos. Confirmá con qué versión de SDK estás.

**➡️ Respuesta del front**

**APK de debug a mano**: `npx react-native run-android` contra un emulador o un
teléfono enchufado, con Metro corriendo. **No hay Expo Go** —así que lo del SDK
53 no nos toca—, no hay development build, y no hay nada publicado: ni prueba
interna en Play Store ni TestFlight.

Dos avisos para el día que probemos:

- el emulador tiene que ser una imagen **con Google Play Services**; las imágenes
  "AOSP" no reciben FCM y el token ni siquiera se genera;
- iOS no se va a poder probar por ahora (ver punto 5).

### 3. ¿Qué versiones mínimas de Android y de iOS soporta la app?

**Por qué importa:** desde **Android 13** el permiso de notificaciones se pide en
tiempo de ejecución, como el de la cámara. Abajo de esa versión viene concedido
solo. Eso cambia el momento en que la app tiene que pedirlo y qué hacer si la
persona dice que no.

**➡️ Respuesta del front**

| | |
|---|---|
| **Android mínimo** | `minSdkVersion = 24` → **Android 7.0** |
| Android target | `targetSdkVersion = 36` (compile 36) |
| **iOS mínimo** | **15.1** (`IPHONEOS_DEPLOYMENT_TARGET`) |

Con `targetSdk 36`, el permiso en runtime de Android 13 entra **sí o sí**: la app
va a tener que pedir `POST_NOTIFICATIONS`, y hoy el `AndroidManifest.xml` declara
solo `INTERNET`, así que hay que sumarlo. De Android 7 a 12 viene concedido solo.

Qué hacemos si dice que no: **nada dramático**. Se guarda la respuesta en el
storage local, no se vuelve a preguntar sola, y la campanita sigue funcionando
igual — que es exactamente lo que decís arriba: el in-app es la red que sostiene
al push.

---

## Bloque 2 — Credenciales

Esto es lo que **bloquea de verdad**: sin estas cuentas no se puede probar nada,
por más que el código esté listo de los dos lados.

### 4. ¿Ya existe un proyecto de Firebase para la app?

- ¿Tenés el `google-services.json` (Android) puesto en el proyecto?
- Si existe, ¿a nombre de qué cuenta de Google está?

Si no existe, se crea gratis. Solo hay que saber quién va a ser el dueño, porque
después hay que sacar credenciales de ahí para el servidor.

**➡️ Respuesta del front**

**No existe proyecto de Firebase.** En el repo no hay `google-services.json` ni
`GoogleService-Info.plist`, y el `build.gradle` no tiene el plugin
`com.google.gms.google-services`.

**Pero sí hay un proyecto de Google Cloud**: el del login con Google. La app usa
un `GOOGLE_WEB_CLIENT_ID` que sale del `.env`. **A nombre de qué cuenta está lo
tiene que decir quien creó ese client ID** — desde el repo no se ve, porque el
`.env` real no se versiona (solo está la plantilla, con el valor vacío).

Sugerencia: **activá Firebase sobre ese mismo proyecto de Google Cloud** en lugar
de crear uno nuevo. Se puede, y así el login y el push quedan en la misma cuenta
en vez de terminar con dos proyectos de dueños distintos.

### 5. ¿Hay cuenta de Apple Developer paga? ¿iOS entra ahora?

Para push en iPhone hace falta la cuenta de Apple Developer (**US$99 por año**) y
generar una key de APNs. En Android es gratis.

Si iOS no está todavía, **no es un problema**: se arranca por Android y el
backend queda igual para las dos plataformas. Pero decilo, así no planificamos
una fecha contra algo que depende de una compra.

**➡️ Respuesta del front**

**No hay cuenta paga, y iOS no entra ahora.** En el `project.pbxproj` no hay
ningún `DEVELOPMENT_TEAM` configurado, que es lo que habría quedado si hubiera
una cuenta de Apple asociada al proyecto.

**Arrancamos por Android.** El día que se compre, del lado de la app es sumar la
key de APNs en Firebase y pedir el permiso en iOS; el código de registro del
token, el tap y el borrado al salir es el mismo para las dos.

---

## Bloque 3 — Comportamiento

### 6. ¿La app guarda la sesión? ¿En qué momento podés registrar el token?

**Por qué importa:** el token de push identifica al **teléfono**, no a la
persona. Para saber a quién mandarle hay que atarlo a la cuenta, y eso solo se
puede después del login.

Y hay un caso que hay que resolver sí o sí: **al cerrar sesión el token tiene que
borrarse**. Si no, el próximo que entre en ese teléfono recibe los avisos del
anterior — incluidos los de deuda, que dicen cuánta plata debe.

Contame:
- ¿la sesión sobrevive a cerrar la app?
- ¿tenés un lugar claro donde correr algo justo después del login y justo antes
  del logout?

**➡️ Respuesta del front**

**Sí, la sesión sobrevive a cerrar la app.** El token de sesión vive en una
instancia de MMKV **encriptada**, aparte del storage general, y el estado inicial
de Redux se arma leyéndolo de forma **síncrona** al arrancar: la app sabe si hay
sesión antes del primer frame, sin pantalla de carga intermedia.

Y sí, hay **dos lugares únicos y claros**:

| Momento | Dónde |
|---|---|
| Después del login | `setCredentials` del `authSlice` — por ahí pasan el login con email, el registro y el de Google |
| Antes del logout | el hook `useLogout()` — es el **único** cierre de sesión de la app |

`useLogout()` ya hace tres pasos en orden (cierra Google, borra token y usuario,
vacía la cache); el `DELETE` sería el paso 0, **antes** de borrar el token,
porque el endpoint necesita el `Authorization`.

En la práctica no lo voy a colgar del login sino de un efecto que mira "hay
sesión": así también cubre el arranque con una sesión ya guardada, que es el caso
más común — la persona abre la app y no vuelve a loguearse nunca más.

⚠️ **Dos cosas que no te puedo garantizar desde la app, y por eso te las paso:**

1. **El `DELETE` puede no salir nunca.** Sin red, con el token de sesión ya
   vencido, o si el sistema mata la app. Necesito que el backend cierre ese
   agujero: **cuando un push token que ya existía se registra con otro usuario,
   mudalo de dueño** en vez de guardar las dos filas. Esa es la única garantía
   real de que el próximo que entre en ese teléfono no reciba la deuda del
   anterior — que es justo el riesgo que marcás vos.
2. **Las cuentas bloqueadas.** A quien le falta el DNI, la app le muestra **una
   sola pantalla** y la API le contesta `403` a casi todo (`flujo_login.md`).
   ¿`POST /api/dispositivos` va a andar con `estado: "bloqueado"`? Si contesta
   `403`, registro el token recién cuando se desbloquea. Decime cuál preferís.

**⬅️ Respuesta del backend**

**1. El token se muda de dueño. Va.** Tenés razón y es el punto más importante de
todo el documento: el `DELETE` es una cortesía, no una garantía. La regla queda
así, y es una sola operación:

> `POST /api/dispositivos` hace **upsert por token**. Si ese token ya existía a
> nombre de otra persona, le cambia el dueño al que está mandando el request.

Eso resuelve tus dos pedidos de una: es idempotente —el mismo token dos veces no
es un error— y no deja que dos cuentas compartan un dispositivo. **Una fila por
token, siempre.**

La consecuencia que importa: aunque el `DELETE` no salga nunca, el push del
anterior deja de llegar apenas el nuevo dueño abre la app con su sesión. Y si
nadie más entra, esa fila queda huérfana hasta que FCM la reporte como inválida y
la borremos solos.

**2. Con la cuenta bloqueada, sí anda.** `POST` y `DELETE /api/dispositivos` van
a estar exentos del bloqueo por perfil incompleto, igual que `/users/me` y
`/auth/verificar`. **Registrá el token apenas hay sesión, sin mirar el `estado`.**

El razonamiento: el guard existe para que una cuenta sin DNI **no opere el
negocio**, y registrar un teléfono no es operar — es plomería de la cuenta, del
mismo lado que verificar el correo. Y hay algo mejor: al que se registró y nunca
cargó el DNI, el push es justamente la forma de recordárselo. Si le exigimos
estar desbloqueado para registrar el token, perdemos el único canal para
alcanzarlo.

---

### 7. Cuando la persona toca la notificación, ¿a dónde tiene que llevarla?

Por ejemplo: los anuncios a la campanita, y los avisos de deuda a la pantalla de
su cuenta.

**Por qué importa:** eso define qué datos manda el backend adentro del push
(`data`), y me conviene mandarlos bien desde el principio.

**➡️ Respuesta del front**

Hoy, **todo a la campanita**: el tab Avisos y, si el push trae el id, ese aviso
abierto y marcado como leído.

No es pereza: **la pantalla de "mi cuenta / mi deuda" del cliente no existe
todavía**. Lo dice `s.roles.md` — *"El cliente no tiene producto todavía. No ve su
cuenta corriente, ni su saldo"*. Mandar el tap ahí sería mandarlo a una pantalla
en blanco.

Lo que necesito en `data` (todo string, es lo único que FCM transporta):

```json
{ "tipo": "deuda_vencida", "notificacionId": "fbbbd6c2-…" }
```

Con esos dos campos alcanza para hoy **y para después**: el día que exista la
pantalla de la cuenta del cliente, el mismo `tipo` la enruta y vos no tocás nada.
Si más adelante hay un aviso que apunta a una factura puntual, sumale un
`facturaId` y listo.

Dos pedidos sobre el formato:

- Mandá el push con **`notification` + `data`**, no `data` solo: así el sistema
  lo muestra por su cuenta con la app en segundo plano o cerrada, sin depender de
  que la app llegue a despertarse.
- El texto que sea el mismo del aviso, pero **la campanita no se va a pintar con
  lo que venga en el push**: al abrir, la app vuelve a pedir
  `GET /api/notificaciones`. El push avisa; la fuente de verdad sigue siendo la
  API. Eso también nos deja tranquilos con los push que se pierden.

> Con la app **abierta en pantalla**, FCM no muestra nada por sí solo: ahí hace
> falta `notifee` o un cartelito propio. Es trabajo del front, lo aclaro para que
> no te sorprenda si en la primera prueba "no aparece nada" con la app adelante.

### 8. Si alguien usa la app en dos teléfonos, ¿le llega a los dos?

Doy por hecho que sí (es lo normal), pero confirmalo — define si guardo un token
por persona o varios.

**➡️ Respuesta del front**

**Sí, a los dos.** Varios tokens por persona.

Un detalle de cómo guardarlos: la clave única tiene que ser **el token**, no el
par (usuario, plataforma). El mismo teléfono rota su token solo, y si guardás uno
por usuario y plataforma, alguien con dos Android se pisa un teléfono con el
otro.

---

## El contrato, ya andando

Tus cuatro correcciones entraron todas. Esto ya responde:

```http
POST   /api/dispositivos          { "token": "…", "plataforma": "android" }
DELETE /api/dispositivos/{token}
```

Las dos **con sesión** (`Authorization: Bearer …`) y las dos **exentas del
bloqueo por perfil incompleto**.

| | |
|---|---|
| `token` | el de FCM, tal cual |
| `plataforma` | `"android"` o `"ios"`, en minúscula |

**El `POST` es un upsert por token**, así que llamalo en cada arranque con sesión
sin mirar si cambió: mandar el mismo dos veces contesta `200`, nunca `409`. Y si
ese token estaba a nombre de otra persona, **cambia de dueño**.

**El `DELETE` lleva el token en la URL** (url-encoded), como pediste. Borra solo
si el token es tuyo, y contesta `200` igual si no existía: cerrar sesión dos
veces no es un error.

Las dos devuelven `{ "message": "…" }`, que es la forma que ya usa toda la API.
No hay nada que pintar con eso — es para loguear.

`plataforma` entra en cualquier capitalización: `"ANDROID"` se guarda `android`.

### El anuncio, del lado del panel

```http
POST /api/admin/anuncios          ← rol administrador
{ "titulo": "El 23 cerramos", "mensaje": "El local permanece cerrado." }
```
```json
{ "message": "Aviso enviado a 17 clientes.", "personas": 17, "porPush": true }
```

| | |
|---|---|
| `titulo` | hasta 80. Android corta cerca de los 40, así que conviene bien corto |
| `mensaje` | hasta 500 |
| `destinatario` | opcional, hoy solo `"todos"` |

`porPush` en `false` significa que el aviso quedó en la campanita pero **no salió
al celular**, porque todavía no hay credenciales de Firebase. El `message` ya lo
dice con todas las letras, listo para mostrar.

⚠️ **No se puede deshacer.** El panel tiene que preguntar *"¿mandarle esto a N
clientes?"* y bloquear el botón mientras responde: tocarlo dos veces manda el
aviso duplicado a todos.

### El ícono y el canal, que definen cómo se ve

El backend manda el push con estos tres valores, y **los tres necesitan algo del
lado de la app**:

| Va en el push | Qué tiene que existir en la app |
|---|---|
| `channelId: "avisos"` | un canal creado con **ese mismo id**. Si no coincide, llega sin sonido ni prioridad |
| `icon: "ic_notificacion"` | un drawable con ese nombre: **silueta monocroma**, blanca con transparencia |
| `color: "#762A9D"` | nada: Android lo usa para teñir el ícono |

Lo del ícono es el que sorprende a todos la primera vez: **Android no muestra el
logo a color en la barra de estado.** Exige la silueta y la tiñe. Si el drawable
no existe, dibuja un **cuadrado blanco** — ese es el clásico "¿por qué se ve
horrible?" del primer intento. El logo a color sí se puede usar como imagen
grande cuando la notificación se despliega.

### Lo que queda de tu lado

1. **Pedir permiso** (`POST_NOTIFICATIONS` en Android 13+) y guardarte la
   respuesta.
2. **Obtener el token** y mandarlo apenas hay sesión — también en el arranque con
   sesión guardada, que como decís es el caso más común.
3. **Volver a mandarlo cuando rota.**
4. **`DELETE` antes de borrar el token de sesión**, en el paso 0 de `useLogout()`.
   Aunque falle, el upsert cubre el agujero.
5. **Manejar el tap** en los tres estados, y lo de `notifee` para la app abierta.

---

## Lo que hace el backend

Para que sepas con qué vas a hablar:

- **Una fila por token**, con el token como clave única —como pediste— y varios
  por persona.
- **Borra solo** los que FCM reporta como `registration-token-not-registered`.
  Los tokens se pudren —la gente desinstala la app— y sin esa limpieza terminás
  mandándole a fantasmas para siempre.
- Cuando el administrador manda un anuncio, **primero** escribe el aviso in-app
  para todos y contesta; el push sale después, en segundo plano. Mandar cientos
  de push adentro del request sería un timeout garantizado.
- Manda **`notification` + `data`**, como pediste, con
  `data: { tipo, notificacionId }` — los dos string.
- Habla **FCM HTTP v1** con service account (`firebase-admin`), en tandas: la API
  toma hasta 500 tokens por llamada.

---

## Lo único que falta para poder probar

**Crear el proyecto de Firebase.** Es lo que traba, y no lo destraba código.

Tu sugerencia es la correcta: **activar Firebase sobre el proyecto de Google
Cloud que ya existe**, el del login con Google, en vez de crear uno nuevo. Así el
login y el push quedan en la misma cuenta y no terminamos con dos proyectos de
dueños distintos — que es el lío que aparece seis meses después, cuando hay que
rotar una credencial y nadie sabe de quién es.

De ahí salen dos archivos, uno para cada lado:

| Para | Qué |
|---|---|
| la app | `google-services.json` |
| el servidor | el `.json` de una **cuenta de servicio** |

### El paso a paso

Entrá con **la cuenta de Google que es dueña del proyecto del login**. Con otra,
el proyecto no aparece en la lista.

**Activar Firebase sobre el proyecto que ya existe**

1. `console.firebase.google.com` → **Agregar proyecto**
2. En el campo del nombre, escribí el nombre del **proyecto de Google Cloud que
   ya existe**: aparece en un desplegable marcado como existente. Elegilo de ahí
   — no crees uno nuevo
3. Confirmá que va a agregar Firebase a ese proyecto
4. **Google Analytics: desactivalo.** Para push no sirve y crea una cuenta de
   Analytics de más

**El archivo del servidor** (es lo único que traba el envío)

5. Engranaje ⚙️ arriba a la izquierda → **Configuración del proyecto**
6. Pestaña **Cuentas de servicio** → **Generar nueva clave privada**
7. Guardá el `.json` **fuera del repo**

**El archivo de la app** (se puede hacer después)

8. Configuración del proyecto → pestaña **General** → *Tus apps* → **Android**
9. *Nombre del paquete*: el `applicationId` de `android/app/build.gradle`
10. **Alias y SHA-1 se pueden dejar vacíos**: el SHA-1 es para el login con
    Google, no para push
11. Descargar `google-services.json`

Los dos pasos son independientes: la clave del servidor se puede generar sin
tener registrada la app.

⚠️ Ese `.json` del servidor **es una credencial**: quien lo tenga puede mandarle
notificaciones a todos los clientes. No se comparte por chat ni se sube al repo —
sus valores van al `.env`, que no se versiona.

Y si en Cloud Messaging aparece una **"clave del servidor"**, ignorala: es la API
vieja, que Google apagó. Acá se usa HTTP v1, que es la cuenta de servicio.

### Lo que va al `.env`

Del `.json` salen tres valores:

```bash
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...@....iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

La clave privada va **entre comillas y con los `\n` tal como vienen** en el
`.json`. El servicio los convierte en saltos de línea reales al arrancar: sin
eso, Firebase falla con un error de PEM inválido que no explica nada.

Mientras tanto **no estoy bloqueado**: el anuncio in-app, el registro de
dispositivos y todo el circuito se pueden escribir y probar sin Firebase. Lo
único que no se puede probar hasta entonces es el envío real.

---

## Plantilla para responder

Copiá esto y completalo:

```
1. Expo o pelado: PELADO. RN 0.86.2 + React 19.2.3, New Architecture,
   android/ e ios/ versionadas en git.
2. Cómo instalo la app hoy: npx react-native run-android (APK de debug, con Metro).
   Sin Expo → no hay SDK que informar. Nada publicado todavía.
3. Android mínimo: 24 (Android 7.0), target 36    iOS mínimo: 15.1
4. Proyecto de Firebase:  NO      a nombre de: —
   (sí existe uno de Google Cloud, el del login con Google: la cuenta la confirma
    el dueño de la app. Mejor activar Firebase sobre ESE proyecto.)
5. Cuenta de Apple paga:  NO (no hay DEVELOPMENT_TEAM en el proyecto)
   ¿iOS ahora?: NO — arrancamos por Android.
6. Sesión persistente: SÍ (token en MMKV encriptado, se lee síncrono al arrancar)
   Puedo correr código después del login y antes del logout: SÍ
   (setCredentials del authSlice / useLogout(), que es el único logout de la app)
7. El tap tiene que llevar a: la campanita (tab Avisos) y, con el id, a ese aviso
   abierto y marcado leído. La pantalla de la cuenta del cliente NO existe todavía.
   Mandá data: { tipo, notificacionId }, y el push con notification + data.
8. Dos teléfonos, ¿a los dos?: SÍ. Varios tokens por persona, con el TOKEN como
   clave única (no el par usuario+plataforma).

Algo que quieras aclarar:
- Cerrar sesión borra el token desde la app, pero eso PUEDE FALLAR (sin red, sesión
  vencida, app matada por el sistema). Necesito que el backend, al registrar un token
  que ya existía a nombre de otro usuario, lo MUDE de dueño. Es lo único que garantiza
  que nadie lea la deuda de otro.
- ¿POST /api/dispositivos anda con una cuenta bloqueada (estado: "bloqueado", sin DNI)?
  Hoy la API le contesta 403 a casi todo. Si ahí también, registro el token recién
  cuando se desbloquea.
- DELETE /api/dispositivos necesita saber QUÉ token: prefiero DELETE /api/dispositivos/{token}.
  Y que el POST sea idempotente: lo llamo en cada arranque con sesión.
- Del lado de la app hay que instalar @react-native-firebase/app + messaging (y quizá
  notifee, para mostrar algo con la app abierta): antes verifico compatibilidad con
  RN 0.86 + New Architecture.
- Android 13+: la app va a pedir el permiso POST_NOTIFICATIONS en runtime (hoy el
  manifest declara solo INTERNET). Si dicen que no, no pasa nada: la campanita sigue igual.
```

Con eso ya se puede escribir el código de los dos lados sin ir y volver.
