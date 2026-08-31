export { RootNavigator } from './RootNavigator';

/** Router: los nombres de todas las rutas y qué roles ven cada tab. */
export { AppRoutes, AuthRoutes, RootRoutes, Routes } from './routes';
export { TAB_ORDER, TabRoles, getVisibleTabs } from './routes';

export type { AppRoute, AuthRoute, RootRoute, Route } from './routes';
export type { RootStackParamList, AuthStackParamList, AppTabParamList } from './types';
