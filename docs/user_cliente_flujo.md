# La app del cliente — guía completa para el front

Todo lo que la persona ve y hace **de lo suyo**: cuánto debe, sus facturas, el
comprobante, avisar que pagó y qué se lleva.

Este documento es autosuficiente para implementar esas pantallas: trae los
endpoints, los tipos, los catálogos, los errores uno por uno, cuándo refrescar
qué y los estados vacíos. Lo único que da por sabido es que ya hay un token —
eso está en [`flujo_login.md`](./flujo_login.md).

```
GET   /api/mi/cuenta                        ← cuánto debo
GET   /api/mi/facturas                      ← la lista
GET   /api/mi/facturas/:id                  ← el detalle
GET   /api/mi/facturas/:id/pdf              ← el comprobante
POST  /api/mi/facturas/:id/informar-pago    ← avisar que pagué
GET   /api/mi/pagos-informados              ← en qué quedó cada aviso
GET   /api/mi/compras                       ← qué me llevo
GET   /api/notificaciones                   ← la campanita
```

> Las otras dos pantallas del cliente están documentadas aparte y no se repiten
> acá: entrar y el modal del DNI es [`flujo_login.md`](./flujo_login.md), y el
> perfil es [`flujo_mi_cuenta.md`](./flujo_mi_cuenta.md). El lado del mostrador
> —emitir, cobrar, anular, confirmar los avisos— es
> [`flujo_pagos.md`](./flujo_pagos.md).

---

## 0. El mapa: seis pantallas

| # | Pantalla | Endpoints que usa |
|---|---|---|
| 1 | **Inicio** — cuánto debo | `GET /mi/cuenta` + `GET /mi/facturas?limite=5` |
| 2 | **Mis facturas** — la lista con filtros | `GET /mi/facturas` |
| 3 | **Una factura** — el detalle | `GET /mi/facturas/:id` + `GET /mi/pagos-informados` |
| 4 | **Avisar que pagué** — el formulario | `POST /mi/facturas/:id/informar-pago` |
| 5 | **Mis avisos** — en qué quedó cada uno | `GET /mi/pagos-informados` |
| 6 | **Qué compro** — mi historial | `GET /mi/compras` |

El recorrido natural es **inicio → factura → avisar que pagué**. Las otras tres
cuelgan del menú.

---

## 1. Antes de escribir código

### 1.1. La URL base y el token

Todo cuelga de `/api`. Todo pide el token en el header, sin excepción:

```http
Authorization: Bearer <token>
```

El token sale de `POST /api/auth/login`, `/auth/register` o `/auth/google`, y es
el mismo que ya usa el perfil. **Sin token es `401`**; con un token de otro, se
ve la cuenta de ese otro.

**No hay refresh token.** Cuando el token vence, la API contesta `401` y el front
tiene que mandar a la persona al login. Un `401` en cualquier endpoint de `/mi`
significa siempre eso: la sesión se terminó.

### 1.2. El cliente HTTP

```ts
const API = '/api';

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token()}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!respuesta.ok) {
    // TODO error de red: si el body no es JSON, `json()` tira.
    const { message } = (await respuesta.json().catch(() => ({}))) as {
      message?: string;
    };

    if (respuesta.status === 401) {
      cerrarSesion(); // el token venció: al login
    }

    throw new ApiError(
      respuesta.status,
      message ?? 'El servidor no está respondiendo.',
    );
  }

  return respuesta.json() as Promise<T>;
}
```

### 1.3. Todos los errores tienen la misma forma

```json
{ "message": "El pago supera el saldo de esta factura: debe $ 40.700,00." }
```

Un string plano, **nunca un array**, y **ya redactado para mostrarle a la
persona**. No hay que traducir códigos ni armar mensajes: el `message` va tal
cual al cartel.

| Status | Qué pasó | Qué hace el front |
|---|---|---|
| `400` | Algo del body o del query está mal | Mostrar el `message` en el formulario |
| `401` | Sin token o vencido | Al login |
| `403` | El perfil está incompleto (falta el DNI) | Al modal del DNI ([`flujo_login.md`](./flujo_login.md)) |
| `404` | No existe **o no es tuyo** | "No encontramos esa factura" |
| `5xx` | Error del servidor | Cartel genérico y reintentar |

⚠️ **`403` no es "no tenés permiso" en `/mi`.** Todo `/mi` lo puede usar cualquier
sesión; el único `403` que sale de acá es el del perfil incompleto, que es el
mismo guard que ya conocés del resto de la app y llega siempre con este texto:

```json
{ "message": "Para usar la app necesitás cargar tu DNI en tu perfil." }
```

Un `403` en cualquier endpoint de `/mi` se resuelve mandando a la persona al
modal del DNI, no mostrando un cartel de "acceso denegado".

### 1.4. El body no admite campos de más

La validación corre con `forbidNonWhitelisted`, así que mandar una propiedad que
el endpoint no espera es `400`, no un campo ignorado en silencio:

```json
{ "message": "property clienteId should not exist" }
```

Mandá exactamente los campos documentados — nada de `clienteId`, `facturaId` ni
`createdAt` en el body. Es el único `message` de toda la API que sale en inglés,
y es a propósito: le habla al que programa, no a la persona. **No lo muestres en
pantalla**; si aparece, es un bug del front.

### 1.5. Seis reglas que valen para todo el documento

1. **El dueño sale del token, nunca de la URL.** No hay ningún `:clienteId` en
   ninguna ruta de `/mi`, ni lo va a haber.
2. **La factura de otro devuelve `404`, no `403`.** Un `403` le confirmaría a
   quien prueba ids que esa factura existe y es de alguien.
3. **Los importes son números** (`68650`) y **las fechas son texto**
   (`"2026-08-07"`), sin hora ni zona. El formateo es del front.
4. **`null` no es cero.** `proximoVencimiento: null` es *"no hay nada que
   vencer"*, y se muestra "estás al día", no una fecha vacía ni un `-`.
