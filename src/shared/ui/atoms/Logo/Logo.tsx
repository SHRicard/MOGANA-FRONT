import { memo } from 'react';
import { View } from 'react-native';
import { LOGO_ASPECT_RATIO, LogoMorgana } from '@/shared/assets';
import { APP_NAME } from '@/config';
import type { LogoProps, LogoSize } from './Logo.types';

/** Anchos por talle. El alto sale de la proporción del imagotipo. */
const WIDTHS: Record<LogoSize, number> = {
  sm: 140,
  md: 220,
  lg: 300,
};

/**
 * Imagotipo de la app.
 *
 * Es un SVG con la paleta de la marca (57 violetas): NO se recolorea ni se le
 * pasa un token del theme. Se ve igual en claro y en oscuro, como corresponde a
 * un logo.
 *
 * El nombre "Morgana" ya viene dibujado dentro del SVG, así que acá no se le
 * agrega texto: se duplicaría. Como el nombre es imagen y no texto, se expone a
 * los lectores de pantalla con `accessibilityLabel`.
 *
 * Para cambiar el logo: reemplazá `shared/assets/logo/logo-morgana.svg` y
 * actualizá `LOGO_ASPECT_RATIO` si cambia el viewBox.
 */
function LogoComponent({ size = 'md', width }: LogoProps) {
  const finalWidth = width ?? WIDTHS[size];
  // Alto derivado: si se fijara a mano, cualquier cambio de talle deformaría el logo.
  const finalHeight = Math.round(finalWidth / LOGO_ASPECT_RATIO);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={APP_NAME}>
      <LogoMorgana width={finalWidth} height={finalHeight} />
    </View>
  );
}

export const Logo = memo(LogoComponent);
