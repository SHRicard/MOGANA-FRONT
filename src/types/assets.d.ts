/**
 * Tipos para importar archivos que no son código.
 * Sin esto, `import logo from './logo.png'` no compila:
 * "Cannot find module ... or its corresponding type declarations".
 */

/**
 * SVG → COMPONENTE de React (vía react-native-svg-transformer).
 * Se usa como `<Logo width={120} color="#fff" />`, no dentro de un <Image>.
 */
declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: FC<SvgProps>;
  export default content;
}

/**
 * Imágenes de mapa de bits → referencia numérica de asset.
 * Se usa como `<Image source={logo} />`.
 */
declare module '*.png' {
  const content: number;
  export default content;
}

declare module '*.jpg' {
  const content: number;
  export default content;
}

declare module '*.jpeg' {
  const content: number;
  export default content;
}

declare module '*.webp' {
  const content: number;
  export default content;
}

declare module '*.gif' {
  const content: number;
  export default content;
}
