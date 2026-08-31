# Contexto del proyecto — para planificar la integración de push notifications

> **Completado el 20/08/2026** con datos verificados contra el repo, no de memoria.
> Lo que sigue con `?` es lo que no se puede saber desde el código y tiene que
> contestar una persona.
> Las secciones marcadas 🔴 son las que más cambian la recomendación.

---

## 0. Autocompletado rápido

Corré esto en la raíz del proyecto y pegá la salida en la sección 1:

```bash
npx react-native --version
node -v
cat package.json | grep -A100 '"dependencies"'
```

Y esto para saber el estado de la parte nativa:

```bash
ls android/app/ | grep google-services
ls ios/ | grep -i googleservice
grep -r "compileSdkVersion\|targetSdkVersion" android/build.gradle
```

**Salida:**

```
react-native-community/cli: 20.1.0
node: v22.22.2

android/app/google-services.json  → NO ESTÁ (se puso y se volvió a sacar, ver sección 10)
ios/GoogleService-Info.plist      → NO ESTÁ
compileSdkVersion = 36
targetSdkVersion = 36
```

---

## 1. Stack base

- **React Native:** `0.86.2`
- **React:** `19.2.3`
- **New Architecture (Fabric/TurboModules):** **sí** (`newArchEnabled=true`)
- **Hermes:** **sí** (`hermesEnabled=true`)
- **TypeScript:** **sí**, estricto y sin `any` (es regla del proyecto)
- **Package manager:** **npm** (hay `package-lock.json`; el `package.json` no se
  edita a mano, todo entra por `npm install`)

**Salida de `package.json` (dependencies):**

```json
{
  "@hookform/resolvers": "^5.7.1",
  "@react-native-google-signin/google-signin": "^16.1.4",
  "@react-navigation/bottom-tabs": "^7.18.15",
  "@react-navigation/native": "^7.3.15",
  "@react-navigation/native-stack": "^7.18.7",
  "@reduxjs/toolkit": "^2.12.0",
  "lucide-react-native": "^1.29.0",
  "luxon": "^3.7.2",
  "react": "19.2.3",
  "react-hook-form": "^7.84.0",
  "react-native": "0.86.2",
  "react-native-gesture-handler": "^3.1.0",
  "react-native-mmkv": "^4.3.2",
  "react-native-nitro-modules": "^0.36.5",
  "react-native-reanimated": "^4.5.3",
  "react-native-safe-area-context": "^5.8.1",
  "react-native-screens": "^4.26.2",
  "react-native-svg": "^15.15.5",
  "react-native-worklets": "^0.11.3",
  "react-redux": "^9.3.0",
  "zod": "^4.4.3"
}
```

> **No hay Expo en ninguna forma.** `android/` e `ios/` están versionadas en git
> desde el primer commit y no salen de un `expo prebuild`.

---

## 2. Plataformas 🔴

- **Android:** **sí**, es por donde arranca todo
  - minSdkVersion: **24** (Android 7.0)
  - targetSdkVersion: **36** ← **sí, es 33+**: el permiso `POST_NOTIFICATIONS`
    hay que pedirlo en runtime
- **iOS:** **todavía no**
  - **¿Tenés cuenta de Apple Developer (USD 99/año) ya activa?** **no** (en el
    `project.pbxproj` no hay ningún `DEVELOPMENT_TEAM`, que es lo que quedaría si
    existiera)
  - **¿Tenés un iPhone físico para probar?** `?`
  - Versión mínima de iOS: **15.1** (`IPHONEOS_DEPLOYMENT_TARGET`)

> **iOS es "todavía no".** El plan es arrancar solo con Android; el código se
> escribe cross-platform igual, pero los pasos nativos de iOS (plist,
> capabilities, APNs) quedan documentados sin aplicar hasta que exista la cuenta.

---

## 3. Estado global 🔴

- **Librería:** **Redux Toolkit**
- **¿Usás RTK Query, React Query o SWR para data fetching?** **RTK Query**, sobre
  un `baseApi` único con `injectEndpoints` por feature. **Sin axios**: todo con
  `fetchBaseQuery`. Cada respuesta se valida con **Zod**.
- **¿Tenés persistencia de estado?** **Manual, con MMKV.** No hay
  `redux-persist`: el slice de auth arma su estado inicial leyendo el storage de
  forma síncrona al arrancar (MMKV es sync, así que no hace falta pantalla de
  carga intermedia).

### Almacenamiento local

