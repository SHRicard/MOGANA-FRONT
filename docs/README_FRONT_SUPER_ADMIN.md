# README — El panel del super admin en el front

Guía para construir la pantalla del rol `super_admin`. El backend está **hecho,
probado y montado**: los cinco endpoints de acá abajo responden hoy.

> Los ejemplos de respuesta de este documento **salieron de la API corriendo**,
> no están escritos a mano. Los nombres y los ids son de prueba; la forma es
> exacta.

---

## 0. Qué está hecho y qué no

| | Estado |
|---|---|
| Backend: tablero del sistema | ✅ hecho y probado |
| Backend: todas las cuentas, con ficha | ✅ hecho y probado |
| Backend: **cambiar el rol de una cuenta** | ✅ hecho y probado |
| Backend: auditoría de los cambios de rol | ✅ hecho y probado |
| **Front: las cuatro pantallas** | ✅ construidas (`src/features/super-admin/`) |

**Nada del código React de este documento fue ejecutado.** Es una guía escrita
contra el contrato real del backend (que sí está verificado). Donde hay una
decisión que depende de tu app —el router, el store de sesión— está marcada.

### Dónde quedó cada cosa en este front

| §  | Pantalla | Ruta del router | Archivo |
|---|---|---|---|
| — | El panel, con sus cuatro entradas | `PANEL_SUPER_ADMIN` | `screens/PanelSuperAdminScreen.tsx` |
| §3 | El tablero del sistema | `SISTEMA` | `screens/SistemaScreen.tsx` |
| §4 | Todas las cuentas | `USUARIOS` | `@/features/usuarios` — **el mismo listado del administrador**, que ya elige el endpoint según el rol |
| §5 §6 | La ficha y el cambio de rol | `CUENTA_DEL_SISTEMA` | `screens/CuentaDelSistemaScreen.tsx` |
| §7 | La auditoría | `AUDITORIA` | `screens/AuditoriaScreen.tsx` |

Se entra por **Más → Panel del sistema**, una fila que solo ve el `super_admin`.
La cuarta entrada de ese panel es el panel del negocio (`PANEL_ADMIN`), como pide
la §1: son las dos mitades de lo que ve el dueño.

⚠️ **Tocar una fila del listado lleva a una ficha distinta según quién mire.** El
administrador va a la ficha del cliente (`CLIENTE`), que es donde están el fiado,
el DNI y el botón de facturar; el super admin va a la del sistema, porque su
listado trae también cuentas de administración y para esas
`/admin/clientes/:id` contesta `404`. Cuando la cuenta es un cliente, la ficha
del sistema ofrece el paso a la otra.

⚠️ **El cliente HTTP de la §8 no se usó**: esta app va con RTK Query sobre un
`baseApi` que ya pone el `Bearer`, valida las respuestas con Zod y maneja el
`403` de perfil incompleto. Los cinco endpoints están en
`api/superAdminApi.ts` (cuatro) y en `@/features/usuarios/api` (el listado).

⚠️ **Esto invalida un párrafo de [`s.roles.md`](./s.roles.md)**, el que dice que
*"no hay panel de super admin todavía"*. Ya hay. Lo demás de ese documento sigue
valiendo: cómo se lee el rol, quién entra a qué y cómo se siembran los roles
altos.

---

## 1. Qué es este panel — y qué no es

El super admin **puede todo lo que puede el administrador**: el tablero de
facturación, la cuenta corriente de un cliente, las métricas, la bandeja de
mensajes. Todo eso ya está construido bajo `/api/admin/*` y el super admin entra
con su mismo token.

Este panel es **lo otro**: el sistema, no el negocio.

```
┌─────────────────────────────────────────────────────────┐
│  El super admin ve DOS cosas                            │
│                                                          │
│  1. Todo el panel del administrador  →  /api/admin/*     │
│     (ya construido, o por construir, pero es "el otro")  │
│                                                          │
│  2. El panel del sistema             →  /api/super-admin │
│     · el estado del sistema                              │
│     · TODAS las cuentas (las tres, no solo clientes)     │
│     · mover a alguien de rol                             │
│     · el historial de esos movimientos                   │
└─────────────────────────────────────────────────────────┘
```

⚠️ **No dupliques la plata acá.** El tablero de este panel no trae facturado ni
cobrado a propósito: eso ya lo contesta `GET /api/admin/metricas` y tener dos
pantallas con los mismos números calculados distinto termina, siempre, en dos
números que no coinciden y nadie sabe cuál creer. Si querés el resumen del
negocio en el home del super admin, **llamá al endpoint del administrador** y
mostralo; no pidas uno nuevo.

