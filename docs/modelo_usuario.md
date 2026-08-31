# El documento de un usuario

> Qué guarda MongoDB de una cuenta, qué de eso sale a la app y qué la app recibe
> sin que esté guardado. Es el mapa entre la colección `users` y los schemas de
> Zod de este repo.
>
> Fuente: la colección `users` del backend (`MORGANA-BACK`), esquema en
> `src/mongo/esquemas/usuario.esquema.ts`.

Este documento se escribió a partir de una cuenta real: **`sonwokong1@gmail.com`**,
la primera creada con Google después de la mudanza de Postgres a Mongo.

⚠️ Lleva un DNI y un correo de verdad. Si esta guía sale del repo, tapalos.

**Para tener esta cuenta delante**, en vez de entrar a mano con el botón de
Google desde un teléfono con Play Services:

```bash
cd ../MORGANA-BACK
npm run db:seed:google
```

Siembra exactamente el documento de acá abajo y lo imprime al terminar — es de
donde sale el JSON de esta guía cuando el esquema cambia. Es idempotente, y con
`GOOGLE_SEED_DNI=` vacío siembra la misma cuenta **sin DNI**, que es el estado
`bloqueado` con el que nace toda cuenta nueva. Detalle en
`MORGANA-BACK/seeds/seed-cuenta-google.ts`.

---

## 1. El documento completo

Tal como lo devuelve la base:

```json
{
  "_id": "«uuid v4 en texto»",
  "email": "sonwokong1@gmail.com",
  "dni": "36158123",
  "passwordHash": null,
  "displayName": "Ricardo Ramirez",
  "googleId": "112863164437951399832",
  "telefono": null,
  "direccion": null,
  "rol": "cliente",
  "seLeFia": true,
  "motivoSinFiado": null,
  "fiadoActualizadoEn": null,
  "fiadoActualizadoPorId": null,
  "dniActualizadoEn": null,
  "dniActualizadoPorId": null,
  "motivoCambioDni": null,
  "emailVerificadoEn": { "$date": "2026-08-26T15:10:53.971Z" },
  "lastLoginAt":       { "$date": "2026-08-26T15:10:53.971Z" },
  "createdAt":         { "$date": "2026-08-26T15:10:53.974Z" },
  "updatedAt":         { "$date": "2026-08-26T15:11:11.368Z" },
  "__v": 0
}
```

Dos cosas de esa vista que **no viajan a la app**:

- **`{ "$date": ... }`** es Extended JSON, la forma en que Compass y `mongoexport`
  escriben una fecha. Por HTTP no llega así: los DTO hacen `.toISOString()` y la
  app recibe el string `"2026-08-26T15:10:53.971Z"` pelado.
- **`__v`** es el contador de versión de Mongoose. No lo usa nadie y no sale por
  la API.

---

## 2. Qué le pasó a esta cuenta

Los timestamps cuentan la historia entera, y conviene saber leerla porque es la
forma más rápida de entender en qué estado está alguien:

| Momento | Qué pasó |
|---|---|
| `15:10:53.971` | Entró con Google por primera vez. La cuenta no existía, así que se creó ahí mismo (`AuthService.loginWithGoogle`, rama final). |
| `15:10:53.974` | `createdAt`. Tres milisegundos después: es la misma operación. |
| `15:11:11.368` | `updatedAt`. Dieciocho segundos más tarde: cargó el DNI. |

Se sabe que la cuenta **nació** con Google —y no que se vinculó a una que ya
existía— porque `emailVerificadoEn` y `lastLoginAt` tienen el mismo instante que
la creación. Al crearse por Google, el correo nace verificado: que Google lo
confirme ya prueba que es suyo, así que esta cuenta nunca recibe el mail del
código.

Y se sabe que **el DNI lo cargó la propia persona** porque `dniActualizadoEn` y
`dniActualizadoPorId` quedaron en `null`. Esos dos campos los estampa **solo** la
corrección desde el panel (`admin/clientes.service.ts`); cargarlo uno mismo desde
Mi cuenta (`PATCH /users/me`) no los toca. La diferencia importa: es lo que
distingue "lo puso el cliente al registrarse" de "lo corrigió un encargado en el
mostrador".

Esos dieciocho segundos son el modal de perfil incompleto: la cuenta nació
`bloqueado` (sin DNI) y salió del bloqueo apenas lo cargó.

---

## 3. Campo por campo

La columna **"sale"** dice si el campo llega al cliente en alguna respuesta de la
API.

### Identidad

