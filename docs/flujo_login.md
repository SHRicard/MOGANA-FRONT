# Flujo de login — todo lo que hay que aplicar en el front

Este documento reemplaza al contrato anterior de registro y login. Lo de acá es
lo único válido: **el DNI dejó de ser una forma de entrar**.

La cuenta se crea con **correo**, y nada más. El DNI se pide después, adentro de
la app: hasta que la persona lo carga, su cuenta está **bloqueada**.

```
  registro / Google          primer ingreso              ya puede usar la app
 ┌──────────────────┐     ┌────────────────────┐       ┌───────────────────┐
 │ email+contraseña │ ──▶ │ estado: bloqueado  │  ──▶  │ estado: activo    │
 │   o botón Google │     │ modal: cargá el DNI│       │                   │
 └──────────────────┘     └────────────────────┘       └───────────────────┘
                                    │
                          PATCH /api/users/me { dni }
```

Por qué así: pedir el documento en el formulario de alta espanta gente, y correo
tiene todo el mundo. Pero sin DNI el mostrador no puede identificar a quién le
fía, así que el dato es obligatorio igual — solo que se pide una vez adentro.

---

## Lo que cambió respecto de lo que ya tenés

Si la app ya está construida contra el contrato viejo, esto es lo que se rompe:

| En el front | Antes | Ahora |
|---|---|---|
| Pantalla de registro | email **o** DNI, con contraseña | **solo email** + contraseña. Sacar el input de DNI |
| Pantalla de login | email **o** DNI | **solo email**. Sacar el selector "entrar con DNI" |
| Después de entrar | ibas directo al home | si `estado === "bloqueado"`, **modal de DNI** y nada más |
| `GET /api/cliente/mi-cuenta` | existía | **404**. Usar `GET /api/users/me` |
| `PATCH /api/cliente/mi-cuenta` | cambiaba el nombre | **404**. Usar `PATCH /api/users/me` |
| Usuario en el store | `{ id, name, email, dni, rol }` | suma `estado` y `motivoBloqueo` |
| `403` | siempre era "no tenés permiso" | ahora hay **dos**: el de permisos y el de perfil incompleto, que se distinguen por el `message` |
| Correos | no había | llegan solos: verificación al registrarse, bienvenida al verificar, y el de recuperar contraseña |
| Recuperar contraseña | no existía | dos pantallas nuevas: pedir el código y elegir la contraseña |
| Entrar con Google | siempre vinculaba | `409` si ya hay una cuenta con ese correo, con contraseña y **sin verificar** |

Lo que **no** cambió: el login con Google (`POST /api/auth/google`), la forma de
la respuesta (`{ user, token }`), el header `Authorization: Bearer`, el rol y
todos los endpoints del panel.

---

## Los dos estados

| Estado | Cuándo | Qué puede hacer |
|---|---|---|
| `bloqueado` | no tiene DNI cargado | entrar, ver su perfil y completarlo. **Nada más** |
| `activo` | tiene DNI | todo lo que le permita su rol |

Vienen calculados por el backend, en `estado` y `motivoBloqueo`. **No los
deduzcas del `dni`**: el día que el perfil pida un dato más, el estado cambia
solo y la app no se entera de nada.

Alcanza a **todos los roles**. Un administrador sin DNI tampoco entra al panel.

---

## `POST /api/auth/register`

```json
{ "email": "ana@mail.com", "password": "unaClave123", "displayName": "Ana Pérez" }
```

| Campo | | |
|---|---|---|
| `email` | obligatorio | se guarda en minúsculas y sin espacios |
| `password` | obligatorio | 8 a 72 caracteres |
| `displayName` | opcional | hasta 100 |

**El DNI ya no se manda acá.** Si lo mandás, la respuesta es
`400 property dni should not exist`.

Respuesta `201`:

```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "e0be7db4-...",
    "name": "Ana Pérez",
    "email": "ana@mail.com",
    "dni": null,
    "rol": "cliente",
    "estado": "bloqueado",
    "motivoBloqueo": "Para usar la app necesitás cargar tu DNI en tu perfil."
  }
}
```

Fijate que la respuesta del registro **ya te dice que está bloqueado**: el modal
se abre con eso, sin pedir nada más.