La navegación sigue siendo el `switch` de siempre, con una rama más adentro:

```tsx
switch (user.rol) {
  case 'super_admin':   return <PanelSuperAdmin />   // ← lo de este README
  case 'administrador': return <PanelAdmin />
  case 'cliente':       return <PanelCliente />
}
```

Y `<PanelSuperAdmin />` tiene que dar acceso a las dos cosas: sus cuatro
pantallas propias **y** el panel del administrador entero.

---

## 2. Los cinco endpoints

Todos piden `Authorization: Bearer <token>` y **rol `super_admin`**. Con otro
rol es `403`; sin token, `401`.

| | |
|---|---|
| `GET /api/super-admin/resumen` | el tablero del sistema |
| `GET /api/super-admin/usuarios` | todas las cuentas. Query: `q`, `rol`, `pagina`, `limite` |
| `GET /api/super-admin/usuarios/:id` | la ficha completa de una |
| `PATCH /api/super-admin/usuarios/:id/rol` | **mover a alguien de rol** |
| `GET /api/super-admin/auditoria` | el historial. Query: `accion`, `objetivoId`, `actorId`, `pagina`, `limite` |

Los `:id` son uuid. Uno que no tenga forma de uuid da `400` antes de tocar la
base.

---

## 3. Pantalla 1 — El tablero

### `GET /api/super-admin/resumen`

```json
{
  "hoy": "2026-09-02",
  "cuentas": {
    "total": 214,
    "porRol": { "super_admin": 1, "administrador": 2, "cliente": 211 },
    "activas": 187,
    "bloqueadas": 27,
    "conGoogle": 96,
    "conPassword": 143,
    "emailSinVerificar": 41,
    "sinFiado": 8
  },
  "altas":     { "hoy": 3, "ultimos7": 19, "ultimos30": 62 },
  "actividad": {
    "activos7": 44,
    "activos30": 121,
    "nuncaEntraron": 12,
    "ultimoIngreso": "2026-09-02T14:31:08.221Z"
  },
  "store": {
    "porcentajeUsado": 73.4,
    "nivel": "alto",
    "comprobantes": 312,
    "bytes": 88080384,
    "liberables": 140,
    "bytesLiberables": 47000000
  },
  "servidor": {
    "entorno": "production",
    "version": "1.4.2",
    "uptimeSegundos": 431209,
    "arrancadoEn": "2026-08-28T14:24:22.002Z",
    "hora": "2026-09-02T14:31:11.380Z"
  }
}
```

### Cómo leerlo

**`cuentas.bloqueadas` no es una alarma.** Es la cuenta que se registró y nunca
cargó el DNI: el embudo del alta. Mostralo al lado de `altas`, no en rojo. Un
número alto quiere decir que hay que mejorar el onboarding, no que algo falló.

**`conGoogle` y `conPassword` se pisan.** Una cuenta puede tener los dos, así que
no suman `total` y no van en una torta.

**`actividad` sale de `lastLoginAt`, o sea de los *logins*.** Quien deja la
sesión abierta y entra todos los días sin volver a loguearse **no aparece**. Es
honesto decirlo en la pantalla ("entradas de los últimos 7 días") en vez de
llamarlo "usuarios activos", que promete otra cosa.

**`store` puede venir `null` entero.** Pasa si Cloudinary no está configurado o
no contestó. **La pantalla tiene que dibujarse igual**, con esa tarjeta en un
estado "no se pudo medir": el super admin entró justamente a ver si el sistema
está bien, y una pantalla en blanco porque un tercero está lento es lo peor que
le podés dar.

**El semáforo del store lo decide `nivel`, no el porcentaje.** Los umbrales son
configurables en el servidor (`STORE_UMBRAL_ALTO`, `STORE_UMBRAL_CRITICO`), así
que si el front los repite, el día que se muevan la pantalla dice "todo bien"
mientras salen los avisos:

```js
// ✅
const color = { critico: 'rojo', alto: 'amarillo' }[store?.nivel] ?? 'verde';

// ❌ nunca
const color = store.porcentajeUsado > 90 ? 'rojo' : 'verde';
```

