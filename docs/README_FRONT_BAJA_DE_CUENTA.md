# README — Dar de baja la cuenta, en el front

Guía para implementar en la app el apartado **"Eliminar mi cuenta"** del perfil.
El backend está **hecho, probado y montado**: los dos endpoints responden hoy.

> Todos los ejemplos de respuesta de este documento **salieron de la API
> corriendo**, no están escritos a mano. Los nombres y los ids son de prueba; la
> forma y los textos son exactos.

---

## 0. Por qué existe esto

No es una idea de producto: **Google Play lo exige**. Si la app deja crearse una
cuenta, tiene que dejar borrarla.

| Lo que pide Play | Cómo se cumple |
|---|---|
| Un camino **en la app** para borrar la cuenta y sus datos | ✅ hecho — ver el mapa de abajo |
| Un **link web** para pedirlo sin reinstalar la app | ❌ **falta** — ver §7 |
| Se puede **retener** datos por cumplimiento… | ✅ solo el correo, y solo mientras haya deuda |
| …**si se le informa a la persona qué y por qué** | ✅ es lo que devuelve `GET /users/me/baja` |
| Que sea borrado, no desactivación | ✅ sin deuda, el registro se va de la base |

Ese anteúltimo punto es la clave de cómo está armado esto: **la vista previa no
es una cortesía de UX, es el aviso que la política obliga a mostrar**. Por eso
los textos vienen escritos desde el servidor en vez de quedar sueltos en el
front, donde cada pantalla los redactaría distinto y ninguno sería el que se
declaró.

### Dónde quedó cada cosa en este front

| § | Qué | Dónde |
|---|---|---|
| §3 §4 | La pantalla de baja, con la vista previa y la confirmación | `features/perfil/screens/EliminarCuentaScreen.tsx`, ruta `ELIMINAR_CUENTA` |
| §3 §4 | Los dos endpoints | `features/perfil/api/perfilApi.ts` |
| §3 §4 | Los schemas y la comparación de la palabra | `features/perfil/types.ts` |
| §5 | El `401` de cuenta dada de baja, como cartel del login | `features/auth/components/AvisoDeCuentaDadaDeBaja.tsx` |
| §5 | El corte del token viejo, en cualquier endpoint | `services/api/baseApi.ts` |
| §6 | La entrada, al final del perfil | `features/perfil/screens/MiCuentaScreen.tsx` |
| §8 | `dadaDeBajaEn` en el listado y en las dos fichas | `features/usuarios`, `features/super-admin` |

⚠️ **Es una pantalla y no un diálogo.** La vista previa con deuda son dos
párrafos más ocho renglones: adentro de una tarjeta centrada eso se sale de un
teléfono, y la §3 dice que `seRetiene` no es opcional de mostrar. En una pantalla
scrollea y entra entero, que es lo que la política pide.

⚠️ **También se llega desde el cartel del DNI**, no solo desde Mi cuenta. Una
cuenta bloqueada no tiene ninguna otra ruta registrada, así que sin eso la
persona que más chances tiene de querer irse —la que se registró y nunca cargó el
documento— no tendría cómo, y la §2 aclara que los dos endpoints le responden
igual.

⚠️ **El cliente HTTP de la §6 no se usó**: esta app va con RTK Query sobre un
`baseApi` que ya pone el `Bearer` y valida las respuestas con Zod. El `DELETE`
**no invalida ningún tag**, a propósito: el token muere en el mismo request y
cualquier refetch volvería `401` justo cuando la persona tendría que estar
leyendo la despedida.

⚠️ **La salida del `401` es el texto del backend y nada más.** La §5 pide un
"escribinos" con el contacto del local, y el mensaje del servidor ya lo dice —
pero **la app no tiene ningún teléfono ni correo del negocio configurado**, así
que no hay a dónde linkear. Cuando exista ese dato, va en ese cartel.

⚠️ **Falta el link web de la §7**, que es la otra mitad de lo que Play exige. No
es trabajo de esta app: hay que decidirlo antes de mandar el build a revisión.

