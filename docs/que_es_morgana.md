# Qué es Morgana

> **Para qué existe este documento:** describir la app en los términos que
> necesita quien va a redactar los **Términos y Condiciones** y la **Política de
> Privacidad**. No es documentación técnica: es la respuesta a *qué hace esto,
> con datos de quién, guardados dónde, por cuánto tiempo y con qué terceros*.
>
> Todo lo que sigue está verificado contra el código de los dos repos
> (`MORGANA-FRONT` y `MORGANA-BACK`) al **1 de septiembre de 2026**. Lo que no
> pude verificar está marcado con ⚠️ y **hay que completarlo antes de publicar
> el T&C** — son datos del negocio, no del código.

---

## 1. En una frase

Morgana es la app de un **negocio que le vende a sus clientes y les fía**: le
muestra a cada cliente qué le facturaron, cuánto debe y qué venció, y le deja
**avisar que pagó** adjuntando el comprobante. Del otro lado, le da al dueño la
herramienta para facturar, cobrar y confirmar esos pagos.

**No es una app de pagos.** Ni cobra, ni procesa tarjetas, ni mueve dinero. El
pago ocurre **afuera** —una transferencia, Mercado Pago, efectivo en el
mostrador— y la app solo transporta el **aviso** de que ocurrió, para que una
persona del negocio lo verifique contra el resumen bancario y lo confirme a
mano. Esta distinción es la más importante de todo el documento para el T&C.

---

## 2. Quién usa la app

Hay **tres roles**, y la app es literalmente otra según cuál sea:

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Cliente** | Cualquiera que se registra solo | Ver sus facturas y su deuda, avisar que pagó, ver en qué quedó cada aviso, ver qué compra, editar sus datos |
| **Administrador** | Quien opera el negocio | Facturar, cobrar, ver y buscar clientes, resolver avisos de pago, mandar avisos de deuda, ver métricas, administrar el almacenamiento |
| **Super administrador** | El dueño del sistema | Todo lo anterior, más todas las cuentas |

El rol **lo asigna el negocio**, no se elige al registrarse: toda cuenta nueva
nace como `cliente`.

---

## 3. Qué hace la app, funcionalidad por funcionalidad

### 3.1 Lado del cliente

- **Inicio** — cuánto debe en total, cuánto está vencido, qué vence primero, y
  sus últimas facturas.
- **Mis facturas** — el listado completo con filtros por estado y por fecha, y el
  detalle de cada una: los productos, los precios, los pagos ya anotados y el
  saldo.
- **Avisar que pagué** — un formulario con el monto, el medio de pago, la fecha,
  una referencia y una nota opcionales, y **el comprobante**.
- **Mis avisos de pago** — en qué quedó cada aviso: pendiente, confirmado o
  rechazado, y con qué motivo.
- **Qué comprás** — lo que se lleva agrupado por tipo de producto, y cómo viene
  cambiando.
- **Mi cuenta** — sus datos personales y cómo lo contactan.
- **Avisos** — la campanita: los mensajes que le manda el negocio.
- **Configuración** — tema claro/oscuro y tipografía. Nada más.

### 3.2 Lado del administrador

- **Facturación** — emitir facturas con productos, cantidades y precios;
  anularlas; anotar pagos y reembolsos.
- **Clientes** — el listado, la ficha de cada uno con su historial, y el control
  de **si se le fía o no** (con motivo, quién lo cambió y cuándo).
- **Bandeja de avisos de pago** — la cola de lo que informaron los clientes: se
  mira el comprobante y se **confirma** (anotando el cobro, que puede ser por un
  monto distinto al informado) o se **rechaza** con un motivo que el cliente lee.
- **Métricas** — facturación, tendencia, productos, tickets, y métricas por
  cliente.
- **Avisos de deuda** — mandarle a un cliente el recordatorio de lo vencido.
- **Almacenamiento de comprobantes** — cuánto ocupa y cómo se limpia.

