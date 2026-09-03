# Comprobantes de pago — guía para el front

Todo lo que necesita el front sobre la **captura del comprobante**: cómo la sube
el cliente, cómo la mira el administrador en la bandeja, y el **panel del store**
donde se ve cuánto ocupa y se limpia lo viejo.

Complementa [`user_cliente_flujo.md`](./user_cliente_flujo.md) §8 (avisar que
pagué) y [`flujo_pagos.md`](./flujo_pagos.md) §13 (la bandeja de avisos).

> **¿Venís por el share de Android?** Para que el cliente comparta el comprobante
> desde Mercado Pago y elija Morgana en la hoja de compartir, la guía es
> [`README_FRONT_COMPROBANTES.md`](./README_FRONT_COMPROBANTES.md). Es el mismo endpoint
> de acá; lo que cambia es cómo llega la imagen y qué hay que preguntarle después.

---

## 1. Qué es y qué no

**Una imagen no es un pago.** El comprobante no confirma nada por sí solo: sigue
siendo un administrador el que mira el resumen del banco y aprieta confirmar. Lo
que cambia es que ahora lo mira **con la captura delante** en vez de buscar el
movimiento a ojo.

Y **un comprobante sirve por un margen de tiempo**. La captura de una
transferencia de hace dos meses ya no la mira nadie: el cobro está anotado, la
factura está paga y la discusión, si la hubo, terminó. De ahí el panel del §5.

---

## 2. Subir — `POST /api/mi/facturas/:id/informar-pago`

Es **el mismo endpoint de siempre**. Acepta los dos content-types:

| | Cuándo | |
|---|---|---|
| `application/json` | sin foto | el body de siempre, sin cambios |
| `multipart/form-data` | con foto | los mismos campos + `comprobante` |

**El front actual no se rompe**: un `POST` con JSON y sin archivo funciona
exactamente igual que antes.

```js
const cuerpo = new FormData();
cuerpo.append('monto', String(monto));          // ⚠️ el número crudo: 30000
cuerpo.append('medio', 'transferencia');
cuerpo.append('fecha', '2026-08-19');           // opcional
cuerpo.append('referencia', 'OP-88213345');     // opcional
cuerpo.append('comprobante', archivo);          // ⚠️ el campo se llama así

await fetch(`${API}/mi/facturas/${id}/informar-pago`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // ⚠️ SIN Content-Type
  body: cuerpo,
});
```

> ⚠️ **No pongas `Content-Type` a mano** en un `FormData`: el navegador tiene que
> escribirlo él para incluir el `boundary`. Si lo forzás, el backend no encuentra
> el archivo.

### Cuándo es obligatorio

| Medio | |
|---|---|
| `transferencia` · `mercado_pago` · `deposito` | **obligatorio** |
| `efectivo` · `otro` | opcional (se acepta igual si la manda) |

De una transferencia **hay** una captura, y sin ella confirmar el aviso obliga a
revisar el resumen del banco a ojo. De un pago en efectivo en el mostrador no hay
ninguna, y pedirla sería pedir algo que no existe.

El formulario tiene que reflejarlo: el campo del archivo aparece marcado como
obligatorio cuando el `<select>` de medio está en uno de los tres primeros, y
pasa a opcional en los otros dos.

### Qué se acepta

| | |
|---|---|
| Formatos | **JPG, PNG, WebP o HEIC** (el HEIC es el de iPhone) |
| Tamaño | hasta **8 MB** |
| Cantidad | **una** por aviso |

⚠️ El backend mira **los primeros bytes del archivo**, no el `Content-Type` de la
parte multipart: un `.exe` renombrado a `.jpg` se rechaza aunque el navegador lo
declare `image/jpeg`. No hace falta que el front valide nada de esto, pero sí
conviene que el `<input>` lleve `accept="image/*"` para que el selector del
celular abra la galería y no el explorador de archivos.

**PDF no se acepta.** Si el cliente tiene el comprobante del home banking en PDF,
que le saque una captura.

### Los errores