5. **Los días llevan signo**: `0` vence hoy y **negativo ya venció**.
   `diasParaVencer: -14` se lee *"venció hace 14 días"*, nunca *"quedan −14"*.
6. **Ningún cálculo de plata en el navegador.** Todo lo que hay que mostrar viene
   calculado; si algo parece faltar, está en §14 como invariante, no para
   restarlo a mano.

---

## 2. Los tipos

Copiables tal cual. Son el contrato: si algo no está acá, no viene.

```ts
/* ---------- catálogos ---------------------------------------------- */

export type EstadoFactura =
  | 'pendiente'
  | 'proxima_a_vencer'
  | 'vencida'
  | 'pagada'
  | 'anulada';

export type EstadoCuenta =
  | 'al_dia'
  | 'pendiente'
  | 'proxima_a_vencer'
  | 'vencida';

export type MedioDePago =
  | 'transferencia'
  | 'efectivo'
  | 'mercado_pago'
  | 'deposito'
  | 'otro';

export type EstadoPagoInformado = 'pendiente' | 'confirmado' | 'rechazado';

export type Tendencia = 'nueva' | 'sube' | 'estable' | 'baja' | 'parada';

export type TipoNotificacion =
  | 'deuda_vencida'
  | 'anuncio'
  | 'pago_informado'
  | 'pago_confirmado'
  | 'pago_rechazado';

/* ---------- GET /mi/cuenta ------------------------------------------ */

export interface MiCuenta {
  facturas: number;
  facturasImpagas: number;
  totalFacturado: number;
  totalPagado: number;
  deuda: number;
  vencido: number;
  porVencer: number;
  aReembolsar: number;
  proximoVencimiento: string | null;
  diasParaVencer: number | null;
  estado: EstadoCuenta;
}

/* ---------- GET /mi/facturas ---------------------------------------- */

export interface MiFacturaDeLaLista {
  id: string;
  numero: number;
  fechaEmision: string;
  fechaFin: string;
  estado: EstadoFactura;
  diasParaVencer: number;
  total: number;
  pagado: number;
  saldo: number;
  anulada: boolean;
  aReembolsar: number;
  /** Cuántos renglones tiene, no los renglones. */
  items: number;
  /** Cuántos cobros tiene anotados. */
  pagos: number;
  /** `"4× Pack 6 gaseosas 500ml +2"` */
  detalle: string;
}

export interface Pagina<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
  paginas: number;
}

/* ---------- GET /mi/facturas/:id ------------------------------------ */

export interface MiItem {
  id: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  especie: { id: string; nombre: string };
}

export interface MiPago {
  id: string;
  monto: number;
  fecha: string;
}

export interface MiFactura {
  id: string;
  numero: number;
  fechaEmision: string;
  fechaFin: string;
  estado: EstadoFactura;
  diasParaVencer: number;
  total: number;
  pagado: number;
  saldo: number;
  pagadaEn: string | null;
  anulada: boolean;
  anuladaEn: string | null;
  aReembolsar: number;
  reembolsado: boolean;
  notas: string | null;
  items: MiItem[];
  pagos: MiPago[];
}

/* ---------- POST /mi/facturas/:id/informar-pago --------------------- */

export interface InformarPago {
  monto: number;
  medio: MedioDePago;
  /** `AAAA-MM-DD`. Sin esto, hoy. */
  fecha?: string;
  referencia?: string;
  nota?: string;
}

export interface MiPagoInformado {
  id: string;
  estado: EstadoPagoInformado;
  /** Lo que dijo el cliente. */
  monto: number;
  fecha: string;
  medio: MedioDePago;
  referencia: string | null;
  nota: string | null;
  informadoEn: string;
  resueltoEn: string | null;
  motivoRechazo: string | null;
  /** Lo que se anotó de verdad. `null` mientras no esté confirmado. */
  montoCobrado: number | null;
  factura: {
    id: string;
    numero: number;
    total: number;
    /** El saldo de **hoy**, no el de cuando avisó. */
    saldo: number;
    fechaFin: string;
  };
}

/* ---------- GET /mi/compras ----------------------------------------- */

export interface EspecieQueCompro {
  especieId: string;
  nombre: string;
  /** Desde siempre, no de la ventana. */
  cantidad: number;
  monto: number;
  facturas: number;
  participacion: number | null;
  ultimaCompra: string;
  diasSinComprar: number;
  reciente: { cantidad: number; monto: number };
  previo: { cantidad: number; monto: number };
  variacionCantidad: number | null;
  variacionMonto: number | null;
  tendencia: Tendencia;
}

export interface MisCompras {
  hoy: string;
  /** 90. Los días de cada ventana de la tendencia. */
  ventanaDias: number;
  facturado: number;
  compras: {
    primeraCompra: string | null;
    ultimaCompra: string | null;
    diasSinComprar: number | null;
    diasEntreCompras: number | null;
    comprasPorMes: number | null;
    antiguedadDias: number | null;
  };
  especies: EspecieQueCompro[];
}

/* ---------- GET /notificaciones ------------------------------------- */

export interface DatosDePago {
  pagoInformadoId: string;
  facturaId: string;
  facturaNumero: number;
  monto: number;
  fecha: string;
}

export interface DatosDeDeuda {
  deuda: number;
  facturasVencidas: number;
  vencimientoMasViejo: string | null;
  facturas: { numero: number; fechaFin: string; saldo: number }[];
}

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  datos: DatosDeDeuda | DatosDePago | null;
  leidaEn: string | null;
  createdAt: string;
}

export type ListaNotificaciones = Pagina<Notificacion> & { noLeidas: number };
```

### Las llamadas