| Campo | Tipo | Acá | Sale | Detalle |
|---|---|---|---|---|
| `_id` | `string` | uuid v4 | sí, como **`id`** | ⚠️ **No es un `ObjectId`**: el esquema le pone `default: () => randomUUID()`. Se traduce a `id` en el borde (`aSafeUser`), así que la app nunca dice `_id`. |
| `email` | `string \| null` | el de Google | sí | Único, pero con **índice parcial**. `null` solo en cuentas viejas creadas con DNI. |
| `dni` | `string \| null` | `"36158123"` | sí | Solo dígitos, ya normalizado. **Nace `null`, y ese es el estado bloqueado.** |
| `googleId` | `string \| null` | el `sub` de Google | **no** | Sale convertido en el booleano `tieneGoogle`. Es la identidad real de la cuenta de Google: el email puede cambiar, el `sub` no. |
| `passwordHash` | `string \| null` | `null` | **NUNCA** | `null` porque esta cuenta entra solo con Google. Sale convertido en `tienePassword`. |
| `displayName` | `string \| null` | `"Ricardo Ramirez"` | sí | Lo que cargó la persona (acá lo trajo Google). Puede ser `null`; para mostrar se usa `name`, que se calcula. |

### Contacto

| Campo | Tipo | Acá | Sale | Detalle |
|---|---|---|---|---|
| `telefono` | `string \| null` | `null` | sí | Los carga la persona en Mi cuenta. **Nadie está obligado**: `null` es un valor normal, no un dato faltante. El panel los ve pero no los edita. |
| `direccion` | `string \| null` | `null` | sí | |

### Permisos y verificación

| Campo | Tipo | Acá | Sale | Detalle |
|---|---|---|---|---|
| `rol` | `'super_admin' \| 'administrador' \| 'cliente'` | `"cliente"` | sí | Todo el que se registra nace `cliente`; los otros dos los pone el seed. **No viaja en el token**: se lee de la base en cada request. |
| `emailVerificadoEn` | `Date \| null` | la creación | sí, como **`emailVerificado: boolean`** | La app recibe el booleano, no la fecha. **No bloquea nada**: sirve para ofrecer el reenvío. |
| `lastLoginAt` | `Date \| null` | la creación | sí | `null` = nunca entró. |

### Fiado — datos del mostrador

| Campo | Tipo | Acá | Sale | Detalle |
|---|---|---|---|---|
| `seLeFia` | `boolean` | `true` | **solo al panel** | Si se le fía. ⚠️ **El backend no frena nada con esto**: a un cliente sin fiado se le puede facturar igual. Decide la persona que atiende. |
| `motivoSinFiado` | `string \| null` | `null` | solo al panel | Por qué se le cortó. |
| `fiadoActualizadoEn` / `fiadoActualizadoPorId` | `Date` / `string` | `null` | no | Auditoría: quién cortó el fiado y cuándo. |

⚠️ **El fiado no es el bloqueo.** Son dos marcas distintas y se dan juntas sin
problema: el bloqueo es de la app (no puede operar), el fiado es del mostrador
(se le factura igual, pero al contado). Al cliente **no** se le muestra su marca
de fiado en su propia cuenta.

### Auditoría del DNI

| Campo | Tipo | Acá | Sale | Detalle |
|---|---|---|---|---|
| `dniActualizadoEn` / `dniActualizadoPorId` / `motivoCambioDni` | `Date` / `string` / `string` | `null` | no | Los estampa **solo** la corrección desde el panel, con motivo obligatorio. En `null` = lo cargó la persona. |

---

## 4. Lo que la app recibe y no está en el documento

Estos campos **no se guardan**: se calculan al armar la respuesta. Buscarlos en
Compass es perder el rato.

| Campo | De dónde sale |
|---|---|
| `estado` | `dni ? 'activo' : 'bloqueado'` (`common/types/estado-usuario.ts`). Para esta cuenta: **`activo`**, porque ya cargó el DNI. |
| `motivoBloqueo` | El texto fijo `"Para usar la app necesitás cargar tu DNI en tu perfil."`, o `null` si está activa. |
| `name` | `displayName` → usuario del email → `dni` → `"Usuario"`. Nunca vacío. |
| `emailVerificado` | `emailVerificadoEn !== null`. |
| `tieneGoogle` | `googleId !== null`. |
| `tienePassword` | `Boolean(passwordHash)`. |
| `camposFijos` | Qué inputs van deshabilitados y por qué. El `email` siempre; el `dni` **recién cuando ya está cargado**. |

**`estado` se deriva a propósito.** Una columna guardada se desincroniza: alguien
toca el DNI a mano en la base y la cuenta queda bloqueada para siempre. Derivado,
el estado no puede mentir. La contra es que **el token no lo sabe**: cargar el DNI
desbloquea la cuenta en la request siguiente, sin renovar sesión.

---

## 5. Las tres caras del mismo documento