| Código | `message` |
|---|---|
| 400 | `Adjuntá la captura del comprobante: por transferencia es obligatoria.` |
| 400 | `El comprobante tiene que ser una imagen: JPG, PNG, WebP o HEIC.` |
| 400 | `El comprobante llegó vacío o cortado. Probá de nuevo.` |
| 400 | `El archivo tiene que ir en el campo "comprobante".` |
| **413** | `El comprobante no puede pesar más de 8 MB. Sacá la captura de nuevo o mandala más chica.` |
| **503** | `No pudimos guardar el comprobante. Probá de nuevo en un minuto.` |
| 503 | `No podemos recibir comprobantes en este momento. Probá de nuevo en un rato.` |

Los **503 son reintentables y no dejaron nada escrito**: si la imagen no se pudo
guardar, el aviso se borra antes de contestar, así que volver a mandarlo no
duplica nada. Es el único caso en que conviene ofrecer "reintentar" en vez de
mandar a corregir el formulario.

> ⚠️ El resto de los campos sigue pasando por la validación estricta: un campo de
> más en el `FormData` da 400 igual que en JSON. En particular, **no mandes un
> campo de texto llamado `comprobante`** además del archivo.

---

## 3. Cómo se muestra

Tanto `MiPagoInformadoDto` (cliente) como `PagoInformadoDto` (panel) traen ahora:

```json
"comprobante": {
  "estado": "disponible",
  "bytes": 204800,
  "formato": "jpg",
  "subidoEn": "2026-08-19T13:04:11.000Z",
  "url": "https://res.cloudinary.com/…/comprobante.jpg?__cld_token__=…",
  "miniatura": "https://res.cloudinary.com/…/c_limit,w_400/…",
  "borradoEn": null,
  "borradoPor": null
}
```

**Los tres estados**, y qué muestra cada uno:

| | Qué pasó | Qué mostrar |
|---|---|---|
| `comprobante: null` | nunca hubo (efectivo, o un aviso anterior a esta función) | nada |
| `estado: "disponible"` | la imagen está | la miniatura, clickeable |
| `estado: "borrado"` | hubo, y se borró | *"El comprobante se borró el 12/08/2026 por antigüedad."* |

`borradoPor` dice cuál de los tres motivos fue: `rechazo`, `antiguedad` o
`manual`. Al cliente conviene traducírselo — "se borró por antigüedad" no suena
igual que "lo borró el negocio".

### ⚠️ Las URLs se vencen

`url` y `miniatura` van **firmadas y con vencimiento** (una hora por defecto).
Eso es a propósito: un comprobante muestra el alias, el banco y a veces el nombre
completo de una persona, así que el link que se filtre tiene que morirse solo.

Consecuencias para el front:

- **no las guardes**: ni en estado que sobreviva a la navegación, ni en
  `localStorage`, ni en una caché de imágenes propia;
- usalas al dibujar, y si la pantalla estuvo abierta mucho rato, **volvé a pedir
  el aviso** para que salgan links nuevos;
- `<img src>` funciona normal: es un GET con la firma en la query.

---

## 4. Cuándo se borra sola

| | |
|---|---|
| **Se rechaza** el aviso | la imagen se borra. El `motivoRechazo` queda escrito igual |
| **Se confirma** el aviso | **se conserva**: es el respaldo de un cobro anotado |
| Sigue **pendiente** | se conserva: es la evidencia con la que todavía hay que decidir |

Todo lo demás lo decide el administrador desde el panel del §5. **Nada se borra
solo por el paso del tiempo**: no hay ningún proceso automático.

---

## 5. El panel del store (solo administrador)

Todos piden `Authorization: Bearer <token>` de un administrador o super admin.

### Las tres formas de borrar, y cuál usar

| | Endpoint | Cuándo | Guardas |
|---|---|---|---|
| **Por criterio** | `POST /limpiar` | "todo lo de más de dos meses" | vista previa, `confirmo`, mínimo 30 días, hasta 500 |
| **Por selección** | `POST /borrar` | tildé estos 12 en la lista | ninguna extra, hasta 100 |
| **De a uno** | `DELETE /:avisoId` | este que estoy mirando | ninguna extra |