```ts
export const miApi = {
  cuenta: () => pedir<MiCuenta>('/mi/cuenta'),

  facturas: (q: {
    estado?: EstadoFactura;
    desde?: string;
    hasta?: string;
    pagina?: number;
    limite?: number;
  } = {}) =>
    pedir<Pagina<MiFacturaDeLaLista>>(`/mi/facturas?${new URLSearchParams(
      Object.entries(q).filter(([, v]) => v != null) as [string, string][],
    )}`),

  factura: (id: string) => pedir<MiFactura>(`/mi/facturas/${id}`),

  informarPago: (id: string, cuerpo: InformarPago) =>
    pedir<MiPagoInformado>(`/mi/facturas/${id}/informar-pago`, {
      method: 'POST',
      body: JSON.stringify(cuerpo),
    }),

  pagosInformados: (q: { estado?: EstadoPagoInformado; pagina?: number } = {}) =>
    pedir<Pagina<MiPagoInformado>>(`/mi/pagos-informados?${new URLSearchParams(
      Object.entries(q).filter(([, v]) => v != null) as [string, string][],
    )}`),

  compras: () => pedir<MisCompras>('/mi/compras'),
};
```

---

## 3. Los catálogos, y cómo se leen

Ninguno se inventa del lado del front: todos vienen de la API y son cerrados. Lo
que sí es del front es **cómo se escriben en castellano**.

### `estado` de la cuenta

```ts
export const ESTADO_DE_CUENTA: Record<EstadoCuenta, string> = {
  al_dia: 'Estás al día',
  pendiente: 'Tenés facturas por pagar',
  proxima_a_vencer: 'Vence pronto',
  vencida: 'Tenés algo vencido',
};
```

Sale de **lo peor que haya sin pagar**, no del promedio ni de la última factura.
Es el mismo chip que ve el administrador, así que los dos hablan de lo mismo
cuando se llaman por teléfono.

### `estado` de una factura

```ts
export const ESTADO_DE_FACTURA: Record<EstadoFactura, string> = {
  pendiente: 'Pendiente',
  proxima_a_vencer: 'Vence pronto',
  vencida: 'Vencida',
  pagada: 'Pagada',
  anulada: 'Anulada',
};
```

⚠️ **`proxima_a_vencer` incluye el día del vencimiento.** El día que vence
todavía no está vencida: es el día de pagar. La ventana es de 7 días.

⚠️ **Un pago parcial no cambia el estado.** La factura de la que se cobró la
mitad y venció ayer sigue estando `vencida`. El estado dice si hay que pagar;
cuánto, lo dice `saldo`.

### `medio` de pago

```ts
export const MEDIO_DE_PAGO: Record<MedioDePago, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  deposito: 'Depósito',
  otro: 'Otro',
};
```

Es cerrado a propósito: "transf.", "transferencia bancaria" y "banco" son la
misma cosa escrita de tres maneras que después no se puede agrupar. `otro` está
para no obligar a mentir — lo que no entre se explica en `referencia` o `nota`.

### `tendencia`

```ts
export const TENDENCIA: Record<Tendencia, string> = {
  nueva: 'Empezaste a llevar esto',
  sube: 'Estás llevando más',
  estable: 'Igual que antes',
  baja: 'Estás llevando menos',
  parada: 'Hace tiempo que no lo llevás',
};
```

### Formatear plata y fechas

```ts
const PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

export const pesos = (n: number) => PESOS.format(n);

/** `"2026-08-07"` → `"07/08/2026"`. */
export const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'UTC',   // ⚠️ ver abajo
  }).format(new Date(`${iso}T00:00:00Z`));

/** `-14` → `"venció hace 14 días"`, `0` → `"vence hoy"`, `3` → `"en 3 días"`. */
export function cuandoVence(dias: number): string {
  if (dias < 0) {
    const n = Math.abs(dias);
    return `venció hace ${n} ${n === 1 ? 'día' : 'días'}`;
  }
  if (dias === 0) return 'vence hoy';
  return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
```

⚠️ **`timeZone: 'UTC'` no es opcional.** Las fechas del negocio son días de
calendario, no instantes. Sin fijar la zona, `new Date('2026-09-18')` se corre al
17 en cualquier huso al oeste de Londres, y una factura pasa a vencer un día
antes en la pantalla.

Los campos que **sí** son instantes —`informadoEn`, `resueltoEn`, `anuladaEn`,
`createdAt` de una notificación— vienen en ISO con hora y se formatean en la zona
local, como cualquier timestamp.

---

## 4. Pantalla 1 — Inicio: cuánto debo

```http
GET /api/mi/cuenta
```

Una consulta agregada, sin filtros ni paginado: no depende de qué esté mirando la
persona.

```json
{
  "facturas": 23,
  "facturasImpagas": 5,
  "totalFacturado": 1610300,
  "totalPagado": 1357850,
  "deuda": 252450,
  "vencido": 67550,
  "porVencer": 184900,
  "aReembolsar": 0,
  "proximoVencimiento": "2026-08-07",
  "diasParaVencer": -14,
  "estado": "vencida"
}
```

| Campo | Qué contesta |
|---|---|
| `deuda` | Lo que falta pagar en total |
| `vencido` | De esa deuda, lo que **ya se pasó de fecha** |
| `porVencer` | Y lo que todavía tiene plazo |
| `aReembolsar` | Lo que el negocio **te tiene que devolver**: plata que pagaste de facturas que después se anularon |
| `proximoVencimiento` | El vencimiento más urgente de lo que debés, o `null` si estás al día |
| `diasParaVencer` | Días hasta ese vencimiento |
| `facturas` / `facturasImpagas` | Cuántas tenés y cuántas siguen sin saldarse. **No cuentan las anuladas** |
| `totalFacturado` / `totalPagado` | Desde siempre |

**`vencido + porVencer = deuda`, siempre.** Se calcula en el servidor a
propósito: restar plata en el navegador es la forma más fácil de que el
encabezado y la lista no cierren.

⚠️ **`aReembolsar` va para el otro lado que `deuda`.** No se restan nunca en la
misma línea: son dos platas distintas, una que se debe y otra que se tiene a
favor. Mostralo como una fila aparte, con otro color, y solo si es mayor que
cero.

### El maquetado

