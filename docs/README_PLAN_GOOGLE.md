# Plan Google — publicar Morgana cumpliendo las reglas de Play

> **Para qué existe este documento:** ordenar **todo lo que falta** para que
> Morgana pueda publicarse en Google Play sin que la rechacen, y repartirlo en
> fases con responsable claro. No es el texto de los Términos: es el plan para
> llegar a tenerlos, más los dos requisitos de Play que **no** son un documento.
>
> El insumo de contenido es [`que_es_morgana.md`](que_es_morgana.md), que ya
> describe la app en los términos que necesita quien redacta. Este plan dice
> **qué hacer con eso**.
>
> Estado del código verificado al **2 de septiembre de 2026**.

---

## 0. Lo primero: el bloqueante no son los textos

Google Play tiene **tres** requisitos acá, y el que rechaza publicaciones no es
el que uno mira primero:

| # | Requisito | Dificultad | ¿Bloquea? |
|---|---|---|---|
| 1 | **URL pública** de la política de privacidad en la ficha | Baja | Sí, pero se resuelve rápido |
| 2 | **Formulario de Data safety** declarando qué datos se recogen | Media, tediosa | Sí |
| 3 | **Borrado de cuenta** dentro de la app **+ URL pública** para pedir la baja | **Alta — toca back y front** | **Sí, y es el que sorprende** |

El tercero es el que traba de verdad. Toda app que **permite crear una cuenta**
debe ofrecer un camino para eliminarla desde adentro de la app, y además una URL
donde se pueda pedir la baja **sin instalar nada**. Morgana deja registrarse
solo, y hoy no existe ninguna función para eliminar una cuenta —ni en la app ni
en el panel— como marca [`que_es_morgana.md`](que_es_morgana.md) §10.

**Sin eso, la revisión rechaza la publicación por más impecables que estén los
Términos.**

---

## 1. Lo que ya está a favor

Verificado contra el código, no asumido:

- **El manifest tiene un solo permiso: `INTERNET`.** Sin permisos sensibles
  declarados, no hay que completar los formularios de justificación de permisos
  —la parte más dolorosa de Play Console—. La foto del comprobante entra por el
  selector del sistema, que no exige declarar nada.
- **No hay push cableado** ni `google-services.json` en el repo. Un tercero menos
  y un identificador de dispositivo menos que declarar en Data safety.
- **La fila del menú ya está reservada.** `MENU_ITEMS` tiene una entrada `terms`
  sin `route`: el patrón del repo para "esta pantalla todavía no existe".
- **El contenido ya está relevado.** `que_es_morgana.md` está escrito contra el
  código de los dos repos, con los datos, los terceros, los plazos y lo que la
  app **no** hace.

> ⚠️ **No agregues permisos que no necesites.** Cada permiso nuevo en el manifest
> —cámara, fotos, notificaciones— abre un formulario de justificación aparte y
> alarga la revisión. Hoy no hace falta ninguno.

---

## 2. Fase 0 — Decisiones del negocio

**Responsable: el dueño del negocio, no el código.** Bloquea la redacción final
de los dos documentos. Es el checklist de `que_es_morgana.md` §14, ordenado por
lo que más traba:

- [ ] **Razón social, domicilio legal y CUIT** — encabeza los dos documentos.
- [ ] **Correo de contacto** para ejercer derechos sobre los datos — obligatorio
      en la política de privacidad.
- [ ] **Jurisdicción y ley aplicable** — cierra los Términos.
- [ ] **Dónde está alojado el servidor** (proveedor y país).
- [ ] **Dónde está la base de datos** (Atlas y región, o propia).
- [ ] **Qué servicio de correo** se usa y desde qué dirección salen los mensajes.
- [ ] **Cuánto se conservan** las facturas y los datos de cuenta — hoy es
      indefinido; suele haber una obligación contable que fija el mínimo.
- [ ] **Edad mínima** para usar la app — afecta también el rating de contenido.
- [ ] **¿El documento cubre solo Android?** Hoy no existe build de iOS.
- [ ] ¿Se van a mandar **comunicaciones comerciales** algún día? Hoy no hay
      ninguna, y decirlo es una ventaja.

**Ya confirmado, no hace falta decidirlo:** Cloudinary y Google son empresas de
Estados Unidos → **hay transferencia internacional de datos** y la política tiene
que declararla.

