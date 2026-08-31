# Panel de administración: métricas y catálogo — guía para el front

Todo lo que necesita el front para las **seis pantallas de métricas** y el
**catálogo de especies**, en un solo documento. Es autosuficiente: no hay que
abrir ningún otro archivo para implementarlas.

| # | Pantalla | Endpoint | Contesta |
|---|----------|----------|----------|
| §1 | Tablero | `GET /api/admin/metricas` | ¿cómo va el negocio **hoy**? |
| §2 | Listado de clientes | `GET /api/admin/metricas/clientes` | ¿a quién miro? |
| §3 | Ficha del cliente | `GET /api/admin/metricas/clientes/:id` | ¿qué clase de cliente es **este**? |
| §4 | Tickets del mes | `GET /api/admin/metricas/tickets`<br>`GET /api/admin/metricas/tickets/2026-07` | ¿qué pasó **en julio**? |
| §5 | Tendencia de compra | `GET /api/admin/metricas/tendencia` | ¿qué **se llevan** mis clientes, mes a mes? |
| §6 | Productos, global | `GET /api/admin/metricas/productos` | de todo lo que vendo, ¿qué **manda** y qué no se vende? |
| §7 | Catálogo de especies | `GET·POST /api/admin/especies`<br>`PATCH·DELETE /api/admin/especies/:id` | con qué etiqueta se agrupa lo que vendo |

> 💡 **Para probar contra datos de verdad**, el backend tiene un escenario
> sembrado: `npm run db:seed:operacion` escribe un año de operación de una
> distribuidora —176 facturas, 16 clientes con historias distintas, cobros,
> anuladas y avisos—. Los JSON de este documento son **ilustrativos**: los
> valores exactos que vas a ver son los de ese escenario.

El recorrido natural es **tablero → listado → ficha**: el primero dice cómo va el
negocio, el segundo a quién mirar, el tercero qué clase de cliente es. Los
tickets, la tendencia y la métrica global de productos son solapas aparte, y el
catálogo es la pantalla de mantenimiento que alimenta el selector del alta de
factura.

**Las tres pantallas de mercadería contestan cosas distintas** y conviene no
elegir al azar: el ticket dice qué se vendió *en un mes*, la tendencia cómo
viene *mes a mes*, y la global de productos qué manda *en todo el período*.

