import type { ComponentType } from 'react';
import BanknoteArrowUp from 'lucide-react-native/icons/banknote-arrow-up';
import Boxes from 'lucide-react-native/icons/boxes';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import HardDrive from 'lucide-react-native/icons/hard-drive';
import Megaphone from 'lucide-react-native/icons/megaphone';
import MessageSquare from 'lucide-react-native/icons/message-square';
import PackageSearch from 'lucide-react-native/icons/package-search';
import ReceiptText from 'lucide-react-native/icons/receipt-text';
import Tags from 'lucide-react-native/icons/tags';
import UsersRound from 'lucide-react-native/icons/users-round';
// Import por la ruta profunda y no por `@/app/navigation`: el barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes, type RootRoute } from '@/app/navigation/routes';

/**
 * Forma mínima que cumple cualquier ícono de lucide. Mismo criterio que
 * `MENU_ITEMS`: la pantalla no se ata a un paquete de íconos puntual.
 */
export type PanelIconComponent = ComponentType<{ size?: number; color?: string }>;

export interface PanelItem {
  /** Clave estable de la fila. No es el label: el texto puede cambiar. */
  id: string;
  label: string;
  /** En una línea, qué se encuentra ahí adentro. */
  description: string;
  icon: PanelIconComponent;
  /**
   * A dónde va. **Sin ruta, la fila solo se pinta**: esa pantalla todavía no
   * existe, y fingir que lleva a algún lado es peor que decirlo.
   */
  route?: RootRoute;
}

/**
 * Las secciones del panel de administración, en orden.
 *
 * Es un catálogo —un dato, no un componente— para que se pueda leer y testear
 * sin montar nada, igual que `MENU_ITEMS`.
 *
 * ⚠️ Quién ve el panel entero lo decide el menú "Más" (`MENU_ITEMS`), que ya lo
 * muestra solo a administración. Acá no se vuelve a gatear por rol: la API igual
 * contesta `403` si alguien llega por otro camino.
 */
export const PANEL_ITEMS: readonly PanelItem[] = [
  {
    id: 'avisos-de-pago',
    label: 'Avisos de pago',
    // Va PRIMERO, y es lo único de este panel que no es una consulta: acá hay
    // gente esperando una respuesta. Las métricas se miran cuando uno quiere;
    // un aviso sin resolver es un cliente que pagó y le sigue figurando la
    // deuda.
    description: 'Quién dice que pagó, con su comprobante',
    icon: BanknoteArrowUp,
    route: RootRoutes.AVISOS_DE_PAGO,
  },
  {
    id: 'mensajes',
    label: 'Mensajes',
    // Segundo, y por lo mismo que el primero: del otro lado hay alguien
    // esperando. Va debajo de los avisos de pago porque una pregunta puede
    // esperar unas horas y un pago sin confirmar deja una deuda mal puesta.
    description: 'Lo que te escriben los clientes',
    icon: MessageSquare,
    route: RootRoutes.BANDEJA_MENSAJES,
  },
  {
    id: 'metricas',
    label: 'Métricas',
    description: 'Tu negocio hoy',
    icon: ChartColumn,
    route: RootRoutes.METRICAS,
  },
  {
    id: 'metricas-clientes',
    label: 'Métricas por cliente',
    // La distinción con la de arriba está en el texto: una mira el negocio y la
    // otra a las personas. Sin eso, dos filas que empiezan con "Métricas" se
    // leen como la misma cosa dos veces.
    description: 'Tus clientes hoy',
    icon: UsersRound,
    route: RootRoutes.METRICAS_CLIENTES,
  },
  {
    id: 'tendencia',
    label: 'Qué se llevan',
    // La mercadería y no la plata: dos meses de $500.000 pueden ser el mismo
    // negocio o dos negocios distintos, y la facturación sola no lo dice.
    description: 'La mercadería, mes a mes',
    icon: PackageSearch,
    route: RootRoutes.TENDENCIA,
  },
  {
    id: 'productos',
    label: 'Qué se vende',
    // La misma mercadería sin el calendario: acá entra entera la especie que
    // vende mucho pero cada tres meses, y también la que no se vendió nunca.
    description: 'Qué manda y qué no sale, en todo el período',
    icon: Boxes,
    route: RootRoutes.PRODUCTOS,
  },
  {
    id: 'tickets',
    label: 'Tickets por mes',
    // La otra pregunta del panel: las dos de arriba miran cómo va el negocio
    // HOY, y esta qué pasó en un mes que ya cerró. Va como fila aparte —y no
    // adentro de las métricas— porque la deuda que muestra es la del cierre de
    // ese mes, no la de ahora (`docs/flujo_metricas.md` §5).
    description: 'Cómo cerró cada mes',
    icon: ReceiptText,
    route: RootRoutes.TICKETS,
  },
  {
    id: 'especies',
    label: 'Especies',
    // No es una métrica: es el catálogo con el que se clasifica lo que se
    // vende, y de él salen los agrupados (`docs/flujo_especies.md`). Se toca
    // poco —la especie que falta se crea adentro de la factura—, así que va
    // después de las pantallas que se miran todos los días.
    description: 'Con qué agrupás lo que vendés',
    icon: Tags,
    route: RootRoutes.ESPECIES,
  },
  {
    id: 'store-comprobantes',
    label: 'Comprobantes guardados',
    // Va con las de mantenimiento, después de lo que se mira todos los días: se
    // entra cuando el store se está llenando, no a diario.
    description: 'Cuánto ocupan y qué podés liberar',
    icon: HardDrive,
    route: RootRoutes.STORE_COMPROBANTES,
  },
  {
    id: 'anuncios',
    label: 'Notificaciones',
    // Dice lo que va a hacer, en presente y sin prometer fecha. La fila se pinta
    // apagada porque todavía no tiene pantalla (`docs/flujo_metricas.md` §6).
    description: 'Mandarle un aviso a todos los clientes',
    icon: Megaphone,
  },
];