```
┌─ INICIO ──────────────────────────────────────────┐
│  Debés                                             │
│  $ 252.450                          [ vencida ]   │   GET /mi/cuenta
│  $ 67.550 vencido · $ 184.900 por vencer          │
│  Lo más urgente venció hace 14 días               │
│                                                    │
│  ── Tus facturas ──────────────── [ ver todas ] ──│   GET /mi/facturas?limite=5
│  #1070  05/08   4× Pack 6 gaseosas +2             │
│         $ 69.200 · debés $ 40.700  [ pendiente ]  │
│  #1069  08/07   12× Bidón 20L +2                  │
│         $ 68.650                      [ pagada ]  │
└────────────────────────────────────────────────────┘
```

Las dos llamadas van **en paralelo**: son preguntas distintas y ninguna depende
de la otra.

```ts
const [cuenta, ultimas] = await Promise.all([
  miApi.cuenta(),
  miApi.facturas({ limite: 5 }),
]);
```

---

## 5. Pantalla 2 — Mis facturas

```http
GET /api/mi/facturas?estado=vencida&pagina=1&limite=20
```

Ordenadas por número, la última primero.

| Query | Valores |
|---|---|
| `estado` | `pendiente`, `proxima_a_vencer`, `vencida`, `pagada`, `anulada` |
| `desde` / `hasta` | `AAAA-MM-DD`, por **fecha de emisión** y con los dos extremos incluidos |
| `pagina` | Desde 1 |
| `limite` | 1 a 100, por defecto 20 |

```json
{
  "datos": [
    {
      "id": "ce5f8070-9329-4367-a9db-aee0d5b743f8",
      "numero": 1070,
      "fechaEmision": "2026-08-05",
      "fechaFin": "2026-09-04",
      "estado": "pendiente",
      "diasParaVencer": 14,
      "total": 69200,
      "pagado": 28500,
      "saldo": 40700,
      "anulada": false,
      "aReembolsar": 0,
      "items": 3,
      "pagos": 1,
      "detalle": "4× Pack 6 gaseosas 500ml +2"
    }
  ],
  "total": 3,
  "pagina": 1,
  "limite": 20,
  "paginas": 1
}
```

- `detalle` es el primer renglón más `+N` si hay más. Alcanza para reconocer la
  factura sin pedir el detalle entero.
- `items` y `pagos` son **cuántos hay**, no los renglones ni los cobros.
- `total` es cuántas hay **con el filtro puesto**, no cuántas tenés.
- Sin resultados, la respuesta es `{ "datos": [], "total": 0, "paginas": 0, … }`.
  **`paginas: 0`, no `1`**: no hay ninguna página que mostrar.

⚠️ **Los filtros filtran la lista, no lo que debés.** El resumen de
`GET /mi/cuenta` es siempre el de la cuenta entera: mirar solo las vencidas no
puede cambiar cuánto se debe. Si la pantalla muestra las dos cosas, el encabezado
**no se recalcula** al filtrar.

⚠️ **Los filtros por fecha son por emisión, no por vencimiento.** "Qué me
facturaron en julio" se pide con `desde`/`hasta`; "qué está vencido" se pide con
`estado`.

---

## 6. Pantalla 3 — Una factura

```http
GET /api/mi/facturas/:id
```

```json
{
  "id": "571ced0b-6010-4612-b4e6-f71c6381229d",
  "numero": 1069,
  "fechaEmision": "2026-07-08",
  "fechaFin": "2026-08-07",
  "estado": "pagada",
  "diasParaVencer": -14,
  "total": 68650,
  "pagado": 68650,
  "saldo": 0,
  "pagadaEn": "2026-08-12",
  "anulada": false,
  "anuladaEn": null,
  "aReembolsar": 0,
  "reembolsado": false,
  "notas": "Entregar por la mañana",
  "items": [
    {
      "id": "ebcb3400-7d75-4111-b7f1-acd6e1fc6bbb",
      "producto": "Bidón 20L",
      "cantidad": 12,
      "precioUnitario": 3250,
      "subtotal": 39000,
      "especie": { "id": "dd1436d7-…", "nombre": "Agua" }
    }
  ],
  "pagos": [
    { "id": "2c860d73-…", "monto": 68650, "fecha": "2026-08-12" }
  ]
}
```

- `pagadaEn` es el día del cobro que la terminó de saldar. `null` mientras deba
  algo.
- `notas` es la observación de la venta, la misma que está impresa en el papel.
  Puede ser `null`.
- `especie` es la etiqueta con la que se agrupa el producto. Es la misma que usa
  "qué compro" (§10), así que se puede llevar de una pantalla a la otra.
- Los `items` vienen **en el orden en que se cargaron**, y los `pagos` **del más
  viejo al más nuevo**: se leen como un extracto.

### El caso de la anulada

⚠️ **Una anulada siempre tiene `saldo: 0`**: dejó de ser una deuda el día que se
dio de baja. Si tenía cobros, esa plata aparece en `aReembolsar` y hay que
mostrarla como **a favor**, nunca restando de la deuda.

```
anulada && aReembolsar > 0 && !reembolsado  → "Te devolvemos $ 21.450"
anulada && reembolsado                      → "Ya te lo devolvimos"
anulada && aReembolsar === 0                → solo el sello "Anulada"
```

**El motivo de la anulación no viene**, y no es un olvido: es una nota escrita
para adentro (§13).

### El maquetado

```
┌─ FACTURA #1070 ───────────────────────────────────┐
│  Vence el 04/09/2026 — en 14 días  [ pendiente ]  │   GET /mi/facturas/:id
│                                                    │
│  4× Pack 6 gaseosas 500ml   $ 7.150   $ 28.600    │
│  8× Bolsa de hielo 3kg      $ 2.500   $ 20.000    │
│  4× Vaso térmico            $ 5.150   $ 20.600    │
│                              Total    $ 69.200    │
│                                                    │
│  Pagos anotados                                   │
│  21/08/2026                           $ 28.500    │
│                              Debés    $ 40.700    │
│                                                    │
│  ⏳ Avisaste $ 12.000 el 20/08, sin confirmar     │   ← de GET /mi/pagos-informados
│                                                    │
│  [ Avisar que pagué ]        [ Descargar PDF ]    │
└────────────────────────────────────────────────────┘
```