> ⚠️ **§7 rompe contrato con el alta de factura.** Desde el catálogo, cada
> renglón de una factura necesita una especie. Si el front ya emite facturas,
> empezá por ahí: [§7.3](#73-la-especie-en-el-alta-de-la-factura).

---

## 0. Ocho reglas que valen para todo el documento

**1. Todos piden `Authorization: Bearer <token>` de un administrador.** Sin token
es `401`; con un token de cliente, `403`. El cliente no ve nada de esto.

**2. Los errores tienen siempre la misma forma:**

```json
{ "message": "Texto que se le muestra a la persona" }
```

Usá ese `message` tal cual: está escrito para que lo lea una persona.

**3. Los importes son `number` en pesos, con centavos.** Vienen calculados:
mostralos, no los sumes ni los redondees de nuevo.

**4. Las fechas son `AAAA-MM-DD` y los meses `AAAA-MM`.** Un mes mal escrito
(`2026-13`, `agosto`, `2026-8`) es `400` con
`{ "message": "El mes va como 2026-08." }`.

**5. `null` no es `0`.** Es la regla que más se rompe. Un porcentaje en `null`
significa *"no hay nada que medir"* —cero clientes facturados, ninguna factura
vencida todavía— y mostrarlo como `0%` hace que un negocio recién abierto se vea
fundido y que el cliente que compró ayer se vea como el peor de todos.

```jsx
{tasa === null ? '—' : `${tasa}%`}      // bien
{`${tasa ?? 0}%`}                        // mal
```

**6. Los signos, que son dos convenciones distintas y conviene no mezclarlas:**

| Campo | Signo |
|-------|-------|
| **Días para vencer** (`diasParaVencer`, `diasDelMasViejo`) | **negativo es que ya pasó**. `-45` es "venció hace 45 días" |
| **Demoras y atrasos** (`demoraPromedio`, `atrasoActual`) | **positivo es tarde**. `-5` en una demora es "paga cinco días antes" |

**7. Nada se guarda: todo se calcula.** No hay tabla de métricas ni acumulados
que alguien tenga que actualizar. Los números salen de las facturas y los pagos
cada vez que se piden, así que un cobro anotado hace un segundo ya está
reflejado. Recargá al entrar a la pantalla y después de escribir algo — **no en
un `setInterval` de 5 segundos**.

**8. Los criterios son los mismos que en el
[tablero de facturación](./flujo_pagos.md).** La deuda,
el chip de estado y quién es moroso se calculan con la misma regla acá y allá:
los números de las dos pantallas **tienen que coincidir**. Si no coinciden,
es un bug: avisá.

---

## 1. El tablero — ¿cómo va el negocio hoy?

```http
GET /api/admin/metricas
GET /api/admin/metricas?mes=2026-08
```

| Query | Tipo | Default | Qué hace |
|-------|------|---------|----------|
| `mes` | `AAAA-MM` | el mes en curso | Elige el período de los números **de flujo** |

### 1.1. ⚠️ Qué mueve el `mes` y qué no

Es la única trampa de esta pantalla y conviene tenerla clara antes de maquetar:

| Cambia con el `mes` | No cambia nunca |
|---------------------|-----------------|
| `delMes` (lo cobrado y lo facturado del período) | `enLaCalle` |
| `evolucion` (en qué mes termina el gráfico) | `clientes`, `cumplimiento`, `global` |

**La plata en la calle, los morosos y la tasa de cumplimiento son la foto de
hoy.** Elegir marzo no muestra "cuánto se debía en marzo": muestra cuánto se
debe **ahora**, junto a lo que se facturó y se cobró en marzo. Para ver cómo
cerró marzo está el ticket de marzo (§4).

Si el front deja navegar meses, el bloque de "en la calle" tiene que quedar
visualmente separado del bloque del mes.

### 1.2. La respuesta

```json
{
  "hoy": "2026-08-20",

  "delMes": {
    "mes": "2026-08", "desde": "2026-08-01", "hasta": "2026-08-31",
    "cobrado": 59622.25, "cobros": 5,
    "facturado": 221060, "facturas": 5
  },

  "enLaCalle": {
    "deuda": 1348655.75,
    "vencido": 1121893.25,
    "porVencer": 226762.5,
    "facturasImpagas": 34,
    "facturasVencidas": 27,
    "vencimientoMasViejo": "2026-06-05",
    "diasDelMasViejo": -76
  },

  "clientes": {
    "total": 15, "conFacturas": 14, "conDeuda": 12,
    "morosos": 8, "sinFiado": 1
  },

  "cumplimiento": { "porClientes": 42.9, "porFacturas": 6.9, "porPlata": 24.8 },

  "global": {
    "totalFacturado": 1792728, "totalCobrado": 444072.25,
    "facturas": 36, "facturasPagadas": 2, "facturasVencidas": 27,
    "facturasAnuladas": 1,
    "ticketPromedio": 49798,
    "aReembolsar": 73002.5
  },

  "evolucion": [
    { "mes": "2026-03", "facturado": 0,        "cobrado": 0 },
    { "mes": "2026-04", "facturado": 0,        "cobrado": 0 },
    { "mes": "2026-05", "facturado": 595500,   "cobrado": 0 },
    { "mes": "2026-06", "facturado": 608760.5, "cobrado": 362000 },
    { "mes": "2026-07", "facturado": 367407.5, "cobrado": 22450 },
    { "mes": "2026-08", "facturado": 221060,   "cobrado": 59622.25 }
  ]
}
```

### 1.3. Qué significa cada número

**`delMes` — lo que pasó este mes.** `cobrado` es la plata que **entró**,
contada por la fecha del cobro: un pago de agosto contra una factura de marzo
entró en agosto. `facturado` es lo que se emitió, por fecha de emisión. Los dos
dejan afuera las facturas anuladas.

**`enLaCalle` — la plata prestada.** La suma de los saldos de **todas** las
facturas que todavía deben algo, del mes que sean. Es el número grande de la
pantalla.

```
deuda = vencido + porVencer
```

- **`vencido`** → ya se pasó de fecha. Acá es donde hay que llamar.
- **`porVencer`** → todavía está en tiempo. No es un problema, es plata en camino.

`vencimientoMasViejo` y `diasDelMasViejo` son `null` cuando no hay nada vencido.

**`clientes` — la gente.** **Deber no es ser moroso**: el que compró la semana
pasada y tiene 30 días para pagar entra en `conDeuda` y está perfecto. **Moroso**
es el que tiene al menos una factura que ya venció sin pagar. `total` y
`sinFiado` cuentan a **todos** los clientes, hayan comprado o no: al que nunca
compró se le puede haber cortado el fiado igual.

**`cumplimiento` — qué parte del negocio te paga.** Tres cortes de la misma
pregunta, que dan números distintos **a propósito**. De 0 a 100 con un decimal.

| Campo | Fórmula | Qué contesta |
|-------|---------|--------------|
| `porClientes` | `(conFacturas − morosos) / conFacturas` | De mis clientes, ¿cuántos me pagan en fecha? |
| `porFacturas` | `pagadas / (pagadas + vencidas)` | De lo que ya se tenía que pagar, ¿cuánto se pagó? |
| `porPlata` | `totalCobrado / totalFacturado` | De toda la plata que facturé, ¿cuánta cobré? |

En `porFacturas`, las facturas que **todavía están en fecha no entran** ni
arriba ni abajo: una emitida ayer a 30 días no cumplió ni incumplió nada
todavía, y contarla hundiría la tasa cada vez que se factura mucho.

**⚠️ Los tres pueden venir `null`** (regla 5). Y ⚠️ **`porFacturas` no es la tasa
de la ficha del cliente** (§3.5): esta contesta *"¿se pagó?"* y da por buena una
factura pagada con veinte días de atraso; la del cliente contesta *"¿se pagó en
la fecha pactada?"*. Son dos preguntas y los dos números no tienen por qué
coincidir — no los pongas uno al lado del otro.

**`global` — desde que existe el negocio.** `totalFacturado − totalCobrado` da
exactamente `enLaCalle.deuda`. `ticketPromedio` es `null` si todavía no se emitió
ninguna factura. **`aReembolsar`** es plata cobrada en facturas que después se
anularon y que no se devolvió: va para el otro lado, no es tuya — si es mayor a
cero, en color de alerta.

**`evolucion` — el gráfico.** Seis meses, **del más viejo al más nuevo**,
terminando en el mes elegido, con dos series. Los meses sin movimiento vienen
con `0` y **no hay que filtrarlos**: salteándolos, el gráfico mostraría marzo
pegado a junio como si fueran consecutivos.

Ojo con leer las dos series como si fueran la misma plata: lo cobrado en junio
puede ser de facturas de mayo. Que la línea de cobros vaya por debajo de la de
facturación no significa que falte cobrar exactamente esa diferencia — para eso
está `enLaCalle`.

---

## 2. El listado de clientes — ¿a quién miro?

Una pantalla de **triage**, no un informe. Cada renglón trae tres números
—cuánto compró, cuánto debe, hace cuánto que no aparece— para poder barrer la
lista de un vistazo. Todo lo demás está a un clic, en la ficha (§3).

```http
GET /api/admin/metricas/clientes?orden=deuda&q=perez&pagina=1&limite=20
```

| Query | Valores | Default | Qué hace |
|-------|---------|---------|----------|
| `q` | texto | — | Nombre, DNI o email. El DNI acepta puntos |
| `orden` | ver abajo | `facturado` | Por qué se ordena |
| `pagina` | ≥ 1 | `1` | |
| `limite` | 1–100 | `20` | |

**Solo aparecen los clientes que tienen al menos una factura.** Sin historial no
hay nada que medir.

```json
{
  "datos": [
    {
      "clienteId": "76112d24-cdc2-4c91-9edc-b01ff667c83b",
      "nombre": "Mariana Ledesma",
      "dni": "30999002",
      "seLeFia": true,
      "estado": "vencida",
      "totalFacturado": 554000,
      "deuda": 344000,
      "vencido": 282000,
      "facturas": 4,
      "ultimaCompra": "2026-07-30",
      "diasSinComprar": 22
    }
  ],
  "total": 14, "pagina": 1, "limite": 20, "paginas": 1
}
```

| Campo | Qué es |
|-------|--------|
| `nombre` | Ya resuelto: nombre, o usuario del email, o DNI. Nunca viene vacío |
| `estado` | `al_dia`, `pendiente`, `proxima_a_vencer` o `vencida`, por lo peor que tenga sin pagar. Es el mismo chip del tablero de facturación |
| `seLeFia` | En `false`, en el mostrador hay que cobrarle en el momento |
| `totalFacturado` | Todo lo que se le facturó, sin las anuladas |
| `deuda` · `vencido` | Lo que debe hoy, y de eso lo que ya se pasó de fecha (**el que va en rojo**) |
| `facturas` | Cuántas facturas vigentes tuvo, en toda su historia |
| `diasSinComprar` | **El número de fuga**: uno que compraba cada 15 días y hace 90 que no aparece se está yendo, aunque no deba un peso |

Un renglón se lee así:

```
Mariana Ledesma   $554.000 comprado   debe $344.000 ($282.000 vencido)   hace 22 días
```

### 2.1. ⚠️ Acá no va la tasa de cumplimiento

Y es a propósito. Cómo paga alguien **no se entiende con un número suelto**:
hace falta ver contra cuántas facturas se calcula y cuántos días se atrasa. Un
"cumple 70%" solo en una lista se lee mal — el que paga todo con veinte días de
atraso y el que directamente no paga terminan pareciendo el mismo cliente.

Está completo, con sus tres patas y las demoras, en la ficha (§3).

### 2.2. Los órdenes

Cada uno ya viene con la dirección en la que sirve. No hay `asc`/`desc`: un
"cumplimiento descendente" mostraría primero a los que pagan bien, que es justo
lo que nadie necesita mirar.

| `orden` | Primero aparece | Para qué |
|---------|-----------------|----------|
| `facturado` | el que más compró | quiénes son mis mejores clientes |
| `deuda` | el que más debe | dónde está mi plata |
| `cumplimiento` | **el que peor cumple** | a quién apretar o cortarle el fiado |
| `frecuencia` | el que compra más seguido | quiénes son mis habitués |
| `inactividad` | el que hace más que no compra | **a quiénes estoy perdiendo** |

Los que no se pueden medir van al final, nunca al principio: un cliente sin
ninguna factura vencida todavía no encabeza el ranking de malos pagadores.

**`cumplimiento` y `frecuencia` ordenan por números que el renglón no muestra**
—están en la ficha—. No es un descuido: sirven igual como herramienta
("mostrame los peores"), y el chip `estado` y `diasSinComprar` alcanzan para
entender por qué cada uno está donde está. Si querés una pantalla mínima,
ofrecé solo `facturado`, `deuda` e `inactividad`.

### 2.3. Esto no reemplaza al tablero de facturación

| | [`clientes-con-facturas`](./flujo_pagos.md) | `metricas/clientes` |
|---|---|---|
| Contesta | ¿a quién llamo **hoy**? | ¿qué clase de cliente es? |
| Ordena por | urgencia de la deuda | el criterio que elijas |
| Mira | lo que debe ahora | todo el historial |

Un cliente puede deber cero y ser malísimo —compró una vez hace un año— y otro
puede deber plata y ser el mejor que tenés. La deuda sola no lo dice.

---

## 3. La ficha del cliente — ¿qué clase de cliente es?

Es a lo que se llega tocando un renglón. Contesta dos cosas: **cómo paga**
(§3.4 a §3.6) y **qué se lleva** (§3.8).

### 3.1. La idea: cumplir no es pagar

Es lo único que hay que entender antes de maquetar esta pantalla. Una factura
que ya venció pudo terminar de tres maneras, y **solo una es cumplir**:

```
se pagó en fecha  ✔ cumplió
se pagó tarde     ✘ no cumplió — pero la plata entró
sigue impaga      ✘ no cumplió — y la plata no está
```

Los dos incumplimientos son problemas distintos, así que la ficha los muestra
por separado:

| Cliente | Cómo se ve | Qué hacer |
|---------|------------|-----------|
| Paga todo, siempre tarde | tasa baja, `sinPagar: 0` | te retrasa la plata, no te la hace perder → apretar la cobranza |
| No paga | tasa baja, `sinPagar` alto | te hace perder plata → cortarle el fiado |

Un `cumple 20%` suelto haría parecer iguales a esos dos. Por eso la tasa **nunca
va sola**.

### 3.2. El endpoint

```http
GET /api/admin/metricas/clientes/8be3bef8-6d66-452c-a8a8-9f8c347f4330
```

| Status | Cuándo |
|--------|--------|
| `400` | El id no es un UUID |
| `404` | No existe, o **no es un cliente**: la ficha de un administrador no existe |

**Un cliente que existe pero todavía no compró no es un 404.** La ficha viene
igual, con los contadores en cero, las fechas en `null`, la tasa en `null` y
`comoPaga: "sin_facturas"`.

### 3.3. La respuesta

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
    "exigibles": 5, "enFecha": 1, "tarde": 4, "sinPagar": 0,
    "demoraPromedio": 11.2,
    "demoraCuandoSeAtrasa": 20.5,
    "demoraMaxima": 49,
    "atrasoActual": null
  },

  "facturas": { "total": 6, "activas": 1, "vencidas": 0, "pagadas": 5, "anuladas": 0 },

  "plata": {
    "facturado": 633000, "cobrado": 575000,
    "deuda": 58000, "vencido": 0, "porVencer": 58000,
    "ticketPromedio": 105500,
    "vencimientoMasViejo": "2026-09-02", "diasDelMasViejo": 12
  },

  "reembolsos": { "hechos": 0, "montoDevuelto": 0, "pendientes": 0, "aReembolsar": 0 },

  "compras": {
    "primeraCompra": "2026-06-03", "ultimaCompra": "2026-08-19",
    "diasSinComprar": 2, "diasEntreCompras": 15,
    "comprasPorMes": 2.31, "antiguedadDias": 79
  },

  "especies": [
    {
      "especieId": "8d01…", "nombre": "Soda",
      "cantidad": 24, "monto": 21360, "facturas": 2, "participacion": 62.5,
      "ultimaCompra": "2026-08-03", "diasSinComprar": 18,
      "reciente": { "cantidad": 24, "monto": 21360 },
      "previo":   { "cantidad": 0,  "monto": 0 },
      "variacionCantidad": null, "variacionMonto": null,
      "tendencia": "nueva"
    }
  ]
}
```

Ese cliente es el caso de manual: **nunca dejó de pagar** (`sinPagar: 0`) y aun
así cumple **20%**, porque de cinco facturas exigibles pagó cuatro tarde, con
veinte días de atraso promedio y una que se fue a 49.

### 3.4. `comoPaga` — el catálogo, en una palabra

**Lo primero que hay que mirar.** Resume qué clase de pagador es, y con eso ya
sabés qué mostrar y qué no:

| `comoPaga` | Qué pasó | Qué escribir |
|------------|----------|--------------|
| `sin_facturas` | Todavía no compró nada | "Todavía no compró" |
| `sin_vencimientos` | Compró, pero no le venció ninguna | "Sin vencimientos todavía" |
| `nunca_pago` | Ya se le venció algo y **no pagó una sola factura** | "Nunca pagó" |
| `siempre_en_fecha` | Todo lo que pagó, lo pagó antes del vencimiento | "Siempre en fecha" |
| `se_atrasa` | Paga, pero alguna la pagó tarde | "Se atrasa N días" |

Viene resuelto del backend a propósito: armarlo en el front significa cruzar
tres números que pueden venir en `null` con dos contadores, y **equivocarse ahí
muestra al que nunca pagó como el mejor cliente del negocio** (§3.6).

⚠️ **`comoPaga` habla del historial, no de hoy.** Un cliente puede ser
`siempre_en_fecha` y tener una factura vencida ahora mismo: eso lo dice
`atrasoActual`, y las dos cosas van juntas en pantalla.

### 3.5. `tasa` — el número

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

`exigibles` es siempre `enFecha + tarde + sinPagar`. Las que **todavía están en
fecha no entran** ni arriba ni abajo, así que `exigibles` casi nunca es igual a
`facturas.total`: la diferencia son las que están corriendo.

⚠️ **`tasa` puede ser `null`** — "no tiene ninguna factura vencida todavía" — y un
`0%` ahí mostraría como el peor de todos al que compró la semana pasada.

Nunca la muestres sola. El renglón útil es el que muestra de qué está hecha:

```
Cumple 20%          (1 de 5 en fecha · 4 tarde · 0 sin pagar)
```

Con esa línea el administrador ya sabe que este no es un cliente que no paga: es
uno que paga tarde. Son dos conversaciones distintas.

### 3.6. Las demoras — cuánto tarda

Cuatro números, todos en días.

| Campo | Mira | Contesta |
|-------|------|----------|
| `demoraPromedio` | **todas** las que pagó | ¿en promedio, cómo paga? |
| `demoraCuandoSeAtrasa` | solo las que pagó **tarde** | cuando se atrasa, ¿cuánto? |
| `demoraMaxima` | el peor atraso que tuvo | ¿cuál fue el peor caso? |
| `atrasoActual` | **lo que NO pagó** | ¿cuántos días lleva colgado ahora? |

Los tres primeros miran el **historial**; el cuarto mira el **presente**: los
días que pasaron desde el vencimiento de su factura impaga más vieja.

**`demoraPromedio` puede ser negativo, y eso es bueno**: es el cliente que paga
antes de tiempo. Pero **ojo con leer solo ese**: mezcla las adelantadas con las
atrasadas, así que alguien que paga cinco antes y cinco después da cero. Por eso
está `demoraCuandoSeAtrasa`, que es el número del mostrador — *"sí, paga, pero
¿cuánto tengo que esperar?"*.

`atrasoActual` es el mismo día que `plata.diasDelMasViejo` **con el signo dado
vuelta** (regla 6). El día del vencimiento todavía no es atraso.

#### ⚠️ `null` en las demoras NO es "siempre en fecha"

Es el error más fácil de cometer en esta pantalla, y hace que **el peor cliente
posible se vea impecable**. Las tres primeras miran lo que ya pagó, así que el
que **nunca pagó nada** las tiene todas en `null`:

```json
{
  "comoPaga": "nunca_pago",
  "tasa": 0, "exigibles": 1, "enFecha": 0, "tarde": 0, "sinPagar": 1,
  "demoraPromedio": null, "demoraCuandoSeAtrasa": null, "demoraMaxima": null,
  "atrasoActual": 45
}
```

Ese cliente debe una factura que venció hace 45 días y no pagó **nunca** nada.

| Campo | `null` significa |
|-------|------------------|
| `demoraPromedio` | todavía **no pagó ninguna** factura |
| `demoraCuandoSeAtrasa` · `demoraMaxima` | **nunca pagó tarde** — que incluye "nunca pagó" |
| `atrasoActual` | no tiene **ninguna vencida** hoy |

**No deduzcas el caso de los `null`: usá `comoPaga`.** Para eso está.

```jsx
const HISTORIAL = {
  sin_facturas:     () => 'Todavía no compró',
  sin_vencimientos: () => 'Sin vencimientos todavía',
  nunca_pago:       () => 'Nunca pagó una factura',
  siempre_en_fecha: () => 'Siempre en fecha',
  se_atrasa:        (c) => `Se atrasa ${c.demoraCuandoSeAtrasa} días`,
};

