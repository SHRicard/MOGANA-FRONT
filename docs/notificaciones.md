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
| `titulo` · `mensaje` | ya redactados, se muestran tal cual. Son el mismo texto que el correo |
| `datos` | los números sueltos, por si querés pintarlos vos: el total en grande, la lista en una tabla |
| `leidaEn` | `null` es sin leer |
| `noLeidas` | **el número del globito**. Cuenta todas las sin leer de la cuenta, no las de esta página ni las del filtro |

`datos` es **una foto del momento**, no la deuda de ahora: si el cliente pagó
después, el aviso viejo sigue diciendo lo de antes. El saldo que vale sale de la
cuenta, no de acá.

Los avisos vienen **del más nuevo al más viejo**.

---

## `POST /api/notificaciones/:id/leida`

Marca uno como leído y lo devuelve actualizado. Sin body.

Es idempotente: marcarlo dos veces no cambia la fecha de la primera lectura. El
aviso de otra persona da `404` —igual que uno que no existe— y no `403`: nadie
tiene por qué enterarse de que ese id existe.

## `POST /api/notificaciones/leer-todas`

Vacía el globito de una. Devuelve `{ "leidas": 3 }`, cuántas marcó.

---

## En la pantalla

- **La campanita** muestra `noLeidas`. Se refresca con cualquier llamada al
  listado, así que después de marcar una podés usar el `noLeidas` que vuelve.
- **La lista**: `titulo` en negrita, `mensaje` abajo, y las sin leer marcadas.
- **Al abrir un aviso**, mandá el `POST .../leida`. No esperes la respuesta para
  pintarlo leído: si falla, el número vuelve solo en el próximo listado.
- El aviso de deuda **no lleva a ninguna pantalla**: el cliente todavía no puede
  ver su cuenta en la app. La acción es pasar por el local.

---

## Cuándo se manda

Lo dispara el administrador desde el panel, con
`POST /api/admin/clientes/:id/aviso-deuda` — ver
[`flujo_pagos.md`](./flujo_pagos.md). **El sistema no avisa solo**: no hay tarea
nocturna que reclame deudas.

Y no se apila: si el cliente todavía no leyó el aviso anterior, el nuevo
**reemplaza** al viejo con los números de hoy y vuelve arriba de la lista. Que el
mostrador insista tres veces no le llena la campanita de avisos repetidos.