La diferencia que ordena todo: **cuánto ve el que borra**. Por criterio se borra
a ciegas —el número puede agarrar más de lo que uno cree— y por eso hay vista
previa y confirmación. En los otros dos el administrador enumeró exactamente qué
quiere sacar, y pedirle que confirme lo que ya eligió a dedo es ruido.

Lo único que las tres respetan igual: **los pendientes no se borran nunca**.

### 5.1 Cuánto ocupa — `GET /api/admin/comprobantes/consumo`

```json
{
  "propio": {
    "comprobantes": 312, "bytes": 88080384, "masViejo": "2026-02-11T13:02:55.000Z",
    "porAntiguedad": [
      { "tramo": "este_mes",         "comprobantes": 87,  "bytes": 19922944, "borrables": 0,   "bytesBorrables": 0 },
      { "tramo": "un_mes",           "comprobantes": 82,  "bytes": 18874368, "borrables": 79,  "bytesBorrables": 18000000 },
      { "tramo": "dos_meses",        "comprobantes": 0,   "bytes": 0,        "borrables": 0,   "bytesBorrables": 0 },
      { "tramo": "mas_de_dos_meses", "comprobantes": 143, "bytes": 49283072, "borrables": 140, "bytesBorrables": 48000000 }
    ],
    "porEstado": [
      { "estado": "pendiente",  "comprobantes": 6,   "bytes": 1258291 },
      { "estado": "confirmado", "comprobantes": 281, "bytes": 79691776 },
      { "estado": "rechazado",  "comprobantes": 25,  "bytes": 7130316 }
    ],
    "borrados": { "comprobantes": 240, "bytes": 130023424 }
  },
  "cuenta": {
    "plan": "Cloudinary",
    "creditosUsados": 3.42, "creditosDelPlan": 25, "porcentajeUsado": 13.7,
    "almacenamientoBytes": 231736115, "anchoDeBandaBytes": 1288490188,
    "recursos": 655,
    "medidoEn": "2026-08-31T18:00:00.000Z"
  }
}
```

**Los dos bloques miden cosas distintas y ninguno reemplaza al otro:**

- **`propio`** es lo que subió esta app. Es exacto, instantáneo y es el único que
  sabe cortar por estado del aviso. **Es el número con el que se decide qué
  borrar.**
- **`cuenta`** es el estado real de la cuenta de Cloudinary: los créditos, que son
  los que la suspenden.

**`cuenta` puede venir en `null`** —sin configurar, o la API no contestó— y la
pantalla tiene que seguir mostrando `propio` igual. No puede caerse porque un
tercero esté lento.

> **`borrables` no es lo mismo que `comprobantes`.** Es lo que una limpieza se
> llevaría de verdad: descuenta los pendientes, que están protegidos. Usá **ese**
> número en el botón; si no, el administrador aprieta esperando liberar 49 MB y
> libera 47.

> La diferencia entre `cuenta.recursos` y `propio.comprobantes` son **huérfanos**:
> archivos que ningún aviso explica. Vale mostrarla cuando sea grande.

Los cuatro tramos vienen **siempre**, rellenados en cero.

### 5.2 La lista — `GET /api/admin/comprobantes`

| Query | | |
|---|---|---|
| `antiguedad` | opcional | `este_mes` · `un_mes` · `dos_meses` · `mas_de_dos_meses` |
| `anterioresA` | opcional | `AAAA-MM-DD` |
| `estado` | opcional | `pendiente` · `confirmado` · `rechazado` |
| `incluirBorrados` | opcional | `true` para ver también los ya soltados. Default `false` |
| `pagina` `limite` | opcional | default 1 y 20, máximo 100 |

Orden: **el más viejo primero**. Es una pantalla para tirar cosas, y lo primero
que se mira es lo primero que se va.

`bytes` en la respuesta es el total **del filtro entero**, no de la página: es
con lo que se decide, y no puede cambiar al pasar de página.