{HISTORIAL[cumplimiento.comoPaga](cumplimiento)}

{cumplimiento.atrasoActual != null &&
  `Debe hace ${cumplimiento.atrasoActual} días`}
```

En la rama `se_atrasa` —y **solo** en esa— `demoraCuandoSeAtrasa` es un número
seguro. Los dos renglones conviven: un historial impecable y un atraso en curso
son cosas distintas.

#### De dónde sale un `NaN`

**Del front, siempre.** JSON no tiene `NaN`: si el backend produjera uno, en el
cuerpo viajaría como `null`. Las tres causas, en orden:

1. **Aritmética sobre un `null`** (`Math.round`, `.toFixed`, dividir). Chequeá
   **antes** de tocar el número.
2. **El campo todavía no existe en la respuesta**: si el servidor no se
   reinició, llega `undefined`, y `=== null` no lo atrapa. Usá `== null` o `??`.
3. **Parsear un importe ya parseado**: todo viene como `number`, no como texto.

### 3.7. `facturas`, `plata`, `reembolsos` y `compras`

**`facturas`** — `total` es `activas + pagadas`. **`activas`** son las que
todavía deben algo, vencidas o no: las abiertas en el mostrador. Las `anuladas`
van aparte y no cuentan para nada. Un cliente con 10 activas y 0 vencidas está
perfecto; el que preocupa es el que tiene `vencidas > 0`.

**`plata`** — `deuda` es `facturado − cobrado`, y se parte en `vencido` (rojo) y
`porVencer` (plata en camino). `ticketPromedio` es lo que gasta por compra.
`diasDelMasViejo` usa el signo de la regla 6 y sale del mismo dato que el chip
`estado`, así que los dos siempre dicen lo mismo.

**`reembolsos`** — plata que el cliente pagó en facturas que después se
anularon. `hechos`/`montoDevuelto` es lo ya devuelto; `pendientes`/`aReembolsar`
lo que falta. **Si `aReembolsar` es mayor a cero, mostralo en alerta** y
separado de la deuda, con otro color: va justo para el lado contrario, no lo
restes.

**`compras`** — cada cuánto vuelve.

| Es `null` cuando |
|------------------|
| `diasEntreCompras` → tiene una sola factura: no hay intervalo que promediar |
| `comprasPorMes` → es cliente hace menos de 30 días |
| todos los demás → todavía no compró nada |

Lo de `comprasPorMes` merece la aclaración: tres compras en cuatro días **no**
son "22 compras por mes"; es una división sin datos suficientes y el backend
prefiere no contestar.

### 3.8. `especies` — qué se lleva

La pregunta del mostrador: *"¿qué le vendo a este?"*. Y la que avisa que algo
cambió **antes de que se note en la deuda**: el que dejó de llevar vestidos y
ahora solo lleva arreglos se está yendo, aunque siga pagando todo en fecha.

Sale de las especies (§7) de todos los renglones de todas sus facturas, **de
mayor a menor plata**. Vacío si todavía no compró nada.

| Campo | Qué es |
|-------|--------|
| `cantidad` · `monto` · `facturas` | **Desde siempre**: unidades, plata y en cuántas facturas suyas apareció |
| `participacion` | Qué parte de todo lo que se le facturó se fue en esta especie. **Las de la lista suman 100** |
| `ultimaCompra` · `diasSinComprar` | La última vez que se llevó **esta especie** |
| `reciente` · `previo` | Los últimos 90 días, y los 90 anteriores |
| `variacionCantidad` · `variacionMonto` | Cuánto cambió entre las dos ventanas. `null` si antes no llevaba ninguna |
| `tendencia` | `nueva`, `sube`, `estable`, `baja` o `parada` |

**La suma de los `monto` es exactamente `plata.facturado`.**

⚠️ **`especies[].diasSinComprar` no es `compras.diasSinComprar`.** El primero es
"hace cuánto que no lleva **esto**"; el segundo, "hace cuánto que no compra
nada". Un cliente puede haber comprado ayer y hace ocho meses que no lleva
vestidos: para el primero está activo, para el segundo cambió lo que compra.

**La ventana va en días, no en meses: 90 contra 90.** Es la única diferencia con
la tendencia del negocio (§5) y no es cosmética: un negocio factura todos los
días, pero un cliente compra cada quince o veinte, así que "agosto contra julio"
para una sola persona es comparar dos compras contra tres y llamarlo tendencia.
Además, dos ventanas iguales sacan del medio el problema del mes en curso.

Los chips, leídos para un cliente:

| `tendencia` | Qué pasó con este cliente |
|-------------|---------------------------|
| `nueva` | **Empezó a llevar esto.** Nunca lo había comprado |
| `sube` | Lleva más que en los 90 días anteriores |
| `estable` | Se movió menos de un 10%: compra lo mismo de siempre |
| `baja` | Lleva menos que antes |
| `parada` | **Hace 90 días que no lleva esto**, y antes sí |

`parada` es el aviso temprano: un cliente que dejó de llevar la especie que más
le vendías sigue apareciendo al día en el tablero y sin deuda en su ficha. Y
`nueva` no se confunde con "volvió": el que compró vestidos hace dos años y
volvió ayer sale como `sube`.

### 3.9. `cliente` y `estado`: dos cosas que se confunden

| Campo | Qué dice |
|-------|----------|
| `cliente.estado` | Si la **cuenta de la app** puede operar: `bloqueado` mientras no tenga DNI |
| `estado` (el de arriba) | Cómo está su **cuenta corriente**: `al_dia`, `pendiente`, `proxima_a_vencer` o `vencida` |

`bloqueado` **no frena la facturación**: a ese cliente se le factura y se le
cobra igual, porque el bloqueo es de la app y no del mostrador.

`telefono` es `null` hasta que la persona lo cargue —nadie está obligado— y **el
administrador no lo edita**. Y `seLeFia` con `motivoSinFiado` es la marca del
fiado: en `false`, la factura que se le emita **vence el mismo día**; si está
cortado, el motivo tiene que verse.

### 3.10. Esto no reemplaza a la cuenta corriente

| | [`GET /admin/clientes/:id/cuenta`](./flujo_pagos.md) | esta ficha |
|---|---|---|
| Trae | sus facturas, una por una | la conclusión de todas |
| Contesta | ¿de qué está hecha su deuda? | ¿qué clase de cliente es? |
| Sirve para | ir a cobrar una factura puntual | decidir si le seguís fiando |

Conviene enlazarlas con un botón "Ver su cuenta corriente →".

---

## 4. Los tickets — ¿qué pasó en julio?

El tablero (§1) dice **cómo va el negocio hoy**; el ticket dice **qué pasó en
julio**: todo lo que se facturó, todo lo que entró, con cuánta deuda cerró el
mes, quién compró y qué se vendió, en una sola respuesta.

Son dos pantallas encadenadas: **el listado de meses** (el índice) y **el
ticket**, que se genera al tocar un mes.

### 4.1. ⚠️ Acá la deuda es la del cierre, no la de hoy

Es exactamente al revés que en el tablero, y es la razón de ser del ticket.

| | Tablero (§1) | Ticket (§4) |
|---|---|---|
| La deuda que muestra | la de **hoy** | la que había **el último día del mes** |
| Elegir julio muestra | lo facturado en julio + la deuda de hoy | julio entero, como estaba en julio |

Una factura de junio que se cobró en septiembre **figura impaga en el ticket de
julio**, porque en julio lo estaba. Esa era la plata que había en la calle
entonces, y es lo único que hace que el ticket de julio siga contando julio y no
se vaya moviendo con cada cobro nuevo.

### 4.2. El listado de meses

```http
GET /api/admin/metricas/tickets
```

Sin parámetros y **sin paginado**: son doce por año, y cortarlos en páginas
obligaría a pedir de nuevo para dibujar un gráfico de tres años.

```json
{
  "hoy": "2026-08-21",
  "total": 4,
  "meses": [
    { "mes": "2026-08", "cerrado": false, "conMovimiento": true,
      "facturado": 221060, "facturas": 5, "cobrado": 59622.25, "cobros": 5,
      "deudaAlCierre": 1348655.75 },
    { "mes": "2026-07", "cerrado": true, "conMovimiento": true,
      "facturado": 367407.5, "facturas": 13, "cobrado": 22450, "cobros": 1,
      "deudaAlCierre": 1187218 }
  ]
}
```

**Del más nuevo al más viejo**, desde el primer mes con movimiento hasta el que
corre.

| Campo | Qué es |
|-------|--------|
| `cerrado` | El mes ya terminó. En `false` el ticket va a ser parcial |
| `conMovimiento` | Hubo al menos una factura o un cobro |
| `deudaAlCierre` | La plata que quedaba en la calle al terminar ese mes |

**Los meses vacíos vienen igual, con ceros.** Marcalos en gris pero no los
filtres — y ojo, un mes sin movimiento puede tener `deudaAlCierre` alta: es la
deuda de arrastre.

### 4.3. El ticket

```http
GET /api/admin/metricas/tickets/2026-07
```

| Caso | `message` |
|------|-----------|
| No es un mes | `El mes va como 2026-08.` |
| Un mes que todavía no pasó | `De 2026-09 todavía no hay nada que contar: es un mes que no pasó.` |

```json
{
  "mes": "2026-07", "desde": "2026-07-01", "hasta": "2026-07-31",
  "cerrado": true,
  "generadoEl": "2026-08-21",

  "facturacion": {
    "facturado": 367407.5, "facturas": 13, "ticketPromedio": 28262.12,
    "clientes": 10, "facturaMasAlta": 89000,
    "anuladas": 1, "montoAnulado": 73002.5
  },

  "cobranza": {
    "cobrado": 22450, "cobros": 1, "clientes": 1, "cobroPromedio": 22450,
    "deEsteMes": 0, "deMesesAnteriores": 22450,
    "enTermino": 22450, "fueraDeTermino": 0,
    "cobradoEnAnuladas": 73002.5
  },

  "alCierre": {
    "al": "2026-07-31",
    "deuda": 1187218, "vencido": 819810.5, "porVencer": 367407.5,
    "facturasImpagas": 30, "facturasVencidas": 17,
    "clientesConDeuda": 11, "morosos": 4,
    "vencimientoMasViejo": "2026-06-05", "diasDelMasViejo": -56,
    "variacionEnElMes": 344957.5
  },

  "clientes": { "registrados": 0, "nuevos": 7, "compraron": 10, "pagaron": 1 },

  "comparacion": {
    "mes": "2026-06", "facturado": 608760.5, "cobrado": 362000,
    "variacionFacturado": -39.6, "variacionCobrado": -93.8
  },

  "topClientes": [
    { "clienteId": "7611…", "nombre": "Mariana Ledesma", "dni": "30999002",
      "facturado": 97000, "facturas": 2, "cobrado": 0 }
  ],

  "topProductos": [
    { "producto": "Vestido de fiesta largo", "cantidad": 1, "monto": 89000, "facturas": 1 }
  ],

  "topEspecies": [
    { "especieId": "24a1…", "nombre": "Vestidos", "cantidad": 4,
      "monto": 214000, "facturas": 4, "clientes": 3 }
  ]
}
```

`topClientes` trae hasta 5; `topProductos` y `topEspecies`, hasta 10.

### 4.4. Qué significa cada bloque

**`facturacion` — lo que se emitió**, por fecha de emisión y sin las anuladas.
`ticketPromedio` y `facturaMasAlta` son `null` si no se emitió ninguna.
**`anuladas` y `montoAnulado` no están sumadas en `facturado`**: son el error del
mes, no su facturación. Si `anuladas` es cero, no muestres el renglón.

**`cobranza` — la plata que entró**, por la fecha del cobro. La misma plata
viene partida de dos maneras y **cada partición suma exactamente `cobrado`**:

| Partición | Contesta |
|-----------|----------|
| `deEsteMes` + `deMesesAnteriores` | ¿estoy cobrando al día o viviendo de recuperar lo viejo? |
| `enTermino` + `fueraDeTermino` | de lo que entró, ¿cuánto llegó tarde? |

En el ejemplo, los $22.450 de julio son **todos** de facturas anteriores. Un mes
así se factura mucho y se cobra viejo, y es justo lo que el número muestra.
**`cobradoEnAnuladas` no está en `cobrado`**: entró, pero hay que devolverla.

**`alCierre` — cómo cerró la calle.** Los campos de `enLaCalle` (§1) más tres:

- **`al`** — el día del corte. En un mes cerrado es el último; en el mes en curso
  es **hoy** (§4.5). Escribilo en el bloque: es lo que evita que se lea como si
  fuera la deuda de hoy.
- **`clientesConDeuda`** y **`morosos`** a esa fecha.
- **`variacionEnElMes`** — cuánto **creció** la deuda durante el mes:
  `facturado − cobrado`. Negativo es que bajó. Pintalo como un delta con flecha,
  no como un total.

**`clientes` — la gente que se movió.**

| Campo | Qué es |
|-------|--------|
| `registrados` | Cuentas de cliente creadas en el mes, hayan comprado o no |
| `nuevos` | Los que **compraron por primera vez** |
| `compraron` · `pagaron` | Cuántos distintos recibieron una factura, y cuántos pagaron algo |

`nuevos` no es `registrados`: alguien que se registró hace un año y recién ahora
recibe su primera factura es **nuevo para el negocio**.

**`comparacion` — contra el mes anterior**, en porcentaje con un decimal.
⚠️ Puede venir `null` si el mes anterior fue cero: de cero a un millón no es "un
100% más". Mostralo como "sin comparación".

**`topClientes`, `topProductos` y `topEspecies`.** En `topClientes`, el
`cobrado` puede ser de facturas viejas: puede aparecer uno con `facturado: 0` y
`cobrado` alto — no compró nada, pagó lo que debía.

Los dos rankings de mercadería **no son lo mismo**:

| | `topProductos` | `topEspecies` |
|---|---|---|
| Agrupa por | el texto que tipeó el mostrador | la especie del renglón (§7) |
| Contesta | ¿qué vendí exactamente? | ¿qué **tipo** de cosa vendí? |
| Se puede comparar entre meses | ❌ no | ✅ sí |

`topProductos` agrupa ignorando mayúsculas y espacios, pero "12 Coca 500ml" y
"Coca 500" son dos líneas y el mes que viene pueden ser tres. `topEspecies` es
el que se puede leer de un mes a otro, y el único que trae `clientes` —cabezas
distintas, no facturas—. La comparación mes a mes está en §5, y el acumulado de
todo el período en §6.

### 4.5. El mes en curso

Viene con `cerrado: false` y hay que decirlo en pantalla: comparar veinte días
de agosto contra julio entero es comparar cualquier cosa.

Además, **en el mes en curso el corte de `alCierre` es hoy y no el 31**
(`"al": "2026-08-21"`): proyectar la deuda al último día estando a 21 mostraría
como vencidas facturas que todavía están en fecha. En el mes en curso `alCierre`
coincide con el `enLaCalle` del tablero; en cualquier mes cerrado, no tiene por
qué — y ahí está la gracia.

### 4.6. Un ticket no se guarda: se calcula

No hay tabla de tickets ni un cierre que alguien tenga que "ejecutar" a fin de
mes. La consecuencia hay que tenerla clara: **un mes cerrado puede cambiar**. Si
mañana se anula una factura de julio, o se anota un cobro con fecha del 30 de
julio, el ticket de julio va a decir otra cosa. Es a propósito —muestra lo que
**hoy se sabe** de julio— y por eso viaja `generadoEl`: si el ticket se imprime
o se exporta, esa fecha va en el pie. No lo caches por más de una sesión.

---

## 5. La tendencia de compra — ¿qué se llevan?

La única pantalla que **no mira la plata sino la mercadería**. El tablero dice
cuánto se facturó; esta dice *"este mes se llevaron 100 zapatillas y 10 remeras,
y el mes pasado eran 60 y 40"*. Dos meses de $500.000 pueden ser el mismo
negocio o dos negocios distintos, y la facturación sola no lo puede decir.

Sale del catálogo de especies (§7): sin una etiqueta por renglón habría que
agrupar por el texto del producto, que el mostrador escribe distinto cada vez.

```http
GET /api/admin/metricas/tendencia
GET /api/admin/metricas/tendencia?mes=2026-07&meses=6&orden=caida
```

**El default es un año**, y no es un capricho: en un negocio estacional, seis
meses mirados desde agosto son seis meses de caída sin un solo mes de verano
contra el cual leerlos. Con doce, la temporada alta y la baja entran siempre en
la misma pantalla.

| Query | Valores | Default | Qué hace |
|-------|---------|---------|----------|
| `mes` | `AAAA-MM` | el mes en curso | El período que se mira |
| `meses` | 2 a 24 | `12` | El largo de la serie **y de la ventana** |
| `orden` | `monto`, `cantidad`, `crecimiento`, `caida` | `monto` | Por qué se ordena |

### 5.1. La respuesta

```json
{
  "hoy": "2026-08-21",
  "mes": "2026-08", "desde": "2026-08-01", "hasta": "2026-08-31",
  "cerrado": false,
  "mesAnterior": "2026-07",
  "meses": ["2026-05", "2026-06", "2026-07", "2026-08"],

  "totales": { "cantidad": 49, "monto": 239740, "especies": 5, "facturas": 6, "clientes": 4 },

  "especies": [
    {
      "especieId": "8d01…", "nombre": "Soda",
      "cantidad": 24, "monto": 21360, "facturas": 1, "clientes": 1,
      "participacion": 8.9, "precioPromedio": 890,
      "anterior": { "cantidad": 12, "monto": 10680 },
      "variacionCantidad": 100, "variacionMonto": 100,
      "tendencia": "sube",
      "serie": [
        { "mes": "2026-05", "cantidad": 0,  "monto": 0 },
        { "mes": "2026-06", "cantidad": 0,  "monto": 0 },
        { "mes": "2026-07", "cantidad": 12, "monto": 10680 },
        { "mes": "2026-08", "cantidad": 24, "monto": 21360 }
      ]
    },
    {
      "especieId": "fd2e…", "nombre": "Alquiler",
      "cantidad": 0, "monto": 0, "facturas": 0, "clientes": 0,
      "participacion": 0, "precioPromedio": null,
      "anterior": { "cantidad": 2, "monto": 25000 },
      "variacionCantidad": -100, "variacionMonto": -100,
      "tendencia": "parada",
      "serie": [
        { "mes": "2026-05", "cantidad": 0, "monto": 0 },
        { "mes": "2026-06", "cantidad": 0, "monto": 0 },
        { "mes": "2026-07", "cantidad": 2, "monto": 25000 },
        { "mes": "2026-08", "cantidad": 0, "monto": 0 }
      ]
    }
  ]
}
```

**`meses` es el eje del gráfico** y todas las `serie` vienen con exactamente esos
meses, en ese orden, rellenadas con `0`. No las filtres: el mes en cero es
justamente el que dibuja la caída.

### 5.2. El chip: qué le está pasando a cada especie

**Se decide por unidades, no por plata.** Así se piensa la mercadería: "se
llevaron menos zapatillas" es un dato aunque hayan sido más caras. La variación
de plata está al lado, para leer las dos cosas juntas.

| `tendencia` | Qué pasó | Qué mirar |
|-------------|----------|-----------|
| `nueva` | No se vendió en ningún mes anterior de la ventana y este sí | arrancó, o volvió |
| `sube` | Creció más de un 10% contra el mes anterior | |
| `estable` | Se movió menos de un 10% | es ruido, no una tendencia |
| `baja` | Cayó más de un 10% | |
| `parada` | **Este mes no se vendió ninguna** | la que hay que mirar |

**`parada` gana sobre todo lo demás.** Una especie que se frenó tiene
`variacionCantidad: -100`, y mostrarla como "bajó un 100%" se lee como una caída
fuerte cuando lo que pasó es otra cosa: dejó de moverse.

### 5.3. ⚠️ La lista trae también lo que no se vendió

`especies` no es "lo que se vendió este mes": es **todo lo que se movió en la
ventana**, con los números de este mes. Una especie que se vendía todos los
meses y este no aparece viene igual, en cero y con `tendencia: "parada"`.

> *"Dejaron de llevar remeras"* es exactamente el dato que esta pantalla tiene
> que dar, y una lista que solo muestra lo que se vendió no lo puede decir nunca.

Si querés el ranking puro del mes, filtrá por `cantidad > 0` o usá el
`topEspecies` del ticket (§4.3). Y si lo que querés es el acumulado de todo el
período en vez de un mes, esa es la pantalla del §6.

### 5.4. Los números de cada especie

| Campo | Qué es |
|-------|--------|
| `cantidad` | **Cuántas unidades salieron.** Las 100 zapatillas |
| `monto` | Cuánta plata fue |
| `facturas` | En cuántas facturas apareció |
| `clientes` | **Cuántos clientes distintos se la llevaron** — cabezas, no facturas |
| `participacion` | Qué parte del monto del mes se llevó, de 0 a 100 |
| `precioPromedio` | `monto / cantidad`. `null` si este mes no se vendió ninguna |

**`clientes` es el que separa dos negocios que se ven iguales**: una especie que
se llevaron veinte personas y otra que se llevó una sola en veinte facturas
suman lo mismo y no son lo mismo. Si un solo cliente sostiene una especie, el
día que se vaya se va la especie entera.

**`precioPromedio` no es el precio de lista**: ahí entran juntas las remeras de
$8.000 y las de $20.000. Sirve para leer un cambio —"vendí las mismas 100
remeras pero entró un 30% menos"—, no para saber cuánto sale una.

⚠️ Las dos variaciones pueden venir `null` si el mes anterior fue cero: para ese
caso está el chip `nueva`.

### 5.5. Los órdenes

| `orden` | Primero aparece | Para qué |
|---------|-----------------|----------|
| `monto` | la que más plata dejó | de qué vive el negocio |
| `cantidad` | la que más unidades movió | qué es lo que más sale por la puerta |
| `crecimiento` | la que más subió | **qué empujar** |
| `caida` | la que más se derrumbó | **qué se está apagando** |

Los que no se pueden medir van **al final**: una especie `nueva` no encabeza el
ranking de las que más crecieron, no tiene con qué comparar.

---

## 6. La métrica global de productos — ¿qué se vende y qué no?

La tercera pantalla que mira mercadería, y la que contesta la pregunta más
simple de las tres:

| Pantalla | Contesta |
|----------|----------|
| `topEspecies` del ticket (§4.4) | qué se vendió **en julio** |
| La tendencia (§5) | cómo viene **mes a mes** |
| **Esta** | de **todo lo que vendí**, qué manda |

La diferencia no es cosmética. Las otras dos están ancladas al calendario, así
que una especie que vende mucho **pero cada tres meses** se ve chica en las dos.
Acá se ve entera.

```http
GET /api/admin/metricas/productos
GET /api/admin/metricas/productos?desde=2025-12&hasta=2026-02&orden=olvidadas
```

| Query | Valores | Default | Qué hace |
|-------|---------|---------|----------|
| `desde` | `AAAA-MM` | la primera venta | Desde qué mes, **incluido** |
| `hasta` | `AAAA-MM` | hoy | Hasta qué mes, **incluido**. Nunca pasa de hoy |
| `orden` | `monto`, `cantidad`, `clientes`, `crecimiento`, `caida`, `olvidadas` | `monto` | Por qué se ordena |

Un período que termina antes de empezar es `400`.

### 6.1. ⚠️ Trae el catálogo completo, incluso lo que no se vendió nunca

Es la decisión que la hace útil, y la que hay que tener en cuenta al maquetar:
la consulta arranca en **el catálogo**, no en las ventas.

> Una lista de "lo más vendido" que esconde lo que no se vende contesta media
> pregunta. **El catálogo muerto** —lo que se cargó y nadie compró— es justamente
> lo que hay que dejar de comprarle al proveedor, y no aparece en ninguna otra
> pantalla.

Esas especies vienen con todo en cero, `diasSinVenderse: null` y
`tendencia: "parada"`. Con `orden=olvidadas` van primeras; con cualquier otro,
últimas.

### 6.2. La respuesta

```json
{
  "hoy": "2026-08-21",
  "desde": "2025-09",
  "hasta": "2026-08",
  "meses": 12,

  "totales": {
    "cantidad": 2378,
    "monto": 7610800,
    "facturas": 174,
    "clientes": 15,
    "especies": 12,
    "especiesConVenta": 11,
    "productos": 19
  },

  "concentracion": {
    "primera": 37.4,
    "tresPrimeras": 72.7,
    "paraLaMitad": 2,
    "sinVenta": 1
  },

  "especies": [
    {
      "especieId": "dd14…",
      "nombre": "Agua",
      "puesto": 1,

      "cantidad": 921,
      "monto": 2843250,
      "facturas": 112,
      "clientes": 14,
      "productosDistintos": 3,

      "participacion": 37.4,
      "participacionAcumulada": 37.4,
      "precioPromedio": 3087.13,

      "primeraVenta": "2025-09-11",
      "ultimaVenta": "2026-08-20",
      "diasSinVenderse": 1,
      "mesesConVenta": 12,
      "mejorMes": { "mes": "2026-07", "cantidad": 116, "monto": 394850 },
      "estacionalidad": 1.5,

      "reciente": { "cantidad": 307, "monto": 1081200 },
      "previo":   { "cantidad": 230, "monto": 739600 },
      "variacionCantidad": 33.5,
      "variacionMonto": 46.2,
      "tendencia": "sube",

      "productos": [
        { "producto": "Bidón 20L", "cantidad": 625, "monto": 2071000, "facturas": 69, "participacion": 72.8 },
        { "producto": "Bidón 12L", "cantidad": 285, "monto": 642350, "facturas": 40, "participacion": 22.6 }
      ]
    }
  ]
}
```

`desde` y `hasta` son el período **efectivo**: sin filtro, `desde` es el mes de
la primera venta del negocio —no un `null`— y `hasta` nunca pasa de hoy, aunque
se pida un mes que todavía no terminó.

### 6.3. `concentracion` — de cuántas cosas vive el negocio

Es la lectura que nadie hace a mano y la que más rápido cambia una decisión de
compra.

| Campo | Qué dice |
|-------|----------|
| `primera` | Qué parte del monto se lleva la especie más grande |
| `tresPrimeras` | Y las tres más grandes juntas |
| `paraLaMitad` | **Cuántas especies hacen falta para llegar a la mitad de la facturación** |
| `sinVenta` | Cuántas especies del catálogo no se vendieron en el período |

`paraLaMitad: 2` quiere decir que **dos etiquetas hacen la mitad del negocio**.
Un `1` es un negocio de un solo producto, con todo lo que eso implica el día que
ese producto falte. Es `null` si no se vendió nada.

### 6.4. Los números de cada especie

| Campo | Qué es |
|-------|--------|
| `puesto` | Su lugar en el ranking, **según el orden que pediste** |
| `cantidad` · `monto` | Unidades vendidas y plata que dejaron, en todo el período |
| `facturas` · `clientes` | En cuántas facturas apareció y a cuánta gente distinta |
| `productosDistintos` | Cuántos productos concretos se facturaron con esa etiqueta |
| `participacion` | Qué parte del monto del período se llevó, de 0 a 100 |
| `participacionAcumulada` | **El Pareto**: la suma de las participaciones hasta este renglón |
| `precioPromedio` | `monto / cantidad`. `null` si no se vendió ninguna |
| `primeraVenta` · `ultimaVenta` | `AAAA-MM-DD`, o `null` si nunca se vendió |
| `diasSinVenderse` | Hace cuánto que no se vende. **`null` es "nunca se vendió"**, no "recién" |
| `mesesConVenta` | En cuántos meses del período tuvo al menos una venta |
| `mejorMes` | Su mejor mes en unidades, con la plata de ese mes |
| `estacionalidad` | Cuántas veces lo de un mes promedio vendió en su mejor mes |
| `reciente` · `previo` | Los últimos 90 días del período, y los 90 anteriores |
| `tendencia` | `nueva`, `sube`, `estable`, `baja` o `parada` — el mismo catálogo de §5.2 |
| `productos` | El detalle: hasta 5 productos concretos, con su parte **dentro de la especie** |

**`participacionAcumulada` solo significa algo con el orden por defecto.** Con
`monto` la lista va de mayor a menor y el acumulado dibuja la curva de Pareto —
"con tres renglones llego al 80%". Con los otros órdenes la lista no está
ordenada por plata y el acumulado no dice nada: no lo grafiques.

**`estacionalidad` es el número de una línea para "¿esto se vende todo el año o
vive de una temporada?"**. Un `1.2` es una especie pareja; un `8.7`, una que
vende en enero y nada más. Se calcula contra el promedio de **todos** los meses
del período, no solo los que tuvieron venta: los meses en cero son justamente lo
que hace que una especie de temporada se note.

**`productos` es el nivel que la especie tapa.** *"Vendo mucha agua"* está bien,
pero adentro puede ser todo bidones de 20 litros y ni uno de 12 — y eso cambia
qué se le compra al proveedor. Los nombres son los que tipeó el mostrador,
agrupados ignorando mayúsculas y espacios.

### 6.5. Los órdenes

| `orden` | Primero aparece | Para qué |
|---------|-----------------|----------|
| `monto` | la que más plata dejó | de qué vive el negocio |
| `cantidad` | la que más unidades movió | qué es lo que más sale por la puerta |
| `clientes` | la que le compra más gente | qué es transversal y qué lo sostiene uno solo |
| `crecimiento` | la que más subió | qué empujar |
| `caida` | la que más se derrumbó | qué se está apagando |
| `olvidadas` | **la que hace más que no se vende** | qué dejar de comprar |

`clientes` merece una mirada aparte: una especie que se llevan catorce personas
y otra que se lleva una sola pueden facturar lo mismo y no son lo mismo. Si un
solo cliente sostiene una especie, el día que se vaya se va la especie entera.

Los que no se pueden medir van **al final** —una especie que nunca se vendió no
encabeza el ranking de las que más cayeron—, salvo en `olvidadas`, donde van
primeras a propósito: son el caso extremo de lo que ese orden busca.

### 6.6. Acotar el período cambia la película

Es el uso menos obvio y el más interesante. Con el mismo endpoint, pedir el
verano y pedir el año dan dos rankings distintos:

```
todo el año           el verano (2025-12 a 2026-02)
1  Agua      37,4%    1  Gaseosa   37,9%
2  Gaseosa   23,9%    2  Agua      28,2%
3  Soda      11,5%    3  Soda      11,7%
```

Ese cambio de puesto **es** el dato: en verano el negocio es otro. Poner un
selector de período arriba de la lista vale más que cualquier gráfico.

---

## 7. El catálogo de especies

Una **especie** es la etiqueta con la que se agrupa lo que se vende.

```
12 Coca de 500ml     → especie: Gaseosa
12 Quilmes de 1lt    → especie: Cerveza
Envío a domicilio    → especie: Envío
```

El producto lo escribe el mostrador y cambia de forma cada vez —"12 Coca 500ml",
"Coca 500", "coca-cola 500cc"—, así que sumar por ese texto no dice nada. La
especie sí: es lo que hace posibles el `topEspecies` del ticket (§4.4) y toda la
pantalla de tendencia (§5).

**El catálogo lo escribe el administrador y arranca vacío**: las especies de una
distribuidora de agua no son las de una tienda de ropa.

### 7.1. El catálogo

```http
GET /api/admin/especies
GET /api/admin/especies?q=gase
```

```json
{
  "total": 4,
  "datos": [
    { "id": "dd14…", "nombre": "Agua",    "usos": 7, "createdAt": "2026-08-21T14:18:01.594Z" },
    { "id": "24a1…", "nombre": "Cerveza", "usos": 0, "createdAt": "2026-08-21T14:21:00.956Z" }
  ]
}
```

**`usos`** es en cuántos renglones de factura se usó: dice si la especie sirve o
quedó de un experimento, y es lo que decide si se puede borrar.

**Alfabético y sin paginado.** Es lo que llena el selector de la factura: traelo
una vez al abrir el formulario y filtrá en memoria. `?q=` filtra **sin
distinguir mayúsculas ni tildes**: `limon` encuentra a `Limón`.

### 7.2. Crear, renombrar y borrar

```http
POST   /api/admin/especies        { "nombre": "Gaseosa" }   → 201
PATCH  /api/admin/especies/:id    { "nombre": "Gaseosas" }  → 200
DELETE /api/admin/especies/:id                              → 204
```

| Error | Cuándo |
|-------|--------|
| `400` | Menos de 2 letras, más de 60, o vacío |
| `409` (crear/renombrar) | Ya existe una que se escribe igual una vez normalizada |
| `404` | No existe |
| `409` (borrar) | Está en uso: `"Gaseosa" está en 7 renglones de factura, así que no se puede borrar. Si el nombre está mal, cambiáselo.` |

⚠️ **Renombrar cambia también las facturas viejas**, y es a propósito: la especie
es una clasificación, no lo que se cobró, y corregir "gaseoza" tiene que
arreglar los renglones que ya se escribieron con el error. Cambiarle solo las
mayúsculas a la misma especie —"gaseosa" → "Gaseosa"— nunca es un choque consigo
misma.

**Borrar es solo para la que no se usó nunca.** Mostrá el botón deshabilitado
cuando `usos > 0`: el dato ya viene en el listado.

### 7.3. La especie en el alta de la factura

> ⚠️ **Esto rompe contrato con lo que el front ya tenía.** El resto del alta de
> factura —fechas, importes, errores— está en
> [`flujo_pagos.md`](./flujo_pagos.md#7-pantalla-4--nueva-factura).

Cada renglón del body manda **una** de estas dos. Nunca las dos, nunca ninguna:

```json
{
  "fechaFin": "2026-09-17",
  "items": [
    {
      "producto": "12 Coca de 500ml", "cantidad": 12, "precioUnitario": 1200,
      "especieId": "81c9a47e-6b26-425a-9b63-97c7d7bca19e"
    },
    {
      "producto": "12 Quilmes de 1lt", "cantidad": 12, "precioUnitario": 2100,
      "especie": "Cerveza"
    }
  ]
}
```

| Campo | Cuándo se usa |
|-------|---------------|
| `especieId` | La especie ya está en el catálogo y se eligió del selector. **Es el caso normal** |
| `especie` | La que hace falta no existe todavía: se escribe el nombre y se crea junto con la factura |

**El body va completo y el backend hace el resto.** No hace falta un `POST` a
`/especies` antes: la especie nueva se crea en la **misma transacción** que la
factura, así que si la factura falla, la especie no queda dando vueltas.

Ese segundo camino es lo que hace vivible la regla: obligar a poner especie y a
la vez obligar a salir de la pantalla a crearla terminaría en un catálogo con
una sola especie llamada "varios".

**Los errores del renglón**, todos `400`:

| Qué mandaste | `message` |
|--------------|-----------|
| Ninguna de las dos | `Cada renglón necesita una especie: mandá especieId si ya está en el catálogo, o especie con el nombre para crearla.` |
| Las dos | `Cada renglón lleva una sola especie: o la elegís del catálogo (especieId) o la creás por nombre (especie), no las dos.` |
| Un `especieId` que no es un uuid | `La especie elegida no es válida…` |
| Un `especieId` de una especie borrada | `Una de las especies del detalle ya no está en el catálogo. Recargá la lista de especies y volvé a intentar.` |

Y en la **respuesta**, cada item trae su especie:

```json
"items": [
  { "id": "9db8…", "producto": "Bidón 20L", "cantidad": 3,
    "precioUnitario": 19.99, "subtotal": 59.97,
    "especie": { "id": "dd14…", "nombre": "Agua" } }
]
```

**Dos renglones con la misma especie nueva no crean dos especies**: dentro de la
misma factura se deduplican comparando normalizado, así que `"Cerveza"` y
`"  cerveza "` terminan apuntando a la misma.

### 7.4. Cuándo dos especies son la misma

Lo único que la base no deja repetir es el nombre **normalizado**: en
minúsculas, sin tildes y sin espacios de más.

| Se escribió | Es la misma que |
|-------------|-----------------|
| `Gaseosa` · `GASEOSA` · `  gaseosa  ` · `Gaséosa` | `gaseosa` |
| `Agua  mineral` | `agua mineral` |

Lo que se guarda y se muestra es **como lo escribió la persona**. **Los plurales
no se tocan**: `gaseosa` y `gaseosas` son dos especies distintas — adivinar eso
terminaría uniendo cosas que no van juntas.

### 7.5. Qué se congela y qué no

| Dato del renglón | Cambia si se edita después | Por qué |
|------------------|----------------------------|---------|
| `producto` | ❌ no | Es lo que la persona leyó cuando compró |
| `precioUnitario` | ❌ no | Es lo que se le cobró |
| `especie` | ✅ **sí** | Es una clasificación, no un hecho de esa venta |

### 7.6. "Sin especie (histórico)"

Las facturas emitidas **antes** de que existiera el catálogo tienen esa especie:
se la puso la migración, porque la especie es obligatoria y esos renglones ya
estaban escritos. No es un error ni un estado a arreglar, pero **no la uses en
facturas nuevas**. En una base recién instalada no existe.

Cuando ya no queden facturas viejas apuntando a ella, va a figurar con
`usos: 0` y se puede borrar desde el catálogo como cualquier otra.

---

## 8. Cómo se arman las pantallas

Una sugerencia de jerarquía por pantalla. Lo importante no son las cajas: son
las tres o cuatro cosas que **no** hay que saltear en cada una.

### El tablero

```
┌─────────────────────────────────────────────────────────┐
│  PLATA EN LA CALLE                          $1.348.655  │  ← enLaCalle.deuda
│  ├─ Vencido    $1.121.893   (27 facturas)               │  ← en rojo
│  └─ Por vencer   $226.762   ( 7 facturas)               │
│  La más vieja venció hace 76 días                       │
└─────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬───────────────────┐
│ ENTRÓ EN AGOSTO  │ FACTURADO        │ MOROSOS           │
│ $59.622          │ $221.060         │ 8 de 14 clientes  │
│ 5 cobros         │ 5 facturas       │ 42,9% cumple      │
└──────────────────┴──────────────────┴───────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Facturado vs. cobrado — últimos 6 meses     [gráfico]  │
└─────────────────────────────────────────────────────────┘
```

- El bloque de "en la calle" **separado** del bloque del mes (§1.1).
- El clic en "morosos" lleva al tablero de facturación filtrado por
  `estado=vencida`: los números coinciden.

### El listado y la ficha

```
┌─────────────────────────────────────────────────────────┐
│  POR CLIENTE          [facturado ▾] [buscar…]           │
│  Mariana Ledesma  $554.000   debe $344.000   hace 22 d  │  → ficha
│  Sofía Bentancur  $337.500   debe $337.500   hace 37 d  │  → ficha
└─────────────────────────────────────────────────────────┘

  ficha ↓

