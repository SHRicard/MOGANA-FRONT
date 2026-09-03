# Notificaciones en la app — contrato para el front

El cliente recibe avisos **dentro de la app**, además del correo. Hoy hay uno
solo: el de deuda vencida.

Por qué las dos cosas: el correo se pierde entre cien más, se va a spam o la
persona no lo abre nunca. El aviso de la app queda ahí hasta que lo lea.

```
        el administrador aprieta "Avisar deuda"
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   aviso en la app              correo (si tiene
   (siempre queda)               dirección cargada)
```

> **No es una notificación push.** Esto es la campanita adentro de la app: el
> teléfono no suena ni muestra nada si la app está cerrada. Para eso hace falta
> Firebase y es otra funcionalidad.

---

## `GET /api/notificaciones`

Los avisos de quien pregunta. **Nunca lleva un id de persona**: sale de la
sesión, así que no hay forma de leer los de otro.

| Query | | |
|---|---|---|
| `soloNoLeidas` | opcional | `true` deja solo las nuevas. Es la pestaña "sin leer" |
| `pagina` | opcional | arranca en 1 |
| `limite` | opcional | 1 a 100, por defecto 20 |

```json
{
  "datos": [
    {
      "id": "fbbbd6c2-…",
      "tipo": "deuda_vencida",
      "titulo": "Tenés 2 facturas vencidas",
      "mensaje": "Sumás $ 105.002,50 sin pagar. La más antigua venció hace 20 días, el 30/07/2026. Acercate al local y lo arreglamos: si ahora no podés con todo, se puede ir en partes.",
      "datos": {
        "deuda": 105002.5,
        "facturasVencidas": 2,
        "vencimientoMasViejo": "2026-07-30",
        "facturas": [
          { "numero": 72, "fechaFin": "2026-08-10", "saldo": 32000 },
          { "numero": 71, "fechaFin": "2026-07-30", "saldo": 73002.5 }
        ]
      },
      "destino": { "pantalla": "mis_facturas", "id": null },
      "leidaEn": null,
      "createdAt": "2026-08-19T21:04:24.301Z"
    }
  ],
  "total": 1,
  "noLeidas": 1,
  "pagina": 1,
  "limite": 20,
  "paginas": 1
}
```

| Campo | |
|---|---|
| `tipo` | qué clase de aviso es: elige el ícono y a qué pantalla lleva. Ver abajo |
| `titulo` · `mensaje` | ya redactados, se muestran tal cual. Son el mismo texto que el correo |
| `datos` | los números sueltos, por si querés pintarlos vos: el total en grande, la lista en una tabla |
| `destino` | **a dónde lleva el clic**. `null` es un aviso que no abre nada. Ver abajo |
| `leidaEn` | `null` es sin leer |
| `noLeidas` | **el número del globito**. Cuenta todas las sin leer de la cuenta, no las de esta página ni las del filtro |

### Los seis `tipo`

| `tipo` | Le llega a | Cuándo |
|---|---|---|
| `deuda_vencida` | el cliente | El administrador aprieta "avisar deuda" |
| `anuncio` | todos los clientes | El administrador publica algo: un feriado, una promoción |
| `pago_informado` | **el administrador** | Un cliente avisó que pagó. **Es el único aviso que dispara un cliente** |
| `pago_confirmado` | el cliente | Se le tomó el pago que informó |
| `pago_rechazado` | el cliente | No se le tomó, y el `mensaje` dice por qué |
| `store_lleno` | **el administrador** | Se está llenando el lugar para comprobantes. **Es el único que ningún cliente puede recibir** ([guía](./flujo_comprobantes.md)) |

⚠️ **`datos` tiene una forma distinta según el `tipo`.** Elegí por `tipo`, nunca
por qué campos vienen. Los tres de pago traen:

```json
{
  "pagoInformadoId": "3bd79309-…",
  "facturaId": "ce5f8070-…",
  "facturaNumero": 1070,
  "monto": 28500,
  "fecha": "2026-08-21"
}
```