Ese renglón de *"avisaste …, sin confirmar"* hace dos cosas: evita que la persona
informe de más (§8) y explica por qué la deuda no bajó. Sale de filtrar
`GET /mi/pagos-informados?estado=pendiente` por `factura.id`.

---

## 7. El comprobante en PDF

```http
GET /api/mi/facturas/:id/pdf
```

Devuelve el PDF, no JSON:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="factura-1069.pdf"
Content-Length: 2415
```

El papel dice lo mismo que la pantalla —mismo número, mismo detalle, mismo
total— porque lo dibuja el mismo servicio a partir de la misma factura.

⚠️ **`window.open()` sobre esta URL no sirve**: no lleva el header
`Authorization` y la API contesta `401`. Hay que pedirla con `fetch`, leer el
`blob` y abrirlo:

```ts
export async function descargarFactura(id: string, numero: number) {
  const respuesta = await fetch(`${API}/mi/facturas/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token()}` },
  });

  if (!respuesta.ok) {
    const { message } = (await respuesta.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new ApiError(respuesta.status, message ?? 'No pudimos bajar el PDF.');
  }

  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `factura-${numero}.pdf`;
  a.click();

  // Sin esto el blob queda en memoria hasta que se recargue la página.
  URL.revokeObjectURL(url);
}
```

En React Native no hay `URL.createObjectURL`: se baja el archivo con
`react-native-blob-util` (o equivalente) mandando el mismo header y se abre con
el visor del sistema.

Lo que lleva el papel: encabezado del negocio, datos de la persona, el detalle,
el total, los pagos anotados y el saldo. **El estado va con todas las letras** y
no con un color —`PAGADA`, `VENCIDA — venció hace 14 días.`, `ANULADA — esta
factura fue dada de baja y no hay que pagarla.`— para que impreso en blanco y
negro siga diciendo lo mismo.

---

## 8. Pantalla 4 — Avisar que pagué

```http
POST /api/mi/facturas/:id/informar-pago
```

### ⚠️ Lo primero, porque cambia el diseño de la pantalla

**Esto no descuenta nada.** Deja un aviso en la bandeja del panel; la deuda baja
recién cuando un administrador lo confirma contra el resumen del banco. Si el
aviso descontara solo, cualquiera saldaría su cuenta escribiendo un número en un
formulario.

La pantalla **tiene que decirlo**:

- el botón es **"Avisar que pagué"**, no "Pagar";
- después del `201`, el estado que se muestra es **"Avisado — esperando
  confirmación"**;
- **la deuda no cambia**, y hay que decir por qué: *"la vamos a confirmar y te
  avisamos"*;
- no se muestra ningún spinner de "procesando pago". No hay pago que procesar.

### El body

```json
{
  "monto": 30000,
  "medio": "transferencia",
  "fecha": "2026-08-19",
  "referencia": "OP-88213345",
  "nota": "Pagué la mitad ahora"
}
```

| Campo | | |
|---|---|---|
| `monto` | obligatorio | Hasta dos decimales, mayor que cero |
| `medio` | obligatorio | Uno de los cinco del catálogo (§3) |
| `fecha` | opcional | `AAAA-MM-DD`. Sin esto, hoy |
| `referencia` | opcional | Hasta 120 caracteres |
| `nota` | opcional | Hasta 500 caracteres |

**`medio` es un `<select>`**, no un input de texto.

**`fecha` existe porque la transferencia pudo salir el viernes y el aviso llegar
el lunes.** La fecha del cobro es la del movimiento: si se guardara la del aviso,
una factura pagada en fecha figuraría pagada tarde. El date picker va con
**máximo hoy** y **mínimo `factura.fechaEmision`**.

**`referencia` es opcional pero pedila.** Es lo único que le permite al negocio
encontrar el movimiento; sin ella, confirmar el aviso obliga a revisar el resumen
del banco a ojo. Un placeholder con un ejemplo real (`ej. OP-88213345`) ayuda más
que un asterisco.

### El formulario

```
Monto        [ 40.700         ]  ← máximo: saldo − lo ya informado
Medio        [ Transferencia ▾]  ← las 5 del catálogo
Fecha        [ 21/08/2026     ]  ← máximo: hoy; mínimo: la emisión
Referencia   [ ej. OP-88213345 ]
Nota         [                 ]

⚠️ Avisar no descuenta la deuda. Un administrador lo confirma
   contra el banco y te avisamos.

              [ Avisar que pagué ]
```

El máximo del input de monto sale de una resta que el front **sí** puede hacer,
porque los dos números ya vienen calculados:

```ts
const yaInformado = avisosPendientes
  .filter((a) => a.factura.id === factura.id)
  .reduce((suma, a) => suma + a.monto, 0);