┌─────────────────────────────────────────────────────────┐
│  RICARDO RAMIREZ                       DNI 36.452.185   │
│  ricardo@example.com · sin teléfono          [pendiente]│
├──────────────────┬──────────────────┬───────────────────┤
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
│  QUÉ SE LLEVA                                           │
│  Soda        24 u   $21.360   62%   hace 18 d   ✦ nueva │
│  Accesorios   4 u   $12.800   38%   hace 18 d   ✦ nueva │
└─────────────────────────────────────────────────────────┘
```

- **La tasa nunca sola**: el renglón de las tres patas es el que evita que "20%"
  se lea como "no paga".
- **El bloque de demoras necesita `comoPaga`** para escribirse (§3.6).
- `vencido` y `aReembolsar` en colores distintos: van para lados opuestos.

### Los tickets

```
┌─────────────────────────────────────────────────────────┐
│  TICKETS POR MES                                        │
│  agosto 2026   en curso                                 │
│  $221.060 facturado · $59.622 cobrado   → deuda 1.348k  │  [ver ticket]
│  julio 2026                                             │
│  $367.407 facturado · $22.450 cobrado   → deuda 1.187k  │  [ver ticket]
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  JULIO 2026                          generado el 21/8   │
├──────────────────┬──────────────────┬───────────────────┤
│ SE FACTURÓ       │ ENTRÓ            │ LA CALLE AL 31/7  │
│ $367.407         │ $22.450          │ $1.187.218        │
│ 13 facturas ▼40% │ 1 cobro    ▼94%  │ ▲ $344.957        │
└──────────────────┴──────────────────┴───────────────────┘