### 3.3 Lo que todavía NO existe

⚠️ **Ofertas** es una pantalla vacía, un lugar reservado. Aparece en la barra
inferior pero no muestra nada. **No la menciones en el T&C** como si existiera —
o mencionala como funcionalidad futura, si el T&C va a cubrir eso.

---

## 4. Cómo se entra

Hay **tres formas** de tener cuenta, y dejan rastros distintos:

| Forma | Qué queda guardado |
|---|---|
| **Con Google** | Correo + el identificador de Google. **Sin contraseña nuestra** |
| **Con correo** | Correo + la contraseña, cifrada (`bcrypt`) |
| **Con DNI** | DNI + contraseña cifrada. **Puede no tener correo** |

La sesión es un **token propio** (JWT) que emite nuestro servidor. Cuando se
entra con Google, lo que Google devuelve se manda al servidor, que lo verifica
contra Google y recién ahí emite el token nuestro — **la app nunca guarda
credenciales de Google**.

⚠️ **Una cuenta sin DNI cargado está bloqueada** y no puede operar hasta
completarlo. Es una decisión del negocio y el T&C tendría que decirlo: se pide
el documento como condición para usar el servicio.

---

## 5. Qué datos personales se recogen

Esta es la sección que más le importa a la Política de Privacidad. **Todo lo que
sigue está tomado del esquema real de la base de datos.**

### 5.1 De la persona

| Dato | Obligatorio | De dónde sale |
|---|---|---|
| Nombre para mostrar | No | Lo carga la persona, o sale del correo |
| Correo electrónico | Depende | De Google, o lo escribe la persona |
| **DNI** | **Sí para operar** | Lo escribe la persona, o lo carga un administrador |
| Teléfono | No | Lo escribe la persona |
| Dirección | No | Lo escribe la persona |
| Contraseña | Solo si no entra con Google | Se guarda **cifrada**, nunca en claro |
| Identificador de Google | Solo si entra con Google | Google |
| Fecha del último ingreso | Automático | El sistema |

### 5.2 Datos comerciales de la persona

- **Sus facturas**: qué compró, cuánto, a qué precio, cuándo, qué pagó y qué debe.
- **Si se le fía o no**, con el motivo, quién lo decidió y cuándo.
- **Sus avisos de pago**: monto, medio, fecha, referencia, nota y el comprobante.
- **Sus notificaciones**: qué se le comunicó y cuándo lo leyó.

⚠️ **Hay dos rastros de auditoría interna** que conviene que el T&C contemple,
porque son datos sobre la persona generados por terceros dentro del negocio:

- **Quién le cambió el DNI, cuándo y por qué.**
- **Quién le cambió el permiso de fiado, cuándo y por qué.**

### 5.3 El comprobante de pago

Es el dato más delicado que maneja la app, porque **es una captura del
homebanking o de la billetera del cliente**: puede contener el nombre completo,
el CBU o alias, el banco, y a veces el saldo de la cuenta.

- Se sube **una imagen por aviso**, de hasta **8 MB**, en JPG, PNG, WebP o HEIC.
- Se guarda en **Cloudinary** (ver §7), **no** en el teléfono ni en nuestra base.
- Lo puede ver **el cliente que lo subió y los administradores**. Nadie más.
- Las direcciones con las que se muestra son **firmadas y vencen**: un enlace
  copiado deja de servir solo.

---

## 6. Qué guarda el teléfono

Poco, y conviene decirlo porque juega a favor:

| Qué | Dónde |
|---|---|
| El token de la sesión | Almacenamiento **cifrado** del dispositivo |
| Datos no sensibles de la cuenta | Almacenamiento común |
| La preferencia de tema y tipografía | Almacenamiento común |
| El comprobante compartido y todavía no enviado | Almacenamiento común, **se borra solo a las 24 h** |
| El último medio de pago usado | Almacenamiento común |

