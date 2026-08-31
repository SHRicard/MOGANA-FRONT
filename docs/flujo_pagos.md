# Flujo de facturación y pagos — guía para el front

Todo lo que necesita el front para la parte de facturación del panel del
administrador: las tres pantallas, los endpoints que las alimentan y las reglas
que hay que respetar. **Si tenés a mano documentos anteriores de facturas
(`s.facturas.*`, `fix.facturas.*`), tiralos**: este los reemplaza a todos y es el
único válido.

Todo esto es **solo del administrador** (y del super admin). El cliente no ve
nada de facturación todavía.

---

## 1. El modelo, en tres líneas

```
Factura  →  qué le vendiste, cuánto y hasta cuándo tiene para pagar   (no se toca nunca)
Pago     →  plata que entró, con su fecha                             (no se edita: se borra)
Saldo    →  total − pagos                                             (no existe en la base: se calcula)
```

Eso es todo el modelo. Dos hechos que se guardan y una resta que se calcula.

**Una factura emitida no se edita.** Ni el total, ni el detalle, ni las fechas.
Si el cliente se lleva más mercadería, eso es **otra factura**; si paga una
parte, eso es **un pago**. Editar la factura haría perder qué se le cobró el día
que se emitió, que es lo único que una factura tiene que garantizar.

Y si está mal emitida —el cliente equivocado, un cero de más— **se anula**: la
factura queda con su número y su detalle, marcada `anulada`, y deja de contar
para la deuda. Tampoco se borra: un número que desaparece de la numeración no lo
puede explicar nadie seis meses después.

El caso típico del mostrador, resuelto:

```
18/08  Factura #12   $1.000   vence 18/09
05/09  ├─ pago              $500    → saldo $500, sigue vencida
05/09  └─ Factura #27   $500   vence 01/11   (lo que se llevó ese día)
```

---

## 2. Las pantallas y sus endpoints

| Pantalla | Endpoint |
|---|---|
| **Tablero** — quién debe, cuánto y hace cuánto | `GET /api/admin/clientes-con-facturas` |
| **Cuenta del cliente** — todas sus facturas | `GET /api/admin/clientes/:clienteId/cuenta` |
| **Factura** — detalle, renglones y cobros | `GET /api/admin/facturas/:id` |
| **Nueva factura** — para un cliente | `POST /api/admin/clientes/:clienteId/facturas` |
| **Registrar cobro** (desde una factura) | `POST /api/admin/facturas/:id/pagos` |
| **Borrar un cobro mal cargado** | `DELETE /api/admin/facturas/:id/pagos/:pagoId` |
| **Anular una factura mal emitida** | `POST /api/admin/facturas/:id/anular` |
| **Marcar devuelta la plata de una anulada** | `POST /api/admin/facturas/:id/reembolso` |
| Solo las facturas de un cliente, paginadas | `GET /api/admin/clientes/:clienteId/facturas` |

El recorrido es **tablero → cuenta del cliente → factura**: el tablero dice a
quién hay que ir a cobrar, la cuenta muestra de qué está hecha esa deuda, y la
factura es donde se anota el cobro. Cada paso trae un poco más de detalle, y
ninguno trae el del siguiente.

Todos piden `Authorization: Bearer <token>` de un administrador. Sin token es
`401`; con un token de cliente, `403`.

---

## 3. Pantalla 1 — el tablero

`GET /api/admin/clientes-con-facturas`

**Un renglón por cliente, con su cuenta entera.** No es una lista de facturas: es
la lista de a quién hay que cobrarle, cuánto y desde cuándo.

```
Por cobrar $117.415,75      Vencido $28.862,75      Por vencer $88.553,00
──────────────────────────────────────────────────────────────────────────────
Buscar: [ perez        ]   Estado: [ vencida ▾ ]

Cliente            DNI         Debe          Facturas   Vence más viejo       Estado
Ana Pérez          30111001    $8.810,50     1 de 1     04/07  hace 45 d      vencida
Bruno Sosa         30111002    $12.500,00    1 de 1     03/08  hace 15 d      vencida
Elena Ruiz         30111005    $30.000,00    2 de 3     23/09  en 36 d        pendiente
Julián Ríos        30111010    $0,00         —          —                     al_dia
```

| Query | | |
|---|---|---|
| `q` | opcional | nombre, DNI o email del cliente |
| `estado` | opcional | `al_dia` · `pendiente` · `proxima_a_vencer` · `vencida` |
| `pagina` | opcional | default 1 |
| `limite` | opcional | 1 a 100, default 20 |

