# Mi cuenta — ver y editar el perfil

La pantalla donde la persona ve sus datos y los corrige. Son **dos endpoints**,
los mismos que ya usa el modal del DNI:

```
GET   /api/users/me     ← lo que se muestra
PATCH /api/users/me     ← lo que se guarda
```

Sirve igual para un cliente y para un administrador: cada uno edita su propia
cuenta, nunca la de otro. No hay `:id` en la URL y no lo va a haber — el usuario
sale del token.

> El modal que obliga a cargar el DNI está en
> [`flujo_login.md`](./flujo_login.md). Este documento es la pantalla de después:
> la cuenta ya está activa y la persona entra a mirar o corregir sus datos.

---

## La regla, en una frase

**Se edita todo menos lo que te identifica.**

| Campo | ¿Se edita? | |
|---|---|---|
| `displayName` | sí | siempre |
| `telefono` | sí | siempre, y se puede borrar |
| `direccion` | sí | siempre, y se puede borrar |
| `dni` | **una sola vez** | mientras esté vacío. Después, mostrador |
| `email` | **nunca** | es con lo que entrás |

El DNI y el correo no son caprichos del formulario: son con lo que se encuentra
a alguien que puede deber plata, y con lo que esa persona entra a su cuenta.
Moverlos desde la app sería la forma más fácil de desaparecer del buscador o de
quedarse afuera de la propia cuenta. **Se cambian en el local o pidiéndoselo a un
administrador**, y el mensaje de error siempre lo dice.

---

## `GET /api/users/me`

```http
GET /api/users/me
Authorization: Bearer <token>
```

### Response — 200 OK

```json
{
  "id": "cc11dafb-d55c-4f9e-ac06-a1f2cd4337ca",
  "name": "Ana Pérez",
  "displayName": "Ana Pérez",
  "email": "ana@mail.com",
  "emailVerificado": false,
  "dni": "38180903",
  "telefono": "3814567890",
  "direccion": "Av. San Martín 123",
  "camposFijos": [
    {
      "campo": "email",
      "motivo": "El correo no se cambia desde acá: es con lo que entrás. Pedile el cambio a un administrador."
    },
    {
      "campo": "dni",
      "motivo": "Tu DNI ya está cargado y no se cambia desde la app. Acercate al local o escribile a un administrador para que lo corrija."
    }
  ],
  "rol": "cliente",
  "estado": "activo",
  "motivoBloqueo": null,
  "tieneGoogle": false,
  "tienePassword": true,
  "createdAt": "2026-08-20T13:34:55.832Z",
  "lastLoginAt": "2026-08-20T13:35:23.695Z"
}
```

| Campo | |
|---|---|
| `name` | para mostrar. **Nunca viene vacío**: si no cargó nombre, sale del correo |
| `displayName` | lo que cargó la persona. Es el que va en el input, y puede ser `null` |
| `telefono` `direccion` | `null` mientras no los cargue. **Nadie está obligado** a tenerlos |
| `emailVerificado` | si confirmó el correo. No bloquea nada — ver abajo |
| `camposFijos` | qué inputs mostrar deshabilitados, y con qué texto al lado |
| `estado` | `activo` o `bloqueado`. Solo depende del DNI |

### `camposFijos` — para no repetir la regla en el front

Viene siempre, y cambia solo: `email` está siempre; `dni` **aparece recién
cuando ya está cargado**.

```jsonc
// cuenta nueva, sin DNI          → el input del DNI se puede editar
"camposFijos": [{ "campo": "email", "motivo": "..." }]

// DNI ya cargado                 → los dos inputs deshabilitados
"camposFijos": [{ "campo": "email", ... }, { "campo": "dni", ... }]
```

La idea es que el front **no replique** la lógica de cuándo el DNI se puede
tocar. Recorré `camposFijos`, deshabilitá esos campos y mostrá el `motivo` como
ayuda debajo del input. El día que cambie la regla, la pantalla se entera sola.

---

## `PATCH /api/users/me`

Mandá **solo los campos que cambiaron**. Lo que no venga, no se toca.

```json
{
  "displayName": "Ana Pérez",
  "telefono": "381 456-7890",
  "direccion": "Av. San Martín 123"
}
```

Devuelve `200` con **el perfil completo**, igual que el `GET`. Reemplazá tu
estado con la respuesta en vez de recomponerlo a mano: así te llega ya
normalizado lo que mandaste y, si era el DNI, también el `estado: "activo"`.

### Qué acepta cada campo

| Campo | | |
|---|---|---|
| `displayName` | hasta 100 | no puede quedar vacío |
| `telefono` | 6 a 15 dígitos, `+` opcional | se guarda limpio: `(381) 456-7890` → `3814567890` |
| `direccion` | hasta 200 | una línea. Los espacios de más se aplastan |
| `dni` | 7 a 9 dígitos | con puntos también: `38.180.903` → `38180903` |

El body vacío `{}` es `400` — *"No mandaste nada para cambiar."*

### Borrar el teléfono o la dirección

Los dos se pueden **vaciar**, y hay dos formas de decirlo:

```json
{ "telefono": null }
{ "telefono": "" }
```

Las dos hacen lo mismo. La segunda es la que sale sola del formulario cuando la
persona limpia el input, así que **no hace falta convertirla a `null`** en el
front: mandá el valor del campo tal como está.