---

## 1. Los dos caminos

```
                        ¿debe plata?
                             │
              ┌──────────────┴──────────────┐
             NO                             SÍ
              │                              │
      camino "total"                 camino "con_deuda"
              │                              │
   Se borra TODO, ya.            La cuenta se cierra igual,
   No queda nada.                pero se retiene el correo
   No puede volver a entrar.     para avisarle de la deuda.
                                              │
                                   cuando el administrador
                                   cobra el saldo…
                                              │
                                   se borra todo SOLO,
                                   sin que nadie apriete nada
```

Lo importante para el front: **el usuario ve un solo botón**. La app pregunta
primero (`GET`), muestra lo que corresponda, y recién ahí borra (`DELETE`).

---

## 2. Los dos endpoints

```http
GET    /api/users/me/baja     ← qué va a pasar. No borra nada.
DELETE /api/users/me          ← lo hace. Body: { "confirmacion": "ELIMINAR" }
```

Los dos con `Authorization: Bearer <token>`.

⚠️ **Los dos funcionan con la cuenta bloqueada** (la que nunca cargó el DNI). Es
a propósito: esa persona es justamente la que más chances tiene de querer irse, y
la política pide que el camino esté disponible igual.

---

## 3. `GET /users/me/baja` — la pantalla de confirmación

### Camino feliz, sin ninguna factura

```json
{
  "camino": "total",
  "deuda": 0,
  "facturas": 0,
  "titulo": "Se va a borrar tu cuenta",
  "mensaje": "No debés nada, así que se borra todo. No vas a poder volver a entrar con esta cuenta y no se puede deshacer.",
  "seBorra": [
    "Tu perfil: nombre, documento, correo, teléfono y dirección",
    "Tu forma de entrar: la contraseña y el vínculo con Google",
    "Todas tus notificaciones",
    "Tu conversación con el negocio y todos los mensajes",
    "Las imágenes de los comprobantes que mandaste"
  ],
  "seRetiene": [],
  "paraCompletarla": null,
  "confirmacion": "ELIMINAR"
}
```

### Sin deuda pero con compras hechas

Cambia una sola cosa: `seRetiene` deja de estar vacío.

```json
{
  "camino": "total",
  "deuda": 0,
  "facturas": 1,
  "seRetiene": [
    {
      "dato": "El registro de tus compras",
      "motivo": "Queda en la contabilidad del negocio pero sin tu nombre ni ningún dato tuyo: no hay forma de volver a vincularlo con vos."
    }
  ]
}
```

*(recortado: el resto es igual al de arriba)*

### Con deuda

```json
{
  "camino": "con_deuda",
  "deuda": 8000,
  "facturas": 1,
  "titulo": "Tenés una deuda de $8000.00",
  "mensaje": "Podés darte de baja igual y no vas a poder volver a entrar. Pero la deuda no se borra: vamos a seguir guardando tu nombre, tu documento y tu correo para poder avisarte, y nada más. Cuando termines de pagar se borra todo solo.",
  "seBorra": [ "…igual que arriba…" ],
  "seRetiene": [
    {
      "dato": "Tu nombre y tu documento",
      "motivo": "Es lo que identifica la deuda mientras no esté saldada."
    },
    {
      "dato": "Tu correo",
      "motivo": "Es por donde te van a seguir llegando los avisos de lo que debés. No lo usamos para nada más."
    },
    {
      "dato": "Tus facturas y los pagos anotados",
      "motivo": "Es el registro contable del negocio y queda aunque la deuda se salde."
    }
  ],
  "paraCompletarla": "Cuando saldes los $8000.00 que debés, se borra solo lo que haya quedado. No tenés que volver a pedir nada.",
  "confirmacion": "ELIMINAR"
}
```

### Cómo se dibuja

**No escribas copy propio.** Los seis campos de texto ya vienen redactados y son
los que se declararon en la política. El diálogo se arma solo:

```
┌────────────────────────────────────────────────┐
│  {titulo}                                      │
│                                                │
│  {mensaje}                                     │
│                                                │
│  Se borra:                    ← si seBorra     │
│   · {seBorra[0]}                               │
│   · {seBorra[1]}  …                            │
│                                                │
│  Queda guardado:              ← si seRetiene   │
│   · {seRetiene[n].dato}                        │
│     {seRetiene[n].motivo}                      │
│                                                │
│  {paraCompletarla}            ← si no es null  │
│                                                │
│  Escribí {confirmacion} para confirmar:        │
│  [_______________]                             │
│                                                │
│         [ Cancelar ]  [ Eliminar mi cuenta ]   │
└────────────────────────────────────────────────┘
```

⚠️ **La palabra sale de `confirmacion`, no la hardcodees.** Viaja en la respuesta
justamente para que el día que cambie el diálogo la siga sin tocar el front.

⚠️ **`seRetiene` no es opcional de mostrar.** Es la parte que la política obliga.
Si no entra en la pantalla, achicá otra cosa.

---

## 4. `DELETE /users/me` — el borrado

```http
DELETE /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{ "confirmacion": "ELIMINAR" }
```

Se acepta con espacios y en minúscula (`" eliminar "` sirve): el teclado del
teléfono corrige solo y pelear con eso no protege de nada.

### Respuesta — camino feliz

```json
{
  "camino": "total",
  "titulo": "Listo, tu cuenta se borró",
  "mensaje": "No quedó ningún dato tuyo. Si algún día querés volver, vas a tener que registrarte de nuevo.",
  "deuda": 0,
  "avisosA": null,
  "sesionCerrada": true
}
```

### Respuesta — con deuda

```json
{
  "camino": "con_deuda",
  "titulo": "Tu cuenta quedó dada de baja",
  "mensaje": "Todavía debés $8000.00. Guardamos tu nombre, tu documento y tu correo solo para poder avisarte, y nada más. Cuando termines de pagar se borra todo solo.",
  "deuda": 8000,
  "avisosA": "zoraida@mail.com",
  "sesionCerrada": true
}
```

**`avisosA` es el correo al que le van a seguir llegando los avisos.** Mostralo
en pantalla: es lo que le permite darse cuenta *ahora* —y no en tres meses— de
que era una casilla que ya no lee.

### Lo que el front tiene que hacer después

```js
const baja = await darDeBaja(token);

// 1. Mostrar `baja.titulo` y `baja.mensaje`. Es lo último que lee de la app.
// 2. Borrar el token del store. `sesionCerrada` siempre viene en true.
// 3. Volver al login, sin pasar por ninguna otra pantalla.
```

⚠️ **No navegues a una pantalla con sesión después de esto.** El token dejó de
servir en el mismo request: cualquier llamada siguiente devuelve `401` y el
usuario ve un error donde tendría que ver una despedida.

### Los errores

| | |
|---|---|
| `400` `"Para confirmar, escribí ELIMINAR."` | falta el body o la palabra no coincide |
| `409` `"Las cuentas del negocio no se dan de baja desde acá. Pedísela al super admin."` | la cuenta es `administrador` o `super_admin` |
| `401` | el token ya no sirve (¿doble toque?) |

⚠️ **El `DELETE` lleva body**, y hay clientes HTTP y proxies que los tiran. Si
eso pasa, el resultado es un `400` — que es el lado correcto por el que fallar,
pero conviene saberlo si ves ese error sin explicación. En React Native
`fetch` con `method: 'DELETE'` y `body` funciona.

---

## 5. Qué pasa si intenta volver

Una cuenta dada de baja **con deuda** conserva el correo, así que hay cuatro
caminos por los que podría intentar entrar. Los cuatro están cerrados y **los
cuatro contestan el mismo texto**:

```json
{ "message": "Esta cuenta está dada de baja. Si tenías algo pendiente, escribinos para resolverlo." }
```