```json
{
  "datos": [
    {
      "clienteId": "6aa10954-cf08-4711-b7c1-643238970a3f",
      "nombre": "Elena Ruiz",
      "dni": "30111005",
      "deuda": 30000,
      "totalFacturado": 58200,
      "totalPagado": 28200,
      "facturas": 3,
      "facturasImpagas": 2,
      "vencimientoMasViejo": "2026-09-23",
      "diasParaVencer": 36,
      "estado": "pendiente"
    }
  ],
  "total": 11, "pagina": 1, "limite": 20, "paginas": 1,
  "totales": { "deuda": 117415.75, "vencido": 28862.75, "porVencer": 88553 }
}
```

| Campo | |
|---|---|
| `nombre` | ya resuelto: el nombre cargado, si no el usuario del email, si no el DNI. **Nunca viene vacío** |
| `dni` | puede ser `null` — las cuentas de Google o de email no tienen |
| `deuda` | **el número de la pantalla**: la suma de los saldos de todas sus facturas impagas |
| `totalFacturado` · `totalPagado` | histórico completo del cliente |
| `facturas` · `facturasImpagas` | cuántas tiene y cuántas le faltan pagar |
| `vencimientoMasViejo` | el vencimiento **más urgente de lo que debe** — no el de su última factura. `null` si está al día |
| `diasParaVencer` | días hasta ese vencimiento: `0` vence hoy, negativo ya venció. `null` si está al día |
| `estado` | `al_dia`, `pendiente`, `proxima_a_vencer` o `vencida` |
| `clienteId` | para el clic: lleva a `GET /api/admin/clientes/:id/cuenta` |

`totales` es del **filtro entero**, no de la página: sirve para el encabezado
"por cobrar / vencido / por vencer" sin pedir nada más.

Ojo con los dos `total`: `datos[].deuda` es plata y el `total` de afuera es
**cuántos clientes** hay.

### Cómo leerlo

**El estado del cliente sale de lo peor que tenga sin pagar.** Si arrastra una
vencida de marzo y ayer le facturaste el mes nuevo, la cuenta está `vencida`: es
lo que hay que atender. `al_dia` es no deber nada.

```
Elena Ruiz    3 facturas: una pagada, dos impagas (23/09 y 30/09)
              →  debe $30.000, estado "pendiente", vence más viejo 23/09
```

**Un renglón NO es una factura.** No trae número de factura, ni productos, ni
fechas de emisión: para eso está la cuenta. Es a propósito — una sola consulta
con lo mínimo, para que la tabla abra instantánea.

**El orden es por urgencia**: primero el que hace más que se pasó, y entre dos
iguales el que debe más. Los que están al día quedan al final.

**La búsqueda** no distingue mayúsculas y va por pedazo de texto: `38180`
encuentra a `38180903`, y el DNI se puede escribir con puntos. ⚠️ **No iguala
tildes**: `perez` no encuentra a `Pérez`. Los comodines de SQL no son comodines:
buscar `%` no lista todo.

**Los clientes sin ninguna factura no aparecen.** El listado completo sigue
siendo `GET /api/admin/clientes`.

**Filtrar, ordenar y paginar pasan en la base**: `total`, `paginas` y `totales`
cuentan lo filtrado.

---

## 4. Pantalla 2 — la cuenta del cliente

`GET /api/admin/clientes/:clienteId/cuenta`

Es a donde lleva el clic del tablero, y **la pantalla que contesta "¿tiene algo
atrás?"**: el resumen de la deuda y sus facturas, cada una con su estado y su
saldo, con **filtros y paginado** porque un cliente puede tener mil.

```
Elena Ruiz · DNI 30.111.005                          DEBE $60.000,00
Facturado $113.200,00 · Cobrado $53.200,00 · 3 de 5 impagas · pendiente

Estado: [ todas ▾ ]   Emitidas del [ 01/08/2026 ] al [ 19/08/2026 ]

  #25  1× Alfajor Guaymallén x34    $30.000,00  debe $30.000,00  vence 18/09  pendiente
  #24  1× 24 latas de Quilmes       $25.000,00  debe $25.000,00  vence 18/09  pendiente
  #22  1× 12 cerveza                $15.000,00  debe      $0,00  vence 23/09  pagada
```

| Query | | |
|---|---|---|
| `estado` | opcional | `pendiente` · `proxima_a_vencer` · `vencida` · `pagada` — el de **la factura**, no el de la cuenta |
| `desde` | opcional | `AAAA-MM-DD`, emitidas desde ese día, incluido |
| `hasta` | opcional | `AAAA-MM-DD`, emitidas hasta ese día, incluido |
| `pagina` | opcional | default 1 |
| `limite` | opcional | 1 a 100, default 20 |