### 5.3 Vista previa — `POST /api/admin/comprobantes/limpiar/vista-previa`

**Mirá antes de borrar.** Toma el mismo body que el borrado:

```json
{ "meses": 2 }
```

o `{ "anterioresA": "2026-06-30" }`. Opcional: `"estados": ["confirmado", "rechazado"]`.

```json
{
  "comprobantes": 143, "bytes": 49283072,
  "desde": "2026-02-11T13:02:55.000Z", "hasta": "2026-06-30T21:44:10.000Z",
  "clientes": 38,
  "porEstado": [
    { "estado": "confirmado", "comprobantes": 131, "bytes": 45000000 },
    { "estado": "rechazado",  "comprobantes": 12,  "bytes": 4283072 }
  ],
  "protegidos": { "pendientes": 4, "bytes": 2100000 },
  "muestra": [
    { "avisoId": "…", "facturaNumero": 1070, "cliente": "Ricardo Ramirez",
      "informadoEn": "2026-02-11T13:02:55.000Z", "bytes": 344000 }
  ]
}
```

El cartel sale entero de acá:

> Vas a borrar **143 comprobantes (47 MB)**, del 11/02/2026 al 30/06/2026, de 38
> clientes. **4 avisos pendientes quedan afuera.** Esto no se puede deshacer.

- **`muestra`** son los cinco más viejos y los cinco más nuevos que se irían.
  Mostrala: es lo que le permite al administrador darse cuenta de que el filtro no
  es el que quiso **antes** de apretar.
- **`protegidos`** se dice en voz alta. Un número que aparece sin explicación se
  lee como un bug.

Es `POST` y no `GET` para que tome **exactamente el mismo body** que el borrado:
así no hay una traducción a query string que pueda hacer que el cartel diga una
cosa y el borrado haga otra.

### 5.4 Borrar — `POST /api/admin/comprobantes/limpiar`

```json
{ "meses": 2, "confirmo": true, "comprobantesEsperados": 143 }
```

```json
{ "pedidos": 143, "borrados": 141, "fallados": 2,
  "bytesLiberados": 48932000, "lotes": 2, "restan": 0,
  "detalle": ["morgana/comprobantes/2026-06/8be3bef8-…"] }
```

**Las guardas** — cada una ataja un error concreto:

| | |
|---|---|
| `confirmo: true` obligatorio | un doble clic o un reintento del navegador no puede borrar medio store |
| **mínimo 30 días** de antigüedad | escribir `2026-08-30` donde iba `2026-06-30` se convierte en un mensaje, no en un mes perdido |
| **los pendientes nunca**, ni pidiéndolos | un aviso sin resolver necesita su foto: es con lo que se va a decidir |
| `comprobantesEsperados` | si no coincide con lo que hay ahora → **409**, hay que volver a mirar |
| sin criterio no se borra | un body al que se le olvidó el filtro no significa "todo" |

**Mandá siempre `comprobantesEsperados`** con el número de la vista previa: es lo
que la hace vinculante y no decorativa. Entre que se abre el cartel y se aprieta
el botón puede haberse resuelto un aviso.

Se lleva **hasta 500 por pasada** y contesta `restan`: mientras sea mayor que
cero, se aprieta de nuevo. Es idempotente — correrlo dos veces con el mismo
criterio da `borrados: 0` la segunda.

`detalle` son los `publicId` que no se pudieron borrar. **Quedan sin marcar a
propósito**, así la próxima pasada los agarra.

Errores: 400 por cualquiera de las guardas · **409** `La vista previa decía 143
comprobantes y ahora son 147. Volvé a mirarla antes de borrar.`

### 5.5 Borrar los que se tildaron — `POST /api/admin/comprobantes/borrar`

**El caso de la pantalla con casillas**: mirar la lista, marcar los que ya no
sirven y borrarlos juntos. Hasta **100 por vez**, que es lo que entra en una
página del listado — así "seleccionar todo lo que veo" siempre funciona.