Y ojo con el caso raro pero real: **`porcentajeUsado` puede ser `null` con
`store` presente**. Quiere decir "no hay contra qué medir" —ni cuota de
Cloudinary ni `STORE_LIMITE_MB`—. `nivel` también viene `null` ahí. No lo pintes
verde: no es "está bien", es "no se midió". Los bytes de `bytes` y
`comprobantes` sí son exactos siempre, porque salen de la base.

**`servidor.hora` está para compararla contra el reloj del que mira.** Medio
sistema depende de qué día es hoy —los vencimientos, los meses de las métricas,
el cron de las 8 de la mañana— y un servidor con la hora corrida produce números
que no cierran sin que nada falle. Si la diferencia contra `Date.now()` pasa de
un par de minutos, mostralo.

**`servidor.version` viene de `APP_VERSION`.** Si es `null`, esa variable no está
puesta en el servidor: decilo en la pantalla ("versión sin declarar") en vez de
esconder la fila. Sin eso, *"¿está deployado el fix?"* no se contesta desde la
app.

---

## 4. Pantalla 2 — Todas las cuentas

### `GET /api/super-admin/usuarios?q=&rol=&pagina=1&limite=20`

Es **el mismo listado** de `/api/admin/clientes`, con dos diferencias:

1. trae **los tres roles**, no solo clientes;
2. `rol` en la query **sí se respeta** —en el panel del administrador se ignora a
   propósito—.

```json
{
  "datos": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "email": null,
      "dni": "38180903",
      "displayName": "Zoraida Pérez",
      "telefono": "3416001122",
      "direccion": null,
      "rol": "cliente",
      "estado": "activo",
      "tieneGoogle": false,
      "tienePassword": true,
      "seLeFia": false,
      "motivoSinFiado": "Debe desde marzo",
      "createdAt": "2026-08-18T02:41:10.512Z",
      "lastLoginAt": "2026-08-17T20:00:00.000Z"
    }
  ],
  "total": 214,
  "pagina": 1,
  "limite": 20,
  "paginas": 11
}
```

`limite` va de 1 a 100 y por defecto es 20. `q` busca en email, nombre y DNI, sin
distinguir mayúsculas — pero **no iguala tildes**: `perez` no encuentra a
`Pérez`. Anda bien para email y DNI, que es como se busca en la práctica.

Si venías del panel del administrador, esta pantalla es la misma tabla con **una
columna más: el rol**. Reusá el componente.

---

## 5. Pantalla 3 — La ficha de una cuenta

### `GET /api/super-admin/usuarios/:id`

Es lo de arriba más lo que solo tiene sentido en este panel: **quién le tocó qué
a esta cuenta y por qué**, y **qué cambios de rol admite hoy**.

```json
{
  "id": "33333333-3333-4333-8333-333333333333",
  "email": null,
  "dni": "38180903",
  "displayName": "Zoraida Pérez",
  "telefono": "3416001122",
  "direccion": null,
  "rol": "cliente",
  "estado": "activo",
  "tieneGoogle": false,
  "tienePassword": true,
  "seLeFia": false,
  "motivoSinFiado": "Debe desde marzo",
  "createdAt": "2026-08-18T02:41:10.512Z",
  "lastLoginAt": "2026-08-17T20:00:00.000Z",

  "emailVerificadoEn": null,
  "updatedAt": "2026-08-18T02:41:10.512Z",

  "cambioDeRol": { "en": null, "porId": null, "por": null, "motivo": null },
  "fiado": {
    "en": "2026-08-10T14:00:00.000Z",
    "porId": "22222222-2222-4222-8222-222222222222",
    "por": {
      "id": "22222222-2222-4222-8222-222222222222",
      "displayName": "Ana Operadora",
      "email": "ana@mail.com"
    },
    "motivo": "Debe desde marzo"
  },
  "documento": { "en": null, "porId": null, "por": null, "motivo": null },

  "facturas": { "total": 2, "vigentes": 1, "anuladas": 1 },

  "rolesPosibles": ["cliente"],
  "rolesImposibles": [
    {
      "rol": "super_admin",
      "motivo": "Esta cuenta tiene 2 facturas. Si deja de ser cliente, esas facturas desaparecen del panel de facturación y de las métricas. Para darle el panel, creale una cuenta aparte con otro correo."
    },
    {
      "rol": "administrador",
      "motivo": "Esta cuenta tiene 2 facturas. Si deja de ser cliente, esas facturas desaparecen del panel de facturación y de las métricas. Para darle el panel, creale una cuenta aparte con otro correo."
    }
  ]
}
```

### Los tres bloques de auditoría

`cambioDeRol`, `fiado` y `documento` tienen la misma forma y se leen igual:

| Campo | |
|---|---|
| `en` | cuándo, ISO. **`null` = nunca pasó** |
| `porId` | el id de quien lo hizo |
| `por` | esa persona, ya resuelta: `{ id, displayName, email }` |
| `motivo` | qué escribió |

Los cuatro en `null` **no es un dato faltante**: es una cuenta a la que nunca le
pasó nada. No muestres "—" en cuatro filas; escondé el bloque.

⚠️ **`por` puede ser `null` con `porId` cargado.** Es un id que ya no resuelve a
ninguna cuenta. Mostrá el id crudo ahí, no un guion: *"lo hizo alguien que ya no
está"* es información; `—` no.

⚠️ **En `fiado`, el `motivo` se borra al devolverle el fiado.** Queda con fecha y
sin motivo, y está bien: *"se lo devolvieron"* no necesita explicación, cortarlo
sí. Redactá esa fila teniendo en cuenta los dos casos.

### `rolesPosibles` / `rolesImposibles` — usalos, son la mitad del trabajo

El backend ya evaluó **todas** las reglas y te dice qué se puede. El `<select>`
del rol se arma solo:

```tsx
{ROLES.map((rol) => {
  const bloqueo = ficha.rolesImposibles.find((i) => i.rol === rol);

  return (
    <option key={rol} value={rol} disabled={!!bloqueo} title={bloqueo?.motivo}>
      {NOMBRE[rol]}
    </option>
  );
})}
```

El `title` del deshabilitado es **el mismo texto que devolvería el error**, así
que la explicación no se escribe dos veces y no se pueden desincronizar. Mejor
todavía: mostralo debajo del select en vez de en un tooltip — una opción gris que
no se explica sola se lee como un bug.

⚠️ **Esto no reemplaza al manejo de errores.** La lista se calculó hace unos
segundos y la base pudo cambiar. El servidor valida todo de nuevo: seguí
manejando el `400` y el `409` de la §6.

`rolesPosibles` **siempre incluye el rol actual**, así que el select nunca queda
sin opción seleccionada.

### `facturas` — está para explicar el 409 antes de que pase

`{ total, vigentes, anuladas }`. Mostralo como un renglón —*"2 facturas (1
vigente, 1 anulada)"*— y linkealo a la cuenta corriente del cliente
(`GET /api/admin/clientes/:id/cuenta`), que es a donde va a querer ir.

---

## 6. La acción — cambiar el rol

### `PATCH /api/super-admin/usuarios/:id/rol`

```http
PATCH /api/super-admin/usuarios/22222222-2222-4222-8222-222222222222/rol
Authorization: Bearer <token>
Content-Type: application/json

{ "rol": "cliente", "motivo": "Dejó el negocio en agosto" }
```

| Campo | | |
|---|---|---|
| `rol` | obligatorio | `super_admin` · `administrador` · `cliente` |
| `motivo` | **obligatorio** | 1 a 300 caracteres. Se recorta solo |

**Devuelve `200` con la ficha completa** —la misma forma de la §5— ya
actualizada: el rol nuevo, el bloque `cambioDeRol` recién escrito y
`rolesPosibles` recalculado. Reemplazá tu estado con la respuesta y no vuelvas a
pedir la ficha.

```json
{
  "rol": "cliente",
  "cambioDeRol": {
    "en": "2026-09-02T18:54:32.291Z",
    "porId": "11111111-1111-4111-8111-111111111111",
    "por": {
      "id": "11111111-1111-4111-8111-111111111111",
      "displayName": "Ricardo Ramírez",
      "email": "ricardo.ramirez.dev@gmail.com"
    },
    "motivo": "Dejó el negocio en agosto"
  },
  "rolesPosibles": ["super_admin", "administrador", "cliente"],
  "rolesImposibles": []
}
```

*(recortado: la respuesta trae la ficha entera)*

### Las tres cosas que no se pueden

Todos los errores vienen con la misma forma, `{ "message": "..." }`, y **el texto
está escrito para mostrarse tal cual**. No lo reescribas.

#### `400` — cambiarte el rol a vos mismo

```json
{ "message": "No podés cambiarte el rol a vos mismo. Pedíselo a otro super admin." }
```

Un super admin que se degrada por error pierde el panel en el mismo request, y el
único lugar desde donde se arregla es el que acaba de perder. **La ficha ya te lo
dice** en `rolesImposibles`, así que este error solo debería aparecer si alguien
tiene dos pestañas abiertas.