```json
{
  "cliente": {
    "id": "…", "nombre": "Elena Ruiz",
    "displayName": "Elena Ruiz", "email": "elena.ruiz@mail.com", "dni": "30111005"
  },
  "resumen": {
    "facturas": 5,
    "facturasAnuladas": 1,
    "facturasImpagas": 3,
    "totalFacturado": 113200,
    "totalPagado": 53200,
    "deuda": 60000,
    "aReembolsar": 73002.5,
    "vencimientoMasViejo": "2026-09-18",
    "diasParaVencer": 30,
    "estado": "pendiente"
  },
  "facturas": [
    {
      "id": "…",
      "numero": 25,
      "fechaEmision": "2026-08-19",
      "fechaFin": "2026-09-18",
      "estado": "pendiente",
      "diasParaVencer": 30,
      "total": 30000,
      "pagado": 0,
      "saldo": 30000,
      "items": 1,
      "pagos": 0,
      "detalle": "1× Alfajor Guaymallén x34"
    }
  ],
  "total": 5, "pagina": 1, "limite": 20, "paginas": 1
}
```

### El renglón es liviano

Cada factura de la lista **no trae sus renglones ni sus cobros**: trae cuántos
tiene (`items`, `pagos`), una línea para reconocerla (`detalle`, el primer
producto y `+N` si hay más) y, si está dada de baja, el `motivoAnulacion`. Sobre las mismas facturas, esta lista pesa **un 66%
menos** que devolverlas completas — y la diferencia crece con el detalle.

Para ver una factura entera —sus renglones y sus cobros— está
`GET /api/admin/facturas/:id`, que es a donde tiene que llevar el toque en el
renglón. **No la pidas para pintar la lista.**

### Los filtros no tocan el resumen

⚠️ `estado`, `desde` y `hasta` filtran **la lista**. El `resumen` es siempre el
de toda la cuenta: mirar solo las vencidas no puede cambiar cuánto debe el
cliente. `total` y `paginas`, en cambio, sí cuentan lo filtrado.

En el `resumen`, `facturas` cuenta las **vigentes** y `facturasAnuladas` las
dadas de baja, para que los números cierren con la lista: "5 facturas, 1
anulada". Las anuladas **no** suman a `totalFacturado`, `totalPagado` ni
`deuda`.

`aReembolsar` va para el otro lado: es lo que **vos le debés al cliente** — lo
que había pagado de facturas que después se anularon y todavía no se le
devolvió.

```
sin filtro         →  5 facturas · resumen: debe $60.000
?estado=pagada     →  2 facturas · resumen: debe $60.000   ← el mismo
```

**`desde` y `hasta` son por fecha de emisión**, con los dos extremos incluidos:
`?desde=2026-07-01&hasta=2026-07-31` es "lo que le facturé en julio". Para
buscar por vencimiento está el filtro por estado.

**El orden es siempre la última primero** (por número de factura, que es
correlativo). Se combinan todos: `?estado=pendiente&desde=2026-08-01&limite=10`.

### Errores propios

| | `message` |
|---|---|
| `400` | `Estado inválido: pendiente, proxima_a_vencer, vencida, pagada.` — acá van los de **factura**, `al_dia` es del tablero |
| `400` | `La fecha va en formato AAAA-MM-DD, por ejemplo 2026-08-01.` |
| `400` | `La fecha desde no existe: 2026-02-30.` |
| `400` | `El rango de fechas termina antes de empezar: revisá desde y hasta.` |
| `400` | `El límite máximo es 100 por página.` |
| `404` | `No encontramos ese cliente.` — también si el id es de un administrador |

Una página vacía no es un error: `200` con `facturas: []`.

---

## 5. Pantalla 3 — la factura

`GET /api/admin/facturas/:id` (y la misma forma la devuelven el alta, el listado
por cliente y los dos endpoints de pagos)