- [ ] `@react-native-async-storage/async-storage` — **no está, y no se va a sumar**
- [x] `react-native-mmkv` **4.3.2** (usa `react-native-nitro-modules`)
- [ ] `react-native-keychain` / `react-native-encrypted-storage`
- [ ] SQLite (WatermelonDB, Realm, op-sqlite, etc.)
- [ ] Otro

> ⚠️ Regla del proyecto: **nadie toca la instancia de MMKV directo**. Todo pasa
> por `services/storage/storageService`, y las claves viven centralizadas en
> `services/storage/keys.ts`. Cualquier dato nuevo del push (el último token
> enviado, si ya se mostró el primer) va por ahí.

**¿Dónde guardás el token de autenticación (JWT/session)?**
En una **segunda instancia de MMKV encriptada** (`encryptionKey`), separada del
storage general, vía `secureStorageService`. **No vive en Redux** a propósito:
en el store quedaría expuesto en devtools y en cualquier dump del state. Lo
inyecta el `baseApi` en el header de cada request.

> Esto importa: el token de auth y el token de push conviven, y el orden en que se
> borran en el logout determina si el `DELETE /devices` sale con credenciales o no.

**Sobre eso:** el cierre de sesión está centralizado en **un solo hook**
(`useLogout()`), que hoy hace tres pasos en orden — cerrar Google, borrar
token+usuario, vaciar la cache de RTK Query. El `DELETE` del dispositivo entra
como **paso 0**, antes de que se borre nada.

---

## 4. Navegación 🔴

- **Librería:** **React Navigation v7** (`@react-navigation/native` 7.3,
  native-stack 7.18, bottom-tabs 7.18)
- **Estructura:**

```
RootStack  (headerShown: false, se conmuta por ESTADO, no por navigate)
├── [sin sesión]  AuthStack
│                 ├── Login
│                 ├── Register
│                 ├── ForgotPassword
│                 └── NuevaClave           (código del correo + contraseña nueva)
│
├── [sesión + estado "bloqueado"]
│                 └── PerfilBloqueado       ← ES LA ÚNICA RUTA REGISTRADA
│
└── [sesión + estado "activo"]
    ├── App → AppTabs
    │         ├── Home
    │         ├── ClientesFacturados        (solo admin y super_admin)
    │         ├── Notifications             ← la campanita, con globito de no leídas
    │         └── Menu                      (no navega: abre el panel "Más")
    ├── Usuarios          (listado de clientes — solo administración)
    ├── Cliente           (ficha de un cliente)
    ├── NuevaFactura
    ├── CuentaCliente     (la cuenta y sus facturas)
    ├── Factura           (detalle + cobros)
    ├── MiCuenta
    ├── Configuracion     (tema y tipografía)
    ├── VerificarCorreo
    └── DesignSystem      (solo con __DEV__)
```

- **¿Ya tenés un `navigationRef` o navegación desde fuera de componentes?**
  **A medias.** Hay un `useNavigationContainerRef` en el `RootNavigator`, pero es
  local al componente y se usa solo para el botón flotante de herramientas de
  desarrollo. **Para el push hay que exportar uno a nivel de módulo**, que es lo
  que permite navegar desde un listener que vive fuera del árbol de React.
- **¿Ya tenés deep linking configurado (`linking` prop o esquema de URL)?**
  **No.** Llegó a estar —para los enlaces de verificación por correo— y **se
  quitó entero** cuando el backend cambió los enlaces por códigos de 6 dígitos.
  No quedó ni el `scheme` ni el intent-filter.
- **¿Cómo cambiás entre stack autenticado y no autenticado?**
  **Por estado, nunca con `navigate()`.** El `RootNavigator` registra un árbol de
  rutas u otro según `isAuthenticated` y `estado === 'bloqueado'`. Al hacer login
  o logout el stack se reemplaza solo, así que no queda forma de volver "atrás" a
  una pantalla vieja. **Consecuencia para el push:** un tap que llegue con la
  sesión cerrada —o con el perfil bloqueado— apunta a una ruta que **no existe en
  ese momento**; por eso hace falta guardar el payload y resolverlo cuando el
  árbol correcto esté montado.

---

## 5. Autenticación 🔴

- **Método:** **JWT propio** (`Authorization: Bearer …`), emitido por la API del
  proyecto
- **¿Hay refresh token?** **No.** Un solo token; cuando vence, se vuelve a entrar
- **¿Login social (Google, Apple)?** **Google sí**
  (`@react-native-google-signin/google-signin`): la app obtiene un `idToken` de
  Google y lo canjea en `POST /auth/google` por el JWT propio. Apple no
