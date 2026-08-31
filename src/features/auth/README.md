# Login con Google — contrato con el backend

Este documento es para quien implementa la **API REST** (otro repo). Describe qué
manda esta app, qué espera recibir, y qué tiene que hacer el backend en el medio.

> Google es **una de las tres** formas de entrar. Las otras dos —email +
> contraseña y **DNI + contraseña**— están en
> [`docs/s.auth.md`](../../../docs/s.auth.md). Las tres devuelven exactamente el
> mismo `{ user, token }`.

> El código de referencia de este lado está en
> [`googleSignIn.ts`](./googleSignIn.ts), [`hooks/useGoogleLogin.ts`](./hooks/useGoogleLogin.ts),
> [`api/authApi.ts`](./api/authApi.ts) y [`types.ts`](./types.ts).

---

## 1. La idea en una frase

El teléfono le pide a Google una prueba de identidad (`idToken`), se la manda al
backend, y **el backend decide** si eso vale una sesión. La app nunca queda
"logueada con Google": queda logueada con **tu** token.

```
┌─────────┐   1. diálogo nativo    ┌────────┐
│   App   │ ─────────────────────► │ Google │
│ (móvil) │ ◄───────────────────── │        │
└─────────┘      2. idToken        └────────┘
     │                                  ▲
     │ 3. POST /auth/google             │ 4. verificar firma
     │    { idToken }                   │    (claves públicas)
     ▼                                  │
┌─────────────────────────────────────────────┐
│                  Backend                    │
│  5. buscar/crear usuario  →  6. emitir JWT  │
└─────────────────────────────────────────────┘
     │
     │ 7. { user, token }
     ▼
   App guarda el token y lo manda en cada request
```

El `idToken` de Google **se usa una sola vez y se descarta**. No se guarda, no se
reenvía, no sirve para autenticar requests siguientes.

---

## 2. El endpoint

### Request

```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2M..."
}
```

Sin header `Authorization`: es un endpoint público, todavía no hay sesión.

### Response — 200 OK

```json
{
  "user": {
    "id": "42",
    "name": "Ana Pérez",
    "email": "ana@gmail.com",
    "dni": null,
    "rol": "cliente",
    "estado": "bloqueado",
    "motivoBloqueo": "Para usar la app necesitás cargar tu DNI en tu perfil."
  },
  "token": "<tu JWT>"
}
```

⚠️ **Una cuenta nacida por Google nace sin DNI, o sea bloqueada**
(`docs/flujo_login.md`). El login con Google no cambió, pero lo que pasa después
sí: la app manda a esa persona a cargar su documento antes de dejarla usar nada.
El token es válido igual — con la cuenta bloqueada, la API contesta `403` a todo
lo que no sea `/api/users/me`.

Es **exactamente** la misma forma que devuelven `POST /auth/login` y
`POST /auth/register`. No inventes una variante para Google.

La app valida esta respuesta con Zod ([`types.ts`](./types.ts)) **antes** de
dejarla entrar. Si no cumple, la trata como error y no hay login. El schema es:

| Campo        | Tipo               | Reglas                                    |
|--------------|--------------------|-------------------------------------------|
| `user.id`    | `string`           | ⚠️ **string, no number** — ver abajo       |
| `user.name`  | `string`           | Requerido. No `null`, no ausente          |
| `user.email` | `string \| null`   | Por Google siempre viene                  |
| `user.dni`   | `string \| null`   | El documento sin puntos. `null` hasta que la persona lo carga |
| `user.rol`   | `string`           | `super_admin`, `administrador` o `cliente` (`docs/s.roles.md`). Quien nace por Google es `cliente` |
| `user.estado` | `string`          | `activo` o `bloqueado` (`docs/flujo_login.md`). Sin DNI, `bloqueado` |
| `user.motivoBloqueo` | `string \| null` | Por qué está bloqueada, ya redactado. `null` con la cuenta activa |
| `token`      | `string`           | Mínimo 1 carácter                         |