```json
{
  "id": "87f9e23d-40f0-4be3-8f9c-d8868be72135",
  "numero": 12,
  "cliente": {
    "id": "6aa10954-…", "displayName": "Zoraida Pérez",
    "email": null, "dni": "38180903"
  },
  "fechaEmision": "2026-08-18",
  "fechaFin": "2026-09-17",
  "estado": "vencida",
  "pagado": 500,
  "saldo": 500,
  "pagos": [
    {
      "id": "9c1f…", "monto": 500, "fecha": "2026-09-05", "nota": "En efectivo",
      "registradoPor": { "id": "a3ea…", "displayName": "Administrador", "email": "admin@mail.com" }
    }
  ],
  "pagadaEn": null,
  "diasParaVencer": -1,
  "anuladaEn": null,
  "motivoAnulacion": null,
  "anuladaPor": null,
  "aReembolsar": 0,
  "reembolsadoEn": null,
  "reembolsadoPor": null,
  "items": [
    { "id": "9db8…", "producto": "Bidón 20L", "cantidad": 3, "precioUnitario": 19.99, "subtotal": 59.97 },
    { "id": "4faa…", "producto": "Alquiler dispenser", "cantidad": 1, "precioUnitario": 10.1, "subtotal": 10.1 }
  ],
  "total": 1000,
  "notas": "Primera factura",
  "creadaPor": { "id": "a3ea…", "displayName": "Administrador", "email": "admin@mail.com" },
  "createdAt": "2026-08-18T13:44:13.049Z"
}
```

| Campo | |
|---|---|
| `numero` | correlativo y único en toda la app: **es el número que se muestra**. El `id` es para las URLs |
| `fechaEmision` | el día en que se creó. Lo pone el servidor |
| `fechaFin` | el día en que hay que pagarla, incluido |
| `total` · `pagado` · `saldo` | lo cobrado, lo que entró, lo que falta |
| `pagos` | los cobros, del más viejo al más nuevo |
| `pagadaEn` | la fecha del pago que la terminó de saldar, o `null` si todavía debe |
| `items` | los renglones, **en el orden en que se cargaron** |
| `creadaPor` | el administrador que la emitió. `null` si esa cuenta se borró |
| `anuladaEn` · `motivoAnulacion` · `anuladaPor` | si se dio de baja: cuándo, por qué y quién. Ver la sección 9 |
| `aReembolsar` | lo que hay que devolverle al cliente de esta factura. Cero salvo en una anulada que se había cobrado |
| `reembolsadoEn` · `reembolsadoPor` | cuándo se marcó devuelta esa plata, y quién |

**Todos los importes vienen calculados: mostralos, no los sumes.** `subtotal`,
`total`, `pagado` y `saldo` salen con decimales exactos del servidor; rehacer la
cuenta en JavaScript es como el front termina mostrando `$999.9999999`.

Un mismo producto puede aparecer en dos renglones: son dos renglones.

---

## 6. Los estados

No hay ningún estado guardado. Sale de dos cosas que sí están en la base: **los
pagos anotados** y la `fechaFin`.

| `estado` | Cuándo | La regla |
|---|---|---|
| `anulada` | se dio de baja | le gana a todo: no se cobra, no vence y no cuenta para la deuda |
| `pagada` | `saldo` en cero | le gana al resto: una factura saldada nunca se muestra vencida |
| `vencida` | pasó el fin y todavía debe | **desde el día siguiente** al `fechaFin` |
| `proxima_a_vencer` | faltan **7 días o menos** | incluye el día del fin: ese es el día de pagar |
| `pendiente` | falta más que eso | |

```
fechaFin = 25 de agosto

  17/08  →  pendiente          (faltan 8 días)
  18/08  →  proxima_a_vencer   (faltan 7)
  25/08  →  proxima_a_vencer   (vence hoy, todavía se puede pagar)
  26/08  →  vencida            (un día después del fin)
```

Como se calcula, **una factura cambia de estado sola** al pasar el día: no hay
tarea nocturna que pueda fallar. La contra es que depende del reloj del servidor,
que trabaja en hora argentina.

`diasParaVencer` es para el cartelito, sin que el front tenga que saber cuál es
"hoy" para el backend: `8` faltan 8 días, `0` vence hoy, `-3` venció hace 3.

⚠️ **Un pago parcial no cambia el estado.** La factura de la que cobraste la
mitad y venció ayer sigue `vencida`, con `saldo` en la mitad. **No es un bug**: el
estado dice *si hay que ir a cobrar* y el saldo dice *cuánto*. Un cliente que pagó
$1 de $10.000 no está al día. En pantalla se lee bien así:

```
Ana Pérez   vencida hace 18 d   debe $500 de $1.000
```

⚠️ Los cuatro valores son los de la tabla, en minúscula y con guión bajo:
`proxima_a_vencer`, no `PROXIMO A VENCER`. Son los que van en el `switch`.

### El estado de un cliente es otra cosa