---

## `POST /api/auth/login`

```json
{ "email": "ana@mail.com", "password": "unaClave123" }
```

Respuesta `200`, misma forma que el registro. **Con DNI no se entra**: mandar
`dni` es `400`.

---

## `POST /api/auth/google`

`{ "idToken": "..." }` → el mismo `{ user, token }`. Detalle completo en
[`README.md`](./README.md).

Una cuenta nacida por Google **también nace sin DNI**, o sea bloqueada: el modal
va después del login con Google igual que después del registro manual.

---

## Los correos: cuál llega y cuándo

| Momento | Correo |
|---|---|
| se registra con email y contraseña | **Confirmá tu correo** |
| escribe ese código | **Bienvenida a Morgana** |
| se registra con Google | **Bienvenida a Morgana** — Google ya confirmó el correo, no hace falta verificar |
| pide recuperar la contraseña | **Recuperá tu contraseña** |

La bienvenida llega **al verificar y no al registrarse**: dos correos seguidos es
ruido, y recién ahí se sabe que esa dirección existe de verdad.

> **Verificar el correo no bloquea nada**: se entra y se opera igual sin
> verificar. Lo único que cambia es que a una cuenta con contraseña y correo sin
> verificar **no se la vincula con Google** — mirá el `409` de más abajo.

---

## El código que llega al correo

Los correos de verificación y de recuperación **no traen un enlace: traen un
número de 6 dígitos**. La persona lo lee en el mail y lo escribe en la app.

```
┌──────────┐   1. se registra    ┌─────────┐
│   App    │ ──────────────────► │ Backend │
└──────────┘                     └─────────┘
     ▲                                │
     │                                │ 2. correo con el código
     │  4. POST /auth/verificar       ▼
     │     { codigo: "482913" }   ┌────────────┐
     └─────────────────────────── │  Casilla   │  3. la persona lo lee
                                  └────────────┘
```

**Por qué no un enlace.** La app es nativa: un enlace del correo abre el
navegador del teléfono, y volver de ahí a la app necesita deep links
configurados en Android y en iOS, más una pantalla web que los reciba. Un código
no sale de la app. Además se prueba desde cualquier lado y funciona igual si la
persona abre el mail en la computadora y usa el teléfono.

Por lo mismo, **ningún correo tiene botones que lleven a una pantalla web.** El
de bienvenida ahora dice "abrí Morgana y cargá tu DNI", sin enlace.

### Lo que tenés que armar

Dos pantallas, las dos con un input de 6 dígitos:

| Pantalla | Cuándo aparece | Qué manda |
|---|---|---|
| **Verificar correo** | después de registrarse | `POST /api/auth/verificar` |
| **Nueva contraseña** | después de pedir recuperarla | `POST /api/auth/recuperar/confirmar` |

```tsx
// el input: numérico, 6 dígitos, sin autocorrector
<TextInput
  keyboardType="number-pad"
  maxLength={6}
  autoComplete="one-time-code"   // iOS lo ofrece solo desde el mail
  value={codigo}
  onChangeText={setCodigo}
/>
```

`autoComplete="one-time-code"` hace que iOS sugiera el código arriba del teclado
apenas llega el mail. Es gratis y se nota.

### Verificar el correo

**Pide sesión**, y por eso el body es solo el código: la cuenta sale del token.
Después de registrarse la app ya tiene sesión, así que la pantalla sale sola.

```ts
await api.post('/auth/verificar', { codigo })
// 200 → "Listo, tu correo quedó verificado."
```

Se puede mandar con espacios o guiones —`"482 913"` entra igual—, así que **no
limpies el valor en el front**: mandalo como lo escribió la persona.

> Verificar **no desbloquea nada**: eso lo hace el DNI. Son dos cosas distintas
> y pueden pasar en cualquier orden. Si la persona quiere saltear la
> verificación, dejala: la app funciona igual.

### La contraseña nueva

Esta es pública —quien la olvidó no tiene sesión— y por eso **el email va en el
body**: un número de 6 dígitos no identifica a nadie por sí solo, hace falta
saber de qué cuenta hablamos.

```ts
await api.post('/auth/recuperar/confirmar', { email, codigo, password })
// 200 → "Listo, ya podés entrar con tu contraseña nueva." → mandala al login
```