El `email` **ya no se valida como email** del lado de la app: acá se muestra, y
exigir el formato dejaría afuera a una cuenta con una dirección rara guardada.

El `rol` **no va en el JWT**: la app lo lee de este objeto y lo refresca con
`GET /api/users/me` cada vez que abre. Un rol desconocido no rompe la sesión —
la app lo degrada a "sin privilegios" y no muestra nada de administración.

**⚠️ `user.id` tiene que serializarse como string.** Si tu base usa IDs
numéricos, convertilos (`String(user.id)`) antes de responder. Un `"id": 42`
hace fallar la validación y el login no ocurre — es el error más común al
integrar esto.

**⚠️ `name` no puede venir vacío.** El claim `name` de Google casi siempre viene,
pero no está garantizado. Si falta, poné un fallback (por ejemplo, la parte del
email antes del `@`) en lugar de mandar `null`.

### Response — errores

Formato de error de toda la API:

```json
{ "message": "Texto que se le muestra a la persona" }
```

La app usa ese `message` tal cual si viene ([`apiError.ts`](../../shared/utils/apiError.ts)).
Si no viene, cae a un mensaje genérico según el status:

| Status | Cuándo usarlo                                              | Mensaje por defecto de la app        |
|--------|------------------------------------------------------------|--------------------------------------|
| `401`  | idToken inválido, vencido, o `aud`/`iss` incorrectos        | "Email o contraseña incorrectos."    |
| `403`  | Token válido pero cuenta bloqueada / email sin verificar    | idem                                 |
| `409`  | Conflicto de cuentas (ver §5)                               | "Ese email ya está registrado."      |
| `429`  | Rate limit                                                  | "Demasiados intentos..."             |
| `5xx`  | Error tuyo                                                  | "El servidor no está respondiendo."  |

Como los mensajes por defecto de `401`/`403` hablan de contraseña (no aplica
acá), **mandá siempre tu propio `message`** en esos casos.

---

## 3. Cómo verificar el idToken

### ❌ Lo que NO hay que hacer

- **No decodifiques el JWT a mano.** Un `jwt.decode()` sin verificar firma acepta
  cualquier token que alguien fabrique. Es el agujero clásico de esta
  integración: cualquiera puede armar un JSON con `email: "admin@tuapp.com"`,
  firmarlo con su propia clave y entrar como quien quiera.
- **No confíes en el `email` sin más.** Ver `email_verified` abajo.
- **No uses el client secret.** No hace falta en este flujo (ver §7).
- **No hardcodees las claves públicas de Google.** Rotan cada pocas semanas. Se
  descargan de su JWKS y se cachean respetando el `Cache-Control`. La librería
  oficial ya lo hace.

### ✅ Usá la librería oficial

| Stack        | Librería                                                    |
|--------------|-------------------------------------------------------------|
| Node.js      | `google-auth-library` → `OAuth2Client.verifyIdToken()`       |
| Python       | `google-auth` → `google.oauth2.id_token.verify_oauth2_token` |
| Java / Kotlin| `google-api-client` → `GoogleIdTokenVerifier`                |
| PHP          | `google/apiclient` → `Google\Client::verifyIdToken()`        |
| Go           | `google.golang.org/api/idtoken` → `idtoken.Validate()`       |
| .NET         | `Google.Apis.Auth` → `GoogleJsonWebSignature.ValidateAsync`  |

### Qué valida (y qué tenés que chequear vos igual)

La librería verifica firma, `exp` e `iss`. **Vos tenés que verificar el `aud`** —
pasándole el client ID esperado. Si no se lo pasás, aceptás tokens emitidos para
**cualquier otra app de Google**, y eso es una vulnerabilidad de suplantación:
alguien con su propia app de Google podría mandarte un token válido de un usuario
y entrar en tu sistema.