Una persona no está "pagada": está **al día** o le debés ir a cobrar. Por eso el
tablero y la cuenta usan otros cuatro valores:

| `estado` de la cuenta | Cuándo |
|---|---|
| `al_dia` | no debe nada |
| `pendiente` · `proxima_a_vencer` · `vencida` | lo que le corresponda a **la factura impaga más urgente** |

Un cliente con una vencida de marzo y otra recién emitida está `vencida`: manda
lo peor que tenga sin pagar, que es lo que hay que atender. Por eso el chip del
cliente y el de su factura más urgente siempre coinciden.

⚠️ El query param `estado` del tablero usa **estos** valores: `al_dia` y no
`pagada`.

---

## 7. Pantalla 4 — nueva factura

`POST /api/admin/clientes/:clienteId/facturas`

El cliente va **en la URL**, nunca en el body: la factura no puede terminar en
otra cuenta que la que el administrador tiene abierta.

```json
{
  "fechaFin": "2026-09-17",
  "notas": "Primera factura",
  "items": [
    { "producto": "Bidón 20L", "cantidad": 3, "precioUnitario": 19.99 },
    { "producto": "Alquiler dispenser", "cantidad": 1, "precioUnitario": 10.10 }
  ]
}
```

| Campo | | |
|---|---|---|
| `fechaFin` | obligatorio | `AAAA-MM-DD`. El día en que hay que pagarla. **Hoy o más adelante, y a lo sumo dentro de un año** |
| `items` | obligatorio | de 1 a 100 renglones |
| `items[].producto` | obligatorio | texto libre, hasta 200 caracteres |
| `items[].cantidad` | obligatorio | entero, 1 o más |
| `items[].precioUnitario` | obligatorio | lo que sale **una** unidad. Hasta dos decimales, 0 o más |
| `notas` | opcional | hasta 500 caracteres |

Responde `201` con la factura completa (la forma de la sección 4), ya con
`estado`, `saldo` y `pagos: []`.

⚠️ **Una sola fecha.** La emisión es el día en que se crea la factura y la pone el
servidor: mandar `fechaEmision` en el body es `400`. Tampoco mandes `subtotal`
ni `total` — los calcula el backend.

⚠️ **`producto` es texto libre: no hay catálogo.** El nombre y el precio quedan
copiados en la factura, así que cambiar mañana un precio no toca las facturas ya
emitidas.

💡 Poné `min` = hoy y `max` = hoy + 1 año en el date picker y no vas a ver ninguno
de los dos errores de fecha.

---

## 8. Cobrar

`POST /api/admin/facturas/:id/pagos`

```json
{ "monto": 500 }
```
```json
{ "monto": 500, "fecha": "2026-09-05", "nota": "En efectivo" }
```

| Campo | | |
|---|---|---|
| `monto` | obligatorio | mayor a cero, hasta dos decimales. **Nunca más que el `saldo`** |
| `fecha` | opcional | `AAAA-MM-DD`, el día del cobro. Si no viene, es hoy — la plata pudo entrar el viernes y anotarse el lunes |
| `nota` | opcional | hasta 200: "en efectivo", "transferencia", "lo trajo el hijo" |

Responde `201` con **la factura completa y su saldo al día**: no hace falta
volver a pedirla.

Se puede cobrar en varias veces; cada pago queda con su fecha y los dos entran en
la lista. Cuando el saldo llega a cero, `estado` pasa a `pagada` y `pagadaEn`
toma la fecha del último pago.

### La pantalla

```
Factura #12                                    vencida hace 1 d
Total $1.000    ·    Cobrado $500    ·    Debe $500

[ Registrar pago ]

Cobros
  05/09    $500    En efectivo    ·    Administrador    [🗑]
```

- **El monto arranca precargado con el `saldo`**: lo más común es que pague todo
  lo que falta.
- **La fecha es opcional y por defecto hoy.** Solo se toca si la plata entró otro
  día.
- **Un pago se borra, no se edita.** No pongas un lápiz al lado de cada cobro: un
  tacho. `DELETE /api/admin/facturas/:id/pagos/:pagoId` devuelve la factura con
  el saldo y el estado recalculados.

### Cuando trae plata para varias facturas

Es el caso normal del mostrador: debe dos facturas de $15.000 y trae $20.000, con
lo que liquida una y deja la otra a medias. **Son dos cobros**, uno en cada
factura:

```
POST /admin/facturas/{la-que-vence-primero}/pagos   { "monto": 15000 }  → saldo 0, pagada
POST /admin/facturas/{la-otra}/pagos                { "monto":  5000 }  → saldo 10.000, sigue impaga
```