#### `409` — es el último super admin

```json
{ "message": "Es el único super admin que queda. Nombrá a otro antes de sacarle el rol a este." }
```

Es la misma trampa repartida entre dos cuentas: A degrada a B, B degrada a A, y
el rol deja de existir. El seed lo volvería a crear, pero el seed corre en el
servidor.

#### `409` — es un cliente con facturas

```json
{ "message": "Esta cuenta tiene 2 facturas. Si deja de ser cliente, esas facturas desaparecen del panel de facturación y de las métricas. Para darle el panel, creale una cuenta aparte con otro correo." }
```

**Esta es la importante y conviene entender por qué.** Todo el panel de
facturación —el tablero, la cuenta corriente, las métricas por cliente, el ticket
del mes— filtra por `rol: 'cliente'`. Ascender a un cliente con deuda no le borra
las facturas: **las vuelve invisibles**. La deuda desaparece del tablero sin que
nadie la haya cobrado, y los tickets de meses ya cerrados cambian de número.

Las anuladas frenan igual, por lo mismo: siguen contando en el ticket del mes en
que se emitieron.

Si de verdad hay que darle el panel a alguien que además es cliente, la salida es
**una segunda cuenta con otro correo**. Ponelo en el cartel.

#### `400` — el body está mal

| | |
|---|---|
| `"Rol inválido: super_admin, administrador, cliente."` | mandaste un rol que no existe |
| `"Contá en una línea por qué se le cambia el rol."` | falta el motivo, o vino en blanco |
| `"El motivo no puede pasar de 300 caracteres."` | |

### Lo que **no** es un error

**Mandar el rol que la cuenta ya tiene devuelve `200` y no hace nada**: no
escribe y no deja renglón en la auditoría. Un doble clic no puede ensuciar el
historial con un cambio de `administrador` a `administrador`. Igual, deshabilitá
el botón mientras el request está en vuelo.

### El diálogo de confirmación

Esta acción **no se puede deshacer con un botón** —se deshace haciendo el cambio
al revés, que deja otro renglón en la auditoría— y le da o le quita a alguien el
acceso a la facturación de todo el negocio. Merece un paso intermedio:

```
┌──────────────────────────────────────────────────┐
│  Ana Operadora pasa de administrador a cliente   │
│                                                  │
│  Va a perder el acceso al panel de facturación,  │
│  a las métricas y a la bandeja de mensajes.      │
│                                                  │
│  ¿Por qué? ______________________________        │
│            (obligatorio, queda registrado)       │
│                                                  │
│               [ Cancelar ]  [ Cambiar el rol ]   │
└──────────────────────────────────────────────────┘
```

El motivo es obligatorio del lado del servidor: pedilo **en el diálogo**, no
después del error.

⚠️ **El cambio pega en el request siguiente de esa persona, no en su próximo
login.** El rol se lee de la base en cada request y no del token: si Ana tiene la
app abierta, su próxima pantalla ya le va a dar `403`. Es a propósito. Si el
cambio es una baja urgente, no hace falta esperar a nada.

---

## 7. Pantalla 4 — La auditoría

### `GET /api/super-admin/auditoria?accion=&objetivoId=&actorId=&pagina=1&limite=20`

```json
{
  "datos": [
    {
      "id": "702d18e6-9f32-402f-a69b-ed2deeb84ede",
      "accion": "cambio_de_rol",
      "fecha": "2026-09-02T18:54:32.303Z",
      "actorId": "11111111-1111-4111-8111-111111111111",
      "actor": {
        "id": "11111111-1111-4111-8111-111111111111",
        "displayName": "Ricardo Ramírez",
        "email": "ricardo.ramirez.dev@gmail.com"
      },
      "objetivoId": "22222222-2222-4222-8222-222222222222",
      "objetivo": {
        "id": "22222222-2222-4222-8222-222222222222",
        "displayName": "Ana Operadora",
        "email": "ana@mail.com"
      },
      "antes": "administrador",
      "despues": "cliente",
      "motivo": "Dejó el negocio en agosto"
    }
  ],
  "total": 1,
  "pagina": 1,
  "limite": 20,
  "paginas": 1
}
```

Un renglón se lee como una frase:

> **Ricardo Ramírez** cambió a **Ana Operadora** de `administrador` a `cliente`
> — *"Dejó el negocio en agosto"* · 2 sep 2026, 15:54