┌───────────────────────────┬─────────────────────────────┐
│  QUIÉN COMPRÓ             │  QUÉ SE VENDIÓ              │
│  Mariana Ledesma  $97.000 │  Vestidos          $214.000 │
└───────────────────────────┴─────────────────────────────┘
```

- **La fecha del corte (`alCierre.al`) escrita en el bloque de la deuda.** Es lo
  que evita que se lea como la de hoy.
- El cartel de **"en curso"** en el mes que no terminó.
- `generadoEl` en el encabezado o en el pie, sobre todo si se imprime.

### La tendencia

```
┌─────────────────────────────────────────────────────────┐
│  QUÉ SE LLEVAN            agosto 2026 ▾   [monto ▾]     │
│  49 unidades · $239.740 · 5 especies · 4 clientes       │
├─────────────────────────────────────────────────────────┤
│  Soda          24 u   $21.360   1 cliente    ▲ +100% ↗  │
│  ▁▁▁▂▄█                                                 │
│  Agua          12 u   $22.880   2 clientes   ▼  −46% ↘  │
│  ▁▂▄█▄▂                                                 │
│  ─────────────────────────────────────────────────────  │
│  Alquiler       —       —       —            parada ⏸   │
└─────────────────────────────────────────────────────────┘
```

- **Separá las `parada`**: están abajo, con todo en cero.
- **El chip manda, el porcentaje acompaña**: un `−100%` en una parada no es una
  caída, es que dejó de moverse.
- **La serie es un sparkline**, no un número.

### La global de productos

```
┌──────────────────────────────────────────────────────────────────┐
│  QUÉ SE VENDE          [todo ▾] [sep 2025 → ago 2026] [monto ▾]  │
│  2.378 unidades · $7.610.800 · 11 de 12 especies con venta       │
│  ▸ dos especies hacen la mitad del negocio                       │
├──────────────────────────────────────────────────────────────────┤
│  1  Agua        921 u   $2.843.250   37,4%  ▓▓▓▓▓▓▓░░░  ↗ sube   │
│       Bidón 20L (73%) · Bidón 12L (23%) · plan mensual (5%)      │
│  2  Gaseosa     511 u   $1.819.150   23,9%  ▓▓▓▓▒░░░░░  ↘ baja   │
│  3  Soda        488 u     $873.450   11,5%  ▓▓▒░░░░░░░  ↘ baja   │
│  …                                                     ← 80% acá │
│  ────────────────────────────────────────────────────────────────│
│  12 Repuestos     —            —        —   sin vender  ⏸ parada │
└──────────────────────────────────────────────────────────────────┘
```

- **La barra es `participacionAcumulada`**, no `participacion`: es lo que deja
  marcar dónde se llega al 80% del negocio de un vistazo.
- **Los productos de adentro, en el renglón desplegado.** Es el nivel donde se
  decide qué comprar.
- **Lo que no se vendió, abajo y en gris**, pero visible: es medio motivo de la
  pantalla.
- El selector de período arriba: en verano el ranking es otro (§6.6).

### El catálogo y el alta de factura

```
┌──────────────────────────────────────────────────────────────┐
│ Producto            Cant.   Precio      Especie              │
│ ┌────────────────┐  ┌───┐  ┌────────┐  ┌──────────────────┐  │
│ │12 Coca de 500ml│  │12 │  │  1200  │  │ Gaseosa       ▾  │  │
│ └────────────────┘  └───┘  └────────┘  └──────────────────┘  │
│                                          ↳ + Crear "cerveza" │
└──────────────────────────────────────────────────────────────┘
```

- **Un solo `GET /especies` por formulario**, al abrirlo. Filtrá en memoria.
- Elegida del catálogo → `especieId`. Tipeada nueva → `especie`. Nunca las dos.
- **Después de guardar, recargá el catálogo**: la factura pudo crear especies.

---

## 9. Que los números cierren

La lista de invariantes. **Si alguna no se cumple en tu pantalla, es un bug del
backend: avisá.** Son la forma más rápida de descartar que el error sea tuyo.

| Invariante | Dónde |
|------------|-------|
| `deuda === vencido + porVencer` | tablero, ticket, ficha |
| `global.totalFacturado − global.totalCobrado === enLaCalle.deuda` | tablero |
| `exigibles === enFecha + tarde + sinPagar` | ficha |
| `facturas.total === activas + pagadas` | ficha |
| suma de `especies[].monto` === `plata.facturado` | ficha |
| las `participacion` de la ficha suman 100 | ficha |
| `listado.deudaAlCierre` === `ticket.alCierre.deuda` del mismo mes | tickets |
| `alCierre.variacionEnElMes === facturacion.facturado − cobranza.cobrado` | ticket |
| la deuda al cierre de un mes menos la del anterior === `variacionEnElMes` | tickets |
| `deEsteMes + deMesesAnteriores === cobrado` | ticket |
| `enTermino + fueraDeTermino === cobrado` | ticket |
| `tendencia.totales.monto` === `facturacion.facturado` del ticket del mes | tendencia |
| `productos.totales.monto` === la suma de `facturacion.facturado` de todos los tickets del período | productos |
| las `participacion` de `productos.especies` suman 100 | productos |
| suma de `topEspecies[].monto` === `facturacion.facturado` (si entran las ≤10) | ticket |

Y dos que **no** son invariantes, aunque lo parezcan:

- **`totales.facturas` y `totales.clientes` de la tendencia no son la suma de las
  columnas**: dos especies en la misma factura son una factura, y el cliente que
  se llevó tres especies es un cliente.
- **La deuda del ticket no tiene por qué coincidir con la del tablero**: una es
  del cierre del mes y la otra es de hoy (§4.1).

---

## 10. Rendimiento y refresco

Cada pantalla es **una sola llamada**, y sus números salen del mismo instante:
partirlas daría requests que leen la base en momentos distintos y los bloques se
contradirían entre sí por un pago que entró en el medio.

| Pantalla | Cuánto pesa |
|----------|-------------|
| Tablero | seis agregados en una transacción |
| Listado | una consulta, con el orden y el corte **en la base** |
| Ficha | la misma consulta del listado acotada a un id, más reembolsos y especies |
| Ticket | ocho agregados en una transacción |
| Listado de meses | **una** consulta, con las sumas acumuladas en la base |
| Tendencia | tres consultas; el cruce y el orden se hacen en memoria |
| Productos, global | cuatro consultas en una transacción; el orden y el Pareto, en memoria |
| Catálogo | una consulta |

Para un negocio de este tamaño todo es instantáneo. **No lo pongas en un
`setInterval`**: recargá al entrar a la pantalla, después de registrar un pago o
emitir una factura, y con un botón de refrescar si lo querés. El día que haya
decenas de miles de facturas esto se cachea del lado del servidor.

---

## 11. Checklist antes de dar por cerrado

**Lo que rompe contrato:**

- [ ] El alta de factura manda `especieId` **o** `especie` en cada renglón (§6.3).
- [ ] Los tipos de los items de la respuesta incluyen `especie: { id, nombre }`.
- [ ] El formulario de factura trae el catálogo al abrirse y deja crear una
      especie sin salir de la pantalla.

**Los `null` que no son cero:**

- [ ] `cumplimiento.*` del tablero, `tasa` de la ficha, `ticketPromedio`,
      `comprasPorMes`, `diasEntreCompras`, `precioPromedio` y las variaciones.
- [ ] El bloque de demoras se escribe desde `comoPaga`, no deduciéndolo de los
      `null` (§3.6).
- [ ] Ningún `Math.round`/`toFixed`/división sobre un campo que puede faltar.

**Lo que se lee mal si se maqueta de cualquier manera:**

- [ ] En el tablero, "en la calle" separado del bloque del mes.
- [ ] En el ticket, `alCierre.al` escrito, y "en curso" si `cerrado: false`.
- [ ] En la tendencia y en la ficha, las `parada` separadas y sin `−100%`.
- [ ] En la global de productos, lo que **no se vendió** se muestra (no se
      filtra), y `participacionAcumulada` solo se grafica con `orden=monto`.
- [ ] La tasa de cumplimiento **nunca sola**: siempre con sus tres patas.
- [ ] `aReembolsar` en alerta y con signo contrario a la deuda.

**Los meses vacíos:**

- [ ] `evolucion`, las `serie` de la tendencia y los meses del listado de tickets
      vienen con ceros a propósito. **No los filtres.**