En `pago_confirmado`, ese `monto` es **lo que se anotó**, que puede no ser lo que
el cliente informó. Los avisos de pago se apilan y nunca se pisan: cada uno habla
de un aviso concreto, así que reemplazar *"no tomamos tu pago del 3"* con
*"tomamos tu pago del 10"* borraría la única explicación de una deuda vieja. El
flujo entero está en [`user_cliente_flujo.md`](./user_cliente_flujo.md).

`datos` es **una foto del momento**, no la deuda de ahora: si el cliente pagó
después, el aviso viejo sigue diciendo lo de antes. El saldo que vale sale de la
cuenta, no de acá.

Los avisos vienen **del más nuevo al más viejo**.

---

## A dónde lleva el clic

Cada aviso trae un `destino`. **Toca, leelo, navegá** — no hace falta mirar el
`tipo` ni saber de qué campo de `datos` sale el id.

```json
"destino": { "pantalla": "bandeja_de_pagos", "id": "3bd79309-…" }
```

| `pantalla` | Es de | Qué abre | `id` |
|---|---|---|---|
| `mis_facturas` | cliente | La lista de sus facturas | siempre `null` |
| `una_factura` | cliente | Una factura | el id de la **factura** |
| `bandeja_de_pagos` | administrador | La bandeja de avisos de pago | el id del **aviso** |
| `store_de_comprobantes` | administrador | El panel del almacenamiento | siempre `null` |

Y el mapeo completo, que es lo que resuelve el backend por vos:

| `tipo` | `destino.pantalla` | Por qué ahí |
|---|---|---|
| `deuda_vencida` | `mis_facturas` | Habla de todas las vencidas, no de una |
| `anuncio` | **`null`** | Es texto y nada más: no hay nada que abrir |
| `pago_informado` | `bandeja_de_pagos` | El administrador tiene que confirmarlo o rechazarlo |
| `pago_confirmado` | `una_factura` | Ahí se ve el saldo que quedó |
| `pago_rechazado` | `una_factura` | Ahí se ve por qué sigue debiendo, y desde ahí vuelve a avisar el pago |
| `store_lleno` | `store_de_comprobantes` | A borrar comprobantes |

⚠️ **Los dos de pago llevan a la factura, no al aviso.** Es a propósito: el aviso
ya lo acaba de leer en la campanita, no tiene nada que hacer ahí. Lo que necesita
es la factura —cuánto quedó debiendo, y el botón para volver a avisar el pago si
se lo rechazaron.

### Aplicarlo en React Native

Un solo mapa de `pantalla` a ruta, y listo:

```tsx
const RUTAS = {
  mis_facturas:          () => ['MisFacturas', undefined],
  una_factura:           (id) => ['Factura', { facturaId: id }],
  bandeja_de_pagos:      (id) => ['PagosInformados', { avisoId: id }],
  store_de_comprobantes: () => ['Almacenamiento', undefined],
};

function abrir(aviso) {
  // Marcar leída no bloquea la navegación: si falla, el globito se corrige
  // solo en el próximo listado.
  void api.post(`/notificaciones/${aviso.id}/leida`).catch(() => {});

  const ruta = aviso.destino && RUTAS[aviso.destino.pantalla];

  // ⚠️ El `?.` y el `if` no son defensivos de más: `destino` es `null` en los
  // anuncios, y una versión más nueva del backend puede mandar una `pantalla`
  // que esta build de la app todavía no conoce. En los dos casos el aviso se
  // lee igual y no se navega — nunca se rompe.
  if (!ruta) return;

  const [nombre, params] = ruta(aviso.destino.id);
  navigation.navigate(nombre, params);
}
```

**Renderizá la fila como tocable solo si `destino` no es `null`.** Un aviso que
parece un botón y no hace nada se siente roto; un anuncio que se ve como texto,
no.