| Claim            | Tiene que ser                                                     |
|------------------|-------------------------------------------------------------------|
| firma            | Válida contra las claves públicas de Google                        |
| `aud`            | **Tu Web client ID** (`260084845955-...apps.googleusercontent.com`) |
| `iss`            | `accounts.google.com` o `https://accounts.google.com`              |
| `exp`            | En el futuro (los idToken duran ~1 hora)                           |
| `email_verified` | `true` — si es `false`, rechazá con `403`                          |

**Sobre `email_verified`:** Google puede emitir tokens para cuentas cuyo email no
está confirmado. Si aceptás uno de esos y después vinculás por email (§5), le
estás dando acceso a la cuenta de otra persona a quien registró ese email sin
probar que es suyo.

### Ejemplo — Node.js / Express

```js
const { OAuth2Client } = require('google-auth-library');

// El MISMO Web client ID que usa la app móvil.
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;
const client = new OAuth2Client();

async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_WEB_CLIENT_ID, // ← sin esto, cualquier app de Google entra
  });

  const payload = ticket.getPayload();

  if (!payload.email_verified) {
    const err = new Error('Tu cuenta de Google no tiene el email verificado.');
    err.status = 403;
    throw err;
  }

  return {
    googleId: payload.sub,      // identificador estable — ver §4
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0],
    picture: payload.picture,   // opcional
  };
}

app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body ?? {};

  if (typeof idToken !== 'string' || idToken.length === 0) {
    return res.status(400).json({ message: 'Falta el idToken.' });
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (error) {
    // Firma inválida, token vencido, aud incorrecto...
    return res
      .status(error.status ?? 401)
      .json({ message: error.status ? error.message : 'No pudimos validar tu cuenta de Google.' });
  }

  const user = await findOrCreateUserFromGoogle(profile); // ver §5
  const token = signAppJwt(user);                         // ver §6

  return res.json({
    user: { id: String(user.id), name: user.name, email: user.email },
    token,
  });
});
```

---

## 4. Identificá al usuario por `sub`, no por email

El claim `sub` es el ID de Google del usuario: **inmutable y único**. El email
puede cambiar (una cuenta de Google Workspace puede cambiar de dominio) y puede
reasignarse.

Guardá `sub` en una columna propia (`google_id`, indexada y única) y usala como
clave de búsqueda principal. El email es un dato del perfil, no la identidad.

---

## 5. Buscar o crear el usuario, y el caso difícil

```
¿Existe un usuario con google_id = sub?
├── Sí  → es él. Actualizá name/email si cambiaron. Login.
└── No  → ¿existe un usuario con ese email?
          ├── No  → creá usuario nuevo con google_id. Login.
          └── Sí  → ⚠️ decisión de producto (abajo)
```

**El caso difícil:** alguien se registró antes con email + contraseña, y ahora
entra con Google usando el mismo email. Tres posturas válidas:

| Estrategia                        | Qué hacer                                                                 | Cuándo conviene |
|-----------------------------------|---------------------------------------------------------------------------|-----------------|
| **Vincular automático** (habitual)| Asignás el `google_id` a la cuenta existente y lo dejás entrar             | Google ya verificó el email (`email_verified: true`), así que es la misma persona. Es lo que hace la mayoría |
| **Rechazar**                      | `409` con `message` explicando que entre con su contraseña                | Si querés control explícito del vínculo |
| **Pedir confirmación**            | `409` + flujo de "confirmá tu contraseña para vincular"                   | El más seguro, pero requiere pantallas que hoy no existen en la app |

**Vincular automático es seguro solo si validaste `email_verified: true`.** Sin
ese chequeo, es un secuestro de cuentas: registrás en Google un email ajeno, entrás
con Google, y te apoderás de la cuenta preexistente.

Si elegís rechazar o pedir confirmación, avisá — la app hoy solo muestra el
`message` del error, no tiene el flujo de vinculación.

**Quien se registró con DNI y después entra con Google queda con dos cuentas.**
Google no informa el documento, así que no hay con qué reconocer que son la misma
persona. Solo se vinculan solas cuando coincide el **email**. Si eso importa para
el producto, lo que falta es una pantalla de "vincular mi cuenta" estando
logueado — hoy no existe.