> El `displayName` **no** se puede vaciar: `{ "displayName": "" }` es `400`
> *"El nombre no puede quedar vacío."* No es un olvido — un nombre en blanco deja
> a la persona sin cómo mostrarse en la app.

---

## Los errores

| Qué mandás | Respuesta |
|---|---|
| `{ "email": "otro@mail.com" }` | `400` *"El correo no se cambia desde acá: es con lo que entrás. Pedile el cambio a un administrador."* |
| otro `dni` con uno ya cargado | `409` *"Tu DNI ya está cargado y no se cambia desde la app. Acercate al local o escribile a un administrador para que lo corrija."* |
| un `dni` que ya es de otra cuenta | `409` *"Ese DNI ya figura en otra cuenta. Acercate al local para que lo resuelvan."* |
| el mismo `dni` de nuevo | `200`, no es error — es el reintento cuando se cortó la conexión |
| `{ "telefono": "llamame" }` | `400` *"El teléfono son 6 a 15 dígitos, con el código de área. Ej: 3814567890."* |
| `direccion` de más de 200 | `400` *"La dirección no puede pasar de 200 caracteres."* |
| `{}` | `400` *"No mandaste nada para cambiar."* |
| `{ "rol": "super_admin" }` | `400`. El rol no se toca desde ningún endpoint |

Todos los errores llegan igual: `{ "message": "..." }`, un solo texto en
castellano, listo para mostrar. **Mostralo tal cual** — están escritos para que
la persona sepa qué hacer, y los dos `409` del DNI son a propósito un callejón
que termina en el mostrador.

---

## Lo del correo sin verificar

`emailVerificado: false` significa que la persona nunca abrió el enlace que se le
mandó al registrarse. **No bloquea nada**: entra igual y usa la app igual.

Lo único que se puede hacer desde el perfil es ofrecerle reenviarlo:

```http
POST /api/auth/verificar/reenviar
Authorization: Bearer <token>
```

Un cartelito discreto —*"Todavía no verificaste tu correo"* + un botón
**Reenviar**— alcanza. Si `emailVerificado` es `true`, no muestres nada. Las
cuentas de Google **nacen verificadas**: lo confirmó Google.

---

## Cómo se arma en el front

**1. Al entrar a la pantalla**, pedí el perfil y llenás el formulario con
`displayName`, `telefono` y `direccion`. Los `null` van como inputs vacíos.

```ts
const perfil = await api.get('/users/me')

const fijo = (campo: 'email' | 'dni') =>
  perfil.camposFijos.find((c) => c.campo === campo)
```

**2. Los campos fijos** se muestran igual —la persona quiere *ver* su correo y su
documento— pero deshabilitados y con el motivo debajo:

```tsx
<Input
  label="Correo"
  value={perfil.email}
  disabled={Boolean(fijo('email'))}
  ayuda={fijo('email')?.motivo}
/>
```

**3. Al guardar**, mandá solo lo que cambió y reemplazá el estado con lo que
vuelve:

```ts
const perfil = await api.patch('/users/me', {
  displayName: form.displayName,
  telefono: form.telefono,     // "" borra el dato, no hace falta tocarlo
  direccion: form.direccion,
})

setPerfil(perfil)              // ya viene normalizado, no recompongas nada
```

**4. El teléfono vuelve sin formato** (`3814567890`). Si querés mostrarlo lindo,
formatealo al pintar, pero mandá siempre lo que escribió la persona: el backend
lo limpia.

---

## Checklist

- [ ] La pantalla se arma con `GET /api/users/me`, no con lo que quedó del login
- [ ] `displayName`, `telefono` y `direccion` editables; `email` y `dni`
      deshabilitados según `camposFijos`
- [ ] El motivo de cada campo fijo se muestra al lado del input
- [ ] El `PATCH` manda solo lo que cambió, y el estado se reemplaza con la
      respuesta
- [ ] Vaciar teléfono o dirección los borra; vaciar el nombre da `400` y se
      muestra el mensaje
- [ ] El `409` del DNI no se trata como error de red: es un cartel que dice
      "acercate al local"
- [ ] Si `emailVerificado` es `false`, aparece el botón de reenviar

---

## Probarlo sin la app

```bash
API=http://localhost:3000/api
TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@mail.com","password":"..."}' | jq -r .token)

# ver el perfil
curl -s $API/users/me -H "Authorization: Bearer $TOKEN" | jq

# guardar contacto: entra como lo escribe una persona, sale normalizado
curl -s -X PATCH $API/users/me -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"telefono":"(381) 456-7890","direccion":"  Av.  San   Martín 123  "}' | jq

# borrar el teléfono
curl -s -X PATCH $API/users/me -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"telefono":""}' | jq .telefono

# lo que no se puede
curl -s -X PATCH $API/users/me -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"otro@mail.com"}'
```

---

## Del lado del panel

El administrador ve el teléfono y la dirección en la ficha del cliente
(`GET /api/admin/clientes`), que es para lo que sirven: llamar por una deuda,
saber a dónde entregar. **No los edita** — son datos de la persona, y si están
mal se los pide.

Lo único que el administrador sí corrige es el DNI, con motivo obligatorio y
auditoría: `PATCH /api/admin/clientes/:id/dni` (ver
[`flujo_login.md`](./flujo_login.md#patch-apiadminclientesiddni)).