⚠️ **`destino.id` puede venir `null` en una pantalla que normalmente lleva id**:
los avisos guardados antes de que `datos` trajera ese campo. Caé en la pantalla
sin nada abierto —la lista de facturas, la bandeja completa— en vez de romper.
Hay un test que fija ese comportamiento.

⚠️ **No hardcodees el mapeo de `tipo` a pantalla del lado de la app.** Es
exactamente lo que `destino` viene a evitar: duplicado allá, se desactualiza el
día que se agrega un tipo nuevo, y nadie se entera hasta que un clic no lleva a
ningún lado.

---

## `POST /api/notificaciones/:id/leida`

Marca uno como leído y lo devuelve actualizado. Sin body.

Es idempotente: marcarlo dos veces no cambia la fecha de la primera lectura. El
aviso de otra persona da `404` —igual que uno que no existe— y no `403`: nadie
tiene por qué enterarse de que ese id existe.

## `POST /api/notificaciones/leer-todas`

Vacía el globito de una. Devuelve `{ "leidas": 3 }`, cuántas marcó.

---

## `DELETE /api/notificaciones/:id`

Saca un aviso de la campanita. Sin body. Devuelve `{ "borrada": true }`.

Es idempotente: borrarlo dos veces devuelve lo mismo y no mueve la fecha del
primer borrado. El aviso de otra persona da `404` —igual que uno que no existe—
y no `403`: nadie tiene por qué enterarse de que ese id existe.

## `DELETE /api/notificaciones`

**Vacía la campanita entera.** Sin body. Devuelve `{ "borradas": 7 }`, cuántas
se fueron.

Solo las de quien pregunta, y solo las que seguían ahí: llamarlo dos veces
devuelve `0` la segunda, que es la respuesta correcta y no un error.

### Es un borrado blando, y por qué importa

La fila **no se va de la base**: se le pone `borradaEn` y deja de aparecer en la
lista, en el `total` y en el globito. Para quien la borró, dejó de existir.

Se guarda igual porque **un aviso es la prueba de qué se le comunicó a alguien y
cuándo**. *"No tomamos tu pago del 3 porque el comprobante no se leía"* es, tres
semanas después, la única explicación de una deuda que sigue figurando; si el
cliente vació su campanita, esa constancia no puede haberse ido con ella. Lo que
se borra es de su vista, no del registro.

⚠️ **Al borrar, un aviso sin leer queda también marcado como leído.** No es un
detalle de implementación que se pueda cambiar sin mirar: el índice único de
`deuda_vencida` vive sobre `leidaEn: null` y `publicarDeuda` upsertea con ese
mismo filtro, así que una borrada que quedara sin leer seguiría ocupando ese
lugar — y **el próximo aviso de deuda actualizaría la borrada, invisible, en vez
de crear uno nuevo**. El cliente no volvería a ver un aviso de deuda nunca más,
sin ningún error y sin nada en el log. Hay un test que falla si alguien saca esa
línea.

⚠️ **El aviso `store_lleno` vuelve al día siguiente si el problema sigue.** El
cron ignora las borradas a propósito: el almacenamiento no se arregla
descartando el aviso, y recordar que ya se avisó algo que la persona ya no puede
ver sería una semana de silencio sobre algo urgente.

### En la app

```tsx
// Un aviso, deslizando la fila:
await api.delete(`/notificaciones/${aviso.id}`);

// El botón "borrar todas", arriba de la lista:
const { borradas } = await api.delete('/notificaciones');
```

**Pedí confirmación antes de vaciar todo** —"¿Borrar los 7 avisos?"— y recién
después llamá. No hay forma de deshacerlo desde la app: la fila queda en la
base, pero no hay endpoint para traerla de vuelta, y si hiciera falta sería a
mano.

Después de borrar, volvé a pedir el listado en vez de sacar la fila a mano: el
`noLeidas` que vuelve ya es el número correcto del globito.

---

## En la pantalla

- **La campanita** muestra `noLeidas`. Se refresca con cualquier llamada al
  listado, así que después de marcar una podés usar el `noLeidas` que vuelve.