- **¿El logout llama a un endpoint del backend, o solo borra local?**
  **Solo borra local** (más el `signOut` del SDK de Google). No hay endpoint de
  logout, así que **no hay ningún lugar del servidor donde el backend pueda
  enterarse solo de que hay que soltar el token de push**: tiene que salir del
  `DELETE` explícito de la app
- **¿Puede haber varios usuarios usando el mismo dispositivo?** **Sí**, y no es
  hipotético: es una app de un local con clientes y administradores, y el
  teléfono del mostrador lo puede usar más de una persona.

> 🔴 **Por eso el token de push tiene que cambiar de dueño en el backend**, no
> solo borrarse desde la app: si el `DELETE` no sale (sin red, sesión vencida, la
> app la mata el sistema), el siguiente que entre recibiría avisos ajenos —
> incluidos los de **deuda, que dicen cuánta plata debe**. Es un bug de
> privacidad, no un detalle.

**Archivo donde vive la lógica de login/logout:**
`src/features/auth/hooks/` — `useLogin.ts`, `useGoogleLogin.ts`, `useLogout.ts`,
y el estado en `src/features/auth/store/authSlice.ts` (`setCredentials`, `logout`).

---

## 6. Backend

- **Lenguaje / framework:** `?` — vive en **otro repositorio**. Desde acá solo se
  ve que es una **API REST** que habla JSON, con mensajes de error en castellano
  (`{ "message": "…" }`) listos para mostrar
- **Base de datos + ORM:** `?` — este repo es solo frontend, no maneja base ni ORM
- **¿Está desplegado o solo local?** **Local**: `API_BASE_URL=http://localhost:3000/api`
- **¿Tiene sistema de colas / jobs en background?** `?` en cuanto a la
  herramienta, pero **sí en el comportamiento**: el anuncio masivo escribe primero
  el aviso in-app para todos, contesta, y manda los push después en segundo plano
  (lo dice `notificaciones_push.md`)
- **¿Quién lo mantiene?** **Otra persona.** Ya escribió y probó su lado del push:
  los dos endpoints de dispositivos, el anuncio masivo y el emisor de FCM

> El contrato entre ambos lados **ya está acordado y escrito** en
> [`notificaciones_push.md`](./notificaciones_push.md), con las preguntas de los
> dos lados respondidas. Lo que se implemente acá tiene que seguir **ese**
> documento: `POST /api/dispositivos` y `DELETE /api/dispositivos/{token}`, no
> otros nombres.

---

## 7. Estado actual del proyecto

- **¿Qué porcentaje dirías que está terminado?** **~70% de lo que hay definido.**
  Andando: login completo (correo, Google, recuperar y verificar por código),
  bloqueo por perfil incompleto, Mi cuenta, listado y ficha de clientes,
  facturación (emitir, cuenta del cliente, detalle, cobros, anular), avisos
  in-app, y configuración de tema y tipografía. Sin hacer: el panel de
  administración, Ayuda y Términos, y **todo el producto del lado del cliente
  final** — hoy un cliente no ve su cuenta ni su saldo
- **¿Ya generaste un APK de demo?** **Sí**, de debug (`assembleDebug` corre y
  termina bien)
- **¿Está publicada en alguna store o distribuida internamente?** **No.** Ni Play
  Store ni TestFlight. Se instala a mano con `npx react-native run-android`
- **¿Hay usuarios reales usándola?** **No todavía**
- **¿Tenés CI/CD para builds?** **Ninguno** (no hay `.github/`, ni Fastlane, ni
  EAS). Los builds son manuales
- **¿Testing?** **Jest**, 15 suites y **245 tests**, más `tsc --noEmit` y ESLint.
  Son tests de **lógica pura y schemas** (Zod, catálogos, formateadores): no hay
  render tests ni Detox

---

## 8. Qué querés notificar 🔴

Esto define el catálogo de `data.type` y no lo puedo adivinar.

**Los que existen hoy** (los dos ya están implementados del lado del backend):

| # | Evento | Quién lo recibe | A qué pantalla debería abrir |
|---|--------|-----------------|------------------------------|
| 1 | **Deuda vencida** — el admin aprieta "Avisar deuda" en la ficha del cliente | Ese cliente | **Avisos**, con el aviso abierto. ⚠️ Lo natural sería su cuenta corriente, **pero esa pantalla no existe todavía** para el cliente |
| 2 | **Anuncio masivo** — el admin escribe un texto (`POST /api/admin/anuncios`) | **Todos** los clientes | **Avisos** |
| 3 | *(candidato, no existe)* Factura nueva o pago registrado | El cliente | Su cuenta / la factura, cuando esas pantallas existan |