Desde la cuenta del cliente el front tiene todo para guiarlo: las facturas
impagas ordenadas por vencimiento y el saldo de cada una. Lo natural es proponer
**la que vence primero**, precargar el monto con su saldo y, si lo que trajo
sobra, ofrecer el resto en la siguiente.

⚠️ **Un pago no puede superar el saldo de su factura**, y no existe un cobro que
se reparta solo entre varias. A qué factura se imputó cada peso es un dato que
solo existe en el momento de cobrar: si no se guarda ahí, después no hay forma de
reconstruirlo — y **quien decide es la persona que está cobrando**, no el
sistema.

⚠️ **No existe la plata "a cuenta".** Un pago va siempre contra una factura; no
hay saldo a favor ni adelantos. Si alguien deja plata adelantada, lo que
corresponde es emitir la factura de lo que se lleva.

---

## 9. Anular una factura mal emitida

`POST /api/admin/facturas/:id/anular`

```json
{ "motivo": "Precio mal tipeado: un cero de más" }
```

| Campo | | |
|---|---|---|
| `motivo` | obligatorio | de 3 a 300 caracteres. Es lo único que explica el agujero en la numeración |

Responde `201` con la factura ya anulada.

**Anular no es borrar.** La factura se queda con su número, su detalle y su
total; lo que cambia es que **deja de contar**: `saldo` pasa a `0`, sale de la
deuda del cliente y del tablero, y no vence nunca más. Sigue apareciendo en la
cuenta, marcada, y se puede aislar con `?estado=anulada`.

```
Antes:   #27 $15.000 pendiente   #28 $150.000 pendiente   →  debe $165.000
Anulo la #28:
Después: #27 $15.000 pendiente   #28 $150.000 anulada     →  debe $15.000
```

### Se puede anular aunque ya esté cobrada

Pasa: se emitió, se cobró, y después el cliente vino a reclamar y quedó claro que
fue un error. **Se anula igual**, cobrada entera o a medias.

Los cobros **se quedan anotados**: esa plata entró de verdad, y borrarlos sería
decir que el cobro nunca pasó. Lo que cambia es que dejan de contar —ni la
factura suma a lo facturado, ni sus cobros a lo cobrado— y lo cobrado pasa a ser
**plata a devolver**:

```json
{
  "numero": 60, "total": 15000,
  "estado": "anulada",
  "pagado": 15000,        ← entró de verdad
  "saldo": 0,             ← no hay nada que cobrar
  "aReembolsar": 15000,   ← hay que devolvérselo
  "pagos": [ … ]          ← el registro se queda
}
```

⚠️ **La devolución se hace afuera del sistema** —efectivo, transferencia, lo que
arreglen— y el backend no la mueve. `aReembolsar` está para que no se olvide: si
la plata simplemente desapareciera de la pantalla, en tres meses nadie se
acordaría de que entró.

En la pantalla, antes de confirmar la anulación conviene decirlo con todas las
letras:

```
¿Anular la factura #60?
Ya se cobraron $15.000. Si la anulás, dejan de contar y el reembolso
lo arreglás por fuera del sistema.
                                        [ Cancelar ]  [ Anular ]
```

### Marcar que ya devolviste la plata

`POST /api/admin/facturas/:id/reembolso` — sin body. Deja `aReembolsar` en cero,
guarda cuándo y quién, y el aviso desaparece.

`DELETE /api/admin/facturas/:id/reembolso` deshace la marca, para cuando se
apretó sin querer.

Solo aplica a una factura **anulada que tenía cobros**: en cualquier otra, `400`.

En la cuenta del cliente, `resumen.aReembolsar` suma todo lo que le debés por
este motivo, y cada renglón trae el suyo.

### Las tres reglas

- **Los cobros de una anulada quedan congelados**: no se les puede agregar otro
  ni borrar los que tiene. Son el registro de la plata que entró y que hay que
  devolver.
- **No se puede deshacer.** Una factura anulada queda anulada; si hacía falta, se
  emite otra. Por eso conviene pedir confirmación antes de mandar.
- **A una anulada no se le cobra**: `POST …/pagos` responde `400`.

Del lado del front: botón "Anular" en el detalle con motivo y confirmación; el
renglón anulado va apagado, sin botón de cobrar, con el motivo al lado y —si
corresponde— el cartel de "devolver $X" con el botón para marcarlo.