El mismo usuario sale con tres formas distintas según quién pregunte. El front
tiene un schema de Zod para cada una:

| | Backend | Endpoints | Schema del front |
|---|---|---|---|
| **Sesión** | `AuthUserDto` | `POST /auth/login`, `/auth/register`, `/auth/google` | [`userApiSchema`](../src/features/auth/types.ts) → `toUser()` → `User` |
| **Mi cuenta** | `MiSesionDto` | `GET` y `PATCH /users/me` | [`perfilSchema`](../src/features/perfil/types.ts) |
| **Panel** | `UsuarioDto` | `/admin/clientes`, `/super-admin/usuarios` | [`usuarioSchema`](../src/features/usuarios/types.ts) |

Qué lleva cada una para esta cuenta:

```jsonc
// 1. POST /auth/google  → AuthUserDto + token
{
  "user": {
    "id": "«uuid»",
    "name": "Ricardo Ramirez",
    "email": "sonwokong1@gmail.com",
    "dni": "36158123",
    "rol": "cliente",
    "estado": "activo",
    "motivoBloqueo": null
  },
  "token": "«jwt»"
}
```

Es **lo mínimo para decidir qué se ve**: quién es, qué rol tiene y si puede
operar. Nada de contacto ni de fiado.

```jsonc
// 2. GET /users/me  → MiSesionDto
{
  "id": "«uuid»",
  "name": "Ricardo Ramirez",
  "displayName": "Ricardo Ramirez",   // el crudo, el que va en el input
  "email": "sonwokong1@gmail.com",
  "emailVerificado": true,
  "dni": "36158123",
  "telefono": null,
  "direccion": null,
  "camposFijos": [
    { "campo": "email", "motivo": "…" },
    { "campo": "dni",   "motivo": "…" }   // aparece porque el DNI YA está cargado
  ],
  "rol": "cliente",
  "estado": "activo",
  "motivoBloqueo": null,
  "tieneGoogle": true,
  "tienePassword": false,               // entra solo con Google
  "createdAt": "2026-08-26T15:10:53.974Z",
  "lastLoginAt": "2026-08-26T15:10:53.971Z"
}
```

⚠️ Manda **`name` y `displayName` los dos**: `name` es para mostrar y nunca viene
vacío; `displayName` es el crudo y es el que va en el formulario. La diferencia
importa cuando la persona no cargó nombre — ahí `name` trae el usuario del correo
y `displayName` viene `null`, y poner ese `name` en el input le haría "guardar" un
nombre que nunca escribió.

```jsonc
// 3. GET /admin/clientes  → UsuarioDto (una fila)
{
  "id": "«uuid»",
  "email": "sonwokong1@gmail.com",
  "dni": "36158123",
  "displayName": "Ricardo Ramirez",
  "telefono": null,
  "direccion": null,
  "rol": "cliente",
  "estado": "activo",
  "tieneGoogle": true,
  "tienePassword": false,
  "seLeFia": true,
  "motivoSinFiado": null,
  "createdAt": "2026-08-26T15:10:53.974Z",
  "lastLoginAt": "2026-08-26T15:10:53.971Z"
}
```

La cara del panel: agrega el **fiado**, que el cliente no ve de sí mismo, y no
lleva `camposFijos` ni `motivoBloqueo`.

**Lo que no aparece en ninguna de las tres:** `passwordHash`, `googleId`, `__v` y
los campos de auditoría (`fiadoActualizado*`, `dniActualizado*`,
`motivoCambioDni`). El `passwordHash` no depende de que nadie se acuerde de
sacarlo: la proyección de Mongo (`proyeccionSegura`, en
`common/types/safe-user.type.ts`) directamente no lo trae de la base.

---

## 6. Lo que cambió con la mudanza a Mongo

Lo que hay que tener en la cabeza al leer un documento de estos:

- **`_id` es un uuid en texto, no un `ObjectId`.** Se traduce a `id` en el borde,
  así que para la app no cambió nada respecto de Postgres.
- **Los únicos son índices parciales.** En Postgres un único deja pasar todos los
  `NULL` que haga falta; en Mongo el `null` **es un valor**, y la segunda cuenta
  sin DNI fallaría con clave duplicada. Por eso `email`, `dni` y `googleId` se
  indexan con `partialFilterExpression: { $type: 'string' }` — solo lo que tiene
  texto adentro entra al índice. `sparse: true` no alcanza: saltea los documentos
  donde el campo *no existe*, y acá los tres existen con `default: null`.
- **Todos los campos existen desde el alta**, con `null` adentro. No hay campos
  ausentes: un `telefono` sin cargar es `null`, nunca falta la clave.
- **Las fechas son `Date` en la base y strings ISO en la API.** Ningún schema del
  front espera un `{ $date }`.