```json
{ "avisoIds": ["6aa10954-…", "8be3bef8-…", "cda26c08-…"] }
```

```json
{ "pedidos": 3, "borrados": 3, "fallados": 0,
  "bytesLiberados": 612000, "lotes": 1, "restan": 0, "detalle": [] }
```

**Va sin `confirmo` y sin antigüedad mínima**, al revés que la limpieza por
criterio: enumerar los ids uno por uno ya es la confirmación. Las guardas de
`/limpiar` existen porque ahí un criterio mal escrito se lleva puesto un mes
entero sin que nadie lo vea venir; acá el administrador dijo exactamente cuáles.

⚠️ **Si hay un pendiente en la selección, falla entera y no borra nada:**

```
2 de los comprobantes que elegiste son de avisos sin resolver, y son con lo que
se decide. Destildalos o resolvé esos avisos primero.
```

Es a propósito. Saltearlos y borrar el resto dejaría al administrador viendo
"borrados: 9" de 12 sin forma de saber cuáles quedaron ni por qué; así destilda y
reintenta sobre una selección que va a funcionar completa.

Lo demás no es error y se saltea: los **ya borrados**, y los **ids que no
existen**. Por eso reintentar la misma selección es seguro y da `borrados: 0`.

Queda marcado como **`borradoPor: "manual"`** —lo eligió una persona— y no como
`"antiguedad"`. Es lo que el cliente lee después cuando pregunta por su
comprobante.

Errores: 400 `Elegí al menos un comprobante para borrar.` · 400 `Son demasiados
para una selección: hasta 100 por vez. Para borrados grandes usá la limpieza por
antigüedad.` · 400 el de los pendientes.

### 5.6 Borrar uno — `DELETE /api/admin/comprobantes/:avisoId`

El que se está mirando. Sin confirmación y sin mínimo de antigüedad: las guardas
del masivo existen porque ahí no se ve lo que se borra.

- ya borrado → **200 con todo en cero**, no un error;
- sin comprobante → 404 `Ese aviso no tiene comprobante.`;
- de un **pendiente** → 400 `Este aviso todavía está sin resolver: su comprobante
  es con lo que se decide. Resolvelo primero.` Si el cliente subió algo que no
  corresponde, el camino es **rechazar el aviso** — que borra la imagen y de paso
  le explica por qué.

---

## 6. Configuración

```bash
CLOUDINARY_CLOUD_NAME=      # el de la cuenta, no el de la clave
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_CARPETA=morgana-dev/comprobantes   # ⚠️ distinta por ambiente
CLOUDINARY_URL_SEGUNDOS=3600
```

**Sin las tres primeras la app levanta igual**, como con el SMTP: se puede avisar
un pago en efectivo, y el panel del store muestra `cuenta: null`. Lo que no se
puede es informar por transferencia — eso da 503.

⚠️ **La carpeta tiene que ser distinta en desarrollo y en producción.** Con la
misma en las dos, el botón de limpieza de la máquina de desarrollo se lleva
puestos los comprobantes de verdad.

Las imágenes se achican a 1600px y se recomprimen **al subir**, así que una
captura de 4 MB queda en unos 200 KB. Con eso, 2000 avisos por año son ~400 MB
sobre una cuota gratuita de ~25 GB.

---

## 7. Lo que no existe

- **no se puede agregar un comprobante a un aviso ya mandado.** Si un pendiente
  quedó sin foto, el camino es rechazarlo y que el cliente avise de nuevo;
- **no hay limpieza automática.** Nada se borra solo: es siempre alguien
  apretando un botón con el número delante. Es la misma decisión que ya tomó el
  aviso de deuda —*el sistema no manda avisos solo*— y por lo mismo: la retención
  es una decisión de negocio que cambia, y un cron que ya borró no deja
  arrepentirse;
- **no hay barrido de huérfanos.** El `consumo` los deja ver comparando los dos
  bloques, pero borrarlos hoy es a mano desde la consola de Cloudinary;
- no se puede subir más de una imagen por aviso, ni PDF.
