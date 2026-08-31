# Assets

Imágenes y logos **compartidos por toda la app**.

> Si un asset lo usa **una sola feature**, no va acá: va en `features/<feature>/assets/`.
> Misma regla que para los componentes — sube a `shared/` recién cuando lo usan dos.

```
shared/assets/
├── logo/           # Isotipo, logotipo, variantes de marca
├── images/         # Ilustraciones, fondos, placeholders (mapa de bits)
├── fonts/          # Tipografías (.ttf) — ⚠️ no se importan, se COMPILAN (ver abajo)
└── index.ts        # Barrel: todo se importa desde acá
```

---

## SVG (preferido para logos e íconos)

Los `.svg` se compilan a **componentes de React**, no a imágenes. Es el formato
recomendado para logos en móvil:

- Se ve nítido en cualquier densidad de pantalla, sin mantener `@2x` / `@3x`.
- Pesa mucho menos que un PNG equivalente.
- Se le puede pasar `color` y sigue el theme (claro/oscuro) sin duplicar archivos.

```tsx
import { LogoMark } from '@/shared/assets';

<LogoMark width={48} height={48} color={theme.colors.primary} />;
```

**Regla al exportar el SVG:** usá `currentColor` en `fill` y `stroke`, no un hex
fijo. Si el archivo trae colores quemados, la prop `color` no va a tener efecto.

> Excepción: los logos de terceros (Google, Apple) **no** se pintan con
> `currentColor` — sus guías de marca prohíben recolorearlos. Ver `GoogleLogo`.

---

## Mapa de bits (PNG / JPG)

Para fotos e ilustraciones. React Native elige la densidad solo, según el
dispositivo, si respetás la convención de nombres:

```
images/
├── hero.png       # 1x  — mdpi
├── hero@2x.png    # 2x  — xhdpi
└── hero@3x.png    # 3x  — xxhdpi
```

Se importa **solo el nombre base**; el sufijo lo resuelve el bundler:

```tsx
import { Image } from 'react-native';
import hero from '@/shared/assets/images/hero.png';

<Image source={hero} style={{ width: 200, height: 120 }} resizeMode="contain" />;
```

⚠️ La ruta del `require`/`import` tiene que ser **estática**. Metro resuelve los
assets en tiempo de build: `require('./images/' + nombre)` no funciona.

---

## Fuentes (`fonts/`)

Las tipografías **no son assets de JavaScript**: son recursos nativos, como el
ícono de la app. Metro no las ve. El sistema operativo las tiene que tener
instaladas antes de que exista un solo componente, así que **no se importan
nunca** — se piden por nombre desde el theme.

```
fonts/
├── Inter18pt-Regular.ttf
├── Inter18pt-Medium.ttf
├── Inter18pt-SemiBold.ttf
├── Inter18pt-Bold.ttf
└── OFL.txt              # la licencia de Inter: es obligatorio incluirla
```

### ⚠️ El nombre del archivo NO es cosmético

Es la fuente de casi todos los problemas con tipografías en React Native, porque
falla **en silencio**: la app compila, no hay ningún error, y el texto sale con
la letra del sistema.

|         | Busca la fuente por                                   |
| ------- | ----------------------------------------------------- |
| Android | el **nombre del archivo** en `assets/fonts/`          |
| iOS     | el **nombre PostScript** que viene adentro del `.ttf` |

O sea que los dos nombres tienen que ser **el mismo**. Los `.ttf` que baja Google
Fonts **no cumplen**: vienen como `Inter_18pt-Bold.ttf` y su nombre PostScript es
`Inter18pt-Bold`, sin el guión bajo. Así como vienen, la fuente anda en Android y
en iOS se cae a la del sistema. Por eso están renombrados.

Antes de sumar un archivo nuevo, comprobá el nombre de adentro:

```bash
fc-scan --format "%{postscriptname}\n" src/shared/assets/fonts/*.ttf
```

Y renombrá el archivo para que coincida. El test `theme/tokens/fonts.test.ts`
verifica que exista un `.ttf` con el nombre exacto que pide el theme.

### Cómo se instala una fuente nueva

1. Poné el `.ttf` (o `.otf`) en esta carpeta, ya renombrado.
2. Sumá el peso a `src/theme/tokens/fonts.ts` — es el único lugar donde se
   escriben los nombres.
3. `npx react-native-asset` — copia el archivo a
   `android/app/src/main/assets/fonts/` y, en iOS, lo suma al target de Xcode y
   al `UIAppFonts` del `Info.plist`. La carpeta la declara `react-native.config.js`.
4. **Recompilá** (`npx react-native run-android`). Recargar Metro con la `r` no
   alcanza: la fuente no está del lado de JS.

### Cómo se usa

Nunca a mano. El peso sale del theme, que ya sabe si la fuente activa se pide por
`fontFamily` o por `fontWeight`:

```tsx
<Text weight="semibold">…</Text>          // lo normal: el atom lo resuelve

// En algo que no puede usar el atom Text (un TextInput):
{ fontSize: theme.typography.body, ...theme.fonts.regular }
```

❌ **Nunca** un `fontFamily` escrito a mano en un componente, ni un `fontWeight`
al lado de `...theme.fonts.*`: con una fuente propia, el peso ya viene en el
archivo y pedirlo dos veces la rompe en Android (el detalle, en `tokens/fonts.ts`).

---

## Lo que NO va acá

El **ícono de la app** y la **splash screen** no son assets de JavaScript: son
recursos nativos y viven en cada plataforma.

- Android → `android/app/src/main/res/mipmap-*/`
- iOS → `ios/<App>/Images.xcassets/`