**Usuarios creados por Google no tienen contraseña.** Dejá el campo `null` (no un
hash vacío) y asegurate de que `POST /auth/login` los rechace correctamente en vez
de romper. Y que `POST /auth/forgot-password` no les mande un mail inútil.

---

## 6. El token que devolvés

A partir de acá Google no participa más. El `token` que devolvés es **tuyo** y es
lo único que la app va a usar.

La app lo guarda en almacenamiento encriptado y lo manda en cada request
([`baseApi.ts`](../../services/api/baseApi.ts)):

```http
Authorization: Bearer <token>
```

Recomendaciones:

- **JWT firmado con tu secreto**, o token opaco contra una tabla de sesiones.
  Las dos opciones sirven; el frontend no lo interpreta, lo trata como texto.
- **Poné un `exp` razonable.** Hoy la app **no tiene refresh token**: cuando el
  token vence, la persona vuelve al login. Un `exp` corto (15 min) sería hostil.
  Empezá con algo del orden de días y avisanos si querés que implementemos
  refresh — hay que tocar el `baseApi` de este lado.
- **No metas datos sensibles en el JWT.** Es legible por cualquiera que lo tenga.

---

## 7. El client secret

Google te dio un **client secret** junto con el Web client ID. **En este flujo no
se usa.**

El secret sirve para el *authorization code flow*, donde un servidor canjea un
código por tokens. Acá el teléfono ya obtuvo el `idToken` y vos solo verificás su
firma con las **claves públicas** de Google — que son públicas justamente para
esto.

Si igual lo guardás: solo en variables de entorno del servidor, nunca en el
repositorio, y **nunca** se lo mandes al cliente.

---

## 8. Variables de entorno del backend

```bash
# El MISMO valor que tiene la app móvil en su .env.
# Si no coinciden, el `aud` no valida y todos los logins fallan con 401.
GOOGLE_WEB_CLIENT_ID=260084845955-....apps.googleusercontent.com

# Para firmar TUS tokens. Nada que ver con Google.
JWT_SECRET=...
```

Ojo: el que va acá es el client ID de tipo **Aplicación web**, no el de tipo
Android. El de Android no se escribe en ningún lado — Google lo usa internamente
para reconocer la app por su package name (`com.morgana`) y su huella SHA-1.

---

## 9. Checklist antes de dar por cerrado

- [ ] Verifico la firma con la librería oficial, no con `jwt.decode()`
- [ ] Le paso el `aud` esperado al verificador
- [ ] Rechazo si `email_verified !== true`
- [ ] Busco al usuario por `sub`, no por email
- [ ] Definí qué pasa si el email ya existe con contraseña
- [ ] `user.id` sale serializado como **string**
- [ ] `user.name` nunca es `null` ni vacío (fallback: usuario del email o DNI)
- [ ] `user.email` y `user.dni` se serializan como `null`, no se omiten
- [ ] Los errores devuelven `{ "message": "..." }`
- [ ] `POST /auth/login` maneja usuarios sin contraseña sin romper
- [ ] `GOOGLE_WEB_CLIENT_ID` es idéntico al de la app móvil
- [ ] El client secret no está en el repo

---

## 10. Probarlo sin la app

Sacá un `idToken` real desde el
[OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) (en
Settings, marcá *Use your own OAuth credentials* y poné tu Web client ID y
secret), o logueate una vez en la app y copiá el token desde el log.

```bash
curl -X POST https://tu-api.com/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"idToken":"eyJhbGciOi..."}'
```

Casos que conviene probar además del feliz:

| Caso                         | Esperado                                  |
|------------------------------|-------------------------------------------|
| `idToken` ausente o vacío    | `400` con `message`                       |
| Token con una letra cambiada | `401` — falla la firma                    |
| Token vencido (> 1 h)        | `401`                                     |
| Token de otra app de Google  | `401` — falla el `aud`. **Probá este**    |
| Mismo usuario dos veces      | `200` las dos, **sin duplicar el usuario**|