`data.type` de los dos primeros: `deuda_vencida` y el del anuncio. El backend
manda `data: { tipo, notificacionId }`, los dos como string.

> **El resolver tiene que tolerar tipos desconocidos**: el backend puede sumar uno
> nuevo antes de que la persona actualice la app. Ante un `tipo` que no conoce,
> abrir Avisos y no romper.

Además:

- **¿Alguna notificación tiene que llegar aunque la app esté cerrada y sin abrirla?**
  (ej: actualizar un contador, sincronizar datos) **No.** El `data` del push no se
  usa para pintar nada: al abrir, la app vuelve a pedir `GET /api/notificaciones`,
  que es la fuente de verdad. El push solo avisa
- **¿Necesitás notificaciones locales/programadas?** (recordatorios sin backend)
  **No.** Todo lo dispara el administrador
- **¿Necesitás badge (el numerito rojo del ícono)?** **No hace falta.** El globito
  de no leídas **ya existe adentro de la app**, en el tab de Avisos, y sale de
  `noLeidas` de la API. El badge del ícono del launcher en Android depende del
  lanzador y no es confiable
- **¿Necesitás imágenes o botones de acción en la notificación?** **No.** Título y
  texto, que ya vienen redactados desde el backend
- **¿Volumen estimado?** **Bajo**: los avisos de deuda los dispara un
  administrador de a uno, y los anuncios masivos son ocasionales (del orden de
  unos pocos por mes × la cantidad de clientes). Nada que se acerque a los límites
  de FCM

---

## 9. Restricciones y preferencias

- **¿Hay algún requisito de privacidad o normativa?** No hay normativa específica
  (no es salud ni datos de menores), **pero sí un cuidado concreto**: el aviso de
  deuda dice **cuánta plata debe la persona**, y el texto de un push **se lee en
  la pantalla bloqueada, sin desbloquear el teléfono**. Conviene que el título y
  el cuerpo del push sean genéricos (*"Tenés facturas vencidas"*) y que el monto
  quede adentro de la app. **Esto hay que acordarlo con el backend**, que hoy
  manda el mismo texto que el aviso in-app
- **¿Preferencia de no depender de Google?** **No.** La app ya usa Google
  Sign-In, y en Android sin Expo **FCM es la única opción realista**
- **¿Presupuesto para servicios de terceros (OneSignal y similares)?** **No hace
  falta**: el backend ya habla FCM HTTP v1 directo, así que un intermediario
  sumaría costo y una dependencia más sin resolver nada
- **¿Plazo?** `?`
- **¿Trabajás solo o en equipo?** **Dos**: quien hace el frontend (este repo) y
  quien hace el backend (otro repo, otra persona)
- **¿Tu nivel con la parte nativa (Gradle, Xcode)?** `?` — lo contesta el dueño
  del proyecto. Dato objetivo: **el cableado nativo de Android ya se hizo una vez
  y compiló bien** (ver sección 10)

---

## 10. Lo que ya intentaste

- **¿Ya instalaste alguna librería de push?** ¿cuál? ¿qué pasó?

  **Sí, y funcionó — pero se dio marcha atrás.** Se instalaron
  `@react-native-firebase/app` y `@react-native-firebase/messaging` **26.3.0**
  (sus requisitos coinciden: pide Android minSdk 23 y iOS 15.0, el proyecto tiene
  24 y 15.1). Se cableó el plugin de Gradle, se sumó el permiso
  `POST_NOTIFICATIONS`, se puso el `google-services.json` en `android/app/` y
  **`assembleDebug` terminó en `BUILD SUCCESSFUL`**, con la tarea
  `processDebugGoogleServices` leyendo el archivo sin quejarse.

  **Después se revirtió todo** por los problemas de la consola de Firebase (abajo).
  Hoy no queda ni rastro: ni en `package.json`, ni en `package-lock.json`, ni en
  los Gradle, ni en el manifest, ni artefactos de build. **Lo único que quedó es
  esa experiencia**: se sabe que el cableado nativo funciona y cuánto lleva.

- **¿Tenés proyecto de Firebase creado?** **Sí: `morgana-c6fe2`** (número
  `169205877644`), con la app Android `com.morgana` registrada.

  ⚠️ **Está separado del proyecto de Google Cloud del login**, que es el
  `260084845955`. Los dos documentos recomendaban activar Firebase **sobre el que
  ya existía** y quedaron aparte. No rompe nada —el push andaría igual— pero deja
  dos proyectos, dos dueños posibles y dos credenciales que rotar.

