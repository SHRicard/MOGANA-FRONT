# Panel de administración: la ficha del cliente — guía para el front

La pantalla que contesta **"¿qué clase de cliente es este?"**. Es a lo que se
llega tocando un renglón del [listado de clientes](./flujo_metricas.md#4-el-listado-de-clientes).

```
LISTADO (barrer)                          FICHA (entender)
Mariana Ledesma  $554.000  debe $344.000  →  cumple 0%, 3 facturas sin pagar
Ricardo Ramirez  $633.000  debe  $58.000  →  cumple 20%, paga todo pero tarde
```

El listado tiene tres números por renglón a propósito: sirve para barrer y
elegir. Todo lo que no entra en un renglón está acá.

**Un solo endpoint.** Solo administrador y super admin.

---

## 1. La idea: cumplir no es pagar

Es lo único que hay que entender antes de maquetar esta pantalla.

Una factura que ya venció pudo terminar de tres maneras, y **solo una es
cumplir**:

```
se pagó en fecha  ✔ cumplió
se pagó tarde     ✘ no cumplió — pero la plata entró
sigue impaga      ✘ no cumplió — y la plata no está
```

Por eso la tasa de cumplimiento de esta pantalla **no es** la tasa global del
tablero (`cumplimiento.porFacturas`). Aquella contesta *"¿se pagó?"* y da por
buena una factura pagada con veinte días de atraso. Esta contesta *"¿se pagó
cuando se había pactado?"*.

Y los dos incumplimientos son problemas distintos, así que la ficha los muestra
por separado:

| Cliente | Tasa | Qué le pasa | Qué hacer |
|---------|------|-------------|-----------|
| Paga todo, siempre tarde | baja, con `sinPagar: 0` | te retrasa la plata, no te la hace perder | apretar la cobranza, acortar el plazo |
| No paga | baja, con `sinPagar` alto | te hace perder plata | cortarle el fiado |

Un `cumple 20%` suelto haría parecer iguales a esos dos. Por eso la tasa **nunca
va sola**: al lado van las tres patas de la cuenta y los días de atraso.

---

## 2. El endpoint

```http
GET /api/admin/metricas/clientes/8be3bef8-6d66-452c-a8a8-9f8c347f4330
Authorization: Bearer <token>
```

El `:id` es el `clienteId` del renglón del listado. Sin parámetros: la ficha
viene entera.

| Status | Cuándo |
|--------|--------|
| `400` | El id no es un UUID |
| `404` | No existe, o **no es un cliente**: pedir la ficha de un administrador no devuelve nada |

**Un cliente que existe pero todavía no compró no es un 404.** La ficha viene
igual, con los contadores en cero, las fechas en `null` y la tasa en `null`. El
administrador tocó un cliente que está ahí, y *"todavía no compró nada"* es la
respuesta correcta a su pregunta.

---

## 3. La respuesta

```json
{
  "hoy": "2026-08-21",

  "cliente": {
    "id": "6aa10954-cf08-4711-b7c1-643238970a3f",
    "nombre": "Ricardo Ramirez",
    "dni": "36452185",
    "email": "ricardo@example.com",
    "telefono": null,
    "estado": "activo",
    "seLeFia": true,
    "motivoSinFiado": null
  },

  "estado": "pendiente",

  "cumplimiento": {
    "comoPaga": "se_atrasa",
    "tasa": 20,
    "exigibles": 5,
    "enFecha": 1,
    "tarde": 4,
    "sinPagar": 0,
    "demoraPromedio": 11.2,
    "demoraCuandoSeAtrasa": 20.5,
    "demoraMaxima": 49,
    "atrasoActual": null
  },

  "facturas": {
    "total": 6,
    "activas": 1,
    "vencidas": 0,
    "pagadas": 5,
    "anuladas": 0
  },

  "plata": {
    "facturado": 633000,
    "cobrado": 575000,
    "deuda": 58000,
    "vencido": 0,
    "porVencer": 58000,
    "ticketPromedio": 105500,
    "vencimientoMasViejo": "2026-09-02",
    "diasDelMasViejo": 12
  },

  "reembolsos": {
    "hechos": 0,
    "montoDevuelto": 0,
    "pendientes": 0,
    "aReembolsar": 0
  },

  "compras": {
    "primeraCompra": "2026-06-03",
    "ultimaCompra": "2026-08-19",
    "diasSinComprar": 2,
    "diasEntreCompras": 15,
    "comprasPorMes": 2.31,
    "antiguedadDias": 79
  }
}
```

Ese cliente es el caso de manual: **nunca dejó de pagar** (`sinPagar: 0`) y aun
así cumple **20%**, porque de cinco facturas exigibles pagó cuatro tarde, con
veinte días de atraso promedio y una que se fue a 49. Hoy no debe nada vencido,
así que `atrasoActual` es `null`.

Todos los importes son `number` en pesos, con centavos. Las fechas, `AAAA-MM-DD`.

---

## 4. `cumplimiento` — el bloque principal

### `comoPaga` — el catálogo, en una palabra

Lo primero que hay que mirar. Resume en un valor **qué clase de pagador es**, y
con eso ya sabés qué mostrar y qué no:

| `comoPaga` | Qué pasó | Qué escribir |
|------------|----------|--------------|
| `sin_facturas` | Todavía no compró nada | "Todavía no compró" |
| `sin_vencimientos` | Compró, pero no le venció ninguna | "Sin vencimientos todavía" |
| `nunca_pago` | Ya se le venció algo y **no pagó una sola factura** | "Nunca pagó" |
| `siempre_en_fecha` | Todo lo que pagó, lo pagó antes del vencimiento | "Siempre en fecha" |
| `se_atrasa` | Paga, pero alguna la pagó tarde | "Se atrasa N días" |

Viene resuelto del backend a propósito. Armarlo en el front significa cruzar
tres números que pueden venir en `null` con dos contadores, y **equivocarse ahí
muestra al que nunca pagó como el mejor cliente del negocio** (§5). Es la misma
decisión que con el `estado` de una factura: la regla se escribe una sola vez, y
del lado que tiene los datos.

⚠️ **`comoPaga` habla del historial, no de hoy.** Un cliente puede ser
`siempre_en_fecha` y tener una factura vencida ahora mismo: eso lo dice
`atrasoActual`, y las dos cosas van juntas en pantalla.

### `tasa` — el número

```
tasa = enFecha / (enFecha + tarde + sinPagar)
```

| Campo | Qué es |
|-------|--------|
| `tasa` | De 0 a 100, con un decimal |
| `exigibles` | Contra cuántas facturas se calcula: las que **ya se tenían que pagar** |
| `enFecha` | De esas, cuántas pagó antes o el mismo día del vencimiento |
| `tarde` | Cuántas pagó, pero después de la fecha |
| `sinPagar` | Cuántas siguen impagas con el vencimiento cumplido |

`exigibles` es siempre `enFecha + tarde + sinPagar`. Si en tu pantalla no cierra,
es un bug — avisá.

### Las que están en fecha no entran

Ni arriba ni abajo de la cuenta. Una factura emitida ayer a 30 días **no cumplió
ni incumplió nada todavía**, y contarla como incumplimiento haría que comprar
mucho hunda la tasa sin que el cliente haya hecho nada mal.

Por eso `exigibles` casi nunca es igual a `facturas.total`: la diferencia son las
que todavía están corriendo.

### ⚠️ `tasa` puede ser `null`, y no es `0`

`null` es **"no hay nada que medir"**: este cliente todavía no tiene ninguna
factura vencida. Un `0%` ahí mostraría como el peor de todos al que compró la
semana pasada.

```jsx
// Bien
{tasa === null ? 'Sin vencimientos todavía' : `${tasa}%`}

// Mal: null pasa como 0 y lo muestra como el peor cliente del negocio
{`${tasa ?? 0}%`}
```

### Cómo leerla en pantalla

Nunca sola. El renglón útil es el que muestra de qué está hecha:

```
Cumple 20%          (1 de 5 en fecha · 4 tarde · 0 sin pagar)
```

Con esa línea, el administrador ya sabe que este no es un cliente que no paga:
es uno que paga tarde. Son dos conversaciones distintas.

---

## 5. Las demoras — cuánto tarda

Cuatro números que contestan cuatro preguntas distintas. Todos en días.

| Campo | Mira | Contesta |
|-------|------|----------|
| `demoraPromedio` | **todas** las que pagó | ¿en promedio, cómo paga? |
| `demoraCuandoSeAtrasa` | solo las que pagó **tarde** | cuando se atrasa, ¿cuánto? |
| `demoraMaxima` | el peor atraso que tuvo | ¿cuál fue el peor caso? |
| `atrasoActual` | **lo que NO pagó** | ¿cuántos días lleva colgado ahora? |

Los tres primeros miran el **historial**: son promedios sobre facturas que ya se
saldaron. El cuarto mira el **presente**: los días que pasaron desde el
vencimiento de su factura impaga más vieja.

**`demoraPromedio` puede ser negativo, y eso es bueno**: es el cliente que paga
antes de tiempo. Un `-5` es "paga cinco días antes del vencimiento", y a ese hay
que cuidarlo.

**Ojo con leer solo el promedio general.** Mezcla las adelantadas con las
atrasadas: alguien que paga cinco antes y cinco después da cero, y ese cero no
dice nada. Por eso está `demoraCuandoSeAtrasa`, que es el número del mostrador:
*"sí, paga, pero ¿cuánto tengo que esperar?"*. Siempre es positivo.

`atrasoActual` es el mismo día que `plata.diasDelMasViejo` **con el signo dado
vuelta**: allá es "cuántos días le faltan al vencimiento" y negativo es que ya
pasó; acá es un atraso, y los atrasos se cuentan para arriba. El día del
vencimiento todavía no es atraso: es la fecha en la que hay que pagar.

### ⚠️ `null` en las demoras NO es "siempre en fecha"

Es el error más fácil de cometer en esta pantalla, y hace que **el peor cliente
posible se vea impecable**.

Las tres primeras miran lo que ya pagó. El que **nunca pagó nada** no tiene
ninguna factura saldada que promediar, así que las tres le vienen en `null`:

```json
{
  "estado": "vencida",
  "cumplimiento": {
    "tasa": 0,
    "exigibles": 1, "enFecha": 0, "tarde": 0, "sinPagar": 1,
    "demoraPromedio": null,
    "demoraCuandoSeAtrasa": null,
    "demoraMaxima": null,
    "atrasoActual": 45
  }
}
```

Ese cliente debe una factura que venció hace 45 días y no pagó **nunca** nada.
Mostrar sus `null` como "siempre en fecha" lo deja mejor parado que a uno que
paga todo con dos días de atraso.

| Campo | `null` significa |
|-------|------------------|
| `demoraPromedio` | todavía **no pagó ninguna** factura |
| `demoraCuandoSeAtrasa` · `demoraMaxima` | **nunca pagó tarde** — que incluye "nunca pagó" |
| `atrasoActual` | no tiene **ninguna vencida** hoy |

El renglón del medio es la trampa: `null` ahí no distingue al que paga impecable
del que no pagó nunca. **`comoPaga` sí** (§4), y es de donde tiene que salir el
texto.

**No deduzcas el caso de los `null`: usá `comoPaga`.** Para eso está.

```jsx
const HISTORIAL = {
  sin_facturas:     () => 'Todavía no compró',
  sin_vencimientos: () => 'Sin vencimientos todavía',
  nunca_pago:       () => 'Nunca pagó una factura',
  siempre_en_fecha: () => 'Siempre en fecha',
  se_atrasa:        (c) => `Se atrasa ${c.demoraCuandoSeAtrasa} días`,
};

// El historial…
{HISTORIAL[cumplimiento.comoPaga](cumplimiento)}

// …y el atraso de hoy, SIEMPRE que exista, aparte y en rojo:
{cumplimiento.atrasoActual !== null &&
  `Debe hace ${cumplimiento.atrasoActual} días`}
```

En la rama `se_atrasa` —y **solo** en esa— `demoraCuandoSeAtrasa` es un número
seguro. En las otras cuatro es `null`, y por eso no se lo nombra ahí.

```jsx
// Mal: el que nunca pagó y debe hace 45 días queda como el mejor cliente
{demoraCuandoSeAtrasa === null ? 'Siempre en fecha' : `…`}

// Mal: cualquier cuenta sobre un campo que puede faltar termina en NaN
{`Se atrasa ${Math.round(demoraCuandoSeAtrasa)} días`}   // NaN
{`${(atrasoActual / 30).toFixed(1)} meses`}              // NaN si es null
```

### De dónde sale un `NaN`

**Del front, siempre.** JSON no tiene `NaN`: si el backend produjera uno, en el
cuerpo viajaría como `null`. Así que un `NaN` en pantalla es una cuenta hecha
sobre un valor que no está — y en esta pantalla hay cuatro que pueden no estar.

Las tres causas, en orden de frecuencia:

1. **Aritmética sobre un `null`** (`Math.round`, `.toFixed`, dividir, sumar).
   Chequeá el `null` **antes** de tocar el número, no después.
2. **El campo todavía no existe en la respuesta**: si el servidor no se
   reinició, `atrasoActual` y `comoPaga` llegan `undefined` y cualquier cuenta
   sobre `undefined` es `NaN`. Un `null` chequeado con `=== null` tampoco atrapa
   un `undefined` — usá `== null` o el `?.`/`??`.
3. **Parsear un importe ya parseado**: todos los números vienen como `number`,
   no como texto. `parseFloat` sobre un `number` funciona, pero sobre un `null`
   da `NaN`.

Los dos números conviven, y no se contradicen: **un historial impecable y un
atraso en curso son cosas distintas**. El cliente que siempre pagó en fecha y
esta vez se colgó tiene `demoraCuandoSeAtrasa: null` y `atrasoActual: 20`, y hay
que mostrar las dos cosas.

---

## 6. `facturas` — cuántas tiene abiertas

| Campo | Qué es |
|-------|--------|
| `total` | Todas las vigentes que tuvo, en toda su historia |
| `activas` | **Las que todavía deben algo**, vencidas o no. Son las abiertas en el mostrador |
| `vencidas` | De esas, cuántas ya se pasaron de fecha |
| `pagadas` | Cuántas saldó |
| `anuladas` | Cuántas se le dieron de baja. **No cuentan para nada más**: no suman a `total`, ni a la deuda, ni a la tasa |

`total` es `activas + pagadas`. Las anuladas van aparte porque son facturas que
no existieron: se guardan con su número y su motivo, pero no se cobran ni
vencen.

**`activas` no es lo mismo que `vencidas`.** Un cliente con 10 activas y 0
vencidas está perfecto: compró y todavía está en plazo. El que preocupa es el que
tiene `vencidas > 0`.

---

## 7. `plata` — cuánto mueve y cuánto debe

| Campo | Qué es |
|-------|--------|
| `facturado` | Todo lo que se le facturó, sin las anuladas |
| `cobrado` | Todo lo que entró de él |
| `deuda` | Lo que debe hoy: `facturado − cobrado` |
| `vencido` | De esa deuda, la que ya se pasó de fecha. **Es la que va en rojo** |
| `porVencer` | Y la que todavía está en tiempo. No es un problema, es plata en camino |
| `ticketPromedio` | Lo que gasta por compra. `null` si no tiene facturas |
| `vencimientoMasViejo` | El vencimiento impago más viejo. `null` si no debe nada |
| `diasDelMasViejo` | Los días que le faltan a ese vencimiento. **Negativo es que ya pasó** |

`diasDelMasViejo` usa el mismo signo que en toda la app: `-45` es "venció hace 45
días", `12` es "vence en 12 días". Es el mismo número del que sale el chip
`estado` de arriba, así que los dos siempre dicen lo mismo.

---

## 8. `reembolsos` — la plata que va para el otro lado

Cuando se anula una factura que ya tenía cobros, esa plata **hay que
devolverla**: entró, pero no es tuya.

| Campo | Qué es |
|-------|--------|
| `hechos` / `montoDevuelto` | Cuántas devoluciones se le hicieron y por cuánto |
| `pendientes` / `aReembolsar` | Cuántas faltan y cuánto suman |

**Si `aReembolsar` es mayor a cero, mostralo en alerta**: hay alguien esperando
que le devuelvan algo. Y mostralo separado de la deuda, con otro color y otro
signo, porque va justo para el lado contrario — no restes uno del otro.

La devolución en sí pasa **afuera del sistema** —efectivo, transferencia, como
sea— y en la app solo queda anotado que ya se hizo.

---

## 9. `compras` — cada cuánto vuelve

| Campo | Qué es |
|-------|--------|
| `primeraCompra` / `ultimaCompra` | `AAAA-MM-DD` |
| `diasSinComprar` | **El número de fuga** |
| `diasEntreCompras` | Cada cuántos días vuelve, en promedio |
| `comprasPorMes` | Lo mismo, en la unidad que se lee más fácil |
| `antiguedadDias` | Hace cuántos días que es cliente, desde su primera factura |

**`diasSinComprar` hay que leerlo contra `diasEntreCompras`**, no solo. Uno que
compra cada 30 días y hace 40 que no aparece recién se está demorando; uno que
compra cada 5 y hace 40 que no aparece **ya se fue**. Ese contraste es toda la
información:

```
Compra cada 15 días · hace 2 que no aparece     → normal
Compra cada 15 días · hace 90 que no aparece    → lo estás perdiendo
```

| Es `null` cuando |
|------------------|
| `diasEntreCompras` → tiene una sola factura: no hay intervalo que promediar |
| `comprasPorMes` → es cliente hace menos de 30 días |
| todos los demás → todavía no compró nada |

Lo de `comprasPorMes` merece la aclaración: tres compras en cuatro días **no**
son "22 compras por mes". Es una división sin datos suficientes, y el backend
prefiere no contestar antes que contestar cualquier cosa.

---

## 10. `cliente` y `estado`

El bloque `cliente` es quién es: nombre ya resuelto, DNI, email y teléfono para
poder llamarlo. `telefono` es `null` hasta que la persona lo cargue — nadie está
obligado — y **el administrador no lo edita**: es un dato de la persona.

Dos campos que conviene no confundir:

| Campo | Qué dice |
|-------|----------|
| `cliente.estado` | Si la **cuenta de la app** puede operar: `bloqueado` mientras no tenga DNI |
| `estado` (el de arriba) | Cómo está su **cuenta corriente**: `al_dia`, `pendiente`, `proxima_a_vencer` o `vencida` |

`bloqueado` **no frena la facturación**: a ese cliente se le factura y se le
cobra igual, porque el bloqueo es de la app y no del mostrador. Se le puede
cargar el documento desde el panel (`PATCH /admin/clientes/:id/dni`) mientras la
persona está enfrente.

Y `seLeFia` con `motivoSinFiado` es la marca del fiado: en `false`, la factura
que se le emita **vence el mismo día**. Si está cortado, el motivo tiene que
verse — sin él, el que atiende no sabe si puede hacer una excepción. Se cambia
desde [`bloquear_fiado.md`](./bloquear_fiado.md).

---

## 11. Cómo se arma la pantalla

```
┌─────────────────────────────────────────────────────────┐
│  RICARDO RAMIREZ                       DNI 36.452.185   │
│  ricardo@example.com · sin teléfono          [pendiente]│
└─────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬───────────────────┐
│ CUMPLE           │ SE ATRASA        │ DEBE              │
│ 20%              │ 20 días          │ $58.000           │
│ 1 de 5 en fecha  │ peor caso: 49    │ nada vencido      │
└──────────────────┴──────────────────┴───────────────────┘

   … y el mismo bloque para el que nunca pagó nada:

┌──────────────────┬──────────────────┬───────────────────┐
│ CUMPLE           │ SE ATRASA        │ DEBE              │
│ 0%               │ nunca pagó       │ $8.810            │
│ 0 de 1 en fecha  │ debe hace 45 d   │ ▲ vencido         │
└──────────────────┴──────────────────┴───────────────────┘

┌─────────────────────────────────────────────────────────┐
│  1 en fecha  ·  4 tarde  ·  0 sin pagar                 │  ← las tres patas
└─────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬───────────────────┐
│ FACTURAS ACTIVAS │ VENCIDAS         │ SIN COMPRAR       │
│ 6                │ 0                │ hace 2 días       │
│ 1 abierta        │                  │ compra cada 15    │
└──────────────────┴──────────────────┴───────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Comprado $633.000 · cobrado $575.000 · ticket $105.500 │
│  Cliente desde el 3/6 · 2,3 compras por mes             │
└─────────────────────────────────────────────────────────┘

[ Ver su cuenta corriente → ]     [ Cortarle el fiado ]
```

Cuatro cosas que conviene no saltear:

- **La tasa nunca sola.** El renglón de las tres patas es el que evita que "20%"
  se lea como "no paga".
- **El bloque de demoras necesita `facturas.pagadas` para escribirse.** Sin eso,
  el que nunca pagó nada dice "siempre en fecha" (§5).
- **`vencido` y `aReembolsar` en colores distintos.** Van para lados opuestos:
  uno es plata que te deben, el otro plata que debés.
- **Un `null` no es un cero.** "Sin vencimientos todavía" y "0% de cumplimiento"
  son clientes opuestos.

### Esto no reemplaza a la cuenta corriente

Son dos pantallas y conviene enlazarlas:

| | `GET /admin/clientes/:id/cuenta` | `GET /admin/metricas/clientes/:id` |
|---|---|---|
| Trae | sus facturas, una por una | la conclusión de todas |
| Contesta | ¿de qué está hecha su deuda? | ¿qué clase de cliente es? |
| Sirve para | ir a cobrar una factura puntual | decidir si le seguís fiando |

La ficha es la **lectura** de esa lista. El detalle factura por factura está en
[`flujo_pagos.md`](./flujo_pagos.md).

---

## 12. Rendimiento

La ficha sale de **la misma consulta que el listado**, acotada a un cliente, más
un agregado aparte para los reembolsos. Eso no es una optimización: es lo que
garantiza que la lista y la ficha no puedan decir números distintos del mismo
cliente.

Nada se guarda: no hay tabla de métricas ni una tasa que alguien tenga que
recalcular. Todo sale de las facturas y los pagos cada vez que se pide, así que
un cobro anotado hace un segundo ya está reflejado. Recargala al entrar a la
pantalla y después de registrar un pago, no en un `setInterval`.