const maximo = factura.saldo - yaInformado;
```

### Response — 201 Created

```json
{
  "id": "3bd79309-7dda-458b-b938-d79a2b287ffb",
  "estado": "pendiente",
  "monto": 30000,
  "fecha": "2026-08-21",
  "medio": "transferencia",
  "referencia": "OP-88213345",
  "nota": "Pagué la mitad ahora",
  "informadoEn": "2026-08-21T20:28:51.407Z",
  "resueltoEn": null,
  "motivoRechazo": null,
  "montoCobrado": null,
  "factura": {
    "id": "ce5f8070-…", "numero": 1070,
    "total": 69200, "saldo": 69200, "fechaFin": "2026-09-04"
  }
}
```

Fijate que `factura.saldo` sigue siendo 69.200: **el aviso no lo movió**. Es la
confirmación de que la pantalla no tiene que descontar nada.

### Los errores, y qué hacer con cada uno

| Código | `message` | Qué hacer |
|---|---|---|
| `404` | `No encontramos esa factura.` | No existe **o no es tuya**. Volver a la lista |
| `400` | `Esta factura está anulada: no hay nada que pagar.` | No mostrar el botón en anuladas |
| `400` | `Esta factura ya está paga.` | No mostrar el botón con `saldo === 0` |
| `400` | `El pago supera el saldo de esta factura: debe $ 40.700,00.` | Poner el saldo como máximo del input |
| `400` | `Ya avisaste $ 30.000,00 sin confirmar de esta factura, así que queda $ 39.200,00 por informar.` | Restar lo ya informado del máximo |
| `400` | `La fecha del pago no puede ser futura: poné el día en que lo hiciste.` | `max` en el date picker |
| `400` | `Esa fecha es anterior a la factura, que se emitió el 08/07/2026.` | `min` en el date picker |
| `400` | `Medio de pago inválido: transferencia, efectivo, mercado_pago, deposito, otro.` | Usar el `<select>` |
| `400` | `El monto tiene que ser mayor que cero.` | |
| `400` | `El monto admite hasta dos decimales.` | |

El quinto merece un párrafo: **lo ya informado y sin resolver cuenta como si
estuviera cobrado**. Sin esa regla, avisar tres veces el saldo entero pasaría las
tres, y del otro lado quedaría una bandeja con tres avisos de los que solo uno
puede ser cierto. Si la pantalla ya muestra los avisos pendientes de esa factura
(§6), este error casi no aparece.

Los ocho errores llegan con el texto listo: van tal cual al cartel del
formulario. Ninguno necesita que el front arme un mensaje.

---

## 9. Pantalla 5 — Mis avisos de pago

```http
GET /api/mi/pagos-informados?estado=pendiente&pagina=1&limite=20
```

La pantalla que contesta *"avisé que pagué, ¿y?"*. El último primero. `estado`,
`pagina` y `limite` son opcionales.

```json
{
  "datos": [
    {
      "id": "920b9de1-…",
      "estado": "rechazado",
      "monto": 40700,
      "fecha": "2026-08-19",
      "medio": "mercado_pago",
      "referencia": "MP-99999",
      "nota": null,
      "informadoEn": "2026-08-21T20:30:29.590Z",
      "resueltoEn": "2026-08-21T20:30:29.642Z",
      "motivoRechazo": "No figura ningún movimiento con esa referencia en Mercado Pago.",
      "montoCobrado": null,
      "factura": { "id": "ce5f8070-…", "numero": 1070, "total": 69200, "saldo": 40700, "fechaFin": "2026-09-04" }
    },
    {
      "id": "3bd79309-…",
      "estado": "confirmado",
      "monto": 30000,
      "montoCobrado": 28500,
      "motivoRechazo": null,
      "resueltoEn": "2026-08-21T20:29:12.920Z",
      "factura": { "numero": 1070, "saldo": 40700, "…": "…" }
    }
  ],
  "total": 2, "pagina": 1, "limite": 20, "paginas": 1
}
```

Tres campos hacen esta pantalla:

- **`motivoRechazo`** es el más importante de todos. Es lo único que explica por
  qué la persona avisó que pagó y le sigue figurando la deuda. **Mostralo
  entero**, no truncado, no detrás de un "ver más".
- **`montoCobrado`** es lo que se anotó de verdad, que puede no ser lo que se
  informó: dijo $30.000 y entraron $28.500. Cuando difiere de `monto`, **mostrá
  los dos** — la diferencia es justamente lo que explica por qué el saldo no bajó
  lo esperado. Es `null` mientras no esté confirmado.
- **`factura.saldo`** es el saldo de **hoy**, no el de cuando avisó.

| `estado` | Cómo se lee | Qué mostrar |
|---|---|---|
| `pendiente` | "Esperando confirmación" | El monto informado y desde cuándo |
| `confirmado` | "Tomado" | `montoCobrado`, y si difiere, también `monto` |
| `rechazado` | "No se tomó" | `motivoRechazo` completo |

```
┌─ MIS AVISOS ──────────────────────────────────────┐
│  ✗ No se tomó · Factura #1070                     │
│    Avisaste $ 40.700 el 19/08 por Mercado Pago    │
│    "No figura ningún movimiento con esa           │
│     referencia en Mercado Pago."                  │
│                                                    │
│  ✓ Tomado · Factura #1070                         │
│    Avisaste $ 30.000 · se anotaron $ 28.500       │
│                                                    │
│  ⏳ Esperando · Factura #1071                      │
│    Avisaste $ 12.000 el 20/08 por transferencia   │
└────────────────────────────────────────────────────┘
```

---

## 10. Pantalla 6 — Qué compro

```http
GET /api/mi/compras
```

La única métrica que el cliente ve **de sí mismo**, y va sin nada de cómo paga:
la tasa de cumplimiento, las demoras y el fiado son el juicio que el negocio hace
sobre él, y se quedan del lado del panel
([`flujo_metricas.md`](./flujo_metricas.md)).

```json
{
  "hoy": "2026-08-21",
  "ventanaDias": 90,
  "facturado": 1610300,
  "compras": {
    "primeraCompra": "2025-11-03",
    "ultimaCompra": "2026-08-18",
    "diasSinComprar": 3,
    "diasEntreCompras": 13,
    "comprasPorMes": 2.41,
    "antiguedadDias": 291
  },
  "especies": [
    {
      "especieId": "81c99a47-…",
      "nombre": "Gaseosa",
      "cantidad": 131,
      "monto": 460150,
      "facturas": 8,
      "participacion": 28.6,
      "ultimaCompra": "2026-08-05",
      "diasSinComprar": 16,
      "reciente": { "cantidad": 10, "monto": 54700 },
      "previo": { "cantidad": 0, "monto": 0 },
      "variacionCantidad": null,
      "variacionMonto": null,
      "tendencia": "sube"
    }
  ]
}
```

`especies` viene **de mayor a menor plata** y las `participacion` suman 100, así
que sirve directo para una barra apilada o una lista con porcentajes.

| Campo de la especie | |
|---|---|
| `cantidad` / `monto` | **Desde siempre**, no de la ventana |
| `facturas` | En cuántas facturas apareció |
| `participacion` | Qué parte de `facturado` se fue en esto, de 0 a 100 |
| `ultimaCompra` | La última vez que la llevó |
| `diasSinComprar` | Hace cuánto que no lleva **esta especie**. No es lo mismo que `compras.diasSinComprar`: se puede haber comprado ayer y hace ocho meses que no llevar gaseosa |
| `reciente` / `previo` | Los últimos `ventanaDias` (90) contra los 90 anteriores |
| `variacionCantidad` | Cuánto cambió, en %, con un decimal |

⚠️ **`variacionCantidad: null` no es 0%.** Es que en la ventana anterior no llevó
ninguna, así que no hay contra qué comparar. Para ese caso está el chip `nueva` —
pintar un `0%` o un `∞` ahí es un bug.

⚠️ **La lista trae también lo que dejó de llevar**, en cero y con `parada`. No lo
filtres por `reciente.cantidad === 0`: una lista que solo muestra lo que se
compra no puede mostrar lo que se dejó de comprar, que es la mitad de para qué
sirve la pantalla.

### Los `null` de `compras`

| Campo en `null` | Qué significa | Qué mostrar |
|---|---|---|
| `diasEntreCompras` | Tiene una sola factura. Entre una compra y ninguna otra no hay intervalo que promediar | Ocultar la fila |
| `comprasPorMes` | Es cliente hace menos de un mes. Tres compras en cuatro días no son "22 compras por mes" | Ocultar la fila |
| **Todos en `null` y `especies: []`** | Todavía no compró nada | Estado vacío con un texto, **no** una tabla de ceros |

---

## 11. La campanita

Los avisos siguen saliendo por `GET /api/notificaciones`
([`notificaciones.md`](./notificaciones.md)). Los avisos de pago suman **tres
`tipo` nuevos**, y uno de ellos no es para el cliente:

| `tipo` | Le llega a | Cuándo |
|---|---|---|
| `deuda_vencida` | el cliente | El administrador aprieta "avisar deuda" |
| `anuncio` | todos los clientes | El administrador publica algo |
| `pago_informado` | **el administrador** | Un cliente avisó que pagó. Es el único aviso que dispara un cliente |
| `pago_confirmado` | el cliente | Se le tomó el pago |
| `pago_rechazado` | el cliente | No se le tomó, con el motivo en el `mensaje` |

En los tres de pago, `datos` tiene esta forma:

```json
{
  "pagoInformadoId": "3bd79309-…",
  "facturaId": "ce5f8070-…",
  "facturaNumero": 1070,
  "monto": 28500,
  "fecha": "2026-08-21"
}
```

Alcanza para que tocar el aviso lleve directo a la factura o al aviso de pago sin
leer el texto:

```ts
function alTocar(aviso: Notificacion) {
  switch (aviso.tipo) {
    case 'pago_confirmado':
    case 'pago_rechazado':
      return irA(`/facturas/${(aviso.datos as DatosDePago).facturaId}`);
    case 'deuda_vencida':
      return irA('/facturas?estado=vencida');
    case 'anuncio':
      return; // no lleva a ningún lado
    case 'pago_informado':
      return; // no le llega a un cliente
  }
}
```

⚠️ **En `pago_confirmado`, `monto` es lo que se anotó**, no lo que se informó.

⚠️ **`datos` tiene una forma distinta según el `tipo`.** Elegí por `tipo`, nunca
por qué campos vienen.

Los avisos de pago **se apilan y nunca se pisan**: cada uno habla de un aviso
concreto, así que reemplazar *"no tomamos tu pago del 3"* con *"tomamos tu pago
del 10"* borraría la única explicación de una deuda vieja.

---

## 12. Cuándo refrescar qué

Es la parte que más fácil se hace mal, porque hay un caso contraintuitivo:
**avisar un pago no cambia la deuda**, así que refrescar la cuenta después de
informar muestra el mismo número y parece que no funcionó.

| Pasó esto | Refrescar | **No** refrescar |
|---|---|---|
| Se informó un pago (`201`) | `pagos-informados`, el detalle de esa factura | `cuenta` — no cambió, y refrescarla hace parecer que falló |
| Llegó un aviso `pago_confirmado` | `cuenta`, `facturas`, esa factura, `pagos-informados` | |
| Llegó un aviso `pago_rechazado` | `pagos-informados` | `cuenta` — la deuda ya estaba entera |
| Se abrió la app | `cuenta` + primera página de `facturas` + `noLeidas` | |
| Se volvió a la lista desde el detalle | Nada: la lista no cambió sola | |

**El cliente se entera de que le tomaron el pago por la campanita.** No hay
websocket ni push desde el backend: lo que hay es `GET /api/notificaciones`, y
alcanza con pedirlo al abrir la app y cada tanto mientras está abierta. Un
`noLeidas` que sube es la señal para refrescar la cuenta.

```ts
async function despuesDeAvisar(facturaId: string) {
  await Promise.all([
    refrescar('pagos-informados'),
    refrescar(['factura', facturaId]),
  ]);
  // Ojo con la tentación de agregar `refrescar('cuenta')` acá: la deuda no
  // cambió, así que la pantalla se ve igual y parece que el aviso falló.
}
```

---

## 13. El muro — lo que el cliente no ve

No es una lista de campos que faltan: es lo que **deliberadamente** no cruza. Si
alguno aparece en una respuesta de `/mi`, es un bug del backend y vale
reportarlo.

| Del panel | Por qué se queda ahí |
|---|---|
| `seLeFia`, `motivoSinFiado` | Que alguien se entere por la API de que le cortaron el fiado, y con qué motivo escrito para adentro, sería peor que cualquier error de cálculo |
| `creadaPor`, `anuladaPor`, `reembolsadoPor`, `registradoPor` | Son cuentas de administradores, con su correo. Qué empleado hizo qué es información del negocio |
| `motivoAnulacion` | Nota interna: *"le facturé al cliente equivocado"*. Que la factura figure anulada, sí; el motivo, no |
| `pagos[].nota` | Lo que el mostrador escribe al cobrar: *"me lo dejó el padre"* |
| `cumplimiento`, `comoPaga`, las demoras | El juicio que el negocio hace sobre él |
| `resueltoPor` de un aviso de pago | Idem: importa si se tomó, y si no, por qué |

Lo que **sí** cruza y podría sorprender: `notas` de la factura (es la observación
de la venta, la misma que está impresa en el papel que se llevó) y `especie` de
cada renglón (es la etiqueta con la que se agrupa, la misma de §10).

**No hace falta filtrar nada del lado del front.** El backend ya recorta; esta
tabla está para que se note si algún día deja de hacerlo.

---

## 14. Que los números cierren

Invariantes que la pantalla puede chequear sola. Si alguna no da, es un bug del
backend y vale reportarlo con los dos números.

| Tiene que dar |
|---|
| `cuenta.vencido + cuenta.porVencer = cuenta.deuda` |
| `cuenta.totalFacturado − cuenta.totalPagado = cuenta.deuda` |
| En cada factura, `total − pagado = saldo` (salvo anuladas, que dan `saldo: 0`) |
| La suma de `subtotal` de los `items` = `total` |
| La suma de `monto` de los `pagos` = `pagado` |
| Las `participacion` de `compras.especies` suman 100 (± redondeo) |
| Informar un pago **no cambia** `cuenta.deuda`. Confirmarlo, sí |
| `cuenta.facturasImpagas === 0` ⟺ `cuenta.proximoVencimiento === null` |

---

## 15. Estados vacíos, de carga y de error

Cada pantalla tiene tres estados además del feliz, y ninguno es "una tabla de
ceros".

| Pantalla | Vacío | Cómo se detecta |
|---|---|---|
| Inicio | "Estás al día" | `estado === 'al_dia'` (no `deuda === 0`, que es lo mismo pero se lee peor) |
| Inicio, sin historia | "Todavía no tenés facturas" | `facturas === 0` |
| Mis facturas | "No hay facturas con ese filtro" | `total === 0` **con filtro puesto** |
| Mis facturas, sin filtro | "Todavía no tenés facturas" | `total === 0` **sin filtro** |
| Mis avisos | "Todavía no avisaste ningún pago" | `total === 0` |
| Qué compro | "Todavía no compraste nada" | `especies.length === 0` |

Son dos textos distintos para "no hay nada": **"no hay con este filtro"** invita a
sacar el filtro, **"todavía no tenés"** no. Confundirlos hace que la persona crea
que perdió sus facturas.

Para la carga, un esqueleto de la forma final. Para el error, el `message` de la
API y un botón de reintentar — salvo en `401`, que va al login sin preguntar.

---

## 16. Checklist antes de dar por cerrado

**Lo que más se rompe**

- [ ] El botón dice **"Avisar que pagué"**, no "Pagar", y después de mandarlo la
      deuda **sigue igual** y la pantalla lo explica.
- [ ] `motivoRechazo` se muestra entero, no truncado.
- [ ] Cuando `montoCobrado ≠ monto`, se muestran los dos.
- [ ] `proximoVencimiento: null` se muestra como "estás al día", no como fecha
      vacía ni como `-`.
- [ ] `diasParaVencer` negativo se lee "venció hace 14 días", no "quedan −14".
- [ ] `variacionCantidad: null` no se pinta como `0%` ni como `∞`: es el chip
      `nueva`.
- [ ] Las especies con `tendencia: "parada"` aparecen en la lista.
- [ ] `aReembolsar > 0` se muestra como plata **a favor**, nunca restando de la
      deuda.

**Lo mecánico**

- [ ] El PDF se pide con `fetch` + `blob`, no con `window.open`.
- [ ] Las fechas `AAAA-MM-DD` se formatean con `timeZone: 'UTC'`.
- [ ] El `401` de cualquier endpoint manda al login.
- [ ] El body no lleva campos de más (`forbidNonWhitelisted`).
- [ ] El `message` de la API se muestra tal cual, sin traducir ni reescribir.
- [ ] El máximo del input de monto es `saldo − lo ya informado`.
- [ ] El date picker del aviso tiene `max = hoy` y `min = fechaEmision`.
- [ ] Los filtros de la lista **no** recalculan el encabezado de la cuenta.
- [ ] Cada pantalla tiene su estado vacío, y "no hay con este filtro" está
      separado de "todavía no tenés".
- [ ] Ninguna respuesta de `/mi` contiene `seLeFia`, `motivoAnulacion`,
      `creadaPor` ni un correo de administrador.

---

## 17. Probarlo sin la app

```bash
TOKEN="<el JWT de un cliente>"
API=http://localhost:3000/api

