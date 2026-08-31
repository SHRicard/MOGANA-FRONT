/**
 * API pública de la feature configuración. Importar SOLO desde acá.
 *
 * Es la pantalla de ajustes de la app —a la que se llega desde el panel "Más"—.
 * Hoy tiene dos apartados: **el tema y la tipografía**. Lo que se elige acá no
 * viaja a la API: son preferencias de este teléfono, guardadas por el
 * `ThemeProvider`.
 */
export { ConfiguracionScreen } from './screens/ConfiguracionScreen';

export { ListaDeOpciones } from './components';
export type { ListaDeOpcionesProps } from './components';

export { OPCIONES_TEMA, OPCIONES_TIPOGRAFIA, resumenTema } from './types';
export type { OpcionDeAjuste, OpcionTema, OpcionTipografia } from './types';