Guardá el email que escribió en la pantalla anterior y reusalo acá, para que no
lo tipee dos veces.

### Reenviar

```http
POST /api/auth/verificar/reenviar     ← con sesión, sin body
POST /api/auth/recuperar              ← público, { email }
```

Los dos dan de baja el código anterior: **el último que llegó es el que vale.**

**Hay un minuto de espera entre envíos.** Si tocan el botón dos veces seguidas,
la segunda contesta *"Recién te mandamos uno. Revisá tu bandeja, puede tardar un
minuto."* — mostralo y arrancá un contador de 60 segundos en el botón, así el
mensaje no toma por sorpresa.

### El código se puede errar 5 veces

A la quinta **se quema**, aunque no haya vencido: a partir de ahí ni el código
correcto sirve y hay que pedir otro. Es lo que hace que 6 dígitos alcancen —sin
eso, probarlos todos es cuestión de tiempo.

Como el mensaje de error es siempre el mismo, el front no puede saber cuántos
intentos quedan. **Después de 3 errores, ofrecé el botón de reenviar** en vez de
dejar a la persona golpeando contra un código ya quemado.

### Cuánto viven

| | |
|---|---|
| verificar el correo | **30 minutos** |
| contraseña nueva | **15 minutos** — es corto a propósito: ese código abre la cuenta |

### Checklist de esta parte

- [ ] Pantalla de código con input numérico de 6 dígitos y `one-time-code`
- [ ] Verificar manda **solo** `{ codigo }` y necesita sesión
- [ ] La contraseña nueva manda `{ email, codigo, password }`, sin sesión
- [ ] El botón de reenviar tiene contador de 60 segundos
- [ ] A los 3 errores aparece "pedir otro código"
- [ ] No se limpia el código antes de mandarlo: el backend acepta espacios

---

## `POST /api/auth/verificar`

**Con sesión.**

```json
{ "codigo": "482913" }
```

Responde `200 { "message": "Listo, tu correo quedó verificado." }`.

**El código sirve una sola vez y vive 30 minutos.** Equivocado, usado, vencido o
quemado por intentos dan todos el mismo `400`:

```json
{ "message": "Ese código no sirve: puede estar mal escrito, haber vencido o ya haberse usado. Pedí uno nuevo." }
```

Es a propósito que no diga cuál: precisar el motivo le confirma a quien esté
probando números que va por buen camino.

Si lo que mandaste no tiene forma de código, el `400` es otro y sí es específico
—*"El código son 6 números, como llegó en el correo."*—; eso no revela nada.

### `POST /api/auth/verificar/reenviar`

Sin body, **con sesión**. Manda otro código y da de baja el anterior. Funciona
aunque la cuenta esté `bloqueado` por falta de DNI: son dos cosas distintas.

| Respuesta | Cuándo |
|---|---|
| `"Te mandamos un correo con el código."` | salió |
| `"Recién te mandamos uno. Revisá tu bandeja, puede tardar un minuto."` | hace menos de 60 segundos que se pidió otro |
| `"Tu correo ya estaba verificado."` | no hacía falta |

Los tres son `200`: ninguno es un error que haya que pintar de rojo.

---

## `POST /api/auth/recuperar`

```json
{ "email": "ana@mail.com" }
```

Responde **siempre** `200` con el mismo texto, exista o no la cuenta:

```json
{ "message": "Si esa dirección tiene una cuenta, te mandamos un correo con el código." }
```

No es vaguedad: si contestara distinto cuando el correo existe, este endpoint
sería un buscador de clientes del negocio. Mostrá ese mensaje tal cual y mandá a
la persona a la pantalla del código.

Las cuentas que entran con Google no reciben nada — no tienen contraseña que
recuperar — y tampoco se les avisa, por lo mismo. **Y si pidieron uno hace menos
de un minuto, tampoco sale otro**: la respuesta sigue siendo la misma, porque
hasta un "esperá un minuto" delataría que esa cuenta existe.

### `POST /api/auth/recuperar/confirmar`

```json
{ "email": "ana@mail.com", "codigo": "482913", "password": "laNuevaClave123" }
```