- **¿Algún error específico con el que chocaste?** (pegá el stack trace)

```
No se pudo crear
La solicitud falló porque el nombre del paquete de Android y la huella digital
ya están en uso
Número de seguimiento: c8447434604717331
```

  **Causa:** Google no permite el par *paquete + huella digital* en dos proyectos
  a la vez, y `com.morgana` + el SHA-1 de debug
  (`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`) **ya estaba
  tomado** por el cliente OAuth de Android del proyecto del login.

  **Solución:** dejar el SHA-1 vacío — **para push no se usa**; solo hace falta si
  el login con Google pasara por Firebase, y no es el caso. El
  `google-services.json` que se bajó sin SHA-1 (sin ningún `oauth_client` adentro)
  funciona perfecto para FCM. ❌ Lo que **no** hay que hacer es borrar el cliente
  OAuth del proyecto viejo para "liberar" la huella: eso rompe el login con Google.

**Lo que sigue faltando, y no lo destraba código:** la **cuenta de servicio** para
el backend (⚙️ → Configuración del proyecto → Cuentas de servicio → Generar nueva
clave privada). De ese `.json` salen las tres variables de su `.env`. Ese archivo
**sí es una credencial**: no va al repo ni por chat.

---

## 11. Cualquier cosa rara del proyecto

Patches, forks, librerías nativas custom, código heredado que nadie toca,
decisiones raras que te obligaron a hacer algo, etc.

```
1. NO SE USA <Modal> DE REACT NATIVE, en ningún lado, a propósito.
   Un Modal es una ventana nativa aparte que no hereda el edge-to-edge de la app:
   Android le pinta su propia navigation bar y se veía una franja blanca abajo.
   Todo lo que "flota" (diálogos, el panel del menú, el calendario) son views
   absolutas hermanas del navigator. → El primer de permisos tiene que seguir esa
   regla: se arma con el atom `Dialogo`, no con Modal.

2. Arquitectura por features ("screaming architecture"), no por tipo de archivo.
   Prohibido crear carpetas globales `screens/` o `components/` en src/.
   UI compartida SOLO en `shared/ui/atoms/` — no existen molecules/ ni organisms/.
   Lo que usa una sola feature vive adentro de esa feature.

3. Nombres y comentarios en castellano rioplatense (useRefrescar, ListaDeOpciones,
   refrescar/reintentar). Los tests y los comentarios explican POR QUÉ, no qué.

4. Toda pantalla con datos de la API se refresca tirando para abajo, con un hook
   compartido `useRefrescar`. No es opcional: entra junto con la pantalla.

5. El theme tiene DOS capas de tokens (primitivos → semánticos) y se accede solo
   por el hook useTheme(). Prohibido hardcodear colores o tamaños. Modo claro y
   oscuro desde el día uno, y selector de tipografía (Inter / la del sistema),
   con las fuentes compiladas en el binario.

6. Los .ttf de Inter están RENOMBRADOS (Inter18pt-Bold, sin guión bajo) para que
   el nombre del archivo coincida con el nombre PostScript. Como vienen de Google
   Fonts andan en Android y en iOS se caen a la del sistema sin ningún error.

7. Las notificaciones IN-APP ya están implementadas y andando (campanita, globito
   de no leídas, marcar como leída con actualización optimista). El push es una
   capa aparte que NO las reemplaza: si el push se pierde, el aviso está igual.

8. Hay una intercepción de 403 por "perfil incompleto" en el baseQuery: si la API
   contesta ese 403, se invalida el tag User y la app se entera sola de que la
   cuenta quedó bloqueada. Los endpoints de dispositivos están EXENTOS de ese
   bloqueo (lo confirmó el backend), así que el token se registra igual.

9. Dos proyectos de Google distintos: login en 260084845955, Firebase en
   169205877644. Ver sección 10.

10. MMKV v4 usa react-native-nitro-modules; Reanimated v4 usa react-native-worklets.
    Son dependencias nativas que ya están andando con New Architecture.

11. El .env entra por react-native-dotenv y NO se versiona (hay .env.example).
    Todo lo que va ahí termina adentro del APK: es configuración pública
    (URLs, client IDs), nunca secretos.

12. Existe un catálogo vivo del design system (pantalla accesible con un botón
    flotante, solo con __DEV__) donde están todos los tokens y atoms.
```