> Mientras esto no esté, se redacta con marcadores visibles —`[RAZÓN SOCIAL]`,
> `[JURISDICCIÓN]`, `[CORREO DE CONTACTO]`— para no frenar las fases de código.
> Los marcadores tienen que saltar a la vista: nadie debe poder publicar sin
> completarlos.

---

## 3. Fase 1 — Borrado de cuenta

**El requisito bloqueante. Toca back y front.**

### 3.1 Primero la regla, después el código

Hay que decidir con el dueño qué pasa cuando **el cliente que pide la baja debe
plata**. Un borrado duro le borra la deuda al negocio; conservar todo choca con
el derecho de supresión.

La salida habitual es **baja lógica con anonimización**: se borran los datos
personales —nombre, correo, DNI, teléfono— y se conservan las facturas y los
pagos como registro contable, que es una obligación legal legítima. La cuenta
deja de poder iniciar sesión.

Sea cual sea la decisión, **se escribe en la política tal como quedó**. No se
promete un borrado total si lo que se hace es anonimizar.

### 3.2 Backend

- [ ] Endpoint de baja de cuenta.
- [ ] Definir qué se borra, qué se anonimiza y qué se conserva.
- [ ] Qué pasa con los comprobantes ya subidos a Cloudinary.
- [ ] Qué pasa con los avisos de pago pendientes de resolver.

### 3.3 Frontend

- [ ] Sección **"Eliminar mi cuenta"** al pie de la pantalla `MI_CUENTA`.
- [ ] Confirmación con el atom `Dialogo` — el patrón ya existe en
      `AnularFacturaDialogo`.
- [ ] La pantalla **dice qué se borra y qué se conserva**, no solo pregunta
      "¿estás seguro?". Es lo que la vuelve un borrado informado.
- [ ] Al confirmar, se cierra la sesión y el stack raíz vuelve a `Auth` solo.

### 3.4 Web

- [ ] URL pública donde pedir la baja sin instalar la app. Va en Play Console.

---

## 4. Fase 2 — La feature `legal/` en el front

Estructura, respetando Screaming Architecture:

```
src/features/legal/
├── screens/
│   ├── TerminosScreen.tsx
│   └── PrivacidadScreen.tsx
├── components/
│   └── DocumentoLegal.tsx      # el renderer que comparten las dos
├── contenido/
│   ├── terminos.ts             # secciones tipadas
│   └── privacidad.ts
├── types.ts
└── index.ts
```

### Decisiones de implementación

- **Contenido como dato tipado** (`{ titulo: string; parrafos: string[] }[]`),
  **no un WebView ni HTML**. Razones: funciona sin internet, respeta el theme
  claro/oscuro vía `useTheme()`, y se puede testear que no falte una sección.
- **`DocumentoLegal.tsx`** recibe las secciones y las pinta. Las dos pantallas
  son el mismo componente con distinto contenido — no se duplica el layout.
- **Fecha de última actualización visible** en cada documento. Es lo que después
  permite decirle a alguien "los términos cambiaron el tal día".
- **Sin `useRefrescar`.** No hay datos de servidor: la regla de tirar para abajo
  no aplica acá.

### Navegación

- [ ] Rutas `TERMINOS` y `PRIVACIDAD` en `src/app/navigation/routes.ts`.
- [ ] Params en `types.ts` (ninguno: son pantallas sin argumentos).
- [ ] Registradas en el **stack raíz**, igual que `CONFIGURACION`: se abren desde
      el panel "Más", que es hermano del navegador de tabs.

---

## 5. Fase 3 — Los enlaces

Tres lugares, en orden de importancia real:

### 5.1 Menú "Más"

- [ ] La fila `terms` de `menuItems.ts` **se parte en dos**: "Términos y
      condiciones" y "Política de privacidad", cada una con su `route`.

Se parte en dos y no se deja una sola porque **la política de privacidad la
gente la busca por su nombre**: escondida como subtítulo de otra fila, no la
encuentra.

### 5.2 Registro — el consentimiento

- [ ] Línea al pie de `RegisterScreen.tsx`: *"Al crear tu cuenta aceptás los
      Términos y la Política de privacidad"*, con dos `Link`.
- [ ] Ubicada debajo del botón **y** del `GoogleSignInButton`: al registro se
      entra por dos caminos y el aviso tiene que cubrir los dos.

**Sin checkbox obligatorio.** Para una app así, el consentimiento por la acción
de registrarse alcanza, y un checkbox más es fricción en la pantalla que menos
la tolera.

