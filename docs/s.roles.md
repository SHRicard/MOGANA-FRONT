# De permisos a roles — qué cambió y qué hay hoy

**El array `permissions` ya no existe.** La app dejó de decidir por permiso
(`compradores.ver`, `usuarios.ver`, …) y ahora decide por **rol**: un solo campo,
tres valores posibles.

```diff
- user.permissions.includes('usuarios.ver')
+ user.rol === 'administrador'
```

Si el front todavía tiene el catálogo de permisos, el helper `hasPermission()` o
menús gateados contra ese array, **hay que borrarlos**: la API no manda más ese
campo y todo lo que dependa de él va a evaluar vacío y esconder pantallas.

| Rol | Quién es | Cómo se crea |
|---|---|---|
| `super_admin` | el dueño del sistema | solo por seed |
| `administrador` | el que opera el negocio | solo por seed |
| `cliente` | todo el que se registra | solo, al registrarse |

Hoy: `ricardo.ramirez.dev@gmail.com` es `super_admin`, `rricardo.23.11.2022@gmail.com`
es `administrador`, y el resto son clientes. Nadie puede volverse admin desde la
app: mandar `rol` en el body es `400`.

---

## De dónde sale el rol

De `user.rol`, que viene en el login, en el registro y en `GET /api/users/me`:

```json
{ "id": "55654c67-...", "name": "Ana", "email": null, "dni": "38180903", "rol": "cliente" }
```

⚠️ **No viaja en el token.** El backend lo lee de la base en cada request. No lo
decodifiques del JWT, y **refrescalo con `/users/me` cada vez que abre la app**:
si el rol cambió, el token sigue siendo el mismo y el store quedaría viejo.

Con tres roles y sin permisos, la navegación es un `switch`, no una matriz:

```ts
switch (user.rol) {
  case 'super_admin':   return <PanelSuperAdmin />
  case 'administrador': return <PanelAdmin />
  case 'cliente':       return <PanelCliente />
}
```

---

## Estado de cada rol

### `administrador` — es lo único con superficie real

Es donde está todo el trabajo hecho. Ve y busca **clientes**, que es la pantalla
que hay que construir primero.

| Endpoint | |
|---|---|
| `GET /api/admin/clientes` | listado paginado. Query: `q` (email, nombre o DNI), `pagina`, `limite` (1-100, default 20) |
| `GET /api/admin/clientes/:id` | la ficha de uno |

```json
{
  "datos": [
    {
      "id": "55654c67-...",
      "email": null,
      "dni": "38180903",
      "displayName": "Ana Cliente",
      "rol": "cliente",
      "tieneGoogle": false,
      "tienePassword": true,
      "createdAt": "2026-08-18T02:41:10.512Z",
      "lastLoginAt": "2026-08-18T02:41:11.004Z"
    }
  ],
  "total": 2, "pagina": 1, "limite": 20, "paginas": 1
}
```

**Solo devuelve clientes.** El `rol` que mandes en la query se ignora, y pedir por
id la cuenta de un administrador da `404`. No hay forma de que este panel muestre
cuentas privilegiadas.

`tieneGoogle` / `tienePassword` dicen cómo entra cada uno; pueden ser los dos
`true`. La búsqueda no distingue mayúsculas pero **no iguala tildes** — `perez` no
encuentra a `Pérez`. Anda bien para email y DNI.

Lo que **no** existe todavía: crear, editar o desactivar un cliente, y cualquier
cosa de cuenta corriente (boletas, compras, pagos). Solo lectura.

### `super_admin` — visión total, pero todavía sin panel

Puede todo lo que puede el administrador, más ver **todas** las cuentas:

| Endpoint | |
|---|---|
| `GET /api/super-admin/usuarios` | igual que el listado de arriba, pero con los tres roles. Query: `q`, `rol`, `pagina`, `limite` |

Y nada más. **No hay panel de super admin todavía**: no existe cambiar roles,
ni métricas, ni configuración, ni auditoría. Con lo que hay hoy alcanza para una
pantalla de "todas las cuentas" y poco más — si le diseñás un dashboard, va a
quedar esperando endpoints que no están.

### `cliente` — su cuenta, nada más

| Endpoint | |
|---|---|
| `GET /api/cliente/mi-cuenta` | sus propios datos |
| `PATCH /api/cliente/mi-cuenta` | cambiar `displayName`, y solo eso |

Nunca lleva un id por parámetro: sale de la sesión, así que no hay forma de pedir
la cuenta de otro. El email, el DNI y el rol no se tocan acá.

**El cliente no tiene producto todavía.** No ve su cuenta corriente, ni su saldo,
ni sus compras, porque nada de eso existe en el backend. Con lo que hay, su app
es la pantalla de perfil.

---

## Quién entra a qué

| Endpoint | `super_admin` | `administrador` | `cliente` |
|---|:---:|:---:|:---:|
| `GET /api/super-admin/usuarios` | ✅ | 403 | 403 |
| `GET /api/admin/clientes` · `/:id` | ✅ | ✅ | 403 |
| `GET` · `PATCH /api/cliente/mi-cuenta` | 403 | 403 | ✅ |
| `GET /api/users/me` | ✅ | ✅ | ✅ |
| `POST /api/auth/*` | público | público | público |

**No hay jerarquía automática.** Que el super admin entre al panel del
administrador está escrito en ese endpoint; a `/cliente/mi-cuenta` **no** entra y
recibe `403` como cualquiera. Si hace falta que alguien de arriba pueda algo de
abajo, se agrega ahí y se avisa.

Sin token, `401`. Con token y sin el rol, `403`:

```json
{ "message": "No tenés permiso para esta acción." }
```

Un `403` en pantalla significa que la app mostró algo que no correspondía.
Escondé la navegación por rol, pero no te apoyes en eso: la API valida igual.
Conviene que el `403` tenga pantalla propia y no un toast.

---

## Resumen para planificar

| | Qué construir hoy |
|---|---|
| `administrador` | **listado y ficha de clientes** — es lo único completo |
| `super_admin` | a lo sumo "todas las cuentas". El panel real todavía no tiene backend |
| `cliente` | pantalla de perfil. Nada más existe |

Lo que sigue del lado del backend, en orden de lo que desbloquea más pantallas:
alta y edición de clientes, y después la cuenta corriente. Nada de eso está
todavía, así que **no diseñes contra esos endpoints**.

---

## Cómo se asignan los roles (para el back)

No hay endpoint: los dos roles altos salen del seed, que corre en el servidor.

```bash
npm run db:seed
```

Sin configurar nada crea `super_admin` para `ricardo.ramirez.dev@gmail.com` y
`administrador` para `rricardo.23.11.2022@gmail.com` — se cambian con
`SUPER_ADMIN_EMAIL` y `ADMIN_EMAIL` en el `.env`. Es idempotente, y sobre una
cuenta que ya existe **solo le corrige el rol**.

La contraseña es opcional (`SUPER_ADMIN_PASSWORD` / `ADMIN_PASSWORD`): sin ella,
la cuenta entra con Google, y el rol sembrado **sobrevive a ese primer login**.
Detalle completo en el encabezado de [`prisma/seed.ts`](../prisma/seed.ts).
