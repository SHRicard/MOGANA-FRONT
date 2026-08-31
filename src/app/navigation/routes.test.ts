import { Roles } from '@/features/auth';
import { AppRoutes, getVisibleTabs, TabRoles, TAB_ORDER } from './routes';

describe('getVisibleTabs', () => {
  it('deja la app usable cuando no hay rol', () => {
    // Sesión sin rol —o con uno que la app no conoce— tiene que dejar algo en
    // pie, no una barra vacía. Inicio, Avisos y Más no piden rol.
    const visibles = getVisibleTabs(null);
    expect(visibles).toContain(AppRoutes.HOME);
    expect(visibles).toContain(AppRoutes.NOTIFICATIONS);
    expect(visibles).toContain(AppRoutes.MENU);
  });

  it('niega por defecto lo que pide un rol', () => {
    // Sin rol no se ve el tablero de facturación. Ofertas pide `cliente`: está
    // fuera de la barra, pero la regla tiene que valer igual el día que vuelva.
    const visibles = getVisibleTabs(null);
    expect(visibles).not.toContain(AppRoutes.FACTURADOS);
    expect(visibles).not.toContain(AppRoutes.OFFERS);
  });

  it('el cliente no ve el tablero de facturación', () => {
    // Facturar es de quien opera el negocio; la API le contestaría 403.
    const visibles = getVisibleTabs(Roles.CLIENTE);
    expect(visibles).not.toContain(AppRoutes.FACTURADOS);
    expect(visibles).toContain(AppRoutes.HOME);
  });

  it('administrador y super admin ven la barra completa, en orden', () => {
    expect(getVisibleTabs(Roles.ADMINISTRADOR)).toEqual(TAB_ORDER);
    expect(getVisibleTabs(Roles.SUPER_ADMIN)).toEqual(TAB_ORDER);
  });

  it('no pone en la barra las rutas que quedaron fuera', () => {
    // Ofertas sigue declarada y con pantalla, pero no se muestra.
    expect(TAB_ORDER).not.toContain(AppRoutes.OFFERS);
  });

  it('declara los roles de todos los tabs del router', () => {
    // Si alguien agrega una ruta y se olvida de declarar quién la ve, el
    // `Record` no compila — esto lo cubre además en runtime.
    TAB_ORDER.forEach((tab) => {
      expect(TabRoles).toHaveProperty(tab);
    });
  });
});