| Campo | | |
|---|---|---|
| `email` | obligatorio | el mismo de la pantalla anterior |
| `codigo` | obligatorio | 6 dígitos. Se puede mandar con espacios |
| `password` | obligatorio | 8 a 72 caracteres, igual que en el registro |

`200 { "message": "Listo, ya podés entrar con tu contraseña nueva." }` y la
persona vuelve al login. **Este código vive 15 minutos** —es corto a propósito:
abre la cuenta— y también sirve una sola vez.

Un email que no existe y un código equivocado dan **exactamente el mismo `400`**.
Es lo mismo de arriba: si "esa cuenta no existe" fuera un error distinto, este
endpoint volvería a ser el buscador que el otro evita.

Dos cosas que conviene saber:

- **el correo queda verificado de paso**: haber recibido el código prueba que la
  persona llega a esa casilla;
- **las sesiones abiertas siguen valiendo**. Los JWT de esta app no se pueden
  revocar, así que cambiar la contraseña no echa a quien ya estaba adentro con
  un token vivo. Si eso hace falta, hay que agregar lista de sesiones.

---

## `GET /api/users/me`

La cuenta propia, para cualquier rol. Es lo que hay que pedir al abrir la app.

```json
{
  "id": "e0be7db4-...",
  "name": "Ana Pérez",
  "displayName": "Ana Pérez",
  "email": "ana@mail.com",
  "emailVerificado": false,
  "dni": null,
  "telefono": null,
  "direccion": null,
  "camposFijos": [{ "campo": "email", "motivo": "El correo no se cambia desde acá..." }],
  "rol": "cliente",
  "estado": "bloqueado",
  "motivoBloqueo": "Para usar la app necesitás cargar tu DNI en tu perfil.",
  "tieneGoogle": false,
  "tienePassword": true,
  "createdAt": "2026-08-19T19:20:46.709Z",
  "lastLoginAt": "2026-08-19T19:21:05.209Z"
}
```

`name` es para mostrar y nunca viene vacío; `displayName` es lo que la persona
cargó y puede ser `null` — el que va en el input del formulario.

> Para el login alcanza con `estado` y `motivoBloqueo`. El resto —contacto,
> `camposFijos`, correo verificado— es la pantalla **mi cuenta**, y está en
> [`flujo_mi_cuenta.md`](./flujo_mi_cuenta.md).

---

## `PATCH /api/users/me` — el modal

El único lugar donde se completa el perfil, y la salida del bloqueo. Es el mismo
endpoint con el que después se edita la cuenta entera —nombre, teléfono,
dirección—; acá solo importa el `dni`. Lo demás, en
[`flujo_mi_cuenta.md`](./flujo_mi_cuenta.md).

```json
{ "dni": "38180903" }
```
```json
{ "displayName": "Ana Pérez" }
```

| Campo | | |
|---|---|---|
| `dni` | opcional | 7 a 9 dígitos. Podés mandarlo con puntos: `38.180.903` se guarda `38180903` |
| `displayName` | opcional | hasta 100, no puede quedar vacío |

Al menos uno de los dos. El body vacío es `400`.

Devuelve `200` con el mismo objeto de `/users/me`, ya con `estado: "activo"`.
**No hace falta renovar el token**: el mismo Bearer entra a todos lados en la
request siguiente.

### El DNI se carga una sola vez

| Qué mandás | Qué pasa |
|---|---|
| el primer DNI | `200`, queda cargado |
| **el mismo** DNI de nuevo | `200`, no es error — sirve para reintentar si se cortó la conexión |
| **otro** DNI, con uno ya cargado | `409` *"Tu DNI ya está cargado y no se cambia desde la app. Acercate al local o escribile a un administrador para que lo corrija."* |
| un DNI que ya es de otra cuenta | `409` *"Ese DNI ya figura en otra cuenta. Acercate al local para que lo resuelvan."* |

Los dos `409` son un **callejón para el usuario a propósito**: cambiar el
documento con el que se lo identifica es cosa del mostrador, no de la app. Por
eso el mensaje siempre dice a dónde ir, y la pantalla tiene que dejarlo salir del
modal aunque no haya podido cargarlo.

---

## Qué pasa cuando está bloqueado

Cualquier endpoint que no sea `/users/me` responde:

```
403  { "message": "Para usar la app necesitás cargar tu DNI en tu perfil." }
```

Quedan abiertos, y son los únicos: `POST /auth/*` (todavía no hay sesión),
`GET /api/users/me` y `PATCH /api/users/me`.

En la app: si `estado === "bloqueado"`, mostrá el modal y no dejes navegar a
otra pantalla. Si igual se escapa un request y vuelve `403` con ese `message`,
volvé a abrir el modal en vez de mandar a la pantalla de error.

---

## Cómo se arma en el front

Tres piezas y nada más: el estado en el store, un portero antes de la
navegación, y el interceptor por si algo se escapa.

**1. Guardar el estado con la sesión.** Sale del mismo `{ user }` del login, del
registro y de Google:

```ts
type Sesion = {
  id: string
  name: string
  email: string | null
  dni: string | null
  rol: 'super_admin' | 'administrador' | 'cliente'
  estado: 'activo' | 'bloqueado'
  motivoBloqueo: string | null
}
```

**2. El portero, antes de decidir la pantalla.** Va *arriba* del switch por rol:
el bloqueo no distingue roles, así que se pregunta primero.

```tsx
if (!sesion) return <Login />
if (sesion.estado === 'bloqueado') return <ModalCompletarPerfil />

switch (sesion.rol) {
  case 'super_admin':   return <PanelSuperAdmin />
  case 'administrador': return <PanelAdmin />
  case 'cliente':       return <PanelCliente />
}
```

**3. El modal.** Un input de DNI, y al guardar:

```ts
const respuesta = await api.patch('/users/me', { dni })
setSesion(respuesta)          // ya viene con estado: "activo"
// el token NO se renueva: el mismo Bearer sirve en la request siguiente
```

Los errores del modal se muestran tal cual y **sin cerrar la app**: los dos
`409` son casos en los que la persona no puede seguir sola y tiene que ir al
local. Dejala salir del modal (aunque quede bloqueada) o va a reinstalar la app
buscando destrabarse.

**4. Al abrir la app**, refrescar con `GET /api/users/me` antes de navegar: el
administrador puede haberle cargado el DNI desde el panel, y la sesión guardada
en el teléfono diría `bloqueado` de más.

**5. El interceptor**, como red y no como camino principal:

```ts
if (error.status === 403 && error.message.includes('DNI')) {
  await refrescarSesion()     // GET /users/me
  abrirModalDePerfil()
  return
}
// el otro 403 sí es de permisos: pantalla de error
```

---

## Lo que ve el administrador

El `estado` viene en las tres pantallas del panel donde aparece un cliente:
el listado (`GET /api/admin/clientes`), la ficha
(`GET /api/admin/clientes/:id`) y la cuenta
(`GET /api/admin/clientes/:id/cuenta`, en el bloque `cliente`).

Mostralo como **dato faltante y no como castigo**: "Falta el DNI" en ámbar, no
"BLOQUEADO" en rojo. Rojo ya es el de
[`no se le fía`](./bloquear_fiado.md), que es otra cosa y se puede dar junta con
esta.

> **A un cliente bloqueado se le factura igual.** El bloqueo es de la app, no del
> mostrador: emitir, cobrar y anular funcionan lo mismo. Lo único que ese cliente
> no puede es usar la app hasta cargar su documento.

### `PATCH /api/admin/clientes/:id/dni`

Cargar o corregir el documento con la persona enfrente. Es la única forma de
arreglar un DNI mal tipeado, y también sirve para completarle la ficha al
cliente que nunca abrió la app.

```json
{ "dni": "38180903", "motivo": "Lo cargó mal, faltaba un dígito" }
```

| Campo | | |
|---|---|---|
| `dni` | obligatorio | 7 a 9 dígitos, se puede con puntos |
| `motivo` | obligatorio | hasta 300. Queda guardado con quién lo hizo y cuándo |

Devuelve `200` con la ficha del cliente, ya en `estado: "activo"`. Errores:
`404` si ese cliente no existe, `409` si el documento ya está en otra cuenta
(*"Revisá si el cliente está registrado dos veces"*).

---

## Los errores