**El único permiso que pide la app es Internet.** No pide cámara, ni ubicación,
ni contactos, ni acceso al almacenamiento: la cámara se abre delegando en la app
de cámara del teléfono y la galería usa el selector del sistema, así que la app
**solo recibe la foto que la persona eligió** y nunca ve el resto del carrete.

---

## 7. Terceros involucrados

Esta lista tiene que estar completa en la Política de Privacidad. Son los únicos:

| Tercero | Para qué | Qué datos ve |
|---|---|---|
| **Google** (Sign-In) | Entrar con la cuenta de Google | Correo y perfil básico, solo si la persona elige esa vía |
| **Cloudinary** | Guardar los comprobantes | **Las imágenes de los comprobantes** |
| **MongoDB** | La base de datos | Todo lo del §5 |
| **Servidor de correo** | Mandar los correos del §8 | Correo y nombre |

⚠️ **Faltan tres datos que el código no puede darme y el T&C necesita:**

1. **Dónde está alojado el servidor** (país/proveedor). Determina si hay
   transferencia internacional de datos.
2. **Dónde está la base de datos** (Atlas y en qué región, o propia).
3. **Qué servicio de correo se usa** y desde qué dirección salen los mensajes.

Cloudinary y Google son empresas de Estados Unidos: **hay transferencia
internacional de datos** y la política tiene que decirlo.

---

## 8. Qué correos manda la app

Solo cinco, y ninguno es publicidad:

1. **Bienvenida** al crear la cuenta.
2. **Confirmá tu correo**.
3. **Recuperá tu contraseña**.
4. **Tu cuenta entra con Google** — la respuesta a quien pide recuperar una
   contraseña que no tiene.
5. **Tu cuenta tiene facturas vencidas** — el aviso de deuda, que **lo dispara un
   administrador a mano**, no un automatismo.

⚠️ **No hay marketing ni newsletter.** Si el negocio quiere mandarlos algún día,
el T&C tiene que preverlo desde ahora.

---

## 9. Las notificaciones de la app

Son **la campanita adentro de la app**, no notificaciones push: el teléfono no
suena ni muestra nada con la app cerrada. Hay seis tipos: deuda vencida,
anuncio, pago informado, pago confirmado, pago rechazado y almacenamiento lleno.
Los tres últimos y el primero los dispara una persona o una acción concreta; los
dos de administración no le llegan nunca a un cliente.

⚠️ **Un aviso borrado no se borra de verdad**: desaparece de la vista de la
persona pero **la fila queda en la base**. Es deliberado y hay que decirlo en el
T&C, porque es tratamiento de datos: un aviso es la prueba de qué se le comunicó
a alguien y cuándo. *"No tomamos tu pago del 3 porque el comprobante no se leía"*
es, tres semanas después, la única explicación de una deuda que sigue figurando.

---

## 10. Cuánto tiempo se guarda cada cosa

| Qué | Cuánto |
|---|---|
| Comprobantes de pago | Hasta que un administrador los borre. **Mínimo 30 días** — el sistema no deja borrar nada más nuevo |
| Comprobantes de avisos sin resolver | **No se pueden borrar** mientras estén pendientes |
| Avisos de la campanita | Indefinido. El borrado los oculta, no los elimina |
| Comprobante compartido y no enviado, en el teléfono | 24 horas |
| Facturas, pagos y datos de la cuenta | ⚠️ **Sin plazo definido en el código** |

⚠️ **Hay que definir dos cosas antes de publicar el T&C:**

1. **Cuánto se conservan las facturas y los datos de cuenta.** Hoy es
   indefinido. Suele haber una obligación legal contable que fija el mínimo.
2. **Qué pasa si alguien pide que borren su cuenta.** **No existe hoy ninguna
   función para eliminar una cuenta**, ni en la app ni en el panel. Si la
   normativa aplicable da derecho de supresión, el T&C tiene que explicar por qué
   vía se ejerce, aunque sea manual y por correo.

---

## 11. Las reglas del negocio que el T&C tiene que reflejar