### 5.3 Donde se sube el comprobante — lo que más importa

Un link enterrado en el menú no informa a nadie. Lo que informa es una línea en
el momento en que la persona elige la imagen:

> *La imagen la mira el local para confirmar tu pago. No se leen ni se guardan
> los datos que aparecen en ella.*

- [ ] En `SelectorDeComprobante.tsx`, al lado del selector.
- [ ] En el flujo de compartir desde la billetera (`ElegirFacturaScreen.tsx`).

Es el mismo criterio que el componente ya aplica con el tope de 8 MB: **la regla
se dice al elegir, no después de mandar.** Un renglón, no un párrafo.

---

## 6. Fase 4 — Play Console

- [ ] **Política de privacidad publicada en una URL pública** (backend o landing)
      y pegada en la ficha de la app. Tiene que ser **el mismo texto** que muestra
      la app.
- [ ] **URL de solicitud de borrado de cuenta**, en el formulario de eliminación
      de datos.
- [ ] **Formulario de Data safety** completo. Lo que hay que declarar:

| Categoría | Qué es en Morgana |
|---|---|
| Correo y nombre | Registro, y Google Sign-In si entra por ahí |
| DNI y teléfono | Datos de la cuenta del cliente |
| **Fotos** | **El comprobante de pago** |
| **Info financiera** | Facturas, deuda y pagos |
| Identificadores de dispositivo | **No aplica hoy** — no hay push cableado |

> ⚠️ **Lo declarado tiene que coincidir con lo que la app hace.** Google cruza el
> formulario con el comportamiento real, y una diferencia es motivo de baja de la
> ficha, no solo de rechazo.

---

## 7. Orden y dependencias

```
Fase 0 (negocio) ─┐
                  ├─→ textos finales ─→ Fase 4 (Play Console)
Fase 1 (borrado) ─┘                          ↑
                                             │
Fase 2 (feature legal) ─→ Fase 3 (enlaces) ──┘
```

- **Fase 0 y Fase 1 corren en paralelo:** una es del negocio, la otra del back.
  Son las dos lentas y son las que hay que empezar hoy.
- **Fases 2 y 3 no esperan a nadie:** se hacen con marcadores en los datos que
  falten, y cuando llega la info de Fase 0 se completan los textos **sin volver a
  tocar la navegación**.
- **Fase 4 va última** y necesita las tres anteriores terminadas.

---

## 8. Lo que NO hay que hacer

- ❌ **No agregar permisos al manifest** que la app no use. Hoy alcanza con
  `INTERNET`, y cada permiso extra abre un formulario de justificación.
- ❌ **No prometer cifrado de extremo a extremo ni auditorías de seguridad.** No
  existen, y `que_es_morgana.md` §13 marca exactamente qué sí se puede afirmar.
- ❌ **No describir Morgana como una app de pagos.** Ni cobra, ni procesa
  tarjetas, ni mueve dinero: transporta el aviso de un pago que ocurrió afuera.
  Es la distinción más importante de todo el T&C.
- ❌ **No prometer un borrado total** si lo que se implementa es anonimización.
- ❌ **No documentar funciones que no existen** —ofertas, chat, pasarela de pago—
  aunque estén en el código como pantallas vacías.

---

## 9. Checklist final antes de publicar

- [ ] Ningún marcador `[RAZÓN SOCIAL]` / `[JURISDICCIÓN]` / `[CORREO]` quedó en
      el texto.
- [ ] El texto de la app y el de la URL pública son idénticos.
- [ ] El borrado de cuenta funciona de punta a punta y hace **lo que la política
      dice** que hace.
- [ ] Data safety declara fotos e información financiera.
- [ ] Los dos documentos tienen fecha de última actualización.
- [ ] Alguien del rubro legal los revisó.

---

## 10. Nota

Este plan está armado contra el código, y describe con precisión qué hace la app
y qué datos toca. **No es asesoramiento legal.** La redacción final —sobre todo
la retención de datos y la baja de cuenta— conviene que la revise un abogado
antes de publicar.

Si el negocio cambia —se activa el chat, se enchufan las ofertas, se integra una
pasarela— **este plan, `que_es_morgana.md` y los documentos publicados dejan de
estar al día el mismo día**. El orden importa: primero se decide la regla,
después se programa, y recién después se publica.