| | Cuándo | Qué mostrar |
|---|---|---|
| `400` | falta el email, contraseña corta, DNI mal formado, body vacío | el `message` tal cual: ya viene redactado |
| `401` | credenciales incorrectas | *"Email o contraseña incorrectos."* |
| `401` | la cuenta se creó con Google | *"Esta cuenta se creó con Google. Entrá con el botón de Google."* — **mostrá el botón de Google ahí mismo** |
| `403` | perfil incompleto | abrí el modal del DNI |
| `409` | el email ya existe | *"Ese email ya está registrado."* |
| `409` | el DNI ya está cargado o es de otra cuenta | el `message`: dice qué hacer |
| `409` | Google contra una cuenta con contraseña sin verificar | el `message`: que entre con su contraseña y verifique el correo |
| `400` | código de correo equivocado, vencido, usado o quemado | *"Ese código no sirve…"* — ofrecé pedir uno nuevo |

Todos llegan como `{ "message": "..." }`, un string plano.

**El `401` de credenciales no dice cuál de los dos campos falló**, y es a
propósito: si dijera "ese email no existe", cualquiera podría averiguar quién
tiene cuenta. No lo desglose la pantalla tampoco — marcá los dos campos.

---

## Qué tenés que cambiar en la app

- [ ] **Registro**: sacar el input de DNI. Queda email + contraseña (+ nombre).
- [ ] **Login**: sacar la opción de entrar con DNI. Queda email + contraseña.
- [ ] Guardar `estado` junto con el usuario de la sesión.
- [ ] **Modal de perfil**: se abre cuando `estado === "bloqueado"`, después del
      login, del registro y del login con Google. Un input de DNI y nada más.
- [ ] Manejar los dos `409` del modal mostrando el `message` y dejando salir.
- [ ] Al abrir la app, refrescar con `GET /api/users/me` — el estado puede haber
      cambiado desde el panel.
- [ ] Interceptor: `403` con ese `message` → reabrir el modal, no pantalla de
      error.
- [ ] **Panel**: chip "Falta el DNI" en listado, ficha y cuenta, con el botón
      para cargarlo (`PATCH /api/admin/clientes/:id/dni`).
- [ ] Borrar las llamadas a `GET`/`PATCH /api/cliente/mi-cuenta`: **ya no
      existen**, ahora es `/api/users/me` para todos los roles.
- [ ] **"¿Olvidaste tu contraseña?"** en el login → pantalla que pide el email y
      muestra el mensaje que devuelve la API, sin decir si existe o no.
- [ ] **Las dos pantallas de código** — verificar correo y contraseña nueva.
      Input numérico de 6 dígitos; están explicadas con el código en
      [El código que llega al correo](#el-código-que-llega-al-correo).
- [ ] Botón "reenviar el código" con contador de 60 segundos.
- [ ] Manejar el `409` de Google: mostrar el `message` y ofrecer entrar con
      contraseña.

---

## Probarlo sin la app

```bash
API=http://localhost:3000/api

# 1. alta: nace bloqueada
curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"prueba@mail.com","password":"unaClave123"}'

# 2. con ese token, cualquier cosa que no sea /users/me da 403
TOKEN=...
curl -s $API/admin/clientes -H "Authorization: Bearer $TOKEN"

# 3. cargar el DNI (con puntos, como lo escribe una persona)
curl -s -X PATCH $API/users/me -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"dni":"38.180.903"}'

# 4. el mismo token ya pasa
curl -s $API/users/me -H "Authorization: Bearer $TOKEN"
```

En el seed de demo, **Karina Blanco** (`karina.blanco@mail.com`) es la cuenta que
viene bloqueada, con una factura pendiente: sirve para probar las dos salidas
—que lo cargue ella o que se lo cargue el administrador— sin crear nada.

> ⚠️ **La cuenta de administrador también necesita DNI.** Las que sembró
> `npm run db:seed` no lo tienen, así que hoy el panel les responde `403` hasta
> que lo carguen. Se destraba de dos formas: poniendo `ADMIN_DNI` (y
> `SUPER_ADMIN_DNI`) en el `.env` y corriendo el seed de nuevo, o cargándolo
> desde la app con `PATCH /api/users/me`. Si al probar el panel te aparece el
> modal del DNI en vez del tablero, es esto y no un bug.