Estas no son detalles técnicos: son **compromisos y límites** que la app le
impone a la relación, y si el T&C no los dice, la app hace algo que el contrato
no previó.

1. **Avisar que se pagó no descuenta nada.** La deuda baja recién cuando un
   administrador confirma el aviso contra el resumen del banco. Es lo que más
   confunde al cliente y lo que más conviene que esté escrito.

2. **Se puede confirmar por un monto distinto al informado.** El cliente avisa
   $10.000 y el negocio anota $8.000 porque eso fue lo que llegó. La app está
   hecha para eso; el T&C tiene que permitirlo.

3. **Un aviso se puede rechazar**, con un motivo que el cliente lee.

4. **Con transferencia, Mercado Pago o depósito el comprobante es obligatorio.**
   Con efectivo o "otro" es opcional.

5. **El negocio decide a quién le fía**, puede cambiar esa decisión en cualquier
   momento, y sin fiado la factura vence el mismo día.

6. **El negocio puede borrar los comprobantes** pasados 30 días. El cliente lo ve
   en su propio aviso, con el motivo. **Conviene decirlo**: quien creía tener ahí
   su respaldo guardado para siempre, no lo tiene.

7. **Sin DNI cargado la cuenta no opera.**

8. **Los precios y los productos los carga el negocio a mano.** No hay catálogo
   público ni carrito: la factura la emite el mostrador.

---

## 12. Lo que la app NO hace

Tan importante como lo anterior, porque evita prometer de más:

- **No cobra ni procesa pagos.** No hay pasarela, ni tarjeta, ni integración con
  ningún banco o billetera.
- **No lee la cuenta bancaria de nadie.** El comprobante es una imagen que la
  persona elige y manda.
- **No manda notificaciones push.**
- **No tiene chat** entre cliente y negocio.
- **No comparte datos con anunciantes**, ni tiene analítica de terceros, ni
  rastreadores, ni publicidad.
- **No usa la ubicación.**
- **No hay compras dentro de la app.**
- **No existe hoy en iOS.** ⚠️ Confirmar si el T&C va a cubrir solo Android.

---

## 13. Seguridad, en los términos que se pueden afirmar

Solo lo que es cierto y verificable en el código:

- Las contraseñas se guardan **cifradas**, nunca en texto plano.
- El token de sesión vive en el almacenamiento **cifrado** del teléfono.
- Los comprobantes se sirven con **enlaces firmados que vencen**.
- El servidor **verifica el contenido real de cada archivo subido**, no lo que el
  archivo dice ser: un ejecutable renombrado a `.jpg` se rechaza.
- Los datos de una persona **no son accesibles con el identificador de otra**:
  todo sale de la sesión.

⚠️ **No prometas cifrado de extremo a extremo ni auditorías de seguridad**: no
las hay.

---

## 14. Checklist de lo que falta antes de redactar

Ordenado por lo que más bloquea:

- [ ] **Razón social, domicilio legal y CUIT** del negocio.
- [ ] **Correo de contacto** para ejercer derechos sobre los datos.
- [ ] **Jurisdicción y ley aplicable.**
- [ ] **Dónde están alojados** el servidor y la base de datos.
- [ ] **Qué servicio de correo** se usa.
- [ ] **Cuánto se conservan** las facturas y los datos de cuenta.
- [ ] **Cómo se pide la baja de una cuenta** (hoy no hay función; definir la vía).
- [ ] **Edad mínima** para usar la app.
- [ ] Si el T&C cubre **solo Android** o también iOS a futuro.
- [ ] Si se van a mandar **comunicaciones comerciales** algún día.

---

## 15. Nota sobre este documento

Está escrito contra el código, no contra lo que la app debería hacer. Si algo del
negocio cambia —se agrega el chat, se activan las ofertas, se integra una
pasarela de pago— **este documento y el T&C dejan de estar al día el mismo día**,
y el orden importa: primero se decide la regla, después se programa.
