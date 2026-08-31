# Panel de administración: el catálogo de especies — guía para el front

Una **especie** es la etiqueta con la que se agrupa lo que se vende.

```
12 Coca de 500ml     → especie: Gaseosa
12 Quilmes de 1lt    → especie: Cerveza
Envío a domicilio    → especie: Envío
```

El producto lo escribe el mostrador y cambia de forma cada vez —"12 Coca 500ml",
"Coca 500", "coca-cola 500cc"—, así que sumar por ese texto no dice nada. La
especie sí: es lo que va a permitir contestar *"¿cuánta gaseosa vendí en
julio?"*.

**El catálogo arranca vacío y lo escribe el administrador.** No viene con nada
cargado a propósito: las especies de una distribuidora de agua no son las de una
tienda de ropa, y una lista genérica se llena de categorías que nadie usa.

Solo administrador y super admin.

---

## 1. La regla, en una línea

**Cada renglón de una factura lleva una especie, y es obligatoria.**

Eso toca dos pantallas:

| Pantalla | Qué hace |
|----------|----------|
| **Catálogo** (esta guía) | listar, crear, renombrar y borrar especies |
| **Nueva factura** ([`flujo_pagos.md`](./flujo_pagos.md#7-pantalla-4--nueva-factura)) | elegir una por renglón — **o crear una ahí mismo** |

Lo segundo es lo que hace que la regla sea vivible. Obligar a poner especie y a
la vez obligar a salir de la pantalla a crearla terminaría siempre igual: un
catálogo con una sola especie llamada "varios".

---

## 2. Los endpoints

| Qué | Endpoint |
|-----|----------|
| El catálogo | `GET /api/admin/especies` |
| Crear una | `POST /api/admin/especies` |
| Renombrarla | `PATCH /api/admin/especies/:id` |
| Borrarla | `DELETE /api/admin/especies/:id` |

Y el quinto camino, que no está acá: **crear una especie dentro del alta de una
factura**, mandándola en el renglón que la necesita (§5).

---

## 3. El catálogo

```http
GET /api/admin/especies
GET /api/admin/especies?q=gase
```

```json
{
  "total": 4,
  "datos": [
    { "id": "dd14…", "nombre": "Agua",     "usos": 7, "createdAt": "2026-08-21T14:18:01.594Z" },
    { "id": "24a1…", "nombre": "Cerveza",  "usos": 0, "createdAt": "2026-08-21T14:21:00.956Z" },
    { "id": "81c9…", "nombre": "Envío",    "usos": 2, "createdAt": "2026-08-21T14:18:01.608Z" },
    { "id": "8d01…", "nombre": "Gaseosa",  "usos": 1, "createdAt": "2026-08-21T14:18:01.604Z" }
  ]
}
```

| Campo | Qué es |
|-------|--------|
| `nombre` | Como se escribió. Es lo que se muestra |
| `usos` | **En cuántos renglones de factura se usó.** Dice si la especie sirve o quedó de un experimento, y es lo que decide si se puede borrar |

**Alfabético y sin paginado.** Es lo que llena el selector de la factura: son
decenas, y pedirlo de a páginas mientras alguien tipea sería una consulta por
tecla. Traelo una vez al abrir el formulario y filtrá en memoria.

`?q=` filtra por nombre **sin distinguir mayúsculas ni tildes**: `limon`
encuentra a `Limón`. Es la diferencia con el buscador de clientes, que sí
distingue tildes — acá la versión normalizada del nombre ya está guardada.

---

## 4. Crear, renombrar y borrar

### Crear

```http
POST /api/admin/especies
{ "nombre": "Gaseosa" }
```

Responde `201` con la especie, ya con `usos: 0`.

| Error | Cuándo |
|-------|--------|
| `400` | Menos de 2 letras, más de 60, o vacío |
| `409` | Ya existe una que se escribe igual |

### Renombrar

```http
PATCH /api/admin/especies/:id
{ "nombre": "Gaseosas" }
```

⚠️ **Cambia también en las facturas viejas**, y es a propósito. La especie es una
clasificación, no lo que se cobró: corregir "gaseoza" tiene que arreglar los
renglones que ya se escribieron con el error. Lo que queda congelado en la
factura es el producto y el precio.

Cambiarle solo las mayúsculas a la misma especie —"gaseosa" → "Gaseosa"— **no**
es un choque consigo misma: eso se puede arreglar siempre.

### Borrar

```http
DELETE /api/admin/especies/:id     → 204
```

Solo la que **no se usó nunca**. Es la salida para la que se creó por error, no
una forma de limpiar el catálogo.

| Error | Cuándo |
|-------|--------|
| `404` | No existe |
| `409` | Está en uso: `"Gaseosa" está en 7 renglones de factura, así que no se puede borrar. Si el nombre está mal, cambiáselo.` |

Borrar una especie en uso dejaría renglones sin clasificar y facturas que ya no
se pueden explicar. Mostrá el botón deshabilitado cuando `usos > 0` — el dato ya
viene en el listado, así que no hace falta pedirlo para saberlo.

---

## 5. La especie en la factura

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
factura. Si la factura falla por cualquier motivo, la especie no queda dando
vueltas.

### Los errores del renglón

Todos son `400`, con el `message` de siempre:

| Qué mandaste | `message` |
|--------------|-----------|
| Ninguna de las dos | `Cada renglón necesita una especie: mandá especieId si ya está en el catálogo, o especie con el nombre para crearla.` |
| Las dos | `Cada renglón lleva una sola especie: o la elegís del catálogo (especieId) o la creás por nombre (especie), no las dos.` |
| Un `especieId` que no es un uuid | `La especie elegida no es válida…` |
| Un `especieId` de una especie borrada | `Una de las especies del detalle ya no está en el catálogo. Recargá la lista de especies y volvé a intentar.` |

Las dos juntas no es "por las dudas": es un renglón que dice dos cosas
distintas, y elegir una en silencio guardaría la especie que el administrador no
vio.

### Dos renglones con la misma especie nueva

No crean dos especies. Dentro de la misma factura se deduplican, y **se
comparan normalizadas**:

```json
"items": [
  { "producto": "12 Quilmes de 1lt", "especie": "Cerveza",   "…": "…" },
  { "producto": "6 Quilmes de 1lt",  "especie": "  cerveza ", "…": "…" }
]
```

Las dos terminan apuntando a la misma especie, la que se creó con el primer
renglón. Y si `Cerveza` ya existía en el catálogo, no se crea nada: se usa esa.

---

## 6. Cuándo dos especies son la misma

Lo único que la base no deja repetir es el nombre **normalizado**: en
minúsculas, sin tildes y sin espacios de más.

| Se escribió | Es la misma que |
|-------------|-----------------|
| `Gaseosa` · `GASEOSA` · `  gaseosa  ` · `Gaséosa` | `gaseosa` |
| `Agua  mineral` | `agua mineral` |

Lo que se guarda y se muestra es **como lo escribió la persona**; lo normalizado
es solo para comparar. Por eso crear "GASEOSA" cuando ya existe "Gaseosa" da
`409` y no una segunda fila.

**Los plurales no se tocan**: `gaseosa` y `gaseosas` son dos especies distintas.
Adivinar eso terminaría uniendo cosas que no van juntas, y el catálogo es lo
bastante chico como para que el administrador vea el duplicado y renombre.

---

## 7. Qué se congela y qué no

Es la distinción que conviene tener clara antes de maquetar la factura:

| Dato del renglón | Cambia si se edita después | Por qué |
|------------------|----------------------------|---------|
| `producto` | ❌ no | Es lo que la persona leyó cuando compró |
| `precioUnitario` | ❌ no | Es lo que se le cobró |
| `especie` | ✅ **sí** | Es una clasificación, no un hecho de esa venta |

Una factura de marzo tiene que seguir diciendo lo que decía en marzo. Pero si en
mayo se descubre que la especie estaba mal escrita, la de marzo también tiene que
quedar bien: si no, el agrupado sigue partido en dos para siempre.

---

## 8. "Sin especie (histórico)"

Las facturas emitidas **antes** de que existiera el catálogo tienen esa especie.
Se la puso la migración: la especie es obligatoria y esos renglones ya estaban
escritos, así que había que ponerles algo.

No es un error ni un estado a arreglar. Se puede renombrar desde el catálogo si
molesta, pero **no la uses en facturas nuevas**: es una etiqueta de mudanza, no
una especie del negocio. En una base recién instalada no existe.

---

## 9. Cómo se arma la pantalla

### El renglón de la factura

```
┌──────────────────────────────────────────────────────────────┐
│ Producto            Cant.   Precio      Especie              │
│ ┌────────────────┐  ┌───┐  ┌────────┐  ┌──────────────────┐  │
│ │12 Coca de 500ml│  │12 │  │  1200  │  │ Gaseosa       ▾  │  │
│ └────────────────┘  └───┘  └────────┘  └──────────────────┘  │
│                                          ↳ + Crear "cerveza" │
└──────────────────────────────────────────────────────────────┘
```

El selector es un combo con búsqueda sobre el catálogo que ya trajiste, y la
última opción de la lista —cuando lo tipeado no coincide con nada— es **crear
esa especie**. Eso no dispara ningún request: marca el renglón para que salga
con `especie` en vez de `especieId`.

Tres cosas que conviene no saltear:

- **Un solo `GET /especies` por formulario**, al abrirlo. Filtrá en memoria.
- **Elegida del catálogo → `especieId`. Tipeada nueva → `especie`.** Nunca las
  dos en el mismo renglón.
- **Después de guardar, recargá el catálogo**: la factura pudo haber creado
  especies nuevas, y el próximo renglón tiene que poder elegirlas del selector.

### El catálogo

```
┌─────────────────────────────────────────────────────────┐
│  ESPECIES                        [buscar…]  [+ Nueva]   │
│  ─────────────────────────────────────────────────────  │
│  Agua                7 renglones      [renombrar]       │
│  Cerveza             0 renglones      [renombrar] [🗑]   │
│  Envío               2 renglones      [renombrar]       │
│  Sin especie (hist.) 26 renglones     [renombrar]       │
└─────────────────────────────────────────────────────────┘
```

El tacho solo aparece con `usos: 0`. En el resto, el `409` ya explica por qué no
se puede — pero mejor que no se pueda tocar.

---

## 10. Lo que todavía no está

**Las métricas por especie.** Hoy el catálogo clasifica, pero el
[ticket del mes](./flujo_metricas.md#5-los-tickets-la-foto-de-un-mes) sigue
mostrando `topProductos`, agrupado por el texto del producto. Lo que falta es el
`topEspecies` —*"cuánta gaseosa vendí en julio"*—, que es para lo que se hizo
todo esto. Es un agregado más sobre la misma consulta; se puede pedir cuando el
catálogo tenga algo de historia cargada.

Tampoco hay **precios en el catálogo**, y es a propósito. Un catálogo con
precios obligaría a versionarlos para que una factura vieja siguiera diciendo lo
que decía, y eso es otro problema. Acá solo vive la etiqueta.