| Camino | Qué pasa |
|---|---|
| El token viejo, en cualquier endpoint | `401` con ese mensaje |
| `POST /auth/login` con su email y contraseña | `401` con ese mensaje |
| `POST /auth/google` con su cuenta de Google | `401` con ese mensaje |
| `POST /auth/recuperar` | `200` con la respuesta genérica de siempre, y **no le manda nada** |

El de Google era el más peligroso y conviene que el front lo sepa: ese login
vincula por correo, así que sin el corte le devolvía la cuenta entera como si
nada hubiera pasado.

**Mostrá ese `401` como una pantalla, no como un toast**, y con una salida —un
"escribinos" con el contacto del local—. Alguien que ve ese mensaje probablemente
quiera arreglar su deuda y volver.

Si intenta **registrarse de nuevo** con el mismo correo mientras deba plata, va a
recibir el `409` de siempre: `"Ese email ya está registrado."` Es a propósito —no
confirma que la cuenta esté dada de baja a cualquiera que tipee un correo ajeno—
pero por eso conviene que la pantalla de registro tenga a mano el "¿problemas
para entrar?".

Una vez que salda la deuda, el correo queda libre y **se puede registrar de
nuevo, como cualquiera**.

---

## 6. Dónde va en el perfil

Play pide que el camino sea **intuitivo y esté a la vista**, típicamente en los
ajustes de la cuenta. Concretamente:

- en la pantalla de perfil, **al final**, separado del resto;
- que se llame **"Eliminar mi cuenta"** —no "Dar de baja", no "Cerrar sesión
  permanentemente"—: el revisor de Play busca esas palabras;
- a un toque de distancia del perfil, no escondido bajo tres menús;
- y que abra el diálogo de la §3, que ya trae todo escrito.

```js
const API = process.env.EXPO_PUBLIC_API_URL; // https://tu-back/api

export async function vistaPreviaDeLaBaja(token) {
  const r = await fetch(`${API}/users/me/baja`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!r.ok) throw new Error((await r.json()).message);

  return r.json();
}

export async function darDeBaja(token, confirmacion) {
  const r = await fetch(`${API}/users/me`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmacion }),
  });

  const cuerpo = await r.json();

  if (!r.ok) throw new Error(cuerpo.message);

  return cuerpo;
}
```

---

## 7. Lo que falta para cumplir con Play

**El link web.** Play pide, además del camino en la app, **una URL donde se pueda
pedir el borrado sin reinstalarla** —para quien ya desinstaló— y esa URL se
declara en el formulario de Data safety de Play Console.

Hoy no existe. Los endpoints ya sirven para las tres salidas:

| | Trabajo |
|---|---|
| Una pantalla en el front web contra estos mismos dos endpoints | poco, si hay front web |
| Una página servida por este backend en `/baja`: pide correo y contraseña, dispara el mismo servicio | mediano, se resuelve en un solo repo |
| Un formulario externo y borrado a mano desde el panel del super admin | poco, pero alguien tiene que atenderlo todos los días |

Sin eso, la app cumple la mitad de la política. **Decidilo antes de mandar el
build a revisión.**

---

## 8. Lo que cambia en el panel del administrador

Dos cosas, por si esas pantallas ya están construidas:

**`UsuarioDto` tiene un campo nuevo: `dadaDeBajaEn`.** Es `null` en las cuentas
vivas y trae fecha en las que se dieron de baja debiendo plata. Esas siguen
apareciendo en el listado y en el tablero de deuda —hay algo que cobrar— pero
**ya no entran a la app**, así que el que las llame no puede decirles "fijate en
la app". Mostralo como un chip al lado del nombre.

**Las cuentas ya borradas del todo desaparecen** del listado de clientes, del
tablero de deuda, de las métricas por cliente y de los anuncios. No es un filtro
que puedas desactivar: son cuentas sin nombre ni correo, serían una fila en
blanco. Sus facturas siguen contando en toda la plata —el tablero, el ticket del
mes— porque un mes ya cerrado no puede cambiar de número.

---

Lo demás del perfil está en [`flujo_mi_cuenta.md`](./flujo_mi_cuenta.md) y
[`flujo_login.md`](./flujo_login.md).