| | `message` |
|---|---|
| `400` | `Contá en una línea por qué se anula.` |
| `400` | `Esta factura ya está anulada.` |
| `400` | `Esta factura está anulada: no se le pueden anotar cobros.` (al cobrar) |
| `400` | `Esta factura está anulada: sus cobros quedan como registro de lo que hay que devolver.` (al borrar un pago) |
| `400` | `Esta factura no está anulada: lo que se cobró no hay que devolverlo.` (al reembolsar) |
| `400` | `Esta factura no tiene cobros: no hay nada que devolver.` |
| `400` | `Esta factura ya figura reembolsada.` |
| `404` | `No encontramos esa factura.` · `Esa factura no figura reembolsada.` |

---

## 10. Formatos y trampas

**Las fechas son `AAAA-MM-DD`, sin hora ni zona** (`fechaEmision`, `fechaFin`,
`fecha` del pago, `pagadaEn`). ⚠️ **No las pases por `new Date(...)` para
mostrarlas**: en zona argentina eso las corre un día para atrás. Partí el string,
o construí la fecha al mediodía.

`createdAt` sí es un instante ISO completo: es cuándo se cargó, no el día de la
factura.

**Los importes son números** con dos decimales como máximo. `215` es `$215,00`:
formatealos vos.

**Todos los errores tienen la misma forma**, un string plano:

```json
{ "message": "El pago supera el saldo de esta factura: debe $500.00." }
```

Se pueden mostrar tal cual: están escritos para que los lea la persona que está
en el mostrador.

---

## 11. Todos los errores

**Alta de factura**

| | `message` |
|---|---|
| `400` | `La fecha de fin va en formato AAAA-MM-DD, por ejemplo 2026-09-17.` |
| `400` | `La fecha de fin no existe: 2026-02-30.` |
| `400` | `La factura no puede terminar antes de emitirse: el fin es hoy o más adelante.` |
| `400` | `El vencimiento no puede estar a más de un año: revisá el año de la fecha.` |
| `400` | `La factura necesita al menos un producto.` |
| `400` | `Una factura admite hasta 100 renglones.` |
| `400` | `Cada renglón necesita un producto.` |
| `400` | `La cantidad tiene que ser un número entero.` · `La cantidad mínima es 1.` |
| `400` | `El precio admite hasta dos decimales.` · `El precio no puede ser negativo.` |
| `400` | `property fechaEmision should not exist` (cualquier campo de más) |
| `404` | `No encontramos ese cliente.` — también si el id es de un administrador |

**Pagos**

| | `message` |
|---|---|
| `400` | `El monto tiene que ser mayor a cero.` |
| `400` | `El monto admite hasta dos decimales.` |
| `400` | `El pago supera el saldo de esta factura: debe $500.00.` |
| `400` | `Esta factura ya está paga.` |
| `400` | `Esta factura está anulada: no se le pueden anotar cobros.` |
| `400` | `Esta factura está anulada: sus cobros quedan como registro de lo que hay que devolver.` |
| `400` | `La fecha del pago va en formato AAAA-MM-DD.` · `La fecha del pago no existe: 2026-02-30.` |
| `404` | `No encontramos esa factura.` |
| `404` | `No encontramos ese pago.` — o el pago es de otra factura |

**Tablero y cuenta**

| | `message` |
|---|---|
| `404` | `No encontramos ese cliente.` — en la cuenta, si el id no es de un cliente |
| `400` | `Estado inválido: al_dia, pendiente, proxima_a_vencer, vencida.` |

Sin resultados **no es un error**: `200` con `datos: []` y `total: 0`.

**Siempre**

| | |
|---|---|
| `401` | sin token o vencido |
| `403` | `No tenés permiso para esta acción.` — entró un cliente |

---

## 12. Si el front ya tenía la versión anterior

Dos cambios rompen contrato. Buscalos así:

```bash
grep -rn "periodoInicio\|periodoFin\|facturas/.*/pago\b\|pagada:\|facturaId" src/
```

**Las fechas** — el administrador ya no carga fecha de inicio:

```diff
- "periodoInicio": "2026-08-01",   ← lo elegía el administrador
- "periodoFin": "2026-08-31",
+ "fechaEmision": "2026-08-18",    ← lo pone el servidor, solo lectura
+ "fechaFin": "2026-09-17",        ← lo elige el administrador
```

**Los cobros** — la factura ya no se marca pagada:

```diff
- PATCH  /api/admin/facturas/:id/pago      { "pagada": true }
+ POST   /api/admin/facturas/:id/pagos     { "monto": 500 }
+ DELETE /api/admin/facturas/:id/pagos/:pagoId
```