curl -s -H "Authorization: Bearer $TOKEN" $API/mi/cuenta
curl -s -H "Authorization: Bearer $TOKEN" "$API/mi/facturas?estado=vencida"
curl -s -H "Authorization: Bearer $TOKEN" $API/mi/compras
curl -s -H "Authorization: Bearer $TOKEN" $API/mi/pagos-informados

# el PDF
curl -s -o factura.pdf -H "Authorization: Bearer $TOKEN" \
  $API/mi/facturas/<id>/pdf

# avisar un pago
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"monto":30000,"medio":"transferencia","referencia":"OP-88213345"}' \
  $API/mi/facturas/<id>/informar-pago
```

Los casos que conviene probar además del feliz:

| Caso | Esperado |
|---|---|
| Sin header `Authorization` | `401` |
| Una factura de otro cliente | `404`, **no** `403` |
| Un id que no es UUID | `400` con `Validation failed (uuid is expected)` |
| Informar más que el saldo | `400` con el saldo en el mensaje |
| Informar dos veces el saldo entero | `400`, el segundo, diciendo cuánto queda |
| Informar con `"fecha":"2099-01-01"` | `400` |
| Informar con `"medio":"bitcoin"` | `400` con los cinco válidos |
| Informar y volver a pedir `/mi/cuenta` | La deuda **no cambió** |

Para tener datos con los que probar, el backend trae un seed a medida:

```bash
npm run db:seed:cliente -- tu@correo.com
```

Deja diez facturas —dos pendientes y ocho pagadas— con dieciséis productos en
once especies. Está documentado en el `README.md` del repo.
