# Bloquear el fiado de un cliente — para aplicar directo

Fiar es dejar que el cliente se lleve la mercadería y pague después. Esto es
**una marca sobre el cliente** para que el que atiende sepa a quién no fiarle.

**Todos arrancan con fiado.** El administrador lo bloquea cuando hace falta, con
un motivo, y lo desbloquea cuando se arregló.

⚠️ **Es solo una marca: el backend no frena nada.** A un cliente bloqueado se le
puede facturar igual, a plazo y todo. Quien decide si le cobra en el momento es
la persona que está atendiendo — el sistema se ocupa de que no se le pase por
alto.

---

## El endpoint

`PATCH /api/admin/clientes/:id/fiado` — token de administrador.

Bloquear:

```json
{ "seLeFia": false, "motivo": "Debe desde julio y no atiende el teléfono" }
```

Desbloquear:

```json
{ "seLeFia": true }
```

| Campo | | |
|---|---|---|
| `seLeFia` | obligatorio | `false` bloquea, `true` devuelve el fiado |
| `motivo` | **obligatorio al bloquear** | hasta 300 caracteres. Al desbloquear se ignora y el motivo viejo se borra |

Responde `200` con el cliente, igual que `GET /api/admin/clientes/:id`, con dos
campos nuevos:

```json
{
  "id": "6aa10954-…",
  "displayName": "Bruno Sosa",
  "dni": "30111002",
  "seLeFia": false,
  "motivoSinFiado": "Debe desde julio y no atiende el teléfono"
}
```

| | `message` |
|---|---|
| `400` | `Mandá `seLeFia` en true o false.` |
| `400` | `Contá en una línea por qué se le corta el fiado.` |
| `404` | `No encontramos ese cliente.` — también si el id es de un administrador |
| `403` | entró un cliente · `401` sin token |

---

## La pantalla

En la **ficha del cliente**, un botón al lado del de crear boleta:

```
Bruno Sosa · DNI 30.111.002
[ Crear boleta ]   [ Bloquear fiado ]
```

Al tocarlo, un campo de motivo y confirmar. Si ya está bloqueado, el botón dice
**Desbloquear fiado** y no pide nada:

```
🚫 No se le fía
   Debe desde julio y no atiende el teléfono
[ Crear boleta ]   [ Desbloquear fiado ]
```

---

## Dónde más aparece la marca

Los dos campos ya vienen en todo lo que el panel lee de un cliente, sin pedir
nada aparte:

| Pantalla | Dónde |
|---|---|
| Listado de clientes (`GET /api/admin/clientes`) | `datos[].seLeFia` · `datos[].motivoSinFiado` |
| Ficha del cliente (`GET /api/admin/clientes/:id`) | `seLeFia` · `motivoSinFiado` |
| Tablero de facturación (`GET /api/admin/clientes-con-facturas`) | `datos[].seLeFia` |
| Cuenta del cliente (`GET /api/admin/clientes/:id/cuenta`) | `cliente.seLeFia` · `cliente.motivoSinFiado` |

En el tablero alcanza con el ícono o el chip; el motivo va donde se decide, que
es la ficha y la cuenta.

💡 **Al crear una factura para un cliente bloqueado, avisalo fuerte** —"a este
cliente no se le fía: cobrale en el momento"— porque el backend la va a aceptar
igual, con el plazo que le pongas.

---

## Lo que NO hace

- **No lo bloquea solo.** Tener deuda vencida no cambia nada: la decisión la toma
  una persona, y queda guardado quién y cuándo.
- **No le impide comprar** ni facturarle a plazo. Es un aviso, no una traba.
- **El cliente no lo ve.** No aparece en `GET /api/users/me` ni en
  `/api/cliente/mi-cuenta`: es una nota del mostrador.

## Checklist

- [ ] Botón "Bloquear fiado" en la ficha del cliente, con campo de motivo y
      confirmación.
- [ ] Botón "Desbloquear fiado" cuando ya está bloqueado (sin motivo).
- [ ] Chip o ícono en la ficha, en el listado y en el renglón del tablero.
- [ ] El motivo a la vista en la ficha y en la cuenta.
- [ ] Aviso al crear una factura para un cliente bloqueado.
- [ ] Agregar `seLeFia` y `motivoSinFiado` a los tipos del cliente.

Para probar: el cliente **Bruno Sosa** (DNI 30111002) del seed de demo viene
bloqueado.