- **La lista**: `titulo` en negrita, `mensaje` abajo, y las sin leer marcadas.
- **Al abrir un aviso**, mandá el `POST .../leida`. No esperes la respuesta para
  pintarlo leído: si falla, el número vuelve solo en el próximo listado.
- **Deslizar la fila la borra**, y arriba de la lista va el "borrar todas".
  Confirmá antes de vaciar: no se puede deshacer desde la app.
- **El clic lo resuelve `destino`**, no un `switch` por `tipo`. Está arriba, en
  [A dónde lleva el clic](#a-dónde-lleva-el-clic).

---

## Cuándo se manda

Lo dispara el administrador desde el panel, con
`POST /api/admin/clientes/:id/aviso-deuda` — ver
[`flujo_pagos.md`](./flujo_pagos.md). **El sistema no avisa solo**: no hay tarea
nocturna que reclame deudas.

Y no se apila: si el cliente todavía no leyó el aviso anterior, el nuevo
**reemplaza** al viejo con los números de hoy y vuelve arriba de la lista. Que el
mostrador insista tres veces no le llena la campanita de avisos repetidos.

---

## Probarlo

```bash
npm run db:seed:avisos
```

Deja tres clientes con facturas vencidas, pensados para ver los tres casos del
aviso:

| Cliente | DNI | Qué prueba |
|---|---|---|
| Valeria Aguirre | 30999001 | una sola vencida y reciente: el aviso más corto |
| Mariana Ledesma | 30999002 | tres vencidas —una con cobro parcial— **más una al día**: el aviso lista solo lo vencido, pero el total es el de toda la cuenta |
| Sofía Bentancur | 30999003 | quince vencidas: la tabla del correo corta en 12 y aparece el "y 3 más" |

Son del rango de DNI `30.999.xxx` y el seed **solo toca sus facturas**: la demo
y lo que hayas cargado a mano quedan como están. Se puede correr las veces que
haga falta — las fechas vuelven a acomodarse al día en que se corre.

Dos variables del `.env` cambian qué podés probar:

| | |
|---|---|
| `CLIENTES_DEMO_PASSWORD` | con eso los tres **entran a la app** y podés ver el aviso en la campanita |
| `EMAIL_PRUEBAS` | a qué casilla van los correos. Cada cliente usa `tucorreo+deuda1@…`, que Gmail entrega en tu bandeja. **Sin esto nacen sin correo** y el aviso va solo a la app |

⚠️ **No pruebes el aviso con los clientes del seed de demo.** Sus correos son
`@mail.com`, que es un proveedor real: les llegaría un reclamo de deuda inventado
a personas de verdad.

---

## El anuncio para todos los clientes

Además del aviso de deuda, el administrador puede mandar un aviso escrito a mano
a todos: un feriado, una promoción, un cambio de horario.

```http
POST /api/admin/anuncios          ← rol administrador
{ "titulo": "El 23 cerramos", "mensaje": "El local permanece cerrado." }
```
```json
{ "message": "Aviso publicado para 17 clientes. Lo van a ver al abrir la app.", "personas": 17 }
```

| | |
|---|---|
| `titulo` | hasta 80 caracteres |
| `mensaje` | hasta 500 |
| `destinatario` | opcional, hoy solo `"todos"` |

Aparece en la campanita como cualquier otro aviso, con `tipo: "anuncio"`, y **se
apila**: dos anuncios distintos son dos filas. Es la diferencia con el aviso de
deuda, que se actualiza porque siempre habla de lo mismo con números de hoy.

⚠️ **No se puede deshacer.** El panel tiene que preguntar *"¿mandarle esto a N
clientes?"* y bloquear el botón mientras responde: tocarlo dos veces manda el
aviso duplicado a todos.

> Se ve **al abrir la app**. No aparece en el celular con la app cerrada — eso
> necesita notificaciones push, que hoy no están.
