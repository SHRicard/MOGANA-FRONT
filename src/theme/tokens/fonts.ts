import type { TextStyle } from 'react-native';
import { fontWeight } from './typography';

/**
 * Capa 1 — Tokens PRIMITIVOS: las tipografías entre las que se puede elegir.
 *
 * Los archivos viven en `src/shared/assets/fonts/` y los instala
 * `npx react-native-asset` (ver `react-native.config.js`). **No son assets de
 * JS**: si la fuente no está compilada adentro de la app, el sistema la
 * reemplaza por la suya sin avisar y sin ningún error.
 */

/** Los pesos que maneja el theme. Sale de los tokens para no repetir la lista. */
export type FontWeightName = keyof typeof fontWeight;

/** Las tipografías disponibles. Es lo que elige el usuario. */
export const Fonts = {
  /** La del sistema operativo: San Francisco en iOS, Roboto en Android. */
  SYSTEM: 'system',
  /** Inter — pensada para interfaces: x-height alta y números muy legibles. */
  INTER: 'inter',
} as const;

export type FontPreference = (typeof Fonts)[keyof typeof Fonts];

/** Cómo se nombra cada una en pantalla. */
export const FONT_LABEL: Record<FontPreference, string> = {
  [Fonts.SYSTEM]: 'Del sistema',
  [Fonts.INTER]: 'Inter',
};

/**
 * El nombre con el que se pide cada peso de Inter.
 *
 * ⚠️ **No lo cambies sin mirar el archivo.** Este string tiene que ser, a la vez:
 *
 *  - el nombre del ARCHIVO sin extensión (`Inter18pt-Bold.ttf`) → es como lo
 *    busca Android, en `assets/fonts/`;
 *  - el nombre **PostScript** que viene adentro del `.ttf` → es como lo busca iOS.
 *
 * Los `.ttf` que baja Google Fonts vienen como `Inter_18pt-Bold.ttf`, con un
 * guión bajo que el nombre PostScript no tiene: así como vienen, la fuente anda
 * en Android y en iOS se cae a la del sistema **sin ningún error**. Por eso están
 * renombrados. Para comprobarlo: `fc-scan --format "%{postscriptname}" archivo.ttf`.
 */
const INTER: Record<FontWeightName, string> = {
  regular: 'Inter18pt-Regular',
  medium: 'Inter18pt-Medium',
  semibold: 'Inter18pt-SemiBold',
  bold: 'Inter18pt-Bold',
};

/**
 * Lo que un componente le pone a un texto para que salga con el peso pedido.
 *
 * Es un **fragmento de estilo y no un nombre de fuente** porque las dos
 * tipografías se piden distinto, y esa diferencia no puede quedar suelta en cada
 * componente: la del sistema se pide por `fontWeight` (una sola familia con
 * muchos pesos) y una fuente propia se pide por `fontFamily`, con un archivo por
 * peso.
 */
export type FontStyleTokens = Pick<TextStyle, 'fontFamily' | 'fontWeight'>;

/** Un fragmento por peso. Es lo que expone el theme en `theme.fonts`. */
export type ThemeFonts = Record<FontWeightName, FontStyleTokens>;

const PESOS = Object.keys(fontWeight) as readonly FontWeightName[];

/**
 * Arma los cuatro fragmentos para la tipografía elegida.
 *
 * ⚠️ Con Inter va **`fontFamily` solo, sin `fontWeight`**, y no es una omisión:
 * en Android el peso 700 hace que el sistema busque el archivo
 * `Inter18pt-Bold_bold.ttf` —le pega el sufijo `_bold` al nombre—, no lo
 * encuentra, y termina cayendo en Roboto con una negrita SINTÉTICA, que se ve
 * deformada. El archivo ya es la negrita: pedirla dos veces la rompe.
 * (`ReactFontManager.createAssetTypeface`, en el código de React Native.)
 */
export function buildFonts(preference: FontPreference): ThemeFonts {
  const fuentes = {} as Record<FontWeightName, FontStyleTokens>;

  for (const peso of PESOS) {
    fuentes[peso] =
      preference === Fonts.INTER ? { fontFamily: INTER[peso] } : { fontWeight: fontWeight[peso] };
  }

  return fuentes;
}
