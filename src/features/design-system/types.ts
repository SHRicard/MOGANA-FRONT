/**
 * Niveles del catálogo.
 *
 * Solo hay dos porque el design system compartido son los tokens y los atoms.
 * Las composiciones (molecules / organisms) viven dentro de cada feature, en su
 * carpeta `components/`, y son distintas entre sí: no van en un catálogo global.
 */
export const CATALOG_TABS = ['Tokens', 'Atoms'] as const;

export type CatalogTab = (typeof CATALOG_TABS)[number];