⚠️ **`actor` y `objetivo` pueden ser `null`**: esa cuenta ya no existe. El
renglón sobrevive a la persona, que es exactamente lo que se le pide a una
auditoría. Cuando pase, usá `actorId` / `objetivoId`, que siempre están.

**No hay forma de escribir ni de borrar acá.** No existe el endpoint, y es la
mitad del punto: un registro que la app puede reescribir no prueba nada.

Hoy `accion` tiene un solo valor, `cambio_de_rol`. El filtro está igual porque va
a haber más — dejá el `<select>` armado desde la lista que te devuelvan los
datos, no hardcodeado.

**Poné el filtro por cuenta en la ficha.** Un botón *"ver el historial de esta
cuenta"* que abre `?objetivoId=<id>` es la mitad del valor de esta pantalla; la
lista completa sin filtrar se mira una vez por mes.

---

## 8. El armado, de una

```
PanelSuperAdmin
├── /sistema            → §3  GET /super-admin/resumen
├── /cuentas            → §4  GET /super-admin/usuarios
│   └── /cuentas/:id    → §5  GET /super-admin/usuarios/:id
│                         §6  PATCH /super-admin/usuarios/:id/rol
├── /auditoria          → §7  GET /super-admin/auditoria
└── /negocio/*          → todo el panel del administrador (/api/admin/*)
```

### El cliente HTTP

```js
const API = process.env.EXPO_PUBLIC_API_URL; // https://tu-back/api

async function pedir(camino, { token, ...opciones } = {}) {
  const respuesta = await fetch(`${API}${camino}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opciones.headers,
    },
  });

  const cuerpo = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    // El backend manda { message } y el texto está escrito para mostrarse.
    const error = new Error(cuerpo.message ?? 'No se pudo completar la acción.');
    error.status = respuesta.status;
    throw error;
  }

  return cuerpo;
}

export const superAdmin = {
  resumen:   (token) => pedir('/super-admin/resumen', { token }),
  cuentas:   (token, q) => pedir(`/super-admin/usuarios?${new URLSearchParams(q)}`, { token }),
  ficha:     (token, id) => pedir(`/super-admin/usuarios/${id}`, { token }),
  auditoria: (token, q) => pedir(`/super-admin/auditoria?${new URLSearchParams(q)}`, { token }),

  cambiarRol: (token, id, rol, motivo) =>
    pedir(`/super-admin/usuarios/${id}/rol`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ rol, motivo }),
    }),
};
```

### Las cuatro cosas que se olvidan

1. **Refrescá `/users/me` al abrir la app.** El rol no viaja en el token: si a
   alguien se lo cambiaron, su store queda viejo con un token perfectamente
   válido. Está en [`s.roles.md`](./s.roles.md) y sigue valiendo.
2. **El `403` merece pantalla propia, no un toast.** Un `403` en pantalla
   significa que la app mostró algo que no correspondía; un toast lo esconde.
3. **Distinguí los dos `403`.** El de permisos (`"No tenés permiso para esta
   acción."`) y el de la cuenta sin DNI (`"Para usar la app necesitás cargar tu
   DNI en tu perfil."`). El segundo **alcanza también al super admin** —una
   cuenta sin DNI no opera, tenga el rol que tenga— y no se resuelve escondiendo
   la pantalla sino abriendo el modal del perfil. Ver
   [`flujo_login.md`](./flujo_login.md).
4. **Nada de `permissions`.** Si quedó el catálogo de permisos viejo o un
   `hasPermission()`, borralo: la API no manda ese campo y todo lo que dependa de
   él evalúa vacío y esconde pantallas.

---

## 9. Lo que todavía no existe del lado del backend

No diseñes contra esto, porque no está:

| | |
|---|---|
| Crear, editar o desactivar una cuenta desde el panel | ❌ el alta es solo por registro, y los roles altos por seed o por §6 |
| Borrar una cuenta | ❌ |
| Auditar el fiado y el DNI en la colección `auditoria` | ❌ hoy esos dos se ven en la ficha (§5), no en el historial |
| Configuración del sistema desde la app (umbrales, variables) | ❌ es `.env` en el servidor |
| Métricas de uso reales (más allá de `lastLoginAt`) | ❌ |
| Exportar la auditoría a CSV | ❌ |

Lo que sí existe y no es de este panel está en
[`flujo_pagos.md`](./flujo_pagos.md), [`flujo_metricas.md`](./flujo_metricas.md),
[`flujo_comprobantes.md`](./flujo_comprobantes.md) y
[`notificaciones.md`](./notificaciones.md).
