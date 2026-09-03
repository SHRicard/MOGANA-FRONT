import type { spacing } from './tokens/spacing';
import type { typography, lineHeight, fontWeight } from './tokens/typography';
import type { radius } from './tokens/radius';
import type { ThemeFonts } from './tokens/fonts';

/**
 * Capa 2 — Tokens SEMÁNTICOS (contrato).
 * Nombrados por lo que SIGNIFICAN, no por el color que son.
 * Es lo único que consumen los componentes.
 *
 * Al declararlo como interfaz, TypeScript obliga a que `lightTheme` y `darkTheme`
 * tengan exactamente la misma forma: si agregás un token a uno y no al otro, falla el build.
 */
export interface ThemeColors {
  /** Color de marca: acciones principales, links, elementos activos. */
  primary: string;
  /** Variante suave del primary: fondos de chips, estados hover/selected. */
  primaryMuted: string;
  /** Texto/íconos que van ENCIMA de `primary`. */
  onPrimary: string;

  /** Fondo base de las pantallas. */
  background: string;
  /** Fondo de elementos elevados: tarjetas, inputs, sheets. */
  surface: string;
  /** Variante de surface para separar jerarquías dentro de una tarjeta. */
  surfaceVariant: string;
  /** Bordes, divisores, outlines de inputs. */
  border: string;

  /** Texto principal sobre `background` / `surface`. */
  text: string;
  /** Texto secundario: subtítulos, placeholders, helper text. */
  textMuted: string;
  /** Texto sobre fondos oscuros en tema claro (y viceversa). */
  textInverse: string;

  /** Estado de error: bordes de input inválido, mensajes. */
  error: string;
  /**
   * Variante suave del error: fondo de un chip o de un ícono en `error`.
   * Mismo par que `primary` / `primaryMuted`.
   */
  errorMuted: string;
  /** Texto/íconos ENCIMA de `error`. */
  onError: string;
  /** Estado de éxito. */
  success: string;
  /** Variante suave del éxito, para fondos. */
  successMuted: string;
  /** Estado de advertencia. */
  warning: string;
  /** Variante suave de la advertencia, para fondos. */
  warningMuted: string;
  /**
   * Texto/íconos ENCIMA de `warningMuted`.
   *
   * Existe porque `warning` **no sirve** de texto sobre su propio muted: el ámbar
   * es claro y el par da 2.16:1, muy por debajo del 4.5 que pide AA (el par
   * `error`/`errorMuted` sí llega, 4.6:1, y por eso ahí no hace falta). Este es
   * un ámbar más oscuro, elegido para leerse: 8.3:1 en claro, 5.5:1 en oscuro.
   */
  onWarningMuted: string;

  /**
   * Escala de urgencia para **badges de estado**: cuatro fondos plenos que se
   * tienen que distinguir de un vistazo en una lista, ordenados de "todo bien" a
   * "ya se pasó".
   *
   * Son un rol aparte de `success` / `warning` / `error`, que son para
   * *feedback* (un texto de error, un ícono de éxito) y se usan como color de
   * TEXTO. Estos cuatro se usan como FONDO y siempre llevan `onStatus` encima.
   */
  statusOk: string;
  /** Falta bastante: todavía no hay nada que hacer. */
  statusWait: string;
  /** Se está por pasar el momento. */
  statusSoon: string;
  /** Ya se pasó. */
  statusLate: string;
  /**
   * Texto/íconos ENCIMA de cualquiera de los cuatro `status*`.
   *
   * Es el negro de la paleta y vale igual en los dos temas: los fondos son
   * saturados y claros, y sobre amarillo un texto blanco no se lee. Se eligió el
   * negro y no `gray900` porque es el que hace pasar el contraste AA también
   * sobre `statusLate`, que es el más oscuro de los cuatro (4.8:1). Un solo
   * color para todos hace además que una fila de badges se vea pareja.
   */
  onStatus: string;

  /**
   * Fondo de la pantalla de arranque.
   *
   * ⚠️ Vale igual en claro y en oscuro, y no es un capricho (como en los
   * `status*`, que también): tiene que coincidir con el fondo de la splash
   * NATIVA, que el
   * sistema pinta antes de que exista JS y no sabe qué tema eligió el usuario.
   * Si cambiás este valor, cambiá también:
   *   - android/app/src/main/res/values/colors.xml → splash_background
   *   - ios/Morgana/LaunchScreen.storyboard → backgroundColor de la view
   */
  splashBackground: string;

  /** Capa oscura detrás de modales y sheets. */
  overlay: string;
  /**
   * Fondo del visor de imágenes a pantalla completa.
   *
   * Es más oscuro que `overlay` a propósito: acá no se trata de atenuar lo de
   * atrás sino de **taparlo**, para que el papel blanco de un comprobante tenga
   * bordes y se lea. Es el mismo en los dos temas: una foto se mira igual de
   * día que de noche.
   */
  scrim: string;
  /** Color base de las sombras (la opacidad la pone cada componente). */
  shadow: string;
}

/**
 * Lo que define el TEMA: claro y oscuro. Es lo que declaran `lightTheme` y
 * `darkTheme`, y por eso no incluye la fuente — la tipografía es una elección
 * aparte, que vale igual en los dos temas (nadie quiere Inter de día y la del
 * sistema de noche).
 */
export interface ThemeBase {
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
  lineHeight: typeof lineHeight;
  fontWeight: typeof fontWeight;
  radius: typeof radius;
}

/**
 * El theme completo. `useTheme()` devuelve exactamente esto: el tema elegido más
 * la tipografía elegida, que el `ThemeProvider` combina.
 */
export interface Theme extends ThemeBase {
  /**
   * Cómo se pide cada peso con la fuente activa. Se usa **spreado**:
   *
   * ```ts
   * { fontSize: theme.typography.body, ...theme.fonts.semibold }
   * ```
   *
   * ❌ Nunca junto con un `fontWeight` propio: el fragmento ya lo trae cuando
   * corresponde, y agregarlo rompe las fuentes propias en Android (ver
   * `tokens/fonts.ts`).
   */
  fonts: ThemeFonts;
}

/** Tema efectivamente aplicado. */
export type ThemeMode = 'light' | 'dark';

/** Lo que elige el usuario: puede delegar en el sistema operativo. */
export type ThemeModePreference = ThemeMode | 'system';

export type { FontPreference } from './tokens/fonts';