**El tablero** — cada renglón dejó de ser una factura y pasó a ser la cuenta del
cliente. Antes mostraba **la última factura**, y eso escondía lo que el cliente
arrastraba de antes:

```diff
  GET /api/admin/clientes-con-facturas

  {
-   "facturaId": "…", "numero": 4,
-   "fechaEmision": "2026-06-30", "fechaFin": "2026-07-31",
-   "total": 215, "pagado": 100, "saldo": 115,
-   "estado": "vencida", "diasParaVencer": -18,
-   "facturas": 3
+   "deuda": 30000,                        ← lo que debe en TOTAL
+   "totalFacturado": 58200, "totalPagado": 28200,
+   "facturas": 3, "facturasImpagas": 2,
+   "vencimientoMasViejo": "2026-09-23",   ← el más urgente de lo que debe
+   "diasParaVencer": 36,
+   "estado": "pendiente"                  ← el peor de sus facturas impagas
  }
+ // y el sobre suma: "totales": { deuda, vencido, porVencer }
```

El query param `estado` cambió de valores: `pagada` ya no existe, ahora es
`al_dia`. Y el clic del renglón ya no lleva a una factura sino a
`GET /api/admin/clientes/:clienteId/cuenta`, que es la pantalla nueva.

Checklist:

- [ ] Sacar el input de fecha de inicio; el que queda manda `fechaFin`, con
      `min` = hoy y `max` = hoy + 1 año.
- [ ] Renombrar `periodoInicio`/`periodoFin` en tipos, tablas y detalles.
- [ ] Sacar el switch "pagada" y el `PATCH …/pago`.
- [ ] Formulario de pago (monto precargado con el saldo, fecha y nota opcionales)
      y lista de cobros con borrar.
- [ ] Mostrar `saldo` donde antes decía "pagada / no pagada", en el detalle y en
      el tablero.
- [ ] Agregar a los tipos: `fechaEmision`, `fechaFin`, `estado`,
      `diasParaVencer`, `pagado`, `saldo`, `pagos[]`, `pagadaEn`.
- [ ] **Tablero**: el renglón pasa a mostrar `deuda`, `facturasImpagas /
      facturas` y `vencimientoMasViejo`; el chip usa el `estado` de la cuenta
      (`al_dia` incluido) y el encabezado, `totales`.
- [ ] **Pantalla nueva de cuenta del cliente**: es a donde lleva el clic del
      tablero, y de ahí se entra a cada factura para cobrar. Sus renglones son
      livianos (`detalle`, `items`, `pagos`): el detalle completo se pide al
      tocar. Tiene filtros por estado y por fecha de emisión, y paginado.
- [ ] **Anular**: botón en el detalle con motivo y confirmación (avisando lo ya
      cobrado); el renglón anulado va apagado, sin cobrar, y el `estado` suma un
      quinto valor. Si quedó plata a devolver, el cartel de `aReembolsar` con su
      botón de "ya lo devolví".
- [ ] Mocks y fixtures con los nombres viejos.

---

## 13. Lo que todavía no existe

Para que no diseñes contra endpoints que no están:

- **No hay extracto cronológico.** La cuenta muestra las facturas con sus cobros
  adentro, no un "debe / haber / saldo" con facturas y pagos mezclados por fecha.
- **No hay un cobro que se reparta solo** entre varias facturas: si trae plata
  para tres, son tres pagos.
- **No se puede editar una factura emitida** —ni corregir un renglón ni el
  total—: lo que se hace es anularla y emitir otra.
- **Una anulación no se deshace**, y una factura nunca se borra de verdad.
- **El reembolso no se mueve por el sistema**: se marca que se hizo, nada más. No
  hay medio de pago, ni comprobante, ni devoluciones parciales.
- **No hay pagos a cuenta, ni saldo a favor, ni pagos parciales repartidos** entre
  varias facturas de una sola operación.
- **No hay recibos ni medios de pago**: el `nota` del pago es texto libre.
- **No hay catálogo de productos** con precios.
- **No hay avisos automáticos** cuando algo entra en `proxima_a_vencer` o se
  vence: el estado está para que la pantalla lo muestre.
- **El tablero no ordena ni filtra por otra cosa**: solo `q` y `estado`, siempre
  por factura más reciente.
- **El cliente no ve nada.** No hay ningún endpoint bajo `/api/cliente` que lea
  facturas ni vencimientos.
- **Nada impide dos facturas con el mismo vencimiento** para el mismo cliente: es
  a propósito, así se puede facturar de nuevo mientras hay una abierta.
